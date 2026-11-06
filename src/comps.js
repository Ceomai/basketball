/* ================= KULÜP YARIŞMALARI: AVRUPA, KUPA, SÜPER KUPA; PLAYOFF AĞACI =================
   Oyuncu geri bildirimi: "EuroLeague bir lig değil ayrı bir turnuva; Baskonia'ya geçtim, İspanya ligi yoktu."
   - EuroLeague kulübündeyken hafta sonu ülkenin ligi oynanır (Liga ACB, BSL ...); EuroLeague hafta içi ayrı bir
     turnuvadır: 8 takımlı grupta 6 maç, ilk 4 Final Four (son lig haftasında yarı final + final).
   - EuroCup: bir önceki sezon üst ligde ilk 2'de bitiren (EuroLeague kulübü olmayan) takımlar için, aynı biçimde.
   - Ülke kupası (profesyonel liglerde): çeyrek final, yarı final, final (eleme). Süper Kupa: sezon başında, geçen
     sezonun lig ya da kupa şampiyonuysan.
   - Hafta içi maçı lig maçından sonra gelir: kendin oynarsın ya da simüle edersin; sakatsan takım sensiz oynar.
     Enerji maliyeti lig maçından az (−14). Kupalar vitrine, istatistikler kariyer toplamına eklenir.
   - Playoff: eşleşmeler ve sonuçlar kaydedilir; Lig merkezinde "Playoff" sekmesinde ağaç olarak görünür.
   - Lig merkezinde "Kupalar" sekmesi: Avrupa grubu puan durumu, kupa yolu, Süper Kupa. */
import { t as $t } from "./i18n/index.js";
import { $, Bus, EU_CC, esc, isPro, pick, rnd, shuffle } from "./data.js";
import { S, crestSVG, fullName, lgName, news, norm, sheet, standings, teamByKey, tx } from "./core.js";
import { save } from "./save.js";
import { leaguePool } from "./clubs.js";
import { late } from "./late.js";

const PRO_CUP = ["t3", "t2", "t1", "euro"];
const nGames = () => (S.sched ? S.sched.length : 14);
const teamOf = k => teamByKey(k) || (S.cupTeams && S.cupTeams[k]);
const remember = t => {
  S.teams[t.key] = S.teams[t.key] || t;
  return t;
};

/* ---- Sezon başı: yarışmaların kurulumu (newSeasonLeague sonrası) ---- */
export function setupComps() {
  if (!S || !isPro(S.stage) || S.stage === "nba") {
    S.comps = null;
    return;
  }
  const C = (S.comps = { season: S.season, euro: null, cup: null, sup: null });
  const L = nGames(),
    quick = L <= 7;
  // Avrupa
  const euroKind = S.stage === "euro" ? "el" : S.eurocupNext === S.season ? "ec" : null;
  if (euroKind) {
    let pool;
    if (euroKind === "el") pool = leaguePool("euro").filter(t => t.key !== S.team.key);
    else
      pool = shuffle(EU_CC.filter(c => c !== S.team.cc))
        .slice(0, 7)
        .map(cc => pick(leaguePool("t1", cc)));
    const opps = shuffle(pool).slice(0, 7).map(remember);
    const wk = quick ? [1, 2, 3, 4, 5, 6] : [2, 4, 6, 8, 10, 12];
    C.euro = {
      kind: euroKind,
      table: [S.team, ...opps].map(t => ({ key: t.key, w: 0, l: 0, pf: 0, pa: 0 })),
      games: opps.slice(0, 6).map((t, i) => ({ opp: t.key, home: i % 2 === 0, week: wk[i] })),
      ff: null,
      done: false
    };
  }
  // ülke kupası
  if (PRO_CUP.includes(S.stage)) {
    const lg = S.league.map(r => r.key).filter(k => k !== S.team.key);
    const draw = shuffle(lg).slice(0, 3);
    const wk = quick ? [2, 4, 6] : [4, 9, 12];
    C.cup = { rounds: draw.map((k, i) => ({ opp: k, week: wk[i], r: i })), at: 0, out: false, won: false };
  }
  // Süper Kupa
  if (S.superNext === S.season && PRO_CUP.includes(S.stage)) {
    const lg = standings().filter(r => r.key !== S.team.key);
    C.sup = { opp: pick(lg.slice(0, 3)).key, week: 1, done: false };
  }
}
Bus.on("week:start", () => {
  if (S && isPro(S.stage) && S.stage !== "nba" && (!S.comps || S.comps.season !== S.season) && S.week <= 2) setupComps();
});

/* ---- Bu haftanın hafta içi maçları ---- */
function dueGames() {
  const C = S.comps;
  if (!C || C.season !== S.season || S.phase !== "regular") return [];
  const out = [];
  if (C.sup && !C.sup.done && S.week >= C.sup.week) out.push({ comp: "sup", opp: C.sup.opp, home: true });
  if (C.euro && !C.euro.done) {
    const g = C.euro.games.find(x => !x.res && S.week >= x.week);
    if (g) out.push({ comp: "euro", opp: g.opp, home: g.home, g });
    else if (C.euro.games.every(x => x.res) && S.week >= nGames()) {
      if (!C.euro.ff) startFF();
      const f = C.euro.ff;
      if (f && f.at < 2 && !f.out) out.push({ comp: "ff", opp: f.at === 0 ? f.semi : f.final, home: true });
    }
  }
  if (C.cup && !C.cup.out && !C.cup.won) {
    const r = C.cup.rounds[C.cup.at];
    if (r && S.week >= r.week) out.push({ comp: "cup", opp: r.opp, home: Math.random() < 0.5, r });
  }
  return out;
}
const compName = g =>
  g.comp === "sup"
    ? $t("cp.super")
    : g.comp === "cup"
      ? `${$t("cp.cup", { v: (late.LEAGUES[S.team.cc] || late.LEAGUES.TR).n })} · ${[$t("cp.qf"), $t("cp.sf"), $t("cp.f")][g.r.r]}`
      : g.comp === "ff"
        ? `${euroName()} · ${$t("cp.ff")} · ${S.comps.euro.ff.at === 0 ? $t("cp.sf") : $t("cp.f")}`
        : `${euroName()} · ${$t("cp.group")}`;
const euroName = () => (S.comps && S.comps.euro && S.comps.euro.kind === "ec" ? "EuroCup" : "EuroLeague");

/** afterMatch → hafta içi maçları sırayla, sonra next (lig akışı) */
export function midweek(next) {
  if (!S || window.__SIM_NOCOMP) return next();
  const list = dueGames();
  if (!list.length) return next();
  const g = list[0];
  if (window.__SIM) {
    simGame(g, null);
    return midweek(next);
  }
  const opp = teamOf(g.opp);
  sheet(
    $t("cp.midTitle"),
    compName(g),
    `<div class="card"><div class="row nowrap" style="gap:10px">${crestSVG(S.team, 40)}<b>${esc(S.team.short)}</b><span class="vs">${$t("core.76")}</span>${crestSVG(opp, 40)}<b>${esc(opp.name)}</b></div><p class="small muted">${$t("cp.midD")}</p></div>${
      S.injury
        ? `<button class="btn pri" id="mw-sim">${$t("cp.injured")}</button>`
        : `<div class="grid2"><button class="btn pri" id="mw-play">${$t("quick.self")}</button><button class="btn" id="mw-sim">${$t("quick.sim")}</button></div>`
    }`,
    { noClose: true }
  );
  const go = auto => {
    late.closeSheet();
    if (S.injury) {
      simGame(g, null);
      return resultSheet(g, null, () => midweek(next));
    }
    late.playMatch({
      opp,
      home: g.home,
      comp: g.comp === "sup" || g.comp === "cup" ? "kupa" : "euro",
      label: compName(g),
      auto,
      onEnd: win => {
        const line = { us: late.M.us, them: late.M.them, pts: late.M.pts, ast: late.M.ast, reb: late.M.reb, r: late.M.rating };
        late.matchStatGains(late.M);
        apply(g, win, line);
        resultSheet(g, line, () => midweek(next));
      }
    });
  };
  const p = $("#mw-play");
  if (p) p.onclick = () => go(false);
  $("#mw-sim").onclick = () => go(true);
}
// sakatken ya da test simülasyonunda: takım gücüyle sonuç
function simGame(g, line) {
  const opp = teamOf(g.opp),
    a = S.team.str * (S.injury ? 0.95 : 1),
    p = a / (a + opp.str),
    win = Math.random() < p;
  const base = Math.round(75 * rnd(0.9, 1.1)),
    us = win ? base + Math.round(rnd(2, 12)) : base,
    them = win ? base : base + Math.round(rnd(2, 12));
  apply(g, win, line || { us, them, pts: 0, ast: 0, reb: 0, r: 0, sim: true });
}
function apply(g, win, line) {
  const C = S.comps,
    opp = teamOf(g.opp);
  g.done = true;
  if (!line.sim) {
    const k = S.career;
    k.games++;
    k.pts += line.pts;
    k.ast += line.ast;
    k.reb = (k.reb || 0) + line.reb;
    k.wins += win ? 1 : 0;
    S.energy -= 14;
    S.moral += win ? 3 : -3;
    S.followers += Math.round(S.followers * (line.r >= 7 ? 0.03 : 0.01));
    const cs = (S.cupStats = S.cupStats || { g: 0, pts: 0, ast: 0, reb: 0 });
    cs.g++;
    cs.pts += line.pts;
    cs.ast += line.ast;
    cs.reb += line.reb;
  }
  const prize = Math.round(S.wage * (g.comp === "cup" || g.comp === "sup" ? 0.3 : 0.5) * (win ? 1 : 0.3));
  if (prize > 0) tx($t("cp.prize", { v: compName(g) }), prize);
  if (g.comp === "euro") {
    g.g.res = { win, us: line.us, them: line.them };
    const T = C.euro.table,
      me = T.find(x => x.key === S.team.key),
      ro = T.find(x => x.key === g.opp);
    me.pf += line.us;
    me.pa += line.them;
    ro.pf += line.them;
    ro.pa += line.us;
    (win ? me : ro).w++;
    (win ? ro : me).l++;
    // diğer grup maçları
    const others = shuffle(T.filter(x => x !== me && x !== ro));
    for (let i = 0; i + 1 < others.length; i += 2) {
      const A = others[i],
        B = others[i + 1],
        sa = Math.round(78 * teamOf(A.key).str * rnd(0.88, 1.1)),
        sb = Math.round(78 * teamOf(B.key).str * rnd(0.88, 1.1)) + (sa === 0 ? 1 : 0);
      A.pf += sa;
      A.pa += sb;
      B.pf += sb;
      B.pa += sa;
      (sa > sb ? A : B).w++;
      (sa > sb ? B : A).l++;
    }
  } else if (g.comp === "ff") {
    const f = C.euro.ff;
    f.res = f.res || [];
    f.res.push({ opp: g.opp, win, us: line.us, them: line.them });
    if (!win) {
      f.out = true;
      C.euro.done = true;
      news($t("cp.ffOut", { v: S.team.short, e: euroName() }));
    } else if (f.at === 0) {
      f.at = 1;
      const [a, b] = f.other;
      f.final = Math.random() < teamOf(a).str / (teamOf(a).str + teamOf(b).str) ? a : b;
    } else {
      f.at = 2;
      C.euro.done = true;
      trophy(g.comp === "ff" && C.euro.kind === "ec" ? "ec" : "el", $t("cp.champ", { e: euroName() }));
      S.followers = Math.round(S.followers * 1.15);
      S.rel.taraf += 8;
    }
  } else if (g.comp === "cup") {
    const c = C.cup;
    c.rounds[c.at].res = { win, us: line.us, them: line.them };
    if (!win) c.out = true;
    else if (c.at === 2) {
      c.won = true;
      S.superNext = S.season + 1;
      trophy("cup", $t("cp.cupChamp", { v: (late.LEAGUES[S.team.cc] || late.LEAGUES.TR).n }));
      S.rel.taraf += 5;
    } else c.at++;
  } else if (g.comp === "sup") {
    C.sup.done = true;
    C.sup.res = { win, us: line.us, them: line.them };
    if (win) trophy("super", $t("cp.super"));
  }
  norm();
  save();
  Bus.emit("comp", { comp: g.comp, win });
}
function trophy(type, label) {
  S.career.trophies.push({ type, label: `${late.seasonLabel()} · ${label}` });
  news($t("cp.trophyNews", { v: fullName(), t: label }));
  late.sfx("fanfare");
}
function startFF() {
  const E = S.comps.euro,
    st = E.table.slice().sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa)),
    rank = st.findIndex(r => r.key === S.team.key) + 1;
  if (rank > 4) {
    E.done = true;
    E.ff = { out: true, rank, at: 0 };
    news($t("cp.groupOut", { v: S.team.short, e: euroName(), r: rank }));
    return;
  }
  const oi = [3, 2, 1, 0][rank - 1];
  E.ff = { rank, semi: st[oi].key, other: [0, 1, 2, 3].filter(i => i !== rank - 1 && i !== oi).map(i => st[i].key), at: 0 };
  news($t("cp.ffIn", { v: S.team.short, e: euroName() }));
}
function resultSheet(g, line, next) {
  const opp = teamOf(g.opp),
    r =
      g.comp === "euro"
        ? g.g.res
        : g.comp === "ff"
          ? S.comps.euro.ff.res.slice(-1)[0]
          : g.comp === "cup"
            ? S.comps.cup.rounds[g.r.r].res
            : S.comps.sup.res;
  sheet(
    r.win ? $t("match.32") : $t("match.33"),
    compName(g),
    `<div class="row between nowrap"><div class="row nowrap" style="gap:8px">${crestSVG(S.team, 36)}<span class="big-num">${r.us}–${r.them}</span>${crestSVG(opp, 36)}</div>${line && line.r ? `<div class="rating">${line.r.toFixed(1)}</div>` : ""}</div>
    ${line ? `<div class="box"><div><b>${line.pts}</b><span class="eyebrow">${$t("arcade.6")}</span></div><div><b>${line.ast}</b><span class="eyebrow">${$t("extras.31")}</span></div><div><b>${line.reb}</b><span class="eyebrow">${$t("data.63")}</span></div></div>${late.gainsHTML()}` : `<p class="small muted">${$t("cp.withoutYou")}</p>`}
    <button class="btn pri" id="mw-ok">${$t("ads.25")}</button>`,
    { noClose: true }
  );
  $("#mw-ok").onclick = () => (late.closeSheet(), next());
}

/* ---- Sezon sonu: gelecek sezonun hakları ---- */
Bus.on("season:end", d => {
  if (!S) return;
  // S.season seasonEnd içinde sonra artar: hak "gelecek sezon" için
  const nextS = S.season + 1;
  if (d && d.champ && PRO_CUP.includes(S.stage)) S.superNext = nextS;
  const rank = standings().findIndex(r => r.key === S.team.key) + 1;
  if (S.stage === "t1" && rank > 0 && rank <= 2) S.eurocupNext = nextS;
});

/* ---- Playoff kaydı (afterMatchFlow) ---- */
export function poStart(st, rank, opp, other) {
  S.po = { season: S.season, seeds: st.slice(0, 4).map(r => r.key), me: S.team.key, rank, semi: opp, other, res: {} };
}
export function poSemi(win, finalOpp) {
  if (!S.po) return;
  S.po.res.semi = { win, us: late.M ? late.M.us : 0, them: late.M ? late.M.them : 0, ser: late.serScore() };
  S.po.otherWin = finalOpp || null;
}
export function poFinal(win) {
  if (!S.po) return;
  S.po.res.final = { win, us: late.M ? late.M.us : 0, them: late.M ? late.M.them : 0, opp: S.playoffOpp, ser: late.serScore() };
}
const nm = k => esc((teamOf(k) || { short: "?" }).short || (teamOf(k) || {}).name || "?");
export function playoffHTML() {
  const P = S.po;
  if (!P || P.season !== S.season) return `<p class="small muted">${$t("cp.noPo")}</p>`;
  const s = P.res.semi,
    f = P.res.final,
    [o1, o2] = P.other;
  const box = (a, b, r, mine) =>
    `<div class="card" style="padding:8px 10px;${mine ? "border-color:var(--gold)" : ""}"><div class="row between nowrap"><b>${nm(a)}</b><span>${r ? (r.ser ? `${r.ser[0]}–${r.ser[1]}` : `${r.us}–${r.them}`) : "–"}</span><b>${nm(b)}</b></div>${r ? `<div class="small ${r.win ? "good" : "bad"}">${r.win ? nm(a) : nm(b)} ${$t("cp.adv")}</div>` : ""}</div>`;
  const otherRes = P.otherWin ? { us: "", them: "", win: P.otherWin === o1 } : null;
  return `<div class="eyebrow">${$t("cp.sf")}</div>${box(P.me, P.semi, s, true)}<div class="card" style="padding:8px 10px"><div class="row between nowrap"><b>${nm(o1)}</b><span>${otherRes ? "✓" : "–"}</span><b>${nm(o2)}</b></div>${P.otherWin ? `<div class="small">${nm(P.otherWin)} ${$t("cp.adv")}</div>` : ""}</div>
  <div class="eyebrow">${$t("cp.f")}</div>${s && s.win ? box(P.me, P.otherWin || S.playoffOpp, f, true) : `<p class="small muted">${P.otherWin ? `${nm(P.otherWin)} ${$t("cp.inFinal")}` : $t("cp.tbd")}</p>`}${f ? `<p class="${f.win ? "good" : ""}"><b>${f.win ? $t("cp.poChamp") : $t("cp.poRunner")}</b></p>` : ""}${late.serListHTML()}`;
}
export function compsHTML() {
  const C = S.comps;
  if (!C || C.season !== S.season) return `<p class="small muted">${$t("cp.none")}</p>`;
  let h = "";
  if (C.sup)
    h += `<div class="card"><div class="eyebrow">${$t("cp.super")}</div><p>${nm(S.team.key)} – ${nm(C.sup.opp)}: ${C.sup.res ? `${C.sup.res.us}–${C.sup.res.them} ${C.sup.res.win ? "✓" : "✗"}` : $t("cp.week", { w: C.sup.week })}</p></div>`;
  if (C.euro) {
    const st = C.euro.table.slice().sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa));
    h += `<div class="card"><div class="eyebrow">${euroName()} · ${$t("cp.group")}</div><div class="tbl"><table><tr><th>#</th><th></th><th>G</th><th>M</th><th>±</th></tr>${st
      .map(
        (r, i) =>
          `<tr style="${r.key === S.team.key ? "font-weight:800;color:var(--gold)" : ""}${i === 3 ? ";border-bottom:2px solid var(--gold)" : ""}"><td>${i + 1}</td><td>${nm(r.key)}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf - r.pa}</td></tr>`
      )
      .join("")}</table></div><p class="small muted">${$t("cp.ffNote")}</p>${
      C.euro.ff && !C.euro.ff.out && C.euro.ff.res
        ? `<p class="small">${$t("cp.ff")}: ${C.euro.ff.res.map(x => `${x.us}–${x.them} ${x.win ? "✓" : "✗"}`).join(" · ")}</p>`
        : ""
    }</div>`;
  }
  if (C.cup)
    h += `<div class="card"><div class="eyebrow">${$t("cp.cup", { v: (late.LEAGUES[S.team.cc] || late.LEAGUES.TR).n })}</div>${C.cup.rounds
      .map(
        (r, i) =>
          `<div class="row between nowrap small" style="padding:3px 0"><span>${[$t("cp.qf"), $t("cp.sf"), $t("cp.f")][i]} · ${nm(r.opp)}</span><b class="${r.res ? (r.res.win ? "good" : "bad") : ""}">${r.res ? `${r.res.us}–${r.res.them}` : C.cup.out ? "–" : $t("cp.week", { w: r.week })}</b></div>`
      )
      .join("")}${C.cup.won ? `<p class="good"><b>${$t("cp.cupWon")}</b></p>` : ""}</div>`;
  return h || `<p class="small muted">${$t("cp.none")}</p>`;
}
export const hasComps = () => !!(S && S.comps && S.comps.season === S.season);
