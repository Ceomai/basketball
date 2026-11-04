// Uzaktan ayar: bozuk ya da kötü niyetli ayar oyunu kilitleyemez; deney kovası kararlı.
import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.window = globalThis.window || {};
const { rcBuild, RC_DEFAULTS, VARIANTS } = await import("../../src/remote.js");

test("ayar yoksa varsayılanlar", () => {
  assert.deepEqual(rcBuild(null), RC_DEFAULTS);
});
test("sayılar güvenli aralığa kırpılır, yanlış tip ve bilinmeyen alan yok sayılır", () => {
  const c = rcBuild({
    ads: { dailyRewardCap: 9999, interstitial: { minGames: 0, everyGames: "1", minGapMs: 1, breaks: "no" }, evil: 1 },
    rewards: { retry: false, trainPerWeek: -5 },
    __proto__: { polluted: true }
  });
  assert.equal(c.ads.dailyRewardCap, 200);
  assert.equal(c.ads.interstitial.minGames, 2);
  assert.equal(c.ads.interstitial.everyGames, RC_DEFAULTS.ads.interstitial.everyGames);
  assert.equal(c.ads.interstitial.minGapMs, 120000);
  assert.equal(c.ads.interstitial.breaks, true);
  assert.equal(c.ads.evil, undefined);
  assert.equal(c.rewards.retry, false);
  assert.equal(c.rewards.trainPerWeek, 0);
  assert.equal({}.polluted, undefined);
});
test("deney kovası uygulanır ve aynı cihazda aynı kalır", () => {
  const raw = {
    experiments: [
      {
        id: "inter_start",
        variants: { A: { ads: { interstitial: { minGames: 6 } } }, B: { ads: { interstitial: { minGames: 4 } } } }
      }
    ]
  };
  const a = rcBuild(raw),
    v = VARIANTS.inter_start;
  assert.ok(v === "A" || v === "B");
  assert.equal(a.ads.interstitial.minGames, v === "A" ? 6 : 4);
  rcBuild(raw);
  assert.equal(VARIANTS.inter_start, v);
  rcBuild({ experiments: [{ id: "inter_start", on: false, variants: { A: {} } }] });
  assert.equal(VARIANTS.inter_start, undefined);
});
