/* Coeurnoh Universe — Appels audio et vidéo entre deux personnes (WebRTC, signalisation par Firestore).
   - L'appelant crée calls/{id} (offre) et dépose call_inbox/{destinataire} ; le destinataire voit l'appel arriver en direct,
     son téléphone sonne (et une notification push « call-push » le prévient si l'appli est fermée).
   - Le son et l'image passent directement de téléphone à téléphone (chiffrés). Serveurs STUN Google + relais TURN de secours ;
     pour des appels fiables sur toutes les connexions mobiles, un relais TURN personnel se règle dans app_config/webrtc.
   - Le journal d'appel (« Appel vocal · 2:31 », « Appel manqué »…) est ajouté à la conversation par l'appelant (messaging-pro.js).
   Fichier séparé, chargé par messaging-pro.js : s'il échoue, le reste de l'application n'est pas touché. */
(function () {
  'use strict';
  if (window.CNCalls) return;

  var LANGS = ['fr', 'en', 'es', 'it', 'pt'];
  var D = {
    calling: ['Appel…', 'Calling…', 'Llamando…', 'Chiamata…', 'A chamar…'],
    ringing: ['Sonnerie…', 'Ringing…', 'Sonando…', 'Squilla…', 'A tocar…'],
    connecting: ['Connexion…', 'Connecting…', 'Conectando…', 'Connessione…', 'A ligar…'],
    reconnecting: ['Reconnexion…', 'Reconnecting…', 'Reconectando…', 'Riconnessione…', 'A religar…'],
    in_voice: ['Appel vocal entrant', 'Incoming voice call', 'Llamada de voz entrante', 'Chiamata vocale in arrivo', 'Chamada de voz a receber'],
    in_video: ['Appel vidéo entrant', 'Incoming video call', 'Videollamada entrante', 'Videochiamata in arrivo', 'Videochamada a receber'],
    accept: ['Répondre', 'Answer', 'Responder', 'Rispondi', 'Atender'],
    decline: ['Refuser', 'Decline', 'Rechazar', 'Rifiuta', 'Recusar'],
    hangup: ['Raccrocher', 'Hang up', 'Colgar', 'Riaggancia', 'Desligar'],
    mute: ['Micro', 'Mute', 'Silenciar', 'Muto', 'Silenciar'],
    cam: ['Caméra', 'Camera', 'Cámara', 'Fotocamera', 'Câmara'],
    flip: ['Retourner', 'Flip', 'Girar', 'Inverti', 'Virar'],
    ended: ['Appel terminé', 'Call ended', 'Llamada finalizada', 'Chiamata terminata', 'Chamada terminada'],
    missed_toast: ['Appel manqué de {n}', 'Missed call from {n}', 'Llamada perdida de {n}', 'Chiamata persa da {n}', 'Chamada perdida de {n}'],
    busy_t: ['{n} est déjà en communication.', '{n} is already on a call.', '{n} ya está en una llamada.', '{n} è già in chiamata.', '{n} já está numa chamada.'],
    declined_t: ['{n} a refusé l’appel.', '{n} declined the call.', '{n} rechazó la llamada.', '{n} ha rifiutato la chiamata.', '{n} recusou a chamada.'],
    noanswer_t: ['{n} ne répond pas.', '{n} didn’t answer.', '{n} no responde.', '{n} non risponde.', '{n} não atende.'],
    failed: ['La connexion a échoué. Réessaie dans un instant.', 'The connection failed. Try again in a moment.', 'La conexión falló. Inténtalo de nuevo en un momento.', 'Connessione non riuscita. Riprova tra poco.', 'A ligação falhou. Tenta daqui a pouco.'],
    unsupported: ['Les appels ne sont pas pris en charge sur cet appareil.', 'Calls are not supported on this device.', 'Las llamadas no son compatibles con este dispositivo.', 'Le chiamate non sono supportate su questo dispositivo.', 'As chamadas não são suportadas neste dispositivo.'],
    mic_denied: ['Autorise le micro (et la caméra pour la vidéo) pour appeler.', 'Allow the microphone (and camera for video) to call.', 'Permite el micrófono (y la cámara para vídeo) para llamar.', 'Consenti il microfono (e la fotocamera per il video) per chiamare.', 'Permite o microfone (e a câmara para vídeo) para chamar.'],
    in_call: ['Tu es déjà en appel.', 'You are already on a call.', 'Ya estás en una llamada.', 'Sei già in chiamata.', 'Já estás numa chamada.'],
    blocked: ['Tu ne peux pas appeler ce compte.', 'You can’t call this account.', 'No puedes llamar a esta cuenta.', 'Non puoi chiamare questo account.', 'Não podes chamar esta conta.'],
    denied: ['Appel impossible pour le moment (compte bloqué ou appels en cours d’activation).', 'Can’t call right now (blocked account or calls being activated).', 'No se puede llamar ahora (cuenta bloqueada o llamadas en activación).', 'Impossibile chiamare ora (account bloccato o chiamate in attivazione).', 'Não é possível chamar agora (conta bloqueada ou chamadas em ativação).'],
    login: ['Connecte-toi pour appeler.', 'Log in to call.', 'Inicia sesión para llamar.', 'Accedi per chiamare.', 'Inicia sessão para chamar.'],
    someone: ['Utilisateur', 'User', 'Usuario', 'Utente', 'Utilizador'],
    video_call: ['Appel vidéo', 'Video call', 'Videollamada', 'Videochiamata', 'Videochamada'],
    voice_call: ['Appel vocal', 'Voice call', 'Llamada de voz', 'Chiamata vocale', 'Chamada de voz']
  };
  function lang() {
    try { var l = String((typeof currentLang !== 'undefined' && currentLang) || document.documentElement.lang || 'fr').slice(0, 2).toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : 'fr'; } catch (e) { return 'fr'; }
  }
  function T(k, a) {
    var row = D[k], s = row ? (row[LANGS.indexOf(lang())] || row[0]) : k;
    if (a) Object.keys(a).forEach(function (x) { s = s.split('{' + x + '}').join(a[x]); });
    return s;
  }

  /* ---------------------------------------------------------------- petits outils */
  var RING_MS = 45000, INCOMING_MAX_AGE = 60000;
  var DEFAULT_ICE = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }
  ];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) ? currentUser : null; } catch (e) { return null; } }
  function fdb() { try { return (typeof db !== 'undefined') ? db : null; } catch (e) { return null; } }
  function toast(m, ty) { try { showToast(m, ty || 'info'); } catch (e) { /* ignore */ } }
  function iso() { return new Date().toISOString(); }
  function isBlocked(peer) { try { return typeof blockedSet !== 'undefined' && blockedSet.has(peer); } catch (e) { return false; } }
  function svg(p, s, sw) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>', 28),
    mic: svg('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>', 26),
    micoff: svg('<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V4a3 3 0 0 0-5.9-.8"/><path d="M19 10v2a7 7 0 0 1-.9 3.4M5 10v2a7 7 0 0 0 11.5 5.4"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>', 26),
    vcam: svg('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>', 26),
    vcamoff: svg('<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.7 0H14a2 2 0 0 1 2 2v3.3l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/>', 26),
    flip: svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>', 26)
  };
  function initial(n) { return esc(String(n || '?').trim().charAt(0).toUpperCase() || '?'); }
  function avatarHtml(name, photo) {
    if (typeof photo === 'string' && /^https:\/\//.test(photo) && photo.length < 600) return '<img alt="" src="' + esc(photo) + '">';
    return '<span>' + initial(name) + '</span>';
  }
  function fmt(s) { s = Math.max(0, Math.round(s || 0)); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (r < 10 ? '0' : '') + r; }

  /* ---------------------------------------------------------------- styles */
  var STYLES = [
    '.cn-call-ov{position:fixed;inset:0;z-index:6000;display:flex;flex-direction:column;align-items:center;justify-content:space-between;color:#fff;background:linear-gradient(165deg,#0d182d,#1b2f55 55%,#2b4a7c);overflow:hidden;font-family:inherit}',
    '.cn-call-ov video.rv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;display:none}',
    '.cn-call-ov.vid.live video.rv{display:block}',
    '.cn-call-ov .cc-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.45),transparent 28%,transparent 62%,rgba(0,0,0,.6));display:none;pointer-events:none}',
    '.cn-call-ov.vid.live .cc-shade{display:block}',
    '.cn-call-ov .cc-who{position:relative;z-index:2;margin-top:calc(9vh + env(safe-area-inset-top,0px));display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:0 24px}',
    '.cn-call-ov .cc-av{position:relative;width:132px;height:132px;border-radius:50%;background:#3f5a89;display:flex;align-items:center;justify-content:center;font-size:3.4rem;font-weight:800;overflow:visible}',
    '.cn-call-ov .cc-av img{width:100%;height:100%;border-radius:50%;object-fit:cover}',
    '.cn-call-ov .cc-av:before,.cn-call-ov .cc-av:after{content:"";position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(255,255,255,.35);animation:cnRing 2.2s ease-out infinite;opacity:0}',
    '.cn-call-ov .cc-av:after{animation-delay:1.1s}',
    '@keyframes cnRing{0%{transform:scale(.9);opacity:.7}100%{transform:scale(1.5);opacity:0}}',
    '.cn-call-ov.live .cc-av:before,.cn-call-ov.live .cc-av:after{animation:none;display:none}',
    '.cn-call-ov .cc-nm{font-size:1.6rem;font-weight:800;letter-spacing:-.01em;text-shadow:0 2px 12px rgba(0,0,0,.4)}',
    '.cn-call-ov .cc-sub{font-size:1rem;opacity:.85;font-variant-numeric:tabular-nums}',
    '.cn-call-ov .cc-kd{font-size:.8rem;opacity:.7;letter-spacing:.06em;text-transform:uppercase}',
    '.cn-call-ov.vid.live .cc-who{margin-top:calc(14px + env(safe-area-inset-top,0px));align-self:flex-start;flex-direction:row;gap:10px;text-align:left;padding:0 16px}',
    '.cn-call-ov.vid.live .cc-av{width:44px;height:44px;font-size:1.2rem}',
    '.cn-call-ov.vid.live .cc-nm{font-size:1.05rem}',
    '.cn-call-ov.vid.live .cc-kd{display:none}',
    '.cn-call-ov.vid.live .cc-who .cc-tx{display:flex;flex-direction:column;align-items:flex-start}',
    '.cn-call-ov video.lv{position:absolute;z-index:3;right:14px;top:calc(14px + env(safe-area-inset-top,0px));width:96px;height:132px;border-radius:16px;object-fit:cover;background:#111;box-shadow:0 6px 20px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.4);display:none;transform:scaleX(-1)}',
    '.cn-call-ov.vid video.lv{display:block}',
    '.cn-call-ov video.lv.back{transform:none}',
    '.cn-call-ov .cc-bar{position:relative;z-index:3;display:flex;align-items:flex-start;justify-content:center;gap:22px;padding:0 20px calc(34px + env(safe-area-inset-bottom,0px));width:100%;box-sizing:border-box}',
    '.cn-call-ov .cc-cb{display:flex;flex-direction:column;align-items:center;gap:8px;border:0;background:transparent;color:#fff;font:inherit;font-size:.74rem;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.cn-call-ov .cc-cb i{width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-style:normal;transition:transform .12s,background .2s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
    '.cn-call-ov .cc-cb:active i{transform:scale(.92)}',
    '.cn-call-ov .cc-cb.on i{background:#fff;color:#1b2f55}',
    '.cn-call-ov .cc-cb.red i{background:#e5484d;width:70px;height:70px}',
    '.cn-call-ov .cc-cb.red i svg{transform:rotate(135deg)}',
    '.cn-call-ov .cc-cb.green i{background:#22c55e;width:70px;height:70px;animation:cnShake 1.2s ease-in-out infinite}',
    '@keyframes cnShake{0%,100%{transform:rotate(0)}10%,30%,50%{transform:rotate(-12deg)}20%,40%,60%{transform:rotate(12deg)}70%{transform:rotate(0)}}',
    '.cn-call-ov .cc-cb.hide{display:none}',
    '.cn-call-ov.inc .cc-bar{gap:76px}',
    '.cn-call-ov.out{opacity:0;transition:opacity .35s}'
  ].join('');
  (function () { var el = document.createElement('style'); el.setAttribute('data-cn-call', '1'); el.textContent = STYLES; document.head.appendChild(el); })();

  /* ---------------------------------------------------------------- sonneries (générées, aucun fichier audio) */
  var ac = null, tone = null;
  function audioCtx() {
    try {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
      if (ac && ac.state === 'suspended') ac.resume();
    } catch (e) { /* ignore */ }
    return ac;
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { audioCtx(); }, { once: true, passive: true, capture: true }); });
  function stopTone() {
    if (tone) { clearInterval(tone.t); tone = null; }
    try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) { /* ignore */ }
  }
  function startTone(kind) {
    stopTone();
    var c = audioCtx(), incoming = kind === 'in';
    function burst() {
      if (!c || c.state !== 'running') return;
      try {
        var g = c.createGain(); g.connect(c.destination);
        var vol = incoming ? 0.2 : 0.07, t = c.currentTime, dur = 1.0;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.setValueAtTime(vol, t + dur - 0.08); g.gain.linearRampToValueAtTime(0, t + dur);
        (incoming ? [440, 480] : [425]).forEach(function (f) { var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + 0.02); });
      } catch (e) { /* ignore */ }
    }
    burst();
    tone = { t: setInterval(burst, incoming ? 3000 : 4000) };
    if (incoming) { try { if (navigator.vibrate) navigator.vibrate([700, 500, 700, 500, 700, 500, 700, 500, 700, 500, 700, 500, 700, 500, 700]); } catch (e) { /* ignore */ } }
  }

  /* ---------------------------------------------------------------- état */
  var cs = { call: null, inboxUnsub: null, inboxUid: null, handled: {}, ice: null, iceAt: 0 };
  function newCall(o) {
    return { id: o.id || '', peer: o.peer, name: o.name || '', photo: o.photo || null, kind: o.kind === 'video' ? 'video' : 'audio', role: o.role, state: 'calling',
      pc: null, local: null, remote: null, unsubDoc: null, unsubCands: null, docReady: false, outQ: [], inQ: [], seen: {}, gotAnswer: false,
      connectedAt: 0, timer: null, ringTimer: null, rcT: null, muted: false, camOff: false, facing: 'user', finished: false, logged: false, lock: null, offer: null };
  }
  async function iceServers() {
    if (cs.ice && Date.now() - cs.iceAt < 10 * 60000) return cs.ice;
    var list = DEFAULT_ICE;
    try {
      var d = fdb(), s = d && await d.collection('app_config').doc('webrtc').get();
      var v = s && s.exists ? s.data() : null;
      if (v && Array.isArray(v.iceServers) && v.iceServers.length && v.iceServers.length < 12) list = v.iceServers;
    } catch (e) { /* valeurs par défaut */ }
    cs.ice = list; cs.iceAt = Date.now();
    return list;
  }
  function peerInfo(uid) {
    try { if (window.CNMessages && window.CNMessages.prof) { var p = window.CNMessages.prof(uid); return { name: p.name, photo: p.photo }; } } catch (e) { /* ignore */ }
    return { name: T('someone'), photo: null };
  }

  /* ---------------------------------------------------------------- écran d'appel */
  function el(id) { return document.getElementById(id); }
  function buildUI(call) {
    removeUI(true);
    var ov = document.createElement('div');
    ov.className = 'cn-call-ov' + (call.kind === 'video' ? ' vid' : ''); ov.id = 'cn-call-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    var incoming = call.state === 'incoming';
    var head = '<video class="rv" id="cn-c-rv" autoplay playsinline></video><div class="cc-shade"></div>' +
      '<div class="cc-who"><div class="cc-av">' + avatarHtml(call.name, call.photo) + '</div><div class="cc-tx"><div class="cc-nm" id="cn-c-nm">' + esc(call.name) + '</div><div class="cc-kd" id="cn-c-kd"></div><div class="cc-sub" id="cn-c-sub"></div></div></div>' +
      '<video class="lv" id="cn-c-lv" autoplay playsinline muted></video>';
    var bar = '<div class="cc-bar">' +
      '<button type="button" class="cc-cb" data-c="mute" id="cn-c-mute"><i>' + IC.mic + '</i><span>' + esc(T('mute')) + '</span></button>' +
      (call.kind === 'video' ? '<button type="button" class="cc-cb" data-c="cam" id="cn-c-cam"><i>' + IC.vcam + '</i><span>' + esc(T('cam')) + '</span></button><button type="button" class="cc-cb" data-c="flip"><i>' + IC.flip + '</i><span>' + esc(T('flip')) + '</span></button>' : '') +
      '<button type="button" class="cc-cb red" data-c="hangup" id="cn-c-hang"><i>' + IC.phone + '</i><span>' + esc(T(incoming ? 'decline' : 'hangup')) + '</span></button>' +
      '<button type="button" class="cc-cb green" data-c="accept" id="cn-c-acc"><i>' + IC.phone + '</i><span>' + esc(T('accept')) + '</span></button></div>';
    ov.innerHTML = head + bar;
    document.body.appendChild(ov);
    ov.addEventListener('click', onUiClick);
    paintUI(call);
  }
  function onUiClick(e) {
    var b = e.target.closest('[data-c]'); if (!b) return;
    var a = b.getAttribute('data-c'), call = cs.call; if (!call) return;
    if (a === 'hangup') { if (call.state === 'incoming') finish(call, 'declined', {}); else finish(call, call.connectedAt ? 'ended' : (call.role === 'caller' ? 'cancelled' : 'declined'), {}); }
    else if (a === 'accept') accept();
    else if (a === 'mute') toggleMute();
    else if (a === 'cam') toggleCam();
    else if (a === 'flip') flipCam();
  }
  function paintUI(call) {
    var ov = el('cn-call-ov'); if (!ov || cs.call !== call) return;
    var incoming = call.state === 'incoming', live = call.state === 'connected' || call.state === 'reconnecting';
    ov.classList.toggle('live', live); ov.classList.toggle('inc', incoming);
    var kd = el('cn-c-kd'); if (kd) kd.textContent = incoming ? T(call.kind === 'video' ? 'in_video' : 'in_voice') : (live ? '' : T(call.kind === 'video' ? 'video_call' : 'voice_call'));
    var sub = el('cn-c-sub');
    if (sub) {
      if (call.state === 'connected') sub.textContent = fmt((Date.now() - call.connectedAt) / 1000);
      else if (call.state === 'reconnecting') sub.textContent = T('reconnecting');
      else if (call.state === 'ringing') sub.textContent = T('ringing');
      else if (call.state === 'connecting') sub.textContent = T('connecting');
      else if (call.state === 'incoming') sub.textContent = '';
      else sub.textContent = T('calling');
    }
    var acc = el('cn-c-acc'); if (acc) acc.classList.toggle('hide', !incoming);
    ['cn-c-mute', 'cn-c-cam'].forEach(function (id) { var b = el(id); if (b) b.classList.toggle('hide', incoming); });
    var fl = ov.querySelector('[data-c="flip"]'); if (fl) fl.classList.toggle('hide', incoming);
    var hang = el('cn-c-hang'); if (hang) { var sp = hang.querySelector('span'); if (sp) sp.textContent = T(incoming ? 'decline' : 'hangup'); }
    var mb = el('cn-c-mute'); if (mb) { mb.classList.toggle('on', !!call.muted); mb.querySelector('i').innerHTML = call.muted ? IC.micoff : IC.mic; }
    var cb = el('cn-c-cam'); if (cb) { cb.classList.toggle('on', !!call.camOff); cb.querySelector('i').innerHTML = call.camOff ? IC.vcamoff : IC.vcam; }
    var lv = el('cn-c-lv'); if (lv && call.local && lv.srcObject !== call.local) { lv.srcObject = call.local; lv.play && lv.play().catch(function () { /* ignore */ }); }
    var rv = el('cn-c-rv'); if (rv && call.remote && rv.srcObject !== call.remote) { rv.srcObject = call.remote; rv.play && rv.play().catch(function () { /* ignore */ }); }
  }
  function removeUI(instant) {
    var ov = el('cn-call-ov'); if (!ov) return;
    if (instant) { ov.remove(); return; }
    ov.classList.add('out'); setTimeout(function () { ov.remove(); }, 380);
  }
  function startTimer(call) {
    clearInterval(call.timer);
    call.timer = setInterval(function () { if (cs.call === call && call.state === 'connected') paintUI(call); }, 1000);
  }

  /* ---------------------------------------------------------------- média et connexion */
  function getMedia(kind, facing) {
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: kind === 'video' ? { facingMode: facing || 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } : false
    });
  }
  function supported() { return !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function candRef(call) { return fdb().collection('calls').doc(call.id).collection('candidates'); }
  function sendCand(call, cand) {
    var u = me(); if (!u) return;
    var o = { from: u.uid, c: JSON.stringify(cand.toJSON ? cand.toJSON() : cand), createdAt: iso() };
    if (!call.docReady) { call.outQ.push(o); return; }
    candRef(call).add(o).catch(function () { /* un candidat perdu n'est pas grave */ });
  }
  function flushOut(call) {
    call.docReady = true;
    var q = call.outQ; call.outQ = [];
    q.forEach(function (o) { candRef(call).add(o).catch(function () { /* ignore */ }); });
  }
  function applyCand(call, cand) {
    if (!call.pc) { call.inQ.push(cand); return; }
    if (!call.pc.remoteDescription || !call.pc.remoteDescription.type) { call.inQ.push(cand); return; }
    try { call.pc.addIceCandidate(cand).catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
  }
  function flushIn(call) {
    var q = call.inQ; call.inQ = [];
    q.forEach(function (c) { try { call.pc.addIceCandidate(c).catch(function () { /* ignore */ }); } catch (e) { /* ignore */ } });
  }
  function makePc(call, ice) {
    var pc = new RTCPeerConnection({ iceServers: ice, bundlePolicy: 'max-bundle' });
    pc.onicecandidate = function (e) { if (e.candidate) sendCand(call, e.candidate); };
    pc.ontrack = function (e) {
      if (e.streams && e.streams[0]) call.remote = e.streams[0];
      else { if (!call.remote) call.remote = new MediaStream(); call.remote.addTrack(e.track); }
      paintUI(call);
    };
    pc.onconnectionstatechange = function () { onConn(call); };
    return pc;
  }
  function onConn(call) {
    if (!call.pc || call.finished) return;
    var s = call.pc.connectionState;
    if (s === 'connected') {
      clearTimeout(call.rcT); clearTimeout(call.ringTimer);
      if (!call.connectedAt) { call.connectedAt = Date.now(); stopTone(); startTimer(call); try { if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function (l) { call.lock = l; }, function () { /* ignore */ }); } catch (e) { /* ignore */ } }
      call.state = 'connected'; paintUI(call);
    } else if (s === 'disconnected') {
      if (call.connectedAt) { call.state = 'reconnecting'; paintUI(call); }
      clearTimeout(call.rcT);
      call.rcT = setTimeout(function () { if (call.pc && call.pc.connectionState !== 'connected') finish(call, call.connectedAt ? 'ended' : 'cancelled', { fail: true }); }, 9000);
    } else if (s === 'failed') {
      finish(call, call.connectedAt ? 'ended' : 'cancelled', { fail: true });
    }
  }
  function watchCall(call) {
    var d = fdb(), id = call.id, u = me();
    call.unsubDoc = d.collection('calls').doc(id).onSnapshot(function (snap) {
      if (cs.call !== call || call.finished) return;
      var v = snap.exists ? snap.data() : null; if (!v) return;
      if (call.role === 'caller' && v.answer && !call.gotAnswer && call.pc) {
        call.gotAnswer = true; call.state = 'connecting'; clearTimeout(call.ringTimer); stopTone(); paintUI(call);
        call.pc.setRemoteDescription(v.answer).then(function () { flushIn(call); }).catch(function () { finish(call, 'cancelled', { fail: true }); });
        call.ringTimer = setTimeout(function () { if (!call.connectedAt) finish(call, 'cancelled', { fail: true }); }, 30000);
      }
      var term = { ended: 1, declined: 1, cancelled: 1, missed: 1, busy: 1 };
      if (term[v.status]) finish(call, v.status, { remote: true, by: v.endedBy });
    }, function () { /* pas bloquant */ });
    call.unsubCands = candRef(call).onSnapshot(function (snap) {
      if (cs.call !== call) return;
      snap.forEach(function (doc) {
        if (call.seen[doc.id]) return; call.seen[doc.id] = 1;
        var v = doc.data(); if (!v || v.from === (u && u.uid) || typeof v.c !== 'string') return;
        try { applyCand(call, JSON.parse(v.c)); } catch (e) { /* ignore */ }
      });
    }, function () { /* pas bloquant */ });
  }

  /* ---------------------------------------------------------------- appeler */
  async function start(o) {
    var u = me(), d = fdb();
    if (!u || !d) { toast(T('login')); return; }
    if (!o || !o.peer || o.peer === u.uid) return;
    if (cs.call) { toast(T('in_call'), 'info'); return; }
    if (!supported()) { toast(T('unsupported'), 'error'); return; }
    if (isBlocked(o.peer)) { toast(T('blocked'), 'error'); return; }
    audioCtx();
    var pi = peerInfo(o.peer);
    var call = newCall({ peer: o.peer, name: o.name || pi.name, photo: o.photo || pi.photo, kind: o.kind, role: 'caller' });
    cs.call = call; buildUI(call);
    try { call.local = await getMedia(call.kind, call.facing); }
    catch (e) { toast(T('mic_denied'), 'error'); cleanup(call); return; }
    if (cs.call !== call) { stopStream(call.local); return; }
    paintUI(call);
    try {
      var ice = await iceServers();
      call.pc = makePc(call, ice);
      call.local.getTracks().forEach(function (t) { call.pc.addTrack(t, call.local); });
      var offer = await call.pc.createOffer();
      await call.pc.setLocalDescription(offer);
      var id = d.collection('calls').doc().id; call.id = id;
      var now = iso();
      var batch = d.batch();
      batch.set(d.collection('calls').doc(id), { members: [u.uid, call.peer], callerId: u.uid, calleeId: call.peer, kind: call.kind, status: 'ringing', createdAt: now, offer: { type: offer.type, sdp: offer.sdp } });
      batch.set(d.collection('call_inbox').doc(call.peer), { callId: id, callerId: u.uid, kind: call.kind, status: 'ringing', createdAt: now });
      await batch.commit();
      flushOut(call);
      call.state = 'ringing'; paintUI(call); startTone('out');
      watchCall(call);
      pushFor(id);
      call.ringTimer = setTimeout(function () { if (cs.call === call && !call.gotAnswer) finish(call, 'missed', {}); }, RING_MS);
    } catch (e) {
      var denied = e && e.code === 'permission-denied';
      toast(denied ? T('denied') : T('failed'), 'error');
      cleanup(call);
    }
  }
  function pushFor(callId) {
    try {
      if (typeof auth === 'undefined' || !auth || !auth.currentUser) return;
      auth.currentUser.getIdToken().then(function (idToken) {
        return fetch('/api/notify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'call-push', idToken: idToken, callId: callId }) });
      }).catch(function () { /* la notification est un plus */ });
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- recevoir */
  function startInbox() {
    var u = me(), d = fdb(); if (!u || !d) return;
    if (cs.inboxUid === u.uid && cs.inboxUnsub) return;
    stopInbox(); cs.inboxUid = u.uid;
    try {
      cs.inboxUnsub = d.collection('call_inbox').doc(u.uid).onSnapshot(function (snap) {
        var v = snap.exists ? snap.data() : null;
        var c = cs.call;
        if (!v) { if (c && c.role === 'callee' && c.state === 'incoming') dismissIncoming('cancelled'); return; }
        if (v.status === 'ringing') onIncoming(v);
        else if (c && c.id === v.callId && c.role === 'callee' && c.state === 'incoming') dismissIncoming(v.status);
      }, function () { /* appels pas encore activés : on reste discret */ });
    } catch (e) { /* ignore */ }
  }
  function stopInbox() { if (cs.inboxUnsub) { try { cs.inboxUnsub(); } catch (e) { /* ignore */ } } cs.inboxUnsub = null; cs.inboxUid = null; }
  function onIncoming(v) {
    if (!v || !v.callId || cs.handled[v.callId]) return;
    var age = Date.now() - Date.parse(v.createdAt || '');
    if (!(age > -60000 && age < INCOMING_MAX_AGE)) return;
    if (isBlocked(v.callerId)) return;
    cs.handled[v.callId] = 1;
    if (cs.call) {
      var d = fdb();
      if (d) d.collection('calls').doc(v.callId).update({ status: 'busy', endedAt: iso(), endedBy: me().uid }).catch(function () { /* ignore */ });
      return;
    }
    showIncoming(v);
  }
  async function showIncoming(v) {
    var d = fdb(), u = me(); if (!d || !u) return;
    var pi = peerInfo(v.callerId);
    var call = newCall({ id: v.callId, peer: v.callerId, name: pi.name, photo: pi.photo, kind: v.kind, role: 'callee' });
    call.state = 'incoming'; call.docReady = true; cs.call = call;
    try {
      var snap = await d.collection('calls').doc(v.callId).get();
      var c = snap.exists ? snap.data() : null;
      if (cs.call !== call) return;
      if (!c || c.status !== 'ringing' || !c.offer || c.calleeId !== u.uid) { cs.call = null; return; }
      call.offer = c.offer; call.kind = c.kind === 'video' ? 'video' : 'audio';
    } catch (e) { if (cs.call === call) cs.call = null; return; }
    try { if (window.CNMessages && window.CNMessages.loadProfiles) { await window.CNMessages.loadProfiles([v.callerId]); var p2 = peerInfo(v.callerId); call.name = p2.name; call.photo = p2.photo; } } catch (e) { /* nom par défaut */ }
    if (cs.call !== call) return;
    buildUI(call); startTone('in');
    watchCall(call);
    call.ringTimer = setTimeout(function () { if (cs.call === call && call.state === 'incoming') dismissIncoming('missed'); }, RING_MS + 5000);
  }
  function dismissIncoming(why) {
    var call = cs.call; if (!call || call.role !== 'callee' || call.state !== 'incoming') return;
    if (why === 'missed' || why === 'cancelled') toast(T('missed_toast', { n: call.name }), 'info');
    cleanup(call);
  }
  async function accept() {
    var call = cs.call, d = fdb(); if (!call || call.state !== 'incoming' || !d) return;
    audioCtx(); stopTone(); clearTimeout(call.ringTimer);
    call.state = 'connecting'; paintUI(call);
    try {
      if (!supported()) throw new Error('unsupported');
      call.local = await getMedia(call.kind, call.facing);
    } catch (e) { toast(supported() ? T('mic_denied') : T('unsupported'), 'error'); finish(call, 'declined', {}); return; }
    if (cs.call !== call) { stopStream(call.local); return; }
    try {
      var ice = await iceServers();
      call.pc = makePc(call, ice);
      call.local.getTracks().forEach(function (t) { call.pc.addTrack(t, call.local); });
      await call.pc.setRemoteDescription(call.offer);
      flushIn(call);
      var ans = await call.pc.createAnswer();
      await call.pc.setLocalDescription(ans);
      await d.collection('calls').doc(call.id).update({ answer: { type: ans.type, sdp: ans.sdp }, status: 'accepted', answeredAt: iso() });
      paintUI(call);
      call.ringTimer = setTimeout(function () { if (cs.call === call && !call.connectedAt) finish(call, 'cancelled', { fail: true }); }, 30000);
    } catch (e) { toast(T('failed'), 'error'); finish(call, 'declined', {}); }
  }
  async function openFromLink(callId) {
    var u = me(), d = fdb(); if (!u || !d || !callId) return;
    try {
      var snap = await d.collection('calls').doc(String(callId)).get();
      var c = snap.exists ? snap.data() : null;
      if (!c || c.calleeId !== u.uid) return;
      var age = Date.now() - Date.parse(c.createdAt || '');
      if (c.status === 'ringing' && age < INCOMING_MAX_AGE) { onIncoming({ callId: String(callId), callerId: c.callerId, kind: c.kind, createdAt: c.createdAt, status: 'ringing' }); return; }
      if (cs.call && cs.call.id === String(callId)) return;
      var pi = peerInfo(c.callerId);
      toast(T('missed_toast', { n: pi.name }), 'info');
      if (window.CNMessages) window.CNMessages.openChat(c.callerId, null);
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- pendant l'appel */
  function toggleMute() {
    var call = cs.call; if (!call || !call.local) return;
    call.muted = !call.muted;
    call.local.getAudioTracks().forEach(function (t) { t.enabled = !call.muted; });
    paintUI(call);
  }
  function toggleCam() {
    var call = cs.call; if (!call || !call.local || call.kind !== 'video') return;
    call.camOff = !call.camOff;
    call.local.getVideoTracks().forEach(function (t) { t.enabled = !call.camOff; });
    paintUI(call);
  }
  async function flipCam() {
    var call = cs.call; if (!call || call.kind !== 'video' || !call.pc) return;
    var next = call.facing === 'user' ? 'environment' : 'user';
    try {
      var s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, width: { ideal: 640 }, height: { ideal: 480 } } });
      var nt = s.getVideoTracks()[0];
      var sender = call.pc.getSenders().filter(function (x) { return x.track && x.track.kind === 'video'; })[0];
      if (sender && nt) await sender.replaceTrack(nt);
      call.local.getVideoTracks().forEach(function (t) { t.stop(); call.local.removeTrack(t); });
      call.local.addTrack(nt); call.facing = next;
      var lv = el('cn-c-lv'); if (lv) { lv.classList.toggle('back', next === 'environment'); lv.srcObject = call.local; }
    } catch (e) { /* la caméra arrière n'existe pas toujours */ }
  }

  /* ---------------------------------------------------------------- fin d'appel */
  function stopStream(s) { try { if (s) s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ } }
  function cleanup(call) {
    if (!call) return;
    clearInterval(call.timer); clearTimeout(call.ringTimer); clearTimeout(call.rcT);
    if (call.unsubDoc) { try { call.unsubDoc(); } catch (e) { /* ignore */ } call.unsubDoc = null; }
    if (call.unsubCands) { try { call.unsubCands(); } catch (e) { /* ignore */ } call.unsubCands = null; }
    stopStream(call.local); stopStream(call.remote);
    try { if (call.pc) { call.pc.onconnectionstatechange = null; call.pc.close(); } } catch (e) { /* ignore */ }
    try { if (call.lock && call.lock.release) call.lock.release(); } catch (e) { /* ignore */ }
    stopTone();
    var wasCurrent = cs.call === call;
    if (wasCurrent) cs.call = null;
    var ov = el('cn-call-ov'); if (ov && wasCurrent) removeUI(false);
  }
  async function finish(call, status, opt) {
    if (!call || call.finished) return;
    call.finished = true; opt = opt || {};
    var d = fdb(), u = me();
    var dur = call.connectedAt ? Math.round((Date.now() - call.connectedAt) / 1000) : 0;
    if (opt.fail) toast(T('failed'), 'error');
    else if (opt.remote && call.role === 'caller') {
      if (status === 'declined') toast(T('declined_t', { n: call.name }), 'info');
      else if (status === 'busy') toast(T('busy_t', { n: call.name }), 'info');
    } else if (status === 'missed' && call.role === 'caller') toast(T('noanswer_t', { n: call.name }), 'info');
    var ov = el('cn-c-sub'); if (ov && !opt.fail) ov.textContent = T('ended');
    if (d && u && call.id && !opt.remote) {
      var patch = { status: status, endedAt: iso(), endedBy: u.uid, duration: dur };
      try { await d.collection('calls').doc(call.id).update(patch); } catch (e) { /* l'autre côté verra le délai écoulé */ }
    }
    try {
      if (d && u && call.id) {
        if (call.role === 'caller') d.collection('call_inbox').doc(call.peer).delete().catch(function () { /* ignore */ });
        else d.collection('call_inbox').doc(u.uid).delete().catch(function () { /* ignore */ });
      }
    } catch (e) { /* ignore */ }
    if (call.role === 'caller' && !call.logged && call.id) {
      call.logged = true;
      var logStatus = status === 'accepted' ? 'ended' : status;
      try { if (window.CNMessages && window.CNMessages.writeCallLog) window.CNMessages.writeCallLog(call.peer, { kind: call.kind, status: logStatus, duration: dur }); } catch (e) { /* ignore */ }
    }
    setTimeout(function () { cleanup(call); }, opt.fail ? 0 : 700);
  }

  /* ---------------------------------------------------------------- branchements */
  window.CNCalls = {
    start: start, openFromLink: openFromLink, accept: accept,
    hangup: function () { var c = cs.call; if (c) finish(c, c.connectedAt ? 'ended' : (c.role === 'caller' ? 'cancelled' : 'declined'), {}); },
    isActive: function () { return !!cs.call; }, _state: cs
  };
  function boot() {
    try {
      if (typeof auth !== 'undefined' && auth && typeof auth.onAuthStateChanged === 'function') {
        auth.onAuthStateChanged(function (user) {
          if (!user) { if (cs.call) cleanup(cs.call); stopInbox(); return; }
          var tries = 0;
          (function wait() { if (me() && me().uid === user.uid) { startInbox(); return; } if (++tries < 40) setTimeout(wait, 500); })();
        });
      }
    } catch (e) { /* ignore */ }
    if (me()) startInbox();
  }
  boot();
})();
