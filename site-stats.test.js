const test = require('node:test');
const assert = require('node:assert');
const { recordHit, summarize, siteStats } = require('../api/_lib/site-stats');

const NOW = Date.UTC(2026, 9, 18, 12, 0, 0);
test('résumé : série complète, totaux, taux de contact, meilleur jour', () => {
  const s = summarize({ '2026-10-18': { view: 10, wa: 2, cart: 1 }, '2026-10-17': { view: 30, call: 3, share: 1 }, '2026-09-01': { view: 999 } }, NOW, 7);
  assert.strictEqual(s.series.length, 7); assert.strictEqual(s.series[6].day, '2026-10-18'); assert.strictEqual(s.series[0].day, '2026-10-12');
  assert.strictEqual(s.total.view, 40); assert.strictEqual(s.actions, 6); assert.strictEqual(s.contactRate, 15); assert.strictEqual(s.bestDay, '2026-10-17');
  const empty = summarize({}, NOW, 30); assert.strictEqual(empty.contactRate, 0); assert.strictEqual(empty.bestDay, null);
});
test('enregistrement : événements et sites contrôlés, compteur par jour', async () => {
  const docs = { s1abcdefghij: { exists: true, status: 'published' }, draftsiteabcd: { exists: true, status: 'draft' } }; const writes = [];
  const db = { collection: (c) => ({ doc: (id) => ({ get: async () => ({ exists: !!docs[id], data: () => docs[id] }), set: async (d, o) => writes.push([c, id, d, o]) }) }) };
  const admin = { firestore: { FieldValue: { increment: (n) => ({ inc: n }) } } };
  await assert.rejects(() => recordHit(db, admin, { siteId: 's1abcdefghij', ev: 'hack' }), /inconnu/);
  await assert.rejects(() => recordHit(db, admin, { siteId: '../x', ev: 'view' }), /invalide/);
  await assert.rejects(() => recordHit(db, admin, { siteId: 'draftsiteabcd', ev: 'view' }), /introuvable/);
  await recordHit(db, admin, { siteId: 's1abcdefghij', ev: 'wa', now: NOW });
  assert.strictEqual(writes.length, 1); assert.strictEqual(writes[0][1], 's1abcdefghij_2026-10-18'); assert.deepStrictEqual(writes[0][2].wa, { inc: 1 });
});
test('lecture propriétaire : uniquement ses propres jours', async () => {
  const today = new Date().toISOString().slice(0, 10), asked = [];
  const db = { collection: () => ({ doc: (id) => (asked.push(id), { id }) }), getAll: async (...refs) => refs.map((r) => ({ exists: r.id.endsWith(today), data: () => ({ day: today, view: 5 }) })) };
  const r = await siteStats(db, 'owner12345', { days: 7 });
  assert.ok(asked.every((i) => i.startsWith('owner12345_'))); assert.strictEqual(r.series.length, 7); assert.strictEqual(r.total.view, 5);
});
