// Recharge fluide (écran d'étapes, message « entrez votre code secret »), retour d'adresse sûr, application qui ne « sort » plus.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const script = read('script.js');
const pro = read('payments-pro.js');
const server = read('api/payment-initiate.js');
const html = read('index.html');

function loadReturnBase() {
  const a = server.indexOf('const RETURN_ORIGINS');
  const b = server.indexOf('function parseAmountUSD');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(server.slice(a, b) + '\nthis.returnBase = returnBase;', ctx);
  return ctx.returnBase;
}

test('retour de paiement : revient sur l\'adresse officielle où la personne utilise déjà l\'application', () => {
  const rb = loadReturnBase();
  assert.strictEqual(rb({ returnOrigin: 'https://coeurnohuniverse.com' }), 'https://coeurnohuniverse.com/?payment=');
  assert.strictEqual(rb({ returnOrigin: 'https://www.coeurnohuniverse.com/' }), 'https://www.coeurnohuniverse.com/?payment=');
  assert.strictEqual(rb({ returnOrigin: 'https://coeurnohboost.vercel.app' }), 'https://coeurnohboost.vercel.app/?payment=');
});

test('retour de paiement : une adresse inconnue ou piégée est ignorée', () => {
  const rb = loadReturnBase();
  ['https://evil.example', 'https://coeurnohuniverse.com.evil.example', 'javascript:alert(1)', 'http://coeurnohuniverse.com', '//evil.example', 42, null, undefined]
    .forEach((o) => assert.strictEqual(rb({ returnOrigin: o }), 'https://coeurnohboost.vercel.app/?payment=', String(o)));
  assert.strictEqual(rb({}), 'https://coeurnohboost.vercel.app/?payment=');
  assert.strictEqual(rb({ returnSlug: 'ma-boutique', returnOrigin: 'https://evil.example' }), 'https://coeurnohuniverse.com/panel/ma-boutique?payment=');
});

test('recharge : le client envoie son adresse de retour, sans jamais envoyer de montant fiable (le serveur décide)', () => {
  assert.match(script, /returnOrigin: window\.location\.origin/);
  assert.match(server, /body\.returnOrigin/);
});

test('recharge : AUCUN écran intermédiaire — la personne part directement vers la page SasPay de choix du réseau', () => {
  assert.match(script, /window\.cnPayFlow\.start\(payMethod, amount\)/, 'mémorise seulement le moyen choisi (écran de retour)');
  assert.match(script, /window\.cnPayFlow\.go\(data\.paymentUrl\)/);
  assert.match(script, /window\.cnPayFlow\.stop\(\)/);
  assert.match(pro, /window\.cnPayFlow = \{/);
  const flow = pro.slice(pro.indexOf('window.cnPayFlow = {'), pro.indexOf('RETOUR DE PAIEMENT'));
  assert.match(flow, /go: function \(url\) \{ try \{ window\.location\.href = url; \}/, 'redirection immédiate');
  assert.doesNotMatch(flow, /setTimeout|createElement|2200|pf-go|appendChild/, 'ni attente artificielle ni écran d\'attente');
  assert.doesNotMatch(pro, /go_title|go_sub|go_open|go_now|go_stuck|pf-stuck/, 'plus aucun texte de l\'ancien écran');
  // Si la fonction d'aide est absente, la redirection classique reste en place.
  assert.match(script, /else window\.location\.href = data\.paymentUrl;/);
});

test('recharge : plus de bandeau « une recharge est déjà en cours » ni de blocage d\'attente', () => {
  assert.doesNotMatch(pro, /pp-pending|déjà en cours/);
  assert.doesNotMatch(script, /Patiente environ/);
  assert.match(server, /const PAY_INIT_LIMIT = 60;/);
  assert.match(server, /const MAX_UNPAID_24H = 40;/);
  assert.doesNotMatch(server, /limit: 8, windowSec: 900/);
});

test('recharge : le message « entrez votre code secret » existe dans les 5 langues, avec les mêmes clés partout', () => {
  const a = pro.indexOf('var P = {');
  const b = pro.indexOf('function lg()');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(pro.slice(a, b).replace('var P =', 'this.P =').replace(/;\s*$/, ''), ctx);
  const P = ctx.P;
  assert.deepStrictEqual(Object.keys(P).sort(), ['en', 'es', 'fr', 'it', 'pt']);
  const keys = Object.keys(P.fr).sort();
  assert.ok(keys.length >= 28);
  for (const l of ['en', 'es', 'it', 'pt']) {
    assert.deepStrictEqual(Object.keys(P[l]).sort(), keys, 'clés de ' + l);
    for (const k of keys) assert.ok(String(P[l][k]).trim().length > 1, l + '.' + k + ' vide');
  }
  ['w_body', 'how_3'].forEach((k) => {
    assert.match(P.fr[k], /code secret/i);
    for (const l of Object.keys(P)) assert.match(P[l][k], /M.Pesa/, l + '.' + k + ' cite M-Pesa');
  });
  for (const l of Object.keys(P)) assert.match(P[l].w_body, /PIN/, l + '.w_body parle du code PIN');
  assert.match(P.fr.w_body, /Airtel Money, Orange Money ou MTN MoMo/);
});

test('retour de paiement : l\'écran s\'affiche tout de suite, suit le solde en direct, et gère attente / échec / réussite', () => {
  assert.match(pro, /setTimeout\(function \(\) \{ showReturn\(ret\); \}, 0\)/);
  assert.match(pro, /onSnapshot\(function \(s\)/);
  assert.match(pro, /provider=saspay-sync/);
  ['wait', 'ok', 'late', 'bad'].forEach((st) => assert.ok(pro.includes("'" + st + "'"), 'état ' + st));
  assert.match(pro, /data-r="retry"/);
  // Ni dégradé ni émoticône dans les nouveaux écrans.
  const css = pro.slice(pro.indexOf('var PF_CSS'), pro.indexOf('var I_LOCK'));
  assert.doesNotMatch(css, /gradient/);
  assert.doesNotMatch(pro, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test('application : un « billet de retour » ramène la personne au bon écran si le téléphone ferme la page pendant le choix d\'une photo', () => {
  assert.match(html, /localStorage\.getItem\('cn_ticket'\)/);
  assert.match(script, /const CN_TICKET_KEY = 'cn_ticket'/);
  assert.match(script, /function cnPickerTicket\(/);
  assert.match(script, /HTMLInputElement\.prototype\.click/);
  assert.match(script, /o\.section = secEl/);
  assert.match(script, /goToAccountSection\(r\.section\)/);
  assert.match(script, /CN_PICKER_TEXT/);
  ['fr', 'en', 'es', 'it', 'pt'].forEach((l) => assert.match(script.slice(script.indexOf('const CN_PICKER_TEXT')), new RegExp('\\n  ' + l + ': ')));
});

test('application : le bouton retour du téléphone remonte d\'un écran dans le menu au lieu de tout fermer', () => {
  assert.match(script, /'main-menu-modal': \(\) => cnMenuBack\(\)/);
  assert.match(script, /function cnMenuBack\(\)/);
});
