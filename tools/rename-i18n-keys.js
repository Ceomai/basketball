// Sayısal i18n anahtarlarını (eski tools/extract-i18n.js çıktısı: "match.65", "places.200" …) anlamlı adlara çevirir:
// <alan>.<kavram> — küçük harf camelCase, ASCII. Metinler DEĞİŞMEZ: yalnızca anahtar adları yeniden yazılır.
//   alan   : anahtarın kullanıldığı dosya / fonksiyon (ya da modül düzeyi değişken) adından (AREA_BY_FILE, AREA_BY_FUNC);
//            birden çok alanda kullanılan anahtar "common" alır.
//   kavram : metnin ilk 2-3 anlamlı kelimesi (İngilizce çeviri; yoksa Türkçe metin ASCII'ye çevrilerek), camelCase.
//            Çakışmada sayı soneki (…2, …3). OVERRIDES elle ince ayar tablosudur.
// Yeniden yazılan yerler: src/i18n/{tr,en}.auto.js sözlükleri ve src/, tests/, tools/ altındaki tüm .js/.mjs
// dosyalarındaki dizge değişmezleri ("x", 'x', `x`): $t("x"), t("x"), anahtar dizileri/tabloları. Yorumlara dokunulmaz.
// Şablon literal önekli dinamik aileler (`match.${n}`) ve "match." + n kalıbı yeniden adlandırılmaz, raporlanır.
// Elle yazılmış sözlükler (src/i18n/tr.js, en.js) değişmez; yeni adlar onlardaki anahtarlarla çakışmaz.
// Kullanım:
//   node tools/rename-i18n-keys.js --dry-run            eşlemeyi hesapla, özet + 30 örnek yaz, dosyalara dokunma
//   node tools/rename-i18n-keys.js --list               --dry-run + tüm eşlemeler (gözden geçirme için)
//   node tools/rename-i18n-keys.js --only=match,engine  yalnız bu modüllerin anahtarlarını uygula (kademeli)
//   node tools/rename-i18n-keys.js                      kalan tüm sayısal anahtarları uygula
// Tam eşleme reports/i18n-rename-map.json'a yazılır; dosya varsa içindeki adlar korunur (kademeli uygulamada adlar sabit).
const fs = require("fs"),
  path = require("path");
const { parse } = require("@babel/parser");

const ROOT = path.join(__dirname, "..");
const MAP_FILE = path.join(ROOT, "reports", "i18n-rename-map.json");
const DICT_FILES = ["src/i18n/tr.auto.js", "src/i18n/en.auto.js"];
const MANUAL_FILES = ["src/i18n/tr.js", "src/i18n/en.js"];
const NUM = /^([a-z]+)\.(\d+)$/;
const DRY = process.argv.includes("--dry-run") || process.argv.includes("--list");
const LIST = process.argv.includes("--list");
const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);

// ---- alan adları ----
// dosya (src/ altında, uzantısız) → varsayılan alan
const AREA_BY_FILE = {
  academy: "academy",
  adplaces: "ads",
  ads: "ads",
  agent: "agent",
  ambition: "ambition",
  arcade: "arcade",
  art: "art",
  casino: "casino",
  cloud: "cloud",
  coach: "coach",
  comps: "comps",
  core: "main",
  culture: "culture",
  daily: "daily",
  data: "data",
  derby: "derby",
  engine: "live",
  extras: "extras",
  fitness: "fitness",
  games: "minigame",
  harbor: "harbor",
  legacy: "legacy",
  map: "map",
  match: "match",
  missions: "missions",
  moments: "moment",
  natcup: "national",
  native: "store",
  notify: "notify",
  peaks: "peaks",
  places: "place",
  plan: "plan",
  polish: "trophy",
  release: "release",
  save: "save",
  seasonlife: "season",
  shops: "shop",
  story: "story",
  street: "street",
  studio: "studio",
  style: "style",
  systems: "career",
  tales: "tales",
  venues: "venue",
  "loc/aile": "family",
  "loc/ev": "home",
  "loc/kafe": "cafe",
  "loc/medya": "media",
  "loc/okul": "school",
  "loc/stad": "stadium"
};
// "dosya:fonksiyon" (fonksiyonun ya da modül düzeyi değişkenin adı; iç içe nesne yöntemlerinde ilk ad) → alan
const AREA_BY_FUNC = {
  "match:resolvePlay": "play",
  "match:andOne": "play",
  "match:finishMatch": "result",
  "match:afterMatchFlow": "result",
  "match:retireScreen": "retire",
  "match:seasonEnd": "season",
  "match:offerHTML": "offer",
  "match:acceptOffer": "offer",
  "match:transitionInner": "transition",
  "match:endWeek": "week",
  "engine:quarterBreak": "quarter",
  "engine:moment": "moment",
  "engine:modeChoice": "mode",
  "engine:simPossession": "play",
  "story:pressQA": "press",
  "story:pressApply": "press",
  "story:pressBody": "press",
  "story:pressConference": "press",
  "story:pressFollowUp": "press",
  "story:pressInlineHTML": "press",
  "story:rivalCard": "rival",
  "story:rivalInfo": "rival",
  "story:roleReview": "role",
  "story:comeback": "comeback",
  "story:derbyResult": "derby",
  "story:derbyNote": "derby",
  "story:storyOffers": "offer",
  "story:autoResolve": "auto",
  "story:autoWeekPlan": "auto",
  "story:quickWeek": "week",
  "systems:view": "contract",
  "systems:negotiateOffer": "contract",
  "systems:statsTab": "stats",
  "systems:recordGame": "stats",
  "systems:rosterTab": "roster",
  "systems:installSheet": "install",
  "systems:allStar": "allStar",
  "systems:simWithoutMe": "sim",
  "systems:physioAct": "injury",
  "systems:rollInjury": "injury",
  "systems:healTick": "injury",
  "systems:guideSheet": "guide",
  "systems:seasonAwards": "awards",
  "systems:startTour": "tour",
  "core:renderCreate": "create",
  "core:startCareer": "create",
  "core:draw": "create",
  "core:chapter": "chapter",
  "core:hudHTML": "hud",
  "core:mapColHTML": "map",
  "core:phaseName": "phase",
  "extras:camp": "camp",
  "extras:boardSheet": "board",
  "extras:natMatch": "national",
  "extras:natTeam": "national",
  "extras:fibaWindow": "national",
  "extras:summerTournament": "tournament",
  "extras:arcResolve": "arcadeBoard",
  "extras:arcBoardCard": "arcadeBoard",
  "extras:ARC_GAMES": "arcadeBoard",
  "extras:weeklyHooks": "hooks",
  "shops:locEglence": "fun",
  "shops:locMarket": "market",
  "shops:locAvm": "mall",
  "shops:arcadeRun": "arcade",
  "legacy:hofCard": "hof",
  "loc/medya:photoSession": "photo",
  "loc/medya:interview": "interview",
  "loc/medya:ask": "interview",
  "loc/stad:runTryout": "tryout",
  "loc/stad:runDrill": "drill",
  "loc/okul:makeQuestion": "quiz",
  "save:backupNudge": "backup",
  "save:exportSheet": "backup",
  "save:downloadSave": "backup",
  "save:importCode": "backup",
  "cloud:askNewer": "cloud",
  "ads:askConsent": "consent",
  "ads:adsSettingsHTML": "adsSettings",
  "ads:buyAdFree": "adFree",
  // modül düzeyi tablolar
  "story:ARCS": "arc",
  "story:ARC_ONCE": "arc",
  "data:PLAYS": "plays",
  "data:DRILLS": "drill",
  "data:COMMON_DRILLS": "drill",
  "data:PAT": "club",
  "data:LEAGUES": "league",
  "data:RELS": "relation",
  "data:IST_TYPE": "school",
  "data:POS": "position",
  "data:STATS": "stat",
  "loc/okul:TRIVIA": "quiz",
  "shops:SHOP": "shop",
  "shops:MARKET": "market",
  "shops:STORES": "store",
  "shops:ARCADE": "arcade",
  "systems:GUIDE": "guide",
  "systems:TOUR": "tour",
  "systems:INJ": "injury",
  "coach:PROGRAMS": "program",
  "coach:SYSTEMS": "system",
  "legacy:FOUNDATION": "foundation",
  "legacy:EPILOGUES": "epilogue",
  "legacy:HOF": "hof",
  "extras:NAT": "national",
  "ads:AD_PROMOS": "tip",
  "style:HAT_N": "style",
  "engine:TR_CALLS": "live",
  "core:ROLE_N": "role"
};
// alan seçiminde sayılmayan kullanımlar: anahtarı yalnızca başka bir tabloya bağlayan katmanlar
const IGNORE_CTX = new Set(["culture:CU_OV"]);
// elle ince ayar: eski anahtar → yeni ad (gerekirse)
const OVERRIDES = {
  "ads.20": "ads.seconds",
  "ads.48": "ads.secondsLeft",
  "arcade.34": "common.seconds",
  "engine.21": "live.subbedInQuarter",
  "engine.53": "live.quarterClock",
  "casino.11": "casino.comeBackEnd",
  "casino.32": "casino.youLabel",
  "story.30": "rival.you",
  "core.8": "main.do",
  "systems.129": "install.or",
  "shops.13": "fun.adultsOnly",
  "match.98": "play.andOne",
  "data.21": "club.okk",
  "core.65": "hud.ageRoleTeam",
  "save.19": "save.slotAgeName"
};

// ---- yardımcılar ----
function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name === "node_modules") return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walkFiles(p) : /\.m?js$/.test(e.name) ? [p] : [];
  });
}
const rel = f => path.relative(ROOT, f).split(path.sep).join("/");
function parseFile(src) {
  return parse(src, {
    sourceType: "unambiguous",
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    errorRecovery: false,
    plugins: []
  });
}
/** AST'yi gez; her düğümde cb(düğüm, bağlam adı) — bağlam: en yakın fonksiyon / modül düzeyi değişken adı */
function visit(node, ctx, cb) {
  if (!node || typeof node.type !== "string") return;
  let name = ctx;
  const t = node.type;
  if (/Function/.test(t) && node.id && node.id.name) name = node.id.name;
  else if (t === "VariableDeclarator" && node.id && node.id.name && (ctx === null || (node.init && /Function|Arrow/.test(node.init.type))))
    name = node.id.name;
  else if (
    (t === "ObjectMethod" || (t === "ObjectProperty" && node.value && /Function|Arrow/.test(node.value.type))) &&
    node.key &&
    (node.key.name || node.key.value)
  )
    name = ctx || node.key.name || node.key.value;
  cb(node, name);
  for (const k in node) {
    if (k === "loc" || k === "start" || k === "end" || k === "leadingComments" || k === "trailingComments") continue;
    const v = node[k];
    if (Array.isArray(v)) for (const x of v) visit(x, name, cb);
    else if (v && typeof v === "object") visit(v, name, cb);
  }
}
/** Dizge değişmezi olan anahtar düğümleri: "x", 'x', ifadesiz `x` → { value, start, end, ctx } */
function literalNodes(ast, onDynamic) {
  const out = [];
  visit(ast.program, null, (n, ctx) => {
    if (n.type === "StringLiteral") out.push({ value: n.value, start: n.start, end: n.end, ctx, q: null });
    else if (n.type === "TemplateLiteral") {
      if (!n.expressions.length) out.push({ value: n.quasis[0].value.cooked, start: n.start, end: n.end, ctx, q: "`" });
      else
        n.quasis.forEach((q, i) => {
          const m = i < n.expressions.length && /(?:^|[^\w.])([a-z]+)\.$/.exec(q.value.cooked);
          if (m) onDynamic(m[1], ctx);
        });
    } else if (n.type === "BinaryExpression" && n.operator === "+" && n.left.type === "StringLiteral") {
      const m = /^([a-z]+)\.$/.exec(n.left.value);
      if (m) onDynamic(m[1], ctx);
    }
  });
  return out;
}

// ---- kavram adı (metinden) ----
const STOP = new Set(
  "a an the your you youre youll youve yours to of and or is are was were be been being in on at for with it its this that these those by from as but so if i im my me we our us he she his her they their them will would can could has have had do does did just all any some then than there here into out up about over very".split(
    " "
  )
);
const TR_STOP = new Set("ve ile bir bu şu o da de mi mı için ama gibi çok daha en".split(" "));
function ascii(s) {
  return s
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ß/g, "ss")
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[łŁ]/g, "l")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
function words(text, stop) {
  let s = String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\{@?\w+\}/g, " ")
    .replace(/[’']/g, "")
    .replace(/(^|\s)\+(\d)/g, "$1plus$2")
    .replace(/(^|\s)[−-](\d)/g, "$1minus$2")
    .replace(/×(\d)/g, "x$1")
    .replace(/(\d)%/g, "$1pct");
  s = ascii(s).toLowerCase();
  return s
    .split(/[^a-z0-9]+/)
    .filter(w => w && !stop.has(w));
}
function concept(en, tr) {
  let ws = words(en, STOP);
  if (!ws.length) ws = words(en, new Set()); // yalnız dolgu kelimelerinden oluşan kısa metin ("You ·", "or")
  if (!ws.length) ws = words(tr, TR_STOP);
  if (!ws.length) ws = words(tr, new Set());
  // sayı ile başlayan kelimeler sona: "+5 Morale" → moralePlus5
  const num = ws.filter(w => /^(plus|minus)?\d/.test(w)),
    rest = ws.filter(w => !/^(plus|minus)?\d/.test(w));
  const pick = [];
  for (const w of rest) {
    if (pick.length >= 3) break;
    const len = pick.join("").length + w.length;
    if (pick.length >= 1 && len > 22) break;
    pick.push(w);
  }
  if (num.length && pick.join("").length + num[0].length <= 26) pick.push(num[0]);
  if (!pick.length) return "text";
  let c = pick.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("");
  if (/^\d/.test(c)) c = "n" + c;
  return c;
}

(async () => {
  const imp = async f => (await import(path.join(ROOT, f))).default;
  const [trAuto, enAuto] = await Promise.all(DICT_FILES.map(imp));
  const manual = new Set((await Promise.all(MANUAL_FILES.map(imp))).flatMap(d => Object.keys(d)));
  const numKeys = Object.keys(trAuto).filter(k => NUM.test(k));
  const modules = new Set(numKeys.map(k => k.split(".")[0]));

  // ---- kod taraması ----
  const self = path.resolve(__filename);
  const codeFiles = [
    ...walkFiles(path.join(ROOT, "src")),
    ...walkFiles(path.join(ROOT, "tests")),
    ...walkFiles(path.join(ROOT, "tools"))
  ].filter(f => path.resolve(f) !== self);
  const uses = {}; // anahtar → Set("dosya:bağlam")
  const dynamic = {}; // modül → [konum]
  const parsed = new Map();
  for (const f of codeFiles) {
    const src = fs.readFileSync(f, "utf8");
    let ast;
    try {
      ast = parseFile(src);
    } catch (e) {
      // ayrıştırılamayan dosyada anahtar varsa güvenle yeniden adlandıramayız
      if (/["'`][a-z]+\.\d+["'`]/.test(src)) throw new Error(`${rel(f)} ayrıştırılamadı: ${e.message}`);
      continue;
    }
    const r = rel(f);
    const lits = literalNodes(ast, (mod, ctx) => {
      if (modules.has(mod)) (dynamic[mod] = dynamic[mod] || []).push(`${r}:${ctx || "-"}`);
    });
    parsed.set(f, { src, lits });
    if (!r.startsWith("src/") || DICT_FILES.includes(r)) continue;
    const file = r.slice(4).replace(/\.js$/, "");
    for (const l of lits) if (NUM.test(l.value)) (uses[l.value] = uses[l.value] || new Set()).add(`${file}:${l.ctx || "-"}`);
  }
  const skipped = numKeys.filter(k => dynamic[k.split(".")[0]]);

  // ---- ad üretimi ----
  const prev = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8")).map || {} : {};
  const taken = new Set([...manual, ...Object.keys(trAuto), ...Object.keys(enAuto)]);
  for (const v of Object.values(prev)) taken.add(v);
  const areaOf = k => {
    const u = uses[k] && new Set([...uses[k]].filter(x => !IGNORE_CTX.has(x)));
    if (!u || !u.size) return AREA_BY_FILE[k.split(".")[0]] || k.split(".")[0];
    const areas = new Set(
      [...u].map(x => {
        const [file, ctx] = x.split(":");
        return AREA_BY_FUNC[`${file}:${ctx}`] || AREA_BY_FILE[file] || file.replace(/\W/g, "");
      })
    );
    if (areas.size === 1) return [...areas][0];
    const files = new Set([...u].map(x => AREA_BY_FILE[x.split(":")[0]]));
    return files.size === 1 ? [...files][0] : "common";
  };
  const map = {};
  for (const k of numKeys) {
    if (skipped.includes(k)) continue;
    // eşleme dosyasındaki ad yeniden kullanılır; ad sözlükte başka bir anahtar olarak zaten varsa (extract-i18n.js
    // yeniden çalıştırılıp aynı sayısal adı yeni bir metne verdiyse) yeni ad üretilir
    if (prev[k] && !(prev[k] in trAuto)) {
      map[k] = prev[k];
      continue;
    }
    let name = OVERRIDES[k] || `${areaOf(k)}.${concept(enAuto[k], trAuto[k])}`;
    if (taken.has(name)) {
      let i = 2;
      while (taken.has(name + i)) i++;
      name += i;
    }
    taken.add(name);
    map[k] = name;
  }
  // denetim: biçim ve benzersizlik
  const bad = Object.values(map).filter(v => !/^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/.test(v));
  if (bad.length) throw new Error("Geçersiz ad: " + bad.slice(0, 10).join(", "));
  const vals = Object.values(map);
  if (new Set(vals).size !== vals.length) throw new Error("Yinelenen yeni ad");
  for (const v of vals) if (manual.has(v)) throw new Error("Elle yazılmış anahtarla çakışma: " + v);

  // ---- uygulanacak küme ----
  const apply = Object.fromEntries(
    Object.entries(map).filter(([k]) => !ONLY.length || ONLY.includes(k.split(".")[0]))
  );
  const reverse = Object.fromEntries(Object.entries(apply).map(([a, b]) => [b, a]));
  const rewrite = (src, lits, m) => {
    let out = "",
      pos = 0,
      n = 0;
    for (const l of [...lits].sort((a, b) => a.start - b.start)) {
      if (!Object.prototype.hasOwnProperty.call(m, l.value)) continue;
      const to = m[l.value];
      const q = l.q || src[l.start];
      out += src.slice(pos, l.start) + q + to + q;
      pos = l.end;
      n++;
    }
    return { text: out + src.slice(pos), n };
  };
  const changes = [];
  for (const [f, { src, lits }] of parsed) {
    const { text, n } = rewrite(src, lits, apply);
    if (!n) continue;
    // geri dönüş denetimi: yeni metinde yeni adlar eski adlara çevrilince kaynak birebir aynı olmalı
    const back = rewrite(text, literalNodes(parseFile(text), () => {}), reverse).text;
    if (back !== src) throw new Error(`${rel(f)}: geri dönüş denetimi başarısız`);
    changes.push({ f, text, n });
  }
  const area = {};
  for (const v of Object.values(apply)) area[v.split(".")[0]] = (area[v.split(".")[0]] || 0) + 1;
  console.log(
    `${numKeys.length} sayısal anahtar · ${Object.keys(map).length} eşlendi · ${skipped.length} atlandı (dinamik aile) · uygulanacak ${Object.keys(apply).length}` +
      ` · ${changes.length} dosya, ${changes.reduce((a, c) => a + c.n, 0)} değişmez`
  );
  if (Object.keys(dynamic).length)
    for (const [m, at] of Object.entries(dynamic)) console.log(`  dinamik aile ${m}.\${…}: ${[...new Set(at)].join(", ")}`);
  console.log("  alanlar: " + Object.entries(area).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(", "));
  const unused = numKeys.filter(k => !uses[k]);
  if (unused.length) console.log(`  kodda kullanılmayan ${unused.length}: ${unused.join(", ")}`);
  const long = Object.values(apply).filter(v => v.length > 34);
  if (long.length) console.log(`  uzun adlar (>34): ${long.join(", ")}`);
  const ents = Object.entries(apply);
  if (LIST) for (const [k, v] of ents) console.log(`${k}\t${v}\t${String(trAuto[k]).slice(0, 60).replace(/\n/g, " ")}\t${String(enAuto[k]).slice(0, 60).replace(/\n/g, " ")}`);
  const step = Math.max(1, Math.floor(ents.length / 30));
  for (let i = 0; i < ents.length && i / step < 30; i += step) {
    const [k, v] = ents[i];
    console.log(`  ${k.padEnd(13)} → ${v.padEnd(34)} «${String(trAuto[k]).slice(0, 50).replace(/\n/g, " ")}»`);
  }
  if (DRY) return;
  for (const c of changes) fs.writeFileSync(c.f, c.text);
  fs.mkdirSync(path.dirname(MAP_FILE), { recursive: true });
  // tam eşleme (henüz uygulanmamış modüller dahil) yazılır: kademeli uygulamada sonraki adımlar aynı adları kullanır
  const full = { ...prev, ...map };
  fs.writeFileSync(
    MAP_FILE,
    JSON.stringify(
      {
        about: "Sayısal i18n anahtarlarının yeni adları (tools/rename-i18n-keys.js). Metinler değişmedi.",
        skipped,
        map: full
      },
      null,
      1
    ) + "\n"
  );
  console.log(`yazıldı: ${changes.length} dosya, ${rel(MAP_FILE)}`);
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
