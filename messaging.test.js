// Messagerie privée (messaging-pro.js) : modules, langues, sécurité du HTML et notification push de l'API.
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const Module = require('module');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// ---------------------------------------------------------------- module côté téléphone
test('messagerie : le module est du JavaScript valide et exposé sous window.CNMessages', () => {
  const src = read('messaging-pro.js');
  assert.doesNotThrow(() => new vm.Script(src, { filename: 'messaging-pro.js' }));
  assert.match(src, /window\.CNMessages\s*=/);
  assert.match(src, /window\.openChatWith\s*=/);
  assert.match(src, /window\.replyToCurrentStory\s*=/);
});

test('messagerie : français, anglais et espagnol ont exactement les mêmes clés', () => {
  const src = read('messaging-pro.js');
  const keys = {};
  ['fr', 'en', 'es'].forEach((l) => {
    const m = src.match(new RegExp('\\n\\s*' + l + ': \\{([^\\n]*)\\},?\\n'));
    assert.ok(m, 'dictionnaire ' + l + ' introuvable');
    keys[l] = [...m[1].matchAll(/(?:^|,)\s*(\w+):\s*'/g)].map((x) => x[1]).sort();
    assert.ok(keys[l].length > 40, l + ' : dictionnaire trop court');
  });
  assert.deepStrictEqual(keys.en, keys.fr, 'en ≠ fr');
  assert.deepStrictEqual(keys.es, keys.fr, 'es ≠ fr');
});

test('messagerie : chaque texte du module vient du dictionnaire, tout ce qui est inséré en HTML est échappé', () => {
  const src = read('messaging-pro.js');
  const dict = new Set([...src.match(/\n\s*fr: \{([^\n]*)\},?\n/)[1].matchAll(/(?:^|,)\s*(\w+):\s*'/g)].map((x) => x[1]));
  const used = [...src.matchAll(/\bT\('(\w+)'/g)].map((x) => x[1]);
  assert.ok(used.length > 20);
  used.forEach((k) => assert.ok(dict.has(k), 'clé de langue manquante : ' + k));
  // Les noms, textes de messages et adresses d'images viennent d'autres personnes : jamais collés bruts dans innerHTML.
  const bad = [];
  src.split('\n').forEach((line, i) => {
    if (!/innerHTML\s*=/.test(line)) return;
    // retire les morceaux sûrs : esc(...), IC.xxx, T(...) puis cherche une variable collée entre guillemets
    const rest = line.replace(/esc\([^)]*\)/g, '').replace(/IC\.\w+/g, '').replace(/\bT\([^)]*\)/g, '');
    const m = rest.match(/'\s*\+\s*(?!html\b|head\b|searchHtml\b|body\b|url\b|avatar\()([a-zA-Z_][\w.]*(?:\([^)]*\))?)\s*\+\s*'/g);
    if (m) bad.push('messaging-pro.js:' + (i + 1) + '  ' + m.join(' | '));
  });
  assert.deepStrictEqual(bad, [], 'Ces insertions HTML ne sont pas échappées :\n' + bad.join('\n'));
});

test('messagerie : seules les images et vidéos de notre Cloudinary sont acceptées, avec limites de poids', () => {
  const src = read('messaging-pro.js');
  assert.match(src, /res\.cloudinary\.com\/aqe4fxh4\//);
  assert.match(src, /maxSizeMB:\s*isVid \? 50 : 10/, 'limites : vidéo 50 Mo, photo 10 Mo');
  assert.match(src, /image\/\|video\/|\^image|\^video|startsWith\('image\/'\)|startsWith\('video\/'\)/, 'seuls les types image/vidéo');
});

// ---------------------------------------------------------------- intégration dans l'application
test('messagerie : branchée dans la barre du bas, le menu, les profils et les stories — sans rien retirer', () => {
  const html = read('index.html');
  assert.match(html, /id="bnav-messages"/);
  assert.match(html, /id="msg-badge-bnav"/);
  assert.match(html, /id="cn-msg-root"/);
  // « Réseau » existe toujours (contenu inchangé, déplacé dans le menu Services) ; plus dans la barre du bas
  assert.match(html, /id="dash-tab-orders"/);
  assert.match(html, /showDashTab\('orders'\)/);
  const nav = (html.match(/<nav class="bottom-nav">[\s\S]*?<\/nav>/) || [''])[0];
  assert.ok(nav.includes('bnav-messages'), 'Messages est dans la barre du bas');
  assert.ok(!nav.includes("showDashTab('orders')"), 'Réseau n’est plus dans la barre du bas');
  assert.match(html, /menu_community/, 'catégorie « Réseau & messagerie » du menu Services');
  const script = read('script.js');
  assert.match(script, /profile-msg-btn/);
  assert.match(script, /story-reply-btn/);
  assert.match(script, /openMessagesFromLink/);
  assert.match(read('menu-pro.js'), /messaging-pro\.js/);
  assert.match(read('stability.js'), /messaging-pro\.js/);
});

test('messagerie : le bundle app.min.js contient les mêmes branchements que script.js', () => {
  const bundle = read('app.min.js');
  assert.match(bundle, /profile-msg-btn/);
  assert.match(bundle, /story-reply-btn/);
  assert.match(bundle, /openMessagesFromLink/);
  assert.match(bundle, /tab_messages/);
});

// ---------------------------------------------------------------- API : notification push d'un message
const store = {};
const sent = [];
let CALLER = 'u1';
let RATE_LIMITED = false;
const db = {
  collection(n) {
    const mk = (base) => ({
      doc(id) {
        const k = base + '/' + id;
        return {
          async get() { return { exists: store[k] !== undefined, id, data: () => store[k] }; },
          async update(o) { store[k] = Object.assign({}, store[k], o); },
          async set(o) { store[k] = o; },
          collection(sub) { return mk(k + '/' + sub); }
        };
      },
      where() { const q = { limit() { return q; }, async get() { return { docs: [], size: 0, empty: true, forEach() {} }; } }; return q; },
      async add() { return { id: 'x' }; }
    });
    return mk(n);
  }
};
const sec = {
  initFirebaseAdmin() {},
  async verifyCaller() { return { uid: CALLER }; },
  async enforceRateLimit() { if (RATE_LIMITED) { const e = new Error('Trop de requêtes'); e.extra = { retryAfterSec: 30 }; throw e; } },
  cleanText: (v, m, o) => { let s = String(v == null ? '' : v).replace(/[<>]/g, ''); if (!(o && o.keepNewlines)) s = s.replace(/\s+/g, ' '); return s.trim().slice(0, m || 200); },
  safeInternalPath: (u) => (typeof u === 'string' && u.startsWith('/') ? u : '/'),
  ADMIN_UID: 'ADMIN'
};
const push = {
  buildMessage: (o) => o,
  collectTokens: () => [],
  pruneDeadTokens() {},
  async resolvePubImage() { return null; },
  async sendPushToUser() {},
  async sendMulticast(m) { sent.push(m); return { successCount: m.tokens.length, responses: m.tokens.map(() => ({ success: true })) }; }
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'firebase-admin') return { firestore: () => db, apps: [1], auth: () => ({ revokeRefreshTokens() {} }) };
  if (request === './_lib/security') return sec;
  if (request === './_lib/push') return push;
  if (request === './_lib/wallet-ledger') return { buildWalletTxEntry() {} };
  return origLoad.call(this, request, ...rest);
};
const handler = require('../api/notify-user.js');
Module._load = origLoad;

async function post(body, uid) {
  CALLER = uid || 'u1';
  const o = {};
  await handler({ method: 'POST', body, headers: { authorization: 'Bearer x' }, query: {} },
    { setHeader() {}, status(c) { o.status = c; return this; }, json(x) { o.json = x; return this; }, end() {} });
  return o;
}
function reset() {
  Object.keys(store).forEach((k) => delete store[k]);
  sent.length = 0;
  RATE_LIMITED = false;
  store['users/u1'] = { name: 'Alice' };
  store['users/u2'] = { name: 'Bob', fcmTokens: ['tok-a', 'tok-b'] };
  store['public_profiles/u1'] = { username: 'alice' };
  store['chats/u1_u2/messages/msgAAAAAA1'] = { senderId: 'u1', receiverId: 'u2', type: 'text', text: 'Salut <b>Bob</b> !', createdAt: new Date().toISOString() };
}
const ask = (extra, uid) => post(Object.assign({ action: 'chat-push', chatId: 'u1_u2', messageId: 'msgAAAAAA1' }, extra || {}), uid);

test('chat-push : envoie UNE alerte au destinataire, avec le nom de l’expéditeur et le lien vers la conversation', async () => {
  reset();
  const r = await ask();
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.pushSent, true);
  assert.strictEqual(sent.length, 1);
  assert.deepStrictEqual(sent[0].tokens, ['tok-a', 'tok-b']);
  assert.strictEqual(sent[0].title, 'alice');
  assert.strictEqual(sent[0].body, 'Salut bBob/b !', 'le HTML du message est neutralisé');
  assert.strictEqual(sent[0].url, '/?msg=u1_u2');
  assert.ok(store['chats/u1_u2/messages/msgAAAAAA1'].pushedAt, 'message marqué « alerte envoyée »');
});

test('chat-push : rejouer la même demande n’envoie pas une deuxième alerte', async () => {
  reset();
  await ask();
  const again = await ask();
  assert.strictEqual(again.json.pushSent, false);
  assert.strictEqual(sent.length, 1);
});

test('chat-push : impossible de se faire passer pour l’expéditeur ou de notifier un message qui n’est pas le sien', async () => {
  reset();
  const r = await ask({}, 'u2'); // Bob (le destinataire) essaie de déclencher l'alerte du message d'Alice
  assert.strictEqual(r.json.pushSent, false);
  const r2 = await ask({}, 'intrus');
  assert.strictEqual(r2.json.pushSent, false);
  assert.strictEqual(sent.length, 0);
});

test('chat-push : message ancien, inexistant ou identifiant invalide → aucune alerte', async () => {
  reset();
  store['chats/u1_u2/messages/msgAAAAAA1'].createdAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  assert.strictEqual((await ask()).json.pushSent, false);
  reset();
  assert.strictEqual((await ask({ messageId: 'inconnu123' })).json.pushSent, false);
  const bad = await ask({ chatId: '../../users' });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(sent.length, 0);
});

test('chat-push : si le destinataire a bloqué l’expéditeur, aucune alerte', async () => {
  reset();
  store['blocks/u2_u1'] = { blocker: 'u2', blocked: 'u1' };
  const r = await ask();
  assert.strictEqual(r.json.pushSent, false);
  assert.strictEqual(r.json.skipped, 'blocked');
  assert.strictEqual(sent.length, 0);
});

test('chat-push : photo, vidéo et réponse à une story ont un texte d’alerte adapté', async () => {
  reset();
  store['chats/u1_u2/messages/msgAAAAAA1'] = { senderId: 'u1', receiverId: 'u2', type: 'image', text: '', mediaUrl: 'https://res.cloudinary.com/aqe4fxh4/image/upload/a.jpg', createdAt: new Date().toISOString() };
  await ask();
  assert.strictEqual(sent[0].body, '📷 Photo');
  reset();
  store['chats/u1_u2/messages/msgAAAAAA1'].type = 'video';
  store['chats/u1_u2/messages/msgAAAAAA1'].text = '';
  await ask();
  assert.strictEqual(sent[0].body, '🎥 Vidéo');
  reset();
  store['chats/u1_u2/messages/msgAAAAAA1'].storyRef = { storyId: 's1', ownerUid: 'u2' };
  store['chats/u1_u2/messages/msgAAAAAA1'].text = 'Superbe !';
  await ask();
  assert.match(sent[0].body, /A répondu à ta story : Superbe !/);
});

test('chat-push : respecte la limite d’envois (anti-spam) et le choix « notifications désactivées » du destinataire', async () => {
  reset();
  RATE_LIMITED = true;
  const r = await ask();
  assert.strictEqual(r.status, 429);
  assert.strictEqual(sent.length, 0);
  reset();
  store['users/u2'].notifPrefs = { activity: false };
  const r2 = await ask();
  assert.strictEqual(r2.json.pushSent, false);
  assert.strictEqual(sent.length, 0);
});
