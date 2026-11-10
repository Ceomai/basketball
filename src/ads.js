import { t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { $, Bus, fmt, pick, toast } from "./data.js";
import { S, closeSheet, norm, sheet, tx, weekKey } from "./core.js";
import { save } from "./save.js";
import { M } from "./match.js";
import { settingsSheet } from "./systems.js";
import { RC, loadRemote, onRemote } from "./remote.js";
import { REL_ADMOB, relAdFreeLabel, relWarnTestAds } from "./release.js";
/* ================= REKLAM GELİR MODELİ =================
   İlke: reklam oyuncunun tercihidir. Ödüllü reklamlar bir karşılık verir; zorunlu geçiş reklamı seyrek ve
   sıklık sınırlıdır, ilk saatlerde hiç gösterilmez.

   Yerleşimler (ADS.place):
   - double_bonus  Maç sonu: maç primini ikiye katla (her maçta bir kez)
   - energy        Enerji 60'ın altındayken: +30 enerji (haftada 2, günde 8 ödüllü reklam sınırı içinde)
   - halftime      Devre arası: soyunma odası konuşması, +10 enerji ve +4 moral (maç başına bir kez)
   - heal          Sakatken: iyileşmeyi bir hafta kısalt (sakatlık başına bir kez)
   - between       Maçlar arası geçiş reklamı: en erken 6. maçtan sonra, en az 3 maç ve 4 dakika arayla

   Sağlayıcı: Capacitor ile paketlenmiş uygulamada AdMob eklentisi (@capacitor-community/admob) kullanılır.
   Web sürümünde gerçek reklam yoktur; akışı göstermek için oyun içi tanıtım ekranı çıkar.
   "Reklamsız paket" alındığında geçiş reklamları kapanır, ödüllü reklamların ödülü reklamsız verilir. */
export const ADS_CFG = {
  // Reklam birimi kimlikleri TEK noktadan: src/release.js (VITE_ADMOB_* derleme değişkenleri; yoksa Google test kimlikleri)
  admob: REL_ADMOB,
  // ödüllü reklam oyuncunun tercihi: günlük sınır yok, yalnızca bot/hatalı trafiğe karşı güvenlik tavanı
  dailyRewardCap: 100,
  energyPerWeek: 20,
  interstitial: { minGames: 6, everyGames: 3, minGapMs: 4 * 60 * 1000 },
  webAdSeconds: { rewarded: 5, interstitial: 3 }
};
// sıklık ve sınırlar uzaktan ayarla değişebilir (src/remote.js; varsayılanlar yukarıdakilerle aynı)
onRemote(rc => {
  ADS_CFG.dailyRewardCap = rc.ads.dailyRewardCap;
  ADS_CFG.energyPerWeek = rc.ads.energyPerWeek;
  const I = rc.ads.interstitial;
  Object.assign(ADS_CFG.interstitial, { minGames: I.minGames, everyGames: I.everyGames, minGapMs: I.minGapMs });
});
loadRemote();
export const ADS = (() => {
  let st = {};
  try {
    st = JSON.parse(localStorage.getItem("pota-ads") || "{}");
  } catch (e) {}
  return Object.assign(
    { adFree: false, consent: null, day: "", today: 0, games: 0, lastInter: 0, lastInterGame: 0, stats: {} },
    st
  );
})();
export const adsSave = () => {
  try {
    localStorage.setItem("pota-ads", JSON.stringify(ADS));
  } catch (e) {}
};
// Uygulamada AdMob eklentisi native.js tarafından window.PotaNative.AdMob olarak verilir
export const admob = () => {
  // yalnızca gerçek uygulamada: web'de eklentinin "web taklidi" reklam göstermeden "izlendi" der ve ödül bedavaya verilirdi
  const C = window.Capacitor;
  if (!(C && C.isNativePlatform && C.isNativePlatform())) return null;
  return (window.PotaNative && window.PotaNative.AdMob) || (C.Plugins && C.Plugins.AdMob) || null;
};
export const platform = () => {
  try {
    return window.Capacitor.getPlatform();
  } catch (e) {
    return "web";
  }
};
export function adsDayTick() {
  const d = new Date().toISOString().slice(0, 10);
  // yalnızca ileri bir gün günlük reklam sınırını sıfırlar (saat geri alınarak sınır aşılmasın)
  if (ADS.day !== d && (!ADS.day || d > ADS.day)) {
    ADS.day = d;
    ADS.today = 0;
  }
}
export const rewardLeft = () => {
  adsDayTick();
  return Math.max(0, ADS_CFG.dailyRewardCap - ADS.today);
};
export function adStat(place, k) {
  ADS.stats[place] = ADS.stats[place] || { shown: 0, done: 0 };
  ADS.stats[place][k]++;
  adsSave();
}

/* ---- Rıza (KVKK/GDPR): ilk reklamdan önce bir kez sorulur ---- */
let consentAsk = null; // aynı anda birden çok çağrıda tek pencere (üst üste yığılmasın)
export function adsConsent() {
  if (ADS.consent !== null || window.__SIM) return Promise.resolve();
  if (consentAsk) return consentAsk;
  consentAsk = askConsent().finally(() => (consentAsk = null));
  return consentAsk;
}
function askConsent() {
  // Ayrı katmanda sorulur: sheet() kullanılsaydı o an açık olan paneli (maç sonucu, enerji, sakatlık) silerdi ve
  // izin verildikten sonra oyuncu devam düğmesi olmayan bir ekranda kalırdı.
  return new Promise(r => {
    const el = document.createElement("div");
    el.id = "acov";
    el.className = "sheet-bg";
    el.style.zIndex = "55";
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="${$t("ads.1")}"><div class="sheet-h"><div class="minw-0"><div class="eyebrow">${$t("ads.2")}</div><h2>${$t("ads.1")}</h2></div></div><div class="sheet-b"><p>${$t("ads.3")}</p><p class="small muted">${$t("ads.4")} ${$t("adp.consentStats")}</p><div class="grid2"><button class="btn ghost" id="ac-no">${$t("ads.5")}</button><button class="btn pri" id="ac-yes">${$t("ads.6")}</button></div></div></div>`;
    document.body.appendChild(el);
    const done = v => {
      ADS.consent = v;
      adsSave();
      el.remove();
      r();
    };
    el.querySelector("#ac-no").onclick = () => done(false);
    el.querySelector("#ac-yes").onclick = () => done(true);
  });
}

/* ---- Sağlayıcılar ---- */
export let admobReady = false;
export async function admobInit() {
  const A = admob();
  if (!A || admobReady) return !!A;
  relWarnTestAds();
  // native.js önce Google rıza formunu (UMP, AB/UK) tamamlar, izin varsa AdMob'u başlatır; ondan önce reklam istenmez
  const ready = window.PotaNative && window.PotaNative.adsReady;
  try {
    if (ready) admobReady = !!(await ready);
    else {
      await A.initialize({ initializeForTesting: false });
      admobReady = true;
    }
  } catch (e) {}
  return admobReady;
}
/** Son reklamın neden ödül vermediği: "noad" (yüklenemedi / çevrimdışı) ya da "abort" (oyuncu yarıda kapattı) */
export const AD_LAST = { why: null };
export async function nativeAd(kind) {
  const A = admob();
  if (!A || !(await admobInit())) return null;
  const id = ADS_CFG.admob[kind][platform() === "ios" ? "ios" : "android"];
  AD_LAST.why = null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    AD_LAST.why = "noad";
    return false;
  }
  try {
    if (kind === "rewarded") await A.prepareRewardVideoAd({ adId: id, npa: ADS.consent === false });
    else await A.prepareInterstitial({ adId: id, npa: ADS.consent === false });
  } catch (e) {
    AD_LAST.why = "noad"; // yükleme hatası: doldurulacak reklam yok ya da ağ yok
    return false;
  }
  try {
    if (kind === "rewarded") {
      const rw = await A.showRewardVideoAd();
      if (!rw) AD_LAST.why = "abort";
      return !!rw;
    }
    await A.showInterstitial();
    return true;
  } catch (e) {
    AD_LAST.why = "abort";
    return false;
  }
}
// Web: tam ekran oyun içi tanıtım; ödüllü reklamda süre dolmadan kapatılırsa ödül verilmez
export const AD_PROMOS = [
  [$t("ads.7"), $t("ads.8")],
  [$t("ads.9"), $t("ads.10")],
  [$t("ads.11"), $t("ads.12")],
  [$t("ads.13"), $t("ads.14")],
  [$t("ads.15"), $t("ads.16")]
];
export function webAd(kind) {
  return new Promise(res => {
    const secs = ADS_CFG.webAdSeconds[kind],
      [h, t] = pick(AD_PROMOS),
      el = document.createElement("div");
    el.id = "adov";
    el.innerHTML = `<div class="adbox"><div class="row between"><span class="pill">${$t("ads.19")}</span><span class="small muted" id="adt">${$t(
      "ads.20",
      {
        secs: secs
      }
    )}</span></div><div class="adbody"><div class="eyebrow">${$t("ads.21")}</div><h2>${h}</h2><p>${t}</p><p class="small muted">${$t("ads.22")}</p></div><button class="btn ghost" id="adx">${kind === "rewarded" ? $t("ads.17") : $t("ads.18")}</button></div>`;
    document.body.appendChild(el);
    let left = secs,
      done = false;
    const btn = el.querySelector("#adx"),
      tl = el.querySelector("#adt");
    if (kind === "interstitial") btn.disabled = true;
    const iv = setInterval(() => {
      left--;
      tl.textContent =
        left > 0
          ? $t("ads.48", {
              left: left
            })
          : $t("ads.23");
      if (left <= 0) {
        clearInterval(iv);
        done = true;
        btn.disabled = false;
        btn.textContent = kind === "rewarded" ? $t("ads.24") : $t("ads.25");
        btn.className = "btn pri";
      }
    }, 1000);
    btn.onclick = () => {
      clearInterval(iv);
      el.remove();
      if (kind === "rewarded" && !done) AD_LAST.why = "abort";
      res(kind === "rewarded" ? done : true);
    };
  });
}
export async function playAd(kind) {
  const n = await nativeAd(kind);
  if (n !== null) return n;
  return webAd(kind);
}

/* ---- Genel arayüz ---- */
// Ödüllü reklam: ödül verildiyse true döner
export async function showRewarded(place) {
  if (ADS.adFree) {
    adStat(place, "done");
    return true;
  }
  if (!rewardLeft()) {
    Bus.emit("ad:cap", { place }); // test kaydı: sınır gerçek oyuncularda ne sıklıkla doluyor?
    toast($t("ads.26"));
    return false;
  }
  // basılan reklam düğmesi hazırlanırken "Yükleniyor…" (aria-busy); sonuçtan sonra eski haline döner
  const btn = AD_BTN.el && document.body.contains(AD_BTN.el) ? AD_BTN.el : null;
  AD_BTN.el = null;
  const html = btn ? btn.innerHTML : "";
  if (btn) {
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = `<span class="adtag">${$t("ads.19")}</span>${$t("s32.ad.loading")}`;
  }
  let ok = false;
  try {
    await adsConsent();
    adStat(place, "shown");
    late.sfx("click");
    AD_LAST.why = null;
    ok = await playAd("rewarded");
  } finally {
    if (btn && document.body.contains(btn)) {
      btn.removeAttribute("aria-busy");
      btn.innerHTML = html;
    }
  }
  Bus.emit("ad", { place, kind: "rewarded", ok });
  if (ok) {
    ADS.today++;
    adStat(place, "done");
    adsSave();
    late.sfx("coin");
  } else toast(AD_LAST.why === "noad" ? $t("s32.ad.none") : $t("ads.27")); // yüklenemedi ≠ yarıda kesildi
  return ok;
}
// Maçlar arası geçiş reklamı (sıklık sınırlı); bittiğinde next() çağrılır
export async function adsBetween(next) {
  ADS.games++;
  adsSave();
  const C = ADS_CFG.interstitial,
    now = Date.now();
  const due =
    !ADS.adFree &&
    !window.__SIM &&
    ADS.games >= C.minGames &&
    ADS.games - ADS.lastInterGame >= C.everyGames &&
    now - ADS.lastInter >= C.minGapMs;
  if (due) {
    await adsConsent();
    adStat("between", "shown");
    ADS.lastInter = now;
    ADS.lastInterGame = ADS.games;
    adsSave();
    await playAd("interstitial");
    Bus.emit("ad", { place: "between", kind: "interstitial", ok: true });
    adStat("between", "done");
  }
  next();
}
// Doğal kırılma anı (sezon sonu imzası, yeni bölüm): maç sayacını artırmaz, kendi en kısa arasını kullanır.
// İlk maçlarda (minGames) ve son geçiş reklamından kısa süre sonra gösterilmez; maç ortasında asla çağrılmaz.
export async function adsBreak(place, next) {
  const C = ADS_CFG.interstitial,
    I = RC.ads.interstitial,
    now = Date.now();
  const due = I.breaks && !ADS.adFree && !window.__SIM && ADS.games >= C.minGames && now - ADS.lastInter >= I.breakGapMs;
  if (due) {
    await adsConsent();
    adStat(place, "shown");
    ADS.lastInter = now;
    ADS.lastInterGame = ADS.games; // hemen ardından maç sonu reklamı gelmesin
    adsSave();
    await playAd("interstitial");
    Bus.emit("ad", { place, kind: "interstitial", ok: true });
    adStat(place, "done");
  }
  next();
}
// Günlük sınır dolduysa düğme yerine kısa not: oyuncu reklama basıp "bugünlük bitti" uyarısıyla karşılaşmasın
export const adBtn = (id, label, sub, place) => {
  if (!ADS.adFree && !rewardLeft()) return `<p class="small muted adcap">${$t("adx.capNote")}</p>`;
  if (place && late.adOffer) late.adOffer(place);
  return adBtnRaw(id, label, sub);
};
/** Basılan ödüllü reklam düğmesi (yakalama aşamasında not edilir; showRewarded "Yükleniyor…" gösterir) */
const AD_BTN = { el: null };
try {
  document.addEventListener(
    "click",
    e => {
      const b = e.target && e.target.closest && e.target.closest(".adbtn");
      if (b) AD_BTN.el = b;
    },
    true
  );
} catch (e) {
  /* DOM yok */
}
const AD_IC = `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
const adBtnRaw = (id, label, sub) =>
  `<button class="btn ad adbtn" id="${id}"><span class="adtag">${AD_IC}${ADS.adFree ? $t("ads.28") : rewardLeft() <= 5 ? `${$t("ads.19")} · ${$t("adx.left", { n: rewardLeft() })}` : $t("ads.19")}</span>${label}${sub ? `<small>${sub}</small>` : ""}</button>`;

/* ---- Yerleşimler ---- */
export function adDoubleHTML(bonus) {
  return bonus > 0 && !window.__SIM
    ? adBtn(
        "ad-x2",
        $t("ads.49", {
          bonus: fmt(bonus)
        }),
        $t("ads.50"),
        "double_bonus"
      )
    : "";
}
export function bindAdDouble(bonus) {
  const b = $("#ad-x2");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    const ok = await showRewarded("double_bonus");
    // reklam sürerken kariyerden çıkıldıysa ya da ekran değiştiyse ödül yazılmaz (kapalı kariyere yazmak çöküyordu)
    if (!S || !document.body.contains(b)) return;
    if (ok) {
      tx($t("ads.51"), bonus);
      save();
      b.outerHTML = `<div class="say good">${$t("ads.29", {
        bonus: fmt(bonus)
      })}</div>`;
    } else b.disabled = false;
  };
}
export function adEnergyHTML() {
  const wk = weekKey();
  if (S.adEnergyWk !== wk) {
    S.adEnergyWk = wk;
    S.adEnergyN = 0;
  }
  if (window.__SIM || S.energy >= 60 || S.adEnergyN >= ADS_CFG.energyPerWeek) return "";
  return `<div class="card"><div class="row between nowrap"><div><div class="eyebrow">${$t("ads.30", {
    energy: S.energy
  })}</div><p class="small muted" style="margin:2px 0 0">${$t("ads.31", {
    v: ADS_CFG.energyPerWeek - S.adEnergyN
  })}</p></div></div>${adBtn("ad-en", $t("ads.32"), $t("ads.50"), "energy")}</div>`;
}
export function bindAdEnergy(after) {
  const b = $("#ad-en");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    const ok = await showRewarded("energy");
    // reklam sürerken kariyerden çıkıldıysa ya da ekran değiştiyse ödül yazılmaz (kapalı kariyere yazmak çöküyordu)
    if (!S || !document.body.contains(b)) return;
    if (ok) {
      S.adEnergyN++;
      S.energy += 30;
      norm();
      save();
      toast($t("ads.32"));
      after && after();
    } else b.disabled = false;
  };
}
export function adHealHTML() {
  return !window.__SIM && S.injury && S.injury.w > 1 && !S.injury.adHealed
    ? adBtn("ad-heal", $t("ads.52"), $t("ads.53"), "heal")
    : "";
}
export function bindAdHeal(after) {
  const b = $("#ad-heal");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    const ok = await showRewarded("heal");
    // reklam sürerken kariyerden çıkıldıysa ya da ekran değiştiyse ödül yazılmaz (kapalı kariyere yazmak çöküyordu)
    if (!S || !document.body.contains(b)) return;
    if (ok) {
      S.injury.w--;
      S.injury.adHealed = true;
      save();
      toast($t("ads.33"));
      after && after();
    } else b.disabled = false;
  };
}
export function adHalfHTML() {
  return window.__SIM || M.adHalf ? "" : adBtn("ad-half", $t("ads.54"), $t("ads.55"), "halftime");
}
export function bindAdHalf() {
  const b = $("#ad-half");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    const ok = await showRewarded("halftime");
    // reklam sürerken kariyerden çıkıldıysa ya da ekran değiştiyse ödül yazılmaz (kapalı kariyere yazmak çöküyordu)
    if (!S || !document.body.contains(b)) return;
    if (ok) {
      M.adHalf = true;
      S.energy += 10;
      S.moral += 4;
      norm();
      b.outerHTML = `<div class="say good">${$t("ads.34")}</div>`;
    } else b.disabled = false;
  };
}

/* ---- Ayarlar bölümü ---- */
export function adsSettingsHTML() {
  const total = Object.values(ADS.stats).reduce((a, s) => a + s.done, 0);
  return `<div class="act"><div><h3>${$t("ads.40")}</h3><p>${
    ADS.adFree
      ? $t("ads.35")
      : `${$t("ads.36")} ${rewardLeft()}${$t("ads.56", {
          total: total
        })}`
  }</p></div><div class="grid2 span-all"><button class="btn ghost sm" id="ad-cons">${$t("ads.41")} ${ADS.consent ? $t("ads.37") : $t("ads.38")}</button>${ADS.adFree ? "" : `<button class="btn team sm" id="ad-free">${relAdFreeLabel()}</button>`}</div></div>`;
}
export function bindAdsSettings(re) {
  const c = $("#ad-cons");
  if (c)
    c.onclick = () => {
      ADS.consent = !ADS.consent;
      adsSave();
      re();
    };
  const f = $("#ad-free");
  if (f) f.onclick = () => buyAdFree(re);
}
// Satın alma: mağaza sürümünde uygulama içi satın alma eklentisine bağlanır (window.PotaStore.buy)
export async function buyAdFree(re) {
  if (window.PotaStore && window.PotaStore.buy) {
    try {
      const r = await window.PotaStore.buy("adfree");
      if (r === "pending") toast($t("rel.iapPending"));
      else if (r) {
        ADS.adFree = true;
        adsSave();
        toast($t("ads.42"));
        re && re();
      }
    } catch (e) {
      toast($t("ads.43"));
    }
    return;
  }
  sheet(
    $t("ads.39"),
    $t("ads.44"),
    `<p>${$t("ads.45")}</p><p class="small muted">${$t("ads.46")}</p><button class="btn pri" id="af-ok">${$t("ads.47")}</button>`
  );
  $("#af-ok").onclick = () => {
    closeSheet();
    settingsSheet();
  };
}
