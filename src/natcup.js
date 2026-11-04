/* ================= MİLLİ TAKIM TURNUVASI (yaz) =================
   Eskiden bütün maçlar peş peşe oynanıyordu. Artık turnuva bir merkez ekranından yürür:
   - Grup: Türkiye + 3 rakip, tek devre (3 maç). Diğer grup maçları simüle edilir. İlk 2 yarı finale çıkar.
   - Yarı final (grup 1.'si diğer grubun 2.'siyle), final ya da bronz maçı.
   - Maç aralarında bir hazırlık hakkı: dinlen (+20 enerji), şut çalışması (küçük gelişim), takımla vakit (moral).
   - Sekmeler: puan durumu, fikstür, istatistiklerim (maç başı sayı/asist/ribaund, not ortalaması).
   - Madalyalar kupalara ve miras puanına eklenir. */
import { t as $t } from "./i18n/index.js";
import { $, $$, EU_CC, esc, rnd, shuffle, statName } from "./data.js";
import { S, closeSheet, fullName, gainStat, levelMul, news, norm, sheet, tabsHTML } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

let T = null; // aktif turnuva (yaz arası tek oturumda oynanır; kayıt yüklenirse baştan değil, kalan maçlar simüle edilir)
const nat = cc => late.natTeam(cc, T.cat);
export function natTourney(cat, name, pool, done) {
  const others = shuffle(EU_CC.filter(c => c !== "TR" && !pool.includes(c))).slice(0, 2);
  T = {
    cat,
    name,
    done,
    group: ["TR", pool[0], pool[1], pool[2]].map(cc => ({ cc, w: 0, l: 0, pf: 0, pa: 0 })),
    other: [pool[3], ...others].slice(0, 2),
    games: [pool[0], pool[1], pool[2]].map(cc => ({ stage: "g", cc, res: null })),
    at: 0,
    prep: false,
    stats: { g: 0, pts: 0, ast: 0, reb: 0, rs: 0 },
    tab: "hub"
  };
  hub();
}
const flag = cc => esc(late.LEAGUES[cc] ? late.LEAGUES[cc].n : cc);
const label = g =>
  g.stage === "g"
    ? `${T.name} · ${$t("extras.51")}`
    : g.stage === "sf"
      ? `${T.name} · ${$t("extras.52")}`
      : g.stage === "f"
        ? `${T.name} · ${$t("extras.53")}`
        : $t("extras.54", { name: T.name });
function tableHTML() {
  const st = T.group.slice().sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa));
  return `<div class="tbl"><table><tr><th>#</th><th></th><th>G</th><th>M</th><th>±</th></tr>${st
    .map(
      (r, i) =>
        `<tr style="${r.cc === "TR" ? "font-weight:800;color:var(--gold)" : ""}${i === 1 ? ";border-bottom:2px solid var(--gold)" : ""}"><td>${i + 1}</td><td>${flag(r.cc)}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf - r.pa}</td></tr>`
    )
    .join("")}</table></div><p class="small muted">${$t("nt.top2")}</p>`;
}
function fixturesHTML() {
  return T.games
    .map(
      g =>
        `<div class="row between nowrap small" style="padding:4px 0"><span>${label(g)} · ${flag(g.cc)}</span><b class="${g.res ? (g.res.win ? "good" : "bad") : ""}">${g.res ? `${g.res.us}–${g.res.them}` : "–"}</b></div>`
    )
    .join("");
}
function statsHTML() {
  const s = T.stats,
    g = Math.max(1, s.g);
  return `<div class="kv"><span>${$t("nt.games")}</span><b>${s.g}</b><span>${$t("arcade.6")}</span><b>${(s.pts / g).toFixed(1)}</b><span>${$t("extras.31")}</span><b>${(s.ast / g).toFixed(1)}</b><span>${$t("data.63")}</span><b>${(s.reb / g).toFixed(1)}</b><span>${$t("nt.avg")}</span><b>${s.g ? (s.rs / g).toFixed(2) : "-"}</b></div>`;
}
function hub() {
  const g = T.games[T.at];
  if (!g) return finish();
  // denge simülasyonu: maçlar otomatik
  if (window.__SIM) return late.natMatch(T.cat, nat(g.cc), label(g), win => result(g, win), true);
  const tabs = [
    ["hub", $t("nt.next")],
    ["tablo", $t("lc.table")],
    ["fikstur", $t("lc.fixtures")],
    ["istat", $t("nt.myStats")]
  ];
  const body =
    T.tab === "tablo"
      ? tableHTML()
      : T.tab === "fikstur"
        ? fixturesHTML()
        : T.tab === "istat"
          ? statsHTML()
          : `<div class="card"><div class="eyebrow">${label(g)}</div><h3>${$t("nt.vs", { v: flag(g.cc) })}</h3><p class="small muted">${$t("nt.energy", { v: S.energy })}</p></div>
     ${
       T.prep
         ? `<p class="small good">${$t("nt.prepped")}</p>`
         : `<div class="eyebrow">${$t("nt.prep")}</div><div class="grid3"><button class="btn sm" data-np="rest">${$t("nt.rest")}</button><button class="btn sm" data-np="shoot">${$t("nt.shoot", { k: statName("sut") })}</button><button class="btn sm" data-np="team">${$t("nt.team")}</button></div>`
     }
     <div class="grid2"><button class="btn pri" id="nt-play">${$t("quick.self")}</button><button class="btn" id="nt-sim">${$t("quick.sim")}</button></div>`;
  sheet(
    T.name,
    `${$t("nt.day", { n: T.at + 1 })}`,
    `${tabsHTML(tabs, T.tab, "nt")}<div style="display:flex;flex-direction:column;gap:10px">${body}</div>`,
    { noClose: true }
  );
  $$("[data-nt]").forEach(b => (b.onclick = () => ((T.tab = b.dataset.nt), hub())));
  $$("[data-np]").forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.np;
        if (k === "rest") S.energy += 20;
        if (k === "shoot") gainStat("sut", 0.3 * levelMul("sut"));
        if (k === "team") S.moral += 5;
        T.prep = true;
        norm();
        save();
        hub();
      })
  );
  const play = auto => {
    closeSheet();
    late.natMatch(T.cat, nat(g.cc), label(g), win => result(g, win), auto);
  };
  const p = $("#nt-play");
  if (p) p.onclick = () => play(false);
  const sm = $("#nt-sim");
  if (sm) sm.onclick = () => play(true);
}
function simPair(a, b) {
  const A = nat(a.cc).str,
    B = nat(b.cc).str,
    sa = Math.round(78 * A * rnd(0.88, 1.1)),
    sb = Math.round(78 * B * rnd(0.88, 1.1)) + 0;
  const ws = sa === sb ? Math.random() < 0.5 : sa > sb;
  a.pf += sa;
  a.pa += sb;
  b.pf += sb;
  b.pa += sa;
  (ws ? a : b).w++;
  (ws ? b : a).l++;
}
function result(g, win) {
  const M = late.M;
  g.res = { win, us: M.us, them: M.them };
  T.stats.g++;
  T.stats.pts += M.pts;
  T.stats.ast += M.ast;
  T.stats.reb += M.reb;
  T.stats.rs += M.rating || 6;
  T.prep = false;
  T.tab = "hub";
  if (g.stage === "g") {
    const me = T.group.find(r => r.cc === "TR"),
      ro = T.group.find(r => r.cc === g.cc);
    me.pf += M.us;
    me.pa += M.them;
    ro.pf += M.them;
    ro.pa += M.us;
    (win ? me : ro).w++;
    (win ? ro : me).l++;
    const rest = T.group.filter(r => r !== me && r !== ro);
    simPair(rest[0], rest[1]);
    T.at++;
    if (T.at === 3) {
      const st = T.group.slice().sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa)),
        rank = st.findIndex(r => r.cc === "TR") + 1;
      if (rank > 2) {
        news($t("extras.81", { name: T.name }));
        return finish();
      }
      // yarı final: grup 1.'si → diğer grubun 2.'si; 2.'si → diğer grubun 1.'si
      T.games.push({ stage: "sf", cc: rank === 1 ? T.other[1] : T.other[0], res: null });
      T.otherFinal = rank === 1 ? [st[1].cc, T.other[0]] : [st[0].cc, T.other[1]];
    }
  } else if (g.stage === "sf") {
    const [a, b] = T.otherFinal,
      wa = Math.random() < nat(a).str / (nat(a).str + nat(b).str);
    if (win) T.games.push({ stage: "f", cc: wa ? a : b, res: null });
    else T.games.push({ stage: "b", cc: wa ? b : a, res: null });
    T.at++;
  } else {
    if (g.stage === "f") medal(win ? "nat_gold" : "nat_silver", win ? $t("extras.55") : $t("extras.56"));
    else if (win) medal("nat_bronze", "bronz");
    T.at++;
    return finish();
  }
  save();
  hub();
}
function medal(type, lab) {
  S.career.trophies.push({ type, label: `${S.year} ${T.name} · ${lab}` });
  news($t("extras.80", { v: fullName(), name: T.name, lab }));
  save();
}
function finish() {
  const done = T.done;
  if (window.__SIM) {
    T = null;
    return done();
  }
  const html = `<div class="card"><div class="eyebrow">${$t("nt.myStats")}</div>${statsHTML()}</div>${fixturesHTML()}`;
  const name = T.name;
  T = null;
  sheet(name, $t("nt.over"), `${html}<button class="btn pri" id="nt-done">${$t("ads.25")}</button>`, { noClose: true });
  $("#nt-done").onclick = () => {
    closeSheet();
    done();
  };
}
