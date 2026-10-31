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
  - Oyun Kulübü: rulet, blackjack, slot. Gerçek para yok; haftalık yenilenen fişlerle oynanır. 18 yaşından önce girilemez.
  - Market, AVM (6 mağaza), kafe ve aile evi.
- **Milli takım:** gençken U18 ve U20, profesyonelken A Milli Takım. FIBA arası kampları ve yaz turnuvalarında madalya.
- **Arcade sıralaması:** haftalık ve aylık tablolar, ilk üçe ödül, aylık birinciye kupa.
- **Ev:** aldığın eşyaların, kupaların ve formaların sergilendiği bir vitrin odası.
- **Gerçek kulüpler:** 1. ve 2. liglerde, EuroLeague'de ve NBA'de gerçek kulüp adları. 3. ligler, lise ve üniversite takımları hayali.
- **Sakatlıklar:** yorgunluk ve yaşla artan risk. Sakatken maçları tribünden izlersin, fizyoterapi iyileşmeyi hızlandırır.
- **Sözleşme pazarlığı:** maaş, süre, rol ya da imza parası istenebilir. Fazla zorlarsan kulüp masadan kalkar.
- **İstatistik ve ödüller:** sezon sezon istatistik geçmişi; MVP, krallıklar, yılın çaylağı, final MVP ve All-Star (üçlük yarışmasıyla).
- **Takım arkadaşları:** kadro ekranı, kimya, takım yemeği ve ekstra antrenman.
- **Ses:** Web Audio ile sentezlenen efektler ve maç boyunca tribün uğultusu. Ayarlar'dan kapatılabilir.
- **Mobil uyum:** hiçbir yerde klavye tuşu gerekmez; mini oyunlar dokunma, kaydırma ve ekrandaki butonlarla oynanır. İsim listeden dokunarak seçilebilir, kayıt kodu panodan yapıştırılabilir. Yatay ekranda oyun alanı ekrana sığar, butonlar parmak boyutunda.
- **Kılavuz:** ilk oyunda kısa tur, istendiğinde ayrıntılı rehber.
- **Kayıt:** 5 kayıt yuvası, her yuva için otomatik yedek ve kayıt kodu ile dışa/içe aktarma.
- **Denge:** ilerleme, teklif eşikleri ve ödüller otomatik oynayan bir simülasyonla ayarlandı. Zayıf bir oyuncu genelde 1. lig veya EuroLeague'de kalır, ortalama bir oyuncunun NBA şansı yaklaşık dörtte birdir, yetenekli bir oyuncu 25-26 yaşlarında NBA'e ulaşır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Stiller ve sayfa iskeleti |
| `data.js` | Ligler, şehirler, pozisyonlar, yardımcılar |
| `art.js` | Karakter çizimi, ikonlar, mekan sahneleri, vitrin |
| `map.js` | Şehir haritası |
| `games.js` | Maç ve antrenman mini oyunları |
| `clubs.js` | Gerçek kulüp listeleri (1. ve 2. ligler, EuroLeague, NBA) |
| `core.js` | Oyun durumu, ana ekran, panel sistemi |
| `save.js` | 5 kayıt yuvası, yedekleme, kayıt kodu |
| `places.js` | Ev, stadyum, okul, medya, aile, kafe |
| `casino.js` | Oyun Kulübü (fişle oynanan masa oyunları) |
| `shops.js` | AVM mağazaları, market ve eğlence merkezi |
| `arcade.js` | Arcade oyunları: pota makinesi, refleks, hava hokeyi, dans ritmi, bowling |
| `match.js` | Karar anları, maç sonu, olaylar, sezon sonu ve teklifler |
| `engine.js` | Maç motoru: çeyrekler, rotasyon, oyuncu değişikliği bildirimleri, mola taktikleri |
| `extras.js` | Milli takım (U18, U20, A), arcade sıralamaları, yerel hikâye olayları |
| `systems.js` | Ayarlar, istatistikler, ödüller, sakatlıklar, kadro, sözleşme pazarlığı, kılavuz |
| `audio.js` | Ses efektleri ve tribün sesi |

Kulüp adları yalnızca tanınırlık için kullanıldı; logolar ve renkler basit temsillerdir. Oyuncunun lisesi ve üniversitesi hayali. Karakterler özgün; dizideki karakterler kullanılmadı.
