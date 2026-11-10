/* ================= KAYIT ŞEMASI (DOM'suz) =================
   Kayıt sürüm geçişleri (MIGRATIONS), metin temizliği ve eksik alan onarımı. src/save.js bunları oyunun
   bağımlılıklarıyla (brandSave, createState, MY_LISE) çağırır; birim testleri eski kayıt örnekleriyle
   (tests/fixtures/old-*.json) doğrudan çağırır (tests/unit/saveSchema.test.mjs). */
/* ---- Kayıt şeması sürümleri ----
   Oyun durumunun yapısı değiştiğinde SAVE_V bir artırılır ve MIGRATIONS'a o sürüme taşıyan adım eklenir.
   Eski bir kayıt açılırken eksik adımlar sırayla uygulanır; her adım tek bir sürüm atlatır.
   Eksik alanları varsayılanla dolduran normalizeState() ise her açılışta çalışır (yapı değiştirmez). */
export const SAVE_V = 5;
/** @type {Record<number, (s: any) => void>} */
export const MIGRATIONS = {
  // 5: sezon 14 maça çıktı, haftalık ücret yarı ölçeğe indi
  5: s => {
    if (!s.wk14) {
      s.wk14 = 1;
      if (s.wage > 20) s.wage = Math.round(s.wage / 2);
    }
  }
};
/** Kayıttaki metinlerden işaretleme karakterlerini temizle: başkasından gelen kayıt kodu ya da yedek dosyası
    (ad, takım, haber metni içine gömülü HTML/JS) ekrana basılınca çalışmasın. Oyunun kendi metinlerinde < > yoktur. */
/** @param {any} o @param {number} [depth] @returns {any} */
export function cleanStrings(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 12) return o;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === "string") {
      if (/[<>]/.test(v)) o[k] = v.replace(/[<>]/g, "");
    } else if (v && typeof v === "object") cleanStrings(v, depth + 1);
  }
  return o;
}
/** Eski kayıt → güncel şema. brand: eski gerçek kulüp/lig adlarını kurgusala çeviren işlev (src/brand.js brandSave)
    @param {any} s @param {number | undefined} from @param {(s: any) => void} [brand] */
export function upgradeSchema(s, from, brand) {
  cleanStrings(s); // bütün yükleme yolları buradan geçer: yuva, yedek, IndexedDB, kayıt kodu, dosya
  if (brand) brand(s); // eski kayıtlardaki gerçek kulüp/lig adları → kurgusal (anahtarlar değişmez; src/brand.js)
  for (let v = (from || 3) + 1; v <= SAVE_V; v++) if (MIGRATIONS[v]) MIGRATIONS[v](s);
  s.schema = SAVE_V;
  return s;
}
/** Eksik/bozuk alanları onar. createState: yeni kariyer durumu üreticisi (src/state.js); myLise: kendi lisemizin adı
    @param {any} s @param {(profile: any, ctx: any) => any} createState @param {string} myLise */
export function normalizeSchema(s, createState, myLise) {
  // eksik alanlar (yarım kayıt, eski sürüm, elle düzenlenmiş kod): yeni kariyerin varsayılanlarıyla tamamlanır
  const def = createState(
    { first: s.first || "Oyuncu", last: s.last || "", pos: s.pos || "SF", num: s.num || 7, look: s.look || {} },
    { posBonus: {}, npc: {} }
  );
  for (const k of Object.keys(def)) if (k !== "unlocks" && (s[k] === undefined || s[k] === null)) s[k] = def[k];
  // Bozuk ya da eksik alanları onar (depolama hatası, yarım yazılmış kayıt, eski sürüm): oyun hiçbir kayıtta çökmemeli.
  // Tür onarımı alan atamalarından ÖNCE: npc/rel/st sayı ya da dizi gelirse s.npc[k] = ... TypeError verirdi.
  for (const k of ["hist", "tx", "news", "arcQ", "results", "league", "sched"]) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ["items", "teams", "arcs", "chapters", "clauses", "evSeen", "npc", "rel", "st"])
    if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
  for (const k of ["mom", "dad", "friend", "rival", "agent", "journalist", "coach"])
    if (typeof s.npc[k] !== "string" || !s.npc[k]) s.npc[k] = "-";
  for (const k of ["koc", "takim", "taraf", "aile", "ark", "partner"])
    if (typeof s.rel[k] !== "number" || !isFinite(s.rel[k])) s.rel[k] = 50;
  for (const [k, v] of [
    ["money", 30],
    ["energy", 85],
    ["moral", 65],
    ["followers", 140],
    ["aka", 55],
    ["wage", 2],
    ["contract", 0]
  ])
    if (typeof s[k] !== "number" || !isFinite(s[k])) s[k] = v;
  for (const k of ["sut", "pas", "hiz", "guc", "sav"]) if (typeof s.st[k] !== "number" || !isFinite(s.st[k])) s.st[k] = 20;
  if (s.missions && (typeof s.missions !== "object" || !Array.isArray(s.missions.daily) || !Array.isArray(s.missions.weekly)))
    s.missions = null;
  if (s.legacy && (typeof s.legacy !== "object" || typeof s.legacy.found !== "object" || !s.legacy.found)) s.legacy = null;
  // kademeli açılıştan önceki kayıtlar: her şey açık ve görülmüş sayılır (toplu bildirim çıkmaz)
  if (!s.unlocks || typeof s.unlocks !== "object") s.unlocks = { program: 1, sistem: 1, gorev: 1, miras: 1 };
  s.buffs = s.buffs || { train: 0, motive: 0, offer: 0 };
  s.rec = s.rec || { arcade: 0, reflex: 0 };
  s.news = s.news || [];
  s.teams = s.teams || {};
  s.arcs = s.arcs || {};
  s.arcQ = s.arcQ || [];
  if (s.career && typeof s.career !== "object") s.career = null;
  s.career = s.career || { games: 0, pts: 0, ast: 0, reb: 0, blk: 0, wins: 0, trophies: [], mvps: 0, earned: 0 };
  if (!Array.isArray(s.career.trophies)) s.career.trophies = [];
  if (s.team && s.team.key === "lise|İstanbul|0") {
    s.team.name = myLise;
    s.team.short = "MMS";
    if (s.teams[s.team.key]) Object.assign(s.teams[s.team.key], { name: myLise, short: "MMS" });
  }
  return s;
}
