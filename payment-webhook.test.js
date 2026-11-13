// Réception des paiements (webhooks) : jamais de faux crédit, jamais de double crédit, jamais un vrai paiement refusé à tort.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');

// ---- faux Firestore en mémoire ----
const store = { topup_requests: [], users: {}, wallet_transactions: [], notifications: [], payment_claims: {} };
const fakeDb = {
  collection(name) {
    return {
      doc(id) { return { _name: name, _id: id }; },
      where(field, op, value) {
        return { limit() { return { get: async () => {
          const docs = store.topup_requests.filter((d) => d[field] === value)
            .map((d) => ({ id: d.id, data: () => d, ref: { id: d.id, _name: 'topup_requests', update: async (u) => Object.assign(d, u) } }));
          return { empty: docs.length === 0, docs };
        } }; } };
      }
    };
  },
  async runTransaction(fn) {
    const tx = {
      get: async (ref) => {
        if (ref._name === 'payment_claims') return { exists: !!store.payment_claims[ref._id], data: () => store.payment_claims[ref._id] };
        if (ref._name === 'users') return { exists: !!store.users[ref._id], data: () => store.users[ref._id] };
        const d = store.topup_requests.find((x) => x.id === ref.id);
        return { exists: !!d, data: () => d };
      },
      update: (ref, u) => { if (ref._name === 'users') Object.assign(store.users[ref._id], u); else Object.assign(store.topup_requests.find((x) => x.id === ref.id), u); },
      set: (ref, d) => { if (ref._name === 'payment_claims') store.payment_claims[ref._id] = d; else (ref._name === 'notifications' ? store.notifications : store.wallet_transactions).push(d); }
    };
    return fn(tx);
  }
};
const orig = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin') return { apps: [1], firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => n } }), initializeApp() {}, credential: { cert() {} } };
  if (/_lib[\\/]push(\.js)?$/.test(req) || req === './_lib/push') return { sendPushToUser: async () => {} };
  return orig.apply(this, arguments);
};
process.env.CRYPTOMUS_PAYMENT_KEY = 'crypto-key';
process.env.MBOTEPAY_WEBHOOK_SECRET = 'mbote-secret';
const webhook = require(path.join(__dirname, '..', 'api', 'payment-webhook.js'));

function reset() {
  store.topup_requests.length = 0; store.wallet_transactions.length = 0; store.notifications.length = 0; store.payment_claims = {};
  store.users = { u1: { balance: 10, email: 'a@b.c' } };
}
async function call(provider, rawBody, headers) {
  const out = {};
  const res = { status(c) { out.code = c; return this; }, json(j) { out.body = j; return this; }, end() { return this; } };
  const r = Readable.from([Buffer.from(rawBody)]);
  r.method = 'POST'; r.query = { provider }; r.headers = headers || {};
  await webhook(r, res);
  return out;
}

/* ---------- Cryptomus ---------- */
function cryptoPayload(extra) {
  const body = Object.assign({ type: 'payment', order_id: 'topup_u1_1700000000', status: 'paid', url_callback: 'https://coeurnohuniverse.com/api/payment-webhook?provider=cryptomus', amount: '5.00' }, extra);
  return body;
}
function signPhp(body) { // comme le PHP de Cryptomus : « / » écrits « \/ »
  const json = JSON.stringify(body).replace(/\//g, '\\/');
  return crypto.createHash('md5').update(Buffer.from(json).toString('base64') + 'crypto-key').digest('hex');
}
function signNode(body) {
  return crypto.createHash('md5').update(Buffer.from(JSON.stringify(body)).toString('base64') + 'crypto-key').digest('hex');
}
function addCryptoRequest(extra) {
  store.topup_requests.push(Object.assign({ id: 'r1', uid: 'u1', method: 'crypto', amountUSD: 5, status: 'pending_payment', cryptomusOrderId: 'topup_u1_1700000000' }, extra));
}

test('Cryptomus : une vraie notification (adresse avec « / » signée à la façon PHP) est acceptée et crédite une fois', async () => {
  reset(); addCryptoRequest();
  const body = cryptoPayload();
  const raw = JSON.stringify(Object.assign({}, body, { sign: signPhp(body) }));
  const r = await call('cryptomus', raw);
  assert.strictEqual(r.code, 200); assert.strictEqual(r.body.credited, true);
  assert.strictEqual(store.users.u1.balance, 15);
  assert.strictEqual(store.topup_requests[0].status, 'completed');
  // même notification renvoyée : aucun second crédit
  const again = await call('cryptomus', raw);
  assert.strictEqual(again.body.alreadyProcessed, true);
  assert.strictEqual(store.users.u1.balance, 15);
  assert.strictEqual(store.wallet_transactions.length, 1);
});

test('Cryptomus : l\'autre écriture de la signature reste acceptée', async () => {
  reset(); addCryptoRequest();
  const body = cryptoPayload();
  const r = await call('cryptomus', JSON.stringify(Object.assign({}, body, { sign: signNode(body) })));
  assert.strictEqual(r.body.credited, true);
});

test('Cryptomus : signature fausse → refus et aucun crédit', async () => {
  reset(); addCryptoRequest();
  const r = await call('cryptomus', JSON.stringify(Object.assign({}, cryptoPayload(), { sign: 'a'.repeat(32) })));
  assert.strictEqual(r.code, 403);
  assert.strictEqual(store.users.u1.balance, 10);
});

test('Cryptomus : le montant crédité est celui de NOTRE demande, jamais celui de la notification', async () => {
  reset(); addCryptoRequest();
  const body = cryptoPayload({ amount: '999.00', payment_amount_usd: '999.00' });
  const r = await call('cryptomus', JSON.stringify(Object.assign({}, body, { sign: signPhp(body) })));
  assert.strictEqual(r.body.credited, true);
  assert.strictEqual(store.users.u1.balance, 15);
});

test('Cryptomus : une demande qui appartient à une autre personne que la commande signée n\'est jamais créditée', async () => {
  reset(); addCryptoRequest({ uid: 'autre' }); store.users.autre = { balance: 0 };
  const body = cryptoPayload();
  const r = await call('cryptomus', JSON.stringify(Object.assign({}, body, { sign: signPhp(body) })));
  assert.strictEqual(r.code, 400);
  assert.strictEqual(store.users.autre.balance, 0); assert.strictEqual(store.users.u1.balance, 10);
});

test('Cryptomus : échec / annulation → la demande passe « échouée » sans crédit ; montant insuffisant → revue par l\'admin', async () => {
  reset(); addCryptoRequest();
  let body = cryptoPayload({ status: 'cancel' });
  let r = await call('cryptomus', JSON.stringify(Object.assign({}, body, { sign: signPhp(body) })));
  assert.strictEqual(r.body.credited, false); assert.strictEqual(store.topup_requests[0].status, 'failed'); assert.strictEqual(store.users.u1.balance, 10);
  reset(); addCryptoRequest();
  body = cryptoPayload({ status: 'wrong_amount' });
  r = await call('cryptomus', JSON.stringify(Object.assign({}, body, { sign: signPhp(body) })));
  assert.strictEqual(store.topup_requests[0].status, 'pending_admin_review'); assert.strictEqual(store.users.u1.balance, 10);
});

test('Cryptomus : une demande déjà créditée n\'est jamais repassée en échec par une notification tardive', async () => {
  reset(); addCryptoRequest({ status: 'completed' });
  const body = cryptoPayload({ status: 'fail' });
  await call('cryptomus', JSON.stringify(Object.assign({}, body, { sign: signPhp(body) })));
  assert.strictEqual(store.topup_requests[0].status, 'completed');
});

/* ---------- MbotePay ---------- */
function mbote(status) {
  const raw = JSON.stringify({ reference: 'mb123', status });
  const t = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', 'mbote-secret').update(t + '.' + raw).digest('hex');
  return { raw, headers: { 'x-mbotepay-signature': `t=${t},v1=${sig}` } };
}
function addMbote(extra) {
  store.topup_requests.push(Object.assign({ id: 'm1', uid: 'u1', method: 'mobile', amountUSD: 4, status: 'pending_payment', mbotepayReference: 'mb123' }, extra));
}

test('MbotePay : « completed » signé → crédit unique', async () => {
  reset(); addMbote();
  const m = mbote('completed');
  const r = await call('mbotepay', m.raw, m.headers);
  assert.strictEqual(r.body.credited, true); assert.strictEqual(store.users.u1.balance, 14);
  const again = await call('mbotepay', m.raw, m.headers);
  assert.strictEqual(again.body.alreadyProcessed, true); assert.strictEqual(store.users.u1.balance, 14);
});

test('MbotePay : un statut intermédiaire ne marque PAS la demande « échouée », et le « completed » suivant crédite bien', async () => {
  reset(); addMbote();
  const p = mbote('processing');
  const r1 = await call('mbotepay', p.raw, p.headers);
  assert.strictEqual(r1.code, 200); assert.strictEqual(store.topup_requests[0].status, 'pending_payment');
  const c = mbote('completed');
  const r2 = await call('mbotepay', c.raw, c.headers);
  assert.strictEqual(r2.body.credited, true); assert.strictEqual(store.users.u1.balance, 14);
});

test('MbotePay : un vrai échec marque « échouée » ; un paiement déjà crédité n\'est jamais écrasé', async () => {
  reset(); addMbote();
  const f = mbote('failed');
  await call('mbotepay', f.raw, f.headers);
  assert.strictEqual(store.topup_requests[0].status, 'failed'); assert.strictEqual(store.users.u1.balance, 10);
  reset(); addMbote({ status: 'completed' });
  await call('mbotepay', f.raw, f.headers);
  assert.strictEqual(store.topup_requests[0].status, 'completed');
});

test('MbotePay : le « completed » signé reste crédité même si un échec avait été noté avant (le dernier mot est celui du fournisseur)', async () => {
  reset(); addMbote({ status: 'failed' });
  const c = mbote('completed');
  const r = await call('mbotepay', c.raw, c.headers);
  assert.strictEqual(r.body.credited, true); assert.strictEqual(store.users.u1.balance, 14);
});

test('MbotePay : signature absente, fausse ou trop ancienne → refus, aucun crédit', async () => {
  reset(); addMbote();
  const c = mbote('completed');
  assert.strictEqual((await call('mbotepay', c.raw, {})).code, 403);
  assert.strictEqual((await call('mbotepay', c.raw, { 'x-mbotepay-signature': 't=' + Math.floor(Date.now() / 1000) + ',v1=' + 'b'.repeat(64) })).code, 403);
  const old = String(Math.floor(Date.now() / 1000) - 4000);
  const sig = crypto.createHmac('sha256', 'mbote-secret').update(old + '.' + c.raw).digest('hex');
  assert.strictEqual((await call('mbotepay', c.raw, { 'x-mbotepay-signature': `t=${old},v1=${sig}` })).code, 403);
  assert.strictEqual(store.users.u1.balance, 10);
});

/* ---------- Sceau des demandes + « un paiement = une recharge » (valable pour tous les moyens) ---------- */
const seal = require(path.join(__dirname, '..', 'api', '_lib', 'topup-seal.js'));
const credit = webhook.creditBalanceOnce;
const KEY = 'test-seal-key';
function withKey(fn) { return async () => { process.env.TOPUP_SEAL_KEY = KEY; try { await fn(); } finally { delete process.env.TOPUP_SEAL_KEY; } }; }
function sealedReq(extra) {
  return seal.stamp(Object.assign({ id: 'r1', uid: 'u1', method: 'saspay', amountUSD: 5, status: 'pending_payment', createdAt: new Date().toISOString() }, extra));
}
const args = (r, extra) => Object.assign({ uid: 'u1', amount: 5, type: 'topup_mobile_money', description: 't', relatedId: 'x', requestRef: { id: r.id, _name: 'topup_requests' } }, extra);

test('Sceau : une demande créée par le serveur est créditée une seule fois', withKey(async () => {
  reset(); const r = sealedReq(); store.topup_requests.push(r);
  const a = await credit(args(r, { claim: { provider: 'saspay', id: 'tx1' } }));
  assert.strictEqual(a.alreadyCredited, false); assert.ok(!a.blocked);
  assert.strictEqual(store.users.u1.balance, 15);
  const b = await credit(args(r, { claim: { provider: 'saspay', id: 'tx1' } }));
  assert.strictEqual(b.alreadyCredited, true);
  assert.strictEqual(store.users.u1.balance, 15);
  assert.strictEqual(store.wallet_transactions.length, 1);
}));

test('Sceau : une demande fabriquée depuis un navigateur (sans sceau) n\'est jamais créditée automatiquement', withKey(async () => {
  reset(); const r = { id: 'f1', uid: 'u1', method: 'saspay', amountUSD: 1000, status: 'pending_payment', createdAt: '2026-11-20T10:00:00.000Z' }; store.topup_requests.push(r);
  const out = await credit(args(r, { amount: 1000, claim: { provider: 'saspay', id: 'tx9' } }));
  assert.ok(out.blocked);
  assert.strictEqual(store.users.u1.balance, 10);
  assert.strictEqual(r.status, 'pending_admin_review');
  assert.match(r.securityNote, /sceau|serveur/);
  assert.strictEqual(Object.keys(store.payment_claims).length, 0, 'le paiement n\'est pas « consommé » par une demande refusée');
}));

test('Sceau : montant, personne ou moyen modifiés après coup → aucun crédit', withKey(async () => {
  for (const tamper of [{ amountUSD: 500 }, { uid: 'u2' }, { method: 'crypto' }, { createdAt: '2026-01-01T00:00:00.000Z' }]) {
    reset(); store.users.u2 = { balance: 0 };
    const r = Object.assign(sealedReq(), tamper); store.topup_requests.push(r);
    const out = await credit(args(r, { amount: r.amountUSD, uid: r.uid }));
    assert.ok(out.blocked, JSON.stringify(tamper));
    assert.strictEqual(store.users.u1.balance, 10); assert.strictEqual(store.users.u2.balance, 0);
  }
}));

test('Sceau : le montant demandé au crédit doit être celui de la demande', withKey(async () => {
  reset(); const r = sealedReq(); store.topup_requests.push(r);
  const out = await credit(args(r, { amount: 50 }));
  assert.match(out.blocked, /montant/);
  assert.strictEqual(store.users.u1.balance, 10);
}));

test('Un même paiement ne peut servir qu\'à UNE recharge (même avec deux demandes valables)', withKey(async () => {
  reset(); const a = sealedReq({ id: 'ra' }), b = sealedReq({ id: 'rb' }); store.topup_requests.push(a, b);
  const first = await credit(args(a, { claim: { provider: 'saspay', id: 'txSAME' } }));
  assert.ok(!first.blocked); assert.strictEqual(store.users.u1.balance, 15);
  const second = await credit(args(b, { claim: { provider: 'saspay', id: 'txSAME' } }));
  assert.match(second.blocked, /deja servi/);
  assert.strictEqual(store.users.u1.balance, 15);
  assert.strictEqual(b.status, 'pending_admin_review');
  // un autre fournisseur ayant le même identifiant n'est pas confondu
  const c = sealedReq({ id: 'rc' }); store.topup_requests.push(c);
  const third = await credit(args(c, { claim: { provider: 'cryptomus', id: 'txSAME' } }));
  assert.ok(!third.blocked); assert.strictEqual(store.users.u1.balance, 20);
}));

test('Décision de l\'administrateur (force) : crédite même sans sceau, une seule fois', withKey(async () => {
  reset(); const r = { id: 'm1', uid: 'u1', method: 'saspay', amountUSD: 3, status: 'pending_admin_review', createdAt: '2026-11-20T10:00:00.000Z' }; store.topup_requests.push(r);
  const out = await credit(args(r, { amount: 3, force: true }));
  assert.ok(!out.blocked); assert.strictEqual(store.users.u1.balance, 13);
  assert.strictEqual((await credit(args(r, { amount: 3, force: true }))).alreadyCredited, true);
  assert.strictEqual(store.users.u1.balance, 13);
}));

test('Sceau : anciennes demandes (avant la mise à jour) acceptées seulement pendant la transition', () => {
  const old = { uid: 'u1', amountUSD: 5, method: 'saspay', createdAt: '2026-11-05T10:00:00.000Z' };
  const env = { TOPUP_SEAL_KEY: KEY };
  assert.strictEqual(seal.check(old, Date.parse('2026-11-14T00:00:00Z'), env).ok, true);
  assert.strictEqual(seal.check(old, Date.parse('2026-12-05T00:00:00Z'), env).ok, false, 'après la transition : sceau obligatoire');
  const recentNoSeal = { uid: 'u1', amountUSD: 5, method: 'saspay', createdAt: '2026-11-20T10:00:00.000Z' };
  assert.strictEqual(seal.check(recentNoSeal, Date.parse('2026-11-21T00:00:00Z'), env).ok, false, 'une demande récente sans sceau est refusée');
  const stamped = seal.stamp(Object.assign({}, recentNoSeal), env);
  assert.strictEqual(seal.check(stamped, Date.parse('2026-12-21T00:00:00Z'), env).ok, true);
  assert.strictEqual(seal.check(stamped, Date.now(), { TOPUP_SEAL_KEY: 'autre-cle' }).ok, false, 'sceau fabriqué avec une autre clé');
});

test('Les 4 créations de demandes côté serveur posent le sceau', () => {
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'api', 'payment-initiate.js'), 'utf8');
  assert.strictEqual((src.match(/collection\('topup_requests'\)\.add\(topupSeal\.stamp\(/g) || []).length, 4);
  assert.doesNotMatch(src, /collection\('topup_requests'\)\.add\(\{/);
});

test('Une demande validée ou fermée par l\'administrateur (« approved ») n\'est jamais créditée une seconde fois par un fournisseur', withKey(async () => {
  reset(); const r = sealedReq({ status: 'approved' }); store.topup_requests.push(r);
  const out = await credit(args(r, { claim: { provider: 'saspay', id: 'late' } }));
  assert.strictEqual(out.alreadyCredited, true);
  assert.strictEqual(store.users.u1.balance, 10);
  assert.strictEqual(store.wallet_transactions.length, 0);
}));
