// Fonction Vercel — équivalent de place-smm-order.js mais au format Vercel.
// La clé API reste secrète (variable d'environnement Vercel, jamais dans ce fichier).

export default async function handler(req, res) {
  // Autorise ton site (Netlify) à appeler cette fonction (CORS)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { service, link, quantity } = req.body;

    if (!service || !link || !quantity) {
      return res.status(400).json({ error: "Paramètres manquants (service, link, quantity requis)" });
    }

    const apiKey = process.env.MTP_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Clé API non configurée côté serveur (MTP_API_KEY manquante)" });
    }

    const params = new URLSearchParams({
      key: apiKey,
      action: "add",
      service: service,
      link: link,
      quantity: quantity
    });

    const response = await fetch("https://morethanpanel.com/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    return res.status(200).json({ success: true, orderId: data.order });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
