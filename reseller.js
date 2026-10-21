// api/_lib/reseller.js
// API « revendeur » compatible avec le format standard des panels SMM (v2) :
//   POST https://coeurnohboost.vercel.app/api/v2
//   corps (JSON, formulaire ou texte brut) : key, action = services | balance | add | status | orders
//   la cle peut aussi venir de l'en-tete Authorization: Bearer cnb_... ou X-API-Key
//
// Securite :
//  - la cle (cnb_...) n'est jamais stockee : seule son empreinte SHA-256 l'est ;
//  - cle acceptee dans le corps ou les en-tetes d'une requete POST (jamais dans l'URL) ;
//  - doublon (meme service + meme lien en moins de 5 minutes) refuse ;
//  - liste d'IP autorisees (optionnelle), plafond de depense par jour, limitation de frequence ;
//  - les prix sont recalcules ICI (jamais pris du client), debit atomique du portefeuille,
//    remboursement automatique si le fournisseur refuse la commande ;
//  - interrupteur global et suspension par cle depuis l'admin.
// Ce fichier est dans /_lib : Vercel ne le compte pas comme une fonction.

const crypto = require('crypto');
const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./wallet-ledger');
const STATIC_FALLBACK = require('./mtp-service-map');
const { SERVICE_CATALOG, QUALITY_TIERS, PLATFORMS, applyPricingOverrides } = require('../../catalog-data.js');
const { enforceRateLimit, getClientIp, isHttpsUrl, cleanText } = require('./security');

const ADMIN_UID = '8BqWONj07hVZePHe2DrkHWYRjse2';
const MAX_ORDER_PRICE = 500;
const DEFAULTS = { enabled: true, discountPct: 15, dailyLimitDefault: 100 };

// Lit le corps quel que soit le format envoye : objet (JSON / formulaire), ou texte brut
// (JSON ou « a=1&b=2 »). Le developpeur n'a rien a adapter de son cote.
function readBody(req) {
  let b = req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') {
    const t = b.trim();
    if (t.startsWith('{')) { try { b = JSON.parse(t); } catch (e) { b = {}; } }
    else { b = Object.fromEntries(new URLSearchParams(t)); }
  }
  return (b && typeof b === 'object') ? b : {};
}
function readKey(req, body) {
  const h = req.headers || {};
  const auth = String(h.authorization || '');
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  const raw = m ? m[1] : (h['x-api-key'] || body.key || body.api_key || body.apikey || '');
  return String(raw).trim();
}

const hashKey = (k) => crypto.createHash('sha256').update(String(k)).digest('hex');
const today = () => new Date().toISOString().slice(0, 10);
const r2 = (n) => Math.round(n * 100) / 100;
const num = (n) => String(Number(Number(n).toFixed(4)));

async function loadSettings(db) {
  try {
    const s = await db.collection('settings').doc('reseller_api').get();
    const d = s.exists ? s.data() : {};
    return {
      enabled: d.enabled !== false,
      discountPct: Math.min(Math.max(Number(d.discountPct != null ? d.discountPct : DEFAULTS.discountPct) || 0, 0), 40),
      dailyLimitDefault: Math.min(Math.max(Number(d.dailyLimitDefault || DEFAULTS.dailyLimitDefault), 1), 10000)
    };
  } catch (e) { return Object.assign({}, DEFAULTS); }
}

async function loadCatalog(db, discountPct) {
  try {
    const snap = await db.collection('pricing').get();
    const o = {}; snap.forEach((d) => { if (Array.isArray(d.data().services)) o[d.id] = d.data().services; });
    applyPricingOverrides(o);
  } catch (e) { /* prix par defaut */ }
  const maps = {};
  try { const s = await db.collection('service_map').get(); s.forEach((d) => { maps[d.id] = d.data() || {}; }); } catch (e) { /* secours */ }
  const names = {}; PLATFORMS.forEach((p) => { names[p.id] = p.name; });
  const list = [];
  Object.keys(SERVICE_CATALOG).forEach((pid, pi) => {
    (SERVICE_CATALOG[pid] || []).forEach((svc, si) => {
      QUALITY_TIERS.forEach((tier, ti) => {
        let mtp = null;
        const tm = maps[pid] && maps[pid][svc.type];
        if (tm && Object.prototype.hasOwnProperty.call(tm, tier.id)) mtp = tm[tier.id] || null;
        else if (!maps[pid]) { const fb = STATIC_FALLBACK[pid] && STATIC_FALLBACK[pid][svc.type]; mtp = (fb && fb[tier.id]) || null; }
        if (!mtp || !svc.price || !svc.price[tier.id]) return;
        const rate = svc.price[tier.id] * (1 - discountPct / 100);
        list.push({
          id: 1000000 + pi * 10000 + si * 10 + ti, pid, type: svc.type, tier: tier.id, mtp,
          platformName: names[pid] || pid, label: svc.label,
          name: `${names[pid] || pid} — ${svc.label} (${tier.name})`,
          rate, min: svc.min, max: svc.max
        });
      });
    });
  });
  return list;
}

const STATUS_MAP = { pending: 'Pending', processing: 'In progress', completed: 'Completed', refunded: 'Canceled', pending_review: 'Pending' };

module.exports = async function handleReseller(req, res, ctx) {
  const { db, resolveMtpServiceId, refundOrderSafely, markOrderPendingReview, fetchWithTimeout, MTP_API_URL } = ctx;
  const send = (code, obj) => res.status(code).json(obj);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: 'Use POST.' }); }
  const body = readBody(req);
  const key = readKey(req, body);
  const action = String(body.action || '').toLowerCase();
  const ip = getClientIp(req);

  try {
    await enforceRateLimit({ scope: 'reseller-ip', id: ip, limit: 600, windowSec: 600 });
    if (!/^cnb_[a-f0-9]{48}$/.test(key)) {
      await enforceRateLimit({ scope: 'reseller-bad', id: ip, limit: 20, windowSec: 600 });
      return send(401, { error: 'Incorrect API key' });
    }
    const keyId = hashKey(key);
    const keyRef = db.collection('api_keys').doc(keyId);
    const keySnap = await keyRef.get();
    if (!keySnap.exists || keySnap.data().active === false) {
      await enforceRateLimit({ scope: 'reseller-bad', id: ip, limit: 20, windowSec: 600 });
      return send(401, { error: 'Incorrect API key' });
    }
    const kd = keySnap.data();
    const settings = await loadSettings(db);
    if (!settings.enabled) return send(503, { error: 'API temporarily disabled' });
    if (Array.isArray(kd.ips) && kd.ips.length && !kd.ips.includes(ip)) return send(403, { error: 'IP address not allowed' });
    const uid = kd.uid;
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists || userSnap.data().apiDisabled === true || userSnap.data().banned === true) return send(403, { error: 'Account suspended' });
    await enforceRateLimit({ scope: 'reseller-key', id: keyId.slice(0, 20), limit: 120, windowSec: 60 });
    keyRef.update({ lastUsedAt: new Date().toISOString(), lastIp: ip }).catch(() => {});

    if (action === 'balance') {
      return send(200, { balance: num(userSnap.data().balance || 0), currency: 'USD' });
    }

    if (action === 'services') {
      const list = await loadCatalog(db, settings.discountPct);
      return send(200, list.map((s) => ({
        service: String(s.id), name: s.name, type: 'Default', category: s.platformName,
        rate: num(s.rate), min: String(s.min), max: String(s.max), refill: false, cancel: false
      })));
    }

    if (action === 'add') {
      await enforceRateLimit({ scope: 'reseller-add', id: keyId.slice(0, 20), limit: 30, windowSec: 60 });
      const sid = parseInt(body.service, 10);
      const link = String(body.link || '').trim();
      const quantity = parseInt(body.quantity, 10);
      if (!sid || !link || !quantity) return send(400, { error: 'Missing parameters (service, link, quantity)' });
      if (!isHttpsUrl(link, 500)) return send(400, { error: 'Invalid link (https required)' });
      const list = await loadCatalog(db, settings.discountPct);
      const svc = list.find((s) => s.id === sid);
      if (!svc) return send(400, { error: 'Incorrect service ID' });
      if (quantity < svc.min || quantity > svc.max) return send(400, { error: `Quantity must be between ${svc.min} and ${svc.max}` });
      const price = Math.max(0.01, r2((quantity / 1000) * svc.rate));
      if (price > MAX_ORDER_PRICE) return send(400, { error: 'Order amount too high' });
      const apiKeyEnv = process.env.MTP_API_KEY;
      const mtpServiceId = await resolveMtpServiceId(svc.pid, svc.type, svc.tier);
      if (!apiKeyEnv || !mtpServiceId) return send(400, { error: 'Service unavailable' });
      const dailyLimit = Number(kd.dailyLimit || settings.dailyLimitDefault);

      // Refus des doublons : meme cle + meme service + meme lien en moins de 5 minutes.
      const dupRef = db.collection('rate_limits').doc('dup_' + hashKey(keyId + '|' + sid + '|' + link.toLowerCase()).slice(0, 40));
      const dupSnap = await dupRef.get();
      if (dupSnap.exists && Date.now() - Number((dupSnap.data() || {}).at || 0) < 5 * 60 * 1000) {
        return send(400, { error: 'Duplicate order: same service and link already ordered in the last 5 minutes' });
      }
      await dupRef.set({ at: Date.now(), expireAt: new Date(Date.now() + 3600 * 1000) });

      let orderRef, newBalance;
      try {
        await db.runTransaction(async (tx) => {
          const kS = await tx.get(keyRef);
          const uS = await tx.get(userRef);
          const adminRef = db.collection('users').doc(ADMIN_UID);
          const aS = uid !== ADMIN_UID ? await tx.get(adminRef) : null;
          if (!kS.exists || kS.data().active === false) throw new Error('KEY_OFF');
          const bal = (uS.data() || {}).balance || 0;
          if (bal < price) throw new Error('FUNDS');
          const sd = kS.data().spentDay || {};
          const spent = sd.date === today() ? Number(sd.amount || 0) : 0;
          if (spent + price > dailyLimit) throw new Error('LIMIT');
          newBalance = r2(bal - price);
          tx.update(userRef, { balance: newBalance });
          tx.update(keyRef, { spentDay: { date: today(), amount: r2(spent + price) }, ordersCount: admin.firestore.FieldValue.increment(1) });
          orderRef = db.collection('orders').doc();
          tx.set(orderRef, {
            uid, email: (uS.data() || {}).email || null, platform: svc.platformName, service: svc.label,
            quality: svc.tier, link, quantity, price, status: 'pending', mtpServiceId,
            source: 'api', apiKeyId: keyId.slice(0, 12), createdAt: new Date().toISOString()
          });
          tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
            uid, type: 'order_purchase', amount: -price, balanceAfter: newBalance,
            description: `Commande API ${svc.platformName} — ${svc.label}`, relatedId: orderRef.id
          }));
          if (uid !== ADMIN_UID && aS && aS.exists) {
            const ab = r2(((aS.data() || {}).balance || 0) + price);
            tx.update(adminRef, { balance: ab });
            tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
              uid: ADMIN_UID, type: 'order_income', amount: price, balanceAfter: ab,
              description: `Commande API ${svc.platformName} — ${svc.label}`, relatedId: orderRef.id
            }));
          }
        });
      } catch (e) {
        if (e.message === 'FUNDS') return send(402, { error: 'Not enough funds on balance' });
        if (e.message === 'LIMIT') return send(429, { error: 'Daily spending limit reached' });
        if (e.message === 'KEY_OFF') return send(401, { error: 'Incorrect API key' });
        console.error('[reseller] transaction:', e.message);
        return send(500, { error: 'Server error, retry' });
      }

      try {
        const resp = await fetchWithTimeout(MTP_API_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ key: apiKeyEnv, action: 'add', service: mtpServiceId, link, quantity: String(quantity) })
        });
        let data;
        try { data = await resp.json(); } catch (pe) {
          await markOrderPendingReview(orderRef, `Reponse fournisseur illisible (API revendeur, HTTP ${resp.status}). Verifier avant remboursement.`);
          return send(200, { order: orderRef.id });
        }
        if (data.error) {
          const rf = await refundOrderSafely(userRef, orderRef, price, data.error);
          return send(502, { error: 'Order rejected by provider' + (rf.ok ? ' (refunded)' : '') });
        }
        await orderRef.update({ status: 'processing', mtpOrderId: data.order });
        return send(200, { order: orderRef.id });
      } catch (e) {
        await markOrderPendingReview(orderRef, "Erreur reseau apres envoi (API revendeur) : " + e.message + '. Verifier avant remboursement.');
        return send(200, { order: orderRef.id });
      }
    }

    if (action === 'status' || action === 'orders') {
      const ids = (action === 'status' ? [body.order] : String(body.orders || '').split(','))
        .map((x) => String(x || '').trim()).filter((x) => /^[A-Za-z0-9]{10,40}$/.test(x)).slice(0, 100);
      if (!ids.length) return send(400, { error: 'Missing order' });
      const out = {};
      for (const id of ids) {
        const ref = db.collection('orders').doc(id);
        const snap = await ref.get();
        const d = snap.exists ? snap.data() : null;
        if (!d || d.uid !== uid || d.source !== 'api') { out[id] = { error: 'Incorrect order ID' }; continue; }
        let status = STATUS_MAP[d.status] || 'Pending', remains = '0';
        if (action === 'status' && d.status === 'processing' && d.mtpOrderId && process.env.MTP_API_KEY) {
          try {
            const r = await fetchWithTimeout(MTP_API_URL, {
              method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ key: process.env.MTP_API_KEY, action: 'status', order: String(d.mtpOrderId) })
            }, 6000);
            const j = await r.json();
            const st = String(j.status || '').toLowerCase();
            if (st === 'completed') { status = 'Completed'; await ref.update({ status: 'completed' }).catch(() => {}); }
            else if (st === 'canceled' || st === 'cancelled' || st === 'refunded') { await refundOrderSafely(userRef, ref, d.price, 'Canceled by provider'); status = 'Canceled'; }
            else if (st === 'partial') { status = 'Partial'; remains = String(j.remains || '0'); }
            else if (st === 'pending') status = 'Pending';
            if (j.remains != null && status === 'In progress') remains = String(j.remains);
          } catch (e) { /* on garde le dernier statut connu */ }
        }
        out[id] = { charge: num(d.price || 0), start_count: '0', status, remains, currency: 'USD' };
      }
      return send(200, action === 'status' ? out[ids[0]] : out);
    }

    return send(400, { error: 'Unknown action' });
  } catch (e) {
    if (e && e.status === 429) { res.setHeader('Retry-After', String((e.extra && e.extra.retryAfterSec) || 60)); return send(429, { error: 'Too many requests' }); }
    console.error('[reseller] erreur:', e && e.message);
    return send(500, { error: 'Server error' });
  }
};
module.exports.hashKey = hashKey;
module.exports.loadCatalog = loadCatalog;
module.exports.loadSettings = loadSettings;
