// Giriş noktası: önce seçili dilin sözlüğü (İngilizceyse ayrı dosyadan) yüklenir, sonra oyun modülleri.
// Oyun modülleri yüklenirken metinler sözlükten okunduğu için sıra önemlidir.
import { loadLang } from "./i18n/index.js";
await loadLang();
await import("./game.js");
