// Koddaki her çeviri anahtarı Türkçe ve İngilizce sözlükte olmalı (ekranda "engine.19" gibi ham anahtar görünmesin).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import tr from "../../src/i18n/tr.js";
import trAuto from "../../src/i18n/tr.auto.js";
import en from "../../src/i18n/en.js";
import enAuto from "../../src/i18n/en.auto.js";

const SRC = path.resolve(import.meta.dirname, "../../src");
function sources(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? sources(path.join(dir, e.name)) : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []));
}
// $t("a.b") ve t("a.b"); biçimlendirici çağrıyı satırlara bölmüş olabilir: $t(\n  "a.b"
const used = new Set();
for (const f of sources(SRC))
  for (const m of fs.readFileSync(f, "utf8").matchAll(/(?:\$t|\bt)\(\s*"([A-Za-z]\w*\.[\w.]+)"/g)) used.add(m[1]);

test("kullanılan her anahtar Türkçe sözlükte var", () => {
  const dict = { ...tr, ...trAuto };
  const missing = [...used].filter(k => dict[k] == null);
  assert.deepEqual(missing, []);
});
test("kullanılan her anahtar İngilizce sözlükte var", () => {
  const dict = { ...en, ...enAuto };
  const missing = [...used].filter(k => dict[k] == null);
  assert.deepEqual(missing, []);
});
test("İngilizce çevirilerdeki yer tutucular Türkçeyle aynı", () => {
  const trD = { ...tr, ...trAuto },
    enD = { ...en, ...enAuto };
  const ph = s =>
    [...String(s).matchAll(/\{(\w+)\}/g)]
      .map(m => m[1])
      .sort()
      .join(",");
  const bad = Object.keys(trD).filter(k => typeof trD[k] === "string" && typeof enD[k] === "string" && ph(trD[k]) !== ph(enD[k]));
  assert.deepEqual(bad, []);
});
