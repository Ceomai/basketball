import { LOCALE, t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { $, $$, Bus, INK, ORDER, cOf, fmt, pick, shade, toast } from "./data.js";
import { ICON, SKINS, ST, drawBall, drawKid, drawScene, ell, hiCanvas, icon, rr, sceneEl, sv } from "./art.js";
import {
  S,
  app,
  bindActs,
  closeSheet,
  fame,
  fullName,
  news,
  norm,
  prodHTML,
  renderMain,
  resultView,
  seasonLabel,
  sheet,
  tabsHTML,
  tx,
  useSlot
} from "./core.js";
import { save } from "./save.js";
import { addScene, arenaFor } from "./places.js";
/* ================= YENİ İKONLAR ================= */
Object.assign(ICON, {
  banana: () =>
    sv(
      `<path d="M12 18 C14 40 30 54 52 50 C56 49 56 45 52 45 C36 46 24 36 20 18Z" fill="#ffd54f" ${ST}/><path d="M12 18 L10 12 L16 14Z" fill="#6d4c41" ${ST}/><path d="M22 26 C26 38 34 44 46 46" stroke="#f9a825" stroke-width="2" fill="none"/>`
    ),
  water: () =>
    sv(
      `<rect x="22" y="14" width="20" height="44" rx="6" fill="#b3e5fc" ${ST}/><rect x="25" y="6" width="14" height="9" rx="2" fill="#1e88e5" ${ST}/><rect x="22" y="28" width="20" height="12" fill="#29b6f6" ${ST}/><path d="M26 18 V54" stroke="#fff" stroke-width="2.5" opacity=".6"/>`
    ),
  oats: () =>
    sv(
      `<path d="M8 30 H56 C56 46 46 56 32 56 C18 56 8 46 8 30Z" fill="#fafafa" ${ST}/><ellipse cx="32" cy="30" rx="24" ry="6" fill="#d7b98a" ${ST}/>${[
        [22, 29],
        [30, 27],
        [38, 30],
        [44, 28]
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#5e35b1"/>`)
        .join("")}<circle cx="27" cy="31" r="3" fill="#e53935"/>`
    ),
  fruit: () =>
    sv(
      `<path d="M8 34 H56 L50 56 H14Z" fill="#a1887f" ${ST}/><circle cx="22" cy="28" r="9" fill="#e53935" ${ST}/><circle cx="40" cy="28" r="9" fill="#ff9800" ${ST}/><circle cx="31" cy="20" r="8" fill="#7cb342" ${ST}/><path d="M14 42 H50 M16 48 H48" stroke="#6d4c41" stroke-width="1.5"/>`
    ),
  choco: () =>
    sv(
      `<rect x="14" y="8" width="36" height="48" rx="3" fill="#5d4037" ${ST}/><path d="M14 22 H50 M14 36 H50 M32 8 V56" stroke="#3e2723" stroke-width="2"/><path d="M14 40 L50 30 V56 H14Z" fill="#c62828" ${ST}/><text x="32" y="50" font-family="Barlow Condensed" font-weight="800" font-size="10" text-anchor="middle" fill="#fff">${$t("shops.1")}</text>`
    ),
  sandwich: () =>
    sv(
      `<path d="M6 30 L32 14 L58 30Z" fill="#e0b56b" ${ST}/><path d="M6 32 H58 L56 36 H8Z" fill="#7cb342" ${ST}/><rect x="8" y="36" width="48" height="6" fill="#e57373" ${ST}/><rect x="8" y="42" width="48" height="5" fill="#ffd54f" ${ST}/><path d="M6 48 H58 L54 54 H10Z" fill="#e0b56b" ${ST}/>`
    ),
  nuts: () =>
    sv(
      `<path d="M10 24 H54 L48 56 H16Z" fill="#8d6e63" ${ST}/>${[
        [20, 22],
        [30, 18],
        [40, 21],
        [26, 26],
        [36, 26],
        [46, 25]
      ]
        .map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="${i % 2 ? "#d7a86e" : "#a1663b"}" ${ST}/>`)
        .join("")}<rect x="20" y="34" width="24" height="10" rx="2" fill="#fff" opacity=".7"/>`
    ),
  gel: () =>
    sv(
      `<path d="M20 6 H44 V44 L32 58 L20 44Z" fill="#ff7043" ${ST}/><rect x="24" y="16" width="16" height="20" rx="2" fill="#fff" ${ST}/><path d="M34 19 L28 27 H32 L30 33 L36 25 H32Z" fill="#ff7043"/>`
    ),
  ice: () =>
    sv(
      `<path d="M10 20 C10 12 54 12 54 20 L50 54 H14Z" fill="#e1f5fe" ${ST}/>${[
        [22, 30],
        [36, 28],
        [28, 42],
        [42, 42]
      ]
        .map(([x, y]) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="#81d4fa" ${ST}/>`)
        .join("")}<path d="M18 14 Q32 6 46 14" fill="none" ${ST}/>`
    ),
  wrist: () =>
    sv(
      `<ellipse cx="32" cy="32" rx="22" ry="14" fill="none" stroke="#141414" stroke-width="12"/><ellipse cx="32" cy="32" rx="22" ry="14" fill="none" stroke="#e53935" stroke-width="9"/><path d="M14 28 Q32 22 50 28" stroke="#fff" stroke-width="2.5" fill="none"/>`
    ),
  knee: () =>
    sv(
      `<path d="M18 6 H46 V58 H18Z" fill="#212121" ${ST}/><ellipse cx="32" cy="32" rx="12" ry="10" fill="#37474f" ${ST}/><path d="M18 14 H46 M18 50 H46" stroke="#e53935" stroke-width="3"/>`
    ),
  weights: () =>
    sv(
      `<rect x="6" y="40" width="52" height="8" rx="2" fill="#5d4037" ${ST}/><circle cx="18" cy="30" r="10" fill="#37474f" ${ST}/><circle cx="46" cy="30" r="10" fill="#37474f" ${ST}/><circle cx="18" cy="30" r="3" fill="#b0bec5"/><circle cx="46" cy="30" r="3" fill="#b0bec5"/><rect x="8" y="48" width="4" height="8" fill="#5d4037"/><rect x="52" y="48" width="4" height="8" fill="#5d4037"/>`
    ),
  tshirt: (c = "#c8102e") =>
    sv(
      `<path d="M20 8 L12 12 L4 24 L12 30 L16 26 V56 H48 V26 L52 30 L60 24 L52 12 L44 8 C40 14 24 14 20 8Z" fill="${c}" ${ST}/><text x="32" y="44" font-family="Barlow Condensed" font-weight="800" font-size="16" text-anchor="middle" fill="#fff" stroke="#141414" stroke-width=".8">23</text>`
    ),
  tablet: () =>
    sv(
      `<rect x="8" y="10" width="48" height="44" rx="5" fill="#263238" ${ST}/><rect x="12" y="14" width="40" height="36" fill="#d79a5c"/><path d="M32 14 V50 M12 32 H52" stroke="#fff" stroke-width="1.2"/><path d="M18 40 Q28 22 44 24" stroke="#ffd54f" stroke-width="2" fill="none" stroke-dasharray="3 2"/><circle cx="44" cy="24" r="3" fill="#e53935"/>`
    ),
  laptop: () =>
    sv(
      `<rect x="12" y="12" width="40" height="28" rx="2" fill="#37474f" ${ST}/><rect x="15" y="15" width="34" height="22" fill="#4fc3f7"/><path d="M4 44 H60 L56 50 H8Z" fill="#b0bec5" ${ST}/><path d="M19 30 H30 M19 25 H40 M19 20 H34" stroke="#fff" stroke-width="2"/>`
    ),
  swatch: () =>
    sv(
      `<rect x="24" y="2" width="16" height="16" rx="3" fill="#212121" ${ST}/><rect x="24" y="46" width="16" height="16" rx="3" fill="#212121" ${ST}/><rect x="16" y="16" width="32" height="32" rx="8" fill="#141414" ${ST}/><path d="M22 34 H27 L30 26 L34 40 L37 32 H42" stroke="#36d38e" stroke-width="2.5" fill="none"/>`
    ),
  vr: () =>
    sv(
      `<rect x="6" y="20" width="52" height="24" rx="10" fill="#eceff1" ${ST}/><rect x="12" y="25" width="18" height="14" rx="5" fill="#263238"/><rect x="34" y="25" width="18" height="14" rx="5" fill="#263238"/><path d="M6 30 H2 M58 30 H62" ${ST}/><circle cx="20" cy="31" r="2" fill="#4fc3f7"/><circle cx="42" cy="31" r="2" fill="#4fc3f7"/>`
    ),
  jacket: () =>
    sv(
      `<path d="M22 6 L32 14 L42 6 L56 14 L60 56 H44 V30 H20 V56 H4 L8 14Z" fill="#3e2723" ${ST}/><path d="M32 14 V56" ${ST}/><path d="M22 6 L28 24 L32 14 L36 24 L42 6" fill="#5d4037" ${ST}/><circle cx="36" cy="34" r="1.5" fill="#d8b25a"/><circle cx="36" cy="42" r="1.5" fill="#d8b25a"/>`
    ),
  glasses: () =>
    sv(
      `<path d="M4 24 H60" ${ST}/><path d="M6 24 H28 C28 36 24 40 16 40 C8 40 6 34 6 24Z" fill="#141414" ${ST}/><path d="M36 24 H58 C58 34 56 40 48 40 C40 40 36 36 36 24Z" fill="#141414" ${ST}/><path d="M10 28 L16 34 M40 28 L46 34" stroke="#fff" stroke-width="2" opacity=".6"/>`
    ),
  chain: () =>
    sv(
      `<path d="M10 8 C10 40 54 40 54 8" fill="none" stroke="#141414" stroke-width="7"/><path d="M10 8 C10 40 54 40 54 8" fill="none" stroke="#d8b25a" stroke-width="4" stroke-dasharray="4 2"/><circle cx="32" cy="44" r="12" fill="#d8b25a" ${ST}/><circle cx="32" cy="44" r="8" fill="#ee7a2c" ${ST}/>`
    ),
  perfume: () =>
    sv(
      `<rect x="14" y="22" width="36" height="34" rx="6" fill="#ce93d8" ${ST}/><rect x="26" y="12" width="12" height="11" fill="#d8b25a" ${ST}/><rect x="22" y="6" width="20" height="7" rx="2" fill="#141414" ${ST}/><rect x="20" y="32" width="24" height="12" rx="2" fill="#fff" opacity=".7"/>`
    ),
  scooter: () =>
    sv(
      `<circle cx="14" cy="48" r="7" fill="#212121" ${ST}/><circle cx="50" cy="48" r="7" fill="#212121" ${ST}/><path d="M14 48 H44 L50 48 M44 48 L40 12 H48" stroke="#141414" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 46 H44" stroke="#26a69a" stroke-width="5"/>`
    ),
  moto: () =>
    sv(
      `<circle cx="14" cy="46" r="9" fill="#212121" ${ST}/><circle cx="50" cy="46" r="9" fill="#212121" ${ST}/><path d="M14 46 L26 30 H40 L50 46" fill="none" ${ST}/><path d="M22 30 C24 22 40 20 44 28 L40 34 H26Z" fill="#141414" ${ST}/><path d="M28 24 C32 20 38 20 40 24 L36 30 H28Z" fill="#e53935" ${ST}/><path d="M44 28 L50 18" ${ST}/>`
    ),
  sofa: () =>
    sv(
      `<rect x="10" y="18" width="44" height="20" rx="6" fill="#5c6bc0" ${ST}/><rect x="4" y="28" width="12" height="20" rx="4" fill="#3f51b5" ${ST}/><rect x="48" y="28" width="12" height="20" rx="4" fill="#3f51b5" ${ST}/><rect x="14" y="34" width="36" height="14" rx="3" fill="#7986cb" ${ST}/><path d="M10 48 V54 M54 48 V54" ${ST}/>`
    ),
  chair: () =>
    sv(
      `<path d="M20 4 H44 L42 36 H22Z" fill="#e53935" ${ST}/><path d="M26 8 H38 L37 28 H27Z" fill="#141414"/><rect x="16" y="34" width="32" height="8" rx="3" fill="#212121" ${ST}/><path d="M32 42 V52 M20 56 L32 52 L44 56" ${ST}/>`
    ),
  cinema: () =>
    sv(
      `<rect x="4" y="10" width="56" height="34" rx="3" fill="#212121" ${ST}/><rect x="8" y="14" width="48" height="26" fill="#1565c0"/><path d="M22 24 L34 30 L22 36Z" fill="#fff"/><rect x="6" y="48" width="10" height="12" fill="#424242" ${ST}/><rect x="48" y="48" width="10" height="12" fill="#424242" ${ST}/>`
    ),
  tub: ICON.tub,
  robot: () =>
    sv(
      `<ellipse cx="32" cy="40" rx="26" ry="12" fill="#cfd8dc" ${ST}/><ellipse cx="32" cy="36" rx="26" ry="12" fill="#eceff1" ${ST}/><circle cx="32" cy="34" r="5" fill="#36d38e" ${ST}/><path d="M14 36 h6 M44 36 h6" stroke="#90a4ae" stroke-width="2"/>`
    ),
  kryo: () =>
    sv(
      `<path d="M6 26 H58 L54 52 H10Z" fill="#eceff1" ${ST}/><path d="M10 30 H54 L52 40 H12Z" fill="#81d4fa"/>${[
        [20, 32],
        [32, 30],
        [44, 33]
      ]
        .map(([x, y]) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1" fill="#e1f5fe" ${ST}/>`)
        .join("")}<path d="M48 26 V14 H40" ${ST}/>`
    ),
  bowling: () =>
    sv(
      `<path d="M40 6 C46 6 46 16 44 20 C50 28 50 50 44 58 H36 C30 50 30 28 36 20 C34 16 34 6 40 6Z" fill="#fff" ${ST}/><path d="M35 22 H45 M34 26 H46" stroke="#e53935" stroke-width="2.5"/><circle cx="20" cy="44" r="14" fill="#3949ab" ${ST}/><circle cx="16" cy="40" r="2" fill="#141414"/><circle cx="22" cy="38" r="2" fill="#141414"/><circle cx="20" cy="44" r="2" fill="#141414"/>`
    ),
  puck: () =>
    sv(
      `<ellipse cx="32" cy="40" rx="26" ry="14" fill="#1b5e20" ${ST}/><circle cx="20" cy="38" r="9" fill="#e53935" ${ST}/><circle cx="20" cy="38" r="4" fill="#b71c1c"/><circle cx="42" cy="40" r="5" fill="#141414"/><path d="M6 40 H58" stroke="#fff" stroke-width="1" opacity=".5"/>`
    ),
  note: () =>
    sv(
      `<path d="M24 46 V12 L52 6 V40" fill="none" stroke="#141414" stroke-width="4"/><ellipse cx="18" cy="46" rx="8" ry="6" fill="#ff3fa4" ${ST}/><ellipse cx="46" cy="40" rx="8" ry="6" fill="#29b6f6" ${ST}/><path d="M24 18 L52 12" stroke="#141414" stroke-width="4"/>`
    ),
  karaoke: () =>
    sv(
      `<circle cx="22" cy="20" r="12" fill="#b0bec5" ${ST}/><path d="M14 14 L30 26" stroke="#78909c" stroke-width="2"/><path d="M30 28 L50 54" stroke="#141414" stroke-width="7" stroke-linecap="round"/><path d="M30 28 L50 54" stroke="#ff3fa4" stroke-width="4" stroke-linecap="round"/><path d="M44 10 l4 4 M50 18 l6 0 M40 6 l0 -4" stroke="#ffd54f" stroke-width="2.5" stroke-linecap="round"/>`
    )
});

/* ================= EŞYA ETKİLERİ ================= */
// en: haftalık enerji, mo: haftalık moral, up: haftalık masraf
export const itemWeekly = k => SHOP.reduce((a, it) => a + (S.items[it.id] && it[k] ? it[k] : 0), 0);
export const carUpkeep = () => itemWeekly("up");

/* ================= AVM: MAĞAZALAR ================= */
export const STORES = [
  {
    id: "sneaker",
    n: $t("shops.46"),
    wall: "#20242c",
    acc: "#ff6a2b",
    disp: "shoes",
    say: $t("shops.47"),
    seller: { skin: SKINS[3], hatStyle: "kep", hat: "#ff6a2b" },
    kit: { jersey: "#141414", sleeves: true, mood: "mutlu" }
  },
  {
    id: "spor",
    n: $t("shops.48"),
    wall: "#123a2a",
    acc: "#36d38e",
    disp: "sport",
    say: $t("shops.49"),
    seller: { skin: SKINS[1], hatStyle: "band", hat: "#36d38e", hair: "#111" },
    kit: { jersey: "#1b5e20", sleeves: true, mood: "mutlu", whistle: true }
  },
  {
    id: "tekno",
    n: $t("shops.50"),
    wall: "#141b2e",
    acc: "#58a6ff",
    disp: "tech",
    say: $t("shops.51"),
    seller: { skin: SKINS[0], hatStyle: "yok", hair: "#e2c15a" },
    kit: { jersey: "#1e3a8a", sleeves: true, glasses: true, mood: "mutlu" }
  },
  {
    id: "moda",
    n: $t("shops.52"),
    wall: "#2a1f26",
    acc: "#d8b25a",
    disp: "fashion",
    say: $t("shops.53"),
    seller: { skin: SKINS[2], hatStyle: "uzun", hair: "#111" },
    kit: { adult: true, jersey: "#141414", sleeves: true, tie: "#d8b25a", mood: "mutlu" }
  },
  {
    id: "galeri",
    n: $t("shops.54"),
    wall: "#1a1f26",
    acc: "#ff5468",
    disp: "cars",
    say: $t("shops.55"),
    seller: { skin: SKINS[1], hatStyle: "yok", hair: "#333" },
    kit: { adult: true, jersey: "#37474f", sleeves: true, tie: "#ff5468", mustache: true, mood: "mutlu" }
  },
  {
    id: "yatirim",
    n: $t("shops.56"),
    wall: "#1b2330",
    acc: "#d8b25a",
    disp: "invest",
    say: $t("shops.57"),
    seller: { skin: SKINS[1], hatStyle: "yok", hair: "#9e9e9e" },
    kit: { adult: true, jersey: "#22304a", sleeves: true, tie: "#d8b25a", glasses: true, mood: "mutlu" }
  },
  {
    id: "ev",
    n: $t("shops.58"),
    wall: "#2b2620",
    acc: "#ffc54d",
    disp: "home",
    say: $t("shops.59"),
    seller: { skin: SKINS[4], hatStyle: "bere", hat: "#ffc54d", pom: "#fff" },
    kit: { jersey: "#6d4c41", sleeves: true, apron: "#ffc54d", mood: "mutlu" }
  }
];
export const SHOP = [
  {
    id: "ayak1",
    st: "sneaker",
    n: $t("shops.60"),
    d: $t("shops.61"),
    p: 60,
    ic: () => icon("sneaker", "#cfd8dc", "#1e88e5"),
    fx: () => (S.st.hiz += 2)
  },
  {
    id: "ayak2",
    st: "sneaker",
    n: $t("shops.62"),
    d: $t("shops.63"),
    p: 260,
    ic: () => icon("sneaker", S.team.c1, "#141414"),
    fx: () => {
      S.st.hiz += 3;
      S.st.sut += 1;
    }
  },
  {
    id: "ayak3",
    st: "sneaker",
    n: $t("shops.64"),
    d: $t("shops.65"),
    p: 900,
    ic: () => icon("sneaker", "#fafafa", "#c8102e"),
    fx: () => {
      S.st.hiz += 1;
      S.rel.taraf += 6;
    }
  },
  {
    id: "ayak4",
    st: "sneaker",
    n: $t("shops.66"),
    d: $t("shops.67"),
    p: 6000,
    ic: () => icon("sneaker", "#d8b25a", "#141414"),
    fx: () => {
      S.st.hiz += 2;
      S.rel.taraf += 12;
    }
  },
  { id: "top", st: "spor", n: $t("shops.68"), d: $t("shops.69"), p: 140, ic: () => icon("ball"), fx: () => (S.st.sut += 2) },
  { id: "bileklik", st: "spor", n: $t("shops.70"), d: $t("shops.71"), p: 40, ic: () => icon("wrist"), fx: () => (S.st.sut += 1) },
  {
    id: "dizlik",
    st: "spor",
    n: $t("shops.72"),
    d: $t("shops.73"),
    p: 90,
    ic: () => icon("knee"),
    fx: () => (S.st.sav += 2)
  },
  {
    id: "agirlik",
    st: "spor",
    n: $t("shops.74"),
    d: $t("shops.75"),
    p: 400,
    ic: () => icon("weights"),
    fx: () => (S.st.guc += 2)
  },
  {
    id: "forma",
    st: "spor",
    n: $t("shops.76"),
    d: $t("shops.77"),
    p: 120,
    ic: () => icon("tshirt", S.team.c1),
    fx: () => (S.rel.taraf += 4)
  },
  {
    id: "kulaklik",
    st: "spor",
    n: $t("shops.78"),
    d: $t("places.244"),
    p: 180,
    ic: () => icon("headphones"),
    fx: () => (S.moral += 8)
  },
  { id: "telefon", st: "tekno", n: $t("shops.79"), d: $t("shops.80"), p: 380, ic: () => icon("phone") },
  {
    id: "konsol",
    st: "tekno",
    n: $t("shops.81"),
    d: $t("shops.82"),
    p: 220,
    ic: () => icon("console"),
    fx: () => (S.moral += 15)
  },
  {
    id: "tablet",
    st: "tekno",
    n: $t("shops.83"),
    d: $t("shops.84"),
    p: 300,
    ic: () => icon("tablet"),
    fx: () => (S.st.pas += 2)
  },
  {
    id: "laptop",
    st: "tekno",
    n: $t("shops.85"),
    d: $t("shops.86"),
    p: 700,
    ic: () => icon("laptop"),
    fx: () => (S.aka += 8)
  },
  { id: "swatch", st: "tekno", n: $t("shops.87"), d: $t("shops.88"), p: 250, en: 3, ic: () => icon("swatch") },
  {
    id: "vr",
    st: "tekno",
    n: $t("shops.89"),
    d: $t("shops.90"),
    p: 900,
    ic: () => icon("vr"),
    fx: () => {
      S.moral += 10;
      S.st.hiz += 1;
    }
  },
  {
    id: "kiyafet",
    st: "moda",
    n: $t("shops.91"),
    d: $t("shops.92"),
    p: 420,
    ic: () => icon("hoodie", "#37474f"),
    fx: () => {
      S.rel.taraf += 6;
      S.moral += 5;
    }
  },
  {
    id: "gozluk",
    st: "moda",
    n: $t("shops.93"),
    d: $t("shops.77"),
    p: 300,
    ic: () => icon("glasses"),
    fx: () => (S.rel.taraf += 4)
  },
  {
    id: "parfum",
    st: "moda",
    n: $t("shops.94"),
    d: $t("shops.95"),
    p: 250,
    ic: () => icon("perfume"),
    fx: () => {
      S.moral += 6;
      S.rel.partner += 5;
    }
  },
  {
    id: "ceket",
    st: "moda",
    n: $t("shops.96"),
    d: $t("shops.97"),
    p: 1200,
    ic: () => icon("jacket"),
    fx: () => (S.rel.taraf += 8)
  },
  {
    id: "zincir",
    st: "moda",
    n: $t("shops.98"),
    d: $t("shops.99"),
    p: 3000,
    ic: () => icon("chain"),
    fx: () => {
      S.rel.taraf += 10;
      S.rel.koc -= 3;
    }
  },
  {
    id: "saat",
    st: "moda",
    n: $t("shops.100"),
    d: $t("shops.101"),
    p: 4500,
    ic: () => icon("watch"),
    fx: () => (S.rel.taraf += 10)
  },
  { id: "scooter", st: "galeri", n: $t("shops.102"), d: $t("shops.103"), p: 900, en: 2, up: 2, ic: () => icon("scooter") },
  {
    id: "araba1",
    st: "galeri",
    n: $t("shops.104"),
    d: $t("shops.105"),
    p: 5200,
    en: 4,
    up: 8,
    ic: () => icon("car", "#1e88e5", "hatch")
  },
  {
    id: "moto",
    st: "galeri",
    n: $t("shops.106"),
    d: $t("shops.107"),
    p: 14000,
    en: 5,
    up: 15,
    ic: () => icon("moto"),
    fx: () => (S.rel.taraf += 6)
  },
  {
    id: "araba2",
    st: "galeri",
    n: $t("shops.108"),
    d: $t("shops.109"),
    p: 42000,
    en: 7,
    up: 30,
    ic: () => icon("car", "#eceff1", "suv"),
    fx: () => (S.rel.taraf += 8)
  },
  {
    id: "araba3",
    st: "galeri",
    n: $t("shops.110"),
    d: $t("shops.111"),
    p: 260000,
    en: 10,
    up: 120,
    ic: () => icon("car", "#d0142c", "super"),
    fx: () => {
      S.rel.taraf += 15;
      S.moral += 12;
    }
  },
  { id: "yatak", st: "ev", n: $t("shops.112"), d: $t("shops.105"), p: 300, en: 4, ic: () => icon("bed") },
  { id: "koltuk", st: "ev", n: $t("shops.113"), d: $t("shops.114"), p: 500, mo: 1, ic: () => icon("sofa") },
  {
    id: "oyunkoltugu",
    st: "ev",
    n: $t("shops.115"),
    d: $t("places.143"),
    p: 350,
    ic: () => icon("chair"),
    fx: () => (S.moral += 5)
  },
  {
    id: "robot",
    st: "ev",
    n: $t("shops.116"),
    d: $t("shops.117"),
    p: 400,
    ic: () => icon("robot"),
    fx: () => (S.moral += 3)
  },
  { id: "sinema", st: "ev", n: $t("shops.118"), d: $t("shops.119"), p: 1500, mo: 2, ic: () => icon("cinema") },
  { id: "fizyo", st: "ev", n: $t("shops.120"), d: $t("shops.121"), p: 9000, ic: () => icon("whistle") },
  { id: "kryo", st: "ev", n: $t("shops.122"), d: $t("shops.123"), p: 2500, en: 5, ic: () => icon("kryo") },

  {
    id: "kiradaire",
    st: "yatirim",
    n: $t("shops.124"),
    d: $t("shops.125"),
    p: 60000,
    inc: 300,
    ic: () => icon("house", "#90a4ae")
  },
  {
    id: "dukkan",
    st: "yatirim",
    n: $t("shops.126"),
    d: $t("shops.125"),
    p: 250000,
    inc: 1300,
    ic: () => icon("house", "#c96f4a")
  },
  {
    id: "plaza",
    st: "yatirim",
    n: $t("shops.127"),
    d: $t("shops.125"),
    p: 400000,
    inc: 2100,
    ic: () => icon("house", "#3f5f8a")
  },
  {
    id: "salon",
    st: "yatirim",
    n: $t("shops.128"),
    d: $t("shops.129"),
    p: 300000,
    ic: () => icon("hoop"),
    fx: () => {
      S.rel.aile += 20;
      S.rel.taraf += 15;
      S.followers *= 1.1;
      news(
        $t("shops.185", {
          v: fullName()
        })
      );
    }
  },
  {
    id: "yat",
    st: "yatirim",
    n: $t("shops.130"),
    d: $t("shops.131"),
    p: 400000,
    mo: 3,
    up: 500,
    ic: () => icon("car", "#eceff1", "suv"),
    fx: () => (S.rel.taraf += 15)
  },
  {
    id: "akademi",
    st: "yatirim",
    n: $t("shops.132"),
    d: $t("shops.133"),
    p: 600000,
    ic: () => icon("trophyRoom"),
    fx: () => {
      S.followers *= 1.2;
      S.career.trophies.push({
        type: "award",
        label: $t("shops.134", {
          v: seasonLabel(),
          last: S.last
        })
      });
      news(
        $t("shops.186", {
          v: fullName()
        })
      );
    }
  },
  {
    id: "jet",
    st: "yatirim",
    n: $t("shops.135"),
    d: $t("shops.136"),
    p: 900000,
    en: 8,
    up: 1200,
    ic: () => icon("car", "#ffffff", "super"),
    fx: () => (S.rel.taraf += 20)
  }
];
export function locAvm(I, store = "sneaker") {
  const S0 = STORES.find(s => s.id === store);
  const b = sheet(
    I.n,
    $t("shops.2", {
      n: S0.n,
      money: fmt(S.money)
    }),
    `${tabsHTML(
      STORES.map(s => [s.id, s.n]),
      store,
      "s"
    )}<div id="avc" style="display:flex;flex-direction:column;gap:10px"></div>`
  );
  $$(".tabs button").forEach(x => (x.onclick = () => locAvm(I, x.dataset.s)));
  const c = $("#avc");
  c.appendChild(sceneEl("store", S0.say, { store: S0 }));
  const items = SHOP.filter(it => it.st === store);
  c.insertAdjacentHTML(
    "beforeend",
    `<div class="pgrid">${items
      .map(it =>
        prodHTML({
          id: it.id,
          ic: it.ic(),
          t: it.n,
          d:
            it.d +
            (it.up
              ? ` ${$t("shops.3", {
                  up: fmt(it.up)
                })}`
              : "") +
            late.itemNote(it),
          price: it.p,
          own: !!S.items[it.id]
        })
      )
      .join("")}</div><p class="small muted">${$t("shops.4")}</p>`
  );
  const m = {};
  items.forEach(
    it =>
      (m[it.id] = () => {
        if (S.money < it.p || S.items[it.id]) return;
        tx(it.n, -it.p);
        S.items[it.id] = 1;
        Bus.emit("purchase", { id: it.id, p: it.p });
        it.fx && it.fx();
        norm();
        save();
        toast(
          $t("shops.5", {
            n: it.n
          })
        );
        locAvm(I, store);
      })
  );
  bindActs(m);
}
export function drawStoreScene(c, o) {
  const s = o.store,
    W = 360;
  c.lineJoin = "round";
  c.strokeStyle = INK;
  c.lineWidth = 2;
  let g = c.createLinearGradient(0, 0, 0, 150);
  g.addColorStop(0, shade(s.wall, 20));
  g.addColorStop(1, s.wall);
  c.fillStyle = g;
  c.fillRect(0, 0, W, 150);
  c.fillStyle = shade(s.wall, -15);
  c.fillRect(0, 150, W, 40);
  c.fillStyle = "rgba(255,255,255,.05)";
  for (let x = 0; x < W; x += 40) c.fillRect(x, 150, 20, 40);
  c.save();
  c.fillStyle = s.acc;
  c.font = '800 18px "Barlow Condensed"';
  c.textAlign = "left";
  c.fillText(s.n.toLocaleUpperCase(LOCALE), 16, 26);
  c.restore();
  c.fillStyle = s.acc;
  c.fillRect(16, 32, 90, 3);
  const shelf = y => {
    rr(c, 12, y, 196, 5, 1, shade(s.wall, -35));
  };
  const D = s.disp;
  if (D === "shoes") {
    [62, 102, 142].forEach((y, r) => {
      shelf(y);
      for (let k = 0; k < 5; k++) {
        const col = ["#e53935", "#fafafa", "#1e88e5", "#d8b25a", "#36d38e"][(k + r) % 5];
        c.save();
        c.translate(20 + k * 38, y - 18);
        c.beginPath();
        c.moveTo(0, 16);
        c.quadraticCurveTo(0, 8, 8, 7);
        c.lineTo(14, 2);
        c.lineTo(26, 10);
        c.lineTo(30, 16);
        c.closePath();
        c.fillStyle = col;
        c.fill();
        c.stroke();
        c.restore();
      }
    });
  }
  if (D === "sport") {
    [70, 120].forEach(y => shelf(y));
    for (let k = 0; k < 5; k++) {
      drawBall(c, 26 + k * 38, 58, 10, k);
    }
    for (let k = 0; k < 4; k++) {
      rr(c, 20 + k * 46, 84, 34, 34, 4, ["#c8102e", "#1d428a", "#00875a", "#f0b323"][k]);
      c.fillStyle = "#fff";
      c.font = '800 14px "Barlow Condensed"';
      c.textAlign = "center";
      c.fillText(String(7 + k * 4), 37 + k * 46, 107);
    }
    c.textAlign = "left";
  }
  if (D === "tech") {
    for (let k = 0; k < 3; k++) {
      rr(c, 16 + k * 64, 48, 56, 40, 3, "#0b1220");
      c.fillStyle = ["#1565c0", "#36d38e", "#ff3fa4"][k];
      c.fillRect(20 + k * 64, 52, 48, 32);
    }
    shelf(100);
    for (let k = 0; k < 5; k++) {
      rr(c, 20 + k * 38, 104, 20, 34, 4, "#212121");
      c.fillStyle = "#4fc3f7";
      c.fillRect(23 + k * 38, 108, 14, 24);
    }
  }
  if (D === "fashion") {
    c.beginPath();
    c.moveTo(14, 50);
    c.lineTo(206, 50);
    c.stroke();
    for (let k = 0; k < 6; k++) {
      const col = ["#3e2723", "#141414", "#c8102e", "#37474f", "#d8b25a", "#5b2a86"][k];
      c.beginPath();
      c.moveTo(24 + k * 30, 50);
      c.lineTo(24 + k * 30, 58);
      c.stroke();
      c.beginPath();
      c.moveTo(14 + k * 30, 58);
      c.lineTo(34 + k * 30, 58);
      c.lineTo(36 + k * 30, 104);
      c.lineTo(12 + k * 30, 104);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
    }
    rr(c, 20, 116, 180, 20, 3, "#1a1416");
    for (let k = 0; k < 5; k++) {
      ell(c, 40 + k * 34, 126, 8, 5, "#d8b25a");
    }
  }
  if (D === "cars") {
    rr(c, 12, 44, 200, 96, 6, "#0b0f16");
    c.fillStyle = "rgba(255,255,255,.06)";
    c.fillRect(12, 44, 200, 40);
    c.save();
    c.translate(112, 118);
    c.scale(1.4, 1.4);
    c.beginPath();
    c.moveTo(-60, 0);
    c.quadraticCurveTo(-58, -10, -44, -12);
    c.lineTo(-24, -26);
    c.quadraticCurveTo(4, -32, 24, -20);
    c.lineTo(52, -14);
    c.quadraticCurveTo(62, -10, 60, 0);
    c.closePath();
    c.fillStyle = "#d0142c";
    c.fill();
    c.stroke();
    ell(c, -34, 2, 10, 10, "#212121");
    ell(c, 36, 2, 10, 10, "#212121");
    c.restore();
  }
  if (D === "home") {
    rr(c, 16, 90, 120, 40, 10, "#5c6bc0");
    rr(c, 10, 100, 20, 36, 6, "#3f51b5");
    rr(c, 126, 100, 20, 36, 6, "#3f51b5");
    rr(c, 150, 48, 60, 40, 3, "#212121");
    c.fillStyle = "#1565c0";
    c.fillRect(154, 52, 52, 32);
    rr(c, 30, 40, 50, 36, 2, "#5d4037");
    c.fillStyle = "#90caf9";
    c.fillRect(34, 44, 42, 28);
  }
  drawKid(c, 282, 176, 0.95, s.seller, s.kit);
  rr(c, 224, 126, 128, 32, 4, shade(s.wall, 30));
  c.fillStyle = s.acc;
  c.fillRect(224, 126, 128, 4);
}

/* ================= MARKET ================= */
export const MARKET = [
  {
    id: "enerji",
    cat: $t("shops.137"),
    n: $t("shops.138"),
    d: $t("shops.139"),
    p: 3,
    ic: () => icon("can"),
    fx: () => {
      S.energy += 15;
    }
  },
  {
    id: "izotonik",
    cat: $t("shops.137"),
    n: $t("shops.140"),
    d: $t("shops.141"),
    p: 4,
    ic: () => icon("can", "#43a047"),
    fx: () => {
      S.energy += 6;
      S.moral += 2;
    }
  },
  {
    id: "su",
    cat: $t("shops.137"),
    n: $t("shops.142"),
    d: $t("shops.143"),
    p: 1,
    ic: () => icon("water"),
    fx: () => {
      S.energy += 3;
    }
  },
  {
    id: "kahve",
    cat: $t("shops.137"),
    n: $t("shops.144"),
    d: $t("shops.145"),
    p: 3,
    ic: () => icon("coffee"),
    fx: () => {
      S.energy += 7;
    }
  },
  {
    id: "muz",
    cat: $t("shops.146"),
    n: $t("shops.147"),
    d: $t("shops.148"),
    p: 1,
    ic: () => icon("banana"),
    fx: () => {
      S.energy += 4;
    }
  },
  {
    id: "kuruyemis",
    cat: $t("shops.146"),
    n: $t("shops.149"),
    d: $t("shops.150"),
    p: 3,
    ic: () => icon("nuts"),
    fx: () => {
      S.energy += 4;
      S.moral += 1;
    }
  },
  {
    id: "cikolata",
    cat: $t("shops.146"),
    n: $t("shops.151"),
    d: $t("shops.152"),
    p: 2,
    ic: () => icon("choco"),
    fx: () => {
      S.moral += 5;
      S.energy -= 1;
    }
  },
  {
    id: "sandvic",
    cat: $t("shops.146"),
    n: $t("shops.153"),
    d: $t("shops.154"),
    p: 4,
    ic: () => icon("sandwich"),
    fx: () => {
      S.energy += 6;
    }
  },
  {
    id: "pizza",
    cat: $t("shops.146"),
    n: $t("shops.155"),
    d: $t("shops.156"),
    p: 9,
    ic: () => icon("pizza"),
    fx: () => {
      S.moral += 8;
      S.energy -= 4;
    }
  },
  {
    id: "protein",
    cat: $t("shops.157"),
    n: $t("shops.158"),
    d: $t("shops.159"),
    p: 35,
    ic: () => icon("tub"),
    fx: () => {
      S.buffs.train = 3;
    }
  },
  {
    id: "jel",
    cat: $t("shops.157"),
    n: $t("shops.160"),
    d: $t("shops.161"),
    p: 6,
    ic: () => icon("gel"),
    fx: () => {
      S.energy += 12;
    }
  },
  {
    id: "vitamin",
    cat: $t("shops.157"),
    n: $t("shops.162"),
    d: $t("places.66"),
    p: 7,
    ic: () => icon("bottle"),
    fx: () => {
      S.energy += 10;
    }
  },
  {
    id: "yulaf",
    cat: $t("shops.157"),
    n: $t("shops.163"),
    d: $t("shops.141"),
    p: 5,
    ic: () => icon("oats"),
    fx: () => {
      S.energy += 6;
      S.moral += 2;
    }
  },
  {
    id: "saglik",
    cat: $t("extras.4"),
    n: $t("shops.164"),
    d: $t("shops.165"),
    p: 12,
    ic: () => icon("bag"),
    fx: () => {
      S.energy += 8;
      S.moral += 4;
    }
  },
  {
    id: "meyve",
    cat: $t("extras.4"),
    n: $t("shops.166"),
    d: $t("shops.167"),
    p: 6,
    ic: () => icon("fruit"),
    fx: () => {
      S.energy += 5;
      S.moral += 3;
    }
  },
  {
    id: "buz",
    cat: $t("extras.4"),
    n: $t("shops.168"),
    d: $t("shops.169"),
    p: 5,
    ic: () => icon("ice"),
    fx: () => {
      S.energy += 8;
    }
  }
];
export function locMarket(I) {
  const cats = [...new Set(MARKET.map(m => m.cat))];
  const b = sheet(
    I.n,
    $t("shops.6", {
      money: fmt(S.money)
    }),
    cats
      .map(
        ct =>
          `<div class="eyebrow" style="margin-top:4px">${ct}</div><div class="pgrid">${MARKET.filter(m => m.cat === ct)
            .map(it => prodHTML({ id: it.id, ic: it.ic(), t: it.n, d: it.d + late.marketNote(it), price: late.marketPrice(it) }))
            .join("")}</div>`
      )
      .join("") +
      `<p class="small muted">${$t("life.mktHead", { v: late.marketEnergyLeft(), c: late.MKT_EN_CAP })}</p>` +
      (S.buffs.train
        ? `<p class="small good">${$t("shops.7", {
            train: S.buffs.train
          })}</p>`
        : "")
  );
  addScene(b, "market", pick([$t("shops.187"), $t("shops.188"), $t("shops.189")]));
  const m = {};
  MARKET.forEach(
    it =>
      (m[it.id] = () => {
        const note = late.marketBuy(it);
        if (note === null) return;
        save();
        toast(
          $t("shops.8", {
            n: it.n,
            energy: S.energy,
            moral: S.moral
          }) + (note ? ` ${note}` : "")
        );
        $("#shsub").textContent = $t("shops.6", {
          money: fmt(S.money)
        });
        $$("[data-act]").forEach(x => {
          const p = MARKET.find(q => q.id === x.dataset.act);
          if (p) x.disabled = S.money < late.marketPrice(p);
        });
      })
  );
  bindActs(m);
}

/* ================= EĞLENCE MERKEZİ ================= */
export const ARCADE = [
  { id: "hoop", n: $t("arcade.2"), d: $t("shops.170"), ic: "hoop", rec: "arcade" },
  { id: "ref", n: $t("arcade.12"), d: $t("shops.171"), ic: "joystick", rec: "reflex" },
  { id: "hockey", n: $t("arcade.16"), d: $t("shops.172"), ic: "puck", rec: "hockey" },
  { id: "rhythm", n: $t("shops.39"), d: $t("shops.173"), ic: "note", rec: "rhythm" },
  { id: "bowling", n: $t("arcade.26"), d: $t("shops.174"), ic: "bowling", rec: "bowling" }
];
export function venueCard(id, title, sub, kind, on) {
  const w = document.createElement("button");
  w.className = "venue" + (on ? " on" : "");
  w.dataset.v = id;
  const [cv, c] = hiCanvas(360, 190);
  drawScene(c, kind, {});
  w.appendChild(cv);
  w.insertAdjacentHTML("beforeend", `<span class="vlab"><b>${title}</b><small>${sub}</small></span>`);
  return w;
}
export function locEglence(I, tab = "arcade") {
  Bus.emit("place:open", "eglence");
  S.rec = Object.assign({ arcade: 0, reflex: 0, hockey: 0, rhythm: 0, bowling: 0 }, S.rec);
  const b = sheet(
    I.n,
    $t("shops.9"),
    `<div class="venues" id="vn"></div><div id="egc" style="display:flex;flex-direction:column;gap:10px"></div>`
  );
  const vn = $("#vn");
  vn.appendChild(
    venueCard(
      "arcade",
      $t("shops.10"),
      $t("shops.11", {
        length: ARCADE.length,
        v: fmt(1)
      }),
      "arcade",
      tab === "arcade"
    )
  );
  vn.appendChild(venueCard("kulup", $t("shops.12"), S.age < 18 ? $t("shops.13") : $t("shops.14"), "club", tab === "kulup"));
  $$(".venue").forEach(x => (x.onclick = () => locEglence(I, x.dataset.v)));
  const c = $("#egc");
  if (tab === "arcade") {
    c.insertAdjacentHTML("beforeend", late.arcBoardCard());
    $("#brd").onclick = () => late.boardSheet("arcade", "w");
    c.insertAdjacentHTML(
      "beforeend",
      `<div class="eyebrow">${$t("shops.17")}</div><div class="pgrid">${ARCADE.map(g =>
        prodHTML({
          id: g.id,
          ic: icon(g.ic),
          t: g.n,
          d: $t("shops.175", {
            d: g.d,
            v: S.rec[g.rec]
          }),
          price: 1,
          fx: [[$t("shops.15"), "p"]],
          btn: $t("shops.16") + fmt(1)
        })
      ).join("")}</div>`
    );
    const m = {};
    ARCADE.forEach(g => (m[g.id] = () => arcadeRun(g.id)));
    bindActs(m);
  } else {
    if (S.age < 18) {
      c.insertAdjacentHTML(
        "beforeend",
        `<div class="say">${$t("shops.18", {
          v: 18 - S.age
        })}</div>`
      );
      return;
    }
    const ix = ORDER.indexOf(S.stage),
      pp = Math.round(15 * (1 + ix)),
      vp = Math.round(120 * (1 + ix * 2)),
      kp = Math.round(8 * (1 + ix));
    c.insertAdjacentHTML(
      "beforeend",
      `<div class="eyebrow">${$t("shops.12")}</div><div class="pgrid">${[
        {
          id: "parti",
          ic: icon("disco"),
          t: $t("shops.30"),
          d: $t("shops.176"),
          slot: 1,
          price: pp,
          fx: [
            [$t("shops.19"), "p"],
            [$t("shops.20"), "n"],
            [$t("shops.21"), "t"]
          ],
          btn: fmt(pp)
        },
        {
          id: "karaoke",
          ic: icon("karaoke"),
          t: $t("shops.38"),
          d: $t("shops.177"),
          slot: 1,
          price: kp,
          fx: [
            [$t("shops.15"), "p"],
            [$t("shops.22"), "p"]
          ],
          btn: fmt(kp)
        },
        {
          id: "vip",
          ic: icon("star"),
          t: $t("shops.178"),
          d: fame() < 30 ? $t("shops.23") : $t("shops.24"),
          slot: 1,
          price: vp,
          fx: [
            [$t("shops.25"), "p"],
            [$t("shops.26"), "n"]
          ],
          btn: fmt(vp),
          disabled: fame() < 30
        },
        ...(!S.partner
          ? [
              {
                id: "dans",
                ic: icon("heart"),
                t: $t("shops.179"),
                d: $t("shops.180"),
                slot: 1,
                fx: [[$t("places.249"), "t"]],
                btn: $t("shops.181")
              }
            ]
          : [
              {
                id: "dans2",
                ic: icon("heart"),
                t: $t("shops.182", {
                  partner: S.partner
                }),
                d: $t("shops.183"),
                slot: 1,
                fx: [[$t("shops.27"), "p"]],
                btn: $t("shops.184")
              }
            ])
      ]
        .map(prodHTML)
        .join("")}</div>`
    );
    bindActs({
      parti: () => {
        if (S.money < pp) return;
        useSlot();
        tx($t("shops.12"), -pp);
        S.moral += 16;
        S.energy -= 22;
        let t = $t("shops.28");
        if (Math.random() < 0.2) {
          S.rel.koc -= 8;
          S.rel.taraf -= 4;
          t += ` ${$t("shops.29", {
            coach: S.npc.coach
          })}`;
          news(
            $t("shops.190", {
              v: fullName()
            })
          );
        }
        norm();
        save();
        resultView($t("shops.30"), t, [
          [$t("shops.19"), "p"],
          [$t("shops.20"), "n"]
        ]);
      },
      karaoke: () => {
        if (S.money < kp) return;
        useSlot();
        tx($t("shops.38"), -kp);
        arcadeRun("karaoke", true);
      },
      vip: () => {
        if (S.money < vp) return;
        useSlot();
        tx($t("shops.178"), -vp);
        S.followers *= 1.08;
        S.moral += 12;
        S.rel.koc -= 4;
        norm();
        save();
        resultView($t("shops.31"), $t("shops.32"), [
          [$t("shops.25"), "p"],
          [$t("shops.26"), "n"]
        ]);
      },
      dans: () => {
        useSlot();
        S.energy -= 6;
        if (Math.random() < 0.28 + fame() / 200) {
          S.partner = pick(cOf(S.city).fem);
          S.rel.partner = 45;
          S.moral += 10;
          news(
            $t("shops.191", {
              v: fullName()
            })
          );
          norm();
          save();
          resultView(
            $t("places.259"),
            $t("shops.33", {
              partner: S.partner
            })
          );
        } else {
          S.moral -= 3;
          norm();
          save();
          resultView($t("casino.43"), $t("shops.34"));
        }
      },
      dans2: () => {
        useSlot();
        S.rel.partner += 10;
        S.moral += 6;
        S.energy -= 6;
        norm();
        save();
        resultView(
          $t("shops.35"),
          $t("shops.36", {
            partner: S.partner
          }),
          [[$t("shops.27"), "p"]]
        );
      }
    });
  }
}
export async function arcadeRun(kind, paid) {
  if (!paid) {
    if (S.money < 1) return;
    tx($t("shops.192"), -1);
  }
  closeSheet();
  arenaFor(null);
  Bus.emit("arcade:start", kind);
  const meta = ARCADE.find(g => g.id === kind) || { n: $t("shops.38"), rec: "rhythm" };
  app.innerHTML = `<div style="padding-top:12px"><div class="eyebrow">${$t("shops.37")}</div><h2>${meta.n}</h2></div><div id="stg"></div><div id="res"></div>`;
  const el = $("#stg");
  let r;
  if (kind === "hoop") r = await late.mgArcade(el);
  else if (kind === "ref") r = await late.mgReflex(el);
  else if (kind === "hockey") r = await late.mgHockey(el);
  else if (kind === "bowling") r = await late.mgBowling(el);
  else r = await late.mgRhythm(el, { title: kind === "karaoke" ? $t("shops.38") : $t("shops.39"), karaoke: kind === "karaoke" });
  const key = meta.rec,
    rec = r.score > (S.rec[key] || 0);
  if (kind !== "karaoke") late.arcSubmit(key, r.score);
  if (rec && kind !== "karaoke") S.rec[key] = r.score;
  let extra = "";
  S.moral += Math.min(12, 3 + Math.floor(r.score / 4));
  if (kind === "hockey" && r.win) {
    S.moral += 4;
    extra = $t("shops.40");
  }
  if (kind === "ref" && r.score >= 18 && Math.random() < 0.4) {
    const g = late.gainStat("hiz", Math.round(0.2 * late.levelMul("hiz") * 100) / 100);
    extra = $t("prog.reflex", { v: g.toFixed(2) });
  }
  if (kind === "karaoke" && r.score >= 20) {
    S.followers *= 1.05;
    extra = $t("shops.42");
  }
  norm();
  save();
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><div class="eyebrow">${$t("extras.11")}</div><div class="big-num">${r.label || r.score}</div><p>${
      kind !== "karaoke"
        ? rec
          ? $t("shops.43")
          : $t("shops.44", {
              v: S.rec[key]
            })
        : ""
    } ${extra}</p><div class="grid2"><button class="btn ghost" id="bk">${$t("casino.13")}</button>${kind === "karaoke" ? "" : `<button class="btn pri" id="again">${$t("shops.45")}</button>`}</div></div>`;
  $("#bk").onclick = renderMain;
  const ag = $("#again");
  if (ag) ag.onclick = () => arcadeRun(kind);
}
