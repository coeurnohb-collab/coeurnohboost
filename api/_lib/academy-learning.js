// api/_lib/academy-learning.js
// Regles PURES de l'Academie : quiz, certificats, packs, documents.
// Aucun acces base de donnees ici (facile a tester). Dans /_lib : ce n'est PAS une fonction serverless.

const PASS_MARK = 70;                 // % minimum pour valider un quiz
const MAX_QUESTIONS = 20;
const MAX_FINAL_QUESTIONS = 40;      // examen final du cours
const FINAL_KEY = 'final';
const MAX_CERT_PRICE = 50;            // $ maximum pour un certificat payant
const PACK_MIN_COURSES = 2;
const PACK_MAX_COURSES = 10;
const MAX_PACKS_PER_OWNER = 10;
const MAX_RESOURCES_PER_COURSE = 30;
const CLOUDINARY_CLOUD = 'aqe4fxh4';

const r2 = (x) => Math.round(x * 100) / 100;

const isItemId = (v) => typeof v === 'string' && /^[A-Za-z0-9]{10,40}$/.test(v);
const isChapterId = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v);

function sanitizeQuestions(raw, max) {
  const limit = max || MAX_QUESTIONS;
  if (!Array.isArray(raw)) throw new Error('Questions invalides.');
  if (raw.length > limit) throw new Error(`Maximum ${limit} questions par quiz.`);
  return raw.map((x, i) => {
    const n = i + 1;
    const q = typeof x.q === 'string' ? x.q.trim() : '';
    if (q.length < 3 || q.length > 200) throw new Error(`Question ${n} : entre 3 et 200 caractères.`);
    if (!Array.isArray(x.options) || x.options.length < 2 || x.options.length > 4) throw new Error(`Question ${n} : entre 2 et 4 réponses.`);
    const options = x.options.map((o) => (typeof o === 'string' ? o.trim() : ''));
    if (options.some((o) => o.length < 1 || o.length > 120)) throw new Error(`Question ${n} : chaque réponse doit faire entre 1 et 120 caractères.`);
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) throw new Error(`Question ${n} : deux réponses sont identiques.`);
    const answer = Number(x.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw new Error(`Question ${n} : choisis la bonne réponse.`);
    const why = typeof x.why === 'string' ? x.why.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 300) : '';
    return why ? { q, options, answer, why } : { q, options, answer };
  });
}

// Correction detaillee : l'explication est toujours donnee ; la bonne reponse seulement quand l'eleve s'est trompe.
function buildReview(questions, answers) {
  const given = Array.isArray(answers) ? answers : [];
  return questions.map((qu, i) => {
    const ok = Number.isInteger(given[i]) && given[i] === qu.answer;
    return ok ? { ok: true, why: qu.why || '' } : { ok: false, answer: qu.answer, why: qu.why || '' };
  });
}

function gradeQuiz(questions, answers) {
  const total = questions.length;
  const given = Array.isArray(answers) ? answers : [];
  const wrong = [];
  let correct = 0;
  questions.forEach((qu, i) => {
    if (Number.isInteger(given[i]) && given[i] === qu.answer) correct++; else wrong.push(i);
  });
  const scorePct = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, scorePct, wrong, passed: total > 0 && scorePct >= PASS_MARK };
}

// Eligibilite au certificat : tous les chapitres termines ET tous les quiz reussis.
function certEligibility({ chapterIds, completed, quizChapterIds, scores, finalExists, finalScore }) {
  const done = new Set(completed || []);
  const chaptersTotal = chapterIds.length;
  const chaptersDone = chapterIds.filter((id) => done.has(id)).length;
  const sc = scores || {};
  const quizzesTotal = quizChapterIds.length;
  const quizzesPassed = quizChapterIds.filter((id) => Number(sc[id]) >= PASS_MARK).length;
  const quizAvg = quizzesTotal ? Math.round(quizChapterIds.reduce((s, id) => s + Number(sc[id] || 0), 0) / quizzesTotal) : null;
  const finalPassed = !finalExists || Number(finalScore) >= PASS_MARK;
  return {
    chaptersDone, chaptersTotal, quizzesPassed, quizzesTotal, quizAvg,
    finalExists: !!finalExists, finalScore: finalScore == null ? null : Number(finalScore), finalPassed,
    eligible: chaptersTotal > 0 && chaptersDone === chaptersTotal && quizzesPassed === quizzesTotal && finalPassed
  };
}

const CERT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sans I, O, 0, 1 (pas de confusion)
function makeCertCode(randomBytes) {
  const bytes = randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += CERT_ALPHABET[bytes[i] % CERT_ALPHABET.length];
  return `CNU-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
function normalizeCertCode(input) {
  if (typeof input !== 'string') return null;
  const c = input.trim().toUpperCase().replace(/\s+/g, '');
  return /^CNU-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(c) ? c : null;
}
function cleanCertPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_CERT_PRICE, r2(n));
}

// Partage d'un prix de pack entre les cours, au prorata de leur prix. La somme est EXACTEMENT le prix.
function allocatePack(price, coursePrices) {
  const total = coursePrices.reduce((s, p) => s + p, 0);
  let left = r2(price);
  return coursePrices.map((p, i) => {
    if (i === coursePrices.length - 1) return r2(left);
    const part = r2(price * p / total);
    left = r2(left - part);
    return part;
  });
}

function sanitizePackInput({ title, courseIds, packPrice }) {
  const t = typeof title === 'string' ? title.trim() : '';
  if (t.length < 3 || t.length > 60) throw new Error('Le titre du pack doit faire entre 3 et 60 caractères.');
  if (!Array.isArray(courseIds) || courseIds.some((c) => !isItemId(c))) throw new Error('Cours invalides.');
  const ids = Array.from(new Set(courseIds));
  if (ids.length < PACK_MIN_COURSES || ids.length > PACK_MAX_COURSES) throw new Error(`Un pack contient entre ${PACK_MIN_COURSES} et ${PACK_MAX_COURSES} cours.`);
  const price = r2(Number(packPrice));
  if (!Number.isFinite(price) || price < 1) throw new Error('Le prix du pack doit être d\'au moins 1 $.');
  return { title: t, courseIds: ids, packPrice: price };
}

function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.length < 600 && url.startsWith(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/`);
}
function cleanFileName(name) {
  const n = typeof name === 'string' ? name.replace(/[\u0000-\u001f<>]/g, '').trim() : '';
  if (n.length < 1 || n.length > 120) throw new Error('Nom de document invalide.');
  return n;
}

module.exports = {
  PASS_MARK, MAX_QUESTIONS, MAX_FINAL_QUESTIONS, FINAL_KEY, buildReview, MAX_CERT_PRICE, PACK_MIN_COURSES, PACK_MAX_COURSES, MAX_PACKS_PER_OWNER, MAX_RESOURCES_PER_COURSE,
  isItemId, isChapterId, sanitizeQuestions, gradeQuiz, certEligibility, makeCertCode, normalizeCertCode, cleanCertPrice,
  allocatePack, sanitizePackInput, isCloudinaryUrl, cleanFileName
};
