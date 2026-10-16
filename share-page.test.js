const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

const DOCS = {
  publications: { p1abcdef: { status: 'published', title: 'Sac en cuir <b>fait main</b>', description: 'Un beau sac.', price: 38, imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sac.jpg', sellerName: 'Amani' }, hidden123: { status: 'removed', title: 'x' } },
  events: { e1abcdef: { status: 'active', title: 'Festival de rumba', description: 'Concert à Kinshasa', startDate: '2026-12-05T18:00:00.000Z', location: 'Kinshasa', coverImage: 'http://insecure.example/x.jpg', ticketTypes: [{ price: 0 }, { price: 15 }] } },
  properties: { i1abcdef: { status: 'disponible', title: 'Villa Ma Campagne', price: 185000, currency: 'USD', city: 'Kinshasa', bedrooms: 4, photos: ['https://res.cloudinary.com/demo/image/upload/v1/villa.jpg'], transactionType: 'vente' } }
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') {
    const fs = () => ({ collection: (c) => ({ doc: (id) => ({ get: async () => { const d = (DOCS[c] || {})[id]; return { exists: !!d, data: () => d }; } }) }) });
    return { firestore: fs, apps: [] };
  }
  if (request === './_lib/security') return { initFirebaseAdmin() {}, getBody: (r) => (r && r.body) || {}, verifyCaller() {}, enforceRateLimit() {}, cleanText: (v) => String(v || ''), getClientIp: () => '1' };
  if (request === './_lib/push') return { sendPushToUser() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;

async function get(share, id) {
  const out = { headers: {} };
  const res = { setHeader(k, v) { out.headers[k] = v; }, status(c) { out.status = c; return this; }, send(x) { out.body = x; }, json(x) { out.body = JSON.stringify(x); } };
  await handler({ method: 'GET', query: { share, id }, headers: {} }, res);
  return out;
}

test('partage: publication avec photo, titre echappe, marque et lien vers l\'app', async () => {
  const r = await get('pub', 'p1abcdef');
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /property="og:title" content="Sac en cuir fait main"/);
  assert.match(r.body, /og:image" content="https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/c_fill,w_1200,h_630/);
  assert.match(r.body, /\?go=pub:p1abcdef/);
  assert.match(r.body, /Coeurnoh Universe/);
  assert.ok(!r.body.includes('<b>fait main</b>'));
});
test('partage: evenement, image non https ignoree, prix minimal', async () => {
  const r = await get('event', 'e1abcdef');
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /og-image\.jpg/);
  assert.ok(!r.body.includes('insecure.example'));
  assert.match(r.body, /Entrée gratuite/);
});
test('partage: bien immobilier avec prix', async () => {
  const r = await get('immo', 'i1abcdef');
  assert.match(r.body, /185/);
  assert.match(r.body, /4 chambres/);
});
test('partage: contenu retire, inconnu ou type invalide => 404', async () => {
  assert.strictEqual((await get('pub', 'hidden123')).status, 404);
  assert.strictEqual((await get('pub', 'nexistepas')).status, 404);
  assert.strictEqual((await get('inconnu', 'p1abcdef')).status, 404);
  assert.strictEqual((await get('pub', '../../etc')).status, 404);
});

test('SEO : donnees structurees valides, indexable, redirection reservee aux humains', async () => {
  for (const [k, id, type] of [['pub', 'p1abcdef', 'Product'], ['event', 'e1abcdef', 'Event'], ['immo', 'i1abcdef', 'RealEstateListing']]) {
    const r = await get(k, id);
    const m = r.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, 'JSON-LD présent pour ' + k);
    const j = JSON.parse(m[1]);
    assert.strictEqual(j['@type'], type);
    assert.ok(j.name && j.url.includes('/p/' + k + '/'));
    assert.match(r.body, /name="robots" content="index,follow/);
    assert.match(r.body, /bot\|crawl\|spider/);
  }
});
