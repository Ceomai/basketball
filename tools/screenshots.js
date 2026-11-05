// Mağaza ekran görüntüleri: npm run build:single && node tools/screenshots.js [tr|en|all]
// Çıktı: store/screens/<dil>/NN-ad.png (390×844 görünüm, 1080 genişliğe yakın 2.77x ölçek → 1080×2338)
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const { SINGLE, career, week, toMain } = require("../tests/lib.js");

const OUT = path.resolve(__dirname, "..", "store", "screens");
const LANGS = (process.argv[2] || "all") === "all" ? ["tr", "en"] : [process.argv[2]];

async function shots(browser, lang) {
  const dir = path.join(OUT, lang);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1080 / 390 });
  await ctx.addInitScript(l => {
    try {
      localStorage.setItem("pota-lang", l);
    } catch (e) {
      /* yok */
    }
  }, lang);
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(SINGLE);
  await p.waitForTimeout(600);
  let n = 0;
  const snap = async name => {
    await p.waitForTimeout(350);
    await p.screenshot({ path: path.join(dir, `${String(++n).padStart(2, "0")}-${name}.png`) });
  };
  // 1) oluşturma ekranı: senaryo seçimiyle
  await p.evaluate(() => {
    window.Game.F.first = "Deniz";
    window.Game.F.last = "Yılmaz";
    window.Game.F.slot = 1;
    window.Game.renderCreate && window.Game.renderCreate();
  });
  await snap("olustur");
  // 2) kariyer: birkaç hafta oynanmış ana ekran
  await career(p, { first: "Deniz", last: "Yılmaz", pos: "PG" });
  await p.evaluate(() => {
    const S = window.Game.S;
    S.unlocks = { program: 1, sistem: 1, gorev: 1, miras: 1, plan: 2, basarim: 2, tasarim: 2, hikaye: 2, geceligi: 2 };
    S.tut = 1;
  });
  for (let i = 0; i < 4; i++) await week(p);
  await toMain(p);
  await snap("ana-ekran");
  // 3) profesyonel kariyer görünümü
  await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.age = 24;
    S.stage = "t1";
    S.role = "star";
    S.followers = 184000;
    S.money = 420000;
    for (const k of Object.keys(S.st)) S.st[k] = Math.min(88, S.st[k] + 38);
    G.closeSheet();
    G.renderMain();
  });
  await snap("pro-ana-ekran");
  for (const [loc, tab, name] of [
    ["ev", "genel", "kariyer-ozeti"],
    ["stad", "kadro", "takim-kadrosu"],
    ["borsa", undefined, "borsa"],
    ["hipodrom", undefined, "hipodrom"]
  ]) {
    await p.evaluate(([l, t]) => window.Game.openLoc(l, t), [loc, tab]);
    await snap(name);
    await p.evaluate(() => window.Game.closeSheet());
  }
  // 4) lig merkezi
  await p.evaluate(() => window.Game.leagueSheet && window.Game.leagueSheet("tablo"));
  await snap("lig-merkezi");
  await ctx.close();
  return errs;
}

(async () => {
  if (!fs.existsSync(SINGLE.replace("file://", ""))) {
    console.error("Önce: npm run build:single");
    process.exit(1);
  }
  const browser = await chromium.launch();
  let bad = 0;
  for (const l of LANGS) {
    const errs = await shots(browser, l);
    if (errs.length) {
      bad++;
      console.log(`${l}: sayfa hataları:\n  ${errs.join("\n  ")}`);
    }
    console.log(`${l}: ${fs.readdirSync(path.join(OUT, l)).length} görüntü → store/screens/${l}/`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
