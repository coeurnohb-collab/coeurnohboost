// api/mbotepay-webhook.js
// Recoit la confirmation de paiement Mobile Money de MboтePay, verifie sa
// signature HMAC-SHA256, puis credite automatiquement le solde (balance)
// du client dans Firestore.

const crypto = require('crypto');
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

// MboтePay signe le corps BRUT exact de la requete, donc on doit desactiver
// le parsing JSON automatique de Vercel pour recuperer ces octets exacts.
module.exports.config = {
  api: { bodyParser: false }
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const rawBody = await readRawBody(req);
    const secret = process.env.MBOTEPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[mbotepay-webhook] MBOTEPAY_WEBHOOK_SECRET manquant');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // --- 1. Verification de la signature ---
    const sigHeader = req.headers['x-mbotepay-signature'] || '';
    const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
    const timestamp = parts.t;
    const receivedSig = parts.v1;

    if (!timestamp || !receivedSig) {
      console.error('[mbotepay-webhook] En-tete de signature absent ou mal forme');
      return res.status(403).json({ error: 'Signature manquante' });
    }

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(timestamp + '.' + rawBody)
      .digest('hex');

    const validSignature =
      receivedSig.length === expectedSig.length &&
      crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));

    if (!validSignature) {
      console.error('[mbotepay-webhook] Signature invalide, requete ignoree');
      return res.status(403).json({ error: 'Signature invalide' });
    }

    // --- 2. Traitement de l'evenement ---
    const payload = JSON.parse(rawBody);
    const reference = payload.reference;
    const status = payload.status; // "completed" ou "failed"

    if (!reference) {
      console.error('[mbotepay-webhook] Reference absente dans le payload');
      return res.status(400).json({ error: 'Reference absente' });
    }

    const requestsSnap = await db.collection('topup_requests')
      .where('mbotepayReference', '==', reference)
      .limit(1)
      .get();

    if (requestsSnap.empty) {
      console.error('[mbotepay-webhook] Aucune demande trouvee pour', reference);
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const requestDoc = requestsSnap.docs[0];
    const requestData = requestDoc.data();

    if (requestData.status === 'completed' || requestData.status === 'failed') {
      // Deja traite (MboтePay peut renvoyer le webhook plusieurs fois)
      console.log('[mbotepay-webhook] Deja traite pour', reference);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    if (status === 'completed') {
      const amountUSD = requestData.amountUSD || 0;
      const userRef = db.collection('users').doc(requestData.uid);

      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
          throw new Error(`Utilisateur ${requestData.uid} introuvable`);
        }
        const currentBalance = userSnap.data().balance || 0;
        transaction.update(userRef, { balance: currentBalance + amountUSD });
        transaction.update(requestDoc.ref, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        transaction.set(db.collection('notifications').doc(), {
          uid: requestData.uid,
          title: 'Solde rechargé 💰',
          body: `Ton compte a été crédité de ${amountUSD.toFixed(2)}$.`,
          type: 'recharge',
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      console.log(`[mbotepay-webhook] ${amountUSD}$ credites a ${requestData.uid} (ref ${reference})`);
      return res.status(200).json({ received: true, credited: true });
    } else {
      // "failed" ou tout autre statut terminal negatif
      await requestDoc.ref.update({ status: 'failed' });
      console.log(`[mbotepay-webhook] Paiement echoue pour ${reference}`);
      return res.status(200).json({ received: true, credited: false });
    }

  } catch (error) {
    console.error('[mbotepay-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
