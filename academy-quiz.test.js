const test = require('node:test');
const assert = require('node:assert');
const L = require('../api/_lib/academy-learning');

const qs = [
  { q: 'Capitale de la France ?', options: ['Paris', 'Rome'], answer: 0, why: 'Paris est la capitale.' },
  { q: '2 + 2 ?', options: ['3', '4', '5'], answer: 1 }
];

test('sanitizeQuestions garde l\'explication et la nettoie', () => {
  const r = L.sanitizeQuestions([{ q: 'Question ok', options: ['a', 'b'], answer: 1, why: '  <b>Parce que</b>  ' }]);
  assert.ok(r[0].why.includes('Parce que'));
  assert.ok(!/[<>]/.test(r[0].why));
  assert.strictEqual(L.sanitizeQuestions([{ q: 'Question ok', options: ['a', 'b'], answer: 0 }])[0].why, undefined);
});

test('limites : 20 questions de chapitre, 40 pour l\'examen final', () => {
  const mk = (n) => Array.from({ length: n }, (_, i) => ({ q: 'Question ' + i, options: ['a', 'b'], answer: 0 }));
  assert.strictEqual(L.sanitizeQuestions(mk(20)).length, 20);
  assert.throws(() => L.sanitizeQuestions(mk(21)));
  assert.strictEqual(L.sanitizeQuestions(mk(40), L.MAX_FINAL_QUESTIONS).length, 40);
  assert.throws(() => L.sanitizeQuestions(mk(41), L.MAX_FINAL_QUESTIONS));
});

test('buildReview : bonne reponse revelee seulement quand l\'eleve se trompe', () => {
  const rv = L.buildReview(qs, [0, 0]);
  assert.deepStrictEqual(rv[0], { ok: true, why: 'Paris est la capitale.' });
  assert.strictEqual(rv[1].ok, false);
  assert.strictEqual(rv[1].answer, 1);
  assert.strictEqual(rv[0].answer, undefined);
});

test('certificat : examen final requis seulement s\'il existe', () => {
  const base = { chapterIds: ['a'], completed: ['a'], quizChapterIds: ['a'], scores: { a: 90 } };
  assert.strictEqual(L.certEligibility(base).eligible, true);
  assert.strictEqual(L.certEligibility({ ...base, finalExists: true, finalScore: null }).eligible, false);
  assert.strictEqual(L.certEligibility({ ...base, finalExists: true, finalScore: 69 }).eligible, false);
  assert.strictEqual(L.certEligibility({ ...base, finalExists: true, finalScore: 70 }).eligible, true);
});
