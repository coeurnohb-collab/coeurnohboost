// Ancienne adresse coeurnohboost.vercel.app : jamais de déconnexion forcée, fichiers techniques accessibles.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

/* ---------- Redirection HTTP de l'ancienne adresse ---------- */
const rule = vercel.redirects.find((r) => (r.has || []).some((h) => h.value === 'coeurnohboost.vercel.app'));
const pattern = rule.source.match(/^\/:path\((.*)\)$/)[1];
const redirected = (p) => new RegExp('^/(' + pattern + ')$').test(p);

test('ancienne adresse : les fichiers qui servent à ouvrir l\'application ne sont pas redirigés', () => {
  ['/', '/index.html', '/sw.js', '/manifest.json', '/.well-known/assetlinks.json', '/app.min.js', '/app.min.css', '/script.js',
    '/icon-192-v2.png', '/og-image.jpg', '/intro-dark.mp4', '/intro-light.webm', '/api/payment-initiate', '/__/auth/handler']
    .forEach((p) => assert.strictEqual(redirected(p), false, p + ' ne doit pas être redirigé'));
});

test('ancienne adresse : les pages publiques continuent d\'être redirigées vers l\'adresse officielle', () => {
  ['/about', '/terms', '/privacy', '/contact', '/s/mon-site', '/p/facture/abc', '/panel/x', '/services', '/legal.html', '/sitemap.xml', '/robots.txt']
    .forEach((p) => assert.strictEqual(redirected(p), true, p + ' doit être redirigé'));
  assert.strictEqual(rule.destination, 'https://coeurnohuniverse.com/:path');
});

test('ancienne adresse : non indexée par les moteurs de recherche (une seule adresse officielle)', () => {
  const block = vercel.headers.find((b) => (b.has || []).some((h) => h.value === 'coeurnohboost.vercel.app'));
  assert.ok(block, 'en-tête X-Robots-Tag pour l\'ancienne adresse manquant');
  assert.match(block.headers.find((h) => h.key === 'X-Robots-Tag').value, /noindex/);
  assert.match(html, /<link rel="canonical" href="https:\/\/coeurnohuniverse\.com\/">/);
});

test('Digital Asset Links : assetlinks.json valide, servi en JSON', () => {
  const a = JSON.parse(fs.readFileSync(path.join(root, '.well-known', 'assetlinks.json'), 'utf8'));
  assert.ok(Array.isArray(a) && a.length > 0);
  for (const e of a) {
    assert.ok(e.relation.includes('delegate_permission/common.handle_all_urls'));
    assert.strictEqual(e.target.namespace, 'android_app');
    assert.match(e.target.package_name, /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i);
    for (const fp of e.target.sha256_cert_fingerprints) assert.match(fp, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  }
  const h = vercel.headers.find((b) => b.source === '/.well-known/assetlinks.json');
  assert.match(h.headers.find((x) => x.key === 'Content-Type').value, /^application\/json/);
});

/* ---------- Script de l'ancienne adresse (index.html) ---------- */
const start = html.indexOf("(function(){try{\n  if(location.hostname!=='coeurnohboost.vercel.app')");
const script = html.slice(start, html.indexOf('})();', start) + 5);

// Faux navigateur : indexedDB piloté à la main
function run({ host = 'coeurnohboost.vercel.app', standalone = false, localKeys = [], idb = 'none', idbKeys = [], path: pth = '/', search = '' }) {
  const out = { go: null, upgradeAborted: false };
  const req = {};
  const keys = idbKeys.map((k) => ({ key: k }));
  const win = {
    matchMedia: () => ({ matches: standalone }),
    indexedDB: idb === 'unsupported' ? undefined : { open: () => req }
  };
  const ctx = {
    location: { hostname: host, pathname: pth, search, hash: '', replace: (u) => { out.go = u; } },
    navigator: {}, document: { referrer: '' }, window: win,
    localStorage: { length: localKeys.length, key: (i) => localKeys[i] },
    matchMedia: win.matchMedia, indexedDB: win.indexedDB, String
  };
  vm.runInNewContext(script, ctx);
  if (idb === 'unsupported' || typeof req.onsuccess !== 'function') return out; // le script s'est arrêté avant de lire la base
  if (idb === 'none') { // base absente : le navigateur crée puis nous la faisons annuler
    req.transaction = { abort() { out.upgradeAborted = true; } };
    req.onupgradeneeded();
    req.onerror();
  } else if (idb === 'nostore') {
    req.result = { objectStoreNames: { contains: () => false }, close() {} };
    req.onsuccess();
  } else { // base avec le magasin de Firebase
    let i = 0;
    const cur = {};
    req.result = {
      objectStoreNames: { contains: () => true }, close() {},
      transaction: () => ({ objectStore: () => ({ openCursor: () => cur }) })
    };
    cur.__next = () => { cur.result = i < keys.length ? { key: keys[i].key, continue() { i++; cur.__next(); } } : null; cur.onsuccess(); };
    req.onsuccess();
    cur.__next();
  }
  return out;
}

test('ancienne adresse : nouveau visiteur sans compte → envoyé vers l\'adresse officielle, mêmes paramètres', () => {
  assert.strictEqual(run({ idb: 'none', path: '/', search: '?open=abc' }).go, 'https://coeurnohuniverse.com/?open=abc');
  assert.strictEqual(run({ idb: 'unsupported' }).go, 'https://coeurnohuniverse.com/');
  assert.strictEqual(run({ idb: 'nostore' }).go, 'https://coeurnohuniverse.com/');
  assert.strictEqual(run({ idb: 'store', idbKeys: ['autre:cle'] }).go, 'https://coeurnohuniverse.com/');
});

test('ancienne adresse : personne déjà connectée ici → on reste (pas de déconnexion apparente)', () => {
  assert.strictEqual(run({ idb: 'store', idbKeys: ['x', 'firebase:authUser:AIza:[DEFAULT]'] }).go, null);
  assert.strictEqual(run({ localKeys: ['firebase:authUser:AIza:[DEFAULT]'], idb: 'none' }).go, null);
});

test('ancienne adresse : application installée (écran d\'accueil / Google Play) → on reste', () => {
  assert.strictEqual(run({ standalone: true, idb: 'none' }).go, null);
});

test('ancienne adresse : la base de connexion n\'est jamais créée par ce script (annulation de la création)', () => {
  assert.strictEqual(run({ idb: 'none' }).upgradeAborted, true);
});

test('adresse officielle : ce script ne fait rien', () => {
  assert.strictEqual(run({ host: 'coeurnohuniverse.com', idb: 'none' }).go, null);
});
