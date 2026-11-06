/* ================= MAÇ HİSSİ: RAKİP KOÇ KİŞİLİĞİ, KRİTİK AN TEKRARI, YORGUNLUK HALKASI =================
   1) Rakip koç kişiliği: her rakibin takım anahtarından (hash) kararlı bir oyun tarzı var:
      pres (yüksek tempo, iki taraf da daha çok top kaybı), yavaş (uzun hücum, düşük skor),
      üçlükçü (çok üçlük, aynı beklenen sayı ama yüksek varyans), içeri (pota altı, az üçlük, ribaund),
      dengeli. Arka plan hücumlarında etkiler skor farkı için simetriktir (beklenen etki ~0; tempo yalnız
      hücum sayısını değiştirir). Kendin oynarken karar anlarında küçük farklar (preste pas riskli,
      üçlükçüye karşı şutörü kapatmak önemli). Maç öncesi kartta ve molada "Koç önerisi" olarak görünür.
   2) Kritik an: kendin oynadığın maçta son 2 dakikanın en büyük skor etkili hücumu (yoksa senin son sayın)
      kaydedilir; maç raporunda kart + "Tekrar izle" ile küçük sahada yeniden oynatılır. Simüle maçta kayıt yok.
   3) Yorgunluk halkası: sahadaki noktaların çevresinde enerji halkası (sen: enerji + kesintisiz süre,
      takım arkadaşları: çeyrek içindeki süreden tahmin). Kenardayken "dinleniyor" göstergesi.
      Düşük grafik ayarında yalnızca senin halkan, düz renkte. */
import { t as $t } from "./i18n/index.js";
import { $, clamp, hash, pick } from "./data.js";
import { S } from "./core.js";
import { M } from "./match.js";
import { late } from "./late.js";

/* ---- 1) Rakip oyun tarzı ---- */
export const OS_STYLES = ["pres", "yavas", "ucluk", "iceri", "denge"];
// pU/pT: bizim / rakibin hücum isabet çarpanı, three: rakibin üçlük oranı, tempo: hücum süresi çarpanı
// üçlükçü ve içeri: beklenen sayı korunur (0.32 → 0.46 üçlükte 2.32/2.46 ≈ 0.943; 0.20'de 2.32/2.20 ≈ 1.055)
const OS_FX = {
  pres: { pU: 0.96, pT: 0.96, three: 0.32, tempo: 0.85 },
  yavas: { pU: 1, pT: 1, three: 0.32, tempo: 1.2 },
  ucluk: { pU: 1, pT: 0.943, three: 0.46, tempo: 1 },
  iceri: { pU: 1, pT: 1.055, three: 0.2, tempo: 1.05 },
  denge: { pU: 1, pT: 1, three: 0.32, tempo: 1 }
};
/** Takımın kararlı oyun tarzı */
export const osStyleOf = team => (team ? OS_STYLES[hash(`os:${team.key || team.short || team.name || ""}`) % 5] : "denge");
/** Bu maçtaki rakibin tarzı (milli maçta dengeli) */
export function osStyle() {
  if (!M || !M.opp) return "denge";
  if (!M.ostyle) M.ostyle = osStyleOf(M.opp);
  return M.ostyle;
}
const fx = () => OS_FX[osStyle()] || OS_FX.denge;
/** simPossession: isabet çarpanı */
export const osPossMul = us => (us ? fx().pU : fx().pT);
/** simPossession: sayı üçlük mü (rakip tarzına göre) */
export const osThree = us => (us ? 0.32 : fx().three);
/** hücum süresi (sn) */
export const osDur = d => Math.max(8, Math.round(d * fx().tempo));
// karar anı etkisi (yalnız kendin oynarken): küçük, iki yönlü
const PASS = ["kick", "lob", "pnr", "fb_pass", "duo"],
  DRIVE = ["drive", "break", "fb_finish", "dunk"],
  OUT = ["pull", "catch", "wing", "corner", "top3", "step", "pop", "mid"];
export function osMomentMod(k, ty) {
  if (!M || !M.live) return 0;
  let m = 0;
  const s = osStyle();
  if (ty !== "def") {
    if (s === "pres") m += PASS.includes(k) ? -4 : DRIVE.includes(k) ? 3 : 0;
    if (s === "yavas") m += OUT.includes(k) ? -2 : PASS.includes(k) ? 2 : 0;
  } else {
    if (s === "ucluk") m += ["safe", "steal"].includes(k) ? 3 : k === "block" ? -4 : 0;
    if (s === "iceri") m += ["charge", "rim"].includes(k) ? 3 : k === "steal" ? -3 : 0;
    if (s === "pres") m += k === "steal" ? 2 : k === "safe" ? -2 : 0;
  }
  // mola seti "son şut senin": küçük isabet bonusu
  if (M.toLastOn && ty !== "def") m += 5;
  return m;
}
/** Savunma senaryosunda üçlükçü rakip daha çok şutörü boşa çıkarır */
export function osScenario(scn) {
  if (scn && !scn.us && osStyle() === "ucluk" && Math.random() < 0.4) scn.drive = false;
  if (scn && !scn.us && osStyle() === "iceri" && Math.random() < 0.4) scn.drive = true;
  return scn;
}
/** Molada koç önerisi */
export function osRecommend() {
  if (M && M.oppRun >= 3) return "stop";
  return { pres: "pnr", yavas: "last", ucluk: "stop", iceri: "zone", denge: "pnr" }[osStyle()] || "pnr";
}
/** Maç öncesi kart satırı */
export function osPreHTML() {
  if (!M || !M.opp) return "";
  const s = osStyle();
  return `<div class="card fm" id="os-pre"><div class="eyebrow">${$t("os.pre")}</div><div class="row between nowrap"><b>${$t(`os.s.${s}`)}</b><span class="pill">${$t("os.coach")}</span></div><div class="small muted">${$t(`os.d.${s}`)}</div><div class="small"><b>${$t("os.tip")}</b> ${$t(`os.k.${s}`)}</div></div>`;
}

/* ---- 2) Kritik an ---- */
/** Her hücumdan sonra (kendin oynarken): {us, before, pts0, left, ot} */
export function mfTrack(o) {
  if (!M || window.__SIM || M.auto) return;
  const dU = M.us - o.before[0],
    dT = M.them - o.before[1];
  if (dU <= 0 && dT <= 0) return;
  const mine = M.pts > o.pts0,
    scorer = dU > 0;
  const rec = {
    us: scorer,
    pts: scorer ? dU : dT,
    mine: mine && scorer,
    q: o.ot ? 0 : M.q,
    clock: M.clock,
    a: M.us,
    b: M.them,
    zone: mine && M.mfScn && M.mfScn.us ? M.mfScn.zone : null
  };
  if (rec.mine) M.mfMine = rec;
  if (o.left <= 120) {
    const d0 = o.before[0] - o.before[1],
      d1 = M.us - M.them;
    const swing = Math.sign(d0) !== Math.sign(d1) ? (d1 === 0 ? 2 : 3) : 0;
    const sc = rec.pts + swing + (Math.abs(d0) <= 5 ? 1 : 0) + (rec.mine ? 0.5 : 0);
    if (!M.mfKey || sc >= M.mfKey.sc) M.mfKey = { ...rec, sc };
  }
}
const mfPick = () => (M && !M.auto ? M.mfKey || M.mfMine || null : null);
/** Maç raporuna "Kritik an" kartı */
export function mfKeyHTML() {
  const k = mfPick();
  if (!k) return "";
  const who = k.mine ? S.last : k.us ? S.team.short : M.opp.short;
  const when = k.q ? $t("mf.when", { q: k.q, c: k.clock }) : $t("mf.whenOt", { c: k.clock });
  return `<div class="card fm" id="mf-key"><div class="row between nowrap"><div class="eyebrow">${$t("mf.title")}</div><span class="small muted">${when}</span></div>
   <div><b>${$t(k.pts >= 3 ? "mf.three" : k.pts === 1 ? "mf.ft" : "mf.two", { n: who })}</b> <span class="muted">${$t("mf.score", { a: k.a, b: k.b })}</span></div>
   <svg id="mf-svg" viewBox="0 0 360 196" style="width:100%;height:auto;display:block;border-radius:8px">${late.courtFloorSVG()}<g id="mf-p"></g></svg>
   <button class="btn ghost sm" id="mf-replay">${$t("mf.replay")}</button></div>`;
}
const POSS = ["PG", "SG", "SF", "PF", "C"];
let mfTimers = [];
const mfDot = (id, x, y, fill, me) =>
  `<g id="${id}" style="transform:translate(${x}px,${y}px);transition:transform .4s ease">${me ? `<circle r="11" fill="none" stroke="#ffc54d" stroke-width="2.4"/>` : ""}<circle r="7" fill="${fill}" stroke="#141414" stroke-width="1.3"/></g>`;
/** Kritik anı küçük sahada yeniden oynat */
export function mfReplay() {
  const k = mfPick(),
    g = $("#mf-p");
  if (!k || !g) return;
  mfTimers.forEach(clearTimeout);
  mfTimers = [];
  const right = k.us,
    flip = ([x, y]) => (right ? [x, y] : [360 - x, y]),
    hoop = right ? [336, 98] : [24, 98];
  const c1 = S.team.c1,
    c2 = (M.opp && M.opp.c1) || "#4a5568";
  const att = right ? c1 : c2,
    df = right ? c2 : c1;
  const shooter = k.mine ? S.pos : pick(POSS.filter(p => p !== S.pos));
  const pos = {};
  for (const p of POSS) pos[p] = flip(late.courtSlot(p));
  const gd = p => [pos[p][0] + (hoop[0] - pos[p][0]) * 0.25, pos[p][1] + (hoop[1] - pos[p][1]) * 0.25];
  g.innerHTML =
    POSS.map(p => mfDot(`mf-a-${p}`, right ? 190 : 170, 40 + POSS.indexOf(p) * 28, att, right && p === S.pos)).join("") +
    POSS.map(p => mfDot(`mf-d-${p}`, right ? 170 : 190, 40 + POSS.indexOf(p) * 28, df, !right && p === S.pos)).join("") +
    `<g id="mf-ball" style="transform:translate(180px,98px);transition:transform .4s ease"><circle r="4" fill="#ff8a3d" stroke="#141414"/></g>`;
  const mv = late.courtMove;
  const at = (ms, f) => mfTimers.push(setTimeout(f, ms));
  // 1) diziliş
  at(60, () => {
    for (const p of POSS) {
      mv(`mf-a-${p}`, pos[p][0], pos[p][1], 500);
      const [x, y] = gd(p);
      mv(`mf-d-${p}`, x, y, 500);
    }
    mv("mf-ball", pos.PG[0] + 6, pos.PG[1] - 5, 500);
  });
  // 2) şutör yerine koşar, top ona gider
  const z = k.zone
    ? late.courtZone(k.zone)
    : late.courtZone(k.pts >= 3 ? pick(["wing", "corner", "top"]) : pick(["paint", "mid", "post"]));
  const zp = k.pts === 1 ? flip([290, 98]) : flip(z);
  at(700, () => {
    pos[shooter] = zp;
    mv(`mf-a-${shooter}`, zp[0], zp[1], 450);
    const [x, y] = gd(shooter);
    mv(`mf-d-${shooter}`, x, y, 500);
    mv("mf-ball", zp[0] + 6, zp[1] - 5, 450);
  });
  // 3) şut ve file
  at(1350, () => mv("mf-ball", hoop[0], hoop[1], 420));
  at(1800, () => {
    const net = $("#rp-net");
    if (net) {
      net.setAttribute("cx", hoop[0]);
      net.style.transition = "opacity .3s";
      net.style.opacity = 0.8;
      at(450, () => (net.style.opacity = 0));
    }
    late.sfx && late.sfx("netSwish");
  });
}
// rapor açıkken "Tekrar izle" (panel her açıldığında yeniden bağlamaya gerek yok)
if (typeof document !== "undefined")
  document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("#mf-replay");
    if (b) mfReplay();
  });

/* ---- 3) Yorgunluk halkası ---- */
const CIRC = 2 * Math.PI * 13;
function mateEnergy(p) {
  if (!M) return 1;
  const [mm, ss] = String(M.clock || "10:00")
    .split(":")
    .map(Number);
  const frac = clamp((600 - (mm * 60 + ss)) / 600, 0, 1);
  const off = ((hash(`${p}:${M.opp ? M.opp.short : ""}`) % 7) - 3) * 0.02;
  return clamp(0.95 - 0.3 * frac - ((M.q || 1) - 1) * 0.03 + off, 0.3, 1);
}
/** Benim enerjim 0..1 (enerji + kesintisiz süre) */
export const mfMyEnergy = () => clamp(1 - (late.fatigue ? late.fatigue() : 0), 0, 1);
const ringColor = v => (v >= 0.6 ? "#36d38e" : v >= 0.35 ? "#ffc54d" : "#ff5468");
/** Saha noktalarına enerji halkası; kenardayken "dinleniyor" */
export function mfRings(on) {
  const root = $("#crt-p");
  if (!root || !M) return;
  const low = !!(late.SETTINGS && late.SETTINGS.lowfx);
  for (const p of POSS) {
    const g = $(`#o-${p}`);
    if (!g) continue;
    let r = g.querySelector(".mf-er");
    const mine = p === S.pos;
    if (low && !mine) {
      if (r) r.remove();
      continue;
    }
    if (!r) {
      r = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      r.setAttribute("class", "mf-er");
      r.setAttribute("r", mine ? 13 : 10.5);
      r.setAttribute("fill", "none");
      r.setAttribute("transform", "rotate(-90)");
      g.insertBefore(r, g.firstChild);
    }
    const v = mine ? mfMyEnergy() : mateEnergy(p),
      c = mine ? CIRC : 2 * Math.PI * 10.5;
    r.setAttribute("stroke", ringColor(v));
    r.setAttribute("stroke-width", mine ? 2.2 : 1.6);
    r.setAttribute("opacity", mine ? 0.95 : 0.7);
    if (low) r.removeAttribute("stroke-dasharray");
    else r.setAttribute("stroke-dasharray", `${(v * c).toFixed(1)} ${c.toFixed(1)}`);
    r.dataset.v = Math.round(v * 100);
  }
  let t = $("#mf-rest");
  if (!on) {
    if (!t) {
      t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("id", "mf-rest");
      t.setAttribute("x", 180);
      t.setAttribute("y", 190);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "9");
      t.setAttribute("font-weight", "800");
      t.setAttribute("fill", "#fff");
      root.appendChild(t);
    }
    t.textContent = $t("mf.rest", { n: Math.round(mfMyEnergy() * 100) });
  } else if (t) t.remove();
}
