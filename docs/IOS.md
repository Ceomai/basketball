# iOS / App Store rehberi

`ios/` projesi henüz yok. `npx cap add ios` macOS + Xcode + CocoaPods (ya da Swift Package Manager) ister. Bu depo Linux'ta hazırlandığı için iOS projesi üretilmedi. Aşağıdaki adımlar bir Mac'te sırayla yapılır. Kod tarafındaki iOS hazırlığı bitti; ayrıntısı en sonda.

## 0. Gerekenler

- macOS ve son Xcode (App Store'a yükleme için Apple'ın istediği güncel Xcode/SDK sürümü; App Store Connect yükleme sırasında söyler).
- Apple Developer Program üyeliği (yıllık 99 USD), App Store Connect erişimi.
- Node 22, `npm ci`.

## 1. iOS projesini oluştur

```bash
npm install @capacitor/ios@7
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

`ios/` klasörünü depoya ekle (Capacitor'un `.gitignore`'u `Pods/`, `build/` gibi klasörleri zaten dışarıda bırakır).

## 2. Xcode ayarları

**Signing & Capabilities**

- Team: kendi geliştirici hesabın. Bundle Identifier: `com.potakariyeri.app` (Android ile aynı; App Store Connect'te bu kimlikle uygulama aç).
- **+ Capability → In-App Purchase** (reklamsız paket için zorunlu).
- Push Notifications GEREKMEZ (bildirimler yereldir).

**General**

- Deployment target: iOS 14 veya üstü (AdMob SDK'nın istediği en düşük sürüm, Capacitor 7 için iOS 14).
- Device orientation: yalnızca Portrait. iPad: oyun dar ekrana göre tasarlandı; iPad desteklenecekse iPad ekran görüntüleri de gerekir. İstemiyorsan "Supported Destinations"tan iPad'i kaldır.
- Version (CFBundleShortVersionString) `1.0.0`, Build (CFBundleVersion) her yüklemede artmalı (1, 2, 3...).

**İkon ve açılış ekranı**

- `public/icons/icon-512.png` kaynağından 1024×1024, **saydamlık YOK** bir App Store ikonu üret (Assets.xcassets → AppIcon). Saydam ikon yüklemede reddedilir.
- Splash: `ios/App/App/Assets.xcassets/Splash.imageset`, koyu zemin `#090d15`.

## 3. Info.plist (ios/App/App/Info.plist)

```xml
<!-- AdMob uygulama kimliği (iOS uygulaması için AdMob'da AYRI kimlik açılır) -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>

<!-- App Tracking Transparency istemi metni (zorunlu; yoksa uygulama istem sırasında çöker ve inceleme reddeder) -->
<key>NSUserTrackingUsageDescription</key>
<string>Reklamların sana daha uygun olması için izin istiyoruz. İzin vermesen de oyun ve reklamsız ödüller aynı çalışır. / We ask so ads can be more relevant to you. The game works the same if you decline.</string>

<!-- SKAdNetwork: Google'ın güncel listesinin TAMAMI eklenmeli -->
<key>SKAdNetworkItems</key>
<array>
  <dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>
  <!-- ... https://developers.google.com/admob/ios/quick-start#update_your_infoplist adresindeki listenin tamamı;
       aracılık (mediation) ağları eklersen onların kimlikleri de -->
</array>

<!-- Yalnızca HTTPS; şifreleme beyanı (ek şifreleme yok) -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Türkçe ve İngilizce için istem metnini yerelleştirmek istersen `InfoPlist.strings` (tr.lproj, en.lproj) kullan.

**ATT sırası (kodda hazır):** `src/native.js` önce Google UMP rıza formunu (AB/UK) gösterir, sonra iOS'ta ATT istemini açar, en son AdMob'u başlatır. İstem uygulamanın ilk saniyesinde açılır; Apple bunu kabul eder. İstersen istemi ilk reklamdan hemen önceye taşımak mümkün.

## 4. Gizlilik manifesti (PrivacyInfo.xcprivacy) — ZORUNLU

Apple 2024'ten beri "required reason API" kullanan her uygulamadan gizlilik manifesti ister. Capacitor 7 ve Google Mobile Ads SDK kendi manifestlerini getirir; uygulamanın kendi manifesti de gerekir. Xcode → File → New → File → **App Privacy** → `ios/App/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key><true/>
  <key>NSPrivacyTrackingDomains</key>
  <array>
    <!-- AdMob izleme alan adları: Google Mobile Ads SDK'nın kendi manifestinde listelenir; ek bir şey gerekmez -->
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeDeviceID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><false/>
      <key>NSPrivacyCollectedDataTypeTracking</key><true/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising</string></array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeCrashData</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><false/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- UserDefaults: @capacitor/preferences kayıt yansısı -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array>
    </dict>
  </array>
</dict>
</plist>
```

Sentry (DSN tanımlıysa) ve Firebase (eklenirse) için veri türlerini ekle. Xcode → Product → Archive sonrası "Generate Privacy Report" ile birleşik raporu kontrol et.

## 5. Uygulama içi satın alma (reklamsız paket)

1. App Store Connect → uygulama → **Monetization → In-App Purchases → +** → tür **Non-Consumable**, ürün kimliği `adfree` (Android ile aynı; kod buna bakar), fiyat kademesi, TR+EN görünen ad ve açıklama, inceleme ekran görüntüsü.
2. **Satın alımları geri yükle** düğmesi hazır: Ayarlar → Gizlilik ve verilerin → Satın alımları geri yükle (`src/release.js`, `src/native.js` → `PotaStore.restore`). Apple bu düğmeyi zorunlu tutar; incelemeci arar.
3. Fiyat mağazadan yerel para birimiyle gelir ve düğmede gösterilir (`relAdFreeLabel`).
4. Ödeme sözleşmeleri: App Store Connect → Business → Paid Apps sözleşmesi + banka/vergi bilgileri (yoksa ürünler sandbox dışında görünmez).
5. Test: Xcode StoreKit Configuration dosyası ya da sandbox test kullanıcısı (App Store Connect → Users and Access → Sandbox).

## 6. Yaş derecelendirmesi (App Store Connect → App Information → Age Rating)

Anket yanıtları (dürüst cevap ver; yanlış beyan uygulamanın kaldırılma sebebidir):

| Soru                              | Yanıt                            | Gerekçe                                                                                             |
| --------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Simüle kumar (Simulated Gambling) | **Sık/yoğun (Frequent/Intense)** | Kumarhane (rulet, fişler) ve hipodrom bahsi oyun parasıyla oynanıyor, haritada sürekli erişilebilir |
| Gerçek para ile kumar             | Hayır                            | Fişler satın alınamaz; gerçek para ödülü yok                                                        |
| Alkol, tütün, uyuşturucu atıfları | Seyrek/hafif                     | Gece hayatı ve kulüp metinleri (içerik metinlerini inceleyip karar ver)                             |
| Olgunluk/düşündürücü temalar      | Seyrek/hafif                     | Sakatlık, ayrılık, aile dramı                                                                       |
| Şiddet, cinsellik, korku          | Yok                              |                                                                                                     |
| Sınırsız web erişimi              | Hayır                            | Yalnızca gizlilik sayfası açılır                                                                    |
| Reklam                            | Evet                             | AdMob                                                                                               |

**Sonuç:** Apple'ın yeni yaş grupları (4+/9+/13+/16+/18+) altında yoğun simüle kumar uygulamayı en üst gruba (eski 17+, yeni 18+) taşıyabilir; kesin grubu anket hesaplar. Daha geniş kitle (13+ civarı) istersen **kumar bölümleri kapalı iOS derlemesi**: `VITE_GAMBLING=off npm run build && npx cap sync ios` → kumarhane ve at yarışı bahsi derlemede kapalıdır, ayarlarda da görünmez (`src/focus.js` → `FOCUS_HARD_OFF`). Bu durumda ankette simüle kumar "Yok" olur.

## 7. App Store Connect gizlilik etiketi (App Privacy)

- **Data Used to Track You:** Device ID (AdMob, ATT izniyle).
- **Data Not Linked to You:** Crash Data (Sentry yapılandırılırsa), Product Interaction / Usage Data (Firebase Analytics eklenirse; oyun içi izinle), Advertising Data.
- Bulut kayıt etkinleştirilirse: **Contact Info → Email** (hesap için, bağlı), **User Content → Other** (oyun kayıtları, bağlı).
- Gizlilik politikası URL'si: `https://ceomai.github.io/basketball/privacy.html` (önce iletişim e-postasını doldur).
- Hesap silme: bulut kayıt (Google girişi) açılırsa Apple uygulama içinden hesap silmeyi zorunlu tutar → hazır (Ayarlar → Bulut verilerimi ve hesabımı sil). Ayrıca Apple, üçüncü taraf girişi (Google) sunan uygulamalardan **Sign in with Apple** gibi gizlilik odaklı bir alternatif ister (Guideline 4.8) — bulut kayıt iOS'ta açılacaksa bu eklenmeli ya da iOS'ta bulut kayıt kapalı kalmalı (şu an `CLOUD_CONFIG` boş: kapalı).

## 8. Yükleme

1. `npm run build` (gerçek iOS reklam kimlikleriyle: `VITE_ADMOB_REWARDED_IOS=... VITE_ADMOB_INTERSTITIAL_IOS=... npm run build`), `npx cap sync ios`.
2. `RELEASE_IOS=1 ADMOB_APP_ID=... VITE_ADMOB_...=... node tools/release-check.js` → "Yayın kapısı: tamam".
3. Xcode → Any iOS Device → Product → Archive → Distribute App → App Store Connect.
4. TestFlight'ta dene (satın alma, geri yükleme, ATT, rıza formu, bildirim izni, geri tuşu yok: iOS'ta paneller ✕ ile kapanır).
5. İnceleme notu: "Simulated gambling uses in-game chips only; no real money; can be turned off in Settings → Focus mode. Restore Purchases: Settings → Privacy and your data."

## Kod tarafında iOS için yapılmış olanlar (kontrol edildi)

- **Güvenli alan (notch/Dynamic Island/ev çubuğu):** `index.html` → `viewport-fit=cover` ve bütün sabit öğelerde `env(safe-area-inset-*)`.
- **Ses otomatik çalma:** WebAudio bağlamı ilk dokunuşta `resume()` edilir (`src/audio.js`); iOS sessiz moda saygı duyar.
- **localStorage silinmesi (iOS WKWebView depolama baskısında temizleyebilir):** her kayıt `@capacitor/preferences`'a (UserDefaults, silinmez) yansıtılır; açılışta `storageRestore` en yeni kopyayı geri yükler (`src/native.js`, `src/save.js`).
- **ATT + UMP sırası, çocuklara yönelik değil işareti, Teen içerik tavanı:** `src/native.js`, `src/release.js` → `REL_AD_REQUEST`.
- **Satın alma geri yükleme, bekleyen ödeme, yerel fiyat:** `src/native.js`, `src/release.js`.
- **Gerçek marka adları:** kurgusal (`src/brand.js`); Apple Guideline 5.2.1 (fikri mülkiyet) riskini kaldırır.
