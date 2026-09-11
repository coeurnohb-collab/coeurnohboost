// api/get-service-map-defaults.js
//
// CORRECTION IMPORTANTE : ce fichier existait deja dans le projet, mais a
// la racine (get-service-map-defaults.js) au lieu du dossier api/. Or
// Vercel ne sert comme fonction serverless QUE les fichiers places dans
// api/ -- resultat, l'appel fait par admin.js vers '/api/get-service-map-defaults'
// (bouton "⬇️ Importer les valeurs actuelles" de l'onglet Service Map)
// renvoyait toujours une erreur 404 en production. Ce fichier est la
// version correctement placee, avec exactement la meme logique. Le
// fichier a la racine peut etre supprime du depot (voir la liste des
// emplacements fournie a part) -- il n'est jamais execute par Vercel.
//
// Renvoie simplement les correspondances par defaut deja definies dans
// mtp-service-map.js (une seule source de verite, reutilisee ici plutot
// que dupliquee), pour que l'admin puisse les importer en un clic dans
// la collection Firestore "service_map".
//
// SECURISE des le depart : identite verifiee par un vrai jeton Firebase,
// jamais par un simple "adminUid" envoye tel quel.
//
// mtp-service-map.js est importe depuis api/_lib/ (et non plus directement
// depuis api/) pour ne pas etre compte comme une fonction serverless a part
// entiere par Vercel -- voir le commentaire equivalent dans place-smm-order.js.

const admin = require('firebase-admin');
const SERVICE_MAP_DEFAULTS = require('./_lib/mtp-service-map.js');

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
