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

// ---------------------------------------------------------------------
// Diffusion a TOUS les utilisateurs (annonces admin, nouvelles
// publications, messages programmes). Facteur commun utilise par
// /api/broadcast-notification.js (declenchement manuel/immediat) et
// /api/run-scheduled-broadcasts.js (cron, messages programmes).
// ---------------------------------------------------------------------
async function sendBroadcastToAllUsers({ title, body, category, url, excludeUid }) {
  initFirebaseAdmin();
  const db = admin.firestore();
  const cat = category || 'content';
  const safeUrl = safeInternalPath(url || '/');

  const usersSnap = await db.collection('users').get();
  const tokenToUid = {};
  const fallbackEmails = [];
  usersSnap.forEach((doc) => {
    if (excludeUid && doc.id === excludeUid) return;
    const data = doc.data();
    const prefs = data.notifPrefs || {};
    const categoryAllowed = cat === 'admin' || prefs[cat] !== false;
    if (!categoryAllowed) return;
    const userTokens = [];
    if (Array.isArray(data.fcmTokens)) userTokens.push(...data.fcmTokens);
    if (data.fcmToken && !userTokens.includes(data.fcmToken)) userTokens.push(data.fcmToken);
    if (userTokens.length > 0 && prefs.push !== false) {
      userTokens.forEach((t) => { tokenToUid[t] = doc.id; });
    } else if (data.email && prefs.email !== false) {
      fallbackEmails.push(data.email);
    }
  });
  const tokens = Object.keys(tokenToUid);

  if (fallbackEmails.length > 0) {
    sendFallbackBroadcastEmails(fallbackEmails, title, body).catch(() => {});
  }

  let sent = 0, failed = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: { url: safeUrl },
      webpush: { headers: { Urgency: 'high' }, notification: { icon: '/icon-192-v2.png' } },
      android: { priority: 'high' }
    });
    sent += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          const badUid = tokenToUid[batch[idx]];
          if (badUid) {
            db.collection('users').doc(badUid).update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(batch[idx]),
              fcmToken: admin.firestore.FieldValue.delete()
            }).catch(() => {});
          }
        }
      }
    });
  }

  db.collection('notif_logs').add({
    uid: null, category: cat, channel: 'broadcast',
    success: sent > 0 || fallbackEmails.length > 0,
    reason: `Diffusion : ${sent} reçue(s), ${failed} échec(s), ${fallbackEmails.length} par e-mail`,
    title: title || null,
    createdAt: new Date().toISOString()
  }).catch(() => {});

  return { sent, failed, emailFallback: fallbackEmails.length };
}

async function sendFallbackBroadcastEmails(emails, title, body) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  await Promise.allSettled(emails.map((toEmail) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Coeurnoh Universe <onboarding@resend.dev>',
        to: toEmail,
        subject: title,
        html: `<p>${body}</p><p style="color:#888;font-size:13px">Active les notifications dans l'app Coeurnoh Universe pour les recevoir instantanément la prochaine fois.</p>`
      })
    })
  ));
}

module.exports.sendBroadcastToAllUsers = sendBroadcastToAllUsers;
