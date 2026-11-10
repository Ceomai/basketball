/* ================= EKRANSIZ MAÇ (DOM'suz) =================
   Simüle maçın (src/engine.js playMatch, AUTO: hızlı hafta / maçı hızlı oynat / denge simülasyonu) saat, çeyrek,
   rotasyon, hücum sırası, karar anı tetiklenmesi ve uzatma döngüsü. Oyun AUTO maçta bunu kendi bağımlılıklarıyla
   (hooks: hücum, karar anı, çeyrek arası, akış/ses) çalıştırır; RNG sırası ve sayısı eski döngüyle aynıdır
   (tests/match-golden.js birebir). Node'da hooks verilmezse basit takım modeli kullanılır (arka plan hücumu =
   src/logic/possession.js, karar anı da arka plan hücumu gibi): hızlı denge testi (tests/unit/simmatch.test.mjs,
   tools/sim-matches.js). Elle oynanan maç (mola, son dakika kararı, saha animasyonu) src/engine.js'te kalır. */
import { possessionChance, resolvePossession } from "./possession.js";

/** @typedef {() => number} Rng */
/** @typedef {Record<string, any>} MatchState */
/** @typedef {"star" | "rot" | "bench"} Role */
/** @typedef {number[][]} StintPlan */

export const MATCH_TOTAL = 2400,
  MATCH_OT = 300;

/** Rotasyon: role göre sahada olunan dakika aralıkları; enerji düşükse aralıklar kısalır, koçla ilişki kötüyse
    (yıldız değilsen) son aralık yok */
/** @param {Role} role @param {number} energy @param {number} koc @returns {StintPlan} */
export function stintPlanOf(role, energy, koc) {
  const P = {
    star: [
      [0, 7],
      [10, 18],
      [20, 27],
      [30, 40]
    ],
    rot: [
      [3, 9],
      [12, 19],
      [23, 30],
      [33, 40]
    ],
    bench: [
      [6, 10],
      [16, 20],
      [27, 31],
      [36, 40]
    ]
  }[role].map(s => s.slice());
  if (energy < 35) P.forEach(s => (s[1] = Math.max(s[0] + 2, s[1] - 1)));
  if (koc < 25 && role !== "star") P.pop();
  return P;
}
/** dakika m rotasyon aralıklarından birinde mi */
/** @param {StintPlan} plan @param {number} m */
export const planHas = (plan, m) => plan.some(([a, b]) => m >= a && m < b);
/** Maç saniyesinden çeyrek ve kalan süre (uzatmada 5 dakika) */
/** @param {number} t */
export function matchClock(t) {
  const q = Math.min(5, Math.floor(t / 600) + 1),
    inQ = t >= 2400 ? t - 2400 : t % 600,
    len = t >= 2400 ? 300 : 600;
  const left = Math.max(0, len - inQ);
  return { q: q > 4 ? 4 : q, clock: `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` };
}
/** src/data.js clamp ile aynı */
/** @param {number} v @param {number} a @param {number} b */
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
/**
 * Maç notu (1-10): karar anlarındaki başarı oranı (ağırlıklı), sonuç, artı/eksi, arka plan sayıların, sistem uyumu,
 * faulle oyun dışı cezası.
 * @param {{ win: boolean, wsum?: number, wgood?: number, plus: number, autoPts?: number, fit: number, foulPen: number }} r
 */
export function matchRating(r) {
  const sr = r.wsum ? (r.wgood || 0) / r.wsum : 0.5;
  return clampN(
    3.5 +
      5.0 * sr +
      (r.win ? 0.2 : -0.15) +
      clampN(r.plus / 35, -0.35, 0.35) +
      clampN((r.autoPts || 0) / 50, 0, 0.2) +
      clampN(r.fit / 40, -0.2, 0.2) -
      r.foulPen,
    1,
    10
  );
}
/** src/data.js ri ile aynı çekiş: [a, b] tamsayı */
/** @param {Rng} rng @param {number} a @param {number} b */
export const rngInt = (rng, a, b) => Math.floor(a + rng() * (b + 1 - a));

/** Node / test için boş maç durumu (oyunda src/engine.js setM) */
/** @returns {MatchState} */
export const newMatchState = () => ({
  dz: "man",
  stint: 0,
  us: 0,
  them: 0,
  q: 1,
  clock: "10:00",
  pts: 0,
  ast: 0,
  reb: 0,
  blk: 0,
  stl: 0,
  stops: 0,
  mins: 0,
  plus: 0,
  tac: null,
  qs: []
});

/**
 * @typedef {{ t: number, end: number, on: boolean, ourBall: boolean, clutch: boolean, n: number }} LoopState
 * @typedef {{
 *   quarterBreak?: (qn: number, on: boolean, ot?: boolean) => unknown,
 *   zoneSwitch?: (dz: string) => void,
 *   sub?: (on: boolean, L: LoopState) => void,
 *   passTrustBonus?: () => number,
 *   moment?: (us: boolean, clutch: boolean, L: LoopState) => unknown,
 *   possession?: (us: boolean, L: LoopState) => unknown,
 *   afterPossession?: (L: LoopState) => void,
 *   overtime?: () => void,
 *   pace?: () => unknown,
 *   yield?: () => unknown
 * }} MatchHooks
 * @typedef {{ m?: MatchState | (() => MatchState), plan?: StintPlan, role?: Role, tempo?: (d: number) => number, hooks?: MatchHooks,
 *   ppp?: number, threeP?: number, player?: { sk?: number, pas?: number, guc?: number, pos?: string } }} SimOpts
 */

/**
 * Tam simüle maç. us/them: { str } takım güçleri. Oyunda opts.m = () => M (canlı maç durumu, her erişimde okunur), opts.hooks oyunun
 * bağımlılıkları; verilmezse basit takım modeli. Dönen: maç durumu (us, them, qs, istatistikler) ve son saha durumu.
 * @param {{ us: { str: number }, them: { str: number }, opts?: SimOpts }} match
 * @param {Rng} rng
 * @returns {Promise<{ m: MatchState, on: boolean }>}
 */
export async function simulateMatch({ us, them, opts = {} }, rng) {
  // canlı maç durumu her erişimde yeniden okunur (oyunda M, () => M): bekleme noktalarında yeni bir maç başlarsa
  // (ör. hızlı hafta iki kez) eski döngü de güncel M'ye yazar; eski kodla aynı davranış
  const own = typeof opts.m === "function" ? null : opts.m || newMatchState(),
    cur = typeof opts.m === "function" ? opts.m : () => /** @type {MatchState} */ (own),
    role = opts.role || "rot",
    plan = opts.plan || stintPlanOf(role, 70, 50),
    tempo = opts.tempo || (d => d),
    h = opts.hooks || defaultHooks(cur(), us, them, opts, role, rng);
  /** @type {LoopState} */
  const L = { t: 0, end: MATCH_TOTAL, on: false, ourBall: rng() < 0.5, clutch: false, n: 0 };
  const qBreak = (/** @type {number} */ qn, /** @type {boolean} */ ot) =>
    h.quarterBreak ? h.quarterBreak(qn, L.on, ot) : ((cur().tac = null), undefined);
  let lastQ = 1;
  while (L.t < L.end) {
    const dur = tempo(rngInt(rng, 12, 22)); // rakip tarzı temposu (src/matchfeel.js osDur)
    L.t = Math.min(L.end, L.t + dur);
    Object.assign(cur(), matchClock(L.t));
    // çeyrek arası
    const q = Math.floor((L.t - 1) / 600) + 1;
    if (q > lastQ && L.t <= MATCH_TOTAL) {
      cur().qs.push([cur().us, cur().them]);
      await qBreak(lastQ, false);
      lastQ = q;
      cur().stint *= 0.4; // ara dinlendirir
      if (rng() < 0.3) {
        cur().dz = cur().dz === "zone" ? "man" : "zone";
        if (h.zoneSwitch) h.zoneSwitch(cur().dz);
      }
    }
    // rotasyon (faulle oyun dışı / faul sorunu)
    const minute = L.t / 60,
      want =
        (planHas(plan, Math.min(39.9, minute)) || (L.t > MATCH_TOTAL && role !== "bench")) &&
        !cur().fo &&
        cur().ftSit !== cur().q;
    if (want !== L.on) {
      L.on = want;
      cur().on = want;
      if (h.sub) h.sub(want, L);
    }
    if (L.on) {
      cur().mins += dur;
      cur().stint += dur;
    } else cur().stint = Math.max(0, cur().stint - dur * 2);
    const close = Math.abs(cur().us - cur().them) <= 6,
      clutch = L.t > MATCH_TOTAL - 120 && close;
    // takım arkadaşlarının sana pas verme isteği: hücumda topla buluşma (karar anı) olasılığı
    const involve =
      0.08 +
      (clutch ? 0.35 : 0) +
      (cur().tac === "ball" ? 0.05 : 0) +
      (L.ourBall ? (h.passTrustBonus ? h.passTrustBonus() : 0) : 0);
    const before = [cur().us, cur().them];
    const skipMoment = cur().lcTrail;
    cur().lcTrail = false;
    L.clutch = clutch;
    if (L.on && !skipMoment && rng() < involve) {
      if (L.ourBall) cur().touches = (cur().touches || 0) + 1;
      await (h.moment ? h.moment(L.ourBall, clutch, L) : h.possession && h.possession(L.ourBall, L));
    } else if (h.possession) h.possession(L.ourBall, L);
    if (L.on) cur().plus += cur().us - before[0] - (cur().them - before[1]);
    cur().low = Math.min(cur().low || 0, cur().us - cur().them); // en büyük geri düşülen fark
    L.ourBall = !L.ourBall;
    if (h.afterPossession) h.afterPossession(L);
    // uzatma
    if (L.t >= L.end && L.end >= MATCH_TOTAL && cur().us === cur().them) {
      L.end += MATCH_OT;
      if (h.overtime) h.overtime();
      cur().toLeft = 1; // uzatmada bir mola
      if (L.t === MATCH_TOTAL) {
        cur().qs.push([cur().us, cur().them]);
        await qBreak(4, true);
      }
    }
    if (h.pace) await h.pace();
    // uzun tek görev olmasın: ~10 hücumda bir nefes (sonucu/RNG sırasını değiştirmez)
    if (++L.n % 10 === 0 && h.yield) await h.yield();
  }
  cur().qs.push([cur().us, cur().them]);
  return { m: cur(), on: L.on };
}

/**
 * Node için basit takım modeli: her hücum src/logic/possession.js ile (mola/seri/rakip tarzı etkisi yok, hakem
 * normal); karar anı da arka plan hücumu gibi çözülür.
 * @param {MatchState} m @param {{ str: number }} us @param {{ str: number }} them @param {SimOpts} opts
 * @param {Role} role @param {Rng} rng @returns {MatchHooks}
 */
function defaultHooks(m, us, them, opts, role, rng) {
  const pl = opts.player || {},
    ppp = opts.ppp || 0.5;
  /** @param {boolean} side @param {LoopState} L */
  const possession = (side, L) => {
    const p = possessionChance({
      us: side,
      on: L.on,
      ppp,
      ourStr: us.str,
      oppStr: them.str,
      tac: m.tac,
      possMod: 1,
      osPossMul: 1
    });
    const r = resolvePossession(
      { us: side, on: L.on, p, nMates: 4, nFoes: 5, refMul: 1, threeP: side ? 0.32 : opts.threeP || 0.32 },
      rng,
      shot => {
        if (shot.bgFoul) m.pf = (m.pf || 0) + 1;
        if (shot.sc) {
          if (side) m.us += shot.pts;
          else m.them += shot.pts;
        }
        return { mode: "key", role, pos: pl.pos || "SF", sk: pl.sk || 50, pas: pl.pas || 50, guc: pl.guc || 50, trust: 1 };
      }
    );
    if (r.mine) m.pts += r.pts;
    if (r.ast) m.ast++;
    if (r.reb) m.reb++;
  };
  return { possession };
}
