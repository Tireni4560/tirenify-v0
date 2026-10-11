// Safeyard service worker (PWA).
//
// - Same-origin static app shell: cache-first.
// - Same-origin HTML navigations: network-first, falling back to the cached app
//   shell so deep links keep working when offline.
// - /api/*: never cached, always network (the breach check and subscription
//   endpoints must always hit the real server).
// - The worker file itself is served with Cache-Control: no-store (see
//   vercel.json headers), so it is never long-cached.

const CACHE = "safeyard-v1";

// Files that become the offline app shell. These literal names match the
// committed, hashed build output (public/). Regenerate if the build output
// changes.
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.png",
  "/og-preview.png",
  "/fonts/sora.woff2",
  "/fonts/manrope.woff2",
  "/assets/index-Dt9yppwb.js",
  "/assets/vendor-react-CiBELqhN.js",
  "/assets/index-DvM5_sRy.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API responses.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req));
    return;
  }

  // Same-origin navigation: network-first, fall back to the cached app shell so
  // deep links keep working when offline.
  if (url.origin === self.location.origin && req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.type === "opaque") return resp;
          const clone = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
          return resp;
        })
        .catch(() =>
          caches.match(req).then((matched) => matched || caches.match("/index.html")),
        ),
    );
    return;
  }

  // Same-origin static assets and cross-origin resources: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp.type === "opaque") return resp;
        const clone = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(req, clone));
        return resp;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
