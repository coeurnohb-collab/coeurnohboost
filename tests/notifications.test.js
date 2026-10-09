// tests/notifications.test.js — clic sur notification, suppression à 10 h, abonné, limites de requêtes.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('showDashTab ne plante plus sur un onglet inconnu (cause du toast rouge)', () => {
  const s = read('script.js');
  const body = s.slice(s.indexOf('function showDashTab(tab)'), s.indexOf('function showDashTab(tab)') + 600);
  assert.match(body, /const tabEl = document\.getElementById\('dash-tab-' \+ tab\);\s*\n\s*if \(!tabEl\)/);
});

test('openNotifRow : vérifie l\'onglet, gère ?profile=, et protège les éléments du détail', () => {
  const s = read('script.js');
  const f = s.slice(s.indexOf('function openNotifRow('), s.indexOf('function closeNotifDetailModal()'));
  assert.match(f, /document\.getElementById\('dash-tab-' \+ tab\)/);
  assert.match(f, /openSharedProfile\(profileUid\)/);
  assert.match(f, /if \(!tEl \|\| !bEl \|\| !mEl\) return;/);
  assert.match(f, /try \{/);
});

test('Messages programmés : cachés après 10 h côté appli, supprimés côté serveur', () => {
  const s = read('script.js'), c = read('api/run-scheduled-broadcasts.js');
  assert.match(s, /SCHEDULED_MSG_LIFETIME_MS = 10 \* 3600 \* 1000/);
  assert.match(s, /\.filter\(isAnnouncementAlive\)/);
  assert.match(c, /async function purgeOldScheduledMessages\(/);
  assert.match(c, /10 \* 3600 \* 1000/);
  assert.match(c, /purged = await purgeOldScheduledMessages\(\)/);
  // comportement du filtre
  const m = s.match(/function isAnnouncementAlive\(a\) \{[\s\S]*?\n\}/)[0];
  const alive = new Function('SCHEDULED_MSG_LIFETIME_MS', m + '; return isAnnouncementAlive;')(36000000);
  const iso = (h) => new Date(Date.now() - h * 3600000).toISOString();
  assert.strictEqual(alive({ type: 'admin_message', createdAt: iso(2) }), true);
  assert.strictEqual(alive({ type: 'admin_message', createdAt: iso(11) }), false);
  assert.strictEqual(alive({ type: 'announcement', createdAt: iso(100) }), true);
});

test('Nouvel abonné : notification + push, une seule par paire', () => {
  const s = read('script.js');
  assert.match(s, /notifyNewFollower\(sellerUid\)/);
  assert.match(s, /doc\(`follow_\$\{currentUser\.uid\}_\$\{targetUid\}`\)/);
  assert.match(s, /type: 'follow'/);
});

test('Requêtes Firestore : plus de liste sans limit()', () => {
  const s = read('script.js');
  const bad = [];
  for (const m of s.matchAll(/db\.collection\('([a-z_]+)'\)/g)) {
    const seg = s.slice(m.index, m.index + 600);
    const e = seg.match(/\.(get|onSnapshot)\(/);
    if (!e) continue;
    const chain = seg.slice(0, e.index);
    if (chain.includes('.doc(') || chain.includes('.limit(') || /^(pricing|bundle_pricing)$/.test(m[1])) continue;
    bad.push(m[1] + '@' + s.slice(0, m.index).split('\n').length);
  }
  assert.deepStrictEqual(bad, []);
});

test('Accueil : le logo d\'ambiance est bien visible', () => {
  const p = read('polish.css');
  assert.match(p, /body:has\(#view-dashboard:not\(\.hidden\)\)::before/);
  assert.doesNotMatch(p, /opacity: \.058/);
});

test('Paiement carte : guide « carte → USDT → Cryptomus » tant que MaxiCash n\'est pas en réel', () => {
  const s = read('script.js'), h = read('index.html');
  assert.match(s, /const CARD_VIA_MAXICASH = false;/);
  assert.match(s, /selectPayMethod\('crypto'\)/);
  assert.match(s, /if \(payMethod === 'card' && !CARD_VIA_MAXICASH\) \{ selectPayMethod\('crypto'\); return; \}/);
  assert.match(h, /id="pay-card-guide"/);
  for (const l of ['fr', 'en', 'es', 'it', 'pt']) assert.match(s, new RegExp('\\n  ' + l + ': \\{ title:'));
});
