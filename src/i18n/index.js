/* ================= ÇOK DİL ALTYAPISI =================
   t("anahtar", { ad: değer }) seçili dildeki metni döndürür; çeviri yoksa Türkçeye, o da yoksa anahtara düşer.
   Yeni dil eklemek: src/i18n/<kod>.js sözlüğü + LANGS listesi. Olay metinleri ayrıca src/content/events.<kod>.js'tedir.
   Not: Arayüz metinlerinin taşınması kademelidir; henüz taşınmamış metinler Türkçe görünür. */
import { loadPack, syncPack } from "./pack-load.js";
import trManual from "./tr.js";
import trAuto from "./tr.auto.js";
import { brandDeep, brandSetLang } from "../brand.js";
// elle yazılmış anahtarlar (ekran.öğe) ve araçla çıkarılmış anahtarlar (dosya.no) birlikte.
// İngilizce sözlük ayrı dosyada: yalnızca İngilizce seçiliyse yüklenir (Türkçe oyuncu indirmez). Bkz. loadLang.
// mağaza güvenli adlar (src/brand.js): gerçek lig/turnuva adları sözlük yüklenirken bir kez çevrilir
const tr = brandDeep({ ...trAuto, ...trManual }, "tr"),
  en = {};
/** Dil paketleri (olay çevirileri vb.); loadLang doldurur */
export const PACKS = { events: [] };

export const LANGS = [
  ["tr", "Türkçe"],
  ["en", "English (beta)"]
];
const DICT = { tr, en };
/** Seçili dil Türkçe değilse sözlüğünü yükle. Oyun modülleri bundan sonra yüklenir (main.js). */
export async function loadLang() {
  if (LANG !== "en") return;
  const m = await loadPack();
  Object.assign(DICT.en, brandDeep({ ...m.dict }, "en"));
  PACKS.events = brandDeep(m.events, "en");
}
export let LANG = (() => {
  try {
    const l = localStorage.getItem("pota-lang");
    return DICT[l] ? l : "tr";
  } catch (e) {
    return "tr";
  }
})();
document.documentElement.lang = LANG;
brandSetLang(LANG);
if (syncPack && LANG === "en") {
  Object.assign(DICT.en, brandDeep({ ...syncPack.dict }, "en"));
  PACKS.events = brandDeep(syncPack.events, "en");
}
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
// Bölgesel kültür katmanı (src/culture.js): bazı anahtarların metni oyuncunun bulunduğu şehre göre değişir
let OVR = null;
/** @param {((key: string) => string | undefined) | null} f */
export function setTOverride(f) {
  OVR = f;
}
/** Sözlükteki ham metin (yoksa undefined); bölgesel yedek zinciri için. @param {string} key */
export const tRaw = key => (DICT[LANG] && DICT[LANG][key]) ?? DICT.tr[key];
/** @param {string} key @param {Record<string, any>} [params] */
export function t(key, params) {
  const s = (OVR && OVR(key)) ?? (DICT[LANG] && DICT[LANG][key]) ?? DICT.tr[key] ?? key;
  const out = params ? s.replace(/\{(\w+)\}/g, (m, k) => params[k] ?? m) : s;
  return out.indexOf("｛") >= 0 || out.indexOf("｝") >= 0 ? out.replace(/｛/g, "{").replace(/｝/g, "}") : out;
}
