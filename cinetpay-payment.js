// api/cinetpay-payment.js
// Initie un encaissement (Mobile Money OU Carte Bancaire) via CinetPay,
// pour les pays couverts par leur API et non deja geres par MboтePay :
// Mali, Burkina Faso, Togo, Guinee, Niger. Si le pays n'est pas couvert,
// renvoie simplement { supported: false } et script.js retombe sur le
// flux existant (rien ne casse pour les autres pays du catalogue).

// Table de correspondance : code pays (COUNTRIES.code) -> devise CinetPay.
// CinetPay n'accepte que XOF, XAF, GNF, CDF (pas USD directement).
const CINETPAY_MAP = {
  ML: { currency: 'XOF' }, // Mali
  BF: { currency: 'XOF' }, // Burkina Faso
  TG: { currency: 'XOF' }, // Togo
  GN: { currency: 'GNF' }, // Guinee
  NE: { currency: 'XOF' }  // Niger
};

// Taux de secours si l'API de change en direct est indisponible
// (mêmes valeurs indicatives que celles utilisees cote mbotepay-payment.js)
const FALLBACK_RATES = {
  XOF: 600, GNF: 8600
};

// Marge appliquee au taux de change reel avant de facturer le client,
// identique a celle utilisee pour MboтePay (mbotepay-payment.js).
const MARGIN_PERCENT = 5;

async function getRate(currency) {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates && data.rates[currency]) {
      return data.rates[currency];
    }
  } catch (e) {
    console.log('[cinetpay-payment] Taux en direct indisponible, fallback utilise :', e.message);
  }
  return FALLBACK_RATES[currency] || 1;
}

// Etape 1 : obtenir un jeton d'acces aupres de CinetPay (valable 24h).
// On en redemande un nouveau a chaque paiement : plus simple et plus sur
// que de le mettre en cache entre deux appels serverless independants.
async function getAccessToken() {
  const apiKey = process.env.CINETPAY_API_KEY;
  const apiPassword = process.env.CINETPAY_API_PASSWORD;

  if (!apiKey || !apiPassword) {
    console.error('[cinetpay-payment] CINETPAY_API_KEY ou CINETPAY_API_PASSWORD manquante');
    return null;
  }

  const tokenResponse = await fetch('https://api.cinetpay.com/v1/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      api_password: apiPassword
    })
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('[cinetpay-payment] Echec obtention jeton :', JSON.stringify(tokenData));
    return null;
  }

  return tokenData.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { uid, amountUSD, countryCode, clientEmail, clientFirstName, clientLastName, clientPhone } = req.body;

    if (!uid || !amountUSD || amountUSD <= 0 || !countryCode) {
      return res.status(400).json({ error: 'Parametres manquants' });
    }

    const mapping = CINETPAY_MAP[countryCode];
    if (!mapping) {
      // Pays non couvert par CinetPay : le frontend retombera sur le flux existant
      return res.status(200).json({ supported: false, reason: `Pays non couvert par CinetPay (code recu: ${countryCode})` });
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      // Jeton indisponible (cle/mot de passe manquants ou API en panne) :
      // on ne casse rien, le frontend retombe sur le flux existant
      const hasKey = !!process.env.CINETPAY_API_KEY;
      const hasPassword = !!process.env.CINETPAY_API_PASSWORD;
      return res.status(200).json({
        supported: false,
        reason: `Echec obtention jeton CinetPay (cle presente: ${hasKey}, mot de passe present: ${hasPassword})`
      });
    }

    const finalCurrency = mapping.currency;
    const rate = await getRate(finalCurrency);
    const adjustedRate = rate * (1 + MARGIN_PERCENT / 100);
    // CinetPay exige un montant multiple de 5
    let chargeAmount = Math.round(amountUSD * adjustedRate);
    chargeAmount = Math.ceil(chargeAmount / 5) * 5;

    const reference = `topup_${uid}_${Date.now()}`;

    const paymentResponse = await fetch('https://api.cinetpay.com/v1/payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currency: finalCurrency,
        merchant_transaction_id: reference,
        amount: chargeAmount,
        lang: 'fr',
        designation: 'Recharge CoeurnohBoost',
        client_email: clientEmail || 'client@coeurnohboost.com',
        client_first_name: clientFirstName || 'Client',
        client_last_name: clientLastName || 'CoeurnohBoost',
        client_phone_number: clientPhone || '',
        success_url: 'https://coeurnohboost.vercel.app/?payment=success',
        failed_url: 'https://coeurnohboost.vercel.app/?payment=failed',
        notify_url: 'https://coeurnohboost.vercel.app/api/cinetpay-webhook'
      })
    });

    const data = await paymentResponse.json();
    console.log('[cinetpay-payment] Reponse CinetPay =', JSON.stringify(data));

    if (!paymentResponse.ok || data.code !== 200 || !data.payment_url) {
      return res.status(200).json({
        supported: true,
        success: false,
        error: data.message || 'Erreur CinetPay',
        reason: JSON.stringify(data)
      });
    }

    return res.status(200).json({
      supported: true,
      success: true,
      reference: reference,
      localAmount: chargeAmount,
      currency: finalCurrency,
      paymentUrl: data.payment_url
    });

  } catch (error) {
    console.error('[cinetpay-payment] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
