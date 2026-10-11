const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

const FUTURE = new Date(Date.now() + 86400000).toISOString();
const data = {
  businesses: { abc1234567: { status: 'active', pro: true, proUntil: FUTURE, businessName: 'Entreprise <Test>', description: 'Une très bonne entreprise.', tagline: 'Qualité garantie', foundedYear: '2015', legalId: 'RCCM/KIN/123', teamSize: '12', whatsapp: '+243810000000', catalog: [{ name: 'Audit', price: '50$', desc: 'Complet' }], faq: [{ question: 'Q ?', answer: 'R.' }], team: [{ name: 'Noé', role: 'Directeur' }], awards: ['ISO 9001'], brandColor: '#0a7a5a' },
                 free123456: { status: 'active', pro: false, businessName: 'Gratuite' } },
  public_reviews: [{ targetType: 'business', targetId: 'abc1234567', rating: 5, comment: 'Excellent', authorName: 'Marie' }],
  follows: [{ followedUid: 'abc1234567' }, { followedUid: 'abc1234567' }]
};
function fakeDb() {
  return { collection: (name) => ({
    doc: (id) => ({ get: async () => ({ exists: !!(data[name] && data[name][id]), data: () => data[name][id] }), update: async () => {} }),
    where() { return this; }, limit() { return this; },
    get: async () => ({ size: (data[name] || []).length, docs: (Array.isArray(data[name]) ? data[name] : []).map((d) => ({ data: () => d })) })
  }) };
}
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') { const f = () => fakeDb(); f.firestore = f; f.firestore.FieldValue = { increment: (n) => n }; return { firestore: f }; }
  if (request === './_lib/security') return { initFirebaseAdmin() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;

async function get(id) {
  const out = {};
  const res = { setHeader() {}, status(c) { out.status = c; return this; }, send(x) { out.body = x; } };
  await handler({ method: 'GET', query: { biz: id } }, res);
  return out;
}
test('page entreprise Pro : contenu, avis, infos legales, couleur', async () => {
  const r = await get('abc1234567');
  assert.strictEqual(r.status, 200);
  assert.ok(!r.body.includes('Entreprise <Test>'));
  assert.match(r.body, /Excellent/);
  assert.match(r.body, /RCCM\/KIN\/123/);
  assert.match(r.body, /ISO 9001/);
  assert.match(r.body, /--accent:#0a7a5a/);
  assert.match(r.body, /\/e\/abc1234567/);
});
test('page entreprise : refusee si non Pro ou inconnue', async () => {
  assert.strictEqual((await get('free123456')).status, 404);
  assert.strictEqual((await get('inconnu9999')).status, 404);
  assert.strictEqual((await get('x')).status, 404);
});
