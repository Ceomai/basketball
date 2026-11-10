import { t as $t } from "./i18n/index.js";
/* ================= MİRAS: kariyer sonu hedefleri =================
   Zengin ve başarılı bir oyuncunun parası ve kariyeri bir anlam kazanır:
   - Vakıf: beş kademeli bağış programı (para → miras puanı, taraftar, aile)
   - Memleket kulübü ortaklığı: Mavi Martı Spor Kulübü'ne %10'luk adımlarla ortak ol; %51'de başkan olursun
   - Şöhretler Müzesi: emeklilikte miras puanına göre değerlendirme
   Miras puanı = kariyer başarıları (istatistik, kupa, MVP, All-Star, milli maç) + vakıf + kulüp + akademi/salon */
import { $, $$, Bus, esc, fmt, isPro } from "./data.js";
import { S, fullName, news, norm, tx } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";
import { brandIsEuro, brandIsNba } from "./brand.js";

export const FOUNDATION = [
  { id: "saha", p: 20000, pts: 40, fans: 5, aile: 5, n: $t("foundation.neighborhoodCourts"), d: $t("foundation.hoopsSurfacesFive") },
  { id: "burs", p: 80000, pts: 90, fans: 8, aile: 4, n: $t("foundation.scholarshipFund"), d: $t("foundation.schoolScholarships50") },
  {
    id: "engelsiz",
    p: 200000,
    pts: 150,
    fans: 12,
    aile: 4,
    n: $t("foundation.wheelchairBasketball"),
    d: $t("foundation.accessibleBasketball")
  },
  {
    id: "salonlar",
    p: 500000,
    pts: 260,
    fans: 18,
    aile: 6,
    n: $t("foundation.gymsDisasterZone"),
    d: $t("foundation.gymsKidsEarthquake")
  },
  {
    id: "altyapi",
    p: 1200000,
    pts: 400,
    fans: 25,
    aile: 8,
    n: $t("foundation.nationalYouthProgram"),
    d: $t("foundation.youthCoachesProvinces81")
  }
];
export const CLUB = { name: $t("legacy.maviMartiSpor"), step: 10, cost: s => 120000 + s * 30000, pts: 45, majority: 51 };
// eşikler ekonomi/denge simülasyonundaki miras puanı dağılımına göre (tests/economy.js)
export const HOF = [
  [3300, $t("hof.hallFameFirst"), $t("hof.nameNearlyEvery")],
  [2600, $t("hof.hallFame"), $t("hof.afterFewYears")],
  [1600, $t("hof.clubLegend"), $t("hof.missedHallFame")],
  [0, $t("hof.respectedCareer"), $t("hof.noMajorTrophies")]
];

const L = () => (S.legacy = S.legacy || { found: {}, club: 0 });
/** Miras puanı ve dökümü */
const TROPHY_W = { cup: 10, super: 10, street: 10, skill: 10, ec: 20, el: 40 };
export function legacyBreakdown() {
  const k = S.career,
    lg = L();
  // istatistik ağırlığı düşük, başarılar (kupa, MVP, All-Star, milli takım, üst lig) belirleyici
  const top = S.hist.filter(h => brandIsEuro(h.league) || brandIsNba(h.league)).length;
  const parts = [
    [$t("legacy.pointsAssistsRebounds"), Math.round((k.pts * 0.1 + k.ast * 0.2 + (k.reb || 0) * 0.12 + k.blk * 0.25) * late.modeLegacy().stat)],
    [$t("legacy.wins"), Math.round(k.wins * 0.6 * late.modeLegacy().stat)],
    // kupa türüne göre ağırlık: küçük kupalar (Süper Kupa, ülke kupası, sokak, beceri yarışması) az sayılır
    [$t("legacy.trophiesAwards"), k.trophies.reduce((a, t) => a + (TROPHY_W[t.type] ?? 30), 0) + k.mvps * 60 + (k.allStars || 0) * 50],
    [$t("legacy.euroleagueNbaSeasons"), top * 40],
    [$t("legacy.nationalTeam"), (k.natCaps || 0) * 3 + (S.natCaptain ? 80 : 0)],
    [$t("common.coachingCourse"), S.coachCourse ? 30 : 0],
    [$t("legacy.academyArena"), (S.items.akademi ? 150 : 0) + (S.items.salon ? 80 : 0)],
    [$t("legacy.foundation"), FOUNDATION.filter(f => lg.found[f.id]).reduce((a, f) => a + f.pts, 0)],
    [$t("legacy.hometownClub"), (lg.club / CLUB.step) * CLUB.pts + (lg.club >= CLUB.majority ? 100 : 0)],
    [$t("legacy.afterCareer"), S.epiloguePts || 0],
    [$t("st.legacyPart"), (lg.kids || 0) * 15],
    [$t("ac.legacyPart"), late.acadLegacy ? late.acadLegacy() : 0],
    [$t("cch.legacyPart"), late.cchLegacy ? late.cchLegacy() : 0],
    [$t("amb.legacyPart"), late.ambLegacy ? late.ambLegacy() : 0]
  ];
  const sum = parts.reduce((a, p) => a + p[1], 0),
    mul = late.modeLegacy().total;
  if (mul > 1) parts.push([$t("mode.legacyPart"), Math.round(sum * (mul - 1))]);
  return { parts, total: parts.reduce((a, p) => a + p[1], 0) };
}
export const legacyScore = () => legacyBreakdown().total;
export const hofTier = score => HOF.find(h => score >= h[0]);

function donate(f) {
  const lg = L();
  if (lg.found[f.id] || S.money < f.p) return;
  tx(
    $t("legacy.foundation2", {
      n: f.n
    }),
    -f.p
  );
  lg.found[f.id] = 1;
  S.rel.taraf += f.fans;
  S.rel.aile += f.aile;
  S.followers = Math.round(S.followers * 1.03);
  news(
    $t("legacy.foundationLaunchedNew", {
      v: fullName(),
      n: f.n
    })
  );
  Bus.emit("legacy", { kind: "foundation", id: f.id });
  norm();
  save();
}
function buyShare() {
  const lg = L(),
    c = CLUB.cost(lg.club / CLUB.step);
  if (lg.club >= 100 || S.money < c) return;
  tx(
    $t("legacy.shares", {
      name: CLUB.name
    }),
    -c
  );
  lg.club += CLUB.step;
  S.rel.taraf += 4;
  if (lg.club === CLUB.majority + 9 || (lg.club >= CLUB.majority && lg.club - CLUB.step < CLUB.majority)) {
    news(
      $t("legacy.boughtMajorityStake", {
        v: fullName(),
        name: CLUB.name
      })
    );
    late.toast($t("legacy.clubPresidentNow"));
  } else
    news(
      $t("legacy.raisedStake", {
        v: fullName(),
        name: CLUB.name,
        club: lg.club
      })
    );
  Bus.emit("legacy", { kind: "club", pct: lg.club });
  norm();
  save();
}

/** Ev → Miras sekmesi */
export function legacyTab(c, re) {
  const lg = L(),
    b = legacyBreakdown(),
    tier = hofTier(b.total),
    next = [...HOF].reverse().find(h => h[0] > b.total);
  const pro = isPro(S.stage) || S.retired;
  c.innerHTML = `<div class="card"><div class="eyebrow">${$t("legacy.legacyScore")}</div><div class="row between nowrap"><h2 class="gold">${b.total}</h2><span class="pill g">${esc(tier[1])}</span></div>
     ${
       next
         ? `<div class="bar"><i style="--w:${Math.min(100, (b.total / next[0]) * 100)};background:var(--gold)"></i></div><p class="small muted">${$t(
             "legacy.pointsNeeded",
             {
               v: esc(next[1]),
               v2: next[0]
             }
           )}</p>`
         : `<p class="small">${$t("legacy.topTier")}</p>`
     }
     <div class="kv">${b.parts.map(([n, v]) => `<span>${esc(n)}</span><b>${v}</b>`).join("")}</div>
     <p class="small muted">${$t("legacy.hallFameReview")}</p></div>
   <div class="card"><div class="eyebrow">${$t("legacy.foundation3", {
     v: esc(fullName())
   })}</div>${pro ? "" : `<p class="small muted">${$t("legacy.setFoundationOnce")}</p>`}
     <div class="choices">${FOUNDATION.map(
       f =>
         `<div class="act"><div><h3>${esc(f.n)}</h3><p>${esc(f.d)}</p><div class="fx"><span class="t">${fmt(f.p)}</span><span class="p">${$t(
           "common.legacy",
           {
             pts: f.pts
           }
         )}</span><span class="p">${$t("common.fans2", {
           fans: f.fans
         })}</span></div></div><button class="btn ${lg.found[f.id] ? "ghost" : "team"} sm" data-fd="${f.id}" ${lg.found[f.id] || !pro || S.money < f.p ? "disabled" : ""}>${lg.found[f.id] ? $t("legacy.progress") : $t("common.start2")}</button></div>`
     ).join("")}</div></div>
   <div class="card"><div class="eyebrow">${$t("legacy.hometownClub2", {
     name: esc(CLUB.name)
   })}</div><p class="small">${$t("legacy.becomePartnerPro", {
     step: CLUB.step,
     majority: CLUB.majority
   })}</p>
     <div class="bar"><i style="--w:${lg.club};background:var(--team)"></i></div><div class="kv"><span>${$t("legacy.stake")}</span><b>%${lg.club}${lg.club >= CLUB.majority ? $t("legacy.president") : ""}</b><span>${$t("legacy.nextStake")}</span><b>${lg.club >= 100 ? "–" : fmt(CLUB.cost(lg.club / CLUB.step))}</b></div>
     <button class="btn team" id="lg-share" ${lg.club >= 100 || !pro || S.money < CLUB.cost(lg.club / CLUB.step) ? "disabled" : ""}>${$t(
       "legacy.buyShares",
       {
         step: CLUB.step
       }
     )}</button></div>`;
  $$("[data-fd]").forEach(btn => (btn.onclick = () => (donate(FOUNDATION.find(f => f.id === btn.dataset.fd)), re())));
  const sh = $("#lg-share");
  if (sh) sh.onclick = () => (buyShare(), re());
  // paylaşılabilir kariyer kartı (src/card.js)
  c.insertAdjacentHTML("afterbegin", `<div style="display:grid">${late.cardButtonHTML()}</div>`);
  late.bindCardButton(() => late.openLoc("ev", "miras"));
}
/** Emeklilik ekranı için Şöhretler Müzesi kartı */
export function hofCard() {
  const b = legacyBreakdown(),
    tier = hofTier(b.total);
  Bus.emit("legacy", { kind: "hof", score: b.total, tier: tier[1] });
  return `<div class="card"><div class="eyebrow">${$t("hof.hallFame")}</div><h2 class="gold">${esc(tier[1])}</h2><p>${esc(tier[2])}</p><div class="kv">${b.parts
    .filter(p => p[1])
    .map(([n, v]) => `<span>${esc(n)}</span><b>${v}</b>`)
    .join("")}<span>${$t("hof.totalLegacyScore")}</span><b>${b.total}</b></div>${
    (L().club || 0) >= CLUB.majority
      ? `<p class="small">${$t("hof.dayAfterRetired", {
          name: esc(CLUB.name)
        })}</p>`
      : ""
  }</div>`;
}
// test/denge aracı için: otomatik oyuncunun kariyer sonu harcamaları
export function autoLegacy() {
  const lg = L();
  for (const f of FOUNDATION) if (!lg.found[f.id] && S.money >= f.p * 1.5) donate(f);
  if (lg.club < 100 && S.money >= CLUB.cost(lg.club / CLUB.step) * 1.5) buyShare();
}

/* ================= KARİYER SONRASI =================
   - Kariyer sonrası bölüm (bir kez seçilir): antrenörlük, televizyon yorumculuğu ya da (çoğunluk payı varsa) kulüp başkanlığı
   - Oğlunla yeni kariyer: aynı soyadı ve görünüş, mirasın küçük bir kısmı, Şöhretler Müzesi kademesine göre nitelik bonusu */
export const EPILOGUES = [
  {
    id: "koc",
    perk: () => $t("epilogue.sonStartsAttributesPlus1"),
    n: $t("epilogue.coach"),
    pts: 50,
    need: () => true,
    text: s =>
      $t("epilogue.firstBecameAssistant", {
        s: s
      })
  },
  {
    id: "tv",
    perk: () => $t("epilogue.sonStartsDouble"),
    n: $t("epilogue.tvPundit"),
    pts: 30,
    need: () => true,
    text: s =>
      $t("epilogue.studioEveryGame", {
        s: s
      })
  },
  {
    id: "baskan",
    perk: () => $t("epilogue.sonGetsBoth"),
    n: $t("epilogue.clubPresident"),
    pts: 80,
    need: () => (S.legacy && S.legacy.club) >= CLUB.majority,
    text: s =>
      $t("epilogue.sFirstSeason", {
        s: s,
        name: CLUB.name
      })
  }
];
export function afterCareerHTML() {
  const ep = S.epilogue && EPILOGUES.find(e => e.id === S.epilogue);
  return `<div class="card"><div class="eyebrow">${$t("legacy.afterCareer")}</div>${
    ep
      ? `<h3>${esc(ep.n)}</h3><p>${esc(ep.text(fullName()))}</p>`
      : `<p class="small">${$t("legacy.basketballChooseNext")}</p><div class="choices">${EPILOGUES.filter(e => e.need())
          .map(
            e =>
              `<button class="choice" data-ep="${e.id}"><span class="ct">${esc(e.n)}</span><span class="cd">${$t("legacy.legacyPoints", {
                pts: e.pts
              })} · ${e.perk()}</span></button>`
          )
          .join("")}</div>`
  }</div>
  <div class="card"><div class="eyebrow">${$t("legacy.nextGeneration")}</div><p class="small">${$t("legacy.sonWantsBasketball")}</p><button class="btn team" id="heir">${$t("legacy.newCareerSon")}</button></div>`;
}
export function bindAfterCareer(re) {
  $$("[data-ep]").forEach(
    b =>
      (b.onclick = () => {
        const ep = EPILOGUES.find(e => e.id === b.dataset.ep);
        S.epilogue = ep.id;
        S.epiloguePts = ep.pts;
        Bus.emit("legacy", { kind: "epilogue", id: ep.id });
        save();
        re();
      })
  );
  const h = $("#heir");
  if (h) h.onclick = startHeir;
}
export function heirBonus(score) {
  const i = HOF.findIndex(x => score >= x[0]);
  return [4, 3, 2, 1][i < 0 ? 3 : i];
}
function startHeir() {
  const score = legacyScore(),
    slot = (() => {
      for (let i = 1; i <= 5; i++) if (i !== S.saveSlot && !late.loadSlot(i)) return i;
      return S.saveSlot; // boş yuva yoksa emekli kariyerin yuvası kullanılır
    })();
  const F = late.F;
  const kid = late.heirKid ? late.heirKid() : null; // limandaki çocuk büyüdüyse onun adıyla (src/venues.js)
  F.first = kid && kid.baller ? kid.n : late.pick(late.NAME_FIRST.filter(n => n !== S.first));
  F.last = S.last;
  F.pos = late.pick(["PG", "SG", "SF", "PF", "C"]);
  F.look = { ...S.look };
  F.num = S.num;
  F.slot = slot;
  F.mode = S.mode || "normal";
  F.heir = {
    parent: fullName(),
    parentFirst: S.first,
    // son bölümün oğula etkisi: antrenör baba nitelik, yorumcu baba para ve tanınırlık, başkan baba ikisi birden
    bonus: heirBonus(score) + (S.epilogue === "koc" || S.epilogue === "baskan" ? 1 : 0) + (kid && kid.baller ? 1 : 0),
    money: Math.min(S.epilogue === "tv" || S.epilogue === "baskan" ? 8000 : 4000, Math.round(S.money * 0.05)),
    fame: S.epilogue === "tv" || S.epilogue === "baskan" ? 2000 : 0,
    tier: hofTier(score)[1],
    family: late.familyNext ? late.familyNext() : [], // soy ağacı (src/scenarios.js)
    g: kid && kid.baller ? kid.g || "m" : "m"
  };
  late.save();
  late.renderCreate();
}
/** startCareer içinden: varis bonusları */
export function applyHeir(h) {
  for (const k in S.st) S.st[k] += h.bonus;
  S.money += h.money;
  S.followers += h.fame || 0;
  S.npc.dad = h.parentFirst;
  S.heir = h;
  S.family = h.family || [];
  news(
    $t(h.g === "f" ? "legacy.64f" : "legacy.sonLegendStarted", {
      v: fullName(),
      parent: h.parent,
      name: S.team.name
    })
  );
}
