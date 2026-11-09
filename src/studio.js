/* ================= STÜDYO (SOSYAL MEDYA), SPONSOR İLİŞKİSİ, TARAFTAR BÖLGESİ =================
   Stüdyo (Spor kompleksi ve sahil semti):
   - İçerik türleri: antrenman videosu, vlog, challenge, soru-cevap, sponsorlu paylaşım (aktif sponsor varsa).
     Her içerik bir zaman dilimi ve −5 enerji; çekim mini oyunu kaliteyi belirler.
   - Etkileşim = kalite × tür × haftanın trendi × son maç formu × ekipman. Takipçi ve kanal deneyimi kazanılır.
   - Kanal seviyesi (1-10): 2. seviyeden itibaren haftalık reklam geliri.
   - Challenge riskli (%15 tepki: taraftar ve moral düşer). Haftada 2'den fazla paylaşım koçu rahatsız eder.
   - Ekipman: ışık (+%10), mikrofon (+%10), kurgucu (+%20, haftalık ücret).
   Sponsor ilişkisi (NSS'deki gibi azalan çubuk): anlaşma imzalanınca 60, her hafta −5. Reklam çekimi (+25) ve
   sponsorlu paylaşım (+12) ilişkiyi yükseltir; 20'nin altına düşerse sponsor anlaşmayı bozar.
   Taraftar bölgesi: imza günü (taraftar ve takipçi) ve taraftar grubuyla buluşma (taraftar; önemli maç haftasında
   motivasyon: o maçta bütün nitelikler +4). */
import { t as $t } from "./i18n/index.js";
import { $, $$, Bus, clamp, fmt, pick } from "./data.js";
import { S, app, closeSheet, news, norm, renderMain, resultView, sheet, tx, useSlot, fullName } from "./core.js";
import { save } from "./save.js";
import { arenaFor } from "./places.js";
import { mgPhoto } from "./games.js";
import { late } from "./late.js";

const PM = { lise: 1, uni: 1.5, t3: 5, t2: 12, t1: 35, euro: 110, nba: 350 };
const TYPES = ["train", "vlog", "challenge", "qa", "sponsor"];
const MUL = { train: 1, vlog: 1.05, challenge: 1.4, qa: 0.9, sponsor: 0.8 };
const wk = () => `${S.season}-${S.week}`;
const ch = () => (S.channel = S.channel || { xp: 0, posts: 0, wk: "", n: 0, gear: {} });
export const chLevel = () => Math.min(10, Math.floor(Math.sqrt(ch().xp / 20)) + 1);
const trend = () => TYPES.slice(0, 4)[(S.season * 7 + S.week * 3) % 4];
const gearMul = () => 1 + (ch().gear.isik ? 0.1 : 0) + (ch().gear.mik ? 0.1 : 0) + (ch().gear.kurgu ? 0.2 : 0);
const GEAR = { isik: 30, mik: 40, kurgu: 0 };
const gearCost = g => Math.round((g === "kurgu" ? 10 : GEAR[g]) * (PM[S.stage] || 1));
const deal = () => (S.sponsorDeal && S.season <= S.sponsorDeal.until ? S.sponsorDeal : null);

/* ---- Haftalık: kanal geliri, kurgucu ücreti ---- */
Bus.on("week:start", () => {
  if (!S || !S.channel) return;
  const L = chLevel();
  // reklam geliri yalnızca kanal aktifken (son 4 haftada paylaşım) ve maaşın yarısını geçmez (src/economy.js)
  const active = late.ecoWeek() - (ch().last || 0) <= 4;
  if (L >= 2 && active) tx($t("sd.adIncome"), late.passiveCap(Math.round(L * L * 2 * (PM[S.stage] || 1)), 0.5));
  if (ch().gear.kurgu) tx($t("sd.editorFee"), -gearCost("kurgu"));
  save();
});

export function locStudio(I) {
  const c = ch(),
    d = deal(),
    L = chLevel(),
    nextXp = Math.pow(L, 2) * 20;
  sheet(
    I.n,
    $t("sd.sub"),
    `<div class="card"><div class="row between"><div class="eyebrow">${$t("sd.channel")}</div><b class="gold">${$t("sd.level", { v: L })}</b></div><div class="bar"><i style="--w:${Math.min(100, Math.round((c.xp / Math.max(1, nextXp)) * 100))}"></i></div><p class="small muted">${$t("sd.info", { t: $t(`sd.t.${trend()}`), f: late.kfmt(S.followers) })}</p></div>
    ${d ? `<div class="card"><div class="row between"><div class="eyebrow">${$t("sd.sponsorRel", { v: $t(`ag.b.${d.b}`) })}</div><b class="${(d.rel ?? 60) < 35 ? "bad" : "good"}">${Math.round(d.rel ?? 60)}/100</b></div><div class="bar"><i style="--w:${d.rel ?? 60}"></i></div><p class="small muted">${$t("sd.sponsorD")}</p><button class="btn team sm" id="sd-shoot" ${S.slot <= 0 || S.energy < 8 ? "disabled" : ""}>${$t("sd.shoot")}</button></div>` : ""}
    <div class="eyebrow">${$t("sd.content")}</div><div class="choices">${TYPES.filter(t => t !== "sponsor" || d)
      .map(
        t =>
          `<button class="choice" data-sc="${t}" ${S.slot <= 0 || S.energy < 5 ? "disabled" : ""}><span class="ct">${$t(`sd.t.${t}`)}${t === trend() ? ` · <b class="gold">${$t("sd.trend")}</b>` : ""}</span><span class="cd">${$t(`sd.t.${t}D`)}</span></button>`
      )
      .join("")}</div>
    <div class="eyebrow">${$t("sd.gear")}</div><div class="grid3">${Object.keys(GEAR)
      .map(
        g =>
          `<button class="btn ${c.gear[g] ? "ghost" : ""} sm" data-sg="${g}" ${c.gear[g] || S.money < gearCost(g) ? "disabled" : ""}>${$t(`sd.g.${g}`)}${c.gear[g] ? " ✓" : ` (${fmt(gearCost(g))}${g === "kurgu" ? $t("sd.perWeek") : ""})`}</button>`
      )
      .join("")}</div>${late.studioExtraHTML()}`
  );
  late.bindStudioExtra(() => locStudio(I)); // canlı yayın, ortak video, rekorlar (src/venues.js)
  $$("[data-sc]").forEach(b => (b.onclick = () => content(b.dataset.sc)));
  $$("[data-sg]").forEach(
    b =>
      (b.onclick = () => {
        const g = b.dataset.sg;
        if (g !== "kurgu") tx($t(`sd.g.${g}`), -gearCost(g));
        c.gear[g] = 1;
        save();
        locStudio(I);
      })
  );
  const sh = $("#sd-shoot");
  if (sh)
    sh.onclick = async () => {
      useSlot();
      S.energy -= 8;
      // çekimde replik: doğruysa tam memnuniyet, blooper olursa daha az ama viral (src/tales.js)
      const ad = late.adShoot ? await late.adShoot() : { ok: true, txt: "" };
      d.rel = clamp((d.rel ?? 60) + (ad.ok ? 25 : 15), 0, 100);
      if (d.wk) tx($t("sd.shootTx"), Math.round(d.wk * 0.5));
      norm();
      save();
      resultView($t("sd.shoot"), `${ad.txt} ${$t("sd.shootRes", { v: $t(`ag.b.${d.b}`) })}`, [[$t("sd.fxSponsor"), "p"]]);
    };
}
async function content(type) {
  const c = ch();
  useSlot();
  S.energy -= 5;
  if (c.wk !== wk()) {
    c.wk = wk();
    c.posts = 0;
  }
  c.posts++;
  c.last = late.ecoWeek();
  save();
  closeSheet();
  arenaFor(null);
  app.innerHTML = `<div class="pt-3"><div class="eyebrow">${$t("sd.channel")}</div><h2>${$t(`sd.t.${type}`)}</h2></div><div id="stg"></div><div id="res"></div>`;
  const r = await mgPhoto($("#stg"), { title: $t(`sd.t.${type}`), bg: type === "vlog" ? "city" : "arena" });
  const q = clamp(Math.max(0, r.score) / 100, 0, 1);
  const last = (S.results || []).slice(-1)[0],
    form = clamp((last ? last.rating : 6.5) / 6.5, 0.7, 1.35);
  const e = (0.3 + q) * MUL[type] * (type === trend() ? 1.5 : 1) * form * gearMul();
  const add = late.mediaGain(0.035 * e, 20 * e); // medya yorgunluğu (src/economy.js)
  c.xp += Math.round(12 * e);
  c.n++;
  const fx = [[$t("sd.fxFollow", { v: late.kfmt(add) }), "p"]];
  let txt = $t("sd.res", { q: Math.round(q * 100) });
  const rm = late.studioRecord(add);
  if (rm) txt += ` <b class="gold">${rm}</b>`;
  if (type === "qa") S.rel.taraf += 3;
  if (type === "vlog") S.moral += 2;
  if (type === "train") S.rel.taraf += 1;
  if (type === "sponsor" && deal()) {
    deal().rel = clamp((deal().rel ?? 60) + 12, 0, 100);
    fx.push([$t("sd.fxSponsor"), "p"]);
  }
  if (type === "challenge" && Math.random() < 0.15) {
    S.rel.taraf -= 3;
    S.moral -= 4;
    txt += ` ${$t("sd.backlash")}`;
    fx.push([$t("sd.fxBacklash"), "n"]);
  }
  if (c.posts > 2) {
    S.rel.koc -= 2;
    txt += ` ${$t("sd.coachNote", { c: S.npc.coach })}`;
    fx.push([$t("sd.fxCoach"), "n"]);
  }
  norm();
  save();
  Bus.emit("content", { type, q });
  $("#stg").innerHTML = "";
  $("#res").innerHTML =
    `<div class="card"><h2>${$t(`sd.t.${type}`)}</h2><p>${txt}</p><div class="fx">${fx.map(([t, k]) => `<span class="${k}">${t}</span>`).join("")}</div><button class="btn pri" id="bk">${$t("casino.13")}</button></div>`;
  $("#bk").onclick = renderMain;
}

/* ---- Sponsor ilişkisi (agent.js → sponsorWeekly çağırır) ---- */
export function sponsorRelTick() {
  const d = deal();
  if (!d) return;
  d.rel = clamp((d.rel ?? 60) - 5, 0, 100);
  if (d.rel < 20) {
    news($t("sd.dealLost", { v: fullName(), b: $t(`ag.b.${d.b}`) }));
    S.sponsorDeal = null;
    S.rel.taraf -= 2;
    if (!window.__SIM) late.toast($t("sd.dealLostToast"));
  }
}

/* ---- Taraftar bölgesi ---- */
export function locFans(I) {
  const done = S.fanWk === wk();
  sheet(
    I.n,
    $t("fz.sub"),
    `<div class="card"><div class="row between"><div class="eyebrow">${$t("fz.rel")}</div><b class="gold">${S.rel.taraf}/100</b></div><div class="bar"><i style="--w:${S.rel.taraf}"></i></div></div>
    <div class="act"><div><h3>${$t("fz.sign")}</h3><p>${$t("fz.signD")}</p></div><button class="btn team sm" id="fz-sign" ${S.slot <= 0 ? "disabled" : ""}>${$t("fz.go")}</button></div>
    <div class="act"><div><h3>${$t("fz.ultras")}</h3><p>${$t("fz.ultrasD")}</p></div><button class="btn team sm" id="fz-ultra" ${S.slot <= 0 || done ? "disabled" : ""}>${done ? $t("fz.done") : $t("fz.go")}</button></div>${late.fanExtraHTML()}`
  );
  late.bindFanExtra(() => locFans(I)); // tezahürat, koreografi, taraftar otobüsü (src/seasonlife.js)
  $("#fz-sign").onclick = () => {
    useSlot();
    S.energy -= 4;
    S.rel.taraf += 4;
    S.followers = Math.round(S.followers * 1.02) + 10;
    norm();
    save();
    resultView($t("fz.sign"), pick([$t("fz.signRes1"), $t("fz.signRes2")]), [[$t("fz.fxFans"), "p"]]);
  };
  $("#fz-ultra").onclick = () => {
    S.fanWk = wk();
    useSlot();
    S.rel.taraf += 3;
    const big = late.bigMatch && late.bigMatch();
    if (big) S.buffs.motive = 1;
    norm();
    save();
    resultView($t("fz.ultras"), big ? $t("fz.ultrasBig", { v: big.label }) : $t("fz.ultrasRes"), [
      [$t("fz.fxFans3"), "p"],
      ...(big ? [[$t("fz.fxMotive"), "p"]] : [])
    ]);
  };
}
