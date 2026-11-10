// Arka plan hücumunun saf hesabı (src/logic/possession.js): olasılık sınırları, RNG çekiş sırası/sayısı, sonuç biçimi.
// Oyundaki uygulamayla birebir eşitlik tests/unit/match-golden.test.mjs ve tests/match-golden.js'te.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../../src/logic/rng.js";
import { possessionChance, possessionCredit, possessionShot, resolvePossession, rngIndex } from "../../src/logic/possession.js";

/** sabit dizili sahte üreteç: çekilen değerleri sırayla verir, sayar */
const seq = vals => {
  let i = 0;
  const f = () => vals[i++ % vals.length];
  f.n = () => i;
  return f;
};
const base = { us: true, on: true, ppp: 0.5, ourStr: 1, oppStr: 1, tac: null, possMod: 1, osPossMul: 1 };

test("isabet olasılığı: eşit güçte ppp, taktik ve kenar etkisi, %15-%85 sınırı", () => {
  assert.equal(possessionChance(base), 0.5);
  assert.ok(possessionChance({ ...base, tac: "tempo" }) > 0.5);
  assert.ok(possessionChance({ ...base, on: false }) < 0.5);
  assert.equal(possessionChance({ ...base, ppp: 5 }), 0.85);
  assert.equal(possessionChance({ ...base, ppp: 0.01 }), 0.15);
  // rakip hücumunda güç oranı ters
  assert.ok(possessionChance({ ...base, us: false, ourStr: 1.1 }) < possessionChance({ ...base, ourStr: 1.1 }));
});

test("ilk aşama: bizim hücumda yıldız/faul çekişi yok; rakipte yıldız payı, faul yalnız sahadayken", () => {
  let r = seq([0.99, 0.1, 0.2]);
  let s = possessionShot({ us: true, on: true, p: 0.5, nMates: 4, nFoes: 5, refMul: 1, threeP: 0.32 }, r);
  assert.deepEqual(s, { starTurn: false, who: 3, bgFoul: false, sc: true, three: true, pts: 3 });
  assert.equal(r.n(), 3); // atan, isabet, üçlük
  r = seq([0.1, 0.001, 0.9]);
  s = possessionShot({ us: false, on: true, p: 0.5, nMates: 4, nFoes: 5, refMul: 1, threeP: 0.32 }, r);
  assert.deepEqual(s, { starTurn: true, who: 0, bgFoul: true, sc: false, three: false, pts: 0 });
  assert.equal(r.n(), 3); // yıldız payı, faul, isabet (yıldız seçiminde atan çekilmez)
  r = seq([0.5, 0.5, 0.9]);
  s = possessionShot({ us: false, on: false, p: 0.5, nMates: 4, nFoes: 5, refMul: 1, threeP: 0.32 }, r);
  assert.equal(s.who, 3);
  assert.equal(r.n(), 3); // yıldız payı, atan (1..4), isabet; kenardayken faul çekişi yok
});

test("ikinci aşama: senin sayın, asist, ribaund ve akış satırları", () => {
  const c = {
    us: true,
    on: true,
    sc: true,
    three: false,
    mode: "full",
    role: "star",
    pos: "C",
    sk: 60,
    pas: 60,
    guc: 60,
    trust: 1
  };
  assert.deepEqual(possessionCredit(c, seq([0, 0.5])), {
    mine: true,
    ast: false,
    reb: false,
    feed: { kind: "mine", three: false, line: 1 }
  });
  assert.deepEqual(possessionCredit({ ...c, mode: "key" }, seq([0])), { mine: true, ast: false, reb: false, feed: null });
  assert.deepEqual(possessionCredit({ ...c, mode: "key" }, seq([0.99, 0.01, 0.9])), {
    mine: false,
    ast: true,
    reb: false,
    feed: null
  });
  assert.deepEqual(possessionCredit({ ...c, sc: false }, seq([0.01])), { mine: false, ast: false, reb: true, feed: null });
  assert.deepEqual(possessionCredit({ ...c, sc: false, on: false }, seq([0.1, 0.6])), {
    mine: false,
    ast: false,
    reb: false,
    feed: { kind: "miss", line: 2 }
  });
});

test("tek hücum: uygulama geri çağrısı ilk aşamadan sonra, ikinci aşamadan önce", () => {
  const order = [];
  const r = resolvePossession(
    { us: true, on: false, p: 0.6, nMates: 4, nFoes: 5, refMul: 1, threeP: 0.32 },
    mulberry32(7),
    shot => {
      order.push(["apply", shot.sc]);
      return { mode: "key", role: "rot", pos: "PG", sk: 50, pas: 50, guc: 50, trust: 1 };
    }
  );
  assert.equal(order.length, 1);
  assert.equal(typeof r.sc, "boolean");
  assert.equal(
    rngIndex(() => 0.999, 4),
    3
  );
});

test("uzun koşu: eşit güçte hücum başına sayı makul aralıkta", () => {
  const rng = mulberry32(42);
  let us = 0,
    them = 0;
  const N = 40000;
  for (let i = 0; i < N; i++) {
    const side = i % 2 === 0;
    const p = possessionChance({ ...base, us: side, on: false });
    const s = possessionShot({ us: side, on: false, p, nMates: 4, nFoes: 5, refMul: 1, threeP: 0.32 }, rng);
    if (side) us += s.pts;
    else them += s.pts;
  }
  const ppp = (us + them) / N;
  assert.ok(ppp > 1.0 && ppp < 1.25, `hücum başına ${ppp}`);
});
