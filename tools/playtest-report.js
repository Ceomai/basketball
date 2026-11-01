// Oyun testi raporlarını birleştirip özetler: node tools/playtest-report.js <klasör> [çıktı.md]
// Klasördeki her .json dosyası bir test oyuncusunun "Raporu gönder" çıktısıdır.
// Çıktı: Markdown rapor (bırakma noktaları, ilerleme hunisi, mini oyun zorluğu, maç notları, reklam, hatalar, geri bildirim)
// ve dengeye dair otomatik öneriler.
const fs = require("fs"),
  path = require("path");
const dir = process.argv[2],
  out = process.argv[3];
if (!dir) {
  console.error("Kullanım: node tools/playtest-report.js <rapor klasörü> [çıktı.md]");
  process.exit(1);
}
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
const players = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))).filter(r => r && Array.isArray(r.events));
// aynı test kimliğinden birden çok rapor: en çok olay içeren kalsın
const byId = {};
for (const r of players) if (!byId[r.id] || byId[r.id].events.length < r.events.length) byId[r.id] = r;
const P = Object.values(byId);
const med = a => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (a, n) => (n ? Math.round((100 * a) / n) + "%" : "–");
const min = s => (s / 60).toFixed(1) + " dk";
const L = [];
const h = t => L.push(`\n## ${t}\n`);
L.push(
  `# Oyun testi raporu\n\n${P.length} test oyuncusu · ${players.length} rapor dosyası · ${new Date().toISOString().slice(0, 10)}`
);

// Oturumlar
h("Oturumlar");
const sess = P.map(p => p.events.filter(e => e.e === "session_end").map(e => e.dur || 0));
const allS = sess.flat();
const days = P.map(p => new Set(p.events.map(e => new Date(e.t).toISOString().slice(0, 10))).size);
L.push(
  `| | Değer |\n|---|---|\n| Toplam oturum | ${allS.length} |\n| Oturum süresi (medyan) | ${min(med(allS))} |\n| Oyuncu başına toplam süre (medyan) | ${min(med(sess.map(s => s.reduce((a, b) => a + b, 0))))} |\n| Oyuncu başına farklı gün (medyan) | ${med(days)} |\n| 2+ gün oynayan | ${pct(days.filter(d => d >= 2).length, P.length)} |\n| 3+ gün oynayan | ${pct(days.filter(d => d >= 3).length, P.length)} |`
);

// Huni
h("İlerleme hunisi");
const reached = fn => P.filter(p => p.events.some(fn)).length;
const steps = [
  ["Kariyere başladı", e => e.e === "career_start"],
  ["İlk maç", e => e.e === "match"],
  ["5. hafta", e => e.e === "week" && (e.s > 1 || e.w >= 5)],
  ["1. sezonu bitirdi", e => e.e === "season_end"],
  ["Profesyonel oldu (3. lig+)", e => ["t3", "t2", "t1", "euro", "nba"].includes(e.st)],
  ["3. sezon", e => e.s >= 3],
  ["1. lig", e => ["t1", "euro", "nba"].includes(e.st)],
  ["EuroLeague/NBA", e => ["euro", "nba"].includes(e.st)]
];
L.push("| Adım | Ulaşan | Oran |\n|---|---|---|");
for (const [n, fn] of steps) {
  const r = reached(fn);
  L.push(`| ${n} | ${r} | ${pct(r, P.length)} |`);
}

// Bırakma noktaları
h("Oyunu bıraktıkları yer");
L.push("Her oyuncunun son oturumunu kapattığı ekran (oyunu tamamen bıraktığı yer olabilir):\n");
const lastScr = {};
for (const p of P) {
  const ends = p.events.filter(e => e.e === "session_end");
  const last = ends.length ? ends[ends.length - 1].last : "(oturum kapanışı yok)";
  lastScr[last] = (lastScr[last] || 0) + 1;
}
L.push("| Ekran | Oyuncu |\n|---|---|");
Object.entries(lastScr)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([k, v]) => L.push(`| ${k} | ${v} |`));
const allEnds = {};
P.flatMap(p => p.events.filter(e => e.e === "session_end")).forEach(e => (allEnds[e.last] = (allEnds[e.last] || 0) + 1));
L.push(
  "\nTüm oturum kapanışları: " +
    Object.entries(allEnds)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ")
);

// Mini oyunlar
h("Mini oyun zorluğu");
const mg = {};
P.flatMap(p => p.events.filter(e => e.e === "minigame" && e.r != null)).forEach(e => (mg[e.k] = mg[e.k] || []).push(e.r));
const advice = [];
L.push("| Mini oyun | Deneme | Ortalama başarı | Başarısız (%0) | Değerlendirme |\n|---|---|---|---|---|");
for (const [k, rs] of Object.entries(mg).sort((a, b) => b[1].length - a[1].length)) {
  const m = avg(rs),
    zero = rs.filter(r => r === 0).length / rs.length;
  const v = rs.length < 10 ? "az veri" : m < 0.35 ? "ZOR" : m > 0.85 ? "KOLAY" : "dengeli";
  if (v === "ZOR")
    advice.push(
      `- **${k}** mini oyunu zor (ortalama başarı ${(m * 100).toFixed(0)}%). Yeşil bölgeyi/zamanlama toleransını genişlet ya da ilk denemelerde yardım ipucu göster.`
    );
  if (v === "KOLAY")
    advice.push(
      `- **${k}** mini oyunu kolay (ortalama başarı ${(m * 100).toFixed(0)}%). Tolerans daralt ya da üst liglerde zorluğu artır.`
    );
  L.push(`| ${k} | ${rs.length} | ${(m * 100).toFixed(0)}% | ${(zero * 100).toFixed(0)}% | ${v} |`);
}

// Maçlar
h("Maçlar");
const ms = P.flatMap(p => p.events.filter(e => e.e === "match" && e.rating != null));
const man = ms.filter(m => !m.auto),
  aut = ms.filter(m => m.auto);
L.push(
  `| | Kendi oynadığı | Hızlı oynatılan |\n|---|---|---|\n| Maç | ${man.length} | ${aut.length} |\n| Ortalama not | ${avg(man.map(m => m.rating)).toFixed(2)} | ${avg(aut.map(m => m.rating)).toFixed(2)} |\n| Galibiyet | ${pct(man.filter(m => m.win).length, man.length)} | ${pct(aut.filter(m => m.win).length, aut.length)} |`
);
const autoShare = ms.length ? aut.length / ms.length : 0;
if (ms.length >= 20 && autoShare > 0.7)
  advice.push(
    `- Maçların ${(autoShare * 100).toFixed(0)}%'i hızlı oynatılıyor. Maç anları ya uzun ya sıkıcı geliyor olabilir; kritik an sayısını azalt ya da çeşitlendir.`
  );
if (man.length >= 20 && aut.length >= 20 && avg(man.map(m => m.rating)) <= avg(aut.map(m => m.rating)))
  advice.push("- Kendi oynanan maçlar hızlı oynatılanlardan daha iyi not getirmiyor; mini oyun başarısının nota etkisini artır.");
const mm = avg(man.map(m => m.rating));
if (man.length >= 20 && mm < 5.5)
  advice.push(`- Kendi oynanan maçlarda not ortalaması düşük (${mm.toFixed(2)}). Oyuncular cezalandırılmış hissedebilir.`);

// Reklamlar
h("Reklamlar");
const ads = P.flatMap(p => p.events.filter(e => e.e === "ad"));
const ap = {};
ads.forEach(a => {
  const k = a.place;
  ap[k] = ap[k] || { n: 0, ok: 0 };
  ap[k].n++;
  if (a.ok) ap[k].ok++;
});
L.push("| Yerleşim | Gösterim | Tamamlanan |\n|---|---|---|");
Object.entries(ap).forEach(([k, v]) => L.push(`| ${k} | ${v.n} | ${pct(v.ok, v.n)} |`));
L.push(
  `\nOturum başına ödüllü reklam: ${(ads.filter(a => a.kind === "rewarded").length / Math.max(1, allS.length)).toFixed(2)} · geçiş reklamı: ${(ads.filter(a => a.kind === "interstitial").length / Math.max(1, allS.length)).toFixed(2)}`
);

// Hatalar
h("Oyun hataları");
const errs = {};
P.flatMap(p => p.events.filter(e => e.e === "error")).forEach(e => (errs[e.m] = (errs[e.m] || 0) + 1));
const ek = Object.entries(errs).sort((a, b) => b[1] - a[1]);
L.push(
  ek.length
    ? ek
        .slice(0, 10)
        .map(([m, n]) => `- (${n}×) ${m}`)
        .join("\n")
    : "Hata kaydı yok."
);
if (ek.length) advice.unshift(`- Önce ${ek.length} farklı oyun hatasını düzelt (en sık: "${ek[0][0]}").`);

// Geri bildirim
h("Geri bildirim");
const fb = P.flatMap(p => p.feedback || []);
const st = fb.filter(f => f.stars).map(f => f.stars);
L.push(`Ortalama puan: **${st.length ? avg(st).toFixed(1) : "–"} / 5** (${st.length} oy)\n`);
fb.filter(f => f.text)
  .slice(0, 40)
  .forEach(f =>
    L.push(`- ${"★".repeat(f.stars || 0)} _${f.ctx}, sezon ${f.s || "?"}, ${f.st || ""}_: ${f.text.replace(/\n/g, " ")}`)
  );

h("Otomatik öneriler");
L.push(advice.length ? advice.join("\n") : "Belirgin bir sorun görünmüyor (ya da veri az).");
L.push("\n> Not: 10'dan az oyuncuyla oranlar gürültülüdür; kararları geri bildirim metinleriyle birlikte değerlendir.");

const md = L.join("\n") + "\n";
if (out) fs.writeFileSync(out, md);
console.log(md);
