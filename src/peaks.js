/* ================= SEZON İÇİ ZİRVELER =================
   Sezonun ortası da heyecanlı olsun:
   1) Yıldızlar Hafta Sonu (sezon ortası; normalde 8., hızlı kariyerde 5. hafta): All-Star'a seçilmeyen herkes
      (lise ve üniversite dahil) bir beceri yarışmasına katılabilir: üçlük, smaç ya da beceri parkuru.
      Kazanan kupa (kariyer kupaları ve miras puanı), takipçi, taraftar, moral ve küçük bir ödül alır.
   2) Ara transfer dönemi (sezon ortasından bir-iki hafta sonra, yalnızca profesyonel): yedek kulübesindeysen, koçla
      aran bozuksa ya da iyi oynayıp rolün küçük kalıyorsa ligdeki başka kulüpler seni ister. Aynı ligde transfer:
      lig tablosu ve fikstür bozulmaz (yeni takımın eski takımınla oynar). Kalırsan koç ve takım bunu takdir eder. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, cOf, clamp, esc, fmt, isPro, pick, ri, rnd, roleAt } from "./data.js";
import {
  S,
  ROLE_N,
  app,
  closeSheet,
  crestSVG,
  eff,
  fullName,
  lgName,
  news,
  norm,
  ovr,
  renderMain,
  setTeamVars,
  sheet,
  teamByKey,
  tx
} from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgDribble, mgShoot, mgTiming } from "./games.js";
import { late } from "./late.js";

/** Sezon ortası haftası (normal 14 maç → 8, hızlı 7 maç → 5) */
export const midWeek = () => Math.ceil(((S && S.sched && S.sched.length) || 14) / 2) + 1;

/* ---- Yıldızlar Hafta Sonu ---- */
const CONTESTS = {
  three: { n: "pk.three", d: "pk.threeD", st: "sut" },
  dunk: { n: "pk.dunk", d: "pk.dunkD", st: "guc" },
  skills: { n: "pk.skills", d: "pk.skillsD", st: "hiz" }
};
const eventName = () =>
  S.stage === "lise" ? $t("pk.evLise") : S.stage === "uni" ? $t("pk.evUni") : $t("pk.evPro", { v: lgName() });
export function skillWeekend(done) {
  if (!S || S.skillWk === S.season || S.injury || window.__SIM) return done();
  S.skillWk = S.season;
  save();
  sheet(
    $t("pk.title"),
    eventName(),
    `<p>${$t("pk.intro")}</p><div class="choices">${Object.entries(CONTESTS)
      .map(
        ([k, c]) =>
          `<button class="choice" data-pk="${k}"><span class="ct">${$t(c.n)}</span><span class="cd">${$t(c.d)} · ${late.statName(c.st)} ${Math.round(eff(c.st))}</span></button>`
      )
      .join("")}</div><button class="btn ghost" id="pk-no">${$t("pk.watch")}</button>`,
    { noClose: true }
  );
  $("#pk-no").onclick = () => {
    S.moral += 1;
    norm();
    save();
    closeSheet();
    renderMain();
    done();
  };
  $$("[data-pk]").forEach(b => (b.onclick = () => runContest(b.dataset.pk, done)));
}
async function runContest(k, done) {
  closeSheet();
  arenaFor(null);
  const c = CONTESTS[k],
    e = clamp(eff(c.st) + 12, 5, 100);
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${esc(eventName())}</div><h2>${$t(c.n)}</h2></div><div id="stg"></div><div id="res"></div>`;
  let won, score;
  if (k === "three") {
    const r = await mgShoot($("#stg"), { eff: e, shots: 5, title: $t(c.n), dist: "three", def: false });
    score = r.made;
    won = r.made >= 3;
  } else if (k === "dunk") {
    const r = await mgTiming($("#stg"), { eff: e, tries: 3, title: $t(c.n), label: $t("pk.dunkBtn"), kind: "free" });
    score = r.ok;
    won = r.ok >= 2;
  } else {
    const r = await mgDribble($("#stg"), { eff: e, reps: 3, title: $t(c.n) });
    score = r.ok;
    won = r.ok >= 2;
  }
  const prize = Math.max(20, Math.round((S.wage || 10) * 0.5));
  if (won) {
    late.award("skill", $t("pk.trophy", { c: $t(c.n), e: eventName() }));
    S.followers = Math.round(S.followers * 1.05);
    S.rel.taraf += 4;
    S.moral += 8;
    tx($t("pk.prizeTx"), prize);
    news($t("pk.news", { v: fullName(), c: $t(c.n) }));
    late.sfx("fanfare");
  } else {
    S.moral += 2;
    S.followers = Math.round(S.followers * 1.01);
  }
  norm();
  save();
  Bus.emit("peak", { kind: "skill", k, won });
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><div class="eyebrow">${$t(c.n)}</div><h2 class="${won ? "good" : ""}">${won ? $t("pk.won") : $t("pk.lost")}</h2><p>${$t("pk.score", { v: score })}${won ? ` · +${fmt(prize)}` : ""}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = () => {
    renderMain();
    done();
  };
}

/* ---- Ara transfer dönemi ---- */
const avgNow = () => late.seasonAvg() || 6;
export function midInterest() {
  return S.role === "bench" || S.rel.koc < 35 || (avgNow() >= 7 && S.role !== "star");
}
export function midOffers() {
  const keys = S.league.map(r => r.key).filter(k => k !== S.team.key);
  const n = avgNow() >= 7 ? 2 : 1;
  const out = [];
  const better = S.role === "bench" ? "rot" : S.role === "rot" ? "star" : "star";
  for (const k of keys.sort(() => Math.random() - 0.5)) {
    if (out.length >= n) break;
    const t = teamByKey(k);
    if (!t) continue;
    const r = roleAt(ovr(), S.stage, t.cc);
    const role = r === "bench" ? (S.role === "bench" ? "rot" : r) : better;
    out.push({ key: k, team: t, role, wage: Math.round(S.wage * rnd(1.05, 1.3)), years: ri(1, 2) });
  }
  return out;
}
/** Aynı ligde sezon ortası transfer: fikstürde yeni takımın yerine eski takım gelir */
export function midTransfer(o) {
  const old = S.team,
    prevCity = S.city;
  for (let i = S.week - 1; i < S.sched.length; i++)
    if (S.sched[i] && S.sched[i].opp === o.key) S.sched[i] = { ...S.sched[i], opp: old.key };
  S.team = o.team;
  S.role = o.role;
  S.wage = o.wage;
  S.contract = o.years;
  S.clauses = {};
  S.city = o.team.city;
  S.npc.coach = pick(cOf(S.city).first) + " " + pick(cOf(S.city).last);
  S.rel.koc = 50;
  S.rel.takim = 45;
  if (S.city !== prevCity) {
    S.studying = false;
    if (S.housing === "oda" || S.housing === "yurt") S.housing = "daire";
  }
  S.midTr = S.season;
  news($t("pk.trNews", { v: fullName(), t: o.team.name, o: old.name }));
  setTeamVars();
  norm();
  save();
  Bus.emit("peak", { kind: "transfer", to: o.key });
}
function midWindowSheet() {
  if (
    !S ||
    window.__SIM ||
    !isPro(S.stage) ||
    S.phase !== "regular" ||
    S.week < midWeek() + 1 ||
    S.week > midWeek() + 2 ||
    S.midTr === S.season
  )
    return false;
  S.midTr = S.season;
  if (!midInterest()) {
    save();
    return false;
  }
  const offers = midOffers();
  if (!offers.length) return false;
  save();
  sheet(
    $t("pk.trTitle"),
    $t("pk.trSub", { v: S.npc.agent }),
    `<p>${S.role === "bench" ? $t("pk.trWhyBench") : S.rel.koc < 35 ? $t("pk.trWhyCoach") : $t("pk.trWhyStar")}</p><div class="choices">${offers
      .map(
        (o, i) =>
          `<button class="choice" data-mt="${i}"><span class="ct" style="display:flex;align-items:center;gap:8px">${crestSVG(o.team, 26)}<span>${esc(o.team.name)}</span></span><span class="cd">${esc(o.team.city)} · ${ROLE_N[o.role]} · ${$t("match.63", { wage: fmt(o.wage) })} ${$t("match.64", { years: o.years })}</span><span class="od m">${$t("pk.trMove")}</span></button>`
      )
      .join("")}</div><button class="btn ghost" id="mt-stay">${$t("pk.trStay")}</button>`,
    { noClose: true }
  );
  $$("[data-mt]").forEach(
    b =>
      (b.onclick = () => {
        midTransfer(offers[+b.dataset.mt]);
        closeSheet();
        renderMain();
      })
  );
  $("#mt-stay").onclick = () => {
    S.rel.koc += 3;
    S.rel.takim += 2;
    norm();
    save();
    closeSheet();
    renderMain();
  };
  return true;
}
Bus.offer("week:sheet", midWindowSheet, 11);
