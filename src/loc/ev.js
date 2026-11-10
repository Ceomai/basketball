/* ================= MEKAN: EV / YAŞAM ALANI =================
   src/places.js'ten ayrıldı (openLoc buradan çağırır); dışa aktarım adları aynı. */
import { t as $t } from "../i18n/index.js";
import { late } from "../late.js";
import { $, $$, BAL, Bus, COMMON_DRILLS, DRILLS, POS, RELS, STATS, esc, fmt, isPro, kfmt, statName, toast } from "../data.js";
import { icon, portrait, vitrineCanvas } from "../art.js";
import { ROLE_N, S, TD, actHTML, bindActs, eff, fame, fullName, jersey, lgName, news, ovr, prodHTML, sheet, stat1, statVal, tabsHTML, tx } from "../core.js";
import { save } from "../save.js";
import { HOUSING, restAct, sparkHTML } from "../places.js";
export function locEv(I, tab = "vitrin") {
  const tabs = [
    ["vitrin", $t("home.showcase"), "trophyRoom"],
    ["genel", $t("common.overall")],
    ["yetenek", $t("home.talent")],
    ["finans", $t("home.finance")],
    ["kariyer", $t("home.stats")],
    ...(late.unlocked("miras") ? [["miras", $t("home.legacy")]] : []),
    ["ev", $t("home.move")],
    ["stil", $t("sty.title")]
  ];
  if (tab === "tasarim") tab = "stil"; // eski bağlantılar: Tasarım artık Stil'in alt sekmesi
  sheet(
    I.n,
    $t("home.livingSpace", {
      city: S.city
    }),
    `${tabsHTML(tabs, tab)}<div id="evc" class="stack"></div>`
  );
  $$(".tabs button").forEach(x => (x.onclick = () => locEv(I, x.dataset.t)));
  const c = $("#evc");
  if (tab === "vitrin") {
    c.innerHTML = `<div class="scene" id="vit" style="min-height:120px"></div><div class="small muted">${$t("home.trophiesMedalsJerseys")}</div>
     ${late.polCabinetHTML()}
     ${actHTML({
       id: "rest",
       ic: icon("bed"),
       t: $t("home.rest"),
       d: $t("home.stayHomeSleep"),
       slot: 1,
       fx: [
         [$t("common.energyPlus35"), "p"],
         [$t("home.moralePlus2"), "p"]
       ],
       btn: $t("home.rest")
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
    c.insertAdjacentHTML("beforeend", late.ambPlaquesHTML() + late.decorHTML()); // vakıf plaketleri (src/ambition.js) + ev dekoru (src/custom.js)
    late.bindDecor(() => locEv(I, "vitrin"));
  }
  if (tab === "stil") late.stilTab(c, () => locEv(I, "stil")); // görünüm + ayakkabı/forma/kutlama/tema (src/custom.js)
  if (tab === "rozet") late.featsTab(c, () => locEv(I, "rozet"));
  if (tab === "genel") {
    const rs = late.rated();
    const avg = rs.length ? (rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(2) : "–";
    c.innerHTML = `<div class="card"><div class="row nowrap" style="align-items:flex-start"><div id="pp"></div><div style="flex:1;min-width:0"><div class="eyebrow">${POS[S.pos].n} · #${S.num}</div><h2>${esc(fullName())}</h2>${late.titleText() ? `<div class="small gold">${esc(late.titleText())}</div>` : ""}${late.nickName() ? `<div class="small muted">${$t("tl.nick.label")}: <b>"${esc(late.nickName())}"</b></div>` : ""}<div class="small muted">${$t(
      "home.yrsIstanbul",
      {
        age: S.age
      }
    )}</div><div class="small muted">${esc(S.team.name)}</div></div><div class="ta-r"><div class="eyebrow">${$t("common.overall")}</div><div class="big-num">${ovr()}</div></div></div>
     <div class="kv"><span>${$t("home.league")}</span><b>${esc(lgName())}</b><span>${$t("common.role")}</span><b>${isPro(S.stage) ? ROLE_N[S.role] : $t("common.schoolTeam")}</b>${
       S.contract
         ? `<span>${$t("common.contract")}</span><b>${$t("home.yr", {
             contract: S.contract
           })}</b>`
         : ""
     }<span>${$t("home.seasonAverage")}</span><b>${avg}</b><span>${$t("common.fame")}</span><b>${fame()}/100</b><span>${$t("common.followers")}</span><b>${kfmt(S.followers)}</b>${S.studying ? `<span>${$t("common.academics")}</span><b>${S.aka}</b>` : ""}${S.graduated ? `<span>${$t("home.education")}</span><b>${$t("home.graduate")}</b>` : ""}</div></div>
     ${late.scenarioHTML()}
     <div class="card"><div class="eyebrow">${$t("home.seasonsMatches")}</div>${sparkHTML()}</div>
     <div class="card"><div class="eyebrow">${$t("home.relationships")}</div>${RELS.map(([k, n]) => {
       const v = k === "partner" && !S.partner ? 0 : S.rel[k];
       return `<div class="attr"><span>${n}</span><div class="bar"><i style="--w:${v};background:${v < 30 ? "var(--bad)" : "var(--info)"}"></i></div><b>${k === "partner" && !S.partner ? "–" : v}</b></div>`;
     }).join("")}${
       S.partner
         ? `<div class="small muted">${$t("home.partner", {
             partner: esc(S.partner)
           })}</div>`
         : ""
     }</div>`;
    $("#pp").appendChild(portrait(S.look, { ...jersey(), mood: "mutlu" }, 84, 84, S.team.c1));
  }
  if (tab === "yetenek") {
    c.innerHTML = `<div class="card"><div class="row between"><div class="eyebrow">${$t("home.attributes")}</div><span class="pill">${$t("home.leagueDifficulty")} ${TD()}</span></div>${STATS.map(([k, n]) => `<div class="attr"><span>${n}</span><div class="bar"><i style="--w:${statVal(k)}"></i></div><b>${stat1(k)}</b></div>`).join("")}
     <p class="small muted">${$t("home.effectiveValueMatches")} ${STATS.map(([k, n]) => `${n} ${Math.round(eff(k))}`).join(" · ")}.</p></div>
     <div class="card"><div class="eyebrow">${$t("home.training", {
       n: POS[S.pos].n
     })}</div>${[...DRILLS[S.pos], ...COMMON_DRILLS].map(d => `<div class="small">${d[1]} · <span class="muted">${statName(d[2])}</span></div>`).join("")}<p class="small muted">${$t("home.getNaturalDevelopment24")}</p></div>`;
  }
  if (tab === "finans") {
    const h = HOUSING[S.housing],
      up = late.carUpkeep(),
      tx_ = Math.round(S.wage * ((BAL.tax[S.stage] || 0) + (isPro(S.stage) ? BAL.agent : 0))),
      liv = BAL.living[S.stage] || 0,
      inc = late.itemWeekly("inc");
    c.innerHTML = `<div class="card"><div class="eyebrow">${$t("common.balance")}</div><div class="big-num gold">${fmt(S.money)}</div>
     <div class="kv"><span>${S.stage === "lise" ? $t("home.allowance") : S.stage === "uni" ? $t("home.scholarship") : $t("home.grossSalary")} ${$t("home.weekly")}</span><b class="good">+${fmt(S.wage)}</b>${tx_ ? `<span>${$t("home.taxAgentFee")}</span><b class="bad">−${fmt(tx_)}</b>` : ""}${liv ? `<span>${$t("home.livingExpenses")}</span><b class="bad">−${fmt(liv)}</b>` : ""}<span>${$t(
       "home.rent",
       {
         n: h.n
       }
     )}</span><b class="${h.rent ? "bad" : ""}">${h.rent ? "−" + fmt(h.rent) : fmt(0)}</b><span>${$t("home.vehicleBoatCosts")}</span><b class="${up ? "bad" : ""}">${up ? "−" + fmt(up) : fmt(0)}</b>${inc ? `<span>${$t("home.investmentIncome")}</span><b class="good">+${fmt(inc)}</b>` : ""}<span><b>${$t("home.netWeekly")}</b></span><b>${fmt(S.wage - tx_ - liv - h.rent - up + inc)}</b><span>${$t("common.careerEarnings")}</span><b>${fmt(S.career.earned)}</b></div></div>
     <div class="card"><div class="eyebrow">${$t("home.accountActivity")}</div><div class="tbl"><table><tr><th>${$t("home.week")}</th><th>${$t("home.description")}</th><th class="ta-r">${$t("home.amount")}</th></tr>${
       S.tx
         .slice(0, 15)
         .map(
           t =>
             `<tr><td class="muted">${t.w}</td><td>${esc(t.d)}</td><td class="ta-r ${t.a < 0 ? "bad" : "good"}">${t.a < 0 ? "" : "+"}${fmt(t.a)}</td></tr>`
         )
         .join("") || `<tr><td colspan="3" class="muted">${$t("home.noTransactionsYet")}</td></tr>`
     }</table></div></div>`;
  }
  if (tab === "kariyer") {
    late.statsTab(c);
    c.insertAdjacentHTML(
      "afterbegin",
      `<div style="display:grid">${late.albumButtonHTML()}</div>${late.ambGoalsHTML()}${late.familyTreeHTML()}${late.bondsCareerHTML()}${late.dbyCareerHTML()}`
    );
    late.bindAlbumButton(() => locEv(I, "kariyer"));
    late.ambBindGoals(() => locEv(I, "kariyer")); // geç kariyer hedefleri (src/ambition.js)
  }
  if (tab === "miras") late.legacyTab(c, () => locEv(I, "miras"));
  if (tab === "ev") {
    const can = S.stage !== "lise";
    const opts = Object.entries(HOUSING).filter(([k]) => (k !== "oda" || S.city === S.home) && (k !== "yurt" || S.studying));
    c.innerHTML = `<div class="card"><div class="row nowrap"><div style="width:52px">${icon("house")}</div><div><div class="eyebrow">${$t("home.currentHome")}</div><h3>${HOUSING[S.housing].n}</h3><p class="small muted">${$t(
      "home.weeklyRentEnergy",
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
                 d: $t("home.weeklyRentDeposit", {
                   rent: fmt(h.rent),
                   v: fmt(h.rent * 4)
                 }),
                 fx: [
                   [
                     $t("home.energyWeek", {
                       en: h.en
                     }),
                     "p"
                   ],
                   [$t("life.comfortPlus", { v: late.houseComfort(k) }), "p"],
                   ...(h.mo
                     ? [
                         [
                           $t("home.moraleWeek", {
                             mo: h.mo
                           }),
                           "p"
                         ]
                       ]
                     : [])
                 ],
                 price: h.rent * 4,
                 btn: $t("home.move")
               })
             )
             .join("")}</div>`
         : `<p class="small muted">${$t("home.liveFamilyUntil")}</p>`
     }`;
    const m = {};
    opts.forEach(
      ([k, h]) =>
        (m["h_" + k] = () => {
          const dep = h.rent * 4;
          if (S.money < dep) return;
          if (dep)
            tx(
              $t("home.deposit", {
                n: h.n
              }),
              -dep
            );
          S.housing = k;
          Bus.emit("housing", { to: k });
          news(
            $t("home.movedNewHome", {
              v: fullName(),
              n: h.n
            })
          );
          save();
          toast($t("home.moved") + h.n);
          locEv(I, "vitrin");
        })
    );
    bindActs(m);
    late.bindHouseParty(() => locEv(I, "ev"));
  }
}
