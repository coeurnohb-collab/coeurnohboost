// api/_lib/push.js
// Envoi d'une alerte push a UN utilisateur, sur TOUS ses appareils.
// Dans /_lib : pas compte comme fonction serverless par Vercel.
//
// CORRECTIF : avant, payment-webhook / shop-purchase / payments-actions
// n'utilisaient que l'ancien champ unique "fcmToken" -- un utilisateur dont
// les appareils sont enregistres dans la liste "fcmTokens" ne recevait donc
// jamais l'alerte de recharge, d'achat ou de vente. On lit maintenant les deux.

const admin = require('firebase-admin');
const { initFirebaseAdmin, safeInternalPath } = require('./security');

async function sendPushToUser(uid, title, body, url) {
  try {
    initFirebaseAdmin();
    const db = admin.firestore();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return;
    const data = snap.data();
    const tokens = [];
    if (Array.isArray(data.fcmTokens)) tokens.push(...data.fcmTokens.filter((t) => typeof t === 'string'));
    if (typeof data.fcmToken === 'string' && !tokens.includes(data.fcmToken)) tokens.push(data.fcmToken);
    if (tokens.length === 0) return;

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { url: safeInternalPath(url || '/') },
      webpush: { headers: { Urgency: 'high' }, notification: { icon: '/icon-192-v2.png' } },
      android: { priority: 'high' }
    });

    const dead = [];
    response.responses.forEach((r, idx) => {
      const code = r.error && r.error.code;
      if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')) {
        dead.push(tokens[idx]);
      }
    });
    if (dead.length > 0) {
      const patch = { fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead) };
      if (data.fcmToken && dead.includes(data.fcmToken)) patch.fcmToken = admin.firestore.FieldValue.delete();
      db.collection('users').doc(uid).update(patch).catch(() => {});
    }
  } catch (e) {
    console.log('[push] Envoi echoue :', e.message);
  }
}

module.exports = { sendPushToUser };
