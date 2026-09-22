// api/shop-purchase.js
// Gere l'achat d'article(s) de la Boutique de facon SECURISEE cote serveur :
// deduit le solde de l'acheteur ET credite automatiquement 90% a chaque
// vendeur (10% de commission retenue pour CoeurnohBoost). Ce transfert entre
// comptes differents ne peut PAS se faire depuis le telephone du client
// (regles de securite Firestore), donc ce fichier utilise firebase-admin qui
// a les pleins droits.
//
// Deux modes :
//  - { pubId }   -> achat simple d'un seul article (utilise pour les livres)
//  - { pubIds }  -> achat panier de plusieurs articles (utilise pour les
//                   produits) : -5% de remise automatique si plus de 3
//                   articles dans le panier.
// Les promotions definies par le vendeur (reduction %, promo 24h) sont
// appliquees automatiquement au prix avant tout calcul.
//
// SECURITE (chantier 3) :
//  - jeton Firebase verifie via security.js (identique a avant, juste
//    factorise -- toujours pas de confiance dans un "uid" envoye par le
//    navigateur)
//  - limite de frequence : 20 achats / 10 min / personne
//  - CORRECTIF IMPORTANT : le prix et la remise d'un article sont maintenant
//    VALIDES avant tout calcul. Avant, un vendeur pouvait publier un article
//    avec un "price" negatif, ou un "discountPercent" superieur a 100 : le
//    total a payer devenait negatif, et le solde de l'ACHETEUR AUGMENTAIT en
//    "achetant" l'article -- de l'argent cree a partir de rien, retirable
//    ensuite. Desormais tout prix effectif est force entre 0 et le prix
//    catalogue, jamais negatif.
//  - la remise panier de 5% profitait avant a l'admin (elle etait "absorbee
//    par la commission" mais le vendeur recevait quand meme 90% du prix
//    PLEIN) -- corrige : la remise panier reduit maintenant le montant sur
//    lequel la commission est calculee pour chaque article, au prorata,
//    donc vendeur ET admin la partagent au meme taux 90/10 qu'un achat normal.

const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');
const {
  initFirebaseAdmin, verifyCaller, enforceRateLimit, sendError, UserError, roundMoney, cleanText
} = require('./_lib/security');
const { sendPushToUser } = require('./_lib/push');

initFirebaseAdmin();
const db = admin.firestore();

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";
const COMMISSION_PERCENT = 10; // CoeurnohBoost garde 10%, le vendeur recoit 90%
const CART_DISCOUNT_THRESHOLD = 3; // au-dela de 3 articles...
const CART_DISCOUNT_PERCENT = 5;   // ...5% de remise sur le total
const MAX_CART_ITEMS = 50;

// Prix effectif d'un article, TOUJOURS un nombre fini entre 0 et le prix
// catalogue (jamais negatif, jamais au-dessus du prix affiche). Une remise
// vendeur invalide (negative ou > 100%) est simplement ignoree plutot que
// de faire planter l'achat.
function getEffectivePrice(pub) {
  const rawPrice = Number(pub.price);
  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
  const rawDiscount = Number(pub.discountPercent);
  const discount = Number.isFinite(rawDiscount) ? Math.min(100, Math.max(0, rawDiscount)) : 0;
  if (discount > 0) {
    const stillValid = !pub.promoExpiresAt || new Date(pub.promoExpiresAt) > new Date();
    if (stillValid) return roundMoney(price * (1 - discount / 100));
  }
  return roundMoney(price);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  let uid;
  try {
    const caller = await verifyCaller(req);
    uid = caller.uid;
    await enforceRateLimit({ scope: 'shop-purchase', id: uid, limit: 20, windowSec: 600 });

    const { pubId, pubIds } = req.body || {};
    if (!pubId && !(Array.isArray(pubIds) && pubIds.length > 0)) {
      throw new UserError('pubId ou pubIds sont requis');
    }
    const idsToProcess = pubIds && pubIds.length > 0 ? pubIds : [pubId];
    if (idsToProcess.length > MAX_CART_ITEMS) {
      throw new UserError(`Un panier ne peut pas contenir plus de ${MAX_CART_ITEMS} articles.`);
    }
    if (idsToProcess.some((id) => typeof id !== 'string' || !id)) {
      throw new UserError('Article invalide dans le panier.');
    }

    const buyerRef = db.collection('users').doc(uid);

    const result = await db.runTransaction(async (transaction) => {
      const pubRefs = idsToProcess.map(id => db.collection('publications').doc(id));
      const pubSnaps = await Promise.all(pubRefs.map(ref => transaction.get(ref)));

      const items = [];
      for (let i = 0; i < pubSnaps.length; i++) {
        const snap = pubSnaps[i];
        if (!snap.exists) throw new UserError("Un des articles n'existe plus.");
        const pub = snap.data();
        if (pub.status !== 'published') throw new UserError(`"${pub.title}" n'est plus disponible.`);
        const sellerUid = pub.sellerUid || ADMIN_UID;
        if (sellerUid === uid) throw new UserError(`Tu ne peux pas acheter ton propre article ("${pub.title}").`);
        items.push({ id: snap.id, pub, sellerUid, effectivePrice: getEffectivePrice(pub) });
      }

      const subtotal = roundMoney(items.reduce((sum, it) => sum + it.effectivePrice, 0));
      const applyCartDiscount = idsToProcess.length > CART_DISCOUNT_THRESHOLD && subtotal > 0;
      const finalTotal = applyCartDiscount ? roundMoney(subtotal * (1 - CART_DISCOUNT_PERCENT / 100)) : subtotal;
      // Facteur uniforme applique a chaque article pour repartir la remise
      // panier au prorata (0.95 si remise appliquee, sinon 1).
      const discountFactor = subtotal > 0 ? finalTotal / subtotal : 1;

      const buyerSnap = await transaction.get(buyerRef);
      if (!buyerSnap.exists) throw new UserError("Compte introuvable.");
      const buyerBalance = buyerSnap.data().balance || 0;

      if (finalTotal < 0) throw new UserError("Montant invalide.");
      if (buyerBalance < finalTotal) throw new UserError("Solde insuffisant. Recharge ton portefeuille pour continuer.");

      // ---- PHASE LECTURE (tout AVANT la moindre ecriture) ----
      const uniqueSellerUids = [...new Set(items.map(it => it.sellerUid).filter(s => s !== ADMIN_UID))];
      const sellerSnaps = {};
      for (const sUid of uniqueSellerUids) {
        sellerSnaps[sUid] = await transaction.get(db.collection('users').doc(sUid));
      }
      const adminRef = db.collection('users').doc(ADMIN_UID);
      const adminSnap = uid !== ADMIN_UID ? await transaction.get(adminRef) : null;

      // ---- PHASE ECRITURE ----
      const newBuyerBalance = roundMoney(buyerBalance - finalTotal);
      transaction.update(buyerRef, { balance: newBuyerBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid, type: 'shop_purchase', amount: -finalTotal, balanceAfter: newBuyerBalance,
        description: idsToProcess.length > 1 ? `Achat boutique (${idsToProcess.length} articles)` : 'Achat boutique', relatedId: null
      }));

      const sellerBalanceDeltas = {};
      let adminCommissionTotal = 0;

      let firstFileUrl = null;
      for (const it of items) {
        // Prix reellement paye pour CET article, apres repartition de la
        // remise panier -- c'est sur CE montant que la commission 90/10
        // est calculee, jamais sur le prix catalogue plein.
        const amountForItem = roundMoney(it.effectivePrice * discountFactor);
        const commissionUSD = roundMoney(amountForItem * (COMMISSION_PERCENT / 100));
        const sellerPayoutUSD = roundMoney(amountForItem - commissionUSD);

        if (it.sellerUid !== ADMIN_UID && sellerSnaps[it.sellerUid] && sellerSnaps[it.sellerUid].exists) {
          sellerBalanceDeltas[it.sellerUid] = roundMoney((sellerBalanceDeltas[it.sellerUid] || 0) + sellerPayoutUSD);
          adminCommissionTotal += commissionUSD;
        } else if (it.sellerUid === ADMIN_UID) {
          // Article vendu directement par CoeurnohBoost : pas de partage,
          // le prix entier est un revenu admin (pas juste une "commission").
          adminCommissionTotal += amountForItem;
        }

        const orderRef = db.collection('shop_orders').doc();
        transaction.set(orderRef, {
          uid,
          pubId: it.id,
          sellerUid: it.sellerUid,
          itemTitle: cleanText(it.pub.title, 200),
          itemType: it.pub.type,
          amountUSD: amountForItem,
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
          body: `Ta commande "${cleanText(it.pub.title, 120)}" est confirmée (${amountForItem.toFixed(2)}$).`,
          type: 'purchase',
          read: false,
          createdAt: new Date().toISOString()
        });

        // Notification pour le vendeur (sauf si c'est CoeurnohBoost lui-meme)
        if (it.sellerUid !== ADMIN_UID) {
          transaction.set(db.collection('notifications').doc(), {
            uid: it.sellerUid,
            title: 'Nouvelle vente 🎉',
            body: `"${cleanText(it.pub.title, 120)}" vient d'être vendu (+${sellerPayoutUSD.toFixed(2)}$ sur ton solde).`,
            type: 'sale',
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        if (it.pub.type === 'book' && !firstFileUrl) firstFileUrl = it.pub.fileUrl;
      }

      for (const sUid of Object.keys(sellerBalanceDeltas)) {
        const sellerBalance = sellerSnaps[sUid].data().balance || 0;
        const newSellerBalance = roundMoney(sellerBalance + sellerBalanceDeltas[sUid]);
        transaction.update(db.collection('users').doc(sUid), { balance: newSellerBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: sUid, type: 'shop_sale', amount: sellerBalanceDeltas[sUid], balanceAfter: newSellerBalance,
          description: 'Vente boutique', relatedId: null
        }));
      }

      adminCommissionTotal = roundMoney(adminCommissionTotal);
      if (uid !== ADMIN_UID && adminCommissionTotal > 0 && adminSnap && adminSnap.exists) {
        const adminBalance = adminSnap.data().balance || 0;
        const newAdminBalance = roundMoney(adminBalance + adminCommissionTotal);
        transaction.update(adminRef, { balance: newAdminBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: ADMIN_UID, type: 'commission_income', amount: adminCommissionTotal, balanceAfter: newAdminBalance,
          description: idsToProcess.length > 1 ? `Commission boutique (${idsToProcess.length} articles)` : 'Commission boutique', relatedId: null
        }));
      }

      return {
        newBalance: newBuyerBalance,
        fileUrl: firstFileUrl,
        itemsCount: items.length,
        cartDiscountApplied: applyCartDiscount,
        totalPaid: finalTotal,
        itemTitles: items.map(it => it.pub.title),
        sellerPayouts: sellerBalanceDeltas
      };
    });

    // Envoi des vraies alertes push, une fois la transaction confirmee.
    const buyerSummary = result.itemsCount > 1
      ? `${result.itemsCount} articles achetés (${result.totalPaid.toFixed(2)}$).`
      : `"${result.itemTitles[0]}" est confirmé (${result.totalPaid.toFixed(2)}$).`;
    await sendPushToUser(uid, 'Achat confirmé ✅', buyerSummary, '/?tab=orders');

    for (const sellerUid of Object.keys(result.sellerPayouts)) {
      await sendPushToUser(
        sellerUid,
        'Nouvelle vente 🎉',
        `Tu viens de vendre pour +${result.sellerPayouts[sellerUid].toFixed(2)}$.`,
        '/?tab=sales'
      );
    }

    return res.status(200).json({ success: true, ...result });

  } catch (error) {
    return sendError(res, error, 'shop-purchase');
  }
};
