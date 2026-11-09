/* ================= LİMAN (PARTNER AŞAMALARI), BORSA, HİPODROM =================
   Liman:
   - Partnerin varsa buluşma: restoran, sinema, yat turu (yat alındıysa). İlişki ve moral; ücret seviyeye göre.
   - Aşamalar: flört → sevgili (ilişki 60+, 4 buluşma) → nişan (yüzükle evlilik teklifi; ilişki 80+, kabul şansı)
     → evli (nişandan 8 hafta sonra düğün) → çocuk (evlilikten sonra her hafta küçük olasılık).
     Sevgili ve sonrası ilişki daha yavaş azalır; evlilik moral tabanını +5, çocuk +3 yükseltir.
   - Bekarsan: sahil yürüyüşü (moral, enerji) ve tanışma şansı.
   Borsa: 4 hisse (teknoloji, enerji, spor giyim, gıda); fiyatlar her hafta değişir (dönemsel eğilim + oynaklık).
     Lot al / hepsini sat; maliyet ve kâr/zarar görünür. Para geç kariyerde de anlam taşır.
   Hipodrom (18+): 6 atlı yarış; oranlar atların gücünden gelir. Bahis seviyeye göre. Haftada bir koç −2.
     Zenginsen kendi yarış atını alırsın: her yarışta koşar, kazanırsa ödül. */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, esc, fmt, pick, rnd } from "./data.js";
import { tok } from "./theme.js";
import { S, app, closeSheet, news, norm, renderMain, resultView, sheet, tx, useSlot, fullName } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
const pm = () => PM[S.stage] || 1;
const wk = () => `${S.season}-${S.week}`;

/* ---- Partner aşamaları ---- */
export const pStage = () => (S && S.partner ? S.pstage || 0 : -1);
const STAGES = ["flort", "sevgili", "nisan", "evli", "cocuk"];
export const partnerBase = () => (pStage() >= 3 ? 5 : 0) + (pStage() >= 4 ? 3 : 0); // moral tabanına (src/lifestyle.js)
Bus.on("week:start", () => {
  if (!S) return;
  if (!S.partner) {
    S.pstage = 0;
    S.dates = 0;
    return;
  }
  const st = S.pstage || 0;
  if (st >= 1) S.rel.partner += st >= 3 ? 2 : 1; // ilişki daha yavaş azalır (endWeek −4)
  if (st === 2 && S.engagedAt && S.week + S.season * 20 - S.engagedAt >= 8) S.weddingReady = true;
  if (st === 3 && Math.random() < 0.03) {
    S.pstage = 4;
    S.rel.aile += 15;
    S.moral += 15;
    news($t("hb.baby", { v: fullName(), p: S.partner }));
  }
  norm();
});
const DATES = [
  { id: "rest", cost: 6, rel: 10, mo: 4 },
  { id: "sinema", cost: 3, rel: 7, mo: 3 },
  { id: "yat", cost: 0, rel: 15, mo: 8, need: () => S.items && S.items.yat }
];
export function locLiman(I) {
  const st = pStage();
  let body;
  if (st < 0) {
    body = `<p class="small">${$t("hb.single")}</p><div class="act"><div><h3>${$t("hb.walk")}</h3><p>${$t("hb.walkD")}</p></div><button class="btn team sm" id="hb-walk" ${S.slot <= 0 ? "disabled" : ""}>${$t("hb.go")}</button></div>`;
  } else {
    const ringCost = Math.round(60 * pm()),
      wedCost = Math.round(150 * pm());
    body = `<div class="card"><div class="row between"><div class="eyebrow">${S.partner} · ${$t(`hb.s.${STAGES[st]}`)}</div><b class="${S.rel.partner >= 60 ? "good" : S.rel.partner < 30 ? "bad" : ""}">${S.rel.partner}/100</b></div><div class="bar"><i style="width:${S.rel.partner}%"></i></div><p class="small muted">${$t(`hb.next.${STAGES[st]}`, { d: S.dates || 0 })}</p></div>
    <div class="eyebrow">${$t("hb.dates")}</div>${DATES.filter(d => !d.need || d.need())
      .map(
        d =>
          `<div class="act"><div><h3>${$t(`hb.d.${d.id}`)}</h3><p>${$t("hb.dateD", { r: d.rel, m: d.mo, v: d.cost ? fmt(Math.round(d.cost * pm())) : $t("hb.free") })}</p></div><button class="btn team sm" data-dt="${d.id}" ${S.slot <= 0 || S.money < Math.round(d.cost * pm()) ? "disabled" : ""}>${$t("hb.go")}</button></div>`
      )
      .join("")}
    ${st === 1 ? `<div class="act"><div><h3>${$t("hb.propose")}</h3><p>${$t("hb.proposeD", { v: fmt(ringCost) })}</p></div><button class="btn good sm" id="hb-prop" ${S.money < ringCost || S.rel.partner < 80 ? "disabled" : ""}>${$t("hb.ask")}</button></div>` : ""}
    ${st === 2 ? `<div class="act"><div><h3>${$t("hb.wedding")}</h3><p>${$t("hb.weddingD", { v: fmt(wedCost) })}</p></div><button class="btn good sm" id="hb-wed" ${!S.weddingReady || S.money < wedCost ? "disabled" : ""}>${$t("hb.marry")}</button></div>` : ""}`;
  }
  sheet(I.n, $t("hb.sub"), body + late.kidHTML());
  const w = $("#hb-walk");
  if (w)
    w.onclick = () => {
      useSlot();
      S.moral += 5;
      S.energy += 5;
      let txt = $t("hb.walkRes");
      if (S.age >= 18 && Math.random() < 0.18 + late.fame() / 400) {
        S.partner = pick(late.cOf(S.city).fem);
        S.rel.partner = 45;
        S.pstage = 0;
        txt = $t("hb.meet", { p: S.partner });
      }
      norm();
      save();
      resultView($t("hb.walk"), txt);
    };
  $$("[data-dt]").forEach(
    b =>
      (b.onclick = () => {
        const d = DATES.find(x => x.id === b.dataset.dt);
        useSlot();
        if (d.cost) tx($t(`hb.d.${d.id}`), -Math.round(d.cost * pm()));
        S.rel.partner += d.rel;
        S.moral += d.mo;
        S.dates = (S.dates || 0) + 1;
        let txt = $t(`hb.r.${d.id}`, { p: S.partner });
        if ((S.pstage || 0) === 0 && S.dates >= 4 && S.rel.partner >= 60) {
          S.pstage = 1;
          txt += ` ${$t("hb.nowLovers", { p: S.partner })}`;
        }
        norm();
        save();
        resultView($t(`hb.d.${d.id}`), txt);
      })
  );
  const pr = $("#hb-prop");
  if (pr)
    pr.onclick = () => {
      tx($t("hb.ring"), -Math.round(60 * pm()));
      const yes = Math.random() < clamp(0.4 + (S.rel.partner - 80) / 40 + partnerBase() / 50, 0.3, 0.95);
      if (yes) {
        S.pstage = 2;
        S.engagedAt = S.week + S.season * 20;
        S.moral += 12;
        news($t("hb.engaged", { v: fullName(), p: S.partner }));
      } else {
        S.rel.partner -= 15;
        S.moral -= 8;
      }
      norm();
      save();
      resultView($t("hb.propose"), yes ? $t("hb.yes", { p: S.partner }) : $t("hb.notYet", { p: S.partner }));
    };
  const wd = $("#hb-wed");
  if (wd)
    wd.onclick = () => {
      tx($t("hb.wedding"), -Math.round(150 * pm()));
      S.pstage = 3;
      S.weddingReady = false;
      S.moral += 20;
      S.rel.aile += 15;
      S.rel.takim += 5;
      news($t("hb.married", { v: fullName(), p: S.partner }));
      norm();
      save();
      resultView($t("hb.wedding"), $t("hb.wedRes", { p: S.partner }));
    };
}

/* ---- Borsa ---- */
const STOCKS = [
  { id: "tek", vol: 0.09, base: 50 },
  { id: "enr", vol: 0.06, base: 30 },
  { id: "spr", vol: 0.07, base: 40 },
  { id: "gda", vol: 0.04, base: 25 }
];
const mk = () => {
  if (!S.mkt2) {
    S.mkt2 = { p: {}, h: {}, own: {}, cost: {}, tr: {} };
    for (const s of STOCKS) {
      S.mkt2.p[s.id] = s.base;
      S.mkt2.h[s.id] = [s.base];
      S.mkt2.tr[s.id] = rnd(-0.01, 0.02);
    }
  }
  return S.mkt2;
};
Bus.on("week:start", () => {
  if (!S || !S.mkt2) return;
  const m = S.mkt2;
  for (const s of STOCKS) {
    if (Math.random() < 0.12) m.tr[s.id] = rnd(-0.03, 0.035); // dönem değişimi
    const ch = m.tr[s.id] + rnd(-s.vol, s.vol);
    m.p[s.id] = Math.max(2, Math.round(m.p[s.id] * (1 + ch) * 100) / 100);
    m.h[s.id] = [...m.h[s.id], m.p[s.id]].slice(-12);
  }
});
const spark = h => {
  const mn = Math.min(...h),
    mx = Math.max(...h),
    w = 60,
    hh = 18;
  const pts = h
    .map(
      (v, i) =>
        `${((i / Math.max(1, h.length - 1)) * w).toFixed(1)},${(hh - ((v - mn) / Math.max(0.01, mx - mn)) * hh).toFixed(1)}`
    )
    .join(" ");
  return `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><polyline points="${pts}" fill="none" style="stroke:var(${h[h.length - 1] >= h[0] ? "--good" : "--bad"})" stroke-width="1.5"/></svg>`;
};
const FEE = 0.01; // alım ve satımda komisyon
const lot = s => Math.max(1, Math.round((15 * pm()) / mk().p[s.id])); // bir lot ≈ 15 × seviye
export function locBorsa(I) {
  const m = mk();
  const value = STOCKS.reduce((a, s) => a + (m.own[s.id] || 0) * m.p[s.id], 0);
  sheet(
    I.n,
    $t("bs.sub"),
    `<div class="card"><div class="kv"><span>${$t("bs.value")}</span><b class="gold">${fmt(Math.round(value))}</b><span>${$t("bs.cash")}</span><b>${fmt(S.money)}</b></div><p class="small muted">${$t("bs.note")}</p></div>${late.borsaExtraHTML()}${STOCKS.map(
      s => {
        const h = m.h[s.id],
          prev = h[h.length - 2] ?? h[0],
          ch = ((m.p[s.id] - prev) / prev) * 100,
          own = m.own[s.id] || 0,
          pl = own ? Math.round(own * m.p[s.id] - (m.cost[s.id] || 0)) : 0;
        return `<div class="act"><div><h3>${$t(`bs.s.${s.id}`)} <span class="${ch >= 0 ? "good" : "bad"}">${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%</span></h3><p>${$t("bs.line", { p: fmt(m.p[s.id]), n: own })}${late.stockInfo(s.id)}${own ? ` · <b class="${pl >= 0 ? "good" : "bad"}">${pl >= 0 ? "+" : ""}${fmt(pl)}</b>` : ""}</p>${spark(h)}</div><div class="grid2 span-all"><button class="btn sm" data-sb="${s.id}" ${S.money < lot(s) * m.p[s.id] * (1 + FEE) ? "disabled" : ""}>${$t("bs.buy", { n: lot(s) })}</button><button class="btn ghost sm" data-ss="${s.id}" ${own ? "" : "disabled"}>${$t("bs.sell")}</button></div></div>`;
      }
    ).join("")}`
  );
  $$("[data-sb]").forEach(
    b =>
      (b.onclick = () => {
        const s = STOCKS.find(x => x.id === b.dataset.sb),
          n = lot(s),
          c = Math.ceil(n * m.p[s.id] * (1 + FEE)); // %1 komisyon (yukarı yuvarlanır)
        if (S.money < c) return;
        tx($t("bs.buyTx", { v: $t(`bs.s.${s.id}`) }), -c);
        m.own[s.id] = (m.own[s.id] || 0) + n;
        m.cost[s.id] = (m.cost[s.id] || 0) + c;
        save();
        locBorsa(I);
      })
  );
  $$("[data-ss]").forEach(
    b =>
      (b.onclick = () => {
        const id = b.dataset.ss,
          v = Math.floor((m.own[id] || 0) * m.p[id] * (1 - FEE)); // %1 komisyon (aşağı yuvarlanır)
        tx($t("bs.sellTx", { v: $t(`bs.s.${id}`) }), v);
        m.own[id] = 0;
        m.cost[id] = 0;
        save();
        locBorsa(I);
      })
  );
}

/* ---- Hipodrom ---- */
// kendi atının haftalık bakımı (ahır, jokey)
Bus.on("week:start", () => {
  if (S && S.horse) tx($t("hp.upkeep"), -Math.round(3 * pm()));
});
const HORSES = ["Rüzgar", "Kara Şimşek", "Yıldız", "Bora", "Gülbahar", "Fırtına", "Poyraz", "Altın Toz"];
const JOCKEYS = ["A. Kaya", "M. Demir", "S. Yıldız", "E. Aksoy", "B. Çelik", "K. Arslan", "T. Öz", "H. Tunç"];
const COATS = ["#6d4c41", "#3e2723", "#8d6e63", "#212121", "#a1887f", "#5d4037", "#795548"];
const SILKS = [
  ["#e53935", "#ffffff"],
  ["#1e88e5", "#ffeb3b"],
  ["#43a047", "#ffffff"],
  ["#fdd835", "#212121"],
  ["#8e24aa", "#ffffff"],
  ["#fb8c00", "#1a237e"],
  ["#00acc1", "#ffffff"]
];
const formOf = s =>
  Array.from({ length: 5 }, () => Math.max(1, Math.min(9, Math.round(rnd(1, 7) / s)))).join("-"); // güçlü atın formu daha iyi
const raceField = () => {
  const own = S.horse ? [{ n: S.horse.n, s: S.horse.s, mine: true }] : [];
  const others = HORSES.filter(h => !own.some(o => o.n === h))
    .sort(() => Math.random() - 0.5)
    .slice(0, 6 - own.length)
    .map(n => ({ n, s: rnd(0.7, 1.3) }));
  const f = [...own, ...others];
  const tot = f.reduce((a, h) => a + h.s, 0);
  const jk = JOCKEYS.slice().sort(() => Math.random() - 0.5);
  return f.map((h, i) => ({
    ...h,
    no: i + 1,
    jockey: jk[i],
    coat: pick(COATS),
    silk: h.mine ? [S.team.c1, S.team.c2] : SILKS[i % SILKS.length],
    form: formOf(h.s),
    odds: Math.max(1.3, Math.round((tot / h.s) * 0.85 * 10) / 10)
  }));
};
// ilk 3 bahsi: oranın yaklaşık üçte biri (beklenen dönüş kazanan bahsiyle benzer, kasa önde)
const placeOdds = h => Math.max(1.1, Math.round((h.odds / 3.3) * 10) / 10);
const silkSVG = (h, r = 9) =>
  `<svg width="${r * 2}" height="${r * 2}" viewBox="-10 -10 20 20" aria-hidden="true"><circle r="9" fill="${h.silk[0]}" stroke="#141414" stroke-width="1.5"/><path d="M-9 0 H9" stroke="${h.silk[1]}" stroke-width="4"/><text y="3.5" text-anchor="middle" font-size="9" font-weight="900" font-family="Barlow Condensed" fill="#141414" stroke="#fff" stroke-width=".6" paint-order="stroke">${h.no}</text></svg>`;
export function locHipodrom(I) {
  if (S.age < 18) return sheet(I.n, $t("hp.sub"), `<div class="say">${$t("hp.young")}</div>`);
  if (S.hipWk !== wk()) {
    S.hipWk = wk();
    S.rel.koc -= 2;
    norm();
    save();
  }
  const field = (S.field && S.field.w === wk() && S.field.f && S.field.f[0] && S.field.f[0].silk && S.field.f) || raceField();
  S.field = { w: wk(), f: field };
  const bet = Math.max(5, Math.round(5 * pm())),
    horseCost = Math.round(1500 * pm());
  const mul = [1, 3, 10].includes(S.hipMul) ? S.hipMul : 1,
    kind = S.hipKind === "place" ? "place" : "win",
    stake = bet * mul;
  sheet(
    I.n,
    $t("hp.sub"),
    `<div class="card fm"><div class="eyebrow">${$t("hp.card")}</div><p class="small muted">${$t("hp.note", { v: fmt(bet) })}</p>
     <div class="row between nowrap gap-2"><div class="opts" id="hp-kind">${["win", "place"].map(k => `<button class="opt ${kind === k ? "on" : ""}" data-v="${k}">${$t(`hp.k.${k}`)}</button>`).join("")}</div>
     <div class="opts" id="hp-mul">${[1, 3, 10].map(m => `<button class="opt ${mul === m ? "on" : ""}" data-v="${m}" ${S.money < bet * m ? "disabled" : ""}>${fmt(bet * m)}</button>`).join("")}</div></div></div>
     <div class="choices">${field
       .map(
         (h, i) =>
           `<button class="choice" data-hb="${i}" ${S.money < stake ? "disabled" : ""}><span class="ct" style="display:flex;align-items:center;gap:var(--sp-1h)">${silkSVG(h)} ${esc(h.n)}${h.mine ? ` · <b class="gold">${$t("hp.mine")}</b>` : ""}</span><span class="cd">${$t("hp.line", { j: h.jockey, f: h.form })}</span><span class="od e">${(kind === "place" ? placeOdds(h) : h.odds).toFixed(1)}</span></button>`
       )
       .join("")}</div>
     ${S.horse ? `<p class="small">${$t("hp.own", { n: S.horse.n, w: S.horse.wins || 0 })}</p>` : `<div class="act"><div><h3>${$t("hp.buyH")}</h3><p>${$t("hp.buyD", { v: fmt(horseCost) })}</p></div><button class="btn sm" id="hp-buy" ${S.money < horseCost ? "disabled" : ""}>${$t("hp.buy")}</button></div>`}`
  );
  $$("#hp-kind [data-v]").forEach(b => (b.onclick = () => ((S.hipKind = b.dataset.v), locHipodrom(I))));
  $$("#hp-mul [data-v]").forEach(b => (b.onclick = () => ((S.hipMul = +b.dataset.v), locHipodrom(I))));
  $$("[data-hb]").forEach(b => (b.onclick = () => race(I, field, +b.dataset.hb, stake, kind)));
  const hb = $("#hp-buy");
  if (hb)
    hb.onclick = () => {
      tx($t("hp.buyH"), -horseCost);
      S.horse = {
        n: pick(["Pota", "Smaç", "Üçlük", "Ribaund"]) + " " + pick(["Yıldızı", "Rüzgarı", "Şimşeği"]),
        s: rnd(0.95, 1.25),
        wins: 0
      };
      save();
      locHipodrom(I);
    };
}
// bitiş sırası: güce göre ağırlıklı çekiliş (yerine koymadan)
function finishOrder(field) {
  const left = field.map((h, i) => i),
    out = [];
  while (left.length) {
    const tot = left.reduce((a, i) => a + field[i].s, 0);
    let r = Math.random() * tot,
      k = 0;
    for (; k < left.length - 1; k++) {
      r -= field[left[k]].s;
      if (r <= 0) break;
    }
    out.push(left.splice(k, 1)[0]);
  }
  return out;
}
/* ---- At çizimi (yandan, sağa koşar) ---- */
function drawHorse(c, x, y, s, h, ph) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const coat = h.coat,
    leg = a => Math.sin(ph + a) * 0.6;
  c.lineCap = "round";
  c.strokeStyle = "#141414";
  // bacaklar (dörtnala: çapraz çiftler)
  c.lineWidth = 3.2;
  for (const [bx, a, back] of [
    [-12, 0, true],
    [-8, Math.PI, true],
    [12, Math.PI * 0.5, false],
    [16, Math.PI * 1.5, false]
  ]) {
    const an = leg(a) * (back ? 1 : -1);
    const kx = bx + Math.sin(an) * 8,
      ky = 10 + Math.cos(an) * 8;
    c.strokeStyle = coat;
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(bx, 4);
    c.lineTo(kx, ky);
    c.lineTo(kx + Math.sin(an * 1.6) * 6, ky + 8);
    c.stroke();
  }
  // gövde
  c.fillStyle = coat;
  c.strokeStyle = "#141414";
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(2, 0, 20, 8.5, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // kuyruk
  c.strokeStyle = "#1b1b1b";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-18, -3);
  c.quadraticCurveTo(-28, -2 + Math.sin(ph) * 3, -30, 6 + Math.sin(ph) * 2);
  c.stroke();
  // boyun ve baş
  c.fillStyle = coat;
  c.strokeStyle = "#141414";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(14, -4);
  c.lineTo(24, -16 + Math.sin(ph) * 1.5);
  c.lineTo(31, -15 + Math.sin(ph) * 1.5);
  c.lineTo(34, -10 + Math.sin(ph) * 1.5);
  c.lineTo(28, -8);
  c.lineTo(20, 3);
  c.closePath();
  c.fill();
  c.stroke();
  // yele
  c.strokeStyle = "#1b1b1b";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(15, -6);
  c.lineTo(23, -17);
  c.stroke();
  // jokey: eğilmiş gövde (forma rengi), kask
  c.fillStyle = h.silk[0];
  c.strokeStyle = "#141414";
  c.beginPath();
  c.ellipse(6, -12, 7, 4.5, -0.35, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = h.silk[1];
  c.fillRect(3, -14, 5, 3);
  c.fillStyle = h.silk[0];
  c.beginPath();
  c.arc(13, -17, 3.6, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
}
function race(I, field, pickI, bet, kind = "win") {
  tx($t("hp.betTx"), -bet);
  const order = finishOrder(field),
    win = order[0];
  save();
  closeSheet();
  app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("hp.sub")}</div><h2>${$t("hp.live")}</h2></div>
   <div class="card" style="padding:var(--sp-1h)"><canvas id="hp-cv"></canvas><div id="hp-ord" class="row nowrap" style="gap:var(--sp-1);justify-content:center;margin-top:6px"></div></div>
   <div class="say" id="hp-com" style="min-height:40px">${$t("hp.c.start")}</div><div id="race"></div>`;
  const cv = $("#hp-cv"),
    dpr = Math.min(2, window.devicePixelRatio || 1),
    W = 360,
    H = 210;
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = "100%";
  cv.style.aspectRatio = `${W}/${H}`;
  const c = cv.getContext("2d");
  c.scale(dpr, dpr);
  const L = 1600, // pist uzunluğu (dünya birimi)
    T = window.__SIM ? 0.2 : 6.2, // kazananın süresi (sn)
    n = field.length;
  // her atın bitiş süresi ve yarış içi temposu (önde-arkada değişimler)
  const fin = field.map(() => 0);
  order.forEach((idx, r) => (fin[idx] = T * (1 + r * 0.022 + (r ? rnd(0, 0.012) : 0))));
  const amp = field.map(() => rnd(-0.07, 0.07)),
    amp2 = field.map(() => rnd(-0.04, 0.04));
  const posAt = (i, t) => {
    const u = t / fin[i];
    if (u >= 1) return L + (t - fin[i]) * (L / fin[i]);
    return L * (u + amp[i] * Math.sin(Math.PI * u) * (1 - u) + amp2[i] * Math.sin(2 * Math.PI * u) * (1 - u)); // sonda hepsi sıfırlanır
  };
  const crowd = Array.from({ length: 160 }, () => ({ x: Math.random() * (L + 600), y: rnd(26, 58), c: pick(["#ef5350", "#ffca28", "#42a5f5", "#fff", "#66bb6a", "#ab47bc"]) }));
  let t0 = performance.now(),
    lastLead = -1,
    said = { final: false },
    done = false;
  const say = s => {
    const e = $("#hp-com");
    if (e) e.innerHTML = s;
  };
  const frame = now => {
    if (!document.body.contains(cv)) return;
    const t = (now - t0) / 1000;
    const pos = field.map((h, i) => posAt(i, t));
    const lead = pos.indexOf(Math.max(...pos));
    const cam = Math.max(0, Math.min(L + 120 - W + 60, pos[lead] - 230));
    // gökyüzü ve tribün (paralaks)
    const g = c.createLinearGradient(0, 0, 0, 70);
    g.addColorStop(0, "#5aa0e6");
    g.addColorStop(1, "#bfe1ff");
    c.fillStyle = g;
    c.fillRect(0, 0, W, 70);
    c.fillStyle = "#37474f";
    c.fillRect(0, 22, W, 44);
    c.fillStyle = "#263238";
    for (let k = 0; k < 12; k++) c.fillRect(((k * 60 - cam * 0.5) % (W + 60)) - 30 + (k * 60 - cam * 0.5 < 0 ? W + 60 : 0), 18, 4, 48);
    for (const p of crowd) {
      const x = p.x - cam * 0.5;
      if (x < -4 || x > W + 4) continue;
      c.fillStyle = p.c;
      c.fillRect(x, p.y + Math.sin(t * 9 + p.x) * (said.final ? 1.5 : 0.6), 3, 3);
    }
    c.fillStyle = "#1b5e20";
    c.fillRect(0, 66, W, 6);
    // pist: çim şeritler
    for (let k = -1; k < 12; k++) {
      const x = k * 40 - (cam % 80);
      c.fillStyle = (k + Math.floor(cam / 40)) % 2 ? "#4caf50" : "#43a047";
      c.fillRect(x, 72, 40, H - 72);
    }
    // iç ve dış korkuluk
    c.fillStyle = "#fff";
    c.fillRect(0, 74, W, 2);
    c.fillRect(0, H - 6, W, 2);
    for (let k = 0; k < 12; k++) {
      const x = k * 32 - (cam % 32);
      c.fillRect(x, 74, 2, 6);
      c.fillRect(x, H - 10, 2, 6);
    }
    // mesafe tabelaları
    c.font = '700 10px "Barlow Condensed"';
    for (let d = 400; d < L; d += 400) {
      const x = d - cam + 40;
      if (x < -20 || x > W + 20) continue;
      c.fillStyle = "#fff";
      c.fillRect(x, 60, 3, 18);
      c.fillStyle = "#141414";
      c.fillRect(x - 10, 50, 24, 12);
      c.fillStyle = "#fff";
      c.textAlign = "center";
      c.fillText(`${Math.round((L - d) / 4)}m`, x + 2, 59);
    }
    // bitiş çizgisi ve direği
    const fx = L - cam + 40;
    if (fx > -10 && fx < W + 10) {
      for (let k = 0; k < 14; k++) {
        c.fillStyle = k % 2 ? "#fff" : "#141414";
        c.fillRect(fx, 76 + k * 9.5, 4, 9.5);
      }
      c.fillStyle = "#e53935";
      c.fillRect(fx + 6, 40, 4, 40);
      c.beginPath();
      c.arc(fx + 8, 38, 7, 0, Math.PI * 2);
      c.fill();
    }
    // atlar: arka şeritten öne (derinlik)
    for (let i = 0; i < n; i++) {
      const lane = i,
        y = 94 + lane * 18,
        s = 0.74 + lane * 0.06,
        x = pos[i] - cam + 40;
      if (x < -60 || x > W + 60) continue;
      // gölge
      c.fillStyle = "rgba(0,0,0,.18)";
      c.beginPath();
      c.ellipse(x, y + 16 * s, 22 * s, 4 * s, 0, 0, Math.PI * 2);
      c.fill();
      drawHorse(c, x, y, s, field[i], t * 16 + i * 1.7);
      // numara
      c.fillStyle = "#fff";
      c.strokeStyle = "#141414";
      c.lineWidth = 2;
      c.font = '800 10px "Barlow Condensed"';
      c.textAlign = "center";
      c.strokeText(field[i].no, x - 14 * s, y - 20 * s);
      c.fillText(field[i].no, x - 14 * s, y - 20 * s);
      if (i === pickI) {
        c.strokeStyle = tok("--warn");
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x + 6 * s, y - 14 * s, 9 * s, 0, Math.PI * 2);
        c.stroke();
      }
    }
    // canlı sıralama ve anlatım
    const ranked = field.map((h, i) => i).sort((a, b) => pos[b] - pos[a]);
    const ord = $("#hp-ord");
    if (ord) ord.innerHTML = ranked.map(i => `<span style="${i === pickI ? "outline:2px solid var(--warn);border-radius:var(--r-round)" : ""}">${silkSVG(field[i], 10)}</span>`).join("");
    if (lead !== lastLead && t > 0.8 && pos[lead] < L) {
      lastLead = lead;
      say($t("hp.c.lead", { n: `<b>${esc(field[lead].n)}</b>` }));
    }
    if (!said.final && pos[lead] > L * 0.72) {
      said.final = true;
      say($t("hp.c.final"));
    }
    if (!done && pos[win] >= L) {
      done = true;
      const photo = Math.abs(fin[order[1]] - fin[order[0]]) < T * 0.018;
      say(photo ? $t("hp.c.photo", { n: `<b>${esc(field[win].n)}</b>` }) : $t("hp.c.win", { n: `<b>${esc(field[win].n)}</b>` }));
      setTimeout(() => result(I, field, order, pickI, bet, kind), window.__SIM ? 0 : 1300);
    }
    if (t < T * 1.35) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
function result(I, field, order, pickI, bet, kind) {
  const win = order[0],
    place = order.slice(0, 3).includes(pickI),
    ok = kind === "place" ? place : win === pickI,
    pay = ok ? Math.round(bet * (kind === "place" ? placeOdds(field[pickI]) : field[pickI].odds)) : 0;
  if (pay) tx($t("hp.winTx"), pay);
  if (field[win].mine && S.horse) {
    S.horse.wins = (S.horse.wins || 0) + 1;
    // atın kazandığı yarış ödülü haftada bir (sınırsız para musluğu olmasın)
    if (S.horse.prizeWk !== wk()) {
      S.horse.prizeWk = wk();
      tx($t("hp.prizeTx"), Math.round(40 * pm()));
    }
  }
  S.field = null;
  norm();
  save();
  const el = $("#race");
  if (!el) return;
  el.innerHTML = `<div class="card fm"><div class="eyebrow">${$t("hp.result")}</div>${order
    .slice(0, 3)
    .map(
      (i, r) =>
        `<div class="row nowrap gap-2 ai-c"><b class="${r ? "" : "gold"}" style="width:22px">${r + 1}.</b>${silkSVG(field[i])}<span>${esc(field[i].n)}</span><span class="small muted" style="margin-left:auto">${field[i].jockey}</span></div>`
    )
    .join("")}
   <div class="say ${ok ? "good" : "bad"}">${ok ? $t(kind === "place" ? "hp.wonPlace" : "hp.won", { n: field[pickI].n, v: fmt(pay) }) : $t("hp.lost", { n: field[win].n })}</div>
   <div class="grid2"><button class="btn" id="hp-home">${$t("casino.13")}</button><button class="btn pri" id="hp-again">${$t("hp.again")}</button></div></div>`;
  $("#hp-again").onclick = () => {
    renderMain();
    locHipodrom(I);
  };
  $("#hp-home").onclick = renderMain;
}
