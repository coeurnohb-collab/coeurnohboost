/* Garde-fous automatiques : lancés à chaque mise à jour (GitHub Actions) et avec `npm test`.
   Ils attrapent les erreurs classiques AVANT la mise en ligne : fichier cassé, traduction oubliée,
   bouton sans fonction, limite Vercel dépassée, configuration de sécurité affaiblie. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
const listJs = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' || e.name.startsWith('.') ? [] : listJs(rel);
  return e.name.endsWith('.js') ? [rel] : [];
});

test('tous les fichiers JavaScript sont syntaxiquement valides', () => {
  const files = [...listJs('.').filter((f) => !f.includes(path.sep) || f.startsWith('api') || f.startsWith('tests'))];
  assert.ok(files.length > 10, 'fichiers JS introuvables');
  for (const f of files) {
    assert.doesNotThrow(() => new vm.Script(read(f).replace(/^#!.*/, ''), { filename: f }), `Erreur de syntaxe dans ${f}`);
  }
});

test('Vercel (plan gratuit) : 12 fonctions serverless au maximum dans /api', () => {
  const fns = fs.readdirSync(path.join(root, 'api'), { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.js'));
  assert.ok(fns.length <= 12, `${fns.length} fonctions dans /api : le plan gratuit en accepte 12 au maximum`);
});

test('vercel.json : JSON valide et en-têtes de sécurité présents', () => {
  const v = JSON.parse(read('vercel.json'));
  const all = Object.fromEntries(v.headers.flatMap((b) => b.headers.map((h) => [h.key.toLowerCase(), h.value])));
  // 'self' : la connexion Google (iPhone) charge sa page technique dans un cadre de NOTRE propre domaine.
  assert.match(all['content-security-policy'], /frame-ancestors 'self'/);
  assert.match(all['content-security-policy'], /object-src 'none'/);
  assert.match(all['content-security-policy'], /base-uri 'none'/);
  assert.strictEqual(all['x-content-type-options'], 'nosniff');
  assert.strictEqual(all['x-frame-options'], 'SAMEORIGIN');
  assert.match(all['permissions-policy'], /geolocation=\(self\)/);
  assert.match(all['permissions-policy'], /microphone=\(\)/);
  assert.match(all['cross-origin-opener-policy'] || '', /same-origin-allow-popups/);
});

test('index.html : pas d\'identifiant en double, fichiers référencés présents', () => {
  const html = read('index.html');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepStrictEqual([...new Set(dup)], [], 'identifiants dupliqués');
  const refs = [...html.matchAll(/(?:src|href)="(?!https?:|#|mailto:|tel:|data:|javascript:)([^"]+)"/g)].map((m) => m[1].split('?')[0].replace(/^\//, ''));
  const missing = refs.filter((r) => r && !exists(r));
  assert.deepStrictEqual(missing, [], 'fichiers référencés introuvables');
});

test('index.html : chaque bouton (onclick…) appelle une fonction qui existe', () => {
  const html = read('index.html');
  const code = ['script.js', 'menu-pro.js', 'translations.js', 'polish.js', 'auth-guard.js', 'pay-guard.js', 'push-center.js'].filter(exists).map(read).join('\n');
  const used = new Set([...html.matchAll(/on(?:click|change|input|submit|keydown|keyup|focus|blur)="\s*(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
  const defined = new Set([...code.matchAll(/(?:^|\s)function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
  for (const m of code.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
  for (const m of code.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) defined.add(m[1]);
  const builtin = new Set(['event', 'this', 'alert', 'confirm', 'window', 'document', 'history', 'location', 'if', 'setTimeout', 'Math', 'parseInt', 'navigator', 'console']);
  const missing = [...used].filter((n) => !defined.has(n) && !builtin.has(n));
  assert.deepStrictEqual(missing, [], 'fonctions appelées par l\'interface mais introuvables');
});

test('traductions : les 5 langues contiennent toutes les clés du français et de index.html', () => {
  const src = read('translations.js');
  const start = src.indexOf('const TRANSLATIONS');
  let i = src.indexOf('{', start), depth = 0, j = i, str = null, esc = false;
  for (; j < src.length; j++) {
    const c = src[j];
    if (str) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '/' && src[j + 1] === '/') { while (j < src.length && src[j] !== '\n') j++; continue; }
    if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) break; }
  }
  const T = new vm.Script('(' + src.slice(i, j + 1) + ')').runInNewContext({});
  const html = read('index.html');
  const used = [...new Set([...html.matchAll(/data-i18n(?:-placeholder|-title|-aria)?="([^"]+)"/g)].map((m) => m[1]))];
  for (const lang of ['fr', 'en', 'es', 'it', 'pt']) {
    assert.ok(T[lang], `langue ${lang} absente`);
    const missingHtml = used.filter((k) => !(k in T[lang]));
    assert.deepStrictEqual(missingHtml, [], `${lang} : clés de index.html manquantes`);
    const missingFr = Object.keys(T.fr).filter((k) => !(k in T[lang]));
    assert.deepStrictEqual(missingFr, [], `${lang} : clés du français non traduites`);
  }
});

test('service worker : tous les fichiers pré-chargés existent', () => {
  const sw = read('sw.js');
  const block = (sw.match(/APP_SHELL\s*=\s*\[([\s\S]*?)\]/) || [])[1] || '';
  const files = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== '/' && !/^https?:/.test(f));
  assert.ok(files.length > 0, 'liste APP_SHELL introuvable');
  const missing = files.map((f) => f.replace(/^\//, '')).filter((f) => !exists(f));
  assert.deepStrictEqual(missing, [], 'fichiers du service worker introuvables (l\'installation du service worker échouerait)');
});

test('Mobile Money : la liste des pays de l\'interface correspond à celle du serveur', () => {
  const server = read('api/payment-initiate.js');
  const block = server.slice(server.indexOf('const MBOTEPAY_MAP'), server.indexOf('};', server.indexOf('const MBOTEPAY_MAP')));
  const sv = {};
  for (const m of block.matchAll(/\n\s{2}([A-Z]{2}):\s*\{[\s\S]*?operators:\s*\{([\s\S]*?)\}\s*\}/g)) {
    sv[m[1]] = [...m[2].matchAll(/'([^']+)'\s*:/g)].map((x) => x[1]).sort();
  }
  const guard = read('pay-guard.js');
  const g = guard.slice(guard.indexOf('var COVERED'), guard.indexOf('};', guard.indexOf('var COVERED')));
  const cl = {};
  for (const m of g.matchAll(/([A-Z]{2}):\s*\[([^\]]*)\]/g)) cl[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  assert.deepStrictEqual(Object.keys(cl).sort(), Object.keys(sv).sort(), 'pays différents entre pay-guard.js et payment-initiate.js');
  for (const c of Object.keys(sv)) assert.deepStrictEqual(cl[c], sv[c], `opérateurs différents pour ${c}`);
  assert.strictEqual(Object.keys(sv).length, 12);
});

test('mot de passe : la règle des 8 caractères est bien présente côté interface', () => {
  const g = read('auth-guard.js');
  assert.match(g, /p\.length < 8/);
});

test('vidéos d\'ambiance : légères (< 400 Ko chacune) et accompagnées de leur image fixe', () => {
  for (const t of ['light', 'dark']) {
    for (const f of [`intro-${t}.mp4`, `intro-${t}.webm`, `intro-${t}-poster.jpg`]) assert.ok(exists(f), `${f} manquant`);
    assert.ok(fs.statSync(path.join(root, `intro-${t}.mp4`)).size < 400 * 1024, `intro-${t}.mp4 trop lourde`);
  }
});

/* ---------- Notifications push « comme une vraie application » ---------- */
test('notifications : push-center.js est chargé par index.html et remplace l\'enregistrement automatique', () => {
  assert.match(read('index.html'), /<script src="push-center\.js"><\/script>/);
  const pc = read('push-center.js');
  assert.match(pc, /window\.registerPushNotifications\s*=/);
  // La permission ne se demande qu'à un seul endroit (la fonction enable, déclenchée par un toucher)
  assert.strictEqual((pc.match(/Notification\.requestPermission\(/g) || []).length, 1, 'une seule demande de permission autorisée');
  assert.ok(exists('badge-96.png'), 'badge-96.png manquant (icône de la barre d\'état)');
});

test('notifications : le serveur envoie des messages « données seules » (sans champ notification)', () => {
  const src = read('api/_lib/push.js');
  const mod = { exports: {} };
  const stubRequire = (n) => n === './security' ? { initFirebaseAdmin() {}, safeInternalPath: (u) => u } : { firestore: () => ({}), messaging: () => ({}) };
  new Function('require', 'module', 'exports', src)(stubRequire, mod, mod.exports);
  const m = mod.exports.buildMessage({ tokens: ['a'], title: 'T', body: 'B', url: '/?open=abc123', category: 'activity', badgeCount: 3 });
  assert.strictEqual(m.notification, undefined, 'un champ notification provoquerait des doublons');
  assert.strictEqual(m.webpush.notification, undefined);
  assert.strictEqual(m.data.title, 'T');
  assert.strictEqual(m.data.badgeCount, '3');
  assert.ok(Object.values(m.data).every((v) => typeof v === 'string'), 'FCM exige des valeurs texte');
  assert.match(m.data.tag, /^cn-activity-/);
  assert.strictEqual(m.webpush.headers.Urgency, 'high');
});

test('notifications : sw.js affiche lui-même la notification (tag toujours défini, boutons, clic)', () => {
  const sw = read('sw.js');
  assert.match(sw, /onBackgroundMessage/);
  assert.match(sw, /renotify:\s*true/);
  assert.match(sw, /const tag = d\.tag \|\| \(/, 'renotify sans tag fait planter showNotification');
  assert.match(sw, /action: 'open'/);
  assert.match(sw, /action: 'later'/);
  assert.match(sw, /type: 'cn-open'/);
  assert.ok(exists('badge-96.png'));
  assert.doesNotMatch(sw, /icon-192\.png/, 'icon-192.png n\'existe pas (c\'est icon-192-v2.png)');
});

test('notifications : plus d\'e-mail pour les likes/commentaires, et action test-push présente', () => {
  const n = read('api/notify-user.js');
  assert.match(n, /action === 'test-push'/);
  assert.match(n, /cat === 'orders' \|\| cat === 'sos'/);
  assert.doesNotMatch(read('api/_lib/push.js'), /resend\.com/, 'la diffusion ne doit plus envoyer d\'e-mails');
});

test('notifications : tous les liens ?tab=… envoyés par le serveur sont compris par l\'application', () => {
  const sent = new Set();
  for (const f of listJs('api')) for (const m of read(f).matchAll(/\/\?tab=([a-z]+)/g)) sent.add(m[1]);
  const pc = read('push-center.js');
  for (const tab of sent) assert.ok(tab === 'sales' ? /sales/.test(pc) : exists('index.html') && read('index.html').includes('dash-tab-' + tab), 'lien ?tab=' + tab + ' non géré');
  assert.match(pc, /notifs/, 'le lien ?openTab=notifs (messages programmés) doit ouvrir le centre de notifications');
});
