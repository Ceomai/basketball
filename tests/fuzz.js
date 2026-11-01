// Sağlamlık testi ("maymun oyuncu"): node tests/fuzz.js [koşu sayısı] [koşu başına saniye] [başlangıç tohumu]
// Gerçek oyunda (simülasyon modu kapalı) ekrandaki rastgele öğelere dokunur; mini oyunlarda rastgele dokunur ve kaydırır.
// Her koşu farklı bir yapılandırma: dil (TR/EN), ekran (dar telefon, telefon, yatay, tablet), düşük grafik, pozisyon.
// Oyunun rastgeleliği tohumlanır: aynı tohum aynı koşuyu üretir (FUZZ_SEED=123 ile tek koşu tekrarlanır).
// Yakalananlar: sayfa hataları, konsol hataları, ekranda ham çeviri anahtarı / undefined / NaN / [object Object],
// 25 saniye boyunca hiçbir şey değişmeyen ekran (takılma). Çıkış kodu: sorun varsa 1.
const { chromium } = require("playwright");
const path = require("path");
const RUNS = +process.argv[2] || 8,
  SECS = +process.argv[3] || 60,
  SEED0 = +(process.env.FUZZ_SEED || process.argv[4] || 1),
  PAGES = +process.env.PAGES || 4;
const URL = "file://" + path.resolve(__dirname, "..", "dist-single", "index.html");
const VIEWS = [
  { w: 320, h: 568 },
  { w: 390, h: 844 },
  { w: 844, h: 390 },
  { w: 820, h: 1180 }
];
const POS = ["PG", "SG", "SF", "PF", "C"];
const rng = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// ekranda görünmemesi gereken metinler
const BAD_TEXT = [
  [/\bundefined\b/, "undefined"],
  [/\bNaN\b/, "NaN"],
  [/\[object Object\]/, "[object Object]"],
  [
    /\b(?:ads|arcade|casino|core|data|engine|events|extras|games|legacy|match|missions|moments|coach|places|save|shops|story|systems|telemetry|native|notify|cloud|quick|main|slots|settings|btn|test|scn)\.\d+\b/,
    "ham anahtar"
  ],
  [/\{[a-z]\w*\}/, "doldurulmamış yer tutucu"]
];

async function run(b, idx) {
  const seed = SEED0 + idx,
    R = rng(seed * 7919),
    view = VIEWS[idx % VIEWS.length],
    lang = idx % 3 === 2 ? "en" : "tr",
    low = idx % 4 === 3,
    pos = POS[idx % 5];
  const ctx = await b.newContext({ viewport: { width: view.w, height: view.h }, hasTouch: true });
  const p = await ctx.newPage();
  const issues = [];
  const hist = [];
  const add = (kind, msg, where) => {
    const k = kind + msg.slice(0, 80);
    if (!issues.some(i => i.k === k))
      issues.push({ k, kind, msg: msg.slice(0, kind === "takılma" ? 3000 : 300), where: (where || "").slice(0, 1500) });
  };
  p.on("pageerror", e =>
    add(
      "hata",
      e.message +
        " @ " +
        String(e.stack || "")
          .split("\n")
          .slice(1, 3)
          .join(" | "),
      `[${hist.length} dokunuş sonra] ` + hist.slice(-14).join(" > ")
    )
  );
  p.on("console", m => {
    if (
      m.type() === "error" &&
      !/favicon|ERR_FILE_NOT_FOUND|net::|Failed to load resource|manifest|serviceWorker/i.test(m.text())
    )
      add("konsol", m.text());
  });
  p.on("dialog", d => d.dismiss().catch(() => {}));
  await p.addInitScript(
    ([s, lang, low]) => {
      let x = s;
      Math.random = () => {
        x |= 0;
        x = (x + 0x6d2b79f5) | 0;
        let t = Math.imul(x ^ (x >>> 15), 1 | x);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      try {
        if (!localStorage.getItem("pota-fuzz")) {
          localStorage.setItem("pota-fuzz", "1");
          localStorage.setItem("pota-lang", lang);
          if (low) localStorage.setItem("pota-settings", JSON.stringify({ low: true }));
        }
      } catch (e) {}
      window.open = () => null;
    },
    [seed, lang, low]
  );
  await p.goto(URL);
  await p.waitForTimeout(500);
  // kariyer oluştur (yaratma ekranını da maymun dolaşır; burada başlangıç garanti edilir)
  await p
    .evaluate(pos => {
      const G = window.Game;
      G.F.first = "Test";
      G.F.last = "Oyuncu";
      G.F.pos = pos;
      G.F.slot = 1;
      G.startCareer();
    }, pos)
    .catch(e => add("hata", "başlatma: " + e.message));
  const t0 = Date.now();
  let lastSig = "",
    lastChange = Date.now(),
    actions = 0,
    weeks = 0,
    seasons = 0,
    lastWk = "";
  while (Date.now() - t0 < SECS * 1000) {
    let info;
    try {
      info = await p.evaluate(
        ([r1, r2, r3]) => {
          const vis = e => {
            const rc = e.getBoundingClientRect();
            if (rc.width < 4 || rc.height < 4) return false;
            const st = getComputedStyle(e);
            return st.visibility !== "hidden" && st.display !== "none" && st.pointerEvents !== "none";
          };
          // üstteki katman: reklam > panel > ekran
          const layer =
            document.querySelector("#adov") ||
            (document.querySelector("#ovl") && document.querySelector("#ovl").innerHTML.trim()
              ? document.querySelector("#ovl")
              : null) ||
            document.body;
          const els = [
            ...layer.querySelectorAll("button, .choice, [data-loc], label.btn, canvas, .opt, input[type=range], select")
          ].filter(
            e =>
              vis(e) &&
              !e.disabled &&
              !(e.closest("a") && /^https?:/.test(e.closest("a").getAttribute("href") || "")) &&
              e.id !== "impf"
          );
          const txt = (layer === document.body ? document.querySelector("#app") : layer).innerText || "";
          const sig = [txt.length, txt.slice(0, 80), els.length, (window.Game && window.Game.S && window.Game.S.week) || 0].join(
            "|"
          );
          const S = window.Game && window.Game.S;
          let act = "none";
          if (els.length) {
            // yalnızca büyük tuval mini oyundur (portreler ve simgeler küçük)
            const canv = els.filter(
              e => e.tagName === "CANVAS" && e.getBoundingClientRect().width * e.getBoundingClientRect().height > 40000
            );
            // mini oyun açıksa çoğunlukla tuvale dokun
            const pool = canv.length && r1 < 0.8 ? canv : els;
            const e = pool[Math.floor(r2 * pool.length)];
            const rc = e.getBoundingClientRect();
            if (e.tagName === "CANVAS") {
              const x = rc.left + rc.width * (0.1 + 0.8 * r3),
                y = rc.top + rc.height * (0.15 + 0.7 * r1);
              const ev = (type, dx = 0, dy = 0) =>
                e.dispatchEvent(
                  new PointerEvent(type, {
                    bubbles: true,
                    clientX: x + dx,
                    clientY: y + dy,
                    pointerId: 1,
                    pointerType: "touch",
                    isPrimary: true
                  })
                );
              ev("pointerdown");
              const dir = Math.floor(r2 * 4);
              ev("pointermove", [60, -60, 0, 0][dir], [0, 0, 60, -60][dir]);
              ev("pointerup", [60, -60, 0, 0][dir], [0, 0, 60, -60][dir]);
              act = "canvas";
            } else if (e.tagName === "INPUT") {
              e.value = String(Math.round(r3 * 100));
              e.dispatchEvent(new Event("input", { bubbles: true }));
              e.dispatchEvent(new Event("change", { bubbles: true }));
              act = "range";
            } else if (e.tagName === "SELECT") {
              e.selectedIndex = Math.floor(r3 * e.options.length);
              e.dispatchEvent(new Event("change", { bubbles: true }));
              act = "select";
            } else {
              e.click();
              act =
                (e.id ? "#" + e.id : "") +
                (e.dataset && Object.keys(e.dataset)[0] ? "[" + Object.keys(e.dataset)[0] + "]" : "") +
                " " +
                (e.innerText || "").slice(0, 20).replace(/\s+/g, " ");
            }
          }
          const dom =
            [...document.body.children].map(c => (c.id || c.tagName.toLowerCase()) + ":" + (c.innerHTML || "").length).join(",") +
            " mview:" +
            ((document.querySelector("#mview") || {}).innerHTML || "").slice(0, 300);
          const btns = [
            dom,
            ...els
              .slice(0, 12)
              .map(
                e => (e.id ? "#" + e.id : e.tagName.toLowerCase()) + ":" + (e.innerText || "").slice(0, 14).replace(/\s+/g, " ")
              )
          ];
          return { btns, sig, act, txt: txt.slice(0, 4000), week: S ? `${S.season}/${S.week}` : "-", stage: S ? S.stage : "-" };
        },
        [R(), R(), R()]
      );
    } catch (e) {
      // sayfa yeniden yüklendi (dil değişimi) ya da gezinme: bekle
      await p.waitForTimeout(400);
      continue;
    }
    actions++;
    hist.push(info.act + "@" + info.week);
    if (hist.length > 400) hist.shift();
    for (const [re, name] of BAD_TEXT) {
      const m = re.exec(info.txt);
      if (m) add("metin", `${name}: "${info.txt.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ")}"`, info.act);
    }
    if (info.sig !== lastSig) {
      lastSig = info.sig;
      lastChange = Date.now();
    } else if (Date.now() - lastChange > 25000) {
      add(
        "takılma",
        info.txt.slice(0, 200).replace(/\s+/g, " ") +
          " || öğeler: " +
          info.btns.join(", ") +
          " || son dokunuşlar: " +
          hist.join(" > "),
        info.act
      );
      lastChange = Date.now();
      // takıldıysa ana ekrana dönmeyi dene
      await p
        .evaluate(() => window.Game && window.Game.S && (window.Game.closeSheet(), window.Game.renderMain()))
        .catch(() => {});
    }
    const wk = info.week;
    if (wk !== lastWk) {
      weeks++;
      if (lastWk && wk.split("/")[0] !== lastWk.split("/")[0]) seasons++;
      lastWk = wk;
    }
    await p.waitForTimeout(20 + Math.floor(R() * 120));
  }
  const S = await p
    .evaluate(
      () => window.Game && window.Game.S && { age: window.Game.S.age, stage: window.Game.S.stage, season: window.Game.S.season }
    )
    .catch(() => null);
  await ctx.close();
  return { idx, seed, view: `${view.w}x${view.h}`, lang, low, pos, actions, weeks, seasons, end: S, issues };
}

(async () => {
  const b = await chromium.launch();
  const results = [];
  let next = 0;
  const only = process.env.FUZZ_SEED ? 1 : RUNS;
  await Promise.all(
    Array.from({ length: Math.min(PAGES, only) }, async () => {
      while (next < only) {
        const i = next++;
        const r = await run(b, i);
        results.push(r);
        process.stdout.write(
          `${r.issues.length ? "✗" : "✓"} koşu ${i + 1}/${only} (tohum ${r.seed}, ${r.lang}, ${r.view}${r.low ? ", düşük grafik" : ""}, ${r.pos}): ${r.actions} dokunuş, ${r.weeks} hafta, ${r.issues.length} sorun\n`
        );
      }
    })
  );
  await b.close();
  const all = results.flatMap(r => r.issues.map(i => ({ ...i, seed: r.seed, lang: r.lang })));
  const uniq = {};
  for (const i of all) (uniq[i.kind + ": " + i.msg.slice(0, 120)] = uniq[i.kind + ": " + i.msg.slice(0, 120)] || []).push(i.seed);
  console.log(
    `\n${results.length} koşu, ${results.reduce((a, r) => a + r.actions, 0)} dokunuş, ${results.reduce((a, r) => a + r.weeks, 0)} oyun haftası`
  );
  for (const [k, seeds] of Object.entries(uniq)) console.log(`- ${k}  (tohum: ${[...new Set(seeds)].slice(0, 5).join(", ")})`);
  if (process.env.FUZZ_OUT) require("fs").writeFileSync(process.env.FUZZ_OUT, JSON.stringify(results, null, 1));
  if (all.length) process.exit(1);
  console.log("Sağlamlık testi geçti.");
})();
