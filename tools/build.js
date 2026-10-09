#!/usr/bin/env node
/* Construit les fichiers rapides de l'application :
     app.min.js  (translations + catalog-data + script + polish + menu-pro + push-center, minifiés)
     app.min.css (style + polish + menu-pro + pro, minifiés)
   puis met à jour index.html (version ?v=… pour le cache longue durée).
   Les fichiers sources (script.js, style.css…) restent la référence : on modifie
   les sources, puis on relance `node tools/build.js`.
   Usage : node tools/build.js          (écrit les fichiers)
           node tools/build.js --check  (échoue si les fichiers construits sont périmés) */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const JS = ['translations.js', 'catalog-data.js', 'script.js', 'polish.js', 'menu-pro.js', 'push-center.js'];
const CSS = ['style.css', 'polish.css', 'menu-pro.css', 'pro.css'];
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
function hashOf(files) {
  const h = crypto.createHash('sha256');
  files.forEach((f) => { h.update(f + '\0' + rd(f) + '\0'); });
  return h.digest('hex').slice(0, 10);
}
const jsHash = hashOf(JS), cssHash = hashOf(CSS);
if (process.argv.includes('--check')) {
  const okJs = rd('app.min.js').startsWith('/*src:' + jsHash + '*/');
  const okCss = rd('app.min.css').startsWith('/*src:' + cssHash + '*/');
  if (!okJs || !okCss) { console.error('app.min.js / app.min.css périmés : lance `node tools/build.js`'); process.exit(1); }
  console.log('Fichiers construits à jour.'); process.exit(0);
}
let esbuild;
try { esbuild = require('esbuild'); } catch (e) { esbuild = require('/opt/npm-tools/node_modules/esbuild'); }
const js = JS.map((f) => esbuild.transformSync(rd(f), { minify: true, target: 'es2019', charset: 'utf8', legalComments: 'none' }).code.replace(/\s+$/, ''));
const css = CSS.map((f) => esbuild.transformSync(rd(f), { loader: 'css', minify: true, charset: 'utf8' }).code.trim());
fs.writeFileSync(path.join(root, 'app.min.js'), '/*src:' + jsHash + '*/' + js.join(';\n') + ';\n');
fs.writeFileSync(path.join(root, 'app.min.css'), '/*src:' + cssHash + '*/' + css.join('\n') + '\n');
let html = rd('index.html');
html = html.replace(/app\.min\.css\?v=[^"]*/, 'app.min.css?v=' + cssHash).replace(/app\.min\.js\?v=[^"]*/, 'app.min.js?v=' + jsHash);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('app.min.js', fs.statSync(path.join(root, 'app.min.js')).size, 'octets — app.min.css', fs.statSync(path.join(root, 'app.min.css')).size, 'octets');
