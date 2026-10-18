// api/_lib/site-extras.js
// Options avancees des mini-sites : horaires d'ouverture structures (badge « Ouvert maintenant »)
// et panier WhatsApp. Stockees dans mini_sites/{uid}.extras, ecrites par le SERVEUR (aucune regle Firestore a ouvrir).
// openStatus() est aussi injectee telle quelle dans la page publique (Function.toString) : elle doit rester autonome.

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeExtras(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const tz = Number.isFinite(Number(r.tz)) ? Math.min(14, Math.max(-12, Math.round(Number(r.tz) * 2) / 2)) : 1;
  const wk = Array.isArray(r.week) ? r.week : [];
  const week = [];
  for (let i = 0; i < 7; i++) {
    const w = wk[i] && typeof wk[i] === 'object' ? wk[i] : {};
    const o = HM.test(String(w.o)) ? String(w.o) : '08:00', c = HM.test(String(w.c)) ? String(w.c) : '18:00';
    week.push({ x: w.x === true || w.x === 1 || w.x === 'true', o, c });
  }
  const hoursOn = r.hoursOn === true && wk.length > 0;
  const cart = r.cart && typeof r.cart === 'object' ? r.cart : {};
  return { tz, hoursOn, week, cart: { on: cart.on === true, note: String(cart.note || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 120) } };
}

// Prix libre (« 10$ », « 5 000 FC », « à partir de 20 USD », « 15,50 € ») -> { amount, cur } ou null.
function parsePrice(s) {
  const t = String(s == null ? '' : s);
  const m = t.match(/(\d[\d\s., ]*)/); if (!m) return null;
  let n = m[1].replace(/[\s ]/g, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(n)) n = n.replace(/[.,]/g, ''); else n = n.replace(',', '.');
  const amount = parseFloat(n); if (!isFinite(amount) || amount <= 0) return null;
  const rest = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[1].length)).toLowerCase();
  let cur = '';
  if (/\$|usd|dollar/.test(rest)) cur = '$'; else if (/€|eur/.test(rest)) cur = '€'; else if (/\bfc\b|cdf|franc/.test(rest)) cur = 'FC'; else if (/fcfa|xaf|xof|cfa/.test(rest)) cur = 'FCFA';
  return { amount, cur };
}

// Autonome (aucune dependance) : renvoie { open, label } pour une semaine, un decalage horaire et un instant donnes.
function openStatus(week, tz, nowMs) {
  var D = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  var d = new Date(nowMs + tz * 3600000), day = (d.getUTCDay() + 6) % 7, min = d.getUTCHours() * 60 + d.getUTCMinutes();
  function mins(s) { return parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(3), 10); }
  var cur = week[day], prev = week[(day + 6) % 7];
  if (cur && !cur.x) {
    var o = mins(cur.o), c = mins(cur.c);
    if (c > o && min >= o && min < c) return { open: true, label: 'Ouvert · ferme à ' + cur.c };
    if (c <= o && min >= o) return { open: true, label: 'Ouvert · ferme à ' + cur.c };
  }
  if (prev && !prev.x) { var po = mins(prev.o), pc = mins(prev.c); if (pc <= po && min < pc) return { open: true, label: 'Ouvert · ferme à ' + prev.c }; }
  for (var i = 0; i < 7; i++) {
    var w = week[(day + i) % 7]; if (!w || w.x) continue;
    if (i === 0 && min >= mins(w.o)) continue;
    return { open: false, label: 'Fermé · ouvre ' + (i === 0 ? "aujourd'hui" : i === 1 ? 'demain' : D[(day + i) % 7]) + ' à ' + w.o };
  }
  return { open: false, label: 'Fermé' };
}

async function saveSiteExtras(db, uid, body) {
  const ref = db.collection('mini_sites').doc(uid), snap = await ref.get();
  if (!snap.exists) throw new Error('Crée d’abord ton site.');
  const ex = normalizeExtras(body && body.extras);
  await ref.update({ extras: ex, updatedAt: new Date().toISOString() });
  return { success: true, extras: ex };
}

module.exports = { normalizeExtras, parsePrice, openStatus, saveSiteExtras, DAYS };
