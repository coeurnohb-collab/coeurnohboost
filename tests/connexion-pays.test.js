// Recharge : pays détecté selon la position réelle (IP, puis fuseau horaire, puis langue), tous les pays SasPay ;
// Connexion : écran simple (onglets, Entrée valide, nom facultatif, faute d'email corrigée) sans rien perdre en sécurité.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const script = read('script.js');

/* ---------- liste des pays ---------- */

function countryCodes() {
  const m = /const PAY_COUNTRY_CODES = \(([\s\S]*?)\)\.split\(' '\);/.exec(script);
  assert.ok(m, 'PAY_COUNTRY_CODES introuvable');
  const text = Function('return (' + m[1] + ')')();
  return text.split(' ');
}

test('recharge : TOUS les pays de la liste SasPay sont proposés (codes ISO uniques), dont tous les pays déjà connus', () => {
  const codes = countryCodes();
  assert.ok(codes.length >= 190, 'au moins 190 pays, trouvé ' + codes.length);
  assert.strictEqual(new Set(codes).size, codes.length, 'aucun doublon');
  codes.forEach((c) => assert.match(c, /^[A-Z]{2}$/));
  ['CD', 'CG', 'UG', 'CM', 'SN', 'CI', 'KE', 'NG', 'GH', 'ZM', 'TZ', 'RW', 'FR', 'US', 'IN', 'XK', 'ZA', 'MA', 'DZ', 'EG'].forEach((c) => assert.ok(codes.includes(c), c + ' manquant'));
  const cur = /const SASPAY_CURRENCY = \{([\s\S]*?)\};/.exec(script)[1];
  (cur.match(/\b[A-Z]{2}(?=:)/g) || []).forEach((c) => assert.ok(codes.includes(c), c + ' (monnaie connue) absent de la liste'));
});

test('recharge : la liste déroulante est alphabétique et ne met aucun pays en avant d\'avance', () => {
  const i = script.indexOf('function renderPayMobile()');
  const body = script.slice(i, i + 900);
  assert.match(body, /PAY_COUNTRY_CODES\.slice\(\)\.sort\(/);
  assert.doesNotMatch(body, /\['CD'\]\.concat/);
});

/* ---------- pays par défaut : position réelle ---------- */

test('recharge : pays par défaut = choix de la session, puis adresse IP, puis fuseau horaire, puis langue — jamais fixé au Congo', () => {
  const i = script.indexOf('function detectPayCountry()');
  const body = script.slice(i, script.indexOf('function getIpCountry()', i));
  const pos = (s) => body.indexOf(s);
  assert.ok(pos('payManualChoice()') > -1 && pos('payCachedIpCountry()') > pos('payManualChoice()'), 'choix manuel puis IP');
  assert.ok(pos('resolvedOptions().timeZone') > pos('payCachedIpCountry()'), 'fuseau horaire après l\'IP');
  assert.ok(pos('navigator.languages') > pos('resolvedOptions().timeZone'), 'langue après le fuseau');
  assert.match(body, /return null; \/\/ aucun indice/);
  assert.doesNotMatch(body, /return 'CD'/, 'aucun pays imposé');
  // L'ancien choix mémorisé « pour toujours » (ex. Ouganda choisi pendant un test) est oublié ; les nouveaux choix ne vivent que la session.
  assert.match(body, /localStorage\.removeItem\('cn_pay_country'\)/);
  assert.doesNotMatch(script, /localStorage\.setItem\('cn_pay_country'/);
  assert.match(script, /sessionStorage\.setItem\('cn_pay_country'/);
});

test('recharge : la réponse de l\'adresse IP arrive après l\'affichage et prime sur fuseau/langue, sauf choix manuel', () => {
  assert.match(script, /fetch\('\/api\/payment-initiate\?geo=1'/);
  const i = script.indexOf('function refinePayCountryByIp()');
  const body = script.slice(i, i + 700);
  assert.match(body, /payManualChoice\(\)/);
  assert.match(body, /renderPayMobile\(\)/);
  assert.match(script, /refinePayCountryByIp\(\);\n\}\n\/\/ Message clair quand le serveur refuse/, 'lancé à l\'ouverture de l\'écran de recharge');
});

test('serveur : GET /api/payment-initiate?geo=1 ne renvoie que le code pays (jamais l\'adresse IP), sans cache', () => {
  const src = read('api/payment-initiate.js');
  const fn = /function ipCountry\(req\) \{[\s\S]*?\n\}\n/.exec(src);
  assert.ok(fn, 'ipCountry introuvable');
  const ipCountry = Function(fn[0] + '; return ipCountry;')();
  assert.strictEqual(ipCountry({ headers: { 'x-vercel-ip-country': 'cd' } }), 'CD');
  assert.strictEqual(ipCountry({ headers: { 'cf-ipcountry': 'UG', 'x-vercel-ip-country': 'FR' } }), 'UG');
  assert.strictEqual(ipCountry({ headers: { 'cf-ipcountry': 'XX', 'x-vercel-ip-country': 'SN' } }), 'SN');
  assert.strictEqual(ipCountry({ headers: { 'cf-ipcountry': 'T1' } }), null, 'Tor : pas de pays');
  assert.strictEqual(ipCountry({ headers: { 'x-vercel-ip-country': '<script>' } }), null);
  assert.strictEqual(ipCountry({ headers: {} }), null);
  assert.strictEqual(ipCountry({}), null);
  const h = src.slice(src.indexOf('module.exports = async function handler'));
  assert.ok(h.indexOf("req.query.geo !== undefined") > -1 && h.indexOf("req.query.geo") < h.indexOf("req.method !== 'POST'"), 'la branche geo précède le contrôle POST');
  assert.match(h, /Cache-Control', 'private, no-store'/);
  assert.match(h, /json\(\{ country: ipCountry\(req\) \}\)/);
  assert.doesNotMatch(h.slice(0, h.indexOf("req.method !== 'POST'")), /x-forwarded-for|remoteAddress/);
  assert.strictEqual(fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js')).length, 12, 'toujours 12 fonctions Vercel');
});

/* ---------- connexion simplifiée ---------- */

test('connexion : onglets Créer un compte / Se connecter, formulaire validé par Entrée, nom facultatif en dernier', () => {
  const html = read('index.html');
  assert.match(html, /id="auth-tab-register"[^>]*onclick="setAuthMode\('register'\)"/);
  assert.match(html, /id="auth-tab-login"[^>]*onclick="setAuthMode\('login'\)"/);
  assert.match(html, /<form id="auth-form" novalidate onsubmit="submitAuth\(\); return false;">/);
  assert.match(html, /id="auth-submit" type="submit"/);
  const pos = (s) => html.indexOf(s);
  assert.ok(pos('id="auth-email"') < pos('id="auth-password"') && pos('id="auth-password"') < pos('id="auth-name-field"'), 'email, mot de passe, puis nom');
  assert.ok(pos('id="auth-name-field"') < pos('id="auth-submit"'));
  assert.match(html, /id="auth-loading" data-i18n="auth_loading"/);
  // Le bouton Google reste en place et la logique de sécurité (8 caractères, mots de passe courants) est intacte.
  assert.match(html, /id="google-btn"/);
  assert.match(read('auth-guard.js'), /p\.length < 8/);
});

test('connexion : le téléphone propose un mot de passe fort à l\'inscription et remplit l\'ancien à la connexion', () => {
  const i = script.indexOf('function updateAuthModalMode()');
  const body = script.slice(i, i + 2200);
  assert.match(body, /'autocomplete', isReg \? 'new-password' : 'current-password'/);
  assert.match(body, /auth-tab-/);
  assert.match(script, /function setAuthMode\(mode\)/);
});

test('connexion : une faute d\'email évidente (gmial.com…) est corrigée avant de créer le compte, un email juste passe tel quel', () => {
  const g = read('auth-guard.js');
  const typo = /var TYPO = (\{[\s\S]*?\n  \});/.exec(g);
  const fn = /function emailFix\(email\) \{[\s\S]*?\n  \}/.exec(g);
  assert.ok(typo && fn);
  const emailFix = Function('var TYPO = ' + typo[1] + ';' + fn[0] + '; return emailFix;')();
  assert.strictEqual(emailFix('jean@gmial.com'), 'jean@gmail.com');
  assert.strictEqual(emailFix('  Jean.K@Gmail.con '), 'Jean.K@gmail.com');
  assert.strictEqual(emailFix('a@hotmial.com'), 'a@hotmail.com');
  assert.strictEqual(emailFix('jean@gmail.com'), null);
  assert.strictEqual(emailFix('jean@entreprise.cd'), null);
  assert.strictEqual(emailFix('pas-un-email'), null);
  assert.strictEqual(emailFix(''), null);
  assert.match(g, /if \(fixed\) \{ emEl\.value = fixed;/);
});

test('connexion : textes traduits dans les 5 langues (nom facultatif, connexion en cours)', () => {
  const tr = read('translations.js');
  assert.strictEqual((tr.match(/^\s+auth_loading:/gm) || []).length, 5);
  assert.strictEqual((tr.match(/^\s+auth_name_label:/gm) || []).length, 5);
  assert.match(tr, /auth_name_label: "Ton prénom ou pseudo \(facultatif\)"/);
});
