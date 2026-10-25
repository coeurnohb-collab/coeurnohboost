// Clic sur une notification : l'application s'ouvre sur la bonne page, sans déconnexion.
// Le service worker (sw.js) est exécuté ici avec de faux navigateurs : app ouverte qui répond,
// app ouverte mais gelée, app fermée, lien piégé vers un autre site.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const ORIGIN = 'https://coeurnohuniverse.com';

function loadSw(clients) {
  const handlers = {};
  const calls = { open: [], navigate: [], focus: 0, storage: 0 };
  const self = {
    location: { origin: ORIGIN },
    addEventListener(type, fn) { handlers[type] = fn; },
    registration: { getNotifications: async () => [], showNotification: async () => {} },
    clients: { matchAll: async () => clients(calls), openWindow: async (u) => { calls.open.push(u); }, claim() {} },
    skipWaiting() {}
  };
  const sandbox = {
    self, URL, MessageChannel, setTimeout, clearTimeout, Promise, console, navigator: {},
    importScripts() {}, firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage() {} }) },
    caches: { open: async () => ({ addAll: async () => {}, put: async () => {} }), keys: async () => [], delete: async () => true, match: async () => null },
    fetch: async () => ({})
  };
  vm.runInNewContext(SRC, sandbox);
  return { handlers, calls };
}
async function click(sw, url, action) {
  let waited;
  await sw.handlers.notificationclick({
    action: action || 'open',
    notification: { close() {}, data: url === undefined ? {} : { url } },
    waitUntil(p) { waited = p; }
  });
  if (waited) await waited;
}
const liveClient = (calls, answer) => ({
  url: ORIGIN + '/',
  visibilityState: 'visible',
  focus: async () => { calls.focus++; },
  navigate: async (u) => { calls.navigate.push(u); },
  postMessage(msg, ports) { calls.msg = msg; if (answer && ports && ports[0]) ports[0].postMessage('ok'); }
});

test('notification : app ouverte qui répond → on lui transmet le lien, sans recharger ni ouvrir de fenêtre', async () => {
  const sw = loadSw((calls) => [liveClient(calls, true)]);
  await click(sw, '/?open=abc123');
  assert.strictEqual(sw.calls.msg.type, 'cn-open');
  assert.strictEqual(sw.calls.msg.url, '/?open=abc123');
  assert.strictEqual(sw.calls.focus, 1);
  assert.deepStrictEqual(sw.calls.navigate, []);
  assert.deepStrictEqual(sw.calls.open, []);
});

test('notification : app ouverte mais gelée (aucune réponse) → on la dirige vers la bonne page', async () => {
  const sw = loadSw((calls) => [liveClient(calls, false)]);
  await click(sw, '/?msg=chat42');
  assert.deepStrictEqual(sw.calls.navigate, [ORIGIN + '/?msg=chat42']);
  assert.deepStrictEqual(sw.calls.open, []);
});

test('notification : app fermée → une fenêtre s\'ouvre directement sur la bonne page', async () => {
  const sw = loadSw(() => []);
  await click(sw, '/?open=pub9&x=1#c');
  assert.deepStrictEqual(sw.calls.open, [ORIGIN + '/?open=pub9&x=1#c']);
});

test('notification : un onglet d\'un autre site n\'est jamais utilisé', async () => {
  const other = (calls) => ({ url: 'https://autre-site.example/', visibilityState: 'visible', focus: async () => { calls.focus++; }, postMessage() { throw new Error('ne doit pas être contacté'); } });
  const sw = loadSw((calls) => [other(calls)]);
  await click(sw, '/?tab=wallet');
  assert.strictEqual(sw.calls.focus, 0);
  assert.deepStrictEqual(sw.calls.open, [ORIGIN + '/?tab=wallet']);
});

test('notification : un lien vers un autre site est remplacé par l\'accueil de l\'application', async () => {
  for (const bad of ['https://hameconnage.example/login', '//hameconnage.example', 'javascript:alert(1)', 'http://coeurnohuniverse.com.evil.example/']) {
    const sw = loadSw(() => []);
    await click(sw, bad);
    assert.strictEqual(sw.calls.open.length, 1, bad);
    assert.ok(sw.calls.open[0] === ORIGIN + '/' || sw.calls.open[0].startsWith(ORIGIN + '/'), bad + ' → ' + sw.calls.open[0]);
    assert.strictEqual(new URL(sw.calls.open[0]).origin, ORIGIN, bad);
  }
});

test('notification : sans lien → accueil ; « Plus tard » n\'ouvre rien', async () => {
  const a = loadSw(() => []); await click(a, undefined);
  assert.deepStrictEqual(a.calls.open, [ORIGIN + '/']);
  const b = loadSw(() => []); await click(b, '/?open=x', 'later');
  assert.deepStrictEqual(b.calls.open, []);
});

test('notification : le clic ne touche jamais à la session (aucun effacement de stockage ni déconnexion)', () => {
  const block = SRC.slice(SRC.indexOf('function internalTarget'), SRC.indexOf('const CACHE_NAME'));
  assert.doesNotMatch(block, /signOut|indexedDB|localStorage|sessionStorage|caches\.delete|deleteDatabase|clear\(/);
});

test('notification : l\'application répond au service worker et garde le lien si la personne n\'est pas encore reconnue', () => {
  const pc = fs.readFileSync(path.join(__dirname, '..', 'push-center.js'), 'utf8');
  assert.match(pc, /e\.ports\[0\]\.postMessage\('ok'\)/, 'accusé de réception manquant');
  assert.match(pc, /function setPending/, 'lien en attente manquant');
  assert.match(pc, /if \(!cu\(\)\) \{ setPending\(rel\); waitForUser\(\); return; \}/, 'le lien ne doit plus être perdu quand le compte n\'est pas prêt');
  assert.match(pc, /flushPending/);
});
