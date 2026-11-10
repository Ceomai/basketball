// Saf oyun mantığı (src/logic): kayıt şeması geçişleri eski kayıt örnekleriyle, sözleşme bedeli ve play-off sayımı.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SAVE_V, MIGRATIONS, cleanStrings, upgradeSchema, normalizeSchema } from "../../src/logic/saveSchema.js";
import { buyoutFee, seriesCount, seriesAdapt } from "../../src/logic/career.js";
import { brandSave } from "../../src/brand.js";
import { createState } from "../../src/state.js";

const FX = path.resolve(import.meta.dirname, "../fixtures");
const fixtures = fs.readdirSync(FX).filter(f => /^old-.*\.json$/.test(f));
const load = f => JSON.parse(fs.readFileSync(path.join(FX, f), "utf8"));
const open = (raw, from) => normalizeSchema(upgradeSchema(raw, from, brandSave), createState, "Mavi Martı Spor Lisesi");

test("eski kayıt örnekleri güncel şemaya yükselir ve eksiksiz açılır", () => {
  assert.ok(fixtures.length >= 4);
  for (const f of fixtures) {
    const o = load(f);
    const s = open(o.S, o.v);
    assert.equal(s.schema, SAVE_V, f);
    for (const k of ["first", "team", "st", "rel", "league", "career", "teams", "news", "buffs", "unlocks"]) assert.ok(s[k] != null, `${f}: ${k}`);
    for (const k of ["sut", "pas", "hiz", "guc", "sav"]) assert.equal(typeof s.st[k], "number", `${f}: st.${k}`);
    assert.ok(Array.isArray(s.career.trophies), f);
  }
});
test("v3 kayıt: sürüm 5 geçişi ücreti yarıya indirir, bir kez", () => {
  const o = load(fixtures[0]).S;
  delete o.wk14;
  o.wage = 40;
  const s = open(o, 3);
  assert.equal(s.wage, 20);
  assert.equal(s.wk14, 1);
  MIGRATIONS[5](s); // ikinci kez uygulansa da değişmez
  assert.equal(s.wage, 20);
  // güncel sürümden açılan kayıtta geçiş çalışmaz
  const n = load(fixtures[0]).S;
  delete n.wk14;
  n.wage = 40;
  assert.equal(open(n, SAVE_V).wage, 40);
});
test("bozuk alanlar onarılır, işaretleme karakterleri temizlenir", () => {
  const o = load(fixtures[0]).S;
  Object.assign(o, { npc: 5, rel: [], money: "x", st: null, hist: {}, first: "<b>Ali</b>" });
  const s = open(o, SAVE_V);
  assert.equal(s.first, "bAli/b");
  assert.equal(typeof s.npc.mom, "string");
  assert.equal(s.rel.koc, 50);
  assert.equal(s.money, 30);
  assert.equal(s.st.sut, 20);
  assert.ok(Array.isArray(s.hist));
  assert.deepEqual(cleanStrings({ a: { b: ["<x>"] } }), { a: { b: ["x"] } });
});
test("serbest kalma bedeli: ücret × 4 × kalan yıl (en çok 2); maddeler ve okul/aynı kulüp bedelsiz", () => {
  const st = { stage: "t2", contract: 3, wage: 50, clauses: {} };
  assert.equal(buyoutFee({ stage: "t1" }, st), 400);
  assert.equal(buyoutFee({ stage: "t1" }, { ...st, contract: 1 }), 200);
  assert.equal(buyoutFee({ stage: "t1", stay: true }, st), 0);
  assert.equal(buyoutFee({ stage: "uni", uni: true }, st), 0);
  assert.equal(buyoutFee({ stage: "t1" }, { ...st, contract: 0 }), 0);
  assert.equal(buyoutFee({ stage: "t1" }, { ...st, stage: "uni" }), 0);
  assert.equal(buyoutFee({ stage: "t1" }, { ...st, clauses: { release: 1 } }), 0); // üst lige çıkış maddesi
  assert.equal(buyoutFee({ stage: "t3" }, { ...st, clauses: { release: 1 } }), 400); // alt lige: madde işlemez
  assert.equal(buyoutFee({ stage: "nba" }, { ...st, clauses: { nbaout: 1 } }), 0);
});
test("play-off serisi sayımı ve rakip uyarlaması", () => {
  const s = { w: 0, l: 0, need: 3 };
  assert.equal(seriesCount(s, true), false);
  assert.equal(s.mom, 1);
  assert.equal(seriesCount(s, false), false);
  assert.equal(s.mom, -1);
  seriesCount(s, true);
  assert.equal(seriesCount(s, true), true);
  assert.deepEqual([s.w, s.l], [3, 1]);
  assert.equal(seriesAdapt({ sut: 3, pas: 1 }, false), "sut");
  assert.equal(seriesAdapt({ sut: 1, pas: 1 }, false), null);
  assert.equal(seriesAdapt({ sut: 3 }, true), null);
});
