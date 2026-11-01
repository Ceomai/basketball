// public/scenarios.json (tools/make-scenarios.js) beklenen beş durumu içermeli.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(import.meta.dirname, "../../public/scenarios.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const slot = i => JSON.parse(data.slots[i]).S;

test("beş yuva da dolu ve geçerli kayıt", () => {
  for (let i = 1; i <= 5; i++) {
    const s = slot(i);
    assert.ok(s.first && s.team && s.team.key && s.st && Array.isArray(s.league) && s.rel, `yuva ${i}`);
    assert.equal(s.saveSlot, i, `yuva ${i} numarası`);
  }
});
test("emeklilik sonrası durumları", () => {
  assert.equal(slot(1).retired, true);
  assert.ok(!slot(1).epilogue, "1: son bölüm seçilmemiş");
  assert.ok(slot(1).legacy.club >= 51, "1: başkanlık seçeneği açık");
  assert.equal(slot(2).epilogue, "baskan");
  assert.equal(slot(3).epilogue, "koc");
  assert.equal(slot(4).epilogue, "tv");
});
test("oğul kariyeri: aynı soyadı, babanın adı, miras", () => {
  const dad = slot(2),
    son = slot(5);
  assert.equal(son.last, dad.last);
  assert.notEqual(son.first, dad.first);
  assert.equal(son.age, 16);
  assert.ok(!son.retired);
  assert.equal(son.npc.dad, dad.first);
  assert.ok(son.heir && son.heir.bonus >= 2, "bonus: kademe + başkan");
});
