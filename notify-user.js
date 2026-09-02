// api/notify-user.js
// Declenche une VRAIE alerte push vers UN client precis — necessaire car
// l'envoi de notifications push ne peut se faire que depuis le serveur
// (firebase-admin), jamais directement depuis le navigateur.
// Autorise soit l'admin (adminUid), soit n'importe quel utilisateur connecte
// (fromUid) qui notifie quelqu'un d'AUTRE suite a une interaction sociale
// (like, commentaire, partage).

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { adminUid, fromUid, uid, title, body } = req.body || {};

    if (!uid || !title || !body) {
      return res.status(400).json({ error: 'uid, title et body sont requis' });
    }

    const isAdmin = adminUid === ADMIN_UID;

    if (!isAdmin) {
      // Un utilisateur normal ne peut notifier que quelqu'un d'AUTRE que
      // lui-meme, et doit vraiment exister dans la base (anti-abus minimal).
      if (!fromUid || fromUid === uid) {
        return res.status(403).json({ error: 'Non autorise' });
      }
      const fromSnap = await db.collection('users').doc(fromUid).get();
      if (!fromSnap.exists) {
        return res.status(403).json({ error: 'Non autorise' });
      }
    }

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const fcmToken = userData && userData.fcmToken;

    if (fcmToken) {
      // Compte les notifications non lues de ce client pour afficher un
      // vrai nombre sur la pastille de l'icone (comme WhatsApp).
      let badgeCount = 1;
      try {
        const unreadSnap = await db.collection('notifications')
          .where('uid', '==', uid).where('read', '==', false).get();
        badgeCount = unreadSnap.size || 1;
      } catch (e) { /* si le comptage echoue, on retombe sur 1 */ }

      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: { badgeCount: String(badgeCount) },
        webpush: {
          headers: { Urgency: 'high' },
          notification: { icon: '/icon-192.png' }
        },
        android: { priority: 'high' }
      });
    } else if (userData && userData.email) {
      // Pas de jeton push enregistre (site utilise sans notifications
      // activees, ou navigateur qui ne les supporte pas) : on envoie quand
      // meme l'info par email, pour que la personne ne rate rien.
      await sendFallbackEmail(userData.email, title, body);
    }

    return res.status(200).json({ success: true, pushSent: !!fcmToken });

  } catch (error) {
    console.error('[notify-user] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};

async function sendFallbackEmail(toEmail, title, body) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CoeurnohBoost <onboarding@resend.dev>',
        to: toEmail,
        subject: title,
        html: `<p>${body}</p><p style="color:#888;font-size:13px">Active les notifications dans l'app CoeurnohBoost pour les recevoir instantanement la prochaine fois.</p>`
      })
    });
  } catch (e) {
    console.log('[notify-user] Email de secours non envoye :', e.message);
  }
}
