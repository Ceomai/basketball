/* ================= MENAJER: SPONSOR PAZARLIĞI, ZAM, İMAJ; MAÇ ÖNCESİ HAZIRLIK =================
   Sponsor pazarlığı (eskiden "kabul et / %25 iste" iki düğme):
   - Üç marka teklif yapar; her birinin yapısı farklıdır: peşin ağırlıklı, haftalık ödemeli (sezon boyunca) ya da
     performans primli. Markanın sabrı (3-4 hamle) ve ilgisi vardır.
   - Hamleler: peşin tutarı artır, haftalık ödemeyi artır, süreyi uzat, performans primi ekle, rakip markayı masaya
     getir (bir kez: diğer markanın teklifini koz olarak kullan). Başarı şansı şöhrete ve markanın ilgisine bağlı;
     reddedilen hamle ilgiyi düşürür, sabır biterse marka çekilir. Marka bazen ara bir karşı teklif yapar.
   - Anlaşma: peşin ödeme hemen, haftalık ödeme sezon boyunca (src/match.js → endWeek), prim iyi maçlarda.
   Menajerden ek işler: maaş zammı iste (sezonda bir, iyi oynuyorsan), imaj kampanyası (para → taraftar ve takipçi).
   Maç öncesi hazırlık (önemli maçlarda: derbi, zirve, playoff): basın toplantısı (hızlı cevap mini oyunu) ve
   video analizi (rakibin hücum dizisini ezberle). Başarı o maçta küçük bir avantaj verir. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, esc, fmt, pick, ri, rnd, shuffle, statName } from "./data.js";
import { S, closeSheet, fame, news, norm, resultView, sheet, tx, useSlot, fullName } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

/* ---- Sponsor ---- */
const BRANDS = [
  { id: "spor", kind: "upfront" },
  { id: "icecek", kind: "weekly" },
  { id: "oto", kind: "upfront" },
  { id: "tekno", kind: "perf" },
  { id: "saat", kind: "weekly" },
  { id: "giyim", kind: "perf" }
];
const brandName = b => $t(`ag.b.${b.id}`);
function makeOffers(base) {
  return shuffle(BRANDS.slice())
    .slice(0, 3)
    .map(b => {
      const v = base * rnd(0.85, 1.15);
      const o = { b, interest: clamp(0.5 + fame() / 200 + rnd(-0.1, 0.1), 0.35, 0.9), patience: ri(3, 4), seasons: 1, perf: 0 };
      if (b.kind === "upfront") Object.assign(o, { up: Math.round(v), wk: 0 });
      else if (b.kind === "weekly") Object.assign(o, { up: Math.round(v * 0.25), wk: Math.round((v * 0.9) / 14) });
      else Object.assign(o, { up: Math.round(v * 0.55), wk: 0, perf: Math.round(v / 25) });
      return o;
    });
}
const totalOf = o => o.up + o.wk * 14 * o.seasons + o.perf * 6 * o.seasons; // yaklaşık sezonluk değer (6 iyi maç)
export function sponsorTalk(base) {
  const offers = makeOffers(base);
  const pick1 = () =>
    sheet(
      $t("ag.title"),
      $t("ag.sub", { v: S.npc.agent }),
      `<p>${$t("ag.intro")}</p><div class="choices">${offers
        .map(
          (o, i) =>
            `<button class="choice" data-so="${i}"><span class="ct">${brandName(o.b)}</span><span class="cd">${offerLine(o)}</span><span class="od m">~${fmt(totalOf(o))}</span></button>`
        )
        .join("")}</div><button class="btn ghost" id="so-x">${$t("systems.76")}</button>`
    );
  pick1();
  $$("[data-so]").forEach(b => (b.onclick = () => talk(offers, +b.dataset.so)));
  $("#so-x").onclick = () => closeSheet();
}
function offerLine(o) {
  const p = [];
  if (o.up) p.push($t("ag.up", { v: fmt(o.up) }));
  if (o.wk) p.push($t("ag.wk", { v: fmt(o.wk) }));
  if (o.perf) p.push($t("ag.perf", { v: fmt(o.perf) }));
  p.push($t("ag.seasons", { v: o.seasons }));
  return p.join(" · ");
}
function talk(offers, i, msg = "", usedRival = false) {
  const o = offers[i];
  const moods =
    o.interest > 0.7
      ? $t("systems.65")
      : o.interest > 0.55
        ? $t("systems.66")
        : o.interest > 0.4
          ? $t("match.2")
          : $t("systems.67");
  const rival = offers.find((x, j) => j !== i && !x.gone);
  sheet(
    brandName(o.b),
    $t("ag.talkSub", { v: o.patience }),
    `<div class="card"><div class="kv"><span>${$t("ag.upL")}</span><b class="gold">${fmt(o.up)}</b><span>${$t("ag.wkL")}</span><b>${fmt(o.wk)}</b><span>${$t("ag.perfL")}</span><b>${fmt(o.perf)}</b><span>${$t("ag.seasonsL")}</span><b>${o.seasons}</b><span>${$t("systems.71")}</span><b>${moods}</b><span>${$t("ag.totalL")}</span><b>~${fmt(totalOf(o))}</b></div></div>
     ${msg ? `<div class="say">${msg}</div>` : ""}
     <div class="grid2"><button class="btn ghost sm" data-ask="up">${$t("ag.askUp")}</button><button class="btn ghost sm" data-ask="wk">${$t("ag.askWk")}</button><button class="btn ghost sm" data-ask="len" ${o.seasons >= 3 ? "disabled" : ""}>${$t("ag.askLen")}</button><button class="btn ghost sm" data-ask="perf">${$t("ag.askPerf")}</button></div>
     ${rival && !usedRival ? `<button class="btn ghost sm" data-ask="rival">${$t("ag.askRival", { v: brandName(rival.b) })}</button>` : ""}
     <div class="grid2"><button class="btn ghost" id="ag-back">${$t("ag.other")}</button><button class="btn good" id="ag-ok">${$t("systems.77")}</button></div>`,
    { noClose: true }
  );
  $$("[data-ask]").forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.ask;
        o.patience--;
        const diff = { up: 0, wk: 0.05, len: 0.1, perf: -0.05, rival: 0.05 }[k];
        const ok = Math.random() < o.interest - diff;
        if (k === "rival") usedRival = true;
        if (ok) {
          late.sfx("coin");
          if (k === "up") o.up = Math.round(o.up * 1.15 + 1);
          if (k === "wk") o.wk = Math.round(Math.max(o.wk * 1.2, o.up / 30));
          if (k === "len") o.seasons++;
          if (k === "perf") o.perf = Math.round(Math.max(o.perf * 1.25, o.up / 40));
          if (k === "rival") {
            o.up = Math.round(o.up * 1.15);
            o.wk = Math.round(o.wk * 1.15);
          }
          o.interest -= 0.04;
          msg = $t("ag.yes");
        } else {
          o.interest -= 0.1;
          // ara teklif: marka tamamen reddetmek yerine yarısını kabul edebilir
          if (k === "up" && Math.random() < 0.5) {
            o.up = Math.round(o.up * 1.06);
            msg = $t("ag.counter");
          } else msg = $t("ag.no");
          if (k === "rival" && Math.random() < 0.4) {
            o.gone = true;
            o.patience = 0;
          }
        }
        if (o.patience <= 0 && (o.interest < 0.4 || o.gone)) {
          o.gone = true;
          late.sfx("lose");
          sheet(
            brandName(o.b),
            $t("ag.goneSub"),
            `<div class="say">${$t("ag.gone", { v: brandName(o.b) })}</div><button class="btn pri" id="ag-x">${$t("ag.other")}</button>`,
            { noClose: true }
          );
          $("#ag-x").onclick = () => backToList(offers);
          return;
        }
        if (o.patience <= 0) msg += ` ${$t("ag.last")}`;
        talk(offers, i, msg, usedRival);
      })
  );
  if (o.patience <= 0) $$("[data-ask]").forEach(b => (b.disabled = true));
  $("#ag-back").onclick = () => backToList(offers);
  $("#ag-ok").onclick = () => sign(o);
}
function backToList(offers) {
  const left = offers.filter(o => !o.gone);
  if (!left.length) {
    S.buffs.sponsorSeason = S.season;
    save();
    return resultView($t("ag.title"), $t("ag.none"));
  }
  sheet(
    $t("ag.title"),
    $t("ag.sub", { v: S.npc.agent }),
    `<div class="choices">${offers
      .map((o, i) =>
        o.gone
          ? `<button class="choice" disabled style="opacity:.5"><span class="ct">${brandName(o.b)}</span><span class="cd">${$t("ag.goneShort")}</span></button>`
          : `<button class="choice" data-so="${i}"><span class="ct">${brandName(o.b)}</span><span class="cd">${offerLine(o)}</span><span class="od m">~${fmt(totalOf(o))}</span></button>`
      )
      .join("")}</div>`,
    { noClose: true }
  );
  $$("[data-so]").forEach(b => (b.onclick = () => talk(offers, +b.dataset.so)));
}
function sign(o) {
  late.sfx("levelup");
  if (o.up) tx($t("ag.txUp", { v: brandName(o.b) }), o.up);
  S.sponsorDeal = { b: o.b.id, wk: o.wk, perf: o.perf, until: S.season + o.seasons - 1, rel: 60 }; // ilişki: src/studio.js
  S.buffs.sponsorSeason = S.season;
  S.rel.taraf += 2;
  news($t("ag.news", { v: fullName(), b: brandName(o.b) }));
  Bus.emit("sponsor", { b: o.b.id, total: totalOf(o) });
  save();
  resultView($t("ag.signed"), $t("ag.signedD", { v: brandName(o.b), t: offerLine(o) }));
}
/** Haftalık sponsor ödemesi (endWeek) */
export function sponsorWeekly() {
  const d = S && S.sponsorDeal;
  if (!d) return;
  if (S.season > d.until) {
    S.sponsorDeal = null;
    return;
  }
  if (d.wk) tx($t("ag.txWk", { v: $t(`ag.b.${d.b}`) }), d.wk);
  late.sponsorRelTick(); // sponsor ilişkisi her hafta azalır; bakım ister (src/studio.js)
}
/** Performans primi (maç notu 7.5 ve üstü) */
Bus.on("match:end", e => {
  const d = S && S.sponsorDeal;
  if (d && d.perf && S.season <= d.until && e && e.rating >= 7.5) tx($t("ag.txPerf", { v: $t(`ag.b.${d.b}`) }), d.perf);
});
export function sponsorDealHTML() {
  const d = S.sponsorDeal;
  if (!d || S.season > d.until) return "";
  return `<p class="small good">${$t("ag.active", { v: $t(`ag.b.${d.b}`), s: d.until - S.season + 1 })}</p>`;
}

/* ---- Menajerden ek işler ---- */
const raiseOk = () => late.seasonAvg() >= 6.6 && S.contract > 0 && S.raiseSeason !== S.season;
export function agentExtrasHTML() {
  const camp = Math.max(60, Math.round((S.wage || 10) * 0.8));
  return `<div class="act"><div><h3>${$t("ag.raise")}</h3><p>${$t("ag.raiseD")}</p></div><button class="btn team sm" id="ag-raise" ${raiseOk() ? "" : "disabled"}>${S.raiseSeason === S.season ? $t("ag.raiseDone") : $t("ag.raiseBtn")}</button></div>
  <div class="act"><div><h3>${$t("ag.camp")}</h3><p>${$t("ag.campD", { v: fmt(camp) })}</p></div><button class="btn team sm" id="ag-camp" ${S.money >= camp && S.slot > 0 ? "" : "disabled"}>${$t("ag.campBtn")}</button></div>`;
}
export function bindAgentExtras() {
  const r = $("#ag-raise");
  if (r)
    r.onclick = () => {
      if (!raiseOk()) return;
      S.raiseSeason = S.season;
      const p = clamp(0.25 + (late.seasonAvg() - 6.5) * 0.35 + (S.rel.koc - 50) / 200, 0.1, 0.85);
      if (Math.random() < p) {
        const inc = rnd(1.08, 1.18);
        S.wage = Math.round(S.wage * inc);
        save();
        resultView($t("ag.raise"), $t("ag.raiseYes", { v: Math.round((inc - 1) * 100) }), [[$t("ag.raiseFx"), "p"]]);
      } else {
        S.rel.koc -= 4;
        norm();
        save();
        resultView($t("ag.raise"), $t("ag.raiseNo"), [[$t("places.83").replace("+4", "−4"), "n"]]);
      }
    };
  const c = $("#ag-camp");
  if (c)
    c.onclick = () => {
      const camp = Math.max(60, Math.round((S.wage || 10) * 0.8));
      if (S.money < camp || S.slot <= 0) return;
      useSlot();
      tx($t("ag.camp"), -camp);
      S.rel.taraf += 5;
      S.followers = Math.round(S.followers * 1.06);
      norm();
      save();
      resultView($t("ag.camp"), $t("ag.campRes"), [[$t("ag.campFx"), "p"]]);
    };
}

/* ---- Maç öncesi hazırlık (önemli maçlar) ---- */
const matchKey = () => `${S.season}-${S.week}-${S.phase}`;
export function prepHTML() {
  if (window.__SIM || !S || S.injury || !S.league) return "";
  const big = late.bigMatch && late.bigMatch();
  const done = S.prepKey === matchKey();
  return `<div class="card"><div class="eyebrow">${big ? $t("prep.title", { v: big.label }) : $t("m2.prepWeek")}</div><p class="small">${big ? $t("prep.intro") : $t("m2.prepIntro")}</p>${
    done
      ? `<p class="small good">${S.prepRes || ""}</p>`
      : `<div class="grid2">${big ? `<button class="btn sm" id="pr-press">${$t("prep.press")}</button>` : `<button class="btn sm" id="pr-shot">${$t("m2.shotS")}</button>`}<button class="btn sm" id="pr-video">${$t("prep.video")}</button><button class="btn sm" id="pr-focus">${$t("m2.focus")}</button></div>`
  }</div>`;
}
export function bindPrep(re) {
  const a = $("#pr-press"),
    b = $("#pr-video"),
    c = $("#pr-shot"),
    d = $("#pr-focus");
  if (a) a.onclick = () => pressGame(re);
  if (b) b.onclick = () => videoGame(re);
  if (c) c.onclick = () => shotSession();
  if (d) d.onclick = () => focusGame();
}
// Ekstra şut seansı: 4 şut; 3 ve üstü isabet → bu maçta şut +3
async function shotSession() {
  S.prepKey = matchKey();
  late.closeSheet();
  late.arenaFor(null);
  late.app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("m2.prepWeek")}</div><h2>${$t("m2.shotS")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await late.mgShoot($("#stg"), {
    eff: clamp(late.eff("sut") + 10, 5, 100),
    shots: 4,
    title: $t("m2.shotS"),
    dist: "mid",
    def: false
  });
  const ok = r.made >= 3;
  if (ok) S.boosts = [...(S.boosts || []).filter(x => x.id !== "prep"), { id: "prep", k: "sut", v: 3, g: 1 }];
  S.prepRes = ok ? $t("m2.shotOk", { v: r.made }) : $t("m2.shotNo", { v: r.made });
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><h2 class="${ok ? "good" : ""}">${S.prepRes}</h2><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = () => late.openLoc("stad", "mac");
}
// Odaklanma: nefes ritmi (zamanlama); başarılıysa moral +5, enerji +5
async function focusGame() {
  S.prepKey = matchKey();
  late.closeSheet();
  late.arenaFor(null);
  late.app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("m2.prepWeek")}</div><h2>${$t("m2.focus")}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await late.mgTiming($("#stg"), { eff: 60, title: $t("m2.focus"), tries: 2, label: $t("m2.breath"), kind: "free" });
  const ok = r.ok >= 1;
  if (ok) {
    S.moral += 5;
    S.energy += 5;
    norm();
  }
  S.prepRes = ok ? $t("m2.focusOk") : $t("m2.focusNo");
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><h2 class="${ok ? "good" : ""}">${S.prepRes}</h2><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = () => late.openLoc("stad", "mac");
}
// Basın toplantısı: 3 soru, her biri 6 saniye; tutarlı ve sakin cevaplar iyi not getirir
const Q = ["prep.q1", "prep.q2", "prep.q3", "prep.q4", "prep.q5"];
function pressGame(re) {
  const qs = shuffle(Q.slice()).slice(0, 3);
  let i = 0,
    score = 0,
    tm = null;
  const ask = () => {
    clearInterval(tm);
    if (i >= qs.length) return finish();
    const ans = shuffle([
      ["good", $t(`${qs[i]}a`)],
      ["mid", $t(`${qs[i]}b`)],
      ["bad", $t(`${qs[i]}c`)]
    ]);
    let left = 6;
    sheet(
      $t("prep.press"),
      $t("prep.qn", { n: i + 1 }),
      `<div class="say">${$t(qs[i])}</div><div class="bar"><i id="pq-t" style="width:100%"></i></div><div class="choices">${ans.map(([k, t]) => `<button class="choice" data-pa="${k}"><span class="ct">${t}</span></button>`).join("")}</div>`,
      { noClose: true }
    );
    tm = setInterval(() => {
      left -= 0.1;
      const el = $("#pq-t");
      if (el) el.style.width = `${Math.max(0, (left / 6) * 100)}%`;
      if (left <= 0) {
        i++;
        ask(); // süre doldu: cevapsız
      }
    }, 100);
    $$("[data-pa]").forEach(
      b =>
        (b.onclick = () => {
          score += { good: 2, mid: 1, bad: -1 }[b.dataset.pa];
          i++;
          ask();
        })
    );
  };
  const finish = () => {
    clearInterval(tm);
    S.prepKey = matchKey();
    let res;
    if (score >= 5) {
      S.buffs.motive = 1;
      S.rel.taraf += 3;
      res = $t("prep.pressA");
    } else if (score >= 2) {
      S.rel.taraf += 1;
      res = $t("prep.pressB");
    } else {
      S.moral -= 4;
      res = $t("prep.pressC");
    }
    S.prepRes = res;
    norm();
    save();
    resultView($t("prep.press"), res);
  };
  ask();
}
// Video analizi: rakibin 4-5 adımlık hücum dizisini izle, sonra sırayla tekrar et. Başarı: maçta savunma +4
const MOVES = ["←", "→", "↑", "↓"];
function videoGame(re) {
  const n = S.stage === "lise" ? 4 : 5,
    seq = Array.from({ length: n }, () => pick(MOVES));
  let shown = 0;
  sheet(
    $t("prep.video"),
    $t("prep.watch"),
    `<div class="big-num" id="vg" style="text-align:center;font-size:3rem;min-height:70px"></div><p class="small muted">${$t("prep.watchD")}</p>`,
    {
      noClose: true
    }
  );
  const iv = setInterval(() => {
    const el = $("#vg");
    if (!el) return clearInterval(iv);
    if (shown < seq.length) {
      el.textContent = seq[shown];
      shown++;
    } else {
      clearInterval(iv);
      input();
    }
  }, 750);
  const input = () => {
    const got = [];
    const draw = () => {
      sheet(
        $t("prep.video"),
        $t("prep.repeat", { a: got.length, b: seq.length }),
        `<div class="big-num" style="text-align:center;min-height:50px">${got.join(" ")}</div><div class="grid2">${MOVES.map(m => `<button class="btn" data-mv="${m}" style="font-size:1.6rem">${m}</button>`).join("")}</div>`,
        { noClose: true }
      );
      $$("[data-mv]").forEach(
        b =>
          (b.onclick = () => {
            got.push(b.dataset.mv);
            if (got[got.length - 1] !== seq[got.length - 1]) return done(false);
            if (got.length === seq.length) return done(true);
            draw();
          })
      );
    };
    draw();
  };
  const done = ok => {
    S.prepKey = matchKey();
    if (ok) S.buffs.scoutK = "sav";
    const res = ok ? $t("prep.videoA", { k: statName("sav") }) : $t("prep.videoB");
    S.prepRes = res;
    save();
    resultView($t("prep.video"), res);
  };
}

/* ---- Kulüp temsilcisi (sözleşme pazarlığında karşındaki kişi) ----
   Her kulübün kendine özgü bir sportif direktörü olur (kulüp anahtarından türetilir; aynı kulüp hep aynı kişi).
   Pazarlıktaki ilgiye göre ruh hali ve sözleri değişir. */
const REP_SKINS = ["#f1c9a5", "#e0ac7e", "#c68642", "#8d5524", "#f6d7b8"];
function hashOf(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
export function repOf(team) {
  const h = hashOf(String(team.key || team.name)),
    c = late.cOf(team.city);
  const first = c.first[h % c.first.length],
    last = c.last[(h >> 5) % c.last.length];
  return {
    n: `${first} ${last}`,
    look: {
      skin: REP_SKINS[h % REP_SKINS.length],
      hatStyle: "yok",
      hair: ["#111111", "#5a3a22", "#9e9e9e", "#2a1a10"][(h >> 3) % 4]
    },
    glasses: h % 3 === 0,
    mustache: h % 4 === 1
  };
}
export function repHTML(team, interest) {
  const r = repOf(team),
    line = interest > 0.7 ? "rep.hi" : interest > 0.5 ? "rep.mid" : interest > 0.38 ? "rep.lo" : "rep.edge";
  return `<div class="who" id="repbox"><div id="rep"></div><div style="min-width:0"><div class="eyebrow">${$t("rep.title")}</div><b>${esc(r.n)}</b><div class="say">${$t(line, { t: esc(team.name) })}</div></div></div>`;
}
export function mountRep(team, interest) {
  const el = $("#rep");
  if (!el) return;
  const r = repOf(team);
  el.innerHTML = "";
  el.appendChild(
    late.portrait(
      r.look,
      {
        adult: true,
        tie: true,
        jersey: "#1d2433",
        trim: team.c1,
        glasses: r.glasses,
        mustache: r.mustache,
        mood: interest > 0.6 ? "mutlu" : interest < 0.4 ? "kizgin" : "saskin"
      },
      64,
      64,
      team.c1
    )
  );
}
