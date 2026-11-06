import { t as $t } from "./i18n/index.js";
/* ================= GÖRSEL CİLA =================
   1) Ana ekran portresi: periyodik göz kırpma (~4 sn'de bir 120 ms), moral yüksekse ara sıra gülümseme,
      düşükse hafif üzgün ağız. Düşük grafik modunda ve "hareketi azalt" tercihinde kapalı.
      Tek bir zamanlayıcı: ana ekran her çizildiğinde öncekini durdurur, portre DOM'dan çıkınca kendini kapatır.
   2) Harita atmosferi (src/map.js mapSVG çağırır): zaman dilimine göre ince ışık tonu, akşam/gece arka
      siluette pencere ışıkları, haftaya kararlı bağlı ara sıra yağmur (düşük grafikte statik).
   3) Kupa dolabı (Ev → Vitrin): kupalar raflarda tek tek, türüne göre ikon/renk, boş raflar, dokununca etiket. */
import { $, $$, Bus, esc, hash, toast } from "./data.js";
import { S, jersey } from "./core.js";
import { icon, portrait } from "./art.js";
import { SETTINGS } from "./systems.js";
import { late } from "./late.js";

/* ---------- ortak ---------- */
export function polReduced() {
  let rm = false;
  try {
    rm = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    rm = false;
  }
  return !!SETTINGS.lowfx || rm;
}

/* ---------- 1) portre animasyonu ---------- */
const PA = { timer: 0, frames: 0, cycle: 0, mood: "" };
export function polPortraitStop() {
  clearTimeout(PA.timer);
  PA.timer = 0;
}
/** Moral → temel ifade: yüksekse gülen, orta-düşükte hafif üzgün, çok düşükte üzgün */
export function polBaseMood(moral) {
  return moral > 45 ? "mutlu" : moral > 25 ? "hafif" : "uzgun";
}
function paint(host, o) {
  const old = host.querySelector("canvas");
  if (!old || !S) return false;
  const cv = portrait(S.look, { ...jersey(), ...o }, 42, 42, S.team.c1);
  old.replaceWith(cv);
  PA.frames++;
  PA.mood = o.mood + (o.blink ? "+blink" : "");
  return true;
}
export function polPortraitStart() {
  polPortraitStop();
  const host = $("#hav");
  if (!host || !S || window.__SIM || polReduced()) return false;
  PA.cycle = 0;
  const base = () => polBaseMood(S.moral);
  const alive = () => host.isConnected && host.querySelector("canvas");
  const step = () => {
    PA.timer = 0;
    if (!alive()) return polPortraitStop();
    PA.cycle++;
    const m = base();
    // moral yüksekse her üçüncü döngüde kısa bir gülümseme
    if (S.moral >= 70 && PA.cycle % 3 === 0) {
      paint(host, { mood: "gulumse" });
      PA.timer = setTimeout(() => {
        if (!alive()) return polPortraitStop();
        paint(host, { mood: m });
        schedule();
      }, 1400);
      return;
    }
    paint(host, { mood: m, blink: true });
    PA.timer = setTimeout(() => {
      if (!alive()) return polPortraitStop();
      paint(host, { mood: m });
      schedule();
    }, 120);
  };
  const schedule = () => (PA.timer = setTimeout(step, 3400 + Math.random() * 1200));
  paint(host, { mood: base() }); // hafif üzgün ağız ilk karede (çekirdek "mutlu/uzgun" çizer)
  schedule();
  return true;
}
/** test/hata ayıklama */
export function polPortraitState() {
  return { running: !!PA.timer, frames: PA.frames, mood: PA.mood };
}
Bus.on("screen:main", () => polPortraitStart());

/* ---------- 2) harita atmosferi ---------- */
/** Bu hafta yağmur var mı? Sezon + hafta + şehir tohumuna kararlı bağlı (~%20). */
export function polRainy(seed = 0) {
  if (!S) return false;
  return hash(`yagmur|${S.season || 1}|${S.week || 1}|${seed}`) % 100 < 20;
}
export function polWeather() {
  const tod = ["night", "evening", "afternoon", "morning"][Math.max(0, Math.min(3, (S && S.slot) || 0))];
  return { tod, rain: polRainy(late.cityTheme && S ? late.cityTheme(S.city).seed : 0) };
}
/** layer "sky": arka silüette pencere ışıkları; layer "top": ışık tonu + yağmur (tıklamayı geçirir) */
export function polMapSVG(layer, tod, seed, base) {
  let g = "";
  const lit = tod === "evening" || tod === "night";
  if (layer === "sky") {
    if (!lit) return "";
    for (let i = 0; i < 22; i++) {
      const x = i * 19 + ((seed >> i) % 7),
        h = 10 + (((seed >> (i % 13)) * 7 + i * 31) % 38);
      for (let j = 0; j < 3; j++) {
        if ((i * 5 + j * 3 + seed) % 4 === 0 || 6 + j * 8 > h) continue;
        g += `<rect x="${x + 3 + (j % 2) * 6}" y="${base - h + 4 + j * 8}" width="2.4" height="3" fill="#ffd27a" opacity="${tod === "night" ? 0.75 : 0.55}"/>`;
      }
    }
    return `<g class="pol-winlit">${g}</g>`;
  }
  // ince ışık tonu: sabah serin-altın, öğle sıcak; akşam/gece için map.js zaten koyu tonu ekliyor
  const tint = { morning: ["#ffe6b0", 0.07], afternoon: ["#ff9d4d", 0.08] }[tod];
  if (tint) g += `<rect width="400" height="670" fill="${tint[0]}" opacity="${tint[1]}"/>`;
  if (polRainy(seed)) {
    const still = polReduced();
    let lines = "";
    for (let i = 0; i < 70; i++) {
      const x = (i * 61 + seed * 3) % 420,
        y = (i * 97 + seed) % 710;
      lines += `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + 14}"/>`;
    }
    g += `<rect width="400" height="670" fill="#1b2a3c" opacity=".14"/><g class="pol-rain" stroke="#cfe3f3" stroke-opacity=".38" stroke-width="1" stroke-linecap="round">${
      still
        ? `<g>${lines}</g>`
        : `<g>${lines}<animateTransform attributeName="transform" type="translate" from="0 -40" to="-14 0" dur=".55s" repeatCount="indefinite"/></g>`
    }</g>`;
  }
  return g ? `<g class="pol-atmos" pointer-events="none">${g}</g>` : "";
}

/* ---------- 3) kupa dolabı ---------- */
const CAB = {
  champ: ["cup", "#d8b25a"],
  lise: ["cup", "#c0c7cf"],
  cup: ["cup", "#e08a3c"],
  super: ["cup", "#9fa8da"],
  ec: ["cup", "#4fc3f7"],
  el: ["cup", "#ffb300"],
  mvp: ["plaque"],
  award: ["plaque"],
  final: ["medal", "#b0bec5"],
  nat_gold: ["medal", "#d8b25a"],
  nat_silver: ["medal", "#cfd8dc"],
  nat_bronze: ["medal", "#c47a3a"],
  arcade: ["joystick"],
  street: ["ball"],
  skill: ["star"]
};
export function polCabinetIcon(t) {
  return CAB[t.type] || (late.trophyIcon ? late.trophyIcon(t) : ["cup", "#c0c7cf"]);
}
const PER = 5;
export function polCabinetHTML() {
  const tr = (S.career && S.career.trophies) || [];
  const rows = Math.max(3, Math.ceil(tr.length / PER) + (tr.length % PER ? 0 : 1)), // her zaman en az bir boş yer
    W = 300,
    RH = 64,
    H = rows * RH + 24;
  let g = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="10" fill="#4e342e" stroke="#141414" stroke-width="2"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="4" fill="#1d1612"/>`;
  for (let r = 0; r < rows; r++) {
    const y = 12 + (r + 1) * RH - 6;
    g += `<rect x="12" y="${y}" width="${W - 24}" height="6" fill="#8d6e63"/><rect x="12" y="${y + 6}" width="${W - 24}" height="2" fill="#3e2723"/>`;
    for (let k = 0; k < PER; k++) {
      const i = r * PER + k,
        x = 22 + k * 53;
      const t = tr[i];
      if (!t) {
        g += `<ellipse cx="${x + 22}" cy="${y - 2}" rx="14" ry="2.5" fill="#000" opacity=".25"/>`;
        continue;
      }
      const ic = icon(...polCabinetIcon(t)).replace("<svg", `<svg x="${x}" y="${y - 48}" width="46" height="46"`);
      g += `<g class="pol-tr" data-ptr="${i}" tabindex="0" role="button" aria-label="${esc(t.label)}" style="cursor:pointer"><ellipse cx="${x + 23}" cy="${y - 1}" rx="16" ry="3" fill="#000" opacity=".35"/>${ic}<rect x="${x}" y="${y - 50}" width="46" height="50" fill="transparent"/></g>`;
    }
  }
  // cam yansıması
  g += `<path d="M30 14 L70 14 L20 ${H - 14} L12 ${H - 14} L12 40Z" fill="#fff" opacity=".05" pointer-events="none"/><path d="M${W - 40} 14 L${W - 26} 14 L${W - 90} ${H - 14} L${W - 104} ${H - 14}Z" fill="#fff" opacity=".04" pointer-events="none"/>`;
  return `<div class="card" id="pol-cab"><div class="row between"><div class="eyebrow">${$t("places.11")}</div><span class="pill">${$t("pol.cabCount", { n: tr.length })}</span></div>
  <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:360px;display:block;margin:6px auto 0" role="group" aria-label="${esc($t("pol.cabTitle"))}" xmlns="http://www.w3.org/2000/svg">${g}</svg>
  <div class="small ${tr.length ? "" : "muted"}" id="pol-cab-lbl" aria-live="polite" style="text-align:center;min-height:1.3em">${tr.length ? $t("pol.cabTap") : $t("places.7")}</div></div>`;
}
export function polBindCabinet() {
  const tr = (S.career && S.career.trophies) || [];
  $$(".pol-tr").forEach(el => {
    const show = () => {
      const t = tr[+el.dataset.ptr];
      if (!t) return;
      const l = $("#pol-cab-lbl");
      if (l) {
        l.classList.remove("muted");
        l.innerHTML = `<b>${esc(t.label)}</b>`;
      } else toast(t.label);
      $$(".pol-tr").forEach(x => x.setAttribute("opacity", x === el ? "1" : ".55"));
    };
    el.onclick = show;
    el.onkeydown = e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        show();
      }
    };
  });
}
