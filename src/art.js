import { t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { INK, fmt, hash, luma, shade } from "./data.js";
/* ================= KARAKTER ÇİZİMİ (South Park kesik kağıt tarzı) ================= */
export const SKINS = ["#f9dcc2", "#f1c9a5", "#d9a477", "#a8714b", "#6e452c"];
export function ell(c, x, y, rx, ry, f, rot = 0, st = true) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (f) {
    c.fillStyle = f;
    c.fill();
  }
  if (st) c.stroke();
}
export function rr(c, x, y, w, h, r, f, st = true) {
  c.beginPath();
  c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h);
  if (f) {
    c.fillStyle = f;
    c.fill();
  }
  if (st) c.stroke();
}
export function drawKid(c, x, y, s, L, o = {}) {
  c.save();
  c.translate(x, y);
  c.scale(s * (o.flip ? -1 : 1), s);
  c.lineWidth = 2.2;
  c.strokeStyle = INK;
  c.lineJoin = "round";
  c.lineCap = "round";
  const sk = L.skin,
    jc = o.jersey || "#2f63c7",
    tY = o.adult ? -84 : -66,
    hY = tY - 26;
  if (!o.noLegs) {
    ell(c, -11, -4, 12, 5, INK);
    ell(c, 11, -4, 12, 5, INK);
    rr(c, -21, -28, 42, 23, 4, o.pants || shade(jc, -45));
  }
  [
    [-22, tY + 5],
    [22, tY + 5]
  ].forEach(([sx, sy], i) => {
    const d = i ? 1 : -1;
    let hx, hy;
    if (o.armsUp) {
      hx = d * 26;
      hy = hY - 30;
    } else if (o.dribble && i === 1) {
      hx = 34;
      hy = -26;
    } else if (o.point && i === 1) {
      hx = 44;
      hy = tY - 6;
    } else if (o.hold) {
      hx = d * 14;
      hy = tY + 22;
    } else {
      hx = d * 33;
      hy = tY + 30;
    }
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(hx, hy);
    c.stroke();
    c.lineWidth = 7;
    c.strokeStyle = o.sleeves ? jc : sk;
    c.stroke();
    c.lineWidth = 2.2;
    c.strokeStyle = INK;
    ell(c, hx, hy, 7, 7, o.gloves || sk);
  });
  c.beginPath();
  c.moveTo(-24, tY);
  c.lineTo(24, tY);
  c.lineTo(28, -26);
  c.lineTo(-28, -26);
  c.closePath();
  c.fillStyle = jc;
  c.fill();
  c.stroke();
  if (o.apron) {
    c.fillStyle = o.apron;
    c.beginPath();
    c.moveTo(-16, tY + 6);
    c.lineTo(16, tY + 6);
    c.lineTo(20, -26);
    c.lineTo(-20, -26);
    c.closePath();
    c.fill();
    c.stroke();
  }
  if (o.trim) {
    c.strokeStyle = o.trim;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-23, tY + 3);
    c.lineTo(23, tY + 3);
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 2.2;
  }
  if (o.number != null) {
    c.save();
    if (o.flip) c.scale(-1, 1);
    c.fillStyle = o.trim && luma(o.trim) > 60 ? o.trim : "#fff";
    c.font = '800 17px "Barlow Condensed",sans-serif';
    c.textAlign = "center";
    c.lineWidth = 3;
    c.strokeText(o.number, 0, tY + 29);
    c.fillText(o.number, 0, tY + 29);
    c.restore();
  }
  if (o.whistle) {
    c.beginPath();
    c.moveTo(-8, tY);
    c.lineTo(0, tY + 16);
    c.lineTo(8, tY);
    c.stroke();
    ell(c, 0, tY + 19, 4, 3, "#bbb");
  }
  if (o.tie) {
    c.beginPath();
    c.moveTo(0, tY);
    c.lineTo(-5, tY + 20);
    c.lineTo(0, tY + 28);
    c.lineTo(5, tY + 20);
    c.closePath();
    c.fillStyle = o.tie === true ? "#c33" : o.tie;
    c.fill();
    c.stroke();
  }
  if (o.bow) {
    c.fillStyle = o.bow;
    c.beginPath();
    c.moveTo(0, tY + 3);
    c.lineTo(-9, tY - 2);
    c.lineTo(-9, tY + 8);
    c.closePath();
    c.moveTo(0, tY + 3);
    c.lineTo(9, tY - 2);
    c.lineTo(9, tY + 8);
    c.closePath();
    c.fill();
    c.stroke();
  }
  ell(c, 0, hY, 38, 33, sk);
  const hs = L.hatStyle || "yok",
    hat = L.hat || "#333";
  // oyuncu saç modelleri (Ev → Stil): afro, örgü, kel
  if (hs === "afro") {
    ell(c, 0, hY - 22, 50, 38, L.hair || "#222");
    for (let i = 0; i < 9; i++) ell(c, -40 + i * 10, hY - 50 + Math.abs(4 - i) * 4, 9, 9, L.hair || "#222", 0, false);
  } else if (hs === "orgu") {
    c.fillStyle = L.hair || "#222";
    c.beginPath();
    c.ellipse(0, hY - 8, 38, 30, 0, Math.PI, Math.PI * 2);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = shade(L.hair || "#222", 40);
    c.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(i * 9, hY - 36 + Math.abs(i) * 2);
      c.lineTo(i * 10, hY - 8);
      c.stroke();
    }
    c.strokeStyle = INK;
    c.lineWidth = 2.2;
  } else if (hs === "kel") {
    c.save();
    c.globalAlpha = 0.25;
    ell(c, -10, hY - 20, 9, 5, "#fff", -0.4, false);
    c.restore();
  } else if (hs === "yok" || hs === "uzun") {
    c.fillStyle = L.hair || "#222";
    c.beginPath();
    c.moveTo(-36, hY - 6);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i * Math.PI) / 8,
        r = i % 2 ? 37 : 44;
      c.lineTo(Math.cos(a) * r, hY - 4 + Math.sin(a) * r * 0.82);
    }
    c.lineTo(36, hY - 6);
    c.quadraticCurveTo(0, hY - 22, -36, hY - 6);
    c.closePath();
    c.fill();
    c.stroke();
    if (hs === "uzun")
      [-1, 1].forEach(d => {
        c.beginPath();
        c.moveTo(d * 36, hY - 6);
        c.quadraticCurveTo(d * 48, hY + 20, d * 36, hY + 40);
        c.lineTo(d * 30, hY + 8);
        c.closePath();
        c.fill();
        c.stroke();
      });
  } else if (hs === "bere") {
    c.beginPath();
    c.ellipse(0, hY - 8, 37, 29, 0, Math.PI, Math.PI * 2);
    c.closePath();
    c.fillStyle = hat;
    c.fill();
    c.stroke();
    rr(c, -38, hY - 14, 76, 10, 4, shade(hat, -35));
    ell(c, 0, hY - 38, 8, 8, L.pom || "#fff");
  } else if (hs === "kep") {
    c.beginPath();
    c.ellipse(0, hY - 8, 36, 26, 0, Math.PI, Math.PI * 2);
    c.closePath();
    c.fillStyle = hat;
    c.fill();
    c.stroke();
    ell(c, 24, hY - 9, 22, 5, shade(hat, -30));
  } else if (hs === "kulak") {
    c.beginPath();
    c.ellipse(0, hY - 8, 37, 29, 0, Math.PI, Math.PI * 2);
    c.closePath();
    c.fillStyle = hat;
    c.fill();
    c.stroke();
    ell(c, -34, hY + 4, 8, 14, hat);
    ell(c, 34, hY + 4, 8, 14, hat);
    rr(c, -38, hY - 14, 76, 9, 4, shade(hat, -35));
  } else if (hs === "band") {
    c.fillStyle = L.hair || "#222";
    c.beginPath();
    c.ellipse(0, hY - 8, 37, 27, 0, Math.PI, Math.PI * 2);
    c.closePath();
    c.fill();
    c.stroke();
    rr(c, -38, hY - 16, 76, 8, 3, hat);
  } else if (hs === "sef") {
    rr(c, -26, hY - 62, 52, 34, 14, "#fff");
    rr(c, -34, hY - 30, 68, 12, 4, "#f1f1f1");
  }
  const ey = hY - 3;
  ell(c, -9, ey, 10, 12, "#fff", -0.18);
  ell(c, 9, ey, 10, 12, "#fff", 0.18);
  const lx = o.look || 0;
  c.fillStyle = INK;
  if (o.mood === "kizgin") {
    c.beginPath();
    c.moveTo(-19, ey - 12);
    c.lineTo(-2, ey - 6);
    c.moveTo(19, ey - 12);
    c.lineTo(2, ey - 6);
    c.lineWidth = 3;
    c.stroke();
    c.lineWidth = 2.2;
  }
  c.beginPath();
  c.arc(-4 + lx, ey + 1, 2.6, 0, 7);
  c.arc(4 + lx, ey + 1, 2.6, 0, 7);
  c.fill();
  if (o.glasses || L.glasses) {
    c.beginPath();
    c.moveTo(-1, ey);
    c.lineTo(1, ey);
    c.stroke();
    ell(c, -9, ey, 11, 13, null, -0.18);
    ell(c, 9, ey, 11, 13, null, 0.18);
  }
  const my = hY + 18;
  // sakal (oyuncunun görünümü: kirli sakal, sakal, keçi sakal); ağız üstüne çizilir
  if (L.beard && L.beard !== "yok") {
    const bc = L.hair || INK;
    c.save();
    if (L.beard === "keci") {
      ell(c, 2, hY + 27, 9, 7, bc);
    } else {
      c.beginPath();
      c.ellipse(0, hY, 38, 33, 0, 0.12 * Math.PI, 0.88 * Math.PI);
      c.quadraticCurveTo(0, hY + 4, 35.2, hY + 12.3);
      c.closePath();
      if (L.beard === "kirli") {
        c.globalAlpha = 0.35;
        c.fillStyle = bc;
        c.fill();
      } else {
        c.fillStyle = bc;
        c.fill();
        c.stroke();
      }
    }
    c.restore();
    c.strokeStyle = INK;
    c.fillStyle = INK;
  }
  c.beginPath();
  if (o.mood === "mutlu") {
    c.arc(2, my - 4, 6, 0.15, Math.PI - 0.15);
    c.stroke();
  } else if (o.mood === "uzgun") {
    c.arc(2, my + 3, 6, Math.PI + 0.3, -0.3);
    c.stroke();
  } else if (o.mood === "saskin") {
    ell(c, 2, my - 1, 4, 5, INK);
  } else {
    c.moveTo(-3, my);
    c.lineTo(7, my - 1);
    c.stroke();
  }
  if (o.mustache || L.mustache) {
    c.beginPath();
    c.moveTo(-14, my - 6);
    c.quadraticCurveTo(2, my - 14, 18, my - 6);
    c.quadraticCurveTo(2, my - 2, -14, my - 6);
    c.fillStyle = L.hair || INK;
    c.fill();
    c.stroke();
  }
  if (o.blush) {
    c.globalAlpha = 0.35;
    ell(c, -24, hY + 8, 6, 4, "#e55", 0, false);
    ell(c, 26, hY + 8, 6, 4, "#e55", 0, false);
    c.globalAlpha = 1;
  }
  c.restore();
}
export function drawBall(c, x, y, r = 10, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.lineWidth = 2;
  c.strokeStyle = INK;
  ell(c, 0, 0, r, r, "#ee7a2c");
  c.beginPath();
  c.moveTo(-r, 0);
  c.lineTo(r, 0);
  c.moveTo(0, -r);
  c.lineTo(0, r);
  c.moveTo(-r * 0.7, -r * 0.7);
  c.quadraticCurveTo(0, 0, -r * 0.7, r * 0.7);
  c.moveTo(r * 0.7, -r * 0.7);
  c.quadraticCurveTo(0, 0, r * 0.7, r * 0.7);
  c.lineWidth = 1.4;
  c.stroke();
  c.restore();
}
export function hiCanvas(w, h) {
  const cv = document.createElement("canvas");
  const d = Math.min(3, Math.max(2, devicePixelRatio || 1));
  cv.width = w * d;
  cv.height = h * d;
  cv.style.width = "100%";
  cv.style.aspectRatio = `${w}/${h}`;
  const c = cv.getContext("2d");
  c.scale(d, d);
  return [cv, c];
}
export function portrait(L, o = {}, w = 84, h = 84, bg) {
  const cv = document.createElement("canvas");
  const d = Math.max(2, devicePixelRatio || 1);
  cv.width = w * d;
  cv.height = h * d;
  cv.style.width = w + "px";
  cv.style.height = h + "px";
  cv.style.borderRadius = "12px";
  const c = cv.getContext("2d");
  c.scale(d, d);
  const g = c.createLinearGradient(0, 0, 0, h);
  const b = bg || "#22304a";
  g.addColorStop(0, shade(b, 25));
  g.addColorStop(1, b);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  drawKid(c, w / 2, h + (o.adult ? 62 : 40) * (w / 84), 0.92 * (w / 84), L, o);
  return cv;
}

/* ================= İKONLAR (64×64 SVG) ================= */
export const sv = b => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${b}</svg>`;
export const ST = 'stroke="#141414" stroke-width="2" stroke-linejoin="round"';
export const ICON = {
  can: (c = "#1e88e5") =>
    sv(
      `<rect x="20" y="8" width="24" height="48" rx="5" fill="${c}" ${ST}/><rect x="22" y="6" width="20" height="5" rx="2" fill="#cfd8dc" ${ST}/><path d="M34 18 L26 34 H32 L29 46 L39 28 H33 L36 18Z" fill="#ffd54f" ${ST}/><rect x="23" y="12" width="4" height="40" rx="2" fill="#fff" opacity=".25"/>`
    ),
  bag: () =>
    sv(
      `<path d="M16 22 H48 L45 56 H19Z" fill="#c9a26b" ${ST}/><path d="M26 22 C24 10 30 8 32 8 C34 8 40 10 38 22" fill="none" ${ST}/><circle cx="26" cy="20" r="6" fill="#4caf50" ${ST}/><path d="M36 20 L44 8" stroke="#ff7043" stroke-width="6" stroke-linecap="round"/><circle cx="38" cy="19" r="5" fill="#e53935" ${ST}/><rect x="22" y="34" width="20" height="8" rx="2" fill="#fff" opacity=".5"/>`
    ),
  pizza: () =>
    sv(
      `<circle cx="32" cy="32" r="24" fill="#e0a64b" ${ST}/><circle cx="32" cy="32" r="19" fill="#f2c94c"/><circle cx="32" cy="32" r="19" fill="none" stroke="#d84315" stroke-width="3" opacity=".6"/>${[
        [26, 24],
        [40, 28],
        [30, 40],
        [22, 34],
        [38, 40]
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#c62828" ${ST}/>`)
        .join("")}<path d="M32 32 L32 8 M32 32 L52 44 M32 32 L12 44" stroke="#b07a2a" stroke-width="1.5"/>`
    ),
  tub: () =>
    sv(
      `<rect x="14" y="16" width="36" height="40" rx="6" fill="#263238" ${ST}/><rect x="12" y="10" width="40" height="9" rx="3" fill="#ff7043" ${ST}/><rect x="18" y="26" width="28" height="18" rx="3" fill="#ffca28" ${ST}/><text x="32" y="39" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="10" text-anchor="middle" fill="#141414">${$t("art.1")}</text>`
    ),
  bottle: () =>
    sv(
      `<rect x="20" y="16" width="24" height="40" rx="5" fill="#ff9800" ${ST}/><rect x="18" y="8" width="28" height="10" rx="3" fill="#fff" ${ST}/><rect x="22" y="26" width="20" height="16" rx="2" fill="#fff" ${ST}/><path d="M28 34h8M32 30v8" stroke="#e53935" stroke-width="3"/><ellipse cx="48" cy="52" rx="5" ry="3" fill="#fff" ${ST}/>`
    ),
  coffee: () =>
    sv(
      `<ellipse cx="30" cy="54" rx="22" ry="5" fill="#eceff1" ${ST}/><path d="M14 26 H46 L42 50 H18Z" fill="#fff" ${ST}/><path d="M46 30 C56 30 56 42 44 42" fill="none" ${ST}/><ellipse cx="30" cy="26" rx="16" ry="4" fill="#6d4c41" ${ST}/><path d="M24 18 C22 14 26 12 24 8 M32 18 C30 14 34 12 32 8" stroke="#b0bec5" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    ),
  tv: () =>
    sv(
      `<rect x="6" y="12" width="52" height="34" rx="4" fill="#263238" ${ST}/><rect x="10" y="16" width="44" height="26" fill="#d79a5c"/><path d="M32 16 V42 M10 29 H54" stroke="#fff" stroke-width="1.5"/><circle cx="32" cy="29" r="5" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="40" cy="24" r="3" fill="#ee7a2c"/><rect x="24" y="48" width="16" height="4" fill="#455a64" ${ST}/><rect x="18" y="52" width="28" height="4" rx="2" fill="#455a64" ${ST}/>`
    ),
  pad: (c = "#37474f") =>
    sv(
      `<path d="M12 26 C12 18 20 18 26 20 H38 C44 18 52 18 52 26 L56 44 C57 52 48 54 44 46 L40 40 H24 L20 46 C16 54 7 52 8 44Z" fill="${c}" ${ST}/><path d="M20 28 v10 M15 33 h10" stroke="#eceff1" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="29" r="3" fill="#e53935"/><circle cx="48" cy="34" r="3" fill="#43a047"/><circle cx="42" cy="38" r="3" fill="#1e88e5"/><circle cx="36" cy="34" r="3" fill="#fdd835"/>`
    ),
  heart: () =>
    sv(
      `<path d="M32 54 C10 40 8 28 14 20 C20 12 30 14 32 22 C34 14 44 12 50 20 C56 28 54 40 32 54Z" fill="#e91e63" ${ST}/><path d="M20 22 C18 26 18 30 20 32" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`
    ),
  plate: () =>
    sv(
      `<ellipse cx="32" cy="38" rx="26" ry="14" fill="#fafafa" ${ST}/><ellipse cx="32" cy="36" rx="18" ry="8" fill="#ffcc80"/>${[
        [24, 34],
        [32, 32],
        [40, 35],
        [28, 38],
        [36, 39]
      ]
        .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#6d8b3a" ${ST}/>`)
        .join("")}<path d="M8 12 V30 M4 12 V20 M12 12 V20" stroke="#90a4ae" stroke-width="2.5" stroke-linecap="round"/>`
    ),
  hoop: () =>
    sv(
      `<rect x="12" y="6" width="40" height="28" rx="2" fill="#fff" ${ST}/><rect x="24" y="16" width="16" height="12" fill="none" stroke="#e53935" stroke-width="2"/><path d="M18 34 H46" stroke="#ff5722" stroke-width="4"/><path d="M20 34 L24 50 H40 L44 34 M26 34 L28 50 M32 34 V50 M38 34 L36 50" stroke="#fff" stroke-width="1.5" fill="none"/><circle cx="50" cy="52" r="8" fill="#ee7a2c" ${ST}/>`
    ),
  envelope: () =>
    sv(
      `<rect x="8" y="16" width="48" height="34" rx="3" fill="#fff" ${ST}/><path d="M8 18 L32 36 L56 18" fill="none" ${ST}/><rect x="18" y="8" width="28" height="16" rx="2" fill="#81c784" ${ST}/><text x="32" y="20" font-family="Barlow Condensed" font-weight="800" font-size="10" text-anchor="middle" fill="#1b5e20">₺</text>`
    ),
  sneaker: (c = "#eceff1", s = "#e53935") =>
    sv(
      `<path d="M6 40 C6 30 12 28 18 26 L28 18 C32 22 36 24 40 26 L54 32 C60 34 60 44 56 46 H8Z" fill="${c}" ${ST}/><path d="M6 44 H58 V48 C58 50 56 52 54 52 H10 C8 52 6 50 6 48Z" fill="#fff" ${ST}/><path d="M18 36 C28 30 40 32 50 38" stroke="${s}" stroke-width="4" fill="none"/><path d="M26 24 l4 4 M30 21 l4 4 M34 23 l3 4" stroke="#141414" stroke-width="1.5"/>`
    ),
  ball: () =>
    sv(
      `<circle cx="32" cy="32" r="24" fill="#ee7a2c" ${ST}/><path d="M8 32 H56 M32 8 V56 M15 15 C26 24 26 40 15 49 M49 15 C38 24 38 40 49 49" stroke="#141414" stroke-width="2" fill="none"/><path d="M18 20 C20 16 24 14 28 13" stroke="#fff" stroke-width="3" opacity=".4" fill="none" stroke-linecap="round"/>`
    ),
  phone: () =>
    sv(
      `<rect x="18" y="4" width="28" height="56" rx="6" fill="#212121" ${ST}/><rect x="21" y="10" width="22" height="42" rx="2" fill="#4fc3f7"/><path d="M21 40 L30 30 L36 36 L43 28 V52 H21Z" fill="#0288d1"/><circle cx="37" cy="18" r="4" fill="#fff59d"/><rect x="28" y="6" width="8" height="2" rx="1" fill="#555"/>`
    ),
  console: () =>
    sv(
      `<rect x="8" y="10" width="20" height="40" rx="3" fill="#eceff1" ${ST}/><rect x="11" y="14" width="14" height="2" fill="#90a4ae"/><circle cx="18" cy="42" r="2" fill="#29b6f6"/><path d="M30 34 C30 28 36 28 40 30 H48 C52 28 58 28 58 34 L60 46 C60 52 54 52 52 48 L50 44 H38 L36 48 C34 52 28 52 28 46Z" fill="#37474f" ${ST}/><circle cx="51" cy="37" r="2" fill="#e53935"/><circle cx="37" cy="37" r="2" fill="#eceff1"/>`
    ),
  hoodie: (c = "#455a64") =>
    sv(
      `<path d="M22 10 C26 6 38 6 42 10 L54 18 L58 40 L50 42 L48 30 V56 H16 V30 L14 42 L6 40 L10 18Z" fill="${c}" ${ST}/><path d="M24 10 C24 22 40 22 40 10" fill="${shade(c, -25)}" ${ST}/><rect x="24" y="38" width="16" height="10" rx="2" fill="${shade(c, -20)}" ${ST}/><path d="M29 20 V28 M35 20 V28" stroke="#fff" stroke-width="1.5"/>`
    ),
  watch: () =>
    sv(
      `<rect x="24" y="2" width="16" height="16" rx="3" fill="#8d6e63" ${ST}/><rect x="24" y="46" width="16" height="16" rx="3" fill="#8d6e63" ${ST}/><circle cx="32" cy="32" r="17" fill="#d8b25a" ${ST}/><circle cx="32" cy="32" r="13" fill="#0d1b2a" ${ST}/><path d="M32 32 V23 M32 32 L38 35" stroke="#fff" stroke-width="2" stroke-linecap="round"/><rect x="49" y="29" width="4" height="6" rx="1" fill="#d8b25a" ${ST}/>`
    ),
  headphones: () =>
    sv(
      `<path d="M12 38 V32 C12 18 22 10 32 10 C42 10 52 18 52 32 V38" fill="none" stroke="#141414" stroke-width="6"/><path d="M12 38 V32 C12 18 22 10 32 10 C42 10 52 18 52 32 V38" fill="none" stroke="#e53935" stroke-width="3"/><rect x="6" y="34" width="14" height="22" rx="5" fill="#212121" ${ST}/><rect x="44" y="34" width="14" height="22" rx="5" fill="#212121" ${ST}/>`
    ),
  car: (c = "#e53935", type = "super") =>
    sv(
      type === "hatch"
        ? `<path d="M6 42 V32 L14 30 L22 18 H42 L50 30 L58 32 V42Z" fill="${c}" ${ST}/><path d="M24 22 H40 L46 30 H18Z" fill="#b3e5fc" ${ST}/>` +
            `<circle cx="18" cy="44" r="7" fill="#212121" ${ST}/><circle cx="46" cy="44" r="7" fill="#212121" ${ST}/><circle cx="18" cy="44" r="3" fill="#bdbdbd"/><circle cx="46" cy="44" r="3" fill="#bdbdbd"/>`
        : type === "suv"
          ? `<path d="M4 44 V28 L12 26 L18 14 H48 L54 26 L60 28 V44Z" fill="${c}" ${ST}/><path d="M20 18 H46 L50 26 H16Z" fill="#b3e5fc" ${ST}/><path d="M33 18 V26" stroke="#141414" stroke-width="2"/><circle cx="16" cy="46" r="7" fill="#212121" ${ST}/><circle cx="48" cy="46" r="7" fill="#212121" ${ST}/><circle cx="16" cy="46" r="3" fill="#bdbdbd"/><circle cx="48" cy="46" r="3" fill="#bdbdbd"/>`
          : `<path d="M2 42 C2 36 6 34 14 32 L26 24 C34 22 42 22 48 28 L58 32 C62 34 62 42 60 42Z" fill="${c}" ${ST}/><path d="M28 26 C34 24 40 25 44 29 L26 30Z" fill="#b3e5fc" ${ST}/><circle cx="16" cy="43" r="7" fill="#212121" ${ST}/><circle cx="48" cy="43" r="7" fill="#212121" ${ST}/><circle cx="16" cy="43" r="3" fill="#ffd54f"/><circle cx="48" cy="43" r="3" fill="#ffd54f"/><path d="M56 34 h4" stroke="#fff59d" stroke-width="3"/>`
    ),
  cup: (c = "#d8b25a") =>
    sv(
      `<path d="M18 8 H46 V20 C46 32 40 38 32 38 C24 38 18 32 18 20Z" fill="${c}" ${ST}/><path d="M18 12 C8 12 8 26 20 28 M46 12 C56 12 56 26 44 28" fill="none" ${ST}/><rect x="28" y="38" width="8" height="8" fill="${shade(c, -30)}" ${ST}/><rect x="18" y="46" width="28" height="10" rx="2" fill="#3e2723" ${ST}/><path d="M24 12 V24" stroke="#fff" stroke-width="3" opacity=".45" stroke-linecap="round"/>`
    ),
  plaque: () =>
    sv(
      `<rect x="12" y="6" width="40" height="50" rx="4" fill="#5d4037" ${ST}/><rect x="18" y="12" width="28" height="30" rx="2" fill="#d8b25a" ${ST}/><path d="M32 16 L35 24 H43 L37 29 L39 37 L32 32 L25 37 L27 29 L21 24 H29Z" fill="#fff8e1" ${ST}/><rect x="20" y="46" width="24" height="5" rx="1" fill="#d8b25a"/>`
    ),
  medal: (c = "#b0bec5") =>
    sv(
      `<path d="M20 4 L28 26 M44 4 L36 26" stroke="#1e88e5" stroke-width="8"/><path d="M20 4 L28 26 M44 4 L36 26" stroke="#e53935" stroke-width="3"/><circle cx="32" cy="40" r="16" fill="${c}" ${ST}/><circle cx="32" cy="40" r="11" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/><text x="32" y="45" font-family="Barlow Condensed" font-weight="800" font-size="14" text-anchor="middle" fill="#141414">2</text>`
    ),
  bed: () =>
    sv(
      `<rect x="6" y="30" width="52" height="16" rx="3" fill="#5c6bc0" ${ST}/><rect x="8" y="22" width="16" height="10" rx="4" fill="#fff" ${ST}/><path d="M6 46 V54 M58 46 V54" ${ST}/><rect x="4" y="18" width="6" height="36" rx="2" fill="#8d6e63" ${ST}/><text x="44" y="22" font-family="Barlow Condensed" font-weight="800" font-size="12" fill="#90caf9">Z z</text>`
    ),
  book: () =>
    sv(
      `<path d="M8 14 C18 10 26 12 32 16 C38 12 46 10 56 14 V52 C46 48 38 50 32 54 C26 50 18 48 8 52Z" fill="#fff" ${ST}/><path d="M32 16 V54" ${ST}/><path d="M14 22 H26 M14 28 H26 M14 34 H24 M38 22 H50 M38 28 H50 M38 34 H48" stroke="#90a4ae" stroke-width="2"/>`
    ),
  pencil: () =>
    sv(
      `<path d="M10 54 L14 40 L44 10 L54 20 L24 50Z" fill="#ffca28" ${ST}/><path d="M44 10 L54 20 L58 16 C60 14 60 12 58 10 L54 6 C52 4 50 4 48 6Z" fill="#ef9a9a" ${ST}/><path d="M10 54 L14 40 L24 50Z" fill="#ffe0b2" ${ST}/>`
    ),
  door: () =>
    sv(
      `<rect x="16" y="6" width="32" height="52" rx="2" fill="#795548" ${ST}/><rect x="20" y="10" width="24" height="20" fill="#8d6e63" ${ST}/><circle cx="40" cy="34" r="2.5" fill="#d8b25a"/><path d="M48 32 H60 M54 26 L60 32 L54 38" stroke="#ff5468" stroke-width="3" fill="none"/>`
    ),
  mic: () =>
    sv(
      `<rect x="24" y="6" width="16" height="30" rx="8" fill="#90a4ae" ${ST}/><path d="M24 18 H40 M24 24 H40" stroke="#141414" stroke-width="1.5"/><path d="M18 28 C18 44 46 44 46 28" fill="none" ${ST}/><path d="M32 42 V54 M22 56 H42" ${ST}/>`
    ),
  camera: () =>
    sv(
      `<rect x="6" y="18" width="52" height="34" rx="5" fill="#37474f" ${ST}/><rect x="20" y="12" width="16" height="8" rx="2" fill="#455a64" ${ST}/><circle cx="32" cy="35" r="12" fill="#263238" ${ST}/><circle cx="32" cy="35" r="7" fill="#4fc3f7"/><circle cx="29" cy="32" r="2" fill="#fff"/><circle cx="50" cy="25" r="3" fill="#ff5468"/>`
    ),
  handshake: () =>
    sv(
      `<path d="M4 26 L16 20 L28 26 L22 34Z" fill="#455a64" ${ST}/><path d="M60 26 L48 20 L36 24 L42 34Z" fill="#455a64" ${ST}/><path d="M16 28 L30 22 C34 20 38 22 40 26 L50 34 C52 36 50 40 46 38 L44 42 C42 44 38 42 38 42 L36 46 C34 48 30 46 30 46 L28 48 C26 50 22 48 22 46Z" fill="#f1c9a5" ${ST}/>`
    ),
  whistle: () =>
    sv(
      `<path d="M10 30 C10 22 18 18 26 18 H52 V30 H36 C36 40 30 46 22 46 C14 46 10 40 10 30Z" fill="#cfd8dc" ${ST}/><circle cx="22" cy="32" r="6" fill="#90a4ae" ${ST}/><path d="M52 18 C56 10 50 4 44 8" fill="none" stroke="#e53935" stroke-width="3"/>`
    ),
  dumbbell: () =>
    sv(
      `<rect x="8" y="18" width="10" height="28" rx="2" fill="#37474f" ${ST}/><rect x="46" y="18" width="10" height="28" rx="2" fill="#37474f" ${ST}/><rect x="2" y="24" width="6" height="16" rx="2" fill="#546e7a" ${ST}/><rect x="56" y="24" width="6" height="16" rx="2" fill="#546e7a" ${ST}/><rect x="18" y="29" width="28" height="6" fill="#b0bec5" ${ST}/>`
    ),
  chat: () =>
    sv(
      `<path d="M6 12 H42 V36 H20 L12 44 V36 H6Z" fill="#fff" ${ST}/><path d="M24 24 H58 V48 H52 V56 L44 48 H24Z" fill="#4fc3f7" ${ST}/><circle cx="34" cy="36" r="2" fill="#141414"/><circle cx="41" cy="36" r="2" fill="#141414"/><circle cx="48" cy="36" r="2" fill="#141414"/>`
    ),
  disco: () =>
    sv(
      `<path d="M32 4 V14" ${ST}/><circle cx="32" cy="34" r="20" fill="#b0bec5" ${ST}/><path d="M12 34 H52 M32 14 V54 M16 24 H48 M16 44 H48 M22 16 C18 28 18 40 22 52 M42 16 C46 28 46 40 42 52" stroke="#78909c" stroke-width="1.5" fill="none"/><path d="M24 22 h6 v5 h-6z" fill="#fff"/><path d="M38 38 h6 v5 h-6z" fill="#e1f5fe"/>`
    ),
  joystick: () =>
    sv(
      `<rect x="8" y="38" width="48" height="18" rx="4" fill="#5e35b1" ${ST}/><path d="M28 38 L30 18" stroke="#141414" stroke-width="5"/><circle cx="30" cy="14" r="8" fill="#e53935" ${ST}/><circle cx="44" cy="46" r="4" fill="#ffd54f" ${ST}/><circle cx="18" cy="46" r="3" fill="#29b6f6" ${ST}/>`
    ),
  dice: () =>
    sv(
      `<rect x="8" y="16" width="30" height="30" rx="5" fill="#fff" ${ST} transform="rotate(-12 23 31)"/><rect x="28" y="22" width="28" height="28" rx="5" fill="#e53935" ${ST}/><circle cx="35" cy="29" r="2.5" fill="#fff"/><circle cx="42" cy="36" r="2.5" fill="#fff"/><circle cx="49" cy="43" r="2.5" fill="#fff"/><circle cx="17" cy="26" r="2.5" fill="#141414"/><circle cx="27" cy="34" r="2.5" fill="#141414"/>`
    ),
  cards: () =>
    sv(
      `<rect x="10" y="14" width="26" height="38" rx="3" fill="#fff" ${ST} transform="rotate(-14 23 33)"/><rect x="26" y="10" width="26" height="38" rx="3" fill="#fff" ${ST}/><text x="32" y="24" font-family="Barlow Condensed" font-weight="800" font-size="12" fill="#d0142c">A</text><path d="M39 30 C35 26 33 30 39 38 C45 30 43 26 39 30Z" fill="#d0142c"/>`
    ),
  wheel: () =>
    sv(
      `<circle cx="32" cy="32" r="26" fill="#3e2723" ${ST}/>${Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6,
          b = a + Math.PI / 6;
        return `<path d="M32 32 L${32 + 22 * Math.cos(a)} ${32 + 22 * Math.sin(a)} A22 22 0 0 1 ${32 + 22 * Math.cos(b)} ${32 + 22 * Math.sin(b)}Z" fill="${i === 0 ? "#2e7d32" : i % 2 ? "#c62828" : "#212121"}"/>`;
      }).join("")}<circle cx="32" cy="32" r="8" fill="#d8b25a" ${ST}/><circle cx="46" cy="16" r="3" fill="#fff" ${ST}/>`
    ),
  seven: () =>
    sv(
      `<rect x="6" y="6" width="52" height="52" rx="10" fill="#fff8e1"/><text x="32" y="50" font-family="Barlow Condensed" font-weight="800" font-size="48" text-anchor="middle" fill="#d0142c" stroke="#141414" stroke-width="1.5">7</text>`
    ),
  star: () => sv(`<path d="M32 6 L39 24 H58 L43 35 L49 54 L32 43 L15 54 L21 35 L6 24 H25Z" fill="#ffc107" ${ST}/>`),
  house: (c = "#8d6e63") =>
    sv(
      `<path d="M8 30 L32 10 L56 30" fill="none" ${ST}/><rect x="14" y="28" width="36" height="28" fill="${c}" ${ST}/><rect x="28" y="40" width="10" height="16" fill="#3e2723" ${ST}/><rect x="18" y="34" width="8" height="8" fill="#fff59d" ${ST}/><rect x="40" y="34" width="6" height="8" fill="#fff59d" ${ST}/>`
    ),
  plus: () =>
    sv(
      `<circle cx="32" cy="32" r="24" fill="#1e2a40" ${ST}/><path d="M32 20 V44 M20 32 H44" stroke="#d8b25a" stroke-width="5" stroke-linecap="round"/>`
    ),
  trophyRoom: () =>
    sv(
      `<rect x="6" y="10" width="52" height="44" rx="3" fill="#4e342e" ${ST}/><path d="M6 26 H58 M6 40 H58" stroke="#8d6e63" stroke-width="3"/><path d="M14 22 h8 v-6 h-8z M30 22 h6 v-8 h-6z" fill="#d8b25a"/><circle cx="46" cy="18" r="4" fill="#ee7a2c"/>`
    )
};
export const icon = (id, ...a) => (ICON[id] || ICON.ball)(...a);
export const svgImgCache = {};
export function svgImage(markup) {
  if (svgImgCache[markup]) return Promise.resolve(svgImgCache[markup]);
  return new Promise(r => {
    const im = new Image();
    im.onload = () => {
      svgImgCache[markup] = im;
      r(im);
    };
    im.onerror = () => r(null);
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
  });
}

/* ================= MEKAN SAHNELERİ (yüksek çözünürlüklü canvas) ================= */
export function sceneEl(kind, bubble, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "scene";
  const [cv, c] = hiCanvas(360, 190);
  drawScene(c, kind, opts);
  wrap.appendChild(cv);
  if (bubble) {
    const b = document.createElement("div");
    b.className = "bubble" + (opts.bubbleLeft ? " l" : "");
    b.textContent = bubble;
    wrap.appendChild(b);
  }
  return wrap;
}
export function drawScene(c, kind, o) {
  if (kind === "store") return late.drawStoreScene(c, o);
  const W = 360,
    H = 190;
  c.lineJoin = "round";
  const floor = (col, y = 150) => {
    c.fillStyle = col;
    c.fillRect(0, y, W, H - y);
  };
  const wall = (a, b) => {
    const g = c.createLinearGradient(0, 0, 0, 150);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    c.fillStyle = g;
    c.fillRect(0, 0, W, 150);
  };
  c.strokeStyle = INK;
  c.lineWidth = 2;
  if (kind === "market") {
    wall("#dfe9de", "#c9d8c7");
    floor("#e9e4d8");
    for (let x = 0; x < W; x += 24)
      for (let y = 150; y < H; y += 12)
        if ((x / 24 + (y - 150) / 12) % 2 < 1) {
          c.fillStyle = "#d8d1c2";
          c.fillRect(x, y, 24, 12);
        }
    [40, 78, 116].forEach((y, i) => {
      rr(c, 10, y, 170, 6, 2, "#8d6e63");
      for (let k = 0; k < 9; k++) {
        const col = ["#e53935", "#fdd835", "#43a047", "#1e88e5", "#fb8c00", "#8e24aa"][(k + i * 2) % 6];
        rr(c, 16 + k * 18, y - 24 + (k % 2) * 4, 14, 24 - (k % 2) * 4, 2, col);
        c.fillStyle = "#fff";
        c.fillRect(18 + k * 18, y - 14, 10, 4);
      }
    });
    rr(c, 10, 128, 170, 20, 2, "#a1887f");
    drawKid(
      c,
      262,
      176,
      0.95,
      { skin: SKINS[2], hatStyle: "kep", hat: "#2e7d32" },
      { adult: true, jersey: "#fafafa", sleeves: true, apron: "#2e7d32", mood: "mutlu", mustache: true }
    );
    rr(c, 196, 120, 160, 40, 4, "#4e6b50");
    rr(c, 212, 104, 36, 18, 3, "#263238");
    c.fillStyle = "#7cfc9a";
    c.font = '700 10px "Barlow Condensed"';
    c.fillText(fmt(0).replace("0", "--"), 218, 117);
    c.fillStyle = "#2e7d32";
    rr(c, 200, 8, 150, 26, 4, "#2e7d32");
    c.fillStyle = "#fff";
    c.font = '800 16px "Barlow Condensed"';
    c.textAlign = "center";
    c.fillText($t("art.2"), 275, 27);
    c.textAlign = "left";
  }
  if (kind === "kafe") {
    wall("#6b4a33", "#4e3424");
    floor("#3b2a1f");
    c.strokeStyle = "rgba(0,0,0,.25)";
    for (let x = 0; x < W; x += 30) {
      c.beginPath();
      c.moveTo(x, 150);
      c.lineTo(x - 14, H);
      c.stroke();
    }
    c.strokeStyle = INK;
    rr(c, 14, 14, 110, 70, 4, "#22312a");
    c.fillStyle = "#f5f5f5";
    c.font = '800 14px "Barlow Condensed"';
    c.fillText($t("art.3"), 24, 32);
    c.font = "600 10px Manrope";
    [$t("art.4"), $t("art.5"), $t("art.6"), $t("art.7")].forEach((t, i) => c.fillText(t, 24, 48 + i * 10));
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(150 + i * 40, 0);
      c.lineTo(150 + i * 40, 20);
      c.stroke();
      ell(c, 150 + i * 40, 24, 7, 5, "#ffd54f");
    }
    drawKid(
      c,
      80,
      170,
      0.86,
      { skin: SKINS[1], hatStyle: "bere", hat: "#212121", pom: "#d84315" },
      { jersey: "#3e2723", sleeves: true, apron: "#a1887f", mood: "mutlu" }
    );
    rr(c, 10, 120, 150, 40, 4, "#8d6e63");
    rr(c, 26, 94, 40, 28, 4, "#b0bec5");
    rr(c, 34, 86, 24, 10, 2, "#78909c");
    const f = o.friend;
    drawKid(c, 262, 182, 0.9, f.L, { ...f.o, noLegs: true });
    rr(c, 205, 140, 110, 10, 3, "#a1887f");
    rr(c, 254, 150, 12, 40, 0, "#6d4c41");
    ell(c, 230, 136, 9, 4, "#fff");
    rr(c, 224, 124, 12, 12, 3, "#fff");
  }
  if (kind === "avm") {
    wall("#f1f3f6", "#dfe4ea");
    floor("#cfd6de");
    c.fillStyle = "rgba(255,255,255,.4)";
    for (let x = 0; x < W; x += 60) c.fillRect(x, 150, 30, 40);
    rr(c, 10, 10, 190, 132, 6, "#2b3240");
    for (let r = 0; r < 3; r++) {
      rr(c, 18, 48 + r * 40, 174, 4, 1, "#90a4ae");
      for (let k = 0; k < 5; k++) {
        const col = ["#e53935", "#fafafa", "#1e88e5", "#212121", "#fdd835"][(k + r) % 5];
        c.save();
        c.translate(26 + k * 34, 26 + r * 40);
        c.beginPath();
        c.moveTo(0, 20);
        c.quadraticCurveTo(0, 12, 8, 10);
        c.lineTo(14, 4);
        c.lineTo(26, 12);
        c.lineTo(28, 20);
        c.closePath();
        c.fillStyle = col;
        c.fill();
        c.stroke();
        c.restore();
      }
    }
    c.fillStyle = "#d8b25a";
    c.font = '800 13px "Barlow Condensed"';
    c.textAlign = "center";
    c.fillText($t("art.8"), 105, 26);
    c.textAlign = "left";
    drawKid(
      c,
      280,
      176,
      0.95,
      { skin: SKINS[3], hatStyle: "uzun", hair: "#111" },
      { adult: true, jersey: "#212121", sleeves: true, tie: "#d8b25a", mood: "mutlu" }
    );
    rr(c, 214, 128, 140, 30, 4, "#eceff1");
  }
  if (kind === "aile") {
    wall("#e8d5b5", "#d9c19b");
    floor("#8d6e63");
    for (let x = 0; x < W; x += 26) {
      c.fillStyle = x % 52 ? "#d1b88f" : "#e8d5b5";
      c.fillRect(x, 0, 13, 150);
    }
    c.globalAlpha = 0.25;
    c.fillStyle = "#fff";
    c.fillRect(0, 0, W, 150);
    c.globalAlpha = 1;
    rr(c, 240, 18, 90, 60, 3, "#bbdefb");
    c.beginPath();
    c.moveTo(285, 18);
    c.lineTo(285, 78);
    c.moveTo(240, 48);
    c.lineTo(330, 48);
    c.stroke();
    rr(c, 20, 30, 46, 34, 2, "#5d4037");
    rr(c, 25, 35, 36, 24, 1, "#90caf9");
    drawKid(c, 43, 60, 0.25, late.S ? late.S.look : { skin: SKINS[1], hatStyle: "bere", hat: "#1d428a" }, {
      mood: "mutlu",
      jersey: late.S && late.S.team ? late.S.team.c1 : "#c8102e"
    });
    rr(c, 16, 100, 70, 50, 3, "#5d4037");
    rr(c, 22, 84, 58, 40, 3, "#212121");
    rr(c, 26, 88, 50, 32, 1, "#d79a5c");
    drawKid(c, 170, 170, 0.82, o.mom.L, { ...o.mom.o, noLegs: true });
    drawKid(c, 236, 170, 0.82, o.dad.L, { ...o.dad.o, noLegs: true });
    rr(c, 120, 128, 170, 34, 8, "#8e3b46");
    rr(c, 110, 116, 22, 48, 8, "#7a2f3a");
    rr(c, 278, 116, 22, 48, 8, "#7a2f3a");
  }
  if (kind === "okul") {
    wall("#e6e0cf", "#d6cfbb");
    floor("#9e7e5a");
    rr(c, 30, 20, 220, 104, 4, "#2f4f3a");
    c.fillStyle = "#eaf2ea";
    c.font = "700 13px Manrope";
    const lines = (o.board || "").split("\n");
    lines.forEach((t, i) => c.fillText(t, 44, 48 + i * 20));
    rr(c, 30, 124, 220, 6, 1, "#8d6e63");
    drawKid(
      c,
      300,
      176,
      0.95,
      { skin: SKINS[1], hatStyle: "yok", hair: "#6d6d6d" },
      { adult: true, jersey: "#5d6b8a", sleeves: true, glasses: true, tie: "#8e2430", point: true, mustache: true }
    );
    for (let i = 0; i < 3; i++) {
      rr(c, 10 + i * 100, 162, 80, 10, 2, "#a1887f");
      rr(c, 40 + i * 100, 172, 10, 18, 0, "#6d4c41");
    }
  }
  if (kind === "medya") {
    wall("#141b2a", "#0c111c");
    floor("#1c2433");
    rr(c, 150, 14, 196, 124, 4, "#1e2a40");
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        c.fillStyle = (i + j) % 2 ? late.S.team.c1 : "#26354f";
        c.fillRect(156 + i * 48, 20 + j * 38, 44, 34);
      }
    c.fillStyle = "#fff";
    c.font = '800 12px "Barlow Condensed"';
    c.textAlign = "center";
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.fillText(late.S.team.short, 178 + i * 48, 42 + j * 38);
    c.textAlign = "left";
    [
      [30, 20],
      [110, 10]
    ].forEach(([x, y]) => {
      c.fillStyle = "rgba(255,240,200,.08)";
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 120, 150);
      c.lineTo(x - 60, 150);
      c.closePath();
      c.fill();
      rr(c, x - 10, y - 6, 20, 14, 3, "#333");
    });
    drawKid(
      c,
      70,
      176,
      0.95,
      { skin: SKINS[2], hatStyle: "uzun", hair: "#111" },
      { adult: true, jersey: "#22304a", sleeves: true, glasses: true }
    );
    rr(c, 96, 96, 8, 30, 3, "#555");
    ell(c, 100, 92, 7, 9, "#90a4ae");
    rr(c, 270, 104, 40, 26, 3, "#263238");
    ell(c, 290, 117, 8, 8, "#4fc3f7");
    c.beginPath();
    c.moveTo(290, 130);
    c.lineTo(276, 176);
    c.moveTo(290, 130);
    c.lineTo(304, 176);
    c.moveTo(290, 130);
    c.lineTo(290, 176);
    c.stroke();
  }
  if (kind === "arcade") {
    wall("#1a1033", "#0e0820");
    floor("#160c2b");
    for (let x = 0; x < W; x += 20) {
      c.fillStyle = x % 40 ? "#2a1650" : "#160c2b";
      c.fillRect(x, 150, 20, 40);
    }
    [
      ["#ff3fa4", 20],
      ["#29b6f6", 110],
      ["#ffd54f", 200],
      ["#66bb6a", 290]
    ].forEach(([col, x]) => {
      rr(c, x, 30, 56, 124, 6, "#2a1f45");
      c.save();
      c.shadowColor = col;
      c.shadowBlur = 14;
      rr(c, x + 6, 40, 44, 36, 3, col);
      c.restore();
      rr(c, x + 6, 92, 44, 14, 3, "#120a22");
      ell(c, x + 18, 99, 4, 4, "#e53935");
      ell(c, x + 34, 99, 4, 4, "#29b6f6");
    });
    c.save();
    c.shadowColor = "#ff3fa4";
    c.shadowBlur = 12;
    c.fillStyle = "#ff9fd2";
    c.font = '800 22px "Barlow Condensed"';
    c.textAlign = "center";
    c.fillText($t("art.9"), 180, 22);
    c.restore();
    drawKid(
      c,
      180,
      186,
      0.8,
      { skin: SKINS[0], hatStyle: "kep", hat: "#7e57c2" },
      { jersey: "#7e57c2", sleeves: true, mood: "mutlu" }
    );
  }
  if (kind === "club") {
    wall("#12081f", "#05020b");
    floor("#1a0f2e");
    ["#ff3fa4", "#29b6f6", "#ffd54f", "#66bb6a"].forEach((col, i) => {
      c.fillStyle = col;
      c.globalAlpha = 0.16;
      c.beginPath();
      c.moveTo(180, 0);
      c.lineTo(40 + i * 95, 190);
      c.lineTo(90 + i * 95, 190);
      c.closePath();
      c.fill();
    });
    c.globalAlpha = 1;
    ell(c, 180, 22, 16, 16, "#b0bec5");
    [70, 140, 220, 290].forEach((x, i) =>
      drawKid(
        c,
        x,
        186,
        0.7,
        { skin: SKINS[i % 5], hatStyle: i % 2 ? "yok" : "uzun", hair: ["#111", "#7a4a22", "#e2c15a", "#2a1a10"][i] },
        { jersey: ["#e91e63", "#3949ab", "#00897b", "#f4511e"][i], sleeves: true, armsUp: i % 2 === 0, mood: "mutlu" }
      )
    );
  }
  if (kind === "sans") {
    wall("#3a0f14", "#22080b");
    floor("#5a1520");
    for (let x = 0; x < W; x += 30)
      for (let y = 150; y < H; y += 20) {
        c.fillStyle = "rgba(216,178,90,.12)";
        c.beginPath();
        c.arc(x + 15, y + 10, 4, 0, 7);
        c.fill();
      }
    for (let i = 0; i < 6; i++) {
      c.fillStyle = "#d8b25a";
      ell(c, 30 + i * 60, 16, 8, 8, "#d8b25a");
    }
    ell(c, 180, 170, 150, 34, "#0d5c37");
    ell(c, 180, 166, 140, 28, "#13703f");
    drawKid(
      c,
      180,
      150,
      0.92,
      { skin: SKINS[1], hatStyle: "yok", hair: "#111" },
      { adult: true, jersey: "#fafafa", sleeves: true, bow: "#141414", noLegs: true, mood: "" }
    );
    rr(c, 150, 110, 60, 40, 4, "#141414", false);
    for (let i = 0; i < 5; i++) {
      ell(c, 110 + i * 8, 160 - i * 3, 10, 4, ["#d0142c", "#141414", "#1e88e5", "#d0142c", "#fff"][i]);
    }
  }
  if (kind === "ofis") {
    wall("#1d2738", "#141b28");
    floor("#2a2420");
    rr(c, 20, 16, 160, 110, 4, "#0f1724");
    for (let i = 0; i < 10; i++) {
      const h = 20 + ((i * 37) % 70);
      c.fillStyle = "#22324d";
      c.fillRect(26 + i * 15, 126 - h, 12, h);
      c.fillStyle = "#ffd66b";
      c.fillRect(30 + i * 15, 130 - h + 6, 3, 3);
    }
    drawKid(
      c,
      260,
      170,
      0.95,
      { skin: SKINS[1], hatStyle: "yok", hair: "#333" },
      { adult: true, jersey: "#22304a", sleeves: true, tie: "#d8b25a", glasses: true, noLegs: true, mood: "mutlu" }
    );
    rr(c, 170, 140, 180, 14, 3, "#5d4037");
    rr(c, 200, 124, 40, 16, 2, "#eceff1");
  }
}

/* ================= VİTRİN ODASI ================= */
export const ROOM = {
  oda: ["#6d5a48", "#4e3f33", "#8d6e4f"],
  yurt: ["#4b5066", "#363a4c", "#6b5a48"],
  daire: ["#3a4558", "#2a3344", "#7a6450"],
  lux: ["#2b2f3a", "#1c1f27", "#cfd2d8"],
  villa: ["#463a2c", "#2e261d", "#d9cbb0"],
  malikane: ["#2b1f1c", "#1a1210", "#e8dcc0"]
};
export async function vitrineCanvas() {
  const W = 360,
    H = 260;
  const [cv, c] = hiCanvas(W, H);
  const r = ROOM[late.S.housing] || ROOM.daire;
  let g = c.createLinearGradient(0, 0, 0, 190);
  g.addColorStop(0, r[0]);
  g.addColorStop(1, r[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, 190);
  const marble = late.S.housing === "lux" || late.S.housing === "malikane";
  g = c.createLinearGradient(0, 190, 0, H);
  g.addColorStop(0, r[2]);
  g.addColorStop(1, shade(r[2], -40));
  c.fillStyle = g;
  c.fillRect(0, 190, W, H - 190);
  c.strokeStyle = "rgba(0,0,0,.18)";
  for (let x = -40; x < W + 40; x += marble ? 60 : 28) {
    c.beginPath();
    c.moveTo(x, 190);
    c.lineTo(x - 30, H);
    c.stroke();
  }
  if (late.S.housing === "malikane" || late.S.housing === "villa") {
    c.strokeStyle = "#d8b25a";
    c.lineWidth = 2;
    c.strokeRect(6, 6, W - 12, 180);
  }
  // pencere: şehir silueti
  c.fillStyle = "#0e1a2e";
  c.fillRect(262, 22, 82, 74);
  for (let i = 0; i < 7; i++) {
    const h = 14 + ((hash(late.S.city) * (i + 3)) % 40);
    c.fillStyle = "#22324d";
    c.fillRect(264 + i * 12, 96 - h, 10, h);
    c.fillStyle = "#ffd66b";
    c.fillRect(267 + i * 12, 100 - h, 2, 2);
  }
  c.strokeStyle = "#cfd2d8";
  c.lineWidth = 3;
  c.strokeRect(262, 22, 82, 74);
  c.beginPath();
  c.moveTo(303, 22);
  c.lineTo(303, 96);
  c.stroke();
  c.fillStyle = "#cfd2d8";
  c.font = "700 9px Manrope";
  c.fillText(late.S.city, 266, 110);
  // forma çerçeveleri
  const teams = [...new Map(late.S.hist.map(h => [h.team, h])).values()].slice(-4);
  teams.forEach((h, i) => {
    const x = 14 + i * 60,
      y = 14;
    c.fillStyle = "#d8b25a";
    c.fillRect(x, y, 52, 58);
    c.fillStyle = "#111";
    c.fillRect(x + 3, y + 3, 46, 52);
    c.save();
    c.translate(x + 26, y + 30);
    c.beginPath();
    c.moveTo(-14, -18);
    c.lineTo(-6, -20);
    c.quadraticCurveTo(0, -14, 6, -20);
    c.lineTo(14, -18);
    c.lineTo(16, -8);
    c.lineTo(11, -6);
    c.lineTo(11, 20);
    c.lineTo(-11, 20);
    c.lineTo(-11, -6);
    c.lineTo(-16, -8);
    c.closePath();
    c.fillStyle = h.c1 || "#c8102e";
    c.fill();
    c.strokeStyle = h.c2 || "#fff";
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = h.c2 || "#fff";
    c.font = '800 13px "Barlow Condensed"';
    c.textAlign = "center";
    c.fillText(late.S.num, 0, 8);
    c.restore();
    c.textAlign = "left";
  });
  // raf
  const sx = 14,
    sw = 236,
    ys = [118, 158];
  c.fillStyle = marble ? "#e9e3d6" : "#5d4037";
  ys.forEach(y => {
    c.fillRect(sx, y, sw, 7);
    c.fillStyle = shade(marble ? "#e9e3d6" : "#5d4037", -30);
    c.fillRect(sx, y + 7, sw, 3);
    c.fillStyle = marble ? "#e9e3d6" : "#5d4037";
  });
  // içerik
  const tro = late.S.career.trophies.map(t => ({ k: late.trophyIcon(t), label: t.label }));
  const itemIcons = {
    ayak1: ["sneaker", "#cfd8dc", "#1e88e5"],
    ayak2: ["sneaker", late.S.team.c1, late.S.team.c2 === "#ffffff" ? "#141414" : late.S.team.c2],
    top: ["ball"],
    telefon: ["phone"],
    konsol: ["console"],
    kiyafet: ["hoodie", "#37474f"],
    saat: ["watch"],
    kulaklik: ["headphones"],
    araba1: ["car", "#1e88e5", "hatch"],
    araba2: ["car", "#eceff1", "suv"],
    araba3: ["car", "#d0142c", "super"],
    hoca: ["whistle"]
  };
  const its = [
    ...late.SHOP.filter(it => late.S.items[it.id]).map(it => ({ svg: it.ic() })),
    ...(late.S.items.hoca ? [{ svg: icon("whistle") }] : [])
  ];
  const slots = [...tro, ...its];
  const pos = [];
  for (let r2 = 0; r2 < 2; r2++) for (let k = 0; k < 6; k++) pos.push([sx + 6 + k * 38, ys[r2] - 34]);
  const mk = s => s.svg || icon(...s.k);
  for (let i = 0; i < Math.min(slots.length, 12); i++) {
    const im = await svgImage(mk(slots[i]));
    if (im) c.drawImage(im, pos[i][0], pos[i][1], 34, 34);
  }
  // zemin: araba posteri / top
  const extra = slots.slice(12);
  for (let i = 0; i < Math.min(extra.length, 6); i++) {
    const im = await svgImage(mk(extra[i]));
    if (im) c.drawImage(im, 14 + i * 42, 204, 40, 40);
  }
  if (!slots.length) {
    c.fillStyle = "rgba(255,255,255,.75)";
    c.font = "700 12px Manrope";
    c.textAlign = "center";
    c.fillText($t("art.10"), 132, 145);
    c.font = "600 10px Manrope";
    c.fillText($t("art.11"), 132, 162);
    c.textAlign = "left";
  }
  // halı ve top
  ell(c, 300, 226, 46, 12, "rgba(0,0,0,.25)", 0, false);
  const bim = await svgImage(icon("ball"));
  if (bim) c.drawImage(bim, 282, 192, 36, 36);
  return cv;
}
