// api/event-ticket-action.js
// Gere TOUTES les reservations et annulations de billets d'evenements de
// facon SECURISEE cote serveur -- meme les evenements GRATUITS. Pourquoi
// meme pour du gratuit : incrementer "quantitySold" depuis le telephone
// d'un client permettrait a deux personnes de reserver la derniere place
// en meme temps (survente), ou a quelqu'un de trafiquer le nombre de
// places restantes. Une transaction Firestore atomique rend ca impossible.
// Meme principe que shop-purchase.js et contest-entry-payment.js pour la
// partie paiement (solde participant -> solde organisateur, moins une
// commission plateforme).
//
// Body attendu :
//   Reservation : { idToken, action: 'reserve', eventId, ticketTypeId, quantity }
//   Annulation  : { idToken, action: 'cancel', ticketId }

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
const EVENT_COMMISSION_PERCENT = 15; // meme commission plateforme que les concours payants

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
    if (action === 'reserve') {
      return res.status(200).json(await reserveTicket(uid, req.body));
    }
    if (action === 'cancel') {
      return res.status(200).json(await cancelTicket(uid, req.body));
    }
    return res.status(400).json({ success: false, error: 'Action inconnue.' });
  } catch (error) {
    console.error('[event-ticket-action] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};

async function reserveTicket(uid, body) {
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
  const ticketRef = db.collection('event_tickets').doc(); // id auto, plusieurs reservations possibles par personne

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
    if (typeIndex === -1) throw new Error('Ce type de billet n\'existe plus.');
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

      // Part de l'organisateur, moins la commission plateforme -- sauf si
      // l'admin est lui-meme l'organisateur (meme exception que les concours).
      if (organizerUid && organizerUid !== ADMIN_UID) {
        const organizerRef = db.collection('users').doc(organizerUid);
        const organizerSnap = await transaction.get(organizerRef);
        if (organizerSnap.exists) {
          organizerPayout = Math.round(amountPaid * (1 - EVENT_COMMISSION_PERCENT / 100) * 100) / 100;
          const organizerBalance = organizerSnap.data().balance || 0;
          transaction.update(organizerRef, { balance: Math.round((organizerBalance + organizerPayout) * 100) / 100 });
        }
      }
    }

    // Mise a jour du nombre de places vendues pour ce type de billet precis.
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

async function cancelTicket(uid, body) {
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

    // On libere la place si l'evenement existe encore, mais l'annulation de
    // la reservation elle-meme (et le remboursement) fonctionne meme si
    // l'evenement a ete supprime entre-temps.
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

      // Reprend la part precedemment versee a l'organisateur (si different de l'admin).
      if (ticket.organizerUid && ticket.organizerUid !== ADMIN_UID) {
        const organizerPayout = Math.round(amountPaid * (1 - EVENT_COMMISSION_PERCENT / 100) * 100) / 100;
        const organizerRef = db.collection('users').doc(ticket.organizerUid);
        const organizerSnap = await transaction.get(organizerRef);
        if (organizerSnap.exists) {
          const organizerBalance = organizerSnap.data().balance || 0;
          transaction.update(organizerRef, { balance: Math.round((organizerBalance - organizerPayout) * 100) / 100 });
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
