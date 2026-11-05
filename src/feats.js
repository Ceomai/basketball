/* ================= BAŞARIMLAR =================
   100+ başarım: kariyer toplamları (kademeli aileler), tek maç anları ve hayat/mekân başarıları.
   - Her başarım bir unvan açar (adı); çoğu ayrıca küçük bir kozmetik açar (ayakkabı rengi/deseni/logosu,
     kutlama hareketi, poster, halı, forma yazı tipi, arayüz teması; bkz. src/custom.js).
   - Saklama: localStorage "pota-feats" (kayıt yuvalarından bağımsız; açılan kozmetik yeni kariyerde de kalır).
   - Sayaçlar (basın, görev, kutlama...) kariyere özel: S.fx.
   - Denetim: maç sonu (o maçın anları), hafta başı, sezon sonu ve ilgili olaylarda. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, esc, fmt, isPro, toast } from "./data.js";
import { S } from "./core.js";
import { M } from "./match.js";
import { late } from "./late.js";

const KEY = "pota-feats";
export const FEATS_ST = (() => {
  let o = {};
  try {
    o = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    /* bozuk kayıt */
  }
  return { got: o.got && typeof o.got === "object" ? o.got : {} };
})();
const store = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(FEATS_ST));
  } catch (e) {
    /* depolama kapalı */
  }
};
const fx = () => (S.fx = S.fx || {});
/** Kariyere özel sayaç artır */
export function featCount(k, n = 1) {
  if (!S) return;
  fx()[k] = (fx()[k] || 0) + n;
}

/* ---- Kademeli aileler: [anahtar, değer okuyucu, eşikler, ödüller] ---- */
const C = () => S.career || {};
const H = () => (S.career && typeof S.career.high === "object" && S.career.high) || {};
const FAM = [
  ["pts", () => C().pts, [100, 500, 1000, 2500, 5000, 10000], ["sc1", "sc2", "sc3", "sc4", "sc5", "sc6"]],
  ["games", () => C().games, [10, 50, 100, 250, 500], ["p1", "p2", "p3", "p4", "p5"]],
  ["wins", () => C().wins, [10, 50, 100, 250], ["r1", "r2", "r3", "r4"]],
  ["ast", () => C().ast, [50, 250, 1000, 2500], ["lg1", "lg2", "lg3", "lg4"]],
  ["reb", () => C().reb, [50, 250, 1000, 2500], ["pt1", "pt2", "pt3", "pt4"]],
  ["stl", () => C().stl, [50, 200, 500], ["sc7", "sc8", "sc9"]],
  ["blk", () => C().blk, [25, 100, 300], ["pt5", "pt6", "lg5"]],
  ["troph", () => (C().trophies || []).length, [1, 3, 5, 10, 20], ["c1", "c2", "c3", "c4", "c5"]],
  ["mvp", () => C().mvps, [1, 3, 5], ["c6", "c7", "c8"]],
  ["fol", () => S.followers, [1000, 10000, 100000, 1000000, 10000000], ["p6", "p7", "p8", "jf1", "jf2"]],
  ["earn", () => C().earned, [10000, 100000, 1000000, 10000000], ["r5", "r6", "sc10", "night"]],
  ["ovr", () => (late.ovr ? late.ovr() : 0), [50, 60, 70, 80, 90], ["jf3", "jf4", "c9", "c10", null]],
  ["hpts", () => H().pts, [20, 30, 40, 50], [null, null, null, null]],
  ["hast", () => H().ast, [8, 12, 16], [null, null, null]],
  ["hreb", () => H().reb, [10, 15, 20], [null, null, null]],
  ["seas", () => S.season, [3, 5, 10, 15], [null, "minimal", null, null]]
];
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const STAGE_ORDER = ["lise", "uni", "t3", "t2", "t1", "euro", "nba"];
const stageAt = st => STAGE_ORDER.indexOf(S.stage) >= STAGE_ORDER.indexOf(st) || (st === "uni" && !!S.uni);
const trophyType = ty => (C().trophies || []).some(t => t.type === ty);
const seasonTrophies = () => {
  const p = late.seasonLabel ? late.seasonLabel() : "";
  return p ? (C().trophies || []).filter(t => String(t.label).startsWith(p)).length : 0;
};

/* ---- Tekil başarımlar: [id, kategori, koşul, ödül]. Maç koşulları m (maç özeti) alır. ---- */
const ONE = [
  // maç anları
  ["andone", "match", m => m && m.win && m.and1 > 0, "c-and1"],
  ["triple", "match", m => m && m.pts >= 10 && m.ast >= 10 && m.reb >= 10, null],
  ["double", "match", m => m && [m.pts, m.ast, m.reb].filter(v => v >= 10).length >= 2, null],
  ["perfect", "match", m => m && m.fga >= 4 && m.fgm === m.fga, null],
  ["ftperf", "match", m => m && m.fta >= 4 && m.ftm === m.fta, null],
  ["threes5", "match", m => m && m.tpm >= 5, null],
  ["comeback", "match", m => m && m.win && m.low <= -12, "p-cb"],
  ["blowout", "match", m => m && m.win && m.us - m.them >= 30, null],
  ["buzzer", "match", m => m && m.win && m.buzz, "c-buzz"],
  ["rating", "match", m => m && m.rating >= 9.5, null],
  ["bench", "match", m => m && m.role === "bench" && m.pts >= 15, null],
  ["foulout", "match", m => m && m.fo, null],
  ["duel", "match", m => m && m.duelWon, null],
  ["combo", "match", m => m && m.combo > 0, null],
  ["setplay", "match", m => m && m.setGood > 0, null],
  ["awaywin", "match", m => m && m.win && !m.home && m.loud, null],
  // kariyer ve kupalar
  ["stage_uni", "career", () => stageAt("uni"), null],
  ["stage_pro", "career", () => isPro(S.stage), null],
  ["stage_t1", "career", () => stageAt("t1"), null],
  ["stage_euro", "career", () => stageAt("euro"), null],
  ["stage_nba", "career", () => stageAt("nba"), "retro"],
  ["champ", "career", () => trophyType("champ"), null],
  ["cups3", "career", () => seasonTrophies() >= 3, null],
  ["natgold", "career", () => trophyType("nat_gold"), null],
  ["arcadecup", "career", () => trophyType("arcade"), null],
  ["streetcup", "career", () => trophyType("street"), null],
  ["streetking", "career", () => !!(S.sl && S.sl.legend), null],
  ["acadpro", "career", () => !!(S.acad && S.acad.grads && S.acad.grads.some(g => g.pro)), null],
  ["acadmeet", "career", () => !!(S.fx && S.fx.gradMeet), null],
  ["retire", "career", () => !!S.retired, null],
  // hayat
  ["married", "life", () => (S.pstage || 0) >= 3 && !!S.partner, null],
  ["parent", "life", () => (S.pstage || 0) >= 4 && !!S.partner, null],
  ["villa", "life", () => ["villa", "malikane"].includes(S.housing), null],
  ["sponsor", "life", () => !!S.sponsorDeal, null],
  ["studio5", "life", () => (late.chLevel ? late.chLevel() >= 5 : false), null],
  ["live", "life", () => (fx().live || 0) >= 1, null],
  ["team90", "life", () => S.rel && S.rel.takim >= 90, null],
  ["coach95", "life", () => S.rel && S.rel.koc >= 95, null],
  ["fans95", "life", () => S.rel && S.rel.taraf >= 95, null],
  ["press10", "life", () => (fx().press || 0) >= 10, null],
  ["mission10", "life", () => (fx().mission || 0) >= 10, null],
  ["dilemma5", "life", () => (fx().dilemma || 0) >= 5, null],
  ["healed", "life", () => (fx().healed || 0) >= 1, null],
  ["quiz", "life", () => (fx().quizWin || 0) >= 1, null],
  ["investor", "life", () => (fx().divs || 0) >= 1, null],
  // tasarım
  ["shoe", "style", () => !!(S.shoe && S.shoe.made), null],
  ["celeb10", "style", () => (fx().celeb || 0) >= 10, null],
  ["decor", "style", () => !!(S.decor && (S.decor.p1 || S.decor.p2 || S.decor.rug)), null],
  ["jersey", "style", () => !!S.jnameSet, null]
];

/** Tüm başarımların listesi: {id, cat, name, desc, reward, test} */
export const FEATS = (() => {
  const out = [];
  for (const [k, get, th, rw] of FAM)
    th.forEach((n, i) =>
      out.push({
        id: `${k}${i + 1}`,
        cat: "fam",
        fam: k,
        n,
        tier: i,
        reward: rw[i] || null,
        test: () => (+get() || 0) >= n
      })
    );
  for (const [id, cat, test, reward] of ONE) out.push({ id, cat, test, reward, match: cat === "match" });
  return out;
})();
const nfmt = n => (n >= 1e6 ? `${n / 1e6}M` : n >= 1e4 ? `${n / 1e3}K` : String(n));
export const featName = f =>
  f.cat === "fam" ? `${$t(`ft.f.${f.fam}`)} ${ROMAN[f.tier]}` : $t(`ft.${f.id}`);
export const featDesc = f =>
  f.cat === "fam" ? $t(`ft.f.${f.fam}.d`, { n: f.fam === "earn" ? fmt(f.n) : nfmt(f.n) }) : $t(`ft.${f.id}.d`);
export const featGot = id => !!FEATS_ST.got[id];
export const featTotal = () => FEATS.length;
export const featDone = () => FEATS.filter(f => FEATS_ST.got[f.id]).length;
/** Kozmetik açık mı? (temalar reklamsız paketle de açılır) */
export function cosOpen(cos) {
  if (["night", "retro", "minimal"].includes(cos) && late.ADS && late.ADS.adFree) return true;
  return FEATS.some(f => f.reward === cos && FEATS_ST.got[f.id]);
}
export const cosFeat = cos => FEATS.find(f => f.reward === cos);

let queue = [];
function grant(f) {
  if (FEATS_ST.got[f.id]) return false;
  FEATS_ST.got[f.id] = Date.now();
  queue.push(f);
  return true;
}
let shown = [],
  timer = 0;
function flush() {
  if (!queue.length) return;
  store();
  const q = queue;
  queue = [];
  Bus.emit("feat", { ids: q.map(f => f.id) });
  if (window.__SIM) return;
  // art arda denetimlerde açılanları biriktir, tek bildirim göster
  shown.push(...q);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const list = shown;
    shown = [];
    if (!list.length) return;
    const cos = list.some(f => f.reward);
    toast(
      list.length === 1
        ? `${$t("ft.got")}: ${featName(list[0])}${cos ? ` · ${$t("ft.newCos")}` : ""}`
        : `${$t("ft.gotN", { n: list.length })}: ${list
            .slice(0, 2)
            .map(featName)
            .join(", ")}${list.length > 2 ? "…" : ""}${cos ? ` · ${$t("ft.newCos")}` : ""}`
    );
    late.sfx && late.sfx("cheer");
  }, 900);
}
/** Kariyer/hayat başarımlarını denetle */
export function checkFeats() {
  if (!S || !S.career) return;
  for (const f of FEATS)
    if (!f.match && !FEATS_ST.got[f.id]) {
      try {
        if (f.test()) grant(f);
      } catch (e) {
        /* eksik alan: atla */
      }
    }
  flush();
}
/** Maç sonu: o maçın özeti */
export function matchSummary(win) {
  if (!M) return null;
  return {
    win,
    pts: M.pts || 0,
    ast: M.ast || 0,
    reb: M.reb || 0,
    fga: M.fga || 0,
    fgm: M.fgm || 0,
    fta: M.fta || 0,
    ftm: M.ftm || 0,
    tpm: M.tpm || 0,
    and1: M.and1 || 0,
    low: M.low || 0,
    us: M.us,
    them: M.them,
    buzz: !!M.buzz,
    rating: M.rating || 0,
    role: S.role,
    fo: !!M.fo,
    duelWon: !!M.duelWon,
    combo: M.combo || 0,
    setGood: M.setGood || 0,
    home: !!M.home,
    loud: !!M.loud
  };
}
export function checkMatchFeats(m) {
  if (!m) return;
  for (const f of FEATS)
    if (f.match && !FEATS_ST.got[f.id] && f.test(m)) grant(f);
}

Bus.on("match:end", e => {
  if (!S || !M || M.auto) return; // otomatik (simüle) maçlar maç başarımı vermez
  checkMatchFeats(matchSummary(!!(e && e.win)));
  setTimeout(checkFeats, 0); // kariyer toplamları maç kaydından sonra
});
Bus.on("match:moment", e => {
  if (M && e && e.id === "lastshot" && e.good) M.buzz = 1;
});
for (const ev of ["week:start", "season:end", "purchase", "career:retire", "housing", "sponsor", "legacy"])
  Bus.on(ev, () => setTimeout(checkFeats, 0));
Bus.on("press", () => featCount("press"));
Bus.on("mission:done", () => featCount("mission"));
Bus.on("dilemma", () => featCount("dilemma"));
Bus.on("injury:healed", () => featCount("healed"));

/* ---- Başarımlar ekranı (Ev → Başarımlar) ---- */
const CATS = ["fam", "match", "career", "life", "style"];
export function featsTab(c, re) {
  const cat = (S.featCat = CATS.includes(S.featCat) ? S.featCat : "fam");
  const list = FEATS.filter(f => f.cat === cat);
  const cosName = cos => (late.cosLabel ? late.cosLabel(cos) : cos);
  c.innerHTML = `<button class="btn ghost sm" id="ft-back">${$t("ft.back")}</button><div class="card"><div class="row between"><div class="eyebrow">${$t("ft.title")}</div><b class="gold">${featDone()}/${featTotal()}</b></div><div class="bar"><i style="width:${Math.round((featDone() / featTotal()) * 100)}%"></i></div><p class="small muted">${$t("ft.sub")}</p>
    <div class="row" style="gap:6px;align-items:center"><span class="small muted">${$t("ft.titleNow")}</span><select id="ft-title" class="opt">${[
      `<option value="">${$t("ft.noTitle")}</option>`,
      ...FEATS.filter(f => FEATS_ST.got[f.id]).map(
        f => `<option value="${f.id}" ${S.title === f.id ? "selected" : ""}>${esc(featName(f))}</option>`
      )
    ].join("")}</select></div></div>
    <div class="opts" id="ft-cat">${CATS.map(k => `<button class="opt ${k === cat ? "on" : ""}" data-v="${k}">${$t(`ft.cat.${k}`)}</button>`).join("")}</div>
    <div class="ftl">${list
      .map(f => {
        const g = FEATS_ST.got[f.id];
        return `<div class="act ft ${g ? "on" : ""}"><div class="fti">${g ? "★" : "☆"}</div><div><h3>${esc(featName(f))}</h3><p>${esc(featDesc(f))}${f.reward ? ` · <span class="${g ? "good" : "muted"}">${$t("ft.reward")}: ${esc(cosName(f.reward))}</span>` : ""}</p></div></div>`;
      })
      .join("")}</div>`;
  $$("#ft-cat [data-v]").forEach(
    b =>
      (b.onclick = () => {
        S.featCat = b.dataset.v;
        re();
      })
  );
  const bk = $("#ft-back");
  if (bk) bk.onclick = () => late.openLoc("ev", "vitrin");
  const sel = $("#ft-title");
  if (sel)
    sel.onchange = () => {
      S.title = sel.value || null;
      late.save && late.save();
    };
}
/** Vitrin sekmesindeki başarımlar özeti */
export const featsCardHTML = () =>
  `<div class="act"><div><h3>${$t("ft.title")} · <span class="gold">${featDone()}/${featTotal()}</span></h3><p>${titleText() ? `${$t("ft.titleNow")} <b>${esc(titleText())}</b>` : $t("ft.cardD")}</p></div><button class="btn team sm" id="ft-open">${$t("ft.open")}</button></div>`;
/** Seçili unvan (kart ve profil için) */
export const titleText = () => {
  const f = S && S.title && FEATS_ST.got[S.title] ? FEATS.find(x => x.id === S.title) : null;
  return f ? featName(f) : "";
};
