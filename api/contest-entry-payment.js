// api/contest-entry-payment.js
// Gere la participation a un concours PAYANT de facon SECURISEE cote
// serveur : deduit les frais de participation du solde du participant, et
// credite l'organisateur du concours (moins une commission plateforme) --
// exactement sur le meme modele que shop-purchase.js (verification du jeton
// Firebase, transaction Firestore, firebase-admin pour le transfert entre
// comptes differents, impossible a faire en securite depuis le telephone
// du client).
//
// Body attendu : { idToken, contestId, name, submissionUrl, caption }
//
// Une seule participation par personne et par concours : l'id du document
// "contest_entries" cree est deterministe ("{contestId}_{uid}"), donc une
// deuxieme tentative pour le meme concours echoue proprement au lieu de
// facturer deux fois ou de creer un doublon.
//
// Si un jour des ENTREPRISES peuvent organiser leurs propres concours
// (organizerUid different de l'admin), elles recoivent automatiquement leur
// part apres une commission plateforme (CONTEST_COMMISSION_PERCENT), sur le
// meme principe que la commission de la Boutique. Tant que seul l'admin cree
// des concours (cas actuel), les frais restent simplement des revenus
// plateforme et aucun solde n'est deplace vers l'admin lui-meme.

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
const CONTEST_COMMISSION_PERCENT = 15; // CoeurnohBoost garde 15% quand un concours est organise par une entreprise

function computeContestStatus(c) {
  const now = Date.now();
  const start = c.startDate ? new Date(c.startDate).getTime() : 0;
  const end = c.endDate ? new Date(c.endDate).getTime() : Infinity;
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { idToken, contestId, name, submissionUrl, caption } = req.body;

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

    if (!contestId || !name || !submissionUrl) {
      return res.status(400).json({ success: false, error: 'contestId, name et submissionUrl sont requis.' });
    }
    if (!submissionUrl.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Lien de participation invalide.' });
    }

    const contestRef = db.collection('contests').doc(contestId);
    const buyerRef = db.collection('users').doc(uid);
    // Un seul document par personne et par concours -> impossible de payer deux fois.
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
      const newBuyerBalance = Math.round((buyerBalance - entryFee) * 100) / 100;
      transaction.update(buyerRef, { balance: newBuyerBalance });

      // Part de l'organisateur uniquement si le concours n'est pas organise
      // par l'admin lui-meme (voir explication en tete de fichier).
      let organizerPayout = 0;
      if (organizerUid !== ADMIN_UID) {
        const organizerRef = db.collection('users').doc(organizerUid);
        const organizerSnap = await transaction.get(organizerRef);
        if (organizerSnap.exists) {
          organizerPayout = Math.round(entryFee * (1 - CONTEST_COMMISSION_PERCENT / 100) * 100) / 100;
          const organizerBalance = organizerSnap.data().balance || 0;
          transaction.update(organizerRef, { balance: Math.round((organizerBalance + organizerPayout) * 100) / 100 });
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
        type: 'contest_entry',
        read: false,
        createdAt: new Date().toISOString()
      });

      if (organizerUid !== ADMIN_UID && organizerPayout > 0) {
        transaction.set(db.collection('notifications').doc(), {
          uid: organizerUid,
          title: 'Nouvelle participation payante 🎉',
          body: `Quelqu'un a rejoint "${contest.title}" (+${organizerPayout.toFixed(2)}$ sur ton solde).`,
          type: 'contest_income',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      return { newBalance: newBuyerBalance, contestTitle: contest.title, entryFee, organizerUid, organizerPayout };
    });

    await sendPushNotification(uid, 'Participation confirmée ✅', `"${result.contestTitle}" — ${result.entryFee.toFixed(2)}$ payés.`);
    if (result.organizerUid !== ADMIN_UID && result.organizerPayout > 0) {
      await sendPushNotification(result.organizerUid, 'Nouvelle participation payante 🎉', `+${result.organizerPayout.toFixed(2)}$ sur ton solde.`);
    }

    return res.status(200).json({ success: true, newBalance: result.newBalance });

  } catch (error) {
    console.error('[contest-entry-payment] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};
