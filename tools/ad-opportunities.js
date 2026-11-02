// Reklam fırsatlarını ölç (gelir analizi için): kariyer başına maç, hafta, sezon, son hücum ve kaçan son şut.
// Önce: npm run build:single. Çalıştır: node tools/ad-opportunities.js [çıktı.json]
/* global __C */
const { chromium } = require("playwright");
const fs = require("fs");
const INJ = fs.readFileSync(require("path").join(__dirname, "..", "tests", "sim-player.js"), "utf8");
const URL = "file://" + require("path").join(__dirname, "..", "dist-single", "index.html");
const POS = ["PG", "SG", "SF", "PF", "C"];
(async () => {
  const b = await chromium.launch();
  const jobs = [];
  for (const mode of ["normal", "hizli"])
    for (let i = 0; i < 6; i++) jobs.push({ mode, pos: POS[i % 5], pr: ["weak", "avg", "strong"][i % 3] });
  const out = [];
  let next = 0;
  async function worker() {
    const p = await b.newPage();
    await p.goto(URL);
    await p.waitForTimeout(400);
    await p.evaluate(INJ);
    await p.evaluate(() => {
      const G = window.Game;
      window.__C = { matches: 0, weeks: 0, seasons: 0, last: 0, lastMiss: 0, inj: 0, pro: 0, bench: 0, close: 0 };
      G.Bus.on("match:end", () => {
        __C.matches++;
        if (G.S && G.S.injury && !G.S.__injSeen) {
          __C.inj++;
          G.S.__injSeen = 1;
        }
        if (G.S && !G.S.injury) G.S.__injSeen = 0;
      });
      G.Bus.on("week:start", () => {
        __C.weeks++;
        if (G.S && ["t3", "t2", "t1", "euro", "nba"].includes(G.S.stage)) __C.pro++;
      });
      G.Bus.on("season:end", () => __C.seasons++);
      G.Bus.on("match:moment", d => {
        if (d.id === "lastshot") {
          __C.last++;
          if (!d.good) __C.lastMiss++;
        }
      });
    });
    while (next < jobs.length) {
      const j = jobs[next++];
      await p.evaluate(m => {
        Object.assign(window.__SIM, {
          buyAll: false,
          program: "denge",
          clauses: false,
          random: false,
          mode: m,
          heir: false,
          after: false,
          adsPerWeek: 0.5
        });
        for (const k in __C) __C[k] = 0;
      }, j.mode);
      const r = await p.evaluate(([a, c]) => window.__runCareer(a, c), [j.pr, j.pos]);
      const c = await p.evaluate(() => ({ ...__C }));
      out.push({ ...j, ...c, retired: r.retired });
      process.stdout.write(".");
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  await b.close();
  fs.writeFileSync(process.argv[2] || "ad-opportunities.json", JSON.stringify(out, null, 1));
  for (const m of ["normal", "hizli"]) {
    const L = out.filter(x => x.mode === m),
      n = L.length,
      avg = k => (L.reduce((a, x) => a + x[k], 0) / n).toFixed(1);
    console.log(
      `\n${m}: maç ${avg("matches")} hafta ${avg("weeks")} sezon ${avg("seasons")} sonHücum ${avg("last")} kaçan ${avg("lastMiss")} sakatlık ${avg("inj")} proHafta ${avg("pro")}`
    );
  }
})();
