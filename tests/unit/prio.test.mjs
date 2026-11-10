// Haftalık panel öncelikleri (src/data.js PRIO): eşit öncelikte sıra modül yükleme sırasına kalır. Bu test eşit
// öncelikli sağlayıcıları raporlar ve bilinen eşlerin dışında yeni bir çakışma çıkarsa uyarır (sıra davranışı değişmez).
// Ayrıca her "week:sheet" kaydı sihirli sayı yerine PRIO adını kullanmalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");
const data = fs.readFileSync(path.join(SRC, "data.js"), "utf8");
const block = data.match(/export const PRIO = Object\.freeze\(\{([\s\S]*?)\}\);/);
const PRIO = Object.fromEntries([...block[1].matchAll(/(\w+): (\d+)/g)].map(m => [m[1], +m[2]]));
// bilinen eşler: kayıt sırası (src/game.js MODULES) belirler; bilerek böyle
const KNOWN = ["bondsBye=storyTick", "bondsAbroad=bondsMate", "cultureWelcome=derbyCity"];

test("PRIO tablosu okunur ve değerler sayı", () => {
  assert.ok(Object.keys(PRIO).length >= 25);
  for (const v of Object.values(PRIO)) assert.ok(Number.isInteger(v) && v > 0);
});
test("eşit öncelikli haftalık paneller raporlanır; yeni çakışma yok", () => {
  const by = {};
  for (const [k, v] of Object.entries(PRIO)) (by[v] = by[v] || []).push(k);
  const ties = Object.values(by)
    .filter(a => a.length > 1)
    .map(a => a.sort().join("="))
    .sort();
  if (ties.length) console.log("eşit öncelik:", ties.join(", "));
  assert.deepEqual(ties, [...KNOWN].sort());
});
test('"week:sheet" sağlayıcıları sihirli sayı değil PRIO adı kullanır', () => {
  const bad = [];
  for (const f of fs.readdirSync(SRC).filter(f => f.endsWith(".js"))) {
    const s = fs.readFileSync(path.join(SRC, f), "utf8");
    for (const m of s.matchAll(/Bus\.offer\(\s*"week:sheet"/g)) {
      // çağrının sonuna kadar (parantez dengesi)
      let d = 0,
        i = m.index + "Bus.offer".length;
      for (; i < s.length; i++) {
        if (s[i] === "(") d++;
        else if (s[i] === ")" && --d === 0) break;
      }
      if (!/PRIO\.\w+\s*(,\s*"\w*"\s*)?\)$/.test(s.slice(m.index, i + 1))) bad.push(`${f}:${m.index}`);
    }
  }
  assert.deepEqual(bad, []);
});
