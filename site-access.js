// api/_lib/site-access.js
// Accès et connexions d'un site « Crée ton site » :
//  - gestionnaires : le client d'un site créé pour quelqu'un d'autre rejoint le site par un lien d'invitation à usage unique ;
//  - connexions : lien de notification signé (webhook) et clé d'API pour brancher n'importe quel autre système.
// Module partagé (pas une fonction Vercel). Aucune lecture en base ici : tout reçoit les données en paramètre.

const crypto = require('crypto');
const { safeRequest, parseSafeUrl } = require('./safe-http');

const MAX_MANAGERS = 5;
const MAX_INVITES = 10;
const INVITE_DAYS = 14;
const WEBHOOK_EVENTS = ['order.created', 'order.paid', 'message.created', 'appointment.created', 'newsletter.subscribed', 'ping'];

const err = (status, message) => Object.assign(new Error(message), { status });
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function clean(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }

// ---------------- Gestionnaires et invitations ----------------
function managersOf(site) {
  return (Array.isArray(site && site.managers) ? site.managers : []).filter((x) => typeof x === 'string' && x);
}
function isManager(site, uid) { return !!uid && managersOf(site).indexOf(uid) >= 0; }
// Qui reçoit les demandes et les notifications : le propriétaire du compte + les gestionnaires.
function recipients(ownerUid, site) {
  const out = [ownerUid];
  managersOf(site).forEach((u) => { if (out.indexOf(u) < 0) out.push(u); });
  return out;
}
function liveInvites(site, nowMs) {
  const t = nowMs == null ? Date.now() : nowMs;
  return (Array.isArray(site && site.invites) ? site.invites : []).filter((i) => i && i.h && Date.parse(i.exp) > t);
}
function createInvite(site, nowMs) {
  const t = nowMs == null ? Date.now() : nowMs;
  const list = liveInvites(site, t);
  if (list.length >= MAX_INVITES) throw err(400, 'Trop d’invitations en attente. Supprimez-en une avant d’en créer une autre.');
  if (managersOf(site).length >= MAX_MANAGERS) throw err(400, 'Nombre maximum de gestionnaires atteint (' + MAX_MANAGERS + ').');
  const token = b64url(crypto.randomBytes(24));
  const h = sha256(token);
  const inv = { id: h.slice(0, 8), h, at: new Date(t).toISOString(), exp: new Date(t + INVITE_DAYS * 86400000).toISOString() };
  return { token, invite: inv, invites: list.concat([inv]) };
}
function revokeInvite(site, id) {
  return liveInvites(site).filter((i) => i.id !== String(id));
}
// Utilise l'invitation (à usage unique) : renvoie les champs à enregistrer sur le site.
function acceptInvite(site, ownerUid, token, uid, name, nowMs) {
  const t = nowMs == null ? Date.now() : nowMs;
  if (!uid) throw err(401, 'Connexion requise.');
  if (uid === ownerUid) throw err(400, 'Ce site est déjà dans votre compte.');
  const h = sha256(String(token || ''));
  const list = liveInvites(site, t);
  const hit = list.filter((i) => safeEq(i.h, h))[0];
  if (!hit) throw err(403, 'Invitation invalide ou expirée. Demandez-en une nouvelle.');
  const rest = list.filter((i) => i !== hit);
  const ms = managersOf(site);
  if (ms.indexOf(uid) >= 0) return { managers: ms, managerList: managerList(site), invites: rest, already: true };
  if (ms.length >= MAX_MANAGERS) throw err(400, 'Nombre maximum de gestionnaires atteint.');
  const info = managerList(site).concat([{ uid, name: clean(name, 60) || 'Gestionnaire', at: new Date(t).toISOString() }]);
  return { managers: ms.concat([uid]), managerList: info, invites: rest, already: false };
}
function managerList(site) {
  const ms = managersOf(site);
  return (Array.isArray(site && site.managerList) ? site.managerList : []).filter((m) => m && ms.indexOf(m.uid) >= 0)
    .map((m) => ({ uid: m.uid, name: clean(m.name, 60) || 'Gestionnaire', at: m.at || '' }));
}
function removeManager(site, uid) {
  const ms = managersOf(site).filter((u) => u !== uid);
  return { managers: ms, managerList: managerList(site).filter((m) => m.uid !== uid) };
}
// « Ce site est pour quelqu'un d'autre » : nom du client (facultatif).
function normalizeClient(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return { name: clean(raw.name, 60), at: String(raw.at || '') || new Date().toISOString() };
}

// ---------------- Secrets (chiffrés avant stockage, jamais renvoyés au navigateur) ----------------
function keyFrom(secret) {
  if (!secret || String(secret).length < 20) throw err(503, 'Chiffrement indisponible sur le serveur.');
  return crypto.createHash('sha256').update('cn-site-api|' + secret).digest();
}
function seal(plain, secret) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return 'v1.' + [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join('.');
}
function unseal(sealed, secret) {
  const p = String(sealed || '').split('.');
  if (p[0] !== 'v1' || p.length !== 4) throw err(500, 'Secret illisible.');
  const d = crypto.createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(p[1], 'base64'));
  d.setAuthTag(Buffer.from(p[2], 'base64'));
  return Buffer.concat([d.update(Buffer.from(p[3], 'base64')), d.final()]).toString('utf8');
}
const serverSecret = () => process.env.FIREBASE_PRIVATE_KEY || '';

// ---------------- Lien de notification (webhook) ----------------
function normalizeWebhookUrl(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  let u;
  try { u = parseSafeUrl(s); } catch (e) { throw err(400, e.message); }
  return u.toString();
}
function newWebhookSecret() { return 'whsec_' + crypto.randomBytes(24).toString('hex'); }
// Signature : HMAC-SHA256 de « horodatage.corps ». Le destinataire recalcule la même chose avec son secret.
function signBody(secret, ts, body) {
  return 'sha256=' + crypto.createHmac('sha256', String(secret)).update(String(ts) + '.' + String(body)).digest('hex');
}
function webhookEnvelope(event, site, data, nowMs) {
  const t = nowMs == null ? Date.now() : nowMs;
  return { id: 'evt_' + crypto.randomBytes(9).toString('hex'), event, createdAt: new Date(t).toISOString(), site: { id: site.id, slug: site.slug || '', name: site.name || '' }, data: data || {} };
}
// Envoie l'événement ; ne lève jamais d'erreur (le visiteur ne doit pas être gêné par le système du vendeur).
async function sendWebhook(cfg, envelope, opts) {
  const o = opts || {};
  try {
    if (!cfg || !cfg.url || !cfg.secret) return { ok: false, error: 'Non configuré.' };
    const body = JSON.stringify(envelope);
    const ts = String(Math.floor((o.nowMs || Date.now()) / 1000));
    const send = o.request || safeRequest;
    const r = await send({
      url: cfg.url, method: 'POST', timeoutMs: o.timeoutMs || 4000, maxBytes: 20000,
      headers: { 'Content-Type': 'application/json', 'X-Coeurnoh-Event': envelope.event, 'X-Coeurnoh-Delivery': envelope.id, 'X-Coeurnoh-Timestamp': ts, 'X-Coeurnoh-Signature': signBody(cfg.secret, ts, body) },
      body
    });
    return { ok: r.status >= 200 && r.status < 300, status: r.status };
  } catch (e) {
    return { ok: false, error: clean(e && e.message, 120) || 'Échec.' };
  }
}

// ---------------- Clé d'API ----------------
// Forme : cnk_<identifiant du site>.<secret>. Seul le condensé du secret est gardé ; la clé complète n'est montrée qu'une fois.
function newApiKey(siteId) {
  const secret = crypto.randomBytes(24).toString('hex');
  return { key: 'cnk_' + siteId + '.' + secret, hash: sha256(secret), last4: secret.slice(-4) };
}
function parseApiKey(headerVal) {
  const m = /^(?:Bearer\s+)?cnk_([A-Za-z0-9]{6,128})\.([a-f0-9]{48})$/.exec(String(headerVal || '').trim());
  return m ? { siteId: m[1], secret: m[2] } : null;
}
function apiKeyMatches(storedHash, secret) {
  return !!storedHash && !!secret && safeEq(storedHash, sha256(secret));
}

// Ce qu'un système externe a le droit de voir d'une demande (jamais d'identifiant interne du compte).
function publicLead(l) {
  const o = { id: l.id, type: l.type, status: l.status || 'new', createdAt: l.createdAt || '' };
  if (l.type === 'order') {
    Object.assign(o, { ref: l.ref || '', name: l.name || '', phone: l.phone || '', address: l.address || '', note: l.note || '', items: (l.items || []).map((i) => ({ name: i.n, qty: i.q, unitPrice: i.a, currency: i.c })), count: l.count || 0, total: l.total || '', amount: l.amount || 0, currency: l.iso || '', payment: l.payLabel || '', paymentRef: l.payRef || '', paid: !!l.paid, paidAt: l.paidAt || null });
  } else if (l.type === 'message') {
    Object.assign(o, { name: l.name || '', contact: l.contact || '', message: l.message || '' });
  } else if (l.type === 'appointment') {
    Object.assign(o, { name: l.name || '', phone: l.phone || '', service: l.service || '', date: l.date || '', time: l.time || '', message: l.message || '' });
  } else if (l.type === 'newsletter') {
    o.email = l.email || '';
  }
  return o;
}

// ---------------- Identité visuelle ----------------
function hexColor(v) { const s = String(v || '').trim(); return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : ''; }

module.exports = {
  MAX_MANAGERS, MAX_INVITES, INVITE_DAYS, WEBHOOK_EVENTS,
  sha256, safeEq, managersOf, isManager, recipients, liveInvites, createInvite, revokeInvite, acceptInvite, managerList, removeManager, normalizeClient,
  seal, unseal, serverSecret,
  normalizeWebhookUrl, newWebhookSecret, signBody, webhookEnvelope, sendWebhook,
  newApiKey, parseApiKey, apiKeyMatches, publicLead, hexColor
};
