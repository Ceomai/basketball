# Pota Kariyeri

İstanbul'da bir lise takımında başlayıp Avrupa liglerinden EuroLeague ve NBA'e tırmandığın, mobil öncelikli bir basketbol kariyer simülasyonu. Oyunun ana menüsü bir şehir haritası. Karakterler South Park esintili, kağıttan kesilmiş gibi bir tarzla çizildi. Oyun New Star Soccer'ın kariyer döngüsünden esinlendi.

## Nasıl oynanır

Oyunun derlenmiş hali tek bir dosya: `dist/index.html`. Bu dosya bir tarayıcıda çift tıklanarak da açılır.

```bash
npm install
```

```bash
npm run build
```

Geliştirirken canlı yenilenen sunucu için `npm run dev` kullanılır.

**Canlı sürüm:** https://ceomai.github.io/basketball/. `main` dalına her push'ta GitHub Actions oyunu derleyip `gh-pages` dalına yayınlar. Pages üzerinden açılan oyun telefonda ana ekrana eklenebilir ve internetsiz çalışır.

**Oyna ve test et (QR):** https://ceomai.github.io/basketball/qr.html

<img src="public/qr/qr-test.png" width="180" alt="Oyun testi QR kodu"> <img src="public/qr/qr-oyna.png" width="180" alt="Oyna QR kodu">

Soldaki kod oyun testi bağlantısını açar (`?test=1`, katılım onayı sorulur), sağdaki yalnızca oyunu açar.

## Öne çıkanlar

- **Sezon akışı:** her sezon çift devreli 14 maç ve playoff. "Haftayı hızlı geç" boş zaman dilimlerini mantıklı bir planla doldurur; maçı otomatik oynatabilir ya da kendin oynayabilirsin. Kendin oynamak daha yüksek not getirir.
- **Rakip oyuncu:** seninle aynı yaşta, aynı şehirden bir rakip. Kariyeri seninkiyle paralel ilerler; aynı ligde olduğunuzda maçlar derbiye döner, sezon sonunda kıyaslanırsınız.
- **Koçun güveni:** profesyonelken koç her 4 haftada bir rolünü değerlendirir; iyi oynarsan ilk beşe yükselirsin, kötü gidersen yedeğe düşersin.
- **Basın toplantısı:** önemli maçlardan sonra mütevazı, özgüvenli ya da iddialı cevap verirsin. İddialı sözlerin bir sonraki maçta karşılığı olur.
- **Hikâye zincirleri:** birkaç hafta süren olaylar: transfer söylentisi (sezon sonu teklifini etkiler), uzun sakatlıktan dönüş, ailenin dükkânı, lise kaptanlığı, üniversite final haftası.
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
- **Ses ve müzik:** Web Audio ile sentezlenen efektler, maç boyunca tribün uğultusu, haritada sakin bir tema ve eğlence merkezinde 8-bit tema. Ayarlar'dan ayrı ayrı kapatılabilir.
- **Düşük grafik modu:** eski telefonlar için daha düşük çözünürlük, animasyonsuz arayüz, 30 FPS mini oyunlar.
- **Mobil uyum:** hiçbir yerde klavye tuşu gerekmez; mini oyunlar dokunma, kaydırma ve ekrandaki butonlarla oynanır. İsim listeden dokunarak seçilebilir, kayıt kodu panodan yapıştırılabilir. Yatay ekranda oyun alanı ekrana sığar, butonlar parmak boyutunda.
- **Kılavuz:** ilk oyunda kısa tur, istendiğinde ayrıntılı rehber.
- **Kayıt:** 5 kayıt yuvası. Her kayıt hem tarayıcı hafızasına hem IndexedDB'ye yazılır; biri silinir ya da bozulursa diğerinden geri gelir. Yedek dosyası (`.pota`) indirilebilir, paylaşılabilir ve geri yüklenebilir. Oyun birkaç sezonda bir yedek almayı hatırlatır.
- **Denge:** ilerleme, teklif eşikleri ve ödüller otomatik oynayan bir simülasyonla ayarlandı. Zayıf bir oyuncu genelde 1. lig veya EuroLeague'de kalır, ortalama bir oyuncunun NBA şansı yaklaşık dörtte birdir, yetenekli bir oyuncu 25-26 yaşlarında NBA'e ulaşır.

## Android uygulaması

- **Paketleme:** oyun Capacitor ile Android uygulamasına paketlenir (`android/`).
- **Test APK'sı:** her push'ta GitHub Actions → **Android** iş akışı test APK'sı üretir; anahtar deposu tanımlıysa Google Play için imzalı AAB de üretir.
- **Uygulamaya özel özellikler (`src/native.js`):**
  - AdMob reklamları ve Google rıza formu
  - Reklamsız paket satın alma
  - Kayıtların yerel depoya yansıtılması ve Android otomatik yedeği
  - Geri tuşu desteği
  - Yedek dosyasını paylaşma
- **Yerelde derleme:** Android Studio gerekir.

```bash
npm run android
```

```bash
npm run android:open
```

Mağazaya çıkış adımları (AdMob kimlikleri, Play Console, imzalama, veri güvenliği formu): `docs/STORE.md`. Gizlilik politikası: `public/privacy.html`.

## Oyun testi

- **Açma:** Ayarlar → **Oyun testi**. Test bağlantısı için adrese `?test=1` eklenir.
- **Kayıt:** onaylandığında oyun deneyimi anonim olarak cihazda kaydedilir. Kaydedilenler: ekranlar, maçlar, mini oyun başarısı, bırakma noktası, reklamlar, hatalar ve geri bildirim.
- **Gönderim:** oyuncu raporu kendisi gönderir.
- **Analiz:** raporlar bir klasörde toplanır ve şu komutla özetlenir:

```bash
node tools/playtest-report.js <klasör>
```

Testin nasıl yürütüleceği ve bulgulara göre hangi denge ayarının değişeceği: `docs/PLAYTEST.md`.

## Gelir modeli: reklamlar

Reklam oyuncunun tercihidir; geçiş reklamları seyrek ve sınırlıdır. Ayrıntılar `src/ads.js` başında.

| Yerleşim | Ne zaman | Karşılık |
|---|---|---|
| Primi ikiye katla | Maç sonu ekranı | Maç primi bir kez daha ödenir |
| Enerji | Enerji 60'ın altındayken, haftada 2 kez | +30 enerji |
| Soyunma odası | Devre arası | +10 enerji, +4 moral |
| Erken dönüş | Sakatken, sakatlık başına 1 kez | İyileşme 1 hafta kısalır |
| Geçiş reklamı | Maçlar arası, en erken 6. maçtan sonra, en az 3 maç ve 4 dakika arayla | — |

- **Sınır:** günde en fazla 8 ödüllü reklam.
- **Rıza:** ilk reklamdan önce kişiselleştirme izni (KVKK/GDPR) bir kez sorulur.
- **Reklamsız paket:** geçiş reklamlarını kapatır, ödülleri reklamsız verir. Satın alma, mağaza sürümünde `window.PotaStore.buy` kancasına bağlanır.
- **Sağlayıcı:** Capacitor ile paketlenmiş uygulamada AdMob eklentisi (`@capacitor-community/admob`) kullanılır; `src/ads.js` içinde şu an Google'ın test kimlikleri var. Web sürümünde gerçek reklam yoktur, akışı gösteren bir tanıtım ekranı çıkar.

## Mimari

```
index.html          stiller ve sayfa iskeleti
src/main.js         giriş: modülleri sırayla yükler, "late" kaydını doldurur
src/logic/rules.js  saf oyun kuralları (denge, ekonomi, teklifler, ödüller, sakatlık); DOM ve global durum yok
src/content/        veri olarak yazılmış olaylar (events.tr.js, events.en.js) ve motoru (events.js)
src/i18n/           çok dil altyapısı: t("anahtar"), tr.js, en.js
src/*.js            ekranlar ve sistemler (harita, mekanlar, maç motoru, kayıt, hikâye, reklam, ses...)
public/             service worker, manifest, ikonlar
tests/              birim testleri (unit/), duman testi, denge simülasyonu
tools/              tek seferlik dönüşüm araçları (klasik betikten ES modülüne geçiş)
```

- **Modüller:** her dosya ES modülü. Önceki modüllere `import` ile bağlanır. Sonra yüklenen bir modülü çağırmak gerektiğinde `late.ad` kaydı kullanılır. Bu, eski yükleme sırasını koruyarak döngüsel bağımlılık hatalarını önler.
- **Olay sistemi (`Bus`, `src/data.js`):** modüller birbirinin fonksiyonlarını değiştirmez, olaylara abone olur:
  - `on`/`emit`: bildirim (ör. "sakatlık bitti").
  - `use`/`run`: akışı durdurup sürdürebilen ara katman (ör. maç sonu basın toplantısı).
  - `offer`/`first`: haftada tek panel için sıralı sağlayıcılar.
- **Saf kurallar:** denge formülleri `src/logic/rules.js` içinde. Birim testleri (`tests/unit/`) ve `tsc` tip denetimi (JSDoc, sıkı mod) buradan geçer.
- **Kayıt şeması:** `SAVE_V` ve `MIGRATIONS` (`src/save.js`). Yapı değişince sürüm artırılır, eski kayıtlar açılırken adımlar sırayla uygulanır.
- **İçerik:** rastgele olaylar `src/content/events.tr.js` içinde veri olarak duruyor; yeni olay için kod gerekmez. Paket biçimi dosyanın başında anlatılıyor. Çeviriler aynı `id` ile `events.<dil>.js` dosyasına yazılır.
- **Çok dil:** Ayarlar → Dil (Türkçe / English). Tüm ekranlar çevrildi.
  - `src/i18n/tr.js` / `en.js`: elle yazılan anahtarlar.
  - `tr.auto.js` / `en.auto.js`: koddan otomatik çıkarılan yaklaşık 1650 metin.
  - Kişi, şehir ve kulüp adları özel ad olarak çevrilmez.
  - Dil değiştirilince oyun yeniden yüklenir ve aynı kariyer kaldığı yerden açılır.
  - Yeni bir metin eklendiğinde `I18N_SEED=src/i18n/tr.auto.js node tools/extract-i18n.js` çalıştırılır. Var olan anahtarlar korunur, yalnızca yeni metinler yeni anahtar alır ve `en.auto.js`'e çevirisi eklenir.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Stiller ve sayfa iskeleti |
| `src/main.js`, `src/late.js` | Giriş noktası ve geç bağlama kaydı |
| `src/logic/rules.js` | Saf oyun kuralları |
| `src/content/` | Veri olarak rastgele olaylar ve olay motoru |
| `src/i18n/` | Çok dil altyapısı |
| `src/ads.js` | Reklam gelir modeli |
| `src/telemetry.js` | Oyun testi kaydı ve geri bildirim |
| `src/native.js` | Android/iOS uygulama katmanı (Capacitor) |
| `android/` | Android projesi |
| `docs/` | Oyun testi ve mağaza rehberleri |
| `src/data.js` | Ligler, şehirler, pozisyonlar, yardımcılar |
| `src/art.js` | Karakter çizimi, ikonlar, mekan sahneleri, vitrin |
| `src/map.js` | Şehir haritası |
| `src/games.js` | Maç ve antrenman mini oyunları |
| `src/clubs.js` | Gerçek kulüp listeleri (1. ve 2. ligler, EuroLeague, NBA) |
| `src/core.js` | Oyun durumu, ana ekran, panel sistemi |
| `src/save.js` | 5 kayıt yuvası, IndexedDB kopyası, yedek dosyası, kayıt kodu |
| `src/places.js` | Ev, stadyum, okul, medya, aile, kafe |
| `src/casino.js` | Oyun Kulübü (fişle oynanan masa oyunları) |
| `src/shops.js` | AVM mağazaları, market ve eğlence merkezi |
| `src/arcade.js` | Arcade oyunları: pota makinesi, refleks, hava hokeyi, dans ritmi, bowling |
| `src/match.js` | Karar anları, maç sonu, sezon sonu ve teklifler |
| `src/engine.js` | Maç motoru: çeyrekler, rotasyon, oyuncu değişikliği bildirimleri, mola taktikleri |
| `src/extras.js` | Milli takım (U18, U20, A), arcade sıralamaları |
| `src/systems.js` | Ayarlar, istatistikler, ödüller, sakatlıklar, kadro, sözleşme pazarlığı, kılavuz |
| `src/audio.js` | Ses efektleri ve tribün sesi |
| `src/story.js` | Haftayı hızlı geç, otomatik maç, rakip oyuncu, koçun güveni, basın toplantısı, hikâye zincirleri |
| `src/music.js` | Müzik ve görsel cila (sayı animasyonları, ekran geçişleri, düşük grafik modu) |
| `public/` | Service worker, manifest ve ikonlar (uygulama olarak kurulum, internetsiz çalışma) |
| `tests/` | Birim testleri, duman testi ve denge simülasyonu |

## Geliştirme

Node.js 22 gerekir. Tarayıcı testleri için Playwright gerekir.

```bash
npm test
```

`npm test` sırasıyla şunları çalıştırır:
- `eslint`: tanımsız değişken ve import hataları.
- `tsc`: `src/logic` tip denetimi.
- Birim testleri: kurallar ve içerik paketleri.
- Derleme.
- `tests/smoke.js`: oyunu gerçek tarayıcıda dolaşır.
- `tests/balance.js`: kısa denge koşusu.

Ayrıntılı denge raporu için profil başına 10 kariyer:

```bash
npm run test:balance
```

Kod biçimlendirme:

```bash
npm run format
```

Her push'ta GitHub Actions aynı testleri çalıştırır.
