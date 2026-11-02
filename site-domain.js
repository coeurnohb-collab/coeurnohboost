// api/_lib/site-domain.js
// Noms de domaine des sites : vérification, achat automatique, connexion au projet, renouvellement.
// Tout passe par l'API officielle de Vercel (registrar + domaines du projet) : aucune étape manuelle.
//
// Données, toutes réservées au serveur (aucune règle Firestore à ouvrir) :
//   site_domains/{domaine}  registre : { ownerUid, at, live, owned, expiresAt, orderId }
//   domain_orders/{uid}     dernier achat / renouvellement du propriétaire (statut, prix, erreur)
//   site_config/domain      coordonnées du titulaire déclarées par l'administrateur
// Le paiement se fait avec le portefeuille (users/{uid}.balance), au prix configuré par l'administrateur.
// Un achat refusé est remboursé automatiquement, dans la même transaction que la mise à jour du statut.

const { buildWalletTxEntry } = require('./wallet-ledger');

const API = 'https://api.vercel.com';
// Extensions simples (aucune pièce justificative supplémentaire) : les autres se connectent mais ne s'achètent pas ici.
const TLDS = ['com', 'net', 'org', 'info', 'biz', 'co', 'shop', 'store', 'online', 'site', 'website', 'xyz', 'app', 'dev', 'tech', 'me'];
const MAX_COST = 60;                       // jamais d'achat au-dessus de 60 $ de coût réel (noms « premium »)
const OPEN = ['paid', 'purchasing', 'review'];
const PENDING_CLAIM_MS = 72 * 3600 * 1000; // un nom réservé mais jamais mis en ligne se libère après 72 h
const RENEW_WINDOW_DAYS = 90;
const DNS_HELP = { a: { type: 'A', name: '@', value: '76.76.21.21' }, cname: { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' } };

const err = (status, message, code, extra) => Object.assign(new Error(message), { status, code: code || '' }, extra || {});
const round2 = (n) => Math.round(n * 100) / 100;
const iso = () => new Date().toISOString();
const ts = (v) => Date.parse(v) || 0;
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

function registrable(domain) {
  const m = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.([a-z]{2,24})$/.exec(String(domain || ''));
  return !!m && TLDS.indexOf(m[2]) >= 0;
}
// Prix payé par le client pour 1 an : le prix configuré (mensuel × 12), jamais en dessous du coût réel + 1 $.
function customerPrice(basePerYear, cost) {
  return Math.max(round2(basePerYear), Math.ceil(Number(cost) || 0) + 1);
}
function addYear(from) {
  const d = new Date(from || Date.now());
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}
function friendly(code) {
  if (code === 'domain_not_available') return 'Ce nom vient d’être pris. Choisissez-en un autre. Vous n’avez rien payé.';
  if (code === 'expected_price_mismatch' || code === 'order_too_expensive') return 'Le prix de ce nom a changé. Réessayez dans un instant. Vous n’avez rien payé.';
  if (code === 'domain_too_short') return 'Ce nom est trop court. Essayez un nom plus long. Vous n’avez rien payé.';
  if (code === 'additional_contact_info_required' || code === 'invalid_additional_contact_info') return 'Cette extension ne peut pas être achetée automatiquement. Vous n’avez rien payé.';
  return 'L’achat n’a pas pu être fait pour le moment. Vous n’avez rien payé, réessayez plus tard.';
}

// Coordonnées du titulaire : champs exigés par les registres (norme ICANN).
const CONTACT_FIELDS = [['firstName', 60], ['lastName', 60], ['email', 120], ['phone', 20], ['address1', 100], ['city', 60], ['state', 60], ['zip', 20], ['country', 2]];
function cleanContact(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const v = {}, missing = [];
  CONTACT_FIELDS.forEach(([k, n]) => { v[k] = clean(c[k], n); });
  v.email = v.email.toLowerCase();
  v.country = v.country.toUpperCase();
  v.phone = '+' + String(c.phone == null ? '' : c.phone).replace(/[^\d]/g, '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.email)) missing.push('email');
  if (!/^\+[1-9]\d{7,14}$/.test(v.phone)) missing.push('phone');
  if (!/^[A-Z]{2}$/.test(v.country)) missing.push('country');
  ['firstName', 'lastName', 'address1', 'city', 'state', 'zip'].forEach((k) => { if (!v[k]) missing.push(k); });
  const co = clean(c.companyName, 80);
  if (co) v.companyName = co;
  return { ok: !missing.length, value: v, missing };
}

function createSiteDomain({ db, adminUid, push, env, fetch: fetchImpl }) {
  const E = env || process.env;
  const fetchFn = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const conf = () => ({ token: E.VERCEL_TOKEN || '', project: E.VERCEL_PROJECT_ID || '', team: E.VERCEL_TEAM_ID || '', ok: !!(E.VERCEL_TOKEN && E.VERCEL_PROJECT_ID && fetchFn) });

  // ---------------- Appels à Vercel ----------------
  async function vcall(method, path, body, o) {
    o = o || {};
    if (!fetchFn) throw err(503, 'Service indisponible.', 'no_fetch');
    const c = conf();
    const url = API + path + (o.team !== false && c.team ? (path.indexOf('?') >= 0 ? '&' : '?') + 'teamId=' + encodeURIComponent(c.team) : '');
    const headers = { 'Content-Type': 'application/json' };
    if (o.auth !== false) headers.Authorization = 'Bearer ' + c.token;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), o.timeoutMs || 8000) : null;
    try {
      const r = await fetchFn(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined });
      let j = {}; try { j = await r.json(); } catch (e) { /* corps vide */ }
      return { status: r.status, json: j || {} };
    } finally { if (timer) clearTimeout(timer); }
  }
  const proj = () => encodeURIComponent(conf().project);

  // Disponibilité et prix réels du registre (appel public, sans clé).
  async function search(domain) {
    let r;
    try { r = await vcall('POST', '/v1/registrar/domains/search', { domains: [domain] }, { auth: false, team: false }); } catch (e) { throw err(503, 'Vérification momentanément impossible. Réessayez.', 'unreachable'); }
    const list = r.status === 200 && r.json && Array.isArray(r.json.results) ? r.json.results : null;
    if (!list) throw err(503, 'Vérification momentanément impossible. Réessayez.', 'unreachable');
    const it = list.filter((x) => x && x.domain === domain)[0] || list[0];
    if (!it) throw err(503, 'Vérification momentanément impossible. Réessayez.', 'unreachable');
    if (!(it.available === true || it.available === 'true')) return { available: false };
    return { available: true, price: Number(it.price), renewalPrice: Number(it.renewalPrice || it.price), years: Number(it.years) || 1, premium: it.premium === true || it.premium === 'true' };
  }
  async function renewalCost(domain) {
    const r = await vcall('GET', '/v1/registrar/domains/' + encodeURIComponent(domain) + '/price?years=1', null, { auth: false, team: false });
    const p = r.status === 200 ? Number(r.json.renewalPrice) : NaN;
    if (!(p > 0)) throw err(503, 'Prix de renouvellement indisponible. Réessayez plus tard.', 'unreachable');
    return p;
  }
  // Achat : jamais de nouvelle tentative automatique (risque de payer deux fois). « unknown » = réponse non reçue.
  async function vbuy(domain, cost, years, contact) {
    let r;
    try { r = await vcall('POST', '/v1/registrar/domains/' + encodeURIComponent(domain) + '/buy', { autoRenew: false, years, expectedPrice: cost, contactInformation: contact }, { timeoutMs: 9000 }); } catch (e) { return { unknown: true }; }
    if (r.status === 200 && r.json && r.json.orderId) return { ok: true, orderId: String(r.json.orderId) };
    if (r.status >= 500) return { unknown: true };
    return { ok: false, code: String((r.json && r.json.code) || ''), status: r.status };
  }
  async function vrenew(domain, cost) {
    let r;
    try { r = await vcall('POST', '/v1/registrar/domains/' + encodeURIComponent(domain) + '/renew', { years: 1, expectedPrice: cost }, { timeoutMs: 9000 }); } catch (e) { return { unknown: true }; }
    if (r.status === 200 && r.json && r.json.orderId) return { ok: true, orderId: String(r.json.orderId) };
    if (r.status >= 500) return { unknown: true };
    return { ok: false, code: String((r.json && r.json.code) || ''), status: r.status };
  }
  async function vorder(orderId) {
    const r = await vcall('GET', '/v1/registrar/orders/' + encodeURIComponent(orderId));
    if (r.status !== 200) return { status: 'unknown' };
    return { status: String(r.json.status || 'unknown'), error: r.json.error ? String(r.json.error.code || 'erreur') : '' };
  }
  // Ajoute le domaine (et « www », redirigé vers le domaine principal) au projet.
  async function attach(domain) {
    for (const name of [domain, 'www.' + domain]) {
      await vcall('POST', '/v10/projects/' + proj() + '/domains', name === domain ? { name } : { name, redirect: domain, redirectStatusCode: 308 });
    }
    const st = await vcall('GET', '/v9/projects/' + proj() + '/domains/' + encodeURIComponent(domain));
    return st.status === 200;
  }
  async function vstate(domain) {
    const pd = await vcall('GET', '/v9/projects/' + proj() + '/domains/' + encodeURIComponent(domain));
    if (pd.status === 404) return { attached: false, live: false };
    if (pd.status !== 200) return null;
    const cf = await vcall('GET', '/v6/domains/' + encodeURIComponent(domain) + '/config');
    const misconfigured = cf.status === 200 ? !!cf.json.misconfigured : null;
    const verified = !!pd.json.verified;
    return { attached: true, verified, misconfigured, live: verified && misconfigured === false };
  }

  // ---------------- Réglages de l'administrateur ----------------
  async function loadContact() {
    const s = await db.collection('site_config').doc('domain').get();
    const c = s.exists ? cleanContact(s.data().contact) : null;
    return c && c.ok ? c.value : null;
  }
  async function adminGet() {
    const s = await db.collection('site_config').doc('domain').get();
    const raw = s.exists ? (s.data().contact || {}) : {};
    const c = conf(), ct = cleanContact(raw);
    return { success: true, vercel: { token: !!c.token, project: !!c.project }, contact: raw, contactOk: ct.ok, missing: ct.missing, ready: c.ok && ct.ok, tlds: TLDS };
  }
  async function adminSave(raw) {
    const ct = cleanContact(raw);
    if (!ct.ok) throw err(400, 'Complétez les champs : ' + ct.missing.join(', ') + '.', 'contact');
    await db.collection('site_config').doc('domain').set({ contact: ct.value, updatedAt: iso() });
    return adminGet();
  }
  async function buyReady() {
    const c = conf();
    if (!c.ok) return { enabled: false, why: 'vercel' };
    const ct = await loadContact();
    return ct ? { enabled: true, contact: ct } : { enabled: false, why: 'contact' };
  }
  async function basePrice() {
    const s = await db.collection('pricing').doc('site').get();
    const m = s.exists && typeof s.data().domainPriceMonth === 'number' && s.data().domainPriceMonth > 0 ? s.data().domainPriceMonth : 4;
    return round2(m * 12);
  }
  async function balanceOf(uid) {
    const s = await db.collection('users').doc(uid).get();
    return s.exists ? round2(Number(s.data().balance) || 0) : 0;
  }

  // ---------------- Registre des domaines ----------------
  // Le champ « customDomain » d'un site est lisible par tous et modifiable par son propriétaire : on ne s'y fie jamais seul.
  async function siteByDomain(domain) {
    const dom = String(domain || '').toLowerCase();
    if (!dom) return null;
    const regRef = db.collection('site_domains').doc(dom);
    const reg = await regRef.get();
    const e = reg.exists ? reg.data() || {} : {};
    const uid = String(e.ownerUid || '');
    if (!uid) return null;
    const snap = await db.collection('mini_sites').doc(uid).get();
    if (!snap.exists || snap.data().customDomain !== dom) return null;
    // Une visite arrivée par ce nom prouve que le domaine pointe bien ici : la réservation devient définitive.
    if (e.live !== true) regRef.set({ live: true, liveAt: iso() }, { merge: true }).catch(() => { });
    return { id: uid, data: snap.data() };
  }
  // Réserve le domaine pour ce site. Faux si un autre site le détient réellement.
  async function claimDomain(domain, uid) {
    const ref = db.collection('site_domains').doc(domain);
    const cur = await ref.get();
    const e = cur.exists ? cur.data() || {} : {};
    const holder = String(e.ownerUid || '');
    if (holder && holder !== uid) {
      if (e.owned) return false;
      const strong = e.live === true || (Date.now() - ts(e.at) < PENDING_CLAIM_MS);
      const other = await db.collection('mini_sites').doc(holder).get();
      if (strong && other.exists && other.data().customDomain === domain) return false;
    }
    if (holder !== uid) await ref.set({ ownerUid: uid, at: iso(), live: false, owned: false });
    return true;
  }
  // Libère un domaine connecté (jamais un domaine acheté ici : il reste réservé à son acheteur).
  async function releaseDomain(domain, uid) {
    if (!domain) return;
    const ref = db.collection('site_domains').doc(domain);
    const cur = await ref.get();
    const e = cur.exists ? cur.data() || {} : {};
    if (String(e.ownerUid || '') === uid && !e.owned) await ref.set({ ownerUid: '', at: iso(), live: false });
  }
  // Connexion d'un domaine déjà possédé : ajout au projet quand la clé Vercel est configurée, sinon à la main.
  async function connectOwn(domain) {
    if (!conf().ok) return { mode: 'manual', dns: DNS_HELP };
    try {
      const ok = await attach(domain);
      const st = ok ? await vstate(domain).catch(() => null) : null;
      return { mode: 'auto', verified: !!(st && st.verified), dns: DNS_HELP };
    } catch (e) { return { mode: 'manual', dns: DNS_HELP }; }
  }

  // ---------------- Portefeuille ----------------
  async function debit(uid, amount, order, desc) {
    const buyerRef = db.collection('users').doc(uid), adminRef = db.collection('users').doc(adminUid), ordRef = db.collection('domain_orders').doc(uid);
    return db.runTransaction(async (tx) => {
      const [b, o] = await Promise.all([tx.get(buyerRef), tx.get(ordRef)]);
      const a = uid !== adminUid ? await tx.get(adminRef) : null;
      if (!b.exists) throw err(404, 'Compte introuvable.');
      if (o.exists && OPEN.indexOf(o.data().status) >= 0) throw err(409, 'Une opération sur un domaine est déjà en cours.', 'busy');
      const bal = Number(b.data().balance) || 0;
      if (bal < amount) throw err(402, 'Solde insuffisant : il vous faut ' + amount + ' $ dans le portefeuille.', 'balance', { price: amount, balance: round2(bal) });
      const nb = round2(bal - amount);
      tx.update(buyerRef, { balance: nb });
      tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'site_domain_purchase', amount: -amount, balanceAfter: nb, description: desc, relatedId: null }));
      if (a && a.exists) {
        const na = round2((Number(a.data().balance) || 0) + amount);
        tx.update(adminRef, { balance: na });
        tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: adminUid, type: 'site_domain_purchase_income', amount, balanceAfter: na, description: desc, relatedId: uid }));
      }
      tx.set(ordRef, Object.assign({ uid, status: 'paid', createdAt: iso(), updatedAt: iso() }, order));
      return { balance: nb };
    });
  }
  // Remboursement unique : ne s'applique qu'à une opération encore ouverte.
  async function refund(uid, reason) {
    const buyerRef = db.collection('users').doc(uid), adminRef = db.collection('users').doc(adminUid), ordRef = db.collection('domain_orders').doc(uid);
    return db.runTransaction(async (tx) => {
      const o = await tx.get(ordRef);
      if (!o.exists || OPEN.indexOf(o.data().status) < 0) return null;
      const od = o.data(), amount = Number(od.price) || 0;
      const b = await tx.get(buyerRef);
      const a = uid !== adminUid ? await tx.get(adminRef) : null;
      const desc = 'Remboursement du domaine ' + od.domain;
      if (b.exists && amount > 0) {
        const nb = round2((Number(b.data().balance) || 0) + amount);
        tx.update(buyerRef, { balance: nb });
        tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'site_domain_purchase_rejected_refund', amount, balanceAfter: nb, description: desc, relatedId: null }));
        if (a && a.exists) {
          const na = round2((Number(a.data().balance) || 0) - amount);
          tx.update(adminRef, { balance: na });
          tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: adminUid, type: 'site_domain_purchase_income_reversed', amount: -amount, balanceAfter: na, description: desc, relatedId: uid }));
        }
      }
      tx.update(ordRef, { status: 'refunded', error: String(reason || '').slice(0, 200), updatedAt: iso() });
      return amount;
    });
  }
  async function flip(uid, from, patch) {
    const ref = db.collection('domain_orders').doc(uid);
    return db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists || from.indexOf(s.data().status) < 0) return false;
      tx.update(ref, Object.assign({ updatedAt: iso() }, patch));
      return true;
    });
  }
  async function tell(uid, title, body, type) {
    try {
      await db.collection('notifications').add({ uid, title, body, type, url: uid === adminUid ? '/admin.html' : '/?mysite=1', read: false, createdAt: iso() });
      if (push) await push(uid, title, body, uid === adminUid ? '/admin.html' : '/?mysite=1', { category: 'activity' });
    } catch (e) { /* la notification ne doit jamais bloquer l'opération */ }
  }
  async function review(uid, order, why) {
    const done = await flip(uid, ['paid', 'purchasing'], { status: 'review', error: why });
    if (done) await tell(adminUid, 'Domaine à vérifier', (order.domain || '') + ' : ' + why + ' (compte ' + uid + ').', 'site_domain_review');
  }

  // ---------------- Parcours ----------------
  async function check(uid, dom) {
    if (!registrable(dom)) return { success: true, state: 'unsupported', domain: dom };
    let r;
    try { r = await search(dom); } catch (e) { return { success: true, state: 'unreachable', domain: dom }; }
    if (!r.available) return { success: true, state: 'taken', domain: dom };
    if (r.premium || !(r.price > 0) || r.price > MAX_COST || r.years !== 1) return { success: true, state: 'unsupported', domain: dom };
    const [ready, base, balance] = await Promise.all([buyReady(), basePrice(), balanceOf(uid)]);
    return { success: true, state: 'available', domain: dom, price: customerPrice(base, r.price), years: 1, balance, enabled: ready.enabled };
  }

  async function buy(uid, site, dom, expected) {
    const ready = await buyReady();
    if (!ready.enabled) throw err(503, 'L’achat automatique n’est pas encore activé. Si vous avez déjà un domaine, connectez-le.', 'disabled');
    if (!registrable(dom)) throw err(400, 'Cette extension ne peut pas être achetée ici. Si vous possédez déjà ce nom, connectez-le.', 'tld');
    if (site.customDomain) throw err(409, 'Retirez d’abord votre domaine actuel.', 'has_domain');
    const reg = await db.collection('site_domains').doc(dom).get();
    const re = reg.exists ? reg.data() || {} : {};
    if (re.ownerUid && re.ownerUid !== uid && (re.owned || re.live === true)) throw err(409, 'Ce nom est déjà utilisé par un autre site.', 'taken');
    const s = await search(dom);
    if (!s.available) throw err(409, 'Ce nom n’est plus disponible.', 'taken');
    if (s.premium || !(s.price > 0) || s.price > MAX_COST || s.years !== 1) throw err(400, 'Ce nom ne peut pas être acheté automatiquement.', 'unsupported');
    const price = customerPrice(await basePrice(), s.price);
    if (round2(Number(expected)) !== price) throw err(409, 'Le prix est maintenant de ' + price + ' $. Vérifiez puis confirmez.', 'price_changed', { price });
    await debit(uid, price, { domain: dom, kind: 'buy', price, vercelPrice: s.price, years: 1 }, 'Achat du domaine ' + dom + ' (1 an)');
    const r = await vbuy(dom, s.price, 1, ready.contact);
    if (r.ok) { await flip(uid, ['paid'], { status: 'purchasing', orderId: r.orderId }); return { success: true, status: 'purchasing' }; }
    if (r.unknown) { await review(uid, { domain: dom }, 'réponse du registre non reçue : vérifier la commande'); return { success: true, status: 'purchasing' }; }
    const msg = friendly(r.code);
    await refund(uid, msg);
    throw err(502, msg, r.code || 'failed', { refunded: true });
  }

  // Termine un achat accepté : réservation, site relié, domaine ajouté au projet. Idempotent.
  async function finish(uid, order) {
    const dom = order.domain, siteRef = db.collection('mini_sites').doc(uid);
    await db.collection('site_domains').doc(dom).set({ ownerUid: uid, at: iso(), live: true, owned: true, orderId: order.orderId || '', expiresAt: order.expiresAt || addYear(), boughtAt: iso() });
    await siteRef.update({ customDomain: dom, updatedAt: iso() });
    await attach(dom);
    const flipped = await flip(uid, ['purchasing', 'review'], { status: 'done', error: '' });
    if (flipped) await tell(uid, 'Votre domaine est prêt', dom + ' est acheté et connecté à votre site.', 'site_domain_ready');
  }

  async function progress(uid, order) {
    const age = Date.now() - ts(order.createdAt);
    if (order.status === 'paid') {
      if (age > 3 * 60000) await review(uid, order, 'opération interrompue avant la réponse du registre');
      return order;
    }
    if (order.kind === 'renew') return order;
    if (!order.orderId) return order;
    let o;
    try { o = await vorder(order.orderId); } catch (e) { return order; }
    if (o.status === 'completed') {
      try { await finish(uid, order); } catch (e) { if (age > 15 * 60000) await review(uid, order, 'domaine acheté mais connexion impossible : ' + clean(e && e.message, 80)); }
    } else if (o.status === 'failed') {
      await refund(uid, friendly(o.error));
    } else if (age > 30 * 60000 && order.status === 'purchasing') {
      await review(uid, order, 'achat non terminé après 30 minutes');
    }
    return order;
  }

  async function status(uid) {
    const ready = await buyReady().catch(() => ({ enabled: false }));
    const ordRef = db.collection('domain_orders').doc(uid);
    let os = await ordRef.get(), order = os.exists ? os.data() : null;
    if (order && OPEN.indexOf(order.status) >= 0) { await progress(uid, order); os = await ordRef.get(); order = os.exists ? os.data() : null; }
    const sSnap = await db.collection('mini_sites').doc(uid).get();
    const site = sSnap.exists ? sSnap.data() : {};
    const dom = String(site.customDomain || '');
    const regSnap = dom ? await db.collection('site_domains').doc(dom).get() : null;
    const reg = regSnap && regSnap.exists ? regSnap.data() || {} : null;
    const mine = !!(reg && reg.ownerUid === uid);
    const open = !!(order && OPEN.indexOf(order.status) >= 0);
    let state = 'none';
    if (open && order.kind !== 'renew') state = 'purchasing';
    else if (dom && mine) {
      if (!conf().ok) state = 'manual';
      else {
        let st = null; try { st = await vstate(dom); } catch (e) { st = null; }
        // Domaine enregistré avant la configuration de la clé Vercel : on l'ajoute au projet maintenant.
        if (st && !st.attached) { try { await attach(dom); st = await vstate(dom); } catch (e) { /* nouvel essai au prochain suivi */ } }
        state = st && st.live ? 'live' : 'pending';
        if (state === 'live' && reg.live !== true) await db.collection('site_domains').doc(dom).set({ live: true, liveAt: iso() }, { merge: true });
      }
    }
    const expiresAt = mine && reg.owned ? String(reg.expiresAt || '') : '';
    const left = expiresAt ? (ts(expiresAt) - Date.now()) / 86400000 : null;
    const out = {
      success: true, enabled: ready.enabled, state, domain: mine ? dom : '', owned: !!(mine && reg.owned), expiresAt,
      canRenew: !!(mine && reg.owned && left !== null && left <= RENEW_WINDOW_DAYS && !open),
      dns: mine && !reg.owned && (state === 'pending' || state === 'manual') ? DNS_HELP : null,
      order: order ? { kind: order.kind || 'buy', status: order.status, domain: order.domain || '', error: order.error || '' } : null
    };
    if (out.canRenew) {
      try { out.renewPrice = customerPrice(await basePrice(), await renewalCost(dom)); } catch (e) { out.canRenew = false; }
    }
    return out;
  }

  async function renew(uid, site, expected) {
    const ready = await buyReady();
    if (!ready.enabled) throw err(503, 'Le renouvellement automatique n’est pas encore activé.', 'disabled');
    const dom = String(site.customDomain || '');
    const regRef = db.collection('site_domains').doc(dom), reg = dom ? await regRef.get() : null;
    const re = reg && reg.exists ? reg.data() || {} : {};
    if (!dom || re.ownerUid !== uid || !re.owned) throw err(400, 'Ce domaine n’a pas été acheté ici.', 'not_owned');
    const cost = await renewalCost(dom);
    const price = customerPrice(await basePrice(), cost);
    if (round2(Number(expected)) !== price) throw err(409, 'Le prix est maintenant de ' + price + ' $. Vérifiez puis confirmez.', 'price_changed', { price });
    await debit(uid, price, { domain: dom, kind: 'renew', price, vercelPrice: cost, years: 1 }, 'Renouvellement du domaine ' + dom + ' (1 an)');
    const r = await vrenew(dom, cost);
    if (r.ok) {
      const from = Math.max(ts(re.expiresAt), Date.now());
      const expiresAt = addYear(from);
      await regRef.set({ expiresAt }, { merge: true });
      await flip(uid, ['paid'], { status: 'done', orderId: r.orderId, error: '' });
      return { success: true, expiresAt };
    }
    if (r.unknown) { await review(uid, { domain: dom }, 'renouvellement : réponse du registre non reçue'); return { success: true, pending: true }; }
    const msg = friendly(r.code).replace('Vous n’avez rien payé.', 'Vous avez été remboursé.');
    await refund(uid, msg);
    throw err(502, msg, r.code || 'failed', { refunded: true });
  }

  return { check, buy, renew, status, connectOwn, siteByDomain, claimDomain, releaseDomain, adminGet, adminSave, configured: () => conf().ok };
}

module.exports = { createSiteDomain, registrable, customerPrice, cleanContact, friendly, TLDS, DNS_HELP, MAX_COST };
