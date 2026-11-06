// İçerik paketlerinin doğrulaması: yazarlar/çevirmenler veri dosyasını bozarsa test yakalar.
import { test } from "node:test";
import assert from "node:assert/strict";
import TR_BASE from "../../src/content/events.tr.js";
import TR_MORE from "../../src/content/events.more.tr.js";
import TR_HARD from "../../src/content/events.hard.tr.js";
const TR = [...TR_BASE, ...TR_MORE, ...TR_HARD];
import EN_BASE from "../../src/content/events.en.js";
import EN_MORE from "../../src/content/events.more.en.js";
import EN_HARD from "../../src/content/events.hard.en.js";
const EN = [...EN_BASE, ...EN_MORE, ...EN_HARD];
import tr from "../../src/i18n/tr.js";
import en from "../../src/i18n/en.js";
import trAuto from "../../src/i18n/tr.auto.js";
import enAuto from "../../src/i18n/en.auto.js";
import fs from "node:fs";

const PORTRAITS = ["friend", "coach", "rival", "mom", "dad", "agent", "press", "partner", "mate", "neighbor", "odd"];
const WHEN_NAMES = [
  "home",
  "abroad",
  "coast",
  "lise",
  "studying",
  "single",
  "pro",
  "school",
  "lower",
  "top",
  "euro",
  "nba",
  "star",
  "bench",
  "young",
  "veteran",
  "rich",
  "broke",
  "famous",
  "partner",
  "national",
  "rivalAhead",
  "lowMorale",
  "tired",
  "tr",
  "ist",
  "foreign"
];
const WHEN = {
  includes: w => w === undefined || (Array.isArray(w) ? w.every(x => WHEN_NAMES.includes(x)) : WHEN_NAMES.includes(w))
};
const PH = [
  "friend",
  "coach",
  "rival",
  "mom",
  "dad",
  "agent",
  "mate",
  "fem",
  "first",
  "FIRST",
  "last",
  "city",
  "stat",
  "W",
  "S",
  "M"
];
const FX = ["moral", "energy", "aka", "followers", "rel", "money", "buffs", "st", "statUp", "partner"];
const REL = ["koc", "takim", "taraf", "aile", "ark", "partner"];
const placeholders = s => [...String(s).matchAll(/\{(\w+)(?::-?[\d.]+)?\}/g)].map(m => m[1]);
const texts = ev =>
  [
    ev.who,
    ev.title,
    ev.text,
    ...ev.choices.flatMap(c => [c.t, c.out, c.needOut, c.win && c.win.out, c.lose && c.lose.out])
  ].filter(Boolean);

test("Türkçe olay paketi geçerli", () => {
  const ids = new Set();
  for (const ev of TR) {
    assert.ok(ev.id && !ids.has(ev.id), `benzersiz id: ${ev.id}`);
    ids.add(ev.id);
    assert.ok(PORTRAITS.includes(ev.w), `${ev.id}: portre`);
    assert.ok(WHEN.includes(ev.when), `${ev.id}: koşul`);
    assert.ok(ev.choices.length >= 2, `${ev.id}: en az iki seçenek`);
    for (const s of texts(ev))
      for (const p of placeholders(s)) assert.ok(PH.includes(p), `${ev.id}: bilinmeyen yer tutucu {${p}}`);
    for (const c of ev.choices) {
      assert.ok(c.out || (c.win && c.lose), `${ev.id}: her seçeneğin sonucu var`);
      for (const fx of [c.fx, c.win && c.win.fx, c.lose && c.lose.fx].filter(Boolean)) {
        for (const k of Object.keys(fx)) assert.ok(FX.includes(k), `${ev.id}: bilinmeyen etki ${k}`);
        if (fx.rel) for (const r of Object.keys(fx.rel)) assert.ok(REL.includes(r), `${ev.id}: bilinmeyen ilişki ${r}`);
      }
    }
  }
});

test("İngilizce paket Türkçe olaylarla eşleşiyor", () => {
  for (const e of EN) {
    const t = TR.find(x => x.id === e.id);
    assert.ok(t, `İngilizce olayın Türkçesi var: ${e.id}`);
    assert.equal(e.choices.length, t.choices.length, `${e.id}: seçenek sayısı aynı`);
    for (const s of texts({ ...t, ...e, choices: e.choices }))
      for (const p of placeholders(s)) assert.ok(PH.includes(p), `${e.id}: {${p}}`);
  }
});

test("arayüz sözlükleri: İngilizce anahtarların hepsi Türkçede var", () => {
  for (const k of Object.keys(en)) assert.ok(k in tr, `tr.js eksik anahtar: ${k}`);
  for (const [k, v] of Object.entries(tr))
    assert.equal(
      placeholders(v).sort().join(),
      placeholders(en[k] ?? v)
        .sort()
        .join(),
      `${k}: yer tutucular aynı`
    );
});

test("otomatik sözlük: koddaki her $t anahtarı var, İngilizce eksiksiz ve yer tutucular aynı", () => {
  const dir = new URL("../../src/", import.meta.url);
  const used = new Set();
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".js")))
    for (const m of fs.readFileSync(new URL(f, dir), "utf8").matchAll(/\$t\("([\w.]+)"/g)) used.add(m[1]);
  for (const k of used) assert.ok(k in trAuto || k in tr, `sözlükte eksik: ${k}`);
  for (const k of Object.keys(trAuto)) {
    assert.ok(k in enAuto, `en.auto.js eksik: ${k}`);
    assert.equal(placeholders(enAuto[k]).sort().join(), placeholders(trAuto[k]).sort().join(), `${k}: yer tutucular`);
  }
});
