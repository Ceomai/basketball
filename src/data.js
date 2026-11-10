import { LANG, t as $t } from "./i18n/index.js";
import { BAL, STAGES, TDB, WAGE, isProStage, roleFor, stageLevel } from "./logic/rules.js";
import { strHash } from "./logic/rng.js";
export { BAL, TDB, WAGE };
import { late } from "./late.js";
import { brandTiers } from "./brand.js";
import { tok } from "./theme.js";
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
/** Olay yolu hatası: konsola yazılır ve hata raporlarına eklenir (src/errors.js) */
function busError(e, err) {
  console.error(e, err);
  try {
    if (typeof late.reportError === "function") late.reportError("bus", `${e}: ${(err && err.message) || err}`, err && err.stack);
  } catch (_) {
    /* raporlama da çalışmıyor */
  }
}
/** Haftalık panel ("week:sheet") sağlayıcılarının önceliği: küçük olan önce sorulur, ilk "true" dönen kazanır.
    Eşit öncelikte kayıt (modül yükleme) sırası geçerlidir (tests/unit/prio.test.mjs bu eşleri listeler). */
export const PRIO = Object.freeze({
  scenario: 1,
  gala: 2,
  camp: 3,
  newJersey: 4,
  goals: 5,
  unlock: 6,
  trait: 7,
  signature: 8,
  rehab: 9,
  midSeason: 10,
  midWindow: 11,
  bondsCoach: 12,
  cultureWelcome: 18,
  derbyCity: 18,
  derbyPress: 19,
  roleReview: 20,
  dilemma: 25,
  bondsBye: 30,
  storyTick: 30,
  charEvent: 35,
  family: 40,
  bondsSibling: 41,
  bondsParent: 42,
  bondsMate: 43,
  bondsAbroad: 43,
  bondsSpat: 44,
  tale: 45,
  bondsMemory: 46,
  cultureEvent: 48,
  backupNudge: 90
});
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
        busError(e, err);
      }
    }
  },
  use(e, f) {
    (this.m[e] = this.m[e] || []).push(f);
  },
  run(e, ctx, final) {
    const L = this.m[e] || [];
    let i = 0;
    // her ara katman kendi try/catch'inde: biri hata verirse raporlanır ve akış sıradakiyle sürer
    // (maç sonu akışı yarıda kalıp ekran 00:00'da donmasın). Aynı adımın next'i iki kez çağrılsa da tek sayılır.
    const next = () => {
      const f = L[i++];
      if (!f) return final(ctx);
      let called = false;
      const go = () => {
        if (called) return;
        called = true;
        next();
      };
      try {
        f(ctx, go);
      } catch (err) {
        busError(e, err);
        go();
      }
    };
    next();
  },
  // tag: "now" = zamana bağlı (ertelenirse kaçar) panel; sakin haftada da sorulur (src/extras.js weeklyHooks)
  offer(e, f, prio = 50, tag = "") {
    (this.p[e] = this.p[e] || []).push({ f, prio, tag });
    this.p[e].sort((a, b) => a.prio - b.prio);
  },
  /** Öncelik sırasıyla sor; ilk true dönen kazanır. maxPrio sayı ya da ({prio, tag}) => bool süzgeci */
  first(e, maxPrio = 999, ...a) {
    const ok = typeof maxPrio === "function" ? maxPrio : null;
    for (const { f, prio, tag } of this.p[e] || []) {
      if (ok) {
        if (!ok({ prio, tag })) continue;
      } else if (prio >= maxPrio) break;
      try {
        if (f(...a)) return true;
      } catch (err) {
        busError(e, err);
      }
    }
    return false;
  }
};
// Otomatik test modu (denge simülasyonu): kayıt, ses, bildirim ve olay panelleri kapatılır
export const SIM = () => !!window.__SIM;
// Başarı/hata renkleri CSS değişkeninden okunur: renk körlüğü modunda (Ayarlar) mavi/turuncu olur, tuvaller de uyar
export const GOOD = () => tok("--good");
export const BAD = () => tok("--bad");
export const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const hash = strHash; // tek kaynak: src/logic/rng.js
export const wait = ms => new Promise(r => setTimeout(r, ms));
/** Seçim kartı düğmeleri (Hikâye anı, Günün Maçı, ribaund): opts = [[anahtar, başlık, açıklama], ...] → data-<attr>.
    cdAlways false ise boş açıklamanın <span class="cd"> öğesi hiç yazılmaz. */
export const choiceButtons = (opts, attr, cdAlways = true) =>
  opts
    .map(
      ([k, t, d]) =>
        `<button class="choice" data-${attr}="${k}"><span class="ct">${t}</span>${cdAlways || d ? `<span class="cd">${d}</span>` : ""}</button>`
    )
    .join("");
/** root içindeki data-<attr> düğmelerinden ilk tıklananın anahtarı */
export const pickChoice = (root, attr) =>
  new Promise(res => root.querySelectorAll(`[data-${attr}]`).forEach(b => (b.onclick = () => res(b.dataset[attr]))));
export const INK = "#141414";
// son bildirimler (hafta özeti için; src/plan.js)
export const TOAST_LOG = [];
/** Bildirim süresi metin uzunluğuna göre: kısa metin 2,6 sn, uzun metin en az 4 sn (en fazla 7 sn) */
export const toastMs = t => {
  const n = String(t).length;
  return n <= 50 ? 2600 : Math.min(7000, Math.max(4000, n * 55));
};
/** Kısa bildirim; metin bildirim kutusunda da kalır. o.noInbox: geçici uyarı ("Bir seçim yap", hata, kilit), kutuya
    okunmamış kayıt olarak düşmez. */
export function toast(t, o) {
  if (SIM()) return;
  TOAST_LOG.push(String(t));
  if (TOAST_LOG.length > 60) TOAST_LOG.splice(0, 20);
  if (!(o && o.noInbox) && typeof late.inboxAdd === "function") late.inboxAdd(t, "toast"); // bildirim kutusu (src/inbox.js)
  if (typeof late.sfx === "function") late.sfx("notify");
  // ardışık bildirim: önceki 150 ms'de çekilir (duyurusu kapanır; sorgularda yenisi önce gelir), yenisi 180 ms'de gelir
  const reduced = typeof late.motionReduced === "function" && late.motionReduced();
  $$(".toast").forEach(x => toastOut(x, reduced || x.classList.contains("out")));
  const d = document.createElement("div");
  // maçta: skor tabelasının hemen altında ince şerit (karar başlığını ve seçenekleri örtmez, dokunuşu geçirir);
  // panel/reklam açıkken üstte; ana ekranda alttaki eylem çubuğunun üstünde
  const bug = !document.querySelector(".sheet, #adov") && document.querySelector("#bug .bug"),
    bar = document.querySelector("#actbar");
  if (bug) {
    d.className = "toast strip";
    d.style.top = `${Math.max(0, Math.round(bug.getBoundingClientRect().bottom)) + 4}px`;
  } else d.className = document.querySelector(".sheet, #adov, #mview, .cta-bar") ? "toast top" : "toast";
  if (!bug && bar && d.className === "toast" && getComputedStyle(bar).position === "fixed")
    d.style.bottom = `${Math.round(bar.getBoundingClientRect().height) + 12}px`;
  d.setAttribute("role", "status");
  d.setAttribute("aria-live", "polite");
  d.setAttribute("aria-atomic", "true");
  d.textContent = t;
  // yenisi eskilerin önüne eklenir: $(".toast") her zaman güncel bildirimi bulur
  document.body.insertBefore(d, document.querySelector(".toast"));
  setTimeout(() => d.classList.contains("out") || toastOut(d, reduced), toastMs(t));
}
/** Bildirimi kaldır: hemen (now) ya da 150 ms çıkış animasyonuyla */
function toastOut(x, now) {
  if (now) return x.remove();
  x.classList.add("out");
  x.removeAttribute("role");
  x.removeAttribute("aria-live");
  setTimeout(() => x.remove(), 160);
}
// Türkçede ondalık virgül ve "B" (bin); İngilizcede nokta ve "K" ("B" orada milyar okunur)
const dec = x => (LANG === "tr" ? x.replace(".", ",") : x);
export const kfmt = n => {
  const K = LANG === "tr" ? "B" : "K";
  return n >= 1e6
    ? dec((n / 1e6).toFixed(1)) + "M"
    : n >= 1e4
      ? Math.round(n / 1e3) + K
      : n >= 1e3
        ? dec((n / 1e3).toFixed(1)) + K
        : String(Math.round(n));
};
export const RATE = 40; // para birimi: içeride €, ekranda ₺
export function fmt(eur) {
  const v = Math.round(eur * RATE),
    a = Math.abs(v),
    s = a >= 1e7 ? dec((a / 1e6).toFixed(1)) + "M" : a.toLocaleString(LANG === "tr" ? "tr-TR" : "en-US");
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
    n: $t("league.turkiye"),
    t: brandTiers("TR", ["Basketbol Süper Ligi", "TBL", "TB2L"]),
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
    n: $t("league.spain"),
    t: brandTiers("ES", ["Liga ACB", "Primera FEB", "Segunda FEB"]),
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
    n: $t("league.italy"),
    t: brandTiers("IT", ["Serie A", "Serie A2", "Serie B"]),
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
    n: $t("league.france"),
    t: brandTiers("FR", ["LNB Élite", "Pro B", "Nationale 1"]),
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
    n: $t("league.germany"),
    t: brandTiers("DE", ["BBL", "ProA", "ProB"]),
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
    n: $t("league.greece"),
    t: brandTiers("GR", ["GBL", "Elite League", "National League 1"]),
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
    n: $t("league.serbia"),
    t: brandTiers("RS", ["KLS", "Prva Liga", "Druga Liga"]),
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
    n: $t("league.lithuania"),
    t: brandTiers("LT", ["LKL", "NKL", "RKL"]),
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
    n: $t("common.usa"),
    t: brandTiers("US", ["NBA"]),
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
export const ORDER = STAGES; // kademe sırasının tek kaynağı: src/logic/rules.js
// Lig zorluğu: o ligde "yerinde" bir oyuncunun genel puanı yaklaşık TDB+45'tir; bu durumda maçta etkin değer ~45 olur.
export const SC = { lise: 52, uni: 60, t3: 66, t2: 72, t1: 78, euro: 80, nba: 108 }; // skor ölçeği
export const isPro = isProStage;
// Lig seviyesi ve rol: kurallar logic/rules.js'te, burada ülke çarpanı eklenir
export function tdOf(stage, cc) {
  return stageLevel(stage, (LEAGUES[cc] || LEAGUES.TR).pr);
}
// rol: genel puanın lig seviyesine göre konumu
export function roleAt(o, stage, cc) {
  return roleFor(o, tdOf(stage, cc));
}
export function leagueName(stage, cc, ss) {
  if (stage === "lise") return ss === 1 ? $t("data.istanbulHighSchools") : $t("data.turkiyeHighSchools");
  if (stage === "uni") return $t("data.universityLeague");
  if (stage === "euro") return $t("data.euroleague");
  if (stage === "nba") return $t("common.nba");
  return (LEAGUES[cc] || LEAGUES.TR).t[{ t1: 0, t2: 1, t3: 2 }[stage]];
}
export const levelName = st =>
  ({
    lise: $t("common.highSchool"),
    uni: $t("common.university"),
    t3: $t("data.level3"),
    t2: $t("data.level2"),
    t1: $t("data.level1"),
    euro: $t("data.euroleague"),
    nba: $t("common.nba")
  })[st];
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
  "Navigators"
];
export const PAT = {
  TR: [
    c => `${c} ${MASC_TR[hash(c) % 12]}`,
    c =>
      $t("club.belediyespor", {
        c: c
      }),
    c =>
      $t("club.genclikspor", {
        c: c
      }),
    c =>
      $t("club.basketball", {
        c: c
      })
  ],
  ES: [
    c => `CB ${c}`,
    c =>
      $t("club.basket", {
        c: c
      }),
    c =>
      $t("club.clubBaloncesto", {
        c: c
      }),
    c =>
      $t("club.atletico", {
        c: c
      })
  ],
  IT: [
    c =>
      $t("club.pallacanestro", {
        c: c
      }),
    c =>
      $t("club.basket", {
        c: c
      }),
    c =>
      $t("club.polisportiva", {
        c: c
      }),
    c =>
      $t("club.aquile", {
        c: c
      })
  ],
  FR: [
    c =>
      $t("club.basket", {
        c: c
      }),
    c =>
      $t("club.etoileDe", {
        c: c
      }),
    c =>
      $t("club.union", {
        c: c
      }),
    c =>
      $t("club.metropole", {
        c: c
      })
  ],
  DE: [
    c => `BC ${c}`,
    c =>
      $t("club.dragons", {
        c: c
      }),
    c => `SV ${c}`,
    c =>
      $t("club.falken", {
        c: c
      })
  ],
  GR: [
    c => `${c} BC`,
    c => `AS ${c}`,
    c =>
      $t("club.asteras", {
        c: c
      }),
    c =>
      $t("club.ermis", {
        c: c
      })
  ],
  RS: [
    c => `KK ${c}`,
    c =>
      $t("club.okk", {
        c: c
      }),
    c =>
      $t("club.basket", {
        c: c
      }),
    c =>
      $t("club.kkMladost", {
        c: c
      })
  ],
  LT: [
    c => `BC ${c}`,
    c =>
      $t("club.krepsinis", {
        c: c
      }),
    c =>
      $t("club.vilkai", {
        c: c
      }),
    c => `KK ${c}`
  ],
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
export const IST_TYPE = [$t("school.sportsHighSchool"), $t("school.anatolianHighSchool"), $t("school.scienceHighSchool"), $t("school.college"), $t("school.cumhuriyetHighSchool")];

/* ================= POZİSYONLAR ================= */
export const POS = {
  PG: { n: $t("position.pointGuard"), b: { pas: 10, hiz: 8 } },
  SG: { n: $t("position.shootingGuard"), b: { sut: 12, hiz: 4 } },
  SF: { n: $t("position.smallForward"), b: { sut: 6, sav: 6, hiz: 4 } },
  PF: { n: $t("position.powerForward"), b: { guc: 8, sav: 6, sut: 2 } },
  C: { n: $t("position.center"), b: { guc: 10, sav: 8 } }
};
export const STATS = [
  ["sut", $t("common.shooting")],
  ["pas", $t("common.passing")],
  ["hiz", $t("common.agility")],
  ["guc", $t("stat.strength")],
  ["sav", $t("common.defense")]
];
export const statName = k => STATS.find(s => s[0] === k)[1];
export const RELS = [
  ["koc", $t("relation.coach")],
  ["takim", $t("common.team")],
  ["taraf", $t("common.fans")],
  ["aile", $t("relation.family")],
  ["ark", $t("relation.friends")],
  ["partner", $t("relation.partner")]
];
// pozisyona özel antrenmanlar: [id, ad, nitelik, mini oyun, açıklama]
export const DRILLS = {
  PG: [
    ["pnr", $t("drill.pickRollReading"), "pas", "pass", $t("drill.findOpenMan")],
    ["handle", $t("drill.dribbling"), "hiz", "dribble", $t("drill.swipeChainCrossover")],
    ["pull", $t("drill.pullShot"), "sut", "shoot", $t("drill.threePointerOff")]
  ],
  SG: [
    ["cs", $t("drill.catchShoot"), "sut", "shoot", $t("drill.takePassRelease")],
    ["step", $t("data.stepBack"), "sut", "shootmid", $t("drill.stepBackMid")],
    ["handle", $t("common.crossover"), "hiz", "dribble", $t("drill.getPastDefender")]
  ],
  SF: [
    ["wing", $t("drill.wingShot"), "sut", "shoot", $t("drill.threesCornerWing")],
    ["break", $t("drill.fastBreakFinish"), "hiz", "dribble", $t("drill.runFinish")],
    ["perim", $t("drill.perimeterDefense"), "sav", "steal", $t("drill.timePassingLane")]
  ],
  PF: [
    ["pop", $t("data.pickPop"), "sut", "shootmid", $t("drill.popAfterScreen")],
    ["post", $t("drill.postMoves"), "guc", "post", $t("drill.backBasketPush")],
    ["reb", $t("common.rebound"), "guc", "rebound", $t("drill.jumpGrabBall")]
  ],
  C: [
    ["hook", $t("drill.hookShot"), "guc", "post", $t("drill.strengthTouchUnder")],
    ["reb", $t("common.rebound"), "guc", "rebound", $t("drill.ownPaint")],
    ["rim", $t("data.rimProtection"), "sav", "block", $t("drill.blockTiming")],
    ["ft", $t("common.freeThrow"), "sut", "free", $t("drill.bigMansWeak")]
  ]
};
export const COMMON_DRILLS = [["gym", $t("drill.weightRoom"), "guc", "gym", $t("drill.tapFastSeconds5")]];
// pozisyona özel maç seçenekleri: [anahtar, ad, nitelik, açıklama]
export const PLAYS = {
  PG: {
    off: [
      ["pnr", $t("plays.readPickRoll"), "pas", $t("plays.useScreenFind")],
      ["pull", $t("plays.pullThree"), "sut", $t("plays.pointsOffDribble3")],
      ["drive", $t("plays.driveRim"), "hiz", $t("plays.crossoverLayup")],
      ["lob", $t("common.alleyOopPass"), "pas", $t("plays.lobBigMan")]
    ],
    def: [
      ["steal", $t("plays.stealBall"), "hiz", $t("plays.reachOpposingPoint")],
      ["safe", $t("plays.stayFront"), "sav", $t("plays.safeDefense")],
      ["charge", $t("plays.drawOffensiveFoul"), "sav", $t("plays.standGroundWait")]
    ],
    sit: [$t("plays.broughtBallFrontcourt"), $t("plays.secondsLeftShot10"), $t("plays.fastBreakTwo")]
  },
  SG: {
    off: [
      ["catch", $t("plays.catchShootThree"), "sut", $t("plays.takePassRelease")],
      ["step", $t("data.stepBack"), "sut", $t("plays.stepBackPoints2")],
      ["drive", $t("plays.drive"), "hiz", $t("plays.crossoverLayup")],
      ["kick", $t("plays.pass"), "pas", $t("plays.kickWhenDouble")]
    ],
    def: [
      ["steal", $t("plays.stealBall"), "hiz", $t("plays.tryPassingLane")],
      ["safe", $t("plays.stayFront"), "sav", $t("plays.safeDefense")],
      ["block", $t("plays.blockBehind"), "sav", $t("plays.chaseDownFast")]
    ],
    sit: [$t("plays.waitingCornerBall"), $t("plays.cameOffScreen"), $t("plays.defenderPlayingToo")]
  },
  SF: {
    off: [
      ["wing", $t("plays.wingThree"), "sut", $t("plays.openWing")],
      ["break", $t("plays.fastBreakDunk"), "hiz", $t("plays.runFinish")],
      ["post", $t("common.post"), "guc", $t("plays.turnBackShorter")],
      ["kick", $t("plays.pass2"), "pas", $t("plays.kickOpenShooter")]
    ],
    def: [
      ["block", $t("common.block"), "sav", $t("plays.riseOneComing")],
      ["steal", $t("plays.passingLane"), "hiz", $t("plays.stepPassingLane")],
      ["safe", $t("plays.stayFront"), "sav", $t("plays.safeDefense")]
    ],
    sit: [$t("plays.gotBallWing"), $t("plays.stealFastBreak"), $t("plays.matchupShorter")]
  },
  PF: {
    off: [
      ["pop", $t("data.pickPop"), "sut", $t("plays.popAfterScreen")],
      ["post", $t("common.post"), "guc", $t("plays.backBasketPush")],
      ["putback", $t("common.offensiveRebound"), "guc", $t("plays.finishMissedShot")],
      ["kick", $t("plays.pass2"), "pas", $t("plays.punishDoubleTeam")]
    ],
    def: [
      ["block", $t("common.block"), "sav", $t("plays.blockHelpDefense")],
      ["reb", $t("common.defensiveRebound"), "guc", $t("plays.grabBallFinish")],
      ["safe", $t("plays.box"), "guc", $t("plays.keepOpponent")]
    ],
    sit: [$t("plays.setScreenDefense"), $t("plays.gotPositionPaint"), $t("plays.teammateShotBattle")]
  },
  C: {
    off: [
      ["post", $t("plays.postHook"), "guc", $t("plays.backBasketPush")],
      ["dunk", $t("common.alleyOopDunk"), "guc", $t("plays.finishLob")],
      ["putback", $t("common.offensiveRebound"), "guc", $t("plays.finishMissedShot")],
      ["kick", $t("plays.pass2"), "pas", $t("plays.punishDoubleTeam")]
    ],
    def: [
      ["block", $t("data.rimProtection"), "sav", $t("plays.blockOneComing")],
      ["reb", $t("common.defensiveRebound"), "guc", $t("plays.grabBallFinish")],
      ["safe", $t("plays.takePosition"), "sav", $t("plays.safeDefense")]
    ],
    sit: [$t("plays.gotPositionUnder"), $t("plays.pointGuardWants"), $t("plays.shotMissedBall")]
  }
};
