// İçerik paketlerinin doğrulaması: yazarlar/çevirmenler veri dosyasını bozarsa test yakalar.
import { test } from "node:test";
import assert from "node:assert/strict";
import TR from "../../src/content/events.tr.js";
import EN from "../../src/content/events.en.js";
import tr from "../../src/i18n/tr.js";
import en from "../../src/i18n/en.js";

const PORTRAITS = ["friend", "coach", "rival", "mom", "dad", "agent", "press", "partner", "mate", "neighbor", "odd"];
const WHEN = [undefined, "home", "abroad", "coast", "lise", "studying", "single", "pro"];
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
const REL = ["koc", "takim", "taraf", "aile", "ark"];
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
