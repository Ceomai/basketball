/* ================= SAHA GÖRÜNÜMÜ, POZİSYONA GÖRE KARAR, İKİNCİ KARAR, MAÇ RAPORU =================
   1) Maç ekranında yukarıdan yarım saha: 10 oyuncu her hücumda dizilişe göre kayar; sen altın halkalı ve
      parlak renktesin, top sahada. Kenardayken takımın oynar, sen "kenarda" yazısıyla izlersin.
   2) Karar anı senaryosu: sahada nerede olduğun (köşe, kanat, tepe, orta mesafe, post), savunmacının mesafesi
      (boş / normal / sıkı), pota altında yardım (pivot) ve boşta takım arkadaşı. Saha donar, durum çizilir.
      Seçenekler bu duruma göre değişir: konumuna uyan seçenek mutlaka gelir; "Boşsun!", "Sıkı savunma",
      "Pota altı kalabalık", "Boşta arkadaş" etiketleri ve başarı şansı buna göre ayarlanır.
   3) İkinci karar (kendin oynarken): penetrede pivot önüne çıkarsa → pas ver / ikiliğe kalk / spin ile geç /
      turnikeyi zorla. Şut seçince savunmacı üstüne gelirse → yine de at / pump fake ile gir / step-back / pas.
      Seçimin mini oyunun zorluğunu ya da türünü değiştirir; sonuç yeteneğine ve pozisyona bağlıdır.
   4) Football Manager tarzı maç raporu: isabetler (saha içi, üçlük, serbest atış), çeyrek skorları, skor akışı
      grafiği, katkılar. Maç sırasında canlı isabet satırı. */
import { t as $t } from "./i18n/index.js";
import { $, esc, pick } from "./data.js";
import { S, eff } from "./core.js";
import { M } from "./match.js";
import { courtShoe } from "./custom.js";

const W = 300,
  H = 210,
  HOOP = { x: 150, y: 26 };
// dizilişte hücum noktaları: PG tepe, SG sağ kanat, SF sol kanat/köşe, PF sol post, C sağ post
const SLOT = { PG: [150, 172], SG: [244, 128], SF: [56, 120], PF: [104, 66], C: [196, 62] };
const ZONE_XY = { corner: [30, 40], wing: [56, 120], top: [150, 172], mid: [196, 112], paint: [150, 70], post: [104, 66] };
const POSS = ["PG", "SG", "SF", "PF", "C"];
let C = null; // { ours, opps, me, colors }
const jit = v => v + (Math.random() - 0.5) * 22;

export function courtHTML() {
  return `<div class="card" id="mcourt" style="padding:6px"><svg id="crt" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;border-radius:10px">${floor()}<g id="crt-p"></g></svg><div class="small muted" id="crt-cap" style="text-align:center;min-height:16px"></div></div>`;
}
function floor() {
  const wood = "#c98f53",
    line = "#fff";
  return `<rect width="${W}" height="${H}" fill="${wood}"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 25}" y="0" width="1" height="${H}" fill="#b07a44" opacity=".35"/>`).join("")}
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="none" stroke="${line}" stroke-width="2"/>
  <rect x="102" y="2" width="96" height="112" fill="${S && S.team ? S.team.c1 : "#1d428a"}" fill-opacity=".35" stroke="${line}" stroke-width="2"/>
  <circle cx="150" cy="114" r="30" fill="none" stroke="${line}" stroke-width="2"/>
  <path d="M18 2 V62 A136 136 0 0 0 282 62 V2" fill="none" stroke="${line}" stroke-width="2"/>
  <rect x="132" y="12" width="36" height="3" fill="#333"/><circle cx="${HOOP.x}" cy="${HOOP.y}" r="7" fill="none" stroke="#ff6b2b" stroke-width="2.5"/>
  <path d="M100 ${H - 2} A50 50 0 0 1 200 ${H - 2}" fill="none" stroke="${line}" stroke-width="2"/>`;
}
const dot = (id, x, y, fill, ring, label) =>
  `<g id="${id}" style="transform:translate(${x}px,${y}px);transition:transform .45s ease">${ring ? `<circle r="13" fill="none" stroke="#ffc54d" stroke-width="3"/>` : ""}${ring ? courtShoe() : ""}<circle r="9" fill="${fill}" stroke="${id[0] === "d" ? "#ffffff" : "#141414"}" stroke-width="${id[0] === "d" ? 2 : 1.5}" ${id[0] === "d" ? 'stroke-dasharray="3 2"' : ""}/><text y="3.5" text-anchor="middle" font-size="8" font-weight="800" font-family="Barlow Condensed" fill="#fff">${label}</text></g>`;
/** Maç başında: oyuncuları yerleştir */
export function courtStart(opp) {
  C = { c1: S.team.c1, c2: opp ? opp.c1 : "#4a5568", flow: [] };
  const g = $("#crt-p");
  if (!g) return;
  g.innerHTML =
    POSS.map(p => dot(`o-${p}`, SLOT[p][0], SLOT[p][1], C.c1, p === S.pos, p === S.pos ? "★" : p)).join("") +
    POSS.map(p => dot(`d-${p}`, SLOT[p][0], SLOT[p][1] - 20, C.c2, false, "")).join("") +
    `<g id="ball" style="transform:translate(150px,172px);transition:transform .45s ease"><circle r="4.5" fill="#ff8a3d" stroke="#141414" stroke-width="1"/></g><g id="arrows"></g>`;
}
/** Dizilişteki hücum noktası (oyun kur ekranı için) */
export const courtSlot = p => SLOT[p] || SLOT.PG;
export const courtMove = (id, x, y) => mv(id, x, y);
const mv = (id, x, y) => {
  const e = $(`#${id}`);
  if (e) e.style.transform = `translate(${Math.max(8, Math.min(W - 8, x))}px,${Math.max(8, Math.min(H - 8, y))}px)`;
};
/** Her hücumda: hücum eden takım dizilişte kayar, savunma eşler; kenardaysan ★ soluk */
export function courtTick(ourBall, on) {
  if (!C || !$("#crt-p")) return;
  const att = ourBall ? "o" : "d",
    def = ourBall ? "d" : "o";
  const pos = {};
  for (const p of POSS) {
    const [x, y] = SLOT[p];
    pos[p] = [jit(x), jit(y)];
    mv(`${att}-${p}`, pos[p][0], pos[p][1]);
    // savunmacı: hücumcuyla pota arasında
    mv(
      `${def}-${p}`,
      pos[p][0] + (HOOP.x - pos[p][0]) * 0.22 + (Math.random() - 0.5) * 8,
      pos[p][1] + (HOOP.y - pos[p][1]) * 0.22
    );
  }
  const holder = Math.random() < 0.45 ? "PG" : pick(POSS);
  mv("ball", pos[holder][0] + 7, pos[holder][1] - 6);
  const me = $(`#o-${S.pos}`);
  if (me) me.style.opacity = on ? 1 : 0.35;
  const cap = $("#crt-cap");
  if (cap) cap.textContent = on ? (ourBall ? $t("ct.attack") : $t("ct.defend")) : $t("ct.bench");
  const a = $("#arrows");
  if (a) a.innerHTML = "";
  C.flow.push(M ? M.us - M.them : 0);
}

/* ---- Karar anı senaryosu ---- */
const THREE = ["pull", "catch", "wing", "corner", "top3"],
  TWO = ["step", "pop", "mid", "float"],
  FIN = ["drive", "break", "lay", "post", "dunk", "putback"],
  PASSK = ["pnr", "kick", "lob"];
const ZONE_BY_POS = {
  PG: ["top", "top", "wing", "mid"],
  SG: ["wing", "corner", "top", "mid"],
  SF: ["wing", "corner", "mid", "paint"],
  PF: ["post", "mid", "paint", "corner"],
  C: ["post", "paint", "paint", "mid"]
};
const FAV = {
  corner: ["corner", "catch"],
  wing: ["wing", "catch", "pull"],
  top: ["top3", "pull", "pnr"],
  mid: ["mid", "step", "pop", "float"],
  paint: ["lay", "dunk", "putback", "float"],
  post: ["post", "dunk"]
};
export function courtScenario(us) {
  const r = Math.random();
  const s = {
    us,
    zone: pick(ZONE_BY_POS[S.pos] || ZONE_BY_POS.SF),
    guard: r < 0.25 ? "open" : r < 0.75 ? "normal" : "tight",
    help: Math.random() < 0.35,
    mate: Math.random() < 0.4,
    drive: !us && Math.random() < 0.5 // savunmada: rakip penetre mi ediyor, şutör mü boşta
  };
  return s;
}
/** Seçeneklere senaryo etkisi ve etiketleri */
export function applyScenario(opts, s) {
  return opts.map(o => {
    const base = o.e;
    let e = o.e,
      tags = [];
    if (s.us) {
      const sh = THREE.includes(o.k) || TWO.includes(o.k);
      if (sh && s.guard === "open") ((e += 7), tags.push($t("ct.open")));
      if (sh && s.guard === "tight") ((e -= 5), tags.push($t("ct.tight")));
      if (FIN.includes(o.k) && s.guard === "tight") e += 3;
      if (FIN.includes(o.k) && s.help) ((e -= 7), tags.push($t("ct.crowd")));
      if (o.k === "float" && s.help) e += 5;
      if (PASSK.includes(o.k) && s.mate) ((e += 6), tags.push($t("ct.mate")));
      if ((FAV[s.zone] || []).includes(o.k)) ((e += 2), (o = { ...o, fav: true }));
    } else {
      if (s.drive && ["block", "charge", "rim", "safe"].includes(o.k)) ((e += 4), tags.push($t("ct.driving")));
      if (!s.drive && ["steal", "safe"].includes(o.k)) ((e += 3), tags.push($t("ct.shooter")));
      if (!s.drive && o.k === "block") e -= 3;
    }
    return { ...o, e, sm: e - base, d: tags.length ? `${o.d} · <b>${tags.join(" · ")}</b>` : o.d };
  });
}
/** Saha: karar anında dur, durumu çiz */
export function courtFreeze(s) {
  if (!C || !$("#crt-p")) return;
  const [zx, zy] = ZONE_XY[s.zone] || ZONE_XY.wing,
    a = $("#arrows");
  if (s.us) {
    mv(`o-${S.pos}`, zx, zy);
    mv("ball", zx + 7, zy - 6);
    const gd = s.guard === "open" ? 46 : s.guard === "normal" ? 24 : 12;
    const dx = (HOOP.x - zx) / Math.hypot(HOOP.x - zx, HOOP.y - zy),
      dy = (HOOP.y - zy) / Math.hypot(HOOP.x - zx, HOOP.y - zy);
    mv(`d-${S.pos}`, zx + dx * gd, zy + dy * gd);
    if (s.help) mv("d-C", 150, 50);
    let arr = "";
    if (s.mate) {
      const mp = S.pos === "PG" ? "SG" : "PG",
        [mx, my] = SLOT[mp];
      mv(`o-${mp}`, mx, my);
      mv(`d-${mp}`, mx + 40, my - 30);
      arr += `<line x1="${zx}" y1="${zy}" x2="${mx}" y2="${my}" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>`;
    }
    arr += `<line x1="${zx}" y1="${zy}" x2="${HOOP.x}" y2="${HOOP.y}" stroke="#ffc54d" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>`;
    if (a) a.innerHTML = arr;
  } else {
    // savunma: top senin adamında; sen onunla pota arasında, penetre ediyorsa ok potaya
    const [x, y] = SLOT[S.pos];
    mv(`d-${S.pos}`, x, y);
    mv("ball", x + 7, y - 6);
    mv(`o-${S.pos}`, x + (HOOP.x - x) * 0.25, y + (HOOP.y - y) * 0.25);
    if (a)
      a.innerHTML = s.drive
        ? `<line x1="${x}" y1="${y}" x2="${HOOP.x}" y2="${HOOP.y}" stroke="#ff5468" stroke-width="2" stroke-dasharray="5 4"/>`
        : "";
  }
  const cap = $("#crt-cap");
  if (cap)
    cap.innerHTML = s.us
      ? `<b>${$t(`ct.z.${s.zone}`)}</b> · ${$t(`ct.g.${s.guard}`)}${s.help ? ` · ${$t("ct.crowd")}` : ""}${s.mate ? ` · ${$t("ct.mate")}` : ""}`
      : `<b>${s.drive ? $t("ct.driving") : $t("ct.shooter")}</b>`;
}

/* ---- İkinci karar ---- */
const FIN2 = ["drive", "lay", "dunk", "post"];
/** Seçilen hareketten sonra araya giren durum; {pk, mod, resolve} döner ya da null */
export function followUp(pk, el, s, sur) {
  const fin = FIN2.includes(pk),
    shot = THREE.includes(pk) || TWO.includes(pk);
  // maç akışı uzamasın: pota altı yardım varsa çoğunlukla, yoksa seyrek
  const fire = fin
    ? Math.random() < (s && s.help ? 0.7 : 0.15)
    : shot
      ? Math.random() < 0.15 && (!s || s.guard !== "open")
      : false;
  if (!fire) return Promise.resolve(null);
  const mate = $t("ct.teammate");
  const opts = fin
    ? [
        ["pass", $t("ct.f.pass", { m: mate }), $t("ct.f.passD")],
        ["pull", $t("ct.f.pull"), $t("ct.f.pullD")],
        ["spin", $t("ct.f.spin"), $t("ct.f.spinD")],
        ["force", $t("ct.f.force"), $t("ct.f.forceD")]
      ]
    : [
        ["shoot", $t("ct.f.shoot"), $t("ct.f.shootD")],
        ["fake", $t("ct.f.fake"), $t("ct.f.fakeD")],
        ["step", $t("ct.f.step"), $t("ct.f.stepD")],
        ["pass", $t("ct.f.pass", { m: mate }), $t("ct.f.passD")]
      ];
  el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("ct.second")}</div><h2>${fin ? $t("ct.bigUp") : $t("ct.closeout")}</h2><div class="choices">${opts
    .map(([k, t, d]) => `<button class="choice" data-fu="${k}"><span class="ct">${t}</span><span class="cd">${d}</span></button>`)
    .join("")}</div></div>`;
  return new Promise(res =>
    [...el.querySelectorAll("[data-fu]")].forEach(
      b =>
        (b.onclick = () => {
          const k = b.dataset.fu;
          if (k === "pass")
            return res({
              resolve: () => {
                const ok = Math.random() < Math.max(0.2, Math.min(0.9, 0.3 + eff("pas") / 120 + (S.rel.takim - 50) / 300));
                if (ok) M.ast++;
                return { good: ok, w: 1, st: "pas", txt: ok ? $t("ct.passOk", { sur }) : $t("ct.passNo", { sur }) };
              }
            });
          if (k === "pull") return res({ pk: "mid", mod: -3 });
          if (k === "spin") return res({ pk, mod: Math.round((eff("hiz") - 50) / 5) });
          if (k === "force") return res({ pk, mod: -10, foulChance: 0.3 });
          if (k === "shoot") return res({ pk, mod: -8 });
          if (k === "fake") return res({ pk: "drive", mod: 3 });
          if (k === "step") return res({ pk: "step", mod: -2 });
          return res(null);
        })
    )
  );
}
export const effMod = () => (M && M.live && M.effMod) || 0;

/* ---- İstatistik takibi ---- */
export function trackPlay(pk, pts0, res) {
  if (!M) return;
  const d = M.pts - pts0;
  if (pk === "free" || pk === "free3") {
    M.fta = (M.fta || 0) + (pk === "free3" ? 3 : 2);
    M.ftm = (M.ftm || 0) + d;
    return;
  }
  if (THREE.includes(pk)) {
    M.tpa = (M.tpa || 0) + 1;
    M.fga = (M.fga || 0) + 1;
    if (d >= 3) ((M.tpm = (M.tpm || 0) + 1), (M.fgm = (M.fgm || 0) + 1));
  } else if (TWO.includes(pk) || FIN.includes(pk)) {
    M.fga = (M.fga || 0) + 1;
    if (d >= 2) M.fgm = (M.fgm || 0) + 1; // basket faul serbest atışı andOne içinde sayılır (src/match.js)
  }
  void res;
}
const pct = (m, a) => (a ? `${m}/${a} (%${Math.round((m / a) * 100)})` : "–");
export const liveLine = () => (M && M.fga ? ` · ${$t("ct.fg")} ${M.fgm || 0}/${M.fga}` : "");
/** Maç sonu FM tarzı rapor */
export function reportHTML() {
  if (!M) return "";
  const f = (C && C.flow) || [],
    n = f.length;
  let path = "";
  if (n > 1) {
    const mx = Math.max(8, ...f.map(Math.abs));
    path = f
      .map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * 280 + 10).toFixed(1)} ${(40 - (v / mx) * 34).toFixed(1)}`)
      .join(" ");
  }
  const q = (M.qs || []).map((s, i, a) => [s[0] - (i ? a[i - 1][0] : 0), s[1] - (i ? a[i - 1][1] : 0)]);
  return `<div class="card fm"><div class="eyebrow">${$t("ct.report")}</div>
  <div class="kv"><span>${$t("ct.fg")}</span><b>${pct(M.fgm || 0, M.fga || 0)}</b><span>${$t("ct.tp")}</span><b>${pct(M.tpm || 0, M.tpa || 0)}</b><span>${$t("ct.ft")}</span><b>${pct(M.ftm || 0, M.fta || 0)}</b><span>${$t("ct.bench2")}</span><b>${M.autoPts || 0}</b></div>
  ${q.length ? `<div class="tbl"><table><tr><th></th>${q.map((_, i) => `<th>${i < 4 ? $t("common.q", { n: i + 1 }) : $t("ct.ot")}</th>`).join("")}</tr><tr><td>${esc(S.team.short)}</td>${q.map(x => `<td>${x[0]}</td>`).join("")}</tr><tr><td>${$t("ct.opp")}</td>${q.map(x => `<td>${x[1]}</td>`).join("")}</tr></table></div>` : ""}
  ${path ? `<div class="eyebrow">${$t("ct.flow")}</div><svg viewBox="0 0 300 80" style="width:100%;height:60px"><line x1="10" y1="40" x2="290" y2="40" stroke="#5d6b82" stroke-dasharray="3 3"/><path d="${path}" fill="none" stroke="#ffc54d" stroke-width="2"/></svg><div class="row between small muted"><span>${$t("ct.start")}</span><span>${$t("ct.end")}</span></div>` : ""}</div>`;
}
