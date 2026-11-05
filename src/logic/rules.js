// @ts-check
/* ================= OYUN KURALLARI (saf mantık) =================
   Bu modül DOM'a, global oyun durumuna (S) ya da rastgeleliğe dokunmaz: her fonksiyon aldığı değerlerden
   sonuç hesaplar. Böylece denge kuralları birim testleriyle doğrulanabilir, tip denetiminden geçer ve
   ileride sunucuda (ör. çevrimiçi sıralama doğrulaması) aynen kullanılabilir.
   Arayüz tarafındaki modüller (places, match, systems, story) bu fonksiyonları oyun durumundan
   okudukları değerlerle çağırır. */

/** @typedef {"lise"|"uni"|"t3"|"t2"|"t1"|"euro"|"nba"} Stage */
/** @typedef {"star"|"rot"|"bench"} Role */

/** Kariyer basamakları, alttan üste. @type {Stage[]} */
export const STAGES = ["lise", "uni", "t3", "t2", "t1", "euro", "nba"];
/** Basamakların taban zorluğu (lig seviyesi = taban + 45 genel puan). */
export const TDB = { lise: -15, uni: -7, t3: -5, t2: 5, t1: 15, euro: 25, nba: 35 };
/** Denge ayarları (denge simülasyonuyla belirlendi). */
export const BAL = {
  train: 1.32, // antrenman kazanç katsayısı (ekonomi düzeltmesinde takım antrenmanı ve AVM eşyaları azaldı: 1.3 → 1.32) (ondalık; maçtan gelen gelişim arttığı için 1.45ten düşürüldü)
  play: 0.035, // başarılı maç anında niteliğe eklenen kesir
  /** @type {[number, number, number][]} [yaşa kadar, min, maks] yaz gelişimi */
  grow: [
    [18, 0, 2],
    [21, 0, 1],
    [25, 0, 1],
    [29, 0, 0],
    [31, -1, 0],
    [33, -2, -1],
    [99, -3, -1]
  ],
  need: { t3: 0, t2: 50, t1: 61, euro: 72, nba: 81 }, // teklif için gereken potansiyel
  tax: { lise: 0, uni: 0, t3: 0.2, t2: 0.3, t1: 0.33, euro: 0.35, nba: 0.37 }, // vergi oranı
  agent: 0.05, // profesyonel menajer payı
  living: { lise: 0, uni: 0, t3: 20, t2: 55, t1: 175, euro: 650, nba: 2250 } // haftalık yaşam gideri
};
/** Haftalık ücretler. Sezon 14 hafta (çift devreli lig) olduğu için değerler yarı ölçekte. */
export const WAGE = { lise: 4, uni: 10, t3: 150, t2: 450, t1: 1500, euro: 6000, nba: 22500 };
/** Bireysel ödül eşikleri (maç başı ortalamalar ve sezon not ortalaması). */
export const AWARD_T = { mvp: 8.0, ppg: 22, apg: 7, rpg: 10, dpg: 3, roy: 7.3, fmvp: 7.8, allstar: 7.5 };

/** @param {string} st */
export const isProStage = st => STAGES.indexOf(/** @type {Stage} */ (st)) >= 2;

/**
 * Bir ligin zorluk seviyesi. Ülke çarpanı (pr) yalnızca 1-3. seviye ulusal liglerde geçerlidir.
 * @param {Stage} stage @param {number} [pr] ülke çarpanı (ör. Türkiye 0.97)
 */
export function stageLevel(stage, pr = 1) {
  const p = ["t1", "t2", "t3"].includes(stage) ? pr : 1;
  return Math.round((TDB[stage] + 15) * p - 15);
}
/** Genel puan ile lig seviyesi arasındaki fark ("üstünlük"). @param {number} ovr @param {number} level */
export const dominanceOf = (ovr, level) => ovr - (level + 45);
/** Takımdaki rol: üstünlük +6 ve üstü ilk beş, -3 ve üstü rotasyon. @param {number} ovr @param {number} level @returns {Role} */
export function roleFor(ovr, level) {
  const d = dominanceOf(ovr, level);
  return d >= 6 ? "star" : d >= -3 ? "rot" : "bench";
}

/**
 * Antrenmandan gelen kesirli nitelik kazancı. Başarı oranının ve kalan gelişim payının üssüyle ölçeklenir;
 * gençler daha hızlı, 30 yaş sonrası çok daha yavaş gelişir.
 * @param {{ratio:number, stat:number, age:number, coach?:boolean, buff?:boolean}} p
 */
export function trainingGain({ ratio, stat, age, coach = false, buff = false }) {
  const ageMul = age <= 21 ? 1.3 : age <= 24 ? 1.12 : age >= 34 ? 0.15 : age >= 32 ? 0.3 : age >= 30 ? 0.5 : 1;
  return (
    BAL.train *
    Math.pow(Math.max(0, Math.min(1, ratio)), 2.5) *
    Math.pow(Math.max(0, 100 - stat) / 70, 2.2) *
    (coach ? 1.25 : 1) *
    (buff ? 1.2 : 1) *
    ageMul
  );
}

/** Gözlemci potansiyeli: genel puan + sezon notu + şampiyonluk + şöhret. @param {{ovr:number, avg:number, champ?:boolean, fame?:number}} p */
export function potentialScore({ ovr, avg, champ = false, fame = 0 }) {
  return ovr + (avg - 6.5) * 5 + (champ ? 2 : 0) + fame * 0.03;
}

/**
 * Teklif gelebilecek basamaklar (kapı kuralları).
 * @param {{P:number, avg:number, age:number, stage:Stage}} p
 * @returns {Stage[]}
 */
export function eligibleStages({ P, avg, age, stage }) {
  const cur = STAGES.indexOf(stage),
    cap = cur < 2 ? 3 : cur + 1;
  /** @type {Stage[]} */
  const up = ["t3", "t2", "t1", "euro", "nba"];
  return up.filter(st => {
    if (st !== "t3" && P < BAL.need[/** @type {"t2"} */ (st)]) return false;
    if (st === "euro" && stage !== "euro" && (avg < 6.8 || age > 30)) return false;
    if (st === "nba" && (avg < 6.9 || age > 29)) return false;
    return STAGES.indexOf(st) <= cap;
  });
}
/** Teklif maaşı: basamak ücreti × ülke × rol × üstünlük × (menajer bonusu).
 * @param {{stage:Stage, pr?:number, role:Role, dominance:number, agentBoost?:boolean}} p */
export function offerWage({ stage, pr = 1, role, dominance, agentBoost = false }) {
  const roleMul = { star: 1.35, rot: 1, bench: 0.7 }[/** @type {Role} */ (role)];
  return Math.round(
    WAGE[/** @type {Stage} */ (stage)] * pr * roleMul * (1 + Math.max(-10, Math.min(25, dominance)) / 50) * (agentBoost ? 1.2 : 1)
  );
}

/** Maç başına sakatlanma olasılığı. @param {{energy:number, age:number, kryo?:boolean, fizyo?:boolean, mul?:number}} p */
export function injuryChance({ energy, age, kryo = false, fizyo = false, mul = 1 }) {
  const base =
    0.009 + Math.max(0, 50 - energy) / 1100 + (age > 29 ? (age - 29) * 0.0025 : 0) - (kryo ? 0.0035 : 0) - (fizyo ? 0.0045 : 0);
  return Math.max(0.0025, Math.min(0.1, base * mul));
}

/** Maç primi. @param {{stage:Stage, wage:number, rating:number, win:boolean}} p */
export function matchBonus({ stage, wage, rating, win }) {
  return Math.round((stage === "lise" ? 2 : stage === "uni" ? 6 : wage * 0.12) * (rating / 6) * (win ? 1.5 : 1));
}

/**
 * Haftalık gelir-gider kalemleri.
 * @param {{stage:Stage, wage:number, rent?:number, rentLabel?:string, upkeep?:number, income?:number}} p
 * @returns {{label:string, key?:string, v?:Object<string, string|number>, amount:number}[]}
 */
export function weeklyLedger({ stage, wage, rent = 0, rentLabel = "", upkeep = 0, income = 0 }) {
  // key/v: arayüz dili için çeviri anahtarı (label: Türkçe yedek)
  const k0 = stage === "lise" ? "allow" : stage === "uni" ? "schol" : "wage";
  /** @type {{label:string, key?:string, v?:Object<string, string|number>, amount:number}[]} */
  const out = [{ label: stage === "lise" ? "Harçlık" : stage === "uni" ? "Burs" : "Maaş", key: `led.${k0}`, amount: wage }];
  const cut = (BAL.tax[stage] || 0) + (isProStage(stage) ? BAL.agent : 0);
  if (cut > 0)
    out.push({
      label: `Vergi ve menajer payı (%${Math.round(cut * 100)})`,
      key: "led.tax",
      v: { p: Math.round(cut * 100) },
      amount: -wage * cut
    });
  if (BAL.living[stage]) out.push({ label: "Yaşam giderleri", key: "led.living", amount: -BAL.living[stage] });
  if (income) out.push({ label: "Yatırım geliri", key: "led.inc", amount: income });
  if (rent) out.push({ label: `Kira · ${rentLabel}`, key: "led.rent", v: { n: rentLabel }, amount: -rent });
  if (upkeep) out.push({ label: "Araç masrafları", key: "led.car", amount: -upkeep });
  return out;
}

/**
 * Sezon sonu bireysel ödüller. Ödüller hem istatistiğe hem lig içindeki üstünlüğe bakar:
 * alt liglerde kolay, üst liglerde zor kazanılır.
 * @param {{games:number, avg:number, ppg:number, apg:number, rpg:number, dpg:number, dominance:number, winRate:number,
 *   rookieEligible:boolean, champ:boolean, role:Role, finalRating:number}} p
 * @returns {("mvp"|"ppg"|"apg"|"rpg"|"dpoy"|"roy"|"fmvp")[]}
 */
export function seasonAwardKinds(p) {
  /** @type {("mvp"|"ppg"|"apg"|"rpg"|"dpoy"|"roy"|"fmvp")[]} */
  const out = [];
  if (p.games < 7) return out;
  if (p.avg >= AWARD_T.mvp && p.dominance >= 10 && p.winRate >= 0.65) out.push("mvp");
  const lead = p.dominance >= 6;
  if (lead && p.ppg >= AWARD_T.ppg) out.push("ppg");
  if (lead && p.apg >= AWARD_T.apg) out.push("apg");
  if (lead && p.rpg >= AWARD_T.rpg) out.push("rpg");
  if (p.dominance >= 6 && p.dpg >= AWARD_T.dpg) out.push("dpoy");
  if (p.rookieEligible && p.avg >= AWARD_T.roy) out.push("roy");
  if (p.champ && p.role === "star" && p.finalRating >= AWARD_T.fmvp) out.push("fmvp");
  return out;
}

/** Otomatik maçta bir hamlenin başarı olasılığı (nitelik etkinliğine göre). @param {number} eff @param {number} [base] */
export const autoSuccess = (eff, base = 0.46) => Math.max(0.08, Math.min(0.92, base + (eff - 40) * 0.0075));

/** Rakip oyuncunun yıllık gelişim aralığı [min, maks] (yetenek çarpanı uygulanmadan). @param {number} age @returns {[number, number]} */
export function rivalGrowthRange(age) {
  return age <= 19 ? [5, 8] : age <= 22 ? [3, 6] : age <= 26 ? [1, 4] : age <= 29 ? [0, 2] : age <= 31 ? [-1, 1] : [-3, -1];
}
