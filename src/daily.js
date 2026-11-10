/* ================= GÜNÜN MAÇI =================
   Her gün herkes için aynı kısa senaryo (tarihten türetilen tohum): son 1:30, birkaç sayı gerideyiz, üç hücum.
   Oyuncunun kendi kariyer nitelikleri değil, senaryonun sabit oyuncusu kullanılır; böylece sonuç arkadaşlarla
   kıyaslanabilir. Sonuç paylaşılabilir bir metin olur (🟩🟥 ızgarası). Giriş ödülü değil: merak ve kıyas.
   - Günde bir deneme; kaybedince ya da uzatmaya gidince reklamla bir deneme daha (en iyi sonuç sayılır)
   - Oynama serisi ve galibiyet sayısı cihazda (localStorage "pota-daily")
   - İlk kez bitirince kariyere küçük bir dokunuş: kazanırsan takipçi ve moral
   Bölümler: P1 hücum, P2 savunma (durduramazsan rakip sayı atar), P3 son hücum. */
import { t as $t } from "./i18n/index.js";
import { $, Bus, choiceButtons, clamp, pickChoice, toast } from "./data.js";
import { S, app, norm, renderMain } from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgBlock, mgDribble, mgShoot, mgTiming } from "./games.js";
import { ADS, adBtn, rewardLeft, showRewarded } from "./ads.js";
import { late } from "./late.js";
import { mulberry32 } from "./logic/rng.js";

const KEY = "pota-daily";
const EPOCH = Date.UTC(2026, 10, 1); // 1 Kasım 2026 = Günün Maçı #1
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dayNo = (day = localDay()) => Math.round((Date.parse(day + "T00:00:00Z") - EPOCH) / 864e5) + 1;
export const DLY = (() => {
  let o = {};
  try {
    o = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    o = {};
  }
  return Object.assign({ last: "", streak: 0, best: 0, wins: 0, played: 0, today: null }, o);
})();
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(DLY));
  } catch (e) {
    /* dolu */
  }
};
// mulberry32: aynı gün herkese aynı senaryo (src/logic/rng.js)
const rng = mulberry32;
const OPPS = [
  "Kartal Spor",
  "Liman Gücü",
  "Boğaz Yıldızları",
  "Rüzgar Kulübü",
  "Kale Spor",
  "Demirciler",
  "Kızılkaya",
  "Çınar Spor"
];
/** Günün senaryosu (saf; testler tarihi verir) */
export function scenario(day = localDay()) {
  const r = rng(dayNo(day) * 2654435761);
  const deficit = 1 + Math.floor(r() * 4); // 1-4 sayı geride
  const base = 62 + Math.floor(r() * 50); // 62-111
  return {
    no: dayNo(day),
    day,
    opp: OPPS[Math.floor(r() * OPPS.length)],
    us: base,
    them: base + deficit,
    eff: 55 + Math.floor(r() * 16), // senaryo oyuncusunun niteliği (herkese aynı)
    oppThree: r() < 0.35, // savunmada rakip üçlük mü arıyor
    passOk: 0.45 + r() * 0.2, // pas seçeneğinde takım arkadaşının isabeti
    safeOk: 0.45 + r() * 0.2
  };
}
const today = () => {
  const d = localDay();
  // yalnızca ileri bir gün yeni senaryo açar: saat geri alınarak geçmiş günler yeniden oynanıp ödül toplanmasın
  if (!DLY.today || !DLY.today.day || d > DLY.today.day) DLY.today = { day: d, tries: 0, ad: false, res: null };
  return DLY.today;
};
export const dailyOpen = () => !!S && !window.__SIM && !today().res;
export function dailyStatus() {
  const t = today();
  return t.res ? t.res : null;
}

/* ---- Oyun ---- */
const OFF = [
  ["three", "dly.three", "dly.threeD"],
  ["drive", "dly.drive", "dly.driveD"],
  ["pass", "dly.pass", "dly.passD"]
];
const DEF = [
  ["steal", "dly.steal", "dly.stealD"],
  ["block", "dly.block", "dly.blockD"],
  ["safe", "dly.safe", "dly.safeD"]
];
function choose(el, head, desc, opts) {
  el.innerHTML = `<div class="card sit"><div class="eyebrow">${head}</div><p class="muted">${desc}</p><div class="choices">${choiceButtons(
    opts.map(([k, n, d]) => [k, $t(n), $t(d)]),
    "dk"
  )}</div></div>`;
  return pickChoice(el, "dk");
}
async function offense(stg, sc, k, rnd) {
  const e = clamp(sc.eff + 8, 5, 100);
  if (k === "three")
    return (await mgShoot(stg, { eff: e, shots: 1, title: $t("dly.three"), dist: "three", def: true })).made ? 3 : 0;
  if (k === "drive") return (await mgDribble(stg, { eff: e, reps: 1, title: $t("dly.drive") })).ok ? 2 : 0;
  return rnd() < sc.passOk ? 2 : 0;
}
async function defense(stg, sc, k, rnd) {
  const e = clamp(sc.eff + 8, 5, 100);
  let stop;
  if (k === "steal")
    stop = (await mgTiming(stg, { eff: e, tries: 1, title: $t("dly.steal"), label: $t("dly.steal"), kind: "steal" })).ok > 0;
  else if (k === "block") stop = (await mgBlock(stg, { eff: e, reps: 1, title: $t("dly.block") })).ok > 0;
  else stop = rnd() < sc.safeOk;
  return { stop, them: stop ? 0 : sc.oppThree ? 3 : 2, fast: stop && k === "steal" ? 2 : 0 };
}
/** Günün Maçı'nı oyna (bir deneme) */
export async function playDaily(back = renderMain) {
  const t = today();
  if (!S || (t.res && !t.retry)) return;
  const sc = scenario(t.day);
  const rnd = rng(sc.no * 7919 + t.tries); // pas / güvenli savunma zarları: deneme başına farklı
  t.tries++;
  t.retry = false;
  persist();
  arenaFor(null);
  app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("dly.title")} #${sc.no}</div><h2 id="dsc">${sc.us}–${sc.them}</h2><p class="small muted" id="dclk">${$t("dly.setup", { o: sc.opp, d: sc.them - sc.us })}</p></div><div id="dch"></div><div id="stg"></div><div id="res"></div>`;
  const ch = $("#dch"),
    stg = $("#stg"),
    grid = [];
  let us = sc.us,
    them = sc.them;
  const upd = clk => {
    $("#dsc").textContent = `${us}–${them}`;
    $("#dclk").textContent = clk;
  };
  // 1. hücum
  let k = await choose(ch, $t("dly.p1"), $t("dly.p1D", { d: them - us }), OFF);
  ch.innerHTML = "";
  let p = await offense(stg, sc, k, rnd);
  us += p;
  grid.push(p > 0);
  stg.innerHTML = "";
  upd($t("dly.c1"));
  // 2. savunma
  k = await choose(ch, $t("dly.p2"), sc.oppThree ? $t("dly.p2Three") : $t("dly.p2Two"), DEF);
  ch.innerHTML = "";
  const d = await defense(stg, sc, k, rnd);
  them += d.them;
  us += d.fast;
  grid.push(d.stop);
  stg.innerHTML = "";
  upd($t("dly.c2"));
  // 3. son hücum
  const need = them - us;
  k = await choose(
    ch,
    $t("dly.p3"),
    need > 0 ? $t("dly.p3Behind", { d: need }) : need === 0 ? $t("dly.p3Tie") : $t("dly.p3Ahead", { d: -need }),
    OFF
  );
  ch.innerHTML = "";
  p = await offense(stg, sc, k, rnd);
  us += p;
  grid.push(p > 0);
  stg.innerHTML = "";
  upd($t("dly.c3"));
  const r = us > them ? "w" : us === them ? "t" : "l";
  record({ r, us, them, grid: grid.map(g => (g ? 1 : 0)) });
  showResult(back);
}
const RANK = { w: 2, t: 1, l: 0 };
function record(res) {
  const t = today();
  const first = !t.res;
  if (!t.res || RANK[res.r] > RANK[t.res.r] || (res.r === t.res.r && res.us - res.them > t.res.us - t.res.them)) t.res = res;
  if (first) {
    // seri: dün oynadıysan devam, değilse yeniden başlar
    const y = new Date(t.day + "T12:00:00");
    y.setDate(y.getDate() - 1);
    DLY.streak = DLY.last === localDay(y) ? DLY.streak + 1 : 1;
    DLY.best = Math.max(DLY.best, DLY.streak);
    DLY.last = t.day;
    DLY.played++;
  }
  if (res.r === "w" && (first || !t.won)) {
    DLY.wins++;
    t.won = true;
    if (S) {
      S.followers = Math.round(S.followers * 1.02) + 3;
      S.moral += 4;
      norm();
      save();
    }
  }
  persist();
  Bus.emit("daily", { r: res.r, tries: t.tries });
}
export function shareText(res = dailyStatus(), sc = scenario(today().day)) {
  if (!res) return "";
  const g = res.grid.map(x => (x ? "🟩" : "🟥")).join("");
  const word = res.r === "w" ? $t("dly.won") : res.r === "t" ? $t("dly.ot") : $t("dly.lost");
  return `${$t("app.name")} · ${$t("dly.title")} #${sc.no}\n${g} ${res.us}-${res.them} ${word}\n${$t("dly.streak", { n: DLY.streak })}\nhttps://ceomai.github.io/basketball/`;
}
async function share() {
  const txt = shareText();
  try {
    if (late.nativeShareText) return void (await late.nativeShareText(txt, $t("dly.title")));
    if (navigator.share) return void (await navigator.share({ text: txt }));
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(txt);
    toast($t("dly.copied"));
  } catch (e) {
    toast($t("card.fail"));
  }
}
function showResult(back) {
  const t = today(),
    res = t.res,
    canRetry = res.r !== "w" && !t.ad && (ADS.adFree || rewardLeft() > 0);
  const el = $("#res") || app;
  el.innerHTML = `<div class="card mt-3"><div class="eyebrow">${$t("dly.title")} #${scenario(t.day).no}</div><h2 class="${res.r === "w" ? "good" : res.r === "l" ? "bad" : ""}">${res.r === "w" ? $t("dly.won") : res.r === "t" ? $t("dly.ot") : $t("dly.lost")} · ${res.us}–${res.them}</h2><div style="font-size:var(--fs-7xl);letter-spacing:4px">${res.grid.map(x => (x ? "🟩" : "🟥")).join("")}</div><div class="kv"><span>${$t("dly.streakL")}</span><b>${DLY.streak}</b><span>${$t("dly.bestL")}</span><b>${DLY.best}</b><span>${$t("dly.winsL")}</span><b>${DLY.wins}/${DLY.played}</b></div>${res.r === "w" ? `<p class="small good">${$t("dly.reward")}</p>` : ""}<p class="small muted">${$t("dly.tomorrow")}</p>
   <button class="btn pri" id="dl-share">${$t("dly.share")}</button>${canRetry ? adBtn("dl-retry", $t("dly.retry"), $t("dly.retrySub"), "daily_retry") : ""}<button class="btn ghost" id="dl-back">${$t("common.backMap")}</button></div>`;
  $("#dl-share").onclick = share;
  $("#dl-back").onclick = back;
  const rb = $("#dl-retry");
  if (rb)
    rb.onclick = async () => {
      rb.disabled = true;
      const ok = await showRewarded("daily_retry");
      if (!S || !document.body.contains(rb)) return;
      if (!ok) return void (rb.disabled = false);
      t.ad = true;
      t.retry = true;
      persist();
      playDaily(back);
    };
}
/** Bugün paneli için kart */
export function dailyCardHTML() {
  const t = today(),
    sc = scenario(t.day);
  return `<div class="card"><div class="row between"><div class="eyebrow">${$t("dly.title")} #${sc.no}</div>${DLY.streak ? `<span class="pill g">${$t("dly.streak", { n: DLY.streak })}</span>` : ""}</div>${
    t.res
      ? `<p><b>${t.res.r === "w" ? $t("dly.won") : t.res.r === "t" ? $t("dly.ot") : $t("dly.lost")}</b> · ${t.res.us}–${t.res.them} ${t.res.grid.map(x => (x ? "🟩" : "🟥")).join("")}</p><div class="grid2"><button class="btn ghost sm" id="dl-see">${$t("dly.see")}</button><button class="btn sm" id="dl-share2">${$t("dly.share")}</button></div>`
      : `<p class="small">${$t("dly.intro", { o: sc.opp, d: sc.them - sc.us })}</p><button class="btn pri" id="dl-play">${$t("dly.play")}</button>`
  }</div>`;
}
export function bindDailyCard(back) {
  const p = $("#dl-play");
  if (p) p.onclick = () => (late.closeSheet(), playDaily(back));
  const s = $("#dl-see");
  if (s)
    s.onclick = () => {
      late.closeSheet();
      app.innerHTML = `<div class="pt-3"></div><div id="res"></div>`;
      showResult(back);
    };
  const sh = $("#dl-share2");
  if (sh) sh.onclick = share;
}
