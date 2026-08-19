// sw.js — Service Worker minimal pour CoeurnohBoost.
// Rend le site installable (PWA / Google Play via TWA) et garde une copie
// de secours des pages visitees en cas de coupure reseau.
// Ne touche jamais aux requetes vers Firebase/Firestore (autre domaine).

const CACHE_NAME = 'coeurnohboost-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/catalog-data.js',
  '/translations.js',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.log('[sw] Pre-cache impossible :', err.message))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // On ne gere que nos propres fichiers (meme origine), en GET.
  // Les appels vers Firebase/Firestore/API externes passent directement,
  // sans interference du service worker.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
