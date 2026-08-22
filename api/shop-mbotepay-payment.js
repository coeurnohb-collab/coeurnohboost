// api/shop-mbotepay-payment.js
// Initie un paiement Mobile Money (PayIn) via MboтePay pour UN ARTICLE de la
// boutique (livre ou produit) — paiement direct, separe du portefeuille.
// Copie volontairement la logique de api/mbotepay-payment.js (memes pays/
// operateurs/taux) pour ne rien modifier au fichier existant du portefeuille.

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

const FALLBACK_RATES = {
  CDF: 2800, XOF: 600, XAF: 600, KES: 129, RWF: 1300, UGX: 3700, ZMW: 27, SLE: 22.5
};

const MARGIN_PERCENT = 5;

async function getRate(currency) {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates && data.rates[currency]) {
      return data.rates[currency];
    }
  } catch (e) {
    console.log('[shop-mbotepay-payment] Taux en direct indisponible, fallback utilise :', e.message);
  }
  return FALLBACK_RATES[currency] || 1;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { uid, email, pubId, itemTitle, itemType, amountUSD, countryCode, operatorName, phone, chargeCurrency } = req.body;

    if (!uid || !pubId || !itemTitle || !amountUSD || amountUSD <= 0 || !countryCode || !operatorName || !phone) {
      return res.status(400).json({ error: 'Parametres manquants' });
    }

    const mapping = MBOTEPAY_MAP[countryCode];
    if (!mapping || !mapping.operators[operatorName]) {
      return res.status(200).json({ supported: false });
    }

    const apiKey = process.env.MBOTEPAY_API_KEY;
    if (!apiKey) {
      console.error('[shop-mbotepay-payment] MBOTEPAY_API_KEY manquante');
      return res.status(200).json({ supported: false });
    }

    const finalCurrency = (chargeCurrency && mapping.currencies.includes(chargeCurrency))
      ? chargeCurrency
      : mapping.currency;

    let chargeAmount;
    if (finalCurrency === 'USD') {
      chargeAmount = Math.round(amountUSD * 100) / 100;
    } else {
      const rate = await getRate(finalCurrency);
      const adjustedRate = rate * (1 + MARGIN_PERCENT / 100);
      chargeAmount = Math.round(amountUSD * adjustedRate);
    }

    const reference = `shoporder_${uid}_${Date.now()}`;

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
        phone: phone.replace(/\D/g, ''),
        reference: reference,
        callback_url: 'https://coeurnohboost.vercel.app/api/shop-mbotepay-webhook'
      })
    });

    const data = await mbotepayResponse.json();
    console.log('[shop-mbotepay-payment] Reponse MboтePay =', JSON.stringify(data));

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
    console.error('[shop-mbotepay-payment] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
