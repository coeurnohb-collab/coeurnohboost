// POST /api/place-smm-order
// Recoit une commande payee depuis le site et la transmet a MoreThanPanel.
// Corps attendu (JSON) : { platform, type, quality, link, quantity }
// quality vaut "standard", "premium" ou "vip"
// Necessite la variable d'environnement Vercel : MTP_API_KEY
// Necessite que api/mtp-service-map.js soit rempli pour cette combinaison.

const SERVICE_MAP = require('./mtp-service-map');

module.exports = async function handler(req, res) {
  console.log('[place-smm-order] Requete recue, methode =', req.method);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Methode non autorisee' });
    return;
  }

  const apiKey = process.env.MTP_API_KEY;
  const { platform, type, quality, link, quantity } = req.body || {};
  console.log('[place-smm-order] Body recu =', JSON.stringify(req.body));
  console.log('[place-smm-order] apiKey presente =', !!apiKey, '| longueur =', apiKey ? apiKey.length : 0);

  if (!platform || !type || !quality || !link || !quantity) {
    console.log('[place-smm-order] STOP : parametre(s) manquant(s)', { platform, type, quality, link, quantity });
    res.status(400).json({ error: 'Parametres manquants (platform, type, quality, link, quantity requis).' });
    return;
  }

  if (!apiKey) {
    console.log('[place-smm-order] STOP : MTP_API_KEY absente de process.env');
    res.status(200).json({ automated: false, reason: "MTP_API_KEY non configuree - commande laissee en traitement manuel." });
    return;
  }

  const platformMap = SERVICE_MAP[platform];
  const typeMap = platformMap && platformMap[type];
  const mtpServiceId = typeMap && typeMap[quality];
  console.log('[place-smm-order] Recherche mapping :', platform, '>', type, '>', quality, '=', mtpServiceId);

  if (!mtpServiceId) {
    console.log('[place-smm-order] STOP : aucun ID trouve dans SERVICE_MAP pour cette combinaison');
    res.status(200).json({ automated: false, reason: "Aucun ID MoreThanPanel defini pour " + platform + "/" + type + "/" + quality + " - commande laissee en traitement manuel." });
    return;
  }

  try {
    console.log('[place-smm-order] Envoi vers MoreThanPanel, service =', mtpServiceId);
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
    console.log('[place-smm-order] Reponse MoreThanPanel =', JSON.stringify(data));
    if (data.error) {
      res.status(200).json({ automated: false, reason: data.error });
      return;
    }

    // On recupere le cout reel (charge) facture par MTP pour cette commande,
    // afin de pouvoir calculer le benefice reel plus tard dans l'admin.
    let mtpCost = null;
    let mtpCurrency = null;
    try {
      const statusResponse = await fetch('https://morethanpanel.com/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          key: apiKey,
          action: 'status',
          order: data.order
        })
      });
      const statusData = await statusResponse.json();
      console.log('[place-smm-order] Statut MTP juste apres creation =', JSON.stringify(statusData));
      if (statusData && statusData.charge) {
        mtpCost = parseFloat(statusData.charge);
        mtpCurrency = statusData.currency || 'USD';
      }
    } catch (statusErr) {
      console.log('[place-smm-order] Impossible de recuperer le cout immediatement :', statusErr.message);
      // On ne bloque pas la commande pour autant, le cout restera juste "inconnu" pour l'instant
    }

    res.status(200).json({ automated: true, mtpOrderId: data.order, mtpCost, mtpCurrency });
  } catch (e) {
    console.log('[place-smm-order] ERREUR pendant l appel MoreThanPanel :', e.message);
    res.status(200).json({ automated: false, reason: e.message });
  }
};
