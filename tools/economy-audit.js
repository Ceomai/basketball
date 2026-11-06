#!/usr/bin/env node
/* ================= EKONOMİ DENETİMİ (baskın strateji / istismar avı) =================
   Kullanım:  node tools/economy-audit.js [--build] [--json reports/economy-audit.json] [--md reports/economy-audit.tables.md]
   - Gerçek oyunu (dist-single/index.html, `npm run build:single`) başsız tarayıcıda açar ve window.Game üzerinden
     sabitleri ve fonksiyonları okur: WAGE, BAL, MARKET, SHOP (+ yatırım geliri), HOUSING, TRAIN_ITEMS, marketPrice,
     chipRate, acadCost, dietCost, drillGain, levelMul, ageGainMul, arcResolve ve hafta başı işleyicileri (Bus "week:start").
     Haftalık gelirler (kanal, akademi, temettü, arcade ödülleri) oyunun kendi işleyicileri çalıştırılarak ÖLÇÜLÜR.
   - DOM'a/mini oyuna bağlı eylemlerin formülleri (fotoğraf çekimi, basın toplantısı, rulet, hipodrom, borsa) kaynak
     dosyalardan düzenli ifadeyle okunan sabitlerle yeniden kurulur; her satırın yanında dosya:satır yazılır.
   - Monte Carlo: rulet / slot (kesin hesap), blackjack (temel strateji), hipodrom (atlı / atsız), borsa (al-tut, momentum).
   - Tekrar simülasyonu: aynı eylemi bir sezon (14 hafta × 3 dilim) yapınca nitelik/takipçi/para nasıl birikir.
   Çıktı: konsola özet, --json ile ham veri, --md ile rapora gömülecek tablolar. */
const fs = require("fs"),
  path = require("path"),
  { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const SRC = f => fs.readFileSync(path.join(ROOT, "src", f), "utf8");
const args = process.argv.slice(2);
const argv = k => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
if (args.includes("--build") || !fs.existsSync(path.join(ROOT, "dist-single", "index.html")))
  execSync("npm run build:single", { cwd: ROOT, stdio: "inherit" });

/* ---------- kaynak kodu yardımcıları: sabit oku + satır numarası ver ---------- */
function loc(file, re) {
  const lines = SRC(file).split("\n");
  const i = lines.findIndex(l => re.test(l));
  return i >= 0 ? `src/${file}:${i + 1}` : `src/${file}:?`;
}
function num(file, re, g = 1, dflt) {
  const m = SRC(file).match(re);
  if (!m) {
    if (dflt !== undefined) return dflt;
    throw new Error(`Sabit bulunamadı: ${file} ${re}`);
  }
  return +m[g];
}
// medya yorgunluğu modeli (src/economy.js mediaGain): ilk işin takipçi çarpanı ≈ 1 + yüzde
const media = (file, re) => 1 + num(file, re, 1, 0);
const C = {
  roulEven: num("casino.js", /: BET \* ([\d.]+)\) : 0/),
  roulGreen: num("casino.js", /bet === "g" \? BET \* (\d+)/),
  slotW8: JSON.parse(SRC("casino.js").match(/const W8 = (\[[^\]]+\])/)[1]),
  slotPay: [...SRC("casino.js").matchAll(/\["\w+", \(\) => icon\([^)]*\), (\d+)\]/g)].map(m => +m[1]),
  slotPair: num("casino.js", /res\[0\] === res\[2\]\) pay = Math\.round\(BET \* ([\d.]+)\)/, 1, 1), // "pay = BET" → 1
  bjBlackjack: num("casino.js", /const p = Math\.round\(stake \* ([\d.]+)\)/),
  raceMargin: num("harbor.js", /\(tot \/ h\.s\) \* ([\d.]+) \* 10/),
  raceMinOdds: num("harbor.js", /odds: Math\.max\(([\d.]+),/),
  raceBet: num("harbor.js", /bet = Math\.max\(5, Math\.round\((\d+) \* pm\(\)\)\)/),
  horseCost: num("harbor.js", /horseCost = Math\.round\((\d+) \* pm\(\)\)/),
  horsePrize: num("harbor.js", /tx\(\$t\("hp\.prizeTx"\), Math\.round\((\d+) \* pm\(\)\)\)/),
  horseS: SRC("harbor.js")
    .match(/s: rnd\(([\d.]+), ([\d.]+)\),\s*\n\s*wins: 0/)
    .slice(1, 3)
    .map(Number),
  otherS: SRC("harbor.js")
    .match(/\.map\(n => \(\{ n, s: rnd\(([\d.]+), ([\d.]+)\) \}\)\)/)
    .slice(1, 3)
    .map(Number),
  stockFee: num("harbor.js", /const FEE = ([\d.]+)/),
  stocks: [...SRC("harbor.js").matchAll(/\{ id: "(\w+)", vol: ([\d.]+), base: (\d+) \}/g)].map(m => ({ id: m[1], vol: +m[2], base: +m[3] })),
  div: Function(`return ${SRC("venues.js").match(/const DIV = (\{[^}]+\})/)[1]}`)(),
  pressMul: media("places.js", /S\.rel\.taraf \+= g;\s*\n\s*late\.mediaGain\(([\d.]+), 4\)/),
  charityMul: media("places.js", /S\.rel\.taraf \+= g;\s*\n\s*late\.mediaGain\(([\d.]+), 5\)/),
  photoK: num("places.js", /\(q \/ 100\) \* ([\d.]+) \* \(S\.items\.telefon/),
  photoPhone: num("places.js", /S\.items\.telefon \? ([\d.]+) : 1/),
  studioK: num("studio.js", /mediaGain\(([\d.]+) \* e, 20 \* e\)/),
  vipMul: media("shops.js", /late\.mediaGain\(([\d.]+), 6\);\s*\n\s*S\.moral \+= 12/),
  campMul: media("agent.js", /S\.rel\.taraf \+= 5;\s*\n\s*late\.mediaGain\(([\d.]+), 5\)/),
  reflexP: num("shops.js", /r\.score >= 18 && Math\.random\(\) < ([\d.]+)/),
  reflexK: num("shops.js", /gainStat\("hiz", Math\.round\(([\d.]+) \* late\.levelMul\("hiz"\)/),
  arcadeCost: num("shops.js", /if \(S\.money < (\d+)\) return;\s*\n\s*tx\(\$t\("shops\.192"\)/, 1, 1) // artık seviyeye göre (src/economy.js arcadeCost)
};
const L = {
  roul: loc("casino.js", /BET \* 2\.1/),
  bj: loc("casino.js", /while \(val\(dh\) < 17\)/),
  slots: loc("casino.js", /const W8/),
  chipRate: loc("social.js", /const RATE =/),
  chipSell: loc("social.js", /chipRate\(\) \* 0\.97/),
  chipFloor: loc("extras.js", /S\.chips < 100\) S\.chips = 100/),
  raceOdds: loc("harbor.js", /odds: Math\.max/),
  horsePrize: loc("harbor.js", /hp\.prizeTx/),
  horseBuy: loc("harbor.js", /horseCost = /),
  stockDrift: loc("harbor.js", /m\.tr\[s\.id\] = rnd\(-0\.03/),
  div: loc("venues.js", /const DIV =/),
  inv: loc("lifestyle.js", /const INC =/),
  avmFx: loc("shops.js", /id: "ayak1"/),
  avmBuy: loc("shops.js", /else it\.fx && it\.fx\(\)/),
  market: loc("shops.js", /export const MARKET/),
  mktCap: loc("lifestyle.js", /MKT_EN_CAP = 30/),
  choco: loc("shops.js", /S\.moral \+= 5;\s*$/),
  press: loc("places.js", /S\.followers \*= 1\.04/),
  charity: loc("places.js", /S\.followers \*= 1\.06/),
  photo: loc("places.js", /const add = Math\.round\(S\.followers \* \(q \/ 100\)/),
  interview: loc("places.js", /S\.followers \*= 1 \+ fx\.taraf \/ 100/),
  studio: loc("studio.js", /const add = Math\.round\(S\.followers \* 0\.035/),
  chanInc: loc("studio.js", /L \* L \* 2 \* \(PM/),
  chanLvl: loc("studio.js", /export const chLevel/),
  collab: loc("venues.js", /bileşik büyümesin/),
  acadInc: loc("academy.js", /const weeklyIncome/),
  acadCost: loc("academy.js", /export const acadCost/),
  acadEnroll: loc("academy.js", /a\.kids\.push\(a\.cand\.splice/),
  arcPrize: loc("extras.js", /const base = period === "w"/),
  arcFol: loc("extras.js", /S\.followers \*= period === "w"/),
  arcRun: loc("shops.js", /export async function arcadeRun/),
  arcMoral: loc("shops.js", /S\.moral \+= Math\.min\(12, 3/),
  arcReflex: loc("shops.js", /kind === "ref" && r\.score >= 18/),
  arcChem: loc("social.js", /m\.chem = Math\.min\(100, m\.chem \+ 6\)/),
  vip: loc("shops.js", /S\.followers \*= 1\.08;/),
  camp: loc("agent.js", /S\.followers = Math\.round\(S\.followers \* 1\.06\)/),
  gift: loc("places.js", /gift = Math\.max\(50/),
  giftAct: loc("places.js", /tx\(\$t\("places\.347"\), -gift\)/),
  program: loc("coach.js", /export function programMul/),
  programBind: loc("coach.js", /S\.program = b\.dataset\.pg/),
  adEnergy: loc("ads.js", /S\.energy \+= 30/),
  adEnergyCap: loc("remote.js", /energyPerWeek: 20/),
  adDouble: loc("ads.js", /tx\(\$t\("ads\.51"\), bonus\)/),
  rest: loc("places.js", /S\.energy \+= 35/),
  team: loc("places.js", /g = Math\.round\(0\.6 \* levelMul/),
  drill: loc("places.js", /export function drillGain/),
  trainGain: loc("logic/rules.js", /export function trainingGain/),
  levelMul: loc("core.js", /export const levelMul/),
  street: loc("street.js", /prize = Math\.round\(12/),
  sponsor: loc("places.js", /const sp = Math\.max\(50, Math\.round\(fame\(\) \* fame\(\)/),
  fame: loc("core.js", /export function fame/),
  housing: loc("places.js", /export const HOUSING/),
  endWeek: loc("match.js", /S\.energy \+= 26 \+ h\.en/),
  box: loc("adplaces.js", /late\.gainStat\(k, 0\.6\)/)
};

/* ---------- 1) tarayıcıda gerçek oyun ---------- */
async function inGame() {
  const { chromium } = require("playwright");
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.join(ROOT, "dist-single", "index.html"));
  await p.waitForTimeout(500);
  const out = await p.evaluate(() => {
    const G = window.Game;
    G.ADS.consent = true;
    Object.assign(G.F, { first: "Eko", last: "Denetim", pos: "SF", slot: 1, mode: "normal" });
    G.startCareer();
    G.S.tut = 1;
    G.S.tipMoment = 1;
    G.closeSheet();
    window.__SIM = { base: 0.5 }; // toast / panel / reklam kapalı
    const S = () => G.S;
    const STK = G.STATS.map(s => s[0]);
    const clone = o => JSON.parse(JSON.stringify(o));
    const r2 = v => Math.round(v * 1000) / 1000;
    const PROF = {
      lise: { age: 16, stat: 35, fol: 300, moral: 55 },
      t3: { age: 20, stat: 50, fol: 5000, moral: 55 },
      t1: { age: 24, stat: 62, fol: 60000, moral: 55 },
      nba: { age: 27, stat: 76, fol: 1500000, moral: 55 }
    };
    function setStage(st) {
      const P = PROF[st],
        s = S();
      s.stage = st;
      s.wage = G.WAGE[st];
      s.age = P.age;
      for (const k of STK) s.st[k] = P.stat;
      s.stf = {};
      s.followers = P.fol;
      s.items = {};
      s.worn = {};
      s.buffs = {};
      s.housing = "oda";
      s.moral = P.moral;
      s.energy = 60;
      s.program = "denge";
      s.money = 1e9;
      s.channel = undefined;
      s.acad = undefined;
      s.amb = undefined;
      s.mkt2 = undefined;
      s.diet = "serbest";
      s.sponsorDeal = null;
      s.partner = null;
      s.chips = 0;
    }
    // durum değiştirmeden ölç: fonksiyonu çalıştır, S'yi geri yükle
    function dry(fn) {
      const snap = clone(S());
      try {
        return fn();
      } finally {
        G.setS(snap);
      }
    }
    // hafta başı işleyicileri: özellik açık/kapalı farkı = o özelliğin haftalık para etkisi
    function weekMoney(prep) {
      return dry(() => {
        prep && prep();
        const m0 = S().money;
        G.Bus.emit("week:start");
        return S().money - m0;
      });
    }
    const res = { stages: {}, consts: {} };
    res.consts.WAGE = G.WAGE;
    res.consts.BAL = G.BAL;
    res.consts.HOUSING = G.HOUSING;
    res.consts.TRAIN_ITEMS = G.TRAIN_ITEMS;
    res.consts.WEAR = G.WEAR;
    res.consts.MKT_EN_CAP = G.MKT_EN_CAP;
    res.consts.SHOP = G.SHOP.map(it => ({ id: it.id, n: it.n, st: it.st, p: it.p, en: it.en || 0, mo: it.mo || 0, up: it.up || 0, inc: it.inc || 0 }));
    // AVM tek seferlik nitelik/ilişki etkileri: gerçek fx'i bir kopyada çalıştırıp farkı ölç
    res.consts.SHOPFX = {};
    for (const it of G.SHOP) {
      if (!it.fx) continue;
      res.consts.SHOPFX[it.id] = dry(() => {
        const s = S(),
          st0 = clone(s.st),
          rel0 = clone(s.rel),
          mo0 = s.moral,
          f0 = s.followers;
        s.moral = 50;
        const m0 = 50;
        it.fx();
        const d = {};
        for (const k of STK) if (s.st[k] !== st0[k]) d[k] = s.st[k] - st0[k];
        for (const k of Object.keys(rel0)) if (s.rel[k] !== rel0[k]) d["rel." + k] = s.rel[k] - rel0[k];
        if (s.moral !== m0) d.moral = s.moral - m0;
        if (s.followers !== f0) d.folMul = r2(s.followers / f0);
        void mo0;
        return d;
      });
    }
    res.consts.MARKET = G.MARKET.map(it =>
      dry(() => {
        const s = S();
        s.energy = 40;
        s.moral = 50;
        s.buffs = {};
        it.fx();
        return { id: it.id, p: it.p, en: s.energy - 40, mo: s.moral - 50, train: s.buffs.train || 0 };
      })
    );
    for (const st of ["lise", "t3", "t1", "nba"]) {
      setStage(st);
      const R = (res.stages[st] = { prof: PROF[st] });
      const s = S();
      // --- gelir ---
      const cut = (G.BAL.tax[st] || 0) + (G.isPro(st) ? G.BAL.agent : 0);
      R.wage = G.WAGE[st];
      R.netWeek = Math.round(G.WAGE[st] * (1 - cut) - (G.BAL.living[st] || 0));
      R.pm = G.marketPrice({ p: 1000 }) / 1000;
      R.chipRate = G.chipRate();
      R.acadCost = G.acadCost();
      R.fame = G.fame();
      R.sponsor = Math.max(50, Math.round(R.fame * R.fame * ({ nba: 9, euro: 4, t1: 2 }[st] || 1.2) * G.sponsorMul()));
      // --- antrenman (gerçek drillGain) ---
      const k = "sut";
      R.levelMul = r2(G.levelMul(k));
      R.ageGainMul = G.ageGainMul();
      R.drill = {};
      for (const ratio of [1 / 3, 2 / 3, 1]) R.drill[ratio.toFixed(2)] = dry(() => G.drillGain(k, ratio));
      R.drillMax = dry(() => {
        // en iyi kurulum: hoca + odak programı + top + bileklik + swatch + vr + fizyo + protein
        const s = S();
        s.items = { hoca: 1, top: 1, bileklik: 1, swatch: 1, vr: 1, fizyo: 1 };
        s.program = "sut";
        s.buffs.train = 3;
        return G.drillGain(k, 2 / 3);
      });
      R.programMulFocus = dry(() => ((S().program = "sut"), G.programMul("sut")));
      R.team = r2(0.6 * G.levelMul(k) * G.ageGainMul() * G.modeTrainMul());
      R.ikili = r2(0.4 * G.levelMul("pas"));
      R.izle = r2(0.5 * 0.25 * G.levelMul("pas"));
      R.reflexPerPlay = r2(0.4 * 0.2 * G.levelMul("hiz"));
      R.streetWin = r2(0.15 * G.levelMul("sut") * 2);
      // tekrar: aynı niteliği bir sezon boyunca (42 antrenman, ortalama başarı) çalış
      R.season = dry(() => {
        const out = [];
        let tot = 0;
        for (let i = 0; i < 42; i++) {
          tot += G.drillGain(k, 2 / 3);
          if ((i + 1) % 14 === 0) out.push({ drills: i + 1, stat: G.statVal(k), gained: r2(tot) });
        }
        return out;
      });
      R.reflexSeason = dry(() => {
        // 300 refleks oyunu (≈ 300 para, 0 zaman dilimi, 0 enerji), beklenen değerle
        let tot = 0;
        for (let i = 0; i < 300; i++) tot += G.gainStat("hiz", 0.4 * 0.2 * G.levelMul("hiz"));
        return { plays: 300, gained: r2(tot), stat: G.statVal("hiz") };
      });
      // --- market ---
      R.market = G.MARKET.map(it => ({ id: it.id, price: G.marketPrice(it) }));
      // --- haftalık gelir kaynakları: gerçek hafta başı işleyicileriyle ölç ---
      const base = weekMoney();
      R.channel = {};
      for (const lv of [2, 5, 10])
        R.channel[lv] =
          weekMoney(() => (S().channel = { xp: Math.pow(lv - 1, 2) * 20, posts: 0, wk: "", n: 0, gear: {} })) - base;
      R.channelXpFor10 = 81 * 20;
      // ayakkabı markası (src/ambition.js): en iyi durum (sokak serisi, premium, lansman heyecanı, 30 sayı, MVP/All-Star, 5M takipçi)
      R.brandCost = G.ambBrandCost ? G.ambBrandCost() : 0;
      R.brandBest = G.ambBrandCost
        ? weekMoney(() => {
            const s = S();
            s.amb = { proj: {}, cap: 0, brand: { line: "street", tier: "premium", hype: 4, total: 0, season: 0, shoe: {} } };
            s.followers = 5e6;
            s.ss = { g: 10, pts: 300 };
            s.career.mvps = 3;
            s.career.allStars = 5;
          }) - base
        : 0;
      R.acad = {};
      for (const pr of [10, 50, 100])
        R.acad[pr] =
          weekMoney(() => {
            S().acad = { prestige: pr, kids: Array.from({ length: 6 }, () => ({ n: "x", pos: "PG", age: 13, sk: 25, pot: 3 })), cand: [], grads: [], cups: 0, wk: 1 };
          }) - base;
      R.arcade = dry(() => {
        // 5 oyunun hepsinde 1. (çok yüksek skor), haftalık + aylık
        const s = S();
        s.arc = { w: G.weekId(), m: G.monthId(), wb: {}, mb: {}, won: 0 };
        for (const g of Object.keys(G.ARC_GAMES)) {
          s.arc.wb[g] = 999;
          s.arc.mb[g] = 999;
        }
        const m0 = s.money,
          f0 = s.followers;
        G.arcResolve("w");
        const w = s.money - m0,
          fw = s.followers / f0;
        const m1 = s.money;
        G.arcResolve("m");
        return { weekly: w, monthly: s.money - m1, folMulWeek: r2(fw) };
      });
      // --- konfor / ev ---
      R.housing = Object.entries(G.HOUSING).map(([id, h]) =>
        dry(() => {
          S().housing = id;
          return { id, rent: h.rent, en: h.en, mo: h.mo || 0, comfort: G.comfort(), moraleBase: G.moraleBase(), cEnergy: G.comfortEnergy() };
        })
      );
      R.dietSporcu = G.dietCost("sporcu");
      R.giftCost = Math.max(50, Math.round(G.WAGE[st] * 0.5));
      R.campCost = Math.max(60, Math.round(G.WAGE[st] * 0.8));
      R.charityCost = Math.round(30 * (1 + G.ORDER.indexOf(st) * 2));
      R.vipCost = Math.round(120 * (1 + G.ORDER.indexOf(st) * 2));
      R.partyCost = Math.round(15 * (1 + G.ORDER.indexOf(st)));
      R.matchBonusWin7 = Math.round((st === "lise" ? 2 : st === "uni" ? 6 : G.WAGE[st] * 0.12) * (7 / 6) * 1.5);
    }
    return res;
  });
  await b.close();
  out.pageErrs = errs;
  return out;
}

/* ---------- 2) kumar / borsa: kesin hesap ve Monte Carlo ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
function casino() {
  const pRB = 18 / 37;
  const roulette = { evenEV: pRB * C.roulEven, greenEV: (1 / 37) * C.roulGreen };
  const p = C.slotW8.map(x => x / 100),
    n = p.length;
  let ev = 0;
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++)
      for (let c = 0; c < n; c++) {
        const pr = p[a] * p[b] * p[c];
        if (a === b && b === c) ev += pr * C.slotPay[a];
        else if (a === b || b === c || a === c) ev += pr * C.slotPair;
      }
  // blackjack: tek deste, her elde karıştırma, krupiye 17'de durur (yumuşak 17 dahil), BJ 3:2 anında, bölme yok, ilk iki kartta ikiye katlama
  const deck = () => {
    const d = [];
    for (let s = 0; s < 4; s++) for (const r of [11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10]) d.push(r);
    for (let i = d.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  };
  const val = h => {
    let t = h.reduce((a, x) => a + x, 0),
      a = h.filter(x => x === 11).length;
    while (t > 21 && a) {
      t -= 10;
      a--;
    }
    return { t, soft: a > 0 };
  };
  let bj = 0;
  const N = 400000;
  for (let i = 0; i < N; i++) {
    const d = deck(),
      ph = [d.pop(), d.pop()],
      dh = [d.pop(), d.pop()];
    let stake = 1;
    if (val(ph).t === 21) {
      bj += C.bjBlackjack - 1;
      continue;
    }
    const up = dh[0];
    const v0 = val(ph);
    if (!v0.soft && (v0.t === 11 || (v0.t === 10 && up < 10) || (v0.t === 9 && up >= 3 && up <= 6))) {
      stake = 2;
      ph.push(d.pop());
    } else
      for (;;) {
        const v = val(ph);
        if (v.t > 21) break;
        const stand = v.soft ? v.t >= 19 || (v.t === 18 && up <= 8) : v.t >= 17 || (v.t >= 13 && up <= 6) || (v.t === 12 && up >= 4 && up <= 6);
        if (stand) break;
        ph.push(d.pop());
      }
    const pv = val(ph).t;
    if (pv > 21) {
      bj -= stake;
      continue;
    }
    while (val(dh).t < 17) dh.push(d.pop());
    const dv = val(dh).t;
    bj += dv > 21 || pv > dv ? stake : pv === dv ? 0 : -stake;
  }
  return { roulette, slotsEV: ev, blackjackEV: 1 + bj / N };
}
function race() {
  const field = own => {
    const f = own ? [{ s: rnd(...C.horseS), mine: true }] : [];
    while (f.length < 6) f.push({ s: rnd(...C.otherS) });
    const tot = f.reduce((a, h) => a + h.s, 0);
    return f.map(h => ({ ...h, odds: Math.max(C.raceMinOdds, Math.round((tot / h.s) * C.raceMargin * 10) / 10) }));
  };
  const N = 300000;
  const run = (own, pickFn) => {
    let net = 0,
      horseWins = 0;
    for (let i = 0; i < N; i++) {
      const f = field(own),
        tot = f.reduce((a, h) => a + h.s, 0),
        pi = pickFn(f);
      let r = Math.random() * tot,
        w = 0;
      for (let j = 0; j < f.length; j++) {
        r -= f[j].s;
        if (r <= 0) {
          w = j;
          break;
        }
      }
      net -= C.raceBet;
      if (w === pi) net += C.raceBet * f[pi].odds;
      if (f[w].mine) {
        net += C.horsePrize;
        horseWins++;
      }
    }
    return { netPerRacePM: net / N, horseWinRate: horseWins / N };
  };
  const fav = f => f.reduce((bi, h, i) => (h.s > f[bi].s ? i : bi), 0);
  const noHorse = run(false, fav),
    withHorse = run(true, () => 0);
  return {
    betPM: C.raceBet,
    horseCostPM: C.horseCost,
    horsePrizePM: C.horsePrize,
    noHorseFavEV: noHorse.netPerRacePM / C.raceBet + 1,
    withHorse,
    racesToPayback: C.horseCost / withHorse.netPerRacePM
  };
}
function stocks(weeks = 56, N = 20000) {
  // harbor.js hafta başı + venues.js haber/temettü (aynı sıra); 4 sezon ≈ 56 hafta
  const NEWS = ["tek", "tek", "enr", "enr", "spr", "spr", "gda", "gda", "all", "all"].map((sec, i) => [sec, i % 2 ? -1 : 1]);
  const strat = { hold: {}, momentum: 0, inv: 0 };
  for (const s of C.stocks) strat.hold[s.id] = 0;
  const holdRet = {};
  for (const s of C.stocks) holdRet[s.id] = [];
  const momRet = [];
  for (let n = 0; n < N; n++) {
    const P = {},
      tr = {},
      H = {};
    for (const s of C.stocks) {
      P[s.id] = s.base;
      tr[s.id] = rnd(-0.01, 0.02);
      H[s.id] = [s.base];
    }
    // al-tut: her hisseye 1 birim, %1 alım komisyonu; temettü nakit birikir
    const sh = {},
      cash = {};
    for (const s of C.stocks) {
      sh[s.id] = 1 / (s.base * (1 + C.stockFee));
      cash[s.id] = 0;
    }
    // momentum: 1 birim; her hafta son haftası en çok yükselen hisseye geç (komisyon ödenir)
    let mHold = null,
      mSh = 0,
      mCash = 1;
    for (let w = 1; w <= weeks; w++) {
      for (const s of C.stocks) {
        if (Math.random() < 0.12) tr[s.id] = rnd(-0.03, 0.035);
        const ch = tr[s.id] + rnd(-s.vol, s.vol);
        P[s.id] = Math.max(2, Math.round(P[s.id] * (1 + ch) * 100) / 100);
      }
      if (Math.random() < 0.3) {
        const [sec, dir] = NEWS[(Math.random() * NEWS.length) | 0],
          size = (sec === "all" ? 0.03 : 0.05) + Math.random() * 0.05;
        for (const s of C.stocks)
          if (sec === "all" || sec === s.id) {
            P[s.id] = Math.max(2, Math.round(P[s.id] * (1 + dir * size) * 100) / 100);
            if (sec !== "all") tr[s.id] += dir * 0.008;
          }
      }
      for (const s of C.stocks) H[s.id].push(P[s.id]);
      if (w % 4 === 0) {
        for (const s of C.stocks) cash[s.id] += sh[s.id] * P[s.id] * (C.div[s.id] || 0);
        if (mHold) mCash += mSh * P[mHold] * (C.div[mHold] || 0);
      }
      // momentum kararı
      let best = null,
        bv = -1;
      for (const s of C.stocks) {
        const h = H[s.id],
          c = h[h.length - 1] / h[Math.max(0, h.length - 4)] - 1;
        if (c > bv) {
          bv = c;
          best = s.id;
        }
      }
      if (bv <= 0) best = null;
      if (best !== mHold) {
        if (mHold) mCash += mSh * P[mHold] * (1 - C.stockFee);
        mSh = 0;
        if (best) {
          mSh = mCash / (P[best] * (1 + C.stockFee));
          mCash = 0;
        }
        mHold = best;
      }
    }
    for (const s of C.stocks) holdRet[s.id].push(sh[s.id] * P[s.id] * (1 - C.stockFee) + cash[s.id]);
    momRet.push(mCash + (mHold ? mSh * P[mHold] * (1 - C.stockFee) : 0));
  }
  const q = (a, x) => {
    const b = [...a].sort((u, v) => u - v);
    return b[Math.floor(x * (b.length - 1))];
  };
  const sum = a => ({ mean: a.reduce((x, y) => x + y, 0) / a.length, p10: q(a, 0.1), p50: q(a, 0.5), p90: q(a, 0.9) });
  const out = { weeks, hold: {}, momentum: sum(momRet) };
  for (const s of C.stocks) out.hold[s.id] = sum(holdRet[s.id]);
  return out;
}

/* ---------- 3) takipçi tekrarı (bir sezon, 14 hafta × 3 dilim) ---------- */
function followers(stages) {
  const fame = f => Math.max(0, Math.min(100, Math.round(Math.log10(Math.max(10, f)) * 16 - 28)));
  const PMv = { lise: 1, t3: 5, t1: 35, nba: 350 };
  const out = {};
  for (const [st, R] of Object.entries(stages)) {
    const f0 = R.prof.fol,
      pm = PMv[st];
    const sim = (perSlot, perWeek, slots = 3) => {
      let f = f0;
      for (let w = 0; w < 14; w++) {
        if (perWeek) f = perWeek(f);
        for (let s = 0; s < slots; s++) f = perSlot(f);
      }
      return { end: Math.round(f), x: +(f / f0).toFixed(2), fame0: fame(f0), fame1: fame(f) };
    };
    const id = f => f;
    out[st] = {
      press: sim(f => f * C.pressMul),
      charity: sim(f => f * C.charityMul),
      photo70: sim(f => f + f * 0.7 * C.photoK + 17),
      photo70phone: sim(f => f + f * 0.7 * C.photoK * C.photoPhone + 17),
      studio70: sim(f => f + f * C.studioK * 1.0 + 20),
      studioTrend90: sim(f => f + f * C.studioK * 1.2 * 1.5 * 1.4 + 20 * 1.2 * 1.5 * 1.4),
      collabWeekly: sim(id, f => f + 40 * pm + f * 0.005, 0),
      signDay: sim(f => f * 1.02 + 10),
      vip: sim(f => f * C.vipMul),
      campaign: sim(f => f * C.campMul),
      arcadeTop3Only: sim(id, f => f * Math.pow(1.02, 5), 0)
    };
  }
  return out;
}

/* ---------- 4) çıktı ---------- */
const f0 = v => (typeof v === "number" ? (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-US") : +v.toFixed(3)) : v);
function md(G, cas, rc, stk, fol) {
  const st = ["lise", "t3", "t1", "nba"];
  const S = G.stages;
  const row = a => `| ${a.map(f0).join(" | ")} |`;
  const T = [];
  T.push("### Tablo 1 — Kariyer evresine göre gelir ve fiyat çarpanları\n");
  T.push("| | " + st.join(" | ") + " |\n|---|" + st.map(() => "---:").join("|") + "|");
  T.push(row(["Ücret / hafta", ...st.map(s => S[s].wage)]));
  T.push(row(["Net maaş / hafta (vergi, menajer, yaşam sonrası)", ...st.map(s => S[s].netWeek)]));
  T.push(row(["Fiyat çarpanı PM (market, stüdyo, akademi…)", ...st.map(s => S[s].pm)]));
  T.push(row(["Fiş kuru (para / fiş)", ...st.map(s => S[s].chipRate)]));
  T.push(row(["Akademi binası", ...st.map(s => S[s].acadCost)]));
  T.push(row(["Akademi geliri/hafta (6 öğrenci, prestij 10 / 50 / 100)", ...st.map(s => `${S[s].acad[10]} / ${S[s].acad[50]} / ${S[s].acad[100]}`)]));
  T.push(row(["Kanal geliri/hafta (seviye 2 / 5 / 10)", ...st.map(s => `${S[s].channel[2]} / ${S[s].channel[5]} / ${S[s].channel[10]}`)]));
  T.push(row(["Ayakkabı markası/hafta en iyi durum (lansman maliyeti, geri dönüş haftası)", ...st.map(s => `${S[s].brandBest} (${S[s].brandCost}, ${S[s].brandBest > 0 ? Math.ceil(S[s].brandCost / S[s].brandBest) : "–"})`)]));
  T.push(row(["Arcade 5 oyunda 1.: haftalık + aylık ödül", ...st.map(s => `${S[s].arcade.weekly} + ${S[s].arcade.monthly}`)]));
  T.push(row(["Sokak turnuvası ödülü (haftada 1)", ...st.map(s => Math.round(12 * S[s].pm))]));
  T.push(row(["Galibiyet primi (not 7)", ...st.map(s => S[s].matchBonusWin7)]));
  T.push(row(["Sponsor (tipik şöhret)", ...st.map(s => `${S[s].sponsor} (şöhret ${S[s].fame})`)]));
  const inv = G.consts.SHOP.filter(x => x.inc);
  T.push(row(["Yatırım (kiradaire/dükkan/plaza) geri dönüş, hafta", ...st.map(() => inv.map(x => Math.ceil(x.p / x.inc)).join("/"))]));
  T.push(row(["En ucuz yatırım (60.000) = kaç haftalık net maaş", ...st.map(s => (60000 / Math.max(1, S[s].netWeek)).toFixed(0))]));
  T.push("\n### Tablo 2 — Nitelik kazancı / maliyet (şut, tipik nitelik düzeyinde)\n");
  T.push("| Kaynak | Maliyet | " + st.map(s => `${s} (nitelik ${S[s].prof.stat}, yaş ${S[s].prof.age})`).join(" | ") + " |\n|---|---|" + st.map(() => "---:").join("|") + "|");
  T.push(row(["levelMul", "—", ...st.map(s => S[s].levelMul)]));
  T.push(row(["Bireysel antrenman (başarı 1/3)", "1 dilim, 18 enerji", ...st.map(s => S[s].drill["0.33"])]));
  T.push(row(["Bireysel antrenman (başarı 2/3)", "1 dilim, 18 enerji", ...st.map(s => S[s].drill["0.67"])]));
  T.push(row(["Bireysel antrenman (kusursuz)", "1 dilim, 18 enerji", ...st.map(s => S[s].drill["1.00"])]));
  T.push(row(["Antrenman, tam donanım (hoca+program+eşya+protein, 2/3)", "1 dilim + eşyalar", ...st.map(s => S[s].drillMax)]));
  T.push(row(["Takım antrenmanı", "1 dilim, 12 enerji", ...st.map(s => S[s].team)]));
  T.push(row(["İkili çalışma (pas)", "1 dilim, 10 enerji", ...st.map(s => S[s].ikili)]));
  T.push(row(["Kafede maç izle (pas, beklenen)", "1 dilim, 5 para", ...st.map(s => S[s].izle)]));
  T.push(row(["Sokak turnuvası galibiyeti (şut+hız)", "1 dilim/hafta, 15 enerji", ...st.map(s => S[s].streetWin)]));
  T.push(row(["**Arcade Refleks (beklenen, oyun başı)**", "**1 para, 0 dilim, 0 enerji**", ...st.map(s => S[s].reflexPerPlay)]));
  T.push(row(["**300 Refleks oyunu toplam**", "300 para", ...st.map(s => S[s].reflexSeason.gained)]));
  T.push(row(["Sezon boyu aynı nitelik: 14/28/42 antrenman", "42 dilim", ...st.map(s => S[s].season.map(x => x.gained).join(" / "))]));
  const avmStat = Object.entries(G.consts.SHOPFX)
    .map(([id, d]) => [id, STK.reduce((a, k) => a + (d[k] || 0), 0)])
    .filter(x => x[1] > 0);
  const avmTot = avmStat.reduce((a, x) => a + x[1], 0),
    avmCost = avmStat.reduce((a, [id]) => a + G.consts.SHOP.find(y => y.id === id).p, 0);
  T.push(row([`**AVM tek seferlik düz nitelik (${avmStat.length} eşya)**`, `${avmCost} para (sabit fiyat)`, ...st.map(() => `+${avmTot} (levelMul yok)`)]));
  T.push(row(["…eşdeğer antrenman sayısı (2/3 başarı)", "", ...st.map(s => Math.round(avmTot / Math.max(0.001, S[s].drill["0.67"])))]));
  T.push("\n### Tablo 3 — Enerji ve moral kaynakları\n");
  T.push("| Kaynak | lise fiyat | nba fiyat | Enerji | Moral | Not |\n|---|---:|---:|---:|---:|---|");
  for (const m of G.consts.MARKET) {
    const pl = S.lise.market.find(x => x.id === m.id).price,
      pn = S.nba.market.find(x => x.id === m.id).price;
    T.push(row([`Market: ${m.id}`, pl, pn, m.en, m.mo, m.train ? `antrenman +%20 × ${m.train}` : ""]));
  }
  T.push(row(["Dinlen", 0, 0, 35, 2, "1 dilim"]));
  T.push(row(["Reklam: enerji", 0, 0, 30, 0, "dilim yok; haftada 20'ye kadar, enerji < 60 iken"]));
  T.push(row(["Arcade oyunu", 1, 1, 0, "3–12", "dilim yok, sınırsız, fiyat sabit 1"]));
  T.push(row(["Kafe sohbet", 3, 3, 0, 8, "1 dilim; arkadaş +8"]));
  T.push(row(["Gece kulübü partisi", S.lise.partyCost, S.nba.partyCost, -22, 16, "1 dilim, kondisyon −3, %20 skandal"]));
  T.push("\n### Tablo 4 — Takipçi: aynı eylem bir sezon (14 hafta × 3 dilim)\n");
  const fk = Object.keys(fol.lise);
  T.push("| Eylem | " + st.map(s => `${s} (başlangıç ${S[s].prof.fol.toLocaleString("en-US")})`).join(" | ") + " |\n|---|" + st.map(() => "---:").join("|") + "|");
  for (const k of fk) T.push(row([k, ...st.map(s => `×${fol[s][k].x} → şöhret ${fol[s][k].fame0}→${fol[s][k].fame1}`)]));
  T.push("\n### Tablo 5 — Kumar, at yarışı, borsa\n");
  T.push(`| Oyun | Beklenen dönüş (1 birim bahis) | Kaynak |\n|---|---:|---|`);
  T.push(row(["Rulet: kırmızı/siyah/tek/çift/düşük", cas.roulette.evenEV, L.roul]));
  T.push(row(["Rulet: yeşil (0)", cas.roulette.greenEV, L.roul]));
  T.push(row(["Slot", cas.slotsEV, L.slots]));
  T.push(row(["Blackjack (temel strateji)", cas.blackjackEV, L.bj]));
  T.push(row(["Hipodrom, atsız (favoriye)", rc.noHorseFavEV, L.raceOdds]));
  T.push(row([`Hipodrom, kendi atınla: net/yarış (PM birimi)`, `+${rc.withHorse.netPerRacePM.toFixed(2)} PM (at kazanma %${(rc.withHorse.horseWinRate * 100).toFixed(1)})`, L.horsePrize]));
  T.push(row(["At kendini kaç yarışta öder", Math.round(rc.racesToPayback), L.horseBuy]));
  T.push(`\nBorsa (${stk.weeks} hafta, 1 birim yatırım, komisyon dahil; ortalama / p10 / p50 / p90):\n`);
  T.push("| Strateji | ortalama | p10 | p50 | p90 |\n|---|---:|---:|---:|---:|");
  for (const [id, v] of Object.entries(stk.hold)) T.push(row([`Al-tut ${id}`, v.mean, v.p10, v.p50, v.p90]));
  T.push(row(["Momentum (4 haftalık en iyi hisseye geç)", stk.momentum.mean, stk.momentum.p10, stk.momentum.p50, stk.momentum.p90]));
  const invRet = Math.pow(1, 1) + (inv[0].inc / inv[0].p) * stk.weeks;
  T.push(row([`AVM yatırımı (kiradaire, ${stk.weeks} hafta, risksiz)`, invRet, invRet, invRet, invRet]));
  T.push("\n### Tablo 6 — Evreler arası arbitraj (düşük evrede öde, yüksek evrede kazan)\n");
  T.push("| Varlık | Alış (evre → maliyet) | Getiri NBA'de | Oran | Kaynak |\n|---|---|---:|---:|---|");
  T.push(row(["1.000 fiş", `uni (18 yaş) → ${Math.round(1000 * 0.02)}`, Math.floor(1000 * S.nba.chipRate * 0.97), `×${Math.round((S.nba.chipRate * 0.97) / 0.02)}`, L.chipRate]));
  T.push(row(["1.000 fiş", `t3 → ${Math.round(1000 * S.t3.chipRate)}`, Math.floor(1000 * S.nba.chipRate * 0.97), `×${Math.round((S.nba.chipRate * 0.97) / S.t3.chipRate)}`, L.chipRate]));
  T.push(row(["Akademi binası", `t3 → ${S.t3.acadCost}`, `${S.nba.acad[10]}/hafta`, `${((S.nba.acad[10] / S.t3.acadCost) * 100).toFixed(0)}%/hafta`, L.acadInc]));
  T.push(row(["Yarış atı", `t3 → ${Math.round(C.horseCost * 5)}`, `${Math.round(rc.withHorse.netPerRacePM * 350)}/yarış`, `${Math.round((C.horseCost * 5) / (rc.withHorse.netPerRacePM * 350))} yarışta öder`, L.horsePrize]));
  T.push(row(["Teselli fişi (100 fiş/hafta, sat → 0)", "bedava", `${Math.floor(100 * S.nba.chipRate * 0.97)}/hafta`, "", L.chipFloor]));
  return T.join("\n");
}
const STK = ["sut", "pas", "hiz", "guc", "sav"];

(async () => {
  const G = await inGame();
  const cas = casino(),
    rc = race(),
    stk = stocks(),
    fol = followers(G.stages);
  const all = { generated: new Date().toISOString(), consts: C, locations: L, game: G, casino: cas, race: rc, stocks: stk, followers: fol };
  const table = md(G, cas, rc, stk, fol);
  const J = argv("--json"),
    M = argv("--md");
  if (J) fs.writeFileSync(path.resolve(ROOT, J), JSON.stringify(all, null, 1));
  if (M) fs.writeFileSync(path.resolve(ROOT, M), table + "\n");
  console.log(table);
  if (G.pageErrs.length) console.error("Sayfa hataları:", G.pageErrs);
})();
