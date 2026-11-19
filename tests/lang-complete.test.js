// Quand on change de langue, TOUT doit changer : textes, champs, titres/infobulles, aria, images (alt) — et la page se relance une fois.
const test = require('node:test');
const assert = require('node:assert');
const { read, PACKS, makeEnv } = require('./lang-env');

function bootAll(opts) {
  const env = makeEnv(Object.assign({ navigator: 'fr-FR' }, opts || {})).boot();
  PACKS.forEach((l) => env.loadPack(l));
  return env;
}

test('langues complètes : les 7 langues ont exactement les mêmes clés que le français, sans texte vide', () => {
  const env = bootAll();
  const frKeys = Object.keys(env.api.TRANSLATIONS.fr);
  assert.ok(frKeys.length >= 1855, 'au moins 1 855 textes (' + frKeys.length + ')');
  for (const l of PACKS) {
    const d = env.api.TRANSLATIONS[l];
    assert.deepStrictEqual(Object.keys(d).filter((k) => !(k in env.api.TRANSLATIONS.fr)), [], l + ' : clés inconnues');
    assert.deepStrictEqual(frKeys.filter((k) => !(k in d)), [], l + ' : clés manquantes');
    assert.deepStrictEqual(frKeys.filter((k) => !String(d[k] || '').trim()), [], l + ' : textes vides');
  }
});

test('langues complètes : mêmes {variables}, mêmes balises HTML et mêmes nombres dans toutes les langues', () => {
  const env = bootAll();
  const fr = env.api.TRANSLATIONS.fr;
  const vars = (s) => (String(s).match(/\{[^}]*\}/g) || []).sort().join('|');
  const tags = (s) => (String(s).match(/<\/?[a-z][^>]*>/gi) || []).map((x) => x.replace(/\s.*?>/, '>').toLowerCase()).sort().join('|');
  for (const l of PACKS) {
    for (const k of Object.keys(fr)) {
      assert.strictEqual(vars(env.api.TRANSLATIONS[l][k]), vars(fr[k]), l + ' : variable différente dans ' + k);
      assert.strictEqual(tags(env.api.TRANSLATIONS[l][k]), tags(fr[k]), l + ' : balise différente dans ' + k);
    }
  }
});

test('index.html : chaque clé utilisée (texte, placeholder, title, aria-label, alt) existe dans le français', () => {
  const html = read('index.html');
  const env = bootAll();
  const fr = env.api.TRANSLATIONS.fr;
  const used = [...new Set([...html.matchAll(/data-i18n(?:-placeholder|-title|-aria-label|-alt)?="([^"]+)"/g)].map((m) => m[1]))];
  assert.ok(used.length >= 450, 'la page utilise au moins 450 clés différentes (' + used.length + ')');
  assert.deepStrictEqual(used.filter((k) => !(k in fr)), []);
  // Les réglages et le profil sont traduisibles
  assert.ok(Object.keys(fr).filter((k) => k.startsWith('st_')).length >= 150, 'textes des réglages');
  assert.ok(/data-i18n-title="/.test(html) || /data-i18n-aria-label="/.test(html), 'infobulles/aria traduisibles');
});

test('moteur : title, aria-label, alt et placeholder changent avec la langue (et reviennent en français)', async () => {
  const env = bootAll({ location: { reload() {} } });
  const txt = env.i18n('nav_login');
  const ph = env.i18n('state_retry', 'placeholder');
  const ti = env.i18n('nav_login', 'title');
  const ar = env.i18n('nav_register', 'aria-label');
  const al = env.i18n('nav_register', 'alt');
  const T = env.api.TRANSLATIONS;
  assert.strictEqual(await env.api.changeLanguage('ln'), true);
  assert.strictEqual(txt.textContent, T.ln.nav_login);
  assert.strictEqual(ph.getAttribute('placeholder'), T.ln.state_retry);
  assert.strictEqual(ti.getAttribute('title'), T.ln.nav_login);
  assert.strictEqual(ar.getAttribute('aria-label'), T.ln.nav_register);
  assert.strictEqual(al.getAttribute('alt'), T.ln.nav_register);
  assert.strictEqual(await env.api.changeLanguage('sw'), true);
  assert.strictEqual(ti.getAttribute('title'), T.sw.nav_login);
  assert.strictEqual(await env.api.changeLanguage('fr'), true);
  assert.strictEqual(txt.textContent, T.fr.nav_login);
  assert.strictEqual(ti.getAttribute('title'), T.fr.nav_login);
  assert.strictEqual(ar.getAttribute('aria-label'), T.fr.nav_register);
  assert.strictEqual(al.getAttribute('alt'), T.fr.nav_register);
});

test('rechargement : après un vrai changement de langue la page se relance une fois, pas pour la même langue', async () => {
  let reloads = 0;
  const env = bootAll({ location: { reload() { reloads++; } } });
  await env.api.changeLanguage('ln');
  assert.strictEqual(reloads, 0, 'pas immédiat : la nouvelle langue s\'affiche d\'abord');
  env.advance(1000);
  assert.strictEqual(reloads, 1, 'une seule relance');
  await env.api.changeLanguage('ln'); // même langue : rien
  env.advance(1000);
  assert.strictEqual(reloads, 1, 'même langue = pas de relance');
  await env.api.changeLanguage('fr'); // retour au français : le français revient partout
  env.advance(1000);
  assert.strictEqual(reloads, 2, 'retour au français : relance aussi');
});

test('rechargement : jamais quand la fenêtre de connexion est ouverte, ni si un test le coupe', async () => {
  let reloads = 0;
  const open = { classList: { contains: () => false } }; // fenêtre visible (pas de classe « hidden »)
  const env = bootAll({ location: { reload() { reloads++; } }, authModal: open });
  await env.api.changeLanguage('sw'); env.advance(1000);
  assert.strictEqual(reloads, 0, 'connexion ouverte : on ne perd pas ce que la personne tape');
  open.classList.contains = (c) => c === 'hidden'; // fenêtre fermée
  await env.api.changeLanguage('ln'); env.advance(1000);
  assert.strictEqual(reloads, 1);
  const env2 = bootAll({ location: { reload() { reloads++; } } });
  env2.ctx.__cnNoLangReload = true;
  await env2.api.changeLanguage('es'); env2.advance(1000);
  assert.strictEqual(reloads, 1, 'interrupteur __cnNoLangReload');
  const env3 = bootAll({}); // pas de location (bac à sable) : aucune erreur
  assert.strictEqual(await env3.api.changeLanguage('it'), true);
  env3.advance(1000);
});

test('rechargement : le démarrage dans la langue enregistrée ne relance rien', async () => {
  let reloads = 0;
  const env = makeEnv({ lang: 'ln', navigator: 'fr-FR', location: { reload() { reloads++; } } }).boot();
  env.loadPack('ln');
  env.advance(2000);
  assert.strictEqual(reloads, 0);
});

/* ---------- Formulaire d'assistance (care-pro.js) : 7 langues ---------- */
function mountCare(lang) {
  const vm = require('vm');
  const stub = () => ({ addEventListener() {}, querySelector: () => stub(), querySelectorAll: () => [], appendChild() {}, setAttribute() {}, classList: { add() {}, remove() {} }, style: {}, textContent: '', value: '', disabled: false, parentNode: { insertBefore() {} } });
  let supportHtml = '';
  const sec = { querySelector: () => null, querySelectorAll: () => [], appendChild: (b) => { supportHtml = b.innerHTML; } };
  const ctx = {
    currentLang: lang, console, setTimeout: () => 0,
    document: { getElementById: (id) => (id === 'section-contact' ? sec : null), createElement: () => Object.assign(stub(), { innerHTML: '' }), head: { appendChild() {} }, body: { appendChild() {} } },
    auth: { currentUser: null, onAuthStateChanged() {} }, escapeHtml: (s) => String(s), showToast() {}, readableError: (e) => String(e && e.message || e)
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('care-pro.js'), ctx, { filename: 'care-pro.js' });
  return supportHtml;
}

test('assistance (care-pro) : le formulaire s\'affiche dans la langue choisie, sans français collé', () => {
  const fr = mountCare('fr'), ln = mountCare('ln'), sw = mountCare('sw'), en = mountCare('en');
  assert.match(fr, /Envoyer une demande/);
  assert.match(ln, /Tinda lisengi/); assert.ok(!/Envoyer une demande/.test(ln));
  assert.match(sw, /Tuma ombi/); assert.ok(!/Envoyer la demande/.test(sw));
  assert.match(en, /Send a request/); assert.ok(!/Paiement \/ recharge/.test(en));
  const src = read('care-pro.js');
  const block = src.slice(src.indexOf('var CT = {'), src.indexOf('var CL = ['));
  const rows = [...block.matchAll(/^ {4}(\w+): (\[.*\]),?\s*$/gm)];
  assert.ok(rows.length >= 30, 'au moins 30 textes (' + rows.length + ')');
  for (const [, key, arr] of rows) {
    const a = eval(arr);
    assert.strictEqual(a.length, 7, key + ' : 7 langues');
    assert.ok(a.every((x) => x.trim()), key + ' : texte vide');
    for (let i = 1; i < 7; i++) assert.strictEqual((a[i].match(/\{\w+\}/g) || []).join(), (a[0].match(/\{\w+\}/g) || []).join(), key + ' : variable différente');
  }
});

test('filet de sécurité : un texte français connu resté dans un écran est traduit ; le français et le reste ne bougent pas', async () => {
  const env = bootAll({ location: { reload() {} } });
  const T = env.api.TRANSLATIONS;
  const key = Object.keys(T.fr).find((k) => T.fr[k] === 'Publier une offre');
  assert.ok(key, 'texte de départ présent');
  const mk = (txt, tag) => ({ nodeType: 3, nodeValue: txt, parentNode: { tagName: tag || 'DIV', closest: () => null } });
  const check = async (lang, expected) => {
    await env.api.changeLanguage(lang);
    const a = mk('  Publier une offre '), b = mk('Publier une offre maintenant'), c = mk('Publier une offre', 'TEXTAREA'), d = mk('12'), e = mk('Publier une offre', 'SCRIPT');
    [a, b, c, d, e].forEach((n) => env.ctx.translateNode(n, lang));
    assert.strictEqual(a.nodeValue, expected === null ? '  Publier une offre ' : '  ' + expected + ' ', lang + ' : espaces autour conservés');
    assert.strictEqual(b.nodeValue, 'Publier une offre maintenant', 'texte partiel : jamais touché');
    assert.strictEqual(c.nodeValue, 'Publier une offre', 'zone de saisie : jamais touchée');
    assert.strictEqual(e.nodeValue, 'Publier une offre', 'script : jamais touché');
    assert.strictEqual(d.nodeValue, '12');
  };
  await check('sw', T.sw[key]);
  await check('ln', T.ln[key]);
  await check('en', T.en[key]);
  await check('fr', null);
  // texte dans un bloc marqué « ne pas traduire » : intact
  await env.api.changeLanguage('sw');
  const n = { nodeType: 3, nodeValue: 'Publier une offre', parentNode: { tagName: 'DIV', closest: () => ({}) } };
  env.ctx.translateNode(n, 'sw');
  assert.strictEqual(n.nodeValue, 'Publier une offre');
});
