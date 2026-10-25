const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { firestore: () => ({}) };
  if (request === './_lib/security') return { initFirebaseAdmin() {}, getBody: (r) => (r && r.body) || {}, verifyCaller() {}, enforceRateLimit() {}, cleanText: (v) => String(v || ''), getClientIp: () => 'x' };
  if (request === './_lib/push') return { sendPushToUser() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;
async function preview(site) { const out = {}; await handler({ method: 'POST', body: { site } }, { setHeader() {}, status(c) { out.status = c; return this; }, send(x) { out.body = x; } }); return out; }
const base = { slug: 'demo', siteType: 'smm', template: 'classique', businessName: 'Boost Goma', services: [{ name: 'Pack' }], contactWhatsapp: '+243 825 001 290' };

test('panel désactivé : aucune section', async () => {
  const h = (await preview(base)).body; assert.ok(!h.includes('id="site-sec-panel"')); assert.ok(!h.includes('cnPanel'));
  assert.ok(!(await preview(Object.assign({}, base, { panel: { on: true, items: [] } }))).body.includes('id="site-sec-panel"'));
});
test('panel actif : catalogue échappé, aucune clé ni coût', async () => {
  const p = { on: true, title: 'Boost <i>x</i>', items: [{ id: '1', name: 'Followers <script>alert(1)</script>', cat: 'Instagram', price: 2.6, min: 50, max: 10000, cost: 2, key: 'SECRET' }] };
  const h = (await preview(Object.assign({}, base, { panel: p }))).body;
  assert.ok(h.includes('id="site-sec-panel"')); assert.ok(h.includes('href="#site-sec-panel"'));
  assert.ok(!h.includes('<script>alert(1)</script>')); assert.ok(!h.includes('SECRET')); assert.ok(!h.includes('"cost"'));
  assert.ok(/PN_ITEMS=\[\{"id":"1","p":2.6,"a":50,"z":10000\}\]/.test(h));
  // le script inline reste du JavaScript valide
  const js = h.match(/var PN_ITEMS[\s\S]*?(?=function sendSiteMessage)/)[0]; assert.doesNotThrow(() => new Function(js));
});
