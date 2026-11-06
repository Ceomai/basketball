import { t as $t, t } from "./i18n/index.js";
import { autoSuccess, rivalGrowthRange } from "./logic/rules.js";
import { late } from "./late.js";
import {
  $,
  $$,
  BAL,
  Bus,
  COMMON_DRILLS,
  DRILLS,
  EU_CC,
  LEAGUES,
  ORDER,
  WAGE,
  clamp,
  esc,
  fmt,
  isPro,
  levelName,
  pick,
  ri,
  rnd,
  roleAt,
  statName,
  tdOf,
  toast
} from "./data.js";
import { leaguePool } from "./clubs.js";
import { portrait } from "./art.js";
import {
  ROLE_N,
  S,
  closeSheet,
  crestSVG,
  eff,
  fixture,
  fullName,
  lgName,
  makeTeam,
  news,
  norm,
  ovr,
  phaseName,
  seasonLabel,
  sheet,
  standings,
  teamByKey,
  tx
} from "./core.js";
import { save } from "./save.js";
import { drillGain } from "./places.js";
import { LK, M, PEN, potential } from "./match.js";
import { playMatch } from "./engine.js";
import { chemAvg, dominance, rated, seasonAvg, seasonAvgOf, simWithoutMe } from "./systems.js";
/* ================= HİKÂYE VE KARİYER DÖNGÜSÜ =================
   - Otomatik maç ve "Haftayı hızlı geç"
   - Kalıcı rakip oyuncu ve derbiler
   - Koçun güvenine göre sezon içinde rol değişimi
   - Maç sonrası basın toplantısı (sözlerin bir sonraki maçta karşılığı var)
   - Birkaç hafta süren hikâye zincirleri: transfer söylentisi, sakatlık dönüşü, aile meselesi,
     lise kaptanlığı, üniversite final haftası */

/* ---- Otomatik çözüm: mini oyun oynanmadan niteliklere göre sonuç ----
   Ortalama bir oyuncudan biraz düşük isabet verir; maçı kendin oynamak daha iyi not getirir. */
export const autoP = e => autoSuccess(e + ((M && M.mmod) || 0), (window.__SIM && window.__SIM.base) || 0.46);
export const coin = p => Math.random() < p;
export function autoChoose(opts) {
  return opts.map(o => ({ k: o.k, v: (o.k === "safe" ? o.e - 10 : o.e) + rnd(0, 10) })).sort((a, b) => b.v - a.v)[0].k;
}
export function autoResolve(k, sur) {
  const P3 = ["pull", "catch", "wing", "corner", "top3"],
    P2 = ["step", "pop", "mid", "float"];
  if (P3.includes(k) || P2.includes(k)) {
    const th = P3.includes(k),
      ok = coin(autoP(eff("sut") - (PEN[k] || 0) - (th ? 6 : 0)) * (th ? 0.85 : 1));
    if (ok) M.pts += th ? 3 : 2;
    return {
      good: ok,
      w: th ? 1.3 : 1,
      st: "sut",
      txt: ok
        ? `${sur} ${th ? $t("story.1") : $t("story.2")}`
        : $t("match.8", {
            sur: sur
          })
    };
  }
  if (k === "drive" || k === "break" || k === "lay") {
    if (!coin(autoP(eff("hiz") - (PEN[k] || 0)))) {
      if (k !== "break" && coin(0.15)) late.addFoul(); // hücum faulü
      return {
        good: false,
        w: 1,
        st: "hiz",
        txt: $t("match.96", {
          sur: sur
        })
      };
    }
    M.pts += 2;
    if ((k === "drive" || k === "lay") && coin(k === "lay" ? 0.12 : 0.18) && coin(autoP(eff("sut") + 10))) M.pts++;
    return {
      good: true,
      w: k === "break" ? 1.2 : 1,
      st: "hiz",
      txt: $t("story.122", {
        sur: sur
      })
    };
  }
  if (["pnr", "kick", "lob"].includes(k)) {
    if (!coin(autoP(eff("pas") - (PEN[k] || 0)))) return { good: false, w: 1, st: "pas", txt: $t("story.123") };
    const conv = (k === "lob" ? 0.75 : 0.58) + S.rel.takim * 0.003 + (chemAvg() - 40) * 0.002;
    if (coin(conv)) {
      M.ast++;
      return {
        good: true,
        w: k === "lob" ? 1.3 : 1,
        st: "pas",
        txt: $t("story.124", {
          sur: sur
        })
      };
    }
    return { good: true, w: 0.6, st: "pas", txt: $t("story.125") };
  }
  if (k === "post" || k === "dunk") {
    const ok = coin(autoP(eff("guc") + (k === "dunk" ? 5 : 0)));
    if (ok) M.pts += 2;
    if (ok && coin(k === "dunk" ? 0.08 : 0.1) && coin(autoP(eff("sut") + 10))) M.pts++; // basket faul
    return {
      good: ok,
      w: k === "dunk" ? 1.3 : 1.2,
      st: "guc",
      txt: ok
        ? $t("story.3", {
            sur: sur
          })
        : $t("story.4", {
            sur: sur
          })
    };
  }
  if (k === "putback" || k === "reb") {
    if (!coin(autoP(eff("guc")))) return { good: false, w: 1, st: "guc", txt: $t("story.126") };
    M.reb++;
    if (k === "reb") {
      M.stops++;
      return {
        good: true,
        w: 1,
        st: "guc",
        txt: $t("story.127", {
          sur: sur
        })
      };
    }
    if (coin(0.8)) {
      M.pts += 2;
      return {
        good: true,
        w: 1.2,
        st: "guc",
        txt: $t("story.128", {
          sur: sur
        })
      };
    }
    return {
      good: true,
      w: 0.6,
      st: "guc",
      txt: $t("story.127", {
        sur: sur
      })
    };
  }
  if (k === "block") {
    const ok = coin(autoP((eff("sav") + eff("guc")) / 2));
    if (ok) {
      M.blk++;
      M.stops++;
    }
    return {
      good: ok,
      w: 1.2,
      st: "sav",
      txt: ok
        ? $t("story.5", {
            sur: sur
          })
        : $t("story.6")
    };
  }
  if (k === "steal") {
    const ok = coin(autoP(eff("hiz") - 6));
    if (ok) M.stl++;
    return {
      good: ok,
      w: 1.2,
      st: "hiz",
      txt: ok
        ? $t("story.7", {
            sur: sur
          })
        : $t("story.8")
    };
  }
  if (k === "charge") {
    const ok = coin(clamp((eff("sav") / 100) * 0.6 + 0.15, 0.1, 0.75));
    if (ok) M.stops++;
    return {
      good: ok,
      w: 1.1,
      st: "sav",
      txt: ok
        ? $t("story.9", {
            sur: sur
          })
        : $t("story.10")
    };
  }
  if (k === "safe") {
    const ok = coin(clamp((eff(S.pos === "PF" ? "guc" : "sav") / 100) * 0.7 + 0.25, 0.2, 0.9));
    if (ok) M.stops++;
    return { good: ok, w: 0.5, st: "sav", txt: ok ? $t("story.11") : $t("story.12") };
  }
  let m = 0;
  for (let i = 0; i < (k === "free3" ? 3 : 2); i++) if (coin(autoP(eff("sut") + 12))) m++;
  M.pts += m;
  return {
    good: m > 0,
    w: 0.6,
    st: "sut",
    txt: $t("story.129", {
      sur: sur,
      m: m
    })
  };
}

/* ---- Haftayı hızlı geç ----
   Kalan zaman dilimlerini mantıklı bir planla doldurur (dinlen, çalış, antrenman, sosyal),
   sonra maçı otomatik oynatır ya da istersen maça kendin çıkarsın. Antrenman mini oyunsuz yapıldığı
   için kazancı biraz düşüktür. */
export function autoWeekPlan() {
  const out = [];
  while (S.slot > 0) {
    S.slot--;
    if (S.injury) {
      if (S.injury.w > 1 && coin(0.5)) S.injury.w--;
      S.energy += 10;
      out.push([$t("story.13"), $t("story.14")]);
      continue;
    }
    if (S.energy < 42) {
      S.energy += 35;
      S.moral += 2;
      out.push([$t("places.52"), $t("story.15")]);
      continue;
    }
    if (S.studying && S.aka < 55 && (S.stage === "lise" || S.stage === "uni") && !S.studied) {
      let c = 0;
      for (let i = 0; i < 3; i++) if (coin(0.6)) c++;
      S.aka += c * 3;
      S.energy -= 6;
      S.studied = true;
      out.push([
        $t("story.16"),
        $t("story.17", {
          v: c * 3
        })
      ]);
      continue;
    }
    if (S.moral < 45) {
      if (S.money >= 3) tx($t("story.159"), -3);
      S.moral += 8;
      S.rel.ark += 8;
      out.push([$t("story.18"), $t("story.19")]);
      continue;
    }
    if (S.rel.aile < 40) {
      S.rel.aile += 12;
      S.moral += 5;
      out.push([$t("story.20"), $t("story.21")]);
      continue;
    }
    // pozisyona göre en çok işe yarayacak antrenman
    const W = {
      PG: { pas: 1.3, hiz: 1.2, sut: 1, sav: 0.8, guc: 0.7 },
      SG: { sut: 1.4, hiz: 1.1, pas: 0.9, sav: 0.9, guc: 0.7 },
      SF: { sut: 1.1, sav: 1, guc: 1, hiz: 1, pas: 0.9 },
      PF: { guc: 1.3, sav: 1.3, sut: 0.9, hiz: 0.8, pas: 0.7 },
      C: { guc: 1.5, sav: 1.4, sut: 0.7, hiz: 0.7, pas: 0.7 }
    }[S.pos];
    const drills = [...DRILLS[S.pos], ...COMMON_DRILLS];
    let best = drills[0],
      bv = -1;
    for (const d of drills) {
      const v = W[d[2]] * (100 - S.st[d[2]]) * (late.program() === d[2] ? 2.5 : 1);
      if (v > bv) {
        bv = v;
        best = d;
      }
    }
    const k = best[2],
      ratio = clamp(autoP(eff(k) + 10) * 0.9, 0, 1),
      g = drillGain(k, ratio);
    Bus.emit("train:done", { k, ratio, auto: true });
    S.energy -= 18;
    out.push([
      $t("story.22", {
        v: best[1]
      }),
      g >= 0.05
        ? `+${g.toFixed(2)} ${statName(k)}`
        : $t("story.23", {
            k: statName(k)
          })
    ]);
  }
  norm();
  save();
  return out;
}
export function quickWeek() {
  if (late.offResume(true)) return; // yarıda kalmış sezon geçişi önce tamamlanır
  closeSheet();
  const plan = autoWeekPlan();
  const big = bigMatch();
  const fx = fixture(),
    opp = teamByKey(fx.opp);
  sheet(
    t("quick.title"),
    $t("places.72", {
      v: seasonLabel(),
      week: S.week
    }),
    `<div class="card"><div class="eyebrow">${t("quick.did")}</div>${plan.length ? `<div class="kv">${plan.map(([a, b]) => `<span>${esc(a)}</span><b>${esc(b)}</b>`).join("")}</div>` : `<p class="small muted">${t("quick.full")}</p>`}</div>
   <div class="card"><div class="eyebrow">${t("quick.next")}</div><div class="row nowrap" style="gap:10px">${crestSVG(opp, 40)}<div><b>${esc(opp.name)}</b><div class="small muted">${fx.home ? t("main.home") : t("main.away")} · ${phaseName()}</div></div></div>${S.injury ? `<p class="small bad">${t("quick.injured")}</p>` : `<p class="small muted">${t("quick.autoNote")}</p>`}</div>
   ${big ? `<div class="say" style="border-left-color:var(--gold)"><b>${esc(big.label)}</b> ${t("big.invite")}</div>` : ""}
   ${S.injury ? `<button class="btn pri" id="qw-sim">${t("quick.watch")}</button>` : `<div class="grid2"><button class="btn ${big ? "pri" : ""}" id="qw-self">${t("quick.self")}</button><button class="btn ${big ? "ghost" : "pri"}" id="qw-sim">${t("quick.sim")}</button></div>`}`,
    { noClose: true }
  );
  $("#qw-sim").onclick = () => {
    closeSheet();
    if (S.injury) simWithoutMe();
    else {
      const f = fixture();
      playMatch({ opp: teamByKey(f.opp), home: f.home, comp: "lig", label: `${lgName()} · ${phaseName()}`, auto: true });
    }
  };
  const me = $("#qw-self");
  if (me)
    me.onclick = () => {
      closeSheet();
      playMatch();
    };
}

/* ================= RAKİP OYUNCU ================= */
// Aynı yaşta, aynı şehirden, kariyeri seninle paralel ilerleyen bir rakip.
export function makeRival() {
  const c = LEAGUES.TR,
    opp = S.league.map(r => r.key).filter(k => k !== S.team.key),
    tk = pick(opp) || S.team.key,
    t = teamByKey(tk);
  const name = S.npc && S.npc.rival ? S.npc.rival.split(" ") : [pick(c.first), pick(c.last)];
  return {
    first: name[0],
    last: name[1] || pick(c.last),
    pos: coin(0.6) ? S.pos : pick(["PG", "SG", "SF", "PF", "C"].filter(p => p !== S.pos)),
    ovr: ovr() + ri(-1, 3),
    talent: rnd(0.95, 1.2),
    stage: "lise",
    team: { key: tk, name: t.name, city: t.city, cc: "TR", c1: t.c1, c2: t.c2 },
    ppg: 0,
    avg: 6.4,
    hist: [],
    ahead: false
  };
}
export const rivalName = () => (S.rival ? `${S.rival.first} ${S.rival.last}` : S.npc.rival);
export function rivalStageFor(o, age) {
  if (age < 18) return "lise";
  const fits = ["t3", "t2", "t1", "euro", "nba"].filter(st => o >= tdOf(st, "TR") + 45 - 2 && (st !== "nba" || age <= 29));
  if (!fits.length) return age <= 21 ? "uni" : "t3";
  return fits[fits.length - 1];
}
export function rivalSeason() {
  const R = S.rival;
  if (!R || R.retired) return null; // emekli rakip (src/bonds.js)
  const age = S.age; // seasonEnd yaşı artırdıktan sonra çağrılır
  const g = ri(...rivalGrowthRange(age));
  R.ovr = clamp(Math.round(R.ovr + g * R.talent), 25, 95);
  const prev = R.stage,
    st = rivalStageFor(R.ovr, age);
  let moved = null;
  if (st !== prev || (isPro(st) && coin(0.25))) {
    let t;
    if (st === "lise") t = null;
    else if (st === "uni") {
      const u = makeTeam("uni", pick(LEAGUES.TR.cities.filter(c => c !== "İstanbul")), 0);
      t = u;
    } else {
      const cc = st === "nba" ? "US" : coin(0.45) ? "TR" : pick(EU_CC);
      t = pick(leaguePool(st, cc));
    }
    if (t) {
      R.team = { key: t.key, name: t.name, city: t.city, cc: t.cc || "TR", c1: t.c1, c2: t.c2 };
      moved = t;
    }
    R.stage = st;
  }
  const d = R.ovr - (tdOf(R.stage, R.team.cc) + 45);
  R.ppg = +clamp(9 + d * 0.55 + rnd(-2.5, 2.5), 2, 31).toFixed(1);
  R.avg = +clamp(6.5 + d * 0.05 + rnd(-0.4, 0.4), 5, 8.9).toFixed(2);
  R.hist.push({ age: age - 1, stage: R.stage, team: R.team.name, ppg: R.ppg, avg: R.avg });
  if (moved) news($t("lc.nRival", { v: rivalName(), club: moved.name, level: levelName(R.stage) }));
  return moved;
}
// Sezon sonu kıyas kartı; rakip seni geçtiyse ya da sen onu geçtiysen hikâye anı
export function rivalCard(avg) {
  const R = S.rival;
  if (!R) return "";
  const my = ORDER.indexOf(S.stage),
    his = ORDER.indexOf(R.stage);
  const ss = S.hist.length ? S.hist[S.hist.length - 1] : null,
    myP = ss && ss.g ? (ss.pts / ss.g).toFixed(1) : "0.0";
  let line;
  if (his > my && !R.ahead) {
    R.ahead = true;
    S.buffs.train = (S.buffs.train || 0) + 4;
    line = $t("story.24", {
      first: R.first
    });
  } else if (my > his && R.ahead) {
    R.ahead = false;
    S.rel.taraf += 5;
    line = $t("story.25", {
      first: R.first
    });
  } else
    line =
      his > my
        ? $t("story.26", {
            first: R.first
          })
        : my > his
          ? $t("story.27", {
              first: R.first
            })
          : $t("story.28");
  return `<div class="card"><div class="eyebrow">${$t("story.29", {
    v: esc(rivalName())
  })}</div><div class="tbl"><table><tr><th></th><th>${$t("story.30")}</th><th>${esc(R.first)}</th></tr><tr><td>${$t("story.31")}</td><td>${levelName(S.stage)}</td><td>${levelName(R.stage)}</td></tr><tr><td>${$t("data.36")}</td><td>${esc(S.team.short || S.team.name)}</td><td>${esc(R.team.name)}</td></tr><tr><td>${$t("story.32")}</td><td>${myP}</td><td>${R.ppg}</td></tr><tr><td>${$t("story.33")}</td><td>${avg.toFixed(2)}</td><td>${R.avg}</td></tr><tr><td>${$t("match.58")}</td><td>${ovr()}</td><td>${R.ovr}</td></tr></table></div><p class="small">${line}</p></div>`;
}
export function rivalInfo() {
  const R = S.rival;
  return `<div class="card"><div class="eyebrow">${$t("story.29", {
    v: esc(rivalName())
  })}</div><div class="kv"><span>${$t("data.36")}</span><b>${esc(R.team.name)}</b><span>${$t("story.31")}</span><b>${levelName(R.stage)}</b><span>${$t("match.58")}</span><b>${R.ovr}</b><span>${$t("story.35")}</span><b>${$t(
    "story.36",
    {
      ppg: R.ppg,
      avg: R.avg
    }
  )}</b></div>${
    R.hist.length
      ? `<div class="tbl"><table><tr><th>${$t("story.34")}</th><th>${$t("data.36")}</th><th>${$t("arcade.6")}</th><th>${$t("extras.30")}</th></tr>${R.hist
          .slice(-6)
          .reverse()
          .map(h => `<tr><td>${h.age}</td><td>${esc(h.team)}</td><td>${h.ppg}</td><td>${h.avg}</td></tr>`)
          .join("")}</table></div>`
      : ""
  }</div>`;
}
/** Önemli maç: final, yarı final, rakip oyuncuyla derbi, ligin ilk ikisinin zirve maçı. Hızlı haftada "kendin oyna"
    öne çıkarılır; elle oynayana taraftar ve takipçi bonusu verilir (finishMatch). */
export function bigMatch() {
  if (!S || S.injury || !S.league || !S.teams) return null;
  if (S.phase === "final") return { kind: "final", label: $t("big.final") };
  if (S.phase === "semi") return { kind: "semi", label: $t("big.semi") };
  const fx = fixture(),
    opp = fx && teamByKey(fx.opp);
  if (!opp) return null;
  if (isDerby(opp)) return { kind: "derby", label: $t("big.derby", { v: derbyWho(opp) }) };
  const top = standings()
    .slice(0, 2)
    .map(r => r.key);
  if (S.week >= 4 && top.includes(S.team.key) && top.includes(opp.key)) return { kind: "top", label: $t("big.top") };
  return null;
}
// derbi: kişisel rakibinin takımı ya da şehrin ezeli rakibi (src/derby.js)
export const isRivalDerby = opp => !!(S.rival && opp && S.rival.team && opp.key === S.rival.team.key);
export const isDerby = opp => isRivalDerby(opp) || !!(opp && late.dbyArchKey() === opp.key);
/** Derbinin karşı tarafı: kişisel rakip adı ya da ezeli rakip kulüp */
export const derbyWho = opp => (isRivalDerby(opp) ? rivalName() : (opp && opp.name) || "");
export function derbyResult(win) {
  if (!isRivalDerby(M.opp)) return late.dbyResult(win); // ezeli rakip derbisi: şehir hikâyesi
  const R = S.rival,
    rp = Math.max(0, Math.round(R.ppg * rnd(0.55, 1.45)));
  const beat = M.pts > rp,
    txt = $t("story.37", {
      first: R.first,
      rp: rp,
      pts: M.pts
    });
  if (win && beat) {
    S.rel.taraf += 6;
    S.followers = Math.round(S.followers * 1.04);
    S.moral += 6;
    news(
      $t("story.160", {
        v: fullName(),
        pts: M.pts,
        v2: rivalName(),
        rp: rp
      })
    );
  } else if (!win && !beat) {
    S.moral -= 4;
    news(
      $t("story.161", {
        v: rivalName(),
        rp: rp
      })
    );
  }
  return {
    rp,
    txt:
      win && beat
        ? $t("story.38", {
            txt: txt
          })
        : !win && !beat
          ? $t("story.39", {
              first: R.first,
              rp: rp,
              pts: M.pts
            })
          : txt
  };
}

/* ================= KOÇUN GÜVENİ: SEZON İÇİ ROL ================= */
export function roleReview() {
  if (!isPro(S.stage) || S.phase !== "regular" || ![5, 9, 13].includes(S.week)) return false;
  const last = rated().slice(-4);
  if (last.length < 3) return false;
  // koçun kişiliği ve takım arkadaşlarıyla ilişkiler (src/chars.js) güvenin hesabını değiştirir
  const tm = late.trustMods(),
    rec = last.reduce((a, r) => a + r.rating, 0) / last.length,
    trust = S.rel.koc + tm.base + late.traitTrust() + (rec - 6.5) * tm.recW + dominance() * 1.2 + late.systemFit() * tm.fitW;
  const order = ["bench", "rot", "star"],
    i = order.indexOf(S.role);
  let to = null,
    why = "";
  if (i < 2 && trust >= (i === 0 ? 58 : 70) && rec >= (i === 0 ? 6.7 : 7.2) && dominance() >= (i === 0 ? -8 : 0)) {
    to = order[i + 1];
    why = i === 0 ? $t("story.40") : $t("story.41");
  } else if (i > 0 && (trust < (i === 2 ? 46 : 30) || rec < (i === 2 ? 6.2 : 5.6))) {
    // ilk beşte kalmak da emek ister: kötü seri ya da koçla bozulan ilişki yedek kulübesine götürür
    to = order[i - 1];
    why = i === 2 ? $t("story.42") : $t("story.43");
  }
  if (!to) return false;
  const up = order.indexOf(to) > i;
  Bus.emit("role:change", { from: S.role, to });
  S.role = to;
  S.moral += up ? 8 : -8;
  news(`${S.team.short}: ${fullName()} ${up ? $t("story.162") : $t("story.163")} (${ROLE_N[to]}).`);
  save();
  late.sfx(up ? "levelup" : "lose");
  sheet(
    up ? $t("story.44") : $t("story.45"),
    $t("match.38", {
      coach: S.npc.coach
    }),
    `<div class="who"><div id="rcp"></div><div class="say">${why}</div></div><div class="kv"><span>${$t("story.46")}</span><b class="${up ? "good" : "bad"}">${ROLE_N[to]}</b><span>${$t("story.47")}</span><b>${rec.toFixed(2)}</b><span>${$t("match.42")}</span><b>${S.rel.koc}</b></div><p class="small muted">${$t("story.48")}</p><button class="btn pri" id="rok">${$t("ads.25")}</button>`,
    { noClose: true }
  );
  const cl = LK.coach();
  cl[1].mood = up ? "mutlu" : "kizgin";
  $("#rcp").appendChild(portrait(cl[0], cl[1]));
  $("#rok").onclick = () => closeSheet();
  return true;
}

/* ================= BASIN TOPLANTISI ================= */
// Basın toplantısı: derbi ve finalde her zaman; diğer önemli maçlarda en az 4 hafta arayla (sezonda ~3-4 kez)
export function pressDue(win) {
  if (M.rating == null || (M.auto && !isDerby(M.opp))) return false;
  const now = S.season * 20 + S.week,
    due = isDerby(M.opp) || S.phase === "final" || !S.pressLast || now - S.pressLast >= 4;
  if (!due) return false;
  let go = false;
  if (isDerby(M.opp) || S.phase === "final") go = true;
  else if (S.phase !== "regular") go = coin(0.6);
  else if (M.rating >= 8.3 || M.rating <= 4.5) go = S.stage !== "lise" || coin(0.5);
  else go = isPro(S.stage) && coin(0.12);
  if (go) S.pressLast = now;
  return go;
}
export function pressFollowUp(win) {
  const p = S.press;
  if (!p || M.rating == null) return "";
  S.press = null;
  if (p.tone === "bold") {
    if (win) {
      S.rel.taraf += 4;
      S.followers = Math.round(S.followers * 1.02);
      return $t("story.49", {
        quote: p.quote
      });
    }
    S.moral -= 6;
    S.rel.taraf -= 4;
    return $t("story.50", {
      quote: p.quote
    });
  }
  if (p.tone === "humble" && win) {
    S.rel.takim += 2;
    return "";
  }
  return "";
}
export function pressConference(win, after) {
  const derby = isRivalDerby(M.opp),
    R = S.rival,
    j = S.npc.journalist,
    dr = isDerby(M.opp) ? derbyResult(win) : null;
  const q = derby
    ? $t("story.51", {
        txt: dr.txt,
        first: R.first
      })
    : dr
      ? `${dr.txt} ${win ? $t("story.56") : $t("story.57")}`
      : S.phase !== "regular"
        ? win
          ? $t("story.52")
          : $t("story.53")
        : M.rating >= 8.3
          ? $t("story.54", {
              pts: M.pts
            })
          : M.rating <= 4.5
            ? $t("story.55")
            : win
              ? $t("story.56")
              : $t("story.57");
  const A = derby
    ? [
        [
          "humble",
          $t("story.58", {
            first: R.first
          })
        ],
        ["confident", $t("story.59")],
        [
          "bold",
          $t("story.60", {
            pos: S.pos
          })
        ]
      ]
    : win
      ? [
          ["humble", $t("story.61")],
          ["confident", $t("story.62")],
          ["bold", $t("story.63")]
        ]
      : [
          ["humble", $t("story.64")],
          ["confident", $t("story.65")],
          ["bold", $t("story.66")]
        ];
  sheet(
    $t("ads.13"),
    $t("story.67", {
      name: M.opp.name
    }),
    `<div class="who"><div id="pcp"></div><div><div class="eyebrow">${$t("story.68", {
      j: esc(j)
    })}</div><div class="say">"${q}"</div></div></div><div class="choices" id="pch">${A.map(([k, t]) => `<button class="choice" data-press="${k}"><span class="ct" style="font-size:1rem;text-transform:none;letter-spacing:0">${esc(t)}</span><span class="cd">${{ humble: $t("story.130"), confident: $t("story.131"), bold: $t("story.132") }[k]}</span></button>`).join("")}</div>`,
    { noClose: true }
  );
  const pl = LK.press();
  $("#pcp").appendChild(portrait(pl[0], pl[1]));
  $$("[data-press]").forEach(
    b =>
      (b.onclick = () => {
        Bus.emit("press", { tone: b.dataset.press });
        const k = b.dataset.press,
          quote = A.find(a => a[0] === k)[1].replace(/"/g, "");
        let out;
        if (k === "humble") {
          S.rel.koc += 3;
          S.rel.takim += 4;
          S.rel.taraf += 1;
          out = $t("story.69");
        } else if (k === "confident") {
          S.rel.taraf += 4;
          S.followers = Math.round(S.followers * 1.02);
          S.moral += 2;
          out = $t("story.70");
        } else {
          S.rel.taraf += 8;
          S.followers = Math.round(S.followers * 1.05);
          S.rel.koc -= 4;
          S.rel.takim -= 2;
          if (!win && !derby) S.money -= Math.round((S.wage || 10) * 0.5);
          out = !win && !derby ? $t("story.71") : $t("story.72");
          S.press = { tone: "bold", quote: quote.length > 60 ? quote.slice(0, 57) + "…" : quote };
        }
        if (k === "humble") S.press = { tone: "humble", quote };
        norm();
        save();
        $("#pch").innerHTML =
          `<div class="say" style="border-left-color:var(--warn)">${out}</div><button class="btn pri" id="pok">${$t("ads.25")}</button>`;
        $("#pok").onclick = () => {
          closeSheet();
          after();
        };
      })
  );
}

/* ================= HİKÂYE ZİNCİRLERİ ================= */
export function arcSheet(title, who, look, text, choices, after) {
  sheet(
    title,
    who,
    `<div class="who"><div id="ap"></div><div class="say">${text}</div></div><div class="choices" id="ach">${choices.map((c, i) => `<button class="choice" data-arc="${i}"><span class="ct" style="font-size:1.02rem">${c.t}</span>${c.d ? `<span class="cd">${c.d}</span>` : ""}</button>`).join("")}</div>`,
    { noClose: true }
  );
  $("#ap").appendChild(portrait(look[0], look[1]));
  $$("[data-arc]").forEach(
    b =>
      (b.onclick = () => {
        const out = choices[+b.dataset.arc].do();
        norm();
        save();
        $("#ach").innerHTML =
          `<div class="say" style="border-left-color:var(--warn)">${out}</div><button class="btn pri" id="aok">${$t("ads.25")}</button>`;
        $("#aok").onclick = () => {
          closeSheet();
          after && after();
        };
      })
  );
}
export const msg = (title, who, look, text) => arcSheet(title, who, look, text, [{ t: $t("ads.25"), do: () => $t("story.73") }]);
export function migrateStory() {
  S.arcs = S.arcs || {};
  S.arcQ = S.arcQ || [];
  if (!S.rival && S.league && S.team) {
    S.rival = makeRival();
    S.npc.rival = rivalName();
  }
}
export function storyTick() {
  const A = S.arcs;
  // kuyruktaki tek seferlik anlar
  if (S.arcQ.length) {
    const id = S.arcQ.shift();
    if (ARC_ONCE[id]) {
      ARC_ONCE[id]();
      return true;
    }
  }
  for (const id of Object.keys(ARCS)) {
    const a = ARCS[id],
      st = A[id];
    if (st && st.season === S.season && st.next && S.week >= st.next) {
      const f = a.steps[st.step];
      st.step++;
      st.next = a.gaps && a.gaps[st.step] ? S.week + a.gaps[st.step] : 0;
      Bus.emit("arc", { id, step: st.step });
      f(st);
      return true;
    }
    if ((!st || (a.repeat && st.season !== S.season)) && a.when() && coin(a.p)) {
      A[id] = { season: S.season, step: 1, next: a.gaps ? S.week + a.gaps[1] : 0, choice: null };
      Bus.emit("arc", { id, step: 1 });
      a.steps[0](A[id]);
      return true;
    }
  }
  return false;
}
export const ARCS = {
  // Transfer söylentisi: menajer, üst seviyeden bir kulübün seni izlediğini söyler
  rumor: {
    repeat: true,
    p: 0.5,
    gaps: [0, 4],
    when: () =>
      isPro(S.stage) &&
      S.stage !== "nba" &&
      S.week === 6 &&
      S.phase === "regular" &&
      rated().length >= 4 &&
      seasonAvg() >= 7 &&
      !(S.arcs.rumor && S.arcs.rumor.season >= S.season - 1),
    steps: [
      a => {
        const nx = ORDER[ORDER.indexOf(S.stage) + 1],
          cc = nx === "nba" ? "US" : coin(0.4) ? "TR" : pick(EU_CC),
          t = pick(leaguePool(nx, cc));
        a.club = t.key;
        a.team = t; // takım listesine kayıtlı olmayabilir; teklif için nesneyi sakla
        a.stage = nx;
        a.cc = t.cc;
        arcSheet(
          $t("story.74"),
          $t("story.75", {
            agent: S.npc.agent
          }),
          LK.agent(),
          $t("story.76", {
            name: esc(t.name),
            nx: levelName(nx)
          }),
          [
            {
              t: $t("story.133"),
              d: $t("story.134"),
              do: () => {
                a.choice = "focus";
                S.rel.koc += 6;
                S.rel.takim += 3;
                return $t("story.77");
              }
            },
            {
              t: $t("story.135"),
              d: $t("story.136"),
              do: () => {
                a.choice = "open";
                S.rel.koc -= 6;
                S.rel.taraf -= 4;
                return $t("story.78", {
                  name: esc(t.name)
                });
              }
            },
            {
              t: $t("story.137"),
              d: $t("story.138"),
              do: () => {
                a.choice = "loyal";
                S.rel.taraf += 8;
                S.rel.koc += 4;
                return $t("story.79");
              }
            }
          ],
          () => {}
        );
      },
      a => {
        const t = teamByKey(a.club),
          rank = standings().findIndex(r => r.key === S.team.key) + 1;
        if (a.choice === "open" && rank > 4) {
          S.moral -= 6;
          S.rel.taraf -= 5;
          msg(
            $t("story.80"),
            $t("story.81"),
            LK.press(),
            `${$t("story.83", {
              rank: rank
            })}${t ? esc(t.name) : $t("story.82")}${$t("story.84")}`
          );
        } else if (a.choice === "focus") {
          S.moral += 4;
          msg($t("story.85"), $t("story.81"), LK.press(), `${$t("story.87")} ${t ? esc(t.name) + $t("story.86") : ""}`);
        } else if (a.choice === "loyal") {
          S.moral += 3;
          msg($t("story.88"), $t("story.81"), LK.press(), $t("story.89"));
        } else msg($t("story.90"), $t("story.81"), LK.press(), $t("story.91"));
      }
    ]
  },
  // Aile meselesi: babanın dükkânı zor durumda
  family: {
    p: 0.35,
    gaps: [0, 4],
    when: () => isPro(S.stage) && S.age >= 19 && S.age <= 27 && S.week === 4 && S.phase === "regular" && !S.arcs.family,
    steps: [
      a => {
        const cost = Math.max(60, Math.round((S.wage || 40) * 3));
        a.cost = cost;
        arcSheet(
          $t("story.92"),
          $t("story.93", {
            mom: S.npc.mom
          }),
          LK.mom(),
          $t("story.94", {
            dad: S.npc.dad
          }),
          [
            {
              t: $t("rc.st.sendMoney", { v: fmt(cost) }),
              d: $t("story.139"),
              do: () => {
                a.choice = "pay";
                tx($t("places.347"), -cost);
                S.rel.aile += 15;
                S.moral += 4;
                return $t("story.95");
              }
            },
            {
              t: $t("story.140"),
              d: $t("story.141"),
              do: () => {
                a.choice = "advice";
                S.rel.aile -= 4;
                return $t("story.96");
              }
            },
            {
              t: $t("story.142"),
              d: $t("story.143"),
              do: () => {
                a.choice = "visit";
                S.energy -= 20;
                S.rel.aile += 20;
                S.rel.koc -= 4;
                return $t("story.97");
              }
            }
          ],
          () => {}
        );
      },
      a => {
        if (a.choice === "pay") {
          S.rel.taraf += 3;
          S.moral += 4;
          msg(
            $t("story.98"),
            $t("story.99", {
              dad: S.npc.dad
            }),
            LK.dad(),
            $t("story.100")
          );
        } else if (a.choice === "advice") {
          S.rel.aile += 4;
          msg(
            $t("story.101"),
            $t("story.99", {
              dad: S.npc.dad
            }),
            LK.dad(),
            $t("story.102")
          );
        } else {
          S.rel.aile += 6;
          S.moral += 3;
          msg(
            $t("story.103"),
            $t("story.93", {
              mom: S.npc.mom
            }),
            LK.mom(),
            $t("story.104")
          );
        }
      }
    ]
  },
  // Lise kaptanlığı (ikinci lise yılı)
  captain: {
    p: 1,
    when: () => S.stage === "lise" && S.stageSeason === 2 && S.week === 2 && !S.arcs.captain,
    steps: [
      a =>
        arcSheet(
          $t("story.105"),
          $t("match.38", {
            coach: S.npc.coach
          }),
          LK.coach(),
          $t("story.106"),
          [
            {
              t: $t("story.144"),
              d: $t("story.145"),
              do: () => {
                a.choice = "yes";
                S.rel.takim += 8;
                S.rel.koc += 4;
                S.captain = true;
                return $t("story.107");
              }
            },
            {
              t: $t("story.146"),
              d: $t("story.147"),
              do: () => {
                a.choice = "no";
                S.rel.koc -= 3;
                return $t("story.108");
              }
            }
          ],
          () => {}
        )
    ]
  },
  // Üniversite final haftası
  finals: {
    repeat: true,
    p: 1,
    when: () =>
      S.stage === "uni" &&
      S.studying &&
      S.week === 11 &&
      S.phase === "regular" &&
      !(S.arcs.finals && S.arcs.finals.season === S.season),
    steps: [
      a =>
        arcSheet(
          $t("story.109"),
          $t("story.110"),
          LK.friend(),
          $t("story.111", {
            aka: S.aka
          }),
          [
            {
              t: $t("story.148"),
              d: $t("story.149"),
              do: () => {
                S.aka += 15;
                S.energy -= 15;
                return $t("story.112");
              }
            },
            {
              t: $t("story.150"),
              d: $t("story.151"),
              do: () => {
                S.aka -= 10;
                S.buffs.train = (S.buffs.train || 0) + 2;
                return $t("story.113");
              }
            },
            {
              t: $t("story.152"),
              d: $t("story.153"),
              do: () => {
                S.aka += 6;
                S.energy -= 6;
                return $t("story.114");
              }
            }
          ],
          () => {}
        )
    ]
  },
  // Mentor: deneyimli bir takım arkadaşı genç oyuncuyu kanatları altına alır
  mentor: {
    p: 0.5,
    gaps: [0, 6],
    when: () => isPro(S.stage) && S.age >= 18 && S.age <= 22 && S.week === 3 && S.phase === "regular" && !S.arcs.mentor,
    steps: [
      a => {
        const m = late.roster().find(r => r.age >= 30) || late.roster()[0];
        a.name = m.n;
        arcSheet(
          $t("story.164"),
          $t("story.165", {
            n: m.n
          }),
          LK.mate(),
          $t("story.166", {
            n: esc(m.n)
          }),
          [
            {
              t: $t("places.172"),
              d: $t("story.167"),
              do: () => {
                a.choice = "yes";
                S.buffs.train = (S.buffs.train || 0) + 6;
                S.rel.koc += 3;
                S.rel.takim += 4;
                return $t("story.168");
              }
            },
            {
              t: $t("story.169"),
              d: $t("story.170"),
              do: () => {
                a.choice = "no";
                S.rel.takim -= 2;
                S.moral += 2;
                return $t("story.171", {
                  n: esc(m.n)
                });
              }
            }
          ],
          () => {}
        );
      },
      a => {
        if (a.choice !== "yes")
          return msg(
            $t("story.172"),
            $t("story.173", {
              name: a.name
            }),
            LK.mate(),
            $t("story.174", {
              name: esc(a.name)
            })
          );
        const weak = Object.entries(S.st).sort((x, y) => x[1] - y[1])[0][0];
        S.st[weak] += 2;
        msg(
          $t("story.175"),
          $t("story.173", {
            name: a.name
          }),
          LK.mate(),
          $t("story.176", {
            weak: statName(weak),
            name: esc(a.name)
          })
        );
      }
    ]
  },
  // Milli takım kaptanlığı
  natcap: {
    p: 0.6,
    gaps: [0, 5],
    when: () =>
      (S.career.natCaps || 0) >= 10 &&
      S.age >= 26 &&
      S.role === "star" &&
      S.week === 2 &&
      S.phase === "regular" &&
      !S.arcs.natcap,
    steps: [
      a =>
        arcSheet(
          $t("story.177"),
          `${S.npc.natCoach || $t("story.178")} ${$t("story.179")}`,
          LK.coach(),
          $t("story.180"),
          [
            {
              t: $t("story.181"),
              d: $t("story.182"),
              do: () => {
                a.choice = "yes";
                S.natCaptain = true;
                S.rel.taraf += 10;
                S.rel.aile += 8;
                S.moral += 6;
                news(
                  $t("story.183", {
                    v: fullName()
                  })
                );
                return $t("story.184");
              }
            },
            {
              t: $t("story.185"),
              d: $t("story.186"),
              do: () => {
                a.choice = "no";
                S.rel.takim += 4;
                return $t("story.187");
              }
            }
          ],
          () => {}
        ),
      a =>
        a.choice === "yes"
          ? msg($t("story.188"), $t("story.81"), LK.press(), $t("story.189"))
          : msg($t("story.190"), $t("story.81"), LK.press(), $t("story.191"))
    ]
  },
  // Rakip takım arkadaşı oluyor
  rivalmate: {
    p: 0.3,
    gaps: [0, 5],
    when: () =>
      S.rival &&
      isPro(S.stage) &&
      S.rival.stage === S.stage &&
      S.rival.team.key !== S.team.key &&
      S.age >= 23 &&
      S.age <= 30 &&
      S.week === 2 &&
      !S.arcs.rivalmate,
    steps: [
      a => {
        const R = S.rival;
        R.team = { key: S.team.key, name: S.team.name, city: S.team.city, cc: S.team.cc, c1: S.team.c1, c2: S.team.c2 };
        news(
          $t("story.192", {
            v: rivalName(),
            name: S.team.name
          })
        );
        arcSheet(
          $t("story.193"),
          $t("story.194", {
            v: rivalName()
          }),
          LK.rival(),
          $t("story.195", {
            v: esc(rivalName())
          }),
          [
            {
              t: $t("story.196"),
              d: $t("story.197"),
              do: () => {
                a.choice = "peace";
                S.rel.takim += 8;
                S.moral += 3;
                return $t("story.198", {
                  first: esc(R.first)
                });
              }
            },
            {
              t: $t("story.199"),
              d: $t("story.200"),
              do: () => {
                a.choice = "rival";
                S.rel.koc += 4;
                S.rel.takim -= 4;
                S.buffs.train = (S.buffs.train || 0) + 4;
                return $t("story.201", {
                  first: esc(R.first)
                });
              }
            }
          ],
          () => {}
        );
      },
      a => {
        const R = S.rival;
        if (a.choice === "peace") {
          S.rel.takim += 4;
          msg(
            $t("story.202"),
            $t("story.81"),
            LK.press(),
            $t("story.203", {
              first: esc(R.first)
            })
          );
        } else {
          S.moral -= 2;
          msg($t("story.204"), $t("story.81"), LK.press(), $t("story.205"));
        }
      }
    ]
  },
  // Emeklilik kararı ve veda turu
  farewell: {
    p: 1,
    gaps: [0, 8],
    when: () => S.age >= 33 && S.week === 4 && S.phase === "regular" && !S.arcs.farewell && isPro(S.stage),
    steps: [
      a =>
        arcSheet(
          $t("story.206"),
          $t("story.93", {
            mom: S.npc.mom
          }),
          LK.mom(),
          $t("story.207"),
          [
            {
              t: $t("story.208"),
              d: $t("story.209"),
              do: () => {
                a.choice = "last";
                S.farewell = S.season;
                S.rel.taraf += 10;
                S.moral += 6;
                news(
                  $t("story.210", {
                    v: fullName()
                  })
                );
                return $t("story.211");
              }
            },
            {
              t: $t("story.212"),
              d: $t("story.213"),
              do: () => {
                a.choice = "go";
                S.buffs.injWk = 10;
                S.buffs.injMul = 1.3;
                S.moral += 3;
                return $t("story.214");
              }
            },
            {
              t: $t("story.215"),
              d: $t("story.216"),
              do: () => {
                a.choice = "coach";
                S.coachCourse = true;
                S.rel.koc += 6;
                return $t("story.217");
              }
            }
          ],
          () => {}
        ),
      a => {
        if (a.choice === "last") {
          S.rel.taraf += 15;
          S.followers = Math.round(S.followers * 1.1);
          msg($t("story.218"), $t("story.219"), LK.press(), $t("story.220"));
        } else if (a.choice === "coach") msg($t("story.221"), $t("legacy.25"), LK.coach(), $t("story.222"));
        else msg($t("story.223"), $t("story.81"), LK.press(), $t("story.224"));
      }
    ]
  },
  // Geç açılan çiçek: alt liglerde kalmış ama iyi oynayan oyuncuya ikinci şans
  bloomer: {
    p: 0.6,
    gaps: [0, 5],
    when: () =>
      ["t3", "t2"].includes(S.stage) &&
      S.age >= 22 &&
      S.age <= 27 &&
      S.week === 6 &&
      S.phase === "regular" &&
      rated().length >= 4 &&
      seasonAvg() >= 6.5 &&
      !S.arcs.bloomer,
    steps: [
      a => {
        const cost = Math.max(40, Math.round(S.wage * 2));
        a.cost = cost;
        arcSheet(
          $t("story.225"),
          $t("story.226"),
          LK.coach(),
          $t("story.227", {
            cost: fmt(cost)
          }),
          [
            {
              t: $t("rc.st.joinCamp", { v: fmt(cost) }),
              d: $t("story.228"),
              do: () => {
                a.choice = "yes";
                tx($t("story.229"), -cost);
                for (const k in S.st) S.st[k] += 1;
                S.buffs.train = (S.buffs.train || 0) + 10;
                S.moral += 5;
                return $t("story.230");
              }
            },
            {
              t: $t("story.231"),
              d: $t("story.232"),
              do: () => {
                a.choice = "no";
                return $t("story.233");
              }
            }
          ],
          () => {}
        );
      },
      a => {
        if (a.choice !== "yes") return msg($t("story.234"), $t("story.235"), LK.agent(), $t("story.236"));
        const nx = ORDER[ORDER.indexOf(S.stage) + 1],
          cc = coin(0.5) ? "TR" : pick(EU_CC),
          t = pick(leaguePool(nx, cc));
        a.club = t.key;
        a.team = t; // takım listesine kayıtlı olmayabilir
        a.stage = nx;
        msg(
          $t("story.237"),
          $t("story.75", {
            agent: S.npc.agent
          }),
          LK.agent(),
          $t("story.238", {
            name: esc(t.name)
          })
        );
      }
    ]
  }
};
// Tek seferlik kuyruk anları
export const ARC_ONCE = {
  comeback: () =>
    arcSheet(
      $t("story.115"),
      $t("match.38", {
        coach: S.npc.coach
      }),
      LK.coach(),
      $t("story.116"),
      [
        {
          t: $t("story.154"),
          d: $t("story.155"),
          do: () => {
            S.buffs.injWk = 6;
            S.buffs.injMul = 0.5;
            S.energy += 10;
            S.rel.koc += 2;
            return $t("story.117");
          }
        },
        {
          t: $t("story.156"),
          d: $t("story.157"),
          do: () => {
            S.buffs.injWk = 5;
            S.buffs.injMul = 1.8;
            S.moral += 6;
            S.rel.taraf += 3;
            return $t("story.118");
          }
        }
      ],
      () => {}
    )
};

/* ---- Mevcut akışa bağlantılar (olay sistemi üzerinden) ---- */
Bus.on("week:start", () => {
  if (S.buffs.injWk > 0) S.buffs.injWk--;
});
Bus.offer("week:sheet", roleReview, 20);
Bus.offer("week:sheet", storyTick, 30);
// Uzun sakatlık bitince dönüş hikâyesi
Bus.on("injury:healed", inj => {
  if ((inj.total || 0) >= 3) S.arcQ.push("comeback");
});
// Maç sonrası: önceki basın sözlerinin karşılığı ve yeni basın toplantısı
Bus.use("match:after", (ctx, next) => {
  const win = ctx.win,
    fu = pressFollowUp(win);
  if (fu) {
    news(fu);
    toast(fu);
  }
  if (pressDue(win)) return pressConference(win, next);
  if (isDerby(M.opp) && M.rating != null) {
    const d = derbyResult(win);
    toast(d.txt);
  }
  next();
});
// Sezon sonu teklifleri: transfer söylentisinin sonucu
export function storyOffers(offers) {
  const bl = S.arcs && S.arcs.bloomer;
  if (bl && bl.club && !bl.done && bl.season === S.season - 1) {
    bl.done = true;
    const t = teamByKey(bl.club) || bl.team;
    if (t && !offers.some(o => o.team.key === t.key))
      offers.push({
        team: t,
        stage: bl.stage,
        role: "rot",
        wage: Math.round(WAGE[bl.stage] * ((LEAGUES[t.cc] || LEAGUES.TR).pr || 1)),
        years: 2,
        note: $t("story.239", {
          stage: levelName(bl.stage)
        })
      });
  }
  const a = S.arcs && S.arcs.rumor;
  if (!a || a.season !== S.season - 1 || a.done) return offers;
  a.done = true;
  const t = teamByKey(a.club) || a.team;
  if (!t) return offers;
  const avg = seasonAvgOf();
  if (a.choice === "loyal") {
    const s = offers.find(o => o.stay);
    if (s) {
      s.wage = Math.round(s.wage * 1.15);
      s.note = $t("story.119");
    }
    return offers;
  }
  // söylenti teklifi de normal teklif eşiklerine tabidir (potansiyel, not, NBA yaş sınırı)
  const P = potential(avg, false),
    gate =
      P >= (BAL.need[a.stage] || 0) - 3 &&
      (a.stage !== "nba" || (S.age <= 29 && avg >= 6.8)) &&
      (a.stage !== "euro" || avg >= 6.6);
  if (gate && (a.choice === "open" || (a.choice === "focus" && avg >= 7))) {
    const role = roleAt(ovr(), a.stage, t.cc);
    if (!offers.some(o => o.team.key === t.key))
      offers.push({
        team: t,
        stage: a.stage,
        role: role === "bench" ? "bench" : "rot",
        wage: Math.round(WAGE[a.stage] * ((LEAGUES[t.cc] || LEAGUES.TR).pr || 1) * (a.choice === "open" ? 1.2 : 1.1)),
        years: 2,
        note: $t("story.158", {
          stage: levelName(a.stage)
        })
      });
  }
  return offers;
}
// Maç sekmesine derbi uyarısı
export function derbyNote(opp) {
  if (isDerby(opp) && !isRivalDerby(opp)) return late.dbyNoteHTML(opp);
  return isDerby(opp)
    ? `<div class="say" style="border-left-color:var(--bad)"><b>${$t("story.120")}</b> ${$t("story.121", {
        v: esc(rivalName())
      })}</div>`
    : "";
}
