/* ================= BAĞLAR: RAKİP, HAFIZA, AİLE, KOÇ, SENARYO VE ZORLUK =================
   1 Uzun süreli rakip: sezon sezon düello sayacı, derbi öncesi basın atışması, transfer döneminde (düşük olasılık)
     rakibin takımına gelmesi, rakibin emekliliği (veda paneli) ve senin emekliliğinde rakibin veda mesajı.
   2 Takım arkadaşı hafızası: takım değiştirince eski takımdaki önemli kişiler (kavgada tarafını tuttuğun,
     mentee, kaptanlıkta sağ kolun) S.memories'e yazılır; o takımla karşılaşınca akışta atıf + küçük moral, bazen panel.
   3 Ailenin büyümesi: kardeşin yolunu seçer (2-3. sezon), sonraki sezonlarda kısa haberler; ebeveynler yaşlanır
     (oyuncu 30+ yaşında, en erken 4. sezonda: ziyaret ya da hafif sağlık olayı, aile ilişkisine bağlı).
   4 Koç değişimi: profesyonel ligde sezon ortasında alt sıralardaysan kulüp koçu kovar; yeni koçun farklı oyun sistemi
     (src/coach.js teamSystem/systemFit). "Uyum sağla" (antrenmanla uyum, kısa süreli rol riski) / "Transfer iste".
   5 Senaryolar (src/scenarios.js): sakatlıktan dönüş, yabancı lig, memleket kulübü için takım seçimi ve hedef kararı.
   6 Ayrıntılı zorluk (oluşturma ekranı "Özel"): sakatlık, para, maç zorluğu. Varsayılan (kapalı) davranışı değiştirmez.
   Denge simülasyonunda (window.__SIM) panel açılmaz ve maç gücüne dokunan etkiler çalışmaz. */
import { t as $t } from "./i18n/index.js";
import { $$, Bus, cOf, esc, fmt, isPro, pick, ri, PRIO } from "./data.js";
import { S, fixture, fullName, news, norm, resultView, sheet, standings, tx, weekNo } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const SIM = () => !!window.__SIM;
const wi = () => weekNo(20);
const sg = v => (v > 0 ? `+${v}` : `${v}`);
const BD = () => {
  const b = (S.bonds = S.bonds || {});
  b.duel = b.duel || {};
  b.coaches = b.coaches || [];
  return b;
};
const mems = () => (S.memories = S.memories || []);
const shortN = n => {
  const p = String(n || "").split(" ");
  return p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(" ")}` : String(n || "");
};
const F = (k, v) => [$t(`bd.fx.${k}`, { v: sg(v) }), v >= 0 ? "p" : "n"];
// seçim paneli: seçenek → [sonuç metni, etkiler]; sonuç aynı panelde (resultView, #rb)
function ask(title, sub, body, opts, onPick) {
  sheet(
    title,
    sub,
    `<p>${body}</p><div class="choices">${opts
      .map(
        ([k, t, d]) =>
          `<button class="choice" data-bd="${k}"><span class="ct">${t}</span>${d ? `<span class="cd">${d}</span>` : ""}</button>`
      )
      .join("")}</div>`,
    { noClose: true }
  );
  $$("[data-bd]").forEach(
    b =>
      (b.onclick = () => {
        const [txt, fx] = onPick(b.dataset.bd);
        norm();
        save();
        resultView(title, txt, fx);
      })
  );
}
const storyOn = () => !late.unlocked || late.unlocked("hikaye");

/* ================= 1 UZUN SÜRELİ RAKİP ================= */
const R_ = () => (S && S.rival && !S.rival.retired ? S.rival : null);
const rvName = () => (late.rivalName ? late.rivalName() : "");
export const bondsRivalMate = () => {
  const R = R_();
  return !!(R && S.team && R.team && R.team.key === S.team.key);
};
Bus.on("match:end", e => {
  const R = R_(),
    M = late.M;
  if (!R || !M || !M.opp || !R.team || M.opp.key !== R.team.key) return;
  const b = BD(),
    d = (b.duel[S.season] = b.duel[S.season] || [0, 0]);
  d[0]++;
  if (e && e.win) d[1]++;
  // basın atışmasının bedeli ya da ödülü
  const sp = b.spat;
  if (sp && wi() - sp.wi <= 1 && !SIM()) {
    b.spat = null;
    if (e && e.win) {
      S.moral += 4;
      S.followers = Math.round(S.followers * 1.02);
      news($t("bd.sp.winNews", { v: fullName(), r: rvName() }));
    } else {
      S.moral -= 4;
      news($t("bd.sp.loseNews", { v: fullName(), r: rvName() }));
    }
  }
});
export function bondsSpatSheet() {
  const R = R_();
  if (!R || SIM() || !S.team || !isPro(S.stage) || S.phase !== "regular" || bondsRivalMate() || !storyOn()) return false;
  const fx = fixture();
  if (!fx || !R.team || fx.opp !== R.team.key) return false;
  const b = BD();
  if (b.spatS === S.season || Math.random() > 0.6) return false;
  b.spatS = S.season;
  const r = esc(rvName());
  ask(
    $t("bd.sp.t"),
    $t("bd.sp.s", { j: esc(S.npc.journalist || "") }),
    $t(`bd.sp.q${ri(1, 3)}`, { r }),
    [
      ["calm", $t("bd.sp.calm"), $t("bd.sp.calmD")],
      ["joke", $t("bd.sp.joke"), $t("bd.sp.jokeD")],
      ["back", $t("bd.sp.back"), $t("bd.sp.backD")]
    ],
    k => {
      if (k === "calm") {
        S.rel.koc += 2;
        return [$t("bd.sp.calmR", { r }), [F("koc", 2)]];
      }
      if (k === "joke") {
        S.rel.taraf += 3;
        if (late.mediaGain) late.mediaGain(0.01, 4);
        return [$t("bd.sp.jokeR", { r }), [F("fans", 3)]];
      }
      b.spat = { wi: wi() };
      if (late.mediaGain) late.mediaGain(0.015, 6);
      news($t("bd.sp.news", { v: fullName(), r: rvName() }));
      return [$t("bd.sp.backR", { r }), [[$t("bd.fx.stakes"), "t"]]];
    }
  );
  return true;
}
Bus.offer("week:sheet", bondsSpatSheet, PRIO.bondsSpat);

Bus.on("week:start", () => {
  if (!S || !S.team || SIM() || S.week !== 1) return;
  const b = BD(),
    R = R_();
  if (!R || b.rvChk === S.season) return;
  b.rvChk = S.season;
  // rakibin emekliliği (seninle aynı yaşta)
  const pr = S.age >= 36 ? 1 : S.age === 35 ? 0.5 : S.age === 34 ? 0.25 : 0;
  if (pr && Math.random() < pr) {
    R.retired = S.season;
    R.team = { ...R.team, key: `retired|${R.team.key}` };
    b.bye = 1;
    news($t("bd.rv.retNews", { r: rvName() }));
    return;
  }
  // transfer dönemi: rakip senin takımına gelir (düşük olasılık; mevcut "rivalmate" hikâyesiyle tek sefer)
  S.arcs = S.arcs || {};
  if (
    isPro(S.stage) &&
    R.stage === S.stage &&
    R.team.key !== S.team.key &&
    !S.arcs.rivalmate &&
    !b.mate &&
    S.age >= 22 &&
    S.age <= 31 &&
    Math.random() < 0.07
  ) {
    R.team = { key: S.team.key, name: S.team.name, city: S.team.city, cc: S.team.cc || "TR", c1: S.team.c1, c2: S.team.c2 };
    S.arcs.rivalmate = { season: S.season, step: 2, next: 0, choice: "bonds" };
    b.mate = { s: S.season, show: 1 };
    news($t("bd.rm.news", { r: rvName(), t: S.team.name }));
  }
});
/** testler ve hikâye: rakibi takıma getir */
export function bondsRivalJoin() {
  const R = R_();
  if (!R || !S.team) return false;
  R.team = { key: S.team.key, name: S.team.name, city: S.team.city, cc: S.team.cc || "TR", c1: S.team.c1, c2: S.team.c2 };
  BD().mate = { s: S.season, show: 1 };
  return true;
}
export function bondsMateSheet() {
  const b = BD();
  if (!b.mate || !b.mate.show || SIM()) return false;
  b.mate.show = 0;
  if (!bondsRivalMate()) return false;
  const r = esc(rvName());
  ask(
    $t("bd.rm.t"),
    $t("bd.rm.s", { t: esc(S.team.name) }),
    $t("bd.rm.b", { r }),
    [
      ["welcome", $t("bd.rm.welcome"), $t("bd.rm.welcomeD")],
      ["compete", $t("bd.rm.compete"), $t("bd.rm.competeD")]
    ],
    k => {
      b.mate.choice = k;
      if (k === "welcome") {
        S.rel.takim += 4;
        if (late.chemAdd) late.chemAdd(3);
        return [$t("bd.rm.welcomeR", { r }), [F("team", 4)]];
      }
      S.buffs.train = (S.buffs.train || 0) + 3;
      S.rel.takim -= 2;
      return [$t("bd.rm.competeR", { r }), [[$t("bd.fx.train"), "p"], F("team", -2)]];
    }
  );
  return true;
}
Bus.offer("week:sheet", bondsMateSheet, PRIO.bondsMate);
export function bondsByeSheet() {
  const b = BD();
  if (b.bye !== 1 || !S.rival) return false;
  b.bye = 2;
  if (SIM()) return false;
  const h = S.h2h || { g: 0, w: 0 },
    r = esc(rvName());
  ask(
    $t("bd.rv.t"),
    $t("bd.rv.s", { r }),
    `${$t("bd.rv.b", { r, g: h.g, w: h.w, l: h.g - h.w })}${b.mate ? ` ${$t("bd.rv.mate")}` : ""}`,
    [
      ["msg", $t("bd.rv.msg"), $t("bd.rv.msgD")],
      ["visit", $t("bd.rv.visit"), $t("bd.rv.visitD")]
    ],
    k => {
      if (k === "msg") {
        S.moral += 3;
        return [$t("bd.rv.msgR", { r }), [F("moral", 3)]];
      }
      S.energy -= 8;
      S.moral += 5;
      S.rel.taraf += 2;
      if (late.mediaGain) late.mediaGain(0.01, 5);
      news($t("bd.rv.visitNews", { v: fullName(), r: rvName() }));
      return [$t("bd.rv.visitR", { r }), [F("moral", 5), F("en", -8)]];
    }
  );
  return true;
}
Bus.offer("week:sheet", bondsByeSheet, PRIO.bondsBye);
// senin emekliliğin: rakibin veda mesajı (haber + emeklilik ekranında kart)
const myByeLine = () => {
  const h = S.h2h || { g: 0, w: 0 };
  return $t(h.g && h.w * 2 >= h.g ? "bd.rv.myUp" : "bd.rv.myDown", { g: h.g, w: h.w });
};
Bus.on("career:retire", () => {
  if (!S || !S.rival || SIM()) return;
  news($t("bd.rv.myNews", { r: rvName(), v: fullName() }));
});
export function bondsRetireHTML() {
  if (!S || !S.rival) return "";
  return `<div class="card"><div class="eyebrow">${$t("bd.rv.myT", { r: esc(rvName()) })}</div><div class="say">"${myByeLine()}${BD().mate ? ` ${$t("bd.rv.myMate")}` : ""}"</div></div>`;
}

/* ================= 2 TAKIM ARKADAŞI HAFIZASI ================= */
function snapNow() {
  const key = S.team.key,
    T = S.tales || {},
    r = (S.rosters && S.rosters[key]) || [];
  const best = r.length ? r.slice().sort((a, b) => b.chem - a.chem)[0].n : null;
  return {
    key,
    name: S.team.name,
    pro: isPro(S.stage),
    mentee: S.mentee && S.mentee.team === S.team.name ? S.mentee.n : null,
    side: T.feudSide && T.feudSide.team === key ? T.feudSide.n : null,
    cap: S.captain === key ? best : null
  };
}
/** takım değişince eski takımın önemli kişilerini hafızaya yaz (week:start; testler doğrudan çağırabilir) */
export function bondsRemember(old) {
  if (!old || !old.pro) return 0;
  let n = 0;
  for (const [kind, who] of [
    ["mentee", old.mentee],
    ["feud", old.side],
    ["captain", old.cap]
  ]) {
    if (!who || mems().some(m => m.n === who && m.key === old.key)) continue;
    mems().push({ n: who, kind, key: old.key, team: old.name, s: S.season });
    n++;
  }
  S.memories = mems().slice(-8);
  return n;
}
Bus.on("week:start", () => {
  if (!S || !S.team) return;
  const b = BD();
  if (b.snap && b.snap.key !== S.team.key) bondsRemember(b.snap);
  b.snap = snapNow();
});
/** maç başında (src/matchday.js): eski takım arkadaşın karşında, rakip artık takım arkadaşın */
export function bondsMatchStart(opp, foes) {
  const M = late.M;
  if (!S || !M || !opp) return;
  const m = mems().find(x => x.key === opp.key);
  if (m) {
    if (foes && foes.length > 2) foes[2] = shortN(m.n);
    if (late.addFeed) late.addFeed(`<b class="gold">${$t(`bd.mem.f.${m.kind}`, { n: esc(m.n), t: esc(m.team) })}</b>`);
    m.met = (m.met || 0) + 1;
    if (!SIM()) {
      M.mmod = (M.mmod || 0) + 1;
      S.moral = Math.min(100, S.moral + 1);
    }
  }
  const b = S.bonds;
  if (b && b.mate && bondsRivalMate() && b.mate.feed !== S.season && late.addFeed) {
    b.mate.feed = S.season;
    late.addFeed($t("bd.rm.feed", { r: esc(rvName()) }));
  }
}
export function bondsMemSheet() {
  if (SIM() || !S.team || !isPro(S.stage) || S.phase !== "regular" || !storyOn()) return false;
  const fx = fixture();
  if (!fx) return false;
  const m = mems().find(x => x.key === fx.opp && x.told !== S.season);
  if (!m || Math.random() > 0.5) return false;
  m.told = S.season;
  const n = esc(m.n),
    t = esc(m.team);
  ask(
    $t("bd.mem.t"),
    t,
    $t(`bd.mem.s.${m.kind}`, { n, t }),
    [
      ["msg", $t("bd.mem.msg"), $t("bd.mem.msgD")],
      ["focus", $t("bd.mem.focus"), $t("bd.mem.focusD")]
    ],
    k => {
      if (k === "msg") {
        S.moral += 3;
        return [$t(`bd.mem.r.${m.kind}`, { n }), [F("moral", 3)]];
      }
      S.energy += 4;
      return [$t("bd.mem.focusR", { n }), [F("en", 4)]];
    }
  );
  return true;
}
Bus.offer("week:sheet", bondsMemSheet, PRIO.bondsMemory);

/* ================= 3 AİLENİN BÜYÜMESİ ================= */
const SIB_PATHS = ["school", "sport", "music"],
  SPORTS = ["volley", "football", "swim"];
function sib() {
  const b = BD();
  if (!b.sib) {
    const g = Math.random() < 0.5 ? "m" : "f",
      c = cOf(S.home || "İstanbul"),
      pool = (g === "f" ? c.fem : c.first) || ["Deniz"];
    b.sib = { n: pick(pool.filter(n => n !== S.first)) || "Deniz", g, gap: ri(3, 5) };
  }
  return b.sib;
}
function sibChoose(k) {
  const s = sib(),
    follow = k !== "free" && Math.random() < 0.45 + S.rel.aile / 150;
  s.path = follow ? k : pick(SIB_PATHS.filter(p => p !== k));
  s.ps = S.season;
  if (s.path === "sport") s.sp = pick(SPORTS);
  return follow;
}
export function bondsSibSheet() {
  if (!S || !S.team || S.season < 2 || S.season > 3 || S.week < 3) return false;
  const s = sib();
  if (s.path || (Math.random() > 0.4 && !(S.season === 3 && S.week >= 6))) return false;
  if (SIM()) return (sibChoose(pick(SIB_PATHS)), false);
  const n = esc(s.n);
  ask(
    $t("bd.sib.t"),
    $t(`bd.sib.s.${s.g}`, { n }),
    $t("bd.sib.b", { n, a: Math.max(12, S.age - s.gap) }),
    [["free", $t("bd.sib.free"), $t("bd.sib.freeD")], ...SIB_PATHS.map(p => [p, $t(`bd.sib.p.${p}`), $t(`bd.sib.p.${p}D`)])],
    k => {
      const follow = sibChoose(k),
        add = k === "free" ? 3 : follow ? 4 : 1;
      S.rel.aile += add;
      const res = $t(`bd.sib.r.${s.path}`, { n, sp: s.sp ? $t(`bd.sport.${s.sp}`) : "" });
      return [
        `${k === "free" ? $t("bd.sib.freeR", { n }) : follow ? $t("bd.sib.follow", { n }) : $t("bd.sib.own", { n })} ${res}`,
        [F("fam", add)]
      ];
    }
  );
  return true;
}
Bus.offer("week:sheet", bondsSibSheet, PRIO.bondsSibling);
Bus.on("week:start", () => {
  if (!S || SIM() || S.week !== 2) return;
  const s = S.bonds && S.bonds.sib;
  if (!s || !s.path || S.season <= s.ps || s.nS === S.season) return;
  const yrs = S.season - s.ps;
  if (yrs > 8 || (yrs > 4 && yrs % 2)) return;
  s.nS = S.season;
  news($t(`bd.sib.n.${s.path}.${Math.min(4, yrs)}`, { n: s.n, v: fullName(), sp: s.sp ? $t(`bd.sport.${s.sp}`) : "" }));
});
// ebeveynler yaşlanır: ilk sezonlarda ağır olay yok (en erken 4. sezon, oyuncu 30+)
export function bondsParentSheet() {
  if (!S || !S.team || S.age < 30 || S.season < 4 || S.week < 4 || S.week > 12) return false;
  const b = BD();
  if (b.parS === S.season || S.season - (b.parLast || -9) < 2 || Math.random() > 0.3) return false;
  b.parS = S.season;
  b.parLast = S.season;
  const health = S.age >= 32 && Math.random() < 0.5,
    hi = S.rel.aile >= 60,
    who = Math.random() < 0.5 ? "mom" : "dad",
    p = esc(S.npc[who] || "");
  b.par = b.par || { v: 0, h: 0 };
  b.par[health ? "h" : "v"]++;
  if (SIM()) return false;
  if (!health) {
    ask(
      $t("bd.par.vt"),
      $t(`bd.par.vs.${hi ? "hi" : "lo"}`),
      $t(`bd.par.vb.${hi ? "hi" : "lo"}`, { m: esc(S.npc.mom || ""), d: esc(S.npc.dad || "") }),
      [
        ["host", $t("bd.par.host"), $t("bd.par.hostD")],
        ["match", $t("bd.par.match"), $t("bd.par.matchD")],
        ["busy", $t("bd.par.busy"), $t("bd.par.busyD")]
      ],
      k => {
        if (k === "host") {
          S.energy -= 6;
          S.rel.aile += 5;
          S.moral += 4;
          return [$t("bd.par.hostR"), [F("fam", 5), F("moral", 4), F("en", -6)]];
        }
        if (k === "match") {
          S.rel.aile += 3;
          S.moral += 2;
          return [$t("bd.par.matchR"), [F("fam", 3), F("moral", 2)]];
        }
        S.rel.aile -= 4;
        return [$t("bd.par.busyR"), [F("fam", -4)]];
      }
    );
    return true;
  }
  const cost = Math.max(20, Math.round((S.wage || 100) * 0.5));
  ask(
    $t("bd.par.ht"),
    $t(`bd.par.hs.${who}`, { p }),
    `${$t(`bd.par.hb.${who}`, { p })} ${$t(`bd.par.h.${hi ? "hi" : "lo"}`)}`,
    [
      ["call", $t("bd.par.call"), $t("bd.par.callD")],
      ["go", $t("bd.par.go"), $t("bd.par.goD")],
      ["pay", $t("bd.par.pay"), fmt(cost)]
    ],
    k => {
      if (k === "call") {
        S.rel.aile += 3;
        return [$t("bd.par.callR", { p }), [F("fam", 3)]];
      }
      if (k === "go") {
        S.energy -= 12;
        S.rel.aile += 6;
        return [$t("bd.par.goR", { p }), [F("fam", 6), F("en", -12)]];
      }
      if (S.money < cost) {
        S.rel.aile += 2;
        return [$t("bd.par.noMoney", { p }), [F("fam", 2)]];
      }
      tx($t("bd.par.payTx"), -cost);
      S.rel.aile += 4;
      return [$t("bd.par.payR", { p }), [F("fam", 4)]];
    }
  );
  return true;
}
Bus.offer("week:sheet", bondsParentSheet, PRIO.bondsParent);

/* ================= 4 KOÇ DEĞİŞİMİ ================= */
/** Koç kovulur, yeni koç farklı bir oyun sistemiyle gelir */
export function bondsCoachFire() {
  if (!S || !S.team || !late.SYSTEMS) return false;
  const old = S.npc.coach,
    c = cOf(S.team.city);
  let n = old,
    tries = 0;
  while (n === old && tries++ < 20) n = `${pick(c.first)} ${pick(c.last)}`;
  const prev = late.teamSystem(S.team),
    sys = pick(Object.keys(late.SYSTEMS).filter(k => k !== prev)),
    f0 = late.systemFit();
  S.coachSys = { key: S.team.key, sys, adapt: 0, s: S.season, f0, prev };
  S.npc.coach = n;
  S.rel.koc = 45;
  const b = BD();
  b.coaches = [...b.coaches, { o: old, n, t: S.team.name, s: S.season, sys }].slice(-6);
  b.coachShow = 1;
  news($t("bd.co.news", { t: S.team.name, o: old, n }));
  return true;
}
Bus.on("week:start", () => {
  if (!S || SIM() || !S.team) return;
  const cs = S.coachSys;
  // kısa süreli rol kaybı biter
  if (cs && cs.demoted && cs.key === S.team.key && wi() >= cs.demoted.until) {
    if (S.role === cs.demoted.to) {
      Bus.emit("role:change", { from: S.role, to: cs.demoted.from });
      S.role = cs.demoted.from;
      news($t("bd.co.back", { v: fullName(), c: S.npc.coach }));
    }
    cs.demoted = null;
  }
  if (!isPro(S.stage) || S.phase !== "regular" || !late.midWeek || S.week !== late.midWeek() + 1) return;
  const b = BD();
  if (b.fireS === S.season) return;
  b.fireS = S.season;
  const st = standings(),
    rank = st.findIndex(r => r.key === S.team.key) + 1;
  if (rank < Math.ceil(st.length * 0.7) || Math.random() > 0.6) return;
  bondsCoachFire();
});
export function bondsCoachSheet() {
  const b = BD(),
    cs = S.coachSys;
  if (!b.coachShow || SIM()) return false;
  b.coachShow = 0;
  if (!cs || !S.team || cs.key !== S.team.key) return false;
  const f1 = late.systemFit(),
    last = b.coaches[b.coaches.length - 1] || {},
    sysN = late.SYSTEMS[cs.sys].n;
  ask(
    $t("bd.co.t"),
    $t("bd.co.s", { n: esc(S.npc.coach) }),
    `${$t("bd.co.b", { o: esc(last.o || ""), n: esc(S.npc.coach), sys: esc(sysN) })}<br><span class="small muted">${$t("bd.co.fit", { a: late.fitLabel(cs.f0), b: late.fitLabel(f1) })}</span>`,
    [
      ["adapt", $t("bd.co.adapt"), $t("bd.co.adaptD")],
      ["move", $t("bd.co.move"), $t("bd.co.moveD")]
    ],
    k => {
      cs.mode = k;
      if (k === "move") {
        S.rel.koc -= 6;
        S.moral -= 2;
        S.buffs.offer = 1; // menajer sezon sonunda daha iyi teklif arar
        news($t("bd.co.moveNews", { v: fullName(), t: S.team.name }));
        return [$t("bd.co.moveR"), [F("koc", -6), [$t("bd.fx.agent"), "p"]]];
      }
      const order = ["bench", "rot", "star"],
        i = order.indexOf(S.role);
      if (f1 < 1 && i > 0 && Math.random() < 0.5) {
        const to = order[i - 1];
        cs.demoted = { from: S.role, to, until: wi() + 3 };
        Bus.emit("role:change", { from: S.role, to });
        S.role = to;
        S.moral -= 3;
        return [
          $t("bd.co.adaptRisk", { c: esc(S.npc.coach), r: $t(`bd.role.${to}`) }),
          [[$t("bd.fx.adapt"), "p"], F("moral", -3)]
        ];
      }
      S.rel.koc += 3;
      return [$t("bd.co.adaptR", { c: esc(S.npc.coach) }), [[$t("bd.fx.adapt"), "p"], F("koc", 3)]];
    }
  );
  return true;
}
Bus.offer("week:sheet", () => !(window.__TEST && window.__TEST.quietSheets) && bondsCoachSheet(), PRIO.bondsCoach);
// "Uyum sağla": her antrenman yeni sisteme uyumu artırır (systemFit'e en fazla +4)
Bus.on("train:done", () => {
  const cs = S && S.coachSys;
  if (cs && S.team && cs.key === S.team.key && cs.mode === "adapt") cs.adapt = Math.min(4, (cs.adapt || 0) + 0.5);
});
/** src/coach.js: yeni koçun sistemi (takım için) ve uyum bonusu */
export const bondsCoachSys = team => {
  const cs = S && S.coachSys;
  return cs && team && cs.key === team.key && late.SYSTEMS && late.SYSTEMS[cs.sys] ? cs.sys : null;
};
export const bondsCoachAdapt = team => {
  const cs = S && S.coachSys;
  return cs && team && cs.key === team.key ? Math.floor(cs.adapt || 0) : 0;
};

/* ================= 5 SENARYOLAR (src/scenarios.js) ================= */
const CUPS = ["champ", "cup", "super", "el", "ec"],
  ABROAD_CC = ["ES", "IT", "FR", "DE", "GR", "LT", "RS"];
/** senaryo takımı: yabancı ligde tek Türk, memleket kulübü */
export function bdScnTeam(id) {
  if (id === "abroad") {
    const pool = late.leaguePool("t1", pick(ABROAD_CC));
    return pick(pool.slice(Math.floor(pool.length / 3))); // ilk üç güçlü değil: orta/alt sıra kulüp
  }
  if (id === "hometown") return pick(late.leaguePool("t2", "TR").filter(t => t.city !== "İstanbul"));
  return null;
}
export function bdScnSetup(id, t) {
  const s = S.scn;
  if (id === "comeback") {
    s.cap = wi() + 8; // ilk 8 hafta kısıtlı dakika (yedek)
    S.reinj = { p: 0.15, until: wi() + 12 };
    S.rel.koc = Math.max(S.rel.koc, 50);
  }
  if (id === "abroad") {
    s.cc = t.cc;
    s.ev = 0;
    S.housing = "daire";
  }
  if (id === "hometown") {
    S.home = t.city;
    S.rel.aile += 10;
    S.rel.taraf += 10;
    S.housing = "daire";
  }
}
/** hafta başı karar: 1 başarı, -1 başarısız, 0 karar yok (scenarios.js genel kuralları sürer) */
export function bdScnEval(s) {
  if (s.id === "comeback") {
    if (s.cap && wi() >= s.cap) {
      s.cap = 0;
      if (S.role === "bench" && S.team.key === s.team) {
        S.role = "rot";
        news($t("bd.sc.cleared", { v: fullName() }));
      }
    }
    // ilk beş: dönüş yaptığın kulüpte ya da daha üst seviyede (alt sıradaki bir kulübe "yıldız" olarak kaçmak sayılmaz)
    return S.role === "star" && (S.team.key === s.team || ["euro", "nba"].includes(S.stage)) ? 1 : 0;
  }
  if (s.id === "abroad") return S.team.key !== s.team && !s.hit ? -1 : 0;
  if (s.id === "hometown") {
    const tr = (S.career.trophies || []).slice(s.tr0 || 0);
    // kupa ya da lig şampiyonluğu (2. ligde şampiyonluk = memleket kulübünün üst lige çıkışı)
    if (s.hit || (S.team.key === s.team && tr.some(x => CUPS.includes(x.type)))) return 1;
    return S.team.key !== s.team ? -1 : 0;
  }
  return 0;
}
export function bdScnSeasonEnd(s, { champ } = {}) {
  if (s.id === "abroad" && S.team.key === s.team && S.role !== "bench") s.hit = 1;
  if (s.id === "hometown" && champ && S.team.key === s.team) s.hit = 1;
}
// yabancı ligde uyum mini olayları (ilk sezon): dil, yemek, memleket özlemi
const ABROAD_EV = ["lang", "food", "home"],
  ABROAD_WK = [2, 5, 9];
export function bondsAbroadSheet() {
  const s = S && S.scn;
  if (!s || s.id !== "abroad" || s.done || SIM() || S.season !== s.until - 1 || !S.team) return false;
  const i = s.ev || 0;
  if (i >= 3 || S.week < ABROAD_WK[i]) return false;
  s.ev = i + 1;
  const e = ABROAD_EV[i],
    city = esc(S.team.city);
  ask(
    $t(`bd.ab.${e}.t`),
    city,
    $t(`bd.ab.${e}.b`, { c: city }),
    [
      ["a", $t(`bd.ab.${e}.a`), $t(`bd.ab.${e}.aD`)],
      ["b", $t(`bd.ab.${e}.b2`), $t(`bd.ab.${e}.bD`)]
    ],
    k => {
      const fx = [];
      if (e === "lang") {
        if (k === "a") {
          const c = Math.max(10, Math.round((S.wage || 100) * 0.3));
          if (S.money >= c) tx($t("bd.ab.lang.tx"), -c);
          S.rel.koc += 4;
          fx.push(F("koc", 4));
        } else {
          S.rel.takim += 3;
          if (late.chemAdd) late.chemAdd(2);
          fx.push(F("team", 3));
        }
      } else if (e === "food") {
        if (k === "a") {
          S.rel.takim += 3;
          S.moral += 1;
          fx.push(F("team", 3), F("moral", 1));
        } else {
          S.moral += 4;
          fx.push(F("moral", 4));
        }
      } else if (k === "a") {
        S.rel.aile += 4;
        S.moral += 3;
        fx.push(F("fam", 4), F("moral", 3));
      } else {
        S.rel.takim += 4;
        S.energy -= 5;
        fx.push(F("team", 4), F("en", -5));
      }
      return [$t(`bd.ab.${e}.r${k}`, { c: city }), fx];
    }
  );
  return true;
}
Bus.offer("week:sheet", bondsAbroadSheet, PRIO.bondsAbroad);

/* ================= 6 AYRINTILI ZORLUK ================= */
export const DIFF_OPTS = { inj: ["az", "normal", "cok"], money: ["bol", "normal", "kit"], match: ["kolay", "normal", "zor"] };
const DIFF_VAL = {
  inj: { az: 0.6, normal: 1, cok: 1.5 },
  money: { bol: 1.35, normal: 1, kit: 0.7 },
  match: { kolay: 0.035, normal: 0, zor: -0.035 }
};
const dget = (k, d) => {
  const v = S && S.diff && S.diff[k];
  return v && DIFF_VAL[k][v] != null ? DIFF_VAL[k][v] : d;
};
/** sakatlık riski çarpanı (src/modes.js modeInjuryMul) */
export const diffInjMul = () => dget("inj", 1);
/** maaş çarpanı (src/modes.js modeWageMul) */
export const diffMoneyMul = () => dget("money", 1);
/** takım gücüne eklenen değer (src/engine.js ourStr) */
export const diffStrMod = () => dget("match", 0);
export function diffPickerHTML(f) {
  const d = f.diff;
  return `<div id="dfx"><div class="row between nowrap"><div class="eyebrow">${$t("bd.df.title")}</div><div class="opts"><button class="opt ${d ? "" : "on"}" data-v="off">${$t("bd.df.std")}</button><button class="opt ${d ? "on" : ""}" data-v="on">${$t("bd.df.custom")}</button></div></div>${
    d
      ? Object.keys(DIFF_OPTS)
          .map(
            k =>
              `<div class="small" style="margin:6px 0 4px"><b>${$t(`bd.df.${k}`)}</b></div><div class="opts">${DIFF_OPTS[k].map(v => `<button class="opt ${d[k] === v ? "on" : ""}" data-v="${k}:${v}">${$t(`bd.df.${k}.${v}`)}</button>`).join("")}</div>`
          )
          .join("")
      : ""
  }<p class="small muted mt-1h">${$t(d ? "bd.df.onD" : "bd.df.offD")}</p></div>`;
}
export function diffSet(f, v) {
  if (v === "off") f.diff = null;
  else if (v === "on") f.diff = f.diff || { inj: "normal", money: "normal", match: "normal" };
  else if (f.diff) {
    const [k, x] = String(v).split(":");
    if (DIFF_OPTS[k] && DIFF_OPTS[k].includes(x)) f.diff[k] = x;
  }
}
/** startCareer içinden */
export function diffApply(f) {
  S.diff = f && f.diff ? { ...f.diff } : null;
}
const diffLine = () =>
  S && S.diff
    ? `<div class="small muted">${$t("bd.df.title")}: ${Object.keys(DIFF_OPTS)
        .map(k => `${$t(`bd.df.${k}`)} ${$t(`bd.df.${k}.${S.diff[k] || "normal"}`)}`)
        .join(" · ")}</div>`
    : "";

/* ================= EV → KARİYER KARTLARI ================= */
export function bondsCareerHTML() {
  if (!S) return "";
  const out = [];
  if (S.rival) {
    const R = S.rival,
      h = S.h2h || { g: 0, w: 0 },
      b = BD(),
      cur = b.duel[S.season] || [0, 0];
    const status = R.retired
      ? $t("bd.rc.retired", { s: R.retired })
      : bondsRivalMate()
        ? $t("bd.rc.mate")
        : $t("bd.rc.opp", { t: esc(R.team.name) });
    const seasons = Object.keys(b.duel)
      .map(Number)
      .sort((x, y) => y - x)
      .slice(0, 5);
    out.push(
      `<div class="card" id="bd-rival"><div class="row between"><div class="eyebrow">${$t("bd.rc.t", { r: esc(rvName()) })}</div><b class="small">${status}</b></div><div class="box"><div><b>${h.g}</b><span class="eyebrow">${$t("bd.rc.g")}</span></div><div><b class="good">${h.w}</b><span class="eyebrow">${$t("bd.rc.w")}</span></div><div><b class="bad">${h.g - h.w}</b><span class="eyebrow">${$t("bd.rc.l")}</span></div><div><b>${cur[1]}-${cur[0] - cur[1]}</b><span class="eyebrow">${$t("bd.rc.now")}</span></div></div>${
        seasons.length
          ? `<div class="row gap-1">${seasons.map(s => `<span class="pill ${b.duel[s][1] * 2 >= b.duel[s][0] ? "w" : "l"}">${$t("bd.rc.season", { n: s })} ${b.duel[s][1]}-${b.duel[s][0] - b.duel[s][1]}</span>`).join("")}</div>`
          : `<p class="small muted">${$t("bd.rc.none")}</p>`
      }</div>`
    );
  }
  const ms = mems();
  if (ms.length)
    out.push(
      `<div class="card"><div class="eyebrow">${$t("bd.mem.card")}</div>${ms
        .slice()
        .reverse()
        .map(
          m =>
            `<div class="row between nowrap small"><span><b>${esc(m.n)}</b> · ${esc(m.team)}</span><span class="muted">${$t(`bd.mem.k.${m.kind}`)}</span></div>`
        )
        .join("")}</div>`
    );
  const b = S.bonds || {},
    s = b.sib;
  if (s || (b.par && (b.par.v || b.par.h))) {
    const sl = s
      ? s.path
        ? $t(`bd.sib.card.${s.path}`, { n: esc(s.n), sp: s.sp ? $t(`bd.sport.${s.sp}`) : "" })
        : $t("bd.sib.card.none", { n: esc(s.n) })
      : "";
    const pl = b.par && (b.par.v || b.par.h) ? $t("bd.par.card", { v: b.par.v || 0, h: b.par.h || 0 }) : "";
    out.push(
      `<div class="card"><div class="eyebrow">${$t("bd.fam.card")}</div>${sl ? `<p class="small">${sl}</p>` : ""}${pl ? `<p class="small muted">${pl}</p>` : ""}</div>`
    );
  }
  if ((b.coaches || []).length)
    out.push(
      `<div class="card"><div class="eyebrow">${$t("bd.co.card")}</div>${b.coaches
        .slice()
        .reverse()
        .map(c => `<div class="small">${$t("bd.co.row", { s: c.s, t: esc(c.t), o: esc(c.o), n: esc(c.n) })}</div>`)
        .join("")}</div>`
    );
  const dl = diffLine();
  if (dl) out.push(`<div class="card">${dl}</div>`);
  return out.join("");
}
