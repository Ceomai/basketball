import { LANG } from "./i18n/index.js";
/* ================= HATA RAPORLAMA =================
   Oyundaki JavaScript hataları yakalanır:
   - Cihazda son 30 hata saklanır (Ayarlar → Hata raporları; oyun testi raporuna da eklenir).
   - SENTRY_DSN tanımlıysa hata Sentry'ye gönderilir (SDK eklemeden, Sentry'nin "envelope" HTTP arayüzüyle).
     Kişisel veri yok: yalnızca hata mesajı, yığın izinin ilk satırları, sürüm, dil, platform ve kariyer evresi.
   - Oturum başına en fazla 10 gönderim; aynı hata tekrar gönderilmez. Ayarlardan kapatılabilir.
   Android'de yerel çökme raporları ayrıca Google Play Console → Android vitals'ta görünür. */
import { S } from "./core.js";

// Sentry projesinin DSN'i: https://<anahtar>@<host>/<proje-no>. Boşsa yalnızca cihazda saklanır.
export const SENTRY_DSN = "";
export const RELEASE = "pota-kariyeri@1.0.0";
const KEY = "pota-errors",
  MAX = 30;
const seen = new Set();
let sent = 0;
export function errorLog() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch (e) {
    return [];
  }
}
function store(item) {
  try {
    const list = errorLog();
    list.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch (e) {
    /* depolama yok */
  }
}
/** DSN'den envelope adresi (test edilebilir) */
export function envelopeURL(dsn) {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn || "");
  return m ? `https://${m[2]}/api/${m[3]}/envelope/?sentry_key=${m[1]}&sentry_version=7` : null;
}
const uuid = () =>
  ([1e7] + 1e3 + 4e3 + 8e3 + 1e11).replace(/[018]/g, c => (c ^ ((Math.random() * 16) >> (c / 4))).toString(16)).replace(/-/g, "");
/** Sentry olay gövdesi (test edilebilir) */
export function sentryEnvelope(err, dsn = SENTRY_DSN) {
  const id = uuid(),
    now = new Date().toISOString();
  const event = {
    event_id: id,
    timestamp: now,
    platform: "javascript",
    level: "error",
    release: RELEASE,
    environment: window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? "android" : "web",
    exception: {
      values: [
        {
          type: err.type || "Error",
          value: err.m,
          stacktrace: { frames: (err.stack || []).map(f => ({ filename: f })).reverse() }
        }
      ]
    },
    tags: { lang: LANG, stage: err.stage || "", season: String(err.season || "") }
  };
  return `${JSON.stringify({ event_id: id, sent_at: now, dsn })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
}
export function reportError(type, message, stack) {
  if (window.__SIM) return;
  const m = String(message || "").slice(0, 300);
  const item = {
    t: Date.now(),
    type,
    m,
    stack: String(stack || "")
      .split("\n")
      .slice(0, 6)
      .map(s => s.trim().slice(0, 160)),
    stage: S && S.stage,
    season: S && S.season
  };
  store(item);
  const settings = (() => {
    try {
      return JSON.parse(localStorage.getItem("pota-settings") || "{}");
    } catch (e) {
      return {};
    }
  })();
  const url = envelopeURL(SENTRY_DSN);
  if (!url || settings.errorReports === false || sent >= 10 || seen.has(m)) return;
  seen.add(m);
  sent++;
  try {
    fetch(url, { method: "POST", body: sentryEnvelope(item) }).catch(() => {});
  } catch (e) {
    /* ağ yok */
  }
}
window.addEventListener("error", e => reportError((e.error && e.error.name) || "Error", e.message, e.error && e.error.stack));
window.addEventListener("unhandledrejection", e =>
  reportError("UnhandledRejection", e.reason && e.reason.message ? e.reason.message : e.reason, e.reason && e.reason.stack)
);
