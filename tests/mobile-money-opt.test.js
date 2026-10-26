// Mobile Money via OPTGateway (20 pays) : serveur, application et panel des sites utilisent la même liste,
// la RDC garde le Mobile Money direct, les pays non couverts restent bloqués proprement.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const server = read('api/payment-initiate.js');
const script = read('script.js');
const panel = read('panel-store.js');
const guard = read('pay-guard.js');
const html = read('index.html');

const list = (src, re) => {
  const m = src.match(re);
  assert.ok(m, 'liste introuvable : ' + re);
  return m[1].split(',').map((x) => x.replace(/['"\s]/g, '')).filter(Boolean).sort();
};
const OPT20 = ['BF', 'BJ', 'CD', 'CG', 'CI', 'CM', 'ET', 'GA', 'GH', 'KE', 'LS', 'MW', 'MZ', 'NG', 'SL', 'SN', 'TZ', 'UG', 'ZM', 'ZW'];

test('Mobile Money OPTGateway : la même liste de 20 pays sur le serveur, dans l\'application et dans le panel', () => {
  const s = list(server, /OPT_MOBILE_COUNTRIES_DEFAULT = \[([^\]]*)\]/);
  const c = list(script, /const OPT_MOBILE_CODES = \[([^\]]*)\]/);
  const p = list(panel, /var OPT_MOBILE = \[([^\]]*)\]/);
  assert.deepStrictEqual(s, OPT20, 'liste du serveur');
  assert.deepStrictEqual(c, OPT20, 'liste de l\'application');
  assert.deepStrictEqual(p, OPT20, 'liste du panel');
});

test('Mobile Money OPTGateway : chacun des 20 pays existe dans le sélecteur de l\'application et du panel', () => {
  const i = script.indexOf('const COUNTRIES = [');
  const body = script.slice(i, script.indexOf('\n];', i));
  const clientCodes = [...body.matchAll(/code:"([A-Z]{2})"/g)].map((m) => m[1]);
  const j = panel.indexOf('var CTRY = [');
  const pbody = panel.slice(j, panel.indexOf('\n  ];', j));
  const panelCodes = [...pbody.matchAll(/\['([A-Z]{2})',/g)].map((m) => m[1]);
  OPT20.forEach((c) => {
    assert.ok(clientCodes.includes(c), c + ' manque dans COUNTRIES (script.js)');
    assert.ok(panelCodes.includes(c), c + ' manque dans CTRY (panel-store.js)');
  });
});

test('Mobile Money : la RDC reste en direct (MbotePay), jamais redirigée vers OPTGateway', () => {
  assert.match(script, /payCountryCode !== 'CD' && OPT_MOBILE_CODES\.includes\(payCountryCode\)/);
  assert.match(script, /if \(payMethod === 'mobile' && !payUsesOptMobile\(\)\) \{/, 'le Mobile Money direct ne doit plus s\'exécuter pour les pays OPTGateway');
  assert.match(panel, /function optMob\(code\) \{ return code !== 'CD'/);
  assert.match(server, /const MBOTEPAY_ALLOWED_DEFAULT = \['CD'\];/, 'MbotePay reste limité à la RDC');
  assert.match(guard, /var COVERED = \{\s*CD:/);
});

test('Mobile Money OPTGateway : l\'application envoie le moyen et le pays au serveur', () => {
  assert.match(script, /onlyMethod: payMethod === 'illicocash' \? 'illicocash' : \(payMethod === 'mobile' \? 'mobile_money' : 'card'\), countryCode: payMethod === 'mobile' \? payCountryCode : undefined/);
  assert.match(panel, /provider: 'optgateway', amountUSD: amt, onlyMethod: 'mobile_money', countryCode: cc/);
  // Le numéro et l'opérateur ne sont plus exigés pour ces pays (ils se saisissent chez OPTGateway)
  assert.match(script, /\(!payOperator && !payUsesOptMobile\(\)\)/);
  assert.match(script, /!phone && !payUsesOptMobile\(\)/);
  // Le panel ne doit pas lire un champ de téléphone absent
  assert.match(panel, /var phEl = box\.querySelector\('#pm-ph'\), ph = \(\(phEl && phEl\.value\) \|\| ''\)/);
});

test('Mobile Money OPTGateway : pay-guard ne bloque pas ces pays et bloque toujours les autres', () => {
  assert.match(guard, /function isOptMobile\(code\)/);
  assert.match(guard, /if \(isOptMobile\(code\)\) \{ hide\(\); return; \}/);
  assert.match(guard, /!isOptMobile\(payCountryCode\)/);
  assert.match(guard, /if \(!COVERED\[code\]\) \{ show\(esc\(tx\('country'\)\)\)/, 'le message « pays non couvert » doit rester pour les autres pays');
});

test('Mobile Money OPTGateway : formulaire (note, bloc téléphone) et textes en 5 langues', () => {
  assert.match(html, /id="pay-opt-note"/);
  assert.match(html, /id="pay-phone-block"/);
  assert.match(html, /id="recharge-phone"/);
  assert.strictEqual((read('translations.js').match(/pay_opt_note:/g) || []).length, 5, 'pay_opt_note dans les 5 langues');
  assert.strictEqual((read('panel-i18n.js').match(/rc_opt_note:/g) || []).length, 5, 'rc_opt_note dans les 5 langues');
  assert.doesNotMatch(read('panel-i18n.js'), /RDC uniquement|DR Congo only|solo RD Congo/, 'ancien message « RDC uniquement » à retirer');
});

test('Mobile Money OPTGateway : fichiers compilés à jour', () => {
  const min = read('app.min.js');
  assert.ok(min.includes('OPT_MOBILE_CODES'));
  assert.ok(min.includes('mobile_money') && min.includes('pay-opt-note') && min.includes('pay_opt_note'));
});
