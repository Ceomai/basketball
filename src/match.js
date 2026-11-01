import { t as $t } from "./i18n/index.js";
import { dominanceOf, eligibleStages, matchBonus, offerWage, potentialScore, weeklyLedger } from "./logic/rules.js";
import { late } from "./late.js";
import {
  $,
  $$,
  BAL,
  Bus,
  EU_CC,
  LEAGUES,
  ORDER,
  POS,
  SIM,
  STATS,
  WAGE,
  cOf,
  cityTheme,
  clamp,
  esc,
  fmt,
  hash,
  isPro,
  kfmt,
  leagueName,
  pick,
  ri,
  rnd,
  roleAt,
  statName,
  tdOf,
  toast
} from "./data.js";
import { leaguePool } from "./clubs.js";
import { SKINS, portrait } from "./art.js";
import { mgBlock, mgDribble, mgPass, mgPost, mgRebound, mgShoot, mgTiming } from "./games.js";
import {
  ROLE_N,
  S,
  app,
  chapter,
  closeSheet,
  crestSVG,
  eff,
  fame,
  fullName,
  jersey,
  lgName,
  makeTeam,
  newSeasonLeague,
  news,
  norm,
  ovr,
  phaseName,
  renderMain,
  seasonLabel,
  setTeamVars,
  sheet,
  standings,
  teamByKey,
  tx
} from "./core.js";
import { renderSlots, save } from "./save.js";
import { HOUSING } from "./places.js";
import { carUpkeep, itemWeekly } from "./shops.js";
/* ================= MAÇ ================= */
export let M = null;
export function bugHTML() {
  const us = S.team,
    op = M.opp;
  const L = M.home ? [us, M.us, op, M.them] : [op, M.them, us, M.us];
  return `<div class="bug"><div class="side"><span class="stripe" style="background:${L[0].c1}"></span><div style="min-width:0"><div class="ab">${esc(L[0].short)}</div><div class="full">${esc(L[0].name)}</div></div><div class="sc">${L[1]}</div></div>
   <div class="mid"><div class="q">${$t("common.q", { n: M.q })}</div><div class="clk">${M.clock}</div></div>
   <div class="side r"><span class="stripe" style="background:${L[2].c1}"></span><div style="min-width:0"><div class="ab">${esc(L[2].short)}</div><div class="full">${esc(L[2].name)}</div></div><div class="sc">${L[3]}</div></div></div>`;
}
export function updBug() {
  const b = $("#bug");
  if (b) b.innerHTML = bugHTML();
}
export const odds = e => (e >= 55 ? ["e", $t("match.1")] : e >= 32 ? ["m", $t("match.2")] : ["h", $t("match.3")]);
export function oppName() {
  const c = cOf(M.opp.city);
  return `${pick(c.first)[0]}. ${pick(c.last)}`;
}
export function addFeed(t) {
  M.feed.unshift({ t: `${$t("common.q", { n: M.q })} ${M.clock}`, x: t });
  const f = $("#feed");
  if (f) f.innerHTML = M.feed.map(x => `<div><time>${x.t}</time><span>${x.x}</span></div>`).join("");
}
export const PEN = { pull: 6, catch: 4, wing: 5, step: 2, pop: 2, lob: -4, pnr: 0, kick: -6 };
export async function resolvePlay(k, el, sur, dn) {
  const three = ["pull", "catch", "wing"],
    mid = ["step", "pop", "mid"];
  if (three.includes(k) || mid.includes(k)) {
    const th = three.includes(k);
    const r = await mgShoot(el, {
      eff: eff("sut") - (PEN[k] || 0),
      shots: 1,
      title: th ? $t("match.4") : $t("match.5"),
      dist: th ? "three" : "mid"
    });
    M.pts += r.pts;
    return {
      good: r.made > 0,
      w: th ? 1.3 : 1,
      st: "sut",
      txt: r.made
        ? `${sur} ${th ? $t("match.6") : $t("match.7")}`
        : $t("match.8", {
            sur: sur
          })
    };
  }
  if (k === "drive" || k === "break") {
    const r = await mgDribble(el, { eff: eff("hiz"), reps: 1, title: k === "break" ? $t("match.9") : $t("match.10") });
    if (!r.ok)
      return {
        good: false,
        w: 1,
        st: "hiz",
        txt: $t("match.96", {
          sur: sur
        })
      };
    if (k === "break") {
      M.pts += 2;
      return {
        good: true,
        w: 1.2,
        st: "hiz",
        txt: $t("match.97", {
          sur: sur
        })
      };
    }
    if (Math.random() < 0.18) {
      M.pts += 2;
      addFeed(
        $t("match.11", {
          sur: sur,
          dn: dn
        })
      );
      const f = await mgTiming(el, { eff: eff("sut") + 10, title: $t("match.98"), tries: 1, label: $t("games.8") });
      M.pts += f.ok;
      return { good: true, w: 1.2, st: "hiz", txt: f.ok ? $t("match.12") : $t("match.13") };
    }
    if (Math.random() < 0.88) {
      M.pts += 2;
      return {
        good: true,
        w: 1,
        st: "hiz",
        txt: $t("match.99", {
          sur: sur,
          dn: dn
        })
      };
    }
    return {
      good: true,
      w: 0.6,
      st: "hiz",
      txt: $t("match.100", {
        sur: sur
      })
    };
  }
  if (k === "pnr" || k === "kick" || k === "lob") {
    const r = await mgPass(el, {
      eff: eff("pas") - (PEN[k] || 0),
      reps: 1,
      title: k === "lob" ? $t("data.80") : k === "pnr" ? $t("match.14") : $t("data.31")
    });
    if (!r.ok)
      return {
        good: false,
        w: 1,
        st: "pas",
        txt: $t("match.101", {
          sur: sur
        })
      };
    const conv = (k === "lob" ? 0.75 : 0.58) + S.rel.takim * 0.003 + (late.chemAvg() - 40) * 0.002;
    if (Math.random() < conv) {
      M.ast++;
      return {
        good: true,
        w: k === "lob" ? 1.3 : 1,
        st: "pas",
        txt:
          k === "lob"
            ? $t("match.15", {
                sur: sur
              })
            : $t("match.16", {
                sur: sur
              })
      };
    }
    return {
      good: true,
      w: 0.6,
      st: "pas",
      txt: $t("match.102", {
        sur: sur
      })
    };
  }
  if (k === "post") {
    const r = await mgPost(el, { eff: eff("guc"), reps: 1, title: $t("data.107") });
    if (r.ok) M.pts += 2;
    return {
      good: r.ok > 0,
      w: 1.2,
      st: "guc",
      txt: r.ok
        ? $t("match.17", {
            sur: sur,
            dn: dn
          })
        : $t("match.18", {
            sur: sur
          })
    };
  }
  if (k === "dunk") {
    const r = await mgTiming(el, { eff: eff("guc") + 5, title: $t("data.132"), tries: 1, label: $t("games.37"), kind: "dunk" });
    if (r.ok) M.pts += 2;
    return {
      good: r.ok > 0,
      w: 1.3,
      st: "guc",
      txt: r.ok
        ? $t("match.19", {
            sur: sur
          })
        : $t("match.20", {
            sur: sur
          })
    };
  }
  if (k === "putback" || k === "reb") {
    const r = await mgRebound(el, { eff: eff("guc"), reps: 1, title: k === "reb" ? $t("data.124") : $t("data.120") });
    if (r.ok) {
      M.reb++;
      if (k === "reb") {
        M.stops++;
        return {
          good: true,
          w: 1,
          st: "guc",
          txt: $t("match.103", {
            sur: sur
          })
        };
      }
      if (Math.random() < 0.8) {
        M.pts += 2;
        return {
          good: true,
          w: 1.2,
          st: "guc",
          txt: $t("match.104", {
            sur: sur
          })
        };
      }
      return {
        good: true,
        w: 0.6,
        st: "guc",
        txt: $t("match.105", {
          sur: sur
        })
      };
    }
    return {
      good: false,
      w: 1,
      st: "guc",
      txt: $t("match.106", {
        dn: dn
      })
    };
  }
  if (k === "block") {
    const r = await mgBlock(el, { eff: (eff("sav") + eff("guc")) / 2, reps: 1, title: $t("data.111") });
    if (r.ok) {
      M.blk++;
      M.stops++;
    }
    return {
      good: r.ok > 0,
      w: 1.2,
      st: "sav",
      txt: r.ok
        ? $t("match.21", {
            sur: sur,
            dn: dn
          })
        : $t("match.22", {
            dn: dn
          })
    };
  }
  if (k === "steal") {
    const r = await mgTiming(el, {
      eff: eff("hiz") - 6,
      title: $t("match.107"),
      tries: 1,
      label: $t("match.108"),
      kind: "steal"
    });
    if (r.ok) M.stl++;
    return {
      good: r.ok > 0,
      w: 1.2,
      st: "hiz",
      txt: r.ok
        ? $t("match.23", {
            sur: sur
          })
        : $t("match.24", {
            sur: sur,
            dn: dn
          })
    };
  }
  if (k === "charge") {
    const ok = Math.random() < clamp((eff("sav") / 100) * 0.6 + 0.15, 0.1, 0.75);
    if (ok) M.stops++;
    return {
      good: ok,
      w: 1.1,
      st: "sav",
      txt: ok
        ? $t("match.25", {
            sur: sur
          })
        : $t("match.26")
    };
  }
  if (k === "safe") {
    const ok = Math.random() < clamp((eff(S.pos === "PF" ? "guc" : "sav") / 100) * 0.7 + 0.25, 0.2, 0.9);
    if (ok) M.stops++;
    return {
      good: ok,
      w: 0.5,
      st: "sav",
      txt: ok
        ? $t("match.27", {
            sur: sur,
            dn: dn
          })
        : $t("match.22", {
            dn: dn
          })
    };
  }
  const r = await mgTiming(el, { eff: eff("sut") + 12, title: $t("data.70"), tries: 2, label: $t("games.8") });
  M.pts += r.ok;
  return {
    good: r.ok > 0,
    w: 0.6,
    st: "sut",
    txt: $t("match.109", {
      sur: sur,
      ok: r.ok
    })
  };
}
export function finishMatch(win) {
  Bus.emit("match:end", { win, rating: M.rating, pts: M.pts, auto: !!M.auto, stage: S.stage, us: M.us, them: M.them });
  late.recordGame();
  late.sfx(win ? "win" : "lose");
  const r = M.rating,
    opp = M.opp;
  S.buffs.motive = 0;
  const bonus = matchBonus({ stage: S.stage, wage: S.wage, rating: r, win });
  if (S.clauses && S.clauses.perf && r >= 7.5) tx($t("match.132"), Math.round(S.wage * 0.15));
  // önemli maçı kendin oynadıysan: taraftar ve takipçi (kazanınca daha çok)
  if (M.big && !M.auto) {
    S.rel.taraf += win ? 4 : 2;
    S.followers = Math.round(S.followers * (win ? 1.05 : 1.02));
    news($t("big.news", { v: fullName(), label: M.big.label }));
  }
  tx(
    $t("match.116", {
      short: opp.short
    }),
    bonus
  );
  S.rel.koc += Math.round((r - 6) * 3);
  S.rel.taraf += Math.round((r - 5.5) * 2 + (win ? 2 : 0));
  S.rel.takim += win ? 3 : -1;
  S.moral += win ? 6 : -6;
  S.energy -= 22;
  S.followers += Math.round(S.followers * (r >= 8 ? 0.06 : r >= 7 ? 0.03 : 0.005) * (win ? 1.3 : 1));
  S.results.push({ opp: opp.key, us: M.us, them: M.them, win, rating: r, pts: M.pts });
  const k = S.career;
  Object.assign(k, {
    games: k.games + 1,
    pts: k.pts + M.pts,
    ast: k.ast + M.ast,
    reb: (k.reb || 0) + M.reb,
    blk: k.blk + M.blk,
    wins: k.wins + (win ? 1 : 0)
  });
  const rankBefore = late.rankNow();
  if (S.phase === "regular") late.updateLeague(win, opp, M.us, M.them);
  // skor ve maç istatistiği Lig merkezinde (fikstür); gündeme yalnızca anlamlı olaylar düşer
  late.matchStoryNews({ win, pts: M.pts, ast: M.ast, reb: M.reb, rankBefore });
  const inj = late.rollInjury();
  norm();
  save();
  const coach = r >= 8 ? $t("match.28") : r >= 6.5 ? $t("match.29") : r >= 5 ? $t("match.30") : $t("match.31");
  sheet(
    win ? $t("match.32") : $t("match.33"),
    `${phaseName()} · ${opp.name}`,
    `
   <div class="row between nowrap"><div class="row nowrap" style="gap:8px">${crestSVG(S.team, 36)}<span class="big-num">${M.us}–${M.them}</span>${crestSVG(opp, 36)}</div><div style="text-align:right"><div class="eyebrow">${$t("match.36")}</div><div class="rating" style="color:${r >= 7 ? "var(--good)" : r >= 5 ? "var(--text)" : "var(--bad)"}">${r.toFixed(1)}</div></div></div>
   <div class="box"><div><b>${M.pts}</b><span class="eyebrow">${$t("arcade.6")}</span></div><div><b>${M.ast}</b><span class="eyebrow">${$t("extras.31")}</span></div><div><b>${M.reb}</b><span class="eyebrow">${$t("data.63")}</span></div><div><b>${M.blk + M.stl}</b><span class="eyebrow">${$t("match.37")}</span></div></div>
   <div class="who"><div id="cp"></div><div><div class="eyebrow">${$t("match.38", {
     coach: esc(S.npc.coach)
   })}</div><div class="say">${coach}</div></div></div>
   <div class="kv"><span>${$t("match.39")}</span><b>${$t("match.40", {
     v: Math.round((M.mins || 0) / 60),
     v2: (M.plus || 0) >= 0 ? "+" : "",
     v3: M.plus || 0
   })}</b><span>${$t("match.41")}</span><b class="good">+${fmt(bonus)}</b><span>${$t("match.42")}</span><b>${S.rel.koc}</b><span>${$t("match.43")}</span><b>${kfmt(S.followers)}</b></div>
   ${
     inj
       ? `<div class="say" style="border-left-color:var(--bad)"><b>${$t("match.34")}</b> ${$t("match.35", {
           n: esc(inj.n),
           w: inj.w
         })}</div>`
       : ""
   }
   ${late.adDoubleHTML(bonus)}<button class="btn pri" id="nx">${$t("ads.25")}</button>`,
    { noClose: true }
  );
  const cl = LK.coach();
  cl[1].mood = r >= 6.5 ? "mutlu" : "kizgin";
  $("#cp").appendChild(portrait(cl[0], cl[1]));
  late.bindAdDouble(bonus);
  $("#nx").onclick = () => late.adsBetween(() => afterMatch(win));
}
// Maç sonrası: önce ara katmanlar (basın toplantısı, derbi), sonra lig akışı
export function afterMatch(win) {
  Bus.run("match:after", { win }, () => afterMatchFlow(win));
}
export function afterMatchFlow(win) {
  let next = () => endWeek();
  if (S.phase === "regular" && S.week >= S.sched.length) {
    const st = standings(),
      rank = st.findIndex(r => r.key === S.team.key) + 1;
    if (rank <= 4) {
      const oi = [3, 2, 1, 0][rank - 1];
      S.phase = "semi";
      S.playoffOpp = st[oi].key;
      S._otherSemi = [0, 1, 2, 3].filter(i => i !== rank - 1 && i !== oi).map(i => st[i].key);
      news(
        $t("match.118", {
          short: S.team.short,
          rank: rank
        })
      );
    } else {
      news(
        $t("match.119", {
          short: S.team.short,
          rank: rank
        })
      );
      next = () => seasonEnd(false, false);
    }
  } else if (S.phase === "semi") {
    if (win) {
      S.phase = "final";
      const o = S._otherSemi,
        a = teamByKey(o[0]),
        b = teamByKey(o[1]);
      S.playoffOpp = Math.random() < a.str / (a.str + b.str) ? a.key : b.key;
      news(
        `${$t("match.120", {
          short: S.team.short
        })} ${teamByKey(S.playoffOpp).name}.`
      );
    } else {
      news(
        $t("match.121", {
          short: S.team.short
        })
      );
      next = () => seasonEnd(true, false);
    }
  } else if (S.phase === "final") {
    news(
      win
        ? $t("match.122", {
            name: S.team.name
          })
        : $t("match.123", {
            name: S.team.name
          })
    );
    next = () => seasonEnd(true, win, true);
  }
  if (S.phase === "regular" && S.week === 5 && S.stage === "uni" && !S.clubDeal && !S.tryout) {
    const avg = late.seasonAvg();
    if (ovr() >= 32 || avg >= 6) {
      const stg = ovr() >= 40 ? "t2" : "t3",
        cc = pick(EU_CC),
        club = pick(leaguePool(stg, cc));
      S.tryout = { club: club.key, stage: stg, until: S.sched.length, done: false };
      news($t("lc.nTryout", { club: club.name, league: leagueName(stg, cc) }));
      save();
      const go = next;
      return chapter("tryout", () => maybeEvent(go));
    }
  }
  maybeEvent(next);
}
// window.__TEST.noEvents: duman testinde rastgele olaylar kapatılır
// Rastgele olay: haftaların yaklaşık üçte birinde; aynı olay 4 sezon (60 hafta) içinde tekrar çıkmaz
export const weekIndex = () => S.season * 20 + S.week;
export function maybeEvent(next) {
  if (!(window.__TEST && window.__TEST.noEvents) && Math.random() < 0.35) randomEvent(next);
  else next();
}
export function endWeek() {
  S.week++;
  S.slot = 3;
  const h = HOUSING[S.housing];
  for (const it of weeklyLedger({
    stage: S.stage,
    wage: S.wage * late.modeWageMul(),
    rent: h.rent,
    rentLabel: h.n,
    upkeep: carUpkeep(),
    income: itemWeekly("inc")
  }))
    tx(it.label, it.amount);
  S.energy += 26 + h.en + itemWeekly("en") + Math.round((S.moral - 50) / 10);
  S.moral += (h.mo || 0) + itemWeekly("mo");
  if (S.partner) {
    S.rel.partner -= 4;
    if (S.rel.partner <= 10) {
      news(
        $t("match.124", {
          v: fullName(),
          partner: S.partner
        })
      );
      toast(
        $t("match.44", {
          partner: S.partner
        })
      );
      S.partner = null;
      S.rel.partner = 0;
      S.moral -= 15;
    }
  }
  S.rel.aile -= 2;
  S.rel.ark -= 2;
  S.moral += (S.rel.aile - 50) / 25 + (S.rel.ark - 50) / 30;
  if (S.studying && !S.studied) S.aka -= 3;
  S.studied = false;
  late.healTick();
  if (S.money < 0) {
    S.moral -= 6;
    toast($t("match.45"));
  }
  if (S.tryout && !S.tryout.done && S.week > S.tryout.until) {
    S.tryout.done = true;
    news($t("match.125"));
  }
  norm();
  save();
  renderMain();
  late.weeklyHooks();
}

/* ================= OLAYLAR ================= */
export const LK = {
  friend: () => [
    { skin: SKINS[hash(S.npc.friend) % 4], hatStyle: "bere", hat: "#2d8a3e", pom: "#f4c534" },
    { jersey: "#e2741f", sleeves: true, gloves: "#2d8a3e", mood: "mutlu" }
  ],
  coach: () => [
    { skin: SKINS[hash(S.npc.coach) % 4], hatStyle: "kep", hat: S.team.c1, hair: "#3a2a1d" },
    { adult: true, mustache: hash(S.npc.coach) % 2 === 0, whistle: true, jersey: "#3a4256", sleeves: true, mood: "kizgin" }
  ],
  mom: () => [
    { skin: S.look.skin, hatStyle: "uzun", hair: "#5a3418" },
    { adult: true, jersey: "#3fa28a", sleeves: true, mood: "mutlu" }
  ],
  dad: () => [
    { skin: S.look.skin, hatStyle: "yok", hair: "#2a1a10" },
    { adult: true, jersey: "#5a6b8a", sleeves: true, mustache: true }
  ],
  rival: () => [
    { skin: SKINS[0], hatStyle: "yok", hair: "#e2c15a" },
    { jersey: "#5b2a86", sleeves: true, mood: "kizgin", tie: true }
  ],
  press: () => [
    { skin: SKINS[2], hatStyle: "uzun", hair: "#111111" },
    { adult: true, jersey: "#22304a", sleeves: true, glasses: true }
  ],
  agent: () => [
    { skin: SKINS[1], hatStyle: "yok", hair: "#333333" },
    { adult: true, jersey: "#22304a", sleeves: true, tie: "#d8b25a", glasses: true }
  ],
  odd: () => [
    { skin: "#b8c4a8", hatStyle: "kep", hat: "#333333" },
    { adult: true, jersey: "#2a2a2a", sleeves: true, glasses: true }
  ],
  mate: () => [
    { skin: SKINS[3], hatStyle: "band", hat: "#ffffff", hair: "#111111" },
    { jersey: S.team.c1, trim: S.team.c2, number: ri(4, 55), mood: "mutlu" }
  ],
  partner: () => [
    { skin: SKINS[1], hatStyle: "bere", hat: "#e85d9a", pom: "#ffffff" },
    { jersey: "#7d5bd6", sleeves: true, mood: "mutlu", blush: true }
  ],
  neighbor: () => [
    { skin: "#e8c3a0", hatStyle: "kulak", hat: "#8a6b3e" },
    { adult: true, jersey: "#9a3b3b", sleeves: true, mood: "saskin", glasses: true }
  ]
};
export function eventSheet(ev, after) {
  if (SIM()) {
    pick(ev.choices).do();
    norm();
    setTimeout(after, 0);
    return;
  }
  sheet(
    ev.title,
    ev.who,
    `<div class="who"><div id="ep"></div><div class="say">${ev.text}</div></div><div class="choices" id="ch">${ev.choices.map((x, i) => `<button class="choice" data-i="${i}"><span class="ct" style="font-size:1.05rem">${x.t}</span></button>`).join("")}</div>`,
    { noClose: true }
  );
  $("#ep").appendChild(portrait(ev.look[0], ev.look[1]));
  $$("#ch .choice").forEach(
    btn =>
      (btn.onclick = () => {
        const out = ev.choices[+btn.dataset.i].do();
        norm();
        save();
        $("#ch").innerHTML =
          `<div class="say" style="border-left-color:var(--warn)">${out}</div><button class="btn pri" id="ok">${$t("ads.25")}</button>`;
        $("#ok").onclick = after;
      })
  );
}
export function randomEvent(after) {
  // olaylar veri paketlerinden gelir: src/content/events.tr.js (motor: src/content/events.js)
  S.evSeen = S.evSeen || {};
  const now = weekIndex(),
    fresh = late.eventPool().filter(x => !(S.evSeen[x.title] && now - S.evSeen[x.title] < 60));
  if (!fresh.length) return after();
  const e = pick(fresh);
  S.evSeen[e.title] = now;
  Bus.emit("event:show", { title: e.title });
  eventSheet({ ...e, look: LK[e.w]() }, after);
}

/* ================= SEZON SONU & TEKLİFLER ================= */
export function seasonEnd(playoff, champ, final) {
  Bus.emit("season:end", { playoff, champ, final });
  const res = S.results,
    w = res.filter(r => r.win).length,
    avg = late.seasonAvg();
  const awards = [],
    tn = lgName(),
    label = seasonLabel();
  if (champ) {
    awards.push(
      $t("match.46", {
        tn: tn
      })
    );
    S.career.trophies.push({
      type: S.stage === "lise" ? "lise" : "champ",
      label: $t("match.110", {
        label: label,
        tn: tn,
        name: S.team.name
      })
    });
    S.rel.taraf += 10;
    S.followers *= 1.25;
  } else if (final) {
    awards.push(
      $t("match.126", {
        tn: tn
      })
    );
    S.career.trophies.push({
      type: "final",
      label: $t("match.111", {
        label: label,
        tn: tn
      })
    });
  }
  awards.push(...late.seasonAwards(avg, champ));
  late.evalGoals(!!playoff); // sezon hedefleri: teklifler oluşmadan önce (menajer hedefi teklifleri etkiler)
  S.hist.push({
    label,
    team: S.team.name,
    league: tn,
    w,
    l: res.length - w,
    avg,
    champ,
    c1: S.team.c1,
    c2: S.team.c2,
    ...(S.ss || late.blankSS())
  });
  const gr = BAL.grow.find(g => S.age <= g[0]);
  for (const [k] of STATS) {
    let g = ri(gr[1], gr[2]);
    if (S.age >= 30 && (k === "sut" || k === "pas")) g = Math.max(g, -1);
    if (S.age >= 30 && (k === "hiz" || k === "guc")) g -= Math.random() < 0.5 ? 1 : 0;
    S.st[k] += g;
  }
  let schoolMsg = "";
  if (S.studying && S.stage !== "lise") {
    if (S.aka >= 40) {
      S.uniYear++;
      if (S.uniYear > 4) {
        S.studying = false;
        S.graduated = true;
        schoolMsg = $t("match.47");
        S.rel.aile += 15;
        news(
          $t("match.127", {
            v: fullName()
          })
        );
      } else
        schoolMsg = $t("match.48", {
          uniYear: S.uniYear
        });
    } else {
      schoolMsg = $t("match.49");
      S.moral -= 6;
    }
  }
  if (S.contract > 0) S.contract--;
  S.age++;
  S.year++;
  S.season++;
  S.stageSeason++;
  late.rivalSeason();
  norm();
  save();
  const head = `<div class="card"><div class="eyebrow">${$t("match.53", {
    label: label,
    tn: esc(tn)
  })}</div><h2>${$t("match.54", {
    w: w,
    v: res.length - w
  })}</h2><div class="kv"><span>${$t("match.55")}</span><b>${avg.toFixed(2)}</b><span>${$t("match.56")}</span><b>${champ ? $t("match.50") : final ? $t("match.51") : playoff ? $t("core.3") : $t("match.52")}</b><span>${$t("match.57")}</span><b>${S.age}</b><span>${$t("match.58")}</span><b>${ovr()}</b></div>${awards.length ? `<div class="say">${awards.join(" · ")}</div>` : ""}${schoolMsg ? `<p class="small">${schoolMsg}</p>` : ""}</div>${late.goalsResultHTML()}${late.rivalCard(avg)}`;
  late.summerTournament(avg, () => transition(avg, champ, head));
}
export function potential(avg, champ) {
  return potentialScore({ ovr: ovr(), avg, champ, fame: fame() });
}
export function grade(P) {
  return P >= 56 ? "A" : P >= 49 ? "B+" : P >= 43 ? "B" : P >= 38 ? "C+" : "C";
}
export function genOffers(avg, champ, n = 3) {
  const P = potential(avg, champ) + late.modePotential(),
    o = ovr(),
    cur = ORDER.indexOf(S.stage);
  const steps = eligibleStages({ P, avg, age: S.age, stage: S.stage });
  if (!steps.length) steps.push("t3");
  const top = steps[steps.length - 1],
    sec = steps[steps.length - 2] || top;
  if (avg < 5 && cur >= 3) steps.unshift(ORDER[cur - 1]);
  const out = [],
    used = new Set([S.team.key]);
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const st = Math.random() < 0.6 ? top : sec;
    const cc0 = st === "nba" ? "US" : Math.random() < 0.3 ? "TR" : pick(EU_CC);
    const t = pick(leaguePool(st, cc0)),
      cc = t.cc;
    if (used.has(t.key)) continue;
    used.add(t.key);
    const role = roleAt(o, st, cc);
    const wage = offerWage({
      stage: st,
      pr: LEAGUES[cc].pr || 1,
      role,
      dominance: dominanceOf(o, tdOf(st, cc)),
      agentBoost: !!S.buffs.offer
    });
    out.push({ team: t, stage: st, role, wage, years: ri(1, 3) });
  }
  return out;
}
export function offerHTML(o, i) {
  const t = o.team;
  const up = ORDER.indexOf(o.stage) > ORDER.indexOf(S.stage);
  const lab = o.stay ? $t("match.59") : o.uni ? $t("match.60") : up ? $t("match.61") : $t("match.62"),
    cls = o.stay ? "e" : o.uni ? "i" : up ? "m" : "i";
  return `<button class="choice" data-o="${i}"><span class="ct" style="display:flex;align-items:center;gap:8px;font-size:1.08rem">${crestSVG(t, 28)}<span>${esc(t.name)}</span></span><span class="cd">${esc(o.note || leagueName(o.stage, t.cc))} · ${esc(t.city)}${o.uni ? "" : `, ${(LEAGUES[t.cc] || LEAGUES.TR).n}`}${o.role ? ` · ${ROLE_N[o.role]}` : ""}${isPro(o.stage) && !o.uni ? ` · ${late.offerFitNote(t)}` : ""}${buyoutFor(o) ? ` ${$t("match.133")} ${fmt(buyoutFor(o))}` : ""}${
    o.wage
      ? ` ${$t("match.63", {
          wage: fmt(o.wage)
        })}`
      : ""
  }${
    o.years
      ? ` ${$t("match.64", {
          years: o.years
        })}`
      : ""
  }</span><span class="od ${cls}">${lab}</span></button>`;
}
export function transition(avg, champ, head) {
  let offers = [],
    title = $t("match.65"),
    intro = "";
  const P = potential(avg, champ);
  if (S.stage === "lise") {
    if (S.stageSeason > 2) {
      const exam = clamp(Math.round(S.aka * 0.75 + rnd(0, 20) + (avg - 6) * 3), 0, 100);
      title = $t("match.66");
      intro = `<div class="card"><div class="eyebrow">${$t("match.69")}</div><div class="row between nowrap"><div><h3>${esc(fullName())}</h3><div class="small muted">${$t(
        "match.70",
        {
          n: POS[S.pos].n,
          age: S.age,
          games: S.career.games,
          pts: S.career.pts
        }
      )}</div></div><div class="big-num gold">${grade(P)}</div></div><p class="small muted">${P >= 43 ? $t("match.67") : $t("match.68")} ${$t("match.71")} <b>${exam}</b>.</p></div>`;
      offers = genOffers(avg, champ, 4);
      const uc = exam > 65 ? ["İstanbul", "Ankara"] : exam > 40 ? ["İstanbul"] : [];
      uc.forEach(c => {
        const t = makeTeam("myuni", c, 0);
        offers.push({
          team: t,
          stage: "uni",
          wage: WAGE.uni + (avg >= 6.3 ? 20 : 0),
          note: $t("match.112"),
          uni: true
        });
      });
      if (!uc.length)
        offers.push({
          team: makeTeam("myuni", "İstanbul", 2),
          stage: "uni",
          wage: WAGE.uni,
          note: $t("match.113"),
          uni: true
        });
    } else {
      title = $t("match.72");
      offers = [{ team: S.team, stage: "lise", wage: WAGE.lise, stay: true }];
    }
  } else if (S.stage === "uni") {
    title = $t("match.69");
    intro = `<p>${$t("match.73")} <b class="gold">${grade(P)}</b>${$t("match.74")}</p>`;
    offers = genOffers(avg, champ, 3);
    if (S.clubDeal) {
      const t = teamByKey(S.clubDeal.club);
      offers.unshift({
        team: t,
        stage: S.clubDeal.stage,
        role: roleAt(ovr(), S.clubDeal.stage, t.cc) === "bench" ? "bench" : "rot",
        wage: Math.round(WAGE[S.clubDeal.stage] * 0.9),
        years: 2,
        note: $t("match.114", {
          stage: leagueName(S.clubDeal.stage, t.cc)
        })
      });
    }
    if (S.uniYear < 4) offers.push({ team: S.team, stage: "uni", wage: S.wage, stay: true, note: $t("match.115") });
  } else {
    title = $t("match.75");
    intro = `<p>${$t("match.76", {
      agent: esc(S.npc.agent)
    })} <b class="gold">${grade(P)}</b>.</p>`;
    const stayOk = S.contract > 0 || avg >= 5 || S.rel.koc >= 30;
    const role = roleAt(ovr(), S.stage, S.team.cc);
    if (stayOk)
      offers.push({
        team: S.team,
        stage: S.stage,
        role,
        wage: S.contract > 0 ? S.wage : Math.round(S.wage * (avg >= 7 ? 1.25 : avg >= 6 ? 1.08 : 0.92)),
        years: S.contract > 0 ? S.contract : ri(1, 3),
        stay: true,
        note:
          S.contract > 0
            ? $t("match.77", {
                contract: S.contract
              })
            : $t("match.78")
      });
    offers.push(...genOffers(avg, champ, S.transferReq === S.season - 1 ? 4 : 3));
  }
  offers = late.storyOffers(offers);
  S.buffs.offer = 0;
  save();
  window.__lastOffers = offers;
  const retire = S.age >= 34 || !!S.farewell,
    force = S.age >= 38 || (S.farewell && S.season > S.farewell); // veda turu sezonu bitince emeklilik
  const show = () => {
    // bütün kulüpler masadan kalktıysa ilk tekliflerinde (pazarlıksız) dururlar; oyuncu teklifsiz kalmaz
    if (offers.length && offers.every(o => o.withdrawn))
      offers.forEach(o => {
        o.withdrawn = false;
        o.noNego = true;
      });
    sheet(
      title,
      $t("match.79", {
        v: seasonLabel()
      }),
      `${head}${intro}${
        force
          ? `<div class="say">${$t("match.80")}</div><button class="btn bad" id="ret">${$t("match.81")}</button>`
          : `<div class="choices">${offers
              .map((o, i) =>
                o.withdrawn
                  ? `<button class="choice" disabled style="opacity:.5"><span class="ct">${esc(o.team.name)}</span><span class="cd">${$t("match.135")}</span></button>`
                  : offerHTML(o, i)
              )
              .join("")}</div>${retire ? `<button class="btn ghost" id="ret">${$t("match.82")}</button>` : ""}`
      }`,
      { noClose: true }
    );
    $$("[data-o]").forEach(
      x => (x.onclick = () => late.negotiateOffer(offers[+x.dataset.o], sg => (sg ? acceptOffer(sg) : show())))
    );
    const r = $("#ret");
    if (r) r.onclick = retireScreen;
  };
  show();
}
// Sözleşme sürerken başka kulübe gitmek fesih bedeli ister; serbest kalma (üst lige) ve NBA çıkış maddesi bedelsiz yapar
export function buyoutFor(o) {
  if (o.stay || o.uni || !S.contract || !isPro(S.stage) || !isPro(o.stage)) return 0;
  const cl = S.clauses || {},
    up = ORDER.indexOf(o.stage) > ORDER.indexOf(S.stage);
  if ((cl.release && up) || (cl.nbaout && o.stage === "nba")) return 0;
  return Math.round(S.wage * 4 * Math.min(S.contract, 2));
}
export function acceptOffer(o) {
  const fee = buyoutFor(o);
  if (fee) tx($t("match.134"), -fee);
  // yeni kulüpte maddeler sözleşmeyle gelir; aynı kulüpte yenilemede yeni kazanılan maddeler eskilere eklenir
  S.clauses = o.stay ? { ...(S.clauses || {}), ...(o.clauses || {}) } : o.clauses || {};
  const prevStage = S.stage,
    prevCity = S.city,
    t = o.team;
  if (o.uni && prevStage !== "uni") {
    S.uni = t.name;
    S.uniYear = 1;
    S.studying = true;
  }
  if (isPro(o.stage) && t.city !== S.city) S.studying = false;
  if (prevStage === "lise" && !o.uni && isPro(o.stage) && t.city === S.city) S.studying = false;
  S.stage = o.stage;
  S.team = t;
  S.wage = o.wage || WAGE[o.stage];
  S.city = t.city;
  S.role = o.role || "rot";
  S.contract = o.stay ? o.years || S.contract : o.years || 0;
  if (S.stage !== prevStage) S.stageSeason = 1;
  if (!o.stay) {
    const c = cOf(t.city);
    S.npc.coach = pick(c.first) + " " + pick(c.last);
    S.rel.koc = 45;
    S.rel.takim = 45;
    news(
      `${$t("match.129", {
        v: fullName(),
        name: t.name
      })} ${o.years ? o.years + $t("match.128") : ""}${$t("match.130")}`
    );
  }
  if (S.city !== prevCity) {
    if (S.housing === "oda" || S.housing === "yurt") S.housing = S.stage === "uni" ? "yurt" : "daire";
    news(
      $t("match.131", {
        v: fullName(),
        city: S.city
      })
    );
  }
  if (S.city === S.home && S.housing === "yurt") S.housing = "oda";
  if (S.housing === "yurt" && !S.studying) S.housing = "daire";
  S.clubDeal = null;
  S.tryout = null;
  newSeasonLeague();
  setTeamVars();
  save();
  closeSheet();
  const ch =
    S.stage === "lise"
      ? S.stageSeason === 2
        ? "lise2"
        : null
      : S.stage === "uni"
        ? "uni"
        : isPro(S.stage) && !isPro(prevStage)
          ? "pro"
          : S.stage === prevStage
            ? null
            : S.stage;
  chapter(ch, renderMain);
}
export function retireScreen() {
  if (!S.retired) Bus.emit("career:retire"); // ekran yeniden çizilince (son bölüm seçimi, kaydı açma) tekrar tetiklenmez
  if (SIM()) return;
  closeSheet();
  const k = S.career;
  const legend = late.legacyScore(); // miras puanı: src/legacy.js
  app.innerHTML = `<div style="padding-top:18px"><div class="eyebrow">${seasonLabel()}</div><h1>${$t("match.86")}</h1></div>
  <div class="card"><div class="who"><div id="rp"></div><div><h2>${esc(fullName())}</h2><p class="muted">${$t("match.87", {
    age: S.age,
    name: esc(S.team.name)
  })}</p></div></div>
   <div class="box"><div><b>${k.games}</b><span class="eyebrow">${$t("match.88")}</span></div><div><b>${k.pts}</b><span class="eyebrow">${$t("arcade.6")}</span></div><div><b>${k.ast}</b><span class="eyebrow">${$t("extras.31")}</span></div><div><b>${k.trophies.length}</b><span class="eyebrow">${$t("match.89")}</span></div></div>
   <div class="kv"><span>${$t("match.32")}</span><b>${k.wins}</b><span>${$t("match.90")}</span><b>${fmt(k.earned)}</b><span>${$t("match.43")}</span><b>${kfmt(S.followers)}</b><span>${$t("match.91")}</span><b>${legend}</b></div>
   <p>${
     legend >= late.HOF[1][0]
       ? $t("match.83")
       : legend >= late.HOF[2][0]
         ? $t("match.84")
         : $t("match.85", {
             last: esc(S.last)
           })
   }</p>
   <div class="grid2"><button class="btn pri big" id="nw">${$t("match.92")}</button>${late.cardButtonHTML()}</div>${late.albumButtonHTML()}</div>
  ${late.hofCard()}
  ${late.afterCareerHTML()}
  <div class="card"><div class="eyebrow">${$t("match.93")}</div><div class="tbl"><table><tr><th>${$t("match.94")}</th><th>${$t("data.36")}</th><th>G-M</th><th>${$t("match.95")}</th></tr>${S.hist.map(h => `<tr><td>${h.label}</td><td>${esc(h.team)}<div class="small muted">${esc(h.league)}</div></td><td>${h.w}-${h.l}</td><td>${h.avg.toFixed(1)}</td></tr>`).join("")}</table></div>${k.trophies.map(t => `<div class="small">${esc(t.label)}</div>`).join("")}</div>`;
  $("#rp").appendChild(portrait(S.look, { ...jersey(), mood: "mutlu" }, 84, 84, S.team.c1));
  if (!S.retired) {
    S.retired = true;
    save();
  }
  $("#nw").onclick = renderSlots;
  late.bindAfterCareer(retireScreen);
  late.bindCardButton(retireScreen);
  late.bindAlbumButton(retireScreen);
}

// Diğer modüllerin bu değişkenleri değiştirebilmesi için ayarlayıcılar
export function setM(v) {
  return (M = v);
}
