import { t as $t } from "./i18n/index.js";
/* ================= ÖZEL MAÇ ANLARI =================
   Standart kritik anların (şut, penetrasyon, pas, blok...) yanında çeşitlilik için karar anları.
   Bunların çoğu mini oyunsuz anında çözülür: sonucu seçimin ve niteliklerin belirler.
   - 2'ye 1 hızlı hücum: bitir mi, pas mı?
   - Perde savunması: değiş, perdenin üstünden geç, yardım iste
   - Tahrik: rakip sataşıyor; sakin kal ya da karşılık ver (teknik faul riski)
   - Son hücum: skor yakınken son saniyeler; standart seçenekler özel başlıkla gelir */
import { pick, statName } from "./data.js";
import { late } from "./late.js";
import { S, eff } from "./core.js";
import { autoSuccess } from "./logic/rules.js";
import { M } from "./match.js";

const p = (e, base = 0.5) => autoSuccess(e + (M.mmod || 0), base);
const coin = x => Math.random() < x;

/** Bu an özel bir an mı? Değilse null döner. */
/* ---- Maç koşulları: rakibin savunma tipi ve yorgunluk ----
   Alan savunması dış şutu ve topu döndürmeyi ödüllendirir, boyalı alanı kapatır; adam adama tersine.
   Yorgunluk sahada kesintisiz kalınan süre ve enerjiyle artar; atletik seçenekleri (penetrasyon, smaç, hızlı hücum,
   top çalma, blok) en çok etkiler. Etki hem ekranda gösterilen başarı şansına hem sonuca yansır, böylece maçın
   durumuna göre en iyi seçenek değişir (sabit "doğru düğme" kalmaz). */
const OUT = ["pull", "catch", "wing", "step", "pop", "mid"],
  PASS = ["kick", "lob", "pnr", "fb_pass"],
  IN = ["drive", "dunk", "post", "hook", "putback", "break", "fb_finish"],
  ATH = ["drive", "dunk", "break", "putback", "fb_finish", "steal", "block", "rim", "charge", "sc_over"];
/** Yorgunluk 0..1 */
export function fatigue() {
  if (!M || !S) return 0;
  const stint = (M.stint || 0) / 60;
  return Math.max(0, Math.min(1, ((stint - 5) / 12) * 0.65 + Math.max(0, (55 - S.energy) / 55) * 0.35));
}
/** Seçeneğin başarı değerine eklenecek koşul etkisi */
export function momentMod(k) {
  if (!M) return 0;
  let m = 0;
  if (M.dz === "zone") m += OUT.includes(k) ? 6 : PASS.includes(k) ? 5 : IN.includes(k) ? -7 : 0;
  else if (M.dz === "man") m += IN.includes(k) ? 6 : OUT.includes(k) ? -4 : PASS.includes(k) ? -2 : 0;
  const f = fatigue();
  if (ATH.includes(k)) m -= Math.round(f * 14);
  else if (OUT.includes(k)) m -= Math.round(f * 6);
  return m + late.traitMod(k);
}
/** Karar anı başlığındaki bilgi rozetleri */
export function conditionsHTML(us) {
  const f = Math.round(fatigue() * 100);
  const dz = us && M.dz ? `<span class="pill">${M.dz === "zone" ? $t("cond.zone") : $t("cond.man")}</span>` : "";
  const ft = f >= 15 ? `<span class="pill ${f >= 50 ? "l" : ""}">${$t("cond.tired", { v: f })}</span>` : "";
  return dz || ft ? `<div class="row" style="gap:var(--sp-1h);flex-wrap:wrap">${dz}${ft}</div>` : "";
}

export function pickSpecial(us, clutch, diff, dn) {
  const situ = late.situSpecial(us, clutch, diff, dn);
  if (situ) return situ;
  // son hücum: maçın son anları, 3 sayı ya da daha az geride/eşit, top bizde
  if (us && clutch && diff <= 0 && diff >= -3)
    return {
      id: "lastshot",
      head:
        diff === 0
          ? $t("moment.tiedGameLast")
          : $t("moment.downFinalSeconds", {
              v: -diff
            }),
      desc: $t("moment.arenaFeetCoach", {
        dn: dn
      }),
      // standart anahtarlar kullanılır: şut ve penetrasyon mini oyunla, pas otomatik
      keys: ["pull", "catch", "drive", "kick", "step", "mid"]
    };
  if (clutch) return null;
  const pp = late.ppSpecial(us, clutch, diff, dn); // pozisyona özgü an (src/posplay.js; yalnız kendin oynarken)
  if (pp) return pp;
  // her an türü kendi zarını atar (önceki sürümde sataşma hiç gelmiyordu: aynı sayı önce diğer koşullara takılıyordu)
  if (Math.random() < 0.04) return provocation(dn);
  if (us && Math.random() < 0.12) return fastBreak(dn);
  if (!us && Math.random() < 0.14) return screenDefense(dn);
  return null;
}

function fastBreak(dn) {
  return {
    id: "fastbreak",
    ty: "off",
    head: $t("moment.fastBreak2"),
    desc: $t("moment.stoleBallOnly", {
      dn: dn
    }),
    opts: [
      { k: "fb_finish", t: $t("moment.finishYourself"), d: `${$t("moment.dunkLayupAgility")} ${Math.round(eff("hiz"))}`, e: eff("hiz") + 8 },
      {
        k: "fb_pass",
        t: $t("moment.lastSecondPass"),
        d: `${$t("moment.drawDefenderDish")} ${Math.round(eff("pas"))}`,
        e: eff("pas") + 10
      },
      {
        k: "fb_wait",
        t: $t("moment.slowDownSet"),
        d: `${$t("moment.zeroRiskReset")} · ${statName("sut")} ${Math.round(eff("sut"))}`,
        e: eff("sut") - 4
      }
    ],
    resolve(k, sur) {
      if (k === "fb_finish") {
        const ok = coin(p(eff("hiz") + 8));
        if (ok) M.pts += 2;
        return {
          good: ok,
          w: 1.2,
          st: "hiz",
          txt: ok
            ? $t("common.finishedFastBreak", {
                sur: sur
              })
            : $t("moment.gotBlockedRim", {
                sur: sur,
                dn: dn
              })
        };
      }
      if (k === "fb_pass") {
        const ok = coin(p(eff("pas") + 10));
        if (ok) M.ast++;
        return {
          good: ok,
          w: 1.1,
          st: "pas",
          txt: ok
            ? $t("moment.drewDefenderMade", {
                sur: sur
              })
            : $t("moment.passTooHard")
        };
      }
      // yavaşlamak risksiz değil: set hücumu orta mesafe şutla biter (hızlı hücumun avantajı kaybolur)
      const r = late.autoResolve("mid", sur);
      return { ...r, w: 0.8, txt: `${$t("moment.slowedTempoHalf", { sur: sur })} ${r.txt}` };
    }
  };
}

function screenDefense(dn) {
  return {
    id: "screen",
    ty: "def",
    head: $t("moment.screenComing"),
    desc: $t("moment.bigSetsScreen", {
      dn: dn
    }),
    opts: [
      { k: "sc_switch", t: $t("moment.switch"), d: `${$t("moment.acceptMismatchBig")} ${Math.round(eff("guc"))}`, e: eff("guc") + 4 },
      { k: "sc_over", t: $t("moment.fightScreen"), d: `${$t("moment.stayManAgility")} ${Math.round(eff("hiz"))}`, e: eff("hiz") },
      { k: "sc_help", t: $t("moment.callHelp"), d: `${$t("moment.teamDefenseDefense")} ${Math.round(eff("sav"))}`, e: eff("sav") + 6 }
    ],
    resolve(k, sur) {
      const st = k === "sc_switch" ? "guc" : k === "sc_over" ? "hiz" : "sav",
        bonus = k === "sc_switch" ? 4 : k === "sc_help" ? 6 + (S.rel.takim - 50) / 10 : 0,
        ok = coin(p(eff(st) + bonus));
      if (ok) M.stops++;
      const txt = ok
        ? pick([
            $t("moment.readScreenShot", {
              sur: sur
            }),
            $t("moment.slippedThroughScreen", {
              sur: sur
            }),
            $t("moment.helpDefenseArrived")
          ])
        : pick([
            $t("moment.greatScreenWide", {
              dn: dn
            }),
            $t("moment.gotCaughtScreen", {
              sur: sur
            })
          ]);
      return { good: ok, w: 1, st, txt };
    }
  };
}

function provocation(dn) {
  return {
    id: "provoke",
    ty: "prov",
    head: $t("moment.trashTalk"),
    desc: $t("moment.saysSomethingEar", {
      dn: dn
    }),
    opts: [
      { k: "pv_calm", t: $t("moment.stayCalm"), d: $t("moment.focusPlayGame"), e: 80 },
      { k: "pv_react", t: $t("moment.talkBack"), d: $t("moment.crowdLovesTheres"), e: 45 },
      { k: "pv_ref", t: $t("moment.tellReferee"), d: $t("moment.refereeListensOpponent"), e: 55 }
    ],
    resolve(k, sur) {
      if (k === "pv_calm") {
        if (coin(0.2))
          return {
            good: false,
            w: 0.4,
            st: "sav",
            txt: $t("moment.triedStayCalm", {
              sur: sur
            })
          };
        S.rel.koc += 1;
        return {
          good: true,
          w: 0.4,
          st: "sav",
          txt: $t("moment.ignoredTrashTalk", {
            sur: sur
          })
        };
      }
      if (k === "pv_react") {
        if (coin(0.35)) {
          M.them += 1;
          S.rel.koc -= 2;
          return {
            good: false,
            w: 1,
            st: "sav",
            txt: $t("moment.refereeSawBoth")
          };
        }
        S.rel.taraf += 2;
        return {
          good: true,
          w: 0.6,
          st: "guc",
          txt: $t("moment.gavePerfectComeback", {
            sur: sur,
            dn: dn
          })
        };
      }
      const ok = coin(0.5);
      if (ok) M.us += 1;
      return {
        good: ok,
        w: 0.6,
        st: "pas",
        txt: ok
          ? $t("moment.refereeWarnedHim", {
              dn: dn
            })
          : $t("moment.refereeWavedPlay")
      };
    }
  };
}
