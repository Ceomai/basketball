/* ================= RASTGELE OLAY MOTORU =================
   İçerik paketlerindeki (events.tr.js, events.<dil>.js) veriyi oyuna uygular:
   koşulları süzer, yer tutucuları doldurur, etkileri ve şans dallarını uygular.
   Yeni olay eklemek için kod değil, yalnızca içerik paketi düzenlenir. */
import { ORDER, STATS, cOf, cityTheme, fmt, isPro, pick, statName, WAGE } from "../data.js";
import { S, fame, tx } from "../core.js";
import { LANG, PACKS } from "../i18n/index.js";
import { late } from "../late.js";
import TR_BASE from "./events.tr.js";
import TR_MORE from "./events.more.tr.js";
import TR_HARD from "./events.hard.tr.js";

const TR = [...TR_BASE, ...TR_MORE, ...TR_HARD];
// çeviri paketleri dil yüklenince i18n/index.js → PACKS.events içine gelir
const CONDITIONS = {
  home: () => S.city === S.home,
  abroad: () => S.city !== S.home,
  coast: () => cityTheme(S.city).water === "s",
  lise: () => S.stage === "lise",
  studying: () => !!S.studying,
  single: () => !S.partner && S.age >= 16,
  pro: () => isPro(S.stage),
  school: () => S.stage === "lise" || S.stage === "uni",
  lower: () => ["t3", "t2"].includes(S.stage),
  top: () => ["t1", "euro", "nba"].includes(S.stage),
  euro: () => S.stage === "euro",
  nba: () => S.stage === "nba",
  star: () => isPro(S.stage) && S.role === "star",
  bench: () => isPro(S.stage) && S.role === "bench",
  young: () => S.age <= 21,
  veteran: () => S.age >= 30,
  rich: () => S.money >= 20000,
  broke: () => S.money < 30,
  famous: () => S.followers >= 50000,
  partner: () => !!S.partner,
  national: () => (S.career.natCaps || 0) > 0,
  rivalAhead: () =>
    !!(
      S.rival &&
      ["lise", "uni", "t3", "t2", "t1", "euro", "nba"].indexOf(S.rival.stage) >
        ["lise", "uni", "t3", "t2", "t1", "euro", "nba"].indexOf(S.stage)
    ),
  lowMorale: () => S.moral < 40,
  tired: () => S.energy < 40
};
// "when": tek koşul ya da hepsinin sağlanması gereken koşul listesi
const fits = w => !w || (Array.isArray(w) ? w.every(c => CONDITIONS[c]()) : CONDITIONS[w]());
export const CONDITION_NAMES = Object.keys(CONDITIONS);
// çeviri paketini Türkçe olayın üzerine yalnızca metin alanlarıyla bindirir
function localize(ev) {
  if (LANG === "tr") return ev;
  const tr = PACKS.events.find(x => x.id === ev.id);
  if (!tr) return null;
  return {
    ...ev,
    who: tr.who || ev.who,
    title: tr.title,
    text: tr.text,
    choices: ev.choices.map((c, i) => {
      const x = tr.choices[i] || {};
      return {
        ...c,
        t: x.t || c.t,
        out: x.out || c.out,
        needOut: x.needOut || c.needOut,
        win: c.win && { ...c.win, out: (x.win || {}).out || c.win.out },
        lose: c.lose && { ...c.lose, out: (x.lose || {}).out || c.lose.out }
      };
    })
  };
}
function moneyOf(v) {
  if (typeof v === "number") return v;
  const [k, n] = String(v).split(":");
  return k === "W" ? WAGE[S.stage] * +n : k === "S" ? +n * (1 + ORDER.indexOf(S.stage)) : +n;
}
function fill(text, ctx) {
  return String(text).replace(/\{(\w+)(?::(-?[\d.]+))?\}/g, (m, k, n) => {
    if (n != null) return fmt(Math.abs(moneyOf(`${k}:${n}`)));
    return ctx[k] != null ? ctx[k] : m;
  });
}
function applyFx(fx, ctx) {
  if (!fx) return;
  for (const [k, v] of Object.entries(fx)) {
    if (k === "rel") for (const [r, d] of Object.entries(v)) S.rel[r] += d;
    else if (k === "buffs") Object.assign(S.buffs, v);
    else if (k === "st") for (const [s, d] of Object.entries(v)) S.st[s] += d;
    else if (k === "money") tx(ctx.title, moneyOf(v));
    else if (k === "followers") S.followers = typeof v === "string" && v[0] === "x" ? S.followers * +v.slice(1) : S.followers + v;
    else if (k === "statUp") S.st[ctx.statKey] += v;
    else if (k === "partner") {
      // true: partner olur; false: ayrılık
      S.partner = v ? ctx.fem : null;
      S.rel.partner = v ? 55 : 0;
    } else S[k] += v; // moral, energy, aka
  }
}
function runChoice(c, ctx) {
  if (c.need && c.need.money && S.money < c.need.money) return fill(c.needOut, ctx);
  applyFx(c.fx, ctx);
  if (c.p != null) {
    const p = c.p + (c.pStat ? S.st[c.pStat[0]] / c.pStat[1] : 0) + (c.pFame ? fame() / c.pFame : 0);
    const br = Math.random() < p ? c.win : c.lose;
    applyFx(br && br.fx, ctx);
    return fill((br && br.out) || "", ctx);
  }
  return fill(c.out, ctx);
}
/** Koşulları sağlayan olaylar, oyunun olay paneline hazır biçimde. */
export function eventPool() {
  const n = S.npc,
    statKey = pick(STATS)[0];
  const ctx = {
    friend: n.friend,
    coach: n.coach,
    rival: n.rival,
    mom: n.mom,
    dad: n.dad,
    agent: n.agent,
    mate: pick(late.roster()).n.split(" ")[0],
    fem: pick(cOf(S.city).fem),
    first: S.first,
    FIRST: S.first.toLocaleUpperCase(LANG === "tr" ? "tr-TR" : "en-US"),
    last: S.last,
    city: S.city,
    statKey,
    stat: statName(statKey)
  };
  return TR.filter(ev => fits(ev.when))
    .map(localize)
    .filter(Boolean)
    .map(ev => {
      const c = { ...ctx, title: ev.title };
      return {
        w: ev.w,
        hard: !!ev.hard,
        who: fill(ev.who, c),
        title: ev.title,
        text: fill(ev.text, c),
        choices: ev.choices.map(ch => ({ t: ch.t, do: () => runChoice(ch, c) }))
      };
    });
}
