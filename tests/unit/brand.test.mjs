// Mağaza güvenli adlar (src/brand.js): görünen hiçbir metinde gerçek kulüp, lig, turnuva ya da marka adı kalmamalı.
// Play/App Store fikri mülkiyet reddine karşı yayın öncesi kapı. Anahtarlar ve simülasyon değişmez.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BRAND_CLUBS,
  BRAND_FICTIONAL,
  BRAND_FORBIDDEN,
  BRAND_TERMS,
  BRAND_TEXT_CLUBS,
  brandClub,
  brandClubShort,
  brandDeep,
  brandIsEuro,
  brandIsNba,
  brandRealOf,
  brandSave,
  brandSetLang,
  brandText,
  brandTiers
} from "../../src/brand.js";
import tr from "../../src/i18n/tr.js";
import trAuto from "../../src/i18n/tr.auto.js";
import en from "../../src/i18n/en.js";
import enAuto from "../../src/i18n/en.auto.js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const L = "A-Za-zÀ-ÖØ-öø-ɏḀ-ỿÇĞİÖŞÜçğıöşü0-9";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FORB = new RegExp(`(?<![${L}])(${BRAND_FORBIDDEN.map(esc).join("|")})(?![${L}])`);
/** metinde kalan gerçek adlar */
function leftovers(obj, where) {
  const out = [];
  const walk = (o, p) => {
    if (typeof o === "string") {
      const m = FORB.exec(o);
      if (m) out.push(`${where}${p}: "${m[1]}" → ${o.slice(0, 90)}`);
    } else if (o && typeof o === "object") for (const k of Object.keys(o)) walk(o[k], `${p}.${k}`);
  };
  walk(obj, "");
  return out;
}
// clubs.js içindeki gerçek kulüp listeleri (kaynak metinden; modül tarayıcı bağımlı)
const CLUB_SRC = read("src/clubs.js");
const lists = {};
for (const m of CLUB_SRC.matchAll(/(t1|t2): `([^`]*)`/g)) (lists[m[1]] = lists[m[1]] || []).push(m[2]);
const raw = name => (CLUB_SRC.match(new RegExp(`export const ${name} = \`([^\`]*)\``)) || [])[1] || "";
const leagueLists = [...CLUB_SRC.matchAll(/(t1|t2): `([^`]*)`/g).map(m => m[2]), raw("NBA_RAW"), raw("EURO_RAW")]
  .filter(Boolean)
  .map(s => s.split(";").map(e => e.split("|")[0].trim()));
const ALL = [...new Set(leagueLists.flat())];

test("yayın a: kurgusal adlar varsayılan olarak açık", () => {
  assert.equal(BRAND_FICTIONAL, true);
});
test("yayın a: her gerçek kulübün kurgusal karşılığı var, adlar benzersiz ve gerçek ad içermiyor", () => {
  const missing = ALL.filter(n => !BRAND_CLUBS[n]);
  assert.deepEqual(missing, []);
  const fic = Object.values(BRAND_CLUBS).map(v => v[0]);
  assert.equal(new Set(fic).size, fic.length, "kurgusal adlar benzersiz");
  for (const n of ALL) {
    const f = brandClub(n);
    assert.notEqual(f, n, `${n} değişmeli`);
    assert.equal(FORB.test(f), false, `${f} gerçek ad içeriyor`);
    assert.match(brandClubShort(n), /^[A-ZÇĞİÖŞÜÁÉÈÀÂÊÎÔÛŽŠČĆĖ]{2,3}$/u, `${n} kısaltması`);
  }
});
test("yayın a: aynı lig içinde kısaltmalar benzersiz", () => {
  for (const l of leagueLists) {
    const sh = l.map(brandClubShort);
    const dup = sh.filter((s, i) => sh.indexOf(s) !== i);
    assert.deepEqual(dup, [], `${l[0]} ligi`);
  }
});
test("yayın a: sözlüklerde (TR+EN) gerçek lig/turnuva/kulüp adı kalmıyor", () => {
  brandSetLang("tr");
  const T = brandDeep({ ...trAuto, ...tr }, "tr");
  const E = brandDeep({ ...enAuto, ...en }, "en");
  assert.deepEqual([...leftovers(T, "tr"), ...leftovers(E, "en")], []);
});
test("yayın a: olay metinlerinde (TR+EN) gerçek ad kalmıyor", async () => {
  const dir = path.join(ROOT, "src/content");
  const out = [];
  for (const f of fs.readdirSync(dir).filter(f => /^events\..*\.js$/.test(f))) {
    const mod = (await import(path.join(dir, f))).default;
    if (!Array.isArray(mod)) continue;
    const lang = /\.en\.js$/.test(f) ? "en" : "tr";
    out.push(...leftovers(brandDeep(JSON.parse(JSON.stringify(mod)), lang), f));
  }
  assert.deepEqual(out, []);
});
test("yayın a: Türkçe ekler kurgusal adın ünlü uyumuna çevrilir; tabloda olmayan ek yok", () => {
  assert.equal(brandText("NBA'de oyna", "tr"), "KAL'da oyna");
  assert.equal(brandText("NBA'e ulaş", "tr"), "KAL'a ulaş");
  assert.equal(brandText("EuroLeague'de oyna", "tr"), "Kıta Ligi'nde oyna");
  assert.equal(brandText("Final Four'a kalamadı", "tr"), "Dörtlü Final'e kalamadı");
  assert.equal(brandText("FIBA'da hücum süresi", "tr"), "UBF'de hücum süresi");
  assert.equal(brandText("Reach the NBA", "en"), "Reach the NAL");
  const texts = [
    ...Object.values({ ...trAuto, ...tr }),
    ...fs
      .readdirSync(path.join(ROOT, "src/content"))
      .filter(f => /tr\.js$/.test(f))
      .map(f => read(`src/content/${f}`))
  ];
  const bad = [];
  for (const [w, , , sfx] of BRAND_TERMS)
    for (const s of texts)
      for (const m of String(s).matchAll(new RegExp(`${esc(w)}['’]([a-zçğıöşü]+)`, "g")))
        if (!sfx[m[1]]) bad.push(`${w}'${m[1]}`);
  assert.deepEqual([...new Set(bad)], []);
});
test("yayın a: lig kademeleri kurgusal; ABD ligi dile göre", () => {
  brandSetLang("tr");
  assert.deepEqual(brandTiers("US", ["NBA"]), ["Kuzey Amerika Ligi"]);
  brandSetLang("en");
  assert.deepEqual(brandTiers("US", ["NBA"]), ["North American League"]);
  brandSetLang("tr");
  const data = read("src/data.js");
  for (const m of data.matchAll(/t: brandTiers\("(\w+)", (\[[^\]]*\])\)/g)) {
    const t = brandTiers(m[1], JSON.parse(m[2]));
    assert.equal(leftovers(t, m[1]).length, 0, m[1]);
  }
  assert.equal(
    /\bt: \[/.test(data.split("export const LEAGUES")[1].split("export const EU_CC")[0]),
    false,
    "LEAGUES'te çıplak lig listesi"
  );
});
test("yayın a: eski kayıt: anahtarlar aynı, görünen adlar ve metinler kurgusal, üst lig sayımı sürer", () => {
  brandSetLang("tr");
  const s = {
    team: { key: "club|Fenerbahçe", name: "Fenerbahçe", short: "FEN", city: "İstanbul" },
    teams: {
      "club|Fenerbahçe": { key: "club|Fenerbahçe", name: "Fenerbahçe", short: "FEN" },
      "club|Boston Celtics": { key: "club|Boston Celtics", name: "Boston Celtics", short: "BOS" },
      "pro|İstanbul|2": { key: "pro|İstanbul|2", name: "Kadıköy Kartalları", short: "KAD" }
    },
    league: [{ key: "club|Fenerbahçe" }, { key: "club|Anadolu Efes" }],
    hist: [
      { team: "Fenerbahçe", league: "Basketbol Süper Ligi · EuroLeague" },
      { team: "Boston Celtics", league: "NBA" }
    ],
    news: ["Fenerbahçe ile anlaştın, hedef NBA'e gitmek.", "Beşiktaş semtinde koşu yaptın."],
    first: "Real Madrid"
  };
  brandSave(s);
  assert.deepEqual(Object.keys(s.teams), ["club|Fenerbahçe", "club|Boston Celtics", "pro|İstanbul|2"]);
  assert.equal(s.team.key, "club|Fenerbahçe");
  assert.equal(s.team.name, "Kadıköy Kanaryaları");
  assert.equal(s.teams["club|Boston Celtics"].name, "Boston Harbormen");
  assert.equal(s.teams["pro|İstanbul|2"].name, "Kadıköy Kartalları");
  assert.equal(s.league[1].key, "club|Anadolu Efes");
  assert.equal(s.hist[0].league, "Pota Süper Ligi · Kıta Ligi");
  assert.equal(s.hist[1].team, "Boston Harbormen");
  assert.ok(brandIsEuro(s.hist[0].league) && brandIsNba(s.hist[1].league));
  assert.ok(brandIsNba("NBA") && brandIsEuro("Liga ACB · EuroLeague"), "gerçek adlı eski kayıt da sayılır");
  assert.equal(s.news[0], "Kadıköy Kanaryaları ile anlaştın, hedef KAL'a gitmek.");
  assert.equal(s.news[1], "Beşiktaş semtinde koşu yaptın.", "semt adı değişmez");
  assert.equal(s.first, "Real Madrid", "oyuncu adı (name/first) değişmez");
  assert.equal(brandRealOf(s.team), "Fenerbahçe");
});
test("yayın a: derbi eşleşmeleri gerçek kimlikle (anahtar) yapılıyor", () => {
  const d = read("src/derby.js");
  assert.match(d, /brandRealOf\(me\)/);
  for (const m of d.matchAll(/\["([^"]+)", "([^"]+)"\]/g)) {
    assert.ok(BRAND_CLUBS[m[1]] && BRAND_CLUBS[m[2]], `${m[1]} / ${m[2]} kulüp tablosunda`);
  }
});
test("yayın a: mağaza metinleri ve sayfalarda gerçek marka yok", () => {
  const files = ["docs/STORE_LISTING.md", "public/privacy.html", "index.html", "public/manifest.webmanifest"];
  const out = [];
  for (const f of files) {
    const s = read(f);
    const m = FORB.exec(s);
    if (m) out.push(`${f}: ${m[1]}`);
  }
  const pkg = JSON.parse(read("package.json"));
  if (FORB.test(pkg.description)) out.push("package.json description");
  const strings = read("android/app/src/main/res/values/strings.xml");
  if (FORB.test(strings)) out.push("strings.xml");
  assert.deepEqual(out, []);
});
test("yayın a: şehirden üretilen takım adları gerçek kulüple çakışınca değiştirilir", () => {
  assert.ok(BRAND_TEXT_CLUBS.includes("Pallacanestro Varese"));
});
