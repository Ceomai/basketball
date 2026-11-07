# Google Play'e çıkış: ilk kez yapanlar için adım adım

Toplam süre: kendi işin 1-2 gün, ama **beklemeler** yüzünden en az ~3 hafta (kimlik doğrulama birkaç gün + zorunlu 14 günlük kapalı test + inceleme birkaç gün). Sırayı bozma; bazı adımlar bir öncekinin bitmesini bekler.

Hazırlık: bilgisayar (Windows/Mac fark etmez), Android telefon, kredi/banka kartı (25 USD), kimlik kartı.

---

## Adım 1 — Bu iş için bir Gmail hesabı aç (10 dk)
1. https://accounts.google.com/signup → yeni Gmail aç (ör. `potakariyeri.destek@gmail.com`).
2. İki adımlı doğrulamayı aç (Google hesabı → Güvenlik).
3. Bu adres **gizlilik politikasında görünecek iletişim adresi** olacak. Her şeyi (Play Console, AdMob) bu hesapla yapacaksın.

## Adım 2 — Google Play geliştirici hesabı (30 dk + 1-7 gün bekleme)
1. https://play.google.com/console → bu Gmail ile giriş → "Kendim için" (kişisel hesap) seç.
2. 25 USD tek seferlik ücreti öde.
3. Kimlik doğrulamayı tamamla (kimlik fotoğrafı, adres, telefon). Onay birkaç gün sürebilir; bu sırada sonraki adımlarla devam et.

## Adım 3 — İletişim e-postasını oyuna yazdır (2 dk)
Gizlilik sayfalarında 4 yerde `[iletişim e-postası]` yazıyor; dolmadan yayın paketi üretilmez.
- En kolayı: e-posta adresini bana yaz, ben yerleştirip yayına alayım.
- (Kendin yapmak istersen: GitHub'da `public/privacy.html` ve `public/delete-data.html` dosyalarını aç → kalem ikonu → yer tutucuları adresinle değiştir → "Commit changes".)

## Adım 4 — AdMob (reklam) hesabı (30 dk)
1. https://admob.google.com → aynı Gmail ile kaydol (ülke, saat dilimi, ödeme para birimi).
2. **Uygulamalar → Uygulama ekle** → Android → "Uygulama Google Play'de yayınlandı mı?" → **Hayır** → ad: Pota Kariyeri.
3. Açılan sayfadaki **Uygulama kimliği**ni kopyala (biçim: `ca-app-pub-1234567890123456~1234567890`). Bir not dosyasına yaz: `ADMOB_APP_ID`.
4. **Reklam birimleri → Reklam birimi ekle → Ödüllü** → ad: "Odullu" → oluştur → kimliği kopyala (biçim: `ca-app-pub-...../...`): `ADMOB_REWARDED_ANDROID`.
5. Tekrar **Reklam birimi ekle → Geçiş (Interstitial)** → ad: "Gecis" → kimliği kopyala: `ADMOB_INTERSTITIAL_ANDROID`.
6. **Gizlilik ve mesajlaşma → GDPR → Mesaj oluştur** → uygulamanı seç → dilleri (Türkçe, İngilizce) ekle → **Yayınla**. (Avrupa'daki oyunculara izin formu bunun sayesinde çıkar.)
7. **Ayarlar → Test cihazları → Test cihazı ekle** → kendi telefonunu ekle. ÖNEMLİ: kendi reklamına gerçek modda tıklarsan AdMob hesabın kapanabilir; test cihazında reklamlar "test" diye görünür.

## Adım 5 — İmza anahtarı (uygulamanın "mührü") oluştur (20 dk)
Bu dosyayı **asla kaybetme**: kaybedersen güncelleme yayınlayamazsın.
1. Java kur: https://adoptium.net → "Latest LTS" indir ve kur (Windows: .msi, "Set JAVA_HOME" kutusunu işaretle).
2. Komut satırını aç (Windows: Başlat → "cmd"; Mac: Terminal) ve şunu yaz:
   ```
   keytool -genkey -v -keystore pota-release.jks -alias pota -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Sorular: şifre iste (unutmayacağın güçlü bir şifre — buna **anahtar deposu şifresi** diyeceğiz), ad-soyad, şehir, ülke kodu `TR`. Sonunda "Enter key password" sorarsa Enter'a basıp aynı şifreyi kullanabilirsin (o zaman **anahtar şifresi = depo şifresi**).
4. Oluşan `pota-release.jks` dosyasını **iki ayrı yere** yedekle (ör. Google Drive + USB bellek). Şifreleri de bir şifre yöneticisine yaz.
5. Dosyayı metne çevir (GitHub'a yüklemek için):
   - Windows (cmd, dosyanın olduğu klasörde): `certutil -encodehex -f pota-release.jks pota.b64 0x40000001` → oluşan `pota.b64` dosyasını Not Defteri ile aç, içindekinin **hepsini** kopyala.
   - Mac: `base64 -i pota-release.jks | pbcopy` (panoya kopyalanır).

## Adım 6 — GitHub'a 7 gizli değer gir (10 dk)
GitHub → depo `Ceomai/basketball` → **Settings → Secrets and variables → Actions → New repository secret**. Her biri için "Name" ve "Secret" kutularını doldur:

| Name | Secret (değer) |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Adım 5.5'te kopyaladığın uzun metin |
| `ANDROID_KEYSTORE_PASSWORD` | anahtar deposu şifresi |
| `ANDROID_KEY_ALIAS` | `pota` |
| `ANDROID_KEY_PASSWORD` | anahtar şifresi (genelde depo şifresiyle aynı) |
| `ADMOB_APP_ID` | Adım 4.3'teki kimlik (~ işaretli olan) |
| `ADMOB_REWARDED_ANDROID` | Adım 4.4'teki kimlik |
| `ADMOB_INTERSTITIAL_ANDROID` | Adım 4.5'teki kimlik |

## Adım 7 — Yayın paketini (AAB) indir (15 dk, çoğu bekleme)
1. GitHub → **Actions → Android → Run workflow** (sağdaki düğme) → dal `main` → Run. (Ya da bana "derlemeyi başlat" de.)
2. ~10 dk sonra çalıştırma yeşil olunca içine gir → en altta **Artifacts** → `pota-kariyeri-release-aab` indir → zip'i aç → içindeki `.aab` dosyası yükleyeceğin paket.
3. Kırmızı olursa ("Yayın kapısı" adımı) bana yaz; genelde eksik bir secret ya da e-posta yer tutucusudur.

## Adım 8 — Play Console'da uygulamayı oluştur (15 dk)
(Adım 2'deki kimlik doğrulaması bitmiş olmalı.)
1. Play Console → **Uygulama oluştur**:
   - Uygulama adı: `Pota Kariyeri: Basketbol Hayatı`
   - Varsayılan dil: Türkçe – tr-TR
   - Uygulama mı oyun mu: **Oyun**; Ücretsiz mi: **Ücretsiz**
   - Beyan kutularını işaretle → Oluştur.
2. Sol menü **Ayarlar → Uygulama imzalama**: "Google Play Uygulama İmzalama" açık kalsın (varsayılan). Yüklediğin anahtar "yükleme anahtarı" olur; kaybedersen Google'dan sıfırlama istenebilir.

## Adım 9 — "Uygulama içeriği" formları (45 dk)
Sol menü **Politika → Uygulama içeriği**. Her başlığa gir, şöyle doldur:
1. **Gizlilik politikası:** `https://ceomai.github.io/basketball/privacy.html`
2. **Uygulama erişimi:** "Tüm işlevler özel erişim olmadan kullanılabilir".
3. **Reklamlar:** "Evet, uygulamam reklam içeriyor".
4. **İçerik derecelendirmesi:** anketi başlat → kategori "Oyun" → sorulara dürüst cevap ver. Önemli olanlar: şiddet yok; **simüle kumar: Evet** (oyunda fişli kumarhane ve at yarışı bahsi var, gerçek para yok); kullanıcılar arası iletişim yok; konum paylaşımı yok. Sonuç genelde PEGI 12 / 12+ çıkar.
5. **Hedef kitle ve içerik:** yaş grupları **13-15, 16-17, 18+** (13 altını seçme; seçersen aile politikaları ve özel reklam kuralları devreye girer). "Uygulama çocuklara hitap ediyor mu" → Hayır.
6. **Haber uygulaması:** Hayır.
7. **Veri güvenliği:**
   - Veri toplanıyor mu: **Evet** (reklam kimliği için).
   - Toplanan veri: **Cihaz veya diğer kimlikler** → amaç: Reklam veya pazarlama → Google ile paylaşılıyor.
   - Aktarım şifreli: Evet. Kullanıcı silme isteyebilir: Evet.
   - Silme bağlantısı istenirse: `https://ceomai.github.io/basketball/delete-data.html`
   - (Ayrıntılı tablo: `docs/STORE.md` §2.)
8. **Reklam kimliği:** "Evet, reklam kimliği kullanıyor" → Reklam.
9. **Devlet uygulaması / Finansal özellikler / Sağlık:** Hayır.

## Adım 10 — Mağaza sayfası (30 dk)
Sol menü **Büyüme → Mağaza girişi → Ana mağaza girişi**:
1. Kısa ve uzun açıklama: `docs/STORE_LISTING.md` içinden Türkçe metni kopyala-yapıştır.
2. **Uygulama simgesi** (512×512): `public/icons/icon-512.png`
3. **Öne çıkan grafik** (1024×500): `store/graphics/feature-tr.png`
4. **Telefon ekran görüntüleri**: `store/screens/tr/` içindeki 8 görüntü (sırayla yükle).
5. Kategori: **Spor**; iletişim e-postası: Adım 1'deki adres.
6. İngilizce eklemek için: "Çevirileri yönet" → İngilizce (ABD) ekle → `docs/STORE_LISTING.md` İngilizce metni + `store/graphics/feature-en.png` + `store/screens/en/`.
7. Kaydet.

## Adım 11 — Kapalı test (zorunlu: en az 12 kişi, 14 gün)
Yeni kişisel hesaplarda üretime çıkmadan önce **en az 12 testçinin 14 gün boyunca** kapalı testte kalması şart.
1. 12-20 kişi bul (arkadaş, aile). Hepsinin Gmail adresini topla. Bir Google Grubu kurmak en kolayı: https://groups.google.com → Grup oluştur (ör. `pota-testciler`) → herkesi ekle.
2. Play Console → **Test → Kapalı test → Kanal oluştur** (ör. "Testçiler") → **Testçiler** sekmesi → Google Grubu e-postasını ekle.
3. **Sürüm oluştur** → Adım 7'deki `.aab` dosyasını yükle → sürüm notu: "İlk test sürümü" → Kaydet → İncele → **Kapalı teste sun**.
4. İlk incelemesi birkaç saat-birkaç gün sürer. Onaylanınca "Testçiler" sekmesindeki **katılım bağlantısını** testçilere gönder: bağlantıya girip "Test kullanıcısı ol"a basmalı, sonra Play'den uygulamayı indirmeli.
5. 14 gün boyunca testçiler uygulamayı silmesin ve arada açsın. Geri bildirimleri bana ilet; düzeltirim, yeni AAB'yi aynı kanala yüklersin (testi sıfırlamaz).

## Adım 12 — Reklamsız paket ürünü (10 dk; ilk AAB yüklendikten sonra açılır)
Play Console → **Para kazanma → Ürünler → Uygulama içi ürünler → Ürün oluştur**:
- Ürün kimliği: `adfree` (aynen böyle, değiştirme)
- Ad: "Reklamsız paket", açıklama: "Bütün reklamları kaldırır."
- Fiyat: ör. ₺49,99 → Kaydet → **Etkinleştir**.
- Ödeme alabilmek için **Ayarlar → Ödeme profili** oluştur (banka/IBAN, vergi bilgisi).

## Adım 13 — app-ads.txt (15 dk; reklam gelirinin kısılmaması için)
1. AdMob → Uygulamalar → **app-ads.txt** → sana verilen tek satırı kopyala.
2. GitHub'da **yeni depo** oluştur, adı tam olarak: `ceomai.github.io` (herkese açık).
3. İçine `app-ads.txt` adlı dosya oluştur, satırı yapıştır, kaydet. Depo → Settings → Pages → Source: `main` → kaydet.
4. Play Console → Mağaza ayarları → **Web sitesi**: `https://ceomai.github.io`
(İstersen bunu da ben hazırlarım; depoyu oluşturup bana haber ver.)

## Adım 14 — Üretime erişim başvurusu (14 gün dolunca)
1. Play Console → **Kontrol paneli** → "Üretime erişim başvurusu" → test hakkındaki soruları cevapla (kaç testçi, ne geri bildirim aldın, ne düzelttin).
2. Onay genelde birkaç gün (en çok ~7 gün).

## Adım 15 — Yayınla!
1. **Test → Kapalı test** → son sürümün yanında **Sürümü yükselt → Üretim** (ya da Üretim → Yeni sürüm → aynı AAB).
2. Ülkeler: "Tüm ülkeler" ya da Türkiye ile başla.
3. İncele → **Üretime sun**. İnceleme 1-7 gün. Onaylanınca mağazada!
4. AdMob → Uygulamalar → uygulamanı **Google Play'e bağla** (mağazada çıktıktan sonra).

## Sonrası
- Güncelleme: kod değişince GitHub Actions yeni AAB üretir (sürüm numarası kendiliğinden artar) → Play Console'da yeni sürüm olarak yükle.
- Play Console → **Android vitals**: çökmeleri ve donmaları buradan izle.
- Yorumlara cevap ver; ilk haftalarda değerlendirmeler sıralamayı çok etkiler.

## Asla yapma
- Kendi reklamına (test cihazı değilken) tıklama.
- `pota-release.jks` ve şifreleri kimseyle paylaşma, GitHub'a dosya olarak yükleme (yalnız Secrets).
- Formlarda yanlış beyan (ör. kumar sorusuna "Hayır") — uygulama kaldırılabilir.
