/* ================= YAŞAM, KONFOR VE EKONOMİ DENGESİ =================
   Oyuncu geri bildirimi: "+15 enerji içeceğini almak yetiyor, diğer ürünlere ihtiyaç yok; yatırımların getirisi
   görünmüyor ve parasını karşılamıyor; moral gerekmediği için lüks eşyalar boş masraf."
   1) Market fiyatları kariyer seviyesine göre ölçeklenir (lisede 3, NBA'de ~1.000): para her seviyede anlam taşır.
   2) Marketten haftada en fazla 30 enerji alınır (vücut kaldırmaz). Haftada 2'den fazla enerji içeceği o hafta
      sakatlık riskini %20 artırır. Buz torbası riski azaltır, sağlık paketi sakatlığı bir hafta kısaltır (sakatlık başına bir).
   3) Konfor (0-100): ev + araba + ev eşyaları + birkaç lüks eşya. Etkileri:
      - moral her hafta konfora bağlı bir tabana döner (42 → 70); galibiyetler morali sonsuza dek taşımaz
      - haftalık enerji yenilenmesi +0..+4
      - sponsor teklifleri %0..%50 daha yüksek
   4) Spor eşyaları ilgili niteliğin antrenman kazancını artırır (top: şut antrenmanı +%10 ...). Eşyanın tek seferlik
      küçük nitelik katkısı (ör. ayakkabı hız +2) aynen kalır.
   5) Yatırımlar kendini yaklaşık 55 haftada (4 normal sezon) öder; AVM'de haftalık gelir ve geri dönüş süresi yazar. */
import { t as $t } from "./i18n/index.js";
import { fmt, statName, toast } from "./data.js";
import { S, norm, tx } from "./core.js";
import { SHOP } from "./shops.js";
import { late } from "./late.js";

/* ---- Market ---- */
const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
export const marketPrice = it => Math.max(it.p, Math.round(it.p * (PM[S && S.stage] || 1)));
export const MKT_EN_CAP = 30;
const wk = () => `${S.season}-${S.week}`;
function mk() {
  if (!S.mkt || S.mkt.w !== wk()) S.mkt = { w: wk(), en: 0, drinks: 0 };
  return S.mkt;
}
// bu haftalık sakatlık riski çarpanı (hikâyeden gelen uzun süreli çarpanla birleşir, sınırlı)
function injury(mul) {
  if ((S.buffs.injWk || 0) > 0) S.buffs.injMul = Math.min(2, Math.max(0.4, (S.buffs.injMul || 1) * mul));
  else {
    S.buffs.injWk = 1;
    S.buffs.injMul = mul;
  }
}
export const marketEnergyLeft = () => Math.max(0, MKT_EN_CAP - mk().en);
/** dinlenmek bu haftaki sakatlık riskini azaltır (src/places.js restAct) */
export const restInjury = () => injury(0.8);
/** Satın alma: fiyat, haftalık enerji sınırı ve ürün özel etkileri. Mesaj döner (ya da null: alınamadı). */
export function marketBuy(it) {
  const price = marketPrice(it);
  if (S.money < price) return null;
  const m = mk();
  tx(it.n, -price);
  const e0 = S.energy;
  it.fx();
  let note = "";
  const gained = S.energy - e0;
  if (gained > 0) {
    const allow = Math.max(0, MKT_EN_CAP - m.en);
    if (gained > allow) {
      S.energy = e0 + allow;
      note = $t("life.enCap");
    }
    m.en += Math.min(gained, allow);
  }
  if (it.id === "enerji") {
    m.drinks++;
    if (m.drinks > 2) {
      injury(1.2);
      note = $t("life.drinkRisk");
    }
  }
  // dengeli beslenme: haftada 3 farklı ürün (enerji sınırı dışında küçük bonus)
  m.kinds = m.kinds || [];
  if (!m.kinds.includes(it.id)) m.kinds.push(it.id);
  if (m.kinds.length >= 3 && !m.bal) {
    m.bal = true;
    S.moral += 5;
    S.energy += 4;
    note = $t("life.balanced");
  }
  // pizza takımla paylaşılır: takım ilişkisi ve kimya
  if (it.id === "pizza" && !m.pizza) {
    m.pizza = true;
    S.rel.takim += 2;
    if (late.chemAdd) late.chemAdd(1);
    note = note || $t("life.pizzaShare");
  }
  if (it.id === "buz" && !m.ice) {
    m.ice = true;
    injury(0.85);
  }
  if (it.id === "saglik" && S.injury && S.injury.w > 1 && !S.injury.kit) {
    S.injury.w--;
    S.injury.kit = true;
    note = $t("life.kitHeal");
  }
  norm();
  return note;
}
/** Ürün kartına ek açıklama (yeni etkiler) */
export function marketNote(it) {
  if (it.id === "enerji") return $t("life.drinkNote");
  if (it.id === "buz") return $t("life.iceNote");
  if (it.id === "saglik") return $t("life.kitNote");
  return "";
}

/* ---- Konfor ---- */
const HOUSE_C = { oda: 0, yurt: 5, daire: 15, lux: 35, villa: 55, malikane: 70 };
const ITEM_C = {
  yatak: 4,
  koltuk: 4,
  oyunkoltugu: 3,
  robot: 3,
  sinema: 6,
  fizyo: 4,
  kryo: 4,
  scooter: 3,
  araba1: 6,
  moto: 6,
  araba2: 10,
  araba3: 15,
  kiyafet: 2,
  parfum: 2,
  ceket: 3,
  zincir: 3,
  saat: 4,
  konsol: 3,
  vr: 3,
  telefon: 2,
  yat: 10,
  jet: 10
};
export function comfort() {
  if (!S) return 0;
  let c = HOUSE_C[S.housing] || 0;
  for (const [id, v] of Object.entries(ITEM_C)) if (S.items && S.items[id]) c += v;
  c += late.decorComfort ? late.decorComfort() : 0; // poster ve halı (src/custom.js)
  return Math.min(100, c);
}
export const moraleBase = () => 42 + Math.round(comfort() * 0.28) + (late.partnerBase ? late.partnerBase() : 0); // evlilik/çocuk (src/harbor.js)
export const comfortEnergy = () => Math.round(comfort() / 25);
export const sponsorMul = () => 1 + comfort() / 200;
export function comfortHTML() {
  const c = comfort();
  return `<div class="card"><div class="row between"><div class="eyebrow">${$t("life.comfort")}</div><b class="gold">${c}/100</b></div><div class="bar"><i style="--w:${c}"></i></div><p class="small muted">${$t("life.comfortFx", { m: moraleBase(), e: comfortEnergy(), s: Math.round((sponsorMul() - 1) * 100) })}</p></div>`;
}

/* ---- Eşyaların antrenman katkısı ---- */
export const TRAIN_ITEMS = [
  ["top", "sut", 0.1],
  ["bileklik", "sut", 0.05],
  ["dizlik", "sav", 0.1],
  ["agirlik", "guc", 0.15],
  ["tablet", "pas", 0.1],
  ["ayak1", "hiz", 0.05],
  ["ayak2", "hiz", 0.08],
  ["ayak3", "hiz", 0.1],
  ["ayak4", "hiz", 0.12],
  ["swatch", "*", 0.05],
  ["vr", "*", 0.04],
  ["fizyo", "*", 0.05]
];

/* ---- Yatırımlar: geri dönüş ~55 hafta ---- */
const INC = { kiradaire: 1100, dukkan: 4500, plaza: 7400 };
for (const it of SHOP) if (INC[it.id]) it.inc = INC[it.id];
/** AVM kartına ek bilgi: gelir ve geri dönüş, antrenman katkısı, konfor */
export function itemNote(it) {
  const out = [];
  if (it.inc) out.push($t("life.inc", { v: fmt(it.inc), w: Math.ceil(it.p / it.inc) }));
  const tr = TRAIN_ITEMS.filter(x => x[0] === it.id);
  for (const [, k, v] of tr)
    out.push(
      k === "*" ? $t("life.trainAll", { v: Math.round(v * 100) }) : $t("life.train", { k: statName(k), v: Math.round(v * 100) })
    );
  if (ITEM_C[it.id]) out.push($t("life.comfortPlus", { v: ITEM_C[it.id] }));
  if (it.en) out.push($t("life.enWk", { v: it.en }));
  if (it.mo) out.push($t("life.moWk", { v: it.mo }));
  return out.length ? ` · ${out.join(" · ")}` : "";
}
export const houseComfort = h => HOUSE_C[h] || 0;
export const comfortToast = () => toast($t("life.comfortNow", { v: comfort() }));
