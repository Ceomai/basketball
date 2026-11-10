// Giriş noktası: önce seçili dilin sözlüğü (İngilizceyse ayrı dosyadan) yüklenir, sonra oyun modülleri.
// Oyun modülleri yüklenirken metinler sözlükten okunduğu için sıra önemlidir.
import "./testseed.js"; // yalnız otomatik testlerde (window.__TEST.seed) tohumlu rastgele; oyuncuda etkisiz
import "./fonts.css"; // gömülü yazı tipleri (src/fonts.css)
import { loadLang } from "./i18n/index.js";
await loadLang();
await import("./game.js");
