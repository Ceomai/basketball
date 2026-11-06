/* ================= ERİŞİLEBİLİRLİK: EKRAN OKUYUCU =================
   - Canlı skor: maç ekranında görünmeyen bir aria-live bölgesi; yalnızca skor değişince (ve çeyrek başında) okunur.
     Skor tabelası her hücumda yeniden çizildiği için tabelanın kendisi canlı bölge yapılmaz (sürekli okurdu).
   - Ana ekran ikonları: ayarlar/kayıt düğmelerine ve harita düğmelerine erişilebilir ad (aria-label).
   Yazı boyutu, renk körlüğü ve yüksek kontrast: src/systems.js applyA11y + index.html (html.fs-*, html.cb, html.hc). */
import { t as $t } from "./i18n/index.js";
import { Bus } from "./data.js";
import { S } from "./core.js";
import { M } from "./match.js";

let lastSay = "";
/** Skor tabelası güncellenince (src/match.js updBug) çağrılır */
export function a11yScore() {
  if (window.__SIM || !M || !M.opp || !S || !S.team) return;
  const mv = document.getElementById("mstat");
  if (!mv) return; // simüle maçın tabelası yok sayılır
  let live = document.getElementById("a11y-live");
  if (!live) {
    live = document.createElement("div");
    live.id = "a11y-live";
    live.className = "sr-only";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    document.body.appendChild(live);
  }
  const say = $t("a11y.score", { t: S.team.short, us: M.us, o: M.opp.short, them: M.them, q: M.q });
  if (say === lastSay) return;
  lastSay = say;
  live.textContent = say;
}
Bus.on("match:start", () => (lastSay = ""));

// ana ekran: portre düğmesi (görünüm/stil) metinsizdir: ad, rol ve klavye
Bus.on("screen:main", () => {
  const hav = document.getElementById("hav");
  if (!hav || hav.getAttribute("role")) return;
  hav.setAttribute("role", "button");
  hav.setAttribute("aria-label", $t("sty.title"));
  hav.tabIndex = 0;
  hav.onkeydown = e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      hav.click();
    }
  };
});
