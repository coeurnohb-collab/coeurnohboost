// Entreprises : cartes « vitrine » de la liste « Découvrir » (renderBusinessCards dans script.js + styles .bzl-*).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function extract() {
  const a = script.indexOf('function renderBusinessCards(list) {');
  const b = script.indexOf('async function openBusinessDetail(ownerUid) {');
  assert.ok(a > 0 && b > a, 'fonction trouvée');
  return script.slice(a, b);
}
function render(list, blocked) {
  const out = { html: '' };
  const ctx = {
    document: { getElementById: () => ({ set innerHTML(v) { out.html = v; }, get innerHTML() { return out.html; } }) },
    blockedSet: new Set(blocked || []),
    t: (k) => '[' + k + ']',
    escapeHtml: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';'),
    escapeForJs: (s) => String(s == null ? '' : s).replace(/[\\'"<>&\n\r]/g, (c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')),
    safeHref: (u) => (/^(https?:|tel:|mailto:)/i.test(String(u)) ? String(u) : '#'),
    ICON_LOCATION: '<i-loc></i-loc>', ICON_PHONE: '<i-tel></i-tel>', ICON_WHATSAPP: '<i-wa></i-wa>', ICON_SHARE: '<i-sh></i-sh>', ICON_VERIFIED_BADGE: '<i-ok></i-ok>',
    NEARBY_CATEGORY_LABELS: { resto: 'cat_resto' },
    businessIsProActive: (b) => !!b.pro
  };
  vm.createContext(ctx);
  vm.runInContext(extract() + '; this.renderBusinessCards = renderBusinessCards;', ctx);
  ctx.renderBusinessCards(list);
  return out.html;
}

test('entreprises : une carte par entreprise avec les gestes utiles', () => {
  const html = render([{ ownerUid: 'owner_aaaaaa', businessName: 'Kasa', category: 'resto', tagline: 'Accroche', address: 'Gombe', whatsapp: '+243 812 345 678', phone: '+243 812 345 678', viewsCount: 1200, adminVerified: true, pro: true }]);
  assert.strictEqual((html.match(/class="bzl-card/g) || []).length, 1);
  assert.match(html, /bzl-card pro/);
  assert.match(html, /1 \[svc_business\]/, 'compteur');
  assert.match(html, /openBusinessDetail\('owner_aaaaaa'\)/);
  assert.match(html, /href="https:\/\/wa\.me\/243812345678"[^>]*target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="tel:\+243812345678"/);
  assert.match(html, /shareBusiness\('owner_aaaaaa','Kasa'\)/);
  assert.match(html, /<i-ok>/, 'badge vérifié');
  assert.match(html, /\[business_pro_badge\]/);
  assert.match(html, /\[business_view_page_btn\]/);
});

test('entreprises : sans photo, sans accroche, sans contact — rien de cassé ; entreprises bloquées masquées', () => {
  const html = render([{ ownerUid: 'owner_bbbbbb', businessName: 'Le Soleil', category: 'resto' }, { ownerUid: 'owner_blocked', businessName: 'Bloquée', category: 'resto' }], ['owner_blocked']);
  assert.strictEqual((html.match(/class="bzl-card/g) || []).length, 1);
  assert.doesNotMatch(html, /Bloquée/);
  assert.match(html, /bzl-nocover/);
  assert.match(html, /bzl-initial[^>]*>L</);
  assert.doesNotMatch(html, /wa\.me|tel:|bzl-tag|bzl-meta/);
  assert.match(render([]), /\[business_empty_browse\]/);
});

test('entreprises : un texte piégé ne devient jamais du code', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const html = render([{ ownerUid: "o');alert(1);//", businessName: evil, category: 'resto', tagline: evil, address: evil, logoUrl: 'x" onerror="alert(1)', coverImageUrl: 'y" onerror="alert(2)', whatsapp: 'javascript:alert(1)' + '1234567', phone: 'javascript:alert(3)' }]);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /onerror="alert/, 'attribut injecté');
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /openBusinessDetail\('o'\);alert/);
});

test('entreprises : styles de la liste — ardoise pour les icônes, bleu d\'action rare, pas de dégradé ni d\'emoji', () => {
  const block = css.slice(css.indexOf('/* Entreprises : cartes « vitrine »'), css.indexOf('.biz-icon-btn{width:38px;'));
  assert.ok(block.length > 500);
  ['.bzl-card', '.bzl-cover', '.bzl-logo', '.bzl-id', '.bzl-pro', '.bzl-acts', '.bzl-ib', '.bzl-view', '.bzl-count'].forEach((c) => assert.ok(block.includes(c + '{') || block.includes(c + ' '), c));
  assert.doesNotMatch(block, /gradient\(/);
  assert.doesNotMatch(block, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.match(block, /\.bzl-ib\{[^}]*color:var\(--slate\)/);
  assert.match(block, /\.bzl-ib:focus-visible\{outline:3px solid var\(--action-ring\)/);
  assert.doesNotMatch(block, /#f39c1f|var\(--accent\)/, 'l\'orange est réservé au globe, « Vendre » et à la barre du bas');
});
