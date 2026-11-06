// Oyunda gerçekten görünen metnin denetimi (bir kez çalıştırılan araç; önce npm run build:single).
// TR ve EN'de (normal ve en büyük yazı boyutunda) kariyeri N hafta oynatır; her ekranın innerText'inde ham anahtar,
// "undefined"/"NaN"/"[object Object]", "{x}" kalıntısı ve karışık dil arar; 390 px'te taşan/kırpılan düğme ve başlıkları
// ve yatay kaydırmayı bulur. Her haftanın ana ekranından mekânlar ve sekmeleri de açılır.
// Kullanım: node tools/i18n-playtest.js [hafta=32] [ekran-görüntüsü-klasörü]
// Çıktı: reports/data/i18n-playtest.json (özet reports/i18n-audit.md'ye elle aktarılır)
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const { SINGLE, career, toMain } = require("../tests/lib.js");
const WEEKS = +process.argv[2] || 32;
const SHOTS = process.argv[3] || null;
const ROOT = path.join(__dirname, "..");

async function keySet() {
  const imp = p => import(path.join(ROOT, "src", p)).then(m => m.default);
  return Object.keys({ ...(await imp("i18n/tr.auto.js")), ...(await imp("i18n/tr.js")) });
}

// sayfada çalışır: görünen metni ve taşan öğeleri topla
function scan(KEYS) {
  const keys = new Set(KEYS);
  const txt = document.body.innerText;
  const out = { raw: [], bad: [], ph: [], turk: [], eng: [], over: [], hscroll: 0 };
  for (const m of txt.matchAll(/(?<![\w.@/])([a-z][a-zA-Z0-9]*\.[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)(?![\w/])/g)) {
    const k = m[1];
    if (keys.has(k) || /^[a-z]{1,5}\d*\.[a-zA-Z]\w*$/.test(k))
      if (!/^(e\.g|i\.e|vs|www|claude\.ai|a\.m|p\.m)/.test(k)) out.raw.push(k);
  }
  for (const m of txt.matchAll(/.{0,30}(undefined|NaN|\[object Object\]|null\b).{0,30}/g)) out.bad.push(m[0]);
  for (const m of txt.matchAll(/.{0,30}\{[a-zA-Z@]\w*\}.{0,30}/g)) out.ph.push(m[0]);
  const lang = document.documentElement.lang;
  if (lang === "en") {
    for (const m of txt.matchAll(/[A-Za-zÇĞİÖŞÜçğıöşü]*[çğıöşüÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü]*/g)) out.turk.push(m[0]);
    for (const m of txt.matchAll(
      /(?<![\p{L}'’])(ve|bir|ile|için|ama|değil|gibi|daha|sonra|hafta|maç|takım|oyuncu|tamam)(?![\p{L}])/giu
    ))
      out.turk.push(m[0]);
  } else {
    for (const line of txt.split("\n")) {
      const n = (line.match(/\b(the|and|you|your|with|this|that|have|will|for|are|was|of|to|is)\b/g) || []).length;
      if (n >= 3 && !/[çğıöşü]/i.test(line)) out.eng.push(line.slice(0, 120));
    }
  }
  const W = innerWidth;
  if (document.documentElement.scrollWidth > W + 1) out.hscroll = document.documentElement.scrollWidth;
  for (const el of document.querySelectorAll("button,.btn,.opt,h1,h2,h3,.eyebrow,.tabs button,.chip,.k,.v,.ct")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !el.innerText.trim()) continue;
    const cs = getComputedStyle(el);
    const clipped =
      el.scrollWidth > el.clientWidth + 2 && cs.overflow !== "visible" && cs.overflowX !== "auto" && cs.overflowX !== "scroll";
    if ((r.right > W + 1 && r.left < W) || clipped)
      out.over.push(
        `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} «${el.innerText.trim().slice(0, 60)}» ${Math.round(r.right)}px${clipped ? " kırpık" : ""}`
      );
  }
  return out;
}

async function run(browser, lang, fs_, KEYS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(
    ([l, f]) => {
      localStorage.setItem("pota-lang", l);
      localStorage.setItem("pota-settings", JSON.stringify({ fs: f }));
    },
    [lang, fs_]
  );
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  p.on("dialog", d => d.dismiss().catch(() => {}));
  await p.goto(SINGLE);
  await p.waitForTimeout(500);
  const R = { raw: {}, bad: {}, ph: {}, turk: {}, eng: {}, over: {}, hscroll: {}, screens: 0, weeks: 0 };
  let shot = 0;
  const grab = async where => {
    const o = await p.evaluate(scan, KEYS);
    R.screens++;
    for (const c of ["raw", "bad", "ph", "turk", "eng", "over"])
      for (const x of o[c]) (R[c][x] = R[c][x] || []).length < 3 && R[c][x].push(where);
    if (o.hscroll) R.hscroll[where] = o.hscroll;
    if (SHOTS && (o.over.length || o.hscroll) && shot < 60)
      await p.screenshot({ path: path.join(SHOTS, `${lang}-${fs_}-${shot++}.png`) });
  };
  // toMain'in her adımından önce ekranı tara
  const orig = p.evaluate.bind(p);
  p.evaluate = async (fn, arg) => {
    if (typeof fn === "function" && String(fn).includes("#gostad")) await grab("akış").catch(() => {});
    return orig(fn, arg);
  };
  await career(p, { first: "Deniz", last: "Kaya" });
  await toMain(p);
  for (let w = 0; w < WEEKS; w++) {
    await grab(`hafta ${w} ana ekran`);
    if (w % 4 === 0) {
      const locs = await orig(() => [...document.querySelectorAll(".loc")].map(g => g.dataset.loc));
      for (const id of locs) {
        await orig(id => {
          window.Game.closeSheet();
          try {
            window.Game.openLoc(id);
          } catch (e) {}
        }, id);
        await p.waitForTimeout(40);
        await grab(`mekân ${id}`);
        const tabs = await orig(() => document.querySelectorAll("#ovl .tabs button").length);
        for (let i = 0; i < Math.min(tabs, 8); i++) {
          await orig(i => {
            const b = document.querySelectorAll("#ovl .tabs button")[i];
            if (b) b.click();
          }, i);
          await p.waitForTimeout(30);
          await grab(`mekân ${id} sekme ${i}`);
        }
      }
      await orig(() => window.Game.closeSheet());
      await toMain(p);
    }
    await orig(() => {
      window.Game.closeSheet();
      window.Game.renderMain();
    });
    const q = await p.$("#quickw");
    if (!q) break;
    await q.click();
    const sim = await p.$("#qw-sim");
    if (sim) await sim.click();
    const st = await toMain(p);
    R.weeks++;
    if (st !== "main") break;
  }
  R.errs = errs;
  await ctx.close();
  return R;
}

(async () => {
  const KEYS = await keySet();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const all = {};
  for (const [lang, f] of [
    ["tr", "m"],
    ["en", "m"],
    ["en", "xl"],
    ["tr", "xl"]
  ]) {
    const r = await run(browser, lang, f, KEYS);
    all[`${lang}-${f}`] = r;
    console.log(
      `${lang}-${f}: ${r.weeks} hafta, ${r.screens} ekran · ham anahtar ${Object.keys(r.raw).length} · undefined/NaN ${Object.keys(r.bad).length} · {x} ${Object.keys(r.ph).length} · TR kelime ${Object.keys(r.turk).length} · EN satır ${Object.keys(r.eng).length} · taşma ${Object.keys(r.over).length} · yatay kaydırma ${Object.keys(r.hscroll).length} · hata ${r.errs.length}`
    );
  }
  await browser.close();
  fs.mkdirSync(path.join(ROOT, "reports", "data"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "reports", "data", "i18n-playtest.json"), JSON.stringify(all, null, 1));
})();
