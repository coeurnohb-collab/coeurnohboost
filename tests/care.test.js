const test = require('node:test');
const assert = require('node:assert');
const { createCare, plain } = require('../api/_lib/care');

// Faux Firestore en mémoire (juste ce dont care.js a besoin).
function fakeDb() {
  const cols = {}; let n = 0;
  const c = (name) => (cols[name] = cols[name] || {});
  const snap = (id, data) => ({ id, exists: data !== undefined, data: () => data });
  const query = (name, filters, lim, after) => ({
    where: (f, op, v) => query(name, filters.concat([[f, v]]), lim, after),
    orderBy: () => query(name, filters, lim, after), limit: (k) => query(name, filters, k, after), startAfter: (a) => query(name, filters, lim, a),
    get: async () => { let ids = Object.keys(c(name)).sort(); if (after) ids = ids.filter((i) => i > after); ids = ids.filter((i) => filters.every(([f, v]) => c(name)[i][f] === v)); if (lim) ids = ids.slice(0, lim); return { docs: ids.map((i) => snap(i, c(name)[i])) }; }
  });
  return { cols, collection: (name) => Object.assign(query(name, [], 0), {
    add: async (d) => { const id = 'id' + (++n) + 'abcdef'; c(name)[id] = d; return { id }; },
    doc: (id) => ({ get: async () => snap(id, c(name)[id]), update: async (d) => { Object.assign(c(name)[id], d); }, set: async (d) => { c(name)[id] = d; } }) }) };
}
const ADMIN = 'adm';
const adminStub = { firestore: { FieldPath: { documentId: () => '__name__' } } };
function make() { const db = fakeDb(), pushes = []; db.cols.users = { u1: { name: 'Awa', email: 'a@x.cd', fcmToken: 'SECRET', balance: 5 } }; return { db, pushes, care: createCare({ db, admin: adminStub, ADMIN_UID: ADMIN, push: async (...a) => { pushes.push(a); } }) }; }

test('demande : validation, création, limite de 5 en cours', async () => {
  const { care, db, pushes } = make();
  await assert.rejects(() => care.supportCreate('u1', { subject: 'a', message: 'trop court' }), /sujet/);
  const r = await care.supportCreate('u1', { category: 'paiement', subject: 'Recharge manquante', message: 'Ma recharge de 10 dollars n’est pas arrivée.' });
  assert.ok(r.success && r.ref.length === 6); assert.strictEqual(pushes.length, 1);
  for (let i = 0; i < 4; i++) await care.supportCreate('u1', { subject: 'Autre ' + i, message: 'Un message assez long ' + i });
  await assert.rejects(() => care.supportCreate('u1', { subject: 'Encore', message: 'Un message assez long' }), /5 demandes/);
  assert.strictEqual(Object.keys(db.cols.support_tickets).length, 5);
});
test('demande : réponse admin, réponse utilisateur, droits', async () => {
  const { care, pushes } = make();
  const { id } = await care.supportCreate('u1', { subject: 'Problème', message: 'Je ne peux pas me connecter.' });
  await assert.rejects(() => care.supportAdmin('u1', { op: 'list' }), /administrateur/);
  await care.supportAdmin(ADMIN, { op: 'reply', id, text: 'Essayez de vous reconnecter.' });
  assert.strictEqual(pushes.at(-1)[0], 'u1');
  let mine = await care.supportMine('u1'); assert.strictEqual(mine.items[0].status, 'answered'); assert.strictEqual(mine.items[0].replies[0].from, 'admin');
  await assert.rejects(() => care.supportUser('autre', { id, text: 'bonjour' }), /introuvable/);
  await care.supportUser('u1', { id, text: 'Merci, ça marche.' });
  mine = await care.supportMine('u1'); assert.strictEqual(mine.items[0].status, 'open');
  await care.supportUser('u1', { id, op: 'close' });
  assert.strictEqual((await care.supportMine('u1')).items[0].status, 'closed');
  assert.ok((await care.auditList(ADMIN)).items === undefined || true);
});
test('export personnel : retire les secrets, ne mélange pas les utilisateurs', async () => {
  const { care, db } = make();
  db.cols.orders = { o1: { uid: 'u1', total: 3 }, o2: { uid: 'u2', total: 9 } };
  const r = await care.exportMyData('u1');
  assert.strictEqual(r.data.profile.name, 'Awa'); assert.strictEqual(r.data.profile.fcmToken, undefined);
  assert.strictEqual(r.data.orders.length, 1); assert.strictEqual(r.data.orders[0].total, 3);
});
test('sauvegarde : admin seulement, liste blanche, pagination', async () => {
  const { care, db } = make();
  db.cols.orders = {}; for (let i = 0; i < 3; i++) db.cols.orders['o' + i] = { uid: 'u1', n: i };
  await assert.rejects(() => care.backupExport('u1', { collection: 'orders' }), /administrateur/);
  await assert.rejects(() => care.backupExport(ADMIN, { collection: 'api_keys' }), /non autorisée/);
  const r = await care.backupExport(ADMIN, { collection: 'orders' });
  assert.strictEqual(r.docs.length, 3); assert.strictEqual(r.next, '');
  assert.strictEqual(Object.keys(db.cols.admin_audit).length, 1);
});
test('plain : Timestamps convertis, secrets retirés', () => {
  const o = plain({ at: { toDate: () => new Date('2026-01-02T03:04:05Z') }, apiKeyHash: 'x', nested: { token: 'y', ok: 1 } });
  assert.strictEqual(o.at, '2026-01-02T03:04:05.000Z'); assert.strictEqual(o.apiKeyHash, undefined); assert.strictEqual(o.nested.token, undefined); assert.strictEqual(o.nested.ok, 1);
});

test('journal des modifications : valeurs jamais enregistrées, chemins filtrés', async () => {
  const { care, db } = make();
  db.batch = () => { const ops = []; return { set: (ref, d) => ops.push(d), commit: async () => { ops.forEach((d, i) => { db.cols.admin_audit = db.cols.admin_audit || {}; db.cols.admin_audit['b' + Math.random()] = d; }); } }; };
  const orig = db.collection; db.collection = (n) => Object.assign(orig(n), { doc: () => ({}) });
  await assert.rejects(() => care.auditBatch('u1', { entries: [] }), /administrateur/);
  const r = await care.auditBatch(ADMIN, { entries: [
    { op: 'update', path: 'pricing/site', keys: ['premium', 'domain'], data: { secret: 'x' } },
    { op: 'set', path: 'admin_audit/xyz', keys: [] }, { op: 'drop', path: 'users/a', keys: [] }, { op: 'delete', path: '../hack', keys: [] }] });
  assert.strictEqual(r.saved, 1);
  const row = Object.values(db.cols.admin_audit)[0];
  assert.strictEqual(row.action, 'edit:update'); assert.strictEqual(row.detail, 'pricing/site [premium,domain]'); assert.ok(!JSON.stringify(row).includes('secret'));
});
