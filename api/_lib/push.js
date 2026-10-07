// api/_lib/push.js
// Envoi des notifications push (comme Facebook / WhatsApp / TikTok).
// Dans /_lib : pas compté comme fonction serverless par Vercel.
//
// NOUVEAU : les messages sont envoyés en mode « données seules » (sans champ
// "notification"). C'est le service worker (sw.js) qui construit l'affichage :
// icône, grande image, boutons « Ouvrir / Plus tard », regroupement par sujet,
// vibration. Plus de doublons, et le même rendu sur tous les téléphones.

const admin = require('firebase-admin');
const { initFirebaseAdmin, safeInternalPath } = require('./security');

const ICON = '/icon-192-v2.png';
const BADGE = '/badge-96.png';

// --- Construction du message ------------------------------------------------

function topicTag(category, url) {
  const slug = String(url || '').replace(/[^a-zA-Z0-9]/g, '').slice(-24) || 'general';
  return ('cn-' + (category || 'activity') + '-' + slug).slice(0, 60);
}

// Retrouve la grande image d'une publication à partir d'un lien /?open=ID
async function resolvePubImage(db, url) {
  try {
    const m = /[?&]open=([A-Za-z0-9_-]{6,40})/.exec(String(url || ''));
    if (!m) return null;
    const snap = await db.collection('publications').doc(m[1]).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    const img = d.imageUrl;
    if (typeof img === 'string' && /^https:\/\//.test(img) && img.length < 500) return img;
  } catch (e) { /* l'image est un bonus : jamais bloquant */ }
  return null;
}

function buildMessage({ tokens, title, body, url, category, kind, badgeCount, image, ttlSec }) {
  const cat = category || 'activity';
  const safeUrl = safeInternalPath(url || '/');
  const ttl = ttlSec || (cat === 'sos' ? 3600 : 86400);
  const raw = {
    title, body,
    url: safeUrl,
    category: cat,
    kind: kind || 'personal',
    tag: topicTag(cat, safeUrl),
    icon: ICON,
    badge: BADGE,
    image: image || '',
    badgeCount: badgeCount ? String(badgeCount) : '',
    ts: String(Date.now())
  };
  const data = {};
  Object.keys(raw).forEach((k) => { if (raw[k] !== '' && raw[k] != null) data[k] = String(raw[k]); });
  return {
    tokens,
    data,
    webpush: { headers: { Urgency: 'high', TTL: String(ttl) } },
    android: { priority: 'high', ttl: ttl * 1000 }
  };
}

function collectTokens(userData) {
  const tokens = [];
  if (userData && Array.isArray(userData.fcmTokens)) tokens.push(...userData.fcmTokens.filter((t) => typeof t === 'string'));
  if (userData && typeof userData.fcmToken === 'string' && !tokens.includes(userData.fcmToken)) tokens.push(userData.fcmToken);
  return tokens;
}

function isDeadTokenError(r) {
  const code = r && r.error && r.error.code;
  return !r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token');
}

// Retire les appareils morts (app désinstallée, permission retirée…)
function pruneDeadTokens(db, uid, tokens, responses, userData) {
  const dead = [];
  responses.forEach((r, idx) => { if (isDeadTokenError(r)) dead.push(tokens[idx]); });
  if (dead.length === 0) return;
  const patch = { fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead) };
  if (userData && userData.fcmToken && dead.includes(userData.fcmToken)) patch.fcmToken = admin.firestore.FieldValue.delete();
  db.collection('users').doc(uid).update(patch).catch(() => {});
}

// --- Envoi à UNE personne (recharge, achat, vente…) -------------------------
// Signature inchangée : sendPushToUser(uid, title, body, url) -> les autres
// fonctions (payment-webhook, shop-purchase, payments-actions) n'ont rien à changer.
async function sendPushToUser(uid, title, body, url, opts) {
  try {
    initFirebaseAdmin();
    const db = admin.firestore();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return { sent: 0, devices: 0 };
    const data = snap.data();
    const tokens = collectTokens(data);
    if (tokens.length === 0) return { sent: 0, devices: 0 };
    const o = opts || {};

    let badgeCount = 0;
    try {
      const unread = await db.collection('notifications').where('uid', '==', uid).where('read', '==', false).get();
      badgeCount = unread.size;
    } catch (e) { /* pas grave */ }

    const category = o.category || (/tab=(wallet|orders|sales)/.test(String(url || '')) ? 'orders' : 'activity');
    const image = o.image || await resolvePubImage(db, url);
    const response = await admin.messaging().sendEachForMulticast(
      buildMessage({ tokens, title, body, url, category, kind: 'personal', badgeCount, image })
    );
    pruneDeadTokens(db, uid, tokens, response.responses, data);
    return { sent: response.successCount || 0, devices: tokens.length };
  } catch (e) {
    console.log('[push] Envoi echoue :', e.message);
    return { sent: 0, devices: 0, error: e.message };
  }
}

// --- Diffusion à TOUS (annonces admin, nouvelles publications, programmés) --
// Plus aucun e-mail : une diffusion ne part que par notification push.
async function sendBroadcastToAllUsers({ title, body, category, url, excludeUid }) {
  initFirebaseAdmin();
  const db = admin.firestore();
  const cat = category || 'content';
  const safeUrl = safeInternalPath(url || '/');

  const usersSnap = await db.collection('users').get();
  const tokenToUid = {};
  usersSnap.forEach((doc) => {
    if (excludeUid && doc.id === excludeUid) return;
    const data = doc.data();
    const prefs = data.notifPrefs || {};
    const categoryAllowed = cat === 'admin' || prefs[cat] !== false;
    if (!categoryAllowed) return;
    if (prefs.push === false && cat !== 'admin') return;
    collectTokens(data).forEach((t) => { tokenToUid[t] = doc.id; });
  });
  const tokens = Object.keys(tokenToUid);
  const image = await resolvePubImage(db, safeUrl);

  let sent = 0, failed = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const response = await admin.messaging().sendEachForMulticast(
      buildMessage({ tokens: batch, title, body, url: safeUrl, category: cat, kind: 'broadcast', image })
    );
    sent += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((r, idx) => {
      if (isDeadTokenError(r)) {
        const badUid = tokenToUid[batch[idx]];
        if (badUid) {
          db.collection('users').doc(badUid).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(batch[idx]),
            fcmToken: admin.firestore.FieldValue.delete()
          }).catch(() => {});
        }
      }
    });
  }

  db.collection('notif_logs').add({
    uid: null, category: cat, channel: 'broadcast',
    success: sent > 0,
    reason: `Diffusion : ${sent} reçue(s), ${failed} échec(s) sur ${tokens.length} appareil(s)`,
    title: title || null,
    createdAt: new Date().toISOString()
  }).catch(() => {});

  // emailFallback gardé à 0 pour ne pas casser les fonctions qui lisent ce champ
  return { sent, failed, emailFallback: 0 };
}

module.exports = { sendPushToUser, sendBroadcastToAllUsers, buildMessage, collectTokens, pruneDeadTokens, resolvePubImage, topicTag };
