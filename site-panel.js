// api/_lib/site-panel.js
// « Panel » d'un mini-site : le proprietaire connecte l'API (format SMM v2) de SON fournisseur, publie un catalogue
// avec sa marge, et ses visiteurs envoient des demandes. ISOLATION : tout est limite au site du proprietaire ;
// la cle du fournisseur est chiffree, jamais renvoyee au navigateur ; aucune commande n'est envoyee au fournisseur
// sans clic du proprietaire ; les appels sortants passent par safe-http (pas d'acces au reseau interne).
// NOTE : safe-http et secret-box sont integres ci-dessous pour que ce fichier fonctionne seul (aucun autre fichier a deposer).
const __safeHttp = (function () {
  const module = { exports: {} }; const exports = module.exports;
// api/_lib/safe-http.js
// Appels HTTP sortants SECURISES vers des adresses fournies par les utilisateurs (panel du fournisseur, webhook).
// Objectif : un utilisateur ne peut JAMAIS faire atteindre au serveur l'interieur de l'infrastructure
// (localhost, reseaux prives, metadonnees cloud) ni le bloquer. Garanties :
//  - HTTPS uniquement, port 443, pas d'identifiants dans l'adresse, pas d'adresse IP « brute » privee ;
//  - l'adresse IP reellement utilisee est controlee AU MOMENT de la connexion (anti « DNS rebinding ») ;
//  - aucune redirection suivie, delai maximal, taille de reponse plafonnee.
const https = require('https');
const dns = require('dns');
const net = require('net');

function isPrivateIp(ip) {
  const v = net.isIP(ip);
  if (v === 4) {
    const p = ip.split('.').map(Number), [a, b] = p;
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 192 && b === 0 && p[2] === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    const m = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); if (m) return isPrivateIp(m[1]);
    return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith('ff') || s.startsWith('2001:db8');
  }
  return true; // inconnu = refuse
}

function parseSafeUrl(raw) {
  let u; try { u = new URL(String(raw || '').trim()); } catch (e) { throw new Error('Adresse invalide. Exemple : https://monpanel.com/api/v2'); }
  if (String(raw).length > 300) throw new Error('Adresse trop longue.');
  if (u.protocol !== 'https:') throw new Error('L’adresse doit commencer par https://');
  if (u.username || u.password) throw new Error('Retirez l’identifiant et le mot de passe de l’adresse.');
  if (u.port && u.port !== '443') throw new Error('Seul le port HTTPS standard (443) est accepté.');
  const h = u.hostname.toLowerCase();
  if (net.isIP(h.replace(/^\[|\]$/g, '')) && isPrivateIp(h.replace(/^\[|\]$/g, ''))) throw new Error('Cette adresse n’est pas autorisée.');
  if (!h.includes('.') || /(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(h) || /^\d+$/.test(h.split('.').pop())) {
    if (!net.isIP(h.replace(/^\[|\]$/g, ''))) throw new Error('Utilisez le nom de domaine public de votre panel.');
  }
  return u;
}

const guardedLookup = (hostname, options, cb) => {
  if (typeof options === 'function') { cb = options; options = {}; }
  dns.lookup(hostname, { family: 0, all: false }, (err, address, family) => {
    if (err) return cb(err);
    if (isPrivateIp(address)) return cb(new Error('Adresse non autorisée.'));
    cb(null, address, family);
  });
};

function safeRequest({ url, method, headers, body, timeoutMs, maxBytes, lookup }) {
  return new Promise((resolve, reject) => {
    let u; try { u = parseSafeUrl(url); } catch (e) { return reject(e); }
    const limit = maxBytes || 1000000;
    const req = https.request({ method: method || 'GET', hostname: u.hostname, path: u.pathname + u.search, port: 443, headers: Object.assign({ 'User-Agent': 'CoeurnohSiteConnector/1.0', Accept: 'application/json' }, headers || {}), lookup: lookup || guardedLookup, timeout: timeoutMs || 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) { res.resume(); return reject(new Error('Le panel redirige la requête (non autorisé). Utilisez l’adresse finale.')); }
      const chunks = []; let size = 0;
      res.on('data', (c) => { size += c.length; if (size > limit) { req.destroy(new Error('Réponse trop volumineuse.')); return; } chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Le panel ne répond pas (délai dépassé).')));
    req.on('error', (e) => reject(new Error(/non autorisée/.test(e.message) ? 'Adresse non autorisée.' : (e.message || 'Connexion impossible.'))));
    if (body) req.write(body);
    req.end();
  });
}

module.exports = { isPrivateIp, parseSafeUrl, safeRequest };

  return module.exports;
})();
const box = (function () {
  const module = { exports: {} }; const exports = module.exports;
// api/_lib/secret-box.js
// Chiffrement des secrets utilisateurs (cles API de leur panel, secret de webhook) avant stockage.
// AES-256-GCM ; la cle est derivee d'un secret serveur DEJA present (cle privee du compte de service Firebase) :
// aucune variable d'environnement a ajouter. Sans ce secret, le chiffrement est refuse (jamais de stockage en clair).
const crypto = require('crypto');

function keyFrom(secret) {
  if (!secret || String(secret).length < 20) throw new Error('Chiffrement indisponible sur le serveur.');
  return crypto.createHash('sha256').update('cn-site-api|' + secret).digest();
}
function seal(plain, secret) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return 'v1.' + [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join('.');
}
function open(sealed, secret) {
  const p = String(sealed || '').split('.'); if (p[0] !== 'v1' || p.length !== 4) throw new Error('Secret illisible.');
  const d = crypto.createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(p[1], 'base64')); d.setAuthTag(Buffer.from(p[2], 'base64'));
  return Buffer.concat([d.update(Buffer.from(p[3], 'base64')), d.final()]).toString('utf8');
}
const mask = (k) => { k = String(k || ''); return k.length <= 6 ? '••••' : '••••' + k.slice(-4); };
const serverSecret = () => process.env.FIREBASE_PRIVATE_KEY || '';
module.exports = { seal, open, mask, serverSecret };

  return module.exports;
})();
const { safeRequest, parseSafeUrl } = __safeHttp;

const MAX_PUBLISHED = 200;
const num = (v, d) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : d; };
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

function parseServices(data) {
  if (!Array.isArray(data)) throw new Error('Réponse inattendue : ce panel ne renvoie pas la liste des services.');
  const out = [];
  for (const s of data.slice(0, 5000)) {
    const id = clean(s && (s.service != null ? s.service : s.id), 20), rate = num(s && s.rate, NaN);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || !isFinite(rate) || rate < 0) continue;
    out.push({ id, name: clean(s.name, 140) || ('Service ' + id), cat: clean(s.category, 60) || 'Autres', rate, min: Math.max(1, Math.floor(num(s.min, 1))), max: Math.max(1, Math.floor(num(s.max, 100000))) });
  }
  return out;
}
const sellPrice = (rate, markup) => Math.round(rate * (1 + Math.min(Math.max(num(markup, 0), 0), 1000) / 100) * 10000) / 10000;
const orderTotal = (per1000, qty) => Math.round(per1000 * qty / 1000 * 100) / 100;

function parseOrderResult(j) {
  if (j && j.error) throw new Error('Le fournisseur refuse : ' + clean(j.error, 160));
  const id = j && (j.order != null ? j.order : j.id);
  if (id == null || !/^[A-Za-z0-9_-]{1,40}$/.test(String(id))) throw new Error('Réponse du fournisseur inattendue.');
  return String(id);
}
function validateOrder(item, qty, link) {
  if (!item) throw new Error('Service indisponible.');
  qty = Math.floor(num(qty, 0));
  if (qty < item.min || qty > item.max) throw new Error('Quantité : entre ' + item.min + ' et ' + item.max + '.');
  link = String(link || '').trim();
  if (link.length < 3 || link.length > 300 || /[\s<>"]/.test(link)) throw new Error('Lien ou nom de compte invalide.');
  if (/^https?:\/\//i.test(link) && !/^https:\/\//i.test(link)) throw new Error('Le lien doit commencer par https://');
  return { qty, link };
}

function createSitePanel({ db, admin, push, secret, request }) {
  const doRequest = request || safeRequest;
  const connRef = (uid) => db.collection('site_api_conns').doc(uid);
  const siteRef = (uid) => db.collection('mini_sites').doc(uid);
  const getSecret = () => secret || box.serverSecret();

  async function conn(uid) {
    const s = await connRef(uid).get();
    if (!s.exists || !s.data().keyEnc) throw new Error('Connectez d’abord votre panel.');
    const d = s.data();
    return { url: d.url, key: box.open(d.keyEnc, getSecret()), costs: d.costs || {} , data: d };
  }
  async function call(c, params) {
    const body = new URLSearchParams(Object.assign({ key: c.key }, params)).toString();
    const r = await doRequest({ url: c.url, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }, body, timeoutMs: 10000, maxBytes: 4000000 });
    let j; try { j = JSON.parse(r.text); } catch (e) { throw new Error('Ce panel ne répond pas au format attendu (API v2). Vérifiez l’adresse.'); }
    if (r.status >= 400 && !(j && j.error)) throw new Error('Le panel a répondu avec une erreur (' + r.status + ').');
    return j;
  }

  async function get(uid) {
    const [c, s] = await Promise.all([connRef(uid).get(), siteRef(uid).get()]);
    const d = c.exists ? c.data() : null, panel = (s.exists && s.data().panel) || null;
    return { success: true, connected: !!(d && d.keyEnc), host: d ? d.host : '', keyMask: d ? d.keyMask : '', panel: panel || { on: false, markup: 30, title: '', items: [] } };
  }
  async function save(uid, b) {
    const s = await siteRef(uid).get(); if (!s.exists) throw new Error('Crée d’abord ton site.');
    const u = parseSafeUrl(b.url);
    const old = (await connRef(uid).get()); const od = old.exists ? old.data() : {};
    let keyEnc = od.keyEnc, keyMask = od.keyMask;
    const key = String(b.key || '').trim();
    if (key) { if (key.length < 8 || key.length > 200 || /\s/.test(key)) throw new Error('Clé API invalide.'); keyEnc = box.seal(key, getSecret()); keyMask = box.mask(key); }
    if (!keyEnc) throw new Error('Saisissez la clé API de votre panel.');
    const changed = od.url !== u.href;
    await connRef(uid).set({ ownerUid: uid, url: u.href, host: u.hostname, keyEnc, keyMask, costs: changed ? {} : (od.costs || {}), updatedAt: new Date().toISOString() });
    if (changed) await siteRef(uid).update({ 'panel.items': [], 'panel.on': false });
    return { success: true, host: u.hostname, keyMask };
  }
  async function test(uid) {
    const c = await conn(uid); const j = await call(c, { action: 'balance' });
    if (j && j.error) throw new Error('Le panel répond : ' + clean(j.error, 120));
    return { success: true, balance: clean(j.balance, 30), currency: clean(j.currency, 8) };
  }
  async function services(uid, b) {
    const c = await conn(uid); const list = parseServices(await call(c, { action: 'services' }));
    const markup = num(b && b.markup, 30);
    const q = clean(b && b.q, 60).toLowerCase();
    const filtered = (q ? list.filter((x) => (x.name + ' ' + x.cat).toLowerCase().includes(q)) : list).slice(0, 300);
    return { success: true, total: list.length, items: filtered.map((x) => ({ id: x.id, name: x.name, cat: x.cat, cost: x.rate, price: sellPrice(x.rate, markup), min: x.min, max: x.max })) };
  }
  // Publie le catalogue : le serveur re-lit les couts chez le fournisseur (le navigateur ne decide jamais d'un prix).
  async function publish(uid, b) {
    const c = await conn(uid); const list = parseServices(await call(c, { action: 'services' }));
    const byId = new Map(list.map((x) => [x.id, x]));
    const markup = Math.min(Math.max(num(b.markup, 30), 0), 1000);
    const ids = Array.isArray(b.ids) ? b.ids.map((x) => String(x)).slice(0, MAX_PUBLISHED) : [];
    const items = [], costs = {};
    for (const id of new Set(ids)) { const x = byId.get(id); if (!x) continue; items.push({ id: x.id, name: x.name, cat: x.cat, price: sellPrice(x.rate, markup), min: x.min, max: x.max }); costs[x.id] = x.rate; }
    if (b.on && !items.length) throw new Error('Choisissez au moins un service à publier.');
    await connRef(uid).update({ costs, updatedAt: new Date().toISOString() });
    const panel = { on: !!b.on, markup, title: clean(b.title, 80), items, updatedAt: new Date().toISOString() };
    await siteRef(uid).update({ panel });
    return { success: true, panel };
  }
  async function disconnect(uid) {
    await connRef(uid).delete();
    const s = await siteRef(uid).get(); if (s.exists) await siteRef(uid).update({ panel: { on: false, markup: 30, title: '', items: [] } });
    return { success: true };
  }
  async function ownLead(uid, leadId) {
    leadId = String(leadId || ''); if (!leadId || /[\/]/.test(leadId)) throw new Error('Demande invalide.');
    const ref = db.collection('site_leads').doc(leadId), d = await ref.get();
    if (!d.exists || d.data().ownerUid !== uid || d.data().type !== 'panelorder') throw new Error('Demande introuvable.');
    return { ref, lead: d.data() };
  }
  async function send(uid, b) {
    const { ref, lead } = await ownLead(uid, b.leadId);
    if (lead.provider && lead.provider.orderId) throw new Error('Déjà envoyée au fournisseur (commande ' + lead.provider.orderId + ').');
    if (lead.status === 'cancelled') throw new Error('Cette demande est annulée.');
    if (lead.provider && lead.provider.state === 'sending' && Date.now() - Date.parse(lead.provider.at || 0) < 60000) throw new Error('Envoi déjà en cours.');
    const c = await conn(uid);
    await ref.update({ provider: { state: 'sending', at: new Date().toISOString() } });
    try {
      const j = await call(c, { action: 'add', service: lead.serviceId, link: lead.link, quantity: String(lead.quantity) });
      const orderId = parseOrderResult(j);
      await ref.update({ provider: { state: 'sent', orderId, at: new Date().toISOString() }, status: 'confirmed', updatedAt: new Date().toISOString() });
      return { success: true, orderId };
    } catch (e) {
      await ref.update({ provider: { state: 'error', error: clean(e.message, 160), at: new Date().toISOString() } });
      throw e;
    }
  }
  async function status(uid, b) {
    const { ref, lead } = await ownLead(uid, b.leadId);
    if (!lead.provider || !lead.provider.orderId) throw new Error('Pas encore envoyée au fournisseur.');
    const j = await call(await conn(uid), { action: 'status', order: lead.provider.orderId });
    if (j && j.error) throw new Error('Le fournisseur répond : ' + clean(j.error, 120));
    const st = clean(j.status, 30), info = { state: 'sent', orderId: lead.provider.orderId, at: lead.provider.at, remains: clean(j.remains, 12), startCount: clean(j.start_count, 12), status: st, checkedAt: new Date().toISOString() };
    const upd = { provider: info }; if (/^completed$/i.test(st)) upd.status = 'done'; else if (/^(canceled|cancelled|refunded)$/i.test(st)) upd.status = 'cancelled';
    await ref.update(upd);
    return { success: true, provider: info };
  }

  // Public : le visiteur envoie une demande. Valide contre le catalogue publie ; ne contacte jamais le fournisseur.
  async function publicOrder(id, b) {
    const s = await siteRef(id).get(), d = s.exists ? s.data() : null;
    if (!d || d.status !== 'published' || !d.panel || !d.panel.on) throw Object.assign(new Error('Service non disponible.'), { status: 403 });
    const item = (d.panel.items || []).find((x) => x.id === String(b.serviceId));
    let v; try { v = validateOrder(item, b.quantity, b.link); } catch (e) { throw Object.assign(e, { status: 400 }); }
    const name = clean(b.name, 60), contact = clean(b.contact, 60);
    if (!name || contact.length < 5) throw Object.assign(new Error('Nom et contact (WhatsApp ou e-mail) requis.'), { status: 400 });
    const total = orderTotal(item.price, v.qty), nowIso = new Date().toISOString();
    await db.collection('site_leads').add({ ownerUid: id, kind: 'site', type: 'panelorder', status: 'new', createdAt: nowIso, serviceId: item.id, serviceName: item.name, quantity: v.qty, link: v.link, total, name, contact, provider: { state: 'none' } });
    const title = 'Nouvelle commande panel', body = name + ' · ' + item.name.slice(0, 40) + ' x' + v.qty;
    try { await db.collection('notifications').add({ uid: id, title, body, type: 'lead', url: '/?leads=site', read: false, createdAt: nowIso }); if (push) await push(id, title, body, '/?leads=site', { category: 'activity' }); } catch (e) { /* deja enregistree */ }
    return { success: true, total };
  }
  return { get, save, test, services, publish, disconnect, send, status, publicOrder };
}

module.exports = { createSitePanel, parseServices, sellPrice, orderTotal, validateOrder, parseOrderResult };
