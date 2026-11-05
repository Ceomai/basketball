/* ================= SOKAK SAHASI (haritada yeni mekan) =================
   Mahallenin potası. Profesyonel olsan bile sokağa dönmek ayrı bir keyif:
   - 3'e 3 sokak turnuvası (haftada bir, 1 zaman dilimi, −15 enerji): şut + top sürme mini oyunu. Kazanırsan ödül
     (kariyer seviyesine göre), takipçi, küçük şut/hız gelişimi ve sokak itibarı. 5 galibiyette "Sokak efsanesi" kupası.
   - Mahalle çocuklarıyla oyna (1 zaman dilimi, −6 enerji): taraftar +3, moral +4; çocuklara örnek olmak miras puanına
     küçük katkı (her 10 oyun bir miras adımı).
   - Sokak itibarı ve turnuva kayıtları mekanda görünür. */
import { t as $t } from "./i18n/index.js";
import { $, clamp, fmt } from "./data.js";
import {
  S,
  app,
  eff,
  gainStat,
  levelMul,
  news,
  norm,
  renderMain,
  resultView,
  sheet,
  tx,
  useSlot,
  fullName,
  seasonLabel
} from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";
import { arenaFor } from "./places.js";
import { mgDribble, mgShoot } from "./games.js";

const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
const wk = () => `${S.season}-${S.week}`;
const st = () => (S.street = S.street || { rep: 0, wins: 0, played: 0, kids: 0, wk: "" });
export function locSokak(I) {
  const s = st(),
    done = s.wk === wk(),
    prize = Math.round(12 * (PM[S.stage] || 1));
  sheet(
    I.n,
    $t("st.sub"),
    `<div class="card"><div class="row between"><div class="eyebrow">${$t("st.rep")}</div><b class="gold">${s.rep}</b></div><p class="small muted">${$t("st.record", { w: s.wins, p: s.played })}</p></div>
    <div class="act"><div><h3>${$t("st.tour")}</h3><p>${$t("st.tourD", { v: fmt(prize) })}</p></div><button class="btn team sm" id="st-tour" ${done || S.slot <= 0 || S.energy < 15 || S.injury ? "disabled" : ""}>${done ? $t("st.done") : $t("st.play")}</button></div>
    <div class="act"><div><h3>${$t("st.kids")}</h3><p>${$t("st.kidsD")}</p></div><button class="btn team sm" id="st-kids" ${S.slot <= 0 || S.energy < 6 ? "disabled" : ""}>${$t("st.kidsBtn")}</button></div>${late.nightLeagueHTML()}${late.streetExtraHTML()}`
  );
  late.bindNightLeague(); // gece sokak ligi (src/venues.js)
  late.bindStreetExtra(() => locSokak(I)); // kendi turnuvan, saha yenileme (src/seasonlife.js)
  $("#st-tour").onclick = () => tournament(prize);
  $("#st-kids").onclick = () => {
    useSlot();
    S.energy -= 6;
    S.rel.taraf += 3;
    S.moral += 4;
    s.kids++;
    if (s.kids % 10 === 0) {
      S.legacy = S.legacy || { found: {}, club: 0 };
      S.legacy.kids = (S.legacy.kids || 0) + 1; // miras: çocuklara örnek (src/legacy.js)
    }
    norm();
    save();
    resultView($t("st.kids"), $t("st.kidsRes"), [
      [$t("st.fxFans"), "p"],
      [$t("st.fxMoral"), "p"]
    ]);
  };
}
async function tournament(prize) {
  const s = st();
  if (s.wk === wk()) return;
  s.wk = wk();
  useSlot();
  S.energy -= 15;
  save();
  arenaFor(null);
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("st.tour")}</div><h2>${$t("st.round")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r1 = await mgShoot($("#stg"), {
    eff: clamp(eff("sut") + 8, 5, 100),
    shots: 3,
    title: $t("st.shoot"),
    dist: "mid",
    def: true
  });
  const r2 = await mgDribble($("#stg"), { eff: clamp(eff("hiz") + 8, 5, 100), reps: 2, title: $t("st.dribble") });
  const score = r1.made + r2.ok,
    win = score >= 3;
  s.played++;
  if (win) {
    s.wins++;
    s.rep += 5;
    tx($t("st.prizeTx"), prize);
    S.followers = Math.round(S.followers * 1.03) + 10;
    gainStat("sut", 0.15 * levelMul("sut"));
    gainStat("hiz", 0.15 * levelMul("hiz"));
    if (s.wins === 5) {
      S.career.trophies.push({ type: "street", label: `${seasonLabel()} · ${$t("st.legend")}` });
      news($t("st.legendNews", { v: fullName() }));
    }
  } else s.rep += 1;
  S.moral += win ? 5 : 1;
  norm();
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><div class="eyebrow">${$t("st.tour")}</div><h2 class="${win ? "good" : ""}">${win ? $t("st.won") : $t("st.lost")}</h2><p>${$t("st.score", { v: score })}${win ? ` · +${fmt(prize)}` : ""}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}
