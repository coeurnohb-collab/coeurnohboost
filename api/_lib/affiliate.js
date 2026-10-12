// api/_lib/affiliate.js
// Programme d'affiliation de l'Academie (cours et livres).
// Fichier PUR (aucun acces base de donnees) : il ne fait que calculer le partage d'une vente.
// Il est dans /_lib : ce n'est PAS une fonction serverless (limite de 12 sur le plan gratuit).
//
// Regles :
//  - la plateforme garde TOUJOURS sa commission (15 %) : l'affiliation ne la reduit jamais ;
//  - le pourcentage d'affiliation est choisi par le vendeur (0 a 40 %), pris sur SA part ;
//  - le prix vient toujours de la base, jamais du client.

const MAX_AFFILIATE_PERCENT = 40;

function clampAffiliatePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_AFFILIATE_PERCENT, Math.round(n * 10) / 10);
}

// Identifiant d'affilie accepte : forme d'un uid Firebase, jamais vide, jamais l'acheteur ni le vendeur.
function cleanAffiliateUid(candidate, { buyerUid, ownerUid, adminUid }) {
  if (typeof candidate !== 'string') return null;
  const c = candidate.trim();
  if (!/^[A-Za-z0-9]{10,64}$/.test(c)) return null;
  if (c === buyerUid || c === ownerUid || c === adminUid) return null;
  return c;
}

const r2 = (x) => Math.round(x * 100) / 100;

// Retourne { ownerPayout, adminCommission, affiliateAmount } ; la somme des trois = price.
function splitSale({ price, commissionPercent, affiliatePercent }) {
  const base = r2(price * (1 - commissionPercent / 100));
  const adminCommission = r2(price - base);
  let affiliateAmount = r2(price * clampAffiliatePercent(affiliatePercent) / 100);
  if (affiliateAmount > base) affiliateAmount = base;
  const ownerPayout = r2(base - affiliateAmount);
  return { ownerPayout, adminCommission, affiliateAmount };
}

module.exports = { MAX_AFFILIATE_PERCENT, clampAffiliatePercent, cleanAffiliateUid, splitSale };
