// Her $t("anahtar", {...}) çağrısı, metindeki bütün {yer tutucu}ları vermeli (ekranda "{sur} geç zıpladı" kalmasın).
// Yalnızca sabit anahtar + nesne sabitiyle yapılan çağrılar denetlenir; yayılma (...) ya da değişkenle verilen parametreler atlanır.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import tr from "../../src/i18n/tr.js";
import trAuto from "../../src/i18n/tr.auto.js";

const SRC = path.resolve(import.meta.dirname, "../../src");
const DICT = { ...trAuto, ...tr };
function sources(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? sources(path.join(dir, e.name)) : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []));
}
function walk(node, fn) {
  if (!node || typeof node.type !== "string") return;
  fn(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end") continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === "string" && walk(c, fn));
    else if (v && typeof v.type === "string") walk(v, fn);
  }
}
test("yayın b: çeviri çağrıları metindeki her yer tutucuyu doldurur", () => {
  const bad = [];
  for (const f of sources(SRC)) {
    if (f.includes(`${path.sep}i18n${path.sep}`)) continue;
    const ast = parse(fs.readFileSync(f, "utf8"), { sourceType: "module", errorRecovery: true });
    walk(ast.program, n => {
      if (n.type !== "CallExpression" || n.callee.type !== "Identifier" || !["$t", "t"].includes(n.callee.name)) return;
      const [k, o] = n.arguments;
      if (!k) return;
      // yalnızca sabit anahtar: şablon anahtarlar (`pp.${k}`) çok sayıda ilgisiz anahtara uyar
      let keys = k.type === "StringLiteral" ? [k.value] : [];
      keys = keys.filter(x => typeof DICT[x] === "string");
      const need = [...new Set(keys.flatMap(x => [...DICT[x].matchAll(/\{(\w+)\}/g)].map(m => m[1])))];
      if (!need.length) return;
      let have;
      if (!o) have = [];
      else if (o.type === "ObjectExpression") {
        if (o.properties.some(p => p.type === "SpreadElement")) return;
        have = o.properties.map(p => (p.key && (p.key.name || p.key.value)) || "");
      } else return;
      const miss = need.filter(x => !have.includes(x));
      if (miss.length) bad.push(`${path.basename(f)}:${n.loc.start.line} ${k.value || keys[0]} {${miss.join(",")}}`);
    });
  }
  assert.deepEqual(bad, []);
});
