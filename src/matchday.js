/* ================= MAÇ GÜNÜ DOKUNUŞLARI =================
   - Hakem kişiliği: katı / dengeli / rahat. Faul çalma sıklığını ve basket faul şansını değiştirir; maç öncesi görünür.
   - Seyirci: iç sahada heyecan çubuğu dolar (iyi anlar, seriler); dolunca "tribünler ayağa kalktı" → birkaç an +4.
     Gürültülü deplasmanda (güçlü rakip, büyük maç) mini oyunlar biraz zorlaşır (−2).
   - Rakip yıldız düellosu: maç öncesi karşılaştırma kartı; maç boyunca yıldızın sayıları; maç sonunda kim kazandı.
   - Takım arkadaşı kimyası: can dostunla kimya (S.chem) başarılı paslarla artar; yeterince yüksekse ikili kombinasyon
     seçeneği (alley-oop) gelir. Pas güveninin görünür ödülü.
   - Oyun kur: kilit anda kendi setini kur (perdeyi kim koyar, sen nereye koşarsın); sahada oklarla çizilir.
   Kendin oynarken gelen seçenekler (ikili kombinasyon, oyun kur) otomatik/simüle maçlarda yoktur (denge). */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, esc, pick, ri } from "./data.js";
import { S, eff, ovr } from "./core.js";
import { M } from "./match.js";
import { late } from "./late.js";

const REFS = {
  strict: { foul: 1.35, and1: 1.5 },
  normal: { foul: 1, and1: 1 },
  lenient: { foul: 0.7, and1: 0.6 }
};
/** Maç başında (setM sonrası): hakem, seyirci, rakip yıldız, kimya */
export function matchdayStart(ctx, foes, mates) {
  if (!M) return;
  const r = Math.random();
  M.ref = r < 0.3 ? "strict" : r < 0.7 ? "normal" : "lenient";
  M.live = 1;
  M.hype = 0;
  M.hypeOn = 0;
  const opp = ctx.opp;
  M.loud = !ctx.home && (ctx.comp !== "lig" || (opp && opp.str >= S.team.str + 0.04));
  M.star = {
    n: (foes && foes[0]) || "?",
    o: clamp(Math.round((ovr() + ((opp ? opp.str : 1) - S.team.str) * 60 + ri(-3, 6)) * 10) / 10, 15, 99),
    pts: 0
  };
  M.starPts = 0;
  M.mates = mates || [];
  if (late.gradMeet) late.gradMeet(foes || [], M.mates); // akademi mezunu sahada (src/venues.js)
  chemFor(M.mates);
}
export function matchdayEnd() {
  if (!M) return;
  M.live = 0;
  M.effMod = 0;
  M.mmod = 0;
  M.hypeOn = 0;
}
// maç ekranından çıkılırsa (ana ekran) maç bonusu antrenmana taşınmasın
Bus.on("screen:main", () => matchdayEnd());
export const refMul = () => (M && M.live && REFS[M.ref] ? REFS[M.ref].foul : 1);
export const refAnd1 = () => (M && M.live && REFS[M.ref] ? REFS[M.ref].and1 : 1);

/* ---- Seyirci ---- */
/** Efektif değere seyirci etkisi (yalnız maç sırasında) */
export const crowdBoost = () => (!M || !M.live || !document.getElementById("mstat") ? 0 : M.home ? (M.hypeOn > 0 ? 4 : 0) : M.loud ? -2 : 0);
function hypeAdd(v) {
  if (!M || !M.home || M.hypeOn > 0) return;
  M.hype = clamp((M.hype || 0) + v, 0, 100);
  if (M.hype >= 100) {
    M.hypeOn = 3;
    M.hype = 0;
    late.addFeed && late.addFeed(`<b class="gold">${$t("md.hypeOn")}</b>`);
    late.crowdSwell && late.crowdSwell(2.5);
  }
}
/** Bizim sayı serisi (arka plan hücumları) */
export function crowdTick(usScored) {
  if (!M || !M.live) return;
  if (usScored) hypeAdd(5);
  else if (M.home) M.hype = Math.max(0, (M.hype || 0) - 1);
}
export function crowdLine() {
  if (!M || !M.live) return "";
  if (M.home)
    return `<div class="row nowrap" style="gap:6px;align-items:center"><span class="small muted">${$t("md.crowd")}</span><div class="bar" style="flex:1"><i style="width:${M.hypeOn > 0 ? 100 : M.hype || 0}%;background:${M.hypeOn > 0 ? "var(--gold)" : "var(--hot)"}"></i></div>${M.hypeOn > 0 ? `<b class="small gold">+4</b>` : ""}</div>`;
  return M.loud ? `<div class="small warn">${$t("md.loud")}</div>` : "";
}

/* ---- Rakip yıldız ---- */
export function starScore(pts) {
  if (M && M.star) M.star.pts += pts;
}
export const isStar = n => !!(M && M.star && M.star.n === n);

/* ---- Kimya ---- */
function chemFor(mates) {
  const c = (S.chem = S.chem && typeof S.chem === "object" ? S.chem : {});
  if (!c.n || !mates.includes(c.n)) {
    c.n = mates[0] || "";
    c.v = 10;
    c.combos = c.combos || 0;
  }
  return c;
}
export const chemVal = () => (S && S.chem ? S.chem.v || 0 : 0);
export function chemAdd(v) {
  if (!S || !S.chem || !S.chem.n) return;
  S.chem.v = clamp((S.chem.v || 0) + v, 0, 100);
}
const PASSK = ["kick", "lob", "pnr", "hand", "dish", "skip", "outlet", "post_pass"];

/* ---- Maç öncesi kart (mod seçimi ekranında) ---- */
export function preMatchHTML() {
  if (!M || !M.star) return "";
  const me = ovr(),
    st = M.star;
  const bar = (v, c) => `<div class="bar"><i style="width:${v}%;background:${c}"></i></div>`;
  return `<div class="card fm"><div class="eyebrow">${$t("md.pre")}</div>
   <div class="grid2" style="gap:10px"><div><div class="small muted">${$t("md.you")}</div><b>${esc(S.last)}</b>${bar(me, "var(--good)")}<b class="big-num" style="font-size:1.6rem">${(+me).toFixed(1)}</b></div>
   <div style="text-align:right"><div class="small muted">${$t("md.star", { t: esc(M.opp.short) })}</div><b>${esc(st.n)}</b>${bar(st.o, "var(--bad)")}<b class="big-num" style="font-size:1.6rem">${(+st.o).toFixed(1)}</b></div></div>
   <div class="kv"><span>${$t("md.ref")}</span><b>${$t(`md.ref.${M.ref}`)}</b><span class="small muted" style="grid-column:1/-1;margin-top:-4px">${$t(`md.ref.${M.ref}.d`)}</span>
   <span>${$t("md.atm")}</span><b class="${M.home ? "good" : M.loud ? "warn" : ""}">${M.home ? $t("md.atmHome") : M.loud ? $t("md.atmLoud") : $t("md.atmAway")}</b>
   ${S.chem && S.chem.n ? `<span>${$t("md.chem", { n: esc(S.chem.n) })}</span><b>${Math.round(S.chem.v)}/100</b>` : ""}</div></div>`;
}
/** Maç sonu: düello sonucu ve kimya */
export function duelHTML() {
  if (!M || !M.star) return "";
  const won = M.pts > M.star.pts,
    tie = M.pts === M.star.pts;
  return `<div class="card fm"><div class="eyebrow">${$t("md.duel")}</div><div class="row between nowrap"><div><b>${esc(S.last)}</b> <span class="big-num" style="font-size:1.5rem">${M.pts}</span></div><b class="${won ? "good" : tie ? "" : "bad"}">${won ? $t("md.won") : tie ? $t("md.tie") : $t("md.lost")}</b><div style="text-align:right"><span class="big-num" style="font-size:1.5rem">${M.star.pts}</span> <b>${esc(M.star.n)}</b></div></div>
   ${S.chem && S.chem.n ? `<div class="small muted">${$t("md.chemEnd", { n: esc(S.chem.n), v: Math.round(S.chem.v), c: M.combo || 0 })}</div>` : ""}</div>`;
}
/** Maç sonu ödülleri (finishMatch içinden, bir kez) */
export function duelSettle() {
  if (!M || !M.star || M.duelDone) return;
  M.duelDone = 1;
  M.duelWon = M.pts > M.star.pts;
  if (M.duelWon && !M.auto) {
    S.followers += Math.round(15 * (M.star.o / 10)); // küçük ve sabit: bileşik büyümesin
    S.rel.taraf += 1;
  }
}

/* ---- Ek hücum seçenekleri: ikili kombinasyon ve oyun kur ---- */
export function extraOffOpts(opts, clutch, auto) {
  if (auto || !M || !S.chem) return opts;
  const out = opts.slice();
  if (S.chem.n && S.chem.v >= 30 && Math.random() < 0.35)
    out.push({
      k: "duo",
      t: $t("md.duo", { n: esc(S.chem.n) }),
      d: `${$t("md.duoD")} · ${$t("md.chemShort")} ${Math.round(S.chem.v)}`,
      e: eff("pas") + duoMod()
    });
  if (clutch && !M.setUsed)
    out.push({ k: "set", t: $t("md.set"), d: $t("md.setD"), e: (eff("sut") + eff("hiz")) / 2 + 4 });
  return out;
}
export const duoMod = () => Math.round(chemVal() / 8);
// koşu yolları: tam sahadaki bölge noktaları (src/court.js courtZone)
const ROUTES = { corner: ["corner", "corner"], top: ["top3", "top"], paint: ["lay", "paint"], pop: ["mid", "mid"] };
const BIG = ["C", "PF"];
/** Oyun kur ekranı: perdeci + koşu yolu; sahada oklar. {pk, mod} döner */
export function setPlay(el) {
  M.setUsed = 1;
  const cap = $("#crt-cap");
  if (cap) cap.textContent = "";
  const pos = ["PG", "SG", "SF", "PF", "C"].filter(p => p !== S.pos),
    names = M.mates.length ? M.mates : pos;
  let scr = null,
    rt = null;
  const draw = () => {
    const a = $("#arrows");
    if (!a) return;
    const me = late.courtSlot(S.pos);
    late.courtMove(`o-${S.pos}`, me[0], me[1]);
    late.courtMove("ball", me[0] + 7, me[1] - 6);
    let h = "";
    if (scr) {
      const sp = [me[0] + 14, me[1] + (me[1] < 98 ? 14 : -14)];
      late.courtMove(`o-${scr}`, sp[0], sp[1]); // perdeci yanına gelir
      const o = late.courtSlot(scr);
      h += `<line x1="${o[0]}" y1="${o[1]}" x2="${sp[0]}" y2="${sp[1]}" stroke="#ffc54d" stroke-width="2.5" stroke-dasharray="5 3"/><rect x="${sp[0] - 7}" y="${sp[1] - 13}" width="14" height="4" fill="#ffc54d" stroke="#141414"/>`;
    }
    if (rt) {
      const [x, y] = late.courtZone(ROUTES[rt][1]);
      h += `<path d="M${me[0]} ${me[1]} Q${(me[0] + x) / 2} ${(me[1] + y) / 2 + (y < 98 ? 18 : -18)} ${x} ${y}" fill="none" stroke="#fff" stroke-width="2.4" marker-end="url(#ah)"/><circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`;
    }
    a.innerHTML = `<defs><marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#fff"/></marker></defs>${h}`;
  };
  return new Promise(res => {
    const render = () => {
      el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("md.set")}</div><h2>${$t("md.setH")}</h2>
       <div class="eyebrow">${$t("md.screener")}</div><div class="opts" id="sp-s">${pos.map((p, i) => `<button class="opt ${scr === p ? "on" : ""}" data-v="${p}">${p} · ${esc(names[i % names.length])}</button>`).join("")}</div>
       <div class="eyebrow">${$t("md.route")}</div><div class="opts" id="sp-r">${Object.keys(ROUTES).map(k => `<button class="opt ${rt === k ? "on" : ""}" data-v="${k}">${$t(`md.rt.${k}`)}</button>`).join("")}</div>
       <p class="small muted">${$t("md.setHint")}</p><button class="btn pri" id="sp-go" ${scr && rt ? "" : "disabled"}>${$t("md.setGo")}</button></div>`;
      $$("#sp-s [data-v]").forEach(b => (b.onclick = () => ((scr = b.dataset.v), draw(), render())));
      $$("#sp-r [data-v]").forEach(b => (b.onclick = () => ((rt = b.dataset.v), draw(), render())));
      const go = $("#sp-go");
      if (go)
        go.onclick = () => {
          // uyum: uzun perdeci boyalı alan ve tepe için, kısa perdeci köşe ve orta mesafe için iyi
          const big = BIG.includes(scr),
            fit = big ? ["paint", "top"].includes(rt) : ["corner", "pop"].includes(rt);
          res({ pk: ROUTES[rt][0], mod: fit ? 6 : -2, fit });
        };
    };
    render();
    draw();
  });
}
/** An sonrası: kimya, kombinasyon, set, seyirci */
export function afterMoment(k, pk, res) {
  if (!M) return;
  if (k === "set" && res.good) M.setGood = (M.setGood || 0) + 1;
  if (k === "duo") {
    if (res.good) {
      M.combo = (M.combo || 0) + 1;
      S.chem.combos = (S.chem.combos || 0) + 1;
      chemAdd(3);
    } else chemAdd(-1);
  } else if (res.good && (PASSK.includes(pk) || k === "pass")) chemAdd(1.5);
  if (res.good) hypeAdd(12);
  if (M.hypeOn > 0) M.hypeOn--;
}
