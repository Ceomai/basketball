// Ekransız maç (src/logic/simmatch.js): saat, rotasyon ve node'da hızlı istatistik testi. Oyunun simüle maçının
// bu döngüyle birebir aynı oynadığı tarayıcı altın kaydında (tests/match-golden.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../../src/logic/rng.js";
import { matchClock, planHas, rngInt, simulateMatch, stintPlanOf } from "../../src/logic/simmatch.js";

test("saat: çeyrek ve kalan süre, uzatma 5 dakika", () => {
  assert.deepEqual(matchClock(0), { q: 1, clock: "10:00" });
  assert.deepEqual(matchClock(615), { q: 2, clock: "09:45" });
  assert.deepEqual(matchClock(2399), { q: 4, clock: "00:01" });
  assert.deepEqual(matchClock(2400), { q: 4, clock: "05:00" });
  assert.deepEqual(matchClock(2650), { q: 4, clock: "00:50" });
  assert.equal(
    rngInt(() => 0.999999, 12, 22),
    22
  );
  assert.equal(
    rngInt(() => 0, 12, 22),
    12
  );
});

test("rotasyon planı: rol, düşük enerji, koçla kötü ilişki", () => {
  assert.deepEqual(stintPlanOf("star", 70, 50)[0], [0, 7]);
  assert.deepEqual(stintPlanOf("rot", 20, 50)[0], [3, 8]);
  assert.equal(stintPlanOf("bench", 70, 10).length, 3);
  assert.equal(stintPlanOf("star", 70, 10).length, 4);
  assert.ok(planHas(stintPlanOf("star", 70, 50), 5) && !planHas(stintPlanOf("star", 70, 50), 8));
});

test("aynı tohum → aynı maç; çeyrek skorları artan, uzatmada 5. kayıt", async () => {
  const a = await simulateMatch({ us: { str: 1 }, them: { str: 1 } }, mulberry32(9));
  const b = await simulateMatch({ us: { str: 1 }, them: { str: 1 } }, mulberry32(9));
  assert.deepEqual(a, b);
  const { m } = a;
  assert.ok(m.qs.length >= 4);
  for (let i = 1; i < m.qs.length; i++) assert.ok(m.qs[i][0] >= m.qs[i - 1][0] && m.qs[i][1] >= m.qs[i - 1][1]);
  assert.deepEqual(m.qs[m.qs.length - 1], [m.us, m.them]);
  assert.notEqual(m.us, m.them); // berabere biten maç yok
  assert.ok(m.mins > 0 && m.mins <= 2400);
});

test("bağımlılıklar: çeyrek arası, oyuna giriş/çıkış ve hücum sayısı", async () => {
  const calls = { qb: 0, sub: 0, poss: 0, mom: 0 };
  const m = { dz: "man", stint: 0, us: 0, them: 0, mins: 0, plus: 0, tac: null, qs: [] };
  await simulateMatch(
    {
      us: { str: 1 },
      them: { str: 1 },
      opts: {
        m,
        role: "star",
        hooks: {
          quarterBreak: () => calls.qb++,
          sub: () => calls.sub++,
          possession: us => (calls.poss++, us ? (m.us += 1) : (m.them += 2)),
          moment: () => calls.mom++
        }
      }
    },
    mulberry32(3)
  );
  assert.equal(calls.qb, 3); // rakip her hücumda daha çok atar: uzatma yok
  assert.equal(calls.sub, 7); // yıldız: 4 aralık → 4 giriş + 3 çıkış (son aralık maç sonuna kadar)
  assert.ok(calls.poss + calls.mom > 120 && calls.poss + calls.mom < 200);
  assert.ok(calls.mom > 0);
});

test("2000 maç (eşit güç): galibiyet ~%50, skorlar makul aralıkta", async () => {
  const rng = mulberry32(2024);
  const N = 2000;
  let w = 0,
    pts = 0,
    ot = 0;
  for (let i = 0; i < N; i++) {
    const { m } = await simulateMatch({ us: { str: 1 }, them: { str: 1 }, opts: { ppp: 0.5 } }, rng);
    if (m.us > m.them) w++;
    if (m.qs.length > 4) ot++;
    pts += m.us + m.them;
  }
  const wr = w / N,
    avg = pts / N / 2;
  // bizim takım kenardayken %3 daha az isabetli (sen sahada değilsin): oran %50'nin biraz altında
  assert.ok(wr > 0.44 && wr < 0.53, `galibiyet ${wr}`);
  assert.ok(avg > 70 && avg < 95, `ortalama skor ${avg}`);
  assert.ok(ot / N > 0.01 && ot / N < 0.08, `uzatma ${ot / N}`);
});

test("güçlü takım daha çok kazanır", async () => {
  const r2 = mulberry32(7);
  let ws = 0;
  for (let i = 0; i < 600; i++) {
    const { m } = await simulateMatch({ us: { str: 1.08 }, them: { str: 1 } }, r2);
    if (m.us > m.them) ws++;
  }
  assert.ok(ws / 600 > 0.65, `galibiyet ${ws / 600}`);
});
