/* ================= YAYIN YAPILANDIRMASI VE GİZLİLİK AYARLARI =================
   1) Reklam kimlikleri TEK noktadan gelir: derleme ortam değişkenleri (Vite). Tanımlı değilse Google'ın TEST kimlikleri.
        VITE_ADMOB_REWARDED_ANDROID, VITE_ADMOB_INTERSTITIAL_ANDROID, VITE_ADMOB_REWARDED_IOS, VITE_ADMOB_INTERSTITIAL_IOS
      Uygulama kimliği (ca-app-pub-...~...) Android'de android/app/build.gradle → ADMOB_APP_ID, iOS'ta Info.plist.
      Test kimliğiyle yayın engeli: tools/release-check.mjs (CI'da AAB'den önce) + Gradle yayın kapısı + çalışma
      zamanında konsol uyarısı ve Ayarlar'da "test reklamları" notu.
   2) Reklam isteği hedeflemesi: çocuklara yönelik DEĞİL, en fazla "Teen" içerik (oyunda simüle kumar var; 13+ önerilir).
   3) Ayarlar → Gizlilik ve verilerin: gizlilik politikası, Google reklam gizlilik seçenekleri (AB/UK), satın alımları
      geri yükle (App Store zorunlu), bütün verilerimi sil (cihaz + bulut; Play hesap/veri silme politikası). */
import { t as $t } from "./i18n/index.js";
import { $, toast } from "./data.js";
import { closeSheet, sheet } from "./core.js";
import { late } from "./late.js";

const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};
/** Google'ın herkese açık test kimlikleri (gerçek gelir getirmez) */
export const REL_TEST_ADMOB = {
  rewarded: { android: "ca-app-pub-3940256099942544/5224354917", ios: "ca-app-pub-3940256099942544/1712485313" },
  interstitial: { android: "ca-app-pub-3940256099942544/1033173712", ios: "ca-app-pub-3940256099942544/4411468910" }
};
const pickId = (v, test) => (typeof v === "string" && /^ca-app-pub-\d+\/\d+$/.test(v.trim()) ? v.trim() : test);
/** Kullanılan reklam birimi kimlikleri (src/ads.js ADS_CFG.admob buradan okur) */
export const REL_ADMOB = {
  rewarded: {
    android: pickId(ENV.VITE_ADMOB_REWARDED_ANDROID, REL_TEST_ADMOB.rewarded.android),
    ios: pickId(ENV.VITE_ADMOB_REWARDED_IOS, REL_TEST_ADMOB.rewarded.ios)
  },
  interstitial: {
    android: pickId(ENV.VITE_ADMOB_INTERSTITIAL_ANDROID, REL_TEST_ADMOB.interstitial.android),
    ios: pickId(ENV.VITE_ADMOB_INTERSTITIAL_IOS, REL_TEST_ADMOB.interstitial.ios)
  }
};
/** Kimlik Google test kimliği mi? */
export const relIsTestId = id => /^ca-app-pub-3940256099942544[/~]/.test(String(id || ""));
/** Bu platformda test reklam kimlikleri mi kullanılıyor? */
export const relTestAds = (plat = "android") =>
  relIsTestId(REL_ADMOB.rewarded[plat === "ios" ? "ios" : "android"]) ||
  relIsTestId(REL_ADMOB.interstitial[plat === "ios" ? "ios" : "android"]);
const isNative = () => {
  const C = window.Capacitor;
  return !!(C && C.isNativePlatform && C.isNativePlatform());
};
const plat = () => {
  try {
    return window.Capacitor.getPlatform();
  } catch (e) {
    return "web";
  }
};
let warned = false;
/** Uygulama üretim derlemesi test kimlikleriyle çalışıyorsa bir kez uyar (yayından önce yakalansın) */
export function relWarnTestAds() {
  if (warned || !isNative() || !ENV.PROD || ENV.VITE_ALLOW_TEST_ADS === "1" || !relTestAds(plat())) return false;
  warned = true;
  console.warn("[Pota] AdMob TEST kimlikleri kullanılıyor: mağaza sürümü değil. docs/YAYIN_KONTROL.md");
  return true;
}
/** AdMob başlatma seçenekleri: çocuklara yönelik değil, içerik tavanı Teen */
export const REL_AD_REQUEST = { tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false, maxAdContentRating: "Teen" };
export const REL_PRIVACY_URL = "https://ceomai.github.io/basketball/privacy.html";
export const REL_DELETE_URL = "https://ceomai.github.io/basketball/delete-data.html";

/** Reklamsız paket düğmesi: mağazadan gelen yerel fiyatla (ör. "₺49,99") */
export function relAdFreeLabel() {
  let price = "";
  try {
    price = (window.PotaStore && window.PotaStore.price && window.PotaStore.price("adfree")) || "";
  } catch (e) {
    price = "";
  }
  return price ? `${$t("ads.39")} · ${price}` : $t("ads.39");
}

/* ---- Ayarlar bölümü ---- */
export function relSettingsHTML() {
  const store = !!(window.PotaStore && window.PotaStore.restore);
  const ump = !!(window.PotaNative && window.PotaNative.privacyOptionsRequired);
  const test = isNative() && relTestAds(plat());
  return `<div class="eyebrow mt-1">${$t("rel.title")}</div>
   ${test ? `<p class="small muted" id="rel-test">${$t("rel.testAds")}</p>` : ""}
   <div class="act"><div><h3>${$t("rel.privacy")}</h3><p>${$t("rel.privacyD")}</p></div><a class="btn ghost sm" id="rel-pp" href="${REL_PRIVACY_URL}" target="_blank" rel="noopener">${$t("rel.open")}</a></div>
   ${ump ? `<div class="act"><div><h3>${$t("rel.ump")}</h3><p>${$t("rel.umpD")}</p></div><button class="btn ghost sm" id="rel-ump">${$t("rel.open")}</button></div>` : ""}
   ${store ? `<div class="act"><div><h3>${$t("rel.restore")}</h3><p>${$t("rel.restoreD")}</p></div><button class="btn ghost sm" id="rel-restore">${$t("rel.restoreBtn")}</button></div>` : ""}
   <div class="act"><div><h3>${$t("rel.wipe")}</h3><p>${$t("rel.wipeD")}</p></div><button class="btn ghost sm" id="rel-wipe">${$t("rel.wipeBtn")}</button></div>`;
}
export function bindRelSettings(re) {
  const u = $("#rel-ump");
  if (u)
    u.onclick = async () => {
      try {
        await window.PotaNative.privacyOptions();
      } catch (e) {
        toast($t("rel.err"));
      }
    };
  const r = $("#rel-restore");
  if (r)
    r.onclick = async () => {
      r.disabled = true;
      try {
        const owned = await window.PotaStore.restore();
        toast(owned ? $t("rel.restoreOk") : $t("rel.restoreNone"));
      } catch (e) {
        toast($t("rel.err"));
      }
      re && re();
    };
  const w = $("#rel-wipe");
  if (w) w.onclick = () => relWipeSheet(re);
}
function relWipeSheet(re) {
  const cloud = !!(late.signedIn && late.cloudReady && late.cloudReady() && late.signedIn());
  sheet(
    $t("rel.wipe"),
    $t("rel.wipeSub"),
    `<div class="say bad">${$t("rel.wipeWarn")}</div>${cloud ? `<p class="small">${$t("rel.wipeCloud")}</p>` : ""}<p class="small muted">${$t("rel.wipeWeb", { url: REL_DELETE_URL })}</p><div class="grid2"><button class="btn ghost" id="rw-no">${$t("rel.cancel")}</button><button class="btn pri" id="rw-yes">${$t("rel.wipeBtn")}</button></div>`
  );
  $("#rw-no").onclick = () => (closeSheet(), re && re());
  $("#rw-yes").onclick = async () => {
    $("#rw-yes").disabled = true;
    try {
      await relWipeAll();
    } catch (e) {
      toast($t("rel.err"));
      return;
    }
    location.reload();
  };
}
/** Cihazdaki bütün oyun verilerini (ve girişliyse buluttaki kayıtları ve hesabı) siler. */
const wipeLocal = () => {
  try {
    Object.keys(localStorage)
      .filter(k => /^pota/.test(k))
      .forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) {
    /* depolama kapalı */
  }
};
export async function relWipeAll() {
  if (late.cloudDeleteAll && late.signedIn && late.signedIn()) await late.cloudDeleteAll();
  wipeLocal();
  // sayfa yenilenirken bellekteki modüller (telemetri vb.) kendi anahtarını yeniden yazmasın: en son biz sileriz
  document.addEventListener("visibilitychange", wipeLocal);
  window.addEventListener("pagehide", wipeLocal);
  try {
    indexedDB.deleteDatabase("pota-kariyeri");
  } catch (e) {
    /* IndexedDB yok */
  }
  if (window.PotaNative && window.PotaNative.clearPrefs) await window.PotaNative.clearPrefs();
  return true;
}
