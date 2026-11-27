// Publications : « qui a aimé » + nombre de vues (api/_lib/post-social.js, post-social.js, script.js).
// Règles testées : le serveur compte UNE vue par personne et par publication (jamais sur sa propre publication),
// la liste des personnes ne renvoie que des champs publics, rien n'est écrit depuis le téléphone.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createPostSocial, publicLiker, validIds, cleanText, MAX_LIKERS, MAX_VIEW_IDS } = require('../api/_lib/post-social');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function fakeDb(seed) {
  const cols = {};
  Object.keys(seed || {}).forEach((c) => { cols[c] = new Map(Object.entries(seed[c])); });
  const colOf = (n) => (cols[n] = cols[n] || new Map());
  const ref = (n, id) => ({ id, _n: n, get: async () => ({ id, exists: colOf(n).has(id), data: () => colOf(n).get(id) }) });
  const ops = [];
  const db = {
    collection: (n) => ({
      doc: (id) => ref(n, id),
      where: (f, op, v) => ({ limit: (k) => ({ get: async () => ({ docs: Array.from(colOf(n).entries()).filter(([, d]) => d[f] === v).slice(0, k).map(([id, d]) => ({ id, data: () => d })) }) }) })
    }),
    getAll: async (...refs) => Promise.all(refs.map((r) => r.get())),
    batch: () => ({
      set: (r, v) => ops.push(['set', r._n, r.id, v]),
      update: (r, v) => ops.push(['update', r._n, r.id, v]),
      commit: async () => {
        ops.forEach(([k, n, id, v]) => {
          if (k === 'set') colOf(n).set(id, v);
          else { const cur = Object.assign({}, colOf(n).get(id)); Object.keys(v).forEach((f) => { cur[f] = v[f] && v[f].__inc ? (Number(cur[f]) || 0) + v[f].__inc : v[f]; }); colOf(n).set(id, cur); }
        });
        ops.length = 0;
      }
    })
  };
  return { db, cols };
}
const admin = { firestore: { FieldValue: { increment: (n) => ({ __inc: n }) } } };
const mk = (seed) => { const f = fakeDb(seed); return Object.assign({ api: createPostSocial({ db: f.db, admin }) }, f); };

test('vues : une seule vue par personne et par publication', async () => {
  const { api, cols } = mk({ publications: { pub_1: { sellerUid: 'seller_1', viewsCount: 10 } } });
  const a = await api.views('viewer_a', { ids: ['pub_1'] });
  assert.deepStrictEqual(a.counted, ['pub_1']);
  assert.strictEqual(cols.publications.get('pub_1').viewsCount, 11);
  assert.ok(cols.publication_views.has('pub_1_viewer_a'));
  const again = await api.views('viewer_a', { ids: ['pub_1'] });
  assert.deepStrictEqual(again.counted, [], 'même personne : pas de deuxième vue');
  assert.strictEqual(cols.publications.get('pub_1').viewsCount, 11);
  const other = await api.views('viewer_b', { ids: ['pub_1'] });
  assert.deepStrictEqual(other.counted, ['pub_1']);
  assert.strictEqual(cols.publications.get('pub_1').viewsCount, 12);
});

test('vues : jamais sur sa propre publication, jamais sur une publication qui n\'existe pas', async () => {
  const { api, cols } = mk({ publications: { pub_1: { sellerUid: 'seller_1', viewsCount: 0 } } });
  assert.deepStrictEqual((await api.views('seller_1', { ids: ['pub_1'] })).counted, []);
  assert.deepStrictEqual((await api.views('viewer_a', { ids: ['pub_inconnue'] })).counted, []);
  assert.ok(!cols.publication_views || cols.publication_views.size === 0);
});

test('vues : identifiants nettoyés, doublons retirés, 25 publications au plus par appel', async () => {
  assert.deepStrictEqual(validIds(['abcd', 'abcd', 'a b', '../x', 12, null, 'ok_ID-9', 'x'.repeat(200)], 25), ['abcd', 'ok_ID-9']);
  const many = Array.from({ length: 80 }, (_, i) => 'pub_' + (1000 + i));
  assert.strictEqual(validIds(many, MAX_VIEW_IDS).length, 25);
  const { api } = mk({});
  assert.deepStrictEqual((await api.views('viewer_a', { ids: 'pas une liste' })).counted, []);
  await assert.rejects(() => api.views('', { ids: ['pub_1'] }), /Connecte-toi/);
});

test('qui a aimé : plus récents d\'abord, un seul passage par personne, champs publics seulement', async () => {
  const { api } = mk({
    publications: { pub_1: { sellerUid: 'seller_1', likesCount: 5 } },
    publication_likes: {
      l1: { pubId: 'pub_1', uid: 'alice_01', type: 'heart', createdAt: '2026-11-01T10:00:00Z' },
      l2: { pubId: 'pub_1', uid: 'bob_0002', type: 'like', createdAt: '2026-11-03T10:00:00Z' },
      l3: { pubId: 'pub_1', uid: 'bob_0002', type: 'heart', createdAt: '2026-11-02T10:00:00Z' },
      l4: { pubId: 'pub_2', uid: 'carl_003', type: 'heart', createdAt: '2026-11-04T10:00:00Z' },
      l5: { pubId: 'pub_1', uid: '../mauvais', type: 'heart', createdAt: '2026-11-05T10:00:00Z' }
    },
    public_profiles: {
      alice_01: { username: 'Alice', photoURL: 'https://res.cloudinary.com/x/a.jpg', verified: true, email: 'secret@x.cd', balance: 99 },
      bob_0002: { name: 'Bob', photoURL: 'http://insecure.example/b.jpg' }
    }
  });
  const r = await api.likers('viewer_a', { pubId: 'pub_1' });
  assert.strictEqual(r.success, true);
  assert.deepStrictEqual(r.likers.map((x) => x.uid), ['bob_0002', 'alice_01']);
  assert.strictEqual(r.likers[0].name, 'Bob');
  assert.strictEqual(r.likers[0].photoURL, '', 'photo non https refusée');
  assert.strictEqual(r.likers[1].verified, true);
  assert.strictEqual(r.total, 5, 'le total vient du compteur de la publication');
  assert.deepStrictEqual(Object.keys(r.likers[1]).sort(), ['at', 'name', 'photoURL', 'type', 'uid', 'verified']);
  assert.doesNotMatch(JSON.stringify(r), /secret@|balance|insecure/);
});

test('qui a aimé : connexion obligatoire, publication inconnue refusée, nombre de personnes limité', async () => {
  const { api } = mk({ publications: { pub_1: { sellerUid: 's', likesCount: 0 } } });
  await assert.rejects(() => api.likers('', { pubId: 'pub_1' }), /Connecte-toi/);
  await assert.rejects(() => api.likers('viewer_a', { pubId: 'inconnue' }), /introuvable/);
  await assert.rejects(() => api.likers('viewer_a', { pubId: '../x' }), /introuvable/);
  const likes = {};
  for (let i = 0; i < 100; i++) likes['l' + i] = { pubId: 'pub_9', uid: 'user_' + (1000 + i), type: 'heart', createdAt: '2026-11-01T10:' + String(i % 60).padStart(2, '0') + ':00Z' };
  const big = mk({ publications: { pub_9: { sellerUid: 's', likesCount: 100 } }, publication_likes: likes });
  const r = await big.api.likers('viewer_a', { pubId: 'pub_9' });
  assert.strictEqual(r.likers.length, MAX_LIKERS);
  assert.strictEqual(r.shown, MAX_LIKERS);
  assert.strictEqual(r.total, 100);
});

test('nettoyage : caractères invisibles retirés, réaction connue seulement', () => {
  assert.strictEqual(cleanText('A\u200Bli\u202Ece', 60), 'Alice');
  assert.strictEqual(cleanText({}, 10), '');
  assert.strictEqual(publicLiker({ uid: 'u1', type: 'x'.repeat(50) }, {}).type, 'xxxxxxxxxxxxxxxxxxxx');
  assert.strictEqual(publicLiker({ uid: 'u1' }, null).type, 'heart');
});

test('serveur : actions branchées avec une limite de débit, jamais d\'argent', () => {
  const core = read('api/_lib/payments-core.js');
  assert.match(core, /require\('\.\/post-social'\)/);
  assert.match(core, /post_likers: \d+/);
  assert.match(core, /post_views: \d+/);
  assert.match(core, /action === 'post_likers'/);
  assert.match(core, /action === 'post_views'/);
  const lib = read('api/_lib/post-social.js');
  assert.doesNotMatch(lib, /balance|wallet|payment|credit|FieldValue\.increment\((?!1\))/i);
  assert.doesNotMatch(lib, /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/, 'aucun caractère invisible brut dans le fichier');
  assert.ok(fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js')).length <= 12, 'Vercel gratuit : 12 fonctions au plus');
});

function loadClient() {
  const ctx = { setTimeout, clearTimeout, console, currentLang: 'fr' };
  ctx.window = ctx; ctx.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({}) };
  vm.createContext(ctx);
  vm.runInContext(read('post-social.js'), ctx, { filename: 'post-social.js' });
  return ctx;
}

test('fenêtre « Personnes qui ont aimé » : 8 langues complètes, mêmes mots à remplacer, aucun emoji ni dégradé', () => {
  const ctx = loadClient();
  const P = ctx.cnPostSocial;
  assert.ok(P && typeof P.open === 'function');
  const langs = ['fr', 'en', 'es', 'it', 'pt', 'de', 'sw', 'ln'];
  const keys = Object.keys(P.DICT.fr);
  langs.forEach((l) => {
    assert.ok(P.DICT[l], 'langue ' + l);
    assert.deepStrictEqual(Object.keys(P.DICT[l]).sort(), keys.slice().sort(), 'clés de ' + l);
    keys.forEach((k) => {
      assert.ok(String(P.DICT[l][k]).trim().length > 0, l + '.' + k);
      const toks = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join();
      assert.strictEqual(toks(P.DICT[l][k]), toks(P.DICT.fr[k]), 'variables de ' + l + '.' + k);
    });
  });
  const src = read('post-social.js');
  assert.doesNotMatch(src, /gradient\(/);
  assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.doesNotMatch(src, /db\.collection|firebase\.firestore/, 'aucune lecture ni écriture directe : tout passe par le serveur');
  assert.match(src, /action: 'post_likers'/);
});

test('fenêtre : un texte venu d\'une personne est toujours échappé (nom, photo)', () => {
  const ctx = loadClient();
  ctx.escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ctx.currentUser = { uid: 'me_uid_1' };
  ctx.renderAvatarHtml = (n) => '<i>' + ctx.escapeHtml(n) + '</i>';
  ctx.t = (k) => k;
  const html = ctx.cnPostSocial.rowHtml({ uid: 'u_evil_001', name: '"><img src=x onerror=alert(1)>', photoURL: '', verified: false, type: 'heart' });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  const mine = ctx.cnPostSocial.rowHtml({ uid: 'me_uid_1', name: 'Moi', photoURL: '', verified: false, type: 'heart' });
  assert.doesNotMatch(mine, /data-act="chat"/, 'pas de bouton Écrire sur sa propre ligne');
  assert.match(mine, /cnl-you/);
});

test('script.js : ligne J\'aime/vues, fenêtre à la demande, vues comptées par le serveur', () => {
  const s = read('script.js');
  assert.match(s, /function postStatsHtml\(item\)/);
  assert.match(s, /\$\{postStatsHtml\(item\)\}\s*\n\s*<div class="post-actions">/);
  assert.strictEqual((s.match(/\$\{postStatsHtml\(item\)\}/g) || []).length, 2, 'fil + fiche plein écran');
  assert.match(s, /cnLazyModule\('data-cn-psoc', 'post-social\.js\?v=\d+'/);
  assert.match(s, /action: 'post_views', ids/);
  assert.match(s, /data-views-count/);
  assert.match(s, /cnViewEnqueue\(pubId\);/, 'ouvrir une fiche compte une vue');
  assert.match(s, /intersectionRatio >= 0\.6/);
  // aucune écriture directe du compteur de vues depuis le téléphone
  assert.doesNotMatch(s, /collection\('publications'\)[^;\n]{0,80}update\(\{[^}]*viewsCount/);
});

test('bouton Retour : pile d\'historique créée sur un geste réel, jamais de nouvelle entrée sans toucher', () => {
  const s = read('script.js');
  assert.match(s, /\['pointerup', 'touchend', 'click', 'keydown'\]\.forEach\(\(ev\) => document\.addEventListener\(ev, cnNavEnsure, \{ capture: true, passive: true \}\)\)/);
  assert.match(s, /function cnNavBackPage\(\)/);
  assert.match(s, /history\.state && typeof st\.cnIdx|st && typeof st\.cnIdx === 'number'/);
  assert.match(s, /cnNavNoteTab\(tab\);/, 'les onglets s\'empilent');
  assert.match(read('shop-pro.js'), /window\.closeTopmostOverlay = function/);
  assert.match(read('polish.js'), /__cnWelcomeBack/);
});

test('fenêtre ouverte depuis le fil : styles présents et sans couleur nouvelle', () => {
  const css = read('pro.css');
  ['.post-stats{', '.cnl-sheet{', '.cnl-row{', '.cnl-msg{', '.cnl-follow{'].forEach((sel) => assert.ok(css.includes(sel), sel));
  const block = css.slice(css.indexOf('Publications : ligne'));
  assert.doesNotMatch(block, /gradient\(/);
  assert.doesNotMatch(block, /#(?:22c55e|16a34a|15803d|0f766e|7c3aed|8b5cf6)/i, 'pas de vert vif ni de violet');
});
