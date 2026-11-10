// Android kaynak XML'leri geçerli olmalı: yorumlarda "--" Gradle derlemesini kırar (iki kez yaşandı)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../../android/app/src/main");
const walk = d =>
  fs.existsSync(d)
    ? fs
        .readdirSync(d, { withFileTypes: true })
        .flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".xml") ? [path.join(d, e.name)] : []))
    : [];

test("Android XML yorumlarında '--' yok", () => {
  const bad = [];
  for (const f of walk(ROOT)) {
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/<!--([\s\S]*?)-->/g)) if (m[1].includes("--")) bad.push(path.relative(ROOT, f));
  }
  assert.deepEqual(bad, [], "geçersiz yorum: " + bad.join(", "));
});
