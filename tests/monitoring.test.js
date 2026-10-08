// tests/monitoring.test.js — App Check (surveillance) et tableau de bord des erreurs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('App Check : app-check.js est chargé avant script.js / admin.js, après Firebase', () => {
  for (const [page, main] of [['index.html', 'script.js'], ['admin.html', 'admin.js']]) {
    const h = read(page);
    const iApp = h.indexOf('firebase-app-compat.js'), iChk = h.indexOf('firebase-app-check-compat.js');
    const iMine = h.indexOf('<script src="app-check.js">'), iMain = h.indexOf('<script src="' + main + '">');
    assert.ok(iApp > -1 && iChk > iApp && iMine > iChk && iMain > iMine, page + ' : ordre des scripts App Check incorrect');
  }
  for (const f of ['script.js', 'admin.js']) {
    assert.match(read(f), /firebase\.initializeApp\(firebaseConfig\);\s*\n\s*if \(window\.cnInitAppCheck\) window\.cnInitAppCheck\(\);/, f + ' : App Check doit démarrer juste après initializeApp');
  }
});

test('App Check : sans clé il ne fait rien, avec la clé publique il s\'active', () => {
  const src = read('app-check.js');
  const run = (code) => {
    const win = { location: { hostname: 'coeurnohboost.vercel.app' } };
    let activated = false;
    const doc = { createElement: () => ({}), head: { appendChild() {} }, getElementById: () => null };
    const fb = { appCheck: () => ({ activate: () => { activated = true; } }) };
    new Function('window', 'self', 'location', 'document', 'console', 'firebase', code)(win, {}, win.location, doc, console, fb);
    return { result: win.cnInitAppCheck(), activated };
  };
  const keyMatch = src.match(/var SITE_KEY = '([^']*)';/);
  assert.ok(keyMatch, 'la ligne var SITE_KEY est introuvable');
  // 1) Sans clé : désactivé, aucun risque de blocage
  const keyless = run(src.replace(/var SITE_KEY = '[^']*';/, "var SITE_KEY = '';"));
  assert.strictEqual(keyless.result, false);
  assert.strictEqual(keyless.activated, false);
  // 2) Clé publique reCAPTCHA v3 : soit vide, soit au bon format (6L + 38 caractères)
  assert.match(keyMatch[1], /^$|^6L[\w-]{38}$/, 'la clé de site doit être vide ou une clé reCAPTCHA valide');
  // 3) Avec la clé du dépôt : activé
  if (keyMatch[1]) {
    const withKey = run(src);
    assert.strictEqual(withKey.result, true);
    assert.strictEqual(withKey.activated, true);
  }
});

test('App Check : la politique de sécurité (CSP) autorise reCAPTCHA v3 et App Check', () => {
  const csp = JSON.parse(read('vercel.json')).headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;
  const part = (name) => (csp.split(';').map((x) => x.trim()).find((x) => x.startsWith(name + ' ')) || '');
  assert.match(part('script-src'), /https:\/\/www\.google\.com\/recaptcha\//);
  assert.match(part('connect-src'), /https:\/\/firebaseappcheck\.googleapis\.com/);
  assert.match(part('connect-src'), /https:\/\/www\.google\.com\/recaptcha\//);
  assert.match(part('frame-src'), /https:\/\/www\.google\.com\/recaptcha\//);
  assert.match(part('connect-src'), /fcmregistrations\.googleapis\.com/, 'ne pas perdre la correction des notifications');
});

test('Surveillance : onglet « Erreurs » dans l\'admin, protégé contre l\'injection', () => {
  const a = read('admin.js'), h = read('admin.html');
  assert.match(a, /\{ id: "errors",\s+label: "🐞 Erreurs" \}/);
  assert.match(a, /if \(tab === 'errors'\) loadErrorsAdmin\(\);/);
  assert.match(h, /id="admin-tab-errors"/);
  assert.match(h, /id="admin-errors-body"/);
  for (const fn of ['loadErrorsAdmin', 'deleteErrorGroup', 'deleteAllErrorsInView', 'saveErrorThreshold']) assert.match(a, new RegExp('function ' + fn + '\\('));
  assert.match(a, /escapeHtml\(g\.msg\)/, 'le message d\'erreur (saisi par un visiteur) doit être échappé');
});

test('Surveillance : le cron quotidien alerte l\'admin quand une erreur se répète', () => {
  const c = read('api/run-scheduled-broadcasts.js');
  assert.match(c, /async function alertOnErrorSpikes\(/);
  assert.match(c, /uid: ADMIN_UID/);
  assert.match(c, /errorThreshold/);
  assert.match(c, /errorWatch = await alertOnErrorSpikes\(\)/);
});
