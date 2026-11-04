/* ================= UZAKTAN AYAR VE A/B DENEYLERİ =================
   Reklam sıklığı ve ödüllü reklam yerleşimleri, güncelleme yayınlamadan GitHub Pages'teki
   remote-config.json dosyasıyla değiştirilebilir. Dosya alınamazsa (internet yok, dosyadan açılmış oyun)
   son alınan ayar, o da yoksa aşağıdaki varsayılanlar kullanılır.

   Güvenlik: yalnızca varsayılanlarda olan alanlar okunur; sayılar SINIR aralığına kırpılır, tip uymayan değer
   yok sayılır. Böylece bozuk ya da kötü niyetli bir ayar oyunu kilitleyemez (ör. her maç reklam).

   A/B: her kurulum rastgele, anonim bir kimlik alır (kişisel veri değil). Deney kovası kimlik + deney adından
   türetilir, aynı cihazda hep aynı kalır. Analitik olaylarına kova bilgisi eklenir (src/analytics.js). */
export const RC_URL_NATIVE = "https://ceomai.github.io/basketball/remote-config.json";
export const RC_DEFAULTS = {
  ads: {
    dailyRewardCap: 100, // güvenlik tavanı (gerçek oyuncu görmez)
    energyPerWeek: 20, // enerji reklamı zaten yalnızca enerji 60 altındayken çıkar
    // breakGapMs: doğal kırılma anlarındaki (sezon sonu, transfer) geçiş reklamı için en kısa ara
    interstitial: { minGames: 6, everyGames: 3, minGapMs: 240000, breakGapMs: 180000, breaks: true }
  },
  // ödüllü reklam yerleşimleri (aç/kapat ve sınırlar)
  rewards: { retry: true, extraOffer: true, recall: true, season: true, trainPerWeek: 1, box: true }
};
const LIMITS = {
  "ads.dailyRewardCap": [0, 200],
  "ads.energyPerWeek": [0, 20],
  "ads.interstitial.minGames": [2, 50],
  "ads.interstitial.everyGames": [2, 20],
  "ads.interstitial.minGapMs": [120000, 3600000],
  "ads.interstitial.breakGapMs": [120000, 3600000],
  "rewards.trainPerWeek": [0, 3]
};
const KEY = "pota-rc",
  UID = "pota-uid";
const clone = o => JSON.parse(JSON.stringify(o));
/** Varsayılanların şekline göre güvenli birleştirme: bilinmeyen alan, yanlış tip yok sayılır, sayı kırpılır */
export function mergeSafe(base, src, path = "") {
  if (!src || typeof src !== "object" || Array.isArray(src)) return base;
  for (const k of Object.keys(base)) {
    if (!(k in src)) continue;
    const p = path ? `${path}.${k}` : k,
      b = base[k],
      v = src[k];
    if (b && typeof b === "object") mergeSafe(b, v, p);
    else if (typeof b === "number" && typeof v === "number" && Number.isFinite(v)) {
      const [lo, hi] = LIMITS[p] || [0, 1e9];
      base[k] = Math.min(hi, Math.max(lo, Math.round(v)));
    } else if (typeof b === "boolean" && typeof v === "boolean") base[k] = v;
  }
  return base;
}
export function installId() {
  try {
    let id = localStorage.getItem(UID);
    if (!id || !/^[0-9a-f]{12}$/.test(id)) {
      const a = new Uint8Array(6);
      crypto.getRandomValues(a);
      id = [...a].map(x => x.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(UID, id);
    }
    return id;
  } catch (e) {
    return "000000000000";
  }
}
// FNV-1a: kimlik + deney adından kararlı kova
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
export const VARIANTS = {}; // deney adı → kova ("A", "B", ...)
/** Ham ayardan geçerli ayarı üret (varsayılanlar + ayar + bu cihazın deney kovaları) */
export function rcBuild(raw) {
  const out = mergeSafe(clone(RC_DEFAULTS), raw);
  for (const k of Object.keys(VARIANTS)) delete VARIANTS[k];
  const exps = raw && Array.isArray(raw.experiments) ? raw.experiments.slice(0, 8) : [];
  for (const x of exps) {
    if (!x || x.on === false || typeof x.id !== "string" || !/^[\w-]{1,32}$/.test(x.id)) continue;
    const names = x.variants && typeof x.variants === "object" ? Object.keys(x.variants).sort().slice(0, 4) : [];
    if (!names.length) continue;
    const v = names[hash(`${installId()}:${x.id}`) % names.length];
    VARIANTS[x.id] = v;
    mergeSafe(out, x.variants[v]);
  }
  return out;
}
let raw = null;
try {
  raw = JSON.parse(localStorage.getItem(KEY) || "null");
} catch (e) {
  raw = null;
}
export const RC = rcBuild(raw);
const listeners = [];
/** Ayar değişince çağrılacak fonksiyon (ör. ADS_CFG'ye uygula) */
export function onRemote(fn) {
  listeners.push(fn);
  fn(RC);
}
function apply(r) {
  const n = rcBuild(r);
  for (const k of Object.keys(RC)) delete RC[k];
  Object.assign(RC, n);
  listeners.forEach(fn => {
    try {
      fn(RC);
    } catch (e) {
      /* dinleyici hatası ayarı bozmasın */
    }
  });
}
const isNative = () => {
  const C = window.Capacitor;
  return !!(C && C.isNativePlatform && C.isNativePlatform());
};
/** Uzaktaki ayarı al (açılışta bir kez; 5 sn zaman aşımı) */
export async function loadRemote() {
  if (window.__SIM || window.__NO_RC || location.protocol === "file:") return false;
  try {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 5000);
    const r = await fetch(isNative() ? RC_URL_NATIVE : "remote-config.json", { cache: "no-store", signal: ctl && ctl.signal });
    clearTimeout(tm);
    if (!r.ok) return false;
    const txt = await r.text();
    if (txt.length > 20000) return false;
    const j = JSON.parse(txt);
    if (!j || typeof j !== "object") return false;
    localStorage.setItem(KEY, JSON.stringify(j));
    apply(j);
    return true;
  } catch (e) {
    return false;
  }
}
/** Testler için: ayarı elle uygula */
export const applyRemote = r => apply(r);
