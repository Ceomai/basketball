/* ================= GÖRÜNÜM VE TARZ (Ev → Stil) =================
   Oyuncu kariyer boyunca görünümünü değiştirebilir: saç/şapka stili ve rengi, sakal (17 yaşından sonra),
   bıyık ve gözlük. Her değişiklik berber/stilist ücretiyle (kariyer seviyesine göre) kaydedilir.
   Tarzını değiştirmek küçük bir moral ve (profesyonelde) takipçi artışı verir; haftada bir kez etkilidir. */
import { t as $t } from "./i18n/index.js";
import { $, $$, fmt } from "./data.js";
import { portrait } from "./art.js";
import { HAIRC, HATC, S, jersey, norm, tx, weekKey } from "./core.js";
import { save } from "./save.js";
import { late } from "./late.js";

const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
export const styleFee = () => Math.round(8 * (PM[S.stage] || 1));
const HATS = ["bere", "kep", "kulak", "band", "yok", "uzun", "afro", "orgu", "kel"];
const BEARDS = ["yok", "kirli", "keci", "sakal"];
const HAT_N = {
  bere: "common.beanie",
  kep: "common.cap",
  kulak: "common.headphones",
  band: "common.headband",
  yok: "common.hair",
  uzun: "sty.h.uzun",
  afro: "sty.h.afro",
  orgu: "sty.h.orgu",
  kel: "sty.h.kel"
};
const NO_HAT = ["yok", "uzun", "afro", "orgu", "kel"];
const BEARD_N = { yok: "sty.b0", kirli: "sty.b1", keci: "sty.b2", sakal: "sty.b3" };

/** Ev → Stil sekmesi */
export function styleTab(c, re) {
  const L = (S.styleDraft = S.styleDraft || { ...S.look });
  const opt = (id, list, cur, name) =>
    `<div><div class="eyebrow mb-1h">${name}</div><div class="opts" id="${id}">${list.map(([v, n, dis]) => `<button class="opt ${cur === v ? "on" : ""}" data-v="${v}" ${dis ? "disabled" : ""}>${n}</button>`).join("")}</div></div>`;
  const sw = (id, list, cur, name) =>
    `<div><div class="eyebrow mb-1h">${name}</div><div class="opts" id="${id}">${list.map(v => `<button class="sw ${cur === v ? "on" : ""}" style="background:${v}" data-v="${v}" aria-label="${v}"></button>`).join("")}</div></div>`;
  const young = S.age < 17;
  const changed = JSON.stringify(L) !== JSON.stringify(S.look);
  c.innerHTML = `<div class="card"><div class="row nowrap" style="align-items:flex-start;gap:var(--sp-3)"><div id="stpv"></div><div style="display:flex;flex-direction:column;gap:var(--sp-2h);min-width:0">
    ${opt(
      "st-hat",
      HATS.map(h => [h, $t(HAT_N[h])]),
      L.hatStyle,
      $t("sty.hat")
    )}
    ${NO_HAT.includes(L.hatStyle) ? "" : sw("st-hatc", [...HATC, ...late.extraHatColors()], L.hat, $t("common.accessoryColor"))}
    ${sw("st-hair", HAIRC, L.hair, $t("common.hairColor"))}
    </div></div>
    ${opt(
      "st-beard",
      BEARDS.map(b => [b, $t(BEARD_N[b]), young && b !== "yok"]),
      L.beard || "yok",
      young ? $t("sty.beardYoung") : $t("sty.beard")
    )}
    ${opt(
      "st-mus",
      [
        ["0", $t("sty.no")],
        ["1", $t("sty.yes")]
      ],
      L.mustache ? "1" : "0",
      $t("sty.mustache")
    )}
    ${opt(
      "st-gl",
      [
        ["0", $t("sty.no")],
        ["1", $t("sty.yes")]
      ],
      L.glasses ? "1" : "0",
      $t("sty.glasses")
    )}
    <p class="small muted">${$t("sty.fee", { v: fmt(styleFee()) })}</p>
    <div class="grid2"><button class="btn ghost" id="st-reset" ${changed ? "" : "disabled"}>${$t("sty.reset")}</button><button class="btn pri" id="st-save" ${changed && S.money >= styleFee() ? "" : "disabled"}>${$t("sty.save")}</button></div></div>`;
  const pv = $("#stpv");
  pv.appendChild(portrait(L, { ...jersey(), mood: "mutlu" }, 96, 110, S.team.c1));
  const bind = (id, fn) =>
    $$(`#${id} [data-v]`).forEach(
      b =>
        (b.onclick = () => {
          fn(b.dataset.v);
          styleTab(c, re);
        })
    );
  bind("st-hat", v => (L.hatStyle = v));
  bind("st-hatc", v => (L.hat = v));
  bind("st-hair", v => (L.hair = v));
  bind("st-beard", v => (L.beard = v));
  bind("st-mus", v => (L.mustache = v === "1"));
  bind("st-gl", v => (L.glasses = v === "1"));
  $("#st-reset").onclick = () => {
    S.styleDraft = null;
    styleTab(c, re);
  };
  $("#st-save").onclick = () => {
    if (S.money < styleFee()) return;
    tx($t("sty.title"), -styleFee());
    S.look = { ...L };
    S.styleDraft = null;
    const wk = weekKey();
    if (S.styleWk !== wk) {
      S.styleWk = wk;
      S.moral += 3;
      if (S.stage !== "lise" && S.stage !== "uni") S.followers = Math.round(S.followers * 1.01);
    }
    norm();
    save();
    late.toast($t("sty.saved"));
    styleTab(c, re);
  };
}
