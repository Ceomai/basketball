// Karar anı çözümünün saf hesabı (src/logic/plays.js): kategoriler, mini oyun sonrası sonuçlar, RNG çekiş sayısı.
// Oyundaki resolvePlay ile birebir eşitlik tests/unit/match-golden.test.mjs'te (eski kodun altın kaydı).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chargeP, freeThrowsOf, passConv, playCategory, playOutcome, safeP } from "../../src/logic/plays.js";

const seq = vals => {
  let i = 0;
  const f = () => vals[i++ % vals.length];
  f.n = () => i;
  return f;
};

test("kategoriler: şut, penetre, pas, post, smaç, ribaund, savunma; bilinmeyen anahtar serbest atış", () => {
  assert.equal(playCategory("corner"), "shot");
  assert.equal(playCategory("float"), "shot");
  assert.equal(playCategory("lay"), "drive");
  assert.equal(playCategory("lob"), "pass");
  assert.equal(playCategory("putback"), "rebound");
  assert.equal(playCategory("safe"), "safe");
  assert.equal(playCategory("free3"), "free");
  assert.equal(playCategory("bilinmeyen"), "free");
  assert.equal(freeThrowsOf("free3"), 3);
  assert.equal(freeThrowsOf("free"), 2);
});

test("şut: mini oyunun sayısı, RNG çekilmez", () => {
  const r = seq([0.5]);
  const o = playOutcome("corner", { made: 1, pts: 3 }, {}, r);
  assert.equal(r.n(), 0);
  assert.deepEqual([o.good, o.w, o.st, o.msg, o.d.pts], [true, 1.3, "sut", "hit3", 3]);
  assert.equal(playOutcome("mid", { made: 0, pts: 0 }, {}, r).msg, "miss");
});

test("penetre: başarısızsa hücum faulü şansı (hızlı hücumda yok), başarılıysa basket faul / bitiriş / kaçan", () => {
  let r = seq([0.1]);
  assert.equal(playOutcome("drive", { ok: 0 }, {}, r).foul, true);
  assert.equal(r.n(), 1);
  r = seq([0.1]);
  assert.equal(playOutcome("break", { ok: 0 }, {}, r).foul, false);
  assert.equal(r.n(), 0);
  r = seq([0.1]);
  const a = playOutcome("drive", { ok: 1 }, {}, r);
  assert.deepEqual([a.msg, a.d.pts, a.and1 && a.and1.track], ["and1", 2, false]);
  const b = playOutcome("lay", { ok: 1 }, {}, seq([0.5, 0.95]));
  assert.deepEqual([b.msg, b.w, b.d.pts], ["beat", 0.6, 0]);
});

test("pas, post, ribaund, savunma olasılıkları", () => {
  assert.ok(Math.abs(passConv("lob", 50, 40) - 0.9) < 1e-12);
  assert.equal(playOutcome("kick", { ok: 1 }, { takim: 50, chem: 40 }, seq([0.7])).d.ast, 1);
  assert.equal(playOutcome("kick", { ok: 1 }, { takim: 50, chem: 40 }, seq([0.8])).msg, "nice");
  const p = playOutcome("post", { ok: 1 }, { refAnd1: 1.5 }, seq([0.14]));
  assert.deepEqual([p.msg, p.w, p.and1 && p.and1.track], ["and1", 1.3, true]);
  assert.equal(playOutcome("dunk", { ok: 0 }, {}, seq([0])).msg, "dunkMiss");
  assert.deepEqual(playOutcome("reb", { ok: 1 }, {}, seq([0])).d, { pts: 0, ast: 0, reb: 1, blk: 0, stl: 0, stops: 1 });
  assert.equal(chargeP(0), 0.15);
  assert.equal(chargeP(100), 0.75);
  assert.equal(safeP(100), 0.9);
  assert.equal(playOutcome("safe", null, { pos: "PF", guc: 100, sav: 0 }, seq([0.85])).good, true);
  assert.equal(playOutcome("free3", { ok: 2 }, {}, seq([0])).d.pts, 2);
  assert.equal(playOutcome("free", { ok: true }, {}, seq([0])).d.pts, 1);
});
