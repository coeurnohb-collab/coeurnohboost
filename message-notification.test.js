// Notifications de messages : icône différente des notifications, une notification par conversation, réponse depuis la notification.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { messaging: () => ({}), firestore: () => ({}), apps: [1] };
  if (request === './security') return { initFirebaseAdmin() {}, safeInternalPath: (u) => (typeof u === 'string' && u.startsWith('/') ? u : '/') };
  return origLoad.call(this, request, ...rest);
};
const push = require('../api/_lib/push.js');
Module._load = origLoad;

test('push : un message a sa propre icône (bulle), une notification a la sienne (cloche)', () => {
  const msg = push.buildMessage({ tokens: ['t'], title: 'alice', body: 'Salut', url: '/?msg=u1_u2', category: 'message', extra: { chatId: 'u1_u2', icon: 'https://res.cloudinary.com/aqe4fxh4/image/upload/a.jpg' } });
  assert.strictEqual(msg.data.badge, '/badge-msg-96.png');
  assert.strictEqual(msg.data.chatId, 'u1_u2');
  assert.strictEqual(msg.data.icon, 'https://res.cloudinary.com/aqe4fxh4/image/upload/a.jpg');
  assert.match(msg.data.tag, /^cn-msg-/);
  const n = push.buildMessage({ tokens: ['t'], title: 'x', body: 'y', url: '/?open=abc123', category: 'activity' });
  assert.strictEqual(n.data.badge, '/badge-notif-96.png');
  assert.strictEqual(n.data.chatId, undefined);
  assert.notStrictEqual(msg.data.badge, n.data.badge);
});

test('push : deux conversations ont deux notifications distinctes, jamais une photo venant d’un site inconnu', () => {
  const a = push.buildMessage({ tokens: ['t'], title: 'a', body: 'b', url: '/?msg=aaaa_bbbb', category: 'message', extra: { chatId: 'aaaa_bbbb' } });
  const b = push.buildMessage({ tokens: ['t'], title: 'a', body: 'b', url: '/?msg=aaaa_cccc', category: 'message', extra: { chatId: 'aaaa_cccc' } });
  assert.notStrictEqual(a.data.tag, b.data.tag);
  const bad = push.buildMessage({ tokens: ['t'], title: 'a', body: 'b', url: '/', category: 'message', extra: { chatId: 'aaaa_bbbb', icon: 'https://evil.example/x.png' } });
  assert.strictEqual(bad.data.icon, '/icon-192-v2.png');
  assert.strictEqual(push.safeIconUrl('http://res.cloudinary.com/a.jpg'), '');
  assert.strictEqual(push.safeIconUrl('javascript:alert(1)'), '');
});

test('icônes de la barre d’état : les deux fichiers existent', () => {
  ['badge-msg-96.png', 'badge-notif-96.png'].forEach((f) => {
    const b = fs.readFileSync(path.join(__dirname, '..', f));
    assert.strictEqual(b.slice(1, 4).toString(), 'PNG');
  });
});

test('service worker : bouton « Répondre » avec zone de texte, envoi à l’application, ou mise de côté si elle est fermée', () => {
  const sw = read('sw.js');
  assert.doesNotThrow(() => new vm.Script(sw, { filename: 'sw.js' }));
  assert.match(sw, /action: 'reply', type: 'text'/);
  assert.match(sw, /event\.reply/);
  assert.match(sw, /type: 'cn-reply'/);
  assert.match(sw, /caches\.open\('cn-pending'\)/);
  assert.match(sw, /BADGE_MSG/);
  assert.match(sw, /k !== 'cn-pending'/, 'le nettoyage du cache ne supprime pas les réponses en attente');
  assert.match(sw, /sendreply=1/);
});

test('messagerie : reçoit la réponse du service worker, la renvoie sur demande, et ne reste plus vide si la liste arrive en retard', () => {
  const m = read('messaging-pro.js');
  assert.match(m, /d\.type !== 'cn-reply'/);
  assert.match(m, /function flushPendingReplies/);
  assert.match(m, /function probeChat/);
  assert.match(m, /data-act="retry"/);
  assert.match(m, /sendReplyTo: sendReplyTo/);
  assert.doesNotThrow(() => new vm.Script(m, { filename: 'messaging-pro.js' }));
  assert.ok(!/[\u{1F4F7}\u{1F3A5}\u{1F3A4}\u{1F4C4}\u{1F4DE}]/u.test(m.slice(0, m.indexOf('var EMOJIS'))), 'plus d’emoji décoratif dans les aperçus');
});
