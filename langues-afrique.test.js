// Kiswahili (sw) et Lingála (ln) : langues africaines ajoutées en version bêta.
// Règle : jamais de texte vide, jamais de clé inventée, jamais d'anglais par surprise — ce qui n'est pas traduit s'affiche en français.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const src = read('translations.js');

function load() {
  const store = {};
  const ctx = {
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    navigator: { language: 'fr-FR' },
    document: { body: null, addEventListener() {}, querySelectorAll: () => [], getElementById: () => null, documentElement: {} },
    MutationObserver: function () { this.observe = () => {}; }
  };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__api = { t, TRANSLATIONS, SUPPORTED_LANGS, SW_CORE, LN_CORE, setLang: (l) => { currentLang = l; }, detectLanguage };', ctx);
  return { api: ctx.__api, store };
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

test('langues : sw et ln contiennent TOUTES les clés du français (le reste en français), donc aucun écran vide', () => {
  const { api } = load();
  for (const l of ['sw', 'ln']) {
    const missing = Object.keys(api.TRANSLATIONS.fr).filter((k) => !(k in api.TRANSLATIONS[l]));
    assert.deepStrictEqual(missing, [], l + ' : clés absentes');
  }
  assert.strictEqual(api.TRANSLATIONS.sw.nav_login, 'Ingia');
  assert.strictEqual(api.TRANSLATIONS.ln.nav_login, 'Kokota');
  assert.strictEqual(api.TRANSLATIONS.ln.hn_d_pro, api.TRANSLATIONS.fr.hn_d_pro, 'non traduit en lingala = français');
});

test('langues : t() — clé traduite dans la langue ; clé non traduite ou ajoutée plus tard = français (jamais anglais) en sw/ln', () => {
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
  assert.doesNotMatch(src, /\b5 (langues|languages|idiomas|lingue)\b/);
  assert.doesNotMatch(read('index.html'), /\b5 langues\b/);
  assert.strictEqual((src.match(/auth_trust_2: "7 /g) || []).length, 5, 'une par langue d\'origine (fr, en, es, it, pt)');
});

test('langues : le menu en bas de page (menu-pro) retombe sur le français pour sw/ln, pas sur l\'anglais', () => {
  assert.match(read('menu-pro.js'), /cl === 'sw' \|\| cl === 'ln'\) \? 0 : 1/);
});
