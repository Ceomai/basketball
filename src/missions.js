import { t as $t } from "./i18n/index.js";
/* ================= GÜNLÜK VE HAFTALIK GÖREVLER =================
   Gerçek takvime göre: her gün 3 günlük görev, her hafta (pazartesi) 3 haftalık görev.
   Görevler oyundaki olaylardan otomatik ilerler (maç, antrenman, mini oyun, satın alma, basın).
   Ödüller: para (kariyer basamağına göre), enerji ya da Oyun Kulübü fişi. Üç günlük görevin hepsi bitince ek ödül.
   Bilerek "reklam izle" ya da "maçı hızlı geç" görevi yok: görevler oyunun kendisini oynatmalı. */
import { $, $$, Bus, esc, fmt, shuffle } from "./data.js";
import { S, norm, sheet, tx } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const D = (id, n, goal, ev, test, reward) => ({ id, n, goal, ev, test, reward });
export const DAILY = [
  D("win", $t("missions.1"), 1, "match:end", d => d.win, "money"),
  D("manual", $t("missions.2"), 1, "match:end", d => !d.auto, "energy"),
  D("pts15", $t("missions.3"), 1, "match:end", d => (d.pts || 0) >= 15, "money"),
  D("train2", $t("missions.4"), 2, "train:done", () => true, "energy"),
  D("shots3", $t("missions.5"), 3, "minigame:end", d => d.kind === "shoot", "chips"),
  D("rating7", $t("missions.6"), 1, "match:end", d => (d.rating || 0) >= 7, "money"),
  D("social", $t("missions.7"), 1, "social:done", () => true, "energy")
];
export const WEEKLY = [
  D("win4", $t("missions.8"), 4, "match:end", d => d.win, "money"),
  D("manual5", $t("missions.9"), 5, "match:end", d => !d.auto, "money"),
  D("rating8", $t("missions.10"), 1, "match:end", d => (d.rating || 0) >= 8, "money"),
  D("train8", $t("missions.11"), 8, "train:done", () => true, "energy"),
  D("press", $t("missions.12"), 1, "press", () => true, "chips"),
  D("buy", $t("missions.13"), 1, "purchase", () => true, "chips")
];
// yerel gün (gece yarısı yenilenir; UTC kullanılsaydı Türkiye'de 03:00'te yenilenirdi)
const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const validDay = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
/** "2026-W5" → 202605 (karşılaştırma için; eski kayıtlardaki dolgusuz biçim de okunur) */
const weekNum = k => {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(k || "");
  return m ? +m[1] * 100 + +m[2] : 0;
};
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t - y) / 86400000 + 1) / 7)}`;
}
const fresh = (list, n) =>
  shuffle(list)
    .slice(0, n)
    .map(m => ({ id: m.id, p: 0, done: false, claimed: false }));
/** Görev durumunu güncelle (gün/hafta değiştiyse yenile) */
export function missions() {
  if (!S) return null;
  const M = (S.missions = S.missions && typeof S.missions === "object" ? S.missions : {});
  // bozuk ya da eski sürümden kalan görevler (silinmiş görev türü) yenilenir
  if (!Array.isArray(M.daily) || M.daily.some(m => !m || !def(m.id))) M.day = null;
  if (!Array.isArray(M.weekly) || M.weekly.some(m => !m || !def(m.id))) M.week = null;
  // Cihaz saati geri alınırsa yeni gün/hafta sayılmaz (saat oynatarak görev ödülü yenilenmesin):
  // yalnızca daha önce görülenden ileri bir gün ya da hafta görevleri yeniler. Bozuk görev verisinde day/week null.
  const d = today(),
    w = weekKey();
  if (M.day !== d && (!M.day || !validDay(M.day) || d > M.day))
    Object.assign(M, { day: d, daily: fresh(DAILY, 3), bonus: false });
  if (M.week !== w && (!M.week || weekNum(M.week) === 0 || weekNum(w) > weekNum(M.week)))
    Object.assign(M, { week: w, weekly: fresh(WEEKLY, 3) });
  return M;
}
function def(id) {
  return DAILY.find(d => d.id === id) || WEEKLY.find(d => d.id === id);
}
function progress(ev, data) {
  if (!late.unlocked("gorev")) return;
  const M = missions();
  if (!M || window.__SIM) return;
  let changed = false;
  for (const m of [...M.daily, ...M.weekly]) {
    const d = def(m.id);
    if (!d || m.done || d.ev !== ev || !d.test(data || {})) continue;
    m.p += ev === "minigame:end" && data && data.made != null ? data.made : 1;
    if (m.p >= d.goal) {
      m.p = d.goal;
      m.done = true;
      late.toast(
        $t("missions.14", {
          n: d.n
        })
      );
      Bus.emit("mission:done", { id: m.id });
    }
    changed = true;
  }
  if (changed) save();
}
for (const ev of ["match:end", "train:done", "minigame:end", "social:done", "press", "purchase"])
  Bus.on(ev, d => progress(ev, d));

function rewardOf(kind, weekly) {
  const base = Math.max(20, Math.round((S.wage || 10) * (weekly ? 2 : 0.5)));
  return kind === "money" ? { money: base } : kind === "energy" ? { energy: weekly ? 40 : 20 } : late.focusOff("kumar") ? { money: base } : { chips: weekly ? 800 : 250 }; // oyun kulübü kapalıysa para
}
const rewardText = r =>
  r.money
    ? `+${fmt(r.money)}`
    : r.energy
      ? $t("missions.15", {
          energy: r.energy
        })
      : $t("missions.16", {
          chips: r.chips
        });
function grant(r, label) {
  if (r.money) tx(label, r.money);
  if (r.energy) S.energy += r.energy;
  if (r.chips) S.chips = (S.chips == null ? 1000 : S.chips) + r.chips;
  norm();
}
/** Ana ekran kartı */
export function missionsHTML() {
  const M = missions();
  if (!M) return "";
  const row = (m, weekly) => {
    const d = def(m.id),
      r = rewardOf(d.reward, weekly);
    return `<div class="mrow"><div><b>${esc(d.n)}</b><div class="bar"><i style="width:${(m.p / d.goal) * 100}%;background:${m.done ? "var(--good)" : "var(--gold)"}"></i></div></div><button class="btn ${m.claimed ? "ghost" : m.done ? "pri" : "ghost"} sm" data-ms="${weekly ? "w" : "d"}:${m.id}" ${!m.done || m.claimed ? "disabled" : ""}>${m.claimed ? $t("missions.17") : `${m.p}/${d.goal} · ${rewardText(r)}`}</button></div>`;
  };
  const allDaily = M.daily.every(m => m.claimed);
  return `<div class="card missions"><div class="row between"><div class="eyebrow">${$t("missions.19")}</div><span class="small muted">${$t("missions.20")}</span></div>${M.daily.map(m => row(m, false)).join("")}
   ${allDaily && !M.bonus ? `<button class="btn team sm" id="ms-bonus">${$t("missions.18")}</button>` : ""}
   <div class="eyebrow mt-1h">${$t("missions.21")}</div>${M.weekly.map(m => row(m, true)).join("")}</div>`;
}
export function bindMissions(re) {
  $$("[data-ms]").forEach(
    b =>
      (b.onclick = () => {
        const [kind, id] = b.dataset.ms.split(":"),
          M = missions(),
          m = (kind === "w" ? M.weekly : M.daily).find(x => x.id === id);
        if (!m || !m.done || m.claimed) return;
        m.claimed = true;
        grant(rewardOf(def(id).reward, kind === "w"), `${$t("missions.22")} ${def(id).n}`);
        late.sfx("coin");
        save();
        re();
      })
  );
  const bn = $("#ms-bonus");
  if (bn)
    bn.onclick = () => {
      const M = missions();
      M.bonus = true;
      S.energy += 30;
      norm();
      save();
      re();
    };
}
// görev sayısı rozeti (bildirim ve ana ekran için)
export const openMissions = () => {
  const M = missions();
  return M ? [...M.daily, ...M.weekly].filter(m => !m.done).length : 0;
};
export const claimable = () => {
  const M = missions();
  return M ? [...M.daily, ...M.weekly].filter(m => m.done && !m.claimed).length : 0;
};

/** Görevler paneli (ana ekrandaki düğmeden açılır) */
export function missionsSheet() {
  sheet($t("missions.23"), $t("missions.24"), missionsHTML());
  bindMissions(missionsSheet);
}
/** Ana ekran düğmesi */
export function missionsButtonHTML() {
  if (!late.unlocked("gorev")) return "";
  const c = claimable(),
    o = openMissions();
  return `<button class="btn ghost has-dot" id="msb">${$t("missions.27")} ${
    c
      ? $t("missions.25", {
          c: c
        })
      : $t("missions.26", {
          o: o
        })
  }${c ? late.newDot() : ""}</button>`;
}
