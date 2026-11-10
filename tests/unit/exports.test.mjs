// Modüller arası geç bağlama (src/late.js) adla çalışır: iki modül aynı adı dışa aktarırsa ilk yüklenen kazanır ve
// diğeri sessizce gölgede kalır (ör. Günün Maçı ve saha görünümünde ikisi de "scenario" idi). Bu test aynı adı
// birden çok modülde dışa aktarmayı yakalar. Dışa aktarım listesi gerçek sözdizimi ağacından çıkarılır
// (@babel/parser): `export const A = …, B = …`, `export { a, b as c }`, sınıflar; başka modülden yeniden dışa
// aktarım (`export { x } from "./y.js"`) aynı bağ olduğundan çakışma sayılmaz.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const SRC = path.resolve(import.meta.dirname, "../../src");
/** Bir modülün kendi tanımladığı dışa aktarım adları */
export function ownExports(code) {
  const ast = parse(code, { sourceType: "module", plugins: ["importAttributes"], errorRecovery: true });
  const out = [];
  const idNames = p => {
    if (!p) return [];
    if (p.type === "Identifier") return [p.name];
    if (p.type === "ObjectPattern") return p.properties.flatMap(x => idNames(x.type === "RestElement" ? x.argument : x.value));
    if (p.type === "ArrayPattern") return p.elements.flatMap(x => idNames(x && x.type === "RestElement" ? x.argument : x));
    if (p.type === "AssignmentPattern") return idNames(p.left);
    return [];
  };
  for (const n of ast.program.body) {
    if (n.type === "ExportNamedDeclaration") {
      if (n.source) continue; // yeniden dışa aktarım: aynı bağ
      const d = n.declaration;
      if (d && d.type === "VariableDeclaration") for (const v of d.declarations) out.push(...idNames(v.id));
      else if (d && d.id) out.push(d.id.name);
      for (const s of n.specifiers || []) out.push(s.exported.name || s.exported.value);
    } else if (n.type === "ExportDefaultDeclaration") out.push("default");
  }
  return out;
}

test("dışa aktarım ayrıştırıcısı çoklu bildirimleri ve export { } bloklarını görür", () => {
  const names = ownExports(
    'export const A = 1, B = 2;\nexport let [C, { D }] = [1, { D: 2 }];\nconst e = 1, f = 2;\nexport { e, f as F };\nexport function G() {}\nexport class H {}\nexport { Z } from "./z.js";'
  );
  assert.deepEqual(names.sort(), ["A", "B", "C", "D", "F", "G", "H", "e"].sort());
});
test("src/*.js ve src/loc/*.js modüllerinde aynı adla iki dışa aktarım yok", () => {
  const map = {};
  // late kaydındaki modüller: src/*.js ve mekân ekranları src/loc/*.js
  const files = [
    ...fs.readdirSync(SRC).filter(f => f.endsWith(".js")),
    ...fs.readdirSync(path.join(SRC, "loc")).filter(f => f.endsWith(".js")).map(f => `loc/${f}`)
  ];
  for (const f of files) {
    const s = fs.readFileSync(path.join(SRC, f), "utf8");
    for (const n of ownExports(s)) if (n !== "default") (map[n] = map[n] || []).push(f);
  }
  const dup = Object.entries(map)
    .filter(([, v]) => v.length > 1)
    .map(([k, v]) => `${k}: ${v.join(", ")}`);
  assert.deepEqual(dup, []);
});
