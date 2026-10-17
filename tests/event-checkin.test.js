const test = require('node:test');
const assert = require('node:assert');
const { createEventCheckin, normCode, shortCode } = require('../api/_lib/event-checkin.js');

function makeDb(store) {
  const ref = (c, id) => ({ id, get: async () => ({ exists: !!store[c][id], id, ref: ref(c, id), data: () => store[c][id] }), _c: c });
  const query = (c, f) => ({ where: (k, o, v) => query(c, f.concat([[k, v]])), limit: () => query(c, f), get: async () => ({ docs: Object.keys(store[c]).filter((id) => f.every(([k, v]) => store[c][id][k] === v)).map((id) => ({ id, ref: ref(c, id), data: () => store[c][id] })) }) });
  return {
    collection: (c) => Object.assign({ doc: (id) => ref(c, id) }, { where: (k, o, v) => query(c, [[k, v]]) }),
    runTransaction: async (fn) => fn({ get: (r) => r.get(), update: (r, d) => { const t = store[r._c][r.id]; Object.keys(d).forEach((k) => { t[k] = (d[k] && d[k].__arr) ? (t[k] || []).concat([d[k].__arr]) : d[k]; }); } })
  };
}
const admin = { firestore: { FieldValue: { arrayUnion: (v) => ({ __arr: v }) } } };
const ID1 = 'AbCdEfGh1234567890Zx', ID2 = 'ZyXwVuTs0987654321Qq';
function setup() {
  const store = {
    events: { ev1: { ownerUid: 'org', title: 'Festival', ticketTypes: [{ quantityTotal: 100 }], staffUids: ['staff'] } },
    event_tickets: {
      [ID1]: { eventId: 'ev1', buyerName: 'Marie', ticketTypeName: 'VIP', quantity: 2, amountPaid: 40, status: 'confirmed' },
      [ID2]: { eventId: 'ev1', buyerName: 'Jean', ticketTypeName: 'Standard', quantity: 1, amountPaid: 10, status: 'cancelled' }
    }
  };
  return { store, c: createEventCheckin({ db: makeDb(store), admin, ADMIN_UID: 'adm' }) };
}
test('codes : normalisation et code court', () => {
  assert.strictEqual(normCode(' CN1:AbCd-1234 '), 'AbCd1234');
  assert.strictEqual(normCode('<script>'), '');
  assert.strictEqual(shortCode(ID1), 'ABCDEFGH');
});
test('validation : organisateur, admission partielle puis billet épuisé', async () => {
  const { c, store } = setup();
  let r = await c.checkin('org', { eventId: 'ev1', code: 'CN1:' + ID1, dryRun: true });
  assert.strictEqual(r.valid, true); assert.strictEqual(r.ticket.remaining, 2);
  r = await c.checkin('org', { eventId: 'ev1', code: ID1, admit: 1 });
  assert.strictEqual(r.valid, true); assert.strictEqual(r.admitted, 1); assert.strictEqual(r.ticket.remaining, 1);
  r = await c.checkin('staff', { eventId: 'ev1', code: shortCode(ID1) });
  assert.strictEqual(r.valid, true); assert.strictEqual(r.ticket.remaining, 0);
  r = await c.checkin('org', { eventId: 'ev1', code: ID1 });
  assert.strictEqual(r.valid, false); assert.strictEqual(r.reason, 'used');
  assert.strictEqual(store.event_tickets[ID1].checkedInCount, 2);
});
test('validation : refus pour un tiers, billet annulé, autre événement, inconnu', async () => {
  const { c } = setup();
  await assert.rejects(() => c.checkin('intrus', { eventId: 'ev1', code: ID1 }), /organisateur/);
  const r = await c.checkin('org', { eventId: 'ev1', code: ID2 });
  assert.strictEqual(r.valid, false); assert.strictEqual(r.reason, 'cancelled');
  await assert.rejects(() => c.checkin('org', { eventId: 'ev1', code: 'NOPE1234' }), /introuvable/);
  await assert.rejects(() => c.checkin('org', { eventId: 'ev1', code: '!!' }), /invalide/);
});
test('statistiques : ventes, présents, revenus', async () => {
  const { c } = setup();
  await c.checkin('org', { eventId: 'ev1', code: ID1, admit: 1 });
  const s = await c.stats('org', { eventId: 'ev1' });
  assert.strictEqual(s.sold, 2); assert.strictEqual(s.present, 1); assert.strictEqual(s.cancelled, 1); assert.strictEqual(s.capacity, 100); assert.strictEqual(s.revenue, 40);
  await assert.rejects(() => c.stats('intrus', { eventId: 'ev1' }), /organisateur/);
});
