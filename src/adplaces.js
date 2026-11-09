/* ================= YENİ ÖDÜLLÜ REKLAM YERLEŞİMLERİ =================
   Hepsi oyuncunun tercihi; reklamsız paket varsa ödül reklamsız verilir. Her biri uzaktan ayarla kapatılabilir
   (src/remote.js → rewards). Sınırlar:
   - retry       Son hücumda kaçan şutu bir kez daha oyna (maç başına bir kez, yalnızca kendi oynadığın maçta)
   - extra_offer Menajer bir kulübü daha arar: yaz başına bir ek teklif
   - recall      Masadan kalkan kulübü pazarlığa geri çağır (yaz başına bir kez)
   - season      Sezon sonu: bütün hedefler tuttuysa hedef primi 2 katı; tutmadıysa taraftar buluşması
   - train_x2    Antrenman kazancını 2 katına çıkar (haftada uzaktan ayardaki kadar, varsayılan 1)
   - box         Günlük menajer kutusu: günde bir ücretsiz, bir de reklamla (cihaz başına) */
import { t as $t } from "./i18n/index.js";
import { $, Bus, esc, fmt, isPro, pick, statName, STATS, toast } from "./data.js";
import { S, norm, sheet, tx } from "./core.js";
import { M } from "./match.js";
import { save } from "./save.js";
import { ADS, adBtn, adsSave, rewardLeft, showRewarded } from "./ads.js";
import { RC } from "./remote.js";
import { late } from "./late.js";

const canAd = () => ADS.adFree || rewardLeft() > 0;
const gone = el => !S || (el && !document.body.contains(el));

/* ---- Son hücumu yeniden oyna (engine.js → moment) ---- */
export function retryAvailable(sp, auto) {
  return !window.__SIM && !auto && RC.rewards.retry && sp && sp.id === "lastshot" && M && !M.adRetry && canAd();
}
/** Kaçan son şuttan sonra teklif; reklam izlendiyse true */
export function offerRetry(el) {
  M.adRetry = true; // kabul edilse de edilmese de maçta bir kez sorulur
  return new Promise(res => {
    el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("adp.retryEye")}</div><h2>${$t("adp.retryH")}</h2><p class="muted">${$t("adp.retryD")}</p>${adBtn("ad-retry", $t("adp.retryBtn"), $t("adp.retrySub"), "retry")}<button class="btn ghost" id="ad-retry-no">${$t("adp.retryNo")}</button></div>`;
    const b = $("#ad-retry");
    $("#ad-retry-no").onclick = () => res(false);
    b.onclick = async () => {
      b.disabled = true;
      const ok = await showRewarded("retry");
      if (gone(b)) return res(false);
      if (ok) Bus.emit("ad:retry");
      res(!!ok);
    };
  });
}
/** Yeniden oynama için maçın sayısal durumunun anlık kopyası */
export const momentSnap = () => Object.fromEntries(Object.entries(M).filter(([, v]) => typeof v === "number"));
export const momentRestore = snap => Object.assign(M, snap);

/* ---- Yaz dönemi: ek teklif ve masaya geri çağırma (match.js → transition) ---- */
const summer = () => {
  if (!S.adSummer || S.adSummer.s !== S.season) S.adSummer = { s: S.season };
  return S.adSummer;
};
export function offerAdsHTML(offers, allowExtra) {
  if (window.__SIM || !S) return "";
  const z = summer();
  let h = "";
  const w = offers.find(o => o.withdrawn);
  if (RC.rewards.recall && w && !z.recall && canAd())
    h += adBtn("ad-recall", $t("adp.recall", { t: esc(w.team.name) }), $t("adp.recallSub"), "recall");
  if (RC.rewards.extraOffer && allowExtra && !z.reroll && canAd() && offers.some(o => !o.stay && !o.uni && !o.story))
    h += adBtn("ad-reroll", $t("rep.reroll"), $t("rep.rerollSub"), "reroll_offers");
  if (RC.rewards.extraOffer && allowExtra && !z.extra && canAd())
    h += adBtn("ad-extra", $t("adp.extra", { v: esc(S.npc.agent) }), $t("adp.extraSub"), "extra_offer");
  return h;
}
export function bindOfferAds(offers, gen, reshow) {
  const r = $("#ad-recall");
  if (r)
    r.onclick = async () => {
      r.disabled = true;
      const ok = await showRewarded("recall");
      if (gone(r)) return;
      if (!ok) return void (r.disabled = false);
      const w = offers.find(o => o.withdrawn);
      summer().recall = true;
      if (w) {
        w.withdrawn = false;
        w.recalled = true;
      }
      save();
      toast($t("adp.recallOk"));
      reshow();
    };
  const rr = $("#ad-reroll");
  if (rr)
    rr.onclick = async () => {
      rr.disabled = true;
      const ok = await showRewarded("reroll_offers");
      if (gone(rr)) return;
      if (!ok) return void (rr.disabled = false);
      summer().reroll = true;
      // kalma, üniversite ve hikâye teklifleri yerinde kalır; diğerleri yeni kulüplerle değişir
      const keep = new Set(offers.filter(o => o.stay || o.uni || o.story).map(o => o.team.key));
      let n = 0;
      for (let i = 0; i < offers.length; i++) {
        const o = offers[i];
        if (o.stay || o.uni || o.story) continue;
        for (let t = 0; t < 8; t++) {
          const nw = gen()[0];
          if (nw && !keep.has(nw.team.key)) {
            keep.add(nw.team.key);
            offers[i] = nw;
            n++;
            break;
          }
        }
      }
      save();
      toast($t("rep.rerolled", { n }));
      reshow();
    };
  const x = $("#ad-extra");
  if (x)
    x.onclick = async () => {
      x.disabled = true;
      const ok = await showRewarded("extra_offer");
      if (gone(x)) return;
      if (!ok) return void (x.disabled = false);
      summer().extra = true;
      const used = new Set(offers.map(o => o.team && o.team.key));
      let add = null;
      for (let i = 0; i < 6 && !add; i++) {
        const o = gen()[0];
        if (o && !used.has(o.team.key)) add = o;
      }
      if (add) {
        add.note = $t("adp.extraNote", { v: S.npc.agent });
        offers.push(add);
        toast($t("adp.extraOk", { t: add.team.name }));
      } else toast($t("adp.extraNone"));
      save();
      reshow();
    };
}

/* ---- Sezon sonu (match.js → sezon özeti) ---- */
const goalsAllDone = () => {
  const R = S.goals && S.goals.result;
  return !!(R && R.length && R.every(r => r.ok) && isPro(S.stage));
};
export function seasonAdHTML() {
  if (window.__SIM || !S || !RC.rewards.season || summer().season || !canAd()) return "";
  return goalsAllDone()
    ? adBtn("ad-season", $t("adp.seasonX2", { v: fmt(Math.round(S.wage * 2)) }), $t("adp.seasonX2Sub"), "season")
    : adBtn("ad-season", $t("adp.seasonFans"), $t("adp.seasonFansSub"), "season");
}
export function bindSeasonAd() {
  const b = $("#ad-season");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    const ok = await showRewarded("season");
    if (gone(b)) return;
    if (!ok) return void (b.disabled = false);
    summer().season = true;
    let msg;
    if (goalsAllDone()) {
      const v = Math.round(S.wage * 2);
      tx($t("adp.seasonTx"), v);
      msg = $t("adp.seasonX2Ok", { v: fmt(v) });
    } else {
      S.followers = Math.round(S.followers * 1.08);
      S.rel.taraf += 3;
      S.moral += 5;
      msg = $t("adp.seasonFansOk");
    }
    norm();
    save();
    b.outerHTML = `<div class="say good">${msg}</div>`;
  };
}

/* ---- Antrenman kazancı 2 katı (places.js → runDrill) ---- */
const trainWeek = () => {
  const wk = `${S.season}-${S.week}`;
  if (S.adTrainWk !== wk) {
    S.adTrainWk = wk;
    S.adTrainN = 0;
  }
  return S.adTrainN || 0;
};
export function trainAdHTML(gain) {
  if (window.__SIM || !S || gain <= 0 || trainWeek() >= RC.rewards.trainPerWeek || !canAd()) return "";
  return adBtn("ad-train", $t("adp.train", { v: gain }), $t("adp.trainSub"), "train_x2");
}
export function bindTrainAd(k, gain) {
  const b = $("#ad-train");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    const ok = await showRewarded("train_x2");
    if (gone(b)) return;
    if (!ok) return void (b.disabled = false);
    trainWeek();
    S.adTrainN++;
    late.gainStat(k, gain);
    norm();
    save();
    b.outerHTML = `<div class="say good">${$t("adp.trainOk", { v: gain, k: statName(k) })}</div>`;
  };
}

/* ---- Günlük menajer kutusu (ana ekran) ---- */
const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function box() {
  const d = dayKey();
  const b = (ADS.box = ADS.box && typeof ADS.box === "object" ? ADS.box : { d: "", free: false, ad: false });
  // yalnızca ileri bir gün yeniler (saat geri alınarak kutu tekrar açılmasın)
  if (b.d !== d && (!b.d || d > b.d)) Object.assign(b, { d, free: false, ad: false });
  return b;
}
export const boxReady = () => !!(S && RC.rewards.box && !window.__SIM && !box().free);
export function boxButtonHTML() {
  if (!S || !RC.rewards.box || window.__SIM) return "";
  return `<button class="btn ghost sm has-dot" id="dbox">${$t("adp.box")}${boxReady() ? late.newDot() : ""}</button>`;
}
/** Kutu ödülü: küçük ve çeşitli; ilerlemeyi hızlandırmaktan çok güne bir sürpriz */
function roll() {
  const r = Math.random();
  if (r < 0.3) {
    const v = Math.max(15, Math.round(S.wage * 0.4));
    tx($t("adp.box"), v);
    return $t("adp.rMoney", { v: fmt(v) });
  }
  if (r < 0.5) {
    S.energy += 15;
    return $t("adp.rEnergy");
  }
  if (r < 0.65) {
    S.moral += 6;
    S.rel.ark += 4;
    return $t("adp.rMoral");
  }
  if (r < 0.82) {
    S.followers = Math.round(S.followers * 1.03) + 5;
    S.rel.taraf += 2;
    return $t("adp.rFans");
  }
  const [k] = pick(STATS);
  late.gainStat(k, 0.6);
  return $t("adp.rTrain", { k: statName(k) });
}
export function boxSheet(after) {
  const b = box();
  const body = msg =>
    `${msg ? `<div class="say gold">${msg}</div>` : ""}<p class="small muted">${$t("adp.boxInfo")}</p>${
      !b.free
        ? `<button class="btn pri" id="bx-free">${$t("adp.boxOpen")}</button>`
        : !b.ad && canAd()
          ? adBtn("bx-ad", $t("adp.boxMore"), $t("ads.50"), "box")
          : `<p class="small">${$t("adp.boxDone")}</p>`
    }`;
  const draw = msg => {
    // kapatma yalnız ✕ (ayrı "Haritaya dön" düğmesi yok)
    sheet($t("adp.box"), $t("adp.boxSub", { v: esc(S.npc.agent) }), body(msg), { onClose: () => after && after() });
    const f = $("#bx-free");
    if (f)
      f.onclick = () => {
        b.free = true;
        adsSave();
        const m = roll();
        norm();
        save();
        Bus.emit("box", { ad: false });
        draw(m);
      };
    const a = $("#bx-ad");
    if (a)
      a.onclick = async () => {
        a.disabled = true;
        const ok = await showRewarded("box");
        if (gone(a)) return;
        if (!ok) return void (a.disabled = false);
        b.ad = true;
        adsSave();
        const m = roll();
        norm();
        save();
        Bus.emit("box", { ad: true });
        draw(m);
      };
  };
  draw("");
}
