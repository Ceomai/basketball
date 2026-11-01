// Test senaryoları üretir: node tools/make-scenarios.js   (önce: npm run build:single)
// Gerçek oyun kodu üzerinde otomatik oyuncu güçlü bir kariyeri emekliliğe kadar oynar; ardından gerçek arayüz
// akışıyla (Miras sekmesi, emeklilik ekranı, son bölüm seçimi, oğulla devam) beş kayıt yuvası hazırlanır:
//   1. Emekli, son bölüm seçilmemiş, kulübün %60'ı elinde: üç seçeneği de (başkan dahil) kendin seçersin
//   2. Emekli, kulüp başkanı
//   3. Emekli, antrenör
//   4. Emekli, televizyon yorumcusu
//   5. Efsanenin oğlu: başkan babanın oğluyla yeni kariyer (ilk hafta)
// Çıktı public/scenarios.json; oyunda ?senaryo adresiyle açılan kayıt ekranından yüklenir.
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const ROOT = path.resolve(__dirname, "..");
const URL = "file://" + path.join(ROOT, "dist-single", "index.html");
const INJ = fs.readFileSync(path.join(ROOT, "tests", "sim-player.js"), "utf8");
const TRIES = +process.env.TRIES || 3;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL);
  await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(400);
  await p.evaluate(INJ);
  // en parlak kariyeri seç (NBA ve yüksek miras)
  let best = null;
  for (let i = 0; i < TRIES; i++) {
    await p.evaluate(() =>
      Object.assign(window.__SIM, { buyAll: false, adsPerWeek: 0.5, after: false, heir: false, first: "Kerem", last: "Aydın" })
    );
    const r = await p.evaluate(() => window.__runCareer("strong", "SF"));
    const st = await p.evaluate(() => {
      const G = window.Game;
      return { S: JSON.stringify(G.S), legacy: G.legacyScore(), nba: G.S.hist.some(h => /NBA/.test(h.league)) };
    });
    process.stdout.write(`kariyer ${i + 1}: miras ${st.legacy}, NBA ${st.nba}, ${r.seasons.length} sezon\n`);
    if (!best || st.nba > best.nba || (st.nba === best.nba && st.legacy > best.legacy)) best = st;
  }
  const out = await p.evaluate(base => {
    const G = window.Game,
      log = [];
    window.__SIM = undefined; // gerçek oyun akışı: kayıt, paneller, olaylar
    localStorage.clear();
    const fresh = slot => {
      const s = JSON.parse(base);
      s.saveSlot = slot;
      s.retired = false;
      s.epilogue = null;
      s.epiloguePts = 0;
      G.setS(s);
      return s;
    };
    // Ev → Miras sekmesinden %60 pay (gerekirse eksik para eklenir ve kaydedilir)
    const buyClub = S => {
      let need = 0;
      for (let c = (S.legacy && S.legacy.club) || 0; c < 60; c += 10) need += G.CLUB.cost(c / 10);
      const add = Math.max(0, need - S.money + 1000);
      if (add) S.money += add;
      for (let k = 0; k < 8 && (!S.legacy || S.legacy.club < 60); k++) {
        G.openLoc("ev", "miras");
        const btn = document.querySelector("#lg-share");
        if (!btn) break;
        btn.click();
      }
      G.closeSheet();
      return add;
    };
    const retire = () => G.retireScreen();
    const choose = id => document.querySelector(`[data-ep="${id}"]`).click();
    // 1: seçilmemiş, başkanlık açık
    let S = fresh(1);
    log.push({ slot: 1, added: buyClub(G.S) });
    retire();
    log.push({ slot: 1, options: [...document.querySelectorAll("[data-ep]")].map(e => e.dataset.ep) });
    // 2: başkan
    fresh(2);
    log.push({ slot: 2, added: buyClub(G.S) });
    retire();
    choose("baskan");
    // 3: antrenör, 4: yorumcu
    fresh(3);
    retire();
    choose("koc");
    fresh(4);
    retire();
    choose("tv");
    // 5: başkan babanın oğlu
    G.setS(G.loadSlot(2).S);
    retire();
    document.querySelector("#heir").click();
    log.push({ slot: 5, heir: G.F.heir, toSlot: G.F.slot });
    G.startCareer();
    G.closeSheet();
    G.save();
    const slots = {};
    for (let i = 1; i <= 5; i++) {
      const r = G.loadSlot(i);
      slots[i] = localStorage.getItem(`pota-slot-${i}`);
      log.push({
        slot: i,
        name: r && `${r.S.first} ${r.S.last}`,
        age: r && r.S.age,
        retired: r && r.S.retired,
        epilogue: r && r.S.epilogue,
        club: r && r.S.legacy && r.S.legacy.club,
        legacy: (G.setS(r.S), G.legacyScore()),
        hof: G.hofTier(G.legacyScore())[1]
      });
    }
    return { slots, log };
  }, best.S);
  await b.close();
  for (const l of out.log) console.log(JSON.stringify(l));
  if (errs.length) console.log("sayfa hataları:", errs);
  const missing = Object.entries(out.slots).filter(([, v]) => !v);
  if (missing.length) throw new Error("boş yuva: " + missing.map(m => m[0]).join(","));
  const file = path.join(ROOT, "public", "scenarios.json");
  fs.writeFileSync(file, JSON.stringify({ created: new Date().toISOString().slice(0, 10), slots: out.slots }));
  console.log(file, Math.round(fs.statSync(file).size / 1024) + " KB");
})();
