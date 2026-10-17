const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
function load() {
  const el = { appendChild() {}, insertAdjacentElement() {}, addEventListener() {}, parentElement: null, set textContent(v) {} };
  const ctx = { document: { head: { appendChild() {} }, createElement: () => ({ style: {}, addEventListener() {} }), getElementById: () => el }, escapeHtml: (s) => s, setTimeout: () => 0, setInterval: () => 0, clearInterval() {}, console };
  ctx.window = ctx; ctx.showDashTab = function () {}; ctx.db = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../my-activity.js', 'utf8'), ctx);
  return ctx.CNActivity;
}
const A = load();
const NOW = new Date('2026-10-17T10:00:00Z').getTime();
test('facture : reste a payer, retard, payee', () => {
  assert.deepStrictEqual({ ...A.invoiceDue({ total: 100, payments: [{ amount: 40 }], dueDate: '2026-10-10' }, NOW) }, { due: 60, late: true });
  assert.deepStrictEqual({ ...A.invoiceDue({ total: 100, payments: [{ amount: 100 }], dueDate: '2026-10-01' }, NOW) }, { due: 0, late: false });
  assert.deepStrictEqual({ ...A.invoiceDue({ total: 50, payments: [], dueDate: '2026-10-30' }, NOW) }, { due: 50, late: false });
});
test('resume des factures par devise', () => {
  const s = A.summarizeInvoices([{ total: 100, currency: 'USD', payments: [] }, { total: 50, currency: 'USD', payments: [{ amount: 50 }] }, { total: 200000, currency: 'CDF', payments: [], dueDate: '2026-09-01' }], NOW);
  assert.deepStrictEqual({ ...s.byCurrency }, { USD: 100, CDF: 200000 }); assert.strictEqual(s.open, 2); assert.strictEqual(s.late, 1);
});
test('prochain billet : ignore annules et evenements passes', () => {
  const day = 86400000;
  const n = A.nextTicket([{ status: 'cancelled', eventStartDate: new Date(NOW + day).toISOString(), eventTitle: 'A' }, { status: 'confirmed', eventStartDate: new Date(NOW - 5 * day).toISOString(), eventTitle: 'B' }, { status: 'confirmed', eventStartDate: new Date(NOW + 3 * day).toISOString(), eventTitle: 'C' }, { status: 'confirmed', eventStartDate: new Date(NOW + 2 * day).toISOString(), eventTitle: 'D' }], NOW);
  assert.strictEqual(n.t.eventTitle, 'D'); assert.strictEqual(A.nextTicket([], NOW), null);
});
test('mouvement net sur 30 jours', () => {
  const day = 86400000;
  assert.strictEqual(A.netRecent([{ amount: 10, createdAt: new Date(NOW - day).toISOString() }, { amount: -4.5, createdAt: new Date(NOW - 5 * day).toISOString() }, { amount: 99, createdAt: new Date(NOW - 40 * day).toISOString() }], 30, NOW), 5.5);
});
test('libelle de delai', () => {
  const noon = new Date('2026-10-17T12:00:00').getTime();
  assert.strictEqual(A.daysLabel(noon, noon), 'Aujourd’hui'); assert.strictEqual(A.daysLabel(noon + 86400000, noon), 'Demain'); assert.strictEqual(A.daysLabel(noon + 4 * 86400000, noon), 'Dans 4 jours');
});
