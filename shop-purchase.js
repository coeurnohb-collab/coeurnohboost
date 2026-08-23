// api/shop-purchase.js
// Gere l'achat d'un article de la Boutique (livre ou produit) de facon
// SECURISEE cote serveur : deduit le solde de l'acheteur ET credite
// automatiquement 90% au vendeur (10% de commission retenue pour
// CoeurnohBoost). Ce transfert entre deux comptes differents ne peut PAS
// se faire depuis le telephone du client (regles de securite Firestore),
// donc ce fichier utilise firebase-admin qui a les pleins droits.

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
const COMMISSION_PERCENT = 10; // CoeurnohBoost garde 10%, le vendeur recoit 90%

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { uid, pubId } = req.body;
    if (!uid || !pubId) {
      return res.status(400).json({ error: 'uid et pubId sont requis' });
    }

    const pubRef = db.collection('publications').doc(pubId);
    const buyerRef = db.collection('users').doc(uid);

    const result = await db.runTransaction(async (transaction) => {
      const pubSnap = await transaction.get(pubRef);
      if (!pubSnap.exists) throw new Error("Cet article n'existe plus.");
      const pub = pubSnap.data();

      if (pub.status !== 'published') throw new Error("Cet article n'est plus disponible.");

      const price = pub.price || 0;
      const sellerUid = pub.sellerUid || ADMIN_UID;

      if (sellerUid === uid) throw new Error("Tu ne peux pas acheter ton propre article.");

      const buyerSnap = await transaction.get(buyerRef);
      if (!buyerSnap.exists) throw new Error("Compte introuvable.");
      const buyerBalance = buyerSnap.data().balance || 0;

      if (buyerBalance < price) throw new Error("Solde insuffisant. Recharge ton portefeuille pour continuer.");

      const newBuyerBalance = Math.round((buyerBalance - price) * 100) / 100;
      transaction.update(buyerRef, { balance: newBuyerBalance });

      const commissionUSD = Math.round(price * (COMMISSION_PERCENT / 100) * 100) / 100;
      const sellerPayoutUSD = Math.round((price - commissionUSD) * 100) / 100;

      // Si le vendeur est CoeurnohBoost lui-meme (publication admin), pas de
      // partage a faire : tout reste "dans la maison" comme avant.
      if (sellerUid !== ADMIN_UID) {
        const sellerRef = db.collection('users').doc(sellerUid);
        const sellerSnap = await transaction.get(sellerRef);
        if (sellerSnap.exists) {
          const sellerBalance = sellerSnap.data().balance || 0;
          transaction.update(sellerRef, { balance: Math.round((sellerBalance + sellerPayoutUSD) * 100) / 100 });
        }
      }

      const orderRef = db.collection('shop_orders').doc();
      transaction.set(orderRef, {
        uid,
        pubId,
        sellerUid,
        itemTitle: pub.title,
        itemType: pub.type,
        amountUSD: price,
        commissionUSD,
        sellerPayoutUSD,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      return {
        newBalance: newBuyerBalance,
        fileUrl: pub.type === 'book' ? pub.fileUrl : null
      };
    });

    return res.status(200).json({ success: true, ...result });

  } catch (error) {
    console.error('[shop-purchase] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};
