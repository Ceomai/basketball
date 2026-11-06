/* ================= SAHA GÖRÜNÜMÜ, POZİSYONA GÖRE KARAR, İKİNCİ KARAR, MAÇ RAPORU =================
   1) Maç ekranında yatay tam saha: biz sağa, rakip sola hücum eder. Her hücum geçiş → set → şut olarak düzenli akar;
      parlak renktesin, top sahada. Kenardayken takımın oynar, sen "kenarda" yazısıyla izlersin.
   2) Karar anı senaryosu: sahada nerede olduğun (köşe, kanat, tepe, orta mesafe, post), savunmacının mesafesi
      (boş / normal / sıkı), pota altında yardım (pivot) ve boşta takım arkadaşı. Saha donar, durum çizilir.
      Seçenekler bu duruma göre değişir: konumuna uyan seçenek mutlaka gelir; "Boşsun!", "Sıkı savunma",
      "Pota altı kalabalık", "Boşta arkadaş" etiketleri ve başarı şansı buna göre ayarlanır.
   3) İkinci karar (kendin oynarken): penetrede pivot önüne çıkarsa → pas ver / ikiliğe kalk / spin ile geç /
      turnikeyi zorla. Şut seçince savunmacı üstüne gelirse → yine de at / pump fake ile gir / step-back / pas.
      Seçimin mini oyunun zorluğunu ya da türünü değiştirir; sonuç yeteneğine ve pozisyona bağlıdır.
   4) Football Manager tarzı maç raporu: isabetler (saha içi, üçlük, serbest atış), çeyrek skorları, skor akışı
      grafiği, katkılar. Maç sırasında canlı isabet satırı. */
import { t as $t } from "./i18n/index.js";
import { $, esc, pick, statName } from "./data.js";
import { mgRebound, mgShoot, setMgCtx } from "./games.js";
import { S, eff } from "./core.js";
import { M } from "./match.js";
import { courtShoe } from "./custom.js";
import { late } from "./late.js";

// Yatay tam saha (28 × 15 m): biz sağdaki potaya, rakip soldakine hücum eder.
const W = 360,
  H = 196,
  HR = { x: 336, y: 98 }, // sağ pota (bizim hücum)
  HL = { x: 24, y: 98 }; // sol pota (rakibin hücumu)
const HOOP = HR;
// hücum dizilişi (sağa hücum koordinatları): PG tepe, SG üst kanat, SF alt kanat, PF dirsek, C alçak post
const SLOT = { PG: [252, 98], SG: [284, 34], SF: [284, 162], PF: [292, 70], C: [318, 128] };
const ZONE_XY = { corner: [334, 20], wing: [278, 40], top: [254, 98], mid: [286, 126], paint: [316, 98], post: [318, 128] };
// alan savunması (2-3) noktaları, sağ potayı savunurken
const ZONE_D = { PG: [270, 76], SG: [270, 120], SF: [306, 40], PF: [306, 156], C: [322, 98] };
const POSS = ["PG", "SG", "SF", "PF", "C"];
let C = null; // { c1, c2, flow, side, timers }
const jit = (v, a = 10) => v + (Math.random() - 0.5) * a;
// sağa hücum koordinatını gerçek yöne çevir
const side = (pt, right) => (right ? pt : [W - pt[0], pt[1]]);

export function courtHTML() {
  return `<div class="card" id="mcourt" style="padding:6px"><svg id="crt" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;border-radius:10px">${floor()}<g id="crt-p"></g></svg><div class="small muted" id="crt-cap" style="text-align:center;min-height:16px"></div></div>`;
}
function halfLines(right) {
  const ln = "#fff",
    bx = right ? W - 4 : 4,
    dir = right ? -1 : 1,
    hx = right ? HR.x : HL.x,
    paintX = bx + dir * 73,
    tc = right ? S && S.team ? S.team.c1 : "#1d428a" : "#4a5568";
  // üç sayı çizgisi: köşelerde düz, sonra yay (6,75 m ≈ 85 px)
  const cy1 = 15,
    cy2 = H - 15,
    sx = bx + dir * 38;
  return `<rect x="${Math.min(bx, paintX)}" y="67" width="73" height="62" fill="${tc}" fill-opacity=".3" stroke="${ln}" stroke-width="1.6"/>
   <circle cx="${paintX}" cy="98" r="22" fill="none" stroke="${ln}" stroke-width="1.6"/>
   <path d="M${bx} ${cy1} H${sx} A85 85 0 0 ${right ? 0 : 1} ${sx} ${cy2} H${bx}" fill="none" stroke="${ln}" stroke-width="1.6"/>
   <rect x="${right ? hx + 6 : hx - 9}" y="88" width="3" height="20" fill="#333"/><circle cx="${hx}" cy="98" r="6" fill="none" stroke="#ff6b2b" stroke-width="2.4"/>`;
}
function floor() {
  return `<rect width="${W}" height="${H}" fill="#c98f53"/>${Array.from({ length: 15 }, (_, i) => `<rect x="${i * 24}" y="0" width="1" height="${H}" fill="#b07a44" opacity=".35"/>`).join("")}
  <rect x="4" y="4" width="${W - 8}" height="${H - 8}" fill="none" stroke="#fff" stroke-width="2"/>
  <line x1="${W / 2}" y1="4" x2="${W / 2}" y2="${H - 4}" stroke="#fff" stroke-width="1.6"/><circle cx="${W / 2}" cy="98" r="22" fill="none" stroke="#fff" stroke-width="1.6"/>
  ${halfLines(true)}${halfLines(false)}
  <circle id="net-r" cx="${HR.x}" cy="98" r="9" fill="#ffc54d" opacity="0"/>`;
}
/** Kritik an tekrarı için saha zemini (file id'si ayrı; src/matchfeel.js) */
export const courtFloorSVG = () => floor().replace('id="net-r"', 'id="rp-net"');
const dot = (id, x, y, fill, ring, label) =>
  `<g id="${id}" style="transform:translate(${x}px,${y}px);transition:transform .45s ease">${ring ? `<circle r="11" fill="none" stroke="#ffc54d" stroke-width="2.6"/>` : ""}${ring ? courtShoe() : ""}<circle r="7.5" fill="${fill}" stroke="${id[0] === "d" ? "#ffffff" : "#141414"}" stroke-width="${id[0] === "d" ? 1.8 : 1.4}" ${id[0] === "d" ? 'stroke-dasharray="3 2"' : ""}/><text y="3" text-anchor="middle" font-size="7" font-weight="800" font-family="Barlow Condensed" fill="#fff">${label}</text></g>`;
/** Maç başında: iki takım orta sahada */
export function courtStart(opp) {
  clearTimers();
  C = { c1: S.team.c1, c2: opp ? opp.c1 : "#4a5568", flow: [], right: null, timers: [] };
  const g = $("#crt-p");
  if (!g) return;
  g.innerHTML =
    POSS.map((p, i) => dot(`o-${p}`, W / 2 + 12 + (i % 3) * 14, 50 + i * 24, C.c1, p === S.pos, p === S.pos ? "★" : p)).join("") +
    POSS.map((p, i) => dot(`d-${p}`, W / 2 - 12 - (i % 3) * 14, 50 + i * 24, C.c2, false, "")).join("") +
    `<g id="ball" style="transform:translate(${W / 2}px,98px);transition:transform .45s ease"><circle r="4" fill="#ff8a3d" stroke="#141414" stroke-width="1"/></g><g id="arrows"></g>`;
}
/** Dizilişteki hücum noktası (oyun kur ekranı için; sağa hücum) */
export const courtSlot = p => SLOT[p] || SLOT.PG;
export const courtZone = z => ZONE_XY[z] || ZONE_XY.top;
export const courtMove = (id, x, y, ms) => mv(id, x, y, ms);
function mv(id, x, y, ms) {
  const e = $(`#${id}`);
  if (!e) return;
  if (ms != null) e.style.transition = `transform ${Math.max(0, ms)}ms ease-in-out`;
  e.style.transform = `translate(${Math.max(6, Math.min(W - 6, x))}px,${Math.max(6, Math.min(H - 6, y))}px)`;
}
function clearTimers() {
  if (C && C.timers) C.timers.forEach(clearTimeout);
  if (C) C.timers = [];
}
const later = (ms, f) => C && C.timers.push(setTimeout(f, ms));
// savunmacı: adamıyla pota arasında (adam adama) ya da alan noktası
function guardOf(p, at, right, zone) {
  const h = right ? HR : HL;
  if (zone) return side(ZONE_D[p], right);
  return [at[0] + (h.x - at[0]) * 0.24, at[1] + (h.y - at[1]) * 0.24];
}
// hücum setleri: bir adım hareket + topun kimde olduğu (sağa hücum koordinatları)
const SETS = [
  { id: "swing", step: { SG: [276, 30], SF: [334, 176] }, ball: "SG" },
  { id: "pnr", step: { PF: [258, 84], PG: [282, 112] }, ball: "PG", roll: { PF: [316, 92] } },
  { id: "post", step: { SG: [334, 22], C: [314, 120] }, ball: "C" },
  { id: "cut", step: { SF: [314, 104], SG: [288, 30] }, ball: "SF" },
  { id: "hand", step: { SG: [262, 70], PG: [286, 44] }, ball: "SG" }
];
/**
 * Bir hücumu sahada oynat: geçiş → set → sonuç. dur: bu hücuma ayrılan süre (ms); 0 ise anında yerleşir.
 * r: { us, scored, three, mine } (mine: sayıyı sen attın)
 */
export function courtPlay(r, on, dur) {
  if (!C || !$("#crt-p")) return;
  clearTimers();
  const right = r.us,
    att = right ? "o" : "d",
    def = right ? "d" : "o",
    zone = M && M.dz === "zone" && right;
  const set = pick(SETS),
    pos = {};
  for (const p of POSS) pos[p] = side([jit(SLOT[p][0]), jit(SLOT[p][1])], right);
  const t0 = dur ? Math.round(dur * 0.38) : 0,
    t1 = dur ? Math.round(dur * 0.3) : 0,
    t2 = dur ? Math.round(dur * 0.32) : 0;
  // 1) geçiş: dizilişe koş, top oyun kurucuda
  for (const p of POSS) {
    mv(`${att}-${p}`, pos[p][0], pos[p][1], t0);
    const g = guardOf(p, pos[p], right, zone);
    mv(`${def}-${p}`, g[0], g[1], t0);
  }
  mv("ball", pos.PG[0] + 6, pos.PG[1] - 5, t0);
  const me = $(`#o-${S.pos}`);
  if (me) me.style.opacity = on ? 1 : 0.35;
  late.mfRings(on); // enerji halkaları (src/matchfeel.js)
  const cap = $("#crt-cap");
  if (cap) cap.textContent = on ? (right ? $t("ct.attack") : $t("ct.defend")) : $t("ct.bench");
  const a = $("#arrows");
  if (a) a.innerHTML = "";
  // 2) set: oyuncular düzenli kayar, top pasla dolaşır
  const step = () => {
    if (on && dur && Math.random() < 0.35) late.sfx && late.sfx("squeak");
    for (const [p, xy] of Object.entries(set.step)) {
      pos[p] = side(xy, right);
      mv(`${att}-${p}`, pos[p][0], pos[p][1], t1);
      const g = guardOf(p, pos[p], right, zone);
      mv(`${def}-${p}`, g[0], g[1], t1);
    }
    mv("ball", pos[set.ball][0] + 6, pos[set.ball][1] - 5, t1);
  };
  // 3) sonuç: şut potaya; girerse file parlar, kaçarsa ribaund
  const shot = () => {
    if (set.roll)
      for (const [p, xy] of Object.entries(set.roll)) {
        pos[p] = side(xy, right);
        mv(`${att}-${p}`, pos[p][0], pos[p][1], t2);
      }
    const h = right ? HR : HL,
      shooter = r.mine ? S.pos : set.ball;
    // şutörün savunmacısı üstüne çıkar
    const sp = pos[shooter];
    mv(`${def}-${shooter}`, sp[0] + (h.x - sp[0]) * 0.12, sp[1] + (h.y - sp[1]) * 0.12, t2 * 0.5);
    mv("ball", h.x, h.y, t2 * 0.6);
    later(t2 * 0.6, () => {
      if (r.scored) {
        if (on) late.sfx && late.sfx("netSwish");
        const n = right ? $("#net-r") : null;
        if (n) {
          n.style.transition = "opacity .3s";
          n.style.opacity = 0.7;
          later(300, () => (n.style.opacity = 0));
        }
      } else {
        // ribaund: genelde savunma alır
        const rb = Math.random() < 0.72 ? def : att,
          who = rb === def ? "C" : pick(["C", "PF"]);
        mv("ball", h.x + (right ? -22 : 22), h.y + (Math.random() - 0.5) * 30, t2 * 0.4);
        const e = $(`#${rb}-${who}`);
        if (e) mv(`${rb}-${who}`, h.x + (right ? -24 : 24), h.y + (Math.random() - 0.5) * 26, t2 * 0.4);
      }
    });
  };
  C.flow.push(M ? M.us - M.them : 0);
  if (!dur) {
    step();
    shot();
    return;
  }
  later(t0, step);
  later(t0 + t1, shot);
}
export const courtTick = (ourBall, on) => courtPlay({ us: ourBall, scored: false }, on, 0);

/* ---- Karar anı senaryosu ---- */
const THREE = ["pull", "catch", "wing", "corner", "top3"],
  TWO = ["step", "pop", "mid", "float"],
  FIN = ["drive", "break", "lay", "post", "dunk", "putback"],
  PASSK = ["pnr", "kick", "lob"];
const ZONE_BY_POS = {
  PG: ["top", "top", "wing", "mid"],
  SG: ["wing", "corner", "top", "mid"],
  SF: ["wing", "corner", "mid", "paint"],
  PF: ["post", "mid", "paint", "corner"],
  C: ["post", "paint", "paint", "mid"]
};
const FAV = {
  corner: ["corner", "catch"],
  wing: ["wing", "catch", "pull"],
  top: ["top3", "pull", "pnr"],
  mid: ["mid", "step", "pop", "float"],
  paint: ["lay", "dunk", "putback", "float"],
  post: ["post", "dunk"]
};
export function courtScenario(us) {
  const r = Math.random();
  const s = {
    us,
    zone: pick(ZONE_BY_POS[S.pos] || ZONE_BY_POS.SF),
    guard: r < 0.25 ? "open" : r < 0.75 ? "normal" : "tight",
    help: Math.random() < 0.35,
    mate: Math.random() < 0.4,
    drive: !us && Math.random() < 0.5 // savunmada: rakip penetre mi ediyor, şutör mü boşta
  };
  return s;
}
/** Seçeneklere senaryo etkisi ve etiketleri */
export function applyScenario(opts, s) {
  return opts.map(o => {
    const base = o.e;
    let e = o.e,
      tags = [];
    if (s.us) {
      const sh = THREE.includes(o.k) || TWO.includes(o.k);
      if (sh && s.guard === "open") ((e += 7), tags.push($t("ct.open")));
      if (sh && s.guard === "tight") ((e -= 5), tags.push($t("ct.tight")));
      if (FIN.includes(o.k) && s.guard === "tight") e += 3;
      if (FIN.includes(o.k) && s.help) ((e -= 7), tags.push($t("ct.crowd")));
      if (o.k === "float" && s.help) e += 5;
      if (PASSK.includes(o.k) && s.mate) ((e += 6), tags.push($t("ct.mate")));
      if ((FAV[s.zone] || []).includes(o.k)) ((e += 2), (o = { ...o, fav: true }));
    } else {
      if (s.drive && ["block", "charge", "rim", "safe"].includes(o.k)) ((e += 4), tags.push($t("ct.driving")));
      if (!s.drive && ["steal", "safe"].includes(o.k)) ((e += 3), tags.push($t("ct.shooter")));
      if (!s.drive && o.k === "block") e -= 3;
    }
    return { ...o, e, sm: e - base, d: tags.length ? `${o.d} · <b>${tags.join(" · ")}</b>` : o.d };
  });
}
/** Saha: karar anında dur, durumu çiz (tam saha; hücumda sağ yarı, savunmada sol yarı) */
export function courtFreeze(s) {
  if (!C || !$("#crt-p")) return;
  clearTimers();
  const a = $("#arrows"),
    right = s.us,
    att = right ? "o" : "d",
    def = right ? "d" : "o",
    h = right ? HR : HL,
    T = 350;
  // herkes dizilişte; savunma adamını tutar
  const pos = {};
  for (const p of POSS) pos[p] = side(SLOT[p], right);
  if (s.us) pos[S.pos] = ZONE_XY[s.zone] || ZONE_XY.wing;
  for (const p of POSS) {
    mv(`${att}-${p}`, pos[p][0], pos[p][1], T);
    const g = guardOf(p, pos[p], right, false);
    mv(`${def}-${p}`, g[0], g[1], T);
  }
  let arr = "";
  if (s.us) {
    const [zx, zy] = pos[S.pos];
    mv("ball", zx + 6, zy - 5, T);
    const gd = s.guard === "open" ? 40 : s.guard === "normal" ? 20 : 10;
    const d = Math.hypot(h.x - zx, h.y - zy);
    mv(`d-${S.pos}`, zx + ((h.x - zx) / d) * gd, zy + ((h.y - zy) / d) * gd, T);
    if (s.help) mv("d-C", h.x - 22, h.y + 2, T); // pivot pota altında bekliyor
    if (s.mate) {
      const mp = S.pos === "PG" ? "SG" : "PG",
        [mx, my] = pos[mp];
      mv(`d-${mp}`, mx - 30, my + (my < 98 ? 26 : -26), T); // arkadaşının savunmacısı yardıma kaymış
      arr += `<line x1="${zx}" y1="${zy}" x2="${mx}" y2="${my}" stroke="#fff" stroke-width="1.8" stroke-dasharray="4 3"/>`;
    }
    arr += `<line x1="${zx}" y1="${zy}" x2="${h.x}" y2="${h.y}" stroke="#ffc54d" stroke-width="1.8" stroke-dasharray="5 4" opacity=".8"/>`;
  } else {
    // savunma: top senin adamında; sen onunla pota arasındasın
    const [x, y] = pos[S.pos];
    mv("ball", x + 6, y - 5, T);
    mv(`o-${S.pos}`, x + (h.x - x) * 0.22, y + (h.y - y) * 0.22, T);
    if (s.drive) arr += `<line x1="${x}" y1="${y}" x2="${h.x}" y2="${h.y}" stroke="#ff5468" stroke-width="1.8" stroke-dasharray="5 4"/>`;
  }
  if (a) a.innerHTML = arr;
  late.mfRings(true);
  C.cur = { s, pos };
  const cap = $("#crt-cap");
  if (cap && s.sp) cap.innerHTML = `<b>${s.us ? $t("ct.attack") : $t("ct.defend")}</b>`;
  else if (cap)
    cap.innerHTML = s.us
      ? `<b>${$t(`ct.z.${s.zone}`)}</b> · ${$t(`ct.g.${s.guard}`)}${s.help ? ` · ${$t("ct.crowd")}` : ""}${s.mate ? ` · ${$t("ct.mate")}` : ""}`
      : `<b>${s.drive ? $t("ct.driving") : $t("ct.shooter")}</b>`;
}
/** Mini oyuna sahadaki durum: savunma baskısı, uzaklık, yardım, arka plandaki oyuncular (src/games.js MG_CTX) */
export function mgContext(s) {
  if (!s || !s.us) return null;
  // şutörle pota arasında, sahanın ortasında diğer oyuncular
  const crowd = [{ x: 196, opp: false }, { x: 226, opp: true }];
  if (s.mate) crowd.push({ x: 150, opp: false });
  return {
    press: s.guard === "open" ? 0 : s.guard === "normal" ? 0.45 : 0.85,
    gap: s.guard === "tight" ? 34 : 58,
    help: !!s.help,
    crowd
  };
}
/** Karar sonrası: top potaya gider; girerse file parlar, kaçarsa çemberden seker */
export function courtShot(good) {
  if (!C || !C.cur || !C.cur.s.us) return Promise.resolve();
  const n = $("#net-r");
  mv("ball", HR.x, HR.y, 380);
  return new Promise(r =>
    later(400, () => {
      if (good) late.sfx && late.sfx("netSwish");
      if (good && n) {
        n.style.transition = "opacity .3s";
        n.style.opacity = 0.75;
        later(350, () => (n.style.opacity = 0));
      } else mv("ball", HR.x - 26, HR.y + (Math.random() - 0.5) * 34, 300);
      later(380, r);
    })
  );
}

/* ---- Kaçan şut: ribaund mücadelesi ve ikinci şans (kendin oynarken) ---- */
export const isShotKey = k => THREE.includes(k) || TWO.includes(k) || FIN.includes(k);
const choose = (el, head, h2, opts) =>
  new Promise(res => {
    el.innerHTML = `<div class="card sit"><div class="eyebrow">${head}</div><h2>${h2}</h2><div class="choices">${opts
      .map(([k, t, d]) => `<button class="choice" data-rb="${k}"><span class="ct">${t}</span><span class="cd">${d}</span></button>`)
      .join("")}</div></div>`;
    [...el.querySelectorAll("[data-rb]")].forEach(b => (b.onclick = () => res(b.dataset.rb)));
  });
/** {txt, good} ya da null (top uzağa düştü, ribaund şansı yok) */
export async function reboundPhase(el, sur) {
  if (!M) return null;
  const big = ["C", "PF"].includes(S.pos);
  if (Math.random() > (big ? 0.6 : 0.38)) return null;
  // sahada: top çemberden döner, uzunlar boyalı alana dalar
  mv("ball", HR.x - 20, HR.y + 12, 250);
  mv(`o-${S.pos}`, HR.x - 30, HR.y + 6, 300);
  mv("d-C", HR.x - 22, HR.y - 8, 300);
  mv("d-PF", HR.x - 36, HR.y + 18, 300);
  const k = await choose(el, $t("ct.rb"), $t("ct.rb.h"), [
    ["crash", $t("ct.rb.crash"), `${$t("ct.rb.crashD")} · ${statName("guc")} ${Math.round(eff("guc"))}`],
    ["back", $t("ct.rb.back"), $t("ct.rb.backD")]
  ]);
  if (k === "back") return { txt: $t("ct.rb.backTxt", { sur }), good: false };
  setMgCtx({ help: true, crowd: [{ x: 196, opp: true }, { x: 150, opp: false }] });
  const r = await mgRebound(el, { eff: eff("guc") + (big ? 6 : -2), reps: 1, title: $t("ct.rb.h") });
  setMgCtx(null);
  if (!r.ok) {
    mv("ball", HR.x - 60, HR.y - 20, 300);
    return { txt: $t("ct.rb.lost", { sur }), good: false };
  }
  M.reb++;
  mv("ball", HR.x - 24, HR.y + 6, 200);
  const k2 = await choose(el, $t("ct.rb.got"), $t("ct.rb.second"), [
    ["tip", $t("ct.rb.tip"), `${$t("ct.rb.tipD")} · ${statName("sut")} ${Math.round(eff("sut"))}`],
    ["kick", $t("ct.rb.kick"), `${$t("ct.rb.kickD")} · ${statName("pas")} ${Math.round(eff("pas"))}`],
    ["reset", $t("ct.rb.reset"), $t("ct.rb.resetD")]
  ]);
  if (k2 === "tip") {
    // kalabalığın içinde kısa mesafe: yapışık savunma ve pota altında pivot
    setMgCtx({ press: 0.8, gap: 30, help: true, crowd: [{ x: 226, opp: true }] });
    const s = await mgShoot(el, { eff: eff("sut") + 4, shots: 1, title: $t("ct.rb.tip"), dist: "mid" });
    setMgCtx(null);
    M.pts += s.pts;
    if (s.made) M.fgm = (M.fgm || 0) + 1;
    M.fga = (M.fga || 0) + 1;
    await courtShot(s.made > 0);
    return { txt: s.made ? $t("ct.rb.tipOk", { sur }) : $t("ct.rb.tipNo", { sur }), good: s.made > 0 };
  }
  if (k2 === "kick") {
    const ok = Math.random() < Math.max(0.2, Math.min(0.7, 0.22 + eff("pas") / 220 + chemBonus()));
    const mate = S.pos === "SG" ? "PG" : "SG";
    const [mx, my] = SLOT[mate];
    mv("ball", mx, my, 250);
    if (ok) {
      M.ast++;
      M.us += 1; // asist formülü 2 sayar; üçlük 3
    }
    return { txt: ok ? $t("ct.rb.kickOk", { sur }) : $t("ct.rb.kickNo", { sur }), good: ok };
  }
  // hücumu yeniden kur: takım oynar
  const ok = Math.random() < 0.45;
  if (ok) M.us += 2;
  return { txt: ok ? $t("ct.rb.resetOk") : $t("ct.rb.resetNo"), good: ok };
}
const chemBonus = () => (S.chem ? (S.chem.v || 0) / 1000 : 0);

/* ---- İkinci karar ---- */
const FIN2 = ["drive", "lay", "dunk", "post"];
/** Seçilen hareketten sonra araya giren durum; {pk, mod, resolve} döner ya da null */
export function followUp(pk, el, s, sur) {
  const fin = FIN2.includes(pk),
    shot = THREE.includes(pk) || TWO.includes(pk);
  // maç akışı uzamasın: pota altı yardım varsa çoğunlukla, yoksa seyrek
  const fire = fin
    ? Math.random() < (s && s.help ? 0.7 : 0.15)
    : shot
      ? Math.random() < 0.15 && (!s || s.guard !== "open")
      : false;
  if (!fire) return Promise.resolve(null);
  const mate = $t("ct.teammate");
  const opts = fin
    ? [
        ["pass", $t("ct.f.pass", { m: mate }), $t("ct.f.passD")],
        ["pull", $t("ct.f.pull"), $t("ct.f.pullD")],
        ["spin", $t("ct.f.spin"), $t("ct.f.spinD")],
        ["force", $t("ct.f.force"), $t("ct.f.forceD")]
      ]
    : [
        ["shoot", $t("ct.f.shoot"), $t("ct.f.shootD")],
        ["fake", $t("ct.f.fake"), $t("ct.f.fakeD")],
        ["step", $t("ct.f.step"), $t("ct.f.stepD")],
        ["pass", $t("ct.f.pass", { m: mate }), $t("ct.f.passD")]
      ];
  el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("ct.second")}</div><h2>${fin ? $t("ct.bigUp") : $t("ct.closeout")}</h2><div class="choices">${opts
    .map(([k, t, d]) => `<button class="choice" data-fu="${k}"><span class="ct">${t}</span><span class="cd">${d}</span></button>`)
    .join("")}</div></div>`;
  return new Promise(res =>
    [...el.querySelectorAll("[data-fu]")].forEach(
      b =>
        (b.onclick = () => {
          const k = b.dataset.fu;
          if (k === "pass")
            return res({
              resolve: () => {
                const ok = Math.random() < Math.max(0.2, Math.min(0.9, 0.3 + eff("pas") / 120 + (S.rel.takim - 50) / 300));
                if (ok) M.ast++;
                return { good: ok, w: 1, st: "pas", txt: ok ? $t("ct.passOk", { sur }) : $t("ct.passNo", { sur }) };
              }
            });
          if (k === "pull") return res({ pk: "mid", mod: -3 });
          if (k === "spin") return res({ pk, mod: Math.round((eff("hiz") - 50) / 5) });
          if (k === "force") return res({ pk, mod: -10, foulChance: 0.3 });
          if (k === "shoot") return res({ pk, mod: -8 });
          if (k === "fake") return res({ pk: "drive", mod: 3 });
          if (k === "step") return res({ pk: "step", mod: -2 });
          return res(null);
        })
    )
  );
}
export const effMod = () => (M && M.live && M.effMod) || 0;

/* ---- İstatistik takibi ---- */
export function trackPlay(pk, pts0, res) {
  if (!M) return;
  const d = M.pts - pts0;
  if (pk === "free" || pk === "free3") {
    M.fta = (M.fta || 0) + (pk === "free3" ? 3 : 2);
    M.ftm = (M.ftm || 0) + d;
    return;
  }
  if (THREE.includes(pk)) {
    M.tpa = (M.tpa || 0) + 1;
    M.fga = (M.fga || 0) + 1;
    if (d >= 3) ((M.tpm = (M.tpm || 0) + 1), (M.fgm = (M.fgm || 0) + 1));
  } else if (TWO.includes(pk) || FIN.includes(pk)) {
    M.fga = (M.fga || 0) + 1;
    if (d >= 2) M.fgm = (M.fgm || 0) + 1; // basket faul serbest atışı andOne içinde sayılır (src/match.js)
  }
  void res;
}
const pct = (m, a) => (a ? `${m}/${a} (%${Math.round((m / a) * 100)})` : "–");
export const liveLine = () => (M && M.fga ? ` · ${$t("ct.fg")} ${M.fgm || 0}/${M.fga}` : "");
/** Maç sonu FM tarzı rapor */
export function reportHTML() {
  if (!M) return "";
  const f = (C && C.flow) || [],
    n = f.length;
  let path = "";
  if (n > 1) {
    const mx = Math.max(8, ...f.map(Math.abs));
    path = f
      .map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * 280 + 10).toFixed(1)} ${(40 - (v / mx) * 34).toFixed(1)}`)
      .join(" ");
  }
  const q = (M.qs || []).map((s, i, a) => [s[0] - (i ? a[i - 1][0] : 0), s[1] - (i ? a[i - 1][1] : 0)]);
  return `<div class="card fm"><div class="eyebrow">${$t("ct.report")}</div>
  <div class="kv"><span>${$t("ct.fg")}</span><b>${pct(M.fgm || 0, M.fga || 0)}</b><span>${$t("ct.tp")}</span><b>${pct(M.tpm || 0, M.tpa || 0)}</b><span>${$t("ct.ft")}</span><b>${pct(M.ftm || 0, M.fta || 0)}</b><span>${$t("ct.bench2")}</span><b>${M.autoPts || 0}</b></div>
  ${q.length ? `<div class="tbl"><table><tr><th></th>${q.map((_, i) => `<th>${i < 4 ? $t("common.q", { n: i + 1 }) : $t("ct.ot")}</th>`).join("")}</tr><tr><td>${esc(S.team.short)}</td>${q.map(x => `<td>${x[0]}</td>`).join("")}</tr><tr><td>${$t("ct.opp")}</td>${q.map(x => `<td>${x[1]}</td>`).join("")}</tr></table></div>` : ""}
  ${path ? `<div class="eyebrow">${$t("ct.flow")}</div><svg viewBox="0 0 300 80" style="width:100%;height:60px"><line x1="10" y1="40" x2="290" y2="40" stroke="#5d6b82" stroke-dasharray="3 3"/><path d="${path}" fill="none" stroke="#ffc54d" stroke-width="2"/></svg><div class="row between small muted"><span>${$t("ct.start")}</span><span>${$t("ct.end")}</span></div>` : ""}</div>${late.mfKeyHTML()}`;
}
