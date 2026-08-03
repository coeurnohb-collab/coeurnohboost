// Fonction serverless Netlify — s'exécute côté serveur, jamais visible publiquement.
// La clé API reste secrète (stockée en variable d'environnement Netlify, pas ici dans le code).

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { service, link, quantity } = JSON.parse(event.body);

    if (!service || !link || !quantity) {
      return { statusCode: 400, body: JSON.stringify({ error: "Paramètres manquants (service, link, quantity requis)" }) };
    }

    const apiKey = process.env.MTP_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Clé API non configurée côté serveur (MTP_API_KEY manquante)" }) };
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
      return { statusCode: 400, body: JSON.stringify({ error: data.error }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, orderId: data.order })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
