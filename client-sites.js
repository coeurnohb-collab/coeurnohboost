// api/_lib/client-sites.js : « Créer le site pour un client ».
// Une personne (l'agent) prépare le site d'un client ou d'un ami : le serveur crée le compte du client, l'agent entre dans ce compte
// pour construire le site, puis « remet » le site : le client reçoit son e-mail + un mot de passe neuf, l'agent revient dans son propre compte
// et n'a plus aucun accès à celui du client.
// Collection client_sites/{uidDuClient} : ÉCRITE ET LUE PAR LE SERVEUR SEULEMENT (aucune règle Firestore à ouvrir).
// Rien d'autre que le serveur ne peut changer le mot de passe, ni passer d'un compte à l'autre : la clé de retour (returnKey) reste
// dans le téléphone de l'agent, seule son empreinte SHA-256 est gardée ici.
'use strict';
const crypto = require('crypto');

const MAX_CLIENTS = 30;          // projets clients par agent
const MAX_NEW_PER_DAY = 8;       // créations par jour et par agent
const MIN_FUND = 1, MAX_FUND = 500;
const PW_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
function fail(status, message, code) { const e = new Error(message); e.status = status; if (code) e.code = code; return e; }
function newPassword() { let p = ''; for (let i = 0; i < 10; i++) p += PW_ALPHABET[crypto.randomInt(PW_ALPHABET.length)]; return p; }
function sameKey(stored, given) {
  const a = Buffer.from(String(stored || ''), 'hex'), b = Buffer.from(sha(given), 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function createClientSites({ db, admin, siteOrigin }) {
  const col = () => db.collection('client_sites');
  const FV = () => admin.firestore.FieldValue;

  async function recOf(uid) {
    const s = await col().doc(uid).get();
    return s.exists ? s.data() : null;
  }
  // Un compte qui est lui-même un projet client en cours ne peut pas créer d'autres projets, ni transférer de l'argent.
  async function assertNotClientSession(uid) {
    const r = await recOf(uid);
    if (r && r.status === 'building') throw fail(403, 'Vous êtes dans le compte d’un client. Revenez d’abord à votre compte.', 'in_client_mode');
  }
  async function ownRecord(agentUid, clientUid) {
    const id = clean(clientUid, 128);
    if (!id || /\//.test(id)) throw fail(400, 'Client introuvable.');
    const r = await recOf(id);
    if (!r || r.agentUid !== agentUid) throw fail(404, 'Client introuvable.');
    return r;
  }
  async function clearPush(uid) {
    try { await db.collection('users').doc(uid).update({ fcmTokens: [], fcmToken: FV().delete() }); } catch (e) { /* le compte n'a peut-être pas de jeton */ }
  }
  // Compte client en cours de construction + clé de retour valable, sinon refus.
  async function activeSession(uid, returnKey) {
    const r = await recOf(uid);
    if (!r || r.status !== 'building') throw fail(403, 'Cette action n’est possible que dans le compte d’un client que vous préparez.');
    if (!sameKey(r.returnHash, returnKey)) throw fail(403, 'Clé de retour invalide. Reconnectez-vous avec votre propre compte.');
    return r;
  }

  async function create(agentUid, agentName, b) {
    await assertNotClientSession(agentUid);
    const name = clean(b.name, 60), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 24).replace(/[^\d+ ]/g, '').trim();
    if (name.length < 2) throw fail(400, 'Écrivez le nom de l’entreprise ou du projet du client.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) throw fail(400, 'Adresse e-mail du client invalide. Exemple : client@gmail.com');
    const mine = await col().where('agentUid', '==', agentUid).limit(MAX_CLIENTS + 1).get();
    if (mine.docs.length >= MAX_CLIENTS) throw fail(400, 'Vous avez atteint la limite de ' + MAX_CLIENTS + ' sites clients. Remettez ou supprimez un projet terminé.');
    const day = new Date().toISOString().slice(0, 10);
    if (mine.docs.filter((d) => String(d.data().createdAt || '').slice(0, 10) === day).length >= MAX_NEW_PER_DAY) throw fail(429, 'Trop de créations aujourd’hui. Réessayez demain.');
    try { await admin.auth().getUserByEmail(email); throw fail(409, 'Cette adresse e-mail a déjà un compte. Utilisez une autre adresse, ou demandez à cette personne de créer elle-même son site.', 'email_exists'); }
    catch (e) { if (!(e && e.code === 'auth/user-not-found')) throw e; }
    let user;
    try { user = await admin.auth().createUser({ email, password: crypto.randomBytes(24).toString('base64url'), displayName: name, emailVerified: false }); }
    catch (e) {
      if (e && e.code === 'auth/email-already-exists') throw fail(409, 'Cette adresse e-mail a déjà un compte. Utilisez une autre adresse.', 'email_exists');
      if (e && (e.code === 'auth/invalid-email' || e.code === 'auth/invalid-password')) throw fail(400, 'Adresse e-mail du client invalide.');
      throw e;
    }
    const now = new Date().toISOString();
    await db.collection('users').doc(user.uid).set({ name, email, balance: 0, createdAt: now });
    await col().doc(user.uid).set({ agentUid, agentName: clean(agentName, 60), clientUid: user.uid, clientName: name, clientEmail: email, clientPhone: phone, status: 'building', returnHash: '', createdAt: now });
    return { success: true, clientUid: user.uid, name, email };
  }

  // L'agent entre dans le compte du client : jeton de connexion + nouvelle clé de retour (gardée seulement sur son téléphone).
  async function enter(agentUid, b) {
    await assertNotClientSession(agentUid);
    const r = await ownRecord(agentUid, b.clientUid);
    if (r.status !== 'building') throw fail(409, 'Ce site a déjà été remis au client.');
    const returnKey = crypto.randomBytes(24).toString('hex');
    await col().doc(r.clientUid).update({ returnHash: sha(returnKey), enteredAt: new Date().toISOString() });
    await clearPush(r.clientUid);
    const customToken = await admin.auth().createCustomToken(r.clientUid, { cnClientMode: true });
    return { success: true, customToken, returnKey, client: { uid: r.clientUid, name: r.clientName, email: r.clientEmail, phone: r.clientPhone || '' } };
  }

  // Retour dans son propre compte, sans remettre le site.
  async function back(clientUid, b) {
    const r = await activeSession(clientUid, b.returnKey);
    const customToken = await admin.auth().createCustomToken(r.agentUid, { cnAgentReturn: true });
    await col().doc(clientUid).update({ returnHash: '' });
    await clearPush(clientUid);
    return { success: true, customToken };
  }

  // Remise : mot de passe neuf pour le client, l'agent perd l'accès, retour dans le compte de l'agent.
  async function handover(clientUid, b) {
    const r = await activeSession(clientUid, b.returnKey);
    const site = await db.collection('mini_sites').doc(clientUid).get();
    const sd = site.exists ? site.data() : null;
    if (!sd) throw fail(400, 'Créez d’abord le site du client avant de le remettre.', 'no_site');
    const password = newPassword();
    const customToken = await admin.auth().createCustomToken(r.agentUid, { cnAgentReturn: true });
    await admin.auth().updateUser(clientUid, { password });
    try { await admin.auth().revokeRefreshTokens(clientUid); } catch (e) { /* le mot de passe est déjà changé */ }
    await col().doc(clientUid).update({ status: 'handed', handedAt: new Date().toISOString(), returnHash: '' });
    await clearPush(clientUid);
    return {
      success: true, customToken, email: r.clientEmail, password, clientName: r.clientName,
      site: { name: sd ? String(sd.businessName || '') : '', slug: sd ? String(sd.slug || '') : '', published: !!(sd && sd.status === 'published'), url: sd && sd.slug ? siteOrigin + '/s/' + encodeURIComponent(sd.slug) : '' }
    };
  }

  async function list(agentUid) {
    const qs = await col().where('agentUid', '==', agentUid).limit(MAX_CLIENTS + 5).get();
    const rows = await Promise.all(qs.docs.map(async (d) => {
      const r = d.data();
      const [sn, un] = await Promise.all([db.collection('mini_sites').doc(r.clientUid).get(), db.collection('users').doc(r.clientUid).get()]);
      const s = sn.exists ? sn.data() : null, u = un.exists ? un.data() : null;
      const proUntil = s && s.premium && s.premiumUntil ? String(s.premiumUntil) : '';
      return {
        clientUid: r.clientUid, name: r.clientName || '', email: r.clientEmail || '', phone: r.clientPhone || '', status: r.status === 'handed' ? 'handed' : 'building', createdAt: r.createdAt || '', handedAt: r.handedAt || '',
        hasSite: !!s, siteName: s ? String(s.businessName || '') : '', slug: s ? String(s.slug || '') : '', published: !!(s && s.status === 'published'), pro: !!(proUntil && new Date(proUntil).getTime() > Date.now()),
        balance: r.status === 'handed' ? null : round2(u && u.balance)
      };
    }));
    rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { success: true, clients: rows, max: MAX_CLIENTS };
  }

  // Solde du portefeuille de l'agent -> portefeuille du client (pour payer le Pack Pro, un domaine, etc.). Seulement avant la remise.
  async function fund(agentUid, b) {
    await assertNotClientSession(agentUid);
    const r = await ownRecord(agentUid, b.clientUid);
    if (r.status !== 'building') throw fail(409, 'Ce site a déjà été remis au client.');
    const amount = round2(b.amount);
    if (!(amount >= MIN_FUND && amount <= MAX_FUND)) throw fail(400, 'Montant invalide : entre ' + MIN_FUND + ' et ' + MAX_FUND + ' $.');
    const { buildWalletTxEntry } = require('./wallet-ledger');
    const aRef = db.collection('users').doc(agentUid), cRef = db.collection('users').doc(r.clientUid);
    return db.runTransaction(async (tx) => {
      const [a, c] = await Promise.all([tx.get(aRef), tx.get(cRef)]);
      if (!a.exists || !c.exists) throw fail(404, 'Compte introuvable.');
      const ab = round2(a.data().balance), cb = round2(c.data().balance);
      if (ab < amount) throw fail(400, 'Solde insuffisant : il vous manque ' + round2(amount - ab) + ' $.', 'low_balance');
      const na = round2(ab - amount), nc = round2(cb + amount);
      tx.update(aRef, { balance: na });
      tx.update(cRef, { balance: nc });
      tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: agentUid, type: 'client_site_transfer', amount: -amount, balanceAfter: na, description: 'Solde ajouté au site client « ' + r.clientName + ' »', relatedId: r.clientUid }));
      tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: r.clientUid, type: 'client_site_transfer_in', amount, balanceAfter: nc, description: 'Solde reçu pour la préparation du site', relatedId: agentUid }));
      return { success: true, balance: na, clientBalance: nc };
    });
  }

  // Abandon d'un projet pas encore remis : le compte du client et son site sont supprimés, le solde restant revient à l'agent.
  async function remove(agentUid, b) {
    await assertNotClientSession(agentUid);
    const r = await ownRecord(agentUid, b.clientUid);
    if (r.status !== 'building') throw fail(409, 'Ce site a déjà été remis au client : il ne peut plus être supprimé d’ici.');
    const { buildWalletTxEntry } = require('./wallet-ledger');
    const aRef = db.collection('users').doc(agentUid), cRef = db.collection('users').doc(r.clientUid);
    await db.runTransaction(async (tx) => {
      const [a, c] = await Promise.all([tx.get(aRef), tx.get(cRef)]);
      const back2 = c.exists ? round2(c.data().balance) : 0;
      if (back2 > 0 && a.exists) {
        const na = round2(round2(a.data().balance) + back2);
        tx.update(aRef, { balance: na });
        tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: agentUid, type: 'client_site_refund', amount: back2, balanceAfter: na, description: 'Solde récupéré du site client « ' + r.clientName + ' » supprimé', relatedId: r.clientUid }));
      }
      if (c.exists) tx.update(cRef, { balance: 0 });
    });
    try { await admin.auth().deleteUser(r.clientUid); } catch (e) { if (!(e && e.code === 'auth/user-not-found')) throw e; }
    await db.collection('mini_sites').doc(r.clientUid).delete().catch(() => { });
    await db.collection('users').doc(r.clientUid).delete().catch(() => { });
    await col().doc(r.clientUid).delete();
    return { success: true };
  }

  return { create, enter, back, handover, list, fund, remove };
}

module.exports = { createClientSites, MAX_CLIENTS, MAX_NEW_PER_DAY };
