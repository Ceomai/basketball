/* ================= MAĞAZA GÜVENLİ ADLAR (marka katmanı) =================
   Google Play ve App Store, izinsiz gerçek kulüp, lig, turnuva ve marka adlarını fikri mülkiyet ihlali sayıp
   uygulamayı reddedebilir. Bu modül görünen bütün adları kurgusal karşılıklarıyla değiştirir.
   - Varsayılan: kurgusal adlar AÇIK (mağaza güvenli). Gerçek adlar yalnızca geliştirici derlemesinde:
     VITE_REAL_NAMES=1 npm run build   (mağazaya bu derleme YÜKLENMEZ; docs/YAYIN_KONTROL.md)
   - Kayıt uyumu: takım ANAHTARLARI değişmez (club|<gerçek ad>); yalnızca görünen ad ve kısaltma değişir.
     Eski kayıtlardaki takım adları ve haber metinleri açılışta çevrilir (brandSave, save.js → upgradeSave).
   - Simülasyon etkilenmez: güç, renk, sıra, anahtar aynıdır.
   - Sözlükler (TR+EN), olay metinleri ve lig adları yüklenirken bir kez dönüştürülür (i18n/index.js, content/events.js).
   Bu dosya bağımlılıksızdır (birim testleri doğrudan içe aktarır). */

const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};
/** Kurgusal adlar açık mı? (mağaza derlemesinde her zaman true) */
export const BRAND_FICTIONAL = ENV.VITE_REAL_NAMES !== "1";
let LANG_ = "tr";
/** i18n/index.js seçili dili bildirir (lig adları ve kısaltmalar dile göre) */
export function brandSetLang(l) {
  LANG_ = l === "en" ? "en" : "tr";
}

/* ---- Kulüpler: "gerçek ad|kurgusal ad|kısaltma(isteğe bağlı)" ----
   Adlar şehir/semt + yerel bir simge; gerçek kulübün adını, sponsorunu ya da lakabını taşımaz. Renkler aynı kalır. */
const CLUB_MAP_RAW = `Fenerbahçe|Kadıköy Kanaryaları|KAD;Anadolu Efes|Bakırköy Lacivertleri|BAK;Galatasaray|Pera Aslanları|PER;Beşiktaş|Ortaköy Kartalları|ORT;Türk Telekom|Başkent Kıvılcımları|BAŞ;Bahçeşehir Koleji|Esenyurt Kolejliler|ESY;Karşıyaka|Bostanlı Yeşilleri|BOS;Tofaş|Uludağ Mavileri|ULU;Manisa Basket|Spil Basket|SPİ;Aliağa Petkimspor|Aliağa Limancıları|ALİ;Merkezefendi|Pamukkale Horozları|PAM;Büyükçekmece|Büyükgöl Basket|BGL;Bursaspor|Yeşil Bursa|YBU;Darüşşafaka|Maslak Okulluları|MAS;Trabzonspor|Trabzon Dalgaları|TRA;Mersin MSK|Mersin Limancıları|MER;
Esenler Erokspor|Esenler Rüzgârı|ESE;Konyaspor|Selçuklu Basket|SEL;Samsunspor|Canik Basket|CAN;Eskişehir Basket|Porsuk Basket|POR;Gaziantep Basketbol|Gaziantep Kaleliler|GAZ;Ormanspor|Gölbaşı Basket|GÖL;Göztepe|Güzelyalı Basket|GÜZ;Kocaeli Kağıtspor|İzmit Körfez|İZM;Bandırma Bordo|Bandırma Martıları|BAN;İstanbulspor|Bayrampaşa Basket|BAY;Fethiye Belediyespor|Fethiye Koyu|FET;Antalya Büyükşehir|Antalya Akdeniz|ANT;
Real Madrid|Madrid Monarcas|MAD;Barça|Barcelona Olas|BAR;Valencia Basket|Valencia Naranjas|VAL;Unicaja|Málaga Sol|MÁL;Baskonia|Vitoria Lobos|VİT;La Laguna Tenerife|Tenerife Volcanes|TEN;Joventut Badalona|Badalona Verdes|BAD;Gran Canaria|Canarias Alisios|CAN;UCAM Murcia|Murcia Huerta|MUR;Bàsquet Manresa|Manresa Montaña|MAN;Casademont Zaragoza|Zaragoza Cierzo|ZAR;Bilbao Basket|Bilbao Ría|BİL;Río Breogán|Lugo Murallas|LUG;Bàsquet Girona|Girona Puentes|GİR;Covirán Granada|Granada Sierra|GRA;MoraBanc Andorra|Andorra Picos|AND;
Movistar Estudiantes|Madrid Colegiales|COL;Fuenlabrada|Fuenlabrada Fuentes|FUE;Obradoiro|Santiago Peregrinos|SAN;Palencia Baloncesto|Palencia Cerrato|PAL;Real Valladolid|Valladolid Pisuerga|VAL;Oviedo CB|Oviedo Astures|OVİ;HLA Alicante|Alicante Costa|ALİ;Cáceres Patrimonio|Cáceres Muralla|CÁC;San Pablo Burgos|Burgos Catedral|BUR;Gipuzkoa Basket|Donostia Olas|DON;Peñas Huesca|Huesca Pirineo|HUE;Melilla Baloncesto|Melilla Puerto|MEL;
Olimpia Milano|Milano Duomo|MİL;Virtus Bologna|Bologna Torri|BOL;Reyer Venezia|Venezia Laguna|VEN;Germani Brescia|Brescia Colli|BRE;Dinamo Sassari|Sassari Nuraghe|SAS;Aquila Trento|Trento Adige|TRE;Derthona Tortona|Tortona Colline|TOR;Pallacanestro Trieste|Trieste Bora|TRİ;Napoli Basket|Napoli Vesuvio|NAP;Pallacanestro Varese|Varese Laghi|VAR;Pallacanestro Reggiana|Reggio Tricolore|REG;Treviso Basket|Treviso Sile|TRV;Trapani Shark|Trapani Saline|TRP;Givova Scafati|Scafati Sarno|SCA;Vanoli Cremona|Cremona Violini|CRE;Pistoia Basket|Pistoia Appennino|PİS;
Fortitudo Bologna|Bologna Portici|BOP;Pallacanestro Cantù|Cantù Brianza|CAN;APU Udine|Udine Friuli|UDİ;Tezenis Verona|Verona Anfiteatro|VER;Reale Mutua Torino|Torino Mole|TOR;Unieuro Forlì|Forlì Romagna|FOR;RivieraBanca Rimini|Rimini Spiaggia|RİM;Victoria Libertas Pesaro|Pesaro Adriatico|PES;UEB Cividale|Cividale Ducale|CİV;Happy Casa Brindisi|Brindisi Porto|BRİ;Luiss Roma|Roma Colosseo|ROM;Benedetto Cento|Cento Pianura|CEN;
Paris Basketball|Paris Lumière|PAR;AS Monaco|Monaco Rocher|MON;LDLC ASVEL|Villeurbanne Rhône|VİL;JL Bourg|Bourg Bresse|BOU;SIG Strasbourg|Strasbourg Cigognes|STR;Nanterre 92|Nanterre Seine|NAN;Cholet Basket|Cholet Mauges|CHO;Le Mans Sarthe|Le Mans Plantagenêts|LEM;Limoges CSP|Limoges Porcelaine|LİM;JDA Dijon|Dijon Moutarde|DİJ;BCM Gravelines-Dunkerque|Gravelines Phare|GRA;Elan Chalon|Chalon Saône|CHA;ESSM Le Portel|Le Portel Falaises|LEP;Saint-Quentin|Saint-Quentin Picardie|SQP;SLUC Nancy|Nancy Lorraine|NCY;Metropolitans 92|Boulogne Forêt|BLG;
Orléans Loiret|Orléans Loire|ORL;Chorale Roanne|Roanne Forez|ROA;Élan Béarnais|Pau Pyrénées|PAU;ADA Blois|Blois Château|BLO;Rouen Métropole|Rouen Normandie|ROU;Nantes Basket|Nantes Éléphants|NAN;Lille Métropole|Lille Beffroi|LİL;Olympique Antibes|Antibes Azur|ANT;Fos Provence|Fos Golfe|FOS;ALM Évreux|Évreux Eure|ÉVR;JA Vichy|Vichy Sources|VİC;Boulazac Basket|Boulazac Périgord|BZC;
Bayern München|München Isar|MÜN;ALBA Berlin|Berlin Spree|BER;ratiopharm ulm|Ulm Donau|ULM;Telekom Baskets Bonn|Bonn Rhein|BON;Niners Chemnitz|Chemnitz Erzgebirge|CHE;Baskets Oldenburg|Oldenburg Hunte|OLD;MHP Riesen Ludwigsburg|Ludwigsburg Schloss|LUD;Würzburg Baskets|Würzburg Main|WÜR;Bamberg Baskets|Bamberg Regnitz|BAM;Hamburg Towers|Hamburg Hafen|HAM;Rostock Seawolves|Rostock Ostsee|ROS;Skyliners Frankfurt|Frankfurt Römer|FRA;Löwen Braunschweig|Braunschweig Oker|BRA;Mitteldeutscher BC|Weißenfels Saale|WEİ;Heidelberg Academics|Heidelberg Neckar|HEİ;Syntainics MBC|Weißenfels Burgland|WBL;
Gießen 46ers|Gießen Lahn|GİE;Medi Bayreuth|Bayreuth Oper|BAY;Science City Jena|Jena Saaletal|JEN;Gladiators Trier|Trier Porta|TRİ;ART Giants Düsseldorf|Düsseldorf Altstadt|DÜS;PSK Lions Karlsruhe|Karlsruhe Fächer|KAR;Kirchheim Knights|Kirchheim Teck|KİR;Uni Baskets Münster|Münster Aasee|MÜN;Eisbären Bremerhaven|Bremerhaven Deich|BRE;Nürnberg Falcons|Nürnberg Burg|NÜR;Phoenix Hagen|Hagen Volme|HAG;Tigers Tübingen|Tübingen Altstadt|TÜB;
Olympiacos|Pire Kymata|PİR;Panathinaikos|Atina Akropolis|ATA;AEK Athens|Atina Lykavittos|ATL;PAOK|Selanik Pyrgos|SEP;Aris|Selanik Thermaikos|SET;Peristeri|Peristeri Platanos|PRS;Promitheas Patras|Patras Achaia|PAT;Kolossos Rhodes|Rodos Ippotes|ROD;Lavrio|Lavrio Metalleia|LAV;Maroussi|Maroussi Elies|MAR;Karditsa|Karditsa Kampos|KAR;Panionios|Smyrni Asteria|SMY;
Larisa|Larisa Pineios|LAR;Iraklis|Selanik Kastra|SEK;Psychiko|Psychiko Alsos|PSY;Kavala BC|Kavala Kastro|KAV;Ionikos Nikaias|Nikaia Ionia|NİK;Apollon Patras|Patras Molos|PAM;Panerythraikos|Erythrea Pefka|ERY;Kastoria|Kastoria Limni|KAS;
Crvena Zvezda|Beograd Kalemegdan|KAL;Partizan|Beograd Dunav|DUN;Mega Basket|Beograd Ada|ADA;FMP|Železnik Basket|ŽEL;Borac Čačak|Čačak Morava|ČAČ;Spartak Subotica|Subotica Palić|SUB;Vojvodina|Novi Sad Petrovaradin|NSP;Dynamic|Beograd Zemun|ZEM;Zlatibor|Čajetina Planina|ČAJ;Sloga Kraljevo|Kraljevo Ibar|KRA;Radnički Kragujevac|Kragujevac Šumadija|KRG;Tamiš|Pančevo Ravnica|PAN;
Žalgiris|Kaunas Ąžuolai|KAU;Rytas|Vilnius Neris|VİL;Lietkabelis|Panevėžys Laisvė|PAN;Neptūnas|Klaipėda Uostas|KLA;Šiauliai|Šiauliai Saulė|ŠİA;Jonava|Jonava Tiltai|JON;Juventus Utena|Utena Ežerai|UTE;Wolves Vilnius|Vilnius Senamiestis|VSN;Nevėžis|Kėdainiai Malūnai|KĖD;Gargždai|Gargždai Minija|GAR;Pieno žvaigždės|Pasvalys Lyguma|PAS;Dzūkija Alytus|Alytus Nemunas|ALY;
Boston Celtics|Boston Harbormen|BOS;Oklahoma City Thunder|Oklahoma City Twisters|OKC;Denver Nuggets|Denver Peaks|DEN;Cleveland Cavaliers|Cleveland Lakeshores|CLE;New York Knicks|New York Avenues|NYA;Milwaukee Bucks|Milwaukee Voyageurs|MİL;Minnesota Timberwolves|Minneapolis Loons|MİN;Los Angeles Lakers|Los Angeles Palms|LAP;Golden State Warriors|San Francisco Fog|SFF;Dallas Mavericks|Dallas Stallions|DAL;Phoenix Suns|Phoenix Scorpions|PHX;Philadelphia 76ers|Philadelphia Founders|PHİ;Miami Heat|Miami Flamingos|MİA;Houston Rockets|Houston Satellites|HOU;Memphis Grizzlies|Memphis Blues|MEM;Indiana Pacers|Indianapolis Speedsters|İND;Sacramento Kings|Sacramento Goldrush|SAC;LA Clippers|Los Angeles Waves|LAW;Orlando Magic|Orlando Herons|ORL;New Orleans Pelicans|New Orleans Bayou|NOB;Atlanta Hawks|Atlanta Peaches|ATL;Chicago Bulls|Chicago Gusts|CHİ;Toronto Raptors|Toronto Moose|TOR;San Antonio Spurs|San Antonio Armadillos|SAA;Brooklyn Nets|New York Boroughs|NYB;Utah Jazz|Salt Lake City Summits|SLC;Portland Trail Blazers|Portland Rainmakers|POR;Charlotte Hornets|Charlotte Racers|CHA;Detroit Pistons|Detroit Motors|DET;Washington Wizards|Washington Monuments|WAS`;
/** gerçek ad → [kurgusal ad, kısaltma] */
export const BRAND_CLUBS = {};
for (const e of CLUB_MAP_RAW.split(";")) {
  const [r, f, s] = e.trim().split("|");
  if (r) BRAND_CLUBS[r] = [f, s || ""];
}
/** Kulüp adından 3 harfli kısaltma (eski clubTeam algoritması; gerçek adlar açıkken aynı sonuç) */
export function brandShort(n) {
  const w =
    String(n)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-zıİ ]/g, "")
      .split(" ")
      .filter(x => x.length > 1 && !/^(AS|BC|CB|KK|SL|JL|SIG|LDLC|MHP)$/i.test(x))[0] || n;
  return w.slice(0, 3).toLocaleUpperCase("tr-TR");
}
/** Gerçek kulüp adının görünen adı */
export const brandClub = real => (BRAND_FICTIONAL && BRAND_CLUBS[real] ? BRAND_CLUBS[real][0] : real);
/** Gerçek kulüp adının görünen kısaltması */
export const brandClubShort = real =>
  BRAND_FICTIONAL && BRAND_CLUBS[real] ? BRAND_CLUBS[real][1] || brandShort(BRAND_CLUBS[real][0]) : brandShort(real);
/** Takımın gerçek kimliği (anahtar club|<ad> ise o ad; değilse görünen ad): derbi eşleşmeleri buna bakar */
export const brandRealOf = t =>
  t && typeof t.key === "string" && t.key.indexOf("club|") === 0 ? t.key.slice(5) : t ? t.name : "";
/** Şehir adından üretilen takım (3. lig vb.) yanlışlıkla gerçek bir kulübün adını alırsa kurgusal bir adla değiştir */
export const brandGen = (name, city) =>
  BRAND_FICTIONAL && (BRAND_CLUBS[name] || BRAND_TEXT_CLUBS.includes(name)) ? `${city} Basket Kulübü` : name;

/* ---- Lig adları (kademe sırasıyla) ---- */
const TIERS = {
  TR: ["Pota Süper Ligi", "Pota 1. Ligi", "Pota 2. Ligi"],
  ES: ["Liga Canasta", "Canasta Plata", "Canasta Bronce"],
  IT: ["Lega Canestro", "Canestro A2", "Canestro B"],
  FR: ["Élite Panier", "Panier Pro", "Panier Nationale"],
  DE: ["Korb-Liga", "Korb-Liga 2", "Korb-Liga 3"],
  GR: ["Kalathi Super", "Kalathi Elit", "Kalathi Ethniki"],
  RS: ["Koš Liga", "Koš Prva", "Koš Druga"],
  LT: ["Krepšio Lyga", "Krepšio Pirma", "Krepšio Antra"],
  US: { tr: ["Kuzey Amerika Ligi"], en: ["North American League"] }
};
/** Ülkenin lig kademeleri: kurgusal adlar açıksa kurgusal liste */
export function brandTiers(cc, real) {
  if (!BRAND_FICTIONAL || !TIERS[cc]) return real;
  const t = TIERS[cc];
  return Array.isArray(t) ? t.slice() : t[LANG_].slice();
}

/* ---- Metin içi adlar: [gerçek, TR karşılığı, EN karşılığı, TR ek dönüşümü] ----
   Türkçe ekler kurgusal adın ünlü uyumuna göre çevrilir ("NBA'de" → "KAL'da", "EuroLeague'e" → "Kıta Ligi'ne").
   Tabloda olmayan bir ek birim testinde hata verir (tests/unit/brand.test.mjs). */
const SFX_LIGI = { de: "nde", e: "ne", in: "nin", den: "nden", i: "ni", deki: "ndeki", deyken: "ndeyken", a: "na", da: "nda" };
const SFX_KUPASI = {
  de: "nda",
  da: "nda",
  e: "na",
  a: "na",
  ye: "na",
  ya: "na",
  in: "nın",
  nin: "nın",
  i: "nı",
  yi: "nı",
  den: "ndan",
  dan: "ndan"
};
const SFX_KAL = {
  de: "da",
  da: "da",
  e: "a",
  a: "a",
  ye: "a",
  ya: "a",
  deyken: "dayken",
  den: "dan",
  dan: "dan",
  nin: "ın",
  in: "ın",
  i: "ı",
  yi: "ı",
  deki: "daki"
};
const SFX_UBF = { da: "de", de: "de", ya: "ye", a: "ye", e: "ye", dan: "den", nın: "nin", yı: "yi", daki: "deki" };
const SFX_DORTLU = { a: "e", unda: "inde", u: "i", un: "in", da: "de", dan: "den", ın: "in" };
const SFX_OYUN = { nda: "nda", na: "na", nın: "nın" };
export const BRAND_TERMS = [
  ["Žalgiris Arena", "Kaunas Arena", "Kaunas Arena", {}],
  ["EuroLeague", "Kıta Ligi", "Continental League", SFX_LIGI],
  ["EuroCup", "Kıta Kupası", "Continental Cup", SFX_KUPASI],
  ["EuroBasket", "Avrupa Şampiyonası", "European Championship", SFX_KUPASI],
  ["G League", "Gelişim Ligi", "Development League", SFX_LIGI],
  ["Final Four", "Dörtlü Final", "Final Stage", SFX_DORTLU],
  ["FIBA", "UBF", "GBF", SFX_UBF],
  ["NBA", "KAL", "NAL", SFX_KAL],
  ["Olimpiyat", "Yaz Oyunları", "Summer Games", SFX_OYUN],
  ["Olympics", "Yaz Oyunları", "Summer Games", SFX_OYUN],
  ["Olympic", "Yaz Oyunları", "Summer Games", SFX_OYUN],
  ["YouTube", "video", "video", {}],
  ["Celtics", "basketbol", "basketball", {}],
  ["Lakers", "basketbol", "basketball", {}]
];
/** Metin içinde aranacak kulüp adları: şehir/semt adıyla aynı olanlar (Beşiktaş, Karşıyaka, Jonava...) hariç */
const PLACE_LIKE = new Set(
  "Galatasaray Beşiktaş Karşıyaka Göztepe Merkezefendi Büyükçekmece Peristeri Lavrio Maroussi Karditsa Larisa Psychiko Kastoria Aris Dynamic Vojvodina Zlatibor Tamiš Partizan Šiauliai Jonava Gargždai Saint-Quentin Fuenlabrada Gran Canaria Rytas".split(
    " "
  )
);
PLACE_LIKE.add("Gran Canaria");
export const BRAND_TEXT_CLUBS = Object.keys(BRAND_CLUBS).filter(n => !PLACE_LIKE.has(n));
const L = "A-Za-zÀ-ÖØ-öø-ɏḀ-ỿÇĞİÖŞÜçğıöşü0-9";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termRx = list =>
  new RegExp(
    `(?<![${L}])(${list
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(esc)
      .join("|")})(?:(['’])([a-zçğıöşü]+))?(?![${L}])`,
    "g"
  );
// eski kayıtlardaki gerçek lig adları (src/data.js LEAGUES[cc].t sırasıyla) → kurgusal karşılık
const TIER_REAL = {
  TR: ["Basketbol Süper Ligi", "TBL", "TB2L"],
  ES: ["Liga ACB", "Primera FEB", "Segunda FEB"],
  IT: ["Serie A", "Serie A2", "Serie B"],
  FR: ["LNB Élite", "Pro B", "Nationale 1"],
  DE: ["BBL", "ProA", "ProB"],
  GR: ["GBL", "Elite League", "National League 1"],
  RS: ["KLS", "Prva Liga", "Druga Liga"],
  LT: ["LKL", "NKL", "RKL"]
};
const TIER_OF = {};
for (const [cc, l] of Object.entries(TIER_REAL)) l.forEach((n, i) => (TIER_OF[n] = TIERS[cc][i]));
const TERM_RX = termRx(BRAND_TERMS.map(x => x[0]));
const FULL_RX = termRx([...BRAND_TERMS.map(x => x[0]), ...BRAND_TEXT_CLUBS, ...Object.keys(TIER_OF)]);
const TERM_OF = Object.fromEntries(BRAND_TERMS.map(x => [x[0], x]));
function repl(m, w, ap, sfx, lang) {
  const t = TERM_OF[w];
  if (!t && TIER_OF[w]) return sfx ? `${TIER_OF[w]}${ap}${sfx}` : TIER_OF[w];
  if (!t) {
    // kulüp adı: kurgusal ad çok sözcüklü; Türkçe ek güvenli biçimde uyarlanamaz → eki kesme işaretiyle korur
    const f = BRAND_CLUBS[w][0];
    return sfx ? `${f}${ap}${sfx}` : f;
  }
  const base = lang === "en" ? t[2] : t[1];
  if (!sfx) return base;
  if (lang === "en") return `${base}${ap}${sfx}`;
  const s2 = t[3][sfx];
  return s2 ? `${base}${ap}${s2}` : `${base}${ap}${sfx}`;
}
/** Sözlük/olay metnindeki gerçek lig, turnuva ve marka adlarını çevir (dil: "tr" | "en") */
export function brandText(s, lang = LANG_) {
  if (!BRAND_FICTIONAL || typeof s !== "string" || !s) return s;
  TERM_RX.lastIndex = 0;
  if (!TERM_RX.test(s)) return s;
  TERM_RX.lastIndex = 0;
  return s.replace(TERM_RX, (m, w, ap, sfx) => repl(m, w, ap, sfx, lang));
}
/** brandText + kulüp adları (eski kayıtlardaki haber ve geçmiş metinleri için) */
export function brandTextFull(s, lang = LANG_) {
  if (!BRAND_FICTIONAL || typeof s !== "string" || !s) return s;
  FULL_RX.lastIndex = 0;
  if (!FULL_RX.test(s)) return s;
  FULL_RX.lastIndex = 0;
  return s.replace(FULL_RX, (m, w, ap, sfx) => repl(m, w, ap, sfx, lang));
}
/** Nesne/dizi içindeki bütün metinleri yerinde çevir (sözlük, olay paketi). Nesnenin kendisini döndürür. */
export function brandDeep(o, lang = LANG_, depth = 0) {
  if (!BRAND_FICTIONAL || !o || typeof o !== "object" || depth > 8) return o;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === "string") o[k] = brandText(v, lang);
    else if (v && typeof v === "object") brandDeep(v, lang, depth + 1);
  }
  return o;
}
/** Kayıt açılışı: kulüp takımlarının görünen adı/kısaltması anahtardan yeniden kurulur (bayrak kapalıysa gerçek ada
    döner); kayıttaki serbest metinlerde gerçek adlar çevrilir. Anahtarlar ("club|..." içeren metinler) asla değişmez. */
// kişi adları ve anahtarlar: oyuncunun yazdığı ad gerçek bir kulübe benzese de değişmez
const KEEP_KEYS = new Set(["key", "name", "first", "last", "n", "nick", "fem"]);
export function brandSave(s, depth = 0) {
  if (!s || typeof s !== "object" || depth > 12) return s;
  if (typeof s.key === "string" && s.key.indexOf("club|") === 0 && typeof s.name === "string") {
    const real = s.key.slice(5);
    s.name = brandClub(real);
    if (typeof s.short === "string") s.short = brandClubShort(real);
  }
  for (const k of Object.keys(s)) {
    const v = s[k];
    if (typeof v === "string") {
      if (BRAND_FICTIONAL && v.indexOf("club|") < 0 && !KEEP_KEYS.has(k)) s[k] = brandTextFull(v);
    } else if (v && typeof v === "object" && k !== "npc") brandSave(v, depth + 1);
  }
  return s;
}
const RX_NBA = /NBA|KAL\b|NAL\b|Kuzey Amerika Ligi|North American League/;
const RX_EURO = /EuroLeague|Kıta Ligi|Continental League/;
/** Kayıttaki lig adı en üst lig (NBA ya da karşılığı) mı? */
export const brandIsNba = s => RX_NBA.test(s || "");
/** Kayıttaki lig adı EuroLeague (ya da karşılığı) mı? */
export const brandIsEuro = s => RX_EURO.test(s || "");
/** Birim testinin aradığı gerçek adlar (görünen metinde kalmamalı) */
export const BRAND_FORBIDDEN = [
  ...BRAND_TERMS.map(x => x[0]),
  ...BRAND_TEXT_CLUBS,
  ...Object.values(TIER_REAL)
    .flat()
    .filter(n => n.length > 4),
  "Euroleague",
  "Turkish Airlines"
];
