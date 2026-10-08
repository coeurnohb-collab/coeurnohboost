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


// --- Appareils « Web Push direct » (secours quand l'enregistrement Firebase est bloqué) ----
// Certains téléphones/réseaux bloquent le service d'enregistrement Firebase (« Failed to
// fetch »). Ces appareils s'abonnent alors directement au service de notifications du
// navigateur, et leur abonnement est rangé dans la même liste fcmTokens sous la forme
// « wp1:<abonnement encodé> ». Le serveur les reconnaît et les alerte lui-même.
const WP_PREFIX = 'wp1:';
const WEBPUSH_PUBLIC_KEY = 'BIQpKN1qPHEzJnDizdWaIRURPga7AHTAprmem9PYHMymy0V2TD4vu0XdGo1O0fEwrWz2z1SDXC6OTqt2BKVRwlc';
let _webpush;

function isWpToken(t) { return typeof t === 'string' && t.indexOf(WP_PREFIX) === 0; }

function getWebPush() {
  if (_webpush !== undefined) return _webpush;
  _webpush = null;
  const priv = process.env.WEBPUSH_PRIVATE_KEY;
  if (!priv) { console.log('[push] WEBPUSH_PRIVATE_KEY absente : appareils Web Push ignorés'); return _webpush; }
  try {
    const wp = require('web-push');
    wp.setVapidDetails(process.env.WEBPUSH_SUBJECT || 'https://coeurnohboost.vercel.app', WEBPUSH_PUBLIC_KEY, priv);
    _webpush = wp;
  } catch (e) { console.log('[push] web-push indisponible :', e.message); }
  return _webpush;
}

function decodeWpToken(token) {
  try {
    const sub = JSON.parse(Buffer.from(token.slice(WP_PREFIX.length), 'base64url').toString('utf8'));
    return sub && typeof sub.endpoint === 'string' && sub.keys ? sub : null;
  } catch (e) { return null; }
}

async function sendOneWebPush(wp, token, payload, ttl, urgency) {
  const sub = decodeWpToken(token);
  if (!sub) return { success: false, error: { code: 'messaging/invalid-registration-token' } };
  try {
    await wp.sendNotification(sub, payload, { TTL: ttl, urgency, timeout: 8000 });
    return { success: true };
  } catch (e) {
    const gone = e && (e.statusCode === 404 || e.statusCode === 410);
    return { success: false, error: { code: gone ? 'messaging/registration-token-not-registered' : 'webpush/' + ((e && e.statusCode) || 'erreur') } };
  }
}

// Remplace admin.messaging().sendEachForMulticast : même forme de réponse
// ({ successCount, failureCount, responses } dans l'ordre des jetons), mais envoie
// aussi aux appareils Web Push directs.
async function sendMulticast(msg) {
  const tokens = msg.tokens || [];
  const responses = new Array(tokens.length);
  const fcmIdx = [], wpIdx = [];
  tokens.forEach((t, i) => { (isWpToken(t) ? wpIdx : fcmIdx).push(i); });

  if (fcmIdx.length) {
    try {
      const r = await admin.messaging().sendEachForMulticast(Object.assign({}, msg, { tokens: fcmIdx.map((i) => tokens[i]) }));
      r.responses.forEach((x, k) => { responses[fcmIdx[k]] = x; });
    } catch (e) {
      if (!wpIdx.length) throw e; // comportement d'avant quand il n'y a que des appareils Firebase
      fcmIdx.forEach((i) => { responses[i] = { success: false, error: { code: 'messaging/internal-error' } }; });
    }
  }
  if (wpIdx.length) {
    const wp = getWebPush();
    if (!wp) {
      wpIdx.forEach((i) => { responses[i] = { success: false, error: { code: 'webpush/non-configure' } }; });
    } else {
      const ttl = parseInt(msg.webpush && msg.webpush.headers && msg.webpush.headers.TTL, 10) || 86400;
      const urgency = 'high';
      const payload = JSON.stringify({ from: 'cn-webpush', data: msg.data || {} });
      for (let k = 0; k < wpIdx.length; k += 50) {
        const part = wpIdx.slice(k, k + 50);
        const res = await Promise.all(part.map((i) => sendOneWebPush(wp, tokens[i], payload, ttl, urgency)));
        part.forEach((i, j) => { responses[i] = res[j]; });
      }
    }
  }
  const successCount = responses.filter((r) => r && r.success).length;
  return { responses, successCount, failureCount: tokens.length - successCount };
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
    const response = await sendMulticast(
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
    const response = await sendMulticast(
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

module.exports = { sendPushToUser, sendBroadcastToAllUsers, sendMulticast, buildMessage, collectTokens, pruneDeadTokens, resolvePubImage, topicTag, isWpToken };
