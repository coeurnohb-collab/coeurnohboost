// api/_lib/site-formation.js
// « Programme et sessions » des mini-sites : formations, ateliers, cours, coaching.
// Données saisies par le propriétaire, VALIDÉES ICI par le serveur (rien n'est écrit tel quel dans la page publique),
// stockées dans mini_sites/{uid}.extras.formation par l'action serveur « site_extras » (aucune règle Firestore à ouvrir).
// Rendu : section « Programme et inscriptions » (fiches, prochaines sessions, étapes, badges) + données structurées Google (Course).

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MAX = { sessions: 12, steps: 6, badges: 6 };
const FREE_SESSIONS = 3;
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux'];
const MODES = ['Présentiel', 'En ligne', 'Hybride'];
const SUGGESTED_BADGES = ['Certificat délivré', 'Paiement échelonné possible', 'Places limitées', 'Formateurs expérimentés', 'Supports de cours inclus', 'Accompagnement après la formation'];
const STARTER_STEPS = [
  { title: 'Choisissez votre formation', text: 'Consultez le programme, la durée et le prix, puis choisissez la session qui vous convient.' },
  { title: 'Contactez-nous', text: 'Écrivez-nous sur WhatsApp ou remplissez le formulaire : nous répondons rapidement à vos questions.' },
  { title: 'Confirmez votre place', text: 'Nous vous indiquons les modalités de paiement et nous réservons votre place.' },
  { title: 'Commencez à apprendre', text: 'Rejoignez la session, suivez les cours et obtenez votre attestation à la fin.' }
];

// Texte libre -> texte sûr : plus de balises, de caractères de contrôle, invisibles ni de marques de sens d'écriture.
const BAD = new RegExp('[' + [[0, 31], [127, 159], [173, 173], [8203, 8207], [8232, 8238], [8288, 8303], [65279, 65279]].map((r) => String.fromCharCode(r[0]) + '-' + String.fromCharCode(r[1])).join('') + '<>]', 'g');
function clean(v, n) { return String(v == null ? '' : v).replace(BAD, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
function cleanDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v == null ? '' : v));
  if (!m) return '';
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2000 || y > 2100) return '';
  const t = new Date(Date.UTC(y, mo - 1, d));
  return (t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d) ? m[0] : '';
}
function cleanSeats(v) { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(9999, n) : 0; }

function normalizeFormation(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const m = r.meta && typeof r.meta === 'object' && !Array.isArray(r.meta) ? r.meta : {};
  const meta = { duration: clean(m.duration, 40), level: clean(m.level, 30), mode: clean(m.mode, 30), schedule: clean(m.schedule, 70), language: clean(m.language, 40), certificate: clean(m.certificate, 70) };
  const sessions = (Array.isArray(r.sessions) ? r.sessions : []).map((s) => {
    const o = s && typeof s === 'object' ? s : {};
    const date = cleanDate(o.date); let end = cleanDate(o.end);
    if (end && end < date) end = '';
    return { course: clean(o.course, 80), date, end, place: clean(o.place, 60), seats: cleanSeats(o.seats), price: clean(o.price, 40) };
  }).filter((s) => s.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(0, MAX.sessions);
  const steps = (Array.isArray(r.steps) ? r.steps : []).map((s) => {
    const o = s && typeof s === 'object' ? s : {};
    return { title: clean(o.title, 60), text: clean(o.text, 160) };
  }).filter((s) => s.title).slice(0, MAX.steps);
  const seen = new Set();
  const badges = (Array.isArray(r.badges) ? r.badges : []).map((b) => clean(b, 40)).filter((b) => {
    const k = b.toLowerCase();
    if (!b || seen.has(k)) return false;
    seen.add(k); return true;
  }).slice(0, MAX.badges);
  return { on: r.on === true, meta, sessions, steps, badges };
}

function hasContent(f) {
  return !!(f && ((f.meta && Object.keys(f.meta).some((k) => f.meta[k])) || (f.sessions && f.sessions.length) || (f.steps && f.steps.length) || (f.badges && f.badges.length)));
}

// Date du jour (AAAA-MM-JJ) dans le fuseau du propriétaire.
function todayIso(nowMs, tz) {
  const off = Number.isFinite(Number(tz)) ? Number(tz) : 0;
  return new Date((Number.isFinite(nowMs) ? nowMs : Date.now()) + off * 3600000).toISOString().slice(0, 10);
}
// Sessions à venir (ou en cours) : une session terminée n'est plus affichée.
function upcoming(f, nowMs, tz, limit) {
  const today = todayIso(nowMs, tz);
  const list = ((f && f.sessions) || []).filter((s) => (s.end || s.date) >= today);
  return list.slice(0, Math.max(0, limit == null ? MAX.sessions : limit));
}
function fmtDate(iso) { const p = String(iso).split('-'); return (+p[2]) + ' ' + MONTHS[(+p[1]) - 1] + ' ' + p[0]; }
function fmtRange(s) { return (s.end && s.end !== s.date) ? 'Du ' + fmtDate(s.date) + ' au ' + fmtDate(s.end) : fmtDate(s.date); }

const META_LABELS = [['duration', 'Durée'], ['level', 'Niveau'], ['mode', 'Mode'], ['schedule', 'Horaires'], ['language', 'Langue'], ['certificate', 'Certificat']];

// Section publique. o = { f, escapeHtml, enrollHref(texte), enrollExternal, nowMs, tz, limit, IC:{check} }
function formationHtml(o) {
  const f = o && o.f;
  if (!f || !f.on) return '';
  const esc = o.escapeHtml, attr = o.escapeAttr || o.escapeHtml, IC = o.IC || {};
  const list = upcoming(f, o.nowMs, o.tz, o.limit == null ? FREE_SESSIONS : o.limit);
  const metaTiles = META_LABELS.filter((x) => f.meta && f.meta[x[0]]).map((x) => `<div class="fm-m reveal"><span>${x[1]}</span><b>${esc(f.meta[x[0]])}</b></div>`).join('');
  const sessions = list.map((s) => {
    const day = String(+s.date.slice(8, 10)), mon = MONTHS[+s.date.slice(5, 7) - 1];
    const label = s.course || 'Nouvelle session';
    const msg = `Bonjour, je souhaite m’inscrire à la session « ${label} » (${fmtRange(s)}${s.place ? ', ' + s.place : ''}).`;
    const href = o.enrollHref ? o.enrollHref(msg) : '#site-sec-contact';
    const info = [fmtRange(s), s.place, s.seats ? s.seats + ' places' : ''].filter(Boolean).map((x) => '<span>' + esc(x) + '</span>').join('');
    return `<article class="fm-ses reveal"><div class="fm-date" aria-hidden="true"><b>${esc(day)}</b><span>${esc(mon)}</span></div><div class="fm-info"><h4>${esc(label)}</h4><p>${info}</p></div><div class="fm-act">${s.price ? `<span class="fm-price">${esc(s.price)}</span>` : ''}<a class="btn btn-primary" href="${attr(href)}"${o.enrollExternal ? ' target="_blank" rel="noopener"' : ''}>Réserver ma place</a></div></article>`;
  }).join('');
  const steps = (f.steps || []).map((s, i) => `<li class="reveal"><span class="fm-n">${i + 1}</span><div><b>${esc(s.title)}</b>${s.text ? `<p>${esc(s.text)}</p>` : ''}</div></li>`).join('');
  const badges = (f.badges || []).map((b) => `<li>${IC.check || ''}<span>${esc(b)}</span></li>`).join('');
  if (!metaTiles && !sessions && !steps && !badges) return '';
  return `
  <section class="section" id="site-sec-formation">
    <div class="section-head reveal"><span class="eyebrow">Programme et inscriptions</span><h2>Tout savoir avant de vous inscrire</h2></div>
    ${metaTiles ? `<div class="fm-meta">${metaTiles}</div>` : ''}
    ${sessions ? `<h3 class="fm-h reveal">Prochaines sessions</h3><div class="fm-list">${sessions}</div>` : ''}
    ${steps ? `<h3 class="fm-h reveal">Comment s’inscrire</h3><ol class="fm-steps">${steps}</ol>` : ''}
    ${badges ? `<ul class="fm-badges reveal">${badges}</ul>` : ''}
  </section>`;
}

// Données structurées Google « Course » : une fiche par formation, avec ses prochaines sessions.
const COURSE_MODE = { 'présentiel': 'Onsite', 'en ligne': 'Online', 'hybride': 'Blended' };
function courseNodes(o) {
  const f = o && o.f; if (!f || !f.on) return [];
  const site = o.site || {}, name = String(site.businessName || '');
  const courses = (o.courses || []).filter((c) => c && c.name).slice(0, 20);
  const list = upcoming(f, o.nowMs, o.tz, o.limit == null ? MAX.sessions : o.limit);
  const mode = COURSE_MODE[String((f.meta && f.meta.mode) || '').toLowerCase()];
  return courses.map((c) => {
    const mine = list.filter((s) => (s.course && s.course.toLowerCase() === String(c.name).toLowerCase()) || (!s.course && courses.length === 1) || (courses.length === 1));
    const node = {
      '@type': 'Course', name: String(c.name).slice(0, 110),
      description: String(c.desc || '').slice(0, 300) || ('Formation « ' + c.name + ' » proposée par ' + name + '.'),
      provider: { '@type': 'Organization', name, sameAs: o.url || undefined },
      inLanguage: 'fr'
    };
    if (f.meta && f.meta.level) node.educationalLevel = f.meta.level;
    if (mine.length) node.hasCourseInstance = mine.map((s) => {
      const ci = { '@type': 'CourseInstance', startDate: s.date };
      if (s.end) ci.endDate = s.end;
      if (mode) ci.courseMode = mode;
      if (s.place && mode !== 'Online') ci.location = { '@type': 'Place', name: s.place };
      return ci;
    });
    return node;
  });
}

// Exemple affiché dans la galerie de modèles (dates relatives à aujourd'hui : toujours à venir).
function sampleFormation(nowMs) {
  const d = new Date(Number.isFinite(nowMs) ? nowMs : Date.now());
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  const iso = (add, day) => new Date(Date.UTC(y, m + add, day)).toISOString().slice(0, 10);
  return normalizeFormation({
    on: true,
    meta: { duration: '6 semaines · 48 heures', level: 'Tous niveaux', mode: 'Hybride', schedule: 'Lun. et mer. · 17h–19h', language: 'Français', certificate: 'Certificat de fin de formation' },
    sessions: [
      { course: 'Design graphique', date: iso(1, 3), end: iso(2, 14), place: 'Campus principal', seats: 20, price: '45 $' },
      { course: 'Marketing digital', date: iso(1, 17), end: iso(2, 28), place: 'En ligne', seats: 30, price: '50 $' },
      { course: 'Comptabilité pratique', date: iso(2, 5), end: iso(3, 16), place: 'Campus principal', seats: 15, price: '60 $' }
    ],
    steps: STARTER_STEPS,
    badges: ['Certificat délivré', 'Paiement échelonné possible', 'Formateurs expérimentés', 'Supports de cours inclus']
  });
}

const FORMATION_CSS = `
  .fm-meta{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:8px}
  .fm-m{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;display:flex;flex-direction:column;gap:3px}
  .fm-m span{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .fm-m b{font-size:1rem;color:var(--ink)}
  .fm-h{margin:28px 0 12px;font-size:1.05rem}
  .fm-list{display:grid;gap:12px}
  .fm-ses{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
  .fm-date{width:62px;height:66px;border-radius:14px;background:var(--accent-soft);color:var(--accent-ink);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
  .fm-date b{font-size:1.5rem;font-weight:800}.fm-date span{font-size:.74rem;font-weight:700;text-transform:uppercase}
  .fm-info h4{margin:0 0 3px;font-size:1rem}.fm-info p{margin:0;color:var(--muted);font-size:.88rem}
  .fm-info p span+span::before{content:"·";margin:0 7px}
  .fm-act{grid-column:1/-1;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  .fm-price{font-weight:800;font-size:1.15rem;color:var(--accent-ink)}
  .fm-act .btn{margin-left:auto}
  @media(min-width:720px){.fm-ses{grid-template-columns:auto 1fr auto}.fm-act{grid-column:auto;flex-direction:column;align-items:flex-end;gap:8px}.fm-act .btn{margin-left:0}}
  .fm-steps{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .fm-steps li{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px;display:flex;gap:12px;align-items:flex-start}
  .fm-n{flex:none;width:32px;height:32px;border-radius:50%;background:var(--accent);color:var(--on-accent);font-weight:800;display:flex;align-items:center;justify-content:center}
  .fm-steps b{display:block;margin-bottom:2px}.fm-steps p{margin:0;color:var(--muted);font-size:.88rem}
  .fm-badges{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
  .fm-badges li{display:flex;gap:8px;align-items:center;padding:9px 16px;border-radius:999px;background:var(--accent-soft);color:var(--accent-ink);font-weight:700;font-size:.86rem}
  .fm-badges svg{flex:none}
`;

module.exports = { normalizeFormation, hasContent, upcoming, formationHtml, courseNodes, sampleFormation, FORMATION_CSS, todayIso, fmtDate, fmtRange, LEVELS, MODES, SUGGESTED_BADGES, STARTER_STEPS, MAX, FREE_SESSIONS };
