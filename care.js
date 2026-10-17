// api/_lib/care.js
// Exploitation et relation client : demandes d'assistance (tickets), export des donnees personnelles,
// sauvegarde JSON pour l'administrateur et journal des actions d'administration.
// Dans /_lib : ce n'est PAS une fonction serverless. Toutes les collections ci-dessous sont ecrites et lues
// par le SERVEUR uniquement (aucune regle Firestore a ouvrir).
//   support_tickets/{id}  {uid, name, email, category, subject, message, status, createdAt, updatedAt, replies[]}
//   admin_audit/{id}      {at, adminUid, action, detail}

const CATEGORIES = { paiement: 'Paiement / recharge', commande: 'Commande', compte: 'Mon compte', technique: 'Problème technique', autre: 'Autre' };
const STATUS = ['open', 'answered', 'closed'];
const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);

// Collections que l'utilisateur peut exporter (champ qui porte son identifiant).
const USER_EXPORT = [
  ['orders', 'uid'], ['topup_requests', 'uid'], ['wallet_transactions', 'uid'], ['notifications', 'uid'],
  ['event_tickets', 'buyerUid'], ['academy_certificates', 'studentUid'], ['publications', 'sellerUid'], ['support_tickets', 'uid']
];
// Champs jamais exportes (jetons, secrets techniques).
const SECRET_KEYS = /^(fcm|push|token|secret|apiKey|password|hash|salt)/i;
// Collections que l'administrateur peut sauvegarder.
const BACKUP_COLLECTIONS = ['users', 'orders', 'topup_requests', 'wallet_transactions', 'withdrawals', 'mini_sites', 'businesses', 'publications', 'events', 'event_tickets',
  'courses', 'course_enrollments', 'academy_certificates', 'app_config', 'settings', 'pricing', 'support_tickets', 'admin_audit', 'announcements', 'alerts'];

// Convertit les types Firestore (Timestamp...) en valeurs JSON simples, et retire les champs secrets.
function plain(v, depth) {
  depth = depth || 0;
  if (v == null || typeof v !== 'object') return v;
  if (typeof v.toDate === 'function') { try { return v.toDate().toISOString(); } catch (e) { return null; } }
  if (Array.isArray(v)) return depth > 6 ? [] : v.map((x) => plain(x, depth + 1));
  if (depth > 6) return null;
  const o = {};
  Object.keys(v).forEach((k) => { if (!SECRET_KEYS.test(k)) o[k] = plain(v[k], depth + 1); });
  return o;
}

function createCare({ db, admin, ADMIN_UID, push }) {
  const must = (c) => { if (!c) throw new Error('Requête invalide.'); };
  const needAdmin = (uid) => { if (uid !== ADMIN_UID) throw new Error('Accès réservé à l’administrateur.'); };

  async function audit(adminUid, action, detail) {
    try { await db.collection('admin_audit').add({ at: new Date().toISOString(), adminUid, action: clip(action, 60), detail: clip(typeof detail === 'string' ? detail : JSON.stringify(detail || {}), 400) }); }
    catch (e) { console.error('[care] journal impossible :', e && e.message); }
  }

  // ---- Demandes d'assistance ----
  async function supportCreate(uid, body) {
    body = body || {};
    const category = CATEGORIES[body.category] ? body.category : 'autre';
    const subject = clip(body.subject, 90), message = clip(body.message, 1500);
    if (subject.length < 3) throw new Error('Indique un sujet (3 caractères minimum).');
    if (message.length < 10) throw new Error('Décris ton problème en quelques mots (10 caractères minimum).');
    const open = await db.collection('support_tickets').where('uid', '==', uid).limit(60).get();
    if (open.docs.filter((d) => d.data().status !== 'closed').length >= 5) throw new Error('Tu as déjà 5 demandes en cours. Attends une réponse avant d’en envoyer une nouvelle.');
    const u = await db.collection('users').doc(uid).get();
    const ud = u.exists ? u.data() : {};
    const now = new Date().toISOString();
    const ref = await db.collection('support_tickets').add({ uid, name: clip(ud.name, 80), email: clip(ud.email, 120), category, subject, message, status: 'open', createdAt: now, updatedAt: now, replies: [] });
    try { if (push) await push(ADMIN_UID, 'Nouvelle demande d’assistance', subject, '/admin.html'); } catch (e) { /* secondaire */ }
    return { success: true, id: ref.id, ref: ref.id.slice(0, 6).toUpperCase() };
  }
  async function supportMine(uid) {
    const s = await db.collection('support_tickets').where('uid', '==', uid).limit(40).get();
    const items = s.docs.map((d) => { const x = d.data(); return { id: d.id, ref: d.id.slice(0, 6).toUpperCase(), category: CATEGORIES[x.category] || 'Autre', subject: x.subject, message: x.message, status: x.status, createdAt: x.createdAt, updatedAt: x.updatedAt, replies: (x.replies || []).slice(-10) }; });
    items.sort((a, b) => (b.updatedAt || '') < (a.updatedAt || '') ? -1 : 1);
    return { success: true, items };
  }
  async function supportAdmin(uid, body) {
    needAdmin(uid); body = body || {}; const op = body.op || 'list';
    if (op === 'list') {
      const s = await db.collection('support_tickets').limit(300).get();
      let items = s.docs.map((d) => Object.assign({ id: d.id, ref: d.id.slice(0, 6).toUpperCase() }, d.data()));
      if (body.status && STATUS.includes(body.status)) items = items.filter((x) => x.status === body.status);
      items.sort((a, b) => ((b.updatedAt || '') < (a.updatedAt || '') ? -1 : 1));
      return { success: true, items: items.slice(0, 100), counts: { open: s.docs.filter((d) => d.data().status === 'open').length } };
    }
    const id = clip(body.id, 40); must(id && /^[A-Za-z0-9]+$/.test(id));
    const ref = db.collection('support_tickets').doc(id), snap = await ref.get(); if (!snap.exists) throw new Error('Demande introuvable.');
    const t = snap.data(), now = new Date().toISOString();
    if (op === 'reply') {
      const text = clip(body.text, 1500); if (text.length < 2) throw new Error('Écris une réponse.');
      await ref.update({ replies: (t.replies || []).concat([{ from: 'admin', text, at: now }]).slice(-30), status: 'answered', updatedAt: now });
      await audit(uid, 'support_reply', { id, user: t.uid });
      try { if (push && t.uid) await push(t.uid, 'Réponse à votre demande', t.subject || 'Assistance Coeurnoh', '/'); } catch (e) { /* secondaire */ }
      return { success: true };
    }
    if (op === 'close' || op === 'reopen') {
      await ref.update({ status: op === 'close' ? 'closed' : 'open', updatedAt: now });
      await audit(uid, 'support_' + op, { id });
      return { success: true };
    }
    throw new Error('Opération inconnue.');
  }
  // L'utilisateur peut aussi répondre ou clore sa propre demande.
  async function supportUser(uid, body) {
    body = body || {}; const id = clip(body.id, 40); must(id && /^[A-Za-z0-9]+$/.test(id));
    const ref = db.collection('support_tickets').doc(id), snap = await ref.get();
    if (!snap.exists || snap.data().uid !== uid) throw new Error('Demande introuvable.');
    const t = snap.data(), now = new Date().toISOString();
    if (body.op === 'close') { await ref.update({ status: 'closed', updatedAt: now }); return { success: true }; }
    const text = clip(body.text, 1500); if (text.length < 2) throw new Error('Écris ton message.');
    if ((t.replies || []).length >= 30) throw new Error('Cette demande a atteint sa limite de messages. Ouvre-en une nouvelle.');
    await ref.update({ replies: (t.replies || []).concat([{ from: 'user', text, at: now }]), status: 'open', updatedAt: now });
    return { success: true };
  }

  // ---- Mes données (export personnel) ----
  async function exportMyData(uid) {
    const out = { generatedAt: new Date().toISOString(), uid, note: 'Export de vos données personnelles Coeurnoh Universe. Les jetons techniques et secrets sont exclus.' };
    try { const u = await db.collection('users').doc(uid).get(); out.profile = u.exists ? plain(u.data()) : null; } catch (e) { out.profile = null; }
    await Promise.all(USER_EXPORT.map(async ([col, field]) => {
      try { const s = await db.collection(col).where(field, '==', uid).limit(500).get(); out[col] = s.docs.map((d) => Object.assign({ id: d.id }, plain(d.data()))); }
      catch (e) { out[col] = []; }
    }));
    return { success: true, data: out };
  }

  // ---- Sauvegarde (admin) : une page de documents a la fois ----
  async function backupExport(uid, body) {
    needAdmin(uid); body = body || {};
    if (body.op === 'list') return { success: true, collections: BACKUP_COLLECTIONS };
    const col = clip(body.collection, 60); if (!BACKUP_COLLECTIONS.includes(col)) throw new Error('Collection non autorisée.');
    let q = db.collection(col).orderBy(admin.firestore.FieldPath.documentId()).limit(250);
    const after = clip(body.after, 200); if (after) q = q.startAfter(after);
    const s = await q.get(); const docs = []; let size = 0, last = '';
    for (const d of s.docs) { const item = { id: d.id, data: plain(d.data()) }; size += JSON.stringify(item).length; if (size > 2800000 && docs.length) break; docs.push(item); last = d.id; }
    const done = docs.length === s.docs.length && s.docs.length < 250;
    if (!after) await audit(uid, 'backup_export', { collection: col });
    return { success: true, collection: col, docs, next: done ? '' : last };
  }

  // ---- Journal des modifications faites depuis le panneau d'administration (enregistrees par le navigateur de l'admin) ----
  // On n'enregistre jamais les valeurs, seulement : operation, chemin du document, noms des champs modifies.
  const SKIP_AUDIT = /^(admin_audit|client_errors|notif_logs|support_tickets|notifications|rate_limits)\//;
  async function auditBatch(uid, body) {
    needAdmin(uid); const list = Array.isArray(body && body.entries) ? body.entries.slice(0, 20) : [];
    const rows = list.map((e) => ({ op: ['set', 'update', 'delete'].includes(e && e.op) ? e.op : '', path: clip(e && e.path, 160), keys: Array.isArray(e && e.keys) ? e.keys.slice(0, 12).map((k) => clip(k, 40)).join(',') : '' }))
      .filter((r) => r.op && /^[A-Za-z0-9_\-]+(\/[^\/\s]+)+$/.test(r.path) && !SKIP_AUDIT.test(r.path));
    if (!rows.length) return { success: true, saved: 0 };
    const b = db.batch(), at = new Date().toISOString();
    rows.forEach((r) => b.set(db.collection('admin_audit').doc(), { at, adminUid: uid, action: 'edit:' + r.op, detail: r.path + (r.keys ? ' [' + r.keys + ']' : '') }));
    await b.commit(); return { success: true, saved: rows.length };
  }

  // ---- Journal ----
  async function auditList(uid) {
    needAdmin(uid);
    const s = await db.collection('admin_audit').orderBy('at', 'desc').limit(60).get();
    return { success: true, items: s.docs.map((d) => Object.assign({ id: d.id }, d.data())) };
  }

  return { supportCreate, supportMine, supportAdmin, supportUser, exportMyData, backupExport, auditList, auditBatch, audit };
}

module.exports = { createCare, plain, CATEGORIES, BACKUP_COLLECTIONS, USER_EXPORT };
