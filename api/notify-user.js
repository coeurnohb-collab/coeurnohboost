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
    // Action separee : suppression definitive du compte (page Parametres >
    // Confidentialite). Supprime le compte de connexion, la fiche
    // personnelle et les publications de l'utilisateur. Les commandes
    // deja passees sont conservees (preuve/historique pour l'autre partie).
    if (req.body && req.body.action === 'delete-account') {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: 'idToken requis' });
      }
      const decoded = await admin.auth().verifyIdToken(idToken);
      const targetUid = decoded.uid;

      const pubsSnap = await db.collection('publications').where('sellerUid', '==', targetUid).get();
      const pubsBatch = db.batch();
      pubsSnap.forEach((doc) => pubsBatch.delete(doc.ref));
      if (!pubsSnap.empty) await pubsBatch.commit();

      const notifsSnap = await db.collection('notifications').where('uid', '==', targetUid).get();
      const notifsBatch = db.batch();
      notifsSnap.forEach((doc) => notifsBatch.delete(doc.ref));
      if (!notifsSnap.empty) await notifsBatch.commit();

      await db.collection('users').doc(targetUid).delete();
      await admin.auth().deleteUser(targetUid);

      return res.status(200).json({ success: true });
    }

    // Action separee : demande de retrait de solde (page Portefeuille /
    // vendeur). Avant, le solde etait debite directement depuis le
    // navigateur -- desormais tout se fait ici dans une transaction
    // atomique, apres verification du vrai solde en base.
    if (req.body && req.body.action === 'request-withdrawal') {
      const { idToken, amount, method, accountDetails } = req.body;
      if (!idToken) return res.status(401).json({ error: 'Connexion requise.' });

      let targetUid;
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        targetUid = decoded.uid;
      } catch (e) {
        return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
      }

      const numericAmount = Number(amount);
      if (!(numericAmount > 0)) {
        return res.status(400).json({ error: 'Montant invalide.' });
      }
      if (!method || !accountDetails) {
        return res.status(400).json({ error: 'Merci de remplir toutes les informations.' });
      }

      const userRef = db.collection('users').doc(targetUid);
      let newBalance;
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(userRef);
          if (!snap.exists) throw new Error('Compte introuvable.');
          const data = snap.data();
          const currentBalance = data.balance || 0;
          if (currentBalance < numericAmount) throw new Error('SOLDE_INSUFFISANT');
          newBalance = Math.round((currentBalance - numericAmount) * 100) / 100;
          tx.update(userRef, { balance: newBalance });

          const reqRef = db.collection('withdrawal_requests').doc();
          tx.set(reqRef, {
            uid: targetUid,
            sellerName: data.name || 'Vendeur',
            method, accountDetails,
            amountUSD: numericAmount,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
        });
      } catch (e) {
        if (e.message === 'SOLDE_INSUFFISANT') {
          return res.status(200).json({ success: false, error: 'Ce montant dépasse ton solde disponible.' });
        }
        console.error('[notify-user] Erreur transaction retrait :', e.message);
        return res.status(200).json({ success: false, error: 'Erreur lors de la demande. Réessaie.' });
      }

      return res.status(200).json({ success: true, newBalance });
    }

    // Action separee : deconnexion de tous les appareils (page Parametres >
    // Compte). Regroupee ici plutot que dans un fichier a part, pour rester
    // sous la limite de fonctions serverless du plan Vercel.
    if (req.body && req.body.action === 'revoke-sessions') {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: 'idToken requis' });
      }
      const decoded = await admin.auth().verifyIdToken(idToken);
      await admin.auth().revokeRefreshTokens(decoded.uid);
      return res.status(200).json({ success: true });
    }

    const { adminUid, fromUid, uid, title, body, category, url } = req.body || {};

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

    // Un compte peut avoir plusieurs appareils (fcmTokens). L'ancien champ
    // unique "fcmToken" est conserve en repli, le temps que chaque appareil
    // se reconnecte au moins une fois pour migrer vers la nouvelle liste.
    const tokens = [];
    if (userData && Array.isArray(userData.fcmTokens)) tokens.push(...userData.fcmTokens);
    if (userData && userData.fcmToken && !tokens.includes(userData.fcmToken)) tokens.push(userData.fcmToken);

    // Preferences du destinataire (page Parametres > Notifications). Si le
    // champ n'existe pas encore (compte cree avant cette fonctionnalite),
    // tout reste active par defaut : aucun changement pour les comptes existants.
    // La categorie "admin" (annonces admin) ignore les preferences : elle est
    // consideree comme une information importante, toujours prioritaire.
    const prefs = (userData && userData.notifPrefs) || {};
    const cat = category || 'activity';
    const categoryAllowed = cat === 'admin' || prefs[cat] !== false;
    const pushAllowed = categoryAllowed && prefs.push !== false;
    const emailAllowed = categoryAllowed && prefs.email !== false;

    if (!categoryAllowed) {
      logNotifAttempt({ uid, category: cat, channel: 'skipped', success: false, reason: 'Désactivé dans les préférences de la personne', title });
      return res.status(200).json({ success: true, pushSent: false, skipped: 'preference' });
    }

    if (tokens.length > 0 && pushAllowed) {
      // Compte les notifications non lues de ce client pour afficher un
      // vrai nombre sur la pastille de l'icone (comme WhatsApp).
      let badgeCount = 1;
      try {
        const unreadSnap = await db.collection('notifications')
          .where('uid', '==', uid).where('read', '==', false).get();
        badgeCount = unreadSnap.size || 1;
      } catch (e) { /* si le comptage echoue, on retombe sur 1 */ }

      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { badgeCount: String(badgeCount), url: url || '/' },
        webpush: {
          headers: { Urgency: 'high' },
          notification: { icon: '/icon-192.png' }
        },
        android: { priority: 'high' }
      });

      // Nettoyage : retire les jetons devenus invalides (app desinstallee,
      // permission revoquee...) pour ne plus jamais leur ecrire inutilement.
      const deadTokens = [];
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token') {
            deadTokens.push(tokens[idx]);
          }
        }
      });
      if (deadTokens.length > 0) {
        db.collection('users').doc(uid).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...deadTokens),
          fcmToken: admin.firestore.FieldValue.delete()
        }).catch(() => {});
      }

      const successCount = response.successCount || 0;
      logNotifAttempt({
        uid, category: cat, channel: 'push',
        success: successCount > 0,
        reason: successCount > 0
          ? `Envoyé à ${successCount}/${tokens.length} appareil(s)`
          : `Échec sur les ${tokens.length} appareil(s) connu(s)`,
        title
      });
    } else if (userData && userData.email && emailAllowed) {
      // Pas de jeton push enregistre (site utilise sans notifications
      // activees, ou navigateur qui ne les supporte pas) : on envoie quand
      // meme l'info par email, pour que la personne ne rate rien.
      await sendFallbackEmail(userData.email, title, body);
      logNotifAttempt({ uid, category: cat, channel: 'email', success: true, reason: `Envoyé par e-mail à ${userData.email}`, title });
    } else {
      logNotifAttempt({
        uid, category: cat, channel: 'none', success: false,
        reason: !userData ? 'Compte introuvable' : 'Aucun appareil ni e-mail disponible pour cette personne',
        title
      });
    }

    return res.status(200).json({ success: true, pushSent: tokens.length > 0 });

  } catch (error) {
    console.error('[notify-user] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};

// Enregistre chaque tentative d'envoi (succes ou echec) pour pouvoir
// diagnostiquer plus tard un "je n'ai pas recu ma notification" depuis
// l'espace admin. N'interrompt jamais l'envoi si la journalisation echoue.
function logNotifAttempt({ uid, category, channel, success, reason, title }) {
  db.collection('notif_logs').add({
    uid, category, channel, success, reason,
    title: title || null,
    createdAt: new Date().toISOString()
  }).catch((e) => console.log('[notify-user] Log non enregistre :', e.message));
}

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
