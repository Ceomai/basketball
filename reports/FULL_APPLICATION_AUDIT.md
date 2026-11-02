# Pota Kariyeri: Tam Uygulama Denetimi

**Tarih:** 2 Kasım 2026
**Kapsam:** web (GitHub Pages) ve Android (Capacitor) derlemeleri
**Yöntem:** kaynak incelemesi + gerçek tarayıcıda otomatik oyun + simülasyon + düzeltme + regresyon

Ayrıntılı raporlar:
- [TEST_COVERAGE.md](TEST_COVERAGE.md)
- [BUGS_AND_FIXES.md](BUGS_AND_FIXES.md)
- [PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md)
- [SECURITY_REPORT.md](SECURITY_REPORT.md)

Ham sonuçlar: `reports/data/`.

## 1. Genel sağlık puanı: **88 / 100**

Gerekçe:
- **Kritik ve yüksek önemde açık hata yok;** bu denetimde bulunan 3 kritik/yüksek hata düzeltildi ve testle doğrulandı.
- **Çekirdek döngü kararlı:** oyun akışı, kayıt, mini oyunlar ve ekonomi sağlam; 46 denetim testi, 25 persona ve bütün regresyon paketleri geçiyor.
- **Puanı düşürenler:**
  - Gerçek cihazda test yapılamadı.
  - Yerel servisler (AdMob, bildirim, bulut, Sentry) uçtan uca doğrulanamadı.
  - Düşük önemli açık bulgu kalmadı (saat oynatma ve geliştirme bağımlılıkları sonraki turda düzeltildi); yalnızca bilgi notları ve bulut açılırsa geçerli olacak bir koşullu bulgu var.

## 2. Mimari ve teknoloji

- **Uygulama:** vanilla JavaScript ES modülleri (42 modül, ~20.500 satır), Vite ile paketleme.
- **İki derleme biçimi:**
  - `dist/`: parçalı; GitHub Pages ve Android için. İngilizce paket ayrı dosyada ve yalnızca İngilizce seçilince iner.
  - `dist-single/`: tek dosya; testler ve dosyadan açma için.
- **Mobil:** Capacitor 7 Android. Eklentiler: app, preferences, share, filesystem, status-bar, local-notifications, AdMob, satın alma.
- **Mimari desenler:**
  - Olay veriyolu (`Bus`: `on`/`emit`, ara katmanlar, haftalık panel sağlayıcıları). 33 olay türü var.
  - Geç bağlama kaydı (`late`).
  - Saf kural modülü (`src/logic`, tip denetimli).
- **Arka uç / veritabanı:** yok.
  - Veri cihazda: `localStorage` (5 yuva, her yazımda bir önceki kaydın yedeği) ve IndexedDB'de ikinci kopya.
  - Kayıt şeması sürümlü, geçişler sırayla uygulanır.
  - İsteğe bağlı ve şu an kapalı: Firebase bulut kayıt (REST), Sentry (zarf API), telemetri uç noktası.
- **Kimlik doğrulama / yetkilendirme:** yok (tek oyunculu yerel oyun).
- **Arka plan işleri:**
  - Servis çalışanı (çevrimdışı önbellek).
  - Yerel bildirim (uygulama arka plana alınınca bir bildirim planlanır).
  - 20 sn gecikmeli bulut yükleme (kapalı).

## 3. Özellik envanteri (özet)

- **Ekranlar:**
  - kayıt yuvaları, karakter oluşturma, ana ekran (harita + hafta kartı + gündem)
  - 10 mekan, toplam 21 sekme
  - maç motoru (karar anları, 9 mini oyun, çeyrek arası taktikleri)
  - sezon sonu, teklifler ve pazarlık, emeklilik
  - ayarlar, kılavuz, Lig merkezi (5 sekme), görevler, albüm, kariyer kartı, arcade (5 oyun), Oyun Kulübü (3 oyun)
- **Sistemler:**
  - ekonomi (ücret, kira, mağaza, yatırım)
  - ilişkiler, koç güveni ve rol, sezon hedefleri, sözleşme maddeleri, karakterler ve koç kişiliği
  - özellikler ve imza hareket, maç koşulları (savunma tipi, yorgunluk)
  - olaylar (veri tabanlı), hikâye zincirleri, ikilemler, miras ve Şöhretler Müzesi, oğul kariyeri
  - kariyer modları (normal, hızlı, efsane), kademeli açılış, milli takım
  - reklam (ödüllü, geçiş, reklamsız paket), telemetri (rıza ile)
  - erişilebilirlik (yazı boyutu, renk körlüğü, zorluk), iki dil (TR/EN)

## 4–6. Testler

| | Sayı |
|---|---|
| Çalıştırılan testler (son tur) | 20 birim + 42 duman kontrolü + 46 denetim + 25 persona + 8 maymun koşusu + 20 uç durum + 18 denge kariyeri |
| Geçen | hepsi |
| Başarısız (son tur) | 0 |
| Engelli | 7 alan (gerçek cihaz, AdMob, yerel bildirim, Firebase, Sentry, Android geri tuşu, iOS) |

Düzeltmeden önce başarısız olanların hepsi `BUGS_AND_FIXES.md`'de.

## 7. Önem derecesine göre sorunlar

| Önem | Bulunan | Düzeltilen | Açık |
|---|---|---|---|
| Kritik | 1 (kayıt koduyla XSS) | 1 | 0 |
| Yüksek | 2 (ad ile HTML enjeksiyonu; web'de reklamsız ödül) | 2 | 0 |
| Orta | 3 (kumarhane kilitlenmesi, eksik alanlı kayıt çökmesi, şut mini oyununda takılma) | 3 | 0 (+1 koşullu: bulut açılırsa belirteç depolama) |
| Düşük | 4 (CSP yok, iki mini oyunda sonsuz bekleme, saat oynatarak görev, geliştirme bağımlılıkları) | 4 | 0 |
| Bilgi | 3 (iki sekme son yazan kazanır, debug APK, allowBackup) | — | kayda geçti |

## 8–9. Düzeltilenler ve kalanlar
`BUGS_AND_FIXES.md` (B1–B8 düzeltildi, A1–A5 açık).

## 10. Güvenlik
Kritik XSS kapatıldı. Ek savunma katmanı olarak CSP eklendi: temizlik atlatılsa bile satır içi betik çalışmıyor (S05). Dış istek yalnızca yazı tipi; yerel depoda kişisel veri yok; kaynakta gizli anahtar yok. Ayrıntı: `SECURITY_REPORT.md`.

## 11. Performans
- Açılış: soğuk yaklaşık 300 ms, sıcak 90 ms.
- Ana ekran çizimi: 4,7 ms.
- 18 sezonluk kayıt: 74 KB, kaydetme 2 ms.
- Bellek: 5 kariyer ve stres testinde sızıntı yok.
- Kare hızı: 60 FPS.

Ayrıntı: `PERFORMANCE_REPORT.md`.

**Denge notu:** özellikler ve imza hareket zayıf profilin EuroLeague oranını %20-30'dan %83'e çıkarmıştı. Bonuslar yaklaşık yarıya indirildi; son ölçüm (profil başına 12 kariyer): zayıf EuroLeague **%42**, NBA %0 / %42 / %92.

## 12. Veri bütünlüğü
- **Kayıt yolları:** bütün yükleme yolları tek noktadan geçiyor. Orada metin temizliği, eksik alan tamamlama ve sayısal doğrulama yapılıyor.
- **Bozulmaya karşı:** önceki kaydın yedeği (-bak) ve IndexedDB'deki ikinci kopya. Bozuk kayıttan kurtarma test edildi.
- **Doğrulanan durumlar:**
  - iki sekme aynı yuvayı yazınca kayıt bozulmuyor
  - aynı kod iki kez içe aktarılınca iki bağımsız yuva oluşuyor
  - beş yuva doluyken içe aktarma mevcut kariyerlerin üzerine yazmıyor
  - geçersiz ya da 2 MB'lık çöp kod reddediliyor
- **Bulunan ve düzeltilen:** eksik alanlı kayıt çökmesi.

## 13. Arayüz / UX
- **Taşma:** 60 ekran × boyut kombinasyonunda yatay taşma yok.
- **Erişilebilirlik personası:** 320 px, çok büyük yazı ve renk körlüğü modunda oyun oynanabiliyor.
- **Takılma noktaları düzeltildi:**
  - şut mini oyununda "çek-bırak" bilinmezse sonsuz bekleme (artık "Hızlı şut")
  - hiç dokunulmayan zamanlama ve post-up mini oyunları (artık kendiliğinden bırakılıyor)
- **Önceki turlarda düzeltilenler:** reklam izni panelinin sonuç panelini silmesi, kayıp çeviri anahtarları.
- **Öneri:** ilk kez oynayanlar için mini oyun kısa gösterimleri; şut mini oyununda hareketi gösteren bir animasyon.

## 14. Cihaz uyumluluğu
- **Denenen ekranlar:** 320×568, 390×844, 844×390 (yatay), 820×1180 (tablet).
- **Diğer koşullar:** Kiritimati/Los Angeles/Kolkata saat dilimleri, Berlin yaz saati geçişi, çevrimdışı mod, 4× yavaş işlemci.
- Gerçek Android sürümleri ve WebView farklılıkları test edilemedi.

## 15. Test edilemeyen alanlar
Gerçek cihaz/emülatör, AdMob gerçek reklam, yerel bildirimler, Firebase/Google girişi, Sentry, Android geri tuşu, iOS. Ayrıntı: `TEST_COVERAGE.md`.

## 16. Önerilen sonraki adımlar
1. **Firebase Test Lab** ile 10+ gerçek Android cihazda otomatik dolaşma. CSP'nin Capacitor WebView'da sorunsuz olduğu da burada doğrulanmalı (yerel köprü CSP'den etkilenmez, ama cihazda görülmedi).
2. Mağaza için imzalı yayın derlemesi; debug APK'yı yalnızca test grubuna vermek.
5. Bulut kayıt açılmadan önce güvenli belirteç depolama ve Firestore kural testleri.
6. 10–20 kişilik kapalı test (telemetri ve rapor aracı hazır).

## 17. Üretime hazırlık değerlendirmesi
**Web (GitHub Pages):** test sürümü olarak hazır; bilinen kritik ya da yüksek hata yok.

**Android / Google Play:** gerçek cihaz testi yapılmadan ve imzalı yayın derlemesi, gerçek AdMob kimlikleri ve gizlilik formları tamamlanmadan **hazır değil**. Kod tarafında engelleyici sorun bulunmadı; kalan işler dağıtım ve doğrulama adımları (`docs/STORE.md`).

## Denetimi yeniden çalıştırmak

```bash
npm test
```

```bash
npm run test:audit
```

```bash
npm run test:personas
```

```bash
node tests/fuzz.js 24 90 100
```

```bash
node tests/fuzz-state.js 80 200
```
