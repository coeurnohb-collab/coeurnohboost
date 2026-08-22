// api/shop-cinetpay-webhook.js
// Recoit la notification CinetPay pour une commande de la BOUTIQUE.
// Meme regle de securite que api/cinetpay-webhook.js : on ne fait JAMAIS
// confiance au contenu du webhook, on re-verifie toujours le vrai statut
// aupres de CinetPay avant de marquer la commande payee.

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

async function getAccessToken() {
  const apiKey = process.env.CINETPAY_API_KEY;
  const apiPassword = process.env.CINETPAY_API_PASSWORD;

  if (!apiKey || !apiPassword) {
    console.error('[shop-cinetpay-webhook] CINETPAY_API_KEY ou CINETPAY_API_PASSWORD manquante');
    return null;
  }

  const tokenResponse = await fetch('https://api.cinetpay.com/v1/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, api_password: apiPassword })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('[shop-cinetpay-webhook] Echec obtention jeton :', JSON.stringify(tokenData));
    return null;
  }
  return tokenData.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ received: true });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const payload = req.body || {};
    const merchantTransactionId = payload.merchant_transaction_id;

    if (!merchantTransactionId) {
      console.error('[shop-cinetpay-webhook] merchant_transaction_id absent du payload');
      return res.status(200).json({ received: true, error: 'merchant_transaction_id absent' });
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('[shop-cinetpay-webhook] Impossible d obtenir un jeton, verification annulee');
      return res.status(200).json({ received: true, error: 'jeton indisponible' });
    }

    const statusResponse = await fetch(
      `https://api.cinetpay.com/v1/payment/${merchantTransactionId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const statusData = await statusResponse.json();
    console.log('[shop-cinetpay-webhook] Statut reel CinetPay =', JSON.stringify(statusData));

    const realStatus = statusData && statusData.details && statusData.details.status;

    const ordersSnap = await db.collection('shop_orders')
      .where('cinetpayReference', '==', merchantTransactionId)
      .limit(1)
      .get();

    if (ordersSnap.empty) {
      console.error('[shop-cinetpay-webhook] Aucune commande trouvee pour', merchantTransactionId);
      return res.status(200).json({ received: true, error: 'Commande introuvable' });
    }

    const orderDoc = ordersSnap.docs[0];
    const orderData = orderDoc.data();

    if (orderData.status === 'completed' || orderData.status === 'failed') {
      console.log('[shop-cinetpay-webhook] Deja traite pour', merchantTransactionId);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    if (realStatus === 'SUCCESS') {
      await orderDoc.ref.update({ status: 'completed', completedAt: new Date().toISOString() });
      console.log(`[shop-cinetpay-webhook] Commande ${orderDoc.id} payee (ref ${merchantTransactionId})`);
      return res.status(200).json({ received: true, paid: true });

    } else if (realStatus === 'FAILED') {
      await orderDoc.ref.update({ status: 'failed' });
      console.log(`[shop-cinetpay-webhook] Paiement echoue pour ${merchantTransactionId}`);
      return res.status(200).json({ received: true, paid: false });

    } else {
      console.log(`[shop-cinetpay-webhook] Statut non final (${realStatus}) pour ${merchantTransactionId}`);
      return res.status(200).json({ received: true, pending: true });
    }

  } catch (error) {
    console.error('[shop-cinetpay-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
