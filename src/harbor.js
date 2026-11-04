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
import { $, $$, Bus, clamp, fmt, pick, rnd } from "./data.js";
import { S, news, norm, resultView, sheet, tx, useSlot, fullName } from "./core.js";
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
  return `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><polyline points="${pts}" fill="none" stroke="${h[h.length - 1] >= h[0] ? "#36d38e" : "#ff5468"}" stroke-width="1.5"/></svg>`;
};
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
        return `<div class="act"><div><h3>${$t(`bs.s.${s.id}`)} <span class="${ch >= 0 ? "good" : "bad"}">${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%</span></h3><p>${$t("bs.line", { p: m.p[s.id].toFixed(2), n: own })}${late.stockInfo(s.id)}${own ? ` · <b class="${pl >= 0 ? "good" : "bad"}">${pl >= 0 ? "+" : ""}${fmt(pl)}</b>` : ""}</p>${spark(h)}</div><div class="grid2" style="grid-column:1/-1"><button class="btn sm" data-sb="${s.id}" ${S.money < lot(s) * m.p[s.id] ? "disabled" : ""}>${$t("bs.buy", { n: lot(s) })}</button><button class="btn ghost sm" data-ss="${s.id}" ${own ? "" : "disabled"}>${$t("bs.sell")}</button></div></div>`;
      }
    ).join("")}`
  );
  $$("[data-sb]").forEach(
    b =>
      (b.onclick = () => {
        const s = STOCKS.find(x => x.id === b.dataset.sb),
          n = lot(s),
          c = Math.round(n * m.p[s.id]);
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
          v = Math.round((m.own[id] || 0) * m.p[id]);
        tx($t("bs.sellTx", { v: $t(`bs.s.${id}`) }), v);
        m.own[id] = 0;
        m.cost[id] = 0;
        save();
        locBorsa(I);
      })
  );
}

/* ---- Hipodrom ---- */
const HORSES = ["Rüzgar", "Kara Şimşek", "Yıldız", "Bora", "Gülbahar", "Fırtına", "Poyraz", "Altın Toz"];
const raceField = () => {
  const own = S.horse ? [{ n: S.horse.n, s: S.horse.s, mine: true }] : [];
  const others = HORSES.filter(h => !own.some(o => o.n === h))
    .sort(() => Math.random() - 0.5)
    .slice(0, 6 - own.length)
    .map(n => ({ n, s: rnd(0.7, 1.3) }));
  const f = [...own, ...others];
  const tot = f.reduce((a, h) => a + h.s, 0);
  return f.map(h => ({ ...h, odds: Math.max(1.3, Math.round((tot / h.s) * 0.85 * 10) / 10) }));
};
export function locHipodrom(I) {
  if (S.age < 18) return sheet(I.n, $t("hp.sub"), `<div class="say">${$t("hp.young")}</div>`);
  if (S.hipWk !== wk()) {
    S.hipWk = wk();
    S.rel.koc -= 2;
    norm();
    save();
  }
  const field = (S.field && S.field.w === wk() && S.field.f) || raceField();
  S.field = { w: wk(), f: field };
  const bet = Math.max(5, Math.round(5 * pm())),
    horseCost = Math.round(1500 * pm());
  sheet(
    I.n,
    $t("hp.sub"),
    `<p class="small muted">${$t("hp.note", { v: fmt(bet) })}</p><div class="choices">${field
      .map(
        (h, i) =>
          `<button class="choice" data-hb="${i}" ${S.money < bet ? "disabled" : ""}><span class="ct">${h.n}${h.mine ? ` · <b class="gold">${$t("hp.mine")}</b>` : ""}</span><span class="cd">${$t("hp.odds", { v: h.odds.toFixed(1) })}</span></button>`
      )
      .join(
        ""
      )}</div><div id="race"></div>${S.horse ? `<p class="small">${$t("hp.own", { n: S.horse.n, w: S.horse.wins || 0 })}</p>` : `<div class="act"><div><h3>${$t("hp.buyH")}</h3><p>${$t("hp.buyD", { v: fmt(horseCost) })}</p></div><button class="btn sm" id="hp-buy" ${S.money < horseCost ? "disabled" : ""}>${$t("hp.buy")}</button></div>`}`
  );
  $$("[data-hb]").forEach(b => (b.onclick = () => race(I, field, +b.dataset.hb, bet)));
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
function race(I, field, pickI, bet) {
  tx($t("hp.betTx"), -bet);
  const tot = field.reduce((a, h) => a + h.s, 0);
  let r = Math.random() * tot,
    win = 0;
  for (let i = 0; i < field.length; i++) {
    r -= field[i].s;
    if (r <= 0) {
      win = i;
      break;
    }
  }
  const el = $("#race");
  $$("[data-hb]").forEach(b => (b.disabled = true));
  const pos = field.map(() => 0);
  let t = 0;
  const iv = setInterval(() => {
    t++;
    field.forEach((h, i) => (pos[i] = Math.min(100, pos[i] + rnd(2, 6) + (i === win ? 1.6 : 0))));
    if (pos[win] < 100 && t > 25) pos[win] = 100;
    if (el)
      el.innerHTML = field
        .map(
          (h, i) =>
            `<div class="small" style="display:flex;gap:6px;align-items:center"><span style="width:90px;overflow:hidden;white-space:nowrap">${h.n}</span><div class="bar" style="flex:1"><i style="width:${pos[i]}%"></i></div></div>`
        )
        .join("");
    if (pos[win] >= 100 || !document.body.contains(el)) {
      clearInterval(iv);
      const ok = win === pickI,
        pay = ok ? Math.round(bet * field[pickI].odds) : 0;
      if (pay) tx($t("hp.winTx"), pay);
      if (field[win].mine && S.horse) {
        S.horse.wins = (S.horse.wins || 0) + 1;
        tx($t("hp.prizeTx"), Math.round(40 * pm()));
      }
      S.field = null;
      save();
      if (el)
        el.insertAdjacentHTML(
          "beforeend",
          `<div class="say" style="border-left-color:${ok ? "var(--good)" : "var(--bad)"}">${$t(ok ? "hp.won" : "hp.lost", { n: field[win].n, v: fmt(pay) })}</div><button class="btn pri" id="hp-again">${$t("hp.again")}</button>`
        );
      const a = $("#hp-again");
      if (a) a.onclick = () => locHipodrom(I);
    }
  }, 140);
}
