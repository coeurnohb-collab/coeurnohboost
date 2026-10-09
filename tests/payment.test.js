// tests/payment.test.js — création de facture Cryptomus : succès, nouvel essai, raisons d'échec lisibles.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');

const orig = Module._load;
const fakeDb = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ email: 'a@b.c', lang: 'fr' }) }) }), add: async () => ({ id: 'x' }) }) };
Module._load = function (req) {
  if (req === 'firebase-admin') return { apps: [1], firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => n } }), initializeApp() {}, credential: { cert() {} } };
  return orig.apply(this, arguments);
};
process.env.CRYPTOMUS_MERCHANT_ID = 'm'; process.env.CRYPTOMUS_PAYMENT_KEY = 'k';
const sec = require(path.join(__dirname, '..', 'api', '_lib', 'security.js'));
sec.verifyCaller = async () => ({ uid: 'u1' });
sec.enforceRateLimit = async () => {};
const handler = require(path.join(__dirname, '..', 'api', 'payment-initiate.js'));

async function call(fetchImpl) {
  global.fetch = fetchImpl;
  let out = {};
  const res = { setHeader() {}, status(c) { out.code = c; return this; }, json(j) { out.body = j; } };
  await handler({ method: 'POST', body: { provider: 'crypto', amount: 5, idToken: 't' }, headers: {} }, res);
  return out;
}
const okBody = JSON.stringify({ state: 0, result: { url: 'https://pay.cryptomus.com/pay/x', uuid: 'u' } });

test('Facture crypto : succès', async () => {
  const r = await call(async () => ({ status: 200, text: async () => okBody }));
  assert.strictEqual(r.code, 200);
  assert.strictEqual(r.body.paymentUrl, 'https://pay.cryptomus.com/pay/x');
});

test('Facture crypto : un 1er essai raté est repris automatiquement', async () => {
  let n = 0;
  const r = await call(async () => { n++; if (n === 1) throw Object.assign(new Error('x'), { name: 'AbortError' }); return { status: 200, text: async () => okBody }; });
  assert.strictEqual(n, 2);
  assert.strictEqual(r.code, 200);
});

test('Facture crypto : page d\'erreur au lieu de JSON → raison lisible avec le code HTTP', async () => {
  const r = await call(async () => ({ status: 403, text: async () => '<html>blocked</html>' }));
  assert.strictEqual(r.code, 502);
  assert.match(r.body.error, /HTTP 403/);
});

test('Facture crypto : délai dépassé → raison lisible', async () => {
  const r = await call(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); });
  assert.strictEqual(r.code, 502);
  assert.match(r.body.error, /délai dépassé/);
});
