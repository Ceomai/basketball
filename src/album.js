/* ================= KARİYER ALBÜMÜ =================
   Kariyerin önemli anları kendiliğinden albüme düşer (her an bir kez): ilk maç, ilk profesyonel maç, EuroLeague ve NBA
   ilk maçı, 20/30/40 sayılık ilk maçlar, ilk beşe yükselme, ilk şampiyonluk, ilk MVP, özellikler, imza hareket,
   oğlunun ilk maçı, emeklilik. Ev → Kariyer sekmesinden ve emeklilik ekranından gezilir. */
import { t as $t } from "./i18n/index.js";
import { $, Bus, esc, isPro } from "./data.js";
import { S, seasonLabel, sheet } from "./core.js";
import { late } from "./late.js";

const ICON = {
  first: "🏀",
  pro: "✍️",
  euro: "🇪🇺",
  nba: "⭐",
  p20: "🔥",
  p30: "🔥",
  p40: "💥",
  star: "🟢",
  champ: "🏆",
  mvp: "👑",
  trait: "🧬",
  sig: "✨",
  heir: "👨‍👦",
  retire: "🎽",
  goals: "🎯",
  dilemma: "⚖️"
};
/** Albüme an ekle (aynı anahtar bir kez) */
export function addMoment(key, kind, text) {
  if (!S || window.__SIM) return;
  S.album = Array.isArray(S.album) ? S.album : [];
  if (S.album.some(a => a.key === key)) return;
  S.album.push({ key, kind, s: seasonLabel(), age: S.age, team: S.team && S.team.name, c1: S.team && S.team.c1, text });
  if (S.album.length > 60) S.album.shift();
}
const N = () => `${S.first} ${S.last}`;
Bus.on("match:end", d => {
  if (!S || d.rating == null) return;
  const team = S.team.name;
  addMoment("first", "first", $t("al.first", { v: N(), team }));
  if (isPro(S.stage)) addMoment("pro", "pro", $t("al.pro", { v: N(), team }));
  if (S.stage === "euro") addMoment("euro", "euro", $t("al.euro", { v: N(), team }));
  if (S.stage === "nba") addMoment("nba", "nba", $t("al.nba", { v: N(), team }));
  for (const p of [20, 30, 40]) if (d.pts >= p) addMoment("p" + p, "p" + p, $t("al.pts", { v: N(), pts: d.pts, team }));
  if (S.heir && S.career.games <= 1) addMoment("heir", "heir", $t("al.heir", { v: N(), parent: S.heir.parent }));
});
Bus.on("role:change", d => d && d.to === "star" && addMoment("star", "star", $t("al.star", { v: N(), team: S.team.name })));
Bus.on("season:end", d => {
  if (!S) return;
  if (d && d.champ) addMoment("champ", "champ", $t("al.champ", { v: N(), team: S.team.name }));
});
Bus.on("goals", d => d && d.of && d.ok === d.of && addMoment("goals", "goals", $t("al.goals", { v: N() })));
Bus.on(
  "trait",
  d => d && addMoment("trait:" + d.k, "trait", $t("al.trait", { v: N(), t: (late.traitNames() || []).slice(-1)[0] || "" }))
);
Bus.on("signature", d => d && d.hits === 1 && addMoment("sig", "sig", $t("al.sig", { v: N() })));
Bus.on("career:retire", () => S && addMoment("retire", "retire", $t("al.retire", { v: N(), age: S.age, team: S.team.name })));
// MVP: sezon ödülleri sonrası sayaç
Bus.on("season:end", () => setTimeout(() => S && S.career.mvps > 0 && addMoment("mvp", "mvp", $t("al.mvp", { v: N() })), 0));

/** Albüm paneli */
export function albumSheet(onClose) {
  const A = (S && S.album) || [];
  sheet(
    $t("al.title"),
    $t("al.sub", { n: A.length }),
    A.length
      ? `<div style="display:flex;flex-direction:column;gap:10px">${A.slice()
          .reverse()
          .map(
            a =>
              `<div class="card" style="border-left:5px solid ${a.c1 || "var(--gold)"}"><div class="row between nowrap"><div class="eyebrow">${esc(a.s)} · ${$t("al.age", { v: a.age })}</div><span style="font-size:1.3rem">${ICON[a.kind] || "🏀"}</span></div><p style="margin:2px 0 0">${esc(a.text)}</p>${a.team ? `<div class="small muted">${esc(a.team)}</div>` : ""}</div>`
          )
          .join("")}</div>`
      : `<p class="small muted">${$t("al.empty")}</p>`,
    onClose ? { onClose } : {}
  );
}
export const albumButtonHTML = () =>
  `<button class="btn ghost" id="album">${$t("al.button", { n: ((S && S.album) || []).length })}</button>`;
export function bindAlbumButton(onClose) {
  const b = $("#album");
  if (b) b.onclick = () => albumSheet(onClose);
}
