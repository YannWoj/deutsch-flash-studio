"use strict";

/* =========================================================
   Service Worker — Deutsch Flash Studio

   Stratégie : "network first, cache fallback".
   - En ligne : on sert la version fraîche du réseau et on
     met à jour le cache au passage → tes mises à jour de
     code arrivent toujours.
   - Hors ligne : on sert la copie en cache → l'app marche
     sans connexion.

   IMPORTANT : ce fichier ne touche PAS aux données.
   Les cartes et images restent dans IndexedDB, le service
   worker ne met en cache que les fichiers de l'app
   (HTML, CSS, JS, icônes).
   ========================================================= */

const CACHE_NAME = "dfs-cache-v2";

// Fichiers mis en cache dès l'installation
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./grammar-data.js",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// Installation : on pré-remplit le cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

// Activation : on supprime les vieux caches si le nom a changé
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Interception des requêtes : réseau d'abord, cache en secours
self.addEventListener("fetch", (event) => {
  // On ne gère que les GET de notre propre site
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Réponse fraîche : on met à jour le cache pour le mode hors ligne
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        // Pas de réseau : on sert la copie en cache
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
