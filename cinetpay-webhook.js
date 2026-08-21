// api/cinetpay-webhook.js
// Recoit la notification de paiement de CinetPay. IMPORTANT (regle de securite
// officielle CinetPay) : on ne fait JAMAIS confiance au contenu du webhook lui
// meme (n'importe qui peut forger un faux POST vers cette URL publique). On
// utilise seulement le webhook comme un signal "va verifier cette transaction",
// puis on rappelle l'API CinetPay (GET /v1/payment/{merchant_transaction_id})
// avec notre jeton pour obtenir le VRAI statut avant de crediter le solde.

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

// Obtient un jeton d'acces CinetPay (meme logique que cinetpay-payment.js)
async function getAccessToken() {
  const apiKey = process.env.CINETPAY_API_KEY;
  const apiPassword = process.env.CINETPAY_API_PASSWORD;

  if (!apiKey || !apiPassword) {
    console.error('[cinetpay-webhook] CINETPAY_API_KEY ou CINETPAY_API_PASSWORD manquante');
    return null;
  }

  const tokenResponse = await fetch('https://api.cinetpay.com/v1/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, api_password: apiPassword })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('[cinetpay-webhook] Echec obtention jeton :', JSON.stringify(tokenData));
    return null;
  }
  return tokenData.access_token;
}

module.exports = async function handler(req, res) {
  // On accepte GET (sonde de sante CinetPay) et POST (vraie notification)
  if (req.method === 'GET') {
    return res.status(200).json({ received: true });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const payload = req.body || {};
    const merchantTransactionId = payload.merchant_transaction_id;

    if (!merchantTransactionId) {
      console.error('[cinetpay-webhook] merchant_transaction_id absent du payload');
      // On repond quand meme 200 pour eviter des retries inutiles sur une requete mal formee
      return res.status(200).json({ received: true, error: 'merchant_transaction_id absent' });
    }

    // --- Etape obligatoire : re-verifier le VRAI statut aupres de CinetPay ---
    // On ne lit jamais le champ "status" du payload recu, on ignore aussi
    // notify_token ici et on se fie uniquement a la reponse de cet appel.
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('[cinetpay-webhook] Impossible d obtenir un jeton, verification annulee');
      // On repond 200 pour eviter un retry en boucle ; le paiement restera
      // "pending" et pourra etre rattrape manuellement si besoin
      return res.status(200).json({ received: true, error: 'jeton indisponible' });
    }

    const statusResponse = await fetch(
      `https://api.cinetpay.com/v1/payment/${merchantTransactionId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const statusData = await statusResponse.json();
    console.log('[cinetpay-webhook] Statut reel CinetPay =', JSON.stringify(statusData));

    const realStatus = statusData && statusData.details && statusData.details.status;
    // Valeurs possibles : SUCCESS, FAILED, INITIATED, PENDING

    // --- Recherche de la demande correspondante dans Firestore ---
    const requestsSnap = await db.collection('topup_requests')
      .where('cinetpayReference', '==', merchantTransactionId)
      .limit(1)
      .get();

    if (requestsSnap.empty) {
      console.error('[cinetpay-webhook] Aucune demande trouvee pour', merchantTransactionId);
      return res.status(200).json({ received: true, error: 'Demande introuvable' });
    }

    const requestDoc = requestsSnap.docs[0];
    const requestData = requestDoc.data();

    if (requestData.status === 'completed' || requestData.status === 'failed') {
      // Deja traite (CinetPay peut renvoyer la notification plusieurs fois)
      console.log('[cinetpay-webhook] Deja traite pour', merchantTransactionId);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    if (realStatus === 'SUCCESS') {
      const amountUSD = requestData.amountUSD || 0;
      const userRef = db.collection('users').doc(requestData.uid);

      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
          throw new Error(`Utilisateur ${requestData.uid} introuvable`);
        }
        const currentBalance = userSnap.data().balance || 0;
        transaction.update(userRef, { balance: currentBalance + amountUSD });
        transaction.update(requestDoc.ref, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      });

      console.log(`[cinetpay-webhook] ${amountUSD}$ credites a ${requestData.uid} (ref ${merchantTransactionId})`);
      return res.status(200).json({ received: true, credited: true });

    } else if (realStatus === 'FAILED') {
      await requestDoc.ref.update({ status: 'failed' });
      console.log(`[cinetpay-webhook] Paiement echoue pour ${merchantTransactionId}`);
      return res.status(200).json({ received: true, credited: false });

    } else {
      // INITIATED ou PENDING : pas encore un statut final, on ne fait rien.
      // CinetPay renverra une nouvelle notification quand ce sera termine.
      console.log(`[cinetpay-webhook] Statut non final (${realStatus}) pour ${merchantTransactionId}`);
      return res.status(200).json({ received: true, pending: true });
    }

  } catch (error) {
    console.error('[cinetpay-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
