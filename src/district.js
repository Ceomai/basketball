/* ================= SEMTLER VE HAFTALIK HARİTA OLAYLARI =================
   - Harita iki semtten oluşur: "Mahalle ve merkez" (ev, okul, stadyum, aile, kafe, AVM, market, eğlence, kumarhane,
     sokak sahası) ve "Spor kompleksi ve sahil" (stüdyo, taraftar bölgesi, performans merkezi; sahil ileride liman,
     akademi ve hipodrom için). Harita üstündeki düğmelerle geçilir; mobilde harita ekrana sığmaya devam eder.
   - Her hafta 1-2 olay işareti (!) çıkar: AVM'de imza günü, sokakta hayır koşusu, stadyumda taraftar toplantısı,
     kafede eski bir arkadaş, stüdyoda sürpriz röportaj, sahilde tekne turu. Tıklanınca kısa bir olay; zaman
     dilimi harcamaz ama küçük enerji ister. Hafta bitince kaybolur. Haritayı her hafta kontrol etmek için bir sebep. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, shuffle } from "./data.js";
import { S, closeSheet, norm, sheet } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const IN2 = ["studyo", "taraftar", "performans", "akademi", "borsa", "hipodrom", "liman"];
export const district = () => (S && S.district === "kompleks" ? "kompleks" : "merkez");
export function districtTabsHTML() {
  if (!S) return "";
  const d = district(),
    n =
      (S.mapEv && S.mapEv.list
        ? S.mapEv.list.filter(e => !e.done && !late.focusLocOff(e.loc) && (IN2.includes(e.loc) ? "kompleks" : "merkez") !== d).length
        : 0) || 0;
  return `<div class="opts" id="dist" style="margin-bottom:6px;flex-wrap:nowrap">${["merkez", "kompleks"]
    .map(
      k =>
        `<button class="opt ${d === k ? "on" : ""}" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:8px;padding-right:8px" data-dist="${k}">${$t(`dist.${k}`)}${k !== d && n ? " •" : ""}</button>`
    )
    .join("")}</div>`;
}
export function bindDistrict(re) {
  $$("#dist [data-dist]").forEach(b => (b.onclick = () => ((S.district = b.dataset.dist), re())));
  $$(".mev").forEach(g => {
    const go = () => openEvent(+g.dataset.mev, re);
    g.onclick = e => (e.stopPropagation(), go());
    g.onkeydown = e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go());
  });
}

/* ---- Haftalık olaylar ---- */
const EVENTS = [
  { id: "imza", loc: "avm", fx: () => ((S.rel.taraf += 3), (S.followers = Math.round(S.followers * 1.02))) },
  { id: "kosu", loc: "sokak", fx: () => ((S.moral += 4), (S.fit = Math.min(100, (S.fit ?? 65) + 1))) },
  { id: "toplanti", loc: "stad", fx: () => ((S.rel.taraf += 2), (S.rel.takim += 2)) },
  { id: "dost", loc: "kafe", fx: () => ((S.rel.ark += 6), (S.moral += 3)) },
  { id: "roportaj", loc: "studyo", fx: () => (S.followers = Math.round(S.followers * 1.03) + 15) },
  { id: "tekne", loc: "taraftar", fx: () => ((S.moral += 5), (S.rel.taraf += 1)) },
  { id: "hastane", loc: "aile", fx: () => ((S.rel.taraf += 3), (S.moral += 3), (S.rel.aile += 2)) },
  { id: "olcum", loc: "performans", fx: () => (S.fit = Math.min(100, (S.fit ?? 65) + 2)) }
];
const wk = () => `${S.season}-${S.week}`;
Bus.on("week:start", () => {
  if (!S || window.__SIM) return;
  if (S.mapEv && S.mapEv.w === wk()) return;
  const n = Math.random() < 0.5 ? 1 : 2;
  S.mapEv = {
    w: wk(),
    list: shuffle(EVENTS.slice())
      .slice(0, n)
      .map(e => ({ id: e.id, loc: e.loc, done: false }))
  };
});
export function mapEventsHere() {
  if (!S || !S.mapEv || S.mapEv.w !== wk()) return [];
  const d = district();
  return S.mapEv.list.map((e, i) => ({ ...e, i })).filter(e => !e.done && !late.focusLocOff(e.loc) && (IN2.includes(e.loc) ? "kompleks" : "merkez") === d);
}
function openEvent(i, re) {
  const e = S.mapEv && S.mapEv.list[i];
  if (!e || e.done) return;
  const def = EVENTS.find(x => x.id === e.id);
  sheet(
    $t(`mev.${e.id}`),
    $t("mev.sub"),
    `<div class="say" style="border-left-color:var(--gold)">${$t(`mev.${e.id}D`, { c: S.npc.coach, f: S.npc.friend })}</div><p class="small muted">${$t("mev.cost")}</p><div class="grid2"><button class="btn ghost" id="mev-no">${$t("mev.skip")}</button><button class="btn pri" id="mev-go" ${S.energy < 5 ? "disabled" : ""}>${$t("mev.join")}</button></div>`
  );
  $("#mev-no").onclick = () => (closeSheet(), re());
  $("#mev-go").onclick = () => {
    e.done = true;
    S.energy -= 5;
    def.fx();
    norm();
    save();
    Bus.emit("mapev", { id: e.id });
    sheet(
      $t(`mev.${e.id}`),
      $t("mev.sub"),
      `<div class="say" style="border-left-color:var(--good)">${$t(`mev.${e.id}R`)}</div><button class="btn pri" id="mev-ok">${$t("goal.ok")}</button>`
    );
    $("#mev-ok").onclick = () => (closeSheet(), re());
  };
}
