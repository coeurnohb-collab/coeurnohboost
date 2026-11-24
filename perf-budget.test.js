// Garde-fous de poids : ce qui est téléchargé à chaque ouverture doit rester léger.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const size = (f) => fs.statSync(path.join(root, f)).size;

test('poids : une petite image affichée (≤ 64 px) ne doit pas être un gros fichier (< 60 Ko)', () => {
  // Avant : une icône de 225 Ko était téléchargée à chaque ouverture pour s'afficher en 34 pixels.
  const html = read('index.html') + '\n' + read('polish.js');
  const bad = [];
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    const w = +((tag.match(/\bwidth="(\d+)"/) || [])[1] || 0);
    const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1];
    if (!w || w > 64 || !src || /^(https?:|data:)/.test(src) || /\+/.test(src)) continue;
    const f = src.split('?')[0].replace(/^\//, '');
    if (fs.existsSync(path.join(root, f)) && size(f) >= 60 * 1024) bad.push(f + ' (' + Math.round(size(f) / 1024) + ' Ko, affiché en ' + w + ' px)');
  }
  assert.deepStrictEqual(bad, []);
});

test('poids : le logo de l\'en-tête utilise une petite icône (128 px) et la carte de bienvenue l\'icône 192 px (même image, bien plus légères que la 512)', () => {
  assert.ok(size('icon-192-v2.png') < 60 * 1024);
  assert.ok(size('icon-128-v2.png') < 16 * 1024, 'icône d\'en-tête : ' + size('icon-128-v2.png') + ' octets');
  assert.ok(size('favicon-48-v2.png') < 8 * 1024);
  const html = read('index.html');
  // En-tête (affiché ~30 px, chargé tout de suite) : icône 128 px. Carte de bienvenue (chargée plus tard) : icône 192 px.
  assert.strictEqual((html.match(/class="brand-mark" src="icon-128-v2\.png"/g) || []).length, 1);
  assert.strictEqual((html.match(/class="brand-mark" src="icon-192-v2\.png"/g) || []).length, 1);
  // Icône d\'onglet : la petite (48 px) est choisie par le navigateur, la grande (192 px) reste déclarée pour Google et l\'installation.
  assert.match(html, /<link rel="icon" type="image\/png" sizes="48x48" href="\/favicon-48-v2\.png">/);
  assert.match(html, /<link rel="icon" type="image\/png" sizes="192x192" href="\/icon-192-v2\.png">/);
  assert.doesNotMatch(html, /class="brand-mark" src="icon-512-v2\.png"/);
  assert.match(read('polish.js'), /<img src="icon-192-v2\.png" alt="" width="50" height="50">/);
  // L'icône 512 reste là où elle sert vraiment : application installée (manifest), données structurées, copie hors ligne.
  assert.match(read('manifest.json'), /icon-512-v2\.png/);
  assert.match(read('sw.js'), /icon-512-v2\.png/);
});

test('poids : le fichier rapide reste sans les langues autres que le français (garde-fou 1,1 Mo)', () => {
  assert.ok(size('app.min.js') < 1100 * 1000, 'app.min.js = ' + size('app.min.js') + ' octets');
  assert.ok(size('translations.js') < 130 * 1000, 'translations.js (français + moteur) = ' + size('translations.js') + ' octets');
});

// ---- Démarrage plus rapide (première ouverture) ----
// Dimensions d'un fichier .webp (VP8 / VP8L / VP8X), sans aucune bibliothèque.
function webpSize(f) {
  const b = fs.readFileSync(path.join(root, f));
  assert.strictEqual(b.toString('latin1', 0, 4), 'RIFF', f);
  assert.strictEqual(b.toString('latin1', 8, 12), 'WEBP', f);
  const kind = b.toString('latin1', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  throw new Error('format webp inconnu : ' + kind);
}

test('démarrage : le logo de l\'écran d\'ouverture est une image légère à la bonne taille (2× son affichage, < 60 Ko)', () => {
  const html = read('index.html');
  const m = html.match(/<img id="app-splash-logo-img" src="([^"]+)"[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*>/);
  assert.ok(m, 'logo de l\'écran d\'ouverture introuvable');
  assert.match(m[0], /fetchpriority="high"/, 'le logo passe avant les images de l\'accueil');
  assert.ok(size(m[1]) < 60 * 1024, m[1] + ' = ' + size(m[1]) + ' octets');
  const d = webpSize(m[1]);
  assert.ok(d.w >= 2 * +m[2] - 2 && d.w <= 2 * +m[2] + 2, 'largeur ' + d.w + ' pour un affichage en ' + m[2] + ' px');
  // Même proportions que le logo d'origine (aucune déformation).
  assert.ok(Math.abs(d.w / d.h - +m[2] / +m[3]) < 0.02, 'proportions ' + d.w + 'x' + d.h);
  // L'ancien grand fichier reste là (autres usages éventuels), mais n'est plus demandé à l'ouverture.
  assert.ok(fs.existsSync(path.join(root, 'logo-mark.png')));
  assert.doesNotMatch(html.replace(/<noscript>[\s\S]*?<\/noscript>/g, ''), /src="logo-mark\.png"/);
});

test('démarrage : l\'image de l\'accueil a des tailles adaptées au téléphone (srcset) et ne gêne pas le script principal', () => {
  const html = read('index.html');
  const m = html.match(/<img class="hm-photo"[^>]*>/);
  assert.ok(m);
  const tag = m[0];
  assert.match(tag, /fetchpriority="low"/);
  assert.match(tag, /sizes="[^"]+"/);
  assert.match(tag, /width="1200" height="1152"/, 'dimensions réservées : pas de saut de page');
  const set = [...tag.match(/srcset="([^"]+)"/)[1].split(',')].map((x) => x.trim().split(/\s+/));
  assert.ok(set.length >= 3, 'au moins 3 tailles');
  let prev = 0, prevKb = 0;
  for (const [f, wd] of set) {
    const w = parseInt(wd, 10);
    assert.ok(w > prev, 'tailles dans l\'ordre croissant');
    assert.ok(size(f) > prevKb, f + ' plus lourd que la taille précédente');
    assert.strictEqual(webpSize(f).w, w, f + ' : largeur annoncée ' + w);
    prev = w; prevKb = size(f);
  }
  assert.strictEqual(set[set.length - 1][0], 'hero-phones-v2.webp', 'la plus grande est l\'image d\'origine');
  assert.ok(size(set[0][0]) < 40 * 1024, 'la plus petite < 40 Ko');
});

test('démarrage : le script principal est demandé tout de suite (priorité haute) et sa version est la même partout', () => {
  const html = read('index.html');
  const vers = [...html.matchAll(/app\.min\.js\?v=([a-f0-9]+)/g)].map((x) => x[1]);
  assert.ok(vers.length >= 2, 'préchargement + balise script');
  assert.strictEqual(new Set(vers).size, 1, 'versions différentes : ' + vers.join(', '));
  assert.match(html, /<link rel="preload" href="app\.min\.js\?v=[a-f0-9]+" as="script" fetchpriority="high">/);
  // Le préchargement est dans l'en-tête (avant le corps de la page), sinon il ne sert à rien.
  assert.ok(html.indexOf('rel="preload" href="app.min.js') < html.indexOf('</head>'));
  assert.ok(html.indexOf('<script src="app.min.js?v=') > html.indexOf('</head>') - 1);
});

test('démarrage : le serveur des scripts Firebase est préparé SANS « crossorigin » (les balises script n\'en ont pas)', () => {
  const html = read('index.html');
  // Une connexion préparée avec « crossorigin » ne sert pas à une balise <script src> ordinaire : il faut les deux.
  assert.match(html, /<link rel="preconnect" href="https:\/\/www\.gstatic\.com">/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/firestore\.googleapis\.com" crossorigin>/);
  for (const m of html.matchAll(/<script src="https:\/\/www\.gstatic\.com\/[^"]+"([^>]*)>/g)) assert.doesNotMatch(m[1], /crossorigin/);
});

test('démarrage : la vidéo d\'ouverture n\'est pas téléchargée sur une connexion lente (2G/3G ou moins de 1,5 Mb/s)', () => {
  const html = read('index.html');
  const m = html.match(/var cn=navigator\.connection,slow=([^;]+);/);
  assert.ok(m, 'règle « connexion lente » introuvable');
  assert.match(m[1], /slow-2g\|2g\|3g/);
  assert.match(m[1], /downlink<1\.5/);
  // La règle est évaluée AVANT la décision d\'abandonner la vidéo, et fait partie de la même condition.
  assert.match(html, /if\(window\.__cnQuick\|\|rm\|\|sd\|\|wide\|\|slow\|\|lang!=='fr'\)\{drop\(\);return;\}/);
  // Fonctionnement réel de la règle (sans navigateur : on exécute juste l\'expression).
  const slowOf = (cn) => new Function('cn', 'return !!cn&&(' + m[1].replace(/^!!cn&&\(/, '').replace(/\)\s*$/, '') + ');')(cn);
  assert.strictEqual(slowOf({ effectiveType: '3g', downlink: 0.35 }), true);
  assert.strictEqual(slowOf({ effectiveType: '2g' }), true);
  assert.strictEqual(slowOf({ effectiveType: '4g', downlink: 1.2 }), true);
  assert.strictEqual(slowOf({ effectiveType: '4g', downlink: 1.7 }), false);
  assert.strictEqual(slowOf({ effectiveType: '4g' }), false);
  assert.strictEqual(slowOf(undefined), false, 'navigateur sans cette information (iPhone…) : la vidéo continue comme avant');
});
