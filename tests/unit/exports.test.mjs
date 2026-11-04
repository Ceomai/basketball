// Modüller arası geç bağlama (src/late.js) adla çalışır: iki modül aynı adı dışa aktarırsa ilk yüklenen kazanır ve
// diğeri sessizce gölgede kalır (ör. Günün Maçı ve saha görünümünde ikisi de "scenario" idi). Bu test aynı adı
// birden çok modülde dışa aktarmayı yakalar.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");
test("src/*.js modüllerinde aynı adla iki dışa aktarım yok", () => {
  const map = {};
  for (const f of fs.readdirSync(SRC).filter(f => f.endsWith(".js"))) {
    const s = fs.readFileSync(path.join(SRC, f), "utf8");
    for (const m of s.matchAll(/^export (?:async )?(?:function|const|let) ([A-Za-z0-9_$]+)/gm)) (map[m[1]] = map[m[1]] || []).push(f);
  }
  const dup = Object.entries(map)
    .filter(([, v]) => v.length > 1)
    .map(([k, v]) => `${k}: ${v.join(", ")}`);
  assert.deepEqual(dup, []);
});
