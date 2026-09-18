// api/payment-initiate.js
// Point d'entree UNIQUE pour demarrer une recharge de solde, quel que soit
// le moyen de paiement (crypto Cryptomus, Mobile Money MboтePay, carte
// bancaire MaxiCash). Fusionne cryptomus-payment.js + mbotepay-payment.js
// + MaxiCash -- comportement IDENTIQUE a avant pour Cryptomus et MboтePay,
// juste regroupe dans un routeur par "provider".
//
// Pourquoi cette fusion : Vercel (plan gratuit) limite a 12 fonctions
// serverless dans /api. Voir wallet-ledger.js / maxicash.js pour le detail.
//
// CinetPay a ete completement retire (compte bloque, IP non whitelistable
// sur Vercel serverless) et remplace par MaxiCash.

const admin = require('firebase-admin');
const crypto = require('crypto');
const { maxicashGatewayFormUrl, maxicashCredentials } = require('./_lib/maxicash');

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

async function getUserEmail(uid) {
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) return userSnap.data().email || null;
  } catch (e) { /* pas bloquant, l'email n'est qu'informatif */ }
  return null;
}

/* ========================= CRYPTOMUS ========================= */

async function handleCryptomus(uid, body) {
  const { amount, currency } = body;
  if (!amount || amount <= 0) {
    return { status: 400, json: { error: 'amount (positif) est requis' } };
  }

  const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
  const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;
  if (!merchantId || !apiKey) {
    console.error('CRYPTOMUS: variables environnement manquantes');
    return { status: 500, json: { error: 'Configuration serveur manquante' } };
  }

  const orderId = `topup_${uid}_${Date.now()}`;
  const payload = {
    amount: String(amount),
    currency: currency || 'USD',
    order_id: orderId,
    url_callback: 'https://coeurnohboost.vercel.app/api/payment-webhook?provider=cryptomus',
    url_success: 'https://coeurnohboost.vercel.app/?payment=success',
    lifetime: 3600
  };

  const jsonPayload = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonPayload).toString('base64');
  const sign = crypto.createHash('md5').update(base64Payload + apiKey).digest('hex');

  const cryptomusResponse = await fetch('https://api.cryptomus.com/v1/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'merchant': merchantId, 'sign': sign },
    body: jsonPayload
  });
  const data = await cryptomusResponse.json();

  if (data.state !== 0) {
    console.error('CRYPTOMUS erreur:', data);
    return { status: 400, json: { error: data.message || 'Erreur Cryptomus' } };
  }

  const userEmail = await getUserEmail(uid);
  await db.collection('topup_requests').add({
    uid, email: userEmail, method: 'crypto', amountUSD: Number(amount),
    status: 'pending_payment', cryptomusOrderId: orderId,
    cryptomusInvoiceId: data.result.uuid, createdAt: new Date().toISOString()
  });

  return { status: 200, json: { success: true, paymentUrl: data.result.url, invoiceId: data.result.uuid, orderId } };
}

/* ========================= MBOTEPAY (Mobile Money) ========================= */

const MBOTEPAY_MAP = {
  CD: { country: 'COD', currency: 'CDF', currencies: ['CDF', 'USD'], operators: {
    'Vodacom M-Pesa': 'VODACOM_MPESA_COD', 'Airtel Money': 'AIRTEL_COD', 'Orange Money': 'ORANGE_COD'
  }},
  BJ: { country: 'BEN', currency: 'XOF', currencies: ['XOF'], operators: {
    'MTN Mobile Money': 'MTN_MOMO_BEN', 'Moov Money': 'MOOV_BEN'
  }},
  CI: { country: 'CIV', currency: 'XOF', currencies: ['XOF'], operators: {
    'MTN Mobile Money': 'MTN_MOMO_CIV', 'Orange Money': 'ORANGE_CIV'
  }},
  CM: { country: 'CMR', currency: 'XAF', currencies: ['XAF'], operators: { 'MTN Mobile Money': 'MTN_MOMO_CMR' }},
  CG: { country: 'COG', currency: 'XAF', currencies: ['XAF'], operators: {
    'Airtel Money': 'AIRTEL_COG', 'MTN Mobile Money': 'MTN_MOMO_COG'
  }},
  GA: { country: 'GAB', currency: 'XAF', currencies: ['XAF'], operators: { 'Airtel Money': 'AIRTEL_GAB' }},
  SN: { country: 'SEN', currency: 'XOF', currencies: ['XOF'], operators: {
    'Orange Money': 'ORANGE_SEN', 'Free Money': 'FREE_SEN'
  }},
  KE: { country: 'KEN', currency: 'KES', currencies: ['KES'], operators: { 'M-Pesa (Safaricom)': 'MPESA_KEN' }},
  RW: { country: 'RWA', currency: 'RWF', currencies: ['RWF'], operators: {
    'Airtel Money': 'AIRTEL_RWA', 'MTN Mobile Money': 'MTN_MOMO_RWA'
  }},
  UG: { country: 'UGA', currency: 'UGX', currencies: ['UGX'], operators: {
    'Airtel Money': 'AIRTEL_OAPI_UGA', 'MTN Mobile Money': 'MTN_MOMO_UGA'
  }},
  ZM: { country: 'ZMB', currency: 'ZMW', currencies: ['ZMW'], operators: {
    'Airtel Money': 'AIRTEL_OAPI_ZMB', 'MTN Mobile Money': 'MTN_MOMO_ZMB'
  }},
  SL: { country: 'SLE', currency: 'SLE', currencies: ['SLE'], operators: { 'Orange Money': 'ORANGE_SLE' }}
};

const FALLBACK_RATES = { CDF: 2800, XOF: 600, XAF: 600, KES: 129, RWF: 1300, UGX: 3700, ZMW: 27, SLE: 22.5 };
const MARGIN_PERCENT = 5;

async function getRate(currency) {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates && data.rates[currency]) {
      return data.rates[currency];
    }
  } catch (e) {
    console.log('[payment-initiate] Taux en direct indisponible, fallback utilise :', e.message);
  }
  return FALLBACK_RATES[currency] || 1;
}

async function handleMbotepay(uid, body) {
  const { amountUSD, countryCode, operatorName, phone, chargeCurrency } = body;
  if (!amountUSD || amountUSD <= 0 || !countryCode || !operatorName || !phone) {
    return { status: 400, json: { error: 'Parametres manquants' } };
  }

  const mapping = MBOTEPAY_MAP[countryCode];
  if (!mapping || !mapping.operators[operatorName]) {
    return { status: 200, json: { supported: false } };
  }

  const apiKey = process.env.MBOTEPAY_API_KEY;
  if (!apiKey) {
    console.error('[payment-initiate] MBOTEPAY_API_KEY manquante');
    return { status: 200, json: { supported: false } };
  }

  const finalCurrency = (chargeCurrency && mapping.currencies.includes(chargeCurrency)) ? chargeCurrency : mapping.currency;

  let chargeAmount;
  if (finalCurrency === 'USD') {
    chargeAmount = Math.round(amountUSD * 100) / 100;
  } else {
    const rate = await getRate(finalCurrency);
    const adjustedRate = rate * (1 + MARGIN_PERCENT / 100);
    chargeAmount = Math.round(amountUSD * adjustedRate);
  }

  const reference = `topup_${uid}_${Date.now()}`;

  const mbotepayResponse = await fetch('https://app.mbotepay.com/api/v1/payin', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': reference },
    body: JSON.stringify({
      amount: chargeAmount, currency: finalCurrency, country: mapping.country,
      operator: mapping.operators[operatorName], phone: phone.replace(/\D/g, ''), reference,
      callback_url: 'https://coeurnohboost.vercel.app/api/payment-webhook?provider=mbotepay'
    })
  });

  const data = await mbotepayResponse.json();
  console.log('[payment-initiate] Reponse MboтePay =', JSON.stringify(data));

  if (!mbotepayResponse.ok || data.error) {
    return { status: 200, json: { supported: true, success: false, error: (data.error && data.error.message) || 'Erreur MboтePay' } };
  }

  const userEmail = await getUserEmail(uid);
  await db.collection('topup_requests').add({
    uid, email: userEmail, method: 'mobile', country: mapping.country, operator: operatorName,
    phone: phone.replace(/\D/g, ''), amountUSD: Number(amountUSD), localAmount: chargeAmount,
    localCurrency: finalCurrency, status: 'pending_payment', mbotepayReference: reference,
    createdAt: new Date().toISOString()
  });

  return { status: 200, json: { supported: true, success: true, reference, localAmount: chargeAmount, currency: finalCurrency } };
}

/* ========================= MAXICASH (Carte bancaire) ========================= */
// Methode "Form Post" : on ne fait PAS d'appel reseau ici. On enregistre la
// demande de recharge (comme pour les autres moyens), puis on renvoie au
// frontend les champs a mettre dans un <form method="POST"> que le
// NAVIGATEUR du client soumettra lui-meme vers MaxiCash (voir script.js,
// c'est la methode officielle documentee par MaxiCash -- le formulaire est
// pense pour etre soumis cote client, ce n'est pas une entorse a la
// securite habituelle de ce genre d'integration).

async function handleMaxicash(uid, body) {
  const { amountUSD } = body;
  if (!amountUSD || amountUSD <= 0) {
    return { status: 400, json: { error: 'amountUSD (positif) est requis' } };
  }

  let credentials;
  try {
    credentials = maxicashCredentials();
  } catch (e) {
    console.error('[payment-initiate][maxicash]', e.message);
    return { status: 500, json: { error: 'Configuration serveur manquante' } };
  }

  // amount en CENTIMES, exige par MaxiCash (ex: 1 USD => 100)
  const amountCents = Math.round(amountUSD * 100);

  // max ~30 caracteres, meme convention que l'ancien identifiant CinetPay
  const reference = `mc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  let email = null, phone = null;
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) {
      const u = userSnap.data();
      email = u.email || null;
      phone = u.phone || null;
    }
  } catch (e) { /* pas bloquant, champs optionnels */ }

  await db.collection('topup_requests').add({
    uid, email, method: 'card', amountUSD: Number(amountUSD),
    status: 'pending_payment', maxicashReference: reference,
    createdAt: new Date().toISOString()
  });

  return {
    status: 200,
    json: {
      success: true,
      formAction: maxicashGatewayFormUrl(),
      formFields: {
        PayType: 'MaxiCash',
        Amount: String(amountCents),
        Currency: 'USD',
        Telephone: phone || '',
        Email: email || '',
        MerchantID: credentials.merchantId,
        MerchantPassword: credentials.merchantPassword,
        Language: 'fr',
        Reference: reference,
        accepturl: 'https://coeurnohboost.vercel.app/?payment=success',
        cancelurl: 'https://coeurnohboost.vercel.app/?payment=failed',
        declineurl: 'https://coeurnohboost.vercel.app/?payment=failed',
        notifyurl: 'https://coeurnohboost.vercel.app/api/payment-webhook?provider=maxicash'
      }
    }
  };
}

/* ========================= ROUTEUR ========================= */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { idToken, provider } = req.body;

    if (!idToken) {
      return res.status(401).json({ error: 'Connexion requise.' });
    }
    let uid;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
    }

    let result;
    if (provider === 'crypto') result = await handleCryptomus(uid, req.body);
    else if (provider === 'mobile') result = await handleMbotepay(uid, req.body);
    else if (provider === 'card') result = await handleMaxicash(uid, req.body);
    else return res.status(400).json({ error: 'provider inconnu' });

    return res.status(result.status).json(result.json);
  } catch (error) {
    console.error('[payment-initiate] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
