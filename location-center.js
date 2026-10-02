/* =====================================================================
   location-center.js — Centre de localisation et de sécurité
   Coeurnoh Universe · chargé à la demande par menu-pro.js (outil
   « Centre de localisation » de la Boîte à outils). Aucun autre fichier
   existant n'a besoin d'être modifié pour qu'il fonctionne, à part
   vercel.json (autorisations navigateur) et firestore.rules.

   Principes : l'utilisateur contrôle sa position. Rien n'est envoyé au
   serveur tant qu'il ne partage pas, n'active pas le SOS, ni le suivi
   d'appareil, ni l'historique. Aucune position n'est inventée.

   Réglages faciles à modifier : objet CFG juste en dessous.
   ===================================================================== */
(function () {
  'use strict';

  var root = window;
  if (root.LocationCenter) return;

  /* ------------------------------------------------------------------
     RÉGLAGES (modifiables ici, sans toucher au reste)
     ------------------------------------------------------------------ */
  var CFG = {
    LEAFLET_JS: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
    LEAFLET_CSS: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    TILES: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    // Écritures Firestore (partage / suivi d'appareil) : au plus 1 écriture
    // par MIN_INTERVAL_MS, et seulement si on a bougé d'au moins
    // MIN_DISTANCE_M — sinon un simple « battement de cœur » toutes les
    // HEARTBEAT_MS pour prouver que l'appareil est vivant.
    MIN_DISTANCE_M: 30,
    MIN_INTERVAL_MS: 30000,
    HEARTBEAT_MS: 300000,
    // SOS : plus fréquent, car c'est une urgence.
    SOS_INTERVAL_MS: 20000,
    SOS_MIN_DIST_M: 10,
    // Historique (désactivé par défaut)
    HISTORY_MIN_DIST_M: 100,
    HISTORY_INTERVALS_MIN: [5, 15, 30],
    HISTORY_RETENTIONS_DAYS: [3, 7, 30],
    HISTORY_SHOW: 50,
    // Appareil considéré « en ligne » s'il a donné signe de vie récemment
    ONLINE_WINDOW_MS: 10 * 60000,
    MAX_CONTACTS: 5,
    MAX_SHARES: 10,
    MAX_SOS_WATCH: 10,
    GEOCODE_MIN_MOVE_M: 150,
    GEOCODE_URL: 'https://nominatim.openstreetmap.org/reverse'
  };

  var LS_CFG = 'cn_loc_cfg_v1';      // réglages locaux de l'appareil
  var LS_CONSENT = 'cn_loc_consent'; // a lu l'explication de permission
  var LS_LAST = 'cn_loc_last';       // dernière position vue sur cet appareil
  var LS_DEV = 'cn_loc_dev';         // identifiant local de l'appareil
  var LS_TRACK = 'cn_loc_boot';      // lu par menu-pro.js : charger ce module au démarrage si un suivi/partage/SOS est actif

  /* ------------------------------------------------------------------
     TEXTES (fr + en ; es/it/pt retombent sur l'anglais)
     ------------------------------------------------------------------ */
  var X = {
    title: ['Centre de localisation', 'Location center'],
    tab_pos: ['Position', 'Position'], tab_share: ['Partage', 'Sharing'], tab_sec: ['Sécurité', 'Safety'],
    tab_dev: ['Appareils', 'Devices'], tab_hist: ['Historique', 'History'], tab_priv: ['Confidentialité', 'Privacy'],
    close: ['Fermer', 'Close'], recenter: ['Recentrer', 'Recenter'], cancel: ['Annuler', 'Cancel'], loading: ['Chargement…', 'Loading…'],
    consent_title: ['Autoriser la localisation', 'Allow location'],
    consent_text: ["Cette autorisation permet à l'application d'utiliser la position GPS de votre appareil pour afficher votre position, activer le partage de localisation et les fonctions de sécurité que vous choisissez. Rien n'est partagé sans votre action.", "This permission lets the app use your device's GPS position to show where you are and to enable the location sharing and safety features you choose. Nothing is shared without your action."],
    consent_btn: ['Continuer', 'Continue'],
    st_idle: ['Localisation désactivée', 'Location off'], st_locating: ['Recherche de la position…', 'Finding your position…'],
    st_active: ['Position active', 'Position active'], st_denied: ['Permission refusée', 'Permission denied'],
    st_unavailable: ['Position indisponible', 'Position unavailable'], st_timeout: ['Délai dépassé', 'Timed out'],
    st_unsupported: ['Navigateur incompatible', 'Unsupported browser'], st_insecure: ['Connexion non sécurisée', 'Insecure connection'],
    err_denied: ["La localisation est refusée ou bloquée pour cette application. Autorise-la dans les réglages du navigateur (cadenas ▸ Autorisations ▸ Position), puis réessaie. L'application reste utilisable sans.", 'Location is denied or blocked for this app. Allow it in your browser settings (lock icon ▸ Permissions ▸ Location), then try again. The app still works without it.'],
    err_unavailable: ["Ton appareil n'arrive pas à déterminer sa position. Vérifie que le GPS est activé et que tu as du réseau, puis réessaie.", "Your device can't determine its position. Check that GPS is on and you have a connection, then try again."],
    err_timeout: ['La position met trop de temps à arriver. Essaie à l\'extérieur ou près d\'une fenêtre.', 'Your position is taking too long. Try outdoors or near a window.'],
    err_unsupported: ['Ce navigateur ne gère pas la géolocalisation. Essaie Chrome, Safari ou Firefox à jour.', "This browser doesn't support geolocation. Try an up-to-date Chrome, Safari or Firefox."],
    err_insecure: ['La géolocalisation exige une connexion sécurisée (HTTPS).', 'Geolocation requires a secure (HTTPS) connection.'],
    err_generic: ['Une erreur est survenue. Réessaie.', 'Something went wrong. Please try again.'],
    err_perm: ['Action refusée par les règles de sécurité.', 'Action refused by the security rules.'],
    err_index: ['Index Firestore manquant : voir la console du navigateur.', 'Missing Firestore index: see the browser console.'],
    btn_start: ['Activer ma position', 'Turn on my position'], btn_stop: ['Arrêter', 'Stop'], btn_refresh: ['Actualiser la position', 'Refresh position'],
    lbl_lat: ['Latitude', 'Latitude'], lbl_lng: ['Longitude', 'Longitude'], lbl_acc: ['Précision', 'Accuracy'],
    lbl_upd: ['Dernière mise à jour', 'Last update'], lbl_addr: ['Adresse approximative', 'Approximate address'],
    acc_low: ['Précision faible : ta vraie position peut se trouver n\'importe où dans le cercle.', 'Low accuracy: your real position may be anywhere inside the circle.'],
    no_pos: ["Aucune position pour l'instant.", 'No position yet.'],
    last_known: ['Dernière position connue : {ago}', 'Last known position: {ago}'],
    addr_none: ['Adresse indisponible', 'Address unavailable'], addr_wait: ['Recherche de l\'adresse…', 'Looking up address…'],
    ago_now: ["à l'instant", 'just now'], ago_min: ['il y a {n} min', '{n} min ago'], ago_h: ['il y a {n} h', '{n} h ago'], ago_d: ['il y a {n} j', '{n} d ago'],
    sh_banner: ['Votre localisation est actuellement partagée avec {names}.', 'Your location is currently shared with {names}.'],
    sh_none: ['Tu ne partages ta position avec personne.', "You're not sharing your position with anyone."],
    sh_new: ['Partager ma position', 'Share my position'], sh_user_ph: ["Nom d'utilisateur (ex : coeurnoh)", 'Username (e.g. coeurnoh)'],
    dur_15: ['15 minutes', '15 minutes'], dur_60: ['1 heure', '1 hour'], dur_480: ['8 heures', '8 hours'], dur_0: ["Jusqu'à arrêt manuel", 'Until I stop it'],
    sh_btn_share: ['Partager', 'Share'], sh_btn_ask: ['Demander sa position', 'Ask for their position'],
    sh_stop: ['Arrêter', 'Stop'], sh_stop_all: ['Tout arrêter', 'Stop all'],
    sh_remaining: ['reste {t}', '{t} left'], sh_manual: ["jusqu'à arrêt manuel", 'until stopped'],
    sh_req_in: ['Demandes reçues', 'Requests received'], sh_req_in_txt: ['{name} souhaite voir ta position.', '{name} wants to see your position.'],
    sh_accept: ['Accepter', 'Accept'], sh_decline: ['Refuser', 'Decline'],
    sh_with_me: ['Positions partagées avec moi', 'Positions shared with me'], sh_with_me_empty: ['Personne ne partage sa position avec toi pour le moment.', 'Nobody is sharing their position with you right now.'],
    sh_out: ['Je partage avec', 'I share with'], sh_sent: ['Demandes envoyées', 'Requests sent'], sh_cancel: ['Annuler', 'Cancel'], sh_waiting: ['en attente de réponse', 'waiting for a reply'],
    sh_info: ["Le partage met ta position à jour tant que cette application est ouverte sur ton appareil.", 'Sharing keeps your position updated while this app is open on your device.'],
    sh_peer_nopos: ['position pas encore reçue', 'position not received yet'],
    user_notfound: ["Utilisateur introuvable. Vérifie le nom d'utilisateur.", 'User not found. Check the username.'],
    user_self: ['Tu ne peux pas choisir ton propre compte.', "You can't pick your own account."],
    sh_done: ['Partage activé.', 'Sharing started.'], sh_asked: ['Demande envoyée.', 'Request sent.'], sh_stopped: ['Partage arrêté.', 'Sharing stopped.'],
    limit: ['Limite atteinte.', 'Limit reached.'], pos_wait: ["Active d'abord ta position (onglet Position).", 'Turn on your position first (Position tab).'],
    sh_notif_title: ['Localisation partagée', 'Location shared'], sh_notif_body: ['{name} partage sa position avec toi.', '{name} is sharing their position with you.'],
    sh_ask_title: ['Demande de localisation', 'Location request'], sh_ask_body: ['{name} te demande de partager ta position.', '{name} asks you to share your position.'],
    sos_title: ['Mode urgence SOS', 'SOS emergency mode'], sos_btn: ['SOS', 'SOS'],
    sos_desc: ["Partage ta position uniquement avec tes contacts d'urgence qui ont accepté.", 'Shares your position only with emergency contacts who accepted.'],
    sos_confirm_title: ['ACTIVER LE MODE SOS', 'ACTIVATE SOS MODE'], sos_confirm_text: ["Votre position sera partagée avec vos contacts d'urgence.", 'Your position will be shared with your emergency contacts.'],
    sos_confirm_none: ["Aucun contact d'urgence n'a encore accepté : personne ne sera alerté.", 'No emergency contact has accepted yet: nobody will be alerted.'],
    sos_confirm_yes: ['Activer le SOS', 'Activate SOS'],
    sos_active: ['MODE SOS ACTIF depuis {ago}', 'SOS MODE ACTIVE since {ago}'], sos_off: ['DÉSACTIVER LE SOS', 'DEACTIVATE SOS'],
    sos_on_toast: ['SOS activé.', 'SOS activated.'], sos_off_toast: ['SOS désactivé.', 'SOS deactivated.'],
    sos_notif_title: ['🚨 SOS — {name}', '🚨 SOS — {name}'], sos_notif_body: ["{name} a activé le mode urgence. Ouvre le Centre de localisation pour voir sa position.", '{name} activated emergency mode. Open the Location center to see their position.'],
    sos_end_title: ['SOS terminé', 'SOS ended'], sos_end_body: ['{name} a désactivé le mode urgence.', '{name} turned off emergency mode.'],
    sos_others: ['Alertes SOS de mes proches', "My loved ones' SOS alerts"], sos_others_none: ['Aucune alerte en cours.', 'No alert right now.'],
    sos_since: ['depuis {ago}', 'since {ago}'], sos_ended: ['terminé', 'ended'],
    sos_nopos_warn: ["Position introuvable pour l'instant : le SOS est actif et se mettra à jour dès qu'une position arrive.", 'Position not found yet: SOS is active and will update as soon as a position arrives.'],
    ec_title: ["Contacts d'urgence", 'Emergency contacts'], ec_add: ['Inviter', 'Invite'], ec_pending: ['en attente', 'pending'], ec_accepted: ['accepté', 'accepted'],
    ec_remove: ['Retirer', 'Remove'], ec_invites: ['Invitations reçues', 'Invitations received'], ec_empty: ["Aucun contact d'urgence.", 'No emergency contacts.'],
    ec_limit: ['5 contacts maximum.', 'Maximum 5 contacts.'], ec_invite_txt: ["{name} veut t'ajouter comme contact d'urgence.", '{name} wants to add you as an emergency contact.'],
    ec_notif_title: ["Contact d'urgence", 'Emergency contact'], ec_notif_body: ["{name} souhaite t'ajouter comme contact d'urgence.", '{name} would like to add you as an emergency contact.'],
    ec_sent: ['Invitation envoyée.', 'Invitation sent.'],
    dv_title: ['Mes appareils', 'My devices'], dv_this: ['Cet appareil', 'This device'], dv_online: ['En ligne', 'Online'], dv_offline: ['Hors ligne', 'Offline'],
    dv_battery: ['Batterie {n} %', 'Battery {n}%'], dv_track: ['Suivre cet appareil', 'Track this device'],
    dv_track_help: ["Met à jour la dernière position de cet appareil quand l'application est ouverte, pour pouvoir le retrouver plus tard.", "Updates this device's last position while the app is open, so you can find it later."],
    dv_ask: ['Demander une actualisation', 'Request a refresh'], dv_ask_sent: ["Demande envoyée. Elle n'aboutit que si l'appareil a l'application ouverte avec le suivi activé.", 'Request sent. It only works if the device has the app open with tracking on.'],
    dv_rename: ['Renommer', 'Rename'], dv_remove: ['Supprimer', 'Delete'], dv_view: ['Voir sur la carte', 'Show on map'],
    dv_empty: ['Aucun appareil enregistré. Active « Suivre cet appareil » sur chacun de tes appareils.', 'No device saved. Turn on “Track this device” on each of your devices.'],
    dv_limits: ["Limite technique : un navigateur ne peut pas être réveillé à distance. La dernière position affichée est celle reçue quand l'application était ouverte.", "Technical limit: a browser can't be woken remotely. The last position shown is the one received while the app was open."],
    dv_nopos: ['Aucune position reçue.', 'No position received.'], dv_name_prompt: ["Nom de l'appareil", 'Device name'],
    dv_lastseen: ['Dernière activité : {ago}', 'Last seen: {ago}'], dv_lastpos: ['Dernière position connue : {ago}', 'Last known position: {ago}'],
    hi_title: ['Historique de mes positions', 'My position history'], hi_off: ["L'historique est désactivé. Tu peux l'activer dans Confidentialité.", 'History is off. You can turn it on in Privacy.'],
    hi_empty: ['Aucune position enregistrée.', 'No position saved.'], hi_clear: ['Effacer mon historique', 'Clear my history'], hi_cleared: ['Historique effacé.', 'History cleared.'],
    hi_rule: ['Une position toutes les {n} min au plus, seulement si tu as bougé d\'au moins {m} m. Supprimée après {d} jours.', 'At most one position every {n} min, only if you moved at least {m} m. Deleted after {d} days.'],
    pv_title: ['Ce qui est collecté et pourquoi', 'What is collected and why'],
    pv_1: ["Ta position GPS : uniquement pour l'afficher sur la carte quand ce centre est ouvert. Rien n'est envoyé à nos serveurs tant que tu ne partages pas, n'actives pas le SOS, le suivi d'appareil ou l'historique.", 'Your GPS position: only to show it on the map while this center is open. Nothing is sent to our servers until you share, turn on SOS, device tracking or history.'],
    pv_2: ["Partage : ta dernière position est visible uniquement par les personnes que tu choisis, pendant la durée choisie. Tu peux arrêter à tout moment.", 'Sharing: your latest position is visible only to the people you choose, for the duration you choose. You can stop anytime.'],
    pv_3: ["SOS : position et heure partagées avec tes contacts d'urgence qui ont accepté, tant que le SOS est actif.", 'SOS: position and time shared with emergency contacts who accepted, while SOS is active.'],
    pv_4: ['Appareil : dernière position, heure et niveau de batterie (si disponible), visibles par toi seul.', 'Device: last position, time and battery level (if available), visible only to you.'],
    pv_5: ["Historique : désactivé par défaut, visible par toi seul, positions espacées et supprimées automatiquement.", 'History: off by default, visible only to you, spaced out and deleted automatically.'],
    pv_6: ["Adresse et carte : les coordonnées sont envoyées à OpenStreetMap (Nominatim) pour afficher l'adresse, et le fond de carte vient d'OpenStreetMap.", 'Address and map: coordinates are sent to OpenStreetMap (Nominatim) to show the address, and the base map comes from OpenStreetMap.'],
    pv_history: ['Enregistrer un historique', 'Save a history'], pv_every: ['Fréquence', 'Frequency'], pv_keep: ['Conservation', 'Retention'],
    pv_delete_all: ['Supprimer toutes mes données de localisation', 'Delete all my location data'],
    pv_delete_confirm: ["Supprimer définitivement ton historique, tes appareils, tes partages, tes contacts d'urgence et ta session SOS ?", 'Permanently delete your history, devices, shares, emergency contacts and SOS session?'],
    pv_deleted: ['Données de localisation supprimées.', 'Location data deleted.'],
    min_unit: ['min', 'min'], day_unit: ['jours', 'days'],
    map_fallback: ["La carte n'a pas pu se charger (réseau ?). Voici tes coordonnées :", "The map couldn't load (network?). Here are your coordinates:"],
    open_osm: ['Ouvrir dans OpenStreetMap', 'Open in OpenStreetMap'],
    login_needed: ['Connecte-toi pour utiliser le Centre de localisation.', 'Sign in to use the Location center.']
  };

  function langIdx() {
    var l = 'fr';
    try { if (typeof currentLang !== 'undefined' && currentLang) l = currentLang; } catch (e) { /* ignore */ }
    return l === 'fr' ? 0 : 1;
  }
  function T(key, vars) {
    var a = X[key];
    var s = a ? (a[langIdx()] || a[0]) : key;
    if (vars) for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  }

  /* ------------------------------------------------------------------
     OUTILS
     ------------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function getDb() { try { return (typeof db !== 'undefined') ? db : null; } catch (e) { return null; } }
  function getMe() { try { return (typeof currentUser !== 'undefined') ? currentUser : null; } catch (e) { return null; } }
  function myUid() { var u = getMe(); return u && u.uid ? u.uid : null; }
  function myName() { var u = getMe(); return (u && u.name) || 'Coeurnoh'; }
  function now() { return Date.now(); }

  function haversine(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function validCoords(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
  function ago(ms) {
    if (!ms) return '—';
    var d = Math.max(0, now() - ms), m = Math.floor(d / 60000);
    if (m < 1) return T('ago_now');
    if (m < 60) return T('ago_min', { n: m });
    var h = Math.floor(m / 60);
    if (h < 48) return T('ago_h', { n: h });
    return T('ago_d', { n: Math.floor(h / 24) });
  }
  function remaining(expMs) {
    if (!expMs) return T('sh_manual');
    var m = Math.max(0, Math.ceil((expMs - now()) / 60000));
    var t = m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '') : m + ' min';
    return T('sh_remaining', { t: t.trim() });
  }
  function fmtTime(ms) {
    try { return new Date(ms).toLocaleString(langIdx() === 0 ? 'fr-FR' : undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return new Date(ms).toISOString(); }
  }
  function fmtCoord(n) { return (typeof n === 'number') ? n.toFixed(5) : '—'; }
  function fmtAcc(a) { return (typeof a === 'number') ? '± ' + Math.round(a) + ' m' : '—'; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function toastLC(msg, kind) {
    var host = $('lc-toast');
    if (!host) { try { if (typeof showToast === 'function') showToast(msg, kind || 'info'); } catch (e) { /* ignore */ } return; }
    var el = document.createElement('div');
    el.className = 'lc-toast-item' + (kind === 'error' ? ' err' : '');
    el.textContent = msg;
    while (host.children.length >= 3) host.removeChild(host.firstChild);
    host.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, 3200);
  }
  function errText(e) {
    var c = e && e.code;
    if (c === 'permission-denied') return T('err_perm');
    if (c === 'failed-precondition') return T('err_index');
    return T('err_generic');
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function loadCss(href) {
    if (document.querySelector('link[data-lc]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-lc', '1');
    document.head.appendChild(l);
  }

  /* Réglages locaux de cet appareil */
  var cfg = { track: false, history: false, historyMin: 15, retention: 7 };
  (function loadCfg() {
    try { var o = JSON.parse(lsGet(LS_CFG) || '{}'); for (var k in cfg) if (o[k] !== undefined) cfg[k] = o[k]; } catch (e) { /* ignore */ }
    if (CFG.HISTORY_INTERVALS_MIN.indexOf(cfg.historyMin) < 0) cfg.historyMin = 15;
    if (CFG.HISTORY_RETENTIONS_DAYS.indexOf(cfg.retention) < 0) cfg.retention = 7;
  })();
  function saveCfg() { lsSet(LS_CFG, JSON.stringify(cfg)); }

  function localDeviceId() {
    var id = lsGet(LS_DEV);
    if (!id || !/^[A-Za-z0-9]{6,24}$/.test(id)) {
      id = '';
      var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      var arr = (root.crypto && root.crypto.getRandomValues) ? root.crypto.getRandomValues(new Uint8Array(12)) : null;
      for (var i = 0; i < 12; i++) id += chars[(arr ? arr[i] : Math.floor(Math.random() * 256)) % chars.length];
      lsSet(LS_DEV, id);
    }
    return id;
  }
  function defaultDeviceName() {
    var ua = navigator.userAgent || '';
    var os = /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'Appareil';
    var br = /edg\//i.test(ua) ? 'Edge' : /firefox/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Navigateur';
    return os + ' · ' + br;
  }

  /* ------------------------------------------------------------------
     ÉTAT
     ------------------------------------------------------------------ */
  var S = {
    open: false, tab: 'pos', status: 'idle', me: null, address: null, addrFailed: false,
    lastGeo: null, geoBusy: false, geoAt: 0, watchId: null,
    map: null, L: null, group: null, mapFailed: false, leafletPromise: null, fitted: false,
    outShares: [], inShares: [], contacts: [], contactsIn: [], devices: [], history: [],
    sosMine: null, sosOthers: [], peers: {}, peerUnsubs: {}, selfDevUnsub: null, handledRefresh: null,
    timer: null, lastW: { t: 0, pos: null }, lastH: { t: 0, pos: null }, lastS: { t: 0, pos: null },
    perm: 'unknown', booted: false, flash: ''
  };
  function devId() { return (myUid() || 'x') + '_' + localDeviceId(); }
  function isActiveShare(sh) { return sh && sh.status === 'active' && (!sh.expiresAtMs || sh.expiresAtMs > now()); }
  function activeOut() { return S.outShares.filter(isActiveShare); }
  function activeIn() { return S.inShares.filter(isActiveShare); }
  function acceptedContacts() { return S.contacts.filter(function (c) { return c.status === 'accepted'; }); }
  function lastKnown() {
    if (S.me) return S.me;
    try { var o = JSON.parse(lsGet(LS_LAST) || 'null'); if (o && validCoords(o.lat, o.lng)) return o; } catch (e) { /* ignore */ }
    return null;
  }
  function needsWatch() { return !!(cfg.track || activeOut().length || S.sosMine || (cfg.history && S.booted)); }
  function updateBootFlag() { if (needsWatch()) lsSet(LS_TRACK, '1'); else lsDel(LS_TRACK); updatePill(); }
  function col(n) { return getDb().collection(n); }
  function rowData(d) { var o = d.data(); o.id = d.id; return o; }
  function fsTs(ms) { try { return firebase.firestore.Timestamp.fromMillis(ms); } catch (e) { return new Date(ms); } }

  /* ------------------------------------------------------------------
     STYLE
     ------------------------------------------------------------------ */
  function injectCss() {
    if ($('lc-style')) return;
    var st = document.createElement('style');
    st.id = 'lc-style';
    st.textContent = [
      '#lc-root{position:fixed;inset:0;z-index:2900;background:var(--white,#fff);color:var(--ink,#141a26);display:none;flex-direction:column;font-family:inherit}',
      '#lc-root.open{display:flex}',
      '.lc-head{display:flex;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) 12px 10px;border-bottom:1px solid var(--line,#e2e6ee);background:var(--white,#fff)}',
      '.lc-head h2{flex:1;margin:0;font-size:1.1rem;font-weight:800}',
      '.lc-ib{width:40px;height:40px;border-radius:50%;border:1px solid var(--line,#e2e6ee);background:var(--green-light,#eef1f6);color:var(--ink,#141a26);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font:inherit}',
      '.lc-ib:active{transform:scale(.95)}',
      '.lc-body{flex:1;min-height:0;display:flex;flex-direction:column}',
      '.lc-mapwrap{position:relative;height:38vh;min-height:220px;background:var(--green-light,#eef1f6);flex:0 0 auto}',
      '#lc-map{position:absolute;inset:0}',
      '.lc-mapfb{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;text-align:center;font-size:.9rem}',
      '.lc-panel{flex:1;min-height:0;display:flex;flex-direction:column}',
      '.lc-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid var(--line,#e2e6ee);scrollbar-width:none}',
      '.lc-tabs::-webkit-scrollbar{display:none}',
      '.lc-tab{flex:0 0 auto;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--muted,#5d6779);border-radius:999px;padding:8px 14px;font:inherit;font-size:.85rem;font-weight:700;cursor:pointer;white-space:nowrap}',
      '.lc-tab.on{background:var(--green,#28374f);color:#fff;border-color:var(--green,#28374f)}',
      '#lc-tabbody{flex:1;min-height:0;overflow-y:auto;padding:14px 14px calc(28px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}',
      '.lc-card{border:1px solid var(--line,#e2e6ee);border-radius:16px;padding:14px;margin-bottom:12px;background:var(--white,#fff);box-shadow:0 2px 8px rgba(20,26,38,.05)}',
      '.lc-card h3{margin:0 0 8px;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#5d6779);font-weight:800}',
      '.lc-card p{margin:0 0 8px;font-size:.88rem;line-height:1.45}',
      '.lc-muted{color:var(--muted,#5d6779);font-size:.82rem}',
      '.lc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.lc-kv small{display:block;color:var(--muted,#5d6779);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}',
      '.lc-kv b{font-size:.95rem;word-break:break-word}',
      '.lc-pillst{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:800;padding:5px 10px;border-radius:999px;background:var(--green-light,#eef1f6)}',
      '.lc-pillst i{width:8px;height:8px;border-radius:50%;background:#868e96;display:inline-block}',
      '.lc-pillst.ok i{background:#2f9e44}.lc-pillst.wait i{background:#f59f00}.lc-pillst.bad i{background:#e03131}',
      '.lc-btn{border:0;border-radius:12px;padding:11px 16px;font:inherit;font-weight:800;font-size:.9rem;cursor:pointer;background:var(--green,#28374f);color:#fff}',
      '.lc-btn.sec{background:var(--green-light,#eef1f6);color:var(--ink,#141a26);border:1px solid var(--line,#e2e6ee)}',
      '.lc-btn.red{background:#d7263d;color:#fff}.lc-btn.sm{padding:7px 12px;font-size:.8rem;border-radius:10px}',
      '.lc-btn:disabled{opacity:.55;cursor:default}',
      '.lc-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line,#e2e6ee)}',
      '.lc-row:first-of-type{border-top:0}',
      '.lc-row .grow{flex:1;min-width:0}.lc-row .grow b{display:block;font-size:.92rem;overflow:hidden;text-overflow:ellipsis}',
      '.lc-av{width:38px;height:38px;border-radius:50%;background:var(--green,#28374f);color:#fff;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}',
      '.lc-form{display:flex;flex-direction:column;gap:8px}',
      '.lc-in{width:100%;box-sizing:border-box;border:1px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);border-radius:12px;padding:11px 12px;font:inherit;font-size:.92rem}',
      '.lc-banner{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;margin-bottom:12px;font-size:.88rem;font-weight:700;background:#e7f5ff;color:#0b4a78}',
      '.lc-banner.sos{background:#d7263d;color:#fff;justify-content:space-between}',
      '.lc-warn{background:#fff4e6;color:#8a4b00;border-radius:12px;padding:10px 12px;font-size:.84rem;margin-bottom:10px}',
      '.lc-err{background:#fff0f0;color:#a91a2e;border-radius:12px;padding:10px 12px;font-size:.84rem;margin-bottom:10px}',
      '.lc-sosbtn{display:flex;align-items:center;justify-content:center;width:132px;height:132px;margin:6px auto 12px;border-radius:50%;border:0;background:radial-gradient(circle at 35% 30%,#ff6b6b,#d7263d 60%,#a91a2e);color:#fff;font:inherit;font-size:1.9rem;font-weight:900;letter-spacing:.06em;box-shadow:0 8px 24px rgba(215,38,61,.45);cursor:pointer}',
      '.lc-sosbtn:active{transform:scale(.96)}',
      '.lc-sheet{position:absolute;inset:0;background:rgba(10,14,22,.55);display:none;align-items:flex-end;justify-content:center;z-index:5}',
      '.lc-sheet.open{display:flex}',
      '.lc-sheet-box{background:var(--white,#fff);width:100%;max-width:480px;border-radius:20px 20px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));text-align:center}',
      '.lc-sheet-box h3{margin:0 0 8px;font-size:1.15rem;font-weight:900}',
      '.lc-sheet-box p{margin:0 0 14px;font-size:.92rem;line-height:1.45}',
      '.lc-sheet-box .lc-btn{width:100%;margin-top:8px}',
      '.lc-sw{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0}',
      '.lc-sw input{width:22px;height:22px;accent-color:var(--green,#28374f)}',
      '.lc-mk{border-radius:50%;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)}',
      '.lc-mk-me{width:18px;height:18px;background:#1c7ed6;animation:lcpulse 2s infinite}',
      '.lc-mk-last{width:16px;height:16px;background:#868e96}',
      '.lc-mk-peer{width:30px;height:30px;background:#2f9e44;color:#fff;font-weight:800;font-size:.8rem;display:flex;align-items:center;justify-content:center}',
      '.lc-mk-sos{width:30px;height:30px;background:#d7263d;color:#fff;font-weight:900;font-size:.62rem;display:flex;align-items:center;justify-content:center;animation:lcpulse 1.2s infinite}',
      '.lc-mk-dev{width:24px;height:24px;background:#495057;color:#fff;font-size:.7rem;display:flex;align-items:center;justify-content:center}',
      '@keyframes lcpulse{0%{box-shadow:0 0 0 0 rgba(28,126,214,.55)}70%{box-shadow:0 0 0 14px rgba(28,126,214,0)}100%{box-shadow:0 0 0 0 rgba(28,126,214,0)}}',
      '#lc-toast{position:absolute;left:0;right:0;bottom:18px;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;z-index:9}',
      '.lc-toast-item{background:#141a26;color:#fff;border-radius:12px;padding:10px 14px;font-size:.86rem;max-width:90%;transition:opacity .3s}',
      '.lc-toast-item.err{background:#a91a2e}.lc-toast-item.out{opacity:0}',
      '#lc-pill{position:fixed;left:12px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:2000;display:none;align-items:center;gap:8px;border:0;border-radius:999px;padding:9px 14px;font:inherit;font-size:.8rem;font-weight:800;color:#fff;background:#1c7ed6;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer}',
      '#lc-pill.on{display:inline-flex}#lc-pill.sos{background:#d7263d}',
      '@media (min-width:900px){.lc-body{flex-direction:row}.lc-mapwrap{height:auto;min-height:0;flex:1}.lc-panel{flex:0 0 440px;border-left:1px solid var(--line,#e2e6ee)}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------
     CARTE (Leaflet + OpenStreetMap, chargés seulement à l'ouverture)
     ------------------------------------------------------------------ */
  function ensureLeaflet() {
    if (root.L && root.L.map) return Promise.resolve(root.L);
    if (S.leafletPromise) return S.leafletPromise;
    loadCss(CFG.LEAFLET_CSS);
    S.leafletPromise = loadScript(CFG.LEAFLET_JS).then(function () { return root.L; });
    S.leafletPromise.catch(function () { S.leafletPromise = null; });
    return S.leafletPromise;
  }
  function initMap() {
    var el = $('lc-map');
    if (!el || S.map) return;
    ensureLeaflet().then(function (L) {
      if (!S.open || S.map) return;
      S.L = L; S.mapFailed = false;
      var fb = $('lc-mapfb'); if (fb) fb.style.display = 'none';
      var start = lastKnown();
      S.map = L.map(el, { zoomControl: true }).setView(start ? [start.lat, start.lng] : [2, 20], start ? 16 : 3);
      L.tileLayer(CFG.TILES, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(S.map);
      S.group = L.layerGroup().addTo(S.map);
      drawMap();
      setTimeout(function () { if (S.map) S.map.invalidateSize(); }, 250);
    }).catch(function () { S.mapFailed = true; showMapFallback(); });
  }
  function destroyMap() {
    if (S.map) { try { S.map.remove(); } catch (e) { /* ignore */ } }
    S.map = null; S.group = null; S.fitted = false;
  }
  function showMapFallback() {
    var fb = $('lc-mapfb'); if (!fb) return;
    var m = lastKnown();
    fb.style.display = 'flex';
    fb.innerHTML = '<div>' + esc(T('map_fallback')) + '</div>' + (m
      ? '<b>' + fmtCoord(m.lat) + ', ' + fmtCoord(m.lng) + '</b><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=' + m.lat + '&mlon=' + m.lng + '#map=17/' + m.lat + '/' + m.lng + '">' + esc(T('open_osm')) + '</a>'
      : '<span class="lc-muted">' + esc(T('no_pos')) + '</span>');
  }
  function icon(cls, html) {
    return S.L.divIcon({ className: '', html: '<div class="lc-mk ' + cls + '">' + (html || '') + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
  }
  function initial(name) { return esc(String(name || '?').trim().charAt(0).toUpperCase() || '?'); }
  function drawMap() {
    if (!S.map || !S.group || !S.L) return;
    var L = S.L, g = S.group, pts = [];
    g.clearLayers();
    var m = S.me, lk = lastKnown();
    if (m) {
      L.circle([m.lat, m.lng], { radius: Math.max(m.acc || 0, 3), color: '#1c7ed6', weight: 1, fillColor: '#1c7ed6', fillOpacity: .12 }).addTo(g);
      L.marker([m.lat, m.lng], { icon: icon('lc-mk-me'), zIndexOffset: 500 }).addTo(g);
      pts.push([m.lat, m.lng]);
    } else if (lk) {
      L.circle([lk.lat, lk.lng], { radius: Math.max(lk.acc || 0, 3), color: '#868e96', weight: 1, dashArray: '4 4', fillOpacity: .06 }).addTo(g);
      L.marker([lk.lat, lk.lng], { icon: icon('lc-mk-last') }).bindPopup(esc(T('last_known', { ago: ago(lk.ts) }))).addTo(g);
      pts.push([lk.lat, lk.lng]);
    }
    activeIn().forEach(function (sh) {
      var p = S.peers[sh.ownerUid];
      if (p && validCoords(p.lat, p.lng)) {
        L.marker([p.lat, p.lng], { icon: icon('lc-mk-peer', initial(sh.ownerName)) })
          .bindPopup('<b>' + esc(sh.ownerName) + '</b><br>' + esc(ago(p.updatedAtMs)) + ' · ' + esc(fmtAcc(p.accuracy))).addTo(g);
        pts.push([p.lat, p.lng]);
      }
    });
    S.sosOthers.forEach(function (s) {
      if (s.status === 'active' && validCoords(s.lat, s.lng)) {
        L.marker([s.lat, s.lng], { icon: icon('lc-mk-sos', 'SOS'), zIndexOffset: 900 })
          .bindPopup('<b>SOS · ' + esc(s.ownerName) + '</b><br>' + esc(ago(s.updatedAtMs))).addTo(g);
        pts.push([s.lat, s.lng]);
      }
    });
    if (S.tab === 'dev') {
      S.devices.forEach(function (d) {
        if (validCoords(d.lat, d.lng) && d.id !== devId()) {
          L.marker([d.lat, d.lng], { icon: icon('lc-mk-dev', '▣') }).bindPopup('<b>' + esc(d.name) + '</b><br>' + esc(T('dv_lastpos', { ago: ago(d.lastPosMs) }))).addTo(g);
          L.circle([d.lat, d.lng], { radius: Math.max(d.accuracy || 0, 3), color: '#495057', weight: 1, fillOpacity: .06 }).addTo(g);
          pts.push([d.lat, d.lng]);
        }
      });
    }
    if (S.tab === 'hist' && S.history.length) {
      var line = S.history.filter(function (h) { return validCoords(h.lat, h.lng); }).map(function (h) { return [h.lat, h.lng]; });
      if (line.length > 1) L.polyline(line, { color: '#7048e8', weight: 3, opacity: .7 }).addTo(g);
      S.history.forEach(function (h) {
        if (validCoords(h.lat, h.lng)) L.circleMarker([h.lat, h.lng], { radius: 4, color: '#7048e8', fillOpacity: .9 }).bindPopup(esc(fmtTime(h.tsMs))).addTo(g);
      });
      line.forEach(function (q) { pts.push(q); });
    }
    if (!S.fitted && pts.length) {
      S.fitted = true;
      if (pts.length === 1) S.map.setView(pts[0], 16); else S.map.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
    }
  }
  function flyTo(lat, lng) {
    if (S.map && validCoords(lat, lng)) S.map.flyTo([lat, lng], Math.max(S.map.getZoom(), 16));
  }

  /* ------------------------------------------------------------------
     GÉOLOCALISATION (API native du navigateur)
     ------------------------------------------------------------------ */
  function setStatus(st) { S.status = st; renderStatusBits(); updatePill(); }
  function geoSupported() { return !!(navigator && navigator.geolocation); }
  function queryPerm() {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
          S.perm = r.state;
          r.onchange = function () { S.perm = r.state; renderStatusBits(); };
          renderStatusBits();
        }).catch(function () { /* ignore */ });
      }
    } catch (e) { /* ignore */ }
  }
  function startWatch() {
    if (!geoSupported()) { setStatus('unsupported'); return; }
    if (root.isSecureContext === false) { setStatus('insecure'); return; }
    if (S.watchId != null) return;
    setStatus('locating');
    try {
      S.watchId = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 });
    } catch (e) { setStatus('unavailable'); }
    // watchPosition ne rappelle pas toujours quand l'appareil est immobile : un
    // « battement de cœur » toutes les minutes redemande une position
    // fraîche seulement si la dernière a plus de HEARTBEAT_MS (5 min).
    if (!S.hb) S.hb = setInterval(function () {
      if (S.watchId == null || !S.me || !needsWatch()) return;
      if (now() - S.me.ts >= CFG.HEARTBEAT_MS) oneShotFix();
    }, 60000);
  }
  function stopWatch() {
    if (S.watchId != null) { try { navigator.geolocation.clearWatch(S.watchId); } catch (e) { /* ignore */ } S.watchId = null; }
    if (S.hb) { clearInterval(S.hb); S.hb = null; }
    if (S.status === 'locating' || S.status === 'active') setStatus('idle');
  }
  function onPos(p) {
    var c = p && p.coords;
    if (!c || !validCoords(c.latitude, c.longitude)) return;
    var ts = p.timestamp && Math.abs(p.timestamp - now()) < 3600000 ? p.timestamp : now();
    S.me = { lat: c.latitude, lng: c.longitude, acc: typeof c.accuracy === 'number' ? c.accuracy : null, ts: ts };
    lsSet(LS_LAST, JSON.stringify(S.me));
    setStatus('active');
    if (S.open) { renderPosBits(); drawMap(); if (S.mapFailed) showMapFallback(); }
    geocodeMaybe(false);
    writeTargets(false);
  }
  function onPosErr(err) {
    var code = err && err.code;
    if (code === 1) { setStatus('denied'); S.perm = 'denied'; stopWatch(); setStatus('denied'); }
    else if (code === 3) setStatus('timeout');
    else setStatus('unavailable');
  }
  function oneShotFix(cb) {
    if (!geoSupported()) return;
    navigator.geolocation.getCurrentPosition(function (p) { onPos(p); if (cb) cb(true); }, function (e) { onPosErr(e); if (cb) cb(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }
  function geocodeMaybe(force) {
    var m = S.me;
    if (!m || !S.open) return;
    if (!force && S.lastGeo && haversine(S.lastGeo, m) < CFG.GEOCODE_MIN_MOVE_M) return;
    if (S.geoBusy || (!force && now() - S.geoAt < 10000)) return;
    S.geoBusy = true; S.geoAt = now();
    var url = CFG.GEOCODE_URL + '?format=jsonv2&zoom=18&lat=' + m.lat + '&lon=' + m.lng + '&accept-language=' + (langIdx() === 0 ? 'fr' : 'en');
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { S.lastGeo = { lat: m.lat, lng: m.lng }; S.address = j && j.display_name ? j.display_name : null; S.addrFailed = !S.address; renderPosBits(); })
      .catch(function () { S.addrFailed = true; renderPosBits(); })
      .then(function () { S.geoBusy = false; });
  }
  function getBattery() {
    try {
      if (navigator.getBattery) {
        return navigator.getBattery().then(function (b) { return { level: Math.round(b.level * 100), charging: !!b.charging }; }).catch(function () { return { level: null, charging: null }; });
      }
    } catch (e) { /* ignore */ }
    return Promise.resolve({ level: null, charging: null });
  }

  /* ------------------------------------------------------------------
     ÉCRITURES FIRESTORE — espacées pour ménager le quota gratuit
     ------------------------------------------------------------------ */
  function writeTargets(force) {
    var uid = myUid(), d = getDb(), m = S.me;
    if (!uid || !d || !m) return;
    var t = now();

    // 1) Appareil + position partagée (même cadence)
    var wantDev = cfg.track, wantLive = activeOut().length > 0;
    if (wantDev || wantLive) {
      var moved = S.lastW.pos ? haversine(S.lastW.pos, m) : Infinity;
      var el = t - S.lastW.t;
      if (force || (el >= CFG.MIN_INTERVAL_MS && (moved >= CFG.MIN_DISTANCE_M || el >= CFG.HEARTBEAT_MS))) {
        S.lastW.t = t; S.lastW.pos = { lat: m.lat, lng: m.lng };
        getBattery().then(function (b) {
          var acc = m.acc == null ? null : Math.round(m.acc);
          if (wantDev) {
            col('location_devices').doc(devId()).set({
              ownerUid: uid, lat: m.lat, lng: m.lng, accuracy: acc, battery: b.level, charging: b.charging,
              lastSeenMs: t, lastPosMs: m.ts
            }, { merge: true }).catch(function (e) { console.warn('[loc] appareil', e.code); });
          }
          if (wantLive) {
            col('location_live').doc(uid).set({ uid: uid, lat: m.lat, lng: m.lng, accuracy: acc, battery: b.level, updatedAtMs: t })
              .catch(function (e) { console.warn('[loc] partage', e.code); });
          }
        });
      }
    }

    // 2) SOS (cadence plus rapide)
    if (S.sosMine) {
      var sm = S.lastS.pos ? haversine(S.lastS.pos, m) : Infinity, se = t - S.lastS.t;
      if (force || (se >= CFG.SOS_INTERVAL_MS && (sm >= CFG.SOS_MIN_DIST_M || se >= 60000))) {
        S.lastS.t = t; S.lastS.pos = { lat: m.lat, lng: m.lng };
        col('sos_sessions').doc(uid).set({
          uid: uid, ownerName: myName(), status: 'active', startedAtMs: S.sosMine.startedAtMs,
          updatedAtMs: t, lat: m.lat, lng: m.lng, accuracy: m.acc == null ? null : Math.round(m.acc)
        }, { merge: true }).catch(function (e) { console.warn('[loc] sos', e.code); });
      }
    }

    // 3) Historique (désactivé par défaut)
    if (cfg.history) {
      var hm = S.lastH.pos ? haversine(S.lastH.pos, m) : Infinity;
      if (t - S.lastH.t >= cfg.historyMin * 60000 && hm >= CFG.HISTORY_MIN_DIST_M) {
        S.lastH.t = t; S.lastH.pos = { lat: m.lat, lng: m.lng };
        col('location_history').add({
          ownerUid: uid, deviceId: devId(), lat: m.lat, lng: m.lng,
          accuracy: m.acc == null ? null : Math.round(m.acc), tsMs: t, expireAt: fsTs(t + cfg.retention * 86400000)
        }).catch(function (e) { console.warn('[loc] historique', e.code); });
      }
    }
  }

  /* ------------------------------------------------------------------
     NOTIFICATIONS (réutilise l'existant : collection notifications + push)
     ------------------------------------------------------------------ */
  function notifyUser(uid, type, title, body) {
    var d = getDb(); if (!d || !uid) return;
    var url = '/?loc=' + (type === 'sos' ? 'sos' : 'share');
    d.collection('notifications').add({
      uid: uid, fromUid: myUid(), title: title, body: body, type: type, read: false, url: url, createdAt: new Date().toISOString()
    }).catch(function () { /* non bloquant */ });
    try { if (typeof notifyUserPush === 'function') notifyUserPush(uid, title, body, type === 'sos' ? 'sos' : 'activity', url); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------
     DONNÉES : partages, contacts, SOS, appareils, historique
     ------------------------------------------------------------------ */
  function profileOf(uid) {
    try { if (typeof fetchPublicProfile === 'function') return Promise.resolve(fetchPublicProfile(uid)).catch(function () { return null; }); } catch (e) { /* ignore */ }
    return Promise.resolve(null);
  }
  function resolveUser(raw) {
    var u = String(raw || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '');
    if (u.length < 3) return Promise.reject({ code: 'notfound' });
    return col('usernames').doc(u).get().then(function (s) {
      if (!s.exists || !s.data().uid) throw { code: 'notfound' };
      var uid = s.data().uid;
      if (uid === myUid()) throw { code: 'self' };
      return profileOf(uid).then(function (p) { return { uid: uid, name: (p && p.name) || u }; });
    });
  }
  function userErr(e) {
    if (e && e.code === 'notfound') return T('user_notfound');
    if (e && e.code === 'self') return T('user_self');
    if (e && e.code === 'limit') return T('limit');
    return errText(e);
  }
  function loadShares() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return Promise.all([
      col('location_shares').where('ownerUid', '==', uid).get(),
      col('location_shares').where('viewerUid', '==', uid).get()
    ]).then(function (r) {
      S.outShares = r[0].docs.map(rowData); S.inShares = r[1].docs.map(rowData);
      cleanupExpired(); syncPeers(); updateBootFlag();
    }).catch(function (e) { console.warn('[loc] partages', e.code); });
  }
  function cleanupExpired() {
    var changed = false;
    S.outShares.forEach(function (sh) {
      if (sh.status === 'active' && sh.expiresAtMs && sh.expiresAtMs <= now()) {
        sh.status = 'stopped'; changed = true;
        col('location_shares').doc(sh.id).update({ status: 'stopped', updatedAtMs: now() }).catch(function () { /* ignore */ });
      }
    });
    if (changed && !activeOut().length) dropLive();
  }
  function dropLive() { var uid = myUid(); if (uid) col('location_live').doc(uid).delete().catch(function () { /* ignore */ }); }
  function syncPeers() {
    var want = {};
    activeIn().slice(0, CFG.MAX_SHARES).forEach(function (sh) { want[sh.ownerUid] = true; });
    Object.keys(S.peerUnsubs).forEach(function (k) {
      if (!want[k]) { try { S.peerUnsubs[k](); } catch (e) { /* ignore */ } delete S.peerUnsubs[k]; delete S.peers[k]; }
    });
    if (!S.open) return;
    Object.keys(want).forEach(function (owner) {
      if (S.peerUnsubs[owner]) return;
      S.peerUnsubs[owner] = col('location_live').doc(owner).onSnapshot(function (snap) {
        S.peers[owner] = snap.exists ? snap.data() : null;
        drawMap(); if (S.tab === 'share') renderTab();
      }, function () {
        S.peers[owner] = null; // accès retiré (partage arrêté ou expiré)
        loadShares().then(function () { if (S.open) { drawMap(); if (S.tab === 'share') renderTab(); } });
      });
    });
  }
  function stopPeerListeners() {
    Object.keys(S.peerUnsubs).forEach(function (k) { try { S.peerUnsubs[k](); } catch (e) { /* ignore */ } });
    S.peerUnsubs = {}; S.peers = {};
  }

  function shareWith(rawUser, durMin) {
    var uid = myUid();
    return resolveUser(rawUser).then(function (tg) {
      if (activeOut().length >= CFG.MAX_SHARES) throw { code: 'limit' };
      var id = uid + '_' + tg.uid, ref = col('location_shares').doc(id);
      var exp = durMin > 0 ? now() + durMin * 60000 : 0;
      return ref.get().then(function (s) {
        if (s.exists) return ref.update({ status: 'active', expiresAtMs: exp, updatedAtMs: now() });
        return ref.set({
          ownerUid: uid, viewerUid: tg.uid, ownerName: myName(), viewerName: tg.name, status: 'active',
          requestedBy: uid, expiresAtMs: exp, createdAtMs: now(), updatedAtMs: now()
        });
      }).then(function () {
        notifyUser(tg.uid, 'location', T('sh_notif_title'), T('sh_notif_body', { name: myName() }));
        return loadShares();
      }).then(function () { afterShareChange(); });
    });
  }
  function askPosition(rawUser) {
    var uid = myUid();
    return resolveUser(rawUser).then(function (tg) {
      var id = tg.uid + '_' + uid, ref = col('location_shares').doc(id);
      return ref.get().then(function (s) {
        if (s.exists) {
          var st = s.data().status;
          if (st === 'pending' || st === 'active') return null;
          return ref.delete();
        }
        return null;
      }).then(function () {
        return ref.get().then(function (s2) {
          if (s2.exists) return null;
          return ref.set({
            ownerUid: tg.uid, viewerUid: uid, ownerName: tg.name, viewerName: myName(), status: 'pending',
            requestedBy: uid, expiresAtMs: 0, createdAtMs: now(), updatedAtMs: now()
          }).then(function () { notifyUser(tg.uid, 'location', T('sh_ask_title'), T('sh_ask_body', { name: myName() })); });
        });
      }).then(loadShares);
    });
  }
  function acceptRequest(id, durMin) {
    var exp = durMin > 0 ? now() + durMin * 60000 : 0;
    return col('location_shares').doc(id).update({ status: 'active', expiresAtMs: exp, updatedAtMs: now() })
      .then(loadShares).then(function () { afterShareChange(); });
  }
  function declineRequest(id) {
    return col('location_shares').doc(id).update({ status: 'declined', updatedAtMs: now() }).then(loadShares);
  }
  function stopShare(id) {
    return col('location_shares').doc(id).update({ status: 'stopped', updatedAtMs: now() })
      .then(loadShares).then(function () { if (!activeOut().length) dropLive(); afterShareChange(); });
  }
  function stopAllShares() {
    var ids = activeOut().map(function (s) { return s.id; });
    return Promise.all(ids.map(function (id) { return col('location_shares').doc(id).update({ status: 'stopped', updatedAtMs: now() }); }))
      .then(function () { dropLive(); return loadShares(); }).then(function () { afterShareChange(); });
  }
  function deleteShareDoc(id) { return col('location_shares').doc(id).delete().then(loadShares); }
  function afterShareChange() {
    updateBootFlag();
    if (activeOut().length && S.watchId == null) { if (lsGet(LS_CONSENT)) startWatch(); }
    if (activeOut().length && S.me) writeTargets(true);
    if (!needsWatch() && !S.open) stopWatch();
  }

  function loadContacts() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return Promise.all([
      col('emergency_contacts').where('ownerUid', '==', uid).get(),
      col('emergency_contacts').where('contactUid', '==', uid).get()
    ]).then(function (r) { S.contacts = r[0].docs.map(rowData); S.contactsIn = r[1].docs.map(rowData); })
      .catch(function (e) { console.warn('[loc] contacts', e.code); });
  }
  function inviteContact(rawUser) {
    var uid = myUid();
    if (S.contacts.length >= CFG.MAX_CONTACTS) return Promise.reject({ code: 'limit' });
    return resolveUser(rawUser).then(function (tg) {
      var id = uid + '_' + tg.uid, ref = col('emergency_contacts').doc(id);
      return ref.get().then(function (s) {
        if (s.exists) return null;
        return ref.set({ ownerUid: uid, contactUid: tg.uid, ownerName: myName(), contactName: tg.name, status: 'pending', createdAtMs: now() })
          .then(function () { notifyUser(tg.uid, 'location', T('ec_notif_title'), T('ec_notif_body', { name: myName() })); });
      });
    }).then(loadContacts);
  }
  function acceptContact(id) { return col('emergency_contacts').doc(id).update({ status: 'accepted' }).then(loadContacts).then(refreshSosOthers); }
  function removeContact(id) { return col('emergency_contacts').doc(id).delete().then(loadContacts).then(refreshSosOthers); }
  function refreshSosOthers() {
    var owners = S.contactsIn.filter(function (c) { return c.status === 'accepted'; }).slice(0, CFG.MAX_SOS_WATCH);
    return Promise.all(owners.map(function (c) {
      return col('sos_sessions').doc(c.ownerUid).get().then(function (s) { return s.exists ? s.data() : null; }).catch(function () { return null; });
    })).then(function (arr) {
      S.sosOthers = arr.filter(function (s) { return s && s.status === 'active'; });
      if (S.open) { drawMap(); if (S.tab === 'sec') renderTab(); }
    });
  }
  function loadSosMine() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return col('sos_sessions').doc(uid).get().then(function (s) {
      var d = s.exists ? s.data() : null;
      if (d && d.status === 'active') { S.sosMine = { startedAtMs: d.startedAtMs || now() }; if (lsGet(LS_CONSENT)) startWatch(); }
      else S.sosMine = null;
      updateBootFlag();
    }).catch(function () { /* ignore */ });
  }
  function activateSos() {
    var uid = myUid(); if (!uid) return;
    S.sosMine = { startedAtMs: now() };
    S.lastS = { t: 0, pos: null };
    lsSet(LS_CONSENT, '1'); startWatch(); updateBootFlag();
    var base = { uid: uid, ownerName: myName(), status: 'active', startedAtMs: S.sosMine.startedAtMs, updatedAtMs: now() };
    var m = S.me && now() - S.me.ts < 120000 ? S.me : null;
    if (m) { base.lat = m.lat; base.lng = m.lng; base.accuracy = m.acc == null ? null : Math.round(m.acc); }
    loadContacts().then(function () {
      return col('sos_sessions').doc(uid).set(base);
    }).then(function () {
      acceptedContacts().forEach(function (c) { notifyUser(c.contactUid, 'sos', T('sos_notif_title', { name: myName() }), T('sos_notif_body', { name: myName() })); });
      toastLC(T('sos_on_toast'));
      if (!m) { toastLC(T('sos_nopos_warn')); oneShotFix(function () { writeTargets(true); }); }
      renderTab(); renderSosBar();
    }).catch(function (e) { S.sosMine = null; updateBootFlag(); toastLC(errText(e), 'error'); renderTab(); renderSosBar(); });
  }
  function deactivateSos() {
    var uid = myUid(); if (!uid) return;
    col('sos_sessions').doc(uid).set({ status: 'ended', endedAtMs: now(), updatedAtMs: now() }, { merge: true }).then(function () {
      acceptedContacts().forEach(function (c) { notifyUser(c.contactUid, 'sos', T('sos_end_title'), T('sos_end_body', { name: myName() })); });
      S.sosMine = null; updateBootFlag();
      if (!needsWatch() && !S.open) stopWatch();
      toastLC(T('sos_off_toast')); renderTab(); renderSosBar();
    }).catch(function (e) { toastLC(errText(e), 'error'); });
  }

  function loadDevices() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return col('location_devices').where('ownerUid', '==', uid).get().then(function (r) { S.devices = r.docs.map(rowData); })
      .catch(function (e) { console.warn('[loc] appareils', e.code); });
  }
  function ensureDeviceDoc() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    var ref = col('location_devices').doc(devId());
    return ref.get().then(function (s) {
      if (!s.exists) return ref.set({ ownerUid: uid, name: defaultDeviceName(), createdAtMs: now(), lastSeenMs: now() });
      return null;
    }).catch(function (e) { console.warn('[loc] appareil', e.code); });
  }
  function watchSelfDevice() {
    if (S.selfDevUnsub || !cfg.track || !myUid()) return;
    S.selfDevUnsub = col('location_devices').doc(devId()).onSnapshot(function (snap) {
      if (!snap.exists) return;
      var r = snap.data().refreshRequestedAtMs || 0;
      if (S.handledRefresh === null) { S.handledRefresh = r; return; }
      if (r > S.handledRefresh) { S.handledRefresh = r; oneShotFix(function () { writeTargets(true); }); }
    }, function () { S.selfDevUnsub = null; });
  }
  function unwatchSelfDevice() { if (S.selfDevUnsub) { try { S.selfDevUnsub(); } catch (e) { /* ignore */ } S.selfDevUnsub = null; S.handledRefresh = null; } }
  function setTrack(on) {
    cfg.track = !!on; saveCfg(); updateBootFlag();
    if (on) {
      lsSet(LS_CONSENT, '1');
      ensureDeviceDoc().then(function () { watchSelfDevice(); startWatch(); if (S.me) writeTargets(true); return loadDevices(); }).then(function () { if (S.open) renderTab(); });
    } else {
      unwatchSelfDevice();
      if (!needsWatch() && !S.open) stopWatch();
    }
  }
  function renameDevice(id, name) {
    name = String(name || '').trim().slice(0, 40);
    if (!name) return Promise.resolve();
    return col('location_devices').doc(id).update({ name: name }).then(loadDevices);
  }
  function removeDevice(id) {
    return col('location_devices').doc(id).delete().then(function () {
      if (id === devId() && cfg.track) setTrack(false);
      return loadDevices();
    });
  }
  function requestDeviceRefresh(id) { return col('location_devices').doc(id).update({ refreshRequestedAtMs: now() }); }

  function loadHistory() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return col('location_history').where('ownerUid', '==', uid).orderBy('tsMs', 'desc').limit(CFG.HISTORY_SHOW).get()
      .then(function (r) { S.history = r.docs.map(rowData); S.histErr = null; })
      .catch(function (e) { S.history = []; S.histErr = e; console.warn('[loc] historique', e.code, e.message); });
  }
  function purgeOldHistory() {
    var uid = myUid(); if (!uid || !cfg.history) return;
    var cutoff = now() - cfg.retention * 86400000;
    col('location_history').where('ownerUid', '==', uid).where('tsMs', '<', cutoff).limit(50).get().then(function (r) {
      if (r.empty) return;
      var b = getDb().batch(); r.docs.forEach(function (d) { b.delete(d.ref); }); return b.commit();
    }).catch(function () { /* l'index peut manquer : la suppression automatique (TTL) prend le relais */ });
  }
  function deleteAllIn(query) {
    var loops = 0;
    function step() {
      return query().get().then(function (r) {
        if (r.empty || loops++ > 30) return null;
        var b = getDb().batch(); r.docs.forEach(function (d) { b.delete(d.ref); });
        return b.commit().then(step);
      });
    }
    return step();
  }
  function clearHistory() {
    var uid = myUid();
    return deleteAllIn(function () { return col('location_history').where('ownerUid', '==', uid).limit(100); }).then(function () { S.history = []; });
  }
  function deleteAllMyData() {
    var uid = myUid();
    return Promise.all([loadShares(), loadContacts(), loadDevices()]).then(function () {
      var jobs = [];
      S.outShares.concat(S.inShares).forEach(function (s) { jobs.push(col('location_shares').doc(s.id).delete().catch(function () { })); });
      S.contacts.concat(S.contactsIn).forEach(function (c) { jobs.push(col('emergency_contacts').doc(c.id).delete().catch(function () { })); });
      S.devices.forEach(function (d) { jobs.push(col('location_devices').doc(d.id).delete().catch(function () { })); });
      jobs.push(col('location_live').doc(uid).delete().catch(function () { }));
      jobs.push(col('sos_sessions').doc(uid).delete().catch(function () { }));
      jobs.push(clearHistory().catch(function () { }));
      return Promise.all(jobs);
    }).then(function () {
      cfg.track = false; cfg.history = false; saveCfg();
      S.outShares = []; S.inShares = []; S.contacts = []; S.contactsIn = []; S.devices = []; S.sosMine = null; S.sosOthers = [];
      unwatchSelfDevice(); stopPeerListeners(); lsDel(LS_LAST); lsDel(LS_TRACK);
      if (!S.open) stopWatch();
    });
  }

  /* ------------------------------------------------------------------
     INTERFACE
     ------------------------------------------------------------------ */
  X.pill_sos = ['SOS actif', 'SOS active']; X.pill_share = ['Position partagée', 'Position shared']; X.pill_track = ["Suivi de l'appareil", 'Device tracking'];
  X.back = ['Retour', 'Back'];
  var TABS = ['pos', 'share', 'sec', 'dev', 'hist', 'priv'];
  var SVG_BACK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var SVG_LOC = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg>';

  function buildDom() {
    if ($('lc-root')) return;
    var el = document.createElement('div');
    el.id = 'lc-root';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="lc-head"><button class="lc-ib" data-act="close" aria-label="' + esc(T('back')) + '">' + SVG_BACK + '</button>' +
      '<h2 id="lc-title">' + esc(T('title')) + '</h2>' +
      '<button class="lc-ib" data-act="recenter" aria-label="' + esc(T('recenter')) + '" title="' + esc(T('recenter')) + '">' + SVG_LOC + '</button></div>' +
      '<div id="lc-sosbar"></div>' +
      '<div class="lc-body"><div class="lc-mapwrap"><div id="lc-map"></div><div class="lc-mapfb" id="lc-mapfb" style="display:none"></div></div>' +
      '<div class="lc-panel"><nav class="lc-tabs" id="lc-tabs" role="tablist"></nav><div id="lc-tabbody"></div></div></div>' +
      '<div class="lc-sheet" id="lc-sheet"></div><div id="lc-toast"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape' || !S.open) return;
      if ($('lc-sheet').classList.contains('open')) closeSheet(); else close();
    });
  }
  function buildPill() {
    if ($('lc-pill')) return;
    var b = document.createElement('button');
    b.id = 'lc-pill'; b.type = 'button';
    b.addEventListener('click', function () { open(S.sosMine ? 'sec' : 'share'); });
    document.body.appendChild(b);
  }
  function updatePill() {
    var b = $('lc-pill'); if (!b) return;
    var sos = !!S.sosMine, sh = activeOut().length > 0, tr = cfg.track;
    var on = !S.open && S.watchId != null && (sos || sh || tr);
    b.className = on ? (sos ? 'on sos' : 'on') : '';
    if (on) b.textContent = '● ' + T(sos ? 'pill_sos' : sh ? 'pill_share' : 'pill_track');
  }
  function renderTabs() {
    var nav = $('lc-tabs'); if (!nav) return;
    nav.innerHTML = TABS.map(function (k) {
      return '<button class="lc-tab' + (S.tab === k ? ' on' : '') + '" role="tab" aria-selected="' + (S.tab === k) + '" data-act="tab" data-tab="' + k + '">' + esc(T('tab_' + k)) + '</button>';
    }).join('');
  }
  function renderSosBar() {
    var h = $('lc-sosbar'); if (!h) return;
    if (!S.sosMine) { h.innerHTML = ''; return; }
    h.innerHTML = '<div class="lc-banner sos" style="margin:0;border-radius:0"><span>🚨 ' + esc(T('sos_active', { ago: ago(S.sosMine.startedAtMs) })) + '</span><button class="lc-btn sm sec" data-act="sosoff">' + esc(T('sos_off')) + '</button></div>';
  }
  function renderStatusBits() { if (S.open && S.tab === 'pos') renderTab(); }
  function renderPosBits() { if (S.open && S.tab === 'pos') renderTab(); }

  function renderTab() {
    var body = $('lc-tabbody'); if (!body) return;
    var keep = {};
    Array.prototype.forEach.call(body.querySelectorAll('input.lc-in,select.lc-in'), function (el) { if (el.id) keep[el.id] = el.value; });
    var focusId = document.activeElement && document.activeElement.id;
    var sc = body.scrollTop;
    var fns = { pos: tabPos, share: tabShare, sec: tabSec, dev: tabDev, hist: tabHist, priv: tabPriv };
    body.innerHTML = (fns[S.tab] || tabPos)();
    Object.keys(keep).forEach(function (id) { var el = $(id); if (el) el.value = keep[id]; });
    body.scrollTop = sc;
    if (focusId && $(focusId) && /^lc-(sh|ec)-user$/.test(focusId)) $(focusId).focus();
  }
  function card(title, inner) { return '<div class="lc-card">' + (title ? '<h3>' + esc(title) + '</h3>' : '') + inner + '</div>'; }
  function btn(act, label, cls, extra) { return '<button type="button" class="lc-btn ' + (cls || '') + '" data-act="' + act + '"' + (extra || '') + '>' + esc(label) + '</button>'; }
  function durSelect(id) {
    return '<select class="lc-in" id="' + id + '"><option value="15">' + esc(T('dur_15')) + '</option><option value="60" selected>' + esc(T('dur_60')) + '</option><option value="480">' + esc(T('dur_480')) + '</option><option value="0">' + esc(T('dur_0')) + '</option></select>';
  }
  function av(name) { return '<span class="lc-av">' + initial(name) + '</span>'; }

  /* ---- Onglet Position ---- */
  function tabPos() {
    var st = S.status;
    if (!lsGet(LS_CONSENT) && S.watchId == null && !S.me) {
      return card(T('consent_title'), '<p>' + esc(T('consent_text')) + '</p>' + btn('startpos', T('consent_btn')));
    }
    var cls = st === 'active' ? 'ok' : st === 'locating' ? 'wait' : st === 'idle' ? '' : 'bad';
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
      '<span class="lc-pillst ' + cls + '"><i></i>' + esc(T('st_' + st)) + '</span>' +
      (S.watchId != null ? (needsWatch() ? '' : btn('stoppos', T('btn_stop'), 'sec sm')) : btn('startpos', T('btn_start'), 'sm')) + '</div>';
    if (X['err_' + st]) h += '<div class="lc-err">' + esc(T('err_' + st)) + '</div>';
    var m = S.me;
    if (m) {
      h += '<div class="lc-grid"><div class="lc-kv"><small>' + esc(T('lbl_lat')) + '</small><b>' + fmtCoord(m.lat) + '</b></div>' +
        '<div class="lc-kv"><small>' + esc(T('lbl_lng')) + '</small><b>' + fmtCoord(m.lng) + '</b></div>' +
        '<div class="lc-kv"><small>' + esc(T('lbl_acc')) + '</small><b>' + esc(fmtAcc(m.acc)) + '</b></div>' +
        '<div class="lc-kv"><small>' + esc(T('lbl_upd')) + '</small><b>' + esc(ago(m.ts)) + '</b></div></div>';
      h += '<div class="lc-kv" style="margin-top:10px"><small>' + esc(T('lbl_addr')) + '</small><b>' +
        esc(S.address ? S.address : (S.addrFailed ? T('addr_none') : T('addr_wait'))) + '</b></div>';
      if (m.acc != null && m.acc > 100) h += '<div class="lc-warn" style="margin-top:10px">' + esc(T('acc_low')) + '</div>';
    } else {
      var lk = lastKnown();
      h += lk ? '<p class="lc-muted">' + esc(T('last_known', { ago: ago(lk.ts) })) + ' · ' + fmtCoord(lk.lat) + ', ' + fmtCoord(lk.lng) + ' (' + esc(fmtAcc(lk.acc)) + ')</p>'
        : '<p class="lc-muted">' + esc(T('no_pos')) + '</p>';
    }
    if (geoSupported() && S.watchId != null) h += '<div style="margin-top:12px">' + btn('refreshpos', T('btn_refresh'), 'sec sm') + '</div>';
    return card(T('tab_pos'), h);
  }

  /* ---- Onglet Partage ---- */
  function tabShare() {
    var me = myUid(), h = '';
    var out = activeOut();
    if (out.length) {
      h += '<div class="lc-banner">📍 ' + esc(T('sh_banner', { names: out.map(function (s) { return s.viewerName; }).join(', ') })) + '</div>';
    }
    h += card(T('sh_new'),
      '<div class="lc-form"><input class="lc-in" id="lc-sh-user" maxlength="30" autocapitalize="none" autocomplete="off" placeholder="' + esc(T('sh_user_ph')) + '">' +
      durSelect('lc-sh-dur') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + btn('share', T('sh_btn_share')) + btn('ask', T('sh_btn_ask'), 'sec') + '</div>' +
      '<span class="lc-muted">' + esc(T('sh_info')) + '</span></div>');

    var reqs = S.outShares.filter(function (s) { return s.status === 'pending' && s.requestedBy !== me; });
    if (reqs.length) {
      h += card(T('sh_req_in'), reqs.map(function (s) {
        return '<div class="lc-row">' + av(s.viewerName) + '<div class="grow"><b>' + esc(s.viewerName) + '</b><span class="lc-muted">' + esc(T('sh_req_in_txt', { name: s.viewerName })) + '</span>' +
          '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' + durSelect('lc-acc-' + s.id) + btn('accept', T('sh_accept'), 'sm', ' data-id="' + esc(s.id) + '"') + btn('decline', T('sh_decline'), 'sec sm', ' data-id="' + esc(s.id) + '"') + '</div></div></div>';
      }).join(''));
    }
    h += card(T('sh_out'), out.length
      ? out.map(function (s) {
        return '<div class="lc-row">' + av(s.viewerName) + '<div class="grow"><b>' + esc(s.viewerName) + '</b><span class="lc-muted">' + esc(remaining(s.expiresAtMs)) + '</span></div>' +
          btn('stopshare', T('sh_stop'), 'red sm', ' data-id="' + esc(s.id) + '"') + '</div>';
      }).join('') + '<div style="margin-top:10px">' + btn('stopall', T('sh_stop_all'), 'sec sm') + '</div>'
      : '<p class="lc-muted">' + esc(T('sh_none')) + '</p>');

    var inn = activeIn();
    h += card(T('sh_with_me'), inn.length
      ? inn.map(function (s) {
        var p = S.peers[s.ownerUid], has = p && validCoords(p.lat, p.lng);
        return '<div class="lc-row">' + av(s.ownerName) + '<div class="grow"><b>' + esc(s.ownerName) + '</b><span class="lc-muted">' +
          (has ? esc(ago(p.updatedAtMs)) + ' · ' + esc(fmtAcc(p.accuracy)) + ' · ' + esc(remaining(s.expiresAtMs)) : esc(T('sh_peer_nopos'))) + '</span></div>' +
          (has ? '<button type="button" class="lc-btn sec sm" data-act="fly" data-lat="' + p.lat + '" data-lng="' + p.lng + '">' + esc(T('dv_view')) + '</button>' : '') + '</div>';
      }).join('')
      : '<p class="lc-muted">' + esc(T('sh_with_me_empty')) + '</p>');

    var sent = S.inShares.filter(function (s) { return s.status === 'pending' && s.requestedBy === me; });
    if (sent.length) {
      h += card(T('sh_sent'), sent.map(function (s) {
        return '<div class="lc-row">' + av(s.ownerName) + '<div class="grow"><b>' + esc(s.ownerName) + '</b><span class="lc-muted">' + esc(T('sh_waiting')) + '</span></div>' +
          btn('cancelreq', T('sh_cancel'), 'sec sm', ' data-id="' + esc(s.id) + '"') + '</div>';
      }).join(''));
    }
    return h;
  }

  /* ---- Onglet Sécurité (SOS + contacts d'urgence) ---- */
  function tabSec() {
    var h = '';
    h += card(T('sos_title'),
      (S.sosMine
        ? '<p><b>' + esc(T('sos_active', { ago: ago(S.sosMine.startedAtMs) })) + '</b></p>' + btn('sosoff', T('sos_off'), 'red')
        : '<button type="button" class="lc-sosbtn" data-act="sosask" aria-label="' + esc(T('sos_confirm_title')) + '">' + esc(T('sos_btn')) + '</button><p class="lc-muted" style="text-align:center">' + esc(T('sos_desc')) + '</p>'));

    var invites = S.contactsIn.filter(function (c) { return c.status === 'pending'; });
    if (invites.length) {
      h += card(T('ec_invites'), invites.map(function (c) {
        return '<div class="lc-row">' + av(c.ownerName) + '<div class="grow"><b>' + esc(c.ownerName) + '</b><span class="lc-muted">' + esc(T('ec_invite_txt', { name: c.ownerName })) + '</span></div>' +
          btn('acceptcontact', T('sh_accept'), 'sm', ' data-id="' + esc(c.id) + '"') + btn('rmcontact', T('sh_decline'), 'sec sm', ' data-id="' + esc(c.id) + '"') + '</div>';
      }).join(''));
    }
    h += card(T('ec_title'),
      (S.contacts.length ? S.contacts.map(function (c) {
        return '<div class="lc-row">' + av(c.contactName) + '<div class="grow"><b>' + esc(c.contactName) + '</b><span class="lc-muted">' + esc(c.status === 'accepted' ? T('ec_accepted') : T('ec_pending')) + '</span></div>' +
          btn('rmcontact', T('ec_remove'), 'sec sm', ' data-id="' + esc(c.id) + '"') + '</div>';
      }).join('') : '<p class="lc-muted">' + esc(T('ec_empty')) + '</p>') +
      (S.contacts.length < CFG.MAX_CONTACTS
        ? '<div class="lc-form" style="margin-top:10px"><input class="lc-in" id="lc-ec-user" maxlength="30" autocapitalize="none" autocomplete="off" placeholder="' + esc(T('sh_user_ph')) + '">' + btn('invite', T('ec_add'), 'sec') + '</div>'
        : '<p class="lc-muted">' + esc(T('ec_limit')) + '</p>'));

    if (S.contactsIn.some(function (c) { return c.status === 'accepted'; })) {
      h += card(T('sos_others'), S.sosOthers.length ? S.sosOthers.map(function (s) {
        var has = validCoords(s.lat, s.lng);
        return '<div class="lc-row"><span class="lc-av" style="background:#d7263d">SOS</span><div class="grow"><b>' + esc(s.ownerName) + '</b><span class="lc-muted">' +
          esc(T('sos_since', { ago: ago(s.startedAtMs) })) + ' · ' + (has ? esc(ago(s.updatedAtMs)) + ' · ' + esc(fmtAcc(s.accuracy)) : esc(T('sh_peer_nopos'))) + '</span></div>' +
          (has ? '<button type="button" class="lc-btn red sm" data-act="fly" data-lat="' + s.lat + '" data-lng="' + s.lng + '">' + esc(T('dv_view')) + '</button>' : '') + '</div>';
      }).join('') : '<p class="lc-muted">' + esc(T('sos_others_none')) + '</p>');
    }
    return h;
  }

  /* ---- Onglet Appareils ---- */
  function tabDev() {
    var h = card(T('dv_title'),
      '<label class="lc-sw"><span><b>' + esc(T('dv_track')) + '</b><br><span class="lc-muted">' + esc(T('dv_track_help')) + '</span></span><input type="checkbox" data-ch="track"' + (cfg.track ? ' checked' : '') + '></label>');
    var list = S.devices.slice().sort(function (a, b) { return (b.lastSeenMs || 0) - (a.lastSeenMs || 0); });
    h += card('', list.length ? list.map(function (d) {
      var mine = d.id === devId();
      var online = mine ? (S.watchId != null && cfg.track) : (d.lastSeenMs && now() - d.lastSeenMs < CFG.ONLINE_WINDOW_MS);
      var has = validCoords(d.lat, d.lng);
      return '<div class="lc-row" style="align-items:flex-start"><div class="grow"><b>' + esc(d.name || '—') + (mine ? ' · ' + esc(T('dv_this')) : '') + '</b>' +
        '<span class="lc-pillst ' + (online ? 'ok' : '') + '" style="margin:4px 0"><i></i>' + esc(online ? T('dv_online') : T('dv_offline')) + '</span><br>' +
        '<span class="lc-muted">' + (has ? esc(T('dv_lastpos', { ago: ago(d.lastPosMs) })) + ' · ' + esc(fmtAcc(d.accuracy)) : esc(T('dv_nopos'))) +
        (typeof d.battery === 'number' ? ' · ' + esc(T('dv_battery', { n: d.battery })) : '') + '</span><br>' +
        '<span class="lc-muted">' + esc(T('dv_lastseen', { ago: ago(d.lastSeenMs) })) + '</span>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
        (has ? '<button type="button" class="lc-btn sm" data-act="fly" data-lat="' + d.lat + '" data-lng="' + d.lng + '">' + esc(T('dv_view')) + '</button>' : '') +
        (mine ? '' : btn('askdev', T('dv_ask'), 'sec sm', ' data-id="' + esc(d.id) + '"')) +
        btn('rename', T('dv_rename'), 'sec sm', ' data-id="' + esc(d.id) + '" data-name="' + esc(d.name || '') + '"') +
        btn('rmdev', T('dv_remove'), 'sec sm', ' data-id="' + esc(d.id) + '"') + '</div></div></div>';
    }).join('') : '<p class="lc-muted">' + esc(T('dv_empty')) + '</p>');
    return h + '<p class="lc-muted">' + esc(T('dv_limits')) + '</p>';
  }

  /* ---- Onglet Historique ---- */
  function tabHist() {
    if (!cfg.history) return card(T('hi_title'), '<p class="lc-muted">' + esc(T('hi_off')) + '</p>');
    var h = '<p class="lc-muted">' + esc(T('hi_rule', { n: cfg.historyMin, m: CFG.HISTORY_MIN_DIST_M, d: cfg.retention })) + '</p>';
    if (S.histErr) h += '<div class="lc-err">' + esc(errText(S.histErr)) + '</div>';
    h += S.history.length ? S.history.map(function (p) {
      return '<div class="lc-row"><div class="grow"><b>' + esc(fmtTime(p.tsMs)) + '</b><span class="lc-muted">' + fmtCoord(p.lat) + ', ' + fmtCoord(p.lng) + ' · ' + esc(fmtAcc(p.accuracy)) + '</span></div>' +
        '<button type="button" class="lc-btn sec sm" data-act="fly" data-lat="' + p.lat + '" data-lng="' + p.lng + '">' + esc(T('dv_view')) + '</button></div>';
    }).join('') : (S.histErr ? '' : '<p class="lc-muted">' + esc(T('hi_empty')) + '</p>');
    if (S.history.length) h += '<div style="margin-top:10px">' + btn('clearhist', T('hi_clear'), 'sec sm') + '</div>';
    return card(T('hi_title'), h);
  }

  /* ---- Onglet Confidentialité ---- */
  function tabPriv() {
    var items = ['pv_1', 'pv_2', 'pv_3', 'pv_4', 'pv_5', 'pv_6'].map(function (k) { return '<li style="margin-bottom:6px">' + esc(T(k)) + '</li>'; }).join('');
    var h = card(T('pv_title'), '<ul style="margin:0;padding-left:18px;font-size:.86rem;line-height:1.45">' + items + '</ul>');
    var freq = CFG.HISTORY_INTERVALS_MIN.map(function (n) { return '<option value="' + n + '"' + (cfg.historyMin === n ? ' selected' : '') + '>' + n + ' ' + T('min_unit') + '</option>'; }).join('');
    var keep = CFG.HISTORY_RETENTIONS_DAYS.map(function (n) { return '<option value="' + n + '"' + (cfg.retention === n ? ' selected' : '') + '>' + n + ' ' + T('day_unit') + '</option>'; }).join('');
    h += card(T('pv_history'),
      '<label class="lc-sw"><span><b>' + esc(T('pv_history')) + '</b></span><input type="checkbox" data-ch="hist"' + (cfg.history ? ' checked' : '') + '></label>' +
      '<div class="lc-grid"><div class="lc-kv"><small>' + esc(T('pv_every')) + '</small><select class="lc-in" data-ch="histfreq">' + freq + '</select></div>' +
      '<div class="lc-kv"><small>' + esc(T('pv_keep')) + '</small><select class="lc-in" data-ch="histkeep">' + keep + '</select></div></div>');
    h += card('', btn('delall', T('pv_delete_all'), 'red'));
    return h;
  }

  /* ---- Fenêtre de confirmation ---- */
  function openSheet(title, text, warn, okLabel, onOk) {
    var sh = $('lc-sheet'); if (!sh) return;
    S.sheetOk = onOk;
    sh.innerHTML = '<div class="lc-sheet-box" role="alertdialog"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
      (warn ? '<div class="lc-warn">' + esc(warn) + '</div>' : '') +
      btn('sheetok', okLabel, 'red') + btn('sheetno', T('cancel'), 'sec') + '</div>';
    sh.classList.add('open');
  }
  function closeSheet() { var sh = $('lc-sheet'); if (sh) { sh.classList.remove('open'); sh.innerHTML = ''; } S.sheetOk = null; }

  /* ---- Actions ---- */
  function run(b, fn, okMsg) {
    if (b) b.disabled = true;
    Promise.resolve().then(fn).then(function () { if (okMsg) toastLC(okMsg); })
      .catch(function (e) { toastLC(userErr(e), 'error'); })
      .then(function () { if (b) b.disabled = false; if (S.open) { renderTab(); renderSosBar(); drawMap(); } });
  }
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function needPos() { if (!lsGet(LS_CONSENT) && !S.me) { toastLC(T('pos_wait'), 'error'); return true; } return false; }

  function onClick(ev) {
    var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    switch (act) {
      case 'close': close(); break;
      case 'recenter': { var lk = lastKnown(); if (lk) flyTo(lk.lat, lk.lng); break; }
      case 'tab': setTab(t.getAttribute('data-tab')); break;
      case 'startpos': lsSet(LS_CONSENT, '1'); S.watchId = null; startWatch(); queryPerm(); renderTab(); break;
      case 'stoppos': stopWatch(); renderTab(); break;
      case 'refreshpos': oneShotFix(); geocodeMaybe(true); break;
      case 'fly': flyTo(parseFloat(t.getAttribute('data-lat')), parseFloat(t.getAttribute('data-lng'))); break;
      case 'share': if (needPos()) break; run(t, function () { return shareWith(val('lc-sh-user'), parseInt(val('lc-sh-dur'), 10) || 0).then(function () { var u = $('lc-sh-user'); if (u) u.value = ''; }); }, T('sh_done')); break;
      case 'ask': run(t, function () { return askPosition(val('lc-sh-user')).then(function () { var u = $('lc-sh-user'); if (u) u.value = ''; }); }, T('sh_asked')); break;
      case 'accept': if (needPos()) break; run(t, function () { return acceptRequest(id, parseInt(val('lc-acc-' + id), 10) || 0); }, T('sh_done')); break;
      case 'decline': run(t, function () { return declineRequest(id); }); break;
      case 'stopshare': run(t, function () { return stopShare(id); }, T('sh_stopped')); break;
      case 'stopall': run(t, stopAllShares, T('sh_stopped')); break;
      case 'cancelreq': run(t, function () { return deleteShareDoc(id); }); break;
      case 'sosask':
        openSheet(T('sos_confirm_title'), T('sos_confirm_text'), acceptedContacts().length ? '' : T('sos_confirm_none'), T('sos_confirm_yes'), function () { closeSheet(); activateSos(); });
        break;
      case 'sosoff': deactivateSos(); break;
      case 'sheetok': { var cb = S.sheetOk; if (cb) cb(); break; }
      case 'sheetno': closeSheet(); break;
      case 'invite': run(t, function () { return inviteContact(val('lc-ec-user')).then(function () { var u = $('lc-ec-user'); if (u) u.value = ''; }); }, T('ec_sent')); break;
      case 'acceptcontact': run(t, function () { return acceptContact(id); }); break;
      case 'rmcontact': run(t, function () { return removeContact(id); }); break;
      case 'askdev': run(t, function () { return requestDeviceRefresh(id); }, T('dv_ask_sent')); break;
      case 'rename': { var nn = root.prompt(T('dv_name_prompt'), t.getAttribute('data-name') || ''); if (nn) run(t, function () { return renameDevice(id, nn); }); break; }
      case 'rmdev': run(t, function () { return removeDevice(id); }); break;
      case 'clearhist': run(t, clearHistory, T('hi_cleared')); break;
      case 'delall':
        openSheet(T('pv_delete_all'), T('pv_delete_confirm'), '', T('dv_remove'), function () {
          closeSheet(); deleteAllMyData().then(function () { toastLC(T('pv_deleted')); renderTab(); renderSosBar(); drawMap(); }).catch(function (e) { toastLC(errText(e), 'error'); });
        });
        break;
      default: break;
    }
  }
  function onChange(ev) {
    var t = ev.target; var ch = t && t.getAttribute ? t.getAttribute('data-ch') : null;
    if (!ch) return;
    if (ch === 'track') { setTrack(!!t.checked); }
    else if (ch === 'hist') {
      cfg.history = !!t.checked; saveCfg(); S.lastH = { t: 0, pos: null };
      if (cfg.history) { lsSet(LS_CONSENT, '1'); startWatch(); if (S.me) writeTargets(false); }
      renderTab();
    }
    else if (ch === 'histfreq') { cfg.historyMin = parseInt(t.value, 10) || 15; saveCfg(); }
    else if (ch === 'histkeep') { cfg.retention = parseInt(t.value, 10) || 7; saveCfg(); }
  }

  function setTab(k) {
    if (TABS.indexOf(k) < 0) k = 'pos';
    S.tab = k; S.fitted = false;
    renderTabs(); renderTab(); drawMap();
    if (k === 'hist' && cfg.history) loadHistory().then(function () { if (S.open && S.tab === 'hist') { renderTab(); drawMap(); } });
    if (k === 'dev') loadDevices().then(function () { if (S.open && S.tab === 'dev') { renderTab(); drawMap(); } });
    if (k === 'sec') Promise.all([loadContacts(), loadSosMine()]).then(refreshSosOthers).then(function () { if (S.open && S.tab === 'sec') { renderTab(); renderSosBar(); } });
    if (k === 'share') loadShares().then(function () { if (S.open && S.tab === 'share') { renderTab(); drawMap(); } });
  }

  /* ---- Ouverture / fermeture ---- */
  function startTimer() {
    stopTimer();
    S.timer = setInterval(function () {
      if (!S.open) return;
      cleanupExpired();
      if (S.tab === 'sec') refreshSosOthers();
      if (S.tab === 'share' || S.tab === 'dev' || S.tab === 'pos') renderTab();
      renderSosBar(); updatePill();
    }, 30000);
  }
  function stopTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

  function open(tab) {
    if (!myUid() || !getDb()) { try { if (typeof showToast === 'function') showToast(T('login_needed'), 'error'); } catch (e) { /* ignore */ } return; }
    injectCss(); buildDom(); buildPill();
    S.open = true; S.tab = TABS.indexOf(tab) >= 0 ? tab : (S.tab || 'pos'); S.fitted = false;
    $('lc-root').classList.add('open');
    $('lc-title').textContent = T('title');
    renderTabs(); renderTab(); renderSosBar();
    initMap(); queryPerm();
    if (lsGet(LS_CONSENT)) startWatch();
    Promise.all([loadShares(), loadContacts(), loadDevices(), loadSosMine()]).then(function () {
      if (!S.open) return;
      syncPeers(); refreshSosOthers();
      renderTab(); renderSosBar(); drawMap();
      if (S.tab === 'hist' && cfg.history) loadHistory().then(function () { renderTab(); drawMap(); });
    });
    if (cfg.history) purgeOldHistory();
    if (cfg.track) ensureDeviceDoc().then(watchSelfDevice);
    geocodeMaybe(false); startTimer(); updatePill();
  }
  function close() {
    S.open = false; closeSheet();
    var r = $('lc-root'); if (r) r.classList.remove('open');
    stopTimer(); stopPeerListeners(); destroyMap();
    if (!needsWatch()) stopWatch();
    updatePill();
  }

  /* Démarrage discret (appelé par menu-pro.js si un suivi/partage/SOS était actif) */
  function boot() {
    if (S.booted || !myUid() || !getDb()) return;
    S.booted = true;
    injectCss(); buildPill();
    Promise.all([loadShares(), loadSosMine()]).then(function () {
      function go() {
        if (cfg.track) ensureDeviceDoc().then(watchSelfDevice);
        if (needsWatch()) startWatch();
        updatePill();
      }
      // On ne lance le GPS en arrière-plan que si la permission est DÉJÀ accordée :
      // jamais de demande surprise au démarrage de l'application.
      try {
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'geolocation' }).then(function (r) { if (r.state === 'granted') go(); else updatePill(); }).catch(go);
        } else go();
      } catch (e) { go(); }
    });
  }

  root.LocationCenter = {
    open: open, close: close, boot: boot,
    isOpen: function () { return S.open; },
    _test: { haversine: haversine, validCoords: validCoords, remaining: remaining, ago: ago, isActiveShare: isActiveShare }
  };
})();
