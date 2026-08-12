/// POST /api/place-smm-order
// Recoit une commande payee depuis le site et la transmet a MoreThanPanel.
// Corps attendu (JSON) : { platform, type, quality, link, quantity }
// quality vaut "standard", "premium" ou "vip"
// Necessite la variable d'environnement Vercel : MTP_API_KEY
// Necessite que api/mtp-service-map.js soit rempli pour cette combinaison.

const SERVICE_MAP = require('./mtp-service-map');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Methode non autorisee' });
    return;
  }

  const apiKey = process.env.MTP_API_KEY;
  const { platform, type, quality, link, quantity } = req.body || {};

  if (!platform || !type || !quality || !link || !quantity) {
    res.status(400).json({ error: 'Parametres manquants (platform, type, quality, link, quantity requis).' });
    return;
  }

  if (!apiKey) {
    res.status(200).json({ automated: false, reason: "MTP_API_KEY non configuree - commande laissee en traitement manuel." });
    return;
  }

  const platformMap = SERVICE_MAP[platform];
  const typeMap = platformMap && platformMap[type];
  const mtpServiceId = typeMap && typeMap[quality];

  if (!mtpServiceId) {
    res.status(200).json({ automated: false, reason: "Aucun ID MoreThanPanel defini pour " + platform + "/" + type + "/" + quality + " - commande laissee en traitement manuel." });
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
        link: link,
        quantity: quantity
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
Enter;
