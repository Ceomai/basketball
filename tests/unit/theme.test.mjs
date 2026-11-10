// Tema yardımcıları: WCAG kontrastı, dolu zeminde yazı rengi seçimi, hex dönüşümü (Aşama 3.2)
import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, inkOn, hex6 } from "../../src/theme.js";

test("kontrast oranı: siyah/beyaz 21, aynı renk 1", () => {
  assert.equal(Math.round(contrastRatio("#000", "#ffffff")), 21);
  assert.equal(contrastRatio("#ff6a2b", "#ff6a2b"), 1);
});
test("takım rengi yazısı: iki adaydan kontrastı yüksek olan seçilir", () => {
  for (const c of ["#ff6a2b", "#1d428a", "#00875a", "#f0b323", "#c8102e", "#5b2a86", "#e8e8e8", "#7f7f7f"]) {
    const ink = inkOn(c);
    const other = ink === "#ffffff" ? "#0a0f18" : "#ffffff";
    assert.ok(contrastRatio(c, ink) >= contrastRatio(c, other), c);
  }
  // orta parlaklıktaki turuncuda (luma ≤ 150) eski kural beyaz seçiyordu (2,9:1); koyu yazı daha okunur
  assert.equal(inkOn("#ff6a2b"), "#0a0f18");
});
test("hex6: 3 haneli ve rgb() 6 haneliye çevrilir", () => {
  assert.equal(hex6("#0af"), "#00aaff");
  assert.equal(hex6("#0E141F"), "#0e141f");
  assert.equal(hex6("rgb(14, 20, 31)"), "#0e141f");
  assert.equal(hex6("var(--x)"), null);
});

// aşama 4: açılış durum çubuğu = oyundaki durum çubuğu (--bg2); eski WebView geri dönüşleri; kayıt şeması yorumu
import fs from "node:fs";
import { THEME_TOKENS } from "../../src/theme.js";
const ROOT = new URL("../../", import.meta.url);
const read = p => fs.readFileSync(new URL(p, ROOT), "utf8");
test("durum çubuğu açılışta ve oyunda aynı renk (--bg2)", () => {
  const bar = THEME_TOKENS["--bg2"].toLowerCase();
  assert.equal(JSON.parse(read("capacitor.config.json")).plugins.StatusBar.backgroundColor.toLowerCase(), bar);
  assert.match(read("index.html"), new RegExp(`<meta name="theme-color" content="${bar}">`));
  assert.equal(JSON.parse(read("public/manifest.webmanifest")).theme_color.toLowerCase(), bar);
  const colors = read("android/app/src/main/res/values/colors_pota.xml");
  assert.match(colors, new RegExp(`name="pota_bar">${bar}<`, "i"));
  assert.match(read("android/app/src/main/res/values/styles.xml"), /statusBarColor">@color\/pota_bar</);
});
test("eski WebView: color-mix, clamp ve :has için geri dönüş kuralları var", () => {
  const html = read("index.html");
  assert.match(html, /@supports not \(color:color-mix\(in srgb,red,blue\)\)\{\s*:root\{--good-bg:rgba/);
  assert.match(html, /@supports not \(width:clamp\(1px,1px,1px\)\)\{\.mt i,\.bar i\{/);
  assert.match(html, /\.sheet-b\.has-pri-end\{scroll-padding-bottom:72px\}/);
  assert.match(html, /\.app\.has-mainlay,\.app\.has-mlay\{max-width:1100px\}/);
});
test("kayıt şeması yorumundaki test dosyası var", () => {
  const m = read("src/logic/saveSchema.js").match(/tests\/unit\/[\w.-]+\.mjs/g) || [];
  assert.ok(m.length);
  for (const f of m) assert.ok(fs.existsSync(new URL(f, ROOT)), f);
});
