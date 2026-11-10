import { LOCALE, t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { $, $$, Bus, SIM, esc, toast, PRIO } from "./data.js";
import { icon, portrait } from "./art.js";
import { brandSave } from "./brand.js";
import { SAVE_V as SCHEMA_V, cleanStrings, normalizeSchema, upgradeSchema } from "./logic/saveSchema.js";
import { F, MY_LISE, S, app, closeSheet, renderCreate, setS, setTeamVars, sheet } from "./core.js";
/* ================= KAYIT SİSTEMİ =================
   5 kariyer yuvası. Her yazımda bir önceki sağlam kayıt yedeğe alınır; ana kayıt bozulursa yedekten açılır.
   Tarayıcı kaydı kapalıysa ya da depolama doluysa oyuncu uyarılır ve kayıt kodu ile ilerlemesini taşıyabilir. */
export const SLOT_N = 5,
  SAVE_V = SCHEMA_V,
  LEGACY_KEY = "pota-kariyeri-v3";
export { MIGRATIONS, cleanStrings } from "./logic/saveSchema.js";
// kayıt şeması: src/logic/saveSchema.js (DOM'suz); burada oyunun bağımlılıklarıyla bağlanır
export const upgradeSave = (s, from) => upgradeSchema(s, from, brandSave);
export const normalizeState = s => normalizeSchema(s, late.createState, MY_LISE);
export const slotKey = i => `pota-slot-${i}`;
export let storageOK = true,
  storageWarned = false;
try {
  const k = "__pota_test";
  localStorage.setItem(k, "1");
  localStorage.removeItem(k);
} catch (e) {
  storageOK = false;
}
/** Açılabilir kayıt: kimlik, kendi takım ve temel tablolar nesne türünde. Takımlar/fikstür/play-off tutarlılığı
    açılışta onarılır (src/core.js repairLeague); onarılamayan kayıt yedekten açılır (openSafe). */
export function validSave(o) {
  return !!(
    o &&
    typeof o === "object" &&
    o.first &&
    o.team &&
    typeof o.team === "object" &&
    typeof o.team.key === "string" &&
    o.st &&
    typeof o.st === "object" &&
    Array.isArray(o.league) &&
    o.rel &&
    typeof o.rel === "object" &&
    (o.teams == null || typeof o.teams === "object") &&
    (o.sched == null || Array.isArray(o.sched))
  );
}
/** Tarayıcı hafızasına sığmayan (QuotaExceededError) en yeni kayıtlar: bu oturumda yuvalar bunlardan açılır,
    böylece IndexedDB'deki yeni kopya eski localStorage kopyasıyla ezilmez. */
export const SAVE_MEM = {};
export function readKey(k) {
  try {
    const raw = SAVE_MEM[k] || localStorage.getItem(k);
    if (!raw) return null;
    const o = JSON.parse(raw);
    const s = o && o.v ? o.S : o;
    return validSave(s) ? upgradeSave(s, o.v || 3) : null;
  } catch (e) {
    return null;
  }
}
/* ---- Ertelenmiş yazım ----
   Ana ekran her çizildiğinde (panel kapanışı dahil) kayıt hemen yazılmaz: SAVE_DEBOUNCE ms içinde gelen
   çizimler tek yazıma iner (saveSoon). Sayfa gizlenince/kapanınca (visibilitychange, pagehide, uygulama pause)
   bekleyen yazım hemen yapılır; açık save() çağrıları her zaman anında yazar.
   İkinci kopyalar (IndexedDB, uygulamada yerel depo) MIRROR_DEBOUNCE ms ertelenir; localStorage senkron kalır. */
export const SAVE_DEBOUNCE = 400,
  MIRROR_DEBOUNCE = 1500;
let saveTimer = 0,
  mirrorTimer = 0;
const mirrorPending = {};
export function saveSoon() {
  if (!S || !S.saveSlot || SIM()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, SAVE_DEBOUNCE);
}
export function flushSave() {
  if (saveTimer) save();
  flushMirror();
}
export function flushMirror() {
  clearTimeout(mirrorTimer);
  mirrorTimer = 0;
  for (const k of Object.keys(mirrorPending)) {
    const data = mirrorPending[k];
    delete mirrorPending[k];
    idbPut(k, data);
    Bus.emit("save:write", k, data); // uygulamada yerel depoya da yansıtılır (native.js)
  }
}
/** Bekleyen yazımları at (cihaz verisi silinirken silinen kayıt geri yazılmasın: src/release.js) */
export function dropPendingSaves() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  clearTimeout(mirrorTimer);
  mirrorTimer = 0;
  for (const k of Object.keys(mirrorPending)) delete mirrorPending[k];
}
const mirror = (k, data) => {
  mirrorPending[k] = data;
  if (!mirrorTimer) mirrorTimer = setTimeout(flushMirror, MIRROR_DEBOUNCE);
};
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
  window.addEventListener("pagehide", flushSave);
}
/* Önceki ana kayıt yedeğe yalnız sağlamsa kopyalanır (bozuk ana kayıt sağlam -bak'ı ezmesin). Bu oturumda bizim
   yazdığımız kopya (LAST_WRITTEN, aynı dize) ayrıştırılmadan güvenilir; başka kaynaktan gelen (ilk kayıt, geri yükleme,
   dışarıdan değişmiş) kopya bir kez ayrıştırılıp validSave ile denetlenir. */
const LAST_WRITTEN = {};
const looksWhole = raw => raw.charCodeAt(0) === 123 && raw.charCodeAt(raw.length - 1) === 125; // "{" … "}"
export function prevIsSound(k, raw) {
  if (!raw || !looksWhole(raw)) return false;
  if (LAST_WRITTEN[k] === raw) return true;
  try {
    const o = JSON.parse(raw);
    return validSave(o && o.v ? o.S : o);
  } catch (e) {
    return false;
  }
}
export function save() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  if (!S || !S.saveSlot || SIM()) return;
  if (!storageOK) {
    if (!storageWarned) {
      storageWarned = true;
      toast($t("save.browserSavingOff"));
    }
    return;
  }
  const k = slotKey(S.saveSlot),
    data = JSON.stringify({ v: SAVE_V, ts: Date.now(), S });
  mirror(k, data);
  askPersist();
  const write = () => {
    const prev = localStorage.getItem(k);
    if (prevIsSound(k, prev)) localStorage.setItem(k + "-bak", prev);
    localStorage.setItem(k, data);
    LAST_WRITTEN[k] = data;
    delete SAVE_MEM[k];
  };
  try {
    write();
  } catch (e) {
    SAVE_MEM[k] = data; // bu oturumda en yeni kayıt kaybolmasın (yuva ekranından devam edilirse buradan açılır)
    // yer açmak için diğer yuvaların yedeklerini silip tekrar dene
    try {
      for (let i = 1; i <= SLOT_N; i++) if (i !== S.saveSlot) localStorage.removeItem(slotKey(i) + "-bak");
      write();
    } catch (e2) {
      if (!storageWarned) {
        storageWarned = true;
        toast($t("save.saveFailedBrowser"));
        saveWarnBar();
      }
    }
  }
}
/** Depolama dolu: kapatılana kadar ekranda kalan uyarı + kayıt kodu/yedek eylemi (bildirim birkaç saniyede kaybolur) */
export function saveWarnBar() {
  if (SIM() || document.getElementById("savewarn")) return;
  const d = document.createElement("div");
  d.id = "savewarn";
  d.setAttribute("role", "alert");
  d.innerHTML = `<div class="minw-0"><b>${esc($t("s32.save.title"))}</b><p class="small">${esc($t("save.saveFailedBrowser"))}</p><button class="btn gold sm" id="sw-bk">${esc($t("s32.save.act"))}</button></div><button class="x" id="sw-x" aria-label="${esc($t("a11y.close"))}">✕</button>`;
  document.body.appendChild(d);
  d.querySelector("#sw-bk").onclick = () => {
    if (S) exportSheet();
    else late.renderSlots();
  };
  d.querySelector("#sw-x").onclick = () => d.remove();
}
export function loadSlot(i) {
  const main = readKey(slotKey(i));
  if (main) {
    main.saveSlot = i;
    return { S: main, from: "main" };
  }
  const bak = readKey(slotKey(i) + "-bak");
  if (bak) {
    bak.saveSlot = i;
    return { S: bak, from: "backup" };
  }
  let corrupt = false;
  try {
    corrupt = !!localStorage.getItem(slotKey(i));
  } catch (e) {}
  return corrupt ? { S: null, from: "corrupt" } : null;
}
/** Yuvayı her kopyasından sil: tarayıcı hafızası, IndexedDB ve (uygulamada) yerel depo ("save:delete" → native.js).
    Silinecek yuvanın bekleyen yazımı atılır (silinen kayıt ikinci kopyalara geri yazılmasın); diğer yuvalarınki yazılır. */
export function deleteSlot(i) {
  const k = slotKey(i);
  if (saveTimer && S && S.saveSlot !== i) save();
  else {
    clearTimeout(saveTimer);
    saveTimer = 0;
  }
  delete mirrorPending[k];
  flushMirror();
  delete SAVE_MEM[k];
  delete LAST_WRITTEN[k];
  try {
    localStorage.removeItem(k);
    localStorage.removeItem(k + "-bak");
  } catch (e) {}
  idbDel(k);
  Bus.emit("save:delete", k);
}
export function migrateLegacy() {
  try {
    const old = readKey(LEGACY_KEY);
    if (old && !localStorage.getItem(slotKey(1))) {
      old.saveSlot = 1;
      localStorage.setItem(slotKey(1), JSON.stringify({ v: SAVE_V, ts: Date.now(), S: old }));
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch (e) {}
}
// kayıt kodu: cihazlar arası taşıma ve depolama kapalıyken yedek
export const encodeSave = s => btoa(unescape(encodeURIComponent(JSON.stringify({ v: SAVE_V, S: s }))));
export function decodeSave(code) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    const s = o.v ? o.S : o;
    return validSave(s) ? upgradeSave(s, o.v || 3) : null;
  } catch (e) {
    return null;
  }
}

/* ---- İkinci kopya: IndexedDB ----
   Her kayıt IndexedDB'ye de yazılır. Açılışta tarayıcı hafızasındaki kayıt eksik, bozuk ya da daha eskiyse
   IndexedDB'deki kopya geri yüklenir. (Telefon tarayıcısının site verisini tamamen silmesine karşı asıl çare
   oyunu ana ekrana kurmak ve yedek dosyası almaktır.) */
export const IDB = { db: null };
export function idbOpen() {
  return new Promise(res => {
    try {
      const r = indexedDB.open("pota-kariyeri", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("slots");
      r.onsuccess = () => {
        IDB.db = r.result;
        res(r.result);
      };
      r.onerror = r.onblocked = () => res(null);
    } catch (e) {
      res(null);
    }
  });
}
export function idbPut(k, v) {
  if (!IDB.db) return;
  try {
    IDB.db.transaction("slots", "readwrite").objectStore("slots").put(v, k);
  } catch (e) {}
}
export function idbDel(k) {
  if (!IDB.db) return;
  try {
    IDB.db.transaction("slots", "readwrite").objectStore("slots").delete(k);
  } catch (e) {}
}
export function idbAll() {
  return new Promise(res => {
    const out = {};
    if (!IDB.db) return res(out);
    try {
      const rq = IDB.db.transaction("slots").objectStore("slots").openCursor();
      rq.onsuccess = () => {
        const c = rq.result;
        if (c) {
          out[c.key] = c.value;
          c.continue();
        } else res(out);
      };
      rq.onerror = () => res(out);
    } catch (e) {
      res(out);
    }
  });
}
export const parseSave = raw => {
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (o && validSave(o.v ? o.S : o)) {
      cleanStrings(o);
      return o;
    }
    return null;
  } catch (e) {
    return null;
  }
};
/** Yerel depo (uygulamada Preferences) okuması açılışta zaman aşımına uğradıysa arka planda sürer (pending);
    yuva ekranı bu sırada, tarayıcı hafızasında hiç kayıt yoksa "Kayıtlar yükleniyor" gösterir. */
export const RESTORE = { pending: false };
export const NATIVE_WAIT = 4000;
/** Geç gelen yerel depo kopyası: yalnız eksik yuvalar geri yüklenir, mevcut (bu arada açılmış/başlatılmış) yuva ezilmez */
export function restoreLateNative(nat) {
  let n = 0;
  for (let i = 1; i <= SLOT_N; i++) {
    const k = slotKey(i);
    const o = parseSave(nat && nat[k]);
    if (!o || SAVE_MEM[k] || (S && S.saveSlot === i)) continue;
    try {
      if (localStorage.getItem(k)) continue;
      const raw = typeof nat[k] === "string" ? nat[k] : JSON.stringify(nat[k]);
      localStorage.setItem(k, raw);
      idbPut(k, raw);
      n++;
    } catch (e) {}
  }
  return n;
}
export async function storageRestore() {
  // Üç kaynak: tarayıcı hafızası, IndexedDB ve (uygulamada) yerel depo. Her yuva için en yeni geçerli kayıt kazanır.
  let all = {};
  if (window.indexedDB) {
    await Promise.race([idbOpen(), new Promise(r => setTimeout(r, 1500))]);
    all = await idbAll();
  }
  // yerel depo yanıt vermezse açılış takılmasın: NATIVE_WAIT sonra onsuz devam, okuma arka planda sürer
  let nat = {};
  if (late.nativeAll) {
    const rd = late.nativeAll().catch(() => ({}));
    const r = await Promise.race([rd, new Promise(res => setTimeout(() => res(null), NATIVE_WAIT))]);
    if (r) nat = r;
    else {
      RESTORE.pending = true;
      rd.then(v => {
        RESTORE.pending = false;
        const m = restoreLateNative(v);
        if (m) toast($t("save.careersRestoredBackup", { n: m }));
        // yuva ekranı açıksa (panel yokken) yeniden çiz: yüklenen kariyerler görünsün
        if (!S && $("#help0") && !$("#ovl").innerHTML.trim()) renderSlots();
      });
    }
  }
  let n = 0;
  for (let i = 1; i <= SLOT_N; i++) {
    const k = slotKey(i);
    let cur = null;
    try {
      cur = parseSave(localStorage.getItem(k));
    } catch (e) {}
    const cands = [
      [all[k], parseSave(all[k])],
      [nat[k], parseSave(nat[k])]
    ].filter(c => c[1]);
    const best = cands.sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))[0];
    if (best && (!cur || (best[1].ts || 0) > (cur.ts || 0))) {
      const raw = typeof best[0] === "string" ? best[0] : JSON.stringify(best[0]);
      try {
        localStorage.setItem(k, raw);
      } catch (e) {
        SAVE_MEM[k] = raw; // hafıza dolu: eski kopya açılmasın, IndexedDB'deki yeni kopyayla devam edilsin
      }
      n++;
    } else if (cur && all[k] !== undefined && (cur.ts || 0) > ((parseSave(all[k]) || {}).ts || 0))
      idbPut(k, localStorage.getItem(k));
  }
  if (n)
    setTimeout(
      () =>
        toast(
          $t("save.careersRestoredBackup", {
            n: n
          })
        ),
      600
    );
  return n;
}
// Tarayıcıdan "kalıcı depolama" izni iste: verilirse site verisi yer darlığında silinmez
export function askPersist() {
  if (askPersist.done) return;
  askPersist.done = 1;
  try {
    navigator.storage &&
      navigator.storage.persist &&
      navigator.storage
        .persisted()
        .then(p => p || navigator.storage.persist())
        .catch(() => {});
  } catch (e) {}
}
export const isInstalled = () => {
  try {
    return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  } catch (e) {
    return false;
  }
};

/* ---- Yedek dosyası ---- */
export const saveFileName = s =>
  `pota-kariyeri-${(s.first + "-" + s.last)
    .toLocaleLowerCase(LOCALE)
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9-]/g, "")}-${s.age}yas.pota`;
export function markBackup() {
  if (!S) return;
  S.bk = { season: S.season, week: S.week, ts: Date.now() };
  save();
}
export async function downloadSave() {
  if (late.nativeShareFile) {
    await late.nativeShareFile(saveFileName(S), encodeSave(S), $t("backup.potaKariyeriBackup"));
    markBackup();
    return;
  }
  const name = saveFileName(S),
    blob = new Blob([encodeSave(S)], { type: "text/plain" });
  try {
    const file = new File([blob], name, { type: "text/plain" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: $t("backup.potaKariyeriBackup") });
      markBackup();
      toast($t("backup.backupShared"));
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
  markBackup();
  toast($t("backup.backupFileDownloaded"));
}
export function readFileText(input) {
  return new Promise(res => {
    const f = input.files && input.files[0];
    if (!f) return res("");
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => res("");
    r.readAsText(f);
  });
}
export function importCode(code) {
  const s = decodeSave(code || "");
  if (!s) {
    toast($t("backup.couldntReadSave"));
    return false;
  }
  let free = 0;
  for (let i = 1; i <= SLOT_N; i++)
    if (!loadSlot(i)) {
      free = i;
      break;
    }
  if (!free) {
    toast($t("backup.noEmptySlots"));
    return false;
  }
  s.saveSlot = free;
  if (!late.openSafe(s, { noBak: true })) return false;
  save();
  toast(
    $t("backup.saveLoadedSlot", {
      free: free
    })
  );
  return true;
}
// Yedek hatırlatması: kurulu değilse 2 sezonda, kuruluysa 4 sezonda bir
export function backupNudge() {
  if (!S || SIM() || late.SETTINGS.backupNag === false || S.week !== 3 || S.phase !== "regular" || S.season < 2) return false;
  const gap = S.season - ((S.bk && S.bk.season) || 0);
  if (gap < (isInstalled() ? 4 : 2)) return false;
  sheet(
    $t("common.backCareer"),
    $t("backup.takesMinute"),
    `<div class="card"><div class="eyebrow">${$t("backup.why")}</div><p>${$t("backup.careerLivesDevices")}</p>${isInstalled() ? "" : `<p class="small muted">${$t("backup.safestWayAdd")}</p>`}</div>
   <button class="btn pri" id="bn-dl">${$t("backup.getBackupFile")}</button><div class="grid2"><button class="btn ghost" id="bn-later">${$t("backup.remindLater")}</button><button class="btn ghost" id="bn-off">${$t("backup.dontAskAgain")}</button></div>`
  );
  $("#bn-dl").onclick = async () => {
    await downloadSave();
    closeSheet();
  };
  $("#bn-later").onclick = () => {
    S.bk = { ...(S.bk || {}), season: S.season - 1 };
    save();
    closeSheet();
  };
  $("#bn-off").onclick = () => {
    late.SETTINGS.backupNag = false;
    late.saveSettings();
    closeSheet();
    toast($t("backup.reminderTurnedOff"));
  };
  return true;
}
Bus.offer("week:sheet", backupNudge, PRIO.backupNudge);

/* ================= KAYIT EKRANI ================= */
/** Yuva listesi: hiç kariyer yoksa tek büyük "Kariyere başla"; varsa kariyerler ve boş yuvalar tek satırda */
export function slotRowsHTML(rows) {
  const empty = rows.filter(([, r]) => !r).map(([i]) => i);
  const used = rows.filter(([, r]) => r);
  if (!used.length && empty.length)
    return `<button class="btn pri big" data-new="${empty[0]}">${$t("s32.slots.start")}</button>`;
  const cards = used.map(([i, r]) =>
    r.from === "corrupt"
      ? `<div class="act"><div class="ai">${icon("door")}</div><div><h3>${$t("slots.corrupt", { i })}</h3><p>${$t("slots.corruptDesc")}</p></div><button class="btn bad sm" data-del="${i}">${$t("slots.clear")}</button></div>`
      : `<div class="act"><div class="ai" data-pp="${i}"></div><div><h3>${esc(r.S.first + " " + r.S.last)}</h3><p>${slotSummary(r.S)}${r.from === "backup" ? ` · <span class="warn">${$t("slots.fromBackup")}</span>` : ""}</p></div><div class="grid2 span-all"><button class="btn ghost sm" data-del="${i}">${$t("btn.delete")}</button><button class="btn pri sm" data-go="${i}">${r.S.retired ? $t("btn.view") : $t("btn.continue")}</button></div></div>`
  );
  if (empty.length)
    cards.push(
      `<div class="act"><div class="ai">${icon("plus")}</div><div><h3>${$t("s32.slots.free", { v: empty.join(", ") })}</h3><p>${$t("slots.emptyDesc")}</p></div><button class="btn sm" data-new="${empty[0]}">${$t("btn.newCareer")}</button></div>`
    );
  return `<div class="choices">${cards.join("")}</div>`;
}
export function slotSummary(s) {
  return `${$t("save.slotAgeName", {
    age: s.age,
    name: esc(s.team.name)
  })} ${
    s.retired
      ? `${$t("save.retired")}${s.epilogue && late.EPILOGUES ? ` · ${esc((late.EPILOGUES.find(e => e.id === s.epilogue) || {}).n || "")}` : ""}`
      : `${s.year}–${String(s.year + 1).slice(2)} ${$t("save.season")}${s.heir ? ` · ${$t("slots.father", { v: esc(s.heir.parent) })}` : ""}${s.mode && s.mode !== "normal" && late.modeName ? ` · ${late.modeName(s.mode)}` : ""}`
  }`;
}
export function renderSlots() {
  if (S) save();
  setS(null);
  setTeamVars();
  closeSheet();
  window.scrollTo(0, 0);
  migrateLegacy();
  // önceki emekli kariyerler Efsaneler koleksiyonuna (src/legends.js); miras puanı o kariyerin durumuyla hesaplanır
  late.scanRetired(loadSlot, SLOT_N, st => {
    try {
      setS(st);
      return late.legacyScore();
    } catch (e) {
      return 0;
    } finally {
      setS(null);
    }
  });
  const rows = [];
  for (let i = 1; i <= SLOT_N; i++) rows.push([i, loadSlot(i)]);
  app.innerHTML = `<div class="row between nowrap pt-4h"><div><div class="eyebrow">${$t("app.tagline")}</div><h1>${$t("app.name")}</h1></div><div class="row gap-1h">${late.legendsButtonHTML()}<button class="btn ghost sm" id="help0">${$t("btn.guide")}</button></div></div>
   ${storageOK ? "" : `<div class="say bad">${$t("slots.storageOff")}</div>`}
   <div class="eyebrow">${$t("slots.header", { n: SLOT_N })}</div>
   ${RESTORE.pending && !rows.some(([, r]) => r) ? `<div class="say" id="slot-loading" role="status">${$t("s4.slots.loading")}</div>` : ""}
   ${slotRowsHTML(rows)}
   <div class="card"><div class="eyebrow">${$t("slots.codeTitle")}</div><p class="small muted">${$t("slots.codeDesc")}</p><textarea id="imp" rows="3" style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line-ctl);border-radius:var(--r-lg);padding:var(--sp-2h);font-family:monospace;font-size:16px" placeholder="${$t("slots.codePh")}" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><div class="grid2"><button class="btn ghost sm" id="pst">${$t("slots.paste")}</button><button class="btn sm" id="impb">${$t("slots.loadCode")}</button></div><label class="btn sm ta-c">${$t("slots.loadFile")}<input type="file" id="impf" accept=".pota,.txt,text/plain" hidden></label></div>
   ${isInstalled() ? "" : `<div class="card"><div class="eyebrow">${$t("slots.tip")}</div><p class="small">${$t("slots.tipInstall")}</p></div>`}`;
  rows.forEach(([i, r]) => {
    if (r && r.S) {
      const el = $(`[data-pp="${i}"]`);
      if (el) {
        el.innerHTML = "";
        el.appendChild(
          portrait(r.S.look, { jersey: r.S.team.c1, trim: r.S.team.c2, number: r.S.num, mood: "mutlu" }, 52, 52, r.S.team.c1)
        );
      }
    }
  });
  $$("[data-new]").forEach(
    b =>
      (b.onclick = () => {
        F.slot = +b.dataset.new;
        renderCreate();
      })
  );
  $$("[data-go]").forEach(
    b =>
      (b.onclick = () => {
        const r = loadSlot(+b.dataset.go);
        if (!r || !r.S) return;
        if (late.openSafe(r.S) && r.from === "backup") {
          save();
          toast($t("save.mainSaveCorrupted"));
        }
      })
  );
  $$("[data-del]").forEach(
    b =>
      (b.onclick = () => {
        const i = +b.dataset.del;
        sheet(
          $t("save.deleteSlot"),
          $t("save.slot", {
            i: i
          }),
          `<p>${$t("save.careerBackup")}</p><div class="grid2"><button class="btn ghost" id="n1">${$t("save.cancel")}</button><button class="btn bad" id="y1">${$t("save.delete")}</button></div>`,
          { onClose: renderSlots }
        );
        $("#n1").onclick = renderSlots;
        $("#y1").onclick = () => {
          deleteSlot(i);
          renderSlots();
        };
      })
  );
  $("#impb").onclick = () => importCode($("#imp").value);
  $("#impf").onchange = async e => {
    const t = await readFileText(e.target);
    e.target.value = "";
    importCode(t);
  };
  $("#pst").onclick = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) throw 0;
      $("#imp").value = t.trim();
      toast($t("save.codePastedNow"));
    } catch (e) {
      $("#imp").focus();
      toast($t("save.couldntReadClipboard"));
    }
  };
  $("#help0").onclick = () => late.guideSheet();
  $("#legb").onclick = () => late.legendsSheet(renderSlots);
  Bus.emit("screen:slots");
}
export function exportSheet() {
  const code = encodeSave(S);
  sheet(
    $t("backup.saveCode"),
    $t("backup.backupDeviceTransfer"),
    `<p class="small muted">${$t("backup.codeContainsEntire")}</p><textarea id="exp" rows="6" readonly style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line2);border-radius:var(--r-lg);padding:var(--sp-2h);font-family:monospace;font-size:var(--fs-2xs);-webkit-user-select:all;user-select:all">${code}</textarea><div class="grid2"><button class="btn" id="cpy">${$t("backup.copyCode")}</button><button class="btn pri" id="dlf">${$t("backup.saveFile")}</button></div>${S.bk && S.bk.ts ? `<p class="small muted">${$t("backup.lastBackup")} ${new Date(S.bk.ts).toLocaleDateString(LOCALE)}</p>` : ""}`
  );
  $("#dlf").onclick = () => downloadSave();
  $("#cpy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      markBackup();
      toast($t("backup.saveCodeCopied"));
    } catch (e) {
      const t = $("#exp");
      t.focus();
      t.select();
      toast($t("backup.codeSelectedLong"));
    }
  };
}
