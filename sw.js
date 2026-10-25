// sw.js — Service Worker de Coeurnoh Universe (v15).
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

// Appareils « Web Push direct » (secours quand l'enregistrement Firebase est bloqué) :
// le serveur envoie { from: 'cn-webpush', data: {...} }. Ce gestionnaire est enregistré AVANT
// celui de Firebase et l'empêche de traiter ces messages (pas de doublon) ; tous les autres
// messages restent gérés par Firebase comme avant.
self.addEventListener('push', (event) => {
  let p = null;
  try { p = event.data ? event.data.json() : null; } catch (e) { p = null; }
  if (!p || p.from !== 'cn-webpush' || !p.data) return;
  event.stopImmediatePropagation();
  const d = p.data;
  const category = d.category || 'activity';
  event.waitUntil(showRichNotification({
    title: d.title || 'Coeurnoh Universe',
    body: d.body || '',
    category,
    url: d.url || '/',
    tag: d.tag || ('cn-' + category),
    image: d.image || '',
    icon: d.icon || ICON,
    badgeCount: d.badgeCount
  }));
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

  const urgent = category === 'sos' || category === 'call'; // un appel entrant : un seul bouton « Ouvrir », vibration longue
  const options = {
    body: count > 1 ? (count + ' nouvelles notifications · ' + body) : body,
    icon: icon || ICON,
    badge: BADGE,
    tag,
    renotify: true, // « tag » est toujours défini ci-dessus : obligatoire avec renotify
    timestamp: Date.now(),
    vibrate: category === 'call' ? [600, 250, 600, 250, 600, 250, 600, 250, 600] : (urgent ? [400, 150, 400, 150, 400, 150, 800] : [300, 120, 300, 120, 500]),
    requireInteraction: true, // reste affichée (écran verrouillé) jusqu'à ce qu'on la touche
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

const CACHE_NAME = 'coeurnohboost-v18';
const APP_SHELL = [
  '/',
  '/index.html',
  '/legal.html',
  '/icon-192-v2.png',
  '/icon-512-v2.png'
];

// Seules ces pages publiques sont gardées hors-ligne. Jamais les pages privées ou propres à
// une personne (factures /p/facture/…, sites /s/…, aperçus) : elles ne sont pas stockées dans le cache.
const CACHEABLE_PAGES = /^\/(?:|index\.html|legal\.html|about|terms|privacy|refund|contact|aide|services(?:\/[a-z0-9-]+)?)$/;

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
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/')) {
    return;
  }
  // Vidéos d'ambiance et requêtes partielles (Range) : le navigateur les gère seul.
  if (event.request.headers.has('range') || /\.(mp4|webm)$/i.test(url.pathname)) {
    return;
  }

  // Pages (HTML) : réseau d'abord, copie hors-ligne en secours.
  // Fichiers (JS, CSS, images) : on sert la copie gardée tout de suite (ouverture instantanée)
  // et on la met à jour en arrière-plan pour la prochaine ouverture.
  const isPage = event.request.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.pathname === '/';
  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // On ne garde que les réponses réussies des pages publiques listées (jamais une erreur 404/500).
          if (response && response.ok && CACHEABLE_PAGES.test(url.pathname)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname === '/' ? '/' : url.origin + url.pathname, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(url.origin + url.pathname).then((cached) => cached || caches.match(event.request)).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const refresh = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
