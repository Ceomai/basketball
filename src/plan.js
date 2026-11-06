/* ================= HAFTA PLANLAYICI, HAFTA ÖZETİ, MİLLİ TAKIM SERBEST ZAMANI =================
   - Hafta planı: 3 zaman dilimini tek ekranda seç, "Uygula" ile sırayla yapılır (gerçek mekân düğmelerine basılır,
     böylece kurallar aynı kalır). "Geçen haftanın aynısı" tek dokunuşla tekrarlar. Yalnızca mini oyunsuz işler.
   - Bu hafta neler oldu: hafta başında önceki haftanın farkları (para, moral, takipçi, genel, ilişkiler) ve kaçırılan
     bildirimler ana ekranda küçük bir kartta.
   - Mola modu (milli takım turnuvası maç araları): ana ekrana dönülür, 3 zaman dilimi normal hafta gibi kullanılır;
     hafta düğmeleri yerine "Maça hazırım" kartı çıkar. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, TOAST_LOG, esc, fmt } from "./data.js";
import { S, closeSheet, ovr, renderMain, sheet } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

/* ---- Hafta planı ---- */
// [anahtar, mekân, sekme, düğme seçicisi, koşul]
const ACTS = [
  ["team", "stad", "idman", '[data-act="takim"]', () => true],
  ["rest", "ev", "vitrin", '[data-act="rest"]', () => true],
  ["family", "aile", null, '[data-act="yemek"]', () => true],
  ["cafe", "kafe", null, '[data-act="sohbet"]', () => true],
  ["study", "okul", null, '[data-act="ders"]', () => !!S.studying],
  ["press", "medya", null, '[data-act="pr"]', () => late.isPro && late.isPro(S.stage)],
  ["kids", "sokak", null, "#st-kids", () => true]
];
const actOf = k => ACTS.find(a => a[0] === k);
export const planRowHTML = () =>
  S && !S.brk && late.unlocked("plan")
    ? `<div class="grid2" style="margin-top:6px"><button class="btn ghost sm" id="wplan">${$t("pl2.plan")}</button><button class="btn ghost sm" id="wrep" ${S.lastPlan && S.slot > 0 ? "" : "disabled"}>${$t("pl2.repeat")}</button></div>`
    : "";
export function bindPlanRow() {
  const a = $("#wplan"),
    b = $("#wrep");
  if (a) a.onclick = planSheet;
  if (b) b.onclick = () => runPlan(S.lastPlan);
}
export function planSheet() {
  const sel = (S.planDraft = S.planDraft || (S.lastPlan ? S.lastPlan.slice() : ["team", "family", "rest"]));
  const avail = ACTS.filter(a => a[4]());
  sheet(
    $t("pl2.plan"),
    $t("pl2.sub", { n: S.slot }),
    `${late.coachTipHTML()}${[0, 1, 2]
      .map(
        i =>
          `<div class="eyebrow">${$t("pl2.slot", { n: i + 1 })}${i >= S.slot ? ` · ${$t("pl2.used")}` : ""}</div><div class="opts" data-ps="${i}">${avail
            .map(([k]) => `<button class="opt ${sel[i] === k ? "on" : ""}" data-v="${k}" ${i >= S.slot ? "disabled" : ""}>${$t(`pl2.a.${k}`)}</button>`)
            .join("")}</div>`
      )
      .join("")}<p class="small muted">${$t("pl2.note")}</p><button class="btn pri" id="pl-go" ${S.slot > 0 ? "" : "disabled"}>${$t("pl2.go")}</button>`
  );
  $$("[data-ps] [data-v]").forEach(
    b =>
      (b.onclick = () => {
        sel[+b.closest("[data-ps]").dataset.ps] = b.dataset.v;
        planSheet();
      })
  );
  $("#pl-go").onclick = () => runPlan(sel.slice(0, S.slot));
}
/** Planı sırayla uygula: mekânı aç, düğmeye bas, sonucu topla */
export function runPlan(plan) {
  if (!plan || !plan.length || !S) return;
  S.lastPlan = plan.slice(0, 3);
  S.planDraft = null;
  const out = [];
  for (const k of plan) {
    if (S.slot <= 0) break;
    const a = actOf(k);
    if (!a || !a[4]()) continue;
    late.openLoc(a[1], a[2] || undefined);
    const btn = $(a[3]);
    if (!btn || btn.disabled) {
      out.push(`<b>${$t(`pl2.a.${k}`)}</b>: <span class="muted">${$t("pl2.skip")}</span>`);
      continue;
    }
    btn.click();
    const say = document.querySelector("#shb .say");
    out.push(`<b>${$t(`pl2.a.${k}`)}</b>: ${say ? say.innerHTML : "✓"}`);
  }
  closeSheet();
  save();
  sheet($t("pl2.done"), $t("pl2.doneSub"), `<div class="card" style="gap:6px">${out.map(x => `<div class="small">${x}</div>`).join("")}</div><button class="btn pri" id="pl-ok">${$t("casino.13")}</button>`);
  $("#pl-ok").onclick = renderMain;
}

/* ---- Bu hafta neler oldu ---- */
const snap = () => ({
  money: S.money,
  moral: S.moral,
  fol: S.followers,
  ovr: +ovr(),
  rel: { ...S.rel },
  t: TOAST_LOG.length
});
Bus.on("week:start", () => {
  if (!S) return;
  const a = S.wkSnap;
  if (a) {
    const d = k => Math.round((S.rel[k] || 0) - (a.rel[k] || 0));
    S.lastWeek = {
      money: Math.round(S.money - a.money),
      moral: Math.round(S.moral - a.moral),
      fol: Math.round(S.followers - a.fol),
      ovr: Math.round((+ovr() - a.ovr) * 10) / 10,
      rel: ["koc", "takim", "taraf", "aile"].map(k => [k, d(k)]).filter(([, v]) => v),
      notes: TOAST_LOG.slice(a.t).slice(-6)
    };
  }
  S.wkSnap = snap();
});
export function weekSummaryHTML() {
  const w = S && S.lastWeek;
  if (!w || S.brk || !late.unlocked("plan")) return "";
  const sg = v => (v > 0 ? `<b class="good">+${v}</b>` : v < 0 ? `<b class="bad">${v}</b>` : `<b class="muted">0</b>`);
  return `<details class="card" id="wsum"><summary class="row between" style="cursor:pointer"><span class="eyebrow">${$t("pl2.sum")}</span><span class="small">${w.money > 0 ? `<b class="good">+${fmt(w.money)}</b>` : w.money < 0 ? `<b class="bad">−${fmt(-w.money)}</b>` : "<b>0</b>"} · ${sg(w.ovr)} ${$t("pl2.ovr")}</span></summary>
   <div class="kv"><span>${$t("pl2.money")}</span>${w.money ? (w.money > 0 ? `<b class="good">+${fmt(w.money)}</b>` : `<b class="bad">−${fmt(-w.money)}</b>`) : "<b>0</b>"}<span>${$t("pl2.moral")}</span>${sg(w.moral)}<span>${$t("pl2.fol")}</span>${sg(w.fol)}<span>${$t("pl2.ovr")}</span>${sg(w.ovr)}${w.rel.map(([k, v]) => `<span>${$t(`pl2.r.${k}`)}</span>${sg(v)}`).join("")}</div>
   ${w.notes.length ? `<div class="eyebrow">${$t("pl2.notes")}</div>${w.notes.map(n => `<div class="small muted">• ${esc(n)}</div>`).join("")}` : ""}</details>`;
}

/* ---- Mola modu: milli takım maç araları ---- */
let resume = null;
/** Ana ekrana dön, 3 zaman dilimi kullan; "Maça hazırım" ile cb çağrılır */
export function startBreak(info, cb) {
  resume = cb;
  S.brk = { label: info.label, sub: info.sub || "", slotBack: S.slot };
  S.slot = 3;
  save();
  closeSheet();
  renderMain();
}
export function breakCardHTML() {
  if (!S || !S.brk) return "";
  return `<div class="card weekcard" style="border-color:#e30a17"><div class="eyebrow" style="color:#e30a17">${$t("pl2.brk")}</div><h3>${esc(S.brk.label)}</h3><p class="small muted">${S.brk.sub ? `${esc(S.brk.sub)} · ` : ""}${$t("pl2.brkD", { n: S.slot })}</p>
   <div class="timebar">${[2, 1, 0].map(i => `<i class="${S.slot > i ? "on" : ""}"></i>`).join("")}</div><button class="btn pri" id="brk-go">${$t("pl2.brkGo")}</button></div>`;
}
export function bindBreak() {
  const b = $("#brk-go");
  if (!b) return;
  b.onclick = () => {
    const cb = resume;
    resume = null;
    S.slot = S.brk && S.brk.slotBack != null ? S.brk.slotBack : S.slot;
    S.brk = null;
    save();
    if (cb) cb();
    else if (!(late.natResume && late.natResume())) renderMain(); // sayfa yenilendiyse turnuva kayıttan sürer
  };
}
