import { t as $t } from "./i18n/index.js";
/* ================= BİLDİRİMLER (yalnızca uygulamada) =================
   Sunucu yok: uygulama arka plana alınırken cihazda yerel bildirim planlanır, açılınca hepsi iptal edilir.
   Kural: aynı anda en fazla bir bildirim planlı; Ayarlar'dan kapatılabilir. Öncelik sırası:
   1. Alınmamış görev ödülü varsa 3 saat sonra
   2. Açık görev varsa ertesi gün 19:00'da (görevler gece yarısı yenilenir)
   3. Her durumda 2 gün sonra "kariyerin seni bekliyor" */
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { S, fixture, teamByKey } from "./core.js";
import { late } from "./late.js";
import { Bus } from "./data.js";

const native = Capacitor.isNativePlatform();
const ID = 7001;
// İzin yalnızca KONTROL edilir: uygulama arka plana giderken sistem penceresi açmak (eski davranış) Android 13+'ta
// kötü deneyim ve reddedilme sebebiydi. İzin bağlamında istenir: 3. maçtan sonra bir kez ya da Ayarlar'da açınca.
async function permitted() {
  try {
    return (await LocalNotifications.checkPermissions()).display === "granted";
  } catch (e) {
    return false;
  }
}
const ASK_KEY = "pota-notif-asked";
/** Bildirim iznini iste (Android 13+ çalışma zamanı izni). force: Ayarlar'dan açıldı (daha önce sorulmuş olsa da). */
export async function notifyAsk(force = false) {
  if (!native || window.__SIM || late.SETTINGS.notify === false) return false;
  try {
    if (!force && localStorage.getItem(ASK_KEY)) return false;
    localStorage.setItem(ASK_KEY, "1");
  } catch (e) {
    /* depolama kapalı */
  }
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === "granted") return true;
    return (await LocalNotifications.requestPermissions()).display === "granted";
  } catch (e) {
    return false;
  }
}
// bağlam: oyuncu oyunu birkaç maç denedikten sonra (ilk açılışta izin penceresi yok)
let notifyGames = 0;
if (native)
  Bus.on("match:end", () => {
    if (++notifyGames >= 3) notifyAsk();
  });
/** Bir sonraki bildirimi seç (test edilebilir saf mantık).
    Oyunda enerji gerçek zamanla dolmaz (oyun haftasıyla dolar); bu yüzden yalnızca doğru olan şeyler hatırlatılır. */
export function nextNotification(state, now = new Date()) {
  if (!state) return null;
  if (state.claimable > 0)
    return {
      at: new Date(now.getTime() + 3 * 3600e3),
      title: $t("notify.1"),
      body: $t("notify.2", { c: state.claimable })
    };
  // dünden kalan hikâye anı (src/hooks.js): ertesi gün akşam
  if (state.hook) {
    const at = new Date(now);
    at.setDate(at.getDate() + 1);
    at.setHours(18, 30, 0, 0);
    return { at, title: $t("hk.notifyTitle"), body: state.hook };
  }
  if (state.openMissions > 0) {
    const at = new Date(now);
    at.setDate(at.getDate() + 1);
    at.setHours(19, 0, 0, 0);
    return { at, title: $t("notify.3"), body: $t("notify.4") };
  }
  return {
    at: new Date(now.getTime() + 2 * 24 * 3600e3),
    title: $t("notify.5"),
    body: state.next ? $t("notify.6", { next: state.next }) : $t("notify.7")
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
  const n = nextNotification({ claimable: late.claimable(), openMissions: late.openMissions(), next, hook: late.hookText() });
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
