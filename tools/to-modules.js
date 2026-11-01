// Tek seferlik dönüşüm: klasik <script> dosyalarını ES modüllerine çevirir.
// - Her üst düzey tanım dışa aktarılır (export).
// - Daha önce yüklenen dosyalardaki adlar statik olarak içe aktarılır (import).
// - Daha sonra yüklenen dosyalardaki adlar "late" kaydı üzerinden çağrılır (late.ad). Böylece modüllerin
//   değerlendirilme sırası eski <script> sırasıyla birebir aynı kalır ve döngüsel bağımlılık TDZ hatası üretmez.
// - Başka dosyadaki bir değişkene atama, tanımlayan modülde üretilen ayarlayıcıya çevrilir (S=x -> setS(x)).
// Kullanım: node tools/to-modules.js <kaynak klasörü> <sıra: virgülle dosya adları>
const fs = require("fs"), path = require("path"), espree = require("espree"), scope = require("eslint-scope"), estraverse = require("estraverse");
const DIR = process.argv[2], ORDER = process.argv[3].split(",");
const P = { ecmaVersion: 2022, sourceType: "script", range: true };
const src = {}, ast = {}, defs = {};
for (const f of ORDER) {
  src[f] = fs.readFileSync(path.join(DIR, f), "utf8"); ast[f] = espree.parse(src[f], P);
  for (const n of ast[f].body) {
    if (n.type === "FunctionDeclaration") defs[n.id.name] = f;
    if (n.type === "VariableDeclaration") for (const d of n.declarations) defs[d.id.name] = f;
  }
}
const idx = f => ORDER.indexOf(f);
const setterName = n => "set" + n[0].toUpperCase() + n.slice(1);
const needSetter = {}; // tanımlayan dosya -> Set(ad)
const out = {};
for (const f of ORDER) {
  const sm = scope.analyze(ast[f], { ecmaVersion: 2022, sourceType: "script" });
  const edits = [], imports = {}; let usesLate = false;
  const parents = new Map();
  estraverse.traverse(ast[f], { enter(node, parent) { parents.set(node, parent); }, fallback: "iteration" });
  for (const r of sm.globalScope.through) {
    const id = r.identifier, n = id.name, d = defs[n];
    if (!d || d === f) continue;
    const back = idx(d) > idx(f), parent = parents.get(id);
    if (r.isWrite()) {
      // yalnızca "ad = ifade" biçimi destekleniyor
      if (!parent || parent.type !== "AssignmentExpression" || parent.operator !== "=" || parent.left !== id) throw new Error(`${f}: desteklenmeyen yazma: ${n} @${id.range[0]}`);
      (needSetter[d] = needSetter[d] || new Set()).add(n);
      const fn = setterName(n);
      if (back) { usesLate = true; edits.push({ s: parent.range[0], e: parent.right.range[0], t: `late.${fn}(` }); }
      else { (imports[d] = imports[d] || new Set()).add(fn); edits.push({ s: parent.range[0], e: parent.right.range[0], t: `${fn}(` }); }
      edits.push({ s: parent.range[1], e: parent.range[1], t: ")" });
      continue;
    }
    if (back) {
      usesLate = true;
      if (parent && parent.type === "Property" && parent.shorthand && parent.value === id) edits.push({ s: id.range[0], e: id.range[1], t: `${n}:late.${n}` });
      else edits.push({ s: id.range[0], e: id.range[1], t: `late.${n}` });
    } else (imports[d] = imports[d] || new Set()).add(n);
  }
  // export ve "use strict" kaldırma
  for (const n of ast[f].body) {
    if (n.type === "FunctionDeclaration" || n.type === "VariableDeclaration") edits.push({ s: n.range[0], e: n.range[0], t: "export " });
    if (n.type === "ExpressionStatement" && n.directive === "use strict") edits.push({ s: n.range[0], e: n.range[1], t: "" });
  }
  out[f] = { edits, imports, usesLate };
}
for (const f of ORDER) {
  const { edits, imports, usesLate } = out[f];
  edits.sort((a, b) => b.s - a.s || b.e - a.e);
  let s = src[f];
  for (const ed of edits) s = s.slice(0, ed.s) + ed.t + s.slice(ed.e);
  if (needSetter[f]) s += "\n// Diğer modüllerin bu değişkenleri değiştirebilmesi için ayarlayıcılar\n" + [...needSetter[f]].map(n => `export function ${setterName(n)}(v){return ${n}=v}`).join("\n") + "\n";
  const head = Object.entries(imports).sort((a, b) => idx(a[0]) - idx(b[0])).map(([d, set]) => `import { ${[...set].sort().join(", ")} } from "./${d}";`);
  if (usesLate) head.unshift(`import { late } from "./late.js";`);
  fs.writeFileSync(path.join(DIR, f), head.join("\n") + (head.length ? "\n" : "") + s.replace(/^\s*\n/, ""));
}
console.log("Dönüştürüldü:", ORDER.length, "dosya; ayarlayıcılar:", Object.entries(needSetter).map(([f, s]) => f + ":" + [...s]).join(" "));
