// api/mbotepay-payment.js
// Initie un encaissement Mobile Money (PayIn) via MboтePay, pour les pays
// couverts par leur API. Si le pays/operateur n'est pas couvert, renvoie
// simplement { supported: false } et script.js retombe sur le flux manuel
// existant (rien ne casse pour les 19 autres pays du catalogue).

// Table de correspondance : code pays (COUNTRIES.code) + nom operateur exact
// (COUNTRIES.ops) -> codes MboтePay. Construite depuis docs.mbotepay.com
const MBOTEPAY_MAP = {
  CD: { country: 'COD', currency: 'CDF', currencies: ['CDF', 'USD'], operators: {
    'Vodacom M-Pesa': 'VODACOM_MPESA_COD',
    'Airtel Money': 'AIRTEL_COD',
    'Orange Money': 'ORANGE_COD'
  }},
  BJ: { country: 'BEN', currency: 'XOF', currencies: ['XOF'], operators: {
    'MTN Mobile Money': 'MTN_MOMO_BEN',
    'Moov Money': 'MOOV_BEN'
  }},
  CI: { country: 'CIV', currency: 'XOF', currencies: ['XOF'], operators: {
    'MTN Mobile Money': 'MTN_MOMO_CIV',
    'Orange Money': 'ORANGE_CIV'
  }},
  CM: { country: 'CMR', currency: 'XAF', currencies: ['XAF'], operators: {
    'MTN Mobile Money': 'MTN_MOMO_CMR'
  }},
  CG: { country: 'COG', currency: 'XAF', currencies: ['XAF'], operators: {
    'Airtel Money': 'AIRTEL_COG',
    'MTN Mobile Money': 'MTN_MOMO_COG'
  }},
  GA: { country: 'GAB', currency: 'XAF', currencies: ['XAF'], operators: {
    'Airtel Money': 'AIRTEL_GAB'
  }},
  SN: { country: 'SEN', currency: 'XOF', currencies: ['XOF'], operators: {
    'Orange Money': 'ORANGE_SEN',
    'Free Money': 'FREE_SEN'
  }},
  KE: { country: 'KEN', currency: 'KES', currencies: ['KES'], operators: {
    'M-Pesa (Safaricom)': 'MPESA_KEN'
  }},
  RW: { country: 'RWA', currency: 'RWF', currencies: ['RWF'], operators: {
    'Airtel Money': 'AIRTEL_RWA',
    'MTN Mobile Money': 'MTN_MOMO_RWA'
  }},
  UG: { country: 'UGA', currency: 'UGX', currencies: ['UGX'], operators: {
    'Airtel Money': 'AIRTEL_OAPI_UGA',
    'MTN Mobile Money': 'MTN_MOMO_UGA'
  }},
  ZM: { country: 'ZMB', currency: 'ZMW', currencies: ['ZMW'], operators: {
    'Airtel Money': 'AIRTEL_OAPI_ZMB',
    'MTN Mobile Money': 'MTN_MOMO_ZMB'
  }},
  SL: { country: 'SLE', currency: 'SLE', currencies: ['SLE'], operators: {
    'Orange Money': 'ORANGE_SLE'
  }}
};

// Taux de secours si l'API de change en direct est indisponible
// (mêmes valeurs indicatives que celles utilisées côté site public)
const FALLBACK_RATES = {
  CDF: 2800, XOF: 600, XAF: 600, KES: 129, RWF: 1300, UGX: 3700, ZMW: 27, SLE: 22.5
};

// Marge appliquée au taux de change reel avant de facturer le client.
// Ex : 5 => on facture 5% de plus que le taux du marche, ce qui devient
// la marge de change de Coeurnoh (en plus de la marge sur le cout MTP).
const MARGIN_PERCENT = 5;

async function getRate(currency) {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates && data.rates[currency]) {
      return data.rates[currency];
    }
  } catch (e) {
    console.log('[mbotepay-payment] Taux en direct indisponible, fallback utilise :', e.message);
  }
  return FALLBACK_RATES[currency] || 1;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { uid, amountUSD, countryCode, operatorName, phone, chargeCurrency } = req.body;

    if (!uid || !amountUSD || amountUSD <= 0 || !countryCode || !operatorName || !phone) {
      return res.status(400).json({ error: 'Parametres manquants' });
    }

    const mapping = MBOTEPAY_MAP[countryCode];
    if (!mapping || !mapping.operators[operatorName]) {
      // Pays ou operateur non couvert par MboтePay : le frontend retombera sur le flux manuel
      return res.status(200).json({ supported: false });
    }

    const apiKey = process.env.MBOTEPAY_API_KEY;
    if (!apiKey) {
      console.error('[mbotepay-payment] MBOTEPAY_API_KEY manquante');
      return res.status(200).json({ supported: false });
    }

    // Devise finale a facturer : celle choisie par le client si elle est
    // supportee pour ce pays (ex: USD en RDC), sinon la devise locale par defaut.
    const finalCurrency = (chargeCurrency && mapping.currencies.includes(chargeCurrency))
      ? chargeCurrency
      : mapping.currency;

    let chargeAmount;
    if (finalCurrency === 'USD') {
      // Paiement direct en USD : pas de conversion, montant exact, pas d'ecart de taux
      chargeAmount = Math.round(amountUSD * 100) / 100;
    } else {
      const rate = await getRate(finalCurrency);
      const adjustedRate = rate * (1 + MARGIN_PERCENT / 100);
      chargeAmount = Math.round(amountUSD * adjustedRate);
    }

    const reference = `topup_${uid}_${Date.now()}`;

    const mbotepayResponse = await fetch('https://app.mbotepay.com/api/v1/payin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': reference
      },
      body: JSON.stringify({
        amount: chargeAmount,
        currency: finalCurrency,
        country: mapping.country,
        operator: mapping.operators[operatorName],
        phone: phone.replace(/\D/g, ''), // que des chiffres, sans le +
        reference: reference,
        callback_url: 'https://coeurnohboost.vercel.app/api/mbotepay-webhook'
      })
    });

    const data = await mbotepayResponse.json();
    console.log('[mbotepay-payment] Reponse MboтePay =', JSON.stringify(data));

    if (!mbotepayResponse.ok || data.error) {
      return res.status(200).json({
        supported: true,
        success: false,
        error: (data.error && data.error.message) || 'Erreur MboтePay'
      });
    }

    return res.status(200).json({
      supported: true,
      success: true,
      reference: reference,
      localAmount: chargeAmount,
      currency: finalCurrency
    });

  } catch (error) {
    console.error('[mbotepay-payment] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
