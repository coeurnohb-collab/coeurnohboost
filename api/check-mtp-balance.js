// api/check-mtp-balance.js
// Verifie chaque jour (via Vercel Cron) le solde fournisseur MoreThanPanel.
// Si le solde est trop bas, envoie une alerte automatique par WhatsApp
// (via CallMeBot) et par email (via Resend), pour eviter que les commandes
// des clients echouent silencieusement par manque de fonds.
//
// Profite aussi de ce passage quotidien pour nettoyer les vieux journaux
// de notifications (notif_logs) de plus de 30 jours, pour que cette
// collection ne grossisse pas indefiniment.

import admin from 'firebase-admin';

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

const SEUIL_ALERTE_USD = 2;

export default async function handler(req, res) {
  // Securite : si CRON_SECRET est configure sur Vercel, on verifie qu'on est
  // bien appele par le cron officiel de Vercel (et pas par n'importe qui).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Non autorise' });
    }
  }

  try {
    // --- 1. Recuperer le solde MTP (meme methode que /api/mtp-balance) ---
    const apiKey = process.env.MTP_API_KEY;
    if (!apiKey) {
      console.error('[check-mtp-balance] MTP_API_KEY manquante');
      return res.status(500).json({ error: 'MTP_API_KEY manquante' });
    }

    const params = new URLSearchParams({ key: apiKey, action: 'balance' });
    const response = await fetch('https://morethanpanel.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await response.json();

    if (data.error) {
      console.error('[check-mtp-balance] Erreur MTP :', data.error);
      return res.status(400).json({ error: data.error });
    }

    const balance = parseFloat(data.balance) || 0;
    const currency = data.currency || 'USD';
    console.log(`[check-mtp-balance] Solde actuel MTP : ${balance} ${currency}`);

    // --- Nettoyage quotidien des vieux journaux de notifications ---
    // Ne bloque jamais la verification du solde meme si ca echoue.
    const logsDeleted = await cleanupOldNotifLogs().catch((e) => {
      console.error('[check-mtp-balance] Erreur nettoyage notif_logs :', e.message);
      return 0;
    });
    if (logsDeleted > 0) {
      console.log(`[check-mtp-balance] ${logsDeleted} vieux journaux de notifications supprimes`);
    }

    // --- 2. Si le solde est suffisant, rien a faire ---
    if (balance >= SEUIL_ALERTE_USD) {
      return res.status(200).json({ balance, currency, alertSent: false, reason: 'Solde suffisant', logsDeleted });
    }

    // --- 3. Solde trop bas : on prepare le message d'alerte ---
    const message = `⚠️ CoeurnohBoost : ton solde MoreThanPanel est bas (${balance.toFixed(2)} ${currency}). Recharge-le vite pour eviter que les commandes clients echouent.`;

    const results = { whatsapp: null, email: null };

    // --- 4. Envoi WhatsApp via CallMeBot ---
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
      console.error('[check-mtp-balance] Erreur envoi WhatsApp :', waErr.message);
      results.whatsapp = { ok: false, reason: waErr.message };
    }

    // --- 5. Envoi Email via Resend ---
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const alertEmail = process.env.ALERT_EMAIL;
      if (resendKey && alertEmail) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'CoeurnohBoost Alertes <onboarding@resend.dev>',
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
      console.error('[check-mtp-balance] Erreur envoi email :', emailErr.message);
      results.email = { ok: false, reason: emailErr.message };
    }

    console.log('[check-mtp-balance] Alerte envoyee :', JSON.stringify(results));
    return res.status(200).json({ balance, currency, alertSent: true, results });

  } catch (err) {
    console.error('[check-mtp-balance] Exception :', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// Supprime les journaux de notifications (notif_logs) vieux de plus de 30
// jours. Limite a 500 suppressions par jour (limite d'un batch Firestore) —
// si un gros retard s'est accumule, ca se rattrape sur quelques jours,
// sans jamais bloquer ou ralentir la verification du solde.
async function cleanupOldNotifLogs() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const snap = await db.collection('notif_logs')
    .where('createdAt', '<', cutoff)
    .limit(500)
    .get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}
