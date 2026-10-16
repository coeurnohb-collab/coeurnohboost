const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

const TOKEN = 'tok_abcdefghijklmnop1234';
const DOCS = { invoices: {
  inv1abcdef: { number: 'FA-0007', clientName: 'Marie <script>x</script> Mbuyi', clientPhone: '+243810000000', currency: 'USD', createdAt: '2026-10-01T10:00:00Z', dueDate: '2099-01-01',
    items: [{ desc: 'Shooting photo', qty: 2, price: 50 }], subtotal: 100, discountAmount: 0, taxRate: 16, taxAmount: 16, total: 116, shareToken: TOKEN,
    payments: [{ amount: 50, method: 'M-Pesa', date: '2026-10-05T10:00:00Z' }], issuer: { name: 'Studio Lumière', logo: 'http://insecure.example/x.png', address: 'Goma' } },
  inv2abcdef: { number: 'FA-0008', total: 10, currency: 'CDF', shareToken: TOKEN, shareEnabled: false, items: [] }
} };
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') {
    const fs = () => ({ collection: (c) => ({ doc: (id) => ({ get: async () => { const d = (DOCS[c] || {})[id]; return { exists: !!d, data: () => d }; } }) }) });
    return { firestore: fs, apps: [] };
  }
  if (request === './_lib/security') return { initFirebaseAdmin() {}, getBody: (r) => (r && r.body) || {}, verifyCaller() {}, enforceRateLimit() {}, cleanText: (v) => String(v || ''), getClientIp: () => '1.1.1.1' };
  if (request === './_lib/push') return { sendPushToUser() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;
async function get(id, q) {
  const out = { headers: {} };
  const res = { setHeader(k, v) { out.headers[k] = v; }, status(c) { out.status = c; return this; }, send(x) { out.body = x; }, json(x) { out.body = JSON.stringify(x); } };
  await handler({ method: 'GET', query: Object.assign({ share: 'facture', id }, q), headers: {} }, res);
  return out;
}
test('facture: jeton valide -> page, echappement, noindex, no-store', async () => {
  const r = await get('inv1abcdef', { t: TOKEN });
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /FA-0007/); assert.match(r.body, /Partiellement payée/); assert.match(r.body, /TVA \(16 %\)/);
  assert.ok(!r.body.includes('<script>x')); assert.ok(!r.body.includes('insecure.example'));
  assert.match(r.headers['X-Robots-Tag'], /noindex/); assert.match(r.headers['Cache-Control'], /no-store/);
});
test('facture: jeton absent, faux ou partage desactive -> 404', async () => {
  assert.strictEqual((await get('inv1abcdef', {})).status, 404);
  assert.strictEqual((await get('inv1abcdef', { t: 'tok_abcdefghijklmnop9999' })).status, 404);
  assert.strictEqual((await get('inv2abcdef', { t: TOKEN })).status, 404);
});
test('facture: recu de paiement', async () => {
  const r = await get('inv1abcdef', { t: TOKEN, r: '0' });
  assert.strictEqual(r.status, 200); assert.match(r.body, /REÇU DE PAIEMENT/); assert.match(r.body, /M-Pesa/);
});
