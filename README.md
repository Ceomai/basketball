# Pota Kariyeri

İstanbul'da bir lise takımında başlayıp Avrupa liglerinden EuroLeague ve NBA'e tırmandığın, mobil öncelikli bir basketbol kariyer simülasyonu. Oyunun ana menüsü bir şehir haritası. Karakterler South Park esintili, kağıttan kesilmiş gibi bir tarzla çizildi. Oyun New Star Soccer'ın kariyer döngüsünden esinlendi.

## Nasıl oynanır

Kurulum ya da derleme gerekmez. `index.html` dosyasını bir tarayıcıda açman yeterli.

GitHub Pages ile yayınlamak için: **Settings → Pages → Deploy from a branch → `main` / root**.

## Öne çıkanlar

- **Kariyer yolu:** İstanbul'da lise, ardından gözlemci raporu, sonra 8 ülkenin (TR, ES, IT, FR, DE, GR, RS, LT) 3., 2. ve 1. ligleri, EuroLeague ve NBA. Her teklifte rol, maaş ve sözleşme süresi var.
- **Şehir haritası:** oynadığın takımın şehrine göre değişiyor. Her şehrin kendi simge yapıları ve silueti var. Stadyum ve ev görselleri kariyer ilerledikçe büyüyor.
- **Maç anları:** pozisyona özel kritik anlar oynanıyor. Çek-bırak şut, kaydırarak çalım, pas, blok, post-up, ribaund ve alley-oop var.
- **Mekanlar:**
  - Okul: sınıfta soru-cevap.
  - Medya merkezi: fotoğraf çekimi ve röportaj.
  - Eğlence merkezi: pota makinesi, refleks, hava hokeyi, dans ritmi, bowling, karaoke.
  - Şans salonu: rulet, blackjack, slot.
  - Market, AVM (6 mağaza), kafe ve aile evi.
- **Ev:** aldığın eşyaların, kupaların ve formaların sergilendiği bir vitrin odası.
- Kariyer tarayıcının `localStorage` alanına kaydediliyor.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Stiller ve sayfa iskeleti |
| `data.js` | Ligler, şehirler, pozisyonlar, yardımcılar |
| `art.js` | Karakter çizimi, ikonlar, mekan sahneleri, vitrin |
| `map.js` | Şehir haritası |
| `games.js` | Maç ve antrenman mini oyunları |
| `core.js` | Oyun durumu, ana ekran, panel sistemi |
| `places.js` | Ev, stadyum, okul, medya, aile, kafe |
| `casino.js` | Şans salonu |
| `shops.js` | AVM mağazaları, market ve eğlence merkezi |
| `arcade.js` | Arcade oyunları: pota makinesi, refleks, hava hokeyi, dans ritmi, bowling |
| `match.js` | Maç akışı, olaylar, sezon sonu ve teklifler |

Lig adları gerçek, takımlar ise şehir adlarıyla üretilmiş hayali kulüpler. Karakterler özgün; dizideki karakterler kullanılmadı.
