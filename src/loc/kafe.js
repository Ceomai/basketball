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
    $t("places.243", {
      f: f
    }),
    `<div class="pgrid">${[
      {
        id: "sohbet",
        ic: icon("coffee"),
        t: $t("places.316"),
        d: $t("places.317", {
          f: f
        }),
        slot: 1,
        price: 3,
        fx: [
          [$t("places.244"), "p"],
          [$t("places.245"), "p"]
        ],
        btn: fmt(3)
      },
      {
        id: "izle",
        ic: icon("tv"),
        t: $t("places.318"),
        d: $t("places.319"),
        slot: 1,
        price: 5,
        fx: [
          [$t("places.143"), "p"],
          [$t("places.246"), "p"]
        ],
        btn: fmt(5)
      },
      {
        id: "oyun",
        ic: icon("pad"),
        t: $t("places.257"),
        d: $t("places.320"),
        slot: 1,
        fx: [
          [$t("places.247"), "p"],
          [$t("extras.39"), "n"]
        ],
        btn: $t("places.273")
      },
      S.partner
        ? {
            id: "randevu",
            ic: icon("heart"),
            t: $t("places.321", {
              partner: S.partner
            }),
            d: $t("places.322"),
            slot: 1,
            price: dp,
            fx: [[$t("places.248"), "p"]],
            btn: fmt(dp)
          }
        : {
            id: "flort",
            ic: icon("heart"),
            t: $t("places.323"),
            d: $t("places.324", {
              f: f
            }),
            slot: 1,
            fx: [[$t("places.249"), "t"]],
            btn: $t("places.325")
          }
    ]
      .map(prodHTML)
      .join("")}</div>${late.quizHTML()}`
  );
  late.bindQuiz(); // bilgi gecesi (src/venues.js)
  addScene(b, "kafe", $t("places.348"), {
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
        tx($t("map.20"), -3);
        S.moral += 8;
        S.rel.ark += 8;
        norm();
        save();
        resultView(
          $t("places.250"),
          pick([
            $t("places.251", {
              f: f
            }),
            $t("places.252", {
              f: f
            }),
            $t("places.253", {
              f: f
            })
          ]),
          [[$t("places.244"), "p"]]
        );
      },
      izle: () => {
        if (S.money < 5) return;
        useSlot();
        tx($t("map.20"), -5);
        S.moral += 5;
        let t = $t("places.254");
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
        resultView($t("places.256"), t, [[$t("places.143"), "p"]]);
      },
      oyun: () => {
        useSlot();
        S.moral += 12;
        S.energy -= 8;
        S.rel.ark += 5;
        norm();
        save();
        resultView(
          $t("places.257"),
          $t("places.258", {
            f: f
          }),
          [
            [$t("places.247"), "p"],
            [$t("extras.39"), "n"]
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
            $t("places.349", {
              v: fullName(),
              partner: S.partner
            })
          );
          norm();
          save();
          resultView(
            $t("places.259"),
            $t("places.260", {
              partner: S.partner
            }),
            [[$t("extras.37"), "p"]]
          );
        } else {
          S.moral -= 4;
          norm();
          save();
          resultView($t("casino.43"), $t("places.261"), [[$t("places.262"), "n"]]);
        }
      },
      randevu: () => {
        if (S.money < dp) return;
        useSlot();
        tx($t("places.263"), -dp);
        S.rel.partner += 12;
        S.moral += 6;
        norm();
        save();
        resultView(
          $t("places.263"),
          $t("places.264", {
            partner: S.partner
          }),
          [[$t("places.248"), "p"]]
        );
      }
    },
    "social:done"
  );
}
