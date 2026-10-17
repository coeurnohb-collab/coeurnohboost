const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
// Charge study-planner.js dans un faux navigateur minimal pour tester sa logique pure.
function load() {
  const store = {};
  const ctx = { window: {}, document: { head: { appendChild() {} }, createElement: () => ({ set textContent(v) {}, style: {} }), getElementById: () => null }, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem() {} }, escapeHtml: (s) => s, setTimeout: () => 0, console };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../study-planner.js', 'utf8'), ctx);
  return ctx.CNPlanner;
}
const P = load();
test('date de fin estimee : 12 leçons de 25 min a 2 h par semaine', () => {
  const d = P.finishEstimate(12, 2, new Date('2026-10-17T10:00:00Z'));
  assert.strictEqual(d.toISOString().slice(0, 10), '2026-11-04'); // 5 h / 2 h = 2,5 semaines = 18 jours
  assert.strictEqual(P.finishEstimate(0, 3), null);
});
test('paliers : progression vers le prochain badge', () => {
  const m = P.MILESTONES.find((x) => x.id === 'streak');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(P.nextMilestone(0, m.steps))), { prev: 0, next: 3, pct: 0, reached: 0 });
  assert.strictEqual(P.nextMilestone(5, m.steps).next, 7);
  assert.strictEqual(P.nextMilestone(5, m.steps).pct, 50);
  assert.strictEqual(P.nextMilestone(500, m.steps).next, null);
});
test('leçons de la semaine d\'apres les releves locaux', () => {
  const now = new Date('2026-10-17T10:00:00'); // samedi, lundi = 2026-10-12
  assert.strictEqual(P.weekCount({ '2026-10-10': 4, '2026-10-14': 6 }, 7, now), 3);
  assert.strictEqual(P.weekCount({ '2026-10-14': 6 }, 8, now), 2);
  assert.strictEqual(P.weekCount({}, 8, now), 0);
});
test('fichier .ics : recurrence hebdomadaire, jours, rappel', () => {
  const ics = P.buildIcs({ days: ['TH', 'MO'], time: '18:30', minutes: 45 }, ['Anglais, niveau B1'], new Date('2026-10-17T10:00:00'));
  assert.match(ics, /BEGIN:VCALENDAR/); assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,TH/);
  assert.match(ics, /DTSTART:20261019T183000/); assert.match(ics, /DTEND:20261019T191500/); assert.match(ics, /TRIGGER:-PT10M/);
  assert.ok(!/Anglais,/.test(ics)); assert.ok(ics.indexOf('\r\n') > 0);
});
