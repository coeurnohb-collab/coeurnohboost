// Fonction Vercel — équivalent de get-mtp-balance.js mais au format Vercel.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.MTP_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "MTP_API_KEY manquante" });
    }

    const params = new URLSearchParams({ key: apiKey, action: "balance" });
    const response = await fetch("https://morethanpanel.com/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    return res.status(200).json({ balance: data.balance, currency: data.currency || "USD" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
