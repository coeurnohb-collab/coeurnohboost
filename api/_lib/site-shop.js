// api/_lib/site-shop.js
// Vente en ligne des sites « Crée ton site » : produits du vendeur, moyens de paiement du vendeur, commande du visiteur.
// Tout est VALIDÉ ICI, côté serveur : le total d'une commande est recalculé d'après le catalogue publié,
// jamais d'après ce que le navigateur annonce. Module partagé (pas une fonction Vercel).

const { parsePrice } = require('./site-extras');

const MAX_PRODUCTS = 200;
const MAX_LINES = 30;
const PAY_METHODS = ['cod', 'momo', 'whatsapp', 'gw1', 'gw2', 'gw3', 'gw4'];
const MAX_GATEWAYS = 4;
// Passerelles que le vendeur peut brancher lui-même : il colle SON lien de paiement, l'argent arrive chez lui (jamais chez nous).
// Dans le lien : {amount} = montant total, {currency} = devise (USD, EUR, CDF, XAF), {ref} = numéro de commande.
const GATEWAYS = ['paypal', 'stripe', 'flutterwave', 'paystack', 'cinetpay', 'paydunya', 'fedapay', 'kkiapay', 'wave', 'orange', 'mpesa', 'lygos', 'pawapay', 'other'];
const GATEWAY_LABEL = { paypal: 'PayPal', stripe: 'Stripe', flutterwave: 'Flutterwave', paystack: 'Paystack', cinetpay: 'CinetPay', paydunya: 'PayDunya', fedapay: 'FedaPay', kkiapay: 'KKiaPay', wave: 'Wave', orange: 'Orange Money', mpesa: 'M-Pesa', lygos: 'Lygos', pawapay: 'PawaPay', other: 'Autre passerelle' };
const ISO = { '$': 'USD', '€': 'EUR', 'FC': 'CDF', 'FCFA': 'XAF' };

function clean(v, n, keepNewlines) {
  let s = String(v == null ? '' : v);
  s = keepNewlines ? s.replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f<>]/g, ' ') : s.replace(/[\u0000-\u001f<>]/g, ' ');
  return s.trim().slice(0, n);
}
function httpsLink(v, n) {
  const s = String(v == null ? '' : v).trim();
  if (!s || s.length > (n || 300)) return '';
  try { const u = new URL(s); return u.protocol === 'https:' ? u.toString() : ''; } catch (e) { return ''; }
}

// Lien de passerelle : https obligatoire ; les mots {amount} {currency} {ref} sont gardés tels quels (remplacés au moment de payer).
function gatewayUrl(v) {
  const t = String(v == null ? '' : v).trim();
  if (!t || t.length > 400 || /[\s"'<>\\]/.test(t) || !/^https:\/\//i.test(t)) return '';
  try { const u = new URL(t.replace(/\{(amount|currency|ref)\}/g, 'x')); return u.protocol === 'https:' && u.hostname.indexOf('.') > 0 ? t : ''; } catch (e) { return ''; }
}
function fillGateway(tpl, vals) {
  return String(tpl || '').replace(/\{(amount|currency|ref)\}/g, (m, k) => encodeURIComponent(vals && vals[k] != null ? vals[k] : ''));
}

// Produits : { name*, price*, oldPrice, desc, image, category, badge }. imageOk(url) décide quelles adresses de photo sont acceptées.
function normalizeProducts(list, imageOk) {
  const ok = typeof imageOk === 'function' ? imageOk : () => '';
  const out = [];
  (Array.isArray(list) ? list : []).slice(0, MAX_PRODUCTS).forEach((p) => {
    if (!p || typeof p !== 'object') return;
    const name = clean(p.name, 80);
    if (!name) return;
    const item = { name, price: clean(p.price, 40), desc: clean(p.desc, 160) };
    const old = clean(p.oldPrice, 40); if (old) item.oldPrice = old;
    const cat = clean(p.category, 30); if (cat) item.category = cat;
    const badge = clean(p.badge, 20); if (badge) item.badge = badge;
    const img = ok(p.image); if (img) item.image = img;
    out.push(item);
  });
  return out;
}

// Le catalogue PUBLIÉ : exactement la liste que la page affiche (articles sans nom ignorés), avec les réglages de boutique ajoutés.
// Les réglages (catégorie, ancien prix, étiquette) sont gardés à part dans « shopMeta » : l'éditeur du site réécrit « services »
// à chaque enregistrement et les effacerait sinon.
function catalog(site) {
  const list = (Array.isArray(site && site.services) ? site.services : []).filter((s) => s && s.name);
  return applyShopMeta(list, site && site.shopMeta);
}
function applyShopMeta(list, meta) {
  const by = {};
  (Array.isArray(meta) ? meta : []).forEach((m) => { if (m && m.n) by[String(m.n).toLowerCase()] = m; });
  return list.map((sv) => {
    const m = by[String(sv.name || '').toLowerCase()];
    if (!m) return sv;
    const o = Object.assign({}, sv);
    if (m.category) o.category = m.category;
    if (m.oldPrice) o.oldPrice = m.oldPrice;
    if (m.badge) o.badge = m.badge;
    return o;
  });
}
// Sépare la liste envoyée par le vendeur en : services (nom, prix, description, photo : ce que l'éditeur connaît) et réglages de boutique.
function splitProducts(products) {
  const services = [], meta = [];
  products.forEach((p) => {
    const sv = { name: p.name, price: p.price, desc: p.desc || '' };
    if (p.image) sv.image = p.image;
    services.push(sv);
    if (p.category || p.oldPrice || p.badge) meta.push({ n: p.name, category: p.category || '', oldPrice: p.oldPrice || '', badge: p.badge || '' });
  });
  return { services, meta };
}

// Moyens de paiement du vendeur (affichés au visiteur au moment de commander).
//  cod : payer à la livraison / en boutique ; momo : numéros Mobile Money du vendeur ; link : lien de paiement (carte, PayPal, etc.).
function normalizePayment(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const momo = [];
  (Array.isArray(r.momo) ? r.momo : []).slice(0, 12).forEach((m) => {
    if (momo.length >= 4 || !m || typeof m !== 'object') return;
    const num = clean(m.num, 30).replace(/[^\d+\s-]/g, '').trim();
    if (num.replace(/\D/g, '').length < 6) return;
    momo.push({ op: clean(m.op, 30), num, name: clean(m.name, 60) });
  });
  const gateways = [];
  (Array.isArray(r.gateways) ? r.gateways : []).slice(0, 12).forEach((g) => {
    if (gateways.length >= MAX_GATEWAYS || !g || typeof g !== 'object') return;
    const url = gatewayUrl(g.url);
    if (!url) return;
    const id = GATEWAYS.indexOf(g.id) >= 0 ? g.id : 'other';
    gateways.push({ id, label: clean(g.label, 30) || GATEWAY_LABEL[id], url });
  });
  // Ancien format (un seul lien) : repris comme première passerelle.
  if (!gateways.length) { const old = gatewayUrl(r.link); if (old) gateways.push({ id: 'other', label: clean(r.linkLabel, 30) || 'Paiement en ligne', url: old }); }
  return {
    orders: !(r.orders === false || r.orders === 0 || r.orders === 'false'),
    cod: r.cod === true || r.cod === 1 || r.cod === 'true',
    momo,
    gateways,
    note: clean(r.note, 160)
  };
}

// Moyens proposés au visiteur : [{ k, label }]. WhatsApp reste toujours possible (commande sans paiement en ligne).
function paymentChoices(p, hasWhatsapp) {
  const n = normalizePayment(p);
  const out = [];
  if (n.cod) out.push({ k: 'cod', label: 'Payer à la livraison' });
  if (n.momo.length) out.push({ k: 'momo', label: 'Mobile Money' });
  n.gateways.forEach((g, i) => out.push({ k: 'gw' + (i + 1), label: /^payer/i.test(g.label) ? g.label : 'Payer avec ' + g.label, url: g.url }));
  if (hasWhatsapp) out.push({ k: 'whatsapp', label: 'Convenir sur WhatsApp' });
  if (!out.length) out.push({ k: 'cod', label: 'Payer à la livraison' });
  return out;
}

// Référence courte lisible, ex. « C4K7P2 ».
function orderRef(rand) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'C';
  for (let i = 0; i < 5; i++) s += A[Math.floor((rand ? rand() : Math.random()) * A.length)];
  return s;
}

// Format fixe (ne dépend pas des langues installées sur le serveur) : 12 500 ou 1 250,5
function fmt(n) {
  const r = Math.round(n * 100) / 100;
  const parts = String(r).split('.');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + (parts[1] ? ',' + parts[1] : '');
}

// Construit la commande à partir du catalogue PUBLIÉ. lines : [{ i, n, q }].
// Lève une erreur { status, message } si quelque chose ne correspond pas.
function buildOrder(site, raw) {
  const err = (status, message) => Object.assign(new Error(message), { status });
  const services = catalog(site);
  const lines = Array.isArray(raw && raw.lines) ? raw.lines.slice(0, MAX_LINES) : [];
  if (!lines.length) throw err(400, 'Votre panier est vide.');
  const items = [];
  const sums = {};
  let count = 0;
  const seen = {};
  for (const l of lines) {
    const i = Number(l && l.i);
    const q = Math.round(Number(l && l.q));
    if (!Number.isInteger(i) || i < 0 || i >= services.length || !(q >= 1) || q > 99) throw err(400, 'Panier invalide.');
    if (seen[i]) throw err(400, 'Panier invalide.');
    seen[i] = true;
    const sv = services[i];
    if (!sv || !sv.name) throw err(409, 'Le catalogue a changé. Rechargez la page.');
    if (clean(l.n, 80) !== clean(sv.name, 80)) throw err(409, 'Le catalogue a changé. Rechargez la page.');
    const pp = parsePrice(sv.price);
    if (!pp) throw err(400, 'Un article n’est pas disponible à la commande en ligne.');
    items.push({ n: clean(sv.name, 80), q, a: pp.amount, c: pp.cur });
    sums[pp.cur] = (sums[pp.cur] || 0) + pp.amount * q;
    count += q;
  }
  const curs = Object.keys(sums);
  const total = curs.map((c) => fmt(sums[c]) + (c ? ' ' + c : '')).join(' + ');
  const one = curs.length === 1;
  return { items, count, total, cur: one ? curs[0] : '', iso: one ? (ISO[curs[0]] || '') : '', amount: one ? Math.round(sums[curs[0]] * 100) / 100 : 0 };
}

// Client : nom, téléphone, adresse, note, moyen de paiement (parmi ceux proposés par le vendeur).
function buildCustomer(site, raw, hasWhatsapp) {
  const err = (status, message) => Object.assign(new Error(message), { status });
  const b = raw && typeof raw === 'object' ? raw : {};
  const name = clean(b.name, 60), phone = clean(b.phone, 30);
  if (!name) throw err(400, 'Indiquez votre nom.');
  if (phone.replace(/\D/g, '').length < 6) throw err(400, 'Indiquez un numéro de téléphone valide.');
  const choices = paymentChoices(site && site.payment, hasWhatsapp);
  let pay = String(b.pay || '');
  let ch = choices.filter((c) => c.k === pay)[0];
  if (!ch) { ch = choices[0]; pay = ch.k; }
  return {
    name, phone,
    address: clean(b.address, 200),
    note: clean(b.note, 300, true),
    pay,
    payLabel: ch.label,
    payRef: pay === 'momo' ? clean(b.payRef, 40) : ''
  };
}

module.exports = { GATEWAYS, GATEWAY_LABEL, MAX_GATEWAYS, ISO, gatewayUrl, fillGateway, catalog, applyShopMeta, splitProducts, MAX_PRODUCTS, MAX_LINES, PAY_METHODS, normalizeProducts, normalizePayment, paymentChoices, buildOrder, buildCustomer, orderRef };
