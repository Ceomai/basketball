// Pota Kariyeri service worker: oyunu önbelleğe alır, internetsiz açılmasını sağlar.
// Yeni sürüm yayınlarken VERSION değerini artır; eski önbellek silinir.
const VERSION = "pota-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "data.js", "clubs.js", "art.js", "map.js", "games.js", "core.js", "save.js", "places.js", "casino.js", "shops.js", "arcade.js",
  "match.js", "engine.js", "extras.js", "systems.js", "story.js", "audio.js", "music.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Önce ağ, olmazsa önbellek: güncellemeler hemen gelir, internet yoksa oyun yine açılır.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
