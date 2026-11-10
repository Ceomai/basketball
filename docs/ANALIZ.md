# Yeni özellikler: simülasyon, test ve analiz (Kasım 2026)

Oyunun gerçek kodu üzerinde koşan otomatik oyuncuyla **102 kariyer** oynatıldı:
- 18 tanesi oğul kariyeriyle devam etti.
- Toplam ~2.400 sezon ve ~33.000 maç.

Bunun yanında gerçek arayüzde süre ölçümü ve emeklilik sonrası akışının elle testi yapıldı.

Tekrar üretmek için:

```bash
npm run analysis -- gercekci 3 gercekci.json
```

```bash
npm run analysis:report -- gercekci.json
```

Gruplar:
- `reklam`: sınırsız reklam modelleri, emeklilik sonrası ve oğul kariyeri.
- `gercekci`: günlük reklam sınırına göre gerçekçi reklam kullanımı.
- `ozellik`: antrenman programı × sözleşme maddeleri.

## Bulunan ve düzeltilen sorunlar

| # | Sorun | Etkisi | Düzeltme |
|---|---|---|---|
| 1 | **23 metin anahtarı kaybolmuştu.** Çeviri aracı, biçimlendiricinin satırlara böldüğü `$t(\n "anahtar")` çağrılarını "kullanılmıyor" sanıp sildi. | Maç ekranında `engine.19`, AVM, kira, sözleşme pazarlığı, sakatlık ve seçme ekranlarında ham anahtar görünüyordu. | Metinler git geçmişinden geri getirildi, araç düzeltildi. Yeni birim testi: koddaki her anahtar TR ve EN sözlükte olmalı, yer tutucular aynı olmalı. |
| 2 | **Pazarlıkta masadan kalkan kulüp listede kalıyordu.** | Sınırsız yeniden deneme: otomatik oyuncu kariyer başına 43 kez masadan kalkıp her maddeyi kopardı. | Masadan kalkan kulüp o yaz yeniden görüşmez. Hepsi kalkarsa ilk teklifleri pazarlıksız geçerli olur, oyuncu teklifsiz kalmaz. Sonuç: kariyer başına 1–1,7. |
| 3 | **"Sataşma" anı hiç çıkmıyordu.** Aynı rastgele sayı önce diğer koşullara takılıyordu. | Özel anlardan biri ölü koddu. | Her an kendi zarını atar: maç başına 0,35 sataşma. |
| 4 | **Riskiz seçenekler.** 2'ye 1'de "Yavaşla" ve sataşmada "Sakin kal" her zaman başarılıydı ve nitelik ilerlemesi veriyordu. | "Yavaşla" seçimlerin %67'siydi. | Yavaşlamak artık orta mesafe şutla biten bir set hücumu; sakin kalmak %80 başarılı. "Yavaşla" %6–27'ye indi. |
| 5 | **"Enerjin doldu" bildirimi yanlış söz veriyordu.** Oyunda enerji gerçek zamanla dolmaz. | Oyuncu uygulamayı açınca enerjisini aynı bulurdu. | Enerji bildirimi kaldırıldı; yerine alınmamış görev ödülü hatırlatması geldi. |
| 6 | **Görevler UTC'ye göre yenileniyordu.** | Türkiye'de günlük görevler 03:00'te yenileniyordu; haftalık anahtar ise yerel saatteydi. | İkisi de yerel gün. |
| 7 | **Koç sistemi uyumu uçlardaydı.** Sezonların çoğu ±5..8 çıkıyordu. | Etiket neredeyse hep "biçilmiş kaftan" ya da "uyumsuz"du. | Katsayı küçültüldü; dağılım −5..+5, çoğu orta bantta. |
| 8 | **Yorumcu son bölümü işe yaramıyordu.** Antrenörden daha az puan veriyor, başka bir şey vermiyordu. | 45 kariyerin 45'inde antrenör seçildi. | Her son bölüm oğula farklı etki eder (aşağıda). |
| 9 | **Yenilemede kazanılan madde kayboluyordu.** | Aynı kulüple yenilemede pazarlıkla kazanılan madde uygulanmıyordu. | Yeni maddeler eskilere eklenir. |
| 10 | **Emeklilik olayı ekran her çizildiğinde tekrar tetikleniyordu.** | Son bölüm seçimi ya da kaydı yeniden açma olayı tekrar tetikliyordu. | Yalnızca ilk kez. |
| 11 | **Emeklilik metninin eşikleri eskiydi.** | "Heykelin dikildi" metni neredeyse herkese çıkıyordu. | Şöhretler Müzesi eşiklerine bağlandı. |
| 12 | **Uyum etiketleri çevrilmemişti.** | "iyi", "orta" ve "uyumsuz" İngilizcede Türkçe görünüyordu. | Çevrildi. |

### Son bölümler ve oğula etkisi

| Son bölüm | Miras puanı | Oğula etkisi |
|---|---|---|
| Antrenör | +50 | +1 nitelik |
| Yorumcu | +30 | İki kat miras (en fazla 200 bin), +2.000 takipçi |
| Başkan (%51 kulüp payı gerekir) | +80 | İkisi birden |

## Oyun süresi

Ölçüm:
- **Maçı simüle et:** maç anında biter.
- **Hızlı hafta:** ortalama 3,5 dokunuş.
- **Elle maç:** 140 adım. Önemli anlar akışında ~13 sn, tam akışta 1× hızda ~60 sn sürer. Maç başına 9–10 karar anı vardır.

Varsayımlar:
- Bir dokunuş ~2 sn, olay okumak ~8 sn, mini oyunlu antrenman ~25 sn, karar anı ~10 sn.
- Sezon sonu ekranları ~45 sn.
- Ödüllü reklam 32 sn.

Bir kariyer ortalama 19 sezon, 287 hafta ve 281 maç sürer; 102 olay ve 54 basın toplantısı içerir.

| Oyun biçimi | Bir kariyer | Reklam süresi (gerçekçi) |
|---|---|---|
| Hep hızlı hafta + maçı simüle et | **~1,1–1,2 saat** | +~12 dk (≈20 ödüllü + geçiş reklamları) |
| Hep elle (3 antrenman + maçı kendin oyna) | **~15–17 saat** | +~1,4 saat (≈145 ödüllü + her 3 maçta geçiş) |
| Karma (büyük maçları elle, %25) | ~4–5 saat | +~25 dk |

Oğul kariyeriyle devam edilirse süre ikiye katlanır.

## Reklamlar ve oyun hızı

Günde en fazla 8 ödüllü reklam izlenebilir ve bu sınır gerçek güne bağlıdır. Bu yüzden izlenebilecek reklam sayısı **oyun biçimine** bağlı:
- Günde 30 dk hızlı oynayan biri kariyer başına ~20 reklam izleyebilir.
- Günde 1 saat elle oynayan biri ~145 reklam izleyebilir.

Profil başına 3 kariyer ile ölçülen sonuçlar:

| Profil | Reklam | NBA % | ovr 22/26/30 | Reklam geliri / maaş | Süre (oyun + reklam) |
|---|---|---|---|---|---|
| Zayıf | Yok | 0 | 49/57/62 | 0 | elle 14,0 sa |
| Zayıf | Hızlı (20) | 0 | 49/57/62 | %1 | hızlı 1,2 + 0,2 sa |
| Zayıf | Elle (142) | 0 | 50/57/62 | %7 | elle 14,5 + 1,5 sa |
| Ortalama | Yok | 33 | 57/67/73 | 0 | elle 16,4 sa |
| Ortalama | Hızlı (20) | 0 | 56/65/71 | %1 | hızlı 1,1 + 0,2 sa |
| Ortalama | Elle (145) | 0 | 55/65/73 | %10 | elle 16,5 + 1,5 sa |
| Güçlü | Yok | 67 | 63/72/79 | 0 | elle 16,2 sa |
| Güçlü | Hızlı (20) | 100 | 65/74/80 | %2 | hızlı 1,2 + 0,2 sa |
| Güçlü | Elle (144) | 100 | 65/74/80 | %8 | elle 16,9 + 1,5 sa |

**Sonuç:**
- **Gerçekçi reklam kullanımı ilerlemeyi hızlandırmıyor.** Nitelik ve NBA oranındaki farklar rastlantı içinde (profil başına 3 kariyer).
- **Reklamın sağladığı:** maç primi ikiye katlama, gelirin %1–10'u kadar.
- **Reklamın maliyeti:** hızlı oyuncuya %15, elle oyuncuya %9 ek süre.
- Reklam "öde-kazan" etkisi yaratmıyor; oyunun dengesi reklamsız oyuncuyu cezalandırmıyor. Bu, mağaza politikaları ve oyuncu memnuniyeti için doğru yön.
- **Sınırsız reklam modeli** (kariyer başına ~480–580 reklam; günlük sınır yüzünden gerçekte mümkün değil): ovr +2..5 ve para 2–4 kat. Günlük sınır bu farkı önlüyor.
- Ödüllü reklamların çoğu maç primi ikiye katlamaya gidiyor; enerji reklamı kariyer başına 3–20, sakatlık reklamı ~1.
- Geçiş reklamı hızlı oyunda 4 dakika sınırına takılıyor: ~%3 süre.

## Yeni özelliklerin davranışı

- **Özel maç anları (maç başına):**

  | An | Sıklık | Başarı |
  |---|---|---|
  | 2'ye 1 | 0,5 | %73 |
  | Perde | 0,6 | %70 |
  | Sataşma | 0,35 | %80 |
  | Son hücum | 0,14 | %70 |

  Son hücum en fazla maçın son anlarında, 3 sayıya kadar gerideyken ya da eşitken çıkıyor.
- **Antrenman programı:** pozisyona odaklı program genel gücü değiştirmiyor (ovr 30'da ±1). Niteliği istenen yöne kaydırıyor; doğru tasarım, ceza ya da bedava güç yok.
- **Koç sistemi uyumu:** iyi uyumda maç notu +0,2 ve ilk beş oranı %48'den %55'e çıkıyor. Etkisi hissedilir ama belirleyici değil.
- **Sözleşme maddeleri:**
  - Hep madde isteyen oyuncu sezonların %78'inde en az bir madde alıyor.
  - Performans primi kariyer maaşının %6'sı.
  - Fesih bedeli kariyer başına 3–5 transferde, toplam maaşın %2–4'ü. Geçişlerin %60–73'ü aynı lige yatay geçiş.
- **Emeklilik sonrası:** 45 kariyerde son bölüm puanı 3 kariyerde Şöhretler Müzesi kademesini yükseltti.
- **Oğul kariyeri:**
  - Bonus +2..+4 nitelik, başlangıç ovr 26–28 (baba ~24), miras 150–160 bin.
  - Oğul babasından ancak biraz iyi (ovr 26'da +1..2, NBA oranı benzer). Kolay bir "ikinci tur" değil, takdir hissi.
  - 18 oğul kariyerinin hiçbiri takılmadı ya da hata vermedi.
- **Görevler:** gerçek takvime bağlı. Hızlı oyuncu bütün kariyerinde ancak 1–3 günün görevlerini görür; günde 1 saat elle oynayan ~16 günlük görev alır, ödül toplamı gelirin ~%5–9'u. Reklam ya da hızlı geçiş görevi yok.

## Kalan öneriler (yapılmadı)

- Kariyer ~1 saatte bitebiliyor ve oyunun en zengin kısmı (maç anları, antrenman mini oyunları) hızlı haftada atlanıyor. Bir hafif teşvik eklenebilir: "Önemli maç" (derbi, final, playoff) haftalarında hızlı geçişte "bu maçı kendin oynamak ister misin?" sorusu.
- "Sakin kal" hâlâ en yüksek beklentili seçenek (otomatik oyuncu hep onu seçiyor). İnsan oyuncular için taraftar bonusu cazip olabilir; test kaydı verisiyle bakılmalı.
- Fesih bedelinin çoğu yatay geçişlerden geliyor; teklif kartında bedel görünüyor, yine de oyuncu verisiyle izlenmeli.

## i18n anahtar adlandırma kuralı

Arayüz metinleri `$t("alan.kavram")` ile okunur. Eski çıkarıcının verdiği sayısal adlar (`match.65`, `ads.25` …) Kasım 2026'da `tools/rename-i18n-keys.js` ile anlamlı adlara çevrildi; metinler aynı kaldı, eşleme `reports/i18n-rename-map.json`'da.

- **Biçim:** `<alan>.<kavram>`; ikisi de küçük harfle başlayan camelCase, yalnız ASCII harf ve rakam (`season.newSeason`, `press.clearConfidentStance`, `home.trophyCase`).
- **Alan:** metnin göründüğü ekran ya da sistem (`home`, `press`, `contract`, `minigame` …). Birden çok ekranda kullanılan genel metin (`Devam`, `Tamam`, `+5 Moral`) `common.` alır (`common.continue`); başka bir ekranın anahtarını ödünç alma.
- **Kavram:** metnin anlamı, 1–3 kelime (İngilizce): `contract.signingBonus`, `consent.noPersonalization`. Sayılar sona: `+5 Moral` → `moralePlus5`. Aynı kavram ikinci kez gerekiyorsa ayırt edici bir kelime ekle; son çare sayı soneki (`…2`).
- **Dinamik anahtar** yalnız şablon literalle ve kendi önekiyle: `` $t(`sc.${id}`) ``; `"önek." + x` birleştirmesi yasak (birim testi yakalar). Bu tür aileler yeniden adlandırma aracının dışında tutulur.
- **Yeni metin:** `keys/<ad>.json` dosyasına `{"tr":{…},"en":{…}}` yaz, adları bu kurala göre seç; yer tutucular (`{v}`) iki dilde aynı olmalı. Elle yazılan sözlükler `src/i18n/tr.js`/`en.js`; `tr.auto.js`/`en.auto.js` eski çıkarılmış metinlerin evidir. `tools/extract-i18n.js` yine sayısal ad verir: kullanılırsa ardından `node tools/rename-i18n-keys.js --dry-run` ile önizleyip uygula.
