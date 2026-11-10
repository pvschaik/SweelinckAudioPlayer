// Service worker: lets the player's own files load offline.
// Bump CACHE_VERSION whenever you upload changed files, so phones pick them up.
const CACHE_VERSION = "v1";
const CACHE_NAME = "s-player-" + CACHE_VERSION;

const SHELL = [
  "./S2.html",
  "./S2.css",
  "./S2.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("s-player-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Leave alone: non-GET, other sites (e.g. the demo mp3), and audio Range requests
  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (req.headers.has("range")) return;

  // Network first, so updates show up when online; cached copy when offline
  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit || (req.mode === "navigate" ? caches.match("./S2.html") : undefined)
        )
      )
  );
});
