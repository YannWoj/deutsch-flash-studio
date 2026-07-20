"use strict";

// Increment this on every deploy that touches index.html, app.js, or style.css.
const CACHE_VERSION = "v20";
const CACHE_NAME = "dfs-cache-" + CACHE_VERSION;

// App shell files must stay coherent with each other.
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./grammar-data.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isAppShellRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return request.mode === "navigate" ||
    /\.(?:html|js|css)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // App shell: network first, cache fallback.
  if (isAppShellRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // Other assets: cache first.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
