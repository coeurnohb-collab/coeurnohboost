// api/notify-user.js
// Permet a l'admin (depuis admin.js, cote client) de declencher une VRAIE
// alerte push vers un client precis — necessaire car l'envoi de notifications
// push ne peut se faire que depuis le serveur (firebase-admin), jamais
// directement depuis le navigateur.

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

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const { adminUid, uid, title, body } = req.body;

    // Verification minimale : seul le compte admin peut declencher ceci
    if (adminUid !== ADMIN_UID) {
      return res.status(403).json({ error: 'Non autorise' });
    }
    if (!uid || !title || !body) {
      return res.status(400).json({ error: 'uid, title et body sont requis' });
    }

    const userSnap = await db.collection('users').doc(uid).get();
    const fcmToken = userSnap.exists && userSnap.data().fcmToken;

    if (fcmToken) {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body }
      });
    }

    return res.status(200).json({ success: true, pushSent: !!fcmToken });

  } catch (error) {
    console.error('[notify-user] Erreur :', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};
