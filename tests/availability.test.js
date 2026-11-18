// Services disponibles par pays : réglage admin (pricing/service_availability) appliqué par le SERVEUR avant tout mouvement d'argent.
// Règles : vide par défaut, jamais bloquant en cas de doute (pays inconnu, panne), l'administrateur n'est jamais bloqué.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const ADMIN = '8BqWONj07hVZePHe2DrkHWYRjse2';
const state = { doc: undefined, reads: 0, fail: false, txStarted: 0, writes: [] };
const fakeDb = {
  collection(name) {
    return {
      doc(id) {
        return {
          get: async () => {
            if (name === 'pricing' && id === 'service_availability') {
              state.reads++;
              if (state.fail) throw new Error('Firestore indisponible');
              return { exists: state.doc !== undefined, data: () => state.doc };
            }
            return { exists: false, data: () => undefined };
          },
          set: async (d) => { state.writes.push([name, id, d]); },
          update: async (d) => { state.writes.push([name, id, d]); }
        };
      },
      where() { return { limit() { return { get: async () => ({ empty: true, size: 0, forEach() {}, docs: [] }) }; }, get: async () => ({ empty: true, size: 0, forEach() {}, docs: [] }) }; }
    };
  },
  async runTransaction() { state.txStarted++; throw new Error('aucune transaction ne doit démarrer pour un service fermé'); }
};
const orig = Module._load;
Module._load = function (request) {
  if (request === 'firebase-admin') {
    return { apps: [1], initializeApp() {}, credential: { cert() {} }, auth() { return {}; }, firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => 'now' }, FieldPath: {} }) };
  }
  if (/(^|[\\/])push(\.js)?$/.test(request)) return { sendPushToUser: async () => {}, sendMulticast: async () => {} };
  const mod = orig.apply(this, arguments);
  if (/(^|[\\/])security(\.js)?$/.test(request)) {
    return Object.assign({}, mod, { initFirebaseAdmin() {}, verifyCaller: async (req) => ({ uid: req.body.__uid, email: 'x@y.z', isAdmin: req.body.__uid === ADMIN }), enforceRateLimit: async () => {} });
  }
  return mod;
};
const A = require('../api/_lib/availability.js');
const shop = require('../api/shop-purchase.js');
const smm = require('../api/place-smm-order.js');

const mkRes = () => { const r = { code: 200, body: null, headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, end() { return r; } }; return r; };
const reqFor = (country, body, key) => ({ method: 'POST', headers: country ? { [key || 'x-vercel-ip-country']: country } : {}, query: {}, body: body || {} });
const reset = () => { state.doc = undefined; state.reads = 0; state.fail = false; state.txStarted = 0; state.writes = []; A.resetForTests(); };
const MSG = "Ce service n'est pas disponible dans ton pays pour le moment.";

test('pays de la connexion : en-têtes Cloudflare puis Vercel ; inconnu ou invalide = null (jamais d\'adresse IP)', () => {
  assert.strictEqual(A.ipCountry(reqFor('cd')), 'CD');
  assert.strictEqual(A.ipCountry(reqFor('fr', {}, 'cf-ipcountry')), 'FR');
  assert.strictEqual(A.ipCountry({ headers: { 'cf-ipcountry': 'US', 'x-vercel-ip-country': 'FR' } }), 'US');
  for (const bad of ['XX', 'T1', '', 'USA', '1', ' ']) assert.strictEqual(A.ipCountry(reqFor(bad)), null, JSON.stringify(bad));
  assert.strictEqual(A.ipCountry({}), null);
  assert.strictEqual(A.ipCountry(null), null);
});

test('réglage : seuls les services connus et des codes valides survivent (majuscules, sans doublon, plafond)', () => {
  assert.deepStrictEqual(A.normalizeConfig(null), { blocked: { boost: [], shop: [] } });
  assert.deepStrictEqual(A.normalizeConfig('n\'importe quoi'), { blocked: { boost: [], shop: [] } });
  assert.deepStrictEqual(A.normalizeConfig({ blocked: { boost: ['us', ' fr ', 'US', 'abc', '', 5, null, 'C1'], shop: 'CD', inconnu: ['US'] } }), { blocked: { boost: ['US', 'FR'], shop: [] } });
  const many = []; for (let i = 0; i < 700; i++) many.push(String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i / 26 | 0) % 26)));
  assert.ok(A.normalizeConfig({ blocked: { boost: many } }).blocked.boost.length <= 250);
  assert.strictEqual(A.isBlocked({ blocked: { boost: ['US'] } }, 'boost', 'US'), true);
  assert.strictEqual(A.isBlocked({ blocked: { boost: ['US'] } }, 'boost', 'FR'), false);
  assert.strictEqual(A.isBlocked({ blocked: { boost: ['US'] } }, 'shop', 'US'), false);
  assert.strictEqual(A.isBlocked({ blocked: { boost: ['US'] } }, 'boost', null), false);
  assert.strictEqual(A.isBlocked(null, 'boost', 'US'), false);
});

test('vérification : pays fermé = refus clair ; autre pays, pays inconnu, service inconnu, administrateur = ouvert', async () => {
  reset(); state.doc = { blocked: { boost: ['US'], shop: ['FR', 'CA'] } };
  const chk = (country, service, uid) => A.checkAvailability(fakeDb, reqFor(country), service, { uid, adminUid: ADMIN });
  const r = await chk('US', 'boost', 'u1');
  assert.deepStrictEqual([r.ok, r.message, r.country], [false, MSG, 'US']);
  assert.strictEqual((await chk('CD', 'boost', 'u1')).ok, true, 'autre pays');
  assert.strictEqual((await chk('US', 'shop', 'u1')).ok, true, 'US fermé seulement pour le boost');
  assert.strictEqual((await chk('CA', 'shop', 'u1')).ok, false);
  A.resetForTests();
  const readsBefore = state.reads;
  assert.strictEqual((await chk(null, 'boost', 'u1')).ok, true, 'pays inconnu : jamais bloqué');
  assert.strictEqual(state.reads, readsBefore, 'pays inconnu : aucune lecture Firestore inutile');
  // erreur inattendue (requête illisible) : on laisse passer plutôt que de bloquer un achat
  const broken = {}; Object.defineProperty(broken, 'headers', { get() { throw new Error('requête illisible'); } });
  assert.strictEqual((await A.checkAvailability(fakeDb, broken, 'boost', {})).ok, true, 'erreur inattendue = ouvert');
  assert.strictEqual((await chk('US', 'academie', 'u1')).ok, true, 'service non géré');
  assert.strictEqual((await chk('US', 'boost', ADMIN)).ok, true, 'l\'administrateur n\'est jamais bloqué');
});

test('réglage lu une seule fois par minute ; panne Firestore = on garde le dernier réglage, sinon tout reste ouvert', async () => {
  reset(); state.doc = { blocked: { boost: ['US'] } };
  const chk = () => A.checkAvailability(fakeDb, reqFor('US'), 'boost', {});
  await chk(); await chk(); await chk();
  assert.strictEqual(state.reads, 1, 'une seule lecture pour plusieurs achats');
  // 61 secondes plus tard : relu ; la base est en panne → dernier réglage connu conservé
  const cfg1 = await A.loadConfig(fakeDb, Date.now());
  assert.deepStrictEqual(cfg1.blocked.boost, ['US']);
  state.fail = true;
  const later = await A.loadConfig(fakeDb, Date.now() + 61000);
  assert.deepStrictEqual(later.blocked.boost, ['US'], 'dernier réglage connu');
  // jamais lu + panne : rien n'est bloqué
  reset(); state.fail = true;
  assert.strictEqual((await A.checkAvailability(fakeDb, reqFor('US'), 'boost', {})).ok, true);
  // réglage supprimé / absent : ouvert
  reset(); state.doc = undefined;
  assert.strictEqual((await A.checkAvailability(fakeDb, reqFor('US'), 'boost', {})).ok, true);
  // base qui renvoie n'importe quoi : ouvert
  reset(); state.doc = { blocked: 'cassé' };
  assert.strictEqual((await A.checkAvailability(fakeDb, reqFor('US'), 'boost', {})).ok, true);
});

test('Boutique : pays fermé = refus AVANT toute transaction ni écriture ; pays ouvert = l\'achat continue son chemin normal', async () => {
  reset(); state.doc = { blocked: { shop: ['US'] } };
  let res = mkRes();
  await shop(reqFor('US', { __uid: 'buyer1', pubId: 'p1' }), res);
  assert.deepStrictEqual([res.code, res.body.success, res.body.error], [200, false, MSG]);
  assert.strictEqual(state.txStarted, 0, 'aucune transaction démarrée');
  assert.strictEqual(state.writes.length, 0, 'aucune écriture');
  // autre pays : la garde laisse passer (l'achat échoue ensuite pour une autre raison : le faux article n'existe pas)
  res = mkRes();
  await shop(reqFor('CD', { __uid: 'buyer1', pubId: 'p1' }), res);
  assert.notStrictEqual(res.body && res.body.error, MSG);
  assert.strictEqual(state.txStarted, 1, 'la transaction d\'achat a bien démarré');
});

test('Boost : pays fermé = 403 avec le message clair ; pays ouvert ou inconnu = pas de refus de ce type', async () => {
  reset(); state.doc = { blocked: { boost: ['US'] } };
  let res = mkRes();
  await smm(reqFor('US', { __uid: 'u1', idToken: 'x', price: 1, platform: 'instagram', service: 's', quality: 'q', link: 'https://example.com/a', quantity: 100 }), res);
  assert.strictEqual(res.code, 403);
  assert.strictEqual(res.body.error, MSG);
  assert.strictEqual(state.writes.length, 0);
  assert.strictEqual(state.txStarted, 0);
  for (const c of ['CD', null]) {
    res = mkRes();
    await smm(reqFor(c, { __uid: 'u1', idToken: 'x', price: 1, platform: 'instagram', service: 's', quality: 'q', link: 'https://example.com/a', quantity: 100 }), res);
    assert.notStrictEqual(res.body && res.body.error, MSG, 'pays ' + c);
    assert.notStrictEqual(res.code, 403, 'pays ' + c);
  }
  // l'administrateur peut tester même depuis un pays fermé
  res = mkRes();
  await smm(reqFor('US', { __uid: ADMIN, idToken: 'x', price: 1, platform: 'instagram', service: 's', quality: 'q', link: 'https://example.com/a', quantity: 100 }), res);
  assert.notStrictEqual(res.body && res.body.error, MSG);
});

test('l\'API revendeur (clé secrète) et les autres services ne sont pas touchés par ce réglage', () => {
  const smmSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'place-smm-order.js'), 'utf8');
  const iGuard = smmSrc.indexOf('availability.checkAvailability');
  assert.ok(iGuard > smmSrc.indexOf('verifyCaller(req)') && iGuard > smmSrc.indexOf('enforceRateLimit'), 'garde placée après l\'identité et la limite de requêtes');
  assert.ok(iGuard < smmSrc.indexOf('Parametres manquants'), 'garde placée avant toute validation métier et tout mouvement d\'argent');
  assert.ok(smmSrc.indexOf('handleReseller(req, res') < smmSrc.indexOf('verifyCaller(req)'), 'chemin revendeur traité avant et séparément');
  const shopSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'shop-purchase.js'), 'utf8');
  assert.ok(shopSrc.indexOf('availability.checkAvailability') < shopSrc.indexOf('runTransaction'));
  const fnFiles = fs.readdirSync(path.join(__dirname, '..', 'api')).filter((f) => f.endsWith('.js'));
  assert.ok(fnFiles.length <= 12, 'limite Vercel de 12 fonctions : ' + fnFiles.length);
  assert.ok(!fnFiles.includes('availability.js'), 'la bibliothèque est dans api/_lib/, pas une fonction');
});

test('page admin : carte « Services disponibles par pays » (codes à 2 lettres, enregistrement dans pricing/service_availability)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
  assert.match(html, /<script src="admin-availability\.js\?v=\d+"><\/script>/);
  const src = fs.readFileSync(path.join(__dirname, '..', 'admin-availability.js'), 'utf8');
  assert.match(src, /collection\('pricing'\)\.doc\('service_availability'\)\.set\(data\)/);
  assert.match(src, /admin-tab-pricing/);
  const sandbox = { module: { exports: {} } }; sandbox.module.exports = {}; vm.createContext(sandbox);
  vm.runInContext(src, sandbox); // sans « document » : n'exporte que la fonction de lecture des codes
  const P = JSON.parse(JSON.stringify({ SERVICES: sandbox.module.exports.SERVICES })); // copie hors du bac à sable (sinon les tableaux ne sont pas comparables)
  const parse = (t) => JSON.parse(JSON.stringify(sandbox.module.exports.parseCodes(t)));
  assert.deepStrictEqual(parse('us, fr;cd  FR\nca').codes, ['US', 'FR', 'CD', 'CA']);
  assert.deepStrictEqual(parse('US, France, 12, C').bad, ['France', '12', 'C']);
  assert.deepStrictEqual(parse('').codes, []);
  assert.deepStrictEqual(parse(null).codes, []);
  assert.deepStrictEqual(P.SERVICES.map((s) => s.id), A.SERVICES, 'mêmes services côté page et côté serveur');
  assert.doesNotMatch(src, /innerHTML\s*=\s*[^;]*\bvalue\b(?![^;]*esc\()/, 'valeur saisie jamais insérée sans protection');
});

test('dépôt incomplet : si availability.js manque, la Boutique et le Boost continuent de fonctionner (jamais de blocage)', async () => {
  reset(); state.doc = { blocked: { boost: ['US'], shop: ['US'] } };
  const saved = Module._load;
  const shopPath = require.resolve('../api/shop-purchase.js'), smmPath = require.resolve('../api/place-smm-order.js');
  const oldShop = require.cache[shopPath], oldSmm = require.cache[smmPath];
  Module._load = function (request) {
    if (/(^|[\\/])availability(\.js)?$/.test(request)) { const e = new Error("Cannot find module '" + request + "'"); e.code = 'MODULE_NOT_FOUND'; throw e; }
    return saved.apply(this, arguments);
  };
  try {
    delete require.cache[shopPath]; delete require.cache[smmPath];
    const shop2 = require('../api/shop-purchase.js'), smm2 = require('../api/place-smm-order.js'); // le chargement ne doit PAS planter
    let res = mkRes();
    await shop2(reqFor('US', { __uid: 'buyer1', pubId: 'p1' }), res);
    assert.notStrictEqual(res.body && res.body.error, MSG, 'Boutique : pas de blocage sans le fichier');
    res = mkRes();
    await smm2(reqFor('US', { __uid: 'u1', idToken: 'x', price: 1, platform: 'instagram', service: 's', quality: 'q', link: 'https://example.com/a', quantity: 100 }), res);
    assert.notStrictEqual(res.code, 403, 'Boost : pas de blocage sans le fichier');
  } finally {
    Module._load = saved;
    if (oldShop) require.cache[shopPath] = oldShop; else delete require.cache[shopPath];
    if (oldSmm) require.cache[smmPath] = oldSmm; else delete require.cache[smmPath];
  }
});
