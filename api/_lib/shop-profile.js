// api/_lib/shop-profile.js
// « Ma boutique » : moyens de contact du vendeur (WhatsApp, appel, e-mail, Facebook, Instagram, TikTok, Telegram, site)
// et SES moyens de paiement : jusqu'à 3 liens de paiement (n'importe quelle passerelle : Mobile Money, PayPal, Stripe, Flutterwave…)
// et un QR de paiement (image) qu'il fait scanner à ses clients.
//
// Pourquoi côté serveur : un lien de paiement écrit par une personne peut servir à tromper les acheteurs (hameçonnage).
// Le serveur est donc seul à enregistrer : il identifie la personne (jeton Firebase), n'accepte que des liens https sûrs
// (pas d'adresse IP, pas de mot de passe dans le lien, pas de « javascript: »), limite le nombre d'écritures, et peut bloquer
// les liens de paiement d'un vendeur (champ payBlocked, posé par l'admin). Collection « shop_profiles/{uid} » : réservée au serveur
// (aucune règle Firestore ne l'ouvre aux téléphones), comme archived_accounts.
//
// IMPORTANT (règle de l'application) : un lien de paiement du vendeur n'est PAS un paiement fait dans l'application.
// Coeurnoh Universe ne le confirme pas, ne l'enregistre pas comme payé et ne crédite rien : l'acheteur paie le vendeur directement,
// hors application (l'écran le dit clairement). Aucun montant n'est calculé ni écrit ici.
'use strict';

const MAX_PAY = 3;
const MAX_UIDS = 40;
const UID_RE = /^[A-Za-z0-9_-]{6,128}$/;
const FIELDS = ['whatsapp', 'call', 'email', 'facebook', 'instagram', 'tiktok', 'telegram', 'website'];

function text(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function digits(v, min, max) {
  const d = String(v == null ? '' : v).replace(/[^\d]/g, '');
  return d.length >= min && d.length <= max ? d : '';
}

// Adresse https sûre : pas d'identifiants dans le lien, pas d'adresse IP, pas de « localhost », nom de domaine avec un point.
function safeHttps(value, max) {
  const raw = text(value, max || 500);
  if (!raw || /\s/.test(raw)) return '';
  let u;
  try { u = new URL(raw); } catch (e) { return ''; }
  if (u.protocol !== 'https:') return '';
  if (u.username || u.password) return '';
  const h = u.hostname.toLowerCase();
  if (!h || h.indexOf('.') < 1 || h.endsWith('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return '';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.indexOf(':') >= 0 || h.startsWith('[')) return '';
  if (!/^[a-z0-9.-]+$/.test(h)) return ''; // les noms avec accents arrivent déjà en « xn-- » : seul l'alphabet simple passe
  return u.toString().length > (max || 500) ? '' : u.toString();
}

function hostIs(url, hosts) {
  try { const h = new URL(url).hostname.toLowerCase(); return hosts.some((x) => h === x || h.endsWith('.' + x)); } catch (e) { return false; }
}

const NETS = {
  facebook: { hosts: ['facebook.com', 'fb.com', 'fb.me'], base: 'https://www.facebook.com/' },
  instagram: { hosts: ['instagram.com'], base: 'https://www.instagram.com/' },
  tiktok: { hosts: ['tiktok.com'], base: 'https://www.tiktok.com/@' },
  telegram: { hosts: ['t.me', 'telegram.me'], base: 'https://t.me/' }
};
// Accepte un lien du bon réseau OU un simple nom (« @mon_nom », « mon_nom »).
function social(kind, value) {
  const raw = text(value, 200);
  if (!raw) return '';
  const net = NETS[kind];
  if (/^https?:\/\//i.test(raw) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(raw)) {
    const u = safeHttps((/^https?:\/\//i.test(raw) ? raw : 'https://' + raw).replace(/^http:\/\//i, 'https://'), 300);
    return u && hostIs(u, net.hosts) ? u : '';
  }
  const h = raw.replace(/^@/, '');
  if (!/^[A-Za-z0-9._-]{2,64}$/.test(h)) return '';
  return net.base + h;
}

function email(v) {
  const s = text(v, 120);
  return /^[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}$/.test(s) ? s : '';
}

// QR de paiement : une image envoyée depuis le téléphone (hébergée chez Cloudinary, comme les photos de la Boutique).
function qrImage(v) {
  const u = safeHttps(v, 500);
  if (!u) return '';
  try {
    const x = new URL(u);
    if (x.hostname.toLowerCase() !== 'res.cloudinary.com') return '';
    if (!/\/image\/upload\//.test(x.pathname)) return '';
  } catch (e) { return ''; }
  return u;
}

// Nettoie ce que la personne envoie. Tout ce qui est invalide est simplement retiré (jamais d'erreur bloquante pour un champ facultatif),
// sauf un lien de paiement mal écrit : la personne est prévenue pour corriger.
function clean(input) {
  const b = input && typeof input === 'object' ? input : {};
  const out = {
    whatsapp: digits(b.whatsapp, 8, 15),
    call: digits(b.call, 6, 15),
    email: email(b.email),
    facebook: social('facebook', b.facebook),
    instagram: social('instagram', b.instagram),
    tiktok: social('tiktok', b.tiktok),
    telegram: social('telegram', b.telegram),
    website: safeHttps(b.website, 300),
    pay: [],
    payQr: qrImage(b.payQr),
    payNote: text(b.payNote, 160)
  };
  const rows = Array.isArray(b.pay) ? b.pay.slice(0, MAX_PAY) : [];
  const bad = [];
  rows.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const label = text(r.label, 30), rawUrl = text(r.url, 500);
    if (!label && !rawUrl) return;
    const url = safeHttps(rawUrl, 500);
    if (!url || !label) { bad.push(i + 1); return; }
    out.pay.push({ label, url });
  });
  return { value: out, badPay: bad };
}

function publicView(d) {
  if (!d) return null;
  const o = {};
  FIELDS.forEach((k) => { if (d[k]) o[k] = d[k]; });
  if (d.payBlocked !== true) {
    if (Array.isArray(d.pay) && d.pay.length) o.pay = d.pay.slice(0, MAX_PAY).map((p) => ({ label: p.label, url: p.url }));
    if (d.payQr) o.payQr = d.payQr;
    if (d.payNote && (o.pay || o.payQr)) o.payNote = d.payNote;
  } else {
    o.payBlocked = true;
  }
  return Object.keys(o).length ? o : null;
}

function createShopProfile({ db, admin, ADMIN_UID }) {
  const col = () => db.collection('shop_profiles');

  // Enregistre MA boutique (la personne connectée uniquement : jamais d'identifiant venu du téléphone).
  async function save(uid, body) {
    if (!uid) throw new Error('Connecte-toi pour continuer.');
    const { value, badPay } = clean(body);
    if (badPay.length) throw new Error('Lien de paiement ' + badPay.join(', ') + ' : écris un nom (ex. « Orange Money ») et un lien qui commence par https://');
    const ref = col().doc(uid);
    const snap = await ref.get();
    const prev = snap.exists ? snap.data() : {};
    const doc = Object.assign({}, value, { updatedAt: new Date().toISOString() });
    const blocked = prev.payBlocked === true;
    if (blocked) { doc.payBlocked = true; doc.pay = []; doc.payQr = ''; doc.payNote = ''; } // bloqué par l'admin : rien de nouveau côté paiement
    const empty = !blocked && !FIELDS.some((k) => doc[k]) && !doc.pay.length && !doc.payQr;
    if (empty) { if (snap.exists) await ref.delete(); } else await ref.set(doc);
    return { success: true, profile: empty ? {} : (publicView(doc) || {}), blocked };
  }

  // Lit les boutiques de plusieurs vendeurs d'un coup (une seule requête groupée). Uniquement les champs publics.
  async function get(uid, body) {
    if (!uid) throw new Error('Connecte-toi pour continuer.');
    const raw = Array.isArray(body && body.uids) ? body.uids : [];
    const uids = Array.from(new Set(raw.filter((x) => typeof x === 'string' && UID_RE.test(x)))).slice(0, MAX_UIDS);
    const out = {};
    if (uids.length) {
      const snaps = await db.getAll.apply(db, uids.map((u) => col().doc(u)));
      snaps.forEach((s) => { if (s.exists) { const v = publicView(s.data()); if (v) out[s.id] = v; } });
    }
    return { success: true, profiles: out };
  }

  // Admin : bloquer / débloquer les liens de paiement d'un vendeur (signalement d'un lien suspect).
  async function adminBlock(uid, body) {
    if (uid !== ADMIN_UID) throw new Error('Action réservée à l\'administrateur.');
    const target = text(body && body.uid, 128);
    if (!UID_RE.test(target)) throw new Error('Identifiant invalide.');
    const blocked = !!(body && body.blocked);
    const ref = col().doc(target);
    if (blocked) await ref.set({ payBlocked: true, pay: [], payQr: '', payNote: '', updatedAt: new Date().toISOString() }, { merge: true });
    else await ref.set({ payBlocked: admin.firestore.FieldValue.delete(), updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true, uid: target, blocked };
  }

  return { save, get, adminBlock };
}

module.exports = { createShopProfile, clean, publicView, safeHttps, social, qrImage, digits, email, MAX_PAY, MAX_UIDS };
