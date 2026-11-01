// Giriş noktası. Modüller eski <script> sırasıyla yüklenir (bağımlılıklar yalnızca önceki modüllere doğru),
// ardından "late" kaydı doldurulur ve oyun "load" olayında başlar (core.js).
import { late } from "./late.js";
import * as data from "./data.js";
import * as clubs from "./clubs.js";
import * as art from "./art.js";
import * as map from "./map.js";
import * as games from "./games.js";
import * as core from "./core.js";
import * as save from "./save.js";
import * as places from "./places.js";
import * as casino from "./casino.js";
import * as shops from "./shops.js";
import * as arcade from "./arcade.js";
import * as match from "./match.js";
import * as engine from "./engine.js";
import * as extras from "./extras.js";
import * as systems from "./systems.js";
import * as story from "./story.js";
import * as ads from "./ads.js";
import * as audio from "./audio.js";
import * as music from "./music.js";
import * as events from "./content/events.js";
import * as i18n from "./i18n/index.js";
import * as telemetry from "./telemetry.js";
import * as native from "./native.js";

const MODULES = [
  data,
  clubs,
  art,
  map,
  games,
  core,
  save,
  places,
  casino,
  shops,
  arcade,
  match,
  engine,
  extras,
  systems,
  story,
  ads,
  audio,
  music,
  events,
  i18n,
  telemetry,
  native
];
for (const ns of MODULES)
  for (const k of Object.keys(ns))
    if (!Object.prototype.hasOwnProperty.call(late, k)) Object.defineProperty(late, k, { get: () => ns[k], enumerable: true });

// Testler ve hata ayıklama için oyunun tüm dışa aktarımlarına erişim: window.Game.S, Game.openLoc(...)
window.Game = late;
