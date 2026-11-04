/* ================= MEKÂN EKLENTİLERİ =================
   - Stüdyo: canlı yayın (sohbetten gelen sorulara anında cevap tarzı seç), takım arkadaşıyla ortak video, takipçi rekorları.
   - Akademi: profesyonel olan mezunların kartı; bazı maçlarda karşı takımda ya da senin takımında gerçek oyuncu olarak çıkar.
   - Liman (aile): çocuk büyür (yaşa göre anlar), basketbolcu olmak isterse varis kariyerinde onun adıyla başlarsın;
     evlilik yıldönümü olayı.
   - Kafe: bilgi gecesi (basketbol kuralları yarışması: moral ve takipçi).
   - Sokak sahası: gece sokak ligi (6 mahalle takımı, 10 hafta, puan tablosu, "Sokak Efsanesi" unvanı, yerel rakipler).
   - Borsa: sektör haberleri (fiyatı haber oynatır; oyuncunun performansı değil), temettü, piyasa endeksi, risk profili.
   Hepsi tembel başlar (S alanları ilk kullanımda oluşur). */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, esc, fmt, pick, ri, shuffle } from "./data.js";
import { S, app, closeSheet, eff, news, norm, renderMain, resultView, sheet, tx, useSlot, fullName } from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgShoot } from "./games.js";
import { late } from "./late.js";

const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
const pm = () => PM[S.stage] || 1;
const wk = () => `${S.season}-${S.week}`;
const fxc = (k, n = 1) => late.featCount && late.featCount(k, n);

/* ================= STÜDYO ================= */
const chn = () => (S.channel = S.channel || { xp: 0, posts: 0, wk: "", n: 0, gear: {} });
const rec = () => (chn().rec = chn().rec || { best: 0, live: 0, peak: S.followers, liveWk: "", collabWk: "" });
/** İçerik sonrası rekor takibi (studio.js → content) */
export function studioRecord(add) {
  const r = rec();
  let msg = "";
  if (add > r.best) {
    r.best = add;
    msg = $t("vn.recPost");
  }
  if (S.followers > (r.peak || 0)) r.peak = S.followers;
  return msg;
}
const LIVEQ = ["coach", "rival", "routine", "rumor", "shoes", "fans"];
const STYLES = { warm: [1, 2, 0], funny: [1.4, 0, 0], bold: [1.8, -1, -2] }; // [takipçi çarpanı, taraftar, koç]
export function studioExtraHTML() {
  const r = rec(),
    liveDone = r.liveWk === wk(),
    colDone = r.collabWk === wk(),
    dis = S.slot <= 0 || S.energy < 6;
  const mate = (S.chem && S.chem.n) || (late.mateNames ? late.mateNames(1)[0] : "");
  return `<div class="card"><div class="eyebrow">${$t("vn.records")}</div><div class="kv"><span>${$t("vn.recBest")}</span><b>+${late.kfmt ? late.kfmt(r.best) : r.best}</b><span>${$t("vn.recLive")}</span><b>${late.kfmt ? late.kfmt(r.live) : r.live}</b><span>${$t("vn.recPeak")}</span><b>${late.kfmt ? late.kfmt(r.peak) : r.peak}</b></div></div>
   <div class="act"><div><h3>${$t("vn.live")}</h3><p>${$t("vn.liveD")}</p></div><button class="btn team sm" id="vn-live" ${liveDone || dis ? "disabled" : ""}>${liveDone ? $t("st.done") : $t("vn.liveBtn")}</button></div>
   <div class="act"><div><h3>${$t("vn.collab", { n: esc(mate) })}</h3><p>${$t("vn.collabD")}</p></div><button class="btn team sm" id="vn-col" ${colDone || dis ? "disabled" : ""}>${colDone ? $t("st.done") : $t("vn.collabBtn")}</button></div>`;
}
export function bindStudioExtra(re) {
  const l = $("#vn-live");
  if (l) l.onclick = () => liveStream(re);
  const c = $("#vn-col");
  if (c)
    c.onclick = () => {
      const r = rec();
      r.collabWk = wk();
      useSlot();
      S.energy -= 5;
      const add = Math.round(S.followers * 0.03 + 40);
      S.followers += add;
      S.rel.takim += 2;
      if (late.chemAdd) late.chemAdd(5);
      chn().xp += 10;
      studioRecord(add);
      norm();
      save();
      resultView($t("vn.collabH"), $t("vn.collabRes", { v: late.kfmt ? late.kfmt(add) : add }), [
        [$t("sd.fxFollow", { v: late.kfmt ? late.kfmt(add) : add }), "p"],
        [$t("vn.fxChem"), "p"]
      ]);
    };
}
function liveStream(re) {
  const r = rec();
  r.liveWk = wk();
  useSlot();
  S.energy -= 6;
  save();
  const qs = shuffle(LIVEQ.slice()).slice(0, 3);
  let i = 0,
    mul = 0,
    fans = 0,
    coach = 0,
    viewers = Math.round(S.followers * 0.04 + 30);
  const step = () => {
    if (i >= qs.length) return finish();
    const q = qs[i];
    sheet(
      $t("vn.live"),
      $t("vn.liveSub", { v: late.kfmt ? late.kfmt(viewers) : viewers }),
      `<div class="say"><b>${$t("vn.chat")}</b> ${$t(`vn.q.${q}`)}</div><div class="choices">${Object.keys(STYLES)
        .map(k => `<button class="choice" data-ls="${k}"><span class="ct">${$t(`vn.a.${q}.${k}`)}</span><span class="cd">${$t(`vn.s.${k}`)}</span></button>`)
        .join("")}</div>`,
      { noClose: true }
    );
    $$("[data-ls]").forEach(
      b =>
        (b.onclick = () => {
          const [m, f, c] = STYLES[b.dataset.ls];
          const hit = b.dataset.ls !== "bold" || Math.random() < 0.7;
          mul += hit ? m : 0.3;
          fans += f;
          coach += c;
          viewers = Math.round(viewers * (hit ? 1 + m / 6 : 0.85));
          i++;
          step();
        })
    );
  };
  const finish = () => {
    const add = Math.round(viewers * 0.25 * (mul / 3 + 0.4));
    S.followers += add;
    S.rel.taraf += fans;
    S.rel.koc += coach;
    if (viewers > r.live) r.live = viewers;
    studioRecord(add);
    chn().xp += 14;
    fxc("live");
    norm();
    save();
    resultView($t("vn.liveEnd"), $t("vn.liveRes", { v: late.kfmt ? late.kfmt(viewers) : viewers, a: late.kfmt ? late.kfmt(add) : add }), [
      [$t("sd.fxFollow", { v: late.kfmt ? late.kfmt(add) : add }), "p"],
      ...(fans ? [[$t("vn.fxFans", { v: fans }), fans > 0 ? "p" : "n"]] : []),
      ...(coach ? [[$t("vn.fxCoach", { v: coach }), "n"]] : [])
    ]);
  };
  step();
}

/* ================= AKADEMİ MEZUNLARI ================= */
const proGrads = () => (S && S.acad && S.acad.grads ? S.acad.grads.filter(g => g.pro) : []);
Bus.on("season:end", () => {
  for (const g of proGrads()) g.ovr = clamp((g.ovr || ri(44, 52)) + ri(1, 4), 40, 90);
});
/** Maç başında: bir mezun karşında ya da yanında (src/matchday.js) */
export function gradMeet(foes, mates) {
  const gs = proGrads();
  if (!gs.length || !M_() || Math.random() > 0.18) return;
  const g = pick(gs),
    vs = Math.random() < 0.6 || !mates.length;
  g.ovr = g.ovr || ri(44, 52);
  if (vs) {
    foes[1] = g.n;
    g.club = M_().opp.name;
  } else {
    mates[1] = g.n;
    g.club = S.team.name;
  }
  fxc("gradMeet");
  M_().grad = { n: g.n, vs };
  late.addFeed && late.addFeed(`<b class="gold">${$t(vs ? "vn.gradVs" : "vn.gradWith", { n: esc(g.n) })}</b>`);
}
const M_ = () => late.M;
export function gradsHTML() {
  const gs = S && S.acad ? S.acad.grads : [];
  if (!gs.length) return "";
  return `<div class="eyebrow">${$t("vn.grads")}</div>${gs
    .slice(-8)
    .reverse()
    .map(
      g =>
        `<div class="act"><div><h3>${esc(g.n)} · ${g.pos}</h3><p>${g.pro ? $t("vn.gradPro", { o: g.ovr || "–", c: esc(g.club || $t("vn.gradFree")) }) : $t("vn.gradAm")} · ${esc(g.s || "")}</p></div></div>`
    )
    .join("")}`;
}

/* ================= AİLE: ÇOCUK VE YILDÖNÜMÜ ================= */
const kidAge = () => (S.kid ? S.season - S.kid.born : -1);
Bus.on("week:start", () => {
  if (!S || !S.partner) return;
  if ((S.pstage || 0) >= 3 && !S.wed) S.wed = { s: S.season, w: S.week };
  if ((S.pstage || 0) >= 4 && !S.kid)
    S.kid = { n: pick((late.NAME_FIRST || ["Can"]).filter(n => n !== S.first)), born: S.season, seen: {} };
});
const KID_AT = [1, 3, 6, 10, 14];
function familySheet() {
  if (!S || !S.partner) return false;
  // yıldönümü
  if (S.wed && S.season > S.wed.s && S.week === S.wed.w && S.annWk !== wk()) {
    S.annWk = wk();
    if (window.__SIM) return false;
    const yrs = S.season - S.wed.s,
      gifts = [
        ["dinner", Math.round(20 * pm()), 8, 3],
        ["trip", Math.round(80 * pm()), 15, 6],
        ["home", 0, 4, 1]
      ];
    sheet(
      $t("vn.ann"),
      $t("vn.annSub", { n: yrs, p: esc(S.partner) }),
      `<p>${$t("vn.annTxt", { p: esc(S.partner), n: yrs })}</p><div class="choices">${gifts
        .map(
          ([k, c, r, m]) =>
            `<button class="choice" data-an="${k}" ${S.money < c ? "disabled" : ""}><span class="ct">${$t(`vn.an.${k}`)}</span><span class="cd">${c ? fmt(c) + " · " : ""}${$t("vn.annFx", { r, m })}</span></button>`
        )
        .join("")}</div>`,
      { noClose: true }
    );
    $$("[data-an]").forEach(
      b =>
        (b.onclick = () => {
          const [, c, r, m] = gifts.find(g => g[0] === b.dataset.an);
          if (c) tx($t("vn.annTx"), -c);
          S.rel.partner += r;
          S.moral += m;
          norm();
          save();
          closeSheet();
        })
    );
    return true;
  }
  // çocuk büyüyor
  const a = kidAge();
  if (!S.kid || !KID_AT.includes(a) || S.kid.seen[a] || S.week < 3) return false;
  S.kid.seen[a] = 1;
  S.rel.aile += 3;
  S.moral += 3;
  if (window.__SIM) return false;
  const n = esc(S.kid.n);
  const body =
    a === 14
      ? `<p>${$t("vn.kid14", { n })}</p><div class="choices"><button class="choice" data-kd="1"><span class="ct">${$t("vn.kidYes")}</span><span class="cd">${$t("vn.kidYesD")}</span></button><button class="choice" data-kd="0"><span class="ct">${$t("vn.kidNo")}</span><span class="cd">${$t("vn.kidNoD")}</span></button></div>`
      : `<p>${$t(`vn.kid${a}`, { n })}</p><button class="btn pri" id="kd-ok">${$t("vn.kidOk")}</button>`;
  sheet($t("vn.kidH", { n }), $t("vn.kidAge", { a }), body, { noClose: true });
  const ok = $("#kd-ok");
  if (ok) ok.onclick = () => closeSheet();
  $$("[data-kd]").forEach(
    b =>
      (b.onclick = () => {
        S.kid.baller = b.dataset.kd === "1";
        if (S.kid.baller) S.rel.aile += 4;
        save();
        closeSheet();
      })
  );
  return true;
}
Bus.offer("week:sheet", familySheet, 40);
/** Varis kariyeri: çocuğun adı ve isteği (src/legacy.js → startHeir) */
export const heirKid = () => (S && S.kid ? { n: S.kid.n, baller: !!S.kid.baller } : null);
export function kidHTML() {
  if (!S || !S.kid) return "";
  return `<div class="card"><div class="row between"><div class="eyebrow">${$t("vn.kidCard")}</div><b>${esc(S.kid.n)} · ${$t("vn.kidAge", { a: Math.max(0, kidAge()) })}</b></div><p class="small muted">${S.kid.baller ? $t("vn.kidBaller") : $t("vn.kidNote")}</p></div>`;
}

/* ================= KAFE: BİLGİ GECESİ ================= */
// basketbol kuralları (FIBA ağırlıklı, değişmez bilgiler): [soru anahtarı, doğru şık, yanlışlar]
const QUIZ = [
  ["q1", "5", ["4", "6"]],
  ["q2", "24", ["30", "20"]],
  ["q3", "10", ["12", "8"]],
  ["q4", "12", ["10", "15"]],
  ["q5", "5", ["6", "4"]],
  ["q6", "6", ["5", "7"]],
  ["q7", "3,05 m", ["2,90 m", "3,20 m"]],
  ["q8", "8", ["10", "5"]],
  ["q9", "3", ["5", "2"]],
  ["q10", "14", ["24", "10"]],
  ["q11", "1", ["2", "3"]],
  ["q12", "3", ["2", "1"]],
  ["q13", "5", ["3", "10"]],
  ["q14", "6,75 m", ["6,25 m", "7,24 m"]],
  ["q15", "2", ["3", "1"]],
  ["q16", "1", ["2", "0"]]
];
export function quizHTML() {
  const done = S.quizWk === wk();
  return `<div class="act"><div><h3>${$t("vn.quiz")}</h3><p>${$t("vn.quizD")}</p></div><button class="btn team sm" id="vn-quiz" ${done || S.slot <= 0 || S.money < 4 ? "disabled" : ""}>${done ? $t("st.done") : fmt(4)}</button></div>`;
}
export function bindQuiz() {
  const b = $("#vn-quiz");
  if (b) b.onclick = quizNight;
}
function quizNight() {
  S.quizWk = wk();
  useSlot();
  tx($t("vn.quiz"), -4);
  save();
  const qs = shuffle(QUIZ.slice()).slice(0, 5);
  let i = 0,
    right = 0;
  const step = () => {
    if (i >= qs.length) return end();
    const [k, ok, wr] = qs[i];
    const ans = shuffle([ok, ...wr]);
    sheet(
      $t("vn.quiz"),
      $t("vn.quizN", { i: i + 1, n: qs.length, r: right }),
      `<h3>${$t(`vn.${k}`)}</h3><div class="choices">${ans.map(a => `<button class="choice" data-qa="${esc(a)}"><span class="ct">${esc(a)}</span></button>`).join("")}</div>`,
      { noClose: true }
    );
    $$("[data-qa]").forEach(
      b =>
        (b.onclick = () => {
          if (b.dataset.qa === ok) right++;
          i++;
          step();
        })
    );
  };
  const end = () => {
    const win = right >= 4;
    S.moral += win ? 6 : right >= 3 ? 3 : 1;
    if (win) {
      S.followers = Math.round(S.followers * 1.03) + 15;
      S.rel.ark += 3;
      fxc("quizWin");
    }
    norm();
    save();
    resultView($t("vn.quiz"), win ? $t("vn.quizWin", { r: right }) : $t("vn.quizLose", { r: right }), [
      [$t("vn.fxMoral", { v: win ? 6 : right >= 3 ? 3 : 1 }), "p"],
      ...(win ? [[$t("vn.fxFol"), "p"]] : [])
    ]);
  };
  step();
}

/* ================= GECE SOKAK LİGİ ================= */
const SL_TEAMS = ["liman", "carsi", "kopru", "yokus", "kartal"];
const ROUNDS = 10;
const sl = () => {
  if (!S.sl || S.sl.season !== S.season) {
    const prev = S.sl || {};
    S.sl = {
      season: S.season,
      round: 0,
      wk: "",
      legend: prev.legend || 0,
      titles: prev.titles || 0,
      t: Object.fromEntries([["me", { w: 0, l: 0 }], ...SL_TEAMS.map(k => [k, { w: 0, l: 0, s: +(0.35 + Math.random() * 0.35).toFixed(2) }])]),
      boss: pick(late.NAME_FIRST || ["Kemal"])
    };
  }
  return S.sl;
};
const table = () =>
  Object.entries(sl().t)
    .map(([k, v]) => ({ k, ...v }))
    .sort((a, b) => b.w - a.w || a.l - b.l);
export function nightLeagueHTML() {
  if (S.age < 15) return "";
  const L = sl(),
    over = L.round >= ROUNDS,
    done = L.wk === wk();
  const rival = SL_TEAMS.map(k => ({ k, ...L.t[k] })).sort((a, b) => b.s - a.s)[0];
  return `<div class="card fm"><div class="row between"><div class="eyebrow">${$t("vn.sl")}</div><span class="pill">${$t("vn.slRound", { r: Math.min(L.round, ROUNDS), n: ROUNDS })}</span></div>
   <div class="tbl"><table><tr><th>#</th><th>${$t("vn.slTeam")}</th><th>G</th><th>M</th></tr>${table()
     .map((r, i) => `<tr class="${r.k === "me" ? "me" : ""}"><td>${i + 1}</td><td>${r.k === "me" ? $t("vn.slMe") : $t(`vn.sl.${r.k}`)}</td><td>${r.w}</td><td>${r.l}</td></tr>`)
     .join("")}</table></div>
   <p class="small muted">${$t("vn.slRival", { t: $t(`vn.sl.${rival.k}`), b: esc(L.boss) })}${L.legend ? ` · <b class="gold">${$t("vn.slLegend")}</b>` : ""}</p>
   <button class="btn team" id="vn-sl" ${over || done || S.slot <= 0 || S.energy < 10 || S.injury ? "disabled" : ""}>${over ? $t("vn.slOver") : done ? $t("st.done") : $t("vn.slPlay")}</button></div>`;
}
export function bindNightLeague() {
  const b = $("#vn-sl");
  if (b) b.onclick = nightGame;
}
async function nightGame() {
  const L = sl();
  if (L.wk === wk() || L.round >= ROUNDS) return;
  L.wk = wk();
  const opp = SL_TEAMS[L.round % SL_TEAMS.length];
  useSlot();
  S.energy -= 10;
  save();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("vn.sl")}</div><h2>${$t("vn.slVs", { t: $t(`vn.sl.${opp}`) })}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgShoot($("#stg"), { eff: clamp(eff("sut") + 6 - L.t[opp].s * 10, 5, 100), shots: 3, title: $t("vn.slShoot"), dist: "mid", def: true });
  const win = r.made >= 2 || (r.made === 1 && Math.random() < 0.3);
  L.t.me[win ? "w" : "l"]++;
  L.t[opp][win ? "l" : "w"]++;
  // diğer maçlar
  const rest = shuffle(SL_TEAMS.filter(k => k !== opp));
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const [a, b] = [rest[i], rest[i + 1]],
      aw = Math.random() < 0.5 + (L.t[a].s - L.t[b].s);
    L.t[a][aw ? "w" : "l"]++;
    L.t[b][aw ? "l" : "w"]++;
  }
  L.round++;
  S.moral += win ? 4 : 1;
  S.rel.taraf += win ? 1 : 0;
  let extra = "";
  if (L.round >= ROUNDS && table()[0].k === "me") {
    L.legend = 1;
    L.titles++;
    S.followers = Math.round(S.followers * 1.05) + 30;
    news($t("vn.slChampNews", { v: fullName() }));
    extra = ` <b class="gold">${$t("vn.slChamp")}</b>`;
  }
  norm();
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML = `<div class="card"><h2 class="${win ? "good" : ""}">${win ? $t("st.won") : $t("st.lost")}</h2><p>${$t("vn.slRes", { m: r.made })}${extra}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}

/* ================= BORSA: HABER, TEMETTÜ, ENDEKS ================= */
// temettü verimi (4 haftada bir, tutulan değer üzerinden) ve risk profili
const DIV = { tek: 0, enr: 0.012, spr: 0.006, gda: 0.015 };
const RISK = { tek: "hi", enr: "mid", spr: "mid", gda: "lo" };
const NEWS = [
  ["tek", 1, "chip"],
  ["tek", -1, "hack"],
  ["enr", 1, "oil"],
  ["enr", -1, "green"],
  ["spr", 1, "olymp"],
  ["spr", -1, "recall"],
  ["gda", 1, "export"],
  ["gda", -1, "drought"],
  ["all", 1, "rate"],
  ["all", -1, "crisis"]
];
Bus.on("week:start", () => {
  if (!S || !S.mkt2) return;
  const m = S.mkt2;
  m.news = m.news || [];
  // sektör haberi: fiyata haber şoku (oyuncunun performansından bağımsız)
  if (Math.random() < 0.3) {
    const [sec, dir, id] = pick(NEWS),
      size = (sec === "all" ? 0.03 : 0.05) + Math.random() * 0.05;
    for (const s of Object.keys(m.p))
      if (sec === "all" || sec === s) {
        m.p[s] = Math.max(2, Math.round(m.p[s] * (1 + dir * size) * 100) / 100);
        m.h[s][m.h[s].length - 1] = m.p[s];
        if (sec !== "all") m.tr[s] = (m.tr[s] || 0) + dir * 0.008; // haber eğilimi de etkiler
      }
    m.news = [{ id, sec, dir, w: wk(), pct: Math.round(size * 100) }, ...m.news].slice(0, 5);
  }
  // temettü
  m.wk = (m.wk || 0) + 1;
  if (m.wk % 4 === 0) {
    let d = 0;
    for (const [s, y] of Object.entries(DIV)) d += (m.own[s] || 0) * m.p[s] * y;
    d = Math.round(d);
    if (d > 0) {
      tx($t("vn.divTx"), d);
      fxc("divs");
    }
  }
  // endeks (başlangıç = 1000)
  const avg = Object.keys(m.p).reduce((a, s) => a + m.p[s] / (m.base0 ? m.base0[s] : m.p[s]), 0) / Object.keys(m.p).length;
  m.base0 = m.base0 || { ...m.p };
  m.idx = [...(m.idx || []), Math.round(avg * 1000)].slice(-12);
});
export function borsaExtraHTML() {
  const m = S.mkt2;
  if (!m) return "";
  const idx = m.idx || [1000],
    last = idx[idx.length - 1],
    ch = idx.length > 1 ? ((last - idx[idx.length - 2]) / idx[idx.length - 2]) * 100 : 0;
  return `<div class="card fm"><div class="row between"><div class="eyebrow">${$t("vn.idx")}</div><b class="${ch >= 0 ? "good" : "bad"}">${last} (${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%)</b></div>
   <div class="eyebrow">${$t("vn.mnews")}</div>${(m.news || []).length ? m.news.map(n => `<div class="small"><span class="${n.dir > 0 ? "good" : "bad"}">${n.dir > 0 ? "▲" : "▼"} ${n.pct}%</span> ${$t(`vn.n.${n.id}`)} <span class="muted">· ${n.sec === "all" ? $t("vn.allMkt") : $t(`bs.s.${n.sec}`)}</span></div>`).join("") : `<div class="small muted">${$t("vn.noNews")}</div>`}
   <p class="small muted">${$t("vn.divNote")}</p></div>`;
}
/** Hisse satırına risk ve temettü bilgisi */
export const stockInfo = id => ` · ${$t(`vn.risk.${RISK[id] || "mid"}`)}${DIV[id] ? ` · ${$t("vn.div", { v: (DIV[id] * 100).toFixed(1) })}` : ""}`;
