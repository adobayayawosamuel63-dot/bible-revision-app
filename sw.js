// =====================================================================
//  sw.js — Service Worker minimal (PWA GitHub Pages)
//  Stratégie : network-first avec repli cache pour la coquille ;
//  les requêtes Firebase/API (cross-origin) ne sont jamais interceptées.
// =====================================================================

const CACHE = 'versets-memoire-v2';
const COQUILLE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(
        cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Laisser passer les requêtes cross-origin (Firebase, getBible, Tailwind CDN)
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  // Network-first avec repli cache (même origine uniquement)
  e.respondWith(
    fetch(e.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie));
        return reponse;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))),
  );
});
