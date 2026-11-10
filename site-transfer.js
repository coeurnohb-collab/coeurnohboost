// api/_lib/site-transfer.js : « Donner mon site à quelqu'un ».
// Le propriétaire d'un site crée un code (et un lien) de transfert, valable 7 jours, à envoyer à la personne de son choix
// (WhatsApp, SMS…). Quand cette personne l'accepte avec son propre compte, le site lui appartient : elle le gère et paie
// l'abonnement (Pack Pro, domaine). L'ancien propriétaire n'a plus aucun accès.
//
// CE QUI CHANGE DE PROPRIÉTAIRE (tout se passe côté serveur, jamais depuis le navigateur) :
//   - la fiche du site (mini_sites/{uid}) : contenu, produits, photos, thème, adresse /s/{nom}, Pack Pro en cours ;
//   - la réservation de l'adresse (site_slugs/{nom}) ;
//   - le nom de domaine connecté au site (site_domains/{domaine}) ;
//   - les messages, commandes et demandes reçus (site_leads) et les statistiques (site_stats).
// CE QUI EST EFFACÉ pour la sécurité : les gestionnaires et invitations, les clés du site (site_secrets : lien de notification,
// clé d'API) et la connexion à un fournisseur (site_api_conns). Le portefeuille et le compte de l'ancien propriétaire ne bougent pas.
// REFUSÉ : site « Panel » avec revenus, achat de domaine en cours, compte administrateur, compte client en préparation.
// Collection site_transfers/{sha256(code)} : ÉCRITE ET LUE PAR LE SERVEUR SEULEMENT (aucune règle Firestore à ouvrir).
// Le code n'est jamais gardé : seule son empreinte SHA-256 sert d'identifiant.
'use strict';
const crypto = require('crypto');

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I, L, O, 0, 1 (faciles à confondre au téléphone)
const CODE_LEN = 12;
const VALID_DAYS = 7;
const MAX_CREATES_PER_DAY = 10;
const MOVE_ROUNDS = 10, MOVE_CHUNK = 200;
const ACTIVE_DOMAIN_ORDER = ['paid', 'purchasing', 'review', 'unknown'];

const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
function fail(status, message, code) { const e = new Error(message); e.status = status; if (code) e.code = code; return e; }
function newCode() { let c = ''; for (let i = 0; i < CODE_LEN; i++) c += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]; return c; }
// « k7hm-2qxp 9tra » -> « K7HM2QXP9TRA » ; null si ce n'est pas un code possible.
function normCode(raw) {
  const c = String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== CODE_LEN) return null;
  for (let i = 0; i < c.length; i++) if (CODE_ALPHABET.indexOf(c[i]) < 0) return null;
  return c;
}
const pretty = (c) => c.match(/.{1,4}/g).join('-');
const proActive = (s) => !!(s && s.premium && s.premiumUntil && new Date(s.premiumUntil).getTime() > Date.now());

function createSiteTransfer({ db, admin, push, siteOrigin, adminUid }) {
  const col = () => db.collection('site_transfers');
  const origin = siteOrigin || 'https://coeurnohuniverse.com';
  const nowIso = () => new Date().toISOString();

  async function siteOf(uid) {
    const s = await db.collection('mini_sites').doc(uid).get();
    return s.exists ? s.data() : null;
  }

  // Ce qui empêche de donner (ou de recevoir) le site, dit en mots simples. Liste vide = tout est possible.
  async function blockersFor(uid, site) {
    const out = [];
    if (uid === adminUid) out.push({ code: 'admin', message: 'Le site du compte administrateur ne peut pas être donné.' });
    if ((site.mpanel && site.mpanel.on) || (site.panel && site.panel.on)) {
      out.push({ code: 'panel', message: 'Ton site contient une boutique Panel (vente de services avec revenus). Désactive-la d’abord, puis reviens ici.' });
    }
    const [cs, dord] = await Promise.all([db.collection('client_sites').doc(uid).get(), db.collection('domain_orders').doc(uid).get()]);
    if (cs.exists && cs.data().status === 'building') out.push({ code: 'client_mode', message: 'Tu es dans le compte d’un client que tu prépares. Utilise plutôt « Remettre » au client.' });
    if (dord.exists && ACTIVE_DOMAIN_ORDER.indexOf(String(dord.data().status || '')) >= 0) out.push({ code: 'domain_order', message: 'Un achat de nom de domaine est en cours. Attends qu’il soit terminé, puis reviens ici.' });
    return out;
  }

  // Transferts en attente d'un propriétaire (les périmés sont marqués « expired » au passage).
  async function pendingOf(uid) {
    const qs = await col().where('fromUid', '==', uid).limit(20).get();
    const live = [];
    for (const d of qs.docs) {
      const r = d.data();
      if (r.status !== 'pending') continue;
      if (Date.parse(r.expiresAt) > Date.now()) live.push({ id: d.id, ref: d.ref || col().doc(d.id), data: r });
      else { try { await col().doc(d.id).update({ status: 'expired' }); } catch (e) { /* sans importance */ } }
    }
    return live;
  }

  async function status(uid) {
    const site = await siteOf(uid);
    if (!site) return { success: true, hasSite: false, pending: null, blockers: [] };
    const [pend, blockers] = await Promise.all([pendingOf(uid), blockersFor(uid, site)]);
    const p = pend[0] ? pend[0].data : null;
    return {
      success: true, hasSite: true,
      site: { name: clean(site.businessName, 80), slug: clean(site.slug, 60), proUntil: proActive(site) ? String(site.premiumUntil) : '', domain: clean(site.customDomain, 100), published: site.status === 'published', url: site.slug ? origin + '/s/' + encodeURIComponent(site.slug) : '' },
      pending: p ? { createdAt: p.createdAt, expiresAt: p.expiresAt } : null,
      blockers
    };
  }

  async function create(uid, fromName) {
    const site = await siteOf(uid);
    if (!site) throw fail(404, 'Tu n’as pas encore de site à donner.', 'no_site');
    const blockers = await blockersFor(uid, site);
    if (blockers.length) throw fail(409, blockers[0].message, blockers[0].code);
    const mine = await col().where('fromUid', '==', uid).limit(60).get();
    const day = nowIso().slice(0, 10);
    if (mine.docs.filter((d) => String(d.data().createdAt || '').slice(0, 10) === day).length >= MAX_CREATES_PER_DAY) throw fail(429, 'Trop de liens créés aujourd’hui. Réessaie demain.', 'too_many');
    for (const p of await pendingOf(uid)) await col().doc(p.id).update({ status: 'cancelled', cancelledAt: nowIso() });
    const code = newCode();
    const created = Date.now();
    const expiresAt = new Date(created + VALID_DAYS * 86400000).toISOString();
    await col().doc(sha(code)).set({
      fromUid: uid, fromName: clean(fromName, 60), slug: clean(site.slug, 60), siteName: clean(site.businessName, 80),
      status: 'pending', createdAt: new Date(created).toISOString(), expiresAt
    });
    return { success: true, code: pretty(code), link: origin + '/?site_transfer=' + code, expiresAt, siteName: clean(site.businessName, 80) };
  }

  async function cancel(uid) {
    let n = 0;
    for (const p of await pendingOf(uid)) { await col().doc(p.id).update({ status: 'cancelled', cancelledAt: nowIso() }); n++; }
    return { success: true, cancelled: n };
  }

  async function loadPending(rawCode) {
    const code = normCode(rawCode);
    if (!code) throw fail(404, 'Code invalide. Vérifie-le : il a 12 lettres et chiffres, par exemple K7HM-2QXP-9TRA.', 'bad_code');
    const snap = await col().doc(sha(code)).get();
    const r = snap.exists ? snap.data() : null;
    if (!r) throw fail(404, 'Code introuvable. Vérifie-le, ou demande-en un nouveau à la personne qui te donne le site.', 'unknown_code');
    if (r.status === 'done') throw fail(410, 'Ce code a déjà été utilisé.', 'used');
    if (r.status === 'cancelled') throw fail(410, 'Cette personne a annulé le transfert. Demande-lui un nouveau code.', 'cancelled');
    if (r.status !== 'pending' || !(Date.parse(r.expiresAt) > Date.now())) throw fail(410, 'Ce code a expiré. Demande-en un nouveau à la personne qui te donne le site.', 'expired');
    return { code, id: sha(code), rec: r };
  }

  // Ce que verra la personne avant d'accepter.
  async function preview(uid, rawCode) {
    const { rec } = await loadPending(rawCode);
    const site = await siteOf(rec.fromUid);
    if (!site) throw fail(410, 'Ce site n’existe plus.', 'gone');
    let reason = '';
    if (rec.fromUid === uid) reason = 'own';
    else if (await siteOf(uid)) reason = 'has_site';
    else {
      const cs = await db.collection('client_sites').doc(uid).get();
      if (cs.exists && cs.data().status === 'building') reason = 'client_mode';
    }
    return {
      success: true, canAccept: !reason, reason,
      transfer: {
        fromName: clean(rec.fromName, 60) || 'Un membre', expiresAt: rec.expiresAt,
        siteName: clean(site.businessName, 80), slug: clean(site.slug, 60), tagline: clean(site.tagline, 120), logoUrl: /^https:\/\//.test(String(site.logoUrl || '')) ? String(site.logoUrl) : '',
        published: site.status === 'published', proUntil: proActive(site) ? String(site.premiumUntil) : '', domain: clean(site.customDomain, 100),
        url: site.slug ? origin + '/s/' + encodeURIComponent(site.slug) : ''
      }
    };
  }

  // Déplace des documents d'un identifiant vers un autre, par petits lots (ne casse rien si ça s'arrête en route : on peut relancer).
  async function moveLeads(fromUid, toUid) {
    let moved = 0;
    for (let i = 0; i < MOVE_ROUNDS; i++) {
      const qs = await db.collection('site_leads').where('ownerUid', '==', fromUid).limit(MOVE_CHUNK).get();
      if (qs.empty || !qs.docs.length) break;
      const batch = db.batch();
      qs.docs.forEach((d) => batch.update(db.collection('site_leads').doc(d.id), { ownerUid: toUid }));
      await batch.commit();
      moved += qs.docs.length;
      if (qs.docs.length < MOVE_CHUNK) break;
    }
    return moved;
  }
  async function moveStats(fromUid, toUid) {
    let moved = 0;
    for (let i = 0; i < 5; i++) {
      const qs = await db.collection('site_stats').where('siteId', '==', fromUid).limit(MOVE_CHUNK).get();
      if (qs.empty || !qs.docs.length) break;
      const batch = db.batch();
      qs.docs.forEach((d) => {
        const r = d.data() || {};
        batch.set(db.collection('site_stats').doc(toUid + '_' + String(r.day || d.id.slice(fromUid.length + 1))), Object.assign({}, r, { siteId: toUid }));
        batch.delete(db.collection('site_stats').doc(d.id));
      });
      await batch.commit();
      moved += qs.docs.length;
      if (qs.docs.length < MOVE_CHUNK) break;
    }
    return moved;
  }

  async function accept(uid, toName, rawCode) {
    const { id, rec } = await loadPending(rawCode);
    const fromUid = rec.fromUid;
    if (fromUid === uid) throw fail(400, 'Ce site est déjà dans ton compte.', 'own');
    const csTo = await db.collection('client_sites').doc(uid).get();
    if (csTo.exists && csTo.data().status === 'building') throw fail(403, 'Tu es dans le compte d’un client. Reviens d’abord à ton propre compte.', 'client_mode');
    const fromSite0 = await siteOf(fromUid);
    if (!fromSite0) throw fail(410, 'Ce site n’existe plus.', 'gone');
    const blockers = await blockersFor(fromUid, fromSite0);
    if (blockers.length) throw fail(409, 'Ce site ne peut pas être transféré pour le moment : demande à la personne de vérifier son site.', blockers[0].code);

    const trRef = col().doc(id);
    const fromRef = db.collection('mini_sites').doc(fromUid), toRef = db.collection('mini_sites').doc(uid);
    const when = nowIso();
    const out = await db.runTransaction(async (tx) => {
      const [tr, fs, ts] = await Promise.all([tx.get(trRef), tx.get(fromRef), tx.get(toRef)]);
      const t = tr.exists ? tr.data() : null;
      if (!t || t.status !== 'pending' || !(Date.parse(t.expiresAt) > Date.now())) throw fail(410, 'Ce code n’est plus valable.', 'used');
      if (!fs.exists) throw fail(410, 'Ce site n’existe plus.', 'gone');
      if (ts.exists) throw fail(409, 'Tu as déjà un site. Pour recevoir celui-ci, supprime d’abord ton site actuel (ou donne-le à quelqu’un), puis réessaie.', 'has_site');
      const from = fs.data();
      const slug = clean(from.slug, 60);
      const slugRef = slug ? db.collection('site_slugs').doc(slug) : null;
      const dom = clean(from.customDomain, 100).toLowerCase();
      const domRef = dom ? db.collection('site_domains').doc(dom) : null;
      const [sl, dm] = await Promise.all([slugRef ? tx.get(slugRef) : null, domRef ? tx.get(domRef) : null]);

      const data = Object.assign({}, from, {
        ownerUid: uid, managers: [], managerList: [], invites: [], forClient: null, audience: 'self',
        transferredAt: when, updatedAt: when
      });
      tx.set(toRef, data);
      tx.delete(fromRef);
      if (slugRef) tx.set(slugRef, Object.assign({}, sl && sl.exists ? sl.data() : {}, { ownerUid: uid }));
      let domainMoved = false;
      if (domRef && dm && dm.exists && String(dm.data().ownerUid || '') === fromUid) { tx.set(domRef, Object.assign({}, dm.data(), { ownerUid: uid })); domainMoved = true; }
      tx.delete(db.collection('site_secrets').doc(fromUid));
      tx.delete(db.collection('site_api_conns').doc(fromUid));
      tx.update(trRef, { status: 'done', toUid: uid, toName: clean(toName, 60), doneAt: when });
      return { name: clean(from.businessName, 80), slug, proUntil: proActive(from) ? String(from.premiumUntil) : '', domain: dom, domainMoved, published: from.status === 'published' };
    });

    // Après le transfert : messages, commandes et statistiques suivent le site (si ça s'arrête en route, rien n'est perdu : ils restent lisibles par le support).
    const moved = { leads: 0, stats: 0 };
    try { moved.leads = await moveLeads(fromUid, uid); } catch (e) { /* le site est déjà transféré */ }
    try { moved.stats = await moveStats(fromUid, uid); } catch (e) { /* idem */ }

    const siteUrl = out.slug ? origin + '/s/' + encodeURIComponent(out.slug) : '';
    const safe = async (fn) => { try { await fn(); } catch (e) { /* secondaire */ } };
    await safe(() => db.collection('notifications').add({ uid: fromUid, title: 'Site transféré', body: 'Ton site « ' + out.name + ' » appartient maintenant à ' + (clean(toName, 60) || 'son nouveau propriétaire') + '.', type: 'site_transfer', url: '/', read: false, createdAt: when }));
    await safe(() => db.collection('notifications').add({ uid, title: 'Le site est à toi', body: 'Tu es maintenant propriétaire du site « ' + out.name + ' ». Pense à vérifier tes coordonnées et ton paiement.', type: 'site_transfer', url: '/', read: false, createdAt: when }));
    if (push) {
      await safe(() => push(fromUid, 'Site transféré', 'Ton site « ' + out.name + ' » a été accepté par ' + (clean(toName, 60) || 'son nouveau propriétaire') + '.', '/', { category: 'activity' }));
      await safe(() => push(uid, 'Le site est à toi', 'Tu es maintenant propriétaire de « ' + out.name + ' ».', '/', { category: 'activity' }));
    }
    await safe(() => db.collection('admin_audit').add({ at: when, adminUid: 'system', action: 'site_transfer', detail: JSON.stringify({ from: fromUid, to: uid, slug: out.slug, domain: out.domainMoved ? out.domain : '', leads: moved.leads }).slice(0, 400) }));

    return { success: true, site: { name: out.name, slug: out.slug, url: siteUrl, proUntil: out.proUntil, domain: out.domainMoved ? out.domain : '', published: out.published }, moved };
  }

  return { status, create, cancel, preview, accept };
}

module.exports = { createSiteTransfer, normCode, CODE_LEN, VALID_DAYS };
