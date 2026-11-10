/* ================= MEKAN: AİLE =================
   src/places.js'ten ayrıldı (openLoc buradan çağırır); dışa aktarım adları aynı. */
import { t as $t } from "../i18n/index.js";
import { $, ORDER, clamp, esc, fmt, isPro } from "../data.js";
import { icon } from "../art.js";
import { mgShoot } from "../games.js";
import { S, app, bindActs, closeSheet, eff, norm, prodHTML, renderMain, resultView, sheet, tx, useSlot, weekKey } from "../core.js";
import { save } from "../save.js";
import { addScene, arenaFor } from "../places.js";
export function locAile(I) {
  const away = S.city !== S.home,
    travel = away ? Math.round(20 * (1 + ORDER.indexOf(S.stage))) : 0,
    gift = Math.max(50, Math.round(S.wage * 0.5));
  const b = sheet(
    I.n,
    away
      ? $t("family.flight", {
          home: S.home,
          travel: fmt(travel)
        })
      : $t("family.and", {
          mom: S.npc.mom,
          dad: S.npc.dad
        }),
    `<div class="pgrid">${[
      {
        id: "yemek",
        ic: icon("plate"),
        t: $t("family.familyDinner"),
        d: away ? $t("family.flyHomeEat") : $t("family.sundayDinnerUncles"),
        slot: 1,
        price: travel,
        fx: [
          [$t("family.familyPlus12"), "p"],
          [$t("common.moralePlus5"), "p"]
        ],
        btn: $t("family.sitTable")
      },
      {
        id: "baba",
        ic: icon("hoop"),
        t: $t("family.oneOne", {
          dad: S.npc.dad
        }),
        d: $t("family.oldSchoolStreet"),
        slot: 1,
        price: travel,
        fx: [
          [$t("prog.dadAile"), "p"],
          [$t("prog.dadMoral"), "p"]
        ],
        btn: $t("family.play")
      },
      ...(isPro(S.stage)
        ? [
            {
              id: "para",
              ic: icon("envelope"),
              t: $t("family.sendMoneyFamily"),
              d: $t("family.helpHouseLoan"),
              price: gift,
              fx: [
                [$t("family.familyPlus15"), "p"],
                [$t("family.moralePlus4"), "p"]
              ],
              btn: fmt(gift)
            }
          ]
        : []),
      {
        id: "tel",
        ic: icon("phone"),
        t: $t("family.videoCall2"),
        d: $t("family.shortGood"),
        fx: [[$t("family.familyPlus4"), "p"]],
        btn: $t("family.call"),
        disabled: S.buffs.called === S.week
      }
    ]
      .map(prodHTML)
      .join("")}</div>`
  );
  addScene(b, "aile", S.rel.aile > 70 ? $t("family.proudDinnerReady") : S.rel.aile > 40 ? $t("family.feelsLikeNeglecting") : $t("family.killCallOnce"), {
    bubbleLeft: false,
    mom: {
      L: { skin: S.look.skin, hatStyle: "uzun", hair: "#5a3418" },
      o: { adult: true, jersey: "#3fa28a", sleeves: true, mood: "mutlu" }
    },
    dad: {
      L: { skin: S.look.skin, hatStyle: "yok", hair: "#2a1a10" },
      o: { adult: true, jersey: "#5a6b8a", sleeves: true, mustache: true, mood: "mutlu" }
    }
  });
  const pay = () => {
    if (travel) {
      tx(
        $t("family.flight2", {
          home: S.home
        }),
        -travel
      );
      S.energy -= 8;
    }
  };
  bindActs(
    {
      yemek: () => {
        if (S.money < travel) return;
        useSlot();
        pay();
        S.rel.aile += 12;
        S.moral += 5;
        norm();
        save();
        resultView(
          $t("family.familyDinner"),
          $t("family.madeFavoriteDish", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("family.familyPlus12"), "p"]]
        );
      },
      baba: async () => {
        if (S.money < travel) return;
        useSlot();
        pay();
        closeSheet();
        arenaFor(null);
        app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("family.streetHoop", {
          home: esc(S.home)
        })}</div><h2>${$t("family.oneOne", {
          dad: esc(S.npc.dad)
        })}</h2></div><div id="stg"></div><div id="res"></div>`;
        const r = await mgShoot($("#stg"), {
          eff: clamp(eff("sut") + 25, 5, 100),
          shots: 3,
          title: $t("family.firstMakesWins3"),
          def: false
        });
        const win = r.made >= 2;
        // babayla birebir: yetenek vermez (aileyle bir aktiviteden nitelik kazanmak mantıksızdı); aile ve moral
        S.rel.aile += 9;
        S.moral += win ? 4 : 2;
        norm();
        save();
        $("#stg").innerHTML = "";
        $("#res").innerHTML = `<div class="card"><h2>${win ? $t("family.won") : $t("family.dadWon")}</h2><p>${
          win
            ? $t("family.saidKneeHurting", {
                dad: S.npc.dad
              })
            : $t("family.tellWholeNeighborhood", {
                dad: S.npc.dad
              })
        } ${$t("prog.dadRes", {
          v: win ? 4 : 2
        })}</p><button class="btn pri" id="bk">${$t("common.backMap")}</button></div>`;
        $("#bk").onclick = renderMain;
      },
      para: () => {
        if (S.money < gift) return;
        tx($t("common.familySupport"), -gift);
        // para göndermek haftada bir tam etkili: tekrarında aile yalnızca küçük bir teşekkür eder (akşam yemeği anlamsızlaşmasın)
        const again = S.giftWk === weekKey();
        S.giftWk = weekKey();
        S.rel.aile += again ? 2 : 10;
        S.moral += again ? 0 : 3;
        norm();
        save();
        resultView(
          $t("family.sent"),
          $t("family.thankedVoiceMessage", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("family.familyPlus15"), "p"]]
        );
      },
      tel: () => {
        S.buffs.called = S.week;
        S.rel.aile += 4;
        norm();
        save();
        resultView(
          $t("family.videoCall"),
          $t("family.pointedCameraCeiling", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("family.familyPlus4"), "p"]]
        );
      }
    },
    "social:done"
  );
}
