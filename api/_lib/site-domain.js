// api/_lib/site-domain.js
// Noms de domaine des sites : vérification, achat automatique, connexion au projet, renouvellement.
// Tout passe par l'API officielle de Vercel (registrar + domaines du projet) : aucune étape manuelle.
//
// Données, toutes réservées au serveur (aucune règle Firestore à ouvrir) :
//   site_domains/{domaine}  registre : { ownerUid, at, live, owned, expiresAt, orderId }
//   domain_orders/{uid}     dernier achat / renouvellement du propriétaire (statut, prix, erreur)
//   site_config/domain      coordonnées du titulaire + réglages (marge, plafond par jour, pause) de l'administrateur
//   domain_stats/total      ventes cumulées (encaissé, coût réel, bénéfice) + 15 dernières ventes (dont le détail « Achat Domaine »)
//   domain_stats/day-AAAA-MM-JJ  nombre d'achats du jour (plafond de sécurité)
// Deux façons d'acheter, avec des prix séparés : « site » (depuis Crée ton site, le nom est relié au site) et
// « shop » (service Achat Domaine : le nom est acheté seul, puis relié au site quand le client le décide).
// Le paiement se fait avec le portefeuille (users/{uid}.balance), au prix configuré par l'administrateur.
// Un achat refusé est remboursé automatiquement, dans la même transaction que la mise à jour du statut.

const { buildWalletTxEntry } = require('./wallet-ledger');

const API = 'https://api.vercel.com';
// Extensions simples (aucune pièce justificative supplémentaire) : les autres se connectent mais ne s'achètent pas ici.
const TLDS = ['com', 'net', 'org', 'info', 'biz', 'co', 'shop', 'store', 'online', 'site', 'website', 'xyz', 'app', 'dev', 'tech', 'me'];
const MAX_COST = 60;                       // jamais d'achat au-dessus de 60 $ de coût réel (noms « premium »)
const SHOP_DEFAULTS = { on: true, base: 15, marginMin: 5, marginPct: 30 };
const DEFAULTS = { marginMin: 5, marginPct: 30, maxPerDay: 10, on: true, shop: SHOP_DEFAULTS };
const REVIEW_WAIT_MS = 30 * 60000;         // une commande à vérifier est revérifiée seule après 30 minutes
const REVIEW_REFUND_MS = 60 * 60000;       // sans trace du domaine après 1 heure, le client est remboursé seul
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
// Réglages de l'administrateur, toujours ramenés à des valeurs raisonnables.
const num = (v, d, lo, hi) => { if (v === undefined || v === null || v === '') return d; const n = Number(v); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
// Réglages du service « Achat Domaine » : prix minimum par an + marge (la plus grande des deux marges s'applique).
function cleanShop(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    on: s.on !== false,
    base: round2(num(s.base, SHOP_DEFAULTS.base, 0, 500)),
    marginMin: round2(num(s.marginMin, SHOP_DEFAULTS.marginMin, 0, 100)),
    marginPct: round2(num(s.marginPct, SHOP_DEFAULTS.marginPct, 0, 300))
  };
}
function cleanSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    marginMin: round2(num(s.marginMin, DEFAULTS.marginMin, 0, 100)),
    marginPct: round2(num(s.marginPct, DEFAULTS.marginPct, 0, 300)),
    maxPerDay: Math.round(num(s.maxPerDay, DEFAULTS.maxPerDay, 1, 500)),
    on: s.on !== false,
    shop: cleanShop(s.shop)
  };
}
// Prix payé par le client pour 1 an : le prix configuré (mensuel × 12) OU le coût réel + la marge (la plus grande des deux
// valeurs : montant minimum ou pourcentage). Jamais en dessous du coût réel + 1 $, quels que soient les réglages.
function customerPrice(basePerYear, cost, settings) {
  const c = Number(cost) || 0, m = cleanSettings(settings);
  return Math.max(round2(basePerYear), Math.ceil(c + Math.max(m.marginMin, c * m.marginPct / 100)), Math.ceil(c) + 1);
}
// Prix du service Achat Domaine (coût réel + marge, jamais sous le prix minimum du service ni sous le coût + 1 $).
function shopPrice(cost, settings) {
  const sh = cleanSettings(settings).shop;
  return customerPrice(sh.base, cost, sh);
}
// Prix payé pour une opération : « shop » = tarif Achat Domaine ; sinon tarif de Crée ton site (prix mensuel × 12 ou coût + marge).
function priceFor(via, base, cost, settings) {
  return via === 'shop' ? shopPrice(cost, settings) : customerPrice(base, cost, settings);
}
const dayKey = () => new Date().toISOString().slice(0, 10);
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

function createSiteDomain({ db, adminUid, push, env, fetch: fetchImpl, canConnect }) {
  const E = env || process.env;
  const fetchFn = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const conf = () => ({ token: E.VERCEL_TOKEN || '', project: E.VERCEL_PROJECT_ID || '', team: E.VERCEL_TEAM_ID || '', ok: !!(E.VERCEL_TOKEN && E.VERCEL_PROJECT_ID && fetchFn) });

  // ---------------- Appels à Vercel ----------------
  // Appel brut : « team » = identifiant d'équipe à ajouter à l'adresse (vide = compte personnel).
  async function vraw(method, path, body, o) {
    o = o || {};
    if (!fetchFn) throw err(503, 'Service indisponible.', 'no_fetch');
    const c = conf();
    const url = API + path + (o.team ? (path.indexOf('?') >= 0 ? '&' : '?') + 'teamId=' + encodeURIComponent(o.team) : '');
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
  // Équipe Vercel à utiliser : celle de VERCEL_TEAM_ID si elle est donnée ; sinon trouvée toute seule
  // (le projet est cherché d'abord dans le compte personnel, puis dans chaque équipe du compte). Gardée en mémoire.
  let scope = { team: '', ok: false, at: 0 };
  async function scopeTeam() {
    const c = conf();
    if (c.team) return c.team;
    if (!c.token || !c.project) return '';
    if (scope.ok || Date.now() - scope.at < 60000) return scope.team;
    scope.at = Date.now();
    try {
      const direct = await vraw('GET', '/v9/projects/' + encodeURIComponent(c.project), null, { timeoutMs: 6000 });
      if (direct.status === 200) { scope = { team: '', ok: true, at: Date.now() }; return ''; }
      const tl = await vraw('GET', '/v2/teams?limit=20', null, { timeoutMs: 6000 });
      const teams = tl.status === 200 && Array.isArray(tl.json.teams) ? tl.json.teams : [];
      for (const t of teams.slice(0, 10)) {
        if (!t || !t.id) continue;
        const r = await vraw('GET', '/v9/projects/' + encodeURIComponent(c.project), null, { team: t.id, timeoutMs: 6000 });
        if (r.status === 200) { scope = { team: String(t.id), ok: true, at: Date.now() }; return scope.team; }
      }
    } catch (e) { /* on réessaiera dans une minute */ }
    return '';
  }
  async function vcall(method, path, body, o) {
    o = o || {};
    const team = o.team === false ? '' : await scopeTeam();
    return vraw(method, path, body, Object.assign({}, o, { team }));
  }
  const proj = () => encodeURIComponent(conf().project);

  // Disponibilité et prix réels du registre (appel public, sans clé).
  const shapeSearch = (it) => {
    if (!(it.available === true || it.available === 'true')) return { available: false };
    return { available: true, price: Number(it.price), renewalPrice: Number(it.renewalPrice || it.price), years: Number(it.years) || 1, premium: it.premium === true || it.premium === 'true' };
  };
  // Plusieurs noms en un seul appel (jusqu'à 200). Rend { nom: { available, price, ... } } ; les noms absents de la réponse sont omis.
  async function searchMany(domains, timeoutMs) {
    let r;
    try { r = await vcall('POST', '/v1/registrar/domains/search', { domains }, { auth: false, team: false, timeoutMs: timeoutMs || 8000 }); } catch (e) { throw err(503, 'Vérification momentanément impossible. Réessayez.', 'unreachable'); }
    const list = r.status === 200 && r.json && Array.isArray(r.json.results) ? r.json.results : null;
    if (!list) throw err(503, 'Vérification momentanément impossible. Réessayez.', 'unreachable');
    const out = {};
    list.forEach((x) => { if (x && typeof x.domain === 'string') out[x.domain] = shapeSearch(x); });
    return out;
  }
  async function search(domain) {
    const list = await searchMany([domain]);
    const it = list[domain] || list[Object.keys(list)[0]];
    if (!it) throw err(503, 'Vérification momentanément impossible. Réessayez.', 'unreachable');
    return it;
  }
  // Coût réel (achat et renouvellement) de chaque extension chez Vercel, pour l'écran de l'administrateur.
  // Mesuré sur un nom inventé qui n'existe pas ; gardé 10 minutes en mémoire.
  let tldCache = { at: 0, v: null };
  async function tldCosts() {
    if (tldCache.v && Date.now() - tldCache.at < 600000) return tldCache.v;
    if (!fetchFn) return {};
    const label = 'cn' + Math.random().toString(36).slice(2, 9) + 'qz';
    try {
      const list = await searchMany(TLDS.map((t) => label + '.' + t), 6000);
      const out = {};
      TLDS.forEach((t) => {
        const it = list[label + '.' + t];
        if (it && it.available && it.price > 0 && !it.premium) out[t] = { buy: round2(it.price), renew: round2(it.renewalPrice > 0 ? it.renewalPrice : it.price) };
      });
      if (Object.keys(out).length) tldCache = { at: Date.now(), v: out };
      return out;
    } catch (e) { return tldCache.v || {}; }
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
  // Le nom est-il dans le compte Vercel ? true / false seulement si la réponse est certaine, sinon null.
  async function owns(domain) {
    try {
      const r = await vcall('GET', '/v5/domains/' + encodeURIComponent(domain));
      if (r.status === 404) return false;
      if (r.status === 200) { const n = r.json && (r.json.domain && r.json.domain.name || r.json.name); return n === domain ? true : null; }
    } catch (e) { /* inconnu */ }
    return null;
  }

  // ---------------- Réglages de l'administrateur ----------------
  async function loadConfig() {
    const s = await db.collection('site_config').doc('domain').get();
    const d = s.exists ? s.data() || {} : {};
    const c = d.contact ? cleanContact(d.contact) : null;
    return { contact: c && c.ok ? c.value : null, raw: d.contact || {}, settings: cleanSettings(d.settings) };
  }
  async function basePrice() {
    const s = await db.collection('pricing').doc('site').get();
    const m = s.exists && typeof s.data().domainPriceMonth === 'number' && s.data().domainPriceMonth > 0 ? s.data().domainPriceMonth : 4;
    return round2(m * 12);
  }
  // Contrôle gratuit (aucun achat) : la clé est-elle acceptée et le projet existe-t-il ? Lecture seule.
  async function pingVercel() {
    const c = conf();
    if (!c.ok) return { state: 'none' };
    scope = { team: '', ok: false, at: 0 };
    try {
      const team = await scopeTeam();
      const r = await vraw('GET', '/v9/projects/' + encodeURIComponent(c.project), null, { team, timeoutMs: 6000 });
      if (r.status === 200) return { state: 'ok', project: clean(r.json && r.json.name, 80), team: !!team };
      if (r.status === 401 || r.status === 403) return { state: 'token' };
      if (r.status === 404) return { state: 'project' };
    } catch (e) { /* injoignable */ }
    return { state: 'unreachable' };
  }
  async function adminGet() {
    const cfg = await loadConfig(), c = conf(), ct = cleanContact(cfg.raw);
    const [base, st, rv, live, costs] = await Promise.all([
      basePrice(),
      db.collection('domain_stats').doc('total').get(),
      db.collection('domain_orders').where('status', '==', 'review').limit(20).get(),
      pingVercel(),
      tldCosts()
    ]);
    const t = st.exists ? st.data() || {} : {};
    return {
      success: true, vercel: { token: !!c.token, project: !!c.project, live }, contact: cfg.raw, contactOk: ct.ok, missing: ct.missing,
      ready: c.ok && ct.ok && live.state !== 'token' && live.state !== 'project', paused: !cfg.settings.on, tlds: TLDS, settings: cfg.settings, base,
      stats: { count: t.count || 0, revenue: round2(t.revenue || 0), cost: round2(t.cost || 0), profit: round2(t.profit || 0), last: Array.isArray(t.last) ? t.last : [], shop: { count: t.shopCount || 0, revenue: round2(t.shopRevenue || 0), profit: round2(t.shopProfit || 0) } },
      tldCosts: costs,
      reviews: rv.docs.map((d) => { const o = d.data() || {}; return { uid: o.uid || d.id, domain: o.domain || '', kind: o.kind || 'buy', price: Number(o.price) || 0, error: o.error || '', createdAt: o.createdAt || '' }; })
    };
  }
  // Enregistre les coordonnées (si fournies) et/ou les réglages (si fournis). Le reste est conservé.
  async function adminSave(rawContact, rawSettings) {
    const ref = db.collection('site_config').doc('domain');
    const cur = await ref.get(), d = cur.exists ? cur.data() || {} : {};
    const out = { contact: d.contact || {}, settings: cleanSettings(d.settings), updatedAt: iso() };
    if (rawContact) {
      const ct = cleanContact(rawContact);
      if (!ct.ok) throw err(400, 'Complétez les champs : ' + ct.missing.join(', ') + '.', 'contact');
      out.contact = ct.value;
    }
    if (rawSettings && typeof rawSettings === 'object') {
      const merged = Object.assign({}, out.settings, rawSettings);
      merged.shop = Object.assign({}, out.settings.shop, rawSettings.shop && typeof rawSettings.shop === 'object' ? rawSettings.shop : {});
      out.settings = cleanSettings(merged);
    }
    await ref.set(out);
    return adminGet();
  }
  // Prêt à acheter (clé Vercel + coordonnées + pas en pause) ; le renouvellement reste possible pendant une pause.
  async function buyReady() {
    const cfg = await loadConfig(), c = conf();
    const base = { settings: cfg.settings, contact: cfg.contact };
    if (!c.ok) return Object.assign(base, { enabled: false, renewOk: false, why: 'vercel' });
    if (!cfg.contact) return Object.assign(base, { enabled: false, renewOk: false, why: 'contact' });
    if (!cfg.settings.on) return Object.assign(base, { enabled: false, renewOk: true, why: 'paused' });
    return Object.assign(base, { enabled: true, renewOk: true });
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
  // Débit et ouverture de la commande dans UNE seule transaction. Pour un achat : plafond d'achats par jour.
  async function debit(uid, amount, order, desc, maxPerDay) {
    const buyerRef = db.collection('users').doc(uid), adminRef = db.collection('users').doc(adminUid), ordRef = db.collection('domain_orders').doc(uid);
    const isBuy = order.kind === 'buy', day = dayKey(), dayRef = db.collection('domain_stats').doc('day-' + day);
    return db.runTransaction(async (tx) => {
      const [b, o, dy] = await Promise.all([tx.get(buyerRef), tx.get(ordRef), isBuy ? tx.get(dayRef) : null]);
      const a = uid !== adminUid ? await tx.get(adminRef) : null;
      if (!b.exists) throw err(404, 'Compte introuvable.');
      if (o.exists && OPEN.indexOf(o.data().status) >= 0) throw err(409, 'Une opération sur un domaine est déjà en cours.', 'busy');
      const bal = Number(b.data().balance) || 0;
      if (bal < amount) throw err(402, 'Solde insuffisant : il vous faut ' + amount + ' $ dans le portefeuille.', 'balance', { price: amount, balance: round2(bal) });
      const n = dy && dy.exists ? Number(dy.data().n) || 0 : 0;
      if (isBuy && n >= (maxPerDay || DEFAULTS.maxPerDay)) throw err(429, 'Beaucoup d’achats de domaines aujourd’hui. Réessayez demain. Vous n’avez rien payé.', 'cap');
      const nb = round2(bal - amount);
      tx.update(buyerRef, { balance: nb });
      tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'site_domain_purchase', amount: -amount, balanceAfter: nb, description: desc, relatedId: null }));
      if (a && a.exists) {
        const na = round2((Number(a.data().balance) || 0) + amount);
        tx.update(adminRef, { balance: na });
        tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: adminUid, type: 'site_domain_purchase_income', amount, balanceAfter: na, description: desc, relatedId: uid }));
      }
      if (isBuy) tx.set(dayRef, { n: n + 1, day });
      tx.set(ordRef, Object.assign({ uid, status: 'paid', createdAt: iso(), updatedAt: iso() }, order, isBuy ? { day } : {}));
      return { balance: nb };
    });
  }
  // Remboursement unique : ne s'applique qu'à une opération encore ouverte. Rend le montant, ou null si déjà fait.
  async function refund(uid, reason) {
    const buyerRef = db.collection('users').doc(uid), adminRef = db.collection('users').doc(adminUid), ordRef = db.collection('domain_orders').doc(uid);
    return db.runTransaction(async (tx) => {
      const o = await tx.get(ordRef);
      if (!o.exists || OPEN.indexOf(o.data().status) < 0) return null;
      const od = o.data(), amount = Number(od.price) || 0;
      const dayRef = od.kind === 'buy' && od.day ? db.collection('domain_stats').doc('day-' + od.day) : null;
      const b = await tx.get(buyerRef);
      const a = uid !== adminUid ? await tx.get(adminRef) : null;
      const dy = dayRef ? await tx.get(dayRef) : null;
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
      // Un achat remboursé ne compte pas dans le plafond du jour.
      if (dayRef && dy && dy.exists) tx.set(dayRef, { n: Math.max(0, (Number(dy.data().n) || 0) - 1), day: od.day });
      tx.update(ordRef, { status: 'refunded', error: String(reason || '').slice(0, 200), updatedAt: iso() });
      return amount;
    });
  }
  // Change l'état de la commande si elle est dans l'un des états attendus. Avec « sale », la vente est aussi
  // ajoutée aux totaux (même transaction : jamais comptée deux fois). Rend la ligne de vente, ou true, ou false.
  async function flip(uid, from, patch, sale) {
    const ref = db.collection('domain_orders').doc(uid), stRef = db.collection('domain_stats').doc('total');
    return db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists || from.indexOf(s.data().status) < 0) return false;
      const st = sale ? await tx.get(stRef) : null;
      tx.update(ref, Object.assign({ updatedAt: iso() }, patch));
      if (!sale) return true;
      const od = s.data(), price = Number(od.price) || 0, cost = Number(od.vercelPrice) || 0;
      const cur = st && st.exists ? st.data() || {} : {};
      const via = od.via === 'shop' ? 'shop' : 'site';
      const line = { uid, domain: od.domain || '', kind: od.kind || 'buy', via, price, cost, profit: round2(price - cost), at: iso() };
      const upd = {
        count: (Number(cur.count) || 0) + 1, revenue: round2((Number(cur.revenue) || 0) + price), cost: round2((Number(cur.cost) || 0) + cost),
        profit: round2((Number(cur.profit) || 0) + line.profit), last: [line].concat(Array.isArray(cur.last) ? cur.last : []).slice(0, 15), updatedAt: iso()
      };
      if (via === 'shop') Object.assign(upd, { shopCount: (Number(cur.shopCount) || 0) + 1, shopRevenue: round2((Number(cur.shopRevenue) || 0) + price), shopProfit: round2((Number(cur.shopProfit) || 0) + line.profit) });
      else Object.assign(upd, { shopCount: Number(cur.shopCount) || 0, shopRevenue: round2(Number(cur.shopRevenue) || 0), shopProfit: round2(Number(cur.shopProfit) || 0) });
      tx.set(stRef, upd);
      return line;
    });
  }
  async function tell(uid, title, body, type, url) {
    const to = uid === adminUid ? '/admin.html' : (url || '/?mysite=1');
    try {
      await db.collection('notifications').add({ uid, title, body, type, url: to, read: false, createdAt: iso() });
      if (push) await push(uid, title, body, to, { category: 'activity' });
    } catch (e) { /* la notification ne doit jamais bloquer l'opération */ }
  }
  async function review(uid, order, why) {
    const done = await flip(uid, ['paid', 'purchasing'], { status: 'review', error: why });
    if (done) await tell(adminUid, 'Domaine à vérifier', (order.domain || '') + ' : ' + why + ' (compte ' + uid + '). Le système revérifie seul ; sinon utilisez Rembourser ou Valider dans l’onglet Domaines.', 'site_domain_review');
  }
  async function refundAndTell(uid, order, reason) {
    const amount = await refund(uid, reason);
    if (amount !== null) await tell(uid, 'Domaine remboursé', 'Votre achat de ' + (order.domain || 'domaine') + ' n’a pas pu être fait. ' + amount + ' $ ont été remis dans votre portefeuille.', 'site_domain_refund');
    return amount;
  }
  // Nouvelle date d'échéance : un an de plus, à partir de l'échéance actuelle (ou d'aujourd'hui si elle est passée).
  async function extend(domain) {
    const ref = db.collection('site_domains').doc(domain), cur = await ref.get();
    const expiresAt = addYear(Math.max(ts(cur.exists ? (cur.data() || {}).expiresAt : ''), Date.now()));
    await ref.set({ expiresAt }, { merge: true });
    return expiresAt;
  }
  // Vente terminée : prévient le client et l'administrateur (avec le bénéfice).
  async function soldTell(uid, line, title, body, url) {
    await tell(uid, title, body, 'site_domain_ready', url);
    if (uid !== adminUid) await tell(adminUid, line.kind === 'renew' ? 'Domaine renouvelé' : 'Domaine vendu', line.domain + ' : payé ' + line.price + ' $, coût réel ' + line.cost + ' $, bénéfice ' + line.profit + ' $' + (line.via === 'shop' ? ' (Achat Domaine)' : '') + '.', 'site_domain_sale');
  }

  // ---------------- Parcours ----------------
  async function check(uid, dom) {
    if (!registrable(dom)) return { success: true, state: 'unsupported', domain: dom };
    let r;
    try { r = await search(dom); } catch (e) { return { success: true, state: 'unreachable', domain: dom }; }
    if (!r.available) return { success: true, state: 'taken', domain: dom };
    if (r.premium || !(r.price > 0) || r.price > MAX_COST || r.years !== 1) return { success: true, state: 'unsupported', domain: dom };
    const [ready, base, balance] = await Promise.all([buyReady(), basePrice(), balanceOf(uid)]);
    return { success: true, state: 'available', domain: dom, price: customerPrice(base, r.price, ready.settings), years: 1, balance, enabled: ready.enabled };
  }

  // Achat commun aux deux services. via = 'site' (depuis Crée ton site, le site doit exister et être sans domaine)
  // ou 'shop' (Achat Domaine : le nom est acheté seul).
  async function buyCore(uid, site, dom, expected, via) {
    const shop = via === 'shop';
    const ready = await buyReady();
    if (!ready.enabled || (shop && !ready.settings.shop.on)) {
      const paused = ready.why === 'paused' || (ready.enabled && shop);
      throw err(503, shop
        ? (paused ? 'La vente de domaines est en pause pour le moment. Revenez un peu plus tard.' : 'L’achat de domaines n’est pas encore activé. Revenez un peu plus tard.')
        : (paused ? 'L’achat de domaines est en pause pour le moment. Si vous avez déjà un domaine, connectez-le.' : 'L’achat automatique n’est pas encore activé. Si vous avez déjà un domaine, connectez-le.'), 'disabled');
    }
    if (!registrable(dom)) throw err(400, shop ? 'Cette extension n’est pas proposée.' : 'Cette extension ne peut pas être achetée ici. Si vous possédez déjà ce nom, connectez-le.', 'tld');
    if (!shop && site.customDomain) throw err(409, 'Retirez d’abord votre domaine actuel.', 'has_domain');
    const reg = await db.collection('site_domains').doc(dom).get();
    const re = reg.exists ? reg.data() || {} : {};
    if (re.ownerUid && re.ownerUid !== uid && (re.owned || re.live === true)) throw err(409, 'Ce nom est déjà utilisé par un autre site.', 'taken');
    const s = await search(dom);
    if (!s.available) throw err(409, 'Ce nom n’est plus disponible.', 'taken');
    if (s.premium || !(s.price > 0) || s.price > MAX_COST || s.years !== 1) throw err(400, 'Ce nom ne peut pas être acheté automatiquement.', 'unsupported');
    const price = priceFor(via, await basePrice(), s.price, ready.settings);
    if (round2(Number(expected)) !== price) throw err(409, 'Le prix est maintenant de ' + price + ' $. Vérifiez puis confirmez.', 'price_changed', { price });
    await debit(uid, price, { domain: dom, kind: 'buy', via: shop ? 'shop' : 'site', price, vercelPrice: s.price, years: 1 }, 'Achat du domaine ' + dom + ' (1 an)', ready.settings.maxPerDay);
    const r = await vbuy(dom, s.price, 1, ready.contact);
    if (r.ok) { await flip(uid, ['paid'], { status: 'purchasing', orderId: r.orderId }); return { success: true, status: 'purchasing' }; }
    if (r.unknown) { await review(uid, { domain: dom }, 'réponse du registre non reçue : vérification en cours'); return { success: true, status: 'purchasing' }; }
    const msg = friendly(r.code);
    await refund(uid, msg);
    throw err(502, msg, r.code || 'failed', { refunded: true });
  }
  const buy = (uid, site, dom, expected) => buyCore(uid, site, dom, expected, 'site');
  const shopBuy = (uid, dom, expected) => buyCore(uid, null, dom, expected, 'shop');

  // Termine un achat accepté : réservation, site relié, domaine ajouté au projet. Idempotent.
  async function finish(uid, order) {
    const dom = order.domain, siteRef = db.collection('mini_sites').doc(uid);
    // Achat Domaine : le nom est mis à l'abri dans le compte du client ; il sera relié à son site quand il le décide.
    if (order.via === 'shop') {
      const regRef = db.collection('site_domains').doc(dom), cur = await regRef.get(), e = cur.exists ? cur.data() || {} : {};
      if (!(e.owned && e.ownerUid === uid)) await regRef.set({ ownerUid: uid, at: iso(), live: false, owned: true, via: 'shop', orderId: order.orderId || '', expiresAt: order.expiresAt || addYear(), boughtAt: iso() });
      const line = await flip(uid, ['purchasing', 'review'], { status: 'done', error: '' }, true);
      if (line) await soldTell(uid, line, 'Votre domaine est prêt', dom + ' est acheté. Ouvrez Achat Domaine pour le connecter à votre site.', '/?domaines=1');
      return;
    }
    await db.collection('site_domains').doc(dom).set({ ownerUid: uid, at: iso(), live: true, owned: true, orderId: order.orderId || '', expiresAt: order.expiresAt || addYear(), boughtAt: iso() });
    await siteRef.update({ customDomain: dom, updatedAt: iso() });
    await attach(dom);
    const line = await flip(uid, ['purchasing', 'review'], { status: 'done', error: '' }, true);
    if (line) await soldTell(uid, line, 'Votre domaine est prêt', dom + ' est acheté et connecté à votre site.');
  }

  async function progress(uid, order) {
    const age = Date.now() - ts(order.createdAt);
    if (order.status === 'paid') {
      if (age > 3 * 60000) await review(uid, order, 'opération interrompue avant la réponse du registre');
      return order;
    }
    if (order.kind === 'renew') return order;
    if (!order.orderId) {
      // « À vérifier » sans numéro de commande : on regarde si le nom est dans le compte Vercel.
      if (order.status === 'review' && age > REVIEW_WAIT_MS) {
        const mine = await owns(order.domain);
        if (mine === true) { try { await finish(uid, order); } catch (e) { /* nouvel essai au prochain suivi */ } }
        else if (mine === false && age > REVIEW_REFUND_MS) await refundAndTell(uid, order, 'Achat non abouti : remboursé automatiquement.');
      }
      return order;
    }
    let o;
    try { o = await vorder(order.orderId); } catch (e) { return order; }
    if (o.status === 'completed') {
      try { await finish(uid, order); } catch (e) { if (age > 15 * 60000) await review(uid, order, 'domaine acheté mais connexion impossible : ' + clean(e && e.message, 80)); }
    } else if (o.status === 'failed') {
      await refundAndTell(uid, order, friendly(o.error));
    } else if (age > REVIEW_WAIT_MS) {
      const mine = await owns(order.domain);
      if (mine === true) { try { await finish(uid, order); } catch (e) { /* nouvel essai au prochain suivi */ } }
      else if (order.status === 'purchasing') await review(uid, order, 'achat non terminé après 30 minutes');
    }
    return order;
  }

  async function status(uid) {
    const ready = await buyReady().catch(() => ({ enabled: false, settings: cleanSettings() }));
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
      try { out.renewPrice = priceFor(reg.via, await basePrice(), await renewalCost(dom), ready.settings); } catch (e) { out.canRenew = false; }
    }
    return out;
  }

  async function renewCore(uid, dom, expected) {
    const ready = await buyReady();
    if (!ready.renewOk) throw err(503, 'Le renouvellement automatique n’est pas encore activé.', 'disabled');
    dom = String(dom || '');
    const regRef = db.collection('site_domains').doc(dom), reg = dom ? await regRef.get() : null;
    const re = reg && reg.exists ? reg.data() || {} : {};
    if (!dom || re.ownerUid !== uid || !re.owned) throw err(400, 'Ce domaine n’a pas été acheté ici.', 'not_owned');
    const cost = await renewalCost(dom);
    const via = re.via === 'shop' ? 'shop' : 'site';
    const price = priceFor(via, await basePrice(), cost, ready.settings);
    if (round2(Number(expected)) !== price) throw err(409, 'Le prix est maintenant de ' + price + ' $. Vérifiez puis confirmez.', 'price_changed', { price });
    await debit(uid, price, { domain: dom, kind: 'renew', via, price, vercelPrice: cost, years: 1 }, 'Renouvellement du domaine ' + dom + ' (1 an)');
    const r = await vrenew(dom, cost);
    if (r.ok) {
      const expiresAt = await extend(dom);
      const line = await flip(uid, ['paid'], { status: 'done', orderId: r.orderId, error: '' }, true);
      if (line) await soldTell(uid, line, 'Domaine renouvelé', dom + ' est renouvelé pour un an.', via === 'shop' ? '/?domaines=1' : '');
      return { success: true, expiresAt };
    }
    if (r.unknown) { await review(uid, { domain: dom }, 'renouvellement : réponse du registre non reçue'); return { success: true, pending: true }; }
    const msg = friendly(r.code).replace('Vous n’avez rien payé.', 'Vous avez été remboursé.');
    await refund(uid, msg);
    throw err(502, msg, r.code || 'failed', { refunded: true });
  }
  const renew = (uid, site, expected) => renewCore(uid, site && site.customDomain, expected);
  const shopRenew = (uid, dom, expected) => renewCore(uid, dom, expected);


  // ---------------- Service « Achat Domaine » ----------------
  const PRO_MSG = 'Le Pack Pro est nécessaire pour mettre votre site en ligne sur votre propre domaine. Activez-le dans l’application, puis revenez ici.';
  // Ce que le client a tapé : « Mon Nom », « monnom.com », « https://www.monnom.com/ »… → { label, tld } (tld vide si non donné).
  function parseQuery(raw) {
    let t = String(raw == null ? '' : raw).toLowerCase().trim();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ancien moteur */ }
    t = t.replace(/^[a-z]+:\/\//, '').replace(/[\/?#].*$/, '').replace(/^www\./, '').replace(/[\s'’_]+/g, '');
    const dot = t.lastIndexOf('.');
    const label = dot > 0 ? t.slice(0, dot) : t, tld = dot > 0 ? t.slice(dot + 1) : '';
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) return null;
    if (tld && !/^[a-z]{2,24}$/.test(tld)) return null;
    return { label, tld };
  }
  // Un nom tapé → disponibilité et prix sur toutes les extensions proposées (un seul appel au registre).
  async function shopSearch(uid, raw) {
    const q = parseQuery(raw);
    if (!q) throw err(400, 'Nom invalide. Utilisez des lettres, des chiffres ou des tirets. Exemple : monentreprise', 'bad_name');
    const names = TLDS.map((t) => q.label + '.' + t);
    let list;
    try { list = await searchMany(names); } catch (e) { throw err(503, 'Vérification momentanément impossible. Réessayez.', 'unreachable'); }
    const [ready, base, balance] = await Promise.all([buyReady(), basePrice(), balanceOf(uid)]);
    const results = TLDS.map((t) => {
      const d = q.label + '.' + t, it = list[d];
      if (!it) return { domain: d, tld: t, state: 'unknown' };
      if (!it.available) return { domain: d, tld: t, state: 'taken' };
      if (it.premium || !(it.price > 0) || it.price > MAX_COST || it.years !== 1) return { domain: d, tld: t, state: 'unsupported' };
      return { domain: d, tld: t, state: 'available', price: priceFor('shop', base, it.price, ready.settings) };
    });
    // Le nom tapé avec son extension passe en premier ; puis les disponibles, du moins cher au plus cher.
    const rank = (r) => (q.tld && r.tld === q.tld ? 0 : 1) * 10 + (r.state === 'available' ? 0 : r.state === 'taken' ? 2 : 1);
    results.sort((a, b) => rank(a) - rank(b) || (a.price || 0) - (b.price || 0));
    return { success: true, label: q.label, typed: q.tld && TLDS.indexOf(q.tld) < 0 ? q.tld : '', results, balance, enabled: !!(ready.enabled && ready.settings.shop.on) };
  }
  // « Mes domaines » : domaines achetés par ce client, état de l'achat en cours, ce qui peut être connecté ou renouvelé.
  async function shopList(uid) {
    const ready = await buyReady().catch(() => ({ enabled: false, settings: cleanSettings() }));
    const ordRef = db.collection('domain_orders').doc(uid);
    let os = await ordRef.get(), order = os.exists ? os.data() : null;
    if (order && OPEN.indexOf(order.status) >= 0) { await progress(uid, order); os = await ordRef.get(); order = os.exists ? os.data() : null; }
    const open = !!(order && OPEN.indexOf(order.status) >= 0);
    const [q, sSnap, balance] = await Promise.all([db.collection('site_domains').where('ownerUid', '==', uid).limit(60).get(), db.collection('mini_sites').doc(uid).get(), balanceOf(uid)]);
    const site = sSnap.exists ? sSnap.data() || {} : null;
    const rows = q.docs.map((d) => Object.assign({ domain: d.id }, d.data() || {})).filter((r) => r.owned === true && r.domain)
      .sort((a, b) => ts(b.boughtAt) - ts(a.boughtAt)).slice(0, 30);
    const base = await basePrice().catch(() => 48);
    const out = [];
    for (const r of rows) {
      const left = r.expiresAt ? (ts(r.expiresAt) - Date.now()) / 86400000 : null;
      const connected = !!(site && site.customDomain === r.domain);
      let state = connected ? 'pending' : 'free';
      if (connected && !conf().ok) state = 'manual';
      else if (connected) {
        let st = null; try { st = await vstate(r.domain); } catch (e) { st = null; }
        if (st && !st.attached) { try { await attach(r.domain); st = await vstate(r.domain); } catch (e) { /* nouvel essai au prochain suivi */ } }
        state = st && st.live ? 'live' : 'pending';
        if (state === 'live' && r.live !== true) await db.collection('site_domains').doc(r.domain).set({ live: true, liveAt: iso() }, { merge: true });
      }
      out.push({ domain: r.domain, via: r.via === 'shop' ? 'shop' : 'site', expiresAt: String(r.expiresAt || ''), daysLeft: left === null ? null : Math.floor(left), connected, state, canRenew: left !== null && left <= RENEW_WINDOW_DAYS && !open });
    }
    // Prix de renouvellement : seulement pour les noms proches de l'échéance (peu d'appels).
    await Promise.all(out.filter((x) => x.canRenew).slice(0, 6).map(async (x) => {
      try { x.renewPrice = priceFor(x.via, base, await renewalCost(x.domain), ready.settings); } catch (e) { x.canRenew = false; }
    }));
    out.forEach((x) => { if (x.canRenew && !(x.renewPrice > 0)) x.canRenew = false; });
    const proOk = site && canConnect ? !!(await canConnect(uid, site)) : !!site;
    return {
      success: true, enabled: !!(ready.enabled && ready.settings.shop.on), balance, hasSite: !!site, proOk, siteDomain: site && site.customDomain ? String(site.customDomain) : '', domains: out,
      order: order ? { kind: order.kind || 'buy', status: order.status, domain: order.domain || '', error: order.error || '', at: order.updatedAt || '' } : null
    };
  }
  // Relie un domaine du client à son site Coeurnoh (« connect »), ou le détache (« disconnect »). Le domaine reste au client.
  async function shopConnect(uid, domain, mode) {
    const dom = String(domain || '').toLowerCase();
    const reg = dom ? await db.collection('site_domains').doc(dom).get() : null, re = reg && reg.exists ? reg.data() || {} : {};
    if (!dom || re.ownerUid !== uid || re.owned !== true) throw err(403, 'Ce domaine n’est pas dans votre compte.', 'not_owned');
    const siteRef = db.collection('mini_sites').doc(uid), sSnap = await siteRef.get();
    if (!sSnap.exists) throw err(409, 'Créez d’abord votre site (Crée ton site), puis connectez votre domaine.', 'no_site');
    const site = sSnap.data() || {};
    if (mode === 'disconnect') {
      if (site.customDomain === dom) await siteRef.update({ customDomain: null, updatedAt: iso() });
      return { success: true, connected: false };
    }
    if (canConnect && !(await canConnect(uid, site))) throw err(402, PRO_MSG, 'pro_needed');
    if (site.customDomain === dom) { const same = await connectOwn(dom); return { success: true, connected: true, connect: same }; }
    const before = String(site.customDomain || '');
    if (before) await releaseDomain(before, uid);
    await siteRef.update({ customDomain: dom, updatedAt: iso() });
    const connect = await connectOwn(dom);
    return { success: true, connected: true, connect };
  }

  // Décision de l'administrateur sur une commande « à vérifier » : rembourser le client, ou la valider (domaine bien acheté).
  async function adminResolve(uid, decision) {
    uid = String(uid || '');
    const s = uid ? await db.collection('domain_orders').doc(uid).get() : null;
    if (!s || !s.exists || s.data().status !== 'review') throw err(404, 'Aucune commande à vérifier pour ce compte.', 'none');
    const order = s.data();
    if (decision === 'refund') await refundAndTell(uid, order, 'Remboursé par l’administrateur.');
    else if (decision === 'done') {
      if (order.kind === 'renew') {
        await extend(order.domain);
        const line = await flip(uid, ['review'], { status: 'done', error: '' }, true);
        if (line) await soldTell(uid, line, 'Domaine renouvelé', order.domain + ' est renouvelé pour un an.', order.via === 'shop' ? '/?domaines=1' : '');
      } else await finish(uid, order);
    } else throw err(400, 'Choix inconnu.', 'bad');
    return adminGet();
  }

  return { check, buy, renew, status, shopSearch, shopBuy, shopRenew, shopList, shopConnect, connectOwn, siteByDomain, claimDomain, releaseDomain, adminGet, adminSave, adminResolve, configured: () => conf().ok };
}

module.exports = { createSiteDomain, registrable, customerPrice, shopPrice, priceFor, cleanContact, cleanSettings, cleanShop, friendly, TLDS, DNS_HELP, MAX_COST, DEFAULTS, SHOP_DEFAULTS };
