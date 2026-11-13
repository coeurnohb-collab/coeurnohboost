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

module.exports = { runBalanceGuard, judge };
