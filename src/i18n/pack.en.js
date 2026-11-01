// İngilizce dil paketi: arayüz sözlüğü + olay çevirileri. Ayrı bir dosya olarak derlenir ve yalnızca İngilizce seçiliyse indirilir.
import enManual from "./en.js";
import enAuto from "./en.auto.js";
import EN_BASE from "../content/events.en.js";
import EN_MORE from "../content/events.more.en.js";
export const dict = { ...enAuto, ...enManual };
export const events = [...EN_BASE, ...EN_MORE];
