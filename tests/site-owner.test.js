// Espace propriétaire des sites : modèle choisi = site réel, publication (photos/vidéos/PDF/articles), aide réservée à l'admin.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const fs = require('fs');
const path = require('path');

const ADMIN = '8BqWONj07hVZePHe2DrkHWYRjse2';
const store = {
  'mini_sites/u1': { slug: 'mon-site', businessName: 'Hôtel Lac', siteType: 'hotel', template: 'or', status: 'published', premium: true, premiumUntil: '2099-12-31T00:00:00.000Z' },
  ['mini_sites/' + ADMIN]: { slug: 'site-admin', businessName: 'Art de mélancolique', siteType: 'musique', template: 'studio', status: 'published' },
  'mini_sites/free': { slug: 'site-gratuit', businessName: 'Gratuit', siteType: 'boutique', template: 'classique', status: 'published' },
  'mini_sites/u2': { slug: 'autre', businessName: 'Autre', siteType: 'musique', template: 'studio', status: 'published', services: [{ name: 'Déjà là', price: '', desc: '' }] }
};
let CALLER = 'u1';
const db = {
  collection(n) {
    return {
      doc(id) { const k = n + '/' + id; return { async get() { return { exists: !!store[k], id, data: () => store[k] }; }, async update(o) { store[k] = Object.assign({}, store[k], o); }, async set(o) { store[k] = o; } }; },
      where(f, op, val) {
        const q = { limit() { return q; }, async get() { const docs = Object.keys(store).filter((k) => k.startsWith(n + '/') && store[k][f] === val).map((k) => ({ id: k.split('/')[1], data: () => store[k] })); return { docs, empty: !docs.length }; } };
        return q;
      },
      async add() {}
    };
  }
};
const sec = {
  initFirebaseAdmin() {}, getBody: (r) => (r && r.body) || {}, async verifyCaller() { return { uid: CALLER }; }, async enforceRateLimit() {},
  cleanText: (v, m, o) => { let s = String(v == null ? '' : v).replace(/[<>]/g, ''); if (!(o && o.keepNewlines)) s = s.replace(/\s+/g, ' '); return s.trim().slice(0, m || 200); },
  getClientIp: () => '1'
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { firestore: Object.assign(() => db, { FieldValue: { increment: () => 1, serverTimestamp: () => 0 } }), apps: [1] };
  if (request === './_lib/security') return sec;
  if (request === './_lib/push') return { sendPushToUser() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;
const { starterSite, SAMPLE_TYPES } = require('../api/_lib/site-samples');

async function post(body, uid) {
  CALLER = uid || 'u1';
  const o = {};
  await handler({ method: 'POST', body, headers: { authorization: 'Bearer x' }, query: {} }, { setHeader() {}, status(c) { o.status = c; return this; }, json(x) { o.json = x; return this; }, send(x) { o.body = x; }, end() {} });
  return o;
}
async function page(query) {
  const o = { headers: {} };
  await handler({ method: 'GET', query, headers: {} }, { setHeader(k, v) { o.headers[k] = v; }, status(c) { o.status = c; return this; }, send(x) { o.body = x; }, json(x) { o.json = x; }, end() {} });
  return o;
}
const CL = 'https://res.cloudinary.com/aqe4fxh4/';

test('modèle choisi : chaque type a un contenu de départ honnête (sans faux avis ni faux chiffres)', () => {
  assert.strictEqual(SAMPLE_TYPES.length, 20);
  SAMPLE_TYPES.forEach((t) => {
    const s = starterSite(t, 'Mon Entreprise');
    assert.ok(s.tagline && s.tagline.length > 3, t);
    assert.ok(s.aboutText.includes('Mon Entreprise'), t);
    assert.ok(s.services.length >= 3, t);
    assert.ok(s.art && s.art.on === true, t);
    ['testimonials', 'team', 'stats', 'faq', 'reviews'].forEach((k) => assert.strictEqual(s[k], undefined, t + ' ne doit pas inventer ' + k));
    s.services.forEach((x) => assert.strictEqual(x.price, '', t + ' ne doit pas inventer de prix'));
  });
});

test('site_owner_seed : remplit un site vide, sans écraser ce que le propriétaire a déjà écrit', async () => {
  let r = await post({ action: 'site_owner_seed' }, 'u1');
  assert.strictEqual(r.status, 200);
  const d1 = store['mini_sites/u1'];
  assert.ok(d1.services.length >= 3 && d1.tagline && d1.art && d1.art.on);
  r = await post({ action: 'site_owner_seed' }, 'u2');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(store['mini_sites/u2'].services.length, 1, 'les services existants sont conservés');
  assert.strictEqual(store['mini_sites/u2'].services[0].name, 'Déjà là');
});

test('publier : photos, vidéos, PDF uniquement depuis notre Cloudinary, dossier et type cohérents', async () => {
  let r = await post({ action: 'site_owner_media_add', type: 'image', url: CL + 'image/upload/v1/sites/media/a.jpg', name: 'a.jpg' });
  assert.strictEqual(r.status, 200);
  r = await post({ action: 'site_owner_media_add', type: 'file', url: CL + 'raw/upload/v1/sites/media/menu.pdf', name: 'menu.pdf' });
  assert.strictEqual(r.status, 200);
  r = await post({ action: 'site_owner_media_add', type: 'video', url: CL + 'video/upload/v1/sites/media/v.mp4', name: 'v.mp4' });
  assert.strictEqual(r.status, 200);
  const bad = [
    { type: 'image', url: 'https://res.cloudinary.com/evil/image/upload/v1/a.jpg' },
    { type: 'file', url: CL + 'image/upload/v1/a.jpg' },
    { type: 'video', url: 'javascript:alert(1)' },
    { type: 'image', url: 'http://res.cloudinary.com/aqe4fxh4/image/upload/v1/a.jpg' },
    { type: 'exe', url: CL + 'raw/upload/v1/a.exe' }
  ];
  for (const b of bad) {
    r = await post(Object.assign({ action: 'site_owner_media_add' }, b));
    assert.ok(r.status >= 400 && r.status < 500, JSON.stringify(b) + ' => ' + r.status);
  }
  r = await post({ action: 'site_owner_overview' });
  assert.strictEqual(r.json.media.length, 3);
});

test('publier : article avec titre/texte nettoyés, image Cloudinary seulement, suppression', async () => {
  let r = await post({ action: 'site_owner_post_add', title: 'Nouveau <b>menu</b>', body: 'Venez découvrir\nnos plats', imageUrl: CL + 'image/upload/v1/sites/articles/p.jpg' });
  assert.strictEqual(r.status, 200);
  assert.ok(!/[<>]/.test(JSON.stringify(r.json.post)));
  r = await post({ action: 'site_owner_post_add', title: 'x', body: 'y' });
  assert.ok(r.status >= 400, 'article trop court refusé');
  r = await post({ action: 'site_owner_post_add', title: 'Avec image externe', body: 'Texte assez long pour passer', imageUrl: 'https://evil.example/x.jpg' });
  const posts = store['mini_sites/u1'].blogPosts || [];
  posts.forEach((p) => assert.ok(!p.imageUrl || p.imageUrl.startsWith(CL), 'aucune image hors Cloudinary'));
  r = await post({ action: 'site_owner_overview' });
  const n = r.json.posts.length;
  assert.ok(n >= 1);
  await post({ action: 'site_owner_post_del', date: r.json.posts[0].date });
  r = await post({ action: 'site_owner_overview' });
  assert.strictEqual(r.json.posts.length, n - 1);
});

test("aide propriétaires : seule l'administrateur peut lire et répondre", async () => {
  for (const action of ['site_help_admin_list', 'site_help_admin_get', 'site_help_admin_reply']) {
    const r = await post({ action, id: 'u1', text: 'bonjour' }, 'u1');
    assert.strictEqual(r.status, 403, action + ' doit être refusé à un utilisateur');
  }
  const ok = await post({ action: 'site_help_admin_list' }, ADMIN);
  assert.notStrictEqual(ok.status, 403);
});

test("pages publiées : cache court, et ?fresh=/?espace= jamais en cache ; l'admin a toujours un site complet", async () => {
  let r = await page({ slug: 'mon-site' });
  assert.strictEqual(r.status, 200);
  assert.match(r.headers['Cache-Control'] || '', /max-age=30/);
  r = await page({ slug: 'mon-site', fresh: '1' });
  assert.match(r.headers['Cache-Control'] || '', /no-store/);
  r = await page({ slug: 'mon-site', espace: '1' });
  assert.match(r.headers['Cache-Control'] || '', /no-store/);
  r = await page({ slug: 'site-admin' });
  assert.strictEqual(r.status, 200, "le site de l'administrateur est toujours en ligne");
  r = await page({ slug: 'site-gratuit' });
  assert.strictEqual(r.status, 404, 'un site sans Pack Pro reste privé');
});

test('thème sombre : barre du haut sombre, quelle que soit la préférence du téléphone', async () => {
  const dark = (await page({ sample: 'hotel', tpl: 'or' })).body;
  assert.ok(/class="[^"]*\btpl-dark\b/.test(dark));
  assert.ok(/\.topbar\{background:rgba\(12,17,27/.test(dark));
  const light = (await page({ sample: 'restaurant', tpl: 'classique' })).body;
  assert.ok(!/class="t-[^"]*\btpl-dark\b/.test(light));
  assert.ok(!/@media\(prefers-color-scheme:dark\)\{\.topbar/.test(light) && !/@media\(prefers-color-scheme:dark\)\{\.topbar/.test(dark));
});

test('site-runtime.js : syntaxe valide, pas d\'innerHTML, onglet Publier présent', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'site-runtime.js'), 'utf8');
  new Function(src); // eslint-disable-line no-new-func
  assert.ok(!/\.innerHTML\s*=/.test(src), 'jamais innerHTML');
  ['site_owner_media_add', 'site_owner_post_add', 'site_owner_seed', 'api.cloudinary.com'].forEach((k) => assert.ok(src.includes(k), k));
});
