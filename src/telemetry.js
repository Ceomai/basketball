import { LANG, t } from "./i18n/index.js";
/* ================= OYUN TESTİ KAYDI (telemetri) =================
   Amaç: gerçek oyuncuların oyunu nerede bıraktığını, hangi mini oyunda zorlandığını, maçları kendisi mi
   oynadığını ölçmek ve dengeyi bu veriyle ayarlamak.
   İlkeler:
   - Varsayılan KAPALI. Oyuncu "Oyun testi"ni açıkça onaylamadan hiçbir şey kaydedilmez.
     Test bağlantısı: adresin sonuna ?test=1 eklenirse onay ekranı bir kez gösterilir.
   - Kişisel veri yok: isim, cihaz kimliği ya da konum tutulmaz; rastgele bir test kimliği üretilir.
   - Kayıt cihazda kalır. Oyuncu "Raporu gönder" ile dosya olarak paylaşır; ENDPOINT tanımlıysa oraya da yollanır.
   Analiz: node tools/playtest-report.js <rapor dosyaları klasörü> */
import { $, $$, Bus, esc } from "./data.js";
import { S, closeSheet, sheet } from "./core.js";
import { late } from "./late.js";

// Raporların otomatik gideceği adres (ör. Google Apps Script web uygulaması). Boşsa yalnızca dosya paylaşılır.
export const TELEMETRY_ENDPOINT = "";
const KEY = "pota-telemetry",
  MAX = 5000;
export const TEL = (() => {
  try {
    return Object.assign(
      { id: "", consent: false, asked: false, events: [], fb: [] },
      JSON.parse(localStorage.getItem(KEY) || "{}")
    );
  } catch (e) {
    return { id: "", consent: false, asked: false, events: [], fb: [] };
  }
})();
let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(TEL));
    } catch (e) {
      TEL.events.splice(0, Math.floor(TEL.events.length / 3)); // yer yoksa en eski kayıtları at
    }
  }, 400);
}
const SESSION = { start: Date.now(), screen: "boot" };
const careerInfo = () => (S ? { s: S.season, w: S.week, st: S.stage, age: S.age } : {});
/** Bir olayı kaydet (yalnızca onay varsa). */
export function log(e, d = {}) {
  if (!TEL.consent || window.__SIM) return;
  TEL.events.push({ t: Date.now(), e, ...careerInfo(), ...d });
  if (TEL.events.length > MAX) TEL.events.splice(0, TEL.events.length - MAX);
  persist();
}
function newId() {
  const a = new Uint8Array(6);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 256));
  return [...a].map(x => x.toString(16).padStart(2, "0")).join("");
}
export function setConsent(on) {
  TEL.consent = !!on;
  TEL.asked = true;
  if (on && !TEL.id) TEL.id = newId();
  persist();
  if (on) log("consent", { lang: LANG });
}

/* ---- Olay bağlantıları ---- */
const screen = s => {
  SESSION.screen = s;
  log("screen", { s });
};
Bus.on("screen:main", () => screen("main"));
Bus.on("screen:slots", () => screen("slots"));
Bus.on("sheet:open", el => {
  const d = el && el.querySelector && el.querySelector(".sheet");
  if (d) screen("sheet:" + (d.getAttribute("aria-label") || "").slice(0, 40));
});
Bus.on("place:open", p => screen("place:" + p));
Bus.on("match:start", ctx => screen(ctx && ctx.auto ? "match:auto" : "match"));
Bus.on("arcade:start", k => screen("arcade:" + k));
Bus.on("career:start", d => log("career_start", d));
Bus.on("match:end", d => log("match", d));
Bus.on("minigame:end", d => {
  const ratio = d.shots ? d.made / d.shots : d.reps ? d.ok / d.reps : d.tries ? d.ok / d.tries : d.win != null ? +d.win : null;
  log("minigame", { k: d.kind, r: ratio == null ? null : +ratio.toFixed(2), sc: d.score ?? d.taps ?? null });
});
Bus.on("season:end", d => log("season_end", { champ: !!d.champ, avg: +late.seasonAvg().toFixed(2), ovr: late.ovr() }));
Bus.on("ad", d => log("ad", d));
for (const ev of ["role:change", "arc", "press", "event:show", "purchase", "housing", "ad:cap", "legacy"])
  Bus.on(ev, d => log(ev, d));
Bus.on("week:start", () => log("week"));
window.addEventListener("error", e =>
  log("error", {
    m: String(e.message).slice(0, 160),
    src:
      String(e.filename || "")
        .split("/")
        .pop() +
      ":" +
      e.lineno
  })
);
window.addEventListener("unhandledrejection", e =>
  log("error", { m: String(e.reason && e.reason.message ? e.reason.message : e.reason).slice(0, 160) })
);
// oturum başı/sonu: sekme gizlenince "bıraktığı yer" kaydedilir
log("session_start", {
  lang: LANG,
  native: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
  w: innerWidth,
  h: innerHeight
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    log("session_end", { dur: Math.round((Date.now() - SESSION.start) / 1000), last: SESSION.screen });
    try {
      localStorage.setItem(KEY, JSON.stringify(TEL));
    } catch (e) {
      /* dolu */
    }
    if (TEL.consent && TELEMETRY_ENDPOINT && navigator.sendBeacon)
      navigator.sendBeacon(TELEMETRY_ENDPOINT, JSON.stringify(reportData()));
  } else {
    SESSION.start = Date.now();
    log("session_start", { lang: LANG, resume: true });
  }
});

/* ---- Rapor ---- */
export function reportData() {
  return {
    v: 1,
    id: TEL.id,
    exported: new Date().toISOString(),
    lang: LANG,
    ua: navigator.userAgent.slice(0, 120),
    events: TEL.events,
    feedback: TEL.fb,
    errors: late.errorLog ? late.errorLog() : []
  };
}
export async function sendReport() {
  const data = JSON.stringify(reportData());
  let sent = false;
  if (TELEMETRY_ENDPOINT) {
    try {
      await fetch(TELEMETRY_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: data });
      sent = true;
    } catch (e) {
      sent = false;
    }
  }
  const name = `pota-test-${TEL.id || "anon"}-${new Date().toISOString().slice(0, 10)}${".json"}`;
  // uygulamada yerel paylaşım, web'de paylaş ya da indir
  if (late.nativeShareFile) {
    await late.nativeShareFile(name, data, t("test.shareTitle"));
    return true;
  }
  try {
    const file = new File([data], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: t("test.shareTitle") });
      return true;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return sent;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
  return true;
}

/* ---- Arayüz ---- */
export function consentSheet(after) {
  sheet(
    t("test.title"),
    t("test.sub"),
    `<p>${t("test.intro")}</p><div class="card"><div class="eyebrow">${t("test.whatTitle")}</div><p class="small">${t("test.what")}</p><div class="eyebrow">${t("test.notTitle")}</div><p class="small">${t("test.not")}</p></div>
     <div class="grid2"><button class="btn ghost" id="tc-no">${t("test.no")}</button><button class="btn pri" id="tc-yes">${t("test.yes")}</button></div>`,
    { noClose: true }
  );
  $("#tc-no").onclick = () => (setConsent(false), closeSheet(), after && after());
  $("#tc-yes").onclick = () => (setConsent(true), closeSheet(), after && after());
}
export function feedbackSheet(context = "") {
  let stars = 0;
  sheet(
    t("fb.title"),
    t("fb.sub"),
    `<div class="eyebrow">${t("fb.rate")}</div><div class="opts" id="fb-st">${[1, 2, 3, 4, 5].map(n => `<button class="opt" data-s="${n}">${"★".repeat(n)}</button>`).join("")}</div>
     <div class="eyebrow">${t("fb.text")}</div><textarea id="fb-tx" rows="4" maxlength="600" style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:10px;font-family:inherit" placeholder="${esc(t("fb.ph"))}"></textarea>
     <button class="btn pri" id="fb-go">${t("fb.send")}</button>`
  );
  $$("#fb-st [data-s]").forEach(
    b =>
      (b.onclick = () => {
        stars = +b.dataset.s;
        $$("#fb-st [data-s]").forEach(x => x.classList.toggle("on", +x.dataset.s === stars));
      })
  );
  $("#fb-go").onclick = () => {
    const text = $("#fb-tx").value.trim();
    if (!stars && !text) return;
    TEL.fb.push({ t: Date.now(), stars, text: text.slice(0, 600), ctx: context || SESSION.screen, ...careerInfo() });
    log("feedback", { stars });
    persist();
    closeSheet();
    late.toast(t("fb.thanks"));
    late.renderMain && S ? late.renderMain() : late.renderSlots();
  };
}
/** Ayarlar içindeki bölüm */
export function testSettingsHTML() {
  return `<div class="act"><div><h3>${t("test.title")}</h3><p>${TEL.consent ? t("test.onDesc", { n: TEL.events.length }) : t("test.offDesc")}</p></div><div class="grid2" style="grid-column:1/-1"><button class="btn ${TEL.consent ? "team" : "ghost"} sm" id="ts-tog">${TEL.consent ? t("btn.on") : t("btn.off")}</button>${TEL.consent ? `<button class="btn sm" id="ts-send">${t("test.send")}</button><button class="btn ghost sm" id="ts-fb">${t("fb.title")}</button><button class="btn ghost sm" id="ts-clear">${t("test.clear")}</button>` : ""}</div></div>`;
}
export function bindTestSettings(re) {
  const tg = $("#ts-tog");
  if (tg) tg.onclick = () => (TEL.consent ? (setConsent(false), re()) : consentSheet(re));
  const sd = $("#ts-send");
  if (sd) sd.onclick = async () => (await sendReport()) && late.toast(t("test.sent"));
  const fb = $("#ts-fb");
  if (fb) fb.onclick = () => feedbackSheet("settings");
  const cl = $("#ts-clear");
  if (cl)
    cl.onclick = () => {
      TEL.events = [];
      TEL.fb = [];
      persist();
      re();
    };
}
// Test modunda sezon sonunda kısa geri bildirim isteği
Bus.on("season:end", () => {
  if (TEL.consent) setTimeout(() => (TEL._askFb = true), 0);
});
Bus.on("screen:main", () => {
  if (TEL.consent && TEL._askFb) {
    TEL._askFb = false;
    setTimeout(() => !$("#ovl").innerHTML && feedbackSheet("season_end"), 300);
  }
});
// ?test=1 ile açılan test bağlantısı: onay bir kez sorulur
export function maybeAskConsent() {
  try {
    if (new URLSearchParams(location.search).get("test") === "1" && !TEL.asked) {
      consentSheet();
      return true;
    }
  } catch (e) {
    /* adres okunamadı */
  }
  return false;
}
