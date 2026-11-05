/* ================= EKONOMİ KURALLARI (baskın stratejileri önleme) =================
   Denetim: tools/economy-audit.js → reports/economy-audit.md. Amaç: tek bir eylem ya da ürün diğerlerini
   anlamsızlaştırmasın, her element kullanılmaya değsin.
   - Medya yorgunluğu: takipçi getiren işler (fotoğraf çekimi, basın, yardım, VIP, imaj kampanyası, stüdyo içeriği,
     canlı yayın, ortak video, karaoke) aynı hafta tekrarlandıkça etkisi azalır (×0,6 her tekrarda) ve takipçi
     yüzdesi sınırlıdır; bileşik büyüme yok.
   - Pasif gelir sınırı: kanal reklam geliri ve akademi aidatı maaşın belli bir oranını geçmez.
   - AVM nitelik eşyaları seviye çarpanından geçer (üst seviyede antrenmanı gereksiz kılmaz).
   - Arcade: haftada ilk 2 oyun moral/kimya/gelişim verir; ücret kariyer seviyesine göre. */
import { S } from "./core.js";
import { late } from "./late.js";

export const ECO_PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
export const ecoPm = () => ECO_PM[S && S.stage] || 1;
const wkKey = () => `${S.season}-${S.week}`;
export const ecoWeek = () => (S ? S.season * 40 + S.week : 0);

/** Takipçi kazancı: pct takipçi yüzdesi (en fazla %4), flat seviyeye göre sabit taban; haftalık yorgunluk */
export function mediaGain(pct, flat = 0) {
  if (!S) return 0;
  if (!S.media || S.media.w !== wkKey()) S.media = { w: wkKey(), n: 0 };
  const f = Math.pow(0.6, S.media.n);
  S.media.n++;
  const add = Math.max(0, Math.round((S.followers * Math.min(0.04, Math.max(0, pct)) + flat * ecoPm()) * f));
  S.followers += add;
  return add;
}
/** Bu hafta kaç medya işi yapıldı (arayüzde "yorgunluk" notu için) */
export const mediaFatigue = () => (S && S.media && S.media.w === wkKey() ? S.media.n : 0);

/** Pasif gelir üst sınırı: maaşın oranı (en az seviyeye göre küçük bir taban) */
export const passiveCap = (v, share) => Math.round(Math.min(v, Math.max(8 * ecoPm(), (S.wage || 0) * share)));

/** AVM nitelik eşyası: düz puan yerine seviye çarpanlı kazanç */
export function statItem(k, n) {
  return late.gainStat(k, n * late.levelMul(k));
}

/** Arcade: haftada ilk 2 oyun etkili; ücret seviyeye göre */
export const arcadeCost = () => Math.max(1, Math.round(ecoPm()));
export function arcadeCounts() {
  if (!S) return false;
  if (S.arcW !== wkKey()) ((S.arcW = wkKey()), (S.arcN = 0));
  S.arcN++;
  return S.arcN <= 2;
}
