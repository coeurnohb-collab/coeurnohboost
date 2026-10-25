// Intro animée de l'application : visible à l'ouverture, toujours claire (jamais sombre), pas masquée par la feuille de bienvenue.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const proCss = fs.readFileSync(path.join(root, 'pro.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const polish = fs.readFileSync(path.join(root, 'polish.js'), 'utf8');

// Premier script en ligne de index.html = décision « intro complète » ou « voile discret ».
const decision = html.match(/<script>\s*\/\* Ouverture de l'application\.[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g, '');

function open({ lastIntroAgo, navType = 'navigate', resumeAgo, resumeTab = 'home' } = {}) {
  const now = Date.now();
  const ls = {};
  if (lastIntroAgo !== undefined) ls.cn_intro_at = String(now - lastIntroAgo);
  const ss = {};
  if (resumeAgo !== undefined) ss.cn_resume = JSON.stringify({ tab: resumeTab, t: now - resumeAgo });
  const classes = new Set();
  const win = {};
  const sandbox = {
    window: win, Date,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    sessionStorage: { getItem: (k) => (k in ss ? ss[k] : null) },
    performance: { getEntriesByType: () => [{ type: navType }] },
    document: { documentElement: { classList: { add: (c) => classes.add(c) } } },
    parseInt, JSON,
  };
  vm.createContext(sandbox);
  vm.runInContext(decision, sandbox);
  return { quick: !!win.__cnQuick, resume: !!win.__cnResume, veil: classes.has('cn-quick'), stamped: Number(ls.cn_intro_at) >= now };
}

test('intro : première ouverture → intro complète, rien à reprendre', () => {
  const r = open();
  assert.strictEqual(r.quick, false);
  assert.strictEqual(r.veil, false);
  assert.strictEqual(r.resume, false);
  assert.ok(r.stamped, 'l\'heure d\'ouverture doit être mémorisée');
});

test('intro : retour sur une session ouverte depuis plus de 2 minutes → intro complète ET reprise de la position', () => {
  const r = open({ lastIntroAgo: 10 * 60 * 1000, resumeAgo: 60 * 1000 });
  assert.strictEqual(r.quick, false, 'l\'intro complète doit s\'afficher après une absence');
  assert.strictEqual(r.veil, false);
  assert.strictEqual(r.resume, true, 'la position mémorisée doit quand même être reprise');
});

test('intro : ouverture normale (icône, lien, notification) peu après la précédente → intro complète', () => {
  const r = open({ lastIntroAgo: 20 * 1000 });
  assert.strictEqual(r.quick, false);
  assert.strictEqual(r.veil, false);
});

test('intro : simple actualisation moins de 2 minutes après → voile discret seulement', () => {
  const r = open({ lastIntroAgo: 30 * 1000, navType: 'reload', resumeAgo: 20 * 1000 });
  assert.strictEqual(r.quick, true);
  assert.strictEqual(r.veil, true);
  assert.strictEqual(r.resume, true);
});

test('intro : actualisation après plus de 2 minutes → intro complète (jamais un écran vide)', () => {
  const r = open({ lastIntroAgo: 5 * 60 * 1000, navType: 'reload', resumeAgo: 5 * 60 * 1000 });
  assert.strictEqual(r.quick, false);
  assert.strictEqual(r.veil, false);
});

test('intro : durée minimale de 2 s (0 s seulement en voile discret) et reprise de position', () => {
  assert.match(script, /const APP_SPLASH_MIN_MS = window\.__cnQuick \? 0 : 2000;/);
  assert.match(script, /window\.__cnResume \|\| window\.__cnQuick/);
});

test('intro : fond clair en thème clair ET sombre, couleurs unies, éléments animés présents', () => {
  const block = proCss.match(/#app-splash, html\[data-theme="dark"\] #app-splash \{[^}]*\}/);
  assert.ok(block, 'règle du fond de l\'intro introuvable');
  assert.match(block[0], /background:\s*#f3f5f9/i);
  // Aucun dégradé ni fond sombre dans la section « écran d'entrée » de pro.css.
  const section = proCss.split(/\/\* -{3,} 2\./)[0];
  assert.doesNotMatch(section, /gradient\(/i, 'l\'écran d\'entrée ne doit utiliser que des couleurs unies');
  assert.doesNotMatch(section, /#app-splash[^{]*\{[^}]*background:\s*#0|#app-splash[^{]*\{[^}]*background:\s*#1[0-3]/i);
  ['sp-mark', 'sp-ring', 'sp-orbit', 'sp-ripple', 'sp-shine', 'sp-dot', 'app-splash-spinner', 'app-splash-foot']
    .forEach((c) => assert.ok(html.includes(c), 'élément « ' + c + ' » manquant dans index.html'));
  ['spSpin', 'spRipple', 'spShine', 'spFloat', 'spBar', 'spLogoIn'].forEach((k) =>
    assert.match(proCss, new RegExp('@keyframes ' + k + '\\b'), 'animation ' + k + ' manquante'));
});

test('intro : la feuille de bienvenue (premier lancement) attend la fin de l\'intro au lieu de la recouvrir', () => {
  assert.match(polish, /function whenSplashGone\(fn\)/);
  assert.match(polish, /function showWelcome\(\) \{ whenSplashGone\(buildWelcome\); \}/);
  assert.match(polish, /\+\+n > 50/, 'garde-fou : ne jamais attendre indéfiniment');
});

test('intro : fichiers compilés à jour (app.min.js / app.min.css contiennent les changements)', () => {
  const minJs = fs.readFileSync(path.join(root, 'app.min.js'), 'utf8');
  const minCss = fs.readFileSync(path.join(root, 'app.min.css'), 'utf8');
  // Les noms de fonctions sont raccourcis à la compilation : on cherche la logique (attente de la fin de l'intro, 150 ms, 50 essais max).
  assert.match(minJs, /getElementById\("app-splash"\);if\(![a-z]\|\|[a-z]\.classList\.contains\("hidden"\)\|\|\+\+[a-z]>50\)\{[a-z]\(\);return\}setTimeout\([a-z],150\)/);
  assert.match(minJs, /APP_SPLASH_MIN_MS=window\.__cnQuick\?0:2e3/);
  assert.ok(minCss.includes('#f3f5f9'));
});
