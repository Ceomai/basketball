// Duman testi: node tests/smoke.js
// Oyunu gerçek tarayıcıda açar, ana akışların hepsini kısaca dolaşır ve sayfa hatası olursa başarısız olur.
const { chromium } = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); console.log(`${ok ? "✓" : "✗"} ${msg}`); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", e => errs.push(e.message + " @ " + (e.stack || "").split("\n")[1]));
  await p.goto(URL); await p.waitForTimeout(600);

  // 1) kayıt ekranı ve yeni kariyer (isim listeden seçilerek)
  check(await p.$$eval("[data-new],[data-go]", x => x.length) === 5, "kayıt ekranında 5 yuva var");
  await p.tap('[data-new="1"]'); await p.tap("#npick"); await p.tap('[data-nf="Ali"]'); await p.tap('[data-nl="Kaya"]'); await p.tap("#nok2");
  check(await p.$eval("#fn", e => e.value) === "Ali", "isim klavyesiz seçilebiliyor");
  await p.tap("#go"); await p.waitForTimeout(300); await p.tap("#chok"); await p.waitForTimeout(300);
  await p.evaluate(() => { S.tut = 1; closeSheet(); renderMain(); });
  check(await p.evaluate(() => S.sched.length === 14 && !!S.rival), "sezon 14 maç ve rakip oyuncu oluştu");
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "320 px ekranda yatay taşma yok");

  // 2) bütün mekanlar ve sekmeler
  const tabs = await p.evaluate(async () => {
    let n = 0; S.age = 19; S.money = 1e6;
    for (const l of ["ev", "stad", "okul", "medya", "aile", "kafe", "eglence", "avm", "market", "sans"]) {
      openLoc(l); const bs = [...document.querySelectorAll("#ovl .tabs button")];
      for (let i = 0; i < bs.length; i++) { document.querySelectorAll("#ovl .tabs button")[i].click(); n++; }
      closeSheet();
    }
    S.age = 16; return n;
  });
  check(tabs >= 15, `mekan sekmeleri açıldı (${tabs})`);

  // 3) haftayı hızlı geç + otomatik maç
  await p.tap("#quickw"); await p.waitForTimeout(200);
  check(!!(await p.$("#qw-sim")), "hafta özeti açıldı");
  await p.tap("#qw-sim"); await p.waitForSelector("#nx", { timeout: 20000 });
  await p.evaluate(() => { maybeEvent = n => n(); }); await p.tap("#nx"); await p.waitForTimeout(300);
  for (const s of ["[data-press]", "#pok"]) { const el = await p.$(s); if (el) { await el.tap(); await p.waitForTimeout(150); } }
  check(await p.evaluate(() => S.week === 2 && S.ss.g === 1), "otomatik maç oynandı ve hafta ilerledi");

  // 4) basın toplantısı, rol değerlendirmesi ve hikâye zinciri
  const story = await p.evaluate(async () => {
    const out = {};
    M = { opp: teamByKey(S.sched[0].opp), rating: 8.6, pts: 24, ast: 3, reb: 5, blk: 0, stl: 1, us: 80, them: 70 };
    let done = false; pressConference(true, () => { done = true; });
    document.querySelector('[data-press="bold"]').click(); document.querySelector("#pok").click();
    out.press = done && S.press && S.press.tone === "bold";
    S.stage = "t2"; S.role = "bench"; S.week = 5; S.phase = "regular"; S.rel.koc = 90; S.results = [8, 8.2, 7.9, 8.4].map(r => ({ rating: r, win: true }));
    for (const k in S.st) S.st[k] = 60;
    out.role = roleReview() && S.role === "rot"; closeSheet();
    S.arcQ.push("comeback"); out.arc = storyTick() && !!document.querySelector("[data-arc]");
    document.querySelector("[data-arc]").click(); document.querySelector("#aok").click();
    out.arcFx = S.buffs.injWk > 0;
    return out;
  });
  check(story.press, "basın toplantısı çalışıyor ve sözler hatırlanıyor");
  check(story.role, "koç güveniyle rol yükseldi");
  check(story.arc && story.arcFx, "hikâye zinciri açıldı ve etkisi uygulandı");

  // 5) sezon sonu, teklifler ve pazarlık
  await p.evaluate(() => { closeSheet(); S.stage = "uni"; S.team = makeTeam("myuni", "İstanbul", 0); S.teams[S.team.key] = S.team; newSeasonLeague(); S.results = [{ rating: 7.4, win: true }]; S.ss = { g: 10, min: 280, pts: 160, ast: 30, reb: 40, blk: 5, stl: 8, rs: 72, dnp: 0 }; summerTournament = (a, f) => f(); seasonEnd(true, true, true); });
  await p.waitForTimeout(400);
  check(await p.$$eval("[data-o]", x => x.length) >= 2, "sezon sonu teklifleri geldi");
  check(await p.evaluate(() => /Rakibin/.test(document.querySelector("#ovl").textContent)), "sezon sonunda rakip kıyas kartı var");
  await (await p.$$("[data-o]"))[0].tap(); await p.waitForTimeout(200);
  const ok = await p.$("#ng-ok"); if (ok) await ok.tap(); await p.waitForTimeout(300);
  const ch = await p.$("#chok"); if (ch) await ch.tap();
  check(await p.evaluate(() => S.season === 2 && S.week === 1), "yeni sezona geçildi");

  // 6) kayıt: yedekten açılma, kod ve IndexedDB kopyası
  const sv = await p.evaluate(async () => {
    save(); const slot = S.saveSlot, k = `pota-slot-${slot}`; save();
    localStorage.setItem(k, "{bozuk"); const r1 = loadSlot(slot);
    const code = encodeSave(S), dec = decodeSave(code);
    localStorage.removeItem(k); localStorage.removeItem(k + "-bak");
    await new Promise(r => setTimeout(r, 300)); const n = await storageRestore(); const r2 = loadSlot(slot);
    return { backup: r1 && r1.from === "backup", code: !!dec && dec.first === S.first, idb: n >= 1 && !!(r2 && r2.S) };
  });
  check(sv.backup, "bozuk kayıt yedekten açılıyor");
  check(sv.code, "kayıt kodu dışa/içe aktarılıyor");
  check(sv.idb, "silinen kayıt IndexedDB kopyasından geri geliyor");

  // 7) mini oyunlar açılıyor
  const games = await p.evaluate(async () => {
    const list = ["mgShoot", "mgDribble", "mgPass", "mgBlock", "mgPost", "mgRebound", "mgGym", "mgPhoto", "mgRhythm", "mgHockey", "mgBowling", "mgArcade", "mgReflex"];
    let n = 0; for (const g of list) { if (typeof window[g] !== "function") continue; closeSheet(); app.innerHTML = '<div id="stg"></div>'; window[g](document.querySelector("#stg"), { eff: 50, reps: 1, shots: 1, title: g }); await new Promise(r => setTimeout(r, 120)); n++; }
    return n;
  });
  check(games >= 12, `mini oyunlar açıldı (${games})`);
  await p.evaluate(() => renderSlots());

  check(errs.length === 0, "sayfa hatası yok" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
  await b.close();
  if (fails.length) { console.error(`\n${fails.length} kontrol başarısız.`); process.exit(1); }
  console.log("\nDuman testi geçti.");
})();
