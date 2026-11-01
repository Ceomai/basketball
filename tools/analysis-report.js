// tests/analysis.js çıktısını özetler: node tools/analysis-report.js reklam.json [ozellik.json]
// Gerçek süre modeli (ölçüm + varsayım, docs/ANALIZ.md):
//   hızlı oyuncu : hafta = 3,5 dokunuş × 2 sn + olay/basın/zincir okuma 8 sn; maç simüle
//   elle oyuncu  : hafta = 3 etkinlik × 25 sn + maç (önemli anlar akışı 13 sn + an başına 10 sn) + 10 sn maç sonu
//   sezon sonu   : 45 sn (ödüller, teklifler, pazarlık, bölüm ekranı)
//   ödüllü reklam: 32 sn (AdMob 15-30 sn + dokunuş); geçiş reklamı 8 sn, en az 4 dakika arayla
const fs = require("fs");
const [A, B] = process.argv.slice(2).map(f => (f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null));
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (a, f) => (a.length ? Math.round((a.filter(f).length / a.length) * 100) : 0);
const r1 = x => Math.round(x * 10) / 10;
const ORDER = ["lise", "uni", "t3", "t2", "t1", "euro", "nba"];
const ovrAt = (c, age) => {
  const s = c.seasons.find(x => x.age >= age);
  return s ? s.ovr : c.seasons.length ? c.seasons[c.seasons.length - 1].ovr : 0;
};
const firstAge = (c, st) => {
  const s = c.seasons.find(x => ORDER.indexOf(x.stage) >= ORDER.indexOf(st));
  return s ? s.age : null;
};
const adsOf = c => Object.values(c.ads || {}).reduce((a, b) => a + b, 0);
const events = c =>
  Object.values(c.events || {}).reduce((a, b) => a + b, 0) + Object.values(c.press || {}).reduce((a, b) => a + b, 0);
function minutes(c, style) {
  const weeks = c.weeks,
    seasons = c.seasons.length,
    mpm = c.matches ? c.momentsN / c.matches : 6;
  const week = style === "hizli" ? 3.5 * 2 : 75 + 13 + mpm * 10 + 10;
  const play = weeks * week + events(c) * 8 + seasons * 45;
  const inter = style === "hizli" ? play / 240 : c.matches / 3; // 4 dk sınırı / 3 maçta bir
  return { play: play / 60, ads: (adsOf(c) * 32 + inter * 8) / 60, inter: Math.round(inter) };
}
const out = [];
const log = s => out.push(s);
function table(rows) {
  if (!rows.length) return log("(veri yok)\n");
  const keys = Object.keys(rows[0]);
  log("| " + keys.join(" | ") + " |");
  log("|" + keys.map(() => "---").join("|") + "|");
  for (const r of rows) log("| " + keys.map(k => r[k]).join(" | ") + " |");
  log("");
}
if (A) {
  const bad = A.filter(c => c.timeout || c.stuck || c.err || (c.pageErrs && c.pageErrs.length));
  log(`## Reklam grubu: ${A.length} kariyer (+${A.filter(c => c.heirRec).length} oğul kariyeri), sorunlu: ${bad.length}`);
  for (const c of bad)
    log(
      `- ${c.profile}/${c.ad}: ${c.timeout ? "zaman aşımı " : ""}${c.stuck || ""} ${c.err || ""} ${(c.pageErrs || []).slice(0, 2).join(" | ")}`
    );
  log("");
  log("### İlerleme ve reklam");
  const rows = [];
  for (const pr of ["weak", "avg", "strong"])
    for (const ad of ["yok", "gunluk", "tam", "hizli", "elle", "normal", "efsane"]) {
      const g = A.filter(c => c.profile === pr && c.ad === ad);
      if (!g.length) continue;
      const fast = g.map(c => minutes(c, "hizli")),
        man = g.map(c => minutes(c, "elle"));
      rows.push({
        profil: pr,
        reklam: ad,
        n: g.length,
        emeklilik: r1(avg(g.map(c => c.retired || 0))),
        "NBA %": pct(g, c => c.seasons.some(s => s.stage === "nba")),
        "ovr 22/26/30": [22, 26, 30].map(a => Math.round(avg(g.map(c => ovrAt(c, a))))).join("/"),
        "1. lig yaşı": r1(avg(g.map(c => firstAge(c, "t1")).filter(Boolean))),
        "son para (bin)": Math.round(avg(g.map(c => c.final.money)) / 25),
        "ödüllü rek.": Math.round(avg(g.map(adsOf))),
        "rek. parası %": Math.round(
          avg(
            g.map(
              c =>
                (c.adMoney /
                  Math.max(
                    1,
                    c.seasons.reduce((a, s) => a + s.wage * 15, 0)
                  )) *
                100
            )
          )
        ),
        miras: Math.round(avg(g.map(c => c.legacy))),
        "hızlı sa (oyun+rek)": `${r1(avg(fast.map(m => m.play)) / 60)}+${r1(avg(fast.map(m => m.ads)) / 60)}`,
        "elle sa (oyun+rek)": `${r1(avg(man.map(m => m.play)) / 60)}+${r1(avg(man.map(m => m.ads)) / 60)}`
      });
    }
  table(rows);
  log("### Reklam kullanımı (kariyer başına, tür)");
  const kinds = ["double", "halftime", "energy", "heal"];
  table(
    ["gunluk", "tam", "hizli", "elle"]
      .filter(ad => A.some(c => c.ad === ad))
      .map(ad => {
        const g = A.filter(c => c.ad === ad);
        return Object.fromEntries([["reklam", ad], ...kinds.map(k => [k, Math.round(avg(g.map(c => (c.ads || {})[k] || 0)))])]);
      })
  );
  log("### Emeklilik sonrası ve Şöhretler Müzesi");
  const tiers = {};
  for (const c of A) tiers[`${c.tierBeforeEp} → ${c.hof}`] = (tiers[`${c.tierBeforeEp} → ${c.hof}`] || 0) + 1;
  log(
    `Son bölüm seçenekleri: ${JSON.stringify(A.reduce((m, c) => ((m[(c.epOptions || []).join("+")] = (m[(c.epOptions || []).join("+")] || 0) + 1), m), {}))}`
  );
  log(`Seçilen: ${JSON.stringify(A.reduce((m, c) => ((m[c.epilogue] = (m[c.epilogue] || 0) + 1), m), {}))}`);
  log(`Kademe değişimi (son bölüm öncesi → sonrası): ${JSON.stringify(tiers)}`);
  log("");
  log("### Oğul kariyeri (baba ile karşılaştırma)");
  const H = A.filter(c => c.heirRec);
  table(
    ["weak", "avg", "strong"]
      .map(pr => {
        const g = H.filter(c => c.profile === pr);
        if (!g.length) return null;
        const h = g.map(c => c.heirRec);
        return {
          profil: pr,
          n: g.length,
          bonus: r1(avg(h.map(x => x.heir.bonus))),
          "başlangıç ovr": Math.round(avg(h.map(x => x.heir.startOvr))),
          "miras parası (bin)": Math.round(avg(h.map(x => x.heir.money)) / 25),
          "baba NBA %": pct(g, c => c.seasons.some(s => s.stage === "nba")),
          "oğul NBA %": pct(h, c => c.seasons.some(s => s.stage === "nba")),
          "baba ovr26": Math.round(avg(g.map(c => ovrAt(c, 26)))),
          "oğul ovr26": Math.round(avg(h.map(c => ovrAt(c, 26)))),
          "baba miras": Math.round(avg(g.map(c => c.legacy))),
          "oğul miras": Math.round(avg(h.map(c => c.legacy))),
          "oğul sorun": h.filter(x => x.stuck || x.err || x.timeout).length
        };
      })
      .filter(Boolean)
  );
}
const ALL = [...(A || []), ...(A || []).map(c => c.heirRec).filter(Boolean), ...(B || [])];
if (ALL.length) {
  log("### Maç anları (tüm kariyerler)");
  const M = {};
  let matches = 0;
  for (const c of ALL) {
    matches += c.matches || 0;
    for (const [id, m] of Object.entries(c.moments || {})) {
      const t = (M[id] = M[id] || { n: 0, good: 0, picks: {} });
      t.n += m.n;
      t.good += m.good;
      for (const [k, v] of Object.entries(m.picks)) t.picks[k] = (t.picks[k] || 0) + v;
    }
  }
  table(
    Object.entries(M).map(([id, m]) => ({
      an: id,
      "maç başına": (m.n / matches).toFixed(2),
      "başarı %": Math.round((m.good / m.n) * 100),
      seçimler: Object.entries(m.picks)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${Math.round((v / m.n) * 100)}%`)
        .join(", ")
    }))
  );
  log(`Maç başına toplam karar anı: ${(ALL.reduce((a, c) => a + (c.momentsN || 0), 0) / matches).toFixed(1)}`);
  log("");
  log("### Koç sistemi uyumu (sezon başına)");
  const fits = ALL.flatMap(c => c.seasons.filter(s => s.fit != null && ORDER.indexOf(s.stage) >= 2));
  const dist = {};
  for (const s of fits) dist[s.fit] = (dist[s.fit] || 0) + 1;
  log(`Dağılım: ${JSON.stringify(dist)}`);
  const byFit = f => fits.filter(f);
  for (const [lab, f] of [
    ["uyum ≤ -2", s => s.fit <= -2],
    ["-1..1", s => s.fit > -2 && s.fit < 2],
    ["uyum ≥ 2", s => s.fit >= 2]
  ]) {
    const g = byFit(f);
    log(
      `- ${lab}: ${g.length} sezon, ortalama not ${avg(g.map(s => s.avg)).toFixed(2)}, ilk beş %${pct(g, s => s.role === "star")}, dk/maç ${avg(g.map(s => s.mpg)).toFixed(1)}`
    );
  }
  log("");
  log("### Fesih bedeli");
  const C = ALL.filter(c => c.fees);
  const fees = C.flatMap(c => c.fees);
  const earned = C.reduce((a, c) => a + c.seasons.reduce((x, s) => x + s.wage * 15, 0), 0);
  log(
    `Kariyer başına ${r1(fees.length / C.length)} bedelli transfer; toplam bedel kariyer maaşının %${r1((fees.reduce((a, f) => a + f.fee, 0) / earned) * 100)}'i. Aynı lige yatay geçiş: %${pct(fees, f => f.from === f.to)}`
  );
  log("");
}
if (B) {
  log(`## Özellik grubu (ortalama profil): ${B.length} kariyer`);
  table(
    ["denge", "focus"].flatMap(pg =>
      [false, true].map(cl => {
        const g = B.filter(c => c.program === pg && c.clausesMode === cl);
        return {
          program: pg === "focus" ? "pozisyona odaklı" : "dengeli",
          madde: cl ? "ister" : "istemez",
          n: g.length,
          "NBA %": pct(g, c => c.seasons.some(s => s.stage === "nba")),
          "ovr 22/26/30": [22, 26, 30].map(a => Math.round(avg(g.map(c => ovrAt(c, a))))).join("/"),
          "1. lig yaşı": r1(avg(g.map(c => firstAge(c, "t1")).filter(Boolean))),
          uyum: r1(avg(g.flatMap(c => c.seasons.filter(s => ORDER.indexOf(s.stage) >= 2).map(s => s.fit)))),
          "bedelli transfer": r1(avg(g.map(c => c.fees.length))),
          "bedel (bin)": Math.round(avg(g.map(c => c.fees.reduce((a, f) => a + f.fee, 0))) / 25),
          "prim (bin)": Math.round(avg(g.map(c => c.perf)) / 25),
          "madde isteği": r1(avg(g.map(c => c.clauseAsk))),
          "masadan kalkma": r1(avg(g.map(c => c.walkAway || 0))),
          "son para (bin)": Math.round(avg(g.map(c => c.final.money)) / 25)
        };
      })
    )
  );
}
console.log(out.join("\n"));
