# Test kapsamı

Yüzdelik satır kapsamı (kod coverage) ölçülmedi: oyun tarayıcıda paketlenmiş tek bir uygulama olarak çalışıyor ve testler onu kara kutu olarak dolaşıyor. Aşağıdaki sayılar **çalıştırılan testlerin** gerçek sayılarıdır.

## Otomatik test paketi (projede kalıcı)

| Paket | Komut | Ne yapar | Bu denetimdeki son sonuç |
|---|---|---|---|
| Lint + tip denetimi | `npm test` (ilk adımlar) | eslint, `tsc` (`src/logic`, `src/state.js`) | geçti |
| Birim testleri | `npm run test:unit` | kurallar, içerik paketleri, durum, eşitleme, çeviri anahtarları (TR/EN eksiksiz, yer tutucular aynı) | **20/20** |
| Duman testi | `npm test` | gerçek tarayıcıda oyunu baştan sona dolaşır | **42 kontrol** geçti |
| Denge simülasyonu | `npm run test:balance` | otomatik oyuncuyla tam kariyerler | geçti (6 ve 10 kariyerlik turlar) |
| **Denetim paketi (yeni)** | `npm run test:audit` | işlevsel, uç durum, güvenlik, arayüz, performans | **46/46** |
| **Persona yolculukları (yeni)** | `npm run test:personas` | 25 kullanıcı tipi, uçtan uca | **25/25** |
| Maymun oyuncu | `node tests/fuzz.js N SN TOHUM` | rastgele dokunuşlar; dil/ekran/düşük grafik/pozisyon değişir | bu tur 8 koşu (4.614 dokunuş, 62 hafta) hatasız; oturumun önceki turları dahil ~74.000 dokunuş |
| Uç durum taraması | `node tests/fuzz-state.js N TOHUM` | aşırı değerler ve bozuk kayıtlarla her ekranı 2 seviye açar | bu tur 20/20; oturum boyunca toplam 196 durum |
| Analiz simülasyonu | `node tests/analysis.js <grup>` | reklam, mod, özellik, rastgele kararlı kariyerler | oturum boyunca 200+ kariyer |

CI (GitHub Actions) her güncellemede: lint, tip, birim, duman, denge, maymun oyuncu (8×45 sn, farklı tohum), uç durum (24), **denetim paketi (46)**.

## Denetim paketi ayrıntısı (`tests/audit.js`)

| Kategori | Test | Geçti |
|---|---|---|
| İşlevsel (F01–F21) | oluşturma ekranı, boş/uzun/emoji/HTML ad, 21 mekan sekmesi, kalıcılık, art arda dokunuş, ayar kalıcılığı, dil değişimi, yuva silme, dolu yuvalar, cihazlar arası kod, geçersiz kod, 2 MB çöp kod, yedekten kurtarma, reklam erken kapatma ve günlük sınır, 18 yaş kumarhane kilidi, mağaza, sezon geçişi, dokunmayan oyuncu mini oyunları | 19/19 |
| Uç durum (E01–E11, F15) | depolama kapalı, IndexedDB yok, depolama dolu, 1e15/eksi/NaN/Infinity para, eksik alanlı kayıt, iki sekme aynı yuva, 3 saat dilimi, yaz saati geçişi, geri alınan saat, boşluklu kod | 11/11 |
| Güvenlik (S01–S05, F05, E05) | dış ağ isteği, eval yok, yerel depoda kişisel veri yok, CSP var ve ihlal yok, CSP satır içi betiği engelliyor, ad ile HTML enjeksiyonu, zararlı kayıt kodu | 7/7 |
| Arayüz (V01) | 4 ekran boyutu × 15 ekran = 60 kombinasyonda yatay taşma yok | 1/1 |
| Performans (P01–P08) | açılış, çizim, uzun kariyer, bellek sızıntısı, kare hızı, paket boyutu, çevrimdışı, stres | 8/8 |

## Persona yolculukları (`tests/personas.js`)

| # | Persona | Sonuç |
|---|---|---|
| U01 | Yeni oyuncu: oluşturma, tanıtım turu, ilk iki hafta (gerçek dokunuşlar) | geçti |
| U02 | Geri dönen oyuncu: kayıt ekranından devam, Lig merkezi | geçti |
| U03 | Eksik profil: uyarı alıp düzelten | geçti |
| U04 | 18 sezonluk geçmişi olan oyuncu: bütün sekmeler, albüm, kart | geçti |
| U05 | Sürekli oluşturup silen (5 yuva) | geçti |
| U06 | Birkaç saniyelik kullanıcı (5 kez aç-kapat) | geçti |
| U07 | Hızlı gezgin (60 mekan aç-kapat) | geçti |
| U08 | Hata yapıp düzelten | geçti |
| U09 | Kötü bağlantı: oyun ortasında çevrimdışı (CSP'li Pages derlemesi) | geçti |
| U10 | Her haftadan sonra kapatıp açan | geçti |
| U11 | Çok cihazlı oyuncu (kodla taşıma, bağımsız ilerleme) | geçti |
| U12 | Oturumu düşen oyuncu: kimlik doğrulama yok (uygulanamaz); bulut kapalı, giriş düğmesi ve ağ isteği yok | geçti |
| U13 | Aynı kodu iki kez içe aktaran | geçti |
| U14 | Maçı kendi oynayan (karar anları + mini oyunlar) | geçti (düzeltmeden sonra 3/3 + tam tur) |
| U15 | Reklam seven: günlük sınıra kadar | geçti |
| U16 | Reklam reddeden | geçti |
| U17 | Oyun Kulübü oyuncusu | geçti (düzeltmeden sonra) |
| U18 | Alışverişçi | geçti |
| U19 | Erişilebilirlik kullanıcısı (320 px, çok büyük yazı, renk körlüğü, kolay) | geçti |
| U20 | Dil değiştiren | geçti |
| U21 | Emekli olup oğluyla devam eden | geçti |
| U22 | Hızlı kariyer modu | geçti |
| U23 | Efsane modu | geçti |
| U24 | Oyun testi katılımcısı (rıza, geri bildirim, rapor indirme) | geçti |
| U25 | Eski cihaz (4× yavaş işlemci, düşük grafik) | geçti |

## Toplam (bu denetim turu, son çalıştırmalar)

- Birim: 20
- Duman: 42 kontrol
- Denetim: 46
- Persona: 25
- Maymun oyuncu: 8 koşu
- Uç durum taraması: 20
- Denge: 18 kariyer

**Son durum: hepsi geçti, başarısız 0.** Engelli testler aşağıda.

Düzeltme öncesinde başarısız olan testler:
- Denetimin ilk turu 41 testten 7'sini kırmızı gösterdi. Bunların 3'ü uygulama hatasıydı (E05, F05, E06), 4'ü test kodu hatası (F02, F17, E01, P07).
- Personalarda U14, U15, U17 kırmızıydı (2 uygulama hatası, 2 test hatası).

Hepsi `BUGS_AND_FIXES.md`'de.

## Engelli (test edilemeyen) alanlar

| Alan | Neden | Yapılan |
|---|---|---|
| Gerçek Android cihaz / emülatör | Konteynerde emülatör yok | CI'da APK derleniyor; WebView davranışı başsız Chromium ile; eski cihaz için işlemci yavaşlatma |
| AdMob gerçek reklam | Yerel platform gerekli | Web akışı test edildi; yerel tespit kodu incelendi |
| Yerel bildirimler | Yerel platform gerekli | Seçim mantığı birim/duman testinde |
| Firebase bulut kayıt, Google girişi | Yapılandırılmamış (anahtar yok) | Kapalı durum test edildi; eşitleme kararı birim testinde |
| Sentry gönderimi | DSN yok | Zarf biçimi ve adres üretimi testte |
| Android geri tuşu, uygulama arka plana alma | Yerel olay | Kod incelendi |
| iOS | Mac/Xcode yok | — |
