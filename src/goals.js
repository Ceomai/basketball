/* ================= SEZON HEDEFLERİ =================
   Her sezon başında 2-3 hedef: koç (takım ve rol), menajer (bireysel sayılar), okuldayken aile (ders notu).
   Sezon başında bir panelle bildirilir, Lig merkezi → Hedefler sekmesinde ilerleme görünür, sezon sonunda değerlendirilir:
   - koç hedefi: tutarsa koçun güveni +8, tutmazsa -6 (rol değerlendirmelerine yansır)
   - menajer hedefi: tutarsa sezon sonu teklifleri daha iyi (menajer pazarlık gücü), tutmazsa takipçi kaybı
   - aile hedefi: aile ilişkisi ve moral
   - hepsi tutarsa haftalık ücretin iki katı prim */
import { t as $t } from "./i18n/index.js";
import { $, Bus, clamp, esc, isPro } from "./data.js";
import { S, closeSheet, norm, sheet, standings, tx } from "./core.js";
import { late } from "./late.js";

const r1 = v => Math.round(v * 10) / 10;
function lastSeason() {
  const h = (S.hist || []).filter(x => x.g).slice(-1)[0];
  return h ? { ppg: h.pts / h.g, avg: h.avg || 6.3 } : null;
}
/** Yeni sezonun hedefleri (newSeasonLeague içinden) */
export function newGoals() {
  if (!S) return;
  const list = [],
    last = lastSeason(),
    pro = isPro(S.stage);
  if (!pro) {
    list.push({ id: "playoff", by: "koc" });
    list.push({ id: "rating", by: "koc", v: r1(clamp(last ? last.avg + 0.2 : 6.3, 6.2, 7.4)) });
    if (S.studying) list.push({ id: "aka", by: "aile", v: 60 });
  } else {
    list.push(S.role === "star" ? { id: "playoff", by: "koc" } : { id: "role", by: "koc" });
    const base = { star: 12, rot: 8, bench: 5 }[S.role] || 8;
    list.push({ id: "ppg", by: "menajer", v: Math.round(clamp(last ? last.ppg + 1.5 : base, base * 0.7, 26)) });
    list.push({ id: "rating", by: "menajer", v: r1(clamp(last ? last.avg + 0.15 : 6.5, 6.3, 7.8)) });
  }
  S.goals = { season: S.season, list, shown: false, result: null };
}
const rank = () => (S.league ? standings().findIndex(r => r.key === S.team.key) + 1 : 99);
/** Hedefin şu anki durumu: { cur, pct, ok } */
export function goalState(g, playoff) {
  const s = S.ss || {},
    gp = s.g || 0;
  switch (g.id) {
    case "playoff": {
      const rk = rank();
      return {
        cur: $t("goal.rank", { v: rk }),
        pct: clamp((S.league.length - rk + 1) / (S.league.length - 3), 0, 1),
        ok: playoff != null ? playoff : rk <= 4
      };
    }
    case "role":
      return {
        cur: S.role === "star" ? $t("goal.yes") : $t("goal.no"),
        pct: S.role === "star" ? 1 : S.role === "rot" ? 0.5 : 0.15,
        ok: S.role === "star"
      };
    case "ppg": {
      const v = gp ? s.pts / gp : 0;
      return { cur: v.toFixed(1), pct: clamp(v / g.v, 0, 1), ok: gp >= 5 && v >= g.v };
    }
    case "rating": {
      const v = late.seasonAvg ? late.seasonAvg() : 0;
      return { cur: v ? v.toFixed(2) : "-", pct: clamp((v - 5) / (g.v - 5), 0, 1), ok: v >= g.v };
    }
    case "aka":
      return { cur: String(Math.round(S.aka)), pct: clamp(S.aka / g.v, 0, 1), ok: S.aka >= g.v };
  }
  return { cur: "-", pct: 0, ok: false };
}
const GOAL_KEY = { playoff: "goal.playoff", role: "goal.role", ppg: "goal.ppg", rating: "goal.rating", aka: "goal.aka" };
const goalText = g => $t(GOAL_KEY[g.id] || "goal.playoff", { v: g.v });
const giver = g =>
  g.by === "koc"
    ? $t("goal.byCoach", { v: S.npc.coach })
    : g.by === "menajer"
      ? $t("goal.byAgent", { v: S.npc.agent })
      : $t("goal.byFamily");
const effectText = g => (g.by === "koc" ? $t("goal.fx.koc") : g.by === "menajer" ? $t("goal.fx.menajer") : $t("goal.fx.aile"));

/** Lig merkezi sekmesi ve sezon başı paneli için liste */
export function goalsHTML(withFx) {
  const G = S.goals;
  if (!G || !G.list.length) return `<p class="small muted">${$t("goal.none")}</p>`;
  return G.list
    .map(g => {
      const st = goalState(g);
      return `<div class="card"><div class="row between nowrap"><div class="eyebrow">${esc(giver(g))}</div><span class="pill ${st.ok ? "w" : ""}">${st.cur}</span></div><b>${goalText(g)}</b><div class="bar"><i style="width:${Math.round(st.pct * 100)}%;background:${st.ok ? "var(--good)" : "var(--gold)"}"></i></div>${withFx ? `<p class="small muted">${effectText(g)}</p>` : ""}</div>`;
    })
    .join("");
}
// sezon başı paneli (haftalık panel sırasında en önce)
function goalsSheet() {
  if (!S || !S.goals || S.goals.shown || S.week > 2) return false;
  S.goals.shown = true;
  if (window.__SIM) return false;
  sheet($t("goal.title"), $t("goal.sub"), `${goalsHTML(true)}<button class="btn pri" id="gl-ok">${$t("goal.ok")}</button>`, {
    noClose: true
  });
  $("#gl-ok").onclick = () => closeSheet();
  return true;
}
Bus.offer("week:sheet", goalsSheet, 5);

/** Sezon sonu değerlendirmesi (seasonEnd içinden, teklifler oluşmadan önce) */
export function evalGoals(playoff) {
  const G = S.goals;
  if (!G || G.result || G.season !== S.season) return null;
  const res = G.list.map(g => ({ g, ok: goalState(g, playoff).ok }));
  for (const { g, ok } of res) {
    if (g.by === "koc") S.rel.koc += ok ? 8 : -6;
    else if (g.by === "menajer") {
      if (ok) S.buffs.offer = 1;
      else S.followers = Math.round(S.followers * 0.97);
    } else {
      S.rel.aile += ok ? 8 : -5;
      S.moral += ok ? 5 : -3;
    }
  }
  const all = res.every(r => r.ok);
  if (all && isPro(S.stage)) tx($t("goal.bonusTx"), Math.round(S.wage * 2));
  norm();
  G.result = res.map(r => ({ id: r.g.id, by: r.g.by, v: r.g.v, ok: r.ok }));
  Bus.emit("goals", { ok: res.filter(r => r.ok).length, of: res.length });
  return G.result;
}
/** Sezon sonu ekranındaki kart */
export function goalsResultHTML() {
  const R = S.goals && S.goals.result;
  if (!R) return "";
  const ok = R.filter(r => r.ok).length;
  return `<div class="card"><div class="row between"><div class="eyebrow">${$t("goal.title")}</div><span class="pill ${ok === R.length ? "w" : ok ? "g" : "l"}">${ok}/${R.length}</span></div>${R.map(
    r =>
      `<div class="row between nowrap small" style="padding:3px 0"><span>${goalText(r)}</span><b class="${r.ok ? "good" : "bad"}">${r.ok ? $t("goal.done") : $t("goal.failed")}</b></div>`
  ).join(
    ""
  )}<p class="small muted">${ok === R.length ? $t("goal.allDone") : ok ? $t("goal.some") : $t("goal.noneDone")}</p></div>`;
}
