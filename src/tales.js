/* ================= HİKÂYE MİNİ OYUNLARI VE YAN HİKÂYELER =================
   Mini oyunlar hikâyenin içinden doğar, sonucu hikâyeye döner (esprili, küçük etkiler):
   1 Antrenmana yetiş (otobüsü kaçırdın)      2 Çaylak görevleri (kıdemlilerin siparişleri)
   3 İmza günü kuyruğu (tuhaf istekler)        4 Anneannenin üçüncü tabağı
   5 Devre arası maskot düellosu (maçta)      6 Deplasman otobüsünde kart oyunu
   7 Hakemle tartışma (maçta, sakin kal)      8 Reklam çekimi (replik; blooper viral olabilir)
   9 Sezon başı sağlık kontrolü (hep 1 cm kısa) 10 Troll'e cevap
   Yan hikâyeler (kariyer boyu geri döner): şanslı çorap, pivotun batıl inancı, koçun kahvesi, rakibin laf atması.
   Lakap: basın oyununa göre lakap takar (spiker ve manşetler kullanır). Geri dönüşler: eski hocan rakip kenarda.
   Haftalık mizah köşesi (manşet), spikerin duruma özel esprileri, transfer gecesinde ailenin tepkileri.
   Haftalık panel: en fazla 3 haftada bir hikâye olayı (src/extras.js → week:sheet). */
import { t as $t } from "./i18n/index.js";
import { $, Bus, choiceButtons, esc, fmt, isPro, pick, pickChoice, ri, shuffle, PRIO } from "./data.js";
import { S, app, closeSheet, eff, fullName, news, norm, renderMain, resultView, sheet, tx, weekNo } from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgDribble, mgShoot, mgTiming } from "./games.js";
import { M } from "./match.js";
import { late } from "./late.js";

const widx = () => weekNo(40);
const tl = () => (S.tales = S.tales || { last: -9, done: {}, sock: 0, pivot: 0, coffee: 0, trash: 0 });
const nm = () => S.last;
// seçim kartı (haftalık panel). İlk seçenek her zaman mini oyunsuz/güvenli olandır.
function choose(title, sub, body, opts) {
  sheet(title, sub, `<p>${body}</p><div class="choices">${choiceButtons(opts, "tl", false)}</div>`, { noClose: true });
  return pickChoice(document, "tl");
}
// mini oyunu tam ekranda oynat, sonra sonuç kartı
async function mini(title, run) {
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("tl.story")}</div><h2>${title}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await run($("#stg"));
  $("#stg").innerHTML = "";
  return r;
}
function outro(title, txt, fx) {
  norm();
  save();
  const res = $("#res");
  if (!res) return done(txt, fx);
  res.innerHTML = `<div class="card"><h2>${title}</h2><p>${txt}</p><div class="fx">${fx.map(([t, k]) => `<span class="${k}">${t}</span>`).join("")}</div><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}
// sonuç: açık panelin içine yazılır (resultView #shb'yi kullanır); panel yoksa önce açılır
const done = (txt, fx) => {
  norm();
  save();
  if (!document.getElementById("shb")) sheet($t("tl.story"), "", "");
  resultView($t("tl.story"), txt, fx);
};

/* ---------- 1 Antrenmana yetiş ---------- */
async function lateBus() {
  const k = await choose($t("tl.bus.t"), $t("tl.bus.s"), $t("tl.bus.b", { c: esc(S.npc.coach) }), [
    ["late", $t("tl.bus.late"), $t("tl.bus.lateD")],
    ["taxi", $t("tl.bus.taxi"), fmt(Math.max(2, Math.round(3 * pmul())))],
    ["run", $t("tl.bus.run"), $t("tl.bus.runD")]
  ]);
  if (k === "late") {
    S.rel.koc -= 2;
    S.energy -= 6;
    return done($t("tl.bus.lateR", { c: esc(S.npc.coach) }), [[$t("tl.fx.coach", { v: -2 }), "n"], [$t("tl.fx.en", { v: -6 }), "n"]]);
  }
  if (k === "taxi") {
    tx($t("tl.bus.taxi"), -Math.max(2, Math.round(3 * pmul())));
    return done($t("tl.bus.taxiR"), [[$t("tl.fx.ontime"), "p"]]);
  }
  const r = await mini($t("tl.bus.run"), el => mgDribble(el, { eff: eff("hiz") + 5, reps: 1, title: $t("tl.bus.runT") }));
  if (r.ok) {
    S.rel.koc += 2;
    S.rel.takim += 1;
    return outro($t("tl.bus.run"), $t("tl.bus.runOk", { c: esc(S.npc.coach) }), [[$t("tl.fx.coach", { v: 2 }), "p"]]);
  }
  S.energy -= 10;
  S.rel.koc -= 1;
  return outro($t("tl.bus.run"), $t("tl.bus.runNo", { c: esc(S.npc.coach) }), [[$t("tl.fx.en", { v: -10 }), "n"]]);
}
const pmul = () => (late.ecoPm ? late.ecoPm() : 1);

/* ---------- 2 Çaylak görevleri ---------- */
const ORDERS = ["simit", "espresso", "ayran", "tost", "lahmacun", "smoothie", "kumpir", "sushi"];
async function rookieErrand() {
  const vets = (late.mateNames ? late.mateNames(5) : ["A. Kaptan", "B. Pivot", "C. Şutör"]).slice(0, 3),
    ord = shuffle((late.cuOrders ? late.cuOrders(ORDERS) : ORDERS).slice()).slice(0, 3); // bölgenin yemekleri (src/culture.js)
  const k = await choose(
    $t("tl.rk.t"),
    $t("tl.rk.s"),
    `${$t("tl.rk.b")}<br>${vets.map((v, i) => `<b>${esc(v)}</b>: ${$t(`tl.food.${ord[i]}`)}`).join("<br>")}`,
    [
      ["skip", $t("tl.rk.skip"), $t("tl.rk.skipD")],
      ["go", $t("tl.rk.go"), $t("tl.rk.goD")]
    ]
  );
  if (k === "skip") {
    S.rel.takim -= 2;
    return done($t("tl.rk.skipR"), [[$t("tl.fx.team", { v: -2 }), "n"]]);
  }
  // hafıza: siparişleri kime götüreceksin?
  let right = 0;
  for (let i = 0; i < 3; i++) {
    const opts = shuffle(ord.map(o => o));
    const pickd = await choose($t("tl.rk.t"), $t("tl.rk.q", { n: i + 1 }), $t("tl.rk.who", { v: esc(vets[i]) }), opts.map(o => [o, $t(`tl.food.${o}`), ""]));
    if (pickd === ord[i]) right++;
  }
  const ok = right >= 2;
  S.rel.takim += ok ? 4 : -1;
  if (ok && late.chemAdd) late.chemAdd(3);
  return done(ok ? $t("tl.rk.ok", { r: right }) : $t("tl.rk.no", { r: right }), [[$t("tl.fx.team", { v: ok ? 4 : -1 }), ok ? "p" : "n"]]);
}

/* ---------- 3 İmza günü kuyruğu ---------- */
const SIGN = [
  ["ball", 1],
  ["jersey", 1],
  ["baby", 1],
  ["cast", 1],
  ["invite", 1],
  ["napkin", 1],
  ["lease", 0],
  ["check", 0],
  ["exam", 0]
];
async function signQueue() {
  const k = await choose($t("tl.sg.t"), $t("tl.sg.s"), $t("tl.sg.b"), [
    ["skip", $t("tl.sg.skip"), ""],
    ["go", $t("tl.sg.go"), $t("tl.sg.goD")]
  ]);
  if (k === "skip") return done($t("tl.sg.skipR"), []);
  const q = shuffle(SIGN.slice()).slice(0, 6);
  let good = 0,
    trap = null;
  for (const [id, ok] of q) {
    const a = await choose($t("tl.sg.t"), $t("tl.sg.next"), $t(`tl.sg.i.${id}`), [
      ["no", $t("tl.sg.no"), ""],
      ["yes", $t("tl.sg.yes"), ""]
    ]);
    if (a === "yes" && ok) good++;
    if (a === "no" && !ok) good++;
    if (a === "yes" && !ok) trap = id;
  }
  S.rel.taraf += good;
  if (late.mediaGain) late.mediaGain(0.01 * good, 3);
  if (trap) news($t(`tl.sg.news.${trap}`, { v: fullName() }));
  return done(trap ? $t("tl.sg.trap", { g: good }) : $t("tl.sg.ok", { g: good }), [[$t("tl.fx.fans", { v: good }), "p"], ...(trap ? [[$t("tl.fx.news"), "t"]] : [])]);
}

/* ---------- 4 Anneannenin üçüncü tabağı ---------- */
async function grandma() {
  const k = await choose($t("tl.gm.t"), $t("tl.gm.s"), $t("tl.gm.b"), [
    ["eat", $t("tl.gm.eat"), $t("tl.gm.eatD")],
    ["dodge", $t("tl.gm.dodge"), $t("tl.gm.dodgeD")]
  ]);
  if (k === "eat") {
    S.rel.aile += 5;
    S.energy -= 6;
    S.moral += 3;
    return done($t("tl.gm.eatR"), [[$t("tl.fx.family", { v: 5 }), "p"], [$t("tl.fx.en", { v: -6 }), "n"]]);
  }
  const r = await mini($t("tl.gm.dodge"), el => mgTiming(el, { eff: 50, title: $t("tl.gm.dodgeT"), tries: 2, label: $t("tl.gm.label"), kind: "free" }));
  if (r.ok >= 1) {
    S.rel.aile += 3;
    return outro($t("tl.gm.dodge"), $t("tl.gm.dodgeOk"), [[$t("tl.fx.family", { v: 3 }), "p"]]);
  }
  S.rel.aile += 4;
  S.energy -= 8;
  return outro($t("tl.gm.dodge"), $t("tl.gm.dodgeNo"), [[$t("tl.fx.family", { v: 4 }), "p"], [$t("tl.fx.en", { v: -8 }), "n"]]);
}

/* ---------- 6 Deplasman otobüsünde kart oyunu ---------- */
async function busCards() {
  const mate = (late.mateNames ? late.mateNames(3) : ["P. Pivot"])[ri(0, 2)] || "P. Pivot";
  const k = await choose($t("tl.cd.t"), $t("tl.cd.s"), $t("tl.cd.b", { m: esc(mate) }), [
    ["sleep", $t("tl.cd.sleep"), $t("tl.cd.sleepD")],
    ["play", $t("tl.cd.play"), $t("tl.cd.playD")]
  ]);
  if (k === "sleep") {
    S.energy += 5;
    return done($t("tl.cd.sleepR"), [[$t("tl.fx.en", { v: 5 }), "p"]]);
  }
  // yüksek mi düşük mü: 3 el
  let card = ri(2, 12),
    wins = 0;
  for (let i = 0; i < 3; i++) {
    const a = await choose($t("tl.cd.t"), $t("tl.cd.round", { n: i + 1, w: wins }), $t("tl.cd.card", { v: card }), [
      ["lo", $t("tl.cd.lo"), ""],
      ["hi", $t("tl.cd.hi"), ""]
    ]);
    const next = ri(1, 13);
    if ((a === "hi" && next >= card) || (a === "lo" && next <= card)) wins++;
    card = next;
  }
  const k2 =
    wins >= 2
      ? await choose($t("tl.cd.t"), $t("tl.cd.end"), $t("tl.cd.lead", { m: esc(mate), w: wins }), [
          ["let", $t("tl.cd.let"), $t("tl.cd.letD")],
          ["win", $t("tl.cd.win"), $t("tl.cd.winD")]
        ])
      : "lost";
  if (k2 === "let") {
    S.rel.takim += 3;
    if (late.chemAdd) late.chemAdd(2);
    return done($t("tl.cd.letR", { m: esc(mate) }), [[$t("tl.fx.team", { v: 3 }), "p"]]);
  }
  if (k2 === "win") {
    tx($t("tl.cd.pot"), Math.round(4 * pmul()));
    S.rel.takim -= 1;
    return done($t("tl.cd.winR", { m: esc(mate) }), [[$t("tl.fx.team", { v: -1 }), "n"]]);
  }
  S.rel.takim += 1;
  return done($t("tl.cd.lostR", { m: esc(mate) }), [[$t("tl.fx.team", { v: 1 }), "p"]]);
}

/* ---------- 8 Reklam çekimi (studio.js → sponsor çekimi) ---------- */
const LINES = ["fast", "shoe", "drink", "phone"];
export async function adShoot() {
  const line = pick(LINES),
    words = $t(`tl.ad.l.${line}`).split(" "),
    miss = ri(1, words.length - 2),
    right = words[miss];
  const wrong = shuffle($t("rc.ad.wrong").split("|").filter(w => w !== right)).slice(0, 2);
  // replik 2 sn görünür, sonra eksik kelimeyi seç
  sheet($t("tl.ad.t"), $t("tl.ad.s"), `<div class="say"><b>${esc(words.join(" "))}</b></div><p class="small muted">${$t("tl.ad.mem")}</p>`, { noClose: true });
  await new Promise(r => setTimeout(r, window.__SIM ? 0 : 2200));
  const shown = words.map((w, i) => (i === miss ? "____" : w)).join(" ");
  const a = await choose($t("tl.ad.t"), $t("tl.ad.action"), `<b>${esc(shown)}</b>`, shuffle([right, ...wrong]).map(w => [w, esc(w), ""]));
  // panel açık kalır: çekim sonucu (resultView) aynı panele yazılır
  if (a === right) return { ok: true, txt: $t("tl.ad.ok") };
  if (late.mediaGain) late.mediaGain(0.015, 5); // blooper viral oldu
  return { ok: false, txt: $t("tl.ad.blooper", { w: esc(a) }) };
}

/* ---------- 9 Sezon başı sağlık kontrolü ---------- */
async function medical() {
  const k = await choose($t("tl.md.t"), $t("tl.md.s"), $t("tl.md.b"), [
    ["quick", $t("tl.md.quick"), $t("tl.md.quickD")],
    ["jump", $t("tl.md.jump"), $t("tl.md.jumpD")]
  ]);
  tl().short = (tl().short || 0) + 1;
  const cm = tl().short;
  if (k === "quick") return done($t("tl.md.quickR", { n: cm }), []);
  const r = await mini($t("tl.md.jump"), el => mgTiming(el, { eff: eff("guc") + 5, title: $t("tl.md.jumpT"), tries: 2, label: $t("tl.md.label"), kind: "dunk" }));
  const jump = 55 + r.ok * 9 + Math.round(eff("hiz") / 6);
  if (r.ok) late.gainStat("guc", 0.15 * late.levelMul("guc"));
  return outro($t("tl.md.jump"), $t("tl.md.res", { j: jump, n: cm }), r.ok ? [[$t("tl.fx.stat"), "p"]] : []);
}

/* ---------- 10 Troll'e cevap ---------- */
async function troll() {
  const tid = pick(["free", "hair", "shoes", "bench"]);
  const k = await choose($t("tl.tr.t"), $t("tl.tr.s"), `<div class="say">@${pick(["sepet_kral", "basket_uzmani34", "kanepe_koc", "hakem_benim"])}: "${$t(`tl.tr.m.${tid}`, { v: esc(nm()) })}"</div>`, [
    ["ignore", $t("tl.tr.ignore"), $t("tl.tr.ignoreD")],
    ["funny", $t("tl.tr.funny"), $t(`tl.tr.f.${tid}`)],
    ["harsh", $t("tl.tr.harsh"), $t("tl.tr.harshD")]
  ]);
  if (k === "ignore") {
    S.moral += 1;
    return done($t("tl.tr.ignoreR"), []);
  }
  if (k === "funny") {
    const add = late.mediaGain ? late.mediaGain(0.02, 8) : 0;
    S.rel.taraf += 2;
    tl().trollWon = (tl().trollWon || 0) + 1;
    return done($t("tl.tr.funnyR"), [[$t("tl.fx.fol", { v: late.kfmt ? late.kfmt(add) : add }), "p"], [$t("tl.fx.fans", { v: 2 }), "p"]]);
  }
  const ok = Math.random() < 0.5;
  if (late.mediaGain) late.mediaGain(ok ? 0.03 : 0.01, 5);
  S.rel.koc -= 1;
  if (!ok) news($t("tl.tr.news", { v: fullName() }));
  return done(ok ? $t("tl.tr.harshOk") : $t("tl.tr.harshNo"), [[$t("tl.fx.coach", { v: -1 }), "n"], ...(ok ? [] : [[$t("tl.fx.news"), "t"]])]);
}

/* ---------- Yan hikâyeler (kariyer boyu geri döner) ---------- */
async function sockTale() {
  const T = tl();
  if (T.sock === 0) {
    T.sock = 1;
    T.sockAt = widx();
    return done($t("tl.sock.1"), [[$t("tl.fx.sockLost"), "n"]]);
  }
  T.sock = 2;
  const k = await choose($t("tl.sock.t"), $t("tl.sock.s"), $t("tl.sock.2", { m: esc((late.mateNames ? late.mateNames(4) : ["B. Pivot"])[ri(0, 3)] || "B. Pivot") }), [
    ["keep", $t("tl.sock.keep"), ""],
    ["wash", $t("tl.sock.wash"), $t("tl.sock.washD")]
  ]);
  if (k === "wash") T.sockWashed = 1;
  S.moral += 4;
  return done(k === "wash" ? $t("tl.sock.washR") : $t("tl.sock.keepR"), [[$t("tl.fx.moral", { v: 4 }), "p"]]);
}
/** şanslı çorap kayıpken şut biraz düşer (src/core.js eff → maç içi) */
export const sockMod = () => (S && S.tales && S.tales.sock === 1 && M && M.live ? -2 : 0);
async function pivotTale() {
  const T = tl(),
    piv = (late.mateNames ? late.mateNames(5) : ["K. Pivot"]).slice(-1)[0] || "K. Pivot";
  T.pivot++;
  if (T.pivot === 1) {
    const k = await choose($t("tl.pv.t"), $t("tl.pv.s"), $t("tl.pv.1", { p: esc(piv) }), [
      ["no", $t("tl.pv.no"), ""],
      ["yes", $t("tl.pv.yes"), ""]
    ]);
    T.pivotYes = k === "yes";
    if (T.pivotYes && late.chemAdd) late.chemAdd(3);
    S.rel.takim += T.pivotYes ? 3 : -1;
    return done(T.pivotYes ? $t("tl.pv.yesR", { p: esc(piv) }) : $t("tl.pv.noR", { p: esc(piv) }), [[$t("tl.fx.team", { v: T.pivotYes ? 3 : -1 }), T.pivotYes ? "p" : "n"]]);
  }
  S.moral += 3;
  return done(T.pivotYes ? $t("tl.pv.2yes", { p: esc(piv) }) : $t("tl.pv.2no", { p: esc(piv) }), [[$t("tl.fx.moral", { v: 3 }), "p"]]);
}
async function coffeeTale() {
  const T = tl();
  T.coffee++;
  if (T.coffee === 1) return done($t("tl.cf.1", { c: esc(S.npc.coach) }), []);
  const cost = Math.round(15 * pmul());
  const k = await choose($t("tl.cf.t"), $t("tl.cf.s"), $t("tl.cf.2", { c: esc(S.npc.coach) }), [
    ["no", $t("tl.cf.no"), ""],
    ["buy", $t("tl.cf.buy"), fmt(cost)]
  ]);
  if (k === "buy" && S.money >= cost) {
    tx($t("tl.cf.buy"), -cost);
    S.rel.koc += 6;
    return done($t("tl.cf.buyR", { c: esc(S.npc.coach) }), [[$t("tl.fx.coach", { v: 6 }), "p"]]);
  }
  return done($t("tl.cf.noR", { c: esc(S.npc.coach) }), []);
}
async function trashTale() {
  const T = tl(),
    rv = late.rivalName ? late.rivalName() : "";
  if (!rv) return false;
  T.trash++;
  if (T.trash === 1) {
    const k = await choose($t("tl.tt.t"), $t("tl.tt.s"), $t("tl.tt.1", { r: esc(rv) }), [
      ["calm", $t("tl.tt.calm"), ""],
      ["back", $t("tl.tt.back"), ""]
    ]);
    if (k === "back") (late.mediaGain && late.mediaGain(0.015, 4), (S.rel.koc -= 1));
    return done(k === "back" ? $t("tl.tt.backR", { r: esc(rv) }) : $t("tl.tt.calmR", { r: esc(rv) }), []);
  }
  // sonunda birlikte reklam
  tx($t("tl.tt.adTx"), Math.round(20 * pmul()));
  if (late.mediaGain) late.mediaGain(0.02, 10);
  return done($t("tl.tt.2", { r: esc(rv) }), [[$t("tl.fx.money"), "p"]]);
}

/* ---------- Takım arkadaşı kişilikleri, kavgalar, kaptanlık, mentorluk ---------- */
const TRAITS = ["leader", "joker", "hungry", "quiet", "diva"];
const hashN = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export const mateTrait = n => TRAITS[hashN(n) % TRAITS.length];
export const mateTraitHTML = n => ` <span class="pill" title="${$t(`tl.tr2.${mateTrait(n)}D`)}">${$t(`tl.tr2.${mateTrait(n)}`)}</span>`;
const fullMates = () => (late.roster ? late.roster().map(p => p.n) : []);
// kaptanlık: kıdemli, takımla arası iyi bir yıldız
Bus.on("week:start", () => {
  if (S && S.captain && S.role === "bench") S.captain = null; // yedek kulübesinde kaptanlık olmaz
  if (!S || !S.team || !isPro(S.stage) || S.captain === S.team.key) return;
  if (S.age >= 26 && S.rel.takim >= 70 && S.role === "star") {
    S.captain = S.team.key;
    S.rel.takim += 3;
    news($t("tl.cap.news", { v: fullName(), t: S.team.name }));
  }
});
export const isCaptain = () => !!(S && S.team && S.captain === S.team.key);
async function feudTale() {
  const ms = fullMates();
  tl().feudAt = widx();
  const pa = ms.filter(n => ["diva", "hungry"].includes(mateTrait(n))),
    a = pa.length ? pick(pa) : ms[0],
    pb = ms.filter(n => n !== a && ["hungry", "leader", "joker"].includes(mateTrait(n))),
    b = pb.length ? pick(pb) : ms.find(n => n !== a);
  if (!a || !b) return false;
  const opts = [
    ["stay", $t("tl.fd.stay"), $t("tl.fd.stayD")],
    ["a", $t("tl.fd.side", { n: esc(a) }), $t(`tl.tr2.${mateTrait(a)}`)],
    ["b", $t("tl.fd.side", { n: esc(b) }), $t(`tl.tr2.${mateTrait(b)}`)]
  ];
  if (isCaptain()) opts.push(["mediate", $t("tl.fd.mediate"), $t("tl.fd.mediateD")]);
  const k = await choose($t("tl.fd.t"), $t("tl.fd.s"), $t("tl.fd.b", { a: esc(a), b: esc(b) }), opts);
  if (k === "stay") return done($t("tl.fd.stayR"), []);
  if (k === "mediate") {
    S.rel.takim += 5;
    if (late.chemAdd) late.chemAdd(3);
    return done($t("tl.fd.mediateR", { a: esc(a), b: esc(b) }), [[$t("tl.fx.team", { v: 5 }), "p"]]);
  }
  S.rel.takim += 1;
  tl().feudSide = { n: k === "a" ? a : b, team: S.team.key }; // takım arkadaşı hafızası (src/bonds.js)
  return done($t("tl.fd.sideR", { w: esc(k === "a" ? a : b), l: esc(k === "a" ? b : a) }), [[$t("tl.fx.team", { v: 1 }), "p"]]);
}
async function captainTale() {
  tl().capAt = widx();
  const k = await choose($t("tl.cp.t"), $t("tl.cp.s"), $t("tl.cp.b", { c: esc(S.npc.coach) }), [
    ["quiet", $t("tl.cp.quiet"), $t("tl.cp.quietD")],
    ["coach", $t("tl.cp.coach"), $t("tl.cp.coachD")],
    ["team", $t("tl.cp.team"), $t("tl.cp.teamD")]
  ]);
  if (k === "quiet") return done($t("tl.cp.quietR"), []);
  if (k === "coach") {
    S.rel.koc += 2;
    S.rel.takim += 3;
    S.energy += 6;
    return done($t("tl.cp.coachR", { c: esc(S.npc.coach) }), [[$t("tl.fx.team", { v: 3 }), "p"], [$t("tl.fx.en", { v: 6 }), "p"]]);
  }
  S.rel.koc += 4;
  S.rel.takim -= 1;
  return done($t("tl.cp.teamR"), [[$t("tl.fx.coach", { v: 4 }), "p"]]);
}
async function mentorTale() {
  const M2 = S.mentee;
  if (M2 && M2.team !== S.team.name) {
    S.mentee = null; // takım değişti: mentorluk biter
    return false;
  }
  if (!M2) {
    const young = late.roster ? late.roster().slice().sort((x, y) => x.age - y.age)[0] : null;
    if (!young) return false;
    const k = await choose($t("tl.mt.t"), $t("tl.mt.s"), $t("tl.mt.b", { n: esc(young.n), a: young.age }), [
      ["no", $t("tl.mt.no"), ""],
      ["yes", $t("tl.mt.yes"), $t("tl.mt.yesD")]
    ]);
    if (k === "no") return done($t("tl.mt.noR", { n: esc(young.n) }), []);
    S.mentee = { n: young.n, step: 1, at: widx(), team: S.team.name };
    S.rel.takim += 2;
    return done($t("tl.mt.yesR", { n: esc(young.n) }), [[$t("tl.fx.team", { v: 2 }), "p"]]);
  }
  M2.step++;
  M2.at = widx();
  if (M2.step === 2) {
    S.moral += 3;
    return done($t("tl.mt.2", { n: esc(M2.n) }), [[$t("tl.fx.moral", { v: 3 }), "p"]]);
  }
  S.legacy = S.legacy || { found: {}, club: 0 };
  S.legacy.kids = (S.legacy.kids || 0) + 2;
  news($t("tl.mt.news", { n: M2.n, v: fullName() }));
  return done($t("tl.mt.3", { n: esc(M2.n) }), [[$t("sl.fxLegacy"), "p"]]);
}

/* ---------- Haftalık seçici ---------- */
function eligible() {
  const T = tl(),
    pro = isPro(S.stage),
    out = [];
  if (pro && S.stageSeason === 1 && S.week <= 8) out.push(rookieErrand);
  if (S.week === 1 || S.week === 2) {
    if (T.medSeason !== S.season) out.push(medical);
  }
  out.push(lateBus);
  if (S.followers > 300) out.push(signQueue);
  if (!(late.cuForeign && late.cuForeign())) out.push(grandma); // yurtdışındayken anneannede pazar yemeği olmaz
  if (pro) out.push(busCards);
  if (S.followers > 500) out.push(troll);
  if (T.sock === 0 && S.season >= 2) out.push(sockTale);
  if (T.sock === 1 && widx() - (T.sockAt || 0) >= 5) out.push(sockTale);
  if (pro && T.pivot < 2) out.push(pivotTale);
  if (T.coffee < 2) out.push(coffeeTale);
  if (S.rival && T.trash < 2 && pro) out.push(trashTale);
  if (pro && fullMates().length > 3 && widx() - (T.feudAt ?? -99) >= 12) out.push(feudTale);
  if (isCaptain() && widx() - (T.capAt ?? -99) >= 10) out.push(captainTale);
  if (pro && S.age >= 29 && (!S.mentee || (S.mentee.step < 3 && widx() - S.mentee.at >= 8))) out.push(mentorTale);
  return out;
}
export function taleSheet() {
  if (!S || window.__SIM || S.retired || !late.unlocked("hikaye")) return false;
  const T = tl();
  if (widx() - T.last < 3 || Math.random() > 0.55) return false;
  const list = eligible();
  if (!list.length) return false;
  // öncelik: sezon başı sağlık kontrolü, kayıp çorabın bulunması
  const f = list.includes(medical) ? medical : list.includes(sockTale) && T.sock === 1 ? sockTale : pick(list);
  T.last = widx();
  if (f === medical) T.medSeason = S.season;
  Promise.resolve(f()).then(r => {
    if (r === false) closeSheet();
  });
  return true;
}
Bus.offer("week:sheet", taleSheet, PRIO.tale);

/* ---------- 5 Devre arası maskot düellosu (engine.js quarterBreak) ---------- */
export const mascotHTML = () =>
  M && M.home && !M.mascot ? `<button class="btn team sm" id="tl-mascot">${$t("tl.ms.btn")}</button>` : "";
export function bindMascot() {
  const b = $("#tl-mascot");
  if (!b) return;
  b.onclick = async () => {
    M.mascot = 1;
    b.disabled = true;
    // devre arası kartı (taktik, devam düğmesi) yerinde kalsın: mini oyun kartın içinde ayrı kutuda
    const box = document.createElement("div");
    b.after(box);
    const r = await mgShoot(box, { eff: eff("sut") + 8, shots: 1, title: $t("tl.ms.title"), dist: "three" });
    box.remove();
    if (r.made) {
      M.hype = Math.min(100, (M.hype || 0) + 45);
      late.addFeed(`<b class="gold">${$t("tl.ms.win")}</b>`);
    } else late.addFeed($t("tl.ms.lose"));
    b.remove();
  };
}

/* ---------- 7 Hakemle tartışma (engine.js: savunmada faul sonrası) ---------- */
export async function refArgue(el) {
  if (!M || M.fo || Math.random() > 0.45) return "";
  const k = await new Promise(res => {
    el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("tl.rf.t")}</div><h2>${$t("tl.rf.h")}</h2><div class="choices"><button class="choice" data-rf="walk"><span class="ct">${$t("tl.rf.walk")}</span><span class="cd">${$t("tl.rf.walkD")}</span></button><button class="choice" data-rf="breathe"><span class="ct">${$t("tl.rf.breathe")}</span><span class="cd">${$t("tl.rf.breatheD")}</span></button><button class="choice" data-rf="argue"><span class="ct">${$t("tl.rf.argue")}</span><span class="cd">${$t("tl.rf.argueD")}</span></button></div></div>`;
    [...el.querySelectorAll("[data-rf]")].forEach(b => (b.onclick = () => res(b.dataset.rf)));
  });
  if (k === "walk") return ` ${$t("tl.rf.walkR")}`;
  if (k === "breathe") {
    const r = await mgTiming(el, { eff: 55, title: $t("tl.rf.breathe"), tries: 1, label: $t("tl.rf.label"), kind: "free" });
    if (r.ok) {
      M.mmod = (M.mmod || 0) + 2;
      return ` ${$t("tl.rf.calmR")}`;
    }
  }
  // itiraz ya da sakinleşemedi: teknik faul riski
  if (Math.random() < (k === "argue" ? 0.6 : 0.35)) {
    const f = late.addFoul ? late.addFoul() : "";
    M.them += 1;
    return ` <b class="bad">${$t("tl.rf.tech")}</b>${f}`;
  }
  return ` ${$t("tl.rf.lucky")}`;
}

/* ---------- Lakap ---------- */
const NICKS = [
  ["ice", () => (S.career.clutch || 0) >= 3],
  ["sniper", () => (S.career.threes || 0) >= 25],
  ["glass", () => (S.career.reb || 0) / Math.max(1, S.career.games) >= 6],
  ["prof", () => (S.career.ast || 0) / Math.max(1, S.career.games) >= 5],
  ["thief", () => (S.career.stl || 0) / Math.max(1, S.career.games) >= 1.5],
  ["whistle", () => (S.career.pf || 0) / Math.max(1, S.career.games) >= 3],
  ["machine", () => (S.career.pts || 0) / Math.max(1, S.career.games) >= 15],
  ["night", () => true]
];
export const nickName = () => (S && S.nick ? $t(`tl.nick.${S.nick}`) : "");
Bus.on("match:end", e => {
  if (!S || !M) return;
  if (M.buzz) S.career.clutch = (S.career.clutch || 0) + 1;
  S.career.threes = (S.career.threes || 0) + (M.tpm || 0);
  S.career.pf = (S.career.pf || 0) + (M.pf || 0);
  if ((S.career.games || 0) >= 10 && (!S.nick || (S.career.games || 0) % 40 === 0)) {
    const n = NICKS.find(([, f]) => f())[0];
    if (n !== S.nick) {
      S.nick = n;
      news($t("tl.nick.news", { v: fullName(), n: $t(`tl.nick.${n}`) }));
    }
  }
  void e;
});

/* ---------- Geri dönüşler: eski hocan rakip kenarda ---------- */
Bus.on("week:start", () => {
  if (!S || !S.team) return;
  const T = tl();
  if (T.coachTeam && T.coachTeam !== S.team.key && T.coachName) {
    S.exCoaches = [...(S.exCoaches || []), { n: T.coachName, key: T.coachTeam }].slice(-6);
  }
  T.coachTeam = S.team.key;
  T.coachName = S.npc.coach;
});
/** maç başında (src/matchday.js): rakip kenarda eski hocan varsa akışa not */
export function exCoachNote(opp) {
  const x = opp && (S.exCoaches || []).find(c => c.key === opp.key);
  if (!x || !late.addFeed) return;
  late.addFeed(`<b class="gold">${$t("tl.ex.coach", { c: esc(x.n) })}</b>`);
  if (M) M.mmod = (M.mmod || 0) + 1;
}

/* ---------- Spiker karakteri ---------- */
export function commentLine(kind) {
  if (!M || !late.addFeed) return;
  const nick = nickName();
  const who = nick ? `${esc(nm())} "${nick}"` : esc(nm());
  late.addFeed(`<i>${$t("tl.cm.tag")}</i> ${$t(`tl.cm.${kind}.${ri(1, 3)}`, { v: who, t: esc(S.team.short), o: esc(M.opp ? M.opp.short : "") })}`);
}

/* ---------- Haftalık mizah köşesi ---------- */
Bus.on("week:start", () => {
  if (!S || window.__SIM || S.week % 3 !== 0 || late.focusOff("hikaye")) return;
  const last = (S.results || []).slice(-1)[0];
  const pool = last ? (last.win ? "w" : "l") : "n";
  news(`${$t("tl.hd.tag")} ${$t(`tl.hd.${pool}.${ri(1, 5)}`, { v: esc(nm()), c: esc(S.npc.coach), t: esc(S.team.short) })}`);
});

/* ---------- Transfer gecesi: ailenin tepkileri (custom.js yeni forma anı) ---------- */
export const transferNight = () =>
  `<div class="card gap-1"><div class="eyebrow">${$t("tl.tn.t")}</div>${["mom", "dad", "friend", "agent"]
    .map(k => `<div class="small"><b>${esc(S.npc[k] || $t(`tl.tn.${k}N`))}:</b> "${$t(`tl.tn.${k}.${ri(1, 2)}`, { team: esc(S.team.name) })}"</div>`)
    .join("")}</div>`;
