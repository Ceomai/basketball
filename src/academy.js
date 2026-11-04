/* ================= KENDİ BASKETBOL AKADEMİN =================
   Profesyonel olunca bina alınır (ücret kariyer seviyesine göre). Uzun vadeli iş ve miras:
   - En fazla 6 öğrenci: adı, pozisyonu, yaşı, becerisi ve potansiyeli (yıldız) olan çocuklar. Aday listesinden kayıt.
   - Koçluk (bir zaman dilimi, −8 enerji): bir öğrenciyle zamanlama mini oyunu; becerisi potansiyeline göre artar.
   - Her hafta aidat geliri (öğrenci sayısı × prestij). Her 4 haftada bir gençler turnuvası (simülasyon): sonuca göre
     prestij; kazanırsa akademiye kupa.
   - Sezon sonunda öğrenciler bir yaş büyür; 18'inde mezun olur. Becerisi yüksekse profesyonel olur: gündemde haber,
     miras puanına "akademi mezunu" katkısı ve prestij. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, fmt, isPro, pick, ri, shuffle } from "./data.js";
import { S, app, closeSheet, news, norm, renderMain, sheet, tx, useSlot, fullName, seasonLabel } from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgTiming } from "./games.js";
import { late } from "./late.js";

const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
const POSS = ["PG", "SG", "SF", "PF", "C"];
export const acadCost = () => Math.round(900 * (PM[S.stage] || 1));
const A = () => S.acad;
function kid() {
  const c = late.cOf(S.home || "İstanbul");
  return { n: `${pick(c.first)} ${pick(c.last)}`, pos: pick(POSS), age: ri(12, 15), sk: ri(18, 32), pot: ri(1, 5) };
}
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
export function locAkademi(I) {
  if (!A()) {
    const ok = isPro(S.stage) && S.money >= acadCost();
    sheet(
      I.n,
      $t("ac.sub"),
      `<p>${$t("ac.intro")}</p><p class="small muted">${isPro(S.stage) ? $t("ac.cost", { v: fmt(acadCost()) }) : $t("ac.needPro")}</p><button class="btn pri" id="ac-buy" ${ok ? "" : "disabled"}>${$t("ac.buy")}</button>`
    );
    $("#ac-buy").onclick = () => {
      tx($t("ac.name"), -acadCost());
      S.acad = { prestige: 10, kids: [kid(), kid()], cand: [kid(), kid(), kid()], grads: [], cups: 0, wk: 0 };
      news($t("ac.opened", { v: fullName() }));
      save();
      locAkademi(I);
    };
    return;
  }
  const a = A();
  sheet(
    I.n,
    $t("ac.subOwn"),
    `<div class="card"><div class="kv"><span>${$t("ac.prestige")}</span><b class="gold">${a.prestige}</b><span>${$t("ac.kidsN")}</span><b>${a.kids.length}/6</b><span>${$t("ac.income")}</span><b>+${fmt(weeklyIncome())}</b><span>${$t("ac.gradsN")}</span><b>${a.grads.length}</b></div><p class="small muted">${$t("ac.tourNote")}</p></div>
    <div class="eyebrow">${$t("ac.kids")}</div>${a.kids
      .map(
        (k, i) =>
          `<div class="act"><div><h3>${k.n} · ${k.pos}</h3><p>${$t("ac.kidLine", { a: k.age, s: k.sk, p: stars(k.pot) })}</p></div><button class="btn team sm" data-ak="${i}" ${S.slot <= 0 || S.energy < 8 ? "disabled" : ""}>${$t("ac.coach")}</button></div>`
      )
      .join("")}
    ${
      a.kids.length < 6
        ? `<div class="eyebrow">${$t("ac.cands")}</div>${a.cand
            .map(
              (k, i) =>
                `<div class="act"><div><h3>${k.n} · ${k.pos}</h3><p>${$t("ac.kidLine", { a: k.age, s: k.sk, p: stars(k.pot) })}</p></div><button class="btn sm" data-ac="${i}">${$t("ac.enroll")}</button></div>`
            )
            .join("")}`
        : ""
    }`
  );
  $$("[data-ak]").forEach(b => (b.onclick = () => coach(+b.dataset.ak)));
  $$("[data-ac]").forEach(
    b =>
      (b.onclick = () => {
        const i = +b.dataset.ac;
        a.kids.push(a.cand.splice(i, 1)[0]);
        a.cand.push(kid());
        save();
        locAkademi(I);
      })
  );
}
async function coach(i) {
  const k = A().kids[i];
  useSlot();
  S.energy -= 8;
  save();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("ac.name")}</div><h2>${$t("ac.coachH", { n: k.n })}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgTiming($("#stg"), {
    eff: 55,
    title: $t("ac.coachH", { n: k.n }),
    tries: 2,
    label: $t("ac.drill"),
    kind: "free"
  });
  const g = (1 + r.ok * 1.5) * (0.6 + k.pot * 0.2);
  k.sk = clamp(Math.round((k.sk + g) * 10) / 10, 0, 99);
  A().prestige += r.ok;
  S.moral += 2;
  norm();
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><h2 class="good">${k.n} +${g.toFixed(1)}</h2><p class="small muted">${$t("ac.coachRes", { s: k.sk })}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}
const weeklyIncome = () => (A() ? Math.round(A().kids.length * (1 + A().prestige / 25) * 3 * (PM[S.stage] || 1)) : 0);
Bus.on("week:start", () => {
  const a = S && A();
  if (!a) return;
  if (a.kids.length) tx($t("ac.incomeTx"), weeklyIncome());
  a.wk = (a.wk || 0) + 1;
  if (a.wk % 4 === 0 && a.kids.length) {
    const avg = a.kids.reduce((x, k) => x + k.sk, 0) / a.kids.length;
    const win = Math.random() < clamp((avg - 25) / 40 + a.prestige / 300, 0.08, 0.8);
    a.prestige = Math.max(0, a.prestige + (win ? 6 : 1));
    if (win) {
      a.cups++;
      news($t("ac.tourWin", { v: fullName() }));
    }
  }
});
Bus.on("season:end", () => {
  const a = S && A();
  if (!a) return;
  for (const k of a.kids) k.age++;
  const done = a.kids.filter(k => k.age >= 18);
  a.kids = a.kids.filter(k => k.age < 18);
  for (const k of done) {
    const pro = k.sk >= 45;
    a.grads.push({ n: k.n, pos: k.pos, pro, s: seasonLabel() });
    if (pro) {
      a.prestige += 8;
      news($t("ac.gradPro", { n: k.n, v: fullName() }));
    }
  }
  a.cand = shuffle([kid(), kid(), kid()]);
});
/** Miras: profesyonel olan akademi mezunları (src/legacy.js) */
export const acadLegacy = () => (S && S.acad ? S.acad.grads.filter(g => g.pro).length * 25 + S.acad.cups * 10 : 0);
