// api/payment-initiate.js
// Point d'entree UNIQUE pour demarrer une recharge de solde, quel que soit
// le moyen de paiement (crypto Cryptomus, Mobile Money MboтePay, carte
// bancaire CinetPay). Fusionne cryptomus-payment.js + mbotepay-payment.js
// + CinetPay ajoute dedans -- comportement IDENTIQUE a avant pour
// Cryptomus et MboтePay, juste regroupe dans un routeur par "provider".
//
// Pourquoi cette fusion : Vercel (plan gratuit) limite a 12 fonctions
// serverless dans /api, et le dossier etait deja a 12/12. Ajouter CinetPay
// en fichiers separes aurait bloque le deploiement. En fusionnant les 2
// fichiers de paiement existants en 1 seul, on retombe a 10/12 avec
// CinetPay inclus, avec 2 places de reserve pour plus tard.

const crypto = require('crypto');
const admin = require('firebase-admin');
const { getCinetpayToken, cinetpayBaseUrl } = require('./_lib/cinetpay');

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

/* ========================= CINETPAY (Carte bancaire) ========================= */

async function handleCinetpay(uid, body) {
  const { amountUSD } = body;
  if (!amountUSD || amountUSD <= 0) {
    return { status: 400, json: { error: 'amountUSD (positif) est requis' } };
  }

  // Le compte CinetPay de Coeurnoh Boost est enregistre pour la RDC : toute
  // transaction doit obligatoirement etre en CDF ("Votre compte est lie a
  // une seule devise", regle CinetPay). Meme conversion (+5% de marge) que
  // pour MboтePay, pour rester coherent sur toute l'app.
  const rate = await getRate('CDF');
  const adjustedRate = rate * (1 + MARGIN_PERCENT / 100);
  const chargeAmount = Math.round(amountUSD * adjustedRate);

  if (chargeAmount < 100) {
    return { status: 400, json: { error: 'Montant minimum non atteint' } };
  }

  // max 30 caracteres exiges par CinetPay pour merchant_transaction_id
  const merchantTransactionId = `cp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  let firstName = 'Client', lastName = 'Coeurnoh', email = null;
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) {
      const u = userSnap.data();
      email = u.email || null;
      if (u.name) {
        const parts = String(u.name).trim().split(/\s+/);
        firstName = parts[0] || firstName;
        lastName = parts.slice(1).join(' ') || parts[0] || lastName;
      }
    }
  } catch (e) { /* pas bloquant, valeurs par defaut utilisees */ }

  let token;
  try {
    token = await getCinetpayToken();
  } catch (e) {
    console.error('[payment-initiate][cinetpay] Auth echouee :', e.message);
    return { status: 500, json: { error: `Authentification CinetPay: ${e.message}` } };
  }

  const cinetpayResponse = await fetch(`${cinetpayBaseUrl()}/v1/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      currency: 'CDF',
      payment_method: 'VISA_CD',
      merchant_transaction_id: merchantTransactionId,
      amount: chargeAmount,
      lang: 'fr',
      designation: 'Recharge solde Coeurnoh Boost',
      client_email: email || 'client@coeurnohboost.app',
      client_first_name: firstName,
      client_last_name: lastName,
      success_url: 'https://coeurnohboost.vercel.app/?payment=success',
      failed_url: 'https://coeurnohboost.vercel.app/?payment=failed',
      notify_url: 'https://coeurnohboost.vercel.app/api/payment-webhook?provider=cinetpay',
      direct_pay: false
    })
  });
  const data = await cinetpayResponse.json();

  if (!cinetpayResponse.ok || data.code !== 200 || !data.payment_url) {
    console.error('[payment-initiate][cinetpay] Erreur :', data);
    const errMsg = data.message || (data.details && data.details.message) || `code ${data.code || cinetpayResponse.status}`;
    return { status: 400, json: { error: errMsg } };
  }

  await db.collection('topup_requests').add({
    uid, email, method: 'card', amountUSD: Number(amountUSD), localAmount: chargeAmount,
    localCurrency: 'CDF', status: 'pending_payment', cinetpayMerchantTransactionId: merchantTransactionId,
    cinetpayNotifyToken: data.notify_token || null, createdAt: new Date().toISOString()
  });

  return { status: 200, json: { success: true, paymentUrl: data.payment_url } };
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
    else if (provider === 'card') result = await handleCinetpay(uid, req.body);
    else return res.status(400).json({ error: 'provider inconnu' });

    return res.status(result.status).json(result.json);
  } catch (error) {
    console.error('[payment-initiate] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
