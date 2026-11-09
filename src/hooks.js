/* ================= ERTESİ GÜNE KALAN HİKÂYE ANLARI + "BUGÜN" PANELİ =================
   Oturumda birkaç maç oynandıktan sonra açık uçlu bir olay belirir ("Yarın bir gözlemci maçını izleyecek").
   Sonucu gerçek takvimde ertesi gün oyunu açınca ortaya çıkar. Oyuncu bekletilmez (oyun akışını hiç durdurmaz);
   merakla geri çağrılır. Sonuçlar küçük ve çoğunlukla olumlu; sponsor görüşmesi bir seçim ister.
   - En fazla bir bekleyen olay; günde en fazla bir yeni olay
   - Saat geri alınırsa çözülmez (çözüm için bugünün tarihi olayın gününden ileri olmalı)
   - Uygulamada ertesi günün bildirimi bu olayı hatırlatır (src/notify.js)
   "Bugün" paneli: Günün Maçı, günlük kutu ve bekleyen olay tek yerde (ana ekrandaki "Bugün" düğmesi). */
import { t as $t } from "./i18n/index.js";
import { $, Bus, esc, fmt, isPro, pick } from "./data.js";
import { S, closeSheet, fame, lgName, news, norm, sheet, tx } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";
import { localDay } from "./daily.js";

let matchesNow = 0; // bu oturumda oynanan maç
const HOOKS = [
  { id: "scout", ok: () => true },
  { id: "sponsor", ok: () => fame() >= 8 },
  { id: "interview", ok: () => true },
  { id: "dinner", ok: () => true },
  { id: "family", ok: () => true },
  { id: "national", ok: () => isPro(S.stage) },
  { id: "rumor", ok: () => isPro(S.stage) }
];
const vars = () => ({
  agent: S.npc.agent,
  coach: S.npc.coach,
  j: S.npc.journalist,
  lg: lgName(),
  mom: S.npc.mom
});
export const hookText = () => (S && S.hook ? $t(`hk.${S.hook.id}`, vars()) : "");
export const hookDue = () => !!(S && S.hook && localDay() > S.hook.day);

Bus.on("match:end", () => {
  if (!S || window.__SIM) return;
  matchesNow++;
  const d = localDay();
  if (S.hook || S.hookLast === d || matchesNow < 2 || Math.random() > 0.6) return;
  const pool = HOOKS.filter(h => h.ok() && h.id !== S.hookPrev);
  const h = pick(pool);
  S.hook = { id: h.id, day: d };
  S.hookLast = d;
  news($t("hk.news", { t: $t(`hk.${h.id}`, vars()) }));
});

/** Ertesi gün: olayın sonucu (seçimli olanlar için c: "a" | "b") */
export function resolveHook(c) {
  const h = S.hook;
  if (!h) return null;
  const out = [];
  let txt;
  switch (h.id) {
    case "scout":
      S.buffs.offer = 1;
      S.followers = Math.round(S.followers * 1.03);
      txt = $t("hk.r.scout", vars());
      out.push([$t("hk.fx.offer"), "p"]);
      break;
    case "sponsor": {
      const v = Math.max(25, Math.round(S.wage * 1.2));
      if (c === "b") {
        S.rel.taraf += 4;
        txt = $t("hk.r.sponsorNo", vars());
        out.push([$t("hk.fx.fans", { v: 4 }), "p"]);
      } else {
        tx($t("hk.sponsorTx"), v);
        S.rel.taraf -= 1;
        txt = $t("hk.r.sponsorYes", { ...vars(), v: fmt(v) });
        out.push([`+${fmt(v)}`, "p"]);
      }
      break;
    }
    case "interview": {
      const good = S.moral >= 45 || Math.random() < 0.6;
      S.rel.taraf += good ? 4 : -1;
      S.followers = Math.round(S.followers * (good ? 1.04 : 1.01));
      txt = good ? $t("hk.r.interview", vars()) : $t("hk.r.interviewBad", vars());
      out.push([$t("hk.fx.fans", { v: good ? 4 : -1 }), good ? "p" : "n"]);
      break;
    }
    case "dinner":
      S.rel.koc += 6;
      txt = $t("hk.r.dinner", vars());
      out.push([$t("hk.fx.coach", { v: 6 }), "p"]);
      break;
    case "family":
      S.rel.aile += 8;
      S.moral += 6;
      txt = $t("hk.r.family", vars());
      out.push([$t("hk.fx.family"), "p"]);
      break;
    case "national": {
      const inList = (late.seasonAvg() || 0) >= 6.8 || late.ovr() >= 70;
      S.moral += inList ? 8 : 2;
      if (inList) S.followers = Math.round(S.followers * 1.05);
      txt = inList ? $t("hk.r.national", vars()) : $t("hk.r.nationalNo", vars());
      out.push([inList ? $t("hk.fx.national") : $t("hk.fx.moral"), "p"]);
      break;
    }
    default:
      S.buffs.offer = 1;
      S.followers = Math.round(S.followers * 1.02);
      txt = $t("hk.r.rumor", vars());
      out.push([$t("hk.fx.offer"), "p"]);
  }
  S.hookPrev = h.id;
  S.hook = null;
  norm();
  save();
  Bus.emit("hook", { id: h.id, c: c || "" });
  return { txt, out };
}
function hookSheet(after) {
  const h = S.hook;
  const done = c => {
    const r = resolveHook(c);
    sheet(
      $t("hk.title"),
      $t("hk.sub"),
      `<div class="say gold">${esc(r.txt)}</div><div class="kv">${r.out.map(([a, k]) => `<span>${esc(a)}</span><b class="${k === "p" ? "good" : "bad"}">${k === "p" ? "✓" : "–"}</b>`).join("")}</div><button class="btn pri" id="hk-ok">${$t("goal.ok")}</button>`,
      { noClose: true }
    );
    $("#hk-ok").onclick = () => (closeSheet(), after && after());
  };
  if (h.id === "sponsor") {
    sheet(
      $t("hk.title"),
      $t("hk.sub"),
      `<p>${$t("hk.q.sponsor", vars())}</p><div class="grid2"><button class="btn ghost" id="hk-b">${$t("hk.sponsorB")}</button><button class="btn pri" id="hk-a">${$t("hk.sponsorA")}</button></div>`,
      { noClose: true }
    );
    $("#hk-a").onclick = () => done("a");
    $("#hk-b").onclick = () => done("b");
  } else done();
}
// ana ekran açılınca: dünden kalan olay varsa sonucu (başka bir panel açık değilse)
Bus.on("screen:main", () => {
  if (!hookDue() || window.__SIM) return;
  setTimeout(() => {
    if (hookDue() && !$("#ovl").innerHTML.trim() && $("#gostad")) hookSheet(() => late.renderMain());
  }, 350);
});

/* ---- "Bugün" paneli ---- */
/** "Yeni" rozeti (nokta): ekran okuyucuya "yeni" diye okunur */
export const newDot = () => `<span class="dot" aria-hidden="true"></span><span class="sr-only"> (${$t("s32.new")})</span>`;
const anyNew = () => late.dailyOpen() || late.boxReady() || hookDue();
export function todayButtonHTML() {
  if (!S || window.__SIM) return "";
  // yeni içerik: takım rengiyle değil, ghost düğme üzerinde rozetle (birincil yalnız "Maça hazırlan")
  return `<button class="btn ghost has-dot" id="today">${$t("today.btn")}${anyNew() ? newDot() : ""}</button>`;
}
/** Görevler düğmesiyle aynı satırda (yer kaplamasın) */
export function dayRowHTML(missionsBtn) {
  const t = todayButtonHTML();
  if (!t) return missionsBtn;
  return missionsBtn ? `<div class="grid2">${missionsBtn}${t}</div>` : t;
}
export function todaySheet(back = late.renderMain) {
  const hk = S.hook
    ? `<div class="card"><div class="eyebrow">${hookDue() ? $t("hk.dueTitle") : $t("hk.pendTitle")}</div><p class="small">${esc(hookText())}</p>${hookDue() ? `<button class="btn pri sm" id="hk-go">${$t("hk.see")}</button>` : `<p class="small muted">${$t("hk.wait")}</p>`}</div>`
    : "";
  sheet(
    $t("today.title"),
    $t("today.sub"),
    `${late.dailyCardHTML()}${hk}<div class="card"><div class="row between"><div class="eyebrow">${$t("adp.box")}</div>${late.boxReady() ? `<span class="pill g">${$t("today.ready")}</span>` : ""}</div><button class="btn ghost sm has-dot" id="dbox">${late.boxReady() ? $t("adp.boxOpen") + newDot() : $t("today.boxSee")}</button></div>`,
    { onClose: back } // kapatma yalnız ✕ (ayrı "Haritaya dön" düğmesi yok)
  );
  late.bindDailyCard(back);
  const g = $("#hk-go");
  if (g) g.onclick = () => hookSheet(back);
  $("#dbox").onclick = () => late.boxSheet(back);
}
