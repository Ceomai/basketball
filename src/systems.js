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
        errorReports: true,
        fs: "m",
        cb: false,
        hc: false,
        autoPlan: false,
        theme: "default",
        diff: "normal"
      },
      JSON.parse(localStorage.getItem("pota-settings") || "{}")
    );
  } catch (e) {
    return { sound: true, vol: 0.7, haptic: true, crowd: true };
  }
})();
/** Erişilebilirlik: yazı boyutu ve renk körlüğü modu kök öğeye sınıf olarak uygulanır */
export function applyA11y() {
  const h = document.documentElement.classList;
  h.toggle("fs-l", SETTINGS.fs === "l");
  h.toggle("fs-xl", SETTINGS.fs === "xl");
  h.toggle("cb", !!SETTINGS.cb);
  h.toggle("fs-s", SETTINGS.fs === "s");
  h.toggle("hc", !!SETTINGS.hc);
  if (late.syncBarColor) late.syncBarColor(); // yüksek kontrast üst şerit zeminini değiştirir
}
applyA11y();
export const saveSettings = () => {
  try {
    localStorage.setItem("pota-settings", JSON.stringify(SETTINGS));
  } catch (e) {}
};
/** Aç/kapa ayarı: satır içi anahtar (role="switch"); etiket satırın başlığı */
export const switchRow = (attr, k, on, label, desc) =>
  `<div class="act swr"><div class="minw-0"><h3 id="swl-${attr}-${k}">${label}</h3><p>${desc}</p></div><button class="tgl" role="switch" aria-checked="${!!on}" aria-labelledby="swl-${attr}-${k}" data-${attr}="${k}"><span class="tgl-k" aria-hidden="true"></span></button></div>`;
export function settingsSheet() {
  const tog = (k, label, desc) => switchRow("tg", k, SETTINGS[k], label, desc);
  const togs = ks => ks.map(k => tog(k, t("settings." + k), t("settings." + k + "Desc"))).join("");
  const grp = k => `<div class="eyebrow set-g">${k}</div>`;
  const y0 = $("#shb") && $("#shb").querySelector("[data-tg],[data-fs],[data-vol],[data-diff]") ? $("#shb").scrollTop : 0;
  sheet(
    t("settings.title"),
    t("settings.sub"),
    `${grp(t("s32.g.sound"))}
   ${togs(["sound", "music", "crowd", "haptic"])}
   <div class="act"><div><h3>${t("settings.volume")}</h3><p>${t("settings.volumeDesc")}</p></div><div class="opts span-all">${[
     [0.35, t("settings.volLow")],
     [0.7, t("settings.volMid")],
     [1, t("settings.volHigh")]
   ]
     .map(([v, n]) => `<button class="opt ${SETTINGS.vol === v ? "on" : ""}" data-vol="${v}" aria-pressed="${SETTINGS.vol === v}">${n}</button>`)
     .join("")}</div></div>
   ${grp(t("s32.g.look"))}
   <div class="act"><div><h3>${t("settings.lang")}</h3><p>${t("settings.langDesc")}</p></div><div class="opts span-all">${LANGS.map(([k, n]) => `<button class="opt ${LANG === k ? "on" : ""}" data-lang="${k}" aria-pressed="${LANG === k}">${n}</button>`).join("")}</div></div>
   ${togs(["lowfx"])}
   <div class="eyebrow set-g">${t("settings.a11y")}</div>
   <div class="act"><div><h3>${t("settings.fs")}</h3><p>${t("settings.fsDesc")}</p></div><div class="opts span-all">${[
     ["s", t("settings.fsS")],
     ["m", t("settings.fsM")],
     ["l", t("settings.fsL")],
     ["xl", t("settings.fsXL")]
   ]
     .map(([v, n]) => `<button class="opt ${SETTINGS.fs === v ? "on" : ""}" data-fs="${v}" aria-pressed="${SETTINGS.fs === v}">${n}</button>`)
     .join("")}</div></div>
   ${tog("cb", t("settings.cb"), t("settings.cbDesc"))}
   ${tog("hc", t("settings.hc"), t("settings.hcDesc"))}
   ${grp(t("s32.g.play"))}
   <div class="act"><div><h3>${t("settings.diff")}</h3><p>${t("settings.diffDesc")}</p></div><div class="opts span-all">${[
     ["kolay", t("settings.diffEasy")],
     ["normal", t("settings.diffNormal")],
     ["zor", t("settings.diffHard")]
   ]
     .map(([v, n]) => `<button class="opt ${SETTINGS.diff === v ? "on" : ""}" data-diff="${v}" aria-pressed="${SETTINGS.diff === v}">${n}</button>`)
     .join("")}</div></div>
   ${togs(["autoPlan", "notify", "backupNag"])}
   ${late.focusSettingsHTML()}
   ${isInstalled() ? "" : `<div class="act"><div><h3>${t("settings.install")}</h3><p>${t("settings.installDesc")}</p></div><button class="btn sm" id="st-inst">${t("btn.how")}</button></div>`}
   <div class="grid2"><button class="btn" id="st-exp">${t("settings.backup")}</button><button class="btn" id="st-help">${t("btn.guide")}</button></div>
   <button class="btn ghost" id="st-tour">${t("settings.tour")}</button>
   ${late.relSettingsHTML()}
   ${togs(["errorReports"])}
   ${late.adsSettingsHTML()}
   ${late.cloudSettingsHTML()}
   ${late.testSettingsHTML()}`
  );
  if (y0) $("#shb").scrollTop = y0; // ayar değişince panel baştan çizilir: kaydırma yeri korunur
  $$("[data-tg]").forEach(
    b =>
      (b.onclick = () => {
        SETTINGS[b.dataset.tg] = !SETTINGS[b.dataset.tg];
        saveSettings();
        if (b.dataset.tg === "notify" && SETTINGS.notify) late.notifyAsk(true); // Android 13+ izni bağlamında sorulur
        if (!SETTINGS.crowd) late.crowd(false);
        late.applyLowFx();
        applyA11y();
        late.musicFor(late.MUS.want || "menu");
        settingsSheet();
      })
  );
  $$("[data-fs]").forEach(
    b =>
      (b.onclick = () => {
        SETTINGS.fs = b.dataset.fs;
        saveSettings();
        applyA11y();
        settingsSheet();
      })
  );
  $$("[data-diff]").forEach(
    b =>
      (b.onclick = () => {
        SETTINGS.diff = b.dataset.diff;
        saveSettings();
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
  late.bindFocusSettings(settingsSheet); // odak modu (src/focus.js)
  late.bindAdsSettings(settingsSheet);
  late.bindRelSettings(settingsSheet); // gizlilik, satın alım geri yükleme, veri silme (src/release.js)
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
    tch: (s.tch || 0) + (M.touches || 0),
    rs: s.rs + M.rating
  });
  if (typeof S.career.high !== "object" || !S.career.high) S.career.high = { pts: +S.career.high || 0, ast: 0, reb: 0 };
  const h = S.career.high;
  S.career.prevHighPts = h.pts; // maç sonu gündemi "kariyer rekoru" haberi için (src/league.js)
  for (const k of ["pts", "ast", "reb"])
    if (M[k] > h[k]) {
      h[k] = M[k];
      h[k + $t("stats.vs")] = `${M.opp.name} · ${seasonLabel()}`;
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
  c.innerHTML = `<div class="card"><div class="eyebrow">${$t("stats.seasonPerGame")}</div><div class="box"><div><b>${per(s.pts, s.g)}</b><span class="eyebrow">${$t("common.score")}</span></div><div><b>${per(s.ast, s.g)}</b><span class="eyebrow">${$t("common.assists")}</span></div><div><b>${per(s.reb, s.g)}</b><span class="eyebrow">${$t("common.rebound")}</span></div><div><b>${per(s.min, s.g)}</b><span class="eyebrow">${$t("stats.minutes")}</span></div></div><div class="small muted">${$t(
    "stats.games",
    {
      g: s.g
    }
  )}${
    s.dnp
      ? ` ${$t("stats.injuredGames", {
          dnp: s.dnp
        })}`
      : ""
  } ${$t("stats.avgRatingBlocks", {
    v: s.g ? (s.rs / s.g).toFixed(2) : "–",
    blk: s.blk,
    stl: s.stl
  })}</div></div>
   <div class="card"><div class="eyebrow">${$t("stats.seasonSeason")}</div><div class="tbl"><table><tr><th>${$t("common.season")}</th><th>${$t("common.team")}</th><th>M</th><th>${$t("stats.min")}</th><th>${$t("stats.pts")}</th><th>${$t("stats.ast")}</th><th>${$t("stats.reb")}</th><th>${$t("common.rating")}</th></tr>${rows.map(r => `<tr class="${r.live ? "me" : ""}"><td>${r.label}</td><td>${esc(r.team)}<div class="small muted">${esc(r.league || "")}</div></td><td>${r.g ?? "–"}</td><td>${per(r.min, r.g)}</td><td>${per(r.pts, r.g)}</td><td>${per(r.ast, r.g)}</td><td>${per(r.reb, r.g)}</td><td>${r.g ? (r.rs / r.g).toFixed(1) : r.avg != null ? r.avg.toFixed(1) : "–"}</td></tr>`).join("")}</table></div></div>
   <div class="card"><div class="eyebrow">${$t("stats.careerTotals")}</div><div class="kv"><span>${$t("common.match")}</span><b>${k.games}</b><span>${$t("stats.minutes")}</span><b>${k.min || 0}</b><span>${$t("common.score")}</span><b>${k.pts} (${per(k.pts, k.games)})</b><span>${$t("common.assists")}</span><b>${k.ast} (${per(k.ast, k.games)})</b><span>${$t("common.rebound")}</span><b>${k.reb || 0} (${per(k.reb || 0, k.games)})</b><span>${$t("stats.blocksSteals")}</span><b>${k.blk} · ${k.stl || 0}</b><span>${$t("common.win")}</span><b>${k.wins}</b><span>${$t("common.nationalTeamGame")}</span><b>${k.natCaps || 0}</b></div></div>
   <div class="card"><div class="eyebrow">${$t("stats.careerRecords")}</div><div class="kv"><span>${$t("common.score")}</span><b>${h.pts || 0}</b>${h.ptsVs ? `<span class="small muted" style="grid-column:1/-1;margin-top:-4px">${esc(h.ptsVs)}</span>` : ""}<span>${$t("common.assists")}</span><b>${h.ast || 0}</b><span>${$t("common.rebound")}</span><b>${h.reb || 0}</b></div></div>`;
  if (S.rival) c.insertAdjacentHTML("beforeend", late.rivalInfo() + late.h2hHTML()); // karşılaşma geçmişi (src/seasonlife.js)
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
    games: s.g * late.modeGamesMul(),
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
      $t("awards.mvp", {
        ln: ln
      })
    ],
    ppg: ["award", $t("lc.awPts", { ln, v: per(s.pts, g) })],
    apg: ["award", $t("lc.awAst", { ln, v: per(s.ast, g) })],
    rpg: ["award", $t("lc.awReb", { ln, v: per(s.reb, g) })],
    dpoy: [
      "award",
      $t("awards.defensivePlayerYear", {
        ln: ln
      })
    ],
    roy: [
      "award",
      $t("awards.rookieYear", {
        ln: ln
      })
    ],
    fmvp: [
      "mvp",
      $t("awards.finalsMvp", {
        ln: ln
      })
    ]
  };
  if (kinds.includes("mvp")) S.career.mvps++;
  if (kinds.includes("roy")) S.career.roy = 1;
  return kinds.map(k => award(label[k][0], label[k][1]));
}
// All-Star: sezonun ortasında, not ortalaması yüksekse; üçlük yarışması mini oyunu
export const allStarEligible = () =>
  ["t1", "euro", "nba"].includes(S.stage) &&
  S.allStar !== S.season &&
  !S.injury &&
  rated().length >= 3 &&
  seasonAvg() >= AWARD_T.allstar &&
  dominance() >= 3;
export function allStar(done) {
  if (!allStarEligible()) {
    done();
    return;
  }
  S.allStar = S.season;
  S.career.allStars = (S.career.allStars || 0) + 1;
  award(
    "allstar",
    $t("allStar.star", {
      v: lgName()
    })
  );
  save();
  late.sfx("fanfare");
  sheet(
    $t("allStar.madeStarTeam"),
    lgName(),
    `<div class="chapter"><div class="hd"><div class="eyebrow" style="color:inherit;opacity:.8">${$t("allStar.starWeekend")}</div><h2 style="font-size:var(--fs-8xl)">${esc(fullName())}</h2></div><div class="bd"><p>${$t("allStar.madeLeaguesBest7")}</p><div class="grid2"><button class="btn ghost" id="as-no">${$t("allStar.skipContest")}</button><button class="btn pri" id="as-go">${$t("allStar.enterContest")}</button></div></div></div>`,
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
    app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("allStar.starThreePoint")}</div><h2>${$t("allStar.shots7")}</h2></div><div id="stg"></div><div id="res"></div>`;
    const r = await mgShoot($("#stg"), {
      eff: clamp(eff("sut") + 15, 5, 100),
      shots: 7,
      title: $t("allStar.threePointContest"),
      dist: "three",
      def: false
    });
    const won = r.made >= 4;
    if (won) {
      award(
        "award",
        $t("allStar.starThreePoint2", {
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
    $("#res").innerHTML = `<div class="card"><div class="eyebrow">${$t("common.result")}</div><h2 class="${won ? "good" : ""}">${$t(
      "allStar.made7",
      {
        made: r.made
      }
    )}${won ? $t("allStar.champion") : ""}</h2><p>${won ? $t("allStar.liftedTrophyArena") : $t("allStar.notTimeMaking")}</p><button class="btn pri" id="bk">${$t("common.backMap")}</button></div>`;
    $("#bk").onclick = () => {
      renderMain();
      done();
    };
  };
}

/* ================= SAKATLIKLAR ================= */
export const INJ = [
  [$t("injury.ankleSprain"), 1, 2, 0.5],
  [$t("injury.hamstringStrain"), 2, 3, 0.24],
  [$t("injury.groinInjury"), 2, 4, 0.12],
  [$t("injury.brokenFinger"), 1, 3, 0.08],
  [$t("injury.tornKneeLigament"), 6, 9, 0.06]
];
export function injuryRisk() {
  return injuryChance({
    energy: S.energy,
    age: S.age,
    kryo: !!S.items.kryo,
    fizyo: !!S.items.fizyo,
    mul: (S.buffs && S.buffs.injWk > 0 ? S.buffs.injMul || 1 : 1) * late.fitInjMul()
  });
}
export function rollInjury() {
  const re = late.reinjury(); // konservatif tedavi sonrası tekrar (src/dilemmas.js)
  if (re) return re;
  // seri maçları aynı haftaya sığar: haftalık sakatlık riskini maçlara böl (yoksa play-off haftası 3-5 kat riskli)
  const serMul = late.serGameNo && late.serGameNo() > 0 ? 0.35 : 1;
  if (S.injury || Math.random() >= injuryRisk() * late.modeInjuryMul() * serMul) return null;
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
  if (pick2[0].startsWith($t("injury.knee"))) {
    S.st.hiz -= 2;
    S.st.guc -= 1;
  }
  S.moral -= 8;
  news(
    $t("injury.gotInjuredWeeks", {
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
      $t("injury.recoveredInjuryBack", {
        v: fullName()
      })
    );
    toast($t("injury.injuryHealedReturn"));
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
    $t("sim.watchedStandsDue", {
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
    win ? $t("sim.teamWon") : $t("sim.teamLost"),
    $t("sim.watchedStands", {
      v: phaseName()
    }),
    `<div class="row nowrap gap-2">${crestSVG(S.team, 36)}<span class="big-num">${us}–${them}</span>${crestSVG(opp, 36)}</div><div class="say">${win ? $t("sim.teammatesDedicatedWin") : $t("sim.watchingSidelineHard")}</div><p class="small muted">${$t(
      "sim.injuryWeeksLeft",
      {
        n: esc(S.injury.n),
        w: S.injury.w
      }
    )}</p><button class="btn pri" id="nx">${$t("common.continue")}</button>`,
    { noClose: true }
  );
  // sakatken izlenen maç da maç sayılır (geçiş reklamı sıklığı aynı kurallarla)
  $("#nx").onclick = () => late.adsBetween(() => afterMatch(win));
}
export function updateLeague(win, opp, us, them) {
  // bozuk/eksik kayıtta kendi takım ya da rakip lig tablosunda olmayabilir: satır eklenir, maç sonu akışı kesilmez
  if (!Array.isArray(S.league)) S.league = [];
  const row = k => {
    let r = S.league.find(x => x.key === k);
    if (!r) S.league.push((r = { key: k, w: 0, l: 0, pf: 0, pa: 0 }));
    return r;
  };
  const mr = row(S.team.key),
    ro = row(opp.key);
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
  // Lig merkezi için bu haftanın sonuçları (bizim maç dahil)
  S.lastRound = [{ a: mr.key, b: ro.key, sa: us, sb: them }];
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
    S.lastRound.push({ a: a.key, b: b.key, sa, sb });
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
  resultView($t("common.physio"), fast ? $t("injury.physiotherapistSays") : $t("injury.sessionWentWell"), [
    [$t("common.energyPlus10"), "p"],
    ...(fast ? [[$t("injury.recoveryWeekMinus1"), "p"]] : [])
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
    .filter(p => p.n.split(" ").slice(1).join(" ") !== (S && S.last)) // oyuncuyla aynı soyadı karışıklık yaratır
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
    late.trustCardHTML() +
    late.charactersHTML() +
    `<div class="card"><div class="row between"><div><div class="eyebrow">${$t("roster.roster", {
      name: esc(S.team.name)
    })}</div><h3>${$t("roster.teamChemistry")} ${Math.round(chemAvg())}/100</h3></div><span class="pill ${chemAvg() >= 60 ? "w" : ""}">${chemAvg() >= 60 ? $t("roster.sync") : $t("roster.improving")}</span></div><p class="small muted">${$t("roster.whenTeamChemistry")} <b>${esc(best.n)}</b>.</p>
   <div class="tbl"><table><tr><th>${$t("common.player")}</th><th>${$t("roster.pos")}</th><th>${$t("common.age")}</th><th>${$t("common.overall")}</th><th>${$t("roster.chem")}</th></tr><tr class="me"><td>${esc(fullName())}${late.isCaptain && late.isCaptain() ? ' <span class="pill g">K</span>' : ""}</td><td>${S.pos}</td><td>${S.age}</td><td>${ovr()}</td><td>–</td></tr>${r.map(p => `<tr><td>${esc(p.n)}${p.cap && !(late.isCaptain && late.isCaptain()) ? ' <span class="pill g">K</span>' : ""}${late.mateTraitHTML ? late.mateTraitHTML(p.n) : ""}</td><td>${p.pos}</td><td>${p.age}</td><td>${p.ovr}</td><td><div class="bar" style="width:60px"><i style="--w:${p.chem};background:var(--info)"></i></div></td></tr>`).join("")}</table></div></div>` +
    actHTML({
      id: "yemek",
      ic: icon("plate"),
      t: $t("roster.teamDinner"),
      d: $t("roster.takeEveryoneEat"),
      slot: 1,
      price: Math.round(10 * (1 + ORDER.indexOf(S.stage) * 2)),
      fx: [
        [$t("roster.wholeRosterChemistryPlus6"), "p"],
        [$t("common.teamPlus3"), "p"]
      ],
      btn: $t("roster.treat")
    }) +
    actHTML({
      id: "ikili",
      ic: icon("ball"),
      t: $t("roster.extraPractice"),
      d: $t("roster.passingScreenWork", {
        n: r[0].n
      }),
      slot: 1,
      fx: [
        [$t("roster.chemistryPlus12"), "p"],
        [$t("prog.pasSmall"), "p"],
        [$t("roster.energyMinus10"), "n"]
      ],
      btn: $t("roster.work"),
      disabled: S.energy < 10
    });
  bindActs({
    yemek: () => {
      const p = Math.round(10 * (1 + ORDER.indexOf(S.stage) * 2));
      if (S.money < p) return;
      useSlot();
      tx($t("roster.teamDinner"), -p);
      r.forEach(x => (x.chem = Math.min(100, x.chem + 6)));
      S.rel.takim += 3;
      norm();
      save();
      resultView($t("roster.teamDinner"), `${r.find(x => x.cap).n} ${$t("roster.stoodSeasonOurs")}`, [[$t("roster.chemistryPlus6"), "p"]]);
    },
    ikili: () => {
      useSlot();
      r[0].chem = Math.min(100, r[0].chem + 12);
      late.gainStat("pas", 0.4 * late.levelMul("pas"));
      S.energy -= 10;
      norm();
      save();
      resultView(
        $t("roster.extraPractice"),
        $t("roster.nowSetMemorized", {
          n: r[0].n
        }),
        [
          [$t("roster.chemistryPlus12"), "p"],
          [$t("prog.pasSmall"), "p"]
        ]
      );
    }
  });
}

/* ================= SÖZLEŞME PAZARLIĞI ================= */
export function negotiateOffer(o, done) {
  if (!isPro(o.stage) || o.uni || o.noNego) {
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
      $t("contract.contractNegotiation"),
      offer.team.name,
      `<div class="row nowrap">${crestSVG(offer.team, 48)}<div><div class="eyebrow">${esc(leagueName(offer.stage, offer.team.cc))}</div><h3>${esc(offer.team.name)}</h3><div class="small muted">${$t(
        "contract.agentTable",
        {
          city: esc(offer.team.city),
          agent: esc(S.npc.agent)
        }
      )}</div></div></div>
      ${late.repHTML(offer.team, interest)}
      <div class="card"><div class="kv"><span>${$t("common.weeklySalary")}</span><b class="gold">${fmt(offer.wage)}</b><span>${$t("common.minutes")}</span><b>${$t(
        "contract.years",
        {
          years: offer.years
        }
      )}</b><span>${$t("common.role")}</span><b>${ROLE_N[offer.role]}</b><span>${$t("contract.signingBonus")}</span><b>${fmt(offer.bonus || 0)}</b><span>${$t("common.clubInterest")}</span><b>${interest > 0.75 ? $t("common.high") : interest > 0.55 ? $t("common.high2") : interest > 0.4 ? $t("common.medium") : $t("common.low")}</b></div></div>
      ${msg ? `<div class="say">${msg}</div>` : ""}
      <div class="eyebrow">${$t("contract.demandLeft", {
        v: 3 - asks
      })}</div>
      <div class="grid2"><button class="btn ghost sm" data-ask="wage" ${asks >= 3 ? "disabled" : ""}>${$t("contract.salaryPlus15pct")}</button><button class="btn ghost sm" data-ask="years" ${asks >= 3 || offer.years >= 4 ? "disabled" : ""}>${$t("contract.lengthYearPlus1")}</button><button class="btn ghost sm" data-ask="role" ${asks >= 3 || offer.role === "star" ? "disabled" : ""}>${$t("contract.biggerRole")}</button><button class="btn ghost sm" data-ask="bonus" ${asks >= 3 || offer.bonus ? "disabled" : ""}>${$t("contract.signingBonus")}</button></div>
      <div class="eyebrow">${$t("contract.contractClauses")}</div>
      <div class="grid3"><button class="btn ghost sm" data-ask="release" ${asks >= 3 || cl.release ? "disabled" : ""}>${$t("contract.releaseClause")}</button>${offer.stage !== "nba" ? `<button class="btn ghost sm" data-ask="nbaout" ${asks >= 3 || cl.nbaout ? "disabled" : ""}>${$t("contract.nbaEscape")}</button>` : ""}<button class="btn ghost sm" data-ask="perf" ${asks >= 3 || cl.perf ? "disabled" : ""}>${$t("contract.performanceBonus2")}</button></div>
      <p class="small muted">${$t("contract.releaseClauseLeave15pct")}${Object.keys(cl).length ? ` <b>${$t("contract.clauses")} ${[cl.release && $t("contract.release"), cl.nbaout && $t("contract.nbaEscape"), cl.perf && $t("contract.performanceBonus")].filter(Boolean).join(", ")}</b>` : ""}</p>
      <div class="grid2"><button class="btn ghost" id="ng-back">${$t("common.backOffers")}</button><button class="btn good" id="ng-ok">${$t("common.sign")}</button></div>`,
      { noClose: true }
    );
    late.mountRep(offer.team, interest);
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
                $t("contract.talks"),
                offer.team.name,
                `<div class="say">${$t("contract.walkedAwayTable", {
                  name: esc(offer.team.name)
                })}</div><button class="btn pri" id="ng-x">${$t("common.backOffers")}</button>`,
                { noClose: true }
              );
              o.withdrawn = true; // masadan kalkan kulüp bu yaz yeniden pazarlığa oturmaz
              $("#ng-x").onclick = () => done(null, o);
              return;
            }
            view($t("contract.clubRejectedDemand"));
            return;
          }
          late.sfx("coin");
          if (k === "wage") offer.wage = Math.round(offer.wage * 1.15);
          if (k === "years") offer.years++;
          if (k === "role") offer.role = offer.role === "bench" ? "rot" : "star";
          if (k === "bonus") offer.bonus = Math.round(offer.wage * rnd(2, 4));
          if (k === "release" || k === "nbaout" || k === "perf") offer.clauses = { ...(offer.clauses || {}), [k]: true };
          interest -= 0.05;
          view($t("contract.clubAcceptedDemand"));
        })
    );
    $("#ng-back").onclick = () => done(null, o);
    $("#ng-ok").onclick = () => {
      late.sfx("levelup");
      if (offer.bonus)
        tx(
          $t("contract.signingBonus2", {
            short: offer.team.short
          }),
          offer.bonus
        );
      done(offer);
    };
  };
  view(
    interest > 0.75
      ? $t("contract.reallyWantPush", {
          agent: S.npc.agent
        })
      : interest < 0.45
        ? $t("contract.pushTooHard", {
            agent: S.npc.agent
          })
        : ""
  );
}
export const seasonAvgOf = () => (S.hist.length ? S.hist[S.hist.length - 1].avg : 6);

/* ================= KILAVUZ ================= */
export const GUIDE = [
  [$t("guide.gettingStarted"), $t("guide.startYearsOld16")],
  [$t("guide.map"), $t("guide.mainMenuMap")],
  [$t("common.match"), $t("guide.gameRunsFour")],
  [$t("guide.miniGames"), $t("guide.shotPressScreen")],
  [$t("guide.progression"), $t("guide.trainingRaises24")],
  [$t("common.career"), $t("guide.endSeasonOffers")],
  [$t("guide.moneyItems"), $t("guide.earnMoneySalary")]
];
export function guideSheet(i = 0) {
  if (late.fullGuide) return late.fullGuide(i); // yeni ayrıntılı kılavuz (src/guide.js)
  sheet(
    $t("guide.guide"),
    $t("guide.howPlay"),
    `${tabsHTML(
      GUIDE.map((g, k) => [String(k), g[0]]),
      String(i),
      "g"
    )}<div class="card"><h3>${GUIDE[i][0]}</h3><p style="line-height:1.6">${GUIDE[i][1]}</p></div><div class="grid2"><button class="btn ghost" id="gd-p" ${i === 0 ? "disabled" : ""}>${$t("guide.previous")}</button><button class="btn pri" id="gd-n">${i === GUIDE.length - 1 ? $t("guide.close") : $t("guide.next")}</button></div>`,
    { onClose: () => (S ? renderMain() : renderSlots()) }
  );
  $$("[data-g]").forEach(b => (b.onclick = () => guideSheet(+b.dataset.g)));
  $("#gd-p").onclick = () => guideSheet(i - 1);
  $("#gd-n").onclick = () => (i === GUIDE.length - 1 ? (closeSheet(), S ? renderMain() : renderSlots()) : guideSheet(i + 1));
}
// ilk açılışta adım adım tanıtım: hedef öğe ışıklandırılır
export const TOUR = [
  [".hud", $t("tour.playerBar"), $t("tour.balanceEnergyMorale")],
  [".mapwrap", $t("tour.cityMap"), $t("tour.mainMenuTap")],
  [".timebar", $t("tour.timeSlots"), $t("tour.timeSlotsEach3")],
  ["#gostad", $t("tour.gameDay"), $t("tour.whenReadyHead")],
  ["#opt", $t("tour.settingsGuide"), $t("tour.soundVibrationSave")]
];
export function startTour(step = 0) {
  $$(".tour").forEach(x => x.remove());
  if (!S) return; // tur sürerken kariyerden çıkıldı (kayıt ekranı)
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
    if (!S || !document.contains(el)) return; // bu arada ekran değişti
    const r = el.getBoundingClientRect(),
      pad = 6;
    const ring = document.createElement("div");
    ring.className = "tour";
    ring.style.cssText = `position:fixed;left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;border-radius:var(--r-2xl);box-shadow:0 0 0 2px var(--gold),0 0 0 9999px rgba(3,6,12,.72);z-index:45;pointer-events:none`;
    const card = document.createElement("div");
    card.className = "tour card";
    const below = r.bottom < innerHeight * 0.55;
    card.style.cssText = `position:fixed;left:50%;transform:translateX(-50%);${below ? `top:${Math.min(innerHeight - 200, r.bottom + 14)}px` : `bottom:${Math.min(innerHeight - 200, innerHeight - r.top + 14)}px`};width:min(420px,calc(100% - 32px));z-index:46;border-color:var(--gold)`;
    card.innerHTML = `<div class="eyebrow">${$t("tour.tour", {
      v: step + 1,
      length: TOUR.length
    })}</div><h3>${title}</h3><p class="small">${text}</p><div class="grid2"><button class="btn ghost sm" id="tr-skip">${$t("tour.skipTour")}</button><button class="btn pri sm" id="tr-next">${step === TOUR.length - 1 ? $t("tour.finish") : $t("tour.next")}</button></div>`;
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
    const b = e.target.closest && e.target.closest(".btn:not([data-rapid]),.choice"); // data-rapid: art arda dokunma mini oyunu (src/posplay.js)
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
    $t("common.addHomeScreen"),
    $t("install.playLikeApp"),
    `${installEvt ? `<p>${$t("install.installOneTap")}</p><button class="btn pri" id="in-go">${$t("install.installNow")}</button>` : ios ? `<div class="card"><ol style="margin:0;padding-left:var(--sp-5);display:flex;flex-direction:column;gap:var(--sp-1h)"><li>${$t("install.safariTap")} <b>${$t("install.share")}</b> ${$t("install.iconBottomSquare")}</li><li>${$t("install.scrollListSelect")} <b>${$t("install.addHomeScreen")}</b>${$t("install.yiSec")}</li><li>${$t("install.topRightTap")} <b>${$t("install.add")}</b>${$t("install.yeDokun")}</li></ol></div>` : `<div class="card"><ol style="margin:0;padding-left:var(--sp-5);display:flex;flex-direction:column;gap:var(--sp-1h)"><li>${$t("install.openBrowserMenu")}</li><li><b>${$t("common.addHomeScreen")}</b> ${$t("install.or")} <b>${$t("install.installApp")}</b>${$t("install.yiSec")}</li></ol></div>`}
   <p class="small muted">${$t("install.noteInstallationWorks")}</p>`
  );
  const g = $("#in-go");
  if (g)
    g.onclick = async () => {
      installEvt.prompt();
      try {
        const r = await installEvt.userChoice;
        if (r.outcome === "accepted") toast($t("install.gameAddedHome"));
      } catch (e) {}
      installEvt = null;
      closeSheet();
    };
}
