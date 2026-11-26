// « Ma boutique » côté serveur (api/_lib/shop-profile.js) : contacts, liens de paiement du vendeur, QR de paiement.
// Règle : un lien de paiement du vendeur n'est JAMAIS un paiement fait dans l'application ; le serveur ne garde que des liens https sûrs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createShopProfile, clean, publicView, safeHttps, social, qrImage, digits, email, MAX_PAY } = require('../api/_lib/shop-profile');

const ADMIN = 'ADMIN_UID_123';
const DELETE = { __delete: true };

function fakeDb() {
  const store = new Map();
  const col = () => ({
    doc: (id) => ({
      id,
      get: async () => ({ id, exists: store.has(id), data: () => store.get(id) }),
      set: async (v, opt) => {
        const merged = opt && opt.merge ? Object.assign({}, store.get(id) || {}, v) : Object.assign({}, v);
        Object.keys(merged).forEach((k) => { if (merged[k] === DELETE) delete merged[k]; });
        store.set(id, merged);
      },
      delete: async () => { store.delete(id); }
    })
  });
  const db = { collection: () => col(), getAll: async (...refs) => Promise.all(refs.map((r) => r.get())) };
  return { db, store };
}
const admin = { firestore: { FieldValue: { delete: () => DELETE } } };
function make() { const f = fakeDb(); return Object.assign({ api: createShopProfile({ db: f.db, admin, ADMIN_UID: ADMIN }) }, f); }

test('liens https : seuls les liens sûrs passent', () => {
  assert.strictEqual(safeHttps('https://pay.exemple.com/abc?x=1'), 'https://pay.exemple.com/abc?x=1');
  ['http://pay.exemple.com', 'javascript:alert(1)', 'data:text/html,x', 'ftp://a.com', 'https://user:pass@a.com', 'https://127.0.0.1/pay', 'https://10.0.0.1', 'https://localhost/x', 'https://[::1]/x', 'https://intranet/x', 'https://a.local/x', 'https://a b.com', '', null, 42].forEach((u) => assert.strictEqual(safeHttps(u), '', String(u)));
  assert.strictEqual(safeHttps('https://' + 'a'.repeat(600) + '.com'), '');
});

test('contacts : numéros, e-mail, réseaux (lien du bon réseau ou simple nom)', () => {
  assert.strictEqual(digits('+243 81 234 5678', 8, 15), '243812345678');
  assert.strictEqual(digits('123', 8, 15), '');
  assert.strictEqual(digits('1'.repeat(16), 8, 15), '');
  assert.strictEqual(email('moi@exemple.cd'), 'moi@exemple.cd');
  assert.strictEqual(email('moi@exemple'), '');
  assert.strictEqual(email('<b>@x.cd'), '');
  assert.strictEqual(social('facebook', 'mon.nom'), 'https://www.facebook.com/mon.nom');
  assert.strictEqual(social('instagram', '@ma_boutique'), 'https://www.instagram.com/ma_boutique');
  assert.strictEqual(social('tiktok', 'ma_boutique'), 'https://www.tiktok.com/@ma_boutique');
  assert.strictEqual(social('telegram', 'https://t.me/ma_boutique'), 'https://t.me/ma_boutique');
  assert.strictEqual(social('facebook', 'https://facebook.com/ma.page'), 'https://facebook.com/ma.page');
  assert.strictEqual(social('facebook', 'https://hameconnage.com/facebook.com'), '', 'mauvais réseau');
  assert.strictEqual(social('facebook', 'javascript:alert(1)'), '');
  assert.strictEqual(social('instagram', 'a"><script>'), '');
});

test('QR de paiement : uniquement une image envoyée chez l\'hébergeur d\'images de l\'application', () => {
  assert.strictEqual(qrImage('https://res.cloudinary.com/demo/image/upload/v1/boutique-images/qr.png'), 'https://res.cloudinary.com/demo/image/upload/v1/boutique-images/qr.png');
  ['https://exemple.com/qr.png', 'https://res.cloudinary.com/demo/video/upload/v1/x.mp4', 'http://res.cloudinary.com/demo/image/upload/x.png', 'https://evil.com/res.cloudinary.com/image/upload/x.png', ''].forEach((u) => assert.strictEqual(qrImage(u), '', u));
});

test('nettoyage : 3 liens de paiement au plus, nom obligatoire, lien mal écrit signalé', () => {
  const ok = clean({ whatsapp: '243812345678', pay: [{ label: 'Orange Money', url: 'https://pay.orange.com/x' }, { label: 'PayPal', url: 'https://paypal.me/moi' }, { label: 'Stripe', url: 'https://buy.stripe.com/abc' }, { label: 'Quatrième', url: 'https://autre.com/p' }] });
  assert.strictEqual(MAX_PAY, 3);
  assert.strictEqual(ok.value.pay.length, 3);
  assert.deepStrictEqual(ok.badPay, []);
  const bad = clean({ pay: [{ label: 'Ma banque', url: 'http://banque.cd/pay' }, { label: '', url: 'https://ok.com/x' }, { label: '', url: '' }] });
  assert.deepStrictEqual(bad.badPay, [1, 2]);
  assert.strictEqual(bad.value.pay.length, 0);
  const junk = clean('texte');
  assert.deepStrictEqual(junk.value.pay, []);
  assert.strictEqual(clean({ payNote: 'a'.repeat(400) }).value.payNote.length, 160);
  assert.strictEqual(clean({ pay: [{ label: 'x\u0000y‮z', url: 'https://a.com/x' }] }).value.pay[0].label, 'xyz');
});

test('vue publique : aucun champ interne, liens retirés si l\'admin a bloqué', () => {
  const full = { whatsapp: '243812345678', pay: [{ label: 'PayPal', url: 'https://paypal.me/moi', secret: 'x' }], payQr: 'https://res.cloudinary.com/d/image/upload/q.png', payNote: 'Merci', updatedAt: 'x', uid: 'z' };
  const v = publicView(full);
  assert.deepStrictEqual(Object.keys(v).sort(), ['payNote', 'payQr', 'pay', 'whatsapp'].sort());
  assert.deepStrictEqual(v.pay, [{ label: 'PayPal', url: 'https://paypal.me/moi' }]);
  const b = publicView(Object.assign({}, full, { payBlocked: true }));
  assert.strictEqual(b.payBlocked, true);
  assert.ok(!b.pay && !b.payQr && !b.payNote);
  assert.strictEqual(b.whatsapp, '243812345678', 'les contacts restent visibles');
  assert.strictEqual(publicView(null), null);
  assert.strictEqual(publicView({}), null);
});

test('enregistrer : la personne connectée écrit SA boutique ; vide = effacée ; jamais d\'identifiant venu du téléphone', async () => {
  const { api, store } = make();
  await assert.rejects(() => api.save('', {}), /Connecte-toi/);
  const r = await api.save('user_abc123', { uid: 'AUTRE_UTILISATEUR', whatsapp: '243812345678', pay: [{ label: 'Orange Money', url: 'https://pay.exemple.com/p' }] });
  assert.strictEqual(r.success, true);
  assert.ok(store.has('user_abc123') && !store.has('AUTRE_UTILISATEUR'));
  assert.strictEqual(store.get('user_abc123').whatsapp, '243812345678');
  assert.strictEqual(r.profile.pay.length, 1);
  await assert.rejects(() => api.save('user_abc123', { pay: [{ label: 'Pirate', url: 'http://pirate.com' }] }), /Lien de paiement 1/);
  assert.strictEqual(store.get('user_abc123').pay.length, 1, 'une erreur ne change rien');
  const e = await api.save('user_abc123', {});
  assert.deepStrictEqual(e.profile, {});
  assert.ok(!store.has('user_abc123'), 'boutique vide : document supprimé');
});

test('lire : jusqu\'à 40 vendeurs d\'un coup, identifiants invalides ignorés, champs publics seulement', async () => {
  const { api, store } = make();
  store.set('seller_one1', { whatsapp: '243812345678', updatedAt: 'x', pay: [] });
  store.set('seller_two2', { pay: [{ label: 'PayPal', url: 'https://paypal.me/a' }], payBlocked: true });
  await assert.rejects(() => api.get('', { uids: [] }), /Connecte-toi/);
  const r = await api.get('reader_uid1', { uids: ['seller_one1', 'seller_two2', 'inconnu_xyz1', '../hack', 42, 'seller_one1'] });
  assert.deepStrictEqual(Object.keys(r.profiles).sort(), ['seller_one1', 'seller_two2']);
  assert.ok(!('updatedAt' in r.profiles.seller_one1));
  assert.strictEqual(r.profiles.seller_two2.payBlocked, true);
  assert.ok(!r.profiles.seller_two2.pay);
  assert.deepStrictEqual((await api.get('reader_uid1', {})).profiles, {});
});

test('admin : bloquer / débloquer les liens de paiement ; un vendeur bloqué ne peut pas les remettre', async () => {
  const { api, store } = make();
  await api.save('seller_one1', { whatsapp: '243812345678', pay: [{ label: 'PayPal', url: 'https://paypal.me/moi' }], payNote: 'Merci' });
  await assert.rejects(() => api.adminBlock('seller_one1', { uid: 'seller_one1', blocked: true }), /administrateur/);
  await assert.rejects(() => api.adminBlock(ADMIN, { uid: '../x', blocked: true }), /Identifiant/);
  await api.adminBlock(ADMIN, { uid: 'seller_one1', blocked: true });
  assert.strictEqual(store.get('seller_one1').payBlocked, true);
  assert.deepStrictEqual(store.get('seller_one1').pay, []);
  assert.strictEqual(store.get('seller_one1').whatsapp, '243812345678', 'les contacts restent');
  const again = await api.save('seller_one1', { pay: [{ label: 'Nouveau', url: 'https://nouveau.com/p' }], payQr: 'https://res.cloudinary.com/d/image/upload/q.png' });
  assert.strictEqual(again.blocked, true);
  assert.deepStrictEqual(store.get('seller_one1').pay, []);
  assert.strictEqual(store.get('seller_one1').payQr, '');
  await api.adminBlock(ADMIN, { uid: 'seller_one1', blocked: false });
  assert.ok(!('payBlocked' in store.get('seller_one1')));
});

test('branchements serveur : actions protégées, collection réservée au serveur, effacée avec le compte', () => {
  const r = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const core = r('api/_lib/payments-core.js');
  ['shop_profile_save', 'shop_profile_get', 'shop_profile_block'].forEach((a) => {
    assert.match(core, new RegExp(a + ': \\d+'), 'limite de requêtes : ' + a);
    assert.match(core, new RegExp("action === '" + a + "'"), 'action : ' + a);
  });
  assert.match(r('api/notify-user.js'), /shop_profiles/);
  assert.match(r('api/_lib/inactive-cleanup.js'), /'shop_profiles'/);
  assert.match(r('api/_lib/care.js'), /shop_profile/);
  const lib = r('api/_lib/shop-profile.js');
  assert.doesNotMatch(lib, /balance|wallet|credit|amount|price/i, 'aucun montant ni solde n\'est touché ici');
  const fns = fs.readdirSync(path.join(__dirname, '..', 'api')).filter((f) => f.endsWith('.js'));
  assert.ok(fns.length <= 12, 'Vercel gratuit : 12 fonctions au plus (' + fns.length + ')');
});

test('admin : le bouton de blocage passe par le serveur (jamais d\'écriture directe)', () => {
  const a = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
  const m = /async function blockSellerPay\(uid, blocked\) \{[\s\S]*?\n\}/.exec(a);
  assert.ok(m, 'fonction blockSellerPay');
  assert.match(m[0], /action: 'shop_profile_block'/);
  assert.match(m[0], /confirm\(/);
  assert.doesNotMatch(m[0], /db\.collection/);
  assert.match(a, /onclick="blockSellerPay\(this\.dataset\.uid, true\)"/);
});
