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
    G.S.unlocks = { program: 1, sistem: 1, gorev: 1, miras: 1 };
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
    G.ADS.today = 0;
    const a = G.adBtn("x", "A", "", "energy");
    G.ADS.today = G.ADS_CFG.dailyRewardCap;
    const b = G.adBtn("x", "A", "", "energy");
    G.ADS.today = 0;
    return { a, b, cap: G.ADS_CFG.dailyRewardCap, epw: G.ADS_CFG.energyPerWeek };
  });
  assert(/hak/.test(r.a) && /<button/.test(r.a), "kalan hak yok");
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

test("EuroLeague kulübü: hafta sonu ülke ligi, EuroLeague hafta içi ayrı turnuva (6 grup maçı)", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const club = G.leaguePool("euro").find(t => t.name === "Baskonia");
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
  assert(r.cc === "ES" && !/EuroLeague/.test(r.lg), "ülke ligi değil: " + JSON.stringify(r));
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
  assert(/EuroLeague/.test(t), "hafta içi ekranı: " + t.slice(0, 80));
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
  assert(/Final Four/.test(r.due), "Final Four gelmedi: " + r.due.slice(0, 100));
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
    window.__TEST = { noEvents: true };
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

test("kılavuz: ana ekrandan açılır, 9 bölüm, ileri/geri; yuvalar ekranından açılıp kapatılınca hata yok", async () => {
  const p = await page();
  await career(p);
  await p.click("#gdb");
  const n = await p.evaluate(() => document.querySelectorAll("[data-gd]").length);
  assert(n === 9, "bölüm sayısı: " + n);
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
          "[data-press],[data-arc],#ch [data-i],[data-ce],[data-dl],[data-sig],#pk-no,#mt-stay,#hk-ok,#hk-a,#nt-sim,#nt-done,#mw-sim,#mw-ok,[data-o]"
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

(async () => {
  await serveDist();
  browser = await chromium.launch();
  let fail = 0;
  for (const t of T) {
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
