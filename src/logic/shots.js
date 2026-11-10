/* ================= KARAR ANAHTARI KÜMELERİ (DOM'suz) =================
   Normal hücum kararlarının temel kümeleri tek yerde. Kullanım yerleri bunları olduğu gibi ya da kendi
   eklemeleriyle (play-off uyarlaması: pozisyon oyunu pp_* anahtarları) kullanır.
   Not: src/moments.js, src/traits.js ve src/matchfeel.js'teki OUT/PASS/IN listeleri farklı anlamda (dış şut
   etkisi, atletizm vb.) ve bilerek farklı; onlar burada değil. Özel anların pp_* şut anahtarları kendi mini
   oyunlarıyla çözüldüğünden isShotKey (saha şut yayı + ribaund) onları kapsamaz. */
export const SHOT_THREE = Object.freeze(["pull", "catch", "wing", "corner", "top3"]),
  SHOT_MID = Object.freeze(["step", "pop", "mid", "float"]),
  SHOT_FIN = Object.freeze(["drive", "break", "lay", "post", "dunk", "putback"]),
  SHOT_PASS = Object.freeze(["pnr", "kick", "lob"]);
