import { t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { $, $$, Bus, EU_CC, LEAGUES, ORDER, STATS, cOf, esc, fmt, hash, isPro, pick, rnd, statName, toast } from "./data.js";
import { icon } from "./art.js";
import {
  S,
  bindActs,
  closeSheet,
  crestSVG,
  fullName,
  news,
  norm,
  ovr,
  prodHTML,
  renderMain,
  seasonLabel,
  setTeamVars,
  sheet,
  tabsHTML,
  tx
} from "./core.js";
import { save } from "./save.js";
import { openLoc } from "./places.js";
import { M } from "./match.js";
import { playMatch } from "./engine.js";
/* ================= KUPA İKONLARI ================= */
export function trophyIcon(t) {
  return (
    {
      champ: ["cup"],
      lise: ["cup", "#c0c7cf"],
      mvp: ["plaque"],
      final: ["medal"],
      nat_gold: ["medal", "#d8b25a"],
      nat_silver: ["medal", "#cfd8dc"],
      nat_bronze: ["medal", "#c47a3a"],
      arcade: ["joystick"]
    }[t.type] || ["cup", "#c0c7cf"]
  );
}

/* ================= ARCADE SIRALAMALARI ================= */
// Sunucu olmadığı için rakipler her hafta aynı tohumla üretilir; oyuncunun haftalık ve aylık en iyi skoru listeye yerleşir.
export const ARC_GAMES = {
  arcade: { n: $t("arcade.2"), lo: 6, hi: 17 },
  reflex: { n: $t("arcade.12"), lo: 12, hi: 26 },
  hockey: { n: $t("arcade.16"), lo: 2, hi: 5 },
  rhythm: { n: $t("shops.39"), lo: 20, hi: 58 },
  bowling: { n: $t("arcade.26"), lo: 9, hi: 27 }
};
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export const weekId = () => S.season * 100 + S.week,
  monthId = () => S.season * 100 + Math.ceil(S.week / 4);
export function arcState() {
  S.arc = S.arc || { w: weekId(), m: monthId(), wb: {}, mb: {}, won: 0 };
  return S.arc;
}
export function arcSubmit(g, score) {
  const a = arcState();
  a.wb[g] = Math.max(a.wb[g] || 0, score);
  a.mb[g] = Math.max(a.mb[g] || 0, score);
  save();
}
export function arcBoard(g, period) {
  const a = arcState(),
    id = period === "w" ? a.w : a.m,
    G = ARC_GAMES[g],
    rnd2 = seeded(hash(g + period + id + S.city)),
    c = cOf(S.city);
  const bump = period === "m" ? 1.12 : 1;
  const npcs = Array.from({ length: 9 }, (_, i) => ({
    n: `${c.first[Math.floor(rnd2() * c.first.length)]} ${c.last[Math.floor(rnd2() * c.last.length)][0]}.`,
    s: Math.round((G.lo + (G.hi - G.lo) * Math.pow(rnd2(), 1.4)) * bump)
  }));
  const me = (period === "w" ? a.wb : a.mb)[g] || 0;
  return [...npcs, { n: fullName(), s: me, me: true }].sort((x, y) => y.s - x.s || (y.me ? 1 : -1));
}
export function arcRank(g, period) {
  const b = arcBoard(g, period);
  return b.findIndex(r => r.me) + 1;
}
export function arcResolve(period) {
  const a = arcState(),
    best = period === "w" ? a.wb : a.mb,
    mult = 1 + ORDER.indexOf(S.stage),
    out = [];
  for (const g of Object.keys(best)) {
    if (!best[g]) continue;
    const r = arcRank(g, period);
    if (r > 3) continue;
    const base = period === "w" ? [25, 15, 8][r - 1] : [120, 60, 30][r - 1];
    tx(
      `${ARC_GAMES[g].n} ${period === "w" ? $t("extras.74") : $t("extras.75")} ${$t("extras.76", {
        r: r
      })}`,
      base * mult
    );
    S.moral += period === "w" ? 3 : 6;
    S.followers *= period === "w" ? 1.02 : 1.05;
    if (period === "m" && r === 1)
      S.career.trophies.push({
        type: "arcade",
        label: $t("extras.59", {
          v: seasonLabel(),
          n: ARC_GAMES[g].n,
          city: S.city
        })
      });
    out.push(`${ARC_GAMES[g].n}: ${r}. (${fmt(base * mult)})`);
  }
  if (out.length)
    news(`${$t("extras.77")} ${period === "w" ? $t("extras.74") : $t("extras.75")} ${$t("extras.78")} ${out.join(", ")}.`);
  if (period === "w") {
    a.wb = {};
    a.w = weekId();
  } else {
    a.mb = {};
    a.m = monthId();
  }
  return out;
}
export function boardSheet(g = "arcade", period = "w") {
  const b = arcBoard(g, period),
    a = arcState();
  sheet(
    $t("extras.1"),
    `${S.city} · ${period === "w" ? $t("extras.2") : $t("extras.3")}`,
    `${tabsHTML(
      [
        ["w", $t("extras.4")],
        ["m", $t("extras.5")]
      ],
      period,
      "p"
    )}
   <div class="opts" id="gsel">${Object.entries(ARC_GAMES)
     .map(([k, v]) => `<button class="opt ${k === g ? "on" : ""}" data-g="${k}">${v.n}</button>`)
     .join("")}</div>
   <div class="card"><div class="tbl"><table><tr><th>#</th><th>${$t("extras.10")}</th><th style="text-align:right">${$t("extras.11")}</th></tr>${b.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${esc(r.n)}${r.me && !r.s ? ` <span class="muted small">${$t("extras.6")}</span>` : ""}</td><td style="text-align:right">${r.s}</td></tr>`).join("")}</table></div></div>
   <div class="card small"><div class="eyebrow">${$t("extras.12")}</div><div>${period === "w" ? $t("extras.7") : $t("extras.8")}</div><div class="muted">${$t("extras.13")} ${period === "w" ? "hafta" : $t("extras.9")} ${$t("extras.14")}</div></div>
   <button class="btn pri" id="bkE">${$t("extras.15")}</button>`
  );
  $$("[data-p]").forEach(x => (x.onclick = () => boardSheet(g, x.dataset.p)));
  $$("#gsel [data-g]").forEach(x => (x.onclick = () => boardSheet(x.dataset.g, period)));
  $("#bkE").onclick = () => openLoc("eglence", "arcade");
}
export function arcBoardCard() {
  arcState();
  const rows = Object.entries(ARC_GAMES)
    .map(([k, v]) => {
      const r = arcRank(k, "w"),
        s = S.arc.wb[k] || 0;
      return `<div class="row between small"><span>${v.n}</span><span>${
        s
          ? `<b>${r}.</b> ${$t("extras.16", {
              s: s
            })}`
          : `<span class="muted">${$t("extras.17")}</span>`
      }</span></div>`;
    })
    .join("");
  return `<div class="card"><div class="row between"><div><div class="eyebrow">${$t("extras.18", {
    city: esc(S.city)
  })}</div><h3>${$t("extras.19")}</h3></div><button class="btn gold sm" id="brd">${$t("extras.20")}</button></div>${rows}<div class="small muted">${$t("extras.21")}</div></div>`;
}

/* ================= MİLLİ TAKIM ================= */
export const NAT = {
  TR: { c1: "#e30a17", c2: "#ffffff", str: 1.0, s: $t("extras.60") },
  ES: { c1: "#c60b1e", c2: "#ffc400", str: 1.08, s: $t("extras.61") },
  IT: { c1: "#0064aa", c2: "#ffffff", str: 0.98, s: $t("extras.62") },
  FR: { c1: "#0055a4", c2: "#ffffff", str: 1.05, s: $t("extras.63") },
  DE: { c1: "#f4f4f4", c2: "#141414", str: 1.02, s: $t("extras.64") },
  GR: { c1: "#0d5eaf", c2: "#ffffff", str: 1.03, s: $t("extras.65") },
  RS: { c1: "#c6363c", c2: "#0c4076", str: 1.08, s: $t("extras.66") },
  LT: { c1: "#fdb913", c2: "#006a44", str: 1.0, s: $t("extras.67") },
  US: { c1: "#0a3161", c2: "#b31942", str: 1.22, s: $t("data.151") }
};
export const CAPITAL = {
  TR: "İstanbul",
  ES: "Madrid",
  IT: "Roma",
  FR: "Paris",
  DE: "Berlin",
  GR: "Atina",
  RS: "Belgrad",
  LT: "Kaunas",
  US: "New York"
};
export function natCat(age = S.age) {
  return age <= 17 ? "U18" : age <= 19 ? "U20" : "A";
}
export function natTeam(cc, cat) {
  const key = `nat|${cc}|${cat}`;
  if (S.teams[key]) return S.teams[key];
  const n = NAT[cc];
  const t = {
    key,
    name:
      cat === "A"
        ? $t("extras.22", {
            n: LEAGUES[cc].n
          })
        : $t("extras.23", {
            n: LEAGUES[cc].n,
            cat: cat
          }),
    short: n.s,
    city: CAPITAL[cc],
    cc,
    kind: "nat",
    c1: n.c1,
    c2: n.c2,
    str: n.str * (cat === "A" ? 1.05 : 1)
  };
  S.teams[key] = t;
  return t;
}
export function natPotential(avg) {
  return ovr() + (avg - 6) * 5 + Math.min(4, S.career.trophies.length);
}
export function natSelected(avg, cat) {
  const need = { U18: 38, U20: 47, A: 69 }[cat];
  if (cat === "A" && !isPro(S.stage)) return false;
  return natPotential(avg) >= need;
}
// Milli maçı oynatmak için kulüp takımı geçici olarak milli takımla değiştirilir, maç bitince geri alınır.
export function natMatch(cat, opp, label, after) {
  const club = S.team,
    us = natTeam("TR", cat);
  S._club = club;
  S.team = us;
  setTeamVars();
  const role = natPotential(late.seasonAvg()) >= { U18: 44, U20: 53, A: 76 }[cat] ? "star" : "rot";
  playMatch({
    opp,
    home: Math.random() < 0.5,
    comp: "nat",
    label,
    role,
    onEnd: win => {
      const r = M.rating,
        line = { pts: M.pts, ast: M.ast, reb: M.reb, us: M.us, them: M.them };
      S.team = club;
      delete S._club;
      setTeamVars();
      S.career.natCaps = (S.career.natCaps || 0) + 1;
      S.career.natPts = (S.career.natPts || 0) + line.pts;
      S.followers += Math.round(S.followers * (r >= 7 ? 0.08 : 0.03));
      S.rel.taraf += r >= 7 ? 5 : 1;
      S.moral += win ? 8 : -4;
      S.energy -= 15;
      norm();
      save();
      news(
        $t("extras.79", {
          name: us.name,
          us: line.us,
          them: line.them,
          name2: opp.name,
          v: fullName(),
          pts: line.pts,
          v2: r.toFixed(1)
        })
      );
      sheet(
        win ? $t("extras.24") : $t("extras.25"),
        label,
        `<div class="row between nowrap"><div class="row nowrap" style="gap:8px">${crestSVG(us, 36)}<span class="big-num">${line.us}–${line.them}</span>${crestSVG(opp, 36)}</div><div style="text-align:right"><div class="eyebrow">${$t("extras.30")}</div><div class="rating">${r.toFixed(1)}</div></div></div>
      <div class="box"><div><b>${line.pts}</b><span class="eyebrow">${$t("arcade.6")}</span></div><div><b>${line.ast}</b><span class="eyebrow">${$t("extras.31")}</span></div><div><b>${line.reb}</b><span class="eyebrow">${$t("data.63")}</span></div><div><b>${S.career.natCaps}</b><span class="eyebrow">${$t("extras.32")}</span></div></div>
      <div class="say">${win ? pick([$t("extras.26"), $t("extras.27")]) : pick([$t("extras.28"), $t("extras.29")])}</div>
      <button class="btn pri" id="nok">${$t("ads.25")}</button>`,
        { noClose: true }
      );
      $("#nok").onclick = () => after(win, r);
    }
  });
}
export function camp(cat, title, after) {
  S.npc.natCoach = S.npc.natCoach || `${pick(LEAGUES.TR.first)} ${pick(LEAGUES.TR.last)}`;
  sheet(
    $t("extras.33"),
    title,
    `<div class="chapter"><div class="hd" style="background:#e30a17;color:#fff"><div class="eyebrow" style="color:inherit;opacity:.8">${cat === "A" ? $t("extras.34") : cat + $t("extras.35")}</div><h2 style="font-size:1.8rem">${$t("extras.40")}</h2></div><div class="bd">
   <p>${$t("extras.41", {
     natCoach: esc(S.npc.natCoach)
   })} ${cat === "A" ? $t("extras.34") : cat + $t("extras.35")} ${$t("extras.42", {
     mom: S.npc.mom,
     dad: S.npc.dad
   })}</p>
   <div class="eyebrow">${$t("extras.43")}</div><div class="pgrid">${[
     {
       id: "c1",
       ic: icon("whistle"),
       t: $t("extras.68"),
       d: $t("extras.69"),
       fx: [[$t("extras.36"), "p"]],
       btn: $t("core.10")
     },
     {
       id: "c2",
       ic: icon("chat"),
       t: $t("extras.70"),
       d: $t("extras.71"),
       fx: [[$t("extras.37"), "p"]],
       btn: $t("core.10")
     },
     {
       id: "c3",
       ic: icon("ball"),
       t: $t("extras.72"),
       d: $t("extras.73"),
       fx: [
         [$t("extras.38"), "p"],
         [$t("extras.39"), "n"]
       ],
       btn: $t("core.10")
     }
   ]
     .map(prodHTML)
     .join("")}</div></div></div>`,
    { noClose: true }
  );
  const go = () => {
    norm();
    save();
    closeSheet();
    after();
  };
  bindActs({
    c1: () => {
      const k = pick(STATS)[0];
      S.st[k] += 2;
      toast(`${statName(k)} +2`);
      go();
    },
    c2: () => {
      S.moral += 10;
      go();
    },
    c3: () => {
      S.st.sut += 2;
      S.energy -= 8;
      go();
    }
  });
}
// FIBA arası: sezonun 4. haftasından sonra, yalnızca A Milli Takım
export function fibaWindow(done) {
  const cat = natCat();
  if (S.injury || cat !== "A" || S.natWin === S.season || !natSelected(late.seasonAvg(), cat)) {
    done();
    return;
  }
  S.natWin = S.season;
  const opp = natTeam(pick(EU_CC.filter(c => c !== "TR")), "A");
  camp(cat, $t("extras.44"), () =>
    natMatch(cat, opp, $t("extras.45"), () => {
      renderMain();
      done();
    })
  );
}
// Yaz turnuvası: sezon sonunda, gençlerde U18/U20 Avrupa Şampiyonası, büyüklerde EuroBasket / Dünya Kupası
export function summerTournament(avg, done) {
  if (window.__TEST && window.__TEST.noSummer) {
    done();
    return;
  }
  const cat = natCat(S.age - 1);
  if (S.injury || !natSelected(avg, cat)) {
    done();
    return;
  }
  const name =
    cat === "U18"
      ? $t("extras.46")
      : cat === "U20"
        ? $t("extras.47")
        : S.year % 4 === 3
          ? $t("extras.48")
          : S.year % 4 === 1
            ? $t("extras.49")
            : $t("extras.50");
  // son turlarda güçlü rakipler
  const pool = [...EU_CC.filter(c => c !== "TR"), ...(cat === "A" && name === $t("extras.48") ? ["US"] : [])].sort(
    (a, b) => NAT[a].str - NAT[b].str + rnd(-0.04, 0.04)
  );
  pool.splice(0, pool.length - 4);
  const stages = [$t("extras.51"), $t("extras.52"), $t("extras.53")];
  let i = 0;
  const medal = (type, lab) => {
    S.career.trophies.push({ type, label: `${S.year} ${name} · ${lab}` });
    news(
      $t("extras.80", {
        v: fullName(),
        name: name,
        lab: lab
      })
    );
    save();
  };
  const nextGame = () => {
    const opp = natTeam(pool[i], cat);
    natMatch(cat, opp, `${name} · ${stages[i]}`, win => {
      if (i === 0 && !win) {
        news(
          $t("extras.81", {
            name: name
          })
        );
        done();
        return;
      }
      if (i === 1 && !win) {
        const bo = natTeam(pool[3], cat);
        natMatch(
          cat,
          bo,
          $t("extras.54", {
            name: name
          }),
          w2 => {
            if (w2) medal("nat_bronze", "bronz");
            done();
          }
        );
        return;
      }
      if (i === 2) {
        medal(win ? "nat_gold" : "nat_silver", win ? $t("extras.55") : $t("extras.56"));
        done();
        return;
      }
      i++;
      nextGame();
    });
  };
  camp(cat, name, nextGame);
}

/* ================= HAFTA GEÇİŞ KANCALARI ================= */
// endWeek sonunda çağrılır: arcade ödülleri ve sezon ortası FIBA arası
export function weeklyHooks() {
  const got = [...arcResolve("w")];
  if ((S.week - 1) % 4 === 0) got.push(...arcResolve("m"));
  if (got.length) {
    save();
    toast(
      `${$t("extras.58", {
        v: got[0]
      })}${got.length > 1 ? $t("extras.57") : ""}`
    );
  }
  if (S.chips != null && S.chips < 100) S.chips = 100; // teselli fişi (fiş artık paraya çevrilebildiği için küçük)
  Bus.emit("week:start");
  Bus.first("week:sheet"); // haftada en fazla bir panel; sağlayıcılar öncelik sırasıyla sorulur
}
// sezon ortası (normalde 8., hızlı kariyerde 5. hafta): All-Star seçilen üst lig oyuncusu All-Star'a, diğer herkes
// Yıldızlar Hafta Sonu beceri yarışmalarına (src/peaks.js); ardından milli takım penceresi
Bus.offer(
  "week:sheet",
  () => {
    // aynı hafta başka bir panel öne geçerse bir sonraki hafta gelir
    if (S.week < late.midWeek() || S.week > late.midWeek() + 1 || S.phase !== "regular") return false;
    if (late.allStarEligible()) late.allStar(() => fibaWindow(() => {}));
    else if (S.skillWk !== S.season && S.allStar !== S.season) late.skillWeekend(() => fibaWindow(() => {}));
    else if (S.week === late.midWeek()) fibaWindow(() => {});
    else return false;
    return true;
  },
  10
);

/* Yerel hikâye ve mizah olayları artık veri olarak src/content/events.tr.js içinde. */
