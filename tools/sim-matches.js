// Hızlı maç simülasyonu (node, tarayıcısız): node tools/sim-matches.js [maç=2000] [bizimGüç=1] [rakipGüç=1] [ppp=0.5] [tohum=1]
// Maç döngüsü oyundakiyle aynı (src/logic/simmatch.js: saat, çeyrek, rotasyon, uzatma); hücumlar saf hesapla
// (src/logic/possession.js) basit takım modeliyle oynanır (mola, seri, rakip tarzı, karar anı mini oyunu yok).
// Denge değişikliğinin skor ve galibiyet oranına etkisini saniyeler içinde görmek için; tam oyun dengesi tests/balance.js.
const path = require("path");
const { pathToFileURL } = require("url");
const [N = 2000, US = 1, THEM = 1, PPP = 0.5, SEED = 1] = process.argv.slice(2).map(Number);

(async () => {
  const L = p => import(pathToFileURL(path.join(__dirname, "..", "src", "logic", p)).href);
  const { simulateMatch } = await L("simmatch.js");
  const { mulberry32 } = await L("rng.js");
  const rng = mulberry32(SEED);
  const t0 = Date.now();
  let wins = 0,
    ot = 0,
    sumUs = 0,
    sumThem = 0,
    margin = 0;
  const hist = new Map();
  for (let i = 0; i < N; i++) {
    const { m } = await simulateMatch({ us: { str: US }, them: { str: THEM }, opts: { ppp: PPP } }, rng);
    if (m.us > m.them) wins++;
    if (m.qs.length > 4) ot++;
    sumUs += m.us;
    sumThem += m.them;
    margin += Math.abs(m.us - m.them);
    const b = Math.max(-30, Math.min(30, Math.round((m.us - m.them) / 5) * 5));
    hist.set(b, (hist.get(b) || 0) + 1);
  }
  const ms = Date.now() - t0;
  const f = (v, d = 1) => v.toFixed(d);
  console.log(`${N} maç · güç ${US} / ${THEM} · ppp ${PPP} · ${ms} ms (${f(ms / N, 3)} ms/maç)`);
  console.log(
    `galibiyet %${f((wins / N) * 100)} · ortalama skor ${f(sumUs / N)}-${f(sumThem / N)} · ortalama fark ${f(margin / N)} · uzatma %${f((ot / N) * 100)}`
  );
  console.log("fark dağılımı (5'lik):");
  for (const k of [...hist.keys()].sort((a, b) => a - b))
    console.log(`${String(k).padStart(4)} ${"#".repeat(Math.round((hist.get(k) / N) * 200))}`);
})();
