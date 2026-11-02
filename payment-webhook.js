// api/payment-webhook.js
// Point d'entree UNIQUE pour les webhooks de paiement, distingues par
// ?provider= dans l'URL (cryptomus / mbotepay / optgateway / saspay).
//
// bodyParser desactive globalement car MboтePay a besoin du corps BRUT
// exact pour verifier sa signature HMAC -- Cryptomus est donc parse
// manuellement (JSON.parse) ci-dessous.
//
// SECURITE (chantier 3) :
//  - CRYPTOMUS et MBOTEPAY : signature deja verifiee comme avant (aucun
//    changement de comportement), mais le "deja credite ?" est maintenant
//    verifie A L'INTERIEUR de la transaction Firestore, pas juste avant.
//    AVANT : si le fournisseur envoyait deux fois la meme notification en
//    meme temps (ce qui arrive reellement, "at-least-once delivery"), les
//    deux passaient la verification avant que l'une des deux ait fini
//    d'ecrire -> double credit. Desormais impossible : la transaction relit
//    le statut au moment d'ecrire et abandonne si c'est deja "completed".

const crypto = require('crypto');
const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');
const { initFirebaseAdmin, cleanText, verifyCaller, enforceRateLimit, HttpError } = require('./_lib/security');
const saspay = require('./_lib/saspay');
const { sendPushToUser } = require('./_lib/push');

initFirebaseAdmin();
const db = admin.firestore();

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      // Garde-fou : un webhook n'a aucune raison de depasser 200 Ko.
      if (size > 200 * 1024) { reject(new Error('Corps de requete trop volumineux')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Credite le solde UNE SEULE FOIS, meme si le fournisseur renvoie la meme
// notification plusieurs fois en parallele : tout se decide a l'interieur de
// la transaction, sur l'etat lu a cet instant precis (pas celui lu plus tot
// par l'appelant).
async function creditBalanceOnce({ uid, amount, type, description, relatedId, requestRef }) {
  const userRef = db.collection('users').doc(uid);
  const result = await db.runTransaction(async (transaction) => {
    const [userSnap, reqSnap] = await Promise.all([transaction.get(userRef), transaction.get(requestRef)]);
    if (!reqSnap.exists) throw new Error(`Demande ${requestRef.id} introuvable`);
    if (reqSnap.data().status === 'completed') return { alreadyCredited: true };
    if (!userSnap.exists) throw new Error(`Utilisateur ${uid} introuvable`);

    const currentBalance = userSnap.data().balance || 0;
    const newBalance = Math.round((currentBalance + amount) * 100) / 100;
    transaction.update(userRef, { balance: newBalance });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type, amount, balanceAfter: newBalance, description, relatedId
    }));
    transaction.update(requestRef, { status: 'completed', completedAt: new Date().toISOString(), amountCredited: amount });
    transaction.set(db.collection('notifications').doc(), {
      uid, title: 'Solde rechargé 💰', body: `Ton compte a été crédité de ${amount.toFixed(2)}$.`,
      type: 'recharge', read: false, createdAt: new Date().toISOString()
    });
    return { alreadyCredited: false, newBalance };
  });

  if (!result.alreadyCredited) {
    await sendPushToUser(uid, 'Solde rechargé 💰', `Ton compte a été crédité de ${amount.toFixed(2)}$.`, '/?tab=wallet');
  }
  return result;
}

/* ========================= CRYPTOMUS ========================= */

async function handleCryptomusWebhook(rawBody, res) {
  let body;
  try { body = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'JSON invalide' }); }

  const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;
  if (!apiKey) {
    console.error('CRYPTOMUS WEBHOOK: cle API manquante');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const receivedSign = body.sign;
  const bodyForCheck = { ...body };
  delete bodyForCheck.sign;
  const jsonPayload = JSON.stringify(bodyForCheck);
  const base64Payload = Buffer.from(jsonPayload).toString('base64');
  const expectedSign = crypto.createHash('md5').update(base64Payload + apiKey).digest('hex');

  if (typeof receivedSign !== 'string' || receivedSign.length !== expectedSign.length ||
      !crypto.timingSafeEqual(Buffer.from(receivedSign), Buffer.from(expectedSign))) {
    console.error('CRYPTOMUS WEBHOOK: signature invalide, requete ignoree');
    return res.status(403).json({ error: 'Signature invalide' });
  }

  const status = body.status;
  const orderId = body.order_id;
  if (status !== 'paid' && status !== 'paid_over') {
    console.log(`CRYPTOMUS WEBHOOK: statut "${status}" pour ${orderId}, aucune action`);
    return res.status(200).json({ received: true });
  }

  const parts = String(orderId).split('_');
  if (parts[0] !== 'topup' || parts.length < 3) {
    console.error('CRYPTOMUS WEBHOOK: order_id invalide:', orderId);
    return res.status(400).json({ error: 'order_id invalide' });
  }
  const uid = parts.slice(1, -1).join('_');

  const requestsSnap = await db.collection('topup_requests').where('cryptomusOrderId', '==', orderId).limit(1).get();
  if (requestsSnap.empty) {
    console.error('CRYPTOMUS WEBHOOK: aucune demande trouvee pour', orderId);
    return res.status(404).json({ error: 'Demande introuvable' });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  // Le montant credite reste TOUJOURS celui de notre propre demande
  // (amountUSD, fixe des payment-initiate en devise forcee USD), jamais celui
  // renvoye par le webhook -- meme signe, autant ne dependre que de nos
  // propres donnees pour le montant credite.
  const amountPaid = requestData.amountUSD;
  if (typeof amountPaid !== 'number' || !(amountPaid > 0)) {
    console.error('CRYPTOMUS WEBHOOK: montant de la demande invalide pour', orderId);
    return res.status(400).json({ error: 'Montant de la demande invalide' });
  }

  const result = await creditBalanceOnce({ uid, amount: amountPaid, type: 'topup_crypto', description: 'Recharge par crypto-monnaie', relatedId: orderId, requestRef: requestDoc.ref });
  if (result.alreadyCredited) {
    console.log('CRYPTOMUS WEBHOOK: deja credite pour', orderId);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }
  console.log(`CRYPTOMUS WEBHOOK: ${amountPaid}$ credites a ${uid} (order ${orderId})`);
  return res.status(200).json({ received: true, credited: true });
}

/* ========================= MBOTEPAY ========================= */

async function handleMbotepayWebhook(rawBody, req, res) {
  const secret = process.env.MBOTEPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[mbotepay-webhook] MBOTEPAY_WEBHOOK_SECRET manquant');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const sigHeader = req.headers['x-mbotepay-signature'] || '';
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const timestamp = parts.t;
  const receivedSig = parts.v1;

  if (!timestamp || !receivedSig) {
    console.error('[mbotepay-webhook] En-tete de signature absent ou mal forme');
    return res.status(403).json({ error: 'Signature manquante' });
  }

  // Fenetre de tolerance de 5 minutes : empeche de rejouer une vieille
  // notification (interceptee ou fuitee) indefiniment.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.error('[mbotepay-webhook] Horodatage hors fenetre, requete ignoree');
    return res.status(403).json({ error: 'Signature expirée' });
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
  const validSignature = receivedSig.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));

  if (!validSignature) {
    console.error('[mbotepay-webhook] Signature invalide, requete ignoree');
    return res.status(403).json({ error: 'Signature invalide' });
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'JSON invalide' }); }
  const reference = payload.reference;
  const status = payload.status;

  if (!reference) {
    console.error('[mbotepay-webhook] Reference absente dans le payload');
    return res.status(400).json({ error: 'Reference absente' });
  }

  const requestsSnap = await db.collection('topup_requests').where('mbotepayReference', '==', reference).limit(1).get();
  if (requestsSnap.empty) {
    console.error('[mbotepay-webhook] Aucune demande trouvee pour', reference);
    return res.status(404).json({ error: 'Demande introuvable' });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  if (requestData.status === 'failed') {
    console.log('[mbotepay-webhook] Deja marque echoue pour', reference);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  if (status === 'completed') {
    const amountUSD = requestData.amountUSD || 0;
    const result = await creditBalanceOnce({ uid: requestData.uid, amount: amountUSD, type: 'topup_mobile_money', description: 'Recharge par Mobile Money', relatedId: reference, requestRef: requestDoc.ref });
    if (result.alreadyCredited) return res.status(200).json({ received: true, alreadyProcessed: true });
    console.log(`[mbotepay-webhook] ${amountUSD}$ credites a ${requestData.uid} (ref ${reference})`);
    return res.status(200).json({ received: true, credited: true });
  } else {
    await requestDoc.ref.update({ status: 'failed' });
    console.log(`[mbotepay-webhook] Paiement echoue pour ${reference}`);
    return res.status(200).json({ received: true, credited: false });
  }
}

/* ========================= OPTGATEWAY ========================= */
// SECURITE : on ne fait JAMAIS confiance au contenu de la notification pour crediter.
// La notification sert seulement a RETROUVER notre demande (par l'identifiant de session
// ou la reference que NOUS avons creee). Ensuite on redemande l'etat reel de la session
// a OPTGateway avec notre cle secrete (GET /v1/checkout/sessions/:id), comme le recommande
// leur documentation, et on ne credite que si : session payee + reference identique +
// montant au moins egal a celui de NOTRE demande + devise USD. Le montant credite est
// toujours celui de notre propre demande. Credit une seule fois (creditBalanceOnce).

const OPT_BASE = (process.env.OPTGATEWAY_API_BASE || 'https://pay.optsolution.pro').replace(/\/+$/, '');
const OPT_PAID = ['succeeded', 'success', 'completed', 'paid'];
const OPT_FAILED = ['failed', 'expired', 'canceled', 'cancelled'];

function collectStrings(value, out, depth) {
  if (depth > 6 || out.length > 200) return out;
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => collectStrings(v, out, depth + 1));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectStrings(v, out, depth + 1));
  return out;
}

async function fetchOptSession(sessionId, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetch(OPT_BASE + '/v1/checkout/sessions/' + encodeURIComponent(sessionId), {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      signal: controller.signal
    });
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    const s = (j && typeof j.data === 'object' && j.data) || (j && typeof j.session === 'object' && j.session) || j;
    return { ok: true, session: s };
  } finally {
    clearTimeout(timer);
  }
}

// Signature officielle OPTGateway : en-tete "OPTGateway-Signature: t=<horodatage>,v1=<signature>",
// signature = HMAC-SHA256(secret, horodatage + "." + corps brut), refus si horodatage > 5 min.
// Active des que OPTGATEWAY_WEBHOOK_SECRET est defini dans Vercel (secret de signature affiche dans
// OPTGateway > Webhooks). Meme sans elle, le credit reste protege par la re-verification de la session.
function verifyOptSignature(rawBody, req, secret) {
  const header = String((req.headers && req.headers['optgateway-signature']) || '');
  const parts = {};
  header.split(',').forEach(p => { const i = p.indexOf('='); if (i > 0) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  const ts = Number(parts.t);
  if (!parts.t || !parts.v1 || !Number.isFinite(ts)) return false;
  // Horodatage en secondes ou en millisecondes : on accepte les deux, fenetre de 5 minutes.
  const tsSec = ts > 1e12 ? ts / 1000 : ts;
  if (Math.abs(Date.now() / 1000 - tsSec) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(parts.t + '.' + rawBody).digest('hex');
  return parts.v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}

async function handleOptgatewayWebhook(rawBody, req, res) {
  const apiKey = process.env.OPTGATEWAY_API_KEY;
  if (!apiKey) {
    console.error('[optgateway-webhook] OPTGATEWAY_API_KEY manquante');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }
  const whSecret = process.env.OPTGATEWAY_WEBHOOK_SECRET;
  if (whSecret && !verifyOptSignature(rawBody, req, whSecret)) {
    console.error('[optgateway-webhook] signature invalide ou expiree, requete ignoree');
    return res.status(403).json({ error: 'Signature invalide' });
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'JSON invalide' }); }

  // Retrouver NOTRE demande a partir des identifiants contenus dans la notification.
  const strings = collectStrings(payload, [], 0);
  const sessionIds = [...new Set(strings.filter(s => /^cs_(live|test)_[A-Za-z0-9]+$/.test(s)))].slice(0, 3);
  const references = [...new Set(strings.filter(s => /^og[a-z0-9]{10,24}$/.test(s)))].slice(0, 3);

  let requestDoc = null;
  for (const id of sessionIds) {
    const snap = await db.collection('topup_requests').where('optgatewaySessionId', '==', id).limit(1).get();
    if (!snap.empty) { requestDoc = snap.docs[0]; break; }
  }
  if (!requestDoc) {
    for (const ref of references) {
      const snap = await db.collection('topup_requests').where('optgatewayReference', '==', ref).limit(1).get();
      if (!snap.empty) { requestDoc = snap.docs[0]; break; }
    }
  }
  if (!requestDoc) {
    // Notification de test ou evenement sans lien avec une recharge : on accuse reception (pas de nouvelles tentatives inutiles).
    console.log('[optgateway-webhook] aucune demande correspondante, ignore');
    return res.status(200).json({ received: true });
  }
  const requestData = requestDoc.data();

  if (requestData.status === 'completed') return res.status(200).json({ received: true, alreadyProcessed: true });

  // Etat REEL de la session, redemande a OPTGateway avec notre cle (identifiant stocke chez nous).
  let result;
  try { result = await fetchOptSession(requestData.optgatewaySessionId, apiKey); }
  catch (e) {
    console.error('[optgateway-webhook] verification impossible :', e && e.name);
    return res.status(503).json({ error: 'Verification indisponible, reessayez' }); // OPTGateway renverra la notification
  }
  if (!result.ok) {
    console.error('[optgateway-webhook] verification refusee, HTTP', result.status);
    return res.status(result.status >= 500 ? 503 : 400).json({ error: 'Verification impossible' });
  }
  const s = result.session || {};
  const status = String(s.status || '').toLowerCase();
  const sessionRef = s.reference || (s.metadata && s.metadata.reference) || null;

  if (sessionRef && sessionRef !== requestData.optgatewayReference) {
    console.error('[optgateway-webhook] reference differente, ignore');
    return res.status(400).json({ error: 'Reference incoherente' });
  }

  if (OPT_PAID.includes(status)) {
    // Garde-fous sur le montant et la devise (si OPTGateway les renvoie).
    if (s.currency && String(s.currency).toUpperCase() !== 'USD') {
      console.error('[optgateway-webhook] devise inattendue :', s.currency);
      await requestDoc.ref.update({ status: 'pending_admin_review', optgatewayNote: 'devise inattendue' });
      return res.status(200).json({ received: true, pendingAdminReview: true });
    }
    if (s.amount != null) {
      const paid = Number(String(s.amount).replace(',', '.'));
      if (!Number.isFinite(paid) || paid + 0.005 < requestData.amountUSD) {
        console.error('[optgateway-webhook] montant paye inferieur au montant demande');
        await requestDoc.ref.update({ status: 'pending_admin_review', optgatewayNote: 'montant different' });
        return res.status(200).json({ received: true, pendingAdminReview: true });
      }
    }
    const amount = requestData.amountUSD;
    if (typeof amount !== 'number' || !(amount > 0)) {
      return res.status(400).json({ error: 'Montant de la demande invalide' });
    }
    const credit = await creditBalanceOnce({
      uid: requestData.uid, amount, type: 'topup_optgateway',
      description: 'Recharge par carte / Mobile Money', relatedId: requestData.optgatewayReference, requestRef: requestDoc.ref
    });
    if (credit.alreadyCredited) return res.status(200).json({ received: true, alreadyProcessed: true });
    console.log(`[optgateway-webhook] ${amount}$ credites a ${requestData.uid}`);
    return res.status(200).json({ received: true, credited: true });
  }

  if (OPT_FAILED.includes(status)) {
    if (requestData.status === 'pending_payment') await requestDoc.ref.update({ status: 'failed' });
    return res.status(200).json({ received: true, credited: false });
  }

  if (status === 'review_required' || status === 'under_review') {
    await requestDoc.ref.update({ status: 'pending_admin_review', optgatewayNote: 'en verification chez OPTGateway' });
    return res.status(200).json({ received: true, pendingAdminReview: true });
  }

  // En attente / action requise : rien a faire pour l'instant.
  return res.status(200).json({ received: true });
}

/* ========================= SASPAY ========================= */
// La notification SasPay (signée) ne contient ni notre référence ni l'identifiant de session : elle sert
// seulement de DÉCLENCHEUR. On reprend alors nos recharges SasPay en attente et, pour chacune, on redemande
// l'état réel à SasPay (session payée, puis paiement SUCCESS au bon montant et dans la bonne devise).
// Le crédit est toujours celui de NOTRE demande, une seule fois (creditBalanceOnce).
// URL à saisir dans le tableau de bord SasPay (Webhooks) :
//   https://coeurnohuniverse.com/api/saspay-webhook      (équivalent : /api/payment-webhook?provider=saspay)

const SASPAY_MAX_PENDING = 40;
const SASPAY_STALE_MS = 72 * 3600 * 1000;

// Demandes à contrôler. Trois modes :
//  - webhook (par défaut) : toutes les demandes « en attente de paiement » (le plus récent d'abord) ;
//  - une personne (uidFilter) : SES demandes des 72 dernières heures encore ouvertes, y compris « échec » ou « expirée »
//    (une session peut échouer une première fois puis être payée à la 2e tentative) ;
//  - l'admin (opts.recover) : pareil, pour tout le monde.
const SASPAY_RECOVER = ['pending_payment', 'failed', 'expired'];
async function loadSaspayQueue(uidFilter, opts) {
  // L'admin remonte plus loin (14 jours) : utile si la notification automatique n'a jamais pu arriver (mauvaise adresse dans SasPay).
  const cut = new Date(Date.now() - (opts && opts.recover ? 14 * 24 * 3600 * 1000 : SASPAY_STALE_MS)).toISOString();
  const recent = (d) => String((d.data() || {}).createdAt || '') >= cut;
  const newest = (a, b) => String((b.data() || {}).createdAt || '').localeCompare(String((a.data() || {}).createdAt || ''));
  if (uidFilter) {
    const snap = await db.collection('topup_requests').where('uid', '==', uidFilter).where('method', '==', 'saspay').limit(60).get();
    const docs = snap.docs.filter((d) => SASPAY_RECOVER.indexOf((d.data() || {}).status) >= 0 && recent(d)).sort(newest).slice(0, 6);
    return { docs, all: snap.docs };
  }
  if (opts && opts.recover) {
    const parts = await Promise.all(SASPAY_RECOVER.map((st) => db.collection('topup_requests').where('method', '==', 'saspay').where('status', '==', st).limit(60).get()));
    const all = [].concat.apply([], parts.map((x) => x.docs));
    return { docs: all.filter(recent).sort(newest).slice(0, 60), all };
  }
  const snap = await db.collection('topup_requests').where('method', '==', 'saspay').where('status', '==', 'pending_payment').limit(100).get();
  return { docs: snap.docs.slice().sort(newest).slice(0, SASPAY_MAX_PENDING), all: snap.docs };
}

// Reprend les recharges SasPay en attente (toutes, ou celles d'une seule personne) et les règle.
async function settlePendingSaspay(apiKey, uidFilter, opts) {
  const o = opts || {};
  const { docs, all } = await loadSaspayQueue(uidFilter, o);
  const tally = { credited: 0, already: 0, failed: 0, pending: 0, review: 0, skip: 0, error: 0, total: docs.length };
  const details = [];
  const outcomes = await Promise.all(docs.map(async (d) => {
    const trace = {};
    let out;
    try { out = await saspay.settleRequest(d, { apiKey, credit: creditBalanceOnce, trace }); }
    catch (e) { console.error('[saspay] reglement impossible :', e && e.message); out = 'error'; trace.note = 'Erreur du serveur pendant le contrôle.'; }
    details.push({ id: d.id, outcome: out, note: trace.note || '' });
    return out;
  }));
  outcomes.forEach((out) => { tally[out] = (tally[out] || 0) + 1; });
  tally.details = details;

  // Ménage : une session toujours pas payée au bout de 72 h est abandonnée (elle ne bloque plus la file).
  if (!uidFilter && !o.recover) {
    const cut = new Date(Date.now() - SASPAY_STALE_MS).toISOString();
    const outcomeById = new Map(docs.map((d, i) => [d.id, outcomes[i]]));
    all.forEach((d) => {
      const x = d.data() || {};
      const out = outcomeById.get(d.id);
      if (x.status === 'pending_payment' && String(x.createdAt || '') < cut && (!out || out === 'pending')) {
        d.ref.update({ status: 'expired', saspayNote: 'jamais payee (72 h)' }).catch(() => {});
      }
    });
  }
  return tally;
}

async function handleSaspayWebhook(rawBody, req, res) {
  const creds = saspay.getCredentials();
  if (!creds.apiKey || !creds.webhookSecret) {
    console.error('[saspay-webhook] cle API ou secret du webhook manquant dans Vercel');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }
  const check = saspay.verifySignature(rawBody, req.headers, creds.webhookSecret);
  if (!check.ok) {
    console.error('[saspay-webhook] requete refusee :', check.reason);
    return res.status(403).json({ error: 'Signature invalide' });
  }
  let payload;
  try { payload = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'JSON invalide' }); }

  const event = String((payload && payload.event) || req.headers['x-webhook-event'] || '');
  if (event === 'webhook.test') return res.status(200).json({ received: true, test: true });
  if (!/^transaction\.(success|failed|cancelled)$/.test(event)) return res.status(200).json({ received: true });

  const tally = await settlePendingSaspay(creds.apiKey, null);
  console.log('[saspay-webhook]', event, JSON.stringify(tally));
  // SasPay réessaie (5 fois) tant qu'on répond 503 : on le demande si SasPay était injoignable,
  // ou si un paiement réussi n'est pas encore visible comme « payé » côté session.
  if (tally.error > 0) return res.status(503).json({ error: 'Verification indisponible, reessayez' });
  if (event === 'transaction.success' && tally.credited === 0 && tally.already === 0 && tally.pending > 0) {
    return res.status(503).json({ error: 'Paiement pas encore visible, reessayez' });
  }
  return res.status(200).json({ received: true, credited: tally.credited });
}

// Filet de sécurité : au retour de la personne sur l'application (?payment=success), le navigateur demande
// au serveur de revérifier SES recharges SasPay en attente. Utile si le webhook est retardé ou mal configuré.
async function handleSaspaySync(req, res) {
  try {
    const caller = await verifyCaller(req);
    await enforceRateLimit({ scope: 'saspay-sync', id: caller.uid, limit: 12, windowSec: 900 });
    const creds = saspay.getCredentials();
    if (!creds.apiKey) return res.status(200).json({ success: true, credited: 0, pending: 0 });
    const tally = await settlePendingSaspay(creds.apiKey, caller.uid);
    return res.status(200).json({ success: true, credited: tally.credited, pending: tally.pending + tally.error });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ success: false, error: error.message });
    console.error('[saspay-sync] erreur :', error && error.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

// ADMIN : revérifier une demande (ou toutes), ou créditer à la main après avoir vu l'argent chez SasPay.
// Corps JSON : { action: 'recheck_all' } | { action: 'recheck', id } | { action: 'credit', id }.
async function handleSaspayAdmin(rawBody, req, res) {
  try {
    const caller = await verifyCaller(req);
    if (!caller.isAdmin) return res.status(403).json({ success: false, error: "Réservé à l'administrateur." });
    await enforceRateLimit({ scope: 'saspay-admin', id: caller.uid, limit: 60, windowSec: 900 });
    let body = {};
    try { body = rawBody ? JSON.parse(rawBody) : {}; } catch (e) { return res.status(400).json({ success: false, error: 'JSON invalide' }); }
    const action = String(body.action || '');
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const creds = saspay.getCredentials();

    if (action === 'recheck_all') {
      if (!creds.apiKey) return res.status(200).json({ success: false, error: 'Clé API SasPay absente dans Vercel.' });
      const tally = await settlePendingSaspay(creds.apiKey, null, { recover: true });
      return res.status(200).json({ success: true, tally });
    }
    if ((action === 'recheck' || action === 'credit') && /^[A-Za-z0-9]{10,40}$/.test(id)) {
      const ref = db.collection('topup_requests').doc(id);
      const snap = await ref.get();
      const r = snap.exists ? snap.data() : null;
      if (!r || r.method !== 'saspay') return res.status(404).json({ success: false, error: 'Demande SasPay introuvable.' });
      if (action === 'recheck') {
        if (!creds.apiKey) return res.status(200).json({ success: false, error: 'Clé API SasPay absente dans Vercel.' });
        const trace = {};
        const outcome = await saspay.settleRequest(snap, { apiKey: creds.apiKey, credit: creditBalanceOnce, trace });
        return res.status(200).json({ success: true, outcome, note: trace.note || '' });
      }
      // credit : à la main, une seule fois (la transaction refuse si la demande est déjà créditée)
      const amount = r.amountUSD;
      if (typeof amount !== 'number' || !(amount > 0) || amount > 1000) return res.status(400).json({ success: false, error: 'Montant invalide sur la demande.' });
      if (r.status === 'completed') return res.status(200).json({ success: true, outcome: 'already', note: 'Déjà créditée.' });
      const out = await creditBalanceOnce({
        uid: r.uid, amount, type: 'topup_mobile_money', description: 'Recharge par Mobile Money (validée par l\'équipe)',
        relatedId: r.saspayReference || id, requestRef: ref
      });
      await ref.update({ saspayNote: 'credite a la main par l\'admin' }).catch(() => {});
      console.log('[saspay-admin] credit manuel', id, amount);
      return res.status(200).json({ success: true, outcome: out && out.alreadyCredited ? 'already' : 'credited', note: out && out.alreadyCredited ? 'Déjà créditée.' : 'Recharge créditée.' });
    }
    return res.status(400).json({ success: false, error: 'Action inconnue.' });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ success: false, error: error.message });
    console.error('[saspay-admin] erreur :', error && error.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/* ========================= ROUTEUR ========================= */

module.exports = async function handler(req, res) {
  const provider = req.query.provider;

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const rawBody = req.method === 'POST' ? await readRawBody(req) : '';

    if (provider === 'cryptomus') return await handleCryptomusWebhook(rawBody, res);
    if (provider === 'mbotepay') return await handleMbotepayWebhook(rawBody, req, res);
    if (provider === 'optgateway') {
      if (req.method !== 'POST') return res.status(200).end();
      return await handleOptgatewayWebhook(rawBody, req, res);
    }
    if (provider === 'saspay-admin') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });
      return await handleSaspayAdmin(rawBody, req, res);
    }
    if (provider === 'saspay-sync') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });
      return await handleSaspaySync(req, res);
    }
    // SasPay : ?provider=saspay, ou (si l'adresse saisie dans SasPay n'a pas de paramètre) reconnu à ses en-têtes de signature.
    if (provider === 'saspay' || (!provider && req.headers['x-webhook-signature'] && req.headers['x-webhook-event'])) {
      if (req.method !== 'POST') return res.status(200).end();
      return await handleSaspayWebhook(rawBody, req, res);
    }

    // Sonde de sante generique (ex: verification manuelle de l'URL) : 200 vide.
    if (req.method === 'GET') return res.status(200).end();

    console.error('[payment-webhook] provider inconnu :', provider);
    return res.status(400).json({ error: 'provider inconnu' });
  } catch (error) {
    console.error('[payment-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
