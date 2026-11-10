import { t as $t, t } from "./i18n/index.js";
import { autoSuccess, rivalGrowthRange } from "./logic/rules.js";
import { late } from "./late.js";
import {
  $,
  $$,
  BAL,
  Bus,
  COMMON_DRILLS,
  DRILLS,
  EU_CC,
  LEAGUES,
  ORDER,
  WAGE,
  clamp,
  esc,
  fmt,
  isPro,
  levelName,
  pick,
  ri,
  rnd,
  roleAt,
  statName,
  tdOf,
  toast,
  PRIO
} from "./data.js";
import { leaguePool } from "./clubs.js";
import { portrait } from "./art.js";
import {
  ROLE_N,
  S,
  closeSheet,
  crestSVG,
  eff,
  fixture,
  fullName,
  lgName,
  makeTeam,
  news,
  norm,
  ovr,
  phaseName,
  seasonLabel,
  sheet,
  standings,
  teamByKey,
  tx,
  weekNo
} from "./core.js";
import { save } from "./save.js";
import { drillGain } from "./places.js";
import { LK, M, PEN, potential } from "./match.js";
import { playMatch } from "./engine.js";
import { chemAvg, dominance, rated, seasonAvg, seasonAvgOf, simWithoutMe } from "./systems.js";
import { SHOT_MID, SHOT_THREE } from "./logic/shots.js";
/* ================= HİKÂYE VE KARİYER DÖNGÜSÜ =================
   - Otomatik maç ve "Haftayı hızlı geç"
   - Kalıcı rakip oyuncu ve derbiler
   - Koçun güvenine göre sezon içinde rol değişimi
   - Maç sonrası basın toplantısı (sözlerin bir sonraki maçta karşılığı var)
   - Birkaç hafta süren hikâye zincirleri: transfer söylentisi, sakatlık dönüşü, aile meselesi,
     lise kaptanlığı, üniversite final haftası */

/* ---- Otomatik çözüm: mini oyun oynanmadan niteliklere göre sonuç ----
   Ortalama bir oyuncudan biraz düşük isabet verir; maçı kendin oynamak daha iyi not getirir. */
export const autoP = e => autoSuccess(e + ((M && M.mmod) || 0), (window.__SIM && window.__SIM.base) || 0.46);
export const coin = p => Math.random() < p;
export function autoChoose(opts) {
  return opts.map(o => ({ k: o.k, v: (o.k === "safe" ? o.e - 10 : o.e) + rnd(0, 10) })).sort((a, b) => b.v - a.v)[0].k;
}
export function autoResolve(k, sur) {
  const P3 = SHOT_THREE,
    P2 = SHOT_MID;
  if (P3.includes(k) || P2.includes(k)) {
    const th = P3.includes(k),
      ok = coin(autoP(eff("sut") - (PEN[k] || 0) - (th ? 6 : 0)) * (th ? 0.85 : 1));
    if (ok) M.pts += th ? 3 : 2;
    return {
      good: ok,
      w: th ? 1.3 : 1,
      st: "sut",
      txt: ok
        ? `${sur} ${th ? $t("auto.hitThree") : $t("auto.hitMidRange")}`
        : $t("common.missedShot", {
            sur: sur
          })
    };
  }
  if (k === "drive" || k === "break" || k === "lay") {
    if (!coin(autoP(eff("hiz") - (PEN[k] || 0)))) {
      if (k !== "break" && coin(0.15)) late.addFoul(); // hücum faulü
      return {
        good: false,
        w: 1,
        st: "hiz",
        txt: $t("common.turnedBall", {
          sur: sur
        })
      };
    }
    M.pts += 2;
    if ((k === "drive" || k === "lay") && coin(k === "lay" ? 0.12 : 0.18) && coin(autoP(eff("sut") + 10))) M.pts++;
    return {
      good: true,
      w: k === "break" ? 1.2 : 1,
      st: "hiz",
      txt: $t("auto.droveHoopFinished", {
        sur: sur
      })
    };
  }
  if (["pnr", "kick", "lob"].includes(k)) {
    if (!coin(autoP(eff("pas") - (PEN[k] || 0)))) return { good: false, w: 1, st: "pas", txt: $t("auto.passIntercepted") };
    const conv = (k === "lob" ? 0.75 : 0.58) + S.rel.takim * 0.003 + (chemAvg() - 40) * 0.002;
    if (coin(conv)) {
      M.ast++;
      return {
        good: true,
        w: k === "lob" ? 1.3 : 1,
        st: "pas",
        txt: $t("auto.dishedAssist", {
          sur: sur
        })
      };
    }
    return { good: true, w: 0.6, st: "pas", txt: $t("auto.goodPassShot") };
  }
  if (k === "post" || k === "dunk") {
    const ok = coin(autoP(eff("guc") + (k === "dunk" ? 5 : 0)));
    if (ok) M.pts += 2;
    if (ok && coin(k === "dunk" ? 0.08 : 0.1) && coin(autoP(eff("sut") + 10))) M.pts++; // basket faul
    return {
      good: ok,
      w: k === "dunk" ? 1.3 : 1.2,
      st: "guc",
      txt: ok
        ? $t("auto.finishedRim", {
            sur: sur
          })
        : $t("auto.gotBlockedRim", {
            sur: sur
          })
    };
  }
  if (k === "putback" || k === "reb") {
    if (!coin(autoP(eff("guc")))) return { good: false, w: 1, st: "guc", txt: $t("auto.reboundGoesOpponent") };
    M.reb++;
    if (k === "reb") {
      M.stops++;
      return {
        good: true,
        w: 1,
        st: "guc",
        txt: $t("auto.grabbedRebound", {
          sur: sur
        })
      };
    }
    if (coin(0.8)) {
      M.pts += 2;
      return {
        good: true,
        w: 1.2,
        st: "guc",
        txt: $t("auto.putBackOff", {
          sur: sur
        })
      };
    }
    return {
      good: true,
      w: 0.6,
      st: "guc",
      txt: $t("auto.grabbedRebound", {
        sur: sur
      })
    };
  }
  if (k === "block") {
    const ok = coin(autoP((eff("sav") + eff("guc")) / 2));
    if (ok) {
      M.blk++;
      M.stops++;
    }
    return {
      good: ok,
      w: 1.2,
      st: "sav",
      txt: ok
        ? $t("auto.blocked", {
            sur: sur
          })
        : $t("auto.opponentFinished")
    };
  }
  if (k === "steal") {
    const ok = coin(autoP(eff("hiz") - 6));
    if (ok) M.stl++;
    return {
      good: ok,
      w: 1.2,
      st: "hiz",
      txt: ok
        ? $t("auto.stoleBall", {
            sur: sur
          })
        : $t("auto.stealAttemptCame")
    };
  }
  if (k === "charge") {
    const ok = coin(clamp((eff("sav") / 100) * 0.6 + 0.15, 0.1, 0.75));
    if (ok) M.stops++;
    return {
      good: ok,
      w: 1.1,
      st: "sav",
      txt: ok
        ? $t("auto.drewOffensiveFoul", {
            sur: sur
          })
        : $t("auto.foulCalled")
    };
  }
  if (k === "safe") {
    const ok = coin(clamp((eff(S.pos === "PF" ? "guc" : "sav") / 100) * 0.7 + 0.25, 0.2, 0.9));
    if (ok) M.stops++;
    return { good: ok, w: 0.5, st: "sav", txt: ok ? $t("auto.defenseHeldGround") : $t("auto.opponentFoundGap") };
  }
  let m = 0;
  for (let i = 0; i < (k === "free3" ? 3 : 2); i++) if (coin(autoP(eff("sut") + 12))) m++;
  M.pts += m;
  return {
    good: m > 0,
    w: 0.6,
    st: "sut",
    txt: $t("auto.hitFreeThrows2", {
      sur: sur,
      m: m
    })
  };
}

/* ---- Haftayı hızlı geç ----
   Kalan zaman dilimlerini mantıklı bir planla doldurur (dinlen, çalış, antrenman, sosyal),
   sonra maçı otomatik oynatır ya da istersen maça kendin çıkarsın. Antrenman mini oyunsuz yapıldığı
   için kazancı biraz düşüktür. */
export function autoWeekPlan() {
  const out = [];
  while (S.slot > 0) {
    S.slot--;
    if (S.injury) {
      if (S.injury.w > 1 && coin(0.5)) S.injury.w--;
      S.energy += 10;
      out.push([$t("common.physio"), $t("auto.energyPlus10")]);
      continue;
    }
    if (S.energy < 42) {
      S.energy += 35;
      S.moral += 2;
      out.push([$t("common.rested"), $t("auto.energyPlus35")]);
      continue;
    }
    if (S.studying && S.aka < 55 && (S.stage === "lise" || S.stage === "uni") && !S.studied) {
      let c = 0;
      for (let i = 0; i < 3; i++) if (coin(0.6)) c++;
      S.aka += c * 3;
      S.energy -= 6;
      S.studied = true;
      out.push([
        $t("auto.studied"),
        $t("auto.academics", {
          v: c * 3
        })
      ]);
      continue;
    }
    if (S.moral < 45) {
      if (S.money >= 3) tx($t("auto.cafeFriends"), -3);
      S.moral += 8;
      S.rel.ark += 8;
      out.push([$t("auto.metFriends"), $t("auto.moralePlus8")]);
      continue;
    }
    if (S.rel.aile < 40) {
      S.rel.aile += 12;
      S.moral += 5;
      out.push([$t("auto.visitedFamily"), $t("auto.familyPlus12")]);
      continue;
    }
    // pozisyona göre en çok işe yarayacak antrenman
    const W = {
      PG: { pas: 1.3, hiz: 1.2, sut: 1, sav: 0.8, guc: 0.7 },
      SG: { sut: 1.4, hiz: 1.1, pas: 0.9, sav: 0.9, guc: 0.7 },
      SF: { sut: 1.1, sav: 1, guc: 1, hiz: 1, pas: 0.9 },
      PF: { guc: 1.3, sav: 1.3, sut: 0.9, hiz: 0.8, pas: 0.7 },
      C: { guc: 1.5, sav: 1.4, sut: 0.7, hiz: 0.7, pas: 0.7 }
    }[S.pos];
    const drills = [...DRILLS[S.pos], ...COMMON_DRILLS];
    let best = drills[0],
      bv = -1;
    for (const d of drills) {
      const v = W[d[2]] * (100 - S.st[d[2]]) * (late.program() === d[2] ? 2.5 : 1);
      if (v > bv) {
        bv = v;
        best = d;
      }
    }
    const k = best[2],
      ratio = clamp(autoP(eff(k) + 10) * 0.9, 0, 1),
      g = drillGain(k, ratio);
    Bus.emit("train:done", { k, ratio, auto: true });
    S.energy -= 18;
    out.push([
      $t("auto.training", {
        v: best[1]
      }),
      g >= 0.05
        ? `+${g.toFixed(2)} ${statName(k)}`
        : $t("auto.improving", {
            k: statName(k)
          })
    ]);
  }
  norm();
  save();
  return out;
}
export function quickWeek() {
  if (late.offResume(true)) return; // yarıda kalmış sezon geçişi önce tamamlanır
  closeSheet();
  const plan = autoWeekPlan();
  const big = bigMatch();
  const fx = fixture(),
    opp = teamByKey(fx.opp);
  sheet(
    t("quick.title"),
    $t("common.week2", {
      v: seasonLabel(),
      week: S.week
    }),
    `<div class="card"><div class="eyebrow">${t("quick.did")}</div>${plan.length ? `<div class="kv">${plan.map(([a, b]) => `<span>${esc(a)}</span><b>${esc(b)}</b>`).join("")}</div>` : `<p class="small muted">${t("quick.full")}</p>`}</div>
   <div class="card"><div class="eyebrow">${t("quick.next")}</div><div class="row nowrap gap-2h">${crestSVG(opp, 40)}<div><b>${esc(opp.name)}</b><div class="small muted">${fx.home ? t("main.home") : t("main.away")} · ${phaseName()}</div></div></div>${S.injury ? `<p class="small bad">${t("quick.injured")}</p>` : `<p class="small muted">${t("quick.autoNote")}</p>`}</div>
   ${big ? `<div class="say gold"><b>${esc(big.label)}</b> ${t("big.invite")}</div>` : ""}
   ${S.injury ? `<button class="btn pri" id="qw-sim">${t("quick.watch")}</button>` : `<div class="grid2"><button class="btn ${big ? "pri" : ""}" id="qw-self">${t("quick.self")}</button><button class="btn ${big ? "ghost" : "pri"}" id="qw-sim">${t("quick.sim")}</button></div>`}`,
    { noClose: true }
  );
  $("#qw-sim").onclick = () => {
    closeSheet();
    if (S.injury) simWithoutMe();
    else {
      const f = fixture();
      playMatch({ opp: teamByKey(f.opp), home: f.home, comp: "lig", label: `${lgName()} · ${phaseName()}`, auto: true }).catch(late.matchFail);
    }
  };
  const me = $("#qw-self");
  if (me)
    me.onclick = () => {
      closeSheet();
      playMatch().catch(late.matchFail);
    };
}

/* ================= RAKİP OYUNCU ================= */
// Aynı yaşta, aynı şehirden, kariyeri seninle paralel ilerleyen bir rakip.
export function makeRival() {
  const c = LEAGUES.TR,
    opp = S.league.map(r => r.key).filter(k => k !== S.team.key),
    tk = pick(opp) || S.team.key,
    t = teamByKey(tk);
  const name = S.npc && S.npc.rival ? S.npc.rival.split(" ") : [pick(c.first), pick(c.last)];
  return {
    first: name[0],
    last: name[1] || pick(c.last),
    pos: coin(0.6) ? S.pos : pick(["PG", "SG", "SF", "PF", "C"].filter(p => p !== S.pos)),
    ovr: ovr() + ri(-1, 3),
    talent: rnd(0.95, 1.2),
    stage: "lise",
    team: { key: tk, name: t.name, city: t.city, cc: "TR", c1: t.c1, c2: t.c2 },
    ppg: 0,
    avg: 6.4,
    hist: [],
    ahead: false
  };
}
export const rivalName = () => (S.rival ? `${S.rival.first} ${S.rival.last}` : S.npc.rival);
export function rivalStageFor(o, age) {
  if (age < 18) return "lise";
  const fits = ["t3", "t2", "t1", "euro", "nba"].filter(st => o >= tdOf(st, "TR") + 45 - 2 && (st !== "nba" || age <= 29));
  if (!fits.length) return age <= 21 ? "uni" : "t3";
  return fits[fits.length - 1];
}
export function rivalSeason() {
  const R = S.rival;
  if (!R || R.retired) return null; // emekli rakip (src/bonds.js)
  const age = S.age; // seasonEnd yaşı artırdıktan sonra çağrılır
  const g = ri(...rivalGrowthRange(age));
  R.ovr = clamp(Math.round(R.ovr + g * R.talent), 25, 95);
  const prev = R.stage,
    st = rivalStageFor(R.ovr, age);
  let moved = null;
  if (st !== prev || (isPro(st) && coin(0.25))) {
    let t;
    if (st === "lise") t = null;
    else if (st === "uni") {
      const u = makeTeam("uni", pick(LEAGUES.TR.cities.filter(c => c !== "İstanbul")), 0);
      t = u;
    } else {
      const cc = st === "nba" ? "US" : coin(0.45) ? "TR" : pick(EU_CC);
      t = pick(leaguePool(st, cc));
    }
    if (t) {
      R.team = { key: t.key, name: t.name, city: t.city, cc: t.cc || "TR", c1: t.c1, c2: t.c2 };
      moved = t;
    }
    R.stage = st;
  }
  const d = R.ovr - (tdOf(R.stage, R.team.cc) + 45);
  R.ppg = +clamp(9 + d * 0.55 + rnd(-2.5, 2.5), 2, 31).toFixed(1);
  R.avg = +clamp(6.5 + d * 0.05 + rnd(-0.4, 0.4), 5, 8.9).toFixed(2);
  R.hist.push({ age: age - 1, stage: R.stage, team: R.team.name, ppg: R.ppg, avg: R.avg });
  if (moved) news($t("lc.nRival", { v: rivalName(), club: moved.name, level: levelName(R.stage) }));
  return moved;
}
// Sezon sonu kıyas kartı; rakip seni geçtiyse ya da sen onu geçtiysen hikâye anı
export function rivalCard(avg) {
  const R = S.rival;
  if (!R) return "";
  const my = ORDER.indexOf(S.stage),
    his = ORDER.indexOf(R.stage);
  const ss = S.hist.length ? S.hist[S.hist.length - 1] : null,
    myP = ss && ss.g ? (ss.pts / ss.g).toFixed(1) : "0.0";
  let line;
  if (his > my && !R.ahead) {
    R.ahead = true;
    S.buffs.train = (S.buffs.train || 0) + 4;
    line = $t("rival.oneStepAhead4", {
      first: R.first
    });
  } else if (my > his && R.ahead) {
    R.ahead = false;
    S.rel.taraf += 5;
    line = $t("rival.nowAheadWhole", {
      first: R.first
    });
  } else
    line =
      his > my
        ? $t("rival.stillOneStep", {
            first: R.first
          })
        : my > his
          ? $t("rival.passed", {
              first: R.first
            })
          : $t("rival.levelRivalryGoes");
  return `<div class="card"><div class="eyebrow">${$t("rival.rival", {
    v: esc(rivalName())
  })}</div><div class="tbl"><table><tr><th></th><th>${$t("rival.you")}</th><th>${esc(R.first)}</th></tr><tr><td>${$t("rival.level")}</td><td>${levelName(S.stage)}</td><td>${levelName(R.stage)}</td></tr><tr><td>${$t("common.team")}</td><td>${esc(S.team.short || S.team.name)}</td><td>${esc(R.team.name)}</td></tr><tr><td>${$t("rival.ppg")}</td><td>${myP}</td><td>${R.ppg}</td></tr><tr><td>${$t("rival.avgRating")}</td><td>${avg.toFixed(2)}</td><td>${R.avg}</td></tr><tr><td>${$t("common.overall")}</td><td>${ovr()}</td><td>${R.ovr}</td></tr></table></div><p class="small">${line}</p></div>`;
}
export function rivalInfo() {
  const R = S.rival;
  return `<div class="card"><div class="eyebrow">${$t("rival.rival", {
    v: esc(rivalName())
  })}</div><div class="kv"><span>${$t("common.team")}</span><b>${esc(R.team.name)}</b><span>${$t("rival.level")}</span><b>${levelName(R.stage)}</b><span>${$t("common.overall")}</span><b>${R.ovr}</b><span>${$t("rival.lastSeason")}</span><b>${$t(
    "rival.ptsRating",
    {
      ppg: R.ppg,
      avg: R.avg
    }
  )}</b></div>${
    R.hist.length
      ? `<div class="tbl"><table><tr><th>${$t("common.age")}</th><th>${$t("common.team")}</th><th>${$t("common.score")}</th><th>${$t("common.rating")}</th></tr>${R.hist
          .slice(-6)
          .reverse()
          .map(h => `<tr><td>${h.age}</td><td>${esc(h.team)}</td><td>${h.ppg}</td><td>${h.avg}</td></tr>`)
          .join("")}</table></div>`
      : ""
  }</div>`;
}
/** Önemli maç: final, yarı final, rakip oyuncuyla derbi, ligin ilk ikisinin zirve maçı. Hızlı haftada "kendin oyna"
    öne çıkarılır; elle oynayana taraftar ve takipçi bonusu verilir (finishMatch). */
export function bigMatch() {
  if (!S || S.injury || !S.league || !S.teams) return null;
  if (S.phase === "final") return { kind: "final", label: $t("big.final") };
  if (S.phase === "semi") return { kind: "semi", label: $t("big.semi") };
  const fx = fixture(),
    opp = fx && teamByKey(fx.opp);
  if (!opp) return null;
  if (isDerby(opp)) return { kind: "derby", label: $t("big.derby", { v: derbyWho(opp) }) };
  const top = standings()
    .slice(0, 2)
    .map(r => r.key);
  if (S.week >= 4 && top.includes(S.team.key) && top.includes(opp.key)) return { kind: "top", label: $t("big.top") };
  return null;
}
// derbi: kişisel rakibinin takımı ya da şehrin ezeli rakibi (src/derby.js)
export const isRivalDerby = opp => !!(S.rival && opp && S.rival.team && opp.key === S.rival.team.key);
export const isDerby = opp => isRivalDerby(opp) || !!(opp && late.dbyArchKey() === opp.key);
/** Derbinin karşı tarafı: kişisel rakip adı ya da ezeli rakip kulüp */
export const derbyWho = opp => (isRivalDerby(opp) ? rivalName() : (opp && opp.name) || "");
export function derbyResult(win) {
  if (!isRivalDerby(M.opp)) return late.dbyResult(win); // ezeli rakip derbisi: şehir hikâyesi
  const R = S.rival,
    rp = Math.max(0, Math.round(R.ppg * rnd(0.55, 1.45)));
  const beat = M.pts > rp,
    txt = $t("derby.heldPointsScored", {
      first: R.first,
      rp: rp,
      pts: M.pts
    });
  if (win && beat) {
    S.rel.taraf += 6;
    S.followers = Math.round(S.followers * 1.04);
    S.moral += 6;
    news(
      $t("derby.manMatchDerby", {
        v: fullName(),
        pts: M.pts,
        v2: rivalName(),
        rp: rp
      })
    );
  } else if (!win && !beat) {
    S.moral -= 4;
    news(
      $t("derby.stoodDerbyPoints", {
        v: rivalName(),
        rp: rp
      })
    );
  }
  return {
    rp,
    txt:
      win && beat
        ? $t("derby.derby", {
            txt: txt
          })
        : !win && !beat
          ? $t("derby.scoredPointsDerby", {
              first: R.first,
              rp: rp,
              pts: M.pts
            })
          : txt
  };
}

/* ================= KOÇUN GÜVENİ: SEZON İÇİ ROL ================= */
export function roleReview() {
  if (!isPro(S.stage) || S.phase !== "regular" || ![5, 9, 13].includes(S.week)) return false;
  const last = rated().slice(-4);
  if (last.length < 3) return false;
  // koçun kişiliği ve takım arkadaşlarıyla ilişkiler (src/chars.js) güvenin hesabını değiştirir
  const tm = late.trustMods(),
    rec = last.reduce((a, r) => a + r.rating, 0) / last.length,
    trust = S.rel.koc + tm.base + late.traitTrust() + (rec - 6.5) * tm.recW + dominance() * 1.2 + late.systemFit() * tm.fitW;
  const order = ["bench", "rot", "star"],
    i = order.indexOf(S.role);
  let to = null,
    why = "";
  if (i < 2 && trust >= (i === 0 ? 58 : 70) && rec >= (i === 0 ? 6.7 : 7.2) && dominance() >= (i === 0 ? -8 : 0)) {
    to = order[i + 1];
    why = i === 0 ? $t("role.leftNoOther") : $t("role.deserveTeamsStarting");
  } else if (i > 0 && (trust < (i === 2 ? 46 : 30) || rec < (i === 2 ? 6.2 : 5.6))) {
    // ilk beşte kalmak da emek ister: kötü seri ya da koçla bozulan ilişki yedek kulübesine götürür
    to = order[i - 1];
    why = i === 2 ? $t("role.recentGamesHavent") : $t("role.wantPlayingTime");
  }
  if (!to) return false;
  const up = order.indexOf(to) > i;
  Bus.emit("role:change", { from: S.role, to });
  S.role = to;
  S.moral += up ? 8 : -8;
  news(`${S.team.short}: ${fullName()} ${up ? $t("role.promoted") : $t("role.lostRole")} (${ROLE_N[to]}).`);
  save();
  late.sfx(up ? "levelup" : "lose");
  sheet(
    up ? $t("role.roleGrew") : $t("role.roleShrank"),
    $t("common.coach", {
      coach: S.npc.coach
    }),
    `<div class="who"><div id="rcp"></div><div class="say">${why}</div></div><div class="kv"><span>${$t("role.newRole")}</span><b class="${up ? "good" : "bad"}">${ROLE_N[to]}</b><span>${$t("role.averageRatingLast4")}</span><b>${rec.toFixed(2)}</b><span>${$t("common.relationshipCoach")}</span><b>${S.rel.koc}</b></div><p class="small muted">${$t("role.roleDeterminesHow4")}</p><button class="btn pri" id="rok">${$t("common.continue")}</button>`,
    { noClose: true }
  );
  const cl = LK.coach();
  cl[1].mood = up ? "mutlu" : "kizgin";
  $("#rcp").appendChild(portrait(cl[0], cl[1]));
  $("#rok").onclick = () => closeSheet();
  return true;
}

/* ================= BASIN TOPLANTISI ================= */
// Basın toplantısı: derbi ve finalde her zaman; diğer önemli maçlarda en az 4 hafta arayla (sezonda ~3-4 kez)
export function pressDue(win) {
  if (M.rating == null || (M.auto && !isDerby(M.opp))) return false;
  const now = weekNo(20),
    due = isDerby(M.opp) || S.phase === "final" || !S.pressLast || now - S.pressLast >= 4;
  if (!due) return false;
  let go = false;
  if (isDerby(M.opp) || S.phase === "final") go = true;
  else if (S.phase !== "regular") go = coin(0.6);
  else if (M.rating >= 8.3 || M.rating <= 4.5) go = S.stage !== "lise" || coin(0.5);
  else go = isPro(S.stage) && coin(0.12);
  if (go) S.pressLast = now;
  return go;
}
export function pressFollowUp(win) {
  const p = S.press;
  if (!p || M.rating == null) return "";
  S.press = null;
  if (p.tone === "bold") {
    if (win) {
      S.rel.taraf += 4;
      S.followers = Math.round(S.followers * 1.02);
      return $t("press.lastWeekSaid", {
        quote: p.quote
      });
    }
    S.moral -= 6;
    S.rel.taraf -= 4;
    return $t("press.lastWeeksThrown", {
      quote: p.quote
    });
  }
  if (p.tone === "humble" && win) {
    S.rel.takim += 2;
    return "";
  }
  return "";
}
/** Basın toplantısı sorusu ve cevapları (derbi, rakip derbisi, play-off, öne çıkan performans) */
function pressQA(win) {
  const derby = isRivalDerby(M.opp),
    R = S.rival,
    j = S.npc.journalist,
    dr = isDerby(M.opp) ? derbyResult(win) : null;
  const q = derby
    ? $t("press.derbyWhatSay", {
        txt: dr.txt,
        first: R.first
      })
    : dr
      ? `${dr.txt} ${win ? $t("press.goodWinHow") : $t("press.toughDefeatWhats")}`
      : S.phase !== "regular"
        ? win
          ? $t("press.tookLeadSeries")
          : $t("press.lostCrucialGame")
        : M.rating >= 8.3
          ? $t("press.manNightPoints", {
              pts: M.pts
            })
          : M.rating <= 4.5
            ? $t("press.thingsDidntGo")
            : win
              ? $t("press.goodWinHow")
              : $t("press.toughDefeatWhats");
  const A = derby
    ? [
        [
          "humble",
          $t("press.goodPlayerRespect", {
            first: R.first
          })
        ],
        ["confident", $t("press.talkedCourtNo")],
        [
          "bold",
          $t("press.theresOnlyOne", {
            pos: S.pos
          })
        ]
      ]
    : win
      ? [
          ["humble", $t("press.withoutTeammatesNone")],
          ["confident", $t("press.gettingStartedIll")],
          ["bold", $t("press.nobodyStopNext")]
        ]
      : [
          ["humble", $t("press.responsibilityMineIll")],
          ["confident", $t("press.badNightEveryone")],
          ["bold", $t("press.refereesCallsDecided")]
        ];
  return { q, A, derby, j };
}
/** Seçilen cevabın etkileri; sonuç metnini döndürür */
function pressApply(k, P, win) {
  const { A, derby } = P;
  Bus.emit("press", { tone: k });
  const quote = A.find(a => a[0] === k)[1].replace(/"/g, "");
  let out;
  if (k === "humble") {
    S.rel.koc += 3;
    S.rel.takim += 4;
    S.rel.taraf += 1;
    out = $t("press.wordsWellReceived");
  } else if (k === "confident") {
    S.rel.taraf += 4;
    S.followers = Math.round(S.followers * 1.02);
    S.moral += 2;
    out = $t("press.clearConfidentStance");
  } else {
    S.rel.taraf += 8;
    S.followers = Math.round(S.followers * 1.05);
    S.rel.koc -= 4;
    S.rel.takim -= 2;
    if (!win && !derby) tx($t("s35.fine"), -Math.round((S.wage || 10) * 0.5), { kind: "plain" });
    out = !win && !derby ? $t("press.federationFined") : $t("press.headlinesCoachDidnt");
    S.press = { tone: "bold", quote: quote.length > 60 ? quote.slice(0, 57) + "…" : quote };
  }
  if (k === "humble") S.press = { tone: "humble", quote };
  norm();
  save();
  return out;
}
const pressBody = P =>
  `<div class="who"><div id="pcp"></div><div><div class="eyebrow">${$t("press.sportsReporter", {
    j: esc(P.j)
  })}</div><div class="say">"${P.q}"</div></div></div><div class="choices" id="pch">${P.A.map(([k, t]) => `<button class="choice" data-press="${k}"><span class="ct" style="font-size:var(--fs-xl);text-transform:none;letter-spacing:0">${esc(t)}</span><span class="cd">${{ humble: $t("press.modestLovedCoach"), confident: $t("press.confidentBalanced"), bold: $t("press.boldFansGo") }[k]}</span></button>`).join("")}</div>`;
export function pressConference(win, after) {
  const P = pressQA(win);
  sheet(
    $t("common.pressConference"),
    $t("press.afterGame", {
      name: M.opp.name
    }),
    pressBody(P),
    { noClose: true }
  );
  const pl = LK.press();
  $("#pcp").appendChild(portrait(pl[0], pl[1]));
  $$("[data-press]").forEach(
    b =>
      (b.onclick = () => {
        const out = pressApply(b.dataset.press, P, win);
        $("#pch").innerHTML = `<div class="say warn">${out}</div><button class="btn pri" id="pok">${$t("common.continue")}</button>`;
        $("#pok").onclick = () => {
          closeSheet();
          after();
        };
      })
  );
}
/** Maç sonucu ile basın toplantısı tek ekranda (aşama 3.3): sonuç panelinin altında soru ve cevaplar; cevap verilince
    "Devam" görünür. Önceki basın sözünün karşılığı (pressFollowUp) yeni cevaptan ÖNCE hesaplanır; maç sonrası ara katman
    (match:after) bunu ve basın toplantısını yeniden yapmaz. Denge simülasyonunda eski akış (ayrı panel) aynen sürer. */
export function pressInlineHTML(win) {
  if (window.__SIM || !M || M.rating == null) return "";
  M.pressFu = pressFollowUp(win);
  M.pressChecked = 1;
  if (!pressDue(win)) return "";
  const P = (M.pressP = pressQA(win));
  M.pressInl = 1;
  return `<div class="card" id="pr-inl" role="region" aria-label="${esc($t("common.pressConference"))}"><div class="eyebrow">${$t("common.pressConference")}</div>${pressBody(P)}</div>`;
}
/** Satır içi basın toplantısını bağla; cevap verilince done() (sonuç panelindeki "Devam" düğmesi açılır) */
export function bindPressInline(win, done) {
  const box = $("#pr-inl");
  if (!box || !M || !M.pressP) return false;
  const pl = LK.press();
  $("#pcp").appendChild(portrait(pl[0], pl[1]));
  $$("#pr-inl [data-press]").forEach(
    b =>
      (b.onclick = () => {
        const out = pressApply(b.dataset.press, M.pressP, win);
        $("#pch").innerHTML = `<div class="say warn">${out}</div>`;
        done();
      })
  );
  return true;
}

/* ================= HİKÂYE ZİNCİRLERİ ================= */
export function arcSheet(title, who, look, text, choices, after) {
  sheet(
    title,
    who,
    `<div class="who"><div id="ap"></div><div class="say">${text}</div></div><div class="choices" id="ach">${choices.map((c, i) => `<button class="choice" data-arc="${i}"><span class="ct" style="font-size:var(--fs-xl)">${c.t}</span>${c.d ? `<span class="cd">${c.d}</span>` : ""}</button>`).join("")}</div>`,
    { noClose: true }
  );
  $("#ap").appendChild(portrait(look[0], look[1]));
  $$("[data-arc]").forEach(
    b =>
      (b.onclick = () => {
        const out = choices[+b.dataset.arc].do();
        norm();
        save();
        $("#ach").innerHTML = `<div class="say warn">${out}</div><button class="btn pri" id="aok">${$t("common.continue")}</button>`;
        $("#aok").onclick = () => {
          closeSheet();
          after && after();
        };
      })
  );
}
export const msg = (title, who, look, text) => arcSheet(title, who, look, text, [{ t: $t("common.continue"), do: () => $t("story.storyContinues") }]);
export function migrateStory() {
  S.arcs = S.arcs || {};
  S.arcQ = S.arcQ || [];
  if (!S.rival && S.league && S.team) {
    S.rival = makeRival();
    S.npc.rival = rivalName();
  }
}
export function storyTick() {
  const A = S.arcs;
  // kuyruktaki tek seferlik anlar
  if (S.arcQ.length) {
    const id = S.arcQ.shift();
    if (ARC_ONCE[id]) {
      ARC_ONCE[id]();
      return true;
    }
  }
  for (const id of Object.keys(ARCS)) {
    const a = ARCS[id],
      st = A[id];
    if (st && st.season === S.season && st.next && S.week >= st.next) {
      const f = a.steps[st.step];
      st.step++;
      st.next = a.gaps && a.gaps[st.step] ? S.week + a.gaps[st.step] : 0;
      Bus.emit("arc", { id, step: st.step });
      f(st);
      return true;
    }
    if ((!st || (a.repeat && st.season !== S.season)) && a.when() && coin(a.p)) {
      A[id] = { season: S.season, step: 1, next: a.gaps ? S.week + a.gaps[1] : 0, choice: null };
      Bus.emit("arc", { id, step: 1 });
      a.steps[0](A[id]);
      return true;
    }
  }
  return false;
}
export const ARCS = {
  // Transfer söylentisi: menajer, üst seviyeden bir kulübün seni izlediğini söyler
  rumor: {
    repeat: true,
    p: 0.5,
    gaps: [0, 4],
    when: () =>
      isPro(S.stage) &&
      S.stage !== "nba" &&
      S.week === 6 &&
      S.phase === "regular" &&
      rated().length >= 4 &&
      seasonAvg() >= 7 &&
      !(S.arcs.rumor && S.arcs.rumor.season >= S.season - 1),
    steps: [
      a => {
        const nx = ORDER[ORDER.indexOf(S.stage) + 1],
          cc = nx === "nba" ? "US" : coin(0.4) ? "TR" : pick(EU_CC),
          t = pick(leaguePool(nx, cc));
        a.club = t.key;
        a.team = t; // takım listesine kayıtlı olmayabilir; teklif için nesneyi sakla
        a.stage = nx;
        a.cc = t.cc;
        arcSheet(
          $t("arc.transferRumor"),
          $t("arc.agent", {
            agent: S.npc.agent
          }),
          LK.agent(),
          $t("arc.dontTellAnyone", {
            name: esc(t.name),
            nx: levelName(nx)
          }),
          [
            {
              t: $t("arc.shutDownRumors"),
              d: $t("arc.coachTeamPleased"),
              do: () => {
                a.choice = "focus";
                S.rel.koc += 6;
                S.rel.takim += 3;
                return $t("arc.statementClearMind");
              }
            },
            {
              t: $t("arc.leaveDoorAjar"),
              d: $t("arc.offerGuaranteedCoach"),
              do: () => {
                a.choice = "open";
                S.rel.koc -= 6;
                S.rel.taraf -= 4;
                return $t("arc.saidBigClub", {
                  name: esc(t.name)
                });
              }
            },
            {
              t: $t("arc.sayHappyClub"),
              d: $t("arc.fansLoveSeasons"),
              do: () => {
                a.choice = "loyal";
                S.rel.taraf += 8;
                S.rel.koc += 4;
                return $t("arc.kissedCrestJersey");
              }
            }
          ],
          () => {}
        );
      },
      a => {
        const t = teamByKey(a.club),
          rank = standings().findIndex(r => r.key === S.team.key) + 1;
        if (a.choice === "open" && rank > 4) {
          S.moral -= 6;
          S.rel.taraf -= 5;
          msg(
            $t("arc.boosStands"),
            $t("arc.newspaperHeadline"),
            LK.press(),
            `${$t("arc.teamPositionStands", {
              rank: rank
            })}${t ? esc(t.name) : $t("arc.club")}${$t("arc.remarkBooedDuring")}`
          );
        } else if (a.choice === "focus") {
          S.moral += 4;
          msg($t("arc.focusPaidOff"), $t("arc.newspaperHeadline"), LK.press(), `${$t("arc.papersNowWriting")} ${t ? esc(t.name) + $t("arc.scoutStands") : ""}`);
        } else if (a.choice === "loyal") {
          S.moral += 3;
          msg($t("arc.fansFavorite"), $t("arc.newspaperHeadline"), LK.press(), $t("arc.clubPresidentSaid"));
        } else msg($t("arc.rumorContinues"), $t("arc.newspaperHeadline"), LK.press(), $t("arc.sportsShowsTalk"));
      }
    ]
  },
  // Aile meselesi: babanın dükkânı zor durumda
  family: {
    p: 0.35,
    gaps: [0, 4],
    when: () => isPro(S.stage) && S.age >= 19 && S.age <= 27 && S.week === 4 && S.phase === "regular" && !S.arcs.family,
    steps: [
      a => {
        const cost = Math.max(60, Math.round((S.wage || 40) * 3));
        a.cost = cost;
        arcSheet(
          $t("arc.callHome"),
          $t("arc.mom", {
            mom: S.npc.mom
          }),
          LK.mom(),
          $t("arc.sonDontTell", {
            dad: S.npc.dad
          }),
          [
            {
              t: $t("rc.st.sendMoney", { v: fmt(cost) }),
              d: $t("arc.familyBondGrows"),
              do: () => {
                a.choice = "pay";
                tx($t("common.familySupport"), -cost);
                S.rel.aile += 15;
                S.moral += 4;
                return $t("arc.sentTransferMom");
              }
            },
            {
              t: $t("arc.callDadFind"),
              d: $t("arc.moneyWontGo"),
              do: () => {
                a.choice = "advice";
                S.rel.aile -= 4;
                return $t("arc.dadListenedSaid");
              }
            },
            {
              t: $t("arc.goHomeWeekend"),
              d: $t("arc.familyOverjoyedMiss"),
              do: () => {
                a.choice = "visit";
                S.energy -= 20;
                S.rel.aile += 20;
                S.rel.koc -= 4;
                return $t("arc.tookFirstFlight");
              }
            }
          ],
          () => {}
        );
      },
      a => {
        if (a.choice === "pay") {
          S.rel.taraf += 3;
          S.moral += 4;
          msg(
            $t("arc.shopSaved"),
            $t("arc.dad", {
              dad: S.npc.dad
            }),
            LK.dad(),
            $t("arc.hungJerseyShop")
          );
        } else if (a.choice === "advice") {
          S.rel.aile += 4;
          msg(
            $t("arc.freshStart"),
            $t("arc.dad", {
              dad: S.npc.dad
            }),
            LK.dad(),
            $t("arc.handedShopStarted")
          );
        } else {
          S.rel.aile += 6;
          S.moral += 3;
          msg(
            $t("arc.plannedTogether"),
            $t("arc.mom", {
              mom: S.npc.mom
            }),
            LK.mom(),
            $t("arc.dadAddedOnline")
          );
        }
      }
    ]
  },
  // Lise kaptanlığı (ikinci lise yılı)
  captain: {
    p: 1,
    when: () => S.stage === "lise" && S.stageSeason === 2 && S.week === 2 && !S.arcs.captain,
    steps: [
      a =>
        arcSheet(
          $t("arc.captaincyOffer"),
          $t("common.coach", {
            coach: S.npc.coach
          }),
          LK.coach(),
          $t("arc.wantTeamCaptain"),
          [
            {
              t: $t("arc.acceptCaptaincy"),
              d: $t("arc.teamBondsLosing"),
              do: () => {
                a.choice = "yes";
                S.rel.takim += 8;
                S.rel.koc += 4;
                S.captain = true;
                return $t("arc.putArmbandGave");
              }
            },
            {
              t: $t("arc.notReadyYet"),
              d: $t("arc.coachBitDisappointed"),
              do: () => {
                a.choice = "no";
                S.rel.koc -= 3;
                return $t("arc.coachSaidFine");
              }
            }
          ],
          () => {}
        )
    ]
  },
  // Üniversite final haftası
  finals: {
    repeat: true,
    p: 1,
    when: () =>
      S.stage === "uni" &&
      S.studying &&
      S.week === 11 &&
      S.phase === "regular" &&
      !(S.arcs.finals && S.arcs.finals.season === S.season),
    steps: [
      a =>
        arcSheet(
          $t("arc.finalsWeek"),
          $t("arc.cinaraltiCampus"),
          LK.friend(),
          $t("arc.finalsWeekSame", {
            aka: S.aka
          }),
          [
            {
              t: $t("arc.hitLibrary"),
              d: $t("arc.academicsEnergyPlus15"),
              do: () => {
                S.aka += 15;
                S.energy -= 15;
                return $t("arc.pulledThreeNighters");
              }
            },
            {
              t: $t("arc.focusBasketball"),
              d: $t("arc.academicsNextWorkouts"),
              do: () => {
                S.aka -= 10;
                S.buffs.train = (S.buffs.train || 0) + 2;
                return $t("arc.gotLectureNotes");
              }
            },
            {
              t: $t("arc.balanceBoth"),
              d: $t("arc.academicsEnergyPlus6"),
              do: () => {
                S.aka += 6;
                S.energy -= 6;
                return $t("arc.classesDayPractice");
              }
            }
          ],
          () => {}
        )
    ]
  },
  // Mentor: deneyimli bir takım arkadaşı genç oyuncuyu kanatları altına alır
  mentor: {
    p: 0.5,
    gaps: [0, 6],
    when: () => isPro(S.stage) && S.age >= 18 && S.age <= 22 && S.week === 3 && S.phase === "regular" && !S.arcs.mentor,
    steps: [
      a => {
        const m = late.roster().find(r => r.age >= 30) || late.roster()[0];
        a.name = m.n;
        arcSheet(
          $t("arc.bigBrother"),
          $t("arc.teammate", {
            n: m.n
          }),
          LK.mate(),
          $t("arc.afterPracticeMost", {
            n: esc(m.n)
          }),
          [
            {
              t: $t("common.accept"),
              d: $t("arc.nextPracticesMore6"),
              do: () => {
                a.choice = "yes";
                S.buffs.train = (S.buffs.train || 0) + 6;
                S.rel.koc += 3;
                S.rel.takim += 4;
                return $t("arc.whenWalkedGym");
              }
            },
            {
              t: $t("arc.illFindOwn"),
              d: $t("arc.nothingChangesMentor"),
              do: () => {
                a.choice = "no";
                S.rel.takim -= 2;
                S.moral += 2;
                return $t("arc.shruggedDoorsOpen", {
                  n: esc(m.n)
                });
              }
            }
          ],
          () => {}
        );
      },
      a => {
        if (a.choice !== "yes")
          return msg(
            $t("arc.doorsStillOpen"),
            $t("arc.teammate2", {
              name: a.name
            }),
            LK.mate(),
            $t("arc.winkedPassedBefore", {
              name: esc(a.name)
            })
          );
        const weak = Object.entries(S.st).sort((x, y) => x[1] - y[1])[0][0];
        S.st[weak] += 2;
        msg(
          $t("arc.bigBrothersLesson"),
          $t("arc.teammate2", {
            name: a.name
          }),
          LK.mate(),
          $t("arc.sixWeeksFilmPlus2", {
            weak: statName(weak),
            name: esc(a.name)
          })
        );
      }
    ]
  },
  // Milli takım kaptanlığı
  natcap: {
    p: 0.6,
    gaps: [0, 5],
    when: () =>
      (S.career.natCaps || 0) >= 10 &&
      S.age >= 26 &&
      S.role === "star" &&
      S.week === 2 &&
      S.phase === "regular" &&
      !S.arcs.natcap,
    steps: [
      a =>
        arcSheet(
          $t("arc.captainsArmband"),
          `${S.npc.natCoach || $t("arc.nationalTeamHead")} ${$t("arc.nationalTeam")}`,
          LK.coach(),
          $t("arc.nationalTeamHead2"),
          [
            {
              t: $t("arc.idHonored"),
              d: $t("arc.fansFamilyThrilled"),
              do: () => {
                a.choice = "yes";
                S.natCaptain = true;
                S.rel.taraf += 10;
                S.rel.aile += 8;
                S.moral += 6;
                news(
                  $t("arc.becameNewCaptain", {
                    v: fullName()
                  })
                );
                return $t("arc.firstTimeWore");
              }
            },
            {
              t: $t("arc.handArmbandVeteran"),
              d: $t("arc.earnRespectTake"),
              do: () => {
                a.choice = "no";
                S.rel.takim += 4;
                return $t("arc.pressConferencePraised");
              }
            }
          ],
          () => {}
        ),
      a =>
        a.choice === "yes"
          ? msg($t("arc.captainsWord"), $t("arc.newspaperHeadline"), LK.press(), $t("arc.lockerRoomSpeech"))
          : msg($t("arc.quietLeader"), $t("arc.newspaperHeadline"), LK.press(), $t("arc.evenWithoutArmband"))
    ]
  },
  // Rakip takım arkadaşı oluyor
  rivalmate: {
    p: 0.3,
    gaps: [0, 5],
    when: () =>
      S.rival &&
      isPro(S.stage) &&
      S.rival.stage === S.stage &&
      S.rival.team.key !== S.team.key &&
      S.age >= 23 &&
      S.age <= 30 &&
      S.week === 2 &&
      !S.arcs.rivalmate,
    steps: [
      a => {
        const R = S.rival;
        R.team = { key: S.team.key, name: S.team.name, city: S.team.city, cc: S.team.cc, c1: S.team.c1, c2: S.team.c2 };
        news(
          $t("arc.agreedDealOld", {
            v: rivalName(),
            name: S.team.name
          })
        );
        arcSheet(
          $t("arc.oldRivalNew"),
          $t("arc.rival", {
            v: rivalName()
          }),
          LK.rival(),
          $t("arc.clubSignedSpent", {
            v: esc(rivalName())
          }),
          [
            {
              t: $t("arc.leavePastBehind"),
              d: $t("arc.teamChemistryImproves"),
              do: () => {
                a.choice = "peace";
                S.rel.takim += 8;
                S.moral += 3;
                return $t("arc.wentMealAfter", {
                  first: esc(R.first)
                });
              }
            },
            {
              t: $t("arc.competeMinutes"),
              d: $t("arc.coachLovesCompetition"),
              do: () => {
                a.choice = "rival";
                S.rel.koc += 4;
                S.rel.takim -= 4;
                S.buffs.train = (S.buffs.train || 0) + 4;
                return $t("arc.oneOneGames", {
                  first: esc(R.first)
                });
              }
            }
          ],
          () => {}
        );
      },
      a => {
        const R = S.rival;
        if (a.choice === "peace") {
          S.rel.takim += 4;
          msg(
            $t("arc.duo"),
            $t("arc.newspaperHeadline"),
            LK.press(),
            $t("arc.findEachOther", {
              first: esc(R.first)
            })
          );
        } else {
          S.moral -= 2;
          msg($t("arc.tenseLockerRoom"), $t("arc.newspaperHeadline"), LK.press(), $t("arc.pressConferenceCoach"));
        }
      }
    ]
  },
  // Emeklilik kararı ve veda turu
  farewell: {
    p: 1,
    gaps: [0, 8],
    when: () => S.age >= 33 && S.week === 4 && S.phase === "regular" && !S.arcs.farewell && isPro(S.stage),
    steps: [
      a =>
        arcSheet(
          $t("arc.bodyTalking"),
          $t("arc.mom", {
            mom: S.npc.mom
          }),
          LK.mom(),
          $t("arc.kneesArentWhat"),
          [
            {
              t: $t("arc.lastSeasonFarewell"),
              d: $t("arc.retireEndSeason"),
              do: () => {
                a.choice = "last";
                S.farewell = S.season;
                S.rel.taraf += 10;
                S.moral += 6;
                news(
                  $t("arc.announcedRetireEnd", {
                    v: fullName()
                  })
                );
                return $t("arc.afterAnnouncementClub");
              }
            },
            {
              t: $t("arc.keepGoingLong"),
              d: $t("arc.careerGoesInjury"),
              do: () => {
                a.choice = "go";
                S.buffs.injWk = 10;
                S.buffs.injMul = 1.3;
                S.moral += 3;
                return $t("arc.illDieCourt");
              }
            },
            {
              t: $t("arc.startCoachingCourses"),
              d: $t("arc.keepPlayingEarn"),
              do: () => {
                a.choice = "coach";
                S.coachCourse = true;
                S.rel.koc += 6;
                return $t("arc.signedWeekendCoaching");
              }
            }
          ],
          () => {}
        ),
      a => {
        if (a.choice === "last") {
          S.rel.taraf += 15;
          S.followers = Math.round(S.followers * 1.1);
          msg($t("arc.standingOvation"), $t("arc.farewellTour"), LK.press(), $t("arc.evenRoadOpposing"));
        } else if (a.choice === "coach") msg($t("arc.whiteboard"), $t("common.coachingCourse"), LK.coach(), $t("arc.gotTopGrade"));
        else msg($t("arc.ageNumber"), $t("arc.newspaperHeadline"), LK.press(), $t("arc.papersCallMan"));
      }
    ]
  },
  // Geç açılan çiçek: alt liglerde kalmış ama iyi oynayan oyuncuya ikinci şans
  bloomer: {
    p: 0.6,
    gaps: [0, 5],
    when: () =>
      ["t3", "t2"].includes(S.stage) &&
      S.age >= 22 &&
      S.age <= 27 &&
      S.week === 6 &&
      S.phase === "regular" &&
      rated().length >= 4 &&
      seasonAvg() >= 6.5 &&
      !S.arcs.bloomer,
    steps: [
      a => {
        const cost = Math.max(40, Math.round(S.wage * 2));
        a.cost = cost;
        arcSheet(
          $t("arc.summerCampInvitation"),
          $t("arc.retiredNationalPlayer"),
          LK.coach(),
          $t("arc.legendWhoPlayed", {
            cost: fmt(cost)
          }),
          [
            {
              t: $t("rc.st.joinCamp", { v: fmt(cost) }),
              d: $t("arc.attributesNextPlus1"),
              do: () => {
                a.choice = "yes";
                tx($t("arc.summerCamp"), -cost);
                for (const k in S.st) S.st[k] += 1;
                S.buffs.train = (S.buffs.train || 0) + 10;
                S.moral += 5;
                return $t("arc.campHellLast");
              }
            },
            {
              t: $t("arc.notSummer"),
              d: $t("arc.nothingChanges"),
              do: () => {
                a.choice = "no";
                return $t("arc.politelyTurnedDown");
              }
            }
          ],
          () => {}
        );
      },
      a => {
        if (a.choice !== "yes") return msg($t("arc.missedOpportunity"), $t("arc.agent2"), LK.agent(), $t("arc.agentSaidTwo"));
        const nx = ORDER[ORDER.indexOf(S.stage) + 1],
          cc = coin(0.5) ? "TR" : pick(EU_CC),
          t = pick(leaguePool(nx, cc));
        a.club = t.key;
        a.team = t; // takım listesine kayıtlı olmayabilir
        a.stage = nx;
        msg(
          $t("arc.scoutStands2"),
          $t("arc.agent", {
            agent: S.npc.agent
          }),
          LK.agent(),
          $t("arc.scoutWatchedLast", {
            name: esc(t.name)
          })
        );
      }
    ]
  }
};
// Tek seferlik kuyruk anları
export const ARC_ONCE = {
  comeback: () =>
    arcSheet(
      $t("arc.backCourt"),
      $t("common.coach", {
        coach: S.npc.coach
      }),
      LK.coach(),
      $t("arc.doctorSaidReturn"),
      [
        {
          t: $t("arc.easeBackListen"),
          d: $t("arc.injuryRiskHalved6"),
          do: () => {
            S.buffs.injWk = 6;
            S.buffs.injMul = 0.5;
            S.energy += 10;
            S.rel.koc += 2;
            return $t("arc.plannedReturnPhysio");
          }
        },
        {
          t: $t("arc.goBackFull"),
          d: $t("arc.moraleInjuryRiskPlus6"),
          do: () => {
            S.buffs.injWk = 5;
            S.buffs.injMul = 1.8;
            S.moral += 6;
            S.rel.taraf += 3;
            return $t("arc.ranWarmStands");
          }
        }
      ],
      () => {}
    )
};

/* ---- Mevcut akışa bağlantılar (olay sistemi üzerinden) ---- */
Bus.on("week:start", () => {
  if (S.buffs.injWk > 0) S.buffs.injWk--;
});
Bus.offer("week:sheet", roleReview, PRIO.roleReview);
Bus.offer("week:sheet", storyTick, PRIO.storyTick);
// Uzun sakatlık bitince dönüş hikâyesi
Bus.on("injury:healed", inj => {
  if ((inj.total || 0) >= 3) S.arcQ.push("comeback");
});
// Maç sonrası: önceki basın sözlerinin karşılığı ve yeni basın toplantısı
Bus.use("match:after", (ctx, next) => {
  const win = ctx.win,
    inl = M && M.pressChecked, // sonuç panelinde zaten soruldu (pressInlineHTML)
    fu = inl ? M.pressFu : pressFollowUp(win);
  if (fu) {
    news(fu);
    toast(fu);
  }
  if (inl && M.pressInl) return next();
  if (!inl && pressDue(win)) return pressConference(win, next);
  if (isDerby(M.opp) && M.rating != null) {
    const d = derbyResult(win);
    toast(d.txt);
  }
  next();
});
// Sezon sonu teklifleri: transfer söylentisinin sonucu
export function storyOffers(offers) {
  const bl = S.arcs && S.arcs.bloomer;
  if (bl && bl.club && !bl.done && bl.season === S.season - 1) {
    bl.done = true;
    const t = teamByKey(bl.club) || bl.team;
    if (t && !offers.some(o => o.team.key === t.key))
      offers.push({
        team: t,
        stage: bl.stage,
        role: "rot",
        wage: Math.round(WAGE[bl.stage] * ((LEAGUES[t.cc] || LEAGUES.TR).pr || 1)),
        years: 2,
        note: $t("offer.secondChance", {
          stage: levelName(bl.stage)
        })
      });
  }
  const a = S.arcs && S.arcs.rumor;
  if (!a || a.season !== S.season - 1 || a.done) return offers;
  a.done = true;
  const t = teamByKey(a.club) || a.team;
  if (!t) return offers;
  const avg = seasonAvgOf();
  if (a.choice === "loyal") {
    const s = offers.find(o => o.stay);
    if (s) {
      s.wage = Math.round(s.wage * 1.15);
      s.note = $t("offer.loyaltyRenewalPlus15pct");
    }
    return offers;
  }
  // söylenti teklifi de normal teklif eşiklerine tabidir (potansiyel, not, NBA yaş sınırı)
  const P = potential(avg, false),
    gate =
      P >= (BAL.need[a.stage] || 0) - 3 &&
      (a.stage !== "nba" || (S.age <= 29 && avg >= 6.8)) &&
      (a.stage !== "euro" || avg >= 6.6);
  if (gate && (a.choice === "open" || (a.choice === "focus" && avg >= 7))) {
    const role = roleAt(ovr(), a.stage, t.cc);
    if (!offers.some(o => o.team.key === t.key))
      offers.push({
        team: t,
        stage: a.stage,
        role: role === "bench" ? "bench" : "rot",
        wage: Math.round(WAGE[a.stage] * ((LEAGUES[t.cc] || LEAGUES.TR).pr || 1) * (a.choice === "open" ? 1.2 : 1.1)),
        years: 2,
        note: $t("offer.rumorCameTrue", {
          stage: levelName(a.stage)
        })
      });
  }
  return offers;
}
// Maç sekmesine derbi uyarısı
export function derbyNote(opp) {
  if (isDerby(opp) && !isRivalDerby(opp)) return late.dbyNoteHTML(opp);
  return isDerby(opp)
    ? `<div class="say bad"><b>${$t("derby.derby2")}</b> ${$t("derby.rivalOpposingTeam", {
        v: esc(rivalName())
      })}</div>`
    : "";
}
