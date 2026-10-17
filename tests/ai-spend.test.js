const test = require('node:test');
const assert = require('node:assert');
const { estimateCost, budgetVerdict, normalizeSpendConfig, createAiSpend } = require('../api/_lib/ai-spend');
const A = require('../api/_lib/academy-ai');

test('estimation du cout selon le fournisseur et les prix admin', () => {
  assert.strictEqual(estimateCost({ provider: 'anthropic', tokensIn: 1e6, tokensOut: 1e6 }, normalizeSpendConfig({})), 18);
  assert.strictEqual(estimateCost({ provider: 'gemini', tokensIn: 1e6, tokensOut: 0 }, normalizeSpendConfig({})), 0.3);
  assert.strictEqual(estimateCost({ provider: 'gemini', tokensIn: 1e6, tokensOut: 1e6 }, normalizeSpendConfig({ priceInPerM: 1, priceOutPerM: 2 })), 3);
  assert.strictEqual(estimateCost({ provider: 'x', tokensIn: 'abc', tokensOut: -5 }, {}), 0 - 0 + estimateCost({ provider: 'x', tokensIn: 0, tokensOut: -5 }, {}));
});

test('plafonds : jour, mois, eleve, et absence de plafond', () => {
  const none = normalizeSpendConfig({});
  assert.strictEqual(budgetVerdict(none, { day: 999, month: 9999, user: 99 }), null);
  const c = normalizeSpendConfig({ dailyBudgetUsd: 5, monthlyBudgetUsd: 100, perUserDailyUsd: 0.5 });
  assert.strictEqual(budgetVerdict(c, { day: 1, month: 1, user: 0.1 }), null);
  assert.strictEqual(budgetVerdict(c, { day: 5, month: 1, user: 0 }).scope, 'day');
  assert.strictEqual(budgetVerdict(c, { day: 1, month: 100, user: 0 }).scope, 'month');
  assert.strictEqual(budgetVerdict(c, { day: 1, month: 1, user: 0.5 }).scope, 'user');
  assert.match(budgetVerdict(c, { day: 5, month: 0, user: 0 }).message, /rien n'a été décompté/);
});

test('configuration : valeurs hors limites ramenees a des valeurs sures', () => {
  const c = normalizeSpendConfig({ dailyBudgetUsd: -4, monthlyBudgetUsd: 'abc', perUserDailyUsd: 1e9, priceInPerM: null });
  assert.strictEqual(c.dailyBudgetUsd, 0); assert.strictEqual(c.monthlyBudgetUsd, 0); assert.strictEqual(c.perUserDailyUsd, 10000);
});

// Mini Firestore en memoire
function fakeDb(initial) {
  const store = Object.assign({}, initial);
  const isInc = (v) => v && v.__inc !== undefined;
  const merge = (dst, src) => { Object.keys(src).forEach((k) => { const v = src[k]; if (isInc(v)) dst[k] = (Number(dst[k]) || 0) + v.__inc; else if (v && typeof v === 'object') { dst[k] = dst[k] || {}; merge(dst[k], v); } else dst[k] = v; }); };
  const ref = (path) => ({ path, get: async () => ({ exists: path in store, data: () => store[path], id: path.split('/')[1] }), set: async (d) => { store[path] = store[path] || {}; merge(store[path], d); } });
  const db = { store, collection: (c) => ({ doc: (id) => ref(c + '/' + id), where: (f, o, v) => ({ limit: () => ({ get: async () => ({ docs: Object.keys(store).filter((k) => k.startsWith(c + '/') && store[k][f] === v).map((k) => ({ data: () => store[k] })) }) }) }) }),
    batch: () => { const ops = []; return { set: (r, d) => ops.push([r, d]), commit: async () => { for (const [r, d] of ops) await r.set(d); } }; },
    getAll: async (...refs) => Promise.all(refs.map((r) => r.get())) };
  return db;
}
const admin = { firestore: { FieldValue: { increment: (n) => ({ __inc: n }) } } };
const today = new Date().toISOString().slice(0, 10);

test('enregistrement puis blocage quand le plafond du jour est atteint', async () => {
  const db = fakeDb({ 'app_config/academy_ai': { dailyBudgetUsd: 0.05 } });
  const sp = createAiSpend({ db, admin, ADMIN_UID: 'adm' });
  await sp.check('u1'); // rien depense : ok
  await sp.record({ uid: 'u1', kind: 'lesson', provider: 'anthropic', model: 'm', tokensIn: 1000, tokensOut: 2000, ok: true }); // 0.003+0.03 = 0.033
  await sp.check('u1');
  await sp.record({ uid: 'u1', kind: 'tutor', provider: 'anthropic', model: 'm', tokensIn: 1000, tokensOut: 2000, ok: true }); // total 0.066
  await assert.rejects(() => sp.check('u2'), (e) => e.code === 'ai_budget_day' && /pause/.test(e.message));
  const d = db.store['academy_ai_spend/d-' + today];
  assert.strictEqual(d.calls, 2); assert.ok(Math.abs(d.costUsd - 0.066) < 1e-9); assert.strictEqual(d.byKind.lesson.calls, 1); assert.strictEqual(d.blocked, 1);
});

test('plafond par eleve et erreurs non facturees', async () => {
  const db = fakeDb({ 'app_config/academy_ai': { perUserDailyUsd: 0.02 } });
  const sp = createAiSpend({ db, admin, ADMIN_UID: 'adm' });
  await sp.record({ uid: 'u1', kind: 'plan', provider: 'anthropic', tokensIn: 0, tokensOut: 0, ok: false });
  await sp.check('u1');
  await sp.record({ uid: 'u1', kind: 'plan', provider: 'anthropic', tokensIn: 500, tokensOut: 2000, ok: true }); // 0.0015+0.03
  await assert.rejects(() => sp.check('u1'), (e) => e.code === 'ai_budget_user');
  await sp.check('u2'); // un autre eleve n'est pas touche
  assert.strictEqual(db.store['academy_ai_spend/d-' + today].errors, 1);
});

test('rapport reserve a l\'administrateur', async () => {
  const db = fakeDb({});
  const sp = createAiSpend({ db, admin, ADMIN_UID: 'adm' });
  await assert.rejects(() => sp.report('someone'), /administrateur/);
  const r = await sp.report('adm');
  assert.strictEqual(r.days.length, 14); assert.strictEqual(r.today.calls, 0);
});

test('callAI : guard bloque avant tout appel reseau, onUsage recoit les tokens', async () => {
  let fetched = 0;
  const env = { ANTHROPIC_API_KEY: 'k' };
  const fetchImpl = async () => { fetched++; return { ok: true, status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: 'Bonjour' }], usage: { input_tokens: 11, output_tokens: 22 } }) }; };
  await assert.rejects(() => A.callAI({ cfg: { provider: 'anthropic' }, isPlus: false, system: 's', messages: [{ role: 'user', text: 'x' }], maxTokens: 10, env, fetchImpl, guard: async () => { throw new Error('pause'); } }), /pause/);
  assert.strictEqual(fetched, 0);
  let seen = null;
  const out = await A.callAI({ cfg: { provider: 'anthropic' }, isPlus: false, system: 's', messages: [{ role: 'user', text: 'x' }], maxTokens: 10, env, fetchImpl, onUsage: (u) => { seen = u; } });
  assert.strictEqual(out, 'Bonjour'); assert.strictEqual(seen.tokensIn, 11); assert.strictEqual(seen.tokensOut, 22); assert.strictEqual(seen.ok, true);
});
