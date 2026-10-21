// api/_lib/panel-payouts.js
// RETRAITS DES GAINS des proprietaires de panels + OUTILS ADMIN (vue d'ensemble, suspension, reglages).
//
// Principe : seul l'argent GAGNE avec le panel (marges + parrainage) peut etre retire — jamais l'argent recharge.
// Un gain est « retirable » quand :
//   - la commande est terminee, ou livree depuis plus de `holdHours` heures (delai de securite contre les litiges/remboursements) ;
//   - la commande n'a pas ete remboursee ;
//   - la commande n'a pas ete passee par le proprietaire lui-meme (anti auto-commande).
// Le montant demande est debite tout de suite du solde (comme les retraits vendeurs), la demande apparait dans
// l'onglet admin « Retraits vendeurs » ; un refus de l'admin rembourse le solde automatiquement.
// Aucune ecriture ne se fait depuis le navigateur : tout passe par le serveur (SDK admin), aucune regle Firestore a modifier.
const crypto = require('crypto');
const { buildWalletTxEntry } = require('./wallet-ledger');

const ADMIN_UID = '8BqWONj07hVZePHe2DrkHWYRjse2';
const DEFAULTS = { enabled: true, minUsd: 5, maxUsd: 500, feePct: 3, holdHours: 72, autoMaxUsd: 20, newAccountDays: 7, dailyLimit: 3 };
const METHODS = {
  airtel: { label: 'Airtel Money', kind: 'phone' }, mtn: { label: 'MTN Mobile Money', kind: 'phone' },
  orange: { label: 'Orange Money', kind: 'phone' }, mpesa: { label: 'M-Pesa', kind: 'phone' },
  'usdt-trc20': { label: 'USDT (TRC20)', kind: 'trc20' }, 'usdt-bep20': { label: 'USDT (BEP20)', kind: 'bep20' }
};

const num = (v, d) => { if (v == null || v === '') return d; const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : d; };
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const r2 = (x) => Math.round(x * 100) / 100;
const cents = (x) => Math.round(x * 100);

function createPanelPayouts({ db, admin, push }) {
  async function settings() {
    try {
      const s = await db.collection('settings').doc('panel_payouts').get();
      const d = s.exists ? s.data() : {};
      const pick = (k, lo, hi) => { const v = num(d[k], DEFAULTS[k]); return Math.min(Math.max(v, lo), hi); };
      return { enabled: d.enabled !== false, minUsd: pick('minUsd', 1, 1000), maxUsd: pick('maxUsd', 5, 5000), feePct: pick('feePct', 0, 30), holdHours: pick('holdHours', 0, 720), autoMaxUsd: pick('autoMaxUsd', 0, 5000), newAccountDays: pick('newAccountDays', 0, 90), dailyLimit: Math.floor(pick('dailyLimit', 1, 20)) };
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }

  // Calcule ce que le proprietaire peut retirer (en centimes pour eviter les erreurs d'arrondi).
  async function compute(uid, st) {
    const now = Date.now(), holdMs = st.holdHours * 3600 * 1000;
    const [own, ref, wds, usr] = await Promise.all([
      db.collection('orders').where('ownerUid', '==', uid).limit(3000).get(),
      db.collection('orders').where('refUid', '==', uid).limit(1000).get(),
      db.collection('withdrawal_requests').where('uid', '==', uid).limit(300).get(),
      db.collection('users').doc(uid).get()
    ]);
    let matureC = 0, holdC = 0, total = 0, refunded = 0, review = 0;
    const mature = (o) => o.status === 'completed' || (['processing', 'partial'].includes(o.status) && now - Date.parse(o.createdAt || 0) >= holdMs);
    own.forEach((x) => {
      const o = x.data(); if (o.source !== 'panel') return; total++;
      if (o.refunded === true || o.status === 'refunded') { refunded++; return; }
      if (o.status === 'pending_review') review++;
      if (!o.ownerCredited || o.uid === uid) return;
      const share = cents((o.margin || 0) - (o.refCredited ? (o.refBonus || 0) : 0));
      if (share <= 0) return;
      if (mature(o)) matureC += share; else holdC += share;
    });
    ref.forEach((x) => {
      const o = x.data(); if (o.source !== 'panel' || !o.refCredited || o.refunded === true || o.uid === uid) return;
      const b = cents(o.refBonus || 0); if (b <= 0) return;
      if (mature(o)) matureC += b; else holdC += b;
    });
    let withdrawnC = 0, pendingC = 0; const history = []; let todayCount = 0, paidCount = 0, hasPending = false;
    wds.forEach((x) => {
      const w = x.data(); if (w.source !== 'panel') return;
      if (w.status === 'pending' || w.status === 'paid') { withdrawnC += cents(w.amountUSD || 0); if (w.status === 'pending') { pendingC += cents(w.amountUSD || 0); hasPending = true; } else paidCount++; }
      if (Date.now() - Date.parse(w.createdAt || 0) < 86400000) todayCount++;
      history.push({ id: x.id, amount: w.amountUSD, net: w.netUSD != null ? w.netUSD : w.amountUSD, fee: w.feeUSD || 0, method: w.method, status: w.status, createdAt: w.createdAt });
    });
    history.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const balC = cents((usr.exists && usr.data().balance) || 0);
    const availC = Math.max(0, Math.min(matureC - withdrawnC, balC));
    return { availC, holdC, matureC, withdrawnC, pendingC, balC, total, refunded, review, history: history.slice(0, 20), todayCount, paidCount, hasPending, user: usr.exists ? usr.data() : null };
  }

  async function info(uid) {
    const st = await settings(); const c = await compute(uid, st);
    return { success: true, settings: { enabled: st.enabled, minUsd: st.minUsd, maxUsd: st.maxUsd, feePct: st.feePct, holdHours: st.holdHours },
      available: c.availC / 100, onHold: c.holdC / 100, withdrawn: c.withdrawnC / 100, pending: c.pendingC / 100, balance: c.balC / 100,
      canRequest: st.enabled && !c.hasPending && c.availC >= cents(st.minUsd), hasPending: c.hasPending, history: c.history,
      methods: Object.keys(METHODS).map((k) => ({ id: k, label: METHODS[k].label, kind: METHODS[k].kind })) };
  }

  function validateAccount(m, b) {
    const meta = METHODS[m]; if (!meta) throw new Error('Choisis un moyen de retrait.');
    if (meta.kind === 'phone') {
      let digits = String(b.account || '').replace(/[^\d]/g, ''); if (digits.length < 9 || digits.length > 15) throw new Error('Numéro invalide : indique-le avec l’indicatif du pays (ex. 243812345678).');
      const name = clean(b.holderName, 60); if (name.length < 2) throw new Error('Indique le nom inscrit sur ce numéro.');
      return '+' + digits + ' — ' + name;
    }
    const addr = String(b.account || '').trim();
    if (meta.kind === 'trc20' && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) throw new Error('Adresse TRC20 invalide (elle commence par T et fait 34 caractères).');
    if (meta.kind === 'bep20' && !/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error('Adresse BEP20 invalide (elle commence par 0x et fait 42 caractères).');
    return addr;
  }

  async function request(uid, b) {
    const st = await settings(); if (!st.enabled) throw new Error('Les retraits sont momentanément suspendus.');
    const m = String(b.method || ''); const account = validateAccount(m, b);
    const amtC = cents(num(b.amount, NaN)); if (!(amtC > 0)) throw new Error('Montant invalide.');
    if (amtC < cents(st.minUsd)) throw new Error('Montant minimum : ' + st.minUsd + ' $.');
    if (amtC > cents(st.maxUsd)) throw new Error('Montant maximum par demande : ' + st.maxUsd + ' $.');
    const c = await compute(uid, st);
    if (c.hasPending) throw new Error('Tu as déjà une demande en cours de traitement. Attends son paiement pour en faire une autre.');
    if (c.todayCount >= st.dailyLimit) throw new Error('Limite de demandes atteinte pour aujourd’hui. Réessaie demain.');
    if (amtC > c.availC) throw new Error('Montant supérieur à tes gains retirables (' + (c.availC / 100).toFixed(2) + ' $).');
    const site = await db.collection('mini_sites').doc(uid).get();
    if (!site.exists || site.data().status !== 'published') throw new Error('Ton site doit être publié pour retirer tes gains.');
    if (site.data().mpanel && site.data().mpanel.suspended) throw new Error('Ton panel est suspendu : contacte le support.');

    const feeC = Math.round(amtC * st.feePct / 100), netC = amtC - feeC;
    const reasons = [];
    if (amtC > cents(st.autoMaxUsd)) reasons.push('Montant supérieur à ' + st.autoMaxUsd + ' $');
    if (c.paidCount === 0) reasons.push('Premier retrait');
    const created = c.user && c.user.createdAt ? Date.parse(c.user.createdAt) : 0;
    if (!created || Date.now() - created < st.newAccountDays * 86400000) reasons.push('Compte de moins de ' + st.newAccountDays + ' jours');
    if (c.total >= 5 && c.refunded / c.total > 0.25) reasons.push('Beaucoup de commandes remboursées (' + c.refunded + '/' + c.total + ')');
    if (c.review >= 3) reasons.push(c.review + ' commandes en vérification');
    try { const au = await admin.auth().getUser(uid); if (!au.emailVerified) reasons.push('E-mail non vérifié'); } catch (e) { /* ignore */ }

    const rid = clean(b.requestId, 64) || crypto.randomBytes(10).toString('hex');
    const reqRef = db.collection('withdrawal_requests').doc('pw' + crypto.createHash('sha256').update(uid + '|' + rid).digest('hex').slice(0, 24));
    const userRef = db.collection('users').doc(uid), lockRef = db.collection('panel_payout_state').doc(uid);
    let dup = false, newBalance = 0;
    await db.runTransaction(async (tx) => {
      const [r, u, lk] = await Promise.all([tx.get(reqRef), tx.get(userRef), tx.get(lockRef)]);
      if (r.exists) { dup = true; return; }
      if (!u.exists) throw new Error('Compte introuvable.');
      if (lk.exists && Date.now() - Date.parse(lk.data().lastAt || 0) < 60000) throw new Error('Une demande vient d’être envoyée. Patiente une minute.');
      if (cents(u.data().balance || 0) < amtC) throw new Error('Solde insuffisant.');
      newBalance = r2((cents(u.data().balance || 0) - amtC) / 100);
      tx.update(userRef, { balance: newBalance });
      tx.set(lockRef, { lastAt: new Date().toISOString() });
      tx.set(reqRef, {
        uid, sellerName: clean(u.data().name || 'Propriétaire de panel', 100), source: 'panel', panelSlug: site.data().slug || '',
        method: METHODS[m].label, accountDetails: account, amountUSD: amtC / 100, feePct: st.feePct, feeUSD: feeC / 100, netUSD: netC / 100,
        risk: { level: reasons.length ? 'review' : 'standard', reasons }, status: 'pending', createdAt: new Date().toISOString()
      });
      tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'withdrawal_request', amount: -(amtC / 100), balanceAfter: newBalance, description: 'Retrait gains panel (' + METHODS[m].label + ')', relatedId: reqRef.id }));
    });
    if (!dup && push) { try { await push(ADMIN_UID, 'Retrait panel à payer', (netC / 100).toFixed(2) + ' $ net — ' + METHODS[m].label + (reasons.length ? ' · À vérifier' : ''), '/admin.html', { category: 'activity' }); } catch (e) { /* ignore */ } }
    return { success: true, duplicate: dup, net: netC / 100, fee: feeC / 100, newBalance, review: reasons.length > 0 };
  }

  /* ------------------------- ADMIN ------------------------- */
  function needAdmin(uid) { if (uid !== ADMIN_UID) throw Object.assign(new Error('Accès réservé à l’administrateur.'), { status: 403 }); }

  async function adminOverview(uid) {
    needAdmin(uid);
    const [sites, ords, st] = await Promise.all([db.collection('mini_sites').where('mpanel.on', '==', true).limit(300).get(), db.collection('orders').where('source', '==', 'panel').limit(5000).get(), settings()]);
    const by = {}; const review = [];
    ords.forEach((x) => {
      const o = x.data(), k = o.panelSlug || '?'; const a = by[k] || (by[k] = { orders: 0, sales: 0, margin: 0, refunded: 0, review: 0, last: '' });
      a.orders++; if (o.refunded || o.status === 'refunded') a.refunded++; else { a.sales += o.price || 0; if (o.ownerCredited) a.margin += o.margin || 0; }
      if (o.status === 'pending_review') { a.review++; review.push({ id: x.id, slug: k, service: (o.platform || '') + ' — ' + (o.service || ''), price: o.price, createdAt: o.createdAt, reason: o.debugReason || '' }); }
      if (String(o.createdAt || '') > a.last) a.last = o.createdAt;
    });
    const panels = sites.docs.map((d) => { const s = d.data(), a = by[s.slug] || { orders: 0, sales: 0, margin: 0, refunded: 0, review: 0, last: '' }; return { ownerUid: d.id, slug: s.slug, name: clean(s.businessName, 60), suspended: !!(s.mpanel && s.mpanel.suspended), reason: (s.mpanel && s.mpanel.suspendedReason) || '', markup: s.mpanel && s.mpanel.markup, orders: a.orders, sales: r2(a.sales), margin: r2(a.margin), refunded: a.refunded, review: a.review, last: a.last }; });
    panels.sort((x, y) => y.sales - x.sales);
    review.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const wd = await db.collection('withdrawal_requests').where('status', '==', 'pending').limit(300).get(); let wdPending = 0, wdCount = 0; wd.forEach((x) => { const w = x.data(); if (w.source === 'panel') { wdCount++; wdPending += w.netUSD != null ? w.netUSD : w.amountUSD || 0; } });
    return { success: true, panels, review: review.slice(0, 40), settings: st, withdrawals: { count: wdCount, netPending: r2(wdPending) } };
  }

  async function adminSetPanel(uid, b) {
    needAdmin(uid);
    const slug = String(b.slug || '').toLowerCase(); if (!/^[a-z0-9-]{3,30}$/.test(slug)) throw new Error('Adresse invalide.');
    const snap = await db.collection('mini_sites').where('slug', '==', slug).limit(1).get(); if (snap.empty) throw new Error('Panel introuvable.');
    const on = b.suspended === true;
    await snap.docs[0].ref.update({ 'mpanel.suspended': on, 'mpanel.suspendedReason': on ? clean(b.reason, 160) : '' });
    if (push) { try { await push(snap.docs[0].id, on ? 'Panel suspendu' : 'Panel réactivé', on ? 'Ton panel est temporairement suspendu. Contacte le support.' : 'Ton panel est de nouveau actif.', '/', { category: 'activity' }); } catch (e) { /* ignore */ } }
    return { success: true, suspended: on };
  }

  async function adminSetSettings(uid, b) {
    needAdmin(uid);
    const cur = await settings(), d = {};
    ['minUsd', 'maxUsd', 'feePct', 'holdHours', 'autoMaxUsd', 'newAccountDays', 'dailyLimit'].forEach((k) => { if (b[k] != null && b[k] !== '') { const v = num(b[k], NaN); if (!isFinite(v) || v < 0) throw new Error('Valeur invalide : ' + k); d[k] = v; } });
    d.enabled = b.enabled !== false;
    const merged = Object.assign({}, cur, d);
    if (merged.minUsd > merged.maxUsd) throw new Error('Le minimum dépasse le maximum.');
    await db.collection('settings').doc('panel_payouts').set(d, { merge: true });
    return { success: true, settings: await settings() };
  }

  return { info, request, adminOverview, adminSetPanel, adminSetSettings, settings, _compute: compute };
}

module.exports = { createPanelPayouts, METHODS, DEFAULTS };
