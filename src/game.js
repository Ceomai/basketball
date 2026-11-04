// Oyun modülleri. Modüller eski <script> sırasıyla yüklenir (bağımlılıklar yalnızca önceki modüllere doğru),
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
import * as legacy from "./legacy.js";
import * as moments from "./moments.js";
import * as coach from "./coach.js";
import * as missions from "./missions.js";
import * as notify from "./notify.js";
import * as errors from "./errors.js";
import * as state from "./state.js";
import * as cloud from "./cloud.js";
import * as card from "./card.js";
import * as league from "./league.js";
import * as goals from "./goals.js";
import * as unlock from "./unlock.js";
import * as chars from "./chars.js";
import * as traits from "./traits.js";
import * as album from "./album.js";
import * as dilemmas from "./dilemmas.js";
import * as modes from "./modes.js";
import * as remote from "./remote.js";
import * as analytics from "./analytics.js";
import * as adplaces from "./adplaces.js";
import * as legends from "./legends.js";
import * as daily from "./daily.js";
import * as hooks from "./hooks.js";
import * as peaks from "./peaks.js";
import * as progress from "./progress.js";
import * as lifestyle from "./lifestyle.js";
import * as social from "./social.js";
import * as style from "./style.js";
import * as agent from "./agent.js";
import * as plays from "./plays.js";
import * as comps from "./comps.js";
import * as natcup from "./natcup.js";

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
  native,
  legacy,
  moments,
  coach,
  missions,
  notify,
  errors,
  state,
  cloud,
  card,
  league,
  goals,
  unlock,
  chars,
  traits,
  album,
  dilemmas,
  modes,
  remote,
  analytics,
  adplaces,
  legends,
  daily,
  hooks,
  peaks,
  progress,
  lifestyle,
  social,
  style,
  agent,
  plays,
  comps,
  natcup
];
for (const ns of MODULES)
  for (const k of Object.keys(ns))
    if (!Object.prototype.hasOwnProperty.call(late, k)) Object.defineProperty(late, k, { get: () => ns[k], enumerable: true });

// Testler ve hata ayıklama için oyunun tüm dışa aktarımlarına erişim: window.Game.S, Game.openLoc(...)
window.Game = late;
