api/_lib// api/_lib/maxicash.js
// Aide partagee pour MaxiCash (paiement carte/mobile via la passerelle
// "Form Post"). Fichier dans /_lib : ignore par Vercel pour le compte des
// 12 fonctions serverless du plan gratuit -- ce n'est pas une fonction,
// juste du code partage entre payment-initiate.js et payment-webhook.js.
//
// Methode d'integration choisie : "Form Post" (la plus simple, confirmee
// par l'email de compte marchand MaxiCash -- l'URL sandbox y est donnee
// explicitement). Le navigateur du client soumet lui-meme un formulaire
// HTML vers MaxiCash (voir script.js) ; ce fichier ne fait pas d'appel
// reseau, il fournit juste les URLs et le mode sandbox/live.

// Domaine confirme par l'email de compte marchand (api-testbed.maxicashme.com).
// Pour la prod, MAXICASH_ENV=live dans Vercel bascule sur le domaine live
// -- A CONFIRMER avec MaxiCash/le support avant la mise en prod (l'email
// recu ne donne que les URLs sandbox).
function maxicashIsLive() {
  return (process.env.MAXICASH_ENV || '').toLowerCase() === 'live';
}

function maxicashGatewayFormUrl() {
  return maxicashIsLive()
    ? 'https://api.maxicashme.com/PayEntryPost'
    : 'https://api-testbed.maxicashme.com/PayEntryPost';
}

function maxicashCredentials() {
  const merchantId = process.env.MAXICASH_MERCHANT_ID;
  const merchantPassword = process.env.MAXICASH_MERCHANT_PASSWORD;
  if (!merchantId || !merchantPassword) {
    throw new Error('MAXICASH_MERCHANT_ID ou MAXICASH_MERCHANT_PASSWORD manquant');
  }
  return { merchantId, merchantPassword };
}

module.exports = { maxicashIsLive, maxicashGatewayFormUrl, maxicashCredentials };
