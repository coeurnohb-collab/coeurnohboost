// api/place-smm-order.js
//
// SECURISE : avant, ce fichier ne verifiait NI l'identite de l'appelant NI
// son solde -- n'importe qui sur internet, meme sans compte, pouvait
// declencher une vraie commande payante sur MoreThanPanel gratuitement.
// Le debit du solde et la creation de la commande se faisaient en plus
// directement depuis le navigateur (Firestore), ce qui permettait aussi a
// n'importe quel utilisateur connecte de modifier son propre solde a la
// main. Desormais, TOUT (verification d'identite, verification et debit du
// solde, creation de la commande) se fait ici, cote serveur, dans une
// transaction Firestore atomique -- le navigateur ne fait plus que demander
// et afficher le resultat.
//
// MISE A JOUR (correction du systeme de correspondance des IDs MoreThanPanel) :
// 1) La "qualite" envoyee par le site (ex: "Standard", "Premium", "VIP")
//    n'etait JAMAIS normalisee avant de chercher l'ID MoreThanPanel dans
//    service_map / le fichier de secours -- qui utilisent tous les deux
//    des cles en minuscules ("standard","premium","vip"). Resultat :
//    la recherche de l'ID echouait TOUJOURS silencieusement et aucune
//    commande n'etait jamais automatisee. C'est corrige avec
//    normalizeQuality() ci-dessous, qui accepte les deux formes.
// 2) Avant, si l'admin videait volontairement un ID dans le panneau admin
//    (le mettant a null), le code retombait quand meme sur l'ancien ID du
//    fichier de secours embarque -- la desactivation ne marchait jamais
//    vraiment. Desormais, des qu'une plateforme+type existe dans Firestore
//    (service_map), Firestore devient la seule source de verite pour ce
//    type : une valeur vide/null y reste vide, sans jamais recuperer le
//    fichier de secours en douce. Le fichier de secours ne sert plus que
//    pour les combinaisons jamais configurees du tout dans Firestore.
// 3) Avant, le solde etait debite AVANT meme de savoir si un ID
//    MoreThanPanel valide existait pour la commande -- une commande sans
//    automatisation configuree etait quand meme facturee (mise en attente
//    manuelle). Desormais, pour une commande de service, l'existence d'un
//    ID valide est verifiee AVANT le debit ; si aucun ID valide n'est
//    configure, la commande est refusee et rien n'est debite.
// 4) Avant, en cas de refus explicite de MoreThanPanel APRES le debit, ou
//    en cas d'erreur reseau ambigue, le solde n'etait jamais rembourse et
//    le client restait debite pour rien. Desormais : refus explicite de
//    MoreThanPanel -> remboursement automatique securise (transaction
//    Firestore, protegee contre le double remboursement). Erreur reseau
//    ambigue (on ne sait pas si MoreThanPanel a reellement recu la
//    commande) -> AUCUN remboursement automatique (pour eviter un double
//    remboursement si la commande a en fait ete creee cote fournisseur) ;
//    la commande reste visible pour l'admin avec le statut
//    "pending_review" et une explication claire.
// 5) La commande garde desormais en memoire (champ mtpServiceId) l'ID
//    MoreThanPanel reellement utilise au moment de sa creation, meme si
//    l'admin change cet ID plus tard dans le panneau admin.
// 6) mtp-service-map.js a ete deplace de api/mtp-service-map.js vers
//    api/_lib/mtp-service-map.js : ce fichier n'est qu'un module de
//    donnees partage (pas un point d'entree HTTP), mais Vercel comptait
//    quand meme chaque fichier de api/ comme une fonction serverless a
//    part entiere -- avec le plan gratuit (limite a 12 fonctions), ca
//    faisait deborder le projet et bloquait le deploiement. Les dossiers
//    commencant par "_" dans api/ sont ignores par la detection de
//    fonctions de Vercel, donc ce deplacement ne change rien au
//    fonctionnement, juste a l'endroit du fichier.
//
// Corps attendu (JSON) :
// {
//   idToken,                 // jeton Firebase de la personne connectee (obligatoire)
//   orderKind,                // 'service' | 'bundle' | 'package'
//   price,                    // prix calcule cote client (verifie ci-dessous)
//   platform, platformName,   // id + nom affiche de la plateforme
//   service, quality,         // libelles affiches sur la commande
//   link, quantity,           // lien a booster + quantite (null pour bundle/package)
//   type                      // uniquement pour orderKind === 'service' (mapping MTP)
// }

const admin = require('firebase-admin');
const STATIC_FALLBACK = require('./_lib/mtp-service-map');
const { SERVICE_CATALOG, QUALITY_TIERS, applyPricingOverrides } = require('../catalog-data.js');

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

const MTP_API_URL = 'https://morethanpanel.com/api/v2';

// Plafond de securite : aucune commande individuelle ne devrait jamais
// couter plus que ca. Sert de filet en cas de prix errone/manipule cote
// client, en attendant une verification complete du catalogue cote serveur.
const MAX_REASONABLE_PRICE = 500;

// Ramene n'importe quelle forme de qualite recue ("standard", "Standard",
// " STANDARD ", ou meme le nom affiche "VIP") vers l'id canonique utilise
// par le catalogue ET par service_map / le fichier de secours ("standard",
// "premium", "vip"). Renvoie null si la valeur ne correspond a rien de connu.
function normalizeQuality(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  const tier = QUALITY_TIERS.find(q => q.id === s || q.name.toLowerCase() === s);
  return tier || null;
}

// Determine l'ID MoreThanPanel a utiliser pour platform/type/qualityId.
// Regle (voir note en tete de fichier) : si la plateforme+type existe deja
// dans Firestore (service_map), Firestore fait foi pour les 3 qualites,
// meme si la valeur choisie est vide -- pas de repli silencieux sur le
// fichier de secours dans ce cas. Le fichier de secours ne s'applique que
// si cette combinaison n'a jamais ete configuree du tout dans Firestore.
async function resolveMtpServiceId(platform, type, qualityId) {
  try {
    const platformDoc = await db.collection('service_map').doc(platform).get();
    if (platformDoc.exists) {
      const data = platformDoc.data() || {};
      const typeMap = data[type];
      if (typeMap && Object.prototype.hasOwnProperty.call(typeMap, qualityId)) {
        const val = typeMap[qualityId];
        return (val === null || val === undefined || val === '') ? null : val;
      }
    }
  } catch (e) {
    console.log('[place-smm-order] Erreur lecture service_map, repli sur le fichier embarque :', e.message);
  }
  const fallbackPlatform = STATIC_FALLBACK[platform];
  const fallbackType = fallbackPlatform && fallbackPlatform[type];
  return (fallbackType && fallbackType[qualityId]) || null;
}

// Remboursement automatique et securise : protege contre le double
// remboursement en verifiant, DANS la transaction, que la commande n'a pas
// deja ete remboursee avant d'y toucher.
async function refundOrderSafely(userRef, orderRef, amount, reasonForClient) {
  try {
    let newBalance = null;
    await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) return;
      const orderData = orderSnap.data();
      if (orderData.refunded === true) return; // deja rembourse, on ne touche a rien
      const userSnap = await tx.get(userRef);
      const currentBalance = (userSnap.exists && userSnap.data().balance) || 0;
      newBalance = currentBalance + amount;
      tx.update(userRef, { balance: newBalance });
      tx.update(orderRef, {
        status: 'refunded',
        refunded: true,
        refundedAt: new Date().toISOString(),
        debugReason: 'Refusee par MoreThanPanel : ' + reasonForClient
      });
    });
    return { ok: newBalance !== null, newBalance };
  } catch (e) {
    console.error('[place-smm-order] Echec du remboursement automatique :', e.message);
    try {
      await orderRef.update({
        status: 'pending_review',
        debugReason: `Refusee par MoreThanPanel (${reasonForClient}) mais le remboursement automatique a echoue (${e.message}) -- a rembourser manuellement.`
      });
    } catch (e2) { /* best effort */ }
    return { ok: false, newBalance: null };
  }
}

// Erreur reseau/reponse ambigue apres l'envoi a MoreThanPanel : on ne sait
// pas si la commande a reellement ete creee cote fournisseur. On NE
// rembourse PAS automatiquement (risque de double remboursement) -- la
// commande reste visible pour verification manuelle par l'admin.
async function markOrderPendingReview(orderRef, reasonForAdmin) {
  try {
    await orderRef.update({ status: 'pending_review', debugReason: reasonForAdmin });
  } catch (e) {
    console.error('[place-smm-order] Impossible de marquer la commande en verification :', e.message);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  const {
    idToken, orderKind, price, platform, platformName,
    service, quality, link, quantity, type
  } = req.body || {};

  // 1) Identite obligatoire -- avant, aucune verification n'existait ici.
  if (!idToken) {
    return res.status(401).json({ error: 'Connexion requise.' });
  }
  let uid, userEmail;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
    userEmail = decoded.email || null;
  } catch (e) {
    return res.status(401).json({ error: 'Session invalide, reconnecte-toi.' });
  }

  // 2) Validation de base des champs.
  if (!orderKind || !link || price == null) {
    return res.status(400).json({ error: 'Parametres manquants.' });
  }
  const numericPrice = Number(price);
  if (!(numericPrice > 0) || numericPrice > MAX_REASONABLE_PRICE) {
    return res.status(400).json({ error: 'Montant de commande invalide.' });
  }

  // 2bis) VERIFICATION REELLE DU PRIX -- uniquement pour les commandes de
  // service individuel (orderKind === 'service'), le cas le plus courant.
  // Avant, seul le plafond MAX_REASONABLE_PRICE protegeait ce fichier : un
  // utilisateur pouvait commander un vrai service automatise (ex: 10 000
  // abonnes) en trafiquant le prix envoye a 0.01$, tant que c'etait sous
  // le plafond. Desormais, le prix est entierement recalcule ici a partir
  // du catalogue (avec les eventuelles surcharges admin de la collection
  // Firestore "pricing", exactement comme le fait le navigateur), et la
  // commande est refusee si le prix envoye ne correspond pas.
  //
  // NOTE HONNETE : les forfaits (bundle) et packages de monetisation
  // (package) ne sont PAS encore verifies de la meme facon -- ils
  // dependent d'un systeme de prix personnalises (collection
  // "bundle_pricing") qui a son propre bug de synchronisation cote client
  // a corriger d'abord, pour eviter de rejeter par erreur de vraies
  // commandes de forfaits. Ils restent donc proteges par le plafond
  // MAX_REASONABLE_PRICE uniquement, pour l'instant.
  let qualityTier = null;
  let mtpServiceId = null;

  if (orderKind === 'service') {
    if (!platform || !type || !quality || !quantity) {
      return res.status(400).json({ error: 'Parametres de commande manquants.' });
    }
    try {
      const pricingSnap = await db.collection('pricing').get();
      const overrides = {};
      pricingSnap.forEach(doc => { overrides[doc.id] = doc.data().services || []; });
      applyPricingOverrides(overrides);
    } catch (e) {
      console.log('[place-smm-order] Pas de prix personnalises, utilisation des prix par defaut.', e.message);
    }

    const services = SERVICE_CATALOG[platform] || [];
    const svc = services.find(s => s.type === type);
    qualityTier = normalizeQuality(quality);

    if (!svc || !qualityTier) {
      return res.status(400).json({ error: 'Service ou qualite inconnus.' });
    }
    const numericQty = Number(quantity);
    if (!(numericQty > 0) || numericQty < svc.min || numericQty > svc.max) {
      return res.status(400).json({ error: `Quantite invalide (entre ${svc.min} et ${svc.max}).` });
    }

    const expectedPrice = (numericQty / 1000) * svc.price[qualityTier.id];
    // Tolerance de 1 centime pour absorber les arrondis JavaScript normaux.
    if (Math.abs(expectedPrice - numericPrice) > 0.01) {
      console.log(`[place-smm-order] Prix incoherent : envoye ${numericPrice}, attendu ${expectedPrice.toFixed(2)} (${platform}/${type}/${qualityTier.id}, qte ${numericQty}).`);
      return res.status(400).json({ error: 'Le prix de la commande a change, merci de reessayer.' });
    }

    // 2ter) VERIFICATION DE L'AUTOMATISATION AVANT DEBIT -- desormais
    // obligatoire pour une commande de service : si aucun ID MoreThanPanel
    // valide n'est configure (ou si la cle API du fournisseur n'est meme
    // pas configuree sur le serveur) pour cette plateforme/type/qualite,
    // la commande est refusee ICI, avant tout debit. Rien n'est facture.
    const apiKey = process.env.MTP_API_KEY;
    mtpServiceId = await resolveMtpServiceId(platform, type, qualityTier.id);
    if (!apiKey || !mtpServiceId) {
      console.log(`[place-smm-order] Commande refusee (pas de debit) : aucune automatisation disponible pour ${platform}/${type}/${qualityTier.id}.`);
      return res.status(400).json({ error: "Ce service n'est pas disponible pour le moment. Merci de reessayer plus tard ou de contacter le support." });
    }
  }

  const userRef = db.collection('users').doc(uid);
  let newBalance;
  let orderRef;

  // 3) Verification ET debit du solde dans une transaction atomique :
  // impossible desormais de commander plus que son vrai solde en base,
  // et impossible de "gagner" du solde en le modifiant depuis le navigateur
  // puisque les regles Firestore ne l'autorisent plus (voir firestore.rules).
  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error('Compte introuvable.');
      const currentBalance = userSnap.data().balance || 0;
      if (currentBalance < numericPrice) {
        throw new Error('SOLDE_INSUFFISANT');
      }
      newBalance = currentBalance - numericPrice;
      tx.update(userRef, { balance: newBalance });

      orderRef = db.collection('orders').doc();
      tx.set(orderRef, {
        uid,
        email: userEmail,
        platform: platformName || platform || '',
        service: service || '',
        quality: quality || orderKind,
        link,
        quantity: quantity || null,
        price: numericPrice,
        status: 'pending',
        // ID MoreThanPanel reellement utilise au moment de la creation --
        // conserve tel quel meme si l'admin change ensuite ses ID dans le
        // panneau admin (voir point 5 en tete de fichier).
        mtpServiceId: orderKind === 'service' ? mtpServiceId : null,
        createdAt: new Date().toISOString()
      });
    });
  } catch (e) {
    if (e.message === 'SOLDE_INSUFFISANT') {
      return res.status(200).json({ success: false, error: 'Solde insuffisant.' });
    }
    console.error('[place-smm-order] Erreur transaction :', e.message);
    return res.status(200).json({ success: false, error: 'Erreur lors de la commande. Réessaie.' });
  }

  // 4) Uniquement pour les commandes de service individuel : tentative
  // d'automatisation reelle vers MoreThanPanel (logique inchangee par
  // rapport a avant, juste deplacee ici et executee apres un debit fiable).
  if (orderKind !== 'service') {
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: false });
  }

  // A ce stade, apiKey et mtpServiceId sont deja verifies valides (etape 2ter).
  const apiKey = process.env.MTP_API_KEY;

  try {
    const response = await fetch(MTP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: apiKey, action: 'add', service: mtpServiceId, link, quantity })
    });

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      // Reponse illisible : on ne sait pas si MoreThanPanel a cree la
      // commande ou non. Pas de remboursement automatique (risque de
      // double remboursement) -- on laisse la commande pour verification
      // manuelle par l'admin (voir point 4 en tete de fichier).
      await markOrderPendingReview(orderRef, `Reponse MoreThanPanel illisible apres l'envoi de la commande (HTTP ${response.status}). Verifier manuellement chez le fournisseur avant tout remboursement.`);
      return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: 'unknown' });
    }

    if (data.error) {
      // Refus EXPLICITE de MoreThanPanel (la commande n'a pas ete creee
      // chez le fournisseur) -> remboursement automatique securise.
      const refund = await refundOrderSafely(userRef, orderRef, numericPrice, data.error);
      return res.status(200).json({
        success: true,
        newBalance: refund.ok ? refund.newBalance : newBalance,
        orderId: orderRef.id,
        automated: false,
        refunded: refund.ok
      });
    }

    let mtpCost = null, mtpCurrency = null;
    try {
      const statusResponse = await fetch(MTP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: apiKey, action: 'status', order: data.order })
      });
      const statusData = await statusResponse.json();
      if (statusData && statusData.charge) {
        mtpCost = parseFloat(statusData.charge);
        mtpCurrency = statusData.currency || 'USD';
      }
    } catch (e) { /* le cout restera juste inconnu pour l'instant, pas bloquant */ }

    await orderRef.update({
      status: 'processing',
      mtpOrderId: data.order,
      mtpCost, mtpCurrency
    });
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: true, mtpOrderId: data.order });
  } catch (e) {
    // Erreur reseau (fetch a echoue, timeout, etc.) : ambigu, on ne sait pas
    // si MoreThanPanel a recu/cree la commande. Pas de remboursement
    // automatique ici non plus -- verification manuelle requise.
    await markOrderPendingReview(orderRef, 'Erreur reseau apres l\'envoi a MoreThanPanel : ' + e.message + '. Verifier manuellement chez le fournisseur avant tout remboursement.');
    return res.status(200).json({ success: true, newBalance, orderId: orderRef.id, automated: 'unknown' });
  }
};
