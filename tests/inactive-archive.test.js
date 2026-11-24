// Comptes inactifs : mis de côté (archivés) au lieu d'être détruits, et récupérés avec TOUTES leurs informations au retour.
// Faux Firestore + faux compte de connexion en mémoire : on vérifie le comportement réel du code serveur.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const ic = require('../api/_lib/inactive-cleanup');

/* ---------------------------------------------------------------- faux Firestore */
function makeDb() {
  const store = new Map(); // chemin -> données
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const snap = (p, id) => ({ exists: store.has(p), id, ref: ref(p), data: () => (store.has(p) ? clone(store.get(p)) : undefined) });
  const ref = (p) => ({
    path: p, id: p.split('/').pop(),
    get: async () => snap(p, p.split('/').pop()),
    set: async (d, o) => { store.set(p, o && o.merge ? Object.assign({}, store.get(p) || {}, clone(d)) : clone(d)); },
    update: async (d) => { if (!store.has(p)) throw new Error('not-found'); store.set(p, Object.assign({}, store.get(p), clone(d))); },
    delete: async () => { store.delete(p); },
    collection: (n) => coll(p + '/' + n)
  });
  const list = (c) => [...store.keys()].filter((k) => k.startsWith(c + '/') && !k.slice(c.length + 1).includes('/'));
  const query = (c, filters, lim) => ({
    where: (f, op, v) => query(c, filters.concat([[f, v]]), lim),
    limit: (n) => query(c, filters, n),
    orderBy: () => query(c, filters, lim),
    get: async () => {
      let ks = list(c).filter((k) => filters.every(([f, v]) => store.get(k)[f] === v));
      if (lim) ks = ks.slice(0, lim);
      const docs = ks.map((k) => snap(k, k.split('/').pop()));
      return { docs, empty: !docs.length, size: docs.length };
    }
  });
  const coll = (c) => Object.assign(query(c, [], null), {
    doc: (id) => ref(c + '/' + id),
    add: async (d) => { const id = 'auto' + store.size + Math.random().toString(36).slice(2, 6); store.set(c + '/' + id, clone(d)); return ref(c + '/' + id); }
  });
  return {
    store, collection: coll,
    batch: () => { const ops = []; return { set: (r, d) => ops.push(() => r.set(d)), delete: (r) => ops.push(() => r.delete()), commit: async () => { for (const o of ops) await o(); } }; },
    put: (p, d) => store.set(p, clone(d)), has: (p) => store.has(p), val: (p) => store.get(p)
  };
}

/* ---------------------------------------------------------------- faux compte de connexion */
function makeAdmin(users) {
  const m = new Map(users.map((u) => [u.uid, Object.assign({ customClaims: undefined }, u)]));
  const api = {
    users: m,
    auth: () => ({
      listUsers: async () => ({ users: [...m.values()].map((u) => Object.assign({}, u)), pageToken: undefined }),
      getUser: async (uid) => { if (!m.has(uid)) { const e = new Error('nf'); e.code = 'auth/user-not-found'; throw e; } return Object.assign({}, m.get(uid)); },
      setCustomUserClaims: async (uid, c) => { m.get(uid).customClaims = c || undefined; },
      deleteUser: async (uid) => { if (!m.has(uid)) { const e = new Error('nf'); e.code = 'auth/user-not-found'; throw e; } m.delete(uid); }
    })
  };
  return api;
}

const NOW = Date.parse('2026-11-24T08:00:00Z');
const DAY = 86400000;
const old = (d) => new Date(NOW - d * DAY).toISOString();
const ADMIN = 'ADMINUID1';

function seed(db, uid, extra = {}) {
  db.put('users/' + uid, Object.assign({ name: 'Marie', email: uid + '@x.cd', phone: '+243900', country: 'CD', balance: 0, loyaltyPoints: 7, photoURL: 'https://img/x.png', createdAt: old(200), lastSeenAt: old(90) }, extra));
  db.put('public_profiles/' + uid, { name: 'Marie', verified: true, followers: 12 });
  db.put('publications/p1', { sellerUid: uid, title: 'Sac', price: 5 });
  db.put('publications/p2', { sellerUid: uid, title: 'Robe', price: 9 });
  db.put('publications/other', { sellerUid: 'someoneElse', title: 'Autre' });
  db.put('location_live/' + uid, { lat: 1, lng: 2 });
  db.put('location_history/h1', { ownerUid: uid, lat: 1 });
  db.put('location_devices/d1', { ownerUid: uid, label: 'Tel' });
  db.put('emergency_contacts/e1', { ownerUid: uid, name: 'Papa' });
  db.put('orders/o1', { uid, price: 3 });
  db.put('notifications/n1', { uid, title: 'Salut' });
}

test('archiveAccount : copie complète, retrait de l\'application, compte de connexion conservé, commandes intactes', async () => {
  const db = makeDb(), admin = makeAdmin([{ uid: 'u1' }]);
  seed(db, 'u1');
  const r = await ic.archiveAccount({ db, admin, uid: 'u1', now: NOW, lastActivityAt: NOW - 90 * DAY });
  assert.ok(r.items >= 6);
  for (const p of ['users/u1', 'public_profiles/u1', 'publications/p1', 'publications/p2', 'location_devices/d1', 'emergency_contacts/e1']) assert.ok(!db.has(p), p + ' doit être retiré');
  for (const p of ['location_live/u1', 'location_history/h1']) assert.ok(!db.has(p), p + ' (sensible) doit être effacé');
  assert.ok(db.has('publications/other'), 'les publications des autres ne bougent pas');
  assert.ok(db.has('orders/o1') && db.has('notifications/n1'), 'commandes et notifications intactes');
  assert.ok(db.has('archived_accounts/u1'));
  assert.strictEqual(db.val('archived_accounts/u1').email, 'u1@x.cd');
  assert.ok(db.has('archived_accounts/u1/items/users__u1'));
  assert.ok(db.has('archived_accounts/u1/items/publications__p1'));
  assert.ok(!db.has('archived_accounts/u1/items/location_live__u1'), 'la position en direct n\'est JAMAIS copiée');
  assert.ok(admin.users.has('u1'), 'le compte de connexion reste : la personne pourra se reconnecter');
  assert.strictEqual(admin.users.get('u1').customClaims.archived, true);
});

test('restoreAccount : toutes les informations reviennent à l\'identique, le drapeau et l\'archive disparaissent', async () => {
  const db = makeDb(), admin = makeAdmin([{ uid: 'u1', customClaims: { role: 'x' } }]);
  seed(db, 'u1');
  const before = JSON.parse(JSON.stringify(db.val('users/u1')));
  await ic.archiveAccount({ db, admin, uid: 'u1', now: NOW });
  assert.deepStrictEqual(admin.users.get('u1').customClaims, { role: 'x', archived: true }, 'les autres droits du compte sont conservés');
  const r = await ic.restoreAccount({ db, admin, uid: 'u1', now: NOW + DAY });
  assert.strictEqual(r.restored, true);
  assert.strictEqual(r.name, 'Marie');
  const u = db.val('users/u1');
  for (const k of Object.keys(before)) if (k !== 'lastSeenAt') assert.deepStrictEqual(u[k], before[k], 'champ ' + k);
  assert.ok(u.restoredAt && u.lastSeenAt > before.lastSeenAt, 'date de retour notée');
  assert.deepStrictEqual(db.val('public_profiles/u1'), { name: 'Marie', verified: true, followers: 12 });
  assert.deepStrictEqual(db.val('publications/p1'), { sellerUid: 'u1', title: 'Sac', price: 5 });
  assert.ok(db.has('publications/p2') && db.has('location_devices/d1') && db.has('emergency_contacts/e1'));
  assert.deepStrictEqual(admin.users.get('u1').customClaims, { role: 'x' }, 'seul le drapeau « archived » est retiré');
  assert.ok(![...db.store.keys()].some((k) => k.startsWith('archived_accounts/')), 'l\'archive est effacée après le retour');
});

test('restoreAccount : sans archive, ne fait rien ; deux appels de suite sont sans danger', async () => {
  const db = makeDb(), admin = makeAdmin([{ uid: 'u1' }]);
  seed(db, 'u1');
  const snapshot = JSON.stringify([...db.store.entries()]);
  assert.deepStrictEqual(await ic.restoreAccount({ db, admin, uid: 'u1' }), { restored: false });
  assert.strictEqual(JSON.stringify([...db.store.entries()]), snapshot, 'rien n\'a été écrit');
  await ic.archiveAccount({ db, admin, uid: 'u1', now: NOW });
  assert.strictEqual((await ic.restoreAccount({ db, admin, uid: 'u1', now: NOW })).restored, true);
  assert.strictEqual((await ic.restoreAccount({ db, admin, uid: 'u1', now: NOW })).restored, false, 'le 2e appel ne trouve plus rien');
  assert.strictEqual(db.val('users/u1').name, 'Marie');
});

test('restoreAccount : la fiche vide recréée automatiquement après l\'archivage est remplacée par la vraie fiche', async () => {
  const db = makeDb(), admin = makeAdmin([{ uid: 'u1' }]);
  seed(db, 'u1');
  await ic.archiveAccount({ db, admin, uid: 'u1', now: NOW });
  // l'application a recréé une fiche vide (inscription interrompue / auto-réparation) juste avant le retour
  db.put('users/u1', { name: 'u1', email: 'u1@x.cd', balance: 0, createdAt: new Date(NOW + 1000).toISOString() });
  db.put('public_profiles/u1', { name: 'u1' });
  const r = await ic.restoreAccount({ db, admin, uid: 'u1', now: NOW + 5000 });
  assert.strictEqual(r.restored, true);
  assert.strictEqual(db.val('users/u1').name, 'Marie', 'la vraie fiche gagne');
  assert.strictEqual(db.val('users/u1').loyaltyPoints, 7);
  assert.strictEqual(db.val('public_profiles/u1').name, 'Marie');
});

test('restoreAccount : une fiche vivante plus ancienne que l\'archive n\'est jamais écrasée', async () => {
  const db = makeDb(), admin = makeAdmin([{ uid: 'u1' }]);
  seed(db, 'u1');
  await ic.archiveAccount({ db, admin, uid: 'u1', now: NOW });
  db.put('users/u1', { name: 'Marie Nouvelle', balance: 0, createdAt: old(300) }); // reste d'un archivage interrompu
  await ic.restoreAccount({ db, admin, uid: 'u1', now: NOW + 1000 });
  assert.strictEqual(db.val('users/u1').name, 'Marie Nouvelle');
});

test('runInactiveCleanup : archive les comptes absents, protège admin / solde / contenu / récents, premier passage à blanc', async () => {
  const db = makeDb();
  const stale = { creationTime: old(200), lastSignInTime: old(100), lastRefreshTime: old(100) };
  const admin = makeAdmin([
    { uid: 'old1', metadata: stale }, { uid: ADMIN, metadata: stale }, { uid: 'rich', metadata: stale },
    { uid: 'owner', metadata: stale }, { uid: 'recent', metadata: { creationTime: old(200), lastSignInTime: old(2), lastRefreshTime: old(2) } },
    { uid: 'gone', metadata: stale, customClaims: { archived: true } }
  ]);
  for (const u of ['old1', ADMIN, 'rich', 'owner', 'recent']) db.put('users/' + u, { name: u, balance: 0, createdAt: old(200), lastSeenAt: old(100) });
  db.put('users/rich', { name: 'rich', balance: 4, createdAt: old(200) });
  db.put('mini_sites/owner', { title: 'Mon site' });

  // 1er passage : à blanc
  let r = await ic.runInactiveCleanup({ db, admin, ADMIN_UID: ADMIN, now: NOW });
  assert.strictEqual(r.dryRun, true);
  assert.strictEqual(r.archived, 0);
  assert.strictEqual(r.wouldArchive, 1);
  assert.ok(db.has('users/old1'), 'rien n\'est archivé au premier passage');

  // 2e passage : armé
  r = await ic.runInactiveCleanup({ db, admin, ADMIN_UID: ADMIN, now: NOW + DAY });
  assert.strictEqual(r.dryRun, false);
  assert.strictEqual(r.archived, 1);
  assert.strictEqual(r.keptMoney, 1);
  assert.strictEqual(r.keptContent, 1);
  assert.ok(!db.has('users/old1') && db.has('archived_accounts/old1'), 'old1 est archivé');
  for (const u of [ADMIN, 'rich', 'owner', 'recent']) assert.ok(db.has('users/' + u), u + ' est protégé');
  assert.ok(admin.users.has('old1'), 'jamais de suppression du compte de connexion');
  assert.strictEqual(r.archivedTotal, 2, 'old1 + le compte déjà archivé');

  // 3e passage : le compte déjà archivé n'est pas repris (pas de doublon, pas de nouvelle archive)
  r = await ic.runInactiveCleanup({ db, admin, ADMIN_UID: ADMIN, now: NOW + 2 * DAY });
  assert.strictEqual(r.archived, 0);
  assert.strictEqual(r.candidates, 2, 'seuls « rich » et « owner » restent examinés (et protégés) : le compte archivé est sauté');
  const cfg = db.val('app_config/inactive_cleanup');
  assert.strictEqual(cfg.totalArchived, 1);
});

test('runInactiveCleanup : compte trop volumineux laissé tel quel, jamais détruit', async () => {
  const db = makeDb();
  const stale = { creationTime: old(200), lastSignInTime: old(100), lastRefreshTime: old(100) };
  const admin = makeAdmin([{ uid: 'big', metadata: stale }]);
  db.put('users/big', { name: 'big', balance: 0, createdAt: old(200), lastSeenAt: old(100) });
  for (let i = 0; i < 1501; i++) db.put('publications/b' + i, { sellerUid: 'big' });
  db.put('app_config/inactive_cleanup', { armedAt: old(5), enabled: true });
  const r = await ic.runInactiveCleanup({ db, admin, ADMIN_UID: ADMIN, now: NOW });
  assert.strictEqual(r.archived, 0);
  assert.strictEqual(r.keptTooBig, 1);
  assert.ok(db.has('users/big') && db.has('publications/b0') && !db.has('archived_accounts/big'));
});

test('recordSeen : filet de sécurité — fiche absente ou drapeau « archivé » encore présent → le compte est récupéré', async () => {
  const db = makeDb(), admin = makeAdmin([{ uid: 'u1' }]);
  seed(db, 'u1');
  await ic.archiveAccount({ db, admin, uid: 'u1', now: NOW });
  const r = await ic.recordSeen({ db, admin, uid: 'u1', req: { headers: {} }, now: NOW + DAY });
  assert.deepStrictEqual(r, { ok: true, restored: true });
  assert.strictEqual(db.val('users/u1').name, 'Marie');
  // compte normal : comportement habituel (pays + dernière visite), aucune lecture d'archive nécessaire
  const r2 = await ic.recordSeen({ db, admin, uid: 'u1', req: { headers: { 'x-vercel-ip-country': 'cd' } }, now: NOW + 2 * DAY });
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(r2.country, 'CD');
  // fiche absente et aucune archive : { ok: false } comme avant
  assert.deepStrictEqual(await ic.recordSeen({ db, admin, uid: 'nobody', req: { headers: {} } }), { ok: false });
});

test('admin : liste, récupération et suppression définitive — réservées aux comptes réellement archivés', async () => {
  const db = makeDb(), admin = makeAdmin([{ uid: 'u1' }, { uid: 'live1' }, { uid: ADMIN }]);
  seed(db, 'u1');
  db.put('users/live1', { name: 'Vivant', balance: 0, createdAt: old(1) });
  await ic.archiveAccount({ db, admin, uid: 'u1', now: NOW });
  const items = await ic.listArchives({ db });
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].uid, 'u1');
  assert.strictEqual(items[0].publications, 2);
  assert.deepStrictEqual(await ic.purgeArchivedAccount({ db, admin, uid: 'live1', ADMIN_UID: ADMIN }), { purged: false, reason: 'not_archived' });
  assert.ok(admin.users.has('live1'), 'un compte vivant ne peut pas être supprimé par cette action');
  assert.deepStrictEqual(await ic.purgeArchivedAccount({ db, admin, uid: ADMIN, ADMIN_UID: ADMIN }), { purged: false, reason: 'protected' });
  assert.deepStrictEqual(await ic.purgeArchivedAccount({ db, admin, uid: 'u1', ADMIN_UID: ADMIN }), { purged: true });
  assert.ok(!admin.users.has('u1') && ![...db.store.keys()].some((k) => k.startsWith('archived_accounts/')));
});

test('branchements : retour automatique, suppression complète, actions admin, cartes cliquables', () => {
  const pi = read('api/payment-initiate.js');
  assert.match(pi, /provider === 'restore'[\s\S]{0,300}enforceRateLimit[\s\S]{0,200}restoreAccount\(\{ db, admin, uid: who\.uid \}\)/, 'restore : limité et seulement pour SON compte');
  assert.match(pi, /recordSeen\(\{ db, admin, uid: who\.uid, req, claims: who\.decoded \}\)/);
  const wh = read('api/payment-webhook.js');
  assert.match(wh, /caller\.isAdmin[\s\S]{0,6000}action === 'archives_list'[\s\S]{0,900}archive_restore[\s\S]{0,900}purgeArchivedAccount/);
  assert.match(read('api/notify-user.js'), /delete-account[\s\S]{0,4000}deleteArchive\(\{ db, uid: targetUid \}\)[\s\S]{0,200}deleteUser\(targetUid\)/, '« Supprimer mon compte » efface aussi l\'archive');
  const sc = read('script.js');
  assert.match(sc, /cnRestoreIfArchived\(user, 6000\)[\s\S]{0,200}cnWelcomeBack = true/);
  assert.match(sc, /provider: 'restore'/);
  const ag = read('auth-guard.js');
  assert.strictEqual((ag.match(/restoreFirst\(user\)\.then/g) || []).length, 2, 'ensureUserDoc ET healAccount récupèrent avant de créer une fiche');
  assert.match(ag, /if \(r !== false\) return null;/, 'erreur réseau : aucune fiche vide créée par-dessus');
  const ad = read('admin.js');
  for (const go of ["admGoto('users')", "admGoto('orders','all')", "admGoto('profit')", "admGoto('orders','pending')", "admGoto('deposits')", "admGoto('users','archives')"]) assert.ok(ad.includes(go), go);
  assert.match(ad, /class="stat-card stat-card-link"/);
  assert.match(read('admin-pro.css'), /button\.stat-card-link:focus-visible/);
  assert.ok(!/supprimé automatiquement/.test(read('legal.html')), 'le texte légal ne promet plus la suppression');
  assert.strictEqual(fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js')).length <= 12, true, '12 fonctions Vercel au plus');
});
