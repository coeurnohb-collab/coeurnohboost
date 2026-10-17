/* Billetterie : validation des billets à l'entrée (organisateur ou personnel autorisé).
   Un billet = un document "event_tickets" (écrit côté serveur uniquement). Le QR contient « CN1:<id du billet> » ;
   un code court (8 premiers caractères de l'id, en majuscules) permet la saisie manuelle.
   Transaction Firestore : impossible d'admettre deux fois la même place, même avec deux contrôleurs en parallèle. */
'use strict';

function normCode(raw) {
  let c = String(raw == null ? '' : raw).trim();
  c = c.replace(/^CN1:/i, '').replace(/[\s-]+/g, '');
  return /^[A-Za-z0-9]{4,40}$/.test(c) ? c : '';
}
function shortCode(id) { return String(id || '').slice(0, 8).toUpperCase(); }

function createEventCheckin({ db, admin, ADMIN_UID }) {
  async function loadEventForStaff(uid, eventId) {
    if (!eventId || typeof eventId !== 'string') throw new Error('eventId est requis.');
    const snap = await db.collection('events').doc(eventId).get();
    if (!snap.exists) throw new Error("Cet événement n'existe plus.");
    const ev = snap.data();
    const staff = Array.isArray(ev.staffUids) ? ev.staffUids : [];
    if (ev.ownerUid !== uid && uid !== ADMIN_UID && !staff.includes(uid)) {
      const e = new Error("Seul l'organisateur (ou son personnel autorisé) peut valider les billets."); e.status = 403; throw e;
    }
    return ev;
  }
  async function findTicket(eventId, code) {
    if (code.length >= 18) {
      const s = await db.collection('event_tickets').doc(code).get();
      return s.exists ? { id: s.id, ref: s.ref, data: s.data() } : null;
    }
    const snap = await db.collection('event_tickets').where('eventId', '==', eventId).limit(2000).get();
    const up = code.toUpperCase();
    const hits = snap.docs.filter((d) => d.id.toUpperCase().startsWith(up));
    if (hits.length > 1) throw new Error('Plusieurs billets correspondent : saisis plus de caractères du code.');
    return hits.length ? { id: hits[0].id, ref: hits[0].ref, data: hits[0].data() } : null;
  }
  function view(id, t) {
    const qty = t.quantity || 1, used = Math.min(qty, t.checkedInCount || 0);
    return { id, code: shortCode(id), buyerName: t.buyerName || 'Participant', ticketTypeName: t.ticketTypeName || '', quantity: qty, used, remaining: Math.max(0, qty - used), status: t.status || 'confirmed', amountPaid: t.amountPaid || 0, lastCheckInAt: t.lastCheckInAt || null };
  }

  async function checkin(uid, body) {
    const { eventId, dryRun } = body || {};
    const code = normCode(body && (body.code || body.ticketId));
    if (!code) throw new Error('Code de billet invalide.');
    const ev = await loadEventForStaff(uid, eventId);
    const found = await findTicket(eventId, code);
    if (!found) throw new Error('Billet introuvable pour cet événement.');
    if (found.data.eventId !== eventId) throw new Error("Ce billet est pour un autre événement.");
    if (found.data.status === 'cancelled') return { success: true, valid: false, reason: 'cancelled', eventTitle: ev.title || '', ticket: view(found.id, found.data) };
    const base = { success: true, eventTitle: ev.title || '' };
    if (dryRun) {
      const v = view(found.id, found.data);
      return Object.assign(base, { valid: v.remaining > 0, reason: v.remaining > 0 ? 'ok' : 'used', ticket: v });
    }
    const admitReq = parseInt(body.admit, 10);
    const out = await db.runTransaction(async (tx) => {
      const s = await tx.get(found.ref);
      if (!s.exists) throw new Error('Billet introuvable.');
      const t = s.data();
      if (t.status === 'cancelled') return { valid: false, reason: 'cancelled', ticket: view(s.id, t) };
      const qty = t.quantity || 1, used = Math.min(qty, t.checkedInCount || 0), remaining = qty - used;
      if (remaining <= 0) return { valid: false, reason: 'used', ticket: view(s.id, t) };
      const n = Math.max(1, Math.min(remaining, Number.isFinite(admitReq) && admitReq > 0 ? admitReq : remaining));
      const now = new Date().toISOString();
      const upd = { checkedInCount: used + n, lastCheckInAt: now, checkedInBy: uid };
      if (!t.checkedInAt) upd.checkedInAt = now;
      upd.checkins = admin.firestore.FieldValue.arrayUnion({ at: now, by: uid, n });
      tx.update(found.ref, upd);
      return { valid: true, reason: 'ok', admitted: n, ticket: view(s.id, Object.assign({}, t, { checkedInCount: used + n, lastCheckInAt: now })) };
    });
    return Object.assign(base, out);
  }

  /* Tableau de bord organisateur : ventes, présence, revenus, par type de billet. */
  async function stats(uid, body) {
    const ev = await loadEventForStaff(uid, body && body.eventId);
    const snap = await db.collection('event_tickets').where('eventId', '==', body.eventId).limit(5000).get();
    const byType = {}; let sold = 0, present = 0, revenue = 0, cancelled = 0;
    snap.docs.forEach((d) => {
      const t = d.data(), q = t.quantity || 1;
      if (t.status === 'cancelled') { cancelled += q; return; }
      sold += q; present += Math.min(q, t.checkedInCount || 0); revenue += t.amountPaid || 0;
      const k = t.ticketTypeName || 'Billet'; byType[k] = byType[k] || { sold: 0, present: 0, revenue: 0 };
      byType[k].sold += q; byType[k].present += Math.min(q, t.checkedInCount || 0); byType[k].revenue += t.amountPaid || 0;
    });
    const capacity = (ev.ticketTypes || []).reduce((a, x) => a + (x.quantityTotal || 0), 0);
    return { success: true, eventTitle: ev.title || '', sold, present, cancelled, capacity, revenue: Math.round(revenue * 100) / 100, byType };
  }
  return { checkin, stats };
}
module.exports = { createEventCheckin, normCode, shortCode };
