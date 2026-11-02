/* ================= GELİR VE ELDE TUTMA ÖLÇÜMÜ (analitik) =================
   İki katman:
   1) Cihazda yerel özet (ağa hiçbir şey gitmez): kurulum günü, aktif gün sayısı, oturum sayısı, her reklam
      yerleşiminin kaç kez sunulup kaç kez izlendiği. Oyun testi raporuna eklenir (src/telemetry.js).
   2) Firebase Analytics: uygulamaya @capacitor-firebase/analytics eklentisi ve google-services.json eklenince
      olaylar oraya da gider. Yalnızca reklam izni ekranında "izin ver" denmişse (ADS.consent === true).
      Eklenti yoksa (web, şimdiki APK) bu katman sessizce devre dışıdır.
   Olaylar: active_day (kurulumdan bu yana kaçıncı gün), ad_offer, ad_reward, ad_inter, ad_cap, purchase,
   career_start, season_end, retire. Her olaya A/B kovaları (src/remote.js) kullanıcı özelliği olarak eklenir. */
import { Bus } from "./data.js";
import { S } from "./core.js";
import { ADS } from "./ads.js";
import { VARIANTS } from "./remote.js";

const KEY = "pota-an";
const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const AN = (() => {
  let st = {};
  try {
    st = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    st = {};
  }
  const o = Object.assign({ inst: "", days: [], sess: 0, offers: {}, watched: {} }, st);
  if (!Array.isArray(o.days)) o.days = [];
  if (!o.offers || typeof o.offers !== "object") o.offers = {};
  if (!o.watched || typeof o.watched !== "object") o.watched = {};
  return o;
})();
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(AN));
  } catch (e) {
    /* dolu */
  }
};
const fb = () => {
  const C = window.Capacitor;
  if (!(C && C.isNativePlatform && C.isNativePlatform())) return null;
  return (C.Plugins && C.Plugins.FirebaseAnalytics) || null;
};
let propsSent = false;
/** Olayı Firebase'e ilet (eklenti ve izin varsa). Parametreler yalnızca sayı ve kısa metin. */
export function track(name, params = {}) {
  if (window.__SIM) return;
  const F = fb();
  if (!F || ADS.consent !== true) return;
  try {
    if (!propsSent) {
      propsSent = true;
      for (const [k, v] of Object.entries(VARIANTS)) F.setUserProperty({ key: `ab_${k}`.slice(0, 24), value: String(v) });
    }
    const p = {};
    for (const [k, v] of Object.entries(params))
      if (typeof v === "number" && Number.isFinite(v)) p[k] = v;
      else if (typeof v === "string") p[k] = v.slice(0, 40);
      else if (typeof v === "boolean") p[k] = v ? 1 : 0;
    if (S) Object.assign(p, { season: S.season, stage: S.stage });
    F.logEvent({ name, params: p }).catch(() => {});
  } catch (e) {
    /* analitik oyunu asla durdurmaz */
  }
}
/** Kurulumdan bu yana gün (0 = kurulum günü) */
export function dayIndex(d = dayKey()) {
  if (!AN.inst) return 0;
  return Math.max(0, Math.round((new Date(d) - new Date(AN.inst)) / 864e5));
}
export function sessionStart() {
  const d = dayKey();
  if (!AN.inst) AN.inst = d;
  AN.sess++;
  if (!AN.days.includes(d) && (!AN.days.length || d > AN.days[AN.days.length - 1])) {
    AN.days.push(d);
    if (AN.days.length > 120) AN.days.splice(0, AN.days.length - 120);
    track("active_day", { d: dayIndex(d), n: AN.days.length });
  }
  persist();
}
/** Reklam yerleşimi oyuncuya sunuldu (aynı ekranda tekrar çizilse de ekran başına bir kez sayılır) */
const offered = new Set();
export function adOffer(place) {
  const key = `${place}:${S ? `${S.season}-${S.week}-${S.results ? S.results.length : 0}` : ""}`;
  if (offered.has(key)) return;
  offered.add(key);
  AN.offers[place] = (AN.offers[place] || 0) + 1;
  persist();
  track("ad_offer", { place });
}
Bus.on("ad", d => {
  if (d.kind === "rewarded" && d.ok) {
    AN.watched[d.place] = (AN.watched[d.place] || 0) + 1;
    persist();
  }
  track(d.kind === "rewarded" ? "ad_reward" : "ad_inter", { place: d.place, ok: !!d.ok });
});
Bus.on("ad:cap", d => track("ad_cap", { place: d.place }));
Bus.on("purchase", d => track("purchase", { item: String((d && (d.id || d.k || d.item)) || "") }));
Bus.on("career:start", () => track("career_start"));
Bus.on("season:end", d => track("season_end", { champ: !!(d && d.champ) }));
Bus.on("career:retire", () => track("retire"));

/** Yerel özet: oyun testi raporu ve geliştirici incelemesi için */
export function analyticsSummary() {
  return {
    inst: AN.inst,
    activeDays: AN.days.length,
    lastDay: dayIndex(AN.days[AN.days.length - 1] || dayKey()),
    sessions: AN.sess,
    offers: AN.offers,
    watched: AN.watched,
    ab: { ...VARIANTS }
  };
}
sessionStart();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) sessionStart();
});
