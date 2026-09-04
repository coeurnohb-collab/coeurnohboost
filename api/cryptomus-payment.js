// api/cryptomus-payment.js
// Cree une facture de paiement Cryptomus (USDT, BTC, TRX...)
// Appelee par script.js (fonction submitRecharge) quand method === 'crypto'
//
// SECURISE : la demande de recharge (topup_requests) est desormais creee
// ICI, cote serveur, avec le meme montant qui sert a creer la vraie
// facture Cryptomus -- avant, le navigateur creait cette demande lui-meme
// avec un montant totalement libre, decorrele de ce qui etait reellement
// facture. Un client aurait pu payer 1$ et enregistrer une demande a
// 1000$, puis se faire crediter 1000$ au webhook.

const crypto = require('crypto');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { uid, amount, currency } = req.body;

    // Verification des donnees recues
    if (!uid || !amount || amount <= 0) {
      return res.status(400).json({ error: 'uid et amount (positif) sont requis' });
    }

    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
    const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;

    if (!merchantId || !apiKey) {
      console.error('CRYPTOMUS: variables environnement manquantes');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // order_id unique : combine uid + timestamp, format accepte par Cryptomus
    // (lettres, chiffres, underscores, tirets uniquement)
    const orderId = `topup_${uid}_${Date.now()}`;

    // Donnees de la facture a creer chez Cryptomus
    const payload = {
      amount: String(amount),
      currency: currency || 'USD',
      order_id: orderId,
      url_callback: 'https://coeurnohboost.vercel.app/api/cryptomus-webhook',
      url_success: 'https://coeurnohboost.vercel.app/?payment=success',
      lifetime: 3600 // la facture expire dans 1h
    };

    // Generation de la signature exigee par Cryptomus
    // sign = md5( base64(JSON du payload) + cle API )
    const jsonPayload = JSON.stringify(payload);
    const base64Payload = Buffer.from(jsonPayload).toString('base64');
    const sign = crypto
      .createHash('md5')
      .update(base64Payload + apiKey)
      .digest('hex');

    // Appel a l'API Cryptomus
    const cryptomusResponse = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': merchantId,
        'sign': sign
      },
      body: jsonPayload
    });

    const data = await cryptomusResponse.json();

    if (data.state !== 0) {
      console.error('CRYPTOMUS erreur:', data);
      return res.status(400).json({ error: data.message || 'Erreur Cryptomus' });
    }

    // Cree la demande de recharge ICI, avec le MEME montant que celui de la
    // vraie facture ci-dessus -- le client ne peut plus le modifier ensuite.
    let userEmail = null;
    try {
      const userSnap = await db.collection('users').doc(uid).get();
      if (userSnap.exists) userEmail = userSnap.data().email || null;
    } catch (e) { /* pas bloquant si la lecture echoue, l'email n'est qu'informatif */ }

    await db.collection('topup_requests').add({
      uid,
      email: userEmail,
      method: 'crypto',
      amountUSD: Number(amount),
      status: 'pending_payment',
      cryptomusOrderId: orderId,
      cryptomusInvoiceId: data.result.uuid,
      createdAt: new Date().toISOString()
    });

    // On renvoie le lien de paiement et les identifiants au frontend
    return res.status(200).json({
      success: true,
      paymentUrl: data.result.url,
      invoiceId: data.result.uuid,
      orderId: orderId
    });

  } catch (error) {
    console.error('CRYPTOMUS exception:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
