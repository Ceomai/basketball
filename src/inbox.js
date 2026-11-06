/* ================= BİLDİRİM KUTUSU + HAFTALIK KOÇ ÖNERİSİ =================
   - Bildirim kutusu: kısa bildirimler (toast, src/data.js) ve haberler (news, src/core.js) S.inbox içinde hafta
     etiketiyle saklanır (en fazla 40). Ana ekranın üst şeridinde okunmamış sayısını gösteren zil; dokununca geçmiş
     açılır ve sayı sıfırlanır.
   - Koç önerisi: hafta kartında ve hafta planında tek satırlık "Bu hafta:" önerisi. Kurallı ve deterministik:
     sakatlık → enerji → önemli maç → sözleşme → okul → para → moral → koç → kondisyon → varsayılan. */
import { t as $t } from "./i18n/index.js";
import { $, Bus, esc, isPro } from "./data.js";
import { S, sheet } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const MAX = 40;
const box = () => (S.inbox = S.inbox && Array.isArray(S.inbox.items) ? S.inbox : { items: [], unread: 0 });

/** Bildirim kutusuna kayıt ekle (k: "toast" | "news") */
export function inboxAdd(t, k = "toast") {
  if (!S || window.__SIM || S.retired || t == null) return;
  const b = box(),
    txt = String(t).trim(),
    w = `S${S.season || 1} H${S.week || 1}`;
  if (!txt) return;
  // aynı haftada aynı metin (örn. hem bildirim hem haber) tek kayıt
  if (b.items.slice(0, 6).some(x => x.t === txt && x.w === w)) return;
  b.items.unshift({ w, t: txt, k });
  if (b.items.length > MAX) b.items.length = MAX;
  b.unread = Math.min(MAX, (b.unread || 0) + 1);
  paintBell();
}
export const inboxUnread = () => (S && S.inbox ? S.inbox.unread || 0 : 0);

function paintBell() {
  const n = inboxUnread(),
    c = document.getElementById("ibx-n");
  if (!c) return;
  c.textContent = n > 9 ? "9+" : String(n);
  c.hidden = !n;
}
const BELL = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/></svg>`;

export function inboxSheet() {
  const b = box();
  b.unread = 0;
  save();
  sheet(
    $t("ibx.title"),
    $t("ibx.sub", { n: b.items.length }),
    b.items.length
      ? `<div class="news ibx-list">${b.items.map(x => `<div><time>${esc(x.w)}</time><span>${x.k === "news" ? "📰 " : ""}${esc(x.t)}</span></div>`).join("")}</div>`
      : `<p class="small muted">${$t("ibx.empty")}</p>`
  );
}

/* ---- Koç önerisi ---- */
/** Bu haftanın tek satırlık önerisi (anahtar + parametre); deterministik */
export function coachTipKey() {
  if (!S || S.retired) return null;
  if (S.slot <= 0) return ["match"];
  if (S.injury) return S.injury.w > 1 && !S.injury.rehab ? ["rehab"] : ["heal"];
  if (S.energy < 35) return ["rest"];
  const big = late.bigMatch ? late.bigMatch() : null;
  if (big) return ["big", { v: big.label }];
  if (isPro(S.stage) && S.contract <= 1) return ["agent"];
  if (S.studying && S.stage !== "lise" && S.aka < 40) return ["study"];
  if (S.stage === "lise" && (S.stageSeason || 1) >= 2 && S.aka < 55) return ["exam"];
  if (S.money < Math.max(20, (S.wage || 0) * 2)) return ["money"];
  if (S.moral < 35) return ["moral"];
  if (S.rel && S.rel.koc < 30) return ["coach"];
  if (S.fit != null && S.fit < 50) return ["fit"];
  return ["train"];
}
export function coachTipText() {
  const k = coachTipKey();
  return k ? $t(`ctip.${k[0]}`, k[1] || {}) : "";
}
export function coachTipHTML() {
  const t = coachTipText();
  return t ? `<div class="ctip small" id="ctip"><b>${$t("ctip.lead")}</b> ${esc(t)}</div>` : "";
}

Bus.on("screen:main", () => {
  if (!S || S.retired || window.__SIM) return;
  const id = $(".hud-id");
  if (id && !document.getElementById("ibx-bell")) {
    const btn = document.createElement("button");
    btn.className = "ibx-bell";
    btn.id = "ibx-bell";
    btn.setAttribute("aria-label", $t("ibx.title"));
    btn.innerHTML = `${BELL}<span class="ibx-n" id="ibx-n" hidden></span>`;
    btn.onclick = inboxSheet;
    id.appendChild(btn);
    paintBell();
  }
  const tb = $(".weekcard .timebar");
  if (tb && !document.getElementById("ctip")) tb.insertAdjacentHTML("afterend", coachTipHTML());
});
