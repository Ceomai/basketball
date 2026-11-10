/* ================= DERBİ KİMLİĞİ: ŞEHRİN EZELİ RAKİBİ =================
   Mevcut derbi kavramını (src/story.js isDerby: kişisel rakibinin takımı) genişletir: her takımın ligde bir ezeli
   rakibi var. Bilinen eşleşmeler (Fenerbahçe–Anadolu Efes, Real Madrid–Barça, Olympiacos–Panathinaikos...) önce;
   yoksa aynı şehirden bir kulüp; o da yoksa ligden sabit (takım anahtarına bağlı) bir rakip.
   - Derbi haftası: maç öncesi basın paneli (sakin / iddialı / kışkırt), Stadyum'da derbi notu ve geçmiş skor.
   - Özel tribün: iç sahada seyirci çubuğu çok daha hızlı dolar ve dolu başlar; deplasmanda tribün baskısı.
   - Maç sonu: şehirde haber ve sonraki hafta derbi sonrası şehir hikâyesi (kazanınca / kaybedince farklı).
   - Derbi istatistiği (galibiyet/mağlubiyet, rakip başına, son derbi, en farklı galibiyet): Ev → Kariyer.
   Denge simülasyonunda (window.__SIM) panel açılmaz. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, esc, hash, toast, PRIO } from "./data.js";
import { S, closeSheet, fixture, fullName, news, norm, renderMain, sheet, teamByKey, weekNo } from "./core.js";
import { M } from "./match.js";
import { save } from "./save.js";
import { late } from "./late.js";
import { brandRealOf } from "./brand.js";

const SIM = () => !!window.__SIM;
const wi = () => weekNo(20);
// bilinen derbiler (her iki yönde)
const PAIRS = [
  ["Fenerbahçe", "Anadolu Efes"],
  ["Galatasaray", "Beşiktaş"],
  ["Karşıyaka", "Aliağa Petkimspor"],
  ["Tofaş", "Bursaspor"],
  ["Türk Telekom", "Ormanspor"],
  ["Göztepe", "Karşıyaka"],
  ["Real Madrid", "Barça"],
  ["Movistar Estudiantes", "Real Madrid"],
  ["Joventut Badalona", "Barça"],
  ["Olympiacos", "Panathinaikos"],
  ["AEK Athens", "Panionios"],
  ["PAOK", "Aris"],
  ["Crvena Zvezda", "Partizan"],
  ["Mega Basket", "FMP"],
  ["Žalgiris", "Rytas"],
  ["Olimpia Milano", "Virtus Bologna"],
  ["Virtus Bologna", "Fortitudo Bologna"],
  ["Bayern München", "ALBA Berlin"],
  ["Paris Basketball", "Nanterre 92"],
  ["AS Monaco", "LDLC ASVEL"],
  ["Los Angeles Lakers", "Boston Celtics"],
  ["LA Clippers", "Los Angeles Lakers"],
  ["New York Knicks", "Brooklyn Nets"],
  ["Chicago Bulls", "Detroit Pistons"]
];
const D = () => {
  S.dby = S.dby && typeof S.dby === "object" ? S.dby : {};
  const d = S.dby;
  d.w = d.w || 0;
  d.l = d.l || 0;
  d.recs = d.recs || {};
  return d;
};
/** Takımın bu sezonki ezeli rakibinin anahtarı (ligde yoksa null) */
export function dbyArchKey() {
  if (!S || !S.team || !S.league || !S.teams) return null;
  const d = D(),
    a = d.arch;
  if (a && a.t === S.team.key && a.s === S.season && a.n === S.league.length) return a.k;
  const me = S.team,
    cand = S.league.map(r => r.key).filter(k => k !== me.key && S.teams[k]);
  let k = null;
  for (const [x, y] of PAIRS) {
    // eşleşme gerçek kimlikle (anahtar) yapılır; görünen ad mağaza sürümünde kurgusaldır (src/brand.js)
    const mine = brandRealOf(me),
      other = x === mine ? y : y === mine ? x : null;
    const hit = other && cand.find(c => brandRealOf(S.teams[c]) === other);
    if (hit) {
      k = hit;
      break;
    }
  }
  if (!k) {
    const same = cand.filter(c => S.teams[c].city === me.city);
    if (same.length) k = same.sort((p, q) => Math.abs(S.teams[p].str - me.str) - Math.abs(S.teams[q].str - me.str))[0];
  }
  if (!k && cand.length) k = cand.slice().sort((p, q) => hash(`${me.key}|${p}`) - hash(`${me.key}|${q}`))[0];
  d.arch = { t: me.key, s: S.season, n: S.league.length, k };
  return k;
}
export const dbyArch = () => {
  const k = dbyArchKey();
  return k ? teamByKey(k) : null;
};
const isClubDerby = opp => !!(opp && late.isDerby(opp) && !late.isRivalDerby(opp));

/* ---- Kayıt: her derbi (kişisel rakip derbisi de) sonucu ---- */
Bus.use("match:after", (ctx, next) => {
  try {
    if (S && M && M.opp && late.isDerby(M.opp)) dbyRecord(!!ctx.win);
  } catch (e) {
    console.error(e);
  }
  next();
});
export function dbyRecord(win) {
  const d = D(),
    opp = M.opp;
  if (d.lastW === wi() && d.lastK === opp.key && d.lastG === S.results.length) return; // aynı maç iki kez yazılmasın
  d.lastW = wi();
  d.lastK = opp.key;
  d.lastG = S.results.length;
  if (win) d.w++;
  else d.l++;
  const r = (d.recs[opp.key] = d.recs[opp.key] || { n: opp.name, w: 0, l: 0 });
  r.n = opp.name;
  if (win) r.w++;
  else r.l++;
  const us = M.us || 0,
    them = M.them || 0;
  d.last = { n: opp.name, us, them, win, s: S.season };
  if (win && (!d.best || us - them > d.best.m)) d.best = { n: opp.name, us, them, m: us - them, s: S.season };
  d.streak = win ? Math.max(0, d.streak || 0) + 1 : Math.min(0, d.streak || 0) - 1;
  if (M.rating == null) news($t(win ? "dby.newsW" : "dby.newsL", { a: S.team.name, b: opp.name, us, them }));
  if (!SIM() && isClubDerby(opp)) d.pend = { win, n: opp.name, us, them, wk: wi() };
}
/** Ezeli rakip derbisi sonucu (src/story.js derbyResult; kendin oynadıysan) */
export function dbyResult(win) {
  const opp = M.opp,
    us = M.us || 0,
    them = M.them || 0;
  if (win) {
    S.rel.taraf += 5;
    S.moral += 5;
    S.followers = Math.round(S.followers * 1.03);
    news($t("dby.newsW", { a: S.team.name, b: opp.name, us, them }));
  } else {
    S.moral -= 4;
    S.rel.taraf -= 2;
    news($t("dby.newsL", { a: S.team.name, b: opp.name, us, them }));
  }
  return { txt: $t(win ? "dby.resW" : "dby.resL", { t: opp.name, pts: M.pts || 0 }) };
}

/* ---- Stadyum: derbi notu ---- */
export function dbyNoteHTML(opp) {
  const r = D().recs[opp.key];
  return `<div class="say bad" id="dby-note"><b>${$t("story.120")}</b> ${$t("dby.note", { t: esc(opp.name), c: esc(S.city) })}${r ? ` <span class="small">${$t("dby.h2h", { w: r.w, l: r.l })}</span>` : ""}</div>`;
}

/* ---- Tribün: derbi ve seri atmosferi (src/matchday.js matchdayStart) ---- */
export function dbyAtmos(ctx) {
  if (late.serAtmos) late.serAtmos(ctx);
  if (!M || !ctx || ctx.comp === "nat" || !ctx.opp || !late.isDerby(ctx.opp)) return;
  const d = D(),
    fire = d.fire === wi();
  if (ctx.home) {
    M.hypeMul = Math.max(M.hypeMul || 1, 1.6);
    M.hype = Math.max(M.hype || 0, fire ? 50 : 30);
  } else M.loud = true;
  M.derby = 1;
  if (late.addFeed)
    late.addFeed(
      `<b class="${ctx.home ? "gold" : "warn"}">${$t(ctx.home ? "dby.atmHome" : "dby.atmAway", { t: esc(ctx.opp.name) })}</b>`
    );
}

/* ---- Derbi haftası: maç öncesi basın ---- */
export function dbyPressSheet() {
  if (SIM() || !S || !S.team || S.injury || !S.league) return false;
  const fx = fixture(),
    opp = fx && teamByKey(fx.opp);
  if (!isClubDerby(opp)) return false;
  const d = D();
  if (d.pressW === wi()) return false;
  d.pressW = wi();
  const j = esc(S.npc.journalist || "");
  sheet(
    $t("dby.pressT"),
    $t("dby.pressS", { t: opp.name }),
    `<div class="say">"${$t(`dby.pressQ${fx.home ? "H" : "A"}`, { t: esc(opp.name), j })}"</div><div class="choices" id="dby-ch">${[
      "calm",
      "bold",
      "fire"
    ]
      .map(
        k =>
          `<button class="choice" data-dbp="${k}"><span class="ct" style="font-size:var(--fs-xl);text-transform:none;letter-spacing:0">${$t(`dby.p.${k}`, { t: esc(opp.name) })}</span><span class="cd">${$t(`dby.p.${k}D`)}</span></button>`
      )
      .join("")}</div><button class="btn ghost" id="dby-skip">${$t("dby.skip")}</button>`,
    { noClose: true }
  );
  const done = txt => {
    norm();
    save();
    $("#shb").innerHTML = `<div class="say warn">${txt}</div><button class="btn pri" id="dby-ok">${$t("ads.25")}</button>`;
    $("#dby-ok").onclick = () => {
      closeSheet();
      renderMain();
    };
  };
  $$("[data-dbp]").forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.dbp;
        if (k === "calm") {
          S.rel.koc += 2;
          S.moral += 2;
        } else if (k === "bold") {
          S.buffs.motive = 1;
          S.rel.taraf += 2;
        } else {
          S.rel.taraf += 5;
          S.followers = Math.round(S.followers * 1.02);
          S.rel.koc -= 2;
          d.fire = wi();
          news($t("dby.fireNews", { v: fullName(), t: opp.name }));
        }
        done($t(`dby.p.${k}R`, { t: esc(opp.name) }));
      })
  );
  $("#dby-skip").onclick = () => {
    closeSheet();
    renderMain();
  };
  return true;
}
// window.__TEST.quietSheets: testlerde rastgele haftaya düşen paneller kapalı (doğrudan çağrı çalışır)
Bus.offer("week:sheet", () => !(window.__TEST && window.__TEST.quietSheets) && dbyPressSheet(), PRIO.derbyPress, "now"); // derbi haftasına bağlı

/* ---- Derbi sonrası şehir hikâyesi (sonraki hafta) ---- */
/** Şehir hikâyesinin etkisi derbiden sonraki ilk hafta başında bir kez uygulanır (p.fx); panel yalnız gösterimdir.
    Sakin haftada (src/extras.js weeklyHooks: yalnız "now" paneller) gösterim sonraki haftaya kalır, etki kaybolmaz. */
export function dbyCityApply() {
  if (SIM() || !S || !S.dby || !S.dby.pend) return false;
  const p = S.dby.pend;
  if (p.wk >= wi() || p.fx) return false;
  p.fx = 1;
  if (p.win) {
    S.rel.taraf += 2;
    S.followers = Math.round(S.followers * 1.01);
  } else S.rel.taraf -= 1;
  norm();
  return true;
}
Bus.on("week:start", () => !(window.__TEST && window.__TEST.quietSheets) && dbyCityApply());
export function dbyCitySheet() {
  if (SIM() || !S || !S.dby || !S.dby.pend) return false;
  const p = S.dby.pend;
  if (p.wk >= wi()) return false;
  dbyCityApply(); // hafta başında uygulanmadıysa (doğrudan çağrı, eski kayıt)
  S.dby.pend = null;
  if (wi() - p.wk > 3) {
    save();
    return false; // eski kayıt: hikâye bayatladı (etkisi hafta başında uygulandı)
  }
  const big = Math.abs(p.us - p.them) >= 10;
  const k = p.win ? (big ? "wBig" : "w") : big ? "lBig" : "l";
  save();
  // yalnız bilgi veren panel: zorunlu panel yerine kısa bildirim (metin bildirim kutusunda kalır; aşama 3.3).
  // Haftanın panel hakkını kullanır (true): diğer haftalık panellerin zamanlaması değişmez.
  toast(
    `${$t("dby.cityT", { c: S.city })} (${$t("dby.cityS", { t: p.n, us: p.us, them: p.them })}): ${$t(`dby.city.${k}`, { t: p.n, c: S.city, v: S.last })} ${$t("dby.cityRec", { w: S.dby.w, l: S.dby.l })}`
  );
  return true;
}
Bus.offer("week:sheet", () => !(window.__TEST && window.__TEST.quietSheets) && dbyCitySheet(), PRIO.derbyCity);

/* ---- Ev → Kariyer: derbi istatistiği ---- */
export function dbyCareerHTML() {
  if (!S || !S.team) return "";
  const d = D(),
    a = dbyArch(),
    ar = a ? d.recs[a.key] : null;
  const recs = Object.values(d.recs)
    .sort((x, y) => y.w + y.l - (x.w + x.l))
    .slice(0, 4);
  return `<div class="card fm" id="dby-career"><div class="eyebrow">${$t("dby.career")}</div>
   <div class="kv"><span>${$t("dby.total")}</span><b>${d.w}-${d.l}</b>
   ${a ? `<span>${$t("dby.arch")}</span><b>${esc(a.name)}${ar ? ` · ${ar.w}-${ar.l}` : ""}</b>` : ""}
   ${d.last ? `<span>${$t("dby.last")}</span><b class="${d.last.win ? "good" : "bad"}">${esc(d.last.n)} ${d.last.us}–${d.last.them}</b>` : ""}
   ${d.best ? `<span>${$t("dby.best")}</span><b class="good">${esc(d.best.n)} ${d.best.us}–${d.best.them}</b>` : ""}
   ${d.streak && Math.abs(d.streak) >= 2 ? `<span>${$t("dby.streak")}</span><b class="${d.streak > 0 ? "good" : "bad"}">${d.streak > 0 ? $t("dby.streakW", { n: d.streak }) : $t("dby.streakL", { n: -d.streak })}</b>` : ""}
   ${recs.map(r => `<span class="small muted">${esc(r.n)}</span><b class="small">${r.w}-${r.l}</b>`).join("")}</div>
   ${!d.w && !d.l ? `<p class="small muted">${$t("dby.none")}</p>` : ""}</div>`;
}
