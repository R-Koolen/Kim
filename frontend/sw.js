// Service worker for "Waar is Kim?" — enables install/A2HS + offline shell.
// Strategy: network-first for everything (so a redeploy is picked up the moment
// you're online), falling back to cache when offline. The /api/* routes
// (state + SSE stream) are never intercepted — they always hit the network.
const CACHE = "kim-v2";
// Only the stable shell is precached. The JS/CSS bundles are content-hashed
// (app-<hash>.js), so their exact names aren't known here — the network-first
// fetch handler caches them at runtime instead.
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Never touch the API or the SSE stream — let the network handle them.
  if (new URL(req.url).pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/index.html")))
  );
});
