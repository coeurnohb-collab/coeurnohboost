const test = require('node:test');
const assert = require('node:assert');
const { createSitePanel, parseServices, sellPrice, orderTotal, validateOrder, parseOrderResult } = require('../api/_lib/site-panel');

function fakeDb() {
  const st = {}; let n = 0;
  const ref = (c, id) => ({ get: async () => ({ exists: !!(st[c] && st[c][id]), data: () => st[c][id] }), set: async (d) => { (st[c] = st[c] || {})[id] = d; }, update: async (d) => { const o = st[c][id]; for (const k of Object.keys(d)) { if (k.includes('.')) { const [a, b] = k.split('.'); o[a] = Object.assign({}, o[a], { [b]: d[k] }); } else o[k] = d[k]; } }, delete: async () => { delete st[c][id]; } });
  return { st, collection: (c) => ({ doc: (id) => ref(c, id || 'auto' + (++n)), add: async (d) => { const id = 'a' + (++n); (st[c] = st[c] || {})[id] = d; return { id }; } }) };
}
const SECRET = 's'.repeat(40);
const SERVICES = [{ service: 1, name: 'Followers <b>test</b>', category: 'Instagram', rate: '2.00', min: '50', max: '10000' }, { service: 'x/y', name: 'bad', rate: '1' }, { service: 2, name: 'Likes', category: 'Instagram', rate: '0.5', min: '10', max: '5000' }];
function setup(handler) {
  const db = fakeDb(); const calls = [];
  db.st.mini_sites = { u1: { status: 'published' } };
  const request = async (o) => { const p = Object.fromEntries(new URLSearchParams(o.body)); calls.push({ url: o.url, p }); return { status: 200, text: JSON.stringify(handler(p)) }; };
  return { db, calls, sp: createSitePanel({ db, secret: SECRET, request, push: async () => {} }) };
}

test('calculs et validations', () => {
  assert.strictEqual(sellPrice(2, 30), 2.6); assert.strictEqual(sellPrice(2, -5), 2); assert.strictEqual(sellPrice(1, 99999), 11);
  assert.strictEqual(orderTotal(2.6, 500), 1.3);
  const l = parseServices(SERVICES); assert.strictEqual(l.length, 2); assert.ok(!/[<>]/.test(l[0].name));
  assert.throws(() => parseServices({ error: 'x' }));
  const it = { min: 50, max: 100 };
  assert.throws(() => validateOrder(it, 10, 'https://a.b/c')); assert.throws(() => validateOrder(it, 60, 'http://a.b')); assert.throws(() => validateOrder(it, 60, 'a b'));
  assert.deepStrictEqual(validateOrder(it, '60', '@moncompte'), { qty: 60, link: '@moncompte' });
  assert.strictEqual(parseOrderResult({ order: 123 }), '123'); assert.throws(() => parseOrderResult({ error: 'Not enough funds' }), /Not enough/); assert.throws(() => parseOrderResult({}));
});

test('connexion : clé chiffrée, jamais renvoyée, adresse interne refusée', async () => {
  const { db, sp } = setup(() => ({ balance: '12.5', currency: 'USD' }));
  await assert.rejects(() => sp.save('u1', { url: 'https://127.0.0.1/api', key: 'abcdefgh12345' }));
  await assert.rejects(() => sp.save('u1', { url: 'http://monpanel.com/api', key: 'abcdefgh12345' }));
  await sp.save('u1', { url: 'https://monpanel.com/api/v2', key: 'abcdefgh12345' });
  assert.ok(!JSON.stringify(db.st.site_api_conns).includes('abcdefgh12345'));
  const g = await sp.get('u1'); assert.strictEqual(g.connected, true); assert.ok(!JSON.stringify(g).includes('abcdefgh'));
  assert.strictEqual(g.keyMask, '••••2345');
  assert.deepStrictEqual((await sp.test('u1')).balance, '12.5');
  await sp.save('u1', { url: 'https://monpanel.com/api/v2' }); // la clé existante est conservée
  await assert.rejects(() => setup(() => ({})).sp.test('u1'), /Connectez/);
});

test('publication, commande visiteur, envoi par le propriétaire, aucun envoi automatique', async () => {
  const { db, calls, sp } = setup((p) => p.action === 'services' ? SERVICES : p.action === 'add' ? { order: 777 } : p.action === 'status' ? { status: 'Completed', remains: '0', start_count: '10' } : { balance: '1' });
  await sp.save('u1', { url: 'https://monpanel.com/api/v2', key: 'abcdefgh12345' });
  await assert.rejects(() => sp.publish('u1', { on: true, ids: ['999'] }), /au moins/);
  const pub = await sp.publish('u1', { on: true, markup: 50, ids: ['1', '2', 'zzz', '1'], title: 'Boost' });
  assert.deepStrictEqual(pub.panel.items.map((x) => x.price), [3, 0.75]);
  assert.ok(!JSON.stringify(db.st.mini_sites.u1).includes('"cost"') && !JSON.stringify(db.st.mini_sites.u1).includes('abcdefgh'));
  await assert.rejects(() => sp.publicOrder('u1', { serviceId: '1', quantity: 5, link: '@a', name: 'A', contact: '+243810000000' }), /Quantité/);
  await assert.rejects(() => sp.publicOrder('u1', { serviceId: '42', quantity: 100, link: '@a', name: 'A', contact: '+243810000000' }), /indisponible/);
  const r = await sp.publicOrder('u1', { serviceId: '1', quantity: 1000, link: '@kinshasa_vibes', name: 'Joël', contact: '+243810000000' });
  assert.strictEqual(r.total, 3);
  assert.ok(!calls.some((c) => c.p.action === 'add'), 'aucune commande envoyée sans clic du propriétaire');
  const id = Object.keys(db.st.site_leads)[0];
  await assert.rejects(() => sp.send('autre', { leadId: id }), /Connectez|introuvable/);
  assert.strictEqual((await sp.send('u1', { leadId: id })).orderId, '777');
  await assert.rejects(() => sp.send('u1', { leadId: id }), /Déjà envoyée/);
  assert.strictEqual(calls.filter((c) => c.p.action === 'add').length, 1);
  await sp.status('u1', { leadId: id }); assert.strictEqual(db.st.site_leads[id].status, 'done');
  await sp.publish('u1', { on: false, ids: ['1'] });
  await assert.rejects(() => sp.publicOrder('u1', { serviceId: '1', quantity: 1000, link: '@a', name: 'A', contact: '+243810000000' }), /non disponible/);
  await sp.disconnect('u1'); assert.strictEqual(db.st.mini_sites.u1.panel.on, false);
});
