import { t as $t } from "./i18n/index.js";
import { dominanceOf, eligibleStages, matchBonus, offerWage, potentialScore, weeklyLedger } from "./logic/rules.js";
import { late } from "./late.js";
import {
  $,
  $$,
  BAL,
  Bus,
  EU_CC,
  LEAGUES,
  ORDER,
  POS,
  SIM,
  STATS,
  WAGE,
  cOf,
  clamp,
  esc,
  fmt,
  hash,
  isPro,
  kfmt,
  leagueName,
  pick,
  ri,
  rnd,
  roleAt,
  tdOf,
  toast
} from "./data.js";
import { leaguePool } from "./clubs.js";
import { SKINS, portrait } from "./art.js";
import { mgBlock, mgDribble, mgPass, mgPost, mgRebound, mgShoot, mgTiming } from "./games.js";
import {
  ROLE_N,
  S,
  app,
  chapter,
  closeSheet,
  crestSVG,
  eff,
  fame,
  fullName,
  jersey,
  lgName,
  makeTeam,
  newSeasonLeague,
  news,
  norm,
  ovr,
  phaseName,
  renderMain,
  seasonLabel,
  setTeamVars,
  sheet,
  standings,
  teamByKey,
  tx,
  weekNo
} from "./core.js";
import { renderSlots, save } from "./save.js";
import { HOUSING } from "./places.js";
import { carUpkeep, itemWeekly } from "./shops.js";
import { brandText } from "./brand.js";
import { mulberry32, seedHash } from "./logic/rng.js";
import { buyoutFee } from "./logic/career.js";
import { SHOT_MID, SHOT_THREE } from "./logic/shots.js";
/* ================= MAÇ ================= */
export let M = null;
export function bugHTML() {
  const us = S.team,
    op = M.opp;
  const L = M.home ? [us, M.us, op, M.them] : [op, M.them, us, M.us];
  return `<div class="bug"><div class="side"><span class="stripe" style="background:${L[0].c1}"></span><div class="minw-0"><div class="ab">${esc(L[0].short)}</div><div class="full">${esc(L[0].name)}</div></div><div class="sc">${L[1]}</div></div>
   <div class="mid"><div class="q">${$t("common.q", { n: M.q })}</div><div class="clk">${M.clock}</div></div>
   <div class="side r"><span class="stripe" style="background:${L[2].c1}"></span><div class="minw-0"><div class="ab">${esc(L[2].short)}</div><div class="full">${esc(L[2].name)}</div></div><div class="sc">${L[3]}</div></div></div>`;
}
export function updBug() {
  if (M && M.silent) return; // simüle maç (AUTO): ekran sonda bir kez çizilir (src/engine.js drawSilent)
  const b = $("#bug");
  if (b) b.innerHTML = bugHTML();
  if (late.a11yScore) late.a11yScore(); // ekran okuyucu için canlı skor (src/a11y.js)
}
export const odds = e => (e >= 55 ? ["e", $t("match.easy")] : e >= 32 ? ["m", $t("common.medium")] : ["h", $t("match.hard")]);
export const FEED_MAX = 40; // akışta (DOM + M.feed) tutulan en çok satır; eskiler düşer
export const feedRowHTML = x => `<div><time>${x.t}</time><span>${x.x}</span></div>`;
export function addFeed(t) {
  M.feed.unshift({ t: `${$t("common.q", { n: M.q })} ${M.clock}`, x: t });
  if (M.feed.length > FEED_MAX) M.feed.length = FEED_MAX;
  if (M.silent) return; // simüle maç: DOM'a sonda bir kez yazılır
  const f = $("#feed");
  if (!f) return;
  // yalnız yeni satır eklenir (eskiden her satırda tüm akış yeniden yazılıyordu: uzun maçta O(n²))
  if (f.firstElementChild) f.firstElementChild.className = "";
  f.insertAdjacentHTML("afterbegin", feedRowHTML(M.feed[0]));
  // yalnız yeni (en üstteki) satır kısa bir kayma + belirme ile gelir (index.html .feed>div.fin)
  f.firstElementChild.className = "fin";
  while (f.childElementCount > FEED_MAX) f.lastElementChild.remove();
}
export const PEN = {
  pull: 6,
  catch: 4,
  wing: 5,
  step: 2,
  pop: 2,
  lob: -4,
  pnr: 0,
  kick: -6,
  corner: 7,
  top3: 11,
  float: 5,
  mid: 4,
  lay: 3
};
// Basket faul: sayı geçerli, bir serbest atış
async function andOne(el, sur, dn, st, w) {
  addFeed($t("play.gotPastFinished", { sur, dn }));
  M.and1 = (M.and1 || 0) + 1;
  M.fta = (M.fta || 0) + 1; // basket faul serbest atışı (src/court.js trackPlay sayının kendisini sayar)
  const f = await mgTiming(el, { eff: eff("sut") + 10, title: $t("play.andOne"), tries: 1, label: $t("common.shoot") });
  M.pts += f.ok;
  M.ftm = (M.ftm || 0) + f.ok;
  return { good: true, w, st, txt: f.ok ? $t("play.oneCompleted") : $t("play.freeThrowMissed") };
}
export async function resolvePlay(k, el, sur, dn) {
  const three = SHOT_THREE,
    mid = SHOT_MID;
  if (three.includes(k) || mid.includes(k)) {
    const th = three.includes(k);
    const r = await mgShoot(el, {
      eff: eff("sut") - (PEN[k] || 0),
      shots: 1,
      title: th ? $t("play.threePointer") : $t("play.midRange"),
      dist: th ? "three" : "mid"
    });
    M.pts += r.pts;
    return {
      good: r.made > 0,
      w: th ? 1.3 : 1,
      st: "sut",
      txt: r.made
        ? `${sur} ${th ? $t("play.hitThree") : $t("play.twoPointsMid")}`
        : $t("common.missedShot", {
            sur: sur
          })
    };
  }
  if (k === "drive" || k === "break" || k === "lay") {
    const r = await mgDribble(el, {
      eff: eff("hiz") - (PEN[k] || 0),
      reps: 1,
      title: k === "break" ? $t("common.fastBreak") : k === "lay" ? $t("pl.lay") : $t("play.driveRim")
    });
    if (!r.ok) {
      // penetrede hücum faulü: kişisel faul sayılır
      const of = k !== "break" && Math.random() < 0.15 ? late.addFoul() : "";
      return {
        good: false,
        w: 1,
        st: "hiz",
        txt: of ? `${$t("m2.charge", { sur })}${of}` : $t("common.turnedBall", { sur: sur })
      };
    }
    if (k === "break") {
      M.pts += 2;
      return {
        good: true,
        w: 1.2,
        st: "hiz",
        txt: $t("common.finishedFastBreak", {
          sur: sur
        })
      };
    }
    if (Math.random() < (k === "lay" ? 0.12 : 0.18)) {
      M.pts += 2;
      addFeed(
        $t("play.gotPastFinished", {
          sur: sur,
          dn: dn
        })
      );
      const f = await mgTiming(el, { eff: eff("sut") + 10, title: $t("play.andOne"), tries: 1, label: $t("common.shoot") });
      M.pts += f.ok;
      return { good: true, w: 1.2, st: "hiz", txt: f.ok ? $t("play.oneCompleted") : $t("play.freeThrowMissed") };
    }
    if (Math.random() < 0.88) {
      M.pts += 2;
      return {
        good: true,
        w: 1,
        st: "hiz",
        txt: $t("play.blewPastFinished", {
          sur: sur,
          dn: dn
        })
      };
    }
    return {
      good: true,
      w: 0.6,
      st: "hiz",
      txt: $t("play.beatManLayup", {
        sur: sur
      })
    };
  }
  if (k === "pnr" || k === "kick" || k === "lob") {
    const r = await mgPass(el, {
      eff: eff("pas") - (PEN[k] || 0),
      reps: 1,
      title: k === "lob" ? $t("common.alleyOopPass") : k === "pnr" ? $t("play.pickRoll") : $t("common.passing")
    });
    if (!r.ok)
      return {
        good: false,
        w: 1,
        st: "pas",
        txt: $t("play.sPassIntercepted", {
          sur: sur
        })
      };
    const conv = (k === "lob" ? 0.75 : 0.58) + S.rel.takim * 0.003 + (late.chemAvg() - 40) * 0.002;
    if (Math.random() < conv) {
      M.ast++;
      return {
        good: true,
        w: k === "lob" ? 1.3 : 1,
        st: "pas",
        txt:
          k === "lob"
            ? $t("play.lobBigMan", {
                sur: sur
              })
            : $t("play.findsOpenMan", {
                sur: sur
              })
      };
    }
    return {
      good: true,
      w: 0.6,
      st: "pas",
      txt: $t("play.madeNicePass", {
        sur: sur
      })
    };
  }
  if (k === "post") {
    const r = await mgPost(el, { eff: eff("guc"), reps: 1, title: $t("common.post") });
    if (r.ok) M.pts += 2;
    if (r.ok && Math.random() < 0.1 * late.refAnd1()) return andOne(el, sur, dn, "guc", 1.3);
    return {
      good: r.ok > 0,
      w: 1.2,
      st: "guc",
      txt: r.ok
        ? $t("play.backedDownFinished", {
            sur: sur,
            dn: dn
          })
        : $t("play.sHookRolled", {
            sur: sur
          })
    };
  }
  if (k === "dunk") {
    const r = await mgTiming(el, { eff: eff("guc") + 5, title: $t("common.alleyOopDunk"), tries: 1, label: $t("common.jump"), kind: "dunk" });
    if (r.ok) M.pts += 2;
    if (r.ok && Math.random() < 0.08 * late.refAnd1()) return andOne(el, sur, dn, "guc", 1.4);
    return {
      good: r.ok > 0,
      w: 1.3,
      st: "guc",
      txt: r.ok
        ? $t("play.slammedHomeAlley", {
            sur: sur
          })
        : $t("play.hitRimDunk", {
            sur: sur
          })
    };
  }
  if (k === "putback" || k === "reb") {
    const r = await mgRebound(el, { eff: eff("guc"), reps: 1, title: k === "reb" ? $t("common.defensiveRebound") : $t("common.offensiveRebound") });
    if (r.ok) {
      M.reb++;
      if (k === "reb") {
        M.stops++;
        return {
          good: true,
          w: 1,
          st: "guc",
          txt: $t("play.grabbedRebound", {
            sur: sur
          })
        };
      }
      if (Math.random() < 0.8) {
        M.pts += 2;
        return {
          good: true,
          w: 1.2,
          st: "guc",
          txt: $t("play.finishedOffensive", {
            sur: sur
          })
        };
      }
      return {
        good: true,
        w: 0.6,
        st: "guc",
        txt: $t("play.gotReboundCouldnt", {
          sur: sur
        })
      };
    }
    return {
      good: false,
      w: 1,
      st: "guc",
      txt: $t("play.grabbedRebound2", {
        dn: dn
      })
    };
  }
  if (k === "block") {
    const r = await mgBlock(el, { eff: (eff("sav") + eff("guc")) / 2, reps: 1, title: $t("common.block") });
    if (r.ok) {
      M.blk++;
      M.stops++;
    }
    return {
      good: r.ok > 0,
      w: 1.2,
      st: "sav",
      txt: r.ok
        ? $t("play.massiveBlock", {
            sur: sur,
            dn: dn
          })
        : $t("play.foundBasket", {
            dn: dn
          })
    };
  }
  if (k === "steal") {
    const r = await mgTiming(el, {
      eff: eff("hiz") - 6,
      title: $t("play.steal"),
      tries: 1,
      label: $t("common.reach"),
      kind: "steal"
    });
    if (r.ok) M.stl++;
    return {
      good: r.ok > 0,
      w: 1.2,
      st: "hiz",
      txt: r.ok
        ? $t("play.stoleBallTwo", {
            sur: sur
          })
        : $t("play.fouledLine", {
            sur: sur,
            dn: dn
          })
    };
  }
  if (k === "charge") {
    const ok = Math.random() < clamp((eff("sav") / 100) * 0.6 + 0.15, 0.1, 0.75);
    if (ok) M.stops++;
    return {
      good: ok,
      w: 1.1,
      st: "sav",
      txt: ok
        ? $t("play.stoodGroundDrew", {
            sur: sur
          })
        : $t("play.refereeCalledBlocking")
    };
  }
  if (k === "safe") {
    const ok = Math.random() < clamp((eff(S.pos === "PF" ? "guc" : "sav") / 100) * 0.7 + 0.25, 0.2, 0.9);
    if (ok) M.stops++;
    return {
      good: ok,
      w: 0.5,
      st: "sav",
      txt: ok
        ? $t("play.heldPositionTook", {
            sur: sur,
            dn: dn
          })
        : $t("play.foundBasket", {
            dn: dn
          })
    };
  }
  const n = k === "free3" ? 3 : 2; // üçlükte faul: 3 serbest atış
  const r = await mgTiming(el, { eff: eff("sut") + 12, title: $t("common.freeThrow"), tries: n, label: $t("common.shoot") });
  M.pts += r.ok;
  return {
    good: r.ok > 0,
    w: 0.6,
    st: "sut",
    txt: n === 3 ? $t("m2.ft3", { sur, ok: r.ok }) : $t("play.hitFreeThrows2", { sur: sur, ok: r.ok })
  };
}
export function finishMatch(win) {
  late.duelSettle(); // rakip yıldız düellosu (src/matchday.js)
  Bus.emit("match:end", { win, rating: M.rating, pts: M.pts, auto: !!M.auto, stage: S.stage, us: M.us, them: M.them });
  late.recordGame();
  late.sfx(win ? "win" : "lose");
  const r = M.rating,
    opp = M.opp;
  S.buffs.motive = 0;
  S.buffs.scoutK = null; // video analizi avantajı tek maçlık (src/agent.js)
  late.matchStatGains(M); // maç istatistiğine göre ondalık gelişim (src/progress.js)
  const bonus = matchBonus({ stage: S.stage, wage: S.wage, rating: r, win });
  if (S.clauses && S.clauses.perf && r >= 7.5) tx($t("result.performanceBonus"), Math.round(S.wage * 0.15));
  // önemli maçı kendin oynadıysan: taraftar ve takipçi (kazanınca daha çok)
  if (M.big && !M.auto) {
    S.rel.taraf += win ? 4 : 2;
    S.followers = Math.round(S.followers * (win ? 1.05 : 1.02));
    news($t("big.news", { v: fullName(), label: M.big.label }));
  }
  tx(
    $t("result.matchBonus2", {
      short: opp.short
    }),
    bonus
  );
  S.rel.koc += Math.round((r - 6) * 3);
  S.rel.taraf += Math.round((r - 5.5) * 2 + (win ? 2 : 0));
  S.rel.takim += win ? 3 : -1;
  S.moral += win ? 6 : -6;
  S.energy -= 22;
  S.followers += Math.round(S.followers * (r >= 8 ? 0.06 : r >= 7 ? 0.03 : 0.005) * (win ? 1.3 : 1));
  S.results.push({ opp: opp.key, us: M.us, them: M.them, win, rating: r, pts: M.pts });
  const k = S.career;
  Object.assign(k, {
    games: k.games + 1,
    pts: k.pts + M.pts,
    ast: k.ast + M.ast,
    reb: (k.reb || 0) + M.reb,
    blk: k.blk + M.blk,
    wins: k.wins + (win ? 1 : 0)
  });
  const rankBefore = late.rankNow();
  if (S.phase === "regular") late.updateLeague(win, opp, M.us, M.them);
  // skor ve maç istatistiği Lig merkezinde (fikstür); gündeme yalnızca anlamlı olaylar düşer
  late.matchStoryNews({ win, pts: M.pts, ast: M.ast, reb: M.reb, rankBefore });
  const inj = late.rollInjury();
  norm();
  save();
  const coach = r >= 8 ? $t("result.bestPlayerCourt") : r >= 6.5 ? $t("result.goodJobNeed") : r >= 5 ? $t("result.averageWellTalk") : $t("result.performanceMinutesDrop");
  // basın toplantısı bu maçta varsa sonuç panelinin altında (tek ekran; src/story.js pressInlineHTML)
  const pressHTML = late.pressInlineHTML(win);
  sheet(
    win ? $t("common.win") : $t("common.loss"),
    `${phaseName()} · ${opp.name}`,
    `
   <div class="row between nowrap"><div class="row nowrap gap-2">${crestSVG(S.team, 36)}<span class="big-num">${M.us}–${M.them}</span>${crestSVG(opp, 36)}</div><div class="ta-r"><div class="eyebrow">${$t("result.matchRating")}</div><div class="rating" style="color:${r >= 7 ? "var(--good)" : r >= 5 ? "var(--text)" : "var(--bad)"}">${r.toFixed(1)}</div></div></div>
   <div class="box"><div><b>${M.pts}</b><span class="eyebrow">${$t("common.score")}</span></div><div><b>${M.ast}</b><span class="eyebrow">${$t("common.assists")}</span></div><div><b>${M.reb}</b><span class="eyebrow">${$t("common.rebound")}</span></div><div><b>${M.blk + M.stl}</b><span class="eyebrow">${$t("result.blocksSteals")}</span></div></div>
   <div class="who"><div id="cp"></div><div><div class="eyebrow">${$t("common.coach", {
     coach: esc(S.npc.coach)
   })}</div><div class="say">${coach}</div></div></div>
   <div class="kv"><span>${$t("common.minutes")}</span><b>${$t("result.minPlusMinus", {
     v: Math.round((M.mins || 0) / 60),
     v2: (M.plus || 0) >= 0 ? "+" : "",
     v3: M.plus || 0
   })}</b><span>${$t("result.matchBonus")}</span><b class="good">+${fmt(bonus)}</b><span>${$t("common.relationshipCoach")}</span><b>${S.rel.koc}</b><span>${$t("common.followers")}</span><b>${kfmt(S.followers)}</b>${late.trustHTML(M)}<span>${$t("pf.label")}</span><b class="${M.fo ? "bad" : ""}">${M.pf || 0}${M.fo ? ` · ${$t("pf.outShort")}` : ""}</b></div>
   ${
     inj
       ? `<div class="say bad"><b>${$t("result.injury")}</b> ${$t("result.weeks", {
           n: esc(inj.n),
           w: inj.w
         })}</div>`
       : ""
   }
   ${late.reportHTML()}
   ${late.duelHTML()}
   ${late.gainsHTML()}
   ${late.adDoubleHTML(bonus)}${pressHTML}<button class="btn pri" id="nx"${pressHTML ? " hidden" : ""}>${$t("common.continue")}</button>`,
    { noClose: true }
  );
  const cl = LK.coach();
  cl[1].mood = r >= 6.5 ? "mutlu" : "kizgin";
  $("#cp").appendChild(portrait(cl[0], cl[1]));
  late.bindAdDouble(bonus);
  $("#nx").onclick = () => late.adsBetween(() => afterMatch(win));
  if (pressHTML)
    late.bindPressInline(win, () => {
      const nx = $("#nx");
      nx.hidden = false;
      try {
        nx.focus({ preventScroll: true });
      } catch (e) {
        /* odak yok */
      }
    });
}
// Maç sonrası: önce ara katmanlar (basın toplantısı, derbi), sonra lig akışı
export function afterMatch(win) {
  // hafta içi kupa/Avrupa maçları lig maçından sonra, hafta bitmeden (src/comps.js)
  Bus.run("match:after", { win }, () => late.midweek(() => afterMatchFlow(win)));
}
export function afterMatchFlow(win) {
  const weekly = () => endWeek();
  let next = weekly;
  if (S.phase === "regular" && S.week >= S.sched.length) {
    const st = standings(),
      rank = st.findIndex(r => r.key === S.team.key) + 1;
    if (rank <= 4) {
      const oi = [3, 2, 1, 0][rank - 1];
      S.phase = "semi";
      S.playoffOpp = st[oi].key;
      S._otherSemi = [0, 1, 2, 3].filter(i => i !== rank - 1 && i !== oi).map(i => st[i].key);
      late.poStart(st, rank, S.playoffOpp, S._otherSemi);
      news(
        $t("result.finishedRegularSeason", {
          short: S.team.short,
          rank: rank
        })
      );
    } else {
      news(
        $t("result.finishedSeasonPlace", {
          short: S.team.short,
          rank: rank
        })
      );
      next = () => seasonEnd(false, false);
    }
  } else if ((S.phase === "semi" || S.phase === "final") && late.serStep(win) === "cont") {
    next = () => late.serNext(); // play-off serisi sürüyor: aynı hafta içinde sıradaki maç (src/series.js)
  } else if (S.phase === "semi") {
    win = late.serWon(win);
    if (win) {
      S.phase = "final";
      const o = S._otherSemi,
        a = teamByKey(o[0]),
        b = teamByKey(o[1]);
      S.playoffOpp = Math.random() < a.str / (a.str + b.str) ? a.key : b.key;
      late.poSemi(true, S.playoffOpp);
      news(
        `${$t("result.finalOpponent", {
          short: S.team.short
        })} ${teamByKey(S.playoffOpp).name}.`
      );
    } else {
      late.poSemi(false, null);
      news(
        $t("result.knockedSemiFinals", {
          short: S.team.short
        })
      );
      next = () => seasonEnd(true, false);
    }
  } else if (S.phase === "final") {
    win = late.serWon(win);
    late.poFinal(win);
    news(
      win
        ? $t("result.champions", {
            name: S.team.name
          })
        : $t("result.lostFinal", {
            name: S.team.name
          })
    );
    next = () => seasonEnd(true, win, true);
  }
  if (S.phase === "regular" && S.week === 5 && S.stage === "uni" && !S.clubDeal && !S.tryout) {
    const avg = late.seasonAvg();
    if (ovr() >= 32 || avg >= 6) {
      const stg = ovr() >= 40 ? "t2" : "t3",
        cc = pick(EU_CC),
        club = pick(leaguePool(stg, cc));
      S.tryout = { club: club.key, stage: stg, until: S.sched.length, done: false };
      news($t("lc.nTryout", { club: club.name, league: leagueName(stg, cc) }));
      save();
      const go = next;
      return chapter("tryout", () => maybeEvent(go));
    }
  }
  if (next !== weekly) return next(); // sezon sonu / play-off: olay yok, geçiş panelleri yeterince kalabalık
  maybeEvent(next);
}
// window.__TEST.noEvents: duman testinde rastgele olaylar kapatılır
// Rastgele olay: haftaların yaklaşık üçte birinde; aynı olay 4 sezon (60 hafta) içinde tekrar çıkmaz
export const weekIndex = () => weekNo(20);
export function maybeEvent(next) {
  if (!(window.__TEST && window.__TEST.noEvents) && Math.random() < 0.35) randomEvent(next);
  else next();
}
export function endWeek() {
  S.week++;
  S.slot = 3;
  const h = HOUSING[S.housing];
  for (const it of weeklyLedger({
    stage: S.stage,
    wage: S.wage * late.modeWageMul(),
    rent: h.rent,
    rentLabel: h.n,
    upkeep: carUpkeep(),
    income: itemWeekly("inc")
  }))
    tx(it.key ? $t(it.key, it.v) : it.label, it.amount);
  S.energy += 26 + h.en + itemWeekly("en") + Math.round((S.moral - 50) / 10) + late.comfortEnergy();
  S.moral += (h.mo || 0) + itemWeekly("mo");
  if (S.partner) {
    S.rel.partner -= 4;
    if (S.rel.partner <= 10) {
      news(
        $t("week.split", {
          v: fullName(),
          partner: S.partner
        })
      );
      toast(
        $t("week.endedRelationship", {
          partner: S.partner
        })
      );
      S.partner = null;
      S.rel.partner = 0;
      S.moral -= 15;
    }
  }
  late.sponsorWeekly(); // haftalık sponsor ödemesi (src/agent.js)
  S.rel.aile -= 2;
  S.rel.ark -= 2;
  // moral kendiliğinden bir taban değere döner (galibiyetlerin morali sonsuza dek taşımaması için); taban konfora bağlı
  S.moral += (late.moraleBase() - S.moral) * 0.15;
  // aile ve arkadaşlar: ilişki düştükçe moral her hafta belirgin düşer (aileyle vakit geçirmenin karşılığı)
  S.moral += (S.rel.aile - 50) / 12 + (S.rel.ark - 50) / 20 - (S.rel.aile < 30 ? 3 : 0) - (S.rel.aile < 15 ? 3 : 0);
  if (S.studying && !S.studied) S.aka -= 3;
  S.studied = false;
  late.healTick();
  if (S.money < 0) {
    S.moral -= 6;
    toast($t("week.accountOverdrawnWatch"));
  }
  if (S.tryout && !S.tryout.done && S.week > S.tryout.until) {
    S.tryout.done = true;
    news($t("week.tryoutDatePassed"));
  }
  norm();
  save();
  renderMain();
  late.weeklyHooks();
}

/* ================= OLAYLAR ================= */
export const LK = {
  friend: () => [
    { skin: SKINS[hash(S.npc.friend) % 4], hatStyle: "bere", hat: "#2d8a3e", pom: "#f4c534" },
    { jersey: "#e2741f", sleeves: true, gloves: "#2d8a3e", mood: "mutlu" }
  ],
  coach: () => [
    { skin: SKINS[hash(S.npc.coach) % 4], hatStyle: "kep", hat: S.team.c1, hair: "#3a2a1d" },
    { adult: true, mustache: hash(S.npc.coach) % 2 === 0, whistle: true, jersey: "#3a4256", sleeves: true, mood: "kizgin" }
  ],
  mom: () => [
    { skin: S.look.skin, hatStyle: "uzun", hair: "#5a3418" },
    { adult: true, jersey: "#3fa28a", sleeves: true, mood: "mutlu" }
  ],
  dad: () => [
    { skin: S.look.skin, hatStyle: "yok", hair: "#2a1a10" },
    { adult: true, jersey: "#5a6b8a", sleeves: true, mustache: true }
  ],
  rival: () => [
    { skin: SKINS[0], hatStyle: "yok", hair: "#e2c15a" },
    { jersey: "#5b2a86", sleeves: true, mood: "kizgin", tie: true }
  ],
  press: () => [
    { skin: SKINS[2], hatStyle: "uzun", hair: "#111111" },
    { adult: true, jersey: "#22304a", sleeves: true, glasses: true }
  ],
  agent: () => [
    { skin: SKINS[1], hatStyle: "yok", hair: "#333333" },
    { adult: true, jersey: "#22304a", sleeves: true, tie: "#d8b25a", glasses: true }
  ],
  odd: () => [
    { skin: "#b8c4a8", hatStyle: "kep", hat: "#333333" },
    { adult: true, jersey: "#2a2a2a", sleeves: true, glasses: true }
  ],
  mate: () => [
    { skin: SKINS[3], hatStyle: "band", hat: "#ffffff", hair: "#111111" },
    { jersey: S.team.c1, trim: S.team.c2, number: ri(4, 55), mood: "mutlu" }
  ],
  partner: () => [
    { skin: SKINS[1], hatStyle: "bere", hat: "#e85d9a", pom: "#ffffff" },
    { jersey: "#7d5bd6", sleeves: true, mood: "mutlu", blush: true }
  ],
  neighbor: () => [
    { skin: "#e8c3a0", hatStyle: "kulak", hat: "#8a6b3e" },
    { adult: true, jersey: "#9a3b3b", sleeves: true, mood: "saskin", glasses: true }
  ]
};
export function eventSheet(ev, after) {
  if (SIM()) {
    pick(ev.choices).do();
    norm();
    setTimeout(after, 0);
    return;
  }
  sheet(
    ev.title,
    ev.who,
    `<div class="who"><div id="ep"></div><div class="say">${ev.text}</div></div><div class="choices" id="ch">${ev.choices.map((x, i) => `<button class="choice" data-i="${i}"><span class="ct" style="font-size:var(--fs-2xl)">${x.t}</span></button>`).join("")}</div>`,
    { noClose: true }
  );
  $("#ep").appendChild(portrait(ev.look[0], ev.look[1]));
  $$("#ch .choice").forEach(
    btn =>
      (btn.onclick = () => {
        const out = ev.choices[+btn.dataset.i].do();
        norm();
        save();
        $("#ch").innerHTML =
          `<div class="say warn">${out}</div><button class="btn pri" id="ok">${$t("common.continue")}</button>`;
        $("#ok").onclick = after;
      })
  );
}
export function randomEvent(after) {
  S.evRecent = 1; // maç sonrası olay çıktı: bu hafta hikâye paneli gelmez (src/extras.js)
  // olaylar veri paketlerinden gelir: src/content/events.tr.js (motor: src/content/events.js)
  S.evSeen = S.evSeen || {};
  const now = weekIndex(),
    fresh = late.eventPool().filter(x => !(S.evSeen[x.title] && now - S.evSeen[x.title] < 60));
  if (!fresh.length) return after();
  // zorlu olaylar (events.hard.tr.js): olay haftalarının ~%30'unda (haftaların ~%10'u) bunlardan biri seçilir
  const hard = S.season >= 2 ? fresh.filter(x => x.hard) : []; // ilk sezon ağır olaysız (yeni oyuncu)
  const e =
    hard.length && Math.random() < 0.3
      ? pick(hard)
      : pick(fresh.filter(x => !x.hard).length ? fresh.filter(x => !x.hard) : fresh);
  S.evSeen[e.title] = now;
  Bus.emit("event:show", { title: e.title });
  eventSheet({ ...e, look: LK[e.w]() }, after);
}

/* ================= SEZON SONU & TEKLİFLER ================= */
export function seasonEnd(playoff, champ, final) {
  Bus.emit("season:end", { playoff, champ, final });
  const res = S.results,
    w = res.filter(r => r.win).length,
    avg = late.seasonAvg();
  const awards = [],
    tn = lgName(),
    label = seasonLabel();
  if (champ) {
    if (!window.__SIM) late.hapticSuccess(); // şampiyonluk
    awards.push(
      $t("season.champion", {
        tn: tn
      })
    );
    S.career.trophies.push({
      type: S.stage === "lise" ? "lise" : "champ",
      label: $t("season.champion3", {
        label: label,
        tn: tn,
        name: S.team.name
      })
    });
    S.rel.taraf += 10;
    S.followers *= 1.25;
  } else if (final) {
    awards.push(
      $t("season.runner2", {
        tn: tn
      })
    );
    S.career.trophies.push({
      type: "final",
      label: $t("season.runner", {
        label: label,
        tn: tn
      })
    });
  }
  awards.push(...late.seasonAwards(avg, champ));
  late.evalGoals(!!playoff); // sezon hedefleri: teklifler oluşmadan önce (menajer hedefi teklifleri etkiler)
  S.hist.push({
    label,
    team: S.team.name,
    league: S.stage === "euro" ? `${tn} · ${brandText("EuroLeague")}` : tn, // miras puanı ve kartlar EuroLeague sezonlarını sayar
    w,
    l: res.length - w,
    avg,
    champ,
    c1: S.team.c1,
    c2: S.team.c2,
    ...(S.ss || late.blankSS())
  });
  const gr = BAL.grow.find(g => S.age <= g[0]),
    st0 = { ...S.st }; // yaz gelişimi Sezon Gecesi "Gelecek sezon" sekmesinde gösterilir (src/seasonnight.js)
  for (const [k] of STATS) {
    let g = ri(gr[1], gr[2]);
    if (S.age >= 30 && (k === "sut" || k === "pas")) g = Math.max(g, -1);
    if (S.age >= 30 && (k === "hiz" || k === "guc")) g -= Math.random() < 0.5 ? 1 : 0;
    if (g < 0 && Math.random() < late.fitSave()) g++; // yüksek kondisyon yaş düşüşünün bir kısmını önler
    S.st[k] += g;
  }
  let schoolMsg = "";
  if (S.studying && S.stage !== "lise") {
    if (S.aka >= 40) {
      S.uniYear++;
      if (S.uniYear > 4) {
        S.studying = false;
        S.graduated = true;
        schoolMsg = $t("season.graduatedUniversity");
        S.rel.aile += 15;
        news(
          $t("season.graduatedUniversity2", {
            v: fullName()
          })
        );
      } else
        schoolMsg = $t("season.passedYearYear", {
          uniYear: S.uniYear
        });
    } else {
      schoolMsg = $t("season.academicScoreLow");
      S.moral -= 6;
    }
  }
  S.snGrow = Object.fromEntries(STATS.map(([k]) => [k, S.st[k] - st0[k]]));
  if (S.contract > 0) S.contract--;
  S.age++;
  S.year++;
  S.season++;
  S.offPend = S.season; // sezon geçişi (teklifler) bitene kadar: yarıda kalırsa offResume kaldığı yerden sürdürür
  S.stageSeason++;
  late.rivalSeason();
  norm();
  save();
  const head = `<div class="card"><div class="eyebrow">${$t("season.season", {
    label: label,
    tn: esc(tn)
  })}</div><h2>${$t("season.winsLosses", {
    w: w,
    v: res.length - w
  })}</h2><div class="kv"><span>${$t("season.averageRating")}</span><b>${avg.toFixed(2)}</b><span>${$t("common.result")}</span><b>${champ ? $t("season.champion2") : final ? $t("season.finalist") : playoff ? $t("common.playoffs") : $t("season.missedPlayoffs")}</b><span>${$t("season.newAge")}</span><b>${S.age}</b><span>${$t("common.overall")}</span><b>${ovr()}</b></div>${awards.length ? `<div class="say">${awards.join(" · ")}</div>` : ""}${schoolMsg ? `<p class="small">${schoolMsg}</p>` : ""}</div>${late.goalsResultHTML()}<div id="seasonad">${late.seasonAdHTML()}</div>${late.rivalCard(avg)}`;
  S.offArgs = { avg, champ, head }; // turnuva arasında oyun kapanırsa sezon geçişi buradan sürer (src/natcup.js)
  save();
  late.summerTournament(avg, () => transition(avg, champ, head));
}
export function potential(avg, champ) {
  return potentialScore({ ovr: ovr(), avg, champ, fame: fame() });
}
export function grade(P) {
  return P >= 56 ? "A" : P >= 49 ? "B+" : P >= 43 ? "B" : P >= 38 ? "C+" : "C";
}
export function genOffers(avg, champ, n = 3) {
  const P = potential(avg, champ) + late.modePotential() + late.originPotential(),
    o = ovr(),
    cur = ORDER.indexOf(S.stage);
  const steps = eligibleStages({ P, avg, age: S.age, stage: S.stage });
  if (!steps.length) steps.push("t3");
  const top = steps[steps.length - 1],
    sec = steps[steps.length - 2] || top;
  if (avg < 5 && cur >= 3) steps.unshift(ORDER[cur - 1]);
  const out = [],
    used = new Set([S.team.key]);
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const st = Math.random() < 0.6 ? top : sec;
    const cc0 = st === "nba" ? "US" : Math.random() < 0.3 ? "TR" : pick(EU_CC);
    const t = pick(leaguePool(st, cc0)),
      cc = t.cc;
    if (used.has(t.key)) continue;
    used.add(t.key);
    const role = roleAt(o, st, cc);
    const wage = offerWage({
      stage: st,
      pr: LEAGUES[cc].pr || 1,
      role,
      dominance: dominanceOf(o, tdOf(st, cc)),
      agentBoost: !!S.buffs.offer
    });
    out.push({ team: t, stage: st, role, wage, years: ri(1, 3) });
  }
  return out;
}
export function offerHTML(o, i) {
  const t = o.team;
  const up = ORDER.indexOf(o.stage) > ORDER.indexOf(S.stage);
  const lab = o.stay ? $t("offer.stay") : o.uni ? $t("offer.school") : up ? $t("offer.step") : $t("offer.offer"),
    cls = o.stay ? "e" : o.uni ? "i" : up ? "m" : "i";
  return `<button class="choice" data-o="${i}"><span class="ct" style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-2xl)">${crestSVG(t, 28)}<span>${esc(t.name)}</span></span><span class="cd">${esc(o.note || leagueName(o.stage, t.cc))} · ${esc(t.city)}${o.uni ? "" : `, ${(LEAGUES[t.cc] || LEAGUES.TR).n}`}${o.role ? ` · ${ROLE_N[o.role]}` : ""}${isPro(o.stage) && !o.uni ? ` · ${late.offerFitNote(t)}` : ""}${buyoutFor(o) ? ` ${$t("offer.buyoutFee")} ${fmt(buyoutFor(o))}` : ""}${
    o.wage
      ? ` ${$t("common.week", {
          wage: fmt(o.wage)
        })}`
      : ""
  }${
    o.years
      ? ` ${$t("common.yr", {
          years: o.years
        })}`
      : ""
  }</span><span class="od ${cls}">${lab}</span></button>`;
}
/** Sezon geçişi yarıda kaldıysa (uygulama teklif/kamp panelinde kapandı, panel dışarıdan kapandı) teklif ekranına dön.
    Yoksa oyuncu haritada eski sezonun son haftasında kalır; hızlı hafta son maçı yeniden oynatıp sezonu ikinci kez
    bitirir (yaş, sözleşme yılı ve sezon geçmişi bozulur). force: panel/ekran denetimi yapmadan (maç ve hafta girişleri). */
export function offResume(force) {
  if (!S || SIM() || S.retired || S.brk || S.natT || !S.offPend || S.offPend !== S.season) return false;
  if (!force && ($("#ovl").innerHTML.trim() || !$("#gostad"))) return false;
  const a = S.offArgs || { avg: 0, champ: false, head: "" };
  transition(a.avg, a.champ, a.head || "");
  return true;
}
Bus.on("screen:main", () => setTimeout(() => offResume(), 0));
export function transition(avg, champ, head) {
  // aynı yazın teklifleri sabit: oyunu kapatıp açarak yeni teklif çekilemez (tohumlu rastgele + menajer bonusu korunur)
  if (S.offArgs) {
    if (S.offArgs.buff == null) S.offArgs.buff = (S.buffs && S.buffs.offer) || 0;
    else if (S.buffs) S.buffs.offer = S.offArgs.buff;
  }
  const rnd0 = Math.random;
  // geçici yama bilinçli: teklif akışı (genOffers, takım havuzları, geç bağlı modüller) içindeki HER rastgele çağrı
  // tohumlu olmalı; tek tek rng parametresi geçirmek kaçan bir çağrıda teklifleri yeniden açılışta değiştirirdi
  Math.random = mulberry32(seedHash(`${S.season}|${S.first}|${S.last}|${S.year}|${S.career.pts}|${S.career.games}`));
  try {
    return transitionInner(avg, champ, head);
  } finally {
    Math.random = rnd0;
  }
}
function transitionInner(avg, champ, head) {
  let offers = [],
    title = $t("transition.newSeason"),
    intro = "";
  const P = potential(avg, champ);
  if (S.stage === "lise") {
    if (S.stageSeason > 2) {
      const exam = clamp(Math.round(S.aka * 0.75 + rnd(0, 20) + (avg - 6) * 3), 0, 100);
      title = $t("transition.careerReview");
      intro = `<div class="card"><div class="eyebrow">${$t("transition.scoutReport")}</div><div class="row between nowrap"><div><h3>${esc(fullName())}</h3><div class="small muted">${$t(
        "transition.ageGamesPoints",
        {
          n: POS[S.pos].n,
          age: S.age,
          games: S.career.games,
          pts: S.career.pts
        }
      )}</div></div><div class="big-num gold">${grade(P)}</div></div><p class="small muted">${P >= 43 ? $t("transition.seriousInterestSecond") : $t("transition.needDevelopGetting")} ${$t("transition.universityExamScore")} <b>${exam}</b>.</p></div>`;
      offers = genOffers(avg, champ, 4);
      const uc = exam > 65 ? ["İstanbul", "Ankara"] : exam > 40 ? ["İstanbul"] : [];
      uc.forEach(c => {
        const t = makeTeam("myuni", c, 0);
        offers.push({
          team: t,
          stage: "uni",
          wage: WAGE.uni + (avg >= 6.3 ? 20 : 0),
          note: $t("transition.universityLeagueYear"),
          uni: true
        });
      });
      if (!uc.length)
        offers.push({
          team: makeTeam("myuni", "İstanbul", 2),
          stage: "uni",
          wage: WAGE.uni,
          note: $t("transition.sportsAcademyYear"),
          uni: true
        });
    } else {
      title = $t("transition.newYearHigh");
      offers = [{ team: S.team, stage: "lise", wage: WAGE.lise, stay: true }];
    }
  } else if (S.stage === "uni") {
    title = $t("transition.scoutReport");
    intro = `<p>${$t("transition.potentialRating")} <b class="gold">${grade(P)}</b>${$t("transition.offersComeClubs")}</p>`;
    offers = genOffers(avg, champ, 3);
    if (S.clubDeal) {
      const t = teamByKey(S.clubDeal.club);
      offers.unshift({
        team: t,
        stage: S.clubDeal.stage,
        role: roleAt(ovr(), S.clubDeal.stage, t.cc) === "bench" ? "bench" : "rot",
        wage: Math.round(WAGE[S.clubDeal.stage] * 0.9),
        years: 2,
        note: $t("transition.promisePicked", {
          stage: leagueName(S.clubDeal.stage, t.cc)
        })
      });
    }
    if (S.uniYear < 4) offers.push({ team: S.team, stage: "uni", wage: S.wage, stay: true, note: $t("transition.oneMoreYear") });
  } else {
    title = $t("transition.contractTransfer");
    intro = `<p>${$t("transition.agentLinedOffers", {
      agent: esc(S.npc.agent)
    })} <b class="gold">${grade(P)}</b>.</p>`;
    const stayOk = S.contract > 0 || avg >= 5 || S.rel.koc >= 30;
    const role = roleAt(ovr(), S.stage, S.team.cc);
    if (stayOk)
      offers.push({
        team: S.team,
        stage: S.stage,
        role,
        wage: S.contract > 0 ? S.wage : Math.round(S.wage * (avg >= 7 ? 1.25 : avg >= 6 ? 1.08 : 0.92)),
        years: S.contract > 0 ? S.contract : ri(1, 3),
        stay: true,
        note:
          S.contract > 0
            ? $t("transition.contractContinuesYears", {
                contract: S.contract
              })
            : $t("transition.contractRenewal")
      });
    offers.push(...genOffers(avg, champ, S.transferReq === S.season - 1 ? 4 : 3));
  }
  offers = late.storyOffers(offers);
  S.buffs.offer = 0;
  save();
  window.__lastOffers = offers;
  const retire = S.age >= 34 || !!S.farewell,
    force = S.age >= 38 || (S.farewell && S.season > S.farewell); // veda turu sezonu bitince emeklilik
  // menajerin ek kulüp araması (reklamla): yalnızca gerçek bir kulüp seçimi yapılan yazlarda
  const allowExtra = !force && (S.stage !== "lise" || S.stageSeason > 2);
  late.snReset();
  const show = () => {
    // bütün kulüpler masadan kalktıysa ilk tekliflerinde (pazarlıksız) dururlar; oyuncu teklifsiz kalmaz
    if (offers.length && offers.every(o => o.withdrawn))
      offers.forEach(o => {
        o.withdrawn = false;
        o.noNego = true;
      });
    sheet(
      title,
      $t("match.beforeSeason", {
        v: seasonLabel()
      }),
      late.snShellHTML(
        head,
        `${intro}${
          force
            ? `<div class="say">${$t("match.bodyIsntWhat")}</div><button class="btn bad" id="ret">${$t("match.goRetirementCeremony")}</button>`
            : `<div class="choices">${offers
                .map((o, i) =>
                  o.withdrawn
                    ? `<button class="choice" disabled style="opacity:.5"><span class="ct">${esc(o.team.name)}</span><span class="cd">${$t("match.walkedAwayWont")}</span></button>`
                    : offerHTML(o, i)
                )
                .join(
                  ""
                )}</div>${late.offerAdsHTML(offers, allowExtra)}${retire ? `<button class="btn ghost" id="ret">${$t("match.retire")}</button>` : ""}`
        }`
      ),
      { noClose: true }
    );
    late.snBind(); // Sezon Gecesi sekmeleri (src/seasonnight.js)
    // sezon sonu ödülü bir kez alınınca yeniden çizimde düğme yerine bilgi kalmasın diye kutu tazelenir
    const sa = $("#seasonad");
    if (sa) sa.innerHTML = late.seasonAdHTML();
    late.bindSeasonAd();
    if (!force) late.bindOfferAds(offers, () => genOffers(avg, champ, 1), show);
    $$("[data-o]").forEach(
      x => (x.onclick = () => late.negotiateOffer(offers[+x.dataset.o], sg => (sg ? acceptOffer(sg) : show())))
    );
    const r = $("#ret");
    if (r) r.onclick = retireScreen;
  };
  show();
}
// Sözleşme sürerken başka kulübe gitmek fesih bedeli ister; serbest kalma (üst lige) ve NBA çıkış maddesi bedelsiz yapar
export const buyoutFor = o => buyoutFee(o, S); // src/logic/career.js
export function acceptOffer(o) {
  const fee = buyoutFor(o);
  if (fee) tx($t("offer.contractBuyoutFee"), -fee);
  // yeni kulüpte maddeler sözleşmeyle gelir; aynı kulüpte yenilemede yeni kazanılan maddeler eskilere eklenir
  S.clauses = o.stay ? { ...(S.clauses || {}), ...(o.clauses || {}) } : o.clauses || {};
  const prevStage = S.stage,
    prevCity = S.city,
    t = o.team;
  if (o.uni && prevStage !== "uni") {
    S.uni = t.name;
    S.uniYear = 1;
    S.studying = true;
  }
  if (isPro(o.stage) && t.city !== S.city) S.studying = false;
  if (prevStage === "lise" && !o.uni && isPro(o.stage) && t.city === S.city) S.studying = false;
  S.stage = o.stage;
  S.team = t;
  S.wage = o.wage || WAGE[o.stage];
  S.city = t.city;
  S.role = o.role || "rot";
  S.contract = o.stay ? o.years || S.contract : o.years || 0;
  if (S.stage !== prevStage) S.stageSeason = 1;
  if (!o.stay) {
    const c = cOf(t.city);
    S.npc.coach = pick(c.first) + " " + pick(c.last);
    S.rel.koc = 45;
    S.rel.takim = 45;
    news(
      `${$t("offer.signed", {
        v: fullName(),
        name: t.name
      })} ${o.years ? o.years + $t("offer.year") : ""}${$t("offer.contract")}`
    );
  }
  if (S.city !== prevCity) {
    if (S.housing === "oda" || S.housing === "yurt") S.housing = S.stage === "uni" ? "yurt" : "daire";
    news(
      $t("offer.moved", {
        v: fullName(),
        city: S.city
      })
    );
  }
  if (S.city === S.home && S.housing === "yurt") S.housing = "oda";
  if (S.housing === "yurt" && !S.studying) S.housing = "daire";
  S.clubDeal = null;
  S.tryout = null;
  newSeasonLeague();
  setTeamVars();
  save();
  closeSheet();
  const ch =
    S.stage === "lise"
      ? S.stageSeason === 2
        ? "lise2"
        : null
      : S.stage === "uni"
        ? "uni"
        : isPro(S.stage) && !isPro(prevStage)
          ? "pro"
          : S.stage === prevStage
            ? null
            : S.stage;
  // doğal kırılma anı: imza sonrası, yeni bölüm başlamadan (sıklık sınırlı geçiş reklamı)
  late.adsBreak("season_break", () => chapter(ch, renderMain));
}
export function retireScreen() {
  if (!S.retired) Bus.emit("career:retire"); // ekran yeniden çizilince (son bölüm seçimi, kaydı açma) tekrar tetiklenmez
  if (SIM()) return;
  closeSheet();
  const k = S.career;
  const legend = late.legacyScore(); // miras puanı: src/legacy.js
  app.innerHTML = `<div class="pt-4h"><div class="eyebrow">${seasonLabel()}</div><h1>${$t("retire.retirement")}</h1></div>
  <div class="card"><div class="who"><div id="rp"></div><div><h2>${esc(fullName())}</h2><p class="muted">${$t("retire.endedCareerJersey", {
    age: S.age,
    name: esc(S.team.name)
  })}</p></div></div>
   <div class="box"><div><b>${k.games}</b><span class="eyebrow">${$t("common.match")}</span></div><div><b>${k.pts}</b><span class="eyebrow">${$t("common.score")}</span></div><div><b>${k.ast}</b><span class="eyebrow">${$t("common.assists")}</span></div><div><b>${k.trophies.length}</b><span class="eyebrow">${$t("retire.award")}</span></div></div>
   <div class="kv"><span>${$t("common.win")}</span><b>${k.wins}</b><span>${$t("common.careerEarnings")}</span><b>${fmt(k.earned)}</b><span>${$t("common.followers")}</span><b>${kfmt(S.followers)}</b><span>${$t("retire.legendPoints")}</span><b>${legend}</b></div>
   <p>${
     legend >= late.HOF[1][0]
       ? $t("retire.hoopModaShore")
       : legend >= late.HOF[2][0]
         ? $t("retire.neighborhoodCourt")
         : $t("retire.kidsModaStill", {
             last: esc(S.last)
           })
   }</p>
   <div class="grid2"><button class="btn pri big" id="nw">${$t("retire.newCareer")}</button>${late.cardButtonHTML()}</div>${late.albumButtonHTML()}</div>
  ${late.hofCard()}
  ${late.bondsRetireHTML()}
  ${late.legendRetireHTML()}
  ${late.afterCareerHTML()}
  ${late.cchCardHTML()}
  <div class="card"><div class="eyebrow">${$t("common.career")}</div><div class="tbl"><table><tr><th>${$t("common.season")}</th><th>${$t("common.team")}</th><th>G-M</th><th>${$t("retire.avg")}</th></tr>${S.hist.map(h => `<tr><td>${h.label}</td><td>${esc(h.team)}<div class="small muted">${esc(h.league)}</div></td><td>${h.w}-${h.l}</td><td>${h.avg.toFixed(1)}</td></tr>`).join("")}</table></div>${k.trophies.map(t => `<div class="small">${esc(t.label)}</div>`).join("")}</div>`;
  $("#rp").appendChild(portrait(S.look, { ...jersey(), mood: "mutlu" }, 84, 84, S.team.c1));
  if (!S.retired) {
    S.retired = true;
    save();
  }
  $("#nw").onclick = renderSlots;
  late.bindAfterCareer(retireScreen);
  late.cchBind(retireScreen); // koçluk kariyeri (src/coaching.js)
  late.bindCardButton(retireScreen);
  late.bindAlbumButton(retireScreen);
}

// Diğer modüllerin bu değişkenleri değiştirebilmesi için ayarlayıcılar
export function setM(v) {
  return (M = v);
}
