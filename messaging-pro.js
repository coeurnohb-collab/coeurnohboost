/* Coeurnoh Universe — Messagerie privée en temps réel.
   - Liste des conversations (onglet « Messages » de la barre du bas), pastille de non-lus.
   - Chat privé entre deux personnes : texte, photos, vidéos, « envoyé / lu », statut en ligne.
   - Réponse à une story : le message arrive dans la conversation avec l'auteur, relié à la story.
   - Notification push à chaque nouveau message (le serveur construit le texte : /api/notify-user, action « chat-push »).
   Données Firestore : chats/{a_b} (members, lastMessage, lastAt, reads), chats/{a_b}/messages, story_replies.
   Qui peut écrire à qui : il faut qu'un des deux suive l'autre (abonné / abonnement) et qu'aucun n'ait bloqué l'autre.
   Fichier séparé et chargé de façon sûre par stability.js : s'il échoue, le reste de l'application n'est pas touché. */
(function () {
  'use strict';
  if (window.CNMessages) return;

  /* ---------------------------------------------------------------- textes (5 langues) */
  var S = {
    fr: { messages: 'Messages', compose: 'Nouveau message', search: 'Rechercher…', empty_t: 'Pas encore de conversation', empty_p: 'Écris à quelqu’un que tu suis ou qui te suit : vos messages apparaîtront ici, en direct.', write: 'Écrire à quelqu’un', contacts: 'Mes contacts', no_contacts: 'Abonne-toi à des personnes pour pouvoir leur écrire.', online: 'En ligne', seen: 'Vu {t}', you: 'Toi', photo: 'Photo', video: 'Vidéo', story_in: 'A répondu à ta story', story_out: 'Tu as répondu à sa story', story_prev: 'Réponse à une story', ph: 'Écris un message…', send: 'Envoyer', attach: 'Photo ou vidéo', uploading: 'Envoi… {p} %', big_img: 'Photo trop lourde (10 Mo maximum).', big_vid: 'Vidéo trop lourde (50 Mo maximum).', bad_file: 'Choisis une photo ou une vidéo.', need_follow: 'Abonne-toi à {n} pour pouvoir lui écrire.', blocked: 'Tu ne peux pas écrire à ce compte.', fail: 'Message non envoyé. Réessaie.', denied: 'Impossible d’écrire à cette personne (abonnement ou blocage). Si tout est normal, la messagerie n’est pas encore activée.', list_denied: 'La messagerie est en cours d’activation. Réessaie dans un instant.', older: 'Voir les messages précédents', today: 'Aujourd’hui', yesterday: 'Hier', say_hi: 'Dis bonjour 👋', profile: 'Voir le profil', del: 'Supprimer ce message', del_q: 'Supprimer ce message pour tout le monde ?', deleted: 'Message supprimé', back: 'Retour', close: 'Fermer', cancel: 'Annuler', reply_btn: 'Répondre à {n}…', reply_title: 'Répondre à la story de {n}', reply_ph: 'Écris ta réponse…', reply_sent: 'Réponse envoyée', see_chat: 'Voir', login: 'Connecte-toi pour utiliser la messagerie.', someone: 'Utilisateur', msg_btn: 'Message', now: 'à l’instant', m: 'il y a {n} min', h: 'il y a {n} h', d: 'il y a {n} j', pending: 'Envoi…' },
    en: { messages: 'Messages', compose: 'New message', search: 'Search…', empty_t: 'No conversations yet', empty_p: 'Write to someone you follow or who follows you: your messages will show up here, live.', write: 'Write to someone', contacts: 'My contacts', no_contacts: 'Follow people to be able to message them.', online: 'Online', seen: 'Seen {t}', you: 'You', photo: 'Photo', video: 'Video', story_in: 'Replied to your story', story_out: 'You replied to their story', story_prev: 'Reply to a story', ph: 'Write a message…', send: 'Send', attach: 'Photo or video', uploading: 'Sending… {p}%', big_img: 'Photo too large (10 MB max).', big_vid: 'Video too large (50 MB max).', bad_file: 'Choose a photo or a video.', need_follow: 'Follow {n} to be able to message them.', blocked: 'You can’t message this account.', fail: 'Message not sent. Try again.', denied: 'You can’t write to this person (follow or block). If everything looks right, messaging isn’t activated yet.', list_denied: 'Messaging is being activated. Try again in a moment.', older: 'Show earlier messages', today: 'Today', yesterday: 'Yesterday', say_hi: 'Say hello 👋', profile: 'View profile', del: 'Delete this message', del_q: 'Delete this message for everyone?', deleted: 'Message deleted', back: 'Back', close: 'Close', cancel: 'Cancel', reply_btn: 'Reply to {n}…', reply_title: 'Reply to {n}’s story', reply_ph: 'Write your reply…', reply_sent: 'Reply sent', see_chat: 'View', login: 'Log in to use messaging.', someone: 'User', msg_btn: 'Message', now: 'just now', m: '{n} min ago', h: '{n} h ago', d: '{n} d ago', pending: 'Sending…' },
    es: { messages: 'Mensajes', compose: 'Nuevo mensaje', search: 'Buscar…', empty_t: 'Aún no hay conversaciones', empty_p: 'Escribe a alguien que sigues o que te sigue: tus mensajes aparecerán aquí, en directo.', write: 'Escribir a alguien', contacts: 'Mis contactos', no_contacts: 'Sigue a personas para poder escribirles.', online: 'En línea', seen: 'Visto {t}', you: 'Tú', photo: 'Foto', video: 'Vídeo', story_in: 'Respondió a tu historia', story_out: 'Respondiste a su historia', story_prev: 'Respuesta a una historia', ph: 'Escribe un mensaje…', send: 'Enviar', attach: 'Foto o vídeo', uploading: 'Enviando… {p} %', big_img: 'Foto demasiado pesada (máx. 10 MB).', big_vid: 'Vídeo demasiado pesado (máx. 50 MB).', bad_file: 'Elige una foto o un vídeo.', need_follow: 'Sigue a {n} para poder escribirle.', blocked: 'No puedes escribir a esta cuenta.', fail: 'Mensaje no enviado. Inténtalo de nuevo.', denied: 'No puedes escribir a esta persona (seguimiento o bloqueo). Si todo está bien, la mensajería aún no está activada.', list_denied: 'La mensajería se está activando. Inténtalo en un momento.', older: 'Ver mensajes anteriores', today: 'Hoy', yesterday: 'Ayer', say_hi: 'Saluda 👋', profile: 'Ver perfil', del: 'Eliminar este mensaje', del_q: '¿Eliminar este mensaje para todos?', deleted: 'Mensaje eliminado', back: 'Volver', close: 'Cerrar', cancel: 'Cancelar', reply_btn: 'Responder a {n}…', reply_title: 'Responder a la historia de {n}', reply_ph: 'Escribe tu respuesta…', reply_sent: 'Respuesta enviada', see_chat: 'Ver', login: 'Inicia sesión para usar la mensajería.', someone: 'Usuario', msg_btn: 'Mensaje', now: 'ahora mismo', m: 'hace {n} min', h: 'hace {n} h', d: 'hace {n} d', pending: 'Enviando…' },
    it: { messages: 'Messaggi', compose: 'Nuovo messaggio', search: 'Cerca…', empty_t: 'Ancora nessuna conversazione', empty_p: 'Scrivi a qualcuno che segui o che ti segue: i messaggi appariranno qui, in diretta.', write: 'Scrivi a qualcuno', contacts: 'I miei contatti', no_contacts: 'Segui delle persone per poter scrivere loro.', online: 'Online', seen: 'Visto {t}', you: 'Tu', photo: 'Foto', video: 'Video', story_in: 'Ha risposto alla tua storia', story_out: 'Hai risposto alla sua storia', story_prev: 'Risposta a una storia', ph: 'Scrivi un messaggio…', send: 'Invia', attach: 'Foto o video', uploading: 'Invio… {p}%', big_img: 'Foto troppo pesante (max 10 MB).', big_vid: 'Video troppo pesante (max 50 MB).', bad_file: 'Scegli una foto o un video.', need_follow: 'Segui {n} per poter scrivere.', blocked: 'Non puoi scrivere a questo account.', fail: 'Messaggio non inviato. Riprova.', denied: 'Non puoi scrivere a questa persona (follow o blocco). Se è tutto a posto, la messaggistica non è ancora attiva.', list_denied: 'La messaggistica si sta attivando. Riprova tra poco.', older: 'Mostra messaggi precedenti', today: 'Oggi', yesterday: 'Ieri', say_hi: 'Saluta 👋', profile: 'Vedi profilo', del: 'Elimina questo messaggio', del_q: 'Eliminare questo messaggio per tutti?', deleted: 'Messaggio eliminato', back: 'Indietro', close: 'Chiudi', cancel: 'Annulla', reply_btn: 'Rispondi a {n}…', reply_title: 'Rispondi alla storia di {n}', reply_ph: 'Scrivi la tua risposta…', reply_sent: 'Risposta inviata', see_chat: 'Vedi', login: 'Accedi per usare la messaggistica.', someone: 'Utente', msg_btn: 'Messaggio', now: 'adesso', m: '{n} min fa', h: '{n} h fa', d: '{n} g fa', pending: 'Invio…' },
    pt: { messages: 'Mensagens', compose: 'Nova mensagem', search: 'Pesquisar…', empty_t: 'Ainda sem conversas', empty_p: 'Escreve a alguém que segues ou que te segue: as mensagens aparecem aqui, em direto.', write: 'Escrever a alguém', contacts: 'Os meus contactos', no_contacts: 'Segue pessoas para lhes poderes escrever.', online: 'Online', seen: 'Visto {t}', you: 'Tu', photo: 'Foto', video: 'Vídeo', story_in: 'Respondeu à tua story', story_out: 'Respondeste à story dele(a)', story_prev: 'Resposta a uma story', ph: 'Escreve uma mensagem…', send: 'Enviar', attach: 'Foto ou vídeo', uploading: 'A enviar… {p}%', big_img: 'Foto demasiado pesada (máx. 10 MB).', big_vid: 'Vídeo demasiado pesado (máx. 50 MB).', bad_file: 'Escolhe uma foto ou um vídeo.', need_follow: 'Segue {n} para lhe poderes escrever.', blocked: 'Não podes escrever a esta conta.', fail: 'Mensagem não enviada. Tenta de novo.', denied: 'Não podes escrever a esta pessoa (seguir ou bloqueio). Se estiver tudo certo, as mensagens ainda não estão ativadas.', list_denied: 'As mensagens estão a ser ativadas. Tenta daqui a pouco.', older: 'Ver mensagens anteriores', today: 'Hoje', yesterday: 'Ontem', say_hi: 'Diz olá 👋', profile: 'Ver perfil', del: 'Apagar esta mensagem', del_q: 'Apagar esta mensagem para todos?', deleted: 'Mensagem apagada', back: 'Voltar', close: 'Fechar', cancel: 'Cancelar', reply_btn: 'Responder a {n}…', reply_title: 'Responder à story de {n}', reply_ph: 'Escreve a tua resposta…', reply_sent: 'Resposta enviada', see_chat: 'Ver', login: 'Inicia sessão para usar as mensagens.', someone: 'Utilizador', msg_btn: 'Mensagem', now: 'agora mesmo', m: 'há {n} min', h: 'há {n} h', d: 'há {n} d', pending: 'A enviar…' }
  };
  var LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', pt: 'pt-PT' };
  function lang() {
    try { var l = String((typeof currentLang !== 'undefined' && currentLang) || document.documentElement.lang || 'fr').slice(0, 2).toLowerCase(); return S[l] ? l : 'fr'; } catch (e) { return 'fr'; }
  }
  function T(k, a) {
    var s = (S[lang()] && S[lang()][k]) || S.fr[k] || k;
    if (a) Object.keys(a).forEach(function (x) { s = s.split('{' + x + '}').join(a[x]); });
    return s;
  }

  /* ---------------------------------------------------------------- petits outils */
  var PAGE = 50, ONLINE_MS = 5 * 60 * 1000, CLOUD = 'https://res.cloudinary.com/aqe4fxh4/';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) ? currentUser : null; } catch (e) { return null; } }
  function fdb() { try { return (typeof db !== 'undefined') ? db : null; } catch (e) { return null; } }
  function toast(m, ty) { try { showToast(m, ty || 'info'); } catch (e) { /* ignore */ } }
  function pair(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
  function otherOf(c, uid) { var m = c && c.members || []; return m[0] === uid ? m[1] : m[0]; }
  function iso() { return new Date().toISOString(); }
  function safeMedia(u) { return typeof u === 'string' && u.indexOf(CLOUD) === 0 && u.length < 600 ? u : ''; }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function ago(isoStr) {
    var ms = Date.now() - Date.parse(isoStr);
    if (!isFinite(ms)) return '';
    var m = Math.floor(ms / 60000);
    if (m < 1) return T('now');
    if (m < 60) return T('m', { n: m });
    var h = Math.floor(m / 60);
    if (h < 24) return T('h', { n: h });
    return T('d', { n: Math.floor(h / 24) });
  }
  function hhmm(isoStr) { try { return new Date(isoStr).toLocaleTimeString(LOCALES[lang()], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function dayKey(isoStr) { var d = new Date(isoStr); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function dayLabel(isoStr) {
    var d = new Date(isoStr), n = new Date(), y = new Date(Date.now() - 86400000);
    if (dayKey(isoStr) === dayKey(n.toISOString())) return T('today');
    if (dayKey(isoStr) === dayKey(y.toISOString())) return T('yesterday');
    try { return d.toLocaleDateString(LOCALES[lang()], { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return isoStr.slice(0, 10); }
  }
  function listTime(isoStr) {
    if (!isoStr) return '';
    if (dayKey(isoStr) === dayKey(iso())) return hhmm(isoStr);
    if (dayKey(isoStr) === dayKey(new Date(Date.now() - 86400000).toISOString())) return T('yesterday');
    try { return new Date(isoStr).toLocaleDateString(LOCALES[lang()], { day: '2-digit', month: '2-digit' }); } catch (e) { return ''; }
  }
  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s<]{3,200})/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'; }).replace(/\n/g, '<br>');
  }
  function avatar(name, photo, px) {
    try { if (typeof renderAvatarHtml === 'function') return renderAvatarHtml(name || 'C', photo || null, px); } catch (e) { /* repli */ }
    return '<div class="post-avatar" style="width:' + px + 'px;height:' + px + 'px">' + esc((name || 'C')[0].toUpperCase()) + '</div>';
  }
  var IC = {
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z"/></svg>',
    clip: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    edit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    dots: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    chat: '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z"/></svg>',
    tick: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12.5 9.5 18 20 6.5"/></svg>',
    tick2: '<svg width="19" height="15" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 12.5 7.5 18 18 6.5"/><polyline points="12 16 14 18 25 6.5"/></svg>',
    clock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>'
  };

  /* ---------------------------------------------------------------- styles */
  var CSS = '' +
    '.cn-m{--cn-me:#2f4468;--cn-me2:#3f5a89}' +
    '#cn-msg-root{padding:4px 0 90px}' +
    '.cn-lh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 12px}' +
    '.cn-lh h2{margin:0}' +
    '.cn-ib{width:42px;height:42px;border-radius:50%;border:0;background:var(--green,#28374f);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}' +
    '.cn-ib:active{transform:scale(.95)}' +
    '.cn-ib.ghost{background:transparent;color:inherit;width:40px;height:40px}' +
    '.cn-s{width:100%;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);border-radius:999px;padding:11px 16px;font:inherit;font-size:.92rem;margin-bottom:10px;outline:none}' +
    '.cn-s:focus{border-color:var(--accent,#f39c1f)}' +
    '.cn-rows{background:var(--white,#fff);border-radius:18px;overflow:hidden;box-shadow:0 2px 14px rgba(20,38,63,.06)}' +
    '.cn-row{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-bottom:1px solid var(--line,#e2e6ee)}' +
    '.cn-row:last-child{border-bottom:0}' +
    '.cn-row:active{background:var(--green-light,#eef1f6)}' +
    '.cn-av{position:relative;flex:0 0 auto;display:inline-flex}' +
    '.cn-av .post-avatar,.cn-av .post-avatar-img{border-radius:50%;object-fit:cover}' +
    '.cn-dot{position:absolute;right:-1px;bottom:-1px;width:13px;height:13px;border-radius:50%;background:#22c55e;border:2px solid var(--white,#fff);display:none}' +
    '.cn-dot.on{display:block}' +
    '.cn-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
    '.cn-mid b{font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cn-mid small{font-size:.85rem;color:var(--muted,#5d6779);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cn-mid small.un{color:var(--ink,#141a26);font-weight:700}' +
    '.cn-meta{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;font-size:.74rem;color:var(--muted,#5d6779)}' +
    '.cn-un{width:11px;height:11px;border-radius:50%;background:var(--accent,#f39c1f);display:block}' +
    '.cn-empty{text-align:center;padding:44px 22px;color:var(--muted,#5d6779)}' +
    '.cn-empty svg{opacity:.55;margin-bottom:8px}' +
    '.cn-empty h3{color:var(--ink,#141a26);margin:6px 0}' +
    '.cn-empty p{font-size:.92rem;line-height:1.5;margin:0 auto 16px;max-width:320px}' +
    '.cn-btn{border:0;border-radius:999px;padding:11px 20px;font:inherit;font-weight:700;font-size:.92rem;background:var(--green,#28374f);color:#fff;cursor:pointer}' +
    /* chat plein écran */
    '.cn-chat{position:fixed;left:0;right:0;top:0;height:100%;z-index:1500;background:var(--bg,#eef0f4);color:var(--ink,#141a26);display:flex;flex-direction:column}' +
    '.cn-ch-h{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 4px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:var(--white,#fff);border-bottom:1px solid var(--line,#e2e6ee);flex:0 0 auto}' +
    '.cn-ch-who{display:flex;align-items:center;gap:10px;flex:1;min-width:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:2px}' +
    '.cn-ch-who>span:last-child{display:flex;flex-direction:column;min-width:0}' +
    '.cn-ch-who b{font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cn-ch-who small{font-size:.76rem;color:var(--muted,#5d6779);white-space:nowrap}' +
    '.cn-ch-who small.on{color:#16a34a;font-weight:700}' +
    '.cn-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 12px 8px;display:flex;flex-direction:column;gap:3px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}' +
    '.cn-day{align-self:center;margin:10px 0 6px;font-size:.72rem;font-weight:700;color:var(--muted,#5d6779);background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);padding:3px 11px;border-radius:999px}' +
    '.cn-b{max-width:80%;padding:8px 11px 5px;border-radius:18px;font-size:.95rem;line-height:1.42;word-wrap:break-word;overflow-wrap:anywhere;position:relative}' +
    '.cn-b.me{align-self:flex-end;background:linear-gradient(135deg,var(--cn-me,#2f4468),var(--cn-me2,#3f5a89));color:#fff;border-bottom-right-radius:6px}' +
    '.cn-b.you{align-self:flex-start;background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);border-bottom-left-radius:6px}' +
    '.cn-b a{color:inherit;text-decoration:underline}' +
    '.cn-b .t{display:flex;align-items:center;justify-content:flex-end;gap:4px;font-size:.66rem;opacity:.75;margin-top:2px;line-height:1}' +
    '.cn-b.me .t .rd{color:#7dd3fc;opacity:1}' +
    '.cn-b.media{padding:4px 4px 5px}' +
    '.cn-b.media .t{padding:0 7px}' +
    '.cn-b.media .cap{padding:6px 8px 0}' +
    '.cn-b img.m,.cn-b video.m{display:block;max-width:100%;width:260px;max-height:340px;object-fit:cover;border-radius:14px;background:#0003;cursor:pointer}' +
    '.cn-b video.m{object-fit:contain;background:#000}' +
    '.cn-sr{display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:6px 8px;border-radius:12px;background:rgba(127,127,127,.16);border-left:3px solid var(--accent,#f39c1f);font-size:.78rem}' +
    '.cn-sr img,.cn-sr video{width:38px;height:52px;border-radius:8px;object-fit:cover;flex:0 0 auto;background:#0004}' +
    '.cn-sr span{opacity:.9;line-height:1.3}' +
    '.cn-old{align-self:center;border:0;background:transparent;color:var(--green-dark-text,#28374f);font:inherit;font-weight:700;font-size:.82rem;padding:6px 12px;cursor:pointer;text-decoration:underline}' +
    '.cn-hi{margin:auto;text-align:center;color:var(--muted,#5d6779);font-size:.95rem}' +
    '.cn-prev{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--white,#fff);border-top:1px solid var(--line,#e2e6ee);flex:0 0 auto}' +
    '.cn-prev img,.cn-prev video{width:54px;height:54px;border-radius:10px;object-fit:cover;background:#000}' +
    '.cn-prev .pg{flex:1;min-width:0;font-size:.82rem;color:var(--muted,#5d6779)}' +
    '.cn-prev .bar{height:5px;border-radius:5px;background:var(--line,#e2e6ee);margin-top:6px;overflow:hidden}' +
    '.cn-prev .bar i{display:block;height:100%;width:0;background:var(--accent,#f39c1f);transition:width .2s}' +
    '.cn-f{display:flex;align-items:flex-end;gap:8px;padding:8px 10px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));background:var(--white,#fff);border-top:1px solid var(--line,#e2e6ee);flex:0 0 auto}' +
    '.cn-f textarea{flex:1;resize:none;border:1px solid var(--line,#e2e6ee);background:var(--bg,#eef0f4);color:var(--ink,#141a26);border-radius:22px;padding:10px 15px;font:inherit;font-size:.96rem;line-height:1.35;max-height:120px;min-height:42px;outline:none}' +
    '.cn-f textarea:focus{border-color:var(--accent,#f39c1f)}' +
    '.cn-send{background:linear-gradient(135deg,var(--cn-me,#2f4468),var(--cn-me2,#3f5a89))}' +
    '.cn-send[disabled]{opacity:.45}' +
    '.cn-sheet-bg{position:fixed;inset:0;z-index:3400;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}' +
    '.cn-sheet{width:100%;max-width:560px;background:var(--white,#fff);color:var(--ink,#141a26);border-radius:22px 22px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom,0px));max-height:86%;display:flex;flex-direction:column;gap:10px}' +
    '.cn-sheet h3{margin:0;font-size:1.02rem;display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.cn-sheet .lst{overflow-y:auto;border-radius:14px;border:1px solid var(--line,#e2e6ee)}' +
    '.cn-sheet textarea{width:100%;border:1px solid var(--line,#e2e6ee);background:var(--bg,#eef0f4);color:var(--ink,#141a26);border-radius:16px;padding:11px 14px;font:inherit;font-size:.96rem;min-height:84px;resize:none;outline:none}' +
    '.cn-sheet .go{display:flex;justify-content:flex-end;gap:8px}' +
    '.cn-st{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;background:var(--green-light,#eef1f6)}' +
    '.cn-st img,.cn-st video{width:44px;height:60px;border-radius:9px;object-fit:cover;background:#000}' +
    '.cn-st span{font-size:.84rem;color:var(--muted,#5d6779)}' +
    '.cn-lb{position:fixed;inset:0;z-index:1700;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center}' +
    '.cn-lb img{max-width:100%;max-height:100%;object-fit:contain}' +
    '.cn-lb button{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;background:rgba(255,255,255,.18);color:#fff}' +
    '.cn-menu{position:absolute;right:8px;top:calc(54px + env(safe-area-inset-top,0px));z-index:5;background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);overflow:hidden;min-width:190px}' +
    '.cn-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:inherit;font:inherit;padding:12px 16px;cursor:pointer}' +
    '.cn-menu button:active{background:var(--green-light,#eef1f6)}' +
    /* profil + story */
    '.profile-action-row{display:flex;justify-content:center;align-items:center;gap:10px;margin:14px 0 0}' +
    '.profile-action-row .follow-btn{margin:0 !important}' +
    '.profile-msg-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);border-radius:999px;padding:9px 20px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer}' +
    '.profile-msg-btn:active{transform:scale(.97)}' +
    '.story-viewer-footer.story-footer-reply{justify-content:space-between;gap:12px}' +
    '.story-reply-btn{flex:1;min-width:0;text-align:left;border:1.5px solid rgba(255,255,255,.6);background:rgba(0,0,0,.25);color:#fff;border-radius:999px;padding:12px 18px;font:inherit;font-size:.92rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '@media(min-width:760px){.cn-chat{max-width:560px;left:50%;right:auto;width:100%;transform:translateX(-50%);box-shadow:0 0 40px rgba(0,0,0,.3)}}';
  (function () { var st = document.createElement('style'); st.setAttribute('data-cn-msg', '1'); st.textContent = CSS; document.head.appendChild(st); })();

  /* ---------------------------------------------------------------- état */
  var st = {
    uid: null, chats: new Map(), unsubList: null, listReady: null, listResolve: null, listError: false,
    openId: null, peer: null, unsubMsgs: null, unsubPres: null, msgs: [], limit: PAGE, chatExists: false,
    file: null, uploading: false, readT: null, profiles: new Map(), pres: new Map(), conn: new Map(), filter: ''
  };
  var NAMEKEY = 'cn_msg_names';
  function hintName(uid, name) {
    if (!uid || !name) return;
    try { var o = JSON.parse(localStorage.getItem(NAMEKEY) || '{}'); if (o[uid] !== name) { o[uid] = String(name).slice(0, 60); var ks = Object.keys(o); if (ks.length > 200) delete o[ks[0]]; localStorage.setItem(NAMEKEY, JSON.stringify(o)); } } catch (e) { /* ignore */ }
  }
  function hintOf(uid) { try { return (JSON.parse(localStorage.getItem(NAMEKEY) || '{}'))[uid] || ''; } catch (e) { return ''; } }
  function prof(uid) { var p = st.profiles.get(uid); return p || { name: hintOf(uid) || T('someone'), photo: null, verified: false, loaded: false }; }
  async function loadProfiles(uids) {
    var need = uids.filter(function (u) { return u && !(st.profiles.get(u) || {}).loaded; });
    if (!need.length || typeof fetchPublicProfile !== 'function') return false;
    await Promise.all(need.map(async function (u) {
      try {
        var p = await fetchPublicProfile(u);
        st.profiles.set(u, { name: (p && (p.username || p.name)) || hintOf(u) || T('someone'), photo: (p && p.photoURL) || null, verified: !!(p && p.verified), loaded: true });
      } catch (e) { st.profiles.set(u, { name: hintOf(u) || T('someone'), photo: null, verified: false, loaded: true }); }
    }));
    return true;
  }
  async function isOnline(uid) {
    var c = st.pres.get(uid);
    if (c && Date.now() - c.at < 60000) return c.on;
    try {
      var d = await fdb().collection('presence').doc(uid).get();
      var on = d.exists && (Date.now() - Date.parse(d.data().lastActiveAt)) < ONLINE_MS;
      st.pres.set(uid, { on: on, at: Date.now(), last: d.exists ? d.data().lastActiveAt : null });
      return on;
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------------------- liste des conversations (temps réel) */
  function isUnread(c, uid) {
    var lm = c.lastMessage;
    if (!lm || lm.senderId === uid) return false;
    var r = c.reads && c.reads[uid];
    return !r || r < (c.lastAt || '');
  }
  function unreadCount() { var n = 0, uid = st.uid; st.chats.forEach(function (c) { if (isUnread(c, uid)) n++; }); return n; }
  function updateBadge() {
    var n = unreadCount();
    ['msg-badge-bnav'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('hidden', n === 0);
    });
  }
  function startList() {
    var u = me(), d = fdb();
    if (!u || !d || (st.uid === u.uid && st.unsubList)) return;
    stopList();
    st.uid = u.uid; st.listError = false;
    st.listReady = new Promise(function (res) { st.listResolve = res; });
    try {
      st.unsubList = d.collection('chats').where('members', 'array-contains', u.uid).limit(150).onSnapshot(function (snap) {
        var next = new Map();
        snap.forEach(function (doc) { var c = doc.data() || {}; c.id = doc.id; next.set(doc.id, c); });
        st.chats = next; st.listError = false;
        if (st.listResolve) { st.listResolve(true); st.listResolve = null; }
        updateBadge();
        if (listVisible()) renderList();
        if (st.openId) onChatDocChanged();
      }, function (err) {
        console.log('[messages] liste :', err && err.code);
        st.listError = true;
        if (st.listResolve) { st.listResolve(false); st.listResolve = null; }
        if (listVisible()) renderList();
      });
    } catch (e) { st.listError = true; }
  }
  function stopList() {
    if (st.unsubList) { try { st.unsubList(); } catch (e) { /* ignore */ } }
    st.unsubList = null; st.chats = new Map(); st.uid = null; updateBadge();
  }
  function listVisible() { var t = document.getElementById('dash-tab-messages'); return !!(t && !t.classList.contains('hidden')); }
  function root() {
    var r = document.getElementById('cn-msg-root');
    if (!r) { var tab = document.getElementById('dash-tab-messages'); if (!tab) return null; r = document.createElement('div'); r.id = 'cn-msg-root'; tab.appendChild(r); }
    return r;
  }
  var renderT = null;
  function renderListSoon() { clearTimeout(renderT); renderT = setTimeout(function () { if (listVisible()) renderList(); }, 60); }
  function preview(c, uid) {
    var lm = c.lastMessage || {};
    var t = lm.type === 'image' ? '📷 ' + T('photo') : lm.type === 'video' ? '🎥 ' + T('video') : String(lm.text || '');
    if (lm.story) t = '↩ ' + (lm.senderId === uid ? T('story_out') : T('story_in')) + (lm.text ? ' · ' + lm.text : '');
    return (lm.senderId === uid ? T('you') + ' : ' : '') + t;
  }
  function renderList() {
    var r = root(), u = me(); if (!r) return;
    if (!u) { r.innerHTML = '<div class="cn-empty">' + IC.chat + '<p>' + esc(T('login')) + '</p></div>'; return; }
    if (!st.unsubList) startList();
    var rows = Array.from(st.chats.values()).sort(function (a, b) { return String(b.lastAt || '').localeCompare(String(a.lastAt || '')); });
    var peers = rows.map(function (c) { return otherOf(c, u.uid); });
    loadProfiles(peers).then(function (changed) { if (changed) renderListSoon(); });
    var f = st.filter.trim().toLowerCase();
    if (f) rows = rows.filter(function (c) { return prof(otherOf(c, u.uid)).name.toLowerCase().indexOf(f) >= 0; });
    var head = '<div class="cn-lh"><h2 class="page-title" style="margin:0">' + esc(T('messages')) + '</h2><button class="cn-ib" data-act="compose" aria-label="' + esc(T('compose')) + '">' + IC.edit + '</button></div>';
    var searchHtml = st.chats.size > 6 ? '<input class="cn-s" id="cn-s" type="search" placeholder="' + esc(T('search')) + '" value="' + esc(st.filter) + '" autocomplete="off">' : '';
    var body;
    if (st.listError && !st.chats.size) body = '<div class="cn-empty">' + IC.chat + '<p>' + esc(T('list_denied')) + '</p></div>';
    else if (!rows.length && !f) body = '<div class="cn-empty">' + IC.chat + '<h3>' + esc(T('empty_t')) + '</h3><p>' + esc(T('empty_p')) + '</p><button class="cn-btn" data-act="compose">' + esc(T('write')) + '</button></div>';
    else body = '<div class="cn-rows">' + rows.map(function (c) {
      var peer = otherOf(c, u.uid), p = prof(peer), un = isUnread(c, u.uid), pc = st.pres.get(peer);
      return '<button class="cn-row" data-chat="' + esc(c.id) + '" data-peer="' + esc(peer) + '"><span class="cn-av">' + avatar(p.name, p.photo, 50) + '<i class="cn-dot' + (pc && pc.on ? ' on' : '') + '" data-pd="' + esc(peer) + '"></i></span><span class="cn-mid"><b>' + esc(p.name) + '</b><small class="' + (un ? 'un' : '') + '">' + esc(preview(c, u.uid)) + '</small></span><span class="cn-meta"><time>' + esc(listTime(c.lastAt)) + '</time>' + (un ? '<i class="cn-un"></i>' : '') + '</span></button>';
    }).join('') + '</div>';
    var keep = document.activeElement && document.activeElement.id === 'cn-s';
    r.innerHTML = head + searchHtml + body;
    if (keep) { var s = document.getElementById('cn-s'); if (s) { s.focus(); try { s.setSelectionRange(s.value.length, s.value.length); } catch (e) { /* ignore */ } } }
    Array.from(new Set(peers)).slice(0, 40).forEach(function (pu) {
      isOnline(pu).then(function (on) { var el = r.querySelector('[data-pd="' + pu + '"]'); if (el) el.classList.toggle('on', !!on); });
    });
  }
  document.addEventListener('click', function (e) {
    var r = document.getElementById('cn-msg-root'); if (!r || !r.contains(e.target)) return;
    var row = e.target.closest('.cn-row[data-chat]');
    if (row) { openChat(row.getAttribute('data-peer'), null); return; }
    if (e.target.closest('[data-act="compose"]')) openPicker();
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'cn-s') { st.filter = e.target.value || ''; renderListSoon(); }
  });

  /* ---------------------------------------------------------------- choisir un contact */
  async function openPicker() {
    var u = me(), d = fdb(); if (!u || !d) { toast(T('login')); return; }
    closePicker();
    var bg = document.createElement('div'); bg.className = 'cn-sheet-bg'; bg.id = 'cn-picker';
    bg.innerHTML = '<div class="cn-sheet cn-m"><h3><span>' + esc(T('compose')) + '</span><button class="cn-ib ghost" data-x="1" aria-label="' + esc(T('close')) + '">' + IC.x + '</button></h3><input class="cn-s" id="cn-ps" type="search" placeholder="' + esc(T('search')) + '" autocomplete="off" style="margin:0"><div class="lst" id="cn-pl"><div class="cn-empty" style="padding:24px">…</div></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-x]')) closePicker(); });
    var ids = new Set();
    try { (typeof followingSet !== 'undefined' ? Array.from(followingSet) : []).forEach(function (x) { ids.add(x); }); } catch (e) { /* ignore */ }
    try { var s = await d.collection('follows').where('followedUid', '==', u.uid).limit(300).get(); s.forEach(function (x) { var v = x.data(); if (v && v.followerUid) ids.add(v.followerUid); }); } catch (e) { /* ignore */ }
    try { var s2 = await d.collection('follows').where('followerUid', '==', u.uid).limit(300).get(); s2.forEach(function (x) { var v = x.data(); if (v && v.followedUid) ids.add(v.followedUid); }); } catch (e) { /* ignore */ }
    ids.delete(u.uid);
    var list = Array.from(ids).slice(0, 150);
    await loadProfiles(list);
    var box = document.getElementById('cn-pl'); if (!box) return;
    function draw(f) {
      var arr = list.map(function (x) { return { id: x, p: prof(x) }; }).filter(function (o) { return !f || o.p.name.toLowerCase().indexOf(f) >= 0; }).sort(function (a, b) { return a.p.name.localeCompare(b.p.name); });
      if (!arr.length) { box.innerHTML = '<div class="cn-empty" style="padding:24px"><p style="margin:0">' + esc(T('no_contacts')) + '</p></div>'; return; }
      box.innerHTML = arr.map(function (o) { return '<button class="cn-row" data-pick="' + esc(o.id) + '"><span class="cn-av">' + avatar(o.p.name, o.p.photo, 44) + '</span><span class="cn-mid"><b>' + esc(o.p.name) + '</b></span></button>'; }).join('');
    }
    draw('');
    var inp = document.getElementById('cn-ps'); if (inp) inp.addEventListener('input', function () { draw(inp.value.trim().toLowerCase()); });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-pick]'); if (b) { var id = b.getAttribute('data-pick'); closePicker(); openChat(id, null); } });
  }
  function closePicker() { var p = document.getElementById('cn-picker'); if (p) p.remove(); }

  /* ---------------------------------------------------------------- droit d'écrire (abonnement / blocage) */
  async function connected(peer) {
    var u = me(), d = fdb(); if (!u || !d) return false;
    var c = st.conn.get(peer); if (c && Date.now() - c.at < 60000) return c.ok;
    var ok = null;
    try {
      var a = await d.collection('follows').doc(u.uid + '_' + peer).get();
      if (a.exists) ok = true;
      else { var b = await d.collection('follows').doc(peer + '_' + u.uid).get(); ok = !!b.exists; }
    } catch (e) { ok = null; /* inconnu : les règles trancheront */ }
    if (ok !== null) st.conn.set(peer, { ok: ok, at: Date.now() });
    return ok === null ? true : ok;
  }
  function isBlocked(peer) { try { return typeof blockedSet !== 'undefined' && blockedSet.has(peer); } catch (e) { return false; } }

  /* ---------------------------------------------------------------- écran de chat */
  async function openChat(peer, nameHint) {
    var u = me(), d = fdb();
    if (!u || !d) { toast(T('login')); return; }
    if (!peer || peer === u.uid) return;
    if (nameHint) { hintName(peer, nameHint); var pp = st.profiles.get(peer); if (pp && !pp.loaded) st.profiles.delete(peer); }
    if (isBlocked(peer)) { toast(T('blocked'), 'error'); return; }
    var id = pair(u.uid, peer);
    if (st.openId === id && document.getElementById('cn-chat')) return;
    closeChat(true);
    startList();
    if (st.listReady) { try { await Promise.race([st.listReady, new Promise(function (r) { setTimeout(r, 4000); })]); } catch (e) { /* ignore */ } }
    var known = st.chats.get(id);
    if (!known) {
      var ok = await connected(peer);
      if (!ok) { await loadProfiles([peer]); toast(T('need_follow', { n: prof(peer).name }), 'info'); return; }
    }
    await loadProfiles([peer]);
    st.openId = id; st.peer = peer; st.msgs = []; st.limit = PAGE; st.file = null; st.chatExists = !!known;
    buildChat();
    subscribePresence();
    if (known) subscribeMessages(); else drawMessages();
    try { if (typeof touchPresence === 'function') touchPresence(); } catch (e) { /* ignore */ }
  }
  function chatEl() { return document.getElementById('cn-chat'); }
  function buildChat() {
    var p = prof(st.peer);
    var el = document.createElement('div'); el.className = 'cn-chat cn-m'; el.id = 'cn-chat'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="cn-ch-h"><button class="cn-ib ghost" data-a="back" aria-label="' + esc(T('back')) + '">' + IC.back + '</button>' +
      '<button class="cn-ch-who" data-a="profile"><span class="cn-av">' + avatar(p.name, p.photo, 40) + '</span><span><b>' + esc(p.name) + '</b><small id="cn-st"></small></span></button>' +
      '<button class="cn-ib ghost" data-a="menu" aria-label="Menu">' + IC.dots + '</button></div>' +
      '<div class="cn-body" id="cn-body"></div>' +
      '<div class="cn-prev hidden" id="cn-pv"></div>' +
      '<form class="cn-f" id="cn-f"><button type="button" class="cn-ib ghost" data-a="attach" aria-label="' + esc(T('attach')) + '">' + IC.clip + '</button>' +
      '<textarea id="cn-in" rows="1" maxlength="2000" placeholder="' + esc(T('ph')) + '" aria-label="' + esc(T('ph')) + '"></textarea>' +
      '<button type="submit" class="cn-ib cn-send" id="cn-sd" aria-label="' + esc(T('send')) + '">' + IC.send + '</button></form>' +
      '<input type="file" id="cn-fi" accept="image/*,video/*" class="hidden" style="display:none">';
    document.body.appendChild(el);
    el.addEventListener('click', onChatClick);
    var form = q('#cn-f', el), inp = q('#cn-in', el);
    form.addEventListener('submit', function (e) { e.preventDefault(); sendFromComposer(); });
    inp.addEventListener('input', function () { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 760) { e.preventDefault(); sendFromComposer(); } });
    q('#cn-fi', el).addEventListener('change', onFilePicked);
    fitViewport();
    setTimeout(function () { try { if (window.innerWidth > 760) inp.focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function fitViewport() {
    var el = chatEl(); if (!el) return;
    var vv = window.visualViewport;
    function fit() { var c = chatEl(); if (!c) return; if (vv) { c.style.height = vv.height + 'px'; c.style.top = vv.offsetTop + 'px'; } else c.style.height = window.innerHeight + 'px'; var b = document.getElementById('cn-body'); if (b && nearBottom) b.scrollTop = b.scrollHeight; }
    fit();
    if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); el.__fit = fit; el.__vv = vv; }
  }
  var nearBottom = true;
  function closeChat(silent) {
    var el = chatEl();
    if (el) {
      if (el.__vv && el.__fit) { try { el.__vv.removeEventListener('resize', el.__fit); el.__vv.removeEventListener('scroll', el.__fit); } catch (e) { /* ignore */ } }
      el.remove();
    }
    if (st.unsubMsgs) { try { st.unsubMsgs(); } catch (e) { /* ignore */ } st.unsubMsgs = null; }
    if (st.unsubPres) { try { st.unsubPres(); } catch (e) { /* ignore */ } st.unsubPres = null; }
    clearTimeout(st.readT);
    document.getElementById('cn-lb') && document.getElementById('cn-lb').remove();
    st.openId = null; st.peer = null; st.msgs = []; st.file = null;
    if (!silent && listVisible()) renderList();
  }
  function onChatClick(e) {
    var a = e.target.closest('[data-a]');
    var menu = document.getElementById('cn-menu');
    if (menu && !e.target.closest('#cn-menu') && !(a && a.getAttribute('data-a') === 'menu')) menu.remove();
    if (!a) {
      var im = e.target.closest('img.m'); if (im) { lightbox(im.getAttribute('src')); return; }
      var del = e.target.closest('[data-del]'); if (del) { deleteMsg(del.getAttribute('data-del')); }
      return;
    }
    var act = a.getAttribute('data-a');
    if (act === 'back') closeChat();
    else if (act === 'profile') openPeerProfile();
    else if (act === 'attach') { var fi = document.getElementById('cn-fi'); if (fi) fi.click(); }
    else if (act === 'older') { st.limit += PAGE; subscribeMessages(); }
    else if (act === 'menu') toggleMenu();
    else if (act === 'cancelfile') { st.file = null; drawPreview(); }
  }
  function toggleMenu() {
    var ex = document.getElementById('cn-menu'); if (ex) { ex.remove(); return; }
    var m = document.createElement('div'); m.className = 'cn-menu'; m.id = 'cn-menu';
    m.innerHTML = '<button data-m="profile">' + esc(T('profile')) + '</button>';
    chatEl().appendChild(m);
    m.addEventListener('click', function (e) { if (e.target.closest('[data-m="profile"]')) { m.remove(); openPeerProfile(); } });
  }
  function openPeerProfile() {
    var peer = st.peer, p = prof(peer);
    closeChat(true); // la fiche profil s'ouvre au-dessus de l'application : on quitte d'abord la conversation
    try { if (typeof openProfileModal === 'function') { openProfileModal(peer, p.name, p.verified); } } catch (e) { /* ignore */ }
  }
  function lightbox(src) {
    if (!/^https:\/\//.test(src || '')) return;
    var lb = document.createElement('div'); lb.className = 'cn-lb'; lb.id = 'cn-lb';
    lb.innerHTML = '<img alt="" src="' + esc(src) + '"><button class="cn-ib" aria-label="' + esc(T('close')) + '">' + IC.x + '</button>';
    lb.addEventListener('click', function () { lb.remove(); });
    document.body.appendChild(lb);
  }

  /* ----- présence du correspondant */
  function subscribePresence() {
    if (st.unsubPres) { try { st.unsubPres(); } catch (e) { /* ignore */ } }
    var peer = st.peer;
    function draw(lastActive) {
      var el = document.getElementById('cn-st'); if (!el) return;
      if (!lastActive) { el.textContent = ''; el.classList.remove('on'); return; }
      var on = (Date.now() - Date.parse(lastActive)) < ONLINE_MS;
      el.classList.toggle('on', on);
      el.textContent = on ? T('online') : T('seen', { t: ago(lastActive) });
      st.pres.set(peer, { on: on, at: Date.now(), last: lastActive });
    }
    try {
      st.unsubPres = fdb().collection('presence').doc(peer).onSnapshot(function (d) { draw(d.exists ? d.data().lastActiveAt : null); }, function () { /* pas bloquant */ });
    } catch (e) { /* ignore */ }
    clearInterval(st.presT);
    st.presT = setInterval(function () { if (!chatEl()) { clearInterval(st.presT); return; } var c = st.pres.get(peer); draw(c && c.last); }, 30000);
  }

  /* ----- messages en direct */
  function subscribeMessages() {
    if (st.unsubMsgs) { try { st.unsubMsgs(); } catch (e) { /* ignore */ } st.unsubMsgs = null; }
    var id = st.openId; if (!id) return;
    try {
      st.unsubMsgs = fdb().collection('chats').doc(id).collection('messages').orderBy('createdAt', 'desc').limit(st.limit).onSnapshot({ includeMetadataChanges: true }, function (snap) {
        if (st.openId !== id) return;
        var arr = [];
        snap.forEach(function (doc) { var m = doc.data() || {}; m.id = doc.id; m._pending = !!doc.metadata.hasPendingWrites; arr.push(m); });
        arr.sort(function (a, b) { return String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id).localeCompare(String(b.id)); });
        st.msgs = arr; st.more = arr.length >= st.limit;
        drawMessages();
        scheduleRead();
      }, function (err) {
        console.log('[messages] fil :', err && err.code);
        if (st.openId !== id) return;
        st.msgs = []; drawMessages(err && err.code === 'permission-denied' ? T('denied') : '');
      });
    } catch (e) { /* ignore */ }
  }
  function onChatDocChanged() {
    var c = st.chats.get(st.openId);
    if (c && !st.chatExists) { st.chatExists = true; if (!st.unsubMsgs) subscribeMessages(); }
    if (chatEl()) { drawMessages(); scheduleRead(); }
  }
  function drawMessages(note) {
    var body = document.getElementById('cn-body'); if (!body) return;
    var u = me(); if (!u) return;
    var chat = st.chats.get(st.openId) || {}, peerRead = (chat.reads && chat.reads[st.peer]) || '';
    var prevBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
    nearBottom = prevBottom < 140 || !body.__init;
    var html = '', last = '';
    if (st.more) html += '<button class="cn-old" data-a="older">' + esc(T('older')) + '</button>';
    if (!st.msgs.length) html += '<div class="cn-hi">' + esc(note || T('say_hi')) + '</div>';
    st.msgs.forEach(function (m) {
      var k = dayKey(m.createdAt || iso());
      if (k !== last) { html += '<div class="cn-day">' + esc(dayLabel(m.createdAt || iso())) + '</div>'; last = k; }
      html += bubble(m, u.uid, peerRead);
    });
    body.innerHTML = html;
    if (nearBottom || (st.msgs.length && st.msgs[st.msgs.length - 1].senderId === u.uid)) body.scrollTop = body.scrollHeight;
    body.__init = true;
  }
  function bubble(m, uid, peerRead) {
    var mine = m.senderId === uid, cls = 'cn-b ' + (mine ? 'me' : 'you'), media = '', cap = '', src = safeMedia(m.mediaUrl);
    var isMedia = (m.type === 'image' || m.type === 'video') && src;
    var story = '';
    if (m.storyRef && typeof m.storyRef === 'object') {
      var ss = safeMedia(m.storyRef.mediaUrl);
      var thumb = ss ? (m.storyRef.mediaType === 'video' ? '<video src="' + esc(ss) + '" muted playsinline preload="metadata"></video>' : '<img alt="" src="' + esc(ss) + '">') : '';
      story = '<div class="cn-sr">' + thumb + '<span>' + esc(mine ? T('story_out') : T('story_in')) + '</span></div>';
    }
    if (isMedia) {
      media = m.type === 'video' ? '<video class="m" src="' + esc(src) + '" controls playsinline preload="metadata"></video>' : '<img class="m" alt="" src="' + esc(src) + '" loading="lazy">';
      if (m.text) cap = '<div class="cap">' + linkify(m.text) + '</div>';
    }
    var tick = '';
    if (mine) {
      if (m._pending) tick = '<span title="' + esc(T('pending')) + '">' + IC.clock + '</span>';
      else if (peerRead && peerRead >= (m.createdAt || '')) tick = '<span class="rd">' + IC.tick2 + '</span>';
      else tick = '<span>' + IC.tick + '</span>';
    }
    var inner = story + media + cap + (isMedia ? '' : '<div>' + linkify(m.text || '') + '</div>');
    var time = '<div class="t"><span>' + esc(hhmm(m.createdAt)) + '</span>' + tick + '</div>';
    var del = mine && !m._pending ? ' data-del="' + esc(m.id) + '"' : '';
    return '<div class="' + cls + (isMedia ? ' media' : '') + '"' + del + '>' + inner + time + '</div>';
  }

  /* ----- lu */
  function scheduleRead() {
    clearTimeout(st.readT);
    st.readT = setTimeout(markRead, 700);
  }
  function markRead() {
    var u = me(), id = st.openId; if (!u || !id || document.hidden) return;
    var c = st.chats.get(id); if (!c) return;
    var lm = c.lastMessage; if (!lm || lm.senderId === u.uid) return;
    var r = c.reads && c.reads[u.uid];
    if (r && r >= (c.lastAt || '')) return;
    var o = {}; o['reads.' + u.uid] = iso();
    fdb().collection('chats').doc(id).update(o).catch(function () { /* pas bloquant */ });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && st.openId) scheduleRead(); });

  /* ----- envoi */
  function previewText(type, text, hasStory) {
    var t = type === 'image' ? '' : type === 'video' ? '' : String(text || '');
    return t.slice(0, 120);
  }
  async function writeMessage(opts) {
    // opts : { chatId, peer, type, text, mediaUrl, story: {id, mediaUrl, mediaType} }
    var u = me(), d = fdb(); if (!u || !d) throw new Error('login');
    var now = iso(), chatRef = d.collection('chats').doc(opts.chatId), msgRef = chatRef.collection('messages').doc();
    var members = [u.uid, opts.peer].sort();
    var msg = { senderId: u.uid, receiverId: opts.peer, type: opts.type, createdAt: now };
    if (opts.text) msg.text = String(opts.text).slice(0, 2000);
    if (opts.mediaUrl) msg.mediaUrl = opts.mediaUrl;
    if (opts.story) msg.storyRef = { storyId: String(opts.story.id), ownerUid: opts.peer, mediaUrl: opts.story.mediaUrl || '', mediaType: opts.story.mediaType === 'video' ? 'video' : 'image' };
    var last = { senderId: u.uid, type: opts.type, text: previewText(opts.type, opts.text), at: now };
    if (opts.story) last.story = true;
    var chatData = { members: members, lastMessage: last, lastAt: now, reads: {} };
    chatData.reads[u.uid] = now;
    var batch = d.batch();
    batch.set(chatRef, chatData, { merge: true });
    batch.set(msgRef, msg);
    if (opts.story) {
      batch.set(d.collection('story_replies').doc(), { storyId: String(opts.story.id), ownerUid: opts.peer, senderId: u.uid, text: String(opts.text || '').slice(0, 500), createdAt: now, chatId: opts.chatId });
    }
    await batch.commit();
    pushFor(opts.chatId, msgRef.id);
    return msgRef.id;
  }
  var lastPush = 0;
  function pushFor(chatId, messageId) {
    // Le serveur lit le message lui-même (texte, expéditeur) : rien ne peut être falsifié depuis le téléphone.
    try {
      var now = Date.now(); if (now - lastPush < 1500) return; lastPush = now;
      if (typeof auth === 'undefined' || !auth || !auth.currentUser) return;
      auth.currentUser.getIdToken().then(function (idToken) {
        return fetch('/api/notify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat-push', idToken: idToken, chatId: chatId, messageId: messageId }) });
      }).catch(function () { /* la notification est un plus : jamais bloquant */ });
    } catch (e) { /* ignore */ }
  }
  function explainSendError(e) {
    var code = e && e.code;
    if (code === 'permission-denied') return T('denied');
    return T('fail');
  }
  async function sendFromComposer() {
    var u = me(); if (!u || !st.openId || st.uploading) return;
    var inp = document.getElementById('cn-in'), sd = document.getElementById('cn-sd');
    var text = (inp.value || '').replace(/\n{3,}/g, '\n\n').trim();
    if (!text && !st.file) return;
    var id = st.openId, peer = st.peer;
    if (isBlocked(peer)) { toast(T('blocked'), 'error'); return; }
    sd.disabled = true;
    try {
      if (st.file) {
        var f = st.file, isVid = /^video\//.test(f.type);
        st.uploading = true; setProgress(0);
        var send = f;
        if (!isVid) send = await shrinkImage(f);
        var up = await uploadFileToStorage(send, 'chat', { maxSizeMB: isVid ? 50 : 10, onProgress: setProgress });
        await writeMessage({ chatId: id, peer: peer, type: isVid ? 'video' : 'image', text: text, mediaUrl: up.url });
        st.file = null; st.uploading = false; drawPreview();
      } else {
        await writeMessage({ chatId: id, peer: peer, type: 'text', text: text });
      }
      inp.value = ''; inp.style.height = 'auto';
      if (!st.chatExists) { st.chatExists = true; subscribeMessages(); }
    } catch (e) {
      st.uploading = false; drawPreview();
      toast(e && e.message && /Fichier trop|trop volumineux|too large/i.test(e.message) ? e.message : explainSendError(e), 'error');
    } finally { sd.disabled = false; if (inp) inp.focus(); }
  }
  function onFilePicked(e) {
    var f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    var isImg = /^image\//.test(f.type), isVid = /^video\//.test(f.type);
    if (!isImg && !isVid) { toast(T('bad_file'), 'error'); return; }
    if (isImg && f.size > 25 * 1024 * 1024) { toast(T('big_img'), 'error'); return; }
    if (isVid && f.size > 50 * 1024 * 1024) { toast(T('big_vid'), 'error'); return; }
    st.file = f; drawPreview();
  }
  function drawPreview() {
    var pv = document.getElementById('cn-pv'); if (!pv) return;
    if (!st.file) { pv.classList.add('hidden'); pv.innerHTML = ''; return; }
    var isVid = /^video\//.test(st.file.type), url = URL.createObjectURL(st.file);
    pv.classList.remove('hidden');
    pv.innerHTML = (isVid ? '<video src="' + url + '" muted playsinline></video>' : '<img alt="" src="' + url + '">') + '<div class="pg"><div id="cn-pt">' + esc(st.file.name || '') + '</div><div class="bar"><i id="cn-pb"></i></div></div><button type="button" class="cn-ib ghost" data-a="cancelfile" aria-label="' + esc(T('cancel')) + '">' + IC.x + '</button>';
  }
  function setProgress(p) {
    var b = document.getElementById('cn-pb'), t = document.getElementById('cn-pt');
    if (b) b.style.width = p + '%';
    if (t) t.textContent = T('uploading', { p: p });
  }
  function shrinkImage(file) {
    return new Promise(function (resolve) {
      try {
        if (file.size < 900 * 1024 || /gif|svg/.test(file.type)) { resolve(file); return; }
        var img = new Image(), url = URL.createObjectURL(file);
        img.onload = function () {
          try {
            var max = 1600, w = img.naturalWidth, h = img.naturalHeight, r = Math.min(1, max / Math.max(w, h));
            var c = document.createElement('canvas'); c.width = Math.round(w * r); c.height = Math.round(h * r);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            c.toBlob(function (b) { URL.revokeObjectURL(url); resolve(b && b.size < file.size ? new File([b], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.82);
          } catch (e) { resolve(file); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      } catch (e) { resolve(file); }
    });
  }
  async function deleteMsg(mid) {
    var id = st.openId; if (!id || !mid) return;
    if (!window.confirm(T('del_q'))) return;
    try { await fdb().collection('chats').doc(id).collection('messages').doc(mid).delete(); toast(T('deleted'), 'success'); } catch (e) { toast(T('fail'), 'error'); }
  }

  /* ---------------------------------------------------------------- réponse à une story */
  function currentStory() {
    try { if (typeof storyViewerState !== 'undefined' && storyViewerState) return storyViewerState.stories[storyViewerState.index]; } catch (e) { /* ignore */ }
    return null;
  }
  async function replyToStory() {
    var u = me(), s = currentStory();
    if (!u) { toast(T('login')); return; }
    if (!s || !s.uid || s.uid === u.uid) return;
    try { clearTimeout(storyViewerTimer); var v = document.getElementById('story-current-video'); if (v) v.pause(); } catch (e) { /* ignore */ }
    hintName(s.uid, s.name);
    var name = s.name || prof(s.uid).name;
    var resume = function () { try { if (typeof renderStoryViewerFrame === 'function' && storyViewerState) renderStoryViewerFrame(); } catch (e) { /* ignore */ } };
    if (isBlocked(s.uid)) { toast(T('blocked'), 'error'); resume(); return; }
    var ok = await connected(s.uid);
    if (!ok) { toast(T('need_follow', { n: name }), 'info'); resume(); return; }
    var old = document.getElementById('cn-story-reply'); if (old) old.remove();
    var media = safeMedia(s.mediaUrl);
    var bg = document.createElement('div'); bg.className = 'cn-sheet-bg cn-m'; bg.id = 'cn-story-reply';
    bg.innerHTML = '<div class="cn-sheet"><h3><span>' + esc(T('reply_title', { n: name })) + '</span><button class="cn-ib ghost" data-x="1" aria-label="' + esc(T('close')) + '">' + IC.x + '</button></h3>' +
      '<div class="cn-st">' + (media ? (s.mediaType === 'video' ? '<video src="' + esc(media) + '" muted playsinline preload="metadata"></video>' : '<img alt="" src="' + esc(media) + '">') : '') + '<span>' + esc(name) + '</span></div>' +
      '<textarea id="cn-sr-t" maxlength="500" placeholder="' + esc(T('reply_ph')) + '"></textarea>' +
      '<div class="go"><button class="cn-btn" id="cn-sr-go">' + esc(T('send')) + '</button></div></div>';
    document.body.appendChild(bg);
    var close = function () { bg.remove(); resume(); };
    bg.__close = close;
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-x]')) close(); });
    var ta = q('#cn-sr-t', bg); setTimeout(function () { try { ta.focus(); } catch (e) { /* ignore */ } }, 80);
    q('#cn-sr-go', bg).addEventListener('click', async function () {
      var text = (ta.value || '').trim(); if (!text) return;
      var go = this; go.disabled = true;
      try {
        await writeMessage({ chatId: pair(u.uid, s.uid), peer: s.uid, type: 'text', text: text, story: { id: s.id, mediaUrl: media, mediaType: s.mediaType } });
        bg.remove(); toast(T('reply_sent'), 'success'); resume();
      } catch (e) { go.disabled = false; toast(explainSendError(e), 'error'); }
    });
  }
  window.replyToCurrentStory = replyToStory;

  /* ---------------------------------------------------------------- branchements */
  function showList() { startList(); renderList(); }
  async function openChatById(chatId) {
    var u = me(); if (!u) return;
    var m = String(chatId || '').split('_'), peer = null;
    if (m.length === 2) peer = m[0] === u.uid ? m[1] : (m[1] === u.uid ? m[0] : null);
    if (!peer) { try { showDashTab('messages'); } catch (e) { /* ignore */ } return; }
    try { showDashTab('messages'); } catch (e) { /* ignore */ }
    openChat(peer, null);
  }
  window.CNMessages = {
    T: T, showList: showList, openChat: openChat, openChatById: openChatById, closeChat: closeChat, replyToStory: replyToStory,
    unreadCount: unreadCount, _state: st, _pair: pair,
    closeStoryReply: function () { var b = document.getElementById('cn-story-reply'); if (b && b.__close) b.__close(); else if (b) b.remove(); }
  };
  window.openChatWith = function (uid, name) { openChat(uid, name || null); };

  function boot() {
    try {
      if (typeof auth !== 'undefined' && auth && typeof auth.onAuthStateChanged === 'function') {
        auth.onAuthStateChanged(function (user) {
          if (!user) { closeChat(true); stopList(); return; }
          var tries = 0;
          (function wait() { if (me() && me().uid === user.uid) { startList(); if (listVisible()) renderList(); return; } if (++tries < 40) setTimeout(wait, 500); })();
        });
      }
    } catch (e) { /* ignore */ }
    if (me()) startList();
    if (listVisible()) renderList();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
