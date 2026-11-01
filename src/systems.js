import { t as $t, LANG, LANGS, setLang, t } from "./i18n/index.js";
import { AWARD_T, dominanceOf, injuryChance, seasonAwardKinds } from "./logic/rules.js";
import { late } from "./late.js";
import {
  $,
  $$,
  BAL,
  Bus,
  ORDER,
  SC,
  cOf,
  clamp,
  esc,
  fmt,
  isPro,
  leagueName,
  pick,
  ri,
  rnd,
  shuffle,
  tdOf,
  toast
} from "./data.js";
import { icon } from "./art.js";
import { mgShoot } from "./games.js";
import {
  ROLE_N,
  S,
  TD,
  actHTML,
  app,
  bindActs,
  closeSheet,
  crestSVG,
  eff,
  fixture,
  fullName,
  lgName,
  news,
  norm,
  ovr,
  phaseName,
  renderMain,
  resultView,
  seasonLabel,
  sheet,
  tabsHTML,
  teamByKey,
  tx,
  useSlot
} from "./core.js";
import { exportSheet, isInstalled, renderSlots, save } from "./save.js";
import { arenaFor } from "./places.js";
import { M, afterMatch, potential, setM } from "./match.js";
/* ================= AYARLAR ================= */
// Ayarlar kariyer yuvalarından bağımsız tutulur.
export const SETTINGS = (() => {
  try {
    return Object.assign(
      {
        sound: true,
        vol: 0.7,
        haptic: true,
        crowd: true,
        backupNag: true,
        music: true,
        lowfx: false,
        notify: true,
        errorReports: true
      },
      JSON.parse(localStorage.getItem("pota-settings") || "{}")
    );
  } catch (e) {
    return { sound: true, vol: 0.7, haptic: true, crowd: true };
  }
})();
export const saveSettings = () => {
  try {
    localStorage.setItem("pota-settings", JSON.stringify(SETTINGS));
  } catch (e) {}
};
export function settingsSheet() {
  const tog = (k, label, desc) =>
    `<div class="act"><div><h3>${label}</h3><p>${desc}</p></div><button class="btn ${SETTINGS[k] ? "team" : "ghost"} sm" data-tg="${k}">${SETTINGS[k] ? t("btn.on") : t("btn.off")}</button></div>`;
  sheet(
    t("settings.title"),
    t("settings.sub"),
    `<div class="act"><div><h3>${t("settings.lang")}</h3><p>${t("settings.langDesc")}</p></div><div class="opts" style="grid-column:1/-1">${LANGS.map(([k, n]) => `<button class="opt ${LANG === k ? "on" : ""}" data-lang="${k}">${n}</button>`).join("")}</div></div>
   ${["sound", "music", "crowd", "haptic", "lowfx", "backupNag", "notify", "errorReports"].map(k => tog(k, t("settings." + k), t("settings." + k + "Desc"))).join("")}
   ${isInstalled() ? "" : `<div class="act"><div><h3>${t("settings.install")}</h3><p>${t("settings.installDesc")}</p></div><button class="btn team sm" id="st-inst">${t("btn.how")}</button></div>`}
   <div class="act"><div><h3>${t("settings.volume")}</h3><p>${t("settings.volumeDesc")}</p></div><div class="opts" style="grid-column:1/-1">${[
     [0.35, t("settings.volLow")],
     [0.7, t("settings.volMid")],
     [1, t("settings.volHigh")]
   ]
     .map(([v, n]) => `<button class="opt ${SETTINGS.vol === v ? "on" : ""}" data-vol="${v}">${n}</button>`)
     .join("")}</div></div>
   ${late.adsSettingsHTML()}
   ${late.cloudSettingsHTML()}
   ${late.testSettingsHTML()}
   <div class="grid2"><button class="btn" id="st-exp">${t("settings.backup")}</button><button class="btn" id="st-help">${t("btn.guide")}</button></div>
   <button class="btn ghost" id="st-tour">${t("settings.tour")}</button>`
  );
  $$("[data-tg]").forEach(
    b =>
      (b.onclick = () => {
        SETTINGS[b.dataset.tg] = !SETTINGS[b.dataset.tg];
        saveSettings();
        if (!SETTINGS.crowd) late.crowd(false);
        late.applyLowFx();
        late.musicFor(late.MUS.want || "menu");
        settingsSheet();
      })
  );
  $$("[data-vol]").forEach(
    b =>
      (b.onclick = () => {
        SETTINGS.vol = +b.dataset.vol;
        saveSettings();
        late.sfx("click");
        late.musicVolume();
        settingsSheet();
      })
  );
  // Dil değişince sayfa yeniden yüklenir (modül düzeyindeki metinler yükleme anında oluşur); kariyer kaldığı yerden açılır
  $$("[data-lang]").forEach(
    b =>
      (b.onclick = () => {
        if (b.dataset.lang === LANG) return;
        setLang(b.dataset.lang);
        if (S && S.saveSlot) {
          late.save();
          try {
            sessionStorage.setItem("pota-resume", String(S.saveSlot));
          } catch (e) {
            /* oturum deposu kapalı */
          }
        }
        location.reload();
      })
  );
  late.bindAdsSettings(settingsSheet);
  late.bindTestSettings(settingsSheet);
  late.bindCloudSettings(settingsSheet);
  $("#st-exp").onclick = exportSheet;
  const ib = $("#st-inst");
  if (ib) ib.onclick = installSheet;
  $("#st-help").onclick = () => guideSheet();
  $("#st-tour").onclick = () => {
    S.tut = 0;
    closeSheet();
    renderMain();
    startTour();
  };
}

/* ================= İSTATİSTİK GEÇMİŞİ ================= */
export const blankSS = () => ({ g: 0, min: 0, pts: 0, ast: 0, reb: 0, blk: 0, stl: 0, rs: 0, dnp: 0 });
export const rated = () => S.results.filter(r => r.rating != null);
export const seasonAvg = () => {
  const r = rated();
  return r.length ? r.reduce((a, x) => a + x.rating, 0) / r.length : 6;
};
export function recordGame() {
  S.ss = S.ss || blankSS();
  const s = S.ss,
    mins = Math.round((M.mins || 0) / 60);
  Object.assign(s, {
    g: s.g + 1,
    min: s.min + mins,
    pts: s.pts + M.pts,
    ast: s.ast + M.ast,
    reb: s.reb + M.reb,
    blk: s.blk + M.blk,
    stl: s.stl + M.stl,
    rs: s.rs + M.rating
  });
  const h = (S.career.high = S.career.high || { pts: 0, ast: 0, reb: 0 });
  for (const k of ["pts", "ast", "reb"])
    if (M[k] > h[k]) {
      h[k] = M[k];
      h[k + $t("systems.1")] = `${M.opp.name} · ${seasonLabel()}`;
    }
  S.career.min = (S.career.min || 0) + mins;
  S.career.stl = (S.career.stl || 0) + M.stl;
}
export const per = (v, g) => (g ? (v / g).toFixed(1) : "–");
export function statsTab(c) {
  const s = S.ss || blankSS(),
    k = S.career,
    h = k.high || {};
  const rows = [
    ...S.hist.map(x => ({ ...x, live: false })),
    { label: seasonLabel(), team: S.team.name, league: lgName(), ...(S.ss || blankSS()), live: true }
  ];
  c.innerHTML = `<div class="card"><div class="eyebrow">${$t("systems.3")}</div><div class="box"><div><b>${per(s.pts, s.g)}</b><span class="eyebrow">${$t("arcade.6")}</span></div><div><b>${per(s.ast, s.g)}</b><span class="eyebrow">${$t("extras.31")}</span></div><div><b>${per(s.reb, s.g)}</b><span class="eyebrow">${$t("data.63")}</span></div><div><b>${per(s.min, s.g)}</b><span class="eyebrow">${$t("systems.4")}</span></div></div><div class="small muted">${$t(
    "systems.5",
    {
      g: s.g
    }
  )}${
    s.dnp
      ? ` ${$t("systems.2", {
          dnp: s.dnp
        })}`
      : ""
  } ${$t("systems.6", {
    v: s.g ? (s.rs / s.g).toFixed(2) : "–",
    blk: s.blk,
    stl: s.stl
  })}</div></div>
   <div class="card"><div class="eyebrow">${$t("systems.7")}</div><div class="tbl"><table><tr><th>${$t("match.94")}</th><th>${$t("data.36")}</th><th>M</th><th>${$t("systems.8")}</th><th>${$t("systems.9")}</th><th>${$t("systems.10")}</th><th>${$t("systems.11")}</th><th>${$t("extras.30")}</th></tr>${rows.map(r => `<tr class="${r.live ? "me" : ""}"><td>${r.label}</td><td>${esc(r.team)}<div class="small muted">${esc(r.league || "")}</div></td><td>${r.g ?? "–"}</td><td>${per(r.min, r.g)}</td><td>${per(r.pts, r.g)}</td><td>${per(r.ast, r.g)}</td><td>${per(r.reb, r.g)}</td><td>${r.g ? (r.rs / r.g).toFixed(1) : r.avg != null ? r.avg.toFixed(1) : "–"}</td></tr>`).join("")}</table></div></div>
   <div class="card"><div class="eyebrow">${$t("systems.12")}</div><div class="kv"><span>${$t("match.88")}</span><b>${k.games}</b><span>${$t("systems.4")}</span><b>${k.min || 0}</b><span>${$t("arcade.6")}</span><b>${k.pts} (${per(k.pts, k.games)})</b><span>${$t("extras.31")}</span><b>${k.ast} (${per(k.ast, k.games)})</b><span>${$t("data.63")}</span><b>${k.reb || 0} (${per(k.reb || 0, k.games)})</b><span>${$t("systems.13")}</span><b>${k.blk} · ${k.stl || 0}</b><span>${$t("match.32")}</span><b>${k.wins}</b><span>${$t("extras.32")}</span><b>${k.natCaps || 0}</b></div></div>
   <div class="card"><div class="eyebrow">${$t("systems.14")}</div><div class="kv"><span>${$t("arcade.6")}</span><b>${h.pts || 0}</b>${h.ptsVs ? `<span class="small muted" style="grid-column:1/-1;margin-top:-4px">${esc(h.ptsVs)}</span>` : ""}<span>${$t("extras.31")}</span><b>${h.ast || 0}</b><span>${$t("data.63")}</span><b>${h.reb || 0}</b></div></div>`;
  if (S.rival) c.insertAdjacentHTML("beforeend", late.rivalInfo());
}

/* ================= ÖDÜLLER ================= */
// eşikler denge simülasyonuyla ayarlandı (bkz. balance notları)
export { AWARD_T };
// ligdeki üstünlük: genel reyting ile lig seviyesinin farkı; ödüller bu farka da bakar
export function dominance() {
  return dominanceOf(ovr(), tdOf(S.stage, S.team.cc));
}
export function award(type, label) {
  S.career.trophies.push({ type, label: `${seasonLabel()} · ${label}` });
  S.followers *= 1.04;
  return label;
}
export function seasonAwards(avg, champ) {
  const s = S.ss || blankSS(),
    g = Math.max(1, s.g),
    ln = lgName();
  const kinds = seasonAwardKinds({
    games: s.g,
    avg,
    ppg: s.pts / g,
    apg: s.ast / g,
    rpg: s.reb / g,
    dpg: (s.blk + s.stl) / g,
    dominance: dominance(),
    winRate: S.results.length ? S.results.filter(r => r.win).length / S.results.length : 0,
    rookieEligible: isPro(S.stage) && S.stageSeason === 1 && !S.career.roy,
    champ: !!champ,
    role: S.role,
    finalRating: S.results.length ? S.results[S.results.length - 1].rating || 0 : 0
  });
  const label = {
    mvp: [
      "mvp",
      $t("systems.15", {
        ln: ln
      })
    ],
    ppg: ["award", `${ln} sayı kralı (${per(s.pts, g)})`],
    apg: ["award", `${ln} asist kralı (${per(s.ast, g)})`],
    rpg: ["award", `${ln} ribaund kralı (${per(s.reb, g)})`],
    dpoy: [
      "award",
      $t("systems.16", {
        ln: ln
      })
    ],
    roy: [
      "award",
      $t("systems.17", {
        ln: ln
      })
    ],
    fmvp: [
      "mvp",
      $t("systems.18", {
        ln: ln
      })
    ]
  };
  if (kinds.includes("mvp")) S.career.mvps++;
  if (kinds.includes("roy")) S.career.roy = 1;
  return kinds.map(k => award(label[k][0], label[k][1]));
}
// All-Star: sezonun ortasında, not ortalaması yüksekse; üçlük yarışması mini oyunu
export function allStar(done) {
  if (
    !["t1", "euro", "nba"].includes(S.stage) ||
    S.allStar === S.season ||
    S.injury ||
    rated().length < 3 ||
    seasonAvg() < AWARD_T.allstar ||
    dominance() < 3
  ) {
    done();
    return;
  }
  S.allStar = S.season;
  S.career.allStars = (S.career.allStars || 0) + 1;
  award(
    "allstar",
    $t("systems.19", {
      v: lgName()
    })
  );
  save();
  late.sfx("fanfare");
  sheet(
    $t("systems.20"),
    lgName(),
    `<div class="chapter"><div class="hd"><div class="eyebrow" style="color:inherit;opacity:.8">${$t("systems.21")}</div><h2 style="font-size:1.8rem">${esc(fullName())}</h2></div><div class="bd"><p>${$t("systems.22")}</p><div class="grid2"><button class="btn ghost" id="as-no">${$t("systems.23")}</button><button class="btn pri" id="as-go">${$t("systems.24")}</button></div></div></div>`,
    { noClose: true }
  );
  $("#as-no").onclick = () => {
    closeSheet();
    renderMain();
    done();
  };
  $("#as-go").onclick = async () => {
    closeSheet();
    arenaFor(null);
    app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("systems.25")}</div><h2>${$t("systems.26")}</h2></div><div id="stg"></div><div id="res"></div>`;
    const r = await mgShoot($("#stg"), {
      eff: clamp(eff("sut") + 15, 5, 100),
      shots: 7,
      title: $t("systems.133"),
      dist: "three",
      def: false
    });
    const won = r.made >= 4;
    if (won) {
      award(
        "award",
        $t("systems.27", {
          v: lgName()
        })
      );
      S.followers *= 1.08;
      late.sfx("fanfare");
    }
    S.moral += won ? 10 : 3;
    norm();
    save();
    $("#stg").innerHTML = "";
    $("#res").innerHTML = `<div class="card"><div class="eyebrow">${$t("match.56")}</div><h2 class="${won ? "good" : ""}">${$t(
      "systems.31",
      {
        made: r.made
      }
    )}${won ? $t("systems.28") : ""}</h2><p>${won ? $t("systems.29") : $t("systems.30")}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
    $("#bk").onclick = () => {
      renderMain();
      done();
    };
  };
}

/* ================= SAKATLIKLAR ================= */
export const INJ = [
  [$t("systems.32"), 1, 2, 0.5],
  [$t("systems.33"), 2, 3, 0.24],
  [$t("systems.34"), 2, 4, 0.12],
  [$t("systems.35"), 1, 3, 0.08],
  [$t("systems.36"), 6, 9, 0.06]
];
export function injuryRisk() {
  return injuryChance({
    energy: S.energy,
    age: S.age,
    kryo: !!S.items.kryo,
    fizyo: !!S.items.fizyo,
    mul: S.buffs && S.buffs.injWk > 0 ? S.buffs.injMul || 1 : 1
  });
}
export function rollInjury() {
  if (S.injury || Math.random() >= injuryRisk()) return null;
  let r = Math.random(),
    pick2 = INJ[0];
  for (const x of INJ) {
    if (r < x[3]) {
      pick2 = x;
      break;
    }
    r -= x[3];
  }
  const w = ri(pick2[1], pick2[2]);
  S.injury = { n: pick2[0], w, total: w };
  if (pick2[0].startsWith($t("systems.37"))) {
    S.st.hiz -= 2;
    S.st.guc -= 1;
  }
  S.moral -= 8;
  news(
    $t("systems.139", {
      v: fullName(),
      v2: pick2[0],
      w: w
    })
  );
  late.sfx("whistle");
  return S.injury;
}
export function healTick() {
  if (!S.injury) return;
  S.injury.w--;
  if (S.injury.w <= 0) {
    const inj = S.injury;
    news(
      $t("systems.140", {
        v: fullName()
      })
    );
    toast($t("systems.38"));
    S.injury = null;
    Bus.emit("injury:healed", inj);
  }
}
// sakatken maç: oyuncu olmadan simüle edilir, tribünden izlenir
export function simWithoutMe() {
  const fx = fixture(),
    opp = teamByKey(fx.opp),
    k = SC[S.stage];
  let us = Math.round(k * S.team.str * rnd(0.86, 1.08) * (fx.home ? 1.03 : 1) * 0.96),
    them = Math.round(k * opp.str * rnd(0.86, 1.1));
  if (us === them) us += Math.random() < 0.5 ? 2 : -2;
  setM({ opp, home: fx.home, us, them, pts: 0, ast: 0, reb: 0, blk: 0, stl: 0, stops: 0, rating: null, mins: 0, plus: 0 });
  const win = us > them;
  S.results.push({ opp: opp.key, us, them, win, rating: null, pts: 0, dnp: true });
  S.ss = S.ss || blankSS();
  S.ss.dnp++;
  if (S.phase === "regular") updateLeague(win, opp, us, them);
  news(
    $t("systems.141", {
      short: S.team.short,
      us: us,
      them: them,
      short2: opp.short,
      v: fullName()
    })
  );
  S.moral += win ? 2 : -2;
  norm();
  save();
  sheet(
    win ? $t("systems.39") : $t("systems.40"),
    $t("systems.41", {
      v: phaseName()
    }),
    `<div class="row nowrap" style="gap:8px">${crestSVG(S.team, 36)}<span class="big-num">${us}–${them}</span>${crestSVG(opp, 36)}</div><div class="say">${win ? $t("systems.42") : $t("systems.43")}</div><p class="small muted">${$t(
      "systems.44",
      {
        n: esc(S.injury.n),
        w: S.injury.w
      }
    )}</p><button class="btn pri" id="nx">${$t("ads.25")}</button>`,
    { noClose: true }
  );
  $("#nx").onclick = () => afterMatch(win);
}
export function updateLeague(win, opp, us, them) {
  const mr = S.league.find(x => x.key === S.team.key),
    ro = S.league.find(x => x.key === opp.key);
  mr.pf += us;
  mr.pa += them;
  ro.pf += them;
  ro.pa += us;
  if (win) {
    mr.w++;
    ro.l++;
  } else {
    mr.l++;
    ro.w++;
  }
  const others = shuffle(S.league.filter(x => x !== mr && x !== ro));
  for (let i = 0; i + 1 < others.length; i += 2) {
    const a = others[i],
      b = others[i + 1];
    let sa = Math.round(SC[S.stage] * teamByKey(a.key).str * rnd(0.86, 1.1)),
      sb = Math.round(SC[S.stage] * teamByKey(b.key).str * rnd(0.86, 1.1));
    if (sa === sb) sa++;
    a.pf += sa;
    a.pa += sb;
    b.pf += sb;
    b.pa += sa;
    if (sa > sb) {
      a.w++;
      b.l++;
    } else {
      b.w++;
      a.l++;
    }
  }
}
export function physioAct() {
  useSlot();
  const fast = Math.random() < 0.5;
  if (fast && S.injury.w > 1) S.injury.w--;
  S.energy += 10;
  norm();
  save();
  resultView($t("story.13"), fast ? $t("systems.45") : $t("systems.46"), [
    [$t("places.66"), "p"],
    ...(fast ? [[$t("systems.47"), "p"]] : [])
  ]);
}

/* ================= TAKIM KADROSU ================= */
export const POS_L = ["PG", "SG", "SF", "PF", "C"];
export function roster() {
  S.rosters = S.rosters || {};
  const t = S.team,
    key = t.key;
  if (S.rosters[key]) return S.rosters[key];
  const c = cOf(t.city),
    base = TD() + 28 * t.str,
    seen = new Set([S.last]);
  const list = [];
  for (let i = 0; i < 11; i++) {
    let n,
      tries = 0;
    do n = `${pick(c.first)} ${pick(c.last)}`;
    while (seen.has(n) && ++tries < 40);
    seen.add(n);
    list.push({
      n,
      pos: POS_L[i % 5],
      age: S.stage === "lise" ? ri(15, 18) : S.stage === "uni" ? ri(18, 23) : ri(19, 34),
      ovr: clamp(Math.round(base + rnd(-10, 8) - i * 1.2), 20, 97),
      chem: ri(25, 55)
    });
  }
  list.sort((a, b) => b.ovr - a.ovr);
  list.reduce((a, b) => (b.age > a.age ? b : a)).cap = true;
  S.rosters[key] = list;
  return list;
}
export const mateNames = n =>
  roster()
    .slice(0, n)
    .map(p => `${p.n.split(" ")[0][0]}. ${p.n.split(" ").slice(1).join(" ")}`);
export const chemAvg = () => {
  const r = roster();
  return r.reduce((a, p) => a + p.chem, 0) / r.length;
};
export function rosterTab(c) {
  const r = roster(),
    best = r.reduce((a, b) => (b.chem > a.chem ? b : a));
  c.innerHTML =
    late.systemHTML() +
    `<div class="card"><div class="row between"><div><div class="eyebrow">${$t("systems.50", {
      name: esc(S.team.name)
    })}</div><h3>${$t("systems.51")} ${Math.round(chemAvg())}/100</h3></div><span class="pill ${chemAvg() >= 60 ? "w" : ""}">${chemAvg() >= 60 ? $t("systems.48") : $t("systems.49")}</span></div><p class="small muted">${$t("systems.52")} <b>${esc(best.n)}</b>.</p>
   <div class="tbl"><table><tr><th>${$t("extras.10")}</th><th>${$t("systems.53")}</th><th>${$t("story.34")}</th><th>${$t("match.58")}</th><th>${$t("systems.54")}</th></tr><tr class="me"><td>${esc(fullName())}</td><td>${S.pos}</td><td>${S.age}</td><td>${ovr()}</td><td>–</td></tr>${r.map(p => `<tr><td>${esc(p.n)}${p.cap ? ' <span class="pill g">K</span>' : ""}</td><td>${p.pos}</td><td>${p.age}</td><td>${p.ovr}</td><td><div class="bar" style="width:60px"><i style="width:${p.chem}%;background:var(--info)"></i></div></td></tr>`).join("")}</table></div></div>` +
    actHTML({
      id: "yemek",
      ic: icon("plate"),
      t: $t("systems.59"),
      d: $t("systems.134"),
      slot: 1,
      price: Math.round(10 * (1 + ORDER.indexOf(S.stage) * 2)),
      fx: [
        [$t("systems.55"), "p"],
        [$t("places.84"), "p"]
      ],
      btn: $t("systems.135")
    }) +
    actHTML({
      id: "ikili",
      ic: icon("ball"),
      t: $t("systems.62"),
      d: $t("systems.136", {
        n: r[0].n
      }),
      slot: 1,
      fx: [
        [$t("systems.56"), "p"],
        [$t("systems.57"), "p"],
        [$t("systems.58"), "n"]
      ],
      btn: $t("systems.137"),
      disabled: S.energy < 10
    });
  bindActs({
    yemek: () => {
      const p = Math.round(10 * (1 + ORDER.indexOf(S.stage) * 2));
      if (S.money < p) return;
      useSlot();
      tx($t("systems.59"), -p);
      r.forEach(x => (x.chem = Math.min(100, x.chem + 6)));
      S.rel.takim += 3;
      norm();
      save();
      resultView($t("systems.59"), `${r.find(x => x.cap).n} ${$t("systems.60")}`, [[$t("systems.61"), "p"]]);
    },
    ikili: () => {
      useSlot();
      r[0].chem = Math.min(100, r[0].chem + 12);
      S.st.pas += 1;
      S.energy -= 10;
      norm();
      save();
      resultView(
        $t("systems.62"),
        $t("systems.63", {
          n: r[0].n
        }),
        [
          [$t("systems.56"), "p"],
          [$t("systems.57"), "p"]
        ]
      );
    }
  });
}

/* ================= SÖZLEŞME PAZARLIĞI ================= */
export function negotiateOffer(o, done) {
  if (!isPro(o.stage) || o.uni) {
    done(o);
    return;
  }
  const P = potential(seasonAvgOf(), false),
    need = o.stage === "t3" ? 40 : BAL.need[o.stage];
  let interest = clamp(0.55 + (P - need) / 18, 0.25, 0.95),
    asks = 0,
    offer = { ...o };
  const view = msg => {
    const cl = (offer.clauses = offer.clauses || {});
    sheet(
      $t("systems.64"),
      offer.team.name,
      `<div class="row nowrap">${crestSVG(offer.team, 48)}<div><div class="eyebrow">${esc(leagueName(offer.stage, offer.team.cc))}</div><h3>${esc(offer.team.name)}</h3><div class="small muted">${$t(
        "systems.68",
        {
          city: esc(offer.team.city),
          agent: esc(S.npc.agent)
        }
      )}</div></div></div>
      <div class="card"><div class="kv"><span>${$t("places.155")}</span><b class="gold">${fmt(offer.wage)}</b><span>${$t("match.39")}</span><b>${$t(
        "systems.69",
        {
          years: offer.years
        }
      )}</b><span>${$t("places.21")}</span><b>${ROLE_N[offer.role]}</b><span>${$t("systems.70")}</span><b>${fmt(offer.bonus || 0)}</b><span>${$t("systems.71")}</span><b>${interest > 0.75 ? $t("systems.65") : interest > 0.55 ? $t("systems.66") : interest > 0.4 ? $t("match.2") : $t("systems.67")}</b></div></div>
      ${msg ? `<div class="say">${msg}</div>` : ""}
      <div class="eyebrow">${$t("systems.72", {
        v: 3 - asks
      })}</div>
      <div class="grid2"><button class="btn ghost sm" data-ask="wage" ${asks >= 3 ? "disabled" : ""}>${$t("systems.73")}</button><button class="btn ghost sm" data-ask="years" ${asks >= 3 || offer.years >= 4 ? "disabled" : ""}>${$t("systems.74")}</button><button class="btn ghost sm" data-ask="role" ${asks >= 3 || offer.role === "star" ? "disabled" : ""}>${$t("systems.75")}</button><button class="btn ghost sm" data-ask="bonus" ${asks >= 3 || offer.bonus ? "disabled" : ""}>${$t("systems.70")}</button></div>
      <div class="eyebrow">${$t("systems.146")}</div>
      <div class="grid3"><button class="btn ghost sm" data-ask="release" ${asks >= 3 || cl.release ? "disabled" : ""}>${$t("systems.147")}</button>${offer.stage !== "nba" ? `<button class="btn ghost sm" data-ask="nbaout" ${asks >= 3 || cl.nbaout ? "disabled" : ""}>${$t("systems.138")}</button>` : ""}<button class="btn ghost sm" data-ask="perf" ${asks >= 3 || cl.perf ? "disabled" : ""}>${$t("systems.148")}</button></div>
      <p class="small muted">${$t("systems.149")}${Object.keys(cl).length ? ` <b>${$t("systems.145")} ${[cl.release && $t("systems.143"), cl.nbaout && $t("systems.138"), cl.perf && $t("systems.144")].filter(Boolean).join(", ")}</b>` : ""}</p>
      <div class="grid2"><button class="btn ghost" id="ng-back">${$t("systems.76")}</button><button class="btn good" id="ng-ok">${$t("systems.77")}</button></div>`,
      { noClose: true }
    );
    $$("[data-ask]").forEach(
      b =>
        (b.onclick = () => {
          asks++;
          const k = b.dataset.ask,
            ok = Math.random() < interest - (k === "role" ? 0.2 : k === "release" || k === "nbaout" ? 0.1 : 0) - asks * 0.06;
          if (!ok) {
            interest -= 0.12;
            if (interest < 0.25) {
              late.sfx("lose");
              sheet(
                $t("systems.78"),
                offer.team.name,
                `<div class="say">${$t("systems.79", {
                  name: esc(offer.team.name)
                })}</div><button class="btn pri" id="ng-x">${$t("systems.76")}</button>`,
                { noClose: true }
              );
              $("#ng-x").onclick = () => done(null, o);
              return;
            }
            view($t("systems.80"));
            return;
          }
          late.sfx("coin");
          if (k === "wage") offer.wage = Math.round(offer.wage * 1.15);
          if (k === "years") offer.years++;
          if (k === "role") offer.role = offer.role === "bench" ? "rot" : "star";
          if (k === "bonus") offer.bonus = Math.round(offer.wage * rnd(2, 4));
          if (k === "release" || k === "nbaout" || k === "perf") offer.clauses = { ...(offer.clauses || {}), [k]: true };
          interest -= 0.05;
          view($t("systems.81"));
        })
    );
    $("#ng-back").onclick = () => done(null, o);
    $("#ng-ok").onclick = () => {
      late.sfx("levelup");
      if (offer.bonus)
        tx(
          $t("systems.142", {
            short: offer.team.short
          }),
          offer.bonus
        );
      done(offer);
    };
  };
  view(
    interest > 0.75
      ? $t("systems.82", {
          agent: S.npc.agent
        })
      : interest < 0.45
        ? $t("systems.83", {
            agent: S.npc.agent
          })
        : ""
  );
}
export const seasonAvgOf = () => (S.hist.length ? S.hist[S.hist.length - 1].avg : 6);

/* ================= KILAVUZ ================= */
export const GUIDE = [
  [$t("systems.84"), $t("systems.85")],
  [$t("systems.86"), $t("systems.87")],
  [$t("match.88"), $t("systems.88")],
  [$t("systems.89"), $t("systems.90")],
  [$t("systems.91"), $t("systems.92")],
  [$t("match.93"), $t("systems.93")],
  [$t("systems.94"), $t("systems.95")]
];
export function guideSheet(i = 0) {
  sheet(
    $t("systems.96"),
    $t("systems.97"),
    `${tabsHTML(
      GUIDE.map((g, k) => [String(k), g[0]]),
      String(i),
      "g"
    )}<div class="card"><h3>${GUIDE[i][0]}</h3><p style="line-height:1.6">${GUIDE[i][1]}</p></div><div class="grid2"><button class="btn ghost" id="gd-p" ${i === 0 ? "disabled" : ""}>${$t("systems.100")}</button><button class="btn pri" id="gd-n">${i === GUIDE.length - 1 ? $t("systems.98") : $t("systems.99")}</button></div>`,
    { onClose: () => (S ? renderMain() : renderSlots()) }
  );
  $$("[data-g]").forEach(b => (b.onclick = () => guideSheet(+b.dataset.g)));
  $("#gd-p").onclick = () => guideSheet(i - 1);
  $("#gd-n").onclick = () => (i === GUIDE.length - 1 ? (closeSheet(), S ? renderMain() : renderSlots()) : guideSheet(i + 1));
}
// ilk açılışta adım adım tanıtım: hedef öğe ışıklandırılır
export const TOUR = [
  [".hud", $t("systems.101"), $t("systems.102")],
  [".mapwrap", $t("systems.103"), $t("systems.104")],
  [".timebar", $t("systems.105"), $t("systems.106")],
  ["#gostad", $t("systems.107"), $t("systems.108")],
  ["#opt", $t("systems.109"), $t("systems.110")]
];
export function startTour(step = 0) {
  $$(".tour").forEach(x => x.remove());
  if (step >= TOUR.length) {
    S.tut = 1;
    save();
    return;
  }
  const [sel, title, text] = TOUR[step],
    el = $(sel);
  if (!el) {
    startTour(step + 1);
    return;
  }
  el.scrollIntoView({ block: "center" });
  setTimeout(() => {
    const r = el.getBoundingClientRect(),
      pad = 6;
    const ring = document.createElement("div");
    ring.className = "tour";
    ring.style.cssText = `position:fixed;left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;border-radius:14px;box-shadow:0 0 0 2px var(--gold),0 0 0 9999px rgba(3,6,12,.72);z-index:45;pointer-events:none`;
    const card = document.createElement("div");
    card.className = $t("systems.111");
    const below = r.bottom < innerHeight * 0.55;
    card.style.cssText = `position:fixed;left:50%;transform:translateX(-50%);${below ? `top:${Math.min(innerHeight - 200, r.bottom + 14)}px` : `bottom:${Math.min(innerHeight - 200, innerHeight - r.top + 14)}px`};width:min(420px,calc(100% - 32px));z-index:46;border-color:var(--gold)`;
    card.innerHTML = `<div class="eyebrow">${$t("systems.114", {
      v: step + 1,
      length: TOUR.length
    })}</div><h3>${title}</h3><p class="small">${text}</p><div class="grid2"><button class="btn ghost sm" id="tr-skip">${$t("systems.115")}</button><button class="btn pri sm" id="tr-next">${step === TOUR.length - 1 ? $t("systems.112") : $t("systems.113")}</button></div>`;
    document.body.append(ring, card);
    late.sfx("notify");
    $("#tr-next").onclick = () => startTour(step + 1);
    $("#tr-skip").onclick = () => startTour(TOUR.length);
  }, 250);
}

/* Çift dokunuş koruması: aynı butona 450 ms içinde gelen ikinci tıklama yutulur.
   Aksi halde "Devam" gibi ilerleme butonları iki kez çalışıp sezonu ikiye katlayabiliyordu. */
export const tapGuard = new WeakMap();
document.addEventListener(
  "click",
  e => {
    const b = e.target.closest && e.target.closest(".btn,.choice");
    if (!b) return;
    const now = performance.now(),
      t = tapGuard.get(b);
    if (t && now - t < 450) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    tapGuard.set(b, now);
  },
  true
);

/* ================= UYGULAMA OLARAK KURULUM (PWA) =================
   GitHub Pages gibi https üzerinden açıldığında service worker oyunu önbelleğe alır: internetsiz açılır,
   ana ekrana eklenebilir. Ana ekrana eklenen site, tarayıcının veri temizliğinden de korunur. */
export let installEvt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installEvt = e;
});
export function registerPWA() {
  if (
    !("serviceWorker" in navigator) ||
    (location.protocol !== "https:" && location.hostname !== "localhost") ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || // uygulamada gerek yok
    window.top !== window
  )
    return;
  try {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  } catch (e) {}
}
export function installSheet() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  sheet(
    $t("ads.15"),
    $t("systems.116"),
    `${installEvt ? `<p>${$t("systems.117")}</p><button class="btn pri" id="in-go">${$t("systems.118")}</button>` : ios ? `<div class="card"><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>${$t("systems.119")} <b>${$t("systems.120")}</b> ${$t("systems.121")}</li><li>${$t("systems.122")} <b>${$t("systems.123")}</b>${$t("systems.124")}</li><li>${$t("systems.125")} <b>${$t("systems.126")}</b>${$t("systems.127")}</li></ol></div>` : `<div class="card"><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>${$t("systems.128")}</li><li><b>${$t("ads.15")}</b> ${$t("systems.129")} <b>${$t("systems.130")}</b>${$t("systems.124")}</li></ol></div>`}
   <p class="small muted">${$t("systems.131")}</p>`
  );
  const g = $("#in-go");
  if (g)
    g.onclick = async () => {
      installEvt.prompt();
      try {
        const r = await installEvt.userChoice;
        if (r.outcome === "accepted") toast($t("systems.132"));
      } catch (e) {}
      installEvt = null;
      closeSheet();
    };
}
