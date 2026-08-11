//* =========================================================
   GET /api/mtp-balance
   Vérifie la connexion à MoreThanPanel et renvoie le solde
   fournisseur. Utilisé par l'espace admin (onglet Automatisation).

   Nécessite la variable d'environnement Vercel : MTP_API_KEY
   ========================================================= */

module.exports = async function handler(req, res) {
  const apiKey = process.env.MTP_API_KEY;

  if (!apiKey) {
    res.status(503).json({ error: "MTP_API_KEY non configurée sur Vercel." });
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
};Enter
