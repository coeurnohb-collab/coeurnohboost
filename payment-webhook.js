// api/payment-webhook.js
// Point d'entree UNIQUE pour les webhooks de paiement, distingues par
// ?provider= dans l'URL (cryptomus / mbotepay / maxicash).
//
// bodyParser desactive globalement car MboтePay a besoin du corps BRUT
// exact pour verifier sa signature HMAC -- Cryptomus est donc parse
// manuellement (JSON.parse) ci-dessous.
//
// SECURITE (chantier 3) :
//  - CRYPTOMUS et MBOTEPAY : signature deja verifiee comme avant (aucun
//    changement de comportement), mais le "deja credite ?" est maintenant
//    verifie A L'INTERIEUR de la transaction Firestore, pas juste avant.
//    AVANT : si le fournisseur envoyait deux fois la meme notification en
//    meme temps (ce qui arrive reellement, "at-least-once delivery"), les
//    deux passaient la verification avant que l'une des deux ait fini
//    d'ecrire -> double credit. Desormais impossible : la transaction relit
//    le statut au moment d'ecrire et abandonne si c'est deja "completed".
//  - MAXICASH : sa notification de paiement n'est pas signee (la doc ne
//    documente aucune signature a verifier) -- n'importe qui pouvant deviner
//    ou intercepter une "Reference" pourrait sinon se crediter gratuitement.
//    Ce webhook NE CREDITE DONC PLUS AUTOMATIQUEMENT : il enregistre ce qui
//    est recu (visible dans l'onglet Depots de l'admin) et c'est TOI qui
//    valides manuellement apres avoir verifie le paiement dans ton espace
//    marchand MaxiCash (bouton deja existant dans admin.js, approveDeposit).
//    A remplacer par le mode "PayEntryWeb" (signe, credentials cote serveur)
//    des que teste en sandbox.

const crypto = require('crypto');
const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');
const { initFirebaseAdmin, cleanText } = require('./_lib/security');
const { sendPushToUser } = require('./_lib/push');

initFirebaseAdmin();
const db = admin.firestore();

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      // Garde-fou : un webhook n'a aucune raison de depasser 200 Ko.
      if (size > 200 * 1024) { reject(new Error('Corps de requete trop volumineux')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Credite le solde UNE SEULE FOIS, meme si le fournisseur renvoie la meme
// notification plusieurs fois en parallele : tout se decide a l'interieur de
// la transaction, sur l'etat lu a cet instant precis (pas celui lu plus tot
// par l'appelant).
async function creditBalanceOnce({ uid, amount, type, description, relatedId, requestRef }) {
  const userRef = db.collection('users').doc(uid);
  const result = await db.runTransaction(async (transaction) => {
    const [userSnap, reqSnap] = await Promise.all([transaction.get(userRef), transaction.get(requestRef)]);
    if (!reqSnap.exists) throw new Error(`Demande ${requestRef.id} introuvable`);
    if (reqSnap.data().status === 'completed') return { alreadyCredited: true };
    if (!userSnap.exists) throw new Error(`Utilisateur ${uid} introuvable`);

    const currentBalance = userSnap.data().balance || 0;
    const newBalance = Math.round((currentBalance + amount) * 100) / 100;
    transaction.update(userRef, { balance: newBalance });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type, amount, balanceAfter: newBalance, description, relatedId
    }));
    transaction.update(requestRef, { status: 'completed', completedAt: new Date().toISOString(), amountCredited: amount });
    transaction.set(db.collection('notifications').doc(), {
      uid, title: 'Solde rechargé 💰', body: `Ton compte a été crédité de ${amount.toFixed(2)}$.`,
      type: 'recharge', read: false, createdAt: new Date().toISOString()
    });
    return { alreadyCredited: false, newBalance };
  });

  if (!result.alreadyCredited) {
    await sendPushToUser(uid, 'Solde rechargé 💰', `Ton compte a été crédité de ${amount.toFixed(2)}$.`, '/?tab=wallet');
  }
  return result;
}

/* ========================= CRYPTOMUS ========================= */

async function handleCryptomusWebhook(rawBody, res) {
  let body;
  try { body = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'JSON invalide' }); }

  const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;
  if (!apiKey) {
    console.error('CRYPTOMUS WEBHOOK: cle API manquante');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const receivedSign = body.sign;
  const bodyForCheck = { ...body };
  delete bodyForCheck.sign;
  const jsonPayload = JSON.stringify(bodyForCheck);
  const base64Payload = Buffer.from(jsonPayload).toString('base64');
  const expectedSign = crypto.createHash('md5').update(base64Payload + apiKey).digest('hex');

  if (typeof receivedSign !== 'string' || receivedSign.length !== expectedSign.length ||
      !crypto.timingSafeEqual(Buffer.from(receivedSign), Buffer.from(expectedSign))) {
    console.error('CRYPTOMUS WEBHOOK: signature invalide, requete ignoree');
    return res.status(403).json({ error: 'Signature invalide' });
  }

  const status = body.status;
  const orderId = body.order_id;
  if (status !== 'paid' && status !== 'paid_over') {
    console.log(`CRYPTOMUS WEBHOOK: statut "${status}" pour ${orderId}, aucune action`);
    return res.status(200).json({ received: true });
  }

  const parts = String(orderId).split('_');
  if (parts[0] !== 'topup' || parts.length < 3) {
    console.error('CRYPTOMUS WEBHOOK: order_id invalide:', orderId);
    return res.status(400).json({ error: 'order_id invalide' });
  }
  const uid = parts.slice(1, -1).join('_');

  const requestsSnap = await db.collection('topup_requests').where('cryptomusOrderId', '==', orderId).limit(1).get();
  if (requestsSnap.empty) {
    console.error('CRYPTOMUS WEBHOOK: aucune demande trouvee pour', orderId);
    return res.status(404).json({ error: 'Demande introuvable' });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  // Le montant credite reste TOUJOURS celui de notre propre demande
  // (amountUSD, fixe des payment-initiate en devise forcee USD), jamais celui
  // renvoye par le webhook -- meme signe, autant ne dependre que de nos
  // propres donnees pour le montant credite.
  const amountPaid = requestData.amountUSD;
  if (typeof amountPaid !== 'number' || !(amountPaid > 0)) {
    console.error('CRYPTOMUS WEBHOOK: montant de la demande invalide pour', orderId);
    return res.status(400).json({ error: 'Montant de la demande invalide' });
  }

  const result = await creditBalanceOnce({ uid, amount: amountPaid, type: 'topup_crypto', description: 'Recharge par crypto-monnaie', relatedId: orderId, requestRef: requestDoc.ref });
  if (result.alreadyCredited) {
    console.log('CRYPTOMUS WEBHOOK: deja credite pour', orderId);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }
  console.log(`CRYPTOMUS WEBHOOK: ${amountPaid}$ credites a ${uid} (order ${orderId})`);
  return res.status(200).json({ received: true, credited: true });
}

/* ========================= MBOTEPAY ========================= */

async function handleMbotepayWebhook(rawBody, req, res) {
  const secret = process.env.MBOTEPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[mbotepay-webhook] MBOTEPAY_WEBHOOK_SECRET manquant');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const sigHeader = req.headers['x-mbotepay-signature'] || '';
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const timestamp = parts.t;
  const receivedSig = parts.v1;

  if (!timestamp || !receivedSig) {
    console.error('[mbotepay-webhook] En-tete de signature absent ou mal forme');
    return res.status(403).json({ error: 'Signature manquante' });
  }

  // Fenetre de tolerance de 5 minutes : empeche de rejouer une vieille
  // notification (interceptee ou fuitee) indefiniment.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.error('[mbotepay-webhook] Horodatage hors fenetre, requete ignoree');
    return res.status(403).json({ error: 'Signature expirée' });
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
  const validSignature = receivedSig.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));

  if (!validSignature) {
    console.error('[mbotepay-webhook] Signature invalide, requete ignoree');
    return res.status(403).json({ error: 'Signature invalide' });
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'JSON invalide' }); }
  const reference = payload.reference;
  const status = payload.status;

  if (!reference) {
    console.error('[mbotepay-webhook] Reference absente dans le payload');
    return res.status(400).json({ error: 'Reference absente' });
  }

  const requestsSnap = await db.collection('topup_requests').where('mbotepayReference', '==', reference).limit(1).get();
  if (requestsSnap.empty) {
    console.error('[mbotepay-webhook] Aucune demande trouvee pour', reference);
    return res.status(404).json({ error: 'Demande introuvable' });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  if (requestData.status === 'failed') {
    console.log('[mbotepay-webhook] Deja marque echoue pour', reference);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  if (status === 'completed') {
    const amountUSD = requestData.amountUSD || 0;
    const result = await creditBalanceOnce({ uid: requestData.uid, amount: amountUSD, type: 'topup_mobile_money', description: 'Recharge par Mobile Money', relatedId: reference, requestRef: requestDoc.ref });
    if (result.alreadyCredited) return res.status(200).json({ received: true, alreadyProcessed: true });
    console.log(`[mbotepay-webhook] ${amountUSD}$ credites a ${requestData.uid} (ref ${reference})`);
    return res.status(200).json({ received: true, credited: true });
  } else {
    await requestDoc.ref.update({ status: 'failed' });
    console.log(`[mbotepay-webhook] Paiement echoue pour ${reference}`);
    return res.status(200).json({ received: true, credited: false });
  }
}

/* ========================= MAXICASH ========================= */
// Voir le commentaire en tete de fichier : pas de signature verifiable ->
// jamais de credit automatique ici. On enregistre juste ce qui arrive pour
// que tu puisses valider dans l'onglet Depots.

async function handleMaxicashWebhook(rawBody, req, res) {
  let bodyParams = {};
  const contentType = req.headers['content-type'] || '';
  if (rawBody) {
    try {
      if (contentType.includes('application/json')) {
        bodyParams = JSON.parse(rawBody);
      } else {
        bodyParams = Object.fromEntries(new URLSearchParams(rawBody));
      }
    } catch (e) {
      console.log('[maxicash-webhook] Corps non parseable en JSON/urlencoded, ignore :', e.message);
    }
  }

  const params = { ...(req.query || {}), ...bodyParams };
  console.log('[maxicash-webhook] Parametres recus (methode ' + req.method + ') :', JSON.stringify(params));

  const reference = params.Reference || params.reference || params.Ref || null;
  const rawStatus = (params.ResponseStatus || params.Status || params.status || params.responsestatus || '').toString().toLowerCase();
  const isSuccess = ['success', 'successful', 'approved', 'completed', '1', '00'].includes(rawStatus);
  const isFailure = ['failed', 'declined', 'error', 'cancelled', 'canceled', '0'].includes(rawStatus);

  if (!reference) {
    console.log('[maxicash-webhook] Aucune reference reconnue -- rien a faire (voir logs ci-dessus)');
    return res.status(200).json({ received: true });
  }

  const requestsSnap = await db.collection('topup_requests').where('maxicashReference', '==', reference).limit(1).get();
  if (requestsSnap.empty) {
    console.error('[maxicash-webhook] Aucune demande trouvee pour', reference);
    return res.status(200).json({ received: true });
  }
  const requestDoc = requestsSnap.docs[0];
  const requestData = requestDoc.data();

  if (requestData.status === 'completed' || requestData.status === 'failed' || requestData.status === 'pending_admin_review') {
    console.log('[maxicash-webhook] Deja traite ou en attente admin pour', reference);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  // On note ce que MaxiCash a annonce, mais SANS crediter -- c'est toi qui
  // verifies dans ton espace marchand MaxiCash puis valides dans l'onglet
  // Depots de l'admin (bouton "Approuver").
  await requestDoc.ref.update({
    status: 'pending_admin_review',
    maxicashAnnouncedStatus: cleanText(rawStatus, 60),
    maxicashRawParams: cleanText(JSON.stringify(params), 2000)
  });
  console.log(`[maxicash-webhook] "${rawStatus}" note pour ${reference} -- en attente de validation admin (jamais credite automatiquement)`);
  return res.status(200).json({ received: true, pendingAdminReview: true });
}

/* ========================= ROUTEUR ========================= */

module.exports = async function handler(req, res) {
  const provider = req.query.provider;

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const rawBody = req.method === 'POST' ? await readRawBody(req) : '';

    if (provider === 'cryptomus') return await handleCryptomusWebhook(rawBody, res);
    if (provider === 'mbotepay') return await handleMbotepayWebhook(rawBody, req, res);
    if (provider === 'maxicash') return await handleMaxicashWebhook(rawBody, req, res);

    // Sonde de sante generique (ex: verification manuelle de l'URL) : 200 vide.
    if (req.method === 'GET') return res.status(200).end();

    console.error('[payment-webhook] provider inconnu :', provider);
    return res.status(400).json({ error: 'provider inconnu' });
  } catch (error) {
    console.error('[payment-webhook] Exception :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
