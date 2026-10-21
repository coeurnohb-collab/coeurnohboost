// api/_lib/managed-panel.js
// PANEL GERE (« white-label ») pour les mini-sites.
// Le proprietaire du site n'a RIEN a connecter : le catalogue, les numeros de service et les prix de gros
// viennent automatiquement de la plateforme (donc de MoreThanPanel, avec les ID tenus a jour dans « service_map »).
// Les clients du panel ont un compte Coeurnoh : ils rechargent leur solde puis commandent.
//
// ARGENT (tout se passe cote serveur, dans des transactions Firestore) :
//   - le client paie  prix_client = prix_de_gros x (1 + marge du proprietaire) ;
//   - la plateforme (admin) recoit le prix de gros immediatement ;
//   - le proprietaire recoit sa marge DES QUE le fournisseur a accepte la commande ;
//   - commande refusee / annulee -> le client est rembourse en entier, les revenus sont repris (une seule fois).
// SECURITE : prix recalcule par le serveur (le navigateur n'envoie jamais de prix), commande idempotente
// (requestId), quantites entieres, solde verifie dans la transaction, cle fournisseur jamais exposee.
const crypto = require('crypto');
const { buildWalletTxEntry } = require('./wallet-ledger');

const ADMIN_UID = '8BqWONj07hVZePHe2DrkHWYRjse2';
const MTP_URL = 'https://morethanpanel.com/api/v2';
const MAX_ORDER_USD = 500;
const MAX_MARKUP = 300;
const STATUS_CHECK_AFTER_MS = 60000;

const num = (v, d) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : d; };
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;
const ceilCents = (usd) => Math.max(1, Math.ceil(Math.round(usd * 1e6) / 1e4 - 1e-9)); // dollars -> cents, arrondi au-dessus, minimum 1 cent
const clampMarkup = (v) => Math.min(Math.max(num(v, 30), 0), MAX_MARKUP);
const clampRef = (v) => Math.min(Math.max(Math.floor(num(v, 20)), 0), 50);
const cleanUid = (v) => { v = String(v == null ? '' : v).trim(); return /^[A-Za-z0-9_-]{6,128}$/.test(v) ? v : ''; };

const TIER_INFO = {
  standard: 'Bon rapport qualité-prix · démarrage rapide',
  premium: 'Plus rapide, meilleure rétention',
  vip: 'Ultra rapide, qualité maximale'
};

function validateLink(link) {
  link = String(link || '').trim();
  if (link.length < 3 || link.length > 300 || /[\s<>"]/.test(link)) throw new Error('Lien ou nom de compte invalide.');
  if (/^https?:\/\//i.test(link) && !/^https:\/\//i.test(link)) throw new Error('Le lien doit commencer par https://');
  return link;
}

function createManagedPanel({ db, admin, push, loadCatalog, fetchImpl, apiKey }) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const key = () => (apiKey !== undefined ? apiKey : process.env.MTP_API_KEY);
  const siteRef = (uid) => db.collection('mini_sites').doc(uid);
  let cache = { at: 0, list: null };

  async function catalog() {
    if (cache.list && Date.now() - cache.at < 60000) return cache.list;
    const list = await loadCatalog(db);
    cache = { at: Date.now(), list };
    return list;
  }
  async function settings() {
    try { const s = await db.collection('settings').doc('managed_panel').get(); const d = s.exists ? s.data() : {}; return { enabled: d.enabled !== false }; }
    catch (e) { return { enabled: true }; }
  }
  async function findSite(slug) {
    slug = String(slug || '').toLowerCase();
    if (!/^[a-z0-9-]{3,30}$/.test(slug)) throw Object.assign(new Error('Panel introuvable.'), { status: 404 });
    const snap = await db.collection('mini_sites').where('slug', '==', slug).limit(1).get();
    if (snap.empty) throw Object.assign(new Error('Panel introuvable.'), { status: 404 });
    const d = snap.docs[0].data();
    if (d.status !== 'published' || !d.mpanel || !d.mpanel.on) throw Object.assign(new Error('Ce panel n’est pas disponible.'), { status: 404 });
    return { ownerUid: snap.docs[0].id, site: d, cfg: d.mpanel };
  }

  function priceItem(x, markup) {
    const per1000 = r4(x.rate * (1 + markup / 100));
    return { id: x.id, platform: x.pid, group: x.platformName, type: x.type, tier: x.tier, name: x.label + ' · ' + (x.tier === 'vip' ? 'VIP' : x.tier === 'premium' ? 'Premium' : 'Standard'), label: x.label, info: TIER_INFO[x.tier] || '', per1000, min: x.min, max: x.max };
  }
  function visibleItems(list, cfg) {
    const off = new Set(Array.isArray(cfg.hiddenPlatforms) ? cfg.hiddenPlatforms : []);
    const markup = clampMarkup(cfg.markup);
    return list.filter((x) => !off.has(x.pid)).map((x) => priceItem(x, markup));
  }

  // ---------- Public ----------
  async function publicStore(slug) {
    if (!(await settings()).enabled) throw Object.assign(new Error('Service momentanément indisponible.'), { status: 503 });
    const { site, cfg } = await findSite(slug);
    const items = visibleItems(await catalog(), cfg);
    return {
      success: true, slug: site.slug,
      shop: { name: clean(site.businessName, 80), tagline: clean(site.tagline, 160), logo: /^https:\/\//.test(site.logoUrl || '') ? site.logoUrl : '', accent: /^#[0-9a-fA-F]{6}$/.test(site.accentColor || '') ? site.accentColor : '', whatsapp: clean(site.contactWhatsapp, 30) },
      title: clean(cfg.title, 80) || 'Services de croissance', welcome: clean(cfg.welcome, 300), refPct: clampRef(cfg.refPct), items
    };
  }

  // Aperçu (brouillon non publié) : même catalogue et mêmes prix que le vrai panel, sans lecture du site ni commande.
  async function previewStore(site) {
    site = site || {};
    const cfg = site.mpanel && typeof site.mpanel === 'object' ? site.mpanel : {};
    const items = visibleItems(await catalog(), cfg);
    return {
      success: true, slug: clean(site.slug, 30) || 'apercu',
      shop: { name: clean(site.businessName, 80), tagline: clean(site.tagline, 160), logo: /^https:\/\//.test(site.logoUrl || '') ? site.logoUrl : '', accent: /^#[0-9a-fA-F]{6}$/.test(site.accentColor || '') ? site.accentColor : '', whatsapp: clean(site.contactWhatsapp, 30) },
      title: clean(cfg.title, 80) || 'Services de croissance', welcome: clean(cfg.welcome, 300), refPct: clampRef(cfg.refPct), items
    };
  }

  // ---------- Client ----------
  async function order(uid, b) {
    if (!(await settings()).enabled) throw new Error('Les commandes sont momentanément suspendues.');
    const { ownerUid, site, cfg } = await findSite(b.slug);
    const markup = clampMarkup(cfg.markup);
    const item = (await catalog()).find((x) => String(x.id) === String(b.serviceId));
    if (!item || (Array.isArray(cfg.hiddenPlatforms) && cfg.hiddenPlatforms.includes(item.pid))) throw new Error('Service indisponible.');
    const quantity = num(b.quantity, NaN);
    if (!Number.isInteger(quantity) || quantity < item.min || quantity > item.max) throw new Error('Quantité : entre ' + item.min + ' et ' + item.max + '.');
    const link = validateLink(b.link);
    if (!item.mtp) throw new Error('Service indisponible.');
    if (!key()) throw new Error('Service momentanément indisponible. Réessaie plus tard.');

    const per1000 = r4(item.rate * (1 + markup / 100));
    const clientCents = ceilCents(per1000 * quantity / 1000);
    const wholesaleCents = Math.min(ceilCents(item.rate * quantity / 1000), clientCents);
    const marginCents = clientCents - wholesaleCents;
    if (clientCents > MAX_ORDER_USD * 100) throw new Error('Montant maximum par commande : ' + MAX_ORDER_USD + ' $.');
    const price = clientCents / 100, wholesale = wholesaleCents / 100, margin = marginCents / 100;

    const rid = clean(b.requestId, 64) || crypto.randomBytes(12).toString('hex');
    const orderRef = db.collection('orders').doc('pm' + crypto.createHash('sha256').update(uid + '|' + rid).digest('hex').slice(0, 24));
    const userRef = db.collection('users').doc(uid), adminRef = db.collection('users').doc(ADMIN_UID);
    const label = (item.platformName + ' — ' + item.label).slice(0, 120);
    // Parrainage du panel : le client reste lie au premier parrain qui l'a amene (jamais lui-meme).
    let refUid = '';
    const bindRef = db.collection('panel_refs').doc(site.slug + '_' + uid);
    try {
      const bs = await bindRef.get();
      if (bs.exists) refUid = bs.data().referrerUid || '';
      else {
        const cand = cleanUid(b.ref);
        if (cand && cand !== uid) {
          const rs = await db.collection('users').doc(cand).get();
          if (rs.exists) { refUid = cand; await bindRef.set({ slug: site.slug, ownerUid, clientUid: uid, referrerUid: cand, createdAt: new Date().toISOString() }); }
        }
      }
    } catch (e) { refUid = ''; }
    const refPct = clampRef(cfg.refPct);
    const refBonusCents = (refUid && refPct > 0) ? Math.floor(marginCents * refPct / 100) : 0;
    const refBonus = refBonusCents / 100;
    let existing = null, newBalance = null;

    await db.runTransaction(async (tx) => {
      const [oSnap, uSnap] = await Promise.all([tx.get(orderRef), tx.get(userRef)]);
      if (oSnap.exists) { existing = oSnap.data(); return; }
      if (!uSnap.exists) throw new Error('Compte introuvable.');
      const bal = uSnap.data().balance || 0;
      if (Math.round(bal * 100) < clientCents) throw new Error('SOLDE_INSUFFISANT');
      const creditAdmin = uid !== ADMIN_UID;
      const aSnap = creditAdmin ? await tx.get(adminRef) : null;
      newBalance = r2(bal - price);
      tx.update(userRef, { balance: newBalance });
      tx.set(orderRef, {
        uid, email: uSnap.data().email || '', platform: item.platformName, service: item.label, quality: item.tier, link, quantity, price,
        status: 'pending', mtpServiceId: item.mtp, createdAt: new Date().toISOString(),
        source: 'panel', panelSlug: site.slug, ownerUid, wholesale, margin, refUid: refBonus > 0 ? refUid : '', refBonus, refCredited: false, adminCredited: !!(creditAdmin && aSnap && aSnap.exists), ownerCredited: false
      });
      tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'order_purchase', amount: -price, balanceAfter: newBalance, description: 'Panel ' + clean(site.businessName, 40) + ' — ' + label, relatedId: orderRef.id }));
      if (creditAdmin && aSnap && aSnap.exists) {
        const ab = r2((aSnap.data().balance || 0) + wholesale);
        tx.update(adminRef, { balance: ab });
        tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: ADMIN_UID, type: 'order_income', amount: wholesale, balanceAfter: ab, description: 'Panel ' + clean(site.businessName, 40) + ' — ' + label, relatedId: orderRef.id }));
      }
    }).catch((e) => { if (e.message === 'SOLDE_INSUFFISANT') throw Object.assign(new Error('Solde insuffisant. Recharge ton solde pour continuer.'), { code: 'insufficient' }); throw e; });

    if (existing) return { success: true, orderId: orderRef.id, duplicate: true, status: existing.status, price: existing.price };

    // Envoi au fournisseur
    let data;
    try {
      const res = await doFetch(MTP_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ key: key(), action: 'add', service: String(item.mtp), link, quantity: String(quantity) }), signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined });
      try { data = await res.json(); } catch (e) {
        await orderRef.update({ status: 'pending_review', debugReason: 'Réponse fournisseur illisible (HTTP ' + res.status + '). Vérifier avant tout remboursement.' });
        return { success: true, orderId: orderRef.id, status: 'pending_review', newBalance, price };
      }
    } catch (e) {
      await orderRef.update({ status: 'pending_review', debugReason: 'Erreur réseau après envoi : ' + clean(e.message, 120) + '. Vérifier avant tout remboursement.' }).catch(() => {});
      return { success: true, orderId: orderRef.id, status: 'pending_review', newBalance, price };
    }
    if (!data || data.error || data.order == null) {
      const r = await refund(orderRef, 'Refusée par le fournisseur : ' + clean(data && data.error, 120));
      return { success: true, orderId: orderRef.id, status: 'refunded', refunded: r.ok, newBalance: r.newBalance != null ? r.newBalance : newBalance, price, message: 'Commande non acceptée — tu as été remboursé.' };
    }
    await settle(orderRef, String(data.order));
    return { success: true, orderId: orderRef.id, status: 'processing', newBalance, price, mtpOrderId: String(data.order) };
  }

  // Commande acceptee : le proprietaire recoit sa marge (une seule fois).
  async function settle(orderRef, mtpOrderId) {
    let ownerUid = null, margin = 0, slug = '';
    try {
      await db.runTransaction(async (tx) => {
        const oSnap = await tx.get(orderRef); if (!oSnap.exists) return;
        const o = oSnap.data(); slug = o.panelSlug;
        if (o.refunded) return;
        const upd = { status: 'processing', mtpOrderId };
        const rb = o.refBonus > 0 && o.refUid ? o.refBonus : 0;
        const rRef = rb ? db.collection('users').doc(o.refUid) : null;
        const oRef = o.ownerUid ? db.collection('users').doc(o.ownerUid) : null;
        const needOwner = !o.ownerCredited && o.margin > 0 && oRef;
        const ow = needOwner ? await tx.get(oRef) : null;
        const rf = rb && !o.refCredited ? await tx.get(rRef) : null;
        if (needOwner && ow.exists) {
          const share = r2(o.margin - rb);
          const nb = r2((ow.data().balance || 0) + share);
          tx.update(oRef, { balance: nb });
          tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: o.ownerUid, type: 'panel_income', amount: share, balanceAfter: nb, description: 'Marge panel — ' + clean(o.platform + ' ' + o.service, 80), relatedId: orderRef.id }));
          upd.ownerCredited = true; ownerUid = o.ownerUid; margin = share;
        }
        if (rf && rf.exists) {
          const nb2 = r2((rf.data().balance || 0) + rb);
          tx.update(rRef, { balance: nb2 });
          tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: o.refUid, type: 'panel_referral', amount: rb, balanceAfter: nb2, description: 'Parrainage panel — ' + clean(o.platform + ' ' + o.service, 70), relatedId: orderRef.id }));
          upd.refCredited = true;
        }
        tx.update(orderRef, upd);
      });
    } catch (e) {
      try { await orderRef.update({ status: 'processing', mtpOrderId, debugReason: 'Commande envoyée ; marge propriétaire à vérifier (' + clean(e.message, 80) + ').' }); } catch (e2) { /* ignore */ }
    }
    if (ownerUid && push) { try { await push(ownerUid, 'Nouvelle vente sur ton panel', '+' + margin.toFixed(2) + ' $ de marge', '/', { category: 'activity' }); } catch (e) { /* ignore */ } }
  }

  // Remboursement complet, idempotent ; reprend le revenu admin et la marge proprietaire deja verses.
  async function refund(orderRef, reason) {
    let newBalance = null;
    try {
      await db.runTransaction(async (tx) => {
        const oSnap = await tx.get(orderRef); if (!oSnap.exists) return;
        const o = oSnap.data(); if (o.refunded === true) return;
        const uRef = db.collection('users').doc(o.uid), aRef = db.collection('users').doc(ADMIN_UID), wRef = o.ownerUid ? db.collection('users').doc(o.ownerUid) : null;
        const fRef = o.refCredited && o.refUid ? db.collection('users').doc(o.refUid) : null;
        const reads = [tx.get(uRef), o.adminCredited ? tx.get(aRef) : null, o.ownerCredited && wRef ? tx.get(wRef) : null, fRef ? tx.get(fRef) : null];
        const [u, a, w, f] = await Promise.all(reads);
        if (!u || !u.exists) throw new Error('Compte client introuvable.');
        newBalance = r2((u.data().balance || 0) + o.price);
        tx.update(uRef, { balance: newBalance });
        tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: o.uid, type: 'order_refund', amount: o.price, balanceAfter: newBalance, description: 'Remboursement — commande panel non aboutie', relatedId: orderRef.id }));
        if (a && a.exists) { const nb = r2((a.data().balance || 0) - o.wholesale); tx.update(aRef, { balance: nb }); tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: ADMIN_UID, type: 'order_income_reversed', amount: -o.wholesale, balanceAfter: nb, description: 'Commande panel annulée, revenu repris', relatedId: orderRef.id })); }
        if (f && f.exists) { const nbf = r2((f.data().balance || 0) - o.refBonus); tx.update(fRef, { balance: nbf }); tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: o.refUid, type: 'panel_referral_reversed', amount: -o.refBonus, balanceAfter: nbf, description: 'Parrainage annulé (commande non aboutie)', relatedId: orderRef.id })); }
        if (w && w.exists) { const nb = r2((w.data().balance || 0) - r2(o.margin - (o.refCredited ? o.refBonus : 0))); tx.update(wRef, { balance: nb }); tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: o.ownerUid, type: 'panel_income_reversed', amount: -r2(o.margin - (o.refCredited ? o.refBonus : 0)), balanceAfter: nb, description: 'Commande panel annulée, marge reprise', relatedId: orderRef.id })); }
        tx.update(orderRef, { status: 'refunded', refunded: true, refundedAt: new Date().toISOString(), debugReason: clean(reason, 200) });
      });
      return { ok: newBalance !== null, newBalance };
    } catch (e) {
      try { await orderRef.update({ status: 'pending_review', debugReason: 'Remboursement automatique échoué (' + clean(e.message, 80) + ') — à rembourser manuellement. ' + clean(reason, 100) }); } catch (e2) { /* ignore */ }
      return { ok: false, newBalance: null };
    }
  }

  async function syncStatus(doc) {
    const o = doc.data();
    try {
      const res = await doFetch(MTP_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ key: key(), action: 'status', order: String(o.mtpOrderId) }), signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
      const j = await res.json(); if (!j || j.error) { await doc.ref.update({ checkedAt: new Date().toISOString() }); return; }
      const st = String(j.status || '').toLowerCase(), upd = { checkedAt: new Date().toISOString(), remains: clean(j.remains, 12), startCount: clean(j.start_count, 12) };
      if (st === 'completed') { upd.status = 'completed'; await doc.ref.update(upd); }
      else if (st === 'canceled' || st === 'cancelled' || st === 'refunded') { await doc.ref.update(upd); await refund(doc.ref, 'Annulée par le fournisseur'); }
      else if (st === 'partial') { upd.status = 'partial'; await doc.ref.update(upd); }
      else await doc.ref.update(upd);
    } catch (e) { /* on reessaiera au prochain affichage */ }
  }

  async function orders(uid, b) {
    const snap = await db.collection('orders').where('uid', '==', uid).limit(300).get();
    let docs = snap.docs.filter((d) => d.data().source === 'panel' && (!b.slug || d.data().panelSlug === String(b.slug)));
    docs.sort((x, y) => String(y.data().createdAt).localeCompare(String(x.data().createdAt)));
    docs = docs.slice(0, 50);
    const stale = docs.filter((d) => { const o = d.data(); return o.status === 'processing' && o.mtpOrderId && Date.now() - Date.parse(o.checkedAt || o.createdAt) > STATUS_CHECK_AFTER_MS; }).slice(0, 5);
    if (stale.length && key()) await Promise.all(stale.map(syncStatus));
    const fresh = stale.length ? await Promise.all(docs.map((d) => stale.includes(d) ? d.ref.get() : d)) : docs;
    let u = await db.collection('users').doc(uid).get();
    if (!u.exists) {
      // Premiere connexion depuis la page autonome d'un panel : profil minimal (solde 0), cree par le serveur uniquement.
      try {
        const au = await admin.auth().getUser(uid);
        await db.collection('users').doc(uid).create({ name: clean(au.displayName || (au.email || '').split('@')[0] || 'Client', 60), email: clean(au.email || '', 120), balance: 0, referredBy: '', createdAt: new Date().toISOString(), source: 'panel' });
      } catch (e) { /* deja cree ailleurs */ }
      u = await db.collection('users').doc(uid).get();
    }
    return { success: true, balance: r2((u.exists && u.data().balance) || 0), orders: fresh.map((d) => { const o = d.data(); return { id: d.id, service: o.platform + ' — ' + o.service, tier: o.quality, link: o.link, quantity: o.quantity, price: o.price, status: o.status, remains: o.remains || '', startCount: o.startCount || '', createdAt: o.createdAt }; }) };
  }


  // ---------- Parrainage (cote client du panel) ----------
  async function refInfo(uid, b) {
    const { site, cfg } = await findSite(b.slug);
    const [rs, os] = await Promise.all([db.collection('panel_refs').where('referrerUid', '==', uid).limit(500).get(), db.collection('orders').where('refUid', '==', uid).limit(500).get()]);
    let count = 0, earned = 0, pending = 0;
    rs.forEach((d) => { if (d.data().slug === site.slug) count++; });
    os.forEach((d) => { const o = d.data(); if (o.panelSlug !== site.slug || o.refunded) return; if (o.refCredited) earned += o.refBonus || 0; else pending += o.refBonus || 0; });
    return { success: true, pct: clampRef(cfg.refPct), count, earned: r2(earned), pending: r2(pending), uid };
  }

  // ---------- Proprietaire ----------
  async function ownerGet(uid) {
    const s = await siteRef(uid).get(); if (!s.exists) throw new Error('Crée d’abord ton site.');
    const d = s.data(), cfg = d.mpanel || {};
    const snap = await db.collection('orders').where('ownerUid', '==', uid).limit(500).get();
    let count = 0, sales = 0, earned = 0, pending = 0; const recent = [];
    snap.forEach((x) => { const o = x.data(); if (o.source !== 'panel') return; count++; if (o.status !== 'refunded') sales += o.price || 0; if (o.ownerCredited && !o.refunded) earned += o.margin || 0; else if (!o.refunded && o.status === 'pending_review') pending += o.margin || 0; recent.push({ id: x.id, service: o.platform + ' — ' + o.service, quantity: o.quantity, price: o.price, margin: o.margin, status: o.status, createdAt: o.createdAt }); });
    recent.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const list = await catalog();
    const platforms = []; const seen = new Set(); list.forEach((x) => { if (!seen.has(x.pid)) { seen.add(x.pid); platforms.push({ id: x.pid, name: x.platformName }); } });
    return { success: true, published: d.status === 'published', slug: d.slug || '', cfg: { on: !!cfg.on, title: cfg.title || '', welcome: cfg.welcome || '', markup: cfg.markup != null ? cfg.markup : 30, refPct: cfg.refPct != null ? cfg.refPct : 20, hiddenPlatforms: cfg.hiddenPlatforms || [] }, platforms, sample: visibleItems(list, { markup: cfg.markup != null ? cfg.markup : 30 }).slice(0, 6), stats: { orders: count, sales: r2(sales), earned: r2(earned), pending: r2(pending) }, recent: recent.slice(0, 20), maxMarkup: MAX_MARKUP };
  }
  async function ownerSave(uid, b) {
    const s = await siteRef(uid).get(); if (!s.exists) throw new Error('Crée d’abord ton site.');
    const d = s.data(); if (b.on && d.status !== 'published') throw new Error('Publie d’abord ton site pour ouvrir ton panel.');
    if (b.on && !d.slug) throw new Error('Ton site n’a pas encore d’adresse.');
    const valid = new Set((await catalog()).map((x) => x.pid));
    const mpanel = { on: !!b.on, title: clean(b.title, 80), welcome: clean(b.welcome, 300), markup: r2(clampMarkup(b.markup)), refPct: clampRef(b.refPct), hiddenPlatforms: (Array.isArray(b.hiddenPlatforms) ? b.hiddenPlatforms : []).map(String).filter((p) => valid.has(p)).slice(0, 30), updatedAt: new Date().toISOString() };
    await siteRef(uid).update({ mpanel });
    return { success: true, cfg: mpanel, url: d.slug ? '/panel/' + d.slug : '' };
  }

  return { publicStore, previewStore, order, orders, refInfo, ownerGet, ownerSave, _refund: refund, _settle: settle, _findSite: findSite };
}

module.exports = { createManagedPanel, ceilCents, clampMarkup, validateLink };
