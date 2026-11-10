// "Geç bağlama" kaydı: daha önce yüklenen bir modülün, sonra yüklenen bir modüldeki fonksiyonu çağırması için.
// Örn. core.js haritayı çizerken story.js'deki rakip bilgisini ister. Statik import kullanılsaydı modüllerin
// yüklenme sırası değişir ve henüz hazır olmayan değerlere erişilirdi. Kayıt, tüm modüller yüklendikten sonra
// main.js tarafından canlı okuyucularla (getter) doldurulur; yeniden atanan değerler (ör. S) hep güncel okunur.
// Geliştirme modunda (vite dev) kayıtta olmayan bir ada erişim konsola uyarı yazar: yazım hatası ya da silinmiş
// dışa aktarım "late.X ? late.X() : …" korumasında sessizce yutulmasın. Üretim/test derlemesinde düz nesne.
const LATE_DEV = !!(/** @type {any} */ (import.meta).env && /** @type {any} */ (import.meta).env.DEV);
const LATE_WARNED = new Set();
const LATE_IGNORE = new Set(["then", "toJSON", "constructor", "$$typeof", "nodeType", "asymmetricMatch"]);
export const late = LATE_DEV
  ? new Proxy(/** @type {Record<string, any>} */ ({}), {
      get(t, k, r) {
        if (typeof k === "string" && !(k in t) && Object.keys(t).length && !LATE_IGNORE.has(k) && !LATE_WARNED.has(k)) {
          LATE_WARNED.add(k);
          console.warn(`[late] bilinmeyen ad: ${k}`);
        }
        return Reflect.get(t, k, r);
      }
    })
  : /** @type {Record<string, any>} */ ({});
