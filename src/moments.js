import { t as $t } from "./i18n/index.js";
/* ================= ÖZEL MAÇ ANLARI =================
   Standart kritik anların (şut, penetrasyon, pas, blok...) yanında çeşitlilik için karar anları.
   Bunların çoğu mini oyunsuz anında çözülür: sonucu seçimin ve niteliklerin belirler.
   - 2'ye 1 hızlı hücum: bitir mi, pas mı?
   - Perde savunması: değiş, perdenin üstünden geç, yardım iste
   - Tahrik: rakip sataşıyor; sakin kal ya da karşılık ver (teknik faul riski)
   - Son hücum: skor yakınken son saniyeler; standart seçenekler özel başlıkla gelir */
import { pick } from "./data.js";
import { S, eff } from "./core.js";
import { autoSuccess } from "./logic/rules.js";
import { M } from "./match.js";

const p = (e, base = 0.5) => autoSuccess(e, base);
const coin = x => Math.random() < x;

/** Bu an özel bir an mı? Değilse null döner. */
export function pickSpecial(us, clutch, diff, dn) {
  // son hücum: maçın son anları, 3 sayı ya da daha az geride/eşit, top bizde
  if (us && clutch && diff <= 0 && diff >= -3)
    return {
      head:
        diff === 0
          ? $t("moments.1")
          : $t("moments.2", {
              v: -diff
            }),
      desc: $t("moments.3", {
        dn: dn
      }),
      // standart anahtarlar kullanılır: şut ve penetrasyon mini oyunla, pas otomatik
      keys: ["pull", "catch", "drive", "kick", "step", "mid"]
    };
  if (clutch) return null;
  const r = Math.random();
  if (us && r < 0.12) return fastBreak(dn);
  if (!us && r < 0.14) return screenDefense(dn);
  if (r < 0.05) return provocation(dn);
  return null;
}

function fastBreak(dn) {
  return {
    ty: "off",
    head: $t("moments.4"),
    desc: $t("moments.5", {
      dn: dn
    }),
    opts: [
      { k: "fb_finish", t: $t("moments.6"), d: `${$t("moments.7")} ${Math.round(eff("hiz"))}`, e: eff("hiz") + 8 },
      {
        k: "fb_pass",
        t: $t("moments.8"),
        d: `${$t("moments.9")} ${Math.round(eff("pas"))}`,
        e: eff("pas") + 10
      },
      { k: "fb_wait", t: $t("moments.10"), d: $t("moments.11"), e: 75 }
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
            ? $t("match.97", {
                sur: sur
              })
            : $t("moments.12", {
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
            ? $t("moments.13", {
                sur: sur
              })
            : $t("moments.14")
        };
      }
      return {
        good: true,
        w: 0.4,
        st: "pas",
        txt: $t("moments.15", {
          sur: sur
        })
      };
    }
  };
}

function screenDefense(dn) {
  return {
    ty: "def",
    head: $t("moments.16"),
    desc: $t("moments.17", {
      dn: dn
    }),
    opts: [
      { k: "sc_switch", t: $t("moments.18"), d: `${$t("moments.19")} ${Math.round(eff("guc"))}`, e: eff("guc") + 4 },
      { k: "sc_over", t: $t("moments.20"), d: `${$t("moments.21")} ${Math.round(eff("hiz"))}`, e: eff("hiz") },
      { k: "sc_help", t: $t("moments.22"), d: `${$t("moments.23")} ${Math.round(eff("sav"))}`, e: eff("sav") + 6 }
    ],
    resolve(k, sur) {
      const st = k === "sc_switch" ? "guc" : k === "sc_over" ? "hiz" : "sav",
        bonus = k === "sc_switch" ? 4 : k === "sc_help" ? 6 + (S.rel.takim - 50) / 10 : 0,
        ok = coin(p(eff(st) + bonus));
      if (ok) M.stops++;
      const txt = ok
        ? pick([
            $t("moments.24", {
              sur: sur
            }),
            $t("moments.25", {
              sur: sur
            }),
            $t("moments.26")
          ])
        : pick([
            $t("moments.27", {
              dn: dn
            }),
            $t("moments.28", {
              sur: sur
            })
          ]);
      return { good: ok, w: 1, st, txt };
    }
  };
}

function provocation(dn) {
  return {
    ty: "prov",
    head: $t("moments.29"),
    desc: $t("moments.30", {
      dn: dn
    }),
    opts: [
      { k: "pv_calm", t: $t("moments.31"), d: $t("moments.32"), e: 80 },
      { k: "pv_react", t: $t("moments.33"), d: $t("moments.34"), e: 45 },
      { k: "pv_ref", t: $t("moments.35"), d: $t("moments.36"), e: 55 }
    ],
    resolve(k, sur) {
      if (k === "pv_calm") {
        S.rel.koc += 1;
        return {
          good: true,
          w: 0.5,
          st: "sav",
          txt: $t("moments.37", {
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
            txt: $t("moments.38")
          };
        }
        S.rel.taraf += 2;
        return {
          good: true,
          w: 0.6,
          st: "guc",
          txt: $t("moments.39", {
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
          ? $t("moments.40", {
              dn: dn
            })
          : $t("moments.41")
      };
    }
  };
}
