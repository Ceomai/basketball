/* ================= OTOMATİK HAFTA PLANI =================
   Hafta planındaki "Otomatik doldur": haftalık koç önerisini (src/inbox.js coachTipKey) temel alır, oyuncunun
   enerjisini dilim dilim izleyerek yorgunken antrenman yerine dinlenme koyar, aile ilişkisi düşükse aileye zaman
   ayırır. Yalnızca plan.js'deki mini oyunsuz işleri seçer; plan "Uygula" ile her zamanki gibi mekân düğmelerinden
   yürür (kurallar aynı). Ayarlarda "Haftayı her zaman otomatik planla" açıksa plan paneli her hafta bu öneriyle
   açılır ve ana ekrandaki "Geçen haftanın aynısı" düğmesi "Otomatik planı uygula" olur. */
import { isPro } from "./data.js";
import { S } from "./core.js";
import { late } from "./late.js";

// koç önerisi → üç dilimin öncelik sırası
const BY_TIP = {
  heal: ["rest", "family", "rest"],
  rehab: ["rest", "family", "rest"],
  rest: ["rest", "family", "team"],
  study: ["study", "team", "rest"],
  exam: ["study", "study", "team"],
  moral: ["cafe", "family", "team"],
  coach: ["team", "team", "rest"],
  agent: ["press", "team", "rest"],
  money: ["press", "team", "rest"],
  big: ["team", "rest", "team"],
  fit: ["team", "rest", "team"],
  train: ["team", "team", "family"]
};
const ENERGY = { team: -12, rest: 35, family: 0, cafe: -3, study: -6, press: -4 };
const can = k => (k === "study" ? !!S.studying : k === "press" ? isPro(S.stage) : true);

/** Bu hafta için önerilen plan (kalan dilim sayısı kadar anahtar) */
export function autoPlanPick(n = S ? S.slot : 0) {
  if (!S || n <= 0) return [];
  const tip = (late.coachTipKey && late.coachTipKey()) || ["train"];
  const base = BY_TIP[tip[0]] || BY_TIP.train;
  const out = [];
  let e = S.energy;
  for (let i = 0; i < Math.min(3, n); i++) {
    let k = base[i];
    if (!can(k)) k = "team";
    if (k === "team" && (S.injury || e < 30)) k = "rest"; // sakat ya da yorgun: antrenman yerine dinlenme
    if (k === "rest" && e >= 85 && !S.injury) k = S.rel && S.rel.aile < 50 ? "family" : "team"; // zaten dinç
    out.push(k);
    e = Math.min(100, e + ENERGY[k]);
  }
  // aile ilişkisi düşükse son dilimlerden biri aileye
  if (S.rel && S.rel.aile < 35 && !out.includes("family") && out.length >= 2) out[out.length - 1] = "family";
  return out;
}
/** Ayar açık mı? (Haftayı her zaman otomatik planla) */
export const autoPlanAlways = () => !!(late.SETTINGS && late.SETTINGS.autoPlan);
