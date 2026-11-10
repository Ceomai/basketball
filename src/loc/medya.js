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
    `<div class="box" style="grid-template-columns:repeat(3,1fr)"><div><b>${kfmt(S.followers)}</b><span class="eyebrow">${$t("match.43")}</span></div><div><b>${fame()}</b><span class="eyebrow">${$t("places.23")}</span></div><div><b>${S.rel.taraf}</b><span class="eyebrow">${$t("data.37")}</span></div></div>
   <div class="pgrid">${[
     {
       id: "shoot",
       ic: icon("camera"),
       t: $t("places.182"),
       d: $t("places.297"),
       slot: 1,
       fx: [[$t("places.160"), "p"]],
       btn: $t("places.298")
     },
     {
       id: "vlog",
       ic: icon("phone"),
       t: $t("places.183"),
       d: $t("places.299", {
         city: S.city
       }),
       slot: 1,
       fx: [
         [$t("places.160"), "p"],
         [$t("places.159"), "p"]
       ],
       btn: $t("places.300")
     },
     {
       id: "rop",
       ic: icon("mic"),
       t: $t("places.301"),
       d: $t("places.302"),
       slot: 1,
       fx: [[$t("places.178"), "t"]],
       btn: $t("places.303")
     },
     {
       id: "hayir",
       ic: icon("heart"),
       t: $t("places.304"),
       d: $t("places.305"),
       slot: 1,
       price: pr,
       fx: [
         [$t("places.159"), "p"],
         [`−${fmt(pr)}`, "n"]
       ],
       btn: $t("places.306")
     }
   ]
     .map(prodHTML)
     .join("")}</div>`
  );
  addScene(b, "medya", $t("places.340"));
  b.insertAdjacentHTML("beforeend", late.mediaExtraHTML()); // podcast, belgesel (src/seasonlife.js)
  late.bindMediaExtra();
  bindActs({
    shoot: () => photoSession("arena"),
    vlog: () => photoSession("city"),
    rop: interview,
    hayir: () => {
      if (S.money < pr) return;
      useSlot();
      tx($t("places.341"), -pr);
      const g = ri(5, 10);
      S.rel.taraf += g;
      late.mediaGain(0.04, 5);
      norm();
      save();
      resultView($t("places.179"), $t("places.180"), [
        [
          $t("places.168", {
            g: g
          }),
          "p"
        ],
        [$t("places.181"), "p"]
      ]);
    }
  });
}
export async function photoSession(bg) {
  useSlot();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("places.184")}</div><h2>${bg === "arena" ? $t("places.182") : $t("places.183")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgPhoto($("#stg"), { title: bg === "arena" ? $t("places.185") : $t("places.186") + S.city, bg });
  const q = Math.max(0, r.score);
  const add = late.mediaGain((q / 100) * 0.05 * (S.items.telefon ? 1.3 : 1), ri(5, 30) / 5); // medya yorgunluğu (src/economy.js)
  const tr = q >= 80 ? ri(2, 5) : q >= 50 ? ri(0, 2) : -1;
  S.rel.taraf += tr;
  norm();
  save();
  const cms =
    q >= 70
      ? [$t("places.187"), $t("places.188"), $t("places.189")]
      : q >= 40
        ? [$t("places.190"), $t("places.191"), "👍"]
        : [$t("places.192"), $t("places.193"), $t("places.194")];
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="post"><div class="ph"><i></i>${esc((S.first + S.last).toLocaleLowerCase(LOCALE))}${S.num}<span style="margin-left:auto;color:#888;font-weight:600">${esc(S.city)}</span></div>${r.img ? `<img src="${r.img}" alt="Paylaşılan fotoğraf">` : ""}<div class="pb"><div class="lk" id="lk">${$t("places.197")}</div><div><b>${esc((S.first + S.last).toLocaleLowerCase(LOCALE))}</b> ${bg === "arena" ? $t("places.195") : $t("places.196")} #${esc(S.team.short)}</div>${cms.map(x => `<div style="color:#555">${esc(x)}</div>`).join("")}</div></div>
   <div class="card mt-3"><div class="kv"><span>${$t("places.198")}</span><b>${q}/100</b><span>${$t("places.199")}</span><b class="good">+${kfmt(add)}</b><span>${$t("data.37")}</span><b>${tr >= 0 ? "+" : ""}${tr}</b></div><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  const likes = Math.round(add * rnd(2.5, 4));
  let k = 0;
  const lk = $("#lk");
  const iv = setInterval(() => {
    k = Math.min(likes, k + Math.ceil(likes / 30));
    if (lk) lk.textContent = `${k.toLocaleString("tr-TR")} ${$t("places.200")}`;
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
      $t("places.201"),
      [
        [$t("places.202"), { taraf: 3, takim: 3 }],
        [$t("places.203"), { taraf: 5, koc: -2, risk: 1 }],
        [$t("places.204"), { koc: 3 }]
      ]
    ],
    [
      $t("places.205", {
        rival: S.npc.rival
      }),
      [
        [$t("places.206"), { motive: 1 }],
        [$t("places.207"), { taraf: 4, risk: 1 }],
        [$t("places.208"), { taraf: 1, koc: 2 }]
      ]
    ],
    [
      $t("places.209"),
      [
        [$t("places.210"), { koc: 6 }],
        [$t("places.211"), { koc: -6, taraf: 3 }],
        [$t("places.212"), {}]
      ]
    ],
    [
      $t("places.213", {
        city: S.city
      }),
      [
        [$t("places.214"), { taraf: 5 }],
        [$t("places.215"), { aile: 4 }],
        [$t("places.216"), { koc: 2 }]
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
      `<div class="eyebrow">${$t("places.217", {
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
            t = $t("places.218");
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
              $t("places.219"),
              `${$t("places.220", {
                j: esc(j)
              })} <b>"${esc(S.last)}: ${esc(ans[+x.dataset.k][0])}"</b><br><span class="muted small">${log.map(esc).join("<br>")}</span>`
            );
          }
        })
    );
  };
  ask();
}
