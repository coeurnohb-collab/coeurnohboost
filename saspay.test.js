// SasPay (Mobile Money multi-pays) : identifiants, signature du webhook, contrôle du paiement,
// règlement d'une recharge avec un FAUX SasPay (aucun appel réel), et branchement dans l'application.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const sp = require('../api/_lib/saspay');

/* ---------- identifiants (Vercel) ---------- */

test('SasPay : la clé API et le secret du webhook sont retrouvés même si les deux noms sont inversés dans Vercel', () => {
  const normal = sp.getCredentials({ SASPAY_SECRET_KEY: 'sk_live_AbCdEfGh1234', SASPAY_SECRET: '8a2cfa66aa2956f7ac33' });
  assert.strictEqual(normal.apiKey, 'sk_live_AbCdEfGh1234');
  assert.strictEqual(normal.webhookSecret, '8a2cfa66aa2956f7ac33');
  assert.strictEqual(normal.live, true);
  const inverted = sp.getCredentials({ SASPAY_SECRET: 'sk_live_AbCdEfGh1234', SASPAY_SECRET_KEY: '8a2cfa66aa2956f7ac33' });
  assert.strictEqual(inverted.apiKey, 'sk_live_AbCdEfGh1234');
  assert.strictEqual(inverted.webhookSecret, '8a2cfa66aa2956f7ac33');
});

test('SasPay : espaces, retours à la ligne et guillemets collés dans Vercel sont ignorés', () => {
  const c = sp.getCredentials({ SASPAY_API_KEY: '  "sk_live_AbCdEfGh1234"\n', SASPAY_WEBHOOK_SECRET: ' abc123secret \n' });
  assert.strictEqual(c.apiKey, 'sk_live_AbCdEfGh1234');
  assert.strictEqual(c.webhookSecret, 'abc123secret');
});

test('SasPay : sans clé valide, rien n\'est activé ; une clé de test est refusée en production', () => {
  assert.strictEqual(sp.getCredentials({ SASPAY_SECRET: 'pas-une-cle' }).apiKey, '');
  assert.strictEqual(sp.getCredentials({}).apiKey, '');
  const test_ = sp.getCredentials({ SASPAY_API_KEY: 'sk_test_AbCdEfGh1234' });
  assert.strictEqual(sp.testKeyBlocked(test_, { VERCEL_ENV: 'production' }), true);
  assert.strictEqual(sp.testKeyBlocked(test_, { VERCEL_ENV: 'preview' }), false);
  assert.strictEqual(sp.testKeyBlocked(test_, { VERCEL_ENV: 'production', SASPAY_ALLOW_TEST: '1' }), false);
  assert.strictEqual(sp.testKeyBlocked(sp.getCredentials({ SASPAY_API_KEY: 'sk_live_AbCdEfGh1234' }), { VERCEL_ENV: 'production' }), false);
});

/* ---------- signature du webhook ---------- */

function signed(body, secret, ts) {
  const sig = crypto.createHmac('sha256', secret).update(ts + '.' + body).digest('hex');
  return { 'x-webhook-signature': sig, 'x-webhook-timestamp': String(ts), 'x-webhook-event': 'transaction.success' };
}

test('SasPay : signature valide acceptée ; corps modifié, mauvais secret, vieil horodatage ou en-têtes absents refusés', () => {
  const body = '{"event":"transaction.success","data":{"id":"7c1a"}}';
  const now = Math.floor(Date.now() / 1000);
  assert.strictEqual(sp.verifySignature(body, signed(body, 's3cret', now), 's3cret').ok, true);
  assert.strictEqual(sp.verifySignature(body + ' ', signed(body, 's3cret', now), 's3cret').ok, false, 'corps modifié');
  assert.strictEqual(sp.verifySignature(body, signed(body, 'autre', now), 's3cret').ok, false, 'mauvais secret');
  assert.strictEqual(sp.verifySignature(body, signed(body, 's3cret', now - 600), 's3cret').ok, false, 'rejeu après 10 min');
  assert.strictEqual(sp.verifySignature(body, {}, 's3cret').ok, false, 'en-têtes absents');
  assert.strictEqual(sp.verifySignature(body, signed(body, 's3cret', now), '').ok, false, 'secret absent');
  // La signature en MAJUSCULES est acceptée (même valeur), pas une valeur de longueur différente.
  const h = signed(body, 's3cret', now); h['x-webhook-signature'] = h['x-webhook-signature'].toUpperCase();
  assert.strictEqual(sp.verifySignature(body, h, 's3cret').ok, true);
  const short = signed(body, 's3cret', now); short['x-webhook-signature'] = 'abcd';
  assert.strictEqual(sp.verifySignature(body, short, 's3cret').ok, false);
});

/* ---------- contrôle du paiement ---------- */

test('SasPay : champs officiels du paiement (requested_amount, debited_amount, net_amount, currency) — même devise : montant contrôlé', () => {
  const exp = { currency: 'XOF', amount: 5000 };
  // Frais à la charge du client : débité 5 125, net 5 000
  assert.strictEqual(sp.evaluateVerify({ id: 'tx', status: 'SUCCESS', currency: 'XOF', requested_amount: '5000.00', debited_amount: '5125.00', net_amount: '5000.00' }, exp).result, 'paid');
  // Frais déduits : net 4 880 mais le client a bien payé les 5 000 demandés
  assert.strictEqual(sp.evaluateVerify({ status: 'SUCCESS', currency: 'XOF', requested_amount: '5000.00', debited_amount: '5000.00', net_amount: '4880.00' }, exp).result, 'paid');
  // Ancien format de réponse (enveloppe data, champ amount) toujours accepté
  assert.strictEqual(sp.evaluateVerify({ data: { status: 'SUCCESS', currency: 'XOF', amount: '5000.00' } }, exp).result, 'paid');
  assert.strictEqual(sp.evaluateVerify({ data: { status: 'SUCCESS', currency: 'XOF', requested_amount: '4000.00', debited_amount: '4000.00' } }, exp).result, 'review', 'montant inférieur à la demande');
  assert.strictEqual(sp.evaluateVerify({ status: 'SUCCESS', currency: 'XOF' }, exp).result, 'review', 'montant absent');
});

test('SasPay : devise convertie par SasPay (carte, crypto, autre monnaie) → session payée + paiement SUCCESS suffisent, pas de blocage manuel', () => {
  const exp = { currency: 'EUR', amount: 5 };
  const conv = sp.evaluateVerify({ status: 'SUCCESS', currency: 'USD', requested_amount: '5.77', debited_amount: '5.95', net_amount: '5.77' }, exp);
  assert.strictEqual(conv.result, 'paid');
  assert.strictEqual(conv.converted, true);
});

test('SasPay : un paiement en attente, échoué ou sans statut n\'est jamais « payé »', () => {
  const exp = { currency: 'XOF', amount: 5000 };
  assert.strictEqual(sp.evaluateVerify({ status: 'PENDING' }, exp).result, 'pending');
  assert.strictEqual(sp.evaluateVerify({ status: 'FAILED' }, exp).result, 'failed');
  assert.strictEqual(sp.evaluateVerify({ status: 'CANCELLED' }, exp).result, 'failed');
  assert.strictEqual(sp.evaluateVerify({}, exp).result, 'pending');
  assert.strictEqual(sp.evaluateVerify(null, exp).result, 'pending');
});

test('SasPay : statut de session au format officiel (transaction_id, transaction_status)', () => {
  assert.deepStrictEqual(sp.readSession({ id: 'c9a1', slug: 'x', status: 'PAID', transaction_id: '9c3f', transaction_status: 'SUCCESS' }), { status: 'PAID', transactionId: '9c3f', reference: '' });
  assert.deepStrictEqual(sp.readSession({ data: { status: 'pending', transaction: { id: 'tx1' } } }), { status: 'PENDING', transactionId: 'tx1', reference: '' });
});

test('SasPay : conversion dollars → monnaie locale (marge, arrondi) et pays', () => {
  assert.strictEqual(sp.toLocalAmount(10, 600, 5, 'XOF'), 6300);
  assert.strictEqual(sp.toLocalAmount(10, 600.1, 5, 'XOF'), 6302, 'les devises sans centimes sont arrondies vers le haut');
  assert.strictEqual(sp.toLocalAmount(10, 129, 5, 'KES'), 1354.5);
  assert.strictEqual(sp.toLocalAmount(10, 1, 5, 'USD'), 10.5);
  const list = sp.normalizeCountries({ success: true, data: { results: [{ code: 'bj', currency: { code: 'xof' } }, { iso2: 'CM', currency: 'XAF', is_active: false }, { name: 'sans code' }] } });
  assert.deepStrictEqual(list, [{ code: 'BJ', currency: 'XOF', active: true }, { code: 'CM', currency: 'XAF', active: false }]);
  assert.deepStrictEqual(sp.normalizeCountries(null), []);
  assert.strictEqual(sp.CURRENCY_BY_COUNTRY.CD, 'CDF');
  assert.strictEqual(sp.CURRENCY_BY_COUNTRY.SN, 'XOF');
  assert.strictEqual(sp.CURRENCY_BY_COUNTRY.CM, 'XAF');
});

test('SasPay : on ne redirige que vers une adresse saspay.me en https', () => {
  assert.strictEqual(sp.isSaspayUrl('https://pay.saspay.me/checkout/abc=='), true);
  assert.strictEqual(sp.isSaspayUrl('https://saspay.me/x'), true);
  assert.strictEqual(sp.isSaspayUrl('http://pay.saspay.me/x'), false);
  assert.strictEqual(sp.isSaspayUrl('https://pay.saspay.me.evil.com/x'), false);
  assert.strictEqual(sp.isSaspayUrl('https://evilsaspay.me/x'), false);
  assert.strictEqual(sp.isSaspayUrl('javascript:alert(1)'), false);
});

/* ---------- règlement d'une recharge avec un FAUX SasPay ---------- */

function fakeDoc(data) {
  const calls = [];
  return { calls, data: () => data, ref: { update: async (u) => { calls.push(u); Object.assign(data, u); } } };
}
function fakeSaspay(routes) {
  const real = global.fetch;
  global.fetch = async (url) => {
    const u = String(url).replace(sp.BASE, '');
    const hit = Object.keys(routes).find((k) => u === k);
    if (!hit) return { ok: false, status: 404, text: async () => '{}' };
    const r = routes[hit];
    return { ok: (r.status || 200) < 400, status: r.status || 200, text: async () => JSON.stringify(r.body) };
  };
  return () => { global.fetch = real; };
}
const baseReq = () => ({ uid: 'u1', amountUSD: 10, method: 'saspay', status: 'pending_payment', saspaySessionId: 'sess1', saspayReference: 'spref1', saspayCurrency: 'XOF', saspayAmount: 6300 });

test('SasPay : session payée + paiement SUCCESS au bon montant → crédit unique du montant de NOTRE demande', async () => {
  const restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { success: true, data: { id: 'sess1', status: 'PAID', transaction: 'tx9' } } },
    '/payments/tx9/verify/': { body: { success: true, data: { id: 'tx9', status: 'SUCCESS', currency: 'XOF', amount: '6300.00', net_amount: '6300.00' } } }
  });
  try {
    const credits = [];
    const doc = fakeDoc(baseReq());
    const out = await sp.settleRequest(doc, { apiKey: 'sk_live_x', credit: async (c) => { credits.push(c); return { alreadyCredited: false }; } });
    assert.strictEqual(out, 'credited');
    assert.strictEqual(credits.length, 1);
    assert.strictEqual(credits[0].amount, 10, 'on crédite les 10 $ demandés, jamais un montant venu de la notification');
    assert.strictEqual(credits[0].uid, 'u1');
    assert.strictEqual(credits[0].type, 'topup_mobile_money');
    assert.strictEqual(credits[0].relatedId, 'spref1');
  } finally { restore(); }
});

test('SasPay : le numéro de transaction manquant sur la session est retrouvé dans le détail de la session', async () => {
  const restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { data: { status: 'PAID' } } },
    '/checkout-sessions/sess1/': { body: { data: { id: 'sess1', transaction: { id: 'tx7' } } } },
    '/payments/tx7/verify/': { body: { data: { status: 'SUCCESS', currency: 'XOF', amount: '6300.00' } } }
  });
  try {
    const out = await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'sk_live_x', credit: async () => ({ alreadyCredited: false }) });
    assert.strictEqual(out, 'credited');
  } finally { restore(); }
});

test('SasPay : session en attente → rien n\'est crédité ; session échouée → demande marquée échouée', async () => {
  const credit = async () => { throw new Error('ne doit pas être appelé'); };
  let restore = fakeSaspay({ '/checkout-sessions/sess1/status/': { body: { data: { status: 'PENDING' } } } });
  try { assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit }), 'pending'); } finally { restore(); }
  restore = fakeSaspay({ '/checkout-sessions/sess1/status/': { body: { data: { status: 'FAILED' } } } });
  try {
    const doc = fakeDoc(baseReq());
    assert.strictEqual(await sp.settleRequest(doc, { apiKey: 'k', credit }), 'failed');
    assert.strictEqual(doc.calls[0].status, 'failed');
  } finally { restore(); }
});

test('SasPay : montant payé trop faible ou paiement non SUCCESS → jamais de crédit (mise en vérification manuelle)', async () => {
  const credit = async () => { throw new Error('ne doit pas être appelé'); };
  const restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { data: { status: 'PAID', transaction: 'tx1' } } },
    '/payments/tx1/verify/': { body: { data: { status: 'SUCCESS', currency: 'XOF', amount: '100.00', charged: '100.00' } } }
  });
  try {
    const doc = fakeDoc(baseReq());
    assert.strictEqual(await sp.settleRequest(doc, { apiKey: 'k', credit }), 'review');
    assert.strictEqual(doc.calls[0].status, 'pending_admin_review');
  } finally { restore(); }
});

test('SasPay : SasPay injoignable ou en erreur 5xx → « error » (le webhook répondra 503 pour être renvoyé), jamais de crédit', async () => {
  const credit = async () => { throw new Error('ne doit pas être appelé'); };
  const restore = fakeSaspay({ '/checkout-sessions/sess1/status/': { status: 503, body: {} } });
  try { assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit }), 'error'); } finally { restore(); }
  const real = global.fetch;
  global.fetch = async () => { throw new Error('réseau coupé'); };
  try { assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit }), 'error'); } finally { global.fetch = real; }
});

test('SasPay : une recharge déjà créditée ou sans session n\'est pas retraitée', async () => {
  const credit = async () => { throw new Error('ne doit pas être appelé'); };
  assert.strictEqual(await sp.settleRequest(fakeDoc({ ...baseReq(), status: 'completed' }), { apiKey: 'k', credit }), 'already');
  assert.strictEqual(await sp.settleRequest(fakeDoc({ ...baseReq(), saspaySessionId: '' }), { apiKey: 'k', credit }), 'skip');
});

/* ---------- branchement dans l'application ---------- */

test('SasPay : le Mobile Money est aiguillé vers SasPay côté serveur, avec retour possible à OPTGateway sans code', () => {
  const init = read('api/payment-initiate.js');
  assert.match(init, /require\('\.\/_lib\/saspay'\)/);
  assert.match(init, /if \(onlyMethod === 'mobile_money' && await mobileMoneyViaSaspay\(body\.countryCode\)\) \{\s*return await handleSaspay\(uid, body, amount\);/);
  assert.match(init, /mobileMoneyProvider/, 'interrupteur Firestore settings/payments_config');
  assert.match(init, /pref === 'optgateway'\) return false/);
  // Le montant crédité vient de notre demande ; la devise du navigateur n'est jamais utilisée.
  assert.match(init, /saspayAmount: localAmount/);
  assert.doesNotMatch(init.slice(init.indexOf('async function handleSaspay'), init.indexOf('OPTGATEWAY (carte')), /body\.(currency|chargeCurrency)/);
  // La RDC reste en direct (MbotePay), les cartes restent sur OPTGateway.
  assert.match(init, /const MBOTEPAY_ALLOWED_DEFAULT = \['CD'\];/);
});

test('SasPay : webhook signé, déclencheur seulement, filet de sécurité au retour, adresse propre', () => {
  const wh = read('api/payment-webhook.js');
  assert.match(wh, /handleSaspayWebhook/);
  assert.match(wh, /saspay\.verifySignature\(rawBody, req\.headers, creds\.webhookSecret\)/);
  assert.match(wh, /provider === 'saspay-sync'/);
  assert.match(wh, /provider === 'saspay' \|\| \(!provider && req\.headers\['x-webhook-signature'\]/);
  assert.match(wh, /await verifyCaller\(req\)/, 'la synchronisation exige une personne connectée');
  assert.match(wh, /uidFilter/, 'et ne règle que SES recharges');
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.rewrites.some((r) => r.source === '/api/saspay-webhook' && r.destination === '/api/payment-webhook?provider=saspay'));
  assert.match(read('payments-pro.js'), /provider=saspay-sync/);
  assert.strictEqual(fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js')).length, 12, 'toujours 12 fonctions Vercel au maximum');
});

/* ---------- réparation des recharges « payées chez SasPay mais pas créditées » ---------- */

test('SasPay : vocabulaire tolérant (COMPLETE, SUCCESSFUL…) — un mot clairement « payé » suffit, un mot inconnu reste en attente', async () => {
  const restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { data: { status: 'COMPLETE', transaction: 'tx1' } } },
    '/payments/tx1/verify/': { body: { data: { status: 'SUCCESSFUL', currency: 'XOF', amount: '6300.00' } } }
  });
  try {
    const credits = [];
    const out = await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit: async (c) => { credits.push(c); return { alreadyCredited: false }; } });
    assert.strictEqual(out, 'credited');
    assert.strictEqual(credits.length, 1);
  } finally { restore(); }
  assert.strictEqual(sp.evaluateVerify({ status: 'SOMETHING_NEW' }, { currency: 'XOF', amount: 1 }).result, 'pending', 'statut inconnu : jamais crédité');
  assert.strictEqual(sp.readSession({ data: { paid: true, transaction: 'tx' } }).status, 'PAID');
});

test('SasPay : si /status/ est introuvable (404), la fiche complète de la session est lue à la place', async () => {
  const restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { status: 404, body: {} },
    '/checkout-sessions/sess1/': { body: { data: { id: 'sess1', status: 'PAID', transaction_id: 'tx5' } } },
    '/payments/tx5/verify/': { body: { data: { status: 'SUCCESS', currency: 'XOF', amount: '6300.00' } } }
  });
  try {
    const out = await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit: async () => ({ alreadyCredited: false }) });
    assert.strictEqual(out, 'credited');
  } finally { restore(); }
});

test('SasPay : une demande « échouée » ou « expirée » est rouverte et créditée si SasPay la dit finalement payée', async () => {
  for (const st of ['failed', 'expired']) {
    const restore = fakeSaspay({
      '/checkout-sessions/sess1/status/': { body: { data: { status: 'PAID', transaction: 'tx2' } } },
      '/payments/tx2/verify/': { body: { data: { status: 'SUCCESS', currency: 'XOF', amount: '6300.00' } } }
    });
    try {
      const out = await sp.settleRequest(fakeDoc({ ...baseReq(), status: st }), { apiKey: 'k', credit: async () => ({ alreadyCredited: false }) });
      assert.strictEqual(out, 'credited', st);
    } finally { restore(); }
  }
});

test('SasPay : la RAISON du dernier contrôle est gardée sur la demande (visible dans l\'admin) et expliquée en français', async () => {
  const restore = fakeSaspay({ '/checkout-sessions/sess1/status/': { body: { data: { status: 'PENDING' } } } });
  try {
    const doc = fakeDoc(baseReq());
    const trace = {};
    assert.strictEqual(await sp.settleRequest(doc, { apiKey: 'k', credit: async () => ({}), trace }), 'pending');
    assert.match(trace.note, /pas encore payée/);
    assert.ok(doc.calls.some((u) => u.saspayCheck && u.saspayCheck.outcome === 'pending' && /PENDING/.test(u.saspayCheck.note)));
    const n = doc.calls.length;
    await sp.settleRequest(doc, { apiKey: 'k', credit: async () => ({}), trace: {} });
    assert.strictEqual(doc.calls.length, n, 'même raison : aucune écriture en plus');
  } finally { restore(); }
  const restore2 = fakeSaspay({ '/checkout-sessions/sess1/status/': { status: 401, body: {} }, '/checkout-sessions/sess1/': { status: 401, body: {} } });
  try {
    const trace = {};
    assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit: async () => ({}), trace }), 'skip');
    assert.match(trace.note, /clé API/);
  } finally { restore2(); }
});

test('SasPay : diagnostic admin — la vraie raison donnée par SasPay (statut du paiement, réseau, message) est notée, sans jamais créditer', async () => {
  const credit = async () => { throw new Error('ne doit pas être appelé'); };
  // 1) paiement lancé, SasPay l'a envoyé à l'opérateur mais rien n'est confirmé : on le dit clairement
  let restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { data: { status: 'PENDING', transaction: 'tx5' } } },
    '/payments/tx5/verify/': { body: { data: { status: 'PENDING', network: 'MPESA', status_message: 'Payment pushed successfully' } } }
  });
  try {
    const trace = {};
    assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit, trace, diagnose: true }), 'pending');
    assert.match(trace.note, /pas encore payée/);
    assert.match(trace.note, /Paiement lancé chez SasPay « PENDING »/);
    assert.match(trace.note, /réseau MPESA/);
    assert.match(trace.note, /Payment pushed successfully/);
    assert.match(trace.note, /opérateur/);
  } finally { restore(); }
  // 2) sans « diagnose » (contrôle automatique), le comportement et le texte de base ne changent pas, et aucun appel en plus
  restore = fakeSaspay({ '/checkout-sessions/sess1/status/': { body: { data: { status: 'PENDING', transaction: 'tx5' } } } });
  try {
    const trace = {};
    assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit, trace }), 'pending');
    assert.strictEqual(trace.note, 'Session SasPay « PENDING » : pas encore payée.');
  } finally { restore(); }
  // 3) session jamais payée : aucun paiement n'a été lancé (la personne n'a pas cliqué sur « Payer »)
  restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { data: { status: 'PENDING' } } },
    '/checkout-sessions/sess1/': { body: { data: { id: 'sess1', status: 'PENDING', payments: [] } } }
  });
  try {
    const trace = {};
    assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit, trace, diagnose: true }), 'pending');
    assert.match(trace.note, /Aucun paiement n'a été lancé/);
  } finally { restore(); }
  // 4) SasPay refuse de détailler le paiement : on le dit, sans planter
  restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { data: { status: 'PENDING', transaction: 'tx5' } } },
    '/payments/tx5/verify/': { status: 403, body: {} }
  });
  try {
    const trace = {};
    assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit, trace, diagnose: true }), 'pending');
    assert.match(trace.note, /HTTP 403/);
  } finally { restore(); }
  // 5) paiement échoué côté opérateur : la raison est gardée dans la note
  restore = fakeSaspay({
    '/checkout-sessions/sess1/status/': { body: { data: { status: 'PAID', transaction: 'tx6' } } },
    '/payments/tx6/verify/': { body: { data: { status: 'FAILED', failure_reason: 'Insufficient funds' } } }
  });
  try {
    const trace = {};
    assert.strictEqual(await sp.settleRequest(fakeDoc(baseReq()), { apiKey: 'k', credit, trace }), 'failed');
    assert.match(trace.note, /Insufficient funds/);
  } finally { restore(); }
});

test('SasPay : pickReason / pickNetwork — texte court et propre, jamais de balise ni de simple « succès »', () => {
  assert.strictEqual(sp.pickReason({ failure_reason: '  <b>Solde</b>   insuffisant ' }), 'Solde insuffisant');
  assert.strictEqual(sp.pickReason({ message: 'Payment retrieved successfully' }), '');
  assert.strictEqual(sp.pickReason({ description: 'Recharge Coeurnoh', status: 'PENDING' }), '', 'la description de la commande n\'est pas une raison');
  assert.ok(sp.pickReason({ reason: 'x'.repeat(500) }).length <= 140);
  assert.strictEqual(sp.pickReason(null), '');
  assert.strictEqual(sp.pickNetwork({ network: { code: 'AIRTEL', name: 'Airtel' } }), 'AIRTEL');
  assert.strictEqual(sp.pickNetwork({ network: 'ORANGE<script>' }), 'ORANGEscript');
  assert.strictEqual(sp.pickNetwork({}), '');
});

test('SasPay : le contrôle « Revérifier » de l\'admin demande le diagnostic, pas le contrôle groupé (limite de 10 s de Vercel)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'api', 'payment-webhook.js'), 'utf8');
  assert.match(src, /settleRequest\(snap, \{[^}]*diagnose: true/);
  assert.doesNotMatch(src, /recover: true, diagnose/);
});

test('SasPay : outils de réparation — contrôle automatique à l\'ouverture, admin (revérifier / créditer à la main), serveur réservé à l\'admin', () => {
  const wh = read('api/payment-webhook.js');
  assert.match(wh, /provider === 'saspay-admin'/);
  assert.match(wh, /if \(!caller\.isAdmin\) return res\.status\(403\)/);
  assert.match(wh, /action === 'recheck_all'/);
  assert.match(wh, /action === 'credit'/);
  assert.match(wh, /creditBalanceOnce\(\{\s*uid: r\.uid, amount,/, 'crédit manuel = même fonction à transaction unique, jamais de double crédit');
  assert.match(wh, /SASPAY_RECOVER = \['pending_payment', 'failed', 'expired'\]/);
  const pp = read('payments-pro.js');
  assert.match(pp, /async function autoSync\(\)/);
  assert.match(pp, /visibilitychange/);
  const ad = read('admin.js');
  assert.match(ad, /provider=saspay-admin/);
  assert.match(ad, /recheckSaspay\(/);
  assert.match(ad, /creditSaspayByHand\(/);
  assert.match(ad, /recheckAllSaspay\(/);
  assert.match(read('admin.html'), /admin\.js\?v=\d+/);
});

test('Mobile Money : interrupteur PAR PAYS (RDC) dans l\'admin — réservé à l\'admin, deux valeurs seulement, refusé si le fournisseur n\'est pas configuré', () => {
  const wh = read('api/payment-webhook.js');
  const i = wh.indexOf("action === 'get_provider' || action === 'set_provider'");
  const h = wh.indexOf('async function handleSaspayAdmin');
  assert.ok(h > 0 && i > h, 'l\'action vit dans le gestionnaire admin');
  assert.ok(wh.indexOf('if (!caller.isAdmin)', h) < i, 'contrôle admin AVANT l\'interrupteur');
  const blk = wh.slice(i, i + 4200);
  assert.match(blk, /want !== 'saspay' && want !== 'optgateway'/);
  assert.match(blk, /OPTGATEWAY_API_KEY/);
  assert.match(blk, /mobileMoneyByCountry: \{ \[cc\]: want \}/, 'un seul pays est modifié');
  assert.match(blk, /merge: true/, 'seuls les champs du réglage changent dans settings/payments_config');
  assert.doesNotMatch(blk.slice(0, blk.indexOf('// Remise en ordre')), /mobileMoneyProvider:\s*want/, 'plus de réglage « tous les pays »');
  assert.match(blk, /doc\('payments_config'\)/);
  const ad = read('admin.js');
  assert.match(ad, /setMobileProvider\('saspay'\)/);
  assert.match(ad, /setMobileProvider\('optgateway'\)/);
  assert.match(ad, /action: 'set_provider'/);
  assert.match(ad, /country: 'CD'/);
});

test('Mobile Money : l\'aiguillage est PAR PAYS — la RDC peut passer sur OPTGateway, les autres pays restent sur SasPay', async () => {
  const src = read('api/payment-initiate.js');
  const code = src.slice(src.indexOf('async function mobileMoneyViaSaspay'), src.indexOf('async function getUserName'));
  const run = async (cfg, hasKey, country) => {
    const fn = new Function('getPaymentsConfig', 'saspay', code + '; return mobileMoneyViaSaspay;')(async () => cfg, { getCredentials: () => ({ apiKey: hasKey ? 'sk_live_x' : '' }) });
    return fn(country);
  };
  // Réglage RDC → OPTGateway : seule la RDC change.
  assert.strictEqual(await run({ mobileMoneyByCountry: { CD: 'optgateway' } }, true, 'CD'), false);
  assert.strictEqual(await run({ mobileMoneyByCountry: { CD: 'optgateway' } }, true, 'cd'), false, 'minuscules acceptées');
  for (const c of ['CM', 'CI', 'KE', 'UG', 'TZ', 'GH', 'NG', 'SN', 'CG', 'ZM']) {
    assert.strictEqual(await run({ mobileMoneyByCountry: { CD: 'optgateway' } }, true, c), true, c + ' reste sur SasPay');
  }
  // Sans réglage : SasPay dès que la clé existe, OPTGateway sinon.
  assert.strictEqual(await run({}, true, 'CD'), true);
  assert.strictEqual(await run({}, false, 'CD'), false);
  // Retour de la RDC sur SasPay.
  assert.strictEqual(await run({ mobileMoneyByCountry: { CD: 'saspay' }, mobileMoneyProvider: 'optgateway' }, true, 'CD'), true);
  // Valeurs étranges ou pays absent : on ne casse rien.
  assert.strictEqual(await run({ mobileMoneyByCountry: { CD: 'n\'importe quoi' } }, true, 'CD'), true);
  assert.strictEqual(await run({ mobileMoneyByCountry: 'x' }, true, undefined), true);
  // Le navigateur donne le pays à l'aiguillage.
  assert.match(src, /mobileMoneyViaSaspay\(body\.countryCode\)/);
});

test('Mobile Money : l\'ancien réglage « tous les pays sur OPTGateway » posé par la première version du bouton est retiré automatiquement', () => {
  const wh = read('api/payment-webhook.js');
  const i = wh.indexOf('// Remise en ordre');
  assert.ok(i > 0);
  const blk = wh.slice(i, i + 1100);
  assert.match(blk, /mobileMoneyProviderBy === 'string'/);
  assert.match(blk, /mobileMoneyProvider: 'saspay'/);
  assert.match(blk, /FV\.delete\(\)/);
  assert.match(blk, /healed/);
});

test('SasPay : l\'adresse /api/webhooks/saspay (celle saisie chez SasPay) arrive bien au webhook ; le webhook a 30 s ; l\'admin remonte 14 jours', () => {
  const v = JSON.parse(read('vercel.json'));
  assert.ok(v.rewrites.some((r) => r.source === '/api/webhooks/saspay' && r.destination === '/api/payment-webhook?provider=saspay'));
  assert.ok(v.rewrites.some((r) => r.source === '/api/saspay-webhook' && r.destination === '/api/payment-webhook?provider=saspay'));
  assert.strictEqual(v.functions['api/payment-webhook.js'].maxDuration, 30);
  assert.match(read('api/payment-webhook.js'), /14 \* 24 \* 3600 \* 1000/);
  assert.match(read('admin.js'), /closeSaspayDone\(/, 'bouton « Déjà réglé » : ferme la demande sans créditer une 2e fois');
});
