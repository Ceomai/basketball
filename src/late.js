// "Geç bağlama" kaydı: daha önce yüklenen bir modülün, sonra yüklenen bir modüldeki fonksiyonu çağırması için.
// Örn. core.js haritayı çizerken story.js'deki rakip bilgisini ister. Statik import kullanılsaydı modüllerin
// yüklenme sırası değişir ve henüz hazır olmayan değerlere erişilirdi. Kayıt, tüm modüller yüklendikten sonra
// main.js tarafından canlı okuyucularla (getter) doldurulur; yeniden atanan değerler (ör. S) hep güncel okunur.
export const late = {};
