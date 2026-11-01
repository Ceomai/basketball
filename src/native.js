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
import { S, closeSheet } from "./core.js";
import { late } from "./late.js";

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

/* ---- Geri tuşu ---- */
if (isNative) {
  App.addListener("backButton", () => {
    if ($("#adov")) return; // reklam ekranı kendi butonuyla kapanır
    const x = $("#shx");
    if (x) return x.click(); // kapatılabilir panel
    if ($("#ovl").innerHTML) return; // zorunlu seçim paneli: geri tuşu yok sayılır
    if (S && !$("#gostad") && !$("#mview")) return late.renderMain(); // alt ekrandan haritaya dön
    App.minimizeApp();
  });
  // uygulama arka plana alınırken kaydet
  App.addListener("pause", () => S && late.save());
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#090d15" }).catch(() => {});
}

/* ---- AdMob ---- */
if (isNative) {
  window.PotaNative = { AdMob };
  (async () => {
    try {
      await AdMob.initialize({});
      // Google'ın rıza formu: yalnızca gerekli bölgelerde (AB/İngiltere) gösterilir
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === "REQUIRED") await AdMob.showConsentForm();
    } catch (e) {
      /* reklam katmanı kullanılamıyor: oyun reklamsız devam eder */
    }
  })();
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
    .productUpdated(grant);
  store.initialize([platform]).then(grant);
  window.PotaStore = {
    buy: id =>
      new Promise((resolve, reject) => {
        const p = store.get(id, platform),
          offer = p && p.getOffer();
        if (!offer) return reject(new Error($t("native.2")));
        const timer = setInterval(() => {
          if (store.owned(id)) {
            clearInterval(timer);
            grant();
            resolve(true);
          }
        }, 500);
        offer.order().then(err => {
          if (err) {
            clearInterval(timer);
            err.code === C.ErrorCode.PAYMENT_CANCELLED ? resolve(false) : reject(err);
          }
        });
      }),
    restore: () => store.restorePurchases().then(grant)
  };
}
if (isNative) document.addEventListener("deviceready", initStore, false);
