/* ================= PAYLAŞILABİLİR KARİYER KARTI =================
   Emeklilik ekranında ve Ev → Miras sekmesinde: kariyerin tek bir görselde özeti (1080×1350, dikey paylaşım boyutu).
   Portre, takım renkleri, toplam istatistikler, kupalar, Şöhretler Müzesi kademesi, kulüpler ve en iyi sezon.
   Uygulamada yerel paylaşım menüsü; web'de paylaş (destekleniyorsa) ya da PNG indir. */
import { LOCALE, t as $t } from "./i18n/index.js";
import { $, POS, esc, toast } from "./data.js";
import { portrait, svgImage } from "./art.js";
import { S, fullName, sheet } from "./core.js";
import { late } from "./late.js";

const up = s => String(s).toLocaleUpperCase(LOCALE); // Türkçede i → İ
const W = 1080,
  H = 1350;
const DISP = '"Barlow Condensed","Arial Narrow",Impact,sans-serif',
  BODY = '"Manrope","Segoe UI",system-ui,sans-serif';

function stats() {
  const k = S.career || {},
    hist = S.hist || [];
  const clubs = [];
  for (const h of hist) if (h.team && !clubs.includes(h.team)) clubs.push(h.team);
  const best = hist
    .filter(h => h.g)
    .map(h => ({ ...h, ppg: h.pts / h.g }))
    .sort((a, b) => b.avg - a.avg || b.ppg - a.ppg)[0];
  const score = late.legacyScore ? late.legacyScore() : 0;
  return {
    games: k.games || 0,
    pts: k.pts || 0,
    ast: k.ast || 0,
    reb: k.reb || 0,
    trophies: (k.trophies || []).length,
    mvps: k.mvps || 0,
    clubs,
    best,
    score,
    tier: late.hofTier ? late.hofTier(score)[1] : "",
    seasons: hist.length
  };
}
const fit = (c, text, max, size, font) => {
  let s = size;
  do c.font = `700 ${s}px ${font}`;
  while (c.measureText(text).width > max && (s -= 4) > 20);
  return s;
};

/** Kart tuvali */
export async function careerCardCanvas() {
  try {
    await Promise.all([document.fonts.load(`700 80px ${DISP}`), document.fonts.load(`600 30px ${BODY}`)]);
  } catch (e) {
    /* yazı tipi yoksa yedek yazı tipi */
  }
  const st = stats(),
    c1 = (S.team && S.team.c1) || "#ff6a2b",
    c2 = (S.team && S.team.c2) || "#ffffff";
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d");
  // arka plan: takım rengi → gece mavisi
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1);
  g.addColorStop(0.55, "#101827");
  g.addColorStop(1, "#090d15");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.08;
  c.fillStyle = "#fff";
  for (let i = 0; i < 9; i++) c.fillRect(-200 + i * 160, 0, 60, H);
  c.globalAlpha = 1;
  // portre
  const pc = portrait(S.look, { jersey: c1, trim: c2, number: S.num, mood: "mutlu" }, 380, 380, c1);
  c.save();
  c.beginPath();
  c.arc(W - 250, 270, 190, 0, Math.PI * 2);
  c.closePath();
  c.fillStyle = "rgba(0,0,0,.25)";
  c.fill();
  c.clip();
  c.drawImage(pc, W - 440, 80, 380, 380);
  c.restore();
  c.lineWidth = 8;
  c.strokeStyle = c2;
  c.beginPath();
  c.arc(W - 250, 270, 190, 0, Math.PI * 2);
  c.stroke();
  // başlık
  c.fillStyle = "rgba(255,255,255,.8)";
  c.font = `700 34px ${DISP}`;
  c.fillText(up($t("card.brand")), 70, 110);
  c.fillStyle = "#fff";
  const name = up(fullName());
  const ns = fit(c, name, 560, 110, DISP);
  c.font = `700 ${ns}px ${DISP}`;
  const parts = name.split(" ");
  if (c.measureText(name).width > 560 && parts.length > 1) {
    c.fillText(parts.slice(0, -1).join(" "), 70, 220);
    c.fillText(parts[parts.length - 1], 70, 220 + ns);
  } else c.fillText(name, 70, 240);
  c.font = `600 34px ${BODY}`;
  c.fillStyle = "rgba(255,255,255,.85)";
  c.fillText(`${(POS[S.pos] || {}).n || S.pos} · #${S.num} · ${$t("card.seasons", { n: st.seasons })}`, 70, 400);
  // oyun kimliği: özellikler ve mod
  const ids = [
    ...(late.traitNames ? late.traitNames() : []),
    ...(S.mode && S.mode !== "normal" && late.modeName ? [late.modeName(S.mode)] : [])
  ];
  if (ids.length) {
    c.fillStyle = "#d8b25a";
    fit(c, up(ids.join(" · ")), 560, 30, DISP);
    c.fillText(up(ids.join(" · ")), 70, 450);
  }
  // unvan (başarımlar) ve ayakkabı tasarımı (src/feats.js, src/custom.js)
  const ttl = late.titleText ? late.titleText() : "";
  if (ttl) {
    c.fillStyle = "rgba(255,255,255,.9)";
    fit(c, "« " + up(ttl) + " »", 560, 30, DISP);
    c.fillText("« " + up(ttl) + " »", 70, 154);
  }
  if (S.shoe && S.shoe.made && late.shoeSVG) {
    const im = await svgImage(late.shoeSVG(S.shoe, 260));
    if (im) c.drawImage(im, W - 380, 486, 260, 132);
  }
  // Şöhretler Müzesi
  c.fillStyle = "#d8b25a";
  c.font = `700 52px ${DISP}`;
  c.fillText(up(st.tier), 70, 540);
  c.font = `600 30px ${BODY}`;
  c.fillStyle = "rgba(255,255,255,.75)";
  c.fillText($t("card.legacy", { v: st.score }), 70, 584);
  // istatistik kutuları
  const boxes = [
    [st.games, $t("card.games")],
    [st.pts, $t("card.pts")],
    [st.ast, $t("card.ast")],
    [st.reb, $t("card.reb")],
    [st.trophies, $t("card.trophies")],
    [st.mvps, "MVP"]
  ];
  boxes.forEach(([v, l], i) => {
    const x = 70 + (i % 3) * 320,
      y = 640 + Math.floor(i / 3) * 190;
    c.fillStyle = "rgba(255,255,255,.07)";
    c.strokeStyle = "rgba(255,255,255,.14)";
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect ? c.roundRect(x, y, 300, 165, 22) : c.rect(x, y, 300, 165);
    c.fill();
    c.stroke();
    c.fillStyle = "#fff";
    fit(c, String(v), 260, 84, DISP);
    c.fillText(String(v), x + 26, y + 98);
    c.fillStyle = "rgba(255,255,255,.65)";
    c.font = `700 28px ${DISP}`;
    c.fillText(up(l), x + 26, y + 142);
  });
  // kulüpler ve en iyi sezon
  c.fillStyle = "rgba(255,255,255,.65)";
  c.font = `700 28px ${DISP}`;
  c.fillText(up($t("card.clubs")), 70, 1060);
  c.fillStyle = "#fff";
  const clubs = st.clubs.slice(-5).join(" · ") || "-";
  fit(c, clubs, W - 140, 38, BODY);
  c.fillText(clubs, 70, 1108);
  if (st.best) {
    c.fillStyle = "rgba(255,255,255,.65)";
    c.font = `700 28px ${DISP}`;
    c.fillText(up($t("card.best")), 70, 1172);
    c.fillStyle = "#fff";
    const b = $t("card.bestLine", {
      label: st.best.label,
      team: st.best.team,
      ppg: st.best.ppg.toFixed(1),
      avg: st.best.avg.toFixed(1)
    });
    fit(c, b, W - 140, 36, BODY);
    c.fillText(b, 70, 1218);
  }
  // alt bant
  c.fillStyle = c1;
  c.fillRect(0, H - 70, W, 70);
  c.fillStyle = "#fff";
  c.font = `700 30px ${DISP}`;
  c.fillText(up($t("card.footer")), 70, H - 24);
  return cv;
}

const fileName = () => `pota-kariyeri-${(S.first + "-" + S.last).toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi, "-")}.png`;

/** Paylaş: uygulamada yerel menü, web'de paylaş ya da indir */
export async function shareCareerCard(cv) {
  cv = cv || (await careerCardCanvas());
  const name = fileName(),
    title = $t("card.shareTitle", { v: fullName() });
  if (late.nativeShareImage) {
    await late.nativeShareImage(name, cv.toDataURL("image/png").split(",")[1], title);
    return;
  }
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  try {
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text: $t("card.shareText") });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  downloadCard(blob, name);
}
function downloadCard(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
  toast($t("card.saved"));
}

/** Önizleme paneli */
export async function careerCardSheet(onClose) {
  const cv = await careerCardCanvas();
  sheet(
    $t("card.title"),
    esc(fullName()),
    `<img src="${cv.toDataURL("image/png")}" alt="${$t("card.title")}" style="width:100%;border-radius:14px;display:block">
     <div class="grid2"><button class="btn ghost" id="cc-dl">${$t("card.download")}</button><button class="btn pri" id="cc-share">${$t("card.share")}</button></div>`,
    onClose ? { onClose } : {}
  );
  $("#cc-share").onclick = () => shareCareerCard(cv).catch(() => toast($t("card.fail")));
  $("#cc-dl").onclick = () => cv.toBlob(b => downloadCard(b, fileName()), "image/png");
}
export const cardButtonHTML = () => `<button class="btn team" id="ccard">${$t("card.button")}</button>`;
export function bindCardButton(onClose) {
  const b = $("#ccard");
  if (b) b.onclick = () => careerCardSheet(onClose);
}
