// Tohumlu üreteçler tek kaynakta (src/logic/rng.js): eski kopyalarla birebir aynı diziyi üretmeli.
// Algoritma değişirse Günün Maçı senaryosu, aynı yazın teklifleri ve arcade tablosu değişir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32, lcg, fnv1a, strHash, seedHash } from "../../src/logic/rng.js";

// --- eski kopyalar (referans; birleştirmeden önceki kod) ---
function oldDaily(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function oldTransition(str) {
  let seed = [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 7);
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function oldSeeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function oldRemoteHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
const oldDataHash = s => {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};
const seq = (g, n = 50) => Array.from({ length: n }, g);
const SEEDS = [0, 1, 7, 12345, 2654435761 * 20412, -5, 4294967295, 99991 * 7919 + 3];
const STRS = ["", "a", "İstanbul|lise", "Şahin Çınar ğüöı", "😀 emoji", "abc123:xyz", "2|Ali|Yılmaz|2027|340|58"];

test("mulberry32 = Günün Maçı üreteci (daily.js) ve tarih tohumu aynı senaryoyu verir", () => {
  for (const s of SEEDS) assert.deepEqual(seq(mulberry32(s)), seq(oldDaily(s)));
  // Günün Maçı: gün numarası × 2654435761
  for (const day of [20000, 20412, 21000]) assert.deepEqual(seq(mulberry32(day * 2654435761)), seq(oldDaily(day * 2654435761)));
});
test("sezon geçişi teklif tohumu: seedHash + mulberry32 = eski Math.random yaması", () => {
  for (const s of STRS) assert.deepEqual(seq(mulberry32(seedHash(s))), seq(oldTransition(s)));
});
test("lcg = arcade tablosu üreteci (extras.js seeded)", () => {
  for (const s of SEEDS) assert.deepEqual(seq(lcg(s)), seq(oldSeeded(s)));
});
test("fnv1a = uzaktan ayar deney kovası özeti; strHash = data.js hash", () => {
  for (const s of STRS) {
    assert.equal(fnv1a(s), oldRemoteHash(s));
    assert.equal(strHash(s), oldDataHash(s));
  }
  assert.equal(strHash(12345), oldDataHash(12345));
});
