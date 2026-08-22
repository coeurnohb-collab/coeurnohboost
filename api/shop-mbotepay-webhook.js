// api/shop-mbotepay-webhook.js
// Recoit la confirmation de paiement MboтePay pour une commande de la
// BOUTIQUE (livre/produit). Meme verification de signature que le webhook
// du portefeuille, mais met a jour "shop_orders" au lieu de crediter un solde.

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
      console.error('[shop-mbotepay-webhook] MBOTEPAY_WEBHOOK_SECRET manquant');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    const sigHeader = req.headers['x-mbotepay-signature'] || '';
    const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
    const timestamp = parts.t;
    const receivedSig = parts.v1;

    if (!timestamp || !receivedSig) {
      console.error('[shop-mbotepay-webhook] En-tete de signature absent ou mal forme');
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
      console.error('[shop-mbotepay-webhook] Signature invalide, requete ignoree');
      return res.status(403).json({ error: 'Signature invalide' });
    }

    const payload = JSON.parse(rawBody);
    const reference = payload.reference;
    const status = payload.status;

    if (!reference) {
      console.error('[shop-mbotepay-webhook] Reference absente dans le payload');
      return res.status(400).json({ error: 'Reference absente' });
    }

    const ordersSnap = await db.collection('shop_orders')
      .where('mbotepayReference', '==', reference)
      .limit(1)
      .get();

    if (ordersSnap.empty) {
      console.error('[shop-mbotepay-webhook] Aucune commande trouvee pour', reference);
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const orderDoc = ordersSnap.docs[0];
    const orderData = orderDoc.data();

    if (orderData.status === 'completed' || orderData.status === 'failed') {
      console.log('[shop-mbotepay-webhook] Deja traite pour', reference);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    if (status === 'completed') {
      await orderDoc.ref.update({ status: 'completed', completedAt: new Date().toISOString() });
      console.log(`[shop-mbotepay-webhook] Commande ${orderDoc.id} payee (ref ${reference})`);
      return res.status(200).json({ received: true, paid: true });
    } else {
      await orderDoc.ref.update({ status: 'failed' });
      console.log(`[shop-mbotepay-webhook] Paiement echoue pour ${reference}`);
      return res.status(200).json({ received: true, paid: false });
    }

  } catch (error) {
    console.error('[shop-mbotepay-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
