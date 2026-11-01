// Ekonomi ve tamamlama deneyi: node tests/economy.js <profil başına kariyer> [çıktı.json]
// "Hepsini satın al" stratejisiyle oynayan otomatik oyuncu; üç reklam kullanımı modeli:
//   yok   : hiç reklam izlemez
//   gunluk: günlük 8 ödüllü reklam sınırına takılan gerçekçi yoğun izleyici (haftada ~1,6 reklam ≈ günde 5 oyun haftası)
//   tam   : her fırsatta izler (haftada ~4: prim ×2, devre arası, enerji ×2 — sınır yokmuş gibi, üst sınır)
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const N = +process.argv[2] || 4,
  OUT = process.argv[3],
  PAGES = 4;
const INJ = fs.readFileSync(path.join(__dirname, "sim-player.js"), "utf8");
const URL = "file://" + path.resolve(__dirname, "..", "dist", "index.html");
const MODES = { yok: 0, gunluk: 1.6, tam: 4 };
const POS = ["PG", "SG", "SF", "PF", "C"];
const jobs = [];
for (const pr of ["weak", "avg", "strong"])
  for (const [mode, apw] of Object.entries(MODES)) for (let i = 0; i < N; i++) jobs.push({ pr, mode, apw, pos: POS[i % 5] });
(async () => {
  const b = await chromium.launch(),
    results = [];
  let next = 0;
  async function worker() {
    const p = await b.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    const load = async () => {
      await p.goto(URL);
      await p.waitForTimeout(400);
      await p.evaluate(INJ);
    };
    await load();
    while (next < jobs.length) {
      const j = jobs[next++];
      await p.evaluate(([apw]) => Object.assign(window.__SIM, { buyAll: true, adsPerWeek: apw }), [j.apw]);
      const r = await Promise.race([
        p.evaluate(([a, c]) => window.__runCareer(a, c), [j.pr, j.pos]),
        new Promise(res => setTimeout(() => res({ timeout: true, seasons: [] }), 300000))
      ]);
      Object.assign(r, { profile: j.pr, mode: j.mode, pageErrs: errs.splice(0) });
      results.push(r);
      process.stdout.write(`${results.length}/${jobs.length} `);
      if (r.timeout) await load();
    }
  }
  await Promise.all(Array.from({ length: PAGES }, worker));
  await b.close();
  console.log("");
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(results));
})();
