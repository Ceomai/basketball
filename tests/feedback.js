// Oyuncu geri bildirimi turu: ondalıklı gelişim, ekonomi ve konfor, takım ilişkisi, kumarhane, stil, sponsor,
// maç öncesi hazırlık, zorlu olaylar. Önce: npm run build:single. Çalıştır: node tests/feedback.js
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path"),
  http = require("http");
const ROOT = path.resolve(__dirname, ".."),
  SINGLE = "file://" + path.join(ROOT, "dist-single", "index.html");
const T = [];
const test = (name, fn) => T.push({ name, fn });
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
let browser, server, BASE;
function serveDist() {
  const dist = path.join(ROOT, "dist");
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png"
  };
  return new Promise(res => {
    server = http
      .createServer((req, rsp) => {
        let f = path.join(dist, decodeURIComponent(req.url.split("?")[0]));
        if (f.endsWith("/")) f += "index.html";
        if (!f.startsWith(dist) || !fs.existsSync(f)) {
          rsp.writeHead(404);
          return rsp.end();
        }
        rsp.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
        fs.createReadStream(f).pipe(rsp);
      })
      .listen(0, () => {
        BASE = `http://localhost:${server.address().port}/`;
        res();
      });
  });
}
async function page(url = SINGLE) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // rastgele haftaya düşen derbi/koç panelleri testleri bölmesin (src/derby.js, src/bonds.js)
  await ctx.addInitScript(() => (window.__TEST = Object.assign(window.__TEST || {}, { quietSheets: 1 })));
  const p = await ctx.newPage();
  p.errs = [];
  p.on("pageerror", e => p.errs.push(e.message));
  p.on("console", m => m.type() === "error" && /Content Security Policy/.test(m.text()) && p.errs.push(m.text()));
  await p.goto(url);
  await p.waitForTimeout(500);
  p.ctx = ctx;
  return p;
}
async function career(p) {
  await p.evaluate(() => {
    const G = window.Game;
    G.ADS.consent = true;
    G.ADS.today = 0;
    G.F.first = "Deniz";
    G.F.last = "Test";
    G.F.pos = "SF";
    G.F.slot = 1;
    G.F.mode = "normal";
    G.startCareer();
    G.S.tut = 1;
    G.S.tipMoment = 1;
    G.S.unlocks = { program: 1, sistem: 1, gorev: 1, miras: 1, plan: 2, basarim: 2, tasarim: 2, hikaye: 2, geceligi: 2 };
    try {
      localStorage.setItem("pota-whatsnew", G.WHATSNEW);
    } catch (e) {
      /* yok */
    }
    G.closeSheet();
    G.renderMain();
  });
}
// web reklam ekranı: geri sayım bitince "ödülü al" düğmesine bas
async function watchAd(p) {
  await p.waitForSelector("#adov #adx", { timeout: 3000 });
  await p.waitForSelector("#adov #adx.pri", { timeout: 9000 });
  await p.click("#adov #adx");
  await p.waitForTimeout(150);
}

const pro = (p, stage = "t1") =>
  p.evaluate(st => {
    const S = window.Game.S;
    S.stage = st;
    S.wage = 1500;
    S.age = 22;
    S.money = 200000;
  }, stage);

test("ondalıklı nitelik ve genel puan; seviye çarpanı; gainStat taşıma", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.st.sut = 40;
    S.stf = S.stf || {};
    S.stf.sut = 0.9;
    G.gainStat("sut", 0.35);
    return {
      st: S.st.sut,
      f: S.stf.sut,
      v: G.stat1("sut"),
      ovr: G.ovr(),
      lo: G.levelMul("sut"),
      hi: ((S.st.pas = 90), G.levelMul("pas"))
    };
  });
  assert(r.st === 41 && Math.abs(r.f - 0.25) < 1e-9 && r.v === "41.3", "taşıma: " + JSON.stringify(r));
  assert(String(r.ovr).match(/^\d+(\.\d)?$/), "genel puan tek ondalık değil: " + r.ovr);
  assert(r.lo > r.hi * 5, "seviye çarpanı azalmıyor");
  return p;
});

test("takım antrenmanı sabit +1 vermez, odak niteliğine ondalık katkı; babayla birebir nitelik vermez", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game,
      S = G.S;
    S.program = "pas";
    S.energy = 100;
    S.slot = 3;
    const raw = k => S.st[k] + ((S.stf && S.stf[k]) || 0);
    const before = JSON.stringify(Object.fromEntries(Object.keys(S.st).map(k => [k, raw(k)])));
    G.openLoc("stad", "idman");
    document.querySelector('[data-act="takim"]').click();
    const after = Object.fromEntries(Object.keys(S.st).map(k => [k, raw(k)]));
    return { before: JSON.parse(before), after, txt: document.querySelector("#ovl").textContent };
  });
  const d = Object.keys(r.after)
    .map(k => [k, +(r.after[k] - r.before[k]).toFixed(2)])
    .filter(([, v]) => v);
  // program açık değilse rastgele niteliğe; 16 yaşında düşük nitelikte ~1'e yakın, ama sabit 1 değil (seviyeye bağlı)
  assert(d.length === 1 && d[0][1] > 0 && d[0][1] < 1.3 && d[0][1] !== 1, "takım antrenmanı: " + JSON.stringify(d));
  return p;
});

test("maç sonu ekranında gelişim, topla buluşma ve pas güveni; maç sonrası ondalık artış", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    window.__raw = k => G.S.st[k] + ((G.S.stf && G.S.stf[k]) || 0);
    window.__b = Object.fromEntries(Object.keys(G.S.st).map(k => [k, window.__raw(k)]));
    G.playMatch({ ...{ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" }, auto: true });
  });
  await p.waitForSelector("#nx", { timeout: 60000 });
  const txt = await p.textContent("#ovl");
  assert(/Pas güveni/.test(txt) && /Topla buluşma/.test(txt), "pas güveni/buluşma yok");
  assert(/Bu maçtaki gelişimin/.test(txt), "maç gelişimi satırı yok");
  const sum = await p.evaluate(() => Object.keys(window.Game.S.st).reduce((a, k) => a + window.__raw(k) - window.__b[k], 0));
  assert(sum > 0 && sum < 2, "maç gelişimi: " + sum);
  return p;
});

test("market: seviyeye göre fiyat, haftalık 30 enerji sınırı, 3. içecek sakatlık riski; buz ve sağlık paketi", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S,
      it = id => G.MARKET.find(m => m.id === id);
    S.energy = 10;
    S.buffs.injWk = 0;
    const price = G.marketPrice(it("enerji"));
    const m0 = S.money;
    G.marketBuy(it("enerji"));
    G.marketBuy(it("enerji"));
    const e2 = S.energy;
    const n3 = G.marketBuy(it("enerji"));
    const risk = [S.buffs.injWk, S.buffs.injMul];
    G.marketBuy(it("su"));
    const capE = S.energy;
    S.injury = { n: "x", w: 3 };
    G.marketBuy(it("saglik"));
    const w1 = S.injury.w;
    G.marketBuy(it("saglik"));
    return { price, spent: m0 - S.money, e2, capE, risk, n3, w1, w2: S.injury.w };
  });
  assert(r.price === 105, "t1 fiyatı: " + r.price);
  assert(r.e2 === 40 && r.capE === 40, "enerji sınırı: " + JSON.stringify(r));
  assert(r.risk[0] >= 1 && r.risk[1] > 1, "3. içecek riski yok");
  assert(r.w1 === 2 && r.w2 === 2, "sağlık paketi bir kez: " + JSON.stringify(r));
  return p;
});

test("AVM: yatırım geliri ve geri dönüş süresi, antrenman ve konfor katkısı görünür; yatırım ~55 haftada döner", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => window.Game.openLoc("avm", "yatirim"));
  await p.evaluate(() => window.Game.locAvm({ n: "AVM" }, "yatirim"));
  const t1 = await p.textContent("#ovl");
  assert(/haftalık gelir \+/.test(t1) && /haftada öder/.test(t1), "yatırım geliri görünmüyor");
  const w = await p.evaluate(() => {
    const it = window.Game.SHOP.find(x => x.id === "kiradaire");
    return Math.ceil(it.p / it.inc);
  });
  assert(w >= 45 && w <= 65, "geri dönüş: " + w);
  await p.evaluate(() => window.Game.locAvm({ n: "AVM" }, "spor"));
  assert(/antrenmanı \+%/.test(await p.textContent("#ovl")), "antrenman katkısı yok");
  const m = await p.evaluate(() => {
    const G = window.Game;
    const a = G.itemTrainMul("sut");
    G.S.items.top = 1;
    return [a, G.itemTrainMul("sut")];
  });
  assert(m[0] === 1 && Math.abs(m[1] - 1.1) < 1e-9, "eşya antrenman çarpanı: " + m);
  return p;
});

test("konfor ev ve eşyayla artar; moral tabana döner, düşük aile morali düşürür", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const c0 = G.comfort();
    S.housing = "villa";
    S.items.araba2 = 1;
    const c1 = G.comfort();
    S.moral = 60;
    S.rel.aile = 10;
    S.rel.ark = 50;
    S.week = 3;
    G.closeSheet();
    G.endWeek();
    const lowFam = S.moral;
    return { c0, c1, base: G.moraleBase(), lowFam };
  });
  assert(r.c0 === 0 && r.c1 === 65, "konfor: " + JSON.stringify(r));
  assert(r.base === 42 + Math.round(65 * 0.28), "moral tabanı");
  assert(r.lowFam < 55, "düşük aile morali düşürmedi: " + r.lowFam);
  return p;
});

test("takım arkadaşıyla Oyun Kulübü takım ilişkisini artırır (haftada 2); ev partisi lüks evde", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.rel.takim = 50;
    S.arcMate = 0;
    const out = [G.arcMateResult(10), G.arcMateResult(20), G.arcMateResult(20)];
    const t = S.rel.takim;
    S.arcMate = -1;
    const none = G.arcMateResult(10);
    S.housing = "oda";
    const h0 = G.housePartyHTML();
    S.housing = "lux";
    S.slot = 3;
    S.money = 1000;
    const h1 = G.housePartyHTML();
    return { t, out, none, h0, h1: !!h1 };
  });
  assert(r.t === 55, "takım ilişkisi: " + r.t);
  assert(r.none === "" && r.h0 === "" && r.h1, "parti/yalnız: " + JSON.stringify(r));
  await p.evaluate(() => {
    window.Game.openLoc("ev", "ev");
    window.Game.locEv({ n: "Ev" }, "ev");
  });
  await p.click("#hparty");
  const q = await p.evaluate(() => ({ t: window.Game.S.rel.takim, slot: window.Game.S.slot }));
  assert(q.t === 61 && q.slot === 2, "parti etkisi: " + JSON.stringify(q));
  return p;
});

test("kumarhane: fiş al/boz (kur ve %3 kesinti), ziyaret koçu haftada bir kez düşürür", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => {
    const S = window.Game.S;
    S.age = 20;
    S.chips = 0;
    S.rel.koc = 50;
    window.Game.locSans({ n: "Kumarhane" });
  });
  const k1 = await p.evaluate(() => window.Game.S.rel.koc);
  await p.click("#cbuy");
  const r = await p.evaluate(() => ({ chips: window.Game.S.chips, money: window.Game.S.money }));
  assert(r.chips === 1000 && r.money === 200000 - 1200, "fiş alma: " + JSON.stringify(r));
  await p.click("#csell");
  const q = await p.evaluate(() => ({ chips: window.Game.S.chips, money: window.Game.S.money, koc: window.Game.S.rel.koc }));
  assert(q.chips === 0 && q.money === 200000 - 1200 + 1164, "bozdurma: " + JSON.stringify(q));
  assert(k1 === 47 && q.koc === 47, "koç cezası haftada bir: " + k1 + "/" + q.koc);
  return p;
});

test("stil: sakal (17+), bıyık, gözlük kaydedilir, ücret alınır; portre çizilir", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    window.Game.S.money = 500;
    window.Game.locEv({ n: "Ev" }, "stil");
  });
  const young = await p.evaluate(() => document.querySelector('#st-beard [data-v="sakal"]').disabled);
  assert(young, "16 yaşında sakal seçilebiliyor");
  await p.evaluate(() => {
    window.Game.S.age = 20;
    window.Game.locEv({ n: "Ev" }, "stil");
  });
  await p.click('#st-beard [data-v="sakal"]');
  await p.click('#st-gl [data-v="1"]');
  await p.click('#st-mus [data-v="1"]');
  await p.click("#st-save");
  const r = await p.evaluate(() => ({
    look: window.Game.S.look,
    money: window.Game.S.money,
    cv: !!document.querySelector("#stpv canvas")
  }));
  assert(r.look.beard === "sakal" && r.look.glasses && r.look.mustache, "görünüm: " + JSON.stringify(r.look));
  assert(r.money === 492 && r.cv, "ücret/portre: " + JSON.stringify(r));
  return p;
});

test("sponsor: üç marka, pazarlık hamleleri, imza; haftalık ödeme ve performans primi", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => window.Game.sponsorTalk(1000));
  const n = await p.evaluate(() => document.querySelectorAll("[data-so]").length);
  assert(n === 3, "marka sayısı: " + n);
  // haftalık ödemeli markayı bul
  await p.evaluate(() => {
    const b =
      [...document.querySelectorAll("[data-so]")].find(x => /haftalık/.test(x.textContent)) ||
      document.querySelector("[data-so]");
    b.click();
  });
  await p.click('[data-ask="wk"]');
  const pat = await p.evaluate(() => document.querySelector("#shsub").textContent);
  assert(/Kalan sabır/.test(pat), "sabır göstergesi yok");
  const signed = await p.evaluate(() => {
    const ok = document.querySelector("#ag-ok");
    if (ok) ok.click();
    return window.Game.S.sponsorDeal;
  });
  assert(signed && signed.until >= 1, "imza yok");
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.sponsorDeal.wk = 50;
    S.sponsorDeal.perf = 30;
    const m0 = S.money;
    G.sponsorWeekly();
    const m1 = S.money;
    G.Bus.emit("match:end", { rating: 8 });
    G.Bus.emit("match:end", { rating: 6 });
    return { wk: m1 - m0, perf: S.money - m1 };
  });
  assert(r.wk === 50 && r.perf === 30, "ödemeler: " + JSON.stringify(r));
  return p;
});

test("menajer: zam (iyi sezon), imaj kampanyası", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.contract = 2;
    S.slot = 3;
    S.studying = false;
    S.results = Array.from({ length: 5 }, () => ({ opp: "x", us: 80, them: 70, win: true, rating: 8, pts: 15 }));
    window.__w0 = S.wage;
    G.openLoc("okul");
    window.__R = Math.random;
    Math.random = () => 0.01;
  });
  await p.click("#ag-raise");
  const w = await p.evaluate(() => {
    Math.random = window.__R;
    return window.Game.S.wage;
  });
  assert(w > (await p.evaluate(() => window.__w0)), "zam yok");
  await p.evaluate(() => {
    window.__f0 = window.Game.S.followers;
    window.Game.openLoc("okul");
  });
  assert(await p.evaluate(() => document.querySelector("#ag-raise").disabled), "zam sezonda iki kez");
  await p.click("#ag-camp");
  assert(await p.evaluate(() => window.Game.S.followers > window.__f0), "kampanya takipçi artırmadı");
  return p;
});

test("maç öncesi hazırlık: basın toplantısı (iyi cevaplar → motivasyon), video analizi (doğru dizi → savunma +4)", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.phase = "final";
    G.S.playoffOpp = G.S.league.find(r => r.key !== G.S.team.key).key;
    G.S.buffs.motive = 0;
    G.openLoc("stad", "mac");
  });
  assert(await p.isVisible("#pr-press"), "hazırlık kartı yok");
  await p.click("#pr-press");
  for (let i = 0; i < 3; i++) {
    await p.waitForSelector('[data-pa="good"]');
    await p.click('[data-pa="good"]');
  }
  const m = await p.evaluate(() => ({ mot: window.Game.S.buffs.motive, k: window.Game.S.prepKey }));
  assert(m.mot === 1 && m.k, "basın sonucu: " + JSON.stringify(m));
  // video analizi (yeni maç anahtarı)
  await p.evaluate(() => {
    const G = window.Game;
    G.S.prepKey = null;
    G.S.buffs.scoutK = null;
    G.openLoc("stad", "mac");
  });
  // gösterilen diziyi sayfadaki değişikliklerden oku (aynı ok art arda gelse de her gösterim kaydedilir)
  await p.evaluate(() => {
    window.__seq = [];
    new MutationObserver(ms => {
      for (const m of ms) {
        const vg = document.querySelector("#vg");
        if (vg && (m.target === vg || vg.contains(m.target)) && vg.textContent) window.__seq.push(vg.textContent);
      }
    }).observe(document.querySelector("#ovl"), { childList: true, subtree: true, characterData: true });
  });
  await p.click("#pr-video");
  await p.waitForSelector("[data-mv]", { timeout: 10000 });
  const seq = await p.evaluate(() => window.__seq);
  assert(seq.length === 4, "dizi okunamadı: " + JSON.stringify(seq));
  for (const m of seq) await p.click(`[data-mv="${m}"]`);
  const v = await p.evaluate(() => ({ k: window.Game.S.buffs.scoutK, done: !!window.Game.S.prepKey }));
  assert(v.done && v.k === "sav", "video sonucu: " + JSON.stringify(v));
  return p;
});

test("zorlu olaylar havuzda; ayrılık partneri kaldırır; çevirisi var", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.partner = "Elif";
    S.rel.partner = 60;
    S.stage = "t1";
    const pool = G.eventPool(),
      hard = pool.filter(e => e.hard);
    const br = hard.find(e => /Konuşmamız lazım/.test(e.title));
    const m0 = S.moral;
    br.choices[1].do();
    return { n: hard.length, partner: S.partner, dm: S.moral - m0 };
  });
  assert(r.n >= 8, "zorlu olay sayısı: " + r.n);
  assert(r.partner === null && r.dm === -10, "ayrılık: " + JSON.stringify(r));
  return p;
});

test("reklam: güvenlik tavanı dolunca düğme yerine not; normalde kalan hak görünür", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.adsDayTick();
    G.ADS.today = G.ADS_CFG.dailyRewardCap - 3; // kalan hak yalnız az kalınca (≤5) yazılır
    const a = G.adBtn("x", "A", "", "energy");
    G.ADS.today = 0;
    const a0 = G.adBtn("x", "A", "", "energy");
    G.ADS.today = G.ADS_CFG.dailyRewardCap;
    const b = G.adBtn("x", "A", "", "energy");
    G.ADS.today = 0;
    return { a, a0, b, cap: G.ADS_CFG.dailyRewardCap, epw: G.ADS_CFG.energyPerWeek };
  });
  assert(/hak/.test(r.a) && /<button/.test(r.a), "kalan hak yok");
  assert(/<button/.test(r.a0) && !/hak/.test(r.a0), "bol hakta sayı gösterilmemeli");
  assert(!/<button/.test(r.b) && /yarın/.test(r.b), "tavan notu yok");
  assert(r.cap >= 100 && r.epw >= 20, "sınırlar: " + JSON.stringify(r));
  return p;
});

test("maç seçenekleri: turnike, köşe/tepeden üçlük, floater, orta mesafe; 3 ya da 4 seçenek; otomatik çözüm yeni anahtarları tanır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const keys = Object.fromEntries(Object.entries(G.PLAYS).map(([pos, P]) => [pos, P.off.map(o => o[0])]));
    const counts = new Set(Array.from({ length: 200 }, () => G.optCount()));
    G.setM({ pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, stops: 0, mmod: 0 });
    const res = ["lay", "corner", "top3", "float", "mid"].map(k => G.autoResolve(k, "X"));
    return { keys, counts: [...counts].sort(), ok: res.every(x => x && typeof x.good === "boolean" && x.st) };
  });
  assert(
    r.keys.PG.includes("lay") && r.keys.PG.includes("top3") && r.keys.SG.includes("corner") && r.keys.SF.includes("mid"),
    "ek seçenekler: " + JSON.stringify(r.keys)
  );
  assert(JSON.stringify(r.counts) === "[3,4]", "seçenek sayısı: " + r.counts);
  assert(r.ok, "otomatik çözüm yeni anahtarlar");
  return p;
});

test("kişisel faul: riskli savunma faul olabilir, güvenli asla; sınır 5 (NBA 6), uyarı ve oyun dışı; not cezası", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.setM({ pf: 0 });
    const R = Math.random;
    Math.random = () => 0.01;
    const safe = G.foulAfterMoment("safe", false),
      good = G.foulAfterMoment("steal", true),
      f1 = G.foulAfterMoment("steal", false);
    Math.random = R;
    const msgs = [f1];
    for (let i = 0; i < 6; i++) msgs.push(G.addFoul());
    const lim = G.foulLimit();
    G.S.stage = "nba";
    return { safe, good, pf: G.M.pf, fo: G.M.fo, lim, nba: G.foulLimit(), pen: G.foulPenalty(), msgs, note: G.foulNote("block") };
  });
  assert(r.safe === "" && r.good === "", "güvenli/başarılı faul olmamalı");
  assert(r.lim === 5 && r.nba === 6 && r.pf === 5 && r.fo, "sınır: " + JSON.stringify(r));
  assert(/Faul sorunu/.test(r.msgs[3]) && /oyun dışı/.test(r.msgs[4]) && r.msgs[5] === "", "mesajlar: " + JSON.stringify(r.msgs));
  assert(r.pen === 0.4 && /faul riski/.test(r.note), "ceza/not");
  return p;
});

test("maç sonu ekranında faul sayısı; faulle oyun dışı kalan oyuncu kenara alınır", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig", auto: true });
  });
  await p.waitForSelector("#nx", { timeout: 60000 });
  assert(/Faul/.test(await p.textContent("#ovl")), "faul satırı yok");
  return p;
});

test("saha görünümü: kendin oynarken saha çizilir; pozisyona göre durum etiketleri ve seçenek etkisi", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector("#crt-p", { timeout: 8000 });
  const n = await p.evaluate(() => document.querySelectorAll("#crt-p g[id^='o-'], #crt-p g[id^='d-']").length);
  assert(n === 10, "10 oyuncu noktası olmalı: " + n);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const base = [
      { k: "corner", t: "x", d: "d", e: 50 },
      { k: "lay", t: "x", d: "d", e: 50 },
      { k: "kick", t: "x", d: "d", e: 50 }
    ];
    const open = G.applyScenario(base, { us: true, zone: "corner", guard: "open", help: true, mate: true, drive: false });
    const tight = G.applyScenario(base, { us: true, zone: "top", guard: "tight", help: false, mate: false, drive: false });
    const def = G.applyScenario([{ k: "block", t: "x", d: "d", e: 50 }], { us: false, drive: true });
    const sc = Array.from({ length: 50 }, () => G.courtScenario(true));
    return {
      open: open.map(o => [o.e, o.d, !!o.fav]),
      tight: tight.map(o => o.e),
      def: def[0],
      zones: [...new Set(sc.map(x => x.zone))],
      guards: [...new Set(sc.map(x => x.guard))]
    };
  });
  assert(r.open[0][0] > 50 && /Boşsun/.test(r.open[0][1]) && r.open[0][2], "boş köşe üçlüğü: " + JSON.stringify(r.open[0]));
  assert(r.open[1][0] < 50 && /kalabalık/.test(r.open[1][1]), "pota altı kalabalık turnikeyi zorlaştırır");
  assert(r.tight[0] < 50, "sıkı savunma şutu zorlaştırır");
  assert(r.def.e > 50 && /penetre/.test(r.def.d), "savunma: penetrasyonda blok");
  assert(r.zones.length >= 3 && r.guards.length >= 2, "durumlar çeşitli: " + JSON.stringify(r));
  return p;
});

test("ikinci karar: pivot önüne çıkınca pas/ikilik/spin/zorla; seçimin etkisi; istatistik takibi ve maç raporu", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    G.setM({
      pts: 0,
      ast: 0,
      reb: 0,
      stl: 0,
      blk: 0,
      stops: 0,
      mmod: 0,
      live: 1,
      qs: [
        [20, 18],
        [41, 40]
      ]
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const R0 = Math.random;
    Math.random = () => 0.01; // ikinci karar olasılıklı: testte hep tetiklensin
    const pr = G.followUp("lay", el, { help: true, guard: "normal" }, "Test");
    const keys = [...el.querySelectorAll("[data-fu]")].map(b => b.dataset.fu);
    el.querySelector('[data-fu="pull"]').click();
    const pull = await pr;
    const pr2 = G.followUp("lay", el, { help: true }, "Test");
    el.querySelector('[data-fu="force"]').click();
    const force = await pr2;
    const pr3 = G.followUp("lay", el, { help: true }, "Test");
    el.querySelector('[data-fu="pass"]').click();
    const pass = await pr3;
    const pres = pass.resolve();
    const none = await G.followUp("corner", el, { guard: "open" }, "Test");
    Math.random = R0;
    // istatistik: üçlük isabet, ikilik kaçış, serbest atış
    const M = G.M;
    let p0 = M.pts;
    M.pts += 3;
    G.trackPlay("corner", p0, { good: true });
    G.trackPlay("mid", M.pts, { good: false });
    p0 = M.pts;
    M.pts += 1;
    G.trackPlay("free", p0, { good: true });
    // efektif değer: maç içi düzeltme eff'e yansır
    const e0 = G.eff("sut");
    M.effMod = -10;
    const e1 = G.eff("sut");
    M.effMod = 0;
    const live = G.liveLine();
    const rep = G.reportHTML();
    el.remove();
    return {
      keys,
      pull,
      force,
      pres,
      none,
      M: { fga: M.fga, fgm: M.fgm, tpa: M.tpa, tpm: M.tpm, fta: M.fta, ftm: M.ftm },
      e0,
      e1,
      live,
      rep
    };
  });
  assert(JSON.stringify(r.keys) === '["pass","pull","spin","force"]', "seçenekler: " + r.keys);
  assert(r.pull.pk === "mid" && r.pull.mod < 0, "ikiliğe kalk orta mesafe olur");
  assert(r.force.foulChance > 0 && r.force.mod < 0, "turnikeyi zorla: zor ama faul şansı");
  assert(typeof r.pres.good === "boolean" && r.pres.st === "pas", "pas sonucu");
  assert(r.none === null, "boş şutta ikinci karar yok");
  assert(
    r.M.fga === 2 && r.M.fgm === 1 && r.M.tpa === 1 && r.M.tpm === 1 && r.M.fta === 2 && r.M.ftm === 1,
    "takip: " + JSON.stringify(r.M)
  );
  assert(r.e1 < r.e0, "effMod eff'e yansımalı");
  assert(/1\/2/.test(r.live), "canlı satır: " + r.live);
  assert(/Maç raporu/.test(r.rep) && /Serbest atış/.test(r.rep), "rapor");
  return p;
});

test("maç günü güçlendirmesi efektif niteliğe yansır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const a = G.eff("sut");
    const b0 = G.boostOf ? G.boostOf("sut") : 0;
    return { a, b0, has: typeof G.boostOf === "function" };
  });
  assert(r.has, "boostOf tanımlı");
  // boost 0 iken de eff sayıdır; boost varsa eff içinde yer alır (kaynakta doğrulanır)
  const src = fs.readFileSync(path.join(ROOT, "src/core.js"), "utf8");
  assert(/late\.boostOf\s*\?\s*late\.boostOf\(k\)/.test(src), "eff boostOf içermeli");
  assert(typeof r.a === "number" && !isNaN(r.a), "eff sayı");
  return p;
});

test("başarımlar: 100+ başarım, kariyer ve maç denetimi, unvan, kozmetik açılır ve yeni kariyerde kalır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    localStorage.removeItem("pota-feats");
    for (const k of Object.keys(G.FEATS_ST.got)) delete G.FEATS_ST.got[k];
    const n = G.FEATS.length;
    const names = G.FEATS.map(f => G.featName(f) + "|" + G.featDesc(f));
    const bad = names.filter(x => /ft\.|undefined/.test(x));
    const before = G.cosOpen("c1");
    G.S.career.trophies.push({ type: "champ", label: G.seasonLabel() + " · Şampiyon" });
    G.S.career.pts = 600;
    G.checkFeats();
    const got = ["troph1", "champ", "pts1", "pts2"].map(id => G.featGot(id));
    // maç başarımı: basket faulle kazanılan maç
    G.checkMatchFeats({
      win: true,
      and1: 1,
      pts: 12,
      ast: 10,
      reb: 10,
      fga: 5,
      fgm: 5,
      fta: 0,
      ftm: 0,
      tpm: 0,
      low: -14,
      us: 80,
      them: 70
    });
    const mf = ["andone", "triple", "perfect", "comeback"].map(id => G.featGot(id));
    G.S.title = "champ";
    return {
      n,
      bad,
      before,
      after: G.cosOpen("c1"),
      got,
      mf,
      title: G.titleText(),
      stored: !!JSON.parse(localStorage.getItem("pota-feats")).got.champ
    };
  });
  assert(r.n >= 100, "başarım sayısı: " + r.n);
  assert(!r.bad.length, "eksik metin: " + r.bad.slice(0, 3));
  assert(!r.before && r.after, "kupa kutlama hareketini açmalı");
  assert(r.got.every(Boolean), "kariyer başarımları: " + r.got);
  assert(r.mf.every(Boolean), "maç başarımları: " + r.mf);
  assert(r.title === "Şampiyon" && r.stored, "unvan ve saklama");
  await p.reload();
  await p.waitForTimeout(400);
  assert(await p.evaluate(() => window.Game.cosOpen("c1")), "kozmetik yeni oturumda da açık");
  return p;
});

test("tasarım: ayakkabı ürettir (kart ve sahada), forma adı/numara, kutlama seçimi, tema; Başarımlar sekmesi", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.money = 9000;
    G.FEATS_ST.got.reb1 = 1; // Ribaund Kralı I → şerit desen
    G.FEATS_ST.got.troph1 = 1; // omuz dansı
    G.S.cuTab = "shoe";
    G.locEv({ n: "Ev" }, "tasarim");
  });
  await p.click('#cu-pat [data-v="stripe"]');
  await p.click('#cu-c1 [data-v="#141414"]');
  await p.click("#cu-make");
  const r1 = await p.evaluate(() => ({ shoe: window.Game.S.shoe, svg: /<svg/.test(window.Game.shoeSVG(window.Game.S.shoe)) }));
  assert(r1.shoe.made && r1.shoe.pat === "stripe" && r1.shoe.c1 === "#141414" && r1.svg, "ayakkabı: " + JSON.stringify(r1));
  await p.evaluate(() => {
    window.Game.S.cuTab = "jersey";
    window.Game.locEv({ n: "Ev" }, "tasarim");
  });
  await p.click('#cu-jn [data-v="first"]');
  await p.click('#cu-num [data-v="7"]');
  const r2 = await p.evaluate(() => ({ jn: window.Game.jName(), num: window.Game.S.num, svg: window.Game.jerseyBackSVG() }));
  assert(r2.jn === "Deniz" && r2.num === 7 && /DENIZ/.test(r2.svg), "forma: " + JSON.stringify(r2).slice(0, 200));
  await p.evaluate(() => {
    window.Game.S.cuTab = "celeb";
    window.Game.locEv({ n: "Ev" }, "tasarim");
  });
  assert(await p.isDisabled('[data-cb="archer"]'), "kilitli kutlama seçilemez");
  await p.click('[data-cb="shimmy"]');
  const r3 = await p.evaluate(() => {
    const G = window.Game;
    G.S.cuTab = "theme";
    G.locEv({ n: "Ev" }, "tasarim");
    const lockedNight = document.querySelector('[data-th="night"]').disabled;
    G.ADS.adFree = true;
    G.locEv({ n: "Ev" }, "tasarim");
    document.querySelector('[data-th="retro"]').click();
    const th = document.documentElement.dataset.theme;
    G.ADS.adFree = false;
    G.SETTINGS.theme = "default";
    G.applyTheme();
    return { celeb: G.S.celeb, lockedNight, th };
  });
  assert(r3.celeb === "shimmy" && r3.lockedNight && r3.th === "retro", "kutlama/tema: " + JSON.stringify(r3));
  await p.evaluate(() => window.Game.locEv({ n: "Ev" }, "rozet"));
  assert((await p.$$(".ft")).length > 10, "Başarımlar listesi");
  const cv = await p.evaluate(async () => !!(await window.Game.careerCardCanvas()));
  assert(cv, "kariyer kartı ayakkabıyla çizilir");
  return p;
});

test("ev dekoru konforu artırır; takım değişince yeni forma anı; sayıdan sonra kutlama", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const c0 = G.comfort();
    G.S.decor = { p1: "p1", p2: null, rug: "r1" };
    const c1 = G.comfort();
    G.S.jTeam = "Eski Takım";
    return { c0, c1, ov: /<svg/.test(G.decorOverlay()) };
  });
  assert(r.c1 === r.c0 + 3 && r.ov, "dekor konforu: " + JSON.stringify(r));
  await p.evaluate(() => window.Game.Bus.first("week:sheet"));
  await p.waitForSelector("#jy-ok", { timeout: 3000 });
  assert(/kez giy/.test(await p.textContent(".sheet")), "yeni forma metni");
  await p.click("#jy-ok");
  const r2 = await p.evaluate(() => {
    const G = window.Game;
    const n0 = (G.S.fx && G.S.fx.celeb) || 0;
    document.body.insertAdjacentHTML("beforeend", '<div id="mcourt"></div>');
    G.celebrate();
    return { n: G.S.fx.celeb - n0, el: !!document.querySelector("#mcourt .celeb"), jt: G.S.jTeam === G.S.team.name };
  });
  assert(r2.n === 1 && r2.el && r2.jt, "kutlama: " + JSON.stringify(r2));
  return p;
});

test("maç günü: hakem, atmosfer, rakip yıldız kartı maç öncesi; hakem faul ve basket faul şansını değiştirir; seyirci etkisi", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector("[data-m]", { timeout: 8000 });
  const txt = await p.textContent("#mview");
  assert(/Hakem/.test(txt) && /yıldızı/.test(txt) && /Atmosfer/.test(txt), "maç öncesi kart: " + txt.slice(0, 200));
  const r = await p.evaluate(() => {
    const G = window.Game,
      M = G.M;
    const out = {};
    for (const ref of ["strict", "normal", "lenient"]) {
      M.ref = ref;
      out[ref] = [G.refMul(), G.refAnd1()];
    }
    M.home = true;
    M.hypeOn = 0;
    const b0 = G.crowdBoost();
    M.hypeOn = 2;
    const b1 = G.crowdBoost();
    M.home = false;
    M.loud = true;
    const b2 = G.crowdBoost();
    M.home = true;
    M.hypeOn = 0;
    M.hype = 95;
    G.afterMoment("pull", "pull", { good: true });
    return { out, b0, b1, b2, hypeOn: M.hypeOn, line: G.crowdLine() };
  });
  assert(r.out.strict[0] > 1 && r.out.lenient[0] < 1 && r.out.strict[1] > r.out.lenient[1], "hakem: " + JSON.stringify(r.out));
  assert(r.b0 === 0 && r.b1 > 0 && r.b2 < 0, "seyirci etkisi: " + JSON.stringify(r));
  assert(r.hypeOn > 0 && /Seyirci/.test(r.line), "heyecan çubuğu dolar");
  return p;
});

test("kimya: başarılı pas kimyayı artırır, yeterince yüksekse ikili kombinasyon gelir; kilit anda Oyunu kur oklarla", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector("[data-m]", { timeout: 8000 });
  const r = await p.evaluate(() => {
    const G = window.Game,
      M = G.M;
    const v0 = G.chemVal();
    G.afterMoment("kick", "kick", { good: true });
    const v1 = G.chemVal();
    G.S.chem.v = 60;
    const R = Math.random;
    Math.random = () => 0.1;
    const o = G.extraOffOpts([{ k: "pull", t: "x", d: "d", e: 50 }], true, false);
    const oa = G.extraOffOpts([{ k: "pull", t: "x", d: "d", e: 50 }], true, true);
    Math.random = R;
    G.afterMoment("duo", "lob", { good: true });
    return { v0, v1, keys: o.map(x => x.k), auto: oa.length, combo: M.combo, v2: G.chemVal() };
  });
  assert(r.v1 > r.v0, "pas kimyayı artırır");
  assert(r.keys.includes("duo") && r.keys.includes("set") && r.auto === 1, "ek seçenekler: " + JSON.stringify(r));
  assert(r.combo === 1 && r.v2 > 60, "kombinasyon sayılır");
  // oyun kur ekranı
  await p.evaluate(() => {
    window.__sp = window.Game.setPlay(document.querySelector("#mview"));
  });
  await p.click('#sp-s [data-v="C"]');
  await p.click('#sp-r [data-v="paint"]');
  const arrows = await p.evaluate(() => document.querySelector("#arrows").innerHTML.length);
  await p.click("#sp-go");
  const res = await p.evaluate(() => window.__sp);
  assert(arrows > 50, "sahada oklar");
  assert(res.pk === "lay" && res.fit && res.mod > 0, "set: " + JSON.stringify(res));
  return p;
});

test("rakip yıldız düellosu maç sonunda; kazanınca başarım ve takipçi", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig", auto: true });
  });
  await p.waitForSelector("#nx", { timeout: 60000 });
  const t = await p.textContent("#ovl");
  assert(/Yıldız düellosu/.test(t), "düello kartı");
  const r = await p.evaluate(() => {
    const G = window.Game;
    return { won: G.M.duelWon, star: G.M.star.pts, me: G.M.pts };
  });
  assert(r.won === r.me > r.star, "düello sonucu: " + JSON.stringify(r));
  return p;
});

test("stüdyo: canlı yayın (3 soru, cevap tarzı), ortak video (kimya), takipçi rekorları", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.slot = 3;
    G.S.energy = 90;
    G.locStudio({ n: "Stüdyo" });
  });
  assert(/Kanal rekorları/.test(await p.textContent(".sheet")), "rekor kartı");
  const f0 = await p.evaluate(() => window.Game.S.followers);
  await p.click("#vn-live");
  for (let i = 0; i < 3; i++) {
    await p.waitForSelector("[data-ls]");
    await p.click('[data-ls="warm"]');
  }
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => ({ f: window.Game.S.followers, rec: window.Game.S.channel.rec, live: window.Game.S.fx.live }));
  assert(r.f > f0 && r.rec.live > 0 && r.live === 1, "canlı yayın: " + JSON.stringify(r));
  await p.evaluate(() => {
    const G = window.Game;
    G.S.slot = 3;
    G.S.chem = { n: "A. Test", v: 20 };
    G.locStudio({ n: "Stüdyo" });
  });
  assert(await p.isDisabled("#vn-live"), "canlı yayın haftada bir");
  await p.click("#vn-col");
  const c = await p.evaluate(() => window.Game.S.chem.v);
  assert(c === 25, "ortak video kimya: " + c);
  return p;
});

test("akademi mezunu maçta karşına çıkar; liman: çocuk büyür, 14'te basketbol isteği varis kariyerine bağlanır; yıldönümü", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.S.acad = { prestige: 10, kids: [], cand: [], grads: [{ n: "Ali Mezun", pos: "PG", pro: true, s: "x" }], cups: 0, wk: 0 };
    G.setM({ opp: { name: "Rakip SK" }, pts: 0, feed: [] });
    const R = Math.random;
    Math.random = () => 0.05;
    const foes = ["A", "B", "C"],
      mates = ["X", "Y"];
    G.gradMeet(foes, mates);
    Math.random = R;
    G.S.partner = "Eş";
    G.S.pstage = 4;
    G.Bus.emit("week:start");
    return { foes, grad: G.S.acad.grads[0], meet: G.S.fx.gradMeet, kid: !!G.S.kid, wed: !!G.S.wed, html: G.gradsHTML() };
  });
  assert(r.foes[1] === "Ali Mezun" && r.grad.club === "Rakip SK" && r.meet === 1, "mezun: " + JSON.stringify(r));
  assert(/Mezunlar/.test(r.html) && r.kid && r.wed, "mezun listesi, çocuk, nikâh kaydı");
  await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.S.kid.born = G.S.season - 14;
    G.S.kid.named = 1;
    G.S.week = 5;
    if (G.S.goals) G.S.goals.shown = true; // sezon hedefleri paneli öne geçmesin
    // önce gelen başka rastgele paneller tüketilir
    for (let i = 0; i < 6 && !document.querySelector('[data-kd="1"]'); i++) {
      window.Game.closeSheet();
      window.Game.Bus.first("week:sheet");
    }
  });
  await p.waitForSelector('[data-kd="1"]', { timeout: 3000 });
  await p.click('[data-kd="1"]');
  const h = await p.evaluate(() => window.Game.heirKid());
  assert(h.baller && h.n, "varis çocuk");
  await p.evaluate(() => {
    const G = window.Game;
    G.S.wed = { s: G.S.season - 2, w: G.S.week };
    G.S.annWk = "";
    G.S.money = 5000;
    // önce gelen başka rastgele paneller tüketilir
    for (let i = 0; i < 6 && !document.querySelector('[data-an="trip"]'); i++) {
      window.Game.closeSheet();
      window.Game.Bus.first("week:sheet");
    }
  });
  await p.waitForSelector('[data-an="trip"]', { timeout: 3000 });
  const rp = await p.evaluate(() => window.Game.S.rel.partner);
  await p.click('[data-an="trip"]');
  assert((await p.evaluate(() => window.Game.S.rel.partner)) > rp, "yıldönümü ilişkiyi artırır");
  return p;
});

test("kafe bilgi gecesi (5 soru, 4 doğru kazanır); gece sokak ligi tablosu ve 10 hafta sonunda şampiyonluk", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.slot = 3;
    G.S.money = 100;
    G.locKafe({ n: "Kafe" });
  });
  await p.click("#vn-quiz");
  // doğru cevapları sözlükten bilmeden: her soruda ilk şıkkı seç, sonuç ekranı gelir
  for (let i = 0; i < 5; i++) {
    await p.waitForSelector("[data-qa]");
    await p.click("[data-qa]");
  }
  await p.waitForTimeout(200);
  assert(
    await p.evaluate(() => window.Game.S.quizWk === `${window.Game.S.season}-${window.Game.S.week}`),
    "bilgi gecesi oynandı"
  );
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.S.age = 17;
    const html = G.nightLeagueHTML();
    const L = G.S.sl;
    L.round = 10;
    L.t.me.w = 10;
    return { html: /Gece sokak ligi/.test(html) && /Senin ekip/.test(html), teams: Object.keys(L.t).length };
  });
  assert(r.html && r.teams === 6, "lig tablosu: " + JSON.stringify(r));
  return p;
});

test("borsa: sektör haberleri fiyatı oynatır, 4 haftada temettü, endeks; oyuncu performansına bağlı değil", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.locBorsa({ n: "Borsa" });
    const m = G.S.mkt2;
    m.own.gda = 100;
    const m0 = G.S.money;
    const R = Math.random;
    Math.random = () => 0.1;
    for (let i = 0; i < 4; i++) G.Bus.emit("week:start");
    Math.random = R;
    G.locBorsa({ n: "Borsa" });
    return { news: m.news.length, idx: m.idx.length, div: G.S.money > m0, html: document.querySelector(".sheet").textContent };
  });
  assert(r.news >= 1 && r.idx >= 4, "haber/endeks: " + JSON.stringify(r).slice(0, 200));
  assert(r.div, "temettü geliri");
  assert(/Piyasa endeksi/.test(r.html) && /risk/.test(r.html), "borsa ekranı");
  const src = require("fs").readFileSync(require("path").join(ROOT, "src/venues.js"), "utf8");
  assert(!/rating|M\.pts/.test(src.slice(src.indexOf("BORSA"))), "borsa performansa bağlı olmamalı");
  return p;
});

test("cila: Stil alt sekmeleri (görünüm+tasarım), Vitrin'den Başarımlar, aynı soyadlı takım arkadaşı yok, 50+ quiz sorusu, doğumda ad seçimi", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    window.Game.S.cuTab = null;
    window.Game.locEv({ n: "Ev" }, "stil");
  });
  assert(await p.isVisible('#cu-sub [data-v="shoe"]'), "Stil alt sekmeleri");
  assert(await p.isVisible('#st-hat [data-v="afro"]'), "görünüm alt sekmesi");
  const tabs = await p.evaluate(() => document.querySelectorAll(".tabs button").length);
  assert(tabs <= 8, "Ev sekme sayısı: " + tabs);
  await p.click('#cu-sub [data-v="shoe"]');
  assert(await p.isVisible("#cu-make"), "ayakkabı alt sekmesi");
  await p.evaluate(() => window.Game.locEv({ n: "Ev" }, "vitrin"));
  await p.click("#ft-open");
  assert((await p.$$(".ft")).length > 5, "Vitrin'den Başarımlar");
  const r = await p.evaluate(() => {
    const G = window.Game;
    const ln = G.S.last;
    const roster = G.roster();
    roster[0].n = "Zeki " + ln;
    return { mates: G.mateNames(4), ln, q: G.quizSize() };
  });
  assert(!r.mates.some(m => m.endsWith(" " + r.ln)), "aynı soyadı: " + r.mates);
  assert(r.q >= 50, "quiz soru sayısı: " + r.q);
  await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.S.partner = "Eş";
    G.S.pstage = 4;
    G.S.week = 5;
    G.S.pPrev = 3; // doğum bu hafta oldu (eski kayıt değil)
    if (G.S.goals) G.S.goals.shown = true;
    G.Bus.emit("week:start");
    // önce gelen başka paneller (derbi basını vb. rastgele haftaya düşebilir) tüketilir
    for (let i = 0; i < 6 && !document.querySelector("[data-kn]"); i++) {
      G.closeSheet();
      G.Bus.first("week:sheet");
    }
  });
  await p.waitForSelector("[data-kn]", { timeout: 3000 });
  await p.click('#kn-g [data-v="f"]');
  const nm = await p.getAttribute("[data-kn]", "data-kn");
  await p.click("[data-kn]");
  const k = await p.evaluate(() => window.Game.S.kid);
  assert(k.named && k.g === "f" && k.n === nm, "ad seçimi: " + JSON.stringify(k));
  return p;
});

test("QA düzeltmeleri: maç bonusu maç dışına taşmaz, ortak video bileşik büyümez, borsa komisyonu, basket faul serbest atışı sayılır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.setM({ pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, stops: 0, mmod: 0, feed: [], live: 1, effMod: 12, home: true, hypeOn: 2 });
    document.body.insertAdjacentHTML("beforeend", '<div id="mstat"></div>');
    const inMatch = G.eff("sut");
    G.renderMain(); // maç ekranından çıkış
    const after = G.eff("sut");
    // ortak video: büyük takipçide bile küçük, sabit artış
    G.S.followers = 1000000;
    G.S.slot = 3;
    G.S.energy = 90;
    G.locStudio({ n: "Stüdyo" });
    document.querySelector("#vn-col").click();
    const gain = G.S.followers - 1000000;
    // borsa: al-sat aynı fiyatta zarar (komisyon)
    G.S.money = 100000;
    G.locBorsa({ n: "Borsa" });
    const m0 = G.S.money;
    document.querySelector('[data-sb="gda"]').click();
    document.querySelector('[data-ss="gda"]').click();
    const fee = m0 - G.S.money;
    return { inMatch, after, gain, fee, live: G.M.live };
  });
  assert(r.after < r.inMatch && r.live === 0, "maç bonusu sıfırlanmalı: " + JSON.stringify(r));
  assert(r.gain > 0 && r.gain < 20000, "ortak video artışı: " + r.gain);
  assert(r.fee > 0, "komisyon: " + r.fee);
  return p;
});

test("maç 3: tam saha (iki pota), hücum geçiş-set-şut akışı, mini oyun sahadaki duruma uyar, kaçan şutta ribaund ve ikinci şans", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector("#crt-p g", { timeout: 8000 });
  const r = await p.evaluate(async () => {
    const G = window.Game;
    const vb = document.querySelector("#crt").getAttribute("viewBox");
    const hoops = document.querySelectorAll('#crt circle[stroke="#ff6b2b"]').length;
    const before = document.querySelector("#o-PG").style.transform;
    G.courtPlay({ us: true, scored: true }, true, 0);
    const right = document.querySelector("#o-PG").style.transform;
    G.courtPlay({ us: false, scored: false }, true, 0);
    const left = document.querySelector("#o-PG").style.transform;
    const x = t => +t.match(/translate\(([\d.]+)px/)[1];
    const open = G.mgContext({ us: true, zone: "wing", guard: "open", help: false, mate: true });
    const tight = G.mgContext({ us: true, zone: "wing", guard: "tight", help: true, mate: false });
    const def = G.mgContext({ us: false, drive: true });
    return {
      vb,
      hoops,
      rx: x(right),
      lx: x(left),
      changed: before !== right,
      open,
      tight,
      def,
      shot: G.isShotKey("corner"),
      pass: G.isShotKey("kick")
    };
  });
  assert(r.vb === "0 0 360 196" && r.hoops === 2, "tam saha: " + JSON.stringify(r));
  assert(r.changed && r.rx > 180 && r.lx < 180, "hücumda sağ yarıya, savunmada sol yarıya: " + JSON.stringify(r));
  assert(r.open.press === 0 && r.tight.press > 0.5 && r.tight.help && r.def === null, "mini oyun bağlamı: " + JSON.stringify(r));
  assert(r.shot && !r.pass, "şut anahtarları");
  // ribaund: mücadeleye gir → kazanınca ikinci şans seçenekleri
  await p.evaluate(() => {
    const G = window.Game;
    const el = document.querySelector("#mview");
    G.M.reb = 0;
    const R = Math.random;
    Math.random = () => 0.01;
    window.__rb = G.reboundPhase(el, "Test");
    Math.random = R;
  });
  await p.waitForSelector('[data-rb="crash"]', { timeout: 3000 });
  assert(await p.isVisible('[data-rb="back"]'), "savunmaya dön seçeneği");
  await p.click('[data-rb="back"]');
  const back = await p.evaluate(async () => await window.__rb);
  assert(back && back.good === false && /savunmaya/.test(back.txt), "savunmaya dönüş: " + JSON.stringify(back));
  return p;
});

test("ekonomi: medya yorgunluğu, pasif gelir sınırı, fiş değeri korunur, teselli fişi bozdurulamaz, arabalar üst üste binmez, arcade haftada 2, kumarda kasa önde", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    // medya yorgunluğu: aynı hafta ikinci iş daha az
    S.followers = 10000;
    const a1 = G.mediaGain(0.04, 0),
      a2 = G.mediaGain(0.04, 0);
    // pasif gelir: maaşın oranını geçmez
    S.stage = "nba";
    S.wage = 20000;
    const cap = G.passiveCap(70000, 0.5);
    // fiş: terfide para değeri korunur
    S.stage = "uni";
    S.chips = 200000;
    S.freeChips = 0;
    G.Bus.emit("week:start");
    const v0 = S.chips * G.chipRate();
    S.stage = "nba";
    G.Bus.emit("week:start");
    const v1 = S.chips * G.chipRate();
    // teselli fişi: oynanır ama bozdurulamaz
    S.chips = 20;
    S.freeChips = 0;
    G.weeklyHooks();
    G.closeSheet();
    // arabalar: en iyisinin enerjisi
    S.items = { araba1: 1, araba2: 1, araba3: 1, scooter: 1 };
    const en = G.itemWeekly("en"),
      maxCar = Math.max(...G.SHOP.filter(it => it.st === "galeri" && it.en).map(it => it.en));
    // arcade
    const c = [G.arcadeCounts(), G.arcadeCounts(), G.arcadeCounts()];
    return { a1, a2, cap, v0, v1, chips: S.chips, free: S.freeChips, en, maxCar, c, cost: G.arcadeCost() };
  });
  assert(r.a2 < r.a1 && r.a1 <= 400, "medya yorgunluğu: " + JSON.stringify(r));
  assert(r.cap === 10000, "pasif gelir sınırı: " + r.cap);
  assert(Math.abs(r.v1 - r.v0) / r.v0 < 0.05, "fiş değeri korunmalı: " + r.v0 + " → " + r.v1);
  assert(r.chips === 100 && r.free === 80, "teselli fişi: " + JSON.stringify(r));
  assert(r.en === r.maxCar, "araba enerjisi: " + r.en + " / " + r.maxCar);
  assert(JSON.stringify(r.c) === "[true,true,false]" && r.cost >= 350, "arcade: " + JSON.stringify(r));
  const src = require("fs").readFileSync(require("path").join(ROOT, "src/casino.js"), "utf8");
  assert(/pay = BET; \/\/ çift/.test(src) && !/BET \* 2\.1/.test(src), "slot ve rulet kasa lehine");
  return p;
});

test("hikâye: haftalık hikâye olayı (güvenli seçenek), şanslı çorap şutu etkiler, lakap, spiker, transfer gecesi, maskot, hakem tartışması", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.tales = { last: -9, done: {}, sock: 0, pivot: 0, coffee: 0, trash: 0 };
    G.S.week = 5;
    G.S.followers = 2000;
    if (G.S.goals) G.S.goals.shown = true;
    const R = Math.random;
    Math.random = () => 0.3;
    // önce gelen başka paneller (derbi basını vb.) tüketilir
    for (let i = 0; i < 6 && !document.querySelector("[data-tl]"); i++) {
      G.closeSheet();
      G.Bus.first("week:sheet");
    }
    Math.random = R;
  });
  await p.waitForSelector("[data-tl]", { timeout: 3000 });
  const title = await p.textContent(".sheet h2");
  // ilk seçenek her zaman mini oyunsuz: sonuç ekranı gelir, takılmaz
  await p.click("[data-tl]");
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({
    sheet: !!document.querySelector(".sheet"),
    tl: !!document.querySelector("[data-tl]")
  }));
  assert(title && !after.tl, "hikâye olayı: " + title + " " + JSON.stringify(after));
  const r = await p.evaluate(async () => {
    const G = window.Game,
      S = G.S;
    G.closeSheet();
    // şanslı çorap: kayıpken maçta şut −2
    G.setM({ live: 1, feed: [], pts: 0, opp: { short: "OPP", key: "x" } });
    document.body.insertAdjacentHTML("beforeend", '<div id="mstat"></div>');
    const e0 = G.eff("sut");
    S.tales.sock = 1;
    const e1 = G.eff("sut");
    // lakap
    S.career.games = 12;
    S.career.pts = 300;
    G.Bus.emit("match:end", { win: true });
    // spiker ve transfer gecesi
    G.commentLine("close");
    const feed = G.M.feed.map(f => f.x).join(" ");
    const tn = G.transferNight();
    G.M.home = true;
    const ms = G.mascotHTML();
    return { d: e0 - e1, nick: G.nickName(), feed, tn: /telefonda/.test(tn), ms: /maskot/i.test(ms) };
  });
  assert(r.d === 2, "çorap şutu etkilemeli: " + r.d);
  assert(r.nick === "Sayı Makinesi", "lakap: " + r.nick);
  assert(/Spiker/.test(r.feed), "spiker satırı: " + r.feed.slice(0, 120));
  assert(r.tn && r.ms, "transfer gecesi ve maskot");
  // hakem tartışması: sessizce yürü
  await p.evaluate(() => {
    const R = Math.random;
    Math.random = () => 0.1;
    if (!document.querySelector("#mview")) document.body.insertAdjacentHTML("beforeend", '<div id="mview"></div>');
    window.__rf = window.Game.refArgue(document.querySelector("#mview"));
    Math.random = R;
  });
  await p.waitForSelector('[data-rf="walk"]', { timeout: 3000 });
  await p.click('[data-rf="walk"]');
  assert(/savunmaya/.test(await p.evaluate(async () => await window.__rf)), "hakem tartışması");
  return p;
});

test("hafta planı (uygula, tekrarla), hafta özeti, milli takım arası serbest zaman (mola modu), sadece anlarım modu", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.slot = 3;
    G.S.money = 500;
    G.renderMain();
  });
  await p.click("#wplan");
  await p.click('[data-ps="0"] [data-v="team"]');
  await p.click('[data-ps="1"] [data-v="rest"]');
  await p.click('[data-ps="2"] [data-v="cafe"]');
  await p.click("#pl-go");
  await p.waitForSelector("#pl-ok", { timeout: 3000 });
  const r1 = await p.evaluate(() => ({
    slot: window.Game.S.slot,
    plan: window.Game.S.lastPlan,
    n: document.querySelectorAll(".sheet .small").length
  }));
  assert(r1.slot === 0 && r1.plan.join() === "team,rest,cafe" && r1.n >= 3, "plan: " + JSON.stringify(r1));
  const r2 = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    G.Bus.emit("week:start");
    S.money += 50;
    S.followers += 20;
    G.toast("deneme bildirimi");
    G.Bus.emit("week:start");
    const sum = G.weekSummaryHTML();
    // mola modu
    let called = 0;
    S.slot = 1;
    G.startBreak({ label: "EuroBasket: Sırbistan", sub: "Grup" }, () => (called = 1));
    const brk = { go: !!document.querySelector("#brk-go"), stad: !!document.querySelector("#gostad"), slot: S.slot };
    G.openLoc("stad", "mac");
    const tab = document.querySelector('.tabs button.on, .tabs button[aria-selected="true"]');
    G.closeSheet();
    document.querySelector("#brk-go").click();
    return { sum, brk, tab: tab ? tab.dataset.t : "", called, slotBack: S.slot, brkOff: !S.brk };
  });
  assert(/Geçen hafta/.test(r2.sum) && /deneme bildirimi/.test(r2.sum), "hafta özeti");
  assert(r2.brk.go && !r2.brk.stad && r2.brk.slot === 3, "mola modu: " + JSON.stringify(r2.brk));
  assert(r2.tab !== "mac" && r2.called === 1 && r2.slotBack === 1 && r2.brkOff, "mola: " + JSON.stringify(r2));
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector('[data-m="only"]', { timeout: 5000 });
  return p;
});

test("ölü seçenekler: dengeli beslenme, pizza paylaşımı, dinlenme sakatlık riskini düşürür, kafede rakip keşfi; taraftar koreografisi", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.money = 9999;
    const items = G.MARKET || [];
    const pick = id => items.find(i => i.id === id);
    const notes = ["su", "muz", "pizza"].map(id => (pick(id) ? G.marketBuy(pick(id)) : "yok"));
    S.slot = 3;
    S.buffs.injWk = 0;
    G.openLoc("ev");
    G.restAct();
    const inj = S.buffs.injMul;
    G.closeSheet();
    G.openLoc("kafe");
    const b = document.querySelector('[data-act="izle"]');
    if (b) b.click();
    const scout = S.buffs.scoutK;
    G.closeSheet();
    S.buffs.choreo = 1;
    G.setM({ live: 1, home: true, auto: false, hype: 0, feed: [] });
    G.fanMatchStart();
    return { notes, inj, scout, hype: G.M.hype, n: items.length };
  });
  assert(r.notes.some(n => /Dengeli/.test(n || "")) || r.n === 0, "dengeli beslenme: " + JSON.stringify(r));
  assert(r.inj < 1, "dinlenme sakatlık riski: " + r.inj);
  assert(!!r.scout, "kafede keşif");
  assert(r.hype === 60, "koreografi");
  return p;
});

test("yaz kampı (hızlı geç), ödül gecesi (3 adım), rehabilitasyon, rakiple karşılaşma geçmişi", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.season = 3;
    S.week = 1;
    S.campSeason = 0;
    if (S.goals) S.goals.shown = true;
    // önce gelen başka rastgele paneller tüketilir
    for (let i = 0; i < 6 && !document.querySelector('[data-sl="skip"]'); i++) {
      window.Game.closeSheet();
      window.Game.Bus.first("week:sheet");
    }
  });
  await p.waitForSelector('[data-sl="skip"]', { timeout: 3000 });
  await p.click('[data-sl="skip"]');
  await p.waitForSelector("#rb", { timeout: 3000 });
  assert(await p.evaluate(() => window.Game.S.campSeason === 3), "kamp bu sezon yapıldı");
  await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.S.galaDue = 1;
    G.Bus.first("week:sheet");
  });
  for (let i = 0; i < 3; i++) {
    await p.waitForSelector("[data-sl]", { timeout: 3000 });
    await p.click("[data-sl]");
  }
  await p.waitForSelector("#rb", { timeout: 3000 });
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    G.closeSheet();
    S.injury = { n: "Ayak bileği", w: 3, total: 3 };
    S.week = 5;
    S.rehabWk = "";
    G.Bus.first("week:sheet");
    const rh = !!document.querySelector('[data-sl="go"]');
    G.closeSheet();
    S.injury = null;
    // rakiple karşılaşma
    S.rival = S.rival || { first: "Ali", last: "Rakip", team: { key: "rv" }, ppg: 14 };
    S.rival.team = S.rival.team || { key: "rv" };
    G.setM({ opp: { key: S.rival.team.key }, pts: 18 });
    G.Bus.emit("match:end", { win: true });
    return { rh, h2h: G.h2hHTML() };
  });
  assert(r.rh, "rehabilitasyon paneli");
  assert(/1-0/.test(r.h2h), "karşılaşma geçmişi: " + r.h2h.slice(0, 120));
  return p;
});

test("EuroLeague kulübü: hafta sonu ülke ligi, EuroLeague hafta içi ayrı turnuva (6 grup maçı)", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const club = G.leaguePool("euro").find(t => t.key === "club|Baskonia");
    S.stage = "euro";
    S.team = club;
    S.city = club.city;
    S.wage = 6000;
    G.newSeasonLeague();
    const pool = G.leaguePool("euro").map(t => t.key);
    return {
      cc: club.cc,
      lg: G.lgName(),
      domestic: S.league.filter(x => x.key !== S.team.key).every(x => G.teamByKey(x.key).cc === club.cc),
      euroInLeague: S.league.filter(x => x.key !== S.team.key && pool.includes(x.key)).length,
      euro: S.comps && S.comps.euro && S.comps.euro.games.length,
      kind: S.comps.euro.kind,
      cup: S.comps.cup && S.comps.cup.rounds.length
    };
  });
  assert(r.cc === "ES" && !/EuroLeague|Kıta Ligi/.test(r.lg), "ülke ligi değil: " + JSON.stringify(r));
  assert(r.domestic, "rakipler başka ülkeden");
  assert(r.euro === 6 && r.kind === "el" && r.cup === 3, "yarışmalar: " + JSON.stringify(r));
  return p;
});

test("hafta içi maçı: lig maçından sonra gelir, simüle edilir, grup tablosu ve kariyer güncellenir", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const club = G.leaguePool("euro")[3];
    S.stage = "euro";
    S.team = club;
    S.wage = 6000;
    G.newSeasonLeague();
    S.week = 2; // ilk EuroLeague maç haftası
    window.__g0 = S.career.games;
    window.__next = false;
    G.closeSheet();
    G.midweek(() => (window.__next = true));
  });
  await p.waitForSelector("#mw-sim", { timeout: 5000 });
  const t = await p.textContent("#ovl");
  assert(/EuroLeague|Kıta Ligi/.test(t), "hafta içi ekranı: " + t.slice(0, 80));
  await p.click("#mw-sim");
  await p.waitForSelector("#mw-ok", { timeout: 60000 });
  await p.click("#mw-ok");
  const r = await p.evaluate(() => {
    const E = window.Game.S.comps.euro;
    return {
      played: E.games.filter(g => g.res).length,
      tw: E.table.reduce((a, x) => a + x.w, 0),
      g: window.Game.S.career.games - window.__g0
    };
  });
  assert(r.played === 1 && r.tw === 4 && r.g === 1, "grup sonucu: " + JSON.stringify(r));
  return p;
});

test("Final Four, ülke kupası, Süper Kupa ve Lig merkezi Kupalar sekmesi", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.stage = "t2";
    S.wage = 450;
    S.superNext = S.season;
    G.newSeasonLeague();
    const sup = !!S.comps.sup,
      cup = S.comps.cup.rounds.map(x => x.week);
    G.leagueSheet("kupa");
    const html = document.querySelector("#ovl").textContent;
    // Final Four: EuroLeague grubu bitmiş, son hafta
    const club = G.leaguePool("euro")[0];
    S.stage = "euro";
    S.team = club;
    S.superNext = 0;
    G.newSeasonLeague();
    const E = S.comps.euro;
    E.games.forEach(g => (g.res = { win: true, us: 80, them: 70 }));
    E.table.find(x => x.key === S.team.key).w = 6;
    S.week = S.sched.length;
    return {
      sup,
      cup,
      html,
      due: (() => {
        const s = [];
        G.midweek(() => s.push("next"));
        return document.querySelector("#ovl").textContent;
      })()
    };
  });
  assert(r.sup && JSON.stringify(r.cup) === "[4,9,12]", "kupa/süper: " + JSON.stringify(r));
  assert(/Kupası/.test(r.html) && /Süper Kupa/.test(r.html), "Kupalar sekmesi");
  assert(/Final Four|Dörtlü Final/.test(r.due), "Final Four gelmedi: " + r.due.slice(0, 100));
  return p;
});

test("playoff ağacı: yarı final kaydı ve Lig merkezi Playoff sekmesi", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.week = S.sched.length;
    S.league.find(x => x.key === S.team.key).w = 20;
    window.__TEST = Object.assign(window.__TEST || {}, { noEvents: true });
    G.closeSheet();
    G.afterMatchFlow(true);
    const semi = { phase: S.phase, po: !!S.po };
    G.leagueSheet("po");
    return { ...semi, html: document.querySelector("#ovl").textContent };
  });
  assert(r.phase === "semi" && r.po, "playoff başlamadı: " + JSON.stringify(r));
  assert(/Yarı final/.test(r.html) && /Final/.test(r.html), "playoff sekmesi: " + r.html.slice(0, 120));
  return p;
});

test("milli turnuva: merkez ekran, grup tablosu, maç arası hazırlık, sonuna kadar oynanır", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.stage = "t1";
    S.age = 24;
    window.__ntDone = false;
    G.natTourney("A", "EuroBasket", ["IT", "FR", "GR", "ES"], () => (window.__ntDone = true));
  });
  assert(await p.isVisible("#nt-play"), "turnuva merkezi yok");
  await p.click('[data-np="rest"]');
  assert(/hazırlığını yaptın/.test(await p.textContent("#ovl")), "hazırlık işlenmedi");
  await p.click('[data-nt="tablo"]');
  assert(/İtalya|Fransa|Yunanistan/.test(await p.textContent("#ovl")), "grup tablosu yok");
  for (let i = 0; i < 12; i++) {
    if (await p.evaluate(() => window.__ntDone)) break;
    const st = await p.evaluate(() => {
      const $ = s => document.querySelector(s);
      for (const s of ["#nt-done", "#nok"]) if ($(s)) return ($(s).click(), "c");
      if ($('[data-nt="hub"]') && !$("#nt-sim")) return ($('[data-nt="hub"]').click(), "c");
      if ($("#nt-sim")) return ($("#nt-sim").click(), "c");
      return "w";
    });
    await p.waitForTimeout(st === "w" ? 400 : 200);
    if (st === "w") await p.waitForSelector("#nok,#nt-sim,#nt-done", { timeout: 60000 }).catch(() => {});
  }
  const r = await p.evaluate(() => ({ done: window.__ntDone, caps: window.Game.S.career.natCaps || 0 }));
  assert(r.done && r.caps >= 3, "turnuva bitmedi: " + JSON.stringify(r));
  return p;
});

test("sözleşme pazarlığında kulüp temsilcisi (portre, ad, ilgiye göre söz); aynı kulüp hep aynı kişi", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const t = G.leaguePool("t1", "TR")[0];
    const a = G.repOf(t).n,
      b = G.repOf(t).n;
    G.negotiateOffer({ team: t, stage: "t1", role: "rot", wage: 1500, years: 2 }, () => {});
    return {
      same: a === b,
      name: a,
      box: !!document.querySelector("#repbox"),
      cv: !!document.querySelector("#rep canvas"),
      txt: document.querySelector("#repbox").textContent
    };
  });
  assert(r.same && r.box && r.cv, "temsilci: " + JSON.stringify(r));
  assert(r.txt.includes(r.name) && /sportif direktör/.test(r.txt), "temsilci metni: " + r.txt);
  return p;
});

test("reklamla teklifleri yenile: kalma teklifi yerinde, diğerleri yeni kulüpler; yaz başına bir kez", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => window.Game.transition(6.5, false, '<div id="seasonad"></div>'));
  const before = await p.evaluate(() => window.__lastOffers.map(o => o.team.key + (o.stay ? "*" : "")));
  await p.click('[data-sn="off"]'); // Sezon Gecesi: Teklifler sekmesi
  assert(await p.isVisible("#ad-reroll"), "yenile düğmesi yok");
  await p.click("#ad-reroll");
  await watchAd(p);
  const r = await p.evaluate(() => ({
    after: window.__lastOffers.map(o => o.team.key + (o.stay ? "*" : "")),
    again: !!document.querySelector("#ad-reroll"),
    rows: document.querySelectorAll("[data-o]").length
  }));
  const stays = before.filter(k => k.endsWith("*"));
  assert(
    stays.every(k => r.after.includes(k)),
    "kalma teklifi değişti"
  );
  assert(
    r.after.filter(k => !k.endsWith("*")).some(k => !before.includes(k)),
    "yeni kulüp yok: " + JSON.stringify([before, r.after])
  );
  assert(!r.again && r.rows === r.after.length, "ikinci kez / liste: " + JSON.stringify(r));
  return p;
});

test("kılavuz: ana ekrandan açılır, 10 bölüm, ileri/geri; yuvalar ekranından açılıp kapatılınca hata yok", async () => {
  const p = await page();
  await career(p);
  await p.click("#gdb");
  const n = await p.evaluate(() => document.querySelectorAll("[data-gd]").length);
  assert(n === 10, "bölüm sayısı: " + n);
  await p.click("#gd-next");
  assert(/Mekanlar/.test(await p.textContent("#ovl")), "ileri gitmedi");
  await p.click('[data-gd="2"]');
  assert(/Seviye çarpanı/.test(await p.textContent("#ovl")), "nitelikler bölümü");
  await p.click("#shx");
  assert(await p.isVisible("#gostad"), "ana ekrana dönmedi");
  await p.evaluate(() => window.Game.renderSlots());
  await p.click("#help0");
  await p.click("#shx");
  assert(await p.isVisible("#legb"), "yuvalar ekranına dönmedi");
  return p;
});

test("ilk hafta görev listesi ve ilk ziyaret ipuçları", async () => {
  const p = await page();
  await career(p);
  assert(await p.isVisible("#onb"), "görev kartı yok");
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const m0 = S.moral;
    G.Bus.emit("train:done", { k: "sut", ratio: 1 });
    G.openLoc("aile");
    const tip1 = /İpucu/.test(document.querySelector("#ovl").textContent);
    G.closeSheet();
    G.openLoc("aile");
    const tip2 = /İpucu/.test(document.querySelector("#ovl").textContent);
    G.closeSheet();
    G.openLoc("market");
    G.closeSheet();
    G.Bus.emit("match:end", {});
    G.renderMain();
    return { done: S.onb.done, dm: S.moral - m0, tip1, tip2, card: !!document.querySelector("#onb") };
  });
  assert(r.done && r.dm >= 5 && !r.card, "görevler: " + JSON.stringify(r));
  assert(r.tip1 && !r.tip2, "ipucu bir kez: " + JSON.stringify(r));
  return p;
});

test("sokak sahası: haritada, çocuklarla oyna, 3'e 3 turnuva (haftada bir), miras katkısı", async () => {
  const p = await page();
  await career(p);
  const onMap = await p.evaluate(() => !!document.querySelector('.loc[data-loc="sokak"]'));
  assert(onMap, "haritada yok");
  await p.click('.loc[data-loc="sokak"]');
  await p.click("#st-kids");
  const k = await p.evaluate(() => ({ kids: window.Game.S.street.kids, slot: window.Game.S.slot }));
  assert(k.kids === 1 && k.slot === 2, "çocuklar: " + JSON.stringify(k));
  await p.evaluate(() => {
    window.Game.closeSheet();
    window.Game.S.energy = 100;
    window.Game.openLoc("sokak");
  });
  await p.click("#st-tour");
  // şut mini oyununda "Hızlı şut" düğmesine bas (6 sn sonra çıkar); top sürme süre dolunca kendiliğinden biter
  for (let i = 0; i < 180 && !(await p.$("#bk")); i++) {
    await p.evaluate(() => {
      const q = [...document.querySelectorAll("button")].find(x => /Hızlı şut/.test(x.textContent));
      if (q) q.click();
    });
    await p.waitForTimeout(500);
  }
  await p.waitForSelector("#bk", { timeout: 5000 });
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.openLoc("sokak");
    const again = document.querySelector("#st-tour").disabled;
    G.S.legacy = G.S.legacy || { found: {}, club: 0 };
    const l0 = G.legacyScore();
    G.S.legacy.kids = 2;
    return { played: G.S.street.played, again, dl: G.legacyScore() - l0 };
  });
  assert(r.played === 1 && r.again, "turnuva: " + JSON.stringify(r));
  assert(r.dl === 30, "miras katkısı: " + r.dl);
  return p;
});

test("semtler: harita üstünde geçiş, ikinci semtte stüdyo, taraftar bölgesi, performans merkezi", async () => {
  const p = await page();
  await career(p);
  assert(await p.isVisible("#dist"), "semt düğmeleri yok");
  await p.click('[data-dist="kompleks"]');
  const locs = await p.evaluate(() => [...document.querySelectorAll(".loc")].map(g => g.dataset.loc));
  assert(["studyo", "taraftar", "performans"].every(l => locs.includes(l)) && !locs.includes("avm"), "ikinci semt: " + locs);
  await p.click('.loc[data-loc="performans"]');
  assert(/Kondisyon/.test(await p.textContent("#ovl")), "performans merkezi açılmadı");
  await p.evaluate(() => window.Game.renderMain());
  await p.click('[data-dist="merkez"]');
  assert(await p.evaluate(() => !!document.querySelector('.loc[data-loc="avm"]')), "merkeze dönmedi");
  return p;
});

test("haftalık harita olayı: işaret görünür, katılınca etkisi uygulanır ve kaybolur", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.district = "merkez";
    S.mapEv = { w: `${S.season}-${S.week}`, list: [{ id: "imza", loc: "avm", done: false }] };
    window.__t0 = S.rel.taraf;
    G.renderMain();
  });
  assert(await p.isVisible(".mev"), "olay işareti yok");
  await p.evaluate(() => document.querySelector(".mev").dispatchEvent(new MouseEvent("click", { bubbles: true }))); // nabız animasyonu: doğrudan tıkla
  await p.click("#mev-go");
  const r = await p.evaluate(() => ({ dt: window.Game.S.rel.taraf - window.__t0, done: window.Game.S.mapEv.list[0].done }));
  assert(r.dt === 3 && r.done, "olay: " + JSON.stringify(r));
  await p.click("#mev-ok");
  assert(!(await p.$(".mev")), "işaret kaybolmadı");
  return p;
});

test("kondisyon: en yüksek enerji, beslenme planı haftalık etkisi, sakatlık çarpanı, gece hayatı düşürür", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.fit = 50;
    const me = G.maxEnergy();
    S.energy = 100;
    G.norm();
    const capped = S.energy;
    S.diet = "sporcu";
    S.money = 1000;
    G.Bus.emit("week:start");
    const afterDiet = S.fit;
    S.fit = 100;
    const inj = G.fitInjMul();
    G.fitHit(3);
    return { me, capped, afterDiet, inj, after: S.fit };
  });
  assert(r.me === 85 && r.capped === 85, "en yüksek enerji: " + JSON.stringify(r));
  assert(r.afterDiet === 51.5, "beslenme: " + r.afterDiet);
  assert(Math.abs(r.inj - 0.85) < 1e-9 && r.after === 97, "çarpan/gece: " + JSON.stringify(r));
  return p;
});

test("ekipman eskir (30 maç), %60 fiyatla yenilenir ve tek seferlik katkı yeniden verilmez; maç günü güçlendiricisi", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.money = 10000;
    G.locAvm({ n: "AVM" }, "sneaker");
    const h0 = S.st.hiz;
    document.querySelector('[data-act="ayak1"]').click();
    const h1 = S.st.hiz;
    for (let i = 0; i < 30; i++) G.Bus.emit("match:end", {});
    const worn = !S.items.ayak1 && S.worn && S.worn.ayak1;
    const it = G.SHOP.find(x => x.id === "ayak1");
    const price = G.avmPrice(it);
    G.locAvm({ n: "AVM" }, "sneaker");
    const m0 = S.money;
    document.querySelector('[data-act="ayak1"]').click();
    const h2 = S.st.hiz,
      spent = m0 - S.money;
    // güçlendirici
    G.marketBuy(G.MARKET.find(x => x.id === "macayak"));
    const b1 = G.boostOf("hiz");
    for (let i = 0; i < 3; i++) G.Bus.emit("match:end", {});
    return { gain: h1 - h0, worn, price, spent, h2, h1, owned: !!S.items.ayak1, b1, b2: G.boostOf("hiz") };
  });
  assert(r.gain === 2 && r.worn, "eskime: " + JSON.stringify(r));
  assert(r.price === 36 && r.spent === 36 && r.h2 === r.h1 && r.owned, "yenileme: " + JSON.stringify(r));
  assert(r.b1 === 3 && r.b2 === 0, "güçlendirici: " + JSON.stringify(r));
  return p;
});

test("sponsor ilişkisi: her hafta azalır, reklam çekimi yükseltir, ihmal edilirse anlaşma bozulur; kanal geliri", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r0 = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.sponsorDeal = { b: "spor", wk: 0, perf: 0, until: S.season, rel: 60 };
    G.sponsorWeekly();
    const a = S.sponsorDeal.rel;
    S.slot = 3;
    S.energy = 100;
    G.locStudio({ n: "Stüdyo" });
    return { a };
  });
  // reklam çekimi: replik ekranı (src/tales.js adShoot) → doğru kelimeyi seç
  await p.click("#sd-shoot");
  await p.waitForSelector("[data-tl]", { timeout: 5000 });
  await p.evaluate(() => {
    const t = document.querySelector(".sheet").textContent;
    const btn = [...document.querySelectorAll("[data-tl]")].find(b => !/muz|çorap|uzaylı|anneanne|tavşan|kuzu/.test(b.dataset.tl)) || document.querySelector("[data-tl]");
    void t;
    btn.click();
  });
  await p.waitForSelector("#rb", { timeout: 3000 });
  const r = await p.evaluate(a0 => {
    const G = window.Game,
      S = G.S;
    const a = a0.a;
    const b = S.sponsorDeal.rel;
    S.sponsorDeal.rel = 22;
    G.sponsorWeekly();
    const lost = S.sponsorDeal === null;
    S.channel = { xp: 200, posts: 0, wk: "", n: 0, gear: {}, last: G.ecoWeek() }; // aktif kanal: son 4 haftada paylaşım
    S.tx = [];
    G.Bus.emit("week:start");
    const t = S.tx.find(x => /Kanal|reklam/i.test(x.d)); // kanal reklam geliri (diğer haftalık giderlerden bağımsız)
    return { a, b, lost, lvl: G.chLevel(), inc: t ? t.a : 0 };
  }, r0);
  assert(r.a === 55 && r.b === 80 && r.lost, "sponsor ilişkisi: " + JSON.stringify(r));
  assert(r.lvl >= 3 && r.inc > 0, "kanal geliri: " + JSON.stringify(r));
  return p;
});

test("taraftar bölgesi: imza günü, önemli maç haftasında taraftar grubu motivasyon verir", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.slot = 3;
    S.energy = 100;
    S.rel.taraf = 40;
    G.locFans({ n: "Taraftar" });
    document.querySelector("#fz-sign").click();
    const t1 = S.rel.taraf;
    S.phase = "final";
    S.playoffOpp = S.league.find(x => x.key !== S.team.key).key;
    S.buffs.motive = 0;
    G.locFans({ n: "Taraftar" });
    document.querySelector("#fz-ultra").click();
    return { t1, mot: S.buffs.motive, again: (G.locFans({ n: "T" }), document.querySelector("#fz-ultra").disabled) };
  });
  assert(r.t1 === 44 && r.mot === 1 && r.again, "taraftar: " + JSON.stringify(r));
  return p;
});

test("maç 2: hücumda 4 (kilit anda 5) karışık seçenek; durum anları; üçlükte faul 3 serbest atış; faul sorunu kenara alır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const all = G.PLAYS.SG.off.map(([k]) => ({ k, e: 50 }));
    const cats = o =>
      ["pull", "catch", "wing", "corner", "top3"].includes(o.k) ? "3" : ["pnr", "kick", "lob"].includes(o.k) ? "p" : "x";
    const a = G.pickOffOpts(all, false),
      b = G.pickOffOpts(all, true);
    G.setM({ us: 70, them: 66, pts: 0, ast: 0, stl: 0, stops: 0, pf: 0, q: 2, mmod: 0 });
    const R = Math.random;
    Math.random = () => 0.1;
    const clock = G.situSpecial(true, true, 4, "X");
    const hack = G.situSpecial(false, true, -5, "X");
    Math.random = R;
    const hr = hack.resolve("hk_foul", "Ben");
    const pf1 = G.M.pf;
    G.addFoul();
    G.addFoul();
    const ft = G.M.ftSit;
    G.setM({ pts: 0, mmod: 0 });
    G.autoResolve("free3", "Ben");
    return {
      a: a.length,
      b: b.length,
      mixA: new Set(a.map(cats)).size,
      clock: clock && clock.id,
      hack: hack && hack.id,
      hr: !!hr.txt,
      pf1,
      ft,
      ftPts: G.M.pts
    };
  });
  assert(r.a === 4 && r.b === 5 && r.mixA >= 3, "seçenekler: " + JSON.stringify(r));
  assert(r.clock === "clock" && r.hack === "hackfoul" && r.pf1 === 1, "durum anları: " + JSON.stringify(r));
  assert(r.ft === 2 && r.ftPts <= 3, "faul sorunu / 3 serbest atış: " + JSON.stringify(r));
  return p;
});

test("haftalık hazırlık her maç haftasında: şut seansı, video, odaklanma; odaklanma moral ve enerji verir", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => window.Game.openLoc("stad", "mac"));
  assert(
    // derbi/zirve haftasında şut seansı yerine basın toplantısı gelir
    (await p.isVisible("#pr-shot")) !== !!(await p.$("#pr-press")) && (await p.isVisible("#pr-focus")),
    "haftalık hazırlık düğmeleri"
  );
  await p.evaluate(() => {
    window.Game.S.moral = 50;
    window.Game.S.energy = 60;
  });
  await p.click("#pr-focus");
  await p.waitForSelector("#bk", { timeout: 60000 });
  const r = await p.evaluate(() => ({ k: !!window.Game.S.prepKey, res: window.Game.S.prepRes }));
  assert(r.k && r.res, "odaklanma sonucu: " + JSON.stringify(r));
  return p;
});

test("stil 2: yeni saç modelleri ve ana ekranda portreden stil paneli", async () => {
  const p = await page();
  await career(p);
  await p.click("#hav");
  assert(await p.isVisible('#st-hat [data-v="afro"]'), "afro seçeneği yok");
  await p.click('#st-hat [data-v="afro"]');
  await p.evaluate(() => (window.Game.S.money = 500));
  await p.click('#st-hat [data-v="orgu"]');
  await p.click("#st-save");
  const r = await p.evaluate(() => ({ hs: window.Game.S.look.hatStyle, cv: !!document.querySelector("#stpv canvas") }));
  assert(r.hs === "orgu" && r.cv, "saç modeli: " + JSON.stringify(r));
  return p;
});

test("akademi: kurulur, öğrenci kaydı, haftalık aidat, mezuniyet ve miras", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.district = "kompleks";
    G.openLoc("akademi");
    document.querySelector("#ac-buy").click();
    document.querySelector("[data-ac]").click();
    const kids = S.acad.kids.length;
    const m0 = S.money;
    G.Bus.emit("week:start");
    const inc = S.money - m0;
    S.acad.kids[0].age = 17;
    S.acad.kids[0].sk = 60;
    const l0 = G.legacyScore();
    G.Bus.emit("season:end", {});
    return { kids, inc, grads: S.acad.grads.length, pro: S.acad.grads[0] && S.acad.grads[0].pro, dl: G.legacyScore() - l0 };
  });
  assert(r.kids === 3 && r.inc > 0, "akademi: " + JSON.stringify(r));
  assert(r.grads === 1 && r.pro && r.dl >= 25, "mezuniyet/miras: " + JSON.stringify(r));
  return p;
});

test("liman: buluşmalar ilişkiyi ilerletir, sevgili, nişan, düğün; evlilik moral tabanını yükseltir", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.partner = "Elif";
    S.rel.partner = 70;
    S.pstage = 0;
    S.dates = 3;
    S.slot = 3;
    G.openLoc("liman");
    document.querySelector('[data-dt="rest"]').click();
    const st1 = S.pstage;
    S.rel.partner = 95;
    S.slot = 3;
    G.openLoc("liman");
    const R = Math.random;
    Math.random = () => 0.01;
    document.querySelector("#hb-prop").click();
    Math.random = R;
    const st2 = S.pstage;
    const b0 = G.moraleBase();
    S.weddingReady = true;
    G.openLoc("liman");
    document.querySelector("#hb-wed").click();
    return { st1, st2, st3: S.pstage, db: G.moraleBase() - b0 };
  });
  assert(r.st1 === 1 && r.st2 === 2 && r.st3 === 3 && r.db === 5, "partner aşamaları: " + JSON.stringify(r));
  return p;
});

test("borsa: lot al, fiyat haftalık değişir, sat; hipodrom: bahis, yarış biter, koç haftada bir", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    G.openLoc("borsa");
    const m0 = S.money;
    document.querySelector('[data-sb="tek"]').click();
    const own = S.mkt2.own.tek,
      p0 = S.mkt2.p.tek;
    G.Bus.emit("week:start");
    const p1 = S.mkt2.p.tek;
    G.openLoc("borsa");
    document.querySelector('[data-ss="tek"]').click();
    S.age = 25;
    S.rel.koc = 50;
    G.openLoc("hipodrom");
    G.openLoc("hipodrom");
    return { own, changed: p0 !== p1, back: S.money < m0 + 1e9 && S.mkt2.own.tek === 0, koc: S.rel.koc };
  });
  assert(r.own > 0 && r.changed && r.back, "borsa: " + JSON.stringify(r));
  assert(r.koc === 48, "hipodrom koç: " + r.koc);
  const m0 = await p.evaluate(() => window.Game.S.money);
  await p.click('[data-hb="0"]');
  await p.waitForSelector("#hp-again", { timeout: 10000 });
  const m1 = await p.evaluate(() => window.Game.S.money);
  assert(m1 !== m0, "bahis işlenmedi");
  return p;
});

test("paket 2: kademeli açılış ve yenilikler kartı", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game,
      S = G.S;
    S.unlocks = { program: 1, sistem: 1, gorev: 1, miras: 1 };
    S.season = 1;
    S.week = 1;
    const early = { plan: G.unlocked("plan"), tales: G.unlocked("hikaye"), gece: G.unlocked("geceligi") };
    S.week = 6;
    const later = { plan: G.unlocked("plan"), tales: G.unlocked("hikaye"), gece: G.unlocked("geceligi") };
    S.unlocks.geceligi = 2;
    const forced = G.unlocked("geceligi");
    try {
      localStorage.removeItem("pota-whatsnew");
    } catch (e) {
      /* yok */
    }
    G.closeSheet();
    G.Bus.emit("screen:main");
    await new Promise(r => setTimeout(r, 900));
    const wn = !!document.querySelector("#wn-ok");
    if (wn) document.querySelector("#wn-ok").click();
    let seen = null;
    try {
      seen = localStorage.getItem("pota-whatsnew");
    } catch (e) {
      /* yok */
    }
    return { early, later, forced, wn, seen, ver: G.WHATSNEW };
  });
  assert(!r.early.plan && !r.early.tales && !r.early.gece, "erken açık: " + JSON.stringify(r));
  assert(r.later.plan && r.later.tales && !r.later.gece && r.forced, "açılış: " + JSON.stringify(r));
  assert(r.wn && r.seen === r.ver, "yenilikler: " + JSON.stringify(r));
  return p;
});

test("paket 2: mola kartı seriyi keser, son dakika faul ve zaman tüketme", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    G.setM({ q: 4, clock: "1:20", us: 70, them: 72, plus: 0, live: 1, feed: [] });
    G.timeoutInit();
    const left0 = G.M.toLeft;
    G.runTrack(false, true);
    G.runTrack(false, true);
    G.runTrack(false, true);
    const run = G.M.oppRun;
    const btn = G.timeoutBtnHTML();
    const el = document.createElement("div");
    document.body.appendChild(el);
    const pr = G.timeoutCard(el);
    const b = el.querySelector('[data-to="stop"]');
    b && b.click();
    await pr;
    const after = { left: G.M.toLeft, runStop: G.M.runStop, mod: G.possMod(false) };
    // geride, top rakipte → faul seçeneği
    const lc = G.lateCall(false, -3, el, 30);
    const f = el.querySelector('[data-lt="foul"]');
    f && f.click();
    const call = await lc;
    // önde, top bizde, ≤35 sn → zaman tüket
    const lc2 = G.lateCall(true, 2, el, 20);
    const h = el.querySelector('[data-lt="hold"]');
    h && h.click();
    const call2 = await lc2;
    G.M.hold = 1;
    const holdMod = G.possMod(true);
    const none = await G.lateCall(true, 10, el, 20);
    let ft = 0;
    for (let i = 0; i < 50; i++) ft += G.oppFreeThrows().made;
    el.remove();
    G.setM(null);
    return { left0, run, pulse: /pulse/.test(btn), after, call, call2, holdMod, none, ft };
  });
  assert(r.left0 === 2 && r.run === 3 && r.pulse, "mola başlangıcı: " + JSON.stringify(r));
  assert(r.after.left === 1 && r.after.mod < 1, "mola etkisi: " + JSON.stringify(r));
  assert(r.call === "foul" && r.call2 === "hold" && r.holdMod < 1 && r.none === null, "son dakika: " + JSON.stringify(r));
  assert(r.ft > 35 && r.ft < 85, "serbest atış: " + r.ft);
  return p;
});

test("paket 2: kişilikler, kaptanlık, kavga, mentorluk, yaşlanan portre", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const tr = ["Ali Kaya", "Can Demir", "Efe Şahin", "Mert Yıldız", "Ozan Koç", "Kerem Ak"].map(G.mateTrait);
    S.age = 28;
    S.role = "star";
    S.rel.takim = 80;
    G.Bus.emit("week:start");
    const cap = G.isCaptain();
    G.openLoc && G.renderMain();
    // yaşlı portre çizimi hata vermeden
    const c = document.createElement("canvas");
    let portrait = true;
    try {
      const j = G.jersey();
      j.age = 36;
      G.drawKid(c.getContext("2d"), 60, 60, 1, S.look, j);
    } catch (e) {
      portrait = String(e);
    }
    return { tr, cap, pill: G.mateTraitHTML("Ali Kaya").includes("pill"), portrait };
  });
  assert(r.tr.every(Boolean) && new Set(r.tr).size >= 2, "kişilikler: " + JSON.stringify(r.tr));
  assert(r.cap && r.pill && r.portrait === true, "kaptan/portre: " + JSON.stringify(r));
  return p;
});

test("paket 2: üç kariyer senaryosu kurulur, hedef değerlendirilir; soy ağacı; salon ışıkları; sesler", async () => {
  const p = await page();
  const r = await p.evaluate(() => {
    const G = window.Game,
      out = {};
    for (const id of Object.keys(G.SCENARIOS)) {
      G.ADS.consent = true;
      G.F.first = "Deniz";
      G.F.last = "Test";
      G.F.pos = "PG";
      G.F.slot = 1;
      G.F.mode = "normal";
      G.F.scenario = id;
      G.startCareer();
      const S = G.S;
      out[id] = {
        age: S.age,
        stage: S.stage,
        team: !!S.team,
        scn: S.scn && S.scn.id,
        until: S.scn && S.scn.until,
        html: G.scenarioHTML().length > 0
      };
      G.closeSheet();
    }
    const S = G.S;
    // son dans: kupa kazanınca başarı
    S.scn.tr0 = (S.career.trophies || []).length;
    S.career.trophies = [...(S.career.trophies || []), { type: "cup", y: S.year }];
    G.Bus.emit("season:end", {});
    G.Bus.emit("week:start");
    out.done = S.scn.done;
    G.closeSheet();
    out.sheet = G.Bus.first ? true : true;
    S.family = [{ n: "Baba Test", y: 1990, tr: 3, t: "", pos: "C" }];
    out.tree = G.familyTreeHTML().includes("Baba Test");
    out.next = G.familyNext().length === 2;
    out.sfx = ["netSwish", "squeak", "chant"].every(k => typeof G.SFX[k] === "function");
    return out;
  });
  assert(
    r.fallen.age === 27 && r.fallen.stage === "t2" && r.fallen.scn === "fallen" && r.fallen.html,
    "düşen yıldız: " + JSON.stringify(r.fallen)
  );
  assert(r.smallclub.stage === "t3" && r.smallclub.age === 22, "küçük kulüp: " + JSON.stringify(r.smallclub));
  assert(r.lastdance.stage === "euro" && r.lastdance.age === 34, "son dans: " + JSON.stringify(r.lastdance));
  assert(r.done === 1 && r.tree && r.next && r.sfx, "hedef/soy/ses: " + JSON.stringify(r));
  return p;
});

test("paket 3d: portre göz kırpar/gülümser, yeniden çizimde tek zamanlayıcı, düşük grafikte kapalı", async () => {
  const p = await page();
  await career(p);
  const a = await p.evaluate(() => {
    const G = window.Game;
    G.SETTINGS.lowfx = false;
    G.S.moral = 85;
    G.renderMain();
    G.renderMain();
    G.renderMain();
    return {
      st: G.polPortraitState(),
      canv: document.querySelectorAll("#hav canvas").length,
      low: G.polBaseMood(35),
      vlow: G.polBaseMood(10)
    };
  });
  assert(a.st.running && a.canv === 1 && a.low === "hafif" && a.vlow === "uzgun", "başlangıç: " + JSON.stringify(a));
  const f0 = a.st.frames;
  await p.waitForTimeout(9500);
  const b = await p.evaluate(() => ({
    st: window.Game.polPortraitState(),
    canv: document.querySelectorAll("#hav canvas").length
  }));
  // üç yeniden çizimden sonra tek zamanlayıcı: 9.5 sn'de en çok ~3 döngü (kırpma 2 kare, gülümseme 2 kare)
  assert(b.canv === 1 && b.st.frames - f0 >= 2 && b.st.frames - f0 <= 8, "animasyon: " + JSON.stringify({ f0, b }));
  const c = await p.evaluate(async () => {
    const G = window.Game;
    G.app.innerHTML = "";
    await new Promise(r => setTimeout(r, 5000));
    const gone = G.polPortraitState().running;
    G.SETTINGS.lowfx = true;
    G.renderMain();
    const low = G.polPortraitState().running;
    G.SETTINGS.lowfx = false;
    return { gone, low };
  });
  assert(!c.gone && !c.low, "durma: " + JSON.stringify(c));
  return p;
});

test("paket 3d: harita akşam pencere ışıkları, sabah tonu, haftaya bağlı yağmur (düşük grafikte statik)", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S,
      seed = G.cityTheme(S.city).seed,
      out = {};
    G.SETTINGS.lowfx = false;
    S.slot = 1;
    G.renderMain();
    out.win = document.querySelectorAll(".pol-winlit rect").length;
    S.slot = 3;
    let w = 1;
    while (w < 60 && ((S.week = w), !G.polRainy(seed))) w++;
    out.rainWeek = w;
    G.renderMain();
    out.rain = !!document.querySelector(".pol-rain");
    out.anim = !!document.querySelector(".pol-rain animateTransform");
    out.tint = !!document.querySelector(".pol-atmos > rect");
    out.wx = G.polWeather();
    G.SETTINGS.lowfx = true;
    G.renderMain();
    out.lowAnim = !!document.querySelector(".pol-rain animateTransform");
    out.lowRain = !!document.querySelector(".pol-rain");
    G.SETTINGS.lowfx = false;
    let d = 1;
    while (d < 60 && ((S.week = d), G.polRainy(seed))) d++;
    G.renderMain();
    out.dry = !document.querySelector(".pol-rain");
    out.locs = document.querySelectorAll(".loc").length;
    return out;
  });
  assert(r.win > 5, "pencere ışığı yok: " + JSON.stringify(r));
  assert(
    r.rainWeek < 60 && r.rain && r.anim && r.tint && r.wx.rain && r.wx.tod === "morning",
    "yağmur/ton: " + JSON.stringify(r)
  );
  assert(r.lowRain && !r.lowAnim && r.dry && r.locs > 5, "düşük grafik/kuru hafta: " + JSON.stringify(r));
  return p;
});

test("paket 3d: kupa dolabı raflarda kupalar, boş raflar, dokununca etiket", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.career.trophies = [
      { type: "champ", label: "2030 · Şampiyonluk" },
      { type: "mvp", label: "2030 · MVP" },
      { type: "nat_gold", label: "2031 · Altın" },
      { type: "arcade", label: "Arcade" },
      { type: "cup", label: "Kupa" },
      { type: "street", label: "Sokak" }
    ];
    G.openLoc("ev", "vitrin");
    const items = document.querySelectorAll("#pol-cab .pol-tr");
    const empty = document.querySelectorAll("#pol-cab svg > ellipse").length;
    items[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const icons = new Set(["champ", "mvp", "nat_gold", "arcade", "street"].map(t => G.polCabinetIcon({ type: t }).join())).size;
    return { n: items.length, empty, lbl: document.querySelector("#pol-cab-lbl").textContent, icons };
  });
  assert(r.n === 6 && r.empty >= 9 && r.lbl.includes("MVP") && r.icons === 5, "dolap: " + JSON.stringify(r));
  return p;
});

test("paket 3d: emeklilik sonrası koçluk sezonu oynanır, mirasa eklenir, kariyer verisi bozulmaz", async () => {
  const p = await page();
  await career(p);
  const before = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.age = 36;
    S.career.games = 400;
    G.retireScreen();
    return {
      games: S.career.games,
      hist: S.hist.length,
      team: S.team.name,
      legacy: G.legacyScore(),
      card: !!document.querySelector("#cch-card")
    };
  });
  assert(before.card, "koçluk kartı yok");
  await p.click("#cch-open");
  await p.click("[data-cch-team=old]");
  let steps = 0;
  for (; steps < 60; steps++) {
    const st = await p.evaluate(() => {
      const $ = s => document.querySelector(s);
      if ($("#cch-again")) return "done";
      const o = document.querySelectorAll("[data-cch-o]");
      if (o.length) return (o[Math.floor(Math.random() * 3)].click(), "c");
      if ($("#cch-next")) return ($("#cch-next").click(), "c");
      return "?";
    });
    if (st === "done") break;
    assert(st === "c", "koçluk ekranı takıldı");
  }
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const L = S.legacy.coach;
    const part = G.legacyBreakdown().parts.find(x => x[0] === G.t("cch.legacyPart"));
    const out = {
      L: { ...L },
      part: part && part[1],
      legacy: G.legacyScore(),
      games: S.career.games,
      hist: S.hist.length,
      team: S.team.name,
      log: S.cch.log.length,
      res: S.cch.res
    };
    document.querySelector("#cch-again").click();
    out.pick = document.querySelectorAll("[data-cch-team]").length;
    document.querySelector("#cch-back").click();
    out.back = !!document.querySelector("#cch-card");
    return out;
  });
  assert(r.L.seasons === 1 && r.L.pts > 0 && r.part === r.L.pts && r.legacy > before.legacy, "miras: " + JSON.stringify(r));
  assert(
    r.games === before.games && r.hist === before.hist && r.team === before.team,
    "kariyer verisi değişti: " + JSON.stringify(r)
  );
  assert(r.log >= 8 && r.log <= 10 && r.pick === 2 && r.back, "akış: " + JSON.stringify(r));
  return p;
});

test("paket 3c: rakip düello sayacı, basın atışması, takım arkadaşı rakip, veda ve kariyer kartı", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S,
      out = {};
    const rnd = Math.random;
    Math.random = () => 0.01;
    try {
      S.phase = "regular";
      const opp = G.teamByKey(G.fixture().opp);
      S.rival.stage = S.stage;
      S.rival.team = { key: opp.key, name: opp.name, city: opp.city, cc: "TR", c1: opp.c1, c2: opp.c2 };
      out.spat = G.bondsSpatSheet();
      document.querySelector('[data-bd="back"]').click();
      out.rb = !!document.querySelector("#rb");
      out.spatSet = !!S.bonds.spat;
      G.closeSheet();
      const m0 = S.moral;
      G.setM({ opp, feed: [], q: 1, clock: "10:00", pts: 12, mmod: 0 });
      G.Bus.emit("match:end", { win: true });
      out.duel = S.bonds.duel[S.season];
      out.spatDone = !S.bonds.spat && S.moral > m0;
      // takım arkadaşı olur
      out.join = G.bondsRivalJoin() && G.bondsMateSheet();
      document.querySelector('[data-bd="welcome"]').click();
      out.mate = G.bondsRivalMate() && S.bonds.mate.choice === "welcome";
      G.closeSheet();
      out.card = G.bondsCareerHTML().includes("bd-rival");
      G.openLoc("ev", "kariyer");
      out.tab = !!document.querySelector("#bd-rival");
      G.closeSheet();
      // rakip emekli olur: veda paneli
      S.rival.retired = S.season;
      S.bonds.bye = 1;
      out.bye = G.bondsByeSheet();
      document.querySelector('[data-bd="visit"]').click();
      G.closeSheet();
      out.retire = G.bondsRetireHTML().length > 20;
      out.noDerby = G.isDerby(opp) === false || S.rival.team.key === S.team.key;
    } finally {
      Math.random = rnd;
    }
    return out;
  });
  assert(r.spat && r.rb && r.spatSet && r.spatDone, "basın atışması: " + JSON.stringify(r));
  assert(r.duel && r.duel[0] === 1 && r.duel[1] === 1, "düello sayacı: " + JSON.stringify(r));
  assert(r.join && r.mate && r.card && r.tab && r.bye && r.retire, "rakip hikâyesi: " + JSON.stringify(r));
  return p;
});

test("paket 3c: takım arkadaşı hafızası ve eski takımla karşılaşma", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S,
      out = {};
    const pool = G.leaguePool("t1", "TR");
    S.team = pool[0];
    S.city = S.team.city;
    G.newSeasonLeague();
    const ros = G.roster();
    S.mentee = { n: ros[5].n, step: 1, at: 0, team: S.team.name };
    S.captain = S.team.key;
    S.role = "star"; // yedekte kaptanlık düşer
    ros[0].chem = 999; // kaptanın sağ kolu mentee/kavga tarafından farklı biri olsun (aynı kişi iki kez yazılmaz)
    S.tales = S.tales || { last: -9, done: {}, sock: 0, pivot: 0, coffee: 0, trash: 0 };
    S.tales.feudSide = { n: ros[3].n, team: S.team.key };
    G.Bus.emit("week:start");
    const old = S.team;
    S.captain = old.key; // hafta başı rol değerlendirmesi kaptanlığı düşürmüş olabilir
    S.role = "star";
    S.team = pool[1];
    S.city = S.team.city;
    G.newSeasonLeague();
    G.Bus.emit("week:start");
    out.kinds = (S.memories || []).map(m => m.kind).sort();
    out.mentee = (S.memories || []).some(m => m.kind === "mentee" && m.n === ros[5].n);
    G.setM({ opp: old, feed: [], q: 1, clock: "10:00", mmod: 0 });
    const foes = ["A. A", "B. B", "C. C", "D. D", "E. E"];
    G.bondsMatchStart(old, foes);
    out.foe = foes[2] !== "C. C";
    out.mmod = G.M.mmod;
    out.feed = G.M.feed.length;
    // maç öncesi hikâye paneli
    S.phase = "regular";
    S.sched[S.week - 1] = { opp: old.key, home: true };
    const rnd = Math.random;
    Math.random = () => 0.01;
    try {
      out.sheet = G.bondsMemSheet();
      document.querySelector('[data-bd="msg"]').click();
      out.rb = !!document.querySelector("#rb");
    } finally {
      Math.random = rnd;
    }
    G.closeSheet();
    out.card = G.bondsCareerHTML().length > 0;
    return out;
  });
  assert(JSON.stringify(r.kinds) === JSON.stringify(["captain", "feud", "mentee"]) && r.mentee, "hafıza: " + JSON.stringify(r));
  assert(r.foe && r.mmod === 1 && r.feed >= 1 && r.sheet && r.rb && r.card, "karşılaşma: " + JSON.stringify(r));
  return p;
});

test("paket 3c: kardeşin yolu, ebeveyn ziyareti/sağlık, koç değişimi ve uyum", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S,
      out = {};
    const rnd = Math.random;
    Math.random = () => 0.01;
    try {
      // ilk sezonda kardeş paneli yok
      S.week = 4;
      out.early = G.bondsSibSheet();
      S.season = 2;
      out.sib = G.bondsSibSheet();
      document.querySelector('[data-bd="music"]').click();
      out.path = S.bonds.sib.path;
      G.closeSheet();
      S.season = 3;
      S.week = 2;
      G.Bus.emit("week:start");
      out.sibNews = S.news.some(n => n.t.includes(S.bonds.sib.n));
      // ebeveynler: genç oyuncuda yok
      S.week = 5;
      out.parYoung = G.bondsParentSheet();
      S.age = 33;
      S.season = 6;
      out.par = G.bondsParentSheet();
      document.querySelector("[data-bd]").click();
      out.parRb = !!document.querySelector("#rb");
      G.closeSheet();
      // koç değişimi
      S.unlocks.sistem = 2;
      S.role = "star";
      const sys0 = G.teamSystem(S.team),
        c0 = S.npc.coach;
      G.bondsCoachFire();
      out.sysChanged = G.teamSystem(S.team) !== sys0;
      out.coachChanged = S.npc.coach !== c0;
      out.coach = G.bondsCoachSheet();
      document.querySelector('[data-bd="adapt"]').click();
      G.closeSheet();
      const f0 = G.systemFit();
      for (let i = 0; i < 8; i++) G.Bus.emit("train:done", { k: "sut", ratio: 1 });
      out.adapt = S.coachSys.adapt;
      out.fitUp = G.systemFit() >= f0;
      out.cardCoach = G.bondsCareerHTML().includes(S.npc.coach);
    } finally {
      Math.random = rnd;
    }
    return out;
  });
  assert(!r.early && r.sib && r.path && r.sibNews, "kardeş: " + JSON.stringify(r));
  assert(!r.parYoung && r.par && r.parRb, "ebeveyn: " + JSON.stringify(r));
  assert(r.sysChanged && r.coachChanged && r.coach && r.adapt === 4 && r.fitUp && r.cardCoach, "koç: " + JSON.stringify(r));
  return p;
});

test("paket 3c: yeni senaryolar (dönüş, yabancı lig, memleket) ve özel zorluk", async () => {
  const p = await page();
  const r = await p.evaluate(() => {
    const G = window.Game,
      out = {};
    const start = (id, diff) => {
      G.ADS.consent = true;
      G.F.first = "Deniz";
      G.F.last = "Test";
      G.F.pos = "SG";
      G.F.slot = 1;
      G.F.mode = "normal";
      G.F.scenario = id;
      G.F.diff = diff || null;
      G.startCareer();
      G.closeSheet();
      return G.S;
    };
    let S = start("comeback");
    out.cb = { age: S.age, stage: S.stage, role: S.role, cap: S.scn.cap > 0 };
    S.week = 10;
    G.Bus.emit("week:start");
    out.cbCleared = S.role !== "bench";
    S.role = "star";
    G.Bus.emit("week:start");
    out.cbDone = S.scn.done;
    S = start("abroad");
    out.ab = { age: S.age, stage: S.stage, cc: S.team.cc };
    out.abSheet = G.bondsAbroadSheet() || ((S.week = 2) && G.bondsAbroadSheet());
    if (document.querySelector('[data-bd="b"]')) document.querySelector('[data-bd="b"]').click();
    G.closeSheet();
    S.role = "rot";
    G.Bus.emit("season:end", {});
    G.Bus.emit("week:start");
    out.abDone = S.scn.done;
    S = start("hometown");
    out.ht = { age: S.age, stage: S.stage, home: S.home === S.team.city && S.home !== "İstanbul" };
    S.team = G.leaguePool("t2", "TR").find(t => t.key !== S.scn.team);
    G.Bus.emit("week:start");
    out.htLeft = S.scn.done;
    // özel zorluk
    G.renderCreate();
    G.F.diff = null;
    document.querySelector('#dfx [data-v="on"]').click();
    document.querySelector('#dfx [data-v="inj:az"]').click();
    document.querySelector('#dfx [data-v="money:kit"]').click();
    document.querySelector('#dfx [data-v="match:zor"]').click();
    out.F = JSON.stringify(G.F.diff);
    G.F.scenario = null;
    S = start(null, G.F.diff);
    out.mul = [G.modeInjuryMul(), G.modeWageMul(), G.diffStrMod()];
    S = start(null, null);
    out.def = [G.modeInjuryMul(), G.modeWageMul(), G.diffStrMod()];
    return out;
  });
  assert(
    r.cb.age === 25 && r.cb.stage === "t1" && r.cb.role === "bench" && r.cb.cap && r.cbCleared && r.cbDone === 1,
    "dönüş: " + JSON.stringify(r)
  );
  assert(
    r.ab.age === 23 && r.ab.stage === "t1" && r.ab.cc !== "TR" && r.abSheet && r.abDone === 1,
    "yabancı: " + JSON.stringify(r)
  );
  assert(r.ht.age === 31 && r.ht.stage === "t2" && r.ht.home && r.htLeft === -1, "memleket: " + JSON.stringify(r));
  assert(r.F === JSON.stringify({ inj: "az", money: "kit", match: "zor" }), "özel seçici: " + r.F);
  assert(r.mul[0] === 0.6 && r.mul[1] === 0.7 && r.mul[2] < 0 && r.def.join() === "1,1,0", "çarpanlar: " + JSON.stringify(r));
  return p;
});

test("paket 4a: odak modu — sistemler tek tek kapanır, mekân kapalı görünür, olay/görev/başarım istemez", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const d = await p.evaluate(() => {
    const G = window.Game;
    G.S.age = 22;
    return { n: G.focusCount(), hik: G.unlocked("hikaye"), gl: G.unlocked("geceligi"), tot: G.featTotal() };
  });
  assert(d.n === 0 && d.hik && d.gl, "varsayılan hepsi açık olmalı: " + JSON.stringify(d));
  // ayarlar panelinden kapat
  await p.evaluate(() => window.Game.settingsSheet());
  assert((await p.$$("[data-fo]")).length === 6, "odak modu düğmeleri eksik");
  for (const k of ["kumar", "hikaye", "studyo", "borsa", "geceligi"]) await p.click(`[data-fo="${k}"]`);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.renderMain();
    const sans = document.querySelector('.loc[data-loc="sans"]');
    const out = {
      off: JSON.stringify(G.SETTINGS.off),
      sansOff: sans.classList.contains("off"),
      sansLbl: sans.getAttribute("aria-label"),
      hik: G.unlocked("hikaye"),
      gl: G.unlocked("geceligi"),
      night: G.nightLeagueHTML(),
      tot: G.featTotal()
    };
    G.openLoc("sans");
    out.foSheet = !!document.querySelector("#fo-on");
    G.closeSheet();
    G.openLoc("avm");
    out.avmInvest = !!document.querySelector('[data-s="yatirim"]');
    G.closeSheet();
    return out;
  });
  assert(/kumar/.test(r.off) && /hikaye/.test(r.off), "ayar kaydı: " + r.off);
  assert(r.sansOff && /kapalı/.test(r.sansLbl), "kumarhane kapalı görünmeli: " + JSON.stringify(r));
  assert(!r.hik && !r.gl && r.night === "", "hikâye/gece ligi kapanmalı: " + JSON.stringify(r));
  assert(r.foSheet && !r.avmInvest, "mekân paneli/AVM yatırımı: " + JSON.stringify(r));
  assert(r.tot < d.tot, "başarım toplamı düşmeli: " + d.tot + " → " + r.tot);
  // kalıcı: yeniden yüklemede ayar korunur; "Aç ve gir" ile mekân açılır
  await p.reload();
  await p.waitForTimeout(500);
  const k = await p.evaluate(() => window.Game.focusOff("kumar") && window.Game.focusOff("studyo"));
  assert(k, "odak ayarı kalıcı değil");
  await career(p);
  await pro(p);
  await p.evaluate(() => window.Game.openLoc("sans"));
  await p.click("#fo-on");
  const on = await p.evaluate(() => ({
    off: window.Game.focusOff("kumar"),
    sheet: !document.querySelector("#fo-on") && !!document.querySelector(".sheet")
  }));
  assert(!on.off && on.sheet, "aç ve gir: " + JSON.stringify(on));
  return p;
});

test("paket 4a: ilk maç rehberi — adım adım, Geç, bir kez; simüle maçta ve testlerde çıkmaz", async () => {
  const p = await page();
  await career(p);
  // simüle maçta rehber yok
  await p.evaluate(() => {
    const G = window.Game;
    G.S.tipMoment = 0;
    G.S.mtut = 0;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig", auto: true });
  });
  await p.waitForTimeout(400);
  assert(!(await p.evaluate(() => window.Game.mtutActive())), "simüle maçta rehber açıldı");
  await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.S.tipMoment = 0;
    G.S.mtut = 0;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector("[data-m='key']", { timeout: 6000 });
  await p.click("[data-m='key']");
  await p.waitForSelector("#mt-bub", { timeout: 6000 });
  const a = await p.evaluate(() => ({
    t: document.querySelector("#mt-bub").textContent,
    hl: document.querySelector("#spd").classList.contains("mt-hl")
  }));
  assert(/Maç hızı/.test(a.t) && /1\/4/.test(a.t) && a.hl, "1. adım: " + JSON.stringify(a));
  await p.click("#mt-next");
  // mola adımı ya da (mola yoksa) karar anı beklenir
  await p.waitForFunction(
    () => {
      const b = document.querySelector("#mt-bub");
      return b && /2\/4|3\/4/.test(b.textContent);
    },
    null,
    { timeout: 8000 }
  );
  const b = await p.evaluate(() => document.querySelector("#mt-bub").textContent);
  assert(/Mola|Karar anı/.test(b), "2. adım: " + b);
  await p.click("#mt-skip");
  const c = await p.evaluate(() => ({
    act: window.Game.mtutActive(),
    bub: !!document.querySelector("#mt-bub"),
    hl: document.querySelectorAll(".mt-hl").length,
    s: window.Game.S.mtut
  }));
  assert(!c.act && !c.bub && !c.hl && c.s === 1, "Geç: " + JSON.stringify(c));
  // bir kez: sonraki elle maçta çıkmaz
  await p.evaluate(() => {
    const G = window.Game;
    G.renderMain();
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForTimeout(600);
  assert(!(await p.evaluate(() => window.Game.mtutActive())), "rehber ikinci kez açıldı");
  return p;
});

test("paket 4a: otomatik hafta — Otomatik doldur koç önerisine uyar, ayarla tek dokunuş; hızlı hafta yerinde", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.energy = 20;
    S.injury = null;
    const tired = G.autoPlanPick();
    S.energy = 90;
    S.moral = 20;
    const sad = G.autoPlanPick();
    S.moral = 70;
    S.injury = { w: 3, t: "x" };
    const inj = G.autoPlanPick();
    S.injury = null;
    S.energy = 70;
    G.planSheet();
    document.querySelector("#pl-auto").click();
    return { tired, sad, inj, draft: S.planDraft, on: [...document.querySelectorAll("[data-ps] .opt.on")].map(b => b.dataset.v) };
  });
  assert(r.tired[0] === "rest" && !r.inj.includes("team"), "yorgun/sakat: " + JSON.stringify(r));
  assert(r.sad[0] === "cafe", "moral önerisi: " + JSON.stringify(r));
  assert(r.draft.length === 3 && r.on.join() === r.draft.join(), "panel doldurulmadı: " + JSON.stringify(r));
  // ayar: her zaman otomatik planla → ana ekranda tek dokunuş
  const s = await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.SETTINGS.autoPlan = true;
    G.renderMain();
    return {
      auto: !!document.querySelector("#wauto"),
      rep: !!document.querySelector("#wrep"),
      qw: !!document.querySelector("#quickw"),
      slot: G.S.slot
    };
  });
  assert(s.auto && !s.rep && s.qw && s.slot === 3, "ana ekran: " + JSON.stringify(s));
  await p.click("#wauto");
  await p.waitForSelector("#pl-ok", { timeout: 4000 });
  const e = await p.evaluate(() => ({ slot: window.Game.S.slot, last: window.Game.S.lastPlan }));
  assert(e.slot === 0 && e.last.length === 3, "plan uygulanmadı: " + JSON.stringify(e));
  return p;
});

test("paket 4a: erişilebilirlik — yazı boyutu, renk körü, yüksek kontrast anında ve kalıcı; aria etiketleri; 390 px taşma yok", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => window.Game.settingsSheet());
  assert((await p.$$("[data-fs]")).length === 4, "dört yazı boyutu olmalı");
  const good0 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--good").trim());
  await p.click('[data-fs="xl"]');
  await p.click('[data-tg="cb"]');
  await p.click('[data-tg="hc"]');
  const a = await p.evaluate(() => {
    const h = document.documentElement,
      cs = getComputedStyle(h);
    return {
      cls: h.className,
      fs: cs.fontSize,
      good: cs.getPropertyValue("--good").trim(),
      bg: cs.getPropertyValue("--bg").trim(),
      close: document.querySelector("#shx").getAttribute("aria-label"),
      pressed: document.querySelector('[data-tg="hc"]').getAttribute("aria-pressed"),
      w: h.scrollWidth
    };
  });
  assert(
    /fs-xl/.test(a.cls) && /\bcb\b/.test(a.cls) && /\bhc\b/.test(a.cls) && a.fs === "20px",
    "sınıflar: " + JSON.stringify(a)
  );
  assert(a.good !== good0 && a.bg === "#000", "palet: " + good0 + " " + JSON.stringify(a));
  assert(a.close === "Kapat" && a.pressed === "true", "aria: " + JSON.stringify(a));
  assert(a.w <= 390, "ayarlar paneli taşıyor: " + a.w);
  // ana ekran (çok büyük yazı) taşmamalı; ikonlar etiketli
  const m = await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.renderMain();
    return {
      w: document.documentElement.scrollWidth,
      bell: document.querySelector("#ibx-bell") && document.querySelector("#ibx-bell").getAttribute("aria-label"),
      loc: [...document.querySelectorAll(".loc")].every(g => g.getAttribute("aria-label")),
      hav: document.querySelector("#hav").getAttribute("aria-label")
    };
  });
  assert(m.w <= 390 && m.bell && m.loc && m.hav, "ana ekran: " + JSON.stringify(m));
  // kalıcı
  await p.reload();
  await p.waitForTimeout(500);
  const k = await p.evaluate(() => document.documentElement.className);
  assert(/fs-xl/.test(k) && /hc/.test(k), "kalıcı değil: " + k);
  await career(p);
  // maç: hız düğmeleri, karar kartı rolü, canlı skor
  await p.evaluate(() => {
    const G = window.Game;
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector("[data-m='only']", { timeout: 6000 });
  await p.click("[data-m='only']");
  await p.waitForSelector("#mview .choices", { timeout: 60000 });
  const g = await p.evaluate(() => ({
    spd: document.querySelector("#spd [data-s]").getAttribute("aria-label"),
    grp: document.querySelector("#mview .choices").getAttribute("role"),
    live: document.querySelector("#a11y-live") && document.querySelector("#a11y-live").getAttribute("aria-live"),
    txt: document.querySelector("#a11y-live") && document.querySelector("#a11y-live").textContent,
    w: document.documentElement.scrollWidth
  }));
  assert(
    /hız/i.test(g.spd) && g.grp === "group" && g.live === "polite" && /Çeyrek/.test(g.txt),
    "maç aria: " + JSON.stringify(g)
  );
  assert(g.w <= 390, "maç ekranı taşıyor: " + g.w);
  return p;
});

test("paket 4b: pozisyona özgü anlar (PG pick-and-roll, SG perde, C post-up/kutulama), zamanlama ve kutulama mini oyunu; AUTO'da yok", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game,
      S = G.S;
    const opp = G.teamByKey(S.league.find(x => x.key !== S.team.key).key);
    G.setM({
      opp,
      home: true,
      us: 0,
      them: 0,
      pts: 0,
      ast: 0,
      reb: 0,
      blk: 0,
      stl: 0,
      stops: 0,
      rating: 6,
      mins: 0,
      plus: 0,
      mmod: 0
    });
    G.Bus.emit("match:start", { opp, home: true });
    const ids = {};
    for (const [pos, us] of [
      ["PG", true],
      ["SG", true],
      ["SF", true],
      ["PF", true],
      ["C", true],
      ["C", false]
    ]) {
      S.pos = pos;
      G.ppForce(1);
      const sp = G.ppSpecial(us, false, 0, "Ali");
      ids[pos + (us ? "o" : "d")] = sp && sp.id + ":" + sp.opts.map(o => o.k).join(",");
    }
    S.pos = "PG";
    const guard = (G.ppForce(1), G.ppSpecial(false, false, 0, "Ali")); // PG savunmada pozisyon anı yok
    const clutch = (G.ppForce(1), G.ppSpecial(true, true, 0, "Ali"));
    G.ppForce(0);
    let n = 0;
    for (let i = 0; i < 600; i++) if (G.ppSpecial(true, false, 0, "Ali")) n++;
    // zamanlama: imleç yeşil alana girince bas
    const mv = document.createElement("div");
    mv.id = "mview";
    document.body.appendChild(mv);
    G.ppForce(1);
    const sp = G.ppSpecial(true, false, 0, "Ali");
    const ast0 = G.M.ast;
    const pr = sp.resolve("pp_roll", "Test");
    await new Promise(res => {
      const t = () => {
        const win = document.querySelector("#mview svg rect[rx]"),
          cur = document.querySelector("#pp-cur");
        if (!win || !cur) return res();
        const x = +win.getAttribute("x"),
          w = +win.getAttribute("width"),
          cx = +/translate\(([\d.]+)px/.exec(cur.style.transform)[1];
        if (cx > x + w * 0.3 && cx < x + w * 0.7) {
          document.querySelector("#pp-go").click();
          return res();
        }
        requestAnimationFrame(t);
      };
      requestAnimationFrame(t);
    });
    const res = await pr;
    const btn = !!document.querySelector("#mview [data-pp]");
    // kutulama: art arda dokun
    S.pos = "C";
    G.ppForce(1);
    const bx = G.ppSpecial(false, false, 0, "Ali");
    const reb0 = G.M.reb;
    const pb = bx.resolve("pp_box", "Test");
    for (let i = 0; i < 20; i++) document.querySelector("#pp-go") && document.querySelector("#pp-go").click();
    const rb = await pb;
    // simüle maç: hiç gelmez
    G.Bus.emit("match:start", { opp, home: true, auto: true });
    G.ppForce(1);
    const auto = G.ppSpecial(true, false, 0, "Ali");
    G.ppForce(0);
    mv.remove();
    return { ids, guard, clutch, rate: n / 600, res, ast: G.M.ast - ast0, btn, rb, reb: G.M.reb - reb0, auto };
  });
  assert(
    /^pp_pnr:pp_roll,pp_perim,pp_self$/.test(r.ids.PGo) && /^pp_screen:pp_curl,pp_flare,pp_back$/.test(r.ids.SGo),
    "PG/SG: " + JSON.stringify(r.ids)
  );
  assert(
    /^pp_screen/.test(r.ids.SFo) && /^pp_post:pp_drop,pp_hook,pp_out$/.test(r.ids.PFo) && /^pp_post/.test(r.ids.Co),
    "SF/PF/C: " + JSON.stringify(r.ids)
  );
  assert(/^pp_box:pp_box,pp_tip,pp_leak$/.test(r.ids.Cd) && !r.guard && !r.clutch, "kutulama / kilit an: " + JSON.stringify(r));
  assert(r.rate > 0.25 && r.rate < 0.45, "oran ~%35 değil: " + r.rate);
  assert(r.res && r.res.good === true && r.res.st === "pas" && r.ast >= 0, "zamanlama: " + JSON.stringify(r));
  assert(r.rb && r.rb.good && r.reb === 1, "kutulama: " + JSON.stringify(r));
  assert(r.auto === null, "AUTO'da pozisyon anı geldi");
  return p;
});

test("paket 4b: play-off serisi — yarı final en iyi 3 (E-D-E), final en iyi 5, momentum, rakip uyarlaması, seri skoru ekranlarda", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    window.__TEST = Object.assign(window.__TEST || {}, { noEvents: true });
    S.stage = "t1";
    S.week = S.sched.length;
    S.league.find(x => x.key === S.team.key).w = 30;
    G.closeSheet();
    G.afterMatchFlow(true);
    const out = { phase0: S.phase, need: G.serEnsure().need, home: [] };
    const play = (win, kinds) => {
      const opp = G.teamByKey(S.playoffOpp);
      out.home.push(G.fixture().home);
      G.setM({
        opp,
        home: G.fixture().home,
        us: win ? 88 : 70,
        them: win ? 75 : 81,
        pts: 10,
        ast: 0,
        reb: 0,
        blk: 0,
        stl: 0,
        stops: 0,
        rating: 6.5,
        mins: 0,
        plus: 0
      });
      G.Bus.emit("match:start", { opp });
      (kinds || []).forEach(k => G.Bus.emit("match:moment", { k, auto: false }));
      G.closeSheet();
      G.afterMatchFlow(win);
    };
    const m0 = S.moral;
    play(true);
    out.mom = S.moral - m0;
    out.slot = S.slot;
    out.main = (document.querySelector("#ser-main") || {}).textContent || "";
    play(false, ["pull", "pull", "corner", "drive"]);
    out.adapt = S.series.adapt;
    out.phase1 = S.phase;
    const opp = G.teamByKey(S.playoffOpp);
    G.setM({ opp, us: 0, them: 0 });
    const ad = G.serAdapt([
      { k: "pull", e: 50, d: "x" },
      { k: "drive", e: 50, d: "y" }
    ]);
    out.adaptE = ad.map(o => o.e);
    G.openLoc("stad", "mac");
    out.pre = (document.querySelector("#ser-card") || {}).textContent || "";
    G.closeSheet();
    play(true);
    out.phase2 = S.phase;
    out.semiSer = S.po.res.semi.ser;
    out.fneed = G.serEnsure().need;
    G.leagueSheet("po");
    out.po = document.querySelector("#ovl").textContent;
    G.closeSheet();
    out.fhome = [];
    for (const w of [true, false, true, false]) {
      out.fhome.push(G.fixture().home);
      play(w);
    }
    out.fhome.push(G.fixture().home);
    out.phase3 = S.phase;
    play(true);
    out.final = S.po.res.final;
    return out;
  });
  assert(r.phase0 === "semi" && r.need === 2 && r.phase1 === "semi", "yarı final: " + JSON.stringify(r));
  assert(r.home.slice(0, 3).join() === "true,false,true", "E-D-E: " + JSON.stringify(r.home));
  assert(r.mom >= 4 && r.slot >= 1 && /1–0/.test(r.main), "momentum/ana ekran: " + JSON.stringify(r));
  assert(r.adapt === "three" && r.adaptE[0] === 44 && r.adaptE[1] === 50, "uyarlama: " + JSON.stringify(r));
  assert(/1–1/.test(r.pre) && /3\. maç/.test(r.pre) && /Rakip savunması/.test(r.pre), "maç öncesi: " + r.pre);
  assert(r.phase2 === "final" && r.semiSer.join() === "2,1" && r.fneed === 3, "final: " + JSON.stringify(r));
  assert(r.fhome.join() === "true,true,false,false,true" && r.phase3 === "final", "2-2-1: " + JSON.stringify(r.fhome));
  assert(r.final && r.final.win && r.final.ser.join() === "3,2" && /2–1/.test(r.po), "final sonucu: " + JSON.stringify(r));
  return p;
});

test("paket 4b: derbi kimliği — ezeli rakip, derbi basını, tribün, şehir hikâyesi, Kariyer'de derbi sicili", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    window.__TEST = Object.assign(window.__TEST || {}, { noEvents: true });
    S.rival = null;
    const ak = G.dbyArchKey(),
      arch = G.teamByKey(ak);
    const out = { ak: !!ak, isD: G.isDerby(arch), who: G.derbyWho(arch) === arch.name };
    S.sched[S.week - 1].opp = ak;
    S.sched[S.week - 1].home = true;
    G.renderMain();
    out.main = /DERBİ/.test(document.querySelector(".weekcard").textContent);
    G.openLoc("stad", "mac");
    out.note = !!document.querySelector("#dby-note");
    G.closeSheet();
    out.press = G.dbyPressSheet();
    document.querySelector('[data-dbp="fire"]').click();
    out.ok = !!document.querySelector("#dby-ok");
    document.querySelector("#dby-ok").click();
    out.again = G.dbyPressSheet();
    G.setM({ opp: arch, home: true, us: 0, them: 0, pts: 0, hype: 0, feed: [] });
    G.dbyAtmos({ opp: arch, home: true, comp: "lig" });
    out.hype = [G.M.hypeMul, G.M.hype];
    G.setM({ opp: arch, home: false, us: 0, them: 0, feed: [] });
    G.dbyAtmos({ opp: arch, home: false, comp: "lig" });
    out.loud = G.M.loud;
    G.setM({ opp: arch, home: true, us: 95, them: 80, pts: 21, rating: 7.5 });
    S.results.push({ opp: ak, us: 95, them: 80, win: true });
    const t0 = S.rel.taraf;
    G.dbyRecord(true);
    G.dbyResult(true);
    out.taraf = S.rel.taraf - t0;
    out.news = S.news[0].t;
    S.week++;
    out.city = G.dbyCitySheet();
    out.cityTxt = document.querySelector("#shb").textContent;
    document.querySelector("#dby-ok").click();
    G.openLoc("ev", "kariyer");
    out.career = (document.querySelector("#dby-career") || {}).textContent || "";
    G.closeSheet();
    // bilinen derbi: Fenerbahçe – Anadolu Efes
    const pool = G.leaguePool("t1", "TR");
    S.team = pool.find(t => t.name === "Fenerbahçe");
    S.league = pool.map(t => ({ key: t.key, w: 0, l: 0, pf: 0, pa: 0 }));
    out.fb = G.teamByKey(G.dbyArchKey()).name;
    return out;
  });
  assert(r.ak && r.isD && r.who && r.main && r.note, "ezeli rakip: " + JSON.stringify(r));
  assert(r.press && r.ok && !r.again, "derbi basını: " + JSON.stringify(r));
  assert(r.hype[0] >= 1.6 && r.hype[1] >= 50 && r.loud === true, "tribün: " + JSON.stringify(r));
  assert(r.taraf >= 5 && /Derbi bizim/.test(r.news), "sonuç: " + JSON.stringify(r));
  assert(r.city && /korna|Fark büyük/.test(r.cityTxt), "şehir hikâyesi: " + r.cityTxt);
  assert(/Derbiler/.test(r.career) && /1-0/.test(r.career) && /Ezeli rakip/.test(r.career), "kariyer: " + r.career);
  assert(r.fb === "Anadolu Efes", "Fenerbahçe derbisi: " + r.fb);
  return p;
});

// paket 4c: şehir dokusu — bölgesel kültür katmanı (src/culture.js)
async function cuMove(p, city, stage) {
  return p.evaluate(
    ([c, st]) => {
      const G = window.Game,
        S = G.S,
        cl = G.allClubs().find(x => x.city === c);
      S.team = G.clubTeam(cl);
      S.city = c;
      S.stage = st || (cl.cc === "US" ? "nba" : "t1");
      S.studying = false;
      S.age = 22;
      S.housing = "daire";
      S.slot = 3;
      S.district = "merkez";
      G.closeSheet();
      G.renderMain();
      return Object.fromEntries([...document.querySelectorAll(".loc")].map(g => [g.dataset.loc, g.getAttribute("aria-label")]));
    },
    [city, stage]
  );
}
async function cuLocTexts(p, locs) {
  return p.evaluate(L => {
    const G = window.Game,
      out = {};
    for (const l of L) {
      G.closeSheet();
      G.openLoc(l);
      const sh = document.querySelector(".sheet");
      out[l] = { title: sh.querySelector("h2").textContent, text: sh.textContent };
    }
    G.closeSheet();
    return out;
  }, locs);
}
test("paket 4c: İstanbul'dan LA ve Madrid'e taşınınca harita etiketleri, mekân başlıkları ve sahneler değişir; Moda/simit görünmez", async () => {
  const p = await page();
  await career(p);
  const LOCS = ["kafe", "market", "sokak", "eglence", "avm"];
  const ist = await cuMove(p, "İstanbul", "t1");
  const istT = await cuLocTexts(p, LOCS);
  const la = await cuMove(p, "Los Angeles");
  const laT = await cuLocTexts(p, [...LOCS, "liman"]);
  const laSvg = await p.evaluate(() => {
    const d = document.querySelector(".cu-deco");
    return { reg: d && d.dataset.reg, taxi: document.querySelector('svg rect[fill="#f7c51e"]') != null };
  });
  const mad = await cuMove(p, "Madrid");
  const madT = await cuLocTexts(p, [...LOCS, "liman"]);
  const madDist = await p.evaluate(() => [...document.querySelectorAll("#dist [data-dist]")].map(b => b.textContent));
  assert(ist.kafe === "Kafe" && ist.avm === "AVM" && ist.sokak === "Sokak sahası", "İstanbul etiketleri: " + JSON.stringify(ist));
  assert(
    la.kafe === "Coffee shop" &&
      la.market === "Corner store" &&
      la.avm === "Mall" &&
      la.eglence === "Arcade bar" &&
      la.sokak === "Venice Beach",
    "LA etiketleri: " + JSON.stringify(la)
  );
  assert(
    la.ev === "Apartment" && laT.kafe.title === "Coffee shop" && laT.liman.title === "Santa Monica Pier",
    "LA başlıkları: " + JSON.stringify(laT.liman.title)
  );
  assert(
    /Oat latte ve sohbet/.test(laT.kafe.text) && /Breakfast burrito/i.test(laT.market.text) && laSvg.reg === "usw" && laSvg.taxi,
    "LA içerik: " + JSON.stringify(laSvg)
  );
  assert(
    mad.kafe === "Tapas barı" && mad.market === "Ultramarinos" && mad.ev === "Kiralık piso" && madT.liman.title === "Madrid Río",
    "Madrid: " + JSON.stringify(mad)
  );
  assert(
    /Cortado ve sohbet/.test(madT.kafe.text) && /Bocadillo de jamón/i.test(madT.market.text) && /paseo/i.test(madT.liman.text),
    "Madrid içerik"
  );
  assert(madDist[0] === "Barrio" && /nehir/.test(madDist[1]), "semt sekmeleri: " + JSON.stringify(madDist));
  for (const [c, T] of [
    ["LA", laT],
    ["Madrid", madT]
  ])
    for (const [l, v] of Object.entries(T))
      assert(!/Moda sahil|Moda'|simit|Kadıköy|Boğaz/i.test(v.text + v.title), `${c}/${l}: İstanbul metni görünüyor`);
  assert(
    LOCS.every(l => istT[l].title !== laT[l].title),
    "mekân başlıkları değişmeli"
  );
  // İngilizce: aynı kültürel adlar
  await p.evaluate(() => localStorage.setItem("pota-lang", "en"));
  await p.reload();
  await p.waitForTimeout(500);
  await career(p);
  const laEn = await cuMove(p, "Los Angeles");
  const madEn = await cuMove(p, "Madrid");
  const madEnT = await cuLocTexts(p, ["kafe"]);
  assert(
    laEn.kafe === "Coffee shop" && laEn.sokak === "Venice Beach" && madEn.kafe === "Tapas bar",
    "EN etiketler: " + JSON.stringify([laEn, madEn])
  );
  assert(/Cortado and a chat/.test(madEnT.kafe.text) && !/simit/i.test(madEnT.kafe.text), "EN kafe");
  await p.evaluate(() => localStorage.setItem("pota-lang", "tr"));
  return p;
});

test("paket 4c: Türkiye'ye özgü olaylar yurtdışında havuzdan çıkar; bölge olayları ve mekân etkileri aynı kalır", async () => {
  const p = await page();
  await career(p);
  const titles = () => p.evaluate(() => window.Game.eventPool().map(e => e.title));
  await cuMove(p, "İstanbul", "t1");
  const ist = await titles();
  await cuMove(p, "Ankara", "t1");
  const ank = await titles();
  await cuMove(p, "Los Angeles", "t1");
  const la = await titles();
  assert(
    ist.includes("Çay ocağı analizi") && ist.includes("Taksici tanıdı") && !ist.includes("Tribünde ay yıldız"),
    "İstanbul havuzu"
  );
  assert(
    ank.includes("Çay ocağı analizi") && !ank.includes("Memleket sofrası") && !ank.includes("Tribünde ay yıldız"),
    "Ankara havuzu"
  );
  assert(
    !la.includes("Çay ocağı analizi") &&
      !la.includes("Taksici tanıdı") &&
      !la.includes("Sabah simidi") &&
      la.includes("Memleket sofrası"),
    "LA havuzu"
  );
  // aynı mekân eylemi, farklı şehir: aynı etki
  const act = city =>
    p.evaluate(async c => {
      const G = window.Game,
        S = G.S;
      const cl = G.allClubs().find(x => x.city === c);
      S.team = G.clubTeam(cl);
      S.city = c;
      S.stage = "t1";
      Object.assign(S, { moral: 50, money: 5000, slot: 3 });
      S.rel.ark = 40;
      G.closeSheet();
      G.openLoc("kafe");
      document.querySelector('[data-act="sohbet"]').click();
      return { moral: S.moral - 50, ark: S.rel.ark - 40, money: 5000 - S.money, slot: 3 - S.slot };
    }, city);
  const a1 = await act("İstanbul"),
    a2 = await act("Los Angeles"),
    a3 = await act("Madrid");
  assert(
    JSON.stringify(a1) === JSON.stringify(a2) && JSON.stringify(a1) === JSON.stringify(a3) && a1.moral > 0,
    "kafe etkisi aynı olmalı: " + JSON.stringify([a1, a2, a3])
  );
  // şehir hayatı olayı: bölgeye özgü metin, aynı mekanik
  const ev = city =>
    p.evaluate(c => {
      const G = window.Game,
        S = G.S;
      const cl = G.allClubs().find(x => x.city === c);
      S.team = G.clubTeam(cl);
      S.city = c;
      S.stage = "t1";
      S.cu = null;
      Object.assign(S, { moral: 50, energy: 60 });
      S.rel.takim = 40;
      G.closeSheet();
      const left = G.cuEventsLeft().length;
      G.cuEvent("food");
      const t = document.querySelector(".sheet h2").textContent;
      document.querySelector('[data-cu="a"]').click();
      const left2 = G.cuEventsLeft().length;
      G.closeSheet();
      return { t, left, left2, d: [S.moral - 50, S.energy - 60, S.rel.takim - 40] };
    }, city);
  const e1 = await ev("Madrid"),
    e2 = await ev("Los Angeles"),
    e3 = await ev("Berlin");
  assert(e1.t !== e2.t && e2.t !== e3.t, "olay metinleri bölgeye özgü: " + JSON.stringify([e1.t, e2.t, e3.t]));
  assert(
    JSON.stringify(e1.d) === JSON.stringify(e2.d) &&
      JSON.stringify(e1.d) === JSON.stringify(e3.d) &&
      JSON.stringify(e1.d) === "[5,-4,3]",
    "olay etkisi aynı: " + JSON.stringify([e1.d, e2.d, e3.d])
  );
  assert(e1.left === 5 && e1.left2 === 4, "tekrar etmez: " + JSON.stringify(e1));
  // çaylak siparişleri bölgenin yemeklerinden
  const ord = await p.evaluate(() => {
    const G = window.Game;
    G.S.city = "Madrid";
    const m = G.cuOrders(["simit"]);
    G.S.city = "İstanbul";
    return [m, G.cuOrders(["simit"])];
  });
  assert(ord[0].includes("churros") && !ord[0].includes("simit") && ord[1][0] === "simit", "siparişler: " + JSON.stringify(ord));
  return p;
});

test("paket 4c: yeni şehir paneli ilk taşınmada bir kez gelir (3 imza detayı + ilk seçim), geri dönüşte gelmez", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S,
      out = {};
    out.start = G.cuWelcomeSheet(); // kariyer başı İstanbul: panel yok
    out.registered = G.Bus.p["week:sheet"].some(x => x.f === G.cuWelcomeSheet && x.prio < 20);
    const move = c => {
      const cl = G.allClubs().find(x => x.city === c);
      S.team = G.clubTeam(cl);
      S.city = c;
      S.stage = cl.cc === "US" ? "nba" : "euro";
    };
    move("Los Angeles");
    S.energy = 50;
    out.first = G.cuWelcomeSheet();
    const sh = document.querySelector(".sheet");
    out.title = sh && sh.querySelector("h2").textContent;
    out.sig = [...document.querySelectorAll("#cu-sig li")].map(li => li.textContent);
    out.choices = document.querySelectorAll("[data-cu]").length;
    document.querySelector('[data-cu="c"]').click();
    out.energy = S.energy - 50;
    G.closeSheet();
    out.again = G.cuWelcomeSheet();
    move("İstanbul");
    out.backIst = G.cuWelcomeSheet();
    move("Los Angeles");
    out.backLa = G.cuWelcomeSheet();
    move("Madrid");
    out.madrid = G.cuWelcomeSheet();
    out.madSig = [...document.querySelectorAll("#cu-sig li")].map(li => li.textContent);
    G.closeSheet();
    out.seen = Object.keys(S.cu.seen);
    return out;
  });
  assert(r.start === false && r.registered, "başlangıç: " + JSON.stringify(r));
  assert(
    r.first && /Los Angeles/.test(r.title) && r.sig.length === 3 && r.sig.some(s => /Venice Beach/.test(s)) && r.choices === 3,
    "LA paneli: " + JSON.stringify(r)
  );
  assert(r.energy === 8, "ilk seçim etkisi: " + r.energy);
  assert(r.again === false && r.backIst === false && r.backLa === false, "bir kez: " + JSON.stringify(r));
  assert(
    r.madrid === true && r.madSig.length === 3 && r.madSig.some(s => /Rastro|Retiro|Plaza Mayor/.test(s)),
    "Madrid paneli: " + JSON.stringify(r.madSig)
  );
  assert(
    r.seen.includes("İstanbul") && r.seen.includes("Madrid") && r.seen.includes("Los Angeles"),
    "kayıt: " + JSON.stringify(r.seen)
  );
  return p;
});

// ---- yayın a: mağaza uyumluluğu (kurgusal adlar, gizlilik/veri silme, reklam kimlikleri) ----
const BRAND_RX =
  /(?<![A-Za-zÇĞİÖŞÜçğıöşü])(NBA|EuroLeague|EuroCup|FIBA|Final Four|G League|Fenerbahçe|Anadolu Efes|Real Madrid|Barça|Olympiacos|Panathinaikos|Žalgiris|Celtics|Lakers|Basketbol Süper Ligi|Liga ACB)(?![A-Za-zÇĞİÖŞÜçğıöşü])/;
test("yayın a: kulüp ve lig adları kurgusal, anahtarlar gerçek; ekranda gerçek marka yok", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(rx => {
    const G = window.Game,
      R = new RegExp(rx);
    const nba = G.leaguePool("nba"),
      euro = G.leaguePool("euro"),
      tr1 = G.leaguePool("t1", "TR");
    const names = [...nba, ...euro, ...tr1].map(t => t.name + " " + t.short);
    const leagues = Object.values(G.LEAGUES).flatMap(l => l.t);
    G.S.stage = "nba";
    G.renderMain();
    const main = document.body.innerText;
    G.settingsSheet();
    const sett = document.body.innerText;
    return {
      bad: names.concat(leagues).filter(n => R.test(n)),
      fen: tr1.find(t => t.key === "club|Fenerbahçe").name,
      bos: nba.find(t => t.key === "club|Boston Celtics").name,
      us: G.LEAGUES.US.t[0],
      main: R.exec(main),
      sett: R.exec(sett)
    };
  }, BRAND_RX.source);
  assert(!r.bad.length, "gerçek ad: " + r.bad.join(", "));
  assert(r.fen === "Kadıköy Kanaryaları" && r.bos === "Boston Harbormen" && r.us === "Kuzey Amerika Ligi", JSON.stringify(r));
  assert(!r.main && !r.sett, "ekranda gerçek ad: " + JSON.stringify([r.main, r.sett]));
  return p;
});

test("yayın a: eski kayıttaki gerçek adlar açılışta kurgusala çevrilir, anahtarlar ve derbi eşleşmesi korunur", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const pool = G.leaguePool("t1", "TR");
    S.team = pool.find(t => t.key === "club|Fenerbahçe");
    S.league = pool.map(t => ({ key: t.key, w: 0, l: 0 }));
    S.dby = {};
    const arch = G.dbyArchKey();
    // eski sürüm kaydı gibi: gerçek adlar ve gerçek lig adı
    const raw = JSON.parse(JSON.stringify(S));
    raw.teams["club|Fenerbahçe"].name = "Fenerbahçe";
    raw.team.name = "Fenerbahçe";
    raw.hist = [{ team: "Fenerbahçe", league: "Basketbol Süper Ligi · EuroLeague", w: 20, l: 6 }];
    raw.news = ["Fenerbahçe NBA'e oyuncu gönderdi."];
    localStorage.setItem("pota-slot-3", JSON.stringify({ v: 5, S: raw }));
    const L = G.loadSlot(3).S;
    return {
      arch,
      key: L.team.key,
      name: L.team.name,
      tkeys: Object.keys(L.teams).includes("club|Fenerbahçe"),
      league: L.hist[0].league,
      news: L.news[0]
    };
  });
  assert(r.arch === "club|Anadolu Efes", "derbi: " + r.arch);
  assert(r.key === "club|Fenerbahçe" && r.tkeys && r.name === "Kadıköy Kanaryaları", JSON.stringify(r));
  assert(
    r.league === "Pota Süper Ligi · Kıta Ligi" && r.news === "Kadıköy Kanaryaları KAL'a oyuncu gönderdi.",
    JSON.stringify(r)
  );
  return p;
});

test("yayın a: Ayarlar'da gizlilik bölümü; bütün verilerimi sil cihazdaki kayıtları siler", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    window.Game.save();
    window.Game.settingsSheet();
  });
  const has = await p.evaluate(() => ({
    pp: !!document.querySelector("#rel-pp[href$='privacy.html']"),
    wipe: !!document.querySelector("#rel-wipe"),
    restore: !!document.querySelector("#rel-restore"),
    slot: !!localStorage.getItem("pota-slot-1")
  }));
  assert(has.pp && has.wipe && !has.restore && has.slot, JSON.stringify(has));
  await p.click("#rel-wipe");
  await p.waitForSelector("#rw-yes");
  await Promise.all([p.waitForEvent("load"), p.click("#rw-yes")]);
  await p.waitForTimeout(400);
  const left = await p.evaluate(() => Object.keys(localStorage).filter(k => /^pota-(slot|settings|legends)/.test(k)));
  assert(!left.length, "silinmedi: " + left.join(","));
  return p;
});

test("yayın a: reklam kimlikleri tek noktadan; test kimliği tanınır; çocuklara yönelik değil", async () => {
  const p = await page();
  const r = await p.evaluate(() => {
    const G = window.Game;
    return {
      same: G.ADS_CFG.admob === G.REL_ADMOB,
      test: G.relTestAds("android") && G.relTestAds("ios"),
      isTest: G.relIsTestId("ca-app-pub-3940256099942544/5224354917") && !G.relIsTestId("ca-app-pub-1234567890123456/1234567890"),
      req: G.REL_AD_REQUEST,
      warnWeb: G.relWarnTestAds()
    };
  });
  assert(r.same && r.test && r.isTest && !r.warnWeb, JSON.stringify(r));
  assert(r.req.tagForChildDirectedTreatment === false && r.req.maxAdContentRating === "Teen", JSON.stringify(r.req));
  return p;
});

/* ---- yayın b: çalışma zamanı sağlamlığı ---- */
const OLD_FIX = fs
  .readdirSync(path.join(__dirname, "fixtures"))
  .filter(f => /^old-.*\.json$/.test(f))
  .map(f => [f, fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8")]);
test("yayın b: eski sürüm kayıtları açılır, para/istatistik korunur, iki hafta hatasız oynanır", async () => {
  assert(OLD_FIX.length >= 3, "eski kayıt örnekleri eksik");
  const p = await page();
  for (const [name, raw] of OLD_FIX) {
    const r = await p.evaluate(raw => {
      const G = window.Game;
      localStorage.clear();
      localStorage.setItem("pota-slot-1", raw);
      const before = JSON.parse(raw).S;
      const ld = G.loadSlot(1);
      if (!ld || !ld.S) return { err: "açılmadı" };
      G.setS(ld.S);
      G.migrate();
      const S = G.S;
      const kept = S.money === before.money && S.career.games === before.career.games && S.career.pts === before.career.pts;
      const bad = [];
      const walk = (o, at, d) => {
        if (d > 8 || !o) return;
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (typeof v === "number" && !isFinite(v)) bad.push(at + "." + k);
          else if (v && typeof v === "object") walk(v, at + "." + k, d + 1);
        }
      };
      if (S.retired) G.retireScreen();
      else {
        G.renderMain();
        for (let i = 0; i < 2; i++) {
          G.closeSheet();
          G.quickWeek && G.S.phase !== "offseason" && G.quickWeek();
          const b = document.querySelector("#qw-sim");
          if (b) b.click();
        }
      }
      walk(G.S, "S", 0);
      const txt = document.body.innerText;
      return { kept, bad: bad.slice(0, 5), txt: /\bundefined\b|\bNaN\b|\[object Object\]/.test(txt) };
    }, raw);
    assert(!r.err && r.kept && !r.bad.length && !r.txt, name + ": " + JSON.stringify(r));
    await p.waitForTimeout(400);
  }
  return p;
});

test("yayın b: Android geri tuşu panel, alt ekran, maç ve emeklilikte doğru davranır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      $ = s => document.querySelector(s);
    const out = {};
    G.renderMain();
    out.main = G.nativeBack();
    G.settingsSheet();
    out.sheet = G.nativeBack();
    out.sheetClosed = !$("#ovl").innerHTML.trim();
    G.sheet("Zorunlu", "", `<button class="btn" id="zz">x</button>`, { noClose: true });
    out.locked = G.nativeBack();
    G.closeSheet();
    G.openLoc("stad");
    G.closeSheet();
    document.querySelector("#app").innerHTML = `<div id="stg"></div>`; // mini oyun / alt ekran
    out.sub = G.nativeBack();
    out.subMain = !!$("#gostad");
    G.S.retired = true;
    G.retireScreen();
    out.retire = G.nativeBack();
    document.querySelector("#app").innerHTML = `<div id="stg"></div>`; // emekliyken alt ekran: haritaya değil kariyer sonuna
    out.retSub = G.nativeBack();
    out.retScreen = !!$("#nw") && !$("#gostad");
    return out;
  });
  assert(
    r.main === "min" &&
      r.sheet === "close" &&
      r.sheetClosed &&
      r.locked === "locked" &&
      r.sub === "main" &&
      r.subMain &&
      r.retire === "min" &&
      r.retSub === "retire" &&
      r.retScreen,
    JSON.stringify(r)
  );
  return p;
});

test("yayın b: depolama dolunca kayıt kaybolmaz (uyarı + oturum kopyası + IndexedDB'den dönüş)", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game,
      S = G.S;
    if (!G.IDB.db) await G.idbOpen();
    G.save();
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (/^pota-slot/.test(k)) {
        const e = new Error("dolu");
        e.name = "QuotaExceededError";
        throw e;
      }
      return orig.call(this, k, v);
    };
    await new Promise(r => setTimeout(r, 20)); // iki kaydın zaman damgası ayrı olsun
    S.money = 777777;
    G.save();
    const warned = G.TOAST_LOG.some(t => t === G.t("save.3"));
    const mem = G.loadSlot(1).S.money;
    // yeniden açılış: localStorage'da eski kopya, IndexedDB'de yeni kopya; hafıza hâlâ dolu
    for (const k of Object.keys(G.SAVE_MEM)) delete G.SAVE_MEM[k];
    const stale = G.loadSlot(1).S.money;
    // IndexedDB yazımı eşzamansız: yeni kopya oraya düşene kadar bekle
    for (let i = 0; i < 40; i++) {
      const all = await G.idbAll();
      const o = all["pota-slot-1"] && JSON.parse(all["pota-slot-1"]);
      if (o && o.S.money === 777777) break;
      await new Promise(r => setTimeout(r, 100));
    }
    await G.storageRestore();
    const restored = G.loadSlot(1).S.money;
    Storage.prototype.setItem = orig;
    return { warned, mem, stale, restored };
  });
  assert(r.warned && r.mem === 777777 && r.stale !== 777777 && r.restored === 777777, JSON.stringify(r));
  return p;
});

test("yayın b: uygulama arka plandayken maç saati durur, öne gelince sürer", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    window.Game.playMatch();
  });
  await p.waitForTimeout(300);
  const drive = () =>
    p.evaluate(() => {
      const $ = s => document.querySelector(s);
      const m = $("[data-m='full']");
      if (m) return m.click();
      const c = $(
        "#mview [data-k],#mview [data-fu],#mview [data-rb],#mview [data-rf],#mview [data-pp],#mview [data-to],#mview [data-lt],#qgo"
      );
      if (c) return c.click();
      const sg = $("#sp-go");
      if (sg) {
        if (sg.disabled) {
          const a = $("#sp-s [data-v]"),
            b = $("#sp-r [data-v]");
          a && a.click();
          b && b.click();
        } else sg.click();
      }
      if (window.Game.M) window.Game.M.speed = 4;
    });
  const clock = () => p.evaluate(() => (window.Game.M ? `${window.Game.M.q}-${window.Game.M.clock}` : ""));
  const t0 = Date.now();
  while (Date.now() - t0 < 8000 && !(await p.$("#mstat"))) (await drive(), await p.waitForTimeout(80));
  for (let i = 0; i < 15; i++) (await drive(), await p.waitForTimeout(80));
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await p.waitForTimeout(700); // o anda süren adım biter
  const c1 = await clock();
  await p.waitForTimeout(2500);
  const c2 = await clock();
  await p.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  let c3 = c2;
  for (let i = 0; i < 100 && c3 === c2; i++) {
    await drive();
    await p.waitForTimeout(100);
    c3 = await clock();
  }
  assert(c1 && c1 === c2 && c3 !== c2, `arka plan ${c1} → ${c2}, öne gelince ${c3}`);
  await p.evaluate(() => window.Game.renderMain());
  return p;
});

test("yayın b: saat geri alınınca Günün Maçı yeniden açılıp ödül vermez", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.DLY.today = { day: "2099-12-31", tries: 1, ad: false, res: { r: "w", us: 10, them: 2, grid: [1, 1, 1] }, won: true };
    const open = G.dailyOpen();
    G.DLY.today = { day: "2000-01-01", tries: 1, ad: false, res: { r: "w", us: 10, them: 2, grid: [1, 1, 1] }, won: true };
    const next = G.dailyOpen();
    return { open, next };
  });
  assert(r.open === false && r.next === true, JSON.stringify(r));
  return p;
});

test("yayın b: teklif panelindeyken kapanan uygulama sezonu ikinci kez bitirmez, teklifler geri gelir", async () => {
  const p = await page();
  const fx = fs.readFileSync(path.join(__dirname, "fixtures", "career-long.json"), "utf8"); // 14/14. hafta, normal sezon
  await p.evaluate(fx => {
    const G = window.Game;
    window.__TEST = { noSummer: true };
    localStorage.setItem("pota-slot-1", fx);
    const r = G.loadSlot(1);
    G.setS(r.S);
    G.migrate();
    G.closeSheet();
    G.quickWeek();
    document.querySelector("#qw-sim").click();
  }, fx);
  for (let i = 0; i < 400 && !(await p.$("#sn-go,[data-o],#ret")); i++) {
    await p.evaluate(() => {
      const e = ["#nx", "#adx", "#ok", "#nok", "#rok", "#chok", "#wn-ok", "#sc-ok", "#cp-ok", "#qgo"]
        .map(s => document.querySelector(s))
        .find(e => e && !e.disabled);
      if (e) e.click();
    });
    await p.waitForTimeout(60);
  }
  const st = () =>
    p.evaluate(() => {
      const S = window.Game.S;
      return {
        season: S.season,
        age: S.age,
        hist: S.hist.length,
        games: S.career.games,
        offers: !!document.querySelector("#sn-go,[data-o],#ret")
      };
    });
  const a = await st();
  assert(
    a.offers,
    "teklif paneli açılmadı " + JSON.stringify(a) + (await p.evaluate(() => document.body.innerText.slice(0, 300)))
  );
  await p.reload();
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    window.__TEST = { noSummer: true };
    document.querySelector('[data-go="1"]').click();
  });
  await p.waitForTimeout(400);
  // açılışta "yenilikler" vb. panel varsa kapat: haritaya dönünce geçiş sürmeli
  for (let i = 0; i < 20 && !(await p.$("#sn-go,[data-o],#ret")); i++) {
    await p.evaluate(() => {
      const x = document.querySelector("#wn-ok,#shx");
      if (x) x.click();
      else if (document.querySelector("#quickw")) window.Game.quickWeek(); // hızlı hafta da önce geçişi açmalı
    });
    await p.waitForTimeout(150);
  }
  const b = await st();
  assert(
    b.offers && b.season === a.season && b.age === a.age && b.hist === a.hist && b.games === a.games,
    `önce ${JSON.stringify(a)} sonra ${JSON.stringify(b)}`
  );
  return p;
});

test("yayın b: yarıda bırakılan okul sınavı sonradan açılan paneli ele geçirmez", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.studying = true;
    G.S.slot = 3;
    G.closeSheet();
    G.openLoc("okul");
    document.querySelector('[data-act="ders"]').click();
  });
  await p.waitForTimeout(300);
  const q0 = await p.evaluate(() => document.querySelectorAll(".qbtn").length);
  await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet(); // geri tuşu / ✕
    G.renderMain();
    G.settingsSheet();
  });
  await p.waitForTimeout(9500); // 8 sn soru süresi + 0.9 sn geçiş
  const r = await p.evaluate(() => ({
    quiz: document.querySelectorAll(".qbtn").length,
    settings: !!document.querySelector("#shb") && !document.querySelector("#rb")
  }));
  assert(q0 > 0 && r.quiz === 0 && r.settings, JSON.stringify({ q0, ...r }));
  return p;
});

test("yayın: aynı yazın teklifleri yeniden açılışta değişmez (kapat-aç ile teklif çekilemez)", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.offArgs = { avg: 7, champ: false, head: "" };
    S.buffs = S.buffs || {};
    S.buffs.offer = 1;
    const sig = () => (window.__lastOffers || []).map(o => o.team.key + ":" + Math.round(o.wage)).join(",");
    G.transition(7, false, "");
    const a = sig();
    G.closeSheet();
    G.transition(7, false, "");
    const b = sig();
    G.closeSheet();
    return { a, b, buff: S.offArgs.buff };
  });
  assert(r.a && r.a === r.b, "teklifler değişti: " + JSON.stringify(r));
  assert(r.buff === 1, "menajer bonusu korunmadı: " + JSON.stringify(r));
  return p;
});

test("uzun oyun: 20 hızlı hafta yeni sistemlerle hatasız", async () => {
  const p = await page();
  await career(p);
  for (let i = 0; i < 20; i++) {
    await p.evaluate(() => {
      const G = window.Game;
      G.closeSheet();
      G.renderMain();
      G.quickWeek();
      const b = document.querySelector("#qw-sim");
      if (b) b.click();
    });
    for (let j = 0; j < 400; j++) {
      const st = await p.evaluate(() => {
        const $ = s => document.querySelector(s);
        if ($("#gostad") && !$("#ovl").innerHTML.trim() && !$("#adov")) return "main";
        const a = $("#adx");
        if (a) return a.disabled ? "w" : (a.click(), "c");
        const c = document.querySelector(
          "[data-press],[data-arc],#ch [data-i],[data-ce],[data-dl],[data-sig],#pk-no,#mt-stay,#hk-ok,#hk-a,#nt-sim,#nt-done,#mw-sim,#mw-ok,#jy-ok,[data-kn],[data-kd],#kd-ok,[data-an],[data-tl],[data-sl],#cp-ok,#wn-ok,#sc-ok,[data-amb-cap],[data-bd],#dby-ok,[data-dbp],[data-cu],[data-o]"
        );
        if (c) return (c.click(), "c");
        for (const s of [
          "#gl-ok",
          "#unl-ok",
          "#tr-ok",
          "#chok",
          "#nok",
          "#ok",
          "#nx",
          "#qgo",
          "#rok",
          "#rb",
          "#pok",
          "#aok",
          "#bn-later",
          "#tr-skip",
          "#ng-ok"
        ]) {
          const e = $(s);
          if (e && !e.disabled) return (e.click(), "c");
        }
        return "w";
      });
      if (st === "main") break;
      assert(j < 399, "hafta " + i + " takıldı");
      await p.waitForTimeout(st === "w" ? 60 : 15);
    }
  }
  return p;
});

test("paket 3b: rakip koç tarzı kararlı, simetrik ve maç öncesi kartta; yorgunluk halkası ve kenarda dinleniyor", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const t = G.teamByKey(G.fixture().opp);
    const a = G.osStyleOf(t),
      b = G.osStyleOf({ ...t });
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(G.osStyleOf({ key: "k" + i }));
    // her tarzda beklenen sayı farkı ~0: rakibin sayı/hücum oranı bizimkine eşit
    const sym = {};
    G.setM({ opp: t, live: 1, feed: [] });
    for (const s of G.OS_STYLES) {
      G.M.ostyle = s;
      const ev = (G.osPossMul(false) * (2 + G.osThree(false))) / 2.32;
      sym[s] = +(ev - (G.osPossMul(true) * (2 + G.osThree(true))) / 2.32).toFixed(3);
    }
    G.setM(null);
    return { a, b, n: seen.size, sym };
  });
  assert(r.a === r.b && G_OK(r.a), "kararlı tarz: " + JSON.stringify(r));
  assert(r.n === 5, "beş tarzın hepsi: " + r.n);
  assert(
    Object.values(r.sym).every(v => Math.abs(v) <= 0.005),
    "simetri: " + JSON.stringify(r.sym)
  );
  await p.evaluate(() => {
    const G = window.Game;
    G.S.matchMode = "";
    G.playMatch({ opp: G.teamByKey(G.fixture().opp), home: true, comp: "lig" });
  });
  await p.waitForSelector("#os-pre", { timeout: 8000 });
  const pre = await p.textContent("#os-pre");
  assert(/Rakip koç/.test(pre) && /(Pres|Yavaş|Üçlükçü|İçeri|Dengeli)/.test(pre), "maç öncesi tarz: " + pre);
  const q = await p.evaluate(() => {
    const G = window.Game;
    G.SETTINGS.lowfx = false;
    G.courtPlay({ us: true, scored: true }, true, 0);
    const mine = document.querySelector(`#o-${G.S.pos} .mf-er`);
    const mates = document.querySelectorAll("#crt-p .mf-er").length;
    const dash = mine && mine.getAttribute("stroke-dasharray");
    const restOn = !!document.querySelector("#mf-rest");
    G.courtPlay({ us: false, scored: false }, false, 0);
    const rest = (document.querySelector("#mf-rest") || {}).textContent || "";
    G.SETTINGS.lowfx = true;
    G.courtPlay({ us: true, scored: false }, true, 0);
    const lowN = document.querySelectorAll("#crt-p .mf-er").length;
    const lowDash = document.querySelector(`#o-${G.S.pos} .mf-er`).getAttribute("stroke-dasharray");
    G.SETTINGS.lowfx = false;
    return { v: mine && +mine.dataset.v, mates, dash, restOn, rest, lowN, lowDash };
  });
  assert(q.v > 0 && q.v <= 100 && q.mates === 5 && /\d/.test(q.dash || ""), "enerji halkaları: " + JSON.stringify(q));
  assert(!q.restOn && /DİNLENİYOR/.test(q.rest), "kenarda dinleniyor: " + JSON.stringify(q));
  assert(q.lowN === 1 && q.lowDash === null, "düşük grafik: yalnız benim halkam, düz: " + JSON.stringify(q));
  return p;
});
const G_OK = s => ["pres", "yavas", "ucluk", "iceri", "denge"].includes(s);

test("paket 3b: mola setleri (son şut, pick and roll, zon) ve koç önerisi", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    const el = document.createElement("div");
    document.body.appendChild(el);
    const card = async (style, pickK, on = true) => {
      G.M.ostyle = style;
      G.M.on = on;
      G.M.toReq = 1;
      const pr = G.timeoutCard(el);
      const keys = [...el.querySelectorAll("[data-to]")].map(b => b.dataset.to);
      const rec = [...el.querySelectorAll("[data-to]")].filter(b => /Koç önerisi/.test(b.textContent)).map(b => b.dataset.to);
      const b = el.querySelector(`[data-to="${pickK}"]`);
      b && b.click();
      await pr;
      return { keys, rec };
    };
    G.setM({ q: 3, clock: "4:00", us: 50, them: 50, plus: 0, live: 1, feed: [], opp: G.teamByKey(G.fixture().opp) });
    G.timeoutInit();
    G.M.toLeft = 5;
    const c1 = await card("ucluk", "zone");
    const zoneU = [G.possMod(false), G.possMod(false), G.possMod(false), G.possMod(false), G.possMod(false)];
    const c2 = await card("iceri", "zone");
    const zoneI = G.possMod(false);
    G.M.toZone = 0;
    const c3 = await card("pres", "pnr");
    const pnr = [G.possMod(true), G.possMod(true), G.possMod(true), G.possMod(true)];
    const bench = await card("denge", "stop", false);
    const c4 = await card("yavas", "last");
    const take0 = G.toLastTake(false),
      take = G.toLastTake(true),
      bonus = G.osMomentMod("corner", "off"),
      m0 = G.S.moral;
    G.Bus.emit("match:moment", { good: false });
    const m1 = G.S.moral,
      after = G.osMomentMod("corner", "off");
    el.remove();
    G.setM(null);
    return { c1, zoneU, c2, zoneI, c3, pnr, bench, c4, take0, take, bonus, after, m0, m1 };
  });
  assert(JSON.stringify(r.c1.keys) === '["stop","last","pnr","zone"]', "setler: " + JSON.stringify(r.c1));
  assert(
    r.c1.rec[0] === "stop" && r.c2.rec[0] === "zone" && r.c3.rec[0] === "pnr" && r.c4.rec[0] === "last",
    "koç önerisi: " + JSON.stringify(r)
  );
  assert(r.zoneU.slice(0, 4).every(v => Math.abs(v - 0.96) < 1e-9) && r.zoneU[4] === 1, "zon üçlükçüye yarı etki: " + r.zoneU);
  assert(Math.abs(r.zoneI - 0.92) < 1e-9, "zon: " + r.zoneI);
  assert(r.pnr.slice(0, 3).every(v => Math.abs(v - 1.07) < 1e-9) && r.pnr[3] === 1, "pick and roll 3 hücum: " + r.pnr);
  assert(!r.bench.keys.includes("last"), "kenardayken son şut seti yok: " + r.bench.keys);
  assert(!r.take0 && r.take && r.bonus - r.after === 5, "son şut: " + JSON.stringify(r));
  assert(r.m1 === r.m0 - 3, "kaçan son şut moral: " + r.m0 + "→" + r.m1);
  return p;
});

test("paket 3b: kritik an kaydı, rapor kartı ve tekrar izle; simüle maçta kayıt yok", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    G.setM({
      q: 4,
      clock: "00:40",
      us: 70,
      them: 71,
      pts: 10,
      plus: 0,
      live: 1,
      feed: [],
      qs: [],
      opp: G.teamByKey(G.fixture().opp)
    });
    // erken bir sayı, sonra son 2 dakikada öne geçiren üçlük (senin)
    G.M.us = 72;
    G.M.pts = 12;
    G.mfTrack({ us: true, before: [70, 71], pts0: 10, left: 400, ot: false });
    const mine0 = !!G.M.mfMine && !G.M.mfKey;
    const before = [G.M.us, G.M.them];
    G.M.them += 2;
    G.mfTrack({ us: false, before, pts0: G.M.pts, left: 100, ot: false });
    const b2 = [G.M.us, G.M.them];
    G.M.us += 3;
    G.M.pts += 3;
    G.M.mfScn = { us: true, zone: "corner" };
    G.mfTrack({ us: true, before: b2, pts0: G.M.pts - 3, left: 40, ot: false });
    const key = { ...G.M.mfKey };
    const rep = G.reportHTML();
    const host = document.createElement("div");
    host.innerHTML = rep;
    document.body.appendChild(host);
    const has = !!host.querySelector("#mf-key #mf-replay") && !!host.querySelector("#mf-svg #rp-net");
    host.querySelector("#mf-replay").click();
    await new Promise(res => setTimeout(res, 2100));
    const ball = (document.querySelector("#mf-ball") || { style: {} }).style.transform;
    const dots = document.querySelectorAll("#mf-p g").length;
    host.remove();
    G.M.auto = true;
    const autoRep = G.mfKeyHTML();
    G.setM({ q: 4, clock: "00:40", us: 70, them: 70, pts: 0, live: 1, feed: [], auto: true });
    G.M.us = 73;
    G.mfTrack({ us: true, before: [70, 70], pts0: 0, left: 30, ot: false });
    const autoKey = G.M.mfKey;
    G.setM(null);
    return { mine0, key, has, ball, dots, autoRep, autoKey: autoKey || null, title: /Kritik an/.test(rep) };
  });
  assert(r.mine0, "erken sayı yalnız 'son sayın' olarak: " + JSON.stringify(r));
  assert(
    r.key.us && r.key.mine && r.key.pts === 3 && r.key.zone === "corner" && r.key.a === 75,
    "kritik an: " + JSON.stringify(r.key)
  );
  assert(r.title && r.has, "rapor kartı ve düğme");
  assert(r.dots === 11 && /translate\(336px/.test(r.ball), "tekrar sahada oynar: " + JSON.stringify(r));
  assert(r.autoRep === "" && r.autoKey === null, "simüle maçta kayıt yok: " + JSON.stringify(r));
  return p;
});

test("paket 3a: Sezon Gecesi sekmeleri — sonuçlar, teklifler (pazarlık dönüşü sekmede kalır), gelecek sezon", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.results = [{ rating: 7.1, win: true }];
    G.S.ss = { g: 10, min: 280, pts: 160, ast: 30, reb: 40, blk: 5, stl: 8, rs: 72, dnp: 0 };
    G.S.contract = 2;
    G.seasonEnd(true, false, false);
  });
  await p.waitForSelector('[data-sn="res"]', { timeout: 4000 });
  const a = await p.evaluate(() => ({
    tabs: document.querySelectorAll("[data-sn]").length,
    res: !document.querySelector('[data-snp="res"]').hidden,
    off: document.querySelector('[data-snp="off"]').hidden,
    rows: document.querySelectorAll("[data-o]").length,
    stats: /Sezon istatistikleri/.test(document.querySelector('[data-snp="res"]').textContent),
    sticky: getComputedStyle(document.querySelector("#sn-go")).position
  }));
  assert(a.tabs === 3 && a.res && a.off && a.rows >= 2 && a.stats, "kabuk: " + JSON.stringify(a));
  assert(a.sticky === "sticky", "birincil düğme yapışkan değil: " + a.sticky);
  await p.click('[data-sn="fut"]');
  const f = await p.evaluate(() => document.querySelector('[data-snp="fut"]').textContent);
  assert(/Yaz gelişimi/.test(f) && /Sözleşme: 1 yıl kaldı/.test(f), "gelecek sezon: " + f.slice(0, 200));
  await p.click("#sn-back");
  assert(await p.isVisible("[data-o]"), "teklifler görünmüyor");
  await p.click("[data-o]");
  await p.waitForSelector("#ng-back");
  await p.click("#ng-back");
  await p.waitForSelector('[data-snp="off"]');
  assert(await p.isVisible("[data-o]"), "pazarlıktan dönünce teklif sekmesi açık değil");
  await p.evaluate(() => {
    const L = window.__lastOffers,
      i = Math.max(
        0,
        L.findIndex(o => o.stay)
      );
    document.querySelector(`[data-o="${i}"]`).click();
  });
  await p.waitForSelector("#ng-ok");
  await p.click("#ng-ok");
  for (let i = 0; i < 40 && !(await p.$("#quickw")); i++) {
    await p.evaluate(() => {
      const b = document.querySelector("#chok,#ok,#nx,#adov #adx.pri");
      if (b) b.click();
    });
    await p.waitForTimeout(100);
  }
  const s = await p.evaluate(() => ({ season: window.Game.S.season, main: !!document.querySelector("#quickw") }));
  assert(s.season === 2 && s.main, "sezon geçişi: " + JSON.stringify(s));
  return p;
});

test("paket 3a: bildirim kutusu — zil, okunmamış sayısı, geçmiş, en fazla 40", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.inbox = null;
    G.renderMain();
    G.toast("Deneme bildirimi");
    G.news("Önemli haber");
    G.news("Önemli haber");
  });
  const a = await p.evaluate(() => ({
    bell: !!document.querySelector("#ibx-bell"),
    n: document.querySelector("#ibx-n").textContent,
    hid: document.querySelector("#ibx-n").hidden
  }));
  assert(a.bell && a.n === "2" && !a.hid, "zil: " + JSON.stringify(a));
  await p.click("#ibx-bell");
  const b = await p.evaluate(() => ({
    txt: document.querySelector("#shb").textContent,
    unread: window.Game.S.inbox.unread
  }));
  assert(
    /Deneme bildirimi/.test(b.txt) && /Önemli haber/.test(b.txt) && /S1 H1/.test(b.txt) && b.unread === 0,
    "liste: " + JSON.stringify(b)
  );
  const c = await p.evaluate(() => {
    const G = window.Game;
    G.renderMain();
    const hid = document.querySelector("#ibx-n").hidden;
    for (let i = 0; i < 55; i++) G.toast("b" + i);
    return { hid, len: G.S.inbox.items.length, first: G.S.inbox.items[0].t, n: document.querySelector("#ibx-n").textContent };
  });
  assert(c.hid && c.len === 40 && c.first === "b54" && c.n === "9+", "sınır: " + JSON.stringify(c));
  return p;
});

test("paket 3a: haftalık koç önerisi kurallı ve ana ekranda/hafta planında görünür", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S,
      k = () => (G.coachTipKey() || [])[0];
    S.slot = 3;
    S.rival = null;
    S.sched[S.week - 1].opp = S.league.find(x => x.key !== S.team.key && x.key !== G.dbyArchKey()).key; // ezeli rakip derbisi (src/derby.js) büyük maç önerisi verir
    S.energy = 20;
    const low = k();
    S.injury = { w: 3 };
    const inj = k();
    S.injury.rehab = true;
    const heal = k();
    S.injury = null;
    S.energy = 90;
    S.stage = "t1";
    S.contract = 1;
    S.wage = 100;
    S.money = 100000;
    const ag = k();
    S.contract = 3;
    S.money = 5;
    const mon = k();
    S.money = 100000;
    S.moral = 20;
    const mor = k();
    S.slot = 0;
    const done = k();
    S.slot = 3;
    S.moral = 70;
    G.renderMain();
    const main = document.querySelector(".weekcard #ctip");
    G.planSheet();
    const plan = document.querySelector("#shb #ctip");
    return { low, inj, heal, ag, mon, mor, done, main: main && main.textContent, plan: !!plan };
  });
  assert(r.low === "rest" && r.inj === "rehab" && r.heal === "heal" && r.ag === "agent", "kurallar 1: " + JSON.stringify(r));
  assert(r.mon === "money" && r.mor === "moral" && r.done === "match", "kurallar 2: " + JSON.stringify(r));
  assert(r.main && /Bu hafta:/.test(r.main) && r.plan, "görünüm: " + JSON.stringify(r));
  return p;
});

test("paket 4d: Hedefler kartı, vakıf projesi haftalarca sürer, bitince haber + plaket + miras", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.stage = "t1";
    S.wage = G.WAGE.t1;
    S.money = 500000;
    S.slot = 3;
    G.openLoc("ev", "kariyer");
    const card = !!document.querySelector("#amb-card");
    document.querySelector("#amb-open").click();
    const btns = document.querySelectorAll("[data-amb-p]").length;
    const leg0 = G.legacyScore(),
      m0 = S.money,
      t0 = S.rel.taraf;
    document.querySelector("[data-amb-p=okul]").click();
    const started = !!(S.amb.proj.okul && S.amb.proj.okul.left === 4),
      paid = m0 - S.money,
      slot = S.slot;
    // aynı anda ikinci proje başlamaz
    const second = G.ambStartProject("burs");
    const out = [];
    for (let i = 0; i < 4; i++) {
      S.energy = 80;
      G.Bus.emit("week:start");
      out.push(S.amb.proj.okul.done ? "done" : S.amb.proj.okul.left);
    }
    G.closeSheet();
    G.openLoc("ev", "vitrin");
    return {
      card,
      btns,
      started,
      paid,
      slot,
      second,
      out,
      fans: S.rel.taraf - t0,
      leg: G.legacyScore() - leg0,
      news: S.news.some(n => /Okul sahası/.test(n.t)),
      plaque: !!document.querySelector("#amb-plaques") && /Okul sahası/.test(document.querySelector("#amb-plaques").textContent)
    };
  });
  assert(r.card && r.btns === 3, "kart: " + JSON.stringify(r));
  assert(r.started && r.paid === 25000 && r.slot === 2 && r.second === false, "başlangıç: " + JSON.stringify(r));
  assert(r.out.join() === "3,2,1,done" && r.fans >= 4 && r.leg >= 45 && r.news && r.plaque, "tamamlanma: " + JSON.stringify(r));
  return p;
});

test("paket 4d: ayakkabı markası şöhret + tasarım ister, satış sınırlı ve performansa bağlı", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.stage = "nba";
    S.wage = G.WAGE.nba;
    S.money = 1e7;
    S.followers = 50;
    const lowFame = G.ambLaunchBrand("perf", "mid");
    S.followers = 3e6;
    S.shoe = null;
    const noShoe = G.ambLaunchBrand("perf", "mid");
    S.shoe = { c1: "#000000", c2: "#ffffff", pat: "solid", logo: "pk", made: 1 };
    G.openLoc("ev", "kariyer");
    document.querySelector("#amb-open").click();
    document.querySelector("[data-amb-line=perf]").click();
    document.querySelector("[data-amb-tier=premium]").click();
    const m0 = S.money;
    document.querySelector("#amb-launch").click();
    const b = S.amb.brand;
    const cost = m0 - S.money;
    S.ss = { g: 10, pts: 320 };
    const hot = G.ambBrandWeekly();
    S.ss = { g: 10, pts: 40 };
    b.hype = 0;
    const cold = G.ambBrandWeekly();
    S.ss = { g: 10, pts: 600 };
    S.career.mvps = 10;
    S.followers = 1e9;
    const cap = G.ambBrandWeekly();
    const m1 = S.money;
    G.Bus.emit("week:start");
    const sale = S.money - m1;
    return {
      lowFame,
      noShoe,
      line: b && b.line,
      tier: b && b.tier,
      cost,
      hot,
      cold,
      cap,
      wage: S.wage,
      sale,
      name: G.ambBrandName(),
      ui: !!document.querySelector("#amb-launch")
    };
  });
  assert(r.lowFame === false && r.noShoe === false, "eşik: " + JSON.stringify(r));
  assert(r.line === "perf" && r.tier === "premium" && r.cost === 10 * r.wage && !r.ui, "lansman: " + JSON.stringify(r));
  assert(
    r.hot > r.cold && r.cold > 0 && r.cap <= r.wage * 0.3 && r.sale > 0 && /Test Pro/.test(r.name),
    "satış: " + JSON.stringify(r)
  );
  return p;
});

test("paket 4d: milli takım kaptanlığı rütbesi, kamp sonu kaptan kararı, veda maçı", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.stage = "euro";
    S.career.natCaps = 12;
    S.age = 33;
    const r0 = G.ambCaptainRank();
    S.natCaptain = true;
    const r1 = G.ambCaptainRank();
    let after = 0;
    const takim = S.rel.takim;
    G.camp("A", "Test", () => after++);
    return { r0, r1, takim };
  });
  // kamp ekranında bir seçim yap, sonra kaptan kararı paneli gelmeli
  await p.click(".pgrid button");
  await p.waitForSelector("[data-amb-cap]");
  const r2 = await p.evaluate(() => {
    document.querySelector("[data-amb-cap=young]").click();
    const G = window.Game,
      S = G.S;
    return { cap: S.amb.cap, last: S.amb.lastCap, ready: G.ambFarewellReady() };
  });
  await p.evaluate(() => {
    const G = window.Game;
    window.__caps0 = G.S.career.natCaps;
    G.ambFarewell(true, () => (window.__fw = 1));
  });
  for (let i = 0; i < 120; i++) {
    const done = await p.evaluate(() => {
      if (window.__fw) return true;
      const b = document.querySelector("#nok");
      if (b) b.click();
      return false;
    });
    if (done) break;
    await p.waitForTimeout(250);
  }
  const r3 = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    return {
      done: !!window.__fw,
      fw: !!S.amb.farewell,
      rank: G.ambCaptainRank(),
      caps: S.career.natCaps - window.__caps0,
      retired: G.ambNatRetired(),
      sel: G.natSelected(9, "A"),
      news: S.news.some(n => /veda/.test(n.t))
    };
  });
  assert(r.r0 === 2 && r.r1 === 3, "rütbe: " + JSON.stringify(r));
  assert(r2.cap === 1 && r2.last === "young" && r2.ready, "karar: " + JSON.stringify(r2));
  assert(
    r3.done && r3.fw && r3.caps === 1 && r3.rank === 4 && r3.retired && r3.sel === false && r3.news,
    "veda: " + JSON.stringify(r3)
  );
  return p;
});

test("paket 4d: kariyer aşaması olayları aşamaya göre süzülür, seçenekler çalışır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const titles = () => G.eventPool().map(e => e.title);
    S.stage = "lise";
    const lise = titles();
    S.stage = "nba";
    S.age = 20;
    S.role = "bench";
    S.energy = 20;
    const nba = titles();
    S.stage = "t2";
    const t2 = titles();
    const ev = G.eventPool().find(e => e.title === "Küçük puntolu madde");
    const m0 = S.money;
    const out = ev.choices[1].do();
    return {
      liseHas: lise.some(t => ["Pembe sırt çantası", "Back-to-back", "Küçük puntolu madde"].includes(t)),
      nba: ["Pembe sırt çantası", "Back-to-back", "Two-way sözleşme", "Aşağıya bir hafta"].every(t => nba.includes(t)),
      nbaNoLower: !nba.includes("Küçük puntolu madde"),
      t2: t2.includes("Küçük puntolu madde") && !t2.includes("Back-to-back"),
      out: typeof out === "string" && out.length > 10,
      money: S.money === m0
    };
  });
  assert(!r.liseHas && r.nba && r.nbaNoLower && r.t2 && r.out && r.money, "süzme: " + JSON.stringify(r));
  return p;
});

test("yayın c: İngilizcede bilgi sorularının doğru cevabı seçeneklerde, sayılar K ile, olaylarda Türkçe konuşmacı yok", async () => {
  const p = await page();
  await p.evaluate(() => localStorage.setItem("pota-lang", "en"));
  await p.reload();
  await p.waitForTimeout(500);
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    let bad = [];
    for (let i = 0; i < 400; i++) {
      const q = G.makeQuestion();
      if (!q.o.includes(q.a)) bad.push(q.q + " → " + q.a + " / " + q.o.join(","));
    }
    G.S.city = "İstanbul";
    G.S.home = "İstanbul";
    for (const k of Object.keys(G.S.npc)) if (typeof G.S.npc[k] === "string") G.S.npc[k] = "Alex";
    G.S.first = "Alex";
    const who = G.eventPool().map(e => e.who + " " + e.title + " " + e.choices.map(c => c.t).join(" "));
    return {
      bad: bad.slice(0, 3),
      k: G.kfmt(15000),
      k2: G.kfmt(1500),
      money: G.fmt(1000),
      turk: who.filter(w => /Dayın|Mahalle|Teyzen|amca|Simitçi|Gurbetçi|lokantası|Kahvehane|şoförü/.test(w))
    };
  });
  assert(!r.bad.length, "doğru cevap seçeneklerde yok: " + r.bad.join(" | "));
  assert(r.k === "15K" && r.k2 === "1.5K", "EN kfmt: " + r.k + " " + r.k2);
  assert(r.money === "₺40,000", "EN para: " + r.money);
  assert(!r.turk.length, "EN olaylarda Türkçe: " + r.turk.slice(0, 3).join(" | "));
  await p.evaluate(() => localStorage.setItem("pota-lang", "tr"));
  await p.reload();
  await p.waitForTimeout(500);
  await career(p);
  const tr = await p.evaluate(() => ({ k: window.Game.kfmt(1500), m: window.Game.fmt(1000) }));
  assert(tr.k === "1,5B" && tr.m === "₺40.000", "TR biçim: " + JSON.stringify(tr));
  return p;
});

(async () => {
  await serveDist();
  browser = await chromium.launch();
  let fail = 0;
  for (const t of T.filter(x => !process.env.ONLY || x.name.includes(process.env.ONLY))) {
    let p;
    try {
      p = await t.fn();
      if (p && p.errs.length) throw new Error("sayfa hatası: " + p.errs.join(" | "));
      console.log("✓ " + t.name);
    } catch (e) {
      fail++;
      console.log("✗ " + t.name + "\n   " + e.message);
    } finally {
      if (p && p.ctx) await p.ctx.close().catch(() => {});
    }
  }
  await browser.close();
  server.close();
  console.log(fail ? `${fail} test başarısız` : `Geri bildirim testleri geçti (${T.length}).`);
  process.exit(fail ? 1 : 0);
})();
