// Persona yolculukları: node tests/personas.js [filtre]
// 25 farklı kullanıcı tipi, birden çok özelliği birlikte kullanan uçtan uca senaryolar. Her yolculuk gerçek oyunda
// çalışır (dokunuşlar, yeniden yükleme, çevrimdışı, ikinci cihaz…). Sonuçlar: reports/data/persona-results.json
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const { ROOT, serveDist, open, career, toMain, week, assert } = require("./lib.js");
const FILTER = process.argv[2] ? new RegExp(process.argv[2]) : null;
const FIX = () => fs.readFileSync(path.join(__dirname, "fixtures", "career-long.json"), "utf8");
const P = [];
const persona = (id, name, fn) => P.push({ id, name, fn });
let browser, BASE;
const noErr = p => assert(p.errs.length === 0, "sayfa hatası: " + p.errs.slice(0, 2).join(" | "));
const loadFixture = async (p, slot = 1) => {
  await p.evaluate(([fx, s]) => localStorage.setItem("pota-slot-" + s, fx), [FIX(), slot]);
};

persona("U01", "Yeni oyuncu: oluşturma ekranı, tanıtım turu, ilk iki hafta", async () => {
  const p = await open(browser);
  await p.evaluate(() => {
    window.Game.ADS.consent = true;
  });
  await p.click("[data-new='1']");
  await p.fill("#fn", "Ece");
  await p.fill("#ln", "Yıldırım");
  await p.click("#pos [data-v='PG']");
  await p.click("#go");
  await p.waitForTimeout(300);
  for (let i = 0; i < 20; i++) {
    const b = (await p.$("#chok")) || (await p.$("#tr-next")) || (await p.$("#ac-yes"));
    if (!b) break;
    await b.click();
    await p.waitForTimeout(320);
  }
  const s = await p.evaluate(() => ({ tut: window.Game.S.tut, name: window.Game.S.first, pos: window.Game.S.pos }));
  assert(s.tut === 1 && s.name === "Ece" && s.pos === "PG", JSON.stringify(s));
  assert(await week(p), "1. hafta");
  assert(await week(p), "2. hafta");
  noErr(p);
  await p.ctx.close();
});
persona("U02", "Geri dönen oyuncu: kayıt ekranından devam, Lig merkezi", async () => {
  const p = await open(browser);
  await loadFixture(p);
  await p.reload();
  await p.waitForTimeout(400);
  await p.click("[data-go='1']");
  await p.waitForTimeout(300);
  await toMain(p);
  const n = await p.evaluate(() => window.Game.S.first);
  await p.click("#lgc");
  for (const t of ["tablo", "fikstur", "istat", "kral"]) await p.click(`[data-lc='${t}']`);
  assert(n === "Uzun", n);
  noErr(p);
  await p.ctx.close();
});
persona("U03", "Eksik profil: yalnızca adla başlamaya çalışır, uyarı alır, düzeltir", async () => {
  const p = await open(browser);
  await p.click("[data-new='1']");
  await p.fill("#fn", "Can");
  await p.fill("#ln", "");
  await p.click("#go");
  const blocked = await p.evaluate(() => !window.Game.S);
  await p.fill("#ln", "Er");
  await p.click("#go");
  await p.waitForTimeout(300);
  const ok = await p.evaluate(() => window.Game.S && window.Game.S.last === "Er");
  assert(blocked && ok, `engellendi:${blocked} başladı:${ok}`);
  noErr(p);
  await p.ctx.close();
});
persona("U04", "Uzun geçmişli oyuncu: 18 sezonluk kariyerin bütün Ev sekmeleri, albüm, kart, istatistik", async () => {
  const p = await open(browser);
  await loadFixture(p);
  await p.evaluate(async () => {
    const G = window.Game;
    const r = G.loadSlot(1);
    G.setS(r.S);
    G.migrate();
    G.renderMain();
    for (const t of ["vitrin", "genel", "yetenek", "finans", "kariyer", "miras", "ev"]) {
      G.closeSheet();
      G.openLoc("ev", t);
    }
    G.closeSheet();
    G.albumSheet();
    G.closeSheet();
    await G.careerCardSheet();
    G.closeSheet();
    G.leagueSheet("istat");
  });
  noErr(p);
  await p.ctx.close();
});
persona("U05", "Sürekli oluşturup silen: 5 yuvayı doldurur, 3'ünü siler, yeniden oluşturur", async () => {
  const p = await open(browser);
  for (let s = 1; s <= 5; s++) await career(p, { slot: s, first: "K" + s });
  await p.evaluate(() => window.Game.renderSlots());
  for (const s of [2, 4, 5]) {
    await p.click(`[data-del='${s}']`);
    await p.click("#y1");
  }
  await career(p, { slot: 4, first: "Yeni" });
  const r = await p.evaluate(() =>
    [1, 2, 3, 4, 5].map(i => (window.Game.loadSlot(i) ? window.Game.loadSlot(i).S.first : "-")).join(",")
  );
  assert(r === "K1,-,K3,Yeni,-", r);
  noErr(p);
  await p.ctx.close();
});
persona("U06", "Birkaç saniyelik kullanıcı: açıp hemen kapatır (5 kez)", async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  for (let i = 0; i < 5; i++) {
    await p.goto(require("./lib.js").SINGLE);
    await p.waitForTimeout(80 + i * 40);
    if (i === 2) await p.evaluate(() => window.Game && window.Game.F && (window.Game.F.slot = 1));
    await p.goto("about:blank");
  }
  await p.goto(require("./lib.js").SINGLE);
  await p.waitForTimeout(400);
  const ok = await p.evaluate(() => !!document.querySelector("[data-new]") || !!document.querySelector("[data-go]"));
  assert(ok && !errs.length, errs.join("|"));
  await ctx.close();
});
persona("U07", "Hızlı gezgin: haritada 60 rastgele mekan aç-kapat dokunuşu", async () => {
  const p = await open(browser);
  await career(p);
  for (let i = 0; i < 60; i++) {
    const locs = await p.$$(".loc");
    await locs[i % locs.length].click();
    const x = await p.$("#shx");
    if (x) await x.click();
  }
  noErr(p);
  await p.ctx.close();
});
persona("U08", "Hata yapıp düzelten: alamayacağı eşyaya dokunur, ayarları açıp kapatır, pazarlıktan vazgeçer", async () => {
  const p = await open(browser);
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.money = 0;
    G.openLoc("avm");
    const b = document.querySelector("#ovl [data-act]");
    if (b) b.click();
    G.closeSheet();
    G.settingsSheet();
    document.querySelector('[data-tg="sound"]').click();
    document.querySelector('[data-tg="sound"]').click();
  });
  const r = await p.evaluate(async () => {
    const G = window.Game;
    G.S.stage = "t2";
    const t = G.leaguePool("t1", "TR")[0];
    let back = false;
    G.negotiateOffer({ team: t, stage: "t1", role: "rot", wage: 100, years: 2 }, sg => (back = sg === null));
    document.querySelector("#ng-back").click();
    return { money: G.S.money, sound: G.SETTINGS.sound, back };
  });
  assert(r.money === 0 && r.sound === true && r.back, JSON.stringify(r));
  noErr(p);
  await p.ctx.close();
});
persona("U09", "Kötü bağlantı: oyun ortasında çevrimdışı kalır, oynamaya ve yeniden açmaya devam eder", async () => {
  const p = await open(browser, {}, BASE);
  await p
    .waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 8000 })
    .catch(() => {});
  await p.reload();
  await p.waitForTimeout(600);
  await career(p);
  await p.ctx.setOffline(true);
  assert(await week(p), "çevrimdışı hafta");
  await p.reload();
  await p.waitForTimeout(800);
  const s = await p.evaluate(() => window.Game.loadSlot(1) && window.Game.loadSlot(1).S.week);
  await p.ctx.setOffline(false);
  assert(s === 2, "hafta " + s);
  noErr(p);
  await p.ctx.close();
});
persona("U10", "Kapat-aç: her haftadan sonra uygulamayı kapatıp açar (5 kez)", async () => {
  const p = await open(browser);
  await career(p);
  for (let i = 0; i < 5; i++) {
    assert(await week(p), "hafta " + i);
    await p.reload();
    await p.waitForTimeout(400);
    await p.click("[data-go='1']");
    await p.waitForTimeout(200);
    await toMain(p);
  }
  const w = await p.evaluate(() => window.Game.S.week);
  assert(w === 6, "hafta " + w);
  noErr(p);
  await p.ctx.close();
});
persona("U11", "Çok cihazlı oyuncu: A'dan kodla B'ye taşır, ikisinde ayrı ilerler", async () => {
  const a = await open(browser);
  await career(a, { first: "Mavi" });
  await week(a);
  const code = await a.evaluate(() => window.Game.encodeSave(window.Game.S));
  const b = await open(browser);
  await b.evaluate(c => window.Game.importCode(c), code);
  await toMain(b);
  await week(b);
  await week(b);
  await week(a);
  const wa = await a.evaluate(() => window.Game.S.week),
    wb = await b.evaluate(() => window.Game.S.week);
  assert(wa === 3 && wb === 4, `A ${wa} B ${wb}`);
  noErr(a);
  noErr(b);
  await a.ctx.close();
  await b.ctx.close();
});
persona("U12", "Oturumu düşen oyuncu (bulut kayıt): bulut kapalıyken ayarlar 'yakında' der, ağ isteği yok", async () => {
  const p = await open(browser);
  const ext = [];
  p.on("request", r => /googleapis|accounts\.google|firestore/.test(r.url()) && ext.push(r.url()));
  await career(p);
  await p.evaluate(() => window.Game.settingsSheet());
  const r = await p.evaluate(() => ({
    txt: document.querySelector("#ovl").innerText,
    signIn: !!document.querySelector("#cl-in"),
    ready: window.Game.cloudReady()
  }));
  assert(!r.ready && !r.signIn && /bulut/i.test(r.txt) && !ext.length, JSON.stringify({ ...r, txt: r.txt.slice(0, 60), ext }));
  noErr(p);
  await p.ctx.close();
  return "kimlik doğrulama yok (uygulanamaz); bulut yapılandırılmamış, giriş düğmesi yok, istek yok";
});
persona("U13", "Aynı kodu iki kez içe aktaran: iki ayrı yuva, ikisi de oynanır", async () => {
  const p = await open(browser);
  await career(p);
  const code = await p.evaluate(() => window.Game.encodeSave(window.Game.S));
  await p.evaluate(() => localStorage.clear());
  const r = await p.evaluate(c => [window.Game.importCode(c), window.Game.importCode(c)], code);
  await toMain(p);
  assert(await week(p), "hafta");
  const slots = await p.evaluate(() => [1, 2, 3, 4, 5].filter(i => window.Game.loadSlot(i)).length);
  assert(r[0] && r[1] && slots === 2, `${r} ${slots}`);
  noErr(p);
  await p.ctx.close();
});
persona("U14", "Maçı kendi oynayan: bütün karar anları ve mini oyunlar dokunuşla", async () => {
  const p = await open(browser);
  await career(p);
  const g0 = await p.evaluate(() => window.Game.S.career.games);
  await p.evaluate(() => {
    window.Game.playMatch(); // maç sözü beklenmez: oyuncunun dokunuşlarını bekler
  });
  await p.waitForTimeout(400);
  const m = (await p.$("[data-m='key']")) || (await p.$("[data-m]"));
  if (m) await m.click();
  // karar anında ilk seçenek; mini oyunda tuvalin ortasına ve eylem düğmesine dokunma olayları
  const end = Date.now() + 230000;
  while (Date.now() < end) {
    const st = await p.evaluate(g0 => {
      const $ = s => document.querySelector(s);
      if (window.Game.S.career.games > g0) return "done";
      const ch = $("#mview [data-k]");
      if (ch) return (ch.click(), "k");
      // ikinci karar (src/court.js) ve oyunu kur ekranı (src/matchday.js)
      const fu = $("#mview [data-fu]");
      if (fu) return (fu.click(), "fu");
      const rb = $("#mview [data-rb]"); // ribaund ve ikinci şans
      if (rb) return (rb.click(), "rb");
      const rf = $("#mview [data-rf]"); // hakemle tartışma (src/tales.js)
      if (rf) return (rf.click(), "rf");
      // mola setleri (seriyi kes, son şut, pick and roll, zon) rastgele; son dakika kararı (src/clutch.js)
      const tos = [...document.querySelectorAll("#mview [data-to]")];
      const to = tos.length ? tos[Math.floor(Math.random() * tos.length)] : $("#mview [data-lt]");
      if (to) return (to.click(), "to");
      const sg = $("#sp-go");
      if (sg) {
        if (sg.disabled) {
          const a = $("#sp-s [data-v]:not(.on)"),
            b = $("#sp-r [data-v]:not(.on)");
          if (!$("#sp-s .on") && a) a.click();
          else if (!$("#sp-r .on") && b) b.click();
        } else sg.click();
        return "sp";
      }
      const q = $("#qgo");
      if (q) return (q.click(), "q");
      const cv = $("#mview canvas");
      if (cv) {
        const r = cv.getBoundingClientRect();
        const ev = t =>
          cv.dispatchEvent(
            new PointerEvent(t, { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.6, pointerId: 1 })
          );
        ev("pointerdown");
        ev("pointerup");
        const bb = $("#mgC button");
        if (bb) {
          bb.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          bb.click();
        }
        return "cv";
      }
      return "w";
    }, g0);
    if (st === "done") break;
    await p.waitForTimeout(40);
  }
  await toMain(p);
  const g1 = await p.evaluate(() => window.Game.S.career.games);
  assert(g1 === g0 + 1, `maç ${g0}→${g1}`);
  noErr(p);
  await p.ctx.close();
});
persona("U15", "Reklam seven: enerji ve prim reklamlarını günlük sınıra kadar izler", async () => {
  const p = await open(browser);
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    // güvenlik tavanının hemen altından başla (tavan 100: gerçek oyuncu görmez)
    G.ADS.today = G.ADS_CFG.dailyRewardCap - 6;
    G.ADS.day = new Date().toISOString().slice(0, 10);
    let ok = 0;
    for (let i = 0; i < 8; i++) {
      const pr = G.showRewarded("energy");
      for (let t = 0; t < 90; t++) {
        const b = document.querySelector("#adx");
        // ödüllü reklamda düğme baştan etkin (erken kapatma); süre dolunca "pri" olur
        if (b && b.classList.contains("pri")) {
          b.click();
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      if (await pr) ok++;
    }
    return { ok, today: G.ADS.today, cap: G.ADS_CFG.dailyRewardCap };
  });
  assert(r.ok === 6 && r.today === r.cap, JSON.stringify(r));
  noErr(p);
  await p.ctx.close();
  return `güvenlik tavanına (${r.cap}) kadar ödül verildi, sonraki 2 reklam reddedildi`;
});
persona("U16", "Reklam reddeden: izin vermez, reklamı erken kapatır, oyuna devam eder", async () => {
  const p = await open(browser);
  await career(p, { consent: null });
  const r = await p.evaluate(async () => {
    const G = window.Game;
    const e0 = G.S.energy;
    const pr = G.showRewarded("energy");
    await new Promise(r => setTimeout(r, 200));
    document.querySelector("#ac-no").click();
    await new Promise(r => setTimeout(r, 300));
    document.querySelector("#adx").click();
    return { got: await pr, consent: G.ADS.consent, e: G.S.energy === e0 };
  });
  assert(r.got === false && r.consent === false && r.e, JSON.stringify(r));
  assert(await week(p), "hafta");
  noErr(p);
  await p.ctx.close();
});
persona("U17", "Oyun Kulübü oyuncusu: fişleri bitene kadar oynar, eksiye düşmez", async () => {
  const p = await open(browser);
  await career(p);
  const r = await p.evaluate(async () => {
    const G = window.Game;
    G.S.age = 20;
    G.S.chips = 300;
    for (let i = 0; i < 120; i++) {
      G.openLoc("sans");
      const btns = [...document.querySelectorAll("#ovl button:not([disabled])")].filter(b => !/shx/.test(b.id));
      if (!btns.length) break;
      btns[i % btns.length].click();
      await new Promise(r => setTimeout(r, 20));
    }
    G.closeSheet();
    return G.S.chips;
  });
  assert(r >= 0, "fiş " + r);
  noErr(p);
  await p.ctx.close();
  return "kalan fiş " + r;
});
persona("U18", "Alışverişçi: parası yettiğince her şeyi alır, para eksiye düşmez", async () => {
  const p = await open(browser);
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.S.money = 5000;
    G.S.stage = "t2";
    let n = 0;
    for (let i = 0; i < 60; i++) {
      G.closeSheet();
      G.openLoc("avm");
      const b = [...document.querySelectorAll("#ovl [data-act]")].find(x => !x.disabled);
      if (!b) break;
      b.click();
      n++;
    }
    return { n, money: G.S.money, items: Object.keys(G.S.items).length };
  });
  assert(r.money >= 0 && r.items >= 1, JSON.stringify(r));
  noErr(p);
  await p.ctx.close();
  return JSON.stringify(r);
});
persona("U19", "Erişilebilirlik kullanıcısı: 320 px, çok büyük yazı, renk körlüğü, kolay mod", async () => {
  const p = await open(browser, { ctx: { viewport: { width: 320, height: 568 } } });
  await p.evaluate(() => {
    const G = window.Game;
    Object.assign(G.SETTINGS, { fs: "xl", cb: true, diff: "kolay" });
    G.saveSettings();
    G.applyA11y();
  });
  await career(p);
  const over = [];
  for (const scr of ["main", "ev", "stad", "lc", "settings"]) {
    await p.evaluate(s => {
      const G = window.Game;
      G.closeSheet();
      G.renderMain();
      if (s === "ev") G.openLoc("ev");
      if (s === "stad") G.openLoc("stad", "idman");
      if (s === "lc") G.leagueSheet("tablo");
      if (s === "settings") G.settingsSheet();
    }, scr);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    if (w > 321) over.push(`${scr}:${w}px`);
  }
  assert(await week(p), "hafta");
  assert(!over.length, "yatay taşma: " + over.join(", "));
  noErr(p);
  await p.ctx.close();
});
persona("U20", "Dil değiştiren: TR → EN → TR, kariyer bozulmaz", async () => {
  const p = await open(browser);
  await career(p);
  await week(p);
  for (const l of ["en", "tr"]) {
    await p.evaluate(l => {
      window.Game.settingsSheet();
      document.querySelector(`[data-lang="${l}"]`).click();
    }, l);
    await p.waitForTimeout(1300);
  }
  const s = await p.evaluate(() => window.Game.S && [window.Game.S.week, window.Game.S.first]);
  assert(s && s[0] === 2 && s[1] === "Deniz", JSON.stringify(s));
  noErr(p);
  await p.ctx.close();
});
persona("U21", "Emekli olup oğluyla devam eden: emeklilik, son bölüm, oğul kariyeri, ilk hafta", async () => {
  const p = await open(browser);
  await loadFixture(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    const s = G.loadSlot(1);
    G.setS(s.S);
    G.migrate();
    G.retireScreen();
    document.querySelector("[data-ep]").click();
    document.querySelector("#heir").click();
    G.startCareer();
    G.S.tut = 1;
    G.closeSheet();
    G.renderMain();
    return { heir: !!G.S.heir, last: G.S.last, parentRetired: G.loadSlot(1).S.retired };
  });
  assert(await week(p), "oğul haftası");
  assert(r.heir && r.last === "Kariyer" && r.parentRetired, JSON.stringify(r));
  noErr(p);
  await p.ctx.close();
});
persona("U22", "Hızlı kariyer oyuncusu: 7 maçlık sezonun sonuna ulaşır", async () => {
  const p = await open(browser);
  await career(p, { mode: "hizli" });
  const n = await p.evaluate(() => window.Game.S.sched.length);
  let s0 = 1;
  for (let i = 0; i < 12; i++) {
    await week(p);
    if ((await p.evaluate(() => window.Game.S.season)) > s0) break;
  }
  const s1 = await p.evaluate(() => window.Game.S.season);
  assert(n === 7 && s1 === 2, `maç ${n}, sezon ${s1}`);
  noErr(p);
  await p.ctx.close();
});
persona("U23", "Efsane modu oyuncusu: zor mod, miras dökümünde mod bonusu", async () => {
  const p = await open(browser);
  await career(p, { mode: "efsane" });
  await week(p);
  const r = await p.evaluate(() => {
    const G = window.Game;
    G.S.career.pts = 2000;
    return G.legacyBreakdown().parts.some(x => /Efsane/.test(x[0]));
  });
  assert(r, "bonus yok");
  noErr(p);
  await p.ctx.close();
});
persona("U24", "Oyun testi katılımcısı: izin verir, oynar, geri bildirim yazar, raporu indirir", async () => {
  const p = await open(browser, { ctx: { acceptDownloads: true } });
  await career(p);
  await p.evaluate(() => window.Game.setConsent(true));
  await week(p);
  await p.evaluate(() => window.Game.feedbackSheet("test"));
  const ta = await p.$("#ovl textarea");
  if (ta) await ta.fill("Harika oyun 🏀 <script>x</script>");
  const send = await p.$("#ovl .btn.pri");
  if (send) await send.click();
  const dl = p.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await p.evaluate(() => window.Game.sendReport());
  const d = await dl;
  let valid = false;
  if (d) {
    const f = await d.path();
    valid = !!JSON.parse(fs.readFileSync(f, "utf8")).events;
  }
  assert(valid, "rapor indirilemedi ya da geçersiz");
  noErr(p);
  await p.ctx.close();
});
persona("U25", "Eski cihaz: 4 kat yavaş işlemci, düşük grafik, 320 px", async () => {
  const p = await open(browser, { ctx: { viewport: { width: 320, height: 568 } } });
  const cdp = await p.ctx.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.evaluate(() => {
    window.Game.SETTINGS.lowfx = true;
    window.Game.applyLowFx();
  });
  await career(p);
  const t0 = Date.now();
  assert(await week(p), "hafta");
  const ms = Date.now() - t0;
  const r = await p.evaluate(() => {
    const a = performance.now();
    window.Game.renderMain();
    return performance.now() - a;
  });
  noErr(p);
  await p.ctx.close();
  return `hafta ${ms} ms, ana ekran çizimi ${r.toFixed(1)} ms (4x yavaşlatma)`;
});

(async () => {
  browser = await chromium.launch();
  const { server, base } = await serveDist();
  BASE = base;
  const results = [];
  for (const x of P.filter(q => !process.env.ONLY || q.id === process.env.ONLY)) {
    if (FILTER && !FILTER.test(x.id)) continue;
    const t0 = Date.now();
    let status = "geçti",
      detail = "";
    try {
      const r = await Promise.race([
        x.fn(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("zaman aşımı (250 sn)")), 250000))
      ]);
      if (r) detail = String(r);
    } catch (e) {
      status = "kaldı";
      detail = e.message.split("\n")[0].slice(0, 300);
    }
    results.push({ id: x.id, name: x.name, status, detail, ms: Date.now() - t0 });
    console.log(`${status === "geçti" ? "✓" : "✗"} ${x.id} ${x.name}${detail ? " — " + detail : ""}`);
  }
  await browser.close();
  server.close();
  fs.mkdirSync(path.join(ROOT, "reports", "data"), { recursive: true });
  const sum = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  fs.writeFileSync(
    path.join(ROOT, "reports", "data", "persona-results.json"),
    JSON.stringify({ date: new Date().toISOString(), summary: sum, results }, null, 1)
  );
  console.log(`\n${results.length} persona: ${JSON.stringify(sum)}`);
  process.exit(results.some(r => r.status === "kaldı") ? 1 : 0);
})();
