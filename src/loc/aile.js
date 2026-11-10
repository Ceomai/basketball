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
      ? $t("places.221", {
          home: S.home,
          travel: fmt(travel)
        })
      : $t("places.342", {
          mom: S.npc.mom,
          dad: S.npc.dad
        }),
    `<div class="pgrid">${[
      {
        id: "yemek",
        ic: icon("plate"),
        t: $t("places.230"),
        d: away ? $t("places.222") : $t("places.223"),
        slot: 1,
        price: travel,
        fx: [
          [$t("places.224"), "p"],
          [$t("places.143"), "p"]
        ],
        btn: $t("places.307")
      },
      {
        id: "baba",
        ic: icon("hoop"),
        t: $t("places.233", {
          dad: S.npc.dad
        }),
        d: $t("places.308"),
        slot: 1,
        price: travel,
        fx: [
          [$t("prog.dadAile"), "p"],
          [$t("prog.dadMoral"), "p"]
        ],
        btn: $t("places.309")
      },
      ...(isPro(S.stage)
        ? [
            {
              id: "para",
              ic: icon("envelope"),
              t: $t("places.310"),
              d: $t("places.311"),
              price: gift,
              fx: [
                [$t("places.227"), "p"],
                [$t("places.228"), "p"]
              ],
              btn: fmt(gift)
            }
          ]
        : []),
      {
        id: "tel",
        ic: icon("phone"),
        t: $t("places.312"),
        d: $t("places.313"),
        fx: [[$t("places.229"), "p"]],
        btn: $t("places.314"),
        disabled: S.buffs.called === S.week
      }
    ]
      .map(prodHTML)
      .join("")}</div>`
  );
  addScene(b, "aile", S.rel.aile > 70 ? $t("places.343") : S.rel.aile > 40 ? $t("places.344") : $t("places.345"), {
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
        $t("places.346", {
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
          $t("places.230"),
          $t("places.231", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("places.224"), "p"]]
        );
      },
      baba: async () => {
        if (S.money < travel) return;
        useSlot();
        pay();
        closeSheet();
        arenaFor(null);
        app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("places.232", {
          home: esc(S.home)
        })}</div><h2>${$t("places.233", {
          dad: esc(S.npc.dad)
        })}</h2></div><div id="stg"></div><div id="res"></div>`;
        const r = await mgShoot($("#stg"), {
          eff: clamp(eff("sut") + 25, 5, 100),
          shots: 3,
          title: $t("places.315"),
          def: false
        });
        const win = r.made >= 2;
        // babayla birebir: yetenek vermez (aileyle bir aktiviteden nitelik kazanmak mantıksızdı); aile ve moral
        S.rel.aile += 9;
        S.moral += win ? 4 : 2;
        norm();
        save();
        $("#stg").innerHTML = "";
        $("#res").innerHTML = `<div class="card"><h2>${win ? $t("places.234") : $t("places.235")}</h2><p>${
          win
            ? $t("places.236", {
                dad: S.npc.dad
              })
            : $t("places.237", {
                dad: S.npc.dad
              })
        } ${$t("prog.dadRes", {
          v: win ? 4 : 2
        })}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
        $("#bk").onclick = renderMain;
      },
      para: () => {
        if (S.money < gift) return;
        tx($t("places.347"), -gift);
        // para göndermek haftada bir tam etkili: tekrarında aile yalnızca küçük bir teşekkür eder (akşam yemeği anlamsızlaşmasın)
        const again = S.giftWk === weekKey();
        S.giftWk = weekKey();
        S.rel.aile += again ? 2 : 10;
        S.moral += again ? 0 : 3;
        norm();
        save();
        resultView(
          $t("places.239"),
          $t("places.240", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("places.227"), "p"]]
        );
      },
      tel: () => {
        S.buffs.called = S.week;
        S.rel.aile += 4;
        norm();
        save();
        resultView(
          $t("places.241"),
          $t("places.242", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("places.229"), "p"]]
        );
      }
    },
    "social:done"
  );
}
