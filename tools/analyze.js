// Dosyalar arası bağımlılık analizi: hangi dosya hangi adı tanımlıyor, kim kullanıyor, kim yazıyor
const fs = require("fs"),
  espree = require("espree"),
  scope = require("eslint-scope");
const ORDER = fs
  .readFileSync("index.html", "utf8")
  .match(/src="([a-z0-9]+\.js)"/g)
  .map(s => s.slice(5, -1));
const defs = {},
  files = {};
for (const f of ORDER) {
  const src = fs.readFileSync(f, "utf8");
  const ast = espree.parse(src, { ecmaVersion: 2022, sourceType: "script", range: true });
  files[f] = { src, ast };
  for (const n of ast.body) {
    if (n.type === "FunctionDeclaration") defs[n.id.name] = f;
    if (n.type === "VariableDeclaration") for (const d of n.declarations) defs[d.id.name] = f;
  }
}
const writes = [],
  usage = {};
for (const f of ORDER) {
  const { ast } = files[f];
  const sm = scope.analyze(ast, { ecmaVersion: 2022, sourceType: "script" });
  const g = sm.globalScope;
  const refs = [...g.through];
  // klasik betikte üst düzey tanımlar global kapsamda "çözülmüş" görünür; diğer dosyalardakiler through'da kalır
  const imp = new Set();
  for (const r of refs) {
    const n = r.identifier.name;
    if (defs[n] && defs[n] !== f) {
      imp.add(n);
      if (r.isWrite()) writes.push(`${f}: ${n} (tanım ${defs[n]}) @${r.identifier.range[0]}`);
    }
  }
  // aynı dosyadaki üst düzey değişkenlere yazma: sorun değil
  usage[f] = [...imp];
}
console.log("yazmalar:\n" + writes.join("\n"));
console.log("\nimport sayıları:", Object.fromEntries(Object.entries(usage).map(([k, v]) => [k, v.length])));
fs.writeFileSync(
  "/tmp/claude-0/-home-user-basketball/21387068-665a-53c0-a1c8-27f4fe3180f8/scratchpad/usage.json",
  JSON.stringify({ ORDER, defs, usage }, null, 1)
);
