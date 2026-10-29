// api/_lib/saspay.js
// Aide pour la passerelle SasPay (docs.saspay.me) : Mobile Money dans plusieurs pays d'Afrique
// via une page de paiement hébergée (checkout). Aucune fonction serverless ajoutée : ce fichier
// est un simple module partagé par api/payment-initiate.js et api/payment-webhook.js.
//
// PRINCIPE DE SÉCURITÉ (le même que pour OPTGateway) :
//  - le solde n'est JAMAIS crédité d'après ce que dit le navigateur ni d'après le contenu brut du webhook ;
//  - le webhook (signé) ou le retour de la personne ne font que DÉCLENCHER une vérification :
//    on redemande à SasPay l'état réel de la session puis du paiement, avec notre clé secrète ;
//  - le montant crédité est toujours celui de NOTRE demande (montant en dollars enregistré côté serveur).

const crypto = require('crypto');

const BASE = (process.env.SASPAY_API_BASE || 'https://api.saspay.me/api/v1').replace(/\/+$/, '');

// Une clé API SasPay ressemble à sk_live_xxxxxxxx (production) ou sk_test_xxxxxxxx (essais sans argent réel).
const API_KEY_RE = /^sk_(live|test)_[A-Za-z0-9_-]{8,}$/;

function clean(v) {
  // Les valeurs collées dans Vercel contiennent parfois un espace, un retour à la ligne ou des guillemets.
  return typeof v === 'string' ? v.trim().replace(/^["']+|["']+$/g, '').trim() : '';
}

// Lit les deux secrets dans les variables d'environnement, quel que soit le nom choisi dans Vercel :
//  - clé API   : SASPAY_API_KEY, SASPAY_SECRET_KEY ou SASPAY_SECRET (la valeur commence par sk_live_ / sk_test_)
//  - secret du webhook : SASPAY_WEBHOOK_SECRET, sinon SASPAY_SECRET / SASPAY_SECRET_KEY (la valeur qui ne commence PAS par sk_)
// Ainsi, une inversion des deux noms dans Vercel ne casse rien.
function getCredentials(env) {
  env = env || process.env;
  let apiKey = '';
  for (const n of ['SASPAY_API_KEY', 'SASPAY_SECRET_KEY', 'SASPAY_SECRET']) {
    const v = clean(env[n]);
    if (API_KEY_RE.test(v)) { apiKey = v; break; }
  }
  let webhookSecret = clean(env.SASPAY_WEBHOOK_SECRET);
  if (!webhookSecret) {
    for (const n of ['SASPAY_SECRET', 'SASPAY_SECRET_KEY']) {
      const v = clean(env[n]);
      if (v && !/^sk_/.test(v)) { webhookSecret = v; break; }
    }
  }
  return { apiKey, webhookSecret, live: apiKey.indexOf('sk_live_') === 0 };
}

// Une clé de test en production créditerait de vrais soldes avec de faux paiements : on la refuse,
// sauf si SASPAY_ALLOW_TEST=1 est défini volontairement.
function testKeyBlocked(creds, env) {
  env = env || process.env;
  return !!creds && creds.apiKey.indexOf('sk_test_') === 0 && env.VERCEL_ENV === 'production' && env.SASPAY_ALLOW_TEST !== '1';
}

/* ------------------------- appels à l'API SasPay ------------------------- */

async function request(path, opts) {
  const o = opts || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), o.timeoutMs || 6000);
  try {
    const headers = { Accept: 'application/json' };
    if (o.apiKey) headers.Authorization = 'Bearer ' + o.apiKey;
    if (o.body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(BASE + path, {
      method: o.method || 'GET',
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
      signal: controller.signal
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* réponse illisible */ }
    return { status: r.status, ok: r.ok, json };
  } finally {
    clearTimeout(timer);
  }
}

// Toutes les réponses SasPay ont la forme { success, data, code } : le contenu utile est dans data.
function unwrap(json) {
  if (json && typeof json === 'object' && json.data && typeof json.data === 'object' && !Array.isArray(json.data)) return json.data;
  return json && typeof json === 'object' ? json : {};
}

function errorMessage(json) {
  if (!json || typeof json !== 'object') return '';
  const e = json.error;
  if (typeof e === 'string') return e;
  if (e && typeof e.message === 'string') return e.message;
  if (typeof json.message === 'string') return json.message;
  return '';
}

/* ------------------------- pays et devises ------------------------- */

// Devise locale par pays : sert de secours quand la liste officielle des pays SasPay n'est pas lisible.
const CURRENCY_BY_COUNTRY = {
  BJ: 'XOF', BF: 'XOF', CI: 'XOF', ML: 'XOF', NE: 'XOF', SN: 'XOF', TG: 'XOF', GW: 'XOF',
  CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GQ: 'XAF', GA: 'XAF',
  CD: 'CDF', GN: 'GNF', GH: 'GHS', NG: 'NGN', KE: 'KES', UG: 'UGX', TZ: 'TZS', ZM: 'ZMW',
  MW: 'MWK', MZ: 'MZN', ET: 'ETB', LS: 'LSL', SL: 'SLE', ZW: 'USD', RW: 'RWF', BI: 'BIF', MG: 'MGA'
};

// Taux de secours (unités locales pour 1 dollar) si le service de taux en direct ne répond pas.
const FALLBACK_RATES = {
  XOF: 600, XAF: 600, CDF: 2800, GNF: 8600, GHS: 12, NGN: 1500, KES: 129, UGX: 3700, TZS: 2600,
  ZMW: 27, MWK: 1750, MZN: 64, ETB: 130, LSL: 18, SLE: 22.5, RWF: 1300, BIF: 2900, MGA: 4500
};
const ZERO_DECIMAL = ['XOF', 'XAF', 'CDF', 'GNF', 'UGX', 'RWF', 'BIF', 'MGA', 'TZS'];

// La liste des pays est publique (aucune clé requise). On accepte plusieurs formes de réponse.
function normalizeCountries(json) {
  let arr = null;
  if (Array.isArray(json)) arr = json;
  else if (json && Array.isArray(json.data)) arr = json.data;
  else if (json && json.data && Array.isArray(json.data.results)) arr = json.data.results;
  else if (json && Array.isArray(json.results)) arr = json.results;
  if (!arr) return [];
  const out = [];
  arr.forEach((c) => {
    if (!c || typeof c !== 'object') return;
    const code = String(c.iso2 || c.iso_code || c.country_code || c.code || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return;
    let cur = c.currency_code || c.default_currency || c.currency;
    if (cur && typeof cur === 'object') cur = cur.code;
    cur = String(cur || '').toUpperCase();
    out.push({ code, currency: /^[A-Z]{3}$/.test(cur) ? cur : '', active: c.is_active === undefined ? true : !!c.is_active });
  });
  return out;
}

let countriesCache = { at: 0, list: null };
// Renvoie la liste des pays SasPay, ou null si elle est illisible (on utilise alors les valeurs de secours).
async function getCountries() {
  const now = Date.now();
  if (countriesCache.list && now - countriesCache.at < 10 * 60 * 1000) return countriesCache.list;
  try {
    const r = await request('/countries/', { timeoutMs: 4000 });
    if (r.ok) {
      const list = normalizeCountries(r.json);
      if (list.length) { countriesCache = { at: now, list }; return list; }
    }
  } catch (e) { /* secours */ }
  return countriesCache.list || null;
}

let ratesCache = { at: 0, rates: null };
// Taux de change du jour (marge appliquée par l'appelant). Renvoie null si aucun taux fiable n'existe.
async function usdRate(currency) {
  const cur = String(currency || '').toUpperCase();
  if (cur === 'USD') return 1;
  const now = Date.now();
  try {
    if (!ratesCache.rates || now - ratesCache.at > 10 * 60 * 1000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
        const j = await r.json();
        if (j && j.result === 'success' && j.rates) ratesCache = { at: now, rates: j.rates };
      } finally { clearTimeout(timer); }
    }
    const live = ratesCache.rates && Number(ratesCache.rates[cur]);
    if (live > 0) return live;
  } catch (e) { /* secours */ }
  return FALLBACK_RATES[cur] || null;
}

// Montant à faire payer en devise locale : dollars × taux × (1 + marge %), arrondi selon la devise.
function toLocalAmount(amountUSD, rate, marginPercent, currency) {
  const raw = amountUSD * rate * (1 + (marginPercent || 0) / 100);
  if (String(currency).toUpperCase() === 'USD') return Math.round(raw * 100) / 100;
  return ZERO_DECIMAL.indexOf(String(currency).toUpperCase()) >= 0 ? Math.ceil(raw) : Math.round(raw * 100) / 100;
}

/* ------------------------- page de paiement (checkout) ------------------------- */

// On ne redirige que vers une adresse saspay.me (jamais vers un lien venu d'ailleurs).
function isSaspayUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /(^|\.)saspay\.me$/i.test(u.hostname);
  } catch (e) { return false; }
}

async function createCheckout(apiKey, payload) {
  const r = await request('/checkout-sessions/', { method: 'POST', apiKey, body: payload, timeoutMs: 6500 });
  const d = unwrap(r.json);
  return {
    ok: r.ok,
    status: r.status,
    id: typeof d.id === 'string' ? d.id : '',
    url: typeof d.checkout_url === 'string' ? d.checkout_url : '',
    message: errorMessage(r.json)
  };
}

/* ------------------------- signature du webhook ------------------------- */

// SasPay envoie X-Webhook-Signature (HMAC-SHA256 hexadécimal en minuscules de « horodatage.corps brut »),
// X-Webhook-Timestamp (secondes) et X-Webhook-Event. On refuse tout écart de plus de 5 minutes (anti-rejeu).
function verifySignature(rawBody, headers, secret, nowMs) {
  const h = headers || {};
  const sig = String(h['x-webhook-signature'] || '').trim().toLowerCase();
  const tsRaw = String(h['x-webhook-timestamp'] || '').trim();
  if (!secret) return { ok: false, reason: 'secret absent' };
  if (!sig || !tsRaw) return { ok: false, reason: 'en-tetes manquants' };
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'horodatage illisible' };
  const tsSec = ts > 1e12 ? ts / 1000 : ts;
  if (Math.abs((nowMs || Date.now()) / 1000 - tsSec) > 300) return { ok: false, reason: 'horodatage hors tolerance' };
  const expected = crypto.createHmac('sha256', secret).update(tsRaw + '.' + rawBody).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'signature invalide' };
  return { ok: true };
}

/* ------------------------- lecture et contrôle d'un paiement ------------------------- */

const SESSION_PAID = ['PAID', 'SUCCESS', 'SUCCEEDED', 'COMPLETED', 'CONFIRMED'];
const SESSION_DEAD = ['FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED'];

function readSession(json) {
  const d = unwrap(json);
  let tx = d.transaction;
  if (tx && typeof tx === 'object') tx = tx.id;
  tx = tx || d.transaction_id || d.payment_id || '';
  return { status: String(d.status || '').toUpperCase(), transactionId: typeof tx === 'string' ? tx : '' };
}

function num(v) {
  const n = Number(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Réponse de GET /payments/{id}/verify/ (champs officiels : status, currency, requested_amount, debited_amount, net_amount).
// Le paiement doit être SUCCESS. Le montant de la SESSION a été fixé par NOS soins côté serveur et SasPay ne la déclare
// « payée » que si la personne a réglé la totalité. Contrôle supplémentaire quand la devise du paiement est la même que
// celle de la session : le montant demandé doit être au moins le nôtre. Si SasPay a converti (Mobile Money, carte, crypto
// dans une autre monnaie), les montants ne sont plus comparables : session PAYÉE + paiement SUCCESS suffisent.
function evaluateVerify(json, expected) {
  const d = unwrap(json);
  const status = String(d.status || '').toUpperCase();
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'CANCELED') return { result: 'failed' };
  if (status !== 'SUCCESS') return { result: 'pending' };
  const cur = String(d.currency || '').toUpperCase();
  const sameCurrency = !!cur && !!expected.currency && cur === String(expected.currency).toUpperCase();
  if (sameCurrency) {
    let paid = [num(d.debited_amount), num(d.requested_amount), num(d.charged), num(d.amount)].filter((n) => n !== null);
    if (!paid.length) paid = [num(d.net_amount)].filter((n) => n !== null);
    if (!paid.length) return { result: 'review', note: 'montant non fourni' };
    if (Math.max.apply(null, paid) + 0.01 < expected.amount) return { result: 'review', note: 'montant inferieur a la demande' };
  }
  return { result: 'paid', converted: !sameCurrency };
}

// Vérifie une de NOS demandes de recharge auprès de SasPay et la crédite si (et seulement si) elle est payée.
// requestDoc : document Firestore topup_requests ; credit : fonction creditBalanceOnce de payment-webhook.js.
// Résultats : credited | already | failed | pending | review | skip | error
async function settleRequest(requestDoc, deps) {
  const r = requestDoc.data() || {};
  if (r.status === 'completed') return 'already';
  const sessionId = typeof r.saspaySessionId === 'string' ? r.saspaySessionId : '';
  if (!sessionId) return 'skip';

  let st;
  try { st = await request('/checkout-sessions/' + encodeURIComponent(sessionId) + '/status/', { apiKey: deps.apiKey, timeoutMs: 5000 }); }
  catch (e) { return 'error'; }
  if (!st.ok) return st.status >= 500 || st.status === 429 ? 'error' : 'skip';

  const s = readSession(st.json);
  if (SESSION_DEAD.indexOf(s.status) >= 0) {
    if (r.status === 'pending_payment') await requestDoc.ref.update({ status: 'failed', saspayNote: s.status.toLowerCase() });
    return 'failed';
  }
  if (SESSION_PAID.indexOf(s.status) < 0) return 'pending';

  let txId = s.transactionId;
  if (!txId) {
    try {
      const det = await request('/checkout-sessions/' + encodeURIComponent(sessionId) + '/', { apiKey: deps.apiKey, timeoutMs: 5000 });
      if (det.ok) txId = readSession(det.json).transactionId;
    } catch (e) { return 'error'; }
  }
  if (!txId) {
    await requestDoc.ref.update({ status: 'pending_admin_review', saspayNote: 'paiement sans transaction identifiable' });
    return 'review';
  }

  let vr;
  try { vr = await request('/payments/' + encodeURIComponent(txId) + '/verify/', { apiKey: deps.apiKey, timeoutMs: 5000 }); }
  catch (e) { return 'error'; }
  if (!vr.ok) return vr.status >= 500 || vr.status === 429 ? 'error' : 'skip';

  const ev = evaluateVerify(vr.json, { currency: r.saspayCurrency, amount: Number(r.saspayAmount) || 0 });
  if (ev.result === 'pending') return 'pending';
  if (ev.result === 'failed') {
    if (r.status === 'pending_payment') await requestDoc.ref.update({ status: 'failed', saspayNote: 'echec' });
    return 'failed';
  }
  if (ev.result === 'review') {
    await requestDoc.ref.update({ status: 'pending_admin_review', saspayNote: ev.note, saspayTransactionId: txId });
    return 'review';
  }

  const amount = r.amountUSD;
  if (typeof amount !== 'number' || !(amount > 0)) return 'skip';
  await requestDoc.ref.update({ saspayTransactionId: txId });
  const out = await deps.credit({
    uid: r.uid, amount, type: 'topup_mobile_money', description: 'Recharge par Mobile Money',
    relatedId: r.saspayReference, requestRef: requestDoc.ref
  });
  return out && out.alreadyCredited ? 'already' : 'credited';
}

module.exports = {
  BASE, API_KEY_RE, CURRENCY_BY_COUNTRY, FALLBACK_RATES,
  getCredentials, testKeyBlocked, request, unwrap, errorMessage,
  normalizeCountries, getCountries, usdRate, toLocalAmount,
  isSaspayUrl, createCheckout, verifySignature,
  readSession, evaluateVerify, settleRequest
};
