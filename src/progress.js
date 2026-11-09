/* ================= YETENEK GELİŞİMİ: MAÇ VE ANTRENMAN =================
   Nitelikler artık ondalıklı büyür (45.3) ve her kaynak aynı seviye çarpanını kullanır (core.js → levelMul):
   nitelik yükseldikçe maçtan, antrenmandan, takım antrenmanından ve eşyalardan gelen katkı birlikte azalır.
   Böylece hiçbir kaynak (ör. sabit +1) diğerlerini anlamsız bırakmaz.
   Maç: karar anlarında başarılı hareket ilgili niteliğe katkı verir (engine.js) ve maç sonunda istatistiğe göre
   küçük katkılar eklenir: sayı → şut, asist → pas, ribaund → güç, top çalma + blok → savunma, süre → hız.
   Maç sonu ekranında hepsinin toplamı görünür (Şut +0.23 · Pas +0.13 ...). */
import { t as $t } from "./i18n/index.js";
import { Bus, STATS, statName } from "./data.js";
import { S, gainStat, levelMul } from "./core.js";
import { late } from "./late.js";

Bus.on("match:start", () => {
  if (S) S.gainNow = {};
});
const ageMul = () => (S.age <= 21 ? 1.25 : S.age <= 24 ? 1.1 : S.age >= 33 ? 0.35 : S.age >= 30 ? 0.65 : 1);
/** Maç sonu istatistik katkıları (finishMatch içinden) */
export function matchStatGains(M) {
  if (!S || !M) return;
  const auto = M.auto ? 0.5 : 1,
    mins = Math.round((M.mins || 0) / 60),
    mul = auto * ageMul() * late.modePlayMul();
  const add = (k, v) => v > 0 && gainStat(k, v * mul * (0.2 + 0.8 * levelMul(k)));
  add("sut", Math.min(30, M.pts || 0) * 0.004);
  add("pas", Math.min(12, M.ast || 0) * 0.012);
  add("guc", Math.min(15, M.reb || 0) * 0.007);
  add("sav", Math.min(6, (M.stl || 0) + (M.blk || 0)) * 0.016);
  add("hiz", Math.min(40, mins) * 0.001);
}
/** Maç sonu ekranındaki gelişim satırı; gösterildikten sonra sıfırlanır */
export function gainsHTML() {
  const g = S && S.gainNow;
  if (!g) return "";
  const parts = STATS.map(([k]) => [k, g[k] || 0])
    .filter(([, v]) => v >= 0.005)
    .map(([k, v]) => `<span class="pill g">${statName(k)} +${v.toFixed(2)}</span>`);
  S.gainNow = null;
  if (!parts.length) return "";
  return `<div class="row" style="gap:var(--sp-1h);flex-wrap:wrap;margin:6px 0"><span class="eyebrow" style="width:100%">${$t("prog.matchGain")}</span>${parts.join("")}</div>`;
}
/** Eşyaların antrenman çarpanı (spor eşyaları ilgili niteliğin antrenmanını hızlandırır; src/shops.js) */
export function itemTrainMul(k) {
  const it = (S && S.items) || {};
  let m = 1;
  for (const [id, kk, v] of late.TRAIN_ITEMS || []) if (it[id] && (kk === k || kk === "*")) m += v;
  return m;
}
