/* ================= GEÇ KARİYER HEDEFLERİ (paket 4d) =================
   Zengin ve başarılı oyuncu için uzun soluklu amaçlar. Ev → Kariyer'deki "Hedefler" kartından açılır.
   - Vakıf projeleri (legacy.js'teki tek seferlik bağışlardan farklı): para + bir zaman dilimiyle başlar, birkaç hafta
     sürer (her hafta enerji ister), bitince haber, taraftar/aile etkisi, miras puanı ve Ev vitrininde kalıcı plaket.
   - Kendi ayakkabı markası: şöhret eşiği + Ev → Stil'de tasarlanmış ayakkabı (src/custom.js) gerekir. Seri ve fiyat
     seçimi, lansman maliyeti; haftalık satış sezon sayı ortalamasına, ödüllere ve şöhrete bağlı ama passiveCap ile
     maaşın küçük bir oranında sınırlı (src/economy.js; denetim: tools/economy-audit.js).
   - Milli takım kaptanlığı: rütbe (milli oyuncu → kaptan yardımcısı → kaptan → onursal kaptan), kamplarda kaptan
     kararı (src/extras.js camp), 32 yaş üstü kaptana veda maçı. Maç gücünü değiştirmez (denge simülasyonu etkilenmez). */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, EU_CC, WAGE, clamp, esc, fmt, isPro, pick, toast } from "./data.js";
import { S, closeSheet, fame, fullName, news, norm, sheet, tx, useSlot } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

export const AMB_PROJECTS = [
  { id: "okul", cost: 25000, wk: 4, en: 5, pts: 45, fans: 4, aile: 6 },
  { id: "turnuva", cost: 60000, wk: 3, en: 8, pts: 60, fans: 9, aile: 3 },
  { id: "burs", cost: 150000, wk: 6, en: 4, pts: 100, fans: 6, aile: 6 }
];
// seri: satışın neye duyarlı olduğu (performans / şöhret üsleri); fiyat: hacim × kâr marjı
export const AMB_LINES = { retro: { perf: 0.5, fame: 1 }, perf: { perf: 1.3, fame: 0.7 }, street: { perf: 0.8, fame: 1.3 } };
export const AMB_TIERS = { budget: { m: 0.85, fans: 6 }, mid: { m: 1, fans: 2 }, premium: { m: 1.15, fans: -3 } };
export const AMB_BRAND_FAME = 62; // lansman için gereken şöhret
const BRAND_CAP = 0.3; // haftalık satış en fazla maaşın %30'u (passiveCap)
export const ambBrandCost = () => Math.round(10 * (WAGE[S.stage] || WAGE.t2));

const A = () => {
  S.amb = S.amb || {};
  const a = S.amb;
  a.proj = a.proj || {}; // id → { left } (sürüyor) ya da { done: sezon }
  a.cap = a.cap || 0; // verilen kaptan kararı sayısı
  return a;
};
const active = () => AMB_PROJECTS.find(p => A().proj[p.id] && !A().proj[p.id].done);

/* ---------- Vakıf projeleri ---------- */
export function ambStartProject(id) {
  const p = AMB_PROJECTS.find(x => x.id === id),
    a = A();
  if (!p || a.proj[id] || active() || !(isPro(S.stage) || S.retired) || S.money < p.cost || S.slot < 1) return false;
  tx($t("amb.projTx", { n: $t(`amb.p.${id}`) }), -p.cost);
  useSlot();
  a.proj[id] = { left: p.wk };
  news($t("amb.projStart", { v: fullName(), n: $t(`amb.p.${id}`) }));
  Bus.emit("amb", { kind: "project", id });
  norm();
  save();
  return true;
}
function finishProject(p) {
  const a = A();
  a.proj[p.id] = { done: S.season };
  S.rel.taraf += p.fans;
  S.rel.aile += p.aile;
  S.followers = Math.round(S.followers * 1.02);
  news($t("amb.projDone", { v: fullName(), n: $t(`amb.p.${p.id}`) }));
  if (!window.__SIM) toast($t("amb.projToast", { n: $t(`amb.p.${p.id}`) }));
  Bus.emit("amb", { kind: "projectDone", id: p.id });
}

/* ---------- Ayakkabı markası ---------- */
export const ambBrandReady = () => (isPro(S.stage) || S.retired) && fame() >= AMB_BRAND_FAME && !!(S.shoe && S.shoe.made);
export function ambLaunchBrand(line, tier) {
  const a = A();
  if (a.brand || !AMB_LINES[line] || !AMB_TIERS[tier] || !ambBrandReady() || S.money < ambBrandCost()) return false;
  tx($t("amb.brandTx"), -ambBrandCost());
  a.brand = { line, tier, at: S.season, shoe: { ...S.shoe }, hype: 4, total: 0, season: 0 };
  S.rel.taraf += AMB_TIERS[tier].fans;
  if (late.mediaGain) late.mediaGain(0.03, 10);
  news($t("amb.brandNews", { v: fullName(), n: ambBrandName() }));
  Bus.emit("amb", { kind: "brand", line, tier });
  norm();
  save();
  return true;
}
export const ambBrandName = () => {
  const b = A().brand;
  return b ? $t("amb.brandName", { last: S.last, line: $t(`amb.line.${b.line}`) }) : "";
};
/** Haftalık satış geliri (sınırlı). Satış: sezon sayı ortalaması, MVP/All-Star, şöhret; ilk 4 hafta lansman heyecanı. */
export function ambBrandWeekly() {
  const b = A().brand;
  if (!b) return 0;
  const ss = S.ss || {},
    last = S.hist && S.hist.length ? S.hist[S.hist.length - 1] : null,
    ppg = ss.g ? ss.pts / ss.g : last && last.g ? last.pts / last.g : 10;
  const L = AMB_LINES[b.line],
    T = AMB_TIERS[b.tier];
  const perf = clamp(0.4 + ppg / 25, 0.4, 1.6),
    fm = clamp(fame() / 80, 0.3, 1.25),
    aw = 1 + Math.min(0.5, ((S.career.mvps || 0) + (S.career.allStars || 0)) * 0.05),
    hype = b.hype > 0 ? 1.3 : 1;
  const raw = (WAGE[S.stage] || WAGE.t2) * 0.22 * Math.pow(perf, L.perf) * Math.pow(fm, L.fame) * aw * T.m * hype;
  return late.passiveCap ? late.passiveCap(Math.round(raw), BRAND_CAP) : Math.round(raw);
}
Bus.on("week:start", () => {
  if (!S || !S.amb) return;
  const a = A();
  const p = active();
  if (p) {
    S.energy -= p.en; // projeyi yerinde takip etmenin zaman/enerji bedeli
    a.proj[p.id].left--;
    if (a.proj[p.id].left <= 0) finishProject(p);
  }
  if (a.brand && !S.retired) {
    const v = ambBrandWeekly();
    if (v > 0) {
      tx($t("amb.brandSales"), v);
      a.brand.total += v;
      a.brand.season += v;
    }
    if (a.brand.hype > 0) a.brand.hype--;
  }
  norm();
});
Bus.on("season:end", () => {
  const b = S && S.amb && S.amb.brand;
  if (!b) return;
  news($t("amb.brandReport", { n: ambBrandName(), v: fmt(b.season) }));
  b.season = 0;
  b.seasons = (b.seasons || 0) + 1;
});

/* ---------- Milli takım kaptanlığı ---------- */
/** 0: milli değil, 1: milli oyuncu, 2: kaptan yardımcısı, 3: kaptan, 4: onursal kaptan */
export function ambCaptainRank() {
  const caps = S.career.natCaps || 0,
    a = A();
  if (S.natCaptain && a.farewell) return 4;
  if (S.natCaptain) return 3;
  if (caps >= 6 && S.age >= 24) return 2;
  return caps > 0 ? 1 : 0;
}
export const ambFarewellReady = () => !!S.natCaptain && S.age >= 32 && !A().farewell && isPro(S.stage) && !S.injury;
const CAP_DEC = {
  young: () => ((S.rel.takim += 5), (S.moral += 3)),
  standard: () => ((S.rel.koc += 5), (S.moral -= 2)),
  shield: () => ((S.rel.taraf += 5), (S.energy -= 5), late.mediaGain && late.mediaGain(0.02, 4))
};
/** Kampın sonunda (src/extras.js camp): A Milli Takım kaptanıysan bir kaptan kararı ver, sonra devam et */
export function ambCaptainCall(cat, after) {
  if (cat !== "A" || !S.natCaptain || window.__SIM) return after();
  sheet(
    $t("amb.capTitle"),
    $t("amb.capSub"),
    `<p>${$t("amb.capText")}</p><div class="choices">${Object.keys(CAP_DEC)
      .map(
        k =>
          `<button class="choice" data-amb-cap="${k}"><span class="ct">${$t(`amb.cap.${k}`)}</span><span class="cd">${$t(`amb.cap.${k}D`)}</span></button>`
      )
      .join("")}</div>`,
    { noClose: true }
  );
  $$("[data-amb-cap]").forEach(
    b =>
      (b.onclick = () => {
        CAP_DEC[b.dataset.ambCap]();
        A().cap++;
        A().lastCap = b.dataset.ambCap;
        norm();
        save();
        closeSheet();
        after();
      })
  );
}
/** Veda maçı: dostluk maçı, sonra onursal kaptanlık; artık A Milli Takım'a çağrılmazsın */
export function ambFarewell(auto = false, done = () => late.renderMain()) {
  if (!ambFarewellReady()) return false;
  const opp = late.natTeam(pick(EU_CC.filter(c => c !== "TR")), "A");
  closeSheet();
  late.natMatch(
    "A",
    opp,
    $t("amb.farewellLabel"),
    win => {
      const a = A();
      a.farewell = { season: S.season, win: !!win };
      S.rel.taraf += 10;
      S.rel.aile += 5;
      S.moral += 8;
      news(win ? $t("amb.farewellWin", { v: fullName() }) : $t("amb.farewellLoss", { v: fullName() }));
      Bus.emit("amb", { kind: "farewell", win: !!win });
      norm();
      save();
      done();
    },
    auto
  );
  return true;
}
/** extras.js natSelected: veda eden kaptan A Milli Takım'a çağrılmaz */
export const ambNatRetired = () => !!(S && S.amb && S.amb.farewell);

/* ---------- Miras puanı ---------- */
export function ambLegacy() {
  if (!S || !S.amb) return 0;
  const a = S.amb,
    proj = AMB_PROJECTS.filter(p => a.proj && a.proj[p.id] && a.proj[p.id].done).reduce((s, p) => s + p.pts, 0),
    brand = a.brand ? 40 + Math.min(60, (a.brand.seasons || 0) * 15) : 0;
  return proj + brand + Math.min(40, (a.cap || 0) * 8) + (a.farewell ? 60 : 0);
}

/* ---------- Arayüz ---------- */
const bar = (v, c = "var(--gold)") => `<div class="bar"><i style="width:${clamp(v, 0, 100)}%;background:${c}"></i></div>`;
/** Ev → Kariyer: Hedefler kartı (ilerleme özeti) */
export function ambGoalsHTML() {
  if (!S || !(isPro(S.stage) || S.retired)) return "";
  const a = A(),
    done = AMB_PROJECTS.filter(p => a.proj[p.id] && a.proj[p.id].done).length,
    rank = ambCaptainRank(),
    brandSt = a.brand ? 100 : ambBrandReady() ? 60 : Math.min(50, (fame() / AMB_BRAND_FAME) * 50);
  return `<div class="card" id="amb-card"><div class="row between nowrap"><div class="eyebrow">${$t("amb.title")}</div><span class="pill g">${$t("amb.legacyPts", { n: ambLegacy() })}</span></div>
   <div class="attr"><span>${$t("amb.found")}</span>${bar((done / AMB_PROJECTS.length) * 100)}<b>${done}/${AMB_PROJECTS.length}</b></div>
   <div class="attr"><span>${$t("amb.brand")}</span>${bar(brandSt, "var(--team)")}<b>${a.brand ? "✓" : "–"}</b></div>
   <div class="attr"><span>${$t("amb.captain")}</span>${bar(rank * 25, "var(--info)")}<b>${rank}/4</b></div>
   <p class="small muted">${esc($t(`amb.rank.${rank}`))}</p>
   <button class="btn team sm" id="amb-open">${$t("amb.open")}</button></div>`;
}
export function ambBindGoals(back) {
  const b = $("#amb-open");
  if (b) b.onclick = () => ambSheet(back);
}
let draft = { line: "retro", tier: "mid" };
/** Hedefler paneli: vakıf projeleri, marka, kaptanlık */
export function ambSheet(back) {
  const a = A(),
    act = active(),
    pro = isPro(S.stage) || S.retired;
  const projHTML = AMB_PROJECTS.map(p => {
    const st = a.proj[p.id],
      can = pro && !st && !act && S.money >= p.cost && S.slot >= 1;
    const status = st ? (st.done ? $t("amb.done") : $t("amb.left", { n: st.left })) : "";
    return `<div class="act"><div><h3>${$t(`amb.p.${p.id}`)}</h3><p>${$t(`amb.p.${p.id}D`)}</p><div class="fx"><span class="t">${fmt(p.cost)}</span><span class="t">${$t("amb.weeks", { n: p.wk, en: p.en })}</span><span class="p">${$t("legacy.39", { pts: p.pts })}</span><span class="p">${$t("legacy.40", { fans: p.fans })}</span></div>${status ? `<p class="small gold">${status}</p>` : ""}</div><button class="btn ${st ? "ghost" : "team"} sm" data-amb-p="${p.id}" ${can ? "" : "disabled"}>${st ? (st.done ? "✓" : "…") : $t("amb.start")}</button></div>`;
  }).join("");
  let brandHTML;
  if (a.brand) {
    brandHTML = `<div class="row nowrap"><div style="width:110px">${late.shoeSVG ? late.shoeSVG(a.brand.shoe, 110) : ""}</div><div><h3>${esc(ambBrandName())}</h3><p class="small muted">${$t(`amb.tier.${a.brand.tier}`)}</p><div class="kv"><span>${$t("amb.weekly")}</span><b class="good">+${fmt(ambBrandWeekly())}</b><span>${$t("amb.total")}</span><b>${fmt(a.brand.total)}</b></div></div></div><p class="small muted">${$t("amb.brandHint")}</p>`;
  } else {
    const ready = ambBrandReady(),
      cost = ambBrandCost();
    const need = !(S.shoe && S.shoe.made)
      ? $t("amb.needShoe")
      : fame() < AMB_BRAND_FAME
        ? $t("amb.needFame", { n: AMB_BRAND_FAME, v: fame() })
        : "";
    brandHTML = `<p class="small">${$t("amb.brandIntro")}</p>${need ? `<p class="small bad">${need}</p>` : ""}
     <div class="eyebrow">${$t("amb.pickLine")}</div><div class="grid3">${Object.keys(AMB_LINES)
       .map(k => `<button class="btn sm ${draft.line === k ? "pri" : ""}" data-amb-line="${k}">${$t(`amb.line.${k}`)}</button>`)
       .join("")}</div><p class="small muted">${$t(`amb.line.${draft.line}D`)}</p>
     <div class="eyebrow">${$t("amb.pickTier")}</div><div class="grid3">${Object.keys(AMB_TIERS)
       .map(k => `<button class="btn sm ${draft.tier === k ? "pri" : ""}" data-amb-tier="${k}">${$t(`amb.tier.${k}`)}</button>`)
       .join("")}</div><p class="small muted">${$t(`amb.tier.${draft.tier}D`)}</p>
     <button class="btn pri" id="amb-launch" ${ready && S.money >= cost ? "" : "disabled"}>${$t("amb.launch", { v: fmt(cost) })}</button>`;
  }
  const rank = ambCaptainRank();
  const capHTML = `<div class="row between nowrap"><h3>${esc($t(`amb.rank.${rank}`))}</h3><span class="pill">${rank}/4</span></div>${bar(rank * 25, "var(--info)")}
    <p class="small muted">${$t(`amb.rankD.${rank}`)}</p><div class="kv"><span>${$t("extras.32")}</span><b>${S.career.natCaps || 0}</b><span>${$t("amb.capCount")}</span><b>${a.cap}</b></div>
    ${ambFarewellReady() ? `<button class="btn team" id="amb-farewell">${$t("amb.farewellBtn")}</button>` : a.farewell ? `<p class="small gold">${$t("amb.farewellDone", { n: a.farewell.season })}</p>` : ""}`;
  sheet(
    $t("amb.title"),
    $t("amb.sub"),
    `<div class="card"><div class="eyebrow">${$t("amb.found")}</div><p class="small muted">${$t("amb.foundIntro")}</p><div class="choices">${projHTML}</div></div>
     <div class="card"><div class="eyebrow">${$t("amb.brand")}</div>${brandHTML}</div>
     <div class="card"><div class="eyebrow">${$t("amb.captain")}</div>${capHTML}</div>
     ${back ? `<button class="btn ghost" id="amb-back">${$t("amb.back")}</button>` : ""}`
  );
  const re = () => ambSheet(back);
  $$("[data-amb-p]").forEach(b => (b.onclick = () => (ambStartProject(b.dataset.ambP), re())));
  $$("[data-amb-line]").forEach(b => (b.onclick = () => ((draft.line = b.dataset.ambLine), re())));
  $$("[data-amb-tier]").forEach(b => (b.onclick = () => ((draft.tier = b.dataset.ambTier), re())));
  const l = $("#amb-launch");
  if (l) l.onclick = () => (ambLaunchBrand(draft.line, draft.tier), re());
  const f = $("#amb-farewell");
  if (f) f.onclick = () => ambFarewell(false);
  const bk = $("#amb-back");
  if (bk) bk.onclick = back;
}
/** Ev vitrini: tamamlanan projelerin, markanın ve vedanın kalıcı izi */
export function ambPlaquesHTML() {
  if (!S || !S.amb) return "";
  const a = A(),
    items = [
      ...AMB_PROJECTS.filter(p => a.proj[p.id] && a.proj[p.id].done).map(p =>
        $t("amb.plaque", { n: $t(`amb.p.${p.id}`), s: a.proj[p.id].done })
      ),
      ...(a.brand ? [$t("amb.plaqueBrand", { n: ambBrandName(), s: a.brand.at })] : []),
      ...(a.farewell ? [$t("amb.plaqueFarewell", { s: a.farewell.season })] : [])
    ];
  if (!items.length) return "";
  return `<div class="card" id="amb-plaques"><div class="eyebrow">${$t("amb.wall")}</div>${items.map(t => `<div class="row nowrap small"><span style="width:22px;display:inline-block">${late.icon("medal")}</span>${esc(t)}</div>`).join("")}</div>`;
}
