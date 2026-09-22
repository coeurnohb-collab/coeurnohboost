// api/payment-initiate.js
// Point d'entree UNIQUE pour demarrer une recharge de solde, quel que soit
// le moyen de paiement (crypto Cryptomus, Mobile Money MboтePay, carte
// bancaire MaxiCash). Fusionne cryptomus-payment.js + mbotepay-payment.js
// + MaxiCash -- comportement IDENTIQUE a avant pour le navigateur, juste
// regroupe dans un routeur par "provider".
//
// Pourquoi cette fusion : Vercel (plan gratuit) limite a 12 fonctions
// serverless dans /api. Voir wallet-ledger.js / maxicash.js pour le detail.
//
// SECURITE (chantier 3) :
//  - jeton Firebase verifie AVEC controle de revocation (security.js)
//  - limite de frequence : 8 demarrages de paiement / 15 min / personne
//  - le MONTANT est valide (nombre fini, entre MIN_TOPUP_USD et MAX_TOPUP_USD)
//  - CRYPTO : la devise est desormais FORCEE a USD cote serveur. Avant, le
//    navigateur pouvait envoyer une autre devise (ex: "RUB" avec amount=1000)
//    et le webhook creditait 1000$ alors que la facture reelle ne valait que
//    quelques dollars.
//  - appels aux fournisseurs avec delai maximum (evite un blocage silencieux
//    jusqu'a la coupure de Vercel)

const admin = require('firebase-admin');
const crypto = require('crypto');
const { maxicashGatewayFormUrl, maxicashCredentials } = require('./_lib/maxicash');
const {
  initFirebaseAdmin, getBody, verifyCaller, enforceRateLimit, sendError, HttpError
} = require('./_lib/security');

initFirebaseAdmin();
const db = admin.firestore();

// Limites d'une recharge, en dollars. Modifiables ici si besoin.
const MIN_TOPUP_USD = 0.5;
const MAX_TOPUP_USD = 1000;

function parseAmountUSD(value) {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded < MIN_TOPUP_USD || rounded > MAX_TOPUP_USD) return null;
  return rounded;
}

const AMOUNT_ERROR = `Montant invalide (entre ${MIN_TOPUP_USD}$ et ${MAX_TOPUP_USD}$).`;

// fetch avec delai maximum : si le fournisseur ne repond pas, on abandonne
// proprement au lieu d'attendre jusqu'a la coupure de la fonction.
async function fetchWithTimeout(url, options, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getUserEmail(uid) {
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) return userSnap.data().email || null;
  } catch (e) { /* pas bloquant, l'email n'est qu'informatif */ }
  return null;
}

/* ========================= CRYPTOMUS ========================= */

async function handleCryptomus(uid, body) {
  const amount = parseAmountUSD(body.amount);
  if (amount === null) {
    return { status: 400, json: { success: false, error: AMOUNT_ERROR } };
  }

  const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
  const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;
  if (!merchantId || !apiKey) {
    console.error('CRYPTOMUS: variables environnement manquantes');
    return { status: 500, json: { success: false, error: 'Configuration serveur manquante' } };
  }

  const orderId = `topup_${uid}_${Date.now()}`;
  const payload = {
    amount: amount.toFixed(2),
    currency: 'USD', // FORCE : jamais la devise envoyee par le navigateur
    order_id: orderId,
    url_callback: 'https://coeurnohboost.vercel.app/api/payment-webhook?provider=cryptomus',
    url_success: 'https://coeurnohboost.vercel.app/?payment=success',
    lifetime: 3600
  };

  const jsonPayload = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonPayload).toString('base64');
  const sign = crypto.createHash('md5').update(base64Payload + apiKey).digest('hex');

  let data;
  try {
    const cryptomusResponse = await fetchWithTimeout('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'merchant': merchantId, 'sign': sign },
      body: jsonPayload
    });
    data = await cryptomusResponse.json();
  } catch (e) {
    console.error('CRYPTOMUS injoignable :', e.message);
    return { status: 502, json: { success: false, error: 'Le service de paiement crypto ne répond pas. Réessaie dans un instant.' } };
  }

  if (data.state !== 0 || !data.result || !data.result.url) {
    console.error('CRYPTOMUS erreur:', data && data.message);
    return { status: 400, json: { success: false, error: (data && data.message) || 'Erreur Cryptomus' } };
  }

  const userEmail = await getUserEmail(uid);
  await db.collection('topup_requests').add({
    uid, email: userEmail, method: 'crypto', amountUSD: amount,
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
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', {}, 4000);
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
  const { countryCode, operatorName, phone, chargeCurrency } = body;
  const amountUSD = parseAmountUSD(body.amountUSD);
  if (amountUSD === null) {
    return { status: 400, json: { supported: true, success: false, error: AMOUNT_ERROR } };
  }
  if (typeof countryCode !== 'string' || typeof operatorName !== 'string' || typeof phone !== 'string') {
    return { status: 400, json: { supported: true, success: false, error: 'Paramètres manquants' } };
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) {
    return { status: 400, json: { supported: true, success: false, error: 'Numéro de téléphone invalide.' } };
  }

  const mapping = Object.prototype.hasOwnProperty.call(MBOTEPAY_MAP, countryCode) ? MBOTEPAY_MAP[countryCode] : null;
  if (!mapping || !Object.prototype.hasOwnProperty.call(mapping.operators, operatorName)) {
    return { status: 200, json: { supported: false } };
  }

  const apiKey = process.env.MBOTEPAY_API_KEY;
  if (!apiKey) {
    console.error('[payment-initiate] MBOTEPAY_API_KEY manquante');
    return { status: 200, json: { supported: false } };
  }

  const finalCurrency = (typeof chargeCurrency === 'string' && mapping.currencies.includes(chargeCurrency)) ? chargeCurrency : mapping.currency;

  let chargeAmount;
  if (finalCurrency === 'USD') {
    chargeAmount = Math.round(amountUSD * 100) / 100;
  } else {
    const rate = await getRate(finalCurrency);
    const adjustedRate = rate * (1 + MARGIN_PERCENT / 100);
    chargeAmount = Math.round(amountUSD * adjustedRate);
  }

  const reference = `topup_${uid}_${Date.now()}`;

  let mbotepayResponse, data;
  try {
    mbotepayResponse = await fetchWithTimeout('https://app.mbotepay.com/api/v1/payin', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': reference },
      body: JSON.stringify({
        amount: chargeAmount, currency: finalCurrency, country: mapping.country,
        operator: mapping.operators[operatorName], phone: digits, reference,
        callback_url: 'https://coeurnohboost.vercel.app/api/payment-webhook?provider=mbotepay'
      })
    });
    data = await mbotepayResponse.json();
  } catch (e) {
    console.error('[payment-initiate] MboтePay injoignable :', e.message);
    return { status: 200, json: { supported: true, success: false, error: 'Le service Mobile Money ne répond pas. Réessaie dans un instant.' } };
  }
  console.log('[payment-initiate] MboтePay statut HTTP =', mbotepayResponse.status);

  if (!mbotepayResponse.ok || data.error) {
    return { status: 200, json: { supported: true, success: false, error: (data.error && data.error.message) || 'Erreur MboтePay' } };
  }

  const userEmail = await getUserEmail(uid);
  await db.collection('topup_requests').add({
    uid, email: userEmail, method: 'mobile', country: mapping.country, operator: operatorName,
    phone: digits, amountUSD, localAmount: chargeAmount,
    localCurrency: finalCurrency, status: 'pending_payment', mbotepayReference: reference,
    createdAt: new Date().toISOString()
  });

  return { status: 200, json: { supported: true, success: true, reference, localAmount: chargeAmount, currency: finalCurrency } };
}

/* ========================= MAXICASH (Carte bancaire) ========================= */
// Methode "Form Post" : on ne fait PAS d'appel reseau ici. On enregistre la
// demande de recharge (comme pour les autres moyens), puis on renvoie au
// frontend les champs a mettre dans un <form method="POST"> que le
// NAVIGATEUR du client soumettra lui-meme vers MaxiCash (voir script.js).
//
// IMPORTANT (chantier 3) : la notification de retour de MaxiCash n'est pas
// signee et le navigateur voit tous les champs du formulaire -- elle ne peut
// donc PAS servir a crediter automatiquement le solde. payment-webhook.js met
// la demande "en attente de validation" et TU la valides dans l'onglet
// Depots de l'admin, apres avoir verifie le paiement dans ton espace
// marchand MaxiCash. Le passage a la methode "PayEntryWeb" (identifiants
// gardes cote serveur) permettra plus tard de le refaire en automatique.

async function handleMaxicash(uid, body) {
  const amountUSD = parseAmountUSD(body.amountUSD);
  if (amountUSD === null) {
    return { status: 400, json: { success: false, error: AMOUNT_ERROR } };
  }

  let credentials;
  try {
    credentials = maxicashCredentials();
  } catch (e) {
    console.error('[payment-initiate][maxicash]', e.message);
    return { status: 500, json: { success: false, error: 'Configuration serveur manquante' } };
  }

  // amount en CENTIMES, exige par MaxiCash (ex: 1 USD => 100)
  const amountCents = Math.round(amountUSD * 100);

  // max ~30 caracteres
  const reference = `mc${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;

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
    uid, email, method: 'card', amountUSD,
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

  const body = getBody(req);
  const provider = body.provider;

  try {
    const caller = await verifyCaller(req);
    await enforceRateLimit({ scope: 'pay-init', id: caller.uid, limit: 8, windowSec: 900 });

    let result;
    if (provider === 'crypto') result = await handleCryptomus(caller.uid, body);
    else if (provider === 'mobile') result = await handleMbotepay(caller.uid, body);
    else if (provider === 'card') result = await handleMaxicash(caller.uid, body);
    else return res.status(400).json({ success: false, error: 'provider inconnu' });

    return res.status(result.status).json(result.json);
  } catch (error) {
    // Le navigateur lit "supported"/"success" pour le Mobile Money : on garde
    // cette forme meme pour un refus "trop de demandes".
    if (error instanceof HttpError && error.status === 429 && provider === 'mobile') {
      res.setHeader('Retry-After', String(error.extra.retryAfterSec || 60));
      return res.status(429).json({ supported: true, success: false, error: error.message });
    }
    return sendError(res, error, 'payment-initiate');
  }
};
