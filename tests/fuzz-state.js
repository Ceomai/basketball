// Durum sağlamlık testi: node tests/fuzz-state.js [durum sayısı] [başlangıç tohumu]
// Her durumda gerçek akışla bir kariyer kurulur (gerekirse acceptOffer ile başka lige/ülkeye geçilir), sonra uç değerler
// verilir: sıfır/eksi/çok büyük para, 15-42 yaş, sınır dışı enerji/moral/ilişki, sakatlık, bütün eşyalar, playoff,
// emeklilik, kulüp payı, maddeler, bozuk görev verisi… Ardından:
//   - ana ekrandaki her öğeye ve açılan paneldeki her sekmeye/öğeye birer kez dokunulur (2 seviye keşif)
//   - hızlı hafta + otomatik maç, sezon sonu, teklifler, emeklilik ekranı, ayarlar, kılavuz, görevler açılır
//   - ayrıca bozuk ve eski kayıtlar yüklenir
// Yakalananlar: sayfa hataları ve ekranda undefined / NaN / ham anahtar / doldurulmamış yer tutucu.
const { chromium } = require("playwright");
const path = require("path");
const N = +process.argv[2] || 40,
  SEED0 = +(process.argv[3] || 1),
  PAGES = +process.env.PAGES || 4;
const URL = "file://" + path.resolve(__dirname, "..", "dist-single", "index.html");
const BAD_TEXT = [
  [/\bundefined\b/, "undefined"],
  [/\bNaN\b/, "NaN"],
  [/\bInfinity\b/, "Infinity"],
  [/\[object Object\]/, "[object Object]"],
  [
    /\b(?:ads|arcade|casino|core|data|engine|events|extras|games|legacy|match|missions|moments|coach|places|save|shops|story|systems|telemetry|native|notify|cloud|quick|main|slots|settings|btn|test)\.\d+\b/,
    "ham anahtar"
  ],
  [/\{[a-z]\w*\}/, "doldurulmamış yer tutucu"]
];

async function one(b, idx) {
  const seed = SEED0 + idx,
    lang = idx % 4 === 3 ? "en" : "tr";
  const ctx = await b.newContext({ viewport: { width: idx % 2 ? 390 : 844, height: idx % 2 ? 844 : 390 } });
  const p = await ctx.newPage();
  const issues = [];
  const add = (kind, msg, where) => {
    const k = kind + msg.slice(0, 90);
    if (!issues.some(i => i.k === k)) issues.push({ k, kind, msg: msg.slice(0, 400), where: (where || "").slice(0, 160) });
  };
  p.on("pageerror", e =>
    add(
      "hata",
      e.message +
        " @ " +
        String(e.stack || "")
          .split("\n")
          .slice(1, 4)
          .join(" | "),
      p.__where
    )
  );
  p.on("dialog", d => d.dismiss().catch(() => {}));
  await p.addInitScript(
    ([s, lang]) => {
      let x = s;
      Math.random = () => {
        x |= 0;
        x = (x + 0x6d2b79f5) | 0;
        let t = Math.imul(x ^ (x >>> 15), 1 | x);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      try {
        if (!sessionStorage.getItem("fz")) {
          sessionStorage.setItem("fz", "1");
          localStorage.clear();
          localStorage.setItem("pota-lang", lang);
          localStorage.setItem(
            "pota-ads",
            JSON.stringify({ consent: true, day: "", today: 0, games: 0, lastInter: Date.now(), lastInterGame: 0, stats: {} })
          );
        }
      } catch (e) {}
      window.open = () => null;
    },
    [seed * 104729, lang]
  );
  await p.goto(URL);
  await p.waitForTimeout(400);
  // metin denetimi + panelleri temizleme yardımcıları sayfada
  const check = async where => {
    p.__where = where;
    const txt = await p
      .evaluate(
        () => (document.querySelector("#app").innerText || "") + "\n" + ((document.querySelector("#ovl") || {}).innerText || "")
      )
      .catch(() => "");
    for (const [re, name] of BAD_TEXT) {
      const m = re.exec(txt);
      if (m) add("metin", `${name}: "${txt.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, " ")}"`, where);
    }
  };
  const step = async (where, fn, arg) => {
    p.__where = where;
    await p
      .evaluate(() => {
        const G = window.Game;
        if (G && !G.S && G.loadSlot(1) && G.loadSlot(1).S) {
          G.setS(G.loadSlot(1).S);
          G.migrate();
        }
      })
      .catch(() => {});
    try {
      await p.evaluate(fn, arg);
    } catch (e) {
      if (!/Execution context was destroyed|Target closed/.test(e.message)) add("hata", e.message.split("\n")[0], where);
      await p.waitForTimeout(300);
    }
    await p.waitForTimeout(60);
    await check(where);
  };
  // 1) durum kur
  await step(
    "kurulum",
    s => {
      const G = window.Game;
      let x = s;
      const R = () => (x = (x * 16807) % 2147483647) / 2147483647;
      const pick = a => a[Math.floor(R() * a.length)];
      G.F.first = pick(["Ali", "Zeynep", "Çağrı", "Ömer", "İlkay"]);
      G.F.last = pick(["Yılmaz", "Öztürk", "Şahin", "Ğ'li", "O'Neal"]);
      G.F.pos = pick(["PG", "SG", "SF", "PF", "C"]);
      G.F.slot = 1;
      G.startCareer();
      G.closeSheet();
      const S = G.S;
      const stage = pick(["lise", "lise", "t3", "t2", "t1", "euro", "nba"]);
      if (stage !== "lise") {
        const cc = stage === "nba" ? "US" : pick(["TR", "ES", "IT", "FR", "DE", "GR", "RS", "LT"]);
        const t = pick(G.leaguePool(stage, cc));
        S.age = 18 + Math.floor(R() * 4);
        G.acceptOffer({
          team: t,
          stage,
          role: pick(["star", "rot", "bench"]),
          wage: Math.round(10 + R() * 4000),
          years: 2,
          clauses: R() < 0.5 ? { release: true, perf: true } : {}
        });
        G.closeSheet();
      }
      const M = (k, f) => R() < 0.45 && f();
      M("yaş", () => (S.age = 15 + Math.floor(R() * 28)));
      M("para", () => (S.money = pick([0, -500, 3, 1e9, 123456.789])));
      M("enerji", () => (S.energy = pick([0, -20, 150, 49])));
      M("moral", () => (S.moral = pick([0, -10, 120])));
      M("ilişki", () => Object.keys(S.rel).forEach(k => (S.rel[k] = pick([-50, 0, 100, 250]))));
      M("nitelik", () => Object.keys(S.st).forEach(k => (S.st[k] = pick([1, 99, 140]))));
      M("sakatlık", () => (S.injury = { n: "Ayak bileği", w: pick([1, 3, 12]) }));
      M("eşyalar", () => G.SHOP.forEach(it => (S.items[it.id] = 1)));
      M("ev", () => (S.housing = pick(["oda", "yurt", "daire", "lux", "villa", "malikane"])));
      M("hafta", () => (S.week = 1 + Math.floor(R() * Math.max(1, (S.sched || []).length))));
      M("fiş", () => (S.chips = pick([0, 5, 1e7])));
      M("takipçi", () => (S.followers = pick([0, 1e9])));
      M("partner", () => (S.partner = "Deniz"));
      M("miras", () => (S.legacy = { found: { saha: 1 }, club: pick([0, 50, 60, 100]) }));
      M("program", () => (S.program = pick(["sut", "toparlanma", "yok-boyle-bir-program"])));
      M(
        "görev",
        () =>
          (S.missions = pick([
            null,
            {},
            { day: "2020-01-01", daily: [], weekly: [] },
            { day: "x", daily: [{ id: "silinmis", p: 3, done: true }], weekly: null }
          ]))
      );
      M("madde", () => (S.clauses = pick([null, {}, { perf: true }])));
      M("sonuçlar", () => (S.results = []));
      M("emekli", () => ((S.retired = true), (S.epilogue = pick([null, "koc", "tv", "baskan", "bilinmeyen"]))));
      M("çalışma", () => ((S.studying = false), (S.graduated = true)));
      G.save();
      return true;
    },
    seed
  );
  // 2) keşif: ana ekran öğeleri ve panel içleri
  const explore = async (depth, label) => {
    const n = await p
      .evaluate(() => {
        const layer =
          document.querySelector("#ovl") && document.querySelector("#ovl").innerHTML.trim()
            ? document.querySelector("#ovl")
            : document.querySelector("#app");
        return [...layer.querySelectorAll("button, .choice, [data-loc], .tabs button")].filter(
          e => !e.disabled && e.getBoundingClientRect().width > 2
        ).length;
      })
      .catch(() => 0);
    for (let i = 0; i < Math.min(n, 40); i++) {
      const what = await p
        .evaluate(i => {
          const layer =
            document.querySelector("#ovl") && document.querySelector("#ovl").innerHTML.trim()
              ? document.querySelector("#ovl")
              : document.querySelector("#app");
          const els = [...layer.querySelectorAll("button, .choice, [data-loc], .tabs button")].filter(
            e => !e.disabled && e.getBoundingClientRect().width > 2
          );
          const e = els[i];
          if (!e) return null;
          // ilerleten / çıkan düğmeleri keşifte atla (onlar ayrıca test ediliyor)
          if (
            /^(gostad|quickw|nw|ret|y1|impb|impf|pst|lang-|shx)$/.test(e.id) ||
            e.dataset.del ||
            e.dataset.lang ||
            e.dataset.new ||
            e.dataset.go
          )
            return "atla";
          const name =
            (e.id ? "#" + e.id : "") +
            (Object.keys(e.dataset)[0] ? "[" + Object.keys(e.dataset)[0] + "=" + Object.values(e.dataset)[0] + "]" : "") +
            " " +
            (e.innerText || "").slice(0, 18).replace(/\s+/g, " ");
          e.click();
          return name;
        }, i)
        .catch(() => null);
      if (!what || what === "atla") continue;
      await p.waitForTimeout(80);
      // açılan mini oyun / reklam varsa kapatmayı bekleme: ekranı sıfırla
      await check(`${label} > ${what}`);
      if (depth > 1) await explore(depth - 1, `${label} > ${what}`);
      await p
        .evaluate(() => {
          document.querySelectorAll("#adov,#acov,.tour").forEach(e => e.remove());
          const G = window.Game;
          if (!G.S) {
            // keşif kariyerden çıktıysa (kayıt ekranı) yuvayı yeniden aç
            const r = G.loadSlot(1);
            if (r && r.S) {
              G.setS(r.S);
              G.migrate();
            }
          }
          if (G.S) {
            G.closeSheet();
            G.S.retired ? G.retireScreen() : G.renderMain();
          }
        })
        .catch(() => {});
      await p.waitForTimeout(40);
    }
  };
  await step("ana ekran", () => {
    const G = window.Game;
    G.S.retired ? G.retireScreen() : G.renderMain();
  });
  await explore(2, "ana");
  // 3) akışlar
  for (const loc of ["ev", "stad", "okul", "medya", "aile", "kafe", "eglence", "avm", "market", "sans"]) {
    await step(
      "mekan " + loc,
      l => {
        window.Game.closeSheet();
        window.Game.openLoc(l);
      },
      loc
    );
    await explore(1, "mekan " + loc);
  }
  await step("ayarlar", () => window.Game.settingsSheet());
  await step("kılavuz", () => window.Game.guideSheet());
  await step("görevler", () => window.Game.missionsSheet());
  await step(
    "kadro",
    () => window.Game.systemHTML && document.querySelector("#app").insertAdjacentHTML("beforeend", window.Game.systemHTML())
  );
  await step("hızlı hafta", () => {
    const G = window.Game;
    G.closeSheet();
    if (!G.S.retired) G.quickWeek();
  });
  await step("otomatik maç", () => {
    const b = document.querySelector("#qw-sim");
    if (b) b.click();
  });
  // maç bitene kadar bekle (motor maç alanı varken sürer)
  for (let w = 0; w < 60 && (await p.$("#mview").catch(() => null)); w++) await p.waitForTimeout(250);
  await step("sezon sonu", () => {
    const G = window.Game;
    G.closeSheet();
    if (!G.S.retired) G.seasonEnd(true, Math.random() < 0.5, true);
  });
  await p.waitForTimeout(300);
  await explore(1, "sezon sonu");
  await step("emeklilik", () => {
    window.Game.closeSheet();
    window.Game.retireScreen();
  });
  await explore(1, "emeklilik");
  // 4) bozuk ve eski kayıtlar
  await step("bozuk kayıtlar", () => {
    const G = window.Game;
    const good = JSON.parse(localStorage.getItem("pota-slot-1") || "null");
    localStorage.setItem("pota-slot-2", "{bozuk json");
    localStorage.setItem("pota-slot-3", JSON.stringify({ v: 1, S: { first: "Eski" } }));
    if (good) {
      const old = JSON.parse(JSON.stringify(good));
      old.v = 3;
      delete old.S.legacy;
      delete old.S.missions;
      delete old.S.clauses;
      delete old.S.program;
      delete old.S.arcs;
      localStorage.setItem("pota-slot-4", JSON.stringify(old));
      const weird = JSON.parse(JSON.stringify(good));
      weird.S.hist = null;
      weird.S.tx = null;
      weird.S.news = null;
      localStorage.setItem("pota-slot-5", JSON.stringify(weird));
    }
    G.closeSheet();
    G.renderSlots();
  });
  for (const i of [1, 2, 3, 4, 5])
    await step(
      "yuva " + i,
      i => {
        const b = document.querySelector(`[data-go="${i}"]`);
        if (b) b.click();
        const G = window.Game;
        if (G.S && !G.S.retired) {
          G.renderMain();
          G.openLoc("ev");
          G.closeSheet();
        }
        G.renderSlots();
      },
      i
    );
  await ctx.close();
  return { seed, lang, issues };
}

(async () => {
  const b = await chromium.launch();
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: PAGES }, async () => {
      while (next < N) {
        const i = next++;
        const r = await one(b, i);
        results.push(r);
        process.stdout.write(r.issues.length ? "✗" : ".");
      }
    })
  );
  await b.close();
  const uniq = {};
  for (const r of results)
    for (const i of r.issues) {
      const k = `${i.kind}: ${i.msg.slice(0, 160)}`;
      (uniq[k] = uniq[k] || { seeds: [], where: i.where }).seeds.push(r.seed);
    }
  console.log(`\n${results.length} durum test edildi.`);
  for (const [k, v] of Object.entries(uniq))
    console.log(`- ${k}\n    yer: ${v.where}  (tohum: ${[...new Set(v.seeds)].slice(0, 6).join(", ")})`);
  if (Object.keys(uniq).length) process.exit(1);
  console.log("Durum sağlamlık testi geçti.");
})();
