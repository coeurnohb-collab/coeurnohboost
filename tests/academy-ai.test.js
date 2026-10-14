// Tests des regles pures des auto-etudes (api/_lib/academy-ai.js) et du nettoyage des codes promo.
const test = require('node:test');
const assert = require('node:assert');
const A = require('../api/_lib/academy-ai');
const C = require('../api/_lib/academy-coupons');

test('codes promo : la ponctuation, les espaces et les accents sont retires', () => {
  assert.strictEqual(C.normalizeCode('BIENVENUE.10'), 'BIENVENUE10');
  assert.strictEqual(C.normalizeCode(' bienvenue 10 '), 'BIENVENUE10');
  assert.strictEqual(C.normalizeCode('Été-25'), 'ETE25');
  assert.strictEqual(C.normalizeCode('ab'), null);
  assert.strictEqual(C.normalizeCode('A'.repeat(21)), null);
  assert.strictEqual(C.normalizeCode(42), null);
});

test('reglages : valeurs bornees et modele nettoye', () => {
  const c = A.normalizeConfig({ plusPriceMonth: -5, freeLessonsPerDay: 99999, model: 'bad model!', provider: 'x', modelPlus: 'claude-opus-5-5' });
  assert.strictEqual(c.plusPriceMonth, 0);
  assert.strictEqual(c.freeLessonsPerDay, 500);
  assert.strictEqual(c.model, '');
  assert.strictEqual(c.provider, 'auto');
  assert.strictEqual(c.modelPlus, 'claude-opus-5-5');
  assert.deepStrictEqual(A.normalizeConfig(null).freeMaxPaths, A.DEFAULT_CONFIG.freeMaxPaths);
});

test('serie d\'etude : consecutive, meme jour, rupture', () => {
  assert.strictEqual(A.nextStreak(3, '2026-10-12', '2026-10-13'), 4);
  assert.strictEqual(A.nextStreak(3, '2026-10-13', '2026-10-13'), 3);
  assert.strictEqual(A.nextStreak(3, '2026-10-10', '2026-10-13'), 1);
  assert.strictEqual(A.nextStreak(undefined, undefined, '2026-10-13'), 1);
  assert.strictEqual(A.nextStreak(5, '2026-12-31', '2027-01-01'), 6);
});

test('compteurs du jour repartent a zero', () => {
  assert.deepStrictEqual(A.usageToday({ day: '2026-10-12', lessons: 5, tutor: 2, plans: 1 }, '2026-10-13'), { day: '2026-10-13', lessons: 0, tutor: 0, plans: 0 });
  assert.strictEqual(A.usageToday({ day: '2026-10-13', lessons: 5 }, '2026-10-13').lessons, 5);
});

test('entree du parcours : domaine obligatoire, texte nettoye', () => {
  assert.throws(() => A.sanitizePathInput({ domain: 'nope', topic: 'Python' }));
  assert.throws(() => A.sanitizePathInput({ domain: 'tech', topic: ' ' }));
  const r = A.sanitizePathInput({ domain: 'tech', topic: '  Python <script> ', level: 'zzz', hoursPerWeek: 999, lang: 'xx', goal: 'a\u0000b' });
  assert.strictEqual(r.level, 'beginner');
  assert.strictEqual(r.hoursPerWeek, 40);
  assert.strictEqual(r.lang, 'fr');
  assert.ok(!/[<>]/.test(r.topic));
});

test('JSON de l\'IA : texte autour, balises, virgules en trop', () => {
  assert.deepStrictEqual(A.parseJsonLoose('Voici :\n```json\n{"a":1,}\n```'), { a: 1 });
  assert.deepStrictEqual(A.parseJsonLoose('{"a":[1,2,]}'), { a: [1, 2] });
  assert.throws(() => A.parseJsonLoose('pas de json'));
});

const plan = { title: 'Python pour débuter', summary: 'x', outcomes: ['a'], modules: [
  { title: 'Bases', lessons: [{ title: 'Variables', summary: 's' }, { title: 'Boucles', summary: 's' }, { title: 'Fonctions', summary: 's' }, { title: 'Extra', summary: 's' }] },
  { title: 'Projet', lessons: [{ title: 'Mini jeu', summary: 's' }] },
  { title: 'M3', lessons: [{ title: 'Leçon', summary: 's' }] }, { title: 'M4', lessons: [{ title: 'Leçon', summary: 's' }] }, { title: 'M5', lessons: [{ title: 'Leçon', summary: 's' }] }
] };
test('plan : taille limitee selon l\'offre, identifiants generes', () => {
  const free = A.sanitizePlan(plan, A.limitsFor(A.normalizeConfig({}), false));
  assert.strictEqual(free.modules.length, 4);
  assert.strictEqual(free.modules[0].lessons.length, 3);
  assert.strictEqual(free.modules[0].lessons[0].id, 'l1_1');
  const plus = A.sanitizePlan(plan, A.limitsFor(A.normalizeConfig({}), true));
  assert.strictEqual(plus.modules.length, 5);
  assert.strictEqual(plus.modules[0].lessons.length, 4);
  assert.throws(() => A.sanitizePlan({ title: 'ab', modules: [] }, { maxModules: 4, maxLessonsPerModule: 3 }));
});

const lesson = { title: 'T', objective: 'o', content: 'x'.repeat(300), keyPoints: ['a'], example: 'e', exercise: { prompt: 'p', hint: 'h', solution: 's' },
  flashcards: [{ front: 'f', back: 'b' }, { front: '', back: 'b' }],
  quiz: [{ q: 'Question un ?', options: ['a', 'b', 'c'], answer: 1, why: 'parce que' }, { q: 'Question deux ?', options: ['a', 'a'], answer: 0 }, { q: 'Question trois ?', options: ['x', 'y'], answer: 0 }, { q: 'Q4 ?', options: ['x', 'y'], answer: 5 }] };
test('lecon : questions invalides retirees, reponses jamais envoyees a l\'eleve', () => {
  const l = A.sanitizeLesson(lesson);
  assert.strictEqual(l.quiz.length, 2);
  assert.strictEqual(l.flashcards.length, 1);
  const pub = A.publicLesson(l);
  assert.ok(pub.quiz.every((q) => q.answer === undefined && q.why === undefined));
  assert.ok(!JSON.stringify(pub).includes('parce que'));
  assert.throws(() => A.sanitizeLesson({ content: 'court', quiz: [] }));
  assert.throws(() => A.sanitizeLesson(Object.assign({}, lesson, { quiz: [lesson.quiz[0]] })));
});

test('quiz corrige cote serveur', () => {
  const l = A.sanitizeLesson(lesson);
  const g = A.gradeStudyQuiz(l.quiz, [1, 0]);
  assert.strictEqual(g.scorePct, 100);
  assert.strictEqual(g.passed, true);
  const bad = A.gradeStudyQuiz(l.quiz, [0, 1]);
  assert.strictEqual(bad.scorePct, 0);
  assert.deepStrictEqual(bad.review.map((r) => r.ok), [false, false]);
});

test('messages du tuteur : alternance et debut par l\'eleve', () => {
  const out = A.normalizeMessages([{ role: 'assistant', text: 'salut' }, { role: 'user', text: 'a' }, { role: 'user', text: 'b' }, { role: 'assistant', text: 'c' }]);
  assert.deepStrictEqual(out, [{ role: 'user', text: 'a\nb' }, { role: 'assistant', text: 'c' }]);
  assert.strictEqual(A.cleanHistory(Array.from({ length: 30 }, () => ({ role: 'user', text: 'x' }))).length, 8);
});

test('fournisseur : Anthropic prioritaire en mode auto, repli Gemini, aucun sans cle', () => {
  const cfg = A.normalizeConfig({});
  assert.strictEqual(A.pickProvider(cfg, { ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g' }), 'anthropic');
  assert.strictEqual(A.pickProvider(cfg, { GEMINI_API_KEY: 'g' }), 'gemini');
  assert.strictEqual(A.pickProvider(cfg, {}), null);
  assert.strictEqual(A.pickProvider(A.normalizeConfig({ provider: 'gemini' }), { ANTHROPIC_API_KEY: 'a' }), null);
  assert.strictEqual(A.pickModel('gemini', cfg, false, {}), 'gemini-2.5-flash');
  assert.strictEqual(A.pickModel('anthropic', A.normalizeConfig({ modelPlus: 'claude-opus-5-5' }), true, {}), 'claude-opus-5-5');
});

test('appel IA : Anthropic et Gemini, erreurs expliquees', async () => {
  const ok = (json) => async () => ({ ok: true, status: 200, text: async () => JSON.stringify(json) });
  const cfg = A.normalizeConfig({});
  let seen;
  const a = await A.callAI({ cfg, isPlus: false, system: 's', messages: [{ role: 'user', text: 'hi' }], maxTokens: 10, env: { ANTHROPIC_API_KEY: 'k' },
    fetchImpl: async (u, i) => { seen = { u, i }; return ok({ content: [{ type: 'text', text: 'bonjour' }] })(); } });
  assert.strictEqual(a, 'bonjour');
  assert.ok(seen.u.startsWith('https://api.anthropic.com/'));
  assert.strictEqual(JSON.parse(seen.i.body).max_tokens, 10);
  const g = await A.callAI({ cfg, isPlus: false, system: 's', messages: [{ role: 'user', text: 'hi' }], maxTokens: 10, wantJson: true, env: { GEMINI_API_KEY: 'k' },
    fetchImpl: async (u, i) => { seen = { u, i }; return ok({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] })(); } });
  assert.strictEqual(g, '{"a":1}');
  assert.ok(!seen.u.includes('key='), 'la clé ne doit jamais être dans l\'URL');
  await assert.rejects(A.callAI({ cfg, isPlus: false, system: 's', messages: [], maxTokens: 1, env: {} }), /clé d'API manquante/);
  await assert.rejects(A.callAI({ cfg, isPlus: false, system: 's', messages: [], maxTokens: 1, env: { ANTHROPIC_API_KEY: 'k' }, fetchImpl: async () => ({ ok: false, status: 401, text: async () => '{}' }) }), /clé d'API du tuteur est refusée/);
  await assert.rejects(A.callAI({ cfg, isPlus: false, system: 's', messages: [], maxTokens: 1, env: { ANTHROPIC_API_KEY: 'k' }, fetchImpl: async () => ({ ok: false, status: 429, text: async () => '{}' }) }), /sollicité/);
});

test('catalogue : categories > domaines > sujets, identifiants uniques, francais et anglais', () => {
  assert.strictEqual(new Set(A.DOMAIN_IDS).size, A.DOMAINS.length);
  A.DOMAINS.forEach((d) => {
    assert.ok(d.label.fr && d.label.en && d.desc.fr && d.hint, d.id);
    assert.ok(d.groups.length >= 5, d.id);
    assert.strictEqual(new Set(d.groups.map((g) => g.id)).size, d.groups.length, d.id);
    d.groups.forEach((g) => {
      assert.ok(g.label.fr && g.label.en && g.topics.length >= 4, d.id + '/' + g.id);
      assert.strictEqual(new Set(g.topics.map((t) => t.id)).size, g.topics.length, d.id + '/' + g.id);
      g.topics.forEach((t) => assert.ok(t.fr && t.en && t.id));
    });
  });
});

test('catalogue : les langues et la musique sont detaillees comme demande', () => {
  const lang = A.CATALOG.findCategory('languages');
  ['french', 'english', 'spanish', 'portuguese', 'italian'].forEach((id) => assert.ok(A.CATALOG.findGroup('languages', id), id));
  assert.ok(lang.groups.length >= 10);
  const fr = A.CATALOG.findGroup('languages', 'french');
  ['Grammaire', 'Conjugaison et temps verbaux', 'Vocabulaire thématique'].forEach((t) => assert.ok(fr.topics.some((x) => x.fr === t), t));
  const music = A.CATALOG.findGroup('arts', 'music');
  ['Piano', 'Guitare basse', 'Jazz', 'Kompa', 'Salsa', 'Blues', 'Chant et technique vocale'].forEach((t) => assert.ok(music.topics.some((x) => x.fr === t), t));
  assert.ok(A.CATALOG.findGroup('tech', 'cybersecurity') && A.CATALOG.findGroup('tech', 'networking-and-telecoms') && A.CATALOG.findGroup('tech', 'maintenance-and-repair') && A.CATALOG.findGroup('tech', 'artificial-intelligence'));
  assert.ok(A.CATALOG.findCategory('health') && A.CATALOG.findCategory('science'));
});

test('parcours : domaine du catalogue valide, style et niveau CECRL dans la consigne', () => {
  const r = A.sanitizePathInput({ domain: 'languages', group: 'english', topic: 'Anglais : Grammaire', style: 'exam', level: 'advanced' });
  assert.strictEqual(r.group, 'english'); assert.strictEqual(r.groupLabel, 'Anglais'); assert.strictEqual(r.style, 'exam');
  assert.strictEqual(A.sanitizePathInput({ domain: 'languages', group: 'zzz', topic: 'x1' }).group, '');
  assert.strictEqual(A.sanitizePathInput({ domain: 'tech', topic: 'Python', style: 'bad' }).style, 'balanced');
  const pr = A.planPrompt(r, { maxModules: 4, maxLessonsPerModule: 3 });
  assert.ok(/C1-C2/.test(pr.user) && /Anglais/.test(pr.user) && /examen/i.test(pr.user));
});

test('acces par categorie : valeurs sures, payant sans prix retombe sur gratuit', () => {
  const c = A.normalizeConfig({ domainAccess: { tech: { mode: 'paid', price: 4, days: 30 }, arts: { mode: 'paid', price: 0 }, math: { mode: 'plus' }, health: { mode: 'x', price: -3, days: 9999 } }, plusPriceYear: 40 });
  assert.deepStrictEqual([c.domainAccess.tech.mode, c.domainAccess.tech.price, c.domainAccess.tech.days], ['paid', 4, 30]);
  assert.strictEqual(c.domainAccess.arts.mode, 'free');
  assert.strictEqual(c.domainAccess.math.mode, 'plus');
  assert.strictEqual(c.domainAccess.health.mode, 'free'); assert.strictEqual(c.domainAccess.health.days, 365);
  assert.strictEqual(c.domainAccess.languages.mode, 'free'); assert.strictEqual(c.plusPriceYear, 40);
});
