// api/_lib/site-panel.js
// « Panel » d'un mini-site : le proprietaire connecte l'API (format SMM v2) de SON fournisseur, publie un catalogue
// avec sa marge, et ses visiteurs envoient des demandes. ISOLATION : tout est limite au site du proprietaire ;
// la cle du fournisseur est chiffree, jamais renvoyee au navigateur ; aucune commande n'est envoyee au fournisseur
// sans clic du proprietaire ; les appels sortants passent par safe-http (pas d'acces au reseau interne).
const { safeRequest, parseSafeUrl } = require('./safe-http');
const box = require('./secret-box');

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
