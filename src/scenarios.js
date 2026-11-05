/* ================= SENARYOLAR, SOY AĞACI, SES VE SALON =================
   - Kariyer senaryoları (oluşturma ekranında): hazır başlangıç + süreli hedef. Sezon sonunda değerlendirilir.
     · Düşen yıldız: 27 yaşında, 2. ligde; hedef 2 sezonda üst lige ya da Avrupa'ya dönmek
     · Küçük kulüp: 22 yaşında 3. ligin en zayıf takımında; hedef 3 sezonda lig şampiyonluğu
     · Son dans: 34 yaşında Avrupa kulübünde; hedef 2 sezonda bir kupa
   - Soy ağacı: varis kariyerleri nesil nesil; her neslin adı, kupası ve Şöhretler Müzesi seviyesi.
   - Ses: file sesi, ayakkabı gıcırtısı, tribün tezahüratı (seyirci heyecanı dolunca).
   - Salon: büyük maçlarda (derbi, zirve, final) sahaya ışık gösterisi. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, esc, pick } from "./data.js";
import { S, fullName, news, newSeasonLeague, norm, sheet, closeSheet } from "./core.js";
import { WAGE } from "./logic/rules.js";
import { M } from "./match.js";
import { tone, noise, SFX } from "./audio.js";
import { late } from "./late.js";

/* ---- Senaryolar ---- */
export const SCENARIOS = {
  fallen: { age: 27, stage: "t2", base: 50, role: "star", years: 2 },
  smallclub: { age: 22, stage: "t3", base: 46, role: "star", years: 3, weakest: true },
  lastdance: { age: 34, stage: "euro", base: 68, role: "rot", years: 2 }
};
export function scenarioPickerHTML(cur) {
  const c = cur || "";
  return `<div><div class="eyebrow" style="margin-bottom:6px">${$t("sc.title")}</div><div class="opts" id="scn">${["", ...Object.keys(SCENARIOS)]
    .map(k => `<button class="opt ${c === k ? "on" : ""}" data-v="${k}">${$t(`sc.${k || "none"}`)}</button>`)
    .join("")}</div><p class="small muted" style="margin-top:6px">${$t(`sc.${c || "none"}D`)}</p></div>`;
}
/** startCareer sonrasında (src/core.js): senaryo başlangıcını kur */
export function scenarioSetup(id) {
  const sc = SCENARIOS[id];
  if (!sc || !S) return false;
  S.age = sc.age;
  for (const k of Object.keys(S.st)) S.st[k] = Math.min(90, sc.base + (S.st[k] - 20));
  const pool = late.leaguePool(sc.stage, "TR");
  const t = sc.weakest ? pick(pool.slice().sort((a, b) => a.str - b.str).slice(0, 3)) : pick(pool);
  S.stage = sc.stage;
  S.stageSeason = 1;
  S.team = t;
  S.city = t.city;
  S.studying = false;
  S.graduated = true;
  S.wage = WAGE[sc.stage];
  S.role = sc.role;
  S.contract = sc.years;
  S.money = Math.round(WAGE[sc.stage] * 6);
  S.followers = sc.stage === "euro" ? 60000 : 3000;
  S.housing = sc.stage === "euro" ? "lux" : "daire"; // yeni şehirde kendi evi (aile odası değil)
  S.unlocks = { program: 1, sistem: 1, gorev: 1, miras: 1, plan: 1, basarim: 1, tasarim: 1, hikaye: 1 };
  S.scn = { id, until: S.season + sc.years - 1, done: 0, team: t.key };
  if (id === "fallen") S.reinj = { p: 0.2, until: (late.weekIndex ? late.weekIndex() : 0) + 20 }; // eski sakatlık: tekrar riski
  newSeasonLeague();
  norm();
  news($t(`sc.news.${id}`, { v: fullName(), t: t.name }));
  return true;
}
// takım kupaları (All-Star, ödül, arcade, mağaza ürünü sayılmaz)
const CUPS = ["champ", "cup", "super", "el", "ec"],
  UP = ["t1", "euro", "nba"];
// sezon sonu: başarı payload'dan işaretlenir (kupa ve terfi sonradan yazıldığı için karar sonraki haftanın başında)
Bus.on("season:end", ({ champ } = {}) => {
  const s = S && S.scn;
  if (!s || s.done) return;
  if (s.id === "smallclub" && champ && (!s.team || S.team.key === s.team)) s.hit = 1;
  if (s.id === "lastdance" && champ) s.hit = 1;
});
Bus.on("week:start", () => {
  const s = S && S.scn;
  if (!s) return;
  if (s.tr0 == null) s.tr0 = (S.career.trophies || []).length;
  if (s.done) return;
  const tr = (S.career.trophies || []).slice(s.tr0);
  if (s.id === "lastdance" && tr.some(x => CUPS.includes(x.type))) s.hit = 1;
  if (s.id === "smallclub" && s.team && S.team.key !== s.team && !s.hit) s.done = -1; // küçük kulüpten ayrıldın
  else if (s.hit || (s.id === "fallen" && UP.includes(S.stage) && S.role !== "bench")) s.done = 1;
  else if (S.season > s.until) s.done = -1;
  if (s.done) s.show = 1;
});
function scenarioSheet() {
  const s = S && S.scn;
  if (!s || !s.show || window.__SIM) return false;
  s.show = 0;
  const ok = s.done === 1;
  if (ok) {
    S.legacy = S.legacy || { found: {}, club: 0 };
    S.legacy.scn = (S.legacy.scn || 0) + 1;
    S.followers = Math.round(S.followers * 1.05);
  }
  news($t(ok ? "sc.winNews" : "sc.failNews", { v: fullName(), s: $t(`sc.${s.id}`) }));
  sheet($t(`sc.${s.id}`), $t(ok ? "sc.win" : "sc.fail"), `<div class="card"><p>${$t(ok ? `sc.win.${s.id}` : `sc.fail.${s.id}`)}</p></div><button class="btn pri" id="sc-ok">${$t("goal.ok")}</button>`);
  $("#sc-ok").onclick = () => closeSheet();
  return true;
}
Bus.offer("week:sheet", scenarioSheet, 1);
/** Oluşturma ekranında senaryonun ilerleyişi (Ev → Genel) */
export function scenarioHTML() {
  const s = S && S.scn;
  if (!s) return "";
  const st = s.done === 1 ? $t("sc.win") : s.done === -1 ? $t("sc.fail") : $t("sc.left", { n: Math.max(0, s.until - S.season + 1) });
  return `<div class="card"><div class="row between"><div class="eyebrow">${$t("sc.title")}</div><b class="${s.done === 1 ? "good" : s.done === -1 ? "bad" : "gold"}">${st}</b></div><b>${$t(`sc.${s.id}`)}</b><p class="small muted">${$t(`sc.${s.id}D`)}</p></div>`;
}

/* ---- Soy ağacı ---- */
/** varis kariyerine aktarılacak aile (src/legacy.js startHeir) */
export function familyNext() {
  const tier = late.hofTier ? late.hofTier(late.legacyScore ? late.legacyScore() : 0)[1] : "";
  return [...(S.family || []), { n: fullName(), y: S.season, tr: (S.career.trophies || []).length, t: tier, pos: S.pos }].slice(-8);
}
export function familyTreeHTML() {
  const f = (S && S.family) || [];
  if (!f.length) return "";
  const rows = [...f, { n: fullName(), y: S.year, tr: (S.career.trophies || []).length, t: $t("sc.now"), pos: S.pos, me: 1 }];
  return `<div class="card"><div class="eyebrow">${$t("sc.family")}</div>${rows
    .map(
      (r, i) =>
        `<div class="row nowrap" style="gap:8px;align-items:center;padding-left:${i * 10}px"><span class="pill ${r.me ? "w" : ""}">${i + 1}</span><b>${esc(r.n)}</b><span class="small muted">${r.pos} · ${$t("sc.trophies", { n: r.tr })}${r.t ? ` · ${esc(r.t)}` : ""}</span></div>`
    )
    .join("")}</div>`;
}

/* ---- Ses: file, gıcırtı, tezahürat ---- */
SFX.swish = () => {
  noise(0.22, { freq: 6000, sweep: -3000, vol: 0.09, q: 0.6 });
  tone(1800, 0.06, { type: "triangle", vol: 0.03, delay: 0.05 });
};
SFX.squeak = () => tone(2400 + Math.random() * 600, 0.05, { type: "sawtooth", vol: 0.025, filter: 4000, slide: -400 });
SFX.chant = () => {
  // "de-fans!" ritmi: iki kısa, bir uzun tribün bağırışı
  for (const [d, l] of [
    [0, 0.12],
    [0.22, 0.12],
    [0.48, 0.28]
  ])
    noise(l, { freq: 700, q: 0.9, vol: 0.12, delay: d });
};

/* ---- Salon: büyük maçta ışık gösterisi ---- */
export function arenaLights() {
  if (!M || !M.big) return;
  const svg = $("#crt");
  if (!svg || svg.querySelector("#lights")) return;
  svg.insertAdjacentHTML(
    "afterbegin",
    `<defs><radialGradient id="lg1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
  );
  svg.insertAdjacentHTML(
    "beforeend",
    `<g id="lights" style="pointer-events:none"><circle cx="90" cy="98" r="70" fill="url(#lg1)"><animate attributeName="cx" values="60;300;60" dur="5s" repeatCount="indefinite"/></circle><circle cx="270" cy="98" r="60" fill="url(#lg1)"><animate attributeName="cx" values="300;60;300" dur="6s" repeatCount="indefinite"/></circle></g>`
  );
  const cap = $("#crt-cap");
  if (cap) cap.innerHTML = `<b class="gold">${$t("sc.bigNight")}</b>`;
}
void $$;
