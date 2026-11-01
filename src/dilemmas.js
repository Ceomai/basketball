/* ================= BEDELİ OLAN KARARLAR (İKİLEMLER) =================
   Her seçeneğin bir kazancı ve bir bedeli var; haftalık panel sırasında, en fazla üç haftada bir:
   - Playoffta sakatlık: ağrı kesiciyle oyna (hemen sahaya dön, ertesi sezon daha uzun sakatlık) ya da dinlen
   - Uzun sakatlık: ameliyat (2 hafta daha uzun, tekrar riski yok) ya da konservatif tedavi (hızlı dönüş, %30 tekrar riski)
   - Ailenin dükkânı: birikiminin beşte biriyle kurtar ya da kariyerine odaklan (bir kez)
   - Bahis sitesi sponsorluğu: büyük para ya da taraftarın ve ailenin gözünde itibar (bir kez)
   - Kaptanlık: kabul et (koç ve takım güveni, yıldızla ilişki bozulur) ya da yıldıza bırak (bir kez) */
import { t as $t } from "./i18n/index.js";
import { $$, Bus, isPro, ri } from "./data.js";
import { S, closeSheet, news, norm, sheet, tx } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const wk = () => S.season * 30 + S.week;
const once = k => !(S.dlDone || {})[k];
const mark = k => ((S.dlDone = S.dlDone || {})[k] = S.season);
const N = () => `${S.first} ${S.last}`;

const DL = [
  {
    k: () => `pain${S.season}`,
    when: () => S.injury && S.phase !== "regular" && S.injury.w >= 1,
    t: () => $t("dl.pain", { inj: S.injury.n, w: S.injury.w }),
    c: [
      [
        "dl.painA",
        () => {
          S.painDebt = (S.injury.w || 1) + 4;
          S.injury = null;
          S.moral += 5;
          news($t("dl.painNews", { v: N() }));
        }
      ],
      ["dl.painB", () => (S.moral -= 3)]
    ]
  },
  {
    k: () => `surg${S.season}-${S.week}`,
    when: () => S.injury && S.injury.w >= 5 && !S.injury.asked,
    t: () => $t("dl.surg", { inj: S.injury.n, w: S.injury.w }),
    c: [
      ["dl.surgA", () => ((S.injury.w += 2), (S.injury.asked = 1), (S.reinj = null))],
      [
        "dl.surgB",
        () => ((S.injury.w = Math.max(1, S.injury.w - 3)), (S.injury.asked = 1), (S.reinj = { until: wk() + 8, p: 0.3 }))
      ]
    ]
  },
  {
    k: () => "shop",
    when: () => S.age >= 22 && S.money >= 1500 && S.rel.aile >= 20,
    t: () => $t("dl.shop", { v: Math.round(S.money * 0.2) }),
    c: [
      ["dl.shopA", () => (tx($t("dl.shopTx"), -Math.round(S.money * 0.2)), (S.rel.aile += 25), (S.moral += 6))],
      ["dl.shopB", () => ((S.rel.aile -= 20), (S.moral -= 6))]
    ]
  },
  {
    k: () => "bet",
    when: () => isPro(S.stage) && S.followers >= 15000,
    t: () => $t("dl.bet", { v: Math.round(S.wage * 8) }),
    c: [
      ["dl.betA", () => (tx($t("dl.betTx"), Math.round(S.wage * 8)), (S.rel.taraf -= 12), (S.rel.aile -= 8))],
      ["dl.betB", () => (S.rel.taraf += 5)]
    ]
  },
  {
    k: () => "captain",
    when: () => isPro(S.stage) && S.age >= 24 && S.rel.koc >= 65 && late.chars && late.chars(),
    t: () => $t("dl.cap", { star: (late.chars() || { yildiz: { n: "" } }).yildiz.n }),
    c: [
      [
        "dl.capA",
        () => {
          S.rel.koc += 5;
          S.rel.takim += 6;
          const c = late.chars();
          if (c) c.yildiz.rel = Math.max(0, c.yildiz.rel - 15);
          S.captain = S.season;
          news($t("dl.capNews", { v: N(), team: S.team.name }));
        }
      ],
      [
        "dl.capB",
        () => {
          const c = late.chars();
          if (c) c.yildiz.rel = Math.min(100, c.yildiz.rel + 12);
          S.rel.koc -= 2;
        }
      ]
    ]
  }
];
function dilemma() {
  if (!S || window.__SIM || (S.season < 2 && !S.injury)) return false;
  if (S.dlLast && wk() - S.dlLast < 3) return false;
  const d = DL.find(x => once(x.k()) && x.when());
  if (!d) return false;
  const key = d.k();
  mark(key);
  S.dlLast = wk();
  sheet(
    $t("dl.title"),
    $t("dl.sub"),
    `<div class="say">${d.t()}</div><div class="choices">${d.c.map(([k], i) => `<button class="choice" data-dl="${i}"><span class="ct" style="font-size:1rem;text-transform:none">${$t(k)}</span></button>`).join("")}</div>`,
    { noClose: true }
  );
  $$("[data-dl]").forEach(
    b =>
      (b.onclick = () => {
        d.c[+b.dataset.dl][1]();
        norm();
        save();
        closeSheet();
        Bus.emit("dilemma", { k: key, choice: +b.dataset.dl });
        late.addMoment &&
          late.addMoment("dl:" + key.replace(/\d+/g, ""), "dilemma", $t(d.c[+b.dataset.dl][0]) + " · " + d.t().slice(0, 90));
      })
  );
  return true;
}
Bus.offer("week:sheet", dilemma, 25);

/** Yeni sezon başında ağrı kesici borcu: ertesi sezon sakatlık olarak gelir */
export function applyPainDebt() {
  if (!S || !S.painDebt) return;
  const w = S.painDebt;
  S.painDebt = 0;
  S.injury = { n: $t("dl.painInj"), w, total: w };
}
/** Konservatif tedavi sonrası tekrar riski (rollInjury içinden) */
export function reinjury() {
  if (!S || S.injury || !S.reinj || wk() > S.reinj.until || Math.random() >= S.reinj.p / 4) return null;
  S.reinj = null;
  const w = ri(3, 6);
  S.injury = { n: $t("dl.reinj"), w, total: w };
  return S.injury;
}
