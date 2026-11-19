// Langues chargées à la demande : le français est dans l'application, les 6 autres langues sont des petits fichiers (lang-xx.js)
// téléchargés seulement si la personne les choisit. Ces tests rejouent tous les cas : fichier rapide, fichier lent, pas de réseau,
// choix qui change vite, retour du réseau, ordre d'arrivée des fichiers.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { read, root, PACKS, makeEnv, loadAllTranslations } = require('./lang-env');

const flush = () => new Promise((r) => setImmediate(r));

test('packs : un fichier par langue, bien formé, rangé sous son propre code', () => {
  for (const l of PACKS) {
    const src = read('lang-' + l + '.js');
    new vm.Script(src, { filename: 'lang-' + l + '.js' }); // erreur de syntaxe = test rouge
    assert.strictEqual((src.match(/P\.([a-z]{2}) = \{/g) || []).length, 1, l + ' : un seul dictionnaire par fichier');
    assert.ok(src.includes('P.' + l + ' = {'), l + ' : rangé sous son code');
    assert.ok(src.includes("__cnPackArrived('" + l + "')"), l + ' : prévient le moteur à son arrivée');
    const env = makeEnv({}); vm.createContext(env.ctx); env.loadPack(l);
    assert.deepStrictEqual(Object.keys(env.ctx.__cnPacks), [l], l + ' : ne touche à aucune autre langue');
    assert.ok(Object.keys(env.ctx.__cnPacks[l]).length >= 100, l + ' : dictionnaire non vide');
  }
});

test('démarrage : seul le français est dans l\'application, aucun texte d\'une autre langue dans le fichier rapide', () => {
  const env = makeEnv({}).boot();
  assert.deepStrictEqual(Object.keys(env.api.TRANSLATIONS), ['fr']);
  const all = loadAllTranslations();
  const bundle = read('app.min.js'), core = read('translations.js');
  for (const l of ['en', 'es', 'it', 'pt']) {
    const phrase = all[l].state_offline;
    assert.notStrictEqual(phrase, all.fr.state_offline);
    assert.ok(!bundle.includes(phrase), l + ' : texte retrouvé dans app.min.js : « ' + phrase + ' »');
    assert.ok(!core.includes(phrase), l + ' : texte retrouvé dans translations.js');
  }
});

test('ordre d\'arrivée : packs avant le moteur ou moteur avant les packs, le résultat est identique', () => {
  const a = makeEnv({}).boot(); PACKS.forEach((l) => a.loadPack(l));
  const b = makeEnv({ packsFirst: true }).boot();
  for (const l of ['fr'].concat(PACKS)) {
    assert.ok(b.api.TRANSLATIONS[l], l + ' absent (packs d\'abord)');
    assert.deepStrictEqual(JSON.stringify(b.api.TRANSLATIONS[l]), JSON.stringify(a.api.TRANSLATIONS[l]), l + ' : différent selon l\'ordre');
  }
});

test('t() : pack pas encore là = texte français (jamais vide, jamais la clé brute) ; dès que le pack arrive = la langue choisie', () => {
  const env = makeEnv({ lang: 'en', network: () => 'hang' }).boot();
  assert.strictEqual(env.api.getLang(), 'en');
  assert.strictEqual(env.api.t('state_offline'), env.api.TRANSLATIONS.fr.state_offline);
  assert.notStrictEqual(env.api.t('state_offline'), 'state_offline');
  env.loadPack('en');
  assert.strictEqual(env.api.t('state_offline'), "You're offline. Reconnect and try again.");
  assert.strictEqual(env.api.t('cle_qui_n_existe_pas'), 'cle_qui_n_existe_pas');
});

test('démarrage lent : le français reste affiché, puis la langue s\'applique toute seule à l\'arrivée du pack', () => {
  const env = makeEnv({ lang: 'en', network: () => 'hang' }).boot();
  const a = env.i18n('state_offline'), ph = env.i18n('state_retry', true);
  env.api.applyTranslations('en'); // ce que fait le démarrage quand le pack n'est pas encore là
  assert.strictEqual(a.textContent, env.api.TRANSLATIONS.fr.state_offline, 'français en attendant');
  assert.strictEqual(env.requested.length, 1, 'une seule demande de fichier');
  assert.match(env.requested[0], /lang-en\.js/);
  env.loadPack('en'); env.pending[0].s.onload();
  assert.strictEqual(a.textContent, "You're offline. Reconnect and try again.");
  assert.strictEqual(ph.attrs.placeholder, 'Try again');
  assert.strictEqual(env.ctx.document.documentElement.lang, 'en');
  assert.ok(env.events.some((e) => e.type === 'cn:langchange' && e.detail.lang === 'en'), 'événement cn:langchange envoyé');
  assert.strictEqual(env.store.coeurnoh_lang, 'en');
});

test('pas de double téléchargement : si index.html a déjà demandé le fichier, le moteur attend celui-là', async () => {
  const env = makeEnv({ lang: 'es' });
  env.run('window.__cnPS = { es: "loading" };');
  env.boot();
  let ok = null;
  env.api.loadLangPack('es').then((v) => { ok = v; });
  await flush();
  assert.strictEqual(env.requested.length, 0, 'aucune deuxième demande');
  assert.strictEqual(ok, null);
  env.loadPack('es'); // arrivée du fichier demandé par index.html
  await flush();
  assert.strictEqual(ok, true);
  assert.strictEqual(env.api.t('nav_login'), env.api.TRANSLATIONS.es.nav_login);
});

test('addTranslation : un texte ajouté avant l\'arrivée du pack est gardé, sans jamais écraser un texte existant', () => {
  const env = makeEnv({ network: () => 'hang' }).boot();
  env.api.addTranslation('en', 'site_template_exemple', 'Example style');
  env.api.addTranslation('en', 'nav_login', 'NE DOIT PAS REMPLACER');
  env.api.addTranslation('fr', 'site_template_exemple', 'Style exemple');
  env.api.addTranslation('sw', 'site_template_exemple', 'Mfano');
  env.loadPack('en'); env.loadPack('sw');
  assert.strictEqual(env.api.TRANSLATIONS.en.site_template_exemple, 'Example style');
  assert.notStrictEqual(env.api.TRANSLATIONS.en.nav_login, 'NE DOIT PAS REMPLACER');
  assert.strictEqual(env.api.TRANSLATIONS.fr.site_template_exemple, 'Style exemple');
  assert.strictEqual(env.api.TRANSLATIONS.sw.site_template_exemple, 'Mfano');
  env.api.addTranslation('en', 'site_template_exemple', 'autre'); // pack déjà là : écriture directe, toujours sans écraser
  assert.strictEqual(env.api.TRANSLATIONS.en.site_template_exemple, 'Example style');
});

test('changer de langue : le fichier arrive, la langue s\'applique (texte, champs, sélecteur, bouton actif, mémoire du choix)', async () => {
  const env = makeEnv({}).boot();
  env.run('window.__cnLV = { en: "abc1234567" };');
  const a = env.i18n('state_offline');
  const r = env.api.changeLanguage('en');
  assert.ok(r && typeof r.then === 'function', 'retourne une promesse');
  assert.strictEqual(await r, true);
  assert.deepStrictEqual(env.requested, ['lang-en.js?v=abc1234567'], 'fichier versionné');
  assert.strictEqual(a.textContent, "You're offline. Reconnect and try again.");
  assert.strictEqual(env.sel.value, 'en');
  assert.ok(env.buttons.find((b) => b.dataset.lang === 'en').classList.contains('active'));
  assert.ok(!env.buttons.find((b) => b.dataset.lang === 'fr').classList.contains('active'));
  assert.strictEqual(env.store.coeurnoh_lang, 'en');
  // revenir en français ou repasser sur une langue déjà chargée : immédiat, sans nouvelle demande
  const n = env.requested.length;
  env.api.changeLanguage('fr');
  assert.strictEqual(a.textContent, env.api.TRANSLATIONS.fr.state_offline, 'le français est appliqué tout de suite (sans attendre)');
  env.api.changeLanguage('en');
  assert.strictEqual(a.textContent, "You're offline. Reconnect and try again.");
  assert.strictEqual(env.requested.length, n);
});

test('pas de réseau : la langue actuelle est gardée, message clair, sélecteur remis, aucune langue à moitié appliquée', async () => {
  const env = makeEnv({ network: () => 'fail' }).boot();
  const a = env.i18n('state_offline');
  env.api.applyTranslations('fr');
  env.sel.value = 'es'; // la personne vient de choisir « Español » dans la liste
  const ok = await env.api.changeLanguage('es');
  assert.strictEqual(ok, false);
  assert.strictEqual(env.api.getLang(), 'fr');
  assert.strictEqual(a.textContent, env.api.TRANSLATIONS.fr.state_offline);
  assert.strictEqual(env.sel.value, 'fr', 'le sélecteur revient sur la langue réellement affichée');
  assert.strictEqual(env.store.coeurnoh_lang, 'fr', 'le choix enregistré n\'a pas changé');
  assert.strictEqual(env.toasts.length, 1);
  assert.match(env.toasts[0].m, /Impossible de charger cette langue/);
  assert.strictEqual(env.toasts[0].type, 'error');
  assert.strictEqual(env.api.langReady('es'), false);
});

test('pas de réseau puis réseau de retour : une nouvelle tentative a lieu, et la langue enregistrée s\'applique', async () => {
  let net = 'fail';
  const env = makeEnv({ lang: 'en', network: () => net }).boot();
  const a = env.i18n('state_offline');
  env.api.applyTranslations('en'); // démarrage hors ligne
  await flush();
  assert.strictEqual(a.textContent, env.api.TRANSLATIONS.fr.state_offline);
  assert.strictEqual(env.requested.length, 1);
  net = 'ok'; env.fire('online');
  await flush();
  assert.strictEqual(env.requested.length, 2, 'seconde tentative');
  assert.strictEqual(a.textContent, "You're offline. Reconnect and try again.");
  // un seul « online » : pas de tentative en double
  env.fire('online'); await flush();
  assert.strictEqual(env.requested.length, 2);
});

test('choix qui change vite : c\'est le DERNIER choix qui gagne, même si les fichiers arrivent dans le désordre', async () => {
  for (const order of ['en-puis-es', 'es-puis-en']) {
    const env = makeEnv({ network: () => 'hang' }).boot();
    const a = env.i18n('state_offline');
    const pEn = env.api.changeLanguage('en'), pEs = env.api.changeLanguage('es');
    const arrive = (l) => { const p = env.pending.find((x) => x.l === l); env.loadPack(l); p.s.onload(); };
    if (order === 'en-puis-es') { arrive('en'); arrive('es'); } else { arrive('es'); arrive('en'); }
    assert.strictEqual(await pEn, false, order + ' : le premier choix est abandonné');
    assert.strictEqual(await pEs, true);
    assert.strictEqual(env.api.getLang(), 'es', order);
    assert.strictEqual(a.textContent, env.api.TRANSLATIONS.es.state_offline, order);
    assert.strictEqual(env.store.coeurnoh_lang, 'es', order);
  }
  // choisir une langue lente puis revenir au français : le français reste
  const env = makeEnv({ network: () => 'hang' }).boot();
  const a = env.i18n('state_offline');
  const p = env.api.changeLanguage('it'); env.api.changeLanguage('fr');
  env.loadPack('it'); env.pending[0].s.onload();
  assert.strictEqual(await p, false);
  assert.strictEqual(env.api.getLang(), 'fr');
  assert.strictEqual(a.textContent, env.api.TRANSLATIONS.fr.state_offline);
});

test('fichier qui ne répond jamais : après 12 s on abandonne proprement, et un nouvel essai refait une vraie demande', async () => {
  const env = makeEnv({ network: () => 'hang' }).boot();
  const p = env.api.changeLanguage('pt');
  env.advance(11000);
  assert.strictEqual(env.toasts.filter((t) => t.type === 'error').length, 0, 'pas d\'échec avant 12 s');
  env.advance(1500);
  assert.strictEqual(await p, false);
  assert.strictEqual(env.toasts.filter((t) => t.type === 'error').length, 1);
  assert.strictEqual(env.api.getLang(), 'fr');
  env.api.changeLanguage('pt');
  assert.strictEqual(env.requested.length, 2, 'nouvelle demande après un échec');
});

test('connexion lente : un message « Chargement… » apparaît après 0,7 s seulement (rien si c\'est rapide)', async () => {
  const fast = makeEnv({}).boot();
  await fast.api.changeLanguage('en');
  fast.advance(5000);
  assert.strictEqual(fast.toasts.length, 0, 'rapide : aucun message');
  const slow = makeEnv({ network: () => 'hang' }).boot();
  slow.api.changeLanguage('es');
  slow.advance(600); assert.strictEqual(slow.toasts.length, 0);
  slow.advance(200);
  assert.strictEqual(slow.toasts.length, 1);
  assert.strictEqual(slow.toasts[0].type, 'info');
  assert.strictEqual(slow.toasts[0].m, slow.api.TRANSLATIONS.fr.common_loading);
});

test('démarrage de l\'application : exécution immédiate si la langue est prête, sinon attente de 3 s au plus (une seule exécution)', async () => {
  const ready = makeEnv({}).boot();
  let calls = 0; ready.api.onLangReady('fr', () => { calls++; }, 3000);
  assert.strictEqual(calls, 1, 'français : tout de suite, sans attendre');
  const env = makeEnv({ lang: 'en', network: () => 'hang' }).boot();
  const seen = []; env.api.onLangReady('en', (ok) => seen.push(ok), 3000);
  assert.deepStrictEqual(seen, []);
  env.advance(3100);
  assert.deepStrictEqual(seen, [false], 'délai écoulé : on démarre en français');
  env.loadPack('en'); env.pending[0].s.onload(); await flush();
  assert.deepStrictEqual(seen, [false], 'jamais exécuté deux fois');
  const quick = makeEnv({ lang: 'en', network: () => 'hang' }).boot();
  const seen2 = []; quick.api.onLangReady('en', (ok) => seen2.push(ok), 3000);
  quick.loadPack('en'); quick.pending[0].s.onload(); await flush();
  assert.deepStrictEqual(seen2, [true], 'pack arrivé à temps : démarrage directement dans la langue');
});

test('Kiswahili / Lingála par le chargement à la demande : traduction complète, le français reste le filet de sécurité', async () => {
  const env = makeEnv({}).boot();
  assert.strictEqual(await env.api.changeLanguage('sw'), true);
  assert.strictEqual(env.api.t('nav_login'), 'Ingia');
  assert.ok(env.api.t('state_offline').length > 0 && env.api.t('state_offline') !== env.api.TRANSLATIONS.fr.state_offline, 'sw : texte hors ligne traduit');
  delete env.api.TRANSLATIONS.sw.state_offline; // sécurité : si une clé manque un jour, le français prend le relais
  assert.strictEqual(env.api.t('state_offline'), env.api.TRANSLATIONS.fr.state_offline);
  assert.strictEqual(await env.api.changeLanguage('ln'), true);
  assert.strictEqual(env.api.t('nav_login'), 'Kokota');
  assert.strictEqual(await env.api.changeLanguage('zz'), false, 'langue inconnue : refusée sans rien casser');
  assert.strictEqual(env.api.getLang(), 'ln');
});

/* ---------- index.html : demande très tôt du pack de la langue enregistrée ---------- */
function runSnippet({ saved, nav, storageThrows }) {
  const html = read('index.html');
  const m = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((s) => s.includes('__cnLV'));
  assert.ok(m, 'bloc de pré-chargement des langues introuvable dans index.html');
  const scripts = [];
  const ctx = {
    localStorage: { getItem: () => { if (storageThrows) throw new Error('bloqué'); return saved === undefined ? null : saved; } },
    navigator: { language: nav },
    document: { head: { appendChild: (s) => scripts.push(s) }, createElement: () => ({}) }
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(m, ctx);
  return { scripts, ctx };
}
const hashOf = (f) => crypto.createHash('sha256').update(f + '\0' + read(f) + '\0').digest('hex').slice(0, 10);

test('index.html : la langue enregistrée est demandée tout de suite (fichier versionné), le français ne demande rien', () => {
  const none = (o) => assert.strictEqual(runSnippet(o).scripts.length, 0, JSON.stringify(o) + ' : aucun fichier');
  none({ saved: 'fr', nav: 'en-US' });
  none({ saved: undefined, nav: 'fr-CD' });
  none({ saved: 'zz', nav: 'fr' });
  const want = (o, l) => {
    const r = runSnippet(o);
    assert.strictEqual(r.scripts.length, 1, JSON.stringify(o));
    assert.strictEqual(r.scripts[0].src, 'lang-' + l + '.js?v=' + hashOf('lang-' + l + '.js'), JSON.stringify(o));
    assert.strictEqual(r.scripts[0].async, true);
    assert.strictEqual(r.ctx.__cnPS[l], 'loading');
  };
  want({ saved: 'en', nav: 'fr' }, 'en');
  want({ saved: 'sw', nav: 'fr' }, 'sw');
  want({ saved: 'ln', nav: 'en' }, 'ln');
  want({ saved: undefined, nav: 'es-ES' }, 'es');
  want({ saved: undefined, nav: 'de-DE' }, 'en'); // langue inconnue : anglais, comme detectLanguage()
  want({ saved: undefined, nav: 'pt-BR', storageThrows: true }, 'pt'); // stockage bloqué : langue du téléphone
  assert.deepStrictEqual(Object.keys(runSnippet({ saved: 'en', nav: 'fr' }).ctx.__cnLV), PACKS);
});

test('index.html : le pré-chargement choisit toujours la même langue que detectLanguage() du moteur', () => {
  for (const saved of [undefined, 'fr', 'en', 'es', 'it', 'pt', 'sw', 'ln', 'zz', '']) {
    for (const nav of ['fr-FR', 'en-GB', 'es', 'it-IT', 'pt-PT', 'sw-KE', 'ln-CD', 'de', 'zh-CN', '']) {
      const env = makeEnv({ lang: saved, navigator: nav }).boot();
      const eng = env.api.detectLanguage();
      const r = runSnippet({ saved: saved === undefined ? undefined : saved, nav });
      const got = r.scripts.length ? /lang-([a-z]{2})\.js/.exec(r.scripts[0].src)[1] : 'fr';
      assert.strictEqual(got, eng, 'enregistrée=' + JSON.stringify(saved) + ' téléphone=' + JSON.stringify(nav));
    }
  }
});

/* ---------- le reste de l'application passe par addTranslation et attend les langues ---------- */
test('aucun autre fichier n\'écrit directement dans TRANSLATIONS[langue][clé] (le pack peut ne pas être chargé)', () => {
  const skip = /^(translations\.js|lang-[a-z]{2}\.js|app\.min\.js|immo-travel-pro \(1\)\.js)$/;
  const offenders = [];
  for (const f of fs.readdirSync(root).filter((x) => x.endsWith('.js') && !skip.test(x))) {
    if (/TRANSLATIONS\s*\[[^\]]+\]\s*\[[^\]]+\]\s*=[^=]/.test(read(f))) offenders.push(f);
  }
  assert.deepStrictEqual(offenders, []);
  assert.match(read('script.js'), /addTranslation\(l, key, d\[2 \+ i\]\)/);
  assert.match(read('site-gallery.js'), /addTranslation\(l, key, o\[l\] \|\| o\.fr\)/);
});

test('démarrage et connexion : le démarrage attend la langue (3 s au plus), le module de connexion se met à jour APRÈS le changement', () => {
  assert.match(read('script.js'), /onLangReady\(currentLang, \(\) => \{\s*applyTranslations\(currentLang\);[\s\S]*?\}, 3000\);/);
  const login = read('login-pro.js');
  assert.match(login, /r && typeof r\.then === 'function'\) r\.then\(function \(ok\) \{ if \(ok !== false\) redraw\(\); \}\); else redraw\(\)/);
});

test('cache : les packs sont servis avec un cache d\'un an (nom versionné), comme app.min.js', () => {
  const rules = JSON.parse(read('vercel.json')).headers;
  const rule = rules.find((r) => /lang-/.test(r.source));
  assert.ok(rule, 'règle de cache des langues absente');
  assert.ok(new RegExp('^' + rule.source.replace(/\./g, '\\.').replace(/\\\.(?=[a-z]+$)/, '\\.') .replace('(en|es|it|pt|sw|ln)', '(?:en|es|it|pt|sw|ln)') + '$').test('/lang-ln.js'));
  assert.match(JSON.stringify(rule.headers), /max-age=31536000, immutable/);
  for (const l of PACKS) assert.ok(new RegExp('lang-\\(' + PACKS.join('\\|') + '\\)').test(rule.source) && rule.source.includes(l));
});

/* ---------- l'outil de construction détecte un pack modifié sans nouvelle version ---------- */
test('tools/build.js --check : refuse un pack modifié ou un numéro de version périmé dans index.html', () => {
  const b = read('tools/build.js');
  const list = (name) => [...b.match(new RegExp('const ' + name + ' = \\[([^\\]]*)\\]'))[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const files = [...list('JS'), ...list('CSS'), ...PACKS.map((l) => 'lang-' + l + '.js'), 'app.min.js', 'app.min.css', 'index.html'];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-build-'));
  try {
    fs.mkdirSync(path.join(dir, 'tools'));
    fs.copyFileSync(path.join(root, 'tools', 'build.js'), path.join(dir, 'tools', 'build.js'));
    for (const f of files) fs.copyFileSync(path.join(root, f), path.join(dir, f));
    const check = () => { try { execFileSync(process.execPath, [path.join(dir, 'tools', 'build.js'), '--check'], { stdio: 'pipe' }); return { ok: true }; } catch (e) { return { ok: false, err: String(e.stderr) }; } };
    assert.ok(check().ok, 'copie intacte : à jour');
    fs.appendFileSync(path.join(dir, 'lang-es.js'), '\n// modifié\n');
    const r = check();
    assert.ok(!r.ok && /lang-xx\.js/.test(r.err), 'pack modifié sans reconstruction → refusé : ' + r.err);
    fs.copyFileSync(path.join(root, 'lang-es.js'), path.join(dir, 'lang-es.js'));
    assert.ok(check().ok);
    fs.writeFileSync(path.join(dir, 'index.html'), fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/("pt":")[0-9a-f]{10}/, '$10000000000'));
    assert.ok(!check().ok, 'numéro de version périmé dans index.html → refusé');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
