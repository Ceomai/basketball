/* ================= EFSANELER KOLEKSİYONU VE BAŞLANGIÇ HİKÂYELERİ =================
   Kariyerler arası kalıcı ilerleme: her biten kariyer (oğul kariyeri dahil) cihazdaki koleksiyona bir kart ekler.
   Koleksiyon büyüdükçe yeni başlangıç hikâyeleri ve görünümler açılır. Böylece bir kariyerin bitişi oyunun sonu değil,
   "bir tane daha" isteği olur.
   - Saklama: localStorage "pota-legends" (kayıt yuvalarından bağımsız; yuva silinse de kart kalır)
   - Eski emekli kariyerler yuvalar ekranında bir kez taranıp koleksiyona eklenir
   Başlangıç hikâyeleri (hepsi İstanbul'da lise takımında başlar; geçmişleri farklıdır):
   - istanbul  Mahalle çocuğu (her zaman açık): varsayılan başlangıç
   - anadolu   Anadolu'dan gelen (1 kart): güç ve savunma +2, aile +10, cep harçlığı az
   - sokak     Sokak basketbolcusu (2 kart): şut ve hız +3, okul -15, koç -10, takipçi +200 (sokak videoları)
   - gurbet    Gurbetçi (EuroLeague görmüş bir kart): pas ve savunma +2, okul +10, Avrupa kulüpleri daha ilgili (+1 potansiyel)
   - gec       Geç başlayan (3 kart): bütün nitelikler -3, 22 yaşına kadar antrenman kazancı %20 fazla
   Görünümler: altın bere rengi (Şöhretler Müzesi'ne giren bir kart), 6/9/32 numaraları (3 kart), 99 numara (NBA görmüş bir kart). */
import { t as $t } from "./i18n/index.js";
import { $$, Bus, ORDER, esc } from "./data.js";
import { icon, portrait } from "./art.js";
import { S, fullName, news, norm, sheet, tx } from "./core.js";
import { late } from "./late.js";
import { brandIsEuro, brandIsNba, brandText } from "./brand.js";

const KEY = "pota-legends",
  MAX = 60;
export const GOLD_HAT = "#d4a017";
export const ORIGINS = ["istanbul", "anadolu", "sokak", "gurbet", "gec"];
const O_KEYS = {
  istanbul: ["org.istanbul", "org.istanbulD"],
  anadolu: ["org.anadolu", "org.anadoluD"],
  sokak: ["org.sokak", "org.sokakD"],
  gurbet: ["org.gurbet", "org.gurbetD"],
  gec: ["org.gec", "org.gecD"]
};
export const LEG = (() => {
  let o = {};
  try {
    o = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    o = {};
  }
  if (!Array.isArray(o.cards)) o.cards = [];
  o.cards = o.cards.filter(c => c && typeof c === "object" && typeof c.id === "string").slice(-MAX);
  if (!Array.isArray(o.seen)) o.seen = [];
  return o;
})();
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(LEG));
  } catch (e) {
    /* dolu */
  }
};
const str = (v, n = 40) =>
  String(v == null ? "" : v)
    .replace(/[<>]/g, "")
    .slice(0, n);
const num = v => (Number.isFinite(+v) ? +v : 0);

/* ---- Kariyerin zirvesi ---- */
Bus.on("season:end", () => {
  if (S) S.peak = Math.max(S.peak || 0, ORDER.indexOf(S.stage));
});
function peakOf(st) {
  let p = Math.max(st.peak || 0, ORDER.indexOf(st.stage));
  for (const h of st.hist || []) {
    if (brandIsNba(h.league)) p = Math.max(p, 6);
    else if (brandIsEuro(h.league)) p = Math.max(p, 5);
  }
  return p;
}
/** Bir kariyer durumundan koleksiyon kartı */
export function cardOf(st, score) {
  const k = st.career || {};
  if (!st.cid) st.cid = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const tierIdx = Math.max(
    0,
    late.HOF.findIndex(h => score >= h[0])
  );
  return {
    id: str(st.cid, 24),
    n: str(`${st.first} ${st.last}`),
    pos: str(st.pos, 3),
    num: num(st.num),
    look: st.look && typeof st.look === "object" ? { ...st.look } : {},
    c1: str((st.team && st.team.c1) || "#1d428a", 9),
    c2: str((st.team && st.team.c2) || "#ffffff", 9),
    team: str(st.team && st.team.name),
    peak: peakOf(st),
    seasons: (st.hist || []).length,
    games: num(k.games),
    pts: num(k.pts),
    trophies: (k.trophies || []).length,
    mvps: num(k.mvps),
    allStars: num(k.allStars),
    score: Math.round(num(score)),
    tier: tierIdx,
    mode: str(st.mode || "normal", 8),
    origin: str(st.origin || "istanbul", 10),
    heir: !!st.heir,
    age: num(st.age),
    d: new Date().toISOString().slice(0, 10)
  };
}
/** Koleksiyona ekle; yeni açılanları döndürür */
export function addLegend(card) {
  if (!card || LEG.cards.some(c => c.id === card.id)) return [];
  const before = unlockedSet();
  LEG.cards.push(card);
  if (LEG.cards.length > MAX) LEG.cards.splice(0, LEG.cards.length - MAX);
  persist();
  const after = unlockedSet();
  const fresh = [...after].filter(u => !before.has(u));
  Bus.emit("legend", { n: LEG.cards.length, fresh });
  return fresh;
}
let lastFresh = [];
Bus.on("career:retire", () => {
  if (!S || window.__SIM) return;
  S.legacyFinal = late.legacyScore();
  lastFresh = addLegend(cardOf(S, S.legacyFinal));
  late.save();
});
// emeklilik sonrası seçimler (son bölüm, vakıf) miras puanını değiştirir: kart güncellenir
Bus.on("legacy", d => {
  if (!S || !S.retired || !S.cid || (d && d.kind === "hof")) return;
  const c = LEG.cards.find(x => x.id === S.cid);
  if (!c) return;
  c.score = Math.round(late.legacyScore());
  c.tier = Math.max(
    0,
    late.HOF.findIndex(h => c.score >= h[0])
  );
  persist();
});
/** Yuvalar ekranında: koleksiyondan önceki emekli kariyerleri bir kez ekle */
export function scanRetired(loadSlot, n, scoreOf) {
  let changed = false;
  for (let i = 1; i <= n; i++) {
    const r = loadSlot(i);
    if (!r || !r.S || !r.S.retired) continue;
    if (r.S.cid && LEG.cards.some(c => c.id === r.S.cid)) continue;
    // kayıt kimliği yoksa ad + sezon sayısıyla eşleştir (tekrar eklenmesin)
    const sig = `${r.S.first} ${r.S.last}|${(r.S.hist || []).length}|${r.S.age}`;
    if (LEG.cards.some(c => `${c.n}|${c.seasons}|${c.age}` === sig)) continue;
    const st = r.S,
      score = num(st.legacyFinal) || (scoreOf ? num(scoreOf(st)) : 0);
    st.cid = st.cid || `old${i}${(st.hist || []).length}${st.age}`;
    LEG.cards.push(cardOf(st, score));
    changed = true;
  }
  if (changed) persist();
}

/* ---- Açılanlar ---- */
const UNLOCKS = [
  { id: "o:anadolu", need: () => LEG.cards.length >= 1, req: "leg.req1" },
  { id: "o:sokak", need: () => LEG.cards.length >= 2, req: "leg.req2" },
  { id: "o:gurbet", need: () => LEG.cards.some(c => c.peak >= 5), req: "leg.reqEuro" },
  { id: "o:gec", need: () => LEG.cards.length >= 3, req: "leg.req3" },
  { id: "c:gold", need: () => LEG.cards.some(c => c.tier <= 2), req: "leg.reqHof" },
  { id: "c:nums", need: () => LEG.cards.length >= 3, req: "leg.req3" },
  { id: "c:99", need: () => LEG.cards.some(c => c.peak >= 6), req: "leg.reqNba" }
];
const U_NAME = {
  "o:anadolu": "org.anadolu",
  "o:sokak": "org.sokak",
  "o:gurbet": "org.gurbet",
  "o:gec": "org.gec",
  "c:gold": "leg.cGold",
  "c:nums": "leg.cNums",
  "c:99": "leg.c99"
};
export function unlockedSet() {
  return new Set(UNLOCKS.filter(u => u.need()).map(u => u.id));
}
export const originOpen = o => o === "istanbul" || unlockedSet().has("o:" + o);
/** Oluşturma ekranı: açık bere renkleri ve forma numaraları */
export const extraHatColors = () => (unlockedSet().has("c:gold") ? [GOLD_HAT] : []);
export const extraNumbers = () => [
  ...(unlockedSet().has("c:nums") ? [6, 9, 32] : []),
  ...(unlockedSet().has("c:99") ? [99] : [])
];

/* ---- Başlangıç hikâyesi seçici ve etkileri ---- */
export function originPickerHTML(cur) {
  const c = originOpen(cur) ? cur : "istanbul";
  return `<div><div class="eyebrow mb-1h">${$t("org.title")}</div><div class="opts" id="origin">${ORIGINS.map(o => {
    const open = originOpen(o);
    // kilitli seçenek dokunulabilir: nasıl açılacağını söyler (src/core.js renderCreate)
    return `<button class="opt ${c === o ? "on" : ""}${open ? "" : " locked"}" data-v="${o}" aria-pressed="${c === o}"${open ? "" : ' aria-disabled="true"'}>${open ? "" : icon("lock")}${$t(O_KEYS[o][0])}</button>`;
  }).join("")}</div><p class="small muted mt-1h">${$t(O_KEYS[c][1])}</p></div>`;
}
/** Kilitli başlangıç hikâyesine dokununca: "Anadolu'dan gelen: 1 kariyer bitir" */
export function originLockText(o) {
  const u = UNLOCKS.find(x => x.id === "o:" + o);
  return O_KEYS[o] ? `${$t(O_KEYS[o][0])}: ${u ? $t(u.req) : ""}` : "";
}
/** startCareer içinden (oğul kariyerinde uygulanmaz) */
export function applyOrigin(o) {
  if (!o || o === "istanbul" || !originOpen(o)) {
    S.origin = "istanbul";
    return;
  }
  S.origin = o;
  const st = S.st;
  if (o === "anadolu") {
    st.guc += 2;
    st.sav += 2;
    S.rel.aile += 10;
    tx($t("org.anadolu"), Math.max(10, S.money - 10) - S.money, { kind: "plain" });
  } else if (o === "sokak") {
    st.sut += 3;
    st.hiz += 3;
    S.aka -= 15;
    S.rel.koc -= 10;
    S.followers += 200;
  } else if (o === "gurbet") {
    st.pas += 2;
    st.sav += 2;
    S.aka += 10;
  } else if (o === "gec") for (const k in st) st[k] -= 3;
  norm();
  news($t(`org.news.${o}`, { v: fullName() }));
}
export const originPotential = () => (S && S.origin === "gurbet" ? 1 : 0);
export const originTrainMul = () => (S && S.origin === "gec" && S.age <= 22 ? 1.2 : 1);

/* ---- Koleksiyon paneli ---- */
const STAGE_N = () => [
  $t("leg.p0"),
  $t("leg.p1"),
  $t("leg.p2"),
  $t("leg.p3"),
  $t("leg.p4"),
  brandText("EuroLeague"),
  brandText("NBA")
];
export function legendsButtonHTML() {
  return `<button class="btn ghost sm" id="legb">${$t("leg.title")} (${LEG.cards.length})</button>`;
}
export function legendsSheet(back) {
  const U = unlockedSet(),
    SN = STAGE_N();
  const cards = LEG.cards
    .slice()
    .sort((a, b) => b.score - a.score)
    .map(
      (c, i) =>
        `<div class="act"><div class="ai" data-lp="${i}"></div><div><h3>${esc(c.n)}${c.heir ? ` <span class="pill">${$t("leg.heir")}</span>` : ""}</h3><p>${esc(c.pos)} · ${SN[c.peak] || ""} · ${$t("leg.line", { s: c.seasons, g: c.games, p: c.pts, t: c.trophies })}<br><b class="gold">${esc((late.HOF[c.tier] || late.HOF[3])[1])}</b> · ${$t("leg.score", { v: c.score })}</p></div></div>`
    );
  const ul = UNLOCKS.map(
    u =>
      `<div class="row between nowrap small" style="padding:var(--sp-1) 0"><span class="row gap-1h nowrap">${U.has(u.id) ? "✓" : icon("lock")} ${$t(U_NAME[u.id])}</span><span class="${U.has(u.id) ? "good" : "muted"}">${U.has(u.id) ? $t("leg.open") : $t(u.req)}</span></div>`
  ).join("");
  sheet(
    $t("leg.title"),
    $t("leg.sub", { n: LEG.cards.length }),
    `<div class="card"><div class="eyebrow">${$t("leg.unlocks")}</div>${ul}</div>${cards.length ? `<div class="choices">${cards.join("")}</div>` : `<p class="small muted">${$t("leg.empty")}</p>`}`,
    { onClose: () => (back ? back() : late.renderSlots()) } // yuvalar ekranından açılır: kapatınca kariyer olmadan ana ekran çizilmesin
  );
  const sorted = LEG.cards.slice().sort((a, b) => b.score - a.score);
  $$("[data-lp]").forEach(el => {
    const c = sorted[+el.dataset.lp];
    try {
      el.appendChild(portrait(c.look, { jersey: c.c1, trim: c.c2, number: c.num, mood: "mutlu" }, 48, 48, c.c1));
    } catch (e) {
      /* eski kart görünüşü eksik olabilir */
    }
  });
}
/** Emeklilik ekranı: koleksiyona eklendi + yeni açılanlar */
export function legendRetireHTML() {
  if (!S || !S.cid || !LEG.cards.some(c => c.id === S.cid)) return "";
  const fresh = lastFresh.map(u => `<span class="pill w">${$t(U_NAME[u])}</span>`).join(" ");
  return `<div class="card"><div class="eyebrow">${$t("leg.title")}</div><p>${$t("leg.added", { n: LEG.cards.length })}</p>${fresh ? `<p class="small"><b>${$t("leg.fresh")}</b> ${fresh}</p>` : `<p class="small muted">${$t("leg.next")}</p>`}</div>`;
}
