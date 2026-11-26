// Boutique « vitrine » (shop-pro.js) : calculs d'affichage, textes en 8 langues, branchements dans script.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function load() {
  const ctx = { setTimeout: () => 0, setInterval: () => 0, clearInterval() {}, clearTimeout() {}, console };
  ctx.window = ctx; ctx.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }; ctx.navigator = {}; ctx.localStorage = { getItem: () => null, setItem() {} };
  vm.createContext(ctx);
  vm.runInContext(read('shop-pro.js'), ctx, { filename: 'shop-pro.js' });
  return ctx;
}
const ctx = load();
const L = ctx.CNShopLogic;
const NOW = new Date('2026-11-25T10:00:00Z').getTime();
const H = 3600000, DAY = 24 * H;
const iso = (ms) => new Date(ms).toISOString();
const mk = (id, o) => Object.assign({ id, type: 'product', title: 'Article ' + id, description: '', price: 10, likesCount: 0, createdAt: iso(NOW - DAY), sellerUid: 'u1', sellerName: 'Marie', sellerVerified: false, category: 'mode' }, o);

test('boutique : le fichier se charge sans toucher à la page et expose l\'API', () => {
  assert.ok(L && typeof L.select === 'function');
  assert.strictEqual(typeof ctx.cnShopPro.open, 'function');
  assert.strictEqual(typeof ctx.cnShopPro.active, 'function');
  assert.strictEqual(ctx.cnShopPro.active(), false, 'inactive tant que la Boutique n\'est pas ouverte');
});

test('prix : la remise ne compte que si elle n\'est pas expirée, jamais d\'argent calculé de travers', () => {
  assert.strictEqual(L.eff(mk('a', { price: 20, discountPercent: 25 }), NOW), 15);
  assert.strictEqual(L.eff(mk('a', { price: 20, discountPercent: 25, promoExpiresAt: iso(NOW + H) }), NOW), 15);
  assert.strictEqual(L.eff(mk('a', { price: 20, discountPercent: 25, promoExpiresAt: iso(NOW - H) }), NOW), 20, 'promo expirée');
  assert.strictEqual(L.eff(mk('a', { price: 9.99, discountPercent: 33 }), NOW), 6.69);
  assert.strictEqual(L.eff(mk('a', { price: 10, discountPercent: 100 }), NOW), 10, '100 % ignoré (valeur impossible)');
  assert.strictEqual(L.eff(mk('a', { price: 'abc' }), NOW), 0);
  assert.strictEqual(L.onSale(mk('a', { price: 20, discountPercent: 25 }), NOW), true);
  assert.strictEqual(L.discountOf(mk('a', { price: 20, discountPercent: 25 }), NOW), 25);
  assert.strictEqual(L.discountOf(mk('a', { price: 20 }), NOW), 0);
  assert.strictEqual(L.fmtPrice(6.6), '6.60$');
});

test('nouveau : moins de 7 jours seulement', () => {
  assert.strictEqual(L.isNew(mk('a', { createdAt: iso(NOW - 2 * DAY) }), NOW), true);
  assert.strictEqual(L.isNew(mk('a', { createdAt: iso(NOW - 8 * DAY) }), NOW), false);
  assert.strictEqual(L.isNew(mk('a', { createdAt: 'n/a' }), NOW), false);
});

test('recherche : sans accent, sans majuscule, tous les mots, aussi dans le nom du vendeur', () => {
  const items = [mk('1', { title: 'Beauté naturelle', sellerName: 'Élodie' }), mk('2', { title: 'Sac en cuir', sellerName: 'Jean' }), mk('3', { title: 'Livre de cuisine', type: 'book', sellerName: 'Jean' })];
  const run = (q) => L.select(items, { q, type: 'all', cat: 'all', sort: 'recent' }, { now: NOW }).map((i) => i.id);
  assert.deepStrictEqual(run('BEAUTE'), ['1']);
  assert.deepStrictEqual(run('elodie'), ['1']);
  assert.deepStrictEqual(run('jean cuir'), ['2']);
  assert.deepStrictEqual(run('jean').sort(), ['2', '3']);
  assert.deepStrictEqual(run('zzz'), []);
  assert.strictEqual(run('').length, 3);
});

test('filtres : type, catégorie, vendeur, promotions, vérifiés, favoris, fourchette de prix', () => {
  const items = [
    mk('1', { price: 5, type: 'book', category: 'ebooks', sellerUid: 'a', sellerVerified: true }),
    mk('2', { price: 20, discountPercent: 50, sellerUid: 'b' }),
    mk('3', { price: 40, sellerUid: 'b', category: 'maison' })
  ];
  const base = { q: '', type: 'all', cat: 'all', sort: 'recent', promo: false, verified: false, fav: false, min: '', max: '', seller: '' };
  const ids = (o, c) => L.select(items, Object.assign({}, base, o), Object.assign({ now: NOW }, c)).map((i) => i.id).sort();
  assert.deepStrictEqual(ids({ type: 'book' }), ['1']);
  assert.deepStrictEqual(ids({ cat: 'maison' }), ['3']);
  assert.deepStrictEqual(ids({ seller: 'b' }), ['2', '3']);
  assert.deepStrictEqual(ids({ promo: true }), ['2']);
  assert.deepStrictEqual(ids({ verified: true }), ['1']);
  assert.deepStrictEqual(ids({ fav: true }, { liked: { 3: 'love' } }), ['3']);
  assert.deepStrictEqual(ids({ min: '10', max: '30' }), ['2'], 'le prix compté est le prix remisé (10)');
  assert.deepStrictEqual(ids({ min: '6' }), ['2', '3']);
  assert.deepStrictEqual(ids({ max: '5' }), ['1']);
});

test('tris : récents, aimés, prix, remises (prix remisé, égalités par date)', () => {
  const items = [
    mk('1', { price: 30, likesCount: 1, createdAt: iso(NOW - 3 * DAY) }),
    mk('2', { price: 12, likesCount: 9, createdAt: iso(NOW - 2 * DAY), discountPercent: 50 }),
    mk('3', { price: 20, likesCount: 9, createdAt: iso(NOW - 1 * DAY) })
  ];
  const by = (sort) => L.select(items, { q: '', type: 'all', cat: 'all', sort }, { now: NOW }).map((i) => i.id).join('');
  assert.strictEqual(by('recent'), '321');
  assert.strictEqual(by('popular'), '321', 'égalité de « j\'aime » : le plus récent d\'abord');
  assert.strictEqual(by('low'), '2' + '31');
  assert.strictEqual(by('high'), '132');
  assert.strictEqual(by('deal').charAt(0), '2');
  assert.strictEqual(by('inconnu'), '321', 'tri inconnu : par date');
});

test('filtres actifs : on compte chaque filtre posé (pastille du bouton Filtres)', () => {
  assert.strictEqual(L.activeCount({ type: 'all', promo: false, verified: false, fav: false, min: '', max: '' }), 0);
  assert.strictEqual(L.activeCount({ type: 'book', promo: true, verified: false, fav: true, min: '5', max: '' }), 4);
});

test('vendeurs : compteurs et liste des vendeurs vérifiés', () => {
  const items = [mk('1', { sellerUid: 'a', sellerName: 'A', sellerVerified: true }), mk('2', { sellerUid: 'a', sellerName: 'A', sellerVerified: true }), mk('3', { sellerUid: 'b', sellerName: 'B' }), mk('4', { sellerUid: 'c', sellerName: 'C', sellerVerified: true })];
  assert.deepStrictEqual({ ...L.sellerStats(items) }, { items: 4, sellers: 3, verified: 2 });
  const v = L.verifiedSellers(items, 5);
  assert.strictEqual(v.length, 2); assert.strictEqual(v[0].uid, 'a'); assert.strictEqual(v[0].n, 2);
  assert.strictEqual(L.verifiedSellers(items, 1).length, 1);
});

test('compte à rebours et aide du panier (remise de 5 % dès 4 articles)', () => {
  assert.strictEqual(L.fmtLeft(2 * DAY + 5 * H, 'j'), '2j 5h');
  assert.strictEqual(L.fmtLeft(5 * H + 12 * 60000), '5h 12m');
  assert.strictEqual(L.fmtLeft(30000), '1m');
  assert.strictEqual(L.fmtLeft(0), '');
  assert.deepStrictEqual({ ...L.cartHint(0) }, {}.constructor === Object && L.cartHint(0) === null ? {} : { ...L.cartHint(0) });
  assert.strictEqual(L.cartHint(0), null);
  assert.deepStrictEqual({ ...L.cartHint(1) }, { ok: false, n: 3 });
  assert.deepStrictEqual({ ...L.cartHint(3) }, { ok: false, n: 1 });
  assert.deepStrictEqual({ ...L.cartHint(4) }, { ok: true, n: 0 });
});

/* ---------- Textes en 8 langues ---------- */
const toks = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join('|');
test('textes : chaque texte existe en 8 langues, garde ses {variables}, sans marqueur', () => {
  const D = L.DICT, langs = L.LANGS;
  assert.deepStrictEqual([...langs], ['fr', 'en', 'es', 'it', 'pt', 'de', 'sw', 'ln']);
  const keys = Object.keys(D);
  assert.ok(keys.length >= 130, 'au moins 130 textes (' + keys.length + ')');
  for (const k of keys) {
    assert.strictEqual(D[k].length, 8, k + ' : 8 langues');
    D[k].forEach((v, i) => {
      assert.strictEqual(typeof v, 'string', k + '/' + langs[i]);
      assert.ok(v.trim(), 'vide : ' + k + '/' + langs[i]);
      assert.strictEqual(toks(v), toks(D[k][0]), 'variables différentes : ' + k + '/' + langs[i]);
      assert.ok(!/TODO|XXX|\?\?\?|undefined/.test(v), 'marqueur : ' + k + '/' + langs[i]);
    });
  }
});

test('textes : swahili, lingála et allemand ne laissent presque rien en français', () => {
  const D = L.DICT, same = [];
  // Mots identiques au français dans ces langues (noms propres, abréviations)
  const OK = new Set(['p_min', 'p_max', 'f_type', 'tab_catalog']);
  for (const k of Object.keys(D)) for (const i of [5, 6, 7]) if (D[k][i] === D[k][0] && !OK.has(k)) same.push(k + '/' + L.LANGS[i]);
  assert.deepStrictEqual(same, []);
});

test('textes : les formes au singulier existent pour chaque compteur', () => {
  const D = L.DICT;
  ['stat_items', 'stat_sellers', 'stat_verified'].forEach((k) => { assert.ok(D[k + '_1'], k + '_1'); assert.ok(!/\{n\}/.test(D[k + '_1'][0])); });
});

/* ---------- Branchements dans script.js ---------- */
test('script.js : la Boutique charge shop-pro.js à la demande et garde l\'ancienne liste en secours', () => {
  const s = read('script.js');
  assert.ok(fs.existsSync(path.join(root, 'shop-pro.js')));
  assert.match(s, /cnLazyModule\('data-cn-shop', 'shop-pro\.js\?v=\d+'/);
  assert.match(s, /window\.cnShopPro\.open\(opts\)[\s\S]{0,200}loadShopFeed\(\)/, 'secours : ancienne liste');
  assert.match(s, /function renderShopFeed\(\) \{\s*if \(window\.cnShopPro && window\.cnShopPro\.active\(\)\)/);
  assert.match(s, /function cnShopCardSync/);
  assert.match(s, /function openSharedShopIfAny/);
});

test('script.js : articles gardés 2 minutes, « j\'aime » connus non relus, relecture forcée après publication', () => {
  const s = read('script.js');
  assert.match(s, /Date\.now\(\) - shopLoadedAt < 120000/);
  assert.match(s, /\(item\.id in knownLikes\)/);
  assert.match(s, /loadShopFeed\(true\);\s*\n\s*\} catch \(e\) \{\s*\n\s*errEl\.textContent = friendlyErrorMessage\(e\);/);
  assert.match(s, /shopLoadedAt = 0; shopFeedItems = shopFeedItems\.filter/);
});

test('lien de vitrine (?boutique=) : seul un identifiant simple est accepté', () => {
  const s = read('script.js');
  const m = /function openSharedShopIfAny\(\) \{[\s\S]*?\n\}/.exec(s)[0];
  assert.match(m, /\/\^\[A-Za-z0-9_-\]\{6,64\}\$\/\.test\(sid\)/);
  assert.match(m, /if \(!currentUser\) return;/);
});

// Un texte venu d'une personne est « protégé » s'il est dans un appel esc(…), encodeURIComponent(…), new Date(…) ou un calcul de nombre.
function protectedAt(line, idx) {
  const stack = [];
  for (let i = 0; i < idx; i++) {
    const c = line[i];
    if (c === "'") { i++; while (i < idx && line[i] !== "'") { if (line[i] === '\\') i++; i++; } }
    else if (c === '(') { const m = /([A-Za-z_.$]+)\s*$/.exec(line.slice(0, i)); stack.push(m ? m[1] : ''); }
    else if (c === ')') stack.pop();
  }
  return stack.some((n) => /(^|\.)(esc|encodeURIComponent|safeHref|imgSrc|Date|Number|num|fmtPrice)$/.test(n));
}
test('shop-pro.js : aucun texte venu d\'une personne n\'est inséré sans échappement', () => {
  const src = read('shop-pro.js');
  // champs saisis par les vendeurs ou venus du serveur : jamais collés dans du HTML sans esc()/encodeURIComponent()/safeHref()/imgSrc()
  const fields = ['it\\.title', 'it\\.sellerName', 'it\\.sellerUid', 'it\\.sellerPhone', 'it\\.promoExpiresAt', 'it\\.id', 'r\\.label', 'r\\.url', 'pf\\.payNote', 'pf\\.pay', 'pf\\.payQr', 'ST\\.note', 'ST\\.qr', 'vals\\[k\\]', 'base\\.payNote'];
  const bad = [];
  fields.forEach((f) => {
    const re = new RegExp('(?<![\\w.])' + f + '(?![\\w])', 'g');
    let m;
    while ((m = re.exec(src))) {
      const ls = src.lastIndexOf('\n', m.index) + 1, le = src.indexOf('\n', m.index);
      const line = src.slice(ls, le), idx = m.index - ls;
      const before = line.slice(0, idx), after = line.slice(idx + m[0].length);
      if ((/\+\s*$/.test(before) || /^\s*\+/.test(after)) && !protectedAt(line, idx)) bad.push(f + ' : ' + line.trim().slice(0, 140));
    }
  });
  assert.deepStrictEqual(bad, []);
  assert.doesNotMatch(src, /\.innerHTML\s*=\s*[^;]*\bS\.q\b(?![^;]*esc\()/);
  assert.doesNotMatch(src, /eval\(|new Function\(|document\.write/);
});

test('boutique : contacts et paiement du vendeur — textes, branchements et garde-fous', () => {
  const src = read('shop-pro.js'), D = L.DICT;
  ['settings_title', 's_contacts', 'f_whatsapp', 'f_call', 'f_email', 'f_facebook', 'f_instagram', 'f_tiktok', 'f_telegram', 'f_website', 's_pay', 'pay_intro', 'pay_add', 'pay_qr', 'pay_note', 'pay_own_warn', 'pay_btn', 'pay_warn', 'pay_with', 'pay_qr_cap', 'leave_title', 'leave_body', 'go_on', 'report_link', 'blocked_note', 'err_https', 'wa_hello', 'hint_setup'].forEach((k) => assert.ok(D[k], 'texte manquant : ' + k));
  assert.deepStrictEqual(toks(D.pay_with[0]), '{label}');
  assert.deepStrictEqual(toks(D.leave_body[0]), '{host}');
  // l'ancien bouton « QR » du haut est remplacé par « Ma boutique » ; le QR reste dans le menu
  assert.match(src, /data-a="hub">' \+ svg\('store', 16\) \+ esc\(T\('mine_title'\)\)/);
  assert.match(src, /lbHtml\('data-h="qr"'/);
  // les réglages passent par le serveur (jamais d'écriture directe dans Firestore depuis le téléphone)
  assert.match(src, /action: action/);
  assert.match(src, /apiCall\('shop_profile_save'/);
  assert.match(src, /apiCall\('shop_profile_get'/);
  assert.doesNotMatch(src, /db\.collection|firebase\.firestore/);
  // un lien de paiement ne s'ouvre qu'après l'écran « Tu quittes l'application », en https, sans fenêtre cachée
  assert.doesNotMatch(src, /window\.open\(/);
  assert.match(src, /data-go="1" href="' \+ esc\(r\.url\) \+ '" target="_blank" rel="noopener noreferrer"/);
  assert.match(src, /function httpsOnly\(u\) \{ return \/\^https:\\\/\\\/\[\^\\s"'<>\]\+\$\//);
  // le QR de paiement n'est accepté que s'il vient de l'hébergeur d'images de l'application
  assert.match(src, /res\\\.cloudinary\\\.com/);
  // aucun paiement n'est simulé ni confirmé ici
  assert.doesNotMatch(src, /confirmPayment|markPaid|payment_success|creditWallet/);
});

test('boutique : liens de contact — seuls des liens sûrs sont fabriqués', () => {
  const src = read('shop-pro.js');
  const m = /function chHref\(k, v\) \{[\s\S]*?\n  \}/.exec(src)[0];
  const ctx2 = { T: (k) => 'Bonjour ' + k, encodeURIComponent, dg: (v, min) => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length >= min && d.length <= 15 ? d : ''; } };
  vm.createContext(ctx2); vm.runInContext(m + '; this.chHref = chHref;', ctx2);
  const h = ctx2.chHref;
  assert.match(h('whatsapp', '243 812 345 678'), /^https:\/\/wa\.me\/243812345678\?text=/);
  assert.strictEqual(h('whatsapp', '123'), '');
  assert.strictEqual(h('call', '+243 81 234 5678'), 'tel:+243812345678');
  assert.strictEqual(h('email', 'a@b.cd'), 'mailto:a@b.cd');
  assert.strictEqual(h('email', 'a@b.cd?cc=x@y.zz'), '');
  assert.strictEqual(h('facebook', 'javascript:alert(1)'), '');
  assert.strictEqual(h('website', 'http://exemple.com'), '');
  assert.strictEqual(h('website', 'https://exemple.com/a'), 'https://exemple.com/a');
  assert.strictEqual(h('instagram', 'https://x.com/"onmouseover="a'), '');
});

test('shop-pro.js : pas d\'emoji ni de dégradé (règle de couleurs de l\'application)', () => {
  const src = read('shop-pro.js');
  assert.doesNotMatch(src, /gradient\(/);
  assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});
