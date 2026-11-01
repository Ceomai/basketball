# Oyun testi rehberi

Amaç: 20-50 gerçek oyuncunun nerede bıraktığını, hangi mini oyunda zorlandığını ve maçları kendisi mi oynadığını görmek, sonra dengeyi bu veriyle ayarlamak.

## 1. Test sürümünü dağıt

İki yol var:

- **Web bağlantısı:** GitHub Pages'te yayınlanan adresin sonuna `?test=1` ekle. Örnek: `https://<kullanıcı>.github.io/basketball/?test=1`. Oyuncu ilk açılışta oyun testine katılmak isteyip istemediğini görür.
- **Android uygulaması:** Actions → **Android** iş akışının ürettiği APK'yı paylaş. Oyuncular bunu Ayarlar → Oyun testi → Açık ile etkinleştirir. Kurulum için "bilinmeyen kaynaklara izin" gerekir. Google Play'in **iç test** kanalı daha temizdir; bkz. `docs/STORE.md`.

## 2. Oyunculara ne söyleyeceksin

> "3-4 gün boyunca, canın istediği kadar oyna. Sıkılırsan bırak, bu da bir bilgi. Bittiğinde Ayarlar → Oyun testi → **Raporu gönder** ile dosyayı bana WhatsApp ya da e-postayla yolla. Sezon sonlarında çıkan kısa geri bildirim kutusunu doldurursan çok iyi olur."

- Kayıt anonimdir. İsim, telefon ve konum tutulmaz. Oyuncu açıkça onaylamadan hiçbir şey kaydedilmez.
- Oyunculara ipucu verme. Nerede takıldıklarını görmek istiyoruz.

## 3. Raporları topla

- **Elle:** gelen `.json` dosyalarını bir klasöre koy, örneğin `playtest/`.
- **Otomatik (isteğe bağlı):** `src/telemetry.js` içindeki `TELEMETRY_ENDPOINT` değerine bir adres yazarsan raporlar oraya da gider. En kolayı Google Apps Script:
  1. Yeni bir Google E-Tablo aç, Uzantılar → Apps Script.
  2. Şunu yapıştır:
     ```js
     function doPost(e) {
       SpreadsheetApp.getActiveSheet().appendRow([new Date(), e.postData.contents]);
       return ContentService.createTextOutput("ok");
     }
     ```
  3. Dağıt → Yeni dağıtım → Web uygulaması → Erişim: "Herkes" → adresi kopyala, `TELEMETRY_ENDPOINT`'e yaz, yeniden derle.
  4. Sonra tablodaki her satırın ikinci sütununu ayrı bir `.json` dosyası olarak kaydet.

## 4. Raporu çıkar

```bash
node tools/playtest-report.js playtest/ rapor.md
```

Rapor şunları gösterir:

- **Oturumlar:** süre, kaç gün oynandığı. 2+ ve 3+ gün oranı elde tutmanın ilk göstergesidir.
- **İlerleme hunisi:** kariyer başı, ilk maç, 1. sezon sonu, profesyonellik, 1. lig.
- **Bırakma noktaları:** oyuncuların son oturumu kapattığı ekran.
- **Mini oyun zorluğu:** ortalama başarı. %35'in altı "zor", %85'in üstü "kolay" sayılır.
- **Maçlar:** kendi oynanan ile hızlı oynatılan maçların oranı ve not farkı.
- **Reklamlar:** hangi yerleşim ne kadar izlendi.
- **Hatalar ve geri bildirim:** oyun hataları ile yıldızlar ve yazılar.
- **Otomatik öneriler.**

## 5. Dengeyi ayarla

| Bulgu | Nereden ayarlanır |
|---|---|
| Mini oyun çok zor/kolay | `src/games.js` (ilgili `mg*` fonksiyonunda tolerans ve süre değerleri) |
| Gelişim çok yavaş/hızlı | `src/logic/rules.js` → `BAL.train`, `trainingGain` |
| Teklifler, lig atlama | `src/logic/rules.js` → `BAL.need`, `eligibleStages` |
| Ekonomi (para çok/az) | `src/logic/rules.js` → `WAGE`, `BAL.living`, `matchBonus` |
| Ödüller çok/az | `src/logic/rules.js` → `AWARD_T`, `seasonAwardKinds` |
| Maçlar uzun/sıkıcı | `src/engine.js` (kritik an sıklığı) ve `src/places.js` → `momentCount` |

Her değişiklikten sonra:

```bash
npm test
```

Daha ayrıntılı denge koşusu:

```bash
npm run test:balance
```

Bu, değişikliğin kariyer genelinde dengeyi bozmadığını gösterir.

## 6. Ne zaman yeterli veri var?

- En az 20 oyuncu ve oyuncu başına 30+ dakika.
- 10'dan az oyuncuyla oranlar gürültülüdür. Kararları geri bildirim metinleriyle birlikte ver.
- Hedefler (kabaca, bu tür oyunlar için):
  - ertesi gün geri gelme %35+
  - 1. sezonu bitirme %60+
  - mini oyun başarısı %45-75
