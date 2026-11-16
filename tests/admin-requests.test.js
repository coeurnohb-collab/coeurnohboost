// Retraits et domaines traités par l'administrateur : le SERVEUR fait tout, une seule fois par demande.
// Avant : l'admin changeait le solde depuis son navigateur sans vérifier l'état de la demande.
//  - un double clic (ou deux onglets) pouvait rembourser DEUX fois : de l'argent créé ;
//  - le refus d'un domaine rendait l'argent au client SANS le reprendre à l'administrateur : de l'argent créé aussi.
// Le faux Firestore ci-dessous reproduit la vraie règle : une transaction qui a lu un document modifié entre-temps est rejouée.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');
const fs = require('fs');

const ADMIN = '8BqWONj07hVZePHe2DrkHWYRjse2';
const store = {}; const ver = {};
let autoId = 0;
const col = (n) => (store[n] = store[n] || {});
const vk = (c, id) => c + '/' + id;
const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
function bump(r) { ver[vk(r._c, r._id)] = (ver[vk(r._c, r._id)] || 0) + 1; }
function applyWrite(kind, r, data) {
  const c = col(r._c);
  if (kind === 'set') c[r._id] = clone(data);
  else {
    if (!c[r._id]) throw new Error('NOT_FOUND ' + r._c + '/' + r._id);
    c[r._id] = Object.assign({}, c[r._id], clone(data));
  }
  bump(r);
}
function mkRef(c, id) {
  const r = { _c: c, _id: id, id };
  r.get = async () => ({ exists: col(c)[id] !== undefined, id, data: () => clone(col(c)[id]) });
  r.set = async (d) => applyWrite('set', r, d);
  r.update = async (u) => applyWrite('update', r, u);
  return r;
}
const fakeDb = {
  collection(name) { return { doc(id) { return mkRef(name, id || 'auto' + (++autoId)); }, add: async (d) => { const r = mkRef(name, 'auto' + (++autoId)); await r.set(d); return r; } }; },
  async runTransaction(fn) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const writes = [], seen = [];
      const tx = {
        get: async (r) => {
          if (writes.length) throw new Error('Firestore : toutes les lectures doivent précéder les écritures');
          seen.push([r, ver[vk(r._c, r._id)] || 0]);
          return r.get();
        },
        set: (r, d) => { writes.push(['set', r, d]); },
        update: (r, u) => { writes.push(['update', r, u]); }
      };
      const out = await fn(tx);
      // Validation au moment de l'écriture (comme Firestore) : un document lu a changé → on rejoue.
      if (seen.some(([r, v]) => (ver[vk(r._c, r._id)] || 0) !== v)) continue;
      writes.forEach(([k, r, d]) => applyWrite(k, r, d));
      return out;
    }
    throw new Error('trop de conflits');
  }
};

const orig = Module._load;
Module._load = function (request) {
  if (request === 'firebase-admin') {
    return {
      apps: [1], initializeApp() {}, credential: { cert() {} }, auth() { return {}; },
      firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => ({ __inc: n }), serverTimestamp: () => new Date().toISOString(), delete: () => null }, FieldPath: {} })
    };
  }
  if (/(^|[\\/])push(\.js)?$/.test(request)) return { sendPushToUser: async () => {}, sendMulticast: async () => {} };
  const mod = orig.apply(this, arguments);
  if (/(^|[\\/])security(\.js)?$/.test(request)) {
    return Object.assign({}, mod, {
      initFirebaseAdmin() {},
      verifyCaller: async (req) => ({ uid: req.body.__uid, isAdmin: req.body.__uid === ADMIN }),
      enforceRateLimit: async () => {}
    });
  }
  return mod;
};
const handler = require(path.join(__dirname, '..', 'api', 'payments-actions.js'));
const notify = require(path.join(__dirname, '..', 'api', 'notify-user.js'));

async function act(uid, body) {
  const out = {};
  const res = { status(c) { out.code = c; return this; }, json(j) { out.body = j; return this; }, setHeader() {} };
  await handler({ method: 'POST', headers: {}, body: Object.assign({ __uid: uid }, body) }, res);
  return out.body;
}
const adm = (op, id, extra) => act(ADMIN, Object.assign({ action: 'admin_manage', op, id }, extra || {}));
const bal = (u) => col('users')[u].balance;
const total = () => Math.round(Object.values(col('users')).reduce((s, u) => s + u.balance, 0) * 100) / 100;
const ledger = (type) => Object.values(col('wallet_transactions')).filter((x) => x.type === type);

function reset() {
  Object.keys(store).forEach((k) => delete store[k]); Object.keys(ver).forEach((k) => delete ver[k]);
  store.users = { seller: { balance: 20, name: 'Vendeur' }, owner: { balance: 100, name: 'Propriétaire' }, [ADMIN]: { balance: 0, name: 'Admin' } };
  store.withdrawal_requests = {
    w1: { uid: 'seller', sellerName: 'Vendeur', method: 'Airtel Money', accountDetails: '0999', amountUSD: 30, status: 'pending', createdAt: '2026-11-01T00:00:00Z' },
    wp: { uid: 'seller', source: 'panel', method: 'MTN', accountDetails: '0888', amountUSD: 50, feeUSD: 5, netUSD: 45, status: 'pending', createdAt: '2026-11-02T00:00:00Z' }
  };
}

/* ---------- Retraits ---------- */
test('retrait refusé : le vendeur est remboursé UNE seule fois, le montant vient de la demande enregistrée', async () => {
  reset();
  // Le navigateur essaie d'imposer un autre montant : ignoré.
  const r = await adm('wd_reject', 'w1', { amount: 99999, uid: 'owner' });
  assert.strictEqual(r.success, true, r.error);
  assert.strictEqual(bal('seller'), 50); assert.strictEqual(bal('owner'), 100);
  assert.strictEqual(col('withdrawal_requests').w1.status, 'rejected');
  assert.strictEqual(ledger('withdrawal_rejected_refund').length, 1);
  assert.strictEqual(ledger('withdrawal_rejected_refund')[0].balanceAfter, 50);
});

test('retrait refusé deux fois (double clic, deux onglets) : le 2e est bloqué, aucun argent créé', async () => {
  reset();
  assert.strictEqual((await adm('wd_reject', 'w1')).success, true);
  const again = await adm('wd_reject', 'w1');
  assert.strictEqual(again.success, false); assert.match(again.error, /déjà été traitée/);
  assert.strictEqual(bal('seller'), 50); assert.strictEqual(ledger('withdrawal_rejected_refund').length, 1);
});

test('retrait refusé EN MÊME TEMPS par deux appareils : un seul remboursement (la transaction est rejouée)', async () => {
  reset();
  const [a, b] = await Promise.all([adm('wd_reject', 'w1'), adm('wd_reject', 'w1')]);
  assert.strictEqual([a, b].filter((x) => x.success).length, 1, JSON.stringify([a, b]));
  assert.strictEqual(bal('seller'), 50); assert.strictEqual(ledger('withdrawal_rejected_refund').length, 1);
});

test('retrait déjà payé : impossible de le rembourser ensuite ; retrait déjà refusé : impossible de le marquer payé', async () => {
  reset();
  assert.strictEqual((await adm('wd_paid', 'w1')).success, true);
  assert.strictEqual(col('withdrawal_requests').w1.status, 'paid');
  const rej = await adm('wd_reject', 'w1');
  assert.strictEqual(rej.success, false); assert.strictEqual(bal('seller'), 20);
  assert.strictEqual((await adm('wd_reject', 'wp')).success, true);
  const paid = await adm('wd_paid', 'wp');
  assert.strictEqual(paid.success, false); assert.strictEqual(col('withdrawal_requests').wp.status, 'rejected');
});

test('retrait du panel refusé : on rend le montant TOTAL demandé (commission comprise), pas seulement le net', async () => {
  reset();
  await adm('wd_reject', 'wp');
  assert.strictEqual(bal('seller'), 70);
});

test('retrait : seul l\'administrateur peut traiter ; demande inconnue ou identifiant bizarre refusés', async () => {
  reset();
  const r = await act('seller', { action: 'admin_manage', op: 'wd_reject', id: 'w1' });
  assert.strictEqual(r.success, false); assert.match(r.error, /réservé/i);
  assert.strictEqual(bal('seller'), 20); assert.strictEqual(col('withdrawal_requests').w1.status, 'pending');
  assert.strictEqual((await adm('wd_reject', 'nexistepas')).success, false);
  assert.strictEqual((await adm('wd_reject', 'a/b')).success, false);
  assert.strictEqual((await adm('wd_inconnu', 'w1')).success, false);
});

/* ---------- Domaines ---------- */
function domainReset() {
  reset();
  // Etat juste après l'achat : le client a payé 24 $, l'administrateur a reçu 24 $.
  store.users.owner.balance = 76; store.users[ADMIN].balance = 24;
  store.domain_purchase_requests = { owner: { uid: 'owner', desiredDomain: 'monsite.com', status: 'pending', pricePaid: 24, planLabel: '12 mois', months: 12, createdAt: '2026-11-03T00:00:00Z' } };
}

test('domaine refusé : le client est remboursé ET la part de l\'administrateur est reprise (rien ne se crée), une seule fois', async () => {
  domainReset(); const before = total();
  const r = await adm('dom_reject', 'owner', { amount: 5000 });
  assert.strictEqual(r.success, true, r.error);
  assert.strictEqual(bal('owner'), 100); assert.strictEqual(bal(ADMIN), 0);
  assert.strictEqual(total(), before, 'la somme de tous les soldes ne bouge pas');
  assert.strictEqual(col('domain_purchase_requests').owner.status, 'rejected');
  assert.strictEqual(ledger('site_domain_purchase_rejected_refund').length, 1);
  const rev = ledger('site_domain_purchase_income_reversed');
  assert.strictEqual(rev.length, 1); assert.strictEqual(rev[0].amount, -24); assert.strictEqual(rev[0].uid, ADMIN);
  const again = await adm('dom_reject', 'owner');
  assert.strictEqual(again.success, false); assert.strictEqual(bal('owner'), 100); assert.strictEqual(bal(ADMIN), 0);
});

test('domaine refusé par deux appareils en même temps : un seul remboursement', async () => {
  domainReset(); const before = total();
  const [a, b] = await Promise.all([adm('dom_reject', 'owner'), adm('dom_reject', 'owner')]);
  assert.strictEqual([a, b].filter((x) => x.success).length, 1);
  assert.strictEqual(bal('owner'), 100); assert.strictEqual(total(), before);
});

test('domaine activé : la date de fin suit la durée PAYÉE (lue dans la demande), puis plus de remboursement possible', async () => {
  domainReset();
  store.domain_purchase_requests.owner.months = 6;
  const t0 = Date.now();
  const r = await adm('dom_activate', 'owner', { months: 120 }); // la durée envoyée par la page est ignorée
  assert.strictEqual(r.success, true, r.error);
  const d = col('domain_purchase_requests').owner;
  assert.strictEqual(d.status, 'active');
  const days = (Date.parse(d.expiresAt) - t0) / 86400000;
  assert.ok(days > 179.9 && days < 180.1, 'durée en jours : ' + days);
  const rej = await adm('dom_reject', 'owner');
  assert.strictEqual(rej.success, false);
  assert.strictEqual(bal('owner'), 76); assert.strictEqual(bal(ADMIN), 24);
  assert.strictEqual((await adm('dom_activate', 'owner')).success, false, 'pas de double activation');
});

test('domaine refusé puis activé : bloqué (le client a déjà été remboursé)', async () => {
  domainReset();
  await adm('dom_reject', 'owner');
  const r = await adm('dom_activate', 'owner');
  assert.strictEqual(r.success, false); assert.strictEqual(col('domain_purchase_requests').owner.status, 'rejected');
});

test('parcours complet : achat réel par le portefeuille puis refus → le total des soldes est exactement le même qu\'au départ', async () => {
  reset(); delete store.withdrawal_requests;
  store.mini_sites = { owner: { status: 'draft', businessName: 'Mon site' } };
  const before = total();
  const buy = await act('owner', { action: 'site_domain_purchase', desiredDomain: 'exemple-test.com', months: 12 });
  assert.strictEqual(buy.success !== false, true, buy.error);
  const paid = col('domain_purchase_requests').owner.pricePaid;
  assert.ok(paid > 0);
  assert.strictEqual(bal('owner'), Math.round((100 - paid) * 100) / 100); assert.strictEqual(bal(ADMIN), paid);
  assert.strictEqual(total(), before);
  assert.strictEqual((await adm('dom_reject', 'owner')).success, true);
  assert.strictEqual(bal('owner'), 100); assert.strictEqual(bal(ADMIN), 0); assert.strictEqual(total(), before);
});

/* ---------- Demande de retrait du vendeur (montant) ---------- */
async function requestWithdrawal(uid, amount) {
  const out = {};
  const res = { status(c) { out.code = c; return this; }, json(j) { out.body = j; return this; }, setHeader() {}, end() { return this; } };
  await notify({ method: 'POST', headers: {}, query: {}, body: { __uid: uid, action: 'request-withdrawal', idToken: 'x', amount, method: 'Airtel Money', accountDetails: '0999000111' } }, res);
  return out;
}

test('demande de retrait vendeur : montant arrondi au centime ; 0,004 $, négatif, infini, texte ou énorme refusés', async () => {
  reset(); delete store.withdrawal_requests;
  for (const bad of [0.004, 0, -5, Infinity, 'abc', null, 1e9]) {
    const r = await requestWithdrawal('seller', bad);
    assert.strictEqual(r.code, 400, 'montant ' + String(bad) + ' → ' + JSON.stringify(r));
  }
  assert.strictEqual(bal('seller'), 20); assert.strictEqual(Object.keys(col('withdrawal_requests')).length, 0);
  const ok = await requestWithdrawal('seller', 7.5);
  assert.strictEqual(ok.body.success, true, JSON.stringify(ok));
  assert.strictEqual(bal('seller'), 12.5);
  const w = Object.values(col('withdrawal_requests'))[0];
  assert.strictEqual(w.amountUSD, 7.5); assert.strictEqual(w.status, 'pending');
  const tooMuch = await requestWithdrawal('seller', 500);
  assert.strictEqual(tooMuch.body.success, false); assert.strictEqual(bal('seller'), 12.5);
});

/* ---------- La page admin appelle le serveur ---------- */
test('admin.js : les 4 boutons (payé, rejeter retrait, actif, rejeter domaine) passent par le serveur, plus aucune écriture de solde dans le navigateur', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
  const fn = (name) => { const i = src.indexOf('async function ' + name + '('); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.match(fn('markWithdrawalPaid'), /adminManageCall\(null, reqId, 'wd_paid'\)/);
  assert.match(fn('rejectWithdrawal'), /adminManageCall\(null, reqId, 'wd_reject'\)/);
  assert.match(fn('activateDomain'), /adminManageCall\(null, uid, 'dom_activate'\)/);
  assert.match(fn('rejectDomain'), /adminManageCall\(null, uid, 'dom_reject'\)/);
  ['markWithdrawalPaid', 'rejectWithdrawal', 'activateDomain', 'rejectDomain'].forEach((n) => {
    assert.doesNotMatch(fn(n), /balance|runTransaction|wallet_transactions/, n + ' ne doit plus toucher au solde');
  });
});

/* ---------- Taux de change : garde-fou ---------- */
const sp = require('../api/_lib/saspay');

test('taux de change : un taux absurde (0, négatif, texte, 3 fois trop petit ou grand) est écarté au profit du taux de secours', () => {
  assert.strictEqual(sp.saneRate(590, 600), 590, 'un taux normal est gardé');
  assert.strictEqual(sp.saneRate(2750, 2800), 2750);
  assert.strictEqual(sp.saneRate(28, 2800), 2800, 'cent fois trop petit : le client paierait 100 fois moins');
  assert.strictEqual(sp.saneRate(900000, 2800), 2800);
  assert.strictEqual(sp.saneRate(0, 600), 600); assert.strictEqual(sp.saneRate(-3, 600), 600);
  assert.strictEqual(sp.saneRate('abc', 600), 600); assert.strictEqual(sp.saneRate(NaN, 600), 600); assert.strictEqual(sp.saneRate(Infinity, 600), 600);
  assert.strictEqual(sp.saneRate(undefined, 600), 600);
  assert.strictEqual(sp.saneRate(12.4, undefined), 12.4, 'sans taux de secours connu, un taux positif est accepté');
  assert.strictEqual(sp.saneRate(0, undefined), null); assert.strictEqual(sp.saneRate(undefined, undefined), null);
});

test('taux de change SasPay : usdRate applique le garde-fou aux taux reçus en direct', async () => {
  const real = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ result: 'success', rates: { CDF: 28, XOF: 590, KES: -5, GHS: 11 } }) });
  try {
    assert.strictEqual(await sp.usdRate('CDF'), 2800, 'taux absurde → secours');
    assert.strictEqual(await sp.usdRate('XOF'), 590, 'taux normal → gardé');
    assert.strictEqual(await sp.usdRate('KES'), 129, 'taux négatif → secours');
    assert.strictEqual(await sp.usdRate('GHS'), 11);
    assert.strictEqual(await sp.usdRate('USD'), 1);
    assert.strictEqual(await sp.usdRate('ZZZ'), null, 'devise inconnue : pas de taux, donc pas de paiement');
  } finally { global.fetch = real; }
});

test('MbotePay : même garde-fou, et jamais de taux « 1 » par défaut (le client aurait payé 1 franc pour 1 dollar)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'payment-initiate.js'), 'utf8');
  assert.match(src, /saspay\.saneRate\(data\.rates\[currency\], FALLBACK_RATES\[currency\]\)/);
  assert.doesNotMatch(src, /FALLBACK_RATES\[currency\] \|\| 1;/);
  assert.match(src, /if \(!rate\) return await mobileUnavailable\(uid, 'unavailable'\);/);
});
