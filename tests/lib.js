// Tarayıcı testleri için ortak yardımcılar (tests/personas.js). Gerçek oyun dist-single ya da dist/ üzerinde çalışır.
const fs = require("fs"),
  path = require("path"),
  http = require("http");
const ROOT = path.resolve(__dirname, "..");
const SINGLE = "file://" + path.join(ROOT, "dist-single", "index.html");

/** dist/ klasörünü yerel HTTP sunucusundan sun (servis çalışanı için "localhost") */
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
    const server = http
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
      .listen(0, () => res({ server, base: `http://localhost:${server.address().port}/` }));
  });
}
/** Yeni tarayıcı bağlamı + sayfa; sayfa hataları p.errs'te */
async function open(browser, opts = {}, url = SINGLE) {
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
/** Oluşturma ekranını ATLAYARAK kariyer başlat (API) */
async function career(p, o = {}) {
  await p.evaluate(o => {
    const G = window.Game;
    G.ADS.consent = o.consent === undefined ? true : o.consent;
    G.F.first = o.first || "Deniz";
    G.F.last = o.last || "Test";
    G.F.pos = o.pos || "SF";
    G.F.slot = o.slot || 1;
    G.F.mode = o.mode || "normal";
    G.startCareer();
    if (o.tut !== false) G.S.tut = 1;
    G.S.tipMoment = 1;
    G.closeSheet();
    G.renderMain();
  }, o);
}
/** Araya giren ekranları geç; ana ekrana dönünce true */
async function toMain(p, limit = 400) {
  for (let i = 0; i < limit; i++) {
    const st = await p.evaluate(() => {
      const $ = s => document.querySelector(s);
      if ($("#gostad") && !$("#ovl").innerHTML.trim() && !$("#adov") && !$("#acov")) return "main";
      if ($("#nw") && window.Game.S && window.Game.S.retired) return "retired";
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
        "#rb",
        "#pok",
        "#aok",
        "#bn-later",
        "#tr-skip",
        "#ng-ok",
        "#pk-no",
        "#mt-stay",
        "#hk-ok",
        "#jy-ok",
        "[data-kn]",
        "[data-kd]",
        "#kd-ok",
        "[data-an]",
        "[data-tl]",
        "#hk-a",
        "#nt-sim",
        "#nt-done",
        "#mw-sim",
        "#mw-ok"
      ]) {
        const e = $(s);
        if (e && !e.disabled) return (e.click(), "c");
      }
      const o = document.querySelector("[data-o]");
      if (o) return (o.click(), "c");
      return "wait";
    });
    if (st === "main" || st === "retired") return st;
    await p.waitForTimeout(st === "wait" ? 60 : 15);
  }
  return false;
}
/** Bir hafta: ana ekrandaki "Haftayı hızlı geç" → "Maçı hızlı oynat" düğmeleriyle (gerçek dokunuşlar) */
async function week(p) {
  await p.evaluate(() => {
    window.Game.closeSheet();
    window.Game.renderMain();
  });
  await p.click("#quickw");
  const sim = await p.$("#qw-sim");
  if (sim) await sim.click();
  return toMain(p);
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
module.exports = { ROOT, SINGLE, serveDist, open, career, toMain, week, assert };
