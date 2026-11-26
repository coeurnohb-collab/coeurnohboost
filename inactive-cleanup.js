// api/_lib/inactive-cleanup.js
// Services serveur « comptes », rangés ici car Vercel (plan gratuit) limite à 12 fonctions dans /api :
//  1) recordSeen : à l'ouverture de l'application, note le PAYS (d'après l'adresse IP, sans la conserver)
//     et la date de dernière visite sur la fiche de la personne. Sert à la liste des utilisateurs de l'admin
//     et au nettoyage des comptes inactifs.
//  2) runInactiveCleanup : met de côté (ARCHIVE) les comptes qui ne sont pas revenus depuis 30 jours.
//     Appelé chaque jour par la tâche planifiée déjà existante (run-scheduled-broadcasts).
//  3) restoreAccount : quand la personne revient, remet TOUT en place (même compte, mêmes informations).
//
// POURQUOI « ARCHIVER » ET NON « SUPPRIMER » : avant, le compte de connexion et les données étaient détruits ; la
// personne qui revenait ne pouvait plus se connecter et perdait tout. Maintenant :
//  - le compte de CONNEXION reste (même identifiant, même mot de passe, même Google) : un drapeau « archived » est posé dessus ;
//  - la fiche personnelle, le profil public, les publications, les appareils et contacts d'urgence sont COPIÉS dans
//    archived_accounts/{uid} (collection réservée au serveur : les règles Firestore refusent tout accès aux téléphones),
//    puis retirés de l'application ;
//  - seuls les éléments sensibles ou éphémères (position en direct, historique de position, session SOS, liens de partage) sont effacés ;
//  - les commandes, mouvements d'argent et notifications ne sont jamais touchés ;
//  - à la reconnexion, restoreAccount remet les copies en place, retire le drapeau puis efface l'archive.
//
// GARDE-FOUS (on n'archive JAMAIS) :
//  - le compte administrateur ;
//  - un compte de moins de 30 jours, ou vu depuis moins de 30 jours (connexion, jeton renouvelé, présence, dernière visite) ;
//  - un compte qui a de l'argent (solde > 0) ;
//  - un compte qui possède un site, une entreprise, une formation ou un site créé pour un client ;
//  - un compte dont les données sont trop nombreuses pour être copiées d'un coup (on le laisse tel quel).
// Le premier passage est à blanc (rien n'est archivé) : il arme simplement la fonction, l'archivage commence le lendemain.

const DAY = 86400000;
const DEFAULT_DAYS = 30;
const MAX_DELETIONS_PER_RUN = 50; // = nombre maximum de comptes archivés par passage
const ARCHIVE = 'archived_accounts';
// Documents dont l'identifiant EST l'identifiant de la personne : copiés puis retirés.
const SINGLE_ARCHIVE = ['users', 'public_profiles', 'location_profiles', 'location_private', 'shop_profiles'];
// Documents retrouvés par un champ (propriétaire) : copiés puis retirés.
const QUERY_ARCHIVE = [['publications', 'sellerUid'], ['location_lookup', 'uid'], ['location_devices', 'ownerUid'], ['emergency_contacts', 'ownerUid']];
// Éléments sensibles / éphémères : effacés, jamais copiés (position en direct, historique de position, SOS, liens de partage).
const SINGLE_PURGE = ['location_live', 'sos_sessions', 'presence'];
const QUERY_PURGE = [['location_history', 'ownerUid'], ['location_links', 'ownerUid']];
const ARCHIVABLE = new Set(SINGLE_ARCHIVE.concat(QUERY_ARCHIVE.map((x) => x[0])));
const MAX_ARCHIVE_ITEMS = 1500;
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
async function recordSeen({ db, admin, uid, req, claims, now = Date.now() }) {
  if (!uid) return { ok: false };
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists || (claims && claims.archived === true)) {
    // Filet de sécurité : la fiche manque (ou le compte porte encore le drapeau « archivé »), le compte a peut-être été
    // mis de côté pour inactivité → on le récupère. Sans archive, restoreAccount ne fait rien.
    if (admin) {
      try {
        const r = await restoreAccount({ db, admin, uid, now });
        if (r.restored) return { ok: true, restored: true };
      } catch (e) { console.error('[inactive-cleanup] récupération (vu) :', e && e.message); }
    }
    if (!snap.exists) return { ok: false };
  }
  const d = snap.data() || {};
  const country = countryFromReq(req);
  const patch = {};
  if (country && d.country !== country) patch.country = country;
  // Une écriture au plus toutes les 3 heures par personne : suffisant pour savoir si le compte est vivant.
  if (now - ms(d.lastSeenAt) > 3 * 3600000) patch.lastSeenAt = new Date(now).toISOString();
  if (Object.keys(patch).length) await ref.update(patch);
  return { ok: true, country: country || d.country || null };
}

/* ---------------------------------------------------------------- 2) archivage des comptes inactifs */
async function batchedDelete(db, refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const b = db.batch();
    refs.slice(i, i + 400).forEach((r) => b.delete(r));
    await b.commit();
  }
}
async function batchedSet(db, entries) {
  for (let i = 0; i < entries.length; i += 400) {
    const b = db.batch();
    entries.slice(i, i + 400).forEach(([r, data]) => b.set(r, data));
    await b.commit();
  }
}
async function purgeWhere(db, name, field, uid) {
  const snap = await db.collection(name).where(field, '==', uid).get();
  await batchedDelete(db, (snap.docs || []).map((x) => x.ref));
}
const itemKey = (col, id) => col + '__' + id;

// Tout ce qui doit être copié puis retiré pour cette personne.
async function collectItems({ db, uid }) {
  const items = [];
  for (const col of SINGLE_ARCHIVE) {
    const s = await db.collection(col).doc(uid).get();
    if (s.exists) items.push({ col, id: uid, data: s.data() || {} });
  }
  for (const [col, field] of QUERY_ARCHIVE) {
    const s = await db.collection(col).where(field, '==', uid).limit(MAX_ARCHIVE_ITEMS + 1).get();
    for (const d of s.docs || []) items.push({ col, id: d.id, data: d.data() || {} });
    if (items.length > MAX_ARCHIVE_ITEMS) { const e = new Error('too_big'); e.code = 'too_big'; throw e; }
  }
  return items;
}

async function setClaims(admin, uid, mutate) {
  const rec = await admin.auth().getUser(uid);
  const cur = Object.assign({}, rec.customClaims || {});
  mutate(cur);
  await admin.auth().setCustomUserClaims(uid, Object.keys(cur).length ? cur : null);
}

// Met le compte de côté SANS rien détruire : copie complète, puis retrait de l'application.
// Ordre voulu : copies → fiche d'archive → drapeau sur le compte de connexion → retrait des originaux (la fiche « users » en dernier).
async function archiveAccount({ db, admin, uid, now = Date.now(), lastActivityAt = null, reason = 'inactive' }) {
  const items = await collectItems({ db, uid });
  const user = (items.find((i) => i.col === 'users') || {}).data || {};
  const at = new Date(now).toISOString();
  const arch = db.collection(ARCHIVE).doc(uid);

  await batchedSet(db, items.map((i) => [arch.collection('items').doc(itemKey(i.col, i.id)), { col: i.col, id: i.id, data: i.data }]));
  await arch.set({
    uid, status: 'archived', reason, archivedAt: at,
    lastActivityAt: lastActivityAt ? new Date(lastActivityAt).toISOString() : null,
    name: String(user.name || '').slice(0, 120), email: String(user.email || '').slice(0, 200),
    phone: String(user.phone || '').slice(0, 40), country: user.country || null,
    itemCount: items.length, publications: items.filter((i) => i.col === 'publications').length
  });
  await setClaims(admin, uid, (c) => { c.archived = true; });

  // Retrait des originaux : d'abord tout sauf la fiche « users », puis la fiche « users ».
  const others = items.filter((i) => i.col !== 'users');
  await batchedDelete(db, others.map((i) => db.collection(i.col).doc(i.id)));
  const safe = async (fn) => { try { await fn(); } catch (e) { console.error('[inactive-cleanup]', e && e.message); } };
  for (const [n, f] of QUERY_PURGE) await safe(() => purgeWhere(db, n, f, uid));
  for (const n of SINGLE_PURGE) await safe(() => db.collection(n).doc(uid).delete());
  try {
    await db.collection('users').doc(uid).delete();
  } catch (e) {
    // La fiche est restée : le compte n'est donc pas archivé, on retire le drapeau et la fiche d'archive.
    await safe(() => setClaims(admin, uid, (c) => { delete c.archived; }));
    await safe(() => deleteArchive({ db, uid }));
    throw e;
  }
  return { items: items.length };
}

// Efface la copie d'archive (fiche + éléments). Ne touche ni au compte de connexion ni aux données vivantes.
async function deleteArchive({ db, uid }) {
  const arch = db.collection(ARCHIVE).doc(uid);
  const items = await arch.collection('items').get();
  await batchedDelete(db, (items.docs || []).map((d) => d.ref));
  await arch.delete();
}

/* ---------------------------------------------------------------- 3) retour de la personne : tout est remis en place */
// Idempotent et prudent : n'écrase jamais une donnée vivante, sauf la fiche vide recréée automatiquement par l'application
// entre l'archivage et ce retour (même cas qu'une inscription interrompue) : celle-là est remplacée par la vraie fiche.
async function restoreAccount({ db, admin, uid, now = Date.now() }) {
  if (!uid) return { restored: false };
  const arch = db.collection(ARCHIVE).doc(uid);
  const metaSnap = await arch.get();
  if (!metaSnap.exists) return { restored: false };
  const meta = metaSnap.data() || {};
  const itemsSnap = await arch.collection('items').get();
  const items = (itemsSnap.docs || []).map((d) => d.data() || {}).filter((x) => x.col && x.id && ARCHIVABLE.has(x.col) && x.data && typeof x.data === 'object');
  const at = new Date(now).toISOString();

  const liveUser = await db.collection('users').doc(uid).get();
  const liveCreated = liveUser.exists ? ms((liveUser.data() || {}).createdAt) : 0;
  // Fiche vivante « neuve » = créée après l'archivage, ou sans date de création (fiche partielle apparue sans la vraie).
  const recreated = liveUser.exists && ms(meta.archivedAt) > 0 && (liveCreated === 0 || liveCreated >= ms(meta.archivedAt));

  // 1) la fiche personnelle d'abord (c'est elle qui fait « revenir » le compte), puis le reste
  const order = items.slice().sort((a, b) => (a.col === 'users' ? -1 : 0) - (b.col === 'users' ? -1 : 0));
  for (const it of order) {
    const ref = db.collection(it.col).doc(it.id);
    const live = it.col === 'users' ? liveUser : await ref.get();
    const single = SINGLE_ARCHIVE.indexOf(it.col) >= 0;
    if (!live.exists) {
      await ref.set(it.col === 'users' ? Object.assign({}, it.data, { lastSeenAt: at, restoredAt: at }) : it.data);
    } else if (single && recreated && (it.col === 'users' || it.col === 'public_profiles')) {
      const cur = live.data() || {};
      const merged = Object.assign({}, cur, it.data);
      if (it.col === 'users') { merged.lastSeenAt = at; merged.restoredAt = at; }
      await ref.set(merged);
    }
  }
  if (!items.some((i) => i.col === 'users') && !liveUser.exists) {
    // Cas extrême (archive sans fiche personnelle) : on ne laisse pas la personne sans fiche.
    await db.collection('users').doc(uid).set({ name: meta.name || 'Membre', email: meta.email || '', balance: 0, createdAt: at, restoredAt: at, lastSeenAt: at });
  }

  // 2) le compte de connexion n'est plus « archivé », puis l'archive est effacée
  await setClaims(admin, uid, (c) => { delete c.archived; });
  await deleteArchive({ db, uid });
  const name = ((items.find((i) => i.col === 'users') || {}).data || {}).name || meta.name || '';
  return { restored: true, name, items: items.length };
}

/* ---------------------------------------------------------------- 4) outils de l'administrateur */
async function listArchives({ db, limit = 100 }) {
  const snap = await db.collection(ARCHIVE).orderBy('archivedAt', 'desc').limit(Math.min(200, Math.max(1, limit))).get();
  return (snap.docs || []).map((d) => {
    const m = d.data() || {};
    return { uid: d.id, name: m.name || '', email: m.email || '', phone: m.phone || '', country: m.country || null, archivedAt: m.archivedAt || null, lastActivityAt: m.lastActivityAt || null, publications: m.publications || 0, itemCount: m.itemCount || 0 };
  });
}

// Suppression DÉFINITIVE d'un compte archivé (action de l'administrateur) : copie d'archive + compte de connexion.
// Refusée si le compte n'est pas archivé : on ne peut pas supprimer ainsi un compte vivant.
async function purgeArchivedAccount({ db, admin, uid, ADMIN_UID }) {
  if (!uid || uid === ADMIN_UID) return { purged: false, reason: 'protected' };
  const meta = await db.collection(ARCHIVE).doc(uid).get();
  if (!meta.exists) return { purged: false, reason: 'not_archived' };
  await deleteArchive({ db, uid });
  try { await admin.auth().deleteUser(uid); } catch (e) { if (!(e && e.code === 'auth/user-not-found')) throw e; }
  return { purged: true };
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
  let token, pages = 0, examined = 0, alreadyArchived = 0;
  do {
    const page = await admin.auth().listUsers(1000, token);
    pages++;
    for (const u of page.users || []) {
      examined++;
      if (u.uid === ADMIN_UID) continue;
      if (u.customClaims && u.customClaims.archived) { alreadyArchived++; continue; } // déjà mis de côté
      const m = u.metadata || {};
      const last = Math.max(ms(m.lastRefreshTime), ms(m.lastSignInTime), ms(m.creationTime));
      if (last && last < limitMs) candidates.push({ uid: u.uid, authLast: last });
    }
    token = page.pageToken;
  } while (token && pages < maxPages && candidates.length < maxDeletions * 6);
  const scanComplete = !token;

  // 2) contrôle fin, un par un
  let archived = 0, wouldArchive = 0, keptMoney = 0, keptContent = 0, keptActive = 0, keptTooBig = 0, errors = 0;
  for (const c of candidates) {
    if (archived >= maxDeletions) break;
    try {
      const [uSnap, pSnap] = await Promise.all([db.collection('users').doc(c.uid).get(), db.collection('presence').doc(c.uid).get()]);
      const u = (uSnap.exists && uSnap.data()) || {};
      const p = (pSnap.exists && pSnap.data()) || {};
      const last = Math.max(c.authLast, ms(p.lastActiveAt), ms(u.lastSeenAt), ms(u.createdAt));
      if (last >= limitMs) { keptActive++; continue; }
      if ((Number(u.balance) || 0) > 0) { keptMoney++; continue; }
      if (await hasContent({ db, uid: c.uid })) { keptContent++; continue; }
      if (!uSnap.exists) { keptActive++; continue; } // pas de fiche : rien à mettre de côté (compte à moitié créé), on n'y touche pas
      if (dryRun) { wouldArchive++; continue; }
      await archiveAccount({ db, admin, uid: c.uid, now, lastActivityAt: last });
      archived++;
    } catch (e) {
      if (e && e.code === 'too_big') { keptTooBig++; continue; }
      errors++;
      console.error('[inactive-cleanup] compte ignoré :', c.uid, e && e.message);
    }
  }

  const at = new Date(now).toISOString();
  const result = { days, dryRun, examined, candidates: candidates.length, archived, wouldArchive, keptMoney, keptContent, keptActive, keptTooBig, errors };
  if (scanComplete) result.archivedTotal = alreadyArchived + archived;
  try {
    const patch = { enabled: cfg.enabled !== false, days, lastRunAt: at, lastResult: result, totalArchived: (Number(cfg.totalArchived) || 0) + archived };
    if (!cfg.armedAt) patch.armedAt = at;
    await cfgRef.set(patch, { merge: true });
    await db.collection('inactive_cleanup_logs').add(Object.assign({ at }, result));
  } catch (e) { console.error('[inactive-cleanup] journal :', e && e.message); }
  return result;
}

module.exports = {
  recordSeen, runInactiveCleanup, countryFromReq, DEFAULT_DAYS,
  archiveAccount, restoreAccount, deleteArchive, listArchives, purgeArchivedAccount, ARCHIVE
};
