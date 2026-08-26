// api/shop-purchase.js
// Gere l'achat d'article(s) de la Boutique de facon SECURISEE cote serveur :
// deduit le solde de l'acheteur ET credite automatiquement 90% a chaque
// vendeur (10% de commission retenue pour CoeurnohBoost). Ce transfert entre
// comptes differents ne peut PAS se faire depuis le telephone du client
// (regles de securite Firestore), donc ce fichier utilise firebase-admin qui
// a les pleins droits.
//
// Deux modes :
//  - { uid, pubId }   -> achat simple d'un seul article (utilise pour les livres)
//  - { uid, pubIds }  -> achat panier de plusieurs articles (utilise pour les
//                        produits) : -5% de remise automatique si plus de 3
//                        articles dans le panier.
// Les promotions definies par le vendeur (reduction %, promo 24h) sont
// appliquees automatiquement au prix avant tout calcul.

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
const CART_DISCOUNT_THRESHOLD = 3; // au-dela de 3 articles...
const CART_DISCOUNT_PERCENT = 5;   // ...5% de remise sur le total (absorbe par la commission)

function getEffectivePrice(pub) {
  const price = pub.price || 0;
  if (pub.discountPercent > 0) {
    const stillValid = !pub.promoExpiresAt || new Date(pub.promoExpiresAt) > new Date();
    if (stillValid) {
      return Math.round(price * (1 - pub.discountPercent / 100) * 100) / 100;
    }
  }
  return price;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { uid, pubId, pubIds } = req.body;
    if (!uid || (!pubId && !(Array.isArray(pubIds) && pubIds.length > 0))) {
      return res.status(400).json({ error: 'uid et (pubId ou pubIds) sont requis' });
    }

    const idsToProcess = pubIds && pubIds.length > 0 ? pubIds : [pubId];
    const buyerRef = db.collection('users').doc(uid);

    const result = await db.runTransaction(async (transaction) => {
      const pubRefs = idsToProcess.map(id => db.collection('publications').doc(id));
      const pubSnaps = await Promise.all(pubRefs.map(ref => transaction.get(ref)));

      const items = [];
      for (let i = 0; i < pubSnaps.length; i++) {
        const snap = pubSnaps[i];
        if (!snap.exists) throw new Error("Un des articles n'existe plus.");
        const pub = snap.data();
        if (pub.status !== 'published') throw new Error(`"${pub.title}" n'est plus disponible.`);
        const sellerUid = pub.sellerUid || ADMIN_UID;
        if (sellerUid === uid) throw new Error(`Tu ne peux pas acheter ton propre article ("${pub.title}").`);
        items.push({ id: snap.id, pub, sellerUid, effectivePrice: getEffectivePrice(pub) });
      }

      const subtotal = items.reduce((sum, it) => sum + it.effectivePrice, 0);
      const applyCartDiscount = idsToProcess.length > CART_DISCOUNT_THRESHOLD;
      const finalTotal = applyCartDiscount
        ? Math.round(subtotal * (1 - CART_DISCOUNT_PERCENT / 100) * 100) / 100
        : Math.round(subtotal * 100) / 100;

      const buyerSnap = await transaction.get(buyerRef);
      if (!buyerSnap.exists) throw new Error("Compte introuvable.");
      const buyerBalance = buyerSnap.data().balance || 0;

      if (buyerBalance < finalTotal) throw new Error("Solde insuffisant. Recharge ton portefeuille pour continuer.");

      const newBuyerBalance = Math.round((buyerBalance - finalTotal) * 100) / 100;
      transaction.update(buyerRef, { balance: newBuyerBalance });

      const uniqueSellerUids = [...new Set(items.map(it => it.sellerUid).filter(s => s !== ADMIN_UID))];
      const sellerSnaps = {};
      for (const sUid of uniqueSellerUids) {
        sellerSnaps[sUid] = await transaction.get(db.collection('users').doc(sUid));
      }
      const sellerBalanceDeltas = {};

      let firstFileUrl = null;
      for (const it of items) {
        const commissionUSD = Math.round(it.effectivePrice * (COMMISSION_PERCENT / 100) * 100) / 100;
        const sellerPayoutUSD = Math.round((it.effectivePrice - commissionUSD) * 100) / 100;

        if (it.sellerUid !== ADMIN_UID && sellerSnaps[it.sellerUid] && sellerSnaps[it.sellerUid].exists) {
          sellerBalanceDeltas[it.sellerUid] = (sellerBalanceDeltas[it.sellerUid] || 0) + sellerPayoutUSD;
        }

        const orderRef = db.collection('shop_orders').doc();
        transaction.set(orderRef, {
          uid,
          pubId: it.id,
          sellerUid: it.sellerUid,
          itemTitle: it.pub.title,
          itemType: it.pub.type,
          amountUSD: it.effectivePrice,
          commissionUSD,
          sellerPayoutUSD,
          status: 'completed',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        });

        // Notification pour l'acheteur
        transaction.set(db.collection('notifications').doc(), {
          uid,
          title: 'Achat confirmé ✅',
          body: `Ta commande "${it.pub.title}" est confirmée (${it.effectivePrice.toFixed(2)}$).`,
          type: 'purchase',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notification pour le vendeur (sauf si c'est CoeurnohBoost lui-meme)
        if (it.sellerUid !== ADMIN_UID) {
          transaction.set(db.collection('notifications').doc(), {
            uid: it.sellerUid,
            title: 'Nouvelle vente 🎉',
            body: `"${it.pub.title}" vient d'être vendu (+${sellerPayoutUSD.toFixed(2)}$ sur ton solde).`,
            type: 'sale',
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        if (it.pub.type === 'book' && !firstFileUrl) firstFileUrl = it.pub.fileUrl;
      }

      for (const sUid of Object.keys(sellerBalanceDeltas)) {
        const sellerBalance = sellerSnaps[sUid].data().balance || 0;
        transaction.update(db.collection('users').doc(sUid), {
          balance: Math.round((sellerBalance + sellerBalanceDeltas[sUid]) * 100) / 100
        });
      }

      return {
        newBalance: newBuyerBalance,
        fileUrl: firstFileUrl,
        itemsCount: items.length,
        cartDiscountApplied: applyCartDiscount,
        totalPaid: finalTotal
      };
    });

    return res.status(200).json({ success: true, ...result });

  } catch (error) {
    console.error('[shop-purchase] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};
