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
    G.setM({ pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, stops: 0, mmod: 0, live: 1, qs: [[20, 18], [41, 40]] });
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
    return { keys, pull, force, pres, none, M: { fga: M.fga, fgm: M.fgm, tpa: M.tpa, tpm: M.tpm, fta: M.fta, ftm: M.ftm }, e0, e1, live, rep };
  });
  assert(JSON.stringify(r.keys) === '["pass","pull","spin","force"]', "seçenekler: " + r.keys);
  assert(r.pull.pk === "mid" && r.pull.mod < 0, "ikiliğe kalk orta mesafe olur");
  assert(r.force.foulChance > 0 && r.force.mod < 0, "turnikeyi zorla: zor ama faul şansı");
  assert(typeof r.pres.good === "boolean" && r.pres.st === "pas", "pas sonucu");
  assert(r.none === null, "boş şutta ikinci karar yok");
  assert(r.M.fga === 2 && r.M.fgm === 1 && r.M.tpa === 1 && r.M.tpm === 1 && r.M.fta === 2 && r.M.ftm === 1, "takip: " + JSON.stringify(r.M));
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
    G.checkMatchFeats({ win: true, and1: 1, pts: 12, ast: 10, reb: 10, fga: 5, fgm: 5, fta: 0, ftm: 0, tpm: 0, low: -14, us: 80, them: 70 });
    const mf = ["andone", "triple", "perfect", "comeback"].map(id => G.featGot(id));
    G.S.title = "champ";
    return { n, bad, before, after: G.cosOpen("c1"), got, mf, title: G.titleText(), stored: !!JSON.parse(localStorage.getItem("pota-feats")).got.champ };
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
  assert(r.won === (r.me > r.star), "düello sonucu: " + JSON.stringify(r));
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
    G.Bus.first("week:sheet");
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
    G.Bus.first("week:sheet");
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
  assert(await p.evaluate(() => window.Game.S.quizWk === `${window.Game.S.season}-${window.Game.S.week}`), "bilgi gecesi oynandı");
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
    G.closeSheet();
    G.Bus.first("week:sheet");
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
    return { vb, hoops, rx: x(right), lx: x(left), changed: before !== right, open, tight, def, shot: G.isShotKey("corner"), pass: G.isShotKey("kick") };
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
    G.Bus.first("week:sheet");
    Math.random = R;
  });
  await p.waitForSelector("[data-tl]", { timeout: 3000 });
  const title = await p.textContent(".sheet h2");
  // ilk seçenek her zaman mini oyunsuz: sonuç ekranı gelir, takılmaz
  await p.click("[data-tl]");
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ sheet: !!document.querySelector(".sheet"), tl: !!document.querySelector("[data-tl]") }));
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
    const btn = [...document.querySelectorAll("[data-tl]")].find(b => !/muz|çorap|uzaylı|anneanne|ezan|kuzu/.test(b.dataset.tl)) || document.querySelector("[data-tl]");
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
    ((await p.isVisible("#pr-shot")) !== !!(await p.$("#pr-press"))) && (await p.isVisible("#pr-focus")),
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
          "[data-press],[data-arc],#ch [data-i],[data-ce],[data-dl],[data-sig],#pk-no,#mt-stay,#hk-ok,#hk-a,#nt-sim,#nt-done,#mw-sim,#mw-ok,#jy-ok,[data-kn],[data-kd],#kd-ok,[data-an],[data-tl],[data-o]"
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
