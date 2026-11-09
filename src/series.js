/* ================= PLAY-OFF SERİSİ =================
   Play-off turları tek maç yerine seri: profesyonel liglerde yarı final en iyi 3, final en iyi 5;
   lise/üniversite ve hızlı kariyerde yarı final tek maç, final en iyi 3.
   Takvim: seri maçları play-off haftasının içinde oynanır (hafta sayısı, ücret/kira akışı ve sezon sonu aynı kalır).
   Seri sürerken maç arası kısa dinlenme: +16 enerji ve tek bir eylem hakkı, sonra sıradaki maç.
   - Ev/deplasman sırası: üst sıradaki takım avantajlı (en iyi 3: E-D-E, en iyi 5: E-E-D-D-E).
   - Deplasmanda tribün baskısı (src/matchday.js M.loud), iç sahada seyirci çubuğu daha hızlı dolar.
   - Momentum: seri maçını kazanan +4 moral (bizim için), seri kartında kimde olduğu yazar.
   - Rakip uyarlaması: kaybettiğin maçta en çok seçtiğin karar türüne (üçlük, orta mesafe, bitiriş, pas) rakip
     savunması hazırlanır: sıradaki maçta o türün seçenekleri −6 ("Rakip hazır"). Yalnız kendin oynarken (AUTO'da yok).
   Seri skoru maç öncesi ekranda (Stadyum → Maç), ana ekranda ve Lig merkezi → Play-off sekmesinde görünür. */
import { t as $t } from "./i18n/index.js";
import { Bus, esc, toast } from "./data.js";
import { S, news, norm, renderMain, teamByKey } from "./core.js";
import { M } from "./match.js";
import { save } from "./save.js";
import { late } from "./late.js";

const THREE = ["pull", "catch", "wing", "corner", "top3", "pp_flare"],
  TWO = ["step", "pop", "mid", "float", "pp_self", "pp_hook"],
  FIN = ["drive", "break", "lay", "post", "dunk", "putback", "fb_finish", "pp_curl", "pp_drop", "pp_back"],
  PASS = ["pnr", "kick", "lob", "fb_pass", "duo", "set", "pp_roll", "pp_perim", "pp_out"];
/** Karar anahtarının türü (rakip uyarlaması için) */
export const serCat = k =>
  THREE.includes(k) ? "three" : TWO.includes(k) ? "mid" : FIN.includes(k) ? "fin" : PASS.includes(k) ? "pass" : null;
const inPO = () => !!S && (S.phase === "semi" || S.phase === "final");
/** Serinin kaç galibiyetle biteceği */
export function serNeed(round) {
  const short = S.stage === "lise" || S.stage === "uni" || (late.isQuick && late.isQuick());
  return round === "final" ? (short ? 2 : 3) : short ? 1 : 2;
}
const PATTERN = { 1: [1], 2: [1, 0, 1], 3: [1, 1, 0, 0, 1] };
function seedIdx(k) {
  const P = S.po;
  return P && P.season === S.season && P.seeds ? P.seeds.indexOf(k) : -1;
}
/** Geçerli seri (yoksa S.playoffOpp'tan kurulur) */
export function serEnsure() {
  if (!inPO() || !S.playoffOpp) return null;
  let s = S.series;
  if (!s || s.season !== S.season || s.round !== S.phase || s.opp !== S.playoffOpp) {
    const me = seedIdx(S.team.key),
      op = seedIdx(S.playoffOpp);
    s = S.series = {
      season: S.season,
      round: S.phase,
      opp: S.playoffOpp,
      need: serNeed(S.phase),
      w: 0,
      l: 0,
      g: [],
      top: me < 0 || op < 0 || me < op, // üst sıradaki takım saha avantajlı
      mom: 0,
      adapt: null
    };
  }
  return s;
}
const cur = () => {
  const s = S && S.series;
  return s && s.season === S.season && s.round === S.phase && s.opp === S.playoffOpp ? s : null;
};
const homeAt = (s, i) => {
  const p = PATTERN[s.need] || PATTERN[1];
  return p[Math.min(i, p.length - 1)] ? s.top : !s.top;
};
/** Sıradaki seri maçı iç sahada mı (core.js fixture) */
export function serHome() {
  const s = serEnsure();
  return s ? homeAt(s, s.w + s.l) : true;
}

/* ---- Karar türü sayımı (rakip uyarlaması) ---- */
let tally = {};
Bus.on("match:start", () => (tally = {}));
Bus.on("match:moment", e => {
  if (!e || e.auto || !inPO()) return;
  const c = serCat(e.k);
  if (c) tally[c] = (tally[c] || 0) + 1;
});

/** Seri maçı bitti (src/match.js afterMatchFlow): "cont" seri sürüyor, "done" bitti */
export function serStep(win) {
  const s = serEnsure();
  if (!s) return "done";
  if (s.w >= s.need || s.l >= s.need) return "done";
  s.g.push({ win: !!win, us: (M && M.us) || 0, them: (M && M.them) || 0, home: homeAt(s, s.w + s.l) });
  if (win) s.w++;
  else s.l++;
  s.mom = win ? 1 : -1;
  if (win && s.need > 1) S.moral += 4; // momentum
  if (!win) {
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    s.adapt = top && top[1] >= 2 ? top[0] : null;
  } else s.adapt = null;
  tally = {};
  const done = s.w >= s.need || s.l >= s.need;
  if (s.need > 1) {
    const opp = teamByKey(s.opp);
    news(
      $t(done ? "ser.newsEnd" : "ser.news", {
        a: S.team.short,
        b: (opp && opp.short) || "?",
        w: s.w,
        l: s.l
      })
    );
  }
  return done ? "done" : "cont";
}
/** Seri sonucu (seri yoksa tek maçın sonucu) */
export function serWon(win) {
  const s = cur();
  return s && s.g.length ? s.w >= s.need : win;
}
/** Seri skoru [biz, rakip] (play-off ağacı kaydı için) */
export function serScore() {
  const s = S && S.series && S.series.season === S.season ? S.series : null; // yarı final kaydı faz değiştikten sonra yazılır
  return s && s.need > 1 ? [s.w, s.l] : null;
}
/** Aktif seride kaçıncı maç (0: seri yok ya da ilk maç) — sakatlık riski için */
export const serGameNo = () => {
  const s = cur();
  return s ? s.w + s.l : 0;
};
/** Seri maçları arası: kısa dinlenme, tek eylem hakkı, ana ekran */
export function serNext() {
  S.energy = Math.min(100, S.energy + 16);
  // iki seri maçı arası ~yarım hafta: sakatlık da yarım hafta iyileşir (yoksa tüm seriyi kaçırırdın)
  if (S.injury) {
    S.injury.half = (S.injury.half || 0) + 1;
    if (S.injury.half >= 2) {
      S.injury.half = 0;
      if (late.healTick) late.healTick();
    }
  }
  S.slot = 1; // maç arası tek eylem
  norm();
  save();
  renderMain();
  const s = cur();
  if (s) toast($t("ser.toast", { w: s.w, l: s.l, n: s.w + s.l + 1 }));
}

/* ---- Rakip uyarlaması: kendin oynarken o türün seçenekleri −6 ---- */
export function serAdapt(opts) {
  const s = inPO() ? cur() : null;
  if (!s || !s.adapt || !M || !M.opp || M.opp.key !== s.opp) return opts;
  return opts.map(o =>
    serCat(o.k) === s.adapt ? { ...o, e: o.e - 6, sm: (o.sm || 0) - 6, d: `${o.d} · <b class="bad">${$t("ser.ready")}</b>` } : o
  );
}

/* ---- Atmosfer: deplasmanda tribün baskısı, iç sahada seyirci daha hızlı coşar ---- */
export function serAtmos(ctx) {
  const s = cur();
  if (!s || !M || !ctx || ctx.comp === "nat" || !ctx.opp || ctx.opp.key !== s.opp) return;
  if (ctx.home) M.hypeMul = Math.max(M.hypeMul || 1, 1.3);
  else M.loud = true;
  if (late.addFeed) late.addFeed(`<b>${$t(ctx.home ? "ser.atmHome" : "ser.atmAway", { n: s.w + s.l + 1 })}</b>`);
}

/* ---- Görünüm ---- */
const roundName = s => $t(s.round === "final" ? "ser.final" : "ser.semi");
const bestOf = s => (s.need === 1 ? $t("ser.single") : $t("ser.bo", { n: s.need * 2 - 1 }));
function dots(s) {
  const n = s.need * 2 - 1;
  return Array.from({ length: n }, (_, i) => {
    const g = s.g[i],
      h = homeAt(s, i);
    const bg = g ? (g.win ? "var(--good)" : "var(--bad)") : "transparent";
    return `<span title="${h ? $t("main.home") : $t("main.away")}" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:var(--r-round);border:1.5px solid ${g ? bg : "var(--line2)"};background:${bg};font-size:var(--fs-2xs);font-weight:800;color:${g ? "#fff" : "var(--muted)"}">${h ? $t("ser.h") : $t("ser.a")}</span>`;
  }).join("");
}
/** Maç öncesi (Stadyum → Maç) seri kartı */
export function serPreHTML() {
  const s = serEnsure();
  if (!s) return "";
  const opp = teamByKey(s.opp),
    n = s.w + s.l + 1,
    home = homeAt(s, s.w + s.l);
  const state =
    s.need === 1
      ? $t("ser.elim")
      : s.w === s.l
        ? $t("ser.tied", { w: s.w, l: s.l })
        : s.w > s.l
          ? $t("ser.lead", { w: s.w, l: s.l })
          : $t("ser.trail", { w: s.w, l: s.l });
  const must = s.need > 1 && (s.l === s.need - 1 || s.w === s.need - 1);
  return `<div class="card fm" id="ser-card"><div class="row between"><div class="eyebrow">${roundName(s)} · ${bestOf(s)}</div><span class="pill ${home ? "g" : "l"}">${home ? $t("main.home") : $t("main.away")}</span></div>
   <div class="row between nowrap"><b>${esc(S.team.short)}</b><span class="big-num" id="ser-score">${s.w}–${s.l}</span><b>${esc((opp && opp.short) || "?")}</b></div>
   <div class="row" style="gap:var(--sp-1h);justify-content:center">${dots(s)}</div>
   <div class="small">${state}${s.need > 1 ? ` · ${$t("ser.game", { n })}` : ""}${must ? ` · <b class="warn">${s.l === s.need - 1 && s.w === s.need - 1 ? $t("ser.decider") : s.l === s.need - 1 ? $t("ser.must") : $t("ser.close")}</b>` : ""}</div>
   ${s.mom ? `<div class="small ${s.mom > 0 ? "good" : "bad"}">${s.mom > 0 ? $t("ser.momUs") : $t("ser.momThem")}</div>` : ""}
   ${s.adapt ? `<div class="small warn">${$t("ser.adapt", { k: $t(`ser.cat.${s.adapt}`) })}</div>` : ""}
   <div class="small muted">${home ? $t("ser.homeD") : $t("ser.awayD")}</div></div>`;
}
/** Ana ekranda sıradaki maç kartının altına seri satırı */
export function serMainHTML() {
  const s = serEnsure();
  if (!s || s.need === 1) return "";
  return `<div class="small" id="ser-main" style="text-align:center;font-weight:700">${$t("ser.main", { r: roundName(s), w: s.w, l: s.l, bo: bestOf(s), n: s.w + s.l + 1 })}</div>`;
}
/** Lig merkezi → Play-off: süren serinin maçları */
export function serListHTML() {
  const s = cur();
  if (!s || !s.g.length || s.need === 1) return "";
  return `<div class="card" style="padding:var(--sp-2) var(--sp-2h)"><div class="eyebrow">${roundName(s)} · ${s.w}–${s.l}</div>${s.g
    .map(
      (g, i) =>
        `<div class="row between small"><span>${$t("ser.game", { n: i + 1 })} · ${g.home ? $t("main.home") : $t("main.away")}</span><b class="${g.win ? "good" : "bad"}">${g.us}–${g.them}</b></div>`
    )
    .join("")}</div>`;
}
