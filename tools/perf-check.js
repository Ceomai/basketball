// Kayıt boyutu ve düşük donanım performansı kontrolü: npm run build:single && node tools/perf-check.js [hafta]
// CPU 4x yavaşlatılmış (orta-alt Android'e yakın) bir sayfada hızlı haftalar oynar; hafta süresi, ana ekran çizimi
// ve kayıt boyutu (localStorage) ölçülür. Sınır aşılırsa çıkış kodu 1. Rapor: reports/perf-check.md
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const { SINGLE, open, career, week } = require("../tests/lib.js");

const WEEKS = +process.argv[2] || 60;
const LIMIT = { saveKB: 400, weekMs: 2500, renderMs: 120 };

(async () => {
  const browser = await chromium.launch();
  const p = await open(browser, {}, SINGLE);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await career(p, { pos: "PG" });
  const times = [],
    sizes = [];
  for (let i = 0; i < WEEKS; i++) {
    const t0 = Date.now();
    await week(p);
    times.push(Date.now() - t0);
    if (i % 10 === 9)
      sizes.push(
        await p.evaluate(() => {
          window.Game.save && window.Game.save();
          let n = 0;
          for (let j = 0; j < localStorage.length; j++) {
            const k = localStorage.key(j);
            if (/^pota/.test(k)) n += (localStorage.getItem(k) || "").length;
          }
          return Math.round(n / 1024);
        })
      );
  }
  const render = await p.evaluate(() => {
    const G = window.Game,
      t0 = performance.now();
    for (let i = 0; i < 10; i++) G.renderMain();
    return Math.round((performance.now() - t0) / 10);
  });
  const st = await p.evaluate(() => ({ season: window.Game.S.season, week: window.Game.S.week, stage: window.Game.S.stage }));
  await browser.close();
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)],
    p90 = times[Math.floor(times.length * 0.9)],
    save = sizes[sizes.length - 1] || 0;
  const ok = save <= LIMIT.saveKB && p90 <= LIMIT.weekMs && render <= LIMIT.renderMs;
  const md = `# Performans ve kayıt boyutu (CPU 4x yavaş)

- Oynanan: ${WEEKS} hafta (son durum: ${st.season}. sezon, ${st.week}. hafta, ${st.stage})
- Hafta süresi (hızlı hafta, tıklamalar dahil): medyan ${med} ms, %90 ${p90} ms (sınır ${LIMIT.weekMs})
- Ana ekran çizimi: ${render} ms (sınır ${LIMIT.renderMs})
- Kayıt boyutu (tüm pota* anahtarları, yedekler dahil) her 10 haftada: ${sizes.join(" → ")} KB (sınır ${LIMIT.saveKB})
- Sonuç: ${ok ? "geçti" : "SINIR AŞILDI"}
`;
  fs.mkdirSync(path.resolve(__dirname, "..", "reports"), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, "..", "reports", "perf-check.md"), md);
  console.log(md);
  process.exit(ok ? 0 : 1);
})();
