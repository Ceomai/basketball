// Oyuncuyu tutma özellikleri: Efsaneler koleksiyonu ve başlangıç hikâyeleri, Günün Maçı, ertesi güne kalan
// hikâye anları, Yıldızlar Hafta Sonu ve ara transfer. Önce: npm run build:single. Çalıştır: node tests/retention.js
const { chromium } = require("playwright");
const lib = require("./lib.js");
const { assert, toMain } = lib;
const path = require("path");
const ROOT = path.resolve(__dirname, ".."),
  SINGLE = "file://" + path.join(ROOT, "dist-single", "index.html");
const T = [];
const test = (name, fn) => T.push({ name, fn });
let browser, server;
// dist/ sunucusu: tests/lib.js
async function serveDist() {
  ({ server } = await lib.serveDist());
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
    window.__allOpen = true;
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
    G.S.unlocks = { program: 1, sistem: 1, gorev: 1, miras: 1, plan: 1, basarim: 1, tasarim: 1, hikaye: 1, geceligi: 1 }; // kademeli açılış panelleri testleri bölmesin
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
const ymd = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// bir hafta: hızlı hafta + maçı simüle et, araya giren ekranları geç
async function week(p) {
  await p.evaluate(() => {
    const G = window.Game;
    G.closeSheet();
    G.renderMain();
    G.quickWeek();
    const b = document.querySelector("#qw-sim");
    if (b) b.click();
  });
  // araya giren ekranlar: tek tıklayıcı listesi (tests/lib.js toMain)
  return (await toMain(p)) === "main";
}

/* ================= EFSANELER ================= */
test("emeklilik kariyeri koleksiyona ekler, ilk açılış gelir, yuvalar ekranında sayı görünür", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.age = 36;
    G.S.hist.push({ label: "1", team: "X", league: "EuroLeague", w: 10, l: 4, avg: 7, champ: false });
    G.retireScreen();
  });
  const r = await p.evaluate(() => ({
    n: window.Game.LEG.cards.length,
    card: window.Game.LEG.cards[0],
    stored: JSON.parse(localStorage.getItem("pota-legends")).cards.length,
    html: document.body.textContent,
    open: window.Game.originOpen("anadolu"),
    euro: window.Game.originOpen("gurbet"),
    sokak: window.Game.originOpen("sokak")
  }));
  assert(r.n === 1 && r.stored === 1, "kart eklenmedi");
  assert(r.card.peak === 5, "zirve EuroLeague değil: " + r.card.peak);
  assert(r.open && r.euro && !r.sokak, "açılışlar yanlış: " + JSON.stringify(r));
  assert(/Efsaneler koleksiyonuna eklendi/.test(r.html), "emeklilik ekranında koleksiyon kartı yok");
  // ekran yeniden çizilince ikinci kart eklenmez
  await p.evaluate(() => window.Game.retireScreen());
  assert((await p.evaluate(() => window.Game.LEG.cards.length)) === 1, "tekrar eklendi");
  await p.evaluate(() => window.Game.renderSlots());
  assert(/\(1\)/.test(await p.textContent("#legb")), "yuvalar ekranında sayı yok");
  await p.click("#legb");
  assert(await p.isVisible("[data-lp]"), "kart listesi yok");
  await p.click("#shx");
  // ✕ ile kapatınca yuvalar ekranına döner (kariyer yokken ana ekran çizilmez)
  await p.click("#legb");
  await p.click("#shx");
  assert(await p.isVisible("#legb"), "yuvalar ekranına dönmedi");
  return p;
});

test("başlangıç hikâyesi: kilitli olan seçilemez, açılınca etkisi uygulanır; ek görünümler", async () => {
  const p = await page();
  // kilitli: sokak seçilse bile İstanbul
  await p.evaluate(() => {
    const G = window.Game;
    G.F.origin = "sokak";
  });
  await career(p);
  assert((await p.evaluate(() => window.Game.S.origin)) === "istanbul", "kilitli başlangıç uygulandı");
  // 3 kart (biri NBA ve Müze) → hepsi açık
  await p.evaluate(() => {
    const G = window.Game;
    for (let i = 0; i < 3; i++)
      G.LEG.cards.push({
        id: "t" + i,
        n: "A B",
        peak: i ? 6 : 5,
        tier: 1,
        score: 2000,
        seasons: 10,
        games: 100,
        pts: 900,
        trophies: 2,
        look: {}
      });
  });
  const base = await p.evaluate(() => ({ ...window.Game.S.st }));
  const out = {};
  for (const o of ["sokak", "gec", "gurbet", "anadolu"]) {
    out[o] = await p.evaluate(o => {
      const G = window.Game;
      G.F.origin = o;
      G.F.slot = 2;
      G.startCareer();
      G.closeSheet();
      return { st: { ...G.S.st }, origin: G.S.origin, aka: G.S.aka, pot: G.originPotential(), tm: G.originTrainMul() };
    }, o);
  }
  assert(
    out.sokak.origin === "sokak" && out.sokak.st.sut === base.sut + 3 && out.sokak.aka < 55,
    "sokak: " + JSON.stringify(out.sokak)
  );
  assert(out.gec.st.pas === base.pas - 3 && out.gec.tm === 1.2, "geç başlayan: " + JSON.stringify(out.gec));
  assert(out.gurbet.pot === 1, "gurbetçi potansiyeli");
  assert(out.anadolu.st.guc === base.guc + 2, "anadolu");
  await p.evaluate(() => {
    window.Game.F.slot = 3;
    window.Game.renderCreate();
  });
  const ui = await p.evaluate(() => ({
    o: document.querySelectorAll("#origin button:not([disabled])").length,
    n99: !!document.querySelector('#num [data-v="99"]'),
    gold: !!document.querySelector('#hc [data-v="#d4a017"]')
  }));
  assert(ui.o === 5 && ui.n99 && ui.gold, "oluşturma ekranı: " + JSON.stringify(ui));
  return p;
});

test("eski emekli kariyerler yuvalar ekranında bir kez koleksiyona eklenir", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.retired = true;
    delete G.S.cid;
    G.save();
    localStorage.removeItem("pota-legends");
    G.LEG.cards.length = 0;
    G.renderSlots();
    G.renderSlots();
  });
  const n = await p.evaluate(() => window.Game.LEG.cards.length);
  assert(n === 1, "eklenen kart: " + n);
  return p;
});

/* ================= GÜNÜN MAÇI ================= */
test("senaryo tarihe göre aynı, günler farklı", async () => {
  const p = await page();
  const r = await p.evaluate(() => {
    const G = window.Game;
    const a = G.scenario("2026-11-03"),
      b = G.scenario("2026-11-03"),
      c = G.scenario("2026-11-04");
    return {
      same: JSON.stringify(a) === JSON.stringify(b),
      diff: JSON.stringify(a) !== JSON.stringify(c),
      no: a.no,
      gap: a.them - a.us
    };
  });
  assert(r.same && r.diff, "tohum kararsız");
  assert(r.no === 3, "gün numarası: " + r.no);
  assert(r.gap >= 1 && r.gap <= 4, "fark: " + r.gap);
  return p;
});

async function playDailyUI(p) {
  for (const k of ["pass", "safe", "pass"]) {
    await p.waitForSelector(`[data-dk="${k}"]`, { timeout: 4000 });
    await p.click(`[data-dk="${k}"]`);
  }
  await p.waitForSelector("#dl-share", { timeout: 4000 });
}
test("Günün Maçı: Bugün panelinden oynanır, seri ve paylaşım metni, reklamla bir deneme daha", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.DLY.today = null;
    G.DLY.last = "";
    G.DLY.streak = 0;
  });
  await p.click("#today");
  await p.click("#dl-play");
  await playDailyUI(p);
  const r = await p.evaluate(() => ({
    res: window.Game.DLY.today.res,
    streak: window.Game.DLY.streak,
    txt: window.Game.shareText(),
    open: window.Game.dailyOpen()
  }));
  assert(r.res && ["w", "l", "t"].includes(r.res.r) && r.res.grid.length === 3, "sonuç: " + JSON.stringify(r.res));
  assert(r.streak === 1, "seri 1 değil");
  assert(/#\d+/.test(r.txt) && /[🟩🟥]{3}/u.test(r.txt), "paylaşım metni: " + r.txt);
  assert(!r.open, "bugün ikinci kez açık");
  if (r.res.r !== "w") {
    assert(await p.isVisible("#dl-retry"), "kaybedince ikinci deneme teklifi yok");
    await p.click("#dl-retry");
    await watchAd(p);
    await playDailyUI(p);
    const q = await p.evaluate(() => ({
      tries: window.Game.DLY.today.tries,
      again: !!document.querySelector("#dl-retry"),
      streak: window.Game.DLY.streak
    }));
    assert(q.tries === 2 && !q.again && q.streak === 1, "ikinci deneme: " + JSON.stringify(q));
  }
  await p.click("#dl-back");
  assert(await p.isVisible("#gostad"), "ana ekrana dönmedi");
  return p;
});
test("Günün Maçı serisi: dün oynadıysan artar, ara verdiysen 1'den başlar", async () => {
  const p = await page();
  await career(p);
  const run = async (last, streak) => {
    await p.evaluate(
      ([last, streak]) => {
        const G = window.Game;
        G.DLY.today = null;
        G.DLY.last = last;
        G.DLY.streak = streak;
        G.playDaily(() => G.renderMain());
      },
      [last, streak]
    );
    await playDailyUI(p);
    return p.evaluate(() => window.Game.DLY.streak);
  };
  assert((await run(ymd(-1), 4)) === 5, "seri artmadı");
  assert((await run(ymd(-3), 4)) === 1, "seri sıfırlanmadı");
  return p;
});

/* ================= HİKÂYE ANLARI ================= */
test("ertesi güne kalan an: oturumda maçlardan sonra belirir, aynı gün çözülmez, ertesi gün sonucu gelir", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      R = Math.random;
    Math.random = () => 0.1;
    G.Bus.emit("match:end", {});
    G.Bus.emit("match:end", {});
    Math.random = R;
    return { hook: G.S.hook && { ...G.S.hook }, due: G.hookDue(), news: G.S.news[0] && G.S.news[0].t };
  });
  assert(r.hook && r.hook.day, "an oluşmadı");
  assert(!r.due, "aynı gün çözülüyor");
  assert(/yarın/i.test(r.news), "gündemde yok: " + r.news); // metin zaten "Yarın ..." ile başlar
  // saat geri: çözülmez
  await p.evaluate(d => (window.Game.S.hook.day = d), ymd(1));
  assert(!(await p.evaluate(() => window.Game.hookDue())), "gelecek tarihli an çözüldü");
  // ertesi gün: ana ekranda sonuç paneli
  await p.evaluate(d => {
    const G = window.Game;
    G.S.hook = { id: "dinner", day: d };
    G.S.rel.koc = 50;
    G.renderMain();
  }, ymd(-1));
  await p.waitForSelector("#hk-ok", { timeout: 2000 });
  await p.click("#hk-ok");
  const q = await p.evaluate(() => ({ hook: window.Game.S.hook, koc: window.Game.S.rel.koc }));
  assert(q.hook === null && q.koc === 56, "sonuç uygulanmadı: " + JSON.stringify(q));
  // aynı gün ikinci an oluşmaz
  const again = await p.evaluate(() => {
    const G = window.Game,
      R = Math.random;
    Math.random = () => 0.1;
    G.Bus.emit("match:end", {});
    G.Bus.emit("match:end", {});
    Math.random = R;
    return G.S.hook;
  });
  assert(again === null, "aynı gün ikinci an");
  return p;
});
test("sponsor anı seçim ister; bildirim metni anı hatırlatır", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(d => {
    const G = window.Game;
    G.S.hook = { id: "sponsor", day: d };
    G.S.money = 100;
    G.closeSheet();
    G.todaySheet();
  }, ymd(-1));
  await p.click("#hk-go");
  await p.click("#hk-a");
  await p.click("#hk-ok");
  const r = await p.evaluate(() => ({ m: window.Game.S.money, n: window.Game.nextNotification({ hook: "Yarın bir gözlemci" }) }));
  assert(r.m > 100, "sponsor parası yok");
  assert(r.n && r.n.body === "Yarın bir gözlemci", "bildirim: " + JSON.stringify(r.n));
  return p;
});

/* ================= ZİRVELER ================= */
test("sezon ortası haftası: normal 8, hızlı 5; All-Star'a seçilmeyen herkese beceri yarışması", async () => {
  const p = await page();
  await career(p);
  const r = await p.evaluate(() => {
    const G = window.Game,
      n = G.midWeek(),
      s = G.S.sched;
    G.S.sched = s.slice(0, 7);
    const q = G.midWeek();
    G.S.sched = s;
    return [n, q];
  });
  assert(r[0] === 8 && r[1] === 5, "hafta: " + r);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.week = G.midWeek();
    G.S.phase = "regular";
    G.closeSheet();
    // önce gelen başka rastgele paneller tüketilir
    for (let i = 0; i < 6 && !document.querySelector("[data-pk]"); i++) {
      window.Game.closeSheet();
      window.Game.Bus.first("week:sheet");
    }
  });
  await p.waitForSelector("[data-pk]", { timeout: 2000 });
  await p.click("#pk-no");
  const q = await p.evaluate(() => window.Game.S.skillWk === window.Game.S.season);
  assert(q, "bir kez işaretlenmedi");
  return p;
});
test("beceri yarışması oynanır (smaç, dokunmadan kendiliğinden biter), sonuç ve ödül işlenir", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    window.__pk = null;
    G.Bus.on("peak", d => (window.__pk = d));
    window.__done = false;
    G.skillWeekend(() => (window.__done = true));
  });
  await p.click('[data-pk="dunk"]');
  await p.waitForSelector("#bk", { timeout: 60000 });
  const r = await p.evaluate(() => ({ pk: window.__pk, tr: window.Game.S.career.trophies.length }));
  assert(r.pk && r.pk.kind === "skill", "olay yok");
  assert(r.pk.won ? r.tr === 1 : r.tr === 0, "kupa tutarsız: " + JSON.stringify(r));
  await p.click("#bk");
  assert(await p.evaluate(() => window.__done), "devam çağrılmadı");
  return p;
});
test("ara transfer: kulübedeki profesyonele ligden teklif, transfer fikstürü bozmuyor, maçlar oynanıyor", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.stage = "t1";
    G.S.role = "bench";
    G.S.wage = 100;
    G.S.week = G.midWeek() + 1;
    G.S.phase = "regular";
    G.S.skillWk = G.S.season; // beceri yarışması bu sezon yapıldı
    G.closeSheet();
    window.__old = G.S.team.key;
    // önce gelen başka rastgele paneller tüketilir
    for (let i = 0; i < 6 && !document.querySelector("[data-mt]"); i++) {
      window.Game.closeSheet();
      window.Game.Bus.first("week:sheet");
    }
  });
  await p.waitForSelector("[data-mt]", { timeout: 2000 });
  await p.click('[data-mt="0"]');
  const r = await p.evaluate(() => {
    const G = window.Game,
      S = G.S;
    const rest = S.sched.slice(S.week - 1);
    return {
      changed: S.team.key !== window.__old,
      selfGame: rest.some(f => f.opp === S.team.key),
      vsOld: rest.some(f => f.opp === window.__old) || S.sched.slice(0, S.week - 1).some(f => f.opp === S.team.key),
      role: S.role,
      inLeague: S.league.some(x => x.key === S.team.key),
      wage: S.wage
    };
  });
  assert(r.changed && r.inLeague, "takım değişmedi");
  assert(!r.selfGame, "kendi takımıyla maç kaldı");
  assert(r.role !== "bench" && r.wage > 100, "rol/ücret: " + JSON.stringify(r));
  for (let i = 0; i < 3; i++) assert(await week(p), "transfer sonrası hafta takıldı");
  // ikinci kez pencere açılmaz
  const again = await p.evaluate(() => {
    const G = window.Game;
    G.S.week = G.midWeek() + 1;
    G.closeSheet();
    G.Bus.first("week:sheet");
    return !!document.querySelector("[data-mt]");
  });
  assert(!again, "pencere ikinci kez açıldı");
  return p;
});
test("ara transfer: kalırsa koç ve takım ilişkisi artar; iyi durumdaki yıldıza pencere açılmaz", async () => {
  const p = await page();
  await career(p);
  await p.evaluate(() => {
    const G = window.Game;
    G.S.stage = "t1";
    G.S.role = "bench";
    G.S.rel.koc = 50;
    G.S.week = G.midWeek() + 1;
    G.S.skillWk = G.S.season;
    G.closeSheet();
    G.Bus.first("week:sheet");
  });
  await p.click("#mt-stay");
  const r = await p.evaluate(() => {
    const G = window.Game;
    const k = G.S.rel.koc;
    G.S.season++;
    G.S.skillWk = G.S.season;
    G.S.role = "star";
    G.closeSheet();
    G.Bus.first("week:sheet");
    return { k, open: !!document.querySelector("[data-mt]") };
  });
  assert(r.k === 53, "koç ilişkisi: " + r.k);
  assert(!r.open, "yıldıza gereksiz pencere");
  return p;
});

test("uzun oyun: 30 hafta hızlı oynanınca yeni özelliklerden hata yok", async () => {
  const p = await page();
  await career(p);
  for (let i = 0; i < 30; i++) assert(await week(p), "hafta " + i + " takıldı");
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
  console.log(fail ? `${fail} test başarısız` : `Tutma testleri geçti (${T.length}).`);
  process.exit(fail ? 1 : 0);
})();
