/* Coeurnoh Universe — Messagerie privée en temps réel (version 2).
   - Liste des conversations (onglet « Messages » de la barre du bas) : pastille de non-lus avec le nombre, coches, « écrit… ».
   - Chat privé : texte, photos, vidéos, documents (PDF, Word, Excel…), messages vocaux, réponses (citations), réactions,
     coches façon WhatsApp (✓ envoyé · ✓✓ gris reçu · ✓✓ bleu lu), statut en ligne, « écrit… », appels audio/vidéo (calls-pro.js).
   - Tout le monde peut écrire à tout le monde (sauf blocage) : plus besoin de s’abonner.
   - Réponse à une story : le message arrive dans la conversation avec l'auteur, relié à la story.
   - Notification push à chaque nouveau message (le serveur construit le texte : /api/notify-user, action « chat-push »).
   Données Firestore : chats/{a_b} (members, lastMessage, lastAt, reads, delivered, typing, unread), chats/{a_b}/messages, story_replies.
   Fichier séparé et chargé de façon sûre par stability.js : s'il échoue, le reste de l'application n'est pas touché. */
(function () {
  'use strict';
  if (window.CNMessages) return;

  /* ---------------------------------------------------------------- textes (5 langues : fr, en, es, it, pt) */
  var LANGS = ['fr', 'en', 'es', 'it', 'pt'];
  var D = {
    messages: ['Messages', 'Messages', 'Mensajes', 'Messaggi', 'Mensagens'],
    compose: ['Nouveau message', 'New message', 'Nuevo mensaje', 'Nuovo messaggio', 'Nova mensagem'],
    search: ['Rechercher…', 'Search…', 'Buscar…', 'Cerca…', 'Pesquisar…'],
    search_people: ['Chercher une personne…', 'Find someone…', 'Buscar a alguien…', 'Cerca una persona…', 'Procurar alguém…'],
    empty_t: ['Pas encore de conversation', 'No conversations yet', 'Aún no hay conversaciones', 'Ancora nessuna conversazione', 'Ainda sem conversas'],
    empty_p: ['Écris à n’importe qui sur Coeurnoh Universe : vos messages apparaîtront ici, en direct.', 'Write to anyone on Coeurnoh Universe: your messages will show up here, live.', 'Escribe a cualquiera en Coeurnoh Universe: tus mensajes aparecerán aquí, en directo.', 'Scrivi a chiunque su Coeurnoh Universe: i messaggi appariranno qui, in diretta.', 'Escreve a qualquer pessoa no Coeurnoh Universe: as mensagens aparecem aqui, em direto.'],
    write: ['Écrire à quelqu’un', 'Write to someone', 'Escribir a alguien', 'Scrivi a qualcuno', 'Escrever a alguém'],
    contacts: ['Contacts', 'Contacts', 'Contactos', 'Contatti', 'Contactos'],
    recents: ['Récents', 'Recent', 'Recientes', 'Recenti', 'Recentes'],
    results: ['Résultats', 'Results', 'Resultados', 'Risultati', 'Resultados'],
    type_name: ['Tape un nom pour trouver n’importe qui.', 'Type a name to find anyone.', 'Escribe un nombre para encontrar a cualquiera.', 'Scrivi un nome per trovare chiunque.', 'Escreve um nome para encontrar qualquer pessoa.'],
    searching: ['Recherche…', 'Searching…', 'Buscando…', 'Ricerca…', 'A procurar…'],
    no_result: ['Aucun compte trouvé.', 'No account found.', 'Ninguna cuenta encontrada.', 'Nessun account trovato.', 'Nenhuma conta encontrada.'],
    online: ['En ligne', 'Online', 'En línea', 'Online', 'Online'],
    typing: ['écrit…', 'typing…', 'escribiendo…', 'sta scrivendo…', 'a escrever…'],
    recording: ['enregistre un vocal…', 'recording audio…', 'grabando audio…', 'registra un vocale…', 'a gravar áudio…'],
    seen: ['Vu {t}', 'Seen {t}', 'Visto {t}', 'Visto {t}', 'Visto {t}'],
    you: ['Toi', 'You', 'Tú', 'Tu', 'Tu'],
    photo: ['Photo', 'Photo', 'Foto', 'Foto', 'Foto'],
    video: ['Vidéo', 'Video', 'Vídeo', 'Video', 'Vídeo'],
    voice: ['Message vocal', 'Voice message', 'Mensaje de voz', 'Messaggio vocale', 'Mensagem de voz'],
    document: ['Document', 'Document', 'Documento', 'Documento', 'Documento'],
    camera: ['Appareil photo', 'Camera', 'Cámara', 'Fotocamera', 'Câmara'],
    gallery: ['Photo ou vidéo', 'Photo or video', 'Foto o vídeo', 'Foto o video', 'Foto ou vídeo'],
    story_in: ['A répondu à ta story', 'Replied to your story', 'Respondió a tu historia', 'Ha risposto alla tua storia', 'Respondeu à tua story'],
    story_out: ['Tu as répondu à sa story', 'You replied to their story', 'Respondiste a su historia', 'Hai risposto alla sua storia', 'Respondeste à story dele(a)'],
    ph: ['Écris un message…', 'Write a message…', 'Escribe un mensaje…', 'Scrivi un messaggio…', 'Escreve uma mensagem…'],
    send: ['Envoyer', 'Send', 'Enviar', 'Invia', 'Enviar'],
    attach: ['Joindre', 'Attach', 'Adjuntar', 'Allega', 'Anexar'],
    emoji: ['Emoji', 'Emoji', 'Emoji', 'Emoji', 'Emoji'],
    uploading: ['Envoi… {p} %', 'Sending… {p}%', 'Enviando… {p} %', 'Invio… {p}%', 'A enviar… {p}%'],
    big_img: ['Photo trop lourde (10 Mo maximum).', 'Photo too large (10 MB max).', 'Foto demasiado pesada (máx. 10 MB).', 'Foto troppo pesante (max 10 MB).', 'Foto demasiado pesada (máx. 10 MB).'],
    big_vid: ['Vidéo trop lourde (50 Mo maximum).', 'Video too large (50 MB max).', 'Vídeo demasiado pesado (máx. 50 MB).', 'Video troppo pesante (max 50 MB).', 'Vídeo demasiado pesado (máx. 50 MB).'],
    big_doc: ['Fichier trop lourd (10 Mo maximum).', 'File too large (10 MB max).', 'Archivo demasiado pesado (máx. 10 MB).', 'File troppo pesante (max 10 MB).', 'Ficheiro demasiado pesado (máx. 10 MB).'],
    bad_type: ['Ce type de fichier n’est pas autorisé.', 'This file type is not allowed.', 'Este tipo de archivo no está permitido.', 'Questo tipo di file non è consentito.', 'Este tipo de ficheiro não é permitido.'],
    blocked: ['Tu ne peux pas écrire à ce compte.', 'You can’t message this account.', 'No puedes escribir a esta cuenta.', 'Non puoi scrivere a questo account.', 'Não podes escrever a esta conta.'],
    fail: ['Message non envoyé. Réessaie.', 'Message not sent. Try again.', 'Mensaje no enviado. Inténtalo de nuevo.', 'Messaggio non inviato. Riprova.', 'Mensagem não enviada. Tenta de novo.'],
    denied: ['Impossible d’écrire à cette personne pour le moment (compte bloqué ou messagerie en cours de mise à jour).', 'You can’t write to this person right now (blocked account or messaging being updated).', 'No puedes escribir a esta persona ahora (cuenta bloqueada o mensajería en actualización).', 'Non puoi scrivere a questa persona ora (account bloccato o messaggistica in aggiornamento).', 'Não podes escrever a esta pessoa agora (conta bloqueada ou mensagens em atualização).'],
    list_denied: ['La messagerie est en cours d’activation. Réessaie dans un instant.', 'Messaging is being activated. Try again in a moment.', 'La mensajería se está activando. Inténtalo en un momento.', 'La messaggistica si sta attivando. Riprova tra poco.', 'As mensagens estão a ser ativadas. Tenta daqui a pouco.'],
    older: ['Voir les messages précédents', 'Show earlier messages', 'Ver mensajes anteriores', 'Mostra messaggi precedenti', 'Ver mensagens anteriores'],
    today: ['Aujourd’hui', 'Today', 'Hoy', 'Oggi', 'Hoje'],
    yesterday: ['Hier', 'Yesterday', 'Ayer', 'Ieri', 'Ontem'],
    say_hi: ['Dis bonjour 👋', 'Say hello 👋', 'Saluda 👋', 'Saluta 👋', 'Diz olá 👋'],
    profile: ['Voir le profil', 'View profile', 'Ver perfil', 'Vedi profilo', 'Ver perfil'],
    del: ['Supprimer', 'Delete', 'Eliminar', 'Elimina', 'Apagar'],
    del_q: ['Supprimer ce message pour tout le monde ?', 'Delete this message for everyone?', '¿Eliminar este mensaje para todos?', 'Eliminare questo messaggio per tutti?', 'Apagar esta mensagem para todos?'],
    deleted: ['Message supprimé', 'Message deleted', 'Mensaje eliminado', 'Messaggio eliminato', 'Mensagem apagada'],
    reply: ['Répondre', 'Reply', 'Responder', 'Rispondi', 'Responder'],
    copy: ['Copier', 'Copy', 'Copiar', 'Copia', 'Copiar'],
    copied: ['Copié', 'Copied', 'Copiado', 'Copiato', 'Copiado'],
    replying: ['Réponse à {n}', 'Replying to {n}', 'Respondiendo a {n}', 'Risposta a {n}', 'A responder a {n}'],
    back: ['Retour', 'Back', 'Volver', 'Indietro', 'Voltar'],
    close: ['Fermer', 'Close', 'Cerrar', 'Chiudi', 'Fechar'],
    cancel: ['Annuler', 'Cancel', 'Cancelar', 'Annulla', 'Cancelar'],
    reply_btn: ['Répondre à {n}…', 'Reply to {n}…', 'Responder a {n}…', 'Rispondi a {n}…', 'Responder a {n}…'],
    reply_title: ['Répondre à la story de {n}', 'Reply to {n}’s story', 'Responder a la historia de {n}', 'Rispondi alla storia di {n}', 'Responder à story de {n}'],
    reply_ph: ['Écris ta réponse…', 'Write your reply…', 'Escribe tu respuesta…', 'Scrivi la tua risposta…', 'Escreve a tua resposta…'],
    reply_sent: ['Réponse envoyée', 'Reply sent', 'Respuesta enviada', 'Risposta inviata', 'Resposta enviada'],
    login: ['Connecte-toi pour utiliser la messagerie.', 'Log in to use messaging.', 'Inicia sesión para usar la mensajería.', 'Accedi per usare la messaggistica.', 'Inicia sessão para usar as mensagens.'],
    someone: ['Utilisateur', 'User', 'Usuario', 'Utente', 'Utilizador'],
    msg_btn: ['Message', 'Message', 'Mensaje', 'Messaggio', 'Mensagem'],
    now: ['à l’instant', 'just now', 'ahora mismo', 'adesso', 'agora mesmo'],
    m: ['il y a {n} min', '{n} min ago', 'hace {n} min', '{n} min fa', 'há {n} min'],
    h: ['il y a {n} h', '{n} h ago', 'hace {n} h', '{n} h fa', 'há {n} h'],
    d: ['il y a {n} j', '{n} d ago', 'hace {n} d', '{n} g fa', 'há {n} d'],
    pending: ['Envoi…', 'Sending…', 'Enviando…', 'Invio…', 'A enviar…'],
    tk_sent: ['Envoyé', 'Sent', 'Enviado', 'Inviato', 'Enviado'],
    tk_delivered: ['Reçu', 'Delivered', 'Recibido', 'Ricevuto', 'Recebido'],
    tk_read: ['Lu', 'Read', 'Leído', 'Letto', 'Lido'],
    rec_denied: ['Autorise le micro pour enregistrer un message vocal.', 'Allow the microphone to record a voice message.', 'Permite el micrófono para grabar un mensaje de voz.', 'Consenti il microfono per registrare un vocale.', 'Permite o microfone para gravar uma mensagem de voz.'],
    rec_unsupported: ['Les messages vocaux ne sont pas pris en charge sur cet appareil.', 'Voice messages are not supported on this device.', 'Los mensajes de voz no son compatibles con este dispositivo.', 'I messaggi vocali non sono supportati su questo dispositivo.', 'As mensagens de voz não são suportadas neste dispositivo.'],
    rec_short: ['Message vocal trop court.', 'Voice message too short.', 'Mensaje de voz demasiado corto.', 'Messaggio vocale troppo breve.', 'Mensagem de voz demasiado curta.'],
    play_fail: ['Impossible de lire ce message vocal.', 'Can’t play this voice message.', 'No se puede reproducir este mensaje de voz.', 'Impossibile riprodurre questo vocale.', 'Não é possível reproduzir esta mensagem de voz.'],
    open: ['Ouvrir', 'Open', 'Abrir', 'Apri', 'Abrir'],
    call_voice: ['Appel vocal', 'Voice call', 'Llamada de voz', 'Chiamata vocale', 'Chamada de voz'],
    call_video: ['Appel vidéo', 'Video call', 'Videollamada', 'Videochiamata', 'Videochamada'],
    call_missed: ['Appel manqué', 'Missed call', 'Llamada perdida', 'Chiamata persa', 'Chamada perdida'],
    call_noanswer: ['Pas de réponse', 'No answer', 'Sin respuesta', 'Nessuna risposta', 'Sem resposta'],
    call_declined: ['Appel refusé', 'Call declined', 'Llamada rechazada', 'Chiamata rifiutata', 'Chamada recusada'],
    call_cancelled: ['Appel annulé', 'Call cancelled', 'Llamada cancelada', 'Chiamata annullata', 'Chamada cancelada'],
    call_busy: ['Occupé', 'Busy', 'Ocupado', 'Occupato', 'Ocupado'],
    call_back: ['Rappeler', 'Call back', 'Devolver', 'Richiama', 'Ligar de volta'],
    call_unavail: ['Les appels ne sont pas disponibles pour le moment.', 'Calls are not available right now.', 'Las llamadas no están disponibles ahora.', 'Le chiamate non sono disponibili ora.', 'As chamadas não estão disponíveis agora.'],
    new_msgs: ['{n} nouveau(x)', '{n} new', '{n} nuevo(s)', '{n} nuovo/i', '{n} novo(s)'],
    down: ['Aller en bas', 'Go to bottom', 'Ir al final', 'Vai in fondo', 'Ir para o fim']
  };
  var LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', pt: 'pt-PT' };
  function lang() {
    try { var l = String((typeof currentLang !== 'undefined' && currentLang) || document.documentElement.lang || 'fr').slice(0, 2).toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : 'fr'; } catch (e) { return 'fr'; }
  }
  function T(k, a) {
    var row = D[k];
    var s = row ? (row[LANGS.indexOf(lang())] || row[0]) : k;
    if (a) Object.keys(a).forEach(function (x) { s = s.split('{' + x + '}').join(a[x]); });
    return s;
  }

  /* ---------------------------------------------------------------- petits outils */
  var PAGE = 50, ONLINE_MS = 5 * 60 * 1000, CLOUD = 'https://res.cloudinary.com/aqe4fxh4/';
  var CALLS_SRC = 'calls-pro.js?v=20261060';
  var BAD_EXT = /\.(exe|apk|bat|cmd|msi|scr|vbs|jar|sh|com|pif|dll|app|dmg|js|ps1)$/i;
  var EMOJIS = '😀 😂 🤣 😊 😍 😘 😎 🤩 🥰 😉 😇 🙂 🙃 😅 😭 😢 😡 😱 🤔 🙄 😴 🤗 😏 😬 🥳 😋 😜 🤭 😌 😔 👍 👎 👏 🙏 💪 👌 ✌️ 🤝 🙌 👋 🤞 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 💕 💯 🔥 ✨ 🎉 🎁 🌹 ☀️ ⭐ ✅ ❌ 💰 📞 📷 🎵 🍕 ☕ 🚀'.split(' ');
  var REACTS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
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
  function fmtDur(s) { s = Math.max(0, Math.round(+s || 0)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function fmtSize(b) { b = +b || 0; if (b < 1024) return b + ' o'; if (b < 1048576) return Math.round(b / 1024) + ' Ko'; return (b / 1048576).toFixed(1).replace('.0', '') + ' Mo'; }
  function fileExt(name) { var m = /\.([A-Za-z0-9]{1,6})$/.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
  var EXT_COLOR = { pdf: '#e5484d', doc: '#2b6cd4', docx: '#2b6cd4', odt: '#2b6cd4', xls: '#1f9d57', xlsx: '#1f9d57', csv: '#1f9d57', ppt: '#e8731a', pptx: '#e8731a', zip: '#7a8499', rar: '#7a8499', txt: '#7a8499', mp3: '#8b5cf6', wav: '#8b5cf6' };
  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s<]{3,200})/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'; }).replace(/\n/g, '<br>');
  }
  function avatar(name, photo, px) {
    try { if (typeof renderAvatarHtml === 'function') return renderAvatarHtml(name || 'C', photo || null, px); } catch (e) { /* repli */ }
    return '<div class="post-avatar" style="width:' + px + 'px;height:' + px + 'px">' + esc((name || 'C')[0].toUpperCase()) + '</div>';
  }
  function svg(p, s, sw, fill) {
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + (fill || 'none') + '" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  var IC = {
    back: svg('<polyline points="15 18 9 12 15 6"/>', 22, 2.2),
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z"/></svg>',
    plus: svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 22, 2.2),
    gallery: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>', 22),
    camera: svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', 22),
    doc: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', 22),
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 20),
    x: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 18, 2.4),
    dots: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    chat: svg('<path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z"/>', 46, 1.6),
    tick: svg('<polyline points="4 12.5 9.5 18 20 6.5"/>', 15, 2.6),
    tick2: '<svg width="19" height="15" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2 12.5 7.5 18 18 6.5"/><polyline points="12 16 14 18 25 6.5"/></svg>',
    clock: svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>', 13, 2.4),
    phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>', 20),
    vcam: svg('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>', 22),
    mic: svg('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>', 22),
    trash: svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', 20),
    smile: svg('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>', 22),
    play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7 4 20 12 7 20 7 4"/></svg>',
    pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    reply: svg('<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>', 20),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', 20),
    down: svg('<polyline points="6 9 12 15 18 9"/>', 22, 2.4),
    user: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', 20),
    dl: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', 20)
  };

  /* ---------------------------------------------------------------- styles */
  var STYLES = [
    '.cn-m{--cn-me:#2f4468;--cn-me2:#3f5a89;--cn-tk:#53bdeb;--cn-ok:#16a34a}',
    '#cn-msg-root{padding:4px 0 90px}',
    '.cn-lh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 12px}',
    '.cn-lh h2{margin:0}',
    '.cn-ib{width:42px;height:42px;border-radius:50%;border:0;background:var(--green,#28374f);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;-webkit-tap-highlight-color:transparent;transition:transform .12s}',
    '.cn-ib:active{transform:scale(.93)}',
    '.cn-ib.ghost{background:transparent;color:inherit;width:40px;height:40px}',
    '.cn-ib.ghost:active{background:rgba(127,127,127,.18)}',
    '.cn-s{width:100%;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);border-radius:999px;padding:11px 16px;font:inherit;font-size:.92rem;margin-bottom:10px;outline:none;box-sizing:border-box}',
    '.cn-s:focus{border-color:var(--accent,#f39c1f)}',
    '.cn-rows{background:var(--white,#fff);border-radius:18px;overflow:hidden;box-shadow:0 2px 14px rgba(20,38,63,.06)}',
    '.cn-row{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-bottom:1px solid var(--line,#e2e6ee);box-sizing:border-box}',
    '.cn-row:last-child{border-bottom:0}',
    '.cn-row:active{background:var(--green-light,#eef1f6)}',
    '.cn-av{position:relative;flex:0 0 auto;display:inline-flex}',
    '.cn-av .post-avatar,.cn-av .post-avatar-img{border-radius:50%;object-fit:cover}',
    '.cn-dot{position:absolute;right:-1px;bottom:-1px;width:13px;height:13px;border-radius:50%;background:#22c55e;border:2px solid var(--white,#fff);display:none}',
    '.cn-dot.on{display:block}',
    '.cn-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
    '.cn-mid b{font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cn-mid small{font-size:.85rem;color:var(--muted,#5d6779);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px}',
    '.cn-mid small span.tx{overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '.cn-mid small.un{color:var(--ink,#141a26);font-weight:700}',
    '.cn-mid small.ty{color:var(--cn-ok,#16a34a);font-weight:700}',
    '.cn-meta{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto;font-size:.74rem;color:var(--muted,#5d6779)}',
    '.cn-meta time.un{color:var(--accent-dark,#d9820f);font-weight:700}',
    '.cn-un{min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:var(--accent,#f39c1f);color:#fff;font-size:.72rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}',
    '.tk{display:inline-flex;align-items:center;vertical-align:middle;line-height:0}',
    '.tk.sent,.tk.delivered{color:var(--muted,#8b94a6)}',
    '.tk.read{color:var(--cn-tk,#53bdeb)}',
    '.cn-empty{text-align:center;padding:44px 22px;color:var(--muted,#5d6779)}',
    '.cn-empty svg{opacity:.55;margin-bottom:8px}',
    '.cn-empty h3{color:var(--ink,#141a26);margin:6px 0}',
    '.cn-empty p{font-size:.92rem;line-height:1.5;margin:0 auto 16px;max-width:320px}',
    '.cn-btn{border:0;border-radius:999px;padding:11px 20px;font:inherit;font-weight:700;font-size:.92rem;background:var(--green,#28374f);color:#fff;cursor:pointer}',
    /* chat plein écran */
    '.cn-chat{position:fixed;left:0;right:0;top:0;height:100%;z-index:1500;background:var(--bg,#eef0f4);color:var(--ink,#141a26);display:flex;flex-direction:column;overscroll-behavior:contain}',
    '.cn-ch-h{display:flex;align-items:center;gap:6px;padding:8px 6px 8px 2px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:var(--white,#fff);border-bottom:1px solid var(--line,#e2e6ee);flex:0 0 auto;box-shadow:0 2px 12px rgba(20,38,63,.05)}',
    '.cn-ch-who{display:flex;align-items:center;gap:10px;flex:1;min-width:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:2px}',
    '.cn-ch-who>span:last-child{display:flex;flex-direction:column;min-width:0}',
    '.cn-ch-who b{font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cn-ch-who small{font-size:.76rem;color:var(--muted,#5d6779);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cn-ch-who small.on{color:var(--cn-ok,#16a34a);font-weight:700}',
    '.cn-ch-h .cn-ib.ghost{width:38px;height:38px}',
    '.cn-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 12px 8px;display:flex;flex-direction:column;gap:2px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background-image:radial-gradient(rgba(127,127,127,.07) 1px,transparent 1px);background-size:18px 18px;position:relative}',
    '.cn-day{align-self:center;margin:12px 0 6px;font-size:.72rem;font-weight:700;color:var(--muted,#5d6779);background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);padding:3px 11px;border-radius:999px}',
    '.cn-b{max-width:82%;padding:7px 11px 5px;border-radius:18px;font-size:.95rem;line-height:1.42;word-wrap:break-word;overflow-wrap:anywhere;position:relative;margin-top:6px;box-shadow:0 1px 2px rgba(20,38,63,.08);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:pan-y;transition:transform .18s}',
    '.cn-b.cont{margin-top:1px}',
    '.cn-b.me{align-self:flex-end;background:linear-gradient(135deg,var(--cn-me,#2f4468),var(--cn-me2,#3f5a89));color:#fff;border-bottom-right-radius:6px}',
    '.cn-b.me.cont{border-top-right-radius:6px}',
    '.cn-b.you{align-self:flex-start;background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);border-bottom-left-radius:6px}',
    '.cn-b.you.cont{border-top-left-radius:6px}',
    '.cn-b.hl{animation:cnHl 1.2s ease}',
    '@keyframes cnHl{0%,60%{box-shadow:0 0 0 3px var(--accent,#f39c1f)}100%{box-shadow:0 1px 2px rgba(20,38,63,.08)}}',
    '.cn-b a{color:inherit;text-decoration:underline;-webkit-user-select:text;user-select:text}',
    '.cn-b a.cn-file{text-decoration:none}',
    '.cn-b .t{display:flex;align-items:center;justify-content:flex-end;gap:4px;font-size:.66rem;opacity:.8;margin-top:2px;line-height:1}',
    '.cn-b.me .t .tk.sent,.cn-b.me .t .tk.delivered,.cn-b.me .t .tk.pending{color:rgba(255,255,255,.72)}',
    '.cn-b.me .t .tk.read{color:#7fd4ff}',
    '.cn-b.media{padding:4px 4px 5px}',
    '.cn-b.media .t{padding:0 7px}',
    '.cn-b.media .cap{padding:6px 8px 0}',
    '.cn-b img.m,.cn-b video.m{display:block;max-width:100%;width:260px;max-height:340px;object-fit:cover;border-radius:14px;background:#0003;cursor:pointer}',
    '.cn-b video.m{object-fit:contain;background:#000}',
    '.cn-q{display:block;width:100%;text-align:left;font:inherit;margin:0 0 5px;padding:6px 9px;border-radius:11px;border:0;border-left:4px solid var(--accent,#f39c1f);background:rgba(127,127,127,.16);color:inherit;cursor:pointer;font-size:.8rem;line-height:1.3}',
    '.cn-q b{display:block;font-size:.76rem;color:var(--accent,#f39c1f)}',
    '.cn-q span{display:block;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}',
    '.cn-rx-row{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;margin:-2px 0 0}',
    '.cn-rxc{display:inline-flex;align-items:center;gap:3px;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);border-radius:999px;padding:1px 7px;font-size:.78rem;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,.12);cursor:pointer}',
    '.cn-rxc.mine{border-color:var(--accent,#f39c1f)}',
    '.cn-b .cn-rxw{position:absolute;bottom:-13px;right:10px;display:flex;gap:3px}',
    '.cn-b.you .cn-rxw{right:auto;left:10px}',
    '.cn-b.rx{margin-bottom:12px}',
    /* fichiers */
    '.cn-file{display:flex;align-items:center;gap:10px;min-width:210px;max-width:290px;padding:2px 0 3px;text-decoration:none;color:inherit;-webkit-user-select:none;user-select:none}',
    '.cn-file .fi{flex:0 0 auto;width:44px;height:50px;border-radius:10px;color:#fff;font-weight:800;font-size:.7rem;display:flex;align-items:center;justify-content:center;letter-spacing:.02em}',
    '.cn-file .fn{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.cn-file .fn b{font-size:.9rem;word-break:break-all;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.cn-file .fn small{font-size:.74rem;opacity:.75}',
    '.cn-file .go{flex:0 0 auto;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(127,127,127,.2)}',
    /* messages vocaux */
    '.cn-vp{display:flex;align-items:center;gap:9px;min-width:215px;padding:2px 0 2px}',
    '.cn-vp .vb{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:0;display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--accent,#f39c1f);color:#fff}',
    '.cn-vp .vw{flex:1;display:flex;align-items:center;gap:2px;height:34px;cursor:pointer;min-width:110px}',
    '.cn-vp .vw i{display:block;flex:1;min-width:2px;border-radius:2px;background:currentColor;opacity:.32}',
    '.cn-vp .vw i.on{opacity:1}',
    '.cn-vp .vt{flex:0 0 auto;font-size:.72rem;opacity:.85;min-width:32px;text-align:right}',
    '.cn-vp .vs{flex:0 0 auto;border:0;border-radius:999px;background:rgba(127,127,127,.25);color:inherit;font:inherit;font-size:.68rem;font-weight:800;padding:3px 7px;cursor:pointer;display:none}',
    '.cn-vp.pl .vs{display:block}',
    /* journal d’appel */
    '.cn-call{align-self:center;display:flex;align-items:center;gap:10px;margin:10px 0 4px;padding:8px 14px;border-radius:16px;background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);font-size:.84rem;box-shadow:0 1px 2px rgba(20,38,63,.06)}',
    '.cn-call .ci{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--green-light,#eef1f6);color:var(--green,#28374f);flex:0 0 auto}',
    '.cn-call.bad .ci{background:rgba(229,72,77,.14);color:#e5484d}',
    '.cn-call b{display:block}',
    '.cn-call small{color:var(--muted,#5d6779);font-size:.72rem}',
    '.cn-call button{border:0;background:transparent;color:var(--accent-dark,#d9820f);font:inherit;font-weight:700;font-size:.8rem;cursor:pointer;padding:6px 4px}',
    '.cn-sr{display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:6px 8px;border-radius:12px;background:rgba(127,127,127,.16);border-left:3px solid var(--accent,#f39c1f);font-size:.78rem}',
    '.cn-sr img,.cn-sr video{width:38px;height:52px;border-radius:8px;object-fit:cover;flex:0 0 auto;background:#0004}',
    '.cn-sr span{opacity:.9;line-height:1.3}',
    '.cn-old{align-self:center;border:0;background:transparent;color:var(--green-dark-text,#28374f);font:inherit;font-weight:700;font-size:.82rem;padding:6px 12px;cursor:pointer;text-decoration:underline}',
    '.cn-hi{margin:auto;text-align:center;color:var(--muted,#5d6779);font-size:.95rem}',
    '.cn-down{position:absolute;right:14px;bottom:86px;z-index:4;width:42px;height:42px;border-radius:50%;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);box-shadow:0 4px 14px rgba(0,0,0,.2);display:none;align-items:center;justify-content:center;cursor:pointer}',
    '.cn-down.on{display:flex}',
    '.cn-down i{position:absolute;top:-7px;right:-5px;min-width:19px;height:19px;border-radius:999px;background:var(--accent,#f39c1f);color:#fff;font-style:normal;font-size:.68rem;font-weight:800;display:none;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box}',
    '.cn-down i.on{display:flex}',
    /* barre réponse + aperçu fichier */
    '.cn-rp{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--white,#fff);border-top:1px solid var(--line,#e2e6ee);flex:0 0 auto}',
    '.cn-rp .bx{flex:1;min-width:0;padding:5px 10px;border-radius:10px;border-left:4px solid var(--accent,#f39c1f);background:var(--green-light,#eef1f6);font-size:.82rem}',
    '.cn-rp .bx b{display:block;font-size:.76rem;color:var(--accent-dark,#d9820f)}',
    '.cn-rp .bx span{display:block;color:var(--muted,#5d6779);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cn-prev{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--white,#fff);border-top:1px solid var(--line,#e2e6ee);flex:0 0 auto}',
    '.cn-prev img,.cn-prev video{width:54px;height:54px;border-radius:10px;object-fit:cover;background:#000}',
    '.cn-prev .fi{width:42px;height:48px;border-radius:9px;color:#fff;font-weight:800;font-size:.68rem;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.cn-prev .pg{flex:1;min-width:0;font-size:.82rem;color:var(--muted,#5d6779)}',
    '.cn-prev .pg div:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cn-prev .bar{height:5px;border-radius:5px;background:var(--line,#e2e6ee);margin-top:6px;overflow:hidden}',
    '.cn-prev .bar i{display:block;height:100%;width:0;background:var(--accent,#f39c1f);transition:width .2s}',
    /* zone de saisie */
    '.cn-f{position:relative;display:flex;align-items:flex-end;gap:6px;padding:8px 8px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));background:var(--white,#fff);border-top:1px solid var(--line,#e2e6ee);flex:0 0 auto}',
    '.cn-f .box{flex:1;display:flex;align-items:flex-end;background:var(--bg,#eef0f4);border:1px solid var(--line,#e2e6ee);border-radius:24px;min-width:0}',
    '.cn-f .box:focus-within{border-color:var(--accent,#f39c1f)}',
    '.cn-f textarea{flex:1;min-width:0;resize:none;border:0;background:transparent;color:var(--ink,#141a26);padding:11px 4px;font:inherit;font-size:.96rem;line-height:1.35;max-height:120px;min-height:44px;outline:none;box-sizing:border-box}',
    '.cn-f .box .cn-ib.ghost{width:42px;height:44px;border-radius:24px;color:var(--muted,#5d6779)}',
    '.cn-send{background:linear-gradient(135deg,var(--cn-me,#2f4468),var(--cn-me2,#3f5a89))}',
    '.cn-send.mic{background:linear-gradient(135deg,#f5a524,#f39c1f)}',
    '.cn-send[disabled]{opacity:.45}',
    '.cn-f .cn-rec{display:none;flex:1;align-items:center;gap:10px;min-width:0}',
    '.cn-f.rec .cn-rec{display:flex}',
    '.cn-f.rec>:not(.cn-rec){display:none !important}',
    '.cn-rec .rd{width:11px;height:11px;border-radius:50%;background:#e5484d;animation:cnPulse 1s infinite}',
    '@keyframes cnPulse{50%{opacity:.25}}',
    '.cn-rec .rt{font-variant-numeric:tabular-nums;font-weight:700;min-width:42px}',
    '.cn-rec .lv{flex:1;display:flex;align-items:center;gap:2px;height:30px;overflow:hidden;min-width:0}',
    '.cn-rec .lv i{display:block;width:3px;border-radius:2px;background:var(--accent,#f39c1f);flex:0 0 auto;height:3px}',
    '.cn-rec .cn-ib.ghost{color:#e5484d}',
    '.cn-am{position:absolute;left:8px;bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:6;background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.22);padding:8px;display:grid;grid-template-columns:repeat(3,76px);gap:4px}',
    '.cn-am button{border:0;background:transparent;color:inherit;font:inherit;font-size:.74rem;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 2px;border-radius:12px;cursor:pointer}',
    '.cn-am button:active{background:var(--green-light,#eef1f6)}',
    '.cn-am button span{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}',
    '.cn-emo{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:8px 10px;background:var(--white,#fff);border-top:1px solid var(--line,#e2e6ee);max-height:168px;overflow-y:auto;flex:0 0 auto}',
    '.cn-emo button{border:0;background:transparent;font-size:1.45rem;padding:5px 0;border-radius:10px;cursor:pointer;line-height:1.2}',
    '.cn-emo button:active{background:var(--green-light,#eef1f6)}',
    /* feuilles et fenêtres */
    '.cn-sheet-bg{position:fixed;inset:0;z-index:3400;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}',
    '.cn-sheet{width:100%;max-width:560px;background:var(--white,#fff);color:var(--ink,#141a26);border-radius:22px 22px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom,0px));max-height:86%;display:flex;flex-direction:column;gap:10px;box-sizing:border-box}',
    '.cn-sheet h3{margin:0;font-size:1.02rem;display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.cn-sheet .lst{overflow-y:auto;border-radius:14px;border:1px solid var(--line,#e2e6ee);min-height:60px}',
    '.cn-sheet .sec{padding:8px 14px 4px;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#5d6779);background:var(--green-light,#eef1f6)}',
    '.cn-sheet textarea{width:100%;border:1px solid var(--line,#e2e6ee);background:var(--bg,#eef0f4);color:var(--ink,#141a26);border-radius:16px;padding:11px 14px;font:inherit;font-size:.96rem;min-height:84px;resize:none;outline:none;box-sizing:border-box}',
    '.cn-sheet .go{display:flex;justify-content:flex-end;gap:8px}',
    '.cn-mm .rx{display:flex;justify-content:space-around;padding:4px 0 6px;border-bottom:1px solid var(--line,#e2e6ee)}',
    '.cn-mm .rx button{border:0;background:transparent;font-size:1.7rem;padding:6px 8px;border-radius:14px;cursor:pointer}',
    '.cn-mm .rx button.on{background:var(--green-light,#eef1f6)}',
    '.cn-mm .it{display:flex;align-items:center;gap:14px;border:0;background:transparent;color:inherit;font:inherit;font-size:1rem;padding:13px 8px;cursor:pointer;border-radius:12px;text-align:left}',
    '.cn-mm .it:active{background:var(--green-light,#eef1f6)}',
    '.cn-mm .it.bad{color:#e5484d}',
    '.cn-st{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;background:var(--green-light,#eef1f6)}',
    '.cn-st img,.cn-st video{width:44px;height:60px;border-radius:9px;object-fit:cover;background:#000}',
    '.cn-st span{font-size:.84rem;color:var(--muted,#5d6779)}',
    '.cn-lb{position:fixed;inset:0;z-index:1700;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center}',
    '.cn-lb img{max-width:100%;max-height:100%;object-fit:contain}',
    '.cn-lb button{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;background:rgba(255,255,255,.18);color:#fff}',
    '.cn-menu{position:absolute;right:8px;top:calc(54px + env(safe-area-inset-top,0px));z-index:5;background:var(--white,#fff);border:1px solid var(--line,#e2e6ee);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);overflow:hidden;min-width:190px}',
    '.cn-menu button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:transparent;color:inherit;font:inherit;padding:12px 16px;cursor:pointer}',
    '.cn-menu button:active{background:var(--green-light,#eef1f6)}',
    /* profil + story */
    '.profile-action-row{display:flex;justify-content:center;align-items:center;gap:10px;margin:14px 0 0}',
    '.profile-action-row .follow-btn{margin:0 !important}',
    '.profile-msg-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);border-radius:999px;padding:9px 20px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer}',
    '.profile-msg-btn:active{transform:scale(.97)}',
    '.story-viewer-footer.story-footer-reply{justify-content:space-between;gap:12px}',
    '.story-reply-btn{flex:1;min-width:0;text-align:left;border:1.5px solid rgba(255,255,255,.6);background:rgba(0,0,0,.25);color:#fff;border-radius:999px;padding:12px 18px;font:inherit;font-size:.92rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '@media(min-width:760px){.cn-chat{max-width:560px;left:50%;right:auto;width:100%;transform:translateX(-50%);box-shadow:0 0 40px rgba(0,0,0,.3)}}'
  ].join('');
  (function () { var el = document.createElement('style'); el.setAttribute('data-cn-msg', '2'); el.textContent = STYLES; document.head.appendChild(el); })();

  /* ---------------------------------------------------------------- état */
  var st = {
    uid: null, chats: new Map(), unsubList: null, listReady: null, listResolve: null, listError: false,
    openId: null, peer: null, unsubMsgs: null, unsubPres: null, msgs: [], limit: PAGE, chatExists: false, more: false,
    file: null, fileKind: '', uploading: false, readT: null, profiles: new Map(), pres: new Map(), filter: '',
    reply: null, typingSeen: {}, typingUntil: {}, lastTypingSent: 0, noAck: false, noTyping: false, acking: {}, ackT: null,
    legacy: false, legacyAt: 0, rec: null, unseen: 0, peerLastAt: '', rate: 1, anchor: 0, lastMsgId: '', callsP: null
  };
  var nearBottom = true;
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
  function isBlocked(peer) { try { return typeof blockedSet !== 'undefined' && blockedSet.has(peer); } catch (e) { return false; } }
  function byId(id) { for (var i = 0; i < st.msgs.length; i++) if (st.msgs[i].id === id) return st.msgs[i]; return null; }
  function isLegacy() { if (st.legacy && Date.now() - st.legacyAt > 5 * 60000) st.legacy = false; return st.legacy; }

  /* ---------------------------------------------------------------- liste des conversations (temps réel) */
  function isUnread(c, uid) {
    var lm = c.lastMessage;
    if (!lm || lm.senderId === uid) return false;
    var r = c.reads && c.reads[uid];
    return !r || r < (c.lastAt || '');
  }
  function unreadOf(c, uid) {
    if (!isUnread(c, uid)) return 0;
    var n = c.unread && c.unread[uid];
    return typeof n === 'number' && n > 0 ? Math.min(n, 999) : 1;
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
        var prev = st.chats;
        st.chats = next; st.listError = false;
        trackTyping(prev, next, u.uid);
        if (st.listResolve) { st.listResolve(true); st.listResolve = null; }
        updateBadge();
        queueAck();
        if (listVisible()) renderListSoon();
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
    st.unsubList = null; st.chats = new Map(); st.uid = null; st.typingSeen = {}; st.typingUntil = {}; st.acking = {}; updateBadge();
  }
  function listVisible() { var t = document.getElementById('dash-tab-messages'); return !!(t && !t.classList.contains('hidden')); }
  function root() {
    var r = document.getElementById('cn-msg-root');
    if (!r) { var tab = document.getElementById('dash-tab-messages'); if (!tab) return null; r = document.createElement('div'); r.id = 'cn-msg-root'; tab.appendChild(r); }
    return r;
  }
  var renderT = null;
  function renderListSoon() { clearTimeout(renderT); renderT = setTimeout(function () { if (listVisible()) renderList(); }, 60); }

  /* ----- « reçu » (✓✓ gris) : dès que l'appli du destinataire reçoit le message, elle le signale dans la conversation */
  function queueAck() {
    if (st.noAck || isLegacy()) return;
    clearTimeout(st.ackT);
    st.ackT = setTimeout(doAck, 350);
  }
  function doAck() {
    var u = me(), d = fdb(); if (!u || !d || st.noAck || isLegacy()) return;
    st.chats.forEach(function (c) {
      var lm = c.lastMessage; if (!lm || lm.senderId === u.uid || !c.lastAt) return;
      if (Date.now() - Date.parse(c.lastAt) > 7 * 86400000) return; // vieilles conversations : pas la peine
      var cur = c.delivered && c.delivered[u.uid];
      if (cur && cur >= c.lastAt) return;
      if (st.acking[c.id] === c.lastAt) return;
      st.acking[c.id] = c.lastAt;
      var o = {}; o['delivered.' + u.uid] = c.lastAt;
      d.collection('chats').doc(c.id).update(o).catch(function (e) { if (e && e.code === 'permission-denied') st.noAck = true; });
    });
  }
  /* ----- « écrit… » */
  function trackTyping(prev, next, uid) {
    next.forEach(function (c, id) {
      var peer = otherOf(c, uid), v = c.typing && c.typing[peer];
      var had = Object.prototype.hasOwnProperty.call(st.typingSeen, id);
      if (!had) { st.typingSeen[id] = v || ''; return; }
      if (v && v !== st.typingSeen[id]) {
        st.typingSeen[id] = v;
        st.typingUntil[id] = Date.now() + 5500;
        setTimeout(function () { if (listVisible()) renderListSoon(); if (st.openId === id) drawStatus(); }, 5600);
      }
      var p = prev.get(id);
      if (p && p.lastAt !== c.lastAt && c.lastMessage && c.lastMessage.senderId !== uid) st.typingUntil[id] = 0;
    });
  }
  function isTyping(id) { return (st.typingUntil[id] || 0) > Date.now(); }

  function preview(c, uid) {
    var lm = c.lastMessage || {}, t;
    if (lm.type === 'image') t = '📷 ' + (lm.text || T('photo'));
    else if (lm.type === 'video') t = '🎥 ' + (lm.text || T('video'));
    else if (lm.type === 'audio') t = '🎤 ' + T('voice') + (lm.dur ? ' (' + fmtDur(lm.dur) + ')' : '');
    else if (lm.type === 'file') t = '📄 ' + (lm.text || T('document'));
    else if (lm.type === 'call') t = '📞 ' + callLabel({ call: { kind: lm.kind, status: lm.call, duration: lm.dur }, senderId: lm.senderId }, uid);
    else t = String(lm.text || '');
    if (lm.story) t = '↩ ' + (lm.senderId === uid ? T('story_out') : T('story_in')) + (lm.text ? ' · ' + lm.text : '');
    return t;
  }
  function tickKind(c, uid) {
    var peer = otherOf(c, uid), ca = c.lastAt || '';
    var rd = c.reads && c.reads[peer], dl = c.delivered && c.delivered[peer];
    if (rd && rd >= ca) return 'read';
    if (dl && dl >= ca) return 'delivered';
    return 'sent';
  }
  function tickHtml(kind) {
    if (kind === 'pending') return '<span class="tk pending" title="' + esc(T('pending')) + '">' + IC.clock + '</span>';
    return '<span class="tk ' + kind + '" title="' + esc(T('tk_' + kind)) + '">' + (kind === 'sent' ? IC.tick : IC.tick2) + '</span>';
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
    var searchHtml = st.chats.size > 4 ? '<input class="cn-s" id="cn-s" type="search" placeholder="' + esc(T('search')) + '" value="' + esc(st.filter) + '" autocomplete="off">' : '';
    var body;
    if (st.listError && !st.chats.size) body = '<div class="cn-empty">' + IC.chat + '<p>' + esc(T('list_denied')) + '</p></div>';
    else if (!rows.length && !f) body = '<div class="cn-empty">' + IC.chat + '<h3>' + esc(T('empty_t')) + '</h3><p>' + esc(T('empty_p')) + '</p><button class="cn-btn" data-act="compose">' + esc(T('write')) + '</button></div>';
    else body = '<div class="cn-rows">' + rows.map(function (c) {
      var peer = otherOf(c, u.uid), p = prof(peer), n = unreadOf(c, u.uid), pc = st.pres.get(peer), ty = isTyping(c.id);
      var mineLast = c.lastMessage && c.lastMessage.senderId === u.uid;
      var line = ty ? '<span class="tx">' + esc(T('typing')) + '</span>' : (mineLast ? tickHtml(tickKind(c, u.uid)) : '') + '<span class="tx">' + esc(preview(c, u.uid)) + '</span>';
      return '<button class="cn-row" data-chat="' + esc(c.id) + '" data-peer="' + esc(peer) + '"><span class="cn-av">' + avatar(p.name, p.photo, 50) + '<i class="cn-dot' + (pc && pc.on ? ' on' : '') + '" data-pd="' + esc(peer) + '"></i></span><span class="cn-mid"><b>' + esc(p.name) + '</b><small class="' + (ty ? 'ty' : (n ? 'un' : '')) + '">' + line + '</small></span><span class="cn-meta"><time class="' + (n ? 'un' : '') + '">' + esc(listTime(c.lastAt)) + '</time>' + (n ? '<i class="cn-un">' + (n > 99 ? '99+' : n) + '</i>' : '') + '</span></button>';
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

  /* ---------------------------------------------------------------- écrire à n'importe qui (contacts + recherche) */
  async function searchPeople(qs) {
    var d = fdb(), out = new Map(); if (!d) return [];
    var low = qs.toLowerCase(), cap = qs.charAt(0).toUpperCase() + qs.slice(1).toLowerCase();
    async function run(field, val) {
      try {
        var s = await d.collection('public_profiles').where(field, '>=', val).where(field, '<=', val + '').limit(15).get();
        s.forEach(function (doc) { var v = doc.data() || {}; out.set(doc.id, { id: doc.id, name: v.username || v.name || T('someone'), photo: v.photoURL || null, verified: !!v.verified }); });
      } catch (e) { /* ignore */ }
    }
    var jobs = [run('username', low), run('name', qs)];
    if (cap !== qs) jobs.push(run('name', cap));
    await Promise.all(jobs);
    try { if (typeof allSellersCache !== 'undefined' && allSellersCache) allSellersCache.forEach(function (s) { if (s.uid && s.name && s.name.toLowerCase().indexOf(low) >= 0 && !out.has(s.uid)) out.set(s.uid, { id: s.uid, name: s.name, photo: null, verified: !!s.verified }); }); } catch (e) { /* ignore */ }
    return Array.from(out.values());
  }
  async function openPicker() {
    var u = me(), d = fdb(); if (!u || !d) { toast(T('login')); return; }
    closePicker();
    var bg = document.createElement('div'); bg.className = 'cn-sheet-bg'; bg.id = 'cn-picker';
    bg.innerHTML = '<div class="cn-sheet cn-m"><h3><span>' + esc(T('compose')) + '</span><button class="cn-ib ghost" data-x="1" aria-label="' + esc(T('close')) + '">' + IC.x + '</button></h3><input class="cn-s" id="cn-ps" type="search" placeholder="' + esc(T('search_people')) + '" autocomplete="off" style="margin:0"><div class="lst" id="cn-pl"><div class="cn-empty" style="padding:24px">…</div></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-x]')) closePicker(); });
    var recents = Array.from(st.chats.values()).sort(function (a, b) { return String(b.lastAt || '').localeCompare(String(a.lastAt || '')); }).map(function (c) { return otherOf(c, u.uid); });
    var ids = new Set();
    try { (typeof followingSet !== 'undefined' ? Array.from(followingSet) : []).forEach(function (x) { ids.add(x); }); } catch (e) { /* ignore */ }
    try { var s = await d.collection('follows').where('followedUid', '==', u.uid).limit(200).get(); s.forEach(function (x) { var v = x.data(); if (v && v.followerUid) ids.add(v.followerUid); }); } catch (e) { /* ignore */ }
    ids.delete(u.uid);
    var recSet = new Set(recents);
    var contacts = Array.from(ids).filter(function (x) { return !recSet.has(x); }).slice(0, 120);
    await loadProfiles(recents.concat(contacts));
    var box = document.getElementById('cn-pl'); if (!box) return;
    var seq = 0;
    function row(o) { return '<button class="cn-row" data-pick="' + esc(o.id) + '"><span class="cn-av">' + avatar(o.name, o.photo, 44) + '</span><span class="cn-mid"><b>' + esc(o.name) + '</b></span></button>'; }
    function section(title, arr) { return arr.length ? '<div class="sec">' + esc(title) + '</div>' + arr.map(row).join('') : ''; }
    function asRow(x) { var p = prof(x); return { id: x, name: p.name, photo: p.photo }; }
    function draw(f, remote) {
      var html = '';
      if (!f) {
        html = section(T('recents'), recents.filter(function (x) { return !isBlocked(x); }).map(asRow)) + section(T('contacts'), contacts.filter(function (x) { return !isBlocked(x); }).map(asRow));
        if (!html) html = '<div class="cn-empty" style="padding:24px"><p style="margin:0">' + esc(T('type_name')) + '</p></div>';
      } else {
        var local = recents.concat(contacts).map(asRow).filter(function (o) { return o.name.toLowerCase().indexOf(f) >= 0 && !isBlocked(o.id); });
        var seen = new Set(local.map(function (o) { return o.id; }));
        var rem = (remote || []).filter(function (o) { return o.id !== u.uid && !seen.has(o.id) && !isBlocked(o.id); });
        html = section(T('results'), local.concat(rem));
        if (!html) html = '<div class="cn-empty" style="padding:24px"><p style="margin:0">' + esc(remote ? T('no_result') : T('searching')) + '</p></div>';
      }
      box.innerHTML = html;
    }
    draw('');
    var inp = document.getElementById('cn-ps'), tm = null;
    if (inp) inp.addEventListener('input', function () {
      var f = inp.value.trim(); clearTimeout(tm);
      if (!f) { draw(''); return; }
      draw(f.toLowerCase(), null);
      if (f.length < 2) return;
      var my = ++seq;
      tm = setTimeout(async function () {
        var res = await searchPeople(f);
        if (my !== seq || !document.getElementById('cn-pl')) return;
        res.forEach(function (o) { st.profiles.set(o.id, { name: o.name, photo: o.photo, verified: o.verified, loaded: true }); hintName(o.id, o.name); });
        draw(f.toLowerCase(), res);
      }, 300);
    });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-pick]'); if (b) { var id = b.getAttribute('data-pick'); closePicker(); openChat(id, null); } });
  }
  function closePicker() { var p = document.getElementById('cn-picker'); if (p) p.remove(); }

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
    await loadProfiles([peer]);
    st.openId = id; st.peer = peer; st.msgs = []; st.limit = PAGE; st.file = null; st.fileKind = ''; st.chatExists = !!known;
    st.reply = null; st.unseen = 0; st.peerLastAt = ''; st.lastMsgId = ''; st.typingUntil[id] = 0;
    if (known) st.typingSeen[id] = (known.typing && known.typing[peer]) || '';
    buildChat();
    subscribePresence();
    if (known) subscribeMessages(); else drawMessages();
    try { if (typeof touchPresence === 'function') touchPresence(); } catch (e) { /* ignore */ }
    saveResume();
  }
  function chatEl() { return document.getElementById('cn-chat'); }
  function buildChat() {
    var p = prof(st.peer);
    var el = document.createElement('div'); el.className = 'cn-chat cn-m'; el.id = 'cn-chat'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    var head = '<div class="cn-ch-h"><button class="cn-ib ghost" data-a="back" aria-label="' + esc(T('back')) + '">' + IC.back + '</button>' +
      '<button class="cn-ch-who" data-a="profile"><span class="cn-av">' + avatar(p.name, p.photo, 40) + '</span><span><b>' + esc(p.name) + '</b><small id="cn-st"></small></span></button>' +
      '<button class="cn-ib ghost" data-a="call-audio" aria-label="' + esc(T('call_voice')) + '">' + IC.phone + '</button>' +
      '<button class="cn-ib ghost" data-a="call-video" aria-label="' + esc(T('call_video')) + '">' + IC.vcam + '</button>' +
      '<button class="cn-ib ghost" data-a="menu" aria-label="Menu">' + IC.dots + '</button></div>';
    var form = '<form class="cn-f" id="cn-f">' +
      '<button type="button" class="cn-ib ghost" data-a="attach" aria-label="' + esc(T('attach')) + '" style="color:var(--muted,#5d6779)">' + IC.plus + '</button>' +
      '<div class="box"><button type="button" class="cn-ib ghost" data-a="emoji" aria-label="' + esc(T('emoji')) + '">' + IC.smile + '</button>' +
      '<textarea id="cn-in" rows="1" maxlength="2000" placeholder="' + esc(T('ph')) + '" aria-label="' + esc(T('ph')) + '"></textarea></div>' +
      '<button type="button" class="cn-ib cn-send mic" id="cn-sd" data-a="sendmic" aria-label="' + esc(T('voice')) + '">' + IC.mic + '</button>' +
      '<div class="cn-rec"><button type="button" class="cn-ib ghost" data-a="rec-cancel" aria-label="' + esc(T('cancel')) + '">' + IC.trash + '</button><i class="rd"></i><span class="rt" id="cn-rt">0:00</span><span class="lv" id="cn-lv"></span><button type="button" class="cn-ib cn-send" data-a="rec-send" aria-label="' + esc(T('send')) + '">' + IC.send + '</button></div></form>';
    el.innerHTML = head + '<div class="cn-body" id="cn-body"></div>' +
      '<button type="button" class="cn-down" id="cn-dn" data-a="down" aria-label="' + esc(T('down')) + '">' + IC.down + '<i id="cn-dnn"></i></button>' +
      '<div class="cn-rp hidden" id="cn-rp"></div><div class="cn-prev hidden" id="cn-pv"></div><div class="cn-emo hidden" id="cn-emo"></div>' + form +
      '<input type="file" id="cn-fi-media" accept="image/*,video/*" style="display:none">' +
      '<input type="file" id="cn-fi-doc" accept="*/*" style="display:none">' +
      '<input type="file" id="cn-fi-cam" accept="image/*" capture="environment" style="display:none">';
    document.body.appendChild(el);
    el.addEventListener('click', onChatClick);
    var form2 = q('#cn-f', el), inp = q('#cn-in', el), body = q('#cn-body', el);
    form2.addEventListener('submit', function (e) { e.preventDefault(); sendFromComposer(); });
    inp.addEventListener('input', function () { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; sendTyping(); updateSendMode(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 760) { e.preventDefault(); sendFromComposer(); } });
    q('#cn-fi-media', el).addEventListener('change', function (e) { onFilePicked(e, 'media'); });
    q('#cn-fi-doc', el).addEventListener('change', function (e) { onFilePicked(e, 'doc'); });
    q('#cn-fi-cam', el).addEventListener('change', function (e) { onFilePicked(e, 'cam'); });
    body.addEventListener('scroll', onBodyScroll, { passive: true });
    body.addEventListener('load', function () { if (nearBottom) body.scrollTop = body.scrollHeight; }, true);
    bindGestures(body);
    fitViewport();
    updateSendMode();
    setTimeout(function () { try { if (window.innerWidth > 760) inp.focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function fitViewport() {
    var el = chatEl(); if (!el) return;
    var vv = window.visualViewport;
    function fit() { var c = chatEl(); if (!c) return; if (vv) { c.style.height = vv.height + 'px'; c.style.top = vv.offsetTop + 'px'; } else c.style.height = window.innerHeight + 'px'; var b = document.getElementById('cn-body'); if (b && nearBottom) b.scrollTop = b.scrollHeight; }
    fit();
    if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); el.__fit = fit; el.__vv = vv; }
  }
  function closeChat(silent) {
    var el = chatEl();
    if (st.rec) { try { stopRec(false); } catch (e) { /* ignore */ } }
    stopPlayer();
    if (el) {
      if (el.__vv && el.__fit) { try { el.__vv.removeEventListener('resize', el.__fit); el.__vv.removeEventListener('scroll', el.__fit); } catch (e) { /* ignore */ } }
      el.remove();
    }
    if (st.unsubMsgs) { try { st.unsubMsgs(); } catch (e) { /* ignore */ } st.unsubMsgs = null; }
    if (st.unsubPres) { try { st.unsubPres(); } catch (e) { /* ignore */ } st.unsubPres = null; }
    clearTimeout(st.readT); clearInterval(st.presT);
    ['cn-lb', 'cn-mm'].forEach(function (i) { var x = document.getElementById(i); if (x) x.remove(); });
    st.openId = null; st.peer = null; st.msgs = []; st.file = null; st.fileKind = ''; st.reply = null;
    if (!silent) { saveResume(); if (listVisible()) renderList(); }
  }
  function onChatClick(e) {
    if (Date.now() - (st.suppressClick || 0) < 450) { e.preventDefault(); return; }
    var a = e.target.closest('[data-a]');
    var menu = document.getElementById('cn-menu');
    if (menu && !e.target.closest('#cn-menu') && !(a && a.getAttribute('data-a') === 'menu')) menu.remove();
    var am = document.getElementById('cn-am');
    if (am && !e.target.closest('#cn-am') && !(a && a.getAttribute('data-a') === 'attach')) am.remove();
    if (!a) {
      var im = e.target.closest('img.m'); if (im) { lightbox(im.getAttribute('src')); return; }
      var qt = e.target.closest('[data-qid]'); if (qt) { jumpTo(qt.getAttribute('data-qid')); return; }
      var rc = e.target.closest('[data-rxm]'); if (rc) { openMsgMenu(rc.getAttribute('data-rxm')); return; }
      return;
    }
    var act = a.getAttribute('data-a');
    if (act === 'back') closeChat();
    else if (act === 'profile') openPeerProfile();
    else if (act === 'attach') toggleAttach();
    else if (act === 'pick-media') { closeAttach(); clickInput('cn-fi-media'); }
    else if (act === 'pick-doc') { closeAttach(); clickInput('cn-fi-doc'); }
    else if (act === 'pick-cam') { closeAttach(); clickInput('cn-fi-cam'); }
    else if (act === 'emoji') toggleEmoji();
    else if (act === 'emo') insertEmoji(a.getAttribute('data-e'));
    else if (act === 'older') { var b = document.getElementById('cn-body'); st.anchor = b ? b.scrollHeight - b.scrollTop : 0; st.limit += PAGE; subscribeMessages(); }
    else if (act === 'menu') toggleMenu();
    else if (act === 'cancelfile') { st.file = null; st.fileKind = ''; drawPreview(); updateSendMode(); }
    else if (act === 'sendmic') { if (sendMode() === 'send') sendFromComposer(); else startRec(); }
    else if (act === 'rec-cancel') stopRec(false);
    else if (act === 'rec-send') stopRec(true);
    else if (act === 'call-audio') startCall('audio');
    else if (act === 'call-video') startCall('video');
    else if (act === 'callback') startCall(a.getAttribute('data-k') === 'video' ? 'video' : 'audio');
    else if (act === 'vplay') togglePlay(a.closest('.cn-vp').getAttribute('data-mid'));
    else if (act === 'vspeed') cycleSpeed(a.closest('.cn-vp').getAttribute('data-mid'));
    else if (act === 'vseek') seekVoice(a, e);
    else if (act === 'down') { var bd = document.getElementById('cn-body'); if (bd) bd.scrollTo ? bd.scrollTo({ top: bd.scrollHeight, behavior: 'smooth' }) : (bd.scrollTop = bd.scrollHeight); }
    else if (act === 'reply-close') { st.reply = null; drawReplyBar(); }
  }
  function clickInput(id) { var fi = document.getElementById(id); if (fi) fi.click(); }
  function startCall(kind) {
    if (!st.peer) return;
    var peer = st.peer, p = prof(peer);
    ensureCalls().then(function () {
      if (window.CNCalls && typeof window.CNCalls.start === 'function') window.CNCalls.start({ peer: peer, name: p.name, photo: p.photo, kind: kind });
      else toast(T('call_unavail'), 'error');
    });
  }
  function ensureCalls() {
    if (window.CNCalls) return Promise.resolve();
    if (st.callsP) return st.callsP;
    st.callsP = new Promise(function (res) {
      try {
        var s = document.createElement('script'); s.src = CALLS_SRC; s.async = true; s.setAttribute('data-cn-calls', '1');
        s.onload = function () { res(); }; s.onerror = function () { st.callsP = null; res(); };
        document.head.appendChild(s);
      } catch (e) { st.callsP = null; res(); }
    });
    return st.callsP;
  }
  function toggleMenu() {
    var ex = document.getElementById('cn-menu'); if (ex) { ex.remove(); return; }
    var m = document.createElement('div'); m.className = 'cn-menu'; m.id = 'cn-menu';
    m.innerHTML = '<button data-m="profile">' + IC.user + '<span>' + esc(T('profile')) + '</span></button>';
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
  function toggleAttach() {
    var ex = document.getElementById('cn-am'); if (ex) { ex.remove(); return; }
    closeEmoji();
    var am = document.createElement('div'); am.className = 'cn-am'; am.id = 'cn-am';
    am.innerHTML = '<button type="button" data-a="pick-media"><span style="background:#8b5cf6">' + IC.gallery + '</span>' + esc(T('gallery')) + '</button>' +
      '<button type="button" data-a="pick-doc"><span style="background:#2b6cd4">' + IC.doc + '</span>' + esc(T('document')) + '</button>' +
      '<button type="button" data-a="pick-cam"><span style="background:#e8731a">' + IC.camera + '</span>' + esc(T('camera')) + '</button>';
    chatEl().appendChild(am);
  }
  function closeAttach() { var am = document.getElementById('cn-am'); if (am) am.remove(); }
  function toggleEmoji() {
    var box = document.getElementById('cn-emo'); if (!box) return;
    closeAttach();
    if (!box.classList.contains('hidden')) { closeEmoji(); return; }
    if (!box.firstChild) box.innerHTML = EMOJIS.map(function (e) { return '<button type="button" data-a="emo" data-e="' + e + '">' + e + '</button>'; }).join('');
    box.classList.remove('hidden');
  }
  function closeEmoji() { var box = document.getElementById('cn-emo'); if (box) box.classList.add('hidden'); }
  function insertEmoji(e) {
    var inp = document.getElementById('cn-in'); if (!inp || !e) return;
    var s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, en = inp.selectionEnd == null ? s : inp.selectionEnd;
    inp.value = inp.value.slice(0, s) + e + inp.value.slice(en);
    try { inp.setSelectionRange(s + e.length, s + e.length); } catch (x) { /* ignore */ }
    inp.dispatchEvent(new Event('input'));
  }

  /* ----- présence + « écrit… » du correspondant */
  function drawStatus() {
    var el = document.getElementById('cn-st'); if (!el) return;
    var c = st.pres.get(st.peer), last = c && c.last;
    if (isTyping(st.openId)) { el.textContent = T('typing'); el.classList.add('on'); return; }
    if (!last) { el.textContent = ''; el.classList.remove('on'); return; }
    var on = (Date.now() - Date.parse(last)) < ONLINE_MS;
    el.classList.toggle('on', on);
    el.textContent = on ? T('online') : T('seen', { t: ago(last) });
  }
  function subscribePresence() {
    if (st.unsubPres) { try { st.unsubPres(); } catch (e) { /* ignore */ } }
    var peer = st.peer;
    try {
      st.unsubPres = fdb().collection('presence').doc(peer).onSnapshot(function (d) {
        var last = d.exists ? d.data().lastActiveAt : null;
        st.pres.set(peer, { on: !!last && (Date.now() - Date.parse(last)) < ONLINE_MS, at: Date.now(), last: last });
        drawStatus();
      }, function () { /* pas bloquant */ });
    } catch (e) { /* ignore */ }
    clearInterval(st.presT);
    st.presT = setInterval(function () { if (!chatEl()) { clearInterval(st.presT); return; } drawStatus(); }, 20000);
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
    if (chatEl()) { drawStatus(); updateTicks(); scheduleRead(); }
  }

  /* ----- affichage incrémental : seules les bulles modifiées sont retouchées (la lecture audio et le défilement ne sautent jamais) */
  function htmlToEl(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function syncBody(body, items) {
    var map = {};
    Array.from(body.children).forEach(function (el) { var k = el.getAttribute('data-k'); if (k && !map[k]) map[k] = el; else if (!el.id) el.remove(); });
    var prev = null;
    items.forEach(function (it) {
      var el = map[it.k];
      if (el && el.__sig === it.sig) { delete map[it.k]; }
      else {
        var nel = htmlToEl(it.html); if (!nel) return;
        nel.setAttribute('data-k', it.k); nel.__sig = it.sig;
        if (el) { el.replaceWith(nel); delete map[it.k]; }
        el = nel;
      }
      var want = prev ? prev.nextSibling : body.firstChild;
      if (el !== want) body.insertBefore(el, want);
      prev = el;
    });
    Object.keys(map).forEach(function (k) { map[k].remove(); });
  }
  function msgSig(m) {
    return [m.id, m._pending ? 1 : 0, m.type, m.text || '', m.mediaUrl || '', m.senderId, JSON.stringify(m.reactions || {}), m.call ? JSON.stringify(m.call) : ''].join('|');
  }
  function drawMessages(note) {
    var body = document.getElementById('cn-body'); if (!body) return;
    var u = me(); if (!u) return;
    var prevBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
    var first = !body.__init;
    nearBottom = prevBottom < 140 || first;
    var items = [], last = '', prevSender = null, prevAt = 0;
    st.peerLastAt = '';
    st.msgs.forEach(function (m) { if (m.senderId !== u.uid && m.createdAt > st.peerLastAt) st.peerLastAt = m.createdAt; });
    if (st.more) items.push({ k: 'older', sig: 'older', html: '<button class="cn-old" data-a="older">' + esc(T('older')) + '</button>' });
    if (!st.msgs.length) items.push({ k: 'hi', sig: note || 'hi', html: '<div class="cn-hi">' + esc(note || T('say_hi')) + '</div>' });
    st.msgs.forEach(function (m) {
      var ca = m.createdAt || iso(), k = dayKey(ca);
      if (k !== last) { items.push({ k: 'd' + k, sig: k + dayLabel(ca), html: '<div class="cn-day">' + esc(dayLabel(ca)) + '</div>' }); last = k; prevSender = null; }
      var cont = prevSender === m.senderId && Date.parse(ca) - prevAt < 120000 && m.type !== 'call' && !m.storyRef;
      items.push({ k: 'm' + m.id, sig: msgSig(m) + (cont ? 'c' : ''), html: bubble(m, u.uid, cont) });
      prevSender = m.type === 'call' ? null : m.senderId; prevAt = Date.parse(ca);
    });
    var lastMsg = st.msgs[st.msgs.length - 1];
    var newPeerMsg = lastMsg && lastMsg.id !== st.lastMsgId && lastMsg.senderId !== u.uid && st.lastMsgId;
    if (lastMsg) st.lastMsgId = lastMsg.id;
    syncBody(body, items);
    updateTicks();
    if (st.anchor) { body.scrollTop = Math.max(0, body.scrollHeight - st.anchor); st.anchor = 0; }
    else if (nearBottom || (lastMsg && lastMsg.senderId === u.uid)) body.scrollTop = body.scrollHeight;
    if (!nearBottom && newPeerMsg) st.unseen++;
    body.__init = true;
    onBodyScroll();
  }
  function msgLabel(m) {
    if (!m) return '';
    if (m.type === 'image') return '📷 ' + (m.text || T('photo'));
    if (m.type === 'video') return '🎥 ' + (m.text || T('video'));
    if (m.type === 'audio') return '🎤 ' + T('voice');
    if (m.type === 'file') return '📄 ' + (m.fileName || T('document'));
    if (m.type === 'call') return '📞 ' + callLabel(m, me() && me().uid);
    return String(m.text || '');
  }
  function callLabel(m, uid) {
    var c = m.call || {}, mine = m.senderId === uid, kind = c.kind === 'video' ? 'call_video' : 'call_voice', s = c.status;
    if (s === 'ended') return T(kind) + (c.duration ? ' · ' + fmtDur(c.duration) : '');
    if (s === 'missed') return mine ? T('call_noanswer') : T('call_missed');
    if (s === 'declined') return T('call_declined');
    if (s === 'cancelled') return mine ? T('call_cancelled') : T('call_missed');
    if (s === 'busy') return mine ? T('call_busy') : T('call_missed');
    return T(kind);
  }
  function bubble(m, uid, cont) {
    var mine = m.senderId === uid, src = safeMedia(m.mediaUrl);
    var mid = esc(m.id);
    if (m.type === 'call') {
      var c = m.call || {}, bad = c.status === 'missed' || c.status === 'declined' || c.status === 'cancelled' || c.status === 'busy';
      var k = c.kind === 'video' ? 'video' : 'audio';
      return '<div class="cn-call' + (bad ? ' bad' : '') + '" data-mid="' + mid + '"><span class="ci">' + (k === 'video' ? IC.vcam : IC.phone) + '</span><span><b>' + esc(callLabel(m, uid)) + '</b><small>' + esc(hhmm(m.createdAt)) + '</small></span><button type="button" data-a="callback" data-k="' + k + '">' + esc(T('call_back')) + '</button></div>';
    }
    var cls = 'cn-b ' + (mine ? 'me' : 'you') + (cont ? ' cont' : '');
    var isMedia = (m.type === 'image' || m.type === 'video') && src;
    var quote = '', story = '', inner = '', rx = '';
    if (m.replyTo && typeof m.replyTo === 'object') {
      var who = m.replyTo.senderId === uid ? T('you') : prof(m.replyTo.senderId).name;
      quote = '<button type="button" class="cn-q" data-qid="' + esc(m.replyTo.id) + '"><b>' + esc(who) + '</b><span>' + esc(msgLabel(m.replyTo)) + '</span></button>';
    }
    if (m.storyRef && typeof m.storyRef === 'object') {
      var ss = safeMedia(m.storyRef.mediaUrl);
      var thumb = ss ? (m.storyRef.mediaType === 'video' ? '<video src="' + esc(ss) + '" muted playsinline preload="metadata"></video>' : '<img alt="" src="' + esc(ss) + '">') : '';
      story = '<div class="cn-sr">' + thumb + '<span>' + esc(mine ? T('story_out') : T('story_in')) + '</span></div>';
    }
    if (isMedia) {
      var media = m.type === 'video' ? '<video class="m" src="' + esc(src) + '" controls playsinline preload="metadata"></video>' : '<img class="m" alt="" src="' + esc(src) + '" loading="lazy">';
      inner = media + (m.text ? '<div class="cap">' + linkify(m.text) + '</div>' : '');
    } else if (m.type === 'file' && src) {
      var ext = fileExt(m.fileName), col = EXT_COLOR[ext] || '#5d6779';
      inner = '<a class="cn-file" href="' + esc(src) + '" target="_blank" rel="noopener noreferrer" download="' + esc(m.fileName || 'fichier') + '"><span class="fi" style="background:' + col + '">' + esc((ext || 'FILE').slice(0, 4).toUpperCase()) + '</span><span class="fn"><b>' + esc(m.fileName || T('document')) + '</b><small>' + esc((m.fileSize ? fmtSize(m.fileSize) : '') + (ext ? (m.fileSize ? ' · ' : '') + ext.toUpperCase() : '')) + '</small></span><span class="go">' + IC.dl + '</span></a>' + (m.text ? '<div>' + linkify(m.text) + '</div>' : '');
    } else if (m.type === 'audio' && src) {
      var wf = Array.isArray(m.waveform) && m.waveform.length ? m.waveform : [], bars = '';
      for (var i = 0; i < 40; i++) { var v = wf.length ? +wf[Math.floor(i * wf.length / 40)] || 4 : 6 + ((i * 7) % 13); bars += '<i style="height:' + Math.max(12, Math.min(100, Math.round(v / 31 * 100))) + '%"></i>'; }
      inner = '<div class="cn-vp" data-mid="' + mid + '"><button type="button" class="vb" data-a="vplay" aria-label="' + esc(T('voice')) + '">' + IC.play + '</button><div class="vw" data-a="vseek">' + bars + '</div><span class="vt">' + esc(fmtDur(m.duration)) + '</span><button type="button" class="vs" data-a="vspeed">1×</button></div>';
    } else {
      inner = '<div>' + linkify(m.text || '') + '</div>';
    }
    var reacts = m.reactions && typeof m.reactions === 'object' ? m.reactions : {}, agg = {}, mineR = reacts[uid];
    Object.keys(reacts).forEach(function (k) { var e = reacts[k]; if (typeof e === 'string' && e) agg[e] = (agg[e] || 0) + 1; });
    var keys = Object.keys(agg);
    if (keys.length) rx = '<div class="cn-rxw">' + keys.map(function (e) { return '<button type="button" class="cn-rxc' + (e === mineR ? ' mine' : '') + '" data-rxm="' + mid + '">' + esc(e) + (agg[e] > 1 ? ' ' + agg[e] : '') + '</button>'; }).join('') + '</div>';
    var tick = mine ? '<span class="tkh" data-tkh="1"></span>' : '';
    var time = '<div class="t"><span>' + esc(hhmm(m.createdAt)) + '</span>' + tick + '</div>';
    return '<div class="' + cls + (isMedia ? ' media' : '') + (keys.length ? ' rx' : '') + '" data-mid="' + mid + '">' + quote + story + inner + time + rx + '</div>';
  }
  function tickState(m, chat) {
    if (m._pending) return 'pending';
    var ca = m.createdAt || '', rd = chat.reads && chat.reads[st.peer], dl = chat.delivered && chat.delivered[st.peer];
    if ((rd && rd >= ca) || (st.peerLastAt && st.peerLastAt > ca)) return 'read';
    if (dl && dl >= ca) return 'delivered';
    return 'sent';
  }
  function updateTicks() {
    var body = document.getElementById('cn-body'); if (!body) return;
    var chat = st.chats.get(st.openId) || {}, u = me(); if (!u) return;
    st.msgs.forEach(function (m) {
      if (m.senderId !== u.uid) return;
      var h = body.querySelector('.cn-b[data-mid="' + m.id + '"] .tkh'); if (!h) return;
      var s = tickState(m, chat);
      if (h.__s !== s) { h.__s = s; h.innerHTML = tickHtml(s); }
    });
  }
  function onBodyScroll() {
    var body = document.getElementById('cn-body'), dn = document.getElementById('cn-dn'); if (!body || !dn) return;
    var dist = body.scrollHeight - body.scrollTop - body.clientHeight, far = dist > 260;
    if (body.__init) nearBottom = dist < 140;
    dn.classList.toggle('on', far);
    if (!far) st.unseen = 0;
    var n = document.getElementById('cn-dnn');
    if (n) { n.classList.toggle('on', far && st.unseen > 0); n.textContent = st.unseen > 0 ? String(st.unseen > 99 ? '99+' : st.unseen) : ''; }
  }
  function jumpTo(id) {
    var el = document.querySelector('#cn-body .cn-b[data-mid="' + String(id).replace(/"/g, '') + '"]');
    if (!el) return;
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
    el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl');
    setTimeout(function () { el.classList.remove('hl'); }, 1300);
  }

  /* ----- gestes : appui long = menu, glisser vers la droite = répondre */
  function bindGestures(body) {
    var sw = null;
    body.addEventListener('touchstart', function (e) {
      var b = e.target.closest('.cn-b[data-mid]');
      if (!b || e.touches.length !== 1 || e.target.closest('video,a,.cn-vp .vw,button')) { sw = null; return; }
      sw = { b: b, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, on: false, fired: false };
      sw.t = setTimeout(function () { if (sw && !sw.on) { sw.fired = true; st.suppressClick = Date.now(); try { navigator.vibrate && navigator.vibrate(15); } catch (x) { /* ignore */ } openMsgMenu(sw.b.getAttribute('data-mid')); } }, 480);
    }, { passive: true });
    body.addEventListener('touchmove', function (e) {
      if (!sw) return;
      var dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
      if (Math.abs(dy) > 10 || dx < -10) { clearTimeout(sw.t); if (!sw.on) { return; } }
      if (!sw.on && dx > 14 && Math.abs(dx) > Math.abs(dy) * 1.6) { sw.on = true; clearTimeout(sw.t); }
      if (sw.on) { sw.dx = dx; sw.b.style.transition = 'none'; sw.b.style.transform = 'translateX(' + Math.min(dx, 72) + 'px)'; }
    }, { passive: true });
    function end() {
      if (!sw) return; clearTimeout(sw.t);
      var s = sw; sw = null;
      s.b.style.transition = ''; s.b.style.transform = '';
      if (s.on && s.dx > 56) { st.suppressClick = Date.now(); setReply(s.b.getAttribute('data-mid')); }
    }
    body.addEventListener('touchend', end, { passive: true });
    body.addEventListener('touchcancel', end, { passive: true });
    body.addEventListener('contextmenu', function (e) {
      var b = e.target.closest('.cn-b[data-mid]'); if (!b) return;
      e.preventDefault(); openMsgMenu(b.getAttribute('data-mid'));
    });
  }
  function openMsgMenu(mid) {
    var m = byId(mid), u = me(); if (!m || !u || m._pending) return;
    var old = document.getElementById('cn-mm'); if (old) old.remove();
    var mine = m.senderId === u.uid, cur = m.reactions && m.reactions[u.uid];
    var bg = document.createElement('div'); bg.className = 'cn-sheet-bg cn-m'; bg.id = 'cn-mm';
    var hasText = !!(m.text && String(m.text).trim());
    var html = '<div class="cn-sheet cn-mm"><div class="rx">' + REACTS.map(function (e) { return '<button type="button" data-rx="' + e + '" class="' + (e === cur ? 'on' : '') + '">' + e + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="it" data-mm="reply">' + IC.reply + '<span>' + esc(T('reply')) + '</span></button>' +
      (hasText ? '<button type="button" class="it" data-mm="copy">' + IC.copy + '<span>' + esc(T('copy')) + '</span></button>' : '') +
      (mine ? '<button type="button" class="it bad" data-mm="del">' + IC.trash + '<span>' + esc(T('del')) + '</span></button>' : '') + '</div>';
    bg.innerHTML = html;
    document.body.appendChild(bg);
    bg.addEventListener('click', function (e) {
      var rxb = e.target.closest('[data-rx]'), it = e.target.closest('[data-mm]');
      if (rxb) { bg.remove(); react(mid, rxb.getAttribute('data-rx')); return; }
      if (it) {
        var a = it.getAttribute('data-mm'); bg.remove();
        if (a === 'reply') setReply(mid);
        else if (a === 'copy') copyText(m.text);
        else if (a === 'del') deleteMsg(mid);
        return;
      }
      if (e.target === bg) bg.remove();
    });
  }
  function copyText(t) {
    var s = String(t || '');
    function ok() { toast(T('copied'), 'success'); }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s).then(ok, function () { fallback(); }); return; } } catch (e) { /* repli */ }
    fallback();
    function fallback() { try { var ta = document.createElement('textarea'); ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok(); } catch (e) { /* ignore */ } }
  }
  function react(mid, emoji) {
    var m = byId(mid), u = me(), id = st.openId; if (!m || !u || !id) return;
    var cur = m.reactions && m.reactions[u.uid], o = {};
    try { o['reactions.' + u.uid] = cur === emoji ? firebase.firestore.FieldValue.delete() : emoji; } catch (e) { return; }
    fdb().collection('chats').doc(id).collection('messages').doc(mid).update(o).catch(function () { toast(T('fail'), 'error'); });
  }
  function setReply(mid) {
    var m = byId(mid); if (!m) return;
    st.reply = { id: m.id, senderId: m.senderId, type: m.type, text: String(m.type === 'file' ? (m.fileName || '') : (m.text || '')).slice(0, 100) };
    if (m.type === 'call') st.reply = null;
    drawReplyBar();
    var inp = document.getElementById('cn-in'); if (inp) inp.focus();
  }
  function drawReplyBar() {
    var rp = document.getElementById('cn-rp'); if (!rp) return;
    if (!st.reply) { rp.classList.add('hidden'); rp.innerHTML = ''; return; }
    var u = me(), who = st.reply.senderId === (u && u.uid) ? T('you') : prof(st.reply.senderId).name;
    rp.classList.remove('hidden');
    rp.innerHTML = '<div class="bx"><b>' + esc(T('replying', { n: who })) + '</b><span>' + esc(msgLabel(st.reply)) + '</span></div><button type="button" class="cn-ib ghost" data-a="reply-close" aria-label="' + esc(T('cancel')) + '">' + IC.x + '</button>';
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
    if (r && r >= (c.lastAt || '') && !(c.unread && c.unread[u.uid])) return;
    var stamp = iso(); if (c.lastAt && c.lastAt > stamp) stamp = c.lastAt; // même horloge que l'expéditeur : le « lu » ne peut pas arriver « avant » le message
    var ref = fdb().collection('chats').doc(id), o = {};
    o['reads.' + u.uid] = stamp;
    if (isLegacy()) { ref.update(o).catch(function () { /* pas bloquant */ }); return; }
    o['delivered.' + u.uid] = stamp; o['unread.' + u.uid] = 0;
    ref.update(o).catch(function (e) {
      if (e && e.code === 'permission-denied') {
        var o2 = {}; o2['reads.' + u.uid] = stamp;
        ref.update(o2).then(function () { st.legacy = true; st.legacyAt = Date.now(); }).catch(function () { /* pas bloquant */ });
      }
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { if (st.openId) scheduleRead(); queueAck(); } });

  /* ----- envoi */
  function sendTyping() {
    if (isLegacy() || st.noTyping || !st.chatExists || !st.openId) return;
    var inp = document.getElementById('cn-in'); if (!inp || !inp.value) return;
    var now = Date.now(); if (now - st.lastTypingSent < 2500) return; st.lastTypingSent = now;
    var u = me(); if (!u) return;
    var o = {}; o['typing.' + u.uid] = iso();
    fdb().collection('chats').doc(st.openId).update(o).catch(function (e) { if (e && e.code === 'permission-denied') st.noTyping = true; });
  }
  function previewText(o) {
    if (o.type === 'file') return String(o.fileName || '').slice(0, 120);
    if (o.type === 'audio' || o.type === 'call') return '';
    return String(o.text || '').slice(0, 120);
  }
  async function writeMessage(opts, legacy) {
    // opts : { chatId, peer, type, text, mediaUrl, fileName, fileSize, mime, duration, waveform, replyTo, call, noPush, story: {id, mediaUrl, mediaType} }
    var u = me(), d = fdb(); if (!u || !d) throw new Error('login');
    var now = iso(), chatRef = d.collection('chats').doc(opts.chatId), msgRef = chatRef.collection('messages').doc();
    var members = [u.uid, opts.peer].sort();
    var msg = { senderId: u.uid, receiverId: opts.peer, type: opts.type, createdAt: now };
    if (opts.text) msg.text = String(opts.text).slice(0, 2000);
    if (opts.mediaUrl) msg.mediaUrl = opts.mediaUrl;
    if (opts.story) msg.storyRef = { storyId: String(opts.story.id), ownerUid: opts.peer, mediaUrl: opts.story.mediaUrl || '', mediaType: opts.story.mediaType === 'video' ? 'video' : 'image' };
    if (!legacy) {
      if (opts.fileName) msg.fileName = String(opts.fileName).slice(0, 120);
      if (opts.fileSize) msg.fileSize = Math.round(opts.fileSize);
      if (opts.mime) msg.mime = String(opts.mime).slice(0, 100);
      if (opts.duration != null) msg.duration = Math.round(opts.duration);
      if (opts.waveform) msg.waveform = opts.waveform;
      if (opts.replyTo) msg.replyTo = opts.replyTo;
      if (opts.call) msg.call = opts.call;
    }
    var last = { senderId: u.uid, type: opts.type, text: previewText(opts), at: now };
    if (opts.story) last.story = true;
    if (!legacy) {
      if (opts.type === 'audio' && opts.duration != null) last.dur = Math.round(opts.duration);
      if (opts.type === 'call' && opts.call) { last.call = opts.call.status; last.kind = opts.call.kind; last.dur = opts.call.duration || 0; }
    }
    var chatData = { members: members, lastMessage: last, lastAt: now, reads: {} };
    chatData.reads[u.uid] = now;
    if (!legacy) {
      chatData.unread = {};
      chatData.unread[opts.peer] = firebase.firestore.FieldValue.increment(1);
      chatData.unread[u.uid] = 0;
    }
    var batch = d.batch();
    batch.set(chatRef, chatData, { merge: true });
    batch.set(msgRef, msg);
    if (opts.story) {
      batch.set(d.collection('story_replies').doc(), { storyId: String(opts.story.id), ownerUid: opts.peer, senderId: u.uid, text: String(opts.text || '').slice(0, 500), createdAt: now, chatId: opts.chatId });
    }
    await batch.commit();
    if (!opts.noPush) pushFor(opts.chatId, msgRef.id);
    return msgRef.id;
  }
  async function sendMsg(opts) {
    try { return await writeMessage(opts, isLegacy()); }
    catch (e) {
      // Règles Firestore pas encore mises à jour : on renvoie une version « ancien format » (texte / photo / vidéo seulement).
      if (e && e.code === 'permission-denied' && !isLegacy() && /^(text|image|video)$/.test(opts.type) && !opts.replyTo) {
        var id = await writeMessage(opts, true);
        st.legacy = true; st.legacyAt = Date.now();
        return id;
      }
      throw e;
    }
  }
  var lastPush = 0;
  function pushFor(chatId, messageId) {
    // Le serveur lit le message lui-même (texte, expéditeur) : rien ne peut être falsifié depuis le téléphone.
    try {
      var now = Date.now(); if (now - lastPush < 1200) return; lastPush = now;
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
  function sendMode() {
    var inp = document.getElementById('cn-in');
    return ((inp && inp.value.trim()) || st.file) ? 'send' : 'mic';
  }
  function updateSendMode() {
    var b = document.getElementById('cn-sd'); if (!b) return;
    var mode = sendMode();
    if (b.__mode === mode) return; b.__mode = mode;
    b.classList.toggle('mic', mode === 'mic');
    b.innerHTML = mode === 'mic' ? IC.mic : IC.send;
    b.setAttribute('aria-label', mode === 'mic' ? T('voice') : T('send'));
  }
  async function sendFromComposer() {
    var u = me(); if (!u || !st.openId || st.uploading || st.rec) return;
    var inp = document.getElementById('cn-in'), sd = document.getElementById('cn-sd');
    var text = (inp.value || '').replace(/\n{3,}/g, '\n\n').trim();
    if (!text && !st.file) return;
    var id = st.openId, peer = st.peer, reply = st.reply;
    if (isBlocked(peer)) { toast(T('blocked'), 'error'); return; }
    sd.disabled = true; closeEmoji(); closeAttach();
    try {
      if (st.file) {
        var f = st.file, kind = st.fileKind || 'file';
        st.uploading = true; setProgress(0);
        var send = f;
        if (kind === 'image') send = await shrinkImage(f);
        var up = await uploadFileToStorage(send, 'chat', { maxSizeMB: kind === 'video' ? 50 : 10, onProgress: setProgress });
        var o = { chatId: id, peer: peer, type: kind, text: text, mediaUrl: up.url, replyTo: reply || undefined };
        if (kind === 'file') { o.fileName = f.name || 'fichier'; o.fileSize = send.size; o.mime = (f.type || '').slice(0, 100); }
        await sendMsg(o);
        st.file = null; st.fileKind = ''; st.uploading = false; drawPreview();
      } else {
        await sendMsg({ chatId: id, peer: peer, type: 'text', text: text, replyTo: reply || undefined });
      }
      inp.value = ''; inp.style.height = 'auto';
      st.reply = null; drawReplyBar(); updateSendMode();
      if (!st.chatExists) { st.chatExists = true; subscribeMessages(); }
    } catch (e) {
      st.uploading = false; drawPreview();
      var msg = e && e.message || '';
      toast(/Fichier trop|trop volumineux|too large|File size|maximum/i.test(msg) ? T(st.fileKind === 'video' ? 'big_vid' : (st.fileKind === 'image' ? 'big_img' : 'big_doc')) : explainSendError(e), 'error');
    } finally { sd.disabled = false; if (inp) inp.focus(); }
  }
  function onFilePicked(e, from) {
    var f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    var kind;
    if (from === 'doc') kind = 'file';
    else if (/^image\//.test(f.type)) kind = 'image';
    else if (/^video\//.test(f.type)) kind = 'video';
    else kind = 'file';
    if (from !== 'doc' && kind === 'file') { toast(T('bad_type'), 'error'); return; }
    if (BAD_EXT.test(f.name || '')) { toast(T('bad_type'), 'error'); return; }
    if (kind === 'image' && f.size > 25 * 1024 * 1024) { toast(T('big_img'), 'error'); return; }
    if (kind === 'video' && f.size > 50 * 1024 * 1024) { toast(T('big_vid'), 'error'); return; }
    if (kind === 'file' && f.size > 10 * 1024 * 1024) { toast(T('big_doc'), 'error'); return; }
    st.file = f; st.fileKind = kind; drawPreview(); updateSendMode();
  }
  function drawPreview() {
    var pv = document.getElementById('cn-pv'); if (!pv) return;
    if (!st.file) { pv.classList.add('hidden'); pv.innerHTML = ''; return; }
    var kind = st.fileKind, lead;
    if (kind === 'video') lead = '<video src="' + URL.createObjectURL(st.file) + '" muted playsinline></video>';
    else if (kind === 'image') lead = '<img alt="" src="' + URL.createObjectURL(st.file) + '">';
    else { var ext = fileExt(st.file.name); lead = '<span class="fi" style="background:' + (EXT_COLOR[ext] || '#5d6779') + '">' + esc((ext || 'FILE').slice(0, 4).toUpperCase()) + '</span>'; }
    pv.classList.remove('hidden');
    pv.innerHTML = lead + '<div class="pg"><div id="cn-pt">' + esc((st.file.name || '') + (kind === 'file' ? ' · ' + fmtSize(st.file.size) : '')) + '</div><div class="bar"><i id="cn-pb"></i></div></div><button type="button" class="cn-ib ghost" data-a="cancelfile" aria-label="' + esc(T('cancel')) + '">' + IC.x + '</button>';
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

  /* ----- messages vocaux : enregistrement */
  function pickMime() {
    var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    try { for (var i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported(c[i])) return c[i]; } catch (e) { /* ignore */ }
    return '';
  }
  async function startRec() {
    if (st.rec || st.uploading || !st.openId) return;
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia || typeof MediaRecorder === 'undefined') { toast(T('rec_unsupported'), 'error'); return; }
    var stream;
    try { stream = await md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { toast(T('rec_denied'), 'error'); return; }
    if (!st.openId) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
    var mime = pickMime(), mr;
    try { mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 40000 }) : new MediaRecorder(stream); }
    catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); toast(T('rec_unsupported'), 'error'); return; }
    var rec = { stream: stream, mr: mr, chunks: [], levels: [], t0: Date.now(), mime: mr.mimeType || mime || 'audio/webm', timer: null, ac: null, an: null, buf: null, send: false };
    mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) rec.chunks.push(ev.data); };
    mr.onstop = function () { finishRec(rec); };
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { rec.ac = new AC(); var src = rec.ac.createMediaStreamSource(stream); rec.an = rec.ac.createAnalyser(); rec.an.fftSize = 256; src.connect(rec.an); rec.buf = new Uint8Array(rec.an.fftSize); }
    } catch (e) { rec.an = null; }
    try { mr.start(250); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); toast(T('rec_unsupported'), 'error'); return; }
    st.rec = rec;
    var f = document.getElementById('cn-f'); if (f) f.classList.add('rec');
    rec.timer = setInterval(function () { tickRec(rec); }, 100);
    tickRec(rec);
  }
  function tickRec(rec) {
    var el = (Date.now() - rec.t0) / 1000, lv = 0.04;
    if (rec.an) { try { rec.an.getByteTimeDomainData(rec.buf); var s = 0; for (var i = 0; i < rec.buf.length; i++) { var v = (rec.buf[i] - 128) / 128; s += v * v; } lv = Math.min(1, Math.sqrt(s / rec.buf.length) * 3.2); } catch (e) { /* ignore */ } }
    else lv = 0.15 + Math.random() * 0.4;
    rec.levels.push(lv);
    var rt = document.getElementById('cn-rt'); if (rt) rt.textContent = fmtDur(el);
    var box = document.getElementById('cn-lv');
    if (box) {
      var n = Math.max(10, Math.floor(box.clientWidth / 5)) || 24;
      if (box.children.length !== n) { var h = ''; for (var k = 0; k < n; k++) h += '<i></i>'; box.innerHTML = h; }
      var lastN = rec.levels.slice(-n);
      for (var j = 0; j < n; j++) { var val = lastN[lastN.length - n + j]; box.children[j].style.height = (val == null ? 3 : Math.max(3, Math.round(val * 28))) + 'px'; }
    }
    if (el >= 300) stopRec(true);
  }
  function stopRec(send) {
    var r = st.rec; if (!r) return;
    r.send = !!send; clearInterval(r.timer);
    try { if (r.mr.state !== 'inactive') r.mr.stop(); else finishRec(r); } catch (e) { finishRec(r); }
  }
  async function finishRec(r) {
    if (r.done) return; r.done = true;
    try { r.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ }
    try { if (r.ac) r.ac.close(); } catch (e) { /* ignore */ }
    if (st.rec === r) st.rec = null;
    var f = document.getElementById('cn-f'); if (f) f.classList.remove('rec');
    if (!r.send || !st.openId) return;
    var dur = (Date.now() - r.t0) / 1000;
    if (dur < 1) { toast(T('rec_short')); return; }
    var type = (r.mime || 'audio/webm').split(';')[0];
    var blob = new Blob(r.chunks, { type: type });
    var ext = /mp4|aac/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm';
    var file = new File([blob], 'voice-' + Date.now() + '.' + ext, { type: type });
    await sendVoice(file, dur, waveOf(r.levels));
  }
  function waveOf(levels) {
    var N = 40, out = [], n = levels.length || 1;
    for (var i = 0; i < N; i++) { var a = Math.floor(i * n / N), b = Math.max(a + 1, Math.floor((i + 1) * n / N)), mx = 0; for (var j = a; j < b && j < n; j++) mx = Math.max(mx, levels[j] || 0); out.push(mx); }
    var peak = Math.max.apply(null, out) || 1;
    return out.map(function (v) { return Math.max(2, Math.min(31, Math.round(v / peak * 31))); });
  }
  async function sendVoice(file, dur, wave) {
    var id = st.openId, peer = st.peer, reply = st.reply; if (!id) return;
    if (isBlocked(peer)) { toast(T('blocked'), 'error'); return; }
    var pv = document.getElementById('cn-pv');
    if (pv) { pv.classList.remove('hidden'); pv.innerHTML = '<span class="fi" style="background:#f39c1f">' + IC.mic + '</span><div class="pg"><div id="cn-pt">' + esc(T('uploading', { p: 0 })) + '</div><div class="bar"><i id="cn-pb"></i></div></div>'; }
    st.uploading = true;
    try {
      var up = await uploadFileToStorage(file, 'chat', { maxSizeMB: 10, onProgress: setProgress });
      await sendMsg({ chatId: id, peer: peer, type: 'audio', mediaUrl: up.url, duration: dur, waveform: wave, mime: file.type, replyTo: reply || undefined });
      st.reply = null; drawReplyBar();
      if (!st.chatExists && st.openId === id) { st.chatExists = true; subscribeMessages(); }
    } catch (e) { toast(explainSendError(e), 'error'); }
    finally { st.uploading = false; drawPreview(); }
  }

  /* ----- messages vocaux : lecture (un seul à la fois ; la lecture survit aux mises à jour de l'écran) */
  var player = { id: null, audio: null, tried: false };
  function vpEl(mid) { return document.querySelector('#cn-body .cn-vp[data-mid="' + String(mid).replace(/"/g, '') + '"]'); }
  function paintVp(mid) {
    var el = vpEl(mid); if (!el) return;
    var m = byId(mid), dur = (m && m.duration) || 0, cur = player.id === mid && player.audio;
    var playing = !!(cur && !cur.paused), t = cur ? cur.currentTime : 0;
    if (cur && (!dur || !isFinite(dur)) && isFinite(cur.duration)) dur = cur.duration;
    var frac = cur && dur ? Math.min(1, t / dur) : 0;
    var bars = el.querySelectorAll('.vw i'), n = bars.length;
    for (var i = 0; i < n; i++) { var on = i < Math.round(frac * n); if (bars[i].__on !== on) { bars[i].__on = on; bars[i].classList.toggle('on', on); } }
    var b = el.querySelector('.vb'); if (b && b.__p !== playing) { b.__p = playing; b.innerHTML = playing ? IC.pause : IC.play; }
    el.classList.toggle('pl', !!cur);
    var tx = el.querySelector('.vt'); if (tx) tx.textContent = fmtDur(cur && t > 0 ? t : dur);
    var sp = el.querySelector('.vs'); if (sp) sp.textContent = (st.rate === 1 ? '1' : String(st.rate)) + '×';
  }
  function stopPlayer() {
    var old = player.id;
    if (player.audio) { try { player.audio.pause(); player.audio.src = ''; } catch (e) { /* ignore */ } }
    player = { id: null, audio: null, tried: false };
    if (old) paintVp(old);
  }
  function togglePlay(mid) {
    if (player.id === mid && player.audio) { if (player.audio.paused) player.audio.play().catch(function () { /* ignore */ }); else player.audio.pause(); paintVp(mid); return; }
    var m = byId(mid); if (!m) return;
    var src = safeMedia(m.mediaUrl); if (!src) return;
    stopPlayer();
    var a = new Audio(); a.preload = 'auto'; a.src = src; a.playbackRate = st.rate;
    player = { id: mid, audio: a, tried: false };
    a.addEventListener('timeupdate', function () { paintVp(mid); });
    a.addEventListener('play', function () { paintVp(mid); });
    a.addEventListener('pause', function () { paintVp(mid); });
    a.addEventListener('ended', function () { stopPlayer(); });
    a.addEventListener('error', function () {
      if (player.audio !== a) return;
      // Certains téléphones ne lisent pas le format d'enregistrement de l'autre : on demande la version MP3 à Cloudinary.
      if (!player.tried && /\.(webm|ogg|m4a|mp4|wav)(\?.*)?$/i.test(src)) { player.tried = true; a.src = src.replace(/\.\w+(\?.*)?$/, '.mp3'); a.play().catch(function () { /* ignore */ }); return; }
      stopPlayer(); toast(T('play_fail'), 'error');
    });
    var p = a.play(); if (p && p.catch) p.catch(function () { if (player.audio === a && a.error == null) { stopPlayer(); toast(T('play_fail'), 'error'); } });
    paintVp(mid);
  }
  function cycleSpeed(mid) {
    st.rate = st.rate === 1 ? 1.5 : st.rate === 1.5 ? 2 : 1;
    if (player.audio) player.audio.playbackRate = st.rate;
    paintVp(mid);
  }
  function seekVoice(bar, ev) {
    var vp = bar.closest('.cn-vp'), mid = vp && vp.getAttribute('data-mid'); if (!mid) return;
    if (player.id !== mid || !player.audio) { togglePlay(mid); return; }
    var m = byId(mid), dur = (m && m.duration) || player.audio.duration || 0; if (!dur || !isFinite(dur)) return;
    var r = bar.getBoundingClientRect(), x = (ev.clientX || 0) - r.left;
    player.audio.currentTime = Math.max(0, Math.min(dur, dur * x / Math.max(1, r.width)));
    paintVp(mid);
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
        await sendMsg({ chatId: pair(u.uid, s.uid), peer: s.uid, type: 'text', text: text, story: { id: s.id, mediaUrl: media, mediaType: s.mediaType } });
        bg.remove(); toast(T('reply_sent'), 'success'); resume();
      } catch (e) { go.disabled = false; toast(explainSendError(e), 'error'); }
    });
  }
  window.replyToCurrentStory = replyToStory;

  /* ---------------------------------------------------------------- reprise après actualisation de l'écran */
  var RESUME_KEY = 'cn_resume';
  function saveResume() {
    try {
      if (typeof window.cnSaveResume === 'function') { window.cnSaveResume(); return; }
      var o = {}; try { o = JSON.parse(sessionStorage.getItem(RESUME_KEY) || '{}') || {}; } catch (e) { o = {}; }
      o.chat = st.peer && chatEl() ? st.peer : '';
      o.t = Date.now();
      sessionStorage.setItem(RESUME_KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  }
  function getResume() { return { peer: st.peer && chatEl() ? st.peer : '' }; }

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
  // Journal d'appel dans la conversation (écrit par calls-pro.js, une seule fois par appel, côté appelant).
  async function writeCallLog(peer, info) {
    var u = me(); if (!u || !peer) return;
    var call = { kind: info && info.kind === 'video' ? 'video' : 'audio', status: String(info && info.status || 'ended'), duration: Math.max(0, Math.round(info && info.duration || 0)) };
    try { await sendMsg({ chatId: pair(u.uid, peer), peer: peer, type: 'call', call: call, noPush: true }); } catch (e) { /* le journal est un plus */ }
  }
  window.CNMessages = {
    T: T, showList: showList, openChat: openChat, openChatById: openChatById, closeChat: closeChat, replyToStory: replyToStory,
    unreadCount: unreadCount, writeCallLog: writeCallLog, getResume: getResume, prof: prof, loadProfiles: loadProfiles, ensureCalls: ensureCalls,
    isChatOpen: function () { return !!chatEl(); }, _state: st, _pair: pair,
    closeStoryReply: function () { var b = document.getElementById('cn-story-reply'); if (b && b.__close) b.__close(); else if (b) b.remove(); }
  };
  window.openChatWith = function (uid, name) { openChat(uid, name || null); };

  function boot() {
    try {
      if (typeof auth !== 'undefined' && auth && typeof auth.onAuthStateChanged === 'function') {
        auth.onAuthStateChanged(function (user) {
          if (!user) { closeChat(true); stopList(); return; }
          var tries = 0;
          (function wait() {
            if (me() && me().uid === user.uid) { startList(); if (listVisible()) renderList(); setTimeout(ensureCalls, 1200); return; }
            if (++tries < 40) setTimeout(wait, 500);
          })();
        });
      }
    } catch (e) { /* ignore */ }
    if (me()) { startList(); setTimeout(ensureCalls, 1200); }
    if (listVisible()) renderList();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
