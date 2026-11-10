/* ================= MEKAN: KAFE =================
   src/places.js'ten ayrıldı (openLoc buradan çağırır); dışa aktarım adları aynı. */
import { t as $t } from "../i18n/index.js";
import { late } from "../late.js";
import { ORDER, cOf, fmt, hash, pick, statName } from "../data.js";
import { SKINS, icon } from "../art.js";
import { S, bindActs, fame, fullName, gainStat, levelMul, news, norm, prodHTML, resultView, sheet, tx, useSlot } from "../core.js";
import { save } from "../save.js";
import { addScene } from "../places.js";
export function locKafe(I) {
  const f = S.npc.friend,
    dp = Math.round(12 * (1 + ORDER.indexOf(S.stage)));
  const b = sheet(
    I.n,
    $t("cafe.waiting", {
      f: f
    }),
    `<div class="pgrid">${[
      {
        id: "sohbet",
        ic: icon("coffee"),
        t: $t("cafe.coffeeChat"),
        d: $t("cafe.opening", {
          f: f
        }),
        slot: 1,
        price: 3,
        fx: [
          [$t("common.moralePlus8"), "p"],
          [$t("cafe.friendsPlus8"), "p"]
        ],
        btn: fmt(3)
      },
      {
        id: "izle",
        ic: icon("tv"),
        t: $t("cafe.watchNbaGame"),
        d: $t("cafe.learnReadGame"),
        slot: 1,
        price: 5,
        fx: [
          [$t("common.moralePlus5"), "p"],
          [$t("cafe.passChancePlus1"), "p"]
        ],
        btn: fmt(5)
      },
      {
        id: "oyun",
        ic: icon("pad"),
        t: $t("cafe.gameNight2"),
        d: $t("cafe.consoleTournamentUntil"),
        slot: 1,
        fx: [
          [$t("cafe.moralePlus12"), "p"],
          [$t("common.energyMinus8"), "n"]
        ],
        btn: $t("common.join")
      },
      S.partner
        ? {
            id: "randevu",
            ic: icon("heart"),
            t: $t("cafe.meet", {
              partner: S.partner
            }),
            d: $t("cafe.cornerTable"),
            slot: 1,
            price: dp,
            fx: [[$t("cafe.partnerPlus12"), "p"]],
            btn: fmt(dp)
          }
        : {
            id: "flort",
            ic: icon("heart"),
            t: $t("cafe.meetSomeone"),
            d: $t("cafe.broughtFriend", {
              f: f
            }),
            slot: 1,
            fx: [[$t("common.partnerChance"), "t"]],
            btn: $t("cafe.meet2")
          }
    ]
      .map(prodHTML)
      .join("")}</div>${late.quizHTML()}`
  );
  late.bindQuiz(); // bilgi gecesi (src/venues.js)
  addScene(b, "kafe", $t("cafe.whatGetCake"), {
    friend: {
      L: { skin: SKINS[hash(f) % 4], hatStyle: "bere", hat: "#2d8a3e", pom: "#f4c534" },
      o: { jersey: "#e2741f", sleeves: true, gloves: "#2d8a3e", mood: "mutlu" }
    }
  });
  bindActs(
    {
      sohbet: () => {
        if (S.money < 3) return;
        useSlot();
        tx($t("common.cafe"), -3);
        S.moral += 8;
        S.rel.ark += 8;
        norm();
        save();
        resultView(
          $t("cafe.chat"),
          pick([
            $t("cafe.saidStartedNew", {
              f: f
            }),
            $t("cafe.talkedSchoolLove", {
              f: f
            }),
            $t("cafe.saidHesProud", {
              f: f
            })
          ]),
          [[$t("common.moralePlus8"), "p"]]
        );
      },
      izle: () => {
        if (S.money < 5) return;
        useSlot();
        tx($t("common.cafe"), -5);
        S.moral += 5;
        let t = $t("cafe.buzzerBeaterThree");
        if (Math.random() < 0.5) {
          const g = gainStat("pas", Math.round(0.25 * levelMul("pas") * 100) / 100);
          t += ` ${$t("prog.watch", { v: g.toFixed(2) })}`;
        }
        // sonraki rakibin maçını izledin: o maç için pozisyonuna göre nitelik +4 (keşif)
        const sk = { PG: "pas", SG: "sut", SF: "sut", PF: "guc", C: "guc" }[S.pos] || "sut";
        S.buffs.scoutK = sk;
        t += ` ${$t("life.scout", { k: statName(sk) })}`;
        norm();
        save();
        resultView($t("cafe.gameNight"), t, [[$t("common.moralePlus5"), "p"]]);
      },
      oyun: () => {
        useSlot();
        S.moral += 12;
        S.energy -= 8;
        S.rel.ark += 5;
        norm();
        save();
        resultView(
          $t("cafe.gameNight2"),
          $t("cafe.threwControllerWhen", {
            f: f
          }),
          [
            [$t("cafe.moralePlus12"), "p"],
            [$t("common.energyMinus8"), "n"]
          ]
        );
      },
      flort: () => {
        useSlot();
        if (Math.random() < 0.3 + fame() / 250 + S.moral / 400) {
          S.partner = pick(cOf(S.city).fem);
          S.rel.partner = 50;
          S.moral += 10;
          news(
            $t("cafe.spottedTogether", {
              v: fullName(),
              partner: S.partner
            })
          );
          norm();
          save();
          resultView(
            $t("common.spark"),
            $t("cafe.talkedHoursNow", {
              partner: S.partner
            }),
            [[$t("common.moralePlus10"), "p"]]
          );
        } else {
          S.moral -= 4;
          norm();
          save();
          resultView($t("common.noLuck"), $t("cafe.conversationNeverGot"), [[$t("cafe.moraleMinus4"), "n"]]);
        }
      },
      randevu: () => {
        if (S.money < dp) return;
        useSlot();
        tx($t("cafe.date"), -dp);
        S.rel.partner += 12;
        S.moral += 6;
        norm();
        save();
        resultView(
          $t("cafe.date"),
          $t("cafe.lovelyEveningDidnt", {
            partner: S.partner
          }),
          [[$t("cafe.partnerPlus12"), "p"]]
        );
      }
    },
    "social:done"
  );
}
