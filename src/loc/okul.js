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
  [$t("places.108"), "24", ["24", "30", "20", "35"]],
  [$t("places.109"), "40", ["40", "48", "36", "44"]],
  [$t("places.110"), "5", ["5", "6", "4", "7"]],
  [$t("places.111"), "5", ["5", "6", "4", "3"]],
  [$t("places.112"), $t("places.113"), $t("places.114").split("|")],
  [$t("places.115"), $t("places.116"), [$t("places.116"), $t("places.117"), $t("places.118"), $t("places.119")]],
  [$t("places.120"), "Ankara", ["Ankara", "İstanbul", "İzmir", "Bursa"]],
  [$t("places.121"), $t("places.122"), [$t("places.122"), $t("places.123"), $t("places.124"), $t("places.125")]],
  [$t("places.126"), "100 °C", ["100 °C", "90 °C", "80 °C", "120 °C"]],
  [$t("places.127"), "12", ["12", "14", "11", "16"]],
  [$t("places.128"), $t("places.129"), $t("rc.q.plant").split("|")],
  [$t("places.130"), $t("places.131"), $t("rc.q.cont").split("|")]
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
      q: $t("places.281", {
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
      q: $t("places.282", {
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
      `<div class="card"><div class="eyebrow">${$t("places.132", {
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
        : `${S.uni || $t("map.2")} ${$t("places.133", {
            uniYear: S.uniYear
          })}`,
      `<div class="card"><div class="attr"><span>${$t("places.15")}</span><div class="bar"><i style="--w:${S.aka};background:var(--info)"></i></div><b>${S.aka}</b></div><p class="small muted">${isL ? $t("places.134") : $t("places.135")}</p></div>` +
        actHTML({
          id: "ders",
          ic: icon("book"),
          t: $t("places.283"),
          d: $t("places.284"),
          slot: 1,
          fx: [
            [$t("places.136"), "p"],
            [$t("places.137"), "n"]
          ],
          btn: $t("places.283")
        }) +
        actHTML({
          id: "kurs",
          ic: icon("pencil"),
          t: isL ? $t("places.138") : $t("places.139"),
          d: $t("places.285"),
          slot: 1,
          price: pr,
          fx: [
            [$t("places.140"), "p"],
            [$t("places.141"), "p"],
            [`−${fmt(pr)}`, "n"]
          ],
          btn: $t("places.286")
        }) +
        (!isL
          ? actHTML({
              id: "birak",
              ic: icon("door"),
              t: $t("places.287"),
              d: $t("places.288"),
              fx: [
                [$t("places.142"), "n"],
                [$t("places.143"), "p"]
              ],
              btn: $t("places.289"),
              cls: "bad"
            })
          : "")
    );
    addScene(b, "okul", $t("places.332"), {
      board: isL ? $t("places.333") : $t("places.334")
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
            $t("places.144"),
            c === 3
              ? $t("places.145")
              : c
                ? $t("places.146", {
                    c: c
                  })
                : $t("places.147"),
            [
              [
                $t("places.148", {
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
        tx(isL ? $t("places.138") : $t("places.139"), -pr);
        S.studied = true;
        runQuiz(5, c => {
          S.aka += 4 + c * 3;
          norm();
          save();
          resultView(
            $t("places.149"),
            $t("places.150", {
              c: c
            }),
            [
              [
                $t("places.148", {
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
          $t("places.335", {
            v: fullName()
          })
        );
        norm();
        save();
        resultView(
          $t("places.151"),
          $t("places.152", {
            mom: S.npc.mom
          })
        );
      }
    });
  } else {
    const sp = Math.max(50, Math.round(fame() * fame() * ({ nba: 9, euro: 4, t1: 2 }[S.stage] || 1.2) * late.sponsorMul()));
    const b = sheet(
      $t("map.3"),
      $t("places.153", {
        agent: S.npc.agent
      }),
      `<div class="card"><div class="kv"><span>${$t("places.13")}</span><b>${esc(S.team.name)}</b><span>${$t("places.62")}</span><b>${$t(
        "places.154",
        {
          v: S.contract || 0
        }
      )}</b><span>${$t("places.155")}</span><b>${fmt(S.wage)}</b><span>${$t("places.21")}</span><b>${ROLE_N[S.role]}</b><span>${$t("places.23")}</span><b>${fame()}/100</b></div></div>` +
        (S.buffs.sponsorSeason === S.season
          ? `<p class="small muted">${$t("places.156")}</p>`
          : actHTML({
              id: "sp",
              ic: icon("handshake"),
              t: $t("places.290"),
              d: fame() < 15 ? $t("places.157") : $t("places.158"),
              fx: [[`~${fmt(sp)}`, "p"]],
              btn: $t("places.291"),
              disabled: fame() < 15
            })) +
        actHTML({
          id: "pr",
          ic: icon("mic"),
          t: $t("ads.13"),
          d: $t("places.292"),
          slot: 1,
          fx: [
            [$t("places.159"), "p"],
            [$t("places.160"), "p"]
          ],
          btn: $t("places.293")
        }) +
        late.sponsorDealHTML() +
        late.agentExtrasHTML() +
        (S.transferReq === S.season
          ? `<p class="small warn">${$t("places.161")}</p>`
          : actHTML({
              id: "tr",
              ic: icon("door"),
              t: $t("places.294"),
              d: $t("places.295"),
              fx: [
                [$t("places.162"), "p"],
                [$t("places.163"), "n"]
              ],
              btn: $t("places.296"),
              cls: "bad"
            }))
    );
    addScene(b, "ofis", fame() > 40 ? $t("places.336") : $t("places.337"));
    late.bindAgentExtras();
    bindActs({
      tr: () => {
        S.transferReq = S.season;
        S.buffs.offer = 1;
        S.rel.koc -= 12;
        norm();
        news(
          $t("places.338", {
            v: fullName()
          })
        );
        save();
        resultView(
          $t("places.164"),
          $t("places.165", {
            agent: S.npc.agent,
            coach: S.npc.coach
          }),
          [
            [$t("places.166"), "p"],
            [$t("places.163"), "n"]
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
          $t("ads.13"),
          $t("places.167", {
            journalist: S.npc.journalist
          }),
          [
            [
              $t("places.168", {
                g: g
              }),
              "p"
            ],
            [$t("places.169"), "p"]
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
    $("#shb").innerHTML = `<div class="card"><div class="eyebrow">${$t("places.170", {
      round: round
    })}</div><div class="big-num gold">${fmt(offer)}</div><p class="small muted">${$t("places.171")}</p></div><div class="grid2"><button class="btn good" id="ok1">${$t("places.172")}</button><button class="btn gold" id="up1" ${round >= 3 ? "disabled" : ""}>${$t("places.173")}</button></div>`;
    $("#ok1").onclick = () => {
      tx($t("places.290"), offer);
      S.buffs.sponsorSeason = S.season;
      news(
        $t("places.339", {
          v: fullName()
        })
      );
      save();
      resultView(
        $t("places.174"),
        $t("places.175", {
          offer: fmt(offer)
        })
      );
    };
    $("#up1").onclick = () => {
      if (Math.random() < 0.22 * round) {
        S.buffs.sponsorSeason = S.season;
        save();
        resultView($t("places.176"), $t("places.177"));
        return;
      }
      offer = Math.round(offer * 1.25);
      round++;
      show();
    };
  };
  show();
}
