/* ================= İLK MAÇ REHBERİ =================
   Kariyerin ilk elle oynanan maçında bir kez: hız düğmeleri → karar anı → mini oyun → mola, adım adım baloncuklar.
   Hedef öğe altın çerçeveyle vurgulanır; baloncuk hedefin karşı yarısına (üst/alt) yerleşir ve oyunu durdurmaz,
   altındaki düğmeleri kapatmaz (karar anında seçim yapılınca adım kendiliğinden geçer). "Geç" hepsini kapatır.
   S.mtut = 1: görüldü. Simüle maçta, denge simülasyonunda ve eski kariyerlerde (karar anı ipucu görülmüşse) çıkmaz;
   testler S.tipMoment = 1 ile kariyer başlattığı için el-oyun döngüleri etkilenmez. */
import { t as $t } from "./i18n/index.js";
import { Bus } from "./data.js";
import { S } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

// [adım, vurgulanacak öğe, adımın başlaması için beklenen öğe]; karar anı ve mini oyun beklemez (oyuncu hamlesi
// gerekir): hız/mola baloncuğu açıkken gelirlerse öne geçer, hız/mola sonra gösterilir
const STEPS = {
  speed: ["#spd", "#spd [data-s]"],
  moment: ["#mview .sit", "#mview .sit .choice[data-k]"],
  mini: ["#mview .stage", "#mview .stage canvas"],
  to: ["#to-btn", "#to-btn"]
};
const ORDER = ["speed", "moment", "mini", "to"];
const ACTION = ["moment", "mini"];
let T = null;
const $q = s => document.querySelector(s);

function clear() {
  document.querySelectorAll(".mt-hl").forEach(x => x.classList.remove("mt-hl"));
  const b = $q("#mt-bub");
  if (b) b.remove();
  if (T) T.el = T.cur = null;
}
/** Rehberi bitir (tamamlandı, geçildi ya da maç bitti) */
export function mtutEnd() {
  if (!T) return;
  if (T.obs) T.obs.disconnect();
  clear();
  T = null;
  if (S) {
    S.mtut = 1;
    save();
  }
}
function next() {
  if (!T) return;
  T.todo = T.todo.filter(k => k !== T.cur);
  clear();
  if (!T.todo.length) return mtutEnd();
  check();
}
function show(id, el) {
  T.cur = id;
  T.el = el;
  el.classList.add("mt-hl");
  if (!ACTION.includes(id))
    try {
      el.scrollIntoView({ block: "center" });
    } catch (e) {
      /* eski tarayıcı */
    }
  const r = el.getBoundingClientRect(),
    top = id === "moment" || (id !== "mini" && r.top + r.height / 2 > innerHeight * 0.5); // seçenekler kapanmasın
  const b = document.createElement("div");
  b.id = "mt-bub";
  b.className = "card mt-bub";
  b.setAttribute("role", "dialog");
  b.setAttribute("aria-live", "polite");
  b.setAttribute("aria-label", $t("mt.title"));
  b.style.cssText = top ? "top:calc(12px + env(safe-area-inset-top,0px))" : "bottom:calc(12px + env(safe-area-inset-bottom,0px))";
  const n = ORDER.length - T.todo.length + 1,
    last = T.todo.length === 1;
  b.innerHTML = `<div class="eyebrow">${$t("mt.title")} · ${n}/${ORDER.length}</div><h3>${$t(`mt.${id}`)}</h3><p class="small">${$t(`mt.${id}D`)}</p><div class="grid2"><button class="btn ghost sm" id="mt-skip">${$t("mt.skip")}</button><button class="btn pri sm" id="mt-next">${last ? $t("mt.done") : $t("mt.next")}</button></div>`;
  document.body.appendChild(b);
  $q("#mt-skip").onclick = mtutEnd;
  $q("#mt-next").onclick = next;
  if (late.sfx) late.sfx("notify");
}
const ready = k => T.todo.includes(k) && !!$q(STEPS[k][1]);
function check() {
  if (!T) return;
  if (!$q("#mstat")) return mtutEnd(); // maç ekranından çıkıldı
  if (T.el) {
    if (ACTION.includes(T.cur)) {
      if (!document.contains(T.el)) next(); // seçim yapıldı / mini oyun bitti: adım tamam
      return;
    }
    const act = ACTION.find(ready);
    if (act)
      clear(); // karar anı geldi: hız/mola anlatımı sonra
    else {
      if (!document.contains(T.el)) {
        const again = $q(STEPS[T.cur][0]); // hız/mola düğmeleri yeniden çizilir: vurgu taşınır
        if (again) (T.el = again).classList.add("mt-hl");
      }
      return;
    }
  }
  const k = ACTION.find(ready) || T.todo.find(ready);
  if (k) {
    const el = $q(STEPS[k][0]);
    if (el) show(k, el);
    return;
  }
  // mola hakkı yoksa (düğme yok) ve geriye yalnız mola kaldıysa rehber biter
  if (T.todo.length === 1 && T.todo[0] === "to" && $q("#spd [data-s]")) mtutEnd();
}
Bus.on("match:start", ctx => {
  if (T) mtutEnd();
  if (window.__SIM || !S || S.mtut || S.tipMoment || (ctx && ctx.auto)) return;
  T = { todo: ORDER.slice(), cur: null, el: null, raf: 0 };
  T.obs = new MutationObserver(() => {
    if (!T || T.raf) return;
    T.raf = requestAnimationFrame(() => {
      if (!T) return;
      T.raf = 0;
      check();
    });
  });
  T.obs.observe(document.body, { childList: true, subtree: true });
});
Bus.on("match:end", () => mtutEnd());
/** Rehber şu an açık mı (testler) */
export const mtutActive = () => !!T;
