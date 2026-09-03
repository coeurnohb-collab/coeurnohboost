// api/revoke-sessions.js
// Deconnecte un compte de TOUS ses appareils en une seule fois, en
// invalidant cote serveur tous les jetons de connexion existants
// (necessaire cote serveur via firebase-admin : impossible a faire
// depuis le navigateur).
// Verifie le jeton d'identite envoye par le client pour s'assurer que
// la demande vient bien du proprietaire du compte (et pas d'un tiers
// qui connaitrait juste son uid).

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'idToken requis' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    await admin.auth().revokeRefreshTokens(decoded.uid);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[revoke-sessions] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};
