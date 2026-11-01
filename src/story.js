import { t } from "./i18n/index.js";
import { autoSuccess, rivalGrowthRange } from "./logic/rules.js";
import { late } from "./late.js";
import {
  $,
  $$,
  BAL,
  Bus,
  COMMON_DRILLS,
  DRILLS,
  EU_CC,
  LEAGUES,
  ORDER,
  WAGE,
  clamp,
  esc,
  fmt,
  isPro,
  levelName,
  pick,
  ri,
  rnd,
  roleAt,
  statName,
  tdOf,
  toast
} from "./data.js";
import { leaguePool } from "./clubs.js";
import { portrait } from "./art.js";
import {
  ROLE_N,
  S,
  closeSheet,
  crestSVG,
  eff,
  fixture,
  fullName,
  lgName,
  makeTeam,
  news,
  norm,
  ovr,
  phaseName,
  seasonLabel,
  sheet,
  standings,
  teamByKey,
  tx
} from "./core.js";
import { save } from "./save.js";
import { drillGain } from "./places.js";
import { LK, M, PEN, potential } from "./match.js";
import { playMatch } from "./engine.js";
import { chemAvg, dominance, rated, seasonAvg, seasonAvgOf, simWithoutMe } from "./systems.js";
/* ================= HİKÂYE VE KARİYER DÖNGÜSÜ =================
   - Otomatik maç ve "Haftayı hızlı geç"
   - Kalıcı rakip oyuncu ve derbiler
   - Koçun güvenine göre sezon içinde rol değişimi
   - Maç sonrası basın toplantısı (sözlerin bir sonraki maçta karşılığı var)
   - Birkaç hafta süren hikâye zincirleri: transfer söylentisi, sakatlık dönüşü, aile meselesi,
     lise kaptanlığı, üniversite final haftası */

/* ---- Otomatik çözüm: mini oyun oynanmadan niteliklere göre sonuç ----
   Ortalama bir oyuncudan biraz düşük isabet verir; maçı kendin oynamak daha iyi not getirir. */
export const autoP = e => autoSuccess(e, (window.__SIM && window.__SIM.base) || 0.46);
export const coin = p => Math.random() < p;
export function autoChoose(opts) {
  return opts.map(o => ({ k: o.k, v: (o.k === "safe" ? o.e - 10 : o.e) + rnd(0, 10) })).sort((a, b) => b.v - a.v)[0].k;
}
export function autoResolve(k, sur) {
  const P3 = ["pull", "catch", "wing"],
    P2 = ["step", "pop", "mid"];
  if (P3.includes(k) || P2.includes(k)) {
    const th = P3.includes(k),
      ok = coin(autoP(eff("sut") - (PEN[k] || 0) - (th ? 6 : 0)) * (th ? 0.85 : 1));
    if (ok) M.pts += th ? 3 : 2;
    return {
      good: ok,
      w: th ? 1.3 : 1,
      st: "sut",
      txt: ok ? `${sur} ${th ? "üçlüğü soktu." : "orta mesafeden attı."}` : `${sur} şutu kaçırdı.`
    };
  }
  if (k === "drive" || k === "break") {
    if (!coin(autoP(eff("hiz")))) return { good: false, w: 1, st: "hiz", txt: `${sur} top kaybı yaptı.` };
    M.pts += 2;
    if (k === "drive" && coin(0.18) && coin(autoP(eff("sut") + 10))) M.pts++;
    return { good: true, w: k === "break" ? 1.2 : 1, st: "hiz", txt: `${sur} potaya girip bitirdi.` };
  }
  if (["pnr", "kick", "lob"].includes(k)) {
    if (!coin(autoP(eff("pas") - (PEN[k] || 0)))) return { good: false, w: 1, st: "pas", txt: "Pas araya girdi." };
    const conv = (k === "lob" ? 0.75 : 0.58) + S.rel.takim * 0.003 + (chemAvg() - 40) * 0.002;
    if (coin(conv)) {
      M.ast++;
      return { good: true, w: k === "lob" ? 1.3 : 1, st: "pas", txt: `${sur} asisti yaptı.` };
    }
    return { good: true, w: 0.6, st: "pas", txt: "Pas iyiydi, şut girmedi." };
  }
  if (k === "post" || k === "dunk") {
    const ok = coin(autoP(eff("guc") + (k === "dunk" ? 5 : 0)));
    if (ok) M.pts += 2;
    return {
      good: ok,
      w: k === "dunk" ? 1.3 : 1.2,
      st: "guc",
      txt: ok ? `${sur} pota altında bitirdi.` : `${sur} pota altında bloklandı.`
    };
  }
  if (k === "putback" || k === "reb") {
    if (!coin(autoP(eff("guc")))) return { good: false, w: 1, st: "guc", txt: "Ribaund rakipte." };
    M.reb++;
    if (k === "reb") {
      M.stops++;
      return { good: true, w: 1, st: "guc", txt: `${sur} ribaundu aldı.` };
    }
    if (coin(0.8)) {
      M.pts += 2;
      return { good: true, w: 1.2, st: "guc", txt: `${sur} ribaunddan bastı.` };
    }
    return { good: true, w: 0.6, st: "guc", txt: `${sur} ribaundu aldı.` };
  }
  if (k === "block") {
    const ok = coin(autoP((eff("sav") + eff("guc")) / 2));
    if (ok) {
      M.blk++;
      M.stops++;
    }
    return { good: ok, w: 1.2, st: "sav", txt: ok ? `${sur} blokladı.` : "Rakip bitirdi." };
  }
  if (k === "steal") {
    const ok = coin(autoP(eff("hiz") - 6));
    if (ok) M.stl++;
    return { good: ok, w: 1.2, st: "hiz", txt: ok ? `${sur} topu çaldı.` : "Top çalma denemesi boşa gitti." };
  }
  if (k === "charge") {
    const ok = coin(clamp((eff("sav") / 100) * 0.6 + 0.15, 0.1, 0.75));
    if (ok) M.stops++;
    return { good: ok, w: 1.1, st: "sav", txt: ok ? `${sur} hücum faulü aldı.` : "Faul sana çalındı." };
  }
  if (k === "safe") {
    const ok = coin(clamp((eff(S.pos === "PF" ? "guc" : "sav") / 100) * 0.7 + 0.25, 0.2, 0.9));
    if (ok) M.stops++;
    return { good: ok, w: 0.5, st: "sav", txt: ok ? "Savunma yerini korudu." : "Rakip boşluğu buldu." };
  }
  let m = 0;
  for (let i = 0; i < 2; i++) if (coin(autoP(eff("sut") + 12))) m++;
  M.pts += m;
  return { good: m > 0, w: 0.6, st: "sut", txt: `${sur} serbest atışlardan ${m}/2.` };
}

/* ---- Haftayı hızlı geç ----
   Kalan zaman dilimlerini mantıklı bir planla doldurur (dinlen, çalış, antrenman, sosyal),
   sonra maçı otomatik oynatır ya da istersen maça kendin çıkarsın. Antrenman mini oyunsuz yapıldığı
   için kazancı biraz düşüktür. */
export function autoWeekPlan() {
  const out = [];
  while (S.slot > 0) {
    S.slot--;
    if (S.injury) {
      if (S.injury.w > 1 && coin(0.5)) S.injury.w--;
      S.energy += 10;
      out.push(["Fizyoterapi", "+10 enerji"]);
      continue;
    }
    if (S.energy < 42) {
      S.energy += 35;
      S.moral += 2;
      out.push(["Dinlendin", "+35 enerji"]);
      continue;
    }
    if (S.studying && S.aka < 55 && (S.stage === "lise" || S.stage === "uni") && !S.studied) {
      let c = 0;
      for (let i = 0; i < 3; i++) if (coin(0.6)) c++;
      S.aka += c * 3;
      S.energy -= 6;
      S.studied = true;
      out.push(["Ders çalıştın", `+${c * 3} akademik`]);
      continue;
    }
    if (S.moral < 45) {
      if (S.money >= 3) tx("Arkadaşlarla kafe", -3);
      S.moral += 8;
      S.rel.ark += 8;
      out.push(["Arkadaşlarla buluştun", "+8 moral"]);
      continue;
    }
    if (S.rel.aile < 40) {
      S.rel.aile += 12;
      S.moral += 5;
      out.push(["Aileni ziyaret ettin", "+12 aile"]);
      continue;
    }
    // pozisyona göre en çok işe yarayacak antrenman
    const W = {
      PG: { pas: 1.3, hiz: 1.2, sut: 1, sav: 0.8, guc: 0.7 },
      SG: { sut: 1.4, hiz: 1.1, pas: 0.9, sav: 0.9, guc: 0.7 },
      SF: { sut: 1.1, sav: 1, guc: 1, hiz: 1, pas: 0.9 },
      PF: { guc: 1.3, sav: 1.3, sut: 0.9, hiz: 0.8, pas: 0.7 },
      C: { guc: 1.5, sav: 1.4, sut: 0.7, hiz: 0.7, pas: 0.7 }
    }[S.pos];
    const drills = [...DRILLS[S.pos], ...COMMON_DRILLS];
    let best = drills[0],
      bv = -1;
    for (const d of drills) {
      const v = W[d[2]] * (100 - S.st[d[2]]);
      if (v > bv) {
        bv = v;
        best = d;
      }
    }
    const k = best[2],
      ratio = clamp(autoP(eff(k) + 10) * 0.9, 0, 1),
      g = drillGain(k, ratio);
    S.st[k] += g;
    S.energy -= 18;
    out.push([`Antrenman · ${best[0]}`, g ? `+${g} ${statName(k)}` : `${statName(k)} gelişiyor`]);
  }
  norm();
  save();
  return out;
}
export function quickWeek() {
  closeSheet();
  const plan = autoWeekPlan();
  const fx = fixture(),
    opp = teamByKey(fx.opp);
  sheet(
    t("quick.title"),
    `${seasonLabel()} · Hafta ${S.week}`,
    `<div class="card"><div class="eyebrow">${t("quick.did")}</div>${plan.length ? `<div class="kv">${plan.map(([a, b]) => `<span>${esc(a)}</span><b>${esc(b)}</b>`).join("")}</div>` : `<p class="small muted">${t("quick.full")}</p>`}</div>
   <div class="card"><div class="eyebrow">${t("quick.next")}</div><div class="row nowrap" style="gap:10px">${crestSVG(opp, 40)}<div><b>${esc(opp.name)}</b><div class="small muted">${fx.home ? t("main.home") : t("main.away")} · ${phaseName()}</div></div></div>${S.injury ? `<p class="small bad">${t("quick.injured")}</p>` : `<p class="small muted">${t("quick.autoNote")}</p>`}</div>
   ${S.injury ? `<button class="btn pri" id="qw-sim">${t("quick.watch")}</button>` : `<div class="grid2"><button class="btn" id="qw-self">${t("quick.self")}</button><button class="btn pri" id="qw-sim">${t("quick.sim")}</button></div>`}`,
    { noClose: true }
  );
  $("#qw-sim").onclick = () => {
    closeSheet();
    if (S.injury) simWithoutMe();
    else {
      const f = fixture();
      playMatch({ opp: teamByKey(f.opp), home: f.home, comp: "lig", label: `${lgName()} · ${phaseName()}`, auto: true });
    }
  };
  const me = $("#qw-self");
  if (me)
    me.onclick = () => {
      closeSheet();
      playMatch();
    };
}

/* ================= RAKİP OYUNCU ================= */
// Aynı yaşta, aynı şehirden, kariyeri seninle paralel ilerleyen bir rakip.
export function makeRival() {
  const c = LEAGUES.TR,
    opp = S.league.map(r => r.key).filter(k => k !== S.team.key),
    tk = pick(opp) || S.team.key,
    t = teamByKey(tk);
  const name = S.npc && S.npc.rival ? S.npc.rival.split(" ") : [pick(c.first), pick(c.last)];
  return {
    first: name[0],
    last: name[1] || pick(c.last),
    pos: coin(0.6) ? S.pos : pick(["PG", "SG", "SF", "PF", "C"].filter(p => p !== S.pos)),
    ovr: ovr() + ri(-1, 3),
    talent: rnd(0.95, 1.2),
    stage: "lise",
    team: { key: tk, name: t.name, city: t.city, cc: "TR", c1: t.c1, c2: t.c2 },
    ppg: 0,
    avg: 6.4,
    hist: [],
    ahead: false
  };
}
export const rivalName = () => (S.rival ? `${S.rival.first} ${S.rival.last}` : S.npc.rival);
export function rivalStageFor(o, age) {
  if (age < 18) return "lise";
  const fits = ["t3", "t2", "t1", "euro", "nba"].filter(st => o >= tdOf(st, "TR") + 45 - 2 && (st !== "nba" || age <= 29));
  if (!fits.length) return age <= 21 ? "uni" : "t3";
  return fits[fits.length - 1];
}
export function rivalSeason() {
  const R = S.rival;
  if (!R) return null;
  const age = S.age; // seasonEnd yaşı artırdıktan sonra çağrılır
  const g = ri(...rivalGrowthRange(age));
  R.ovr = clamp(Math.round(R.ovr + g * R.talent), 25, 95);
  const prev = R.stage,
    st = rivalStageFor(R.ovr, age);
  let moved = null;
  if (st !== prev || (isPro(st) && coin(0.25))) {
    let t;
    if (st === "lise") t = null;
    else if (st === "uni") {
      const u = makeTeam("uni", pick(LEAGUES.TR.cities.filter(c => c !== "İstanbul")), 0);
      t = u;
    } else {
      const cc = st === "nba" ? "US" : coin(0.45) ? "TR" : pick(EU_CC);
      t = pick(leaguePool(st, cc));
    }
    if (t) {
      R.team = { key: t.key, name: t.name, city: t.city, cc: t.cc || "TR", c1: t.c1, c2: t.c2 };
      moved = t;
    }
    R.stage = st;
  }
  const d = R.ovr - (tdOf(R.stage, R.team.cc) + 45);
  R.ppg = +clamp(9 + d * 0.55 + rnd(-2.5, 2.5), 2, 31).toFixed(1);
  R.avg = +clamp(6.5 + d * 0.05 + rnd(-0.4, 0.4), 5, 8.9).toFixed(2);
  R.hist.push({ age: age - 1, stage: R.stage, team: R.team.name, ppg: R.ppg, avg: R.avg });
  if (moved) news(`${rivalName()} ${moved.name} ile anlaştı (${levelName(R.stage)}).`);
  return moved;
}
// Sezon sonu kıyas kartı; rakip seni geçtiyse ya da sen onu geçtiysen hikâye anı
export function rivalCard(avg) {
  const R = S.rival;
  if (!R) return "";
  const my = ORDER.indexOf(S.stage),
    his = ORDER.indexOf(R.stage);
  const ss = S.hist.length ? S.hist[S.hist.length - 1] : null,
    myP = ss && ss.g ? (ss.pts / ss.g).toFixed(1) : "0.0";
  let line;
  if (his > my && !R.ahead) {
    R.ahead = true;
    S.buffs.train = (S.buffs.train || 0) + 4;
    line = `${R.first} senden bir basamak önde. Bu seni hırslandırdı: sonraki 4 antrenmanın daha verimli.`;
  } else if (my > his && R.ahead) {
    R.ahead = false;
    S.rel.taraf += 5;
    line = `Artık ${R.first}'nin önündesin. Mahallede herkes bunu konuşuyor.`;
  } else
    line =
      his > my
        ? `${R.first} hâlâ bir basamak önde.`
        : my > his
          ? `${R.first}'yi geride bıraktın.`
          : "Aynı seviyedesiniz. Rekabet sürüyor.";
  return `<div class="card"><div class="eyebrow">Rakibin · ${esc(rivalName())}</div><div class="tbl"><table><tr><th></th><th>Sen</th><th>${esc(R.first)}</th></tr><tr><td>Seviye</td><td>${levelName(S.stage)}</td><td>${levelName(R.stage)}</td></tr><tr><td>Takım</td><td>${esc(S.team.short || S.team.name)}</td><td>${esc(R.team.name)}</td></tr><tr><td>Sayı ort.</td><td>${myP}</td><td>${R.ppg}</td></tr><tr><td>Not ort.</td><td>${avg.toFixed(2)}</td><td>${R.avg}</td></tr><tr><td>Genel</td><td>${ovr()}</td><td>${R.ovr}</td></tr></table></div><p class="small">${line}</p></div>`;
}
export function rivalInfo() {
  const R = S.rival;
  return `<div class="card"><div class="eyebrow">Rakibin · ${esc(rivalName())}</div><div class="kv"><span>Takım</span><b>${esc(R.team.name)}</b><span>Seviye</span><b>${levelName(R.stage)}</b><span>Genel</span><b>${R.ovr}</b><span>Geçen sezon</span><b>${R.ppg} sayı · not ${R.avg}</b></div>${
    R.hist.length
      ? `<div class="tbl"><table><tr><th>Yaş</th><th>Takım</th><th>Sayı</th><th>Not</th></tr>${R.hist
          .slice(-6)
          .reverse()
          .map(h => `<tr><td>${h.age}</td><td>${esc(h.team)}</td><td>${h.ppg}</td><td>${h.avg}</td></tr>`)
          .join("")}</table></div>`
      : ""
  }</div>`;
}
export const isDerby = opp => !!(S.rival && opp && S.rival.team && opp.key === S.rival.team.key);
export function derbyResult(win) {
  const R = S.rival,
    rp = Math.max(0, Math.round(R.ppg * rnd(0.55, 1.45)));
  const beat = M.pts > rp,
    txt = `${R.first} ${rp} sayıda kaldı, sen ${M.pts} attın.`;
  if (win && beat) {
    S.rel.taraf += 6;
    S.followers = Math.round(S.followers * 1.04);
    S.moral += 6;
    news(`Derbide gecenin adamı ${fullName()}: ${M.pts} sayı. ${rivalName()} ${rp} sayıda kaldı.`);
  } else if (!win && !beat) {
    S.moral -= 4;
    news(`${rivalName()} derbide ${rp} sayıyla öne çıktı.`);
  }
  return {
    rp,
    txt: win && beat ? `${txt} Derbi senin.` : !win && !beat ? `${R.first} ${rp} sayı attı, sen ${M.pts}. Bu derbi onun.` : txt
  };
}

/* ================= KOÇUN GÜVENİ: SEZON İÇİ ROL ================= */
export function roleReview() {
  if (!isPro(S.stage) || S.phase !== "regular" || ![5, 9, 13].includes(S.week)) return false;
  const last = rated().slice(-4);
  if (last.length < 3) return false;
  const rec = last.reduce((a, r) => a + r.rating, 0) / last.length,
    trust = S.rel.koc + (rec - 6.5) * 14 + dominance() * 1.2;
  const order = ["bench", "rot", "star"],
    i = order.indexOf(S.role);
  let to = null,
    why = "";
  if (i < 2 && trust >= (i === 0 ? 58 : 70) && rec >= (i === 0 ? 6.7 : 7.2) && dominance() >= (i === 0 ? -8 : 0)) {
    to = order[i + 1];
    why =
      i === 0
        ? `"Son maçlarda bana başka seçenek bırakmadın. Rotasyondasın."`
        : `"Bu takımın ilk beşinde olmayı hak ediyorsun. Yarından itibaren başlıyorsun."`;
  } else if (i > 0 && (trust < (i === 2 ? 34 : 24) || rec < (i === 2 ? 5.8 : 5.4))) {
    to = order[i - 1];
    why =
      i === 2
        ? `"Son maçlar iyi değil. Bir süre kenardan başlayacaksın, kendini topla."`
        : `"Süre kazanmak istiyorsan antrenmanda göster. Şimdilik yedeksin."`;
  }
  if (!to) return false;
  const up = order.indexOf(to) > i;
  S.role = to;
  S.moral += up ? 8 : -8;
  news(`${S.team.short}: ${fullName()} ${up ? "terfi etti" : "rol kaybetti"} (${ROLE_N[to]}).`);
  save();
  late.sfx(up ? "levelup" : "lose");
  sheet(
    up ? "Rolün büyüdü" : "Rolün küçüldü",
    `${S.npc.coach} · Koç`,
    `<div class="who"><div id="rcp"></div><div class="say">${why}</div></div><div class="kv"><span>Yeni rolün</span><b class="${up ? "good" : "bad"}">${ROLE_N[to]}</b><span>Son 4 maç not ortalaman</span><b>${rec.toFixed(2)}</b><span>Koçla ilişki</span><b>${S.rel.koc}</b></div><p class="small muted">Rol, maçta sahada kalacağın süreyi ve kritik an sayısını belirler. Koç her 4 haftada bir değerlendirir.</p><button class="btn pri" id="rok">Devam</button>`,
    { noClose: true }
  );
  const cl = LK.coach();
  cl[1].mood = up ? "mutlu" : "kizgin";
  $("#rcp").appendChild(portrait(cl[0], cl[1]));
  $("#rok").onclick = () => closeSheet();
  return true;
}

/* ================= BASIN TOPLANTISI ================= */
export function pressDue(win) {
  if (M.rating == null || (M.auto && !isDerby(M.opp))) return false;
  if (isDerby(M.opp) || S.phase !== "regular") return true;
  if (M.rating >= 8.3 || M.rating <= 4.5) return S.stage !== "lise" || coin(0.5);
  return isPro(S.stage) && coin(0.18);
}
export function pressFollowUp(win) {
  const p = S.press;
  if (!p || M.rating == null) return "";
  S.press = null;
  if (p.tone === "bold") {
    if (win) {
      S.rel.taraf += 4;
      S.followers = Math.round(S.followers * 1.02);
      return `Geçen hafta "${p.quote}" demiştin. Sözünün arkasında durdun.`;
    }
    S.moral -= 6;
    S.rel.taraf -= 4;
    return `Geçen haftaki "${p.quote}" sözlerin bu mağlubiyetten sonra sosyal medyada sana hatırlatıldı.`;
  }
  if (p.tone === "humble" && win) {
    S.rel.takim += 2;
    return "";
  }
  return "";
}
export function pressConference(win, after) {
  const derby = isDerby(M.opp),
    R = S.rival,
    j = S.npc.journalist,
    dr = derby ? derbyResult(win) : null;
  const q = derby
    ? `Derbide ${dr.txt} ${R.first} hakkında ne söylersin?`
    : S.phase !== "regular"
      ? win
        ? "Seriyi öne geçirdiniz. Bir sonraki maç için mesajın?"
        : "Kritik bir maçı kaybettiniz. Taraftara ne söylersin?"
      : M.rating >= 8.3
        ? `${M.pts} sayıyla gecenin adamıydın. Bu performansın sırrı ne?`
        : M.rating <= 4.5
          ? "Bu akşam işler yolunda gitmedi. Sence ne oldu?"
          : win
            ? "İyi bir galibiyet. Takımın gidişatını nasıl görüyorsun?"
            : "Zor bir mağlubiyet. Kafanda neler var?";
  const A = derby
    ? [
        ["humble", `"${R.first} iyi oyuncu, ona saygım var. Bugün takım kazandı."`],
        ["confident", '"Sahada konuştuk, gerisine gerek yok."'],
        ["bold", `"Bu şehirde tek bir ${S.pos} var, o da benim."`]
      ]
    : win
      ? [
          ["humble", '"Takım arkadaşlarım olmasa bunların hiçbiri olmazdı."'],
          ["confident", '"Daha yeni başlıyoruz. Bu seviyede oynamaya devam edeceğim."'],
          ["bold", '"Bizi kimse durduramaz. Sıradaki rakip de hazırlansın."']
        ]
      : [
          ["humble", '"Sorumluluk bende. Antrenmanda telafi edeceğim."'],
          ["confident", '"Kötü bir gece. Bir sonraki maçta herkes farkı görecek."'],
          ["bold", '"Hakem kararları maçı belirledi, bunu herkes gördü."']
        ];
  sheet(
    "Basın toplantısı",
    `${M.opp.name} maçı sonrası`,
    `<div class="who"><div id="pcp"></div><div><div class="eyebrow">${esc(j)} · Spor muhabiri</div><div class="say">"${q}"</div></div></div><div class="choices" id="pch">${A.map(([k, t]) => `<button class="choice" data-press="${k}"><span class="ct" style="font-size:1rem;text-transform:none;letter-spacing:0">${esc(t)}</span><span class="cd">${{ humble: "Mütevazı · koç ve takım sever", confident: "Özgüvenli · dengeli", bold: "İddialı · taraftar coşar, koç hoşlanmaz, sözünü tutman gerekir" }[k]}</span></button>`).join("")}</div>`,
    { noClose: true }
  );
  const pl = LK.press();
  $("#pcp").appendChild(portrait(pl[0], pl[1]));
  $$("[data-press]").forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.press,
          quote = A.find(a => a[0] === k)[1].replace(/"/g, "");
        let out;
        if (k === "humble") {
          S.rel.koc += 3;
          S.rel.takim += 4;
          S.rel.taraf += 1;
          out = "Soyunma odasında sözlerin takdirle karşılandı.";
        } else if (k === "confident") {
          S.rel.taraf += 4;
          S.followers = Math.round(S.followers * 1.02);
          S.moral += 2;
          out = "Net ve kendinden emin bir duruş. Takipçilerin arttı.";
        } else {
          S.rel.taraf += 8;
          S.followers = Math.round(S.followers * 1.05);
          S.rel.koc -= 4;
          S.rel.takim -= 2;
          if (!win && !derby) S.money -= Math.round((S.wage || 10) * 0.5);
          out =
            !win && !derby
              ? "Federasyon hakem eleştirisi için para cezası kesti. Taraftar arkanda ama koç memnun değil."
              : "Manşetlerdesin. Koç sözlerinden hoşlanmadı; bir sonraki maçta herkes seni izleyecek.";
          S.press = { tone: "bold", quote: quote.length > 60 ? quote.slice(0, 57) + "…" : quote };
        }
        if (k === "humble") S.press = { tone: "humble", quote };
        norm();
        save();
        $("#pch").innerHTML =
          `<div class="say" style="border-left-color:var(--warn)">${out}</div><button class="btn pri" id="pok">Devam</button>`;
        $("#pok").onclick = () => {
          closeSheet();
          after();
        };
      })
  );
}

/* ================= HİKÂYE ZİNCİRLERİ ================= */
export function arcSheet(title, who, look, text, choices, after) {
  sheet(
    title,
    who,
    `<div class="who"><div id="ap"></div><div class="say">${text}</div></div><div class="choices" id="ach">${choices.map((c, i) => `<button class="choice" data-arc="${i}"><span class="ct" style="font-size:1.02rem">${c.t}</span>${c.d ? `<span class="cd">${c.d}</span>` : ""}</button>`).join("")}</div>`,
    { noClose: true }
  );
  $("#ap").appendChild(portrait(look[0], look[1]));
  $$("[data-arc]").forEach(
    b =>
      (b.onclick = () => {
        const out = choices[+b.dataset.arc].do();
        norm();
        save();
        $("#ach").innerHTML =
          `<div class="say" style="border-left-color:var(--warn)">${out}</div><button class="btn pri" id="aok">Devam</button>`;
        $("#aok").onclick = () => {
          closeSheet();
          after && after();
        };
      })
  );
}
export const msg = (title, who, look, text) =>
  arcSheet(title, who, look, text, [{ t: "Devam", do: () => "Hikâye devam ediyor." }]);
export function migrateStory() {
  S.arcs = S.arcs || {};
  S.arcQ = S.arcQ || [];
  if (!S.rival && S.league && S.team) {
    S.rival = makeRival();
    S.npc.rival = rivalName();
  }
}
export function storyTick() {
  const A = S.arcs;
  // kuyruktaki tek seferlik anlar
  if (S.arcQ.length) {
    const id = S.arcQ.shift();
    if (ARC_ONCE[id]) {
      ARC_ONCE[id]();
      return true;
    }
  }
  for (const id of Object.keys(ARCS)) {
    const a = ARCS[id],
      st = A[id];
    if (st && st.season === S.season && st.next && S.week >= st.next) {
      const f = a.steps[st.step];
      st.step++;
      st.next = a.gaps && a.gaps[st.step] ? S.week + a.gaps[st.step] : 0;
      f(st);
      return true;
    }
    if ((!st || (a.repeat && st.season !== S.season)) && a.when() && coin(a.p)) {
      A[id] = { season: S.season, step: 1, next: a.gaps ? S.week + a.gaps[1] : 0, choice: null };
      a.steps[0](A[id]);
      return true;
    }
  }
  return false;
}
export const ARCS = {
  // Transfer söylentisi: menajer, üst seviyeden bir kulübün seni izlediğini söyler
  rumor: {
    repeat: true,
    p: 0.5,
    gaps: [0, 4],
    when: () =>
      isPro(S.stage) &&
      S.stage !== "nba" &&
      S.week === 6 &&
      S.phase === "regular" &&
      rated().length >= 4 &&
      seasonAvg() >= 7 &&
      !(S.arcs.rumor && S.arcs.rumor.season >= S.season - 1),
    steps: [
      a => {
        const nx = ORDER[ORDER.indexOf(S.stage) + 1],
          cc = nx === "nba" ? "US" : coin(0.4) ? "TR" : pick(EU_CC),
          t = pick(leaguePool(nx, cc));
        a.club = t.key;
        a.stage = nx;
        a.cc = t.cc;
        arcSheet(
          "Transfer söylentisi",
          `${S.npc.agent} · Menajer`,
          LK.agent(),
          `"Kimseye söyleme ama ${esc(t.name)} seni izliyor. ${levelName(nx)}. Gazeteciler kokusunu aldı bile. Nasıl oynayalım?"`,
          [
            {
              t: "Söylentileri kapat, sezona odaklan",
              d: "Koç ve takım memnun olur. İyi oynarsan teklif yine gelir.",
              do: () => {
                a.choice = "focus";
                S.rel.koc += 6;
                S.rel.takim += 3;
                return "Açıklaman net oldu: aklın sadece bu sezonda. Koç antrenmanda sana göz kırptı.";
              }
            },
            {
              t: "Kapıyı aralık bırak",
              d: "Teklif garantilenir, ama koç ve taraftar soğur.",
              do: () => {
                a.choice = "open";
                S.rel.koc -= 6;
                S.rel.taraf -= 4;
                return `"${esc(t.name)} büyük kulüp, saygı duyarım" dedin. Manşetler hazır, tribün biraz bozuldu.`;
              }
            },
            {
              t: '"Kulübümde mutluyum" de',
              d: "Taraftar sever, sezon sonu kulübün daha iyi bir yenileme teklif eder.",
              do: () => {
                a.choice = "loyal";
                S.rel.taraf += 8;
                S.rel.koc += 4;
                return "Formanın armasını öptün. Taraftar adını tezahürat yaptı.";
              }
            }
          ],
          () => {}
        );
      },
      a => {
        const t = teamByKey(a.club),
          rank = standings().findIndex(r => r.key === S.team.key) + 1;
        if (a.choice === "open" && rank > 4) {
          S.moral -= 6;
          S.rel.taraf -= 5;
          msg(
            "Tribünden ıslık",
            "Gazete manşeti",
            LK.press(),
            `Takım ${rank}. sırada ve tribün, "${t ? esc(t.name) : "o kulüp"}" sözlerini unutmadı. Isınmada ıslıklandın.`
          );
        } else if (a.choice === "focus") {
          S.moral += 4;
          msg(
            "Odak işe yaradı",
            "Gazete manşeti",
            LK.press(),
            `Gazeteler artık söylentiyi değil performansını yazıyor. ${t ? esc(t.name) + " gözlemcisi tribündeydi." : ""}`
          );
        } else if (a.choice === "loyal") {
          S.moral += 3;
          msg(
            "Taraftarın sevgilisi",
            "Gazete manşeti",
            LK.press(),
            'Kulüp başkanı, "Bu çocuk bizim değerimiz" dedi. Sezon sonu masada daha iyi bir yenileme olacak.'
          );
        } else msg("Söylenti sürüyor", "Gazete manşeti", LK.press(), "Spor programları her akşam transferini konuşuyor.");
      }
    ]
  },
  // Aile meselesi: babanın dükkânı zor durumda
  family: {
    p: 0.35,
    gaps: [0, 4],
    when: () => isPro(S.stage) && S.age >= 19 && S.age <= 27 && S.week === 4 && S.phase === "regular" && !S.arcs.family,
    steps: [
      a => {
        const cost = Math.max(60, Math.round((S.wage || 40) * 3));
        a.cost = cost;
        arcSheet(
          "Evden telefon",
          `${S.npc.mom} · Annen`,
          LK.mom(),
          `"Oğlum, babana söyleme ben aradım. Dükkân üç aydır kirayı ödeyemiyor. ${S.npc.dad} gururundan sana bir şey demez ama çok üzgün."`,
          [
            {
              t: `Parayı gönder (₺${fmt(cost)})`,
              d: "Aile ilişkin güçlenir.",
              do: () => {
                a.choice = "pay";
                tx("Aileye destek", -cost);
                S.rel.aile += 15;
                S.moral += 4;
                return 'Havaleyi yaptın. Annen telefonda ağladı, baban "gerek yoktu" diye mesaj attı. Sonra bir kalp ekledi.';
              }
            },
            {
              t: "Babanı ara, birlikte çözüm bul",
              d: "Para gitmez ama çözüm de garanti değil.",
              do: () => {
                a.choice = "advice";
                S.rel.aile -= 4;
                return 'Baban seni dinledi, "kendim hallederim" dedi. Sesi biraz kırgındı.';
              }
            },
            {
              t: "Hafta sonu eve git",
              d: "Aile çok sevinir ama bir antrenmanı kaçırırsın.",
              do: () => {
                a.choice = "visit";
                S.energy -= 20;
                S.rel.aile += 20;
                S.rel.koc -= 4;
                return "Sabah ilk uçakla eve gittin. Dükkânda bütün gün birlikte oturdunuz. Koç antrenmana gelmediğin için not aldı.";
              }
            }
          ],
          () => {}
        );
      },
      a => {
        if (a.choice === "pay") {
          S.rel.taraf += 3;
          S.moral += 4;
          msg(
            "Dükkân kurtuldu",
            `${S.npc.dad} · Baban`,
            LK.dad(),
            '"Dükkânın camına formanı astım. Müşteriler artık ekmek almaya değil, seni konuşmaya geliyor."'
          );
        } else if (a.choice === "advice") {
          S.rel.aile += 4;
          msg(
            "Yeni bir başlangıç",
            `${S.npc.dad} · Baban`,
            LK.dad(),
            '"Dükkânı devrettim, taksiye başladım. Valla daha keyifli, bütün İstanbul\'a senin maçlarını anlatıyorum."'
          );
        } else {
          S.rel.aile += 6;
          S.moral += 3;
          msg(
            "Birlikte plan yaptınız",
            `${S.npc.mom} · Annen`,
            LK.mom(),
            '"Baban dükkâna internet satışı ekledi. Ürünlerin yanına senin imzalı fotoğrafını koymuş, satışlar arttı!"'
          );
        }
      }
    ]
  },
  // Lise kaptanlığı (ikinci lise yılı)
  captain: {
    p: 1,
    when: () => S.stage === "lise" && S.stageSeason === 2 && S.week === 2 && !S.arcs.captain,
    steps: [
      a =>
        arcSheet(
          "Kaptanlık teklifi",
          `${S.npc.coach} · Koç`,
          LK.coach(),
          `"Bu sene takımın kaptanı olmanı istiyorum. Pazubendi takarsan sorumluluk da senin. Ne dersin?"`,
          [
            {
              t: "Kaptanlığı kabul et",
              d: "Takım sana bağlanır; kötü serilerde baskı da sende olur.",
              do: () => {
                a.choice = "yes";
                S.rel.takim += 8;
                S.rel.koc += 4;
                S.captain = true;
                return "Pazubendini taktın. Antrenman sonrası ilk konuşmanı yaptın; sesin biraz titredi ama herkes alkışladı.";
              }
            },
            {
              t: "Henüz hazır değilim",
              d: "Koç biraz bozulur ama baskı yok.",
              do: () => {
                a.choice = "no";
                S.rel.koc -= 3;
                return 'Koç "Peki, ama gözüm üzerinde" dedi. Kaptanlık kıdemli oyuncuya gitti.';
              }
            }
          ],
          () => {}
        )
    ]
  },
  // Üniversite final haftası
  finals: {
    repeat: true,
    p: 1,
    when: () =>
      S.stage === "uni" &&
      S.studying &&
      S.week === 11 &&
      S.phase === "regular" &&
      !(S.arcs.finals && S.arcs.finals.season === S.season),
    steps: [
      a =>
        arcSheet(
          "Final haftası",
          "Çınaraltı kampüsü",
          LK.friend(),
          `Finaller bu hafta. Aynı hafta da kritik bir deplasman maçı var. Akademik puanın: ${S.aka}.`,
          [
            {
              t: "Kütüphaneye kapan",
              d: "+15 akademik, -15 enerji",
              do: () => {
                S.aka += 15;
                S.energy -= 15;
                return "Üç gece kütüphanede sabahladın. Hocalardan biri kapıda imza istedi.";
              }
            },
            {
              t: "Basketbola odaklan",
              d: "-10 akademik, sonraki 2 antrenman daha verimli",
              do: () => {
                S.aka -= 10;
                S.buffs.train = (S.buffs.train || 0) + 2;
                return "Ders notlarını arkadaşından aldın. Salonda ışıkları sen kapattın.";
              }
            },
            {
              t: "İkisini dengele",
              d: "+6 akademik, -6 enerji",
              do: () => {
                S.aka += 6;
                S.energy -= 6;
                return "Gündüz ders, akşam antrenman. Yorucu ama idare ettin.";
              }
            }
          ],
          () => {}
        )
    ]
  }
};
// Tek seferlik kuyruk anları
export const ARC_ONCE = {
  comeback: () =>
    arcSheet(
      "Sahalara dönüş",
      `${S.npc.coach} · Koç`,
      LK.coach(),
      "Doktor sahalara dönebileceğini söyledi. Koç ve fizyoterapist dönüş planını konuşmak istiyor.",
      [
        {
          t: "Yavaş dön, doktoru dinle",
          d: "6 hafta boyunca sakatlık riskin yarıya iner.",
          do: () => {
            S.buffs.injWk = 6;
            S.buffs.injMul = 0.5;
            S.energy += 10;
            S.rel.koc += 2;
            return 'Planlı bir dönüş. Fizyoterapist gülümseyerek "akıllı oyuncu" dedi.';
          }
        },
        {
          t: "Hemen tam yükle sahaya",
          d: "+6 moral, ama 5 hafta boyunca sakatlık riskin artar.",
          do: () => {
            S.buffs.injWk = 5;
            S.buffs.injMul = 1.8;
            S.moral += 6;
            S.rel.taraf += 3;
            return "Isınmaya koşarak çıktın. Tribün adını bağırdı. Doktor kenarda başını salladı.";
          }
        }
      ],
      () => {}
    )
};

/* ---- Mevcut akışa bağlantılar (olay sistemi üzerinden) ---- */
Bus.on("week:start", () => {
  if (S.buffs.injWk > 0) S.buffs.injWk--;
});
Bus.offer("week:sheet", roleReview, 20);
Bus.offer("week:sheet", storyTick, 30);
// Uzun sakatlık bitince dönüş hikâyesi
Bus.on("injury:healed", inj => {
  if ((inj.total || 0) >= 3) S.arcQ.push("comeback");
});
// Maç sonrası: önceki basın sözlerinin karşılığı ve yeni basın toplantısı
Bus.use("match:after", (ctx, next) => {
  const win = ctx.win,
    fu = pressFollowUp(win);
  if (fu) {
    news(fu);
    toast(fu);
  }
  if (pressDue(win)) return pressConference(win, next);
  if (isDerby(M.opp) && M.rating != null) {
    const d = derbyResult(win);
    toast(d.txt);
  }
  next();
});
// Sezon sonu teklifleri: transfer söylentisinin sonucu
export function storyOffers(offers) {
  const a = S.arcs && S.arcs.rumor;
  if (!a || a.season !== S.season - 1 || a.done) return offers;
  a.done = true;
  const t = teamByKey(a.club);
  if (!t) return offers;
  const avg = seasonAvgOf();
  if (a.choice === "loyal") {
    const s = offers.find(o => o.stay);
    if (s) {
      s.wage = Math.round(s.wage * 1.15);
      s.note = "Sadakat yenilemesi · +%15";
    }
    return offers;
  }
  // söylenti teklifi de normal teklif eşiklerine tabidir (potansiyel, not, NBA yaş sınırı)
  const P = potential(avg, false),
    gate =
      P >= (BAL.need[a.stage] || 0) - 3 &&
      (a.stage !== "nba" || (S.age <= 29 && avg >= 6.8)) &&
      (a.stage !== "euro" || avg >= 6.6);
  if (gate && (a.choice === "open" || (a.choice === "focus" && avg >= 7))) {
    const role = roleAt(ovr(), a.stage, t.cc);
    if (!offers.some(o => o.team.key === t.key))
      offers.push({
        team: t,
        stage: a.stage,
        role: role === "bench" ? "bench" : "rot",
        wage: Math.round(WAGE[a.stage] * ((LEAGUES[t.cc] || LEAGUES.TR).pr || 1) * (a.choice === "open" ? 1.2 : 1.1)),
        years: 2,
        note: `${levelName(a.stage)} · söylenti gerçek oldu`
      });
  }
  return offers;
}
// Maç sekmesine derbi uyarısı
export function derbyNote(opp) {
  return isDerby(opp)
    ? `<div class="say" style="border-left-color:var(--bad)"><b>Derbi:</b> Rakibin ${esc(rivalName())} karşı takımda. Bu maçın sonu basın toplantısıyla bitecek.</div>`
    : "";
}
