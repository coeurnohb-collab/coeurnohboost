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
//   { idToken, action: 'contest_entry', contestId, name, submissionUrl, caption }
//   { idToken, action: 'event_reserve', eventId, ticketTypeId, quantity }
//   { idToken, action: 'event_cancel', ticketId }
//   { idToken, action: 'course_enroll', courseId }
//   { idToken, action: 'site_premium_purchase' } -- active/renouvelle le Premium
//     de "Crée ton site" (mini_sites/{uid}) pour l'utilisateur connecte

const admin = require('firebase-admin');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');

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

async function sendPushNotification(uid, title, body) {
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const fcmToken = userSnap.exists && userSnap.data().fcmToken;
    if (!fcmToken) return;
    await admin.messaging().send({ token: fcmToken, notification: { title, body } });
  } catch (e) {
    console.log('[push] Envoi echoue :', e.message);
  }
}

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";
const CONTEST_COMMISSION_PERCENT = 15; // CoeurnohBoost garde 15% quand un concours est organise par une entreprise
const EVENT_COMMISSION_PERCENT = 15;   // meme commission plateforme pour les billets payants
const COURSE_COMMISSION_PERCENT = 15;  // meme commission plateforme pour les cours payants
const SITE_PREMIUM_PRICE = 5;          // en $, par mois -- doit rester identique a SITE_PREMIUM_PRICE dans script.js
const SITE_PREMIUM_DURATION_DAYS = 30;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  const { idToken, action } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Connexion requise.' });
  }
  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Session invalide, reconnecte-toi.' });
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
  const { contestId, name, submissionUrl, caption } = body;

  if (!contestId || !name || !submissionUrl) {
    throw new Error('contestId, name et submissionUrl sont requis.');
  }
  if (!submissionUrl.startsWith('http')) {
    throw new Error('Lien de participation invalide.');
  }

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

    const newBuyerBalance = Math.round((buyerBalance - entryFee) * 100) / 100;
    transaction.update(buyerRef, { balance: newBuyerBalance });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'contest_entry', amount: -entryFee, balanceAfter: newBuyerBalance,
      description: `Participation à "${contest.title}"`, relatedId: contestId
    }));

    const organizerUid = contest.organizerUid || ADMIN_UID;
    let organizerPayout = 0;
    if (organizerUid !== ADMIN_UID) {
      const organizerRef = db.collection('users').doc(organizerUid);
      const organizerSnap = await transaction.get(organizerRef);
      if (organizerSnap.exists) {
        organizerPayout = Math.round(entryFee * (1 - CONTEST_COMMISSION_PERCENT / 100) * 100) / 100;
        const organizerBalance = organizerSnap.data().balance || 0;
        const newOrganizerBalance = Math.round((organizerBalance + organizerPayout) * 100) / 100;
        transaction.update(organizerRef, { balance: newOrganizerBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: organizerUid, type: 'contest_income', amount: organizerPayout, balanceAfter: newOrganizerBalance,
          description: `Participation payante à "${contest.title}"`, relatedId: contestId
        }));
      }
    }

    transaction.set(entryRef, {
      contestId, uid, name, submissionUrl, caption: caption || '',
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

    if (amountPaid > 0) {
      if (buyerBalance < amountPaid) throw new Error('Solde insuffisant. Recharge ton portefeuille pour réserver.');
      newBuyerBalance = Math.round((buyerBalance - amountPaid) * 100) / 100;
      transaction.update(buyerRef, { balance: newBuyerBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid, type: 'event_ticket', amount: -amountPaid, balanceAfter: newBuyerBalance,
        description: `${qty} × "${ticketType.name || 'Billet'}" pour "${event.title || 'un événement'}"`, relatedId: eventId
      }));

      if (organizerUid && organizerUid !== ADMIN_UID) {
        const organizerRef = db.collection('users').doc(organizerUid);
        const organizerSnap = await transaction.get(organizerRef);
        if (organizerSnap.exists) {
          organizerPayout = Math.round(amountPaid * (1 - EVENT_COMMISSION_PERCENT / 100) * 100) / 100;
          const organizerBalance = organizerSnap.data().balance || 0;
          const newOrganizerBalance = Math.round((organizerBalance + organizerPayout) * 100) / 100;
          transaction.update(organizerRef, { balance: newOrganizerBalance });
          transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
            uid: organizerUid, type: 'event_income', amount: organizerPayout, balanceAfter: newOrganizerBalance,
            description: `Réservation payante pour "${event.title || 'ton événement'}"`, relatedId: eventId
          }));
        }
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
    const eventSnap = await transaction.get(eventRef);

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
    const amountPaid = ticket.amountPaid || 0;
    if (amountPaid > 0) {
      const buyerRef = db.collection('users').doc(uid);
      const buyerSnap = await transaction.get(buyerRef);
      const buyerBalance = buyerSnap.exists ? (buyerSnap.data().balance || 0) : 0;
      newBuyerBalance = Math.round((buyerBalance + amountPaid) * 100) / 100;
      transaction.update(buyerRef, { balance: newBuyerBalance });
      transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
        uid, type: 'event_cancel_refund', amount: amountPaid, balanceAfter: newBuyerBalance,
        description: `Remboursement — "${ticket.eventTitle || 'un événement'}"`, relatedId: ticket.eventId
      }));

      if (ticket.organizerUid && ticket.organizerUid !== ADMIN_UID) {
        const organizerPayout = Math.round(amountPaid * (1 - EVENT_COMMISSION_PERCENT / 100) * 100) / 100;
        const organizerRef = db.collection('users').doc(ticket.organizerUid);
        const organizerSnap = await transaction.get(organizerRef);
        if (organizerSnap.exists) {
          const organizerBalance = organizerSnap.data().balance || 0;
          const newOrganizerBalance = Math.round((organizerBalance - organizerPayout) * 100) / 100;
          transaction.update(organizerRef, { balance: newOrganizerBalance });
          transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
            uid: ticket.organizerUid, type: 'event_income_reversed', amount: -organizerPayout, balanceAfter: newOrganizerBalance,
            description: `Billet annulé — "${ticket.eventTitle || 'un événement'}"`, relatedId: ticket.eventId
          }));
        }
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

    const newStudentBalance = Math.round((studentBalance - price) * 100) / 100;
    transaction.update(studentRef, { balance: newStudentBalance });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'course_enrollment', amount: -price, balanceAfter: newStudentBalance,
      description: `Inscription à "${course.title}"`, relatedId: courseId
    }));

    const ownerUid = course.ownerUid;
    let ownerPayout = 0;
    if (ownerUid && ownerUid !== ADMIN_UID) {
      const ownerRef = db.collection('users').doc(ownerUid);
      const ownerSnap = await transaction.get(ownerRef);
      if (ownerSnap.exists) {
        ownerPayout = Math.round(price * (1 - COURSE_COMMISSION_PERCENT / 100) * 100) / 100;
        const ownerBalance = ownerSnap.data().balance || 0;
        const newOwnerBalance = Math.round((ownerBalance + ownerPayout) * 100) / 100;
        transaction.update(ownerRef, { balance: newOwnerBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: ownerUid, type: 'course_income', amount: ownerPayout, balanceAfter: newOwnerBalance,
          description: `Nouvel étudiant — "${course.title}"`, relatedId: courseId
        }));
      }
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

  const result = await db.runTransaction(async (transaction) => {
    const [siteSnap, buyerSnap] = await Promise.all([
      transaction.get(siteRef),
      transaction.get(buyerRef)
    ]);

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

    const newBuyerBalance = Math.round((buyerBalance - SITE_PREMIUM_PRICE) * 100) / 100;
    transaction.update(buyerRef, { balance: newBuyerBalance });
    transaction.update(siteRef, { premium: true, premiumUntil: newPremiumUntil });
    transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'site_premium', amount: -SITE_PREMIUM_PRICE, balanceAfter: newBuyerBalance,
      description: 'Activation Site Premium (30 jours)', relatedId: null
    }));

    if (uid !== ADMIN_UID) {
      const adminRef = db.collection('users').doc(ADMIN_UID);
      const adminSnap = await transaction.get(adminRef);
      if (adminSnap.exists) {
        const adminBalance = adminSnap.data().balance || 0;
        const newAdminBalance = Math.round((adminBalance + SITE_PREMIUM_PRICE) * 100) / 100;
        transaction.update(adminRef, { balance: newAdminBalance });
        transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid: ADMIN_UID, type: 'site_premium_income', amount: SITE_PREMIUM_PRICE, balanceAfter: newAdminBalance,
          description: 'Vente Site Premium', relatedId: uid
        }));
      }
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
