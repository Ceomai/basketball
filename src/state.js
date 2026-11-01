// @ts-check
/* ================= OYUN DURUMU: TEK TANIM =================
   Bir kariyerin bütün durumu (S) burada tanımlanır ve yeni kariyer createState ile oluşturulur.
   Bölümler (tipte gruplanmış hâli):
   - kimlik:     first, last, pos, num, look, home
   - zaman:      age, year, season, week, slot, phase
   - kariyer:    stage, stageSeason, team, role, contract, clauses, wage, career, hist, ss, results, league, sched
   - nitelikler: st (sut, pas, hiz, guc, sav), stf (kesirli birikim), energy, moral, aka, injury
   - ekonomi:    money, tx, items, housing, chips
   - ilişkiler:  rel, partner, npc, followers
   - hikâye:     arcs, arcQ, rival, press, evSeen, chapters, legacy, epilogue, heir, missions
   - ayarlar:    matchMode, matchSpeed, program, tut, saveSlot, schema
   Yeni alan eklerken: burada varsayılanı tanımla, eski kayıtlar için save.js → normalizeState ya da MIGRATIONS'a ekle.
   Bu dosya DOM'a ve global duruma dokunmaz; tsc ile sıkı denetlenir. */
import { WAGE } from "./logic/rules.js";

/** @typedef {"sut"|"pas"|"hiz"|"guc"|"sav"} StatKey */
/** @typedef {Record<StatKey, number>} Stats */
/** @typedef {{ koc:number, takim:number, taraf:number, aile:number, ark:number, partner:number }} Relations */
/** @typedef {{ games:number, pts:number, ast:number, reb:number, blk:number, wins:number, trophies:{type:string,label:string}[], mvps:number, earned:number, [k:string]:any }} CareerTotals */
/** @typedef {{ mom:string, dad:string, friend:string, rival:string, agent:string, journalist:string, coach:string, [k:string]:string }} Npc */
/**
 * @typedef {Object} GameState
 * @property {string} first @property {string} last @property {string} pos @property {number} num @property {Object} look
 * @property {string} home @property {string} city
 * @property {number} age @property {number} year @property {number} season @property {number} week @property {number} slot
 * @property {string} stage @property {number} stageSeason @property {string} role @property {number} contract @property {number} wage
 * @property {boolean} studying @property {number} uniYear @property {boolean} graduated @property {string|null} uni
 * @property {Stats} st @property {number} aka @property {number} energy @property {number} moral
 * @property {number} money @property {number} followers @property {Relations} rel @property {string|null} partner
 * @property {string} housing @property {Record<string, number>} items @property {{train:number, motive:number, offer:number, [k:string]:number}} buffs
 * @property {{w:string, d:string, a:number}[]} tx @property {CareerTotals} career @property {any[]} hist @property {any[]} news
 * @property {{arcade:number, reflex:number}} rec @property {Npc} npc @property {Record<string, number>} chapters
 * @property {Record<string, any>} teams @property {boolean} studied @property {any} tryout @property {any} clubDeal
 * @property {Record<string, any>} arcs @property {string[]} arcQ @property {Record<string, boolean>} clauses
 * @property {string} program @property {Record<string, number>} unlocks @property {number} [saveSlot] @property {number} [schema] @property {number} [wk14]
 */

/** Pozisyonun başlangıç nitelik bonusları ile taban nitelikler. @param {Partial<Stats>} posBonus @returns {Stats} */
export function baseStats(posBonus) {
  /** @type {Stats} */
  const st = { sut: 20, pas: 20, hiz: 20, guc: 20, sav: 20 };
  for (const [k, v] of Object.entries(posBonus || {})) st[/** @type {StatKey} */ (k)] += v || 0;
  return st;
}

/**
 * Yeni kariyer durumu.
 * @param {{ first:string, last:string, pos:string, num:number, look:Object }} profile oluşturma ekranındaki seçimler
 * @param {{ posBonus:Partial<Stats>, npc:Npc }} ctx pozisyon bonusu ve rastgele seçilmiş yan karakter adları
 * @returns {GameState}
 */
export function createState(profile, ctx) {
  return {
    first: profile.first,
    last: profile.last,
    home: "İstanbul",
    city: "İstanbul",
    pos: profile.pos,
    num: profile.num,
    look: { ...profile.look },
    age: 16,
    year: 2026,
    season: 1,
    week: 1,
    slot: 3,
    stage: "lise",
    stageSeason: 1,
    studying: true,
    uniYear: 0,
    graduated: false,
    uni: null,
    role: "rot",
    contract: 0,
    st: baseStats(ctx.posBonus),
    aka: 55,
    energy: 85,
    moral: 65,
    money: 30,
    followers: 140,
    rel: { koc: 45, takim: 45, taraf: 20, aile: 70, ark: 60, partner: 0 },
    partner: null,
    housing: "oda",
    items: {},
    buffs: { train: 0, motive: 0, offer: 0 },
    tx: [],
    wage: WAGE.lise,
    career: { games: 0, pts: 0, ast: 0, reb: 0, blk: 0, wins: 0, trophies: [], mvps: 0, earned: 0 },
    hist: [],
    news: [],
    rec: { arcade: 0, reflex: 0 },
    npc: { ...ctx.npc },
    chapters: {},
    teams: {},
    studied: false,
    tryout: null,
    clubDeal: null,
    arcs: {},
    arcQ: [],
    clauses: {},
    program: "denge",
    unlocks: {}
  };
}
