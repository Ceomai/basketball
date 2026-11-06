/* ================= KARİYER MODLARI =================
   Karakter oluşturma ekranında seçilir (oğul kariyeri babanın modunu sürdürür):
   - Normal: çift devreli lig (14 maç).
   - Hızlı kariyer: tek devreli lig (7 maç); kısa oturumlar için. Antrenman kazancı ve haftalık ücret iki katına yakın,
     miras puanında istatistik ve galibiyet payı iki kat, ödüller için gereken maç sayısı yarıya iner.
   - Efsane modu: daha zor (teklifler daha seçici, antrenman %12 yavaş, sakatlık riski %30 fazla); miras puanı %25 fazla
     ve Şöhretler Müzesi'nde "Efsane modu" damgası. */
import { t as $t } from "./i18n/index.js";
import { S } from "./core.js";
import { late } from "./late.js";

export const MODES = ["normal", "hizli", "efsane"];
export const mode = () => (S && MODES.includes(S.mode) ? S.mode : "normal");
export const isQuick = () => mode() === "hizli";
export const isLegend = () => mode() === "efsane";
/** Antrenman kazancı çarpanı */
export const modeTrainMul = () => (isQuick() ? 2.1 : isLegend() ? 0.88 : 1);
/** Maç içi karar anlarından nitelik kazancı çarpanı (hızlı: maç sayısı yarı) */
export const modePlayMul = () => (isQuick() ? 2 : 1);
/** Haftalık ücret çarpanı */
export const modeWageMul = () => (isQuick() ? 1.9 : 1) * (late.diffMoneyMul ? late.diffMoneyMul() : 1); // özel zorluk (src/bonds.js)
/** Sakatlık riski çarpanı */
export const modeInjuryMul = () => (isLegend() ? 1.3 : 1) * (late.diffInjMul ? late.diffInjMul() : 1);
/** Teklif potansiyeline eklenecek değer (efsane: daha seçici kulüpler) */
export const modePotential = () => (isLegend() ? -3 : 0);
/** Ödüller için maç sayısı çarpanı */
export const modeGamesMul = () => (isQuick() ? 2 : 1);
/** Miras: istatistik ve galibiyet payı çarpanı, toplam çarpanı */
export const modeLegacy = () => ({ stat: isQuick() ? 2 : 1, total: isLegend() ? 1.25 : 1 });
const KEYS = {
  normal: ["mode.normal", "mode.normalD"],
  hizli: ["mode.hizli", "mode.hizliD"],
  efsane: ["mode.efsane", "mode.efsaneD"]
};
export const modeName = m => $t(KEYS[m || mode()][0]);
/** Oluşturma ekranı seçicisi (F.mode) */
export function modePickerHTML(cur) {
  return `<div><div class="eyebrow" style="margin-bottom:6px">${$t("mode.title")}</div><div class="opts" id="mode">${MODES.map(m => `<button class="opt ${cur === m ? "on" : ""}" data-v="${m}">${$t(KEYS[m][0])}</button>`).join("")}</div><p class="small muted" style="margin-top:6px">${$t(KEYS[cur][1])}</p></div>`;
}
