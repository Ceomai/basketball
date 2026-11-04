/* ================= MAÇ SEÇENEKLERİ VE KİŞİSEL FAUL =================
   1) Hücum seçenekleri çeşitlendi: turnike, köşe üçlüğü, tepeden üçlük, floater, orta mesafe. Her pozisyona
      uygun olanlar eklenir; karar anında genelde 3, bazen 4 seçenek gelir. Kilit anlarda hepsi görünür.
   2) Basket faul: penetre (%18), turnike (%12), post-up (%10), smaç (%8) sayıdan sonra bir serbest atış.
   3) Kişisel faul: riskli savunma hamleleri (top çalma, blok, hücum faulü almak) başarısız olursa faul olabilir;
      savunmada arka planda da ara sıra faul çalınır. Faul sınırı 5 (NBA'de 6). Bir faul kala uyarı; sınıra
      ulaşınca faulle oyun dışı kalırsın (maçın kalanında oynamazsın, not düşer). Seçeneklerde faul riski yazar. */
import { t as $t } from "./i18n/index.js";
import { PLAYS } from "./data.js";
import { S } from "./core.js";
import { late } from "./late.js";
import { M } from "./match.js";

const EXTRA = {
  PG: ["lay", "top3", "float", "corner", "mid"],
  SG: ["corner", "lay", "float", "top3", "mid"],
  SF: ["corner", "lay", "mid", "top3", "float"],
  PF: ["mid", "lay", "corner", "float"],
  C: ["lay", "mid", "float"]
};
const DEF = { lay: "hiz", top3: "sut", float: "sut", corner: "sut", mid: "sut" };
let added = false;
/** PLAYS'e ek seçenekleri bir kez ekle (dil paketi yüklendikten sonra metinler okunur) */
export function addPlays() {
  if (added) return;
  added = true;
  for (const [pos, keys] of Object.entries(EXTRA)) {
    const P = PLAYS[pos];
    if (!P) continue;
    for (const k of keys) if (!P.off.some(o => o[0] === k)) P.off.push([k, $t(`pl.${k}`), DEF[k], $t(`pl.${k}D`)]);
  }
}
addPlays();
/** Kaç seçenek gösterilsin (kilit an hariç): 3, bazen 4 (eski; pickOffOpts kullanılır) */
export const optCount = () => (Math.random() < 0.25 ? 4 : 3);
const THREE = ["pull", "catch", "wing", "corner", "top3"],
  TWO = ["step", "pop", "mid", "float"],
  FIN = ["drive", "break", "lay", "post", "dunk", "putback"],
  PASSK = ["pnr", "kick", "lob"];
/** Hücum seçenekleri: her kategoriden (üçlük, ikilik, bitiriş, pas) birer tane, kalan rastgele; 4, kilit anda 5 */
export function pickOffOpts(opts, clutch) {
  const n = clutch ? 5 : 4;
  if (opts.length <= n) return opts;
  const sh = a => a.slice().sort(() => Math.random() - 0.5);
  const out = [];
  for (const cat of sh([THREE, TWO, FIN, PASSK])) {
    const c = sh(opts.filter(o => cat.includes(o.k) && !out.includes(o)))[0];
    if (c && out.length < n) out.push(c);
  }
  for (const o of sh(opts)) if (out.length < n && !out.includes(o)) out.push(o);
  return sh(out);
}

/* ---- Durum anları: şut saati, zaman öldürme, bilerek faul ---- */
const p = e => Math.max(0.1, Math.min(0.9, 0.35 + e / 160));
export function situSpecial(us, clutch, diff, dn) {
  if (!M) return null;
  // kilit anda öndeyken top bizde: zaman öldür mü, hücumu bitir mi?
  if (us && clutch && diff > 0 && diff <= 6 && Math.random() < 0.6)
    return {
      id: "clock",
      ty: "off",
      head: $t("m2.clockH", { v: diff }),
      desc: $t("m2.clockD", { dn }),
      opts: [
        { k: "cl_burn", t: $t("m2.burn"), d: $t("m2.burnD"), e: 60 },
        { k: "cl_attack", t: $t("m2.attack"), d: $t("m2.attackD"), e: 50 }
      ],
      resolve(k, sur) {
        if (k === "cl_burn") {
          const ok = Math.random() < p(late.eff("pas") + 10);
          if (ok) M.us += Math.random() < 0.45 ? 2 : 0;
          else M.them += 2; // top kaybı
          return { good: ok, w: 1, st: "pas", txt: ok ? $t("m2.burnOk", { sur }) : $t("m2.burnNo", { sur, dn }) };
        }
        const ok = Math.random() < p(late.eff("sut"));
        if (ok) M.pts += 2; // takım skoruna motor ekler
        return { good: ok, w: 1.1, st: "sut", txt: ok ? $t("m2.attackOk", { sur }) : $t("m2.attackNo", { sur }) };
      }
    };
  // kilit anda 3-6 sayı gerideyken savunmada: bilerek faul (kişisel faul sayılır) ya da normal savunma
  if (!us && clutch && diff <= -3 && diff >= -8 && Math.random() < 0.6)
    return {
      id: "hackfoul",
      ty: "def",
      head: $t("m2.hackH", { v: -diff }),
      desc: $t("m2.hackD", { dn }),
      opts: [
        { k: "hk_foul", t: $t("m2.hack"), d: `${$t("m2.hackOD")} · ${$t("pf.risk")}`, e: 55 },
        { k: "hk_def", t: $t("m2.stay"), d: $t("m2.stayD"), e: 45 }
      ],
      resolve(k, sur) {
        if (k === "hk_foul") {
          const f = addFoul();
          const made = (Math.random() < 0.72 ? 1 : 0) + (Math.random() < 0.72 ? 1 : 0);
          M.them += made;
          M.stops++; // serbest atışlar zaten eklendi; motor ayrıca sayı yazmasın
          const good = made < 2;
          return { good, w: 1, st: "sav", txt: `${$t("m2.hackRes", { dn, v: made })}${f}` };
        }
        const ok = Math.random() < p(late.eff("sav"));
        if (ok) M.stops++; // başarısızsa rakip sayısını motor ekler
        return { good: ok, w: 1, st: "sav", txt: ok ? $t("m2.stayOk", { sur }) : $t("m2.stayNo", { dn }) };
      }
    };
  // şut saati bitiyor (kilit an dışında, hücumda %9): standart şut/penetre seçenekleri, zorluk +5
  if (us && !clutch && Math.random() < 0.09)
    return { id: "shotclock", head: $t("m2.scH"), desc: $t("m2.scD", { dn }), keys: [...THREE, ...TWO, "drive", "lay"], pen: 5 };
  return null;
}

/* ---- Kişisel faul ---- */
export const foulLimit = () => (S && S.stage === "nba" ? 6 : 5);
const RISK = { steal: 0.3, block: 0.35, charge: 0.5 };
export const foulRisky = k => k in RISK;
/** Seçenek açıklamasına faul riski notu */
export const foulNote = k => (k in RISK ? ` · ${$t("pf.risk")}` : "");
/** Savunma anı sonrası: başarısız riskli hamle faul olabilir. Faul olduysa açıklama metni döner. */
export function foulAfterMoment(k, good) {
  if (good || !(k in RISK) || Math.random() >= RISK[k]) return "";
  return addFoul();
}
/** Arka plan savunmasında ara sıra faul */
export function backgroundFoul() {
  return Math.random() < 0.015 ? addFoul() : "";
}
export function addFoul() {
  if (!M || M.fo) return "";
  M.pf = (M.pf || 0) + 1;
  const lim = foulLimit();
  if (M.pf >= lim) {
    M.fo = true;
    return ` <b class="bad">${$t("pf.out", { n: M.pf })}</b>`;
  }
  if (M.pf === lim - 1) return ` <b class="warn">${$t("pf.warn", { n: M.pf, l: lim })}</b>`;
  // faul sorunu: son çeyrekten önce sınırın 2 altına gelince koç çeyreğin kalanında kenara alır
  if (M.pf === lim - 2 && (M.q || 1) < 4) {
    M.ftSit = M.q || 1;
    return ` <b class="warn">${$t("pf.bench", { n: M.pf })}</b>`;
  }
  return ` <span class="muted">${$t("pf.foul", { n: M.pf, l: lim })}</span>`;
}
export const foulPenalty = () => (M && M.fo ? 0.4 : 0);
