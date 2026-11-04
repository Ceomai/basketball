/* ================= KİŞİLİK SAHİBİ KARAKTERLER =================
   Her takımda üç kalıcı takım arkadaşı (kadrodan seçilir, takıma dönünce aynı kişiler):
   - Yıldız (kıskanç): takımın en iyisi. İlişki kötüyse takım kimyası her hafta düşer, koçun güveni azalır.
   - Mentor (tecrübeli): ilişki iyiyse antrenman kazancı %10 artar.
   - En yakın dost: ilişki iyiyse her hafta +2 moral.
   Koçun kişiliği (takıma göre sabit) rol değerlendirmesini değiştirir:
   - Disiplinci: son maçlardaki nota daha sert bakar; basında iddialı konuşmayı sevmez.
   - Oyuncu dostu: başlangıç güveni yüksek, kötü seriye toleranslı.
   - Taktisyen: sistem uyumuna iki kat önem verir.
   Haftalık küçük bir ihtimalle bu karakterlerle iki seçenekli bir olay yaşanır (Kadro sekmesinde ilişkiler görünür). */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, esc, hash, pick } from "./data.js";
import { S, closeSheet, news, norm, sheet, tx } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

export const COACH_TYPES = ["disiplinci", "dost", "taktisyen"];
/** Koçun kişiliği (takıma göre sabit) */
export const coachType = (team = S && S.team) => (team ? COACH_TYPES[hash(`${team.key}|koc`) % 3] : "dost");

/** Takımın karakterleri (ilk ihtiyaçta kadrodan seçilir, kayıtta saklanır) */
export function chars() {
  if (!S || !S.team) return null;
  S.chars = S.chars || {};
  const key = S.team.key;
  if (S.chars[key]) return S.chars[key];
  const r = late.roster();
  if (!r || r.length < 3) return null;
  const star = r[0],
    mentor = r.filter(p => p !== star).reduce((a, b) => (b.age > a.age ? b : a)),
    friend = r
      .filter(p => p !== star && p !== mentor)
      .reduce((a, b) => (Math.abs(b.age - S.age) < Math.abs(a.age - S.age) ? b : a));
  S.chars[key] = {
    yildiz: { n: star.n, rel: 45 },
    mentor: { n: mentor.n, rel: 55 },
    dost: { n: friend.n, rel: 60 }
  };
  return S.chars[key];
}
const bump = (k, d) => {
  const c = chars();
  if (c && c[k]) c[k].rel = clamp(c[k].rel + d, 0, 100);
};
const relOf = k => {
  const c = chars();
  return c && c[k] ? c[k].rel : 50;
};

/* ---- Etkiler ---- */
/** Antrenman kazancı çarpanı (mentor) */
export const charTrainMul = () => (relOf("mentor") >= 60 ? 1.1 : 1);
/** Rol değerlendirmesinde koçun güvenine eklenecek değer ve koç kişiliği ağırlıkları */
export function trustMods() {
  const t = coachType();
  return {
    base: (t === "dost" ? 6 : 0) + (relOf("yildiz") <= 30 ? -4 : 0) + (relOf("mentor") >= 70 ? 2 : 0),
    recW: t === "disiplinci" ? 17 : t === "dost" ? 11 : 14,
    fitW: t === "taktisyen" ? 3 : 1.5
  };
}
Bus.on("week:start", () => {
  if (!S || !S.team || !chars()) return;
  if (relOf("dost") >= 60) S.moral += 2;
  if (relOf("yildiz") <= 30) S.rel.takim -= 1;
  norm();
});
// basın: disiplinci koç iddialı konuşmayı sevmez
Bus.on("press", d => {
  if (S && d && d.tone === "bold" && coachType() === "disiplinci") S.rel.koc -= 3;
});

/* ---- Olaylar ---- */
const EV = [
  {
    who: "yildiz",
    t: "ch.y1",
    c: [
      ["ch.y1a", () => (bump("yildiz", -8), (S.moral += 3), (S.rel.takim -= 2))],
      ["ch.y1b", () => (bump("yildiz", 6), (S.moral -= 3))]
    ]
  },
  {
    who: "yildiz",
    t: "ch.y2",
    c: [
      ["ch.y2a", () => (bump("yildiz", -4), (S.buffs.motive = 1))],
      ["ch.y2b", () => (bump("yildiz", 8), (S.followers = Math.round(S.followers * 0.98)))]
    ]
  },
  {
    who: "mentor",
    t: "ch.m1",
    c: [
      [
        "ch.m1a",
        () => {
          bump("mentor", 8);
          S.energy -= 12;
          const k = Object.keys(S.st).reduce((a, b) => (S.st[b] < S.st[a] ? b : a));
          late.gainStat(k, 0.6 * late.levelMul(k));
        }
      ],
      ["ch.m1b", () => bump("mentor", -5)]
    ]
  },
  {
    who: "mentor",
    t: "ch.m2",
    c: [
      ["ch.m2a", () => (bump("mentor", 6), (S.moral += 4))],
      ["ch.m2b", () => bump("mentor", -4)]
    ]
  },
  {
    who: "dost",
    t: "ch.d1",
    c: [
      ["ch.d1a", () => (bump("dost", 8), (S.moral += 8), (S.energy -= 6))],
      ["ch.d1b", () => (bump("dost", -6), (S.energy += 5))]
    ]
  },
  {
    who: "dost",
    t: "ch.d2",
    c: [
      ["ch.d2a", () => (bump("dost", 10), (S.moral += 2))],
      ["ch.d2b", () => bump("dost", -8)]
    ]
  },
  {
    who: "koc",
    type: "disiplinci",
    t: "ch.k1",
    c: [
      ["ch.k1a", () => (tx($t("ch.fine"), -Math.max(2, Math.round(S.wage * 0.3))), (S.rel.koc += 5))],
      ["ch.k1b", () => ((S.rel.koc -= 6), (S.moral += 2))]
    ]
  },
  {
    who: "koc",
    type: "dost",
    t: "ch.k2",
    c: [
      ["ch.k2a", () => ((S.moral += 6), (S.rel.koc += 4))],
      ["ch.k2b", () => (S.rel.koc += 1)]
    ]
  },
  {
    who: "koc",
    type: "taktisyen",
    t: "ch.k3",
    c: [
      ["ch.k3a", () => ((S.energy -= 5), (S.rel.koc += 5))],
      ["ch.k3b", () => (S.rel.koc -= 4)]
    ]
  }
];
const nameOf = who => (who === "koc" ? S.npc.coach : (chars() || {})[who] ? chars()[who].n : "");
function charEvent() {
  if (!S || !S.team || window.__SIM || S.injury || S.week < 3 || S.season === 1 || S.phase !== "regular") return false;
  if (S.charWeek === `${S.season}|${S.week}` || Math.random() > 0.12 || !chars()) return false;
  S.charWeek = `${S.season}|${S.week}`;
  const ct = coachType(),
    pool = EV.filter(e => !e.type || e.type === ct),
    e = pick(pool),
    n = nameOf(e.who);
  sheet(
    $t("ch.title"),
    roleLabel(e.who),
    `<div class="say">${$t(e.t, { n: esc(n) })}</div><div class="choices">${e.c.map(([k], i) => `<button class="choice" data-ce="${i}"><span class="ct" style="font-size:1rem;text-transform:none">${$t(k)}</span></button>`).join("")}</div>`,
    { noClose: true }
  );
  $$("[data-ce]").forEach(
    b =>
      (b.onclick = () => {
        e.c[+b.dataset.ce][1]();
        norm();
        save();
        closeSheet();
        Bus.emit("char", { who: e.who, choice: +b.dataset.ce });
      })
  );
  return true;
}
Bus.offer("week:sheet", charEvent, 35);

/* ---- Kadro sekmesindeki kart ---- */
const ROLE_KEYS = { yildiz: "ch.role.yildiz", mentor: "ch.role.mentor", dost: "ch.role.dost", koc: "ch.role.koc" };
const roleLabel = who => $t(ROLE_KEYS[who]);
const COACH_KEYS = {
  disiplinci: ["ch.coach.disiplinci", "ch.coach.disiplinciD"],
  dost: ["ch.coach.dost", "ch.coach.dostD"],
  taktisyen: ["ch.coach.taktisyen", "ch.coach.taktisyenD"]
};
const EFFECT_KEYS = { yildiz: "ch.fx.yildiz", mentor: "ch.fx.mentor", dost: "ch.fx.dost" };
export function charactersHTML() {
  const c = chars();
  if (!c) return "";
  const ct = COACH_KEYS[coachType()];
  const row = k =>
    `<div style="padding:6px 0;border-top:1px solid var(--line)"><div class="row between nowrap"><b>${esc(c[k].n)}</b><span class="small muted">${roleLabel(k)}</span></div><div class="bar"><i style="width:${c[k].rel}%;background:${c[k].rel >= 60 ? "var(--good)" : c[k].rel <= 30 ? "var(--bad)" : "var(--gold)"}"></i></div><p class="small muted">${$t(EFFECT_KEYS[k])}</p></div>`;
  return `<div class="card"><div class="eyebrow">${$t("ch.cardTitle")}</div><div class="row between nowrap"><b>${$t("goal.byCoach", { v: esc(S.npc.coach) })}</b><span class="pill g">${$t(ct[0])}</span></div><p class="small muted">${$t(ct[1])}</p>${["yildiz", "mentor", "dost"].map(row).join("")}</div>`;
}
// takım değişince yeni karakterlerle tanışma haberi
Bus.on("week:start", () => {
  if (!S || !S.team || S.week !== 1) return;
  const c = chars();
  if (c && !c.met) {
    c.met = 1;
    news($t("ch.meet", { team: S.team.name, a: c.yildiz.n, b: c.mentor.n }));
  }
});
