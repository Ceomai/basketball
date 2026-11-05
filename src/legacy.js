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

export const FOUNDATION = [
  { id: "saha", p: 20000, pts: 40, fans: 5, aile: 5, n: $t("legacy.1"), d: $t("legacy.2") },
  { id: "burs", p: 80000, pts: 90, fans: 8, aile: 4, n: $t("legacy.3"), d: $t("legacy.4") },
  {
    id: "engelsiz",
    p: 200000,
    pts: 150,
    fans: 12,
    aile: 4,
    n: $t("legacy.5"),
    d: $t("legacy.6")
  },
  {
    id: "salonlar",
    p: 500000,
    pts: 260,
    fans: 18,
    aile: 6,
    n: $t("legacy.7"),
    d: $t("legacy.8")
  },
  {
    id: "altyapi",
    p: 1200000,
    pts: 400,
    fans: 25,
    aile: 8,
    n: $t("legacy.9"),
    d: $t("legacy.10")
  }
];
export const CLUB = { name: $t("legacy.11"), step: 10, cost: s => 120000 + s * 30000, pts: 45, majority: 51 };
// eşikler ekonomi/denge simülasyonundaki miras puanı dağılımına göre (tests/economy.js)
export const HOF = [
  [3300, $t("legacy.12"), $t("legacy.13")],
  [2600, $t("legacy.14"), $t("legacy.15")],
  [1600, $t("legacy.16"), $t("legacy.17")],
  [0, $t("legacy.18"), $t("legacy.19")]
];

const L = () => (S.legacy = S.legacy || { found: {}, club: 0 });
/** Miras puanı ve dökümü */
const TROPHY_W = { cup: 10, super: 10, street: 10, skill: 10, ec: 20, el: 40 };
export function legacyBreakdown() {
  const k = S.career,
    lg = L();
  // istatistik ağırlığı düşük, başarılar (kupa, MVP, All-Star, milli takım, üst lig) belirleyici
  const top = S.hist.filter(h => /EuroLeague|NBA/.test(h.league)).length;
  const parts = [
    [$t("legacy.20"), Math.round((k.pts * 0.1 + k.ast * 0.2 + (k.reb || 0) * 0.12 + k.blk * 0.25) * late.modeLegacy().stat)],
    [$t("legacy.21"), Math.round(k.wins * 0.6 * late.modeLegacy().stat)],
    // kupa türüne göre ağırlık: küçük kupalar (Süper Kupa, ülke kupası, sokak, beceri yarışması) az sayılır
    [$t("legacy.22"), k.trophies.reduce((a, t) => a + (TROPHY_W[t.type] ?? 30), 0) + k.mvps * 60 + (k.allStars || 0) * 50],
    [$t("legacy.23"), top * 40],
    [$t("legacy.24"), (k.natCaps || 0) * 3 + (S.natCaptain ? 80 : 0)],
    [$t("legacy.25"), S.coachCourse ? 30 : 0],
    [$t("legacy.26"), (S.items.akademi ? 150 : 0) + (S.items.salon ? 80 : 0)],
    [$t("legacy.27"), FOUNDATION.filter(f => lg.found[f.id]).reduce((a, f) => a + f.pts, 0)],
    [$t("legacy.28"), (lg.club / CLUB.step) * CLUB.pts + (lg.club >= CLUB.majority ? 100 : 0)],
    [$t("legacy.52"), S.epiloguePts || 0],
    [$t("st.legacyPart"), (lg.kids || 0) * 15],
    [$t("ac.legacyPart"), late.acadLegacy ? late.acadLegacy() : 0]
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
    $t("legacy.29", {
      n: f.n
    }),
    -f.p
  );
  lg.found[f.id] = 1;
  S.rel.taraf += f.fans;
  S.rel.aile += f.aile;
  S.followers = Math.round(S.followers * 1.03);
  news(
    $t("legacy.30", {
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
    $t("legacy.31", {
      name: CLUB.name
    }),
    -c
  );
  lg.club += CLUB.step;
  S.rel.taraf += 4;
  if (lg.club === CLUB.majority + 9 || (lg.club >= CLUB.majority && lg.club - CLUB.step < CLUB.majority)) {
    news(
      $t("legacy.32", {
        v: fullName(),
        name: CLUB.name
      })
    );
    late.toast($t("legacy.33"));
  } else
    news(
      $t("legacy.34", {
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
  c.innerHTML = `<div class="card"><div class="eyebrow">${$t("legacy.42")}</div><div class="row between nowrap"><h2 class="gold">${b.total}</h2><span class="pill g">${esc(tier[1])}</span></div>
     ${
       next
         ? `<div class="bar"><i style="width:${Math.min(100, (b.total / next[0]) * 100)}%;background:var(--gold)"></i></div><p class="small muted">${$t(
             "legacy.35",
             {
               v: esc(next[1]),
               v2: next[0]
             }
           )}</p>`
         : `<p class="small">${$t("legacy.36")}</p>`
     }
     <div class="kv">${b.parts.map(([n, v]) => `<span>${esc(n)}</span><b>${v}</b>`).join("")}</div>
     <p class="small muted">${$t("legacy.43")}</p></div>
   <div class="card"><div class="eyebrow">${$t("legacy.44", {
     v: esc(fullName())
   })}</div>${pro ? "" : `<p class="small muted">${$t("legacy.37")}</p>`}
     <div class="choices">${FOUNDATION.map(
       f =>
         `<div class="act"><div><h3>${esc(f.n)}</h3><p>${esc(f.d)}</p><div class="fx"><span class="t">${fmt(f.p)}</span><span class="p">${$t(
           "legacy.39",
           {
             pts: f.pts
           }
         )}</span><span class="p">${$t("legacy.40", {
           fans: f.fans
         })}</span></div></div><button class="btn ${lg.found[f.id] ? "ghost" : "team"} sm" data-fd="${f.id}" ${lg.found[f.id] || !pro || S.money < f.p ? "disabled" : ""}>${lg.found[f.id] ? $t("legacy.38") : $t("places.306")}</button></div>`
     ).join("")}</div></div>
   <div class="card"><div class="eyebrow">${$t("legacy.45", {
     name: esc(CLUB.name)
   })}</div><p class="small">${$t("legacy.46", {
     step: CLUB.step,
     majority: CLUB.majority
   })}</p>
     <div class="bar"><i style="width:${lg.club}%;background:var(--team)"></i></div><div class="kv"><span>${$t("legacy.47")}</span><b>%${lg.club}${lg.club >= CLUB.majority ? $t("legacy.41") : ""}</b><span>${$t("legacy.48")}</span><b>${lg.club >= 100 ? "–" : fmt(CLUB.cost(lg.club / CLUB.step))}</b></div>
     <button class="btn team" id="lg-share" ${lg.club >= 100 || !pro || S.money < CLUB.cost(lg.club / CLUB.step) ? "disabled" : ""}>${$t(
       "legacy.49",
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
  return `<div class="card"><div class="eyebrow">${$t("legacy.14")}</div><h2 class="gold">${esc(tier[1])}</h2><p>${esc(tier[2])}</p><div class="kv">${b.parts
    .filter(p => p[1])
    .map(([n, v]) => `<span>${esc(n)}</span><b>${v}</b>`)
    .join("")}<span>${$t("legacy.51")}</span><b>${b.total}</b></div>${
    (L().club || 0) >= CLUB.majority
      ? `<p class="small">${$t("legacy.50", {
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
    perk: () => $t("legacy.65"),
    n: $t("legacy.53"),
    pts: 50,
    need: () => true,
    text: s =>
      $t("legacy.54", {
        s: s
      })
  },
  {
    id: "tv",
    perk: () => $t("legacy.66"),
    n: $t("legacy.55"),
    pts: 30,
    need: () => true,
    text: s =>
      $t("legacy.56", {
        s: s
      })
  },
  {
    id: "baskan",
    perk: () => $t("legacy.67"),
    n: $t("legacy.57"),
    pts: 80,
    need: () => (S.legacy && S.legacy.club) >= CLUB.majority,
    text: s =>
      $t("legacy.58", {
        s: s,
        name: CLUB.name
      })
  }
];
export function afterCareerHTML() {
  const ep = S.epilogue && EPILOGUES.find(e => e.id === S.epilogue);
  return `<div class="card"><div class="eyebrow">${$t("legacy.52")}</div>${
    ep
      ? `<h3>${esc(ep.n)}</h3><p>${esc(ep.text(fullName()))}</p>`
      : `<p class="small">${$t("legacy.60")}</p><div class="choices">${EPILOGUES.filter(e => e.need())
          .map(
            e =>
              `<button class="choice" data-ep="${e.id}"><span class="ct">${esc(e.n)}</span><span class="cd">${$t("legacy.59", {
                pts: e.pts
              })} · ${e.perk()}</span></button>`
          )
          .join("")}</div>`
  }</div>
  <div class="card"><div class="eyebrow">${$t("legacy.61")}</div><p class="small">${$t("legacy.62")}</p><button class="btn team" id="heir">${$t("legacy.63")}</button></div>`;
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
  news(
    $t(h.g === "f" ? "legacy.64f" : "legacy.64", {
      v: fullName(),
      parent: h.parent,
      name: S.team.name
    })
  );
}
