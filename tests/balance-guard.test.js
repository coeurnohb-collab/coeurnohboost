// Contrôle des soldes : un solde doit toujours être égal au « balanceAfter » du dernier mouvement du relevé.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { runBalanceGuard, judge } = require('../api/_lib/balance-guard.js');

const T = (s) => new Date(Date.parse('2026-11-12T10:00:00Z') + s * 1000).toISOString();
const tx = (uid, balanceAfter, s) => ({ uid, balanceAfter, createdAt: T(s) });

test('solde égal au dernier mouvement → conforme', () => {
  assert.strictEqual(judge(15, [tx('a', 10, 0), tx('a', 15, 60)]).verdict, 'ok');
  assert.strictEqual(judge(15.004, [tx('a', 15, 0)]).verdict, 'ok', 'arrondi');
});

test('solde gonflé à la main → écart détecté avec le solde du relevé', () => {
  const j = judge(999, [tx('a', 10, 0), tx('a', 15, 60)]);
  assert.strictEqual(j.verdict, 'mismatch'); assert.strictEqual(j.ledger, 15);
});

test('un ancien mouvement égal au solde ne cache pas un écart récent', () => {
  assert.strictEqual(judge(10, [tx('a', 10, 0), tx('a', 15, 600)]).verdict, 'mismatch');
});

test('deux mouvements presque simultanés : pas de fausse alerte', () => {
  assert.strictEqual(judge(12, [tx('a', 15, 100), tx('a', 12, 100.5)]).verdict, 'ok');
  assert.strictEqual(judge(15, [tx('a', 15, 100), tx('a', 12, 100.5)]).verdict, 'ok');
});

test('solde sans aucun mouvement : classé à part ; solde nul sans mouvement : conforme', () => {
  assert.strictEqual(judge(20, []).verdict, 'noledger');
  assert.strictEqual(judge(0, []).verdict, 'ok');
});

function makeDb(users, ledger, cfg) {
  const store = { 'app_config/balance_guard': cfg || undefined };
  return {
    store,
    collection(n) {
      const q = {
        _f: null,
        doc(id) { const k = n + '/' + id; return { async get() { return { exists: store[k] !== undefined, data: () => store[k] }; }, async set(o) { store[k] = Object.assign({}, store[k] || {}, o); } }; },
        orderBy() { return q; },
        startAfter(c) { q._after = c; return q; },
        limit(l) { q._l = l; return q; },
        where(f, op, v) { q._w = [f, v]; return q; },
        async get() {
          if (n === 'users') {
            let ids = Object.keys(users).sort(); if (q._after) ids = ids.filter((i) => i > q._after); ids = ids.slice(0, q._l || 1000);
            return { docs: ids.map((id) => ({ id, data: () => users[id] })) };
          }
          const rows = ledger.filter((r) => r[q._w[0]] === q._w[1]);
          return { docs: rows.map((r) => ({ data: () => r })) };
        }
      };
      return q;
    }
  };
}
const FP = { documentId: () => '__name__' };

test('passage complet : signale le solde gonflé, ignore les comptes conformes et à solde nul', async () => {
  const users = { a: { name: 'A', balance: 15 }, b: { name: 'B', email: 'b@x.cd', balance: 500 }, c: { name: 'C', balance: 0 }, d: { name: 'D', balance: 7 } };
  const ledger = [tx('a', 15, 0), tx('b', 5, 0), tx('b', 8, 30)];
  const db = makeDb(users, ledger);
  const r = await runBalanceGuard({ db, FieldPath: FP, now: Date.parse('2026-11-13T02:00:00Z') });
  assert.strictEqual(r.mismatch, 1); assert.strictEqual(r.noLedger, 1); assert.strictEqual(r.ok, 1); assert.strictEqual(r.wrapped, true);
  const cfg = db.store['app_config/balance_guard'];
  assert.strictEqual(cfg.openMismatch, 1);
  const bad = cfg.alerts.find((x) => x.uid === 'b');
  assert.strictEqual(bad.balance, 500); assert.strictEqual(bad.ledger, 8); assert.strictEqual(bad.kind, 'mismatch');
  assert.strictEqual(cfg.alerts[0].kind, 'mismatch', 'les écarts passent avant les « sans relevé »');
  assert.strictEqual(users.b.balance, 500, 'ne modifie jamais un solde');
});

test('une alerte disparaît quand le solde redevient conforme ou nul', async () => {
  const users = { b: { name: 'B', balance: 8 } };
  const db = makeDb(users, [tx('b', 8, 30)], { alerts: [{ uid: 'b', kind: 'mismatch', balance: 500, ledger: 8 }, { uid: 'z', kind: 'mismatch', balance: 9, ledger: 1 }] });
  await runBalanceGuard({ db, FieldPath: FP });
  const uids = db.store['app_config/balance_guard'].alerts.map((x) => x.uid);
  assert.deepStrictEqual(uids, ['z'], 'b est corrigé ; z (hors lot) reste jusqu\'à son prochain contrôle');
});

test('lots : le curseur avance puis repart du début', async () => {
  const users = {}; for (let i = 0; i < 5; i++) users['u' + i] = { balance: 0 };
  const db = makeDb(users, []);
  let r = await runBalanceGuard({ db, FieldPath: FP, maxUsers: 3 });
  assert.strictEqual(r.wrapped, false); assert.strictEqual(db.store['app_config/balance_guard'].cursor, 'u2');
  r = await runBalanceGuard({ db, FieldPath: FP, maxUsers: 3 });
  assert.strictEqual(r.wrapped, true); assert.strictEqual(db.store['app_config/balance_guard'].cursor, null);
});

test('branchements : tâche quotidienne + action réservée à l\'administrateur + carte dans l\'espace admin', () => {
  const root = path.join(__dirname, '..');
  assert.match(fs.readFileSync(path.join(root, 'api/run-scheduled-broadcasts.js'), 'utf8'), /runBalanceGuard\(\{ db, FieldPath/);
  const wh = fs.readFileSync(path.join(root, 'api/payment-webhook.js'), 'utf8');
  assert.match(wh, /caller\.isAdmin[\s\S]{0,900}action === 'balance_guard'/);
  assert.match(fs.readFileSync(path.join(root, 'admin.js'), 'utf8'), /runBalanceGuardNow[\s\S]{0,200}saspayAdminCall\(\{ action: 'balance_guard' \}\)/);
  assert.strictEqual(fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js')).length <= 12, true);
});
