// Essai gratuit -> paywall -> abonnement : le flux qui rapporte de l'argent, teste de bout en bout avec une base factice.
const test = require('node:test');
const assert = require('node:assert');
const { createAcademyStudy } = require('../api/_lib/academy-study');

function fakeDb() {
  const store = new Map();
  const key = (c, i) => c + '/' + i;
  let auto = 0;
  const FV = { arrayUnion: (...v) => ({ __op: 'union', v }), arrayRemove: (...v) => ({ __op: 'remove', v }), increment: (n) => ({ __op: 'inc', n }) };
  function apply(old, patch, merge) {
    const base = merge && old ? JSON.parse(JSON.stringify(old)) : {};
    const walk = (dst, src) => Object.keys(src).forEach((k) => {
      const v = src[k];
      if (v && v.__op === 'union') dst[k] = Array.from(new Set((dst[k] || []).concat(v.v)));
      else if (v && v.__op === 'remove') dst[k] = (dst[k] || []).filter((x) => !v.v.includes(x));
      else if (v && v.__op === 'inc') dst[k] = (dst[k] || 0) + v.n;
      else if (v && typeof v === 'object' && !Array.isArray(v) && merge && dst[k] && typeof dst[k] === 'object') walk(dst[k], v);
      else dst[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    });
    walk(base, patch);
    return base;
  }
  const snap = (c, i) => { const d = store.get(key(c, i)); return { id: i, exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined), ref: ref(c, i) }; };
  const ref = (c, i) => ({
    id: i, get: async () => snap(c, i),
    set: async (d, o) => { store.set(key(c, i), apply(store.get(key(c, i)), d, !!(o && o.merge))); },
    update: async (d) => { if (!store.has(key(c, i))) throw new Error('no doc'); store.set(key(c, i), apply(store.get(key(c, i)), d, true)); },
    delete: async () => { store.delete(key(c, i)); }
  });
  const db = {
    store, collection: (c) => ({
      doc: (i) => ref(c, i || 'auto' + String(++auto).padStart(16, '0')),
      where: (f, op, v) => ({ limit: () => ({ get: async () => ({ size: 0, docs: Array.from(store.entries()).filter(([k, d]) => k.startsWith(c + '/') && d[f] === v).map(([k]) => snap(c, k.split('/')[1])) }) }) }),
      add: async (d) => { const i = 'auto' + String(++auto).padStart(16, '0'); store.set(key(c, i), d); return ref(c, i); }
    }),
    runTransaction: async (fn) => fn({ get: async (r) => r.get(), set: (r, d, o) => { r.set(d, o); }, update: (r, d) => { r.update(d); } }),
    batch: () => ({ delete() {}, commit: async () => {} })
  };
  return { db, FV };
}

const LESSON = JSON.stringify({ title: 'L', objective: 'o', content: 'x'.repeat(400), keyPoints: ['a'], example: 'e', exercise: { prompt: 'p', hint: 'h', solution: 's' }, flashcards: [{ front: 'f', back: 'b' }],
  quiz: [{ q: 'q1?', options: ['a', 'b'], answer: 0, why: 'w' }, { q: 'q2?', options: ['a', 'b'], answer: 1, why: 'w' }] });
const PLAN = JSON.stringify({ title: 'Karate debutant', summary: 's', outcomes: ['o'], modules: [{ title: 'Bases', lessons: [{ title: 'A1', summary: 's' }, { title: 'A2', summary: 's' }, { title: 'A3', summary: 's' }] }] });

function setup() {
  const { db, FV } = fakeDb();
  const admin = { firestore: { FieldValue: FV } };
  db.store.set('users/stud', { balance: 20 });
  db.store.set('users/ADMIN', { balance: 0 });
  const svc = createAcademyStudy({ db, admin, ADMIN_UID: 'ADMIN', buildWalletTxEntry: (x) => x, push: () => {} });
  process.env.GEMINI_API_KEY = 'k';
  let calls = 0, mode = 'ok';
  globalThis.fetch = async (url, init) => {
    calls++;
    if (mode === 'fail') return { ok: false, status: 500, text: async () => '{}' };
    const sys = JSON.parse(init.body).systemInstruction.parts[0].text;
    const body = /objet JSON/.test(sys) ? (JSON.parse(init.body).contents[0].parts[0].text.startsWith('Crée un parcours') ? PLAN : LESSON) : 'Réponse du tuteur';
    return { ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: body }] } }] }) };
  };
  return { svc, db, calls: () => calls, setMode: (m) => { mode = m; } };
}

test('essai : 2 lecons puis paywall, la 3e lecon n\'appelle pas l\'IA', async () => {
  const t = setup();
  const r = await t.svc.study('stud', { op: 'create_path', domain: 'sport', group: 'karate', topic: 'Kata', level: 'beginner' });
  const id = r.path.id;
  await t.svc.study('stud', { op: 'lesson', pathId: id, lessonId: 'l1_1' });
  await t.svc.study('stud', { op: 'lesson', pathId: id, lessonId: 'l1_2' });
  const before = t.calls();
  await assert.rejects(() => t.svc.study('stud', { op: 'lesson', pathId: id, lessonId: 'l1_3' }), /^Error: \[ESSAI\] Ton essai gratuit est terminé/);
  assert.strictEqual(t.calls(), before);
  // une lecon deja ouverte reste lisible gratuitement
  const again = await t.svc.study('stud', { op: 'lesson', pathId: id, lessonId: 'l1_1' });
  assert.strictEqual(again.cached, true);
  const cfg = await t.svc.study('stud', { op: 'config' });
  assert.strictEqual(cfg.trial.lessons.used, 2); assert.strictEqual(cfg.trial.lessons.max, 2);
  assert.deepStrictEqual(cfg.plus.offers.map((o) => o.plan), ['month', 'quarter', 'semester', 'year']);
});

test('essai : 5 questions au tuteur, la 6e est refusee ; un echec de l\'IA ne consomme rien', async () => {
  const t = setup();
  const r = await t.svc.study('stud', { op: 'create_path', domain: 'sport', group: 'yoga', topic: 'Respiration', level: 'beginner' });
  t.setMode('fail');
  await assert.rejects(() => t.svc.study('stud', { op: 'tutor', pathId: r.path.id, message: 'Bonjour ?' }));
  t.setMode('ok');
  for (let i = 0; i < 5; i++) await t.svc.study('stud', { op: 'tutor', pathId: r.path.id, message: 'Question ' + i });
  await assert.rejects(() => t.svc.study('stud', { op: 'tutor', pathId: r.path.id, message: 'Une de trop' }), /\[ESSAI\].*questions offertes/);
});

test('abonnement : 3 mois debite le portefeuille, credite l\'admin, leve la limite et donne 90 jours', async () => {
  const t = setup();
  const r = await t.svc.study('stud', { op: 'create_path', domain: 'sport', group: 'karate', topic: 'Kata', level: 'beginner' });
  await t.svc.study('stud', { op: 'lesson', pathId: r.path.id, lessonId: 'l1_1' });
  await t.svc.study('stud', { op: 'lesson', pathId: r.path.id, lessonId: 'l1_2' });
  const s = await t.svc.study('stud', { op: 'subscribe', plan: 'quarter' });
  assert.strictEqual(s.newBalance, 7);
  assert.strictEqual(t.db.store.get('users/ADMIN').balance, 13);
  const days = Math.round((s.untilMs - Date.now()) / 86400000);
  assert.ok(days >= 89 && days <= 90, String(days));
  await t.svc.study('stud', { op: 'lesson', pathId: r.path.id, lessonId: 'l1_3' });
  await assert.rejects(() => t.svc.study('stud', { op: 'subscribe', plan: 'year' }), /Solde insuffisant/);
});

test('notes et revision : sans IA et sans quota', async () => {
  const t = setup();
  const r = await t.svc.study('stud', { op: 'create_path', domain: 'sport', group: 'yoga', topic: 'Respiration', level: 'beginner' });
  await t.svc.study('stud', { op: 'lesson', pathId: r.path.id, lessonId: 'l1_1' });
  const n0 = t.calls();
  await t.svc.study('stud', { op: 'note', pathId: r.path.id, lessonId: 'l1_1', text: 'Mon résumé' });
  const l = await t.svc.study('stud', { op: 'lesson', pathId: r.path.id, lessonId: 'l1_1' });
  assert.strictEqual(l.note, 'Mon résumé');
  const rv = await t.svc.study('stud', { op: 'review', pathId: r.path.id });
  assert.strictEqual(rv.cards.length, 1);
  assert.strictEqual(t.calls(), n0);
});
