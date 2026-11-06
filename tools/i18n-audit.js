// Yayın öncesi metin/çeviri denetimi (bir kez çalıştırılan araç). Bulguları reports/i18n-audit.md'ye yazar.
// Kullanım: node tools/i18n-audit.js [--json çıktı.json]
// Taranan: src/i18n/{tr,en}{,.auto}.js arayüz sözlükleri ve src/content/events*.{tr,en}.js olay paketleri.
// Kontroller: yer tutucudan sonra Türkçe ek, EN'de Türkçe / TR'de İngilizce kalıntı, yer tutucu farkı, boş değer,
// çevrilmemiş (TR = EN) uzun metin, tanımsız / kullanılmayan anahtar, yazım ve terim tutarlılığı, mobilde taşabilecek
// uzun düğme/başlık, hassas içerik (hakaret, siyaset, din, alkol, kumar, gerçek kişi adı).
const fs = require("fs"),
  path = require("path");
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const imp = p => import(path.join(SRC, p)).then(m => m.default);

function sources(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? sources(path.join(dir, e.name)) : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []));
}
const ph = s => [...String(s).matchAll(/\{(@?\w+)\}/g)].map(m => m[1]).sort();

// olay paketlerinden metin alanlarını yol adlarıyla düzleştir
function flatEvents(list) {
  const out = {};
  const walk = (o, p) => {
    if (typeof o === "string") out[p] = o;
    else if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (o && typeof o === "object")
      for (const [k, v] of Object.entries(o))
        if (["who", "title", "text", "t", "out", "win", "lose", "choices", "needOut"].includes(k)) walk(v, `${p}.${k}`);
  };
  for (const ev of list) walk(ev, `ev:${ev.id}`);
  return out;
}

// --- sözlükler ---
const TURK_CH = /[çğıöşüÇĞİÖŞÜ]/;
// Türkçe yer/kişi/kulüp adları İngilizce metinde de Türkçe karakterle yazılır; bunları ayıkla
const PROPER_OK =
  /\b(İstanbul|İzmir|Eskişehir|Beşiktaş|Kadıköy|Üsküdar|Fenerbahçe|Galatasaray|Karşıyaka|Bahçeşehir|Tofaş|Pınar|Türk\w*|Şişli|Bağdat|Çengelköy|Moda|Kuzguncuk|Beyoğlu|Ümraniye|Bakırköy|Ataşehir|Kartal|Pendik|Maltepe|Beşikdüzü|Göztepe|Konyaaltı|Kültürpark|Eymir|Gölü|Porsuk|Çayı|Málaga|Pireo|Peristéri|Kalemegdan|Žalgiris|Kaunas|Crvena|Zvezda|Partizan|Bayern|Köln|München|Nürnberg|Göttingen|Würzburg|Bonn|Panathinaikos|Olympiacos|Fransa|Ülker\w*|Işık\w*|Şengül|Gülşen|Gül|Öykü|Ömer|Çağ\w*|Şule|Ayşe|Büşra|Gökhan|Gönül|Doğ\w*|Ö\w+|Ç\w+|Ş\w+|Ü\w+|İ\w+)\b/g;
const TR_WORDS_IN_EN =
  /(?<![\p{L}'’])(ve|bir|ile|için|ama|çok|değil|gibi|daha|sonra|şimdi|hafta|maç|takım|oyuncu|para|evet|hayır|tamam|yok|var)(?![\p{L}])/iu;
const EN_STOP = /\b(the|and|you|your|with|this|that|have|will|for|are|was|of|to|is|in|it|be|not|on|at|my|we)\b/gi;
// kasıtlı yabancı yerel adlar / alıntılar (bağlam: culture.js bölgesel metinleri, takma adlar, oyun terimleri)
const EN_IN_TR_OK =
  /\b(Santa Monica|coffee shop|Venice Beach|Pier|G League|two-way|back-to-back|Summer League|All-Star|MVP|NBA|Euroleague|EuroCup|playoff|pick and roll|alley-oop|crossover|step-back|trash talk|Big Apple)\b/gi;

// sık yazım hataları (yanlış → doğru)
const SPELL = [
  [/\bherkez\b/i, "herkes"],
  [/\byanlız\b/i, "yalnız"],
  [/\bbirşey/i, "bir şey"],
  [/\bhiçbirşey/i, "hiçbir şey"],
  [/\bhiç bir\b/i, "hiçbir"],
  [/\bbir kaç\b/i, "birkaç"],
  [/\bher hangi\b/i, "herhangi"],
  [/\borjinal/i, "orijinal"],
  [/\bşuan\b/i, "şu an"],
  [/\bmalesef\b/i, "maalesef"],
  [/\byalnış/i, "yanlış"],
  [/\bsürpriz\b/i, null],
  [/\bkirbit/i, "kibrit"],
  [/\beşortman/i, "eşofman"],
  [/\bpekçok\b/i, "pek çok"],
  [/\bherşey/i, "her şey"],
  [/\bheryer/i, "her yer"],
  [/\bbiran\b/i, "bir an"],
  [/\bbirgün\b/i, "bir gün"],
  [/\bteşekürler/i, "teşekkürler"],
  [/\byada\b/i, "ya da"],
  [/\bveya da\b/i, "ya da"],
  [/\bacaba\w*mi\b/i, "mi ayrı"],
  [/\b(\w{3,}(?:yor|cak|cek|mış|miş|muş|müş|dı|di|du|dü))(mı|mi|mu|mü)\b/i, "soru eki ayrı"],
  [/\b(ben|sen|o|biz|siz|onlar|bu|şu|hem|sonra|şimdi|bugün|yarın)(de|da)\b/i, "bağlaç de/da ayrı"],
  [/\b(?:diye|ama|çünkü|ve) (?:de|da)\b/i, null],
  [/\b(belki|sanki|oysa|halbuki|mademki|çünkü|meğer)\b/i, null],
  [/\b(\w+) ki\b(?<=(?:belki|sanki|oysaki|halbuki|mademki|çünkü) ki)/i, "ki bitişik"],
  [/\b(\w{3,}(?:dir|dır|dur|dür))ki\b/i, "ki ayrı (bağlaç)"],
  [/ {2,}/, "çift boşluk"],
  [/\s[,.;:!?](?!\.)/, "noktalama öncesi boşluk"],
  [/\.\./, null]
].filter(x => x[1]);
// aynı kavram için farklı terimler — sayımla raporlanır (öneri: tek terim)
const TERMS = [
  ["galibiyet primi", "maç primi", "kazanma primi"],
  ["antrenör", "koç"],
  ["menajer", "temsilci"],
  ["taraftar", "seyirci"],
  ["sezon sonu", "sezon bitimi"],
  ["play-off", "playoff", "play off"],
  ["ribaund", "ribound", "rebound"],
  ["asist", "assist"],
  ["smaç", "smaç basmak", "dunk"],
  ["serbest atış", "faul atışı"],
  ["üçlük", "üç sayılık"],
  ["moral", "motivasyon"],
  ["enerji", "kondisyon"]
];
const TERMS_EN = [
  ["win bonus", "match bonus", "victory bonus"],
  ["coach", "trainer"],
  ["agent", "manager"],
  ["playoff", "play-off", "playoffs"],
  ["morale", "mood"],
  ["energy", "stamina"],
  ["rebound", "board"]
];
// hassas içerik (13+): kelime sınırıyla
const W = (src, f = "giu") => new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, f);
const SENS = {
  hakaret: W(
    "aptal\\p{L}*|salak\\p{L}*|gerizekal\\p{L}*|geri zekal\\p{L}*|ibne|piç|orospu\\p{L}*|şerefsiz\\p{L}*|ahmak|dangalak|idiot|stupid|moron|retard\\p{L}*|dumbass|bitch|bastard|shit|fuck\\p{L}*|damn"
  ),
  ayrımcı: W("zenci|çingene\\p{L}*|kıro|maganda|karı gibi|kız gibi|like a girl|gypsy|ghetto|ırkçı\\p{L}*|racis\\p{L}*"),
  siyasi: W(
    "AKP|CHP|MHP|HDP|Erdoğan|Atatürk|siyaset\\p{L}*|siyasi|politi\\p{L}*|milletvekil\\p{L}*|başbakan\\p{L}*|cumhurbaşkan\\p{L}*|Trump|Biden|Obama|seçim kampanya\\p{L}*|election\\p{L}*"
  ),
  dini: W(
    "Allah\\p{L}*|Tanrı\\p{L}*|namaz\\p{L}*|oruç\\p{L}*|cami|camii|camiye|kilise\\p{L}*|church\\p{L}*|mosque\\p{L}*|God|Jesus|pray\\p{L}*|dua|duası|ramazan|kurban|inşallah|maşallah|amen",
    "gu"
  ),
  cinsiyetçi: W("kadın işi|erkek adam|adam gibi adam|man up|be a man|hanım evladı|kız gibi"),
  alkol: W(
    "alkol\\p{L}*|içki\\p{L}*|bira|biralar\\p{L}*|birası|birayı|rakı|rakısı|rakija|şarap\\p{L}*|sarhoş\\p{L}*|votka|viski|kokteyl\\p{L}*|meyhane\\p{L}*|beer\\p{L}*|wine\\p{L}*|drunk\\p{L}*|vodka|whisk\\p{L}*|cocktail\\p{L}*|booze|hangover|akşamdan kalma|pub|ouzo|sangria|champagne|şampanya\\p{L}*|toast|kadeh\\p{L}*|shots? of"
  ),
  kumar: W(
    "kumar\\p{L}*|bahis\\p{L}*|iddaa|rulet\\p{L}*|casino\\p{L}*|kumarhane\\p{L}*|gambl\\p{L}*|bet|bets|betting|poker|roulette|jackpot|blackjack|slot makine\\p{L}*|slots|piyango\\p{L}*|lottery"
  ),
  uyuşturucu: W(
    "esrar\\p{L}*|uyuşturucu\\p{L}*|kokain|weed|cocaine|drugs?|sigara\\p{L}*|cigarette\\p{L}*|smok\\p{L}*|tütün\\p{L}*|nargile\\p{L}*|hookah|vape"
  ),
  şiddet: W(
    "bıçak\\p{L}*|silah\\p{L}*|öldür\\p{L}*|gun|guns|knife|kill\\p{L}*|dövdü\\p{L}*|yumruk\\p{L}*|punch\\p{L}*|kavga\\p{L}*|fight\\p{L}*"
  )
};
// gerçek kişiler (oyuncu, antrenör, yorumcu, gazeteci)
const REAL = W(
  "Hedo|Türkoğlu|Mehmet Okur|Ömer Aşık|Cedi Osman|Alperen|Şengün|Ergin Ataman|Ataman|Obradovi[cć]|Željko|Zeljko|Jordan|LeBron|Kobe|Bryant|Curry|Durant|Giannis|Antetokounmpo|Don[cč]i[cć]|Joki[cć]|Larkin|Mi[cč]i[cć]|Tanjevi[cć]|Kutluay|Tunçeri|Shaquille|O'Neal|Popovich|Steve Kerr|Kerr|Spanoulis|Diamantidis|Navarro|Sabonis|Petrovi[cć]|Pau Gasol|Gasol|Ginóbili|Ginobili|Nowitzki|Kukoč|Divac|Drazen|Dražen|Kidd|Pippen|Magic Johnson|Larry Bird|Wembanyama|Tatum|Embiid|Harden|Westbrook|Kawhi|Iverson|Duncan|Barkley|Woj|Wojnarowski|Shams|Charania|Stephen A|Bill Simmons|Ahmet Çakı|Murat Murathanoğlu|Kaan Kural|Tuna Kızılgök|Rıdvan Dilmen|Hidayet|Sertaç Şanlı|Furkan Korkmaz|Shane Larkin|Tyrese|Vasilije|Scariolo|Pesic|Pešić|Sarunas|Jasikevicius|Jasikevičius|Messina|Itoudis|Bartzokas|Ettore|Dusko|Ivkovic|Ivković",
  "gu"
);
// düğme/başlık benzeri anahtarlar (taşma riski)
const BTN_KEY =
  /(^|\.)(btn|ok|yes|no|cta|go|play|title|tab|label|back|next|skip|accept|decline|confirm|cancel|close|buy|start|continue|retry|sign|claim|act)\w*$/i;

async function main() {
  const tr = { ...(await imp("i18n/tr.auto.js")), ...(await imp("i18n/tr.js")) };
  const en = { ...(await imp("i18n/en.auto.js")), ...(await imp("i18n/en.js")) };
  const TRE = [
    ...(await imp("content/events.tr.js")),
    ...(await imp("content/events.more.tr.js")),
    ...(await imp("content/events.hard.tr.js")),
    ...(await imp("content/events.career.tr.js"))
  ];
  const ENE = [
    ...(await imp("content/events.en.js")),
    ...(await imp("content/events.more.en.js")),
    ...(await imp("content/events.hard.en.js")),
    ...(await imp("content/events.career.en.js"))
  ];
  const trEv = flatEvents(TRE),
    enEv = flatEvents(ENE);
  // olay paketlerinde mekanik alan (win/lose) yalnız TR'de olabilir; EN eşinde metin yoksa TR'ye düşer
  const TRA = { ...tr, ...trEv },
    ENA = { ...en, ...enEv };
  const F = {};
  const add = (cat, k, msg) => (F[cat] = F[cat] || []).push({ k, msg });

  for (const [k, v] of Object.entries(TRA)) {
    const e = ENA[k];
    if (typeof v !== "string") continue;
    // 1) yer tutucu + ek
    for (const m of v.matchAll(/\{(@?\w+)\}(['’]?)([a-zçğıöşü]+)/g)) add("ek", k, `«${m[0]}» — ${v}`);
    // 3) yer tutucu kümesi
    if (typeof e === "string" && ph(v).join() !== ph(e).join()) add("yerTutucu", k, `TR {${ph(v)}} / EN {${ph(e)}}`);
    // boş
    if (!v.trim()) add("bos", k, "TR boş");
    if (typeof e === "string" && !e.trim()) add("bos", k, "EN boş");
    // çevrilmemiş
    if (typeof e === "string" && e === v && v.replace(/\{[^}]*\}|<[^>]*>/g, "").replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").length > 15)
      add("cevrilmemis", k, v);
    // TR'de İngilizce cümle
    const stripped = v.replace(EN_IN_TR_OK, "").replace(/<[^>]*>|\{[^}]*\}/g, "");
    const en1 = (stripped.match(EN_STOP) || []).length;
    if (en1 >= 3 && !TURK_CH.test(stripped)) add("trdeIngilizce", k, v);
    // yazım
    for (const [re, fix] of SPELL) {
      const m = v.match(re);
      if (m) add("yazim", k, `«${m[0]}» → ${fix} — ${v}`);
    }
  }
  for (const [k, e] of Object.entries(ENA)) {
    if (typeof e !== "string") continue;
    const s = e.replace(PROPER_OK, "").replace(/<[^>]*>|\{[^}]*\}/g, "");
    if (TURK_CH.test(s)) add("endeTurkce", k, `karakter — ${e}`);
    else if (TR_WORDS_IN_EN.test(s)) add("endeTurkce", k, `kelime «${s.match(TR_WORDS_IN_EN)[0]}» — ${e}`);
    if (!(k in TRA)) add("yetim", k, "EN'de var, TR'de yok");
    if (BTN_KEY.test(k) && e.length > 26 && !/<|\{/.test(e)) add("uzun", k, `EN ${e.length} krk: ${e}`);
  }
  for (const k of Object.keys(tr)) if (!(k in en)) add("enEksik", k, "TR'de var, EN'de yok");
  for (const [k, v] of Object.entries(tr))
    if (BTN_KEY.test(k) && v.length > 26 && !/<|\{/.test(v)) add("uzun", k, `TR ${v.length} krk: ${v}`);
  // hassas içerik
  for (const [lang, D] of [
    ["TR", TRA],
    ["EN", ENA]
  ])
    for (const [k, v] of Object.entries(D)) {
      if (typeof v !== "string") continue;
      for (const [cat, re] of Object.entries(SENS))
        for (const m of v.matchAll(re)) add("hassas", k, `${lang} ${cat} «${m[0]}» — ${v}`);
      for (const m of v.matchAll(REAL)) add("gercekKisi", k, `${lang} «${m[0]}» — ${v}`);
    }
  // terim tutarlılığı
  const termRows = [];
  for (const [lang, D, T] of [
    ["TR", TRA, TERMS],
    ["EN", ENA, TERMS_EN]
  ]) {
    const all = Object.values(D)
      .filter(x => typeof x === "string")
      .join("\n")
      .toLocaleLowerCase(lang === "TR" ? "tr-TR" : "en-US");
    for (const g of T) {
      const c = g.map(w => [w, (all.match(new RegExp(`(^|[^\\p{L}])${w}`, "gu")) || []).length]);
      if (c.filter(x => x[1] > 0).length > 1) termRows.push(`${lang}: ${c.map(([w, n]) => `${w} ×${n}`).join(" · ")}`);
    }
  }
  // kullanılan / tanımsız / kullanılmayan
  const code = sources(SRC)
    .filter(f => !f.includes(`${path.sep}i18n${path.sep}`) && !/events\.[\w.]*(tr|en)\.js$/.test(f))
    .map(f => [path.relative(ROOT, f), fs.readFileSync(f, "utf8")]);
  const used = new Map(),
    prefixes = new Set(),
    lits = new Set();
  for (const [f, s] of code) {
    for (const m of s.matchAll(/(?:\$t|\bt|tRaw)\(\s*"([A-Za-z][\w-]*\.[\w.-]+)"/g)) used.set(m[1], f);
    for (const m of s.matchAll(/(?:\$t|\bt|tRaw)\(\s*`([A-Za-z][\w.-]*?)\$\{/g)) prefixes.add(m[1]);
    for (const m of s.matchAll(/`([A-Za-z][\w-]*\.[\w.-]*)\$\{/g)) prefixes.add(m[1]);
    for (const m of s.matchAll(/["'`]([A-Za-z][\w-]*\.[\w.-]+)["'`]/g)) lits.add(m[1]);
    for (const m of s.matchAll(/["'`]([A-Za-z][\w-]*\.)["'`]\s*\+/g)) prefixes.add(m[1]);
  }
  for (const [k, f] of used) if (!(k in tr)) add("tanimsiz", k, f);
  const pre = [...prefixes].filter(p => p.length > 2);
  // dinamik son ek: Q = ["prep.q1"] → $t(`${q}a`) gibi; dizideki bir literalin 1-2 harf uzantısı da kullanılmış sayılır
  const near = k => lits.has(k.slice(0, -1)) || lits.has(k.slice(0, -2));
  for (const k of Object.keys(tr))
    if (!used.has(k) && !lits.has(k) && !near(k) && !pre.some(p => k.startsWith(p))) add("kullanilmayan", k, tr[k].slice(0, 60));

  // --- rapor ---
  const LABEL = {
    ek: "Yer tutucudan sonra Türkçe ek (ünlü uyumu bozulur)",
    endeTurkce: "EN metinde Türkçe karakter/kelime",
    trdeIngilizce: "TR metinde İngilizce cümle",
    yerTutucu: "TR/EN yer tutucu kümesi farklı",
    bos: "Boş değer",
    cevrilmemis: "TR ile EN aynı (uzun metin, çevrilmemiş olabilir)",
    enEksik: "TR'de var, EN'de yok (elle yazılmış sözlük)",
    yetim: "EN'de var, TR'de yok",
    tanimsiz: "Kodda kullanılan ama tanımsız anahtar",
    kullanilmayan: "Tanımlı ama koddan statik olarak erişilmeyen anahtar (dinamik kullanım olabilir; silinmedi)",
    yazim: "Olası yazım hatası",
    uzun: "390 px'te taşabilecek uzun düğme/başlık (>26 karakter)",
    hassas: "Hassas içerik adayı (bağlama bakılmalı)",
    gercekKisi: "Gerçek kişi adı adayı"
  };
  const lines = [
    "# i18n denetimi",
    "",
    `Araç: \`node tools/i18n-audit.js\` · ${Object.keys(tr).length} TR / ${Object.keys(en).length} EN arayüz anahtarı · ${TRE.length} TR / ${ENE.length} EN olay · ${Object.keys(trEv).length} olay metin alanı.`,
    "",
    "| Kategori | Bulgu |",
    "|---|---|",
    ...Object.keys(LABEL).map(c => `| ${LABEL[c]} | ${(F[c] || []).length} |`),
    ""
  ];
  for (const c of Object.keys(LABEL)) {
    const L = F[c] || [];
    lines.push(`## ${LABEL[c]} (${L.length})`, "");
    for (const { k, msg } of L.slice(0, 400)) lines.push(`- \`${k}\` ${msg.replace(/\n/g, " ").replace(/\|/g, "\\|")}`);
    if (L.length > 400) lines.push(`- … ${L.length - 400} tane daha`);
    lines.push("");
  }
  lines.push("## Terim tutarlılığı (aynı kavram, farklı terim)", "", ...termRows.map(r => `- ${r}`), "");
  const out = path.join(ROOT, "reports", "i18n-audit.md");
  const prev = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  const keep = prev.indexOf("\n## Düzeltmeler") >= 0 ? prev.slice(prev.indexOf("\n## Düzeltmeler")) : "";
  fs.writeFileSync(out, lines.join("\n") + keep);
  const j = process.argv.indexOf("--json");
  if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(F, null, 1));
  console.log(
    Object.keys(LABEL)
      .map(c => `${c}: ${(F[c] || []).length}`)
      .join("\n")
  );
}
main();
