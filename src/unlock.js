/* ================= KADEMELİ AÇILIŞ =================
   Yeni oyuncu ilk sezonda yalnızca antrenman ve maçla başlar; diğer sistemler kariyer ilerledikçe açılır:
   - program (sezon antrenman programı) ve sistem (koçun oyun sistemi, uyum): profesyonel lige geçince
   - görevler (günlük/haftalık): ikinci sezonda
   - miras (vakıf, kulüp payı, Şöhretler Müzesi değerlendirmesi): 28 yaşında ya da emeklilikte
   Açılınca kısa bir panel çıkar. Eski kayıtlarda (S.unlocks yoksa) her şey zaten açık sayılır, bildirim çıkmaz. */
import { t as $t } from "./i18n/index.js";
import { $, Bus, isPro } from "./data.js";
import { S, closeSheet, sheet } from "./core.js";

const RULES = {
  program: () => isPro(S.stage),
  sistem: () => isPro(S.stage),
  gorev: () => S.season >= 2,
  miras: () => S.age >= 28 || !!S.retired
};
export const FEATURES = Object.keys(RULES);
/** Özellik açık mı (S yoksa açık sayılır) */
export const unlocked = k => !S || !RULES[k] || RULES[k]();

const TXT = {
  program: ["unl.program", "unl.programD"],
  sistem: ["unl.sistem", "unl.sistemD"],
  gorev: ["unl.gorev", "unl.gorevD"],
  miras: ["unl.miras", "unl.mirasD"]
};
// yeni açılan özellik paneli (haftalık panel sırasında, hedeflerden hemen sonra)
function unlockSheet() {
  if (!S) return false;
  S.unlocks = S.unlocks || {};
  const fresh = FEATURES.filter(k => RULES[k]() && !S.unlocks[k]);
  if (!fresh.length) return false;
  for (const k of fresh) S.unlocks[k] = 1;
  if (window.__SIM) return false;
  sheet(
    $t("unl.title"),
    $t("unl.sub"),
    `${fresh.map(k => `<div class="card"><b>${$t(TXT[k][0])}</b><p class="small">${$t(TXT[k][1])}</p></div>`).join("")}<button class="btn pri" id="unl-ok">${$t("goal.ok")}</button>`,
    { noClose: true }
  );
  $("#unl-ok").onclick = () => closeSheet();
  return true;
}
Bus.offer("week:sheet", unlockSheet, 6);
