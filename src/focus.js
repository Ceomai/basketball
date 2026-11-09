/* ================= ODAK MODU =================
   Ayarlar'dan yan sistemler tek tek kapatılabilir: borsa/yatırım, hipodrom, oyun kulübü (kumarhane), gece ligi,
   hikâye olayları, stüdyo/içerik. Kapalı sistemin harita mekânı "kapalı" görünür (dokununca açma kısayolu),
   haftalık panelleri ve olayları çıkmaz, görevler ve başarımlar onu istemez.
   Ayar cihaz düzeyindedir (SETTINGS.off); varsayılan: hepsi açık (eski davranış).
   Kademeli açılışla (src/unlock.js) uyumludur: unlocked(k) kapalı sistem için false döner, yani "henüz açılmadı" ile
   "oyuncu kapattı" aynı yoldan geçer. Ekonomi hesapları (hisse fiyatları, kira, kanal geliri) sessizce sürer;
   sistem yeniden açılınca kaldığı yerden devam eder. */
import { t as $t } from "./i18n/index.js";
import { $, $$ } from "./data.js";
import { SETTINGS, saveSettings } from "./systems.js";
import { closeSheet, sheet } from "./core.js";
import { late } from "./late.js";

/** Kapatılabilen sistemler */
export const FOCUS_SYS = ["borsa", "hipodrom", "kumar", "geceligi", "hikaye", "studyo"];
// harita mekânı → sistem
const LOC_SYS = { borsa: "borsa", hipodrom: "hipodrom", sans: "kumar", studyo: "studyo" };
// başarım → sistem (kapalıyken listede görünmez, toplamdan düşer)
const FEAT_SYS = { streetking: "geceligi", studio5: "studyo", live: "studyo", investor: "borsa" };

// Mağaza derlemesi seçeneği: VITE_GAMBLING=off ile kumarhane ve hipodrom bahsi tamamen kapalı derlenir (ayarda da
// görünmez). App Store yaş derecelendirmesini düşürmek için (docs/YAYIN_KONTROL.md → Kumar). Varsayılan: açık.
const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};
export const FOCUS_HARD_OFF = ENV.VITE_GAMBLING === "off" ? ["kumar", "hipodrom"] : [];
/** Sistem oyuncu tarafından kapatıldı mı? (kademeli açılıştan bağımsız) */
export const focusOff = k => FOCUS_HARD_OFF.includes(k) || !!(SETTINGS.off && SETTINGS.off[k]);
/** Harita mekânı odak modunda kapalı mı? */
export const focusLocOff = id => !!LOC_SYS[id] && focusOff(LOC_SYS[id]);
/** Başarım kapalı bir sisteme mi bağlı? */
export const focusFeatOff = id => !!FEAT_SYS[id] && focusOff(FEAT_SYS[id]);
/** Kapalı sayısı (ayarlar başlığı) */
export const focusCount = () => FOCUS_SYS.filter(focusOff).length;

export function focusSet(k, off) {
  SETTINGS.off = Object.assign({}, SETTINGS.off);
  if (off) SETTINGS.off[k] = true;
  else delete SETTINGS.off[k];
  saveSettings();
}

/** Ayarlar paneli bölümü */
export const focusSettingsHTML = () =>
  `<div class="eyebrow mt-1">${$t("fo.title")}${focusCount() ? ` · ${$t("fo.offN", { n: focusCount() })}` : ""}</div>
   <p class="small muted">${$t("fo.sub")}</p>
   ${FOCUS_SYS.filter(k => !FOCUS_HARD_OFF.includes(k))
     .map(
       k =>
         `<div class="act"><div><h3>${$t(`fo.s.${k}`)}</h3><p>${$t(`fo.s.${k}D`)}</p></div><button class="btn ${focusOff(k) ? "ghost" : "team"} sm" data-fo="${k}" aria-pressed="${!focusOff(k)}">${focusOff(k) ? $t("btn.off") : $t("btn.on")}</button></div>`
     )
     .join("")}`;
export function bindFocusSettings(re) {
  $$("[data-fo]").forEach(
    b =>
      (b.onclick = () => {
        focusSet(b.dataset.fo, !focusOff(b.dataset.fo));
        re();
      })
  );
}

/** Kapalı mekâna dokunulunca: kısa açıklama ve tek dokunuşla açma */
export function focusLocSheet(id, I) {
  const k = LOC_SYS[id];
  if (FOCUS_HARD_OFF.includes(k)) return late.renderMain(); // derlemede kapalı: açma kısayolu yok
  sheet(
    I.n,
    $t("fo.locSub"),
    `<div class="say muted">${$t("fo.locD", { n: $t(`fo.s.${k}`) })}</div><div class="grid2"><button class="btn ghost" id="fo-no">${$t("fo.keep")}</button><button class="btn pri" id="fo-on">${$t("fo.turnOn")}</button></div>`
  );
  $("#fo-no").onclick = () => (closeSheet(), late.renderMain());
  $("#fo-on").onclick = () => {
    focusSet(k, false);
    closeSheet();
    late.openLoc(id);
  };
}
