'use strict';
// Écrans internes en Kiswahili et en Lingála : tables « texte français affiché → traduction » (window.__cnPhrases[lang])
// dans lang-sw.js et lang-ln.js, appliquées par le moteur de translations.js sur le texte EXACT affiché.
const test = require('node:test');
const assert = require('node:assert');
const { makeEnv, PACKS, read } = require('./lang-env');

const toks = (s) => (String(s).match(/\{[A-Za-z0-9_]+\}|%[sd]|<\/?[a-zA-Z][^>]*>|&[a-z#0-9]+;/g) || []).sort().join('|');

function phrasesOf(lang) {
  const env = makeEnv({ navigator: 'fr-FR' }).boot();
  PACKS.forEach((l) => env.loadPack(l));
  return { env, ph: (env.ctx.__cnPhrases || {})[lang] };
}

for (const lang of ['sw', 'ln']) {
  test('écrans internes : la table ' + lang + ' est complète, propre et garde les {variables}', () => {
    const { ph } = phrasesOf(lang);
    assert.ok(ph && typeof ph === 'object', 'table présente');
    const keys = Object.keys(ph);
    assert.ok(keys.length >= 2000, 'au moins 2000 textes (' + keys.length + ')');
    let same = 0;
    for (const k of keys) {
      const v = ph[k];
      assert.strictEqual(typeof v, 'string', k);
      assert.ok(v.trim(), 'vide : ' + k);
      assert.strictEqual(toks(v), toks(k), 'variables ou balises différentes : ' + k);
      assert.ok(!/\n/.test(v) || /\n/.test(k), 'retour à la ligne ajouté : ' + k);
      assert.ok(/TODO|XXX|\?\?\?/.test(k) || !/TODO|XXX|\?\?\?/.test(v), 'marqueur ajouté : ' + k);
      if (v.trim() === k.trim()) same++;
    }
    assert.strictEqual(same, 0, 'aucun texte laissé identique au français dans la table');
  });
}

test('écrans internes : un texte français exact affiché dans un écran interne est traduit, rien d\'autre', async () => {
  const { env, ph } = phrasesOf('sw');
  const exact = Object.keys(ph).find((k) => k.indexOf('{') < 0 && k.length > 12 && k.length < 80);
  assert.ok(exact, 'un texte de la table pour le test');
  const mk = (t, tag) => ({ nodeType: 3, nodeValue: t, parentNode: { tagName: tag || 'DIV', closest: () => null } });
  await env.api.changeLanguage('sw');
  const n = mk(exact);
  env.ctx.translateNode(n, 'sw');
  assert.strictEqual(n.nodeValue, ph[exact], 'texte exact traduit');
  const other = mk(exact + ' (autre)');
  env.ctx.translateNode(other, 'sw');
  assert.strictEqual(other.nodeValue, exact + ' (autre)', 'un texte différent n\'est pas touché');
  const script = mk(exact, 'SCRIPT');
  env.ctx.translateNode(script, 'sw');
  assert.strictEqual(script.nodeValue, exact, 'jamais dans un script');
});

test('écrans internes : un texte avec {variables} devient un modèle (« {n} leçons » reconnaît « 12 leçons »)', async () => {
  const env = makeEnv({ navigator: 'fr-FR' }).boot();
  PACKS.forEach((l) => env.loadPack(l));
  env.ctx.__cnPhrases = { sw: { 'Mes parcours': 'Safari zangu', '{a}/{b} leçons': 'Masomo {a}/{b}', 'Actif jusqu\'au {d}': 'Inatumika hadi {d}' } };
  await env.api.changeLanguage('sw');
  const mk = (t) => ({ nodeType: 3, nodeValue: t, parentNode: { tagName: 'DIV', closest: () => null } });
  const cases = [['Mes parcours', 'Safari zangu'], ['3/10 leçons', 'Masomo 3/10'], ["Actif jusqu'au 12/02/2027", 'Inatumika hadi 12/02/2027'], ['Autre texte', 'Autre texte']];
  for (const [fr, want] of cases) {
    const n = mk(fr);
    env.ctx.translateNode(n, 'sw');
    assert.strictEqual(n.nodeValue, want, fr);
  }
});

test('écrans internes : le moteur lit les tables et chaque pack les déclare avant de s\'annoncer', () => {
  const eng = read('translations.js');
  assert.match(eng, /CN_W\.__cnPhrases\[lang\]/);
  assert.match(eng, /function literalTpl\(/);
  for (const l of ['sw', 'ln']) {
    const src = read('lang-' + l + '.js');
    assert.ok(src.indexOf('w.__cnPhrases.' + l + ' = {') > 0 && src.indexOf('w.__cnPhrases.' + l + ' = {') < src.indexOf('w.__cnPackArrived(\'' + l + '\')'), l);
  }
  // Les 5 autres langues gardent leurs dictionnaires propres : pas de table de phrases.
  for (const l of ['en', 'es', 'it', 'pt']) assert.ok(read('lang-' + l + '.js').indexOf('__cnPhrases') < 0, l);
});
