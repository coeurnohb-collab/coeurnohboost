// api/run-scheduled-broadcasts.js
// Execute regulierement par Vercel Cron (voir vercel.json). Verifie la
// collection Firestore "scheduled_broadcasts" (remplie depuis l'espace
// admin > Annonces > "Messages programmes") et envoie automatiquement,
// a TOUS les utilisateurs, tout message dont l'heure prevue est arrivee --
// meme si l'admin n'est pas connecte au moment de l'envoi.
//
// Trois types de repetition geres (choisis dans l'admin) :
//   - "once"           : un seul envoi, a une date/heure precise.
//   - "interval_hours" : toutes les N heures a partir d'un premier envoi
//                        (ex: 12 -> deux fois par jour, 24 -> une fois par jour).
//   - "weekly"         : chaque semaine, tel jour a telle heure.
// Apres chaque envoi, ce fichier recalcule lui-meme la prochaine echeance
// (ou desactive le message si "once").

const admin = require('firebase-admin');
const { initFirebaseAdmin } = require('./_lib/security');
const { sendBroadcastToAllUsers } = require('./_lib/push');

initFirebaseAdmin();
const db = admin.firestore();

// Prochaine occurrence d'un jour de semaine + heure, strictement apres
// l'instant "from" donne (evite de reprogrammer au meme moment si le
// cron tourne pile a l'heure prevue).
function computeNextWeekly(from, weekday, timeOfDay) {
  const [hh, mm] = String(timeOfDay || '08:00').split(':').map((n) => parseInt(n, 10) || 0);
  const next = new Date(from.getTime());
  next.setHours(hh, mm, 0, 0);
  let diff = (weekday - next.getDay() + 7) % 7;
  if (diff === 0 && next.getTime() <= from.getTime()) diff = 7;
  next.setDate(next.getDate() + diff);
  return next;
}

module.exports = async function handler(req, res) {
  // Meme garde-fou que les autres crons du projet (check-mtp-balance) :
  // sans ce secret, n'importe qui pourrait appeler cette URL publique et
  // forcer l'envoi immediat de tous les messages programmes.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[run-scheduled-broadcasts] CRON_SECRET manquant : appel refuse par securite.');
    return res.status(500).json({ error: 'CRON_SECRET non configuré côté serveur.' });
  }
  const authHeader = req.headers['authorization'] || '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // Peu de documents (reserve a l'admin) : on recupere seulement les
    // messages actifs puis on filtre l'echeance en memoire, pour eviter
    // tout besoin d'index compose Firestore sur (active, nextSendAt).
    const snap = await db.collection('scheduled_broadcasts').where('active', '==', true).get();
    const due = snap.docs.filter((doc) => (doc.data().nextSendAt || '9999') <= nowIso);

    let processed = 0;
    const errors = [];

    for (const doc of due) {
      const data = doc.data();
      try {
        await sendBroadcastToAllUsers({
          title: data.title,
          body: data.body,
          category: 'admin',
          url: '/?openTab=notifs'
        });

        // Meme trace que les annonces manuelles, pour qu'il apparaisse
        // dans le panneau de notifications des utilisateurs.
        await db.collection('announcements').add({
          title: data.title,
          body: data.body,
          type: 'admin_message',
          url: '/?openTab=notifs',
          createdAt: new Date().toISOString()
        });

        const patch = {
          lastSentAt: new Date().toISOString(),
          sentCount: admin.firestore.FieldValue.increment(1)
        };

        if (data.recurrence === 'once') {
          patch.active = false;
        } else if (data.recurrence === 'interval_hours') {
          const hours = Math.max(1, parseInt(data.intervalHours, 10) || 24);
          const prevNext = new Date(data.nextSendAt);
          let next = new Date(prevNext.getTime() + hours * 3600 * 1000);
          // Rattrape sans envoyer les echeances manquees (ex: site en
          // pause plusieurs jours) -- on avance jusqu'a une heure future.
          while (next.getTime() <= Date.now()) next = new Date(next.getTime() + hours * 3600 * 1000);
          patch.nextSendAt = next.toISOString();
        } else if (data.recurrence === 'weekly') {
          patch.nextSendAt = computeNextWeekly(new Date(), data.weekday, data.timeOfDay).toISOString();
        }

        await doc.ref.update(patch);
        processed++;
      } catch (e) {
        console.error('[run-scheduled-broadcasts] Echec envoi', doc.id, e.message);
        errors.push({ id: doc.id, error: e.message });
      }
    }

    return res.status(200).json({ success: true, checked: snap.size, processed, errors });
  } catch (error) {
    console.error('[run-scheduled-broadcasts] Erreur :', error.message);
    return res.status(500).json({ error: error.message });
  }
};
