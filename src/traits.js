/* ================= OYUN KİMLİĞİ: ÖZELLİKLER VE İMZA HAREKET =================
   Özellikler oynayışla kazanılır (karar anlarındaki başarılar sayılır; en fazla 3 özellik):
   - Clutch: son anlarda başarılı karar. Son hücumda "Topu bana verin" seçeneği, son anlarda +3
   - Şutör: başarılı dış şutlar. Dış şut seçenekleri +2
   - Oyun kurucu: başarılı paslar. Pas seçenekleri +2
   - Savunma canavarı: başarılı savunma anları. Savunma seçenekleri +2
   - Lider: koç ve takımla güçlü ilişki (profesyonel). Koçun güveni +3, her hafta takım ilişkisi +1
   İmza hareket: profesyonelde 150 kariyer sayısından sonra pozisyona göre üç hareketten biri seçilir.
   Maçta bir kez çıkar, başarı değeri +8; olursa tribün coşar, taraftar ve takipçi artar. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, isPro, statName } from "./data.js";
import { S, closeSheet, eff, news, norm, sheet } from "./core.js";
import { M } from "./match.js";
import { save } from "./save.js";
import { late } from "./late.js";

const OUT = ["pull", "catch", "wing", "step", "pop", "mid"],
  PASS = ["kick", "lob", "pnr", "fb_pass"],
  DEF = ["steal", "block", "rim", "charge", "safe", "reb", "sc_switch", "sc_over", "sc_help"];
export const TRAITS = {
  clutch: { n: "tr.clutch", d: "tr.clutchD", need: 30, ctr: "clutch" },
  sutor: { n: "tr.sutor", d: "tr.sutorD", need: 140, ctr: "out" },
  kurucu: { n: "tr.kurucu", d: "tr.kurucuD", need: 120, ctr: "pass" },
  savunma: { n: "tr.savunma", d: "tr.savunmaD", need: 220, ctr: "def" },
  lider: { n: "tr.lider", d: "tr.liderD" }
};
const MAX_TRAITS = 3;
export const hasTrait = k => !!(S && S.traits && S.traits[k]);
const trk = () => (S.trk = S.trk || { clutch: 0, out: 0, pass: 0, def: 0 });

function grant(k) {
  S.traits = S.traits || {};
  if (S.traits[k] || Object.keys(S.traits).length >= MAX_TRAITS) return;
  S.traits[k] = S.season;
  (S.traitQ = S.traitQ || []).push(k);
  news($t("tr.news", { v: `${S.first} ${S.last}`, t: $t(TRAITS[k].n) }));
  Bus.emit("trait", { k });
}
Bus.on("match:moment", d => {
  if (!S || !d.good) return;
  const t = trk();
  if (d.clutch) t.clutch++;
  if (OUT.includes(d.k) || d.k === "clutch") t.out++;
  if (PASS.includes(d.k)) t.pass++;
  if (d.id === "def" || d.id === "screen") t.def++;
  for (const [k, T] of Object.entries(TRAITS)) if (T.need && t[T.ctr] >= T.need) grant(k);
});
Bus.on("week:start", () => {
  if (!S) return;
  if (isPro(S.stage) && S.rel.koc >= 75 && S.rel.takim >= 75 && S.age >= 21) grant("lider");
  if (hasTrait("lider")) {
    S.rel.takim += 1;
    norm();
  }
});

/** Karar anı seçeneğine özellik ve imza etkisi (moments.js → momentMod) */
export function traitMod(k) {
  if (!S) return 0;
  let m = 0;
  if (k === "clutch") return 5;
  if (k === "sig") return 8;
  if (hasTrait("clutch") && M && M.clutchNow) m += 3;
  if (hasTrait("sutor") && OUT.includes(k)) m += 2;
  if (hasTrait("kurucu") && PASS.includes(k)) m += 2;
  if (hasTrait("savunma") && DEF.includes(k)) m += 2;
  return m;
}
export const traitTrust = () => (hasTrait("lider") ? 3 : 0);

/* ---- İmza hareket ---- */
export const MOVES = {
  stepback: { n: "sig.stepback", st: "sut", key: "pull" },
  eurostep: { n: "sig.eurostep", st: "hiz", key: "drive" },
  hook: { n: "sig.hook", st: "guc", key: "post" },
  nolook: { n: "sig.nolook", st: "pas", key: "kick" },
  chasedown: { n: "sig.chasedown", st: "sav", key: "block", def: true }
};
const BY_POS = {
  PG: ["nolook", "stepback", "eurostep"],
  SG: ["stepback", "eurostep", "nolook"],
  SF: ["eurostep", "stepback", "chasedown"],
  PF: ["hook", "chasedown", "stepback"],
  C: ["hook", "chasedown", "nolook"]
};
const sig = () => (S && S.sig && MOVES[S.sig] ? MOVES[S.sig] : null);
/** Karar anına imza seçeneği ekle (maçta bir kez) */
export function addSignature(opts, ty) {
  const s = sig();
  if (!s || !M || M.sigUsed || (s.def ? ty !== "def" : ty !== "off")) return opts;
  return [
    ...opts,
    {
      k: "sig",
      t: `${$t("sig.tag")} · ${$t(s.n)}`,
      d: `${$t("sig.desc")} · ${statName(s.st)} ${Math.round(eff(s.st))}`,
      e: eff(s.st) + 2
    }
  ];
}
/** Seçilen anahtarın gerçek oyun anahtarı (clutch → dış şut, imza → hareketin oyunu) */
export function playKey(k) {
  if (k === "clutch") return "pull";
  if (k === "sig") {
    M.sigUsed = true;
    return (sig() || {}).key || "pull";
  }
  return k;
}
/** İmza hareketi sonrası */
export function afterSignature(k, good) {
  if (k !== "sig" || !good) return "";
  S.followers = Math.round(S.followers * 1.01);
  S.rel.taraf += 1;
  S.sigHits = (S.sigHits || 0) + 1;
  late.crowdSwell(2);
  Bus.emit("signature", { hits: S.sigHits });
  return ` <b class="gold">${$t("sig.hit")}</b>`;
}
/** Son hücumda Clutch seçeneği */
export function clutchOption() {
  if (!hasTrait("clutch")) return null;
  return {
    k: "clutch",
    t: $t("tr.clutchOpt"),
    d: `${$t("tr.clutchOptD")} · ${statName("sut")} ${Math.round(eff("sut"))}`,
    e: eff("sut") + 2
  };
}

/* ---- Paneller: yeni özellik, imza hareket seçimi ---- */
function traitSheet() {
  if (!S || !S.traitQ || !S.traitQ.length) return false;
  const q = S.traitQ.splice(0);
  if (window.__SIM) return false;
  sheet(
    $t("tr.title"),
    $t("tr.sub"),
    `${q.map(k => `<div class="card"><b>${$t(TRAITS[k].n)}</b><p class="small">${$t(TRAITS[k].d)}</p></div>`).join("")}<button class="btn pri" id="tr-ok">${$t("goal.ok")}</button>`,
    { noClose: true }
  );
  $("#tr-ok").onclick = () => closeSheet();
  return true;
}
Bus.offer("week:sheet", traitSheet, 7);
function sigSheet() {
  if (!S || S.sig || !isPro(S.stage) || (S.career.pts || 0) < 150) return false;
  const list = BY_POS[S.pos] || BY_POS.SF;
  if (window.__SIM) {
    S.sig = list[0];
    return false;
  }
  sheet(
    $t("sig.title"),
    $t("sig.sub"),
    `<p class="small">${$t("sig.intro")}</p><div class="choices">${list
      .map(
        k =>
          `<button class="choice" data-sig="${k}"><span class="ct">${$t(MOVES[k].n)}</span><span class="cd">${statName(MOVES[k].st)} · ${MOVES[k].def ? $t("sig.defense") : $t("sig.offense")}</span></button>`
      )
      .join("")}</div>`,
    { noClose: true }
  );
  $$("[data-sig]").forEach(
    b =>
      (b.onclick = () => {
        S.sig = b.dataset.sig;
        news($t("sig.news", { v: `${S.first} ${S.last}`, m: $t(MOVES[S.sig].n) }));
        Bus.emit("signature", { pick: S.sig });
        save();
        closeSheet();
      })
  );
  return true;
}
Bus.offer("week:sheet", sigSheet, 8);

/** İstatistik ve kart için özellik rozetleri */
export function traitsHTML() {
  const t = Object.keys((S && S.traits) || {});
  const s = sig();
  if (!t.length && !s) return "";
  return `<div class="row" style="gap:var(--sp-1h);flex-wrap:wrap">${t.map(k => `<span class="pill g">${$t(TRAITS[k].n)}</span>`).join("")}${s ? `<span class="pill w">${$t("sig.tag")}: ${$t(s.n)}</span>` : ""}</div>`;
}
export const traitNames = () => Object.keys((S && S.traits) || {}).map(k => $t(TRAITS[k].n));
