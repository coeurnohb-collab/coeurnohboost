// api/_lib/security.js
// Outils de securite PARTAGES par toutes les fonctions /api (verification du
// jeton Firebase, limitation de frequence, nettoyage des textes et des liens).
//
// Ce fichier est dans /_lib : Vercel l'ignore pour le compte des 12 fonctions
// serverless du plan gratuit -- ce n'est pas une fonction, juste du code
// partage (meme principe que wallet-ledger.js et maxicash.js).
//
// Rien ici ne change le fonctionnement normal de l'app : ce sont des garde-fous
// qui se declenchent uniquement en cas d'abus ou de donnees invalides.

const crypto = require('crypto');
const admin = require('firebase-admin');

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";

/* ---------------- Erreurs ---------------- */

// Erreur "technique" avec un code HTTP precis (401 non connecte, 429 trop de
// demandes...). Le message est affiche tel quel a la personne.
class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || {};
  }
}

// Erreur "normale" attendue (solde insuffisant, article epuise...). Le message
// est fait pour etre lu par la personne. Toute AUTRE erreur (bug, panne de
// base de donnees...) est cachee derriere un message generique pour ne jamais
// laisser fuiter de details internes.
class UserError extends Error {}

const GENERIC_ERROR = 'Erreur serveur. Réessaie dans un instant.';

// Repond proprement a n'importe quelle erreur attrapee dans un handler.
// Format compatible avec ce que le navigateur attend deja : { success:false, error }.
function sendError(res, err, tag) {
  if (err instanceof HttpError) {
    if (err.status === 429 && err.extra.retryAfterSec) {
      res.setHeader('Retry-After', String(err.extra.retryAfterSec));
    }
    return res.status(err.status).json({ success: false, error: err.message, ...err.extra });
  }
  if (err instanceof UserError) {
    return res.status(200).json({ success: false, error: err.message });
  }
  console.error(`[${tag || 'api'}] Erreur inattendue :`, err && err.message);
  return res.status(500).json({ success: false, error: GENERIC_ERROR });
}

/* ---------------- Firebase Admin ---------------- */

function initFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  }
  return admin;
}

/* ---------------- Lecture de la requete ---------------- */

function getBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') {
    try { const parsed = JSON.parse(b); return parsed && typeof parsed === 'object' ? parsed : {}; }
    catch (e) { return {}; }
  }
  return {};
}

function getClientIp(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.headers && req.headers['x-real-ip']) || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* ---------------- Verification d'identite ---------------- */

// Verifie un VRAI jeton Firebase (signature, expiration, compte existant).
// Ne fait JAMAIS confiance a un uid envoye par le navigateur.
//
// checkRevoked = true (par defaut) : refuse aussi les jetons "revoques" (apres
// "Se deconnecter de tous les appareils") et les comptes desactives. Sans ca,
// un jeton vole restait valable jusqu'a 1 heure meme apres la revocation.
async function verifyCaller(req, { checkRevoked = true, allowQueryToken = false } = {}) {
  initFirebaseAdmin();
  const body = getBody(req);
  let token = null;
  const authHeader = req.headers && req.headers['authorization'];
  if (authHeader && /^Bearer\s+/i.test(authHeader)) token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token && typeof body.idToken === 'string') token = body.idToken;
  if (!token && allowQueryToken && req.query && typeof req.query.idToken === 'string') token = req.query.idToken;

  if (!token) throw new HttpError(401, 'Connexion requise.');
  try {
    const decoded = await admin.auth().verifyIdToken(token, checkRevoked);
    return { uid: decoded.uid, decoded, email: decoded.email || null, isAdmin: decoded.uid === ADMIN_UID };
  } catch (e) {
    throw new HttpError(401, 'Session invalide, reconnecte-toi.');
  }
}

async function requireAdmin(req, opts) {
  const caller = await verifyCaller(req, opts);
  if (!caller.isAdmin) throw new HttpError(403, "Accès réservé à l'admin.");
  return caller;
}

/* ---------------- Limitation de frequence (rate limiting) ---------------- */
// Compteur partage stocke dans Firestore (collection "rate_limits", que seul le
// serveur peut lire/ecrire : les regles Firestore refusent tout le reste par
// defaut). Fenetre fixe : au maximum "limit" appels par "windowSec" secondes,
// pour un couple (scope, id) -- par exemple ('withdraw', uid).
// Un petit cache en memoire evite de lire Firestore quand la limite est deja
// atteinte sur cette instance. Si Firestore est indisponible, on laisse passer
// (l'operation echouerait de toute facon) plutot que de bloquer tout le monde.

const localHits = new Map();

function pruneLocal(now) {
  if (localHits.size < 2000) return;
  for (const [k, v] of localHits) if (now - v.start > v.windowMs) localHits.delete(k);
}

async function rateLimit({ scope, id, limit, windowSec }) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const key = `${scope}:${id}`;

  const local = localHits.get(key);
  if (local && now - local.start < windowMs && local.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((local.start + windowMs - now) / 1000)) };
  }

  initFirebaseAdmin();
  const db = admin.firestore();
  const ref = db.collection('rate_limits').doc(crypto.createHash('sha256').update(key).digest('hex').slice(0, 40));
  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : null;
      if (d && now - d.windowStart < windowMs) {
        if (d.count >= limit) {
          return { ok: false, count: d.count, windowStart: d.windowStart, retryAfterSec: Math.max(1, Math.ceil((d.windowStart + windowMs - now) / 1000)) };
        }
        tx.update(ref, { count: d.count + 1 });
        return { ok: true, count: d.count + 1, windowStart: d.windowStart };
      }
      tx.set(ref, { scope, count: 1, windowStart: now, expireAt: new Date(now + windowMs * 2) });
      return { ok: true, count: 1, windowStart: now };
    });
    pruneLocal(now);
    localHits.set(key, { start: result.windowStart, count: result.count, windowMs });
    return result;
  } catch (e) {
    console.error('[rateLimit] Firestore indisponible, requete laissee passer :', e.message);
    return { ok: true };
  }
}

// Version "qui jette" : a utiliser en tete de handler.
async function enforceRateLimit(opts) {
  const r = await rateLimit(opts);
  if (!r.ok) {
    throw new HttpError(429, 'Trop de demandes en peu de temps. Patiente un instant puis réessaie.', { retryAfterSec: r.retryAfterSec });
  }
}

/* ---------------- Nettoyage des donnees recues ---------------- */

// Renvoie une chaine propre (sans caracteres de controle, tronquee), ou ''
// si la valeur n'est pas du texte. Ne fait JAMAIS confiance au type recu.
function cleanText(value, max, { keepNewlines = false } = {}) {
  if (typeof value !== 'string') return '';
  let s = value.replace(keepNewlines ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, '');
  s = s.trim();
  return s.length > max ? s.slice(0, max) : s;
}

function isHttpsUrl(value, max = 600) {
  if (typeof value !== 'string' || value.length > max) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !!u.hostname;
  } catch (e) { return false; }
}

// Un lien de notification ne doit JAMAIS pouvoir mener vers un autre site
// (hameconnage) : on n'accepte qu'un chemin interne "/..." de l'app.
function safeInternalPath(value) {
  if (typeof value !== 'string') return '/';
  const v = value.trim();
  if (v.length === 0 || v.length > 300) return '/';
  if (v[0] !== '/' || v.startsWith('//') || v.includes('\\') || /[\u0000-\u001F\u007F]/.test(v)) return '/';
  return v;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Identifiant de document Firestore fourni par le navigateur : lettres,
// chiffres, "_" et "-" uniquement (jamais de "/" qui changerait de collection).
function isSafeDocId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = {
  ADMIN_UID, HttpError, UserError, GENERIC_ERROR, sendError,
  initFirebaseAdmin, getBody, getClientIp,
  verifyCaller, requireAdmin,
  rateLimit, enforceRateLimit,
  cleanText, isHttpsUrl, safeInternalPath, escapeHtml, isSafeDocId, roundMoney
};
