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
