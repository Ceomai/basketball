/* ================= ARKA PLAN HÜCUMU (DOM'suz, saf) =================
   Maçta karar anı olmayan her hücumun olasılık ve sonuç hesabı (src/engine.js simPossession bunu uygular ve çizer).
   Rastgelelik yalnız verilen `rng` ile ve oyundaki eski kodla AYNI SIRA ve SAYIDA çekilir: aynı tohum → aynı maç
   (tests/match-golden.js, tests/unit/match-golden.test.mjs). Sıra: [rakip yıldız payı] → [atan oyuncu] →
   [arka plan faulü] → isabet → [üçlük] | ilk aşama; ikinci aşama (sayı sonrası seyirci etkisi uygulandıktan sonra):
   [senin sayın] → [asist] → [akış satırı] → [satır seçimi] → [tribün nidası]; kaçan şutta [ribaund] → [akış].
   Metin üretmez: akış satırı türü ve seçilen kalıbın sırası döner, metni motor yazar. */

/** @typedef {() => number} Rng */
/** @typedef {"star" | "rot" | "bench"} Role */
/** @typedef {"full" | "key" | "only"} Mode */

/** [0, n) aralığında tamsayı: src/data.js pick ile aynı çekiş (Math.floor(r * n)) */
/** @param {Rng} rng @param {number} n */
export const rngIndex = (rng, n) => Math.floor(rng() * n);
/** @param {number} v @param {number} a @param {number} b */
const clampP = (v, a, b) => Math.max(a, Math.min(b, v));

/** arka plan savunmasında senin faulün (hakem çarpanıyla) */
export const BG_FOUL_P = 0.015;
/** sahadayken sayılardaki payın (rol başına, nitelik ve pas güveniyle ölçeklenir) */
export const SHARE_BY_ROLE = Object.freeze({ star: 0.21, rot: 0.13, bench: 0.08 });
/** kaçan şutta ribaundu senin alman (mevki başına, güçle ölçeklenir) */
export const REB_BY_POS = Object.freeze({ C: 0.2, PF: 0.16, SF: 0.1, SG: 0.06, PG: 0.05 });
/** akış kalıplarının sayısı: senin sayın (2'lik), takım sayısı (2'lik), kaçan hücum, tribün nidası */
export const POSS_LINES = Object.freeze({ mine2: 3, score2: 4, miss: 4, call: 5 });

/**
 * Hücumun isabet olasılığı (taktik, saha/kenar, mola/seri etkisi possMod, rakip tarzı osPossMul)
 * @param {{ us: boolean, on: boolean, ppp: number, ourStr: number, oppStr: number, tac: string | null | undefined,
 *   possMod: number, osPossMul: number }} s
 */
export function possessionChance(s) {
  const tacU = s.tac === "tempo" ? 1.06 : s.tac === "def" ? 0.97 : 1,
    tacT = s.tac === "def" ? 0.93 : s.tac === "tempo" ? 1.03 : 1;
  return clampP(
    s.ppp * (s.us ? (s.ourStr / s.oppStr) * tacU * (s.on ? 1 : 0.97) : (s.oppStr / s.ourStr) * tacT) * s.possMod * s.osPossMul,
    0.15,
    0.85
  );
}

/**
 * @typedef {{ starTurn: boolean, who: number, bgFoul: boolean, sc: boolean, three: boolean, pts: number }} PossShot
 */
/**
 * İlk aşama: kim şut atar, arka plan faulü, isabet ve üçlük.
 * who: bizim hücumda takım arkadaşı sırası (0..nMates-1), rakipte rakip oyuncu sırası (0 = yıldız).
 * @param {{ us: boolean, on: boolean, p: number, nMates: number, nFoes: number, refMul: number, threeP: number }} s
 * @param {Rng} rng
 * @returns {PossShot}
 */
export function possessionShot(s, rng) {
  const starTurn = !s.us && rng() < 0.3; // rakip yıldızın payı: akışta da onun adı geçer
  const who = s.us ? rngIndex(rng, s.nMates) : starTurn ? 0 : 1 + rngIndex(rng, s.nFoes - 1);
  const bgFoul = !s.us && s.on ? rng() < BG_FOUL_P * s.refMul : false;
  const sc = rng() < s.p;
  const three = sc ? rng() < s.threeP : false;
  return { starTurn, who, bgFoul, sc, three, pts: sc ? (three ? 3 : 2) : 0 };
}

/**
 * @typedef {{ kind: "mine", three: boolean, line: number }
 *   | { kind: "score", three: boolean, line: number, call: number }
 *   | { kind: "miss", line: number }} PossFeed
 * line: kalıp sırası (üçlükte -1), call: tribün nidası sırası (yoksa -1)
 */
/**
 * @typedef {{ mine: boolean, ast: boolean, reb: boolean, feed: PossFeed | null }} PossCredit
 */
/**
 * İkinci aşama (sayının seyirci etkisi uygulandıktan sonra, nitelikler o anki haliyle): senin payın, asist, ribaund,
 * akış satırı. sk: (şut + hız + güç) / 3, pas / guc: o anki etkin nitelikler, trust: pas güveni çarpanı.
 * @param {{ us: boolean, on: boolean, sc: boolean, three: boolean, mode: Mode | string, role: Role | string,
 *   pos: string, sk: number, pas: number, guc: number, trust: number }} s
 * @param {Rng} rng
 * @returns {PossCredit}
 */
export function possessionCredit(s, rng) {
  const full = s.mode === "full";
  if (s.sc) {
    let ast = false;
    if (s.us && s.on) {
      const share = (SHARE_BY_ROLE[/** @type {Role} */ (s.role)] || 0) * (0.6 + (clampP(s.sk, 0, 100) / 100) * 0.8) * s.trust;
      if (rng() < share) {
        const feed = full
          ? { kind: /** @type {"mine"} */ ("mine"), three: s.three, line: s.three ? -1 : rngIndex(rng, POSS_LINES.mine2) }
          : null;
        return { mine: true, ast: false, reb: false, feed };
      }
      ast = rng() < 0.12 * (0.6 + s.pas / 100);
    }
    if (rng() < 0.55 || full) {
      const line = s.three ? -1 : rngIndex(rng, POSS_LINES.score2),
        call = s.us && rng() < 0.12 ? rngIndex(rng, POSS_LINES.call) : -1;
      return { mine: false, ast, reb: false, feed: { kind: "score", three: s.three, line, call } };
    }
    return { mine: false, ast, reb: false, feed: null };
  }
  if (s.on && rng() < (REB_BY_POS[/** @type {keyof typeof REB_BY_POS} */ (s.pos)] || 0) * (0.6 + s.guc / 100))
    return { mine: false, ast: false, reb: true, feed: null };
  if (rng() < 0.35 && full)
    return { mine: false, ast: false, reb: false, feed: { kind: "miss", line: rngIndex(rng, POSS_LINES.miss) } };
  return { mine: false, ast: false, reb: false, feed: null };
}

/**
 * Tek hücumun tamamı: ilk aşama → `apply(shot)` (çağıran sayıyı, faulü, seyirciyi uygular ve ikinci aşamanın
 * girdilerini o anki haliyle döndürür) → ikinci aşama.
 * @param {{ us: boolean, on: boolean, p: number, nMates: number, nFoes: number, refMul: number, threeP: number }} s
 * @param {Rng} rng
 * @param {(shot: PossShot) => { mode: Mode | string, role: Role | string, pos: string, sk: number, pas: number, guc: number, trust: number }} apply
 * @returns {PossShot & PossCredit}
 */
export function resolvePossession(s, rng, apply) {
  const shot = possessionShot(s, rng);
  const c = apply(shot);
  return { ...shot, ...possessionCredit({ us: s.us, on: s.on, sc: shot.sc, three: shot.three, ...c }, rng) };
}
