import { t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { $, $$, INK, clamp, ri, shade, GOOD, BAD } from "./data.js";
import { tok, tokAlpha } from "./theme.js";
import { hapticError } from "./motion.js";
import { drawBall, drawKid, ell, rr } from "./art.js";
import { ARENA, CV, CX, H, W, bigText, buzz, finish, hint, info, loop, lvl, mkStage, ppos, setMgKind } from "./games.js";
import { S, jersey } from "./core.js";
/* ================= ARCADE OYUNLARI =================
   Her karede gölge/ışıma (shadowBlur) yok: mobilde takılmanın ana sebebiydi.
   Parlama efekti yarı saydam halkalarla veriliyor. */
export const halo = (c, x, y, r, col, a = 0.25) => {
  c.globalAlpha = a;
  ell(c, x, y, r, r, col, 0, false);
  c.globalAlpha = 1;
};

/* ---- Güç oku: geriye çekerken yön ve gücü gösterir ---- */
// p: 0..1 güç, ideal: [alt, üst] yeşil bölge
export function powerArrow(c, x, y, dx, dy, p, ideal = [0.55, 0.8]) {
  const m = Math.hypot(dx, dy) || 1,
    ux = dx / m,
    uy = dy / m,
    len = 34 + p * 110;
  const col = p >= ideal[0] && p <= ideal[1] ? GOOD() : p < ideal[0] ? (p < ideal[0] * 0.6 ? BAD() : tok("--warn")) : BAD();
  const ex = x + ux * len,
    ey = y + uy * len;
  c.save();
  c.lineCap = "round";
  c.globalAlpha = 0.25;
  c.strokeStyle = col;
  c.lineWidth = 14;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(ex, ey);
  c.stroke();
  c.globalAlpha = 1;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(ex, ey);
  c.stroke();
  const ax = -uy,
    ay = ux;
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(ex + ux * 14, ey + uy * 14);
  c.lineTo(ex + ax * 9, ey + ay * 9);
  c.lineTo(ex - ax * 9, ey - ay * 9);
  c.closePath();
  c.fill();
  // güç göstergesi: sağ kenardan içeride (Android kenar geri hareketiyle çakışmasın), kalın; potanın altında
  const gw = 16,
    gx = W - 46 - gw / 2,
    gy = H / 2 + 16,
    gh = 140;
  rr(c, gx, gy, gw, gh, 8, "rgba(5,8,14,.75)", false);
  c.fillStyle = tokAlpha("--good", 0.35);
  c.fillRect(gx, gy + gh * (1 - ideal[1]), gw, gh * (ideal[1] - ideal[0]));
  rr(c, gx, gy + gh * (1 - p), gw, Math.max(3, gh * p), 8, col, false);
  c.fillStyle = tok("--text");
  c.font = "700 11px Manrope";
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillText(`%${Math.round(p * 100)}`, gx + gw / 2, gy + gh + 16);
  c.fillText($t("arcade.1"), gx + gw / 2, gy - 6);
  c.restore();
  return col;
}
export function slingBand(c, bx, by, px, py) {
  c.save();
  c.strokeStyle = "rgba(255,255,255,.35)";
  c.lineWidth = 2;
  c.setLineDash([4, 5]);
  c.beginPath();
  c.moveTo(bx - 10, by);
  c.lineTo(px, py);
  c.lineTo(bx + 10, by);
  c.stroke();
  c.setLineDash([]);
  c.restore();
}

/* ---- Pota makinesi: geriye çek, bırak ---- */
export function mgArcade(el) {
  setMgKind("arcade");
  mkStage(el, $t("arcade.2"));
  return new Promise(res => {
    const DUR = 30,
      HY = 112,
      BY = 345,
      IDEAL = [0.55, 0.8];
    let score = 0,
      shots = 0,
      t = 0,
      phase = 0,
      flash = 0,
      msg = "",
      msgGood = false,
      mt = 0,
      drag = null,
      ball = null,
      cool = 0;
    const pull = () => {
      const dx = drag.x0 - drag.x,
        dy = drag.y0 - drag.y;
      return { dx, dy, p: clamp(Math.hypot(dx, dy) / 150, 0, 1) };
    };
    CV.onpointerdown = e => {
      if (ball || cool > 0) return;
      const q = ppos(e);
      drag = { x0: q.x, y0: q.y, x: q.x, y: q.y };
      try {
        CV.setPointerCapture(e.pointerId);
      } catch (_) {}
    };
    CV.onpointermove = e => {
      if (!drag) return;
      const q = ppos(e);
      drag.x = q.x;
      drag.y = q.y;
    };
    CV.onpointerup = CV.onpointercancel = () => {
      if (!drag) return;
      const { dx, dy, p } = pull();
      drag = null;
      if (p < 0.12 || dy >= -8) return;
      const k = (BY - HY) / -dy,
        tx = clamp(180 + dx * k, 24, 336),
        reach = p / ((IDEAL[0] + IDEAL[1]) / 2);
      ball = { tx, reach, t: 0, dur: 0.5 };
      shots++;
      buzz(8);
      late.sfx("throw");
    };
    const stop = loop((dt, T) => {
      const c = CX;
      t += dt;
      cool -= dt;
      phase += dt * (0.9 + Math.min(score, 20) * 0.05);
      const hx = 180 + Math.sin(phase) * 95;
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1a0f33");
      g.addColorStop(1, "#0a0616");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "#ff3fa4";
      c.lineWidth = 4;
      c.strokeRect(10, 10, W - 20, H - 20);
      c.globalAlpha = 0.25;
      c.lineWidth = 10;
      c.strokeRect(10, 10, W - 20, H - 20);
      c.globalAlpha = 1;
      c.strokeStyle = "rgba(120,90,255,.3)";
      c.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(60 + i * 34, H - 20);
        c.lineTo(150 + i * 8, 150);
        c.stroke();
      }
      rr(c, hx - 44, 38, 88, 56, 4, "rgba(230,240,255,.92)", false);
      c.strokeStyle = "#ff5a1c";
      c.lineWidth = 2;
      c.strokeRect(hx - 15, 58, 30, 22);
      c.lineWidth = 1.2;
      c.strokeStyle = "#fff";
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(hx + i * 10, HY + 2);
        c.lineTo(hx + i * 6, HY + 22);
        c.stroke();
      }
      c.strokeStyle = "#ff5a1c";
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(hx, HY, 26, 7, 0, 0, 7);
      c.stroke();
      if (ball) {
        ball.t += dt;
        const p = Math.min(1, ball.t / ball.dur),
          r = ball.reach;
        const endY = r < 0.86 ? BY + (HY - BY) * r : r > 1.16 ? HY - 34 : HY;
        const x = 180 + (ball.tx - 180) * p,
          y = BY + (endY - BY) * p - Math.sin(p * Math.PI) * 70 * Math.min(1.2, r),
          s = 1 - p * 0.55 * Math.min(1, r);
        drawBall(c, x, y, 16 * s, T * 6);
        if (p >= 1) {
          const close = Math.abs(ball.tx - hx) < 25;
          let made = false;
          if (r < 0.86) ((msg = $t("arcade.3")), (msgGood = false));
          else if (r > 1.16) {
            made = close && Math.random() < 0.3;
            ((msg = made ? $t("arcade.4") : $t("arcade.5")), (msgGood = !!made));
          } else {
            made = close;
            ((msg = made ? $t("arcade.6") : $t("arcade.7")), (msgGood = !!made));
          }
          if (made) {
            score++;
            flash = 0.6;
            buzz(15);
            late.sfx("swish");
          } else late.sfx(r > 1.16 ? "board" : "rim");
          mt = 0.7;
          ball = null;
          cool = 0.15;
        }
      } else {
        if (drag) {
          const { dx, dy, p } = pull();
          const bx = 180 + clamp(drag.x - drag.x0, -40, 40) * 0.4,
            by = BY + clamp(drag.y - drag.y0, 0, 60) * 0.4;
          slingBand(c, 180, BY, bx, by);
          drawBall(c, bx, by, 16, 0);
          if (dy < -8) powerArrow(c, 180, BY - 20, dx, dy, p, IDEAL);
        } else drawBall(c, 180, BY, 16, 0);
      }
      rr(c, W / 2 - 78, H - 72, 156, 46, 8, "#05020b", false);
      c.font = '800 30px "Barlow Condensed"';
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.fillStyle = "#ff4d3a";
      c.fillText(String(score).padStart(2, "0"), W / 2 - 34, H - 38);
      c.fillStyle = "#7cfc9a";
      c.fillText(String(Math.max(0, Math.ceil(DUR - t))).padStart(2, "0"), W / 2 + 36, H - 38);
      c.font = "600 9px Manrope";
      c.fillStyle = tok("--muted");
      c.fillText($t("arcade.8"), W / 2 - 34, H - 28);
      c.fillText($t("arcade.9"), W / 2 + 36, H - 28);
      if (flash > 0) {
        c.fillStyle = `rgba(255,63,164,${flash * 0.18})`;
        c.fillRect(0, 0, W, H);
        flash -= dt * 2;
      }
      if (mt > 0) {
        bigText(c, msg, 232, msgGood ? tok("--warn") : "#ffffff");
        mt -= dt;
      }
      if (t < 4 && !drag) hint(c, $t("arcade.10"), 190);
      if (t >= DUR && !ball)
        finish(stop, res, {
          score,
          label: $t("arcade.32", {
            score: score,
            shots: shots
          })
        });
      info(
        $t("arcade.11", {
          arcade: S.rec.arcade
        })
      );
    });
  });
}
/* ---- Refleks paneli ---- */
export function mgReflex(el) {
  setMgKind("reflex");
  mkStage(el, $t("arcade.12"));
  return new Promise(res => {
    const DUR = 20;
    let score = 0,
      t = 0,
      lit = [],
      miss = 0,
      pulse = {};
    const pos = Array.from({ length: 9 }, (_, i) => ({ x: 70 + (i % 3) * 110, y: 150 + Math.floor(i / 3) * 110 }));
    const add = () => {
      let k;
      do k = ri(0, 8);
      while (lit.some(l => l.k === k));
      lit.push({ k, life: Math.max(0.55, 1.1 - t * 0.025) });
    };
    add();
    CV.onpointerdown = e => {
      const p = ppos(e);
      const k = pos.findIndex(q => Math.hypot(q.x - p.x, q.y - p.y) < 48);
      if (k < 0) return;
      const i = lit.findIndex(l => l.k === k);
      pulse[k] = 0.25;
      if (i >= 0) {
        lit.splice(i, 1);
        score++;
        buzz(6);
        late.sfx("blip");
        if (!lit.length) add();
      } else {
        score = Math.max(0, score - 1);
        miss = 0.25;
        hapticError();
        late.sfx("error");
      }
    };
    const stop = loop((dt, T) => {
      const c = CX;
      t += dt;
      lit.forEach(l => (l.life -= dt));
      if (lit.some(l => l.life <= 0)) {
        lit = lit.filter(l => l.life > 0);
        if (!lit.length) add();
      }
      if (t > 8 && lit.length < 2 && Math.random() < dt * 0.8) add();
      c.fillStyle = "#0c0a1c";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#ffd54f";
      c.font = '800 22px "Barlow Condensed"';
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.fillText(
        $t("arcade.13", {
          score: score,
          v: Math.max(0, DUR - t).toFixed(1)
        }),
        W / 2,
        60
      );
      pos.forEach((q, i) => {
        const on = lit.some(l => l.k === i);
        if (on) halo(c, q.x, q.y, 54, "#29b6f6", 0.22);
        ell(c, q.x, q.y, 40, 40, on ? "#29b6f6" : "#1e1a38", 0, false);
        c.lineWidth = 3;
        c.strokeStyle = pulse[i] > 0 ? "#fff" : "#3a3266";
        c.beginPath();
        c.arc(q.x, q.y, 40, 0, 7);
        c.stroke();
        if (pulse[i] > 0) pulse[i] -= dt;
      });
      if (miss > 0) {
        c.fillStyle = tokAlpha("--bad", miss);
        c.fillRect(0, 0, W, H);
        miss -= dt;
      }
      if (t < 2.5) hint(c, $t("arcade.14"), H - 30);
      if (t >= DUR) finish(stop, res, { score });
      info(
        $t("arcade.15", {
          reflex: S.rec.reflex
        })
      );
    });
  });
}
/* ---- Hava hokeyi ---- */
export function mgHockey(el) {
  setMgKind("hockey");
  mkStage(el, $t("arcade.16"));
  return new Promise(res => {
    const R = 26,
      PR = 12,
      GW = 64,
      MAXV = 720,
      TOP = 12,
      BOT = H - 12,
      L = 12,
      RT = W - 12;
    const P = { x: 180, y: 410, tx: 180, ty: 410, vx: 0, vy: 0 },
      A = { x: 180, y: 80, vx: 0, vy: 0 },
      pk = { x: 180, y: 240, vx: 0, vy: 0 };
    let me = 0,
      ai = 0,
      t = 0,
      msg = "",
      mt = 0,
      pause = 0.8,
      slow = 0,
      trail = [];
    const reset = dir => {
      pk.x = 180;
      pk.y = dir > 0 ? 290 : 190;
      pk.vx = 0;
      pk.vy = 0;
      pause = 0.8;
      trail = [];
    };
    const setT = e => {
      const p = ppos(e);
      P.tx = clamp(p.x, L + R, RT - R);
      P.ty = clamp(p.y, 252 + R, BOT - R);
    };
    CV.onpointerdown = e => {
      setT(e);
      try {
        CV.setPointerCapture(e.pointerId);
      } catch (_) {}
    };
    CV.onpointermove = e => {
      if (e.buttons || e.pointerType === "touch") setT(e);
    };
    const collide = m => {
      const dx = pk.x - m.x,
        dy = pk.y - m.y,
        d = Math.hypot(dx, dy),
        min = R + PR;
      if (d < min && d > 0) {
        const nx = dx / d,
          ny = dy / d;
        pk.x = m.x + nx * min;
        pk.y = m.y + ny * min;
        const rvx = pk.vx - m.vx,
          rvy = pk.vy - m.vy,
          vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          pk.vx -= 1.9 * vn * nx;
          pk.vy -= 1.9 * vn * ny;
        }
        pk.vx += nx * 70;
        pk.vy += ny * 70;
        // pak duvarla raket arasında sıkıştıysa raketi geri it
        late.sfx("puck");
        if (pk.x <= L + PR + 0.5 || pk.x >= RT - PR - 0.5 || pk.y <= TOP + PR + 0.5 || pk.y >= BOT - PR - 0.5) {
          m.x -= nx * 6;
          m.y -= ny * 6;
        }
        buzz(5);
      }
    };
    const stop = loop((dt, T) => {
      const c = CX;
      t += dt;
      const nx = P.x + (P.tx - P.x) * Math.min(1, dt * 22),
        ny = P.y + (P.ty - P.y) * Math.min(1, dt * 22);
      P.vx = (nx - P.x) / dt;
      P.vy = (ny - P.y) / dt;
      P.x = nx;
      P.y = ny;
      // yapay zekâ: pakın arkasına geçip oyuncunun kalesine doğru vurur
      const sp = 190 + lvl() * 20,
        minY = TOP + R,
        maxY = 232 - R;
      let gx, gy;
      if (pk.y < 250) {
        const ang = Math.atan2(BOT - pk.y, 180 - pk.x);
        gx = pk.x - Math.cos(ang) * (R + PR - 4);
        gy = pk.y - Math.sin(ang) * (R + PR - 4);
        if (gy < minY) {
          gy = minY;
          gx = pk.x + (pk.x < 180 ? -(R + 2) : R + 2);
        } // pak AI'nın üstünde kaldı: yandan vur
        if (Math.hypot(A.x - gx, A.y - gy) < 6) {
          gx = pk.x;
          gy = pk.y;
        }
      } // arkasına geçti: vur
      else {
        gx = 180 + (pk.x - 180) * 0.35;
        gy = 70;
      }
      const ax = clamp(gx - A.x, -sp * dt, sp * dt),
        ay = clamp(gy - A.y, -sp * dt, sp * dt);
      A.vx = ax / dt;
      A.vy = ay / dt;
      A.x = clamp(A.x + ax, L + R, RT - R);
      A.y = clamp(A.y + ay, minY, maxY);
      if (pause > 0) pause -= dt;
      else {
        const steps = 4;
        for (let s = 0; s < steps; s++) {
          const h = dt / steps;
          pk.x += pk.vx * h;
          pk.y += pk.vy * h;
          if (pk.x < L + PR) {
            pk.x = L + PR;
            pk.vx = Math.abs(pk.vx) * 0.9;
          }
          if (pk.x > RT - PR) {
            pk.x = RT - PR;
            pk.vx = -Math.abs(pk.vx) * 0.9;
          }
          if (pk.y < TOP + PR) {
            if (Math.abs(pk.x - 180) < GW) {
              me++;
              msg = $t("arcade.17");
              mt = 1;
              buzz(30);
              late.sfx("cheer");
              reset(-1);
              break;
            }
            pk.y = TOP + PR;
            pk.vy = Math.abs(pk.vy) * 0.9;
          }
          if (pk.y > BOT - PR) {
            if (Math.abs(pk.x - 180) < GW) {
              ai++;
              msg = $t("arcade.18");
              mt = 1;
              late.sfx("buzzer");
              reset(1);
              break;
            }
            pk.y = BOT - PR;
            pk.vy = -Math.abs(pk.vy) * 0.9;
          }
          collide(P);
          collide(A);
        }
        pk.vx *= 1 - dt * 0.3;
        pk.vy *= 1 - dt * 0.3;
        const m = Math.hypot(pk.vx, pk.vy);
        if (m > MAXV) {
          pk.vx *= MAXV / m;
          pk.vy *= MAXV / m;
        }
        // köşede ya da duvar dibinde duran pak: merkeze doğru it
        const nearWall = pk.x < L + PR + 30 || pk.x > RT - PR - 30 || pk.y < TOP + PR + 30 || pk.y > BOT - PR - 30;
        slow = m < 60 ? slow + dt : 0;
        if (slow > (nearWall ? 1 : 2.2)) {
          const a = Math.atan2(240 - pk.y, 180 - pk.x);
          pk.vx = Math.cos(a) * 220;
          pk.vy = Math.sin(a) * 220;
          slow = 0;
        }
        trail.push([pk.x, pk.y]);
        if (trail.length > 8) trail.shift();
      }
      c.fillStyle = "#0b3b2a";
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "rgba(232,245,238,.9)";
      c.lineWidth = 3;
      c.strokeRect(L, TOP, RT - L, BOT - TOP);
      c.beginPath();
      c.moveTo(L, 240);
      c.lineTo(RT, 240);
      c.stroke();
      c.beginPath();
      c.arc(180, 240, 46, 0, 7);
      c.stroke();
      c.fillStyle = "#05080e";
      c.fillRect(180 - GW, 4, GW * 2, 10);
      c.fillRect(180 - GW, H - 14, GW * 2, 10);
      trail.forEach(([x, y], i) => {
        c.globalAlpha = (i / trail.length) * 0.25;
        ell(c, x, y, PR, PR, "#eef2f8", 0, false);
      });
      c.globalAlpha = 1;
      halo(c, A.x, A.y, R + 8, "#29b6f6", 0.18);
      ell(c, A.x, A.y, R, R, "#29b6f6", 0, false);
      ell(c, A.x, A.y, 11, 11, "#0277bd", 0, false);
      halo(c, P.x, P.y, R + 8, ARENA.home, 0.18);
      ell(c, P.x, P.y, R, R, ARENA.home, 0, false);
      ell(c, P.x, P.y, 11, 11, shade(ARENA.home, -50), 0, false);
      ell(c, pk.x, pk.y, PR, PR, "#141414", 0, false);
      c.strokeStyle = "#555";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(pk.x, pk.y, PR - 3, 0, 7);
      c.stroke();
      c.fillStyle = "#fff";
      c.font = '800 34px "Barlow Condensed"';
      c.textAlign = "right";
      c.textBaseline = "alphabetic";
      c.fillText(ai, W - 26, 226);
      c.fillText(me, W - 26, 284);
      if (mt > 0) {
        bigText(c, msg, 256, msg === $t("arcade.17") ? tok("--warn") : "#ffffff");
        mt -= dt;
      }
      if (t < 3) hint(c, $t("arcade.19"), H - 44);
      if (me >= 5 || ai >= 5 || t >= 75) finish(stop, res, { score: me, win: me > ai, label: `${me}–${ai}` });
      info(
        $t("arcade.34", {
          v: Math.max(0, 75 - t).toFixed(0)
        })
      );
    });
  });
}
/* ---- Dans ritmi / karaoke ---- */
export function mgRhythm(el, { title, karaoke }) {
  setMgKind("rhythm");
  mkStage(el, title);
  return new Promise(res => {
    const lanes = [54, 138, 222, 306],
      cols = ["#ff3fa4", "#29b6f6", "#ffd54f", "#66bb6a"],
      HY = 400,
      DUR = 24,
      SPEED = 250;
    let notes = [],
      t = 0,
      score = 0,
      combo = 0,
      best = 0,
      fb = "",
      ft = 0,
      hits = 0,
      total = 0;
    const flashL = [0, 0, 0, 0];
    // sabit tempolu desen: notalar 4 vuruşluk ölçülere oturur
    const beat = 0.5;
    for (let k = 2; k < DUR / beat - 3; k++) {
      if (k % 8 === 7) continue;
      const l = (k * 3 + Math.floor(k / 4)) % 4;
      notes.push({ l, at: k * beat });
      if (k > 16 && k % 4 === 0) notes.push({ l: (l + 2) % 4, at: k * beat });
      total++;
    }
    total = notes.length;
    const press = l => {
      flashL[l] = 0.15;
      const yOf = n => HY - (n.at - t) * SPEED;
      const cand = notes
        .filter(n => n.l === l && !n.hit && !n.miss)
        .sort((a, b) => Math.abs(yOf(a) - HY) - Math.abs(yOf(b) - HY))[0];
      if (cand && Math.abs(yOf(cand) - HY) < 46) {
        cand.hit = true;
        hits++;
        const pf = Math.abs(yOf(cand) - HY) < 20;
        score += pf ? 2 : 1;
        combo++;
        best = Math.max(best, combo);
        fb = pf ? $t("arcade.20") : $t("arcade.21");
        ft = 0.35;
        buzz(5);
        late.sfx("note", l);
      } else {
        combo = 0;
        fb = $t("arcade.22");
        ft = 0.25;
      }
    };
    $("#mgC").innerHTML = lanes
      .map(
        (_, i) =>
          `<button class="btn" data-l="${i}" style="background:${cols[i]};border-color:${cols[i]};color:#141414" aria-label="${$t("rc.a11y.lane", { n: i + 1 })}">●</button>`
      )
      .join("");
    $$("#mgC [data-l]").forEach(
      b =>
        (b.onpointerdown = e => {
          e.preventDefault();
          press(+b.dataset.l);
        })
    );
    CV.onpointerdown = e => {
      const p = ppos(e);
      press(clamp(Math.floor(p.x / 90), 0, 3));
    };
    window.onkeydown = e => {
      const k = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, d: 0, f: 1, j: 2, k: 3 }[e.key];
      if (k != null) {
        e.preventDefault();
        press(k);
      }
    };
    const stop = loop((dt, T) => {
      const c = CX;
      t += dt;
      notes.forEach(n => {
        if (!n.hit && !n.miss && HY - (n.at - t) * SPEED > HY + 50) {
          n.miss = true;
          combo = 0;
        }
      });
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, karaoke ? "#2a0a2e" : "#110a2a");
      g.addColorStop(1, "#05030c");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      if (karaoke) drawKid(c, 180, 250, 0.7, S.look, { ...jersey(), armsUp: Math.floor(t / beat) % 2 === 0, mood: "mutlu" });
      lanes.forEach((x, i) => {
        c.fillStyle = `rgba(255,255,255,${0.035 + flashL[i]})`;
        c.fillRect(x - 38, 0, 76, H);
        flashL[i] = Math.max(0, flashL[i] - dt);
        c.strokeStyle = cols[i];
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, HY, 26, 0, 7);
        c.stroke();
        c.globalAlpha = 0.25;
        c.lineWidth = 9;
        c.stroke();
        c.globalAlpha = 1;
      });
      notes.forEach(n => {
        if (n.hit) return;
        const y = HY - (n.at - t) * SPEED;
        if (y < -30 || y > H + 30) return;
        c.globalAlpha = n.miss ? 0.25 : 1;
        halo(c, lanes[n.l], y, 30, cols[n.l], n.miss ? 0.05 : 0.2);
        c.globalAlpha = n.miss ? 0.25 : 1;
        ell(c, lanes[n.l], y, 22, 22, cols[n.l], 0, false);
        c.globalAlpha = 1;
      });
      c.fillStyle = "#fff";
      c.font = '800 22px "Barlow Condensed"';
      c.textBaseline = "alphabetic";
      c.textAlign = "left";
      c.fillText(
        $t("arcade.23", {
          score: score
        }),
        16,
        36
      );
      c.textAlign = "right";
      c.fillText(
        $t("arcade.24", {
          combo: combo
        }),
        W - 16,
        36
      );
      if (ft > 0) {
        bigText(c, fb, 330, fb === $t("arcade.22") ? BAD() : tok("--warn"), 28);
        ft -= dt;
      }
      if (t < 2.2) hint(c, $t("arcade.25"), H - 14);
      if (t >= DUR)
        finish(stop, res, {
          score,
          label: $t("arcade.33", {
            hits: hits,
            total: total,
            best: best
          })
        });
      info(
        $t("arcade.34", {
          v: Math.max(0, DUR - t).toFixed(0)
        })
      );
    });
  });
}
/* ---- Bowling: geriye çek, nişan al, bırak ---- */
export function mgBowling(el) {
  setMgKind("bowling");
  mkStage(el, $t("arcade.26"));
  return new Promise(res => {
    const ROLLS = 3,
      BX = 180,
      BY = 430,
      IDEAL = [0.6, 0.85];
    let roll = 0,
      total = 0,
      ph = "aim",
      t = 0,
      drag = null,
      ball = null,
      pins = [],
      msg = "",
      mt = 0;
    const setPins = () => {
      pins = [];
      [[180], [166, 194], [152, 180, 208], [138, 166, 194, 222]].forEach((r, k) =>
        r.forEach(x => pins.push({ x, y: 120 - k * 16, up: true, fall: 0, dir: Math.random() < 0.5 ? -1 : 1 }))
      );
    };
    setPins();
    const pull = () => {
      const dx = drag.x0 - drag.x,
        dy = drag.y0 - drag.y;
      return { dx, dy, p: clamp(Math.hypot(dx, dy) / 160, 0, 1) };
    };
    CV.onpointerdown = e => {
      if (ph !== "aim") return;
      const q = ppos(e);
      drag = { x0: q.x, y0: q.y, x: q.x, y: q.y };
      try {
        CV.setPointerCapture(e.pointerId);
      } catch (_) {}
    };
    CV.onpointermove = e => {
      if (!drag) return;
      const q = ppos(e);
      drag.x = q.x;
      drag.y = q.y;
    };
    CV.onpointerup = CV.onpointercancel = () => {
      if (!drag) return;
      const { dx, dy, p } = pull();
      drag = null;
      if (p < 0.12 || dy >= -8) return;
      const aimX = clamp(BX + dx * ((BY - 140) / -dy) * 0.35, 130, 230);
      ball = { x: BX, y: BY, s: 1, sx: BX, aimX, pow: p };
      ph = "roll";
      buzz(8);
      late.sfx("roll");
    };
    const stop = loop((dt, T) => {
      const c = CX;
      t += dt;
      if (ph === "roll") {
        const sp = 300 + ball.pow * 460;
        ball.y -= sp * dt;
        const prog = clamp((BY - ball.y) / (BY - 140), 0, 1);
        ball.x = ball.sx + (ball.aimX - ball.sx) * prog;
        ball.s = clamp(0.45 + ((ball.y - 80) / 350) * 0.55, 0.45, 1);
        if (ball.y < 140) {
          let knocked = 0;
          const pw = ball.pow,
            over = pw > IDEAL[1] ? (pw - IDEAL[1]) * 1.5 : 0,
            under = pw < IDEAL[0] ? (IDEAL[0] - pw) * 1.6 : 0;
          pins.forEach(p => {
            const d = Math.abs(p.x - ball.x);
            const ch = clamp((1 - d / (58 + pw * 36)) * (1 - under - over * 0.5) + (1 - Math.abs(ball.x - 180) / 90) * 0.2, 0, 1);
            if (Math.random() < ch) {
              p.up = false;
              knocked++;
            }
          });
          total += knocked;
          msg =
            knocked === 10
              ? $t("arcade.27")
              : knocked
                ? $t("arcade.35", {
                    knocked: knocked
                  })
                : $t("arcade.28");
          mt = 1.3;
          ph = "show";
          t = 0;
          buzz(knocked > 5 ? 25 : 8);
          late.sfx(knocked === 10 ? "strike" : knocked ? "pin" : "error");
        }
      }
      pins.forEach(p => {
        if (!p.up && p.fall < 1) p.fall = Math.min(1, p.fall + dt * 4);
      });
      if (ph === "show" && t > 1.5) {
        roll++;
        if (roll >= ROLLS) {
          finish(stop, res, {
            score: total,
            label: $t("arcade.36", {
              total: total
            })
          });
          return;
        }
        setPins();
        ball = null;
        ph = "aim";
        t = 0;
      }
      c.fillStyle = "#140d08";
      c.fillRect(0, 0, W, H);
      c.beginPath();
      c.moveTo(120, 60);
      c.lineTo(240, 60);
      c.lineTo(330, H);
      c.lineTo(30, H);
      c.closePath();
      const g = c.createLinearGradient(0, 60, 0, H);
      g.addColorStop(0, "#c08a52");
      g.addColorStop(1, "#e2b27a");
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = "rgba(0,0,0,.15)";
      c.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        c.beginPath();
        c.moveTo(120 + i * 15, 60);
        c.lineTo(30 + i * 37.5, H);
        c.stroke();
      }
      c.fillStyle = "#2a1c12";
      c.beginPath();
      c.moveTo(108, 60);
      c.lineTo(120, 60);
      c.lineTo(30, H);
      c.lineTo(8, H);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(240, 60);
      c.lineTo(252, 60);
      c.lineTo(352, H);
      c.lineTo(330, H);
      c.closePath();
      c.fill();
      pins.forEach(p => {
        c.save();
        c.translate(p.x, p.y + 11);
        c.rotate(p.fall * 1.3 * p.dir);
        c.globalAlpha = 1 - p.fall * 0.4;
        c.lineWidth = 1.5;
        c.strokeStyle = INK;
        ell(c, 0, -11, 5, 11, "#fff");
        c.fillStyle = "#e53935";
        c.fillRect(-5, -16, 10, 2);
        c.restore();
      });
      if (ph === "aim") {
        let bx = BX,
          by = BY;
        if (drag) {
          const { dx, dy, p } = pull();
          bx = BX + clamp(drag.x - drag.x0, -30, 30) * 0.4;
          by = BY + clamp(drag.y - drag.y0, 0, 40) * 0.4;
          slingBand(c, BX, BY, bx, by);
          if (dy < -8) {
            const aimX = clamp(BX + dx * ((BY - 140) / -dy) * 0.35, 130, 230);
            c.setLineDash([6, 6]);
            c.strokeStyle = "rgba(255,255,255,.55)";
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(BX, BY - 20);
            c.lineTo(aimX, 140);
            c.stroke();
            c.setLineDash([]);
            powerArrow(c, BX, BY - 22, dx, dy, p, IDEAL);
          }
        }
        c.lineWidth = 2;
        c.strokeStyle = INK;
        ell(c, bx, by, 16, 16, "#3949ab");
        if (!drag) hint(c, $t("arcade.29"), 40);
      }
      if (ball) {
        c.lineWidth = 2;
        c.strokeStyle = INK;
        ell(c, ball.x, ball.y, 16 * ball.s, 16 * ball.s, "#3949ab");
      }
      if (mt > 0) {
        bigText(c, msg, 250, tok("--warn"));
        mt -= dt;
      }
      c.fillStyle = "#fff";
      c.font = '800 20px "Barlow Condensed"';
      c.textAlign = "left";
      c.textBaseline = "alphabetic";
      c.fillText(
        $t("arcade.30", {
          v: Math.min(roll + 1, ROLLS),
          ROLLS: ROLLS,
          total: total
        }),
        16,
        H - 16
      );
      info(
        $t("arcade.31", {
          v: S.rec.bowling || 0
        })
      );
    });
  });
}
