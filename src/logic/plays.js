/* ================= KARAR ANI ÇÖZÜMÜ (DOM'suz, saf) =================
   Kendin oynarken seçtiğin hamle önce mini oyunla oynanır (src/games.js, arayüz); mini oyunun sonucundan sonraki
   olasılıklar ve sonuç (sayı, asist, ribaund, top çalma, blok, durdurma, hücum faulü, basket faul) burada.
   src/match.js resolvePlay mini oyunu oynatır, bu sonucu M'ye uygular ve metni yazar.
   Rastgelelik yalnız verilen `rng` ile, oyundaki eski kodla aynı sıra ve sayıda (tests/unit/match-golden.test.mjs).
   Bilinmeyen anahtar serbest atıştır (eski davranış). */
import { SHOT_MID, SHOT_THREE } from "./shots.js";

/** @typedef {() => number} Rng */
/** @typedef {"shot" | "drive" | "pass" | "post" | "dunk" | "rebound" | "block" | "steal" | "charge" | "safe" | "free"} PlayCat */
/** mini oyun sonucu: ok (başarı sayısı / evet-hayır), made + pts (şut) */
/** @typedef {{ ok?: number | boolean, made?: number, pts?: number }} PlayMg */
/** @typedef {{ pts: number, ast: number, reb: number, blk: number, stl: number, stops: number }} PlayDelta */
/**
 * msg: metin kodu (src/match.js PLAY_TXT), foul: hücum faulü (addFoul), and1: basket faul serbest atışı mini oyunu
 * (track: atış istatistiğine ve basket faul sayacına yazılır mı)
 * @typedef {{ good: boolean, w: number, st: string, msg: string, d: PlayDelta, foul: boolean,
 *   and1: { track: boolean } | null }} PlayOutcome
 */

/** @param {string} k @returns {PlayCat} */
export function playCategory(k) {
  if (SHOT_THREE.includes(k) || SHOT_MID.includes(k)) return "shot";
  if (k === "drive" || k === "break" || k === "lay") return "drive";
  if (k === "pnr" || k === "kick" || k === "lob") return "pass";
  if (k === "post") return "post";
  if (k === "dunk") return "dunk";
  if (k === "putback" || k === "reb") return "rebound";
  if (k === "block") return "block";
  if (k === "steal") return "steal";
  if (k === "charge") return "charge";
  if (k === "safe") return "safe";
  return "free";
}
/** serbest atış sayısı (üçlükte faul: 3) */
/** @param {string} k */
export const freeThrowsOf = k => (k === "free3" ? 3 : 2);
/** basket faul olasılığı (hakem çarpanı refAnd1 ile): penetre / turnike / post / smaç */
export const AND1_P = Object.freeze({ drive: 0.18, lay: 0.12, post: 0.1, dunk: 0.08 });

/** @param {number} v @param {number} a @param {number} b */
const clampV = (v, a, b) => Math.max(a, Math.min(b, v));
/** @param {Partial<PlayDelta>} d @returns {PlayDelta} */
const delta = d => ({ pts: 0, ast: 0, reb: 0, blk: 0, stl: 0, stops: 0, ...d });
/**
 * @param {boolean} good @param {number} w @param {string} st @param {string} msg
 * @param {Partial<PlayDelta>} [d] @param {Partial<PlayOutcome>} [x] @returns {PlayOutcome}
 */
const out = (good, w, st, msg, d = {}, x = {}) => ({ good, w, st, msg, d: delta(d), foul: false, and1: null, ...x });

/** Hücum ilişkisinde pasın asiste dönme olasılığı (takım ilişkisi, kimya) */
/** @param {string} k @param {number} takim @param {number} chem */
export const passConv = (k, takim, chem) => (k === "lob" ? 0.75 : 0.58) + takim * 0.003 + (chem - 40) * 0.002;
/** Hücum faulü almak (charge) olasılığı */
/** @param {number} sav */
export const chargeP = sav => clampV((sav / 100) * 0.6 + 0.15, 0.1, 0.75);
/** Yerini korumak (safe) olasılığı; e: PF'de güç, diğerlerinde savunma */
/** @param {number} e */
export const safeP = e => clampV((e / 100) * 0.7 + 0.25, 0.2, 0.9);

/**
 * Mini oyun sonrası sonuç. c: hamlenin gerektirdiği o anki değerler: pas → takim (S.rel.takim) + chem (yalnız mini
 * oyun başarılıysa okunur), post/smaç → refAnd1, charge → sav, safe → pos + sav/guc.
 * @param {string} k @param {PlayMg | null} mg
 * @param {{ takim?: number, chem?: number, refAnd1?: number, sav?: number, guc?: number, pos?: string }} c
 * @param {Rng} rng
 * @returns {PlayOutcome}
 */
export function playOutcome(k, mg, c, rng) {
  const r = mg || {},
    ok = Number(r.ok || 0); // evet/hayır sonuç 1/0 sayılır (eski kodda M.pts += true → +1)
  switch (playCategory(k)) {
    case "shot": {
      const th = SHOT_THREE.includes(k),
        made = r.made || 0;
      return out(made > 0, th ? 1.3 : 1, "sut", made ? (th ? "hit3" : "hit2") : "miss", { pts: r.pts || 0 });
    }
    case "drive": {
      // penetrede hücum faulü: kişisel faul sayılır
      if (!ok) return out(false, 1, "hiz", "turn", {}, { foul: k !== "break" && rng() < 0.15 });
      if (k === "break") return out(true, 1.2, "hiz", "fb", { pts: 2 });
      if (rng() < (k === "lay" ? AND1_P.lay : AND1_P.drive))
        return out(true, 1.2, "hiz", "and1", { pts: 2 }, { and1: { track: false } });
      if (rng() < 0.88) return out(true, 1, "hiz", "blew", { pts: 2 });
      return out(true, 0.6, "hiz", "beat");
    }
    case "pass": {
      if (!ok) return out(false, 1, "pas", "int");
      if (rng() < passConv(k, c.takim || 0, c.chem === undefined ? 40 : c.chem))
        return out(true, k === "lob" ? 1.3 : 1, "pas", k === "lob" ? "lob" : "open", { ast: 1 });
      return out(true, 0.6, "pas", "nice");
    }
    case "post":
    case "dunk": {
      const dunk = k === "dunk";
      const pts = ok ? 2 : 0;
      if (ok && rng() < (dunk ? AND1_P.dunk : AND1_P.post) * (c.refAnd1 === undefined ? 1 : c.refAnd1))
        return out(true, dunk ? 1.4 : 1.3, "guc", "and1", { pts }, { and1: { track: true } });
      return out(ok > 0, dunk ? 1.3 : 1.2, "guc", dunk ? (ok ? "dunk" : "dunkMiss") : ok ? "post" : "hook", { pts });
    }
    case "rebound": {
      if (!ok) return out(false, 1, "guc", "lostReb");
      if (k === "reb") return out(true, 1, "guc", "dreb", { reb: 1, stops: 1 });
      if (rng() < 0.8) return out(true, 1.2, "guc", "putback", { reb: 1, pts: 2 });
      return out(true, 0.6, "guc", "orebMiss", { reb: 1 });
    }
    case "block":
      return out(ok > 0, 1.2, "sav", ok ? "block" : "blockMiss", ok ? { blk: 1, stops: 1 } : {});
    case "steal":
      return out(ok > 0, 1.2, "hiz", ok ? "steal" : "stealMiss", ok ? { stl: 1 } : {});
    case "charge": {
      const good = rng() < chargeP(c.sav || 0);
      return out(good, 1.1, "sav", good ? "charge" : "chargeMiss", good ? { stops: 1 } : {});
    }
    case "safe": {
      const good = rng() < safeP((c.pos === "PF" ? c.guc : c.sav) || 0);
      return out(good, 0.5, "sav", good ? "safe" : "safeMiss", good ? { stops: 1 } : {});
    }
    default:
      return out(ok > 0, 0.6, "sut", freeThrowsOf(k) === 3 ? "ft3" : "ft2", { pts: Number(ok) });
  }
}
