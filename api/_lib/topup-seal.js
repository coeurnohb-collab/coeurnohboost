// api/_lib/topup-seal.js
// « Sceau » des demandes de recharge : protège l'argent même si les règles Firestore laissent un client écrire
// dans la collection topup_requests (la recharge manuelle USDT l'exige).
//
// PRINCIPE : quand le SERVEUR crée une demande de recharge (payment-initiate.js), il y appose un sceau =
// HMAC-SHA256( clé secrète du serveur, personne | montant en dollars | moyen | date de création ).
// Au moment de créditer (creditBalanceOnce dans payment-webhook.js), le sceau est revérifié :
//  - une demande fabriquée ou modifiée depuis un navigateur (montant gonflé, autre personne, autre moyen…) n'a
//    pas de sceau valable → aucun crédit automatique, elle est mise « à vérifier par l'administrateur » ;
//  - les demandes créées AVANT cette mise à jour (sans sceau) restent acceptées pendant une période de transition
//    (jusqu'à LEGACY_UNTIL), seulement si leur date de création est antérieure à SEAL_START.
// La clé n'est jamais envoyée au navigateur : elle vient de TOPUP_SEAL_KEY si définie, sinon de la clé privée
// Firebase déjà présente dans Vercel (aucun réglage à ajouter).

const crypto = require('crypto');

const SEAL_START = Date.parse('2026-11-12T20:00:00.000Z');
const LEGACY_UNTIL = Date.parse('2026-11-30T00:00:00.000Z');

function secretKey(env) {
  env = env || process.env;
  const k = String(env.TOPUP_SEAL_KEY || env.FIREBASE_PRIVATE_KEY || '').trim();
  return k ? crypto.createHash('sha256').update('cn-topup-seal-v1|' + k).digest() : null;
}

function payloadOf(d) {
  const amount = typeof d.amountUSD === 'number' ? d.amountUSD.toFixed(2) : String(d.amountUSD);
  return [String(d.uid || ''), amount, String(d.method || ''), String(d.createdAt || '')].join('|');
}

function sealOf(d, env) {
  const key = secretKey(env);
  if (!key || !d) return '';
  return crypto.createHmac('sha256', key).update(payloadOf(d)).digest('hex');
}

// Renvoie les données de la demande avec son sceau (à utiliser à chaque création côté serveur).
function stamp(data, env) {
  const out = Object.assign({}, data);
  out.seal = sealOf(out, env);
  if (!out.seal) delete out.seal;
  return out;
}

// { ok:true } si la demande peut être créditée automatiquement ; sinon { ok:false, reason }.
function check(data, now, env) {
  const key = secretKey(env);
  if (!key) return { ok: true, reason: 'sans clé serveur' }; // jamais le cas en production (Firebase exige la clé)
  const d = data || {};
  if (typeof d.seal === 'string' && d.seal) {
    const expected = sealOf(d, env);
    const a = Buffer.from(d.seal), b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return { ok: true };
    return { ok: false, reason: 'sceau invalide (demande modifiée)' };
  }
  // Ancienne demande, créée avant le sceau : acceptée seulement pendant la transition.
  const created = Date.parse(d.createdAt || '');
  const t = typeof now === 'number' ? now : Date.now();
  if (Number.isFinite(created) && created < SEAL_START && t < LEGACY_UNTIL) return { ok: true, legacy: true };
  return { ok: false, reason: 'demande sans sceau (non créée par le serveur)' };
}

// Identifiant de document sûr pour « ce paiement a déjà servi » (jamais deux recharges pour un seul paiement).
function claimId(provider, externalId) {
  return crypto.createHash('sha256').update(String(provider) + '|' + String(externalId)).digest('hex').slice(0, 40);
}

module.exports = { sealOf, stamp, check, claimId, SEAL_START, LEGACY_UNTIL };
