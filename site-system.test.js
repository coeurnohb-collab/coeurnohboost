const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const fs = require('fs');
const path = require('path');

const origLoad = Module._load;
const sent = [];
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { firestore: Object.assign(() => ({}), { FieldValue: { increment: () => 1 } }) };
  if (request === './_lib/security') return { initFirebaseAdmin() {}, getBody: (r) => (r && r.body) || {}, verifyCaller() {}, enforceRateLimit() {}, cleanText: (v) => String(v || ''), getClientIp: () => '1' };
  if (request === './_lib/push') return { sendPushToUser(...a) { sent.push(a); } };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;
const { TYPE_I18N } = require('../api/_lib/site-chrome');
const { SAMPLE_TYPES, sampleSite } = require('../api/_lib/site-samples');
const { createSiteSupport } = require('../api/_lib/site-support');

async function sample(q) {
  const out = {};
  await handler({ method: 'GET', query: q, headers: {} }, { setHeader() {}, status(c) { out.status = c; return this; }, send(x) { out.body = x; }, json(x) { out.json = x; }, end() {} });
  return out;
}

test('chaque type de site a ses textes dans les 5 langues (7 chaînes)', () => {
  const langs = ['fr', 'en', 'es', 'it', 'pt'];
  langs.forEach((l) => assert.ok(TYPE_I18N[l]));
  const types = Object.keys(TYPE_I18N.fr);
  assert.strictEqual(types.length, 20);
  langs.forEach((l) => types.forEach((t) => { assert.strictEqual(TYPE_I18N[l][t].length, 7, l + '/' + t); TYPE_I18N[l][t].forEach((s) => assert.ok(s && s.length > 1)); }));
});

test('aperçu réel : les 20 types x styles se rendent avec le moteur commun', async () => {
  const tpls = ['classique', 'aurora', 'studio', 'poster', 'royal', 'magazine', 'lagon', 'or', 'corporate', 'foret', 'festival', 'cyber', 'rubis', 'atelier'];
  assert.strictEqual(SAMPLE_TYPES.length, 20);
  for (let i = 0; i < SAMPLE_TYPES.length; i++) {
    const ty = SAMPLE_TYPES[i];
    const r = await sample({ sample: ty, tpl: tpls[i % tpls.length] });
    assert.strictEqual(r.status, 200, ty);
    assert.ok(r.body.length > 1500, ty);
    if (ty === 'smm' && !/window\.__CN_SITE=/.test(r.body)) continue; // panel : page dédiée si disponible
    assert.match(r.body, /window\.__CN_SITE=/, ty);
    assert.match(r.body, /\/site-runtime\.js\?v=/, ty);
    assert.match(r.body, /noindex/, ty);
    assert.match(r.body, /id="cf-contact"/, ty);
  }
});

test('aperçu réel : type et style inconnus retombent sur des valeurs sûres, langue passée au moteur', async () => {
  const r = await sample({ sample: '<script>', tpl: 'x"y', lang: 'es' });
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /"lang":"es"/);
  assert.ok(!/<script>alert/.test(r.body));
  assert.match((await sample({ sample: 'hotel', tpl: 'aurora', lang: 'zz' })).body, /"lang":"fr"/);
});

test('galerie : seules les URLs sûres sont rendues, les illustrations SVG seulement pour les exemples', async () => {
  const site = { siteType: 'boutique', businessName: 'Test', tagline: 'x', slug: 'test', template: 'classique', status: 'published',
    gallery: ['javascript:alert(1)', 'http://evil.example/x.png', 'data:image/svg+xml;utf8,%3Csvg%20onload%3Dalert(1)%3E', 'https://ok.example/photo.jpg'] };
  const out = {};
  await handler({ method: 'POST', body: { site } }, { setHeader() {}, status(c) { out.status = c; return this; }, send(x) { out.body = x; } });
  const html = out.body.replace(/<script[\s\S]*?<\/script>/g, '');
  assert.match(html, /<img src="https:\/\/ok\.example\/photo\.jpg"/);
  assert.ok(!/javascript:alert/.test(html));
  assert.ok(!/evil\.example/.test(html));
  assert.strictEqual((html.match(/class="g-item reveal"/g) || []).length, 1);
  assert.match((await sample({ sample: 'boutique', tpl: 'classique' })).body, /class="g-item reveal"[^>]*><img src="data:image\/svg\+xml/);
});

test('moteur commun : syntaxe valide, 5 langues, aucune écriture sans jeton', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'site-runtime.js'), 'utf8');
  assert.doesNotThrow(() => new Function(src));
  ['fr', 'en', 'es', 'it', 'pt'].forEach((l) => assert.ok(src.includes("LANGS = [['fr'") && src.includes(l)));
  assert.match(src, /Authorization': 'Bearer '/);
  assert.ok(!/innerHTML/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'jamais d’innerHTML avec du texte utilisateur');
});

test('messagerie « Aide pour mon site » : validation, notification admin, réponse', async () => {
  const store = {};
  const notifs = [];
  const db = {
    collection(name) {
      return {
        doc(id) {
          return {
            async get() { const k = name + '/' + id; return { exists: !!store[k], id, data: () => store[k] }; },
            async update(o) { store[name + '/' + id] = Object.assign({}, store[name + '/' + id], o); },
          };
        },
        async add(o) { notifs.push(o); },
      };
    },
    async runTransaction(fn) {
      await fn({ async get(ref) { return ref.get(); }, set(ref, o) { ref.update(o); } });
    },
  };
  // seed du site
  store['mini_sites/u1'] = { slug: 'mon-site', businessName: 'Mon Site' };
  const pushes = [];
  const sup = createSiteSupport({ db, admin: {}, push: async (...a) => { pushes.push(a); }, adminUid: 'ADM' });
  await assert.rejects(() => sup.ownerSend('u1', { message: 'a' }), /3 caractères/);
  await assert.rejects(() => sup.ownerSend('nouveau', { message: 'Bonjour test' }), /Crée d/);
  await sup.ownerSend('u1', { message: 'Je veux <b>changer</b> le logo', category: 'inconnue' });
  const th = await sup.ownerThread('u1');
  assert.strictEqual(th.messages.length, 1);
  assert.ok(!/[<>]/.test(th.messages[0].text));
  assert.strictEqual(th.messages[0].category, 'autre');
  assert.ok(notifs.some((n) => n.uid === 'ADM' && n.type === 'site_help'));
  await sup.adminReply({ id: 'u1', message: 'C’est fait.', close: true });
  const after = await sup.ownerThread('u1');
  assert.strictEqual(after.messages.length, 2);
  assert.strictEqual(after.status, 'closed');
  assert.ok(notifs.some((n) => n.uid === 'u1' && n.url === '/?mysite=1'));
  await assert.rejects(() => sup.adminReply({ id: 'a/b', message: 'x' }), /vide/);
});
