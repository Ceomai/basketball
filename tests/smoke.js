// Duman testi: node tests/smoke.js
// Oyunu gerçek tarayıcıda açar, ana akışların hepsini kısaca dolaşır ve sayfa hatası olursa başarısız olur.
const { chromium } = require("playwright");
const path = require("path");
// Derlenmiş tek dosyalık oyun (npm run build). Oyunun dışa aktarımlarına sayfada window.Game üzerinden erişilir.
const URL = "file://" + path.resolve(__dirname, "..", "dist", "index.html");
const fails = [];
const check = (ok, msg) => {
  if (!ok) fails.push(msg);
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message + " @ " + (e.stack || "").split("\n")[1]));
  await p.addInitScript(() => {
    window.__TEST = { noEvents: true, noSummer: true };
  });
  await p.goto(URL);
  await p.waitForTimeout(600);

  // 1) kayıt ekranı ve yeni kariyer (isim listeden seçilerek)
  check((await p.$$eval("[data-new],[data-go]", x => x.length)) === 5, "kayıt ekranında 5 yuva var");
  await p.tap('[data-new="1"]');
  await p.tap("#npick");
  await p.tap('[data-nf="Ali"]');
  await p.tap('[data-nl="Kaya"]');
  await p.tap("#nok2");
  check((await p.$eval("#fn", e => e.value)) === "Ali", "isim klavyesiz seçilebiliyor");
  await p.tap("#go");
  await p.waitForTimeout(300);
  await p.tap("#chok");
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    Game.S.tut = 1;
    Game.closeSheet();
    Game.renderMain();
  });
  check(await p.evaluate(() => Game.S.sched.length === 14 && !!Game.S.rival), "sezon 14 maç ve rakip oyuncu oluştu");
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "320 px ekranda yatay taşma yok");

  // 2) bütün mekanlar ve sekmeler
  const tabs = await p.evaluate(async () => {
    let n = 0;
    Game.S.age = 19;
    Game.S.money = 1e6;
    for (const l of ["ev", "stad", "okul", "medya", "aile", "kafe", "eglence", "avm", "market", "sans"]) {
      Game.openLoc(l);
      const bs = [...document.querySelectorAll("#ovl .tabs button")];
      for (let i = 0; i < bs.length; i++) {
        document.querySelectorAll("#ovl .tabs button")[i].click();
        n++;
      }
      Game.closeSheet();
    }
    Game.S.age = 16;
    return n;
  });
  check(tabs >= 15, `mekan sekmeleri açıldı (${tabs})`);

  // 3) haftayı hızlı geç + otomatik maç
  await p.tap("#quickw");
  await p.waitForTimeout(200);
  check(!!(await p.$("#qw-sim")), "hafta özeti açıldı");
  await p.tap("#qw-sim");
  await p.waitForSelector("#nx", { timeout: 20000 });
  await p.tap("#nx");
  await p.waitForTimeout(300);
  for (const s of ["[data-press]", "#pok"]) {
    const el = await p.$(s);
    if (el) {
      await el.tap();
      await p.waitForTimeout(150);
    }
  }
  check(await p.evaluate(() => Game.S.week === 2 && Game.S.ss.g === 1), "otomatik maç oynandı ve hafta ilerledi");

  // 4) basın toplantısı, rol değerlendirmesi ve hikâye zinciri
  const story = await p.evaluate(async () => {
    const out = {};
    Game.setM({
      opp: Game.teamByKey(Game.S.sched[0].opp),
      rating: 8.6,
      pts: 24,
      ast: 3,
      reb: 5,
      blk: 0,
      stl: 1,
      us: 80,
      them: 70
    });
    let done = false;
    Game.pressConference(true, () => {
      done = true;
    });
    document.querySelector('[data-press="bold"]').click();
    document.querySelector("#pok").click();
    out.press = done && Game.S.press && Game.S.press.tone === "bold";
    Game.S.stage = "t2";
    Game.S.role = "bench";
    Game.S.week = 5;
    Game.S.phase = "regular";
    Game.S.rel.koc = 90;
    Game.S.results = [8, 8.2, 7.9, 8.4].map(r => ({ rating: r, win: true }));
    for (const k in Game.S.st) Game.S.st[k] = 60;
    out.role = Game.roleReview() && Game.S.role === "rot";
    Game.closeSheet();
    Game.S.arcQ.push("comeback");
    out.arc = Game.storyTick() && !!document.querySelector("[data-arc]");
    document.querySelector("[data-arc]").click();
    document.querySelector("#aok").click();
    out.arcFx = Game.S.buffs.injWk > 0;
    return out;
  });
  check(story.press, "basın toplantısı çalışıyor ve sözler hatırlanıyor");
  check(story.role, "koç güveniyle rol yükseldi");
  check(story.arc && story.arcFx, "hikâye zinciri açıldı ve etkisi uygulandı");

  // 5) sezon sonu, teklifler ve pazarlık
  await p.evaluate(() => {
    Game.closeSheet();
    Game.S.stage = "uni";
    Game.S.team = Game.makeTeam("myuni", "İstanbul", 0);
    Game.S.teams[Game.S.team.key] = Game.S.team;
    Game.newSeasonLeague();
    Game.S.results = [{ rating: 7.4, win: true }];
    Game.S.ss = { g: 10, min: 280, pts: 160, ast: 30, reb: 40, blk: 5, stl: 8, rs: 72, dnp: 0 };
    Game.seasonEnd(true, true, true);
  });
  await p.waitForTimeout(400);
  check((await p.$$eval("[data-o]", x => x.length)) >= 2, "sezon sonu teklifleri geldi");
  check(
    await p.evaluate(() => /Rakibin/.test(document.querySelector("#ovl").textContent)),
    "sezon sonunda rakip kıyas kartı var"
  );
  await (await p.$$("[data-o]"))[0].tap();
  await p.waitForTimeout(200);
  const ok = await p.$("#ng-ok");
  if (ok) await ok.tap();
  await p.waitForTimeout(300);
  const ch = await p.$("#chok");
  if (ch) await ch.tap();
  check(await p.evaluate(() => Game.S.season === 2 && Game.S.week === 1), "yeni sezona geçildi");

  // 6) kayıt: yedekten açılma, kod ve IndexedDB kopyası
  const sv = await p.evaluate(async () => {
    Game.save();
    const slot = Game.S.saveSlot,
      k = `pota-slot-${slot}`;
    Game.save();
    localStorage.setItem(k, "{bozuk");
    const r1 = Game.loadSlot(slot);
    const code = Game.encodeSave(Game.S),
      dec = Game.decodeSave(code);
    localStorage.removeItem(k);
    localStorage.removeItem(k + "-bak");
    await new Promise(r => setTimeout(r, 300));
    const n = await Game.storageRestore();
    const r2 = Game.loadSlot(slot);
    return { backup: r1 && r1.from === "backup", code: !!dec && dec.first === Game.S.first, idb: n >= 1 && !!(r2 && r2.S) };
  });
  check(sv.backup, "bozuk kayıt yedekten açılıyor");
  check(sv.code, "kayıt kodu dışa/içe aktarılıyor");
  check(sv.idb, "silinen kayıt IndexedDB kopyasından geri geliyor");
  const mig = await p.evaluate(() => {
    const old = JSON.parse(JSON.stringify(Game.S));
    old.wage = 300;
    delete old.wk14;
    delete old.schema;
    localStorage.setItem("pota-slot-5", JSON.stringify({ v: 4, ts: Date.now(), S: old }));
    const r = Game.loadSlot(5);
    localStorage.removeItem("pota-slot-5");
    return r && r.S.wage === 150 && r.S.schema === Game.SAVE_V;
  });
  check(mig, "eski sürüm kayıt açılırken sürüm geçişleri uygulanıyor");

  // 7) mini oyunlar açılıyor
  const games = await p.evaluate(async () => {
    const list = [
      "mgShoot",
      "mgDribble",
      "mgPass",
      "mgBlock",
      "mgPost",
      "mgRebound",
      "mgGym",
      "mgPhoto",
      "mgRhythm",
      "mgHockey",
      "mgBowling",
      "mgArcade",
      "mgReflex"
    ];
    let n = 0;
    for (const g of list) {
      if (typeof Game[g] !== "function") continue;
      Game.closeSheet();
      Game.app.innerHTML = '<div id="stg"></div>';
      Game[g](document.querySelector("#stg"), { eff: 50, reps: 1, shots: 1, title: g });
      await new Promise(r => setTimeout(r, 120));
      n++;
    }
    return n;
  });
  check(games >= 12, `mini oyunlar açıldı (${games})`);
  await p.evaluate(() => Game.renderSlots());

  // 7b) oyun testi kaydı: onaysız kayıt yok, onayla ekran/maç/mini oyun olayları ve geri bildirim
  const tel = await p.evaluate(async () => {
    const out = {};
    Game.setS(Game.loadSlot(1).S);
    Game.TEL.events = [];
    Game.log("x");
    out.noConsent = Game.TEL.events.length === 0;
    Game.setConsent(true);
    Game.renderMain();
    Game.closeSheet();
    Game.openLoc("stad", "mac");
    Game.setM({
      opp: Game.teamByKey(Game.S.sched[0].opp),
      rating: 7,
      pts: 10,
      ast: 1,
      reb: 2,
      blk: 0,
      stl: 0,
      us: 70,
      them: 60,
      mins: 1200,
      plus: 4
    });
    Game.Bus.emit("match:end", { win: true, rating: 7 });
    Game.Bus.emit("minigame:end", { kind: "shoot", made: 2, shots: 3 });
    Game.feedbackSheet("test");
    document.querySelector('#fb-st [data-s="4"]').click();
    document.querySelector("#fb-tx").value = "güzel";
    document.querySelector("#fb-go").click();
    const r = Game.reportData();
    const kinds = new Set(r.events.map(e => e.e));
    out.events = ["consent", "screen", "match", "minigame", "feedback"].every(k => kinds.has(k));
    out.fb = r.feedback.length === 1 && r.feedback[0].stars === 4;
    out.mg = r.events.find(e => e.e === "minigame").r === 0.67;
    Game.setConsent(false);
    return out;
  });
  check(tel.noConsent, "oyun testi kapalıyken hiçbir şey kaydedilmiyor");
  check(tel.events && tel.fb && tel.mg, "oyun testi açıkken ekran, maç, mini oyun ve geri bildirim kaydediliyor");

  // 7c) miras: vakıf, kulüp payı, Şöhretler Müzesi; yeni hikâye zincirleri
  const lg = await p.evaluate(() => {
    const out = {};
    Game.setS(Game.loadSlot(1).S);
    const S = Game.S;
    S.stage = "t1";
    S.money = 5e6;
    Game.openLoc("ev", "miras");
    out.tab = !!document.querySelector("[data-fd]");
    const before = Game.legacyScore();
    document.querySelector('[data-fd="saha"]').click();
    document.querySelector("#lg-share").click();
    out.legacy = Game.legacyScore() > before && S.legacy.found.saha && S.legacy.club === 10;
    out.hof = /Şöhretler|Kulüp|Saygın/.test(Game.hofCard());
    Game.closeSheet();
    // geç açılan çiçek: zincirin ikinci adımı sezon sonu teklifi üretir
    S.stage = "t3";
    S.age = 24;
    S.week = 6;
    S.phase = "regular";
    S.results = [7, 7, 7, 7].map(r => ({ rating: r, win: true }));
    S.arcs = {};
    const step = Game.ARCS.bloomer;
    S.arcs.bloomer = { season: S.season, step: 1, next: 0, choice: "yes" };
    step.steps[1](S.arcs.bloomer);
    Game.closeSheet();
    S.season++;
    const offers = Game.storyOffers([{ team: S.team, stage: "t3", stay: true, wage: 10 }]);
    out.bloomer = offers.some(o => o.stage === "t2");
    return out;
  });
  check(lg.tab && lg.legacy && lg.hof, "miras sekmesi, vakıf, kulüp payı ve Şöhretler Müzesi çalışıyor");
  check(lg.bloomer, "geç açılan çiçek zinciri sezon sonu teklifi üretiyor");

  // 8) veri tabanlı olaylar ve dil seçimi
  const ev = await p.evaluate(() => {
    const out = {};
    Game.setS(Game.loadSlot(1).S);
    const pool = Game.eventPool();
    out.pool = pool.length;
    out.ran = pool.every(e => typeof e.choices[0].do() === "string" && !/\{\w+\}/.test(e.text));
    Game.setLang("en");
    out.en = Game.eventPool().length > 0 && Game.eventPool().every(e => !/[ğışçöü]/i.test(e.title));
    Game.renderSlots();
    out.ui = document.querySelector("#app").textContent.includes("Career slots");
    Game.setLang("tr");
    Game.renderSlots();
    return out;
  });
  check(ev.pool >= 10 && ev.ran, `veri tabanlı olaylar çalışıyor (${ev.pool} olay)`);
  check(ev.en && ev.ui, "İngilizce dil seçeneği arayüzü ve olayları çeviriyor");

  check(errs.length === 0, "sayfa hatası yok" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
  await b.close();
  if (fails.length) {
    console.error(`\n${fails.length} kontrol başarısız.`);
    process.exit(1);
  }
  console.log("\nDuman testi geçti.");
})();
