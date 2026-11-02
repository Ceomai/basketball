# Güvenlik raporu

Kapsam: savunma amaçlı değerlendirme. Gerçek kullanıcı verisi yok; bütün testler yerel tarayıcı bağlamlarında yapıldı.

## Mimari açısından tehdit yüzeyi

- **Sunucu, veritabanı, kullanıcı hesabı yok.** Oyun tamamen cihazda çalışır; veriler `localStorage` ve IndexedDB'de. Bu yüzden şu kalemler bu uygulama için **uygulanamaz**: kimlik doğrulama zayıflıkları, oturum yönetimi, IDOR, satır düzeyi güvenlik, kullanıcılar arası veri sızıntısı, API yetkilendirmesi.
- **İsteğe bağlı ve şu an kapalı servisler:**
  - Firebase bulut kayıt (`CLOUD_CONFIG` boş)
  - Sentry hata raporu (`SENTRY_DSN` boş)
  - Telemetri gönderimi (`TELEMETRY_ENDPOINT` boş)

  Kod incelendi; canlı uç noktası olmadığı için uçtan uca test **engelli**.
- **Dışarıdan gelen veri:** karakter adı, kayıt kodu (başkasıyla paylaşılabilir), yedek dosyası (`.pota`), geri bildirim metni. Asıl risk bunlar.

## Bulgular

| # | Önem | Bulgu | Durum |
|---|---|---|---|
| G1 | **Kritik** | Kayıt kodu / yedek dosyasıyla depolanan XSS: zararlı koddaki `onerror` çalışıyordu (`E05`) | **Düzeltildi** (metin temizliği + kaçış + CSP) |
| G2 | Yüksek | Oluşturma ekranından HTML enjeksiyonu (`F05`) | **Düzeltildi** |
| G3 | Düşük | CSP yoktu | **Düzeltildi**: `default-src 'self'`, satır içi betik yok, dış kaynak yalnızca yazı tipi ve yapılandırılırsa Google/Firebase/Sentry |
| G4 | Bilgi | Normal oyunda dış ağ isteği yalnızca Google Fonts (`S01`) | Doğrulandı |
| G5 | Bilgi | Paketlenmiş kodda `eval` / `new Function` yok (`S02`) | Doğrulandı |
| G6 | Bilgi | Yerel depoda e-posta, belirteç, şifre yok; yalnızca oyun verisi (`S03`) | Doğrulandı |
| G7 | Bilgi | Kaynak kodda ve depoda gizli anahtar yok (düzenli ifade taraması: Google API anahtarı, özel anahtar, şifre) | Doğrulandı |
| G8 | Düşük | Geliştirme bağımlılıklarında 8 orta önem açık (`npm audit`); üretim bağımlılıklarında **0** | Açık: yalnızca derleme araçları |
| G9 | Bilgi | Herkese açık APK hata ayıklama derlemesi (debuggable WebView); `allowBackup=true` | Test dağıtımı için bilinçli; mağazada imzalı yayın derlemesi kullanılmalı |
| G10 | Orta (yapılandırılınca) | Bulut kayıt açılırsa Firebase yenileme belirteci `localStorage`'da | Açık: etkinleştirmeden önce güvenli depolama |
| G11 | Bilgi | Geri bildirim metni (`<script>` dahil) yalnızca JSON rapor olarak indiriliyor, ekrana basılmıyor (`U24`) | Doğrulandı |
| G12 | Bilgi | Telemetri açık rıza olmadan hiçbir şey kaydetmiyor (duman testi) | Doğrulandı |
| G13 | Düşük | Cihaz saati oynatılarak görev ödülü yenilenebilir (`E10`) | Açık: yerel oyunda sunucu saati yok |

## Kayıt verisinin bütünlüğü (veritabanının karşılığı)

- **Şema sürümü** (`SAVE_V`) ve sırayla uygulanan geçişler var.
- **Bütün yükleme yollarında:**
  - metin temizliği
  - eksik alanların varsayılanlarla tamamlanması
  - sayısal alanların doğrulanması (NaN ve sonsuz değerler varsayılana çekilir)
- **Bozulmaya karşı korumalar** (`F16`, `E06`, `fuzz-state`):
  - Her yazımda önceki kayıt `-bak` olarak saklanır.
  - IndexedDB'de ikinci bir kopya tutulur.
  - Bozuk kayıt yedekten açılır.
- **Çakışma:** aynı yuvayı iki sekme yazarsa son yazan kazanır, kayıt geçerli kalır (`E07`).

## Öneriler

1. Mağaza sürümü için yalnızca imzalı **yayın** derlemesini dağıtmak; hata ayıklama APK'sını sınırlı testçilere vermek.
2. Bulut kayıt etkinleştirilmeden önce:
   - belirteçleri Android'de güvenli depoya taşımak
   - Firestore kurallarını (`docs/STORE.md`) bir emülatörde test etmek
3. Geliştirme bağımlılıklarını güncellemek (`eslint` 9 → güncel, `@capacitor/cli` güncel yama).
