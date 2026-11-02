// Test verisi: gerçek oyun koduyla oynatılmış uzun bir kariyerin kaydı (performans ve içe aktarma testleri için)
// node tests/make-fixture.js  →  tests/fixtures/career-long.json
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto("file://" + path.resolve(__dirname, "..", "dist-single", "index.html"));
  await p.waitForTimeout(400);
  await p.evaluate(fs.readFileSync(path.join(__dirname, "sim-player.js"), "utf8"));
  await p.evaluate(() => Object.assign(window.__SIM, { buyAll: true, adsPerWeek: 0.5, first: "Uzun", last: "Kariyer" }));
  const r = await p.evaluate(() => window.__runCareer("strong", "SF"));
  const S = await p.evaluate(() =>
    JSON.stringify({ v: 5, ts: Date.now(), S: { ...window.Game.S, saveSlot: 1, retired: false } })
  );
  fs.writeFileSync(path.join(__dirname, "fixtures", "career-long.json"), S);
  console.log("sezon", r.seasons.length, "boyut KB", Math.round(S.length / 1024));
  await b.close();
})();
