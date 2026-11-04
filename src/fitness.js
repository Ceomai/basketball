/* ================= KONDİSYON VE PERFORMANS MERKEZİ =================
   Vücut bir sistem: kalıcı "Kondisyon" (0-100) göstergesi.
   - Etkileri: en yüksek enerji (70 + kondisyon × 0,3), sakatlık riski (×1,25 → ×0,85), 30 yaş sonrası yaz düşüşü
     (yüksek kondisyon düşüşün bir kısmını önler; kariyer uzar).
   - Haftalık: beslenme planı (sporcu +2 ve ücretli, dengeli +0,5, serbest −1,5 ve moral +2); 26 yaşından sonra doğal
     kayıp −0,4; gece kulübü partisi −3.
   - Performans merkezi (Spor kompleksi semti): kondisyon çalışması (ağırlık mini oyunu), sakatlıkta rehabilitasyon
     (zamanlama mini oyunu; başarılıysa iyileşme bir hafta kısalır, sakatlık başına bir kez), vücut ölçümü. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, fmt } from "./data.js";
import { S, app, closeSheet, eff, norm, renderMain, resultView, sheet, tx, useSlot } from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgGym, mgTiming } from "./games.js";

const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
export const fit = () => (S && S.fit != null ? S.fit : 65);
export const maxEnergy = () => (S ? Math.round(Math.min(100, 70 + fit() * 0.3)) : 100);
export const fitInjMul = () => 1.25 - fit() / 250;
/** Yaz düşüşünün bir kısmını önleme olasılığı (yüksek kondisyon kariyeri uzatır) */
export const fitSave = () => clamp((fit() - 40) / 120, 0, 0.5);
const DIETS = {
  sporcu: { fit: 1.5, mo: 0, cost: 6 },
  dengeli: { fit: 0, mo: 0, cost: 2 },
  serbest: { fit: -1.5, mo: 2, cost: 0 }
};
export const dietCost = d => Math.round((DIETS[d] || DIETS.dengeli).cost * (PM[S.stage] || 1));
Bus.on("week:start", () => {
  if (!S) return;
  if (S.fit == null) S.fit = 65;
  const d = DIETS[S.diet || "dengeli"] || DIETS.dengeli;
  const c = dietCost(S.diet || "dengeli");
  if (c > 0 && S.money >= c) tx($t("fit.dietTx"), -c);
  S.fit += d.fit + (S.age >= 26 ? -0.4 : 0);
  S.moral += d.mo;
  S.fit = clamp(Math.round(S.fit * 10) / 10, 0, 100);
  norm();
  save(); // hafta başı kaydı bu işleyiciden önce yapılmış olabilir (sayfa yenilenince ücret kaybolmasın)
});
export function locPerf(I) {
  if (S.fit == null) S.fit = 65;
  const f = fit(),
    rehabOk = S.injury && S.injury.w > 1 && !S.injury.rehab;
  sheet(
    I.n,
    $t("fit.sub"),
    `<div class="card"><div class="row between"><div class="eyebrow">${$t("fit.title")}</div><b class="gold">${f.toFixed(1)}/100</b></div><div class="bar"><i style="width:${f}%"></i></div><p class="small muted">${$t("fit.fx", { e: maxEnergy(), i: Math.round((fitInjMul() - 1) * 100), s: Math.round(fitSave() * 100) })}</p></div>
    <div class="card"><div class="eyebrow">${$t("fit.diet")}</div><div class="opts" id="diet">${Object.keys(DIETS)
      .map(d => `<button class="opt ${(S.diet || "dengeli") === d ? "on" : ""}" data-d="${d}">${$t(`fit.d.${d}`)}</button>`)
      .join(
        ""
      )}</div><p class="small muted">${$t(`fit.d.${S.diet || "dengeli"}D`, { v: fmt(dietCost(S.diet || "dengeli")) })}</p></div>
    <div class="act"><div><h3>${$t("fit.work")}</h3><p>${$t("fit.workD")}</p></div><button class="btn team sm" id="fit-work" ${S.slot <= 0 || S.energy < 12 ? "disabled" : ""}>${$t("fit.go")}</button></div>
    ${S.injury ? `<div class="act"><div><h3>${$t("fit.rehab")}</h3><p>${$t("fit.rehabD")}</p></div><button class="btn team sm" id="fit-rehab" ${rehabOk && S.slot > 0 ? "" : "disabled"}>${$t("fit.go")}</button></div>` : ""}
    <div class="kv"><span>${$t("fit.age")}</span><b>${S.age}</b><span>${$t("fit.maxE")}</span><b>${maxEnergy()}</b><span>${$t("fit.energy")}</span><b>${S.energy}</b></div>`
  );
  $$("#diet [data-d]").forEach(b => (b.onclick = () => ((S.diet = b.dataset.d), save(), locPerf(I))));
  const w = $("#fit-work");
  if (w) w.onclick = () => workout();
  const r = $("#fit-rehab");
  if (r) r.onclick = () => rehab();
}
async function workout() {
  useSlot();
  S.energy -= 12;
  save();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("fit.title")}</div><h2>${$t("fit.work")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgGym($("#stg"), { title: $t("fit.work") });
  const g = Math.round(clamp(1.5 + (r.taps / 40) * 3, 1.5, 4.5) * 10) / 10;
  S.fit = clamp((S.fit ?? 65) + g, 0, 100);
  norm();
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><h2 class="good">${$t("fit.title")} +${g.toFixed(1)}</h2><p class="small muted">${$t("fit.now", { v: fit().toFixed(1) })}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}
async function rehab() {
  useSlot();
  S.injury.rehab = true;
  save();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("fit.rehab")}</div><h2>${$t("fit.rehab")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgTiming($("#stg"), {
    eff: clamp(eff("guc") + 20, 5, 100),
    title: $t("fit.rehab"),
    tries: 2,
    label: $t("fit.rehabBtn"),
    kind: "free"
  });
  const ok = r.ok >= 1 && S.injury && S.injury.w > 1;
  if (ok) S.injury.w--;
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><h2 class="${ok ? "good" : ""}">${ok ? $t("fit.rehabOk") : $t("fit.rehabNo")}</h2><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}
/** Gece hayatı kondisyonu düşürür */
export function fitHit(v) {
  if (!S) return;
  S.fit = clamp((S.fit ?? 65) - v, 0, 100);
}
export const fitResult = (title, txt) => resultView(title, txt);
