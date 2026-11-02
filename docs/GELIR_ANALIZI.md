# Gelir potansiyeli analizi (2. tur)

Tarih: 2 Kasım 2026. Önceki tahmin, gelir katmanı (uzaktan ayar, A/B, analitik, yeni ödüllü yerleşimler) ve oyuncuyu tutma özellikleri (Efsaneler, Günün Maçı, ertesi güne kalan anlar, Yıldızlar Hafta Sonu, ara transfer) eklenmeden önce yapılmıştı.

**Önemli:** Gerçek kullanıcı verisi yok. Aşağıdaki sayıların bir kısmı **ölçüldü**, bir kısmı **sektör ortalamasından varsayım**. Her satırda hangisi olduğu yazıyor. Firebase bağlanıp ilk 1-2 haftanın verisi gelince bu tablo gerçek sayılarla yenilenmeli.

## 1. Ölçülenler (simülasyon, 12 kariyer: `node tools/ad-opportunities.js`)

| | Normal mod | Hızlı mod |
|---|---|---|
| Kariyer başına maç | 282 | 147 |
| Kariyer başına hafta | 268 | 131 |
| Sezon | 19,3 | 19,0 |
| Son hücum anı | 30 | 21 |
| Kaçan son şut (tekrar oynama teklifi) | 11,3 (maçların %4'ü) | 5,2 (%3,5) |

Önceki ölçümden: elle oynanan kariyer 15-17 saat (saatte ~17 hafta), hızlı oynanan kariyer ~1,1 saat (dakikada ~4 hafta).

## 2. Günlük reklam fırsatı modeli

Varsayım: aktif bir günde toplam ~25 dakika oyun (2 oturum).

| Ödüllü teklif (günde) | Elle oynayan (~7 hafta/gün) | Hızlı oynayan (~100 hafta/gün) |
|---|---|---|
| Maç primi ×2 | 7 | ~100 (sınır 8) |
| Devre arası | 7 | — |
| Enerji | ~1 | ~2 |
| Antrenman ×2 (haftada 1) | ~3 | az (otomatik hafta) |
| Son hücumu tekrar oyna | 0,3 | — |
| Sezon sonu + ek teklif + geri çağırma | ~1 | ~10 (sınır 8) |
| Günlük kutu + Günün Maçı ikinci deneme | 1-1,5 | 1-1,5 |
| **İzlenen ödüllü (varsayım: teklifin %20-30'u, günde en fazla 8)** | **3-5** | **5-8** |
| **Geçiş reklamı** (her 3 maçta bir, en az 4 dk arayla; doğal kırılma anları) | **2-3** | **5-6** |

Önceki turda: ödüllü 2-3, geçiş 1-2.

## 3. Oyuncunun oyunda kalması (varsayım)

| | Önce | Şimdi (tahmin) | Neden |
|---|---|---|---|
| 1. gün dönüş | %30 | %33-35 | Ertesi güne kalan an, Günün Maçı |
| 7. gün | %10 | %12-14 | Seri, günlük kutu, Yıldızlar Hafta Sonu |
| 30. gün | %3 | %4-5 | Efsaneler koleksiyonu ve açılan başlangıç hikâyeleri |
| Kurulum başına aktif gün | ~3,5 | **~4,5-5,5** | |

## 4. 100 bin indirme (Türkiye ağırlıklı)

Bin gösterim başına kazanç (varsayım, Türkiye Android): ödüllü 1,5-4 $, geçiş 0,5-2 $. Aktif oyuncu-günü başına gelir: düşük 0,0055 $, orta 0,017 $, yüksek 0,032 $.

| | Kötü | Orta | İyi |
|---|---|---|---|
| Aktif oyuncu-günü | 400 bin | 500 bin | 600 bin |
| Reklam geliri | ~2.200 $ | ~8.400 $ | ~19.200 $ |
| Reklamsız paket (%0,4-1,2) | ~400 $ | ~900 $ | ~1.500 $ |
| **Toplam** | **~2.600 $** | **~9.300 $** | **~20.700 $** |
| Önceki tur | 1.500 $ | 3.800 $ | 6.600 $ |
| AdMob aracılığı eklenirse (+%20-40) | ~3.100 $ | ~11.500 $ | ~27.000 $ |

Kullanıcı başına: önce 2-7 sent, şimdi **3-21 sent (orta ~9 sent)**. Orta senaryoda yaklaşık **2,5 kat**.

## 5. Global yayın (kitlenin %30'u ABD/Avrupa)

Varsayım: ABD/Avrupa'da ödüllü ~12 $, geçiş ~6 $. Orta senaryoda aktif gün başına gelir ~0,034 $ olur. 100 bin indirmede **~17.000-20.000 $**; aracılıkla **~22.000-26.000 $**.

## 6. Gelirin nereden geldiği

- Elle oynayanlarda ödüllü reklam (maç primi, devre arası, günlük kutu)
- Hızlı oynayanlarda geçiş reklamı ve günlük ödüllü sınır (8)
- "Son hücumu tekrar oyna" duygusal olarak güçlü ama nadir (maçların %4'ü): gelire katkısı küçük, oyuncu memnuniyetine katkısı büyük
- En büyük kaldıraç hâlâ oyuncunun kaç gün kaldığı: her +1 aktif gün, gelire yaklaşık +%20 ekler

## 7. Kalan büyük adımlar (gelir sırasıyla)

1. **Gerçek AdMob kimlikleri ve aracılık** (+%20-40; kod gerekmez)
2. **Firebase Analytics bağlantısı:** varsayımlar yerine gerçek tutma ve izleme oranı (olay katmanı hazır)
3. **Satın alma ürünleri** (başlangıç paketi, kozmetik, VIP abonelik): şu an tek ürün var. Ödeme yapan oran %1-2 olursa 100 bin indirmede +3.000-8.000 $
4. **Global mağaza sayfası** (İngilizce hazır)
5. **A/B ile ayar:** ilk geçiş reklamı 4. mü 6. maçta mı (deney açık), günlük ödüllü sınırı 8 mi 10 mu
