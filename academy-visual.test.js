// Académie : leçons illustrées et parlées (academy-visual.js, academy-hub.js, api/_lib/academy-ai.js, academy-ui.css, vercel.json).
// Règles testées : le serveur nettoie le schéma, la photo et les titres d'images AVANT stockage ; le téléphone ne dessine que des types connus,
// échappe tout texte, n'accepte que des miniatures Wikimedia en https ; textes complets en 8 langues ; branchements dans la leçon.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const A = require('../api/_lib/academy-ai');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const LANGS = ['fr', 'en', 'es', 'it', 'pt', 'de', 'sw', 'ln'];

function loadVisual(lang) {
  const listeners = [];
  const ctx = { setTimeout, clearTimeout, console, currentLang: lang || 'fr', Promise, Date, Math, JSON, Object, Array, String, Number, RegExp };
  ctx.window = ctx;
  ctx.localStorage = { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = String(v); } };
  ctx.navigator = {};
  ctx.document = {
    hidden: false, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({}),
    addEventListener: (n, f) => listeners.push([n, f]), documentElement: { classList: { add() {}, remove() {} } }, body: {}
  };
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(read('academy-visual.js'), ctx, { filename: 'academy-visual.js' });
  return ctx.CNVisual;
}

/* ---------------------------- Serveur ---------------------------- */
test('serveur : titre Wikipédia accepté seulement s’il est simple (jamais de balise ni de lien)', () => {
  const ok = A.sanitizeExtras({ speechLang: 'es-ES', vocabulary: [
    { term: 'manzana', meaning: 'pomme', img: 'Apple' }, { term: 'monte', meaning: 'mont', img: 'Mount Kilimanjaro' },
    { term: 'x', meaning: 'y', img: '<script>alert(1)</script>' }, { term: 'z', meaning: 'w', img: 'https://evil.example/a.png' }, { term: 'k', meaning: 'v', img: 'Saint-Jean (Québec)' }
  ] });
  assert.deepStrictEqual(ok.vocabulary.map((v) => v.img), ['Apple', 'Mount Kilimanjaro', '', '', 'Saint-Jean (Québec)']);
  const vis = A.sanitizeExtras({ visual: { query: 'Photosynthesis', caption: 'Une feuille' } }).visual;
  assert.deepStrictEqual(vis, { query: 'Photosynthesis', caption: 'Une feuille' });
  assert.strictEqual(A.sanitizeExtras({ visual: { query: '<img src=x onerror=1>' } }).visual, null);
  assert.strictEqual(A.sanitizeExtras({ visual: 'Photosynthesis' }).visual, null);
});

test('serveur : schéma — types connus, 3 repères minimum (2 pour comparer), 6 au plus, textes courts', () => {
  const nodes = (n) => Array.from({ length: n }, (_, i) => ({ label: 'Étape ' + i, detail: 'Détail ' + i }));
  assert.strictEqual(A.sanitizeExtras({ diagram: { type: 'hack', nodes: nodes(4) } }).diagram, null);
  assert.strictEqual(A.sanitizeExtras({ diagram: { type: 'steps', nodes: nodes(2) } }).diagram, null);
  assert.strictEqual(A.sanitizeExtras({ diagram: { type: 'steps', nodes: [{ label: '', detail: 'x' }, { label: 'a' }, { label: 'b' }] } }).diagram, null);
  assert.strictEqual(A.sanitizeExtras({ diagram: null }).diagram, null);
  const many = A.sanitizeExtras({ diagram: { type: 'cycle', title: 'Cycle', nodes: nodes(9) } }).diagram;
  assert.strictEqual(many.nodes.length, 6);
  const cmp = A.sanitizeExtras({ diagram: { type: 'compare', nodes: nodes(5) } }).diagram;
  assert.strictEqual(cmp.nodes.length, 2);
  const long = A.sanitizeExtras({ diagram: { type: 'tree', title: 'T'.repeat(500), nodes: [{ label: 'L'.repeat(300), detail: 'D'.repeat(900) }, { label: 'b' }, { label: 'c' }] } }).diagram;
  assert.ok(long.title.length <= 90 && long.nodes[0].label.length <= 60 && long.nodes[0].detail.length <= 160);
});

test('serveur : la leçon fusionnée garde schéma et photo ; l’invite les demande', () => {
  const extras = A.sanitizeExtras({ speechLang: 'es-ES', diagram: { type: 'steps', nodes: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }, visual: { query: 'Spain', caption: 'c' } });
  const merged = A.mergeLesson({ title: 'x', content: 'y' }, extras);
  assert.ok(merged.diagram && merged.diagram.type === 'steps');
  assert.deepStrictEqual(merged.visual, { query: 'Spain', caption: 'c' });
  const bare = A.mergeLesson({ title: 'x', content: 'y' }, null);
  assert.ok(!bare.diagram || bare.diagram === null);
  const prompt = A.lessonExtrasPrompt({ title: 'Cours', level: 'beginner', lang: 'fr', domain: 'language' }, { title: 'M' }, { title: 'L', summary: 's' }, { lang: 'fr' }).user;
  assert.match(prompt, /diagram/);
  assert.match(prompt, /visual/);
  assert.match(prompt, /"img"/);
  assert.match(prompt, /Wikipédia/);
});

/* ---------------------------- Textes ---------------------------- */
test('textes : 8 langues, mêmes clés, mêmes variables, sans emoji ni dégradé', () => {
  const V = loadVisual('fr');
  const ref = Object.keys(V.DICT.fr).sort();
  LANGS.forEach((l) => {
    assert.ok(V.DICT[l], 'langue ' + l);
    assert.deepStrictEqual(Object.keys(V.DICT[l]).sort(), ref, 'clés de ' + l);
    ref.forEach((k) => {
      const vars = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join();
      assert.strictEqual(vars(V.DICT[l][k]), vars(V.DICT.fr[k]), l + '.' + k + ' : variables');
      assert.ok(String(V.DICT[l][k]).trim().length > 0, l + '.' + k + ' vide');
      assert.doesNotMatch(V.DICT[l][k], /\p{Extended_Pictographic}/u, l + '.' + k + ' : emoji');
    });
  });
  assert.strictEqual(V.T('part', { a: 3, b: 9 }), '3 sur 9');
  const en = loadVisual('en');
  assert.strictEqual(en.T('part', { a: 3, b: 9 }), '3 of 9');
});

/* ---------------------------- Schémas ---------------------------- */
test('schémas : chaque type produit un SVG valide, texte échappé, aucune balise venant des données', () => {
  const V = loadVisual('fr');
  const evil = '<img src=x onerror=alert(1)>"\'&';
  const mk = (type, n) => ({ type, title: 'Titre ' + evil, nodes: Array.from({ length: n }, (_, i) => ({ label: 'Repère ' + i + ' ' + evil, detail: 'Un détail assez long pour passer à la ligne ; deuxième point ; troisième point' })) });
  [['steps', 4], ['timeline', 5], ['cycle', 3], ['cycle', 6], ['compare', 2], ['tree', 5], ['tree', 3]].forEach(([t, n]) => {
    const svg = V.diagramSvg(mk(t, n));
    assert.match(svg, /^<svg class="cnv-svg" viewBox="0 0 340 \d+"/, t);
    assert.match(svg, /role="img"/);
    assert.doesNotMatch(svg, /<img|<script|onerror=alert\(1\)>|javascript:/i, t + ' : balise brute');
    assert.match(svg, /&lt;img/, t + ' : le texte est échappé');
    const h = +/viewBox="0 0 340 (\d+)"/.exec(svg)[1];
    assert.ok(h > 60 && h < 1400, t + ' hauteur ' + h);
  });
  assert.strictEqual(V.diagramSvg({ type: 'inconnu', nodes: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }), '');
  assert.strictEqual(V.diagramSvg({ type: 'steps', nodes: [{ label: 'a' }] }), '');
  assert.strictEqual(V.diagramSvg(null), '');
  assert.strictEqual(V.diagramSvg({ type: 'compare', nodes: [{ label: 'a' }, { label: 'b' }] }).startsWith('<svg'), true);
});

test('schémas : texte coupé proprement, anciennes leçons = carte des points essentiels', () => {
  const V = loadVisual('fr');
  const lines = V.wrap('Un très long texte qui doit être découpé en plusieurs lignes sans jamais dépasser la largeur prévue', 20, 3);
  assert.ok(lines.length <= 3 && lines.every((l) => l.length <= 21));
  assert.match(lines[2], /…$/);
  assert.deepStrictEqual(V.wrap('Supercalifragilisticexpialidocious', 10, 5).every((l) => l.length <= 10), true);
  assert.strictEqual(V.autoDiagram({ title: 'T', keyPoints: ['a', 'b'] }), null);
  const d = V.autoDiagram({ title: 'T', keyPoints: ['**a** un', 'b `deux`', 'c', 'd', 'e', 'f', 'g'] });
  assert.strictEqual(d.type, 'tree');
  assert.strictEqual(d.nodes.length, 6);
  assert.strictEqual(d.nodes[0].label, 'a un');
  assert.ok(V.diagramSvg(d, { single: true }).startsWith('<svg'));
});

/* ---------------------------- Photos ---------------------------- */
test('photos : seulement des miniatures Wikimedia en https, jamais une page d’homonymie', () => {
  const V = loadVisual('fr');
  assert.strictEqual(V.okThumb('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Apple.jpg/560px-Apple.jpg'), true);
  assert.strictEqual(V.okThumb('http://upload.wikimedia.org/a/b.jpg'), false);
  assert.strictEqual(V.okThumb('https://evil.example/upload.wikimedia.org/a.jpg'), false);
  assert.strictEqual(V.okThumb('https://upload.wikimedia.org.evil.example/a.jpg'), false);
  assert.strictEqual(V.okThumb('https://upload.wikimedia.org/a/b.jpg" onerror="x'), false);
  assert.strictEqual(V.okPage('https://en.wikipedia.org/wiki/Apple', 'en'), true);
  assert.strictEqual(V.okPage('https://fr.wikipedia.org/wiki/Apple', 'en'), false);
  assert.strictEqual(V.okPage('javascript:alert(1)', 'en'), false);
  const th = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Apple.jpg/560px-Apple.jpg';
  const page = (o) => Object.assign({ title: 'Apple', fullurl: 'https://en.wikipedia.org/wiki/Apple', thumbnail: { source: th } }, o);
  assert.strictEqual(V.parseWiki({ query: { pages: [page()] } }, 'apple', 'en', false).title, 'Apple');
  assert.strictEqual(V.parseWiki({ query: { pages: [page({ pageprops: { disambiguation: '' } })] } }, 'apple', 'en', false), null);
  assert.strictEqual(V.parseWiki({ query: { pages: [page({ missing: true })] } }, 'apple', 'en', false), null);
  assert.strictEqual(V.parseWiki({ query: { pages: [page({ thumbnail: { source: 'https://evil.example/x.jpg' } })] } }, 'apple', 'en', false), null);
  assert.strictEqual(V.parseWiki({ query: { pages: [page({ title: 'Banana' })] } }, 'apple', 'en', false), null, 'page sans rapport refusée');
  // strict : le titre (ou la redirection) doit être exactement le mot
  assert.strictEqual(V.parseWiki({ query: { pages: [page({ title: 'Course à pied' })] } }, 'courir', 'fr', true), null);
  assert.ok(V.parseWiki({ query: { redirects: [{ from: 'Courir', to: 'Course à pied' }], pages: [page({ title: 'Course à pied', fullurl: 'https://fr.wikipedia.org/wiki/Course_%C3%A0_pied' })] } }, 'courir', 'fr', true));
  assert.strictEqual(V.parseWiki(null, 'a', 'en', false), null);
  assert.strictEqual(V.parseWiki({ query: {} }, 'a', 'en', false), null);
});

/* ---------------------------- Voix ---------------------------- */
test('voix : leçon complète dans l’ordre, « écouter et répéter » = lent, pause, normal, traduction', () => {
  const V = loadVisual('fr');
  const lesson = {
    title: 'Saluer', objective: 'Apprendre à saluer.', content: '## Salutations\nOn dit **hola**.\n\n| a | b |\n|---|---|\n\n```\ncode()\n```\n## Autre\n- un point', keyPoints: ['Point un', 'Point deux'], summary: 'Fini.', speechLang: 'es-ES',
    vocabulary: [{ term: 'manzana', meaning: 'pomme', phonetic: 'man-sa-na' }], phrases: [{ text: 'Me llamo Ana.', translation: 'Je m’appelle Ana.', phonetic: 'me ya-mo' }]
  };
  const items = V.lessonItems(lesson);
  assert.deepStrictEqual(Array.from(items.map((i) => i.kind).slice(0, 3)), ['title', 'obj', 'course']);
  assert.ok(items.some((i) => i.kind === 'key') && items.some((i) => i.kind === 'words') && items.some((i) => i.kind === 'phr') && items[items.length - 1].kind === 'sum');
  assert.ok(!items.some((i) => /code\(\)|\|/.test(i.show)), 'ni tableau ni code lus à voix haute');
  assert.ok(!items.some((i) => /\*\*|##/.test(i.show)), 'pas de symboles Markdown lus');
  const words = items.find((i) => i.kind === 'words');
  assert.strictEqual(words.parts[0].tag, 'es-ES');
  assert.strictEqual(words.parts[1].tag, 'fr-FR');
  const prac = V.practiceItems(lesson);
  assert.strictEqual(prac.length, 2);
  const ph = prac[0].parts;
  assert.strictEqual(ph[0].rate, 0.7);
  assert.ok(ph[1].pause >= 2200 && ph[1].repeat === true);
  assert.strictEqual(ph[2].rate, 0.95);
  assert.strictEqual(ph[3].tag, 'fr-FR');
  assert.strictEqual(ph[3].text, 'Je m’appelle Ana.');
  assert.strictEqual(V.practiceItems({ title: 'Sans langue', vocabulary: [{ term: 'a', meaning: 'b' }] }).length, 0, 'pas d’exercice de prononciation sans langue cible');
  assert.ok(V.sentences('Une phrase. Une autre ! Et encore ? Oui.', 30).every((s) => s.length <= 90));
});

/* ---------------------------- Branchements ---------------------------- */
test('leçon : le hub charge le module à la demande, l’hydrate, et arrête la voix à chaque changement d’écran', () => {
  const hub = read('academy-hub.js');
  assert.match(hub, /function withVisual\(cb\)/);
  assert.match(hub, /academy-visual\.js\?v=/);
  assert.match(hub, /Vz\.hydrate\(box\(\), \{ lesson: l, scope: 'fs' \}\)/);
  assert.match(hub, /Vz\.hydrate\(bb, \{ lesson: e\.lesson, scope: 'sheet' \}\)/);
  assert.match(hub, /Vz\.tutorChips\(ov\)/);
  assert.match(hub, /window\.CNVisual\.playLesson\(lessonObj/);
  assert.match(hub, /function stopSpeech\(\) \{[^\n]*CNVisual\.stop\(\)/);
  assert.match(hub, /function fsClose\(viaPop\) \{\n\s+if \(!S\.fs\) return;\n\s+stopSpeech\(\);/);
  assert.match(hub, /CNVisual\.stop\('sheet'\)/);
  assert.match(hub, /<details class=\\"cnv-adv\\">|<details class="cnv-adv">/);
  assert.match(hub, /advT: 'Options avancées'/);
  assert.match(hub, /advT: 'Advanced options'/);
});

test('leçon : module sans emoji, sans HTML venant de l’IA, sans écriture serveur, sans caractère invisible', () => {
  const src = read('academy-visual.js');
  assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, 'aucun emoji dans le module');
  assert.doesNotMatch(src, /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/, 'aucun caractère invisible brut');
  assert.doesNotMatch(src, /\beval\(|new Function|document\.write/);
  // Chaque injection de HTML ne contient que : du texte fixe, esc(...), ico(...), imgTag(...), T(...), le schéma déjà échappé (d.svg) ou playerHtml().
  const sites = src.match(/(?:innerHTML\s*=|insertAdjacentHTML\([^,]+,)\s*[^;]+;/g) || [];
  assert.ok(sites.length >= 8, 'les points d’injection sont bien repérés');
  sites.forEach((site) => {
    let rhs = site.replace(/^(?:innerHTML\s*=|insertAdjacentHTML\([^,]+,)\s*/, '').replace(/;$/, '');
    if (/^insertAdjacentHTML/.test(site)) rhs = rhs.replace(/\)$/, '');
    rhs = rhs.replace(/'(?:[^'\\]|\\.)*'/g, "''");
    let prev;
    do { prev = rhs; rhs = rhs.replace(/\b(?:esc|ico|imgTag|T)\((?:[^()]|\([^()]*\))*\)/g, 'OK'); } while (rhs !== prev);
    rhs = rhs.replace(/\bd\.svg\b|\bplayerHtml\(\)|\bauto\b/g, 'OK');
    assert.match(rhs.replace(/OK|''|[\s+()?:,]/g, ''), /^$/, 'injection non sûre : ' + site.slice(0, 120));
  });
  assert.doesNotMatch(src, /method:\s*'POST'|firebase|firestore|db\./i, 'le module ne parle à aucun serveur de l’application');
  assert.match(src, /referrerPolicy: 'no-referrer'/);
  assert.match(src, /credentials: 'omit'/);
  assert.match(src, /pilicense: 'free'/);
  const css = read('academy-ui.css');
  ['.cnv-player', '.cnv-svg', '.cnv-fig', '.cnv-vimg', '.cnv-adv', '.cnv-qchips'].forEach((c) => assert.ok(css.includes(c), c));
  assert.doesNotMatch(css, /gradient\(/i, 'aucun dégradé');
});

test('leçon : la sécurité du site autorise les 8 Wikipédia (lecture) et les images Wikimedia, rien d’autre', () => {
  const v = JSON.parse(read('vercel.json'));
  const csp = JSON.stringify(v.headers).match(/Content-Security-Policy[^]*?"value":\s*"([^"]+)"/)[1];
  const dir = (n) => (csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(n + ' ')) || '').split(/\s+/);
  const conn = dir('connect-src');
  LANGS.forEach((l) => assert.ok(conn.includes('https://' + l + '.wikipedia.org'), 'connect-src ' + l));
  assert.ok(dir('img-src').includes('https://upload.wikimedia.org'));
  assert.ok(!conn.includes('*') && !dir('script-src').includes('*'));
  assert.ok(!/wikipedia/.test(dir('script-src').join(' ')), 'aucun script externe');
});
