// Oyun durumu tanımının birim testleri
import { test } from "node:test";
import assert from "node:assert/strict";
import { createState, baseStats } from "../../src/state.js";

const npc = {
  mom: "Ayşe",
  dad: "Mehmet",
  friend: "Can",
  rival: "Arda Kaya",
  agent: "Onur Koç",
  journalist: "Elif Yıldız",
  coach: "Tolga Demir"
};
test("yeni kariyer: başlangıç değerleri ve pozisyon bonusu", () => {
  const s = createState(
    { first: "Ali", last: "Kaya", pos: "SG", num: 23, look: { skin: "#fff" } },
    { posBonus: { sut: 8, hiz: 4 }, npc }
  );
  assert.equal(s.stage, "lise");
  assert.equal(s.age, 16);
  assert.deepEqual(s.st, { sut: 28, pas: 20, hiz: 24, guc: 20, sav: 20 });
  assert.equal(s.npc.rival, "Arda Kaya");
  assert.deepEqual(s.arcs, {});
  assert.equal(s.program, "denge");
});
test("durum nesneleri paylaşılmaz (iki kariyer birbirini etkilemez)", () => {
  const p = { first: "A", last: "B", pos: "C", num: 1, look: { skin: "#fff" } };
  const a = createState(p, { posBonus: {}, npc }),
    b = createState(p, { posBonus: {}, npc });
  a.st.sut = 99;
  a.look.skin = "#000";
  a.rel.koc = 1;
  assert.equal(b.st.sut, 20);
  assert.equal(b.look.skin, "#fff");
  assert.equal(b.rel.koc, 45);
  assert.equal(p.look.skin, "#fff");
});
test("baseStats bilinmeyen bonusu yok sayar", () => {
  assert.deepEqual(baseStats(undefined), { sut: 20, pas: 20, hiz: 20, guc: 20, sav: 20 });
});

import { syncDecision } from "../../src/logic/sync.js";
test("bulut kayıt çakışma kararı", () => {
  assert.equal(syncDecision(null, null), "none");
  assert.equal(syncDecision({ ts: 10 }, null), "upload");
  assert.equal(syncDecision(null, { ts: 10 }), "download");
  assert.equal(syncDecision({ ts: 100000 }, { ts: 1000 }), "upload");
  assert.equal(syncDecision({ ts: 1000 }, { ts: 100000 }), "ask");
  assert.equal(syncDecision({ ts: 5000 }, { ts: 5500 }), "none");
});
