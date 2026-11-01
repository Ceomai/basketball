// Oyun kurallarının birim testleri: node --test tests/unit
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/logic/rules.js";

test("lig seviyesi: ülke çarpanı yalnızca ulusal liglerde", () => {
  assert.equal(R.stageLevel("nba", 0.5), 35);
  assert.equal(R.stageLevel("euro", 0.5), 25);
  assert.equal(R.stageLevel("t1", 1), 15);
  assert.ok(R.stageLevel("t1", 0.9) < R.stageLevel("t1", 1));
});

test("rol: üstünlüğe göre ilk beş / rotasyon / yedek", () => {
  const lvl = R.stageLevel("t2");
  assert.equal(R.roleFor(lvl + 45 + 6, lvl), "star");
  assert.equal(R.roleFor(lvl + 45, lvl), "rot");
  assert.equal(R.roleFor(lvl + 45 - 4, lvl), "bench");
});

test("antrenman: başarı, yaş ve kalan gelişim payı kazancı belirler", () => {
  const base = { ratio: 1, stat: 40, age: 20 };
  assert.ok(R.trainingGain(base) > R.trainingGain({ ...base, ratio: 0.5 }), "daha iyi performans daha çok kazanç");
  assert.ok(R.trainingGain(base) > R.trainingGain({ ...base, age: 31 }), "gençler daha hızlı gelişir");
  assert.ok(R.trainingGain(base) > R.trainingGain({ ...base, stat: 85 }), "yüksek nitelikte gelişim yavaşlar");
  assert.equal(R.trainingGain({ ...base, ratio: 0 }), 0);
  assert.equal(R.trainingGain({ ...base, stat: 100 }), 0);
  assert.ok(Math.abs(R.trainingGain({ ...base, coach: true }) / R.trainingGain(base) - 1.25) < 1e-9, "hoca %25 artırır");
});

test("teklif kapıları: NBA yaş ve not sınırı, basamak atlama sınırı", () => {
  const strong = { P: 95, avg: 7.5, age: 25, stage: "euro" };
  assert.ok(R.eligibleStages(strong).includes("nba"));
  assert.ok(!R.eligibleStages({ ...strong, age: 30 }).includes("nba"), "30 yaşında NBA teklifi yok");
  assert.ok(!R.eligibleStages({ ...strong, avg: 6.5 }).includes("nba"), "düşük notla NBA teklifi yok");
  assert.deepEqual(R.eligibleStages({ P: 99, avg: 9, age: 18, stage: "lise" }), ["t3", "t2"], "liseden en fazla 2. lige");
  assert.deepEqual(R.eligibleStages({ P: 0, avg: 5, age: 20, stage: "uni" }), ["t3"], "potansiyel düşükse yalnızca 3. lig");
});

test("teklif maaşı: rol ve üstünlükle artar", () => {
  const w = o => R.offerWage({ stage: "t1", pr: 1, role: "rot", dominance: 0, ...o });
  assert.equal(w({}), R.WAGE.t1);
  assert.ok(w({ role: "star" }) > w({}) && w({ role: "bench" }) < w({}));
  assert.ok(w({ dominance: 25 }) > w({ dominance: 0 }));
  assert.equal(w({ dominance: 100 }), w({ dominance: 25 }), "üstünlük etkisi sınırlı");
});

test("sakatlık olasılığı: yorgunluk ve yaşla artar, sınırlar içinde kalır", () => {
  const fresh = R.injuryChance({ energy: 90, age: 22 });
  assert.ok(R.injuryChance({ energy: 10, age: 22 }) > fresh);
  assert.ok(R.injuryChance({ energy: 90, age: 34 }) > fresh);
  assert.ok(R.injuryChance({ energy: 90, age: 22, fizyo: true, kryo: true }) < fresh);
  assert.ok(R.injuryChance({ energy: 0, age: 40, mul: 10 }) <= 0.1);
  assert.ok(R.injuryChance({ energy: 100, age: 18, fizyo: true, kryo: true, mul: 0.1 }) >= 0.0025);
});

test("haftalık bütçe: profesyonelde vergi + menajer payı ve yaşam gideri", () => {
  const L = R.weeklyLedger({ stage: "t1", wage: 1000, rent: 70, rentLabel: "Daire", upkeep: 10, income: 5 });
  const net = L.reduce((a, x) => a + x.amount, 0);
  assert.equal(L[0].amount, 1000);
  assert.equal(net, 1000 - 1000 * (R.BAL.tax.t1 + R.BAL.agent) - R.BAL.living.t1 + 5 - 70 - 10);
  assert.equal(R.weeklyLedger({ stage: "lise", wage: 4 }).length, 1, "lisede vergi ve gider yok");
});

test("ödüller: üstünlük olmadan istatistik krallığı ve MVP yok", () => {
  const p = {
    games: 14,
    avg: 8.3,
    ppg: 25,
    apg: 8,
    rpg: 11,
    dpg: 3.5,
    dominance: 12,
    winRate: 0.8,
    rookieEligible: true,
    champ: true,
    role: "star",
    finalRating: 8
  };
  assert.deepEqual(R.seasonAwardKinds(p).sort(), ["apg", "dpoy", "fmvp", "mvp", "ppg", "roy", "rpg"]);
  assert.deepEqual(R.seasonAwardKinds({ ...p, dominance: 0, rookieEligible: false, champ: false }), []);
  assert.deepEqual(R.seasonAwardKinds({ ...p, games: 5 }), [], "az maçla ödül yok");
});

test("otomatik maç başarı olasılığı sınırlı ve niteliğe bağlı", () => {
  assert.ok(R.autoSuccess(80) > R.autoSuccess(40));
  assert.equal(R.autoSuccess(1000), 0.92);
  assert.equal(R.autoSuccess(-1000), 0.08);
});
