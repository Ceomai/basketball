import { late } from "./late.js";
import { $, fmt, pick, toast } from "./data.js";
import { S, closeSheet, norm, sheet, tx } from "./core.js";
import { save } from "./save.js";
import { M } from "./match.js";
import { settingsSheet } from "./systems.js";
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
  // Mağaza sürümünde AdMob reklam birimi kimlikleri buraya yazılır (şimdilik Google'ın test kimlikleri)
  admob: {
    rewarded: { android: "ca-app-pub-3940256099942544/5224354917", ios: "ca-app-pub-3940256099942544/1712485313" },
    interstitial: { android: "ca-app-pub-3940256099942544/1033173712", ios: "ca-app-pub-3940256099942544/4411468910" }
  },
  dailyRewardCap: 8,
  energyPerWeek: 2,
  interstitial: { minGames: 6, everyGames: 3, minGapMs: 4 * 60 * 1000 },
  webAdSeconds: { rewarded: 5, interstitial: 3 }
};
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
export const admob = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
export const platform = () => {
  try {
    return window.Capacitor.getPlatform();
  } catch (e) {
    return "web";
  }
};
export function adsDayTick() {
  const d = new Date().toISOString().slice(0, 10);
  if (ADS.day !== d) {
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
export function adsConsent() {
  if (ADS.consent !== null || window.__SIM) return Promise.resolve();
  return new Promise(r => {
    sheet(
      "Reklam tercihi",
      "Bir kez sorulur",
      `<p>Oyun ücretsiz; geliri, senin seçtiğin ödüllü reklamlardan geliyor. Reklamların ilgi alanına göre seçilmesine izin verir misin?</p><p class="small muted">İzin vermezsen yine reklam görürsün ama kişiselleştirilmez. Tercihini Ayarlar'dan değiştirebilirsin.</p><div class="grid2"><button class="btn ghost" id="ac-no">Kişiselleştirme yok</button><button class="btn pri" id="ac-yes">İzin ver</button></div>`,
      { noClose: true }
    );
    $("#ac-no").onclick = () => {
      ADS.consent = false;
      adsSave();
      closeSheet();
      r();
    };
    $("#ac-yes").onclick = () => {
      ADS.consent = true;
      adsSave();
      closeSheet();
      r();
    };
  });
}

/* ---- Sağlayıcılar ---- */
export let admobReady = false;
export async function admobInit() {
  const A = admob();
  if (!A || admobReady) return !!A;
  try {
    await A.initialize({ initializeForTesting: false });
    admobReady = true;
  } catch (e) {}
  return admobReady;
}
export async function nativeAd(kind) {
  const A = admob();
  if (!A || !(await admobInit())) return null;
  const id = ADS_CFG.admob[kind][platform() === "ios" ? "ios" : "android"];
  try {
    if (kind === "rewarded") {
      await A.prepareRewardVideoAd({ adId: id, npa: ADS.consent === false });
      const rw = await A.showRewardVideoAd();
      return !!rw;
    }
    await A.prepareInterstitial({ adId: id, npa: ADS.consent === false });
    await A.showInterstitial();
    return true;
  } catch (e) {
    return false;
  }
}
// Web: tam ekran oyun içi tanıtım; ödüllü reklamda süre dolmadan kapatılırsa ödül verilmez
export const AD_PROMOS = [
  ["Kariyerini yedekle", "Ayarlar → Yedek al ile kariyerini dosya olarak sakla. Telefon değişse de kariyerin kaybolmaz."],
  ["Kendi maçını oyna", "Hızlı oynatılan maçlarda not biraz düşük gelir. Önemli maçları kendin oyna."],
  ["Rakibini takip et", "Ev → İstatistik sekmesinde rakibinin kariyerini görebilirsin."],
  ["Basın toplantısı", "İddialı konuşursan bir sonraki maçta sözünü tutman gerekir."],
  ["Ana ekrana ekle", "Oyunu ana ekrana eklersen internetsiz açılır ve kayıtların daha güvende olur."]
];
export function webAd(kind) {
  return new Promise(res => {
    const secs = ADS_CFG.webAdSeconds[kind],
      [h, t] = pick(AD_PROMOS),
      el = document.createElement("div");
    el.id = "adov";
    el.innerHTML = `<div class="adbox"><div class="row between"><span class="pill">Reklam</span><span class="small muted" id="adt">${secs} sn</span></div><div class="adbody"><div class="eyebrow">Pota Kariyeri ipucu</div><h2>${h}</h2><p>${t}</p><p class="small muted">Bu web sürümünde gerçek reklam yok. Mağaza sürümünde burada kısa bir video reklam oynar.</p></div><button class="btn ghost" id="adx">${kind === "rewarded" ? "Kapat (ödül yok)" : "Geç"}</button></div>`;
    document.body.appendChild(el);
    let left = secs,
      done = false;
    const btn = el.querySelector("#adx"),
      tl = el.querySelector("#adt");
    if (kind === "interstitial") btn.disabled = true;
    const iv = setInterval(() => {
      left--;
      tl.textContent = left > 0 ? `${left} sn` : "Bitti";
      if (left <= 0) {
        clearInterval(iv);
        done = true;
        btn.disabled = false;
        btn.textContent = kind === "rewarded" ? "Ödülü al" : "Devam";
        btn.className = "btn pri";
      }
    }, 1000);
    btn.onclick = () => {
      clearInterval(iv);
      el.remove();
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
    toast("Bugünlük reklam ödülleri bitti. Yarın tekrar gel.");
    return false;
  }
  await adsConsent();
  adStat(place, "shown");
  late.sfx("click");
  const ok = await playAd("rewarded");
  if (ok) {
    ADS.today++;
    adStat(place, "done");
    adsSave();
    late.sfx("coin");
  } else toast("Reklam tamamlanmadı, ödül verilmedi.");
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
    adStat("between", "done");
  }
  next();
}
export const adBtn = (id, label, sub) =>
  `<button class="btn team adbtn" id="${id}"><span class="adtag">${ADS.adFree ? "Paket" : "Reklam"}</span>${label}${sub ? `<small>${sub}</small>` : ""}</button>`;

/* ---- Yerleşimler ---- */
export function adDoubleHTML(bonus) {
  return bonus > 0 && !window.__SIM ? adBtn("ad-x2", `Primi ikiye katla · +${fmt(bonus)}`, "Kısa bir reklam izle") : "";
}
export function bindAdDouble(bonus) {
  const b = $("#ad-x2");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    if (await showRewarded("double_bonus")) {
      tx("Maç primi · reklam bonusu", bonus);
      save();
      b.outerHTML = `<div class="say" style="border-left-color:var(--good)">Prim ikiye katlandı: +${fmt(bonus)}</div>`;
    } else b.disabled = false;
  };
}
export function adEnergyHTML() {
  const wk = `${S.season}-${S.week}`;
  if (S.adEnergyWk !== wk) {
    S.adEnergyWk = wk;
    S.adEnergyN = 0;
  }
  if (window.__SIM || S.energy >= 60 || S.adEnergyN >= ADS_CFG.energyPerWeek) return "";
  return `<div class="card"><div class="row between nowrap"><div><div class="eyebrow">Enerjin düşük · ${S.energy}</div><p class="small muted" style="margin:2px 0 0">Bu hafta ${ADS_CFG.energyPerWeek - S.adEnergyN} kez kullanılabilir.</p></div></div>${adBtn("ad-en", "+30 enerji", "Kısa bir reklam izle")}</div>`;
}
export function bindAdEnergy(after) {
  const b = $("#ad-en");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    if (await showRewarded("energy")) {
      S.adEnergyN++;
      S.energy += 30;
      norm();
      save();
      toast("+30 enerji");
      after && after();
    } else b.disabled = false;
  };
}
export function adHealHTML() {
  return !window.__SIM && S.injury && S.injury.w > 1 && !S.injury.adHealed
    ? adBtn("ad-heal", "İyileşmeyi 1 hafta kısalt", "Sakatlık başına bir kez · kısa bir reklam")
    : "";
}
export function bindAdHeal(after) {
  const b = $("#ad-heal");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    if (await showRewarded("heal")) {
      S.injury.w--;
      S.injury.adHealed = true;
      save();
      toast("Fizyoterapist ek seans ayarladı: bir hafta erken dönüyorsun.");
      after && after();
    } else b.disabled = false;
  };
}
export function adHalfHTML() {
  return window.__SIM || M.adHalf ? "" : adBtn("ad-half", "Soyunma odası konuşması", "+10 enerji · +4 moral · kısa bir reklam");
}
export function bindAdHalf() {
  const b = $("#ad-half");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true;
    if (await showRewarded("halftime")) {
      M.adHalf = true;
      S.energy += 10;
      S.moral += 4;
      norm();
      b.outerHTML = `<div class="say" style="border-left-color:var(--good)">Koçun konuşması takımı ateşledi: +10 enerji, +4 moral.</div>`;
    } else b.disabled = false;
  };
}

/* ---- Ayarlar bölümü ---- */
export function adsSettingsHTML() {
  const total = Object.values(ADS.stats).reduce((a, s) => a + s.done, 0);
  return `<div class="act"><div><h3>Reklamlar</h3><p>${ADS.adFree ? "Reklamsız paket etkin: geçiş reklamı yok, ödüller reklamsız verilir." : `Bugün kalan ödüllü reklam: ${rewardLeft()}. Toplam izlenen: ${total}.`}</p></div><div class="grid2" style="grid-column:1/-1"><button class="btn ghost sm" id="ad-cons">Kişiselleştirme: ${ADS.consent ? "Açık" : "Kapalı"}</button>${ADS.adFree ? "" : `<button class="btn team sm" id="ad-free">Reklamsız paket</button>`}</div></div>`;
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
      if (await window.PotaStore.buy("adfree")) {
        ADS.adFree = true;
        adsSave();
        toast("Teşekkürler! Reklamsız paket etkin.");
        re && re();
      }
    } catch (e) {
      toast("Satın alma tamamlanamadı.");
    }
    return;
  }
  sheet(
    "Reklamsız paket",
    "Mağaza sürümünde",
    `<p>Reklamsız paket tek seferlik bir satın alma: geçiş reklamları tamamen kapanır, ödüllü reklamların ödülleri reklam izlemeden verilir.</p><p class="small muted">Satın alma Google Play ve App Store sürümlerinde açılacak. Web sürümünde kullanılamıyor.</p><button class="btn pri" id="af-ok">Tamam</button>`
  );
  $("#af-ok").onclick = () => {
    closeSheet();
    settingsSheet();
  };
}
