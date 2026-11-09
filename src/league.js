/* ================= LİG MERKEZİ =================
   Ana ekrandaki "Lig merkezi" düğmesiyle açılır. Rutin bilgiler gündemden buraya taşındı:
   - Puan durumu (playoff çizgisiyle)
   - Fikstür ve sonuçlar: bizim maçlarımız (skor, not) ve ligde geçen haftanın diğer sonuçları
   - İstatistiklerim: sezon ortalamaları ve son sezonlar
   - Krallıklar: sayı, asist, ribaund (ilk 5)
   Diğer oyuncuların istatistikleri tutulmaz; krallık listeleri her takımın üç öne çıkan oyuncusu için takım gücüne göre
   tutarlı (tohumlu) üretilir ve sezon sonu ödül eşiklerinin altında kalır: oyuncu ödül alacak kadar iyiyse listede de birinci olur.
   Ayrıca maç sonu gündemi: skor yerine anlamlı olaylar (seri, zirve, playoff hattı, kariyer rekoru, 30 sayı, triple-double). */
import { t as $t } from "./i18n/index.js";
import { $$, LEAGUES, SC, clamp, esc, hash } from "./data.js";
import { AWARD_T as AWARD_T_SAFE } from "./logic/rules.js";
import { S, fullName, lgName, news, seasonLabel, sheet, standings, tabsHTML, teamByKey } from "./core.js";
import { late } from "./late.js";

const PLAYOFF = 4;
const per = (v, g) => (g ? v / g : 0);
const f1 = v => v.toFixed(1);

/* ---- Puan durumu ---- */
function tableHTML() {
  const rows = standings();
  return `<div class="tbl"><table><tr><th>#</th><th>${$t("lc.team")}</th><th>${$t("lc.w")}</th><th>${$t("lc.l")}</th><th>${$t("lc.diff")}</th></tr>${rows
    .map((r, i) => {
      const t = teamByKey(r.key) || { name: r.key, c1: "#888" },
        d = r.pf - r.pa;
      return `<tr class="${r.key === S.team.key ? "me" : ""}" ${i === PLAYOFF - 1 ? 'style="border-bottom:2px solid var(--gold)"' : ""}><td>${i + 1}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:var(--r-2xs);background:${t.c1};margin-right:6px"></span>${esc(t.name)}</td><td>${r.w}</td><td>${r.l}</td><td>${d > 0 ? "+" : ""}${d}</td></tr>`;
    })
    .join("")}</table></div><p class="small muted">${$t("lc.playoffLine", { n: PLAYOFF })}</p>`;
}

/* ---- Fikstür ve sonuçlar ---- */
function fixturesHTML() {
  const res = S.results || [],
    sched = S.sched || [];
  const rows = sched
    .map((f, i) => {
      const t = teamByKey(f.opp) || { short: "?", name: f.opp },
        r = res[i],
        next = !r && i === res.length && S.phase === "regular";
      const score = r
        ? `<b class="${r.win ? "good" : "bad"}">${r.win ? $t("lc.wShort") : $t("lc.lShort")} ${r.us}-${r.them}</b>`
        : next
          ? `<span class="pill g">${$t("lc.next")}</span>`
          : `<span class="muted">-</span>`;
      const note = r
        ? r.dnp
          ? $t("lc.dnp")
          : r.rating
            ? `${$t("lc.rating")} ${f1(r.rating)} · ${r.pts} ${$t("lc.ptsShort")}`
            : ""
        : "";
      return `<tr ${next ? 'class="me"' : ""}><td>${i + 1}</td><td>${f.home ? $t("lc.home") : $t("lc.away")}</td><td>${esc(t.name)}</td><td>${score}</td><td class="small muted">${note}</td></tr>`;
    })
    .join("");
  const last = (S.lastRound || [])
    .map(m => {
      const a = teamByKey(m.a) || { short: "?" },
        b = teamByKey(m.b) || { short: "?" };
      return `<div class="row between small" style="padding:var(--sp-1) 0;border-top:1px solid var(--line)"><span>${esc(a.name || a.short)}</span><b>${m.sa}-${m.sb}</b><span class="ta-r">${esc(b.name || b.short)}</span></div>`;
    })
    .join("");
  return `<div class="tbl"><table><tr><th>${$t("lc.wk")}</th><th></th><th>${$t("lc.opp")}</th><th>${$t("lc.result")}</th><th></th></tr>${rows}</table></div>
   ${last ? `<div class="eyebrow" style="margin-top:10px">${$t("lc.lastRound")}</div>${last}` : ""}`;
}

/* ---- İstatistiklerim ---- */
function statsHTML() {
  const s = S.ss || {},
    g = s.g || 0;
  const box = (v, l) => `<div><b>${v}</b><span class="eyebrow">${l}</span></div>`;
  const avg = late.seasonAvg ? late.seasonAvg() : 0;
  const hist = (S.hist || []).slice(-6).reverse();
  return `${late.traitsHTML()}<div class="box">${box(g, $t("lc.games"))}${box(f1(per(s.pts || 0, g)), $t("lc.ppg"))}${box(f1(per(s.ast || 0, g)), $t("lc.apg"))}${box(f1(per(s.reb || 0, g)), $t("lc.rpg"))}</div>
   <div class="kv"><span>${$t("lc.mpg")}</span><b>${f1(per(s.min || 0, g))}</b><span>${$t("lc.avgRating")}</span><b>${avg ? f1(avg) : "-"}</b><span>${$t("lc.dnpCount")}</span><b>${s.dnp || 0}</b><span>${$t("lc.career")}</span><b>${S.career.games} · ${S.career.pts} ${$t("lc.ptsShort")}</b></div>
   ${
     hist.length
       ? `<div class="eyebrow" style="margin-top:10px">${$t("lc.history")}</div><div class="tbl"><table><tr><th>${$t("lc.season")}</th><th>${$t("lc.team")}</th><th>${$t("lc.ppg")}</th><th>${$t("lc.rating")}</th></tr>${hist
           .map(
             h =>
               `<tr><td>${h.label}</td><td>${esc(h.team)}</td><td>${f1(per(h.pts || 0, h.g || 0))}</td><td>${h.avg ? f1(h.avg) : "-"}</td></tr>`
           )
           .join("")}</table></div>`
       : ""
   }`;
}

/* ---- Krallıklar ---- */
// Her rakip takımın üç öne çıkan oyuncusu (sayıcı, oyun kurucu, uzun); değerler takım gücü ve tohumla belirlenir,
// hafta hafta hafifçe oynar. Ödül eşiklerinin altında kalır (bkz. dosya başı).
const CAP = { ppg: AWARD_T_SAFE.ppg - 0.4, apg: AWARD_T_SAFE.apg - 0.3, rpg: AWARD_T_SAFE.rpg - 0.3 };
export function leaders() {
  const out = { ppg: [], apg: [], rpg: [] };
  const g = (S.results || []).filter(r => !r.dnp).length;
  for (const row of S.league || []) {
    if (row.key === S.team.key) continue;
    const t = teamByKey(row.key);
    if (!t) continue;
    const L = LEAGUES[t.cc] || LEAGUES[S.team.cc] || LEAGUES.TR;
    const h = hash(`${row.key}|${S.season}`),
      wk = (hash(`${row.key}|${S.season}|${S.week}`) % 11) / 20 - 0.25;
    const name = i => `${L.first[(h >> (i * 3)) % L.first.length]} ${L.last[(h >> (i * 4 + 2)) % L.last.length]}`;
    const r = i => ((h >> (i * 5)) & 31) / 31,
      str = t.str || 1,
      sc = Math.min(1.15, (SC[S.stage] || 78) / 78); // ligin skor düzeyi (lise maçları düşük skorlu)
    out.ppg.push({ n: name(0), t, v: clamp((11 + (str - 0.95) * 20 + r(1) * 6 + wk) * sc, 6, CAP.ppg) });
    out.apg.push({ n: name(1), t, v: clamp((3.4 + (str - 0.95) * 6 + r(2) * 2.8 + wk / 2) * sc, 1.5, CAP.apg) });
    out.rpg.push({ n: name(2), t, v: clamp((5.2 + (str - 0.95) * 8 + r(3) * 3.6 + wk / 2) * sc, 2.5, CAP.rpg) });
  }
  const s = S.ss || {},
    my = s.g || 0;
  if (my && g) {
    const me = { n: fullName(), t: S.team, me: true };
    out.ppg.push({ ...me, v: per(s.pts || 0, my) });
    out.apg.push({ ...me, v: per(s.ast || 0, my) });
    out.rpg.push({ ...me, v: per(s.reb || 0, my) });
  }
  for (const k in out) out[k].sort((a, b) => b.v - a.v);
  return out;
}
function leadersHTML() {
  const L = leaders();
  const list = (k, title) => {
    const arr = L[k],
      top = arr.slice(0, 5),
      mi = arr.findIndex(x => x.me);
    const rows = top.map((x, i) => [x, i]);
    if (mi >= 5) rows.push([arr[mi], mi]);
    return `<div class="card"><div class="eyebrow">${title}</div>${rows
      .map(
        ([x, i]) =>
          `<div class="row between nowrap small" style="padding:var(--sp-1) 0;${x.me ? "color:var(--gold);font-weight:800" : ""}"><span>${i + 1}. ${esc(x.n)} <span class="muted">· ${esc(x.t.short || "")}</span></span><b>${f1(x.v)}</b></div>`
      )
      .join("")}</div>`;
  };
  return `${list("ppg", $t("lc.kingPts"))}${list("apg", $t("lc.kingAst"))}${list("rpg", $t("lc.kingReb"))}<p class="small muted">${$t("lc.kingNote")}</p>`;
}

/** Lig merkezi paneli */
export function leagueSheet(tab = "hedef") {
  const tabs = [
    ["hedef", $t("lc.goals")],
    ["tablo", $t("lc.table")],
    ["fikstur", $t("lc.fixtures")],
    ["istat", $t("lc.stats")],
    ["kral", $t("lc.leaders")],
    ...(S.po && S.po.season === S.season ? [["po", $t("cp.poTab")]] : []),
    ...(late.hasComps() ? [["kupa", $t("cp.tab")]] : [])
  ];
  const body =
    {
      hedef: () => late.goalsHTML(true),
      tablo: tableHTML,
      fikstur: fixturesHTML,
      istat: statsHTML,
      kral: leadersHTML,
      po: () => late.playoffHTML(),
      kupa: () => late.compsHTML()
    }[tab] || tableHTML;
  sheet($t("lc.title"), `${esc(lgName())} · ${seasonLabel()}`, `${tabsHTML(tabs, tab, "lc")}<div class="stack">${body()}</div>`);
  $$("[data-lc]").forEach(b => (b.onclick = () => leagueSheet(b.dataset.lc)));
}
export const leagueButtonHTML = () => `<button class="btn ghost sm" id="lgc">${$t("lc.title")}</button>`;

/* ---- Maç sonu gündemi: skor yerine anlamlı olaylar ---- */
export const rankNow = () => (S.league ? standings().findIndex(r => r.key === S.team.key) + 1 : 0);
export function matchStoryNews({ win, pts, ast, reb, rankBefore }) {
  const n = fullName(),
    k = S.career;
  // kişisel: kariyer rekoru, 30 sayı, triple-double
  if (ast >= 10 && reb >= 10 && pts >= 10) news($t("lc.nTriple", { v: n, pts, ast, reb }));
  else if (pts >= 30) news($t("lc.n30", { v: n, pts }));
  else if (k.games > 8 && pts > (k.prevHighPts || 0) && pts >= 15) news($t("lc.nHigh", { v: n, pts }));
  // seri
  const res = (S.results || []).filter(r => !r.dnp);
  let streak = 0;
  for (let i = res.length - 1; i >= 0 && res[i].win === win; i--) streak++;
  if (win && [3, 5, 8, 12].includes(streak)) news($t("lc.nWinStreak", { team: S.team.name, n: streak }));
  if (!win && (streak === 3 || streak === 5)) news($t("lc.nLoseStreak", { team: S.team.name, n: streak }));
  // puan durumu
  if (S.phase !== "regular" || !rankBefore || S.week < 3) return;
  const now = rankNow();
  if (now === 1 && rankBefore !== 1) news($t("lc.nTop", { team: S.team.name }));
  else if (now <= PLAYOFF && rankBefore > PLAYOFF) news($t("lc.nIn", { team: S.team.name, n: now }));
  else if (now > PLAYOFF && rankBefore <= PLAYOFF) news($t("lc.nOut", { team: S.team.name, n: now }));
}
