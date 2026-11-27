// api/_lib/post-social.js
// Publications : « qui a aimé » (liste des personnes, comme sur Facebook) et NOMBRE DE VUES (photos, vidéos, textes).
//
// Pourquoi côté serveur :
// - les vues : un téléphone ne doit jamais pouvoir écrire lui-même un compteur public (il pourrait gonfler ses vues). Le serveur
//   compte UNE vue par personne et par publication (document « publication_views/{pubId}_{uid} »), ignore les vues de l'auteur sur
//   sa propre publication, et ajoute 1 au champ « viewsCount » de la publication. Aucune règle Firestore à changer.
// - la liste des personnes qui ont aimé : lecture groupée (une requête + une lecture groupée des profils publics) au lieu d'une
//   lecture par personne depuis le téléphone ; ne renvoie que des champs publics (nom, photo, badge vérifié, type de réaction).
// Aucun argent ici.
'use strict';

const ID_RE = /^[A-Za-z0-9_-]{4,128}$/;
const MAX_LIKERS = 60;     // personnes affichées
const MAX_SCAN = 300;      // j'aime lus au maximum pour construire la liste
const MAX_VIEW_IDS = 25;   // publications comptées par appel

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function validIds(list, max) {
  const raw = Array.isArray(list) ? list : [];
  return Array.from(new Set(raw.filter((x) => typeof x === 'string' && ID_RE.test(x)))).slice(0, max);
}

function publicLiker(like, profile) {
  const p = profile || {};
  const name = cleanText(p.username || p.name || '', 60);
  const photo = typeof p.photoURL === 'string' && /^https:\/\//i.test(p.photoURL) ? p.photoURL.slice(0, 600) : '';
  return {
    uid: like.uid,
    name,
    photoURL: photo,
    verified: p.verified === true,
    type: cleanText(like.type || 'heart', 20) || 'heart',
    at: typeof like.createdAt === 'string' ? like.createdAt.slice(0, 40) : ''
  };
}

function createPostSocial({ db, admin }) {
  // Personnes qui ont aimé une publication (les plus récentes d'abord).
  async function likers(uid, body) {
    if (!uid) throw new Error('Connecte-toi pour continuer.');
    const pubId = cleanText(body && body.pubId, 128);
    if (!ID_RE.test(pubId)) throw new Error('Publication introuvable.');
    const pubSnap = await db.collection('publications').doc(pubId).get();
    if (!pubSnap.exists) throw new Error('Publication introuvable.');
    const pub = pubSnap.data() || {};
    const snap = await db.collection('publication_likes').where('pubId', '==', pubId).limit(MAX_SCAN).get();
    const seen = new Set();
    const rows = [];
    snap.docs.forEach((d) => {
      const r = d.data() || {};
      if (typeof r.uid !== 'string' || !ID_RE.test(r.uid) || seen.has(r.uid)) return;
      seen.add(r.uid);
      rows.push(r);
    });
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const page = rows.slice(0, MAX_LIKERS);
    const profiles = {};
    if (page.length) {
      const snaps = await db.getAll.apply(db, page.map((r) => db.collection('public_profiles').doc(r.uid)));
      snaps.forEach((s) => { if (s.exists) profiles[s.id] = s.data(); });
    }
    const total = Math.max(Number(pub.likesCount) || 0, rows.length);
    return { success: true, total, shown: page.length, me: page.some((r) => r.uid === uid), likers: page.map((r) => publicLiker(r, profiles[r.uid])) };
  }

  // Compte les vues : une par personne et par publication ; jamais sur sa propre publication.
  async function views(uid, body) {
    if (!uid) throw new Error('Connecte-toi pour continuer.');
    const ids = validIds(body && body.ids, MAX_VIEW_IDS);
    if (!ids.length) return { success: true, counted: [] };
    const pubRefs = ids.map((id) => db.collection('publications').doc(id));
    const viewRefs = ids.map((id) => db.collection('publication_views').doc(id + '_' + uid));
    const snaps = await db.getAll.apply(db, pubRefs.concat(viewRefs));
    const batch = db.batch();
    const counted = [];
    const now = new Date().toISOString();
    ids.forEach((id, i) => {
      const pub = snaps[i];
      const seen = snaps[ids.length + i];
      if (!pub.exists || seen.exists) return;
      const d = pub.data() || {};
      if (d.sellerUid === uid) return;
      batch.set(viewRefs[i], { pubId: id, uid, createdAt: now });
      batch.update(pubRefs[i], { viewsCount: admin.firestore.FieldValue.increment(1) });
      counted.push(id);
    });
    if (counted.length) await batch.commit();
    return { success: true, counted };
  }

  return { likers, views };
}

module.exports = { createPostSocial, publicLiker, validIds, cleanText, MAX_LIKERS, MAX_VIEW_IDS };
