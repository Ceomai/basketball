import { t as $t } from "./i18n/index.js";
import { late } from "./late.js";
import { $, $$, BAL, Bus, PLAYS, SC, cOf, clamp, esc, isPro, pick, ri, roleAt, statName, wait } from "./data.js";
import { portrait } from "./art.js";
import { buzz } from "./games.js";
import { hapticSuccess, hapticTap, scrollMode } from "./motion.js";
import { S, TD, app, closeSheet, eff, fixture, lgName, ovr, phaseName, teamByKey } from "./core.js";
import { arenaFor } from "./places.js";
import { LK, M, PEN, addFeed, feedRowHTML, finishMatch, odds, resolvePlay, setM, updBug } from "./match.js";
/* ================= MAÇ MOTORU (NSS tarzı akış) =================
   Maç dört çeyrek boyunca hücum hücum akar. Oyuncu rotasyona göre sahaya girip çıkar.
   "Tüm maç" modunda akış izlenir; "Önemli anlar" modunda kenar dakikaları atlanır.
   Çeyrek aralarında duraklama, skor özeti ve koçla taktik konuşması var. */
// hücum başına süre: sahada geçiş → set → sonuç izlenir (src/court.js courtPlay)
export const PACE = { 1: 1500, 2: 750, 4: 320 };
const KEY_ON = 450; // "önemli anlar"da sahadayken
export const TR_CALLS = [$t("engine.1"), $t("engine.2"), $t("engine.3"), $t("engine.4"), $t("engine.5")];
export function rosterNames(city, n) {
  const c = cOf(city),
    out = new Set();
  while (out.size < n) out.add(`${pick(c.first)[0]}. ${pick(c.last)}`);
  return [...out];
}
export function schoolRole() {
  return roleAt(ovr(), S.stage, "TR");
}
export function stintPlan(role) {
  const P = {
    star: [
      [0, 7],
      [10, 18],
      [20, 27],
      [30, 40]
    ],
    rot: [
      [3, 9],
      [12, 19],
      [23, 30],
      [33, 40]
    ],
    bench: [
      [6, 10],
      [16, 20],
      [27, 31],
      [36, 40]
    ]
  }[role].map(s => s.slice());
  if (S.energy < 35) P.forEach(s => (s[1] = Math.max(s[0] + 2, s[1] - 1)));
  if (S.rel.koc < 25 && role !== "star") P.pop();
  return P;
}
export const inStint = (plan, m) => plan.some(([a, b]) => m >= a && m < b);
/** Maç kartını (karar, mod seçimi, çeyrek arası) başparmak bölgesine hizala: kart ekrana sığıyorsa alt kenarı ekranın
    altına oturur (seçenekler altta, başlık üstte görünür); sığmıyorsa başlığı yapışkan tabelanın hemen altında kalır. */
export function thumbAlign(el) {
  if (!el) return;
  try {
    const top = document.querySelector(".mtop"),
      th = top ? top.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty("--mtop-h", `${Math.round(th)}px`);
    const h = el.getBoundingClientRect().height;
    el.scrollIntoView({ block: h <= window.innerHeight - th - 24 ? "end" : "start", behavior: scrollMode() });
  } catch (e) {
    /* eski tarayıcı */
  }
}
export function modeChoice() {
  if (window.__SIM) return Promise.resolve("key");
  return new Promise(r => {
    const cur = S.matchMode || ""; // ilk maçta "son seçimin" rozeti yok
    // mod seçimi üstte (başparmak bölgesine hizalı); rakip ve koşullar kartları altta, katlanabilir (kısa ekranda kapalı)
    const pre = `${late.preMatchHTML()}${late.osPreHTML()}`,
      roomy = window.matchMedia && matchMedia("(min-height:740px)").matches;
    $("#mview").innerHTML =
      `<div class="card sit" id="mode-card"><div class="eyebrow">${$t("engine.9")}</div><h2>${$t("engine.10")}</h2>
     <div class="choices">
      <button class="choice" data-m="full"><span class="ct">${$t("engine.11")}</span><span class="cd">${$t("engine.12")}</span><span class="od ${cur === "full" ? "e" : "i"}">${cur === "full" ? $t("engine.6") : $t("engine.7")}</span></button>
      <button class="choice" data-m="key"><span class="ct">${$t("engine.13")}</span><span class="cd">${$t("engine.14")}</span><span class="od ${cur === "key" ? "e" : "i"}">${cur === "key" ? $t("engine.6") : $t("engine.8")}</span></button>
      <button class="choice" data-m="only"><span class="ct">${$t("pl2.only")}</span><span class="cd">${$t("pl2.onlyD")}</span><span class="od ${cur === "only" ? "e" : "i"}">${cur === "only" ? $t("engine.6") : $t("pl2.fastest")}</span></button>
     </div></div>${pre ? `<details class="mpre"${roomy ? " open" : ""}><summary>${$t("md.pre")}</summary><div class="stack">${pre}</div></details>` : ""}`;
    thumbAlign($("#mode-card"));
    $$("[data-m]").forEach(
      b =>
        (b.onclick = () => {
          S.matchMode = b.dataset.m;
          r(b.dataset.m);
        })
    );
  });
}
/** Maç akışında yakalanmayan hata: raporlanır, oyuncu donmuş skor ekranında kalmaz, haritaya döner.
    playMatch çağrıları .catch(matchFail) ile biter. */
export function matchFail(e) {
  console.error(e);
  try {
    late.reportError && late.reportError("match", (e && e.message) || String(e), e && e.stack);
  } catch (_) {
    /* raporlama yok */
  }
  try {
    closeSheet();
    if (!S) return late.renderSlots();
    late.renderMain();
    late.toast($t("s32.match.err"), { noInbox: true });
  } catch (e2) {
    console.error(e2);
    late.renderSlots();
  }
}
// ana iş parçacığına kısa nefes: zamanlayıcı kısıtlamasına (arka plan sekmesi) takılmayan yollar
export const yieldMain = () =>
  globalThis.scheduler && typeof globalThis.scheduler.yield === "function"
    ? globalThis.scheduler.yield()
    : new Promise(r => {
        const c = new MessageChannel();
        c.port1.onmessage = () => r();
        c.port2.postMessage(0);
      });
// simüle maçın sonunda: akış ve tabela tek seferde (M.silent kalkar; durum satırı ardından statLine ile)
function drawSilent() {
  M.silent = false;
  const f = $("#feed");
  if (f) f.innerHTML = M.feed.map(feedRowHTML).join("");
}
export async function playMatch(ctx) {
  if ((!ctx || ctx.comp === "lig") && late.offResume(true)) return; // yarıda kalmış sezon geçişi: önce teklifler
  closeSheet();
  window.scrollTo(0, 0);
  Bus.emit("match:start", ctx);
  if (!ctx) {
    const fx = fixture();
    ctx = { opp: teamByKey(fx.opp), home: fx.home, comp: "lig", label: `${lgName()} · ${phaseName()}` };
  }
  if (!ctx.label) ctx.label = `${lgName()} · ${phaseName()}`;
  const opp = ctx.opp,
    AUTO = !!ctx.auto || !!window.__SIM;
  arenaFor(opp);
  const role = isPro(S.stage) || ctx.comp === "nat" ? ctx.role || S.role : schoolRole();
  let plan = stintPlan(role);
  const fit = ctx.comp === "nat" ? 0 : late.systemFit(),
    ourStr = S.team.str + (ovr() - TD() - 45) / 220 + fit * 0.002 + late.diffStrMod(), // özel zorluk (src/bonds.js)
    ppp = SC[S.stage] / 70 / 2.25;
  const big = ctx.comp === "nat" || ctx.onEnd ? null : late.bigMatch();
  // rakibin savunma tipi (maça göre; çeyrek aralarında değişebilir) ve sahada kesintisiz süre (yorgunluk)
  const dz = ctx.comp === "nat" || Math.random() < 0.5 ? "man" : "zone";
  setM({
    dz,
    stint: 0,
    mmod: 0,
    big,
    opp,
    home: ctx.home,
    us: 0,
    them: 0,
    q: 1,
    clock: "10:00",
    rating: 6.0,
    pts: 0,
    ast: 0,
    reb: 0,
    blk: 0,
    stl: 0,
    stops: 0,
    feed: [],
    mins: 0,
    plus: 0,
    fails: 0,
    goods: 0,
    tac: null,
    qs: [],
    speed: S.matchSpeed || 1,
    silent: AUTO // simüle maç: akış/tabela/durum satırı DOM'a yazılmaz, sonda bir kez çizilir
  });
  const mates = ctx.comp === "nat" ? rosterNames(S.team.city, 4) : late.mateNames(4),
    foes = rosterNames(opp.city, 5),
    sur = S.last,
    PL = PLAYS[S.pos];
  // düzen: skor tabelası üstte yapışkan; yatay/geniş ekranda saha solda, durum + karar + akış sağda (index.html .mlay)
  app.innerHTML = `<div class="mtop"><div id="bug"></div><div id="mto"></div></div><div class="mlay${AUTO ? " noct" : ""}"><div id="mstat" class="card" style="padding:var(--sp-2h) var(--sp-3);gap:var(--sp-1h)"></div>${AUTO ? "" : late.courtHTML()}<div id="mview"></div>
   <div class="card mfeed"><div class="mctl"><div class="eyebrow">${$t("engine.15")}</div><div class="spd" id="spd"></div></div><div class="feed" id="feed"></div></div></div>`;
  updBug();
  if (!AUTO) late.courtStart(opp); // saha görünümü (src/court.js)
  late.matchdayStart(ctx, foes, mates); // hakem, seyirci, rakip yıldız, kimya (src/matchday.js)
  late.timeoutInit(); // mola hakları (src/clutch.js)
  if (!AUTO) late.arenaLights(); // büyük maçta ışık gösterisi (src/scenarios.js)
  let mode = AUTO ? "key" : await modeChoice();
  $("#mview").innerHTML = "";
  const renderSpd = () => {
    $("#spd").innerHTML =
      `<div class="spd-g" role="group" aria-label="${$t("engine.15")}">${[1, 2, 4].map(s => `<button class="opt ${M.speed === s ? "on" : ""}" data-s="${s}" aria-label="${$t("a11y.speed", { n: s })}" aria-pressed="${M.speed === s}">${s}×</button>`).join("")}<button class="opt ${mode === "key" ? "on" : ""}" data-mode="key" aria-pressed="${mode === "key"}" aria-label="${$t("a11y.keyOnly")}">${$t("engine.16")}</button></div>`;
    // mola ayrı ve belirgin: skor tabelasının yanında (yapışkan üst bölge, src/clutch.js)
    const mto = $("#mto");
    if (mto) mto.innerHTML = late.timeoutBtnHTML();
    late.bindTimeout(renderSpd);
    $$("#spd [data-s]").forEach(
      b =>
        (b.onclick = () => {
          M.speed = +b.dataset.s;
          S.matchSpeed = M.speed;
          renderSpd();
        })
    );
    $("#spd [data-mode]").onclick = () => {
      mode = mode === "key" ? "full" : "key";
      S.matchMode = mode;
      renderSpd();
    };
  };
  renderSpd();
  let on = false;
  const statLine = () => {
    if (M.silent) return;
    $("#mstat").innerHTML =
      `<div class="row between nowrap"><span class="pill ${on ? "w" : ""}">${on ? $t("engine.17") : $t("engine.18")}</span><span class="small muted">${ctx.label}</span></div><div class="small"><b>${esc(sur)}</b> ${$t(
        "engine.19",
        {
          v: Math.floor(M.mins / 60),
          pts: M.pts,
          ast: M.ast,
          reb: M.reb,
          v2: M.plus >= 0 ? "+" : "",
          plus: M.plus
        }
      )} · ${$t("pf.short", { n: M.pf || 0, l: late.foulLimit() })}${late.liveLine()}</div>${late.crowdLine()}`;
  };
  // oyuna giriş/çıkış bandı: tabelanın altında üste biner (düzeni kaydırmaz); yenisi gelince eskisi hemen çekilir
  const banner = (t, good) => {
    late.sfx("whistle");
    const host = !M.silent && ($(".mtop") || $("#mview"));
    if (!host) return;
    host.querySelectorAll(".say.ban").forEach(x => x.remove());
    const d = document.createElement("div");
    d.className = good ? "say good ban" : "say warn ban";
    d.setAttribute("role", "status");
    d.innerHTML = `<b>${t}</b>`;
    host.appendChild(d);
    setTimeout(() => {
      if (!d.isConnected) return;
      d.classList.add("out");
      setTimeout(() => d.remove(), 160);
    }, 2440);
    buzz(good ? 20 : 10);
  };
  addFeed(
    $t("engine.20", {
      v: ctx.home ? S.city : opp.city,
      label: ctx.label
    })
  );
  late.crowd(true);
  late.sfx("whistle");
  statLine();
  const TOTAL = 2400;
  let t = 0,
    ourBall = Math.random() < 0.5,
    lastQ = 1,
    benchFrom = null;
  const setClock = () => {
    const q = Math.min(5, Math.floor(t / 600) + 1),
      inQ = t >= 2400 ? t - 2400 : t % 600,
      len = t >= 2400 ? 300 : 600;
    M.q = q > 4 ? 4 : q;
    const left = Math.max(0, len - inQ);
    M.clock = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  };
  // "sadece anlarım": akış hiç beklemez, yalnızca karar anlarında durur
  const paceMs = () => (AUTO || mode === "only" ? 0 : mode === "key" && !on ? 0 : mode === "key" ? KEY_ON : PACE[M.speed]);
  const pace = async () => {
    const ms = paceMs();
    if (ms) await wait(ms);
    // uygulama arka plandayken maç saati durur (telefon kilitlenince akış kaçmaz); öne gelince kaldığı yerden sürer
    while (!AUTO && document.hidden && $("#mstat")) await wait(300);
  };
  let end = TOTAL,
    nPoss = 0;
  // window.__TEST.shortMatch (yalnız otomatik testler, ör. 4): elle oynanan maçta hücum süresi bu katla uzar → çeyrekler,
  // rotasyon ve son dakika aynı kalır ama daha az hücum oynanır (tests/personas.js U14). Oyuncuda bayrak yok: 1.
  const SHORT = (!AUTO && window.__TEST && +window.__TEST.shortMatch) || 1;
  while (t < end) {
    // maç ekranı kapandıysa (kariyerden çıkış, yeniden yükleme) motor sessizce durur
    if (!AUTO && !$("#mstat")) return;
    // önde olan rakip son dakikada saati sonuna kadar kullanır (kendin oynarken: faul kararını anlamlı kılar)
    const dur = !AUTO && !ourBall && M.them > M.us && t > end - 60 ? ri(20, 24) : late.osDur(ri(12, 22)) * SHORT; // rakip tarzı temposu (src/matchfeel.js)
    const t0 = t;
    t = Math.min(end, t + dur);
    setClock();
    // çeyrek arası
    const q = Math.floor((t - 1) / 600) + 1;
    if (q > lastQ && t <= TOTAL) {
      M.qs.push([M.us, M.them]);
      await quarterBreak(lastQ, on);
      lastQ = q;
      M.stint *= 0.4; // ara dinlendirir
      if (Math.random() < 0.3) {
        M.dz = M.dz === "zone" ? "man" : "zone";
        addFeed(`<b>${$t("cond.switch")}</b> ${M.dz === "zone" ? $t("cond.zone") : $t("cond.man")}`);
      }
    }
    // rotasyon
    const minute = t / 60,
      want = (inStint(plan, Math.min(39.9, minute)) || (t > TOTAL && role !== "bench")) && !M.fo && M.ftSit !== M.q; // faulle oyun dışı / faul sorunu
    if (want !== on) {
      on = want;
      M.on = on;
      if (on) {
        banner(
          $t("engine.21", {
            q: M.q,
            clock: M.clock
          }),
          true
        );
        addFeed(
          `<b>${$t("engine.22")}</b> ${$t("engine.23", {
            sur: sur
          })}`
        );
        if (benchFrom && mode === "key")
          addFeed(
            $t("engine.24", {
              v: benchFrom[0],
              v2: benchFrom[1],
              us: M.us,
              them: M.them
            })
          );
        benchFrom = null;
      } else {
        banner(
          $t("engine.25", {
            q: M.q,
            clock: M.clock
          }),
          false
        );
        addFeed(
          `<b>${$t("engine.22")}</b> ${$t("engine.26", {
            sur: sur
          })}`
        );
        benchFrom = [M.us, M.them];
      }
      statLine();
    }
    if (on) {
      M.mins += dur;
      M.stint += dur;
    } else M.stint = Math.max(0, M.stint - dur * 2);
    // mola (src/clutch.js): istenen mola sıradaki hücumdan önce
    if (!AUTO && M.toReq) {
      await late.timeoutCard($("#mview"));
      renderSpd();
    }
    // son dakika kararı: faul yap / zamanı tüket
    if (!AUTO && on && t > end - 50 && t < end) {
      const call = await late.lateCall(ourBall, M.us - M.them, $("#mview"), end - t);
      if (call === "foul") {
        const { made, note } = late.oppFreeThrows();
        M.them += made;
        M.plus -= made;
        t = Math.min(end, t0 + ri(2, 4)); // faul saati hemen durdurur
        setClock();
        addFeed(`<b>${$t("cl.foulFeed")}</b> ${$t("cl.ftRes", { n: made })}${note}`);
        ourBall = true; // top size geçer
        updBug();
        statLine();
        await pace();
        continue;
      }
      if (call === "hold") {
        t = Math.min(end, t + 10);
        setClock();
        M.hold = 1;
        addFeed($t("cl.holdFeed"));
      }
    }
    const close = Math.abs(M.us - M.them) <= 6,
      clutch = t > TOTAL - 120 && close;
    // takım arkadaşlarının sana pas verme isteği (takım ilişkisi + kadro uyumu): hücumda topla daha sık buluşursun
    const involve =
      (AUTO ? 0.08 : 0.1) + (clutch ? 0.35 : 0) + (M.tac === "ball" ? 0.05 : 0) + (ourBall ? late.passTrustBonus() : 0); // kendin oynarken biraz daha çok karar anı
    const before = [M.us, M.them];
    const ap0 = M.autoPts || 0,
      mp0 = M.pts;
    const skipMoment = M.lcTrail;
    M.lcTrail = false;
    if (on && !skipMoment && ((!AUTO && late.toLastTake(ourBall)) || Math.random() < involve)) {
      if (ourBall) M.touches = (M.touches || 0) + 1;
      await moment(ourBall, clutch);
    } else {
      simPossession(ourBall);
      // sahada hücumu izle: geçiş → set → şut (src/court.js)
      if (!AUTO)
        late.courtPlay(
          { us: ourBall, scored: ourBall ? M.us > before[0] : M.them > before[1], mine: (M.autoPts || 0) > ap0 },
          on,
          paceMs()
        );
    }
    if (on) M.plus += M.us - before[0] - (M.them - before[1]);
    if (!AUTO) late.mfTrack({ us: ourBall, before, pts0: mp0, left: end - t, ot: t > TOTAL }); // kritik an (src/matchfeel.js)
    M.low = Math.min(M.low || 0, M.us - M.them); // en büyük geri düşülen fark (geri dönüş başarımı)
    ourBall = !ourBall;
    updBug();
    if (on) statLine();
    // mola düğmesi durumu (kalan hak, rakip serisi) değişince yeniden çiz
    if (!AUTO) {
      const k = `${M.toLeft}|${M.toReq ? 1 : 0}|${M.oppRun >= 3}`;
      if (k !== M._toKey) {
        M._toKey = k;
        renderSpd();
      }
    }
    if (t >= end && end >= TOTAL && M.us === M.them) {
      end += 300;
      addFeed(`<b>${$t("engine.27")}</b> ${$t("engine.28")}`);
      if (!AUTO) late.commentLine("ot");
      M.toLeft = 1; // uzatmada bir mola
      if (t === TOTAL) {
        M.qs.push([M.us, M.them]);
        await quarterBreak(4, on, true);
      }
    }
    await pace();
    // simüle maç tek uzun görev olmasın: ~10 hücumda bir ana iş parçacığına nefes (sonucu/RNG sırasını değiştirmez)
    if (AUTO && ++nPoss % 10 === 0) await yieldMain();
  }
  M.qs.push([M.us, M.them]);
  if (M.silent) drawSilent();
  late.matchdayEnd();
  statLine(); // seyirci çubuğu ve canlı satır son haliyle
  M.q = 4;
  M.clock = "00:00";
  updBug();
  late.sfx("buzzer");
  late.crowd(false);
  const win = M.us > M.them,
    sr = M.wsum ? (M.wgood || 0) / M.wsum : 0.5;
  M.rating = clamp(
    3.5 +
      5.0 * sr +
      (win ? 0.2 : -0.15) +
      clamp(M.plus / 35, -0.35, 0.35) +
      clamp((M.autoPts || 0) / 50, 0, 0.2) +
      clamp(fit / 40, -0.2, 0.2) -
      late.foulPenalty(),
    1,
    10
  );
  addFeed(`<b>${$t("engine.29")}</b> ${M.us}-${M.them}.`);
  if (!AUTO) {
    if (win) hapticSuccess(); // galibiyet: başarı titreşimi; mağlubiyet/beraberlik: tek kısa
    else hapticTap();
    const df = M.us - M.them;
    late.commentLine(Math.abs(df) <= 3 ? "close" : df <= -18 ? "blowout" : df >= 18 ? "rout" : df > 0 ? "win" : "loss"); // spiker (src/tales.js)
  }
  if (!AUTO) await wait(500);
  M.auto = !!ctx.auto;
  if (ctx.onEnd) ctx.onEnd(win);
  else finishMatch(win);

  function simPossession(us) {
    const tacU = M.tac === "tempo" ? 1.06 : M.tac === "def" ? 0.97 : 1,
      tacT = M.tac === "def" ? 0.93 : M.tac === "tempo" ? 1.03 : 1;
    const p = clamp(
      ppp *
        (us ? (ourStr / opp.str) * tacU * (on ? 1 : 0.97) : (opp.str / ourStr) * tacT) *
        late.possMod(us) *
        late.osPossMul(us),
      0.15,
      0.85
    );
    const starTurn = !us && Math.random() < 0.3, // rakip yıldızın payı: akışta da onun adı geçer
      who = us ? pick(mates) : starTurn ? foes[0] : pick(foes.slice(1)),
      team = us ? S.team.short : opp.short;
    if (!us && on) {
      const f = late.backgroundFoul();
      if (f) addFeed(`${S.team.short} · <b>${sur}</b>${f}`);
    }
    const sc = Math.random() < p;
    late.runTrack(us, sc); // rakip serisi (mola düğmesi)
    M.hold = 0;
    if (sc) {
      const three = Math.random() < late.osThree(us),
        pts = three ? 3 : 2;
      if (us) M.us += pts;
      else M.them += pts;
      if (starTurn) late.starScore(pts);
      late.crowdTick(us);
      if (us && on) {
        const sk = (eff("sut") + eff("hiz") + eff("guc")) / 3,
          share = { star: 0.21, rot: 0.13, bench: 0.08 }[role] * (0.6 + (clamp(sk, 0, 100) / 100) * 0.8) * late.passTrustMul();
        if (Math.random() < share) {
          M.touches = (M.touches || 0) + 1;
          M.pts += pts;
          M.autoPts = (M.autoPts || 0) + pts;
          if (mode === "full")
            addFeed(
              `${S.team.short} · <b>${sur}</b> ${three ? $t("engine.30") : pick([$t("engine.31"), $t("engine.32"), $t("engine.33")])}`
            );
          return;
        }
        if (Math.random() < 0.12 * (0.6 + eff("pas") / 100)) {
          M.ast++;
          M.autoAst = (M.autoAst || 0) + 1;
        }
      }
      if (Math.random() < 0.55 || mode === "full")
        addFeed(
          `${team} · ${who} ${three ? $t("engine.30") : pick([$t("engine.31"), $t("engine.32"), $t("engine.33"), $t("engine.34")])}${us && Math.random() < 0.12 ? " " + pick(TR_CALLS) : ""}`
        );
    } else if (on && Math.random() < { C: 0.2, PF: 0.16, SF: 0.1, SG: 0.06, PG: 0.05 }[S.pos] * (0.6 + eff("guc") / 100)) {
      M.reb++;
    } else if (Math.random() < 0.35 && mode === "full")
      addFeed(`${team} · ${who} ${pick([$t("engine.35"), $t("engine.36"), $t("engine.37"), $t("engine.38")])}`);
  }
  async function moment(us, clutch) {
    const diff = M.us - M.them,
      dn = pick(foes);
    let head,
      desc,
      opts,
      scn = null,
      ty = us ? (Math.random() < 0.13 ? "foul" : "off") : "def";
    // özel anlar (src/moments.js): 2'ye 1, perde savunması, sataşma, son hücum
    M.clutchNow = !!clutch;
    const sp = late.pickSpecial(us, clutch, diff, dn);
    if (sp && sp.opts) {
      ty = sp.ty === "def" ? "def" : "sp";
      head = sp.head;
      desc = sp.desc;
      opts = sp.opts;
    } else if (ty === "off") {
      head = clutch
        ? diff < 0
          ? $t("engine.39", {
              v: -diff
            })
          : diff === 0
            ? $t("engine.40")
            : $t("engine.41", {
                diff: diff
              })
        : pick(PL.sit);
      desc = $t("engine.42", {
        dn: dn
      });
      opts = PL.off.map(([k, tt, st, d]) => ({
        k,
        t: tt,
        d: `${d} · ${statName(st)} ${Math.round(eff(st))}`,
        e: eff(st) - (PEN[k] || 0)
      }));
      // pozisyona göre durum: konum, savunmacı mesafesi, pota altı yardım, boşta arkadaş (src/court.js)
      scn = late.courtScenario(true);
      const all = late.applyScenario(opts, scn);
      opts = late.pickOffOpts(all, clutch); // şut, bitiriş ve pas karışık; 4 seçenek, kilit anda 5
      if (sp && sp.keys) {
        head = sp.head;
        desc = sp.desc;
        const f = all.filter(o => sp.keys.includes(o.k));
        if (f.length >= 2) opts = late.pickOffOpts(f, true);
        // Clutch özelliği: son hücumda "Topu bana verin"
        const co = sp.id === "lastshot" ? late.clutchOption() : null;
        if (co) opts = [co, ...opts];
      }
      opts = late.extraOffOpts(opts, clutch, AUTO); // ikili kombinasyon, oyun kur (src/matchday.js)
    } else if (ty === "def") {
      head = pick([$t("engine.43"), $t("engine.44"), $t("engine.45")]);
      desc = $t("engine.46", {
        dn: dn
      });
      opts = PL.def.map(([k, tt, st, d]) => ({
        k,
        t: tt,
        d: `${d} · ${statName(st)} ${Math.round(eff(st))}${late.foulNote(k)}`,
        e: eff(st) + (k === "safe" ? 15 : 0)
      }));
      scn = late.osScenario(late.courtScenario(false));
      opts = late.applyScenario(opts, scn);
    } else {
      // faul anı: çoğunlukla 2 serbest atış, bazen üçlükte faul (3 serbest atış)
      const three = Math.random() < 0.3;
      head = three ? $t("m2.foul3") : $t("engine.47");
      desc = three ? $t("m2.foul3D") : $t("engine.48");
      opts = [
        { k: three ? "free3" : "free", t: $t("data.70"), d: `${$t("engine.76")} ${Math.round(eff("sut"))}`, e: eff("sut") + 15 }
      ];
    }
    if (sp && sp.pen) opts = opts.map(o => ({ ...o, e: o.e - sp.pen })); // şut saati baskısı
    // imza hareket (maçta bir kez) ve maç koşulları + özellikler seçeneklerin başarı değerine eklenir
    if (!(sp && sp.opts)) opts = late.addSignature(opts, ty);
    opts = opts.map(o => ({ ...o, e: o.e + late.momentMod(o.k) + (AUTO ? 0 : late.osMomentMod(o.k, ty)) }));
    if (!AUTO) opts = late.serAdapt(opts); // play-off serisi: rakip son mağlubiyetindeki karar türüne hazır (src/series.js)
    M.mfScn = scn;
    const render = () => {
      late.courtFreeze(scn || (sp && sp.scn) || { us: ty !== "def", zone: "top", guard: "normal", sp: true }); // özel anlarda da saha durur
      $("#mview").innerHTML =
        `<div class="card sit" role="region" aria-label="${$t("a11y.moment")}">${S.tipMoment || late.mtutActive() ? "" : `<div class="say gold"><b>${$t("engine.49")}</b> ${$t("engine.50")}</div>`}<div class="eyebrow">${$t(
          "engine.53",
          {
            q: M.q,
            clock: M.clock
          }
        )}${clutch ? $t("engine.51") : ""}</div><h2 id="mom-h">${head}</h2><p class="muted">${desc}</p>${late.conditionsHTML(us)}<div class="choices" role="group" aria-labelledby="mom-h">${opts
          .map(o => {
            const [c, l] = o.k === "safe" ? ["i", $t("engine.52")] : odds(o.e);
            return `<button class="choice" data-k="${o.k}"><span class="ct">${o.t}</span><span class="cd">${o.d}</span><span class="od ${c}" aria-label="${$t("a11y.odds", { v: l })}">${l}</span></button>`;
          })
          .join("")}</div></div>`;
      thumbAlign($("#mview .sit"));
    };
    // son hücumda kaçan şut: oyuncu isterse reklamla bir kez yeniden oynar (src/adplaces.js); maç durumu geri alınır
    const snap = late.retryAvailable(sp, AUTO) ? late.momentSnap() : null;
    let k, res, b0;
    for (;;) {
      if (!AUTO) render();
      k = AUTO ? late.autoChoose(opts) : await new Promise(r => $$(".choice").forEach(b => (b.onclick = () => r(b.dataset.k))));
      if (!AUTO) S.tipMoment = 1;
      b0 = { pts: M.pts, ast: M.ast, stl: M.stl, stops: M.stops };
      M.mmod = late.momentMod(k);
      let pk = sp && sp.resolve ? k : late.playKey(k),
        dm = 0;
      if (k === "set") {
        const r = await late.setPlay($("#mview"));
        pk = r.pk;
        dm = r.mod;
      } else if (k === "duo") {
        pk = "lob";
        dm = late.duoMod();
      }
      // ikinci karar: pivot önüne çıktı / savunmacı üstüne geldi (kendin oynarken)
      const fu =
        !AUTO && !(sp && sp.resolve) && ty !== "foul" && k !== "set" && k !== "duo"
          ? await late.followUp(pk, $("#mview"), scn, sur)
          : null;
      if (fu && fu.pk) pk = fu.pk;
      const pickd = opts.find(o => o.k === k);
      M.effMod = ((fu && fu.mod) || 0) + dm + Math.round(((pickd && pickd.sm) || 0) * 0.6) + (AUTO ? 0 : late.osMomentMod(k, ty)); // durum (boş/sıkı/kalabalık) ve rakip tarzı sonucu da etkiler
      if (fu && fu.foulChance && Math.random() < fu.foulChance) pk = "free"; // turnikeyi zorladı, faul aldı
      if (!AUTO) late.setMgCtx(late.mgContext(scn)); // mini oyun sahadaki pozisyona uyar (src/games.js)
      M.lastPk = pk;
      res =
        fu && fu.resolve
          ? fu.resolve()
          : sp && sp.resolve
            ? await sp.resolve(k, sur) // pozisyon anları mini oyunla çözülür (src/posplay.js)
            : AUTO
              ? late.autoResolve(pk, sur)
              : await resolvePlay(pk, $("#mview"), sur, dn);
      M.effMod = 0;
      late.setMgCtx(null);
      const tk = fu && fu.resolve ? "kick" : pk; // ikinci kararda pas: şut denemesi değil
      late.trackPlay(tk, b0.pts, res);
      late.afterMoment(fu && fu.resolve ? "pass" : k, tk, res);
      M.mmod = 0;
      if (res.good || !snap || M.adRetry || !(await late.offerRetry($("#mview")))) break;
      late.momentRestore(snap);
    }
    // sahada sonuç: top potaya; kaçarsa ribaund mücadelesi ve ikinci şans (kendin oynarken)
    let rbTxt = "";
    if (!AUTO && ty === "off" && late.isShotKey(M.lastPk)) {
      const scored = M.pts > b0.pts;
      await late.courtShot(scored);
      if (!scored && !res.good) {
        const rb = await late.reboundPhase($("#mview"), sur);
        if (rb) {
          rbTxt = " " + rb.txt;
          M.wsum = (M.wsum || 0) + 0.5;
          if (rb.good) M.wgood = (M.wgood || 0) + 0.5;
        }
      }
    }
    M.us += M.pts - b0.pts + (M.ast - b0.ast) * 2 + (M.stl - b0.stl) * 2;
    if (ty === "def" && M.stops === b0.stops && M.stl === b0.stl) {
      const p2 = Math.random() < 0.3 ? 3 : 2;
      M.them += p2;
      if (late.isStar(dn)) late.starScore(p2);
    }
    Bus.emit("match:moment", { id: (sp && sp.id) || ty, k, good: !!res.good, clutch: !!clutch, auto: !!AUTO });
    M.wsum = (M.wsum || 0) + res.w;
    if (res.good) M.wgood = (M.wgood || 0) + res.w;
    late.sfx(res.good ? "cheer" : "ooh");
    if (!AUTO && res.good && M.pts > b0.pts) late.celebrate(); // kutlama hareketi (src/custom.js)
    late.crowdSwell(res.good ? 1.4 : 0.6);
    const foulTxt = ty === "def" ? late.foulAfterMoment(k, res.good) : "";
    let txt = res.txt + rbTxt + late.afterSignature(k, res.good) + foulTxt;
    if (!AUTO && foulTxt) txt += await late.refArgue($("#mview")); // haksız düdük: sakin kal ya da itiraz et (src/tales.js)
    if (res.good) {
      // başarılı an niteliğe ondalık katkı (maç sonunda toplamı gösterilir); seviye yükseldikçe azalır ama sıfırlanmaz
      const g = BAL.play * (AUTO ? 0.5 : 1) * late.modePlayMul() * (0.25 + 0.75 * late.levelMul(res.st));
      late.gainStat(res.st, g);
      txt += ` <span class="good">+${g.toFixed(2)} ${statName(res.st)}</span>`;
    }
    addFeed(txt);
    $("#mview").innerHTML = "";
    // koç tepkisi: üst üste kötü anlar kenar, iyi seri daha çok süre getirir
    if (res.good) {
      M.goods++;
      M.fails = 0;
      if (M.goods >= 3) {
        M.goods = 0;
        const s = plan.find(([a, b]) => t / 60 >= a && t / 60 < b);
        if (s && s[1] < 40) {
          s[1] = Math.min(40, s[1] + 2);
          addFeed(
            $t("engine.54", {
              coach: S.npc.coach
            })
          );
        }
      }
    } else {
      M.fails++;
      M.goods = 0;
      if (M.fails >= 2 && role !== "star") {
        M.fails = 0;
        const s = plan.find(([a, b]) => t / 60 >= a && t / 60 < b);
        if (s) {
          s[1] = Math.ceil(t / 60);
          const nx = plan.find(([a]) => a > t / 60);
          if (nx) nx[0] += 2;
          addFeed(
            $t("engine.55", {
              coach: S.npc.coach
            })
          );
        }
      }
    }
  }
  function quarterBreak(qn, onCourt, ot) {
    if (AUTO) {
      M.tac = null;
      return Promise.resolve();
    }
    return new Promise(r => {
      late.sfx("buzzer");
      const half = qn === 2,
        last = qn === 4 && !ot;
      const rows = M.qs
          .map((s, i) => {
            const p = i ? M.qs[i - 1] : [0, 0];
            return `<td>${s[0] - p[0]}</td>`;
          })
          .join(""),
        rowsT = M.qs
          .map((s, i) => {
            const p = i ? M.qs[i - 1] : [0, 0];
            return `<td>${s[1] - p[1]}</td>`;
          })
          .join("");
      const lines = {
        win: [$t("engine.56"), $t("engine.57")],
        lose: [$t("engine.58"), $t("engine.59")],
        tie: [$t("engine.60"), $t("engine.61")]
      };
      const st = M.us > M.them ? "win" : M.us < M.them ? "lose" : "tie";
      $("#mview").innerHTML = `<div class="card"><div class="eyebrow">${
        ot
          ? $t("engine.62")
          : half
            ? $t("engine.63")
            : $t("engine.77", {
                qn: qn
              })
      }</div>
       <div class="tbl"><table><tr><th>${$t("data.36")}</th>${M.qs.map((_, i) => `<th>${$t("common.q", { n: i + 1 })}</th>`).join("")}<th>${$t("engine.71")}</th></tr><tr class="me"><td>${esc(S.team.short)}</td>${rows}<td>${M.us}</td></tr><tr><td>${esc(M.opp.short)}</td>${rowsT}<td>${M.them}</td></tr></table></div>
       <div class="small"><b>${esc(sur)}:</b> ${$t("engine.72", {
         v: Math.floor(M.mins / 60),
         pts: M.pts,
         ast: M.ast,
         reb: M.reb,
         v2: M.plus >= 0 ? "+" : "",
         plus: M.plus
       })}</div>
       <div class="who"><div id="qcp"></div><div class="say">"${pick(lines[st])}"</div></div>
       ${
         last
           ? ""
           : `<div class="eyebrow">${half ? $t("engine.64") : $t("engine.65")} ${$t("engine.69")}</div><div class="grid3">${[
               ["tempo", $t("engine.66")],
               ["def", $t("engine.67")],
               ["ball", $t("engine.68")]
             ]
               .map(([k, n]) => `<button class="btn ${M.tac === k ? "sel" : "ghost"} sm" data-tac="${k}" aria-pressed="${M.tac === k}">${n}</button>`)
               .join("")}</div>`
       }
       ${half ? late.adHalfHTML() : ""}${half ? late.mascotHTML() : ""}<button class="btn pri" id="qgo">${
         ot
           ? $t("engine.70")
           : last
             ? $t("ads.25")
             : $t("engine.78", {
                 v: qn + 1
               })
       }</button></div>`;
      const cl = LK.coach();
      cl[1].mood = st === "lose" ? "kizgin" : "mutlu";
      $("#qcp").appendChild(portrait(cl[0], cl[1]));
      $$("[data-tac]").forEach(
        b =>
          (b.onclick = () => {
            M.tac = b.dataset.tac;
            if (M.tac === "ball") S.rel.koc -= 1;
            $$("[data-tac]").forEach(x => {
              x.className = `btn ${M.tac === x.dataset.tac ? "sel" : "ghost"} sm`;
              x.setAttribute("aria-pressed", String(M.tac === x.dataset.tac));
            });
          })
      );
      if (half) {
        M.toLeft = 3; // ikinci yarı mola hakları (src/clutch.js)
        M.toReq = 0;
        S.energy = Math.min(100, S.energy + 4);
        late.bindAdHalf();
        late.bindMascot(); // maskot düellosu (src/tales.js)
        late.commentLine("half");
      }
      thumbAlign($("#mview > .card"));
      $("#qgo").onclick = () => {
        $("#mview").innerHTML = "";
        addFeed(
          ot
            ? $t("engine.73")
            : `${$t("engine.79", {
                v: qn + 1
              })}${M.tac ? ` ${$t("engine.75")} ${{ tempo: $t("engine.66"), def: $t("engine.67"), ball: $t("engine.68") }[M.tac]}.` : ""}`
        );
        r();
      };
    });
  }
}
