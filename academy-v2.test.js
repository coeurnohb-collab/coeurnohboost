// Académie : nouvelle interface (polices éditoriales, couleurs unies, fichiers de police présents).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const css = read('academy-ui.css');
const v2 = css.slice(css.indexOf('@font-face', css.indexOf('NOUVELLE INTERFACE (v2)')));

test('Académie v2 : polices à empattements déclarées, fichiers présents', () => {
  assert.ok(v2.length > 1000, 'bloc v2 trouvé');
  assert.match(v2, /@font-face\{font-family:'CN Serif';font-style:normal;[^}]*src:url\(cn-serif\.woff2\)/);
  assert.match(v2, /@font-face\{font-family:'CN Serif';font-style:italic;[^}]*src:url\(cn-serif-italic\.woff2\)/);
  ['cn-serif.woff2', 'cn-serif-italic.woff2'].forEach((f) => assert.ok(fs.statSync(path.join(root, f)).size > 10000, f));
  assert.match(v2, /--cnh-serif:'CN Serif'/);
});

test('Académie v2 : aucun dégradé, aucun emoji, limité à l\'Académie', () => {
  assert.doesNotMatch(v2, /gradient/i);
  assert.doesNotMatch(v2, /[\u{1F300}-\u{1FAFF}☀-➿]/u);
  // aucune règle globale (sans #menu-screen-academy, #course-detail, #academy- ou .cnh-)
  const rules = v2.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((r) => r.split('{')[0].trim()).filter((s) => s && !s.startsWith('@') && !s.startsWith('html[') || /^html\[[^\]]*\]\s+\S/.test(s));
  rules.forEach((sel) => sel.split(',').forEach((one) => {
    const o = one.trim();
    if (!o || /^(:root|html\[data-theme="dark"\]|to|from|\d+%)$/.test(o)) return;
    assert.match(o, /#menu-screen-academy|#course-detail|#academy-|\.cnh-/, 'sélecteur hors Académie : ' + o);
  }));
});

test('Académie v2 : le bloc d\'accueil est en couleur unie', () => {
  assert.match(v2, /#menu-screen-academy \.cn-acad-hero\{background:var\(--cnh-hero\)/);
  assert.match(v2, /#course-detail-body\{padding:62px/);
});
