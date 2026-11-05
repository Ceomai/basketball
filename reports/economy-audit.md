# Ekonomi Denetimi: Baskın Stratejiler, İstismarlar ve Ölü Seçenekler

Kapsam: haftalık 3 zaman dilimi (`S.slot`), enerji, para, moral, nitelikler (`gainStat` / `levelMul`), takipçi/şöhret,
ilişkiler. Bütün eylem ve gelir kaynakları kaynak koddan çıkarıldı. Sayılar gerçek oyundan ölçüldü:
`tools/economy-audit.js`, `dist-single/index.html`'i başsız tarayıcıda açar; `window.Game` üzerinden `WAGE`, `BAL`,
`MARKET`, `SHOP`, `HOUSING`, `marketPrice`, `chipRate`, `acadCost`, `drillGain`, `levelMul`, `arcResolve` gibi
sabitleri ve fonksiyonları okur. Haftalık gelirleri (kanal, akademi, arcade ödülleri) oyunun kendi `week:start`
işleyicilerini çalıştırarak ölçer. Mini oyuna bağlı eylemlerin (fotoğraf, rulet, slot, hipodrom, borsa) sabitleri
kaynak dosyalardan düzenli ifadeyle okunur, yani kod değişince tablolar da değişir. Kumar ve borsa için kesin hesap ya da
Monte Carlo kullanılır.

```
npm run build:single
node tools/economy-audit.js --json reports/economy-audit.json --md reports/economy-audit.tables.md
```

Tipik oyuncu varsayımları (tool içinde `PROF`): lise 16 yaş / nitelik 35 / 300 takipçi, t3 20 / 50 / 5 bin,
t1 24 / 62 / 60 bin, NBA 27 / 76 / 1,5 milyon. Sezon 14 hafta × 3 dilim olarak alındı.

---

## 1. Özet: oyuncuyu tek bir şeye yönelten 10 bulgu (önem sırasıyla)

| # | Baskın strateji / istismar | Sayı | Kod |
|---|---|---|---|
| 1 | **Slot makinesi pozitif beklenen değerli: her çevirme +%34** | EV = 1,342 (kesin hesap). NBA'de 1.000 fişlik çevirme ≈ **+4.976 para / 1,6 sn**. Haftalık net NBA maaşı 10.800 | `src/casino.js:369` (W8), `:420` (çift = ×1,8) |
| 2 | **Fiş kuru evreler arası arbitrajı** | 1.000 fiş uni'de 20 paraya alınır, NBA'de 14.550'ye satılır (**×727**); t3→NBA ×97. Fişin değeri her terfide 3-10 kat artar | `src/social.js:90` (RATE), `:113` |
| 3 | **Kendi yarış atı = sınırsız para musluğu** | Atla yarış başına net **+6,55 PM** (at %18 kazanır, ödül 40 PM; bahis kaybı −0,75 PM). Dilim, enerji ya da haftalık sınır yok. NBA'de yarış başına +2.291. t3'te alınan at NBA'de 3 yarışta kendini öder | `src/harbor.js:249`, `:310` |
| 4 | **Kanal reklam geliri maaşı ezer** (gelir güncel evre çarpanıyla ölçeklenir, maliyet bir kez) | Seviye 10 = 200 PM/hafta: t3'te 1.000 (net maaş 93), t1'de 7.000 (755), NBA'de **70.000 (10.800)**. Seviye 5 (≈25 paylaşım) bile t3 maaşının 2,7 katı | `src/studio.js:37`, `:26`, `:109` |
| 5 | **Akademi: düşük evrede al, yüksek evrede kazan** | t3'te 4.500'e alınan bina NBA'de 6 öğrenciyle haftada 8.820 getirir (yatırımın **%196'sı / hafta**). Prestij sınırsız: 100 prestijde 31.500/hafta. Öğrenci kaydı bedava ve anında | `src/academy.js:103`, `:70`, `:94` |
| 6 | **Takipçi kazancı çarpımsal ve sınırsız; fotoğraf çekimi her şeyi ezer** | Bir sezon boyunca her dilimde çekim (telefonla, kalite 70): takipçi **×146**, şöhret 48→83 (t1). Basın toplantısı ×5, işbirliği videosu ×1,4. Enerji maliyeti yok | `src/places.js:1174`, `:1024`, `:1152`; karşı örnek `src/venues.js:59` |
| 7 | **AVM eşyalarının tek seferlik düz nitelik bonusu `levelMul`'u atlıyor** | 10 eşya, 9.090 sabit para, **+19 nitelik puanı**. NBA düzeyinde 475 antrenmana eşit; t1'de 136 | `src/shops.js:267-412`, `:668` |
| 8 | **Arcade: 1 paraya dilimsiz ve sınırsız moral, hız ve kimya** | Oyun başına moral +3..+12, refleks oyununda beklenen hız +0,069 (lise). 300 oyun (300 para) = +15,7 hız; bir sezonluk 42 antrenman +16,1. Takım arkadaşı kimyası her oyunda +6 | `src/shops.js:1309`, `:1328`, `:1333`; `src/social.js:51` |
| 9 | **Takım antrenmanı ortalama oyuncu için bireysel antrenmandan iyi** | Lise: takım 0,65 / 12 enerji. Bireysel antrenman 2/3 başarıda 0,52, 1/3 başarıda 0,09 (18 enerji). Takım antrenmanı ayrıca koç +4 ve takım +3 verir | `src/places.js:529` ile `src/logic/rules.js:68` (oran^2,5) |
| 10 | **Antrenman programı her an ücretsiz değiştirilebiliyor** | Çalışacağın niteliğe geçince her antrenman ×1,3 olur. "Sezonluk program" kararı anlamsızlaşır, "denge" ölü kalır | `src/coach.js:24`, `:42` |

Ek kısıtlar ve döngüler:

- Enerji geç kariyerde bağlamıyor. Araçlar birbirine eklenir: 5 aracın haftalık enerjisi 28.
  `itemWeekly("en")` sahip olunan her şeyi toplar (`src/shops.js:189`, `src/match.js:584`). Malikane ve eşyalarla
  haftalık yenilenme 26+15+48+5+4 = **98** olur, ihtiyaç ise 76 (maç 22 + 3×18). Ödüllü enerji reklamı haftada
  20 kez +30 enerji veriyor (`src/remote.js:15`).
- Rulet çift şansları +%2,2 EV veriyor (`BET*2.1`, `src/casino.js:230`).
- Teselli fişi bedava para üretiyor: her hafta fiş 100'ün altındaysa 100'e tamamlanır (`src/extras.js:414`). Sat, sıfırla,
  her hafta tekrarla. NBA'de haftada 1.455 para.
- Aileye para gönderme (pro evrede) dilim harcamıyor ve haftalık sınırı yok: tıklama başına aile +15, moral +4
  (`src/places.js:1445`). "Aile yemeği" (1 dilim, +12) ölü kalır.

---

## 2. Ayrıntılı bulgular ve öneriler

Önerilerin denge hedeflerine etkisi (`node tests/balance.js 12`: zayıf profil %35-50 EuroLeague+, ortalama ~%42-50 NBA,
güçlü %90-100 NBA): denge simülasyonu (`tests/sim-player.js`) yalnızca antrenman, dinlenme, kafe, aile, okul, market
enerji içeceği, AVM alışverişi ve ev yükseltmesi yapar. Kumarhaneye, hipodroma, borsaya, stüdyoya, akademiye, arcade'e,
fotoğrafa ya da basına **hiç dokunmaz**. Bu yüzden 1-6 ve 8-10 numaralı düzeltmeler denge hedeflerini değiştirmez.
7 (AVM düz nitelik) ve araç enerjisinin üst üste binmesi simülasyonun yolunda olduğu için yeniden ölçülmelidir.

### 2.1 Slot makinesi +%34 EV (en kritik)
`src/casino.js:369` ağırlıkları `[30,30,20,12,8]`, `:420` herhangi iki aynı sembole `BET*1.8` öder. Çift gelme olasılığı
%53, üçlü %6,4. EV = 0,53×1,8 + 0,389 = **1,342**. Dilim, enerji, haftalık sınır ya da bekleme yok; tek sınır 1,6 sn'lik
animasyon. Kumarhane 18 yaşta açılır. Fiş paraya çevrilebildiği için (bulgu 2) bu, oyunun en hızlı para kaynağıdır ve
geri kalan bütün ekonomiyi anlamsızlaştırır.
- **Öneri:** çift ödemesi 1,8 → **1,0** (bahis geri). Üçlü çarpanları aynı kalırsa EV 0,92 olur. Alternatif olarak çift 1,2
  ve üçlüler (4,3,6,10,15) ile EV ≈ 0,90. Rulet çift şansı 2,1 → **2,0** (EV 0,973). Birim testi önerisi: slot/rulet
  EV'si < 1 (bu tool ölçüyor).
- Yan etki: yok (simülasyon kumar oynamaz). Fiş kupası (5.000 / 20.000 fiş) zorlaşır ama zaten ödül niteliğinde.

### 2.2 Fiş kuru arbitrajı ve teselli fişi
`RATE = {lise .01, uni .02, t3 .15, t2 .4, t1 1.2, euro 4, nba 15}` (`src/social.js:90`). Fiş evreler arasında taşınır
ama değeri terfide ×2,7…×12 artar. Başlangıçtaki 1.000 bedava fiş, görev ödülü fişleri (`src/missions.js:98`, haftalık
800) ve teselli fişleri (`src/extras.js:414`) NBA'de ciddi paraya dönüşür.
- **Öneri:** fişin para değerini sabitle. Evre değişince `S.chips = round(S.chips × eskiKur / yeniKur)` (terfide fiş sayısı
  azalır, değeri aynı kalır). Ya da kasada bozdururken alış kurunun ağırlıklı ortalamasını kullan. Teselli fişleri
  "bozdurulamaz bonus fiş" olsun (`S.chipsBonus`). Ya da satışta 100 fişlik taban satılmasın.
- Yan etki: yok.

### 2.3 Yarış atı
Ödül at kazandıkça `40×PM` (`src/harbor.js:310`). Bahis 5 PM ve EV 0,85 (`:236`, marj 0,85). Her yarıştan sonra
`S.field = null` ile yeni yarış hemen açılır; haftalık sınır yok, sadece koç ilişkisi haftada bir kez −2. Monte Carlo
(300 bin yarış): at %18,2 kazanır, net +6,55 PM/yarış. At 229 yarışta kendini öder. Fiyat alış evresinde, ödül güncel
evrede: t3'te 7.500'e alınan at NBA'de yarış başına 2.291 getirir.
- **Öneri:** atın koştuğu yarış haftada 1 olsun (hafta başı "yarış günü"). Ödül = 40 × PM, haftada en fazla bir kez.
  Haftalık bakım 3 × PM olsun ki at para makinesi değil, prestij ve moral eşyası olsun (beklenen ≈ +4 PM/hafta). Bahis
  ekranı istenirse sınırsız kalabilir (EV 0,85 zaten negatif).
- Yan etki: yok.

### 2.4 Kanal geliri
`tx(L*L*2*PM)` her hafta (`src/studio.js:37`). Seviye 10 için 1.620 XP gerekir; bir paylaşım 12-40 XP verir. Gelir
güncel evrenin PM'iyle ölçeklenir, takipçiye ya da son etkinliğe bağlı değildir. Kanal bir kez kurulunca paylaşımı
bıraksan bile gelir sonsuza dek sürer.
- **Öneri:** (a) gelir = `L² × 2 × PM × aktiflik`; aktiflik son 4 haftadaki paylaşım sayısı/4 (en fazla 1). (b) Tavan:
  haftalık kanal geliri ≤ 0,5 × WAGE[evre]. (c) Seviye eşiği `xp/20` → `xp/40`. Böylece kanal maaşın yarısını geçmez ve
  dilim istemeye devam eder.
- Yan etki: yok (simülasyonda kanal yok).

### 2.5 Akademi
Gelir `kids × (1 + prestige/25) × 3 × PM` (`src/academy.js:103`). Bina bedeli alındığı evrenin PM'iyle ödenir
(`acadCost`), gelir güncel PM ile gelir. Kayıt bedava ve aday listesi hemen yenilenir (`:70`). Prestijin tavanı yok
(koçluk +0..2, turnuva +6, profesyonel mezun +8).
- **Öneri:** haftalık işletme gideri 2 × öğrenci × PM. Prestij tavanı 60. Gelir tavanı 0,4 × WAGE. Evre atlayınca
  "tesis yükseltmesi" (yeni evrenin `acadCost`'unun %50'si) ödenene kadar gelir eski PM ile sürsün.
- Yan etki: yok.

### 2.6 Takipçi: çarpımsal ve sınırsız kaynaklar
Bileşik (yüzde) kazanç veren eylemler: fotoğraf çekimi (`followers × q × 0,12 × 1,5`), basın (×1,04), hayır işi (×1,06),
röportaj, VIP (×1,08), imaj kampanyası (×1,06), arcade sıralaması (oyun başına ×1,02), kutu ve sezon reklamları.
Kanal içeriği (+%3,5×e) de bileşik. Bunların hiçbirinde haftalık sınır yok; basın ve fotoğraf enerji de harcamaz.
`src/venues.js:59`'daki işbirliği videosu ise bilerek "bileşik büyümesin" diye sabit + %0,5 yazılmış; tasarım
tutarsız. Bir sezonluk tekrar (Tablo 4): fotoğraf+telefon ×146-211, VIP ×25, işbirliği ×1,2-3. Şöhret logaritmik
olduğu için NBA'de 100'e dayanır. Sponsor `fame² × 9` olduğundan (`src/places.js:941`) para da gelir.
- **Öneri:** bütün takipçi eylemlerinde kazanç = `(a × PM_takipçi + b × followers) × kalite` olsun, `b ≤ 0,01`.
  İşbirliği formülü örnek alınabilir. Ek olarak "medya yorgunluğu": aynı hafta içindeki n. medya eylemi ×0,6^(n−1)
  (basın, fotoğraf, hayır, VIP, kampanya, içerik ortak sayaç). Ya da en basit hâliyle çarpanlar 1,04 → 1,015 ve
  fotoğraf 0,12 → 0,04.
- Yan etki: denge simülasyonu medya kullanmaz. Potansiyel puanına şöhret katkısı küçüktür (`fame × 0,03` ≤ 3).
  Sponsor gelirleri ve şöhrete bağlı kilitler (VIP ≥30, sponsor ≥15) daha geç açılır. Hedeflenen davranış da bu.

### 2.7 AVM düz nitelik bonusu
`fx: () => (S.st.hiz += 2)` vb. (`src/shops.js:267-412`) doğrudan `S.st`'e yazar ve `gainStat`/`levelMul`'u atlar.
Bu, `src/progress.js:1-6`'daki "hiçbir kaynak sabit +1 vermez" ilkesine aykırı. 10 eşyadan toplam +19 puan (hız +9,
şut +4, savunma +2, güç +2, pas +2), fiyat sabit 9.090 (PM yok). NBA düzeyinde bu, 475 antrenmana denk.
- **Öneri:** `gainStat(k, v × levelMul(k))` kullan, ya da bonusu satın alındığı andaki `levelMul` ile ölçekle. Fiyatları
  PM ile ölçeklemek (`avmPrice × min(PM, 10)`) de seçenek. Eşyaların asıl değeri antrenman çarpanı (`TRAIN_ITEMS`) olsun.
- **Yan etki (dikkat):** simülasyon bu eşyaları lise/uni'de alıyor (`tests/sim-player.js:91-108`). Lisede levelMul ≈0,86
  olduğu için kayıp ≈ −3 puan, sonradan alınanlarda daha fazla. Zayıf ve ortalama profil oranları 2-5 puan düşebilir.
  `BAL.train` 1,3 → ~1,36 ya da `BAL.play` küçük bir artışla telafi edip `node tests/balance.js 12` ile doğrulayın.

### 2.8 Arcade
Oyun 1 para (sabit, `src/shops.js:1309`), dilim ve enerji yok. Moral `min(12, 3+score/4)` (`:1328`). Refleks oyununda
skor ≥18 ise %40 olasılıkla hız +0,2×levelMul (`:1333`). Takım arkadaşı kimyası her oyunda +6 (`src/social.js:51`;
takım ilişkisi haftada 2 ile sınırlı, kimya sınırsız). Haftalık ve aylık sıralama ödülü 5 oyunun her birinde ayrı
(`src/extras.js:97`): lisede ayda ≈1.100 para, harçlık ise haftada 4.
- **Öneri:** moral, kimya ve refleks hız kazancı haftanın ilk 2 oyunuyla sınırlansın (sayaç `S.arcWk`). Oyun ücreti
  `max(1, PM)`. Lise/uni sıralama ödülleri [25,15,8] → [8,5,3]. Sıralamadaki takipçi çarpanı ×1,02 yerine +sabit olsun.
- Yan etki: yok. Moral artık bedava olmadığı için kafe, parti ve dinlenme yeniden anlam kazanır.

### 2.9 Takım antrenmanı ile bireysel antrenman
Bireysel kazanç `ratio^2.5` ile düşüyor (`src/logic/rules.js:68`). Takım antrenmanı sabit `0,6 × levelMul`
(`src/places.js:529`). Başa baş noktası ≈ %80 başarı. Zayıf/ortalama oyuncu için takım antrenmanı 1,25-7 kat daha iyi,
daha az enerji harcıyor ve ilişki de veriyor. Mini oyunlu antrenman yalnızca usta oyuncuya kalıyor.
- **Öneri:** takım antrenmanı `0,6 → 0,35` (≈ bireysel antrenmanın %55 başarıdaki karşılığı), haftada 1. Ya da bireysel
  üssü 2,5 → 1,8 ve `BAL.train`'i buna göre düşürmek.
- Yan etki: takım antrenmanı simülasyonda yok, ilk seçenek dengeyi değiştirmez. İkinci seçenek değiştirir; yeniden
  ayar ister.

### 2.10 Program değiştirme
`bindProgram` her an değiştirmeye izin veriyor (`src/coach.js:42`). Odak ×1,3, diğerleri ×0,9 (`:24`). Antrenmandan
önce programı o niteliğe çevir: her antrenman +%30.
- **Öneri:** program yalnızca sezon başında (ya da 4 haftada bir) değişsin. Değiştirirken o hafta ×0,9 "uyum" cezası.
- Yan etki: `__SIM.program="focus"` modunda simülasyon programı pozisyona sabitliyor, etki yok.

### 2.11 Enerji ve para kısıtı bağlıyor mu?
- **Enerji:** haftalık ihtiyaç 76 (maç 22 + 3 antrenman). Temel yenilenme 26 + moral (≤5) + konfor (≤4) + ev (≤15) +
  eşyalar (≤48, araçlar üst üste). Villa, yatak, kryo, swatch ve iki araçla (≈t1) ihtiyaç kendiliğinden karşılanıyor.
  Bundan sonra dinlenme, market enerjisi ve enerji reklamı işlevsiz. **Öneri:** yalnızca en iyi aracın `en`/konfor değeri
  sayılsın (`bestCar()` zaten var, `src/core.js:137`). Enerji reklamı haftada 20 → 3 (`ads.energyPerWeek`, uzaktan
  ayar). Yan etki: simülasyon araç alıyor; araç enerjisinin tekilleşmesi geç kariyerde haftada ≈10-15 enerji eksiltir,
  biraz daha fazla dinlenme demek. Denge testiyle doğrulayın.
- **Para:** istismarlar olmadan para bağlıyor. Lisede harçlık 4/hafta, t3 net 93, t1 net 755. NBA'de malikane kirası
  (7.500) net maaşın %70'i. İstismarlarla (slot, fiş, at, kanal, akademi) 18 yaşından ya da t3'ten itibaren para
  anlamsızlaşıyor. AVM yatırımları PM ile ölçeklenmiyor: lisede/t3'te erişilmez (60.000 = 645 haftalık t3 maaşı), NBA'de
  6 haftalık maaş. Bu kabul edilebilir bir geç oyun harcaması.

---

## 3. Ölü (hiç seçilmeye değmeyen) seçenekler

| Seçenek | Neden ölü | Kod |
|---|---|---|
| Rulet yeşil, hipodromda atsız bahis, blackjack | Slotun +%34'ü yanında hepsi anlamsız. Atsız hipodrom EV 0,85 | `src/casino.js`, `src/harbor.js:236` |
| Borsa (bütün hisseler) | 56 haftada al-tut ortalama ×1,30-1,54 (p10 ×0,43-0,68), momentum ×1,54. Risksiz AVM yatırımı ×2,03 (haftalık %1,83). Yatırımlar bitene kadar borsa hep kötü | `src/harbor.js:156-164`, `src/lifestyle.js:141` |
| Market enerji çeşitliliği | Haftalık 30 sınırı içinde 2 enerji içeceği (30 enerji, 6 PM) yeter. Su, muz, sandviç, izotonik, yulaf, meyve, kuruyemiş yalnızca tıklama sayısını artırır | `src/lifestyle.js:24` |
| Pizza | Çikolata (5 moral / 2 PM, −1 enerji), pizzayı (8 / 9 PM, −4 enerji) her yönden geçiyor. İkisi de arcade'in (1 para) gerisinde | `src/shops.js:892`, `:915` |
| Gece kulübü partisi, kafe sohbeti (moral için) | Arcade dilimsiz ve 1 paraya daha fazla moral veriyor | `src/shops.js:1214`, `src/places.js:1566` |
| İşbirliği videosu, imza günü, sıralama dışı takipçi eylemleri | Fotoğraf çekiminin onda biri bile değil | `src/venues.js:59`, `src/studio.js:165` |
| "Denge" ve "toparlanma" antrenman programı | Antrenmandan önce odak programa geçmek bedava | `src/coach.js:24` |
| Kafede maç izle (pas) | Beklenen 0,11 / dilim; takım antrenmanı 0,65 | `src/places.js:1596` |
| Dinlenme (geç kariyer) | Eşya ve araç enerjisi ile reklam enerjisi yetiyor | `src/places.js:325` |
| Aile yemeği (pro evre) | Para gönder: dilim yok, +15 aile, sınırsız | `src/places.js:1445` |
| Arcade sıralama ödülü (NBA) | Doğrusal çarpan (1+evre sırası): haftada 875 + ayda 4.200. NBA'de önemsiz, lisede ise harçlığın 70 katı (ters dengesizlik) | `src/extras.js:91-97` |

---

## 4. Önerilen öncelik sırası

1. **Slot ve rulet ödemeleri** (EV < 1). İki satır, risksiz.
2. **Fiş değerinin sabitlenmesi** (terfide fiş dönüşümü) ve bozdurulamaz teselli fişi.
3. **At yarışı haftada 1 kez ve bakımlı.**
4. **Evre çarpanıyla büyüyen pasif gelirlere** (kanal, akademi) tavan ve aktiflik koşulu. Genel kural: "maliyet alış
   PM'iyle ödendiyse gelir de alış PM'iyle, ya da gelir ≤ maaşın bir kesri".
5. **Takipçi formüllerini işbirliği modeline çekmek** ve haftalık medya yorgunluğu.
6. **Arcade'de haftalık ilk 2 oyun sınırı** (moral, kimya, hız).
7. **Program kilidi** ve takım antrenmanının 0,35'e çekilmesi.
8. **AVM düz nitelik bonusunun levelMul'a bağlanması**, araç enerjisinin tekilleşmesi. Bunlar simülasyonu etkiler;
   `BAL.train` telafisi ve `node tests/balance.js 12` gerekir.

Birim testi önerisi (`tests/unit/economy.test.mjs`): slot/rulet/hipodrom EV < 1. Hiçbir haftalık pasif gelir
WAGE × 0,5'i geçmesin. Evre değişince fişin para değeri sabit kalsın. Bir sezonluk tekrar ile takipçi çarpanı ≤ ×5.
`tools/economy-audit.js --json` çıktısı bu eşiklere karşı denetlenebilir.

---

## 5. Ölçüm tabloları (tools/economy-audit.js çıktısı)

### Tablo 1 — Kariyer evresine göre gelir ve fiyat çarpanları

| | lise | t3 | t1 | nba |
|---|---:|---:|---:|---:|
| Ücret / hafta | 4 | 150 | 1,500 | 22,500 |
| Net maaş / hafta (vergi, menajer, yaşam sonrası) | 4 | 93 | 755 | 10,800 |
| Fiyat çarpanı PM (market, stüdyo, akademi…) | 1 | 5 | 35 | 350 |
| Fiş kuru (para / fiş) | 0.01 | 0.15 | 1.2 | 15 |
| Akademi binası | 900 | 4,500 | 31,500 | 315,000 |
| Akademi geliri/hafta (6 öğrenci, prestij 10 / 50 / 100) | 25 / 54 / 90 | 126 / 270 / 450 | 882 / 1890 / 3150 | 8820 / 18900 / 31500 |
| Kanal geliri/hafta (seviye 2 / 5 / 10) | 8 / 50 / 200 | 40 / 250 / 1000 | 280 / 1750 / 7000 | 2800 / 17500 / 70000 |
| Arcade 5 oyunda 1.: haftalık + aylık ödül | 125 + 600 | 375 + 1800 | 625 + 3000 | 875 + 4200 |
| Sokak turnuvası ödülü (haftada 1) | 12 | 60 | 420 | 4,200 |
| Galibiyet primi (not 7) | 4 | 32 | 315 | 4,725 |
| Sponsor (tipik şöhret) | 173 (şöhret 12) | 1153 (şöhret 31) | 4608 (şöhret 48) | 45369 (şöhret 71) |
| Yatırım (kiradaire/dükkan/plaza) geri dönüş, hafta | 55/56/55 | 55/56/55 | 55/56/55 | 55/56/55 |
| En ucuz yatırım (60.000) = kaç haftalık net maaş | 15000 | 645 | 79 | 6 |

### Tablo 2 — Nitelik kazancı / maliyet (şut, tipik nitelik düzeyinde)

| Kaynak | Maliyet | lise (nitelik 35, yaş 16) | t3 (nitelik 50, yaş 20) | t1 (nitelik 62, yaş 24) | nba (nitelik 76, yaş 27) |
|---|---|---:|---:|---:|---:|
| levelMul | — | 0.862 | 0.51 | 0.295 | 0.118 |
| Bireysel antrenman (başarı 1/3) | 1 dilim, 18 enerji | 0.09 | 0.05 | 0.02 | 0.01 |
| Bireysel antrenman (başarı 2/3) | 1 dilim, 18 enerji | 0.52 | 0.29 | 0.14 | 0.04 |
| Bireysel antrenman (kusursuz) | 1 dilim, 18 enerji | 1.44 | 0.81 | 0.38 | 0.12 |
| Antrenman, tam donanım (hoca+program+eşya+protein, 2/3) | 1 dilim + eşyalar | 1.01 | 0.74 | 0.35 | 0.11 |
| Takım antrenmanı | 1 dilim, 12 enerji | 0.647 | 0.383 | 0.194 | 0.071 |
| İkili çalışma (pas) | 1 dilim, 10 enerji | 0.345 | 0.204 | 0.118 | 0.047 |
| Kafede maç izle (pas, beklenen) | 1 dilim, 5 para | 0.108 | 0.064 | 0.037 | 0.015 |
| Sokak turnuvası galibiyeti (şut+hız) | 1 dilim/hafta, 15 enerji | 0.259 | 0.153 | 0.088 | 0.035 |
| **Arcade Refleks (beklenen, oyun başı)** | **1 para, 0 dilim, 0 enerji** | 0.069 | 0.041 | 0.024 | 0.009 |
| **300 Refleks oyunu toplam** | 300 para | 15.708 | 9.842 | 5.966 | 2.527 |
| Sezon boyu aynı nitelik: 14/28/42 antrenman | 42 dilim | 6.54 / 11.8 / 16.11 | 3.77 / 6.97 / 9.73 | 1.84 / 3.48 / 4.97 | 0.56 / 1.12 / 1.68 |
| **AVM tek seferlik düz nitelik (10 eşya)** | 9090 para (sabit fiyat) | +19 (levelMul yok) | +19 (levelMul yok) | +19 (levelMul yok) | +19 (levelMul yok) |
| …eşdeğer antrenman sayısı (2/3 başarı) |  | 37 | 66 | 136 | 475 |

### Tablo 3 — Enerji ve moral kaynakları

| Kaynak | lise fiyat | nba fiyat | Enerji | Moral | Not |
|---|---:|---:|---:|---:|---|
| Market: enerji | 3 | 1,050 | 15 | 0 |  |
| Market: izotonik | 4 | 1,400 | 6 | 2 |  |
| Market: su | 1 | 350 | 3 | 0 |  |
| Market: kahve | 3 | 1,050 | 7 | 0 |  |
| Market: muz | 1 | 350 | 4 | 0 |  |
| Market: kuruyemis | 3 | 1,050 | 4 | 1 |  |
| Market: cikolata | 2 | 700 | -1 | 5 |  |
| Market: sandvic | 4 | 1,400 | 6 | 0 |  |
| Market: pizza | 9 | 3,150 | -4 | 8 |  |
| Market: protein | 35 | 12,250 | 0 | 0 | antrenman +%20 × 3 |
| Market: jel | 6 | 2,100 | 12 | 0 |  |
| Market: vitamin | 7 | 2,450 | 10 | 0 |  |
| Market: yulaf | 5 | 1,750 | 6 | 2 |  |
| Market: saglik | 12 | 4,200 | 8 | 4 |  |
| Market: meyve | 6 | 2,100 | 5 | 3 |  |
| Market: buz | 5 | 1,750 | 8 | 0 |  |
| Market: macayak | 25 | 8,750 | 0 | 0 |  |
| Market: bilekset | 15 | 5,250 | 0 | 0 |  |
| Market: kafjel | 8 | 2,800 | 0 | 0 |  |
| Dinlen | 0 | 0 | 35 | 2 | 1 dilim |
| Reklam: enerji | 0 | 0 | 30 | 0 | dilim yok; haftada 20'ye kadar, enerji < 60 iken |
| Arcade oyunu | 1 | 1 | 0 | 3–12 | dilim yok, sınırsız, fiyat sabit 1 |
| Kafe sohbet | 3 | 3 | 0 | 8 | 1 dilim; arkadaş +8 |
| Gece kulübü partisi | 15 | 105 | -22 | 16 | 1 dilim, kondisyon −3, %20 skandal |

### Tablo 4 — Takipçi: aynı eylem bir sezon (14 hafta × 3 dilim)

| Eylem | lise (başlangıç 300) | t3 (başlangıç 5,000) | t1 (başlangıç 60,000) | nba (başlangıç 1,500,000) |
|---|---:|---:|---:|---:|
| press | ×5.19 → şöhret 12→23 | ×5.19 → şöhret 31→43 | ×5.19 → şöhret 48→60 | ×5.19 → şöhret 71→82 |
| charity | ×11.56 → şöhret 12→29 | ×11.56 → şöhret 31→48 | ×11.56 → şöhret 48→65 | ×11.56 → şöhret 71→88 |
| photo70 | ×48.89 → şöhret 12→39 | ×30.75 → şöhret 31→55 | ×29.69 → şöhret 48→72 | ×29.6 → şöhret 71→94 |
| photo70phone | ×211.34 → şöhret 12→49 | ×150 → şöhret 31→66 | ×146.41 → şöhret 48→83 | ×146.1 → şöhret 71→100 |
| studio70 | ×10.42 → şöhret 12→28 | ×4.61 → şöhret 31→42 | ×4.27 → şöhret 48→59 | ×4.24 → şöhret 71→81 |
| studioTrend90 | ×99.22 → şöhret 12→44 | ×38.68 → şöhret 31→57 | ×35.14 → şöhret 48→73 | ×34.83 → şöhret 71→95 |
| collabWeekly | ×3 → şöhret 12→19 | ×1.65 → şöhret 31→35 | ×1.41 → şöhret 48→51 | ×1.21 → şöhret 71→72 |
| signDay | ×4.46 → şöhret 12→22 | ×2.43 → şöhret 31→37 | ×2.31 → şöhret 48→54 | ×2.3 → şöhret 71→77 |
| vip | ×25.34 → şöhret 12→34 | ×25.34 → şöhret 31→54 | ×25.34 → şöhret 48→71 | ×25.34 → şöhret 71→93 |
| campaign | ×11.56 → şöhret 12→29 | ×11.56 → şöhret 31→48 | ×11.56 → şöhret 48→65 | ×11.56 → şöhret 71→88 |
| arcadeTop3Only | ×4 → şöhret 12→21 | ×4 → şöhret 31→41 | ×4 → şöhret 48→58 | ×4 → şöhret 71→80 |

### Tablo 5 — Kumar, at yarışı, borsa

| Oyun | Beklenen dönüş (1 birim bahis) | Kaynak |
|---|---:|---|
| Rulet: kırmızı/siyah/tek/çift/düşük | 1.022 | src/casino.js:230 |
| Rulet: yeşil (0) | 0.973 | src/casino.js:230 |
| Slot | 1.342 | src/casino.js:369 |
| Blackjack (temel strateji) | 0.998 | src/casino.js:332 |
| Hipodrom, atsız (favoriye) | 0.848 | src/harbor.js:236 |
| Hipodrom, kendi atınla: net/yarış (PM birimi) | +6.55 PM (at kazanma %18.2) | src/harbor.js:310 |
| At kendini kaç yarışta öder | 229 | src/harbor.js:249 |

Borsa (56 hafta, 1 birim yatırım, komisyon dahil; ortalama / p10 / p50 / p90):

| Strateji | ortalama | p10 | p50 | p90 |
|---|---:|---:|---:|---:|
| Al-tut tek | 1.301 | 0.431 | 1.042 | 2.443 |
| Al-tut enr | 1.496 | 0.616 | 1.269 | 2.627 |
| Al-tut spr | 1.408 | 0.538 | 1.168 | 2.522 |
| Al-tut gda | 1.542 | 0.679 | 1.332 | 2.657 |
| Momentum (4 haftalık en iyi hisseye geç) | 1.541 | 0.72 | 1.334 | 2.592 |
| AVM yatırımı (kiradaire, 56 hafta, risksiz) | 2.027 | 2.027 | 2.027 | 2.027 |

### Tablo 6 — Evreler arası arbitraj (düşük evrede öde, yüksek evrede kazan)

| Varlık | Alış (evre → maliyet) | Getiri NBA'de | Oran | Kaynak |
|---|---|---:|---:|---|
| 1.000 fiş | uni (18 yaş) → 20 | 14,550 | ×727 | src/social.js:90 |
| 1.000 fiş | t3 → 150 | 14,550 | ×97 | src/social.js:90 |
| Akademi binası | t3 → 4500 | 8820/hafta | 196%/hafta | src/academy.js:103 |
| Yarış atı | t3 → 7500 | 2291/yarış | 3 yarışta öder | src/harbor.js:310 |
| Teselli fişi (100 fiş/hafta, sat → 0) | bedava | 1455/hafta |  | src/extras.js:414 |
