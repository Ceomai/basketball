/* ================= SEZON GECESİ =================
   Sezon sonu tek panelde, üç sekmede: "Sonuçlar" (sıralama, sezon istatistikleri, kupa/ödüller, hedefler, rakip),
   "Teklifler" (mevcut teklif/sözleşme seçimi — mantık src/match.js transition içinde aynen kalır) ve
   "Gelecek sezon" (yaz gelişimi, yaş, sözleşme, okul). Bölüm (chapter) paneli teklif seçildikten sonra gelir;
   hangi bölümün açılacağı seçilen teklife bağlı olduğundan sekmelere taşınmadı. */
import { t as $t } from "./i18n/index.js";
import { $$, STATS, esc, isPro } from "./data.js";
import { S, ovr, seasonLabel, standings } from "./core.js";

let tab = "res";
/** Yeni sezon gecesi: ilk sekme sonuçlar */
export function snReset() {
  tab = "res";
}
export const snTab = () => tab;

function statsCard() {
  const h = S.hist && S.hist[S.hist.length - 1];
  let rank = "";
  try {
    const st = S.league && S.league.length ? standings() : [];
    const i = st.findIndex(r => r.key === S.team.key);
    if (i >= 0) rank = `<span>${$t("sn.rank")}</span><b>${i + 1} / ${st.length}</b>`;
  } catch {
    rank = "";
  }
  if (!h || !h.g) return rank ? `<div class="card"><div class="kv">${rank}</div></div>` : "";
  const pg = k => (h[k] / h.g).toFixed(1);
  return `<div class="card"><div class="eyebrow">${$t("sn.stats")}</div><div class="kv">${rank}<span>${$t("sn.games")}</span><b>${h.g}</b><span>${$t("sn.ppg")}</span><b>${pg("pts")}</b><span>${$t("sn.apg")}</span><b>${pg("ast")}</b><span>${$t("sn.rpg")}</span><b>${pg("reb")}</b></div></div>`;
}

function futureHTML() {
  const g = S.snGrow || {};
  const rows = STATS.map(([k, n]) => {
    const d = g[k] || 0;
    return `<span>${esc(n)}</span><b class="${d > 0 ? "good" : d < 0 ? "bad" : "muted"}">${S.st[k]} (${d > 0 ? "+" : ""}${d})</b>`;
  }).join("");
  const con = isPro(S.stage)
    ? S.contract > 0
      ? $t("sn.conLeft", { n: S.contract })
      : $t("sn.conFree")
    : S.stage === "uni"
      ? $t("sn.uniYear", { n: S.uniYear || 1 })
      : $t("sn.school");
  const tips = [];
  if (S.age >= 34 || S.farewell) tips.push($t("sn.tipRet"));
  if (S.studying && S.stage !== "lise") tips.push($t("sn.tipStudy"));
  if (isPro(S.stage) && S.contract <= 1) tips.push($t("sn.tipCon"));
  tips.push($t("sn.tipNext"));
  return `<div class="card"><div class="eyebrow">${$t("sn.next", { v: seasonLabel() })}</div><div class="kv"><span>${$t("sn.age")}</span><b>${S.age}</b><span>${$t("sn.ovr")}</span><b>${ovr()}</b><span>${$t("sn.con")}</span><b>${con}</b></div></div>
  <div class="card"><div class="eyebrow">${$t("sn.grow")}</div><div class="kv">${rows}</div></div>
  ${tips.map(x => `<div class="small muted">• ${x}</div>`).join("")}`;
}

/** İstatistik kartını sonuç içeriğinin ilk kartından (sezon özeti) hemen sonra yerleştir */
function withStats(res) {
  const sc = statsCard();
  if (!res.startsWith("<div")) return sc + res;
  const re = /<\/?div\b/g;
  let d = 0,
    m;
  while ((m = re.exec(res))) {
    d += m[0] === "<div" ? 1 : -1;
    if (!d) {
      const end = m.index + 6;
      return res.slice(0, end) + sc + res.slice(end);
    }
  }
  return res + sc;
}
/** Sekmeli kabuk: res = sonuç içeriği (src/match.js seasonEnd "head"), off = teklif/emeklilik içeriği */
export function snShellHTML(res, off) {
  const T = [
    ["res", $t("sn.tRes")],
    ["off", $t("sn.tOff")],
    ["fut", $t("sn.tFut")]
  ];
  return `<div class="tabs sn-tabs" role="tablist">${T.map(([k, n]) => `<button role="tab" data-sn="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}">${n}</button>`).join("")}</div>
  <div class="sn-pane" data-snp="res" ${tab === "res" ? "" : "hidden"}>${withStats(res)}<button class="btn pri" id="sn-go">${$t("sn.toOffers")}</button></div>
  <div class="sn-pane" data-snp="off" ${tab === "off" ? "" : "hidden"}>${off}</div>
  <div class="sn-pane" data-snp="fut" ${tab === "fut" ? "" : "hidden"}>${futureHTML()}<button class="btn pri" id="sn-back">${$t("sn.toOffers")}</button></div>`;
}
function setTab(k) {
  tab = k;
  $$("[data-sn]").forEach(b => {
    b.classList.toggle("on", b.dataset.sn === k);
    b.setAttribute("aria-selected", String(b.dataset.sn === k));
  });
  $$("[data-snp]").forEach(p => (p.hidden = p.dataset.snp !== k));
  const sb = document.getElementById("shb");
  if (sb) sb.scrollTop = 0;
}
export function snBind() {
  $$("[data-sn]").forEach(b => (b.onclick = () => setTab(b.dataset.sn)));
  const go = document.getElementById("sn-go"),
    bk = document.getElementById("sn-back");
  if (go) go.onclick = () => setTab("off");
  if (bk) bk.onclick = () => setTab("off");
}
