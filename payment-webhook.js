// api/payment-webhook.js
// Point d'entree UNIQUE pour les webhooks de paiement, distingues par
// ?provider= dans l'URL (cryptomus / mbotepay / maxicash). Fusionne
// cryptomus-webhook.js + mbotepay-webhook.js + MaxiCash ajoute dedans --
// voir le commentaire en tete de payment-initiate.js pour le pourquoi.
//
// bodyParser desactive globalement car MboтePay a besoin du corps BRUT
// exact pour verifier sa signature HMAC -- Cryptomus est donc parse
// manuellement (JSON.parse) ci-dessous. MaxiCash "notifyurl" n'est PAS
// documente precisement par MaxiCash (la doc dit juste "quelques
// parametres en query string" sans lister les noms exacts) -- voir le
// commentaire dans handleMaxicashWebhook plus bas : premiere version en
// mode "diagnostic", a affiner apres un premier vrai test en sandbox.

const crypto = require('crypto');
const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');

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

/* ========================= MAXICASH ========================= */
// ATTENTION -- version "diagnostic" : la doc MaxiCash ne liste pas les noms
// exacts des parametres envoyes a notifyurl (elle dit juste "le Gateway
// ajoutera quelques parametres en query string"). Plutot que de deviner et
// risquer de mal verifier un paiement, ce handler :
//   1) accepte GET et POST (methode non precisee non plus par la doc)
//   2) fusionne tout ce qui arrive (query string + corps) dans un seul objet
//   3) LOG l'integralite de ce qui est recu (a lire dans Vercel > Logs lors
//      du premier vrai test de paiement en sandbox)
//   4) essaie une liste de noms de champs plausibles pour retrouver la
//      reference et le statut ; si rien ne correspond, NE CREDITE PAS et
//      journalise -- a affiner avec l'utilisateur des qu'on a vu un vrai
//      payload MaxiCash.
async function handleMaxicashWebhook(rawBody, req, res) {
  let bodyParams = {};
  const contentType = req.headers['content-type'] || '';
  if (rawBody) {
    try {
      if (contentType.includes('application/json')) {
        bodyParams = JSON.parse(rawBody);
      } else {
        bodyParams = Object.fromEntries(new URLSearchParams(rawBody));
      }
    } catch (e) {
      console.log('[maxicash-webhook] Corps non parseable en JSON/urlencoded, ignore :', e.message);
    }
  }

  const params = { ...(req.query || {}), ...bodyParams };
  console.log('[maxicash-webhook] Parametres recus (methode ' + req.method + ') :', JSON.stringify(params));

  const reference = params.Reference || params.reference || params.Ref || null;
  const rawStatus = (params.ResponseStatus || params.Status || params.status || params.responsestatus || '').toString().toLowerCase();
  const isSuccess = ['success', 'successful', 'approved', 'completed', '1', '00'].includes(rawStatus);
  const isFailure = ['failed', 'declined', 'error', 'cancelled', 'canceled', '0'].includes(rawStatus);

  if (!reference) {
    console.log('[maxicash-webhook] Aucune reference reconnue dans les parametres -- rien a faire (voir logs ci-dessus)');
    return res.status(200).json({ received: true });
  }

  const requestsSnap = await db.collection('topup_requests').where('maxicashReference', '==', reference).limit(1).get();
  if (requestsSnap.empty) {
    console.error('[maxicash-webhook] Aucune demande trouvee pour', reference);
    return res.status(200).json({ received: true });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  if (requestData.status === 'completed' || requestData.status === 'failed') {
    console.log('[maxicash-webhook] Deja traite pour', reference);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  if (isSuccess) {
    const amountUSD = requestData.amountUSD || 0;
    await creditBalance({ uid: requestData.uid, amount: amountUSD, type: 'topup_card', description: 'Recharge par carte bancaire (MaxiCash)', relatedId: reference, requestRef: requestDoc.ref });
    console.log(`[maxicash-webhook] ${amountUSD}$ credites a ${requestData.uid} (${reference})`);
    return res.status(200).json({ received: true, credited: true });
  } else if (isFailure) {
    await requestDoc.ref.update({ status: 'failed' });
    console.log(`[maxicash-webhook] Paiement echoue pour ${reference}`);
    return res.status(200).json({ received: true, credited: false });
  } else {
    console.log(`[maxicash-webhook] Statut non reconnu "${rawStatus}" pour ${reference} -- rien credite, voir logs pour ajuster`);
    return res.status(200).json({ received: true });
  }
}

/* ========================= ROUTEUR ========================= */

module.exports = async function handler(req, res) {
  const provider = req.query.provider;

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const rawBody = req.method === 'POST' ? await readRawBody(req) : '';

    if (provider === 'cryptomus') return await handleCryptomusWebhook(rawBody, res);
    if (provider === 'mbotepay') return await handleMbotepayWebhook(rawBody, req, res);
    if (provider === 'maxicash') return await handleMaxicashWebhook(rawBody, req, res);

    // Sonde de sante generique (ex: verification manuelle de l'URL) : 200 vide.
    if (req.method === 'GET') return res.status(200).end();

    console.error('[payment-webhook] provider inconnu :', provider);
    return res.status(400).json({ error: 'provider inconnu' });
  } catch (error) {
    console.error('[payment-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
