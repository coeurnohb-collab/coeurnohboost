// tests/optgateway.test.js — OPTGateway : création de session, crédit unique après vérification serveur,
// refus si montant/référence incohérents, aucun crédit sur simple notification.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');

// ---- faux Firestore minimal en mémoire ----
const store = { topup_requests: [], users: { u1: { balance: 10, email: 'a@b.c', lang: 'fr' } }, wallet_transactions: [], notifications: [] };
function reqRef(doc) { return { id: doc.id, _doc: doc }; }
const fakeDb = {
  collection(name) {
    return {
      doc(id) { return { _name: name, _id: id, get: async () => ({ exists: name === 'users' ? !!store.users[id] : false, data: () => store.users[id] }) }; },
      add: async (d) => { const doc = Object.assign({ id: 'r' + (store.topup_requests.length + 1) }, d); if (name === 'topup_requests') store.topup_requests.push(doc); return reqRef(doc); },
      where(field, op, value) {
        return { limit() { return { get: async () => {
          const docs = store.topup_requests.filter(d => d[field] === value).map(d => ({ id: d.id, data: () => d, ref: { id: d.id, update: async (u) => Object.assign(d, u) } }));
          return { empty: docs.length === 0, docs };
        } }; } };
      }
    };
  },
  async runTransaction(fn) {
    const tx = {
      get: async (ref) => {
        if (ref._name === 'users') return { exists: true, data: () => store.users[ref._id] };
        const d = store.topup_requests.find(x => x.id === ref.id);
        return { exists: !!d, data: () => d };
      },
      update: (ref, u) => { if (ref._name === 'users') Object.assign(store.users[ref._id], u); else Object.assign(store.topup_requests.find(x => x.id === ref.id), u); },
      set: (ref, d) => { store.wallet_transactions.push(d); }
    };
    return fn(tx);
  }
};

const orig = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin') return { apps: [1], firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => n } }), initializeApp() {}, credential: { cert() {} } };
  if (req === './_lib/push' || /_lib[\\/]push(\.js)?$/.test(req)) return { sendPushToUser: async () => {} };
  return orig.apply(this, arguments);
};
process.env.OPTGATEWAY_API_KEY = 'sk_live_TESTKEY';
const sec = require(path.join(__dirname, '..', 'api', '_lib', 'security.js'));
sec.verifyCaller = async () => ({ uid: 'u1' });
sec.enforceRateLimit = async () => {};
const initiate = require(path.join(__dirname, '..', 'api', 'payment-initiate.js'));
const webhook = require(path.join(__dirname, '..', 'api', 'payment-webhook.js'));

async function callInitiate(fetchImpl, body) {
  global.fetch = fetchImpl;
  const out = {};
  const res = { setHeader() {}, status(c) { out.code = c; return this; }, json(j) { out.body = j; } };
  await initiate({ method: 'POST', body: Object.assign({ provider: 'optgateway', amountUSD: 5, idToken: 't' }, body), headers: {} }, res);
  return out;
}
function mkWebhookReq(payload) {
  const { Readable } = require('stream');
  const r = Readable.from([Buffer.from(JSON.stringify(payload))]);
  r.method = 'POST'; r.query = { provider: 'optgateway' }; r.headers = {};
  return r;
}
async function callWebhook(payload, headers) {
  const out = {};
  const res = { status(c) { out.code = c; return this; }, json(j) { out.body = j; return this; }, end() { return this; } };
  const r = mkWebhookReq(payload);
  if (headers) r.headers = headers;
  await webhook(r, res);
  return out;
}
const okSession = JSON.stringify({ id: 'cs_live_abc123', url: 'https://pay.optsolution.pro/pay/cs_live_abc123' });

test('Session OPTGateway : succès, devise forcée à USD, clé envoyée en en-tête', async () => {
  let seen;
  const r = await callInitiate(async (url, opt) => { seen = { url, opt }; return { status: 200, text: async () => okSession }; });
  assert.strictEqual(r.code, 200);
  assert.strictEqual(r.body.paymentUrl, 'https://pay.optsolution.pro/pay/cs_live_abc123');
  assert.strictEqual(seen.url, 'https://pay.optsolution.pro/v1/checkout/sessions');
  assert.strictEqual(seen.opt.headers.Authorization, 'Bearer sk_live_TESTKEY');
  const sent = JSON.parse(seen.opt.body);
  assert.strictEqual(sent.currency, 'USD');
  assert.strictEqual(sent.amount, '5.00');
  assert.ok(/^og[a-z0-9]+$/.test(sent.reference));
  assert.ok(!('key' in r.body) && !JSON.stringify(r.body).includes('sk_live'));
});

test('Session OPTGateway : montant invalide refusé', async () => {
  const r = await callInitiate(async () => { throw new Error('ne doit pas être appelé'); }, { amountUSD: 'abc' });
  assert.strictEqual(r.code, 400);
});

test('Session OPTGateway : lien de paiement vers un autre domaine refusé', async () => {
  const r = await callInitiate(async () => ({ status: 200, text: async () => JSON.stringify({ id: 'cs_live_x1', url: 'https://evil.example/pay' }) }));
  assert.strictEqual(r.code, 502);
});

test('Session OPTGateway : réponse illisible → erreur claire', async () => {
  const r = await callInitiate(async () => ({ status: 403, text: async () => '<html>no</html>' }));
  assert.strictEqual(r.code, 502);
  assert.match(r.body.error, /HTTP 403/);
});

function seedRequest(extra) {
  store.topup_requests.length = 0; store.wallet_transactions.length = 0; store.users.u1.balance = 10;
  store.topup_requests.push(Object.assign({ id: 'r1', uid: 'u1', method: 'optgateway', amountUSD: 5, status: 'pending_payment', optgatewayReference: 'og1abc2def3', optgatewaySessionId: 'cs_live_abc123' }, extra));
}
function sessionFetch(session, status = 200) { return async () => ({ ok: status < 400, status, json: async () => session }); }

test('Webhook : crédit unique après vérification de la session (et jamais deux fois)', async () => {
  seedRequest();
  global.fetch = sessionFetch({ id: 'cs_live_abc123', status: 'succeeded', reference: 'og1abc2def3', amount: '5.00', currency: 'USD' });
  const a = await callWebhook({ type: 'checkout.session.completed', data: { object: { id: 'cs_live_abc123' } } });
  assert.strictEqual(a.code, 200);
  assert.strictEqual(a.body.credited, true);
  assert.strictEqual(store.users.u1.balance, 15);
  const b = await callWebhook({ type: 'checkout.session.completed', data: { object: { id: 'cs_live_abc123' } } });
  assert.strictEqual(b.body.alreadyProcessed, true);
  assert.strictEqual(store.users.u1.balance, 15);
});

test('Webhook : fausse notification « payé » sans session réellement payée → aucun crédit', async () => {
  seedRequest();
  global.fetch = sessionFetch({ id: 'cs_live_abc123', status: 'pending', reference: 'og1abc2def3', amount: '5.00', currency: 'USD' });
  const r = await callWebhook({ status: 'succeeded', data: { id: 'cs_live_abc123', amount: '999' } });
  assert.strictEqual(r.code, 200);
  assert.strictEqual(store.users.u1.balance, 10);
});

test('Webhook : montant payé inférieur à la demande → mis en attente admin, pas de crédit', async () => {
  seedRequest();
  global.fetch = sessionFetch({ id: 'cs_live_abc123', status: 'succeeded', reference: 'og1abc2def3', amount: '1.00', currency: 'USD' });
  const r = await callWebhook({ data: { id: 'cs_live_abc123' } });
  assert.strictEqual(r.body.pendingAdminReview, true);
  assert.strictEqual(store.users.u1.balance, 10);
  assert.strictEqual(store.topup_requests[0].status, 'pending_admin_review');
});

test('Webhook : référence incohérente → refus, pas de crédit', async () => {
  seedRequest();
  global.fetch = sessionFetch({ id: 'cs_live_abc123', status: 'succeeded', reference: 'ogautrechose99', amount: '5.00', currency: 'USD' });
  const r = await callWebhook({ data: { id: 'cs_live_abc123' } });
  assert.strictEqual(r.code, 400);
  assert.strictEqual(store.users.u1.balance, 10);
});

test('Webhook : notification inconnue (test) → accusé de réception sans effet', async () => {
  seedRequest();
  global.fetch = async () => { throw new Error('ne doit pas être appelé'); };
  const r = await callWebhook({ type: 'webhook.test' });
  assert.strictEqual(r.code, 200);
  assert.strictEqual(store.users.u1.balance, 10);
});

test('Webhook : session échouée → demande marquée échouée, pas de crédit', async () => {
  seedRequest();
  global.fetch = sessionFetch({ id: 'cs_live_abc123', status: 'failed', reference: 'og1abc2def3' });
  await callWebhook({ data: { id: 'cs_live_abc123' } });
  assert.strictEqual(store.topup_requests[0].status, 'failed');
  assert.strictEqual(store.users.u1.balance, 10);
});

test('Webhook signé : signature valide acceptée, fausse ou expirée refusée', async () => {
  const crypto = require('crypto');
  process.env.OPTGATEWAY_WEBHOOK_SECRET = 'whsec_test';
  try {
    const payload = { data: { id: 'cs_live_abc123' } };
    const raw = JSON.stringify(payload);
    const sign = (t, secret) => 't=' + t + ',v1=' + crypto.createHmac('sha256', secret).update(t + '.' + raw).digest('hex');
    const now = String(Math.floor(Date.now() / 1000));

    seedRequest();
    global.fetch = sessionFetch({ id: 'cs_live_abc123', status: 'succeeded', reference: 'og1abc2def3', amount: '5.00', currency: 'USD' });
    const ok = await callWebhook(payload, { 'optgateway-signature': sign(now, 'whsec_test') });
    assert.strictEqual(ok.body.credited, true);

    seedRequest();
    const bad = await callWebhook(payload, { 'optgateway-signature': sign(now, 'mauvais_secret') });
    assert.strictEqual(bad.code, 403);
    const none = await callWebhook(payload, {});
    assert.strictEqual(none.code, 403);
    const old = await callWebhook(payload, { 'optgateway-signature': sign(String(Number(now) - 3600), 'whsec_test') });
    assert.strictEqual(old.code, 403);
    assert.strictEqual(store.users.u1.balance, 10);
  } finally { delete process.env.OPTGATEWAY_WEBHOOK_SECRET; }
});
