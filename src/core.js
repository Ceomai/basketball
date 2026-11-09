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
import { fitMapLabels, mapSVG } from "./map.js";
import { brandGen } from "./brand.js";
import { inkOn } from "./theme.js";
/* ================= DURUM ================= */
export let S = null;
export const fullName = () => `${S.first} ${S.last}`;
export const jersey = () => ({ jersey: S.team.c1, trim: S.team.c2, number: S.num, age: S.age }); // age: yaşlanan portre
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
  if (late.inboxAdd) late.inboxAdd(t, "news"); // bildirim kutusu (src/inbox.js)
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
  r.setProperty("--team-ink", inkOn(a)); // WCAG: koyu ve beyaz adaydan kontrastı yüksek olan
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
    name = brandGen(p[(salt + (h >> 2)) % p.length](city), city); // üretilen ad gerçek bir kulübe denk gelmesin
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
  S.offPend = 0; // sezon geçişi tamamlandı (src/match.js offResume)
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
  return S.phase === "regular" ? S.sched[clamp(S.week, 1, S.sched.length) - 1] : { opp: S.playoffOpp, home: late.serHome() }; // seri ev/deplasman sırası (src/series.js)
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

/* ================= PANEL SİSTEMİ =================
   Kapatılabilir panel: ✕, arka plana dokunma, Esc, tutamaçtan/başlıktan aşağı sürükleme ve (web/PWA'da) tarayıcı
   geri hareketi kapatır. Zorunlu panelde (noClose) bunların hiçbiri yok; geri hareketi "Bir seçim yap" der.
   Açılınca odak panele gelir, Tab panel içinde döner; kapanınca odak paneli açan öğeye (hâlâ ekrandaysa) döner. */
const SH = { opener: null, guard: false };
const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
export function sheet(title, sub, body, o = {}) {
  const wasOpen = !!$("#ovl .sheet");
  if (!wasOpen) {
    const ae = document.activeElement;
    SH.opener = ae && ae !== document.body && !$("#ovl").contains(ae) ? ae : null;
  }
  $("#ovl").innerHTML =
    `<div class="sheet-bg"><div class="sheet${o.noClose ? " locked" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1">${o.noClose ? "" : '<div class="grab" aria-hidden="true"></div>'}<div class="sheet-h">${o.icon || ""}<div class="minw-0"><div class="eyebrow" id="shsub">${esc(sub || "")}</div><h2>${esc(title)}</h2></div>${o.noClose ? "" : `<button class="x" id="shx" aria-label="${$t("a11y.close")}">✕</button>`}</div><div class="sheet-b" id="shb">${body}</div></div></div>`;
  if (!o.noClose) {
    const cl = () => {
      closeSheet();
      o.onClose ? o.onClose() : renderMain();
    };
    $("#shx").onclick = cl;
    $(".sheet-bg").onclick = e => {
      if (e.target.classList.contains("sheet-bg")) cl();
    };
    sheetDrag($(".sheet"), cl);
  }
  sheetGuard();
  const sh = $("#ovl .sheet");
  try {
    sh.focus({ preventScroll: true });
  } catch (e) {
    /* odak desteklenmiyor */
  }
  Bus.emit("sheet:open", $("#ovl"));
  return $("#shb");
}
export function closeSheet() {
  const had = !!$("#ovl .sheet");
  $("#ovl").innerHTML = "";
  Bus.emit("sheet:close");
  if (had && !$("#ovl .sheet")) {
    const op = SH.opener;
    SH.opener = null;
    if (op && op.isConnected && typeof op.focus === "function")
      try {
        op.focus({ preventScroll: true });
      } catch (e) {
        /* yok */
      }
  }
}
/** Tutamaç ya da başlıktan aşağı sürükleyerek kapatma (yalnız kapatılabilir panel) */
function sheetDrag(sh, close) {
  if (!sh) return;
  let y0 = null,
    dy = 0,
    t0 = 0;
  const down = e => {
    if (e.button > 0 || e.target.closest("button,a,input,textarea")) return;
    y0 = e.clientY;
    dy = 0;
    t0 = Date.now();
    sh.style.transition = "none";
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {
      /* yok */
    }
  };
  const move = e => {
    if (y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    sh.style.transform = dy ? `translateY(${dy}px)` : "";
  };
  const up = () => {
    if (y0 == null) return;
    y0 = null;
    sh.style.transition = "";
    const fast = dy > 30 && dy / Math.max(1, Date.now() - t0) > 0.6;
    if (dy > 90 || fast) close();
    else sh.style.transform = "";
  };
  for (const h of [sh.querySelector(".grab"), sh.querySelector(".sheet-h")]) {
    if (!h) continue;
    h.style.touchAction = "none";
    h.addEventListener("pointerdown", down);
    h.addEventListener("pointermove", move);
    h.addEventListener("pointerup", up);
    h.addEventListener("pointercancel", up);
  }
}
/* Web/PWA geri hareketi: panel açılınca tek bir geçmiş kaydı eklenir; geri gelince uygulamadaki geri tuşu mantığı
   (src/native.js nativeBack) çalışır. Uygulamada (Capacitor) geri tuşunu native.js dinler: çift işlem olmasın diye eklenmez. */
function sheetGuard() {
  if (SH.guard || late.isNative) return;
  try {
    history.pushState({ potaSheet: 1 }, "");
    SH.guard = true;
  } catch (e) {
    /* geçmiş yok */
  }
}
try {
  window.addEventListener("popstate", () => {
    if (!SH.guard || late.isNative) return;
    SH.guard = false;
    const r = late.nativeBack ? late.nativeBack() : "min";
    if (r === "locked") sheetGuard(); // zorunlu panel açık kalır: geri hareketi tekrar yakalansın
  });
  document.addEventListener("keydown", e => {
    const sh = $("#ovl .sheet");
    if (!sh || $("#adov")) return;
    if (e.key === "Escape") {
      const x = $("#shx");
      if (x) {
        e.preventDefault();
        x.click();
      }
    } else if (e.key === "Tab") {
      const f = [...sh.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
      if (!f.length) return e.preventDefault();
      const first = f[0],
        last = f[f.length - 1],
        a = document.activeElement;
      if (!sh.contains(a)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (a === first || a === sh)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && a === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
} catch (e) {
  /* DOM yok */
}
export function fxHTML(list) {
  return `<div class="fx">${list.map(([t, c]) => `<span class="${c || ""}">${t}</span>`).join("")}</div>`;
}
export function actHTML(a) {
  const dis = (a.slot && S.slot <= 0) || (a.price && S.money < a.price) || a.disabled;
  return `<div class="act">${a.ic ? `<div class="ai">${a.ic}</div>` : "<span></span>"}<div class="minw-0"><h3>${a.t}</h3><p>${a.d}</p>${fxHTML([...(a.slot ? [[$t("core.7"), "t"]] : []), ...(a.fx || [])])}</div><button class="btn ${a.cls || "team"} sm" data-act="${a.id}" ${dis ? "disabled" : ""}>${a.btn || $t("core.8")}</button></div>`;
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
  if (!$("#shb")) return; // panel bu arada kapandıysa (geri tuşu, başka ekran) sonuç sessizce düşer
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
const HAIR_STY = ["yok", "uzun", "afro", "orgu", "kel"];
const swHTML = (list, cur, key) =>
  list
    .map(
      (c, i) =>
        `<button class="sw ${cur === c ? "on" : ""}" style="background:${c}" data-v="${c}" aria-label="${esc($t(key, { n: i + 1 }))}" aria-pressed="${cur === c}"></button>`
    )
    .join("");
export function renderCreate() {
  S = null;
  setTeamVars();
  closeSheet();
  const hairMode = HAIR_STY.includes(F.look.hatStyle);
  // Üstte kimlik (ad, görünüm, pozisyon, numara); mod/zorluk/köken/senaryo "Gelişmiş seçenekler"de (seçimler korunur)
  app.innerHTML = `
  <div class="row between nowrap pt-4h"><div><div class="eyebrow">${$t("core.18")}</div><h1>${$t("core.19")}<br>${$t("core.20")}</h1></div><div class="tagx ta-r">İstanbul<small>${$t("core.21")}</small></div></div>
  <div class="row between"><div class="eyebrow">${$t("core.22", {
    slot: F.slot
  })}</div><button class="btn ghost sm" id="bkS">${$t("core.23")}</button></div>
  <div class="card">
    <div class="grid2"><label class="small"><b>${$t("core.24")}</b><input type="text" id="fn" maxlength="14" placeholder="Ali" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" value="${esc(F.first)}" aria-describedby="nerr"></label><label class="small"><b>${$t("core.25")}</b><input type="text" id="ln" maxlength="16" placeholder="Yılmaz" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" value="${esc(F.last)}" aria-describedby="nerr"></label></div>
    <p class="small field-err" id="nerr" role="alert" hidden>${$t("core.34")}</p>
    <div class="grid2"><button class="btn ghost sm" id="npick">${$t("core.26")}</button><button class="btn ghost sm" id="nrnd">${$t("core.27")}</button></div>
    <div class="row nowrap" style="align-items:flex-start">
      <canvas id="pv" style="width:132px;height:160px;border-radius:var(--r-xl);flex-shrink:0"></canvas>
      <div style="display:flex;flex-direction:column;gap:var(--sp-2h);min-width:0">
        <div><div class="eyebrow mb-1h">${$t("core.28")}</div><div class="opts" id="skin">${swHTML(SKINS, F.look.skin, "s32.sw.skin")}</div></div>
        <div><div class="eyebrow mb-1h">${$t("core.29")}</div><div class="opts" id="hs">${[
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
          .map(([v, t]) => `<button class="opt ${F.look.hatStyle === v ? "on" : ""}" data-v="${v}" aria-pressed="${F.look.hatStyle === v}">${t}</button>`)
          .join("")}</div></div>
      </div>
    </div>
    <div><div class="eyebrow mb-1h">${hairMode ? $t("core.16") : $t("core.17")}</div><div class="opts" id="hc">${swHTML(hairMode ? HAIRC : [...HATC, ...late.extraHatColors()], hairMode ? F.look.hair : F.look.hat, hairMode ? "s32.sw.hair" : "s32.sw.color")}</div></div>
    ${F.look.hatStyle === "band" ? `<div><div class="eyebrow mb-1h">${$t("core.16")}</div><div class="opts" id="hc2">${swHTML(HAIRC, F.look.hair, "s32.sw.hair")}</div></div>` : ""}
    <div><div class="eyebrow mb-1h">${$t("core.30")}</div><div class="opts" id="pos">${Object.entries(POS)
      .map(([k, p]) => `<button class="opt ${F.pos === k ? "on" : ""}" data-v="${k}" aria-pressed="${F.pos === k}"><span class="cc">${k}</span>${p.n}</button>`)
      .join("")}</div>
      <p class="small muted mt-1h">${$t("core.31")} ${{ PG: $t("core.80"), SG: $t("core.81"), SF: $t("core.82"), PF: $t("core.83"), C: $t("core.84") }[F.pos]}</p></div>
    <div><div class="eyebrow mb-1h">${$t("core.32")}</div><div class="opts" id="num">${[0, 1, 3, 7, 8, 10, 11, 13, 23, 24, 30, 33, 77, ...late.extraNumbers()].map(n => `<button class="opt ${F.num === n ? "on" : ""}" data-v="${n}" aria-pressed="${F.num === n}">${n}</button>`).join("")}</div></div>
  </div>
  <details class="card adv" id="adv"${F.adv ? " open" : ""}><summary><span class="minw-0"><b>${$t("s32.adv")}</b><span class="small muted">${$t("s32.advD")}</span></span></summary><div class="stack">
    ${late.modePickerHTML(F.mode || "normal")}
    ${late.diffPickerHTML(F)}
    ${F.heir ? "" : late.originPickerHTML(F.origin || "istanbul")}
    ${F.heir ? "" : late.scenarioPickerHTML(F.scenario || "")}
  </div></details>
  <div class="cta-bar"><button class="btn pri big" id="go">${$t("core.33")}</button></div>`;
  // adlar ekrana basılır: işaretleme karakterleri alınmaz
  const keep = () => {
    F.first = $("#fn")
      .value.replace(/[<>"&]/g, "")
      .trim();
    F.last = $("#ln")
      .value.replace(/[<>"&]/g, "")
      .trim();
  };
  // Yerinde güncelleme: yalnız seçili düğme ve önizleme değişir (sayfa baştan yazılmaz, kaydırma/odak korunur)
  const mark = (box, v) =>
    box.querySelectorAll("button").forEach(x => {
      const on = x.dataset.v === v;
      x.classList.toggle("on", on);
      x.setAttribute("aria-pressed", String(on));
    });
  const bind = (id, fn, inPlace) => {
    const el = $("#" + id);
    if (el)
      el.querySelectorAll("button").forEach(
        b =>
          (b.onclick = () => {
            if (b.classList.contains("locked")) return toast(late.originLockText ? late.originLockText(b.dataset.v) : $t("s32.locked"));
            keep();
            fn(b.dataset.v);
            if (inPlace) {
              mark(el, b.dataset.v);
              drawPv();
            } else renderCreate();
          })
      );
  };
  $("#bkS").onclick = late.renderSlots;
  $("#adv").ontoggle = () => (F.adv = $("#adv").open);
  bind("mode", v => (F.mode = v));
  bind("dfx", v => late.diffSet(F, v)); // özel zorluk (src/bonds.js)
  bind("origin", v => (F.origin = v));
  bind("scn", v => (F.scenario = v || null)); // kariyer senaryosu (src/scenarios.js)
  const clearErr = () => {
    $("#nerr").hidden = true;
    $("#fn").removeAttribute("aria-invalid");
    $("#ln").removeAttribute("aria-invalid");
  };
  $("#fn").oninput = $("#ln").oninput = clearErr;
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
  const drawPv = () => {
    const g = c.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, "#2a3a58");
    g.addColorStop(1, "#141d2e");
    c.fillStyle = g;
    c.fillRect(0, 0, 132, 160);
    drawKid(c, 66, 156, 1.0, F.look, { jersey: "#c8102e", trim: "#ffffff", number: F.num, mood: "mutlu" });
  };
  drawPv();
  bind("skin", v => (F.look.skin = v), true);
  bind("hs", v => (F.look.hatStyle = v));
  bind(
    "hc",
    v => {
      if (HAIR_STY.includes(F.look.hatStyle)) F.look.hair = v;
      else F.look.hat = v;
    },
    true
  );
  bind("hc2", v => (F.look.hair = v), true);
  bind("pos", v => (F.pos = v));
  bind("num", v => (F.num = +v), true);
  $("#go").onclick = () => {
    keep();
    if (!F.first || !F.last) {
      toast($t("core.34"));
      const bad = !F.first ? $("#fn") : $("#ln");
      $("#nerr").hidden = false;
      if (!F.first) $("#fn").setAttribute("aria-invalid", "true");
      if (!F.last) $("#ln").setAttribute("aria-invalid", "true");
      bad.scrollIntoView({ block: "center" });
      if (late.tapGuard) late.tapGuard.delete($("#go")); // reddedilen basış çift dokunuş korumasına sayılmaz: düzeltip hemen basılabilir
      bad.focus({ preventScroll: true });
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
  "Cenk",
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
      `<div class="card ta-c"><div class="eyebrow">${$t("core.37")}</div><h2 id="npv">${esc((F.first || "—") + " " + (F.last || "—"))}</h2></div>
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
  late.diffApply(F);
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
  // senaryo: hazır başlangıç, lise bölümü atlanır (src/scenarios.js)
  if (F.scenario && !S.heir) {
    late.scenarioSetup(F.scenario);
    F.scenario = null;
    late.save();
    setTeamVars();
    renderMain();
    if (!S.tut) late.startTour();
    return;
  }
  late.save();
  setTeamVars();
  chapter("lise1", () => {
    renderMain();
    if (!S.tut) late.startTour();
  });
}
export function migrate() {
  late.normalizeState(S);
  if (repairLeague() && !window.__SIM) setTimeout(() => toast($t("s32.rec.fixed")), 700);
  late.migrateStory();
  setTeamVars();
}
/** Kayıt tutarlılığı: kendi takım, lig tablosu, fikstür ve play-off rakibi takımlar tablosunda olmalı.
    Eksik/bozuk kayıtta (yarım yazım, elle düzenlenmiş kod) lig ya da fikstür yeniden kurulur; kendi sıralama
    satırı ve hafta korunur. Onarım yapıldıysa true. */
export function repairLeague() {
  if (!S || !S.team || !S.team.key) return false;
  let fixed = false;
  const T = (S.teams = S.teams && typeof S.teams === "object" ? S.teams : {});
  const ok = k => typeof k === "string" && !!T[k] && typeof T[k] === "object";
  if (!ok(S.team.key)) {
    T[S.team.key] = S.team;
    fixed = true;
  }
  const lg0 = Array.isArray(S.league) ? S.league : [];
  let lg = lg0.filter((r, i) => r && ok(r.key) && lg0.findIndex(x => x && x.key === r.key) === i);
  if (lg.length !== lg0.length) fixed = true;
  let me = lg.find(r => r.key === S.team.key);
  if (!me) {
    lg.unshift((me = { key: S.team.key, w: 0, l: 0, pf: 0, pa: 0 }));
    fixed = true;
  }
  for (const r of lg)
    for (const f of ["w", "l", "pf", "pa"])
      if (typeof r[f] !== "number" || !isFinite(r[f])) {
        r[f] = 0;
        fixed = true;
      }
  if (lg.length < 2) {
    // rakipler kayıp: lig yeniden kurulur (kendi satırı korunur)
    lg = [me, ...leagueTeams().map(t => ({ key: t.key, w: 0, l: 0, pf: 0, pa: 0 }))];
    fixed = true;
  }
  S.league = lg;
  const opps = lg.filter(r => r.key !== S.team.key).map(r => r.key);
  const schedOk =
    Array.isArray(S.sched) && S.sched.length > 0 && S.sched.every(f => f && ok(f.opp) && f.opp !== S.team.key);
  if (!schedOk) {
    const first = opps.map((k, i) => ({ opp: k, home: i % 2 === 0 })),
      second = opps.map((k, i) => ({ opp: k, home: i % 2 !== 0 }));
    S.sched = late.isQuick && late.isQuick() ? first : [...first, ...second];
    fixed = true;
  }
  if (typeof S.week !== "number" || !isFinite(S.week) || S.week < 1) {
    S.week = 1;
    fixed = true;
  }
  if (!["regular", "semi", "final"].includes(S.phase)) {
    S.phase = "regular";
    fixed = true;
  }
  if (S.phase !== "regular") {
    const others = standings()
      .filter(r => r.key !== S.team.key)
      .map(r => r.key);
    if (!ok(S.playoffOpp) || S.playoffOpp === S.team.key) {
      S.playoffOpp = others[0];
      fixed = true;
    }
    const os = S._otherSemi;
    if (
      S.phase === "semi" &&
      !(Array.isArray(os) && os.length === 2 && os.every(k => ok(k) && k !== S.playoffOpp && k !== S.team.key))
    ) {
      S._otherSemi = others.filter(k => k !== S.playoffOpp).slice(0, 2);
      fixed = true;
    }
  }
  return fixed;
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
  // arka planda ana ekran olsun (oluşturma ekranı ya da boş sayfa görünmesin)
  if (!$(".hud") && !$("#mview"))
    try {
      renderMain();
    } catch (e) {
      /* durum henüz hazır değil: panel yine açılır */
    }
  // başlık ve sezon panel başlığında: kartta tekrar edilmez
  sheet(
    T[0],
    seasonLabel(),
    `<div class="chapter"><div class="hd"><h2 style="font-size:var(--fs-num)">${T[1]}</h2></div><div class="bd"><p>${T[2]}</p><button class="btn pri" id="chok">${$t("core.64")}</button></div></div>`,
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
   <div class="hud-id"><button class="avatar" id="hav" aria-label="${esc($t("s32.portrait"))}"></button><div class="minw-0"><div class="nm">${esc(fullName())}</div><div class="tm">${$t(
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
    <div class="hs"><div class="k">${$t("core.69")}</div><div class="v">${ovr()} <span class="muted" style="font-size:var(--fs-sm)">· ${form}</span></div></div>
    <div class="hs"><div class="k">${$t("core.70")}</div><div class="v">${S.phase === "regular" ? rank + "." : "PO"} <span class="muted" style="font-size:var(--fs-sm)">· ${kfmt(S.followers)}</span></div></div>
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
  // düzen: dikeyde tek sütun + altta yapışkan eylem çubuğu; yatay telefon ve geniş ekranda harita solda, hafta kartı
  // ve eylem çubuğu sağda yapışkan (index.html .mainlay)
  app.innerHTML = `${hudHTML()}
  <div class="mainlay"><div class="mapcol">${late.districtTabsHTML ? late.districtTabsHTML() : ""}<div class="mapwrap"><div class="mapin"><div class="maphead"><div class="tagx">${esc(S.city)}<small>${$t(
    "core.75",
    {
      v: seasonLabel(),
      week: S.week,
      v2: tods[S.slot]
    }
  )}</small></div><div class="tagx ta-r">${esc(lgName())}<small>${levelName(S.stage)} · ${phaseName()}</small></div></div>${mapSVG(mapState())}</div></div></div>
  <div class="wkcol"><div class="wkstick">${
    S.brk
      ? late.breakCardHTML()
      : `<div class="card weekcard"><div class="row between"><div class="eyebrow">${t("main.week", { n: S.slot })}</div>${S.injury ? `<span class="pill l">${t("main.injured", { n: S.injury.w })}</span>` : `<span class="pill g">${isPro(S.stage) ? ROLE_N[S.role] : t("main.schoolTeam")}</span>`}</div>
   <div class="timebar">${[2, 1, 0].map(i => `<i class="${S.slot > i ? "on" : ""}"></i>`).join("")}</div>
   <div class="next">${crestSVG(S.team, 40)}<div style="text-align:center;min-width:0"><div class="eyebrow">${phaseName()} · ${fx.home ? t("main.home") : t("main.away")}</div><div style="font-weight:800;font-size:var(--fs-lg);line-height:1.2">${esc(S.team.short)} <span class="vs">${$t("core.76")}</span> ${esc(opp.name)}</div></div>${crestSVG(opp, 40)}</div>
   ${late.isDerby(opp) ? `<div class="small" style="color:var(--bad);text-align:center;font-weight:700">${t("main.derby", { name: esc(late.derbyWho(opp)) })}</div>` : ""}${late.serMainHTML()}
   ${late.planRowHTML()}${late.dayRowHTML(late.missionsButtonHTML())}</div><div class="actbar" id="actbar" role="group" aria-label="${esc(t("main.week", { n: S.slot }))}"><div class="grid2"><button class="btn ghost" id="quickw">${t("main.quickWeek")}</button><button class="btn pri" id="gostad">${t("main.prepare")}</button></div></div>`
  }</div>${late.weekSummaryHTML()}${late.onboardHTML()}
  <div class="card"><div class="row between"><div class="eyebrow">${t("main.news")}</div>${late.leagueButtonHTML()}</div><div class="news">${S.news.map(n => `<div><time>${esc(n.w)}</time><span>${esc(n.t)}</span></div>`).join("") || `<div class="small muted">${t("main.noNews")}</div>`}</div></div>
  <div class="row between small muted"><span>${t("main.summary", { g: S.career.games, p: S.career.pts, t: S.career.trophies.length })}</span><div class="row gap-1h">${late.TEL.consent ? `<button class="btn ghost sm" id="fbk">${t("fb.short")}</button>` : ""}${late.guideButtonHTML()}<button class="btn ghost sm" id="opt">${t("main.settings")}</button><button class="btn ghost sm" id="rst">${t("main.saves")}</button></div></div></div></div>`;
  fitMapLabels();
  $("#hav").appendChild(portrait(S.look, { ...jersey(), mood: S.moral > 45 ? "mutlu" : "uzgun" }, 42, 42, S.team.c1));
  // portreye dokununca görünüm/stil (Ev → Stil)
  const hav = $("#hav");
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
  const gs = $("#gostad");
  if (gs) gs.onclick = () => late.openLoc("stad", "mac");
  late.bindDistrict && late.bindDistrict(renderMain);
  const qw = $("#quickw");
  if (qw) qw.onclick = late.quickWeek;
  late.bindPlanRow(); // hafta planı (src/plan.js)
  late.bindBreak(); // milli takım arası (src/plan.js)
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
  if (data && data.S) openSafe(data.S);
  else late.renderSlots();
}
/** Kariyeri aç (yuva, kayıt kodu, dil değişikliği sonrası devam). Açılış hata verirse: hata raporlanır, aynı yuvanın
    yedeği denenir; o da açılmazsa yuva ekranı + açıklayıcı panel (boş ekran yok). Açıldıysa true. */
export function openSafe(st, o = {}) {
  const slot = st && st.saveSlot;
  // açılış sırasında ilk kayıt yedeği ezebilir: yedek, denemeden ÖNCE okunur
  let bak = null;
  if (!o.noBak && slot && late.readKey)
    try {
      bak = late.readKey(late.slotKey(slot) + "-bak");
    } catch (e) {
      bak = null;
    }
  const tryOpen = x => {
    try {
      S = x;
      migrate();
      if (S.retired) late.retireScreen();
      else renderMain();
      return true;
    } catch (e) {
      console.error(e);
      try {
        late.reportError && late.reportError("open", (e && e.message) || String(e), e && e.stack);
      } catch (_) {
        /* raporlama yok */
      }
      return false;
    }
  };
  if (tryOpen(st)) return true;
  if (bak) {
    bak.saveSlot = slot;
    if (tryOpen(bak)) {
      late.save();
      toast($t("s32.rec.bak"));
      return true;
    }
  }
  S = null;
  try {
    closeSheet();
  } catch (e) {
    /* yok */
  }
  late.renderSlots();
  sheet(
    $t("s32.rec.title"),
    $t("s32.rec.sub"),
    `<div class="say bad">${$t("s32.rec.body")}</div><button class="btn pri" id="rec-ok">${$t("s32.rec.ok")}</button>`,
    { noClose: true }
  );
  $("#rec-ok").onclick = () => late.renderSlots();
  return false;
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
