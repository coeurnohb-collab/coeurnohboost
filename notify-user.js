// api/notify-user.js
// Declenche une VRAIE alerte push vers UN client precis — necessaire car
// l'envoi de notifications push ne peut se faire que depuis le serveur
// (firebase-admin), jamais directement depuis le navigateur.
// Autorise soit l'admin (adminUid), soit n'importe quel utilisateur connecte
// (fromUid) qui notifie quelqu'un d'AUTRE suite a une interaction sociale
// (like, commentaire, partage).

const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');
const {
  initFirebaseAdmin, verifyCaller, enforceRateLimit, cleanText, safeInternalPath, ADMIN_UID
} = require('./_lib/security');
const { buildMessage, collectTokens, pruneDeadTokens, resolvePubImage, sendPushToUser, sendMulticast } = require('./_lib/push');

initFirebaseAdmin();
const db = admin.firestore();

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
      let targetUid;
      try {
        const caller = await verifyCaller(req);
        targetUid = caller.uid;
      } catch (e) {
        return res.status(e.status || 401).json({ error: e.message || 'Session invalide, reconnecte-toi.' });
      }
      await enforceRateLimit({ scope: 'delete-account', id: targetUid, limit: 3, windowSec: 3600 });

      const pubsSnap = await db.collection('publications').where('sellerUid', '==', targetUid).get();
      const pubsBatch = db.batch();
      pubsSnap.forEach((doc) => pubsBatch.delete(doc.ref));
      if (!pubsSnap.empty) await pubsBatch.commit();

      const notifsSnap = await db.collection('notifications').where('uid', '==', targetUid).get();
      const notifsBatch = db.batch();
      notifsSnap.forEach((doc) => notifsBatch.delete(doc.ref));
      if (!notifsSnap.empty) await notifsBatch.commit();

      // Centre de localisation : suppression complète des données de position
      // (appareils, historique, partages envoyés/reçus, contacts d'urgence,
      // position partagée, session SOS). Non bloquant pour la suppression du compte.
      try {
        const locTargets = [
          ['location_devices', 'ownerUid'], ['location_history', 'ownerUid'],
          ['location_shares', 'ownerUid'], ['location_shares', 'viewerUid'],
          ['emergency_contacts', 'ownerUid'], ['emergency_contacts', 'contactUid'], ['location_links', 'ownerUid']
        ];
        for (const [name, field] of locTargets) {
          const snap = await db.collection(name).where(field, '==', targetUid).get();
          for (let i = 0; i < snap.docs.length; i += 400) {
            const b = db.batch();
            snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
            await b.commit();
          }
        }
        // Annuaire de localisation : clés de recherche (email/numéro), profil public et coordonnées privées
        const lk = await db.collection('location_lookup').where('uid', '==', targetUid).get();
        for (const d of lk.docs) await d.ref.delete();
        await db.collection('location_profiles').doc(targetUid).delete();
        await db.collection('location_private').doc(targetUid).delete();
        await db.collection('location_live').doc(targetUid).delete();
        await db.collection('sos_sessions').doc(targetUid).delete();
      } catch (e) {
        console.error('[notify-user] Nettoyage localisation :', e.message);
      }

      await db.collection('users').doc(targetUid).delete();
      await admin.auth().deleteUser(targetUid);

      return res.status(200).json({ success: true });
    }

    // Action separee : demande de retrait de solde (page Portefeuille /
    // vendeur). Avant, le solde etait debite directement depuis le
    // navigateur -- desormais tout se fait ici dans une transaction
    // atomique, apres verification du vrai solde en base.
    if (req.body && req.body.action === 'request-withdrawal') {
      const { amount, method, accountDetails } = req.body;

      let targetUid;
      try {
        const caller = await verifyCaller(req);
        targetUid = caller.uid;
      } catch (e) {
        return res.status(e.status || 401).json({ error: e.message || 'Session invalide, reconnecte-toi.' });
      }
      try {
        await enforceRateLimit({ scope: 'withdraw', id: targetUid, limit: 5, windowSec: 3600 });
      } catch (e) {
        res.setHeader('Retry-After', String((e.extra && e.extra.retryAfterSec) || 60));
        return res.status(429).json({ error: e.message });
      }

      const numericAmount = Number(amount);
      if (!(numericAmount > 0)) {
        return res.status(400).json({ error: 'Montant invalide.' });
      }
      const safeMethod = cleanText(method, 60);
      const safeAccountDetails = cleanText(accountDetails, 300);
      if (!safeMethod || !safeAccountDetails) {
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
            sellerName: cleanText(data.name || 'Vendeur', 100),
            method: safeMethod, accountDetails: safeAccountDetails,
            amountUSD: numericAmount,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
          tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
            uid: targetUid, type: 'withdrawal_request', amount: -numericAmount, balanceAfter: newBalance,
            description: `Demande de retrait (${safeMethod})`, relatedId: reqRef.id
          }));
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

    // Action separee : notification de TEST envoyee a MES propres appareils
    // (Parametres > Notifications). Verifie toute la chaine : jeton enregistre,
    // envoi Firebase, service worker, affichage sur le telephone.
    if (req.body && req.body.action === 'test-push') {
      let testUid;
      try {
        const caller = await verifyCaller(req);
        testUid = caller.uid;
      } catch (e) {
        return res.status(e.status || 401).json({ error: e.message || 'Session invalide, reconnecte-toi.' });
      }
      try {
        await enforceRateLimit({ scope: 'test-push', id: testUid, limit: 6, windowSec: 600 });
      } catch (e) {
        res.setHeader('Retry-After', String((e.extra && e.extra.retryAfterSec) || 60));
        return res.status(429).json({ error: e.message });
      }
      const meSnap = await db.collection('users').doc(testUid).get();
      const meData = meSnap.exists ? meSnap.data() : null;
      const myTokens = collectTokens(meData);
      if (myTokens.length === 0) {
        return res.status(200).json({ success: false, devices: 0, error: 'Aucun appareil enregistre. Active les notifications sur ce telephone.' });
      }
      const testResp = await sendMulticast(buildMessage({
        tokens: myTokens,
        title: 'Notifications activées ✅',
        body: 'Tout fonctionne : tu recevras les alertes même quand l\'application est fermée.',
        url: '/?openTab=notifs', category: 'test', kind: 'personal'
      }));
      pruneDeadTokens(db, testUid, myTokens, testResp.responses, meData);
      const firstErr = testResp.responses.find((r) => !r.success);
      return res.status(200).json({
        success: (testResp.successCount || 0) > 0,
        sent: testResp.successCount || 0,
        devices: myTokens.length,
        error: (testResp.successCount || 0) > 0 ? null : (firstErr && firstErr.error && firstErr.error.code) || 'envoi-impossible'
      });
    }

    // Action separee : CoeurNoh Alertes. Quand un vendeur publie un produit, le SERVEUR compare
    // le produit aux alertes enregistrees et prévient les personnes concernees. Les alertes des
    // autres personnes ne sont donc plus lisibles depuis les telephones (regle « proprietaire seul »).
    if (req.body && req.body.action === 'check-alerts') {
      let callerUid;
      try {
        const caller = await verifyCaller(req);
        callerUid = caller.uid;
      } catch (e) {
        return res.status(e.status || 401).json({ error: e.message || 'Session invalide, reconnecte-toi.' });
      }
      try {
        await enforceRateLimit({ scope: 'check-alerts', id: callerUid, limit: 30, windowSec: 3600 });
      } catch (e) {
        res.setHeader('Retry-After', String((e.extra && e.extra.retryAfterSec) || 60));
        return res.status(429).json({ error: e.message });
      }
      const alertPubId = String((req.body && req.body.pubId) || '');
      if (!/^[A-Za-z0-9_-]{6,40}$/.test(alertPubId)) return res.status(400).json({ error: 'Publication invalide.' });
      const pubRef = db.collection('publications').doc(alertPubId);
      const pubSnap = await pubRef.get();
      const prod = pubSnap.exists ? pubSnap.data() : null;
      // Seul le vendeur, pour un produit publie recemment, et une seule fois par produit.
      if (!prod || prod.sellerUid !== callerUid || prod.type !== 'product' || prod.status !== 'published' || prod.alertsCheckedAt) {
        return res.status(200).json({ success: true, matched: 0 });
      }
      const ageMs = Date.now() - Date.parse(prod.createdAt || '');
      if (!(ageMs >= 0 && ageMs < 15 * 60 * 1000)) return res.status(200).json({ success: true, matched: 0 });
      await pubRef.update({ alertsCheckedAt: new Date().toISOString() });

      const alertsSnap = await db.collection('alerts').where('active', '==', true).limit(500).get();
      const haystack = `${prod.title || ''} ${prod.description || ''}`.toLowerCase();
      const price = Number(prod.price) || 0;
      const owners = new Map(); // une seule notification par personne, meme avec plusieurs alertes
      alertsSnap.forEach((doc) => {
        const a = doc.data();
        if (!a || a.ownerUid === callerUid || owners.has(a.ownerUid)) return;
        const kw = String(a.keywordLower || a.keyword || '').toLowerCase();
        if (!kw || !haystack.includes(kw)) return;
        if (a.maxPrice && price > a.maxPrice) return;
        if (a.category && a.category !== prod.category) return;
        owners.set(a.ownerUid, String(a.keyword || '').slice(0, 60));
      });
      const matchTitle = 'Une annonce correspond à ton alerte 🔔';
      const productTitle = cleanText(prod.title || '', 80);
      let notified = 0;
      for (const [ownerUid, keyword] of owners) {
        const matchBody = `« ${keyword} » — ${productTitle} à ${price.toFixed(2)}$`;
        try {
          await db.collection('notifications').add({
            uid: ownerUid, title: matchTitle, body: matchBody, type: 'alert_match',
            url: '/?open=' + alertPubId, read: false, createdAt: new Date().toISOString()
          });
          await sendPushToUser(ownerUid, matchTitle, matchBody, '/?open=' + alertPubId, { category: 'activity' });
          notified++;
        } catch (e) { /* une alerte en echec ne bloque pas les autres */ }
      }
      return res.status(200).json({ success: true, matched: owners.size, notified });
    }

    // Action separee : deconnexion de tous les appareils (page Parametres >
    // Compte). Regroupee ici plutot que dans un fichier a part, pour rester
    // sous la limite de fonctions serverless du plan Vercel.
    if (req.body && req.body.action === 'revoke-sessions') {
      let revokeUid;
      try {
        // checkRevoked: false ici -- le but meme de l'appel est de revoquer
        // les jetons existants, donc on n'exige pas qu'il soit deja "non
        // revoque" (il ne l'est pas encore au moment de l'appel).
        const caller = await verifyCaller(req, { checkRevoked: false });
        revokeUid = caller.uid;
      } catch (e) {
        return res.status(e.status || 401).json({ error: e.message || 'Session invalide, reconnecte-toi.' });
      }
      await admin.auth().revokeRefreshTokens(revokeUid);
      return res.status(200).json({ success: true });
    }

    // SECURISE : avant, ce bloc faisait confiance a un simple "adminUid" /
    // "fromUid" envoye dans la requete -- comme l'UID admin n'est pas un
    // secret, n'importe qui pouvait se faire passer pour l'admin OU pour
    // n'importe quel autre utilisateur existant pour envoyer de fausses
    // notifications (spam, usurpation). Desormais l'identite vient
    // uniquement du jeton Firebase verifie ici.
    const { uid, category, url } = req.body || {};
    const title = cleanText(req.body && req.body.title, 100);
    const body = cleanText(req.body && req.body.body, 300, { keepNewlines: true });
    const safeUrl = safeInternalPath(url);

    if (!uid || !title || !body) {
      return res.status(400).json({ error: 'uid, title et body sont requis' });
    }
    let callerUid;
    try {
      const caller = await verifyCaller(req);
      callerUid = caller.uid;
    } catch (e) {
      return res.status(e.status || 401).json({ error: e.message || 'Session invalide, reconnecte-toi.' });
    }

    const isAdmin = callerUid === ADMIN_UID;
    if (!isAdmin) {
      await enforceRateLimit({ scope: 'notify-user', id: callerUid, limit: 60, windowSec: 600 });
    }

    if (!isAdmin) {
      // Un utilisateur normal ne peut notifier que quelqu'un d'AUTRE que
      // lui-meme, et doit vraiment exister dans la base (anti-abus minimal).
      const fromUid = callerUid;
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
    // Admin et SOS (securite) ignorent les preferences.
    const alwaysOn = cat === 'admin' || cat === 'sos';
    const categoryAllowed = alwaysOn || prefs[cat] !== false;
    const pushAllowed = categoryAllowed && (alwaysOn || prefs.push !== false);
    // E-mail : plus jamais pour les likes/commentaires/partages. Uniquement en
    // secours pour l'argent (orders) et la securite (sos), si aucun appareil.
    const emailAllowed = categoryAllowed && prefs.email !== false && (cat === 'orders' || cat === 'sos');

    if (!categoryAllowed) {
      logNotifAttempt({ uid, category: cat, channel: 'skipped', success: false, reason: 'Désactivé dans les préférences de la personne', title });
      return res.status(200).json({ success: true, pushSent: false, skipped: 'preference' });
    }

    let pushOk = false;
    if (tokens.length > 0 && pushAllowed) {
      // Vrai nombre sur la pastille de l'icone de l'app (comme WhatsApp).
      let badgeCount = 1;
      try {
        const unreadSnap = await db.collection('notifications')
          .where('uid', '==', uid).where('read', '==', false).get();
        badgeCount = unreadSnap.size || 1;
      } catch (e) { /* si le comptage echoue, on retombe sur 1 */ }

      const image = await resolvePubImage(db, safeUrl);
      const response = await sendMulticast(
        buildMessage({ tokens, title, body, url: safeUrl, category: cat, kind: 'personal', badgeCount, image })
      );
      pruneDeadTokens(db, uid, tokens, response.responses, userData);

      const successCount = response.successCount || 0;
      pushOk = successCount > 0;
      logNotifAttempt({
        uid, category: cat, channel: 'push',
        success: pushOk,
        reason: pushOk
          ? `Envoyé à ${successCount}/${tokens.length} appareil(s)`
          : `Échec sur les ${tokens.length} appareil(s) connu(s)`,
        title
      });
    } else if (userData && userData.email && emailAllowed) {
      await sendFallbackEmail(userData.email, title, body);
      logNotifAttempt({ uid, category: cat, channel: 'email', success: true, reason: `Envoyé par e-mail à ${userData.email}`, title });
    } else {
      logNotifAttempt({
        uid, category: cat, channel: 'none', success: false,
        reason: !userData ? 'Compte introuvable'
          : tokens.length === 0 ? 'Aucun appareil enregistré (notifications non activées sur le téléphone)'
          : 'Push désactivé dans les préférences',
        title
      });
    }

    return res.status(200).json({ success: true, pushSent: pushOk, devices: tokens.length });

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
        from: 'Coeurnoh Universe <onboarding@resend.dev>',
        to: toEmail,
        subject: title,
        html: `<p>${String(body).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p><p style="color:#888;font-size:13px">Active les notifications dans l'app Coeurnoh Universe pour les recevoir instantanement la prochaine fois.</p>`
      })
    });
  } catch (e) {
    console.log('[notify-user] Email de secours non envoye :', e.message);
  }
}
