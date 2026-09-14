// api/payment-webhook.js
// Point d'entree UNIQUE pour les webhooks de paiement, distingues par
// ?provider= dans l'URL (cryptomus / mbotepay / cinetpay). Fusionne
// cryptomus-webhook.js + mbotepay-webhook.js + CinetPay ajoute dedans --
// voir le commentaire en tete de payment-initiate.js pour le pourquoi.
//
// bodyParser desactive globalement car MboтePay a besoin du corps BRUT
// exact pour verifier sa signature HMAC -- Cryptomus et CinetPay sont donc
// parses manuellement (JSON.parse) ci-dessous.

const crypto = require('crypto');
const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');
const { getCinetpayPaymentStatus } = require('./_lib/cinetpay');

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

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function sendPushNotification(uid, title, body) {
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const fcmToken = userSnap.exists && userSnap.data().fcmToken;
    if (!fcmToken) return;
    await admin.messaging().send({ token: fcmToken, notification: { title, body } });
  } catch (e) {
    console.log('[push] Envoi echoue :', e.message);
  }
}

async function creditBalance({ uid, amount, type, description, relatedId, requestRef }) {
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) throw new Error(`Utilisateur ${uid} introuvable`);
    const currentBalance = userSnap.data().balance || 0;
    const newBalance = currentBalance + amount;
    transaction.update(userRef, { balance: newBalance });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type, amount, balanceAfter: newBalance, description, relatedId
    }));
    transaction.update(requestRef, { status: 'completed', completedAt: new Date().toISOString(), amountCredited: amount });
    transaction.set(db.collection('notifications').doc(), {
      uid, title: 'Solde rechargé 💰', body: `Ton compte a été crédité de ${amount.toFixed(2)}$.`,
      type: 'recharge', read: false, createdAt: new Date().toISOString()
    });
  });
  await sendPushNotification(uid, 'Solde rechargé 💰', `Ton compte a été crédité de ${amount.toFixed(2)}$.`);
}

/* ========================= CRYPTOMUS ========================= */

async function handleCryptomusWebhook(rawBody, res) {
  const body = JSON.parse(rawBody);
  const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;
  if (!apiKey) {
    console.error('CRYPTOMUS WEBHOOK: cle API manquante');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const receivedSign = body.sign;
  const bodyForCheck = { ...body };
  delete bodyForCheck.sign;
  const jsonPayload = JSON.stringify(bodyForCheck);
  const base64Payload = Buffer.from(jsonPayload).toString('base64');
  const expectedSign = crypto.createHash('md5').update(base64Payload + apiKey).digest('hex');

  if (receivedSign !== expectedSign) {
    console.error('CRYPTOMUS WEBHOOK: signature invalide, requete ignoree');
    return res.status(403).json({ error: 'Signature invalide' });
  }

  const status = body.status;
  const orderId = body.order_id;
  if (status !== 'paid' && status !== 'paid_over') {
    console.log(`CRYPTOMUS WEBHOOK: statut "${status}" pour ${orderId}, aucune action`);
    return res.status(200).json({ received: true });
  }

  const parts = String(orderId).split('_');
  if (parts[0] !== 'topup' || parts.length < 3) {
    console.error('CRYPTOMUS WEBHOOK: order_id invalide:', orderId);
    return res.status(400).json({ error: 'order_id invalide' });
  }
  const uid = parts.slice(1, -1).join('_');

  const requestsSnap = await db.collection('topup_requests').where('cryptomusOrderId', '==', orderId).limit(1).get();
  if (requestsSnap.empty) {
    console.error('CRYPTOMUS WEBHOOK: aucune demande trouvee pour', orderId);
    return res.status(404).json({ error: 'Demande introuvable' });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();
  if (requestData.status === 'completed') {
    console.log('CRYPTOMUS WEBHOOK: deja credite pour', orderId);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  const amountPaid = parseFloat(body.amount) || requestData.amountUSD;
  await creditBalance({ uid, amount: amountPaid, type: 'topup_crypto', description: 'Recharge par crypto-monnaie', relatedId: orderId, requestRef: requestDoc.ref });

  console.log(`CRYPTOMUS WEBHOOK: ${amountPaid}$ credites a ${uid} (order ${orderId})`);
  return res.status(200).json({ received: true, credited: true });
}

/* ========================= MBOTEPAY ========================= */

async function handleMbotepayWebhook(rawBody, req, res) {
  const secret = process.env.MBOTEPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[mbotepay-webhook] MBOTEPAY_WEBHOOK_SECRET manquant');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const sigHeader = req.headers['x-mbotepay-signature'] || '';
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const timestamp = parts.t;
  const receivedSig = parts.v1;

  if (!timestamp || !receivedSig) {
    console.error('[mbotepay-webhook] En-tete de signature absent ou mal forme');
    return res.status(403).json({ error: 'Signature manquante' });
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
  const validSignature = receivedSig.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));

  if (!validSignature) {
    console.error('[mbotepay-webhook] Signature invalide, requete ignoree');
    return res.status(403).json({ error: 'Signature invalide' });
  }

  const payload = JSON.parse(rawBody);
  const reference = payload.reference;
  const status = payload.status;

  if (!reference) {
    console.error('[mbotepay-webhook] Reference absente dans le payload');
    return res.status(400).json({ error: 'Reference absente' });
  }

  const requestsSnap = await db.collection('topup_requests').where('mbotepayReference', '==', reference).limit(1).get();
  if (requestsSnap.empty) {
    console.error('[mbotepay-webhook] Aucune demande trouvee pour', reference);
    return res.status(404).json({ error: 'Demande introuvable' });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  if (requestData.status === 'completed' || requestData.status === 'failed') {
    console.log('[mbotepay-webhook] Deja traite pour', reference);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  if (status === 'completed') {
    const amountUSD = requestData.amountUSD || 0;
    await creditBalance({ uid: requestData.uid, amount: amountUSD, type: 'topup_mobile_money', description: 'Recharge par Mobile Money', relatedId: reference, requestRef: requestDoc.ref });
    console.log(`[mbotepay-webhook] ${amountUSD}$ credites a ${requestData.uid} (ref ${reference})`);
    return res.status(200).json({ received: true, credited: true });
  } else {
    await requestDoc.ref.update({ status: 'failed' });
    console.log(`[mbotepay-webhook] Paiement echoue pour ${reference}`);
    return res.status(200).json({ received: true, credited: false });
  }
}

/* ========================= CINETPAY ========================= */

async function handleCinetpayWebhook(rawBody, res) {
  let payload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (e) {
    console.error('[cinetpay-webhook] Corps JSON invalide');
    return res.status(400).json({ error: 'Corps invalide' });
  }

  const { merchant_transaction_id: merchantTransactionId, notify_token: notifyToken } = payload;
  if (!merchantTransactionId) {
    console.error('[cinetpay-webhook] merchant_transaction_id absent');
    return res.status(400).json({ error: 'merchant_transaction_id absent' });
  }

  const requestsSnap = await db.collection('topup_requests').where('cinetpayMerchantTransactionId', '==', merchantTransactionId).limit(1).get();
  if (requestsSnap.empty) {
    console.error('[cinetpay-webhook] Aucune demande trouvee pour', merchantTransactionId);
    return res.status(404).json({ error: 'Demande introuvable' });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  if (requestData.status === 'completed' || requestData.status === 'failed') {
    console.log('[cinetpay-webhook] Deja traite pour', merchantTransactionId);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  // Premiere verification : le notify_token doit correspondre a celui recu
  // a l'initialisation du paiement.
  const expectedToken = requestData.cinetpayNotifyToken;
  if (!expectedToken || !notifyToken || expectedToken.length !== notifyToken.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedToken), Buffer.from(notifyToken))) {
    console.error('[cinetpay-webhook] notify_token invalide, requete ignoree');
    return res.status(403).json({ error: 'Jeton invalide' });
  }

  // SECURISE (regle d'or explicite de la doc CinetPay) : la SEULE source de
  // verite pour le statut reste leur API -- jamais le contenu du webhook.
  let statusData;
  try {
    statusData = await getCinetpayPaymentStatus(merchantTransactionId);
  } catch (e) {
    console.error('[cinetpay-webhook] Verification statut echouee :', e.message);
    return res.status(500).json({ error: 'Verification statut echouee' });
  }

  if (statusData.status === 'SUCCESS') {
    const amountUSD = requestData.amountUSD || 0;
    await creditBalance({ uid: requestData.uid, amount: amountUSD, type: 'topup_card', description: 'Recharge par carte bancaire', relatedId: merchantTransactionId, requestRef: requestDoc.ref });
    console.log(`[cinetpay-webhook] ${amountUSD}$ credites a ${requestData.uid} (${merchantTransactionId})`);
    return res.status(200).json({ received: true, credited: true });
  } else if (statusData.status === 'FAILED') {
    await requestDoc.ref.update({ status: 'failed' });
    console.log(`[cinetpay-webhook] Paiement echoue pour ${merchantTransactionId}`);
    return res.status(200).json({ received: true, credited: false });
  } else {
    console.log(`[cinetpay-webhook] Statut non final "${statusData.status}" pour ${merchantTransactionId}`);
    return res.status(200).json({ received: true });
  }
}

/* ========================= ROUTEUR ========================= */

module.exports = async function handler(req, res) {
  const provider = req.query.provider;

  // Sonde de sante CinetPay : repondre 200 vide sur GET.
  if (req.method === 'GET') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const rawBody = await readRawBody(req);

    if (provider === 'cryptomus') return await handleCryptomusWebhook(rawBody, res);
    if (provider === 'mbotepay') return await handleMbotepayWebhook(rawBody, req, res);
    if (provider === 'cinetpay') return await handleCinetpayWebhook(rawBody, res);

    console.error('[payment-webhook] provider inconnu :', provider);
    return res.status(400).json({ error: 'provider inconnu' });
  } catch (error) {
    console.error('[payment-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
