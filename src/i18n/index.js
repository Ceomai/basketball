/* ================= ÇOK DİL ALTYAPISI =================
   t("anahtar", { ad: değer }) seçili dildeki metni döndürür; çeviri yoksa Türkçeye, o da yoksa anahtara düşer.
   Yeni dil eklemek: src/i18n/<kod>.js sözlüğü + LANGS listesi. Olay metinleri ayrıca src/content/events.<kod>.js'tedir.
   Not: Arayüz metinlerinin taşınması kademelidir; henüz taşınmamış metinler Türkçe görünür. */
import trManual from "./tr.js";
import enManual from "./en.js";
import trAuto from "./tr.auto.js";
import enAuto from "./en.auto.js";
// elle yazılmış anahtarlar (ekran.öğe) ve araçla çıkarılmış anahtarlar (dosya.no) birlikte
const tr = { ...trAuto, ...trManual },
  en = { ...enAuto, ...enManual };

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
/** Tarih/büyük harf dönüşümleri için yerel ayar (Türkçede i → İ). */
export let LOCALE = LANG === "tr" ? "tr-TR" : "en-US";
export function setLang(l) {
  if (!DICT[l]) return;
  LANG = l;
  LOCALE = l === "tr" ? "tr-TR" : "en-US";
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
  const out = params ? s.replace(/\{(\w+)\}/g, (m, k) => params[k] ?? m) : s;
  return out.indexOf("｛") >= 0 || out.indexOf("｝") >= 0 ? out.replace(/｛/g, "{").replace(/｝/g, "}") : out;
}
