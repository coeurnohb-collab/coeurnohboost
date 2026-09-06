// api/get-service-map-defaults.js
// Fichier manquant jusqu'ici : admin.js (bouton "Importer les valeurs par
// defaut" de l'onglet Service Map) appelait cet endpoint, qui n'existait
// pas du tout -> le bouton renvoyait toujours une erreur.
//
// Renvoie simplement les correspondances par defaut deja definies dans
// mtp-service-map.js (une seule source de verite, reutilisee ici plutot
// que dupliquee), pour que l'admin puisse les importer en un clic dans
// la collection Firestore "service_map".
//
// SECURISE des le depart (contrairement aux autres fichiers corriges
// precedemment) : identite verifiee par un vrai jeton Firebase, jamais
// par un simple "adminUid" envoye tel quel.

const admin = require('firebase-admin');
const SERVICE_MAP_DEFAULTS = require('./mtp-service-map.js');

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const idToken = req.headers['authorization']
      ? req.headers['authorization'].replace('Bearer ', '')
      : req.query.idToken;

    if (!idToken) {
      return res.status(401).json({ error: 'Connexion requise.' });
    }
    let uid;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
    }

    if (uid !== ADMIN_UID) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    return res.status(200).json(SERVICE_MAP_DEFAULTS);
  } catch (error) {
    console.error('[get-service-map-defaults] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
