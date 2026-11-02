# Performans raporu

Bütün ölçümler bu oturumda gerçekten çalıştırıldı (`tests/audit.js` P01–P08, `tests/personas.js` U25; ham veri `reports/data/audit-results.json`).

**Ortam:** bulut konteyner, 4 çekirdek, başsız Chromium (Playwright). Gerçek telefon değil; sayılar göreli karşılaştırma için.

## Sonuçlar

| Ölçüm | Sonuç | Değerlendirme |
|---|---|---|
| Açılış (Pages derlemesi, yerel sunucu) | soğuk **300 ms**, sıcak **90 ms** (medyan, 4 ölçüm) | İyi; sıcak açılış servis çalışanı önbelleğinden |
| Ana ekran çizimi (`renderMain`) | ort **4,7 ms**, p95 **5,8 ms** (60 ölçüm) | Çok iyi |
| Bir oyun haftası (hızlı hafta + maçı simüle et + araya giren ekranlar) | ort **175–453 ms** (otomasyonun bekleme süreleri dahil) | İyi; asıl süre oyuncunun dokunuşları |
| 18 sezonluk kayıt | yükleme **3,4 ms**, kaydetme **2,2 ms**, boyut **74 KB**, Lig merkezi **1,4 ms**, kariyer kartı **24 ms** | Çok iyi; 5 yuva toplam ~370 KB, `localStorage` sınırının (5 MB) çok altında |
| Bellek: 5 tam kariyer simülasyonu (~1.400 maç) | yığın **2 → 4 → 4 → 4 → 5 → 4 MB** (her ölçüm çöp toplama sonrası) | Sızıntı yok |
| Stres: 300 mekan aç-kapat + 30 hafta | 300 açılış **510 ms** (açılış başına 1,7 ms), hafta ort **175 ms**, yığın **2 → 3 → 4 MB** | Sızıntı yok, hata yok |
| Mini oyun kare hızı (şut, 3 sn) | **60–61 FPS**, en yavaş kare 17–33 ms | Akıcı |
| Eski cihaz benzetimi (4× yavaş işlemci, düşük grafik, 320 px) | hafta **712–773 ms**, ana ekran çizimi **32–33 ms** | Kabul edilebilir |
| Çevrimdışı | servis çalışanı önbelleğinden açılıyor ve oynanıyor (`P07`, `U09`) | Çalışıyor |
| Uzun oturum (maymun oyuncu) | 32 koşu × 90 sn, ~27.000 dokunuş, 481 oyun haftası, hata yok (önceki tur); bu tur 8 koşu × 60 sn | Kararlı |

## Paket boyutları (Pages/Android derlemesi)

- `game.js` 436 KB
- `index.js` 101 KB
- `pack.en.js` 123 KB (yalnızca İngilizce seçilince iner)
- `index.html` 25 KB
- yerel eklenti kabukları 1-9 KB

Türkçe oyuncu yaklaşık 560 KB indirir (sıkıştırmasız; gzip ile yaklaşık 1/3).

## Darboğazlar ve öneriler

1. **Kariyer kartı çizimi (24-32 ms)** en ağır tek işlem, ama yalnızca istenince çalışıyor. İyileştirme gerekmiyor.
2. **`game.js` 436 KB:** sanat (SVG/çizim) ve içerik verisi en büyük pay. İstenirse mini oyunlar ve arcade ayrı parçaya bölünüp ilk açılış küçültülebilir; ölçülen açılış süreleri bunu şu an zorunlu kılmıyor.
3. **Gerçek cihaz ölçümü yapılamadı.** Firebase Test Lab ya da birkaç düşük donanımlı Android telefonda kare hızı ve pil ölçümü önerilir.
4. **Arka uç yükü uygulanamaz:** sunucu yok; k6 gibi araçlarla yük testi gerekmiyor.
