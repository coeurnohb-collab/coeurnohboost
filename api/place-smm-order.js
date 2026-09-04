// api/place-smm-order.js
//
// SECURISE : avant, ce fichier ne verifiait NI l'identite de l'appelant NI
// son solde -- n'importe qui sur internet, meme sans compte, pouvait
// declencher une vraie commande payante sur MoreThanPanel gratuitement.
// Le debit du solde et la creation de la commande se faisaient en plus
// directement depuis le navigateur (Firestore), ce qui permettait aussi a
// n'importe quel utilisateur connecte de modifier son propre solde a la
// main. Desormais, TOUT (verification d'identite, verification et debit du
// solde, creation de la commande) se fait ici, cote serveur, dans une
// transaction Firestore atomique -- le navigateur ne fait plus que demander
// et afficher le resultat.
//
// Corps attendu (JSON) :
// {
//   idToken,                 // jeton Firebase de la personne connectee (obligatoire)
//   orderKind,                // 'service' | 'bundle' | 'package'
//   price,                    // prix calcule cote client (verifie ci-dessous)
//   platform, platformName,   // id + nom affiche de la plateforme
//   service, quality,         // libelles affiches sur la commande
//   link, quantity,           // lien a booster + quantite (null pour bundle/package)
//   type                      // uniquement pour orderKind === 'service' (mapping MTP)
// }

const admin = require('firebase-admin');
const STATIC_FALLBACK = require('./mtp-service-map');

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

// Plafond de securite : aucune commande individuelle ne devrait jamais
// couter plus que ca. Sert de filet en cas de prix errone/manipule cote
// client, en attendant une verification complete du catalogue cote serveur.
const MAX_REASONABLE_PRICE = 500;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  const {
    idToken, orderKind, price, platform, platformName,
    service, quality, link, quantity, type
  } = req.body || {};

  // 1) Identite obligatoire -- avant, aucune verification n'existait ici.
  if (!idToken) {
    return res.status(401).json({ error: 'Connexion requise.' });
  }
  let uid, userEmail;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
    userEmail = decoded.email || null;
  } catch (e) {
    return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
  }

  // 2) Validation de base des champs.
  if (!orderKind || !link || price == null) {
    return res.status(400).json({ error: 'Parametres manquants.' });
  }
  const numericPrice = Number(price);
  if (!(numericPrice > 0) || numericPrice > MAX_REASONABLE_PRICE) {
    return res.status(400).json({ error: 'Montant de commande invalide.' });
  }

  const userRef = db.collection('users').doc(uid);
  let newBalance;
  let orderRef;

  // 3) Verification ET debit du solde dans une transaction atomique :
  // impossible desormais de commander plus que son vrai solde en base,
  // et impossible de "gagner" du solde en le modifiant depuis le navigateur
  // puisque les regles Firestore ne l'autorisent plus (voir firestore.rules).
  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error('Compte introuvable.');
      const currentBalance = userSnap.data().balance || 0;
      if (currentBalance < numericPrice) {
        throw new Error('SOLDE_INSUFFISANT');
      }
      newBalance = currentBalance - numericPrice;
      tx.update(userRef, { balance: newBalance });

      orderRef = db.collection('orders').doc();
      tx.set(orderRef, {
        uid,
        email: userEmail,
        platform: platformName || platform || '',
        service: service || '',
        quality: quality || orderKind,
        link,
        quantity: quantity || null,
        price: numericPrice,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });
  } catch (e) {
    if (e.message === 'SOLDE_INSUFFISANT') {
      return res.status(200).json({ success: false, error: 'Solde insuffisant.' });
    }
    console.error('[place-smm-order] Erreur transaction :', e.message);
    return res.status(200).json({ success: false, error: 'Erreur lors de la commande. Réessaie.' });
  }

  // 4) Uniquement pour les commandes de service individuel : tentative
  // d'automatisation reelle vers MoreThanPanel (logique inchangee par
  // rapport a avant, juste deplacee ici et executee apres un debit fiable).
  if (orderKind !== 'service') {
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: false });
  }

  const apiKey = process.env.MTP_API_KEY;
  if (!apiKey || !type || !quality || !quantity) {
    await orderRef.update({ debugReason: 'Automatisation non configuree ou parametres MTP manquants.' });
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: false });
  }

  let mtpServiceId = null;
  try {
    const platformDoc = await db.collection('service_map').doc(platform).get();
    if (platformDoc.exists) {
      const data = platformDoc.data();
      const val = data && data[type] && data[type][quality];
      if (val) mtpServiceId = val;
    }
  } catch (e) {
    console.log('[place-smm-order] Erreur lecture service_map, repli sur le fichier embarque :', e.message);
  }
  if (!mtpServiceId) {
    const fallbackPlatform = STATIC_FALLBACK[platform];
    const fallbackType = fallbackPlatform && fallbackPlatform[type];
    mtpServiceId = (fallbackType && fallbackType[quality]) || null;
  }

  if (!mtpServiceId) {
    await orderRef.update({ debugReason: `Aucun ID MoreThanPanel pour ${platform}/${type}/${quality}.` });
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: false });
  }

  try {
    const response = await fetch('https://morethanpanel.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: apiKey, action: 'add', service: mtpServiceId, link, quantity })
    });
    const data = await response.json();
    if (data.error) {
      await orderRef.update({ debugReason: data.error });
      return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: false });
    }

    let mtpCost = null, mtpCurrency = null;
    try {
      const statusResponse = await fetch('https://morethanpanel.com/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: apiKey, action: 'status', order: data.order })
      });
      const statusData = await statusResponse.json();
      if (statusData && statusData.charge) {
        mtpCost = parseFloat(statusData.charge);
        mtpCurrency = statusData.currency || 'USD';
      }
    } catch (e) { /* le cout restera juste inconnu pour l'instant, pas bloquant */ }

    await orderRef.update({
      status: 'processing',
      mtpOrderId: data.order,
      mtpCost, mtpCurrency
    });
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: true, mtpOrderId: data.order });
  } catch (e) {
    await orderRef.update({ debugReason: 'Erreur MoreThanPanel : ' + e.message });
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: false });
  }
};
