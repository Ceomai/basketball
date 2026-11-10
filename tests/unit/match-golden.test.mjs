// Maç kodunun "altın kayıt" birim testi (DOM'suz): arka plan hücumu (src/engine.js simPossession) ve elle oynanan
// karar anının mini oyun sonrası çözümü (src/match.js resolvePlay) sabit tohumlu Math.random ve taklit bağımlılıklarla
// (mini oyun sonuçları senaryodan, late.* çağrıları günlüğe) çalıştırılır; her senaryonun dönüş değeri, M değişimi,
// akış satırları, late çağrı sırası ve Math.random çağrı sayısı tests/fixtures/plays-golden.json ile birebir aynı
// olmalı (late çağrılarının günlüğü kayda girmez: yeniden düzenleme hangi yardımcının çağrıldığını değiştirebilir,
// gözlenen sonuç değişmemeli; taklit eff seyirci coşkusuna bağlı olduğundan sıra hataları M'de görünür). Fonksiyonlar kaynak dosyadan metin olarak alınır (motor DOM'suz yüklenemez); saf modüllerin (src/logic/*)
// dışa aktarımları kapsama verilir. Kayıt yalnız bilerek değişen davranışta yeniden yazılır: GOLDEN_WRITE=1.
// Tam simüle maçlar tarayıcıda: node tests/match-golden.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mulberry32 } from "../../src/logic/rng.js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const FIX = path.join(ROOT, "tests/fixtures/plays-golden.json");
const src = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const between = (s, a, b) => {
  const i = s.indexOf(a),
    j = s.indexOf(b, i + 1);
  assert.ok(i >= 0 && j > i, `kaynakta bulunamadı: ${a}`);
  return s.slice(i, j);
};
// saf mantık modüllerinin tüm dışa aktarımları (yeniden düzenlenen kod bunları çağırabilir)
const LOGIC = {};
for (const f of fs.readdirSync(path.join(ROOT, "src/logic")))
  if (f.endsWith(".js")) Object.assign(LOGIC, await import(`../../src/logic/${f}`));

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)]; // src/data.js ile aynı
const $t = (k, o) => (o ? `${k}${JSON.stringify(o)}` : k);
/** kaynaktaki fonksiyon metnini verilen adlar kapsamında derle */
function compile(code, ret, names) {
  const body = code.replace(/^(\s*)export /gm, "$1");
  const keys = [...Object.keys(LOGIC).filter(k => !(k in names)), ...Object.keys(names)];
  const fn = new Function(...keys, `${body}\nreturn ${ret};`);
  return fn(...keys.map(k => (k in names ? names[k] : LOGIC[k])));
}
/** tohumlu, sayaçlı Math.random */
function withRng(seed, fn) {
  const r = mulberry32(seed),
    old = Math.random;
  let n = 0;
  Math.random = () => (n++, r());
  try {
    return { out: fn(), n };
  } finally {
    Math.random = old;
  }
}
async function withRngAsync(seed, fn) {
  const r = mulberry32(seed),
    old = Math.random;
  let n = 0;
  Math.random = () => (n++, r());
  try {
    return { out: await fn(), n };
  } finally {
    Math.random = old;
  }
}
/** late.* taklidi: çağrılar günlüğe; gerçek modüllerin RNG kullanımıyla aynı biçimde */
function mkLate(M, log, o = {}) {
  const L = {
    addFoul: () => (log.push("addFoul"), (M.pf = (M.pf || 0) + 1), ` F${M.pf}`),
    refMul: () => (log.push("refMul"), o.refMul || 20),
    refAnd1: () => (log.push("refAnd1"), 3),
    chemAvg: () => (log.push("chemAvg"), 47),
    possMod: us => (log.push(`possMod:${us}`), (M.runStop = (M.runStop || 0) + 1), us ? 1.04 : 0.97),
    osPossMul: us => (log.push(`osPossMul:${us}`), us ? 1 : 0.96),
    osThree: us => (log.push(`osThree:${us}`), us ? 0.32 : 0.46),
    runTrack: (us, sc) => {
      log.push(`runTrack:${us}:${sc}`);
      if (!us && sc) M.oppRun = (M.oppRun || 0) + 1;
      else if (us && sc) M.oppRun = 0;
    },
    starScore: p => (log.push(`starScore:${p}`), (M.starPts = (M.starPts || 0) + p)),
    // seyirci coşkusu: sayı sonrası eff değişir (sıra hatası yakalansın)
    crowdTick: us => {
      log.push(`crowdTick:${us}`);
      if (us) M.hypeOn = M.us % 4 === 0 ? 3 : 0;
    },
    passTrustMul: () => (log.push("passTrustMul"), 1.05)
  };
  L.backgroundFoul = () => (log.push("backgroundFoul"), Math.random() < 0.015 * L.refMul() ? L.addFoul() : "");
  return L;
}
const EFF = { sut: 62, hiz: 55, guc: 48, pas: 66, sav: 51, iq: 50 };
const mkEff = (M, log) => k => (log.push(`eff:${k}`), EFF[k] + (M.hypeOn > 0 ? 4 : 0));
const snapM = M => JSON.parse(JSON.stringify(M));
// akış/günlük/adımlar uzun: kayıtta özetleri (FNV-1a) tutulur, M, dönüş değeri ve RNG sayısı açık
const digest = o => LOGIC.fnv1a(JSON.stringify(o)).toString(16);

// ---- arka plan hücumu ----
function possessionRuns() {
  const code = between(src("src/engine.js"), "  function simPossession(us) {", "  async function moment(");
  const out = {};
  const TR_CALLS = ["c0", "c1", "c2", "c3", "c4"];
  for (const mode of ["key", "full"])
    for (const role of ["star", "rot", "bench"])
      for (const on of [true, false])
        for (const pos of ["PG", "C"])
          for (const tac of [null, "tempo", "def"]) {
            const id = `${mode}|${role}|${on}|${pos}|${tac}`;
            const M = { us: 0, them: 0, pts: 0, ast: 0, reb: 0, tac, hold: 0 },
              log = [],
              feed = [];
            const S = { team: { short: "BIZ" }, pos };
            const sim = compile(code, "simPossession", {
              M,
              S,
              ppp: 0.52,
              ourStr: 1.02,
              opp: { str: 0.98, short: "RAK" },
              on,
              role,
              mode,
              sur: "Sen",
              mates: ["m1", "m2", "m3", "m4"],
              foes: ["f0", "f1", "f2", "f3", "f4"],
              late: mkLate(M, log),
              addFeed: t => feed.push(t),
              eff: mkEff(M, log),
              clamp,
              pick,
              $t,
              TR_CALLS
            });
            const seed = [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
            const steps = [];
            const { n } = withRng(seed, () => {
              for (let i = 0; i < 60; i++) {
                const r = sim(i % 2 === 0);
                steps.push(`${r === undefined ? "" : r}|${M.us}|${M.them}|${M.pts}|${M.ast}|${M.reb}`);
              }
            });
            out[id] = { M: snapM(M), rng: n, steps: digest(steps), feed: digest(feed) };
          }
  return out;
}

// ---- karar anının çözümü (elle oynanan) ----
async function playRuns() {
  const code = between(src("src/match.js"), "// Basket faul", "export function finishMatch");
  const keys = [...LOGIC.SHOT_THREE, ...LOGIC.SHOT_MID, "drive", "break", "lay", "pnr", "kick", "lob", "post", "dunk"];
  keys.push("putback", "reb", "block", "steal", "charge", "safe", "free", "free3");
  // mini oyun sonuçları: [ilk mini oyun, ikinci (basket faul serbest atışı)]
  const MG = { fail: [0, 0], ok: [1, 1], okMiss: [1, 0], two: [2, 1] };
  const out = {};
  for (const k of keys)
    for (const [mgName, seq] of Object.entries(MG))
      for (const pos of ["SF", "PF"])
        for (let s = 0; s < 6; s++) {
          const id = `${k}|${mgName}|${pos}|${s}`;
          const M = { pts: 0, ast: 0, reb: 0, blk: 0, stl: 0, stops: 0 },
            log = [],
            feed = [];
          const S = { pos, rel: { takim: 58 } };
          let mi = 0;
          const nx = (name, a) => {
            log.push(`${name}:${JSON.stringify(a)}`);
            return seq[Math.min(mi++, seq.length - 1)];
          };
          const mg = {
            mgShoot: async (el, a) => {
              const v = nx("mgShoot", a);
              return { made: v ? 1 : 0, pts: v ? (a.dist === "three" ? 3 : 2) : 0 };
            },
            mgTiming: async (el, a) => ({ ok: Math.min(nx("mgTiming", a), a.tries || 1) }),
            mgDribble: async (el, a) => ({ ok: nx("mgDribble", a) }),
            mgPass: async (el, a) => ({ ok: nx("mgPass", a) }),
            mgPost: async (el, a) => ({ ok: nx("mgPost", a) }),
            mgRebound: async (el, a) => ({ ok: nx("mgRebound", a) }),
            mgBlock: async (el, a) => ({ ok: nx("mgBlock", a) })
          };
          const resolvePlay = compile(code, "resolvePlay", {
            M,
            S,
            late: mkLate(M, log),
            addFeed: t => feed.push(t),
            eff: mkEff(M, log),
            clamp,
            pick,
            $t,
            PEN: { pull: 6, catch: 4, wing: 5, step: 2, pop: 2, lob: -4, pnr: 0, kick: -6, corner: 7, top3: 11, float: 5, mid: 4, lay: 3 },
            ...mg
          });
          const seed = [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
          const { out: r, n } = await withRngAsync(seed, () => resolvePlay(k, null, "Sen", "Rakip"));
          out[id] = { r: r && { ...r, txt: digest(r.txt) }, M: snapM(M), rng: n, feed: digest(feed) };
        }
  return out;
}

const want = fs.existsSync(FIX) ? JSON.parse(fs.readFileSync(FIX, "utf8")) : null;
const got = { possession: possessionRuns(), plays: await playRuns() };
if (process.env.GOLDEN_WRITE) fs.writeFileSync(FIX, JSON.stringify(got) + "\n");

const cmp = part => {
  assert.ok(want, "kayıt yok: GOLDEN_WRITE=1 ile oluştur");
  const w = want[part],
    g = got[part];
  assert.deepEqual(Object.keys(g), Object.keys(w), "senaryo listesi");
  const bad = Object.keys(w).filter(id => JSON.stringify(w[id]) !== JSON.stringify(g[id]));
  if (bad.length) assert.deepEqual(g[bad[0]], w[bad[0]], `${bad.length} senaryo farklı, ilki: ${bad[0]}`);
};
test("arka plan hücumu (simPossession): altın kayıtla birebir aynı", () => cmp("possession"));
test("karar anı çözümü (resolvePlay, mini oyun sonrası): altın kayıtla birebir aynı", () => cmp("plays"));
