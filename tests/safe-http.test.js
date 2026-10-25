const test = require('node:test');
const assert = require('node:assert');
const { isPrivateIp, parseSafeUrl, safeRequest } = require('../api/_lib/safe-http');
// secret-box est intégré dans api/_lib/site-panel.js (un seul fichier à déposer) : on en extrait le bloc pour le tester.
function loadSecretBox() {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'api', '_lib', 'site-panel.js'), 'utf8');
  const start = src.indexOf('const box = (function () {');
  const end = src.indexOf('})();', start) + 5;
  assert.ok(start > 0 && end > start, 'bloc secret-box introuvable dans site-panel.js');
  return new Function('require', src.slice(start, end).replace('const box =', 'return'))(require);
}
const { seal, open, mask } = loadSecretBox();

test('adresses privées refusées, publiques acceptées', () => {
  ['127.0.0.1', '10.0.0.5', '172.16.3.4', '172.31.255.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.1.1.1', '224.0.0.1', 'pas-une-ip'].forEach((ip) => assert.ok(isPrivateIp(ip), ip));
  ['8.8.8.8', '1.1.1.1', '172.32.0.1', '151.101.1.1', '2606:4700::1111'].forEach((ip) => assert.ok(!isPrivateIp(ip), ip));
});
test('adresses : seulement https public', () => {
  assert.strictEqual(parseSafeUrl('https://monpanel.com/api/v2').hostname, 'monpanel.com');
  ['http://monpanel.com/api', 'https://localhost/api', 'https://127.0.0.1/', 'https://[::1]/', 'https://169.254.169.254/latest', 'https://user:pw@monpanel.com/', 'https://monpanel.com:8443/', 'https://serveur/api', 'https://nas.local/api', 'https://10.0.0.1/', 'https://2130706433/', 'ftp://x.com', 'n’importe quoi', ''].forEach((u) => assert.throws(() => parseSafeUrl(u), undefined, u));
});
test('requête : une résolution vers une IP privée est bloquée', async () => {
  const privateLookup = (h, o, cb) => { if (typeof o === 'function') cb = o; cb(new Error('Adresse non autorisée.')); };
  await assert.rejects(() => safeRequest({ url: 'https://exemple-public.test/api', lookup: privateLookup }), /non autorisée/);
  await assert.rejects(() => safeRequest({ url: 'http://exemple.test/' }), /https/);
});
test('chiffrement : aller-retour, aucune fuite, altération détectée', () => {
  const secret = 'x'.repeat(40) + 'clé-de-test';
  const s = seal('ma-cle-api-123456', secret);
  assert.ok(!s.includes('ma-cle-api')); assert.strictEqual(open(s, secret), 'ma-cle-api-123456'); assert.notStrictEqual(seal('a', secret), seal('a', secret));
  assert.throws(() => open(s, secret + 'y')); assert.throws(() => open(s.slice(0, -4) + 'AAAA', secret));
  assert.throws(() => seal('x', ''), /indisponible/); assert.strictEqual(mask('abcdef123456'), '••••3456');
});
