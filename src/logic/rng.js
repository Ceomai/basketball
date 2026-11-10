/* ================= TOHUMLU RASTGELE VE METİN ÖZETİ (DOM'suz) =================
   Oyunda birkaç ayrı yerde kopyası duran üreteçlerin tek kaynağı. Algoritmalar kayıtlarla ve "aynı tohum → aynı
   sonuç" sözleriyle (Günün Maçı tarihi, aynı yazın teklifleri, arcade tablosu, deney kovası) bağlı olduğundan
   birbirinin yerine KULLANILMAZ: her kullanım yeri kendi algoritmasını adıyla çağırır (tests/unit/rng.test.mjs). */

/** mulberry32: [0,1) üreten hızlı tohumlu üreteç (Günün Maçı, sezon geçişi teklifleri) */
/** @param {number} seed @returns {() => number} */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Doğrusal eşlik üreteci (Numerical Recipes sabitleri): arcade haftalık/aylık rakip skorları */
/** @param {number} seed @returns {() => number} */
export function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** FNV-1a 32 bit, UTF-16 birimleri üzerinden, işaretsiz (uzaktan ayar deney kovası) */
/** @param {string} s */
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
/** FNV-1a türevi: kod noktası başına ilk birim, işaretli çarpım, mutlak değer (oyun içi kararlı seçimler: data.js hash) */
/** @param {unknown} s */
export function strHash(s) {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
/** Knuth çarpımsal özet (başlangıç 7): sezon geçişi teklif tohumu */
/** @param {string} str */
export const seedHash = str => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 7);
