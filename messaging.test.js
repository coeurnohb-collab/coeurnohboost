// Messagerie privée (messaging-pro.js) : modules, langues, sécurité du HTML et notification push de l'API.
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const Module = require('module');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// ---------------------------------------------------------------- modules côté téléphone
// Lit le dictionnaire compact « clé: ['fr','en','es','it','pt'] » d'un module.
function dictOf(src) {
  const start = src.indexOf('var D = {');
  assert.ok(start >= 0, 'dictionnaire introuvable');
  const end = src.indexOf('\n  };', start);
  const body = src.slice(start, end);
  const rows = {};
  for (const m of body.matchAll(/\n\s*(\w+):\s*\[((?:'(?:[^'\\]|\\.)*'\s*,?\s*)+)\]/g)) {
    rows[m[1]] = [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
  }
  return rows;
}

test('messagerie : les modules sont du JavaScript valide et exposés', () => {
  const src = read('messaging-pro.js');
  assert.doesNotThrow(() => new vm.Script(src, { filename: 'messaging-pro.js' }));
  assert.match(src, /window\.CNMessages\s*=/);
  assert.match(src, /window\.openChatWith\s*=/);
  assert.match(src, /window\.replyToCurrentStory\s*=/);
  const calls = read('calls-pro.js');
  assert.doesNotThrow(() => new vm.Script(calls, { filename: 'calls-pro.js' }));
  assert.match(calls, /window\.CNCalls\s*=/);
  const adm = read('admin-messages.js');
  assert.doesNotThrow(() => new vm.Script(adm, { filename: 'admin-messages.js' }));
  assert.match(adm, /window\.openAdminMessage\s*=/);
});

test('messagerie : 5 langues (fr, en, es, it, pt), mêmes clés, aucune traduction vide', () => {
  ['messaging-pro.js', 'calls-pro.js'].forEach((f) => {
    const rows = dictOf(read(f));
    const keys = Object.keys(rows);
    assert.ok(keys.length > (f === 'calls-pro.js' ? 15 : 80), f + ' : dictionnaire trop court (' + keys.length + ')');
    keys.forEach((k) => {
      assert.strictEqual(rows[k].length, 5, f + ' · « ' + k + ' » doit avoir 5 langues');
      rows[k].forEach((t, i) => assert.ok(t.trim().length > 0, f + ' · « ' + k + ' » vide en langue ' + i));
    });
  });
});

test('messagerie : chaque texte demandé au dictionnaire existe, tout ce qui est inséré en HTML est échappé', () => {
  ['messaging-pro.js', 'calls-pro.js'].forEach((f) => {
    const src = read(f);
    const dict = dictOf(src);
    const used = [...src.matchAll(/\bT\('(\w+)'\s*[,)]/g)].map((x) => x[1]);
    // clés construites (ex. T('tk_' + état), T('call_' + type)) : toutes leurs variantes doivent exister
    [...src.matchAll(/\bT\('(\w+_)'\s*\+/g)].forEach((x) => assert.ok(Object.keys(dict).some((k) => k.startsWith(x[1])), f + ' · aucune clé « ' + x[1] + '… »'));
    assert.ok(used.length > 10, f + ' : trop peu de textes');
    used.forEach((k) => assert.ok(dict[k], f + ' · clé de langue manquante : ' + k));
  });
  // Les noms, textes de messages et adresses d'images viennent d'autres personnes : jamais collés bruts dans innerHTML.
  const bad = [];
  ['messaging-pro.js', 'calls-pro.js', 'admin-messages.js'].forEach((f) => {
    read(f).split('\n').forEach((line, i) => {
      if (!/innerHTML\s*=/.test(line) || /EMOJIS\.map/.test(line)) return; // la liste d'emojis est une constante du module
      const rest = line.replace(/esc\([^)]*\)/g, '').replace(/IC\.\w+/g, '').replace(/\bT\([^)]*\)/g, '');
      const m = rest.match(/'\s*\+\s*(?!html\b|head\b|searchHtml\b|body\b|url\b|avatar\(|out\b|h\b|pv\b|tkSvg\(|fmtSize\(|initial\(|tkHtml\(|tickHtml\()([a-zA-Z_][\w.]*(?:\([^)]*\))?)\s*\+\s*'/g);
      if (m) bad.push(f + ':' + (i + 1) + '  ' + m.join(' | '));
    });
  });
  assert.deepStrictEqual(bad, [], 'Ces insertions HTML ne sont pas échappées :\n' + bad.join('\n'));
});

test('messagerie : fichiers, vocaux, photos et vidéos — types, poids, adresses Cloudinary et fichiers dangereux', () => {
  const src = read('messaging-pro.js');
  assert.match(src, /res\.cloudinary\.com\/aqe4fxh4\//);
  assert.match(src, /BAD_EXT/, 'les programmes (.exe, .apk…) sont refusés');
  assert.match(src, /type:\s*'file'|'file'/);
  assert.match(src, /type:\s*'audio'|'audio'/);
  assert.match(src, /maxSizeMB:/);
  // les messages vocaux (audio/*) partent en « video » chez Cloudinary (leur type pour l'audio), pas en « raw »
  const script = read('script.js');
  assert.match(script, /file\.type\.startsWith\('audio\/'\)\)\s*resourceType = 'video'/);
  assert.match(read('app.min.js'), /startsWith\("audio\/"\)/, 'le bundle contient la même règle');
});

test('messagerie : coches ✓ envoyé, ✓✓ gris reçu, ✓✓ bleu lu — champs reads / delivered / unread', () => {
  const src = read('messaging-pro.js');
  assert.match(src, /delivered/);
  assert.match(src, /function tickState/);
  assert.match(src, /return 'read'/);
  assert.match(src, /return 'delivered'/);
  assert.match(src, /return 'sent'/);
  assert.match(src, /unread/);
  assert.match(src, /typing/);
});

test('messagerie : tout le monde peut écrire à tout le monde (recherche de personnes), seul le blocage empêche', () => {
  const src = read('messaging-pro.js');
  assert.match(src, /public_profiles/);
  assert.match(src, /function searchPeople/);
  assert.ok(!/need_follow/.test(src), 'plus aucune obligation de s’abonner');
  assert.match(src, /isBlocked|blocks/);
});

test('appels : audio/vidéo WebRTC, signalisation Firestore, notification d’appel, refus, occupé, annulation', () => {
  const src = read('calls-pro.js');
  assert.match(src, /RTCPeerConnection/);
  assert.match(src, /call_inbox/);
  assert.match(src, /candidates/);
  assert.match(src, /'busy'/);
  assert.match(src, /'declined'/);
  assert.match(src, /'cancelled'/);
  assert.match(src, /call-push/);
  assert.match(src, /app_config/, 'serveur TURN configurable par l’administrateur');
  assert.match(read('messaging-pro.js'), /calls-pro\.js\?v=/);
});

test('admin : bouton « Message » dans la liste des utilisateurs, module chargé par admin.html', () => {
  assert.match(read('admin.html'), /admin-messages\.js\?v=/);
  assert.match(read('admin.js'), /openAdminMessage\(/);
  assert.match(read('admin-messages.js'), /chat-push/);
});

test('actualisation : on revient là où on était, sans intro ni retour à l’Accueil', () => {
  const html = read('index.html');
  assert.match(html, /__cnQuick/);
  assert.match(html, /cn_resume/);
  const script = read('script.js');
  assert.match(script, /function cnSaveResume/);
  assert.match(script, /function cnApplyResume/);
  assert.match(script, /function cnRefreshInPlace/);
  assert.match(script, /showDashboard\(cnResume \? cnResume\.tab : undefined\)/);
  assert.match(script, /function showDashboard\(initialTab\)/);
  assert.match(script, /openCallFromLink/);
  const ptr = read('pull-refresh.js');
  assert.match(ptr, /cnRefreshInPlace/);
  assert.match(read('polish.css'), /html\.cn-quick #app-splash/);
  const bundle = read('app.min.js');
  assert.match(bundle, /cn_resume/);
  assert.match(bundle, /cnRefreshInPlace/);
});

test('versions : le module de messagerie est rechargé (menu, démarrage sûr) avec la même version', () => {
  const m = read('menu-pro.js').match(/messaging-pro\.js\?v=(\d+)/);
  const st = read('stability.js').match(/messaging-pro\.js\?v=(\d+)/);
  assert.ok(m && st, 'version absente');
  assert.strictEqual(m[1], st[1], 'menu-pro.js et stability.js doivent charger la même version');
});

// ---------------------------------------------------------------- intégration dans l'application
test('messagerie : branchée dans la barre du bas, le menu, les profils et les stories — sans rien retirer', () => {
  const html = read('index.html');
  assert.match(html, /id="bnav-messages"/);
  assert.match(html, /id="msg-badge-bnav"/);
  assert.match(html, /id="cn-msg-root"/);
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

// ---------------------------------------------------------------- API : notification d'appel entrant
const askCall = (extra, uid) => post(Object.assign({ action: 'call-push', callId: 'call123456' }, extra || {}), uid);
function resetCall() {
  reset();
  store['calls/call123456'] = { members: ['u1', 'u2'], callerId: 'u1', calleeId: 'u2', kind: 'audio', status: 'ringing', createdAt: new Date().toISOString() };
}

test('call-push : alerte « appel entrant » au destinataire (courte durée de vie), lien vers l’appel', async () => {
  resetCall();
  const r = await askCall();
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.pushSent, true);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].title, 'alice');
  assert.match(sent[0].body, /Appel vocal entrant/);
  assert.strictEqual(sent[0].url, '/?call=call123456');
  assert.strictEqual(sent[0].category, 'call');
  assert.strictEqual(sent[0].ttlSec, 45, 'l’alerte expire vite : pas d’appel fantôme');
});

test('call-push : vidéo, une seule alerte par appel, impossible pour un tiers', async () => {
  resetCall();
  store['calls/call123456'].kind = 'video';
  await askCall();
  assert.match(sent[0].body, /Appel vidéo entrant/);
  const again = await askCall();
  assert.strictEqual(again.json.pushSent, false);
  resetCall(); sent.length = 0;
  assert.strictEqual((await askCall({}, 'u2')).json.pushSent, false, 'le destinataire ne peut pas déclencher l’alerte');
  assert.strictEqual((await askCall({}, 'intrus')).json.pushSent, false);
  assert.strictEqual(sent.length, 0);
});

test('call-push : appel terminé, ancien, bloqué ou identifiant invalide → aucune alerte', async () => {
  resetCall(); store['calls/call123456'].status = 'ended';
  assert.strictEqual((await askCall()).json.pushSent, false);
  resetCall(); store['calls/call123456'].createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assert.strictEqual((await askCall()).json.pushSent, false);
  resetCall(); store['blocks/u2_u1'] = { blocker: 'u2', blocked: 'u1' };
  const b = await askCall();
  assert.strictEqual(b.json.skipped, 'blocked');
  resetCall();
  assert.strictEqual((await askCall({ callId: '../x' })).status, 400);
  assert.strictEqual(sent.length, 0);
});

test('chat-push : message vocal et document ont un texte d’alerte adapté, un journal d’appel n’en génère pas', async () => {
  reset();
  Object.assign(store['chats/u1_u2/messages/msgAAAAAA1'], { type: 'audio', text: '', mediaUrl: 'https://res.cloudinary.com/aqe4fxh4/video/upload/a.webm' });
  await ask();
  assert.match(sent[0].body, /🎤/);
  reset();
  Object.assign(store['chats/u1_u2/messages/msgAAAAAA1'], { type: 'file', text: '', fileName: 'Contrat.pdf', mediaUrl: 'https://res.cloudinary.com/aqe4fxh4/raw/upload/a.pdf' });
  await ask();
  assert.match(sent[0].body, /Contrat\.pdf/);
  reset(); sent.length = 0;
  Object.assign(store['chats/u1_u2/messages/msgAAAAAA1'], { type: 'call', text: '', call: { kind: 'audio', status: 'ended', duration: 12 } });
  const r = await ask();
  assert.strictEqual(r.json.pushSent, false);
  assert.strictEqual(sent.length, 0);
});
