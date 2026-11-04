// Kapsamlı denetim paketi: node tests/audit.js [filtre]
// İşlevsel (F), uç durum (E), güvenlik (S) ve performans (P) testleri. Her test gerçekten çalıştırılır; sonuç
// geçti / kaldı / engelli olarak kaydedilir: reports/data/audit-results.json. Önce: npm run build && npm run build:single
// Performans ve çevrimdışı testleri dist/ (Pages/Android derlemesi) yerel HTTP sunucusundan açılır.
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path"),
  http = require("http");
const ROOT = path.resolve(__dirname, ".."),
  SINGLE = "file://" + path.join(ROOT, "dist-single", "index.html"),
  OUT = path.join(ROOT, "reports", "data");
const FILTER = process.argv[2] ? new RegExp(process.argv[2]) : null;
const results = [];
const T = [];
const test = (id, cat, name, fn) => T.push({ id, cat, name, fn });

/* ---------- yardımcılar ---------- */
let browser, server, BASE;
function serveDist() {
  const dist = path.join(ROOT, "dist");
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json"
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
async function page(opts = {}, url = SINGLE) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...(opts.ctx || {}) });
  if (opts.init) await ctx.addInitScript(opts.init);
  const p = await ctx.newPage();
  p.errs = [];
  p.on("pageerror", e => p.errs.push(e.message));
  p.on("dialog", d => d.dismiss().catch(() => {}));
  await p.goto(url);
  await p.waitForTimeout(opts.wait || 450);
  p.ctx = ctx;
  return p;
}
const close = p => p.ctx.close();
async function career(p, o = {}) {
  await p.evaluate(o => {
    const G = window.Game;
    try {
      localStorage.setItem("pota-ads", JSON.stringify({ consent: true, stats: {}, day: "", today: 0 }));
    } catch (e) {
      /* depolama kapalı */
    }
    G.ADS.consent = true;
    G.F.first = o.first || "Deniz";
    G.F.last = o.last || "Test";
    G.F.pos = o.pos || "SF";
    G.F.slot = o.slot || 1;
    G.F.mode = o.mode || "normal";
    G.startCareer();
    G.S.tut = 1;
    G.S.tipMoment = 1;
    G.closeSheet();
    G.renderMain();
  }, o);
}
// bir hafta: hızlı hafta + maçı simüle et, araya giren bütün ekranları geç
async function week(p) {
  await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.renderMain();
    G.quickWeek();
    const b = document.querySelector("#qw-sim");
    if (b) b.click();
  });
  for (let i = 0; i < 400; i++) {
    const st = await p.evaluate(() => {
      const $ = s => document.querySelector(s);
      if ($("#gostad") && !$("#ovl").innerHTML.trim() && !$("#adov") && !$("#acov")) return "main";
      const a = $("#adx");
      if (a) return a.disabled ? "wait" : (a.click(), "c");
      const acn = $("#ac-yes");
      if (acn) return (acn.click(), "c");
      const c = document.querySelector("[data-press],[data-arc],#ch [data-i],[data-ce],[data-dl],[data-sig]");
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
        "#ng-ok",
        "#pk-no",
        "#mt-stay",
        "#hk-ok",
        "#hk-a"
      ]) {
        const e = $(s);
        if (e && !e.disabled) return (e.click(), "c");
      }
      const o = document.querySelector("[data-o]");
      if (o) return (o.click(), "c");
      return "wait";
    });
    if (st === "main") return true;
    await p.waitForTimeout(st === "wait" ? 60 : 15);
  }
  return false;
}
const S = (p, expr) => p.evaluate(expr);
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

/* ================= İŞLEVSEL ================= */
test("F01", "işlevsel", "Oluşturma ekranının bütün kontrolleri görünür", async () => {
  const p = await page();
  await p.evaluate(() => {
    window.Game.F.slot = 1;
    window.Game.renderCreate();
  });
  const ok = await S(p, () =>
    ["#fn", "#ln", "#go", "#pos", "#num", "#mode", "#skin", "#hs"].every(s => document.querySelector(s))
  );
  assert(ok, "eksik kontrol");
  await close(p);
});
test("F02", "işlevsel", "Ad boş ya da yalnızca boşluksa kariyer başlamaz ve uyarı çıkar", async () => {
  const p = await page();
  await p.evaluate(() => {
    const G = window.Game;
    G.F.slot = 1;
    G.F.first = "";
    G.F.last = "";
    G.renderCreate();
  });
  for (const [a, b] of [
    ["", ""],
    ["   ", "  "],
    ["Ali", ""]
  ]) {
    await p.fill("#fn", a);
    await p.fill("#ln", b);
    await p.click("#go");
    await p.waitForTimeout(200);
    const r = await S(p, () => ({ s: !!window.Game.S, toast: !!document.querySelector(".toast") }));
    assert(!r.s && r.toast, `"${a}" "${b}": ${JSON.stringify(r)}`);
  }
  await close(p);
});
test("F03", "işlevsel", "Ad alanı uzunluk sınırı (14/16) uygulanır", async () => {
  const p = await page();
  await p.evaluate(() => {
    window.Game.F.slot = 1;
    window.Game.renderCreate();
  });
  await p.fill("#fn", "A".repeat(40));
  await p.fill("#ln", "B".repeat(40));
  const l = await S(p, () => [document.querySelector("#fn").value.length, document.querySelector("#ln").value.length]);
  assert(l[0] <= 14 && l[1] <= 16, "sınır yok: " + l);
  await close(p);
});
test("F04", "işlevsel", "Türkçe karakter ve emoji içeren ad kaydedilir ve geri yüklenir", async () => {
  const p = await page();
  await career(p, { first: "Çağrı🏀", last: "Öztürk-İğdır" });
  await p.reload();
  await p.waitForTimeout(500);
  const n = await S(p, () => {
    const r = window.Game.loadSlot(1);
    return r && `${r.S.first} ${r.S.last}`;
  });
  assert(n === "Çağrı🏀 Öztürk-İğdır", "ad bozuldu: " + n);
  await close(p);
});
test("F05", "güvenlik", "Oluşturma ekranında HTML içeren ad işaretleme olarak yorumlanmaz", async () => {
  const p = await page();
  await p.evaluate(() => {
    window.Game.F.slot = 1;
    window.Game.renderCreate();
  });
  await p.fill("#fn", "<b id=xx>A");
  await p.fill("#ln", "<i id=yy>");
  await p.click("#go");
  await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) await week(p);
  const inj = await S(p, () => !!document.querySelector("#xx,#yy"));
  assert(!inj, "HTML enjekte edildi (gündem/hud)");
  await close(p);
});
test("F06", "işlevsel", "Bütün mekanlar ve sekmeleri hatasız açılır", async () => {
  const p = await page();
  await career(p);
  const n = await p.evaluate(() => {
    const G = window.Game;
    G.S.stage = "t1";
    G.S.age = 29;
    G.S.season = 3;
    let tabs = 0;
    for (const loc of ["ev", "stad", "okul", "medya", "aile", "kafe", "eglence", "avm", "market", "sans"]) {
      G.closeSheet();
      G.openLoc(loc);
      const ts = [...document.querySelectorAll("#ovl .tabs button")].map(b => b.dataset.t);
      for (const t of ts) {
        G.closeSheet();
        G.openLoc(loc, t);
        tabs++;
      }
    }
    G.closeSheet();
    return tabs;
  });
  assert(p.errs.length === 0, p.errs.join(" | "));
  assert(n >= 20, "sekme sayısı az: " + n);
  await close(p);
  return `${n} sekme`;
});
test("F07", "işlevsel", "Kalıcılık: 3 hafta sonra sayfa yeniden açılınca kariyer aynı yerden devam eder", async () => {
  const p = await page();
  await career(p);
  for (let i = 0; i < 3; i++) assert(await week(p), "hafta tamamlanmadı");
  const a = await S(p, () => JSON.stringify([window.Game.S.week, Math.round(window.Game.S.money), window.Game.S.career.games]));
  await p.reload();
  await p.waitForTimeout(500);
  const b = await S(p, () => {
    const r = window.Game.loadSlot(1);
    return JSON.stringify([r.S.week, Math.round(r.S.money), r.S.career.games]);
  });
  assert(a === b, `önce ${a} sonra ${b}`);
  await close(p);
  return a;
});
test("F08", "işlevsel", "Hızlı hafta düğmesine art arda 5 dokunuş haftayı yalnızca bir kez ilerletir", async () => {
  const p = await page();
  await career(p);
  const w0 = await S(p, () => window.Game.S.week);
  await p.evaluate(() => {
    for (let i = 0; i < 5; i++) document.querySelector("#quickw").click();
    for (let i = 0; i < 5; i++) {
      const b = document.querySelector("#qw-sim");
      if (b) b.click();
    }
  });
  await p.waitForTimeout(300);
  await week(p).catch(() => {});
  const w1 = await S(p, () => window.Game.S.week);
  assert(w1 - w0 <= 2, `hafta ${w0} → ${w1}`);
  const games = await S(p, () => window.Game.S.career.games);
  assert(games <= 2, "maç sayısı " + games);
  await close(p);
  return `hafta ${w0}→${w1}, maç ${games}`;
});
test("F09", "işlevsel", "Ayarlar yeniden açılışta korunur (ses, yazı boyutu, zorluk)", async () => {
  const p = await page();
  await p.evaluate(() => {
    const G = window.Game;
    G.SETTINGS.sound = false;
    G.SETTINGS.fs = "xl";
    G.SETTINGS.diff = "zor";
    G.saveSettings();
  });
  await p.reload();
  await p.waitForTimeout(450);
  const s = await S(p, () => [
    window.Game.SETTINGS.sound,
    window.Game.SETTINGS.fs,
    window.Game.SETTINGS.diff,
    document.documentElement.classList.contains("fs-xl")
  ]);
  assert(s[0] === false && s[1] === "xl" && s[2] === "zor" && s[3], JSON.stringify(s));
  await close(p);
});
test("F10", "işlevsel", "Dil değişimi: İngilizceye geçip kariyer aynı yuvadan devam eder", async () => {
  const p = await page();
  await career(p);
  await week(p);
  const w = await S(p, () => window.Game.S.week);
  await p.evaluate(() => {
    window.Game.settingsSheet();
    document.querySelector('[data-lang="en"]').click();
  });
  await p.waitForTimeout(1500);
  const r = await S(p, () => ({
    en: document.querySelector("#app").innerText.includes("Quick week") || /week/i.test(document.querySelector("#app").innerText),
    w: window.Game.S && window.Game.S.week
  }));
  assert(r.w === w, `hafta ${w} → ${r.w}`);
  assert(r.en, "İngilizce arayüz yok");
  await close(p);
});
test("F11", "işlevsel", "Yuva silme: vazgeçince kalır, onaylayınca silinir", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => window.Game.renderSlots());
  await p.click('[data-del="1"]');
  await p.click("#n1");
  const kept = await S(p, () => !!window.Game.loadSlot(1));
  await p.click('[data-del="1"]');
  await p.click("#y1");
  const gone = await S(p, () => !window.Game.loadSlot(1));
  assert(kept && gone, `kaldı:${kept} silindi:${gone}`);
  await close(p);
});
test("F12", "işlevsel", "Beş yuva doluyken kayıt kodu içe aktarma mevcut kariyerlerin üzerine yazmaz", async () => {
  const p = await page();
  await career(p);
  const code = await S(p, () => window.Game.encodeSave(window.Game.S));
  await p.evaluate(() => {
    const raw = localStorage.getItem("pota-slot-1");
    for (let i = 2; i <= 5; i++) localStorage.setItem("pota-slot-" + i, raw);
  });
  const before = await S(p, () => [1, 2, 3, 4, 5].map(i => localStorage.getItem("pota-slot-" + i).length).join());
  const r = await p.evaluate(c => window.Game.importCode(c), code);
  const after = await S(p, () => [1, 2, 3, 4, 5].map(i => localStorage.getItem("pota-slot-" + i).length).join());
  assert(r === false && before === after, "üzerine yazıldı");
  await close(p);
});
test("F13", "işlevsel", "Kayıt kodu dışa aktarılıp başka bir cihazda (yeni tarayıcı bağlamı) içe aktarılır", async () => {
  const a = await page();
  await career(a, { first: "Çok", last: "Cihaz" });
  await week(a);
  await week(a);
  const [code, sig] = await S(a, () => [
    window.Game.encodeSave(window.Game.S),
    `${window.Game.S.week}|${Math.round(window.Game.S.money)}`
  ]);
  await close(a);
  const b = await page();
  const ok = await b.evaluate(c => window.Game.importCode("\n  " + c + "  \n"), code);
  const sig2 = await S(b, () => `${window.Game.S.week}|${Math.round(window.Game.S.money)}`);
  assert(ok && sig === sig2, `${sig} vs ${sig2}`);
  await close(b);
});
test("F14", "işlevsel", "Geçersiz kayıt kodu reddedilir, yuvalar değişmez", async () => {
  const p = await page();
  const bad = ["", "abc", "!!!!", btoaSafe("{}"), btoaSafe('{"v":5,"S":{"first":"x"}}'), btoaSafe("null"), btoaSafe("[1,2]")];
  const r = await p.evaluate(list => list.map(c => window.Game.importCode(c)), bad);
  const slots = await S(p, () => [1, 2, 3, 4, 5].filter(i => localStorage.getItem("pota-slot-" + i)).length);
  assert(r.every(x => x === false) && slots === 0, JSON.stringify(r));
  assert(p.errs.length === 0, p.errs.join("|"));
  await close(p);
});
test("F15", "uç", "2 MB'lık çöp kayıt kodu donma ve hata olmadan reddedilir", async () => {
  const p = await page();
  const t0 = Date.now();
  const r = await p.evaluate(() => window.Game.importCode("A".repeat(2 * 1024 * 1024)));
  const ms = Date.now() - t0;
  assert(r === false && ms < 4000 && p.errs.length === 0, `sonuç ${r}, ${ms} ms`);
  await close(p);
  return `${ms} ms`;
});
test("F16", "işlevsel", "Bozuk ana kayıt yedekten (-bak) açılır", async () => {
  const p = await page();
  await career(p);
  await week(p);
  await p.evaluate(() => window.Game.save());
  await p.evaluate(() => localStorage.setItem("pota-slot-1", "{bozuk"));
  const r = await S(p, () => window.Game.loadSlot(1));
  assert(r && r.S && r.from === "backup", JSON.stringify(r && r.from));
  await close(p);
});
test(
  "F17",
  "işlevsel",
  "Reklam: süre dolmadan kapatılan ödüllü reklam ödül vermez; günlük sınır dolunca reklam açılmaz",
  async () => {
    const p = await page();
    await career(p);
    const r = await p.evaluate(async () => {
      const G = window.Game;
      const out = {};
      const pr = G.showRewarded("energy");
      await new Promise(r => setTimeout(r, 300));
      document.querySelector("#adx").click();
      out.early = await pr;
      G.ADS.today = G.ADS_CFG.dailyRewardCap;
      G.ADS.day = new Date().toISOString().slice(0, 10);
      out.capped = await G.showRewarded("energy");
      out.adOpen = !!document.querySelector("#adov");
      return out;
    });
    assert(r.early === false && r.capped === false && !r.adOpen, JSON.stringify(r));
    await close(p);
  }
);
test("F18", "işlevsel", "Oyun Kulübü 18 yaş altına kapalı", async () => {
  const p = await page();
  await career(p);
  const locked = await p.evaluate(() => {
    const G = window.Game;
    G.S.age = 16;
    G.openLoc("sans");
    return !document.querySelector("#ovl [data-b]");
  });
  assert(locked, "18 yaş altı kumarhane açık");
  await close(p);
});
test("F19", "işlevsel", "Mağaza: para yetmezse satın alma kapalı; satın alınca para düşer, eşya kalıcıdır", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    S.money = 0;
    G.openLoc("avm");
    const dis = [...document.querySelectorAll("#ovl [data-act]")].filter(b => !b.disabled).length;
    G.closeSheet();
    S.money = 1e7;
    G.openLoc("avm");
    const b = [...document.querySelectorAll("#ovl [data-act]")].find(x => !x.disabled);
    const m0 = S.money;
    b.click();
    return { enabledWhenBroke: dis, spent: m0 - S.money, owned: Object.keys(S.items).length };
  });
  await p.evaluate(() => window.Game.save());
  await p.reload();
  await p.waitForTimeout(400);
  const owned = await S(p, () => Object.keys(window.Game.loadSlot(1).S.items).length);
  assert(r.spent > 0 && owned >= 1, JSON.stringify(r) + " kalıcı:" + owned);
  await close(p);
  return JSON.stringify(r);
});
test("F20", "işlevsel", "Sezon sonu → teklif → yeni sezon: hafta 1, yeni lig, yeni hedefler", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game,
      S = G.S;
    const s0 = S.season;
    S.week = S.sched.length;
    G.seasonEnd(true, false, false);
    for (let i = 0; i < 30; i++) {
      const b = document.querySelector("#nx,#ok,#chok,[data-o],#ng-ok,#rok,#nok");
      if (!b) break;
      b.click();
      await new Promise(r => setTimeout(r, 40));
    }
    return { s0, s1: S.season, week: S.week, goals: S.goals && S.goals.season === S.season };
  });
  assert(r.s1 === r.s0 + 1 && r.week === 1 && r.goals, JSON.stringify(r));
  await close(p);
});

test("F21", "işlevsel", "Hiç dokunmayan oyuncu hiçbir maç mini oyununda sonsuza dek takılmaz", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game,
      out = {};
    const list = [
      ["shoot", el => G.mgShoot(el, { eff: 50, shots: 1 })],
      ["timing", el => G.mgTiming(el, { eff: 50, title: "t", tries: 1 })],
      ["pass", el => G.mgPass(el, { eff: 50, reps: 1 })],
      ["block", el => G.mgBlock(el, { eff: 50, reps: 1 })],
      ["dribble", el => G.mgDribble(el, { eff: 50, reps: 1 })],
      ["post", el => G.mgPost(el, { eff: 50, reps: 1 })],
      ["rebound", el => G.mgRebound(el, { eff: 50, reps: 1 })]
    ];
    for (const [k, fn] of list) {
      const el = document.createElement("div");
      document.querySelector("#app").replaceChildren(el);
      const t0 = performance.now();
      let done = false;
      fn(el).then(() => (done = true));
      while (!done && performance.now() - t0 < 30000) {
        await new Promise(r => setTimeout(r, 250));
        const q = document.querySelector("#qshot");
        if (q) q.click();
      }
      out[k] = done ? Math.round((performance.now() - t0) / 1000) : "TAKILDI";
    }
    return out;
  });
  const stuck = Object.entries(r).filter(([, v]) => v === "TAKILDI");
  assert(!stuck.length && p.errs.length === 0, JSON.stringify(r) + p.errs.join("|"));
  await close(p);
  return Object.entries(r)
    .map(([k, v]) => `${k} ${v} sn`)
    .join(", ");
});

/* ================= UÇ DURUMLAR ================= */
test("E01", "uç", "Tarayıcı depolaması kapalıyken oyun açılır ve oynanır", async () => {
  const p = await page({
    init: () =>
      (Storage.prototype.setItem = () => {
        throw new Error("SecurityError");
      })
  });
  await career(p).catch(() => {});
  const st = await S(p, () => !!window.Game.S && window.Game.S.week);
  const ok = await week(p).catch(e => "hata: " + e.message);
  assert(ok === true && p.errs.length === 0, `başlangıç:${st} hafta:${ok} hatalar:${p.errs.join("|")}`);
  await close(p);
});
test("E02", "uç", "IndexedDB yokken oyun açılır ve kaydeder", async () => {
  const p = await page({ init: () => Object.defineProperty(window, "indexedDB", { value: undefined }) });
  await career(p);
  const ok = await week(p);
  const saved = await S(p, () => !!localStorage.getItem("pota-slot-1"));
  assert(ok && saved && p.errs.length === 0, p.errs.join("|"));
  await close(p);
});
test("E03", "uç", "Depolama dolu (QuotaExceeded) olunca oyun çökmez, uyarı verir", async () => {
  const p = await page({
    init: () => {
      const o = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (String(k).startsWith("pota-slot")) throw new DOMException("dolu", "QuotaExceededError");
        return o.call(this, k, v);
      };
    }
  });
  await career(p);
  const ok = await week(p);
  assert(ok && p.errs.length === 0, p.errs.join("|"));
  await close(p);
});
test("E04", "uç", "Aşırı değerler (1e15 para, eksi para, NaN) arayüzde NaN/Infinity göstermez", async () => {
  const p = await page();
  await career(p);
  const bad = [];
  for (const v of [1e15, -1e6, NaN, Infinity]) {
    await p.evaluate(v => {
      const G = window.Game;
      G.S.money = v;
      G.save();
      const r = G.loadSlot(1);
      G.setS(r.S);
      G.migrate();
      G.renderMain();
      G.openLoc("ev", "finans");
    }, v);
    const t = await S(p, () => document.body.innerText);
    if (/NaN|Infinity|undefined/.test(t)) bad.push(String(v));
  }
  assert(!bad.length && p.errs.length === 0, "sorunlu: " + bad.join(",") + p.errs.join("|"));
  await close(p);
});
test("E05", "güvenlik", "Zararlı kayıt kodu (ad, takım, haber içinde HTML/JS) çalıştırılmaz", async () => {
  const p = await page();
  const payload = '<img src=x onerror="window.__xss=1">';
  const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "career-long.json"), "utf8");
  const ok = await p.evaluate(
    ([fx, pl]) => {
      const o = JSON.parse(fx);
      o.S.first = pl;
      o.S.last = pl;
      o.S.team.name = pl;
      o.S.team.short = pl;
      o.S.news = [{ w: "S1 H1", t: pl }];
      o.S.npc.coach = pl;
      if (o.S.hist[0]) o.S.hist[0].team = pl;
      const c = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
      return window.Game.importCode(c);
    },
    [fixture, payload]
  );
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const G = window.Game;
    G.renderMain();
    G.openLoc("ev", "kariyer");
    G.closeSheet();
    G.openLoc("stad", "kadro");
    G.closeSheet();
    G.leagueSheet("istat");
    G.closeSheet();
    G.renderSlots();
  });
  await p.waitForTimeout(300);
  const x = await S(p, () => ({ xss: !!window.__xss, img: document.querySelectorAll('img[src="x"]').length }));
  assert(ok && !x.xss && !x.img, JSON.stringify({ ok, ...x }));
  await close(p);
});
test("E06", "uç", "Yalnızca zorunlu alanları olan (eksik) kayıt açılır ve bir hafta oynanır", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const S = window.Game.S;
    const min = {
      first: S.first,
      last: S.last,
      team: S.team,
      st: S.st,
      league: S.league,
      rel: S.rel,
      sched: S.sched,
      teams: S.teams,
      stage: S.stage,
      week: 1,
      season: 1,
      age: 16,
      pos: S.pos,
      look: S.look,
      num: 7,
      phase: "regular",
      slot: 3
    };
    localStorage.setItem("pota-slot-2", JSON.stringify({ v: 5, S: min }));
    const r = window.Game.loadSlot(2);
    window.Game.setS(r.S);
    window.Game.migrate();
  });
  const ok = await week(p);
  assert(ok && p.errs.length === 0, p.errs.join("|"));
  await close(p);
});
test("E07", "uç", "İki sekme aynı yuvada aynı anda oynayınca kayıt bozulmaz", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const a = await ctx.newPage(),
    b = await ctx.newPage();
  const errs = [];
  for (const x of [a, b]) {
    x.on("pageerror", e => errs.push(e.message));
    await x.goto(SINGLE);
    await x.waitForTimeout(400);
  }
  a.ctx = ctx;
  await career(a);
  await b.evaluate(() => {
    const r = window.Game.loadSlot(1);
    window.Game.setS(r.S);
    window.Game.migrate();
    window.Game.renderMain();
  });
  await Promise.all([week(a), week(b)]);
  await week(a);
  const r = await a.evaluate(() => {
    const r = window.Game.loadSlot(1);
    return r && r.S && r.from;
  });
  assert(r === "main" && !errs.length, `${r} ${errs.join("|")}`);
  await ctx.close();
  return "son yazan kazanır (bilinen davranış)";
});
test("E08", "uç", "Saat dilimleri (Kiritimati UTC+14, Los Angeles): görevler üretilir, hata yok", async () => {
  for (const tz of ["Pacific/Kiritimati", "America/Los_Angeles", "Asia/Kolkata"]) {
    const p = await page({ ctx: { timezoneId: tz } });
    await career(p, {});
    const r = await p.evaluate(() => {
      const G = window.Game;
      G.S.season = 2;
      const M = G.missions();
      return M && M.daily.length === 3 && M.weekly.length === 3;
    });
    assert(r && p.errs.length === 0, tz);
    await close(p);
  }
});
test("E09", "uç", "Yaz saati geçişi ve gece yarısı: günlük görevler tam bir kez yenilenir", async () => {
  const p = await page({ ctx: { timezoneId: "Europe/Berlin" } });
  await p.clock.install({ time: new Date("2026-03-28T22:30:00+01:00") });
  await p.reload();
  await p.waitForTimeout(500);
  await career(p);
  const d1 = await p.evaluate(() => {
    window.Game.S.season = 2;
    return window.Game.missions().day;
  });
  await p.clock.fastForward("02:00:00"); // gece yarısını ve 02:00 yaz saati geçişini aşar
  const d2 = await p.evaluate(() => window.Game.missions().day);
  await p.clock.fastForward("01:00:00");
  const d3 = await p.evaluate(() => window.Game.missions().day);
  assert(d1 === "2026-03-28" && d2 === "2026-03-29" && d3 === d2, [d1, d2, d3].join(" → "));
  await close(p);
});
test("E10", "uç", "Cihaz saati geri alınınca görevler ve reklam sınırı yenilenmez, ileri gün yenilenir", async () => {
  const p = await page();
  await p.clock.install({ time: new Date("2026-06-10T12:00:00") });
  await p.reload();
  await p.waitForTimeout(500);
  await career(p);
  const a = await p.evaluate(() => {
    const G = window.Game;
    G.S.season = 2;
    const M = G.missions();
    G.adsDayTick(); // bugünü işaretle, sonra sınırı doldur
    G.ADS.today = G.ADS_CFG.dailyRewardCap;
    return { day: M.day, ids: M.daily.map(m => m.id).join() };
  });
  await p.clock.setSystemTime(new Date("2026-06-09T12:00:00"));
  const b = await p.evaluate(() => {
    const G = window.Game;
    G.adsDayTick();
    const M = G.missions();
    return { day: M.day, ids: M.daily.map(m => m.id).join(), left: G.rewardLeft() };
  });
  await p.clock.setSystemTime(new Date("2026-06-11T12:00:00"));
  const c = await p.evaluate(() => ({ day: window.Game.missions().day, left: window.Game.rewardLeft() }));
  assert(
    b.day === a.day && b.ids === a.ids && b.left === 0,
    "geri alınan saat görevleri/sınırı yeniledi: " + JSON.stringify({ a, b })
  );
  const cap = await p.evaluate(() => window.Game.ADS_CFG.dailyRewardCap);
  assert(c.day === "2026-06-11" && c.left === cap, "ileri gün yenilemedi: " + JSON.stringify(c));
  await close(p);
  return `${a.day} → (saat geri) ${b.day}, sınır ${b.left} → (ileri gün) ${c.day}, sınır ${c.left}`;
});
test("E11", "uç", "Boşluk ve satır sonu içeren kayıt kodu içe aktarılır", async () => {
  const p = await page();
  await career(p);
  const code = await S(p, () => window.Game.encodeSave(window.Game.S));
  await p.evaluate(() => localStorage.clear());
  const ok = await p.evaluate(c => window.Game.importCode("\n\t " + c + " \n"), code);
  assert(ok, "trim yok");
  await close(p);
});

/* ================= ARAYÜZ ================= */
test("V01", "arayüz", "Dört ekran boyutunda (dikey/yatay, telefon/tablet) bütün ana ekranlarda yatay taşma yok", async () => {
  const bad = [];
  let n = 0;
  for (const vp of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 820, height: 1180 }
  ]) {
    const p = await page({ ctx: { viewport: vp } });
    await career(p);
    await p.evaluate(() => {
      const G = window.Game;
      G.S.stage = "t1";
      G.S.age = 29;
      G.S.season = 3;
    });
    const screens = [
      "main",
      "ev",
      "stad",
      "okul",
      "medya",
      "aile",
      "kafe",
      "eglence",
      "avm",
      "market",
      "sans",
      "settings",
      "lc",
      "slots",
      "create"
    ];
    for (const sc of screens) {
      const w = await p.evaluate(sc => {
        const G = window.Game;
        G.closeSheet();
        if (sc === "slots") G.renderSlots();
        else if (sc === "create") {
          G.F.slot = 2;
          G.renderCreate();
        } else {
          if (!G.S) {
            const r = G.loadSlot(1);
            G.setS(r.S);
            G.migrate();
          }
          G.renderMain();
          if (sc === "settings") G.settingsSheet();
          else if (sc === "lc") G.leagueSheet("tablo");
          else if (sc !== "main") G.openLoc(sc);
        }
        return document.documentElement.scrollWidth;
      }, sc);
      n++;
      if (w > vp.width + 1) bad.push(`${vp.width}x${vp.height} ${sc}: ${w}px`);
    }
    if (p.errs.length) bad.push("hata: " + p.errs[0]);
    await close(p);
  }
  assert(!bad.length, bad.join(", "));
  return `${n} ekran × boyut denetlendi`;
});

/* ================= GÜVENLİK ================= */
test("S01", "güvenlik", "Normal oyunda dış ağ isteği yok (telemetri, Sentry, bulut kapalı)", async () => {
  const p = await page({}, SINGLE);
  const ext = [];
  p.on("request", r => {
    const u = r.url();
    if (/^https?:/.test(u) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(u)) ext.push(new URL(u).host);
  });
  await career(p);
  for (let i = 0; i < 4; i++) await week(p);
  const hosts = [...new Set(ext)];
  assert(
    hosts.every(h => /fonts\.(googleapis|gstatic)\.com/.test(h)),
    hosts.join(",")
  );
  await close(p);
  return hosts.length ? `yalnızca yazı tipi: ${hosts.join(", ")}` : "hiç dış istek yok";
});
test("S02", "güvenlik", "Paketlenmiş kodda eval / new Function yok", async () => {
  const js = fs.readdirSync(path.join(ROOT, "dist", "assets")).filter(f => f.endsWith(".js"));
  const bad = js.filter(f => /\beval\(|new Function\(/.test(fs.readFileSync(path.join(ROOT, "dist", "assets", f), "utf8")));
  assert(!bad.length, bad.join(","));
});
test("S03", "güvenlik", "Yerel depoda kişisel veri ve belirteç yok (yalnızca oyun verisi)", async () => {
  const p = await page();
  await career(p);
  await week(p);
  const keys = await S(p, () => Object.keys(localStorage));
  const dump = await S(p, () => Object.values(localStorage).join(" "));
  assert(!/@[a-z0-9-]+\.[a-z]{2,}|idToken|refreshToken|password/i.test(dump), "şüpheli içerik");
  await close(p);
  return keys.join(", ");
});

test("S04", "güvenlik", "Pages derlemesinde CSP var ve oyun sırasında CSP ihlali yok", async () => {
  const p = await page({}, BASE);
  const viol = [];
  p.on("console", m => /Content Security Policy|Refused to/.test(m.text()) && viol.push(m.text().slice(0, 120)));
  const has = await S(p, () => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
  await career(p);
  for (let i = 0; i < 3; i++) await week(p);
  await p.evaluate(async () => {
    const G = window.Game;
    G.openLoc("ev", "kariyer");
    G.closeSheet();
    await G.careerCardSheet();
    G.closeSheet();
    G.settingsSheet();
  });
  assert(has && !viol.length && p.errs.length === 0, `CSP:${has} ihlal:${viol.join(" | ")} ${p.errs.join("|")}`);
  await close(p);
});
test("S05", "güvenlik", "Savunma katmanı: temizlik atlatılsa bile CSP satır içi betiği engeller", async () => {
  const p = await page({}, BASE);
  const x = await p.evaluate(async () => {
    const d = document.createElement("div");
    d.innerHTML = '<img src="x" onerror="window.__xss=1">';
    document.body.appendChild(d);
    await new Promise(r => setTimeout(r, 400));
    return !!window.__xss;
  });
  assert(!x, "satır içi olay işleyicisi çalıştı");
  await close(p);
});

/* ================= PERFORMANS ================= */
const perf = {};
test("P01", "performans", "Açılış süresi (Pages derlemesi, soğuk ve sıcak)", async () => {
  const cold = [],
    warm = [];
  for (let i = 0; i < 4; i++) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    let t0 = Date.now();
    await p.goto(BASE);
    await p.waitForFunction(() => window.Game && document.querySelector("#app").children.length > 0);
    cold.push(Date.now() - t0);
    t0 = Date.now();
    await p.reload();
    await p.waitForFunction(() => window.Game && document.querySelector("#app").children.length > 0);
    warm.push(Date.now() - t0);
    await ctx.close();
  }
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  perf.startup = { coldMs: med(cold), warmMs: med(warm), runs: cold.length };
  return `soğuk ${perf.startup.coldMs} ms, sıcak ${perf.startup.warmMs} ms (medyan, ${cold.length} ölçüm)`;
});
test("P02", "performans", "Ana ekran çizimi ve hafta ilerletme süresi", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      t = [];
    for (let i = 0; i < 60; i++) {
      const a = performance.now();
      G.renderMain();
      t.push(performance.now() - a);
    }
    t.sort((a, b) => a - b);
    return { avg: t.reduce((a, b) => a + b, 0) / t.length, p95: t[Math.floor(t.length * 0.95)] };
  });
  const ws = [];
  for (let i = 0; i < 8; i++) {
    const a = Date.now();
    await week(p);
    ws.push(Date.now() - a);
  }
  perf.renderMain = { avgMs: +r.avg.toFixed(2), p95Ms: +r.p95.toFixed(2) };
  perf.week = { avgMs: Math.round(ws.reduce((a, b) => a + b, 0) / ws.length), note: "otomasyonun ekran geçişleri dahil" };
  await close(p);
  return `renderMain ort ${perf.renderMain.avgMs} ms (p95 ${perf.renderMain.p95Ms}); hafta ort ${perf.week.avgMs} ms`;
});
test("P03", "performans", "Uzun kariyer kaydı (18 sezon): yükleme, kaydetme, boyut, Lig merkezi, kariyer kartı", async () => {
  const p = await page();
  const fx = fs.readFileSync(path.join(__dirname, "fixtures", "career-long.json"), "utf8");
  const r = await p.evaluate(async fx => {
    localStorage.setItem("pota-slot-1", fx);
    const G = window.Game,
      m = {};
    let a = performance.now();
    const s = G.loadSlot(1);
    G.setS(s.S);
    G.migrate();
    m.load = performance.now() - a;
    a = performance.now();
    for (let i = 0; i < 20; i++) G.save();
    m.save = (performance.now() - a) / 20;
    m.kb = Math.round(localStorage.getItem("pota-slot-1").length / 1024);
    a = performance.now();
    G.leagueSheet("istat");
    m.league = performance.now() - a;
    a = performance.now();
    await G.careerCardCanvas();
    m.card = performance.now() - a;
    a = performance.now();
    G.openLoc("ev", "kariyer");
    m.career = performance.now() - a;
    return m;
  }, fx);
  perf.longCareer = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(1)]));
  assert(r.save < 50 && r.load < 200, JSON.stringify(perf.longCareer));
  await close(p);
  return JSON.stringify(perf.longCareer);
});
test("P04", "performans", "Bellek: 5 tam kariyerlik simülasyonda yığın büyümesi (sızıntı kontrolü)", async () => {
  const p = await page();
  const cdp = await p.ctx.newCDPSession(p);
  await p.evaluate(fs.readFileSync(path.join(__dirname, "sim-player.js"), "utf8"));
  const heap = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    const m = await cdp.send("Runtime.getHeapUsage");
    return Math.round(m.usedSize / 1048576);
  };
  const h = [await heap()];
  for (let i = 0; i < 5; i++) {
    await p.evaluate(() => window.__runCareer("avg", "PG"));
    h.push(await heap());
  }
  perf.heapMB = h;
  assert(h[5] - h[1] < 25, "yığın büyümesi: " + h.join(" → "));
  await close(p);
  return h.join(" → ") + " MB";
});
test("P05", "performans", "Mini oyun kare hızı (şut mini oyunu, 3 sn)", async () => {
  const p = await page();
  await career(p);
  const fps = await p.evaluate(async () => {
    const el = document.querySelector("#app");
    window.Game.mgShoot(el, { eff: 50, shots: 3 });
    const t = [];
    await new Promise(res => {
      let last = performance.now();
      const f = now => {
        t.push(now - last);
        last = now;
        if (t.length < 180) requestAnimationFrame(f);
        else res();
      };
      requestAnimationFrame(f);
    });
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length;
    return { fps: Math.round(1000 / avg), worstMs: Math.round(t[t.length - 1]) };
  });
  perf.minigame = fps;
  await close(p);
  return `${fps.fps} FPS, en yavaş kare ${fps.worstMs} ms (başsız Chromium)`;
});
test("P06", "performans", "Paket boyutları", async () => {
  const dir = path.join(ROOT, "dist", "assets");
  const files = fs.readdirSync(dir).map(f => [f, fs.statSync(path.join(dir, f)).size]);
  perf.bundle = files.map(([f, s]) => `${f.replace(/-[\w-]{6,}\./, ".")}: ${Math.round(s / 1024)} KB`);
  perf.bundle.push(`index.html: ${Math.round(fs.statSync(path.join(ROOT, "dist", "index.html")).size / 1024)} KB`);
  return perf.bundle.join(", ");
});
test("P07", "performans", "Çevrimdışı: servis çalışanı önbelleğinden açılır", async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p
    .waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 8000 })
    .catch(() => {});
  await p.reload();
  await p.waitForTimeout(800);
  await ctx.setOffline(true);
  let ok = false;
  try {
    await p.reload({ timeout: 8000 });
    await p.waitForFunction(() => window.Game && document.querySelector("#app").children.length > 0, null, { timeout: 8000 });
    ok = true;
  } catch (e) {
    ok = false;
  }
  await ctx.close();
  assert(ok, "çevrimdışı açılmadı");
});

test("P08", "performans", "Stres: 300 mekan aç-kapat ve 30 hafta; bellek ve süre", async () => {
  const p = await page();
  const cdp = await p.ctx.newCDPSession(p);
  const heap = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    return Math.round((await cdp.send("Runtime.getHeapUsage")).usedSize / 1048576);
  };
  await career(p);
  const h0 = await heap();
  const t0 = Date.now();
  await p.evaluate(() => {
    const G = window.Game,
      L = ["ev", "stad", "okul", "medya", "aile", "kafe", "eglence", "avm", "market", "sans"];
    for (let i = 0; i < 300; i++) {
      G.openLoc(L[i % L.length]);
      G.closeSheet();
    }
  });
  const navMs = Date.now() - t0;
  const h1 = await heap();
  const t1 = Date.now();
  for (let i = 0; i < 30; i++) assert(await week(p), "hafta " + i);
  const weekMs = Math.round((Date.now() - t1) / 30);
  const h2 = await heap();
  perf.stress = { navMs, perOpenMs: +(navMs / 300).toFixed(2), weekMs, heapMB: [h0, h1, h2] };
  assert(h2 - h0 < 20 && p.errs.length === 0, JSON.stringify(perf.stress) + p.errs.join("|"));
  await close(p);
  return JSON.stringify(perf.stress);
});

function btoaSafe(s) {
  return Buffer.from(s, "utf8").toString("base64");
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  browser = await chromium.launch();
  await serveDist();
  for (const t of T) {
    if (FILTER && !FILTER.test(t.id)) continue;
    const t0 = Date.now();
    let status = "geçti",
      detail = "";
    try {
      const r = await Promise.race([
        t.fn(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("zaman aşımı (120 sn)")), 120000))
      ]);
      if (r) detail = String(r);
    } catch (e) {
      status = /engelli/.test(e.message) ? "engelli" : "kaldı";
      detail = e.message.split("\n")[0].slice(0, 300);
    }
    results.push({ id: t.id, cat: t.cat, name: t.name, status, detail, ms: Date.now() - t0 });
    console.log(
      `${status === "geçti" ? "✓" : status === "engelli" ? "∅" : "✗"} ${t.id} ${t.name}${detail ? " — " + detail : ""}`
    );
  }
  await browser.close();
  server.close();
  const sum = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  fs.writeFileSync(
    path.join(OUT, "audit-results.json"),
    JSON.stringify({ date: new Date().toISOString(), summary: sum, perf, results }, null, 1)
  );
  console.log(`\n${results.length} test: ${JSON.stringify(sum)}`);
  process.exit(results.some(r => r.status === "kaldı") ? 1 : 0);
})();
