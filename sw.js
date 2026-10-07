// sw.js — Service Worker de Coeurnoh Universe (v12).
// 1) Rend le site installable (PWA / Google Play via TWA) + copie de secours hors-ligne.
// 2) Affiche les notifications push MÊME QUAND L'APP EST FERMÉE, comme Facebook /
//    WhatsApp / TikTok : icône, grande image, boutons « Ouvrir / Plus tard »,
//    regroupement par sujet, vibration, pastille sur l'icône.
// Ne touche jamais aux requêtes vers Firebase/Firestore (autre domaine).

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

const ICON = '/icon-192-v2.png';
const BADGE = '/badge-96.png';

// Le serveur envoie des messages « données seules » : c'est ICI qu'on décide de l'affichage.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const n = payload.notification || {}; // anciens envois (campagnes promo) : on les gère aussi
  const title = d.title || n.title || 'Coeurnoh Universe';
  const body = d.body || n.body || '';
  const category = d.category || 'activity';
  const url = d.url || '/';
  const tag = d.tag || ('cn-' + category);
  return showRichNotification({ title, body, category, url, tag, image: d.image || '', icon: d.icon || ICON, badgeCount: d.badgeCount });
});

async function showRichNotification({ title, body, category, url, tag, image, icon, badgeCount }) {
  // Regroupement par sujet : si une notification du même sujet est déjà affichée,
  // on la remplace par une seule ligne « 3 nouvelles notifications » (comme WhatsApp).
  let count = 1;
  try {
    const existing = await self.registration.getNotifications({ tag });
    if (existing.length > 0) {
      const prev = existing[0].data && existing[0].data.count ? existing[0].data.count : 1;
      count = prev + 1;
    }
  } catch (e) { /* pas grave */ }

  const urgent = category === 'sos';
  const options = {
    body: count > 1 ? (count + ' nouvelles notifications · ' + body) : body,
    icon: icon || ICON,
    badge: BADGE,
    tag,
    renotify: true, // « tag » est toujours défini ci-dessus : obligatoire avec renotify
    timestamp: Date.now(),
    vibrate: urgent ? [400, 150, 400, 150, 400, 150, 800] : [180, 80, 180],
    requireInteraction: urgent,
    silent: false,
    data: { url, count, category },
    actions: urgent
      ? [{ action: 'open', title: 'Ouvrir' }]
      : [{ action: 'open', title: 'Ouvrir' }, { action: 'later', title: 'Plus tard' }]
  };
  if (image) options.image = image;

  await self.registration.showNotification(title, options);

  // Pastille sur l'icône de l'app (écran d'accueil), comme WhatsApp/Facebook.
  try {
    const bc = badgeCount ? parseInt(badgeCount, 10) : NaN;
    if ('setAppBadge' in navigator) {
      if (!isNaN(bc) && bc > 0) await navigator.setAppBadge(bc);
      else await navigator.setAppBadge();
    }
  } catch (e) { /* Badging API non supportée */ }
}

// Clic sur la notification (ou sur « Ouvrir ») ; « Plus tard » la range simplement :
// elle reste disponible dans le centre de notifications de l'app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'later') return;
  const relativeUrl = (event.notification.data && event.notification.data.url) || '/';
  const targetUrl = new URL(relativeUrl, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // L'app est déjà ouverte : on lui dit où aller, SANS recharger la page.
          client.postMessage({ type: 'cn-open', url: relativeUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

const CACHE_NAME = 'coeurnohboost-v12';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/catalog-data.js',
  '/translations.js',
  '/icon-192-v2.png',
  '/icon-512-v2.png'
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
  // Les reponses /api/* ne sont jamais mises en cache ni servies depuis le cache
  // (une coupure reseau ne doit pas renvoyer la reponse d'un autre utilisateur).
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  // Vidéos d'ambiance et requêtes partielles (Range) : le navigateur les gère seul.
  if (event.request.headers.has('range') || /\.(mp4|webm)$/i.test(url.pathname)) {
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
