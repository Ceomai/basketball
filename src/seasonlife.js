/* ================= SEZON VE MEKÂN DERİNLİĞİ =================
   - Taraftar bölgesi: tezahürat yaz (kelime seçimi), koreografi (sonraki iç saha maçında seyirci heyecanı hazır),
     deplasmana taraftar otobüsü (sonraki gürültülü deplasmanın cezası kalkar).
   - Medya: podcast konuğu (3 soru), belgesel çekimi (sezonda bir; albüm ve miras).
   - Sokak sahası: kendi mahalle turnuvanı düzenle (sezonda bir), sahayı yenilet (bir kez; miras).
   - Sakatlıkta rehabilitasyon seansı (zamanlama; başarılıysa dönüş 1 hafta kısalır).
   - Sezon sonu ödül gecesi: kıyafet, kırmızı halı pozu, konuşma (yeni sezonun ilk haftası).
   - Rakiple karşılaşma geçmişi (ezeli rakibinin takımına karşı).
   - Yaz kampı: 3 gün, her gün bir etkinlik (mini oyunlu ya da hızlı), son gün kamp turnuvası; tek dokunuşla geçilebilir. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, esc, fmt, isPro, pick, ri, shuffle } from "./data.js";
import { S, app, closeSheet, eff, fullName, gainStat, levelMul, news, norm, renderMain, resultView, sheet, tx, useSlot } from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgDribble, mgShoot, mgTiming } from "./games.js";
import { M } from "./match.js";
import { late } from "./late.js";

const wk = () => `${S.season}-${S.week}`;
const pm = () => (late.ecoPm ? late.ecoPm() : 1);
const media = (p, f) => (late.mediaGain ? late.mediaGain(p, f) : 0);
function ask(title, sub, body, opts, noClose = true) {
  return new Promise(res => {
    sheet(
      title,
      sub,
      `${body ? `<p>${body}</p>` : ""}<div class="choices">${opts
        .map(([k, t, d]) => `<button class="choice" data-sl="${k}"><span class="ct">${t}</span>${d ? `<span class="cd">${d}</span>` : ""}</button>`)
        .join("")}</div>`,
      { noClose }
    );
    $$("[data-sl]").forEach(b => (b.onclick = () => res(b.dataset.sl)));
  });
}
const result = (title, txt, fx) => {
  norm();
  save();
  if (!document.getElementById("shb")) sheet(title, "", "");
  resultView(title, txt, fx);
};
async function stage(title, run) {
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div class="pt-3"><div class="eyebrow">${title}</div></div><div id="stg"></div>`;
  const r = await run($("#stg"));
  $("#stg").innerHTML = "";
  return r;
}

/* ================= TARAFTAR BÖLGESİ ================= */
const CHANT = [
  ["c1", "c2", "c3"],
  ["m1", "m2", "m3"],
  ["e1", "e2", "e3"]
];
export function fanExtraHTML() {
  const dis = S.slot <= 0;
  return `<div class="act"><div><h3>${$t("sl.chant")}</h3><p>${$t("sl.chantD")}</p></div><button class="btn team sm" id="sl-chant" ${dis || S.chantWk === wk() ? "disabled" : ""}>${S.chantWk === wk() ? $t("fz.done") : $t("fz.go")}</button></div>
   <div class="act"><div><h3>${$t("sl.choreo")}</h3><p>${$t("sl.choreoD", { v: fmt(Math.round(10 * pm())) })}</p></div><button class="btn team sm" id="sl-choreo" ${S.money < Math.round(10 * pm()) || S.buffs.choreo ? "disabled" : ""}>${S.buffs.choreo ? $t("sl.ready") : $t("fz.go")}</button></div>
   <div class="act"><div><h3>${$t("sl.bus")}</h3><p>${$t("sl.busD", { v: fmt(Math.round(8 * pm())) })}</p></div><button class="btn team sm" id="sl-bus" ${S.money < Math.round(8 * pm()) || S.buffs.fanBus ? "disabled" : ""}>${S.buffs.fanBus ? $t("sl.ready") : $t("fz.go")}</button></div>`;
}
export function bindFanExtra(re) {
  const c = $("#sl-chant");
  if (c)
    c.onclick = async () => {
      S.chantWk = wk();
      useSlot();
      const pickd = [];
      for (let i = 0; i < 3; i++) {
        const k = await ask($t("sl.chant"), $t("sl.line", { n: i + 1 }), pickd.map(x => $t(`sl.ch.${x}`)).join(" / "), CHANT[i].map(id => [id, $t(`sl.ch.${id}`), ""]));
        pickd.push(k);
      }
      // aynı numaralı satırlar uyaklı: ne kadar uyumluysa o kadar tutar
      const tag = pickd.map(x => x[1]),
        score = tag.filter(x => x === tag[0]).length;
      S.rel.taraf += 2 + score;
      media(0.005 * score, 3);
      result($t("sl.chant"), `<i>"${pickd.map(x => $t(`sl.ch.${x}`)).join(" / ")}"</i><br>${$t(`sl.chantR${score}`)}`, [[$t("tl.fx.fans", { v: 2 + score }), "p"]]);
    };
  const ch = $("#sl-choreo");
  if (ch)
    ch.onclick = () => {
      tx($t("sl.choreo"), -Math.round(10 * pm()));
      S.buffs.choreo = 1;
      S.rel.taraf += 3;
      save();
      re();
    };
  const b = $("#sl-bus");
  if (b)
    b.onclick = () => {
      tx($t("sl.bus"), -Math.round(8 * pm()));
      S.buffs.fanBus = 1;
      S.rel.taraf += 3;
      save();
      re();
    };
}
/** maç başında (src/matchday.js): koreografi seyirciyi hazır başlatır, taraftar otobüsü deplasman gürültüsünü bastırır */
export function fanMatchStart() {
  if (!M || M.auto) return;
  if (M.home && S.buffs.choreo) {
    S.buffs.choreo = 0;
    M.hype = 60;
    late.addFeed && late.addFeed(`<b class="gold">${$t("sl.choreoOn")}</b>`);
  }
  if (!M.home && S.buffs.fanBus) {
    S.buffs.fanBus = 0;
    M.loud = false;
    late.addFeed && late.addFeed(`<b class="gold">${$t("sl.busOn")}</b>`);
  }
}

/* ================= MEDYA: PODCAST VE BELGESEL ================= */
const PODQ = ["childhood", "idol", "worst", "pregame", "future"];
export function mediaExtraHTML() {
  const docDone = S.docSeason === S.season;
  return `<div class="act"><div><h3>${$t("sl.pod")}</h3><p>${$t("sl.podD")}</p></div><button class="btn team sm" id="sl-pod" ${S.slot <= 0 || S.podWk === wk() ? "disabled" : ""}>${S.podWk === wk() ? $t("fz.done") : $t("fz.go")}</button></div>
   ${isPro(S.stage) ? `<div class="act"><div><h3>${$t("sl.doc")}</h3><p>${$t("sl.docD")}</p></div><button class="btn team sm" id="sl-doc" ${S.slot <= 0 || docDone ? "disabled" : ""}>${docDone ? $t("fz.done") : $t("fz.go")}</button></div>` : ""}`;
}
export function bindMediaExtra() {
  const p = $("#sl-pod");
  if (p)
    p.onclick = async () => {
      S.podWk = wk();
      useSlot();
      let good = 0;
      for (const q of shuffle(PODQ.slice()).slice(0, 3)) {
        const k = await ask($t("sl.pod"), $t("sl.podHost"), `"${$t(`sl.pq.${q}`)}"`, [
          ["honest", $t("sl.pa.honest"), ""],
          ["funny", $t("sl.pa.funny"), ""],
          ["short", $t("sl.pa.short"), ""]
        ]);
        if (k !== "short") good++;
      }
      const add = media(0.01 * good, 6);
      S.rel.taraf += good;
      result($t("sl.pod"), $t(`sl.podR${good >= 2 ? "Good" : "Meh"}`), [[$t("tl.fx.fol", { v: late.kfmt ? late.kfmt(add) : add }), "p"]]);
    };
  const d = $("#sl-doc");
  if (d)
    d.onclick = () => {
      S.docSeason = S.season;
      useSlot();
      S.energy -= 6;
      const add = media(0.03, 20);
      S.legacy = S.legacy || { found: {}, club: 0 };
      S.legacy.doc = (S.legacy.doc || 0) + 1;
      news($t("sl.docNews", { v: fullName(), y: S.year }));
      result($t("sl.doc"), $t("sl.docR"), [[$t("tl.fx.fol", { v: late.kfmt ? late.kfmt(add) : add }), "p"], [$t("sl.fxLegacy"), "p"]]);
    };
}

/* ================= SOKAK SAHASI: KENDİ TURNUVAN, SAHA YENİLEME ================= */
export function streetExtraHTML() {
  const cost = Math.round(25 * pm()),
    reno = Math.round(150 * pm());
  return `<div class="act"><div><h3>${$t("sl.host")}</h3><p>${$t("sl.hostD", { v: fmt(cost) })}</p></div><button class="btn team sm" id="sl-host" ${S.slot <= 0 || S.money < cost || S.hostSeason === S.season ? "disabled" : ""}>${S.hostSeason === S.season ? $t("fz.done") : $t("fz.go")}</button></div>
   ${S.courtReno ? `<p class="small good">${$t("sl.renoDone")}</p>` : `<div class="act"><div><h3>${$t("sl.reno")}</h3><p>${$t("sl.renoD", { v: fmt(reno) })}</p></div><button class="btn team sm" id="sl-reno" ${S.money < reno ? "disabled" : ""}>${$t("sl.renoBtn")}</button></div>`}`;
}
export function bindStreetExtra(re) {
  const h = $("#sl-host");
  if (h)
    h.onclick = () => {
      const cost = Math.round(25 * pm());
      S.hostSeason = S.season;
      useSlot();
      tx($t("sl.host"), -cost);
      S.rel.taraf += 6;
      S.moral += 5;
      media(0.02, 10);
      S.legacy = S.legacy || { found: {}, club: 0 };
      S.legacy.kids = (S.legacy.kids || 0) + 1;
      if (S.street) S.street.rep = (S.street.rep || 0) + 8;
      news($t("sl.hostNews", { v: fullName() }));
      result($t("sl.host"), $t("sl.hostR", { n: ri(16, 32) }), [[$t("tl.fx.fans", { v: 6 }), "p"], [$t("sl.fxLegacy"), "p"]]);
    };
  const r = $("#sl-reno");
  if (r)
    r.onclick = () => {
      tx($t("sl.reno"), -Math.round(150 * pm()));
      S.courtReno = S.season;
      S.legacy = S.legacy || { found: {}, club: 0 };
      S.legacy.kids = (S.legacy.kids || 0) + 3;
      S.rel.taraf += 8;
      news($t("sl.renoNews", { v: fullName() }));
      save();
      re();
    };
}

/* ================= REHABİLİTASYON ================= */
function rehabSheet() {
  if (!S || window.__SIM || !S.injury || S.injury.w < 2 || S.rehabWk === wk()) return false;
  S.rehabWk = wk();
  ask($t("sl.rh"), $t("sl.rhSub", { w: S.injury.w }), $t("sl.rhB", { n: esc(S.injury.n || "") }), [
    ["rest", $t("sl.rhRest"), $t("sl.rhRestD")],
    ["go", $t("sl.rhGo"), $t("sl.rhGoD")]
  ]).then(async k => {
    if (k === "rest") return result($t("sl.rh"), $t("sl.rhRestR"), []);
    const r = await stage($t("sl.rh"), el => mgTiming(el, { eff: 55, title: $t("sl.rhT"), tries: 3, label: $t("sl.rhL"), kind: "free" }));
    const ok = r.ok >= 2;
    if (ok && S.injury) S.injury.w = Math.max(1, S.injury.w - 1);
    S.moral += ok ? 4 : 1;
    norm();
    save();
    sheet($t("sl.rh"), "", "");
    resultView($t("sl.rh"), ok ? $t("sl.rhOk") : $t("sl.rhNo"), ok ? [[$t("sl.fxRehab"), "p"]] : []);
  });
  return true;
}
Bus.offer("week:sheet", rehabSheet, 9);

/* ================= SEZON SONU ÖDÜL GECESİ ================= */
Bus.on("season:end", () => {
  if (!S) return;
  const awards = (S.career.trophies || []).filter(t => t.type === "award" || t.type === "mvp").length;
  S.galaDue = awards > (S.galaAwards || 0) || S.followers >= 20000 ? 1 : 0;
  S.galaAwards = awards;
});
function galaSheet() {
  if (!S || window.__SIM || !S.galaDue || S.week > 2) return false;
  S.galaDue = 0;
  (async () => {
    const outfit = await ask($t("sl.gala"), $t("sl.galaSub"), $t("sl.galaB"), [
      ["classic", $t("sl.o.classic"), $t("sl.o.classicD")],
      ["bold", $t("sl.o.bold"), $t("sl.o.boldD")],
      ["street", $t("sl.o.street"), $t("sl.o.streetD")]
    ]);
    const pose = await ask($t("sl.gala"), $t("sl.carpet"), $t(`sl.o.${outfit}R`), [
      ["smile", $t("sl.p.smile"), ""],
      ["flex", $t("sl.p.flex"), ""],
      ["celeb", $t("sl.p.celeb"), ""]
    ]);
    const sp = await ask($t("sl.gala"), $t("sl.speech"), $t(`sl.p.${pose}R`), [
      ["thanks", $t("sl.s.thanks"), $t("sl.s.thanksD")],
      ["funny", $t("sl.s.funny"), $t("sl.s.funnyD")],
      ["bold", $t("sl.s.bold"), $t("sl.s.boldD")]
    ]);
    const fx = [];
    if (sp === "thanks") ((S.rel.takim += 4), (S.rel.aile += 4), (S.rel.koc += 2), fx.push([$t("tl.fx.team", { v: 4 }), "p"]));
    if (sp === "funny") (media(0.03, 10), (S.rel.taraf += 4), fx.push([$t("tl.fx.fans", { v: 4 }), "p"]));
    if (sp === "bold") (media(0.04, 12), (S.rel.koc -= 2), (S.buffs.motive = 1), fx.push([$t("sl.fxMotive"), "p"]));
    if (outfit === "bold") media(0.02, 6);
    news($t(`sl.galaNews.${sp}`, { v: fullName() }));
    result($t("sl.gala"), $t(`sl.s.${sp}R`), fx);
  })();
  return true;
}
Bus.offer("week:sheet", galaSheet, 2, "now");

/* ================= RAKİPLE KARŞILAŞMA GEÇMİŞİ ================= */
Bus.on("match:end", e => {
  if (!S || !M || !S.rival || !S.rival.team || !M.opp || M.opp.key !== S.rival.team.key) return;
  const h = (S.h2h = S.h2h || { g: 0, w: 0, me: 0, rv: 0, last: [] });
  const rv = Math.max(0, Math.round((S.rival.ppg || 12) + ri(-6, 6)));
  h.g++;
  if (e && e.win) h.w++;
  h.me += M.pts;
  h.rv += rv;
  h.last = [{ s: S.season, w: !!(e && e.win), me: M.pts, rv }, ...h.last].slice(0, 5);
});
export function h2hHTML() {
  const h = S && S.h2h;
  if (!h || !h.g || !S.rival) return "";
  return `<div class="card fm"><div class="eyebrow">${$t("sl.h2h", { v: esc(late.rivalName ? late.rivalName() : "") })}</div><div class="kv"><span>${$t("sl.h2hRec")}</span><b>${h.w}-${h.g - h.w}</b><span>${$t("sl.h2hPts")}</span><b>${(h.me / h.g).toFixed(1)} · ${(h.rv / h.g).toFixed(1)}</b></div>
   <div class="row gap-1">${h.last.map(x => `<span class="pill ${x.w ? "w" : "l"}">${x.me}-${x.rv}</span>`).join("")}</div></div>`;
}

/* ================= YAZ KAMPI ================= */
const CAMP = ["beach", "trail", "gym", "fire", "legend", "prank", "sneak"];
const ROOMIES = ["snore", "early", "snack"];
// kamp grup fotoğrafı: takım renklerinde sıra sıra oyuncular, önde sen
function campPhoto(loc) {
  const c1 = S.team.c1,
    c2 = S.team.c2,
    sk = (S.look && S.look.skin) || "#d9a477";
  const guy = (x, y, me, i) =>
    `<g transform="translate(${x},${y})"><circle r="7" cy="-20" fill="${me ? sk : ["#f1c9a5", "#a8714b", "#d9a477", "#6e452c"][i % 4]}" stroke="#141414" stroke-width="1.2"/><rect x="-8" y="-13" width="16" height="18" rx="3" fill="${me ? "#ffc54d" : c1}" stroke="#141414" stroke-width="1.2"/><text y="0" text-anchor="middle" font-size="7" font-weight="900" font-family="Barlow Condensed" fill="${me ? "#141414" : c2}">${me ? S.num : (i * 7 + 3) % 99}</text>${me ? "" : `<path d="M-8 -6 L-13 ${i % 2 ? -18 : 0}" stroke="${["#f1c9a5", "#a8714b", "#d9a477"][i % 3]}" stroke-width="3" stroke-linecap="round"/>`}</g>`;
  const back = Array.from({ length: 6 }, (_, i) => guy(40 + i * 44, 64, false, i)).join(""),
    front = Array.from({ length: 5 }, (_, i) => (i === 2 ? guy(150, 96, true, 0) : guy(62 + i * 44, 96, false, i + 6))).join("");
  return `<svg viewBox="0 0 300 130" width="100%" xmlns="http://www.w3.org/2000/svg" style="border-radius:var(--r-lg)"><rect width="300" height="130" fill="#7ec8e3"/><path d="M0 70 L60 30 L110 60 L170 20 L240 62 L300 35 L300 130 L0 130 Z" fill="#5b8c5a"/><rect y="104" width="300" height="26" fill="#c98f53"/><rect x="70" y="6" width="160" height="18" rx="4" fill="${c1}" stroke="#141414"/><text x="150" y="19" text-anchor="middle" font-size="11" font-weight="900" font-family="Barlow Condensed" fill="${c2}">${esc(String(loc).toUpperCase())} ${S.year}</text>${back}${front}</svg>`;
}
async function campDay(day, journal) {
  const opts = shuffle(CAMP.slice()).slice(0, 3);
  // sabah: koçun notu ve oda arkadaşının gecesi
  const room = S.campRoom ? $t(`cp.rm.${S.campRoom.k}.n${day}`, { m: esc(S.campRoom.m) }) : "";
  if (S.campRoom && S.campRoom.k === "snore") S.energy -= 2;
  if (S.campRoom && S.campRoom.k === "early") S.rel.koc += 1;
  if (S.campRoom && S.campRoom.k === "snack") S.moral += 1;
  if (room) journal.push(room);
  const k = await ask($t("cp.t"), $t("cp.day", { n: day }), `<i>${$t(`cp.coach${ri(1, 5)}`, { c: esc(S.npc.coach) })}</i><br>${room}<br>${$t(`cp.dayB${day}`)}`, [
    ...opts.map(o => [o, $t(`cp.a.${o}`), $t(`cp.a.${o}D`)]),
    ["auto", $t("cp.auto"), $t("cp.autoD")]
  ]);
  if (k === "auto") {
    gainStat(pick(["sut", "pas", "hiz", "guc", "sav"]), 0.2);
    journal.push($t("cp.j.auto", { n: day }));
    return "auto";
  }
  if (k === "beach") {
    const r = await stage($t("cp.a.beach"), el => mgShoot(el, { eff: eff("sut") + 6, shots: 3, title: $t("cp.a.beach"), dist: "mid" }));
    gainStat("sut", (0.15 + r.made * 0.12) * levelMul("sut"));
    S.rel.takim += 1;
    journal.push($t("cp.j.beach", { m: r.made }));
  } else if (k === "trail") {
    const r = await stage($t("cp.a.trail"), el => mgDribble(el, { eff: eff("hiz") + 6, reps: 2, title: $t("cp.a.trail") }));
    gainStat("hiz", (0.15 + r.ok * 0.15) * levelMul("hiz"));
    journal.push($t("cp.j.trail", { m: r.ok }));
  } else if (k === "gym") {
    const r = await stage($t("cp.a.gym"), el => mgTiming(el, { eff: eff("guc") + 6, title: $t("cp.a.gym"), tries: 2, label: $t("cp.lift"), kind: "dunk" }));
    gainStat("guc", (0.15 + r.ok * 0.18) * levelMul("guc"));
    journal.push($t("cp.j.gym", { m: r.ok }));
  } else if (k === "fire") {
    S.rel.takim += 4;
    S.moral += 4;
    if (late.chemAdd) late.chemAdd(4);
    journal.push($t(`cp.j.fire${ri(1, 3)}`, { m: esc(pick(late.mateNames ? late.mateNames(4) : ["B. Pivot"]) || "B. Pivot") }));
  } else if (k === "legend") {
    const st = await ask($t("cp.a.legend"), $t("cp.legendSub"), $t("cp.legendB"), ["sut", "pas", "hiz", "guc", "sav"].map(s => [s, late.statName ? late.statName(s) : s, ""]));
    gainStat(st, 0.45 * levelMul(st));
    journal.push($t("cp.j.legend", { s: late.statName ? late.statName(st) : st }));
  } else if (k === "prank") {
    const t = await ask($t("cp.a.prank"), $t("cp.prankSub"), $t("cp.prankB"), [
      ["rookie", $t("cp.pr.rookie"), ""],
      ["coach", $t("cp.pr.coach"), $t("cp.pr.coachD")]
    ]);
    if (t === "coach" && Math.random() < 0.5) {
      S.rel.koc -= 3;
      journal.push($t("cp.j.prankFail", { c: esc(S.npc.coach) }));
    } else {
      S.rel.takim += 3;
      S.moral += 3;
      journal.push(t === "coach" ? $t("cp.j.prankCoach", { c: esc(S.npc.coach) }) : $t("cp.j.prankRookie"));
    }
  } else if (k === "sneak") {
    const caught = Math.random() < 0.35;
    S.moral += 6;
    if (caught) S.rel.koc -= 3;
    else S.rel.takim += 2;
    journal.push($t(caught ? "cp.j.sneakCaught" : "cp.j.sneakOk", { c: esc(S.npc.coach) }));
  }
  norm();
  return k;
}
async function summerCamp() {
  S.campSeason = S.season;
  const loc = pick(["Bolu", "Antalya", "Erzurum", "Kartepe"]);
  const k = await ask($t("cp.t"), $t("cp.sub", { l: loc }), $t("cp.intro", { l: loc, c: esc(S.npc.coach) }), [
    ["skip", $t("cp.skip"), $t("cp.skipD")],
    ["go", $t("cp.go"), $t("cp.goD")]
  ]);
  if (k === "skip") {
    gainStat(pick(["sut", "pas", "hiz", "guc", "sav"]), 0.25);
    S.rel.takim += 2;
    return result($t("cp.t"), $t("cp.skipR", { l: loc }), [[$t("tl.fx.team", { v: 2 }), "p"]]);
  }
  const journal = [];
  // oda arkadaşı seç: üç gün boyunca komik anlar ve küçük etkiler
  const mates = shuffle((late.mateNames ? late.mateNames(5) : ["B. Pivot", "K. Kaptan", "Ç. Çaylak"]).slice()).slice(0, 3);
  const rk = await ask($t("cp.t"), $t("cp.room"), $t("cp.roomB"), ROOMIES.map((r, i) => [r, `${esc(mates[i] || "?")} · ${$t(`cp.rm.${r}`)}`, $t(`cp.rm.${r}D`)]));
  S.campRoom = { k: rk, m: mates[ROOMIES.indexOf(rk)] || "?" };
  for (let d = 1; d <= 3; d++) {
    const r = await campDay(d, journal);
    if (r === "auto" && d < 3) {
      // kalanını da hızlı geç
      const more = await ask($t("cp.t"), $t("cp.rest"), "", [
        ["auto", $t("cp.autoAll"), ""],
        ["go", $t("cp.continue"), ""]
      ]);
      if (more === "auto") {
        for (let x = d + 1; x <= 3; x++) (gainStat(pick(["sut", "pas", "hiz", "guc", "sav"]), 0.2), journal.push($t("cp.j.auto", { n: x })));
        break;
      }
    }
  }
  // son gün: kamp turnuvası
  const fin = await ask($t("cp.t"), $t("cp.final"), $t("cp.finalB"), [
    ["auto", $t("cp.finalAuto"), ""],
    ["play", $t("cp.finalPlay"), $t("cp.finalPlayD")]
  ]);
  let mvp;
  if (fin === "play") {
    const r = await stage($t("cp.final"), el => mgShoot(el, { eff: eff("sut") + 4, shots: 3, title: $t("cp.final"), dist: "three" }));
    mvp = r.made >= 2;
  } else mvp = Math.random() < clamp(eff("sut") / 140, 0.15, 0.6);
  if (mvp) {
    S.rel.koc += 4;
    S.moral += 5;
    news($t("cp.mvpNews", { v: fullName() }));
  }
  journal.push(mvp ? $t("cp.j.mvp") : $t("cp.j.noMvp"));
  save();
  S.campRoom = null;
  sheet($t("cp.t"), $t("cp.journal"), `<div class="card" style="padding:var(--sp-1h)">${campPhoto(loc)}</div><div class="card gap-1h">${journal.map((j, i) => `<div class="small"><b>${i + 1}.</b> ${j}</div>`).join("")}</div><button class="btn pri" id="cp-ok">${$t("casino.13")}</button>`);
  $("#cp-ok").onclick = renderMain;
}
function campSheet() {
  if (!S || window.__SIM || !isPro(S.stage) || S.season < 2 || S.campSeason === S.season || S.week > 2 || S.injury) return false;
  summerCamp();
  return true;
}
Bus.offer("week:sheet", campSheet, 3, "now");
