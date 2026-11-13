// Icônes et images gérées par l'administrateur : accueil, pages publiques, Académie ; chargement fiable de « Donner mon site ».
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), icons = read('admin-icons.js'), script = read('script.js'), menu = read('menu-pro.js');

test('accueil : 13 services + 4 « confiance » + 4 « pourquoi nous » portent une clé data-ik', () => {
  const keys = (html.match(/data-ik="[a-z_0-9]+"/g) || []).map((x) => x.slice(9, -1));
  assert.strictEqual(keys.length, 21);
  assert.strictEqual(new Set(keys).size, 21);
  assert.strictEqual(keys.filter((k) => k.startsWith('svc_')).length, 13);
  assert.strictEqual(keys.filter((k) => k.startsWith('home_trust_')).length, 4);
  assert.strictEqual(keys.filter((k) => k.startsWith('home_why_')).length, 4);
});

test('accueil : chaque clé svc_<id> correspond à un service du menu (même photo dans l\'application et sur l\'accueil)', () => {
  const ids = [...menu.matchAll(/\{ id: '([a-z_]+)', grp:/g)].map((m) => m[1]);
  const svc = (html.match(/data-ik="svc_[a-z]+"/g) || []).map((x) => x.slice(13, -1));
  assert.ok(svc.length === 13);
  svc.forEach((id) => assert.ok(ids.includes(id), 'service absent du menu : ' + id));
});

test('admin-icons.js : accueil, Académie, « changer partout » et feuille d\'administration', () => {
  assert.match(icons, /function applyHome\(\)/);
  assert.match(icons, /function applyAcademy\(\)/);
  assert.match(icons, /\.hm-ico\[data-ik\]/);
  assert.match(icons, /acad_hero/);
  assert.match(icons, /'acad_' \+/);
  assert.match(icons, /data-sh="pickall"/);
  assert.match(icons, /data-sh="resetall"/);
  assert.match(icons, /function shapeOf\(svg\) \{ return 'any_'/);
  assert.match(icons, /data-home="1"/);
  // la photo de couverture ne doit jamais utiliser de dégradé
  assert.ok(!/gradient\(/.test(icons), 'aucun dégradé dans admin-icons.js');
  // seul l'administrateur peut ouvrir les feuilles
  assert.match(icons, /if \(isAdm\(\)\) \{ ev\.preventDefault\(\); ev\.stopPropagation\(\); openHome\(\); \}/);
});

test('showcase.js : une photo peut être enregistrée sous plusieurs clés en une seule écriture', () => {
  const sc = read('showcase.js');
  assert.match(sc, /function pickPhoto\(k, extra\)/);
  assert.match(sc, /function dropPhoto\(k, extra\)/);
  assert.match(sc, /ks\.forEach\(function \(x\) \{ o\[key\(x\)\] = up\.url; \}\)/);
});

test('Académie : chaque illustration de catégorie est repérée (data-art) pour pouvoir être remplacée', () => {
  const art = read('academy-art.js');
  assert.match(art, /data-art=/);
});

test('pages publiques : la photo choisie remplace l\'icône, jamais une adresse non https', () => {
  const pub = require('../api/_lib/public-pages');
  pub.setPhotos({});
  assert.ok(!pub.serviceTile('immobilier').includes('<img'));
  pub.setPhotos({ svc_immo: 'https://res.cloudinary.com/x/y.jpg', svc_travel: 'javascript:alert(1)', svc_jobs: 'http://x/y.jpg', svc_shop: 'https://a.b/c"onerror="x' });
  assert.match(pub.serviceTile('immobilier'), /<img src="https:\/\/res\.cloudinary\.com\/x\/y\.jpg"/);
  assert.ok(!pub.serviceTile('voyages-et-tourisme').includes('<img'));
  assert.ok(!pub.serviceTile('emploi-et-freelance').includes('<img'));
  assert.ok(!pub.serviceTile('boutique-en-ligne').includes('<img'));
  pub.setPhotos({});
});

test('render-site : les photos sont lues une fois toutes les 5 minutes, sans jamais bloquer la page', () => {
  const rs = read('api/render-site.js');
  assert.match(rs, /async function refreshShowcasePhotos\(\)/);
  assert.match(rs, /5 \* 60 \* 1000/);
  assert.match(rs, /if \(req\.query\.guide \|\| req\.query\.landing\) await refreshShowcasePhotos\(\);/);
  assert.ok(!/var\(--gold\)/.test(rs), 'ancienne couleur dorée retirée');
});

test('« Donner mon site » : fichier au nom unique, rechargement automatique, plus de confusion avec le fichier serveur', () => {
  assert.ok(fs.existsSync(path.join(root, 'site-give.js')));
  assert.ok(!fs.existsSync(path.join(root, 'site-transfer.js')), 'l\'ancien nom ne doit plus exister à la racine');
  assert.match(script, /site-give\.js\?v=/);
  assert.ok(!/'site-transfer\.js\?v=/.test(script));
  assert.match(script, /function cnLazyModule\(attr, src, ready, ok, ko\)/);
  assert.match(script, /'&r=' \+ Date\.now\(\)/);
  assert.match(read('site-give.js'), /window\.CNSiteTransfer = \{ give: openGive/);
});

test('versions : les modules à la demande sont rechargés après cette mise à jour', () => {
  assert.match(read('stability.js'), /var V = '20261111';/);
  assert.match(read('auth-guard.js'), /stability\.js\?v=20261111/);
  assert.match(menu, /auth-guard\.js\?v=20261111/);
  assert.match(read('sw.js'), /CACHE_NAME = 'coeurnohboost-v28'/);
});

test('chargement : indicateurs de chargement sans dégradé', () => {
  assert.ok(!/skeleton-shine\{background:linear-gradient/.test(read('style.css')));
  assert.ok(!/\.cnh-skel\{[^}]*gradient/.test(read('academy-ui.css')));
});
