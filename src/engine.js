import { late } from "./late.js";
import { $, $$, BAL, Bus, PLAYS, SC, cOf, clamp, esc, isPro, pick, ri, roleAt, shuffle, statName, wait } from "./data.js";
import { portrait } from "./art.js";
import { buzz } from "./games.js";
import { S, TD, app, closeSheet, eff, fixture, lgName, ovr, phaseName, teamByKey } from "./core.js";
import { arenaFor } from "./places.js";
import { LK, M, PEN, addFeed, finishMatch, odds, resolvePlay, setM, updBug } from "./match.js";
/* ================= MAÇ MOTORU (NSS tarzı akış) =================
   Maç dört çeyrek boyunca hücum hücum akar. Oyuncu rotasyona göre sahaya girip çıkar.
   "Tüm maç" modunda akış izlenir; "Önemli anlar" modunda kenar dakikaları atlanır.
   Çeyrek aralarında duraklama, skor özeti ve koçla taktik konuşması var. */
export const PACE = { 1: 420, 2: 200, 4: 90 };
export const TR_CALLS = ["Salon ayakta!", "Ve basket!", "Tribünler coştu!", "Ne oyun ama!", "Pota delindi resmen!"];
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
export function modeChoice() {
  if (window.__SIM) return Promise.resolve("key");
  return new Promise(r => {
    const cur = S.matchMode || "full";
    $("#mview").innerHTML = `<div class="card sit"><div class="eyebrow">Maç öncesi</div><h2>Nasıl oynamak istersin?</h2>
     <div class="choices">
      <button class="choice" data-m="full"><span class="ct">Tüm maçı oyna</span><span class="cd">Maçın akışını baştan sona izle. Kenardayken de skor ve olaylar akar, oyuna girince kritik anları sen oynarsın.</span><span class="od ${cur === "full" ? "e" : "i"}">${cur === "full" ? "Son seçim" : "İzle"}</span></button>
      <button class="choice" data-m="key"><span class="ct">Sadece önemli anlar</span><span class="cd">Kenar dakikaları hızla geçer, yalnızca sahada olduğun dilimlere ışınlanırsın. Daha kısa sürer.</span><span class="od ${cur === "key" ? "e" : "i"}">${cur === "key" ? "Son seçim" : "Hızlı"}</span></button>
     </div></div>`;
    $$("[data-m]").forEach(
      b =>
        (b.onclick = () => {
          S.matchMode = b.dataset.m;
          r(b.dataset.m);
        })
    );
  });
}
export async function playMatch(ctx) {
  closeSheet();
  window.scrollTo(0, 0);
  Bus.emit("match:start", ctx);
  if (!ctx) {
    const fx = fixture();
    ctx = { opp: teamByKey(fx.opp), home: fx.home, comp: "lig", label: `${lgName()} · ${phaseName()}` };
  }
  const opp = ctx.opp,
    AUTO = !!ctx.auto || !!window.__SIM;
  arenaFor(opp);
  const role = isPro(S.stage) || ctx.comp === "nat" ? ctx.role || S.role : schoolRole();
  let plan = stintPlan(role);
  const ourStr = S.team.str + (ovr() - TD() - 45) / 220,
    ppp = SC[S.stage] / 70 / 2.25;
  setM({
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
    speed: S.matchSpeed || 1
  });
  const mates = ctx.comp === "nat" ? rosterNames(S.team.city, 4) : late.mateNames(4),
    foes = rosterNames(opp.city, 5),
    sur = S.last,
    PL = PLAYS[S.pos];
  app.innerHTML = `<div id="bug"></div><div id="mstat" class="card" style="padding:10px 12px;gap:6px"></div><div id="mview"></div>
   <div class="card"><div class="row between"><div class="eyebrow">Maç akışı</div><div class="row" style="gap:4px" id="spd"></div></div><div class="feed" id="feed"></div></div>`;
  updBug();
  let mode = AUTO ? "key" : await modeChoice();
  $("#mview").innerHTML = "";
  const renderSpd = () => {
    $("#spd").innerHTML =
      `${[1, 2, 4].map(s => `<button class="opt ${M.speed === s ? "on" : ""}" data-s="${s}" style="padding:4px 9px">${s}×</button>`).join("")}<button class="opt ${mode === "key" ? "on" : ""}" data-k="1" style="padding:4px 9px">Önemli anlar</button>`;
    $$("#spd [data-s]").forEach(
      b =>
        (b.onclick = () => {
          M.speed = +b.dataset.s;
          S.matchSpeed = M.speed;
          renderSpd();
        })
    );
    $("#spd [data-k]").onclick = () => {
      mode = mode === "key" ? "full" : "key";
      S.matchMode = mode;
      renderSpd();
    };
  };
  renderSpd();
  let on = false;
  const statLine = () => {
    $("#mstat").innerHTML =
      `<div class="row between nowrap"><span class="pill ${on ? "w" : ""}">${on ? "Sahadasın" : "Kenardasın"}</span><span class="small muted">${ctx.label}</span></div><div class="small"><b>${esc(sur)}</b> · ${Math.floor(M.mins / 60)} dk · ${M.pts} sayı · ${M.ast} asist · ${M.reb} rib. · artı/eksi ${M.plus >= 0 ? "+" : ""}${M.plus}</div>`;
  };
  const banner = (t, good) => {
    late.sfx("whistle");
    const d = document.createElement("div");
    d.className = "say";
    d.style.borderLeftColor = good ? "var(--good)" : "var(--warn)";
    d.innerHTML = `<b>${t}</b>`;
    const mv = $("#mview");
    mv.prepend(d);
    setTimeout(() => d.remove(), 2600);
    buzz(good ? 20 : 10);
  };
  addFeed(`${ctx.home ? S.city : opp.city} salonu dolu. ${ctx.label}. Hakem topu havaya attı.`);
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
  const pace = async () => {
    if (AUTO) return;
    const ms = mode === "key" && !on ? 0 : mode === "key" ? PACE[4] : PACE[M.speed];
    if (ms) await wait(ms);
  };
  let end = TOTAL;
  while (t < end) {
    const dur = ri(12, 22);
    t = Math.min(end, t + dur);
    setClock();
    // çeyrek arası
    const q = Math.floor((t - 1) / 600) + 1;
    if (q > lastQ && t <= TOTAL) {
      M.qs.push([M.us, M.them]);
      await quarterBreak(lastQ, on);
      lastQ = q;
    }
    // rotasyon
    const minute = t / 60,
      want = inStint(plan, Math.min(39.9, minute)) || (t > TOTAL && role !== "bench");
    if (want !== on) {
      on = want;
      if (on) {
        banner(`Oyuna girdin · ${M.q}. çeyrek ${M.clock}`, true);
        addFeed(`<b>Oyuncu değişikliği:</b> ${sur} oyuna girdi.`);
        if (benchFrom && mode === "key") addFeed(`Kenardayken skor ${benchFrom[0]}-${benchFrom[1]} iken ${M.us}-${M.them} oldu.`);
        benchFrom = null;
      } else {
        banner(`Oyundan alındın · ${M.q}. çeyrek ${M.clock}`, false);
        addFeed(`<b>Oyuncu değişikliği:</b> ${sur} kenara geldi.`);
        benchFrom = [M.us, M.them];
      }
      statLine();
    }
    if (on) M.mins += dur;
    const close = Math.abs(M.us - M.them) <= 6,
      clutch = t > TOTAL - 120 && close;
    const involve = 0.08 + (clutch ? 0.35 : 0) + (M.tac === "ball" ? 0.05 : 0);
    const before = [M.us, M.them];
    if (on && Math.random() < involve) {
      await moment(ourBall, clutch);
    } else simPossession(ourBall);
    if (on) M.plus += M.us - before[0] - (M.them - before[1]);
    ourBall = !ourBall;
    updBug();
    if (on) statLine();
    if (t >= end && end >= TOTAL && M.us === M.them) {
      end += 300;
      addFeed("<b>Uzatma!</b> Beş dakika daha.");
      if (t === TOTAL) {
        M.qs.push([M.us, M.them]);
        await quarterBreak(4, on, true);
      }
    }
    await pace();
  }
  M.qs.push([M.us, M.them]);
  M.q = 4;
  M.clock = "00:00";
  updBug();
  late.sfx("buzzer");
  late.crowd(false);
  const win = M.us > M.them,
    sr = M.wsum ? (M.wgood || 0) / M.wsum : 0.5;
  M.rating = clamp(
    3.5 + 5.0 * sr + (win ? 0.2 : -0.15) + clamp(M.plus / 35, -0.35, 0.35) + clamp((M.autoPts || 0) / 50, 0, 0.2),
    1,
    10
  );
  addFeed(`<b>Maç sona erdi.</b> ${M.us}-${M.them}.`);
  if (!AUTO) await wait(500);
  M.auto = !!ctx.auto;
  if (ctx.onEnd) ctx.onEnd(win);
  else finishMatch(win);

  function simPossession(us) {
    const tacU = M.tac === "tempo" ? 1.06 : M.tac === "def" ? 0.97 : 1,
      tacT = M.tac === "def" ? 0.93 : M.tac === "tempo" ? 1.03 : 1;
    const p = clamp(ppp * (us ? (ourStr / opp.str) * tacU * (on ? 1 : 0.97) : (opp.str / ourStr) * tacT), 0.15, 0.85);
    const who = us ? pick(mates) : pick(foes),
      team = us ? S.team.short : opp.short;
    if (Math.random() < p) {
      const three = Math.random() < 0.32,
        pts = three ? 3 : 2;
      if (us) M.us += pts;
      else M.them += pts;
      if (us && on) {
        const sk = (eff("sut") + eff("hiz") + eff("guc")) / 3,
          share = { star: 0.21, rot: 0.13, bench: 0.08 }[role] * (0.6 + (clamp(sk, 0, 100) / 100) * 0.8);
        if (Math.random() < share) {
          M.pts += pts;
          M.autoPts = (M.autoPts || 0) + pts;
          if (mode === "full")
            addFeed(
              `${S.team.short} · <b>${sur}</b> ${three ? "üçlüğü soktu" : pick(["pota altından 2 sayı", "orta mesafeden 2 sayı", "turnikeyle 2 sayı"])}`
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
          `${team} · ${who} ${three ? "üçlüğü soktu" : pick(["pota altından 2 sayı", "orta mesafeden 2 sayı", "turnikeyle 2 sayı", "hızlı hücumda smaç"])}${us && Math.random() < 0.12 ? " " + pick(TR_CALLS) : ""}`
        );
    } else if (on && Math.random() < { C: 0.2, PF: 0.16, SF: 0.1, SG: 0.06, PG: 0.05 }[S.pos] * (0.6 + eff("guc") / 100)) {
      M.reb++;
    } else if (Math.random() < 0.35 && mode === "full")
      addFeed(`${team} · ${who} ${pick(["şutu kaçırdı", "top kaybı yaptı", "faul yaptı", "turnikeyi kaçırdı"])}`);
  }
  async function moment(us, clutch) {
    const diff = M.us - M.them,
      dn = pick(foes);
    let head,
      desc,
      opts,
      ty = us ? (Math.random() < 0.13 ? "foul" : "off") : "def";
    if (ty === "off") {
      head = clutch
        ? diff < 0
          ? `${-diff} sayı gerideyiz, son hücum sende`
          : diff === 0
            ? "Skor eşit, top sende"
            : `${diff} sayı öndeyiz, işi bitir`
        : pick(PL.sit);
      desc = `Üzerinde ${dn} var.`;
      opts = PL.off.map(([k, tt, st, d]) => ({
        k,
        t: tt,
        d: `${d} · ${statName(st)} ${Math.round(eff(st))}`,
        e: eff(st) - (PEN[k] || 0)
      }));
      if (!clutch && opts.length > 3) opts = shuffle(opts).slice(0, 3);
    } else if (ty === "def") {
      head = pick(["Rakip hücumda, top tehlikeli bölgede", "Rakibin yıldızı topla geliyor", "Hızlı hücum yiyorsunuz"]);
      desc = `${dn} topla geliyor.`;
      opts = PL.def.map(([k, tt, st, d]) => ({
        k,
        t: tt,
        d: `${d} · ${statName(st)} ${Math.round(eff(st))}`,
        e: eff(st) + (k === "safe" ? 15 : 0)
      }));
    } else {
      head = "Faul aldın";
      desc = "Çizgiye gidiyorsun. İki serbest atış.";
      opts = [{ k: "free", t: "Serbest atış", d: `2 atış · Şut ${Math.round(eff("sut"))}`, e: eff("sut") + 15 }];
    }
    if (!AUTO)
      $("#mview").innerHTML =
        `<div class="card sit">${S.tipMoment ? "" : `<div class="say" style="border-left-color:var(--gold)"><b>İpucu:</b> Kritik anlarda bir seçim yaparsın. Sağdaki etiket niteliklerine göre başarı şansını gösterir. Seçtikten sonra mini oyunu oynarsın; ekrandaki yönergeyi takip et.</div>`}<div class="eyebrow">${M.q}. çeyrek ${M.clock}${clutch ? " · son dakikalar" : ""}</div><h2>${head}</h2><p class="muted">${desc}</p><div class="choices">${opts
          .map(o => {
            const [c, l] = o.k === "safe" ? ["i", "Güvenli"] : odds(o.e);
            return `<button class="choice" data-k="${o.k}"><span class="ct">${o.t}</span><span class="cd">${o.d}</span><span class="od ${c}">${l}</span></button>`;
          })
          .join("")}</div></div>`;
    if (!AUTO)
      try {
        $("#mview").scrollIntoView({ block: "start", behavior: "smooth" });
      } catch (e) {}
    const k = AUTO
      ? late.autoChoose(opts)
      : await new Promise(r => $$(".choice").forEach(b => (b.onclick = () => r(b.dataset.k))));
    if (!AUTO) S.tipMoment = 1;
    const b0 = { pts: M.pts, ast: M.ast, stl: M.stl, stops: M.stops };
    const res = AUTO ? late.autoResolve(k, sur) : await resolvePlay(k, $("#mview"), sur, dn);
    M.us += M.pts - b0.pts + (M.ast - b0.ast) * 2 + (M.stl - b0.stl) * 2;
    if (ty === "def" && M.stops === b0.stops && M.stl === b0.stl) M.them += Math.random() < 0.3 ? 3 : 2;
    M.wsum = (M.wsum || 0) + res.w;
    if (res.good) M.wgood = (M.wgood || 0) + res.w;
    late.sfx(res.good ? "cheer" : "ooh");
    late.crowdSwell(res.good ? 1.4 : 0.6);
    let txt = res.txt;
    if (res.good) {
      S.stf = S.stf || {};
      S.stf[res.st] = (S.stf[res.st] || 0) + BAL.play * (AUTO ? 0.5 : 1);
      if (S.stf[res.st] >= 1) {
        S.stf[res.st] -= 1;
        S.st[res.st] += 1;
        txt += ` <span class="good">+1 ${statName(res.st)}</span>`;
      }
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
          addFeed(`${S.npc.coach}: "Bırakın oynasın!" Süren uzatıldı.`);
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
          addFeed(`${S.npc.coach} kenardan seslendi: "Otur biraz, kafanı topla."`);
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
        win: ["Böyle devam. Savunmayı bırakmayın.", "Güzel gidiyoruz ama rehavete kapılmak yok."],
        lose: ["Kendimize gelmemiz lazım. Ribaundlar bizim olacak!", "Bu skor bize yakışmıyor. Daha sert oynayın!"],
        tie: ["Maç başa baş. Detaylar kazandıracak.", "Kim daha çok isterse o kazanır."]
      };
      const st = M.us > M.them ? "win" : M.us < M.them ? "lose" : "tie";
      $("#mview").innerHTML =
        `<div class="card"><div class="eyebrow">${ot ? "Uzatma öncesi" : half ? "Devre arası" : `${qn}. çeyrek sonu`}</div>
       <div class="tbl"><table><tr><th>Takım</th>${M.qs.map((_, i) => `<th>${i + 1}Ç</th>`).join("")}<th>Top.</th></tr><tr class="me"><td>${esc(S.team.short)}</td>${rows}<td>${M.us}</td></tr><tr><td>${esc(M.opp.short)}</td>${rowsT}<td>${M.them}</td></tr></table></div>
       <div class="small"><b>${esc(sur)}:</b> ${Math.floor(M.mins / 60)} dk · ${M.pts} sayı · ${M.ast} asist · ${M.reb} ribaund · artı/eksi ${M.plus >= 0 ? "+" : ""}${M.plus}</div>
       <div class="who"><div id="qcp"></div><div class="say">"${pick(lines[st])}"</div></div>
       ${
         last
           ? ""
           : `<div class="eyebrow">${half ? "Soyunma odası" : "Mola"} · taktik seç</div><div class="grid3">${[
               ["tempo", "Tempoyu artır"],
               ["def", "Savunmaya odaklan"],
               ["ball", "Topu bana verin"]
             ]
               .map(([k, n]) => `<button class="btn ${M.tac === k ? "team" : "ghost"} sm" data-tac="${k}">${n}</button>`)
               .join("")}</div>`
       }
       ${half ? late.adHalfHTML() : ""}<button class="btn pri" id="qgo">${ot ? "Uzatmaya başla" : last ? "Devam" : `${qn + 1}. çeyreğe başla`}</button></div>`;
      const cl = LK.coach();
      cl[1].mood = st === "lose" ? "kizgin" : "mutlu";
      $("#qcp").appendChild(portrait(cl[0], cl[1]));
      $$("[data-tac]").forEach(
        b =>
          (b.onclick = () => {
            M.tac = b.dataset.tac;
            if (M.tac === "ball") S.rel.koc -= 1;
            $$("[data-tac]").forEach(x => (x.className = `btn ${M.tac === x.dataset.tac ? "team" : "ghost"} sm`));
          })
      );
      if (half) {
        S.energy = Math.min(100, S.energy + 4);
        late.bindAdHalf();
      }
      try {
        $("#mview").scrollIntoView({ block: "start", behavior: "smooth" });
      } catch (e) {}
      $("#qgo").onclick = () => {
        $("#mview").innerHTML = "";
        addFeed(
          ot
            ? "Uzatma başladı."
            : `${qn + 1}. çeyrek başladı.${M.tac ? ` Taktik: ${{ tempo: "tempo", def: "savunma", ball: "top " + sur + "'de" }[M.tac]}.` : ""}`
        );
        r();
      };
    });
  }
}
