const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { firestore: () => ({}) };
  if (request === './_lib/security') return { initFirebaseAdmin() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;

function preview(body) {
  const out = {};
  const res = { setHeader() {}, status(c) { out.status = c; return this; }, send(x) { out.body = x; } };
  handler({ method: 'POST', body }, res);
  return out;
}
const base = { slug: 'demo', siteType: 'boutique', template: 'classique', businessName: 'Ma <b>Boutique</b>', services: [{ name: 'Sac', price: '10$' }], contactWhatsapp: '+243811', socialLinks: { youtube: 'https://youtube.com/x', x: 'javascript:alert(1)' } };

test('apercu: rendu complet, noindex, texte echappe', () => {
  const r = preview({ site: base });
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /noindex/);
  assert.match(r.body, /Commander/);
  assert.ok(!r.body.includes('Ma <b>Boutique</b>'));
  assert.match(r.body, /YouTube/);
});
test('apercu: lien social dangereux neutralise', () => {
  const r = preview({ site: base });
  assert.ok(!/href="javascript:/.test(r.body));
});
test('couleur personnalisee seulement en Pack Pro', () => {
  const site = Object.assign({}, base, { accentColor: '#00aa77' });
  assert.ok(!/--accent:#00aa77/.test(preview({ site }).body));
  assert.match(preview({ site, premium: true }).body, /--accent:#00aa77/);
});
test('apercu: requete invalide refusee', () => {
  assert.strictEqual(preview({}).status, 400);
});

test('site v2 : chiffres cles, bandeau, un seul bouton de contact au demarrage', () => {
  const site = Object.assign({}, base, { announcement: '-20% !', stats: [{ value: '500+', label: 'Clients' }], services: [{ name: 'Sac', price: '10$', desc: 'En cuir' }] });
  const html = preview({ site, premium: true }).body;
  assert.match(html, /class="announce"/);
  assert.match(html, /data-count="500\+"/);
  assert.match(html, /En cuir/);
  assert.ok(!/class="top-cta"/.test(html));
  assert.match(html, /sendSiteMessage/);
});
