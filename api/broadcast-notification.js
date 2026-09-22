// api/broadcast-notification.js
// Envoie une VRAIE alerte push a TOUS les utilisateurs ayant un jeton FCM
// enregistre (meme app fermee). Utilise pour : annonces admin, et nouvelles
// publications visibles par tous (photo/video/texte, produits boutique).
//
// SECURISE : avant, ce fichier faisait confiance a un simple "adminUid"
// envoye dans la requete pour decider si l'appelant etait l'administrateur
// -- comme cet UID n'est pas un secret (visible dans les regles Firestore
// et le code cote client), n'importe qui aurait pu se faire passer pour
// l'admin et envoyer une fausse alerte "officielle" a tous les
// utilisateurs. Desormais, l'identite vient uniquement du jeton Firebase
// verifie ici (comme pour place-smm-order.js et shop-purchase.js).

const admin = require('firebase-admin');
const { initFirebaseAdmin, verifyCaller, enforceRateLimit, cleanText, safeInternalPath, ADMIN_UID } = require('./_lib/security');

initFirebaseAdmin();
const db = admin.firestore();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { title: rawTitle, body: rawBody, category, url } = req.body || {};
    // Longueur plafonnee : une diffusion touche potentiellement TOUS les
    // utilisateurs, un texte demesure serait couteux (FCM + emails de secours)
    // et pourrait servir a du spam. Le lien ne peut jamais pointer vers un
    // autre site (voir safeInternalPath) -- empeche une notification
    // "officielle" d'hameconnage vers un site externe.
    const title = cleanText(rawTitle, 100);
    const body = cleanText(rawBody, 300, { keepNewlines: true });
    const safeUrl = safeInternalPath(url);
    if (!title || !body) {
      return res.status(400).json({ error: 'title et body sont requis' });
    }

    let callerUid;
    try {
      const caller = await verifyCaller(req);
      callerUid = caller.uid;
    } catch (e) {
      return res.status(e.status || 401).json({ error: e.message || 'Session invalide, reconnecte-toi.' });
    }

    const excludeUid = callerUid; // on n'envoie jamais a la personne qui declenche l'action
    const isAdmin = callerUid === ADMIN_UID;
    // Limite de frequence : un compte normal ne devrait declencher qu'un
    // petit nombre de diffusions (nouvelles publications) par heure ;
    // l'admin (annonces) n'est pas plafonne ici.
    if (!isAdmin) {
      await enforceRateLimit({ scope: 'broadcast', id: callerUid, limit: 10, windowSec: 3600 });
    }
    if (!isAdmin) {
      // Anti-abus minimal : il faut etre un utilisateur reel et connu.
      const fromUid = callerUid;
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
        data: { url: safeUrl },
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
        from: 'Coeurnoh Universe <onboarding@resend.dev>',
        to: toEmail,
        subject: title,
        html: `<p>${body}</p><p style="color:#888;font-size:13px">Active les notifications dans l'app Coeurnoh Universe pour les recevoir instantanement la prochaine fois.</p>`
      })
    })
  ));
}
