import { t as $t } from "./i18n/index.js";
/* ================= BULUT KAYIT (Google ile giriş + Firebase) =================
   Telefon değişince kariyer kaybolmasın. Firebase SDK eklemeden REST arayüzleriyle çalışır (dosya boyutu büyümez).
   Akış: Google ile giriş → Google kimlik belirteci → Firebase Auth (signInWithIdp) → Firestore'da
   saves/{kullanıcı}/slots/{yuva} belgesi. Her kayıtta 20 sn gecikmeli yükleme; uygulama arka plana alınınca hemen.
   Çakışma: her yuvada daha yeni olan (ts) kazanır; buluttaki daha yeniyse oyuncuya sorulur.
   ETKİNLEŞTİRMEK İÇİN (docs/STORE.md → "Bulut kayıt"):
   1. Firebase projesi aç, Authentication → Google sağlayıcısını aç, Firestore oluştur.
   2. Aşağıdaki CLOUD_CONFIG'e apiKey, projectId ve Google OAuth web istemci kimliğini yaz.
   3. Firestore kuralları: match /saves/{uid}/slots/{slot} { allow read, write: if request.auth.uid == uid; }
   4. Android uygulamasında Google girişi için yerel eklenti gerekir (WebView'de Google girişi engellenir):
      window.PotaNative.googleIdToken() bir kimlik belirteci döndürmeli (docs/STORE.md). */
import { $, Bus } from "./data.js";
import { S, sheet, closeSheet } from "./core.js";
import { late } from "./late.js";
import { syncDecision } from "./logic/sync.js";

export const CLOUD_CONFIG = { apiKey: "", projectId: "", googleClientId: "" };
export const cloudReady = () => !!(CLOUD_CONFIG.apiKey && CLOUD_CONFIG.projectId);
const KEY = "pota-cloud";
const st = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch (e) {
    return {};
  }
})();
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
  } catch (e) {
    /* depolama yok */
  }
};

export { syncDecision };

/* ---- Kimlik ---- */
async function googleIdToken() {
  if (window.PotaNative && window.PotaNative.googleIdToken) return window.PotaNative.googleIdToken();
  // web: Google Identity Services
  await new Promise((res, rej) => {
    if (window.google && window.google.accounts) return res();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return new Promise((res, rej) => {
    window.google.accounts.id.initialize({
      client_id: CLOUD_CONFIG.googleClientId,
      callback: r => (r.credential ? res(r.credential) : rej(new Error($t("cloud.signCanceled"))))
    });
    window.google.accounts.id.prompt(n => n.isNotDisplayed && n.isNotDisplayed() && rej(new Error($t("cloud.googleSignNot"))));
  });
}
async function firebaseSignIn(idToken) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${CLOUD_CONFIG.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody: `id_token=${idToken}&providerId=google.com`,
      requestUri: location.origin || "http://localhost",
      returnSecureToken: true
    })
  });
  const j = await r.json();
  if (!j.idToken) throw new Error((j.error && j.error.message) || $t("cloud.firebaseSignFailed"));
  Object.assign(st, {
    uid: j.localId,
    email: j.email,
    idToken: j.idToken,
    refreshToken: j.refreshToken,
    exp: Date.now() + (+j.expiresIn - 60) * 1000
  });
  persist();
}
async function token() {
  if (st.idToken && Date.now() < st.exp) return st.idToken;
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${CLOUD_CONFIG.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${st.refreshToken}`
  });
  const j = await r.json();
  if (!j.id_token) throw new Error($t("cloud.sessionNotRefreshed"));
  Object.assign(st, { idToken: j.id_token, refreshToken: j.refresh_token, exp: Date.now() + (+j.expires_in - 60) * 1000 });
  persist();
  return st.idToken;
}
export const signedIn = () => !!(st.uid && st.refreshToken);
export async function signIn() {
  await firebaseSignIn(await googleIdToken());
  await syncAll();
}
export function signOut() {
  for (const k of ["uid", "email", "idToken", "refreshToken", "exp", "last"]) delete st[k];
  persist();
}

/** Hesap ve veri silme (Google Play hesap silme politikası): buluttaki bütün kayıt yuvaları ve Firebase hesabı silinir.
    Web bağlantısı: public/delete-data.html. Cihazdaki kayıtlara dokunmaz (onları Ayarlar → Bütün verilerimi sil siler). */
export async function cloudDeleteAll() {
  if (!cloudReady() || !signedIn()) return false;
  const auth = { Authorization: `Bearer ${await token()}` };
  for (let i = 1; i <= 5; i++) {
    const r = await fetch(docURL(i), { method: "DELETE", headers: auth });
    if (!r.ok && r.status !== 404) throw new Error($t("cloud.delFail"));
  }
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${CLOUD_CONFIG.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: await token() })
  });
  if (!r.ok) throw new Error($t("cloud.delFail"));
  signOut();
  return true;
}

/* ---- Firestore ---- */
const docURL = slot =>
  `https://firestore.googleapis.com/v1/projects/${CLOUD_CONFIG.projectId}/databases/(default)/documents/saves/${st.uid}/slots/${slot}`;
async function pull(slot) {
  const r = await fetch(docURL(slot), { headers: { Authorization: `Bearer ${await token()}` } });
  if (r.status === 404) return null;
  const j = await r.json();
  return j.fields ? { ts: +j.fields.ts.integerValue, data: j.fields.data.stringValue } : null;
}
async function push(slot, data, ts) {
  await fetch(docURL(slot), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { ts: { integerValue: String(ts) }, data: { stringValue: data } } })
  });
  st.last = Date.now();
  persist();
}
function localSlot(i) {
  try {
    const raw = localStorage.getItem(`pota-slot-${i}`);
    return raw ? { raw, ts: JSON.parse(raw).ts || 0 } : null;
  } catch (e) {
    return null;
  }
}
/** Bütün yuvaları eşitle */
export async function syncAll() {
  if (!cloudReady() || !signedIn()) return;
  for (let i = 1; i <= 5; i++) {
    const loc = localSlot(i),
      rem = await pull(i),
      d = syncDecision(loc, rem);
    if (d === "upload") await push(i, loc.raw, loc.ts);
    else if (d === "download" || (d === "ask" && (await askNewer(i, rem.ts))))
      try {
        localStorage.setItem(`pota-slot-${i}`, rem.data);
      } catch (e) {
        late.SAVE_MEM[`pota-slot-${i}`] = rem.data; // hafıza dolu: bu oturumda buluttaki kopyayla açılır (src/save.js)
      }
  }
}
function askNewer(slot, ts) {
  return new Promise(res => {
    sheet(
      $t("cloud.cloudSaveNewer"),
      $t("cloud.slot", {
        slot: slot
      }),
      `<p>${$t("cloud.cloudSaveSlot")}${new Date(ts).toLocaleString()}${$t("cloud.newerOneDevice")}</p><div class="grid2"><button class="btn ghost" id="cl-keep">${$t("cloud.device")}</button><button class="btn pri" id="cl-take">${$t("cloud.cloud")}</button></div>`,
      { noClose: true }
    );
    $("#cl-keep").onclick = () => (closeSheet(), res(false));
    $("#cl-take").onclick = () => (closeSheet(), res(true));
  });
}
// kayıtlar arka planda buluta (20 sn gecikmeli; sık kayıtlarda tek yükleme)
let timer = null;
Bus.on("save:write", k => {
  if (!cloudReady() || !signedIn()) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const i = +String(k).split("-").pop(),
      loc = localSlot(i);
    if (loc) push(i, loc.raw, loc.ts).catch(() => {});
  }, 20000);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && timer && S && S.saveSlot) {
    clearTimeout(timer);
    const loc = localSlot(S.saveSlot);
    if (loc) push(S.saveSlot, loc.raw, loc.ts).catch(() => {});
  }
});

/* ---- Ayarlar bölümü ---- */
export function cloudSettingsHTML() {
  if (!cloudReady()) return `<div class="act"><div><h3>${$t("cloud.cloudSave")}</h3><p>${$t("cloud.comingSoonBack")}</p></div></div>`;
  return `<div class="act"><div><h3>${$t("cloud.cloudSave")}</h3><p>${signedIn() ? `${$t("cloud.signed")} ${st.email || $t("cloud.googleAccount")}${st.last ? ` ${$t("cloud.lastSync")} ${new Date(st.last).toLocaleTimeString()}` : ""}` : $t("cloud.signGoogleAccount")}</p></div><div class="grid2 span-all">${signedIn() ? `<button class="btn sm" id="cl-sync">${$t("cloud.syncNow")}</button><button class="btn ghost sm" id="cl-out">${$t("cloud.sign")}</button><button class="btn ghost sm span-all" id="cl-del">${$t("cloud.del")}</button>` : `<button class="btn team sm" id="cl-in">${$t("cloud.signGoogle")}</button>`}</div></div>`;
}
export function bindCloudSettings(re) {
  const b = (id, f) => {
    const e = $("#" + id);
    if (e)
      e.onclick = async () => {
        try {
          await f();
          late.toast($t("cloud.cloudSaveUpdated"));
        } catch (err) {
          late.toast($t("cloud.cloudSave2") + (err.message || "hata"));
        }
        re();
      };
  };
  b("cl-in", signIn);
  b("cl-sync", syncAll);
  b("cl-out", async () => signOut());
  // hesap silme: önce onay (geri alınamaz)
  const d = $("#cl-del");
  if (d)
    d.onclick = () => {
      sheet(
        $t("cloud.del"),
        $t("cloud.delSub"),
        `<div class="say bad">${$t("cloud.delWarn")}</div><div class="grid2"><button class="btn ghost" id="cd-no">${$t("rel.cancel")}</button><button class="btn pri" id="cd-yes">${$t("cloud.del")}</button></div>`
      );
      $("#cd-no").onclick = () => (closeSheet(), re());
      $("#cd-yes").onclick = async () => {
        try {
          await cloudDeleteAll();
          late.toast($t("cloud.delOk"));
        } catch (err) {
          late.toast($t("cloud.cloudSave2") + (err.message || ""));
        }
        closeSheet();
        re();
      };
    };
}
