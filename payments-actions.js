// api/payments-actions.js
// Regroupe dans UN SEUL fichier toutes les actions liees a un paiement par
// solde interne (portefeuille) qui necessitent une transaction Firestore
// securisee cote serveur : participation payante a un concours, reservation
// de billet d'evenement (gratuit ou payant), et annulation de reservation
// d'evenement.
//
// POURQUOI UN SEUL FICHIER : le plan gratuit de Vercel limite le nombre de
// fonctions serverless dans /api (12 sur l'offre Hobby). Ce fichier
// remplace donc les DEUX anciens fichiers separes "contest-entry-payment.js"
// et "event-ticket-action.js" -- supprime-les de GitHub si ce n'est pas
// deja fait, ce fichier fait tout le travail des deux.
//
// Body attendu, selon "action" :
//   { idToken, action: 'contest_entry', contestId, name, submissionUrl, submissionType, caption }
//   { idToken, action: 'event_reserve', eventId, ticketTypeId, quantity }
//   { idToken, action: 'event_cancel', ticketId }
//   { idToken, action: 'course_enroll', courseId }
//   { idToken, action: 'site_premium_purchase' } -- active/renouvelle le Premium
//     de "Crée ton site" (mini_sites/{uid}) pour l'utilisateur connecte
//   { idToken, action: 'business_pro_purchase' } -- active/renouvelle
//     CoeurNoh Business Pro (businesses/{uid}) pour l'utilisateur connecte

const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');
const { initFirebaseAdmin, verifyCaller, enforceRateLimit, cleanText, isHttpsUrl } = require('./_lib/security');
const { sendPushToUser: sendPushNotification } = require('./_lib/push');

initFirebaseAdmin();
const db = admin.firestore();

// Limite de frequence par action -- toutes ces actions deplacent de l'argent
// ou creent une ressource limitee (billet, participation...), donc chacune
// est plafonnee separement pour eviter tout abus automatise.
const ACTION_RATE_LIMITS = {
  contest_entry: 10,
  event_reserve: 15,
  event_cancel: 15,
  course_enroll: 15,
  site_premium_purchase: 5,
  business_pro_purchase: 5,
  business_campaign_purchase: 5,
  loyalty_add_points: 30,
  loyalty_use_coupon: 20,
  loyalty_claim_reward: 20
};

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";
const CONTEST_COMMISSION_PERCENT = 15; // CoeurnohBoost garde 15% quand un concours est organise par une entreprise
const EVENT_COMMISSION_PERCENT = 15;   // meme commission plateforme pour les billets payants
const COURSE_COMMISSION_PERCENT = 15;  // meme commission plateforme pour les cours payants
const SITE_PREMIUM_PRICE = 20;          // en $, par mois -- doit rester identique a SITE_PREMIUM_PRICE dans script.js (Pack Site Professionnel)
const SITE_PREMIUM_DURATION_DAYS = 30;
const BUSINESS_PRO_PRICE = 15;          // en $, par mois -- doit rester identique a BUSINESS_PRO_PRICE dans script.js
const BUSINESS_PRO_DURATION_DAYS = 30;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  const { action } = req.body || {};

  // Identite verifiee via security.js : vrai jeton Firebase, avec controle
  // de revocation (une session "deconnectee de tous les appareils" est
  // desormais bien refusee ici au lieu de rester valable jusqu'a 1h).
  let uid;
  try {
    const caller = await verifyCaller(req);
    uid = caller.uid;
    const limit = ACTION_RATE_LIMITS[action] || 10;
    await enforceRateLimit({ scope: `pay-action-${action}`, id: uid, limit, windowSec: 600 });
  } catch (e) {
    const status = e.status || 401;
    if (status === 429) res.setHeader('Retry-After', String((e.extra && e.extra.retryAfterSec) || 60));
    return res.status(status).json({ success: false, error: e.message || 'Session invalide, reconnecte-toi.' });
  }

  try {
    if (action === 'contest_entry') {
      return res.status(200).json(await payContestEntry(uid, req.body));
    }
    if (action === 'event_reserve') {
      return res.status(200).json(await reserveEventTicket(uid, req.body));
    }
    if (action === 'event_cancel') {
      return res.status(200).json(await cancelEventTicket(uid, req.body));
    }
    if (action === 'course_enroll') {
      return res.status(200).json(await enrollPaidCourse(uid, req.body));
    }
    if (action === 'site_premium_purchase') {
      return res.status(200).json(await purchaseSitePremium(uid, req.body));
    }
    if (action === 'business_pro_purchase') {
      return res.status(200).json(await purchaseBusinessPro(uid, req.body));
    }
    if (action === 'business_campaign_purchase') {
      return res.status(200).json(await purchaseBusinessCampaign(uid, req.body));
    }
    if (action === 'loyalty_add_points') {
      return res.status(200).json(await loyaltyAddPoints(uid, req.body));
    }
    if (action === 'loyalty_use_coupon') {
      return res.status(200).json(await loyaltyUseCoupon(uid, req.body));
    }
    if (action === 'loyalty_claim_reward') {
      return res.status(200).json(await loyaltyClaimReward(uid, req.body));
    }
    return res.status(400).json({ success: false, error: 'Action inconnue.' });
  } catch (error) {
    console.error('[payments-actions] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};

/* ================= CONCOURS PAYANTS ================= */
// Deduit les frais de participation du solde du participant, et credite
// l'organisateur (moins commission) -- meme modele que shop-purchase.js.
// Une seule participation par personne et par concours : id deterministe
// "{contestId}_{uid}".

function computeContestStatus(c) {
  const now = Date.now();
  const start = c.startDate ? new Date(c.startDate).getTime() : 0;
  const end = c.endDate ? new Date(c.endDate).getTime() : Infinity;
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

async function payContestEntry(uid, body) {
  const { contestId, name, submissionUrl, submissionType, caption } = body;

  if (!contestId || !name || !submissionUrl) {
    throw new Error('contestId, name et submissionUrl sont requis.');
  }
  if (!isHttpsUrl(submissionUrl, 600)) {
    throw new Error('Lien de participation invalide.');
  }
  const safeName = cleanText(name, 100);
  const safeCaption = cleanText(caption || '', 500, { keepNewlines: true });
  if (!safeName) throw new Error('Nom invalide.');
  const safeSubmissionType = (submissionType === 'image' || submissionType === 'video') ? submissionType : null;

  const contestRef = db.collection('contests').doc(contestId);
  const buyerRef = db.collection('users').doc(uid);
  const entryRef = db.collection('contest_entries').doc(`${contestId}_${uid}`);

  const result = await db.runTransaction(async (transaction) => {
    const [contestSnap, buyerSnap, entrySnap] = await Promise.all([
      transaction.get(contestRef),
      transaction.get(buyerRef),
      transaction.get(entryRef)
    ]);

    if (!contestSnap.exists) throw new Error("Ce concours n'existe plus.");
    const contest = contestSnap.data();

    if (contest.type !== 'paid') throw new Error('Ce concours est gratuit, aucun paiement nécessaire.');
    if (computeContestStatus(contest) !== 'active') throw new Error("Ce concours n'accepte plus de participations pour le moment.");
    if (entrySnap.exists) throw new Error('Tu as déjà participé à ce concours.');

    const entryFee = contest.entryFee || 0;
    if (entryFee <= 0) throw new Error('Frais de participation invalides pour ce concours.');

    if (!buyerSnap.exists) throw new Error('Compte introuvable.');
    const buyerBalance = buyerSnap.data().balance || 0;
    if (buyerBalance < entryFee) throw new Error('Solde insuffisant. Recharge ton portefeuille pour participer.');

    const organizerUid = contest.organizerUid || ADMIN_UID;
    const adminRef = db.collection('users').doc(ADMIN_UID);

    // ---- PHASE LECTURE : tout le reste doit etre lu ICI, avant la
    // moindre ecriture (Firestore l'exige dans une transaction). ----
    let organizerRef = null, organizerSnap = null;
    if (organizerUid !== ADMIN_UID) {
      organizerRef = db.collection('users').doc(organizerUid);
      organizerSnap = await transaction.get(organizerRef);
    }
    // uid !== ADMIN_UID : evite de lire/ecrire deux fois le meme document
    // quand c'est l'admin lui-meme qui participe (aucune commission a se
    // payer a soi-meme).
    const adminSnap = uid !== ADMIN_UID ? await transaction.get(adminRef) : null;

    // ---- CALCULS ----
    const newBuyerBalance = Math.round((buyerBalance - entryFee) * 100) / 100;
    let organizerPayout = 0;
    let adminCommission = 0;
    if (organizerUid !== ADMIN_UID) {
      if (organizerSnap.exists) {
        organizerPayout = Math.round(entryFee * (1 - CONTEST_COMMISSION_PERCENT / 100) * 100) / 100;
        adminCommission = Math.round((entryFee - organizerPayout) * 100) / 100;
      }
    } else {
      adminCommission = entryFee;
    }

    // ---- PHASE ECRITURE ----
    transaction.update(buyerRef, { balance: newBuyerBalance });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'contest_entry', amount: -entryFee, balanceAfter: newBuyerBalance,
      description: `Participation à "${contest.title}"`, relatedId: contestId
    }));

    if (organizerUid !== ADMIN_UID && organizerSnap.exists) {
      const organizerBalance = organizerSnap.data().balance || 0;
      const newOrganizerBalance = Math.round((organizerBalance + organizerPayout) * 100) / 100;
      transaction.update(organizerRef, { balance: newOrganizerBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid: organizerUid, type: 'contest_income', amount: organizerPayout, balanceAfter: newOrganizerBalance,
        description: `Participation payante à "${contest.title}"`, relatedId: contestId
      }));
    }

    if (uid !== ADMIN_UID && adminCommission > 0 && adminSnap && adminSnap.exists) {
      const adminBalance = adminSnap.data().balance || 0;
      const newAdminBalance = Math.round((adminBalance + adminCommission) * 100) / 100;
      transaction.update(adminRef, { balance: newAdminBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid: ADMIN_UID,
        type: organizerUid === ADMIN_UID ? 'contest_income' : 'commission_income',
        amount: adminCommission, balanceAfter: newAdminBalance,
        description: organizerUid === ADMIN_UID ? `Participation payante à "${contest.title}"` : `Commission — "${contest.title}"`,
        relatedId: contestId
      }));
    }

    transaction.set(entryRef, {
      contestId, uid, name: safeName, submissionUrl, submissionType: safeSubmissionType, caption: safeCaption,
      votesCount: 0, paid: true, amountPaid: entryFee,
      createdAt: new Date().toISOString()
    });

    transaction.set(db.collection('notifications').doc(), {
      uid,
      title: 'Participation confirmée ✅',
      body: `Ta participation à "${contest.title}" est confirmée (${entryFee.toFixed(2)}$).`,
      type: 'contest_entry', read: false, createdAt: new Date().toISOString()
    });

    if (organizerUid !== ADMIN_UID && organizerPayout > 0) {
      transaction.set(db.collection('notifications').doc(), {
        uid: organizerUid,
        title: 'Nouvelle participation payante 🎉',
        body: `Quelqu'un a rejoint "${contest.title}" (+${organizerPayout.toFixed(2)}$ sur ton solde).`,
        type: 'contest_income', read: false, createdAt: new Date().toISOString()
      });
    }

    return { newBalance: newBuyerBalance, contestTitle: contest.title, entryFee, organizerUid, organizerPayout };
  });

  await sendPushNotification(uid, 'Participation confirmée ✅', `"${result.contestTitle}" — ${result.entryFee.toFixed(2)}$ payés.`);
  if (result.organizerUid !== ADMIN_UID && result.organizerPayout > 0) {
    await sendPushNotification(result.organizerUid, 'Nouvelle participation payante 🎉', `+${result.organizerPayout.toFixed(2)}$ sur ton solde.`);
  }

  return { success: true, newBalance: result.newBalance };
}

/* ================= EVENEMENTS & BILLETTERIE =================
   Toutes les reservations/annulations passent par le serveur, meme pour
   les evenements GRATUITS : incrementer "quantitySold" depuis le telephone
   d'un client permettrait une survente (deux personnes reservant la
   derniere place en meme temps) ou une manipulation du nombre de places
   restantes. La transaction Firestore rend ca impossible. */

async function reserveEventTicket(uid, body) {
  const { eventId, ticketTypeId, quantity } = body;

  if (!eventId || !ticketTypeId) {
    throw new Error('eventId et ticketTypeId sont requis.');
  }
  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1 || qty > 20) {
    throw new Error('Quantité de billets invalide (maximum 20 par réservation).');
  }

  const eventRef = db.collection('events').doc(eventId);
  const buyerRef = db.collection('users').doc(uid);
  const ticketRef = db.collection('event_tickets').doc();

  const result = await db.runTransaction(async (transaction) => {
    const [eventSnap, buyerSnap] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(buyerRef)
    ]);

    if (!eventSnap.exists) throw new Error("Cet événement n'existe plus.");
    const event = eventSnap.data();

    if (event.status !== 'active') throw new Error("Cet événement n'accepte plus de réservations.");
    const endCheck = new Date(event.endDate || event.startDate).getTime();
    if (endCheck < Date.now()) throw new Error('Cet événement est déjà terminé.');

    const ticketTypes = event.ticketTypes || [];
    const typeIndex = ticketTypes.findIndex(t => t.id === ticketTypeId);
    if (typeIndex === -1) throw new Error("Ce type de billet n'existe plus.");
    const ticketType = ticketTypes[typeIndex];

    const left = (ticketType.quantityTotal || 0) - (ticketType.quantitySold || 0);
    if (qty > left) throw new Error(`Il ne reste que ${left} place(s) pour ce billet.`);

    if (!buyerSnap.exists) throw new Error('Compte introuvable.');
    const buyerBalance = buyerSnap.data().balance || 0;

    const unitPrice = ticketType.price || 0;
    const amountPaid = Math.round(unitPrice * qty * 100) / 100;

    let newBuyerBalance = buyerBalance;
    const organizerUid = event.ownerUid;
    let organizerPayout = 0;
    let adminCommission = 0;

    // ---- PHASE LECTURE (avant toute ecriture) ----
    const adminRef = db.collection('users').doc(ADMIN_UID);
    let organizerRef = null, organizerSnap = null, adminSnap = null;
    if (amountPaid > 0) {
      if (buyerBalance < amountPaid) throw new Error('Solde insuffisant. Recharge ton portefeuille pour réserver.');
      if (organizerUid && organizerUid !== ADMIN_UID) {
        organizerRef = db.collection('users').doc(organizerUid);
        organizerSnap = await transaction.get(organizerRef);
      }
      if (uid !== ADMIN_UID) {
        adminSnap = await transaction.get(adminRef);
      }
    }

    // ---- CALCULS ----
    if (amountPaid > 0) {
      newBuyerBalance = Math.round((buyerBalance - amountPaid) * 100) / 100;
      if (organizerUid && organizerUid !== ADMIN_UID) {
        if (organizerSnap.exists) {
          organizerPayout = Math.round(amountPaid * (1 - EVENT_COMMISSION_PERCENT / 100) * 100) / 100;
          adminCommission = Math.round((amountPaid - organizerPayout) * 100) / 100;
        }
      } else {
        adminCommission = amountPaid;
      }
    }

    // ---- PHASE ECRITURE ----
    if (amountPaid > 0) {
      transaction.update(buyerRef, { balance: newBuyerBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid, type: 'event_ticket', amount: -amountPaid, balanceAfter: newBuyerBalance,
        description: `${qty} × "${ticketType.name || 'Billet'}" pour "${event.title || 'un événement'}"`, relatedId: eventId
      }));

      if (organizerUid && organizerUid !== ADMIN_UID && organizerSnap.exists) {
        const organizerBalance = organizerSnap.data().balance || 0;
        const newOrganizerBalance = Math.round((organizerBalance + organizerPayout) * 100) / 100;
        transaction.update(organizerRef, { balance: newOrganizerBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: organizerUid, type: 'event_income', amount: organizerPayout, balanceAfter: newOrganizerBalance,
          description: `Réservation payante pour "${event.title || 'ton événement'}"`, relatedId: eventId
        }));
      }

      if (uid !== ADMIN_UID && adminCommission > 0 && adminSnap && adminSnap.exists) {
        const adminBalance = adminSnap.data().balance || 0;
        const newAdminBalance = Math.round((adminBalance + adminCommission) * 100) / 100;
        transaction.update(adminRef, { balance: newAdminBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: ADMIN_UID,
          type: (!organizerUid || organizerUid === ADMIN_UID) ? 'event_income' : 'commission_income',
          amount: adminCommission, balanceAfter: newAdminBalance,
          description: (!organizerUid || organizerUid === ADMIN_UID) ? `Réservation payante pour "${event.title || 'un événement'}"` : `Commission — "${event.title || 'un événement'}"`,
          relatedId: eventId
        }));
      }
    }

    const updatedTicketTypes = ticketTypes.slice();
    updatedTicketTypes[typeIndex] = { ...ticketType, quantitySold: (ticketType.quantitySold || 0) + qty };
    transaction.update(eventRef, { ticketTypes: updatedTicketTypes });

    transaction.set(ticketRef, {
      eventId, eventTitle: event.title || '', eventStartDate: event.startDate || null,
      ticketTypeId, ticketTypeName: ticketType.name || 'Billet',
      buyerUid: uid, buyerName: buyerSnap.data().name || 'Utilisateur',
      organizerUid: organizerUid || null,
      quantity: qty, unitPrice, amountPaid,
      status: 'confirmed', createdAt: new Date().toISOString()
    });

    transaction.set(db.collection('notifications').doc(), {
      uid,
      title: 'Réservation confirmée 🎟️',
      body: `${qty} × "${ticketType.name || 'Billet'}" pour "${event.title || 'un événement'}"${amountPaid > 0 ? ` — ${amountPaid.toFixed(2)}$ payés` : ' (gratuit)'}.`,
      type: 'event_ticket', read: false, url: '/?open=' + eventId, createdAt: new Date().toISOString()
    });

    if (organizerUid) {
      transaction.set(db.collection('notifications').doc(), {
        uid: organizerUid,
        title: 'Nouvelle réservation 🎉',
        body: `Quelqu'un a réservé ${qty} × "${ticketType.name || 'Billet'}" pour "${event.title || 'ton événement'}"${organizerPayout > 0 ? ` (+${organizerPayout.toFixed(2)}$ sur ton solde)` : ''}.`,
        type: 'event_booking', read: false, url: '/?open=' + eventId, createdAt: new Date().toISOString()
      });
    }

    return { newBalance: newBuyerBalance, organizerUid, organizerPayout, eventTitle: event.title, amountPaid };
  });

  await sendPushNotification(uid, 'Réservation confirmée 🎟️', `"${result.eventTitle}" — réservation confirmée.`);
  if (result.organizerUid && result.organizerUid !== ADMIN_UID && result.organizerPayout > 0) {
    await sendPushNotification(result.organizerUid, 'Nouvelle réservation 🎉', `+${result.organizerPayout.toFixed(2)}$ sur ton solde.`);
  }

  return { success: true, newBalance: result.amountPaid > 0 ? result.newBalance : undefined };
}

async function cancelEventTicket(uid, body) {
  const { ticketId } = body;
  if (!ticketId) throw new Error('ticketId est requis.');

  const ticketRef = db.collection('event_tickets').doc(ticketId);

  const result = await db.runTransaction(async (transaction) => {
    const ticketSnap = await transaction.get(ticketRef);
    if (!ticketSnap.exists) throw new Error('Réservation introuvable.');
    const ticket = ticketSnap.data();

    if (ticket.buyerUid !== uid) throw new Error("Tu n'as pas la permission d'annuler cette réservation.");
    if (ticket.status === 'cancelled') throw new Error('Cette réservation est déjà annulée.');
    if (ticket.eventStartDate && new Date(ticket.eventStartDate).getTime() < Date.now()) {
      throw new Error("Impossible d'annuler une réservation pour un événement déjà commencé.");
    }

    const eventRef = db.collection('events').doc(ticket.eventId);
    const amountPaid = ticket.amountPaid || 0;

    // ---- PHASE LECTURE (tout AVANT la moindre ecriture) ----
    const eventSnap = await transaction.get(eventRef);
    const adminRef = db.collection('users').doc(ADMIN_UID);
    let buyerRef = null, buyerSnap = null;
    let organizerRef = null, organizerSnap = null;
    let adminSnap = null;
    if (amountPaid > 0) {
      buyerRef = db.collection('users').doc(uid);
      buyerSnap = await transaction.get(buyerRef);
      if (ticket.organizerUid && ticket.organizerUid !== ADMIN_UID) {
        organizerRef = db.collection('users').doc(ticket.organizerUid);
        organizerSnap = await transaction.get(organizerRef);
      }
      if (uid !== ADMIN_UID) {
        adminSnap = await transaction.get(adminRef);
      }
    }

    // ---- PHASE ECRITURE ----
    if (eventSnap.exists) {
      const event = eventSnap.data();
      const ticketTypes = (event.ticketTypes || []).slice();
      const typeIndex = ticketTypes.findIndex(t => t.id === ticket.ticketTypeId);
      if (typeIndex !== -1) {
        ticketTypes[typeIndex] = {
          ...ticketTypes[typeIndex],
          quantitySold: Math.max(0, (ticketTypes[typeIndex].quantitySold || 0) - (ticket.quantity || 1))
        };
        transaction.update(eventRef, { ticketTypes });
      }
    }

    let newBuyerBalance;
    if (amountPaid > 0) {
      const buyerBalance = buyerSnap.exists ? (buyerSnap.data().balance || 0) : 0;
      newBuyerBalance = Math.round((buyerBalance + amountPaid) * 100) / 100;
      transaction.update(buyerRef, { balance: newBuyerBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid, type: 'event_cancel_refund', amount: amountPaid, balanceAfter: newBuyerBalance,
        description: `Remboursement — "${ticket.eventTitle || 'un événement'}"`, relatedId: ticket.eventId
      }));

      let organizerPayout = 0;
      let adminCommission = 0;
      if (ticket.organizerUid && ticket.organizerUid !== ADMIN_UID) {
        organizerPayout = Math.round(amountPaid * (1 - EVENT_COMMISSION_PERCENT / 100) * 100) / 100;
        adminCommission = Math.round((amountPaid - organizerPayout) * 100) / 100;
        if (organizerSnap.exists) {
          const organizerBalance = organizerSnap.data().balance || 0;
          const newOrganizerBalance = Math.round((organizerBalance - organizerPayout) * 100) / 100;
          transaction.update(organizerRef, { balance: newOrganizerBalance });
          transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
            uid: ticket.organizerUid, type: 'event_income_reversed', amount: -organizerPayout, balanceAfter: newOrganizerBalance,
            description: `Billet annulé — "${ticket.eventTitle || 'un événement'}"`, relatedId: ticket.eventId
          }));
        }
      } else {
        adminCommission = amountPaid;
      }

      if (uid !== ADMIN_UID && adminCommission > 0 && adminSnap && adminSnap.exists) {
        const adminBalance = adminSnap.data().balance || 0;
        const newAdminBalance = Math.round((adminBalance - adminCommission) * 100) / 100;
        transaction.update(adminRef, { balance: newAdminBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: ADMIN_UID, type: 'event_income_reversed', amount: -adminCommission, balanceAfter: newAdminBalance,
          description: `Billet annulé — "${ticket.eventTitle || 'un événement'}"`, relatedId: ticket.eventId
        }));
      }
    }

    transaction.update(ticketRef, { status: 'cancelled' });

    transaction.set(db.collection('notifications').doc(), {
      uid,
      title: 'Réservation annulée',
      body: `Ta réservation pour "${ticket.eventTitle || 'un événement'}" a été annulée${amountPaid > 0 ? ` et remboursée (${amountPaid.toFixed(2)}$)` : ''}.`,
      type: 'event_ticket_cancel', read: false, createdAt: new Date().toISOString()
    });

    return { newBalance: newBuyerBalance, amountPaid };
  });

  return { success: true, newBalance: result.amountPaid > 0 ? result.newBalance : undefined };
}

/* ================= COEURNOH ACADEMY (cours payants) =================
   Meme logique que les billets d'evenements payants : deduit le solde de
   l'etudiant, credite le formateur (moins commission), et cree
   l'inscription -- le tout dans une seule transaction Firestore pour
   empecher une double inscription ou un solde incoherent. */

async function enrollPaidCourse(uid, body) {
  const { courseId } = body;
  if (!courseId) throw new Error('courseId est requis.');

  const courseRef = db.collection('courses').doc(courseId);
  const studentRef = db.collection('users').doc(uid);
  const enrollRef = db.collection('course_enrollments').doc(`${courseId}_${uid}`);

  const result = await db.runTransaction(async (transaction) => {
    const [courseSnap, studentSnap, enrollSnap] = await Promise.all([
      transaction.get(courseRef),
      transaction.get(studentRef),
      transaction.get(enrollRef)
    ]);

    if (!courseSnap.exists) throw new Error("Ce cours n'existe plus.");
    const course = courseSnap.data();

    if (course.status !== 'active') throw new Error("Ce cours n'accepte plus d'inscriptions.");
    if (enrollSnap.exists) throw new Error('Tu es déjà inscrit(e) à ce cours.');

    const price = course.price || 0;
    if (price <= 0) throw new Error('Ce cours est gratuit, aucun paiement nécessaire.');

    if (!studentSnap.exists) throw new Error('Compte introuvable.');
    const studentBalance = studentSnap.data().balance || 0;
    if (studentBalance < price) throw new Error('Solde insuffisant. Recharge ton portefeuille pour t\'inscrire.');

    const ownerUid = course.ownerUid;
    const adminRef = db.collection('users').doc(ADMIN_UID);

    // ---- PHASE LECTURE (avant toute ecriture) ----
    let ownerRef = null, ownerSnap = null;
    if (ownerUid && ownerUid !== ADMIN_UID) {
      ownerRef = db.collection('users').doc(ownerUid);
      ownerSnap = await transaction.get(ownerRef);
    }
    const adminSnap = uid !== ADMIN_UID ? await transaction.get(adminRef) : null;

    // ---- CALCULS ----
    const newStudentBalance = Math.round((studentBalance - price) * 100) / 100;
    let ownerPayout = 0;
    let adminCommission = 0;
    if (ownerUid && ownerUid !== ADMIN_UID) {
      if (ownerSnap.exists) {
        ownerPayout = Math.round(price * (1 - COURSE_COMMISSION_PERCENT / 100) * 100) / 100;
        adminCommission = Math.round((price - ownerPayout) * 100) / 100;
      }
    } else {
      adminCommission = price;
    }

    // ---- PHASE ECRITURE ----
    transaction.update(studentRef, { balance: newStudentBalance });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'course_enrollment', amount: -price, balanceAfter: newStudentBalance,
      description: `Inscription à "${course.title}"`, relatedId: courseId
    }));

    if (ownerUid && ownerUid !== ADMIN_UID && ownerSnap.exists) {
      const ownerBalance = ownerSnap.data().balance || 0;
      const newOwnerBalance = Math.round((ownerBalance + ownerPayout) * 100) / 100;
      transaction.update(ownerRef, { balance: newOwnerBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid: ownerUid, type: 'course_income', amount: ownerPayout, balanceAfter: newOwnerBalance,
        description: `Nouvel étudiant — "${course.title}"`, relatedId: courseId
      }));
    }

    if (uid !== ADMIN_UID && adminCommission > 0 && adminSnap && adminSnap.exists) {
      const adminBalance = adminSnap.data().balance || 0;
      const newAdminBalance = Math.round((adminBalance + adminCommission) * 100) / 100;
      transaction.update(adminRef, { balance: newAdminBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid: ADMIN_UID,
        type: (!ownerUid || ownerUid === ADMIN_UID) ? 'course_income' : 'commission_income',
        amount: adminCommission, balanceAfter: newAdminBalance,
        description: (!ownerUid || ownerUid === ADMIN_UID) ? `Nouvel étudiant — "${course.title}"` : `Commission — "${course.title}"`,
        relatedId: courseId
      }));
    }

    transaction.update(courseRef, {
      studentsCount: admin.firestore.FieldValue.increment(1)
    });

    transaction.set(enrollRef, {
      courseId, courseTitle: course.title || '', courseOwnerUid: ownerUid,
      studentUid: uid, studentName: studentSnap.data().name || 'Utilisateur',
      completedChapters: [], amountPaid: price, createdAt: new Date().toISOString()
    });

    transaction.set(db.collection('notifications').doc(), {
      uid,
      title: 'Inscription confirmée 📚',
      body: `Ton inscription à "${course.title}" est confirmée (${price.toFixed(2)}$).`,
      type: 'course_enrollment', read: false, url: '/?open=' + courseId, createdAt: new Date().toISOString()
    });

    if (ownerUid && ownerUid !== ADMIN_UID && ownerPayout > 0) {
      transaction.set(db.collection('notifications').doc(), {
        uid: ownerUid,
        title: 'Nouvel étudiant payant 🎉',
        body: `Quelqu'un s'est inscrit à "${course.title}" (+${ownerPayout.toFixed(2)}$ sur ton solde).`,
        type: 'course_income', read: false, url: '/?open=' + courseId, createdAt: new Date().toISOString()
      });
    }

    return { newBalance: newStudentBalance, courseTitle: course.title, price, ownerUid, ownerPayout };
  });

  await sendPushNotification(uid, 'Inscription confirmée 📚', `"${result.courseTitle}" — ${result.price.toFixed(2)}$ payés.`);
  if (result.ownerUid && result.ownerUid !== ADMIN_UID && result.ownerPayout > 0) {
    await sendPushNotification(result.ownerUid, 'Nouvel étudiant payant 🎉', `+${result.ownerPayout.toFixed(2)}$ sur ton solde.`);
  }

  return { success: true, newBalance: result.newBalance };
}

/* ================= CREE TON SITE — PREMIUM =================
   Debite le solde du proprietaire du site (comme payContestEntry) et
   credite la plateforme (ADMIN_UID), pas d'"organisateur" ici puisque
   c'est un achat pour soi-meme. Prolonge "premiumUntil" a partir
   d'AUJOURD'HUI ou de la date d'expiration actuelle si elle est encore
   dans le futur (renouvellement anticipe = jours ajoutes, pas perdus). */

async function purchaseSitePremium(uid, body) {
  const siteRef = db.collection('mini_sites').doc(uid);
  const buyerRef = db.collection('users').doc(uid);
  const adminRef = db.collection('users').doc(ADMIN_UID);

  const result = await db.runTransaction(async (transaction) => {
    // ---- PHASE LECTURE (tout AVANT la moindre ecriture) ----
    const [siteSnap, buyerSnap] = await Promise.all([
      transaction.get(siteRef),
      transaction.get(buyerRef)
    ]);
    const adminSnap = uid !== ADMIN_UID ? await transaction.get(adminRef) : null;

    if (!siteSnap.exists) throw new Error("Crée d'abord ton site avant d'activer le Premium.");
    if (!buyerSnap.exists) throw new Error('Compte introuvable.');

    const buyerBalance = buyerSnap.data().balance || 0;
    if (buyerBalance < SITE_PREMIUM_PRICE) {
      throw new Error('Solde insuffisant. Recharge ton portefeuille pour activer le Premium.');
    }

    const site = siteSnap.data();
    const now = Date.now();
    const base = (site.premium && site.premiumUntil && new Date(site.premiumUntil).getTime() > now)
      ? new Date(site.premiumUntil).getTime()
      : now;
    const newPremiumUntil = new Date(base + SITE_PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // ---- PHASE ECRITURE ----
    const newBuyerBalance = Math.round((buyerBalance - SITE_PREMIUM_PRICE) * 100) / 100;
    transaction.update(buyerRef, { balance: newBuyerBalance });
    transaction.update(siteRef, { premium: true, premiumUntil: newPremiumUntil });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'site_premium', amount: -SITE_PREMIUM_PRICE, balanceAfter: newBuyerBalance,
      description: 'Activation Site Premium (30 jours)', relatedId: null
    }));

    if (uid !== ADMIN_UID && adminSnap && adminSnap.exists) {
      const adminBalance = adminSnap.data().balance || 0;
      const newAdminBalance = Math.round((adminBalance + SITE_PREMIUM_PRICE) * 100) / 100;
      transaction.update(adminRef, { balance: newAdminBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid: ADMIN_UID, type: 'site_premium_income', amount: SITE_PREMIUM_PRICE, balanceAfter: newAdminBalance,
        description: 'Vente Site Premium', relatedId: uid
      }));
    }

    transaction.set(db.collection('notifications').doc(), {
      uid,
      title: 'Site Premium activé ✨',
      body: `Ton site est en Premium jusqu'au ${new Date(newPremiumUntil).toLocaleDateString('fr-FR')}.`,
      type: 'site_premium', read: false, createdAt: new Date().toISOString()
    });

    return { newBalance: newBuyerBalance, premiumUntil: newPremiumUntil };
  });

  await sendPushNotification(uid, 'Site Premium activé ✨', `Valable jusqu'au ${new Date(result.premiumUntil).toLocaleDateString('fr-FR')}.`);

  return { success: true, newBalance: result.newBalance, premiumUntil: result.premiumUntil };
}

/* ================= COEURNOH BUSINESS — PRO =================
   Exactement le meme mecanisme que purchaseSitePremium ci-dessus. */

async function purchaseBusinessPro(uid, body) {
  const bizRef = db.collection('businesses').doc(uid);
  const buyerRef = db.collection('users').doc(uid);
  const adminRef = db.collection('users').doc(ADMIN_UID);

  const result = await db.runTransaction(async (transaction) => {
    // ---- PHASE LECTURE (tout AVANT la moindre ecriture) ----
    const [bizSnap, buyerSnap] = await Promise.all([
      transaction.get(bizRef),
      transaction.get(buyerRef)
    ]);
    const adminSnap = uid !== ADMIN_UID ? await transaction.get(adminRef) : null;

    if (!bizSnap.exists) throw new Error("Crée d'abord ta page entreprise avant d'activer le Pro.");
    if (!buyerSnap.exists) throw new Error('Compte introuvable.');

    const buyerBalance = buyerSnap.data().balance || 0;
    if (buyerBalance < BUSINESS_PRO_PRICE) {
      throw new Error('Solde insuffisant. Recharge ton portefeuille pour activer le Pro.');
    }

    const biz = bizSnap.data();
    const now = Date.now();
    const base = (biz.pro && biz.proUntil && new Date(biz.proUntil).getTime() > now)
      ? new Date(biz.proUntil).getTime()
      : now;
    const newProUntil = new Date(base + BUSINESS_PRO_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // ---- PHASE ECRITURE ----
    const newBuyerBalance = Math.round((buyerBalance - BUSINESS_PRO_PRICE) * 100) / 100;
    transaction.update(buyerRef, { balance: newBuyerBalance });
    transaction.update(bizRef, { pro: true, proUntil: newProUntil });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'business_pro', amount: -BUSINESS_PRO_PRICE, balanceAfter: newBuyerBalance,
      description: 'Activation CoeurNoh Business Pro (30 jours)', relatedId: null
    }));

    if (uid !== ADMIN_UID && adminSnap && adminSnap.exists) {
      const adminBalance = adminSnap.data().balance || 0;
      const newAdminBalance = Math.round((adminBalance + BUSINESS_PRO_PRICE) * 100) / 100;
      transaction.update(adminRef, { balance: newAdminBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid: ADMIN_UID, type: 'business_pro_income', amount: BUSINESS_PRO_PRICE, balanceAfter: newAdminBalance,
        description: 'Vente CoeurNoh Business Pro', relatedId: uid
      }));
    }

    return { newBalance: newBuyerBalance, proUntil: newProUntil };
  });

  await sendPushNotification(uid, 'CoeurNoh Business Pro activé ✨', `Valable jusqu'au ${new Date(result.proUntil).toLocaleDateString('fr-FR')}.`);

  return { success: true, newBalance: result.newBalance, proUntil: result.proUntil };
}

/* ================= CAMPAGNES PUBLICITAIRES COEURNOH BUSINESS =================
   3 types, tous payes une seule fois depuis le portefeuille interne :
   - "boost"  : mise en avant prioritaire dans "Trouver une entreprise" (3
     ou 7 jours) -- pose businesses/{uid}.boostedUntil, lu par le client
     pour trier la liste.
   - "banner" : banniere visible par TOUS les utilisateurs en haut du fil
     d'accueil (3 ou 7 jours) -- creee automatiquement sans validation
     admin prealable (comme le reste de l'app), mais l'admin peut la
     desactiver apres coup (regles Firestore : allow update: if isAdmin()).
   - "promo"  : message envoye une fois aux ABONNES de la page (collection
     follows) -- PAS aux "clients" du mini-CRM (business_clients), qui ne
     sont que des fiches contact (nom/telephone) saisies a la main par le
     professionnel, sans compte utilisateur ni jeton d'appareil : il n'y a
     techniquement rien a notifier automatiquement pour eux. */

const CAMPAIGN_PRICES = { boost_3: 3, boost_7: 7, banner_3: 10, banner_7: 20, promo: 2 };
const CAMPAIGN_MAX_RECIPIENTS = 300; // plafond de securite/cout pour un envoi en masse

async function purchaseBusinessCampaign(uid, body) {
  const type = body.type;
  if (!['boost', 'banner', 'promo'].includes(type)) {
    throw new Error('Type de campagne invalide.');
  }
  let durationDays = null;
  let priceKey = type;
  if (type === 'boost' || type === 'banner') {
    durationDays = parseInt(body.durationDays, 10);
    if (durationDays !== 3 && durationDays !== 7) throw new Error('Durée invalide (3 ou 7 jours).');
    priceKey = `${type}_${durationDays}`;
  }
  const price = CAMPAIGN_PRICES[priceKey];
  if (!price) throw new Error('Campagne invalide.');

  let bannerText = null, bannerImage = null, promoMessage = null;
  if (type === 'banner') {
    bannerText = (body.bannerText || '').toString().trim().slice(0, 140);
    if (!bannerText) throw new Error('Le texte de la bannière est requis.');
    bannerImage = body.bannerImage ? String(body.bannerImage).slice(0, 500) : null;
  }
  if (type === 'promo') {
    promoMessage = (body.promoMessage || '').toString().trim().slice(0, 200);
    if (!promoMessage) throw new Error('Le message de la promo est requis.');
  }

  const bizRef = db.collection('businesses').doc(uid);
  const buyerRef = db.collection('users').doc(uid);
  const adminRef = db.collection('users').doc(ADMIN_UID);
  const campaignRef = db.collection('business_campaigns').doc();

  const result = await db.runTransaction(async (transaction) => {
    const [bizSnap, buyerSnap] = await Promise.all([transaction.get(bizRef), transaction.get(buyerRef)]);
    const adminSnap = uid !== ADMIN_UID ? await transaction.get(adminRef) : null;

    if (!bizSnap.exists) throw new Error("Crée d'abord ta page entreprise avant de lancer une campagne.");
    if (!buyerSnap.exists) throw new Error('Compte introuvable.');

    const buyerBalance = buyerSnap.data().balance || 0;
    if (buyerBalance < price) {
      throw new Error('Solde insuffisant. Recharge ton portefeuille pour lancer cette campagne.');
    }

    const biz = bizSnap.data();
    const now = Date.now();
    const expiresAt = durationDays ? new Date(now + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const newBuyerBalance = Math.round((buyerBalance - price) * 100) / 100;
    transaction.update(buyerRef, { balance: newBuyerBalance });
    transaction.set(campaignRef, {
      ownerUid: uid,
      businessName: biz.businessName || 'Entreprise',
      logoUrl: biz.logoUrl || null,
      type, price, durationDays: durationDays || null,
      bannerText, bannerImage, promoMessage,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt
    });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'business_campaign', amount: -price, balanceAfter: newBuyerBalance,
      description: `Campagne CoeurNoh Business (${type})`, relatedId: campaignRef.id
    }));

    if (type === 'boost') {
      // Prolonge a partir de la plus tardive des deux si une mise en avant
      // est deja active -- jamais raccourcie par un nouvel achat.
      const currentEnd = (biz.boostedUntil && new Date(biz.boostedUntil).getTime() > now) ? new Date(biz.boostedUntil).getTime() : now;
      const newBoostedUntil = new Date(currentEnd + durationDays * 24 * 60 * 60 * 1000).toISOString();
      transaction.update(bizRef, { boostedUntil: newBoostedUntil });
    }

    if (uid !== ADMIN_UID && adminSnap && adminSnap.exists) {
      const adminBalance = adminSnap.data().balance || 0;
      const newAdminBalance = Math.round((adminBalance + price) * 100) / 100;
      transaction.update(adminRef, { balance: newAdminBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid: ADMIN_UID, type: 'business_campaign_income', amount: price, balanceAfter: newAdminBalance,
        description: 'Vente campagne CoeurNoh Business', relatedId: uid
      }));
    }

    return { newBalance: newBuyerBalance, campaignId: campaignRef.id, businessName: biz.businessName };
  });

  let promoSentCount = 0;
  if (type === 'promo') {
    promoSentCount = await sendBusinessPromoBlast(uid, result.businessName, promoMessage).catch((e) => {
      console.log('[campagne promo] envoi echoue :', e.message);
      return 0;
    });
  }

  return { success: true, newBalance: result.newBalance, campaignId: result.campaignId, promoSentCount };
}

// Ecrit une notification Firestore + envoie un push a chaque ABONNE de la
// page (collection follows), par lots de 450 (limite Firestore : 500
// operations par batch) et par lots de 500 jetons FCM (limite Google pour
// un envoi multicast). Retourne le nombre de destinataires touches.
async function sendBusinessPromoBlast(ownerUid, businessName, message) {
  const followsSnap = await db.collection('follows')
    .where('followedUid', '==', ownerUid)
    .limit(CAMPAIGN_MAX_RECIPIENTS)
    .get();
  const followerUids = [...new Set(followsSnap.docs.map(d => d.data().followerUid).filter(Boolean))];
  if (followerUids.length === 0) return 0;

  const userSnaps = await db.getAll(...followerUids.map(u => db.collection('users').doc(u)));
  const allTokens = [];
  const notifBatchWrites = [];
  userSnaps.forEach((snap, idx) => {
    if (!snap.exists) return;
    const u = snap.data();
    const prefs = u.notifPrefs || {};
    if (prefs.content === false) return; // categorie "contenu" desactivee par la personne
    notifBatchWrites.push({
      uid: followerUids[idx],
      title: `${businessName} a une promo pour toi 🎉`,
      body: message
    });
    if (prefs.push !== false) {
      if (Array.isArray(u.fcmTokens)) allTokens.push(...u.fcmTokens);
      if (u.fcmToken && !allTokens.includes(u.fcmToken)) allTokens.push(u.fcmToken);
    }
  });

  // Notifications Firestore (visibles dans le panneau de l'app), par lots
  for (let i = 0; i < notifBatchWrites.length; i += 450) {
    const chunk = notifBatchWrites.slice(i, i + 450);
    const batch = db.batch();
    chunk.forEach((n) => {
      batch.set(db.collection('notifications').doc(), {
        uid: n.uid, title: n.title, body: n.body, category: 'content',
        read: false, createdAt: new Date().toISOString()
      });
    });
    await batch.commit();
  }

  // Push, par lots de 500 jetons (limite Firebase Cloud Messaging)
  for (let i = 0; i < allTokens.length; i += 500) {
    const chunk = allTokens.slice(i, i + 500);
    try {
      await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title: `${businessName} a une promo pour toi 🎉`, body: message },
        webpush: { headers: { Urgency: 'high' }, notification: { icon: '/icon-192.png' } },
        android: { priority: 'high' }
      });
    } catch (e) {
      console.log('[campagne promo] envoi push echoue pour un lot :', e.message);
    }
  }

  return notifBatchWrites.length;
}

/* ================= FIDELITE COEURNOH BUSINESS =================
   "business_loyalty/{businessUid}_{clientUid}" : une carte par couple
   entreprise+client, jamais publique (voir regles Firestore). Le
   professionnel definit sa propre regle (seuil + recompense) directement
   sur sa page ("Modifier ma page"). Le client gagne des points de 2
   facons : (1) le professionnel en ajoute manuellement en tapant le code
   du client (son uid, partage via copier-coller/WhatsApp -- pas de
   systeme de recherche par nom a construire, reste simple), ou (2) le
   client utilise un coupon affiche sur la page (bonus fixe, une seule
   fois par coupon). Toujours cote serveur pour eviter qu'un client se
   donne des points lui-meme depuis la console du navigateur. */

const LOYALTY_COUPON_BONUS_POINTS = 10;
const LOYALTY_MAX_MANUAL_POINTS = 1000; // plafond de securite par ajout manuel

async function loyaltyAddPoints(ownerUid, body) {
  const clientUid = (body.clientCode || '').toString().trim();
  const points = parseInt(body.points, 10);
  if (!clientUid) throw new Error('Code client manquant.');
  if (clientUid === ownerUid) throw new Error('Tu ne peux pas ajouter des points à ton propre compte.');
  if (!points || points <= 0 || points > LOYALTY_MAX_MANUAL_POINTS) {
    throw new Error(`Nombre de points invalide (1 à ${LOYALTY_MAX_MANUAL_POINTS}).`);
  }

  const bizRef = db.collection('businesses').doc(ownerUid);
  const clientUserRef = db.collection('users').doc(clientUid);
  const cardRef = db.collection('business_loyalty').doc(`${ownerUid}_${clientUid}`);

  const bizSnap = await bizRef.get();
  if (!bizSnap.exists) throw new Error("Crée d'abord ta page entreprise.");
  if (!bizSnap.data().loyaltyEnabled) throw new Error("Active d'abord le programme de fidélité sur ta page.");

  const clientSnap = await clientUserRef.get();
  if (!clientSnap.exists) throw new Error("Ce code ne correspond à aucun compte CoeurnohBoost.");

  const result = await db.runTransaction(async (transaction) => {
    const cardSnap = await transaction.get(cardRef);
    const currentPoints = cardSnap.exists ? (cardSnap.data().points || 0) : 0;
    const newPoints = currentPoints + points;
    transaction.set(cardRef, {
      businessUid: ownerUid, clientUid,
      businessName: bizSnap.data().businessName || 'Entreprise',
      clientName: clientSnap.data().name || 'Client',
      points: newPoints,
      usedCoupons: cardSnap.exists ? (cardSnap.data().usedCoupons || []) : [],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return newPoints;
  });

  return { success: true, newPoints: result };
}

async function loyaltyUseCoupon(clientUid, body) {
  const businessUid = (body.businessUid || '').toString().trim();
  const couponCode = (body.couponCode || '').toString().trim();
  if (!businessUid || !couponCode) throw new Error('Coupon invalide.');
  if (businessUid === clientUid) throw new Error("Tu ne peux pas utiliser un coupon sur ta propre page.");

  const bizRef = db.collection('businesses').doc(businessUid);
  const clientUserRef = db.collection('users').doc(clientUid);
  const cardRef = db.collection('business_loyalty').doc(`${businessUid}_${clientUid}`);

  const [bizSnap, clientSnap] = await Promise.all([bizRef.get(), clientUserRef.get()]);
  if (!bizSnap.exists) throw new Error("Cette page n'existe plus.");
  const biz = bizSnap.data();
  if (!biz.loyaltyEnabled) throw new Error("Le programme de fidélité n'est pas actif ici.");
  const coupon = (biz.coupons || []).find(c => c.code === couponCode && c.active);
  if (!coupon) throw new Error("Ce coupon n'est plus valide.");

  const result = await db.runTransaction(async (transaction) => {
    const cardSnap = await transaction.get(cardRef);
    const currentPoints = cardSnap.exists ? (cardSnap.data().points || 0) : 0;
    const usedCoupons = cardSnap.exists ? (cardSnap.data().usedCoupons || []) : [];
    if (usedCoupons.includes(couponCode)) {
      throw new Error('Tu as déjà utilisé ce coupon avec ce programme de fidélité.');
    }
    const newPoints = currentPoints + LOYALTY_COUPON_BONUS_POINTS;
    transaction.set(cardRef, {
      businessUid, clientUid,
      businessName: biz.businessName || 'Entreprise',
      clientName: (clientSnap.exists && clientSnap.data().name) || 'Client',
      points: newPoints,
      usedCoupons: [...usedCoupons, couponCode],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return newPoints;
  });

  return { success: true, newPoints: result, bonus: LOYALTY_COUPON_BONUS_POINTS };
}

async function loyaltyClaimReward(clientUid, body) {
  const businessUid = (body.businessUid || '').toString().trim();
  if (!businessUid) throw new Error('Page invalide.');

  const bizRef = db.collection('businesses').doc(businessUid);
  const cardRef = db.collection('business_loyalty').doc(`${businessUid}_${clientUid}`);

  const bizSnap = await bizRef.get();
  if (!bizSnap.exists) throw new Error("Cette page n'existe plus.");
  const biz = bizSnap.data();
  const threshold = biz.loyaltyThreshold || 0;
  if (!biz.loyaltyEnabled || !threshold) throw new Error("Le programme de fidélité n'est pas actif ici.");

  const result = await db.runTransaction(async (transaction) => {
    const cardSnap = await transaction.get(cardRef);
    const currentPoints = cardSnap.exists ? (cardSnap.data().points || 0) : 0;
    if (currentPoints < threshold) throw new Error('Pas encore assez de points pour cette récompense.');
    const newPoints = currentPoints - threshold;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const claims = (cardSnap.data().claims || []).slice(-19); // garde un historique raisonnable
    transaction.set(cardRef, {
      points: newPoints,
      claims: [...claims, { code, reward: biz.loyaltyReward || 'Récompense', claimedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { newPoints, code };
  });

  return { success: true, newPoints: result.newPoints, code: result.code, reward: biz.loyaltyReward || 'Récompense' };
}
