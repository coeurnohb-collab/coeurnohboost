// api/_lib/balance-guard.js
// CONTRÔLE DES SOLDES : détecte un solde modifié sans passer par le serveur (par exemple depuis un navigateur
// si les règles Firestore le permettaient par erreur).
//
// PRINCIPE : chaque mouvement d'argent fait par le serveur (recharge, achat, commande, retrait, remboursement…)
// écrit une ligne dans « wallet_transactions » avec « balanceAfter » (le solde juste après), dans la MÊME
// transaction que la modification du solde. Donc le solde actuel d'une personne doit être égal au « balanceAfter »
// de son dernier mouvement. Si ce n'est pas le cas, le solde a été touché ailleurs → alerte.
//
// - Examine un lot de comptes à chaque passage (curseur rangé dans app_config/balance_guard), appelé par la
//   tâche quotidienne déjà existante ET à la demande depuis l'espace admin (bouton « Contrôler maintenant »).
// - NE MODIFIE JAMAIS un solde : il ne fait que signaler. La liste (50 au plus) est rangée dans
//   app_config/balance_guard, que l'espace admin lit déjà (aucune nouvelle règle Firestore nécessaire).
// - Un compte avec un solde mais AUCUN mouvement est compté à part (« sans relevé ») : cela peut être un ancien
//   compte d'avant le relevé, ou un solde posé à la main : à l'administrateur de juger.

const MAX_ALERTS = 50;
const TOLERANCE = 0.02;      // arrondis
const TIE_MS = 3000;         // deux mouvements presque simultanés : l'ordre exact n'est pas fiable

function money(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function ms(v) { const t = typeof v === 'number' ? v : Date.parse(v || ''); return Number.isFinite(t) ? t : 0; }

// 'ok' | 'mismatch' | 'noledger'  (pur, testable)
function judge(balance, entries) {
  const b = money(balance);
  if (!(b > 0) && !entries.length) return { verdict: 'ok' };
  if (!entries.length) return b > 0 ? { verdict: 'noledger' } : { verdict: 'ok' };
  const sorted = entries.slice().sort((x, y) => ms(y.createdAt) - ms(x.createdAt));
  const top = sorted[0];
  const near = sorted.filter((e) => ms(top.createdAt) - ms(e.createdAt) <= TIE_MS);
  if (near.some((e) => Math.abs(money(e.balanceAfter) - b) <= TOLERANCE)) return { verdict: 'ok' };
  return { verdict: 'mismatch', ledger: money(top.balanceAfter), lastTxAt: top.createdAt || null };
}

async function runBalanceGuard({ db, now = Date.now(), maxUsers = 300, budgetMs = 6000, FieldPath }) {
  const cfgRef = db.collection('app_config').doc('balance_guard');
  const cfgSnap = await cfgRef.get();
  const cfg = (cfgSnap.exists && cfgSnap.data()) || {};
  const started = Date.now();

  let q = db.collection('users').orderBy(FieldPath.documentId()).limit(maxUsers);
  if (cfg.cursor) q = q.startAfter(cfg.cursor);
  const page = await q.get();
  const docs = page.docs || [];

  const alerts = Array.isArray(cfg.alerts) ? cfg.alerts.filter((a) => a && a.uid) : [];
  const byUid = new Map(alerts.map((a) => [a.uid, a]));
  let scanned = 0, ok = 0, mismatch = 0, noLedger = 0, withBalance = 0, last = cfg.cursor || null, timeUp = false;

  const withMoney = docs.filter((d) => money((d.data() || {}).balance) > 0);
  docs.forEach((d) => { if (!(money((d.data() || {}).balance) > 0)) byUid.delete(d.id); }); // solde revenu à zéro : plus d'alerte
  // les comptes à solde nul n'ont rien à protéger ici (leur solde ne peut pas être « gonflé » sans devenir positif)
  for (let i = 0; i < withMoney.length; i += 15) {
    if (Date.now() - started > budgetMs) { timeUp = true; break; }
    await Promise.all(withMoney.slice(i, i + 15).map(async (d) => {
      const u = d.data() || {};
      withBalance++;
      let entries = [];
      try {
        const s = await db.collection('wallet_transactions').where('uid', '==', d.id).limit(500).get();
        entries = (s.docs || []).map((x) => x.data() || {});
      } catch (e) { return; }
      if (entries.length >= 500) { ok++; return; } // trop de mouvements pour juger sans risque de fausse alerte
      const j = judge(u.balance, entries);
      if (j.verdict === 'ok') { ok++; byUid.delete(d.id); }
      else if (j.verdict === 'noledger') { noLedger++; byUid.set(d.id, { uid: d.id, name: u.name || '', email: u.email || '', balance: money(u.balance), ledger: null, kind: 'noledger', at: new Date(now).toISOString() }); }
      else { mismatch++; byUid.set(d.id, { uid: d.id, name: u.name || '', email: u.email || '', balance: money(u.balance), ledger: j.ledger, lastTxAt: j.lastTxAt, kind: 'mismatch', at: new Date(now).toISOString() }); }
    }));
  }
  scanned = timeUp ? 0 : docs.length;
  if (!timeUp) last = docs.length ? docs[docs.length - 1].id : null;
  const wrapped = !timeUp && docs.length < maxUsers; // fin de la liste : on repart du début au prochain passage

  const list = Array.from(byUid.values()).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'mismatch' ? -1 : 1)).slice(0, MAX_ALERTS);
  const result = { scanned, withBalance, ok, mismatch, noLedger, wrapped, timeUp };
  try {
    await cfgRef.set({
      cursor: timeUp ? (cfg.cursor || null) : (wrapped ? null : last),
      lastRunAt: new Date(now).toISOString(), lastResult: result, alerts: list,
      openMismatch: list.filter((a) => a.kind === 'mismatch').length, openNoLedger: list.filter((a) => a.kind === 'noledger').length
    }, { merge: true });
  } catch (e) { console.error('[balance-guard] écriture :', e && e.message); }
  if (mismatch) console.error('[balance-guard] ALERTE : ' + mismatch + ' solde(s) ne correspondent pas au relevé');
  return result;
}

// ACHATS DE SON PROPRE PRODUIT (lecture seule). Avant le correctif de api/_lib/payments-core.js, un organisateur,
// un formateur ou un créateur de concours qui achetait son propre produit PAYANT recevait de l'argent en plus (le solde
// restait « cohérent » avec le relevé, donc le contrôle ci-dessus ne le voyait pas). On les retrouve ici d'après les
// fiches d'inscription, de billet et de participation, qui gardent l'acheteur ET le vendeur. Ne modifie rien.
function pickSelfDeals({ enrollments, tickets, entries, contests, adminUid }) {
  const out = [];
  const money2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  (enrollments || []).forEach((e) => {
    if (e && e.studentUid && e.studentUid === e.courseOwnerUid && e.studentUid !== adminUid && money2(e.amountPaid) > 0)
      out.push({ kind: 'cours', uid: e.studentUid, amount: money2(e.amountPaid), title: e.courseTitle || '', at: e.createdAt || '' });
  });
  (tickets || []).forEach((t) => {
    if (t && t.buyerUid && t.buyerUid === t.organizerUid && t.buyerUid !== adminUid && money2(t.amountPaid) > 0)
      out.push({ kind: 'billet', uid: t.buyerUid, amount: money2(t.amountPaid), title: t.eventTitle || '', at: t.createdAt || '' });
  });
  (entries || []).forEach((x) => {
    const c = contests && contests[x && x.contestId];
    if (x && x.uid && c && c.organizerUid === x.uid && x.uid !== adminUid && money2(x.amountPaid) > 0)
      out.push({ kind: 'concours', uid: x.uid, amount: money2(x.amountPaid), title: c.title || '', at: x.createdAt || '' });
  });
  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return out;
}

async function findSelfDeals({ db, adminUid, perCollection = 1000 }) {
  const docs = async (q) => ((await q.get()).docs || []).map((d) => d.data() || {});
  const [enrollments, tickets, entries, contestDocs] = await Promise.all([
    docs(db.collection('course_enrollments').limit(perCollection)),
    docs(db.collection('event_tickets').limit(perCollection)),
    docs(db.collection('contest_entries').where('paid', '==', true).limit(perCollection)),
    (async () => (await db.collection('contests').where('type', '==', 'paid').limit(500).get()).docs || [])()
  ]);
  const contests = {};
  contestDocs.forEach((d) => { contests[d.id] = d.data() || {}; });
  const items = pickSelfDeals({ enrollments, tickets, entries, contests, adminUid });
  const partial = [enrollments, tickets, entries].some((a) => a.length >= perCollection) || contestDocs.length >= 500;
  return { count: items.length, total: Math.round(items.reduce((s, x) => s + x.amount, 0) * 100) / 100, items: items.slice(0, 20), partial };
}

module.exports = { runBalanceGuard, judge, pickSelfDeals, findSelfDeals };
