/* admin-messages.js — Messagerie de l'espace administrateur.
   • Bouton « 💬 Message » sur chaque utilisateur de la liste : conversation privée en direct (texte, photo, vidéo, PDF/documents).
   • Bouton « 📬 Conversations » : toutes les conversations de l'admin avec les messages non lus, pour répondre sans quitter l'admin.
   • Recherche rapide dans la liste des utilisateurs.
   Les messages sont écrits exactement comme ceux de l'application (même format, mêmes coches ✓ / ✓✓ / ✓✓ bleu, même notification
   push) : l'utilisateur les reçoit dans son onglet Messages. Fichier indépendant, jamais bloquant pour le reste de l'admin. */
(function () {
  'use strict';
  if (window.__cnAdminMsg) return; window.__cnAdminMsg = true;

  var MAX_DOC = 10, MAX_IMG = 10, MAX_VID = 50;
  var BAD_EXT = /\.(exe|msi|bat|cmd|com|scr|apk|jar|js|vbs|ps1|sh|dll|php)$/i;
  var st = { peer: '', name: '', unsubMsgs: null, unsubChat: null, chat: {}, msgs: [], file: null, sending: false, timer: null };

  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function meUid() { return (typeof auth !== 'undefined' && auth && auth.currentUser && auth.currentUser.uid) || ''; }
  function chatIdOf(a, b) { return [a, b].sort().join('_'); }
  function iso() { return new Date().toISOString(); }
  function el(id) { return document.getElementById(id); }
  function hm(t) { try { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); } catch (e) { return ''; } }
  function dayLabel(t) {
    try {
      var d = new Date(t), n = new Date(), y = new Date(Date.now() - 86400000);
      if (d.toDateString() === n.toDateString()) return "Aujourd'hui";
      if (d.toDateString() === y.toDateString()) return 'Hier';
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
  }
  function fmtSize(n) { n = Number(n) || 0; return n > 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko'; }
  function safeUrl(u) { u = String(u || ''); return /^https:\/\/res\.cloudinary\.com\//.test(u) ? u : ''; }
  function initial(n) { return esc((String(n || '?').trim()[0] || '?').toUpperCase()); }

  /* ---------------------------------------------------------------- styles */
  var CSS = '' +
    '.am-ov{position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:0}' +
    '.am-box{background:#f4f6fb;width:100%;max-width:560px;height:100%;max-height:100dvh;display:flex;flex-direction:column;overflow:hidden;font-family:inherit}' +
    '@media(min-width:700px){.am-box{height:min(86vh,760px);border-radius:20px;box-shadow:0 24px 70px rgba(15,23,42,.35)}}' +
    '.am-hd{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-bottom:1px solid #e3e9f5;flex:none}' +
    '.am-x{border:0;background:#eef2fa;color:#1d2b4f;width:38px;height:38px;border-radius:50%;font-size:1.15rem;cursor:pointer;flex:none}' +
    '.am-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1d4f91,#3b7bd4);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}' +
    '.am-who{min-width:0;flex:1}.am-who b{display:block;font-size:.98rem;color:#142036;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.am-who small{display:block;font-size:.76rem;color:#6b7a99}.am-who small.on{color:#17863f;font-weight:700}' +
    '.am-body{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:4px;-webkit-overflow-scrolling:touch}' +
    '.am-day{align-self:center;background:#e4eaf6;color:#52627f;font-size:.72rem;font-weight:700;padding:4px 12px;border-radius:99px;margin:10px 0 6px}' +
    '.am-empty{margin:auto;text-align:center;color:#6b7a99;font-size:.9rem;padding:20px}' +
    '.am-b{max-width:82%;padding:8px 11px 6px;border-radius:16px;font-size:.92rem;line-height:1.4;word-break:break-word;position:relative;background:#fff;color:#142036;box-shadow:0 1px 2px rgba(15,23,42,.08);align-self:flex-start;border-bottom-left-radius:5px}' +
    '.am-b.me{align-self:flex-end;background:#dcebff;border-bottom-left-radius:16px;border-bottom-right-radius:5px}' +
    '.am-b img,.am-b video{max-width:100%;border-radius:10px;display:block;margin-bottom:4px;max-height:300px}' +
    '.am-b audio{width:220px;max-width:100%}' +
    '.am-t{display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:.68rem;color:#6b7a99;margin-top:2px}' +
    '.am-tk{display:inline-flex;color:#8a97b3;line-height:0}.am-tk svg{display:block}.am-tk.r{color:#2b8cff}' +
    '.am-f{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;background:rgba(29,79,145,.08);border-radius:12px;padding:9px 10px;min-width:210px}' +
    '.am-f i{font-style:normal;width:38px;height:38px;border-radius:10px;background:#d7263d;color:#fff;font-weight:800;font-size:.7rem;display:flex;align-items:center;justify-content:center;flex:none}' +
    '.am-f span{min-width:0;display:block}.am-f b{display:block;font-size:.84rem;word-break:break-all;color:#142036}.am-f small{color:#6b7a99;font-size:.72rem}' +
    '.am-sys{align-self:center;background:#fff3d6;color:#7a5200;font-size:.76rem;padding:4px 12px;border-radius:99px;margin:4px 0}' +
    '.am-ft{flex:none;background:#fff;border-top:1px solid #e3e9f5;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}' +
    '.am-pre{display:flex;align-items:center;gap:8px;background:#eef2fa;border-radius:12px;padding:7px 10px;margin-bottom:8px;font-size:.82rem;color:#142036}' +
    '.am-pre b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-pre button{border:0;background:none;font-size:1.1rem;cursor:pointer;color:#6b7a99}' +
    '.am-row{display:flex;align-items:flex-end;gap:8px}' +
    '.am-in{flex:1;resize:none;border:1px solid #d5ddee;background:#f4f6fb;border-radius:20px;padding:10px 14px;font:inherit;font-size:.94rem;max-height:120px;min-height:42px;outline:none;color:#142036}' +
    '.am-in:focus{border-color:#1d4f91;background:#fff}' +
    '.am-ib,.am-sd{border:0;width:42px;height:42px;border-radius:50%;cursor:pointer;flex:none;font-size:1.15rem;display:flex;align-items:center;justify-content:center}' +
    '.am-ib{background:#eef2fa;color:#1d2b4f}.am-sd{background:#1d4f91;color:#fff}.am-sd:disabled{opacity:.5}' +
    '.am-note{font-size:.72rem;color:#8a97b3;margin-top:6px;text-align:center}' +
    '.am-li{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border-bottom:1px solid #eef1f8;cursor:pointer;width:100%;border-left:0;border-right:0;border-top:0;text-align:left;font:inherit}' +
    '.am-li:active{background:#f0f4fb}.am-li .am-who small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.am-bd{background:#d7263d;color:#fff;border-radius:99px;font-size:.72rem;font-weight:800;min-width:22px;height:22px;display:flex;align-items:center;justify-content:center;padding:0 6px}' +
    '.am-list{flex:1;overflow-y:auto}.am-tm{font-size:.7rem;color:#8a97b3;white-space:nowrap}' +
    '.am-filter{width:100%;box-sizing:border-box;border:1px solid #d5ddee;border-radius:14px;padding:11px 14px;font:inherit;font-size:.92rem;margin:0 0 10px;background:#fff}' +
    '.am-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}';
  function injectCss() { if (el('am-css')) return; var s = document.createElement('style'); s.id = 'am-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------------------------------------------------------------- fenêtre de conversation */
  function stopListeners() {
    try { if (st.unsubMsgs) st.unsubMsgs(); } catch (e) { }
    try { if (st.unsubChat) st.unsubChat(); } catch (e) { }
    st.unsubMsgs = st.unsubChat = null; clearInterval(st.timer);
  }
  function closeChat() { stopListeners(); var o = el('am-chat'); if (o) o.remove(); st.peer = ''; st.file = null; }

  async function openAdminMessage(uid, name) {
    var me = meUid();
    if (!me) { alert('Connexion admin introuvable.'); return; }
    if (!uid || uid === me) { alert("Choisis un autre utilisateur (c'est ton propre compte)."); return; }
    injectCss(); closeChat();
    if (!name) { try { var p = await db.collection('public_profiles').doc(uid).get(); name = p.exists && (p.data().name || p.data().username) || ''; } catch (e) { } }
    st.peer = uid; st.name = name || 'Utilisateur'; st.msgs = []; st.chat = {}; st.file = null;
    var ov = document.createElement('div'); ov.className = 'am-ov'; ov.id = 'am-chat';
    ov.innerHTML = '<div class="am-box" role="dialog" aria-label="Message">' +
      '<div class="am-hd"><button class="am-x" id="am-back" aria-label="Fermer">←</button><div class="am-av">' + initial(st.name) + '</div>' +
      '<div class="am-who"><b>' + esc(st.name) + '</b><small id="am-st">Message de l\'administration</small></div></div>' +
      '<div class="am-body" id="am-body"><div class="am-empty">Chargement…</div></div>' +
      '<div class="am-ft"><div id="am-pre"></div><div class="am-row">' +
      '<button class="am-ib" id="am-att" aria-label="Joindre un fichier" title="Photo, vidéo, PDF, document">📎</button>' +
      '<textarea class="am-in" id="am-in" rows="1" placeholder="Écrire un message…" maxlength="2000"></textarea>' +
      '<button class="am-sd" id="am-sd" aria-label="Envoyer">➤</button></div>' +
      '<input type="file" id="am-file" hidden accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar">' +
      '<div class="am-note">Photo / vidéo / PDF · documents : 10 Mo max · vidéo : 50 Mo max</div></div></div>';
    document.body.appendChild(ov);
    el('am-back').onclick = closeChat;
    ov.addEventListener('click', function (e) { if (e.target === ov) closeChat(); });
    el('am-att').onclick = function () { el('am-file').click(); };
    el('am-file').onchange = onFile;
    el('am-sd').onclick = send;
    var inp = el('am-in');
    inp.addEventListener('input', function () { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } });
    listen(); presence(); st.timer = setInterval(presence, 30000);
    setTimeout(function () { try { inp.focus(); } catch (e) { } }, 250);
  }

  function listen() {
    var cid = chatIdOf(meUid(), st.peer), ref = db.collection('chats').doc(cid);
    st.unsubChat = ref.onSnapshot(function (s) { st.chat = (s.exists && s.data()) || {}; draw(); markRead(); }, function () { });
    st.unsubMsgs = ref.collection('messages').orderBy('createdAt', 'desc').limit(150).onSnapshot(function (s) {
      st.msgs = s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).reverse(); draw(); markRead();
    }, function (e) {
      var b = el('am-body'); if (b) b.innerHTML = '<div class="am-empty">' + (e && e.code === 'permission-denied' ? 'Accès refusé : publie les règles Firestore de la messagerie.' : 'Conversation indisponible.') + '</div>';
    });
  }
  async function presence() {
    try {
      var s = await db.collection('presence').doc(st.peer).get(), t = s.exists && s.data().lastActiveAt, on = t && (Date.now() - new Date(t).getTime()) < 5 * 60000, e = el('am-st');
      if (!e) return;
      e.className = on ? 'on' : ''; e.textContent = on ? 'En ligne' : "Message de l'administration";
    } catch (e) { }
  }
  function markRead() {
    try {
      var me = meUid(), ch = st.chat || {}, last = st.msgs[st.msgs.length - 1];
      if (!last || last.senderId === me || document.hidden) return;
      var rd = (ch.reads && ch.reads[me]) || '';
      if (rd && rd >= last.createdAt && !(ch.unread && ch.unread[me] > 0)) return;
      var now = iso(); if (last.createdAt > now) now = last.createdAt;
      var up = { reads: {}, unread: {} }; up.reads[me] = now; up.unread[me] = 0;
      db.collection('chats').doc(chatIdOf(me, st.peer)).set(up, { merge: true }).catch(function () { });
    } catch (e) { }
  }

  function tkSvg(n) {
    return '<svg viewBox="0 0 ' + (n === 2 ? 28 : 22) + ' 24" width="' + (n === 2 ? 20 : 15) + '" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12.5l5 5 9-10"/>' + (n === 2 ? '<path d="M10 12.5l5 5 9-10"/>' : '') + '</svg>';
  }
  function tick(m) {
    var ch = st.chat || {}, p = st.peer;
    if (ch.reads && ch.reads[p] && ch.reads[p] >= m.createdAt) return '<span class="am-tk r" data-s="read" title="Lu">' + tkSvg(2) + '</span>';
    if (ch.delivered && ch.delivered[p] && ch.delivered[p] >= m.createdAt) return '<span class="am-tk" data-s="delivered" title="Reçu">' + tkSvg(2) + '</span>';
    return '<span class="am-tk" data-s="sent" title="Envoyé">' + tkSvg(1) + '</span>';
  }
  function bubble(m) {
    var me = m.senderId === meUid(), h = '', url = safeUrl(m.mediaUrl);
    if (m.type === 'call') {
      var c = m.call || {}, kd = c.kind === 'video' ? 'vidéo' : 'vocal', sx = c.status || 'ended';
      var lb = sx === 'ended' ? 'Appel ' + kd + (c.duration ? ' · ' + Math.floor(c.duration / 60) + ':' + ('0' + (c.duration % 60)).slice(-2) : '') : sx === 'declined' ? 'Appel ' + kd + ' refusé' : sx === 'busy' ? 'Appel ' + kd + ' · occupé' : sx === 'cancelled' ? 'Appel ' + kd + ' annulé' : 'Appel ' + kd + ' manqué';
      return '<div class="am-sys">📞 ' + esc(lb) + ' · ' + hm(m.createdAt) + '</div>';
    }
    if (m.type === 'image' && url) h += '<a href="' + esc(url) + '" target="_blank" rel="noopener"><img src="' + esc(url) + '" alt="Photo" loading="lazy"></a>';
    else if (m.type === 'video' && url) h += '<video src="' + esc(url) + '" controls preload="metadata" playsinline></video>';
    else if (m.type === 'audio' && url) h += '<audio src="' + esc(url) + '" controls preload="none"></audio>' + (m.duration ? '<div style="font-size:.72rem;color:#6b7a99">🎤 ' + Math.floor(m.duration / 60) + ':' + ('0' + (m.duration % 60)).slice(-2) + '</div>' : '');
    else if (m.type === 'file' && url) {
      var ext = (String(m.fileName || '').split('.').pop() || 'FILE').slice(0, 4).toUpperCase();
      h += '<a class="am-f" href="' + esc(url) + '" target="_blank" rel="noopener" download><i>' + esc(ext) + '</i><span><b>' + esc(m.fileName || 'Document') + '</b><small>' + fmtSize(m.fileSize) + ' · Ouvrir</small></span></a>';
    }
    if (m.text) h += '<div>' + esc(m.text).replace(/\n/g, '<br>') + '</div>';
    return '<div class="am-b' + (me ? ' me' : '') + '">' + h + '<div class="am-t">' + hm(m.createdAt) + (me ? tick(m) : '') + '</div></div>';
  }
  function draw() {
    var b = el('am-body'); if (!b) return;
    var near = b.scrollHeight - b.scrollTop - b.clientHeight < 140, first = !b.__drawn;
    if (!st.msgs.length) { b.innerHTML = '<div class="am-empty">Aucun message.<br>Écris le premier message à <b>' + esc(st.name) + '</b>.</div>'; return; }
    var out = '', day = '';
    st.msgs.forEach(function (m) {
      var d = dayLabel(m.createdAt); if (d !== day) { day = d; out += '<div class="am-day">' + esc(d) + '</div>'; }
      out += bubble(m);
    });
    b.innerHTML = out; b.__drawn = true;
    if (near || first) b.scrollTop = b.scrollHeight;
  }

  /* ---------------------------------------------------------------- envoi */
  function onFile(e) {
    var f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    var isImg = /^image\//.test(f.type), isVid = /^video\//.test(f.type), lim = isVid ? MAX_VID : (isImg ? MAX_IMG : MAX_DOC);
    if (BAD_EXT.test(f.name)) { alert('Ce type de fichier n\'est pas autorisé (programmes).'); return; }
    if (f.size > lim * 1048576) { alert('Fichier trop lourd : ' + lim + ' Mo maximum.'); return; }
    st.file = { file: f, kind: isImg ? 'image' : isVid ? 'video' : 'file' };
    var pre = el('am-pre');
    pre.innerHTML = '<div class="am-pre"><span>' + (isImg ? '🖼️' : isVid ? '🎬' : '📄') + '</span><b>' + esc(f.name) + '</b><span>' + fmtSize(f.size) + '</span><button type="button" id="am-pre-x" aria-label="Retirer">✕</button></div>';
    el('am-pre-x').onclick = function () { st.file = null; pre.innerHTML = ''; };
  }
  async function write(o, legacy) {
    var me = meUid(), cid = chatIdOf(me, st.peer), now = iso();
    var chatRef = db.collection('chats').doc(cid), msgRef = chatRef.collection('messages').doc();
    var msg = { senderId: me, receiverId: st.peer, type: o.type, createdAt: now };
    if (o.text) msg.text = o.text;
    if (o.mediaUrl) msg.mediaUrl = o.mediaUrl;
    if (!legacy && o.type === 'file') { msg.fileName = String(o.fileName || '').slice(0, 120); msg.fileSize = Math.round(o.fileSize || 0); if (o.mime) msg.mime = String(o.mime).slice(0, 100); }
    var last = { senderId: me, type: o.type, text: o.type === 'file' ? String(o.fileName || '').slice(0, 120) : String(o.text || '').slice(0, 120), at: now };
    var chat = { members: [me, st.peer].sort(), lastMessage: last, lastAt: now, reads: {} };
    chat.reads[me] = now;
    if (!legacy) { chat.unread = {}; chat.unread[st.peer] = firebase.firestore.FieldValue.increment(1); chat.unread[me] = 0; }
    var batch = db.batch();
    batch.set(chatRef, chat, { merge: true }); batch.set(msgRef, msg);
    await batch.commit();
    push(cid, msgRef.id);
  }
  async function writeSafe(o) {
    try { await write(o, false); }
    catch (e) {
      if (e && e.code === 'permission-denied' && /^(text|image|video)$/.test(o.type)) { await write(o, true); return; }
      throw e;
    }
  }
  function push(chatId, messageId) {
    try {
      auth.currentUser.getIdToken().then(function (idToken) {
        return fetch('/api/notify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat-push', idToken: idToken, chatId: chatId, messageId: messageId }) });
      }).catch(function () { });
    } catch (e) { }
  }
  async function send() {
    if (st.sending || !st.peer) return;
    var inp = el('am-in'), btn = el('am-sd'), text = (inp.value || '').trim();
    if (!text && !st.file) return;
    st.sending = true; btn.disabled = true;
    try {
      if (st.file) {
        var f = st.file.file, kind = st.file.kind;
        btn.textContent = '…';
        var up = await uploadFileToStorage(f, 'chat', { maxSizeMB: kind === 'video' ? MAX_VID : MAX_DOC, onProgress: function (p) { btn.textContent = p + '%'; btn.style.fontSize = '.7rem'; } });
        await writeSafe({ type: kind, text: text, mediaUrl: up.url, fileName: f.name, fileSize: f.size, mime: f.type });
        st.file = null; el('am-pre').innerHTML = '';
      } else {
        await writeSafe({ type: 'text', text: text.slice(0, 2000) });
      }
      inp.value = ''; inp.style.height = 'auto';
    } catch (e) {
      alert(e && e.code === 'permission-denied' ? "Envoi refusé par les règles Firestore : publie d'abord les règles de la messagerie (ou la personne t'a bloqué)." : ('Envoi impossible : ' + ((e && e.message) || 'erreur')));
    } finally { st.sending = false; btn.disabled = false; btn.textContent = '➤'; btn.style.fontSize = ''; try { inp.focus(); } catch (e) { } }
  }

  /* ---------------------------------------------------------------- boîte de réception de l'admin */
  async function openInbox() {
    var me = meUid(); if (!me) return;
    injectCss();
    var old = el('am-inbox'); if (old) old.remove();
    var ov = document.createElement('div'); ov.className = 'am-ov'; ov.id = 'am-inbox';
    ov.innerHTML = '<div class="am-box"><div class="am-hd"><button class="am-x" id="am-ix" aria-label="Fermer">←</button><div class="am-who"><b>Conversations</b><small>Messages des utilisateurs</small></div></div><div class="am-list" id="am-il"><div class="am-empty">Chargement…</div></div></div>';
    document.body.appendChild(ov);
    el('am-ix').onclick = function () { ov.remove(); };
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    try {
      var snap = await db.collection('chats').where('members', 'array-contains', me).limit(80).get();
      var rows = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).filter(function (c) { return c.lastMessage; });
      rows.sort(function (a, b) { return String(b.lastAt || '').localeCompare(String(a.lastAt || '')); });
      rows = rows.slice(0, 40);
      var names = await Promise.all(rows.map(function (c) {
        var peer = (c.members || []).filter(function (u) { return u !== me; })[0] || '';
        c.peer = peer;
        return db.collection('public_profiles').doc(peer).get().then(function (p) { return p.exists ? (p.data().name || p.data().username || '') : ''; }).catch(function () { return ''; });
      }));
      var box = el('am-il'); if (!box) return;
      if (!rows.length) { box.innerHTML = '<div class="am-empty">Aucune conversation pour le moment.<br>Utilise « 💬 Message » dans la liste des utilisateurs.</div>'; return; }
      box.innerHTML = rows.map(function (c, i) {
        var lm = c.lastMessage || {}, un = (c.unread && c.unread[me]) || 0;
        var pv = lm.type === 'image' ? '📷 Photo' : lm.type === 'video' ? '🎬 Vidéo' : lm.type === 'audio' ? '🎤 Message vocal' : lm.type === 'file' ? '📄 ' + (lm.text || 'Document') : lm.type === 'call' ? '📞 Appel' : (lm.text || '');
        return '<button class="am-li" data-peer="' + esc(c.peer) + '" data-name="' + esc(names[i] || 'Utilisateur') + '"><div class="am-av">' + initial(names[i]) + '</div>' +
          '<div class="am-who"><b>' + esc(names[i] || 'Utilisateur') + '</b><small>' + (lm.senderId === me ? 'Toi : ' : '') + esc(pv) + '</small></div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px"><span class="am-tm">' + (c.lastAt ? hm(c.lastAt) : '') + '</span>' + (un > 0 ? '<span class="am-bd">' + (un > 99 ? '99+' : un) + '</span>' : '') + '</div></button>';
      }).join('');
      box.onclick = function (e) {
        var b = e.target.closest && e.target.closest('.am-li'); if (!b) return;
        ov.remove(); openAdminMessage(b.getAttribute('data-peer'), b.getAttribute('data-name'));
      };
    } catch (e) {
      var bx = el('am-il'); if (bx) bx.innerHTML = '<div class="am-empty">' + (e && e.code === 'permission-denied' ? 'Accès refusé : publie les règles Firestore de la messagerie.' : 'Conversations indisponibles.') + '</div>';
    }
  }

  /* ---------------------------------------------------------------- barre au-dessus de la liste des utilisateurs */
  function mountBar() {
    var list = el('admin-users-list'); if (!list || el('am-bar')) return;
    injectCss();
    var bar = document.createElement('div'); bar.id = 'am-bar';
    bar.innerHTML = '<div class="am-bar"><button class="btn btn-primary btn-sm" id="am-open-inbox" type="button">📬 Conversations</button></div>' +
      '<input class="am-filter" id="am-filter" type="search" placeholder="🔎 Chercher un utilisateur (nom, e-mail)…" autocomplete="off">';
    list.parentNode.insertBefore(bar, list);
    el('am-open-inbox').onclick = openInbox;
    el('am-filter').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      list.querySelectorAll('.admin-row').forEach(function (r) { r.style.display = !q || (r.getAttribute('data-q') || '').indexOf(q) >= 0 ? '' : 'none'; });
    });
  }
  (function () {
    var boot = function () { mountBar(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  })();
  window.mountAdminMsgBar = mountBar;

  window.openAdminMessage = openAdminMessage;
  window.openAdminInbox = openInbox;
})();
