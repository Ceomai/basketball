/* ================= MEKAN: OKUL: sınıf quiz'i / menajer ofisi =================
   src/places.js'ten ayrıldı (openLoc buradan çağırır); dışa aktarım adları aynı. */
import { t as $t } from "../i18n/index.js";
import { late } from "../late.js";
import { $, $$, esc, fmt, pick, ri, shuffle } from "../data.js";
import { icon } from "../art.js";
import { ROLE_N, S, actHTML, bindActs, fame, fullName, news, norm, resultView, sheet, tx, useSlot } from "../core.js";
import { save } from "../save.js";
import { addScene } from "../places.js";
export const TRIVIA = [
  [$t("quiz.howManySeconds"), "24", ["24", "30", "20", "35"]],
  [$t("quiz.howManyMinutes"), "40", ["40", "48", "36", "44"]],
  [$t("quiz.howManyPlayers"), "5", ["5", "6", "4", "7"]],
  [$t("quiz.howManyPersonal"), "5", ["5", "6", "4", "3"]],
  [$t("quiz.timeLimitBring"), $t("quiz.seconds8"), $t("quiz.secondsSecondsSeconds8").split("|")],
  [$t("quiz.whichAreaThree"), $t("quiz.paint"), [$t("quiz.paint"), $t("quiz.midcourt"), $t("quiz.corners"), $t("quiz.threePointLine")]],
  [$t("quiz.whatCapitalTurkey"), "Ankara", ["Ankara", "İstanbul", "İzmir", "Bursa"]],
  [$t("quiz.whichTwoContinents"), $t("quiz.europeAsia"), [$t("quiz.europeAsia"), $t("quiz.asiaAfrica"), $t("quiz.europeAfrica"), $t("quiz.onlyEurope")]],
  [$t("quiz.whatTemperatureWater"), "100 °C", ["100 °C", "90 °C", "80 °C", "120 °C"]],
  [$t("quiz.what144"), "12", ["12", "14", "11", "16"]],
  [$t("quiz.whichPartPlant"), $t("quiz.leaf"), $t("rc.q.plant").split("|")],
  [$t("quiz.euroleagueClub"), $t("quiz.europe"), $t("rc.q.cont").split("|")]
];
export function makeQuestion() {
  const r = Math.random();
  if (r < 0.35) {
    const a = ri(2, 9),
      b = ri(2, 9),
      f = ri(0, 6);
    const ans = 3 * a + 2 * b + f;
    const o = shuffle([ans, ans + 2, ans - 3, ans + 5]).map(String);
    return {
      q: $t("quiz.playerMadeThree", {
        a: a,
        b: b,
        f: f
      }),
      a: String(ans),
      o
    };
  }
  if (r < 0.55) {
    const m = ri(3, 9),
      n = m + ri(2, 8);
    const p = Math.round((m / n) * 100);
    const o = shuffle([p, p + 7, p - 9, p + 15]).map(x => `%${x}`);
    return {
      q: $t("quiz.makesShotsWhat", {
        n: n,
        m: m
      }),
      a: `%${p}`,
      o
    };
  }
  const t = pick(TRIVIA);
  return { q: t[0], a: t[1], o: shuffle(t[2]) };
}
export function runQuiz(nq, done) {
  let i = 0,
    correct = 0;
  const ask = () => {
    const Q = makeQuestion();
    const b = $("#shb");
    if (!b) return;
    b.innerHTML = "";
    addScene(b, "okul", null, { board: `SORU ${i + 1}/${nq}\n${Q.q.length > 34 ? Q.q.slice(0, 34) + "…" : Q.q}` });
    b.insertAdjacentHTML(
      "beforeend",
      `<div class="card"><div class="eyebrow">${$t("school.questionCorrect", {
        v: i + 1,
        nq: nq,
        correct: correct
      })}</div><h3 style="text-transform:none;font-family:var(--body);font-weight:800;font-size:var(--fs-xl);letter-spacing:0">${esc(Q.q)}</h3><div class="bar"><i id="qt" style="background:var(--warn)"></i></div><div class="qopts">${Q.o.map(o => `<button class="qbtn" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`
    );
    const card = b.lastElementChild; // bu soru kartı: panel kapanır ya da başka panel açılırsa sınav sessizce biter
    // süre çubuğu işlevseldir: düşük grafik ve "hareketi azalt"ta da akar (tek WAAPI animasyonu, yalnız transform)
    late.motionPlay(
      $("#qt"),
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { functional: true, key: "timer", opts: { duration: 8000, easing: "linear", fill: "forwards" } }
    );
    let over = false;
    const fin = pickd => {
      if (over || !card || !card.isConnected) return;
      over = true;
      clearTimeout(tm);
      $$(".qbtn").forEach(x => {
        if (x.dataset.o === Q.a) x.classList.add("ok");
        else if (x.dataset.o === pickd) x.classList.add("no");
        x.disabled = true;
      });
      if (pickd === Q.a) correct++;
      setTimeout(() => {
        if (!card.isConnected) return;
        i++;
        i < nq ? ask() : done(correct);
      }, 900);
    };
    const tm = setTimeout(() => fin(null), 8000);
    $$(".qbtn").forEach(x => (x.onclick = () => fin(x.dataset.o)));
  };
  ask();
}
export function locOkul(I) {
  if (S.studying) {
    const isL = S.stage === "lise",
      pr = isL ? 25 : 60;
    const b = sheet(
      I.n,
      isL
        ? S.team.name
        : `${S.uni || $t("common.university")} ${$t("school.year", {
            uniYear: S.uniYear
          })}`,
      `<div class="card"><div class="attr"><span>${$t("common.academics")}</span><div class="bar"><i style="--w:${S.aka};background:var(--info)"></i></div><b>${S.aka}</b></div><p class="small muted">${isL ? $t("school.afterHighSchool") : $t("school.academicsBelowSeasons40")}</p></div>` +
        actHTML({
          id: "ders",
          ic: icon("book"),
          t: $t("school.attendClass"),
          d: $t("school.teacherWriteQuestions3"),
          slot: 1,
          fx: [
            [$t("school.academicsPerCorrectPlus3"), "p"],
            [$t("school.energyMinus6"), "n"]
          ],
          btn: $t("school.attendClass")
        }) +
        actHTML({
          id: "kurs",
          ic: icon("pencil"),
          t: isL ? $t("school.examPrepCourse") : $t("school.privateTutoring"),
          d: $t("school.intensiveQuestion5"),
          slot: 1,
          price: pr,
          fx: [
            [$t("school.perCorrectAnswerPlus3"), "p"],
            [$t("school.basePlus4"), "p"],
            [`−${fmt(pr)}`, "n"]
          ],
          btn: $t("school.enroll")
        }) +
        (!isL
          ? actHTML({
              id: "birak",
              ic: icon("door"),
              t: $t("school.dropSchool"),
              d: $t("school.focusEntirely"),
              fx: [
                [$t("school.familyMinus10"), "n"],
                [$t("common.moralePlus5"), "p"]
              ],
              btn: $t("school.drop"),
              cls: "bad"
            })
          : "")
    );
    addScene(b, "okul", $t("school.phonesAwayEyes"), {
      board: isL ? $t("school.todaysTopicShooting") : $t("school.statisticsEfficiency101")
    });
    bindActs({
      ders: () => {
        useSlot();
        S.energy -= 6;
        S.studied = true;
        runQuiz(3, c => {
          S.aka += c * 3;
          S.moral += c === 3 ? 3 : -1;
          norm();
          save();
          resultView(
            $t("school.class"),
            c === 3
              ? $t("school.threeThreeTeacher")
              : c
                ? $t("school.correctNotBad", {
                    c: c
                  })
                : $t("school.noneCorrectTeacher"),
            [
              [
                $t("school.academics", {
                  v: c * 3
                }),
                "p"
              ]
            ]
          );
        });
      },
      kurs: () => {
        if (S.money < pr) return;
        useSlot();
        tx(isL ? $t("school.examPrepCourse") : $t("school.privateTutoring"), -pr);
        S.studied = true;
        runQuiz(5, c => {
          S.aka += 4 + c * 3;
          norm();
          save();
          resultView(
            $t("school.course"),
            $t("school.correctHeadFull5", {
              c: c
            }),
            [
              [
                $t("school.academics", {
                  v: 4 + c * 3
                }),
                "p"
              ]
            ]
          );
        });
      },
      birak: () => {
        S.studying = false;
        S.rel.aile -= 10;
        S.moral += 5;
        news(
          $t("school.droppedSchoolFocus", {
            v: fullName()
          })
        );
        norm();
        save();
        resultView(
          $t("school.decisionMade"),
          $t("school.wentQuietPhone", {
            mom: S.npc.mom
          })
        );
      }
    });
  } else {
    const sp = Math.max(50, Math.round(fame() * fame() * ({ nba: 9, euro: 4, t1: 2 }[S.stage] || 1.2) * late.sponsorMul()));
    const b = sheet(
      $t("common.agentsOffice"),
      $t("school.agent", {
        agent: S.npc.agent
      }),
      `<div class="card"><div class="kv"><span>${$t("common.contract")}</span><b>${esc(S.team.name)}</b><span>${$t("common.timeRemaining")}</span><b>${$t(
        "school.yr",
        {
          v: S.contract || 0
        }
      )}</b><span>${$t("common.weeklySalary")}</span><b>${fmt(S.wage)}</b><span>${$t("common.role")}</span><b>${ROLE_N[S.role]}</b><span>${$t("common.fame")}</span><b>${fame()}/100</b></div></div>` +
        (S.buffs.sponsorSeason === S.season
          ? `<p class="small muted">${$t("school.alreadySignedSeasons")}</p>`
          : actHTML({
              id: "sp",
              ic: icon("handshake"),
              t: $t("school.sponsorshipDeal"),
              d: fame() < 15 ? $t("school.fameIsntEnough") : $t("school.oncePerSeason"),
              fx: [[`~${fmt(sp)}`, "p"]],
              btn: $t("school.negotiate"),
              disabled: fame() < 15
            })) +
        actHTML({
          id: "pr",
          ic: icon("mic"),
          t: $t("common.pressConference"),
          d: $t("school.agentSetQuestions"),
          slot: 1,
          fx: [
            [$t("common.fans3"), "p"],
            [$t("common.followers2"), "p"]
          ],
          btn: $t("school.edit")
        }) +
        late.sponsorDealHTML() +
        late.agentExtrasHTML() +
        (S.transferReq === S.season
          ? `<p class="small warn">${$t("school.transferRequestPassed")}</p>`
          : actHTML({
              id: "tr",
              ic: icon("door"),
              t: $t("school.transferRequest"),
              d: $t("school.tellClubWant"),
              fx: [
                [$t("school.offerPlus1"), "p"],
                [$t("school.coachMinus12"), "n"]
              ],
              btn: $t("school.request"),
              cls: "bad"
            }))
    );
    addScene(b, "ofis", fame() > 40 ? $t("school.phoneWontStop") : $t("school.earnMorePost"));
    late.bindAgentExtras();
    bindActs({
      tr: () => {
        S.transferReq = S.season;
        S.buffs.offer = 1;
        S.rel.koc -= 12;
        norm();
        news(
          $t("school.askedClubTransfer", {
            v: fullName()
          })
        );
        save();
        resultView(
          $t("school.requestSent"),
          $t("school.deliveredWritten", {
            agent: S.npc.agent,
            coach: S.npc.coach
          }),
          [
            [$t("school.offerSeasonEndPlus1"), "p"],
            [$t("school.coachMinus12"), "n"]
          ]
        );
      },
      sp: () => late.sponsorTalk(sp),
      pr: () => {
        useSlot();
        const g = ri(2, 6);
        S.rel.taraf += g;
        late.mediaGain(0.03, 4);
        norm();
        save();
        resultView(
          $t("common.pressConference"),
          $t("school.spokeCalmlyConfidently", {
            journalist: S.npc.journalist
          }),
          [
            [
              $t("common.fans4", {
                g: g
              }),
              "p"
            ],
            [$t("school.followersPlus4pct"), "p"]
          ]
        );
      }
    });
  }
}
export function negotiate(base) {
  let offer = base,
    round = 1;
  const show = () => {
    $("#shb").innerHTML = `<div class="card"><div class="eyebrow">${$t("school.negotiationRound3", {
      round: round
    })}</div><div class="big-num gold">${fmt(offer)}</div><p class="small muted">${$t("school.brandRepTable")}</p></div><div class="grid2"><button class="btn good" id="ok1">${$t("common.accept")}</button><button class="btn gold" id="up1" ${round >= 3 ? "disabled" : ""}>${$t("school.askMore25pct")}</button></div>`;
    $("#ok1").onclick = () => {
      tx($t("school.sponsorshipDeal"), offer);
      S.buffs.sponsorSeason = S.season;
      news(
        $t("school.signedNewSponsorship", {
          v: fullName()
        })
      );
      save();
      resultView(
        $t("school.signed"),
        $t("school.hitAccountAd", {
          offer: fmt(offer)
        })
      );
    };
    $("#up1").onclick = () => {
      if (Math.random() < 0.22 * round) {
        S.buffs.sponsorSeason = S.season;
        save();
        resultView($t("school.walkedAway"), $t("school.repPackedWell"));
        return;
      }
      offer = Math.round(offer * 1.25);
      round++;
      show();
    };
  };
  show();
}
