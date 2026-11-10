/* ================= MEKAN: STADYUM (antrenman, maç hazırlığı, seçmeler) =================
   src/places.js'ten ayrıldı (openLoc buradan çağırır); dışa aktarım adları aynı. */
import { t as $t } from "../i18n/index.js";
import { late } from "../late.js";
import { $, $$, Bus, COMMON_DRILLS, DRILLS, POS, STATS, clamp, esc, fmt, isPro, leagueName, pick, statName, tdOf, toast } from "../data.js";
import { icon } from "../art.js";
import { mgBlock, mgDribble, mgShoot } from "../games.js";
import { ROLE_N, S, TD, actHTML, app, bindActs, closeSheet, crestSVG, eff, fixture, fullName, ageGainMul, gainStat, levelMul, lgName, news, norm, phaseName, renderMain, resultView, seasonLabel, sheet, standings, stat1, statVal, tabsHTML, teamByKey, tx, useSlot } from "../core.js";
import { save } from "../save.js";
import { momentCount, DRILL_IC, arenaFor, runGame, drillGain } from "../places.js";
export function locStad(I, tab = "mac") {
  if (S.brk && tab === "mac") tab = "idman"; // milli takım arasında lig maçı oynanmaz (src/plan.js)
  const tabs = [
    ["mac", $t("common.match")],
    ["idman", $t("stadium.training")],
    ["kadro", $t("stadium.roster")],
    ["tablo", $t("stadium.standings")]
  ];
  if (S.tryout && !S.tryout.done) tabs.push(["secme", $t("stadium.tryouts")]);
  sheet(I.n, `${S.team.name} · ${S.city}`, `${tabsHTML(tabs, tab)}<div id="stc" class="stack"></div>`, {
    icon: crestSVG(S.team, 36)
  });
  $$(".tabs button").forEach(x => (x.onclick = () => locStad(I, x.dataset.t)));
  const c = $("#stc");
  if (tab === "kadro") late.rosterTab(c);
  if (tab === "mac" && S.injury) {
    const fx = fixture(),
      opp = teamByKey(fx.opp);
    c.innerHTML =
      `<div class="card"><div class="eyebrow">${$t("stadium.injuryReport")}</div><h2 class="bad">${esc(S.injury.n)}</h2><div class="kv"><span>${$t("common.timeRemaining")}</span><b>${$t(
        "stadium.weeks",
        {
          w: S.injury.w
        }
      )}</b><span>${$t("stadium.weeksMatch")}</span><b>${esc(opp.name)}</b></div><div class="bar"><i style="--w:${100 - (S.injury.w / S.injury.total) * 100};background:var(--good)"></i></div><p class="small muted">${$t("stadium.cantPlayMatches")}</p></div>` +
      actHTML({
        id: "fizyo",
        ic: icon("kryo"),
        t: $t("common.physio"),
        d: $t("stadium.chanceShortenRecovery50pct"),
        slot: 1,
        fx: [[$t("common.energyPlus10"), "p"]],
        btn: $t("stadium.joinSession")
      }) +
      late.adHealHTML() +
      `<button class="btn pri big" id="watch">${$t("stadium.watchMatchStands")}</button>`;
    bindActs({ fizyo: late.physioAct });
    late.bindAdHeal(() => locStad(I, "mac"));
    $("#watch").onclick = () => {
      closeSheet();
      late.simWithoutMe();
    };
    return;
  }
  if (tab === "mac") {
    const fx = fixture(),
      opp = teamByKey(fx.opp),
      row = S.league.find(r => r.key === opp.key),
      mr = S.league.find(r => r.key === S.team.key);
    c.innerHTML = `<div class="card ta-c"><div class="eyebrow">${$t("common.week2", {
      v: phaseName(),
      week: S.week
    })}</div>
     <div class="row nowrap" style="justify-content:space-around"><div>${crestSVG(S.team, 64)}<div style="font-weight:800">${esc(S.team.short)}</div><div class="small muted">${mr.w}-${mr.l}</div></div><div class="disp" style="font-size:var(--fs-7xl);color:var(--muted)">${$t("stadium.vs")}</div><div>${crestSVG(opp, 64)}<div style="font-weight:800">${esc(opp.short)}</div><div class="small muted">${row.w}-${row.l}</div></div></div>
     <div style="font-weight:700">${esc(opp.name)}</div><div class="small muted">${
       fx.home
         ? $t("stadium.home", {
             city: esc(S.city)
           })
         : $t("stadium.away", {
             city: esc(opp.city)
           })
     }</div></div>
     <div class="card"><div class="kv"><span>${$t("stadium.energy")}</span><b class="${S.energy < 35 ? "bad" : ""}">${S.energy}</b><span>${$t("stadium.role")}</span><b>${isPro(S.stage) ? ROLE_N[S.role] : $t("common.schoolTeam")}</b><span>${$t("common.relationshipCoach")}</span><b>${S.rel.koc}</b><span>${$t("stadium.expectedKeyMoment")}</span><b>${momentCount()}</b></div>${S.energy < 35 ? `<p class="small bad">${$t("stadium.tiredAccuracyDrop")}</p>` : ""}${
       S.slot > 0
         ? `<p class="small muted">${$t("stadium.moreTimeSlots", {
             slot: S.slot
           })}</p>`
         : ""
     }</div>
     ${late.adEnergyHTML()}${late.serPreHTML()}${late.derbyNote(opp)}${late.prepHTML()}${late.boostsHTML()}<button class="btn pri big" id="play">${$t("stadium.playMatch")}</button><button class="btn ghost" id="qplay">${$t("stadium.simMatch")}</button>`;
    $("#play").onclick = () => {
      closeSheet();
      late.playMatch().catch(late.matchFail);
    };
    $("#qplay").onclick = () => {
      closeSheet();
      late.playMatch({ opp, home: fx.home, comp: "lig", label: `${lgName()} · ${phaseName()}`, auto: true }).catch(late.matchFail);
    };
    late.bindAdEnergy(() => locStad(I, "mac"));
    late.bindPrep(() => locStad(I, "mac"));
  }
  if (tab === "idman" && S.injury) {
    c.innerHTML =
      `<div class="say bad">${$t("stadium.cantTrainWhile")}</div>` +
      actHTML({
        id: "fizyo",
        ic: icon("kryo"),
        t: $t("common.physio"),
        d: $t("stadium.chanceShortenRecovery50pct"),
        slot: 1,
        fx: [[$t("common.energyPlus10"), "p"]],
        btn: $t("stadium.joinSession")
      });
    bindActs({ fizyo: late.physioAct });
    return;
  }
  if (tab === "idman") {
    const list = [...DRILLS[S.pos], ...COMMON_DRILLS];
    c.innerHTML =
      late.programHTML() +
      `<div class="eyebrow">${$t("stadium.program", {
        n: POS[S.pos].n
      })}</div>` +
      list
        .map(([id, n, k, g, d]) =>
          actHTML({
            id,
            ic: icon(DRILL_IC[g]),
            t: n,
            d: $t("stadium.now", {
              d: d,
              k: statName(k),
              v: stat1(k)
            }),
            slot: 1,
            fx: [
              [$t("stadium.energyMinus18"), "n"],
              [`${statName(k)} +0–5`, "p"]
            ],
            btn: $t("common.start"),
            disabled: S.energy < 18
          })
        )
        .join("") +
      actHTML({
        id: "takim",
        ic: icon("whistle"),
        t: $t("stadium.teamPractice"),
        d: $t("stadium.coachsTacticsSession"),
        slot: 1,
        fx: [
          [$t("stadium.energyMinus12"), "n"],
          [$t("common.coachPlus4"), "p"],
          [$t("common.teamPlus3"), "p"],
          [$t("prog.teamFx"), "p"]
        ],
        btn: $t("common.join"),
        disabled: S.energy < 12
      }) +
      (S.items.hoca
        ? ""
        : actHTML({
            id: "hoca",
            ic: icon("whistle"),
            t: $t("stadium.hirePersonalTrainer"),
            d: $t("stadium.gainTrainingOnePlus1"),
            price: 6000,
            fx: [[$t("stadium.permanent"), "t"]],
            btn: fmt(6000),
            cls: "ghost"
          }));
    const m = {};
    list.forEach(
      d =>
        (m[d[0]] = () => {
          closeSheet();
          runDrill(d);
        })
    );
    m.takim = () => {
      useSlot();
      S.energy -= 12;
      S.rel.koc += 4;
      S.rel.takim += 3;
      // takım antrenmanı: sabit +1 yerine programın odak niteliğine (yoksa rastgele) seviyeye bağlı ondalık katkı;
      // iyi oynanan bir mini oyunlu antrenmandan azdır ama boşa gitmez
      const pg = late.program(),
        k = STATS.some(x => x[0] === pg) ? pg : pick(STATS)[0],
        g = Math.round(0.55 * levelMul(k) * ageGainMul() * late.modeTrainMul() * 100) / 100;
      gainStat(k, g);
      norm();
      save();
      resultView(
        $t("stadium.teamPractice"),
        $t("prog.team", {
          coach: S.npc.coach,
          k: statName(k),
          v: g.toFixed(2)
        }),
        [
          [$t("common.coachPlus4"), "p"],
          [$t("common.teamPlus3"), "p"]
        ]
      );
    };
    m.hoca = () => {
      if (S.money < 6000) return;
      tx($t("stadium.personalTrainer"), -6000);
      S.items.hoca = 1;
      save();
      toast($t("stadium.coachReady"));
      locStad(I, "idman");
    };
    bindActs(m);
    late.bindProgram(() => locStad(I, "idman"));
  }
  if (tab === "tablo") {
    c.innerHTML = `<div class="card"><div class="eyebrow">${esc(lgName())} · ${seasonLabel()}</div><div class="tbl"><table><tr><th>#</th><th>${$t("common.team")}</th><th>G</th><th>M</th><th>${$t("stadium.avg")}</th></tr>${standings()
      .map((r, i) => {
        const t = teamByKey(r.key);
        return `<tr class="${t.key === S.team.key ? "me" : ""}"><td>${i + 1}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:var(--r-2xs);background:${t.c1};margin-right:6px"></span>${esc(t.name)}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf - r.pa > 0 ? "+" : ""}${r.pf - r.pa}</td></tr>`;
      })
      .join("")}</table></div><p class="small muted">${$t("stadium.topTeamsStay4", {
      v: S.stage === "lise" ? $t("lc.toTour") : $t("lc.toPlayoff")
    })}</p></div>`;
  }
  if (tab === "secme") {
    const t = teamByKey(S.tryout.club);
    c.innerHTML =
      `<div class="card"><div class="row nowrap">${crestSVG(t, 48)}<div><div class="eyebrow">${esc(leagueName(S.tryout.stage, t.cc))}</div><h3>${esc(t.name)}</h3></div></div><p class="small">${$t(
        "stadium.tryoutThreeParts3",
        {
          until: S.tryout.until
        }
      )}</p></div>` +
      actHTML({
        id: "go",
        ic: icon("whistle"),
        t: $t("stadium.joinTryout"),
        d: $t("stadium.takesWholeDay"),
        slot: 1,
        fx: [[$t("stadium.energyMinus20"), "n"]],
        btn: $t("common.join")
      });
    bindActs({
      go: () => {
        closeSheet();
        runTryout();
      }
    });
  }
}
export async function runDrill([id, name, k, kind]) {
  useSlot();
  S.energy -= 18;
  save();
  arenaFor(null);
  app.innerHTML = `<div class="row between pt-3"><div><div class="eyebrow">${$t("drill.training", {
    short: esc(S.team.short),
    n: POS[S.pos].n
  })}</div><h2>${name}</h2></div></div><div id="stg"></div><div id="res"></div>`;
  const ratio = await runGame(kind, $("#stg"), clamp(eff(k) + 10, 5, 100), 3, name);
  const gain = drillGain(k, ratio);
  Bus.emit("train:done", { k, ratio });
  if (ratio > 0.6) S.rel.koc += 2;
  norm();
  save();
  $("#res").innerHTML = `<div class="card mt-3"><div class="row between"><div><div class="eyebrow">${$t("drill.resultSuccess", {
    v: Math.round(ratio * 100)
  })}</div><h2>${gain >= 1 ? $t("drill.perfectSession") : gain >= 0.5 ? $t("drill.productiveSession") : gain >= 0.1 ? $t("drill.okay") : $t("drill.notDay")}</h2></div><div class="big-num ${gain >= 0.05 ? "good" : ""}">+${gain.toFixed(2)}</div></div><p class="small muted">${$t(
    "prog.drillNow",
    {
      k: statName(k),
      v: stat1(k)
    }
  )}</p><div class="bar"><i style="--w:${statVal(k)}"></i></div>${late.trainAdHTML(gain)}<button class="btn pri" id="bk">${$t("common.backMap")}</button></div>`;
  late.bindTrainAd(k, gain);
  $("#bk").onclick = renderMain;
}
export async function runTryout() {
  useSlot();
  S.energy -= 20;
  save();
  const club = teamByKey(S.tryout.club);
  arenaFor(club);
  app.innerHTML = `<div class="row nowrap pt-3">${crestSVG(club, 44)}<div><div class="eyebrow">${$t("stadium.tryouts")}</div><h2>${esc(club.name)}</h2></div></div><div class="say" id="tsay">${$t("tryout.partShootingThree1")}</div><div id="stg"></div><div id="res"></div>`;
  const shift = (tdOf(S.tryout.stage, club.cc) - TD()) / 2;
  const r1 = await mgShoot($("#stg"), { eff: clamp(eff("sut") - shift, 3, 100), shots: 3, title: $t("tryout.tryoutShooting"), def: false });
  $("#tsay").textContent = $t("tryout.partDribblingScouts2");
  const r2 = await mgDribble($("#stg"), { eff: clamp(eff("hiz") - shift, 3, 100), reps: 1, title: $t("tryout.tryoutDribbling") });
  $("#tsay").textContent = $t("tryout.partDefense3");
  const r3 = await mgBlock($("#stg"), {
    eff: clamp((eff("sav") + eff("guc")) / 2 - shift, 3, 100),
    reps: 1,
    title: $t("tryout.tryoutBlocking")
  });
  const score = r1.made + r2.ok + r3.ok,
    pass = score >= 3;
  S.tryout.done = true;
  if (pass) {
    S.clubDeal = { club: club.key, stage: S.tryout.stage };
    news(
      $t("tryout.passedTryouts", {
        v: fullName(),
        name: club.name
      })
    );
    S.moral += 15;
    S.rel.aile += 8;
  } else {
    S.moral -= 8;
    news(
      $t("tryout.tryoutResultsNot", {
        name: club.name
      })
    );
  }
  norm();
  save();
  $("#stg").innerHTML = "";
  $("#tsay").remove();
  $("#res").innerHTML = `<div class="card"><div class="eyebrow">${$t("tryout.tryoutResult5", {
    score: score
  })}</div><h2 class="${pass ? "good" : "bad"}">${pass ? $t("tryout.madeSquad") : $t("tryout.didntMakeSquad")}</h2><p>${
    pass
      ? $t("tryout.offerContractEnd", {
          name: club.name
        })
      : $t("tryout.scoutSaidTheres")
  }</p><button class="btn pri" id="bk">${$t("common.backMap")}</button></div>`;
  $("#bk").onclick = renderMain;
}
