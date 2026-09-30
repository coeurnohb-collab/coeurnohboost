// api/mtp-balance.js
// Deux usages dans un seul fichier (pour rester dans la limite de 12
// fonctions serverless du plan gratuit Vercel -- fusion de l'ancien
// api/check-mtp-balance.js avec celui-ci) :
//
//   1. Appel du cron quotidien (Authorization: Bearer <CRON_SECRET>) :
//      verifie le solde MoreThanPanel, alerte par WhatsApp/email si trop
//      bas, et nettoie les vieux journaux de notifications.
//   2. Appel admin a la demande (Authorization: Bearer <idToken Firebase>) :
//      renvoie juste le solde actuel, pour l'affichage dans l'espace admin.
//
// Necessite les variables d'environnement Vercel : MTP_API_KEY,
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
// CRON_SECRET, et (optionnel, pour l'alerte) CALLMEBOT_PHONE,
// CALLMEBOT_APIKEY, RESEND_API_KEY, ALERT_EMAIL.

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
const SEUIL_ALERTE_USD = 2;

async function fetchMtpBalance() {
  const apiKey = process.env.MTP_API_KEY;
  if (!apiKey) throw new Error('MTP_API_KEY non configurée sur Vercel.');
  const response = await fetch('https://morethanpanel.com/api/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key: apiKey, action: 'balance' })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return { balance: parseFloat(data.balance) || 0, currency: data.currency || 'USD' };
}

async function cleanupOldNotifLogs() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const snap = await db.collection('notif_logs').where('createdAt', '<', cutoff).limit(500).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

async function runDailyCheck(res) {
  try {
    const { balance, currency } = await fetchMtpBalance();
    console.log(`[mtp-balance/cron] Solde actuel MTP : ${balance} ${currency}`);

    const logsDeleted = await cleanupOldNotifLogs().catch((e) => {
      console.error('[mtp-balance/cron] Erreur nettoyage notif_logs :', e.message);
      return 0;
    });

    if (balance >= SEUIL_ALERTE_USD) {
      return res.status(200).json({ balance, currency, alertSent: false, reason: 'Solde suffisant', logsDeleted });
    }

    const message = `⚠️ Coeurnoh Universe : ton solde MoreThanPanel est bas (${balance.toFixed(2)} ${currency}). Recharge-le vite pour éviter que les commandes clients échouent.`;
    const results = { whatsapp: null, email: null };

    try {
      const cmPhone = process.env.CALLMEBOT_PHONE;
      const cmApiKey = process.env.CALLMEBOT_APIKEY;
      if (cmPhone && cmApiKey) {
        const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cmPhone)}&text=${encodeURIComponent(message)}&apikey=${cmApiKey}`;
        const waRes = await fetch(waUrl);
        results.whatsapp = { ok: waRes.ok, status: waRes.status };
      } else {
        results.whatsapp = { ok: false, reason: 'CALLMEBOT_PHONE ou CALLMEBOT_APIKEY manquant' };
      }
    } catch (waErr) {
      results.whatsapp = { ok: false, reason: waErr.message };
    }

    try {
      const resendKey = process.env.RESEND_API_KEY;
      const alertEmail = process.env.ALERT_EMAIL;
      if (resendKey && alertEmail) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Coeurnoh Universe Alertes <onboarding@resend.dev>',
            to: alertEmail,
            subject: '⚠️ Solde MoreThanPanel bas',
            html: `<p>${message}</p>`
          })
        });
        results.email = { ok: emailRes.ok, status: emailRes.status };
      } else {
        results.email = { ok: false, reason: 'RESEND_API_KEY ou ALERT_EMAIL manquant' };
      }
    } catch (emailErr) {
      results.email = { ok: false, reason: emailErr.message };
    }

    console.log('[mtp-balance/cron] Alerte envoyée :', JSON.stringify(results));
    return res.status(200).json({ balance, currency, alertSent: true, results, logsDeleted });
  } catch (err) {
    console.error('[mtp-balance/cron] Exception :', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function runOnDemandCheck(req, res) {
  const idToken = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
  if (!idToken) return res.status(401).json({ error: 'Connexion admin requise.' });
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.uid !== ADMIN_UID) return res.status(403).json({ error: "Accès réservé à l'admin." });
  } catch (e) {
    return res.status(401).json({ error: 'Session invalide.' });
  }
  try {
    const { balance, currency } = await fetchMtpBalance();
    return res.status(200).json({ balance, currency });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}

module.exports = async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return runDailyCheck(res);
  }
  return runOnDemandCheck(req, res);
};
