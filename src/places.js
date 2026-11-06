import { t as $t, LOCALE } from "./i18n/index.js";
import { trainingGain } from "./logic/rules.js";
import { late } from "./late.js";
import {
  $,
  $$,
  BAL,
  Bus,
  COMMON_DRILLS,
  DRILLS,
  ORDER,
  POS,
  RELS,
  STATS,
  cOf,
  clamp,
  esc,
  fmt,
  hash,
  isPro,
  kfmt,
  leagueName,
  luma,
  pick,
  ri,
  rnd,
  shuffle,
  statName,
  tdOf,
  toast
} from "./data.js";
import { SKINS, icon, portrait, sceneEl, vitrineCanvas } from "./art.js";
import { locInfo } from "./map.js";
import {
  ARENA,
  buildCrowd,
  mgBlock,
  mgDribble,
  mgGym,
  mgPass,
  mgPhoto,
  mgPost,
  mgRebound,
  mgShoot,
  mgTiming,
  setARENA
} from "./games.js";
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
  fame,
  fixture,
  fullName,
  ageGainMul,
  gainStat,
  jersey,
  levelMul,
  lgName,
  mapState,
  news,
  norm,
  ovr,
  phaseName,
  prodHTML,
  renderMain,
  resultView,
  seasonLabel,
  sheet,
  standings,
  stat1,
  statVal,
  tabsHTML,
  teamByKey,
  tx,
  useSlot
} from "./core.js";
import { save } from "./save.js";
/* ================= MEKANLAR ================= */
export function openLoc(id, tab) {
  const I = locInfo(id, mapState());
  ({
    ev: locEv,
    stad: locStad,
    okul: locOkul,
    medya: locMedya,
    aile: locAile,
    kafe: locKafe,
    eglence: late.locEglence,
    avm: late.locAvm,
    market: late.locMarket,
    sans: late.locSans,
    sokak: late.locSokak,
    studyo: late.locStudio,
    taraftar: late.locFans,
    performans: late.locPerf,
    akademi: late.locAkademi,
    borsa: late.locBorsa,
    hipodrom: late.locHipodrom,
    liman: late.locLiman
  })[id](I, tab);
  late.placeTip(id); // ilk ziyarette kısa tanıtım (src/guide.js)
}
export const HOUSING = {
  oda: { n: $t("places.265"), rent: 0, en: 0 },
  yurt: { n: $t("map.15"), rent: 6, en: 0 },
  daire: {
    get n() {
      return $t("map.16");
    },
    rent: 70,
    en: 4
  },
  lux: {
    get n() {
      return $t("places.266");
    },
    rent: 475,
    en: 8,
    mo: 2
  },
  villa: {
    get n() {
      return $t("map.18");
    },
    rent: 2100,
    en: 12,
    mo: 4
  },
  malikane: {
    get n() {
      return $t("map.19");
    },
    rent: 7500,
    en: 15,
    mo: 6
  }
};
export const addScene = (el, kind, bubble, opts) => el.prepend(sceneEl(kind, bubble, opts));

/* --- Ev / yaşam alanı --- */
export function locEv(I, tab = "vitrin") {
  const tabs = [
    ["vitrin", $t("places.1"), "trophyRoom"],
    ["genel", $t("match.58")],
    ["yetenek", $t("places.2")],
    ["finans", $t("places.3")],
    ["kariyer", $t("places.4")],
    ...(late.unlocked("miras") ? [["miras", $t("places.350")]] : []),
    ["ev", $t("places.5")],
    ["stil", $t("sty.title")]
  ];
  if (tab === "tasarim") tab = "stil"; // eski bağlantılar: Tasarım artık Stil'in alt sekmesi
  sheet(
    I.n,
    $t("places.6", {
      city: S.city
    }),
    `${tabsHTML(tabs, tab)}<div id="evc" style="display:flex;flex-direction:column;gap:10px"></div>`
  );
  $$(".tabs button").forEach(x => (x.onclick = () => locEv(I, x.dataset.t)));
  const c = $("#evc");
  if (tab === "vitrin") {
    c.innerHTML = `<div class="scene" id="vit" style="min-height:120px"></div><div class="small muted">${$t("places.10")}</div>
     ${late.polCabinetHTML()}
     ${actHTML({
       id: "rest",
       ic: icon("bed"),
       t: $t("places.267"),
       d: $t("places.268"),
       slot: 1,
       fx: [
         [$t("places.8"), "p"],
         [$t("places.9"), "p"]
       ],
       btn: $t("places.267")
     })}`;
    vitrineCanvas().then(cv => {
      const v = $("#vit");
      if (v) {
        v.innerHTML = "";
        v.appendChild(cv);
        v.style.position = "relative";
        v.insertAdjacentHTML("beforeend", late.decorOverlay());
      }
    });
    bindActs({ rest: restAct });
    late.polBindCabinet(); // kupa dolabı (src/polish.js)
    c.insertAdjacentHTML("afterbegin", late.featsCardHTML()); // başarımlar özeti (src/feats.js)
    const fo = $("#ft-open");
    if (fo) fo.onclick = () => locEv(I, "rozet");
    c.insertAdjacentHTML("beforeend", late.decorHTML()); // ev dekoru (src/custom.js)
    late.bindDecor(() => locEv(I, "vitrin"));
  }
  if (tab === "stil") late.stilTab(c, () => locEv(I, "stil")); // görünüm + ayakkabı/forma/kutlama/tema (src/custom.js)
  if (tab === "rozet") late.featsTab(c, () => locEv(I, "rozet"));
  if (tab === "genel") {
    const rs = late.rated();
    const avg = rs.length ? (rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(2) : "–";
    c.innerHTML = `<div class="card"><div class="row nowrap" style="align-items:flex-start"><div id="pp"></div><div style="flex:1;min-width:0"><div class="eyebrow">${POS[S.pos].n} · #${S.num}</div><h2>${esc(fullName())}</h2>${late.titleText() ? `<div class="small gold">${esc(late.titleText())}</div>` : ""}${late.nickName() ? `<div class="small muted">${$t("tl.nick.label")}: <b>"${esc(late.nickName())}"</b></div>` : ""}<div class="small muted">${$t(
      "places.19",
      {
        age: S.age
      }
    )}</div><div class="small muted">${esc(S.team.name)}</div></div><div style="text-align:right"><div class="eyebrow">${$t("match.58")}</div><div class="big-num">${ovr()}</div></div></div>
     <div class="kv"><span>${$t("places.20")}</span><b>${esc(lgName())}</b><span>${$t("places.21")}</span><b>${isPro(S.stage) ? ROLE_N[S.role] : $t("places.12")}</b>${
       S.contract
         ? `<span>${$t("places.13")}</span><b>${$t("places.14", {
             contract: S.contract
           })}</b>`
         : ""
     }<span>${$t("places.22")}</span><b>${avg}</b><span>${$t("places.23")}</span><b>${fame()}/100</b><span>${$t("match.43")}</span><b>${kfmt(S.followers)}</b>${S.studying ? `<span>${$t("places.15")}</span><b>${S.aka}</b>` : ""}${S.graduated ? `<span>${$t("places.16")}</span><b>${$t("places.17")}</b>` : ""}</div></div>
     ${late.scenarioHTML()}
     <div class="card"><div class="eyebrow">${$t("places.24")}</div>${sparkHTML()}</div>
     <div class="card"><div class="eyebrow">${$t("places.25")}</div>${RELS.map(([k, n]) => {
       const v = k === "partner" && !S.partner ? 0 : S.rel[k];
       return `<div class="attr"><span>${n}</span><div class="bar"><i style="width:${v}%;background:${v < 30 ? "var(--bad)" : "var(--info)"}"></i></div><b>${k === "partner" && !S.partner ? "–" : v}</b></div>`;
     }).join("")}${
       S.partner
         ? `<div class="small muted">${$t("places.18", {
             partner: esc(S.partner)
           })}</div>`
         : ""
     }</div>`;
    $("#pp").appendChild(portrait(S.look, { ...jersey(), mood: "mutlu" }, 84, 84, S.team.c1));
  }
  if (tab === "yetenek") {
    c.innerHTML = `<div class="card"><div class="row between"><div class="eyebrow">${$t("places.26")}</div><span class="pill">${$t("places.27")} ${TD()}</span></div>${STATS.map(([k, n]) => `<div class="attr"><span>${n}</span><div class="bar"><i style="width:${statVal(k)}%"></i></div><b>${stat1(k)}</b></div>`).join("")}
     <p class="small muted">${$t("places.28")} ${STATS.map(([k, n]) => `${n} ${Math.round(eff(k))}`).join(" · ")}.</p></div>
     <div class="card"><div class="eyebrow">${$t("places.29", {
       n: POS[S.pos].n
     })}</div>${[...DRILLS[S.pos], ...COMMON_DRILLS].map(d => `<div class="small">${d[1]} · <span class="muted">${statName(d[2])}</span></div>`).join("")}<p class="small muted">${$t("places.30")}</p></div>`;
  }
  if (tab === "finans") {
    const h = HOUSING[S.housing],
      up = late.carUpkeep(),
      tx_ = Math.round(S.wage * ((BAL.tax[S.stage] || 0) + (isPro(S.stage) ? BAL.agent : 0))),
      liv = BAL.living[S.stage] || 0,
      inc = late.itemWeekly("inc");
    c.innerHTML = `<div class="card"><div class="eyebrow">${$t("core.66")}</div><div class="big-num gold">${fmt(S.money)}</div>
     <div class="kv"><span>${S.stage === "lise" ? $t("places.31") : S.stage === "uni" ? $t("places.32") : $t("places.33")} ${$t("places.38")}</span><b class="good">+${fmt(S.wage)}</b>${tx_ ? `<span>${$t("places.34")}</span><b class="bad">−${fmt(tx_)}</b>` : ""}${liv ? `<span>${$t("places.35")}</span><b class="bad">−${fmt(liv)}</b>` : ""}<span>${$t(
       "places.39",
       {
         n: h.n
       }
     )}</span><b class="${h.rent ? "bad" : ""}">${h.rent ? "−" + fmt(h.rent) : fmt(0)}</b><span>${$t("places.40")}</span><b class="${up ? "bad" : ""}">${up ? "−" + fmt(up) : fmt(0)}</b>${inc ? `<span>${$t("places.36")}</span><b class="good">+${fmt(inc)}</b>` : ""}<span><b>${$t("places.41")}</b></span><b>${fmt(S.wage - tx_ - liv - h.rent - up + inc)}</b><span>${$t("match.90")}</span><b>${fmt(S.career.earned)}</b></div></div>
     <div class="card"><div class="eyebrow">${$t("places.42")}</div><div class="tbl"><table><tr><th>${$t("places.43")}</th><th>${$t("places.44")}</th><th style="text-align:right">${$t("places.45")}</th></tr>${
       S.tx
         .slice(0, 15)
         .map(
           t =>
             `<tr><td class="muted">${t.w}</td><td>${esc(t.d)}</td><td style="text-align:right" class="${t.a < 0 ? "bad" : "good"}">${t.a < 0 ? "" : "+"}${fmt(t.a)}</td></tr>`
         )
         .join("") || `<tr><td colspan="3" class="muted">${$t("places.37")}</td></tr>`
     }</table></div></div>`;
  }
  if (tab === "kariyer") {
    late.statsTab(c);
    c.insertAdjacentHTML(
      "afterbegin",
      `<div style="display:grid">${late.albumButtonHTML()}</div>${late.familyTreeHTML()}${late.bondsCareerHTML()}`
    );
    late.bindAlbumButton(() => locEv(I, "kariyer"));
  }
  if (tab === "miras") late.legacyTab(c, () => locEv(I, "miras"));
  if (tab === "ev") {
    const can = S.stage !== "lise";
    const opts = Object.entries(HOUSING).filter(([k]) => (k !== "oda" || S.city === S.home) && (k !== "yurt" || S.studying));
    c.innerHTML = `<div class="card"><div class="row nowrap"><div style="width:52px">${icon("house")}</div><div><div class="eyebrow">${$t("places.49")}</div><h3>${HOUSING[S.housing].n}</h3><p class="small muted">${$t(
      "places.50",
      {
        rent: fmt(HOUSING[S.housing].rent),
        en: HOUSING[S.housing].en
      }
    )}</p></div></div></div>
     ${late.comfortHTML()}${late.housePartyHTML()}
     ${
       can
         ? `<div class="pgrid">${opts
             .filter(([k]) => k !== S.housing)
             .map(([k, h]) =>
               prodHTML({
                 id: "h_" + k,
                 ic: icon(
                   "house",
                   { yurt: "#7e57c2", daire: "#90a4ae", lux: "#3f5f8a", villa: "#efe6d2", malikane: "#d8b25a", oda: "#8d6e63" }[k]
                 ),
                 t: h.n,
                 d: $t("places.269", {
                   rent: fmt(h.rent),
                   v: fmt(h.rent * 4)
                 }),
                 fx: [
                   [
                     $t("places.46", {
                       en: h.en
                     }),
                     "p"
                   ],
                   [$t("life.comfortPlus", { v: late.houseComfort(k) }), "p"],
                   ...(h.mo
                     ? [
                         [
                           $t("places.47", {
                             mo: h.mo
                           }),
                           "p"
                         ]
                       ]
                     : [])
                 ],
                 price: h.rent * 4,
                 btn: $t("places.5")
               })
             )
             .join("")}</div>`
         : `<p class="small muted">${$t("places.48")}</p>`
     }`;
    const m = {};
    opts.forEach(
      ([k, h]) =>
        (m["h_" + k] = () => {
          const dep = h.rent * 4;
          if (S.money < dep) return;
          if (dep)
            tx(
              $t("places.326", {
                n: h.n
              }),
              -dep
            );
          S.housing = k;
          Bus.emit("housing", { to: k });
          news(
            $t("places.327", {
              v: fullName(),
              n: h.n
            })
          );
          save();
          toast($t("places.51") + h.n);
          locEv(I, "vitrin");
        })
    );
    bindActs(m);
    late.bindHouseParty(() => locEv(I, "ev"));
  }
}
export function restAct() {
  useSlot();
  S.energy += 35;
  S.moral += 2;
  late.restInjury(); // dinlenmiş vücut: bu hafta sakatlık riski azalır (src/lifestyle.js)
  norm();
  save();
  resultView($t("places.52"), pick([$t("places.53"), $t("places.54"), $t("places.55")]), [
    [$t("places.8"), "p"],
    [$t("life.restInj"), "p"]
  ]);
}
export function sparkHTML() {
  const rs = late.rated().slice(-10);
  if (!rs.length) return `<p class="small muted">${$t("places.56")}</p>`;
  const w = 300,
    h = 70,
    n = rs.length;
  const xs = i => (n === 1 ? w / 2 : 12 + (i * (w - 24)) / (n - 1)),
    ys = v => h - 8 - ((v - 1) / 9) * (h - 16);
  const pts = rs.map((r, i) => `${xs(i).toFixed(1)},${ys(r.rating).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Maç notları"><line x1="0" x2="${w}" y1="${ys(6)}" y2="${ys(6)}" stroke="#24314a" stroke-dasharray="4 4"/><text x="2" y="${ys(6) - 3}" fill="#5d6b82" font-size="9">6.0</text><polygon points="${xs(0)},${h} ${pts} ${xs(n - 1)},${h}" fill="var(--team)" opacity=".15"/><polyline points="${pts}" fill="none" stroke="var(--team)" stroke-width="2.5"/>${rs.map((r, i) => `<circle cx="${xs(i)}" cy="${ys(r.rating)}" r="${i === n - 1 ? 4.5 : 3}" fill="${r.win ? "#36d38e" : "#ff5468"}"/>`).join("")}</svg><div class="row" style="gap:4px">${rs.map(r => `<span class="pill ${r.win ? "w" : "l"}">${r.us}-${r.them} · ${r.rating.toFixed(1)}</span>`).join("")}</div>`;
}

/* --- Stadyum --- */
export const momentCount = () =>
  clamp(3 + Math.round(S.rel.koc / 30) + (isPro(S.stage) ? 1 : 0) + (S.role === "star" ? 1 : S.role === "bench" ? -1 : 0), 3, 7);
export const DRILL_IC = {
  shoot: "ball",
  shootmid: "ball",
  pass: "chat",
  dribble: "sneaker",
  steal: "whistle",
  post: "dumbbell",
  rebound: "hoop",
  block: "hoop",
  free: "ball",
  gym: "dumbbell"
};
export function locStad(I, tab = "mac") {
  if (S.brk && tab === "mac") tab = "idman"; // milli takım arasında lig maçı oynanmaz (src/plan.js)
  const tabs = [
    ["mac", $t("match.88")],
    ["idman", $t("places.57")],
    ["kadro", $t("places.58")],
    ["tablo", $t("places.59")]
  ];
  if (S.tryout && !S.tryout.done) tabs.push(["secme", $t("places.60")]);
  sheet(
    I.n,
    `${S.team.name} · ${S.city}`,
    `${tabsHTML(tabs, tab)}<div id="stc" style="display:flex;flex-direction:column;gap:10px"></div>`,
    { icon: crestSVG(S.team, 36) }
  );
  $$(".tabs button").forEach(x => (x.onclick = () => locStad(I, x.dataset.t)));
  const c = $("#stc");
  if (tab === "kadro") late.rosterTab(c);
  if (tab === "mac" && S.injury) {
    const fx = fixture(),
      opp = teamByKey(fx.opp);
    c.innerHTML =
      `<div class="card"><div class="eyebrow">${$t("places.61")}</div><h2 class="bad">${esc(S.injury.n)}</h2><div class="kv"><span>${$t("places.62")}</span><b>${$t(
        "places.63",
        {
          w: S.injury.w
        }
      )}</b><span>${$t("places.64")}</span><b>${esc(opp.name)}</b></div><div class="bar"><i style="width:${100 - (S.injury.w / S.injury.total) * 100}%;background:var(--good)"></i></div><p class="small muted">${$t("places.65")}</p></div>` +
      actHTML({
        id: "fizyo",
        ic: icon("kryo"),
        t: $t("story.13"),
        d: $t("places.270"),
        slot: 1,
        fx: [[$t("places.66"), "p"]],
        btn: $t("places.271")
      }) +
      late.adHealHTML() +
      `<button class="btn pri big" id="watch">${$t("places.67")}</button>`;
    bindActs({ fizyo: late.physioAct });
    late.bindAdHeal(() => locStad(I, "mac"));
    $("#watch").onclick = () => {
      closeSheet();
      late.simWithoutMe();
    };
    return;
  }
  if (tab === "mac") {
    const fx = fixture(),
      opp = teamByKey(fx.opp),
      row = S.league.find(r => r.key === opp.key),
      mr = S.league.find(r => r.key === S.team.key);
    c.innerHTML = `<div class="card" style="text-align:center"><div class="eyebrow">${$t("places.72", {
      v: phaseName(),
      week: S.week
    })}</div>
     <div class="row nowrap" style="justify-content:space-around"><div>${crestSVG(S.team, 64)}<div style="font-weight:800">${esc(S.team.short)}</div><div class="small muted">${mr.w}-${mr.l}</div></div><div class="disp" style="font-size:1.6rem;color:var(--muted)">${$t("places.73")}</div><div>${crestSVG(opp, 64)}<div style="font-weight:800">${esc(opp.short)}</div><div class="small muted">${row.w}-${row.l}</div></div></div>
     <div style="font-weight:700">${esc(opp.name)}</div><div class="small muted">${
       fx.home
         ? $t("places.68", {
             city: esc(S.city)
           })
         : $t("places.69", {
             city: esc(opp.city)
           })
     }</div></div>
     <div class="card"><div class="kv"><span>${$t("places.74")}</span><b class="${S.energy < 35 ? "bad" : ""}">${S.energy}</b><span>${$t("places.75")}</span><b>${isPro(S.stage) ? ROLE_N[S.role] : $t("places.12")}</b><span>${$t("match.42")}</span><b>${S.rel.koc}</b><span>${$t("places.76")}</span><b>${momentCount()}</b></div>${S.energy < 35 ? `<p class="small bad">${$t("places.70")}</p>` : ""}${
       S.slot > 0
         ? `<p class="small muted">${$t("places.71", {
             slot: S.slot
           })}</p>`
         : ""
     }</div>
     ${late.adEnergyHTML()}${late.derbyNote(opp)}${late.prepHTML()}${late.boostsHTML()}<button class="btn pri big" id="play">${$t("places.77")}</button><button class="btn ghost" id="qplay">${$t("places.78")}</button>`;
    $("#play").onclick = () => {
      closeSheet();
      late.playMatch();
    };
    $("#qplay").onclick = () => {
      closeSheet();
      late.playMatch({ opp, home: fx.home, comp: "lig", label: `${lgName()} · ${phaseName()}`, auto: true });
    };
    late.bindAdEnergy(() => locStad(I, "mac"));
    late.bindPrep(() => locStad(I, "mac"));
  }
  if (tab === "idman" && S.injury) {
    c.innerHTML =
      `<div class="say" style="border-left-color:var(--bad)">${$t("places.79")}</div>` +
      actHTML({
        id: "fizyo",
        ic: icon("kryo"),
        t: $t("story.13"),
        d: $t("places.270"),
        slot: 1,
        fx: [[$t("places.66"), "p"]],
        btn: $t("places.271")
      });
    bindActs({ fizyo: late.physioAct });
    return;
  }
  if (tab === "idman") {
    const list = [...DRILLS[S.pos], ...COMMON_DRILLS];
    c.innerHTML =
      late.programHTML() +
      `<div class="eyebrow">${$t("places.80", {
        n: POS[S.pos].n
      })}</div>` +
      list
        .map(([id, n, k, g, d]) =>
          actHTML({
            id,
            ic: icon(DRILL_IC[g]),
            t: n,
            d: $t("places.328", {
              d: d,
              k: statName(k),
              v: stat1(k)
            }),
            slot: 1,
            fx: [
              [$t("places.81"), "n"],
              [`${statName(k)} +0–5`, "p"]
            ],
            btn: $t("core.64"),
            disabled: S.energy < 18
          })
        )
        .join("") +
      actHTML({
        id: "takim",
        ic: icon("whistle"),
        t: $t("places.86"),
        d: $t("places.272"),
        slot: 1,
        fx: [
          [$t("places.82"), "n"],
          [$t("places.83"), "p"],
          [$t("places.84"), "p"],
          [$t("prog.teamFx"), "p"]
        ],
        btn: $t("places.273"),
        disabled: S.energy < 12
      }) +
      (S.items.hoca
        ? ""
        : actHTML({
            id: "hoca",
            ic: icon("whistle"),
            t: $t("places.274"),
            d: $t("places.275"),
            price: 6000,
            fx: [[$t("places.85"), "t"]],
            btn: fmt(6000),
            cls: "ghost"
          }));
    const m = {};
    list.forEach(
      d =>
        (m[d[0]] = () => {
          closeSheet();
          runDrill(d);
        })
    );
    m.takim = () => {
      useSlot();
      S.energy -= 12;
      S.rel.koc += 4;
      S.rel.takim += 3;
      // takım antrenmanı: sabit +1 yerine programın odak niteliğine (yoksa rastgele) seviyeye bağlı ondalık katkı;
      // iyi oynanan bir mini oyunlu antrenmandan azdır ama boşa gitmez
      const pg = late.program(),
        k = STATS.some(x => x[0] === pg) ? pg : pick(STATS)[0],
        g = Math.round(0.55 * levelMul(k) * ageGainMul() * late.modeTrainMul() * 100) / 100;
      gainStat(k, g);
      norm();
      save();
      resultView(
        $t("places.86"),
        $t("prog.team", {
          coach: S.npc.coach,
          k: statName(k),
          v: g.toFixed(2)
        }),
        [
          [$t("places.83"), "p"],
          [$t("places.84"), "p"]
        ]
      );
    };
    m.hoca = () => {
      if (S.money < 6000) return;
      tx($t("places.329"), -6000);
      S.items.hoca = 1;
      save();
      toast($t("places.88"));
      locStad(I, "idman");
    };
    bindActs(m);
    late.bindProgram(() => locStad(I, "idman"));
  }
  if (tab === "tablo") {
    c.innerHTML = `<div class="card"><div class="eyebrow">${esc(lgName())} · ${seasonLabel()}</div><div class="tbl"><table><tr><th>#</th><th>${$t("data.36")}</th><th>G</th><th>M</th><th>${$t("places.89")}</th></tr>${standings()
      .map((r, i) => {
        const t = teamByKey(r.key);
        return `<tr class="${t.key === S.team.key ? "me" : ""}"><td>${i + 1}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${t.c1};margin-right:6px"></span>${esc(t.name)}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf - r.pa > 0 ? "+" : ""}${r.pf - r.pa}</td></tr>`;
      })
      .join("")}</table></div><p class="small muted">${$t("places.90", {
      v: S.stage === "lise" ? $t("lc.toTour") : $t("lc.toPlayoff")
    })}</p></div>`;
  }
  if (tab === "secme") {
    const t = teamByKey(S.tryout.club);
    c.innerHTML =
      `<div class="card"><div class="row nowrap">${crestSVG(t, 48)}<div><div class="eyebrow">${esc(leagueName(S.tryout.stage, t.cc))}</div><h3>${esc(t.name)}</h3></div></div><p class="small">${$t(
        "places.91",
        {
          until: S.tryout.until
        }
      )}</p></div>` +
      actHTML({
        id: "go",
        ic: icon("whistle"),
        t: $t("places.276"),
        d: $t("places.277"),
        slot: 1,
        fx: [[$t("places.92"), "n"]],
        btn: $t("places.273")
      });
    bindActs({
      go: () => {
        closeSheet();
        runTryout();
      }
    });
  }
}
export function arenaFor(opp) {
  setARENA({
    home: S.team.c1,
    home2: S.team.c2,
    away: opp ? opp.c1 : "#4a5568",
    away2: opp ? opp.c2 : "#ffffff",
    led: `  ${S.team.name.toLocaleUpperCase(LOCALE)}  •  ${S.city.toLocaleUpperCase(LOCALE)}  •  ${lgName().toLocaleUpperCase(LOCALE)}  •`
  });
  if (luma(ARENA.home) < 50) ARENA.home = ARENA.home2;
  buildCrowd(ARENA.home, ARENA.away);
}
export function runGame(kind, el, e, reps, title) {
  if (kind === "shoot")
    return mgShoot(el, { eff: e, shots: reps + 1, title, dist: "three", def: false }).then(r => r.made / (reps + 1));
  if (kind === "shootmid")
    return mgShoot(el, { eff: e, shots: reps + 1, title, dist: "mid", def: false }).then(r => r.made / (reps + 1));
  if (kind === "pass") return mgPass(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "dribble") return mgDribble(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "steal")
    return mgTiming(el, { eff: e, tries: reps, title, label: $t("match.108"), kind: "steal" }).then(r => r.ok / reps);
  if (kind === "post") return mgPost(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "rebound") return mgRebound(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "block") return mgBlock(el, { eff: e, reps, title }).then(r => r.ok / reps);
  if (kind === "free") return mgTiming(el, { eff: e, tries: reps + 1, title, label: $t("games.8") }).then(r => r.ok / (reps + 1));
  return mgGym(el, { title }).then(r => clamp(r.taps / 40, 0, 1));
}
// antrenman kazancı: başarı oranı, mevcut nitelik ve bonuslar; denge simülasyonu da aynı fonksiyonu kullanır
// Kazancı niteliğe ekler (gainStat) ve ondalık değeri döndürür (ör. 0.8)
export function drillGain(k, ratio) {
  const f =
    trainingGain({ ratio, stat: statVal(k), age: S.age, coach: !!S.items.hoca, buff: S.buffs.train > 0 }) *
    late.programMul(k) *
    late.charTrainMul() *
    late.modeTrainMul() *
    late.originTrainMul() *
    late.itemTrainMul(k);
  if (S.buffs.train > 0) S.buffs.train--;
  const g = Math.round(f * 100) / 100;
  gainStat(k, g);
  return g;
}
export async function runDrill([id, name, k, kind]) {
  useSlot();
  S.energy -= 18;
  save();
  arenaFor(null);
  app.innerHTML = `<div class="row between" style="padding-top:12px"><div><div class="eyebrow">${$t("places.93", {
    short: esc(S.team.short),
    n: POS[S.pos].n
  })}</div><h2>${name}</h2></div></div><div id="stg"></div><div id="res"></div>`;
  const ratio = await runGame(kind, $("#stg"), clamp(eff(k) + 10, 5, 100), 3, name);
  const gain = drillGain(k, ratio);
  Bus.emit("train:done", { k, ratio });
  if (ratio > 0.6) S.rel.koc += 2;
  norm();
  save();
  $("#res").innerHTML = `<div class="card" style="margin-top:12px"><div class="row between"><div><div class="eyebrow">${$t(
    "places.98",
    {
      v: Math.round(ratio * 100)
    }
  )}</div><h2>${gain >= 1 ? $t("places.94") : gain >= 0.5 ? $t("places.95") : gain >= 0.1 ? $t("places.96") : $t("places.97")}</h2></div><div class="big-num ${gain >= 0.05 ? "good" : ""}">+${gain.toFixed(2)}</div></div><p class="small muted">${$t(
    "prog.drillNow",
    {
      k: statName(k),
      v: stat1(k)
    }
  )}</p><div class="bar"><i style="width:${statVal(k)}%"></i></div>${late.trainAdHTML(gain)}<button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  late.bindTrainAd(k, gain);
  $("#bk").onclick = renderMain;
}
export async function runTryout() {
  useSlot();
  S.energy -= 20;
  save();
  const club = teamByKey(S.tryout.club);
  arenaFor(club);
  app.innerHTML = `<div style="padding-top:12px" class="row nowrap">${crestSVG(club, 44)}<div><div class="eyebrow">${$t("places.60")}</div><h2>${esc(club.name)}</h2></div></div><div class="say" id="tsay">${$t("places.100")}</div><div id="stg"></div><div id="res"></div>`;
  const shift = (tdOf(S.tryout.stage, club.cc) - TD()) / 2;
  const r1 = await mgShoot($("#stg"), { eff: clamp(eff("sut") - shift, 3, 100), shots: 3, title: $t("places.278"), def: false });
  $("#tsay").textContent = $t("places.101");
  const r2 = await mgDribble($("#stg"), { eff: clamp(eff("hiz") - shift, 3, 100), reps: 1, title: $t("places.279") });
  $("#tsay").textContent = $t("places.102");
  const r3 = await mgBlock($("#stg"), {
    eff: clamp((eff("sav") + eff("guc")) / 2 - shift, 3, 100),
    reps: 1,
    title: $t("places.280")
  });
  const score = r1.made + r2.ok + r3.ok,
    pass = score >= 3;
  S.tryout.done = true;
  if (pass) {
    S.clubDeal = { club: club.key, stage: S.tryout.stage };
    news(
      $t("places.330", {
        v: fullName(),
        name: club.name
      })
    );
    S.moral += 15;
    S.rel.aile += 8;
  } else {
    S.moral -= 8;
    news(
      $t("places.331", {
        name: club.name
      })
    );
  }
  norm();
  save();
  $("#stg").innerHTML = "";
  $("#tsay").remove();
  $("#res").innerHTML = `<div class="card"><div class="eyebrow">${$t("places.107", {
    score: score
  })}</div><h2 class="${pass ? "good" : "bad"}">${pass ? $t("places.103") : $t("places.104")}</h2><p>${
    pass
      ? $t("places.105", {
          name: club.name
        })
      : $t("places.106")
  }</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}

/* --- Okul: sınıf quiz'i / menajer ofisi --- */
export const TRIVIA = [
  [$t("places.108"), "24", ["24", "30", "20", "35"]],
  [$t("places.109"), "40", ["40", "48", "36", "44"]],
  [$t("places.110"), "5", ["5", "6", "4", "7"]],
  [$t("places.111"), "5", ["5", "6", "4", "3"]],
  [$t("places.112"), $t("places.113"), $t("places.114").split("|")],
  [$t("places.115"), $t("places.116"), [$t("places.116"), $t("places.117"), $t("places.118"), $t("places.119")]],
  [$t("places.120"), "Ankara", ["Ankara", "İstanbul", "İzmir", "Bursa"]],
  [$t("places.121"), $t("places.122"), [$t("places.122"), $t("places.123"), $t("places.124"), $t("places.125")]],
  [$t("places.126"), "100 °C", ["100 °C", "90 °C", "80 °C", "120 °C"]],
  [$t("places.127"), "12", ["12", "14", "11", "16"]],
  [$t("places.128"), $t("places.129"), ["Yaprak", "Kök", "Çiçek", "Tohum"]],
  [$t("places.130"), $t("places.131"), ["Avrupa", "Asya", "Amerika", "Afrika"]]
];
export function makeQuestion() {
  const r = Math.random();
  if (r < 0.35) {
    const a = ri(2, 9),
      b = ri(2, 9),
      f = ri(0, 6);
    const ans = 3 * a + 2 * b + f;
    const o = shuffle([ans, ans + 2, ans - 3, ans + 5]).map(String);
    return {
      q: $t("places.281", {
        a: a,
        b: b,
        f: f
      }),
      a: String(ans),
      o
    };
  }
  if (r < 0.55) {
    const m = ri(3, 9),
      n = m + ri(2, 8);
    const p = Math.round((m / n) * 100);
    const o = shuffle([p, p + 7, p - 9, p + 15]).map(x => `%${x}`);
    return {
      q: $t("places.282", {
        n: n,
        m: m
      }),
      a: `%${p}`,
      o
    };
  }
  const t = pick(TRIVIA);
  return { q: t[0], a: t[1], o: shuffle(t[2]) };
}
export function runQuiz(nq, done) {
  let i = 0,
    correct = 0;
  const ask = () => {
    const Q = makeQuestion();
    const b = $("#shb");
    if (!b) return;
    b.innerHTML = "";
    addScene(b, "okul", null, { board: `SORU ${i + 1}/${nq}\n${Q.q.length > 34 ? Q.q.slice(0, 34) + "…" : Q.q}` });
    b.insertAdjacentHTML(
      "beforeend",
      `<div class="card"><div class="eyebrow">${$t("places.132", {
        v: i + 1,
        nq: nq,
        correct: correct
      })}</div><h3 style="text-transform:none;font-family:var(--body);font-weight:800;font-size:1rem;letter-spacing:0">${esc(Q.q)}</h3><div class="bar"><i id="qt" style="width:100%;transition:width 8s linear;background:var(--warn)"></i></div><div class="qopts">${Q.o.map(o => `<button class="qbtn" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`
    );
    requestAnimationFrame(() => {
      const q = $("#qt");
      if (q) q.style.width = "0%";
    });
    let over = false;
    const fin = pickd => {
      if (over || !$("#shb")) return;
      over = true;
      clearTimeout(tm);
      $$(".qbtn").forEach(x => {
        if (x.dataset.o === Q.a) x.classList.add("ok");
        else if (x.dataset.o === pickd) x.classList.add("no");
        x.disabled = true;
      });
      if (pickd === Q.a) correct++;
      setTimeout(() => {
        i++;
        i < nq ? ask() : done(correct);
      }, 900);
    };
    const tm = setTimeout(() => fin(null), 8000);
    $$(".qbtn").forEach(x => (x.onclick = () => fin(x.dataset.o)));
  };
  ask();
}
export function locOkul(I) {
  if (S.studying) {
    const isL = S.stage === "lise",
      pr = isL ? 25 : 60;
    const b = sheet(
      I.n,
      isL
        ? S.team.name
        : `${S.uni || $t("map.2")} ${$t("places.133", {
            uniYear: S.uniYear
          })}`,
      `<div class="card"><div class="attr"><span>${$t("places.15")}</span><div class="bar"><i style="width:${S.aka}%;background:var(--info)"></i></div><b>${S.aka}</b></div><p class="small muted">${isL ? $t("places.134") : $t("places.135")}</p></div>` +
        actHTML({
          id: "ders",
          ic: icon("book"),
          t: $t("places.283"),
          d: $t("places.284"),
          slot: 1,
          fx: [
            [$t("places.136"), "p"],
            [$t("places.137"), "n"]
          ],
          btn: $t("places.283")
        }) +
        actHTML({
          id: "kurs",
          ic: icon("pencil"),
          t: isL ? $t("places.138") : $t("places.139"),
          d: $t("places.285"),
          slot: 1,
          price: pr,
          fx: [
            [$t("places.140"), "p"],
            [$t("places.141"), "p"],
            [`−${fmt(pr)}`, "n"]
          ],
          btn: $t("places.286")
        }) +
        (!isL
          ? actHTML({
              id: "birak",
              ic: icon("door"),
              t: $t("places.287"),
              d: $t("places.288"),
              fx: [
                [$t("places.142"), "n"],
                [$t("places.143"), "p"]
              ],
              btn: $t("places.289"),
              cls: "bad"
            })
          : "")
    );
    addScene(b, "okul", $t("places.332"), {
      board: isL ? $t("places.333") : $t("places.334")
    });
    bindActs({
      ders: () => {
        useSlot();
        S.energy -= 6;
        S.studied = true;
        runQuiz(3, c => {
          S.aka += c * 3;
          S.moral += c === 3 ? 3 : -1;
          norm();
          save();
          resultView(
            $t("places.144"),
            c === 3
              ? $t("places.145")
              : c
                ? $t("places.146", {
                    c: c
                  })
                : $t("places.147"),
            [
              [
                $t("places.148", {
                  v: c * 3
                }),
                "p"
              ]
            ]
          );
        });
      },
      kurs: () => {
        if (S.money < pr) return;
        useSlot();
        tx(isL ? $t("places.138") : $t("places.139"), -pr);
        S.studied = true;
        runQuiz(5, c => {
          S.aka += 4 + c * 3;
          norm();
          save();
          resultView(
            $t("places.149"),
            $t("places.150", {
              c: c
            }),
            [
              [
                $t("places.148", {
                  v: 4 + c * 3
                }),
                "p"
              ]
            ]
          );
        });
      },
      birak: () => {
        S.studying = false;
        S.rel.aile -= 10;
        S.moral += 5;
        news(
          $t("places.335", {
            v: fullName()
          })
        );
        norm();
        save();
        resultView(
          $t("places.151"),
          $t("places.152", {
            mom: S.npc.mom
          })
        );
      }
    });
  } else {
    const sp = Math.max(50, Math.round(fame() * fame() * ({ nba: 9, euro: 4, t1: 2 }[S.stage] || 1.2) * late.sponsorMul()));
    const b = sheet(
      $t("map.3"),
      $t("places.153", {
        agent: S.npc.agent
      }),
      `<div class="card"><div class="kv"><span>${$t("places.13")}</span><b>${esc(S.team.name)}</b><span>${$t("places.62")}</span><b>${$t(
        "places.154",
        {
          v: S.contract || 0
        }
      )}</b><span>${$t("places.155")}</span><b>${fmt(S.wage)}</b><span>${$t("places.21")}</span><b>${ROLE_N[S.role]}</b><span>${$t("places.23")}</span><b>${fame()}/100</b></div></div>` +
        (S.buffs.sponsorSeason === S.season
          ? `<p class="small muted">${$t("places.156")}</p>`
          : actHTML({
              id: "sp",
              ic: icon("handshake"),
              t: $t("places.290"),
              d: fame() < 15 ? $t("places.157") : $t("places.158"),
              fx: [[`~${fmt(sp)}`, "p"]],
              btn: $t("places.291"),
              disabled: fame() < 15
            })) +
        actHTML({
          id: "pr",
          ic: icon("mic"),
          t: $t("ads.13"),
          d: $t("places.292"),
          slot: 1,
          fx: [
            [$t("places.159"), "p"],
            [$t("places.160"), "p"]
          ],
          btn: $t("places.293")
        }) +
        late.sponsorDealHTML() +
        late.agentExtrasHTML() +
        (S.transferReq === S.season
          ? `<p class="small warn">${$t("places.161")}</p>`
          : actHTML({
              id: "tr",
              ic: icon("door"),
              t: $t("places.294"),
              d: $t("places.295"),
              fx: [
                [$t("places.162"), "p"],
                [$t("places.163"), "n"]
              ],
              btn: $t("places.296"),
              cls: "bad"
            }))
    );
    addScene(b, "ofis", fame() > 40 ? $t("places.336") : $t("places.337"));
    late.bindAgentExtras();
    bindActs({
      tr: () => {
        S.transferReq = S.season;
        S.buffs.offer = 1;
        S.rel.koc -= 12;
        norm();
        news(
          $t("places.338", {
            v: fullName()
          })
        );
        save();
        resultView(
          $t("places.164"),
          $t("places.165", {
            agent: S.npc.agent,
            coach: S.npc.coach
          }),
          [
            [$t("places.166"), "p"],
            [$t("places.163"), "n"]
          ]
        );
      },
      sp: () => late.sponsorTalk(sp),
      pr: () => {
        useSlot();
        const g = ri(2, 6);
        S.rel.taraf += g;
        late.mediaGain(0.03, 4);
        norm();
        save();
        resultView(
          $t("ads.13"),
          $t("places.167", {
            journalist: S.npc.journalist
          }),
          [
            [
              $t("places.168", {
                g: g
              }),
              "p"
            ],
            [$t("places.169"), "p"]
          ]
        );
      }
    });
  }
}
export function negotiate(base) {
  let offer = base,
    round = 1;
  const show = () => {
    $("#shb").innerHTML = `<div class="card"><div class="eyebrow">${$t("places.170", {
      round: round
    })}</div><div class="big-num gold">${fmt(offer)}</div><p class="small muted">${$t("places.171")}</p></div><div class="grid2"><button class="btn good" id="ok1">${$t("places.172")}</button><button class="btn gold" id="up1" ${round >= 3 ? "disabled" : ""}>${$t("places.173")}</button></div>`;
    $("#ok1").onclick = () => {
      tx($t("places.290"), offer);
      S.buffs.sponsorSeason = S.season;
      news(
        $t("places.339", {
          v: fullName()
        })
      );
      save();
      resultView(
        $t("places.174"),
        $t("places.175", {
          offer: fmt(offer)
        })
      );
    };
    $("#up1").onclick = () => {
      if (Math.random() < 0.22 * round) {
        S.buffs.sponsorSeason = S.season;
        save();
        resultView($t("places.176"), $t("places.177"));
        return;
      }
      offer = Math.round(offer * 1.25);
      round++;
      show();
    };
  };
  show();
}

/* --- Medya --- */
export function locMedya(I) {
  const pr = Math.round(30 * (1 + ORDER.indexOf(S.stage) * 2));
  const b = sheet(
    I.n,
    `@${(S.first + S.last).toLocaleLowerCase(LOCALE).replace(/[^a-z0-9çğıöşü]/g, "")}${S.num}`,
    `<div class="box" style="grid-template-columns:repeat(3,1fr)"><div><b>${kfmt(S.followers)}</b><span class="eyebrow">${$t("match.43")}</span></div><div><b>${fame()}</b><span class="eyebrow">${$t("places.23")}</span></div><div><b>${S.rel.taraf}</b><span class="eyebrow">${$t("data.37")}</span></div></div>
   <div class="pgrid">${[
     {
       id: "shoot",
       ic: icon("camera"),
       t: $t("places.182"),
       d: $t("places.297"),
       slot: 1,
       fx: [[$t("places.160"), "p"]],
       btn: $t("places.298")
     },
     {
       id: "vlog",
       ic: icon("phone"),
       t: $t("places.183"),
       d: $t("places.299", {
         city: S.city
       }),
       slot: 1,
       fx: [
         [$t("places.160"), "p"],
         [$t("places.159"), "p"]
       ],
       btn: $t("places.300")
     },
     {
       id: "rop",
       ic: icon("mic"),
       t: $t("places.301"),
       d: $t("places.302"),
       slot: 1,
       fx: [[$t("places.178"), "t"]],
       btn: $t("places.303")
     },
     {
       id: "hayir",
       ic: icon("heart"),
       t: $t("places.304"),
       d: $t("places.305"),
       slot: 1,
       price: pr,
       fx: [
         [$t("places.159"), "p"],
         [`−${fmt(pr)}`, "n"]
       ],
       btn: $t("places.306")
     }
   ]
     .map(prodHTML)
     .join("")}</div>`
  );
  addScene(b, "medya", $t("places.340"));
  b.insertAdjacentHTML("beforeend", late.mediaExtraHTML()); // podcast, belgesel (src/seasonlife.js)
  late.bindMediaExtra();
  bindActs({
    shoot: () => photoSession("arena"),
    vlog: () => photoSession("city"),
    rop: interview,
    hayir: () => {
      if (S.money < pr) return;
      useSlot();
      tx($t("places.341"), -pr);
      const g = ri(5, 10);
      S.rel.taraf += g;
      late.mediaGain(0.04, 5);
      norm();
      save();
      resultView($t("places.179"), $t("places.180"), [
        [
          $t("places.168", {
            g: g
          }),
          "p"
        ],
        [$t("places.181"), "p"]
      ]);
    }
  });
}
export async function photoSession(bg) {
  useSlot();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("places.184")}</div><h2>${bg === "arena" ? $t("places.182") : $t("places.183")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgPhoto($("#stg"), { title: bg === "arena" ? $t("places.185") : $t("places.186") + S.city, bg });
  const q = Math.max(0, r.score);
  const add = late.mediaGain((q / 100) * 0.05 * (S.items.telefon ? 1.3 : 1), ri(5, 30) / 5); // medya yorgunluğu (src/economy.js)
  const tr = q >= 80 ? ri(2, 5) : q >= 50 ? ri(0, 2) : -1;
  S.rel.taraf += tr;
  norm();
  save();
  const cms =
    q >= 70
      ? [$t("places.187"), $t("places.188"), $t("places.189")]
      : q >= 40
        ? [$t("places.190"), $t("places.191"), "👍"]
        : [$t("places.192"), $t("places.193"), $t("places.194")];
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="post"><div class="ph"><i></i>${esc((S.first + S.last).toLocaleLowerCase(LOCALE))}${S.num}<span style="margin-left:auto;color:#888;font-weight:600">${esc(S.city)}</span></div>${r.img ? `<img src="${r.img}" alt="Paylaşılan fotoğraf">` : ""}<div class="pb"><div class="lk" id="lk">${$t("places.197")}</div><div><b>${esc((S.first + S.last).toLocaleLowerCase(LOCALE))}</b> ${bg === "arena" ? $t("places.195") : $t("places.196")} #${esc(S.team.short)}</div>${cms.map(x => `<div style="color:#555">${esc(x)}</div>`).join("")}</div></div>
   <div class="card" style="margin-top:12px"><div class="kv"><span>${$t("places.198")}</span><b>${q}/100</b><span>${$t("places.199")}</span><b class="good">+${kfmt(add)}</b><span>${$t("data.37")}</span><b>${tr >= 0 ? "+" : ""}${tr}</b></div><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  const likes = Math.round(add * rnd(2.5, 4));
  let k = 0;
  const lk = $("#lk");
  const iv = setInterval(() => {
    k = Math.min(likes, k + Math.ceil(likes / 30));
    if (lk) lk.textContent = `${k.toLocaleString("tr-TR")} ${$t("places.200")}`;
    if (k >= likes) clearInterval(iv);
  }, 40);
  $("#bk").onclick = () => {
    clearInterval(iv);
    renderMain();
  };
}
export function interview() {
  useSlot();
  const j = S.npc.journalist;
  const QS = [
    [
      $t("places.201"),
      [
        [$t("places.202"), { taraf: 3, takim: 3 }],
        [$t("places.203"), { taraf: 5, koc: -2, risk: 1 }],
        [$t("places.204"), { koc: 3 }]
      ]
    ],
    [
      $t("places.205", {
        rival: S.npc.rival
      }),
      [
        [$t("places.206"), { motive: 1 }],
        [$t("places.207"), { taraf: 4, risk: 1 }],
        [$t("places.208"), { taraf: 1, koc: 2 }]
      ]
    ],
    [
      $t("places.209"),
      [
        [$t("places.210"), { koc: 6 }],
        [$t("places.211"), { koc: -6, taraf: 3 }],
        [$t("places.212"), {}]
      ]
    ],
    [
      $t("places.213", {
        city: S.city
      }),
      [
        [$t("places.214"), { taraf: 5 }],
        [$t("places.215"), { aile: 4 }],
        [$t("places.216"), { koc: 2 }]
      ]
    ]
  ];
  const qs = shuffle(QS).slice(0, 2);
  let i = 0,
    log = [];
  const ask = () => {
    const [q, ans] = qs[i];
    const b = $("#shb");
    b.innerHTML = "";
    addScene(b, "medya", q, {});
    b.insertAdjacentHTML(
      "beforeend",
      `<div class="eyebrow">${$t("places.217", {
        j: esc(j),
        v: i + 1
      })}</div><div class="choices">${ans.map((a, k) => `<button class="choice" data-k="${k}"><span class="ct" style="font-size:1rem;text-transform:none;font-family:var(--body);font-weight:800">"${esc(a[0])}"</span></button>`).join("")}</div>`
    );
    $$(".choice").forEach(
      x =>
        (x.onclick = () => {
          const fx = ans[+x.dataset.k][1];
          let t = "";
          if (fx.risk && Math.random() < 0.45) {
            S.rel.taraf -= 6;
            t = $t("places.218");
          } else {
            for (const r of ["taraf", "takim", "koc", "aile"]) if (fx[r]) S.rel[r] += fx[r];
            if (fx.motive) S.buffs.motive = 1;
            if (fx.taraf > 0) S.followers *= 1 + fx.taraf / 100;
          }
          log.push(`"${ans[+x.dataset.k][0]}" ${t}`);
          i++;
          if (i < 2) ask();
          else {
            norm();
            save();
            resultView(
              $t("places.219"),
              `${$t("places.220", {
                j: esc(j)
              })} <b>"${esc(S.last)}: ${esc(ans[+x.dataset.k][0])}"</b><br><span class="muted small">${log.map(esc).join("<br>")}</span>`
            );
          }
        })
    );
  };
  ask();
}

/* --- Aile --- */
export function locAile(I) {
  const away = S.city !== S.home,
    travel = away ? Math.round(20 * (1 + ORDER.indexOf(S.stage))) : 0,
    gift = Math.max(50, Math.round(S.wage * 0.5));
  const b = sheet(
    I.n,
    away
      ? $t("places.221", {
          home: S.home,
          travel: fmt(travel)
        })
      : $t("places.342", {
          mom: S.npc.mom,
          dad: S.npc.dad
        }),
    `<div class="pgrid">${[
      {
        id: "yemek",
        ic: icon("plate"),
        t: $t("places.230"),
        d: away ? $t("places.222") : $t("places.223"),
        slot: 1,
        price: travel,
        fx: [
          [$t("places.224"), "p"],
          [$t("places.143"), "p"]
        ],
        btn: $t("places.307")
      },
      {
        id: "baba",
        ic: icon("hoop"),
        t: $t("places.233", {
          dad: S.npc.dad
        }),
        d: $t("places.308"),
        slot: 1,
        price: travel,
        fx: [
          [$t("prog.dadAile"), "p"],
          [$t("prog.dadMoral"), "p"]
        ],
        btn: $t("places.309")
      },
      ...(isPro(S.stage)
        ? [
            {
              id: "para",
              ic: icon("envelope"),
              t: $t("places.310"),
              d: $t("places.311"),
              price: gift,
              fx: [
                [$t("places.227"), "p"],
                [$t("places.228"), "p"]
              ],
              btn: fmt(gift)
            }
          ]
        : []),
      {
        id: "tel",
        ic: icon("phone"),
        t: $t("places.312"),
        d: $t("places.313"),
        fx: [[$t("places.229"), "p"]],
        btn: $t("places.314"),
        disabled: S.buffs.called === S.week
      }
    ]
      .map(prodHTML)
      .join("")}</div>`
  );
  addScene(b, "aile", S.rel.aile > 70 ? $t("places.343") : S.rel.aile > 40 ? $t("places.344") : $t("places.345"), {
    bubbleLeft: false,
    mom: {
      L: { skin: S.look.skin, hatStyle: "uzun", hair: "#5a3418" },
      o: { adult: true, jersey: "#3fa28a", sleeves: true, mood: "mutlu" }
    },
    dad: {
      L: { skin: S.look.skin, hatStyle: "yok", hair: "#2a1a10" },
      o: { adult: true, jersey: "#5a6b8a", sleeves: true, mustache: true, mood: "mutlu" }
    }
  });
  const pay = () => {
    if (travel) {
      tx(
        $t("places.346", {
          home: S.home
        }),
        -travel
      );
      S.energy -= 8;
    }
  };
  bindActs(
    {
      yemek: () => {
        if (S.money < travel) return;
        useSlot();
        pay();
        S.rel.aile += 12;
        S.moral += 5;
        norm();
        save();
        resultView(
          $t("places.230"),
          $t("places.231", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("places.224"), "p"]]
        );
      },
      baba: async () => {
        if (S.money < travel) return;
        useSlot();
        pay();
        closeSheet();
        arenaFor(null);
        app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("places.232", {
          home: esc(S.home)
        })}</div><h2>${$t("places.233", {
          dad: esc(S.npc.dad)
        })}</h2></div><div id="stg"></div><div id="res"></div>`;
        const r = await mgShoot($("#stg"), {
          eff: clamp(eff("sut") + 25, 5, 100),
          shots: 3,
          title: $t("places.315"),
          def: false
        });
        const win = r.made >= 2;
        // babayla birebir: yetenek vermez (aileyle bir aktiviteden nitelik kazanmak mantıksızdı); aile ve moral
        S.rel.aile += 9;
        S.moral += win ? 4 : 2;
        norm();
        save();
        $("#stg").innerHTML = "";
        $("#res").innerHTML = `<div class="card"><h2>${win ? $t("places.234") : $t("places.235")}</h2><p>${
          win
            ? $t("places.236", {
                dad: S.npc.dad
              })
            : $t("places.237", {
                dad: S.npc.dad
              })
        } ${$t("prog.dadRes", {
          v: win ? 4 : 2
        })}</p><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
        $("#bk").onclick = renderMain;
      },
      para: () => {
        if (S.money < gift) return;
        tx($t("places.347"), -gift);
        // para göndermek haftada bir tam etkili: tekrarında aile yalnızca küçük bir teşekkür eder (akşam yemeği anlamsızlaşmasın)
        const again = S.giftWk === `${S.season}-${S.week}`;
        S.giftWk = `${S.season}-${S.week}`;
        S.rel.aile += again ? 2 : 10;
        S.moral += again ? 0 : 3;
        norm();
        save();
        resultView(
          $t("places.239"),
          $t("places.240", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("places.227"), "p"]]
        );
      },
      tel: () => {
        S.buffs.called = S.week;
        S.rel.aile += 4;
        norm();
        save();
        resultView(
          $t("places.241"),
          $t("places.242", {
            mom: S.npc.mom,
            dad: S.npc.dad
          }),
          [[$t("places.229"), "p"]]
        );
      }
    },
    "social:done"
  );
}

/* --- Kafe --- */
export function locKafe(I) {
  const f = S.npc.friend,
    dp = Math.round(12 * (1 + ORDER.indexOf(S.stage)));
  const b = sheet(
    I.n,
    $t("places.243", {
      f: f
    }),
    `<div class="pgrid">${[
      {
        id: "sohbet",
        ic: icon("coffee"),
        t: $t("places.316"),
        d: $t("places.317", {
          f: f
        }),
        slot: 1,
        price: 3,
        fx: [
          [$t("places.244"), "p"],
          [$t("places.245"), "p"]
        ],
        btn: fmt(3)
      },
      {
        id: "izle",
        ic: icon("tv"),
        t: $t("places.318"),
        d: $t("places.319"),
        slot: 1,
        price: 5,
        fx: [
          [$t("places.143"), "p"],
          [$t("places.246"), "p"]
        ],
        btn: fmt(5)
      },
      {
        id: "oyun",
        ic: icon("pad"),
        t: $t("places.257"),
        d: $t("places.320"),
        slot: 1,
        fx: [
          [$t("places.247"), "p"],
          [$t("extras.39"), "n"]
        ],
        btn: $t("places.273")
      },
      S.partner
        ? {
            id: "randevu",
            ic: icon("heart"),
            t: $t("places.321", {
              partner: S.partner
            }),
            d: $t("places.322"),
            slot: 1,
            price: dp,
            fx: [[$t("places.248"), "p"]],
            btn: fmt(dp)
          }
        : {
            id: "flort",
            ic: icon("heart"),
            t: $t("places.323"),
            d: $t("places.324", {
              f: f
            }),
            slot: 1,
            fx: [[$t("places.249"), "t"]],
            btn: $t("places.325")
          }
    ]
      .map(prodHTML)
      .join("")}</div>${late.quizHTML()}`
  );
  late.bindQuiz(); // bilgi gecesi (src/venues.js)
  addScene(b, "kafe", $t("places.348"), {
    friend: {
      L: { skin: SKINS[hash(f) % 4], hatStyle: "bere", hat: "#2d8a3e", pom: "#f4c534" },
      o: { jersey: "#e2741f", sleeves: true, gloves: "#2d8a3e", mood: "mutlu" }
    }
  });
  bindActs(
    {
      sohbet: () => {
        if (S.money < 3) return;
        useSlot();
        tx($t("map.20"), -3);
        S.moral += 8;
        S.rel.ark += 8;
        norm();
        save();
        resultView(
          $t("places.250"),
          pick([
            $t("places.251", {
              f: f
            }),
            $t("places.252", {
              f: f
            }),
            $t("places.253", {
              f: f
            })
          ]),
          [[$t("places.244"), "p"]]
        );
      },
      izle: () => {
        if (S.money < 5) return;
        useSlot();
        tx($t("map.20"), -5);
        S.moral += 5;
        let t = $t("places.254");
        if (Math.random() < 0.5) {
          const g = gainStat("pas", Math.round(0.25 * levelMul("pas") * 100) / 100);
          t += ` ${$t("prog.watch", { v: g.toFixed(2) })}`;
        }
        // sonraki rakibin maçını izledin: o maç için pozisyonuna göre nitelik +4 (keşif)
        const sk = { PG: "pas", SG: "sut", SF: "sut", PF: "guc", C: "guc" }[S.pos] || "sut";
        S.buffs.scoutK = sk;
        t += ` ${$t("life.scout", { k: statName(sk) })}`;
        norm();
        save();
        resultView($t("places.256"), t, [[$t("places.143"), "p"]]);
      },
      oyun: () => {
        useSlot();
        S.moral += 12;
        S.energy -= 8;
        S.rel.ark += 5;
        norm();
        save();
        resultView(
          $t("places.257"),
          $t("places.258", {
            f: f
          }),
          [
            [$t("places.247"), "p"],
            [$t("extras.39"), "n"]
          ]
        );
      },
      flort: () => {
        useSlot();
        if (Math.random() < 0.3 + fame() / 250 + S.moral / 400) {
          S.partner = pick(cOf(S.city).fem);
          S.rel.partner = 50;
          S.moral += 10;
          news(
            $t("places.349", {
              v: fullName(),
              partner: S.partner
            })
          );
          norm();
          save();
          resultView(
            $t("places.259"),
            $t("places.260", {
              partner: S.partner
            }),
            [[$t("extras.37"), "p"]]
          );
        } else {
          S.moral -= 4;
          norm();
          save();
          resultView($t("casino.43"), $t("places.261"), [[$t("places.262"), "n"]]);
        }
      },
      randevu: () => {
        if (S.money < dp) return;
        useSlot();
        tx($t("places.263"), -dp);
        S.rel.partner += 12;
        S.moral += 6;
        norm();
        save();
        resultView(
          $t("places.263"),
          $t("places.264", {
            partner: S.partner
          }),
          [[$t("places.248"), "p"]]
        );
      }
    },
    "social:done"
  );
}
