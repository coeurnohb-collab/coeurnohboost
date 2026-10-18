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
