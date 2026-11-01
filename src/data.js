import { BAL, TDB, WAGE, roleFor, stageLevel } from "./logic/rules.js";
export { BAL, TDB, WAGE };
import { late } from "./late.js";
document.documentElement.lang = "tr";
/* ================= YARDIMCILAR ================= */
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const rnd = (a, b) => a + Math.random() * (b - a);
export const ri = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const shuffle = a =>
  a
    .map(v => [Math.random(), v])
    .sort((x, y) => x[0] - y[0])
    .map(x => x[1]);
export const gauss = () => {
  let u = 0,
    v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
/* ---- Olay sistemi ----
   Modüller birbirinin fonksiyonlarını sarmak yerine olaylara abone olur.
   Bus.on/emit: bildirim ("ekran açıldı", "sakatlık bitti").
   Bus.use/run: akışı durdurup sonra sürdürebilen ara katmanlar (ör. maç sonu basın toplantısı).
   Bus.offer/first: sırayla sorulan sağlayıcılar; ilk "true" dönen kazanır (ör. haftada tek bir hikâye paneli). */
export const Bus = {
  h: {},
  m: {},
  p: {},
  on(e, f) {
    (this.h[e] = this.h[e] || []).push(f);
    return f;
  },
  emit(e, ...a) {
    for (const f of this.h[e] || []) {
      try {
        f(...a);
      } catch (err) {
        console.error(e, err);
      }
    }
  },
  use(e, f) {
    (this.m[e] = this.m[e] || []).push(f);
  },
  run(e, ctx, final) {
    const L = this.m[e] || [];
    let i = 0;
    const next = () => {
      const f = L[i++];
      if (f) f(ctx, next);
      else final(ctx);
    };
    next();
  },
  offer(e, f, prio = 50) {
    (this.p[e] = this.p[e] || []).push({ f, prio });
    this.p[e].sort((a, b) => a.prio - b.prio);
  },
  first(e, ...a) {
    for (const { f } of this.p[e] || []) {
      try {
        if (f(...a)) return true;
      } catch (err) {
        console.error(e, err);
      }
    }
    return false;
  }
};
// Otomatik test modu (denge simülasyonu): kayıt, ses, bildirim ve olay panelleri kapatılır
export const SIM = () => !!window.__SIM;
export const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const hash = s => {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const INK = "#141414";
export function toast(t) {
  if (SIM()) return;
  if (typeof late.sfx === "function") late.sfx("notify");
  $$(".toast").forEach(x => x.remove());
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = t;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}
export const kfmt = n =>
  n >= 1e6
    ? (n / 1e6).toFixed(1).replace(".", ",") + "M"
    : n >= 1e4
      ? Math.round(n / 1e3) + "B"
      : n >= 1e3
        ? (n / 1e3).toFixed(1).replace(".", ",") + "B"
        : String(Math.round(n));
export const RATE = 40; // para birimi: içeride €, ekranda ₺
export function fmt(eur) {
  const v = Math.round(eur * RATE),
    a = Math.abs(v),
    s = a >= 1e7 ? (a / 1e6).toFixed(1).replace(".", ",") + "M" : a.toLocaleString("tr-TR");
  return (v < 0 ? "−" : "") + "₺" + s;
}
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255),
    g = clamp(((n >> 8) & 255) + amt, 0, 255),
    b = clamp((n & 255) + amt, 0, 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export const luma = hex => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
};

/* ================= LİGLER ================= */
// t: [1. lig, 2. lig, 3. lig], pr: lig gücü çarpanı
export const LEAGUES = {
  TR: {
    n: "Türkiye",
    t: ["Basketbol Süper Ligi", "TBL", "TB2L"],
    pr: 0.97,
    cities: [
      "İstanbul",
      "Ankara",
      "İzmir",
      "Bursa",
      "Antalya",
      "Trabzon",
      "Erzurum",
      "Konya",
      "Mersin",
      "Gaziantep",
      "Eskişehir",
      "Samsun"
    ],
    first: ["Emre", "Can", "Burak", "Mert", "Kerem", "Arda", "Yusuf", "Efe", "Kaan", "Barış", "Onur", "Serkan", "Tolga", "Sinan"],
    last: [
      "Yılmaz",
      "Kaya",
      "Demir",
      "Şahin",
      "Çelik",
      "Aydın",
      "Arslan",
      "Doğan",
      "Kurt",
      "Öztürk",
      "Koç",
      "Aksoy",
      "Erdem",
      "Polat"
    ],
    fem: ["Elif", "Zeynep", "Defne", "Ece", "Selin", "Ada", "Melis"]
  },
  ES: {
    n: "İspanya",
    t: ["Liga ACB", "Primera FEB", "Segunda FEB"],
    pr: 1,
    cities: [
      "Madrid",
      "Barcelona",
      "Valencia",
      "Málaga",
      "Sevilla",
      "Bilbao",
      "Zaragoza",
      "Vitoria",
      "Murcia",
      "Granada",
      "Gran Canaria",
      "Tenerife"
    ],
    first: ["Pablo", "Sergio", "Álvaro", "Javier", "Dani", "Hugo", "Marc", "Iker"],
    last: ["García", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Ruiz", "Navarro"],
    fem: ["Lucía", "Carmen", "Paula", "Marta"]
  },
  IT: {
    n: "İtalya",
    t: ["Serie A", "Serie A2", "Serie B"],
    pr: 0.93,
    cities: [
      "Milano",
      "Roma",
      "Bologna",
      "Venedik",
      "Torino",
      "Napoli",
      "Sassari",
      "Brescia",
      "Trento",
      "Treviso",
      "Pesaro",
      "Varese"
    ],
    first: ["Luca", "Marco", "Matteo", "Alessandro", "Simone", "Davide", "Nicolò"],
    last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo"],
    fem: ["Giulia", "Sofia", "Chiara", "Martina"]
  },
  FR: {
    n: "Fransa",
    t: ["LNB Élite", "Pro B", "Nationale 1"],
    pr: 0.92,
    cities: [
      "Paris",
      "Lyon",
      "Marsilya",
      "Monako",
      "Strazburg",
      "Nantes",
      "Lille",
      "Bordeaux",
      "Limoges",
      "Dijon",
      "Le Mans",
      "Nancy"
    ],
    first: ["Lucas", "Hugo", "Théo", "Nathan", "Evan", "Nicolas", "Mathis"],
    last: ["Martin", "Bernard", "Dubois", "Laurent", "Moreau", "Lefèvre", "Girard"],
    fem: ["Léa", "Chloé", "Manon", "Camille"]
  },
  DE: {
    n: "Almanya",
    t: ["BBL", "ProA", "ProB"],
    pr: 0.91,
    cities: [
      "Berlin",
      "Münih",
      "Hamburg",
      "Köln",
      "Frankfurt",
      "Bamberg",
      "Ulm",
      "Oldenburg",
      "Bonn",
      "Würzburg",
      "Ludwigsburg",
      "Bremen"
    ],
    first: ["Max", "Leon", "Jonas", "Felix", "Paul", "Niklas", "Tim"],
    last: ["Müller", "Schmidt", "Weber", "Wagner", "Becker", "Hoffmann", "Schulz"],
    fem: ["Lena", "Anna", "Mia", "Lea"]
  },
  GR: {
    n: "Yunanistan",
    t: ["GBL", "Elite League", "National League 1"],
    pr: 0.94,
    cities: [
      "Atina",
      "Pire",
      "Selanik",
      "Patras",
      "Larissa",
      "Heraklion",
      "Volos",
      "Kavala",
      "Rodos",
      "Ioannina",
      "Kalamata",
      "Lamia"
    ],
    first: ["Nikos", "Giorgos", "Kostas", "Dimitris", "Yannis", "Vasilis", "Thanasis"],
    last: ["Papadopoulos", "Georgiou", "Nikolaidis", "Antonopoulos", "Vlachos", "Pappas", "Galanis"],
    fem: ["Eleni", "Maria", "Katerina", "Sofia"]
  },
  RS: {
    n: "Sırbistan",
    t: ["KLS", "Prva Liga", "Druga Liga"],
    pr: 0.9,
    cities: [
      "Belgrad",
      "Novi Sad",
      "Niş",
      "Kragujevac",
      "Subotica",
      "Čačak",
      "Zrenjanin",
      "Kraljevo",
      "Pančevo",
      "Šabac",
      "Valjevo",
      "Vršac"
    ],
    first: ["Nikola", "Stefan", "Luka", "Marko", "Bogdan", "Vasilije", "Filip"],
    last: ["Jovanović", "Petrović", "Nikolić", "Marković", "Đorđević", "Stojanović", "Ilić"],
    fem: ["Jelena", "Milica", "Ana", "Teodora"]
  },
  LT: {
    n: "Litvanya",
    t: ["LKL", "NKL", "RKL"],
    pr: 0.89,
    cities: [
      "Kaunas",
      "Vilnius",
      "Klaipėda",
      "Šiauliai",
      "Panevėžys",
      "Alytus",
      "Utena",
      "Marijampolė",
      "Jonava",
      "Kėdainiai",
      "Prienai",
      "Telšiai"
    ],
    first: ["Jonas", "Mantas", "Domantas", "Lukas", "Rokas", "Arvydas", "Tomas"],
    last: ["Kazlauskas", "Jankauskas", "Petrauskas", "Vasiliauskas", "Žukauskas", "Butkus", "Paulauskas"],
    fem: ["Austėja", "Gabija", "Ieva", "Emilija"]
  },
  US: {
    n: "ABD",
    t: ["NBA"],
    pr: 1.2,
    cities: [
      "New York",
      "Los Angeles",
      "Chicago",
      "Boston",
      "Miami",
      "Dallas",
      "Denver",
      "Phoenix",
      "Atlanta",
      "Seattle",
      "Toronto",
      "San Francisco",
      "Houston",
      "Philadelphia"
    ],
    first: ["Tyler", "Jalen", "Marcus", "Devin", "Chris", "Brandon", "Kevin", "Jordan", "Zach", "Andre"],
    last: ["Johnson", "Williams", "Brown", "Davis", "Miller", "Moore", "Taylor", "Jackson", "Harris", "Walker"],
    fem: ["Ashley", "Jasmine", "Emily", "Kayla"]
  }
};
export const EU_CC = ["TR", "ES", "IT", "FR", "DE", "GR", "RS", "LT"];
export const CITY_C = {};
for (const [k, c] of Object.entries(LEAGUES)) for (const city of c.cities) CITY_C[city] = k;
export const cOf = city => LEAGUES[CITY_C[city]] || LEAGUES.TR;

/* ================= ŞEHİR GÖRÜNÜMLERİ ================= */
// her şehir: simge yapılar | su (s: deniz, r: nehir, l: göl, -: yok)
export const CT_RAW = `İstanbul:mosque,tower,bridge|s;Ankara:needle,castle|-;İzmir:clock,palms|s;Bursa:mosque,mountain|-;Antalya:palms,lighthouse|s;Trabzon:hills,mosque|s;Erzurum:mountain,dome|-;Konya:dome,mosque|-;Mersin:skyline,palms|s;Gaziantep:castle,mosque|-;Eskişehir:timber,bridge|r;Samsun:lighthouse,skyline|s;
Madrid:arch,skyline|-;Barcelona:spires,palms|s;Valencia:bullring,palms|s;Málaga:fortress,lighthouse|s;Sevilla:tower,bullring|r;Bilbao:skyline,bridge|r;Zaragoza:dome,spires|r;Vitoria:spires,hills|-;Murcia:dome,palms|-;Granada:fortress,mountain|-;Gran Canaria:palms,lighthouse|s;Tenerife:mountain,palms|s;
Milano:spires,skyline|-;Roma:arena,dome|r;Bologna:tower,leaning|-;Venedik:dome,bridge|s;Torino:needle,mountain|r;Napoli:mountain,castle|s;Sassari:lighthouse,hills|s;Brescia:castle,dome|-;Trento:mountain,spires|r;Treviso:spires,bridge|r;Pesaro:lighthouse,palms|s;Varese:hills,spires|l;
Paris:lattice,arch|r;Lyon:spires,hills|r;Marsilya:fortress,lighthouse|s;Monako:palms,skyline|s;Strazburg:spires,timber|r;Nantes:castle,bridge|r;Lille:brick,clock|-;Bordeaux:bridge,dome|r;Limoges:spires,bridge|r;Dijon:timber,spires|-;Le Mans:castle,spires|r;Nancy:arch,dome|-;
Berlin:needle,arch|r;Münih:spires,mountain|-;Hamburg:brick,bridge|s;Köln:spires,bridge|r;Frankfurt:skyline,bridge|r;Bamberg:timber,bridge|r;Ulm:spires,timber|r;Oldenburg:castle,brick|-;Bonn:brick,dome|r;Würzburg:fortress,bridge|r;Ludwigsburg:castle,hills|-;Bremen:windmill,brick|r;
Atina:temple,hills|-;Pire:lighthouse,temple|s;Selanik:tower,skyline|s;Patras:bridge,castle|s;Larissa:fortress,mountain|r;Heraklion:fortress,palms|s;Volos:mountain,skyline|s;Kavala:castle,lighthouse|s;Rodos:castle,windmill|s;Ioannina:mountain,dome|l;Kalamata:palms,castle|s;Lamia:castle,hills|-;
Belgrad:fortress,onion|r;Novi Sad:fortress,bridge|r;Niş:fortress,onion|r;Kragujevac:onion,skyline|-;Subotica:dome,spires|-;Čačak:onion,mountain|r;Zrenjanin:dome,bridge|r;Kraljevo:onion,hills|r;Pančevo:spires,bridge|r;Šabac:fortress,skyline|r;Valjevo:hills,onion|r;Vršac:castle,hills|-;
Kaunas:spires,castle|r;Vilnius:castle,spires|r;Klaipėda:lighthouse,windmill|s;Šiauliai:spires,hills|-;Panevėžys:skyline,spires|-;Alytus:bridge,spires|r;Utena:spires,hills|l;Marijampolė:dome,skyline|-;Jonava:bridge,spires|r;Kėdainiai:windmill,spires|r;Prienai:hills,bridge|r;Telšiai:spires,hills|l;
New York:skyline,bridge|s;Los Angeles:palms,hills|s;Chicago:skyline,needle|l;Boston:brick,bridge|s;Miami:palms,skyline|s;Dallas:skyline,needle|-;Denver:mountain,skyline|-;Phoenix:palms,mountain|-;Atlanta:skyline,dome|-;Seattle:needle,mountain|s;Toronto:needle,skyline|l;San Francisco:bridge,hills|s;Houston:skyline,dome|-;Philadelphia:brick,spires|r`;
export const CITY_THEME = {};
CT_RAW.split(";").forEach(e => {
  const [n, r] = e.trim().split(":");
  if (!r) return;
  const [l, w] = r.split("|");
  CITY_THEME[n] = { land: l.split(","), water: w };
});
CITY_THEME["İstanbul"].land = ["mosque", "tower", "bridge"];
// ülke mimari paletleri
export const STY = {
  TR: { wall: "#e2cfae", roof: "#b5533c", acc: "#c8102e" },
  ES: { wall: "#efd9b9", roof: "#c0643a", acc: "#f1bf00" },
  IT: { wall: "#e5c491", roof: "#b8613e", acc: "#2f9e5b" },
  FR: { wall: "#e6e1d6", roof: "#56657d", acc: "#2f6fd0" },
  DE: { wall: "#ece2d0", roof: "#7a3b2e", acc: "#ffce00" },
  GR: { wall: "#f4f4ef", roof: "#2f6fb5", acc: "#4f8fd8" },
  RS: { wall: "#e4d8c4", roof: "#9b3b32", acc: "#c6363c" },
  LT: { wall: "#e7dcc4", roof: "#8a3a2a", acc: "#fdb913" },
  US: { wall: "#c5cfda", roof: "#3b4a5f", acc: "#e0453a" }
};
export function cityTheme(city) {
  const t = CITY_THEME[city] || { land: ["skyline"], water: "-" };
  return { ...t, cc: CITY_C[city] || "TR", seed: hash(city) };
}

/* ================= KARİYER BASAMAKLARI ================= */
export const ORDER = ["lise", "uni", "t3", "t2", "t1", "euro", "nba"];
// Lig zorluğu: o ligde "yerinde" bir oyuncunun genel puanı yaklaşık TDB+45'tir; bu durumda maçta etkin değer ~45 olur.
export const SC = { lise: 52, uni: 60, t3: 66, t2: 72, t1: 78, euro: 80, nba: 108 }; // skor ölçeği
export const isPro = st => ORDER.indexOf(st) >= 2;
// Lig seviyesi ve rol: kurallar logic/rules.js'te, burada ülke çarpanı eklenir
export function tdOf(stage, cc) {
  return stageLevel(stage, (LEAGUES[cc] || LEAGUES.TR).pr);
}
// rol: genel puanın lig seviyesine göre konumu
export function roleAt(o, stage, cc) {
  return roleFor(o, tdOf(stage, cc));
}
export function leagueName(stage, cc, ss) {
  if (stage === "lise") return ss === 1 ? "İstanbul Liseler Ligi" : "Türkiye Liseler Şampiyonası";
  if (stage === "uni") return "Üniversiteler Ligi";
  if (stage === "euro") return "EuroLeague";
  if (stage === "nba") return "NBA";
  return (LEAGUES[cc] || LEAGUES.TR).t[{ t1: 0, t2: 1, t3: 2 }[stage]];
}
export const levelName = st =>
  ({ lise: "Lise", uni: "Üniversite", t3: "3. seviye", t2: "2. seviye", t1: "1. seviye", euro: "EuroLeague", nba: "NBA" })[st];
export const COLORS = [
  ["#c8102e", "#ffffff"],
  ["#0b3d91", "#ffd200"],
  ["#00875a", "#ffffff"],
  ["#f0b323", "#1b1b1b"],
  ["#5b2a86", "#f2c14e"],
  ["#e03a3e", "#111111"],
  ["#0077c0", "#c4ced4"],
  ["#e56020", "#1d1160"],
  ["#00788c", "#f9a01b"],
  ["#7a0019", "#ffcc33"],
  ["#1d428a", "#ffc72c"],
  ["#2e7d32", "#ffd54f"],
  ["#f4f4f4", "#0a0a0a"],
  ["#ff4fa3", "#111111"],
  ["#3a2f8f", "#e8e8e8"],
  ["#b8860b", "#101010"]
];
export const MASC_TR = [
  "Kartalları",
  "Yıldızları",
  "Fırtınası",
  "Kurtları",
  "Şimşekleri",
  "Martıları",
  "Ayıları",
  "Kaplanları",
  "Kuzgunları",
  "Atları",
  "Kunduzları",
  "Şahinleri"
];
export const MASC_US = [
  "Comets",
  "Owls",
  "Sentinels",
  "Vipers",
  "Monarchs",
  "Voltage",
  "Foxes",
  "Express",
  "Summit",
  "Blaze",
  "Pilots",
  "Stingrays",
  "Rhinos",
  "Mariners"
];
export const PAT = {
  TR: [c => `${c} ${MASC_TR[hash(c) % 12]}`, c => `${c} Belediyespor`, c => `${c} Gençlikspor`, c => `${c} Basketbol`],
  ES: [c => `CB ${c}`, c => `${c} Basket`, c => `Club Baloncesto ${c}`, c => `${c} Atlético`],
  IT: [c => `Pallacanestro ${c}`, c => `${c} Basket`, c => `Polisportiva ${c}`, c => `${c} Aquile`],
  FR: [c => `${c} Basket`, c => `Étoile de ${c}`, c => `Union ${c}`, c => `${c} Métropole`],
  DE: [c => `BC ${c}`, c => `${c} Dragons`, c => `SV ${c}`, c => `${c} Falken`],
  GR: [c => `${c} BC`, c => `AS ${c}`, c => `Asteras ${c}`, c => `Ermis ${c}`],
  RS: [c => `KK ${c}`, c => `OKK ${c}`, c => `${c} Basket`, c => `KK Mladost ${c}`],
  LT: [c => `BC ${c}`, c => `${c} Krepšinis`, c => `${c} Vilkai`, c => `KK ${c}`],
  US: [c => `${c} ${MASC_US[hash(c) % MASC_US.length]}`]
};
export const IST_DIST = [
  "Kadıköy",
  "Beşiktaş",
  "Üsküdar",
  "Bakırköy",
  "Şişli",
  "Fatih",
  "Kartal",
  "Sarıyer",
  "Maltepe",
  "Ataşehir",
  "Beyoğlu",
  "Bahçelievler"
];
export const IST_TYPE = ["Spor Lisesi", "Anadolu Lisesi", "Fen Lisesi", "Koleji", "Cumhuriyet Lisesi"];

/* ================= POZİSYONLAR ================= */
export const POS = {
  PG: { n: "Oyun Kurucu", b: { pas: 10, hiz: 8 } },
  SG: { n: "Şutör Guard", b: { sut: 12, hiz: 4 } },
  SF: { n: "Kanat Oyuncusu", b: { sut: 6, sav: 6, hiz: 4 } },
  PF: { n: "Uzun Forvet", b: { guc: 8, sav: 6, sut: 2 } },
  C: { n: "Pivot", b: { guc: 10, sav: 8 } }
};
export const STATS = [
  ["sut", "Şut"],
  ["pas", "Pas"],
  ["hiz", "Çeviklik"],
  ["guc", "Güç"],
  ["sav", "Savunma"]
];
export const statName = k => STATS.find(s => s[0] === k)[1];
export const RELS = [
  ["koc", "Koç"],
  ["takim", "Takım"],
  ["taraf", "Taraftar"],
  ["aile", "Aile"],
  ["ark", "Arkadaşlar"],
  ["partner", "Partner"]
];
// pozisyona özel antrenmanlar: [id, ad, nitelik, mini oyun, açıklama]
export const DRILLS = {
  PG: [
    ["pnr", "Pick & roll okuma", "pas", "pass", "Perdeden sonra boş adamı bul."],
    ["handle", "Top sürme", "hiz", "dribble", "Kaydırarak çalım kombinasyonları."],
    ["pull", "Pull-up şut", "sut", "shoot", "Top sürüşten üçlük."]
  ],
  SG: [
    ["cs", "Catch & shoot", "sut", "shoot", "Pası al, hemen bırak."],
    ["step", "Step-back", "sut", "shootmid", "Adım geri, orta mesafe."],
    ["handle", "Çalım", "hiz", "dribble", "Savunmacıyı geç."]
  ],
  SF: [
    ["wing", "Kanat şutu", "sut", "shoot", "Köşe ve kanattan üçlük."],
    ["break", "Hızlı hücum bitiriş", "hiz", "dribble", "Koşu ve bitiriş."],
    ["perim", "Çevre savunması", "sav", "steal", "Pas arası zamanlaması."]
  ],
  PF: [
    ["pop", "Pick & pop", "sut", "shootmid", "Perde sonrası açıl, şut at."],
    ["post", "Post hareketleri", "guc", "post", "Sırtın potaya, it ve kanca at."],
    ["reb", "Ribaund", "guc", "rebound", "Zıpla, topu en yüksekte al."]
  ],
  C: [
    ["hook", "Kanca şutu", "guc", "post", "Pota altında güç ve dokunuş."],
    ["reb", "Ribaund", "guc", "rebound", "Boyalı alanın sahibi ol."],
    ["rim", "Pota koruması", "sav", "block", "Blok zamanlaması."],
    ["ft", "Serbest atış", "sut", "free", "Uzunların zayıf noktası."]
  ]
};
export const COMMON_DRILLS = [["gym", "Ağırlık salonu", "guc", "gym", "5 saniye boyunca hızlı dokun."]];
// pozisyona özel maç seçenekleri: [anahtar, ad, nitelik, açıklama]
export const PLAYS = {
  PG: {
    off: [
      ["pnr", "Pick & roll oku", "pas", "Perdeyi kullan, uzun adamı bul"],
      ["pull", "Pull-up üçlük", "sut", "Top sürüşten 3 sayı"],
      ["drive", "Potaya penetre", "hiz", "Çalım ve turnike"],
      ["lob", "Alley-oop pası", "pas", "Uzuna havadan pas"]
    ],
    def: [
      ["steal", "Top çal", "hiz", "Rakip oyun kurucunun topuna uzan"],
      ["safe", "Önünde kal", "sav", "Güvenli savunma"],
      ["charge", "Hücum faulü al", "sav", "Yerinde dur, çarpışmayı bekle"]
    ],
    sit: [
      "Topu yarı sahaya getirdin, uzun oyuncu perdeye geliyor",
      "Hücum süresinde 10 saniye var, top sende",
      "Hızlı hücum, önünde iki savunmacı var"
    ]
  },
  SG: {
    off: [
      ["catch", "Catch & shoot üçlük", "sut", "Pası al, hemen bırak"],
      ["step", "Step-back", "sut", "Adım geri, 2 sayı"],
      ["drive", "Penetre", "hiz", "Çalım ve turnike"],
      ["kick", "Pas ver", "pas", "Çift savunma gelince dışarı aç"]
    ],
    def: [
      ["steal", "Top çal", "hiz", "Pas arası dene"],
      ["safe", "Önünde kal", "sav", "Güvenli savunma"],
      ["block", "Arkadan blok", "sav", "Hızlı hücumda kovala"]
    ],
    sit: ["Köşede bekliyorsun, top sana geliyor", "Perdeden çıktın, top elinde", "Savunmacın çok yakın oynuyor"]
  },
  SF: {
    off: [
      ["wing", "Kanattan üçlük", "sut", "Kanatta boş kaldın"],
      ["break", "Hızlı hücum smaçı", "hiz", "Koşu ve bitiriş"],
      ["post", "Post-up", "guc", "Kısa adama sırtını dön"],
      ["kick", "Dışarı pas", "pas", "Boştaki şutöre aç"]
    ],
    def: [
      ["block", "Blok", "sav", "Potaya gelene yüksel"],
      ["steal", "Pas arası", "hiz", "Pas yoluna gir"],
      ["safe", "Önünde kal", "sav", "Güvenli savunma"]
    ],
    sit: ["Kanatta topu aldın, savunmacı geç kapatıyor", "Top çalındı, hızlı hücumdasın", "Eşleşmen senden kısa"]
  },
  PF: {
    off: [
      ["pop", "Pick & pop", "sut", "Perde sonrası açıl, orta mesafe"],
      ["post", "Post-up", "guc", "Sırtın potaya, it ve kanca"],
      ["putback", "Hücum ribaundu", "guc", "Kaçan şutu tamamla"],
      ["kick", "Dışarı pas", "pas", "Çift savunmayı cezalandır"]
    ],
    def: [
      ["block", "Blok", "sav", "Yardım savunmasından blok"],
      ["reb", "Savunma ribaundu", "guc", "Topu al, hücumu bitir"],
      ["safe", "Box-out", "guc", "Rakibi dışarıda tut"]
    ],
    sit: ["Perde attın, savunma sana kapatmadı", "Boyalı alanda pozisyon aldın", "Arkadaşın şut attı, ribaund mücadelesi"]
  },
  C: {
    off: [
      ["post", "Post-up kanca", "guc", "Sırtın potaya, it ve kanca"],
      ["dunk", "Alley-oop smaç", "guc", "Havadan gelen pası bitir"],
      ["putback", "Hücum ribaundu", "guc", "Kaçan şutu tamamla"],
      ["kick", "Dışarı pas", "pas", "Çift savunmayı cezalandır"]
    ],
    def: [
      ["block", "Pota koruması", "sav", "Potaya gelene blok"],
      ["reb", "Savunma ribaundu", "guc", "Topu al, hücumu bitir"],
      ["safe", "Pozisyon al", "sav", "Güvenli savunma"]
    ],
    sit: [
      "Pota altında pozisyon aldın, top sana geliyor",
      "Oyun kurucu perde istiyor, potaya dönüyorsun",
      "Şut kaçtı, top çemberde"
    ]
  }
};
