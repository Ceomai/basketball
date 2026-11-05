import { LOCALE, t as $t, t } from "./i18n/index.js";
import { late } from "./late.js";
import {
  $,
  $$,
  Bus,
  CITY_C,
  COLORS,
  IST_DIST,
  IST_TYPE,
  LEAGUES,
  PAT,
  POS,
  RELS,
  STATS,
  WAGE,
  clamp,
  esc,
  fmt,
  hash,
  isPro,
  kfmt,
  leagueName,
  levelName,
  luma,
  pick,
  shuffle,
  tdOf,
  toast
} from "./data.js";
import { leaguePool } from "./clubs.js";
import { SKINS, drawKid, icon, portrait } from "./art.js";
import { mapSVG } from "./map.js";
/* ================= DURUM ================= */
export let S = null;
export const fullName = () => `${S.first} ${S.last}`;
export const jersey = () => ({ jersey: S.team.c1, trim: S.team.c2, number: S.num });
export const TD = () => tdOf(S.stage, S.team.cc);
export function ovr() {
  const w = {
    PG: [1, 1.3, 1.2, 0.7, 0.8],
    SG: [1.4, 0.9, 1.1, 0.7, 0.9],
    SF: [1.1, 0.9, 1, 1, 1],
    PF: [0.9, 0.7, 0.8, 1.3, 1.3],
    C: [0.7, 0.7, 0.7, 1.5, 1.4]
  }[S.pos];
  let t = 0,
    ws = 0;
  STATS.forEach(([k], i) => {
    t += statVal(k) * w[i];
    ws += w[i];
  });
  return Math.round((t / ws) * 10) / 10; // tek ondalık: 85.6
}
export function eff(k) {
  // moral maçta daha belirgin: 50'nin altı ve üstü ±8'e kadar (önceden ±5)
  return clamp(
    statVal(k) -
      TD() +
      (S.energy - 60) / 6 +
      (S.moral - 50) / 6.25 +
      (S.buffs.motive ? 4 : 0) +
      (S.buffs.scoutK === k ? 4 : 0) +
      (late.boostOf ? late.boostOf(k) : 0) + // maç günü güçlendiricileri (src/gear.js)
      (late.effMod ? late.effMod() : 0) +
      (late.crowdBoost ? late.crowdBoost() : 0) +
      (k === "sut" && late.sockMod ? late.sockMod() : 0), // şanslı çorap kayıp (src/tales.js); seyirci (src/matchday.js); karar anı durumu / ikinci karar (src/court.js)
    3,
    100
  );
}
export function fame() {
  return clamp(Math.round(Math.log10(Math.max(10, S.followers)) * 16 - 28), 0, 100);
}
/* ---- Yetenek gelişimi: tek giriş noktası ----
   Nitelik tam sayı kısmı S.st, ondalık birikimi S.stf'de tutulur; ekranda ikisinin toplamı tek ondalıkla görünür (45.3).
   Bütün kaynaklar (maç, antrenman, takım antrenmanı, eşya) gainStat ile ekler; maç sırasında kazanılanlar
   maç sonu ekranında ayrıca gösterilir (S.gainNow). */
export const statVal = k => Math.round(((S.st[k] || 0) + ((S.stf && S.stf[k]) || 0)) * 10) / 10;
export const stat1 = k => statVal(k).toFixed(1);
/** Seviye çarpanı: nitelik yükseldikçe her kaynaktan gelen gelişim azalır (yalnızca mini oyun değil, hepsi) */
export const levelMul = k => Math.pow(Math.max(0, 100 - statVal(k)) / 70, 2);
export const ageGainMul = () => (S.age <= 21 ? 1.25 : S.age <= 24 ? 1.1 : S.age >= 33 ? 0.3 : S.age >= 30 ? 0.6 : 1);
export function gainStat(k, amt) {
  if (!S || !amt || !S.st || S.st[k] == null) return 0;
  S.stf = S.stf || {};
  let f = (S.stf[k] || 0) + amt;
  while (f >= 1) {
    f -= 1;
    S.st[k] += 1;
  }
  while (f < 0 && S.st[k] > 1) {
    f += 1;
    S.st[k] -= 1;
  }
  S.stf[k] = Math.max(0, Math.round(f * 1000) / 1000);
  if (S.gainNow) S.gainNow[k] = Math.round(((S.gainNow[k] || 0) + amt) * 1000) / 1000;
  return amt;
}
export function norm() {
  for (const [k] of STATS) S.st[k] = clamp(Math.round(S.st[k]), 1, 99);
  for (const [k] of RELS) S.rel[k] = clamp(Math.round(S.rel[k]), 0, 100);
  S.moral = clamp(Math.round(S.moral), 0, 100);
  S.energy = clamp(Math.round(S.energy), 0, late.maxEnergy ? late.maxEnergy() : 100); // kondisyon (src/fitness.js)
  S.aka = clamp(Math.round(S.aka), 0, 100);
  S.followers = Math.max(0, Math.round(S.followers));
}
export function tx(d, a) {
  if (!S) return; // açık kariyer yok (gecikmeli bir geri çağrı)
  a = Math.round(a);
  if (a > 0 && /prim|bonus|ödül|Sponsor|Reklam|kazanc|prize|award|sponsor|\bad\b|earning/i.test(d)) late.sfx("coin");
  S.tx.unshift({ w: `S${S.season}·H${S.week}`, d, a });
  S.tx = S.tx.slice(0, 40);
  S.money += a;
  if (a > 0) S.career.earned += a;
}
export function news(t) {
  S.news.unshift({ w: `S${S.season} H${S.week}`, t });
  S.news = S.news.slice(0, 8);
}
export const seasonLabel = () => `${S.year}–${String(S.year + 1).slice(2)}`;
export const lgName = () => leagueName(S.stage === "euro" ? "t1" : S.stage, S.team.cc, S.stageSeason);
export function setTeamVars() {
  const t = S && S.team;
  const r = document.documentElement.style;
  if (!t) {
    r.setProperty("--team", "#ff6a2b");
    r.setProperty("--team-ink", "#140a04");
    return;
  }
  let a = t.c1;
  if (luma(a) < 70) a = t.c2;
  if (luma(a) < 70) a = "#ff6a2b";
  r.setProperty("--team", a);
  r.setProperty("--team-ink", luma(a) > 150 ? "#0a0f18" : "#ffffff");
  r.setProperty("--team2", t.c2);
}
export const bestCar = () =>
  S.items.araba3
    ? icon("car", "#d0142c", "super")
    : S.items.araba2
      ? icon("car", "#eceff1", "suv")
      : S.items.araba1
        ? icon("car", "#1e88e5", "hatch")
        : null;

/* ---- Takımlar ---- */
// kind: lise | uni | pro ; pro takımlar şehir + seviye tuzuyla sabit kimlik taşır
export const MY_LISE = "Mavi Martı Spor Lisesi";
export const MY_UNI = {
  "İstanbul|0": "Çınaraltı Üniversitesi",
  "İstanbul|2": "Kıyıkent Spor Akademisi",
  "Ankara|0": "Bozkır Teknik Üniversitesi"
};
export function makeTeam(kind, city, salt = 0) {
  S.teams = S.teams || {};
  const key = `${kind}|${city}|${salt}`;
  if (S.teams[key]) return S.teams[key];
  const cc = CITY_C[city] || "TR",
    h = hash(city + kind) + salt * 7;
  let name, short;
  const h0 = hash(city + kind);
  if (kind === "mylise") {
    name = MY_LISE;
    short = "MMS";
  } // kendi okulumuz: gerçekte olmayan isim
  else if (kind === "myuni") {
    name = MY_UNI[`${city}|${salt}`] || `${city} Yıldızkent Üniversitesi`;
    short = name.slice(0, 3);
  } else if (kind === "lise") {
    if (city === "İstanbul") {
      const d = IST_DIST[(salt - 1 + h0 + IST_DIST.length) % IST_DIST.length];
      name = `${d} ${IST_TYPE[(salt * 2 + h0) % IST_TYPE.length]}`;
      short = d.slice(0, 3);
    } else {
      name = `${city} ${IST_TYPE[h0 % IST_TYPE.length]}`;
    }
  } else if (kind === "uni") {
    name = `${city} ${["Üniversitesi", "Teknik Üniversitesi", "Spor Akademisi"][salt % 3]}`;
  } else {
    const p = PAT[cc] || PAT.TR;
    name = p[(salt + (h >> 2)) % p.length](city);
  }
  short = (short || city)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-zıİ]/g, "")
    .slice(0, 3)
    .toLocaleUpperCase(LOCALE);
  const col = COLORS[(h + salt * 3) % COLORS.length];
  const t = { key, name, short, city, cc, kind, c1: col[0], c2: col[1], str: +(0.88 + ((h * 13) % 25) / 100).toFixed(2) };
  S.teams[key] = t;
  return t;
}
export const saltOf = st => ({ t1: 0, t2: 1, t3: 2, euro: 0, nba: 0 })[st] || 0;
export function crestSVG(t, sz = 40) {
  const id = "c" + (hash(t.key + sz) % 99999);
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 40 40" aria-hidden="true" style="flex-shrink:0"><defs><clipPath id="${id}"><path d="M20 2 L36 7 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V7 Z"/></clipPath></defs><g clip-path="url(#${id})"><rect width="40" height="40" fill="${t.c1}"/><rect x="26" width="14" height="40" fill="${t.c2}"/></g><path d="M20 2 L36 7 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V7 Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/><text x="18" y="25" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="12" fill="${luma(t.c1) > 150 ? "#111" : "#fff"}" stroke="${t.c1}" stroke-width="2.5" paint-order="stroke">${esc(t.short)}</text></svg>`;
}
export function leagueTeams() {
  const st = S.stage,
    own = S.team;
  let list = [];
  if (st === "lise") {
    list =
      S.stageSeason === 1
        ? Array.from({ length: 7 }, (_, i) => makeTeam("lise", "İstanbul", i + 1))
        : shuffle(LEAGUES.TR.cities.filter(c => c !== "İstanbul"))
            .slice(0, 7)
            .map(c => makeTeam("lise", c, 0));
  } else if (st === "uni")
    list = shuffle(LEAGUES.TR.cities.filter(c => c !== own.city))
      .slice(0, 7)
      .map(c => makeTeam("uni", c, 0));
  // EuroLeague kulübü hafta sonu kendi ülkesinin ligini oynar; EuroLeague hafta içi ayrı turnuvadır (src/comps.js)
  else
    list = shuffle(leaguePool(st === "euro" ? "t1" : st, own.cc).filter(t => t.key !== own.key && t.name !== own.name)).slice(
      0,
      7
    );
  list.forEach((t, i) => {
    if (!t.real && (t.c1 === own.c1 || t.c1 === own.c2)) {
      const alt = COLORS.filter(x => x[0] !== own.c1 && x[0] !== own.c2);
      const c = alt[(hash(t.key) + i) % alt.length];
      t.c1 = c[0];
      t.c2 = c[1];
    }
  });
  return list;
}
export function newSeasonLeague() {
  const opps = leagueTeams();
  S.league = [S.team, ...opps].map(t => ({ key: t.key, w: 0, l: 0, pf: 0, pa: 0 }));
  // çift devreli lig: her rakiple biri iç sahada biri deplasmanda iki maç
  const first = shuffle(opps.map(t => t.key)).map((k, i) => ({ opp: k, home: i % 2 === 0 })),
    homeOf = Object.fromEntries(first.map(f => [f.opp, f.home]));
  const second = shuffle(opps.map(t => t.key)).map(k => ({ opp: k, home: !homeOf[k] }));
  if (second.length > 1 && second[0].opp === first[first.length - 1].opp) [second[0], second[1]] = [second[1], second[0]];
  // hızlı kariyer modunda tek devreli lig
  S.sched = late.isQuick() ? first : [...first, ...second];
  S.phase = "regular";
  S.results = [];
  S.week = 1;
  S.slot = 3;
  S.playoffOpp = null;
  S.ss = late.blankSS();
  late.newGoals(); // sezon hedefleri (src/goals.js)
  late.setupComps(); // Avrupa, kupa ve Süper Kupa (src/comps.js)
  late.applyPainDebt(); // ağrı kesiciyle oynanan playoffun bedeli (src/dilemmas.js)
}
export const teamByKey = k => S.teams[k];
export function standings() {
  return S.league.slice().sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa));
}
export function fixture() {
  return S.phase === "regular" ? S.sched[clamp(S.week, 1, S.sched.length) - 1] : { opp: S.playoffOpp, home: true };
}
export function phaseName() {
  const tour = S.stage === "lise" ? $t("core.1") : $t("core.3");
  return S.phase === "regular"
    ? $t("core.4")
    : S.phase === "semi"
      ? $t("core.5", {
          tour: tour
        })
      : $t("core.6", {
          tour: tour
        });
}
export const ROLE_N = { star: $t("core.77"), rot: $t("core.78"), bench: $t("core.79") };

/* ================= PANEL SİSTEMİ ================= */
export function sheet(title, sub, body, o = {}) {
  $("#ovl").innerHTML =
    `<div class="sheet-bg"><div class="sheet" role="dialog" aria-label="${esc(title)}"><div class="sheet-h">${o.icon || ""}<div style="min-width:0"><div class="eyebrow" id="shsub">${esc(sub || "")}</div><h2>${esc(title)}</h2></div>${o.noClose ? "" : `<button class="x" id="shx" aria-label="Kapat">✕</button>`}</div><div class="sheet-b" id="shb">${body}</div></div></div>`;
  if (!o.noClose) {
    const cl = () => {
      closeSheet();
      o.onClose ? o.onClose() : renderMain();
    };
    $("#shx").onclick = cl;
    $(".sheet-bg").onclick = e => {
      if (e.target.classList.contains("sheet-bg")) cl();
    };
  }
  Bus.emit("sheet:open", $("#ovl"));
  return $("#shb");
}
export function closeSheet() {
  $("#ovl").innerHTML = "";
  Bus.emit("sheet:close");
}
export function fxHTML(list) {
  return `<div class="fx">${list.map(([t, c]) => `<span class="${c || ""}">${t}</span>`).join("")}</div>`;
}
export function actHTML(a) {
  const dis = (a.slot && S.slot <= 0) || (a.price && S.money < a.price) || a.disabled;
  return `<div class="act">${a.ic ? `<div class="ai">${a.ic}</div>` : "<span></span>"}<div style="min-width:0"><h3>${a.t}</h3><p>${a.d}</p>${fxHTML([...(a.slot ? [[$t("core.7"), "t"]] : []), ...(a.fx || [])])}</div><button class="btn ${a.cls || "team"} sm" data-act="${a.id}" ${dis ? "disabled" : ""}>${a.btn || $t("core.8")}</button></div>`;
}
export function prodHTML(p) {
  const own = p.own,
    dis = own || (p.slot && S.slot <= 0) || (p.price && S.money < p.price) || p.disabled;
  return `<div class="prod${own ? " own" : ""}"><div class="ic">${p.ic}</div><h3>${p.t}</h3><p>${p.d}</p>${p.fx ? fxHTML(p.fx) : ""}<button class="btn ${own ? "ghost" : p.cls || "team"} sm" data-act="${p.id}" ${dis ? "disabled" : ""}>${own ? $t("core.9") : p.btn || (p.price ? fmt(p.price) : $t("core.10"))}</button></div>`;
}
export function bindActs(map, tag) {
  $$("[data-act]").forEach(
    b =>
      (b.onclick = () => {
        if (!map[b.dataset.act]) return;
        map[b.dataset.act]();
        if (tag) Bus.emit(tag, { act: b.dataset.act });
      })
  );
}
export function resultView(title, text, fx) {
  $("#shb").innerHTML =
    `<div class="say">${text}</div>${fx ? fxHTML(fx) : ""}<button class="btn pri" id="rb">${$t("casino.13")}</button>`;
  $("#rb").onclick = () => {
    closeSheet();
    renderMain();
  };
}
export function useSlot() {
  S.slot = Math.max(0, S.slot - 1);
}
export function tabsHTML(list, cur, attr = "t") {
  return `<div class="tabs" role="tablist">${list.map(([k, n, ic]) => `<button role="tab" aria-selected="${k === cur}" class="${k === cur ? "on" : ""}" data-${attr}="${k}">${ic ? icon(ic) : ""}${n}</button>`).join("")}</div>`;
}

/* ================= YENİ KARİYER ================= */
export let F = {
  first: "",
  last: "",
  num: 23,
  pos: "SG",
  look: { skin: "#f1c9a5", hair: "#2a1a10", hatStyle: "bere", hat: "#1d428a", pom: "#ffffff" }
};
export const HATC = ["#1d428a", "#c8102e", "#00875a", "#f0b323", "#5b2a86", "#ff4fa3", "#222222", "#e8e8e8"];
export const HAIRC = ["#111111", "#2a1a10", "#7a4a22", "#e2c15a", "#c2502a"];
export function renderCreate() {
  S = null;
  setTeamVars();
  closeSheet();
  app.innerHTML = `
  <div style="padding-top:18px" class="row between nowrap"><div><div class="eyebrow">${$t("core.18")}</div><h1>${$t("core.19")}<br>${$t("core.20")}</h1></div><div class="tagx" style="text-align:right">İstanbul<small>${$t("core.21")}</small></div></div>
  <div class="row between"><div class="eyebrow">${$t("core.22", {
    slot: F.slot
  })}</div><button class="btn ghost sm" id="bkS">${$t("core.23")}</button></div>
  <div class="card">
    <div class="grid2"><label class="small"><b>${$t("core.24")}</b><input type="text" id="fn" maxlength="14" placeholder="Ali" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" value="${esc(F.first)}"></label><label class="small"><b>${$t("core.25")}</b><input type="text" id="ln" maxlength="16" placeholder="Yılmaz" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" value="${esc(F.last)}"></label></div>
    <div class="grid2"><button class="btn ghost sm" id="npick">${$t("core.26")}</button><button class="btn ghost sm" id="nrnd">${$t("core.27")}</button></div>
    <div class="row nowrap" style="align-items:flex-start">
      <canvas id="pv" style="width:132px;height:160px;border-radius:12px;flex-shrink:0"></canvas>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div><div class="eyebrow" style="margin-bottom:6px">${$t("core.28")}</div><div class="opts" id="skin">${SKINS.map(c => `<button class="sw ${F.look.skin === c ? "on" : ""}" style="background:${c}" data-v="${c}" aria-label="Ten rengi"></button>`).join("")}</div></div>
        <div><div class="eyebrow" style="margin-bottom:6px">${$t("core.29")}</div><div class="opts" id="hs">${[
          ["bere", $t("core.11")],
          ["kep", $t("core.12")],
          ["kulak", $t("core.13")],
          ["band", $t("core.14")],
          ["yok", $t("core.15")],
          ["uzun", $t("sty.h.uzun")],
          ["afro", $t("sty.h.afro")],
          ["orgu", $t("sty.h.orgu")],
          ["kel", $t("sty.h.kel")]
        ]
          .map(([v, t]) => `<button class="opt ${F.look.hatStyle === v ? "on" : ""}" data-v="${v}">${t}</button>`)
          .join("")}</div></div>
      </div>
    </div>
    <div><div class="eyebrow" style="margin-bottom:6px">${["yok", "uzun", "afro", "orgu", "kel"].includes(F.look.hatStyle) ? $t("core.16") : $t("core.17")}</div><div class="opts" id="hc">${(["yok", "uzun", "afro", "orgu", "kel"].includes(F.look.hatStyle) ? HAIRC : [...HATC, ...late.extraHatColors()]).map(c => `<button class="sw ${(["yok", "uzun", "afro", "orgu", "kel"].includes(F.look.hatStyle) ? F.look.hair : F.look.hat) === c ? "on" : ""}" style="background:${c}" data-v="${c}" aria-label="Renk"></button>`).join("")}</div></div>
    ${F.look.hatStyle === "band" ? `<div><div class="eyebrow" style="margin-bottom:6px">${$t("core.16")}</div><div class="opts" id="hc2">${HAIRC.map(c => `<button class="sw ${F.look.hair === c ? "on" : ""}" style="background:${c}" data-v="${c}" aria-label="Saç rengi"></button>`).join("")}</div></div>` : ""}
    <div><div class="eyebrow" style="margin-bottom:6px">${$t("core.30")}</div><div class="opts" id="pos">${Object.entries(POS)
      .map(([k, p]) => `<button class="opt ${F.pos === k ? "on" : ""}" data-v="${k}"><span class="cc">${k}</span>${p.n}</button>`)
      .join("")}</div>
      <p class="small muted" style="margin-top:6px">${$t("core.31")} ${{ PG: $t("core.80"), SG: $t("core.81"), SF: $t("core.82"), PF: $t("core.83"), C: $t("core.84") }[F.pos]}</p></div>
    <div><div class="eyebrow" style="margin-bottom:6px">${$t("core.32")}</div><div class="opts" id="num">${[0, 1, 3, 7, 8, 10, 11, 13, 23, 24, 30, 33, 77, ...late.extraNumbers()].map(n => `<button class="opt ${F.num === n ? "on" : ""}" data-v="${n}">${n}</button>`).join("")}</div></div>
    ${late.modePickerHTML(F.mode || "normal")}
    ${F.heir ? "" : late.originPickerHTML(F.origin || "istanbul")}
  </div>
  <button class="btn pri big" id="go">${$t("core.33")}</button>`;
  // adlar ekrana basılır: işaretleme karakterleri alınmaz
  const keep = () => {
    F.first = $("#fn")
      .value.replace(/[<>"&]/g, "")
      .trim();
    F.last = $("#ln")
      .value.replace(/[<>"&]/g, "")
      .trim();
  };
  const bind = (id, fn) => {
    const el = $("#" + id);
    if (el)
      el.querySelectorAll("button").forEach(
        b =>
          (b.onclick = () => {
            keep();
            fn(b.dataset.v);
            renderCreate();
          })
      );
  };
  $("#bkS").onclick = late.renderSlots;
  bind("mode", v => (F.mode = v));
  bind("origin", v => (F.origin = v));
  $("#fn").onkeydown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("#ln").focus();
    }
  };
  $("#ln").onkeydown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
    }
  };
  $("#nrnd").onclick = () => {
    F.first = pick(NAME_FIRST);
    F.last = pick(NAME_LAST);
    renderCreate();
  };
  $("#npick").onclick = () => {
    keep();
    namePicker();
  };
  const cv = $("#pv"),
    d = Math.max(2, devicePixelRatio || 1);
  cv.width = 132 * d;
  cv.height = 160 * d;
  const c = cv.getContext("2d");
  c.scale(d, d);
  const g = c.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, "#2a3a58");
  g.addColorStop(1, "#141d2e");
  c.fillStyle = g;
  c.fillRect(0, 0, 132, 160);
  drawKid(c, 66, 156, 1.0, F.look, { jersey: "#c8102e", trim: "#ffffff", number: F.num, mood: "mutlu" });
  bind("skin", v => (F.look.skin = v));
  bind("hs", v => (F.look.hatStyle = v));
  bind("hc", v => {
    if (["yok", "uzun", "afro", "orgu", "kel"].includes(F.look.hatStyle)) F.look.hair = v;
    else F.look.hat = v;
  });
  bind("hc2", v => (F.look.hair = v));
  bind("pos", v => (F.pos = v));
  bind("num", v => (F.num = +v));
  $("#go").onclick = () => {
    keep();
    if (!F.first || !F.last) {
      toast($t("core.34"));
      return;
    }
    startCareer();
  };
}
// Klavye açmadan isim seçmek için dokunmatik liste
export const NAME_FIRST = [
  "Ali",
  "Emre",
  "Can",
  "Burak",
  "Mert",
  "Kerem",
  "Arda",
  "Yusuf",
  "Efe",
  "Kaan",
  "Barış",
  "Onur",
  "Serkan",
  "Tolga",
  "Sinan",
  "Cedi",
  "Ömer",
  "Furkan",
  "Enes",
  "Berk",
  "Ozan",
  "Doruk",
  "Alper",
  "Hakan",
  "Deniz",
  "Umut",
  "Eren",
  "Tarık"
];
export const NAME_LAST = [
  "Yılmaz",
  "Kaya",
  "Demir",
  "Şahin",
  "Çelik",
  "Aydın",
  "Arslan",
  "Doğan",
  "Kurt",
  "Öztürk",
  "Koç",
  "Aksoy",
  "Erdem",
  "Polat",
  "Güler",
  "Korkmaz",
  "Yıldız",
  "Taş",
  "Bulut",
  "Özkan",
  "Ateş",
  "Kılıç",
  "Turan",
  "Uçar",
  "Karaca",
  "Sarı",
  "Bozkurt",
  "Tekin"
];
export function namePicker() {
  const chips = (arr, cur, k) =>
    `<div class="opts">${arr.map(n => `<button class="opt ${cur === n ? "on" : ""}" data-${k}="${esc(n)}">${esc(n)}</button>`).join("")}</div>`;
  const draw = () => {
    sheet(
      $t("core.35"),
      $t("core.36"),
      `<div class="card" style="text-align:center"><div class="eyebrow">${$t("core.37")}</div><h2 id="npv">${esc((F.first || "—") + " " + (F.last || "—"))}</h2></div>
    <div class="eyebrow">${$t("core.24")}</div>${chips(NAME_FIRST, F.first, "nf")}<div class="eyebrow">${$t("core.25")}</div>${chips(NAME_LAST, F.last, "nl")}
    <div class="grid2"><button class="btn ghost" id="nr2">${$t("core.38")}</button><button class="btn pri" id="nok2">${$t("ads.47")}</button></div>`,
      { onClose: renderCreate }
    );
    $$("[data-nf]").forEach(
      b =>
        (b.onclick = () => {
          F.first = b.dataset.nf;
          draw();
        })
    );
    $$("[data-nl]").forEach(
      b =>
        (b.onclick = () => {
          F.last = b.dataset.nl;
          draw();
        })
    );
    $("#nr2").onclick = () => {
      F.first = pick(NAME_FIRST);
      F.last = pick(NAME_LAST);
      draw();
    };
    $("#nok2").onclick = () => {
      closeSheet();
      renderCreate();
    };
  };
  draw();
}
export function startCareer() {
  Bus.emit("career:start", { pos: F.pos });
  const co = LEAGUES.TR;
  // durumun tek tanımı: src/state.js → createState
  S = late.createState(F, {
    posBonus: POS[F.pos].b,
    npc: {
      mom: pick(["Ayşe", "Fatma", "Hülya", "Sevgi"]),
      dad: pick(["Mehmet", "Ahmet", "Mustafa", "Hasan"]),
      friend: pick(co.first),
      rival: pick(co.first) + " " + pick(co.last),
      agent: pick(co.first) + " " + pick(co.last),
      journalist: pick(co.fem) + " " + pick(co.last),
      coach: pick(co.first) + " " + pick(co.last)
    }
  });
  S.mode = F.mode || "normal";
  S.saveSlot = F.slot || 1;
  S.wk14 = 1;
  S.schema = late.SAVE_V;
  S.team = makeTeam("mylise", "İstanbul", 0);
  newSeasonLeague();
  late.migrateStory();
  S.cid = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  // başlangıç hikâyesi (src/legends.js); oğul kariyeri babasının yolundan gelir
  if (!F.heir) late.applyOrigin(F.origin);
  else S.origin = "istanbul";
  if (F.heir) {
    late.applyHeir(F.heir); // efsanenin oğlu: nitelik bonusu, miras, baba adı
    F.heir = null;
  }
  news(
    $t("core.85", {
      v: fullName(),
      name: S.team.name
    })
  );
  late.save();
  setTeamVars();
  chapter("lise1", () => {
    renderMain();
    if (!S.tut) late.startTour();
  });
}
export function migrate() {
  late.normalizeState(S);
  late.migrateStory();
  setTeamVars();
}

/* ================= HİKAYE BÖLÜMLERİ ================= */
export function chapter(id, after) {
  if (!id || S.chapters[id]) {
    after && after();
    return;
  }
  S.chapters[id] = 1;
  late.save();
  late.sfx("fanfare");
  const ln = lgName();
  const T = {
    lise1: [
      $t("core.39"),
      $t("core.40"),
      $t("core.41", {
        coach: S.npc.coach,
        name: S.team.name
      })
    ],
    lise2: [$t("core.42"), $t("core.43"), $t("core.44")],
    uni: [
      $t("core.45"),
      $t("core.46"),
      $t("core.47", {
        name: S.team.name,
        ln: ln
      })
    ],
    tryout: [$t("core.48"), $t("core.49"), `${S.tryout ? teamByKey(S.tryout.club).name : $t("core.50")} ${$t("core.51")}`],
    pro: [
      $t("core.52"),
      $t("core.53"),
      $t("core.54", {
        name: S.team.name,
        city: S.city,
        n: (LEAGUES[S.team.cc] || LEAGUES.TR).n,
        ln: ln,
        v: ROLE_N[S.role],
        coach: S.npc.coach
      })
    ],
    t2: [
      $t("core.55"),
      $t("core.56"),
      $t("core.86", {
        ln: ln,
        city: S.city
      })
    ],
    t1: [
      $t("core.57"),
      $t("core.58"),
      $t("core.87", {
        ln: ln
      })
    ],
    euro: [
      $t("core.59"),
      $t("core.60"),
      $t("core.61", {
        name: S.team.name,
        mom: S.npc.mom
      })
    ],
    nba: [
      $t("core.62"),
      $t("core.63"),
      $t("core.88", {
        name: S.team.name
      })
    ]
  }[id];
  if (!T) {
    after && after();
    return;
  }
  sheet(
    T[0],
    seasonLabel(),
    `<div class="chapter"><div class="hd"><div class="eyebrow" style="color:inherit;opacity:.75">${T[0]} · ${seasonLabel()}</div><h2 style="font-size:2rem">${T[1]}</h2></div><div class="bd"><p>${T[2]}</p><button class="btn pri" id="chok">${$t("core.64")}</button></div></div>`,
    { noClose: true }
  );
  $("#chok").onclick = () => {
    closeSheet();
    after && after();
  };
}

/* ================= ANA EKRAN ================= */
export const app = $("#app");
export function hudHTML() {
  const rank = standings().findIndex(r => r.key === S.team.key) + 1;
  const rs = late.rated().slice(-3);
  const form = rs.length ? (rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(1) : "–";
  return `<header class="hud">
   <div class="hud-id"><div class="avatar" id="hav"></div><div style="min-width:0"><div class="nm">${esc(fullName())}</div><div class="tm">${$t(
     "core.65",
     {
       age: S.age,
       n: POS[S.pos].n,
       name: esc(S.team.name)
     }
   )}</div></div>
   <div class="hud-money"><span class="eyebrow">${$t("core.66")}</span><b>${fmt(S.money)}</b></div></div>
   <div class="hud-stats">
    <div class="hs"><div class="k">${$t("core.67")}</div><div class="v">${S.energy}</div><div class="mt"><i style="width:${S.energy}%;background:${S.energy < 30 ? "var(--bad)" : S.energy < 55 ? "var(--warn)" : "var(--good)"}"></i></div></div>
    <div class="hs"><div class="k">${$t("core.68")}</div><div class="v">${S.moral}</div><div class="mt"><i style="width:${S.moral}%;background:${S.moral < 35 ? "var(--bad)" : S.moral < 55 ? "var(--warn)" : "var(--info)"}"></i></div></div>
    <div class="hs"><div class="k">${$t("core.69")}</div><div class="v">${ovr()} <span class="muted" style="font-size:.8rem">· ${form}</span></div></div>
    <div class="hs"><div class="k">${$t("core.70")}</div><div class="v">${S.phase === "regular" ? rank + "." : "PO"} <span class="muted" style="font-size:.8rem">· ${kfmt(S.followers)}</span></div></div>
   </div></header>`;
}
export function mapState() {
  return {
    city: S.city,
    home: S.home,
    slot: S.slot,
    studying: S.studying,
    stage: S.stage,
    age: S.age,
    housing: S.housing,
    team: S.team,
    car: bestCar(),
    district: late.district ? late.district() : "merkez",
    mev: late.mapEventsHere ? late.mapEventsHere() : []
  };
}
export function renderMain() {
  closeSheet();
  norm();
  late.save();
  setTeamVars();
  window.scrollTo(0, 0);
  const fx = fixture(),
    opp = teamByKey(fx.opp),
    tods = [$t("core.71"), $t("core.72"), $t("core.73"), $t("core.74")];
  app.innerHTML = `${hudHTML()}
  ${late.districtTabsHTML ? late.districtTabsHTML() : ""}<div class="mapwrap"><div class="mapin"><div class="maphead"><div class="tagx">${esc(S.city)}<small>${$t(
    "core.75",
    {
      v: seasonLabel(),
      week: S.week,
      v2: tods[S.slot]
    }
  )}</small></div><div class="tagx" style="text-align:right">${esc(lgName())}<small>${levelName(S.stage)} · ${phaseName()}</small></div></div>${mapSVG(mapState())}</div></div>
  <div class="card weekcard"><div class="row between"><div class="eyebrow">${t("main.week", { n: S.slot })}</div>${S.injury ? `<span class="pill l">${t("main.injured", { n: S.injury.w })}</span>` : `<span class="pill g">${isPro(S.stage) ? ROLE_N[S.role] : t("main.schoolTeam")}</span>`}</div>
   <div class="timebar">${[2, 1, 0].map(i => `<i class="${S.slot > i ? "on" : ""}"></i>`).join("")}</div>
   <div class="next">${crestSVG(S.team, 40)}<div style="text-align:center;min-width:0"><div class="eyebrow">${phaseName()} · ${fx.home ? t("main.home") : t("main.away")}</div><div style="font-weight:800;font-size:.95rem;line-height:1.2">${esc(S.team.short)} <span class="vs">${$t("core.76")}</span> ${esc(opp.name)}</div></div>${crestSVG(opp, 40)}</div>
   ${late.isDerby(opp) ? `<div class="small" style="color:var(--bad);text-align:center;font-weight:700">${t("main.derby", { name: esc(late.rivalName()) })}</div>` : ""}
   <div class="grid2"><button class="btn" id="quickw">${t("main.quickWeek")}</button><button class="btn pri" id="gostad">${t("main.prepare")}</button></div>${late.dayRowHTML(late.missionsButtonHTML())}</div>${late.onboardHTML()}
  <div class="card"><div class="row between"><div class="eyebrow">${t("main.news")}</div>${late.leagueButtonHTML()}</div><div class="news">${S.news.map(n => `<div><time>${esc(n.w)}</time><span>${esc(n.t)}</span></div>`).join("") || `<div class="small muted">${t("main.noNews")}</div>`}</div></div>
  <div class="row between small muted"><span>${t("main.summary", { g: S.career.games, p: S.career.pts, t: S.career.trophies.length })}</span><div class="row" style="gap:6px">${late.TEL.consent ? `<button class="btn ghost sm" id="fbk">${t("fb.short")}</button>` : ""}${late.guideButtonHTML()}<button class="btn ghost sm" id="opt">${t("main.settings")}</button><button class="btn ghost sm" id="rst">${t("main.saves")}</button></div></div>`;
  $("#hav").appendChild(portrait(S.look, { ...jersey(), mood: S.moral > 45 ? "mutlu" : "uzgun" }, 42, 42, S.team.c1));
  // portreye dokununca görünüm/stil (Ev → Stil)
  const hav = $("#hav");
  hav.style.cursor = "pointer";
  hav.title = t("sty.title");
  hav.onclick = () => late.openLoc("ev", "stil");
  $$(".loc").forEach(g => {
    const go = () => late.openLoc(g.dataset.loc);
    g.onclick = go;
    g.onkeydown = e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    };
  });
  $("#gostad").onclick = () => late.openLoc("stad", "mac");
  late.bindDistrict && late.bindDistrict(renderMain);
  $("#quickw").onclick = late.quickWeek;
  const msb = $("#msb");
  if (msb) msb.onclick = () => late.missionsSheet();
  $("#lgc").onclick = () => late.leagueSheet();
  const fbk = $("#fbk");
  if (fbk) fbk.onclick = () => late.feedbackSheet("main");
  Bus.emit("screen:main");
  $("#rst").onclick = late.renderSlots;
  $("#opt").onclick = late.settingsSheet;
  const gdb = $("#gdb");
  if (gdb) gdb.onclick = () => late.fullGuide(0);
  late.bindOnboard(renderMain);
  const td = $("#today");
  if (td) td.onclick = () => late.todaySheet(renderMain);
}

/* ================= BAŞLAT ================= */
export function start(data) {
  // dil değişikliği sonrası yeniden yükleme: aynı kariyerle devam et
  let resume = null;
  try {
    resume = sessionStorage.getItem("pota-resume");
    sessionStorage.removeItem("pota-resume");
  } catch (e) {
    /* oturum deposu kapalı */
  }
  const r = resume ? late.loadSlot(+resume) : null;
  if (r && r.S) data = { S: r.S };
  if (data && data.S) {
    S = data.S;
    migrate();
    renderMain();
  } else late.renderSlots();
}
// Oyun modülleri dil yüklendikten sonra yüklenir; sayfa "load" olayı çoktan olmuş olabilir
async function boot() {
  window.claude?.hot?.snapshot?.(() => ({ S }));
  await late.storageRestore().catch(() => 0);
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
  late.maybeAskConsent();
  late.registerPWA();
}
if (document.readyState === "complete") setTimeout(boot, 0);
else window.addEventListener("load", boot);

// Diğer modüllerin bu değişkenleri değiştirebilmesi için ayarlayıcılar
export function setS(v) {
  return (S = v);
}
