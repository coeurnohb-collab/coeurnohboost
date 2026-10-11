const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { firestore: () => ({}) };
  if (request === './_lib/security') return { initFirebaseAdmin() {}, getBody: (r) => (r && r.body) || {}, verifyCaller() {}, enforceRateLimit() {}, cleanText: (v) => String(v || ''), getClientIp: () => '1' };
  if (request === './_lib/push') return { sendPushToUser() {} };
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

test('mediatheque: plafonds gratuits (3 images, 1 video, 2 fichiers), illimite en premium, https seulement', () => {
  const img = (n) => ({ type: 'image', url: `https://res.cloudinary.com/x/${n}.jpg` });
  const media = [1, 2, 3, 4, 5].map(img)
    .concat([{ type: 'video', url: 'https://r.c/v1.mp4' }, { type: 'video', url: 'https://r.c/v2.mp4' }])
    .concat([1, 2, 3].map((n) => ({ type: 'file', url: `https://r.c/f${n}.pdf`, name: `f${n}.pdf` })))
    .concat([{ type: 'file', url: 'javascript:alert(1)', name: 'x.pdf' }]);
  const site = Object.assign({}, base, { media, portfolio: [{ title: 'P1' }, { title: 'P2' }, { title: 'P3' }, { title: 'P4' }] });
  const free = preview({ site }).body;
  assert.strictEqual((free.match(/class="g-item/g) || []).length, 3);
  assert.strictEqual((free.match(/class="vid /g) || []).length, 1);
  assert.strictEqual((free.match(/class="doc /g) || []).length, 2);
  assert.strictEqual((free.match(/class="pf-card/g) || []).length, 3);
  const pro = preview({ site, premium: true }).body;
  assert.strictEqual((pro.match(/class="g-item/g) || []).length, 5);
  assert.strictEqual((pro.match(/class="vid /g) || []).length, 2);
  assert.strictEqual((pro.match(/class="doc /g) || []).length, 3);
  assert.strictEqual((pro.match(/class="pf-card/g) || []).length, 4);
  assert.ok(!/href="javascript/i.test(pro));
});

test('forfaits et equipe: plafonds gratuits et echappement', () => {
  const plans = [1, 2, 3, 4, 5].map((n) => ({ name: `P${n} <i>`, price: '10$', features: 'a\nb' }));
  const team = [1, 2, 3, 4, 5, 6].map((n) => ({ name: `M${n}`, role: 'CEO' }));
  const site = Object.assign({}, base, { plans, team });
  const free = preview({ site }).body;
  assert.strictEqual((free.match(/class="plan reveal/g) || []).length, 3);
  assert.strictEqual((free.match(/class="member reveal/g) || []).length, 4);
  assert.ok(!free.includes('<i>'));
  const pro = preview({ site, premium: true }).body;
  assert.strictEqual((pro.match(/class="plan reveal/g) || []).length, 5);
  assert.strictEqual((pro.match(/class="member reveal/g) || []).length, 6);
});
