import { t as $t } from "./i18n/index.js";
/* ================= EMEKLİLİK SONRASI İKİNCİ PERDE: KOÇLUK =================
   Emeklilik ekranından açılan kısa, tekrar oynanabilir mod. Ana kariyer verisine dokunmaz:
   - Durum S.cch (yürüyen sezon), sonuçlar S.legacy.coach (miras: sezon, kupa, en iyi sıra, puan).
   - Takım seç (eski takımın ya da memleket kulübü) → 8 hafta, her hafta bir koçluk kararı
     (rotasyon, taktik, genç oyuncu, basın) → maç simüle → ilk 4 play-off (yarı final + final).
   - Miras puanı: şampiyon 60, finalist 35, yarı finalist 20, diğer 5 (+ galibiyet başına 1), toplam en çok 180. */
import { $, $$, Bus, clamp, esc, pick } from "./data.js";
import { S, app, closeSheet, crestSVG } from "./core.js";
import { allClubs } from "./clubs.js";
import { save } from "./save.js";
import { late } from "./late.js";

export const CCH_WEEKS = 8;
export const CCH_CAP = 180;
// karar destesi: her türün iki senaryosu; etkiler: s (bu maç güç), r (risk ±), chem/mor/youth/fat
export const CCH_DECK = {
  rot1: [
    { s: 0.04, fat: 15 },
    { s: -0.03, fat: -15, mor: 3 },
    { s: 0.01, fat: -5 }
  ],
  rot2: [
    { s: -0.02, chem: 6, fat: -10 },
    { s: 0.02, mor: -4, fat: 8 },
    { chem: 2, fat: -3 }
  ],
  tac1: [{ s: 0.02 }, { s: 0.04, fat: 10 }, { s: 0.01, chem: 3 }],
  tac2: [{ s: 0.01, r: 0.07 }, { s: 0.02 }, { s: 0.02, r: 0.03 }],
  you1: [{ s: -0.03, youth: 2, mor: 4 }, { youth: 1 }, { s: 0.01, mor: -2 }],
  you2: [
    { youth: 1, mor: 3 },
    { s: 0.01, youth: -1 },
    { s: 0.02, mor: -3 }
  ],
  pre1: [{ mor: 2 }, { mor: 5, chem: 3 }, { s: 0.01, mor: 2, r: 0.02 }],
  pre2: [{ chem: 3 }, { s: 0.02, mor: 6, r: 0.03 }, { s: 0.02 }],
  po: [
    { s: 0.01, chem: 2 },
    { s: 0.02, r: 0.05 },
    { s: 0.015, mor: 3 }
  ]
};
const ORDER = [
  ["tac1", "tac2"],
  ["rot1", "rot2"],
  ["you1", "you2"],
  ["pre1", "pre2"]
];
const norm = str => +(1 + ((str || 1) - 1) * 0.5).toFixed(3); // güç farkını yumuşat: büyük kulüp de kararlara muhtaç

function LG() {
  S.legacy = S.legacy || { found: {}, club: 0 };
  S.legacy.coach = S.legacy.coach || { seasons: 0, titles: 0, best: 0, pts: 0, hist: [] };
  return S.legacy.coach;
}
/** Miras dökümü için (src/legacy.js) */
export function cchLegacy() {
  return S && S.legacy && S.legacy.coach ? Math.min(CCH_CAP, S.legacy.coach.pts || 0) : 0;
}

/* ---- takım seçenekleri ---- */
function short3(n) {
  return (
    String(n)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-zıİ ]/g, "")
      .split(" ")
      .filter(w => w.length > 1)[0] || "BK"
  )
    .slice(0, 3)
    .toLocaleUpperCase("tr-TR");
}
const fromClub = (c, key) => ({
  key,
  n: c.n,
  short: short3(c.n),
  c1: c.c1 || "#1d428a",
  c2: c.c2 || "#ffffff",
  cc: c.cc,
  str: norm(c.str)
});
export function cchTeamOptions() {
  const t = S.team || {};
  const old = {
    key: "cch|old",
    n: t.name || "?",
    short: t.short || short3(t.name || "?"),
    c1: t.c1 || "#c8102e",
    c2: t.c2 || "#fff",
    cc: t.cc || "TR",
    str: norm(t.str || 1)
  };
  const hc = allClubs().find(c => c.city === S.home && c.n !== old.n);
  const home = hc
    ? fromClub(hc, "cch|home")
    : {
        key: "cch|home",
        n: $t("cch.homeClub", { city: S.home || "" }),
        short: short3(S.home || "BK"),
        c1: "#1d428a",
        c2: "#ffd34d",
        cc: old.cc,
        str: 0.97
      };
  return { old, home };
}
function opponents(team) {
  let pool = allClubs().filter(c => c.cc === team.cc && c.n !== team.n);
  if (pool.length < CCH_WEEKS) pool = pool.concat(allClubs().filter(c => c.n !== team.n && !pool.includes(c)));
  const out = [];
  while (out.length < CCH_WEEKS && pool.length) {
    const c = pick(pool);
    pool = pool.filter(x => x !== c);
    out.push(fromClub(c, `cch|o${out.length}`));
  }
  return out;
}

/* ---- simülasyon ---- */
export function cchStart(which) {
  const base = cchTeamOptions()[which === "home" ? "home" : "old"],
    opps = opponents(base),
    m = opps.reduce((a, o) => a + o.str, 0) / Math.max(1, opps.length);
  // kendi gücün ligin ortalamasına göre dar bir bantta: dev kulüp de kararlarla kazanır, küçük kulüp de şansını korur
  S.cch = {
    team: { ...base, str: +(m + clamp(base.str - m, -0.03, 0.03)).toFixed(3) },
    opps,
    m: +m.toFixed(3),
    wk: 0,
    w: 0,
    l: 0,
    chem: 50,
    mor: 60,
    youth: 0,
    fat: 10,
    phase: "week",
    last: null,
    po: 0,
    rank: 0,
    log: []
  };
  save();
  return S.cch;
}
/** Bu haftanın karar kartı kimliği */
export function cchDecisionId(C = S.cch) {
  if (C.phase === "po") return "po";
  return ORDER[C.wk % 4][Math.floor(C.wk / 4) % 2];
}
function power(C, fx) {
  return (
    C.team.str +
    (C.chem - 55) / 600 +
    (C.mor - 60) / 600 +
    C.youth * 0.006 -
    C.fat / 500 +
    (fx.s || 0) * 1.5 +
    (fx.r ? (Math.random() * 2 - 1) * fx.r : 0)
  );
}
function playGame(C, opp, fx, home) {
  const p = 1 / (1 + Math.exp(-(power(C, fx) - opp.str + (home ? 0.02 : -0.01)) * 14));
  const win = Math.random() < p;
  const a = 68 + Math.floor(Math.random() * 22),
    d = 1 + Math.floor(Math.random() * 14);
  return { win, us: win ? a : a - d, them: win ? a - d : a, opp: opp.n, p: +p.toFixed(2) };
}
/** Kararı uygula, maçı oyna */
export function cchChoose(i) {
  const C = S.cch;
  if (!C || (C.phase !== "week" && C.phase !== "po")) return null;
  const id = cchDecisionId(C),
    fx = CCH_DECK[id][clamp(i | 0, 0, 2)];
  C.chem = clamp(C.chem + (fx.chem || 0), 0, 100);
  C.mor = clamp(C.mor + (fx.mor || 0), 0, 100);
  C.youth = clamp(C.youth + (fx.youth || 0), 0, 10);
  C.fat = clamp(C.fat + (fx.fat || 0), 0, 60);
  let res;
  if (C.phase === "po") {
    // yarı final: sıralamada eşleşen rakip; final: diğer yarıdan en güçlü
    const opp = C.poOpp[C.po];
    res = playGame(C, { ...opp, str: opp.str + 0.05 }, fx, C.rank <= 2); // play-off rakipleri daha diri
    C.po++;
  } else {
    res = playGame(C, C.opps[C.wk], fx, C.wk % 2 === 0);
    C.wk++;
    res.win ? C.w++ : C.l++;
  }
  C.mor = clamp(C.mor + (res.win ? 4 : -4), 0, 100);
  C.chem = clamp(C.chem + 1, 0, 100);
  C.fat = clamp(C.fat - 4, 0, 60);
  res.d = id;
  res.o = i | 0;
  C.last = res;
  C.log.push({ d: id, o: i | 0, win: res.win, us: res.us, them: res.them });
  C.phase = "result";
  save();
  return res;
}
/** Sonuç ekranından ilerle: sonraki hafta, play-off ya da sezon sonu */
export function cchAdvance() {
  const C = S.cch;
  if (!C || C.phase !== "result") return;
  const last = C.last;
  if (C.po > 0) {
    if (!last.win) return finish(C.po === 1 ? "semi" : "final");
    if (C.po >= 2) return finish("champ");
    C.phase = "po";
  } else if (C.wk < CCH_WEEKS) C.phase = "week";
  else {
    table(C);
    if (C.rank <= 4) {
      const top = C.table.slice(0, 4),
        semi = top[4 - C.rank]; // 1↔4, 2↔3
      const fin = top.filter(r => r !== semi && !r.me);
      C.poOpp = [semi, pick(fin)].map(r => C.opps.find(o => o.n === r.n) || C.opps[0]);
      C.phase = "po";
      C.po = 0;
    } else return finish("out");
  }
  save();
}
function table(C) {
  // diğer takımların 8 maçlık kaydı (güce göre), sonra sıralama
  const rows = C.opps.map(o => {
    let w = 0;
    for (let i = 0; i < CCH_WEEKS; i++) if (Math.random() < 1 / (1 + Math.exp(-(o.str - (C.m || 0.97)) * 14))) w++;
    return { n: o.n, w, l: CCH_WEEKS - w, s: o.str };
  });
  rows.push({ n: C.team.n, w: C.w, l: C.l, s: C.team.str + 0.001, me: true });
  rows.sort((a, b) => b.w - a.w || (b.me ? 1 : 0) - (a.me ? 1 : 0) || b.s - a.s);
  C.table = rows;
  C.rank = rows.findIndex(r => r.me) + 1;
}
const RES_PTS = { champ: 60, final: 35, semi: 20, out: 5 };
function finish(res) {
  const C = S.cch,
    L = LG();
  C.res = res;
  C.phase = "done";
  const gained = Math.max(0, Math.min(CCH_CAP - (L.pts || 0), RES_PTS[res] + C.w));
  C.gained = gained;
  L.seasons++;
  if (res === "champ") L.titles++;
  L.best = L.best ? Math.min(L.best, C.rank) : C.rank;
  L.pts = (L.pts || 0) + gained;
  L.hist.push({ team: C.team.n, w: C.w, l: C.l, rank: C.rank, res });
  if (L.hist.length > 12) L.hist.shift();
  Bus.emit("legacy", { kind: "coach", res, rank: C.rank });
  save();
}

/* ---- arayüz ---- */
const crest = (t, sz) => crestSVG({ key: t.key, c1: t.c1, c2: t.c2, short: t.short }, sz);
const meter = (n, v, max, col) =>
  `<div class="attr"><span>${n}</span><div class="bar"><i style="--w:${Math.round((v / max) * 100)};background:${col}"></i></div><b>${Math.round(v)}</b></div>`;
/** Emeklilik ekranı kartı */
export function cchCardHTML() {
  if (!S) return ""; // yalnız emeklilik ekranından çağrılır (S.retired çizimden sonra işaretlenir)
  const L = S.legacy && S.legacy.coach;
  const run = S.cch && S.cch.phase !== "done";
  return `<div class="card" id="cch-card"><div class="eyebrow">${$t("cch.title")}</div><p class="small">${$t("cch.intro", { n: CCH_WEEKS })}</p>${
    L && L.seasons
      ? `<div class="kv"><span>${$t("cch.seasons")}</span><b>${L.seasons}</b><span>${$t("cch.titles")}</span><b>${L.titles}</b><span>${$t("cch.best")}</span><b>${L.best}.</b><span>${$t("cch.legacyPart")}</span><b>${cchLegacy()}</b></div>`
      : ""
  }<button class="btn team" id="cch-open">${run ? $t("cch.continue") : $t("cch.start")}</button></div>`;
}
export function cchBind(back) {
  const b = $("#cch-open");
  if (b) b.onclick = () => cchScreen(back);
}
let BACK = null;
export function cchScreen(back) {
  if (back) BACK = back;
  if (window.__SIM) return;
  closeSheet();
  const C = S.cch;
  const head = `<div class="pt-4h"><div class="eyebrow">${$t("cch.title")}</div><h1>${C ? esc(C.team.n) : $t("cch.pickTitle")}</h1></div>`;
  let body = "";
  if (!C) {
    const o = cchTeamOptions();
    body = `<div class="card"><p>${$t("cch.pickSub")}</p><div class="choices">${[
      ["old", o.old, $t("cch.oldTeam")],
      ["home", o.home, $t("cch.homeTeam", { city: esc(S.home || "") })]
    ]
      .map(
        ([k, t, d]) =>
          `<button class="choice" data-cch-team="${k}"><span class="ct" style="display:flex;align-items:center;gap:var(--sp-2)">${crest(t, 28)}${esc(t.n)}</span><span class="cd">${d}</span></button>`
      )
      .join("")}</div></div>`;
  } else {
    const status = `<div class="card"><div class="row between nowrap">${crest(C.team, 40)}<div style="flex:1;min-width:0;padding:0 var(--sp-2)"><div class="eyebrow">${
      C.po || C.phase === "po"
        ? $t("cch.playoffs")
        : $t("cch.week", { n: Math.min(C.wk + (C.phase === "week" ? 1 : 0), CCH_WEEKS), m: CCH_WEEKS })
    }</div><div style="font-weight:800">${$t("cch.record", { w: C.w, l: C.l })}</div></div></div>
    ${meter($t("cch.chem"), C.chem, 100, "var(--info)")}${meter($t("cch.mor"), C.mor, 100, "var(--good)")}${meter($t("cch.fat"), C.fat, 60, "var(--bad)")}${meter($t("cch.youth"), C.youth, 10, "var(--gold)")}</div>`;
    if (C.phase === "week" || C.phase === "po") {
      const id = cchDecisionId(C),
        opp = C.phase === "po" ? C.poOpp[C.po] : C.opps[C.wk];
      body =
        status +
        `<div class="card"><div class="row nowrap gap-2">${crest(opp, 32)}<div><div class="eyebrow">${
          C.phase === "po" ? (C.po ? $t("cch.final") : $t("cch.semi")) : $t("cch.next")
        }</div><b>${esc(opp.n)}</b></div></div><h3 style="margin-top:8px">${$t(`cch.d.${id}`)}</h3><div class="choices">${[
          0, 1, 2
        ]
          .map(
            i =>
              `<button class="choice" data-cch-o="${i}"><span class="ct">${$t(`cch.d.${id}.o${i}`)}</span><span class="cd">${$t(`cch.d.${id}.h${i}`)}</span></button>`
          )
          .join("")}</div></div>`;
    } else if (C.phase === "result") {
      const r = C.last;
      body =
        status +
        `<div class="card ta-c"><div class="eyebrow">${esc(r.opp)}</div><h2 class="${r.win ? "gold" : ""}">${r.us} - ${r.them}</h2><p>${r.win ? $t("cch.win") : $t("cch.loss")}</p><button class="btn pri" id="cch-next">${$t("cch.continueBtn")}</button></div>`;
    } else if (C.phase === "done") {
      body =
        `<div class="card ta-c"><div class="eyebrow">${$t("cch.seasonOver")}</div><h2 class="gold">${$t(`cch.res.${C.res}`)}</h2><p>${$t(
          "cch.summary",
          {
            w: C.w,
            l: C.l,
            r: C.rank
          }
        )}</p><p class="small">${$t("cch.gained", { n: C.gained })}</p><div style="display:grid"><button class="btn team" id="cch-again">${$t("cch.again")}</button></div></div>` +
        (C.table
          ? `<div class="card"><div class="eyebrow">${$t("cch.table")}</div><div class="tbl"><table>${C.table
              .map(
                (row, i) =>
                  `<tr${row.me ? ' style="font-weight:800;color:var(--gold)"' : ""}><td>${i + 1}</td><td>${esc(row.n)}</td><td>${row.w}-${row.l}</td></tr>`
              )
              .join("")}</table></div></div>`
          : "");
    }
  }
  app.innerHTML = `${head}${body}<div style="display:grid;margin:10px 0 24px"><button class="btn ghost" id="cch-back">${$t("cch.backRetire")}</button></div>`;
  const re = () => cchScreen();
  const goBack = () => (BACK ? BACK() : late.retireScreen());
  $("#cch-back").onclick = goBack;
  $$("[data-cch-team]").forEach(b => (b.onclick = () => (cchStart(b.dataset.cchTeam), re())));
  $$("[data-cch-o]").forEach(b => (b.onclick = () => (cchChoose(+b.dataset.cchO), re())));
  const nx = $("#cch-next");
  if (nx) nx.onclick = () => (cchAdvance(), re());
  const ag = $("#cch-again");
  if (ag)
    ag.onclick = () => {
      S.cch = null;
      save();
      re();
    };
  scrollTo(0, 0);
}
