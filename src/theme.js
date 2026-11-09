/* ================= TEMA TOKEN'LARI (tuval ve SVG için) =================
   Renk, yazı, boşluk, köşe ve gölge token'larının TEK kaynağı index.html başındaki :root bloğudur; temalar
   (src/custom.js THEME_CSS), renk körü (html.cb) ve yüksek kontrast (html.hc) yalnız bu değişkenleri ezer.
   HTML şablonları doğrudan var(--…) kullanır. Tuval (canvas) çizimleri CSS değişkeni okuyamadığı için arayüz
   anlamı taşıyan renkleri (mini oyun yazıları, sahne zemini, başarı/uyarı renkleri) tok() ile :root'tan alır.
   İllüstrasyon renkleri (kulüp/forma renkleri, mürekkep #141414, ten/saç, mekân çizimleri) token DEĞİLDİR;
   kendi modüllerinde sanat paleti olarak kalır. */

/** :root'taki varsayılan değerler: DOM yoksa (birim testleri) ya da değişken okunamazsa yedek */
export const THEME_TOKENS = {
  "--bg": "#090d15",
  "--bg2": "#0e141f",
  "--card": "#121a28",
  "--card2": "#182233",
  "--line": "#223047",
  "--line2": "#2f3f5c",
  "--text": "#eef2f8",
  "--muted": "#8c99ae",
  "--dim": "#5d6b82",
  "--gold": "#d8b25a",
  "--hot": "#ff6a2b",
  "--good": "#36d38e",
  "--bad": "#ff5468",
  "--warn": "#ffc54d",
  "--info": "#58a6ff",
  "--stage-bg": "#05080e"
};

let cacheKey = null,
  cache = {};
/** CSS token değeri (ör. tok("--warn") → "#ffc54d"). Tema/renk körü sınıfı değişince önbellek yenilenir;
    kare başına çağrılabilir. */
export function tok(name, fallback) {
  const d = fallback || THEME_TOKENS[name] || "";
  try {
    const el = document.documentElement;
    const key = el.className + "|" + (el.dataset.theme || "") + "|" + (el.getAttribute("style") || "");
    if (key !== cacheKey) {
      cacheKey = key;
      cache = {};
    }
    if (!(name in cache)) cache[name] = getComputedStyle(el).getPropertyValue(name).trim();
    return cache[name] || d;
  } catch (e) {
    return d;
  }
}
/** Token rengini saydamlıkla (tuval için): tokAlpha("--good", .35) → "rgba(54,211,142,0.35)" */
export function tokAlpha(name, a) {
  const c = tok(name);
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  let h = m[1];
  if (h.length === 3) h = [...h].map(x => x + x).join("");
  const n = parseInt(h, 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
