/* ================= MOLA VE SON DAKİKA KARARLARI (kendin oynarken) =================
   - Mola hakkı: ilk yarı 2, ikinci yarı 3, uzatmada 1. Rakip seri yakalayınca (üst üste 3 sayı) düğme yanıp söner.
     Molada: seriyi kes (rakibin sonraki birkaç hücumu zorlaşır) ya da taktik seç (tempo, savunma, top bende).
   - Son dakika (son 50 sn, sahadayken):
     · gerideyken rakip hücumda → "faul yap, saati durdur" (rakip 2 serbest atış, top size) ya da savun
     · 1-3 öndeyken top sizde (son 35 sn) → "zamanı tüket" (saat akar, isabet biraz düşer) ya da hücum et */
import { t as $t } from "./i18n/index.js";
import { $, $$ } from "./data.js";
import { M } from "./match.js";
import { late } from "./late.js";

export function timeoutInit() {
  if (!M) return;
  M.toLeft = 2;
  M.oppRun = 0;
  M.runStop = 0;
}
export const timeoutBtnHTML = () =>
  M && M.toLeft != null
    ? `<button class="opt ${M.oppRun >= 3 && M.toLeft > 0 ? "on pulse" : ""}" id="to-btn" style="padding:4px 9px" ${M.toLeft > 0 && !M.toReq ? "" : "disabled"}>${$t("cl.to", { n: M.toLeft })}</button>`
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
  return new Promise(res => {
    el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("cl.toT", { q: M.q, c: M.clock })}</div><h2>${$t("cl.toH")}</h2><p class="muted">${M.oppRun >= 3 ? $t("cl.toRun", { n: M.oppRun }) : $t("cl.toCalm")}</p><div class="choices">${[
      ["stop", $t("cl.stop"), $t("cl.stopD")],
      ["tempo", $t("engine.66"), $t("cl.tempoD")],
      ["def", $t("engine.67"), $t("cl.defD")],
      ["ball", $t("engine.68"), $t("cl.ballD")]
    ]
      .map(([k, t, d]) => `<button class="choice" data-to="${k}"><span class="ct">${t}</span><span class="cd">${d}</span></button>`)
      .join("")}</div></div>`;
    $$("[data-to]").forEach(
      b =>
        (b.onclick = () => {
          const k = b.dataset.to;
          if (k === "stop") {
            M.runStop = 6;
            M.oppRun = 0;
          } else M.tac = k;
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
    m *= 0.9; // mola sonrası rakip ritmini kaybeder
  }
  return m;
}
export function runTrack(us, scored) {
  if (!M) return;
  if (!us && scored) M.oppRun = (M.oppRun || 0) + 1;
  else if (us && scored) M.oppRun = 0;
}
/** Son dakika kararı; "foul" | "hold" | null */
export function lateCall(ourBall, diff, el, secLeft) {
  if (!M) return Promise.resolve(null);
  let kind = null;
  if (!ourBall && diff < 0 && diff >= -6) kind = "trail";
  else if (ourBall && diff >= 1 && diff <= 3 && secLeft <= 35) kind = "lead";
  if (!kind) return Promise.resolve(null);
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
    el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("cl.lateT", { s: secLeft, d: diff > 0 ? `+${diff}` : diff })}</div><h2>${$t(kind === "trail" ? "cl.trailH" : "cl.leadH")}</h2><div class="choices">${opts
      .map(([k, t, d]) => `<button class="choice" data-lt="${k}"><span class="ct">${t}</span><span class="cd">${d}</span></button>`)
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
  const made = (Math.random() < 0.74 ? 1 : 0) + (Math.random() < 0.74 ? 1 : 0);
  if (late.addFoul) late.addFoul();
  return made;
}
