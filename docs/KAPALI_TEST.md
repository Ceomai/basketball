# Kapalı test rehberi (Google Play) · Closed testing guide

20-30 kişiyle Google Play üzerinden test kurmak, oyun içi "Oyun testi" kaydını açtırmak ve raporu çıkarmak için kısa yol. Genel oyun testi rehberi: `docs/PLAYTEST.md`. Mağaza ve imzalama ayarları: `docs/STORE.md`.

_English version below._

---

## 1. Kanalı seç

| Kanal | Ne zaman | Not |
|---|---|---|
| **Dahili test** | İlk 5-10 kişi, hızlı deneme | En çok 100 testçi. İnceleme genelde beklenmez, sürüm dakikalar içinde gelir. |
| **Kapalı test** | 20-30 kişilik asıl test | E-posta listesi ya da Google Grubu ile. İlk sürüm Google incelemesinden geçer (birkaç saat ile birkaç gün arası). |

Yeni bir kişisel geliştirici hesabıyla üretime çıkmadan önce Google, belirli sayıda testçinin kapalı testte belirli bir süre kalmasını şart koşar. Bu yazı yazıldığında koşul **en az 12 testçi, kesintisiz 14 gün** idi. Güncel koşulu Play Console → Kontrol paneli'nde kontrol et. 20-30 kişilik test bu koşulu rahatça karşılar.

## 2. Adım adım kurulum

1. **AAB'yi üret:** GitHub → Actions → **Android** iş akışı → `pota-kariyeri-release-aab` çıktısını indir. Anahtar deposu gizli değerleri tanımlı olmalı (bkz. `docs/STORE.md` 4. bölüm).
2. **Testçi listesi:** Play Console → **Test ve yayınla → Test → Kapalı test** → kanalı aç (ör. "Alpha") → **Testçiler** sekmesi. Ya bir **e-posta listesi** oluştur (testçilerin Play Store'da kullandığı Gmail adresleri), ya da bir **Google Grubu** adresi ekle. Grup, sonradan kişi eklemeyi kolaylaştırır.
3. **Geri bildirim adresi:** aynı sekmede "Geri bildirim URL'si veya e-posta adresi" alanına kendi adresini yaz.
4. **Sürüm oluştur:** **Sürümler → Yeni sürüm oluştur** → AAB'yi yükle → sürüm notu yaz. Kısa örnek: "Kapalı test. Ayarlar → Oyun testi'ni açıp oyna, sonunda Raporu gönder."
5. **Ülkeler:** Türkiye'yi ve testçilerin bulunduğu diğer ülkeleri seç.
6. **İncelemeye gönder:** **Sürümü incele → Kapalı teste yayınla**. Uygulama içeriği formları (gizlilik politikası, veri güvenliği, reklam, hedef kitle) eksikse burada uyarı çıkar. Veri güvenliği formunda oyun testi kaydını "yalnızca kullanıcı açıp kendisi gönderirse" olarak işaretle.
7. **Katılım bağlantısını paylaş:** Testçiler sekmesindeki **"Testçilerin nasıl katılacağı" → web bağlantısını** kopyala. Testçi bu bağlantıyı Play Store'daki Google hesabıyla açar, "Testçi ol"a basar, sonra Play Store'dan yükler.
8. **Güncelleme:** yeni AAB yükleyince testçilere normal güncelleme olarak gelir. Sürüm kodu Actions'ta otomatik artar.

Sık sorun: testçi uygulamayı göremiyorsa ya listede olmayan bir hesapla giriş yapmıştır ya da katılım bağlantısını açmamıştır. Telefonda birden fazla Google hesabı varsa Play Store'da doğru hesaba geçmesini söyle.

## 3. Testçiden ne istenir

Gruba gönderilecek mesaj:

> "Pota Kariyeri'nin kapalı testine hoş geldin. 1) Bağlantıdan katıl, Play Store'dan yükle. 2) Oyunu açınca **Ayarlar → Oyun testi → Açık**, sonra **Katılıyorum**. 3) 3-5 gün boyunca canın istediği kadar oyna; sıkılırsan bırak, bu da bize bilgi verir. 4) Bitirince **Ayarlar → Oyun testi → Raporu gönder** ile dosyayı bana WhatsApp ya da e-postayla yolla. Sezon sonundaki kısa geri bildirim kutusunu doldurursan çok iyi olur."

- Testçiye **ipucu verme**. Nerede takıldığını görmek istiyoruz.
- Kayıt anonimdir: isim, telefon, konum ya da cihaz kimliği tutulmaz. Rastgele bir test kimliği üretilir. Onay verilmeden hiçbir şey kaydedilmez.
- Testçi dilerse aynı yerden **Kaydı temizle** diyebilir ya da testi kapatabilir.

## 4. "Oyun testi" kaydını açtırma

- **Android uygulaması:** ana ekranın altındaki **Ayarlar** → **Oyun testi** satırı → **Kapalı** düğmesi → onay ekranında **Katılıyorum**. Satır "Açık · N kayıt" olur. Açıkken ana ekranda kısa bir geri bildirim düğmesi de görünür.
- **Web sürümü:** adresin sonuna `?test=1` ekle. Onay ekranı ilk açılışta bir kez gösterilir.
- **Raporu gönder:** uygulamada telefonun paylaşım menüsü açılır. Web'de paylaşım desteklenmiyorsa dosya indirilir. Dosya adı `pota-test-<kimlik>-<tarih>.json` biçimindedir.
- **Otomatik toplama (isteğe bağlı):** `src/telemetry.js` → `TELEMETRY_ENDPOINT` alanına bir adres yazılırsa rapor oraya da gönderilir. Uygulama arka plana alındığında da gönderilir. Google Apps Script kurulumu `docs/PLAYTEST.md` 3. bölümde.
- Cihazda en çok **5000 olay** tutulur; daha eskiler silinir. Çok uzun oynayan testçiden raporu birkaç günde bir istemek iyi olur. Aynı test kimliğinden gelen birden çok dosyanın en çok olay içereni kullanılır.

## 5. Raporu çıkar

```bash
mkdir -p playtest && cp ~/Downloads/pota-test-*.json playtest/
node tools/playtest-report.js playtest/ rapor.md
```

Araç klasördeki her `.json` dosyasını okur, aynı kimliğin tekrarlarını eler ve Markdown rapor yazar (ikinci argüman verilmezse yalnızca ekrana basar). Bölümler: Oturumlar, İlerleme hunisi, Oyunu bıraktıkları yer, Mini oyun zorluğu, Maçlar, Reklamlar, Oyun hataları, Geri bildirim, Otomatik öneriler.

## 6. İlk 30 dakikada bırakma noktaları: hangi metrikler okunur?

Raporda şu sırayla bak:

1. **Oturumlar → "Oyuncu başına toplam süre (medyan)".** 30 dakikanın altındaysa sorun büyük ihtimalle ilk açılışta, oluşturma ekranında ya da ilk haftalardadır.
2. **İlerleme hunisi → ilk dört adım:** "Kariyere başladı → İlk maç → 5. hafta → 1. sezonu bitirdi". İlk 30 dakika aşağı yukarı bu aralıktır. En büyük düşüşün olduğu adım bakılacak yerdir. Kabaca hedef: ilk maça %90+, 5. haftaya %75+, 1. sezon sonuna %60+.
3. **Oyunu bıraktıkları yer:** her oyuncunun son oturumunu kapattığı ekran. `main` ana harita, `sheet:<başlık>` açık bir panel, `place:<yer>` bir mekân, `match` / `match:auto` maç, `arcade:<oyun>` mini oyun demektir. Aynı panelde 3+ oyuncu bıraktıysa o panel ya kafa karıştırıyor ya da çok uzun.
4. **Mini oyun zorluğu:** ilk saatte en çok oynanan mini oyunlarda ortalama başarı %35'in altındaysa ("ZOR") erken bırakmanın adayıdır.
5. **Maçlar:** hızlı oynatma oranı %70'in üstündeyse maç anları erken dönemde sıkıcı geliyor olabilir.
6. **Oyun hataları:** tek bir hata bile ilk 30 dakikada bırakmaya yol açabilir. Önce bunları düzelt.
7. **Geri bildirim:** düşük yıldızlı yorumları yukarıdaki bulgularla eşleştir.

Raporda doğrudan olmayan "30 dakikadan kısa oynayanlar nerede bıraktı?" sorusu için hızlı bir sorgu:

```bash
node -e '
const fs=require("fs"),d=process.argv[1];
for(const f of fs.readdirSync(d).filter(f=>f.endsWith(".json"))){
  const r=JSON.parse(fs.readFileSync(d+"/"+f,"utf8")),E=r.events||[];
  const ends=E.filter(e=>e.e==="session_end"),sec=ends.reduce((a,e)=>a+(e.dur||0),0);
  if(sec<1800){const l=ends[ends.length-1]||{};console.log(r.id,Math.round(sec/60)+" dk","son ekran:",l.last,"sezon/hafta:",l.s+"/"+l.w);}
}' playtest
```

Karar vermeden önce: 10'dan az oyuncuyla oranlar gürültülüdür. Sayıları testçilerin yazdıklarıyla birlikte değerlendir. Ayar noktaları için `docs/PLAYTEST.md` 5. bölüm.

---

# Closed testing guide (English)

A short path to running a 20-30 person test on Google Play, getting testers to turn on the in-game "Playtest" log, and building the report.

## 1. Pick a track

- **Internal testing:** first 5-10 people. Up to 100 testers, usually no review wait.
- **Closed testing:** the main 20-30 person test. Testers come from an email list or a Google Group. The first release goes through Google review (hours to a few days).
- New personal developer accounts must run a closed test before production access. When this was written the rule was **at least 12 testers opted in for 14 consecutive days**. Check the current rule in the Play Console dashboard.

## 2. Setup, step by step

1. Download the `pota-kariyeri-release-aab` artifact from GitHub → Actions → **Android** (signing secrets required, see `docs/STORE.md` section 4).
2. Play Console → **Test and release → Testing → Closed testing** → open a track (e.g. "Alpha") → **Testers**: add an email list (the Gmail accounts testers use on Play Store) or a Google Group.
3. Set a feedback email or URL on the same tab.
4. **Releases → Create new release** → upload the AAB → write release notes.
5. Select countries, then **Review release → Roll out to closed testing**. Fill in any missing App content forms. In Data safety, mark the playtest log as "only when the user turns it on and sends it".
6. Copy the **opt-in web link** from the Testers tab and share it. Testers open it with their Play Store account, tap "Become a tester", then install from Play Store.

## 3. What to ask testers

> "1) Join through the link and install from Play Store. 2) In the game: **Settings → Playtest → On**, then **I'm in**. 3) Play as much as you like for 3-5 days; if you get bored, stop — that is useful too. 4) When done, **Settings → Playtest → Send report** and send me the file."

Don't give hints. The log is anonymous: no name, phone number, location or device ID, just a random test ID. Nothing is recorded without consent.

## 4. Turning on the Playtest log

- **Android app:** **Settings** at the bottom of the home screen → **Playtest** row → **Off** button → **I'm in**.
- **Web:** add `?test=1` to the URL. The consent screen appears once.
- **Send report** opens the share menu (or downloads the file on web): `pota-test-<id>-<date>.json`.
- Optional auto-collection: set `TELEMETRY_ENDPOINT` in `src/telemetry.js` (Apps Script setup in `docs/PLAYTEST.md`).
- The device keeps at most 5000 events. Ask heavy players for a report every few days. For several files with the same ID, the one with the most events is used.

## 5. Build the report

```bash
node tools/playtest-report.js playtest/ report.md
```

Sections: Sessions, Progress funnel, Where they quit, Mini-game difficulty, Matches, Ads, Errors, Feedback, Automatic suggestions. The report text is in Turkish.

## 6. Reading the first 30 minutes

1. **Sessions → median total time per player.** Under 30 minutes means early trouble.
2. **Funnel, first four steps** (career start → first match → week 5 → first season done). The biggest drop is where to look. Rough targets: 90%+, 75%+, 60%+.
3. **Where they quit:** last screen of each player's last session (`main`, `sheet:<title>`, `place:<id>`, `match`, `arcade:<game>`). 3+ players quitting on the same panel is a red flag.
4. **Mini-game difficulty:** "ZOR" (hard, under 35% success) on early mini-games.
5. **Matches:** over 70% quick-simmed suggests match moments feel slow.
6. **Errors:** fix these first.
7. Use the `node -e` snippet above to list players with under 30 minutes and their last screen.

With fewer than 10 players, ratios are noisy. Read them together with written feedback.
