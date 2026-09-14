// api/_lib/cinetpay.js
// Aide partagee pour l'API CinetPay ("Aurore"). Fichier dans /_lib : ignore
// par Vercel pour le compte des 12 fonctions serverless du plan gratuit
// (comme wallet-ledger.js) -- ce n'est pas une fonction, juste du code
// partage entre payment-initiate.js et payment-webhook.js.
//
// Authentification : on echange CINETPAY_API_KEY + CINETPAY_API_PASSWORD
// contre un jeton (POST /v1/oauth/login), garde en memoire jusqu'a son
// expiration pour eviter de le redemander a chaque appel.

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function cinetpayBaseUrl() {
  const apiKey = process.env.CINETPAY_API_KEY || '';
  // Detection automatique sandbox/production a partir du prefixe de la cle,
  // comme le fait le SDK officiel CinetPay (sk_test_ -> sandbox, sk_live_ -> prod).
  return apiKey.startsWith('sk_live_') ? 'https://api.cinetpay.co' : 'https://api.cinetpay.net';
}

async function getCinetpayToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const apiKey = process.env.CINETPAY_API_KEY;
  const apiPassword = process.env.CINETPAY_API_PASSWORD;
  if (!apiKey || !apiPassword) {
    throw new Error('CINETPAY_API_KEY ou CINETPAY_API_PASSWORD manquant');
  }

  const response = await fetch(`${cinetpayBaseUrl()}/v1/oauth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, api_password: apiPassword })
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error('[cinetpay] Echec authentification :', data);
    throw new Error('Authentification CinetPay echouee');
  }

  cachedToken = data.access_token;
  // Marge de securite de 2 minutes avant l'expiration reelle du jeton.
  cachedTokenExpiresAt = now + ((data.expires_in || 3000) - 120) * 1000;
  return cachedToken;
}

// Recupere le statut CANONIQUE (fiable) d'un paiement aupres de CinetPay.
// A utiliser TOUJOURS au webhook, jamais le contenu du payload recu --
// n'importe qui connaissant l'URL du webhook peut le forger (avertissement
// explicite de la doc CinetPay elle-meme : "Ne faites JAMAIS confiance au
// statut transmis dans le webhook").
async function getCinetpayPaymentStatus(merchantTransactionId) {
  const token = await getCinetpayToken();
  const response = await fetch(`${cinetpayBaseUrl()}/v1/payment/${merchantTransactionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json(); // { code, status, merchant_transaction_id, transaction_id }
}

module.exports = { cinetpayBaseUrl, getCinetpayToken, getCinetpayPaymentStatus };
