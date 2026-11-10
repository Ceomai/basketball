/* ================= KİŞİSELLEŞTİRME (Ev → Tasarım, Vitrin dekoru, tema) =================
   - Ayakkabı tasarımcısı: iki renk, desen, logo (sponsor varsa sponsor logolu ayakkabı → sponsor ilişkisi +1/hafta).
     Sahada oyuncunun altında ve kariyer kartında görünür.
   - Forma: sırttaki ad (soyad/ad/takma ad/baş harfler), numara, yazı tipi. Takım değişince "yeni forma" anı.
   - Kutlama hareketi: sayıdan sonra kısa animasyon; yenileri kupalarla ve başarımlarla açılır.
   - Ev dekoru: iki poster, bir halı (konfor +1/+1/+2).
   - Arayüz temaları: gece, retro arcade, minimal (başarımla ya da reklamsız paketle açılır).
   Açılabilir kozmetikler başarımlara bağlıdır (src/feats.js → cosOpen). */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, esc, fmt, toast, PRIO } from "./data.js";
import { icon } from "./art.js";
import { S, closeSheet, norm, sheet, tx } from "./core.js";
import { SETTINGS, saveSettings } from "./systems.js";
import { save } from "./save.js";
import { late } from "./late.js";
import { THEME_TOKENS, hex6 } from "./theme.js";

/* ---- Katalog ---- */
const BASE_COLORS = ["#ffffff", "#141414", "#c8102e"];
const SC = {
  sc1: "#ff6a2b",
  sc2: "#2f63c7",
  sc3: "#36d38e",
  sc4: "#ffc54d",
  sc5: "#7e57c2",
  sc6: "#d8b25a",
  sc7: "#00bcd4",
  sc8: "#ff4fa3",
  sc9: "#8d6e63",
  sc10: "#b0bec5"
};
const PATS = { solid: null, stripe: "pt1", split: "pt2", dots: "pt3", flame: "pt4", zig: "pt5", grad: "pt6" };
const LOGOS = { pk: null, none: null, star: "lg1", bolt: "lg2", crown: "lg3", wing: "lg4", fire: "lg5" };
export const CELEBS = {
  fist: null,
  shimmy: "c1",
  archer: "c2",
  shh: "c3",
  flex: "c4",
  plane: "c5",
  crown: "c6",
  dance: "c7",
  salute: "c8",
  heart: "c9",
  rock: "c10",
  and1: "c-and1",
  buzz: "c-buzz"
};
const POSTERS = {
  p1: ["ball", "#ff6a2b"],
  p2: ["hoop", "#2f63c7"],
  p3: ["star", "#7e57c2"],
  p4: ["hoodie", "#36a3d3"],
  p5: ["whistle", "#455a64"],
  p6: ["camera", "#c2185b"],
  p7: ["mic", "#00897b"],
  p8: ["cup", "#d8b25a"],
  "p-cb": ["medal", "#e53935"]
};
const RUGS = { r1: "#ff8a3d", r2: "#c58b4a", r3: "team", r4: "#8e2430", r5: "#283593", r6: "#d8b25a" };
const FONTS = {
  classic: [null, '"Barlow Condensed","Arial Narrow",sans-serif'],
  block: ["jf1", "Impact,'Arial Black',sans-serif"],
  script: ["jf2", "'Brush Script MT','Segoe Script',cursive"],
  stencil: ["jf3", "'Stencil','Courier New',monospace"],
  retro: ["jf4", "Georgia,'Times New Roman',serif"]
};
const THEMES = ["default", "night", "retro", "minimal"];
const open = cos => !cos || (late.cosOpen ? late.cosOpen(cos) : false);

/** Kozmetik etiketi (başarım ekranında ödül adı) */
export function cosLabel(cos) {
  if (SC[cos]) return $t("cu.shoeColor");
  const f = (o, pre) => Object.entries(o).find(([, v]) => (Array.isArray(v) ? v[0] === cos : v === cos));
  let e;
  if ((e = f(PATS))) return `${$t("cu.pattern")}: ${$t(`cu.pat.${e[0]}`)}`;
  if ((e = f(LOGOS))) return `${$t("cu.logo")}: ${$t(`cu.logo.${e[0]}`)}`;
  if ((e = f(CELEBS))) return `${$t("cu.celeb")}: ${$t(`cu.cb.${e[0]}`)}`;
  if ((e = f(FONTS))) return `${$t("cu.font")}: ${$t(`cu.font.${e[0]}`)}`;
  if (POSTERS[cos]) return `${$t("cu.poster")}: ${$t(`cu.ps.${cos}`)}`;
  if (RUGS[cos]) return `${$t("cu.rug")}: ${$t(`cu.rg.${cos}`)}`;
  if (THEMES.includes(cos)) return `${$t("cu.theme")}: ${$t(`cu.th.${cos}`)}`;
  return cos;
}

/* ---- Ayakkabı ---- */
const shoe = () => (S.shoe = Object.assign({ c1: "#ffffff", c2: "#c8102e", pat: "solid", logo: "pk" }, S.shoe || {}));
const deal = () => (S && S.sponsorDeal && S.season <= S.sponsorDeal.until ? S.sponsorDeal : null);
const UPPER = "M4 23 L6 13 Q8 6 16 7 L25 9 Q29 4 36 6 L40 14 Q50 15 56 19 L57 25 L4 25 Z";
const LOGO_P = {
  star: "M30 11 L31.8 15.2 L36 15.4 L32.8 18 L33.9 22 L30 19.8 L26.1 22 L27.2 18 L24 15.4 L28.2 15.2 Z",
  bolt: "M32 10 L26 18 L30 18 L28 24 L35 15 L31 15 Z",
  crown: "M24 21 L25 13 L28 17 L30 12 L32 17 L35 13 L36 21 Z",
  wing: "M22 20 Q30 8 40 12 Q34 14 33 17 Q29 16 22 20 Z",
  fire: "M30 23 Q24 20 27 14 Q28 17 30 16 Q29 12 33 9 Q32 14 35 16 Q37 21 30 23 Z"
};
/** Ayakkabı SVG'si (yandan) */
export function shoeSVG(sh = S && S.shoe ? shoe() : { c1: "#fff", c2: "#c8102e", pat: "solid", logo: "pk" }, w = 120) {
  const id = "sh" + Math.random().toString(36).slice(2, 7);
  const p = {
    solid: "",
    stripe: `<path d="M10 25 L30 8 L36 8 L16 25 Z" fill="${sh.c2}"/>`,
    split: `<rect x="31" y="0" width="30" height="30" fill="${sh.c2}"/>`,
    dots: [12, 20, 28, 36, 44, 50].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 19 : 14}" r="1.8" fill="${sh.c2}"/>`).join(""),
    flame: `<path d="M4 25 Q10 14 14 19 Q16 10 22 17 Q25 9 30 16 Q34 11 38 18 Q44 14 48 21 L57 25 Z" fill="${sh.c2}"/>`,
    zig: `<polyline points="5,20 11,16 17,20 23,16 29,20 35,16 41,20 47,17 55,21" fill="none" stroke="${sh.c2}" stroke-width="2.4"/>`,
    grad: `<rect x="0" y="0" width="60" height="30" fill="url(#${id}g)"/>`
  }[sh.pat || "solid"];
  const sp = deal();
  // logo rengi gövdeyle aynıysa görünmez: zıt renge geç
  const lum = h => {
    const n = parseInt(String(h).slice(1), 16);
    return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
  };
  const base = sh.pat === "split" ? sh.c2 : sh.c1,
    want = sh.pat === "split" ? sh.c1 : sh.c2,
    lc = want.toLowerCase() === base.toLowerCase() ? (lum(base) > 140 ? "#141414" : "#ffffff") : want;
  const logo =
    sh.logo === "none"
      ? ""
      : sh.logo === "sponsor" && sp
        ? `<text x="33" y="20" text-anchor="middle" font-size="8" font-weight="900" font-family="Barlow Condensed" fill="${lc}" stroke="#141414" stroke-width=".4">${esc($t(`ag.b.${sp.b}`).slice(0, 4).toUpperCase())}</text>`
        : LOGO_P[sh.logo]
          ? `<path d="${LOGO_P[sh.logo]}" fill="${lc}" stroke="#141414" stroke-width=".6"/>`
          : `<text x="31" y="20" text-anchor="middle" font-size="7.5" font-weight="900" font-family="Barlow Condensed" fill="${lc}" stroke="#141414" stroke-width=".35">PK</text>`;
  return `<svg viewBox="0 0 61 31" width="${w}" height="${Math.round((w * 31) / 61)}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}"><path d="${UPPER}"/></clipPath><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${sh.c1}"/><stop offset="1" stop-color="${sh.c2}"/></linearGradient></defs><path d="${UPPER}" fill="${sh.c1}"/><g clip-path="url(#${id})">${p}</g>${logo}<path d="${UPPER}" fill="none" stroke="#141414" stroke-width="1.4" stroke-linejoin="round"/><path d="M3 25 L58 25 Q58 29.5 54 29.5 L6 29.5 Q3 29.5 3 25 Z" fill="#f4f4f4" stroke="#141414" stroke-width="1.2"/><path d="M15 9 L19 14 M19 8.6 L23 13.5 M23 8.8 L26.5 13" stroke="#141414" stroke-width=".9"/></svg>`;
}
/** Sahadaki küçük ayakkabı izi (oyuncu noktasının altına) */
export const courtShoe = () => {
  const sh = S && S.shoe ? shoe() : null;
  return sh
    ? `<rect x="-8" y="9" width="7" height="3.5" rx="1.5" fill="${sh.c1}" stroke="${sh.c2}" stroke-width="1.2"/><rect x="1" y="9" width="7" height="3.5" rx="1.5" fill="${sh.c1}" stroke="${sh.c2}" stroke-width="1.2"/>`
    : "";
};
Bus.on("week:start", () => {
  const d = deal();
  if (d && S.shoe && S.shoe.logo === "sponsor") d.rel = Math.min(100, (d.rel ?? 60) + 1);
});

/* ---- Forma ---- */
export const jFont = () => (FONTS[S && S.jfont] || FONTS.classic)[1];
export function jName() {
  const m = S.jname || "last";
  if (m === "first") return S.first;
  if (m === "init") return `${S.first[0] || ""}.${S.last[0] || ""}.`;
  if (m === "nick") return S.jnick || S.last;
  return S.last;
}
/** Forma sırtı SVG'si */
export function jerseyBackSVG(w = 140, team = S.team) {
  const c1 = team.c1,
    c2 = team.c2,
    f = jFont(),
    nm = esc(String(jName()).toUpperCase().slice(0, 12));
  return `<svg viewBox="0 0 100 110" width="${w}" height="${Math.round(w * 1.1)}" xmlns="http://www.w3.org/2000/svg"><path d="M28 4 Q50 14 72 4 L96 18 L86 40 L78 36 L78 106 L22 106 L22 36 L14 40 L4 18 Z" fill="${c1}" stroke="#141414" stroke-width="2.2" stroke-linejoin="round"/><path d="M28 4 Q50 14 72 4" fill="none" stroke="${c2}" stroke-width="4"/><path d="M22 36 L22 106 M78 36 L78 106" stroke="${c2}" stroke-width="3"/><text x="50" y="33" text-anchor="middle" font-size="${nm.length > 8 ? 9 : 11}" font-weight="800" font-family="${esc(f)}" fill="${c2}" stroke="#141414" stroke-width=".4">${nm}</text><text x="50" y="82" text-anchor="middle" font-size="44" font-weight="900" font-family="${esc(f)}" fill="${c2}" stroke="#141414" stroke-width="1.2">${S.num}</text></svg>`;
}
// takım değişince: yeni formayı ilk kez giyme anı (ilk takımda gösterilmez)
export function newJersey() {
  if (!S || !S.team) return false;
  if (!S.jTeam) {
    S.jTeam = S.team.name;
    return false;
  }
  if (S.jTeam === S.team.name) return false;
  S.jTeam = S.team.name;
  S.moral += 3;
  S.followers = Math.round(S.followers * 1.01);
  norm();
  if (window.__SIM) return false;
  sheet(
    $t("cu.newJ"),
    $t("cu.newJSub", { team: S.team.name }),
    `${late.transferNight ? late.transferNight() : ""}<div class="card" style="align-items:center;text-align:center"><div>${jerseyBackSVG(150)}</div><p>${$t("cu.newJTxt", { team: esc(S.team.name), num: S.num, name: esc(jName()) })}</p><div class="fx"><span class="p">${$t("cu.newJFx")}</span></div></div><button class="btn pri" id="jy-ok">${$t("cu.newJOk")}</button>`
  );
  $("#jy-ok").onclick = () => closeSheet();
  return true;
}
Bus.offer("week:sheet", newJersey, PRIO.newJersey, "now");

/* ---- Kutlama ---- */
// basit çöp adam pozları: [sol kol, sağ kol] uç noktaları (omuz 0,-14)
const POSE = {
  fist: [
    [-8, -6],
    [6, -28]
  ],
  shimmy: [
    [-12, -10],
    [12, -10]
  ],
  archer: [
    [-14, -16],
    [10, -14]
  ],
  shh: [
    [-8, -4],
    [2, -22]
  ],
  flex: [
    [-12, -22],
    [12, -22]
  ],
  plane: [
    [-16, -14],
    [16, -14]
  ],
  crown: [
    [-4, -28],
    [4, -28]
  ],
  dance: [
    [-12, -26],
    [10, -4]
  ],
  salute: [
    [-8, -4],
    [4, -24]
  ],
  heart: [
    [-4, -12],
    [4, -12]
  ],
  rock: [
    [-10, -26],
    [10, -26]
  ],
  and1: [
    [-14, -24],
    [14, -24]
  ],
  buzz: [
    [-6, -30],
    [6, -30]
  ]
};
const poseSVG = (k, w = 44) => {
  const [[lx, ly], [rx, ry]] = POSE[k] || POSE.fist;
  const sk = S && S.look ? S.look.skin || "#d9a477" : "#d9a477",
    hair = S && S.look ? S.look.hair || "#2b1b12" : "#2b1b12",
    c1 = S && S.team ? S.team.c1 : "#c8102e",
    c2 = S && S.team ? S.team.c2 : "#ffffff",
    sh = S && S.shoe ? S.shoe.c1 : "#ffffff";
  return `<svg viewBox="-20 -42 40 56" width="${w}" height="${Math.round(w * 1.4)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M-3 -2 L-7 11 M3 -2 L7 11" stroke="${sk}" stroke-width="3.6" stroke-linecap="round"/><rect x="-10" y="10" width="6" height="3" rx="1.5" fill="${sh}" stroke="#141414" stroke-width=".8"/><rect x="4" y="10" width="6" height="3" rx="1.5" fill="${sh}" stroke="#141414" stroke-width=".8"/><path d="M-6 -6 L6 -6 L7 1 L-7 1 Z" fill="${c2}" stroke="#141414" stroke-width="1.2"/><path d="M-5 -20 L${lx} ${ly} M5 -20 L${rx} ${ry}" stroke="${sk}" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M-6 -22 L6 -22 L6 -6 L-6 -6 Z" fill="${c1}" stroke="#141414" stroke-width="1.3" stroke-linejoin="round"/><text x="0" y="-10" text-anchor="middle" font-size="7" font-weight="900" font-family="Barlow Condensed" fill="${c2}">${S ? S.num : ""}</text><circle cx="0" cy="-30" r="6.5" fill="${sk}" stroke="#141414" stroke-width="1.4"/><path d="M-6.5 -31 Q0 -40 6.5 -31 Q0 -35 -6.5 -31 Z" fill="${hair}" stroke="#141414" stroke-width=".8"/></svg>`;
};
export const celebOpen = k => k in CELEBS && open(CELEBS[k]);
/** Sayıdan sonra kutlama (kendin oynarken) */
export function celebrate() {
  if (!S) return;
  const k = celebOpen(S.celeb) ? S.celeb || "fist" : "fist";
  late.featCount && late.featCount("celeb");
  const host = $("#mcourt") || $("#mview");
  // düşük grafikte yok; "hareketi azalt"ta yalnız belirip kaybolur (index.html reduce kuralı)
  if (!host || SETTINGS.lowfx) return;
  host.style.position = "relative";
  const d = document.createElement("div");
  d.className = `celeb cb-${k}`;
  d.innerHTML = `${poseSVG(k)}<b>${$t(`cu.cb.${k}`)}</b>`;
  host.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}

/* ---- Ev dekoru ---- */
const decor = () => (S.decor = Object.assign({ p1: null, p2: null, rug: null }, S.decor || {}));
export const decorComfort = () => (S && S.decor ? (S.decor.p1 ? 1 : 0) + (S.decor.p2 ? 1 : 0) + (S.decor.rug ? 2 : 0) : 0);
const posterSVG = (id, x, sc = 1) => {
  const [ic, bg] = POSTERS[id];
  return `<g transform="translate(${x},10) scale(${sc})"><rect width="46" height="58" rx="2" fill="#f5efe0" stroke="#141414" stroke-width="2"/><rect x="4" y="4" width="38" height="50" fill="${bg}"/><g transform="translate(7,11) scale(.5)">${icon(ic).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g></g>`;
};
/** Vitrin sahnesinin üstüne poster ve halı katmanı */
export function decorOverlay() {
  const d = S && S.decor;
  if (!d || !(d.p1 || d.p2 || d.rug)) return "";
  const rc = d.rug ? (RUGS[d.rug] === "team" ? S.team.c1 : RUGS[d.rug]) : null;
  return `<svg viewBox="0 0 300 225" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" xmlns="http://www.w3.org/2000/svg">${rc ? `<ellipse cx="112" cy="196" rx="84" ry="14" fill="${rc}" stroke="#141414" stroke-width="2"/><ellipse cx="112" cy="196" rx="60" ry="8" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>` : ""}${d.p1 ? posterSVG(d.p1, 22, 0.8) : ""}${d.p2 ? posterSVG(d.p2, 150, 0.8) : ""}</svg>`;
}
export function decorHTML() {
  const d = decor();
  const opt = (slot, list, cur) =>
    `<div class="opts" data-slot="${slot}"><button class="opt ${!cur ? "on" : ""}" data-v="">${$t("cu.none")}</button>${list
      .filter(k => open(k) && !(slot === "p1" && k === decor().p2) && !(slot === "p2" && k === decor().p1)) // aynı poster iki kez asılmaz
      .map(k => `<button class="opt ${cur === k ? "on" : ""}" data-v="${k}">${(slot === "rug" ? $t(`cu.rg.${k}`) : $t(`cu.ps.${k}`))}</button>`)
      .join("")}</div>`;
  const locked = [...Object.keys(POSTERS), ...Object.keys(RUGS)].filter(k => !open(k)).length;
  return `<div class="card"><div class="row between"><div class="eyebrow">${$t("cu.decor")}</div><span class="pill">${$t("cu.decorFx", { v: decorComfort() })}</span></div><div class="small muted">${$t("cu.decorSub")}</div>
   <div class="small muted">${$t("cu.poster")} 1</div>${opt("p1", Object.keys(POSTERS), d.p1)}
   <div class="small muted">${$t("cu.poster")} 2</div>${opt("p2", Object.keys(POSTERS), d.p2)}
   <div class="small muted">${$t("cu.rug")}</div>${opt("rug", Object.keys(RUGS), d.rug)}
   ${locked ? `<p class="small muted">${$t("cu.lockedN", { n: locked })}</p>` : ""}</div>`;
}
export function bindDecor(re) {
  $$("[data-slot] [data-v]").forEach(
    b =>
      (b.onclick = () => {
        const slot = b.closest("[data-slot]").dataset.slot;
        decor()[slot] = b.dataset.v || null;
        save();
        re();
      })
  );
}

/* ---- Tema ---- */
const THEME_CSS = `
/* gece: birincil düğme yazısı siyah (mor zeminde ≥4,5:1; #140a04 ile 4,49 kalıyordu, renk körü/yüksek kontrast dahil) */
html[data-theme=night]{--bg:#04050a;--bg2:#090b14;--card:#0e1120;--card2:#141a2e;--line:#1d2340;--line2:#2a3258;--gold:#a493ff;--hot:#7c5cff;--info:#6ea8ff;--on-hot:#000}
html[data-theme=retro]{--bg:#140a24;--bg2:#1c0f33;--card:#241445;--card2:#2e1a58;--line:#3d2470;--line2:#5a34a0;--gold:#ffd23f;--hot:#ff3fa4;--good:#3fffb0;--info:#3fd0ff;--team:#ff3fa4;--team-ink:#140a24}
html[data-theme=minimal]{--bg:#101010;--bg2:#131313;--card:#161616;--card2:#1c1c1c;--line:#242424;--line2:#303030;--gold:#e8e8e8;--hot:#fafafa;--info:#c4c4c4;--muted:#9a9a9a;--team:#e8e8e8;--team-ink:#111;--pri:#e8e8e8;--on-hot:#111}
html[data-theme=minimal] .card{box-shadow:none}
.celeb{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:var(--sp-half);pointer-events:none;animation:cbIn 1.5s ease forwards;z-index:3}
.celeb b{font-family:var(--display);font-size:var(--fs-base);letter-spacing:.8px;text-transform:uppercase;background:rgba(0,0,0,.55);color:#fff;border-radius:var(--r-sm);padding:1px var(--sp-2)}
.celeb svg{animation:cbMove .5s ease-in-out 3 alternate}
.cb-shimmy svg,.cb-dance svg{animation-name:cbShake}.cb-plane svg{animation-name:cbTilt}.cb-crown svg,.cb-buzz svg,.cb-and1 svg{animation-name:cbJump}
@keyframes cbIn{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}15%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-70%)}}
@keyframes cbMove{from{transform:translateY(0)}to{transform:translateY(-6px)}}
@keyframes cbShake{from{transform:translateX(-5px)}to{transform:translateX(5px)}}
@keyframes cbTilt{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}
@keyframes cbJump{from{transform:translateY(0) scale(1)}to{transform:translateY(-12px) scale(1.1)}}
#mstat:empty{display:none}
/* dikkat halkası: ::after halka büyüyüp söner (transform/opacity), 3 kez; sonra durgun kenarlık kalır */
.pulse{position:relative;border-color:var(--bad)!important}
.pulse::after{content:"";position:absolute;inset:-2px;border-radius:inherit;border:2px solid var(--bad);pointer-events:none;opacity:0;animation:pulseRing .9s var(--ease-out) 3}
@keyframes pulseRing{from{opacity:.75;transform:scale(1)}to{opacity:0;transform:scale(1.18)}}
.cbgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-2)}
.cbb{display:flex;flex-direction:column;align-items:center;gap:var(--sp-1);background:var(--card2);border:1px solid var(--line2);border-radius:var(--r-lg);padding:var(--sp-2) var(--sp-1);color:var(--text);cursor:pointer;min-width:0}
.cbb b{font-family:var(--display);font-size:var(--fs-md);letter-spacing:.5px;text-transform:uppercase;text-align:center}
.cbb.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)} .cbb:disabled{opacity:.45;cursor:default} .cbb span{text-align:center;font-size:var(--fs-2xs)}
.ft.on{border-color:var(--gold)} .fti{font-size:var(--fs-6xl);color:var(--gold);width:26px;text-align:center}
.ft:not(.on) .fti{color:var(--dim)} .ft:not(.on) h3{color:var(--muted)}
`;
(() => {
  try {
    const st = document.createElement("style");
    st.textContent = THEME_CSS;
    document.head.appendChild(st);
  } catch (e) {
    /* DOM yok */
  }
})();
export function applyTheme() {
  const th = SETTINGS.theme && SETTINGS.theme !== "default" && open(SETTINGS.theme) ? SETTINGS.theme : "default";
  try {
    if (th === "default") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = th;
  } catch (e) {
    /* DOM yok */
  }
  syncBarColor();
  return th;
}
/** Tarayıcı/uygulama durum çubuğu rengi = üst şerit zemini (--bg2). 3 haneli hex Android'de hata verebildiği için
    6 haneliye çevrilir. Tema ve yüksek kontrast değişince çağrılır. */
export function syncBarColor() {
  try {
    const c = hex6(getComputedStyle(document.documentElement).getPropertyValue("--bg2")) || THEME_TOKENS["--bg2"];
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", c);
    if (late.nativeBarColor) late.nativeBarColor(c);
    return c;
  } catch (e) {
    return null;
  }
}
setTimeout(applyTheme, 0); // başarımlar yüklendikten sonra

/* ---- Ev → Stil sekmesi: görünüm + tasarım alt sekmeleri ---- */
const fee = () => (late.styleFee ? late.styleFee() : 10);
const SUBS = ["look", "shoe", "jersey", "celeb", "theme"];
const subsHTML = sub =>
  `<div class="opts" id="cu-sub">${SUBS.map(k => `<button class="opt ${k === sub ? "on" : ""}" data-v="${k}">${$t(`cu.t.${k}`)}</button>`).join("")}</div>`;
export function stilTab(c, re) {
  if (!late.unlocked("tasarim")) return late.styleTab(c, re); // tasarım alt sekmeleri sonra açılır
  if (!SUBS.includes(S.cuTab) || S.cuTab === "look") {
    S.cuTab = "look";
    late.styleTab(c, re);
    c.insertAdjacentHTML("afterbegin", subsHTML("look"));
    $$("#cu-sub [data-v]").forEach(
      b =>
        (b.onclick = () => {
          S.cuTab = b.dataset.v;
          re();
        })
    );
    return;
  }
  designTab(c, re);
}
export function designTab(c, re) {
  const sub = (S.cuTab = ["shoe", "jersey", "celeb", "theme"].includes(S.cuTab) ? S.cuTab : "shoe");
  const subs = subsHTML(sub);
  const lockN = n => (n ? `<p class="small muted">${$t("cu.lockedN", { n })}</p>` : "");
  let body = "";
  if (sub === "shoe") {
    const d = (S.shoeDraft = S.shoeDraft || { ...shoe() });
    const colors = [...BASE_COLORS, ...Object.entries(SC).filter(([k]) => open(k)).map(([, v]) => v)];
    const sw = (id, cur) =>
      `<div class="opts" id="${id}">${colors.map(v => `<button class="sw ${cur === v ? "on" : ""}" style="background:${v}" data-v="${v}" aria-label="${v}"></button>`).join("")}</div>`;
    const op = (id, obj, cur, pre) =>
      `<div class="opts" id="${id}">${Object.entries(obj)
        .filter(([, cos]) => open(cos))
        .map(([k]) => `<button class="opt ${cur === k ? "on" : ""}" data-v="${k}">${$t(pre + k)}</button>`)
        .join("")}${id === "cu-logo" && deal() ? `<button class="opt ${cur === "sponsor" ? "on" : ""}" data-v="sponsor">${esc($t(`ag.b.${deal().b}`))}</button>` : ""}</div>`;
    const lockedN =
      Object.keys(SC).filter(k => !open(k)).length +
      Object.values(PATS).filter(v => v && !open(v)).length +
      Object.values(LOGOS).filter(v => v && !open(v)).length;
    const changed = JSON.stringify(d) !== JSON.stringify(shoe()) || !S.shoe.made;
    body = `<div class="card" style="align-items:center">${shoeSVG(d, 200)}</div>
     <div class="card"><div class="eyebrow">${$t("cu.c1")}</div>${sw("cu-c1", d.c1)}<div class="eyebrow">${$t("cu.c2")}</div>${sw("cu-c2", d.c2)}
     <div class="eyebrow">${$t("cu.pattern")}</div>${op("cu-pat", PATS, d.pat, "cu.pat.")}<div class="eyebrow">${$t("cu.logo")}</div>${op("cu-logo", LOGOS, d.logo, "cu.logo.")}
     ${deal() ? `<p class="small muted">${$t("cu.sponsorShoe")}</p>` : ""}${lockN(lockedN)}
     <p class="small muted">${$t("cu.shoeFee", { v: fmt(fee()) })}</p><button class="btn pri" id="cu-make" ${changed && S.money >= fee() ? "" : "disabled"}>${$t("cu.make")}</button></div>`;
  } else if (sub === "jersey") {
    const nums = [0, 1, 3, 7, 8, 10, 11, 13, 23, 24, 30, 33, 77, ...(late.extraNumbers ? late.extraNumbers() : [])];
    body = `<div class="card" style="align-items:center">${jerseyBackSVG(150)}</div>
     <div class="card"><div class="eyebrow">${$t("cu.jname")}</div><div class="opts" id="cu-jn">${["last", "first", "init", "nick"].map(k => `<button class="opt ${(S.jname || "last") === k ? "on" : ""}" data-v="${k}">${$t(`cu.jn.${k}`)}</button>`).join("")}</div>
     ${(S.jname || "last") === "nick" ? `<input type="text" id="cu-nick" maxlength="12" value="${esc(S.jnick || "")}" placeholder="${$t("cu.nickPh")}">` : ""}
     <div class="eyebrow">${$t("cu.font")}</div><div class="opts" id="cu-jf">${Object.entries(FONTS)
       .filter(([, [cos]]) => open(cos))
       .map(([k]) => `<button class="opt ${(S.jfont || "classic") === k ? "on" : ""}" data-v="${k}" style="font-family:${FONTS[k][1].replace(/"/g, "'")}">${$t(`cu.font.${k}`)}</button>`)
       .join("")}</div>${lockN(Object.values(FONTS).filter(([cos]) => cos && !open(cos)).length)}
     <div class="eyebrow">${$t("cu.num")}</div><div class="opts" id="cu-num">${nums.map(n => `<button class="opt ${S.num === n ? "on" : ""}" data-v="${n}">${n}</button>`).join("")}</div>
     <p class="small muted">${$t("cu.numFee", { v: fmt(fee() * 2) })}</p></div>`;
  } else if (sub === "celeb") {
    const cur = celebOpen(S.celeb) ? S.celeb || "fist" : "fist";
    body = `<div class="card"><p class="small muted">${$t("cu.celebSub")}</p><div class="cbgrid">${Object.keys(CELEBS)
      .map(k => {
        const ok = celebOpen(k);
        return `<button class="cbb ${cur === k ? "on" : ""}" data-cb="${k}" ${ok ? "" : "disabled"}>${poseSVG(k, 34)}<b>${$t(`cu.cb.${k}`)}</b>${ok ? "" : `<span class="small muted">${esc(late.featName && late.cosFeat && late.cosFeat(CELEBS[k]) ? late.featName(late.cosFeat(CELEBS[k])) : "")}</span>`}</button>`;
      })
      .join("")}</div></div>`;
  } else {
    const cur = applyTheme();
    body = `<div class="card"><p class="small muted">${$t("cu.themeSub")}</p><div class="choices">${THEMES.map(k => {
      const ok = k === "default" || open(k),
        f = k !== "default" && late.cosFeat ? late.cosFeat(k) : null;
      return `<button class="choice" data-th="${k}" ${ok ? "" : "disabled"} style="${cur === k ? "border-color:var(--gold)" : ""}"><span class="ct">${$t(`cu.th.${k}`)}</span><span class="cd">${ok ? $t(`cu.th.${k}.d`) : $t("cu.themeLock", { f: f && late.featName ? esc(late.featName(f)) : "" })}</span></button>`;
    }).join("")}</div></div>`;
  }
  c.innerHTML = subs + body;
  $$("#cu-sub [data-v]").forEach(
    b =>
      (b.onclick = () => {
        S.cuTab = b.dataset.v;
        re();
      })
  );
  const bind = (id, fn) => $$(`#${id} [data-v]`).forEach(b => (b.onclick = () => (fn(b.dataset.v), re())));
  if (sub === "shoe") {
    bind("cu-c1", v => (S.shoeDraft.c1 = v));
    bind("cu-c2", v => (S.shoeDraft.c2 = v));
    bind("cu-pat", v => (S.shoeDraft.pat = v));
    bind("cu-logo", v => (S.shoeDraft.logo = v));
    $("#cu-make").onclick = () => {
      if (S.money < fee()) return;
      tx($t("cu.shoeTx"), -fee());
      S.shoe = { ...S.shoeDraft, made: 1 };
      S.shoeDraft = null;
      save();
      toast($t("cu.shoeDone"));
      re();
    };
  }
  if (sub === "jersey") {
    bind("cu-jn", v => ((S.jname = v), (S.jnameSet = 1), save()));
    bind("cu-jf", v => ((S.jfont = v), (S.jnameSet = 1), save()));
    bind("cu-num", v => {
      if (+v === S.num || S.money < fee() * 2) return;
      tx($t("cu.numTx", { n: v }), -fee() * 2);
      S.num = +v;
      S.jnameSet = 1;
      save();
    });
    const ni = $("#cu-nick");
    if (ni)
      ni.onchange = () => {
        S.jnick = ni.value.replace(/[<>&"]/g, "").trim().slice(0, 12);
        S.jnameSet = 1;
        save();
        re();
      };
  }
  if (sub === "celeb")
    $$("[data-cb]").forEach(
      b =>
        (b.onclick = () => {
          S.celeb = b.dataset.cb;
          save();
          re();
        })
    );
  if (sub === "theme")
    $$("[data-th]").forEach(
      b =>
        (b.onclick = () => {
          SETTINGS.theme = b.dataset.th;
          saveSettings();
          applyTheme();
          re();
        })
    );
}
