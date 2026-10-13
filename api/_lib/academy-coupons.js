// api/_lib/academy-coupons.js
// Codes promo de l'Academie (cours et livres). Fichier PUR : aucune base de donnees ici.
// Il est dans /_lib : ce n'est PAS une fonction serverless (limite de 12 sur le plan gratuit).
//
// Regles :
//  - le code est cree par le vendeur du contenu, pour CE contenu seulement ;
//  - la reduction va de 1 % a 90 % et est prise sur la part du vendeur
//    (la commission de la plateforme se calcule sur le prix reellement paye) ;
//  - un code peut avoir un nombre maximum d'utilisations et une date de fin.

const MIN_PERCENT = 1;
const MAX_PERCENT = 90;
const MAX_COUPONS_PER_ITEM = 20;

// Tolerant : « bienvenue.10 », « Bienvenue 10 », « BIENVENUE-10 » donnent tous BIENVENUE10
// (accents, espaces et ponctuation sont retires, tout passe en majuscules).
function normalizeCode(code) {
  if (typeof code !== 'string') return null;
  const c = code.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{3,20}$/.test(c) ? c : null;
}

function couponId(kind, itemId, code) {
  return `${kind}_${itemId}_${code}`;
}

function cleanPercent(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < MIN_PERCENT || n > MAX_PERCENT) return null;
  return n;
}

function validateCoupon(data, nowMs) {
  if (!data) return { ok: false, message: 'Code promo invalide.' };
  if (data.active === false) return { ok: false, message: "Ce code promo n'est plus actif." };
  if (data.expiresAtMs && Number(data.expiresAtMs) > 0 && nowMs > Number(data.expiresAtMs)) {
    return { ok: false, message: 'Ce code promo a expiré.' };
  }
  const max = Number(data.maxUses) || 0;
  if (max > 0 && (Number(data.uses) || 0) >= max) return { ok: false, message: 'Ce code promo a atteint sa limite d\'utilisations.' };
  const p = cleanPercent(data.percent);
  if (p === null) return { ok: false, message: 'Code promo invalide.' };
  return { ok: true, percent: p };
}

function applyDiscount(price, percent) {
  const final = Math.round(price * (1 - percent / 100) * 100) / 100;
  return Math.max(0.01, Math.min(price, final));
}

module.exports = { MIN_PERCENT, MAX_PERCENT, MAX_COUPONS_PER_ITEM, normalizeCode, couponId, cleanPercent, validateCoupon, applyDiscount };
