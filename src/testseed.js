/* ================= TEST TOHUMU (yalnız otomatik testler) =================
   Tarayıcı testleri (tests/lib.js seedInit) Playwright addInitScript ile window.__TEST.seed kurar; o zaman Math.random
   tohumlu üreteçle (src/logic/rng.js mulberry32) değiştirilir ve her test kendi adından türeyen sabit diziyle
   deterministik çalışır. Oyuncunun cihazında window.__TEST hiç yoktur: modül hiçbir şey yapmaz, denge değişmez.
   Aynı sekmede yeniden yükleme yeni bir dizi alır (sayaç sessionStorage'da): yeniden yüklenen sayfa kimlikleri
   (cihaz, kayıt) öncekinin aynısını üretmez. main.js'te İLK içe aktarım: oyun modülleri yüklenmeden kurulur. */
import { fnv1a, mulberry32 } from "./logic/rng.js";

/** Test bayrağı varsa Math.random'ı tohumlu üreteçle değiştir; kurulduysa kullanılan tohum dizgesini döndürür */
/** @param {any} win */
export function testSeedInstall(win) {
  const T = win && win.__TEST;
  if (!T || T.seed === undefined || T.seed === null || T.seed === false) return null;
  let n = 0;
  try {
    const k = "pota-test-seed-n";
    n = +(win.sessionStorage.getItem(k) || 0) || 0;
    win.sessionStorage.setItem(k, String(n + 1));
  } catch (e) {
    /* depo yok: her yüklemede aynı dizi */
  }
  const key = `${T.seed}#${n}`;
  win.Math.random = mulberry32(fnv1a(key));
  T.seedKey = key;
  return key;
}
if (typeof window !== "undefined") testSeedInstall(window);
