// Google Play tanıtım görseli (1024×500): node tools/feature-graphic.js → store/graphics/feature-<dil>.png
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const ROOT = path.resolve(__dirname, "..");
const font = f => "data:font/woff2;base64," + fs.readFileSync(path.join(ROOT, "node_modules/@fontsource", f)).toString("base64");
const icon = "data:image/png;base64," + fs.readFileSync(path.join(ROOT, "public/icons/icon-512.png")).toString("base64");
const TXT = {
  tr: { t: "POTA KARİYERİ", s: "Liseden dünyanın zirvesine", b: ["Maçı sen oyna", "Kariyerini kur", "Hayatını yaşa"] },
  en: { t: "HOOP CAREER", s: "From high school to the top", b: ["Play the game", "Build your career", "Live your life"] }
};
const html = l => `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><style>
@font-face{font-family:B;font-weight:800;src:url(${font("barlow-condensed/files/barlow-condensed-latin-800-normal.woff2")})}
@font-face{font-family:B;font-weight:800;src:url(${font("barlow-condensed/files/barlow-condensed-latin-ext-800-normal.woff2")});unicode-range:U+0100-024F}
@font-face{font-family:M;font-weight:700;src:url(${font("manrope/files/manrope-latin-700-normal.woff2")})}
@font-face{font-family:M;font-weight:700;src:url(${font("manrope/files/manrope-latin-ext-700-normal.woff2")});unicode-range:U+0100-024F}
html,body{margin:0;width:1024px;height:500px;overflow:hidden}
body{background:radial-gradient(circle at 78% 50%,#ff6b2c55 0,#ff6b2c00 46%),linear-gradient(135deg,#090d15 0%,#131c2e 60%,#1d1430 100%);color:#eef2f8;font-family:M;position:relative}
.court{position:absolute;right:-120px;top:-60px;width:620px;height:620px;border-radius:50%;border:6px solid #ffffff14}
.court2{position:absolute;right:40px;top:100px;width:300px;height:300px;border-radius:50%;border:6px solid #ffffff10}
img{position:absolute;right:92px;top:80px;width:340px;height:340px;border-radius:64px;box-shadow:0 30px 80px #000a}
.l{position:absolute;left:64px;top:92px;width:520px}
h1{font-family:B;font-weight:800;font-size:96px;line-height:.95;margin:0;letter-spacing:1px;text-transform:uppercase}
h1 span{color:#ff7a33}
p{font-size:30px;margin:18px 0 28px;color:#c9d3e3}
ul{list-style:none;padding:0;margin:0;display:flex;gap:12px;flex-wrap:wrap}
li{font-size:20px;padding:9px 16px;border-radius:999px;background:#ffffff12;border:1px solid #ffffff24}
</style></head><body><div class="court"></div><div class="court2"></div><img src="${icon}">
<div class="l"><h1>${TXT[l].t.replace(/ (\S+)$/, " <span>$1</span>")}</h1><p>${TXT[l].s}</p><ul>${TXT[l].b.map(x => `<li>${x}</li>`).join("")}</ul></div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const out = path.join(ROOT, "store/graphics");
  fs.mkdirSync(out, { recursive: true });
  for (const l of ["tr", "en"]) {
    const p = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    await p.setContent(html(l));
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `feature-${l}.png`) });
    await p.close();
  }
  await b.close();
  console.log("store/graphics/feature-tr.png, feature-en.png (1024×500)");
})();
