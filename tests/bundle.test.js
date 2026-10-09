const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');

test('Fichiers rapides (app.min.js / app.min.css) à jour avec les sources', () => {
  // Si ce test échoue : lance `node tools/build.js` puis envoie app.min.js, app.min.css et index.html.
  execFileSync(process.execPath, [path.join(root, 'tools', 'build.js'), '--check'], { stdio: 'pipe' });
});

test('index.html charge les fichiers rapides avec numéro de version et un plan B', () => {
  const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(h, /app\.min\.css\?v=[0-9a-f]{10}/);
  assert.match(h, /app\.min\.js\?v=[0-9a-f]{10}[^>]*defer[^>]*onerror=/);
  const js = fs.readFileSync(path.join(root, 'app.min.js'), 'utf8');
  const v = h.match(/app\.min\.js\?v=([0-9a-f]{10})/)[1];
  assert.ok(js.startsWith('/*src:' + v + '*/'), 'version de index.html différente de app.min.js');
});

test('Pages légales : présentes, sans faux chiffres ni faux témoignages', () => {
  const l = fs.readFileSync(path.join(root, 'legal.html'), 'utf8');
  for (const id of ['about', 'terms', 'privacy', 'refund', 'contact']) assert.ok(l.includes('<section id="' + id + '"'), id);
  const c = fs.readFileSync(path.join(root, 'company-config.js'), 'utf8');
  assert.match(c, /stats:\s*\[\]/);
  assert.match(c, /testimonials:\s*\[\]/);
});
