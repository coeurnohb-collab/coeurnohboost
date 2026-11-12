// api/_lib/inactive-cleanup.js
// Deux petits services serveur, rangés ici car Vercel (plan gratuit) limite à 12 fonctions dans /api :
//  1) recordSeen : à l'ouverture de l'application, note le PAYS (d'après l'adresse IP, sans la conserver)
//     et la date de dernière visite sur la fiche de la personne. Sert à la liste des utilisateurs de l'admin
//     et au nettoyage des comptes inactifs.
//  2) runInactiveCleanup : supprime les comptes qui ne sont pas revenus depuis 30 jours.
//     Appelé chaque jour par la tâche planifiée déjà existante (run-scheduled-broadcasts).
//
// GARDE-FOUS (on ne supprime JAMAIS) :
//  - le compte administrateur ;
//  - un compte de moins de 30 jours, ou vu depuis moins de 30 jours (connexion, jeton renouvelé, présence, dernière visite) ;
//  - un compte qui a de l'argent (solde > 0) ;
//  - un compte qui possède un site, une entreprise, une formation ou un site créé pour un client.
// Le premier passage est à blanc (rien n'est supprimé) : il arme simplement la fonction, la suppression commence le lendemain.

const DAY = 86400000;
const DEFAULT_DAYS = 30;
const MAX_DELETIONS_PER_RUN = 50;
const MAX_AUTH_PAGES = 10; // 10 000 comptes examinés par passage au plus

function ms(v) {
  if (!v) return 0;
  const t = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

// Pays d'après les en-têtes posés par Cloudflare ou Vercel : on ne garde que le code pays, jamais l'adresse IP.
function countryFromReq(req) {
  const h = (req && req.headers) || {};
  for (const k of ['cf-ipcountry', 'x-vercel-ip-country']) {
    const v = String(h[k] || '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(v) && v !== 'XX' && v !== 'T1') return v;
  }
  return null;
}

/* ---------------------------------------------------------------- 1) pays + dernière visite */
async function recordSeen({ db, uid, req, now = Date.now() }) {
  if (!uid) return { ok: false };
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false };
  const d = snap.data() || {};
  const country = countryFromReq(req);
  const patch = {};
  if (country && d.country !== country) patch.country = country;
  // Une écriture au plus toutes les 3 heures par personne : suffisant pour savoir si le compte est vivant.
  if (now - ms(d.lastSeenAt) > 3 * 3600000) patch.lastSeenAt = new Date(now).toISOString();
  if (Object.keys(patch).length) await ref.update(patch);
  return { ok: true, country: country || d.country || null };
}

/* ---------------------------------------------------------------- 2) suppression des comptes inactifs */
async function purgeWhere(db, name, field, uid) {
  const snap = await db.collection(name).where(field, '==', uid).get();
  const docs = snap.docs || [];
  for (let i = 0; i < docs.length; i += 400) {
    const b = db.batch();
    docs.slice(i, i + 400).forEach((x) => b.delete(x.ref));
    await b.commit();
  }
}

// Même ménage que « Supprimer mon compte » (notify-user.js) : le compte, ses publications, notifications,
// données de localisation. Les commandes et mouvements d'argent passés restent (historique de l'autre partie).
async function deleteAccount({ db, admin, uid }) {
  const safe = async (fn) => { try { await fn(); } catch (e) { console.error('[inactive-cleanup]', e && e.message); } };
  await safe(() => purgeWhere(db, 'publications', 'sellerUid', uid));
  await safe(() => purgeWhere(db, 'notifications', 'uid', uid));
  const loc = [['location_devices', 'ownerUid'], ['location_history', 'ownerUid'], ['location_shares', 'ownerUid'], ['location_shares', 'viewerUid'],
    ['emergency_contacts', 'ownerUid'], ['emergency_contacts', 'contactUid'], ['location_links', 'ownerUid'], ['location_lookup', 'uid']];
  for (const [n, f] of loc) await safe(() => purgeWhere(db, n, f, uid));
  for (const n of ['location_profiles', 'location_private', 'location_live', 'sos_sessions', 'presence', 'public_profiles']) {
    await safe(() => db.collection(n).doc(uid).delete());
  }
  await db.collection('users').doc(uid).delete();
  try { await admin.auth().deleteUser(uid); } catch (e) { if (!(e && e.code === 'auth/user-not-found')) throw e; }
}

async function hasContent({ db, uid }) {
  const docs = await Promise.all([
    db.collection('mini_sites').doc(uid).get(),
    db.collection('businesses').doc(uid).get(),
    db.collection('client_sites').doc(uid).get()
  ]);
  if (docs.some((s) => s && s.exists)) return true;
  const [agent, courses] = await Promise.all([
    db.collection('client_sites').where('agentUid', '==', uid).limit(1).get(),
    db.collection('courses').where('ownerUid', '==', uid).limit(1).get()
  ]);
  return !(agent.empty && courses.empty);
}

async function runInactiveCleanup({ db, admin, ADMIN_UID, now = Date.now(), maxDeletions = MAX_DELETIONS_PER_RUN, maxPages = MAX_AUTH_PAGES }) {
  const cfgRef = db.collection('app_config').doc('inactive_cleanup');
  const cfgSnap = await cfgRef.get();
  const cfg = (cfgSnap.exists && cfgSnap.data()) || {};
  if (cfg.enabled === false) return { skipped: 'disabled' };
  const days = Math.min(365, Math.max(7, Number(cfg.days) || DEFAULT_DAYS));
  const limitMs = now - days * DAY;
  const dryRun = !cfg.armedAt; // premier passage : à blanc

  // 1) comptes de connexion dont ni la création, ni la dernière connexion, ni le dernier renouvellement ne sont récents
  const candidates = [];
  let token, pages = 0, examined = 0;
  do {
    const page = await admin.auth().listUsers(1000, token);
    pages++;
    for (const u of page.users || []) {
      examined++;
      if (u.uid === ADMIN_UID) continue;
      const m = u.metadata || {};
      const last = Math.max(ms(m.lastRefreshTime), ms(m.lastSignInTime), ms(m.creationTime));
      if (last && last < limitMs) candidates.push({ uid: u.uid, authLast: last });
    }
    token = page.pageToken;
  } while (token && pages < maxPages && candidates.length < maxDeletions * 6);

  // 2) contrôle fin, un par un
  let deleted = 0, wouldDelete = 0, keptMoney = 0, keptContent = 0, keptActive = 0, errors = 0;
  for (const c of candidates) {
    if (deleted >= maxDeletions) break;
    try {
      const [uSnap, pSnap] = await Promise.all([db.collection('users').doc(c.uid).get(), db.collection('presence').doc(c.uid).get()]);
      const u = (uSnap.exists && uSnap.data()) || {};
      const p = (pSnap.exists && pSnap.data()) || {};
      const last = Math.max(c.authLast, ms(p.lastActiveAt), ms(u.lastSeenAt), ms(u.createdAt));
      if (last >= limitMs) { keptActive++; continue; }
      if ((Number(u.balance) || 0) > 0) { keptMoney++; continue; }
      if (await hasContent({ db, uid: c.uid })) { keptContent++; continue; }
      if (dryRun) { wouldDelete++; continue; }
      await deleteAccount({ db, admin, uid: c.uid });
      deleted++;
    } catch (e) {
      errors++;
      console.error('[inactive-cleanup] compte ignoré :', c.uid, e && e.message);
    }
  }

  const at = new Date(now).toISOString();
  const result = { days, dryRun, examined, candidates: candidates.length, deleted, wouldDelete, keptMoney, keptContent, keptActive, errors };
  try {
    const patch = { enabled: cfg.enabled !== false, days, lastRunAt: at, lastResult: result, totalDeleted: (Number(cfg.totalDeleted) || 0) + deleted };
    if (!cfg.armedAt) patch.armedAt = at;
    await cfgRef.set(patch, { merge: true });
    await db.collection('inactive_cleanup_logs').add(Object.assign({ at }, result));
  } catch (e) { console.error('[inactive-cleanup] journal :', e && e.message); }
  return result;
}

module.exports = { recordSeen, runInactiveCleanup, countryFromReq, DEFAULT_DAYS };
