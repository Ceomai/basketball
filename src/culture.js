/* ================= ŞEHİR DOKUSU: BÖLGESEL KÜLTÜR KATMANI =================
   Oyuncunun bulunduğu şehre göre dünyanın kültürel yüzü değişir; mekanik (enerji, moral, para, ilişki,
   zaman dilimi) hiç değişmez. NBA'deyken Moda sahiline gidilmez, Madrid'de simit yerine bocadillo yenir.
   Bölgeler: ist (İstanbul; mevcut metinler zaten İstanbul), tr (Anadolu şehirleri), es, it, gr, rs, fr, de, lt,
   ABD alt bölgeleri usw (batı kıyısı), use (doğu), uss (güney), usm (orta batı ve dağlar); ortak yedek "us".
   1) Metin katmanı: CU_OV'deki anahtarlar ($t) bölgede karşılığı varsa onu döndürür. Yedek zinciri:
      şehre özgü özel ad (CU_CITY) → cu.<bölge>.<yuva>[_<su>] → cu.<grup>.<yuva>[_<su>] → cu.all.<yuva>[_<su>]
      → genel (İstanbul) metin. <su>: s deniz, r nehir, l göl, n kıyısız (Madrid'de "Liman" yerine "Madrid Río").
      Metinlerde {@yuva} yer tutucusu başka bir yuvanın bölgesel adıyla dolar (ör. "İmza günü · {@mall}").
   2) Harita: bölgeye göre küçük görsel ipuçları (sarı taksi, palmiye, piazza çeşmesi, Paris reklam kolonu,
      U-Bahn tabelası, avlu potası, martılar ve simit tezgâhı) — okunabilirliği bozmadan.
   3) "Yeni şehir" paneli: ilk taşınmada bir kez; şehrin 3 imza detayı, dil, ulaşım, maç günü, tribün ve ilk seçim.
   4) Şehir hayatı olayları: her bölge için 5 kısa olay (yemek, dil, taraftar, ulaşım, komşu); aynı mekanik
      etkiler, bölgeye özgü metin; bölgede tekrar etmez. Haftalık panel üzerinden (src/extras.js → week:sheet). */
import { setTOverride, t as $t, tRaw } from "./i18n/index.js";
import { $$, Bus, CITY_C, LEAGUES, cityTheme, esc, fmt, toast, PRIO } from "./data.js";
import { S, closeSheet, norm, renderMain, sheet, tx, weekNo } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

/* ---- bölgeler ---- */
const CC_REG = { ES: "es", IT: "it", GR: "gr", RS: "rs", FR: "fr", DE: "de", LT: "lt" };
const US_SUB = {
  usw: ["Los Angeles", "San Francisco", "Sacramento", "Portland", "Seattle", "Phoenix"],
  use: ["New York", "Boston", "Philadelphia", "Washington", "Toronto", "Charlotte", "Brooklyn"],
  uss: ["Miami", "Orlando", "Atlanta", "Houston", "Dallas", "San Antonio", "New Orleans", "Memphis", "Oklahoma City"],
  usm: ["Chicago", "Milwaukee", "Minneapolis", "Detroit", "Cleveland", "Indianapolis", "Denver", "Salt Lake City"]
};
/** @param {string} [city] */
export function cuRegion(city = S && S.city) {
  if (!city || city === "İstanbul") return "ist";
  const cc = CITY_C[city] || "TR";
  if (cc === "TR") return "tr";
  if (cc === "US") {
    for (const [r, L] of Object.entries(US_SUB)) if (L.includes(city)) return r;
    return "use";
  }
  return CC_REG[cc] || "tr";
}
const grpOf = r => (r.startsWith("us") ? "us" : r === "ist" ? "tr" : r);
/** Oyuncu Türkiye dışında mı (Türkiye'ye özgü olaylar için) */
export const cuForeign = () => !!(S && S.city && (CITY_C[S.city] || "TR") !== "TR");

/* ---- şehirler: imza kodu (cu.c.<kod>.1-3), kıyı/park özel adı (wf), sokak sahası (court), kültürel su türü (w) ---- */
export const CU_CITY = {
  İstanbul: { c: "ist" },
  Ankara: { c: "ank", wf: "Eymir Gölü", w: "l" },
  İzmir: { c: "izm", wf: "Kordon" },
  Eskişehir: { c: "esk", wf: "Porsuk Çayı", w: "r" },
  Bursa: { c: "brs", wf: "Kültürpark", w: "n" },
  Antalya: { c: "ant", wf: "Konyaaltı" },
  Trabzon: { c: "trb" },
  Konya: { c: "kny", wf: "Meram", w: "n" },
  Gaziantep: { c: "gaz" },
  Mersin: { c: "mer" },
  Madrid: { c: "mad", wf: "Madrid Río", w: "r" },
  Barcelona: { c: "bcn", wf: "Barceloneta" },
  Valencia: { c: "vlc", wf: "Malvarrosa" },
  Málaga: { c: "mlg", wf: "La Malagueta" },
  Vitoria: { c: "vit", wf: "Anillo Verde", w: "n" },
  Badalona: { wf: "Pont del Petroli" },
  Tenerife: { wf: "Las Teresitas" },
  "Gran Canaria": { wf: "Las Canteras" },
  Sevilla: { wf: "Guadalquivir" },
  Milano: { c: "mil", wf: "Navigli", w: "r" },
  Bologna: { c: "bol", wf: "Giardini Margherita", w: "n" },
  Venedik: { c: "ven", wf: "Zattere" },
  Roma: { wf: "Lungotevere" },
  Napoli: { wf: "Lungomare Caracciolo" },
  Torino: { wf: "Murazzi del Po" },
  Atina: { c: "ath", wf: "Faliro", w: "s" },
  Pire: { c: "pir", wf: "Mikrolimano" },
  Selanik: { c: "skg", wf: "Nea Paralia" },
  Belgrad: { c: "beg", wf: "Ada Ciganlija", w: "l" },
  "Novi Sad": { c: "nsd", wf: "Štrand" },
  Paris: { c: "par", wf: "Quais de Seine", court: "Playground Pigalle" },
  Lyon: { c: "lyo", wf: "Berges du Rhône" },
  Monako: { c: "mco", wf: "Port Hercule" },
  Strazburg: { c: "sxb", wf: "Petite France" },
  Berlin: { c: "ber", wf: "Spreeufer" },
  Münih: { c: "muc", wf: "Englischer Garten", w: "r" },
  Hamburg: { c: "ham", wf: "Landungsbrücken" },
  Bamberg: { c: "bam", wf: "Klein-Venedig" },
  Ulm: { c: "ulm", wf: "Donauufer" },
  Kaunas: { c: "kun", wf: "Santakos parkas" },
  Vilnius: { c: "vno", wf: "Neries krantinė" },
  Klaipėda: { c: "kla", wf: "Smiltynė" },
  "Los Angeles": { c: "lax", wf: "Santa Monica Pier", court: "Venice Beach" },
  "San Francisco": { c: "sfo", wf: "Embarcadero" },
  Sacramento: { wf: "Old Sacramento", w: "r" },
  Portland: { wf: "Waterfront Park" },
  Phoenix: { wf: "Tempe Town Lake", w: "l" },
  "New York": { c: "nyc", wf: "Hudson River Park", court: "The Cage · W 4th" },
  Boston: { c: "bos", wf: "Esplanade", w: "r" },
  Philadelphia: { c: "phl", wf: "Schuylkill Trail" },
  Washington: { wf: "The Wharf", w: "r" },
  Toronto: { c: "yyz", wf: "Harbourfront" },
  Charlotte: { wf: "Freedom Park", w: "n" },
  Miami: { c: "mia", wf: "South Beach", court: "Flamingo Park" },
  Orlando: { wf: "Lake Eola", w: "l" },
  Atlanta: { wf: "Piedmont Park", w: "n" },
  Houston: { c: "hou", wf: "Buffalo Bayou", w: "r" },
  Dallas: { c: "dal", wf: "Klyde Warren Park", w: "n" },
  "San Antonio": { c: "sat", wf: "River Walk", w: "r" },
  "New Orleans": { c: "msy", wf: "Riverfront", w: "r" },
  Memphis: { c: "mem", wf: "Riverwalk", w: "r" },
  "Oklahoma City": { c: "okc", wf: "Bricktown Canal", w: "r" },
  Chicago: { c: "chi", wf: "Lakefront Trail", w: "l" },
  Milwaukee: { wf: "Lakefront", w: "l" },
  Minneapolis: { wf: "Stone Arch Bridge", w: "r" },
  Detroit: { wf: "Riverwalk", w: "r" },
  Cleveland: { wf: "Edgewater Park", w: "l" },
  Indianapolis: { wf: "Canal Walk", w: "r" },
  Denver: { c: "den", wf: "Cherry Creek", w: "r" },
  "Salt Lake City": { wf: "Liberty Park", w: "n" }
};
const CITY_SLOT = { wf: "wf", street: "court" };
const waterOf = city => {
  const c = CU_CITY[city];
  if (c && c.w) return c.w;
  const w = cityTheme(city).water;
  return w === "s" || w === "r" || w === "l" ? w : "n";
};

/* ---- metin katmanı: genel anahtar → bölgesel yuva ---- */
export const CU_OV = {
  "common.cafe": "cafe",
  "map.mall": "mall",
  "map.market": "market",
  "common.entertainmentCenter": "fun",
  "st.name": "street",
  "hb.name": "wf",
  "dist.merkez": "hood",
  "dist.kompleks": "complex",
  "common.rentalApartment": "house2",
  "map.residence": "house3",
  "place.residenceApartment": "house3",
  "common.villa": "house4",
  "common.mansion": "house5",
  "fun.nightclub": "club",
  "art.neighborhoodMarket": "sign",
  "art.turkishCoffee": "menu1",
  "art.tea": "menu2",
  "art.cake": "menu3",
  "cafe.whatGetCake": "cafeSay",
  "cafe.coffeeChat": "cafeTalk",
  "market.freshTodayHelp": "mktSay",
  "market.chickenSandwich": "snack",
  "market.icedCoffee": "coldCoffee",
  "store.fashionBoutique": "boutique",
  "st.sub": "stSub",
  "st.kids": "stKids",
  "tl.bus.runNo": "busNo",
  "tl.sg.s": "sgSub",
  "tl.rk.no": "rkNo",
  "hb.sub": "hbSub",
  "hb.single": "hbSingle",
  "hb.walk": "hbWalk",
  "hb.walkRes": "seaAir",
  "mev.tekneR": "seaAir",
  "hb.meet": "hbMeet",
  "hb.r.rest": "hbRest",
  "hb.r.yat": "hbYacht",
  "mev.tekne": "mevTekne",
  "mev.tekneD": "mevTekneD",
  "mev.imza": "mevImza",
  "mev.imzaD": "mevImzaD",
  "mev.kosuD": "mevKosuD",
  "sl.host": "slHost",
  "sl.hostR": "slHostR",
  "sl.hostNews": "slHostNews",
  "vn.sl.liman": "sl1",
  "vn.sl.carsi": "sl2",
  "vn.sl.kopru": "sl3",
  "vn.sl.yokus": "sl4",
  "vn.sl.kartal": "sl5"
};
const CU_DEF = {};
for (const [k, s] of Object.entries(CU_OV)) if (!CU_DEF[s]) CU_DEF[s] = k;
const tok = s => (s.indexOf("{@") < 0 ? s : s.replace(/\{@(\w+)\}/g, (m, k) => cuT(k)));
/** Bölgesel yuvanın metni (yoksa undefined). @param {string} slot @param {string} [city] */
export function cuGet(slot, city = S && S.city) {
  if (!city) return undefined;
  const c = CU_CITY[city],
    cs = CITY_SLOT[slot];
  if (c && cs && c[cs]) return c[cs];
  const reg = cuRegion(city),
    g = grpOf(reg),
    w = waterOf(city);
  const chain = reg === g ? [reg] : [reg, g];
  for (const r of chain) {
    const v = tRaw(`cu.${r}.${slot}_${w}`) ?? tRaw(`cu.${r}.${slot}`);
    if (v != null) return tok(v);
  }
  // Türkiye içinde genel yedekler yalnızca kıyı türüne göre (AVM zaten AVM)
  const v = tRaw(`cu.all.${slot}_${w}`) ?? (g === "tr" ? undefined : tRaw(`cu.all.${slot}`));
  return v != null ? tok(v) : undefined;
}
/** Bölgesel ad; bölgede yoksa genel (İstanbul) metni. @param {string} slot */
export function cuT(slot) {
  const v = cuRegion() === "ist" ? undefined : cuGet(slot);
  if (v != null) return v;
  const d = CU_DEF[slot];
  return d ? (tRaw(d) ?? slot) : (tRaw(`cu.${cuRegion()}.${slot}`) ?? tRaw(`cu.${grpOf(cuRegion())}.${slot}`) ?? slot);
}
setTOverride(key => {
  const slot = CU_OV[key];
  if (!slot || !S || !S.city || S.city === "İstanbul") return undefined;
  return cuGet(slot);
});

/* ---- çaylak siparişleri (src/tales.js): bölgenin yemekleri + her yerde bulunanlar ---- */
const CU_ORD = {
  es: ["churros", "tortilla", "paella", "bocadillo"],
  it: ["cornetto", "panino", "arancini", "pizzaslice"],
  gr: ["gyros", "freddo", "bougatsa", "koulouri"],
  rs: ["burek", "cevapi", "pljeskavica", "kajmak"],
  fr: ["croissant", "jambon", "crepe", "quiche"],
  de: ["brezel", "currywurst", "doner", "schorle"],
  lt: ["cepelinai", "kibinai", "saltibarsciai", "gira"],
  us: ["bagel", "burrito", "wings", "donut"]
};
/** @param {string[]} def Türkiye listesi */
export function cuOrders(def) {
  const L = CU_ORD[grpOf(cuRegion())];
  return L ? [...L, "espresso", "smoothie", "sushi"] : def;
}

/* ---- şehrin imza detayları ve kısa kültür notları ---- */
export function cuSig(city = S && S.city) {
  const c = CU_CITY[city];
  if (c && c.c) return [1, 2, 3].map(i => $t(`cu.c.${c.c}.${i}`));
  const reg = cuRegion(city);
  return [1, 2, 3].map(i => tRaw(`cu.${reg}.sig${i}`) ?? tRaw(`cu.${grpOf(reg)}.sig${i}`) ?? "");
}

/* ---- harita görsel ipuçları (src/map.js) ---- */
const PALM = new Set(["usw", "uss"]);
/** Ağaç: bölgeye göre palmiye, zeytin, portakal, çınar, köknar; yoksa undefined (varsayılan ağaç) */
export function cuTreeSVG(P, x, y, lit) {
  const r = cuRegion(P.city),
    coast = waterOf(P.city) === "s";
  const trunk = `<rect x="${x - 1.5}" y="${y - 8}" width="3" height="8" fill="#5b4636"/>`;
  if (PALM.has(r) || ((r === "es" || r === "gr") && coast && (x + y) % 3 === 0))
    return `<path d="M${x} ${y}Q${x + 2} ${y - 9} ${x - 1} ${y - 18}" stroke="#6d5440" stroke-width="2.2" fill="none"/><path d="M${x - 1} ${y - 18}q-8 -1 -11 4M${x - 1} ${y - 18}q8 -1 11 4M${x - 1} ${y - 18}q-4 -6 -10 -5M${x - 1} ${y - 18}q4 -6 10 -5" stroke="${lit ? "#1f3a2a" : "#3f8a4f"}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  if (r === "es")
    return `${trunk}<circle cx="${x}" cy="${y - 13}" r="7" fill="${lit ? "#1f3a2a" : "#2f6b3e"}"/><circle cx="${x - 3}" cy="${y - 14}" r="1.4" fill="#ff9f1c"/><circle cx="${x + 3}" cy="${y - 11}" r="1.4" fill="#ff9f1c"/><circle cx="${x + 1}" cy="${y - 17}" r="1.3" fill="#ff9f1c"/>`;
  if (r === "gr" || r === "it")
    return `${trunk}<ellipse cx="${x}" cy="${y - 13}" rx="8" ry="6" fill="${lit ? "#26332a" : "#7d9471"}"/>`;
  if (r === "fr") return `${trunk}<circle cx="${x}" cy="${y - 14}" r="8" fill="${lit ? "#22402c" : "#5f9e5a"}"/>`;
  if (r === "lt" || r === "usm")
    return `<rect x="${x - 1.5}" y="${y - 6}" width="3" height="6" fill="#5b4636"/><path d="M${x} ${y - 24}L${x + 7} ${y - 6}H${x - 7}Z" fill="${lit ? "#173226" : "#2e5e43"}"/>`;
  return undefined;
}
/** Arabalar: ABD'de biri sarı taksi; diğer bölgelerde yerel renk tonu */
export function cuCarColors(P) {
  const r = cuRegion(P.city);
  if (grpOf(r) === "us") return ["#c0392b", "#f7c51e", "#2a9d8f", "#f7c51e"];
  if (r === "it") return ["#c0392b", "#d8b25a", "#7fc8a9", "#8e99a8"]; // vespa yeşili
  if (r === "ist") return ["#c0392b", "#f2c230", "#2a9d8f", "#8e99a8"]; // sarı taksi İstanbul'da da var
  return undefined;
}
// küçük yerel ögeler: kaldırım/kavşak noktalarına (blokların ve etiketlerin dışında)
export function cuMapSVG(P, lit, d2) {
  const r = cuRegion(P.city),
    g = grpOf(r);
  let s = "";
  const gull = (x, y) =>
    `<path d="M${x - 6} ${y}q3 -4 6 0q3 -4 6 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/>`;
  const simit = (x, y) =>
    `<rect x="${x - 9}" y="${y - 12}" width="18" height="9" rx="1.5" fill="#c62828"/><rect x="${x - 10}" y="${y - 14}" width="20" height="3" fill="#ffd27a"/><circle cx="${x - 4}" cy="${y - 8}" r="2.6" fill="none" stroke="#d4a055" stroke-width="1.6"/><circle cx="${x + 3}" cy="${y - 8}" r="2.6" fill="none" stroke="#d4a055" stroke-width="1.6"/><circle cx="${x - 6}" cy="${y - 1}" r="1.8" fill="#333"/><circle cx="${x + 6}" cy="${y - 1}" r="1.8" fill="#333"/>`;
  if (r === "ist") {
    if (!lit) s += gull(150, 112) + gull(178, 104) + gull(214, 114); // vapur martıları (HUD kartlarının arasında)
    if (!d2) s += simit(208, 418);
  } else if (r === "tr") {
    if (!d2) s += simit(208, 418);
  } else if (r === "it" && !d2) {
    // piazza çeşmesi: kavşakta
    s += `<circle cx="160" cy="414" r="10" fill="#d9cbb0" stroke="#a89c84"/><circle cx="160" cy="414" r="6.5" fill="${lit ? "#1d4e7a" : "#6fb3e0"}"/><rect x="158.8" y="404" width="2.4" height="9" fill="#d9cbb0"/><circle cx="160" cy="403" r="2" fill="#bfe3ff" opacity=".9"/>`;
  } else if (r === "fr" && !d2) {
    // Paris reklam kolonu (colonne Morris)
    s += `<rect x="202" y="402" width="9" height="16" rx="2" fill="#2e6b4a"/><path d="M200 402h13l-2 -4h-9z" fill="#2e6b4a"/><rect x="203" y="406" width="7" height="8" fill="#f4e6c4"/>`;
  } else if (r === "de" && !d2) {
    // U-Bahn tabelası ve bisiklet
    s += `<rect x="203.5" y="384" width="2" height="18" fill="#6b7686"/><rect x="198" y="376" width="13" height="11" rx="1.5" fill="#1f56a8"/><text x="204.5" y="385" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="10" fill="#fff">U</text>`;
  } else if (r === "lt" && !d2) {
    // avlu potaları: her avluda bir pota
    [
      [140, 404],
      [254, 536]
    ].forEach(
      ([x, y]) =>
        (s += `<rect x="${x - 1}" y="${y - 18}" width="2" height="18" fill="#9aa4b2"/><rect x="${x - 6}" y="${y - 24}" width="12" height="7" fill="#fff" stroke="#141414" stroke-width=".8"/><circle cx="${x}" cy="${y - 15}" r="2.6" fill="none" stroke="#ff6b2b" stroke-width="1.4"/>`)
    );
  } else if (r === "rs" && !d2) {
    // kırmızı-beyaz tramvay
    s += `<rect x="176" y="408" width="44" height="12" rx="3" fill="#c6363c"/><rect x="176" y="408" width="44" height="4" rx="2" fill="#f2f2f2"/>${[0, 1, 2, 3].map(i => `<rect x="${180 + i * 10}" y="413" width="6" height="4" fill="${lit ? "#ffd27a" : "#9fbcd6"}"/>`).join("")}<line x1="198" y1="408" x2="198" y2="398" stroke="#6b7686"/>`;
  } else if (r === "gr" && !d2) {
    // periptero (köşe büfesi)
    s += `<rect x="198" y="402" width="16" height="14" fill="#2f6fb5"/><rect x="196" y="398" width="20" height="5" fill="#f4f4ef"/><rect x="201" y="406" width="10" height="6" fill="#ffd27a"/>`;
  } else if (r === "es" && !d2) {
    // tapas barı tenteleri gibi sarı-kırmızı şemsiye
    s += `<path d="M196 410a10 6 0 0 1 20 0z" fill="#f1bf00"/><path d="M201 410a5 6 0 0 1 10 0z" fill="#c60b1e"/><rect x="205.3" y="410" width="1.4" height="8" fill="#6b7686"/>`;
  }
  if (g === "us" && !d2) {
    // yangın musluğu
    s += `<rect x="207" y="408" width="5" height="9" rx="1.5" fill="#d7263d"/><rect x="205.5" y="410" width="8" height="2.5" rx="1" fill="#d7263d"/><circle cx="209.5" cy="407.5" r="2.2" fill="#d7263d"/>`;
  }
  return s ? `<g class="cu-deco" data-reg="${r}" pointer-events="none">${s}</g>` : "";
}

/* ---- durum ---- */
const widx = () => weekNo(40);
const cu = () => {
  if (!S.cu) S.cu = { at: S.city, seen: { [S.city]: 1, [S.home || "İstanbul"]: 1 }, ev: {}, last: -9 }; // memleket hiç "yeni" değildir
  S.cu.seen = S.cu.seen || {};
  S.cu.ev = S.cu.ev || {};
  return S.cu;
};
const pm = () => (late.ecoPm ? late.ecoPm() : 1);
const sgn = v => (v > 0 ? "+" + v : "−" + Math.abs(v));
const fxLab = (o, cost) =>
  [
    o.moral ? [$t("cu.fx.moral", { v: sgn(o.moral) }), o.moral > 0 ? "p" : "n"] : null,
    o.energy ? [$t("cu.fx.en", { v: sgn(o.energy) }), o.energy > 0 ? "p" : "n"] : null,
    o.takim ? [$t("cu.fx.team", { v: sgn(o.takim) }), "p"] : null,
    o.taraf ? [$t("cu.fx.fans", { v: "+" + o.taraf }), "p"] : null,
    o.ark ? [$t("cu.fx.friend", { v: "+" + o.ark }), "p"] : null,
    o.money ? [$t("cu.fx.money", { v: fmt(cost) }), "n"] : null
  ].filter(Boolean);
function applyFx(o, cost, label) {
  if (o.moral) S.moral += o.moral;
  if (o.energy) S.energy += o.energy;
  for (const r of ["takim", "taraf", "ark"]) if (o[r]) S.rel[r] += o[r];
  if (o.money && cost) tx(label, -cost);
  norm();
  save();
}
const fxText = L => L.map(([t]) => t).join(" · ");
function choices(opts) {
  return `<div class="choices">${opts
    .map(
      ([k, t, d]) =>
        `<button class="choice" data-cu="${k}"><span class="ct">${t}</span>${d ? `<span class="cd">${d}</span>` : ""}</button>`
    )
    .join("")}</div>`;
}
function result(txt, fx) {
  const b = document.getElementById("shb");
  if (!b) return;
  b.innerHTML = `<div class="say">${txt}</div><div class="fx">${fx.map(([t, c]) => `<span class="${c}">${t}</span>`).join("")}</div><button class="btn pri" id="rb">${$t("common.backMap")}</button>`;
  b.querySelector("#rb").onclick = () => (closeSheet(), renderMain());
}

/* ---- "Yeni şehir" karşılama paneli ---- */
export const CU_WELCOME_FX = { a: { moral: 5, energy: -4 }, b: { takim: 4, money: 1 }, c: { energy: 8 } };
/** Taşınma sonrası ilk hafta: şehre ilk kez geldiysen panel (true döner), daha önce yaşadıysan kısa not. */
export function cuWelcomeSheet() {
  if (!S || window.__SIM || S.retired || !S.city) return false;
  const c = cu();
  if (c.at === S.city) return false;
  if (c.seen[S.city]) {
    c.at = S.city;
    toast($t("cu.w.back", { city: S.city }));
    return false;
  }
  c.seen[S.city] = 1;
  c.at = S.city;
  const cc = CITY_C[S.city] || "TR",
    cost = Math.max(3, Math.round(6 * pm())),
    sig = cuSig(),
    F = CU_WELCOME_FX;
  const row = (k, v) => `<div class="small" style="margin:3px 0"><b>${$t(k)}:</b> ${esc(v)}</div>`;
  sheet(
    $t("cu.w.title", { city: S.city }),
    $t("cu.w.sub", { hi: cuT("greet"), country: (LEAGUES[cc] || LEAGUES.TR).n }),
    `<p>${$t("cu.w.intro")}</p><ul id="cu-sig" style="margin:6px 0 10px;padding-left:var(--sp-4h)">${sig.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` +
      `<div class="card" style="padding:var(--sp-2h) var(--sp-3);margin-bottom:10px"><div class="eyebrow">${$t("cu.w.know")}</div>${row("cu.w.words", cuT("words"))}${row("cu.w.ride", cuT("ride"))}${row("cu.w.match", cuT("matchday"))}${row("cu.w.fans", cuT("fans"))}</div>` +
      `<p class="small muted">${$t("cu.w.q")}</p>` +
      choices([
        ["a", esc(cuT("wA")), fxText(fxLab(F.a))],
        ["b", esc(cuT("wB")), fxText(fxLab(F.b, cost))],
        ["c", $t("cu.w.c"), fxText(fxLab(F.c))]
      ]),
    { noClose: true }
  );
  $$("[data-cu]").forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.cu;
        applyFx(F[k], cost, $t("cu.tx.dinner"));
        result($t(`cu.w.r${k}`), fxLab(F[k], cost));
      })
  );
  return true;
}
Bus.offer("week:sheet", cuWelcomeSheet, PRIO.cultureWelcome);

/* ---- şehir hayatı olayları ---- */
export const CU_ARCH = ["food", "lang", "fans", "ride", "home"];
export const CU_EV_FX = {
  food: { a: { moral: 5, takim: 3, energy: -4 }, b: { energy: 4 } },
  lang: { a: { takim: 4, moral: -1 }, b: { moral: 2 } },
  fans: { a: { taraf: 5, energy: -5 }, b: { energy: 3 } },
  ride: { a: { moral: 3, energy: -3 }, b: { money: 1, energy: 2 } },
  home: { a: { ark: 5, moral: 3, energy: -3 }, b: { energy: 4, moral: 1 } }
};
const evKey = (reg, a) => {
  for (const r of [reg, grpOf(reg)]) if (tRaw(`cu.${r}.e.${a}.t`) != null) return r;
  return null;
};
/** Bölgede henüz yaşanmamış olaylar */
export function cuEventsLeft(reg = cuRegion()) {
  const done = cu().ev[reg] || [];
  return CU_ARCH.filter(a => evKey(reg, a) && !done.includes(a));
}
/** Bir şehir hayatı olayı aç (testler arch verebilir). */
export function cuEvent(arch) {
  const reg = cuRegion(),
    c = cu(),
    r = evKey(reg, arch);
  if (!r) return false;
  (c.ev[reg] = c.ev[reg] || []).push(arch);
  c.last = widx();
  const mate = (late.mateNames ? late.mateNames(3) : [])[0] || S.npc.friend,
    P = { m: esc(mate), c: esc(S.npc.coach), city: esc(S.city) },
    F = CU_EV_FX[arch],
    cost = Math.max(2, Math.round(3 * pm())),
    T = s => $t(`cu.${r}.e.${arch}.${s}`, P);
  sheet(
    T("t"),
    $t("cu.ev.sub", { city: S.city }),
    `<p>${T("b")}</p>${choices([
      ["a", T("a"), fxText(fxLab(F.a))],
      ["b", T("b2"), fxText(fxLab(F.b, cost))]
    ])}`,
    { noClose: true }
  );
  $$("[data-cu]").forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.cu;
        applyFx(F[k], cost, $t("cu.tx.ride"));
        result(T(k === "a" ? "ra" : "rb"), fxLab(F[k], cost));
      })
  );
  return true;
}
function cuEventSheet() {
  if (!S || window.__SIM || S.retired || !S.city || !S.team) return false;
  const c = cu(),
    reg = cuRegion();
  // İstanbul'da zaten çok sayıda yerel olay var: şehir hayatı olayları ikinci sezondan sonra
  if (reg === "ist" && S.season < 2) return false;
  if (widx() - (c.last ?? -9) < 4 || Math.random() > 0.4) return false;
  const left = cuEventsLeft(reg);
  if (!left.length) return false;
  return cuEvent(left[Math.floor(Math.random() * left.length)]);
}
Bus.offer("week:sheet", cuEventSheet, PRIO.cultureEvent);
