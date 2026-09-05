// sw.js — Service Worker minimal pour CoeurnohBoost.
// Rend le site installable (PWA / Google Play via TWA) et garde une copie
// de secours des pages visitees en cas de coupure reseau.
// Ne touche jamais aux requetes vers Firebase/Firestore (autre domaine).
// Gere aussi la reception des notifications push MEME QUAND L'APP EST FERMEE.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAK9j8lmKlxp267bfwKegKgW54fo_jrS9E",
  authDomain: "coeurnohboost.firebaseapp.com",
  projectId: "coeurnohboost",
  storageBucket: "coeurnohboost.firebasestorage.app",
  messagingSenderId: "295783149587",
  appId: "1:295783149587:web:13aec67a2ae0109eaa4fe6"
});

const messaging = firebase.messaging();

// Notification recue alors que l'appli/l'onglet est FERME : on l'affiche
// nous-memes, avec vibration et son (comportement natif du telephone), en
// PRIORITE HAUTE pour qu'elle descende en banniere en haut de l'ecran meme
// si le telephone est sur une autre appli (comme WhatsApp).
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'CoeurnohBoost';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: (payload.data && payload.data.tag) || undefined,
    renotify: true,
    requireInteraction: false,
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);

  // Pastille sur l'icone de l'app (ecran d'accueil), comme WhatsApp/Facebook.
  // Si le serveur a calcule un nombre precis, on l'affiche ; sinon on met
  // juste un point pour signaler "il y a du nouveau".
  try {
    const count = payload.data && payload.data.badgeCount ? parseInt(payload.data.badgeCount, 10) : NaN;
    if ('setAppBadge' in navigator) {
      if (!isNaN(count) && count > 0) {
        navigator.setAppBadge(count);
      } else {
        navigator.setAppBadge();
      }
    }
  } catch (e) { /* Badging API non supportee sur ce navigateur/telephone */ }
});

// Au clic sur la notification, on ouvre (ou on remet au premier plan) l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const relativeUrl = (event.notification.data && event.notification.data.url) || '/';
  const targetUrl = new URL(relativeUrl, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

const CACHE_NAME = 'coeurnohboost-v2';
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
