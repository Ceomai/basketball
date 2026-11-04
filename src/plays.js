/* ================= MAÇ SEÇENEKLERİ VE KİŞİSEL FAUL =================
   1) Hücum seçenekleri çeşitlendi: turnike, köşe üçlüğü, tepeden üçlük, floater, orta mesafe. Her pozisyona
      uygun olanlar eklenir; karar anında genelde 3, bazen 4 seçenek gelir. Kilit anlarda hepsi görünür.
   2) Basket faul: penetre (%18), turnike (%12), post-up (%10), smaç (%8) sayıdan sonra bir serbest atış.
   3) Kişisel faul: riskli savunma hamleleri (top çalma, blok, hücum faulü almak) başarısız olursa faul olabilir;
      savunmada arka planda da ara sıra faul çalınır. Faul sınırı 5 (NBA'de 6). Bir faul kala uyarı; sınıra
      ulaşınca faulle oyun dışı kalırsın (maçın kalanında oynamazsın, not düşer). Seçeneklerde faul riski yazar. */
import { t as $t } from "./i18n/index.js";
import { PLAYS } from "./data.js";
import { S } from "./core.js";
import { M } from "./match.js";

const EXTRA = {
  PG: ["lay", "top3", "float"],
  SG: ["corner", "lay", "float"],
  SF: ["corner", "lay", "mid"],
  PF: ["mid", "lay"],
  C: ["lay"]
};
const DEF = { lay: "hiz", top3: "sut", float: "sut", corner: "sut", mid: "sut" };
let added = false;
/** PLAYS'e ek seçenekleri bir kez ekle (dil paketi yüklendikten sonra metinler okunur) */
export function addPlays() {
  if (added) return;
  added = true;
  for (const [pos, keys] of Object.entries(EXTRA)) {
    const P = PLAYS[pos];
    if (!P) continue;
    for (const k of keys) if (!P.off.some(o => o[0] === k)) P.off.push([k, $t(`pl.${k}`), DEF[k], $t(`pl.${k}D`)]);
  }
}
addPlays();
/** Kaç seçenek gösterilsin (kilit an hariç): 3, bazen 4 */
export const optCount = () => (Math.random() < 0.25 ? 4 : 3);

/* ---- Kişisel faul ---- */
export const foulLimit = () => (S && S.stage === "nba" ? 6 : 5);
const RISK = { steal: 0.3, block: 0.35, charge: 0.5 };
export const foulRisky = k => k in RISK;
/** Seçenek açıklamasına faul riski notu */
export const foulNote = k => (k in RISK ? ` · ${$t("pf.risk")}` : "");
/** Savunma anı sonrası: başarısız riskli hamle faul olabilir. Faul olduysa açıklama metni döner. */
export function foulAfterMoment(k, good) {
  if (good || !(k in RISK) || Math.random() >= RISK[k]) return "";
  return addFoul();
}
/** Arka plan savunmasında ara sıra faul */
export function backgroundFoul() {
  return Math.random() < 0.015 ? addFoul() : "";
}
export function addFoul() {
  if (!M || M.fo) return "";
  M.pf = (M.pf || 0) + 1;
  const lim = foulLimit();
  if (M.pf >= lim) {
    M.fo = true;
    return ` <b class="bad">${$t("pf.out", { n: M.pf })}</b>`;
  }
  if (M.pf === lim - 1) return ` <b class="warn">${$t("pf.warn", { n: M.pf, l: lim })}</b>`;
  return ` <span class="muted">${$t("pf.foul", { n: M.pf, l: lim })}</span>`;
}
export const foulPenalty = () => (M && M.fo ? 0.4 : 0);
