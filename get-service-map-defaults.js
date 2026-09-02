// api/get-service-map-defaults.js
// Reservee a l'admin. Renvoie le contenu du fichier mtp-service-map.js
// (le fichier de secours embarque dans le code) sous forme JSON, pour que
// l'espace admin puisse "importer" ces valeurs de depart dans Firestore et
// les rendre modifiables sans jamais toucher au code.
//
// GET /api/get-service-map-defaults?adminUid=...

const SERVICE_MAP = require('./mtp-service-map');

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  const { adminUid } = req.query || {};
  if (adminUid !== ADMIN_UID) {
    return res.status(403).json({ error: 'Non autorise' });
  }

  return res.status(200).json(SERVICE_MAP);
};
