// Oyunun gerçek kodu üzerinde koşan otomatik oyuncu (sayfaya enjekte edilir).
// Profil: weak/avg/strong. Kritik anlar oyunun kendi autoResolve'u ile, oyuncunun beceri seviyesine göre çözülür.
// Oyunun dışa aktarımları window.Game üzerinden okunur; "with" ile kod eski global adlarla yazılmış gibi kalır.
(() => {
  with (window.Game) {
    const P = { weak: 0.37, avg: 0.5, strong: 0.62 };
    let BASE = 0.5,
      REC = null,
      done = null,
      stuckT = 0,
      lastSig = "",
      GEN = 0;
    const pS = e => clamp(BASE + (e - 40) * 0.0075, 0.08, 0.92);
    const bin = (n, p) => {
      let k = 0;
      for (let i = 0; i < n; i++) if (Math.random() < p) k++;
      return k;
    };
    // Test modu: oyun kayıt, ses, bildirim ve olay panellerini kendisi kapatır (SIM()); fonksiyon değiştirilmez.
    window.__SIM = { base: 0.5 };
    const POSW = {
      PG: { pas: 1.3, hiz: 1.2, sut: 1, sav: 0.8, guc: 0.7 },
      SG: { sut: 1.4, hiz: 1.1, pas: 0.9, sav: 0.9, guc: 0.7 },
      SF: { sut: 1.1, sav: 1, guc: 1, hiz: 1, pas: 0.9 },
      PF: { guc: 1.3, sav: 1.3, sut: 0.9, hiz: 0.8, pas: 0.7 },
      C: { guc: 1.5, sav: 1.4, sut: 0.7, hiz: 0.7, pas: 0.7 }
    };
    function train() {
      const w = POSW[S.pos],
        drills = [...DRILLS[S.pos], ...COMMON_DRILLS];
      let best = null,
        bv = -1e9;
      for (const d of drills) {
        const k = d[2],
          v = w[k] * (100 - S.st[k]) + rnd(0, 15);
        if (v > bv) {
          bv = v;
          best = d;
        }
      }
      const k = best[2],
        reps = best[3] === "gym" ? 1 : 3,
        p = pS(clamp(eff(k) + 10, 5, 100));
      const ratio = best[3] === "gym" ? clamp(p * 1.1, 0, 1) : bin(reps, p) / reps;
      const g = drillGain(k, ratio);
      S.st[k] += g;
      S.energy -= 18;
      if (ratio > 0.6) S.rel.koc += 2;
      REC.trainGain += g;
    }
    const buyable = () => SHOP.filter(it => !S.items[it.id]);
    // "Hepsini al" stratejisi: gelir getiren yatırımlar önce, sonra en ucuzdan pahalıya; 6 haftalık gider yedekte kalır
    function shoppingAll() {
      const fixed = HOUSING[S.housing].rent + carUpkeep() + (BAL.living[S.stage] || 0);
      const reserve = fixed * 6 + 20;
      const list = buyable().sort((a, b) => (b.inc ? 1 : 0) - (a.inc ? 1 : 0) || a.p - b.p);
      for (const it of list) {
        if (S.money - it.p < reserve) continue;
        if (it.up && S.wage * (1 - (BAL.tax[S.stage] || 0)) < fixed + it.up) continue; // bakım masrafını karşılayamıyorsa bekle
        tx(it.n, -it.p);
        S.items[it.id] = 1;
        it.fx && it.fx();
        REC.buys.push(`${S.age}:${it.id}`);
      }
      const order = ["daire", "lux", "villa", "malikane"],
        cur = order.indexOf(S.housing);
      const nx = S.stage !== "lise" && order[cur + 1];
      if (nx) {
        const h = HOUSING[nx],
          net = S.wage * (1 - (BAL.tax[S.stage] || 0) - BAL.agent) - (BAL.living[S.stage] || 0) - carUpkeep() + itemWeekly("inc");
        if (net > h.rent * 1.1 && S.money > h.rent * 4 + reserve) {
          tx(h.n, -h.rent * 4);
          S.housing = nx;
          REC.house.push(`${S.age}:${nx}`);
        }
      }
      if (!buyable().length && S.housing === "malikane") autoLegacy(); // her şey alındıysa vakıf ve kulüp payı
      if (!REC.allOwned && !buyable().length && S.housing === "malikane")
        REC.allOwned = { week: REC.weeks, age: S.age, season: S.season, stage: S.stage };
      if (S.energy < 50 && S.money > 6) {
        tx("Enerji içeceği", -3);
        S.energy += 15;
      }
    }
    function shopping() {
      if (window.__SIM.buyAll) return shoppingAll();
      const net = S.wage - HOUSING[S.housing].rent - carUpkeep();
      for (const it of buyable()) {
        const stat = /Çeviklik|Şut|Savunma|Güç|Pas/.test(it.d) && !it.up,
          comfort = ["yatak", "kryo", "fizyo", "koltuk", "swatch"].includes(it.id),
          car = !!it.up;
        let ok = false;
        if (it.inc) ok = S.money >= it.p * 1.5;
        else if (stat) ok = S.money >= it.p * 2.2;
        else if (comfort) ok = S.money >= it.p * 3;
        else if (car) ok = S.money >= it.p * 2.5 && net > it.up * 8;
        else ok = S.money >= it.p * 6 && Math.random() < 0.15;
        if (ok) {
          tx(it.n, -it.p);
          S.items[it.id] = 1;
          it.fx && it.fx();
          REC.buys.push(`${S.age}:${it.id}`);
        }
      }
      const order = ["daire", "lux", "villa", "malikane"],
        cur = order.indexOf(S.housing);
      if (S.stage !== "lise") {
        const nx = order[cur + 1];
        if (nx) {
          const h = HOUSING[nx];
          if (net > h.rent * 3 && S.money > h.rent * 12) {
            tx(h.n, -h.rent * 4);
            S.housing = nx;
            REC.house.push(`${S.age}:${nx}`);
          }
        }
      }
      if (S.energy < 50 && S.money > 6) {
        tx("Enerji içeceği", -3);
        S.energy += 15;
      }
    }
    // Reklam modeli: haftada __SIM.adsPerWeek kadar ödüllü reklam kredisi birikir (günlük 8 sınırının oyun haftasına karşılığı)
    function useAd(kind) {
      if (adCredit < 1) return false;
      adCredit--;
      REC.ads[kind] = (REC.ads[kind] || 0) + 1;
      return true;
    }
    let adCredit = 0;
    function simWeek() {
      REC.weeks++;
      adCredit = Math.min(adCredit + (window.__SIM.adsPerWeek || 0), 8);
      if (S.injury && S.injury.w > 1 && !S.injury.adHealed && useAd("heal")) {
        S.injury.w--;
        S.injury.adHealed = true;
      }
      if (S.energy < 60 && !S.injury && useAd("energy")) S.energy += 30;
      S.slot = 3;
      for (let s = 0; s < 3; s++) {
        if (S.injury) {
          if (S.slot > 0) {
            S.slot--;
            if (Math.random() < 0.5 && S.injury.w > 1) S.injury.w--;
            S.energy += 10;
          }
          continue;
        }
        if (S.energy < 42) {
          S.energy += 35;
          S.moral += 2;
        } else if (S.studying && S.aka < 60 && Math.random() < 0.45) {
          const c = bin(3, 0.62);
          S.aka += c * 3;
          S.energy -= 6;
          S.studied = true;
        } else if (S.moral < 45) {
          if (S.money >= 3) {
            tx("Kafe", -3);
          }
          S.moral += 8;
          S.rel.ark += 8;
        } else if (S.rel.aile < 40) {
          S.rel.aile += 12;
          S.moral += 5;
        } else train();
        norm();
      }
      S.slot = 0;
      shopping();
      norm();
    }
    function pickOffer() {
      const L = window.__lastOffers || [];
      if (!L.length) return 0;
      const pro = L.map((o, i) => ({ o, i })).filter(x => isPro(x.o.stage));
      const sc = x =>
        ORDER.indexOf(x.o.stage) * 100 +
        ({ star: 40, rot: 20, bench: -35 }[x.o.role] || 0) +
        Math.log10(Math.max(1, x.o.wage)) * 5;
      if (pro.length) {
        pro.sort((a, b) => sc(b) - sc(a));
        const top = pro[0];
        if (S.stage === "lise" || S.stage === "uni") {
          if (top.o.role === "bench") {
            const u = L.findIndex(o => o.uni || o.stay);
            if (u >= 0 && ORDER.indexOf(top.o.stage) < 4) return u;
          }
        }
        return top.i;
      }
      return 0;
    }
    const sig = () => [S && S.season, S && S.week, S && S.phase, $("#ovl").innerHTML.length, app.innerHTML.length].join("|");
    const BTN = [
      "#chok",
      "#nok",
      "#as-no",
      "#ng-ok",
      "#rb",
      "#ok",
      "#nx",
      "#tr-skip",
      "#qgo",
      "#bk",
      "#aok",
      "#pok",
      "#rok",
      "#bn-later"
    ];
    function pump(g) {
      if (done === null || g !== GEN) return;
      const again = () => setTimeout(() => pump(g), 0);
      try {
        if (S && !S.retired && $("#ret") && (S.age >= 37 || !$("[data-o]"))) {
          $("#ret").click();
          return again();
        }
        const pr = $$("[data-press]");
        if (pr.length) {
          pick(pr).click();
          return again();
        }
        const ar = $$("[data-arc]");
        if (ar.length) {
          pick(ar).click();
          return again();
        }
        for (const s of BTN) {
          const b = $(s);
          if (b) {
            b.click();
            return again();
          }
        }
        const c1 = $('[data-act="c1"]');
        if (c1) {
          c1.click();
          return again();
        }
        if ($("[data-o]")) {
          if (S.age >= 36 && $("#ret")) {
            $("#ret").click();
            return again();
          }
          const i = pickOffer();
          $$("[data-o]")[i].click();
          return again();
        }
        if ($("#gostad") && !$("#ovl").innerHTML) {
          simWeek();
          if (S.injury) simWithoutMe();
          else {
            const f = fixture();
            playMatch({ opp: teamByKey(f.opp), home: f.home, comp: "lig", label: "sim" });
          }
          return again();
        }
      } catch (e) {
        REC.err = (REC.err || "") + e.message + "|";
      }
      const sg = sig();
      if (sg === lastSig) {
        stuckT++;
        if (stuckT > 4000) {
          REC.stuck = $("#ovl").innerText.slice(0, 200) + "//" + app.innerText.slice(0, 200);
          finishCareer();
        }
      } else {
        stuckT = 0;
        lastSig = sg;
      }
      setTimeout(() => pump(g), 1);
    }
    Bus.on("season:end", ({ champ }) => {
      if (!REC) return;
      const avg = seasonAvg(),
        ss = { ...(S.ss || blankSS()) };
      REC.seasons.push({
        age: S.age,
        stage: S.stage,
        cc: S.team.cc,
        team: S.team.name,
        role: S.role,
        ovr: ovr(),
        avg: +avg.toFixed(2),
        money: Math.round(S.money),
        wage: S.wage,
        w: S.results.filter(x => x.win).length,
        l: S.results.filter(x => !x.win).length,
        champ: !!champ,
        ppg: ss.g ? +(ss.pts / ss.g).toFixed(1) : 0,
        apg: ss.g ? +(ss.ast / ss.g).toFixed(1) : 0,
        rpg: ss.g ? +(ss.reb / ss.g).toFixed(1) : 0,
        mpg: ss.g ? +(ss.min / ss.g).toFixed(1) : 0,
        dnp: ss.dnp,
        energy: S.energy,
        koc: S.rel.koc,
        inj: S.injury ? S.injury.n : null,
        rival: S.rival ? S.rival.stage : null,
        owned: Object.keys(S.items).length,
        housing: S.housing,
        weeks: REC.weeks
      });
    });
    Bus.on("match:end", d => {
      if (!REC || d.rating == null) return;
      if (useAd("double")) {
        const bonus = Math.round(
          (S.stage === "lise" ? 2 : S.stage === "uni" ? 6 : S.wage * 0.12) * (d.rating / 6) * (d.win ? 1.5 : 1)
        );
        tx("Reklam bonusu", bonus);
        REC.adMoney += bonus;
      }
      if (useAd("halftime")) {
        S.energy += 10;
        S.moral += 4;
      }
    });
    for (const [ev, key] of [
      ["event:show", "events"],
      ["arc", "arcs"],
      ["press", "press"],
      ["role:change", "roles"]
    ])
      Bus.on(ev, d => {
        if (!REC) return;
        const k =
          ev === "event:show" ? d.title : ev === "arc" ? d.id + ":" + d.step : ev === "press" ? d.tone : d.from + ">" + d.to;
        REC[key][k] = (REC[key][k] || 0) + 1;
      });
    Bus.on("career:retire", () => {
      if (REC) {
        REC.retired = S.age;
        finishCareer();
      }
    });
    function finishCareer() {
      if (!done) return;
      REC.trophies = S ? S.career.trophies.map(t => t.type) : [];
      REC.tlab = S ? S.career.trophies.map(t => t.label) : [];
      REC.caps = S ? S.career.natCaps || 0 : 0;
      REC.arcs = S ? Object.keys(S.arcs || {}) : [];
      REC.legacy = S ? legacyScore() : 0;
      REC.legacyParts = S ? legacyBreakdown().parts : [];
      REC.hof = S ? hofTier(legacyScore())[1] : "";
      REC.final = {
        age: S && S.age,
        money: S && Math.round(S.money),
        followers: S && S.followers,
        items: S && Object.keys(S.items).length,
        housing: S && S.housing
      };
      const d = done;
      done = null;
      d(REC);
    }
    window.__runCareer = (profile, pos) =>
      new Promise(res => {
        BASE = P[profile];
        window.__SIM.base = BASE;
        REC = {
          profile,
          pos,
          seasons: [],
          trainGain: 0,
          buys: [],
          house: [],
          weeks: 0,
          ads: {},
          adMoney: 0,
          events: {},
          arcs: {},
          press: {},
          roles: {},
          allOwned: null
        };
        adCredit = 0;
        done = res;
        stuckT = 0;
        F.first = "Sim";
        F.last = "Oyuncu";
        F.pos = pos;
        F.slot = 1;
        startCareer();
        S.tut = 1;
        closeSheet();
        renderMain();
        const g = ++GEN;
        setTimeout(() => pump(g), 0);
      });
  }
})();
