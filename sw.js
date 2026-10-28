// sw.js — Service Worker de Coeurnoh Universe (v21).
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
    badgeCount: d.badgeCount,
    chatId: d.chatId || ''
  }));
});

const messaging = firebase.messaging();

const ICON = '/icon-192-v2.png';
// Deux petites icônes différentes dans la barre d'état du téléphone : une bulle pour les messages, une cloche pour le reste.
const BADGE_MSG = '/badge-msg-96.png';
const BADGE_NOTIF = '/badge-notif-96.png';

// Textes des boutons de la notification (la langue du téléphone décide).
const REPLY_TXT = {
  fr: { reply: 'Répondre', ph: 'Écrire une réponse…', open: 'Ouvrir', later: 'Plus tard', n: ' nouveaux messages' },
  en: { reply: 'Reply', ph: 'Write a reply…', open: 'Open', later: 'Later', n: ' new messages' },
  es: { reply: 'Responder', ph: 'Escribe una respuesta…', open: 'Abrir', later: 'Más tarde', n: ' mensajes nuevos' },
  it: { reply: 'Rispondi', ph: 'Scrivi una risposta…', open: 'Apri', later: 'Più tardi', n: ' nuovi messaggi' },
  pt: { reply: 'Responder', ph: 'Escreve uma resposta…', open: 'Abrir', later: 'Mais tarde', n: ' novas mensagens' }
};
function txt() {
  let l = 'fr';
  try { l = String((self.navigator && self.navigator.language) || 'fr').slice(0, 2).toLowerCase(); } catch (e) { l = 'fr'; }
  return REPLY_TXT[l] || REPLY_TXT.fr;
}

// Le serveur envoie des messages « données seules » : c'est ICI qu'on décide de l'affichage.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const n = payload.notification || {}; // anciens envois (campagnes promo) : on les gère aussi
  const title = d.title || n.title || 'Coeurnoh Universe';
  const body = d.body || n.body || '';
  const category = d.category || 'activity';
  const url = d.url || '/';
  const tag = d.tag || ('cn-' + category);
  return showRichNotification({ title, body, category, url, tag, image: d.image || '', icon: d.icon || ICON, badgeCount: d.badgeCount, chatId: d.chatId || '' });
});

async function showRichNotification({ title, body, category, url, tag, image, icon, badgeCount, chatId }) {
  const isMsg = category === 'message';
  const T = txt();
  // Regroupement par sujet : si une notification du même sujet est déjà affichée, on la remplace.
  // Messages : une seule notification PAR CONVERSATION qui montre les derniers messages (comme WhatsApp).
  // Autres sujets : une seule ligne « 3 nouvelles notifications ».
  let count = 1, lines = [body];
  try {
    const existing = await self.registration.getNotifications({ tag });
    if (existing.length > 0) {
      const pd = existing[0].data || {};
      count = (pd.count ? pd.count : 1) + 1;
      if (isMsg) lines = (Array.isArray(pd.lines) ? pd.lines : []).concat([body]).slice(-5);
    }
  } catch (e) { /* pas grave */ }

  const urgent = category === 'sos' || category === 'call'; // un appel entrant : un seul bouton « Ouvrir », vibration longue
  const options = {
    body: isMsg ? lines.join('\n') : (count > 1 ? (count + ' nouvelles notifications · ' + body) : body),
    icon: icon || ICON,
    badge: isMsg ? BADGE_MSG : BADGE_NOTIF,
    tag,
    renotify: true, // « tag » est toujours défini ci-dessus : obligatoire avec renotify
    timestamp: Date.now(),
    vibrate: isMsg ? [160, 90, 160] : (category === 'call' ? [600, 250, 600, 250, 600, 250, 600, 250, 600] : (urgent ? [400, 150, 400, 150, 400, 150, 800] : [300, 120, 300, 120, 500])),
    requireInteraction: !isMsg, // les messages se rangent d'eux-mêmes ; le reste reste affiché jusqu'à ce qu'on le touche
    silent: false,
    data: { url, count, category, chatId: chatId || '', lines: isMsg ? lines : undefined },
    actions: urgent
      ? [{ action: 'open', title: T.open }]
      : (isMsg && chatId
        ? [{ action: 'reply', type: 'text', title: T.reply, placeholder: T.ph }, { action: 'open', title: T.open }]
        : [{ action: 'open', title: T.open }, { action: 'later', title: T.later }])
  };
  if (image) options.image = image;

  await self.registration.showNotification(isMsg && count > 1 ? (title + ' · ' + count + T.n) : title, options);

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
// Garanties :
//  1) le lien est toujours un chemin interne de CE site (jamais un autre domaine) ;
//  2) si l'app est déjà ouverte, on lui transmet le lien et on attend sa confirmation ; sans réponse
//     (page gelée par le téléphone, encore en chargement), on la dirige directement vers la bonne adresse ;
//  3) rien ici ne touche à la session de la personne : aucune déconnexion, aucun effacement de stockage.
function internalTarget(raw) {
  try {
    const u = new URL(String(raw || '/'), self.location.origin);
    if (u.origin !== self.location.origin) return '/';
    return u.pathname + u.search + u.hash;
  } catch (e) { return '/'; }
}

function askClientToOpen(client, rel) {
  return new Promise((resolve) => {
    let done = false, channel = null;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { if (channel) channel.port1.close(); } catch (e) { /* ignore */ }
      resolve(ok);
    };
    try {
      channel = new MessageChannel();
      channel.port1.onmessage = () => finish(true);
      client.postMessage({ type: 'cn-open', url: rel }, [channel.port2]);
    } catch (e) { finish(false); return; }
    setTimeout(() => finish(false), 1500);
  });
}

// Réponse tapée directement dans la notification (Android / Chrome) : on la remet à l'application ouverte ;
// si l'application est fermée, on la garde au chaud puis on ouvre la conversation, qui l'envoie dès que la session est prête.
function askClientToReply(client, chatId, text) {
  return new Promise((resolve) => {
    let done = false, channel = null;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { if (channel) channel.port1.close(); } catch (e) { /* ignore */ }
      resolve(ok);
    };
    try {
      channel = new MessageChannel();
      channel.port1.onmessage = (ev) => finish(ev && ev.data === 'ok');
      client.postMessage({ type: 'cn-reply', chatId, text }, [channel.port2]);
    } catch (e) { finish(false); return; }
    setTimeout(() => finish(false), 9000);
  });
}

async function keepReplyForLater(chatId, text) {
  try {
    const cache = await caches.open('cn-pending');
    const key = '/__pending-reply/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await cache.put(key, new Response(JSON.stringify({ chatId, text: String(text).slice(0, 2000), at: Date.now() }), { headers: { 'Content-Type': 'application/json' } }));
    return true;
  } catch (e) { return false; }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'later') return;
  const data = event.notification.data || {};
  let rel = internalTarget(data.url);
  const replyText = event.action === 'reply' && typeof event.reply === 'string' ? event.reply.trim() : '';
  const chatId = /^[A-Za-z0-9_-]{3,300}$/.test(String(data.chatId || '')) ? String(data.chatId) : '';
  // Bouton « Répondre » sans zone de texte (navigateur qui ne la gère pas) : on ouvre la conversation, clavier prêt.
  if (event.action === 'reply' && !replyText && chatId) rel = '/?msg=' + encodeURIComponent(chatId) + '&reply=1';
  const targetUrl = new URL(rel, self.location.origin).href;
  event.waitUntil((async () => {
    let list = [];
    try { list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (e) { list = []; }
    const mine = list.filter((c) => { try { return new URL(c.url).origin === self.location.origin; } catch (e) { return false; } });
    const client = mine.find((c) => c.visibilityState === 'visible') || mine[0];

    if (replyText && chatId) {
      // 1) L'application est ouverte : elle envoie la réponse tout de suite, sans rien afficher de plus.
      if (client && await askClientToReply(client, chatId, replyText)) return;
      // 2) Sinon : on garde la réponse, puis on ouvre la conversation (elle part dès que la session est prête).
      await keepReplyForLater(chatId, replyText);
      const go = new URL('/?msg=' + encodeURIComponent(chatId) + '&sendreply=1', self.location.origin);
      if (client) {
        try { if ('focus' in client) await client.focus(); } catch (e) { /* ignore */ }
        if (await askClientToOpen(client, go.pathname + go.search)) return;
        try { if ('navigate' in client) { await client.navigate(go.href); return; } } catch (e) { /* ignore */ }
      }
      if (self.clients.openWindow) { try { await self.clients.openWindow(go.href); } catch (e) { /* ignore */ } }
      return;
    }

    if (client) {
      // L'app est déjà ouverte : on la ramène au premier plan SANS la recharger.
      try { if ('focus' in client) await client.focus(); } catch (e) { /* certains navigateurs refusent : on continue */ }
      if (await askClientToOpen(client, rel)) return;
      try { if ('navigate' in client) { await client.navigate(targetUrl); return; } } catch (e) { /* page non contrôlée : on ouvre une fenêtre */ }
    }
    if (self.clients.openWindow) {
      try { await self.clients.openWindow(targetUrl); } catch (e) { /* ignore */ }
    }
  })());
});

const CACHE_NAME = 'coeurnohboost-v21';
const APP_SHELL = [
  '/',
  '/index.html',
  '/legal.html',
  '/icon-192-v2.png',
  '/icon-512-v2.png',
  '/cn-inter-400.woff2',
  '/cn-inter-600.woff2',
  '/cn-display-700.woff2'
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== 'cn-pending').map((k) => caches.delete(k)))
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
