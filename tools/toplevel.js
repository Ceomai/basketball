// Üst düzeyde (fonksiyon gövdesi dışında) başka dosyanın adını kullanan ifadeleri bulur: modül döngülerinde TDZ riski
const fs = require("fs"),
  espree = require("espree"),
  scope = require("eslint-scope");
const U = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const f of U.ORDER) {
  const src = fs.readFileSync(f, "utf8"),
    ast = espree.parse(src, { ecmaVersion: 2022, sourceType: "script", range: true });
  const sm = scope.analyze(ast, { ecmaVersion: 2022, sourceType: "script" });
  const hits = new Map();
  for (const r of sm.globalScope.through) {
    const n = r.identifier.name;
    if (!U.defs[n] || U.defs[n] === f) continue;
    // referansın bulunduğu kapsam global mi (fonksiyon içinde değil mi)?
    let sc = r.from;
    let inFn = false;
    while (sc) {
      if (sc.type === "function") {
        inFn = true;
        break;
      }
      sc = sc.upper;
    }
    if (!inFn) {
      const k = n + "(" + U.defs[n] + ")";
      hits.set(k, (hits.get(k) || 0) + 1);
    }
  }
  if (hits.size) console.log(f + ":", [...hits.keys()].join(", "));
}
