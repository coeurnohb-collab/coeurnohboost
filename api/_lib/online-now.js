// api/_lib/online-now.js
// « Qui est en ligne ? » — compteur et liste, calculés par le SERVEUR à partir de la collection « presence ».
//
// Comment ça marche : chaque téléphone ouvert (application visible) écrit un battement « lastActiveAt » toutes les 2 minutes
// dans presence/{uid}. Une personne est « en ligne » si son dernier battement date de moins de 5 minutes.
// Pourquoi côté serveur : le serveur lit sans dépendre des règles Firestore, compte avec une requête d'AGRÉGATION
// (1 lecture facturée par 1 000 personnes comptées, au lieu d'une par personne) et garde le résultat 20 secondes en mémoire :
// même avec beaucoup de monde, le coût de lecture reste minuscule.
// Confidentialité : le public (personnes connectées) ne reçoit que des NOMBRES. La liste nominative n'est donnée qu'à l'admin.
// Limite honnête : seules les personnes connectées à un compte sont comptées (un visiteur sans compte n'écrit rien).
'use strict';

const WINDOW_MS = 5 * 60 * 1000; // « en ligne » = battement de moins de 5 minutes
const CACHE_MS = 20 * 1000;
const MAX_LIST = 100;
let cache = { at: 0, val: null };

const isoAgo = (now, ms) => new Date(now - ms).toISOString();

async function countSince(db, iso) {
  const q = db.collection('presence').where('lastActiveAt', '>', iso);
  if (typeof q.count === 'function') {
    const s = await q.count().get();
    return Number(s.data().count) || 0;
  }
  const s = await q.get(); // ancienne bibliothèque : on lit (moins économique mais correct)
  return s.size || (s.docs ? s.docs.length : 0);
}

// Nombres seulement (sans nom) : en ligne maintenant, dans la dernière heure, dans les dernières 24 h.
async function onlineCounts({ db, now = Date.now(), fresh = false }) {
  if (!fresh && cache.val && now - cache.at >= 0 && now - cache.at < CACHE_MS) return cache.val;
  const [online, lastHour, last24h] = await Promise.all([
    countSince(db, isoAgo(now, WINDOW_MS)),
    countSince(db, isoAgo(now, 3600000)),
    countSince(db, isoAgo(now, 86400000))
  ]);
  const val = { online, lastHour, last24h, windowMin: WINDOW_MS / 60000, at: new Date(now).toISOString() };
  cache = { at: now, val };
  return val;
}

// Liste nominative (ADMIN uniquement) : les plus récemment actifs d'abord.
async function onlineUsers({ db, now = Date.now(), limit = MAX_LIST }) {
  const snap = await db.collection('presence')
    .where('lastActiveAt', '>', isoAgo(now, WINDOW_MS))
    .orderBy('lastActiveAt', 'desc')
    .limit(Math.min(MAX_LIST, Math.max(1, limit))).get();
  const docs = snap.docs || [];
  const users = await Promise.all(docs.map((d) => db.collection('users').doc(d.id).get().catch(() => null)));
  return docs.map((d, i) => {
    const u = users[i] && users[i].exists ? (users[i].data() || {}) : {};
    return {
      uid: d.id,
      name: String(u.name || u.username || '').slice(0, 80),
      email: String(u.email || '').slice(0, 120),
      country: u.country || null,
      lastActiveAt: (d.data() || {}).lastActiveAt || null
    };
  });
}

function _resetCache() { cache = { at: 0, val: null }; }

module.exports = { onlineCounts, onlineUsers, WINDOW_MS, CACHE_MS, _resetCache };
