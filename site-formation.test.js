const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const fs = require('fs');
const path = require('path');

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { firestore: Object.assign(() => ({}), { FieldValue: { increment: () => 1 } }) };
  if (request === './_lib/security') return { initFirebaseAdmin() {}, getBody: (r) => (r && r.body) || {}, verifyCaller() {}, enforceRateLimit() {}, cleanText: (v) => String(v || ''), getClientIp: () => '1.1.1.1' };
  if (request === './_lib/push') return { sendPushToUser() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/render-site.js');
Module._load = origLoad;

const F = require('../api/_lib/site-formation');
const { normalizeExtras, saveSiteExtras } = require('../api/_lib/site-extras');
const { sampleSite } = require('../api/_lib/site-samples');

const ROOT = path.join(__dirname, '..');
const ZW = String.fromCharCode(0x200b), RLO = String.fromCharCode(0x202e), BOM = String.fromCharCode(0xfeff), NUL = String.fromCharCode(0);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const NOW = Date.UTC(2026, 10, 27, 12, 0, 0); // 27 novembre 2026

async function page(query) {
  const out = {};
  await handler({ method: 'GET', query, headers: { host: 'coeurnohuniverse.com' }, url: '/api/render-site' }, { setHeader() {}, status(c) { out.status = c; return this; }, send(x) { out.body = x; }, json(x) { out.body = JSON.stringify(x); }, end(x) { out.body = x; } });
  return out;
}

test('validation : dates impossibles, textes dangereux et plafonds', () => {
  const f = F.normalizeFormation({
    on: true,
    meta: { duration: '6 <b>semaines</b>' + ZW + RLO + BOM + NUL, level: 'x'.repeat(500), mode: 5 },
    sessions: [
      { date: '2026-02-30', course: 'faux' }, { date: '2026-13-01' }, { date: '1999-01-01' }, { date: '2026-12-01<script>' }, null, 'texte',
      { date: '2026-12-10', end: '2026-12-01', course: '<img src=x onerror=alert(1)>', seats: '12.6', price: '45 $' },
      { date: '2026-12-05', end: '2027-01-05', place: 'Campus', seats: -4 },
    ],
    steps: [{ title: '' }, { title: 'Etape', text: 'y'.repeat(400) }],
    badges: ['Certificat', 'certificat', '  ', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7']
  });
  assert.strictEqual(f.on, true);
  assert.strictEqual(f.meta.duration, '6 b semaines /b', 'chevrons retirés : aucune balise possible');
  assert.ok(!new RegExp('[<>' + ZW + RLO + BOM + NUL + ']').test(JSON.stringify(f)), 'aucun caractère invisible ni balise');
  assert.strictEqual(f.meta.level.length, 30);
  assert.strictEqual(f.meta.mode, '5');
  assert.strictEqual(f.sessions.length, 2, 'seules les dates réelles restent');
  assert.deepStrictEqual(f.sessions.map((s) => s.date), ['2026-12-05', '2026-12-10'], 'triées par date');
  assert.strictEqual(f.sessions[1].end, '', 'fin avant début : ignorée');
  assert.strictEqual(f.sessions[1].seats, 13);
  assert.strictEqual(f.sessions[0].seats, 0, 'places négatives : ignorées');
  assert.ok(!/[<>]/.test(f.sessions[1].course));
  assert.strictEqual(f.steps.length, 1);
  assert.strictEqual(f.steps[0].text.length, 160);
  assert.deepStrictEqual(f.badges, ['Certificat', 'B2', 'B3', 'B4', 'B5', 'B6'], 'doublons retirés, 6 badges au plus');
});

test('validation : entrées absurdes et plafonds de listes', () => {
  [undefined, null, 0, 'x', [], { on: 'oui' }, { meta: [], sessions: 'x', steps: {}, badges: 7 }].forEach((raw) => {
    const f = F.normalizeFormation(raw);
    assert.strictEqual(f.on, false);
    assert.deepStrictEqual(f.sessions, []); assert.deepStrictEqual(f.steps, []); assert.deepStrictEqual(f.badges, []);
    assert.strictEqual(F.hasContent(f), false);
  });
  const many = F.normalizeFormation({ sessions: Array.from({ length: 40 }, (_, i) => ({ date: '2027-01-' + String(1 + (i % 28)).padStart(2, '0') })), steps: Array.from({ length: 20 }, (_, i) => ({ title: 't' + i })), badges: Array.from({ length: 20 }, (_, i) => 'b' + i) });
  assert.strictEqual(many.sessions.length, 12); assert.strictEqual(many.steps.length, 6); assert.strictEqual(many.badges.length, 6);
  const poll = F.normalizeFormation(JSON.parse('{"__proto__":{"on":true},"on":false,"meta":{"__proto__":{"duration":"x"}}}'));
  assert.strictEqual(poll.on, false); assert.strictEqual(poll.meta.duration, '');
  assert.strictEqual(({}).on, undefined, 'aucune pollution de prototype');
});

test('sessions à venir : une session terminée disparaît, une session en cours reste', () => {
  const f = F.normalizeFormation({ on: true, sessions: [{ date: '2026-11-01', end: '2026-11-20', course: 'passée' }, { date: '2026-11-20', end: '2026-12-10', course: 'en cours' }, { date: '2026-11-27', course: 'aujourd’hui' }, { date: '2026-11-26', course: 'hier' }, { date: '2027-03-01', course: 'future' }] });
  assert.deepStrictEqual(F.upcoming(f, NOW, 0).map((s) => s.course), ['en cours', 'aujourd’hui', 'future']);
  assert.strictEqual(F.upcoming(f, NOW, 0, 2).length, 2, 'plafond du plan gratuit');
  // fuseau : à 23h UTC le 27, il est déjà le 28 à UTC+2 → la session du 27 est passée
  assert.strictEqual(F.upcoming(f, Date.UTC(2026, 10, 27, 23, 0, 0), 2).some((s) => s.course === 'aujourd’hui'), false);
  assert.strictEqual(F.upcoming(f, Date.UTC(2026, 10, 27, 23, 0, 0), 0).some((s) => s.course === 'aujourd’hui'), true);
});

test('affichage public : échappement, bouton d’inscription, plan gratuit, section vide', () => {
  const f = F.normalizeFormation({ on: true, meta: { duration: '6 semaines', mode: 'En ligne' }, sessions: [
    { course: 'A "x" & <i>', date: '2026-12-03', end: '2026-12-20', place: 'Salle \'1\'', seats: 20, price: '45 $' },
    { date: '2026-12-04' }, { date: '2026-12-05' }, { date: '2026-12-06' }], steps: [{ title: 'Étape <1>', text: 'Texte' }], badges: ['Certificat délivré'] });
  const base = { f, escapeHtml: esc, escapeAttr: esc, IC: { check: '<svg></svg>' }, nowMs: NOW, tz: 0, enrollHref: (m) => 'https://wa.me/1?text=' + encodeURIComponent(m), enrollExternal: true };
  const html = F.formationHtml(Object.assign({ limit: 3 }, base));
  assert.match(html, /id="site-sec-formation"/);
  assert.strictEqual((html.match(/class="fm-ses reveal"/g) || []).length, 3, 'plan gratuit : 3 sessions');
  assert.strictEqual((F.formationHtml(Object.assign({ limit: 12 }, base)).match(/class="fm-ses reveal"/g) || []).length, 4);
  assert.ok(!/<i>|<1>|onerror/.test(html), 'rien de brut dans la page');
  assert.match(html, /A &quot;x&quot; &amp; i/);
  assert.match(html, /href="https:\/\/wa\.me\/1\?text=Bonjour/);
  assert.match(html, /target="_blank" rel="noopener"/);
  assert.match(html, /<span>3 déc\. 2026<\/span>|Du 3 déc\. 2026 au 20 déc\. 2026/);
  assert.match(html, /<span>20 places<\/span>/);
  assert.match(F.formationHtml(Object.assign({}, base, { enrollExternal: false, enrollHref: () => '#site-sec-contact' })), /href="#site-sec-contact"(?! target)/);
  assert.strictEqual(F.formationHtml(Object.assign({}, base, { f: Object.assign({}, f, { on: false }) })), '', 'désactivée : rien');
  assert.strictEqual(F.formationHtml(Object.assign({}, base, { f: F.normalizeFormation({ on: true }) })), '', 'activée mais vide : rien');
  assert.strictEqual(F.formationHtml(Object.assign({}, base, { f: F.normalizeFormation({ on: true, sessions: [{ date: '2020-01-01' }] }) })), '', 'seulement des sessions passées : rien');
});

test('données structurées Google : une fiche Course par formation, sessions rattachées', () => {
  const f = F.normalizeFormation({ on: true, meta: { mode: 'En ligne', level: 'Débutant' }, sessions: [{ course: 'Design', date: '2026-12-03', end: '2027-01-14', place: 'Zoom' }, { course: 'Autre', date: '2026-12-10' }] });
  const nodes = F.courseNodes({ f, site: { businessName: 'Académie' }, url: 'https://exemple.test/s/a', courses: [{ name: 'Design', desc: 'Du design' }, { name: 'Marketing', desc: '' }], nowMs: NOW, tz: 0 });
  assert.strictEqual(nodes.length, 2);
  assert.strictEqual(nodes[0]['@type'], 'Course');
  assert.strictEqual(nodes[0].provider.name, 'Académie');
  assert.strictEqual(nodes[0].educationalLevel, 'Débutant');
  assert.strictEqual(nodes[0].hasCourseInstance.length, 1);
  assert.strictEqual(nodes[0].hasCourseInstance[0].courseMode, 'Online');
  assert.strictEqual(nodes[0].hasCourseInstance[0].location, undefined, 'en ligne : pas de lieu');
  assert.ok(nodes[1].description.includes('Marketing'), 'description de secours obligatoire pour Google');
  assert.strictEqual(nodes[1].hasCourseInstance, undefined);
  assert.deepStrictEqual(F.courseNodes({ f: Object.assign({}, f, { on: false }), site: {}, courses: [{ name: 'x' }], nowMs: NOW, tz: 0 }), []);
});

test('enregistrement serveur : normalisé, et un ancien écran n’efface jamais le programme', async () => {
  const x = normalizeExtras({ tz: 2, formation: { on: true, meta: { duration: '3 mois' } } });
  assert.strictEqual(x.formation.on, true); assert.strictEqual(x.formation.meta.duration, '3 mois'); assert.strictEqual(x.tz, 2);
  assert.strictEqual(normalizeExtras({}).formation.on, false);
  const store = { 'mini_sites/u1': { slug: 's', extras: { formation: F.normalizeFormation({ on: true, steps: [{ title: 'Garde-moi' }] }) } } };
  const db = { collection: (n) => ({ doc: (id) => ({ async get() { const k = n + '/' + id; return { exists: !!store[k], data: () => store[k] }; }, async update(o) { store[n + '/' + id] = Object.assign({}, store[n + '/' + id], o); } }) }) };
  await saveSiteExtras(db, 'u1', { extras: { tz: 3, hoursOn: false, week: [], cart: { on: true, note: 'Livraison' } } }); // ancien écran : pas de « formation »
  assert.strictEqual(store['mini_sites/u1'].extras.formation.steps[0].title, 'Garde-moi');
  assert.strictEqual(store['mini_sites/u1'].extras.cart.on, true);
  await saveSiteExtras(db, 'u1', { extras: { formation: { on: false, steps: [] } } }); // nouvel écran : remplace vraiment
  assert.strictEqual(store['mini_sites/u1'].extras.formation.steps.length, 0);
  await assert.rejects(() => saveSiteExtras(db, 'inconnu', { extras: {} }), /Crée d/);
});

test('site public : exemple formation complet, données structurées, vocabulaire par métier', async () => {
  const edu = (await page({ sample: 'education', tpl: 'classique' })).body;
  assert.match(edu, /id="site-sec-formation"/);
  assert.match(edu, /Prochaines sessions/); assert.match(edu, /Comment s’inscrire/); assert.match(edu, /Réserver ma place/);
  assert.match(edu, /Nos formateurs/); assert.match(edu, /Avis des apprenants/);
  assert.match(edu, /"@type":"Course"/); assert.match(edu, /"@type":"CourseInstance"/);
  assert.ok(edu.indexOf('id="site-sec-formation"') > edu.indexOf('id="site-sec-services"'), 'programme après la liste des formations');
  assert.match((await page({ sample: 'sport', tpl: 'classique' })).body, /Nos coachs/);
  const resto = (await page({ sample: 'restaurant', tpl: 'classique' })).body;
  assert.ok(!/site-sec-formation/.test(resto) && !/"Course"/.test(resto), 'pas de section formation pour les autres métiers');
  assert.match(resto, /Notre équipe/);
  assert.ok(!/placeholder="\+243/.test(edu), 'plus de numéro de pays imposé dans le formulaire');
});

test('site public : une formation créée par un propriétaire passe par la même validation', async () => {
  const site = sampleSite('education', 'classique');
  site.extras = { formation: { on: true, meta: { duration: '<script>alert(1)</script> 4 semaines' }, sessions: [{ date: '2099-01-10', course: 'Cours "A"', place: '<b>x</b>' }], steps: [{ title: 'Un' }], badges: ['<img src=x onerror=1>'] } };
  const out = {};
  await handler({ method: 'POST', body: { site } }, { setHeader() {}, status(c) { out.status = c; return this; }, send(x) { out.body = x; } });
  const html = out.body.replace(/<script[\s\S]*?<\/script>/g, '');
  assert.match(html, /4 semaines/);
  assert.ok(!/<b>x<\/b>|<img src=x onerror/.test(html));
  assert.match(html, /10 janv\. 2099/);
});

test('traduction : chaque texte fixe du programme existe en 5 langues', () => {
  const src = fs.readFileSync(path.join(ROOT, 'site-runtime.js'), 'utf8');
  const keys = new Set();
  src.replace(/^\s*P\('((?:[^'\\]|\\.)*)',/gm, (m, k) => { keys.add(k.replace(/\\'/g, "'")); return m; });
  const need = []
    .concat(['Programme et inscriptions', 'Tout savoir avant de vous inscrire', 'Durée', 'Niveau', 'Mode', 'Langue', 'Certificat', 'Prochaines sessions', 'Comment s’inscrire', 'Réserver ma place', 'Nouvelle session', 'Inscriptions', 'Formateurs', 'Coachs'])
    .concat(F.LEVELS, F.MODES, F.SUGGESTED_BADGES)
    .concat(F.STARTER_STEPS.map((s) => s.title), F.STARTER_STEPS.map((s) => s.text))
    .concat(['Nos formateurs', 'Des experts à vos côtés', 'Avis des apprenants', 'Ils ont suivi nos formations', 'Notre équipe soignante', 'Avis des patients', 'Nos coachs', 'Avis des membres', 'Notre équipe juridique', 'Expertise et confidentialité', 'Avec l’indicatif du pays', 'Téléphone avec l’indicatif du pays']);
  const missing = need.filter((k) => !keys.has(k));
  assert.deepStrictEqual(missing, [], 'textes sans traduction : ' + missing.join(' | '));
  src.replace(/^\s*P\(((?:'(?:[^'\\]|\\.)*'(?:, )?){5})\);/gm, (m, args) => {
    const parts = args.match(/'(?:[^'\\]|\\.)*'/g);
    assert.strictEqual(parts.length, 5, m);
    parts.forEach((p) => assert.ok(p.length > 2, 'traduction vide : ' + m));
    return m;
  });
  assert.match(src, /function dateTr\(/); assert.match(src, /\(\\d\+\) places\?/);
});

test('éditeur du propriétaire : tuile, état conservé, aucune valeur brute dans la page', () => {
  const src = fs.readFileSync(path.join(ROOT, 'site-pro.js'), 'utf8');
  assert.doesNotThrow(() => new Function(src));
  assert.match(src, /formation: openFormation/);
  assert.match(src, /'Programme et sessions'/);
  assert.match(src, /formation: e\.formation \|\| undefined/, 'horaires et panier ne doivent jamais effacer le programme');
  const block = src.slice(src.indexOf('function fmLoad'), src.indexOf('function openFormation'));
  assert.ok(block.length > 3000);
  // toute valeur saisie injectée dans le HTML passe par esc()
  const concat = block.match(/value="' \+ [^+]+\+/g) || [];
  assert.ok(concat.length >= 8);
  concat.forEach((c) => assert.match(c, /esc\(/, c));
  assert.ok(!/\.innerHTML\s*=\s*[^;]*\b(FM|s\.|m\.)\b[^;]*\bvalue\b/.test(block));
  // fuseaux : une seule ligne par décalage, plus de liste limitée à un seul pays
  const zones = src.match(/var ZONES = (\[\[[^;]+\]\]);/);
  assert.ok(zones);
  const list = new Function('return ' + zones[1])();
  assert.strictEqual(new Set(list.map((z) => z[0])).size, list.length);
  assert.ok(list.length >= 10);
  assert.ok(list.some((z) => /Afrique/.test(z[1])) && list.some((z) => /Amérique/.test(z[1])), 'fuseaux africains et internationaux');
});
