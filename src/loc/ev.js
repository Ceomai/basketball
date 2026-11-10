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
    `${tabsHTML(tabs, tab)}<div id="evc" class="stack"></div>`
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
    c.insertAdjacentHTML("beforeend", late.ambPlaquesHTML() + late.decorHTML()); // vakıf plaketleri (src/ambition.js) + ev dekoru (src/custom.js)
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
    )}</div><div class="small muted">${esc(S.team.name)}</div></div><div class="ta-r"><div class="eyebrow">${$t("match.58")}</div><div class="big-num">${ovr()}</div></div></div>
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
       return `<div class="attr"><span>${n}</span><div class="bar"><i style="--w:${v};background:${v < 30 ? "var(--bad)" : "var(--info)"}"></i></div><b>${k === "partner" && !S.partner ? "–" : v}</b></div>`;
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
    c.innerHTML = `<div class="card"><div class="row between"><div class="eyebrow">${$t("places.26")}</div><span class="pill">${$t("places.27")} ${TD()}</span></div>${STATS.map(([k, n]) => `<div class="attr"><span>${n}</span><div class="bar"><i style="--w:${statVal(k)}"></i></div><b>${stat1(k)}</b></div>`).join("")}
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
     <div class="card"><div class="eyebrow">${$t("places.42")}</div><div class="tbl"><table><tr><th>${$t("places.43")}</th><th>${$t("places.44")}</th><th class="ta-r">${$t("places.45")}</th></tr>${
       S.tx
         .slice(0, 15)
         .map(
           t =>
             `<tr><td class="muted">${t.w}</td><td>${esc(t.d)}</td><td class="ta-r ${t.a < 0 ? "bad" : "good"}">${t.a < 0 ? "" : "+"}${fmt(t.a)}</td></tr>`
         )
         .join("") || `<tr><td colspan="3" class="muted">${$t("places.37")}</td></tr>`
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
