// Recharge Mobile Money simplifiée (SasPay) : un seul parcours, pays détecté, opérateur et numéro choisis sur la page de
// paiement sécurisée. Plus d'opérateurs, de numéro, de bascule de devise ni de message « pays non couvert » dans l'écran.
// Le panel des sites (panel-store.js) garde son propre parcours : il reste vérifié ici.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const server = read('api/payment-initiate.js');
const saspayLib = read('api/_lib/saspay.js');
const script = read('script.js');
const panel = read('panel-store.js');
const html = read('index.html');
const menu = read('menu-pro.js');
const tr = read('translations.js');

const mapOf = (src, re) => {
  const m = src.match(re);
  assert.ok(m, 'table introuvable : ' + re);
  const out = {};
  for (const x of m[1].matchAll(/([A-Z]{2}):\s*'([A-Z]{3})'/g)) out[x[1]] = x[2];
  return out;
};
const list = (src, re) => {
  const m = src.match(re);
  assert.ok(m, 'liste introuvable : ' + re);
  return m[1].split(',').map((x) => x.replace(/['"\s]/g, '')).filter(Boolean).sort();
};

test('Mobile Money : les pays et devises de l\'écran = ceux de SasPay côté serveur', () => {
  const client = mapOf(script, /const SASPAY_CURRENCY = \{([\s\S]*?)\n\};/);
  const serverMap = mapOf(saspayLib, /const CURRENCY_BY_COUNTRY = \{([\s\S]*?)\n\};/);
  assert.ok(Object.keys(client).length >= 25, 'liste des pays trop courte');
  assert.deepStrictEqual(client, serverMap, 'SASPAY_CURRENCY (script.js) doit rester identique à CURRENCY_BY_COUNTRY (api/_lib/saspay.js)');
});

test('Mobile Money : la marge d\'affichage « ≈ » est celle du serveur', () => {
  const c = script.match(/const PAY_MOBILE_MARGIN_PERCENT = (\d+(?:\.\d+)?);/);
  const s = server.match(/const MARGIN_PERCENT = (\d+(?:\.\d+)?);/);
  assert.ok(c && s);
  assert.strictEqual(c[1], s[1]);
});

test('Mobile Money : fuseaux horaires → pays uniquement vers des pays SasPay', () => {
  const client = mapOf(script, /const SASPAY_CURRENCY = \{([\s\S]*?)\n\};/);
  const block = script.slice(script.indexOf('const PAY_TZ_COUNTRY = {'), script.indexOf('};', script.indexOf('const PAY_TZ_COUNTRY = {')));
  const codes = [...block.matchAll(/'[A-Za-z_]+\/[A-Za-z_-]+':\s*'([A-Z]{2})'/g)].map((m) => m[1]);
  assert.ok(codes.length >= 25);
  codes.forEach((c) => assert.ok(client[c], 'fuseau → ' + c + ' absent de SASPAY_CURRENCY'));
});

test('Mobile Money : un seul parcours, sans opérateur ni numéro, envoyé au serveur avec le pays', () => {
  assert.match(script, /onlyMethod: payMethod === 'illicocash' \? 'illicocash' : \(payMethod === 'mobile' \? 'mobile_money' : 'card'\),\s*countryCode: payMethod === 'mobile' \? payCountryCode : undefined/);
  ['payUsesOptMobile', 'OPT_MOBILE_CODES', 'MOBILE_COVERED_CODES', 'renderPayOperators', 'selectOperator', 'selectPayCurrency', 'renderPayCurrencyToggle', 'renderPayOptNote', 'payOperator'].forEach((n) => {
    assert.ok(!script.includes(n), n + ' (ancien système) ne doit plus être dans script.js');
  });
  ['pay-operators', 'pay-phone-block', 'recharge-phone', 'pay-currency-toggle', 'pay-manual-note'].forEach((id) => {
    assert.ok(!html.includes('id="' + id + '"'), '#' + id + ' (ancien système) ne doit plus être dans index.html');
  });
  // Plus de repli « demande manuelle » silencieux depuis l'écran de recharge
  assert.doesNotMatch(script.slice(script.indexOf('async function submitRecharge')), /collection\('topup_requests'\)\.add/);
});

test('Mobile Money : l\'ancien garde-fou « pays non couvert » n\'est plus chargé', () => {
  assert.doesNotMatch(menu, /pay-guard\.js/);
  assert.doesNotMatch(read('pay-guard.js'), /COVERED|cn-pay-notice-cta|Payer par crypto/);
  assert.doesNotMatch(read('pro.css'), /cn-uncovered|cn-pay-notice/);
});

test('Mobile Money : l\'écran propose pays détecté + « Changer », liste ouverte si pays inconnu, bouton « Payer »', () => {
  assert.match(html, /id="pay-sp-country"/);
  assert.match(html, /id="pay-sp-change"[^>]*onclick="togglePayCountryPicker\(\)"/);
  assert.match(html, /id="pay-country-select"[^>]*onchange="onPayCountryChange\(\)"/);
  assert.match(html, /id="recharge-submit-btn"[^>]*data-i18n="pay_btn_pay"/);
  assert.match(script, /function detectPayCountry\(\)/);
  assert.match(script, /sel\.classList\.toggle\('hidden', known\)/, 'liste des pays ouverte d\'emblée si le pays est inconnu');
  assert.match(script, /isSaspayCountry\(payCountryCode\)\) \{\s*\/\/ Pays inconnu/, 'la personne est invitée à choisir son pays avant de payer');
});

test('Mobile Money : un double appui sur « Payer » ne crée pas deux paiements', () => {
  assert.match(script, /if \(btn && btn\.disabled\) return;/);
  assert.match(script, /redirecting = true;/);
  assert.match(script, /if \(!redirecting\) payResetSubmitBtn\(\);/);
  assert.match(script, /addEventListener\('pageshow', \(e\) => \{ if \(e\.persisted\) payResetSubmitBtn\(\); \}\)/);
});

test('Mobile Money : messages du serveur « Mobile Money indisponible / pays non ouvert » affichés tels quels', () => {
  assert.match(script, /\/\^mobile_\/\.test\(String\(data\.code \|\| ''\)\)/);
  assert.match(server, /code: 'mobile_' \+ reason/);
});

test('Mobile Money : textes en 5 langues', () => {
  ['pay_opt_note', 'pay_sp_change', 'pay_sp_other', 'pay_sp_equiv', 'pay_sp_err_country', 'pay_redirecting', 'pay_crypto_note'].forEach((k) => {
    assert.strictEqual((tr.match(new RegExp('\\n    ' + k + ': ', 'g')) || []).length, 5, k + ' dans les 5 langues');
  });
  assert.ok((tr.match(/pay_sp_equiv: "[^"]*\{amount\}[^"]*\{cur\}/g) || []).length === 5, 'pay_sp_equiv garde {amount} et {cur}');
  assert.doesNotMatch(tr, /pay_crypto_note: "[^"]*WhatsApp/, 'le texte crypto ne parle plus d\'une adresse envoyée par WhatsApp (la facture s\'ouvre directement)');
});

test('Panel des sites : même liste OPTGateway que le serveur, sélecteur complet', () => {
  const OPT20 = ['BF', 'BJ', 'CD', 'CG', 'CI', 'CM', 'ET', 'GA', 'GH', 'KE', 'LS', 'MW', 'MZ', 'NG', 'SL', 'SN', 'TZ', 'UG', 'ZM', 'ZW'];
  assert.deepStrictEqual(list(server, /OPT_MOBILE_COUNTRIES_DEFAULT = \[([^\]]*)\]/), OPT20, 'liste du serveur');
  assert.deepStrictEqual(list(panel, /var OPT_MOBILE = \[([^\]]*)\]/), OPT20, 'liste du panel');
  const j = panel.indexOf('var CTRY = [');
  const pbody = panel.slice(j, panel.indexOf('\n  ];', j));
  const panelCodes = [...pbody.matchAll(/\['([A-Z]{2})',/g)].map((m) => m[1]);
  OPT20.forEach((c) => assert.ok(panelCodes.includes(c), c + ' manque dans CTRY (panel-store.js)'));
  assert.match(panel, /provider: 'optgateway', amountUSD: amt, onlyMethod: 'mobile_money', countryCode: cc/);
  assert.match(panel, /var phEl = box\.querySelector\('#pm-ph'\), ph = \(\(phEl && phEl\.value\) \|\| ''\)/);
  assert.strictEqual((read('panel-i18n.js').match(/rc_opt_note:/g) || []).length, 5, 'rc_opt_note dans les 5 langues');
  assert.doesNotMatch(read('panel-i18n.js'), /RDC uniquement|DR Congo only|solo RD Congo/);
});

test('Mobile Money : fichiers compilés à jour', () => {
  const min = read('app.min.js');
  assert.ok(min.includes('SASPAY_CURRENCY') && min.includes('detectPayCountry') && min.includes('pay_sp_equiv'));
  assert.ok(!min.includes('OPT_MOBILE_CODES') && !min.includes('pay-guard.js'));
  assert.ok(read('app.min.css').includes('.pay-sp-country'));
});
