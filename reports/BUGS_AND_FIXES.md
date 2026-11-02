# Hatalar ve düzeltmeler

Denetim tarihi: 2 Kasım 2026. Her hata önce bir testle yeniden üretildi, kök nedeni bulundu, düzeltildi ve aynı test ile tam regresyon paketi yeniden çalıştırıldı.

Önem dereceleri: **Kritik** (güvenlik açığı / veri kaybı / çökme), **Yüksek** (çekirdek iş mantığı yanlış), **Orta** (bir özellik bozuk ya da kilitleniyor), **Düşük** (küçük kusur), **Bilgi** (bilinçli davranış, kayda geçti).

## Bu denetimde bulunup düzeltilenler

| # | Önem | Hata | Nasıl bulundu | Kök neden | Düzeltme | Doğrulama |
|---|---|---|---|---|---|---|
| B1 | **Kritik** | **Kayıt kodu / yedek dosyası ile kod çalıştırma (stored XSS).** Başkasından alınan bir kayıt kodundaki `<img onerror=…>` oyunda JavaScript çalıştırıyordu (Android'de yerel eklentilere erişimi olan WebView içinde). | `E05`: ad, takım ve haber alanına yük gömülmüş kod içe aktarıldı; `window.__xss` atandı | Gündem haberleri (`${n.t}`) ve kayıttan gelen bazı metinler kaçışsız `innerHTML`'e basılıyordu; içe aktarmada metin temizliği yoktu | 1) Bütün yükleme yolları (yuva, yedek, IndexedDB, kayıt kodu, dosya) `upgradeSave`/`parseSave` içinde `cleanStrings` ile `<` `>` temizler (oyunun kendi metinlerinde bu karakterler hiç yok, 18 sezonluk kayıtla doğrulandı). 2) Gündem kaçışlı basılıyor. 3) Pages/Android derlemesine CSP eklendi: satır içi betik ve olay işleyicisi çalışmaz | `E05` geçti; `S05` (temizlik atlatılsa bile CSP satır içi işleyiciyi engelliyor) geçti; `S04` CSP ihlali yok |
| B2 | **Yüksek** | **Oluşturma ekranında HTML içeren ad işaretleme olarak sayfaya giriyordu** (`<b id=xx>` gündemde öğe oluşturdu) | `F05` | Ad alanı temizlenmeden saklanıyor, haber metnine gömülüp kaçışsız basılıyordu | Oluşturma ekranında `< > " &` alınmıyor + B1 düzeltmeleri | `F05` geçti |
| B3 | **Yüksek** | **Web'de ödüllü reklamlar hiçbir şey göstermeden ödül veriyordu; geçiş reklamları hiç görünmüyordu** (gelir modeli ve denge bozuk) | `F17`, `U15`: reklam ekranı hiç açılmadı, `showRewarded` anında `true` döndü | `admob()` yalnızca "AdMob nesnesi var mı" diye bakıyordu; `@capacitor-community/admob` web'de de bir "taklit" eklenti kaydediyor ve `showRewardVideoAd` reklam göstermeden çözülüyor | `admob()` yalnızca yerel platformda (Capacitor `isNativePlatform`) eklentiyi döndürür; web'de oyun içi tanıtım ekranı açılır | `F17` (erken kapatınca ödül yok, sınır dolunca reklam açılmaz), `U15` (tam 8 ödül, 9-10 reddedildi), `U16` geçti |
| B4 | **Orta** | **Rulet/slot dönerken panel kapatılınca çökme; rulet sayfa yenilenene kadar kilitli kalıyordu**, kazanç kaydedilmeyebiliyordu | `U17` (Oyun Kulübü personası): `Cannot set properties of null (setting 'innerHTML')` | Animasyon sonu artık var olmayan öğeye yazıyordu; hata `busy = false` ve `save()`'den önce oluşuyordu | Önce kilit açılıp kaydediliyor, öğe yoksa arayüz güncellemesi atlanıyor; çizim de öğe yokken yapılmıyor | `U17` geçti (fiş eksiye düşmüyor, hata yok) |
| B5 | **Orta** | **Eksik alanlı kayıt (yarım yazılmış, eski ya da elle düzenlenmiş) açılınca çökme** (`toLocaleUpperCase` of undefined) | `E06` | `normalizeState` yalnızca bazı alanları tamamlıyordu | Eksik alanlar yeni kariyerin varsayılanlarıyla (`createState`) tamamlanır; NPC adları ve ilişki değerleri doğrulanır. Kademeli açılış alanı bilinçli olarak hariç (eski oyunculara toplu bildirim çıkmasın) | `E06` geçti |
| B7 | **Orta** | **Şut mini oyununda "çek-bırak" hareketini bilmeyen oyuncu maçta sonsuza dek takılıyordu** (kısa dokunuş hiçbir şey yapmıyor, süre sınırı yok) | `U14` kararsızdı; profilleme: 4 elle maçın 3'ünde süre şut mini oyununda tıkandı (187-195 sn) | Şut yalnızca yeterli sürükleme hızıyla atılıyor; yedek yol yoktu | 6 sn şut atılmazsa "Hızlı şut" düğmesi; isabet niteliğe bağlı, iyi elle şuttan düşük (avantaj değil) | `U14` 3/3 geçti; `F21` şut 10 sn'de bitiyor |
| B8 | **Düşük** | **Zamanlama (serbest atış) ve post-up nişan aşaması hiç dokunulmazsa sonsuza dek bekliyordu** | `F21` (dokunmayan oyuncu testi) | Nişan aşamasında süre sınırı yoktu | 8 sn dokunulmazsa o anki işaretçi konumuyla kendiliğinden bırakılır (rastgele dokunuşa eşdeğer) | `F21` geçti: 7 maç mini oyununun hepsi kendiliğinden bitiyor |
| B6 | **Düşük** | **İçerik Güvenlik Politikası (CSP) yoktu** | Statik inceleme | — | Vite eklentisi Pages/Android derlemesine CSP ekler (tek dosya test derlemesi hariç) | `S04`, `S05` geçti |

## Önceki sağlamlık turlarında bulunup düzeltilenler (aynı oturum, kayıt için)

| Önem | Hata | Düzeltme |
|---|---|---|
| Kritik | 23 çeviri anahtarı kaybolmuştu; ekranlarda `engine.19` gibi ham anahtar | Geri getirildi, araç düzeltildi, birim testi eklendi |
| Yüksek | Maç sonu reklam izni paneli sonuç panelini siliyordu, oyuncu devam düğmesiz ekranda kalıyordu | İzin ayrı katmanda |
| Yüksek | Pazarlıkta masadan kalkan kulüple sınırsız yeniden deneme | Kulüp o yaz geri çekilir |
| Orta | Reklam sürerken kariyerden çıkılınca çökme; tanıtım turu kariyer kapanınca çökme; reklam izni pencereleri üst üste yığılıyordu | Geri çağrı korumaları, tek pencere |

## Test kodunda bulunan ve düzeltilen hatalar (uygulama hatası değil)

Bunlar uygulama kusuru sayılmadı; test beklentisi ya da otomasyon yanlıştı:

- `F02`: oyun boş adla başlamıyor ve uyarı veriyor, bu doğru davranış; test buna göre düzeltildi.
- `P07`: servis çalışanı yalnızca `https`/`localhost` kökeninde kaydoluyor; test `127.0.0.1` yerine `localhost` kullanıyor.
- `F17`: reklam izni oyun açıldıktan sonra yazılmıştı.
- `U14`: `p.evaluate(() => playMatch())` maç sözünü bekleyip kilitleniyordu; fare tıklamaları mini oyun alanına denk gelmiyordu.
- `U15`: ödüllü reklamın düğmesi geri sayım sırasında da etkin; test erken basıyordu.

## Düzeltilmeyen / açık bulgular

| # | Önem | Bulgu | Neden düzeltilmedi | Öneri |
|---|---|---|---|---|
| A1 | Düşük | Cihaz saati geri alınınca günlük görevler yeniden üretilir (`E10`): saat oynatarak ek görev ödülü alınabilir | Sunucu saati yok; tamamen yerel oyun. Ödüller küçük (gelirin %5-9'u) | Bulut kayıt açılırsa sunucu zamanıyla doğrulanabilir; ya da son görülen tarih saklanıp geriye gidilirse görev yenilenmez |
| A2 | Bilgi | Aynı yuva iki sekmede aynı anda oynanırsa son yazan kazanır (`E07`, kayıt bozulmuyor) | Tek oyunculu yerel oyun; bilinçli | Gerekirse `storage` olayıyla diğer sekmeyi uyarmak |
| A3 | Düşük | Geliştirme bağımlılıklarında 8 orta önem açık (eslint, @capacitor/cli dolaylı: minimatch, glob, rimraf) | Oyuncuya giden pakette yok; npm'in önerdiği "düzeltme" eski sürüme düşürme | Bağımlılıkları ileride güncel sürümlere yükseltmek |
| A4 | Bilgi | Herkese açık APK hata ayıklama (debug) derlemesi; `allowBackup=true` | Test dağıtımı için bilinçli; yedekleme gizlilik sayfasında belirtilmiş | Mağaza için imzalı yayın derlemesi (CI hazır, anahtarlar girilince) |
| A5 | Orta (yapılandırılınca) | Bulut kayıt açılırsa Firebase belirteçleri `localStorage`'da saklanacak | Bulut kayıt şu an kapalı | Etkinleştirmeden önce Android'de güvenli depolama (Keystore) eklentisi |
