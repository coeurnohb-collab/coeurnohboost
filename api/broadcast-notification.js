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
    const { adminUid, fromUid, excludeUid, title, body, category, url } = req.body || {};

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

    const cat = category || 'content';

    // Recupere tous les jetons FCM connus (sauf celui qui declenche l'action),
    // et separe les utilisateurs sans jeton (mais avec un email) pour leur
    // envoyer l'info par email en secours. Chaque destinataire est filtre
    // selon ses propres preferences (page Parametres > Notifications) ; si
    // le champ n'existe pas encore sur son compte, tout reste active par
    // defaut. La categorie "admin" ignore les preferences (info prioritaire).
    const usersSnap = await db.collection('users').get();
    const tokenToUid = {};
    const fallbackEmails = [];
    usersSnap.forEach((doc) => {
      if (excludeUid && doc.id === excludeUid) return;
      const data = doc.data();
      const prefs = data.notifPrefs || {};
      const categoryAllowed = cat === 'admin' || prefs[cat] !== false;
      if (!categoryAllowed) return;

      // Un compte peut avoir plusieurs appareils (fcmTokens). L'ancien champ
      // unique "fcmToken" est conserve en repli, le temps que chaque
      // appareil se reconnecte au moins une fois pour migrer.
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

    // Envoi des emails de secours en parallele, sans bloquer sur les echecs.
    if (fallbackEmails.length > 0) {
      sendFallbackEmails(fallbackEmails, title, body).catch(() => {});
    }

    if (tokens.length === 0) {
      logBroadcastAttempt({ title, category: cat, sent: 0, failed: 0, emailFallback: fallbackEmails.length });
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
        data: { url: url || '/' },
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
                .update({
                  fcmTokens: admin.firestore.FieldValue.arrayRemove(batch[idx]),
                  fcmToken: admin.firestore.FieldValue.delete()
                })
                .catch(() => {});
            }
          }
        }
      });
    }

    logBroadcastAttempt({ title, category: cat, sent, failed, emailFallback: fallbackEmails.length });
    return res.status(200).json({ success: true, sent, failed, emailFallback: fallbackEmails.length });

  } catch (error) {
    console.error('[broadcast-notification] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};

// Enregistre un resume de chaque diffusion (pas un log par destinataire,
// ce qui serait beaucoup trop couteux pour des envois a des centaines de
// personnes) -- consultable depuis l'admin pour verifier qu'une annonce
// est bien partie et combien de personnes l'ont reellement recue.
function logBroadcastAttempt({ title, category, sent, failed, emailFallback }) {
  db.collection('notif_logs').add({
    uid: null, category, channel: 'broadcast',
    success: sent > 0 || emailFallback > 0,
    reason: `Diffusion : ${sent} reçue(s), ${failed} échec(s), ${emailFallback} par e-mail`,
    title: title || null,
    createdAt: new Date().toISOString()
  }).catch((e) => console.log('[broadcast-notification] Log non enregistre :', e.message));
}

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
