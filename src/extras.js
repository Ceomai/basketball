import { t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { $, $$, Bus, EU_CC, LEAGUES, STATS, cOf, esc, fmt, hash, isPro, pick, rnd, statName, toast, PRIO } from "./data.js";
import { icon } from "./art.js";
import {
  S,
  bindActs,
  closeSheet,
  crestSVG,
  fullName,
  news,
  norm,
  ovr,
  prodHTML,
  renderMain,
  seasonLabel,
  setTeamVars,
  sheet,
  tabsHTML,
  tx,
  weekNo
} from "./core.js";
import { save } from "./save.js";
import { lcg } from "./logic/rng.js";
import { openLoc } from "./places.js";
import { M } from "./match.js";
import { playMatch } from "./engine.js";
/* ================= KUPA İKONLARI ================= */
export function trophyIcon(t) {
  return (
    {
      champ: ["cup"],
      lise: ["cup", "#c0c7cf"],
      mvp: ["plaque"],
      final: ["medal"],
      nat_gold: ["medal", "#d8b25a"],
      nat_silver: ["medal", "#cfd8dc"],
      nat_bronze: ["medal", "#c47a3a"],
      arcade: ["joystick"]
    }[t.type] || ["cup", "#c0c7cf"]
  );
}

/* ================= ARCADE SIRALAMALARI ================= */
// Sunucu olmadığı için rakipler her hafta aynı tohumla üretilir; oyuncunun haftalık ve aylık en iyi skoru listeye yerleşir.
export const ARC_GAMES = {
  arcade: { n: $t("common.hoopMachine"), lo: 6, hi: 17 },
  reflex: { n: $t("common.reflexPanel"), lo: 12, hi: 26 },
  hockey: { n: $t("common.airHockey"), lo: 2, hi: 5 },
  rhythm: { n: $t("common.danceRhythm"), lo: 20, hi: 58 },
  bowling: { n: $t("common.bowling"), lo: 9, hi: 27 }
};
export const seeded = lcg; // src/logic/rng.js
export const weekId = () => weekNo(100),
  monthId = () => S.season * 100 + Math.ceil(S.week / 4);
export function arcState() {
  S.arc = S.arc || { w: weekId(), m: monthId(), wb: {}, mb: {}, won: 0 };
  return S.arc;
}
export function arcSubmit(g, score) {
  const a = arcState();
  a.wb[g] = Math.max(a.wb[g] || 0, score);
  a.mb[g] = Math.max(a.mb[g] || 0, score);
  save();
}
export function arcBoard(g, period) {
  const a = arcState(),
    id = period === "w" ? a.w : a.m,
    G = ARC_GAMES[g],
    rnd2 = seeded(hash(g + period + id + S.city)),
    c = cOf(S.city);
  const bump = period === "m" ? 1.12 : 1;
  const npcs = Array.from({ length: 9 }, (_, i) => ({
    n: `${c.first[Math.floor(rnd2() * c.first.length)]} ${c.last[Math.floor(rnd2() * c.last.length)][0]}.`,
    s: Math.round((G.lo + (G.hi - G.lo) * Math.pow(rnd2(), 1.4)) * bump)
  }));
  const me = (period === "w" ? a.wb : a.mb)[g] || 0;
  return [...npcs, { n: fullName(), s: me, me: true }].sort((x, y) => y.s - x.s || (y.me ? 1 : -1));
}
export function arcRank(g, period) {
  const b = arcBoard(g, period);
  return b.findIndex(r => r.me) + 1;
}
export function arcResolve(period) {
  const a = arcState(),
    best = period === "w" ? a.wb : a.mb,
    mult = Math.max(0.1, (late.ecoPm ? late.ecoPm() : 1) * 0.15), // kariyer seviyesine göre (src/economy.js); lisede harçlığı ezmez
    out = [];
  for (const g of Object.keys(best)) {
    if (!best[g]) continue;
    const r = arcRank(g, period);
    if (r > 3) continue;
    const base = period === "w" ? [25, 15, 8][r - 1] : [120, 60, 30][r - 1];
    tx(
      `${ARC_GAMES[g].n} ${period === "w" ? $t("arcadeBoard.weekly") : $t("arcadeBoard.monthly")} ${$t("arcadeBoard.prize", {
        r: r
      })}`,
      Math.max(1, Math.round(base * mult))
    );
    S.moral += period === "w" ? 3 : 6;
    if (late.mediaGain) late.mediaGain(period === "w" ? 0.01 : 0.03, 2);
    if (period === "m" && r === 1)
      S.career.trophies.push({
        type: "arcade",
        label: $t("arcadeBoard.monthChampion", {
          v: seasonLabel(),
          n: ARC_GAMES[g].n,
          city: S.city
        })
      });
    out.push(`${ARC_GAMES[g].n}: ${r}. (${fmt(base * mult)})`);
  }
  if (out.length)
    news(`${$t("arcadeBoard.arcade")} ${period === "w" ? $t("arcadeBoard.weekly") : $t("arcadeBoard.monthly")} ${$t("arcadeBoard.rankingRewards")} ${out.join(", ")}.`);
  if (period === "w") {
    a.wb = {};
    a.w = weekId();
  } else {
    a.mb = {};
    a.m = monthId();
  }
  return out;
}
export function boardSheet(g = "arcade", period = "w") {
  const b = arcBoard(g, period);
  arcState(); // durum nesnesi hazır olsun (S.arc)
  sheet(
    $t("board.arcadeLeaderboard"),
    `${S.city} · ${period === "w" ? $t("board.week") : $t("board.month")}`,
    `${tabsHTML(
      [
        ["w", $t("common.weekly")],
        ["m", $t("board.monthly")]
      ],
      period,
      "p"
    )}
   <div class="opts" id="gsel">${Object.entries(ARC_GAMES)
     .map(([k, v]) => `<button class="opt ${k === g ? "on" : ""}" data-g="${k}">${v.n}</button>`)
     .join("")}</div>
   <div class="card"><div class="tbl"><table><tr><th>#</th><th>${$t("common.player")}</th><th class="ta-r">${$t("common.score2")}</th></tr>${b.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${esc(r.n)}${r.me && !r.s ? ` <span class="muted small">${$t("board.haventPlayedYet")}</span>` : ""}</td><td class="ta-r">${r.s}</td></tr>`).join("")}</table></div></div>
   <div class="card small"><div class="eyebrow">${$t("board.rewards")}</div><div>${period === "w" ? $t("board.topEndWeek3") : $t("board.topEndMonth3")}</div><div class="muted">${$t("board.rankingsResetEvery")} ${period === "w" ? "hafta" : $t("board.everyWeeks4")} ${$t("board.rewardsGivenWeek")}</div></div>
   <button class="btn pri" id="bkE">${$t("board.backEntertainment")}</button>`
  );
  $$("[data-p]").forEach(x => (x.onclick = () => boardSheet(g, x.dataset.p)));
  $$("#gsel [data-g]").forEach(x => (x.onclick = () => boardSheet(x.dataset.g, period)));
  $("#bkE").onclick = () => openLoc("eglence", "arcade");
}
export function arcBoardCard() {
  arcState();
  const rows = Object.entries(ARC_GAMES)
    .map(([k, v]) => {
      const r = arcRank(k, "w"),
        s = S.arc.wb[k] || 0;
      return `<div class="row between small"><span>${v.n}</span><span>${
        s
          ? `<b>${r}.</b> ${$t("arcadeBoard.rank", {
              s: s
            })}`
          : `<span class="muted">${$t("arcadeBoard.notPlayed")}</span>`
      }</span></div>`;
    })
    .join("");
  return `<div class="card"><div class="row between"><div><div class="eyebrow">${$t("arcadeBoard.weeklyRanking", {
    city: esc(S.city)
  })}</div><h3>${$t("arcadeBoard.rivalryTable")}</h3></div><button class="btn gold sm" id="brd">${$t("arcadeBoard.openTable")}</button></div>${rows}<div class="small muted">${$t("arcadeBoard.topFinishersEarn3")}</div></div>`;
}

/* ================= MİLLİ TAKIM ================= */
export const NAT = {
  TR: { c1: "#e30a17", c2: "#ffffff", str: 1.0, s: $t("national.tur") },
  ES: { c1: "#c60b1e", c2: "#ffc400", str: 1.08, s: $t("national.esp") },
  IT: { c1: "#0064aa", c2: "#ffffff", str: 0.98, s: $t("national.ita") },
  FR: { c1: "#0055a4", c2: "#ffffff", str: 1.05, s: $t("national.fra") },
  DE: { c1: "#f4f4f4", c2: "#141414", str: 1.02, s: $t("national.ger") },
  GR: { c1: "#0d5eaf", c2: "#ffffff", str: 1.03, s: $t("national.gre") },
  RS: { c1: "#c6363c", c2: "#0c4076", str: 1.08, s: $t("national.srb") },
  LT: { c1: "#fdb913", c2: "#006a44", str: 1.0, s: $t("national.ltu") },
  US: { c1: "#0a3161", c2: "#b31942", str: 1.22, s: $t("common.usa") }
};
export const CAPITAL = {
  TR: "İstanbul",
  ES: "Madrid",
  IT: "Roma",
  FR: "Paris",
  DE: "Berlin",
  GR: "Atina",
  RS: "Belgrad",
  LT: "Kaunas",
  US: "New York"
};
export function natCat(age = S.age) {
  return age <= 17 ? "U18" : age <= 19 ? "U20" : "A";
}
export function natTeam(cc, cat) {
  const key = `nat|${cc}|${cat}`;
  if (S.teams[key]) return S.teams[key];
  const n = NAT[cc];
  const t = {
    key,
    name:
      cat === "A"
        ? $t("national.nationalTeam", {
            n: LEAGUES[cc].n
          })
        : $t("national.nationalTeam2", {
            n: LEAGUES[cc].n,
            cat: cat
          }),
    short: n.s,
    city: CAPITAL[cc],
    cc,
    kind: "nat",
    c1: n.c1,
    c2: n.c2,
    str: n.str * (cat === "A" ? 1.05 : 1)
  };
  S.teams[key] = t;
  return t;
}
export function natPotential(avg) {
  return ovr() + (avg - 6) * 5 + Math.min(4, S.career.trophies.length);
}
export function natSelected(avg, cat) {
  const need = { U18: 38, U20: 47, A: 69 }[cat];
  if (cat === "A" && (!isPro(S.stage) || late.ambNatRetired())) return false; // veda eden kaptan (src/ambition.js)
  return natPotential(avg) >= need;
}
// Milli maçı oynatmak için kulüp takımı geçici olarak milli takımla değiştirilir, maç bitince geri alınır.
export function natMatch(cat, opp, label, after, auto = false) {
  const club = S.team,
    us = natTeam("TR", cat);
  S._club = club;
  S.team = us;
  setTeamVars();
  const role = natPotential(late.seasonAvg()) >= { U18: 44, U20: 53, A: 76 }[cat] ? "star" : "rot";
  playMatch({
    opp,
    home: Math.random() < 0.5,
    comp: "nat",
    label,
    role,
    auto,
    onEnd: win => {
      const r = M.rating,
        line = { pts: M.pts, ast: M.ast, reb: M.reb, us: M.us, them: M.them };
      S.team = club;
      delete S._club;
      setTeamVars();
      S.career.natCaps = (S.career.natCaps || 0) + 1;
      S.career.natPts = (S.career.natPts || 0) + line.pts;
      S.followers += Math.round(S.followers * (r >= 7 ? 0.08 : 0.03));
      S.rel.taraf += r >= 7 ? 5 : 1;
      S.moral += win ? 8 : -4;
      S.energy -= 15;
      norm();
      save();
      news(
        $t("national.ptsRating", {
          name: us.name,
          us: line.us,
          them: line.them,
          name2: opp.name,
          v: fullName(),
          pts: line.pts,
          v2: r.toFixed(1)
        })
      );
      sheet(
        win ? $t("national.nationalTeamWin") : $t("national.nationalTeamLoss"),
        label,
        `<div class="row between nowrap"><div class="row nowrap gap-2">${crestSVG(us, 36)}<span class="big-num">${line.us}–${line.them}</span>${crestSVG(opp, 36)}</div><div class="ta-r"><div class="eyebrow">${$t("common.rating")}</div><div class="rating">${r.toFixed(1)}</div></div></div>
      <div class="box"><div><b>${line.pts}</b><span class="eyebrow">${$t("common.score")}</span></div><div><b>${line.ast}</b><span class="eyebrow">${$t("common.assists")}</span></div><div><b>${line.reb}</b><span class="eyebrow">${$t("common.rebound")}</span></div><div><b>${S.career.natCaps}</b><span class="eyebrow">${$t("common.nationalTeamGame")}</span></div></div>
      <div class="say">${win ? pick([$t("national.crescentStarFlags"), $t("national.wholeLockerRoom")]) : pick([$t("national.headsHeldHigh"), $t("national.meetingCoachSaid")])}</div>
      <button class="btn pri" id="nok">${$t("common.continue")}</button>`,
        { noClose: true }
      );
      $("#nok").onclick = () => after(win, r);
    }
  }).catch(late.matchFail);
}
export function camp(cat, title, after) {
  S.npc.natCoach = S.npc.natCoach || `${pick(LEAGUES.TR.first)} ${pick(LEAGUES.TR.last)}`;
  sheet(
    $t("camp.nationalTeamCamp"),
    title,
    `<div class="chapter"><div class="hd" style="background:#e30a17;color:#fff"><div class="eyebrow" style="color:inherit;opacity:.8">${cat === "A" ? $t("camp.nationalTeam") : cat + $t("camp.nationalTeam2")}</div><h2 style="font-size:var(--fs-8xl)">${$t("camp.invitationReceived")}</h2></div><div class="bd">
   <p>${$t("camp.callFederationNational", {
     natCoach: esc(S.npc.natCoach)
   })} ${cat === "A" ? $t("camp.nationalTeam") : cat + $t("camp.nationalTeam2")} ${$t("camp.squadWhenHeard", {
     mom: S.npc.mom,
     dad: S.npc.dad
   })}</p>
   <div class="eyebrow">${$t("camp.whatCamp")}</div><div class="pgrid">${[
     {
       id: "c1",
       ic: icon("whistle"),
       t: $t("camp.tacticsSession"),
       d: $t("camp.learnCoachsSystem"),
       fx: [[$t("camp.randomAttributePlus2"), "p"]],
       btn: $t("common.select")
     },
     {
       id: "c2",
       ic: icon("chat"),
       t: $t("camp.teamSpiritNight"),
       d: $t("camp.talkRoommateUntil"),
       fx: [[$t("common.moralePlus10"), "p"]],
       btn: $t("common.select")
     },
     {
       id: "c3",
       ic: icon("ball"),
       t: $t("camp.extraShootingSession"),
       d: $t("camp.gymAfterEveryones"),
       fx: [
         [$t("camp.shootingPlus2"), "p"],
         [$t("common.energyMinus8"), "n"]
       ],
       btn: $t("common.select")
     }
   ]
     .map(prodHTML)
     .join("")}</div></div></div>`,
    { noClose: true }
  );
  const go = () => {
    norm();
    save();
    closeSheet();
    late.ambCaptainCall(cat, after); // kaptansan kamp sonu kaptan kararı (src/ambition.js)
  };
  bindActs({
    c1: () => {
      const k = pick(STATS)[0];
      S.st[k] += 2;
      toast(`${statName(k)} +2`);
      go();
    },
    c2: () => {
      S.moral += 10;
      go();
    },
    c3: () => {
      S.st.sut += 2;
      S.energy -= 8;
      go();
    }
  });
}
// FIBA arası: sezonun 4. haftasından sonra, yalnızca A Milli Takım
export function fibaWindow(done) {
  const cat = natCat();
  if (S.injury || cat !== "A" || S.natWin === S.season || !natSelected(late.seasonAvg(), cat)) {
    done();
    return;
  }
  S.natWin = S.season;
  const opp = natTeam(pick(EU_CC.filter(c => c !== "TR")), "A");
  camp(cat, $t("national.fibaWorldCup"), () =>
    natMatch(cat, opp, $t("national.fibaWorldCup2"), () => {
      renderMain();
      done();
    })
  );
}
// Yaz turnuvası: sezon sonunda, gençlerde U18/U20 Avrupa Şampiyonası, büyüklerde EuroBasket / Dünya Kupası
export function summerTournament(avg, done) {
  if (window.__TEST && window.__TEST.noSummer) {
    done();
    return;
  }
  const cat = natCat(S.age - 1);
  if (S.injury || !natSelected(avg, cat)) {
    done();
    return;
  }
  const name =
    cat === "U18"
      ? $t("tournament.u18European")
      : cat === "U20"
        ? $t("tournament.u20European")
        : S.year % 4 === 3
          ? $t("tournament.fibaWorldCup")
          : S.year % 4 === 1
            ? $t("tournament.eurobasket")
            : $t("tournament.olympicQualifiers");
  // son turlarda güçlü rakipler
  const pool = [...EU_CC.filter(c => c !== "TR"), ...(cat === "A" && name === $t("tournament.fibaWorldCup") ? ["US"] : [])].sort(
    (a, b) => NAT[a].str - NAT[b].str + rnd(-0.04, 0.04)
  );
  pool.splice(0, pool.length - 4);
  // turnuva artık peş peşe maç değil: grup + eleme, maç aralarında dinlenme/antrenman (src/natcup.js)
  camp(cat, name, () => late.natTourney(cat, name, pool, done));
}

/* ================= HAFTA GEÇİŞ KANCALARI ================= */
// endWeek sonunda çağrılır: arcade ödülleri ve sezon ortası FIBA arası
export function weeklyHooks() {
  const got = [...arcResolve("w")];
  if ((S.week - 1) % 4 === 0) got.push(...arcResolve("m"));
  if (got.length) {
    save();
    toast(
      `${$t("hooks.arcadeReward", {
        v: got[0]
      })}${got.length > 1 ? $t("hooks.above") : ""}`
    );
  }
  if (S.chips != null && S.chips < 100) {
    S.freeChips = Math.min(100, Math.min(S.freeChips || 0, S.chips) + (100 - S.chips)); // teselli fişi: oynanır ama bozdurulamaz
    S.chips = 100;
  }
  Bus.emit("week:start");
  save(); // hafta başı işleyicilerinin değişiklikleri (ücretler, gelirler, ilişkiler) yeniden açılışta kaybolmasın
  // haftada en fazla bir panel; sağlayıcılar öncelik sırasıyla sorulur. Arka arkaya en fazla 2 zorunlu panel (aşama 3.3):
  // maç sonrası olay çıktıysa (sonuç + olay = 2) yalnız zamana bağlı, ertelenirse kaçacak paneller ("now": senaryo, gala,
  // kamp, yeni forma, sezon hedefleri, sezon ortası, ara transfer, derbi öncesi basın) gelir; açılış, özellik, hikâye vb.
  // koşulları sürdüğü için sonraki haftalarda gelir. Etkisi olan bilgi panelleri (derbi şehir hikâyesi) etkiyi
  // panelden bağımsız uygular (src/derby.js dbyCityApply)
  const quiet = S.evRecent;
  S.evRecent = 0;
  Bus.first("week:sheet", quiet ? o => o.tag === "now" : 999);
}
// sezon ortası (normalde 8., hızlı kariyerde 5. hafta): All-Star seçilen üst lig oyuncusu All-Star'a, diğer herkes
// Yıldızlar Hafta Sonu beceri yarışmalarına (src/peaks.js); ardından milli takım penceresi
Bus.offer(
  "week:sheet",
  () => {
    // aynı hafta başka bir panel öne geçerse bir sonraki hafta gelir
    if (S.week < late.midWeek() || S.week > late.midWeek() + 1 || S.phase !== "regular") return false;
    if (late.allStarEligible()) late.allStar(() => fibaWindow(() => {}));
    else if (S.skillWk !== S.season && S.allStar !== S.season) late.skillWeekend(() => fibaWindow(() => {}));
    else if (S.week === late.midWeek()) fibaWindow(() => {});
    else return false;
    return true;
  },
  PRIO.midSeason,
  "now"
);

/* Yerel hikâye ve mizah olayları artık veri olarak src/content/events.tr.js içinde. */
