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

// Langue de l'interface choisie par la personne (profil users/{uid}.lang), français par défaut.
async function getUserLang(uid) {
  try {
    const s = await db.collection('users').doc(uid).get();
    const l = s.exists ? s.data().lang : null;
    return ['fr', 'en', 'es', 'it', 'pt'].includes(l) ? l : 'fr';
  } catch (e) { return 'fr'; }
}

// Messages affichés quand le Mobile Money ne peut pas être utilisé. Ton posé, avec une issue claire (la crypto).
const MOBILE_MSG = {
  country: {
    fr: "Le paiement par Mobile Money n'est pas encore disponible dans ton pays. Pas de souci : le paiement par crypto fonctionne partout. Choisis « Crypto » ci-dessus pour recharger en quelques minutes.",
    en: "Mobile Money payments are not available in your country yet. No worries: crypto payment works everywhere. Choose “Crypto” above to top up in a few minutes.",
    es: "El pago por Mobile Money aún no está disponible en tu país. Sin problema: el pago con cripto funciona en todas partes. Elige «Cripto» arriba para recargar en pocos minutos.",
    it: "Il pagamento con Mobile Money non è ancora disponibile nel tuo paese. Nessun problema: il pagamento in cripto funziona ovunque. Scegli «Cripto» qui sopra per ricaricare in pochi minuti.",
    pt: "O pagamento por Mobile Money ainda não está disponível no seu país. Sem problema: o pagamento em cripto funciona em qualquer lugar. Escolha «Cripto» acima para recarregar em poucos minutos."
  },
  operator: {
    fr: "Cet opérateur n'est pas disponible pour le moment dans ton pays. Choisis un autre opérateur, ou utilise le paiement par crypto, disponible partout.",
    en: "This operator is not available in your country at the moment. Pick another operator, or use crypto payment, available everywhere.",
    es: "Este operador no está disponible por ahora en tu país. Elige otro operador o usa el pago con cripto, disponible en todas partes.",
    it: "Questo operatore al momento non è disponibile nel tuo paese. Scegli un altro operatore oppure usa il pagamento in cripto, disponibile ovunque.",
    pt: "Este operador não está disponível no momento no seu país. Escolha outro operador ou use o pagamento em cripto, disponível em qualquer lugar."
  },
  unavailable: {
    fr: "Le paiement par Mobile Money est momentanément indisponible. Réessaie un peu plus tard, ou utilise le paiement par crypto.",
    en: "Mobile Money payment is temporarily unavailable. Please try again later, or use crypto payment.",
    es: "El pago por Mobile Money no está disponible temporalmente. Inténtalo más tarde o usa el pago con cripto.",
    it: "Il pagamento con Mobile Money è temporaneamente non disponibile. Riprova più tardi oppure usa il pagamento in cripto.",
    pt: "O pagamento por Mobile Money está temporariamente indisponível. Tente novamente mais tarde ou use o pagamento em cripto."
  }
};
async function mobileUnavailable(uid, reason, operators) {
  const lang = await getUserLang(uid);
  // supported:true + success:false → l'application affiche ce texte au lieu de créer une demande « manuelle » silencieuse.
  return { status: 200, json: { supported: true, success: false, code: 'mobile_' + reason, error: MOBILE_MSG[reason][lang], availableOperators: operators || [] } };
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

  // Cryptomus répond parfois lentement ou par une page d'erreur : on réessaie une fois (2 essais de 4,5 s max,
  // le total reste sous la limite de 10 s de Vercel) et on note la vraie raison pour comprendre le souci.
  let data = null, lastReason = '';
  for (let attempt = 1; attempt <= 2 && !data; attempt++) {
    try {
      const cryptomusResponse = await fetchWithTimeout('https://api.cryptomus.com/v1/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'merchant': merchantId, 'sign': sign },
        body: jsonPayload
      }, 4500);
      const text = await cryptomusResponse.text();
      try { data = JSON.parse(text); }
      catch (e) { lastReason = 'réponse illisible, HTTP ' + cryptomusResponse.status; }
    } catch (e) {
      lastReason = e && e.name === 'AbortError' ? 'délai dépassé' : 'connexion impossible';
    }
  }
  if (!data) {
    console.error('CRYPTOMUS injoignable :', lastReason);
    return { status: 502, json: { success: false, error: 'Le service de paiement crypto ne répond pas (' + lastReason + '). Réessaie dans un instant.' } };
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
  if (!mapping) return await mobileUnavailable(uid, 'country');
  if (!Object.prototype.hasOwnProperty.call(mapping.operators, operatorName)) {
    return await mobileUnavailable(uid, 'operator', Object.keys(mapping.operators));
  }

  const apiKey = process.env.MBOTEPAY_API_KEY;
  if (!apiKey) {
    console.error('[payment-initiate] MBOTEPAY_API_KEY manquante');
    return await mobileUnavailable(uid, 'unavailable');
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

/* ========================= OPTGATEWAY (carte + Mobile Money + illicocash) ========================= */
// Page de paiement HEBERGEE par OPTGateway : le serveur cree une "session" avec la
// cle secrete (jamais visible du navigateur), puis le client est redirige vers
// l'adresse "url" renvoyee. Le solde n'est credite QUE par payment-webhook.js,
// apres re-verification de la session aupres d'OPTGateway (jamais d'apres le
// retour navigateur, qui peut etre modifie par le client).

const OPTGATEWAY_BASE = (process.env.OPTGATEWAY_API_BASE || 'https://pay.optsolution.pro').replace(/\/+$/, '');

// Minimum pour ce moyen : la carte bancaire est refusee par OPTGateway sous un certain montant
// (constate a 1 $). Modifiable ici si OPTGateway confirme un autre seuil.
const MIN_OPT_USD = 2;

async function handleOptgateway(uid, body) {
  const amount = parseAmountUSD(body.amountUSD != null ? body.amountUSD : body.amount);
  if (amount === null) {
    return { status: 400, json: { success: false, error: AMOUNT_ERROR } };
  }
  if (amount < MIN_OPT_USD) {
    return { status: 400, json: { success: false, error: `Montant minimum : ${MIN_OPT_USD}$ pour ce moyen de paiement.` } };
  }

  const apiKey = process.env.OPTGATEWAY_API_KEY;
  if (!apiKey) {
    console.error('[payment-initiate][optgateway] OPTGATEWAY_API_KEY manquante');
    return { status: 500, json: { success: false, error: 'Configuration serveur manquante' } };
  }

  // Reference unique, courte, sans information personnelle.
  const reference = `og${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
  const payload = {
    amount: amount.toFixed(2),   // texte, en unites normales (ex. "12.50")
    currency: 'USD',              // FORCE : jamais la devise envoyee par le navigateur
    reference,
    description: 'Recharge Coeurnoh Universe',
    // Le moyen choisi dans l'app (carte ou illicocash) limite la session à ce seul moyen
    methods: (body && ['card', 'illicocash'].indexOf(body.onlyMethod) >= 0) ? [body.onlyMethod] : ['card', 'mobile_money', 'illicocash'],
    return_url: 'https://coeurnohboost.vercel.app/?payment=success',
    cancel_url: 'https://coeurnohboost.vercel.app/?payment=failed',
    expires_in_minutes: 60,
    metadata: { kind: 'topup' }
  };

  let data = null, httpStatus = 0, lastReason = '';
  for (let attempt = 1; attempt <= 2 && !data; attempt++) {
    try {
      const r = await fetchWithTimeout(OPTGATEWAY_BASE + '/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': reference },
        body: JSON.stringify(payload)
      }, 4500);
      httpStatus = r.status;
      const text = await r.text();
      try { data = JSON.parse(text); }
      catch (e) { lastReason = 'réponse illisible, HTTP ' + r.status; }
    } catch (e) {
      lastReason = e && e.name === 'AbortError' ? 'délai dépassé' : 'connexion impossible';
    }
  }
  if (!data) {
    console.error('[payment-initiate][optgateway] injoignable :', lastReason);
    return { status: 502, json: { success: false, error: 'Le service de paiement ne répond pas (' + lastReason + '). Réessaie dans un instant.' } };
  }

  const session = (data && typeof data.data === 'object' && data.data) || (data && typeof data.session === 'object' && data.session) || data;
  const url = session && typeof session.url === 'string' ? session.url : '';
  const sessionId = session && typeof session.id === 'string' ? session.id : '';
  if (httpStatus >= 400 || !url || !sessionId) {
    const msg = data && data.error && (data.error.message || (typeof data.error === 'string' ? data.error : ''));
    console.error('[payment-initiate][optgateway] erreur HTTP', httpStatus, msg || '');
    return { status: 400, json: { success: false, error: (typeof msg === 'string' && msg.slice(0, 140)) || 'Le service de paiement a refusé la demande.' } };
  }
  // On ne redirige que vers l'adresse de la passerelle (jamais vers un lien venu d'ailleurs).
  let host = '';
  try { host = new URL(url).hostname; } catch (e) { /* url invalide */ }
  const allowedHost = new URL(OPTGATEWAY_BASE).hostname;
  if (host !== allowedHost) {
    console.error('[payment-initiate][optgateway] url de paiement inattendue :', host);
    return { status: 502, json: { success: false, error: 'Réponse inattendue du service de paiement.' } };
  }

  const userEmail = await getUserEmail(uid);
  await db.collection('topup_requests').add({
    uid, email: userEmail, method: 'optgateway', amountUSD: amount,
    status: 'pending_payment', optgatewayReference: reference,
    optgatewaySessionId: sessionId, createdAt: new Date().toISOString()
  });

  return { status: 200, json: { success: true, paymentUrl: url, reference } };
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
    else if (provider === 'optgateway') result = await handleOptgateway(caller.uid, body);
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
