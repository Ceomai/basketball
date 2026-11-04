/* ================= EKİPMAN ESKİMESİ VE MAÇ GÜNÜ GÜÇLENDİRİCİLERİ =================
   - Ayakkabılar (30 maç) ve top, bileklik, dizlik (40 maç) kullandıkça eskir. Eskiyince antrenman katkısı biter;
     AVM'de %60 fiyatla yenilenir (tek seferlik nitelik katkısı yeniden verilmez). AVM kartında kalan ömür yazar.
   - Maç günü güçlendiricileri (Market): maç ayakkabısı (3 maç hız +3), şutör bilekliği (3 maç şut +2), kafeinli jel
     (1 maç bütün nitelikler +1). Etkileri maçta ve mini oyunlarda geçerli, lig maçı bittikçe azalır.
   Para geç kariyerde de anlam taşır: düzenli yenilenen ekipman ve maç öncesi güçlendirme. */
import { t as $t } from "./i18n/index.js";
import { Bus, statName, toast } from "./data.js";
import { S } from "./core.js";
import { icon } from "./art.js";
import { MARKET, SHOP } from "./shops.js";

export const WEAR = { ayak1: 30, ayak2: 30, ayak3: 30, ayak4: 30, top: 40, bileklik: 40, dizlik: 40 };
Bus.on("purchase", d => {
  if (!S || !d || !WEAR[d.id]) return;
  S.wear = S.wear || {};
  S.wear[d.id] = WEAR[d.id];
});
Bus.on("match:end", () => {
  if (!S) return;
  // eskime
  const w = (S.wear = S.wear || {});
  for (const id of Object.keys(WEAR)) {
    if (!S.items[id]) continue;
    if (w[id] == null) w[id] = WEAR[id]; // eski kayıt: tam ömürle başla
    w[id]--;
    if (w[id] <= 0) {
      delete S.items[id];
      delete w[id];
      S.worn = S.worn || {};
      S.worn[id] = 1;
      if (!window.__SIM) toast($t("gear.worn", { n: itemName(id) }));
    }
  }
  // güçlendiriciler
  if (S.boosts && S.boosts.length) S.boosts = S.boosts.map(b => ({ ...b, g: b.g - 1 })).filter(b => b.g > 0);
});
const itemName = id => (SHOP.find(x => x.id === id) || { n: id }).n;
/** AVM fiyatı: eskiyen eşyanın yenilemesi %60 */
export const avmPrice = it => (S && S.worn && S.worn[it.id] ? Math.round(it.p * 0.6) : it.p);
/** Yenileme mi (tek seferlik etki yeniden uygulanmaz)? */
export const isRenewal = it => !!(S && S.worn && S.worn[it.id]);
export function renewDone(it) {
  if (S.worn) delete S.worn[it.id];
}
export function wearNote(it) {
  if (!WEAR[it.id]) return "";
  if (S.items[it.id]) return ` · ${$t("gear.left", { n: (S.wear && S.wear[it.id]) ?? WEAR[it.id] })}`;
  if (S.worn && S.worn[it.id]) return ` · ${$t("gear.renew")}`;
  return ` · ${$t("gear.life", { n: WEAR[it.id] })}`;
}
/** Etkin nitelik katkısı (core.js → eff) */
export function boostOf(k) {
  if (!S || !S.boosts) return 0;
  return S.boosts.reduce((a, b) => a + (b.g > 0 && (b.k === k || b.k === "*") ? b.v : 0), 0);
}
const addBoost = (k, v, g) => {
  S.boosts = (S.boosts || []).filter(b => b.id !== `${k}${v}`);
  S.boosts.push({ id: `${k}${v}`, k, v, g });
};
// Market'e "maç günü" ürünleri
const CAT = () => $t("gear.cat");
if (!MARKET.some(m => m.id === "macayak"))
  MARKET.push(
    {
      id: "macayak",
      cat: CAT(),
      n: $t("gear.shoe"),
      d: $t("gear.shoeD"),
      p: 25,
      ic: () => icon("sneaker", "#ff6b2b", "#141414"),
      fx: () => addBoost("hiz", 3, 3)
    },
    {
      id: "bilekset",
      cat: CAT(),
      n: $t("gear.wrist"),
      d: $t("gear.wristD"),
      p: 15,
      ic: () => icon("wrist"),
      fx: () => addBoost("sut", 2, 3)
    },
    {
      id: "kafjel",
      cat: CAT(),
      n: $t("gear.gel"),
      d: $t("gear.gelD"),
      p: 8,
      ic: () => icon("gel"),
      fx: () => addBoost("*", 1, 1)
    }
  );
export function boostsHTML() {
  if (!S || !S.boosts || !S.boosts.length) return "";
  return `<p class="small good">${$t("gear.active")} ${S.boosts.map(b => $t("gear.b", { k: b.k === "*" ? $t("gear.all") : statName(b.k), v: b.v, g: b.g })).join(" · ")}</p>`;
}
