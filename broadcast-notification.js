// api/broadcast-notification.js
// Envoie une VRAIE alerte push a TOUS les utilisateurs ayant un jeton FCM
// enregistre (meme app fermee). Utilise pour : annonces admin, et nouvelles
// publications visibles par tous (photo/video/texte, produits boutique).
//
// Autorise soit l'admin (adminUid), soit n'importe quel utilisateur connecte
// (fromUid) qui vient de publier. excludeUid permet de ne pas se notifier
// soi-meme de sa propre publication.

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
    const { adminUid, fromUid, excludeUid, title, body } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'title et body sont requis' });
    }

    const isAdmin = adminUid === ADMIN_UID;
    if (!isAdmin) {
      // Anti-abus minimal : il faut etre un utilisateur reel et connu.
      if (!fromUid) {
        return res.status(403).json({ error: 'Non autorise' });
      }
      const fromSnap = await db.collection('users').doc(fromUid).get();
      if (!fromSnap.exists) {
        return res.status(403).json({ error: 'Non autorise' });
      }
    }

    // Recupere tous les jetons FCM connus (sauf celui qui declenche l'action),
    // et separe les utilisateurs sans jeton (mais avec un email) pour leur
    // envoyer l'info par email en secours.
    const usersSnap = await db.collection('users').get();
    const tokenToUid = {};
    const fallbackEmails = [];
    usersSnap.forEach((doc) => {
      if (excludeUid && doc.id === excludeUid) return;
      const data = doc.data();
      if (data.fcmToken) {
        tokenToUid[data.fcmToken] = doc.id;
      } else if (data.email) {
        fallbackEmails.push(data.email);
      }
    });
    const tokens = Object.keys(tokenToUid);

    // Envoi des emails de secours en parallele, sans bloquer sur les echecs.
    if (fallbackEmails.length > 0) {
      sendFallbackEmails(fallbackEmails, title, body).catch(() => {});
    }

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, sent: 0, emailFallback: fallbackEmails.length });
    }

    // La limite FCM est de 500 jetons par appel : on decoupe en paquets.
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      const response = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        webpush: {
          headers: { Urgency: 'high' },
          notification: { icon: '/icon-192.png' }
        },
        android: { priority: 'high' }
      });
      sent += response.successCount;
      failed += response.failureCount;

      // Nettoyage : supprime les jetons devenus invalides (app desinstallee,
      // permission revoquee...) pour ne plus jamais leur ecrire inutilement.
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token') {
            const badUid = tokenToUid[batch[idx]];
            if (badUid) {
              db.collection('users').doc(badUid)
                .update({ fcmToken: admin.firestore.FieldValue.delete() })
                .catch(() => {});
            }
          }
        }
      });
    }

    return res.status(200).json({ success: true, sent, failed, emailFallback: fallbackEmails.length });

  } catch (error) {
    console.error('[broadcast-notification] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};

async function sendFallbackEmails(emails, title, body) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  // En parallele, mais sans faire echouer tout le lot si un envoi rate.
  await Promise.allSettled(emails.map((toEmail) =>
    fetch('https://api.resend.com/emails', {
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
    })
  ));
}
