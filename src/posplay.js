/* ================= POZİSYONA ÖZGÜ OYUN =================
   Kendin oynarken, hücum (uzunlarda savunma da) karar anlarının ~%35'inde pozisyonuna özgü bir an gelir;
   mevcut seçenekler ve özel anlar kalan anlarda aynen sürer.
   - PG: pick-and-roll okuma. Rakip uzun perdeyi nasıl savunuyor (öne çıkıyor / geride bekliyor / kanattan yardım)?
     Kısa roll'a pas · perimetreye aç · kendi şutun. Pas seçeneklerinde zamanlama mini oyunu: koşan arkadaşın
     boş kaldığı anda pas.
   - SG/SF: perdeden çıkış. Savunmacın seni nasıl kovalıyor (arkandan / perdenin altından / önünü kesiyor)?
     Curl · flare · ters koşu. Koşu zamanlaması + yakala-at zamanlaması (iki aşamalı mini oyun).
   - PF/C: post-up (sırtı dönük): drop step · hook · dışarı pas (ikili sıkıştırma). Savunmada ribaund kutulama:
     kutula (art arda dokun, güç çubuğu) · topa uç · hücuma çık.
   Doğru okuma (savunmanın durumuna uyan seçenek) mini oyunu kolaylaştırır. Simüle maçta (AUTO, window.__SIM)
   hiç gelmez: otomatik maçların sonuç olasılıkları değişmez. */
import { t as $t } from "./i18n/index.js";
import { $, Bus, clamp, pick, statName } from "./data.js";
import { S, eff } from "./core.js";
import { M } from "./match.js";
import { dEff, mgShoot } from "./games.js";
import { autoSuccess } from "./logic/rules.js";
import { late } from "./late.js";

const PP_RATE = 0.35;
let ppAuto = true;
Bus.on("match:start", ctx => {
  ppAuto = !!(ctx && ctx.auto) || !!window.__SIM;
});
const chance = (e, base = 0.5) => autoSuccess(e + ((M && M.mmod) || 0), base);
const coin = x => Math.random() < x;
// maç raporu isabet satırı (src/court.js trackPlay pozisyon anlarının anahtarlarını tanımaz)
const fg = (three, made) => {
  M.fga = (M.fga || 0) + 1;
  if (three) M.tpa = (M.tpa || 0) + 1;
  if (made) {
    M.fgm = (M.fgm || 0) + 1;
    if (three) M.tpm = (M.tpm || 0) + 1;
  }
};
/** Testler için: bir sonraki uygun karar anını zorla (pozisyon anı gelsin) */
export const ppForce = v => (ppForceNext = v);
let ppForceNext = 0;
/** Pozisyon anı açık mı (kendin oynarken, kilit an dışında) */
export const ppActive = () => !ppAuto && !!M && !!S;

/* ---- Karar anı: src/moments.js pickSpecial çağırır ---- */
export function ppSpecial(us, clutch, diff, dn) {
  if (!ppActive() || clutch) return null;
  const forced = ppForceNext;
  if (!forced && !coin(PP_RATE)) return null;
  ppForceNext = 0;
  const pos = S.pos;
  if (us && pos === "PG") return pnrRead(dn);
  if (us && (pos === "SG" || pos === "SF")) return offScreen(dn);
  if (us && (pos === "PF" || pos === "C")) return postUp(dn);
  if (!us && (pos === "PF" || pos === "C")) return boxOut(dn);
  return null;
}
const opt = (k, st, bonus) => ({
  k,
  t: $t(`pp.${k}`),
  d: `${$t(`pp.${k}D`)} · ${statName(st)} ${Math.round(eff(st))}`,
  e: eff(st) + bonus,
  st
});
// doğru okuma +10, yanlış okuma −4 (mini oyunda pencere genişliğine yansır)
const readBonus = (k, best) => (k === best ? 10 : -4);

/* ---- PG: pick-and-roll okuma ---- */
function pnrRead(dn) {
  const cov = pick(["hedge", "drop", "help"]),
    best = { hedge: "pp_roll", drop: "pp_self", help: "pp_perim" }[cov];
  const keys = [
    ["pp_roll", "pas"],
    ["pp_perim", "pas"],
    ["pp_self", "sut"]
  ];
  return {
    id: "pp_pnr",
    ty: "off",
    scn: { us: true, zone: "top", guard: "normal", sp: true },
    head: $t("pp.pnrH"),
    desc: `${$t(`pp.cov.${cov}`, { dn })} ${$t("pp.pnrD")}`,
    opts: keys.map(([k, st]) => opt(k, st, readBonus(k, best) / 2)),
    async resolve(k, sur) {
      const b = readBonus(k, best);
      const el = $("#mview");
      if (k === "pp_self") {
        const r = await mgShoot(el, {
          eff: eff("sut") + b,
          shots: 1,
          title: $t("pp.pp_self"),
          dist: cov === "drop" ? "mid" : "three"
        });
        M.pts += r.pts;
        fg(cov !== "drop", r.made > 0);
        return { good: r.made > 0, w: 1.2, st: "sut", txt: r.made ? $t("pp.selfOk", { sur }) : $t("pp.selfNo", { sur }) };
      }
      const roll = k === "pp_roll";
      const g = await ppTiming(el, {
        eff: eff("pas") + b,
        title: roll ? $t("pp.tRoll") : $t("pp.tPerim"),
        hint: roll ? $t("pp.tRollH") : $t("pp.tPerimH"),
        btn: $t("pp.btnPass"),
        art: roll ? "roll" : "kick"
      });
      if (!g.ok) return { good: false, w: 1, st: "pas", txt: $t("pp.passNo", { sur, dn }) };
      const made = coin(roll ? 0.7 + g.q * 0.2 : 0.38 + g.q * 0.22);
      if (!made) return { good: true, w: 0.6, st: "pas", txt: $t("pp.passMiss", { sur }) };
      M.ast++;
      if (!roll) M.us += 1; // üçlük: asistin 2 sayısına ek
      late.chemAdd && late.chemAdd(3);
      return { good: true, w: 1.2, st: "pas", txt: roll ? $t("pp.rollOk", { sur }) : $t("pp.perimOk", { sur }) };
    }
  };
}

/* ---- SG/SF: perdeden çıkış ---- */
function offScreen(dn) {
  const cov = pick(["trail", "under", "top"]),
    best = { trail: "pp_curl", under: "pp_flare", top: "pp_back" }[cov];
  const keys = [
    ["pp_curl", "hiz"],
    ["pp_flare", "sut"],
    ["pp_back", "hiz"]
  ];
  return {
    id: "pp_screen",
    ty: "off",
    scn: { us: true, zone: "wing", guard: "tight", sp: true },
    head: $t("pp.scrH"),
    desc: `${$t(`pp.cov.${cov}`, { dn })} ${$t("pp.scrD")}`,
    opts: keys.map(([k, st]) => opt(k, st, readBonus(k, best) / 2)),
    async resolve(k, sur) {
      const b = readBonus(k, best);
      const el = $("#mview");
      if (k === "pp_back") {
        const g = await ppTiming(el, {
          eff: eff("hiz") + b,
          title: $t("pp.tBack"),
          hint: $t("pp.tBackH"),
          btn: $t("pp.btnCut"),
          art: "cut"
        });
        fg(false, g.ok);
        if (!g.ok) return { good: false, w: 1, st: "hiz", txt: $t("pp.backNo", { sur, dn }) };
        M.pts += 2;
        return { good: true, w: 1.2, st: "hiz", txt: $t("pp.backOk", { sur }) };
      }
      const flare = k === "pp_flare";
      const r = await ppCatchShoot(el, {
        eff: eff(flare ? "sut" : "hiz") + b,
        shotEff: eff("sut") + b,
        title: flare ? $t("pp.pp_flare") : $t("pp.pp_curl"),
        art: flare ? "flare" : "curl"
      });
      if (!r.run) return { good: false, w: 1, st: flare ? "sut" : "hiz", txt: $t("pp.runNo", { sur, dn }) };
      fg(flare, r.ok);
      if (!r.ok) return { good: false, w: 1, st: "sut", txt: $t("pp.csNo", { sur }) };
      M.pts += flare ? 3 : 2;
      return { good: true, w: flare ? 1.3 : 1.1, st: "sut", txt: flare ? $t("pp.flareOk", { sur }) : $t("pp.curlOk", { sur }) };
    }
  };
}

/* ---- PF/C: post-up ---- */
function postUp(dn) {
  const cov = pick(["lean", "sag", "double"]),
    best = { lean: "pp_drop", sag: "pp_hook", double: "pp_out" }[cov];
  const keys = [
    ["pp_drop", "guc"],
    ["pp_hook", "sut"],
    ["pp_out", "pas"]
  ];
  return {
    id: "pp_post",
    ty: "off",
    scn: { us: true, zone: "post", guard: "tight", help: cov === "double", sp: true },
    head: $t("pp.postH"),
    desc: `${$t(`pp.cov.${cov}`, { dn })} ${$t("pp.postD")}`,
    opts: keys.map(([k, st]) => opt(k, st, readBonus(k, best) / 2)),
    async resolve(k, sur) {
      const b = readBonus(k, best);
      const el = $("#mview");
      if (k === "pp_out") {
        const g = await ppTiming(el, {
          eff: eff("pas") + b,
          title: $t("pp.tOut"),
          hint: $t("pp.tOutH"),
          btn: $t("pp.btnPass"),
          art: "kick"
        });
        if (!g.ok) return { good: false, w: 1, st: "pas", txt: $t("pp.passNo", { sur, dn }) };
        if (!coin(0.4 + g.q * 0.22)) return { good: true, w: 0.6, st: "pas", txt: $t("pp.passMiss", { sur }) };
        M.ast++;
        M.us += 1;
        return { good: true, w: 1.2, st: "pas", txt: $t("pp.outOk", { sur }) };
      }
      const drop = k === "pp_drop";
      const g = await ppTiming(el, {
        eff: eff(drop ? "guc" : "sut") + b - (drop ? 0 : 4),
        title: drop ? $t("pp.tDrop") : $t("pp.tHook"),
        hint: drop ? $t("pp.tDropH") : $t("pp.tHookH"),
        btn: drop ? $t("pp.btnDrop") : $t("pp.btnShoot"),
        art: drop ? "drop" : "hook"
      });
      fg(false, g.ok);
      if (!g.ok)
        return {
          good: false,
          w: 1,
          st: drop ? "guc" : "sut",
          txt: drop ? $t("pp.dropNo", { sur, dn }) : $t("pp.hookNo", { sur })
        };
      M.pts += 2;
      // drop step'te iyi zamanlama bazen faul de getirir (+1)
      const and1 = drop && g.q > 0.6 && coin(0.25);
      if (and1) M.pts += 1;
      return {
        good: true,
        w: 1.2,
        st: drop ? "guc" : "sut",
        txt: drop ? (and1 ? $t("pp.dropAnd1", { sur }) : $t("pp.dropOk", { sur })) : $t("pp.hookOk", { sur })
      };
    }
  };
}

/* ---- PF/C savunma: ribaund kutulama ---- */
function boxOut(dn) {
  return {
    id: "pp_box",
    ty: "def",
    scn: { us: false, zone: "post", guard: "normal", sp: true },
    head: $t("pp.boxH"),
    desc: $t("pp.boxD", { dn }),
    opts: [opt("pp_box", "guc", 4), opt("pp_tip", "hiz", 0), opt("pp_leak", "hiz", -6)],
    async resolve(k, sur) {
      const el = $("#mview");
      if (k === "pp_leak") {
        // kutulamadan hücuma çık: takım ribaundu alırsa kolay sayı, almazsa rakip ikinci şans
        if (coin(0.42)) {
          M.stops++;
          M.pts += 2;
          return { good: true, w: 1.1, st: "hiz", txt: $t("pp.leakOk", { sur }) };
        }
        return { good: false, w: 1, st: "hiz", txt: $t("pp.leakNo", { dn }) };
      }
      if (k === "pp_tip") {
        const g = await ppTiming(el, {
          eff: eff("hiz"),
          title: $t("pp.tTip"),
          hint: $t("pp.tTipH"),
          btn: $t("pp.btnTip"),
          art: "tip"
        });
        if (!g.ok) return { good: false, w: 1, st: "hiz", txt: $t("pp.tipNo", { sur, dn }) };
        M.stops++;
        return { good: true, w: 1, st: "hiz", txt: $t("pp.tipOk", { sur }) };
      }
      const r = await ppMash(el, { eff: eff("guc") + 4, title: $t("pp.tBox"), hint: $t("pp.tBoxH") });
      if (!r.ok) return { good: false, w: 1, st: "guc", txt: $t("pp.boxNo", { dn }) };
      M.stops++;
      M.reb++;
      return { good: true, w: 1.1, st: "guc", txt: $t("pp.boxOk", { sur }) };
    }
  };
}

/* ================= MİNİ OYUNLAR (DOM + SVG, dokunmatik) ================= */
const raf = f => (window.requestAnimationFrame ? window.requestAnimationFrame(f) : setTimeout(() => f(Date.now()), 16));
// küçük saha şeridi: pota sağda; yol boyunca boş pencere yeşil, koşan oyuncu imleç
function stripSVG(art, c, w) {
  const x0 = 24,
    x1 = 300,
    lx = p => x0 + (x1 - x0) * p;
  const path =
    {
      roll: "M24 70 Q150 70 300 46",
      kick: "M24 46 Q160 20 300 24",
      cut: "M24 24 Q180 30 300 46",
      flare: "M24 50 Q170 80 300 76",
      curl: "M24 76 Q150 20 300 46",
      drop: "M24 46 L300 46",
      hook: "M24 46 L300 46",
      tip: "M24 46 L300 46"
    }[art] || "M24 46 L300 46";
  return `<svg viewBox="0 0 330 92" style="width:100%;height:auto;display:block;background:#c98f53;border-radius:var(--r-lg)" aria-hidden="true">
   <rect x="250" y="20" width="76" height="52" fill="${(S.team && S.team.c1) || "#1d428a"}" fill-opacity=".3" stroke="#fff" stroke-width="1.4"/>
   <circle cx="314" cy="46" r="6" fill="none" stroke="#ff6b2b" stroke-width="2.4"/>
   <path id="pp-path" d="${path}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="5 4" opacity=".7"/>
   <rect x="${lx(clamp(c - w / 2, 0, 1))}" y="6" width="${(x1 - x0) * w}" height="80" rx="6" fill="#3ddc84" opacity=".28"/>
   <g id="pp-def" style="transform:translate(${lx(c)}px,30px)"><circle r="8" fill="#4a5568" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 2"/></g>
   <g id="pp-cur" style="transform:translate(${x0}px,46px)"><circle r="9" fill="${(S.team && S.team.c1) || "#1d428a"}" stroke="#141414" stroke-width="1.6"/><text y="3" text-anchor="middle" font-size="8" font-weight="800" fill="#fff">★</text></g>
  </svg>`;
}
/**
 * Zamanlama: imleç yolda gidip gelir; yeşil pencere içindeyken düğmeye bas. İki tur içinde basılmazsa kaçar.
 * Döner: { ok, q } (q: 0..1 isabet kalitesi)
 */
export function ppTiming(el, { eff: e, title, hint, btn, art = "roll" }) {
  e = dEff(e);
  const w = clamp(0.1 + e * 0.0019, 0.1, 0.32),
    c = 0.32 + Math.random() * 0.5,
    speed = 1 / (1100 - Math.min(400, e * 3)); // tam geçiş ≈ 0,8-1,1 sn
  if (!el) return Promise.resolve({ ok: coin(chance(e)), q: 0.5 });
  el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("pp.mg")}</div><h2>${title}</h2>${stripSVG(art, c, w)}<p class="small muted">${hint || ""}</p><button class="btn pri big" id="pp-go" data-pp="go">${btn || $t("pp.btnPass")}</button></div>`;
  return new Promise(res => {
    const t0 = performance.now();
    let done = false,
      pos = 0,
      fx = 0;
    const end = (ok, q) => {
      if (done) return;
      done = true;
      late.sfx && late.sfx(ok ? "swish" : "rim");
      res({ ok, q });
    };
    const tick = now => {
      if (done) return;
      if (!document.body.contains(el) || !$("#pp-go")) return end(false, 0);
      const u = (now - t0) * speed;
      if (u >= 4) return end(false, 0); // iki gidiş-dönüş: geç kaldın
      pos = u % 2 < 1 ? u % 1 : 1 - (u % 1);
      const g = $("#pp-cur"),
        pe = $("#pp-path");
      let xy = [24 + 276 * pos, 46];
      try {
        if (pe && pe.getTotalLength) {
          const q = pe.getPointAtLength(pe.getTotalLength() * pos);
          xy = [q.x, q.y];
        }
      } catch (err) {
        /* yol ölçülemezse düz çizgi */
      }
      if (g) g.style.transform = `translate(${xy[0]}px,${xy[1]}px)`;
      fx = (xy[0] - 24) / 276; // pencere x ekseninde çizili: değerlendirme imlecin gerçek x konumuna göre
      raf(tick);
    };
    raf(tick);
    $("#pp-go").onclick = () => {
      const d = Math.abs(fx - c);
      const ok = d <= w / 2;
      end(ok, ok ? 1 - d / (w / 2) : 0);
    };
  });
}
/** SG/SF: önce koşu zamanlaması (perdeye sürtün), sonra yakala-at; kötü koşu şut penceresini daraltır */
export async function ppCatchShoot(el, { eff: e, shotEff, title, art }) {
  const run = await ppTiming(el, {
    eff: e,
    title: `${title} · ${$t("pp.stage1")}`,
    hint: $t("pp.runH"),
    btn: $t("pp.btnRun"),
    art
  });
  if (!run.ok) return { run: false, ok: false };
  const shot = await ppTiming(el, {
    eff: shotEff - 8 + Math.round(run.q * 14),
    title: `${title} · ${$t("pp.stage2")}`,
    hint: $t("pp.csH"),
    btn: $t("pp.btnShoot"),
    art: "drop"
  });
  return { run: true, ok: shot.ok, q: shot.q };
}
/** PF/C kutulama: süre bitmeden art arda dokunarak güç çubuğunu rakipten önce doldur */
export function ppMash(el, { eff: e, title, hint }) {
  e = dEff(e);
  if (!el) return Promise.resolve({ ok: coin(chance(e)) });
  const need = Math.round(clamp(16 - e / 10, 6, 14)), // dokunuş sayısı
    T = 2600;
  el.innerHTML = `<div class="card sit"><div class="eyebrow">${$t("pp.mg")}</div><h2>${title}</h2>
   <div class="row nowrap gap-2 ai-c"><span class="small" style="width:46px">${$t("pp.you")}</span><div class="bar f1"><i id="pp-me" style="--w:0;background:var(--good)"></i></div></div>
   <div class="row nowrap gap-2 ai-c"><span class="small" style="width:46px">${$t("pp.opp")}</span><div class="bar f1"><i id="pp-op" style="--w:0;background:var(--bad);transition:none"></i></div></div>
   <p class="small muted">${hint || ""}</p><button class="btn pri big" id="pp-go" data-pp="mash" data-rapid="1" style="touch-action:manipulation">${$t("pp.btnBox")}</button></div>`;
  return new Promise(res => {
    const t0 = performance.now();
    let n = 0,
      done = false;
    const end = ok => {
      if (done) return;
      done = true;
      res({ ok });
    };
    const tick = now => {
      if (done) return;
      if (!document.body.contains(el) || !$("#pp-go")) return end(false);
      const f = Math.min(1, (now - t0) / T);
      const op = $("#pp-op");
      if (op) op.style.setProperty("--w", String(Math.round(f * 100)));
      if (f >= 1) return end(n >= need);
      raf(tick);
    };
    raf(tick);
    $("#pp-go").onclick = () => {
      n++;
      const me = $("#pp-me");
      if (me) me.style.setProperty("--w", String(Math.min(100, Math.round((n / need) * 100))));
      if (n >= need) end(true);
    };
  });
}
