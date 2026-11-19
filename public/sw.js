/*
 * Bay Flood Watch service worker.
 *
 * Goals, in order:
 * 1. Never serve stale data when the network works (network-first everywhere).
 * 2. When the network drops during a storm, show the last data we had instead of nothing.
 * 3. If the app shell itself can't load, show a branded offline page.
 *
 * Bump VERSION to roll out changes; old caches are deleted on activate.
 */
const VERSION = "v1";
const SHELL_CACHE = `bfw-shell-${VERSION}`;
const DATA_CACHE = `bfw-data-${VERSION}`;
const SHELL_ASSETS = ["/offline.html", "/icons/icon-192.png", "/brand/avatar.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Network-first; on failure, fall back to the cached copy marked so the UI can say it's old. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (!cached) throw err;
    const headers = new Headers(cached.headers);
    headers.set("X-BFW-Offline", "1");
    return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // map tiles, camera images: let the browser handle them

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  }
});
