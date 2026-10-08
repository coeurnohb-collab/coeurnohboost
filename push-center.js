/* =====================================================================
   push-center.js — Notifications « comme une vraie application »
   (Coeurnoh Universe). Chargé après script.js et polish.js.

   Ce que fait ce fichier :
   1. Demande l'autorisation au BON moment (après un geste de la personne, via une
      petite carte « Activer les notifications »), au lieu d'une demande automatique
      que le téléphone ignore -> c'était la cause des e-mails à la place des push.
   2. Enregistre / rafraîchit le jeton de CET appareil, et le retire à la déconnexion.
   3. Carte « Notifications sur cet appareil » dans Paramètres + bouton « Envoyer un test ».
   4. Ouvre le bon écran au toucher d'une notification (app ouverte ou fermée).
   5. Centre de notifications : filtres, « Tout marquer comme lu », lu au toucher,
      pastille de l'icône synchronisée.
   Il enveloppe des fonctions existantes de script.js sans les modifier.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnPushCenter) return;
  window.__cnPushCenter = true;

  /* ---------- Textes (5 langues) ---------- */
  var L10N = {
    fr: { ptitle: 'Ne rate plus rien', ptext: 'Reçois les likes, commentaires, commandes et rechargements en direct, même quand l\'application est fermée.', pyes: 'Activer', plater: 'Plus tard',
      iostitle: 'Notifications sur iPhone', iostext: 'Touche Partager, puis « Sur l\'écran d\'accueil ». Ouvre ensuite l\'application depuis son icône et reviens ici pour activer les notifications.', iosok: 'Compris',
      cardon: 'Activées sur cet appareil', cardoff: 'Pas encore activées sur cet appareil', cardden: 'Bloquées par ton navigateur', cardnosup: 'Non disponibles sur ce navigateur',
      denhelp: 'Touche le cadenas à côté de l\'adresse (ou ⋮ puis Paramètres du site), choisis Notifications > Autoriser, puis reviens ici.',
      enable: 'Activer les notifications', test: 'Envoyer un test', retry: 'Vérifier à nouveau', on: 'Notifications activées ✅', denied: 'Notifications refusées. Tu peux les réactiver dans les réglages du navigateur.',
      testok: 'Test envoyé ! Regarde ta barre de notifications.', testfail: 'Le test n\'est pas arrivé', nodev: 'Aucun appareil enregistré : touche « Activer les notifications ».',
      f_all: 'Tout', f_unread: 'Non lues', f_activity: 'Activité', f_orders: 'Commandes', f_ann: 'Annonces', markall: 'Tout marquer comme lu', allread: 'Tout est lu ✓', nonehere: 'Rien dans cette catégorie.' },
    en: { ptitle: 'Never miss a thing', ptext: 'Get likes, comments, orders and top-ups instantly, even when the app is closed.', pyes: 'Turn on', plater: 'Not now',
      iostitle: 'Notifications on iPhone', iostext: 'Tap Share, then "Add to Home Screen". Open the app from its icon and come back here to turn notifications on.', iosok: 'Got it',
      cardon: 'On for this device', cardoff: 'Not turned on for this device yet', cardden: 'Blocked by your browser', cardnosup: 'Not available in this browser',
      denhelp: 'Tap the padlock next to the address (or ⋮ then Site settings), choose Notifications > Allow, then come back here.',
      enable: 'Turn on notifications', test: 'Send a test', retry: 'Check again', on: 'Notifications on ✅', denied: 'Notifications were refused. You can turn them on again in your browser settings.',
      testok: 'Test sent! Check your notification bar.', testfail: 'The test did not arrive', nodev: 'No device registered: tap "Turn on notifications".',
      f_all: 'All', f_unread: 'Unread', f_activity: 'Activity', f_orders: 'Orders', f_ann: 'News', markall: 'Mark all as read', allread: 'All read ✓', nonehere: 'Nothing in this category.' },
    es: { ptitle: 'No te pierdas nada', ptext: 'Recibe al instante likes, comentarios, pedidos y recargas, incluso con la aplicación cerrada.', pyes: 'Activar', plater: 'Más tarde',
      iostitle: 'Notificaciones en iPhone', iostext: 'Toca Compartir y luego "Añadir a pantalla de inicio". Abre la app desde su icono y vuelve aquí para activar las notificaciones.', iosok: 'Entendido',
      cardon: 'Activadas en este dispositivo', cardoff: 'Aún no activadas en este dispositivo', cardden: 'Bloqueadas por el navegador', cardnosup: 'No disponibles en este navegador',
      denhelp: 'Toca el candado junto a la dirección (o ⋮ y Ajustes del sitio), elige Notificaciones > Permitir y vuelve aquí.',
      enable: 'Activar notificaciones', test: 'Enviar una prueba', retry: 'Comprobar de nuevo', on: 'Notificaciones activadas ✅', denied: 'Notificaciones rechazadas. Puedes reactivarlas en los ajustes del navegador.',
      testok: '¡Prueba enviada! Mira tu barra de notificaciones.', testfail: 'La prueba no llegó', nodev: 'Ningún dispositivo registrado: toca "Activar notificaciones".',
      f_all: 'Todo', f_unread: 'No leídas', f_activity: 'Actividad', f_orders: 'Pedidos', f_ann: 'Novedades', markall: 'Marcar todo como leído', allread: 'Todo leído ✓', nonehere: 'Nada en esta categoría.' },
    it: { ptitle: 'Non perdere nulla', ptext: 'Ricevi in tempo reale like, commenti, ordini e ricariche, anche con l\'app chiusa.', pyes: 'Attiva', plater: 'Più tardi',
      iostitle: 'Notifiche su iPhone', iostext: 'Tocca Condividi, poi "Aggiungi a Home". Apri l\'app dalla sua icona e torna qui per attivare le notifiche.', iosok: 'Ho capito',
      cardon: 'Attive su questo dispositivo', cardoff: 'Non ancora attive su questo dispositivo', cardden: 'Bloccate dal browser', cardnosup: 'Non disponibili su questo browser',
      denhelp: 'Tocca il lucchetto accanto all\'indirizzo (o ⋮ poi Impostazioni sito), scegli Notifiche > Consenti e torna qui.',
      enable: 'Attiva le notifiche', test: 'Invia un test', retry: 'Controlla di nuovo', on: 'Notifiche attive ✅', denied: 'Notifiche rifiutate. Puoi riattivarle nelle impostazioni del browser.',
      testok: 'Test inviato! Guarda la barra delle notifiche.', testfail: 'Il test non è arrivato', nodev: 'Nessun dispositivo registrato: tocca "Attiva le notifiche".',
      f_all: 'Tutte', f_unread: 'Non lette', f_activity: 'Attività', f_orders: 'Ordini', f_ann: 'Novità', markall: 'Segna tutto come letto', allread: 'Tutto letto ✓', nonehere: 'Niente in questa categoria.' },
    pt: { ptitle: 'Não perca nada', ptext: 'Receba curtidas, comentários, pedidos e recargas na hora, mesmo com o app fechado.', pyes: 'Ativar', plater: 'Mais tarde',
      iostitle: 'Notificações no iPhone', iostext: 'Toque em Compartilhar e depois "Adicionar à Tela de Início". Abra o app pelo ícone e volte aqui para ativar as notificações.', iosok: 'Entendi',
      cardon: 'Ativadas neste aparelho', cardoff: 'Ainda não ativadas neste aparelho', cardden: 'Bloqueadas pelo navegador', cardnosup: 'Indisponíveis neste navegador',
      denhelp: 'Toque no cadeado ao lado do endereço (ou ⋮ e Configurações do site), escolha Notificações > Permitir e volte aqui.',
      enable: 'Ativar notificações', test: 'Enviar um teste', retry: 'Verificar de novo', on: 'Notificações ativadas ✅', denied: 'Notificações recusadas. Você pode reativá-las nas configurações do navegador.',
      testok: 'Teste enviado! Veja a barra de notificações.', testfail: 'O teste não chegou', nodev: 'Nenhum aparelho registrado: toque em "Ativar notificações".',
      f_all: 'Tudo', f_unread: 'Não lidas', f_activity: 'Atividade', f_orders: 'Pedidos', f_ann: 'Novidades', markall: 'Marcar tudo como lido', allread: 'Tudo lido ✓', nonehere: 'Nada nesta categoria.' }
  };
  var L10N2 = {
    fr: { notreg: 'Autorisées, mais cet appareil n\'est pas encore enregistré', fix: 'Réparer', fixok: 'Appareil enregistré ✅', fixfail: 'Enregistrement impossible', netblock: 'La connexion au service de notifications a échoué. Vérifie ta connexion internet et réessaie.' },
    en: { notreg: 'Allowed, but this device is not registered yet', fix: 'Repair', fixok: 'Device registered ✅', fixfail: 'Registration failed', netblock: 'Could not reach the notification service. Check your connection and try again.' },
    es: { notreg: 'Permitidas, pero este dispositivo aún no está registrado', fix: 'Reparar', fixok: 'Dispositivo registrado ✅', fixfail: 'No se pudo registrar', netblock: 'No se pudo conectar con el servicio de notificaciones. Revisa tu conexión e inténtalo de nuevo.' },
    it: { notreg: 'Consentite, ma questo dispositivo non è ancora registrato', fix: 'Ripara', fixok: 'Dispositivo registrato ✅', fixfail: 'Registrazione non riuscita', netblock: 'Impossibile raggiungere il servizio di notifiche. Controlla la connessione e riprova.' },
    pt: { notreg: 'Permitidas, mas este aparelho ainda não está registrado', fix: 'Reparar', fixok: 'Aparelho registrado ✅', fixfail: 'Falha no registro', netblock: 'Não foi possível acessar o serviço de notificações. Verifique a conexão e tente de novo.' }
  };
  function tx2(k) { return (L10N2[lang()] || L10N2.fr)[k]; }
  // Message humain pour les erreurs Firebase les plus fréquentes
  function humanErr(e) {
    var m = String((e && (e.code || e.message)) || e || '');
    if (/token-subscribe-failed|Failed to fetch|network/i.test(m)) return tx2('netblock') + ' (' + (/token-subscribe-failed/.test(m) ? 'token-subscribe-failed' : 'réseau') + ')';
    return m.slice(0, 160);
  }
  function lang() { try { if (typeof currentLang !== 'undefined' && L10N[currentLang]) return currentLang; } catch (e) { /* ignore */ } var n = (navigator.language || 'fr').slice(0, 2); return L10N[n] ? n : 'fr'; }
  function tx(k) { return (L10N[lang()] || L10N.fr)[k] || L10N.fr[k] || k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- Accès aux variables de script.js ---------- */
  function cu() { try { return currentUser || null; } catch (e) { return null; } }
  function dbx() { try { return db; } catch (e) { return null; } }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } return null; }

  /* ---------- Style ---------- */
  function injectCss() {
    if (document.getElementById('cn-push-css')) return;
    var s = document.createElement('style'); s.id = 'cn-push-css';
    s.textContent =
      '#cn-push-ask{position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:9500;max-width:460px;margin:0 auto;background:var(--card,#fff);color:var(--ink,#1a2436);border-radius:18px;box-shadow:0 12px 40px rgba(10,20,40,.28);padding:16px;display:flex;gap:12px;align-items:flex-start;transform:translateY(140%);transition:transform .35s cubic-bezier(.2,.8,.2,1)}' +
      '#cn-push-ask.on{transform:translateY(0)}' +
      '#cn-push-ask .pi{flex:0 0 auto;width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,#f39c1f,#d7263d)}' +
      '#cn-push-ask .pi svg{width:23px;height:23px}' +
      '#cn-push-ask b{display:block;font-size:1rem;margin-bottom:3px}' +
      '#cn-push-ask p{margin:0 0 10px;font-size:.88rem;line-height:1.4;opacity:.8}' +
      '#cn-push-ask .pb{display:flex;gap:8px}' +
      '#cn-push-ask button{font:inherit;font-weight:700;border-radius:12px;padding:9px 16px;cursor:pointer;border:1px solid transparent}' +
      '#cn-push-ask .y{background:var(--green,#1f8a4c);color:#fff}' +
      '#cn-push-ask .n{background:transparent;color:inherit;border-color:rgba(120,130,150,.4)}' +
      'html[data-theme="dark"] #cn-push-ask{background:#232a36;color:#f2f4f8}' +
      '#cn-push-card{margin:8px 0 12px;padding:12px;border-radius:14px;background:rgba(120,130,150,.1)}' +
      '#cn-push-card .st{font-weight:700;margin-bottom:4px}' +
      '#cn-push-card .hp{font-size:.84rem;opacity:.8;margin:4px 0 8px;line-height:1.4}' +
      '#cn-push-card .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
      '#cn-notif-tools{display:flex;gap:8px;align-items:center;overflow-x:auto;padding:2px 0 12px;-webkit-overflow-scrolling:touch}' +
      '#cn-notif-tools .chip{flex:0 0 auto;font:inherit;font-size:.85rem;font-weight:700;padding:7px 14px;border-radius:999px;border:1px solid rgba(120,130,150,.35);background:transparent;color:inherit;cursor:pointer}' +
      '#cn-notif-tools .chip.on{background:var(--green,#1f8a4c);border-color:var(--green,#1f8a4c);color:#fff}' +
      '#cn-notif-tools .mk{margin-left:auto;flex:0 0 auto;font:inherit;font-size:.85rem;font-weight:700;padding:7px 12px;border:0;background:transparent;color:var(--green,#1f8a4c);cursor:pointer;white-space:nowrap}' +
      '#cn-notif-empty{padding:16px;opacity:.7;font-size:.9rem}';
    document.head.appendChild(s);
  }

  /* ---------- État de l'appareil ---------- */
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function isStandalone() { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } }
  function supported() {
    return ('Notification' in window) && ('serviceWorker' in navigator) && ('PushManager' in window) &&
      typeof firebase !== 'undefined' && !!firebase.messaging;
  }
  function deviceState() {
    if (isIOS() && !isStandalone()) return 'ios-install';
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return 'default';
  }

  /* ---------- Jeton de CET appareil ---------- */
  var DAY = 86400000, fgBound = false;
  function tkKey(uid) { return 'cn_fcm_token:' + uid; }
  function syKey(uid) { return 'cn_fcm_sync:' + uid; }

  async function syncToken() {
    var u = cu(), d = dbx();
    if (!u || !d || !supported() || Notification.permission !== 'granted') return false;
    var messaging = firebase.messaging();
    var swReg = await navigator.serviceWorker.ready;
    var token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return false;
    var old = ls(tkKey(u.uid));
    var last = parseInt(ls(syKey(u.uid)) || '0', 10) || 0;
    if (old !== token || Date.now() - last > DAY) {
      var ref = d.collection('users').doc(u.uid);
      await ref.update({ fcmTokens: firebase.firestore.FieldValue.arrayUnion(token) });
      if (old && old !== token) { try { await ref.update({ fcmTokens: firebase.firestore.FieldValue.arrayRemove(old) }); } catch (e) { /* ignore */ } }
      ls(tkKey(u.uid), token); ls(syKey(u.uid), String(Date.now()));
    }
    bindForeground(messaging);
    return true;
  }

  // Message reçu pendant que l'app est OUVERTE : son + petit bandeau pour les annonces.
  // (Les notifications personnelles ont déjà leur bandeau, via la liste en direct.)
  function bindForeground(messaging) {
    if (fgBound) return; fgBound = true;
    messaging.onMessage(function (p) {
      var dt = (p && p.data) || {}, nn = (p && p.notification) || {};
      try { if (typeof playNotifSound === 'function') playNotifSound(); } catch (e) { /* ignore */ }
      if (dt.kind === 'broadcast' || nn.title) {
        var t = dt.title || nn.title || '', b = dt.body || nn.body || '';
        toast((t + (b ? ' — ' + b : '')).slice(0, 160), 'info');
      }
      try { updateNotifBadge(); } catch (e) { /* ignore */ }
    });
  }

  async function removeDeviceToken() {
    var u = cu(), d = dbx(); if (!u || !d) return;
    var tok = ls(tkKey(u.uid));
    if (tok) { try { await d.collection('users').doc(u.uid).update({ fcmTokens: firebase.firestore.FieldValue.arrayRemove(tok) }); } catch (e) { /* ignore */ } }
    ls(tkKey(u.uid), null); ls(syKey(u.uid), null);
    try { if (supported()) await firebase.messaging().deleteToken(); } catch (e) { /* ignore */ }
  }

  /* ---------- Activation (toujours déclenchée par un toucher) ---------- */
  async function enable() {
    var st = deviceState();
    if (st === 'ios-install') { showIosHelp(); return 'ios-install'; }
    if (st === 'unsupported') { toast(tx('cardnosup'), 'error'); refreshCard(); return 'unsupported'; }
    if (st === 'denied') { toast(tx('denied'), 'error'); refreshCard(); return 'denied'; }
    var perm = Notification.permission;
    if (perm !== 'granted') perm = await Notification.requestPermission();
    hideAsk();
    if (perm !== 'granted') { toast(tx('denied'), 'error'); refreshCard(); return perm; }
    try {
      var ok = await syncToken();
      var u = cu(), d = dbx();
      if (u && d) { // la case « Notifications push » des Paramètres repasse sur activée
        try { await d.collection('users').doc(u.uid).update({ 'notifPrefs.push': true }); u.notifPrefs = Object.assign({}, u.notifPrefs || {}, { push: true }); } catch (e) { /* ignore */ }
        try { applyNotifPrefsToUI(); } catch (e) { /* ignore */ }
      }
      if (ok) {
        toast(tx('on'), 'success');
        try { var reg = await navigator.serviceWorker.ready; await reg.showNotification(tx('on'), { body: tx('ptext'), icon: '/icon-192-v2.png', badge: '/badge-96.png', tag: 'cn-welcome', data: { url: '/?openTab=notifs' } }); } catch (e) { /* ignore */ }
      }
    } catch (e) { console.log('[push] activation :', e && e.message); toast(tx2('fixfail') + ' — ' + humanErr(e), 'error'); }
    refreshCard();
    return 'granted';
  }

  async function sendTest() {
    var u = cu(); if (!u) return;
    var btn = document.getElementById('cn-push-test'); if (btn) btn.disabled = true;
    try {
      try { await syncToken(); } catch (e0) { toast(tx2('fixfail') + ' — ' + humanErr(e0), 'error'); if (btn) btn.disabled = false; refreshCard(); return; }
      var idToken = await auth.currentUser.getIdToken();
      var r = await fetch('/api/notify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: idToken, action: 'test-push' }) });
      var j = await r.json();
      if (j && j.success) toast(tx('testok'), 'success');
      else if (j && j.devices === 0) toast(tx('nodev'), 'error');
      else toast(tx('testfail') + (j && j.error ? ' (' + j.error + ')' : ''), 'error');
    } catch (e) { toast(tx('testfail') + ' (' + ((e && e.message) || 'réseau') + ')', 'error'); }
    if (btn) btn.disabled = false;
  }

  /* ---------- Carte d'invitation (au bon moment, jamais surprise) ---------- */
  var BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  function hideAsk() { var el = document.getElementById('cn-push-ask'); if (el) { el.classList.remove('on'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400); } }
  function snooze() {
    var n = parseInt(ls('cn_push_dismiss') || '0', 10) + 1; ls('cn_push_dismiss', String(n));
    ls('cn_push_snooze', String(Date.now() + (n >= 3 ? 14 : 3) * DAY));
  }
  function showAsk(ios) {
    if (document.getElementById('cn-push-ask')) return;
    injectCss();
    var el = document.createElement('div'); el.id = 'cn-push-ask'; el.setAttribute('role', 'dialog');
    el.innerHTML = '<span class="pi">' + BELL + '</span><div><b>' + esc(ios ? tx('iostitle') : tx('ptitle')) + '</b><p>' + esc(ios ? tx('iostext') : tx('ptext')) + '</p>' +
      '<div class="pb"><button type="button" class="y">' + esc(ios ? tx('iosok') : tx('pyes')) + '</button>' + (ios ? '' : '<button type="button" class="n">' + esc(tx('plater')) + '</button>') + '</div></div>';
    el.querySelector('.y').addEventListener('click', function () { if (ios) { snooze(); hideAsk(); } else { enable(); } });
    var no = el.querySelector('.n'); if (no) no.addEventListener('click', function () { snooze(); hideAsk(); });
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('on'); });
  }
  function showIosHelp() { showAsk(true); }
  function scheduleAsk() {
    var st = deviceState();
    if (st !== 'default' && st !== 'ios-install') return;
    var until = parseInt(ls('cn_push_snooze') || '0', 10) || 0;
    if (Date.now() < until) return;
    setTimeout(function () {
      if (!cu() || document.visibilityState !== 'visible') return;
      var s = deviceState();
      if (s === 'default') showAsk(false); else if (s === 'ios-install') showAsk(true);
    }, 7000);
  }

  /* ---------- Carte « Notifications sur cet appareil » (Paramètres) ---------- */
  function refreshCard() {
    var host = document.getElementById('section-notifprefs'); if (!host) return;
    injectCss();
    var card = document.getElementById('cn-push-card');
    if (!card) {
      card = document.createElement('div'); card.id = 'cn-push-card';
      var intro = host.querySelector('p.muted'); if (intro && intro.parentNode) intro.parentNode.insertBefore(card, intro.nextSibling); else host.appendChild(card);
      card.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.id === 'cn-push-enable') enable(); else if (b.id === 'cn-push-test') sendTest(); else if (b.id === 'cn-push-retry') { syncToken().catch(function () {}).then(refreshCard); }
        else if (b.id === 'cn-push-fix') { b.disabled = true; syncToken().then(function (ok) { toast(ok ? tx2('fixok') : tx2('fixfail'), ok ? 'success' : 'error'); }).catch(function (e) { toast(tx2('fixfail') + ' — ' + humanErr(e), 'error'); }).then(function () { refreshCard(); }); }
      });
    }
    var st = deviceState(), h = '';
    var u0 = cu(), registered = !!(u0 && ls(tkKey(u0.uid)));
    if (st === 'granted' && registered) h = '<div class="st">🔔 ' + esc(tx('cardon')) + '</div><div class="row"><button type="button" class="btn btn-outline btn-sm" id="cn-push-test">' + esc(tx('test')) + '</button></div>';
    else if (st === 'granted') h = '<div class="st">⚠️ ' + esc(tx2('notreg')) + '</div><div class="row"><button type="button" class="btn btn-primary btn-sm" id="cn-push-fix">' + esc(tx2('fix')) + '</button></div>';
    else if (st === 'default') h = '<div class="st">🔕 ' + esc(tx('cardoff')) + '</div><div class="row"><button type="button" class="btn btn-primary btn-sm" id="cn-push-enable">' + esc(tx('enable')) + '</button></div>';
    else if (st === 'denied') h = '<div class="st">🚫 ' + esc(tx('cardden')) + '</div><div class="hp">' + esc(tx('denhelp')) + '</div><div class="row"><button type="button" class="btn btn-outline btn-sm" id="cn-push-retry">' + esc(tx('retry')) + '</button></div>';
    else if (st === 'ios-install') h = '<div class="st">🔕 ' + esc(tx('iostitle')) + '</div><div class="hp">' + esc(tx('iostext')) + '</div>';
    else h = '<div class="st">🔕 ' + esc(tx('cardnosup')) + '</div>';
    card.innerHTML = h;
  }

  /* ---------- Remplacement de l'enregistrement automatique ---------- */
  window.registerPushNotifications = async function () {
    if (!cu()) return;
    try {
      var st = deviceState();
      if (st === 'granted') await syncToken();
      else scheduleAsk();
      refreshCard();
    } catch (e) { console.log('[push] Erreur configuration :', e && e.message); }
  };
  // Nouveau : la case « Notifications push » des Paramètres déclenche aussi l'activation.
  if (typeof window.saveNotifPrefs === 'function') {
    var origSave = window.saveNotifPrefs;
    window.saveNotifPrefs = function () {
      var r = origSave.apply(this, arguments);
      try { var cb = document.getElementById('notifpref-push'); if (cb && cb.checked && deviceState() === 'default') enable(); } catch (e) { /* ignore */ }
      return r;
    };
  }
  if (typeof window.applyNotifPrefsToUI === 'function') {
    var origApply = window.applyNotifPrefsToUI;
    window.applyNotifPrefsToUI = function () { var r = origApply.apply(this, arguments); try { refreshCard(); } catch (e) { /* ignore */ } return r; };
  }
  // Déconnexion : on retire le jeton de CET téléphone (sinon le prochain compte recevrait les alertes du précédent).
  if (typeof window.logout === 'function') {
    var origLogout = window.logout;
    window.logout = function () {
      var self = this, args = arguments, done = false;
      function go() { if (done) return; done = true; origLogout.apply(self, args); }
      try { removeDeviceToken().then(go, go); } catch (e) { go(); }
      setTimeout(go, 1500);
    };
  }

  /* ---------- Ouverture du bon écran ---------- */
  function openUrl(rel) {
    if (!cu()) return;
    try {
      var u = new URL(rel || '/', location.origin), p = u.searchParams;
      var open = p.get('open'), prof = p.get('profile'), loc = p.get('loc'), tab = p.get('openTab') || p.get('tab');
      if (open && typeof openPostDetail === 'function') { openPostDetail(open); return; }
      if (prof && typeof openSharedProfile === 'function') { openSharedProfile(prof); return; }
      if (loc && window.LocationCenter) { if (loc === 'link' && p.get('t')) window.LocationCenter.openLink(p.get('t')); else window.LocationCenter.open('share'); return; }
      if (tab === 'sales') tab = 'orders';
      if (tab && tab !== 'notifs' && document.getElementById('dash-tab-' + tab)) { showDashboard(); showDashTab(tab); return; }
      openNotifPanel();
    } catch (e) { console.log('[push] ouverture :', e && e.message); }
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e && e.data && e.data.type === 'cn-open') openUrl(e.data.url);
    });
  }
  // Ouverture à froid (l'app était fermée) : gère aussi ?tab=… , ?openTab=notifs et ?loc=sos|share
  if (typeof window.openNotifTargetIfAny === 'function') {
    var origTarget = window.openNotifTargetIfAny;
    window.openNotifTargetIfAny = function () {
      try {
        var p = new URLSearchParams(window.location.search);
        var t = p.get('tab'), ot = p.get('openTab'), loc = p.get('loc');
        var special = (!p.get('open') && !p.get('profile')) && ((t && !ot) || ot === 'notifs' || ot === 'sales' || loc === 'sos' || loc === 'share');
        if (special) {
          var q = window.location.search;
          window.history.replaceState({}, '', window.location.pathname);
          setTimeout(function () { openUrl('/' + q); }, 500);
          return;
        }
      } catch (e) { /* ignore */ }
      return origTarget.apply(this, arguments);
    };
  }

  /* ---------- Pastille de l'icône de l'app = vrai nombre de non-lues ---------- */
  function unreadTotal() {
    var n = 0;
    try { n += notifCache.filter(function (x) { return !x.read; }).length; } catch (e) { /* ignore */ }
    try { var seen = getLastSeenAnnouncementAt(); n += announcementsCache.filter(function (a) { return a.createdAt > seen; }).length; } catch (e) { /* ignore */ }
    return n;
  }
  function syncAppBadge() {
    try {
      var n = unreadTotal();
      if (n > 0 && 'setAppBadge' in navigator) navigator.setAppBadge(n);
      else if (n === 0 && 'clearAppBadge' in navigator) navigator.clearAppBadge();
    } catch (e) { /* ignore */ }
  }
  if (typeof window.updateNotifBadge === 'function') {
    var origBadge = window.updateNotifBadge;
    window.updateNotifBadge = function () { var r = origBadge.apply(this, arguments); syncAppBadge(); return r; };
  }

  /* ---------- Centre de notifications : filtres, tout lire, lu au toucher ---------- */
  var filter = 'all';
  var ORDER_TYPES = ['sale', 'order', 'purchase', 'recharge', 'topup', 'commission_income', 'order_income', 'contest_income', 'withdrawal', 'booking', 'quote'];
  var ANN_TYPES = ['announcement', 'admin', 'admin_message'];
  function catOf(n, isAnn) {
    if (isAnn || ANN_TYPES.indexOf(n.type) >= 0) return 'ann';
    if (ORDER_TYPES.indexOf(n.type) >= 0) return 'orders';
    return 'activity';
  }
  function findItem(id, isAnn) {
    var list; try { list = isAnn ? announcementsCache : notifCache; } catch (e) { return null; }
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function ensureTools() {
    var listEl = document.getElementById('notif-list'); if (!listEl) return;
    injectCss();
    var bar = document.getElementById('cn-notif-tools');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'cn-notif-tools';
      listEl.parentNode.insertBefore(bar, listEl);
      bar.addEventListener('click', function (e) {
        var c = e.target.closest('.chip'), m = e.target.closest('.mk');
        if (c) { filter = c.getAttribute('data-f'); drawTools(); applyFilter(); }
        else if (m) markAllRead();
      });
    }
    drawTools();
  }
  function drawTools() {
    var bar = document.getElementById('cn-notif-tools'); if (!bar) return;
    var fs = ['all', 'unread', 'activity', 'orders', 'ann'], h = '';
    fs.forEach(function (f) { h += '<button type="button" class="chip' + (f === filter ? ' on' : '') + '" data-f="' + f + '">' + esc(tx('f_' + (f === 'ann' ? 'ann' : f))) + '</button>'; });
    h += '<button type="button" class="mk">' + esc(tx('markall')) + '</button>';
    bar.innerHTML = h;
  }
  function applyFilter() {
    var listEl = document.getElementById('notif-list'); if (!listEl) return;
    var rows = listEl.querySelectorAll('.notif-row'), visible = 0, visibleUnread = 0;
    rows.forEach(function (row) {
      var isAnn = row.getAttribute('data-announcement') === '1', it = findItem(row.getAttribute('data-id'), isAnn);
      var unread = row.classList.contains('unread'), show = true;
      if (filter === 'unread') show = unread;
      else if (filter !== 'all') show = !!it && catOf(it, isAnn) === filter;
      row.style.display = show ? '' : 'none';
      if (show) { visible++; if (unread) visibleUnread++; }
    });
    listEl.querySelectorAll('.notif-section-header').forEach(function (h) { h.style.display = visibleUnread > 0 ? '' : 'none'; });
    var empty = document.getElementById('cn-notif-empty');
    if (rows.length > 0 && visible === 0) {
      if (!empty) { empty = document.createElement('p'); empty.id = 'cn-notif-empty'; listEl.appendChild(empty); }
      empty.textContent = tx('nonehere');
    } else if (empty && empty.parentNode) empty.parentNode.removeChild(empty);
  }
  if (typeof window.renderNotifPanel === 'function') {
    var origRender = window.renderNotifPanel;
    window.renderNotifPanel = function () {
      var r = origRender.apply(this, arguments);
      try { ensureTools(); applyFilter(); } catch (e) { /* ignore */ }
      return r;
    };
  }
  async function markAllRead() {
    var d = dbx(); if (!d) return;
    try {
      var unread = notifCache.filter(function (n) { return !n.read; });
      for (var i = 0; i < unread.length; i += 400) {
        var b = d.batch();
        unread.slice(i, i + 400).forEach(function (n) { b.update(d.collection('notifications').doc(n.id), { read: true }); });
        await b.commit();
      }
      unread.forEach(function (n) { n.read = true; });
      if (announcementsCache.length > 0) ls('lastSeenAnnouncementAt', announcementsCache[0].createdAt);
      toast(tx('allread'), 'success');
      updateNotifBadge(); renderNotifPanel();
    } catch (e) { try { toast(friendlyErrorMessage(e), 'error'); } catch (x) { /* ignore */ } }
  }
  // Ouvrir le panneau ne marque plus tout comme lu d'un coup : la notification devient « lue »
  // quand on la touche (ou avec « Tout marquer comme lu »), comme sur Facebook / WhatsApp.
  if (typeof window.toggleNotifPanelContent === 'function') {
    window.toggleNotifPanelContent = function () {
      renderNotifPanel();
      try { if (announcementsCache.length > 0) ls('lastSeenAnnouncementAt', announcementsCache[0].createdAt); } catch (e) { /* ignore */ }
      updateNotifBadge();
    };
  }
  if (typeof window.openNotifRow === 'function') {
    var origOpenRow = window.openNotifRow;
    window.openNotifRow = function (id, isAnn) {
      try {
        if (!isAnn) {
          var n = findItem(id, false);
          if (n && !n.read && dbx()) {
            n.read = true;
            dbx().collection('notifications').doc(id).update({ read: true }).catch(function () { n.read = false; });
            updateNotifBadge();
          }
        }
      } catch (e) { /* ignore */ }
      // Les liens ?tab=… des anciennes notifications passent par notre routeur
      try {
        var it = findItem(id, !!isAnn);
        if (it && it.url && /[?&](tab|loc)=/.test(it.url) && !/[?&]open=/.test(it.url)) { openUrl(it.url); return; }
      } catch (e) { /* ignore */ }
      return origOpenRow.apply(this, arguments);
    };
  }

  /* ---------- Démarrage ---------- */
  injectCss();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && cu() && deviceState() === 'granted') syncToken().catch(function () {});
  });
  window.CNPush = { enable: enable, sendTest: sendTest, state: deviceState, openUrl: openUrl, _test: { catOf: catOf, topic: function () { return filter; } } };
})();
