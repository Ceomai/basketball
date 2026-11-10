// Görünür metinleri t() çağrılarına taşıyan dönüşüm aracı.
// - Düz metinler: "Kira" -> t("places.12")
// - HTML şablonları: yalnızca etiketler arasındaki metin parçaları taşınır; basit ifadeler yer tutucu olur:
//   `<b>Bu hafta · ${S.slot} kaldı</b>` -> `<b>${t("core.3", { slot: S.slot })}</b>`
// - Şehir adları, kişi/kulüp adları, anahtarlar, seçiciler, CSS ve makeTeam gibi özel adlar üreten kodlar dışlanır.
// - Aynı metin tek anahtar alır; sözlük src/i18n/tr.auto.js dosyasına yazılır.
// Kullanım: node tools/extract-i18n.js [--dry]
// Not: yeni metinlere sayısal anahtar (dosya.no) verir. Sonra tools/rename-i18n-keys.js ile <alan>.<kavram> adlarına
// çevirin; yeni metinler için tercih edilen yol keys/<ad>.json + elle anlamlı ad (docs/ANALIZ.md).
const fs = require("fs"),
  path = require("path"),
  recast = require("recast");
const babel = require("recast/parsers/babel");
const b = recast.types.builders;
const DRY = process.argv.includes("--dry");
const SRC = path.join(__dirname, "..", "src");
const FILES = fs.readdirSync(SRC).filter(f => f.endsWith(".js") && !["late.js", "main.js", "clubs.js"].includes(f));
const TURK = /[çğıöşüÇĞİÖŞÜâîû]/;
const EXCL_VARS = new Set([
  "IST_DIST",
  "MY_LISE",
  "MY_UNI",
  "NAME_FIRST",
  "NAME_LAST",
  "CITY_THEME",
  "STY",
  "COLORS",
  "SKINS",
  "HAIRC",
  "HATC",
  "ADS_CFG",
  "SFX",
  "THEMES",
  "PEN",
  "PACE"
]);
const EXCL_FUNCS = new Set(["makeTeam", "parseClubs", "rosterNames", "mateNames", "saltOf", "cOf", "cityTheme", "makeRival"]);
const EXCL_PROPS = new Set(["cities", "first", "last", "fem"]); // LEAGUES içindeki adlar (lig adları "t" dizisi ayrıca)
const EXCL_WORDS = new Set([
  "Space",
  "Enter",
  "LRUD",
  "AbortError",
  "MMS",
  "Escape",
  "POST",
  "PATCH",
  "Bearer",
  "REQUIRED",
  "Error",
  "pota-kariyeri@1.0.0"
]);
const EXCL_CALLS = new Set([
  "$",
  "$$",
  "sfx",
  "musicFor",
  "makeTeam",
  "cOf",
  "cityTheme",
  "icon",
  "portrait",
  "getItem",
  "setItem",
  "removeItem",
  "addEventListener",
  "removeEventListener",
  "querySelector",
  "querySelectorAll",
  "createElement",
  "add",
  "remove",
  "toggle",
  "contains",
  "on",
  "emit",
  "use",
  "run",
  "offer",
  "first",
  "teamByKey",
  "leaguePool",
  "openLoc",
  "toLocaleUpperCase",
  "toLocaleLowerCase",
  "toLocaleString",
  "toLocaleDateString",
  "RegExp",
  "setAttribute",
  "getContext",
  "drawScene",
  "hiCanvas",
  "drawKid",
  "LK",
  "chapter",
  "pill",
  "matchMedia",
  "postMessage",
  "register",
  "t",
  "$t",
  "open",
  "createObjectStore",
  "transaction",
  "objectStore",
  "put",
  "delete",
  "prepareRewardVideoAd",
  "require",
  "arcSubmit",
  "arcBoard",
  "arcResolve",
  "playAd",
  "showRewarded",
  "adStat"
]);
const FIRST_ARG_ONLY = new Set([
  "award",
  "arcadeRun",
  "runGame",
  "statName",
  "levelName",
  "leagueName",
  "roleAt",
  "tdOf",
  "adBtn"
]); // ilk argüman anahtar; diğerleri metin olabilir
// şehir adları (LEAGUES.cities ve clubs.js NEW_CITIES)
const CITIES = new Set(["İstanbul"]);
for (const m of fs.readFileSync(path.join(SRC, "data.js"), "utf8").matchAll(/cities:\s*\[([^\]]*)\]/g))
  for (const c of m[1].matchAll(/"([^"]+)"/g)) CITIES.add(c[1]);
for (const m of fs.readFileSync(path.join(SRC, "clubs.js"), "utf8").matchAll(/[A-Z]{2}:([^:;|]+):/g)) CITIES.add(m[1]);

// index.html'deki CSS sınıf adları: yalnızca bunlardan oluşan küçük harfli metinler sınıf listesidir
const CSS = new Set(
  [...fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").matchAll(/\.([a-z][a-z0-9-]*)/g)].map(m => m[1])
);
[
  "on",
  "off",
  "sm",
  "big",
  "pri",
  "team",
  "ghost",
  "bad",
  "good",
  "warn",
  "info",
  "muted",
  "small",
  "gold",
  "e",
  "m",
  "h",
  "i",
  "l",
  "g",
  "w"
].forEach(c => CSS.add(c));
const classList = s =>
  s
    .trim()
    .split(/\s+/)
    .every(w => CSS.has(w));
const dict = {},
  byText = {};
// Var olan sözlük tohum olarak yüklenir: aynı metin aynı anahtarı alır, çeviriler geçerli kalır; yeni metinler yeni numara alır.
const SEED = process.env.I18N_SEED;
if (SEED) {
  const seed = new Function(
    fs
      .readFileSync(SEED, "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace("export default", "return")
  )();
  for (const [k, v] of Object.entries(seed))
    if (!byText[v]) {
      byText[v] = k;
      dict[k] = v;
    }
}
const used = new Set();
let total = 0;
function keyFor(file, text) {
  if (byText[text]) {
    used.add(byText[text]);
    return byText[text];
  }
  const pre = file.replace(/\.js$/, "");
  let n = Object.keys(dict).filter(k => k.startsWith(pre + ".")).length + 1,
    k;
  do k = `${pre}.${n++}`;
  while (dict[k]);
  dict[k] = text;
  byText[text] = k;
  used.add(k);
  return k;
}
const cook = raw => new Function("return `" + raw + "`")();
function visiblePlain(s) {
  const x = s.trim();
  if (x.length < 2 || !/[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(x)) return false;
  if (CITIES.has(x) || EXCL_WORDS.has(x)) return false;
  if (/\|/.test(x) && !/\s/.test(x)) return false; // boşluksuz "a|b|c" veri anahtarı
  if (/^[A-Z]{2}$/.test(x) || /^[a-z]+[A-Z]\w*$/.test(x) || x[0] === "<") return false; // ülke/pozisyon kodu, camelCase anahtar, HTML parçası
  if (/\d+px|rgba?\(|^#|var\(--|^\.|=>|^data-|^data:|^https?:|^[a-z]+\/[a-z]|="|sans-serif|^[a-z-]+:\S/.test(x)) return false;
  if (/^[a-z0-9_:\-./#|*]+$/.test(x) && !TURK.test(x)) return false; // tek parça anahtarlar ve seçiciler
  if (/^[a-z0-9\s-]+$/.test(x) && classList(x)) return false; // CSS sınıf listesi
  if (/^[a-z]{2}-[A-Z]{2}$/.test(x)) return false; // yerel ayar kodu
  return true;
}
// basit ifadeler metnin içinde yer tutucu olabilir; karmaşık (HTML üreten) ifadeler metni böler
const SIMPLE_CALLS = new Set([
  "esc",
  "fmt",
  "kfmt",
  "per",
  "statName",
  "levelName",
  "lgName",
  "leagueName",
  "fullName",
  "seasonLabel",
  "phaseName",
  "rivalName",
  "round",
  "abs",
  "floor",
  "ceil",
  "String",
  "toFixed",
  "max",
  "min",
  "ovr",
  "fame"
]);
function simple(e) {
  switch (e.type) {
    case "Identifier":
    case "NumericLiteral":
      return true;
    case "MemberExpression":
    case "OptionalMemberExpression":
      return simple(e.object) && (!e.computed || simple(e.property) || e.property.type === "StringLiteral");
    case "BinaryExpression":
      return ["+", "-", "*", "/", "%"].includes(e.operator) && simple(e.left) && simple(e.right);
    case "UnaryExpression":
      return simple(e.argument);
    case "CallExpression":
    case "OptionalCallExpression": {
      const c = e.callee,
        name = c.type === "Identifier" ? c.name : c.property && c.property.name;
      return SIMPLE_CALLS.has(name) && e.arguments.every(a => simple(a) || a.type === "StringLiteral");
    }
    case "ConditionalExpression":
      return [e.consequent, e.alternate].every(x => simple(x) || x.type === "StringLiteral");
    case "LogicalExpression":
      return simple(e.left) && (simple(e.right) || e.right.type === "StringLiteral");
    default:
      return false;
  }
}
function phName(e, used) {
  let n =
    e.type === "Identifier"
      ? e.name
      : e.type === "MemberExpression" && !e.computed
        ? e.property.name
        : e.type === "CallExpression" && e.arguments[0]
          ? phName(e.arguments[0], new Set())
          : "v";
  if (!/^[A-Za-z_]\w*$/.test(n)) n = "v";
  let k = n,
    i = 2;
  while (used.has(k)) k = n + i++;
  used.add(k);
  return k;
}
function tCall(key, params) {
  const args = [b.stringLiteral(key)];
  if (params.length) args.push(b.objectExpression(params.map(([k, v]) => b.objectProperty(b.identifier(k), v))));
  return b.callExpression(b.identifier("$t"), args); // $t: yerel "t" değişkenleriyle çakışmasın
}
// Şablon parçalarını tara: etiket içi korunur, etiket dışı metin parçaları t() olur
function processTemplate(file, quasis, exprs, isHtml) {
  // öğe dizisi: {s: ham metin parçası} | {e: ifade}
  const items = [];
  quasis.forEach((q, i) => {
    items.push({ s: q.value.raw });
    if (i < exprs.length) items.push({ e: exprs[i] });
  });
  const outQ = [""],
    outE = [];
  let changed = false,
    inTag = false,
    quote = null;
  let run = []; // geçerli metin parçası: {s} ve {e} öğeleri
  const flushRun = () => {
    if (!run.length) return;
    // baş/son boşlukları dışarıda bırak
    const textOnly = run
      .filter(r => r.s != null)
      .map(r => r.s)
      .join("");
    const hasExpr = run.some(r => r.e);
    const visible = isHtml
      ? /[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(cook(textOnly.replace(/&[a-z]+;|&#\d+;/g, ""))) && !CITIES.has(textOnly.trim())
      : /[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(textOnly) &&
        !CITIES.has(textOnly.trim()) &&
        !/^[a-z]{2}-[A-Z]{2}$/.test(textOnly.trim()) &&
        !/[|=\[\]#]|px\b|sans-serif|^[a-z-]+:|;[a-z-]+:|^-|-$|\w-\w+-|\(/.test(textOnly) &&
        !classList(textOnly.replace(/[^a-z0-9\s-]/g, " ")) &&
        (/[A-Za-zÇĞİÖŞÜçğıöşü]{3}/.test(textOnly) || TURK.test(textOnly) || (hasExpr && /[a-z]{2}/.test(textOnly)));
    if (!visible) {
      for (const r of run) r.e ? (outE.push(r.e), outQ.push("")) : (outQ[outQ.length - 1] += r.s);
      run = [];
      return;
    }
    // boşlukları ayıkla
    let lead = "",
      trail = "";
    if (run[0].s != null) {
      const m = run[0].s.match(/^\s*/)[0];
      lead = m;
      run[0] = { s: run[0].s.slice(m.length) };
    }
    const L = run.length - 1;
    if (run[L].s != null) {
      const m = run[L].s.match(/\s*$/)[0];
      trail = m;
      run[L] = { s: run[L].s.slice(0, run[L].s.length - m.length) };
    }
    const used = new Set(),
      params = [];
    let text = "";
    for (const r of run) {
      if (r.s != null) text += cook(r.s).replace(/[{}]/g, c => (c === "{" ? "｛" : "｝"));
      else {
        const n = phName(r.e, used);
        params.push([n, r.e]);
        text += `{${n}}`;
      }
    }
    if (!hasExpr && !text.trim()) {
      outQ[outQ.length - 1] += lead + trail;
      run = [];
      return;
    }
    const key = keyFor(file, text);
    total++;
    changed = true;
    outQ[outQ.length - 1] += lead;
    outE.push(tCall(key, params));
    outQ.push(trail);
    run = [];
  };
  for (const it of items) {
    if (it.e) {
      if (inTag || !(simple(it.e) || it.e.type === "StringLiteral")) {
        flushRun();
        outE.push(it.e);
        outQ.push("");
      } else run.push({ e: it.e });
      continue;
    }
    let s = it.s,
      buf = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (!isHtml) {
        buf += ch;
        continue;
      }
      if (inTag) {
        if (quote) {
          if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === ">") inTag = false;
        outQ[outQ.length - 1] += ch;
      } else if (ch === "<" && /[a-zA-Z/!]/.test(s[i + 1] || "")) {
        if (buf) {
          run.push({ s: buf });
          buf = "";
        }
        flushRun();
        inTag = true;
        outQ[outQ.length - 1] += ch;
      } else buf += ch;
    }
    if (buf) run.push({ s: buf });
  }
  flushRun();
  return changed ? { quasis: outQ, exprs: outE } : null;
}
const calleeName = c =>
  c.type === "Identifier" ? c.name : c.type === "MemberExpression" && !c.computed ? c.property.name : null;
function excluded(p) {
  // üst düğümlerde dışlanan bağlam var mı? (ast-types yolunda dizi düzeyleri de vardır; value ile okunur)
  for (let q = p; q; q = q.parentPath) {
    const n = q.value;
    if (!n || Array.isArray(n) || typeof n !== "object") continue;
    if (n.type === "VariableDeclarator" && n.id && n.id.type === "Identifier" && EXCL_VARS.has(n.id.name)) return true;
    if (n.type === "FunctionDeclaration" && n.id && EXCL_FUNCS.has(n.id.name)) return true;
    if (n.type === "ObjectProperty" && !n.computed && n.key && EXCL_PROPS.has(n.key.name || n.key.value) && q !== p) return true;
    if (
      n.type === "ObjectProperty" &&
      !n.computed &&
      n.key &&
      (n.key.name || n.key.value) === "t" &&
      n.value.type === "ArrayExpression"
    )
      return true;
    if (n.type === "SwitchCase") return true;
    const arr = q.parentPath;
    if (arr && arr.name === "arguments" && arr.parentPath) {
      const call = arr.parentPath.value;
      if (call && (call.type === "CallExpression" || call.type === "OptionalCallExpression")) {
        const nm = calleeName(call.callee);
        if (EXCL_CALLS.has(nm)) return true;
        if (FIRST_ARG_ONLY.has(nm) && call.arguments[0] === n) return true;
      }
      if (call && call.type === "NewExpression" && call.callee.name === "RegExp") return true;
    }
    if (q.parentPath && q.parentPath.value && q.parentPath.value.type === "TaggedTemplateExpression") return true;
  }
  return false;
}
function isNameList(arrNode) {
  const el = arrNode.elements;
  return (
    el.length >= 3 &&
    el.every(
      x =>
        x &&
        x.type === "StringLiteral" &&
        /^[A-ZÇĞİÖŞÜ][a-zçğıöşüé'-]+( [A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?$/.test(x.value) &&
        x.value.length < 16
    )
  );
}
const report = {};
for (const f of FILES) {
  const file = path.join(SRC, f),
    src = fs.readFileSync(file, "utf8");
  const ast = recast.parse(src, { parser: babel });
  let n0 = total;
  recast.types.visit(ast, {
    visitImportDeclaration() {
      return false;
    },
    visitExportNamedDeclaration(p) {
      this.traverse(p);
    },
    visitMemberExpression(p) {
      if (p.node.computed && p.node.property.type === "StringLiteral") {
        this.traverse(p.get("object"));
        return false;
      }
      this.traverse(p);
    },
    visitArrayExpression(p) {
      if (isNameList(p.node)) return false;
      this.traverse(p);
    },
    visitBinaryExpression(p) {
      if (p.node.operator === "in") return false;
      this.traverse(p);
    },
    visitStringLiteral(p) {
      const par = p.parentPath && p.parentPath.value;
      if (par && (par.type === "ObjectProperty" || par.type === "ObjectMethod") && p.name === "key") return false; // nesne anahtarı
      if (excluded(p)) return false;
      const v = p.node.value;
      if (v.includes("<") && v.includes(">")) {
        const raw = v.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
        const r = processTemplate(f, [{ value: { raw } }], [], true);
        if (r)
          p.replace(
            b.templateLiteral(
              r.quasis.map((q, i) => b.templateElement({ raw: q, cooked: cook(q) }, i === r.quasis.length - 1)),
              r.exprs
            )
          );
        return false;
      }
      if (!visiblePlain(v)) return false;
      total++;
      p.replace(
        tCall(
          keyFor(
            f,
            v.replace(/[{}]/g, c => (c === "{" ? "｛" : "｝"))
          ),
          []
        )
      );
      return false;
    },
    visitTemplateLiteral(p) {
      if (excluded(p)) return false;
      this.traverse(p); // önce iç ifadeler
      const node = p.node,
        isHtml = node.quasis.some(q => /<[a-zA-Z/]/.test(q.value.raw));
      const r = processTemplate(f, node.quasis, node.expressions, isHtml);
      if (r) {
        const tl = b.templateLiteral(
          r.quasis.map((q, i) => b.templateElement({ raw: q, cooked: cook(q) }, i === r.quasis.length - 1)),
          r.exprs
        );
        // tek bir t() çağrısından ibaret şablonu sadeleştir
        if (r.exprs.length === 1 && r.quasis.every(q => q === "")) p.replace(r.exprs[0]);
        else p.replace(tl);
      }
      return false;
    }
  });
  // yerel ayar kodu: dile göre
  let out = recast
    .print(ast)
    .code.replace(/\.(toLocaleUpperCase|toLocaleLowerCase|toLocaleDateString)\("tr-TR"\)/g, ".$1(LOCALE)");
  const added = total - n0;
  report[f] = added;
  if (added || out.includes("(LOCALE)")) {
    const need = [];
    if (added) need.push("t as $t");
    if (out.includes("(LOCALE)")) need.push("LOCALE");
    // var olan i18n importlarıyla birleştir (araç tekrar çalıştırıldığında çift import olmasın)
    const re = /^import \{([^}]*)\} from "\.\/i18n\/index\.js";\n/gm;
    const have = [...out.matchAll(re)].flatMap(m =>
      m[1]
        .split(",")
        .map(x => x.trim())
        .filter(Boolean)
    );
    const names = [...new Set([...have, ...need])];
    out = `import { ${names.join(", ")} } from "./i18n/index.js";\n` + out.replace(re, "");
  }
  if (!DRY) fs.writeFileSync(file, out);
}
// koda zaten taşınmış anahtarlar ($t("...")) da kullanılıyor sayılır; araç tekrar çalıştırıldığında silinmez
for (const f of FILES) for (const m of fs.readFileSync(path.join(SRC, f), "utf8").matchAll(/\$t\(\s*"([\w.]+)"/g)) used.add(m[1]);
for (const k of Object.keys(dict)) if (!used.has(k)) delete dict[k];
const sorted = Object.fromEntries(Object.entries(dict).sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true })));
const body =
  "// Otomatik çıkarılan Türkçe arayüz metinleri (tools/extract-i18n.js). Elle düzenlenebilir; anahtarları değiştirme.\n// {ad}: yer tutucu. ｛ ｝: metindeki gerçek süslü parantez.\nexport default " +
  JSON.stringify(sorted, null, 1) +
  ";\n";
if (!DRY) fs.writeFileSync(path.join(SRC, "i18n", "tr.auto.js"), body);
console.log("taşınan metin:", total, "benzersiz:", Object.keys(dict).length);
console.log(report);
