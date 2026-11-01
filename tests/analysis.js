// Yeni özellik analizi: node tests/analysis.js <grup> <kariyer sayısı> <çıktı.json>
//   reklam : profil (zayıf/ortalama/güçlü) × reklam kullanımı (yok/günlük/tam); emeklilik sonrası + oğul kariyeri
//   gercekci: profil × gerçekçi reklam (yok / hızlı oyuncu / elle oyuncu, günlük sınıra göre)
//   rastgele: sağlamlık için rastgele kararlar (teklif, program, madde, erken emeklilik), oğul kariyeri
//   ozellik: ortalama profil × antrenman programı (dengeli/odaklı) × sözleşme maddesi (istemez/ister)
// Sonuçlar tools/analysis-report.js ile özetlenir.
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const GROUP = process.argv[2] || "reklam",
  N = +process.argv[3] || 3,
  OUT = process.argv[4] || "analysis.json",
  PAGES = +process.env.PAGES || 4;
const INJ = fs.readFileSync(path.join(__dirname, "sim-player.js"), "utf8");
const URL = "file://" + path.resolve(__dirname, "..", "dist-single", "index.html");
const POS = ["PG", "SG", "SF", "PF", "C"];
const ADS = { yok: 0, gunluk: 1.6, tam: 4 };
// gerçekçi: günlük 8 ödüllü reklam sınırı gerçek güne bağlı. Elle oynayan (günde 1 saat ≈ 17 hafta) haftada ~0,5;
// hızlı oynayan (günde 30 dk ≈ 180 hafta) haftada ~0,07 reklam izleyebilir.
const REAL = { yok: 0, hizli: 0.07, elle: 0.5 };
const jobs = [];
if (GROUP === "reklam")
  for (const pr of ["weak", "avg", "strong"])
    for (const [ad, apw] of Object.entries(ADS))
      for (let i = 0; i < N; i++) jobs.push({ pr, ad, cfg: { adsPerWeek: apw, after: true, heir: true }, pos: POS[i % 5] });
else if (GROUP === "gercekci")
  for (const pr of ["weak", "avg", "strong"])
    for (const [ad, apw] of Object.entries(REAL))
      for (let i = 0; i < N; i++) jobs.push({ pr, ad, cfg: { adsPerWeek: apw, after: true }, pos: POS[i % 5] });
else if (GROUP === "rastgele")
  // sağlamlık: rastgele teklif, program, madde ve emeklilik; her profil, her pozisyon, emeklilik sonrası ve oğul
  for (const pr of ["weak", "avg", "strong"])
    for (let i = 0; i < N; i++)
      jobs.push({
        pr,
        ad: "gunluk",
        cfg: { adsPerWeek: [0, 0.5, 1.6][i % 3], random: true, after: true, heir: i % 2 === 0 },
        pos: POS[i % 5]
      });
else
  for (const program of ["denge", "focus"])
    for (const clauses of [false, true])
      for (let i = 0; i < N; i++)
        jobs.push({
          pr: "avg",
          ad: "gunluk",
          program,
          clauses,
          cfg: { adsPerWeek: 1.6, program, clauses, after: true },
          pos: POS[i % 5]
        });
if (process.env.LIMIT) jobs.splice(+process.env.LIMIT);
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
      await p.evaluate(
        cfg =>
          Object.assign(window.__SIM, {
            buyAll: false,
            program: "denge",
            clauses: false,
            random: false,
            heir: false,
            after: false,
            ...cfg
          }),
        j.cfg
      );
      const r = await Promise.race([
        p.evaluate(([a, c]) => window.__runCareer(a, c), [j.pr, j.pos]),
        new Promise(res => setTimeout(() => res({ timeout: true, seasons: [] }), 600000))
      ]);
      Object.assign(r, { profile: j.pr, ad: j.ad, program: j.program, clausesMode: j.clauses, pageErrs: errs.splice(0) });
      results.push(r);
      process.stdout.write(`${results.length}/${jobs.length} `);
      if (r.timeout) await load();
    }
  }
  await Promise.all(Array.from({ length: PAGES }, worker));
  await b.close();
  fs.writeFileSync(OUT, JSON.stringify(results));
  console.log("\n" + OUT);
  process.exit(0);
})();
