// Notifications en UN geste : plus de guide en trois gestes, plus de message rouge, détection automatique au retour,
// navigateur intégré (WhatsApp, TikTok…) avec bouton « Ouvrir dans Chrome », jamais de culpabilisation.
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

test('notifications : 5 langues, mêmes clés, message calme « le téléphone bloque » sans liste de gestes', () => {
  const L = loadL10N3();
  assert.deepStrictEqual(Object.keys(L).sort(), ['en', 'es', 'fr', 'it', 'pt']);
  const keys = Object.keys(L.fr).sort();
  for (const l of Object.keys(L)) {
    assert.deepStrictEqual(Object.keys(L[l]).sort(), keys, 'clés de ' + l);
    for (const k of keys) assert.ok(String(L[l][k]).trim().length > 1, l + '.' + k);
    assert.ok(!('g_web' in L[l]) && !('g_app' in L[l]) && !('g_check' in L[l]) && !('g_still' in L[l]), l + ' : plus de guide en 3 gestes');
    assert.ok(L[l].g_blocked.length <= 140, l + ' : message assez court pour un toast');
    assert.doesNotMatch(L[l].g_blocked, /3|trois|three|tres|tre |três/i, l + ' : aucune liste de gestes');
  }
});

test('activation : UNE seule demande de permission ; refus ou blocage = message calme + 7 jours sans invitation, jamais de fenêtre ni d\'erreur rouge', () => {
  assert.strictEqual((pc.match(/Notification\.requestPermission\(/g) || []).length, 1, 'une seule demande de permission');
  assert.match(pc, /if \(perm === 'denied' \|\| Date\.now\(\) - t0 < 700\) blockedCalm\(\);/);
  assert.match(pc, /function blockedCalm\(\) \{[\s\S]*?toast\(tx3\('g_blocked'\), 'info'\);[\s\S]*?7 \* DAY/);
  assert.match(pc, /if \(st === 'denied'\) \{ hideAsk\(\); blockedCalm\(\);/);
  assert.match(pc, /g_later_toast/);
  assert.doesNotMatch(pc, /g_still|g_check|showGuide\('denied'\)|showGuide\('blocked'\)|g_web|g_app/);
  const blocked = pc.slice(pc.indexOf('function blockedCalm()'), pc.indexOf('function autoFinish()'));
  assert.doesNotMatch(blocked, /'error'/, 'pas de message rouge');
});

test('activation : se termine toute seule au retour dans l\'application après autorisation dans les réglages du téléphone', () => {
  assert.match(pc, /function autoFinish\(\)/);
  assert.match(pc, /if \(waitGrant && Notification\.permission === 'granted'\) \{ waitGrant = false; closeGuide\(\); finishEnable\(\); \}/);
  assert.match(pc, /window\.addEventListener\('focus', autoFinish\)/);
  assert.match(pc, /document\.addEventListener\('visibilitychange', function \(\) \{ if \(document\.visibilityState === 'visible'\) autoFinish\(\); \}\)/);
  assert.match(pc, /function recheck\(\)/);
});

test('notifications bloquées : une seule ligne d\'aide dans la carte des Paramètres et le bandeau, plus de fenêtre en 3 étapes', () => {
  assert.match(pc, /esc\(tx\('denhelp'\)\)/);
  assert.doesNotMatch(pc, /cn-push-guide-btn/);
  assert.doesNotMatch(pc, /#cn-push-guide ol|#cn-push-guide li/);
  assert.match(pc, /data-a="' \+ \(st === 'denied' \? 'recheck'/);
});

test('navigateur intégré (WhatsApp, Facebook, TikTok…) : bouton « Ouvrir dans Chrome »', () => {
  assert.match(pc, /function inAppBrowser\(\)/);
  assert.match(pc, /package=com\.android\.chrome/);
  assert.match(pc, /showGuide\(\)/);
});

test('connexion : aucune demande d\'autorisation automatique à l\'ouverture (seulement après un geste)', () => {
  const fn = script.slice(script.indexOf('async function registerPushNotifications()'));
  assert.doesNotMatch(fn.slice(0, 900), /requestPermission/);
});
