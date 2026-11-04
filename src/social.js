/* ================= TAKIM İLİŞKİSİ, KUMARHANE VE GECE HAYATI =================
   1) Pas güveni (0-100): takım ilişkisi + kadro uyumu. Maçta takım arkadaşlarının sana pas verme isteğini belirler:
      hücumda topla buluşma (karar anı) olasılığı ±%5, arka planda sayı payı ×0,8-1,2. Maç sonunda "topla buluşma"
      sayısı ve pas güveni görünür; sezon ortalaması tutulur.
   2) Oyun Kulübü oyunlarını bir takım arkadaşıyla oynayabilirsin: takım ilişkisi +2 (haftada en fazla 2 kez) ve o
      arkadaşla uyum +6. Evin genişse (lüks daire ve üstü) takımı eve davet edebilirsin.
   3) Kumarhane: fiş artık parayla alınır ve paraya çevrilir (kariyer seviyesine göre kur, bozdururken %3 kesinti).
      Kumarhaneye ya da gece kulübüne gitmek koçla ilişkiyi düşürür (haftada bir kez -3) ama moral ve
      soğukkanlılık (Clutch özelliğine ilerleme) kazandırır. Oyunlar bir tık daha cömert (rulet renk ×2,1, slot çift ×1,8). */
import { t as $t } from "./i18n/index.js";
import { $, $$, clamp, fmt, toast } from "./data.js";
import { S, closeSheet, norm, renderMain, resultView, tx, useSlot } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

/* ---- Pas güveni ---- */
export const passTrust = () =>
  S ? Math.round(clamp(50 + (S.rel.takim - 50) * 0.6 + ((late.chemAvg ? late.chemAvg() : 40) - 40) * 0.4, 0, 100)) : 50;
export const passTrustBonus = () => (passTrust() - 50) / 1000;
export const passTrustMul = () => 0.8 + passTrust() / 250;
export function trustHTML(M) {
  const t = passTrust();
  return `<span>${$t("soc.touches")}</span><b>${(M && M.touches) || 0}</b><span>${$t("soc.trust")}</span><b class="${t >= 60 ? "good" : t < 40 ? "bad" : ""}">${t}</b>`;
}
export function trustCardHTML() {
  const t = passTrust(),
    ss = S.ss || {},
    avg = ss.g ? ((ss.tch || 0) / ss.g).toFixed(1) : "-";
  return `<div class="card"><div class="row between"><div class="eyebrow">${$t("soc.trust")}</div><b class="${t >= 60 ? "good" : t < 40 ? "bad" : ""}">${t}/100</b></div><div class="bar"><i style="width:${t}%"></i></div><p class="small muted">${$t("soc.trustD", { a: avg })}</p></div>`;
}

/* ---- Takım arkadaşıyla Oyun Kulübü ---- */
const wk = () => `${S.season}-${S.week}`;
const mates = () => (late.roster ? late.roster().slice(0, 3) : []);
export function arcMateHTML() {
  const m = mates(),
    cur = S.arcMate == null ? -1 : S.arcMate;
  return `<div><div class="eyebrow" style="margin-bottom:6px">${$t("soc.withWho")}</div><div class="opts" id="amate"><button class="opt ${cur === -1 ? "on" : ""}" data-m="-1">${$t("soc.alone")}</button>${m.map((p, i) => `<button class="opt ${cur === i ? "on" : ""}" data-m="${i}">${p.n.split(" ")[0]}</button>`).join("")}</div><p class="small muted" style="margin-top:6px">${$t("soc.withD")}</p></div>`;
}
export function bindArcMate(re) {
  $$("#amate [data-m]").forEach(b => (b.onclick = () => ((S.arcMate = +b.dataset.m), re())));
}
/** Oyun bitince (arcadeRun): takım arkadaşıyla oynandıysa ilişki */
export function arcMateResult(score) {
  const m = mates()[S.arcMate];
  if (S.arcMate == null || S.arcMate < 0 || !m) return "";
  if (S.mateWk !== wk()) {
    S.mateWk = wk();
    S.mateN = 0;
  }
  m.chem = Math.min(100, m.chem + 6);
  if (S.mateN < 2) {
    S.mateN++;
    S.rel.takim += 2 + (score >= 15 ? 1 : 0);
    norm();
    return ` ${$t("soc.mateOk", { n: m.n.split(" ")[0] })}`;
  }
  return ` ${$t("soc.mateChem", { n: m.n.split(" ")[0] })}`;
}
/* ---- Ev partisi (lüks daire ve üstü) ---- */
const BIG = ["lux", "villa", "malikane"];
const partyCost = () => Math.max(40, Math.round((S.wage || 10) * 0.25));
export function housePartyHTML() {
  if (!BIG.includes(S.housing)) return "";
  const done = S.partyWk === wk();
  return `<div class="act"><div><h3>${$t("soc.party")}</h3><p>${$t("soc.partyD", { v: fmt(partyCost()) })}</p></div><button class="btn team sm" id="hparty" ${done || S.slot <= 0 || S.money < partyCost() ? "disabled" : ""}>${done ? $t("soc.partyDone") : $t("soc.partyBtn")}</button></div>`;
}
export function bindHouseParty() {
  const b = $("#hparty");
  if (!b) return;
  b.onclick = () => {
    if (S.partyWk === wk() || S.money < partyCost()) return;
    S.partyWk = wk();
    useSlot();
    tx($t("soc.party"), -partyCost());
    S.rel.takim += 6;
    S.moral += 6;
    S.energy -= 10;
    for (const p of mates()) p.chem = Math.min(100, p.chem + 4);
    norm();
    save();
    resultView($t("soc.party"), $t("soc.partyRes"), [
      [$t("soc.fxTeam"), "p"],
      [$t("soc.fxMoral"), "p"]
    ]);
  };
}

/* ---- Kumarhane: fiş kuru, bozdurma, ziyaret etkisi ---- */
const RATE = { lise: 0.01, uni: 0.02, t3: 0.15, t2: 0.4, t1: 1.2, euro: 4, nba: 15 };
export const chipRate = () => RATE[S.stage] || 0.01;
export const BUY_PACK = 1000;
export function cashierHTML() {
  const r = chipRate(),
    cost = Math.max(1, Math.round(BUY_PACK * r)),
    out = Math.floor((S.chips || 0) * r * 0.97);
  return `<div class="card"><div class="eyebrow">${$t("soc.cashier")}</div><p class="small muted">${$t("soc.rate", { v: fmt(Math.max(1, Math.round(100 * r))) })}</p><div class="grid2"><button class="btn sm" id="cbuy" ${S.money < cost ? "disabled" : ""}>${$t("soc.buy", { n: BUY_PACK, v: fmt(cost) })}</button><button class="btn ghost sm" id="csell" ${out < 1 ? "disabled" : ""}>${$t("soc.sell", { v: fmt(out) })}</button></div></div>`;
}
export function bindCashier(re) {
  const b = $("#cbuy"),
    s = $("#csell");
  if (b)
    b.onclick = () => {
      const cost = Math.max(1, Math.round(BUY_PACK * chipRate()));
      if (S.money < cost) return;
      tx($t("soc.chipBuy"), -cost);
      S.chips = (S.chips || 0) + BUY_PACK;
      save();
      re();
    };
  if (s)
    s.onclick = () => {
      const out = Math.floor((S.chips || 0) * chipRate() * 0.97);
      if (out < 1) return;
      tx($t("soc.chipSell"), out);
      S.chips = 0;
      save();
      toast($t("soc.sold", { v: fmt(out) }));
      re();
    };
}
/** Kumarhane ya da gece kulübü ziyareti (haftada bir kez etkili) */
export function nightVisit(kind) {
  if (!S || S.nightWk === wk()) return "";
  S.nightWk = wk();
  S.rel.koc -= 3;
  S.moral += 3;
  if (kind !== "sans") late.fitHit(1);
  if (kind === "sans") {
    const t = (S.trk = S.trk || { clutch: 0, out: 0, pass: 0, def: 0 });
    t.clutch += 2; // soğukkanlılık: Clutch özelliğine ilerleme
  }
  norm();
  save();
  return $t(kind === "sans" ? "soc.casinoVisit" : "soc.clubVisit");
}
export const closeAndMain = () => (closeSheet(), renderMain());
