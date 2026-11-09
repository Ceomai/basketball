/* ================= KILAVUZ, İLK ADIMLAR VE MEKAN İPUÇLARI =================
   - Ana ekrandaki "Kılavuz" düğmesi: bütün oyunu anlatan sekmeli doküman (ilk adımlar, mekanlar, nitelikler,
     göstergeler, maç, kariyer ve kupalar, para, günlük ve reklamlar, kariyer sonu).
   - İlk hafta görev listesi (ilk sezonun ilk haftaları): antrenman yap, aileni ziyaret et, markete uğra, ilk maçını
     oyna. Hepsi bitince küçük bir ödül. Oyuncuyu sıkmadan ilerlemenin temelini gösterir.
   - Bir mekana ilk girişte üstte kısa bir not: orada ne yapılır, neye katkı verir. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, toast } from "./data.js";
import { S, norm, sheet, tabsHTML, tx } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const SECTIONS = ["start", "places", "stats", "meters", "match", "career", "style", "money", "daily", "end"];
export function fullGuide(i = 0) {
  const k = SECTIONS[Math.max(0, Math.min(SECTIONS.length - 1, i))];
  sheet(
    $t("gd.title"),
    $t(`gd.${k}.t`),
    `${tabsHTML(
      SECTIONS.map((s, j) => [String(j), $t(`gd.${s}.t`)]),
      String(SECTIONS.indexOf(k)),
      "gd"
    )}<div class="card gd">${$t(`gd.${k}.b`)}</div><div class="grid2"><button class="btn ghost" id="gd-prev" ${i <= 0 ? "disabled" : ""}>${$t("gd.prev")}</button><button class="btn pri" id="gd-next" ${i >= SECTIONS.length - 1 ? "disabled" : ""}>${$t("gd.next")}</button></div>`,
    { onClose: () => (S ? late.renderMain() : late.renderSlots()) } // yuvalar ekranından da açılır
  );
  $$("[data-gd]").forEach(b => (b.onclick = () => fullGuide(+b.dataset.gd)));
  $("#gd-prev").onclick = () => fullGuide(i - 1);
  $("#gd-next").onclick = () => fullGuide(i + 1);
}
export const guideButtonHTML = () => `<button class="btn ghost sm" id="gdb">${$t("gd.btn")}</button>`;

/* ---- İlk hafta görev listesi ---- */
const STEPS = ["train", "aile", "market", "match"];
const onb = () => (S.onb = S.onb || {});
export function onboardHTML() {
  if (!S || window.__SIM || S.season !== 1 || S.week > 5) return "";
  const o = onb();
  if (o.done || o.hide) return "";
  return `<div class="card" id="onb"><div class="row between"><div class="eyebrow">${$t("ob.title")}</div><button class="btn ghost sm" id="ob-x">${$t("ob.hide")}</button></div>${STEPS.map(
    s =>
      `<div class="row nowrap small" style="gap:var(--sp-2);padding:var(--sp-half) 0"><b class="${o[s] ? "good" : "muted"}">${o[s] ? "✓" : "○"}</b><span>${$t(`ob.${s}`)}</span></div>`
  ).join("")}<p class="small muted">${$t("ob.hint")}</p></div>`;
}
export function bindOnboard(re) {
  const x = $("#ob-x");
  if (x)
    x.onclick = () => {
      onb().hide = true;
      save();
      re && re();
    };
}
function mark(step) {
  if (!S || window.__SIM || S.season !== 1) return;
  const o = onb();
  if (o.done || o[step]) return;
  o[step] = 1;
  if (STEPS.every(s => o[s])) {
    o.done = 1;
    S.moral += 5;
    tx($t("ob.reward"), 20);
    norm();
    toast($t("ob.doneToast"));
  }
  save();
}
Bus.on("train:done", d => !(d && d.auto) && mark("train"));
Bus.on("match:end", () => mark("match"));

/* ---- Mekan ipuçları (ilk ziyaret) ---- */
const TIPS = ["ev", "stad", "okul", "medya", "aile", "kafe", "eglence", "avm", "market", "sans", "sokak", "studyo", "akademi", "liman", "borsa"];
export function placeTip(id) {
  if (!S || window.__SIM) return;
  if (id === "aile") mark("aile");
  if (id === "market") mark("market");
  if (!TIPS.includes(id)) return;
  S.tips = S.tips || {};
  if (S.tips[id]) return;
  S.tips[id] = 1;
  save();
  const b = $("#shb");
  if (b)
    b.insertAdjacentHTML(
      "afterbegin",
      `<div class="say gold"><b>${$t("tip.head")}</b> ${$t(`tip.${id}`)}</div>`
    );
}
