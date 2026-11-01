/* ================= ÇOK DİL ALTYAPISI =================
   t("anahtar", { ad: değer }) seçili dildeki metni döndürür; çeviri yoksa Türkçeye, o da yoksa anahtara düşer.
   Yeni dil eklemek: src/i18n/<kod>.js sözlüğü + LANGS listesi. Olay metinleri ayrıca src/content/events.<kod>.js'tedir.
   Not: Arayüz metinlerinin taşınması kademelidir; henüz taşınmamış metinler Türkçe görünür. */
import tr from "./tr.js";
import en from "./en.js";

export const LANGS = [
  ["tr", "Türkçe"],
  ["en", "English (beta)"]
];
const DICT = { tr, en };
export let LANG = (() => {
  try {
    const l = localStorage.getItem("pota-lang");
    return DICT[l] ? l : "tr";
  } catch (e) {
    return "tr";
  }
})();
document.documentElement.lang = LANG;
export function setLang(l) {
  if (!DICT[l]) return;
  LANG = l;
  try {
    localStorage.setItem("pota-lang", l);
  } catch (e) {
    /* depolama kapalı */
  }
  document.documentElement.lang = l;
}
/** @param {string} key @param {Record<string, any>} [params] */
export function t(key, params) {
  const s = (DICT[LANG] && DICT[LANG][key]) ?? DICT.tr[key] ?? key;
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => params[k] ?? m) : s;
}
