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
const { sendBroadcastToAllUsers } = require('./_lib/push');

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

    const { sent, failed, emailFallback } = await sendBroadcastToAllUsers({ title, body, category, url: safeUrl, excludeUid });
    return res.status(200).json({ success: true, sent, failed, emailFallback });

  } catch (error) {
    console.error('[broadcast-notification] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};
