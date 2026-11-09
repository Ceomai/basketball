import { t as $t } from "./i18n/index.js";
/* ================= UYGULAMA (Capacitor) KATMANI =================
   Oyun Android/iOS uygulaması olarak paketlendiğinde çalışır; web'de hiçbir şey yapmaz.
   - Geri tuşu: açık paneli kapatır, ana ekranda uygulamayı arka plana alır
   - Kayıtlar yerel depoya (Preferences) da yansıtılır; Android otomatik yedekleme bunları Google hesabına yedekler
   - Yedek dosyası ve test raporu yerel paylaşım menüsüyle gönderilir
   - AdMob: başlatma ve AB/İngiltere için Google rıza formu (UMP)
   - Reklamsız paket: Google Play / App Store uygulama içi satın alma (cordova-plugin-purchase) */
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { StatusBar, Style } from "@capacitor/status-bar";
import { AdMob } from "@capacitor-community/admob";
import { $, Bus } from "./data.js";
import { THEME_TOKENS } from "./theme.js";
import { S, closeSheet } from "./core.js";
import { late } from "./late.js";
import { REL_AD_REQUEST } from "./release.js";

export const isNative = Capacitor.isNativePlatform();
export const AD_FREE_ID = "adfree"; // mağazada tanımlanacak tek seferlik ürün kimliği

/* ---- Kayıt yansısı ---- */
if (isNative) Bus.on("save:write", (k, data) => Preferences.set({ key: k, value: data }).catch(() => {}));
/** Yerel depodaki kayıt yuvaları (storageRestore bunları da karşılaştırır). */
export const nativeAll = isNative
  ? async () => {
      const out = {};
      const { keys } = await Preferences.keys();
      for (const k of keys.filter(k => /^pota-slot-\d$/.test(k))) out[k] = (await Preferences.get({ key: k })).value;
      return out;
    }
  : null;

/* ---- Dosya paylaşımı ---- */
export const nativeShareFile = isNative
  ? async (name, data, title) => {
      const r = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title, url: r.uri, dialogTitle: title }).catch(() => {});
      return true;
    }
  : null;

// Görsel paylaşımı (kariyer kartı): base64 PNG önbelleğe yazılır, paylaşım menüsü açılır
export const nativeShareImage = isNative
  ? async (name, base64, title) => {
      const r = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
      await Share.share({ title, url: r.uri, dialogTitle: title }).catch(() => {});
      return true;
    }
  : null;

// Metin paylaşımı (Günün Maçı sonucu)
export const nativeShareText = isNative
  ? async (text, title) => {
      await Share.share({ title, text, dialogTitle: title }).catch(() => {});
      return true;
    }
  : null;

/* ---- Geri tuşu ---- */
/** Geri tuşunun yaptığı iş (web testleri de çağırır). Dönen değer: ne yapıldığı. */
export function nativeBack() {
  if ($("#adov")) return "ad"; // reklam ekranı kendi butonuyla kapanır
  const x = $("#shx");
  if (x) return (x.click(), "close"); // kapatılabilir panel
  if ($("#ovl").innerHTML.trim()) return "locked"; // zorunlu seçim paneli: geri tuşu yok sayılır
  // emekli kariyer: harita (oynanabilir hafta) yerine kariyer sonu ekranına dön; oradaysa uygulamayı küçült
  if (S && S.retired) return $("#nw") ? "min" : (late.retireScreen(), "retire");
  if (S && !$("#gostad") && !$("#mview")) return (late.renderMain(), "main"); // alt ekrandan haritaya dön
  return "min";
}
if (isNative) {
  App.addListener("backButton", () => {
    if (nativeBack() === "min") App.minimizeApp();
  });
  // uygulama arka plana alınırken kaydet
  App.addListener("pause", () => S && late.save());
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: THEME_TOKENS["--bg"] }).catch(() => {});
}

/* ---- AdMob ----
   Sıra (Google UMP kuralı): 1) rıza bilgisi 2) gerekiyorsa Google rıza formu (AB/UK) 3) iOS'ta App Tracking
   Transparency istemi 4) yalnızca canRequestAds ise AdMob başlatılır. adsReady çözülmeden reklam istenmez (src/ads.js).
   Oyun içi kişiselleştirme izni (src/ads.js adsConsent) ayrıca ilk reklamdan önce sorulur; analitik yalnızca o izinle. */
if (isNative) {
  const adsReady = (async () => {
    try {
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === "REQUIRED") info = await AdMob.showConsentForm();
      window.PotaNative.privacyOptionsRequired = info.privacyOptionsRequirementStatus === "REQUIRED";
      if (info.canRequestAds === false) return false;
      if (Capacitor.getPlatform() === "ios") {
        const at = await AdMob.trackingAuthorizationStatus().catch(() => null);
        if (at && at.status === "notDetermined") await AdMob.requestTrackingAuthorization().catch(() => {});
      }
      await AdMob.initialize({ ...REL_AD_REQUEST, initializeForTesting: false });
      return true;
    } catch (e) {
      return false; /* reklam katmanı kullanılamıyor: oyun reklamsız devam eder */
    }
  })();
  window.PotaNative = {
    AdMob,
    adsReady,
    privacyOptionsRequired: false,
    // Ayarlar → Reklam gizlilik seçenekleri (UMP zorunlu kılar: rıza her zaman geri alınabilmeli)
    privacyOptions: () => AdMob.showPrivacyOptionsForm(),
    // Ayarlar → Bütün verilerimi sil: yerel depodaki kayıt yansıları
    clearPrefs: () => Preferences.clear().catch(() => {})
  };
}

/* ---- Uygulama içi satın alma: reklamsız paket ---- */
function initStore() {
  const C = window.CdvPurchase;
  if (!C) return;
  const { store, ProductType, Platform } = C;
  const platform = Capacitor.getPlatform() === "ios" ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
  store.register([{ id: AD_FREE_ID, type: ProductType.NON_CONSUMABLE, platform }]);
  const grant = () => {
    if (store.owned(AD_FREE_ID) && !late.ADS.adFree) {
      late.ADS.adFree = true;
      late.adsSave();
    }
  };
  store
    .when()
    .approved(tr => tr.verify())
    .verified(rc => rc.finish())
    .finished(grant)
    .productUpdated(grant)
    // bekleyen ödeme (ör. nakit/havale ile Play ödemesi): tamamlanınca approved → finished yoluyla otomatik açılır
    .pending(() => late.toast($t("rel.iapPending")));
  store.initialize([platform]).then(grant);
  window.PotaStore = {
    buy: id =>
      new Promise((resolve, reject) => {
        const p = store.get(id, platform),
          offer = p && p.getOffer();
        if (!offer) return reject(new Error($t("native.2")));
        let n = 0;
        const timer = setInterval(() => {
          if (store.owned(id)) {
            clearInterval(timer);
            grant();
            resolve(true);
          } else if (++n > 240) {
            // 2 dakikada tamamlanmadı: ödeme beklemede; sonuç gelince grant() otomatik çalışır
            clearInterval(timer);
            resolve("pending");
          }
        }, 500);
        offer.order().then(err => {
          if (err) {
            clearInterval(timer);
            err.code === C.ErrorCode.PAYMENT_CANCELLED ? resolve(false) : reject(err);
          }
        });
      }),
    // App Store zorunluluğu: "Satın alımları geri yükle" (Ayarlar → Gizlilik ve verilerin; src/release.js)
    restore: () =>
      store.restorePurchases().then(() => {
        grant();
        return store.owned(AD_FREE_ID);
      }),
    // mağazanın yerelleştirilmiş fiyatı (ör. "₺49,99", "$1.99")
    price: id => {
      const p = store.get(id, platform);
      return (p && p.pricing && p.pricing.price) || "";
    }
  };
}
if (isNative) document.addEventListener("deviceready", initStore, false);
