// Notifications faciles : guide en 3 gestes, détection automatique, navigateur intégré, jamais de culpabilisation.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const pc = fs.readFileSync(path.join(__dirname, '..', 'push-center.js'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function loadL10N3() {
  const a = pc.indexOf('var L10N3 = {');
  const b = pc.indexOf('function tx3(');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(pc.slice(a, b).replace('var L10N3 =', 'this.L = '), ctx);
  return ctx.L;
}

test('guide notifications : 5 langues, mêmes clés, 3 gestes pour le navigateur et pour l\'application installée', () => {
  const L = loadL10N3();
  assert.deepStrictEqual(Object.keys(L).sort(), ['en', 'es', 'fr', 'it', 'pt']);
  const keys = Object.keys(L.fr).sort();
  for (const l of Object.keys(L)) {
    assert.deepStrictEqual(Object.keys(L[l]).sort(), keys, 'clés de ' + l);
    assert.strictEqual(L[l].g_web.length, 3, l + ' : 3 gestes (navigateur)');
    assert.strictEqual(L[l].g_app.length, 3, l + ' : 3 gestes (application)');
    for (const k of keys) assert.ok(String(L[l][k]).trim().length > 1, l + '.' + k);
  }
});

test('activation : une fenêtre fermée sans réponse n\'est pas un refus ; un blocage guide en 3 gestes', () => {
  assert.strictEqual((pc.match(/Notification\.requestPermission\(/g) || []).length, 1, 'une seule demande de permission');
  assert.match(pc, /if \(perm === 'denied'\) showGuide\('denied'\);/);
  assert.match(pc, /else if \(Date\.now\(\) - t0 < 700\) showGuide\('blocked'\);/);
  assert.match(pc, /g_later_toast/);
});

test('activation : se termine toute seule au retour dans l\'application après le changement de réglage', () => {
  assert.match(pc, /function autoFinish\(\)/);
  assert.match(pc, /window\.addEventListener\('focus', autoFinish\)/);
  assert.match(pc, /document\.addEventListener\('visibilitychange', function \(\) \{ if \(document\.visibilityState === 'visible'\) autoFinish\(\); \}\)/);
});

test('navigateur intégré (WhatsApp, Facebook, TikTok…) : bouton « Ouvrir dans Chrome »', () => {
  assert.match(pc, /function inAppBrowser\(\)/);
  assert.match(pc, /package=com\.android\.chrome/);
  assert.match(pc, /showGuide\('inapp'\)/);
});

test('connexion : aucune demande d\'autorisation automatique à l\'ouverture (seulement après un geste)', () => {
  const fn = script.slice(script.indexOf('async function registerPushNotifications()'));
  assert.doesNotMatch(fn.slice(0, 900), /requestPermission/);
});
