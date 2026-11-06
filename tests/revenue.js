// Gelir katmanı testleri: uzaktan ayar, A/B, analitik, yeni ödüllü yerleşimler, kırılma anı geçiş reklamı.
// Önce: npm run build && npm run build:single. Çalıştır: node tests/revenue.js
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
const pro = p =>
  p.evaluate(() => {
    const S = window.Game.S;
    S.stage = "t1";
    S.wage = 100;
    S.age = 22;
  });

test("uzaktan ayar ADS_CFG'ye uygulanır, bozuk ayar kırpılır, varsayılana döner", async () => {
  const p = await page();
  const r = await p.evaluate(() => {
    const G = window.Game;
    const before = G.ADS_CFG.interstitial.minGames;
    G.applyRemote({ ads: { dailyRewardCap: 500, interstitial: { minGames: 3 } }, rewards: { box: false } });
    const mid = [G.ADS_CFG.dailyRewardCap, G.ADS_CFG.interstitial.minGames, G.RC.rewards.box];
    G.applyRemote(null);
    return { before, mid, after: [G.ADS_CFG.dailyRewardCap, G.ADS_CFG.interstitial.minGames, G.RC.rewards.box] };
  });
  assert(r.before === 6, "varsayılan minGames 6 değil: " + r.before);
  assert(JSON.stringify(r.mid) === "[200,3,false]", "uygulanan: " + JSON.stringify(r.mid));
  assert(JSON.stringify(r.after) === "[100,6,true]", "geri dönüş: " + JSON.stringify(r.after));
  return p;
});

test("Pages derlemesi remote-config.json'u alıp saklıyor, A/B kovası atanıyor, CSP ihlali yok", async () => {
  const p = await page(BASE);
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({
    saved: !!localStorage.getItem("pota-rc"),
    v: window.Game.VARIANTS.inter_start,
    mg: window.Game.ADS_CFG.interstitial.minGames,
    uid: localStorage.getItem("pota-uid")
  }));
  assert(r.saved, "ayar saklanmadı");
  assert(r.v === "A" || r.v === "B", "kova yok: " + r.v);
  assert(r.mg === (r.v === "A" ? 6 : 4), `kova ${r.v} ama minGames ${r.mg}`);
  assert(/^[0-9a-f]{12}$/.test(r.uid || ""), "kurulum kimliği yok");
  // yeniden açılışta aynı kova
  await p.reload();
  await p.waitForTimeout(600);
  const v2 = await p.evaluate(() => window.Game.VARIANTS.inter_start);
  assert(v2 === r.v, "kova değişti");
  return p;
});

test("son hücum: reklamla yeniden oynama teklifi, durum geri alınır, maçta bir kez", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.setM({ us: 70, them: 72, pts: 10, ast: 1, stl: 0, stops: 0, q: 4 });
    document.querySelector("#app").insertAdjacentHTML("beforeend", '<div id="rt"></div>');
  });
  const avail = await p.evaluate(() => window.Game.retryAvailable({ id: "lastshot" }, false));
  assert(avail, "teklif uygun değil");
  assert(!(await p.evaluate(() => window.Game.retryAvailable({ id: "lastshot" }, true))), "otomatik maçta teklif olmamalı");
  assert(!(await p.evaluate(() => window.Game.retryAvailable({ id: "fastbreak" }, false))), "son hücum dışında teklif olmamalı");
  await p.evaluate(() => {
    const G = window.Game;
    window.__snap = G.momentSnap();
    G.M.us = 70;
    G.M.pts = 10;
    G.M.them = 75;
    window.__r = null;
    G.offerRetry(document.querySelector("#rt")).then(v => (window.__r = v));
  });
  assert(await p.isVisible("#ad-retry"), "teklif düğmesi yok");
  await p.click("#ad-retry");
  await watchAd(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.momentRestore(window.__snap);
    return { r: window.__r, them: G.M.them, again: G.retryAvailable({ id: "lastshot" }, false) };
  });
  assert(r.r === true, "reklam sonrası true dönmedi");
  assert(r.them === 72, "skor geri alınmadı: " + r.them);
  assert(r.again === false, "aynı maçta ikinci teklif");
  return p;
});

test("son hücum teklifi reddedilince false döner", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.setM({ us: 1, them: 2 });
    document.querySelector("#app").insertAdjacentHTML("beforeend", '<div id="rt"></div>');
    G.offerRetry(document.querySelector("#rt")).then(v => (window.__r = v));
  });
  await p.click("#ad-retry-no");
  await p.waitForTimeout(50);
  assert((await p.evaluate(() => window.__r)) === false, "ret false değil");
  return p;
});

test("yaz dönemi: ek teklif (yaz başına bir) ve masadan kalkan kulübü geri çağırma", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => window.Game.transition(6.5, false, '<div id="seasonad"></div>'));
  const n0 = await p.evaluate(() => window.__lastOffers.length);
  await p.click('[data-sn="off"]'); // Sezon Gecesi: Teklifler sekmesi
  assert(await p.isVisible("#ad-extra"), "ek teklif düğmesi yok");
  await p.click("#ad-extra");
  await watchAd(p);
  const r = await p.evaluate(() => ({
    n: window.__lastOffers.length,
    btn: !!document.querySelector("#ad-extra"),
    rows: document.querySelectorAll("[data-o]").length,
    keys: new Set(window.__lastOffers.map(o => o.team.key)).size
  }));
  assert(r.n === n0 + 1 || r.n === n0, "teklif sayısı " + n0 + " → " + r.n);
  assert(r.n === n0 + 1, "ek teklif eklenmedi");
  assert(!r.btn, "ek teklif düğmesi ikinci kez çıktı");
  assert(r.rows === r.n, "liste yeniden çizilmedi");
  assert(r.keys === r.n, "aynı kulüp iki kez");
  // masadan kalkma: bir kulübü çekilmiş say, bir teklife girip geri çık (liste yeniden çizilir)
  await p.evaluate(() => {
    const L = window.__lastOffers;
    const i = L.findIndex(o => !o.stay);
    L[i].withdrawn = true;
    window.__wi = i;
    const j = L.findIndex((o, k) => k !== i && !o.withdrawn);
    document.querySelector(`[data-o="${j}"]`).click();
  });
  await p.waitForTimeout(100);
  const back = await p.$("#ng-back");
  if (back) await back.click();
  await p.waitForTimeout(100);
  assert(await p.isVisible("#ad-recall"), "geri çağırma düğmesi yok");
  await p.click("#ad-recall");
  await watchAd(p);
  const q = await p.evaluate(() => ({
    w: window.__lastOffers[window.__wi].withdrawn,
    btn: !!document.querySelector("#ad-recall"),
    row: !!document.querySelector(`[data-o="${window.__wi}"]`)
  }));
  assert(q.w === false, "kulüp geri gelmedi");
  assert(q.row, "kulüp listede seçilebilir değil");
  assert(!q.btn, "geri çağırma ikinci kez çıktı");
  return p;
});

test("sezon sonu: hedefler tuttuysa prim 2 katı, tutmadıysa taraftar buluşması (bir kez)", async () => {
  const p = await page();
  await career(p);
  await pro(p);
  await p.evaluate(() => {
    const S = window.Game.S;
    S.goals = { season: S.season, list: [], result: [{ id: "ppg", by: "koc", v: 10, ok: true }] };
    S.money = 1000;
    window.Game.transition(6.5, false, '<div id="seasonad"></div>');
  });
  assert(await p.isVisible("#ad-season"), "sezon düğmesi yok");
  await p.click("#ad-season");
  await watchAd(p);
  const r = await p.evaluate(() => ({ m: window.Game.S.money, btn: !!document.querySelector("#ad-season") }));
  assert(r.m === 1200, "prim eklenmedi: " + r.m);
  assert(!r.btn, "düğme kalktı mı");
  // yeniden çizimde tekrar çıkmaz
  const again = await p.evaluate(() => window.Game.seasonAdHTML());
  assert(again === "", "ikinci kez sunuldu");
  // hedef tutmayan oyuncu: taraftar buluşması
  await p.evaluate(() => {
    const S = window.Game.S;
    S.adSummer = null;
    S.goals.result[0].ok = false;
    S.followers = 1000;
  });
  const h = await p.evaluate(() => window.Game.seasonAdHTML());
  assert(/ad-season/.test(h), "taraftar seçeneği yok");
  return p;
});

test("antrenman 2 katı: haftada bir, kazanç eklenir", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    window.__s0 = G.S.st.sut;
    document.querySelector("#app").insertAdjacentHTML("beforeend", `<div id="tw">${G.trainAdHTML(2)}</div>`);
    G.bindTrainAd("sut", 2);
  });
  assert(await p.isVisible("#ad-train"), "düğme yok");
  assert((await p.evaluate(() => window.Game.trainAdHTML(0))) === "", "kazanç yokken teklif");
  await p.click("#ad-train");
  await watchAd(p);
  const r = await p.evaluate(() => ({ d: window.Game.S.st.sut - window.__s0, again: window.Game.trainAdHTML(2) }));
  assert(r.d === 2, "kazanç eklenmedi: " + r.d);
  assert(r.again === "", "aynı hafta ikinci teklif");
  const next = await p.evaluate(() => {
    window.Game.S.week++;
    return window.Game.trainAdHTML(1);
  });
  assert(/ad-train/.test(next), "yeni haftada teklif yok");
  return p;
});

test("günlük kutu: ücretsiz + reklamla bir tane, saat geri alınınca yenilenmez", async () => {
  const p = await page();
  await career(p);
  assert(await p.isVisible("#today"), "ana ekranda Bugün düğmesi yok");
  await p.click("#today");
  await p.click("#dbox");
  await p.click("#bx-free");
  await p.waitForTimeout(50);
  assert(await p.isVisible("#bx-ad"), "reklamlı kutu teklifi yok");
  await p.click("#bx-ad");
  await watchAd(p);
  const r = await p.evaluate(() => ({ box: { ...window.Game.ADS.box }, more: !!document.querySelector("#bx-ad,#bx-free") }));
  assert(r.box.free && r.box.ad, "kutu durumu: " + JSON.stringify(r.box));
  assert(!r.more, "bugün üçüncü kutu");
  // saat geri: dünkü tarih yazılı gibi davranma (kayıtta ileri bir gün varsa sıfırlanmaz)
  const rb = await p.evaluate(() => {
    const G = window.Game;
    G.ADS.box.d = "2999-01-01";
    G.closeSheet();
    G.renderMain();
    return G.boxReady();
  });
  assert(rb === false, "saat geri alınınca kutu yenilendi");
  await p.click("#today");
  await p.click("#dbox");
  await p.click("#bx-x");
  return p;
});

test("kırılma anı geçiş reklamı: ilk maçlarda yok, sonra var, hemen ardından yok", async () => {
  const p = await page();
  await career(p);
  const early = await p.evaluate(async () => {
    const G = window.Game;
    G.ADS.games = 2;
    G.ADS.lastInter = 0;
    let called = false;
    await G.adsBreak("season_break", () => (called = true));
    return { called, ad: !!document.querySelector("#adov") };
  });
  assert(early.called && !early.ad, "ilk maçlarda reklam çıktı");
  await p.evaluate(() => {
    const G = window.Game;
    G.ADS.games = 12;
    G.ADS.lastInter = 0;
    window.__bk = false;
    G.adsBreak("season_break", () => (window.__bk = true));
  });
  await p.waitForSelector("#adov", { timeout: 2000 });
  assert(!(await p.evaluate(() => window.__bk)), "reklam bitmeden devam etti");
  await p.waitForSelector("#adov #adx:not([disabled])", { timeout: 6000 });
  await p.click("#adov #adx");
  await p.waitForTimeout(100);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    let called = false;
    await G.adsBreak("season_break", () => (called = true));
    return { bk: window.__bk, called, ad: !!document.querySelector("#adov"), gap: Date.now() - G.ADS.lastInter < 60000 };
  });
  assert(r.bk, "reklamdan sonra devam etmedi");
  assert(r.called && !r.ad, "art arda ikinci reklam");
  assert(r.gap, "son reklam zamanı yazılmadı");
  return p;
});

test("reklamsız pakette yeni yerleşimler reklamsız ödül verir, geçiş reklamı yok", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    G.ADS.adFree = true;
    G.ADS.games = 50;
    G.ADS.lastInter = 0;
    let c = false;
    await G.adsBreak("season_break", () => (c = true));
    const ok = await G.showRewarded("box");
    G.ADS.adFree = false;
    return { c, ad: !!document.querySelector("#adov"), ok };
  });
  assert(r.c && !r.ad && r.ok, JSON.stringify(r));
  return p;
});

test("analitik: oturum, aktif gün, sunulan ve izlenen reklamlar yerel özette; rıza metni gösteriliyor", async () => {
  const p = await page();
  await career(p);
  await p.click("#today");
  await p.click("#dbox");
  await p.click("#bx-free");
  await p.click("#bx-ad");
  await watchAd(p);
  const a = await p.evaluate(() => window.Game.analyticsSummary());
  assert(a.sessions >= 1 && a.activeDays >= 1, "oturum yok: " + JSON.stringify(a));
  assert(a.offers.box >= 1, "kutu sunumu sayılmadı");
  assert(a.watched.box === 1, "izlenen sayılmadı: " + JSON.stringify(a.watched));
  const rep = await p.evaluate(() => window.Game.reportData().analytics);
  assert(rep && rep.watched.box === 1, "oyun testi raporunda analitik yok");
  // rıza penceresi istatistik cümlesini içeriyor
  await p.evaluate(() => {
    window.Game.ADS.consent = null;
    window.Game.adsConsent();
  });
  const txt = await p.textContent("#acov");
  assert(/istatisti/i.test(txt), "rıza metninde istatistik yok");
  return p;
});

test("geç bağlama: yeni modüllerin adları başka modülle çakışmıyor", async () => {
  const p = await page();
  const r = await p.evaluate(() =>
    [
      "offerRetry",
      "retryAvailable",
      "momentSnap",
      "offerAdsHTML",
      "seasonAdHTML",
      "trainAdHTML",
      "boxSheet",
      "adsBreak",
      "analyticsSummary",
      "applyRemote"
    ].filter(k => typeof window.Game[k] !== "function")
  );
  assert(!r.length, "eksik: " + r.join(","));
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
  console.log(fail ? `${fail} test başarısız` : `Gelir testleri geçti (${T.length}).`);
  process.exit(fail ? 1 : 0);
})();
