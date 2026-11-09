/* ================= HAREKET VE DOKUNSAL GERİ BİLDİRİM =================
   Animasyon ilkeleri (index.html :root --dur-*, --ease-*): 150–350 ms, yay benzeri eğri, yalnız transform/opacity,
   kesilebilir (aynı öğede yeni animasyon öncekini iptal eder). "Hareketi azalt" (prefers-reduced-motion) ve oyun içi
   düşük grafik (Ayarlar → lowfx, body.lowfx) açıksa süs animasyonları çalışmaz; işlevsel zamanlayıcılar (süre
   çubukları, mini oyunlar) her durumda çalışır.
   Dokunsal: uygulamada @capacitor/haptics (iOS Taptic, Android titreşim motoru), web'de navigator.vibrate desenleri.
   Ayarlar → Titreşim kapalıysa hiçbiri çalışmaz. */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { late } from "./late.js";

/** Zamanlama token'ları (index.html :root ile aynı değerler; WAAPI için) */
export const MOTION = {
  fast: 150,
  med: 240,
  slow: 350,
  out: "cubic-bezier(.2,.8,.2,1)",
  spring: "cubic-bezier(.32,.72,0,1)"
};
/** Sistem "hareketi azalt" tercihi */
export function prefersReduce() {
  try {
    return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    return false;
  }
}
/** Süs animasyonu kapalı mı: hareketi azalt ya da düşük grafik modu */
export function motionReduced() {
  if (prefersReduce()) return true;
  try {
    if (late.SETTINGS && late.SETTINGS.lowfx) return true;
    return !!(document.body && document.body.classList.contains("lowfx"));
  } catch (e) {
    return false;
  }
}
/** scrollIntoView / scrollTo için davranış: azaltılmış harekette anında */
export const scrollMode = () => (motionReduced() ? "auto" : "smooth");

const RUN = new WeakMap();
/**
 * Kesilebilir WAAPI animasyonu: aynı öğe + anahtar için çalışan önceki animasyon iptal edilir (yeni durum devralır).
 * Azaltılmış harekette (functional değilse) çalışmaz ve null döner. o.functional: süre çubuğu gibi işlevsel animasyon
 * (her durumda çalışır).
 */
export function motionPlay(el, frames, o = {}) {
  if (!el || typeof el.animate !== "function") return null;
  if (!o.functional && motionReduced()) return null;
  const key = o.key || "m";
  let m = RUN.get(el);
  if (!m) RUN.set(el, (m = {}));
  if (m[key]) m[key].cancel();
  const a = el.animate(frames, { duration: MOTION.med, easing: MOTION.out, fill: "none", ...o.opts });
  m[key] = a;
  a.onfinish = () => {
    if (m[key] === a) delete m[key];
  };
  return a;
}
/** Hata geri bildirimi: kısa yatay sarsıntı (azaltılmış harekette yok) */
export function motionShake(el) {
  return motionPlay(
    el,
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-5px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(-2px)" },
      { transform: "translateX(0)" }
    ],
    { key: "shake", opts: { duration: 260, easing: "ease-out" } }
  );
}

/* ---------- dokunsal ---------- */
const NATIVE = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
})();
const hapOn = () => !late.SETTINGS || late.SETTINGS.haptic !== false;
const vib = p => {
  try {
    if (navigator.vibrate) navigator.vibrate(p);
  } catch (e) {
    /* desteklenmiyor */
  }
};
const nat = f => {
  try {
    const r = f();
    if (r && r.catch) r.catch(() => {});
  } catch (e) {
    /* eklenti yok */
  }
};
/** Hafif dokunuş (düğme, isabetsiz atış, mağlubiyet) */
export function hapticTap() {
  if (!hapOn()) return;
  if (NATIVE) nat(() => Haptics.impact({ style: ImpactStyle.Light }));
  else vib(10);
}
/** Başarı (galibiyet, isabet, kupa/başarım) */
export function hapticSuccess() {
  if (!hapOn()) return;
  if (NATIVE) nat(() => Haptics.notification({ type: NotificationType.Success }));
  else vib([14, 70, 28]);
}
/** Uyarı (mola, son dakika) */
export function hapticWarn() {
  if (!hapOn()) return;
  if (NATIVE) nat(() => Haptics.notification({ type: NotificationType.Warning }));
  else vib([30, 80, 30]);
}
/** Hata (yetersiz bakiye, kapalı düğme) */
export function hapticError() {
  if (!hapOn()) return;
  if (NATIVE) nat(() => Haptics.notification({ type: NotificationType.Error }));
  else vib([20, 50, 20, 50, 20]);
}
/** Süreye göre darbe (mini oyun içi temaslar; eski buzz(ms) çağrıları) */
export function hapticPulse(ms) {
  if (!hapOn()) return;
  if (NATIVE) nat(() => Haptics.impact({ style: ms >= 25 ? ImpactStyle.Heavy : ms >= 12 ? ImpactStyle.Medium : ImpactStyle.Light }));
  else vib(ms);
}

/* Kapalı düğmeye basış: hata titreşimi + kısa sarsıntı (tıklama olayı kapalı düğmede gelmez; pointerdown gelir) */
try {
  document.addEventListener(
    "pointerdown",
    e => {
      const t = e.target && e.target.closest ? e.target.closest(".btn:disabled,.opt:disabled,.choice:disabled,.btn[aria-disabled=true]") : null;
      if (!t || t.getAttribute("aria-busy") === "true") return;
      hapticError();
      motionShake(t);
    },
    true
  );
} catch (e) {
  /* DOM yok */
}
