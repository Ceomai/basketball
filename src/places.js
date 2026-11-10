import { t as $t, LOCALE } from "./i18n/index.js";
import { trainingGain } from "./logic/rules.js";
import { late } from "./late.js";
import { clamp, isPro, luma, pick } from "./data.js";
import { sceneEl } from "./art.js";
import { locInfo } from "./map.js";
import { ARENA, buildCrowd, mgBlock, mgDribble, mgGym, mgPass, mgPost, mgRebound, mgShoot, mgTiming, setARENA } from "./games.js";
import { S, gainStat, lgName, mapState, norm, resultView, statVal, useSlot } from "./core.js";
import { save } from "./save.js";
import { locEv } from "./loc/ev.js";
import { locStad } from "./loc/stad.js";
import { locOkul } from "./loc/okul.js";
import { locMedya } from "./loc/medya.js";
import { locAile } from "./loc/aile.js";
import { locKafe } from "./loc/kafe.js";
/* ================= MEKANLAR ================= */
export function openLoc(id, tab) {
  const I = locInfo(id, mapState());
  if (I.fo) return late.focusLocSheet(id, I); // odak modunda kapalı (src/focus.js)
  ({
    ev: locEv,
    stad: locStad,
    okul: locOkul,
    medya: locMedya,
    aile: locAile,
    kafe: locKafe,
    eglence: late.locEglence,
    avm: late.locAvm,
    market: late.locMarket,
    sans: late.locSans,
    sokak: late.locSokak,
    studyo: late.locStudio,
    taraftar: late.locFans,
    performans: late.locPerf,
    akademi: late.locAkademi,
    borsa: late.locBorsa,
    hipodrom: late.locHipodrom,
    liman: late.locLiman
  })[id](I, tab);
  late.placeTip(id); // ilk ziyarette kısa tanıtım (src/guide.js)
}
export const HOUSING = {
  oda: { n: $t("places.265"), rent: 0, en: 0 },
  yurt: { n: $t("map.15"), rent: 6, en: 0 },
  daire: {
    get n() {
      return $t("map.16");
    },
    rent: 70,
    en: 4
  },
  lux: {
    get n() {
      return $t("places.266");
    },
    rent: 475,
    en: 8,
    mo: 2
  },
  villa: {
    get n() {
      return $t("map.18");
    },
    rent: 2100,
    en: 12,
    mo: 4
  },
  malikane: {
    get n() {
      return $t("map.19");
    },
    rent: 7500,
    en: 15,
    mo: 6
  }
};
export const addScene = (el, kind, bubble, opts) => el.prepend(sceneEl(kind, bubble, opts));

export function restAct() {
  useSlot();
  S.energy += 35;
  S.moral += 2;
  late.restInjury(); // dinlenmiş vücut: bu hafta sakatlık riski azalır (src/lifestyle.js)
  norm();
  save();
  resultView($t("places.52"), pick([$t("places.53"), $t("places.54"), $t("places.55")]), [
    [$t("places.8"), "p"],
    [$t("life.restInj"), "p"]
  ]);
}
export function sparkHTML() {
  const rs = late.rated().slice(-10);
  if (!rs.length) return `<p class="small muted">${$t("places.56")}</p>`;
  const w = 300,
    h = 70,
    n = rs.length;
  const xs = i => (n === 1 ? w / 2 : 12 + (i * (w - 24)) / (n - 1)),
    ys = v => h - 8 - ((v - 1) / 9) * (h - 16);
  const pts = rs.map((r, i) => `${xs(i).toFixed(1)},${ys(r.rating).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${$t("rc.a11y.ratings")}"><line x1="0" x2="${w}" y1="${ys(6)}" y2="${ys(6)}" stroke="#24314a" stroke-dasharray="4 4"/><text x="2" y="${ys(6) - 3}" style="fill:var(--dim)" font-size="9">6.0</text><polygon points="${xs(0)},${h} ${pts} ${xs(n - 1)},${h}" fill="var(--team)" opacity=".15"/><polyline points="${pts}" fill="none" stroke="var(--team)" stroke-width="2.5"/>${rs.map((r, i) => `<circle cx="${xs(i)}" cy="${ys(r.rating)}" r="${i === n - 1 ? 4.5 : 3}" style="fill:var(${r.win ? "--good" : "--bad"})"/>`).join("")}</svg><div class="row gap-1">${rs.map(r => `<span class="pill ${r.win ? "w" : "l"}">${r.us}-${r.them} · ${r.rating.toFixed(1)}</span>`).join("")}</div>`;
}

/* --- Stadyum --- */
export const momentCount = () =>
  clamp(3 + Math.round(S.rel.koc / 30) + (isPro(S.stage) ? 1 : 0) + (S.role === "star" ? 1 : S.role === "bench" ? -1 : 0), 3, 7);
export const DRILL_IC = {
  shoot: "ball",
  shootmid: "ball",
  pass: "chat",
  dribble: "sneaker",
  steal: "whistle",
  post: "dumbbell",
  rebound: "hoop",
  block: "hoop",
  free: "ball",
  gym: "dumbbell"
};
export function arenaFor(opp) {
  setARENA({
    home: S.team.c1,
    home2: S.team.c2,
    away: opp ? opp.c1 : "#4a5568",
    away2: opp ? opp.c2 : "#ffffff",
    led: `  ${S.team.name.toLocaleUpperCase(LOCALE)}  •  ${S.city.toLocaleUpperCase(LOCALE)}  •  ${lgName().toLocaleUpperCase(LOCALE)}  •`
  });
  if (luma(ARENA.home) < 50) ARENA.home = ARENA.home2;
  buildCrowd(ARENA.home, ARENA.away);
}
export function runGame(kind, el, e, reps, title) {
  if (kind === "shoot")
    return mgShoot(el, { eff: e, shots: reps + 1, title, dist: "three", def: false }).then(r => r.made / (reps + 1));
  if (kind === "shootmid")
    return mgShoot(el, { eff: e, shots: reps + 1, title, dist: "mid", def: false }).then(r => r.made / (reps + 1));
  if (kind === "pass") return mgPass(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "dribble") return mgDribble(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "steal")
    return mgTiming(el, { eff: e, tries: reps, title, label: $t("match.108"), kind: "steal" }).then(r => r.ok / reps);
  if (kind === "post") return mgPost(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "rebound") return mgRebound(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "block") return mgBlock(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "free") return mgTiming(el, { eff: e, tries: reps + 1, title, label: $t("games.8") }).then(r => r.ok / (reps + 1));
  return mgGym(el, { title }).then(r => clamp(r.taps / 40, 0, 1));
}
// antrenman kazancı: başarı oranı, mevcut nitelik ve bonuslar; denge simülasyonu da aynı fonksiyonu kullanır
// Kazancı niteliğe ekler (gainStat) ve ondalık değeri döndürür (ör. 0.8)
export function drillGain(k, ratio) {
  const f =
    trainingGain({ ratio, stat: statVal(k), age: S.age, coach: !!S.items.hoca, buff: S.buffs.train > 0 }) *
    late.programMul(k) *
    late.charTrainMul() *
    late.modeTrainMul() *
    late.originTrainMul() *
    late.itemTrainMul(k);
  if (S.buffs.train > 0) S.buffs.train--;
  const g = Math.round(f * 100) / 100;
  gainStat(k, g);
  return g;
}