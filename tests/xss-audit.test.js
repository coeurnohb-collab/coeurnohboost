// tests/xss-audit.test.js — garde-fou anti-XSS.
// Lance `node --test` : échoue si un nouveau morceau de code insère un texte saisi par une
// personne (nom, titre, bio, commentaire…) dans du HTML sans escapeHtml(), ou construit un
// lien / un onclick de façon dangereuse.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

/* ---------- Extraction des gabarits `...${expr}...` ---------- */
function extractTemplates(src) {
  const out = [];
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  const skipString = (i, q) => { i++; while (i < src.length) { if (src[i] === '\\') { i += 2; continue; } if (src[i] === q) return i + 1; i++; } return i; };
  const skipRegex = (i) => { i++; let cls = false; while (i < src.length) { const c = src[i]; if (c === '\\') { i += 2; continue; } if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) { i++; while (/[a-z]/i.test(src[i])) i++; return i; } else if (c === '\n') return i; i++; } return i; };
  function parseTemplate(i) {
    const start = i; i++; let stat = ''; const exprs = [];
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { stat += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') return { end: i + 1, stat, exprs, line: lineOf(start) };
      if (c === '$' && src[i + 1] === '{') { const es = i + 2; const e = scanCode(es, true); exprs.push(src.slice(es, e.end)); stat += '${}'; i = e.end + 1; continue; }
      stat += c; i++;
    }
    return { end: i, stat, exprs, line: lineOf(start) };
  }
  function scanCode(i, inExpr) {
    let depth = 0, prev = '';
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
      if (c === '"' || c === "'") { i = skipString(i, c); prev = 'x'; continue; }
      if (c === '`') { const t = parseTemplate(i); out.push(t); i = t.end; prev = 'x'; continue; }
      if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) { i = skipRegex(i); prev = 'x'; continue; }
      if (c === '{') depth++;
      if (c === '}') { if (inExpr && depth === 0) return { end: i }; depth--; }
      if (!/\s/.test(c)) prev = c;
      i++;
    }
    return { end: i };
  }
  scanCode(0, false);
  return out;
}

/* ---------- Règle « texte saisi par une personne » ---------- */
// renderAvatarHtml / renderContactLinksHtml échappent déjà tout ce qu'on leur donne (vérifié à la main).
const SAFE_WRAPPERS = ['escapeHtml', 'escapeForJs', 'jsArg', 'safeHref', 'esc', 't', 'tr', 'renderAvatarHtml', 'renderContactLinksHtml'];
// retire récursivement les appels sûrs : escapeHtml(...), t(...) etc.
function stripSafeCalls(e) {
  let prev;
  do {
    prev = e;
    for (const name of SAFE_WRAPPERS) {
      const re = new RegExp('(^|[^\\w.])' + name + '\\(');
      let m;
      while ((m = re.exec(e))) {
        const open = m.index + m[1].length + name.length; let d = 0, q = null, j = open;
        for (; j < e.length; j++) {
          const c = e[j];
          if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
          if (c === '"' || c === "'" || c === '`') { q = c; continue; }
          if (c === '(') d++; else if (c === ')') { d--; if (d === 0) break; }
        }
        e = e.slice(0, m.index + m[1].length) + 'SAFE' + e.slice(j + 1);
      }
    }
  } while (e !== prev);
  return e;
}
const FREE_TEXT = /(\.|^|[^\w])(name|title|description|bio|text|message|caption|content|city|country|address|method|website|username|businessName|sellerName|ownerName|itemTitle|tagline|body|email|phone|offerTitle|clientName|displayName|viewerName|followerName|followedName|notes|reason|msg)\b/;
function risky(expr) {
  // on ignore les chaînes littérales ('...') et les .length (nombres)
  const rest = stripSafeCalls(expr.replace(/\s+/g, ' ').trim()).replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''").replace(/\.length\b/g, '');
  if (rest.includes('`')) return false; // gabarit imbriqué : contrôlé séparément
  return FREE_TEXT.test(rest) && !/^SAFE$/.test(rest);
}

// Expressions relues à la main et jugées sans risque (valeurs fixées par l'équipe, pas par les utilisateurs).
// Format « fichier|expression ». Ce sont des noms de plateformes, pays, paliers ou packs écrits dans le code
// (catalog-data.js, tableaux de script.js), jamais saisis par une personne.
const REVIEWED = new Set([
  'script.js|p.name', 'script.js|q.name', 'script.js|c.name', 'script.js|tier.name', 'script.js|m.pack.title',
  'script.js|p ? p.name : o.platform', "script.js|f.city ? ' · ' + escapeHtml(f.city) : ''",
  'script.js|country.currency', 'script.js|textLenClass(item.description)', 'script.js|150 - bio.length',
  'admin.js|p.name', 'admin.js|PLATFORMS.find(p=>p.id===platformId).name',
  'admin.js|(PLATFORMS.find(p => p.id === s.platformId) || {}).name || s.platformId'
]);

const FRONT_FILES = ['script.js', 'admin.js'];

test('XSS : aucun texte libre n\'est inséré dans du HTML sans escapeHtml()', () => {
  const problems = [];
  for (const f of FRONT_FILES) {
    for (const t of extractTemplates(read(f))) {
      if (!t.stat.includes('<')) continue;
      for (const ex of t.exprs) {
        const k = ex.replace(/\s+/g, ' ').trim();
        if (risky(k) && !REVIEWED.has(f + '|' + k)) problems.push(`${f}:${t.line}  \${${k.slice(0, 90)}}`);
      }
    }
  }
  assert.deepStrictEqual(problems, [], 'Ces expressions insèrent peut-être un texte saisi par une personne. Entoure-les de escapeHtml(...) :\n' + problems.join('\n'));
});

test('XSS : tout href construit à partir d\'une donnée passe par safeHref()', () => {
  const bad = [];
  for (const f of FRONT_FILES) {
    read(f).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/href=\\?"\$\{([^}]*)\}/g)) {
        const x = m[1].trim();
        if (!/^(safeHref\(|SITE_ORIGIN|window\.location\.origin|it\.href|waLink|link\b)/.test(x)) bad.push(`${f}:${i + 1} href="\${${x.slice(0, 60)}}"`);
      }
    });
  }
  assert.deepStrictEqual(bad, [], 'Utilise safeHref(...) pour bloquer javascript: :\n' + bad.join('\n'));
});

test('XSS : jamais escapeHtml() à l\'intérieur d\'une chaîne JavaScript de onclick', () => {
  const bad = [];
  for (const f of ['script.js', 'admin.js', 'menu-pro.js', 'location-center.js', 'api/render-site.js']) {
    read(f).split('\n').forEach((line, i) => {
      if (/\('\$\{(escapeHtml|escapeAttr)\(|,'\$\{(escapeHtml|escapeAttr)\(/.test(line)) bad.push(`${f}:${i + 1}`);
      if (/escapeAttr\([^)]*\)\.replace\(\/'\/g/.test(line)) bad.push(`${f}:${i + 1} (replace d'apostrophe après escapeAttr)`);
    });
  }
  assert.deepStrictEqual(bad, [], 'escapeHtml transforme \' en &#39; qui redevient \' dans un attribut : utilise escapeForJs()/jsStr().\n' + bad.join('\n'));
});

test('XSS : escapeForJs et safeHref résistent aux attaques connues', () => {
  const src = read('script.js');
  const grab = (name) => { const i = src.indexOf('function ' + name + '('); let d = 0, j = src.indexOf('{', i); const st = j; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); };
  const mod = new Function(grab('escapeHtml') + grab('escapeForJs') + grab('safeHref') + grab('jsArg') + 'return { escapeForJs, safeHref, jsArg };')();
  for (const attack of ["\\');alert(1);//", "&#39;);alert(1);//", "'\"<>&\\", "a\nb"]) {
    const out = mod.escapeForJs(attack);
    assert.ok(!/[\\'"&<>\n]/.test(out.replace(/\\u[0-9a-f]{4}/g, '')), 'caractère dangereux restant : ' + JSON.stringify(out));
    assert.strictEqual(new Function('return \'' + out + '\'')(), attack, 'la valeur doit rester identique pour la fonction appelée');
  }
  assert.strictEqual(mod.safeHref('javascript:alert(1)'), '#');
  assert.strictEqual(mod.safeHref(' JaVaScRiPt:alert(1)'), '#');
  assert.strictEqual(mod.safeHref('data:text/html,x'), '#');
  assert.strictEqual(mod.safeHref('https://exemple.com/a?b=1&c=2'), 'https://exemple.com/a?b=1&amp;c=2');
  assert.ok(!/['&<>]/.test(mod.jsArg("o'brien <b> & co").replace(/\\u[0-9a-f]{4}/g, '')));
});

test('XSS : admin.js et render-site.js utilisent les mêmes protections', () => {
  const a = read('admin.js');
  assert.match(a, /padStart\(4, '0'\)/, 'admin.js : escapeForJs doit être la version renforcée');
  const r = read('api/render-site.js');
  assert.match(r, /function jsStr\(/);
  assert.match(r, /function safeHttpUrl\(/);
  assert.doesNotMatch(r, /href="\$\{escapeAttr\(site\.socialLinks/, 'liens sociaux : passer par safeHttpUrl');
});
