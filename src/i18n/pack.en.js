// İngilizce dil paketi: arayüz sözlüğü + olay çevirileri. Ayrı bir dosya olarak derlenir ve yalnızca İngilizce seçiliyse indirilir.
import enManual from "./en.js";
import enAuto from "./en.auto.js";
import EN_BASE from "../content/events.en.js";
import EN_MORE from "../content/events.more.en.js";
import EN_HARD from "../content/events.hard.en.js";
import EN_CAREER from "../content/events.career.en.js";
export const dict = { ...enAuto, ...enManual };
export const events = [...EN_BASE, ...EN_MORE, ...EN_HARD, ...EN_CAREER];
