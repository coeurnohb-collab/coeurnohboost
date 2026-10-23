// api/_lib/site-support.js
// Messagerie « Aide pour mon site » : le propriétaire écrit depuis l'espace administrateur de son site,
// l'administrateur de la plateforme répond depuis le tableau de bord. Un seul fil par propriétaire.
// Collection site_help/{ownerUid}, ÉCRITE ET LUE PAR LE SERVEUR SEULEMENT (aucune règle Firestore à ouvrir).

const CATEGORIES = ['modification', 'domaine', 'paiement', 'bug', 'autre'];
const MAX_MSG = 1000;
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, n);

function createSiteSupport({ db, admin, push, adminUid }) {
  const col = () => db.collection('site_help');

  async function ownerSend(uid, b) {
    const text = clean(b.message, MAX_MSG);
    if (text.length < 3) { const e = new Error('Écris ton message (3 caractères minimum).'); e.status = 400; throw e; }
    const category = CATEGORIES.includes(b.category) ? b.category : 'autre';
    const site = await db.collection('mini_sites').doc(uid).get();
    if (!site.exists) { const e = new Error('Crée d’abord ton site.'); e.status = 400; throw e; }
    const sd = site.data(), now = new Date().toISOString(), ref = col().doc(uid);
    await db.runTransaction(async (tx) => {
      const s = await tx.get(ref), d = s.exists ? s.data() : { messages: [], createdAt: now };
      const messages = (d.messages || []).concat([{ from: 'owner', text, category, at: now }]).slice(-100);
      tx.set(ref, { ownerUid: uid, slug: sd.slug || '', siteName: clean(sd.businessName, 80), status: 'open', unreadAdmin: true, unreadOwner: false, messages, createdAt: d.createdAt || now, updatedAt: now }, { merge: true });
    });
    try {
      const title = '📩 Aide site : ' + clean(sd.businessName || 'un site', 40), body = text.slice(0, 120);
      await db.collection('notifications').add({ uid: adminUid, title, body, type: 'site_help', url: '/admin.html', read: false, createdAt: now });
      await push(adminUid, title, body, '/admin.html', { category: 'activity' });
    } catch (e) { /* le message est déjà enregistré */ }
    return { success: true };
  }

  async function ownerThread(uid) {
    const s = await col().doc(uid).get();
    if (!s.exists) return { success: true, messages: [], status: 'none' };
    const d = s.data();
    if (d.unreadOwner) col().doc(uid).update({ unreadOwner: false }).catch(() => { });
    return { success: true, messages: (d.messages || []).slice(-50), status: d.status || 'open' };
  }

  async function adminList() {
    const snap = await col().orderBy('updatedAt', 'desc').limit(100).get();
    return { success: true, items: snap.docs.map((x) => { const d = x.data(), last = (d.messages || []).slice(-1)[0] || {}; return { id: x.id, slug: d.slug, siteName: d.siteName, status: d.status, unread: !!d.unreadAdmin, updatedAt: d.updatedAt, last: String(last.text || '').slice(0, 160), lastFrom: last.from, count: (d.messages || []).length }; }) };
  }
  async function adminGet(id) {
    const s = await col().doc(String(id)).get();
    if (!s.exists) { const e = new Error('Introuvable.'); e.status = 404; throw e; }
    await col().doc(s.id).update({ unreadAdmin: false });
    const d = s.data();
    return { success: true, id: s.id, slug: d.slug, siteName: d.siteName, status: d.status, messages: d.messages || [] };
  }
  async function adminReply(b) {
    const id = clean(b.id, 128), text = clean(b.message, MAX_MSG);
    if (!id || /\//.test(id) || text.length < 1) { const e = new Error('Réponse vide.'); e.status = 400; throw e; }
    const ref = col().doc(id), now = new Date().toISOString();
    const s = await ref.get(); if (!s.exists) { const e = new Error('Introuvable.'); e.status = 404; throw e; }
    const messages = (s.data().messages || []).concat([{ from: 'admin', text, at: now }]).slice(-100);
    await ref.update({ messages, status: b.close ? 'closed' : 'answered', unreadOwner: true, unreadAdmin: false, updatedAt: now });
    try {
      const title = 'Réponse à ton message', url = '/?mysite=1';
      await db.collection('notifications').add({ uid: id, title, body: text.slice(0, 120), type: 'site_help', url, read: false, createdAt: now });
      await push(id, title, text.slice(0, 120), url, { category: 'activity' });
    } catch (e) { /* déjà enregistré */ }
    return { success: true };
  }
  async function adminClose(id) { await col().doc(clean(id, 128)).update({ status: 'closed', updatedAt: new Date().toISOString() }); return { success: true }; }

  return { ownerSend, ownerThread, adminList, adminGet, adminReply, adminClose, CATEGORIES };
}

module.exports = { createSiteSupport, CATEGORIES };
