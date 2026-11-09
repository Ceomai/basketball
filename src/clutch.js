/* ================= MOLA VE SON DAKİKA KARARLARI (kendin oynarken) =================
   - Mola hakkı: ilk yarı 2, ikinci yarı 3, uzatmada 1. Rakip seri yakalayınca (üst üste 3 sayı) düğme yanıp söner.
     Molada set oyunu: seriyi kes (rakibin sonraki birkaç hücumu zorlaşır), son şut senin (sıradaki hücumda kesin karar
     anı + küçük isabet bonusu, kaçarsa moral −), pick and roll (sonraki 3 hücumumuz +%7), zon savunma (rakibin sonraki
     4 hücumu −%8; rakip üçlükçüyse etkisi yarıya). Rakip tarzına göre "Koç önerisi" (src/matchfeel.js).
   - Son dakika (son 50 sn, sahadayken):
     · gerideyken rakip hücumda → "faul yap, saati durdur" (rakip 2 serbest atış, top size) ya da savun
     · 1-3 öndeyken top sizde (son 35 sn) → "zamanı tüket" (saat akar, isabet biraz düşer) ya da hücum et */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus } from "./data.js";
import { M } from "./match.js";
import { S } from "./core.js";
import { late } from "./late.js";

export function timeoutInit() {
  if (!M) return;
  M.toLeft = 2;
  M.oppRun = 0;
  M.runStop = 0;
  M.toPnr = 0;
  M.toZone = 0;
  M.toLast = 0;
  M.toLastOn = 0;
  M.on = false; // sahada mı (src/engine.js günceller)
}
export const timeoutBtnHTML = () =>
  M && M.toLeft != null
    ? `<button class="opt ${M.oppRun >= 3 && M.toLeft > 0 ? "on pulse" : ""}" id="to-btn" style="padding:var(--sp-1) var(--sp-2)" ${M.toLeft > 0 && !M.toReq ? "" : "disabled"}>${$t("cl.to", { n: M.toLeft })}</button>`
    : "";
export function bindTimeout(re) {
  const b = $("#to-btn");
  if (b)
    b.onclick = () => {
      M.toReq = 1;
      b.disabled = true;
      void re;
    };
}
/** Mola kartı (sıradaki hücumdan önce) */
export function timeoutCard(el) {
  M.toReq = 0;
  if (!M.toLeft) return Promise.resolve();
  M.toLeft--;
  late.sfx && late.sfx("whistle");
  late.buzz && late.buzz(40); // titreşim (ayarlardan kapatılabilir)
  const rec = late.osRecommend ? late.osRecommend() : "stop";
  const sets = [
    ["stop", $t("cl.stop"), $t("cl.stopD")],
    ["last", $t("cl.set.last"), $t("cl.set.lastD")],
    ["pnr", $t("cl.set.pnr"), $t("cl.set.pnrD")],
    ["zone", $t("cl.set.zone"), late.osStyle && late.osStyle() === "ucluk" ? $t("cl.set.zoneHalf") : $t("cl.set.zoneD")]
  ].filter(([k]) => k !== "last" || M.on !== false);
  return new Promise(res => {
    el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("cl.toT", { q: M.q, c: M.clock })}</div><h2>${$t("cl.toH")}</h2><p class="muted">${M.oppRun >= 3 ? $t("cl.toRun", { n: M.oppRun }) : $t("cl.toCalm")}</p><div class="choices">${sets
      .map(
        ([k, t, d]) =>
          `<button class="choice" data-to="${k}"><span class="ct">${t}</span><span class="cd">${d}</span>${k === rec ? `<span class="od e">${$t("cl.rec")}</span>` : ""}</button>`
      )
      .join("")}</div></div>`;
    $$("[data-to]").forEach(
      b =>
        (b.onclick = () => {
          const k = b.dataset.to;
          if (k === "stop") {
            M.runStop = 5;
            M.oppRun = 0;
          } else if (k === "last") M.toLast = 1;
          else if (k === "pnr") M.toPnr = 3;
          else if (k === "zone") M.toZone = 4;
          M.toSet = k;
          el.innerHTML = "";
          res();
          if (M.feed && late.addFeed) late.addFeed(`<b>${$t("cl.toFeed")}</b> ${$t(`cl.toFx.${k}`)}`);
        })
    );
  });
}
/** Seri takibi ve mola etkisi (simPossession içinden) */
export function possMod(us) {
  if (!M) return 1;
  let m = 1;
  if (us && M.hold) m *= 0.88; // zaman tüketmek: isabet biraz düşer
  if (!us && M.runStop > 0) {
    M.runStop--;
    m *= 0.85; // mola sonrası rakip ritmini kaybeder
  }
  if (us && M.toPnr > 0) {
    M.toPnr--;
    m *= 1.07; // pick and roll seti
  }
  if (!us && M.toZone > 0) {
    M.toZone--;
    m *= late.osStyle && late.osStyle() === "ucluk" ? 0.96 : 0.92; // zon savunma; üçlükçüye karşı yarı etki
  }
  return m;
}
/** "Son şut senin": sıradaki hücumumuzda kesin karar anı (sahadaysan) */
export function toLastTake(ourBall) {
  if (!M || !M.toLast || !ourBall) return false;
  M.toLast = 0;
  M.toLastOn = 1;
  return true;
}
Bus.on("match:moment", e => {
  if (!M || !M.toLastOn) return;
  M.toLastOn = 0;
  if (e && !e.good) {
    S.moral = Math.max(0, (S.moral || 0) - 3);
    if (M.feed && late.addFeed) late.addFeed(`<b>${$t("cl.toFeed")}</b> ${$t("cl.lastMiss")}`);
  }
});
export function runTrack(us, scored) {
  if (!M) return;
  if (!us && scored) M.oppRun = (M.oppRun || 0) + 1;
  else if (us && scored) M.oppRun = 0;
}
/** Son dakika kararı; "foul" | "hold" | null */
export function lateCall(ourBall, diff, el, secLeft) {
  if (!M) return Promise.resolve(null);
  M.lcTrail = false;
  let kind = null;
  if (secLeft < 8) return Promise.resolve(null); // birkaç saniye kala karar anlamsız
  if (!ourBall && diff <= -3 && diff >= -6)
    kind = "trail"; // 1-2 sayı gerideyken savunma açıkça doğru
  else if (ourBall && diff >= 1 && diff <= 3 && secLeft <= 35) kind = "lead";
  if (!kind) return Promise.resolve(null);
  M.lcTrail = kind === "trail"; // savunmayı seçtiysen aynı hücum için ikinci bir savunma kartı çıkmaz
  late.buzz && late.buzz(25);
  const opts =
    kind === "trail"
      ? [
          ["defend", $t("cl.defend"), $t("cl.defendD")],
          ["foul", $t("cl.foul"), $t("cl.foulD")]
        ]
      : [
          ["attack", $t("cl.attack"), $t("cl.attackD")],
          ["hold", $t("cl.hold"), $t("cl.holdD")]
        ];
  return new Promise(res => {
    el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t(diff > 0 ? "cl.lateUp" : "cl.lateDown", { s: secLeft, n: Math.abs(diff) })}</div><h2>${$t(kind === "trail" ? "cl.trailH" : "cl.leadH")}</h2><div class="choices">${opts
      .map(
        ([k, t, d]) => `<button class="choice" data-lt="${k}"><span class="ct">${t}</span><span class="cd">${d}</span></button>`
      )
      .join("")}</div></div>`;
    $$("[data-lt]").forEach(
      b =>
        (b.onclick = () => {
          el.innerHTML = "";
          res(b.dataset.lt === "foul" || b.dataset.lt === "hold" ? b.dataset.lt : null);
        })
    );
  });
}
/** Faul sonrası rakibin iki serbest atışı */
export function oppFreeThrows() {
  // baskı altında serbest atış: %58 (taktik faul gerideyken gerçek bir seçenek olsun)
  const made = (Math.random() < 0.58 ? 1 : 0) + (Math.random() < 0.58 ? 1 : 0);
  const note = late.addFoul ? late.addFoul() || "" : "";
  return { made, note };
}
