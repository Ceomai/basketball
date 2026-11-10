import { t as $t } from "./i18n/index.js";
/* ================= ANTRENMAN PROGRAMI VE KOÇ SİSTEMİ =================
   Sezonluk antrenman programı: seçilen niteliğe yatırım daha verimli, diğerleri biraz yavaş.
     "Toparlanma" programı kazancı düşürür ama her hafta enerji verir (sakatlık dönüşü, yaşlı oyuncu).
   Koç sistemi: her takımın bir oyun sistemi var (hızlı hücum, savunma, üçlük, post, paylaşım).
     Niteliklerinin sisteme uyumu süreni (koçun güveni), takımın gücünü ve maç notunu biraz etkiler.
     Uyum yeni bir kulüp seçerken de önemli bir bilgi. */
import { $$, Bus, esc, hash, statName } from "./data.js";
import { S, weekKey } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

export const PROGRAMS = [
  ["denge", $t("program.balanced"), $t("program.equalGainsAttributes")],
  ["sut", $t("program.shootingFocus"), $t("program.shootingImprovesFaster")],
  ["pas", $t("program.playmaking"), $t("program.passingImprovesFaster30pct")],
  ["hiz", $t("common.agility"), $t("program.agilityImprovesFaster30pct")],
  ["guc", $t("program.strengthFitness"), $t("program.strengthImprovesFaster")],
  ["sav", $t("common.defense"), $t("program.defenseImprovesFaster30pct")],
  ["toparlanma", $t("program.recovery"), $t("program.gainsLowerEnergy20pct")]
];
export const program = () => (S && late.unlocked("program") && PROGRAMS.some(p => p[0] === S.program) ? S.program : "denge");
/** Antrenman kazancı çarpanı */
export function programMul(stat) {
  const pg = S && S.programWk === weekKey() ? "denge" : program(); // yeni program gelecek hafta oturur
  if (pg === "denge") return 1;
  if (pg === "toparlanma") return 0.8;
  return pg === stat ? 1.3 : 0.9;
}
Bus.on("week:start", () => {
  if (S && program() === "toparlanma") S.energy = Math.min(100, S.energy + 6);
});
export function programHTML() {
  if (!late.unlocked("program")) return "";
  const pg = program();
  return `<div class="card"><div class="eyebrow">${$t("coach.seasonTrainingProgram")}</div><div class="opts">${PROGRAMS.map(([k, n]) => `<button class="opt ${pg === k ? "on" : ""}" data-pg="${k}">${esc(n)}</button>`).join("")}</div><p class="small muted">${esc(PROGRAMS.find(p => p[0] === pg)[2])} ${$t("coach.quickWeekAlso")}</p></div>`;
}
export function bindProgram(re) {
  $$("[data-pg]").forEach(
    b =>
      (b.onclick = () => {
        if (S.program !== b.dataset.pg) S.programWk = weekKey();
        S.program = b.dataset.pg;
        save();
        re();
      })
  );
}

export const SYSTEMS = {
  tempo: { n: $t("common.fastBreak"), w: { hiz: 1.5, sut: 1.1, pas: 1, guc: 0.7, sav: 0.7 } },
  savunma: { n: $t("system.defenseFirst"), w: { sav: 1.5, guc: 1.2, hiz: 0.9, pas: 0.7, sut: 0.7 } },
  ucluk: { n: $t("system.threePointBarrage"), w: { sut: 1.6, pas: 1, hiz: 0.9, guc: 0.7, sav: 0.8 } },
  post: { n: $t("system.postGame"), w: { guc: 1.6, sav: 1.1, pas: 0.9, sut: 0.7, hiz: 0.7 } },
  paylasim: { n: $t("system.ballSharing"), w: { pas: 1.6, hiz: 1, sut: 1, guc: 0.7, sav: 0.7 } }
};
/** Takımın oyun sistemi (takıma göre sabit) */
export const teamSystem = team => {
  const nc = late.bondsCoachSys ? late.bondsCoachSys(team) : null; // kulüp koçu değiştirdiyse (src/bonds.js)
  if (nc) return nc;
  const keys = Object.keys(SYSTEMS);
  return keys[hash((team && team.key) || "x") % keys.length];
};
/** Sistem uyumu: -8 (uyumsuz) … +8 (biçilmiş kaftan) */
export function systemFit(team = S && S.team) {
  if (!S || !team || !late.unlocked("sistem")) return 0;
  const w = SYSTEMS[teamSystem(team)].w,
    st = S.st,
    ks = Object.keys(st);
  const plain = ks.reduce((a, k) => a + st[k], 0) / ks.length,
    wsum = ks.reduce((a, k) => a + w[k], 0),
    weighted = ks.reduce((a, k) => a + st[k] * w[k], 0) / wsum;
  // pozisyonlar doğal olarak uzmanlaşır; katsayı küçük tutulur ki çoğu oyuncu "orta/iyi/zayıf" bandında kalsın, uçlar nadir olsun
  const adapt = late.bondsCoachAdapt ? late.bondsCoachAdapt(team) : 0; // yeni koçun sistemine uyum (src/bonds.js)
  return Math.max(-8, Math.min(8, Math.round((weighted - plain) * 0.9) + adapt));
}
export const fitLabel = f =>
  f >= 5 ? $t("coach.perfectFit") : f >= 2 ? $t("coach.good") : f > -2 ? $t("coach.average") : f > -5 ? $t("coach.weak") : $t("coach.poorFit");
export function systemHTML(team = S.team) {
  if (!late.unlocked("sistem")) return "";
  const sys = SYSTEMS[teamSystem(team)],
    f = systemFit(team),
    best = Object.entries(sys.w).sort((a, b) => b[1] - a[1])[0][0];
  return `<div class="card"><div class="eyebrow">${$t("coach.coachsSystem")}</div><div class="row between nowrap"><b>${esc(sys.n)}</b><span class="pill ${f >= 2 ? "g" : f <= -2 ? "l" : ""}">${$t("coach.fit")} ${fitLabel(f)}</span></div><p class="small muted">${$t(
    "coach.systemMattersMost",
    {
      best: statName(best)
    }
  )}</p></div>`;
}
/** Teklif kartı için: o takımın sistemi ve senin uyumun */
export const offerFitNote = team => `${SYSTEMS[teamSystem(team)].n} ${$t("coach.fit2")} ${fitLabel(systemFit(team))}`;
