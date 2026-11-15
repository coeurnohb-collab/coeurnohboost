// Achats par solde : une personne qui est À LA FOIS l'acheteuse et la vendeuse (organisatrice d'un concours,
// d'un événement, formatrice d'un cours) ne doit JAMAIS pouvoir fabriquer de l'argent.
//
// Pourquoi : dans une transaction Firestore, deux écritures sur le MÊME compte se suivent et la dernière gagne.
// Quand acheteuse et vendeuse sont la même personne, la « part du vendeur » (calculée sur l'ancien solde) écrasait
// le « paiement de l'acheteur » : la personne gagnait de l'argent à chaque achat de son propre produit.
//
// Le faux Firestore ci-dessous reproduit ce comportement réel : lectures figées au moment de la lecture,
// écritures appliquées à la fin dans l'ordre (la dernière gagne), et lecture interdite après une écriture.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');

const ADMIN = '8BqWONj07hVZePHe2DrkHWYRjse2';
const store = {};
let autoId = 0;
const col = (n) => (store[n] = store[n] || {});
const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
function resolveInc(prev, patch) {
  const out = {};
  Object.keys(patch).forEach((k) => {
    const v = patch[k];
    out[k] = v && typeof v === 'object' && '__inc' in v ? (Number((prev || {})[k]) || 0) + v.__inc : v;
  });
  return out;
}
function applyWrite(kind, r, data) {
  const c = col(r._c);
  if (kind === 'set') { c[r._id] = resolveInc({}, data); return; }
  if (!c[r._id]) throw new Error('NOT_FOUND ' + r._c + '/' + r._id);
  c[r._id] = Object.assign({}, c[r._id], resolveInc(c[r._id], data));
}
function mkRef(c, id) {
  const r = { _c: c, _id: id, id };
  r.get = async () => ({ exists: col(c)[id] !== undefined, id, data: () => clone(col(c)[id]) });
  r.set = async (d) => applyWrite('set', r, d);
  r.update = async (u) => applyWrite('update', r, u);
  return r;
}
const fakeDb = {
  collection(name) { return { doc(id) { return mkRef(name, id || 'auto' + (++autoId)); } }; },
  async runTransaction(fn) {
    const writes = [];
    const tx = {
      get: async (r) => {
        if (writes.length) throw new Error('Firestore : toutes les lectures doivent précéder les écritures');
        return r.get();
      },
      set: (r, d) => { writes.push(['set', r, d]); },
      update: (r, u) => { writes.push(['update', r, u]); }
    };
    const out = await fn(tx);
    writes.forEach(([k, r, d]) => applyWrite(k, r, d));
    return out;
  }
};

const orig = Module._load;
Module._load = function (request) {
  if (request === 'firebase-admin') {
    return {
      apps: [1], initializeApp() {}, credential: { cert() {} }, auth() { return {}; },
      firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => new Date().toISOString() }, FieldPath: {} })
    };
  }
  if (/(^|[\\/])push(\.js)?$/.test(request)) return { sendPushToUser: async () => {}, sendMulticast: async () => {} };
  const mod = orig.apply(this, arguments);
  if (/(^|[\\/])security(\.js)?$/.test(request)) {
    return Object.assign({}, mod, {
      initFirebaseAdmin() {},
      verifyCaller: async (req) => ({ uid: req.body.__uid, isAdmin: req.body.__uid === ADMIN }),
      enforceRateLimit: async () => {}
    });
  }
  return mod;
};
const handler = require(path.join(__dirname, '..', 'api', 'payments-actions.js'));

async function act(uid, body) {
  const out = {};
  const res = { status(c) { out.code = c; return this; }, json(j) { out.body = j; return this; }, setHeader() {} };
  await handler({ method: 'POST', headers: {}, body: Object.assign({ __uid: uid }, body) }, res);
  return out.body;
}
const bal = (u) => col('users')[u].balance;
const total = () => Math.round(Object.values(col('users')).reduce((s, u) => s + u.balance, 0) * 100) / 100;

function reset() {
  Object.keys(store).forEach((k) => delete store[k]);
  store.users = { org: { balance: 50, name: 'Organisateur' }, buyer: { balance: 50, name: 'Acheteur' }, [ADMIN]: { balance: 0, name: 'Admin' } };
  store.contests = { c1: { type: 'paid', entryFee: 10, title: 'Concours', organizerUid: 'org', startDate: '2020-01-01T00:00:00Z', endDate: '2999-01-01T00:00:00Z' } };
  store.events = {
    e1: { status: 'active', title: 'Soirée', ownerUid: 'org', startDate: '2999-01-01T00:00:00Z', endDate: '2999-01-02T00:00:00Z',
      ticketTypes: [{ id: 'vip', name: 'VIP', price: 20, quantityTotal: 10, quantitySold: 0 }, { id: 'free', name: 'Gratuit', price: 0, quantityTotal: 10, quantitySold: 0 }] }
  };
  store.courses = { k1: { status: 'active', title: 'Cours', ownerUid: 'org', price: 30 } };
}

const entry = (uid) => act(uid, { action: 'contest_entry', contestId: 'c1', name: 'Moi', submissionUrl: 'https://exemple.com/a.jpg', submissionType: 'image' });
const ticket = (uid, t) => act(uid, { action: 'event_reserve', eventId: 'e1', ticketTypeId: t || 'vip', quantity: 1 });
const enroll = (uid) => act(uid, { action: 'course_enroll', courseId: 'k1' });

test('concours payant : un autre participant paie, l\'organisateur reçoit 85 %, la plateforme 15 %, rien ne se crée', async () => {
  reset(); const before = total();
  const r = await entry('buyer');
  assert.strictEqual(r.success, true, r.error);
  assert.strictEqual(bal('buyer'), 40); assert.strictEqual(bal('org'), 58.5); assert.strictEqual(bal(ADMIN), 1.5);
  assert.strictEqual(total(), before);
});

test('concours payant : l\'organisateur ne peut pas participer à son propre concours payant (pas d\'argent créé)', async () => {
  reset(); const before = total();
  const r = await entry('org');
  assert.strictEqual(r.success, false);
  assert.match(String(r.error), /propre concours/);
  assert.strictEqual(bal('org'), 50); assert.strictEqual(total(), before);
  assert.ok(!col('contest_entries')['c1_org']);
});

test('billet payant : un autre acheteur paie, tout est réparti, rien ne se crée', async () => {
  reset(); const before = total();
  const r = await ticket('buyer');
  assert.strictEqual(r.success, true, r.error);
  assert.strictEqual(bal('buyer'), 30); assert.strictEqual(bal('org'), 67); assert.strictEqual(bal(ADMIN), 3);
  assert.strictEqual(total(), before);
});

test('billet payant : l\'organisateur ne peut pas se vendre un billet payant à lui-même (pas d\'argent créé)', async () => {
  reset(); const before = total();
  const r = await ticket('org', 'vip');
  assert.strictEqual(r.success, false);
  assert.match(String(r.error), /propre événement/);
  assert.strictEqual(bal('org'), 50); assert.strictEqual(total(), before);
  assert.strictEqual(col('events').e1.ticketTypes[0].quantitySold, 0);
});

test('billet GRATUIT : l\'organisateur peut toujours se réserver une place (aucun argent en jeu)', async () => {
  reset(); const before = total();
  const r = await ticket('org', 'free');
  assert.strictEqual(r.success, true, r.error);
  assert.strictEqual(bal('org'), 50); assert.strictEqual(total(), before);
});

test('cours payant : un étudiant paie, le formateur reçoit 85 %, la plateforme 15 %, rien ne se crée', async () => {
  reset(); const before = total();
  const r = await enroll('buyer');
  assert.strictEqual(r.success, true, r.error);
  assert.strictEqual(bal('buyer'), 20); assert.strictEqual(bal('org'), 75.5); assert.strictEqual(bal(ADMIN), 4.5);
  assert.strictEqual(total(), before);
});

test('cours payant : le formateur ne peut pas acheter son propre cours (pas d\'argent créé)', async () => {
  reset(); const before = total();
  const r = await enroll('org');
  assert.strictEqual(r.success, false);
  assert.match(String(r.error), /propre cours/);
  assert.strictEqual(bal('org'), 50); assert.strictEqual(total(), before);
  assert.ok(!col('course_enrollments')['k1_org']);
});

/* ---------- Détection des cas passés (lecture seule) ---------- */
const guard = require(path.join(__dirname, '..', 'api', '_lib', 'balance-guard.js'));

test('détection : retrouve cours, billet et concours achetés par leur propre vendeur, ignore les achats normaux, gratuits et ceux de l\'admin', () => {
  const found = guard.pickSelfDeals({
    adminUid: ADMIN,
    enrollments: [
      { studentUid: 'org', courseOwnerUid: 'org', amountPaid: 30, courseTitle: 'Cours', createdAt: '2026-11-01' },
      { studentUid: 'buyer', courseOwnerUid: 'org', amountPaid: 30 },
      { studentUid: ADMIN, courseOwnerUid: ADMIN, amountPaid: 30 }
    ],
    tickets: [
      { buyerUid: 'org', organizerUid: 'org', amountPaid: 20, eventTitle: 'Soirée', createdAt: '2026-11-03' },
      { buyerUid: 'org', organizerUid: 'org', amountPaid: 0 },
      { buyerUid: 'buyer', organizerUid: 'org', amountPaid: 20 }
    ],
    entries: [{ contestId: 'c1', uid: 'org', amountPaid: 10, createdAt: '2026-11-02' }, { contestId: 'c1', uid: 'buyer', amountPaid: 10 }],
    contests: { c1: { organizerUid: 'org', title: 'Concours' } }
  });
  assert.deepStrictEqual(found.map((x) => x.kind), ['billet', 'concours', 'cours']);
  assert.strictEqual(found.reduce((s, x) => s + x.amount, 0), 60);
});

test('détection : findSelfDeals lit les 4 collections et résume (nombre, total, liste)', async () => {
  const data = {
    course_enrollments: [{ studentUid: 'org', courseOwnerUid: 'org', amountPaid: 30, courseTitle: 'Cours' }],
    event_tickets: [{ buyerUid: 'org', organizerUid: 'org', amountPaid: 20, eventTitle: 'Soirée' }],
    contest_entries: [{ contestId: 'c1', uid: 'org', amountPaid: 10 }],
    contests: [{ id: 'c1', data: { organizerUid: 'org', title: 'Concours' } }]
  };
  const mk = (rows) => ({ limit() { return this; }, where() { return this; }, get: async () => ({ docs: rows.map((r, i) => ({ id: r.id || 'd' + i, data: () => r.data || r })) }) });
  const db = { collection: (n) => mk(data[n] || []) };
  const r = await guard.findSelfDeals({ db, adminUid: ADMIN });
  assert.strictEqual(r.count, 3); assert.strictEqual(r.total, 60); assert.strictEqual(r.partial, false);
  const none = await guard.findSelfDeals({ db: { collection: () => mk([]) }, adminUid: ADMIN });
  assert.strictEqual(none.count, 0);
});
