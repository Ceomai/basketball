// Maç motoru "altın kayıt" testi: node tests/match-golden.js [--write]   (önce: npm run build:single)
// Sabit tohumlarla simüle (AUTO) maçlar oynar ve her maçın girdi→çıktı kaydını tests/fixtures/match-golden.json ile
// BİREBİR karşılaştırır: skor, çeyrek skorları, oyuncu istatistikleri, faul, M.plus, not, akış metinleri, maç sonu
// oyuncu durumu özeti ve Math.random çağrı sayısı. Maç kodunu yeniden düzenlerken (src/engine.js, src/match.js,
// src/logic/possession.js) davranışın değişmediğinin kanıtı. --write kaydı yeniden yazar (yalnız bilerek değişen
// davranışta, gerekçeyle). Elle oynanan karar anları (mini oyun sonrası olasılıklar) tests/unit/match-golden.test.mjs'te.
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const { SINGLE } = require("./lib.js");

// GAME_URL: başka bir derleme (ör. npx vite build --mode single --outDir /tmp/x → file:///tmp/x/index.html)
const URL = process.env.GAME_URL || SINGLE;
const FIX = path.join(__dirname, "fixtures", "match-golden.json");
const PRO = fs.readFileSync(path.join(__dirname, "fixtures", "career-long.json"), "utf8");
const WRITE = process.argv.includes("--write");
const POS = ["PG", "SG", "SF", "PF", "C"];
// 22 senaryo: 0-9 lise kariyeri (yeni), 10-19 profesyonel kariyer (kayıt); ev/deplasman, milli maç karışık.
// 20-21: üst üste iki simüle maç aynı anda başlar (hızlı hafta iki kez tıklanırsa): iki döngü de canlı M'ye yazar.
const SCEN = Array.from({ length: 22 }, (_, i) => ({
  i,
  pro: i >= 10 && i !== 20,
  pos: POS[i % 5],
  home: i % 2 === 0,
  nat: i === 7 || i === 17,
  dual: i >= 20
}));

async function run(browser, sc) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // kurulum da tohumlu (src/testseed.js); maçtan hemen önce Math.random yeniden tohumlanır (sayaçlı)
  await ctx.addInitScript(s => (window.__TEST = { seed: s, quietSheets: 1 }), `golden-setup|${sc.i}`);
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  p.on("dialog", d => d.dismiss().catch(() => {}));
  await p.goto(URL);
  await p.waitForTimeout(400);
  await p.evaluate(
    ([sc, pro]) => {
      const G = window.Game;
      G.ADS.consent = true;
      if (sc.pro) {
        localStorage.setItem("pota-slot-1", pro);
        G.openSafe(G.loadSlot(1).S);
      } else {
        G.F.first = "Altın";
        G.F.last = "Kayıt";
        G.F.pos = sc.pos;
        G.F.slot = 1;
        G.F.mode = "normal";
        G.startCareer();
        G.S.tut = 1;
      }
      G.S.tipMoment = 1;
      G.closeSheet();
    },
    [sc, PRO]
  );
  await p.waitForTimeout(1200); // açılıştaki zamanlayıcılar (bildirim, kayıt) maçtan önce bitsin
  const out = await p.evaluate(sc => {
    const G = window.Game;
    G.closeSheet();
    // mulberry32 (src/logic/rng.js) + çağrı sayacı
    let a = (0x9e3779b9 ^ (sc.i * 0x85ebca6b)) >>> 0,
      n = 0;
    Math.random = () => {
      n++;
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const S = G.S;
    const pre = { stage: S.stage, pos: S.pos, str: S.team.str };
    return new Promise(res => {
      const t0 = performance.now();
      const fx = G.fixture();
      const opp = G.teamByKey(fx.opp) || G.teamByKey(S.sched[0].opp);
      const ctx = sc.nat
        ? { opp, home: sc.home, comp: "nat", role: "rot", label: "golden", auto: true }
        : { opp, home: sc.home, comp: "lig", label: "golden", auto: true };
      const ends = [];
      const onEnd = win => {
        const M = G.M;
        const pick = o => Object.fromEntries(Object.keys(o).map(k => [k, o[k]]));
        const r9 = v => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v);
        const keys =
          "us them pts ast reb blk stl stops fga fgm tpa tpm fta ftm pf fo plus mins rating autoPts autoAst touches wsum wgood and1 low ref dz ostyle hype mmod effMod oppRun".split(
            " "
          );
        const st = {};
        for (const k of keys) st[k] = r9(M[k] === undefined ? null : M[k]);
        // maç sonu oyuncu durumu (karar anlarındaki nitelik kazancı vb.)
        const sv = JSON.stringify(S, (k, v) => (k === "cid" ? undefined : typeof v === "number" ? r9(v) : v)); // cid: zaman damgalı kariyer kimliği
        let h = 0x811c9dc5;
        for (let i = 0; i < sv.length; i++) h = Math.imul(h ^ sv.charCodeAt(i), 0x01000193) >>> 0;
        const r = {
          win,
          pre,
          opp: opp.key || opp.short,
          qs: M.qs,
          st,
          star: M.star ? pick(M.star) : null,
          feed: M.feed.map(f => `${f.t} ${f.x}`),
          rng: n,
          sHash: h.toString(16),
          ms: Math.round(performance.now() - t0)
        };
        ends.push(r);
        if (!sc.dual) res(r);
        else if (ends.length === 2) res({ ...ends[1], first: { ...ends[0], ms: undefined } });
      };
      ctx.onEnd = onEnd;
      G.playMatch(ctx).catch(e => res({ err: String(e && e.stack) }));
      if (sc.dual) G.playMatch({ ...ctx, home: !ctx.home }).catch(e => res({ err: String(e && e.stack) }));
    });
  }, sc);
  await ctx.close();
  out.errs = errs;
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const got = {};
  const ms = [];
  for (const sc of SCEN) {
    const r = await run(browser, sc);
    if (r.err || r.errs.length) {
      console.error(`#${sc.i} hata:`, r.err || r.errs.join(" | "));
      process.exitCode = 1;
    }
    ms.push(r.ms);
    delete r.ms;
    delete r.errs;
    got[sc.i] = r;
    console.log(`#${sc.i} ${r.pre && r.pre.stage} ${r.st && r.st.us}-${r.st && r.st.them} rng=${r.rng}`);
  }
  await browser.close();
  ms.sort((a, b) => a - b);
  console.log(`maç süresi (ms): medyan ${ms[ms.length >> 1]}, en çok ${ms[ms.length - 1]}`);
  if (WRITE) {
    fs.writeFileSync(FIX, JSON.stringify(got, null, 1) + "\n");
    console.log("yazıldı:", path.relative(process.cwd(), FIX));
    return;
  }
  const want = JSON.parse(fs.readFileSync(FIX, "utf8"));
  let bad = 0;
  for (const sc of SCEN) {
    const a = JSON.stringify(want[sc.i]),
      b = JSON.stringify(got[sc.i]);
    if (a !== b) {
      bad++;
      const w = want[sc.i] || {},
        g = got[sc.i] || {};
      const diff = Object.keys({ ...w, ...g }).filter(k => JSON.stringify(w[k]) !== JSON.stringify(g[k]));
      console.error(`#${sc.i} FARKLI: ${diff.join(", ")}`);
      if (w.st && g.st)
        for (const k of Object.keys(w.st)) if (w.st[k] !== g.st[k]) console.error(`   ${k}: ${w.st[k]} → ${g.st[k]}`);
    }
  }
  console.log(bad ? `ALTIN KAYIT: ${bad}/${SCEN.length} farklı` : `ALTIN KAYIT: ${SCEN.length}/${SCEN.length} birebir aynı`);
  if (bad) process.exitCode = 1;
})();
