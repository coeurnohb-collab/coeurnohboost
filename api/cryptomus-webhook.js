// api/cryptomus-webhook.js
// Recoit la confirmation de paiement de Cryptomus, verifie son authenticite,
// puis credite automatiquement le solde (balance) du client dans Firestore.

const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialisation de Firebase Admin (une seule fois, meme si la fonction est appelee plusieurs fois)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Sur Vercel, les sauts de ligne de la cle privee sont parfois transformes
      // en "\n" litteral : on les remet en vrais sauts de ligne.
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
    const body = req.body;
    const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;

    if (!apiKey) {
      console.error('CRYPTOMUS WEBHOOK: cle API manquante');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // --- 1. Verification de la signature envoyee par Cryptomus ---
    // On retire le champ "sign" avant de recalculer, comme l'exige Cryptomus
    const receivedSign = body.sign;
    const bodyForCheck = { ...body };
    delete bodyForCheck.sign;

    const jsonPayload = JSON.stringify(bodyForCheck);
    const base64Payload = Buffer.from(jsonPayload).toString('base64');
    const expectedSign = crypto
      .createHash('md5')
      .update(base64Payload + apiKey)
      .digest('hex');

    if (receivedSign !== expectedSign) {
      console.error('CRYPTOMUS WEBHOOK: signature invalide, requete ignoree');
      return res.status(403).json({ error: 'Signature invalide' });
    }

    // --- 2. On ne traite que les paiements confirmes ---
    const status = body.status; // ex: "paid", "paid_over", "process", "cancel", "fail"
    const orderId = body.order_id;

    if (status !== 'paid' && status !== 'paid_over') {
      // Paiement pas encore confirme (en cours, annule, echoue...) : on ne credite rien
      console.log(`CRYPTOMUS WEBHOOK: statut "${status}" pour ${orderId}, aucune action`);
      return res.status(200).json({ received: true });
    }

    // --- 3. On retrouve l'utilisateur via order_id (format: topup_<uid>_<timestamp>) ---
    const parts = String(orderId).split('_');
    if (parts[0] !== 'topup' || parts.length < 3) {
      console.error('CRYPTOMUS WEBHOOK: order_id invalide:', orderId);
      return res.status(400).json({ error: 'order_id invalide' });
    }
    const uid = parts.slice(1, -1).join('_'); // au cas ou l'uid contient des underscores

    // --- 4. On verifie que cette facture n'a pas deja ete creditee (anti double-credit) ---
    const requestsSnap = await db.collection('topup_requests')
      .where('cryptomusOrderId', '==', orderId)
      .limit(1)
      .get();

    if (requestsSnap.empty) {
      console.error('CRYPTOMUS WEBHOOK: aucune demande trouvee pour', orderId);
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const requestDoc = requestsSnap.docs[0];
    const requestData = requestDoc.data();

    if (requestData.status === 'completed') {
      // Deja traite precedemment (Cryptomus peut renvoyer le webhook plusieurs fois)
      console.log('CRYPTOMUS WEBHOOK: deja credite pour', orderId);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    const amountPaid = parseFloat(body.amount) || requestData.amountUSD;

    // --- 5. Credit du solde + mise a jour du statut, en une seule transaction ---
    const userRef = db.collection('users').doc(uid);

    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error(`Utilisateur ${uid} introuvable`);
      }
      const currentBalance = userSnap.data().balance || 0;
      transaction.update(userRef, { balance: currentBalance + amountPaid });
      transaction.update(requestDoc.ref, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        amountCredited: amountPaid
      });
      transaction.set(db.collection('notifications').doc(), {
        uid,
        title: 'Solde rechargé 💰',
        body: `Ton compte a été crédité de ${amountPaid.toFixed(2)}$.`,
        type: 'recharge',
        read: false,
        createdAt: new Date().toISOString()
      });
    });

    console.log(`CRYPTOMUS WEBHOOK: ${amountPaid}$ credites a ${uid} (order ${orderId})`);
    return res.status(200).json({ received: true, credited: true });

  } catch (error) {
    console.error('CRYPTOMUS WEBHOOK exception:', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
