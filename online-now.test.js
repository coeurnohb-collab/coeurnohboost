// Système « en ligne » : compteur et liste calculés par le serveur à partir des battements (presence/{uid}.lastActiveAt).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const on = require('../api/_lib/online-now');

const NOW = Date.parse('2026-11-24T12:00:00Z');
const ago = (min) => new Date(NOW - min * 60000).toISOString();

// faux Firestore minimal : where(champ,'>',x) + orderBy desc + limit + count() optionnel
function makeDb(presence, users, { withCount = true } = {}) {
  const q = (filterIso, desc, lim) => {
    const run = () => {
      let rows = Object.entries(presence).filter(([, d]) => !filterIso || d.lastActiveAt > filterIso);
      if (desc) rows.sort((a, b) => (a[1].lastActiveAt < b[1].lastActiveAt ? 1 : -1));
      if (lim) rows = rows.slice(0, lim);
      return rows;
    };
    const o = {
      where: (f, op, v) => { assert.strictEqual(f, 'lastActiveAt'); assert.strictEqual(op, '>'); return q(v, desc, lim); },
      orderBy: (f, d) => q(filterIso, d === 'desc', lim),
      limit: (n) => q(filterIso, desc, n),
      get: async () => { const rows = run(); return { size: rows.length, docs: rows.map(([id, d]) => ({ id, data: () => d })) }; }
    };
    if (withCount) o.count = () => ({ get: async () => ({ data: () => ({ count: run().length }) }) });
    return o;
  };
  return {
    collection: (name) => name === 'presence' ? q(null, false, null) : { doc: (id) => ({ get: async () => ({ exists: !!users[id], data: () => users[id] }) }) }
  };
}

test('compteur : en ligne = battement de moins de 5 min ; heure et 24 h comptées à part', async () => {
  on._resetCache();
  const db = makeDb({ a: { lastActiveAt: ago(1) }, b: { lastActiveAt: ago(4.5) }, c: { lastActiveAt: ago(6) }, d: { lastActiveAt: ago(50) }, e: { lastActiveAt: ago(600) }, f: { lastActiveAt: ago(3000) } }, {});
  const c = await on.onlineCounts({ db, now: NOW, fresh: true });
  assert.strictEqual(c.online, 2);
  assert.strictEqual(c.lastHour, 4);
  assert.strictEqual(c.last24h, 5);
  assert.strictEqual(c.windowMin, 5);
});

test('compteur : sans comptage groupé (ancienne bibliothèque), le résultat est le même', async () => {
  on._resetCache();
  const db = makeDb({ a: { lastActiveAt: ago(1) }, b: { lastActiveAt: ago(9) } }, {}, { withCount: false });
  const c = await on.onlineCounts({ db, now: NOW, fresh: true });
  assert.deepStrictEqual([c.online, c.lastHour, c.last24h], [1, 2, 2]);
});

test('compteur : gardé 20 s en mémoire (coût de lecture borné), recalculé ensuite ou sur demande', async () => {
  on._resetCache();
  const presence = { a: { lastActiveAt: ago(1) } };
  const db = makeDb(presence, {});
  assert.strictEqual((await on.onlineCounts({ db, now: NOW })).online, 1);
  presence.b = { lastActiveAt: ago(0.5) };
  assert.strictEqual((await on.onlineCounts({ db, now: NOW + 10000 })).online, 1, 'dans les 20 s : valeur gardée');
  assert.strictEqual((await on.onlineCounts({ db, now: NOW + 25000 })).online, 2, 'après 20 s : recalculé');
  presence.c = { lastActiveAt: ago(0) };
  assert.strictEqual((await on.onlineCounts({ db, now: NOW + 26000, fresh: true })).online, 3, 'fresh : recalculé tout de suite (admin)');
});

test('liste (admin) : les plus récents d\'abord, avec nom / pays ; fiche absente → nom vide, jamais d\'erreur', async () => {
  const db = makeDb(
    { a: { lastActiveAt: ago(4) }, b: { lastActiveAt: ago(1) }, c: { lastActiveAt: ago(20) }, ghost: { lastActiveAt: ago(2) } },
    { a: { name: 'Anna', email: 'a@x.cd', country: 'CD' }, b: { username: 'bob', email: 'b@x.cd' }, c: { name: 'Vieux' } });
  const list = await on.onlineUsers({ db, now: NOW });
  assert.deepStrictEqual(list.map((u) => u.uid), ['b', 'ghost', 'a'], 'ordre récent → ancien, hors ligne exclus');
  assert.strictEqual(list[0].name, 'bob');
  assert.strictEqual(list[1].name, '');
  assert.strictEqual(list[2].country, 'CD');
  const limited = await on.onlineUsers({ db, now: NOW, limit: 1 });
  assert.strictEqual(limited.length, 1);
});

test('branchements : le public ne reçoit que des nombres, la liste nominative est réservée à l\'admin, le battement respecte la visibilité', () => {
  const pi = read('api/payment-initiate.js');
  const m = pi.match(/provider === 'online'[\s\S]*?\n    }\n/)[0];
  assert.ok(/verifyCaller\(req\)/.test(m), 'réservé aux personnes connectées');
  assert.ok(!/onlineUsers/.test(m), 'aucune liste nominative côté public');
  assert.ok(/online: c\.online, lastHour: c\.lastHour, last24h: c\.last24h/.test(m), 'seulement des nombres');
  assert.ok(!/enforceRateLimit/.test(m), 'pas de limite Firestore à chaque appel (coût)');
  const wh = read('api/payment-webhook.js');
  assert.match(wh, /caller\.isAdmin[\s\S]{0,9000}action === 'online_now'[\s\S]{0,400}onlineUsers\(\{ db \}\)/, 'liste nominative derrière le contrôle admin');
  const sc = read('script.js');
  assert.match(sc, /async function touchPresence\(\)[\s\S]{0,400}document\.hidden\) return;/, 'rien n\'est écrit quand l\'application est en arrière-plan');
  assert.match(sc, /lastActiveAt: new Date\(\)\.toISOString\(\)\s*\}\)/, 'même forme de document qu\'avant (compatible avec les règles Firestore existantes)');
  assert.match(sc, /visibilitychange[\s\S]{0,200}touchPresence\(\)/);
  assert.match(sc, /CN_ONLINE_MIN_SHOWN = 3/);
  assert.match(sc, /async function cnRefreshOnline\(\)[\s\S]{0,500}auth\.currentUser[\s\S]{0,300}fu\.getIdToken\(\)/, 'le jeton vient du compte Firebase (currentUser de l\'app est une simple fiche)');
  assert.match(read('index.html'), /id="online-now"[^>]*role="status"/);
  const ad = read('admin.js');
  assert.match(ad, /card\(online\.online, 'En ligne maintenant', "admGoto\('users','online'\)"/);
  assert.match(ad, /window\.__admOnline\.uids\.has\(doc\.id\)/, 'pastille « En ligne » dans la liste des utilisateurs');
  assert.strictEqual(fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js')).length <= 12, true, '12 fonctions Vercel au plus');
});
