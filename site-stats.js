// api/_lib/site-stats.js
// Statistiques de visites des mini-sites : vues et actions (WhatsApp, appel, itineraire, panier, partage), par jour.
// Collection site_stats/{siteId}_{YYYY-MM-DD} ECRITE ET LUE PAR LE SERVEUR SEULEMENT (aucune regle Firestore a ouvrir).
// Aucune donnee personnelle : seulement des compteurs.

const EVENTS = ['view', 'wa', 'call', 'map', 'cart', 'share'];
const dayId = (ms) => new Date(ms).toISOString().slice(0, 10);

const known = new Map(); // siteId -> instant de verification (evite une lecture a chaque visite)
async function recordHit(db, admin, { siteId, ev, now }) {
  if (!EVENTS.includes(ev)) throw new Error('Evenement inconnu.');
  if (!/^[A-Za-z0-9]{10,40}$/.test(String(siteId || ''))) throw new Error('Site invalide.');
  now = now || Date.now();
  if (!known.has(siteId) || now - known.get(siteId) > 600000) {
    const s = await db.collection('mini_sites').doc(siteId).get();
    if (!s.exists || s.data().status !== 'published') throw new Error('Site introuvable.');
    known.set(siteId, now); if (known.size > 2000) known.clear();
  }
  const day = dayId(now);
  await db.collection('site_stats').doc(siteId + '_' + day).set({ siteId, day, [ev]: admin.firestore.FieldValue.increment(1) }, { merge: true });
  return { success: true };
}

// Construit la serie des N derniers jours (du plus ancien au plus recent) + totaux. Pure et testable.
function summarize(docsByDay, now, days) {
  days = Math.min(90, Math.max(1, days || 30));
  const series = [], total = {}; EVENTS.forEach((e) => { total[e] = 0; });
  for (let i = days - 1; i >= 0; i--) {
    const d = dayId(now - i * 86400000), x = docsByDay[d] || {}, row = { day: d };
    EVENTS.forEach((e) => { const n = Math.max(0, Math.floor(Number(x[e]) || 0)); row[e] = n; total[e] += n; });
    series.push(row);
  }
  const actions = total.wa + total.call + total.map + total.cart;
  const best = series.reduce((b, r) => (r.view > (b ? b.view : -1) ? r : b), null);
  return { series, total, actions, contactRate: total.view ? Math.round(actions / total.view * 1000) / 10 : 0, bestDay: best && best.view ? best.day : null };
}

async function siteStats(db, uid, body) {
  const days = Math.min(90, Math.max(7, parseInt(body && body.days, 10) || 30)), now = Date.now();
  const ids = []; for (let i = 0; i < days; i++) ids.push(uid + '_' + dayId(now - i * 86400000));
  const snaps = await db.getAll(...ids.map((id) => db.collection('site_stats').doc(id)));
  const by = {}; snaps.forEach((s) => { if (s.exists) by[s.data().day] = s.data(); });
  const cur = summarize(by, now, days);
  return Object.assign({ success: true, days }, cur);
}

module.exports = { recordHit, summarize, siteStats, EVENTS };
