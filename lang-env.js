// Petit outil de test (ce n'est PAS un test : le nom ne finit pas par .test.js).
// Il fait tourner translations.js + les packs de langue dans un bac à sable avec un faux navigateur :
// faux stockage, faux document, fausse horloge, faux téléchargement des fichiers lang-xx.js (réussi ou en échec).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const PACKS = ['en', 'es', 'it', 'pt', 'sw', 'ln'];

/* Tout le texte des 5 langues complètes (français + 4 packs) : pour les tests qui comptent des clés par langue. */
function langSrc() { return ['translations.js', 'lang-en.js', 'lang-es.js', 'lang-it.js', 'lang-pt.js'].map(read).join('\n'); }
/* Tout le texte des 7 langues. */
function allLangSrc() { return ['translations.js'].concat(PACKS.map((l) => 'lang-' + l + '.js')).map(read).join('\n'); }

class El {
  constructor(attrs, tag) {
    this.attrs = Object.assign({}, attrs); this.tag = tag || 'div'; this.textContent = ''; this.value = ''; this.dataset = {};
    const cls = (this._cls = new Set());
    this.classList = { toggle: (c, on) => { (on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c); }, contains: (c) => cls.has(c), add: (c) => cls.add(c), remove: (c) => cls.delete(c) };
  }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  hasAttribute(k) { return k in this.attrs; }
}

/* opts.lang       : langue enregistrée dans le stockage (sinon aucune)
   opts.navigator  : navigator.language
   opts.network    : (lang, script, env) => 'ok' | 'fail' | 'hang'  — ce que fait le « réseau » quand un pack est demandé
   opts.packsFirst : exécuter les packs AVANT translations.js (comme quand index.html les demande très tôt)
   opts.packs      : liste des packs déjà arrivés avant le moteur (avec packsFirst) */
function makeEnv(opts) {
  opts = opts || {};
  const store = {};
  if (opts.lang) store.coeurnoh_lang = opts.lang;
  const nodes = [];
  const sel = new El({}, 'select'); sel.value = 'fr';
  const buttons = ['fr', 'en', 'es', 'it', 'pt', 'sw', 'ln'].map((l) => { const b = new El({}, 'button'); b.dataset.lang = l; return b; });
  // i18n(clé) = texte ; i18n(clé, true) = placeholder ; i18n(clé, 'title' | 'aria-label' | 'alt' | 'placeholder') = cet attribut
  const i18n = (key, attr) => { const a = attr === true ? 'placeholder' : attr; const e = new El(a ? { ['data-i18n-' + a]: key } : { 'data-i18n': key }); nodes.push(e); return e; };
  const requested = []; // fichiers demandés
  const toasts = [];
  const listeners = {};
  let now = 0, seq = 0, timers = [];
  const doc = {
    body: null, documentElement: { lang: 'fr' },
    addEventListener() {},
    getElementById: (id) => (id === 'lang-select' ? sel : (id === 'auth-modal' ? (opts.authModal || null) : null)),
    querySelectorAll: (q) => {
      const m = /^\[([a-z0-9-]+)\]$/.exec(q); // [data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label], [data-i18n-alt]
      if (m) return nodes.filter((n) => n.hasAttribute(m[1]));
      if (q === '.lang-choice') return buttons;
      return [];
    },
    createElement: (tag) => new El({}, tag),
    head: { appendChild: (s) => { requested.push(s.src); env.onScript(s); } }
  };
  const ctx = {
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    navigator: { language: opts.navigator !== undefined ? opts.navigator : 'fr-FR' },
    document: doc,
    location: opts.location,
    MutationObserver: function () { this.observe = () => {}; },
    showToast: (m, type) => { toasts.push({ m, type }); },
    setTimeout: (fn, ms) => { const id = ++seq; timers.push({ id, fn, due: now + (ms || 0) }); return id; },
    clearTimeout: (id) => { timers = timers.filter((t) => t.id !== id); },
    CustomEvent: function (name, init) { this.type = name; this.detail = init && init.detail; },
    addEventListener: (n, fn) => { (listeners[n] = listeners[n] || []).push(fn); },
    removeEventListener: (n, fn) => { listeners[n] = (listeners[n] || []).filter((f) => f !== fn); },
    dispatchEvent: (e) => { (listeners[e.type] || []).slice().forEach((f) => f(e)); (env.events = env.events || []).push(e); return true; }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const env = {
    ctx, store, nodes, sel, buttons, requested, toasts, i18n, events: [],
    run: (code) => vm.runInContext(code, ctx),
    fire: (name) => { (listeners[name] || []).slice().forEach((f) => f({ type: name })); },
    advance: (ms) => { // fait avancer la fausse horloge et lance les minuteries échues
      const end = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.due <= end).sort((a, b) => a.due - b.due)[0];
        if (!due) break;
        timers = timers.filter((t) => t.id !== due.id); now = due.due; due.fn();
      }
      now = end;
    },
    loadPack: (l) => vm.runInContext(read('lang-' + l + '.js'), ctx, { filename: 'lang-' + l + '.js' }),
    // comportement du réseau quand le moteur demande un pack (par défaut : le fichier arrive tout de suite)
    onScript: (s) => {
      const m = /lang-([a-z]{2})\.js/.exec(s.src); const l = m && m[1];
      const mode = opts.network ? opts.network(l, s, env) : 'ok';
      if (mode === 'ok') { env.loadPack(l); if (s.onload) s.onload(); }
      else if (mode === 'fail') { if (s.onerror) s.onerror(); }
      // 'hang' : rien ne se passe ; le test décide plus tard (env.pending.push)
      else if (mode === 'hang') (env.pending = env.pending || []).push({ l, s });
    }
  };
  const API = ';this.__api = { TRANSLATIONS, SUPPORTED_LANGS, t, applyTranslations, changeLanguage, addTranslation, loadLangPack, onLangReady, langReady, registerLangPack, detectLanguage, getLang: () => currentLang, setLang: (l) => { currentLang = l; } };';
  env.boot = () => {
    if (opts.packsFirst) (opts.packs || PACKS).forEach((l) => env.loadPack(l));
    env.run(read('translations.js') + API);
    env.api = ctx.__api;
    return env;
  };
  return env;
}

/* Les dictionnaires complets comme avant la découpe : { fr, en, es, it, pt, sw, ln }. */
function loadAllTranslations() {
  const env = makeEnv({}).boot();
  PACKS.forEach((l) => env.loadPack(l));
  return env.api.TRANSLATIONS;
}

module.exports = { read, root, PACKS, langSrc, allLangSrc, makeEnv, loadAllTranslations, El };
