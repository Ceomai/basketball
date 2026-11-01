import { t as $t } from "./i18n/index.js";
/* ================= BİLDİRİMLER (yalnızca uygulamada) =================
   Sunucu yok: uygulama arka plana alınırken cihazda yerel bildirim planlanır, açılınca hepsi iptal edilir.
   Kural: aynı anda en fazla bir bildirim planlı; Ayarlar'dan kapatılabilir. Öncelik sırası:
   1. Enerji düşükse 6 saat sonra "enerjin doldu"
   2. Görev ödülü/açık görev varsa ertesi gün 19:00'da hatırlatma
   3. Her durumda 2 gün sonra "kariyerin seni bekliyor" */
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { S, fixture, teamByKey } from "./core.js";
import { late } from "./late.js";

const native = Capacitor.isNativePlatform();
const ID = 7001;
async function permitted() {
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === "granted") return true;
    if (p.display === "denied") return false;
    return (await LocalNotifications.requestPermissions()).display === "granted";
  } catch (e) {
    return false;
  }
}
/** Bir sonraki bildirimi seç (test edilebilir saf mantık) */
export function nextNotification(state, now = new Date()) {
  if (!state) return null;
  if (state.energy < 50)
    return {
      at: new Date(now.getTime() + 6 * 3600e3),
      title: $t("notify.1"),
      body: $t("notify.2")
    };
  if (state.openMissions > 0) {
    const at = new Date(now);
    at.setDate(at.getDate() + 1);
    at.setHours(19, 0, 0, 0);
    return { at, title: $t("notify.3"), body: $t("notify.4") };
  }
  return {
    at: new Date(now.getTime() + 2 * 24 * 3600e3),
    title: $t("notify.5"),
    body: state.next
      ? $t("notify.6", {
          next: state.next
        })
      : $t("notify.7")
  };
}
async function schedule() {
  if (!native || !S || late.SETTINGS.notify === false || !(await permitted())) return;
  let next = "";
  try {
    const fx = fixture();
    next = teamByKey(fx.opp).name;
  } catch (e) {
    /* takvim yok */
  }
  const n = nextNotification({ energy: S.energy, openMissions: late.openMissions ? late.openMissions() : 0, next });
  if (!n) return;
  await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {});
  await LocalNotifications.schedule({
    notifications: [{ id: ID, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true } }]
  }).catch(() => {});
}
if (native) {
  App.addListener("pause", schedule);
  App.addListener("resume", () => LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {}));
}
