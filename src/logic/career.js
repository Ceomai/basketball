/* ================= KARİYER KURALLARI: SÖZLEŞME VE PLAY-OFF SERİSİ (DOM'suz) ================= */
import { isProStage, STAGES } from "./rules.js";

/** Başka kulübe geçişte serbest kalma bedeli (o: teklif, st: oyuncu durumu); 0 = bedel yok.
    Bedel: haftalık ücret × 4 × kalan sözleşme yılı (en çok 2). Üst lige çıkış maddesi ve NBA maddesi bedeli kaldırır.
    @param {{stay?: boolean, uni?: boolean, stage: string}} o
    @param {{stage: string, contract?: number, wage: number, clauses?: {release?: any, nbaout?: any} | null}} st */
export function buyoutFee(o, st) {
  if (o.stay || o.uni || !st.contract || !isProStage(st.stage) || !isProStage(o.stage)) return 0;
  const cl = st.clauses || {},
    up = STAGES.indexOf(/** @type {any} */ (o.stage)) > STAGES.indexOf(/** @type {any} */ (st.stage));
  if ((cl.release && up) || (cl.nbaout && o.stage === "nba")) return 0;
  return Math.round(st.wage * 4 * Math.min(st.contract, 2));
}
/** Play-off serisi sayımı: galibiyet/mağlubiyeti işler, momentumu yazar; seri bittiyse true.
    @param {{w: number, l: number, need: number, mom?: number}} s @param {boolean} win */
export function seriesCount(s, win) {
  if (win) s.w++;
  else s.l++;
  s.mom = win ? 1 : -1;
  return s.w >= s.need || s.l >= s.need;
}
/** Rakibin bir sonraki maça hazırlanacağı karar türü: mağlubiyette en az 2 kez kullanılan en sık tür, yoksa null.
    @param {Record<string, number>} tally @param {boolean} win */
export function seriesAdapt(tally, win) {
  if (win) return null;
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 2 ? top[0] : null;
}
