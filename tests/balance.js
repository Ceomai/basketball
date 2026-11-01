// Denge simülasyonu: node tests/balance.js <profil başına kariyer> [çıktı.json]
// Zayıf, ortalama ve yetenekli üç oyuncu profiliyle oyunun gerçek kodunda tam kariyerler oynatır,
// özet tablo basar ve hedef aralıkların dışına çıkılırsa hata koduyla biter.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const N = +process.argv[2] || 6, OUT = process.argv[3], PAGES = 4;
const INJ = fs.readFileSync(path.join(__dirname, "sim-player.js"), "utf8");
const URL = "file://" + path.resolve(__dirname, "..", "dist", "index.html"); // npm run build çıktısı
const POS = ["PG", "SG", "SF", "PF", "C"], ORDER = ["lise", "uni", "t3", "t2", "t1", "euro", "nba"];
const jobs = []; for (const pr of ["weak", "avg", "strong"]) for (let i = 0; i < N; i++) jobs.push({ pr, pos: POS[i % 5] });
const med = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
(async () => {
  const b = await chromium.launch(); const results = []; let next = 0;
  async function worker() {
    const p = await b.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
    const load = async () => { await p.goto(URL); await p.waitForTimeout(400); await p.evaluate(INJ); };
    await load();
    while (next < jobs.length) {
      const j = jobs[next++], t0 = Date.now();
      const r = await Promise.race([p.evaluate(([a, c]) => window.__runCareer(a, c), [j.pr, j.pos]), new Promise(res => setTimeout(() => res({ timeout: true, profile: j.pr, pos: j.pos, seasons: [] }), 300000))]);
      r.ms = Date.now() - t0; r.pageErrs = errs.splice(0); results.push(r); process.stdout.write(`${results.length}/${jobs.length} `);
      if (r.timeout) await load();
    }
  }
  await Promise.all(Array.from({ length: PAGES }, worker)); await b.close(); console.log("");
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(results));
  const fails = [], summary = {};
  for (const pr of ["weak", "avg", "strong"]) {
    const rs = results.filter(r => r.profile === pr), n = rs.length;
    const top = rs.map(r => Math.max(0, ...r.seasons.map(s => ORDER.indexOf(s.stage))));
    const pct = st => Math.round(100 * top.filter(i => i >= ORDER.indexOf(st)).length / n);
    const ovrAt = a => med(rs.flatMap(r => r.seasons.filter(s => s.age === a).map(s => s.ovr)));
    const S = summary[pr] = { careers: n, euroPlus: pct("euro"), nba: pct("nba"), ovr22: ovrAt(22), ovr26: ovrAt(26), ovr30: ovrAt(30),
      mvpPerCareer: +(rs.reduce((a, r) => a + (r.trophies || []).filter(t => t === "mvp").length, 0) / n).toFixed(2),
      awardsPerCareer: +(rs.reduce((a, r) => a + (r.trophies || []).filter(t => ["award", "mvp", "allstar"].includes(t)).length, 0) / n).toFixed(1),
      moneyFinal: med(rs.map(r => r.final && r.final.money)), injuredGames: +(rs.reduce((a, r) => a + r.seasons.reduce((x, s) => x + (s.dnp || 0), 0), 0) / n).toFixed(1),
      gamesPerSeason: med(rs.flatMap(r => r.seasons.map(s => s.w + s.l))), problems: rs.filter(r => r.timeout || r.stuck || r.err || r.pageErrs.length).length };
    if (S.problems) fails.push(`${pr}: ${S.problems} kariyerde hata/takılma ` + JSON.stringify(rs.filter(r => r.stuck || r.err || r.pageErrs.length).map(r => (r.err || r.stuck || r.pageErrs[0] || "").slice(0, 160)).slice(0, 2)));
  }
  console.table(summary);
  const W = summary.weak, A = summary.avg, T = summary.strong;
  // Geniş hedef aralıklar. Az kariyerde (hızlı test) gürültü yüksek olduğu için oran kontrolleri yalnızca N>=6'da yapılır.
  if (N >= 6 && W.nba > 25) fails.push(`zayıf profil NBA oranı yüksek: %${W.nba}`);
  if (N >= 6 && T.nba < 40) fails.push(`yetenekli profil NBA oranı düşük: %${T.nba}`);
  if (!(T.ovr26 > A.ovr26 && A.ovr26 > W.ovr26)) fails.push("profil sıralaması bozuk (26 yaş genel reyting)");
  if (N >= 6 && A.awardsPerCareer > 10) fails.push(`bireysel ödül enflasyonu: ortalama profil ${A.awardsPerCareer}`);
  if (fails.length) { console.error("DENGE TESTİ BAŞARISIZ:\n- " + fails.join("\n- ")); process.exit(1); }
  console.log("Denge testi geçti.");
})();
