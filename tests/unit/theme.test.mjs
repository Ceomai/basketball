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
