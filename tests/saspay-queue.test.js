// SasPay : la notification de paiement (webhook) doit retrouver la bonne recharge MÊME s'il y a beaucoup de recharges
// « en attente » (sessions abandonnées). Avant : seules 100 demandes, prises sans ordre, étaient lues ; au-delà,
// un client qui avait vraiment payé pouvait ne jamais être crédité par la notification.
// Ici : faux Firestore (lecture par pages, comme le vrai) + faux SasPay. Aucun appel réel.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');

const store = { topup_requests: {}, users: {}, wallet_transactions: [], notifications: [], payment_claims: {} };
const flags = { pagingBroken: false, reads: 0 };

function reqRef(id) { return { _name: 'topup_requests', _id: id, id, update: async (u) => Object.assign(store.topup_requests[id], u) }; }
function snapOf(id) { return { id, exists: true, data: () => store.topup_requests[id], ref: reqRef(id) }; }
function query(filters, cursor, lim) {
  const q = {
    where(f, op, v) { return query(filters.concat([[f, v]]), cursor, lim); },
    orderBy() { if (flags.pagingBroken) throw new Error('index manquant'); return query(filters, cursor, lim); },
    startAfter(snap) { return query(filters, snap.id, lim); },
    limit(n) { return query(filters, cursor, n); },
    async get() {
      flags.reads++;
      let ids = Object.keys(store.topup_requests).sort().filter((id) => filters.every(([f, v]) => store.topup_requests[id][f] === v));
      if (cursor) ids = ids.filter((id) => id > cursor);
      if (lim) ids = ids.slice(0, lim);
      const docs = ids.map(snapOf);
      return { empty: docs.length === 0, docs };
    }
  };
  return q;
}
const fakeDb = {
  collection(name) {
    if (name === 'topup_requests') return Object.assign(query([], null, null), { doc: (id) => reqRef(id) });
    return { doc(id) { return { _name: name, _id: id, id }; } };
  },
  async runTransaction(fn) {
    const tx = {
      get: async (ref) => {
        if (ref._name === 'payment_claims') return { exists: !!store.payment_claims[ref._id], data: () => store.payment_claims[ref._id] };
        if (ref._name === 'users') return { exists: !!store.users[ref._id], data: () => store.users[ref._id] };
        const d = store.topup_requests[ref.id];
        return { exists: !!d, data: () => d };
      },
      update: (ref, u) => { if (ref._name === 'users') Object.assign(store.users[ref._id], u); else Object.assign(store.topup_requests[ref.id], u); },
      set: (ref, d) => { if (ref._name === 'payment_claims') store.payment_claims[ref._id] = d; else (ref._name === 'notifications' ? store.notifications : store.wallet_transactions).push(d); }
    };
    return fn(tx);
  }
};
const orig = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin') return { apps: [1], firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => n }, FieldPath: { documentId: () => '__name__' } }), initializeApp() {}, credential: { cert() {} } };
  if (/_lib[\\/]push(\.js)?$/.test(req) || req === './_lib/push') return { sendPushToUser: async () => {} };
  return orig.apply(this, arguments);
};
process.env.SASPAY_API_KEY = 'sk_live_AbCdEfGh1234';
process.env.SASPAY_WEBHOOK_SECRET = 'secret-du-webhook';
const webhook = require(path.join(__dirname, '..', 'api', 'payment-webhook.js'));
const sp = require('../api/_lib/saspay');

const HOUR = 3600 * 1000;
function mk(id, extra) {
  return Object.assign({ id, uid: 'u1', amountUSD: 10, method: 'saspay', status: 'pending_payment', saspaySessionId: 'sess-' + id, saspayReference: 'ref-' + id, saspayCurrency: 'XOF', saspayAmount: 6300, createdAt: new Date().toISOString() }, extra);
}
function fill(opts) {
  Object.keys(store.topup_requests).forEach((k) => delete store.topup_requests[k]);
  store.users = { u1: { balance: 5 } }; store.wallet_transactions.length = 0; store.notifications.length = 0; store.payment_claims = {};
  // 220 sessions abandonnées récentes (ordre des identifiants : a000 … a219)
  for (let i = 0; i < 220; i++) store.topup_requests['a' + String(i).padStart(3, '0')] = mk('a' + String(i).padStart(3, '0'), { createdAt: new Date(Date.now() - HOUR - i * 10000).toISOString() });
  // 30 sessions vieilles de plus de 72 h, jamais payées
  for (let i = 0; i < 30; i++) store.topup_requests['b' + String(i).padStart(2, '0')] = mk('b' + String(i).padStart(2, '0'), { createdAt: new Date(Date.now() - 80 * HOUR - i * 1000).toISOString() });
  // LA recharge réellement payée : elle arrive en DERNIER dans l'ordre des identifiants (la 251e demande)
  store.topup_requests.zzpaid = mk('zzpaid', { saspaySessionId: 'sess-paid' });
  flags.pagingBroken = !!(opts && opts.pagingBroken); flags.reads = 0;
}
function fakeSaspayApi() {
  const real = global.fetch;
  global.fetch = async (url) => {
    const u = String(url).replace(sp.BASE, '');
    const reply = (body, status) => ({ ok: (status || 200) < 400, status: status || 200, text: async () => JSON.stringify(body) });
    if (u === '/checkout-sessions/sess-paid/status/') return reply({ data: { status: 'PAID', transaction: 'txP' } });
    if (u === '/payments/txP/verify/') return reply({ data: { status: 'SUCCESS', currency: 'XOF', amount: '6300.00' } });
    if (/^\/checkout-sessions\/[^/]+\/status\/$/.test(u)) return reply({ data: { status: 'PENDING' } });
    return reply({}, 404);
  };
  return () => { global.fetch = real; };
}
async function notify() {
  const raw = JSON.stringify({ event: 'transaction.success', data: { id: 'txP' } });
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', 'secret-du-webhook').update(ts + '.' + raw).digest('hex');
  const out = {};
  const res = { status(c) { out.code = c; return this; }, json(j) { out.body = j; return this; }, end() { return this; } };
  const r = Readable.from([Buffer.from(raw)]);
  r.method = 'POST'; r.query = { provider: 'saspay' };
  r.headers = { 'x-webhook-signature': sig, 'x-webhook-timestamp': String(ts), 'x-webhook-event': 'transaction.success' };
  await webhook(r, res);
  return out;
}

test('SasPay file : 251 recharges en attente, la vraie payée est la dernière dans l\'ordre → elle est quand même créditée (une seule fois)', async () => {
  fill();
  const restore = fakeSaspayApi();
  try {
    const out = await notify();
    assert.strictEqual(out.code, 200, JSON.stringify(out.body));
    assert.strictEqual(out.body.credited, 1);
    assert.strictEqual(store.users.u1.balance, 15, 'on crédite les 10 $ de NOTRE demande');
    assert.strictEqual(store.topup_requests.zzpaid.status, 'completed');
    assert.strictEqual(store.wallet_transactions.length, 1);
    // Une 2e notification identique ne recrédite rien
    await notify();
    assert.strictEqual(store.users.u1.balance, 15);
    assert.strictEqual(store.wallet_transactions.length, 1);
  } finally { restore(); }
});

test('SasPay file : les sessions jamais payées depuis plus de 72 h passent « expirée » (mises à jour terminées avant la réponse)', async () => {
  fill();
  const restore = fakeSaspayApi();
  try {
    await notify();
    const expired = Object.keys(store.topup_requests).filter((k) => store.topup_requests[k].status === 'expired');
    assert.strictEqual(expired.length, 30);
    assert.ok(expired.every((k) => /^b\d\d$/.test(k)));
    // Les récentes encore ouvertes ne sont PAS expirées
    assert.strictEqual(store.topup_requests.a000.status, 'pending_payment');
    assert.strictEqual(store.topup_requests.a219.status, 'pending_payment');
  } finally { restore(); }
});

test('SasPay file : si la lecture des pages suivantes est impossible, la 1re page est traitée comme avant, sans planter', async () => {
  fill({ pagingBroken: true });
  // Sans pages suivantes, seules 100 demandes sont lues (a000…a099) : la payée n'y est pas, mais rien ne casse ni ne se crédite à tort.
  const restore = fakeSaspayApi();
  try {
    const out = await notify();
    assert.ok(out.code === 200 || out.code === 503, 'code ' + out.code);
    assert.strictEqual(store.users.u1.balance, 5);
    assert.strictEqual(store.wallet_transactions.length, 0);
  } finally { restore(); }
});

test('SasPay file : la lecture est bornée (au plus 3 pages de 100 pour la notification)', async () => {
  fill();
  const restore = fakeSaspayApi();
  try {
    await notify();
    assert.ok(flags.reads <= 3, 'lectures de pages : ' + flags.reads);
  } finally { restore(); }
});
