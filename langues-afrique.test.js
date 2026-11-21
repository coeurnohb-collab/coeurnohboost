// Kiswahili (sw) et Lingála (ln) : langues africaines ajoutées en version bêta.
// Règle : jamais de texte vide, jamais de clé inventée, jamais d'anglais par surprise — ce qui n'est pas traduit s'affiche en français.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const { makeEnv, allLangSrc, PACKS } = require('./lang-env');
const src = allLangSrc(); // français (translations.js) + les 6 packs de langue (lang-xx.js)

function load() {
  // translations.js (français + moteur) puis les packs, exactement comme le navigateur les reçoit.
  const env = makeEnv({ navigator: 'fr-FR' }).boot();
  PACKS.forEach((l) => env.loadPack(l));
  const api = Object.assign({}, env.api, { SW_CORE: env.ctx.__cnPacks.sw, LN_CORE: env.ctx.__cnPacks.ln });
  return { api, store: env.store };
}

test('langues : sw et ln sont déclarées comme langues prises en charge, et proposées dans les deux sélecteurs', () => {
  const { api } = load();
  assert.deepStrictEqual(Array.from(api.SUPPORTED_LANGS), ['fr', 'en', 'es', 'it', 'pt', 'sw', 'ln']);
  const html = read('index.html');
  for (const l of ['sw', 'ln']) {
    assert.match(html, new RegExp('data-lang="' + l + '" onclick="changeLanguage\\(\'' + l + '\'\\)"'), 'bouton du menu Langue : ' + l);
    assert.match(html, new RegExp('<option value="' + l + '">'), 'liste déroulante de la page d\'accueil : ' + l);
  }
});

test('langues : chaque clé traduite existe en français, n\'est pas vide et garde les mêmes nombres (5 %, 24/7, 2 $…)', () => {
  const { api } = load();
  const fr = api.TRANSLATIONS.fr;
  for (const [name, core] of [['sw', api.SW_CORE], ['ln', api.LN_CORE]]) {
    const keys = Object.keys(core);
    assert.ok(keys.length >= 120, name + ' : au moins 120 textes essentiels (' + keys.length + ')');
    for (const k of keys) {
      assert.ok(k in fr, name + ' : clé inconnue du français : ' + k);
      assert.ok(typeof core[k] === 'string' && core[k].trim().length > 0, name + ' : texte vide : ' + k);
      const nums = (s) => Array.from(new Set(String(s).match(/\d+/g) || [])).sort().join(','); // « 24h/24 » et « saa 24 » : même nombre
      assert.strictEqual(nums(core[k]), nums(fr[k]), name + ' : les nombres ont changé dans ' + k + ' : « ' + core[k] + ' » au lieu de « ' + fr[k] + ' »');
      assert.strictEqual((core[k].match(/\{[^}]*\}/g) || []).join(), (fr[k].match(/\{[^}]*\}/g) || []).join(), name + ' : variable {..} différente dans ' + k);
    }
  }
});

test('langues : sw et ln contiennent TOUTES les clés du français et sont vraiment traduites (pas du français collé)', () => {
  const { api } = load();
  const fr = api.TRANSLATIONS.fr;
  for (const l of ['sw', 'ln']) {
    const missing = Object.keys(fr).filter((k) => !(k in api.TRANSLATIONS[l]));
    assert.deepStrictEqual(missing, [], l + ' : clés absentes');
    const empty = Object.keys(fr).filter((k) => !String(api.TRANSLATIONS[l][k] || '').trim());
    assert.deepStrictEqual(empty, [], l + ' : textes vides');
    const same = Object.keys(fr).filter((k) => api.TRANSLATIONS[l][k] === fr[k]).length;
    // Le lingala garde volontairement des mots français courants en RDC (Menu, Solde, Catégorie…) : on limite à 15 %.
    assert.ok(same / Object.keys(fr).length < 0.15, l + ' : trop de textes identiques au français (' + same + ')');
  }
  assert.strictEqual(api.TRANSLATIONS.sw.nav_login, 'Ingia');
  assert.strictEqual(api.TRANSLATIONS.ln.nav_login, 'Kokota');
  assert.notStrictEqual(api.TRANSLATIONS.ln.hn_d_pro, api.TRANSLATIONS.fr.hn_d_pro, 'traduit en lingala (plus de français collé)');
  assert.notStrictEqual(api.TRANSLATIONS.sw.hn_d_pro, api.TRANSLATIONS.fr.hn_d_pro, 'traduit en kiswahili');
});

test('langues : t() — clé traduite dans la langue ; clé ajoutée plus tard (pas encore traduite) = français (jamais anglais) en sw/ln', () => {
  const { api } = load();
  api.TRANSLATIONS.fr.cle_ajoutee_apres = 'Bonjour le monde';
  api.TRANSLATIONS.en.cle_ajoutee_apres = 'Hello world';
  api.setLang('sw'); assert.strictEqual(api.t('nav_register'), 'Fungua akaunti');
  assert.strictEqual(api.t('cle_ajoutee_apres'), 'Bonjour le monde');
  api.setLang('ln'); assert.strictEqual(api.t('wallet_recharge'), 'Tia mbongo →');
  assert.strictEqual(api.t('cle_ajoutee_apres'), 'Bonjour le monde');
  // Les langues existantes ne changent pas : anglais de secours comme avant
  api.setLang('en'); assert.strictEqual(api.t('cle_ajoutee_apres'), 'Hello world');
  api.setLang('es'); assert.strictEqual(api.t('cle_ajoutee_apres'), 'Hello world');
  api.setLang('fr'); assert.strictEqual(api.t('cle_inexistante_xyz'), 'cle_inexistante_xyz');
});

test('langues : la langue du téléphone (sw, ln) est reconnue automatiquement, et le choix enregistré est respecté', () => {
  const a = load();
  a.store.coeurnoh_lang = 'sw';
  assert.strictEqual(a.api.detectLanguage(), 'sw');
  a.store.coeurnoh_lang = 'zz';
  assert.strictEqual(a.api.detectLanguage(), 'fr', 'langue enregistrée inconnue → langue du téléphone (fr)');
});

test('langues : « 5 langues » est devenu « 7 langues » partout (les 5 dictionnaires et la page d\'accueil)', () => {
  // Les tables « texte français affiché → traduction » (__cnPhrases) citent mot pour mot les écrans internes, dont une phrase vraie
  // sur les SITES (« traduction en 5 langues » : fr, en, es, it, pt) : elles ne sont pas des dictionnaires de l'application.
  const sansTables = src.replace(/w\.__cnPhrases\.\w+ = \{[\s\S]*?\n  \};\n/g, '');
  assert.ok(sansTables.length < src.length - 100000, 'les tables de phrases sont bien retirées avant le contrôle');
  assert.doesNotMatch(sansTables, /\b5 (langues|languages|idiomas|lingue)\b/);
  assert.doesNotMatch(read('index.html'), /\b5 langues\b/);
  assert.strictEqual((src.match(/auth_trust_2: "7 /g) || []).length, 5, 'une par langue d\'origine (fr, en, es, it, pt)');
});

test('langues : le menu principal (menu-pro) a ses 159 textes en 7 langues ; si un texte manque, le français (jamais l\'anglais) en sw/ln', () => {
  const src = read('menu-pro.js');
  assert.match(src, /var LANGS = \['fr', 'en', 'es', 'it', 'pt', 'sw', 'ln'\];/);
  assert.match(src, /\(i > 4 \? a\[0\] : a\[1\]\)/);
  const block = src.slice(src.indexOf('  var D = {'), src.indexOf('  function curLang'));
  const rows = [...block.matchAll(/^ {4}(\w+): (\[.*\]),?\s*$/gm)];
  assert.ok(rows.length >= 159, 'au moins 159 textes (' + rows.length + ')');
  for (const [, key, arr] of rows) {
    const a = eval(arr);
    assert.strictEqual(a.length, 7, key + ' : 7 langues attendues (fr, en, es, it, pt, sw, ln)');
    assert.ok(a.every((x) => String(x).trim().length > 0), key + ' : texte vide');
    const vars = (x) => (String(x).match(/\{\w+\}/g) || []).sort().join();
    for (let i = 1; i < 7; i++) assert.strictEqual(vars(a[i]), vars(a[0]), key + ' : variable {..} différente (langue ' + i + ')');
  }
});
