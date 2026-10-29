// tests/pay-speed.test.js — Recharge rapide : création du paiement SasPay sans attente inutile, refus propres
// (ex. Zimbabwe), aucune limite gênante pour une vraie personne, un seul accès au profil par demande.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');

const counts = { userReads: 0, settingsReads: 0, added: [] };
const fakeDb = {
  collection(name) {
    return {
      doc() {
        return { get: async () => {
          if (name === 'users') { counts.userReads++; return { exists: true, data: () => ({ email: 'a@b.c', name: 'Awa', lang: 'fr' }) }; }
          if (name === 'settings') { counts.settingsReads++; return { exists: false, data: () => ({}) }; }
          return { exists: false, data: () => ({}) };
        } };
      },
      add: async (d) => { counts.added.push({ name, d }); return { id: 'r1' }; },
      where() { const q = { where: () => q, limit: () => ({ get: async () => ({ forEach() {} }) }) }; return q; }
    };
  }
};
const orig = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin') return { apps: [1], firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => n } }), initializeApp() {}, credential: { cert() {} } };
  return orig.apply(this, arguments);
};
process.env.SASPAY_API_KEY = 'sk_live_TESTKEY12345';
process.env.VERCEL_ENV = 'development';
const sec = require(path.join(__dirname, '..', 'api', '_lib', 'security.js'));
let uidSeq = 0;
const rateCalls = [];
sec.verifyCaller = async () => ({ uid: 'speed-user-' + (++uidSeq) });
sec.enforceRateLimit = async (o) => { rateCalls.push(o); };
const sp = require(path.join(__dirname, '..', 'api', '_lib', 'saspay.js'));
const handler = require(path.join(__dirname, '..', 'api', 'payment-initiate.js'));

let checkoutAnswers = [];
let checkoutCalls = 0;
function makeFetch() {
  return async (url, opt) => {
    url = String(url);
    if (/\/countries\/$/.test(url)) return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: [{ iso2: 'BF', currency_code: 'XOF', is_active: true }, { iso2: 'ZW', currency_code: 'USD', is_active: true }, { iso2: 'KE', currency_code: 'KES', is_active: true }] }) };
    if (/open\.er-api\.com/.test(url)) return { ok: true, status: 200, json: async () => ({ result: 'success', rates: { XOF: 600, KES: 129, USD: 1 } }) };
    if (/\/checkout-sessions\/$/.test(url) && opt && opt.method === 'POST') {
      checkoutCalls++;
      const a = checkoutAnswers.shift() || { status: 200, body: { success: true, data: { id: 'cs_1', checkout_url: 'https://checkout.saspay.me/pay/cs_1' } } };
      if (a.throw) throw a.throw;
      return { ok: a.status < 400, status: a.status, text: async () => JSON.stringify(a.body) };
    }
    throw new Error('appel inattendu : ' + url);
  };
}

async function init(body) {
  global.fetch = makeFetch();
  const out = {};
  const res = { setHeader() {}, status(c) { out.code = c; return this; }, json(j) { out.body = j; } };
  await handler({ method: 'POST', body: Object.assign({ provider: 'optgateway', onlyMethod: 'mobile_money', amountUSD: 5, countryCode: 'BF', idToken: 't' }, body), headers: {} }, res);
  return out;
}

test('SasPay : une recharge réussie renvoie directement l\'adresse SasPay, enregistre la demande, et lit le profil UNE seule fois', async () => {
  counts.userReads = 0; counts.added.length = 0; checkoutCalls = 0;
  const r = await init({});
  assert.strictEqual(r.code, 200);
  assert.strictEqual(r.body.paymentUrl, 'https://checkout.saspay.me/pay/cs_1');
  assert.strictEqual(counts.userReads, 1, 'e-mail, nom et langue viennent d\'une seule lecture');
  assert.strictEqual(counts.added.length, 1);
  assert.strictEqual(counts.added[0].d.method, 'saspay');
  assert.strictEqual(counts.added[0].d.amountUSD, 5);
  assert.strictEqual(counts.added[0].d.saspayCurrency, 'XOF');
  assert.strictEqual(checkoutCalls, 1);
});

test('limite : 60 démarrages par 15 minutes (anti-script), plus « 8 » qui bloquait de vraies personnes', async () => {
  rateCalls.length = 0;
  await init({});
  assert.strictEqual(rateCalls.length, 1);
  assert.strictEqual(rateCalls[0].limit, 60);
  assert.strictEqual(rateCalls[0].windowSec, 900);
  assert.strictEqual(rateCalls[0].scope, 'pay-init');
});

test('SasPay : un pays refusé à la création (ex. Zimbabwe) donne un message propre avec Carte / Crypto, jamais le texte brut', async () => {
  counts.added.length = 0;
  checkoutAnswers = [{ status: 400, body: { success: false, error: { code: 'PAYMENT_METHOD_UNAVAILABLE', message: 'No payment method configured for country ZW' } } }];
  const r = await init({ countryCode: 'ZW' });
  assert.strictEqual(r.code, 200);
  assert.strictEqual(r.body.success, false);
  assert.strictEqual(r.body.code, 'mobile_refused');
  assert.match(r.body.error, /carte ou la crypto/i);
  assert.doesNotMatch(r.body.error, /PAYMENT_METHOD|configured|ZW/);
  assert.ok(r.body.error.length <= 160, 'assez court pour que l\'application l\'affiche');
  assert.strictEqual(counts.added.length, 0, 'aucune demande enregistrée pour un paiement refusé');
});

test('SasPay : un refus qui parle du montant garde le texte utile (minimum / maximum)', async () => {
  checkoutAnswers = [{ status: 400, body: { success: false, error: 'Minimum amount is 1000 XOF' } }];
  const r = await init({});
  assert.strictEqual(r.body.code, 'mobile_amount');
  assert.strictEqual(r.body.error, 'Minimum amount is 1000 XOF');
});

test('SasPay : panne passagère (5xx) → un 2e essai rapide, puis message « momentanément indisponible » avec issue Carte / Crypto', async () => {
  checkoutCalls = 0;
  checkoutAnswers = [{ status: 503, body: { error: 'down' } }, { status: 502, body: { error: 'down' } }];
  const r = await init({});
  assert.strictEqual(checkoutCalls, 2, 'un seul nouvel essai, pas plus');
  assert.strictEqual(r.body.code, 'mobile_unavailable');
  assert.match(r.body.error, /momentanément indisponible/);
});

test('SasPay : un 1er échec rapide est rattrapé par le 2e essai (le client ne voit rien)', async () => {
  checkoutCalls = 0;
  checkoutAnswers = [{ status: 503, body: {} }, { status: 200, body: { success: true, data: { id: 'cs_2', checkout_url: 'https://checkout.saspay.me/pay/cs_2' } } }];
  const r = await init({});
  assert.strictEqual(checkoutCalls, 2);
  assert.strictEqual(r.body.paymentUrl, 'https://checkout.saspay.me/pay/cs_2');
});

test('SasPay : un refus clair (4xx) n\'est JAMAIS rejoué, et une attente déjà longue (délai dépassé) non plus', async () => {
  checkoutCalls = 0;
  checkoutAnswers = [{ status: 422, body: { error: 'bad' } }];
  await init({});
  assert.strictEqual(checkoutCalls, 1);
  checkoutCalls = 0;
  checkoutAnswers = [{ throw: Object.assign(new Error('x'), { name: 'AbortError' }) }];
  const r = await init({});
  assert.strictEqual(checkoutCalls, 1);
  assert.strictEqual(r.code, 502);
});

test('SasPay : une adresse de paiement hors saspay.me est refusée', async () => {
  checkoutAnswers = [{ status: 200, body: { success: true, data: { id: 'cs_9', checkout_url: 'https://evil.example/pay' } } }];
  const r = await init({});
  assert.strictEqual(r.code, 502);
  assert.ok(!JSON.stringify(r.body).includes('evil.example'));
});

test('saspay : messages d\'erreur de SasPay lus sous toutes leurs formes (error, message, detail, listes de champs)', () => {
  assert.strictEqual(sp.errorMessage({ error: 'a' }), 'a');
  assert.strictEqual(sp.errorMessage({ error: { message: 'b' } }), 'b');
  assert.strictEqual(sp.errorMessage({ message: 'c' }), 'c');
  assert.strictEqual(sp.errorMessage({ detail: 'd' }), 'd');
  assert.strictEqual(sp.errorMessage({ errors: { amount: ['Trop bas'] } }), 'Trop bas');
  assert.strictEqual(sp.errorMessage({ error: { code: 'X', details: [{ field: ['Invalide'] }] } }), 'Invalide');
  assert.strictEqual(sp.errorMessage(null), '');
  assert.strictEqual(sp.errorMessage({}), '');
});

test('saspay : liste des pays et taux partagés (un seul appel même à plusieurs), copie périmée servie sans attendre', async () => {
  let c = 0, r = 0;
  global.fetch = async (url) => {
    if (/\/countries\/$/.test(String(url))) { c++; await new Promise((x) => setTimeout(x, 20)); return { ok: true, status: 200, text: async () => JSON.stringify({ data: [{ iso2: 'SN', currency_code: 'XOF', is_active: true }] }) }; }
    r++; await new Promise((x) => setTimeout(x, 20)); return { ok: true, status: 200, json: async () => ({ result: 'success', rates: { XOF: 610 } }) };
  };
  // Les caches du module ont déjà été remplis par les tests précédents : on repart de zéro dans un module neuf.
  delete require.cache[require.resolve(path.join(__dirname, '..', 'api', '_lib', 'saspay.js'))];
  const fresh = require(path.join(__dirname, '..', 'api', '_lib', 'saspay.js'));
  const [a, b, rate1, rate2] = await Promise.all([fresh.getCountries(), fresh.getCountries(), fresh.usdRate('XOF'), fresh.usdRate('XOF')]);
  assert.strictEqual(c, 1, 'un seul appel pour deux demandes simultanées');
  assert.strictEqual(r, 1);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(rate1, 610);
  assert.strictEqual(rate2, 610);
  assert.doesNotThrow(() => fresh.warm());
  // Taux inconnu (pas de taux en direct, pas de taux de secours) : « indisponible » plutôt qu'un faux montant.
  assert.strictEqual(await fresh.usdRate('XYZ'), null);
});

test('GET ?geo=1 : renvoie le pays et prépare les pays / taux en arrière-plan (aucun délai ajouté)', async () => {
  global.fetch = makeFetch();
  const out = {};
  const res = { setHeader() {}, status(c) { out.code = c; return this; }, json(j) { out.body = j; } };
  await handler({ method: 'GET', query: { geo: '1' }, headers: { 'x-vercel-ip-country': 'cm' } }, res);
  assert.strictEqual(out.code, 200);
  assert.deepStrictEqual(out.body, { country: 'CM' });
});
