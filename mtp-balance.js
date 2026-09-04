// GET /api/mtp-balance
// Verifie la connexion a MoreThanPanel et renvoie le solde fournisseur.
// Necessite la variable d'environnement Vercel : MTP_API_KEY
//
// SECURISE : reserve a l'admin (avant, n'importe qui sur internet pouvait
// consulter le vrai solde du compte MoreThanPanel sans meme se connecter).

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";

module.exports = async function handler(req, res) {
  const idToken = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
  if (!idToken) {
    return res.status(401).json({ error: 'Connexion admin requise.' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.uid !== ADMIN_UID) {
      return res.status(403).json({ error: 'Accès réservé à l\'admin.' });
    }
  } catch (e) {
    return res.status(401).json({ error: 'Session invalide.' });
  }

  const apiKey = process.env.MTP_API_KEY;

  if (!apiKey) {
    res.status(503).json({ error: "MTP_API_KEY non configuree sur Vercel." });
    return;
  }

  try {
    const response = await fetch('https://morethanpanel.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: apiKey, action: 'balance' })
    });
    const data = await response.json();
    if (data.error) {
      res.status(502).json({ error: data.error });
      return;
    }
    res.status(200).json({ balance: data.balance, currency: data.currency || 'USD' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
