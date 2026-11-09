/* ================= KADEMELİ AÇILIŞ =================
   Yeni oyuncu ilk sezonda yalnızca antrenman ve maçla başlar; diğer sistemler kariyer ilerledikçe açılır:
   - program (sezon antrenman programı) ve sistem (koçun oyun sistemi, uyum): profesyonel lige geçince
   - görevler (günlük/haftalık): ikinci sezonda
   - miras (vakıf, kulüp payı, Şöhretler Müzesi değerlendirmesi): 28 yaşında ya da emeklilikte
   Açılınca kısa bir panel çıkar. Eski kayıtlarda (S.unlocks yoksa) her şey zaten açık sayılır, bildirim çıkmaz. */
import { t as $t } from "./i18n/index.js";
import { $, Bus, isPro, toast } from "./data.js";
import { S, closeSheet, sheet } from "./core.js";
import { late } from "./late.js";

// yeni oyuncuyu bunaltmamak için: ilk haftalar sade, sistemler sırayla tanıtılır
const early = w => S.season >= 2 || S.week >= w;
const RULES = {
  program: () => isPro(S.stage),
  sistem: () => isPro(S.stage),
  gorev: () => S.season >= 2,
  miras: () => S.age >= 28 || !!S.retired,
  plan: () => early(3), // hafta planı ve özet (src/plan.js)
  basarim: () => early(3), // başarımlar (src/feats.js)
  tasarim: () => early(3), // ayakkabı, forma, kutlama, tema (src/custom.js)
  hikaye: () => early(5), // hikâye olayları (src/tales.js)
  geceligi: () => S.season >= 2 // gece sokak ligi (src/venues.js)
};
export const FEATURES = Object.keys(RULES);
/** Özellik açık mı (S yoksa açık sayılır). S.unlocks[k] === 2: zorla açık (testler, eski kayıtlar) */
export const unlocked = k =>
  (!S || !RULES[k] || RULES[k]() || (S.unlocks && S.unlocks[k] === 2)) && !(late.focusOff && late.focusOff(k)); // odak modu (src/focus.js)

const TXT = {
  plan: ["unl.plan", "unl.planD"],
  basarim: ["unl.basarim", "unl.basarimD"],
  tasarim: ["unl.tasarim", "unl.tasarimD"],
  hikaye: ["unl.hikaye", "unl.hikayeD"],
  geceligi: ["unl.geceligi", "unl.geceligiD"],
  program: ["unl.program", "unl.programD"],
  sistem: ["unl.sistem", "unl.sistemD"],
  gorev: ["unl.gorev", "unl.gorevD"],
  miras: ["unl.miras", "unl.mirasD"]
};
// yeni açılan özellik paneli (haftalık panel sırasında, hedeflerden hemen sonra)
function unlockSheet() {
  if (!S) return false;
  S.unlocks = S.unlocks || {};
  const fresh = FEATURES.filter(k => RULES[k]() && !S.unlocks[k] && !(late.focusOff && late.focusOff(k))); // kapatılan sistem tanıtılmaz
  // bu sürümden önce başlamış kariyerler: yeni sistemler ayrıca tanıtılmaz ("Yenilikler" kartı anlatır)
  if (S.season >= 2) for (const k of ["plan", "basarim", "tasarim", "hikaye", "geceligi"]) if (fresh.includes(k) && S.unlocks.program !== undefined) fresh.splice(fresh.indexOf(k), 1), (S.unlocks[k] = 1);
  if (!fresh.length) return false;
  for (const k of fresh) S.unlocks[k] = 1;
  if (window.__SIM) return false;
  // yalnız bilgi veren panel: zorunlu panel yerine kısa bildirim + ayrıntılar bildirim kutusunda (aşama 3.3).
  // Haftanın panel hakkını kullanır (true): diğer haftalık panellerin zamanlaması değişmez.
  for (const k of fresh.slice().reverse()) late.inboxAdd(`${$t(TXT[k][0])}: ${$t(TXT[k][1])}`, "news");
  toast(`${$t("unl.title")}: ${fresh.map(k => $t(TXT[k][0])).join(", ")}`);
  return true;
}
Bus.offer("week:sheet", unlockSheet, 6);

/* ---- Yenilikler: güncellemeden sonra bir kez, neyin değiştiğini kısaca anlatır ---- */
export const WHATSNEW = "2026.11b";
const WN_ITEMS = ["match", "life", "camp", "plan", "story"];
// yeni başlayan oyuncu için "yenilik" yoktur: kartı yalnızca eski kariyeri olanlar görür
Bus.on("career:start", () => {
  try {
    localStorage.setItem("pota-whatsnew", WHATSNEW);
  } catch (e) {
    /* depolama kapalı */
  }
});
Bus.on("screen:main", () => {
  if (!S || window.__SIM || (S.season < 2 && S.week <= 3)) return;
  let seen = "";
  try {
    seen = localStorage.getItem("pota-whatsnew") || "";
  } catch (e) {
    /* depolama kapalı */
  }
  if (seen === WHATSNEW) return;
  setTimeout(() => {
    if (document.querySelector(".sheet")) return; // başka bir panel açıksa sonraki ana ekranda
    try {
      localStorage.setItem("pota-whatsnew", WHATSNEW);
    } catch (e) {
      /* depolama kapalı */
    }
    sheet(
      $t("wn.title"),
      $t("wn.sub"),
      `${WN_ITEMS.map(k => `<div class="card"><b>${$t(`wn.${k}`)}</b><p class="small">${$t(`wn.${k}D`)}</p></div>`).join("")}<button class="btn pri" id="wn-ok">${$t("goal.ok")}</button>`
    );
    $("#wn-ok").onclick = () => closeSheet();
  }, 300);
});
