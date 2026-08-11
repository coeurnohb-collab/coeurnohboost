/* =========================================================
   POST /api/place-smm-order
   Reçoit une commande payée depuis le site, la transmet à
   MoreThanPanel automatiquement, et renvoie l'ID de commande
   fournisseur pour suivi.

   Corps attendu (JSON) :
   { platform: "tiktok", type: "followers", link: "https://...", quantity: 200 }

   Nécessite la variable d'environnement Vercel : MTP_API_KEY
   Nécessite que api/mtp-service-map.js soit rempli pour ce service,
   sinon la commande est laissée en traitement manuel (aucune erreur).
   ========================================================= */

const SERVICE_MAP = require('./mtp-service-map');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const apiKey = process.env.MTP_API_KEY;
  const { platform, type, link, quantity } = req.body || {};

  if (!platform || !type || !link || !quantity) {
    res.status(400).json({ error: 'Paramètres manquants (platform, type, link, quantity requis).' });
    return;
  }

  if (!apiKey) {
    res.status(200).json({ automated: false, reason: "MTP_API_KEY non configurée — commande laissée en traitement manuel." });
    return;
  }

  const mtpServiceId = SERVICE_MAP[platform] && SERVICE_MAP[platform][type];
  if (!mtpServiceId) {
    res.status(200).json({ automated: false, reason: `Aucun ID MoreThanPanel défini pour ${platform}/${type} — commande laissée en traitement manuel.` });
    return;
  }

  try {
    const response = await fetch('https://morethanpanel.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        key: apiKey,
        action: 'add',
        service: mtpServiceId,
        link,
        quantity
      })
    });
    const data = await response.json();
    if (data.error) {
      res.status(200).json({ automated: false, reason: data.error });
      return;
    }
    res.status(200).json({ automated: true, mtpOrderId: data.order });
  } catch (e) {
    res.status(200).json({ automated: false, reason: e.message });
  }
};
