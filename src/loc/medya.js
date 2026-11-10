/* ================= MEKAN: MEDYA =================
   src/places.js'ten ayrıldı (openLoc buradan çağırır); dışa aktarım adları aynı. */
import { t as $t, LOCALE } from "../i18n/index.js";
import { late } from "../late.js";
import { $, $$, ORDER, esc, fmt, kfmt, ri, rnd, shuffle } from "../data.js";
import { icon } from "../art.js";
import { mgPhoto } from "../games.js";
import { S, app, bindActs, closeSheet, fame, norm, prodHTML, renderMain, resultView, sheet, tx, useSlot } from "../core.js";
import { save } from "../save.js";
import { addScene, arenaFor } from "../places.js";
export function locMedya(I) {
  const pr = Math.round(30 * (1 + ORDER.indexOf(S.stage) * 2));
  const b = sheet(
    I.n,
    `@${(S.first + S.last).toLocaleLowerCase(LOCALE).replace(/[^a-z0-9çğıöşü]/g, "")}${S.num}`,
    `<div class="box" style="grid-template-columns:repeat(3,1fr)"><div><b>${kfmt(S.followers)}</b><span class="eyebrow">${$t("common.followers")}</span></div><div><b>${fame()}</b><span class="eyebrow">${$t("common.fame")}</span></div><div><b>${S.rel.taraf}</b><span class="eyebrow">${$t("common.fans")}</span></div></div>
   <div class="pgrid">${[
     {
       id: "shoot",
       ic: icon("camera"),
       t: $t("media.photoShoot"),
       d: $t("media.framesStudioBest3"),
       slot: 1,
       fx: [[$t("common.followers2"), "p"]],
       btn: $t("media.startShoot")
     },
     {
       id: "vlog",
       ic: icon("phone"),
       t: $t("media.cityVlog"),
       d: $t("media.videoStreetsCapture", {
         city: S.city
       }),
       slot: 1,
       fx: [
         [$t("common.followers2"), "p"],
         [$t("common.fans3"), "p"]
       ],
       btn: $t("media.shoot")
     },
     {
       id: "rop",
       ic: icon("mic"),
       t: $t("media.interview"),
       d: $t("media.twoQuestionsJournalist"),
       slot: 1,
       fx: [[$t("media.fans"), "t"]],
       btn: $t("media.sitDown")
     },
     {
       id: "hayir",
       ic: icon("heart"),
       t: $t("media.charityCampaign"),
       d: $t("media.donationsNeighborhood"),
       slot: 1,
       price: pr,
       fx: [
         [$t("common.fans3"), "p"],
         [`−${fmt(pr)}`, "n"]
       ],
       btn: $t("common.start2")
     }
   ]
     .map(prodHTML)
     .join("")}</div>`
  );
  addScene(b, "medya", $t("media.lightsSetCamera"));
  b.insertAdjacentHTML("beforeend", late.mediaExtraHTML()); // podcast, belgesel (src/seasonlife.js)
  late.bindMediaExtra();
  bindActs({
    shoot: () => photoSession("arena"),
    vlog: () => photoSession("city"),
    rop: interview,
    hayir: () => {
      if (S.money < pr) return;
      useSlot();
      tx($t("media.charityDonation"), -pr);
      const g = ri(5, 10);
      S.rel.taraf += g;
      late.mediaGain(0.04, 5);
      norm();
      save();
      resultView($t("media.campaignLaunched"), $t("media.neighborhoodCourts"), [
        [
          $t("common.fans4", {
            g: g
          }),
          "p"
        ],
        [$t("media.followersPlus6pct"), "p"]
      ]);
    }
  });
}
export async function photoSession(bg) {
  useSlot();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("common.mediaCenter")}</div><h2>${bg === "arena" ? $t("media.photoShoot") : $t("media.cityVlog")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgPhoto($("#stg"), { title: bg === "arena" ? $t("photo.studio") : $t("photo.vlog") + S.city, bg });
  const q = Math.max(0, r.score);
  const add = late.mediaGain((q / 100) * 0.05 * (S.items.telefon ? 1.3 : 1), ri(5, 30) / 5); // medya yorgunluğu (src/economy.js)
  const tr = q >= 80 ? ri(2, 5) : q >= 50 ? ri(0, 2) : -1;
  S.rel.taraf += tr;
  norm();
  save();
  const cms =
    q >= 70
      ? [$t("photo.alreadyOrderedJersey"), $t("photo.prideHometown"), $t("photo.shotMakeGreat")]
      : q >= 40
        ? [$t("photo.niceExpectBetter"), $t("photo.backTraining"), "👍"]
        : [$t("photo.changePhotographer"), $t("photo.cameBlurry"), $t("photo.winGameFirst")];
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="post"><div class="ph"><i></i>${esc((S.first + S.last).toLocaleLowerCase(LOCALE))}${S.num}<span style="margin-left:auto;color:#888;font-weight:600">${esc(S.city)}</span></div>${r.img ? `<img src="${r.img}" alt="Paylaşılan fotoğraf">` : ""}<div class="pb"><div class="lk" id="lk">${$t("photo.likes0")}</div><div><b>${esc((S.first + S.last).toLocaleLowerCase(LOCALE))}</b> ${bg === "arena" ? $t("photo.newSeasonNew") : $t("photo.exploringCity")} #${esc(S.team.short)}</div>${cms.map(x => `<div style="color:#555">${esc(x)}</div>`).join("")}</div></div>
   <div class="card mt-3"><div class="kv"><span>${$t("photo.shotQuality")}</span><b>${q}/100</b><span>${$t("photo.newFollower")}</span><b class="good">+${kfmt(add)}</b><span>${$t("common.fans")}</span><b>${tr >= 0 ? "+" : ""}${tr}</b></div><button class="btn pri" id="bk">${$t("common.backMap")}</button></div>`;
  const likes = Math.round(add * rnd(2.5, 4));
  let k = 0;
  const lk = $("#lk");
  const iv = setInterval(() => {
    k = Math.min(likes, k + Math.ceil(likes / 30));
    if (lk) lk.textContent = `${k.toLocaleString("tr-TR")} ${$t("photo.likes")}`;
    if (k >= likes) clearInterval(iv);
  }, 40);
  $("#bk").onclick = () => {
    clearInterval(iv);
    renderMain();
  };
}
export function interview() {
  useSlot();
  const j = S.npc.journalist;
  const QS = [
    [
      $t("interview.whatsGoalSeason"),
      [
        [$t("interview.illGiveEverything"), { taraf: 3, takim: 3 }],
        [$t("interview.bestLeague"), { taraf: 5, koc: -2, risk: 1 }],
        [$t("interview.takingOneGame"), { koc: 3 }]
      ]
    ],
    [
      $t("interview.calledOverratedTake", {
        rival: S.npc.rival
      }),
      [
        [$t("interview.illAnswerCourt"), { motive: 1 }],
        [$t("interview.whosDontKnow"), { taraf: 4, risk: 1 }],
        [$t("interview.respectHim"), { taraf: 1, koc: 2 }]
      ]
    ],
    [
      $t("interview.howThingsCoach"),
      [
        [$t("interview.teachesLot"), { koc: 6 }],
        [$t("interview.deserveMorePlaying"), { koc: -6, taraf: 3 }],
        [$t("interview.everythingsFine"), {}]
      ]
    ],
    [
      $t("interview.howsLife", {
        city: S.city
      }),
      [
        [$t("interview.feelHome"), { taraf: 5 }],
        [$t("interview.missHomeLittle"), { aile: 4 }],
        [$t("interview.focusedBasketball"), { koc: 2 }]
      ]
    ]
  ];
  const qs = shuffle(QS).slice(0, 2);
  let i = 0,
    log = [];
  const ask = () => {
    const [q, ans] = qs[i];
    const b = $("#shb");
    b.innerHTML = "";
    addScene(b, "medya", q, {});
    b.insertAdjacentHTML(
      "beforeend",
      `<div class="eyebrow">${$t("interview.asks2", {
        j: esc(j),
        v: i + 1
      })}</div><div class="choices">${ans.map((a, k) => `<button class="choice" data-k="${k}"><span class="ct" style="font-size:var(--fs-xl);text-transform:none;font-family:var(--body);font-weight:800">"${esc(a[0])}"</span></button>`).join("")}</div>`
    );
    $$(".choice").forEach(
      x =>
        (x.onclick = () => {
          const fx = ans[+x.dataset.k][1];
          let t = "";
          if (fx.risk && Math.random() < 0.45) {
            S.rel.taraf -= 6;
            t = $t("interview.answerGotReaction");
          } else {
            for (const r of ["taraf", "takim", "koc", "aile"]) if (fx[r]) S.rel[r] += fx[r];
            if (fx.motive) S.buffs.motive = 1;
            if (fx.taraf > 0) S.followers *= 1 + fx.taraf / 100;
          }
          log.push(`"${ans[+x.dataset.k][0]}" ${t}`);
          i++;
          if (i < 2) ask();
          else {
            norm();
            save();
            resultView(
              $t("interview.interviewLive"),
              `${$t("interview.headlinedLike", {
                j: esc(j)
              })} <b>"${esc(S.last)}: ${esc(ans[+x.dataset.k][0])}"</b><br><span class="muted small">${log.map(esc).join("<br>")}</span>`
            );
          }
        })
    );
  };
  ask();
}
