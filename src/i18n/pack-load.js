// İngilizce dil paketi: parçalı derlemede ayrı dosya, yalnızca gerektiğinde indirilir.
// Tek dosya derlemesinde (vite.config.mjs) bu dosya yerine pack-load.single.js kullanılır.
export const loadPack = () => import("./pack.en.js");
export const syncPack = null;
