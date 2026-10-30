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
    fr: { ptitle: 'Restez informé', ptext: 'Activez les notifications pour suivre votre activité en temps réel.', pyes: 'Activer', plater: 'Plus tard',
      iostitle: 'Notifications sur iPhone', iostext: 'Touche Partager, puis « Sur l\'écran d\'accueil ». Ouvre ensuite l\'application depuis son icône et reviens ici pour activer les notifications.', iosok: 'Compris',
      cardon: 'Activées sur cet appareil', cardoff: 'Pas encore activées sur cet appareil', cardden: 'Bloquées par ton navigateur', cardnosup: 'Non disponibles sur ce navigateur',
      denhelp: 'Touche le cadenas à côté de l\'adresse (ou ⋮ puis Paramètres du site), choisis Notifications > Autoriser, puis reviens ici.',
      enable: 'Activer les notifications', test: 'Envoyer un test', retry: 'Vérifier à nouveau', on: 'Notifications activées', denied: 'Notifications refusées. Tu peux les réactiver dans les réglages du navigateur.',
      testok: 'Test envoyé ! Regarde ta barre de notifications.', testfail: 'Le test n\'est pas arrivé', nodev: 'Aucun appareil enregistré : touche « Activer les notifications ».',
      f_all: 'Tout', f_unread: 'Non lues', f_activity: 'Activité', f_orders: 'Commandes', f_ann: 'Annonces', markall: 'Tout marquer comme lu', allread: 'Tout est lu', nonehere: 'Rien dans cette catégorie.' },
    en: { ptitle: 'Stay informed', ptext: 'Turn on notifications to follow your activity in real time.', pyes: 'Turn on', plater: 'Not now',
      iostitle: 'Notifications on iPhone', iostext: 'Tap Share, then "Add to Home Screen". Open the app from its icon and come back here to turn notifications on.', iosok: 'Got it',
      cardon: 'On for this device', cardoff: 'Not turned on for this device yet', cardden: 'Blocked by your browser', cardnosup: 'Not available in this browser',
      denhelp: 'Tap the padlock next to the address (or ⋮ then Site settings), choose Notifications > Allow, then come back here.',
      enable: 'Turn on notifications', test: 'Send a test', retry: 'Check again', on: 'Notifications on', denied: 'Notifications were refused. You can turn them on again in your browser settings.',
      testok: 'Test sent! Check your notification bar.', testfail: 'The test did not arrive', nodev: 'No device registered: tap "Turn on notifications".',
      f_all: 'All', f_unread: 'Unread', f_activity: 'Activity', f_orders: 'Orders', f_ann: 'News', markall: 'Mark all as read', allread: 'All read', nonehere: 'Nothing in this category.' },
    es: { ptitle: 'Mantente informado', ptext: 'Activa las notificaciones para seguir tu actividad en tiempo real.', pyes: 'Activar', plater: 'Más tarde',
      iostitle: 'Notificaciones en iPhone', iostext: 'Toca Compartir y luego "Añadir a pantalla de inicio". Abre la app desde su icono y vuelve aquí para activar las notificaciones.', iosok: 'Entendido',
      cardon: 'Activadas en este dispositivo', cardoff: 'Aún no activadas en este dispositivo', cardden: 'Bloqueadas por el navegador', cardnosup: 'No disponibles en este navegador',
      denhelp: 'Toca el candado junto a la dirección (o ⋮ y Ajustes del sitio), elige Notificaciones > Permitir y vuelve aquí.',
      enable: 'Activar notificaciones', test: 'Enviar una prueba', retry: 'Comprobar de nuevo', on: 'Notificaciones activadas', denied: 'Notificaciones rechazadas. Puedes reactivarlas en los ajustes del navegador.',
      testok: '¡Prueba enviada! Mira tu barra de notificaciones.', testfail: 'La prueba no llegó', nodev: 'Ningún dispositivo registrado: toca "Activar notificaciones".',
      f_all: 'Todo', f_unread: 'No leídas', f_activity: 'Actividad', f_orders: 'Pedidos', f_ann: 'Novedades', markall: 'Marcar todo como leído', allread: 'Todo leído', nonehere: 'Nada en esta categoría.' },
    it: { ptitle: 'Resta aggiornato', ptext: 'Attiva le notifiche per seguire la tua attività in tempo reale.', pyes: 'Attiva', plater: 'Più tardi',
      iostitle: 'Notifiche su iPhone', iostext: 'Tocca Condividi, poi "Aggiungi a Home". Apri l\'app dalla sua icona e torna qui per attivare le notifiche.', iosok: 'Ho capito',
      cardon: 'Attive su questo dispositivo', cardoff: 'Non ancora attive su questo dispositivo', cardden: 'Bloccate dal browser', cardnosup: 'Non disponibili su questo browser',
      denhelp: 'Tocca il lucchetto accanto all\'indirizzo (o ⋮ poi Impostazioni sito), scegli Notifiche > Consenti e torna qui.',
      enable: 'Attiva le notifiche', test: 'Invia un test', retry: 'Controlla di nuovo', on: 'Notifiche attive', denied: 'Notifiche rifiutate. Puoi riattivarle nelle impostazioni del browser.',
      testok: 'Test inviato! Guarda la barra delle notifiche.', testfail: 'Il test non è arrivato', nodev: 'Nessun dispositivo registrato: tocca "Attiva le notifiche".',
      f_all: 'Tutte', f_unread: 'Non lette', f_activity: 'Attività', f_orders: 'Ordini', f_ann: 'Novità', markall: 'Segna tutto come letto', allread: 'Tutto letto', nonehere: 'Niente in questa categoria.' },
    pt: { ptitle: 'Fique informado', ptext: 'Ative as notificações para acompanhar sua atividade em tempo real.', pyes: 'Ativar', plater: 'Mais tarde',
      iostitle: 'Notificações no iPhone', iostext: 'Toque em Compartilhar e depois "Adicionar à Tela de Início". Abra o app pelo ícone e volte aqui para ativar as notificações.', iosok: 'Entendi',
      cardon: 'Ativadas neste aparelho', cardoff: 'Ainda não ativadas neste aparelho', cardden: 'Bloqueadas pelo navegador', cardnosup: 'Indisponíveis neste navegador',
      denhelp: 'Toque no cadeado ao lado do endereço (ou ⋮ e Configurações do site), escolha Notificações > Permitir e volte aqui.',
      enable: 'Ativar notificações', test: 'Enviar um teste', retry: 'Verificar de novo', on: 'Notificações ativadas', denied: 'Notificações recusadas. Você pode reativá-las nas configurações do navegador.',
      testok: 'Teste enviado! Veja a barra de notificações.', testfail: 'O teste não chegou', nodev: 'Nenhum aparelho registrado: toque em "Ativar notificações".',
      f_all: 'Tudo', f_unread: 'Não lidas', f_activity: 'Atividade', f_orders: 'Pedidos', f_ann: 'Novidades', markall: 'Marcar tudo como lido', allread: 'Tudo lido', nonehere: 'Nada nesta categoria.' }
  };
  var L10N2 = {
    fr: { subfail: 'Le service de notifications a refusé l\'enregistrement de cet appareil.', notreg: 'Autorisées, mais cet appareil n\'est pas encore enregistré', fix: 'Réparer', fixok: 'Appareil enregistré', fixfail: 'Enregistrement impossible', netblock: 'La connexion au service de notifications a échoué. Vérifie ta connexion internet et réessaie.' },
    en: { subfail: 'The notification service refused to register this device.', notreg: 'Allowed, but this device is not registered yet', fix: 'Repair', fixok: 'Device registered', fixfail: 'Registration failed', netblock: 'Could not reach the notification service. Check your connection and try again.' },
    es: { subfail: 'El servicio de notificaciones rechazó el registro de este dispositivo.', notreg: 'Permitidas, pero este dispositivo aún no está registrado', fix: 'Reparar', fixok: 'Dispositivo registrado', fixfail: 'No se pudo registrar', netblock: 'No se pudo conectar con el servicio de notificaciones. Revisa tu conexión e inténtalo de nuevo.' },
    it: { subfail: 'Il servizio di notifiche ha rifiutato la registrazione di questo dispositivo.', notreg: 'Consentite, ma questo dispositivo non è ancora registrato', fix: 'Ripara', fixok: 'Dispositivo registrato', fixfail: 'Registrazione non riuscita', netblock: 'Impossibile raggiungere il servizio di notifiche. Controlla la connessione e riprova.' },
    pt: { subfail: 'O serviço de notificações recusou o registro deste aparelho.', notreg: 'Permitidas, mas este aparelho ainda não está registrado', fix: 'Reparar', fixok: 'Aparelho registrado', fixfail: 'Falha no registro', netblock: 'Não foi possível acessar o serviço de notificações. Verifique a conexão e tente de novo.' }
  };
  /* Notifications : un seul geste. Si le téléphone les bloque, un message calme (jamais une erreur rouge, jamais une liste de gestes) ;
     seul le navigateur intégré (WhatsApp, TikTok…) propose un bouton « Ouvrir dans Chrome ». */
  var L10N3 = {
    fr: { g_inapp_t: 'Ouvrez dans Chrome', g_inapp_b: 'Les notifications ne fonctionnent pas dans ce navigateur intégré (WhatsApp, Facebook, TikTok…). Ouvrez Coeurnoh Universe dans Chrome, puis activez-les.',
      g_chrome: 'Ouvrir dans Chrome', g_copy: 'Copier le lien', g_copied: 'Lien copié. Collez-le dans Chrome.', g_later: 'Plus tard',
      g_blocked: 'Ton téléphone bloque les notifications pour le moment. Ce n’est pas grave : tout fonctionne. Tu pourras les activer plus tard.',
      g_later_toast: 'D’accord. Vous pourrez les activer quand vous voulez, depuis Notifications.', g_fail: 'L’activation n’a pas abouti. Vérifiez votre connexion internet puis touchez « Réparer ».', g_ok: 'Notifications activées. Merci !' },
    en: { g_inapp_t: 'Open in Chrome', g_inapp_b: 'Notifications do not work in this built-in browser (WhatsApp, Facebook, TikTok…). Open Coeurnoh Universe in Chrome, then turn them on.',
      g_chrome: 'Open in Chrome', g_copy: 'Copy the link', g_copied: 'Link copied. Paste it in Chrome.', g_later: 'Later',
      g_blocked: 'Your phone is blocking notifications for now. No problem: everything works. You can turn them on later.',
      g_later_toast: 'OK. You can turn them on whenever you like, from Notifications.', g_fail: 'Activation did not work. Check your internet connection then tap “Repair”.', g_ok: 'Notifications are on. Thank you!' },
    es: { g_inapp_t: 'Abrir en Chrome', g_inapp_b: 'Las notificaciones no funcionan en este navegador integrado (WhatsApp, Facebook, TikTok…). Abre Coeurnoh Universe en Chrome y actívalas.',
      g_chrome: 'Abrir en Chrome', g_copy: 'Copiar el enlace', g_copied: 'Enlace copiado. Pégalo en Chrome.', g_later: 'Más tarde',
      g_blocked: 'Tu teléfono bloquea las notificaciones por ahora. No pasa nada: todo funciona. Podrás activarlas más tarde.',
      g_later_toast: 'De acuerdo. Podrás activarlas cuando quieras, desde Notificaciones.', g_fail: 'La activación no funcionó. Comprueba tu conexión a internet y toca «Reparar».', g_ok: 'Notificaciones activadas. ¡Gracias!' },
    it: { g_inapp_t: 'Apri in Chrome', g_inapp_b: 'Le notifiche non funzionano in questo browser integrato (WhatsApp, Facebook, TikTok…). Apri Coeurnoh Universe in Chrome, poi attivale.',
      g_chrome: 'Apri in Chrome', g_copy: 'Copia il link', g_copied: 'Link copiato. Incollalo in Chrome.', g_later: 'Più tardi',
      g_blocked: 'Il tuo telefono blocca le notifiche per ora. Nessun problema: tutto funziona. Potrai attivarle più tardi.',
      g_later_toast: 'D’accordo. Potrai attivarle quando vuoi, da Notifiche.', g_fail: 'L’attivazione non è riuscita. Controlla la connessione internet e tocca «Ripara».', g_ok: 'Notifiche attivate. Grazie!' },
    pt: { g_inapp_t: 'Abrir no Chrome', g_inapp_b: 'As notificações não funcionam neste navegador integrado (WhatsApp, Facebook, TikTok…). Abra o Coeurnoh Universe no Chrome e ative-as.',
      g_chrome: 'Abrir no Chrome', g_copy: 'Copiar o link', g_copied: 'Link copiado. Cole-o no Chrome.', g_later: 'Mais tarde',
      g_blocked: 'O teu telemóvel está a bloquear as notificações por agora. Sem problema: tudo funciona. Podes ativá-las mais tarde.',
      g_later_toast: 'Certo. Pode ativá-las quando quiser, em Notificações.', g_fail: 'A ativação não funcionou. Verifique a ligação à internet e toque em «Reparar».', g_ok: 'Notificações ativadas. Obrigado!' }
  };
  function tx3(k) { var o = L10N3[lang()] || L10N3.fr; return o[k] != null ? o[k] : L10N3.fr[k]; }
  function tx2(k) { return (L10N2[lang()] || L10N2.fr)[k]; }
  // Message humain pour les erreurs Firebase les plus fréquentes
  function ico(n) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function humanErr(e) {
    var code = String((e && e.code) || ''), full = String((e && e.message) || e || '');
    var all = code + ' ' + full;
    // Détail renvoyé par Google (ex. clé API bloquée, API désactivée) : indispensable pour diagnostiquer.
    var detail = full.replace(/^(Firebase|Messaging):\s*/i, '').replace(/\s*\(messaging\/[^)]+\)\.?\s*$/i, '').trim().slice(0, 150);
    if (/token-subscribe-failed/i.test(all)) return tx2('subfail') + ' (token-subscribe-failed' + (detail ? ' : ' + detail : '') + ')';
    if (/Failed to fetch|network/i.test(all)) return tx2('netblock') + ' (réseau)';
    return (detail || code || 'erreur').slice(0, 160);
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
      '#cn-push-ask .pi{flex:0 0 auto;width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;background:#d9820a}' +
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
      '#cn-notif-strip{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:10px 12px;border-radius:14px;background:rgba(29,79,168,.09);border:1px solid rgba(29,79,168,.22)}' +
      '#cn-notif-strip .si{width:20px;height:20px;flex:none;color:#1d4fa8}#cn-notif-strip .si svg{width:100%;height:100%}' +
      '#cn-notif-strip p{margin:0;flex:1;font-size:.8rem;line-height:1.35}' +
      '#cn-notif-strip button{flex:none;font:inherit;font-size:.78rem;font-weight:700;padding:7px 12px;border:0;border-radius:999px;background:#1d4fa8;color:#fff;cursor:pointer}' +
      '#cn-notif-tools{display:flex;gap:8px;align-items:center;overflow-x:auto;padding:2px 0 12px;-webkit-overflow-scrolling:touch}' +
      '#cn-notif-tools .chip{flex:0 0 auto;font:inherit;font-size:.85rem;font-weight:700;padding:7px 14px;border-radius:999px;border:1px solid rgba(120,130,150,.35);background:transparent;color:inherit;cursor:pointer}' +
      '#cn-notif-tools .chip.on{background:var(--green,#1f8a4c);border-color:var(--green,#1f8a4c);color:#fff}' +
      '#cn-notif-tools .mk{margin-left:auto;flex:0 0 auto;font:inherit;font-size:.85rem;font-weight:700;padding:7px 12px;border:0;background:transparent;color:var(--green,#1f8a4c);cursor:pointer;white-space:nowrap}' +
      '#cn-notif-empty{padding:16px;opacity:.7;font-size:.9rem}' +
      '#cn-push-guide{position:fixed;inset:0;z-index:9600;background:rgba(10,20,36,.6);display:flex;align-items:flex-end;justify-content:center;font-family:var(--font,system-ui,sans-serif)}' +
      '#cn-push-guide .pg{background:var(--white,#fff);color:var(--ink,#141a26);width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:22px 20px max(22px,env(safe-area-inset-bottom));max-height:92vh;overflow-y:auto}' +
      '@media(min-width:600px){#cn-push-guide{align-items:center}#cn-push-guide .pg{border-radius:20px}}' +
      '#cn-push-guide .gi{width:46px;height:46px;border-radius:14px;background:var(--btn,#28374f);color:var(--on-primary,#fff);display:flex;align-items:center;justify-content:center;margin-bottom:12px}#cn-push-guide .gi svg{width:22px;height:22px}' +
      '#cn-push-guide h3{font-family:var(--font-head,inherit);font-size:1.25rem;line-height:1.25;font-weight:700;margin:0 0 6px}' +
      '#cn-push-guide p{margin:0 0 10px;color:var(--ink-2,#38435a);font-size:.93rem;line-height:1.55}' +
      '#cn-push-guide .ga{display:grid;gap:8px}#cn-push-guide .ga .btn{width:100%;justify-content:center}';
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

  // Premier essai ; s'il échoue (abonnement push périmé ou resté coincé), on nettoie l'ancien
  // jeton et l'ancien abonnement de ce téléphone, puis on réessaie une fois proprement.
  async function fetchToken(messaging, swReg, uid) {
    var opts = { vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: swReg };
    try { return await messaging.getToken(opts); }
    catch (e1) {
      console.log('[push] 1er essai échoué, nettoyage puis nouvel essai :', e1 && e1.code, e1 && e1.message);
      try { await messaging.deleteToken(); } catch (x) { /* ignore */ }
      try { var sub = await swReg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (x) { /* ignore */ }
      if (uid) { ls(tkKey(uid), null); ls(syKey(uid), null); }
      await new Promise(function (r) { setTimeout(r, 500); });
      return await messaging.getToken(opts);
    }
  }

  /* ---------- Secours : abonnement Web Push direct ----------
     Si le service d'enregistrement Firebase est bloqué sur ce téléphone (« Failed to fetch »),
     on s'abonne directement au service de notifications du navigateur. Le serveur sait envoyer
     aux deux types d'appareils (voir api/_lib/push.js). */
  var WEBPUSH_PUBLIC_KEY = 'BIQpKN1qPHEzJnDizdWaIRURPga7AHTAprmem9PYHMymy0V2TD4vu0XdGo1O0fEwrWz2z1SDXC6OTqt2BKVRwlc';
  function b64uToBytes(str) {
    var pad = '='.repeat((4 - str.length % 4) % 4), b = (str + pad).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(b), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function bytesToB64u(bytes) {
    var bin = ''; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function webPushToken(swReg) {
    var key = b64uToBytes(WEBPUSH_PUBLIC_KEY);
    var sub = await swReg.pushManager.getSubscription();
    if (sub) {
      var same = false;
      try { var cur = new Uint8Array(sub.options.applicationServerKey || []); same = cur.length === key.length && cur.every(function (v, i) { return v === key[i]; }); } catch (e) { /* ignore */ }
      if (!same) { try { await sub.unsubscribe(); } catch (e) { /* ignore */ } sub = null; }
    }
    if (!sub) sub = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    return 'wp1:' + bytesToB64u(new TextEncoder().encode(JSON.stringify(sub.toJSON())));
  }

  async function syncToken() {
    var u = cu(), d = dbx();
    if (!u || !d || !supported() || Notification.permission !== 'granted') return false;
    var messaging = firebase.messaging();
    var swReg = await navigator.serviceWorker.ready;
    var stored = ls(tkKey(u.uid)) || '';
    var wpMode = stored.indexOf('wp1:') === 0;
    var retryKey = 'cn_fcm_retry:' + u.uid;
    var retryAt = parseInt(ls(retryKey) || '0', 10) || 0;
    var token = null, fcmErr = null;

    // Déjà en mode secours : on ne réessaie Firebase qu'une fois par semaine.
    if (wpMode && Date.now() - retryAt < 7 * DAY) { try { token = await webPushToken(swReg); } catch (e) { token = null; } }
    if (!token) {
      if (wpMode) { ls(retryKey, String(Date.now())); try { var s0 = await swReg.pushManager.getSubscription(); if (s0) await s0.unsubscribe(); } catch (e) { /* ignore */ } }
      try { token = await fetchToken(messaging, swReg, u.uid); } catch (e) { fcmErr = e; token = null; }
    }
    if (!token) {
      try { token = await webPushToken(swReg); ls(retryKey, String(Date.now())); }
      catch (e2) { throw fcmErr || e2; }
    }
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
    if (tok && tok.indexOf('wp1:') === 0) { try { var rg = await navigator.serviceWorker.ready; var sb = await rg.pushManager.getSubscription(); if (sb) await sb.unsubscribe(); } catch (e) { /* ignore */ } return; }
    try { if (supported()) await firebase.messaging().deleteToken(); } catch (e) { /* ignore */ }
  }

  /* ---------- Navigateur intégré + retour automatique ---------- */
  function inAppBrowser() { return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|MicroMessenger|Telegram|Twitter|; wv\)/i.test(navigator.userAgent || ''); }
  function closeGuide() { var g = document.getElementById('cn-push-guide'); if (g && g.parentNode) g.parentNode.removeChild(g); }
  // Seul cas où une fenêtre s'ouvre : les notifications sont IMPOSSIBLES dans le navigateur intégré (WhatsApp, TikTok…) ;
  // un bouton ouvre l'application dans Chrome. Dans tous les autres cas : aucune fenêtre, aucune liste de gestes.
  function showGuide() {
    closeGuide(); injectCss();
    var el = document.createElement('div'); el.id = 'cn-push-guide'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    var android = /Android/i.test(navigator.userAgent || '');
    el.innerHTML = '<div class="pg"><div class="gi">' + BELL + '</div><h3>' + esc(tx3('g_inapp_t')) + '</h3><p>' + esc(tx3('g_inapp_b')) + '</p><div class="ga">' +
      (android ? '<button type="button" class="btn btn-primary" data-g="chrome">' + esc(tx3('g_chrome')) + '</button>' : '') +
      '<button type="button" class="btn ' + (android ? 'btn-outline' : 'btn-primary') + '" data-g="copy">' + esc(tx3('g_copy')) + '</button>' +
      '<button type="button" class="btn btn-outline" data-g="later">' + esc(tx3('g_later')) + '</button></div></div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-g]');
      if (!b) { if (e.target === el) closeGuide(); return; }
      var a = b.getAttribute('data-g');
      if (a === 'later') { snooze(); closeGuide(); }
      else if (a === 'chrome') { try { location.href = 'intent://' + location.host + location.pathname + location.search + '#Intent;scheme=https;package=com.android.chrome;end'; } catch (x) { /* ignore */ } }
      else if (a === 'copy') {
        var url = location.origin + '/';
        try { navigator.clipboard.writeText(url).then(function () { toast(tx3('g_copied'), 'success'); }, function () { toast(url, 'info'); }); } catch (x) { toast(url, 'info'); }
      }
    });
    document.body.appendChild(el);
  }
  // Le téléphone bloque : UN message calme (pas d'erreur rouge), plus aucune invitation avant 7 jours. Si la personne autorise
  // ensuite dans les réglages de son téléphone, l'application le voit dès son retour et termine l'activation toute seule.
  var waitGrant = false;
  function blockedCalm() {
    waitGrant = true;
    toast(tx3('g_blocked'), 'info');
    ls('cn_push_snooze', String(Date.now() + 7 * DAY));
  }
  // Retour dans l'application : activation terminée sans rien demander de plus ; la carte des Paramètres se met à jour.
  function autoFinish() {
    if (typeof Notification === 'undefined') return;
    if (waitGrant && Notification.permission === 'granted') { waitGrant = false; closeGuide(); finishEnable(); }
    else if (document.getElementById('cn-push-card')) refreshCard();
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') autoFinish(); });
  window.addEventListener('focus', autoFinish);
  // Bouton « Vérifier à nouveau » : un seul geste, sans message d'erreur.
  function recheck() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { waitGrant = false; return finishEnable(); }
    toast(tx3('g_blocked'), 'info'); refreshCard();
    return Promise.resolve();
  }

  /* ---------- Activation (toujours déclenchée par un toucher) ---------- */
  async function finishEnable() {
    hideAsk();
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
    } catch (e) { console.log('[push] activation :', e && e.message); toast(tx3('g_fail') + ' (' + humanErr(e).slice(0, 60) + ')', 'error'); }
    refreshCard();
  }
  async function enable() {
    var st = deviceState();
    if (st === 'ios-install') { showIosHelp(); return 'ios-install'; }
    if (st === 'unsupported') { if (inAppBrowser()) showGuide(); else toast(tx('cardnosup'), 'info'); refreshCard(); return 'unsupported'; }
    if (st === 'denied') { hideAsk(); blockedCalm(); refreshCard(); return 'denied'; }
    var perm = Notification.permission, t0 = Date.now();
    if (perm !== 'granted') { try { perm = await Notification.requestPermission(); } catch (e) { perm = Notification.permission; } }
    hideAsk();
    if (perm !== 'granted') {
      // « Fermé sans répondre » n'est PAS un refus : on laisse la personne choisir son moment (aucun réglage évoqué).
      // Refus, ou réponse immédiate sans fenêtre affichée (le téléphone a bloqué la demande) : message calme, sans liste de gestes.
      if (perm === 'denied' || Date.now() - t0 < 700) blockedCalm();
      else { toast(tx3('g_later_toast'), 'info'); snooze(); }
      refreshCard(); return perm;
    }
    await finishEnable();
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
    ls('cn_push_snooze', String(Date.now() + (n >= 3 ? 7 : 1) * DAY));
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
    // Nouveau compte (moins de 15 minutes) : on propose plus vite, c'est le moment où la personne est la plus attentive.
    var fresh = false;
    try { var ca = cu() && cu().createdAt ? new Date(cu().createdAt).getTime() : 0; fresh = ca > 0 && Date.now() - ca < 15 * 60000; } catch (e) { /* ignore */ }
    setTimeout(function () {
      if (!cu() || document.visibilityState !== 'visible') return;
      var s = deviceState();
      if (s === 'default') showAsk(false); else if (s === 'ios-install') showAsk(true);
    }, fresh ? 3000 : 7000);
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
        if (b.id === 'cn-push-enable') enable(); else if (b.id === 'cn-push-inapp-btn') showGuide(); else if (b.id === 'cn-push-test') sendTest(); else if (b.id === 'cn-push-retry') recheck();
        else if (b.id === 'cn-push-fix') { b.disabled = true; syncToken().then(function (ok) { toast(ok ? tx2('fixok') : tx2('fixfail'), ok ? 'success' : 'error'); }).catch(function (e) { toast(tx2('fixfail') + ' — ' + humanErr(e), 'error'); }).then(function () { refreshCard(); }); }
      });
    }
    var st = deviceState(), h = '';
    var u0 = cu(), registered = !!(u0 && ls(tkKey(u0.uid)));
    if (st === 'granted' && registered) h = '<div class="st">' + ico('bell') + ' ' + esc(tx('cardon')) + '</div><div class="row"><button type="button" class="btn btn-outline btn-sm" id="cn-push-test">' + esc(tx('test')) + '</button></div>';
    else if (st === 'granted') h = '<div class="st">' + ico('alert') + ' ' + esc(tx2('notreg')) + '</div><div class="row"><button type="button" class="btn btn-primary btn-sm" id="cn-push-fix">' + esc(tx2('fix')) + '</button></div>';
    else if (st === 'default') h = '<div class="st">' + ico('bellOff') + ' ' + esc(tx('cardoff')) + '</div><div class="row"><button type="button" class="btn btn-primary btn-sm" id="cn-push-enable">' + esc(tx('enable')) + '</button></div>';
    else if (st === 'denied') h = '<div class="st">' + ico('ban') + ' ' + esc(tx('cardden')) + '</div><div class="hp">' + esc(tx('denhelp')) + '</div><div class="row"><button type="button" class="btn btn-outline btn-sm" id="cn-push-retry">' + esc(tx('retry')) + '</button></div>';
    else if (st === 'ios-install') h = '<div class="st">' + ico('bellOff') + ' ' + esc(tx('iostitle')) + '</div><div class="hp">' + esc(tx('iostext')) + '</div>';
    else h = '<div class="st">' + ico('bellOff') + ' ' + esc(tx('cardnosup')) + '</div>' + (inAppBrowser() ? '<div class="row"><button type="button" class="btn btn-primary btn-sm" id="cn-push-inapp-btn">' + esc(tx3('g_chrome')) + '</button></div>' : '');
    card.innerHTML = h;
  }

  /* ---------- Remplacement de l'enregistrement automatique ---------- */
  window.registerPushNotifications = async function () {
    if (!cu()) return;
    try { setTimeout(flushPending, 700); } catch (e) { /* ignore */ }
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
  // Lien en attente : si, au moment du toucher, la personne n'est pas encore reconnue (page en cours de
  // chargement, session en cours de restauration) ou n'est réellement plus connectée, on GARDE le lien et on
  // l'ouvre dès que le compte est prêt. Jamais de déconnexion, jamais de redirection forcée vers la connexion.
  var PENDING_KEY = 'cn_pending_open', pendTimer = null;
  function setPending(rel) { try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ u: String(rel || '/'), t: Date.now() })); } catch (e) { /* ignore */ } }
  function takePending() {
    try {
      var o = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
      sessionStorage.removeItem(PENDING_KEY);
      if (o && o.u && Date.now() - o.t < 30 * 60 * 1000) return o.u;
    } catch (e) { /* ignore */ }
    return null;
  }
  function flushPending() { if (!cu()) return; var u = takePending(); if (u) openUrl(u); }
  function waitForUser() {
    if (pendTimer) return;
    var tries = 0;
    pendTimer = setInterval(function () {
      tries++;
      if (cu()) { clearInterval(pendTimer); pendTimer = null; flushPending(); }
      else if (tries > 60) { clearInterval(pendTimer); pendTimer = null; } // 15 s ; le lien reste gardé jusqu'à la prochaine connexion
    }, 250);
  }
  function openUrl(rel) {
    if (!cu()) { setPending(rel); waitForUser(); return; }
    try {
      var u = new URL(rel || '/', location.origin), p = u.searchParams;
      var leads = p.get('leads');
      var msg = p.get('msg'), call = p.get('call');
      if (msg && typeof openMessagesFromLink === 'function') { window.__cnFocusReply = p.get('reply') === '1'; openMessagesFromLink(msg); return; }
      if (call && typeof openCallFromLink === 'function') { openCallFromLink(call); return; }
      if (leads && typeof openLeadsManager === 'function') { openLeadsManager(leads === 'biz' ? 'biz' : 'site', 'appointment'); return; }
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
      if (e && e.data && e.data.type === 'cn-open') {
        // Accusé de réception : le service worker sait que la page est bien vivante et n'a pas besoin de la recharger.
        try { if (e.ports && e.ports[0]) e.ports[0].postMessage('ok'); } catch (x) { /* ignore */ }
        openUrl(e.data.url);
      }
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
    drawStrip(bar);
  }
  // Bandeau permanent dans le centre de notifications : tant que les notifications ne sont pas
  // actives sur cet appareil, la personne peut les activer en un geste (la carte d'invitation, elle,
  // est repoussee de 1 jour apres « Plus tard »).
  function drawStrip(bar) {
    var st = deviceState(), strip = document.getElementById('cn-notif-strip');
    var inapp = st === 'unsupported' && inAppBrowser();
    var need = st === 'default' || st === 'denied' || inapp || (st === 'granted' && !(cu() && ls(tkKey(cu().uid))));
    if (!need) { if (strip && strip.parentNode) strip.parentNode.removeChild(strip); return; }
    if (!strip) {
      strip = document.createElement('div'); strip.id = 'cn-notif-strip';
      bar.parentNode.insertBefore(strip, bar);
      strip.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var act = b.getAttribute('data-a');
        if (act === 'fix') { b.disabled = true; syncToken().catch(function () {}).then(function () { drawStrip(bar); }); }
        else if (act === 'guide') showGuide();
        else if (act === 'recheck') recheck().then(function () { drawStrip(bar); });
        else enable();
      });
    }
    var txt = st === 'denied' ? tx('denhelp') : (inapp ? tx3('g_inapp_t') : (st === 'granted' ? tx2('notreg') : tx('ptext')));
    var btn = inapp ? '<button type="button" data-a="guide">' + esc(tx3('g_chrome')) + '</button>' :
      '<button type="button" data-a="' + (st === 'denied' ? 'recheck' : (st === 'granted' ? 'fix' : 'on')) + '">' + esc(st === 'denied' ? tx('retry') : (st === 'granted' ? tx2('fix') : tx('enable'))) + '</button>';
    strip.innerHTML = '<span class="si">' + BELL + '</span><p>' + esc(txt) + '</p>' + btn;
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
        if (it && it.url && /[?&](tab|loc)=/.test(it.url) && !/[?&](open|profile)=/.test(it.url)) { openUrl(it.url); return; }
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
