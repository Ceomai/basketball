import { $, Bus, SIM, fmt } from "./data.js";
import { S, app } from "./core.js";
import { SETTINGS } from "./systems.js";
import { AC, NOISE } from "./audio.js";
import { MOTION, motionPlay, motionReduced } from "./motion.js";
/* ================= MÜZİK =================
   Dosya yüklemeden Web Audio ile çalınan döngüsel müzik.
   - "menu": harita ve menülerde sakin, lo-fi bir groove (84 BPM)
   - "arcade": eğlence merkezi ve oyun kulübünde 8-bit tarzı hızlı tema (132 BPM)
   Maç sırasında müzik susar; salonun sesini tribün uğultusu taşır. */
export const MUS = { theme: null, want: null, g: null, timer: null, next: 0, step: 0, bar: 0 };
export const mf = m => 440 * Math.pow(2, (m - 69) / 12);
export const THEMES = {
  menu: {
    bpm: 84,
    swing: 0.12,
    chords: [
      [57, 60, 64, 67],
      [50, 53, 57, 60],
      [55, 59, 62, 65],
      [60, 64, 67, 71]
    ],
    kick: [0, 7, 10],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    bass: [
      [0, 0],
      [6, 0],
      [8, 0],
      [11, 7]
    ],
    lead: { wave: "sine", vol: 0.045, steps: [2, 9, 14], scale: [69, 72, 74, 76, 79, 81], prob: 0.55 },
    pad: { wave: "triangle", vol: 0.03, cut: 900 }
  },
  arcade: {
    bpm: 132,
    swing: 0,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62]
    ],
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    bass: [
      [0, 0],
      [2, 12],
      [4, 0],
      [6, 12],
      [8, 0],
      [10, 12],
      [12, 0],
      [14, 12]
    ],
    lead: { wave: "square", vol: 0.03, steps: [0, 3, 6, 8, 11, 14], scale: [69, 72, 76, 79, 81, 84], prob: 0.8 },
    pad: null
  }
};
export function musNote(m, t, dur, { wave = "triangle", vol = 0.05, cut = 0, attack = 0.01 } = {}) {
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(mf(m), t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = o;
  if (cut) {
    const f = AC.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cut;
    o.connect(f);
    n = f;
  }
  n.connect(g);
  g.connect(MUS.g);
  o.start(t);
  o.stop(t + dur + 0.05);
}
export function musNoise(t, dur, { freq = 2000, type = "bandpass", vol = 0.05, q = 1 } = {}) {
  const s = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = NOISE;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(MUS.g);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.05);
}
export function musKick(t, vol) {
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g);
  g.connect(MUS.g);
  o.start(t);
  o.stop(t + 0.25);
}
export function musStep(T, t) {
  const s = MUS.step % 16,
    bar = MUS.bar % T.chords.length,
    ch = T.chords[bar],
    spb = 60 / T.bpm / 4;
  if (s === 0 && T.pad)
    ch.forEach(m => musNote(m, t, spb * 15.5, { wave: T.pad.wave, vol: T.pad.vol, cut: T.pad.cut, attack: 0.25 }));
  if (s === 0 && !T.pad) ch.forEach((m, i) => musNote(m + 12, t + i * spb, spb * 1.5, { wave: "square", vol: 0.012, cut: 2500 }));
  if (T.kick.includes(s)) musKick(t, T === THEMES.arcade ? 0.18 : 0.22);
  if (T.snare.includes(s)) musNoise(t, 0.12, { freq: 1800, vol: T === THEMES.arcade ? 0.06 : 0.05, q: 0.8 });
  if (T.hat.includes(s)) musNoise(t, 0.04, { freq: 8000, type: "highpass", vol: 0.018 });
  for (const [st, iv] of T.bass)
    if (st === s)
      musNote(ch[0] - 12 + iv, t, spb * (T === THEMES.arcade ? 1.6 : 3), {
        wave: T === THEMES.arcade ? "square" : "triangle",
        vol: T === THEMES.arcade ? 0.035 : 0.09,
        cut: T === THEMES.arcade ? 900 : 500
      });
  const L = T.lead;
  if (L.steps.includes(s) && Math.random() < L.prob) {
    const sc = L.scale,
      m = sc[(bar * 2 + s + Math.floor(Math.random() * 3)) % sc.length];
    musNote(m, t, spb * (T === THEMES.arcade ? 1.8 : 3.5), { wave: L.wave, vol: L.vol, cut: T === THEMES.arcade ? 3500 : 2200 });
  }
}
export function musTick() {
  if (!AC || !MUS.theme) return;
  const T = THEMES[MUS.theme],
    spb = 60 / T.bpm / 4;
  while (MUS.next < AC.currentTime + 0.18) {
    const sw = MUS.step % 2 ? spb * T.swing : 0;
    musStep(T, MUS.next + sw);
    MUS.next += spb;
    MUS.step++;
    if (MUS.step % 16 === 0) MUS.bar++;
  }
}
export function musStop() {
  if (MUS.timer) {
    clearInterval(MUS.timer);
    MUS.timer = null;
  }
  if (MUS.g && AC) {
    const g = MUS.g;
    g.gain.setTargetAtTime(0, AC.currentTime, 0.25);
    setTimeout(() => {
      try {
        g.disconnect();
      } catch (e) {}
    }, 1200);
  }
  MUS.g = null;
  MUS.theme = null;
}
// İstenen temayı çal (null: sustur). Ses bağlamı henüz açılmadıysa ilk dokunuşta başlar.
export function musicFor(theme) {
  if (SIM()) return;
  MUS.want = theme;
  if (!theme || !SETTINGS.music || !SETTINGS.sound) {
    musStop();
    return;
  }
  if (!AC || AC.state !== "running") return;
  if (MUS.theme === theme) return;
  musStop();
  MUS.g = AC.createGain();
  MUS.g.gain.value = 0;
  MUS.g.connect(AC.destination);
  MUS.g.gain.setTargetAtTime(SETTINGS.vol * 0.55, AC.currentTime, 0.6);
  MUS.theme = theme;
  MUS.next = AC.currentTime + 0.08;
  MUS.step = 0;
  MUS.bar = 0;
  MUS.timer = setInterval(musTick, 40);
}
export function musicVolume() {
  if (MUS.g && AC) MUS.g.gain.setTargetAtTime(SETTINGS.vol * 0.55, AC.currentTime, 0.2);
}
["pointerdown", "keydown"].forEach(ev =>
  window.addEventListener(
    ev,
    () =>
      setTimeout(() => {
        if (MUS.want && !MUS.theme) musicFor(MUS.want);
      }, 60),
    { passive: true }
  )
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) musStop();
  else if (MUS.want) setTimeout(() => musicFor(MUS.want), 200);
});

/* ================= GÖRSEL CİLA =================
   - Sonuç kutularındaki sayılar sıfırdan sayarak gelir
   - Ekran geçişlerinde hafif kayma
   - Düşük grafik modu: daha düşük çözünürlük, animasyonsuz arayüz, 30 FPS mini oyunlar */
/** "₺12.450", "-3", "1,250 pts" → {pre, n, sep, post}; ondalıklı ya da sayı olmayan metin null */
function numParts(txt) {
  const m = txt.match(/^([^\d\-−]*)([-−]?)(\d{1,3}(?:([.,])\d{3})+|\d+)([^\d]*)$/);
  if (!m) return null;
  const n = +m[3].replace(/[.,]/g, "") * (m[2] ? -1 : 1);
  return { pre: m[1], sign: m[2] || "-", n, sep: m[4] || "", post: m[5] };
}
const numText = (p, v) => {
  const a = String(Math.abs(Math.round(v))),
    g = p.sep ? a.replace(/\B(?=(\d{3})+(?!\d))/g, p.sep) : a;
  return p.pre + (v < 0 ? p.sign : "") + g + p.post;
};
/** Sayaç: from → to (ease-out cubic, ~550 ms; öğe ekrandan çıkınca durur) */
function tween(el, from, to, f, D = 550) {
  const t0 = performance.now();
  const step = t => {
    if (!el.isConnected) return;
    const k = Math.min(1, (t - t0) / D),
      e = 1 - Math.pow(1 - k, 3);
    el.textContent = f(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  el.textContent = f(from);
  requestAnimationFrame(step);
}
// panel sayaçlarının son gösterilen değeri (panel adı + sıra): değişmeyen sayı yeniden sayılmaz, değişen öncekinden sayar
const CU = new Map();
export function countUp(root) {
  if (!root) return;
  const dlg = root.querySelector("[role=dialog]"),
    scope = (dlg && dlg.getAttribute("aria-label")) || "";
  const still = SETTINGS.lowfx || motionReduced();
  root.querySelectorAll(".box b, .big-num").forEach((el, i) => {
    const p = numParts(el.textContent.trim());
    if (!p) return;
    const key = `${scope}|${i}`,
      prev = CU.get(key);
    CU.set(key, p.n);
    if (CU.size > 400) CU.delete(CU.keys().next().value);
    if (still || prev === p.n) return;
    const from = prev == null ? 0 : prev;
    if (Math.abs(p.n - from) < 2) return;
    tween(el, from, p.n, v => numText(p, v));
  });
}
/* ---- ana ekran sayaçları: para, enerji, moral ----
   Önceki değerler ana ekran çiziminden bağımsız saklanır (kariyer kimliğine bağlı). Değer değişince öncekinden yeniye
   ~500 ms sayılır ve kısa bir "+X"/"−X" etiketi yükselip söner (yalnız transform/opacity). Düşük grafik/hareketi
   azalt'ta sayılmaz. */
const HV = { cid: null, money: 0, energy: 0, moral: 0 };
function hudFly(host, txt, up) {
  if (!host) return;
  const s = document.createElement("span");
  s.className = `hfly ${up ? "up" : "dn"}`;
  s.setAttribute("aria-hidden", "true");
  s.textContent = txt;
  host.appendChild(s);
  const a = motionPlay(
    s,
    [
      { opacity: 0, transform: "translateY(6px)" },
      { opacity: 1, transform: "translateY(-6px)", offset: 0.25 },
      { opacity: 1, transform: "translateY(-12px)", offset: 0.7 },
      { opacity: 0, transform: "translateY(-18px)" }
    ],
    { key: "fly", opts: { duration: 900, easing: MOTION.out } }
  );
  if (a) a.onfinish = () => s.remove();
  else s.remove();
}
export function hudCount() {
  if (!S) return;
  const cur = { money: S.money, energy: S.energy, moral: S.moral },
    prev = HV.cid === S.cid ? { ...HV } : null;
  Object.assign(HV, cur, { cid: S.cid });
  if (!prev || SIM() || motionReduced()) return;
  const mb = $(".hud-money b");
  if (mb && Math.round(cur.money * 40) !== Math.round(prev.money * 40)) {
    tween(mb, prev.money, cur.money, fmt);
    const d = cur.money - prev.money;
    hudFly(mb.parentElement, (d > 0 ? "+" : "") + fmt(d), d > 0);
  }
  [
    ["energy", 1],
    ["moral", 2]
  ].forEach(([k, n]) => {
    const hs = document.querySelector(`.hud-stats .hs:nth-child(${n})`),
      d = cur[k] - prev[k];
    if (!hs || !d) return;
    const v = hs.querySelector(".v"),
      bar = hs.querySelector(".mt i");
    if (v) tween(v, prev[k], cur[k], x => String(Math.round(x)), 450);
    if (bar) {
      // çubuk önceki dolulukta başlar, bir sonraki karede yeni değere geçer (transform geçişi)
      bar.style.setProperty("--w", String(prev[k]));
      requestAnimationFrame(() => requestAnimationFrame(() => bar.isConnected && bar.style.setProperty("--w", String(cur[k]))));
    }
    hudFly(hs, (d > 0 ? "+" : "−") + Math.abs(d), d > 0);
  });
}
/** Ana ekran girişi: yalnız başka bir ekrandan gelince; parçalar sırayla belirip 8 px yukarı kayar (WAAPI, yeniden
    yerleşim zorlamadan). Alttaki sabit eylem çubuğunun ataları dönüştürülmez (sabit konum kapsayıcısı olmasın). */
function enterMain() {
  if (motionReduced()) return;
  const parts = [$(".hud"), $(".mapcol"), ...app.querySelectorAll(".wkstick>:not(.actbar),.wkcol>:not(.wkstick)")].filter(Boolean);
  parts.slice(0, 8).forEach((el, i) =>
    motionPlay(el, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
      key: "enter",
      opts: { duration: MOTION.med, delay: Math.min(i, 4) * 30, easing: MOTION.out, fill: "backwards" }
    })
  );
}
export function applyLowFx() {
  document.body.classList.toggle("lowfx", !!SETTINGS.lowfx);
}
// Olaylara bağlantı: panel açılınca sayılar canlanır; ekrana göre müzik teması değişir
Bus.on("sheet:open", el => countUp(el));
Bus.on("screen:main", o => {
  musicFor("menu");
  if (o && o.fresh) enterMain();
  hudCount();
});
Bus.on("screen:slots", () => musicFor("menu"));
Bus.on("match:start", () => musicFor(null));
Bus.on("place:open", () => musicFor("arcade"));
Bus.on("arcade:start", () => setTimeout(() => musicFor("arcade"), 0));
Bus.on("sheet:close", () => {
  if (MUS.theme === "arcade" && S && $("#gostad")) musicFor("menu");
});
window.addEventListener("load", applyLowFx);
