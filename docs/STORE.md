# Mağazaya çıkış rehberi (Android önce)

Oyun Capacitor ile Android uygulamasına paketlenir. Kod hazır. Aşağıdaki adımlar senin hesaplarınla yapılması gereken işler.

## Hazır olanlar

- `android/` projesi.
- Uygulama kimliği `com.potakariyeri.app`. Play'e ilk yüklemeden sonra değiştirilemez; değiştirmek istersen şimdi `capacitor.config.json` ve `android/app/build.gradle` içinde değiştir.
- İkonlar, açılış ekranı, dikey ekran, Android geri tuşu desteği.
- **Reklam:** AdMob eklentisi, Google rıza formu (UMP) ve oyun içi reklam yerleşimleri (`src/ads.js`). Şu an Google'ın **test** kimlikleri kullanılıyor.
- **Satın alma:** reklamsız paket (`src/native.js`, ürün kimliği `adfree`).
- **Kayıtlar:** tarayıcı hafızası ve IndexedDB'ye ek olarak yerel depoya (Preferences) da yazılır. Android otomatik yedekleme açık; kayıtlar kullanıcının Google hesabına yedeklenir ve yeni telefona kurulumda geri gelir.
- **Gizlilik politikası:** `public/privacy.html`. Derlenince `dist/privacy.html`; GitHub Pages'te `.../privacy.html` adresinde yayınlanır.
- **Derleme:** GitHub Actions → **Android** her push'ta test APK'sı üretir. Anahtar deposu tanımlıysa imzalı AAB de üretir.

## 1. Test APK'sını dene

1. GitHub → Actions → **Android** → son çalıştırma → Artifacts → `pota-kariyeri-debug-apk`.
2. Zip'i aç, APK'yı telefona at ve kur (bilinmeyen kaynaklara izin ver).
3. Reklamlar test reklamı olarak görünür; bu normaldir.

## 2. Google Play Console

1. https://play.google.com/console : geliştirici hesabı (tek seferlik 25 USD).
2. Yeni uygulama → ad: **Pota Kariyeri**, varsayılan dil Türkçe, oyun, ücretsiz.
3. **Uygulama içeriği** bölümü:
   - **Gizlilik politikası:** Pages adresindeki `privacy.html`. Önce dosyadaki `[iletişim e-postası]` alanını doldur.
   - **Reklamlar:** "Evet, reklam içeriyor".
   - **Hedef kitle:** 13+ öner. 13 altı seçilirse Aileler politikası ve sertifikalı reklam ağı gerekir.
   - **Veri güvenliği formu:**
     - Toplanan: "Cihaz veya diğer kimlikler (reklam kimliği)" → amaç reklam (AdMob), paylaşım: Google.
     - Uygulama etkinliği: yalnızca kullanıcı oyun testini açıp raporu kendi gönderirse.
     - Şifreleme: aktarım yok.
     - Silme: uygulama içinden (Ayarlar → Kaydı temizle).
   - **İçerik derecelendirmesi anketi:** şiddet yok, kumar yok. Oyun Kulübü yalnızca oyun içi fişle çalışıyor ama "simüle kumar" sorusuna **evet** demek gerekir; bu derecelendirmeyi yükseltir. Mağaza sürümünden Oyun Kulübü'nü kaldırmak istersen söyle.
4. **Ürünler → Uygulama içi ürünler →** ürün kimliği `adfree`, tek seferlik, fiyat (örn. ₺49,99), etkinleştir.

## 3. AdMob

1. https://admob.google.com : uygulama ekle (Android, Play'de yayımlanmadıysa "henüz yayımlanmadı").
2. **Uygulama kimliği** (`ca-app-pub-XXXX~YYYY`) → `android/app/src/main/res/values/strings.xml` → `admob_app_id`.
3. İki reklam birimi oluştur: **Ödüllü** ve **Geçiş**. Kimlikleri `src/ads.js` → `ADS_CFG.admob` içine yaz. Ödüllü yerleşimler (maç primi, enerji, devre arası, sakatlık, son hücum, ek teklif, geri çağırma, sezon sonu, antrenman, günlük kutu) aynı birimi kullanır; raporlamada ayrıştırmak istenirse her yerleşime ayrı birim açılabilir.
4. AdMob → Gizlilik ve mesajlaşma → **GDPR (AB) mesajı** oluştur. Uygulamadaki rıza formu bunu gösterir.
5. Gerçek kimliklerle **kendi telefonunda reklamlara tıklama**; hesabın kapanabilir. Testi test kimlikleriyle ya da AdMob'da test cihazı tanımlayarak yap.
6. **Aracılık (mediation), gelirin en ucuz artışı (%20-40):** AdMob → Aracılık → aracılık grubu oluştur (Ödüllü ve Geçiş için ayrı ayrı) → kaynak olarak AppLovin, Unity Ads, Meta Audience Network, Liftoff ekle (her birinde hesap açıp uygulama tanımlamak gerekir). Her ağın Android bağdaştırıcısı `android/app/build.gradle` içine `implementation 'com.google.ads.mediation:<ağ>:<sürüm>'` olarak eklenir. Oyun kodunda değişiklik gerekmez.
7. **Uygulama içi tanıtım (house ads):** başka uygulamalarınız varsa AdMob → Kampanyalar → "Kendi tanıtım kampanyası" ile reklam boşluklarında ücretsiz gösterilir.

## 3b. Uzaktan ayar ve A/B (hazır, ek iş yok)

- Dosya: `public/remote-config.json` → yayında `https://ceomai.github.io/basketball/remote-config.json`. Uygulama açılışta alır (5 sn zaman aşımı), son alınanı saklar; internet yoksa onu, o da yoksa `src/remote.js` varsayılanlarını kullanır.
- Değiştirilebilenler: günlük ödüllü sınırı, enerji reklamı, geçiş reklamı eşikleri (`minGames`, `everyGames`, `minGapMs`, `breakGapMs`, `breaks`) ve yeni ödüllü yerleşimlerin her biri (`rewards`). Sayılar güvenli aralığa kırpılır; bilinmeyen alan yok sayılır.
- **A/B deneyi:** `experiments` listesine `{ "id": "...", "on": true, "variants": { "A": {...}, "B": {...} } }`. Her kurulum kararlı bir kovaya düşer. Şu an açık deney: `inter_start` (ilk geçiş reklamı 6. maç mı 4. maç mı).
- Değişiklik `main`'e push edilince Pages'e çıkar; uygulama güncellemesi gerekmez.

## 3c. Firebase Analytics (elde tutma ve reklam ölçümü)

Olay katmanı hazır (`src/analytics.js`): `active_day` (kurulumdan bu yana gün), `ad_offer`/`ad_reward`/`ad_inter` (yerleşim bazında), `ad_cap`, `purchase`, `career_start`, `season_end`, `retire`; A/B kovaları kullanıcı özelliği (`ab_<deney>`). Yalnızca reklam izninde "izin ver" denmişse gönderilir. Firebase bağlanana kadar aynı özet cihazda tutulur ve oyun testi raporuna eklenir. Bağlamak için:
1. https://console.firebase.google.com → proje → Android uygulaması ekle (paket adı `com.potakariyeri.app`) → `google-services.json` indir → `android/app/` içine koy.
2. `npm install @capacitor-firebase/analytics firebase` → `npx cap sync android`.
3. Firebase'i AdMob'a bağla (AdMob → Uygulama ayarları → Firebase bağlantısı): böylece kullanıcı başına reklam geliri ve elde tutma aynı panelde görünür.
4. Play veri güvenliği formuna "Uygulama etkileşimleri / analitik" ekle.

## 4. İmzalama anahtarı ve yayın paketi

1. Anahtar oluştur ve **güvenli sakla**. Kaybedersen güncelleme yayınlayamazsın; Play App Signing açık olsa bile yükleme anahtarı gerekir.
   ```bash
   keytool -genkey -v -keystore pota-release.jks -alias pota -keyalg RSA -keysize 2048 -validity 10000
   ```
2. GitHub → Settings → Secrets and variables → Actions → şu gizli değerleri ekle:
   - `ANDROID_KEYSTORE_BASE64`: `base64 -w0 pota-release.jks` çıktısı
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`pota`), `ANDROID_KEY_PASSWORD`
3. Sonraki push'ta Actions → Android → `pota-kariyeri-release-aab` çıkar. Sürüm kodu her çalıştırmada otomatik artar.
4. Play Console → **Test → İç test** → yeni sürüm → AAB'yi yükle → test kullanıcılarının e-postalarını ekle. Bu, `docs/PLAYTEST.md`'deki oyun testi için en temiz dağıtım yoludur.
5. Test bitince **Üretim** kanalına terfi ettir. İlk incelemede 1-7 gün beklenebilir.

## 5. Mağaza sayfası

- Kısa ve uzun açıklama (Türkçe ve İngilizce): hazır metinler `docs/STORE_LISTING.md`.
- Ekran görüntüleri: `npm run build:single && npm run screenshots` → `store/screens/tr` ve `store/screens/en` (1080×2338, 8'er adet). 512×512 ikon (`public/icons/icon-512.png`), 1024×500 tanıtım görseli.
- Düşük donanım ve kayıt boyutu: `npm run perf` (CPU 4x yavaş; hafta süresi, ana ekran çizimi, kayıt boyutu) → `reports/perf-check.md`.
- Bulut kayıt: Google girişi + Firebase (bkz. 8. bölüm); çakışma kararı birim testinde (`tests/unit/remote.test.mjs`, "bulut kayıt çakışma kararı").
- Kategori: Spor. Etiketler: basketbol, kariyer, menajer.

## 6. Yayın öncesi kontrol listesi

- [ ] `strings.xml` → gerçek `admob_app_id`
- [ ] `src/ads.js` → gerçek ödüllü ve geçiş reklam birimi kimlikleri
- [ ] `privacy.html` → iletişim e-postası
- [ ] Play'de `adfree` ürünü etkin
- [ ] Kulüp adları: gerçek kulüp, NBA ve EuroLeague adları marka sorunu yaratabilir. Mağaza sürümü için kurgusal adlar önerilir.
- [ ] Görsel tarz ve Oyun Kulübü kararı (derecelendirme)
- [ ] İç testte en az 20 kişi, `tools/playtest-report.js` raporu incelendi

## 7. Hata raporlama (Sentry, isteğe bağlı)

Hatalar her durumda cihazda saklanır (son 30) ve oyun testi raporuna eklenir. Sunucuya göndermek için:

1. sentry.io'da ücretsiz hesap ve bir "Browser JavaScript" projesi aç.
2. Proje ayarlarındaki DSN'i `src/errors.js` → `SENTRY_DSN` içine yaz.
3. Gönderilenler: hata mesajı, yığın izinin ilk satırları, sürüm, dil, platform, kariyer evresi. Kişisel veri yok; oturum başına en fazla 10 hata.
4. Oyuncu Ayarlar → Hata raporları ile kapatabilir. Play Console'daki veri güvenliği formunda "Uygulama etkinliği → çökme günlükleri" işaretlenmeli.

Android'deki yerel çökmeler Play Console → Android vitals'ta ayrıca görünür.

## 8. Bulut kayıt (Google + Firebase, isteğe bağlı)

Kod hazır ama yapılandırılana kadar kapalı (Ayarlar'da "Yakında" yazar). Firebase SDK eklenmez, REST arayüzleri kullanılır.

1. console.firebase.google.com → yeni proje.
2. Authentication → Sign-in method → Google'ı aç.
3. Firestore Database oluştur. Kurallar:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /saves/{uid}/slots/{slot} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. Proje ayarlarından Web API anahtarını ve proje kimliğini, Google Cloud → Kimlik bilgileri'nden OAuth web istemci kimliğini al; `src/cloud.js` → `CLOUD_CONFIG` içine yaz.
5. Web'de (GitHub Pages) giriş Google Identity Services ile çalışır; OAuth istemcisine `https://ceomai.github.io` yetkili kaynak olarak eklenmeli.
6. Android'de Google, WebView içinden girişe izin vermez. Yerel bir Google girişi eklentisi (ör. Capacitor Google Auth / Credential Manager) eklenip `window.PotaNative.googleIdToken()` bir kimlik belirteci (ID token) döndürecek şekilde bağlanmalı. Bu adım henüz yapılmadı.
7. Gizlilik politikası ve Play veri güvenliği formu: e-posta adresi (hesap yönetimi için) ve oyun kayıtları buluta gönderiliyor.

## 9. Bildirimler

`@capacitor/local-notifications` ile yalnızca cihazda planlanır; sunucu yok. Android 13+ ilk planlamada bildirim izni ister. Ayarlar → Bildirimler ile kapatılabilir.

## iOS (sonra)

iOS paketi macOS ve Xcode ister.

```bash
npm install @capacitor/ios@7
```

```bash
npx cap add ios
```

Ardından `Info.plist` içine `GADApplicationIdentifier` ve ATT izni metni eklenir, App Store Connect'te ürün `adfree` tanımlanır. Apple geliştirici hesabı yıllık 99 USD.
