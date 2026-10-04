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
    // Deux sources : si la première est bloquée ou en panne, la seconde prend le relais.
    LEAFLET_JS: ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],
    LEAFLET_CSS: ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'],
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
    err_perm: ["Action refusée : les règles Firestore du Centre de localisation ne sont pas encore publiées (ou pas à jour). Va dans la section « Vérifier ma configuration » (onglet Confidentialité).", 'Action refused: the Firestore rules for the Location center are not published yet (or outdated). See “Check my setup” (Privacy tab).'],
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
    var all = document.querySelectorAll('link[data-lc]');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('href') === href) return;
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
    perm: 'unknown', booted: false, flash: '', cspBlocked: false, exchange: false, badBases: {}, tileOk: false, mp: { base: 'plan', labels: true, acc: true }, sel: null, selTok: 0, layersOpen: false, addrDetail: null, links: [], fs: false, diag: null, regError: '', lkDur: 60,
    profile: null, profileLoaded: false, priv: null, blocked: {}, dir: { q: '', results: [], loading: false, ready: false }, dirTimer: null, sheetDur: 60
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
  function needsWatch() { return !!(cfg.track || activeOut().length || activeLinks().length || S.sosMine || (cfg.history && S.booted)); }
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
      '.lc-panel{background:#f4f6fb;border-radius:22px 22px 0 0;margin-top:-18px;position:relative;z-index:2;box-shadow:0 -8px 24px rgba(20,26,38,.12)}',
      '#lc-root.mapfs .lc-panel{margin-top:0}',
      '.lc-mapwrap{position:relative;height:38vh;min-height:220px;background:var(--green-light,#eef1f6);flex:0 0 auto}',
      '#lc-map{position:absolute;inset:0;z-index:0;isolation:isolate}',
      '.lc-mapwrap.fb{height:auto;min-height:0}.lc-mapwrap.fb #lc-map{display:none}.lc-mapwrap.fb .lc-mapfb{position:relative;padding:18px 16px}',
      '.lc-mapfb{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;text-align:center;font-size:.9rem}',
      '.lc-panel{flex:1;min-height:0;display:flex;flex-direction:column}',
      '.lc-nav{flex:0 0 auto;display:grid;grid-template-columns:repeat(6,1fr);background:#fff;border-top:1px solid var(--line,#e2e6ee);box-shadow:0 -6px 20px rgba(20,26,38,.06);padding:6px 4px calc(6px + env(safe-area-inset-bottom));z-index:3}',
      '#lc-root.mapfs .lc-nav{display:none}',
      '.lc-navb{border:0;background:none;font:inherit;color:#6b7686;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;border-radius:14px;cursor:pointer;min-width:0}',
      '.lc-navb svg{width:23px;height:23px;display:block}.lc-navb span{font-size:.64rem;font-weight:700;letter-spacing:.01em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lc-navb.on{color:#1b4fd8}.lc-navb.on .ic{background:#e6edff}.lc-navb .ic{display:flex;align-items:center;justify-content:center;width:46px;height:28px;border-radius:14px}',
      '.lc-navb .dot{position:absolute;top:2px;right:8px;width:9px;height:9px;border-radius:50%;background:#d7263d;border:2px solid #fff}.lc-navb .ic{position:relative}',
      '.lc-hero{border-radius:22px;padding:16px;margin-bottom:14px;background:linear-gradient(135deg,#15305f,#1b4fd8 70%,#3b82f6);color:#fff;box-shadow:0 10px 28px rgba(27,79,216,.28)}',
      '.lc-hero .st{display:inline-flex;align-items:center;gap:6px;font-size:.74rem;font-weight:800;background:rgba(255,255,255,.18);border-radius:999px;padding:5px 11px}.lc-hero .st i{width:8px;height:8px;border-radius:50%;background:#9aa6b8}.lc-hero .st.ok i{background:#55e08a}.lc-hero .st.wait i{background:#ffd166}.lc-hero .st.bad i{background:#ff7b7b}',
      '.lc-hero h2{margin:12px 0 2px;font-size:1.25rem;line-height:1.25;font-weight:800}.lc-hero p{margin:0;font-size:.84rem;opacity:.85}',
      '.lc-hero .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.lc-hero .lc-btn{background:#fff;color:#15305f}.lc-hero .lc-btn.sec{background:rgba(255,255,255,.16);color:#fff;border:0}',
      '.lc-sec{margin:18px 2px 10px;font-size:.95rem;font-weight:800}',
      '.lc-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}',
      '.lc-tile{position:relative;text-align:left;border:0;border-radius:20px;padding:14px;background:#fff;box-shadow:0 4px 18px rgba(20,26,38,.08);font:inherit;color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:6px;min-height:118px}',
      '.lc-tile:active{transform:scale(.98)}.lc-tile .ti{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff}.lc-tile .ti svg{width:23px;height:23px}',
      '.lc-tile b{font-size:.95rem;font-weight:800;line-height:1.2}.lc-tile span.d{font-size:.78rem;color:#5d6779;line-height:1.35}',
      '.lc-tile .bd{position:absolute;top:12px;right:12px;font-size:.66rem;font-weight:800;border-radius:999px;padding:3px 8px;background:#e6f6ec;color:#1b7a3d}.lc-tile .bd.off{background:#eef1f6;color:#6b7686}.lc-tile .bd.red{background:#fde8ea;color:#d7263d}',
      '.lc-mapnote{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:4;display:none;align-items:center;gap:8px;background:rgba(255,255,255,.96);border-radius:999px;padding:7px 14px;font-size:.78rem;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.2);pointer-events:none;white-space:nowrap}',
      '.lc-mapnote.on{display:flex}.lc-mapnote i{width:14px;height:14px;border-radius:50%;border:2px solid #cfd6e2;border-top-color:#1b4fd8;animation:lcspin .8s linear infinite}@keyframes lcspin{to{transform:rotate(360deg)}}',
      '#lc-root.mapfs .lc-mapnote{top:calc(max(10px,env(safe-area-inset-top)) + 58px)}',
      '.lc-lnote{background:#fff4e6;color:#8a4b00;border-radius:12px;padding:10px 12px;font-size:.8rem;margin-bottom:12px;line-height:1.4}.lc-lnote button{margin-top:8px}',
      '.lc-opt .bad{display:block;font-size:.66rem;color:#d7263d;font-weight:700;margin-top:-4px}',
      '#lc-tabbody{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 24px;-webkit-overflow-scrolling:touch;background:#f4f6fb}',
      '.lc-card{border:0;border-radius:20px;padding:16px;margin-bottom:14px;background:var(--white,#fff);box-shadow:0 4px 18px rgba(20,26,38,.08)}',
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
      '.lc-av{position:relative;overflow:hidden}.lc-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
      '.lc-lbl{font-size:.74rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#5d6779);margin-top:2px}',
      '#lc-root.mapfs .lc-panel{display:none}#lc-root.mapfs .lc-mapwrap{height:auto;flex:1;min-height:0}',
      '.lc-mapwrap.fb .lc-fsbtn{display:none}',
      '#lc-root.mapfs #lc-toast{bottom:96px}',
      '.lc-fsbtn{position:absolute;top:10px;right:10px;z-index:4;width:42px;height:42px;border-radius:12px;border:0;background:#fff;color:#141a26;box-shadow:0 2px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;cursor:pointer}',
      '#lc-fsbar{position:absolute;left:0;right:0;bottom:0;z-index:4;display:none;gap:8px;overflow-x:auto;padding:24px 12px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(transparent,rgba(0,0,0,.4));scrollbar-width:none}',
      '#lc-root.mapfs #lc-fsbar{display:flex}',
      '.lc-fschip{flex:0 0 auto;border:0;border-radius:14px;background:#fff;color:#141a26;padding:9px 13px;text-align:left;font:inherit;box-shadow:0 2px 8px rgba(0,0,0,.28);cursor:pointer;display:flex;flex-direction:column;gap:1px}',
      '.lc-fschip b{font-size:.88rem}.lc-fschip span{font-size:.72rem;color:#5d6779}.lc-fschip.sos{background:#d7263d;color:#fff}.lc-fschip.sos span{color:#ffd6db}.lc-fschip.off{opacity:.85;cursor:default}',
      '.lc-ch{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.lc-ch .lc-btn{padding:10px 6px;font-size:.8rem;text-align:center}',
      '.lc-linkbox{border:1px dashed var(--line,#cfd6e2);border-radius:12px;padding:10px 12px;margin-top:10px;font-size:.82rem;word-break:break-all;background:var(--green-light,#eef1f6)}',
      '.lc-dg{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--line,#e2e6ee);font-size:.86rem}.lc-dg i{font-style:normal;font-weight:900;width:20px;flex:0 0 20px;text-align:center}',
      '.lc-dg.ok i{color:#2f9e44}.lc-dg.ko i{color:#e03131}.lc-dg.na i{color:#f08c00}.lc-dg small{display:block;color:var(--muted,#5d6779);margin-top:2px;line-height:1.4}',
      '#lc-root.mapfs .lc-head{display:none}',
      '.lc-lyrbtn{position:absolute;top:60px;right:10px;z-index:4;width:42px;height:42px;border-radius:12px;border:0;background:#fff;color:#141a26;box-shadow:0 2px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;cursor:pointer}',
      '#lc-root.mapfs .lc-lyrbtn,#lc-root.mapfs .lc-fsbtn,#lc-root.mapfs .leaflet-control-zoom,#lc-root.mapfs .leaflet-control-scale{display:none!important}',
      '#lc-fstop{display:none}',
      '#lc-root.mapfs #lc-fstop{display:flex;position:absolute;z-index:6;left:10px;right:10px;top:max(10px,env(safe-area-inset-top));gap:8px;align-items:center}',
      '.lc-fsround{flex:0 0 46px;width:46px;height:46px;border-radius:50%;border:0;background:#fff;color:#141a26;box-shadow:0 2px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;cursor:pointer}',
      '.lc-fspill{flex:1;min-width:0;background:#fff;border-radius:23px;min-height:46px;box-shadow:0 2px 10px rgba(0,0,0,.3);padding:6px 16px;display:flex;flex-direction:column;justify-content:center}',
      '.lc-fspill b{font-size:.92rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lc-fspill span{font-size:.74rem;color:#5d6779;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.lc-fsloc{display:none}',
      '#lc-root.mapfs .lc-fsloc{display:flex;position:absolute;z-index:5;right:12px;bottom:calc(96px + env(safe-area-inset-bottom));width:50px;height:50px;border-radius:50%;border:0;background:#fff;color:#0b7a8a;box-shadow:0 2px 10px rgba(0,0,0,.3);align-items:center;justify-content:center;cursor:pointer}',
      '#lc-root.mapfs.hasplace .lc-fsloc{bottom:calc(var(--lc-place-h,0px) + 14px)}#lc-root.mapfs.hasplace #lc-fsbar{display:none}',
      '#lc-layers{display:none;position:absolute;inset:0;z-index:12;background:rgba(10,14,22,.45);align-items:flex-end;justify-content:center}#lc-layers.open{display:flex}',
      '.lc-lbox{background:#fff;width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:18px 18px calc(20px + env(safe-area-inset-bottom));max-height:82vh;overflow:auto;color:#141a26}',
      '.lc-lhead{display:flex;align-items:center;justify-content:space-between}.lc-lhead h3{margin:0 0 10px;font-size:1.05rem;font-weight:700}',
      '.lc-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:6px}',
      '.lc-opt{border:0;background:none;padding:0;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;color:#141a26}',
      '.lc-opt .th{width:74px;height:74px;border-radius:14px;overflow:hidden;border:3px solid transparent;display:flex;align-items:center;justify-content:center;background:#eef1f6}',
      '.lc-opt .th svg{width:100%;height:100%;display:block}.lc-opt.on .th{border-color:#0b7a8a}.lc-opt.on b{color:#0b7a8a}.lc-opt b{font-size:.84rem;font-weight:600;text-align:center}',
      '.lc-lsep{height:1px;background:#e2e6ee;margin:12px 0}',
      '#lc-place{display:none;position:absolute;left:0;right:0;bottom:0;z-index:8;background:#fff;color:#141a26;border-radius:20px 20px 0 0;padding:16px 16px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -4px 20px rgba(0,0,0,.25);max-height:58%;overflow:auto}#lc-place.open{display:block}',
      '.lc-phead{display:flex;align-items:flex-start;gap:10px}.lc-phead .grow{flex:1;min-width:0}.lc-phead h3{margin:0;font-size:1.15rem;font-weight:700;line-height:1.25}',
      '.lc-arows .wide{grid-column:1/-1}',
      '.lc-arows{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin:12px 0 8px}.lc-arows small{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#5d6779;font-weight:700}.lc-arows b{font-size:.92rem;font-weight:600;word-break:break-word}',
      '.lc-pmeta{font-size:.78rem;color:#5d6779;margin:6px 0 12px;word-break:break-word}.lc-pacts{display:flex;gap:8px;flex-wrap:wrap}.lc-pacts a{text-decoration:none;display:inline-flex;align-items:center}',
      '.lc-pin{width:30px;height:30px;border-radius:50% 50% 50% 0;background:#d93025;transform:rotate(-45deg);margin:0 auto;box-shadow:0 2px 8px rgba(0,0,0,.4);position:relative}.lc-pin::after{content:"";position:absolute;left:9px;top:9px;width:12px;height:12px;border-radius:50%;background:#fff}',
      '.lc-details summary{cursor:pointer;font-weight:800;font-size:.88rem}',
      '.lc-steps{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.lc-steps li{display:flex;align-items:center;gap:10px;font-size:.86rem;line-height:1.35}',
      '.lc-step{flex:0 0 auto;width:24px;height:24px;border-radius:50%;background:var(--green,#28374f);color:#fff;font-weight:800;font-size:.78rem;display:inline-flex;align-items:center;justify-content:center}',
      '.lc-person{border:1px solid var(--line,#e2e6ee);border-radius:14px;padding:10px 12px;margin-bottom:8px;background:var(--white,#fff)}',
      '.lc-person .top{display:flex;align-items:center;gap:10px}.lc-person .grow{flex:1;min-width:0}.lc-person .grow b{display:block;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lc-diracts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.lc-diracts .lc-btn{flex:1 1 auto}',
      '.lc-chip-s{display:inline-block;margin:4px 6px 0 0;padding:3px 9px;border-radius:999px;background:#e6fcf5;color:#087f5b;font-size:.72rem;font-weight:800}',
      '.lc-chips{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 12px}',
      '.lc-chip{border:2px solid var(--line,#e2e6ee);background:var(--white,#fff);color:var(--ink,#141a26);border-radius:12px;padding:12px 8px;font:inherit;font-weight:800;font-size:.9rem;cursor:pointer}',
      '.lc-chip.on{border-color:var(--green,#28374f);background:var(--green-light,#eef1f6)}',
      '.lc-btn.ok{background:#2f9e44;color:#fff}',
      '.lc-invite{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-top:6px}',
      '@media (min-width:900px){.lc-body{flex-direction:row}.lc-mapwrap{height:auto;min-height:0;flex:1}.lc-panel{flex:0 0 440px;border-left:1px solid var(--line,#e2e6ee);margin-top:0;border-radius:0}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------
     CARTE (Leaflet + OpenStreetMap, chargés seulement à l'ouverture)
     ------------------------------------------------------------------ */
  function ensureLeaflet() {
    if (root.L && root.L.map) return Promise.resolve(root.L);
    if (S.leafletPromise) return S.leafletPromise;
    var i = 0;
    function tryNext() {
      if (i >= CFG.LEAFLET_JS.length) return Promise.reject(new Error('leaflet'));
      var k = i++;
      loadCss(CFG.LEAFLET_CSS[k]);
      return loadScript(CFG.LEAFLET_JS[k]).then(function () {
        if (!(root.L && root.L.map)) throw new Error('leaflet-empty');
        return root.L;
      }).catch(tryNext);
    }
    S.leafletPromise = tryNext();
    S.leafletPromise.catch(function () { S.leafletPromise = null; });
    return S.leafletPromise;
  }
  // Détecte un blocage par la politique de sécurité (vercel.json pas à jour)
  document.addEventListener('securitypolicyviolation', function (e) {
    if (/cdnjs|jsdelivr|openstreetmap|arcgisonline|opentopomap/.test(e.blockedURI || '')) S.cspBlocked = true;
  });
  function initMap() {
    var el = $('lc-map');
    if (!el || S.map) return;
    ensureLeaflet().then(function (L) {
      if (!S.open || S.map) return;
      S.L = L; S.mapFailed = false;
      var fb = $('lc-mapfb'); if (fb) fb.style.display = 'none';
      var wrap = document.querySelector('.lc-mapwrap'); if (wrap) wrap.classList.remove('fb');
      var start = lastKnown();
      loadMapPrefs();
      S.map = L.map(el, { zoomControl: false }).setView(start ? [start.lat, start.lng] : [2, 20], start ? 16 : 3);
      L.control.zoom({ position: 'bottomright' }).addTo(S.map);
      L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(S.map);
      S.map.attributionControl.setPrefix(false);
      applyBase();
      S.group = L.layerGroup().addTo(S.map);
      // Toucher la petite carte l'ouvre en plein écran ; en plein écran, toucher un point donne son adresse précise.
      S.map.on('click', function (e) {
        if (S.layersOpen) { S.layersOpen = false; renderLayersSheet(); return; }
        if (!S.fs) { S.fs = true; applyFs(); return; }
        selectPlace({ lat: e.latlng.lat, lng: e.latlng.lng, label: '' }, false);
      });
      drawSel();
      drawMap();
      setTimeout(function () { if (S.map) S.map.invalidateSize(); }, 250);
    }).catch(function () { setTimeout(function () { S.mapFailed = true; showMapFallback(); }, 60); });
  }
  function destroyMap() {
    if (S.map) { try { S.map.remove(); } catch (e) { /* ignore */ } }
    clearTimeout(S.baseTimer); setMapBusy(false);
    S.map = null; S.group = null; S.fitted = false; S.baseLayer = null; S.ovLabels = null; S.ovRoads = null; S.selMarker = null;
  }
  function showMapFallback() {
    var fb = $('lc-mapfb'); if (!fb) return;
    var m = lastKnown();
    var wrap = document.querySelector('.lc-mapwrap'); if (wrap) wrap.classList.add('fb');
    fb.style.display = 'flex';
    fb.innerHTML = '<div>' + esc(S.cspBlocked ? T('map_blocked') : T('map_fallback')) + '</div>' + (m
      ? '<b>' + fmtCoord(m.lat) + ', ' + fmtCoord(m.lng) + '</b><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=' + m.lat + '&mlon=' + m.lng + '#map=17/' + m.lat + '/' + m.lng + '">' + esc(T('open_osm')) + '</a>'
      : '<span class="lc-muted">' + esc(T('no_pos')) + '</span>') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button type="button" class="lc-btn sec sm" data-act="retrymap">' + esc(T('retry')) + '</button>' +
      (S.cspBlocked ? '<button type="button" class="lc-btn sm" data-act="repair">' + esc(T('dg_fix')) + '</button>' : '') + '</div>';
    if (S.cspBlocked) autoHeal();
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
      if (S.mp.acc) L.circle([m.lat, m.lng], { radius: Math.max(m.acc || 0, 3), color: '#1c7ed6', weight: 1, fillColor: '#1c7ed6', fillOpacity: .12, interactive: false }).addTo(g);
      pick(L.marker([m.lat, m.lng], { icon: icon('lc-mk-me'), zIndexOffset: 500 }).addTo(g), { lat: m.lat, lng: m.lng, label: T('fs_me'), ts: m.ts, acc: m.acc });
      pts.push([m.lat, m.lng]);
    } else if (lk) {
      if (S.mp.acc) L.circle([lk.lat, lk.lng], { radius: Math.max(lk.acc || 0, 3), color: '#868e96', weight: 1, dashArray: '4 4', fillOpacity: .06, interactive: false }).addTo(g);
      pick(L.marker([lk.lat, lk.lng], { icon: icon('lc-mk-last') }).addTo(g), { lat: lk.lat, lng: lk.lng, label: T('last_known', { ago: ago(lk.ts) }), ts: lk.ts, acc: lk.acc });
      pts.push([lk.lat, lk.lng]);
    }
    activeIn().forEach(function (sh) {
      var p = S.peers[sh.ownerUid];
      if (p && validCoords(p.lat, p.lng)) {
        pick(L.marker([p.lat, p.lng], { icon: icon('lc-mk-peer', initial(sh.ownerName)) }).addTo(g), { lat: p.lat, lng: p.lng, label: sh.ownerName, ts: p.updatedAtMs, acc: p.accuracy });
        pts.push([p.lat, p.lng]);
      }
    });
    S.sosOthers.forEach(function (s) {
      if (s.status === 'active' && validCoords(s.lat, s.lng)) {
        pick(L.marker([s.lat, s.lng], { icon: icon('lc-mk-sos', 'SOS'), zIndexOffset: 900 }).addTo(g), { lat: s.lat, lng: s.lng, label: 'SOS · ' + s.ownerName, ts: s.updatedAtMs, acc: s.accuracy });
        pts.push([s.lat, s.lng]);
      }
    });
    if (S.tab === 'dev') {
      S.devices.forEach(function (d) {
        if (validCoords(d.lat, d.lng) && d.id !== devId()) {
          pick(L.marker([d.lat, d.lng], { icon: icon('lc-mk-dev', '▣') }).addTo(g), { lat: d.lat, lng: d.lng, label: d.name, ts: d.lastPosMs, acc: d.accuracy });
          if (S.mp.acc) L.circle([d.lat, d.lng], { radius: Math.max(d.accuracy || 0, 3), color: '#495057', weight: 1, fillOpacity: .06, interactive: false }).addTo(g);
          pts.push([d.lat, d.lng]);
        }
      });
    }
    if (S.tab === 'hist' && S.history.length) {
      var line = S.history.filter(function (h) { return validCoords(h.lat, h.lng); }).map(function (h) { return [h.lat, h.lng]; });
      if (line.length > 1) L.polyline(line, { color: '#7048e8', weight: 3, opacity: .7 }).addTo(g);
      S.history.forEach(function (h) {
        if (validCoords(h.lat, h.lng)) pick(L.circleMarker([h.lat, h.lng], { radius: 5, color: '#7048e8', fillOpacity: .9 }).addTo(g), { lat: h.lat, lng: h.lng, label: fmtTime(h.tsMs), ts: h.tsMs, acc: h.accuracy });
      });
      line.forEach(function (q) { pts.push(q); });
    }
    renderFsBar(); renderFsTop();
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
  // Page ouverte AVANT le déploiement de vercel.json : le navigateur garde les anciens en-têtes
  // (GPS et carte bloqués) jusqu'au prochain chargement. Si le serveur envoie déjà la bonne
  // configuration, on recharge une seule fois (au plus toutes les 10 min) pour la récupérer.
  // CAUSE RÉELLE du « bloqué par le site » : le navigateur garde en cache HTTP l'ancienne page
  // avec ses anciens en-têtes de sécurité. Un simple rechargement envoie une requête « conditionnelle »,
  // le serveur répond « 304 inchangé » (le fichier HTML n'a pas bougé) et l'ancienne configuration
  // reste. On force donc : (1) un téléchargement complet qui REMPLACE l'entrée du cache, puis
  // (2) l'ouverture de la page sous une adresse neuve (?_cb=…) qui ne peut pas être en cache.
  function freshUrl() {
    var u = new URL(root.location.href);
    u.searchParams.set('_cb', String(now()));
    return u.pathname + (u.search || '') + (u.hash || '');
  }
  function refreshHttpCache() {
    var urls = ['/', root.location.pathname + root.location.search.replace(/[?&]_cb=\d+/, '')];
    return Promise.all(urls.map(function (u) { return fetch(u, { cache: 'reload', credentials: 'same-origin' }).catch(noop); }));
  }
  function hardReload() {
    return refreshHttpCache().then(function () { root.location.replace(freshUrl()); });
  }
  function autoHeal() {
    try {
      var last = parseInt(sessionStorage.getItem('cn_lc_heal') || '0', 10);
      if (now() - last < 600000) return;
      sessionStorage.setItem('cn_lc_heal', String(now()));
    } catch (e) { return; }
    fetch(root.location.pathname || '/', { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      var pp = r.headers.get('permissions-policy') || '', csp = r.headers.get('content-security-policy') || '';
      if (/geolocation=\(self\)/.test(pp) && /cdn\.jsdelivr\.net/.test(csp) && /tile\.openstreetmap\.fr/.test(csp)) {
        toastLC(T('heal_msg'));
        setTimeout(hardReload, 1200);
      }
    }).catch(noop);
  }
  function setStatus(st) { S.status = st; if (st === 'policy') autoHeal(); renderStatusBits(); updatePill(); }
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
  function policyBlocksGeo() {
    try {
      var pp = document.permissionsPolicy || document.featurePolicy;
      return !!(pp && typeof pp.allowsFeature === 'function' && !pp.allowsFeature('geolocation'));
    } catch (e) { return false; }
  }
  function startWatch() {
    if (!geoSupported()) { setStatus('unsupported'); return; }
    if (root.isSecureContext === false) { setStatus('insecure'); return; }
    if (policyBlocksGeo()) { setStatus('policy'); return; }
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
    if (code === 1) { var pol = policyBlocksGeo(); if (!pol) S.perm = 'denied'; stopWatch(); setStatus(pol ? 'policy' : 'denied'); }
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
    reverseDetail(m.lat, m.lng).then(function (d) {
      S.lastGeo = { lat: m.lat, lng: m.lng };
      S.addrDetail = d && d.ok ? d : null;
      S.address = d && d.full ? d.full : null;
      S.addrFailed = !(d && d.ok);
      renderPosBits();
    }).catch(function () { S.addrFailed = true; renderPosBits(); })
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
    var wantDev = cfg.track, wantLive = activeOut().length > 0 || activeLinks().length > 0;
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
  /* ------------------------------------------------------------------
     ANNUAIRE : s'inscrire (email / numéro) et retrouver ses proches
     Seuls nom + photo + @utilisateur sont publics. L'email et le numéro
     ne sont JAMAIS stockés en clair côté annuaire : on garde une empreinte
     SHA-256 qui sert uniquement à retrouver quelqu'un qui tape exactement
     son email ou son numéro (comparaison sur les 9 derniers chiffres, pour
     que +243 81 234 5678 et 081 234 5678 soient reconnus pareil).
     ------------------------------------------------------------------ */
  function sha(str) {
    return root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function normEmail(v) { v = String(v || '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : ''; }
  function normPhone(v) { var d = String(v || '').replace(/\D/g, ''); return (d.length < 8 || d.length > 15) ? '' : d.slice(-9); }
  function lookupId(kind, norm) { return sha('cn-loc-v1|' + kind + '|' + norm).then(function (h) { return kind + '_' + h; }); }
  function safePhoto(u) { return (typeof u === 'string' && /^https:\/\//.test(u) && u.length < 500) ? u : ''; }

  function loadProfile() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return col('location_profiles').doc(uid).get().then(function (s) {
      S.profile = s.exists ? s.data() : null; S.profileLoaded = true;
      if (!S.profile) { S.priv = null; return null; }
      return col('location_private').doc(uid).get().then(function (ps) { S.priv = ps.exists ? ps.data() : null; });
    }).catch(function (e) { S.profileLoaded = true; console.warn('[loc] profil', e.code); });
  }
  function loadBlocked() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return col('blocks').where('blockerUid', '==', uid).get().then(function (r) {
      S.blocked = {};
      r.docs.forEach(function (d) { var b = d.data().blockedUid || d.id.slice(uid.length + 1); S.blocked[b] = true; });
    }).catch(function () { /* ignore */ });
  }
  function registerProfile(phoneRaw, emailRaw) {
    var uid = myUid(), me = getMe();
    var em = normEmail(emailRaw), ph = normPhone(phoneRaw);
    if (!em && !ph) return Promise.reject({ code: 'need_one' });
    var wants = []; if (em) wants.push(['e', em]); if (ph) wants.push(['p', ph]);
    return Promise.all(wants.map(function (w) { return lookupId(w[0], w[1]); })).then(function (ids) {
      return Promise.all([col('location_private').doc(uid).get(), Promise.all(ids.map(function (id) { return col('location_lookup').doc(id).get(); }))]).then(function (r) {
        var old = (r[0].exists && r[0].data().lookupIds) || [], snaps = r[1];
        for (var i = 0; i < snaps.length; i++) if (snaps[i].exists && snaps[i].data().uid !== uid) throw { code: 'taken' };
        var b = getDb().batch();
        old.filter(function (id) { return ids.indexOf(id) < 0; }).forEach(function (id) { b.delete(col('location_lookup').doc(id)); });
        ids.forEach(function (id, k) { if (!snaps[k].exists) b.set(col('location_lookup').doc(id), { uid: uid, createdAtMs: now() }); });
        b.set(col('location_private').doc(uid), { ownerUid: uid, lookupIds: ids, email: em, phone: String(phoneRaw || '').trim().slice(0, 25), updatedAtMs: now() });
        var name = String(myName()).slice(0, 60), un = String((me && me.username) || '').slice(0, 30);
        b.set(col('location_profiles').doc(uid), {
          uid: uid, name: name, nameLower: name.toLowerCase(), username: un, usernameLower: un.toLowerCase(),
          photoURL: safePhoto(me && me.photoURL), createdAtMs: (S.profile && S.profile.createdAtMs) || now(), updatedAtMs: now()
        });
        return b.commit();
      });
    }).then(loadProfile);
  }
  function leaveDirectory() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    var ids = (S.priv && S.priv.lookupIds) || [];
    return Promise.all(ids.map(function (id) { return col('location_lookup').doc(id).delete().catch(function () { }); }))
      .then(function () { return col('location_private').doc(uid).delete().catch(function () { }); })
      .then(function () { return col('location_profiles').doc(uid).delete(); })
      .then(function () { S.profile = null; S.priv = null; S.dir = { q: '', results: [], loading: false, ready: false }; });
  }
  function searchDirectory(q) {
    var uid = myUid(); q = String(q || '').trim();
    function clean(arr) { var seen = {}; return arr.filter(function (p) { return p && p.uid && p.uid !== uid && !S.blocked[p.uid] && !seen[p.uid] && (seen[p.uid] = 1); }); }
    if (!q) return col('location_profiles').orderBy('nameLower').limit(25).get().then(function (r) { return clean(r.docs.map(function (d) { return d.data(); })); });
    var low = q.toLowerCase().replace(/^@/, ''), tasks = [];
    var em = normEmail(q), ph = /^[+\d][\d\s().-]{6,}$/.test(q) ? normPhone(q) : '';
    function byLookup(kind, norm) {
      return lookupId(kind, norm).then(function (id) { return col('location_lookup').doc(id).get(); })
        .then(function (s) { return s.exists ? col('location_profiles').doc(s.data().uid).get() : null; })
        .then(function (s) { return s && s.exists ? [s.data()] : []; }).catch(function () { return []; });
    }
    if (em) tasks.push(byLookup('e', em));
    if (ph) tasks.push(byLookup('p', ph));
    if (!em && !ph) {
      ['nameLower', 'usernameLower'].forEach(function (f) {
        tasks.push(col('location_profiles').where(f, '>=', low).where(f, '<=', low + '\uf8ff').limit(15).get()
          .then(function (r) { return r.docs.map(function (d) { return d.data(); }); }).catch(function () { return []; }));
      });
    }
    return Promise.all(tasks).then(function (a) { return clean([].concat.apply([], a)); });
  }
  function dirRun() {
    var q = S.dir.q; S.dir.loading = true; renderDirResults();
    searchDirectory(q).then(function (res) {
      if (S.dir.q !== q) return;
      S.dir.results = res; S.dir.loading = false; S.dir.ready = true; S.dir.error = null; renderDirResults();
    }).catch(function (e) { S.dir.loading = false; S.dir.results = []; S.dir.ready = true; S.dir.error = e || { code: 'unknown' }; renderDirResults(); toastLC(errText(e), 'error'); });
  }
  function dirDebounced() { if (S.dirTimer) clearTimeout(S.dirTimer); S.dirTimer = setTimeout(dirRun, 350); }
  function dirFind(uid) { for (var i = 0; i < S.dir.results.length; i++) if (S.dir.results[i].uid === uid) return S.dir.results[i]; return null; }
  function userErr(e) {
    if (e && e.code === 'need_one') return T('onb_need_one');
    if (e && e.code === 'taken') return T('onb_taken');
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

  function shareWithUid(tg, durMin) {
    var uid = myUid();
    if (activeOut().length >= CFG.MAX_SHARES) return Promise.reject({ code: 'limit' });
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
  }
  function askPositionUid(tg) {
    var uid = myUid(), id = tg.uid + '_' + uid, ref = col('location_shares').doc(id);
    return ref.get().then(function (s) {
      if (s.exists) {
        var st = s.data().status;
        if (st === 'pending' || st === 'active') return 'skip';
        return ref.delete().then(function () { return 'new'; });
      }
      return 'new';
    }).then(function (r) {
      if (r === 'skip') return null;
      return ref.set({
        ownerUid: tg.uid, viewerUid: uid, ownerName: tg.name, viewerName: myName(), status: 'pending',
        requestedBy: uid, expiresAtMs: 0, createdAtMs: now(), updatedAtMs: now()
      }).then(function () { notifyUser(tg.uid, 'location', T('sh_ask_title'), T('sh_ask_body', { name: myName() })); });
    }).then(loadShares);
  }
  function findOut(id) { return S.outShares.filter(function (s) { return s.id === id; })[0]; }
  function acceptRequest(id, durMin) {
    var sh = findOut(id), exp = durMin > 0 ? now() + durMin * 60000 : 0;
    return col('location_shares').doc(id).update({ status: 'active', expiresAtMs: exp, updatedAtMs: now() })
      .then(function () { if (sh) notifyUser(sh.viewerUid, 'location', T('n_acc_t'), T('n_acc_b', { name: myName() })); return loadShares(); })
      .then(function () { afterShareChange(); });
  }
  function declineRequest(id) {
    var sh = findOut(id);
    return col('location_shares').doc(id).delete()
      .then(function () { if (sh) notifyUser(sh.viewerUid, 'location', T('n_dec_t'), T('n_dec_b', { name: myName() })); return loadShares(); });
  }
  function stopShare(id) {
    var sh = findOut(id);
    return col('location_shares').doc(id).update({ status: 'stopped', updatedAtMs: now() })
      .then(function () { if (sh) notifyUser(sh.viewerUid, 'location', T('n_stop_t'), T('n_stop_b', { name: myName() })); return loadShares(); })
      .then(function () { if (!activeOut().length) dropLive(); afterShareChange(); });
  }
  function stopAllShares() {
    var list = activeOut();
    return Promise.all(list.map(function (s) {
      return col('location_shares').doc(s.id).update({ status: 'stopped', updatedAtMs: now() })
        .then(function () { notifyUser(s.viewerUid, 'location', T('n_stop_t'), T('n_stop_b', { name: myName() })); });
    })).then(function () { dropLive(); return loadShares(); }).then(function () { afterShareChange(); });
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
  function inviteContactUid(tg) {
    var uid = myUid();
    if (S.contacts.length >= CFG.MAX_CONTACTS) return Promise.reject({ code: 'limit' });
    var id = uid + '_' + tg.uid, ref = col('emergency_contacts').doc(id);
    return ref.get().then(function (s) {
      if (s.exists) return null;
      return ref.set({ ownerUid: uid, contactUid: tg.uid, ownerName: myName(), contactName: tg.name, status: 'pending', createdAtMs: now() })
        .then(function () { notifyUser(tg.uid, 'location', T('ec_notif_title'), T('ec_notif_body', { name: myName() })); });
    }).then(loadContacts);
  }
  function acceptContact(id) {
    var c = S.contactsIn.filter(function (x) { return x.id === id; })[0];
    return col('emergency_contacts').doc(id).update({ status: 'accepted' })
      .then(function () { if (c) notifyUser(c.ownerUid, 'location', T('n_eca_t'), T('n_eca_b', { name: myName() })); return loadContacts(); })
      .then(refreshSosOthers);
  }
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
    return Promise.all([loadShares(), loadContacts(), loadDevices(), loadLinks()]).then(function () {
      var jobs = [];
      S.links.forEach(function (l) { jobs.push(col('location_links').doc(l.id).delete().catch(function () { })); });
      S.outShares.concat(S.inShares).forEach(function (s) { jobs.push(col('location_shares').doc(s.id).delete().catch(function () { })); });
      S.contacts.concat(S.contactsIn).forEach(function (c) { jobs.push(col('emergency_contacts').doc(c.id).delete().catch(function () { })); });
      S.devices.forEach(function (d) { jobs.push(col('location_devices').doc(d.id).delete().catch(function () { })); });
      jobs.push(col('location_live').doc(uid).delete().catch(function () { }));
      jobs.push(col('sos_sessions').doc(uid).delete().catch(function () { }));
      jobs.push(clearHistory().catch(function () { }));
      jobs.push(leaveDirectory().catch(function () { }));
      return Promise.all(jobs);
    }).then(function () {
      cfg.track = false; cfg.history = false; saveCfg();
      S.outShares = []; S.inShares = []; S.links = []; S.contacts = []; S.contactsIn = []; S.devices = []; S.sosMine = null; S.sosOthers = [];
      unwatchSelfDevice(); stopPeerListeners(); lsDel(LS_LAST); lsDel(LS_TRACK);
      if (!S.open) stopWatch();
    });
  }


  /* ------------------------------------------------------------------
     LIEN DE LOCALISATION PARTAGEABLE (WhatsApp, Messenger, Facebook, TikTok…)
     Le lien contient un jeton secret. Celui qui l'ouvre doit se connecter,
     confirme, puis voit la position jusqu'à l'expiration. Le propriétaire
     peut désactiver le lien à tout moment (accès coupé immédiatement).
     ------------------------------------------------------------------ */
  function noop() { /* ignore */ }
  function randToken() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', a = new Uint8Array(24), s = '', i;
    (root.crypto || root.msCrypto).getRandomValues(a);
    for (i = 0; i < 24; i++) s += chars[a[i] & 63];
    return s;
  }
  function linkUrl(token) { return location.origin + '/?loc=link&t=' + encodeURIComponent(token); }
  function activeLinks() { return S.links.filter(function (l) { return l.status === 'active' && (!l.expiresAtMs || l.expiresAtMs > now()); }); }
  function loadLinks() {
    var uid = myUid(); if (!uid) return Promise.resolve();
    return col('location_links').where('ownerUid', '==', uid).get()
      .then(function (r) {
        S.links = r.docs.map(rowData).sort(function (a, b) { return (b.createdAtMs || 0) - (a.createdAtMs || 0); });
        S.links.filter(function (l) { return l.expiresAtMs && l.expiresAtMs <= now() - 3600000; }).forEach(function (l) { col('location_links').doc(l.id).delete().catch(noop); });
        updateBootFlag();
      })
      .catch(function (e) { console.warn('[loc] liens', e.code); });
  }
  function createLink(durMin) {
    var uid = myUid(), me = getMe() || {};
    if (activeLinks().length >= 5) return Promise.reject({ code: 'limit' });
    var token = randToken(), exp = durMin > 0 ? now() + durMin * 60000 : 0;
    var doc = { ownerUid: uid, ownerName: myName(), ownerPhoto: safePhoto(me.photoURL), status: 'active', expiresAtMs: exp, createdAtMs: now(), updatedAtMs: now() };
    return col('location_links').doc(token).set(doc).then(function () {
      doc.id = token; S.links.unshift(doc);
      lsSet(LS_CONSENT, '1'); startWatch(); updateBootFlag();
      if (S.me) writeTargets(true);
      return doc;
    });
  }
  function revokeLink(token) {
    var jobs = S.outShares.filter(function (s) { return s.linkToken === token && s.status === 'active'; })
      .map(function (s) { return col('location_shares').doc(s.id).update({ status: 'stopped', updatedAtMs: now() }).catch(noop); });
    return Promise.all(jobs).then(function () { return col('location_links').doc(token).delete(); })
      .then(function () { S.links = S.links.filter(function (l) { return l.id !== token; }); return loadShares(); })
      .then(function () { if (!activeOut().length && !activeLinks().length) dropLive(); updateBootFlag(); });
  }
  function fetchLink(token) {
    if (!/^[A-Za-z0-9_-]{20,40}$/.test(token || '')) return Promise.reject({ code: 'badlink' });
    return col('location_links').doc(token).get().then(function (s) {
      if (!s.exists) throw { code: 'badlink' };
      var l = s.data(); l.id = token;
      if (l.status !== 'active' || (l.expiresAtMs && l.expiresAtMs <= now())) throw { code: 'expiredlink' };
      if (l.ownerUid === myUid()) throw { code: 'ownlink' };
      return l;
    });
  }
  function claimLink(l) {
    var uid = myUid(), me = getMe() || {};
    var ref = col('location_shares').doc(l.ownerUid + '_' + uid);
    return ref.get().then(function (s) {
      if (s.exists) { if (isActiveShare(s.data())) return 'keep'; return ref.delete().then(function () { return 'new'; }); }
      return 'new';
    }).then(function (st) {
      if (st === 'keep') return null;
      return ref.set({
        ownerUid: l.ownerUid, viewerUid: uid, ownerName: l.ownerName || '—', viewerName: myName(), ownerPhoto: safePhoto(l.ownerPhoto), viewerPhoto: safePhoto(me.photoURL),
        status: 'active', requestedBy: uid, linkToken: l.id, expiresAtMs: l.expiresAtMs || 0, createdAtMs: now(), updatedAtMs: now()
      }).then(function () { notifyUser(l.ownerUid, 'location', T('lk_n_t'), T('lk_n_b', { name: myName() })); });
    }).then(loadShares);
  }
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).catch(function () { root.prompt('Copier :', s); });
    root.prompt('Copier :', s); return Promise.resolve();
  }
  function shareVia(ch, token) {
    var url = linkUrl(token), msg = T('lk_msg', { name: myName() }), full = msg + ' ' + url, mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (ch === 'copy') { copyText(url).then(function () { toastLC(T('lk_copied')); }); return; }
    if (ch === 'nat') {
      if (navigator.share) navigator.share({ title: T('title'), text: msg, url: url }).catch(noop);
      else copyText(url).then(function () { toastLC(T('lk_copied')); });
      return;
    }
    var fb = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    var href = ch === 'wa' ? 'https://wa.me/?text=' + encodeURIComponent(full)
      : ch === 'fb' ? fb
      : ch === 'ms' ? (mobile ? 'fb-messenger://share/?link=' + encodeURIComponent(url) : fb)
      : ch === 'tg' ? 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(msg)
      : ch === 'sms' ? 'sms:?&body=' + encodeURIComponent(full) : '';
    if (!href) return;
    if (/^(sms|fb-messenger):/.test(href)) root.location.href = href; else root.open(href, '_blank', 'noopener');
  }
  function focusPeer(uid) {
    var n = 0, iv = setInterval(function () {
      var p = S.peers[uid]; n++;
      if (p && validCoords(p.lat, p.lng)) { clearInterval(iv); flyTo(p.lat, p.lng); }
      else if (n > 14 || !S.open) clearInterval(iv);
    }, 500);
  }

  /* ---- Fonds de carte : Plan, Satellite, Relief (gratuits, sans clé) ---- */
  var LS_MAP = 'cn_loc_map';
  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  var MAP_BASES = {
    plan:   { url: CFG.TILES, attr: '© OpenStreetMap', native: 19, max: 20 },
    rues:   { url: ESRI + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri', native: 19, max: 20 },
    sat:    { url: ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagery © Esri, Maxar, Earthstar Geographics', native: 17, max: 20 },
    relief: { url: ESRI + 'World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri, USGS, NOAA', native: 17, max: 20 },
    clair:  { url: ESRI + 'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri', native: 16, max: 20, ref: ESRI + 'Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}' },
    sombre: { url: ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri', native: 16, max: 20, ref: ESRI + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}' },
    humain: { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attr: '© OpenStreetMap · Humanitarian OSM Team', native: 19, max: 20, sub: 'abc' }
  };
  var MAP_ORDER = ['plan', 'rues', 'sat', 'relief', 'clair', 'sombre', 'humain'];
  var MAP_LABELS = ESRI + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
  var MAP_ROADS = ESRI + 'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
  function loadMapPrefs() {
    try {
      var o = JSON.parse(lsGet(LS_MAP) || '{}');
      if (MAP_BASES[o.base]) S.mp.base = o.base;
      if (typeof o.labels === 'boolean') S.mp.labels = o.labels;
      if (typeof o.acc === 'boolean') S.mp.acc = o.acc;
    } catch (e) { /* ignore */ }
  }
  function saveMapPrefs() { lsSet(LS_MAP, JSON.stringify(S.mp)); }
  function setMapBusy(on) {
    var n = $('lc-mapnote'); if (!n) return;
    n.classList.toggle('on', !!on);
    n.innerHTML = on ? '<i></i>' + esc(T('mt_loading')) : '';
  }
  // Un fond qui ne répond pas (bloqué par la configuration, réseau, serveur) ne doit JAMAIS laisser une carte vide :
  // après quelques erreurs ou 9 secondes sans aucune tuile, on repasse au plan par défaut en le disant clairement.
  function failBase(layer) {
    if (S.baseLayer !== layer) return;
    var bad = S.mp.base;
    clearTimeout(S.baseTimer);
    S.badBases[bad] = true;
    if (bad !== 'plan') {
      S.mp.base = 'plan'; applyBase();
      toastLC(T('mt_ko', { name: T('mt_' + bad) }), 'error');
      if (S.cspBlocked) autoHeal();
      if (S.layersOpen) renderLayersSheet();
    } else {
      setMapBusy(false);
      toastLC(T('mt_ko', { name: T('mt_plan') }), 'error');
    }
  }
  function applyBase() {
    if (!S.map || !S.L) return;
    var L = S.L, b = MAP_BASES[S.mp.base] || MAP_BASES.plan;
    ['baseLayer', 'ovRoads', 'ovLabels'].forEach(function (k) { if (S[k]) { try { S.map.removeLayer(S[k]); } catch (e) { /* ignore */ } S[k] = null; } });
    S.tileErr = 0; S.tileOk = false;
    var o = { maxZoom: b.max, maxNativeZoom: b.native, attribution: b.attr };
    if (b.sub) o.subdomains = b.sub;
    var layer = S.baseLayer = L.tileLayer(b.url, o).addTo(S.map);
    layer.on('tileerror', function () {
      S.tileErr = (S.tileErr || 0) + 1;
      if (!S.tileOk && S.tileErr >= 4) failBase(layer);
    });
    layer.on('tileload', function () { if (S.baseLayer !== layer) return; S.tileOk = true; S.tileErr = 0; clearTimeout(S.baseTimer); setMapBusy(false); delete S.badBases[S.mp.base]; });
    setMapBusy(true);
    clearTimeout(S.baseTimer);
    S.baseTimer = setTimeout(function () { if (!S.tileOk) failBase(layer); }, 9000);
    if (S.mp.base === 'sat' && S.mp.labels) {
      S.ovRoads = L.tileLayer(MAP_ROADS, { maxZoom: 20, maxNativeZoom: 17, opacity: .9 }).addTo(S.map);
      S.ovLabels = L.tileLayer(MAP_LABELS, { maxZoom: 20, maxNativeZoom: 17 }).addTo(S.map);
    } else if (b.ref && S.mp.labels) {
      S.ovLabels = L.tileLayer(b.ref, { maxZoom: 20, maxNativeZoom: b.native }).addTo(S.map);
    }
  }
  function thumb(kind) {
    var T_ = {
      plan: '<rect width="64" height="64" fill="#ebf1e4"/><path d="M0 42 C20 32 40 52 64 38 L64 64 L0 64Z" fill="#bfe0f5"/><path d="M10 0 L32 64" stroke="#fff" stroke-width="5"/><path d="M0 24 L64 12" stroke="#f6d98c" stroke-width="4"/><path d="M42 0 L54 64" stroke="#fff" stroke-width="3"/>',
      rues: '<rect width="64" height="64" fill="#f3efe6"/><path d="M0 16 L64 24" stroke="#fff" stroke-width="6"/><path d="M0 44 L64 36" stroke="#fff" stroke-width="6"/><path d="M20 0 L26 64" stroke="#ffd45c" stroke-width="7"/><path d="M48 0 L44 64" stroke="#fff" stroke-width="4"/><rect x="30" y="4" width="12" height="9" fill="#e5dfd0"/><rect x="4" y="48" width="14" height="10" fill="#e5dfd0"/>',
      sat: '<rect width="64" height="64" fill="#3b4a33"/><circle cx="14" cy="16" r="14" fill="#566b45"/><circle cx="50" cy="50" r="16" fill="#2c3727"/><path d="M0 44 L64 20" stroke="#b9ad92" stroke-width="7"/><rect x="38" y="6" width="12" height="9" fill="#8a7f6a"/><rect x="8" y="46" width="10" height="8" fill="#a3978a"/>',
      relief: '<rect width="64" height="64" fill="#dfe6cd"/><path d="M0 52 C16 40 28 44 40 30 S56 14 64 10" fill="none" stroke="#a9b58f" stroke-width="2"/><path d="M0 40 C14 30 26 34 38 22 S54 8 64 4" fill="none" stroke="#a9b58f" stroke-width="2"/><path d="M0 28 C12 18 22 22 34 12" fill="none" stroke="#a9b58f" stroke-width="2"/><path d="M6 64 C20 50 36 54 64 30" fill="none" stroke="#fff" stroke-width="4"/>',
      clair: '<rect width="64" height="64" fill="#eceff3"/><path d="M0 20 L64 28" stroke="#fff" stroke-width="5"/><path d="M0 46 L64 38" stroke="#fff" stroke-width="5"/><path d="M22 0 L28 64" stroke="#fff" stroke-width="5"/><path d="M48 0 L44 64" stroke="#fff" stroke-width="3"/>',
      sombre: '<rect width="64" height="64" fill="#262b33"/><path d="M0 20 L64 28" stroke="#3d4551" stroke-width="5"/><path d="M0 46 L64 38" stroke="#3d4551" stroke-width="5"/><path d="M22 0 L28 64" stroke="#4b5563" stroke-width="5"/><path d="M48 0 L44 64" stroke="#3d4551" stroke-width="3"/>',
      humain: '<rect width="64" height="64" fill="#f4e9d8"/><path d="M0 50 C18 44 34 56 64 44 L64 64 L0 64Z" fill="#a5cfe6"/><path d="M8 0 L30 64" stroke="#e8836b" stroke-width="5"/><path d="M0 22 L64 14" stroke="#f7c88a" stroke-width="4"/><rect x="40" y="26" width="10" height="8" fill="#d9b99b"/>'
    };
    return '<svg viewBox="0 0 64 64">' + (T_[kind] || T_.plan) + '</svg>';
  }
  var SVG_TAG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#0b7a8a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="8.5" r="1.4"/></svg>';
  var SVG_TGT = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#0b7a8a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>';
  function detTile(key, label, on, svg) {
    return '<button type="button" class="lc-opt' + (on ? ' on' : '') + '" data-act="mdet" data-v="' + key + '"><span class="th det">' + svg + '</span><b>' + esc(T(label)) + '</b></button>';
  }
  function renderLayersSheet() {
    var h = $('lc-layers'); if (!h) return;
    if (!S.layersOpen) { h.classList.remove('open'); h.innerHTML = ''; return; }
    var bases = MAP_ORDER.map(function (k) {
      return '<button type="button" class="lc-opt' + (S.mp.base === k ? ' on' : '') + '" data-act="mbase" data-v="' + k + '"><span class="th">' + thumb(k) + '</span><b>' + esc(T('mt_' + k)) + '</b>' + (S.badBases[k] ? '<em class="bad">' + esc(T('mt_off')) + '</em>' : '') + '</button>';
    }).join('');
    var hasRef = S.mp.base === 'sat' || (MAP_BASES[S.mp.base] && MAP_BASES[S.mp.base].ref);
    var det = (hasRef ? detTile('labels', 'mt_labels', S.mp.labels, SVG_TAG) : '') + detTile('acc', 'mt_acc', S.mp.acc, SVG_TGT);
    var warn = (S.cspBlocked || Object.keys(S.badBases).length) ? '<div class="lc-lnote">' + esc(T('mt_blocked')) + '<br><button type="button" class="lc-btn sm" data-act="repair">' + esc(T('dg_fix')) + '</button></div>' : '';
    h.innerHTML = '<div class="lc-lbox" role="dialog" aria-label="' + esc(T('mt_title')) + '"><div class="lc-lhead"><h3>' + esc(T('mt_title')) + '</h3><button type="button" class="lc-ib" data-act="layersx" aria-label="' + esc(T('close')) + '">✕</button></div>' +
      warn + '<div class="lc-opts">' + bases + '</div><div class="lc-lsep"></div><div class="lc-lhead"><h3>' + esc(T('mt_details')) + '</h3></div><div class="lc-opts">' + det + '</div></div>';
    h.classList.add('open');
  }
  function openLayers() { S.layersOpen = true; renderLayersSheet(); }
  function closeLayers() { S.layersOpen = false; renderLayersSheet(); }

  /* ---- Adresse précise : rue / avenue, quartier, commune, ville, territoire, province, pays ---- */
  var geoCache = {}, geoChain = Promise.resolve(), geoLast = 0;
  function buildAddress(j) {
    var a = j && j.address;
    if (!a) return { ok: false, title: '', sub: '', rows: [], full: (j && j.display_name) || '' };
    var rows = [], seen = {};
    function add(key, val) {
      val = String(val || '').trim();
      if (!val || seen[val.toLowerCase()]) return;
      seen[val.toLowerCase()] = 1; rows.push([key, val]);
    }
    var road = a.road || a.pedestrian || a.footway || a.path || a.cycleway || a.residential || '';
    if (road && a.house_number) road = a.house_number + ', ' + road;
    add('ad_road', road);
    add('ad_quarter', a.neighbourhood || a.quarter || a.hamlet || a.suburb);
    add('ad_commune', a.city_district || a.borough || a.municipality || a.suburb);
    add('ad_city', a.city || a.town || a.village || a.locality);
    add('ad_county', a.county || a.state_district);
    add('ad_state', a.state || a.region);
    add('ad_country', a.country);
    add('ad_postcode', a.postcode);
    var title = (j.name && j.name !== road ? j.name : '') || road || (rows[0] ? rows[0][1] : '');
    var sub = rows.filter(function (r) { return r[1] !== title && r[0] !== 'ad_country' && r[0] !== 'ad_postcode'; }).slice(0, 3).map(function (r) { return r[1]; }).join(' · ');
    return { ok: rows.length > 0, title: title, sub: sub, rows: rows, full: j.display_name || '', sparse: rows.length < 4 };
  }
  function reverseDetail(lat, lng) {
    var key = lat.toFixed(5) + ',' + lng.toFixed(5) + ',' + langIdx();
    if (geoCache[key]) return Promise.resolve(geoCache[key]);
    // Nominatim demande au plus 1 requête par seconde : on met les demandes en file.
    var job = geoChain.then(function () {
      return new Promise(function (r) { setTimeout(r, Math.max(0, 1100 - (now() - geoLast))); });
    }).then(function () {
      geoLast = now();
      var url = CFG.GEOCODE_URL + '?format=jsonv2&zoom=18&addressdetails=1&lat=' + lat + '&lon=' + lng + '&accept-language=' + (langIdx() === 0 ? 'fr' : 'en');
      return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; });
    }).then(buildAddress).catch(function () { return buildAddress(null); });
    geoChain = job.then(noop, noop);
    return job.then(function (d) { if (d && d.ok) geoCache[key] = d; return d; });
  }

  /* ---- Lieu choisi : repère rouge + fiche détaillée ---- */
  function pick(marker, info) {
    marker.on('click', function () {
      if (!S.fs) { S.fs = true; applyFs(); }
      selectPlace(info, true);
    });
    return marker;
  }
  function drawSel() {
    if (!S.map || !S.L) return;
    if (S.selMarker) { try { S.map.removeLayer(S.selMarker); } catch (e) { /* ignore */ } S.selMarker = null; }
    if (!S.sel) return;
    S.selMarker = S.L.marker([S.sel.lat, S.sel.lng], {
      icon: S.L.divIcon({ className: '', html: '<div class="lc-pin"></div>', iconSize: [30, 40], iconAnchor: [15, 38] }), zIndexOffset: 1200, interactive: false
    }).addTo(S.map);
  }
  function selectPlace(p, fly) {
    if (!validCoords(p.lat, p.lng)) return;
    S.sel = { lat: p.lat, lng: p.lng, label: p.label || '', ts: p.ts || 0, acc: (typeof p.acc === 'number') ? p.acc : null, addr: null, loading: true };
    if (fly && S.map) S.map.flyTo([p.lat, p.lng], Math.max(S.map.getZoom(), 17));
    drawSel(); renderPlaceCard(); renderFsTop();
    var tok = ++S.selTok;
    reverseDetail(p.lat, p.lng).then(function (d) {
      if (!S.sel || tok !== S.selTok) return;
      S.sel.addr = d; S.sel.loading = false; renderPlaceCard(); renderFsTop();
    });
  }
  function clearSel() { S.sel = null; S.selTok++; drawSel(); renderPlaceCard(); renderFsTop(); }
  function selText() {
    var s = S.sel; if (!s) return '';
    var a = s.addr, parts = [];
    if (s.label) parts.push(s.label);
    if (a && a.ok) parts.push(a.rows.map(function (r) { return r[1]; }).join(', '));
    parts.push(fmtCoord(s.lat) + ', ' + fmtCoord(s.lng));
    return parts.join('\n');
  }
  function osmUrl(lat, lng) { return 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '#map=18/' + lat + '/' + lng; }
  function renderPlaceCard() {
    var h = $('lc-place'), r = $('lc-root'); if (!h || !r) return;
    if (!S.sel || !S.fs) { h.classList.remove('open'); h.innerHTML = ''; r.classList.remove('hasplace'); r.style.removeProperty('--lc-place-h'); return; }
    var s = S.sel, a = s.addr, title, sub, rows = '';
    if (s.label) { title = s.label; sub = a && a.ok ? [a.title, a.sub].filter(Boolean).join(' · ') : ''; }
    else { title = (a && a.ok && a.title) || T('pl_selected'); sub = a && a.ok ? a.sub : ''; }
    if (s.loading) rows = '<p class="lc-muted">' + esc(T('addr_wait')) + '</p>';
    else if (a && a.ok) rows = '<div class="lc-arows">' + a.rows.map(function (x) { return '<div><small>' + esc(T(x[0])) + '</small><b>' + esc(x[1]) + '</b></div>'; }).join('') + (a.full ? '<div class="wide"><small>' + esc(T('ad_full')) + '</small><b>' + esc(a.full) + '</b></div>' : '') + '</div>' + (a.sparse ? '<p class="lc-muted" style="margin:0 0 6px">' + esc(T('ad_hint')) + '</p>' : '');
    else rows = '<p class="lc-muted">' + esc(T('addr_none')) + '</p>';
    var meta = fmtCoord(s.lat) + ', ' + fmtCoord(s.lng) + (s.acc != null ? ' · ' + fmtAcc(s.acc) : '') + (s.ts ? ' · ' + ago(s.ts) : '');
    h.innerHTML = '<div class="lc-phead"><div class="grow"><h3>' + esc(title) + '</h3>' + (sub ? '<span class="lc-muted">' + esc(sub) + '</span>' : '') + '</div>' +
      '<button type="button" class="lc-ib" data-act="placex" aria-label="' + esc(T('close')) + '">✕</button></div>' + rows +
      '<div class="lc-pmeta">' + esc(meta) + '</div>' +
      '<div class="lc-pacts"><button type="button" class="lc-btn sm" data-act="plcopy">' + esc(T('pl_copy')) + '</button>' +
      '<a class="lc-btn sec sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng + '">' + esc(T('pl_route')) + '</a>' +
      '<button type="button" class="lc-btn sec sm" data-act="plshare">' + esc(T('pl_share')) + '</button></div>';
    h.classList.add('open'); r.classList.add('hasplace');
    r.style.setProperty('--lc-place-h', h.offsetHeight + 'px');
  }
  function placeCopy() { var t = selText(); if (t) copyText(t).then(function () { toastLC(T('pl_copied')); }); }
  function placeShare() {
    var s = S.sel; if (!s) return;
    var text = selText() + '\n' + osmUrl(s.lat, s.lng);
    if (navigator.share) navigator.share({ title: s.label || T('pl_selected'), text: text }).catch(noop);
    else copyText(text).then(function () { toastLC(T('pl_copied')); });
  }

  /* ---- Carte plein écran (barre du haut, bouton retour, fiche du lieu) ---- */
  function renderFsTop() {
    var h = $('lc-fstop'); if (!h) return;
    if (!S.fs) { h.innerHTML = ''; return; }
    var title, sub = '';
    if (S.sel) { title = S.sel.label || (S.sel.addr && S.sel.addr.ok && S.sel.addr.title) || T('pl_selected'); sub = S.sel.addr && S.sel.addr.ok ? S.sel.addr.sub : ''; }
    else { title = T('fs_title'); sub = S.me ? T('lbl_acc') + ' ' + fmtAcc(S.me.acc) : (lastKnown() ? T('last_known', { ago: ago(lastKnown().ts) }) : T('no_pos')); }
    h.innerHTML = '<button type="button" class="lc-fsround" data-act="mapback" aria-label="' + esc(T('back')) + '">' + SVG_BACK + '</button>' +
      '<div class="lc-fspill"><b>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>' +
      '<button type="button" class="lc-fsround" data-act="layers" aria-label="' + esc(T('mt_title')) + '">' + SVG_LAYERS + '</button>';
  }
  function applyFs() {
    var r = $('lc-root'); if (!r) return;
    r.classList.toggle('mapfs', !!S.fs);
    var b = $('lc-fsbtn'); if (b) { b.setAttribute('aria-label', T(S.fs ? 'fs_close' : 'fs_open')); b.innerHTML = S.fs ? SVG_FS_OFF : SVG_FS_ON; }
    if (!S.fs) { S.layersOpen = false; renderLayersSheet(); if (S.sel) { S.sel = null; S.selTok++; drawSel(); } }
    renderFsBar(); renderFsTop(); renderPlaceCard();
    setTimeout(function () { if (S.map) S.map.invalidateSize(); }, 250);
  }
  // Bouton « retour » : ferme d'abord le menu des fonds, puis la fiche du lieu, puis quitte le plein écran.
  function mapBack() {
    if (S.layersOpen) { closeLayers(); return; }
    if (S.sel) { clearSel(); return; }
    S.fs = false; applyFs();
  }
  function fsChip(name, sub, lat, lng, cls, ts, acc) {
    if (!validCoords(lat, lng)) return '<span class="lc-fschip off ' + (cls || '') + '"><b>' + esc(name) + '</b><span>' + esc(sub) + '</span></span>';
    return '<button type="button" class="lc-fschip ' + (cls || '') + '" data-act="selplace" data-lat="' + lat + '" data-lng="' + lng + '" data-name="' + esc(name) + '" data-ts="' + (ts || 0) + '" data-acc="' + (typeof acc === 'number' ? acc : '') + '"><b>' + esc(name) + '</b><span>' + esc(sub) + '</span></button>';
  }
  function renderFsBar() {
    var h = $('lc-fsbar'); if (!h) return;
    if (!S.fs) { h.innerHTML = ''; return; }
    var chips = [], lk = lastKnown();
    if (lk) chips.push(fsChip(T('fs_me'), S.me ? ago(S.me.ts) : T('last_known', { ago: ago(lk.ts) }), lk.lat, lk.lng, '', lk.ts, lk.acc));
    S.sosOthers.forEach(function (s) { chips.push(fsChip('SOS · ' + s.ownerName, ago(s.updatedAtMs), s.lat, s.lng, 'sos', s.updatedAtMs, s.accuracy)); });
    activeIn().forEach(function (sh) {
      var p = S.peers[sh.ownerUid], has = p && validCoords(p.lat, p.lng);
      chips.push(has ? fsChip(sh.ownerName, ago(p.updatedAtMs) + (typeof p.battery === 'number' ? ' · ' + p.battery + ' %' : ''), p.lat, p.lng, '', p.updatedAtMs, p.accuracy) : fsChip(sh.ownerName, T('sh_peer_nopos'), null, null, ''));
    });
    h.innerHTML = chips.join('') || '<span class="lc-fschip off"><b>' + esc(T('no_pos')) + '</b></span>';
  }
  // Depuis les listes (« Voir sur la carte ») : ouvre le plein écran directement sur ce lieu, avec l'adresse précise.
  function showOnMap(lat, lng, label, ts, acc) {
    if (!validCoords(lat, lng)) return;
    S.fs = true; applyFs();
    var go = function () { selectPlace({ lat: lat, lng: lng, label: label || '', ts: ts || 0, acc: acc }, true); };
    if (S.map) setTimeout(go, 280); else go();
  }

  /* ---- Diagnostic : « qu'est-ce qui bloque ? » ---- */
  function repairApp() {
    var jobs = [];
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) { /* ignore */ }
    try { if (root.caches && root.caches.keys) jobs.push(root.caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return root.caches.delete(k); })); })); } catch (e) { /* ignore */ }
    return Promise.all(jobs).catch(noop).then(hardReload);
  }
  function runDiagnostics() {
    var uid = myUid(), items = [], srvOk = null;
    function add(label, ok, hint) { items.push({ label: label, ok: ok, hint: hint || '' }); }
    S.diag = { running: true, items: [] }; if (S.open) renderTab();
    function head() { return fetch(root.location.pathname || '/', { method: 'HEAD', cache: 'no-store' }).catch(function () { return fetch(root.location.pathname || '/', { cache: 'no-store' }); }); }
    return head().then(function (r) {
      var pp = r.headers.get('permissions-policy') || '', csp = r.headers.get('content-security-policy') || '';
      S.techServerPP = (pp.split(',')[0] || '').trim();
      srvOk = /geolocation=\(self\)/.test(pp) && /tile\.openstreetmap\.org/.test(csp) && /cdn\.jsdelivr\.net/.test(csp) && /tile\.openstreetmap\.fr/.test(csp) && /server\.arcgisonline\.com/.test(csp);
    }).catch(function () { srvOk = null; }).then(function () {
      add(T('dg_https'), root.isSecureContext !== false && root.location.protocol === 'https:', '');
      S.techInfo = {
        serverPP: S.techServerPP || '', pageGeo: !policyBlocksGeo(), top: root.top === root.self,
        standalone: !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches), wv: /; wv\)/.test(navigator.userAgent || ''),
        cspSeen: !!S.cspBlocked
      };
      add(T('dg_server'), srvOk, srvOk === false ? T('dg_server_old') : '');
      var pageOk = !policyBlocksGeo();
      add(T('dg_policy'), pageOk, pageOk ? '' : (srvOk ? T('dg_cache') : T('dg_server_old')));
      if (navigator.permissions && navigator.permissions.query) {
        return navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
          if (policyBlocksGeo()) add(T('dg_gps'), null, T('dg_gps_dep'));
          else add(T('dg_gps'), r.state === 'granted' ? true : (r.state === 'denied' ? false : null), r.state === 'denied' ? T('err_denied') : (r.state === 'prompt' ? T('dg_gps_prompt') : ''));
        }).catch(noop);
      }
    }).then(function () {
      return ensureLeaflet().then(function () { add(T('dg_map'), true, ''); }, function () { add(T('dg_map'), false, S.cspBlocked ? T('map_blocked') : T('dg_map_ko')); });
    }).then(function () {
      return Promise.all([
        col('location_profiles').limit(1).get(),
        col('location_private').doc(uid).get(),
        col('location_shares').where('ownerUid', '==', uid).limit(1).get(),
        col('location_links').where('ownerUid', '==', uid).limit(1).get()
      ]).then(function () { add(T('dg_rules'), true, ''); }, function (e) { add(T('dg_rules'), false, e && e.code === 'permission-denied' ? T('dg_rules_ko') : errText(e)); });
    }).then(function () {
      var np = (typeof Notification === 'undefined') ? null : Notification.permission;
      add(T('dg_notif'), np === 'granted' ? true : (np === 'denied' ? false : null), np === 'denied' ? T('dg_notif_ko') : (np === 'default' ? T('dg_notif_ask') : ''));
    }).then(function () { S.diag = { running: false, items: items }; if (S.open) renderTab(); });
  }

  /* ------------------------------------------------------------------
     SORTIE / RETOUR DE L'APPLICATION
     ------------------------------------------------------------------ */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      // On enregistre la toute dernière position avant de quitter (au mieux : le navigateur peut couper).
      if (S.me && needsWatch()) writeTargets(true);
    } else if (needsWatch() && myUid()) {
      if (S.watchId == null && lsGet(LS_CONSENT)) startWatch();
      if (S.me && now() - S.me.ts > 120000) oneShotFix();
    }
  });
  root.addEventListener('pagehide', function () { if (S.me && needsWatch()) writeTargets(true); });

  try {
    if (/[?&]_cb=/.test(root.location.search)) {
      var cbu = new URL(root.location.href); cbu.searchParams.delete('_cb');
      root.history.replaceState({}, '', cbu.pathname + (cbu.search || '') + (cbu.hash || ''));
    }
  } catch (e) { /* ignore */ }

  /* ------------------------------------------------------------------
     INTERFACE
     ------------------------------------------------------------------ */
  X.pill_sos = ['SOS actif', 'SOS active']; X.pill_share = ['Position partagée', 'Position shared']; X.pill_track = ["Suivi de l'appareil", 'Device tracking'];

  var N = {
    onb_title: ["Rejoins l'annuaire de localisation", 'Join the location directory'],
    onb_text: ["Pour retrouver tes proches en un clic (et qu'ils te retrouvent), enregistre ton numéro ou ton email. Ils ne sont jamais affichés : ils servent seulement à te retrouver quand quelqu'un les tape.", "To find your loved ones in one tap (and be found), save your number or email. They are never shown: they're only used to find you when someone types them."],
    onb_s1: ['Cherche un proche par nom, email ou numéro', 'Search a loved one by name, email or number'],
    onb_s2: ['Touche « Localiser » : il reçoit ta demande', 'Tap “Locate”: they receive your request'],
    onb_s3: ['Il accepte (ou supprime) et choisit la durée', 'They accept (or delete) and choose the duration'],
    onb_phone: ['Numéro de téléphone', 'Phone number'], onb_email: ['Email', 'Email'],
    onb_need_one: ['Renseigne au moins un numéro ou un email valide.', 'Enter at least one valid number or email.'],
    onb_consent: ["J'accepte d'apparaître dans l'annuaire (nom + photo). Personne ne voit ma position sans mon accord.", 'I agree to appear in the directory (name + photo). Nobody sees my position without my consent.'],
    onb_consent_needed: ['Coche la case pour continuer.', 'Tick the box to continue.'],
    onb_save: ['Enregistrer et continuer', 'Save and continue'], onb_edit: ['Modifier mes coordonnées', 'Edit my details'],
    onb_taken: ['Ce numéro ou cet email est déjà associé à un autre compte.', 'This number or email is already linked to another account.'],
    onb_done: ["C'est fait, tu es dans l'annuaire.", "Done, you're in the directory."],
    dir_title: ['Retrouver un proche', 'Find someone'], dir_search_ph: ['Nom, @utilisateur, email ou numéro', 'Name, @username, email or number'],
    dir_members: ["Membres de l'annuaire", 'Directory members'],
    dir_empty: ["Personne trouvé. Vérifie l'orthographe, ou invite-le ci-dessous.", 'Nobody found. Check the spelling, or invite them below.'],
    dir_locate: ['Localiser', 'Locate'], dir_share: ['Partager la mienne', 'Share mine'], dir_add: ['Ajouter', 'Add'],
    ec_add_title: ["Ajouter un contact d'urgence", 'Add an emergency contact'],
    ec_how: ["Il doit accepter ton invitation pour recevoir tes alertes SOS.", 'They must accept your invitation to receive your SOS alerts.'],
    st_sees_you: ['Voit ta position', 'Sees your position'], st_you_see: ['Tu vois sa position', 'You see their position'],
    st_asked: ['Demande envoyée', 'Request sent'], st_they_asked: ['Veut voir ta position', 'Wants to see your position'],
    invite_title: ["Il n'est pas encore sur Coeurnoh ?", 'Not on Coeurnoh yet?'], invite_btn: ['Inviter un proche', 'Invite someone'],
    invite_text: ['Rejoins-moi sur Coeurnoh pour partager notre position en toute sécurité : {url}', 'Join me on Coeurnoh to share our position safely: {url}'],
    sheet_share_title: ['Partager ma position avec {name}', 'Share my position with {name}'],
    sheet_accept_title: ['Accepter la demande de {name}', "Accept {name}'s request"],
    sheet_text: ['Pendant combien de temps {name} peut-il voir ta position ? Tu pourras arrêter à tout moment.', 'For how long can {name} see your position? You can stop anytime.'],
    sheet_confirm: ['Confirmer', 'Confirm'], req_delete: ['Supprimer', 'Delete'], sh_cancel_req: ['Annuler la demande', 'Cancel request'],
    pv_dir: ["Mon profil dans l'annuaire", 'My directory profile'], pv_leave: ["Quitter l'annuaire", 'Leave the directory'],
    pv_leave_confirm: ["Tu ne seras plus retrouvable par nom, email ou numéro. Tes partages en cours ne sont pas modifiés.", "You'll no longer be findable by name, email or number. Your current shares are not changed."],
    pv_left: ["Tu as quitté l'annuaire.", 'You left the directory.'],
    pv_7: ["Annuaire : seuls ton nom, ta photo et ton @utilisateur sont visibles par les membres inscrits. Ton email et ton numéro ne sont jamais affichés ; seule une empreinte chiffrée sert à te retrouver.", 'Directory: only your name, photo and @username are visible to registered members. Your email and number are never shown; only an encrypted fingerprint is used to find you.'],
    pos_join: ["Rejoins l'annuaire pour partager ta position en un clic avec tes proches.", 'Join the directory to share your position in one tap with your loved ones.'],
    pos_join_btn: ["Rejoindre l'annuaire", 'Join the directory']
  };
  Object.assign(N, {
    n_acc_t: ['Demande acceptée', 'Request accepted'], n_acc_b: ['{name} a accepté ta demande : tu peux voir sa position.', '{name} accepted your request: you can now see their position.'],
    n_dec_t: ['Demande refusée', 'Request declined'], n_dec_b: ['{name} a refusé ta demande de localisation.', '{name} declined your location request.'],
    n_stop_t: ['Partage arrêté', 'Sharing stopped'], n_stop_b: ['{name} a arrêté de partager sa position avec toi.', '{name} stopped sharing their position with you.'],
    n_eca_t: ["Contact d'urgence accepté", 'Emergency contact accepted'], n_eca_b: ["{name} a accepté d'être ton contact d'urgence.", '{name} agreed to be your emergency contact.'],
    closed_title: ["Et quand l'application est fermée ?", 'What about when the app is closed?'],
    closed_text: ["Les alertes (demandes, acceptations, SOS) arrivent toujours par notification, même application fermée. En revanche, un navigateur ne peut pas lire le GPS quand l'application est complètement fermée : ta position se met à jour tant que l'application est ouverte ou en arrière-plan, la toute dernière position est enregistrée quand tu la quittes, et le suivi reprend tout seul à la réouverture. Un suivi 100 % continu demanderait une application Android native.", "Alerts (requests, acceptances, SOS) still arrive as notifications even when the app is closed. However, a browser cannot read GPS once the app is fully closed: your position updates while the app is open or in the background, the very last position is saved when you leave, and tracking resumes by itself on reopening. Fully continuous tracking would need a native Android app."],
    st_policy: ['Bloquée par le site', 'Blocked by the site'],
    err_policy: ["La localisation est bloquée par la configuration du site. Si tu administres le site, vérifie que vercel.json (Permissions-Policy : geolocation=(self)) est bien déployé.", 'Location is blocked by the site configuration. If you manage the site, check that vercel.json (Permissions-Policy: geolocation=(self)) is deployed.'],
    map_blocked: ["La carte est bloquée par la configuration de sécurité du site. Si tu administres le site, vérifie que vercel.json est bien déployé.", 'The map is blocked by the site security configuration. If you manage the site, check that vercel.json is deployed.'],
    retry: ['Réessayer', 'Retry']
  });
  Object.assign(N, {
    lk_title: ['Mon lien de localisation', 'My location link'],
    lk_intro: ["Crée un lien et envoie-le sur WhatsApp, Messenger, Facebook, TikTok, Instagram… La personne qui l'ouvre se connecte à Coeurnoh Universe, puis voit ta position sur la carte.", 'Create a link and send it on WhatsApp, Messenger, Facebook, TikTok, Instagram… Whoever opens it signs in to Coeurnoh Universe, then sees your position on the map.'],
    lk_warn: ["Toute personne qui ouvre ce lien et se connecte verra ta position jusqu'à l'expiration. Tu peux le désactiver à tout moment.", 'Anyone who opens this link and signs in will see your position until it expires. You can deactivate it at any time.'],
    dur_1440: ['24 heures', '24 hours'],
    lk_create: ['Créer mon lien', 'Create my link'], lk_created: ["Lien créé. Choisis comment l'envoyer.", 'Link created. Choose how to send it.'],
    lk_active: ['Mes liens actifs', 'My active links'], lk_expires: ['Expire : {t}', 'Expires: {t}'], lk_never: ["Jusqu'à désactivation", 'Until deactivated'],
    lk_viewers: ['{n} connectée(s)', '{n} connected'], lk_copy: ['Copier le lien', 'Copy link'], lk_copied: ['Lien copié.', 'Link copied.'],
    lk_off: ['Désactiver', 'Deactivate'], lk_off_done: ['Lien désactivé.', 'Link deactivated.'], lk_via: ['Envoyer par', 'Send via'], lk_other: ['Autres apps', 'Other apps'],
    lk_social_hint: ["TikTok / Instagram : touche « Autres apps » ou copie le lien, puis colle-le dans ton message ou ta bio.", 'TikTok / Instagram: tap “Other apps” or copy the link, then paste it in your message or bio.'],
    lk_msg: ['📍 {name} partage sa position avec toi sur Coeurnoh Universe. Ouvre le lien et connecte-toi pour la voir :', '📍 {name} is sharing their position with you on Coeurnoh Universe. Open the link and sign in to see it:'],
    lk_open_title: ['{name} partage sa position avec toi', '{name} is sharing their position with you'],
    lk_open_text: ["Tu verras sa position sur la carte jusqu'à {until}. Tu pourras quitter à tout moment.", "You'll see their position on the map until {until}. You can leave at any time."],
    lk_open_btn: ['Voir sa position', 'See position'], lk_done: ['Position partagée avec toi.', 'Position shared with you.'],
    lk_bad: ['Lien invalide ou désactivé.', 'Invalid or deactivated link.'], lk_expired: ['Ce lien a expiré.', 'This link has expired.'], lk_own: ["C'est ton propre lien.", "That's your own link."],
    lk_n_t: ['Lien ouvert', 'Link opened'], lk_n_b: ['{name} a ouvert ton lien et voit ta position.', '{name} opened your link and can see your position.'],
    fs_open: ['Plein écran', 'Full screen'], fs_close: ['Quitter le plein écran', 'Exit full screen'], fs_me: ['Moi', 'Me'],
    dir_error: ["L'annuaire est inaccessible. Les règles Firestore du Centre de localisation ne sont probablement pas encore publiées. Ouvre « Vérifier ma configuration » (onglet Confidentialité).", 'The directory is unreachable. The Firestore rules for the Location center are probably not published yet. Open “Check my setup” (Privacy tab).'],
    dir_solo: ["Tu es l'un des premiers membres ! Invite tes proches, ou crée ton lien de localisation juste en dessous.", "You're one of the first members! Invite your friends, or create your location link just below."],
    dg_title: ['Vérifier ma configuration', 'Check my setup'], dg_run: ['Lancer la vérification', 'Run the check'], dg_running: ['Vérification…', 'Checking…'],
    dg_fix: ["Réparer et recharger l'application", 'Repair and reload the app'],
    dg_https: ['Connexion sécurisée (HTTPS)', 'Secure connection (HTTPS)'], dg_server: ['Configuration du serveur (vercel.json)', 'Server configuration (vercel.json)'],
    dg_policy: ["Autorisation GPS du site", 'Site GPS permission'], dg_gps: ['Permission GPS du téléphone', 'Phone GPS permission'], dg_map: ['Carte (Leaflet)', 'Map (Leaflet)'],
    dg_rules: ['Règles Firestore', 'Firestore rules'], dg_notif: ['Notifications', 'Notifications'],
    dg_server_old: ["Le serveur envoie encore l'ancienne configuration : le fichier vercel.json n'est pas déployé (GitHub → Vercel, attends le statut « Ready »).", 'The server still sends the old configuration: vercel.json is not deployed (GitHub → Vercel, wait for the “Ready” status).'],
    dg_cache: ["Le serveur est à jour mais cet appareil garde une ancienne version : touche « Réparer et recharger ».", 'The server is up to date but this device keeps an old version: tap “Repair and reload”.'],
    dg_rules_ko: ["Règles non publiées ou incomplètes : Firebase Console ▸ Firestore ▸ Règles ▸ coller le fichier complet ▸ Publier.", 'Rules not published or incomplete: Firebase Console ▸ Firestore ▸ Rules ▸ paste the full file ▸ Publish.'],
    dg_map_ko: ['Impossible de charger la carte (réseau ou blocage).', 'Unable to load the map (network or blocking).'],
    dg_gps_prompt: ["Pas encore demandée : touche « Activer ma position » dans l'onglet Position.", 'Not asked yet: tap “Turn on my position” in the Position tab.'],
    dg_notif_ko: ['Notifications bloquées : autorise-les dans les réglages du navigateur pour recevoir les alertes.', 'Notifications blocked: allow them in browser settings to receive alerts.'],
    dg_notif_ask: ["Pas encore autorisées : active-les pour recevoir les alertes même application fermée.", 'Not allowed yet: enable them to receive alerts even when the app is closed.']
  });
  Object.assign(N, {
    heal_msg: ["Mise à jour de l'application…", 'Updating the app…'],
    dg_tech: ['Infos techniques', 'Technical info'],
    dg_gps_dep: ["Dépend de l'étape « Autorisation GPS du site » : corrige-la d'abord (bouton Réparer), puis relance la vérification.", 'Depends on the “Site GPS permission” step: fix it first (Repair button), then run the check again.'],
    ex_label: ['Échange mutuel : partager aussi ma position', 'Mutual exchange: also share my position'],
    ex_help: ["Quand je touche « Localiser », je partage aussi ma position avec cette personne (durée au choix) : vous vous voyez chacun sur la carte.", 'When I tap “Locate”, I also share my position with that person (duration of your choice): you both see each other on the map.'],
    ex_title: ['Échanger nos positions avec {name}', 'Exchange positions with {name}'],
    ex_text: ["Tu envoies une demande à {name} ET tu partages ta position avec elle/lui pendant la durée choisie. Dès qu'elle/il accepte, vous vous voyez mutuellement.", 'You send {name} a request AND share your position with them for the chosen duration. Once they accept, you can see each other.'],
    ex_done: ['Demande envoyée et position partagée.', 'Request sent and position shared.'],
    join_hint: ["Enregistre ton numéro ou ton email pour apparaître dans la liste et être retrouvé. Tu peux déjà chercher et envoyer des demandes ci-dessous.", 'Save your number or email to appear in the list and be found. You can already search and send requests below.']
  });
  Object.assign(N, {
    mt_title: ['Type de carte', 'Map type'], mt_plan: ['Par défaut', 'Default'], mt_sat: ['Satellite', 'Satellite'], mt_relief: ['Relief', 'Terrain'],
    mt_details: ['Détails de la carte', 'Map details'], mt_labels: ['Noms des lieux', 'Place names'], mt_acc: ['Précision GPS', 'GPS accuracy'],
    mt_ko: ['Ce fond de carte est indisponible pour le moment. Retour à la carte par défaut.', 'This map style is unavailable right now. Back to the default map.'],
    ad_road: ['Rue / avenue', 'Street / avenue'], ad_quarter: ['Quartier', 'Neighbourhood'], ad_commune: ['Commune', 'District'], ad_city: ['Ville', 'City'],
    ad_county: ['Territoire / district', 'County / district'], ad_state: ['Province / région', 'Province / region'], ad_country: ['Pays', 'Country'], ad_postcode: ['Code postal', 'Postcode'],
    pl_selected: ['Lieu sélectionné', 'Selected place'], pl_copy: ["Copier l'adresse", 'Copy address'], pl_route: ['Itinéraire', 'Directions'], pl_share: ['Partager', 'Share'],
    pl_copied: ['Adresse copiée.', 'Address copied.'], pl_open: ['Ouvrir la carte en plein écran', 'Open the map full screen'], fs_title: ['Carte', 'Map']
  });
  Object.assign(N, {
    mt_rues: ['Rues', 'Streets'], mt_clair: ['Clair', 'Light'], mt_sombre: ['Sombre', 'Dark'], mt_humain: ['Humanitaire', 'Humanitarian'],
    mt_off: ['Indisponible', 'Unavailable'], mt_loading: ['Chargement de la carte…', 'Loading map…'],
    mt_ko: ["Le fond « {name} » est indisponible pour le moment. Retour à la carte par défaut.", 'The “{name}” map style is unavailable right now. Back to the default map.'],
    mt_blocked: ["Certains fonds de carte sont bloqués par la configuration du site. Touche « Réparer » pour charger la dernière version.", 'Some map styles are blocked by the site configuration. Tap “Repair” to load the latest version.'],
    nav_pos: ['Accueil', 'Home'], nav_share: ['Partage', 'Share'], nav_sec: ['Sécurité', 'Safety'], nav_dev: ['Appareils', 'Devices'], nav_hist: ['Historique', 'History'], nav_priv: ['Réglages', 'Settings'],
    hm_title: ['Que veux-tu faire ?', 'What would you like to do?'],
    hm_share_t: ['Partager ma position', 'Share my position'], hm_share_d: ['Un lien à envoyer, ou invite un proche', 'A link to send, or invite someone'],
    hm_find_t: ['Trouver un proche', 'Find someone'], hm_find_d: ['Demande sa position en un clic', 'Ask for their position in one tap'],
    hm_sos_t: ['Alerte SOS', 'SOS alert'], hm_sos_d: ["Préviens tes contacts d'urgence", 'Alert your emergency contacts'],
    hm_dev_t: ['Retrouver mon appareil', 'Find my device'], hm_dev_d: ['Sa dernière position connue', 'Its last known position'],
    hm_hist_t: ['Mes déplacements', 'My movements'], hm_hist_d: ['Historique de mes positions', 'History of my positions'],
    hm_priv_t: ['Réglages et aide', 'Settings and help'], hm_priv_d: ['Confidentialité, vérification', 'Privacy, checks'],
    hm_map_t: ['Carte en grand', 'Big map'], hm_map_d: ['Satellite, relief, adresses', 'Satellite, terrain, addresses'],
    hm_on: ['Activé', 'On'], hm_off: ['Désactivé', 'Off'], hm_active: ['{n} en cours', '{n} active'], hm_sos_on: ['SOS ACTIF', 'SOS ON'],
    hm_now: ['Ma position', 'My position'],
    ad_full: ['Adresse complète', 'Full address'], ad_hint: ['Données OpenStreetMap : certaines zones sont moins détaillées.', 'OpenStreetMap data: some areas are less detailed.']
  });
  for (var nk in N) if (Object.prototype.hasOwnProperty.call(N, nk)) X[nk] = N[nk];
  X.back = ['Retour', 'Back'];
  var TABS = ['pos', 'share', 'sec', 'dev', 'hist', 'priv'];
  var IC = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.3c2 .8 3 2.5 3 5.2"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3z"/><path d="M12 8v5M12 16.2v.1"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    sos: '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v5M12 17.6v.1"/>',
    map: '<path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4z"/><path d="M9 4v13M15 7v13"/>'
  };
  function ico(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + IC[name] + '</svg>'; }
  var NAV_ICON = { pos: 'home', share: 'share', sec: 'shield', dev: 'phone', hist: 'clock', priv: 'gear' };

  var SVG_BACK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var SVG_FS_ON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  var SVG_FS_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  var SVG_LAYERS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
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
      '<div class="lc-body"><div class="lc-mapwrap"><div id="lc-map"></div><div class="lc-mapfb" id="lc-mapfb" style="display:none"></div><div class="lc-mapnote" id="lc-mapnote"></div>' +
      '<button type="button" class="lc-fsbtn" id="lc-fsbtn" data-act="mapfs" aria-label="' + esc(T('fs_open')) + '">' + SVG_FS_ON + '</button>' +
      '<button type="button" class="lc-lyrbtn" data-act="layers" aria-label="' + esc(T('mt_title')) + '">' + SVG_LAYERS + '</button>' +
      '<div id="lc-fstop"></div><button type="button" class="lc-fsloc" data-act="recenter" aria-label="' + esc(T('recenter')) + '">' + SVG_LOC + '</button>' +
      '<div id="lc-fsbar"></div><div id="lc-place"></div></div>' +
      '<div class="lc-panel"><div id="lc-tabbody"></div></div></div>' +
      '<nav class="lc-nav" id="lc-tabs" role="tablist"></nav>' +
      '<div class="lc-sheet" id="lc-sheet"></div><div id="lc-layers"></div><div id="lc-toast"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'lc-dir-q') { S.dir.q = ev.target.value; dirDebounced(); } });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape' || !S.open) return;
      if ($('lc-sheet').classList.contains('open')) closeSheet(); else if (S.fs) mapBack(); else close();
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
      var dot = (k === 'sec' && S.sosMine) ? '<i class="dot"></i>' : (k === 'share' && S.outShares.some(function (s) { return s.status === 'pending'; }) ? '<i class="dot"></i>' : '');
      return '<button class="lc-navb' + (S.tab === k ? ' on' : '') + '" role="tab" aria-selected="' + (S.tab === k) + '" data-act="tab" data-tab="' + k + '"><span class="ic">' + ico(NAV_ICON[k]) + dot + '</span><span>' + esc(T('nav_' + k)) + '</span></button>';
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
    var keep = {}, keepChk = null;
    Array.prototype.forEach.call(body.querySelectorAll('input.lc-in,select.lc-in'), function (el) { if (el.id) keep[el.id] = el.value; });
    var okEl = $('lc-onb-ok'); if (okEl) keepChk = okEl.checked;
    var focusId = document.activeElement && document.activeElement.id;
    var sc = body.scrollTop;
    var fns = { pos: tabPos, share: tabShare, sec: tabSec, dev: tabDev, hist: tabHist, priv: tabPriv };
    body.innerHTML = (fns[S.tab] || tabPos)();
    Object.keys(keep).forEach(function (id) { var el = $(id); if (el) el.value = keep[id]; });
    if (keepChk !== null && $('lc-onb-ok')) $('lc-onb-ok').checked = keepChk;
    body.scrollTop = sc;
    if (focusId === 'lc-dir-q' && $('lc-dir-q')) { var q = $('lc-dir-q'); q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (e) { /* ignore */ } }
    if ($('lc-dir-res')) { renderDirResults(); if (!S.dir.ready && !S.dir.loading) dirRun(); }
  }
  function card(title, inner) { return '<div class="lc-card">' + (title ? '<h3>' + esc(title) + '</h3>' : '') + inner + '</div>'; }
  function btn(act, label, cls, extra) { return '<button type="button" class="lc-btn ' + (cls || '') + '" data-act="' + act + '"' + (extra || '') + '>' + esc(label) + '</button>'; }
  function durSelect(id) {
    return '<select class="lc-in" id="' + id + '"><option value="15">' + esc(T('dur_15')) + '</option><option value="60" selected>' + esc(T('dur_60')) + '</option><option value="480">' + esc(T('dur_480')) + '</option><option value="0">' + esc(T('dur_0')) + '</option></select>';
  }
  function av(name, photo) {
    var ph = safePhoto(photo);
    return '<span class="lc-av">' + initial(name) + (ph ? '<img src="' + esc(ph) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + '</span>';
  }

  /* ---- Onglet Position ---- */
  function tile(tab, act, icon, color, title, desc, badge, badgeCls) {
    return '<button type="button" class="lc-tile" data-act="' + act + '"' + (tab ? ' data-tab="' + tab + '"' : '') + '>' +
      (badge ? '<span class="bd ' + (badgeCls || '') + '">' + esc(badge) + '</span>' : '') +
      '<span class="ti" style="background:' + color + '">' + ico(icon) + '</span><b>' + esc(title) + '</b><span class="d">' + esc(desc) + '</span></button>';
  }
  function tabPos() {
    var st = S.status;
    if (!lsGet(LS_CONSENT) && S.watchId == null && !S.me) {
      return '<div class="lc-hero"><span class="st"><i></i>' + esc(T('st_idle')) + '</span><h2>' + esc(T('consent_title')) + '</h2><p>' + esc(T('consent_text')) + '</p>' +
        '<div class="acts">' + btn('startpos', T('consent_btn')) + '</div></div>' + homeTiles();
    }
    var cls = st === 'active' ? 'ok' : st === 'locating' ? 'wait' : st === 'idle' ? '' : 'bad';
    var m = S.me, lk = lastKnown(), d = S.addrDetail;
    var title = m ? ((d && d.ok && d.title) || (fmtCoord(m.lat) + ', ' + fmtCoord(m.lng))) : T('hm_now');
    var sub = m ? ((d && d.ok && d.sub) || '') : (lk ? T('last_known', { ago: ago(lk.ts) }) : T('no_pos'));
    var hero = '<div class="lc-hero"><span class="st ' + cls + '"><i></i>' + esc(T('st_' + st)) + '</span><h2>' + esc(title) + '</h2><p>' + esc(sub) + (m ? (sub ? ' · ' : '') + esc(fmtAcc(m.acc)) + ' · ' + esc(ago(m.ts)) : '') + '</p><div class="acts">';
    if (m) hero += '<button type="button" class="lc-btn sm" data-act="fly" data-lat="' + m.lat + '" data-lng="' + m.lng + '" data-name="' + esc(T('fs_me')) + '" data-ts="' + m.ts + '" data-acc="' + (typeof m.acc === 'number' ? m.acc : '') + '">' + esc(T('pl_open')) + '</button>';
    if (S.watchId != null) hero += '<button type="button" class="lc-btn sm sec" data-act="refreshpos">' + esc(T('btn_refresh')) + '</button>';
    else hero += '<button type="button" class="lc-btn sm" data-act="startpos">' + esc(T('btn_start')) + '</button>';
    hero += '</div></div>';
    var h = hero;
    if (X['err_' + st]) h += '<div class="lc-err">' + esc(T('err_' + st)) + '</div>' + (st === 'policy' ? '<div style="margin-bottom:12px">' + btn('repair', T('dg_fix'), '') + '</div>' : '');
    if (m && m.acc != null && m.acc > 100) h += '<div class="lc-warn">' + esc(T('acc_low')) + '</div>';
    if (m) h += card(T('lbl_addr'), '<div class="lc-grid"><div class="lc-kv"><small>' + esc(T('lbl_lat')) + '</small><b>' + fmtCoord(m.lat) + '</b></div>' +
      '<div class="lc-kv"><small>' + esc(T('lbl_lng')) + '</small><b>' + fmtCoord(m.lng) + '</b></div></div>' + addrBlock());
    if (S.profileLoaded && !S.profile) h += card('', '<p>' + esc(T('pos_join')) + '</p>' + btn('gojoin', T('pos_join_btn')));
    return h + homeTiles();
  }
  function homeTiles() {
    var nOut = activeOut().length + activeLinks().length, nIn = activeIn().length, nReq = S.outShares.filter(function (s) { return s.status === 'pending'; }).length;
    var shareBadge = (nOut + nIn) ? T('hm_active', { n: nOut + nIn }) : (nReq ? String(nReq) : '');
    return '<div class="lc-sec">' + esc(T('hm_title')) + '</div><div class="lc-tiles">' +
      tile('share', 'tab', 'share', '#1b4fd8', T('hm_share_t'), T('hm_share_d'), shareBadge, nReq && !(nOut + nIn) ? 'red' : '') +
      tile('share', 'tab', 'users', '#0b9a6a', T('hm_find_t'), T('hm_find_d')) +
      tile('sec', 'tab', 'sos', '#d7263d', T('hm_sos_t'), T('hm_sos_d'), S.sosMine ? T('hm_sos_on') : '', 'red') +
      tile('dev', 'tab', 'phone', '#7048e8', T('hm_dev_t'), T('hm_dev_d'), cfg.track ? T('hm_on') : T('hm_off'), cfg.track ? '' : 'off') +
      tile('hist', 'tab', 'clock', '#e8590c', T('hm_hist_t'), T('hm_hist_d'), cfg.history ? T('hm_on') : T('hm_off'), cfg.history ? '' : 'off') +
      tile('', 'mapfs', 'map', '#0b7a8a', T('hm_map_t'), T('hm_map_d')) +
      '</div>' + tile('priv', 'tab', 'gear', '#495057', T('hm_priv_t'), T('hm_priv_d')).replace('class="lc-tile"', 'class="lc-tile" style="width:100%;min-height:0;flex-direction:row;align-items:center"');
  }

  function addrBlock() {
    var d = S.addrDetail;
    if (d && d.ok) {
      return '<div class="lc-arows" style="margin-top:12px">' + d.rows.map(function (r) {
        return '<div><small>' + esc(T(r[0])) + '</small><b>' + esc(r[1]) + '</b></div>';
      }).join('') + '</div>';
    }
    return '<div class="lc-kv" style="margin-top:10px"><small>' + esc(T('lbl_addr')) + '</small><b>' + esc(S.address ? S.address : (S.addrFailed ? T('addr_none') : T('addr_wait'))) + '</b></div>';
  }
  function closedInfo() {
    return '<details class="lc-card lc-details"><summary>' + esc(T('closed_title')) + '</summary><p class="lc-muted" style="margin-top:8px">' + esc(T('closed_text')) + '</p></details>';
  }
  /* ---- Onglet Partage ---- */
  function onboardCard() {
    var me = getMe() || {};
    var em = (S.priv && S.priv.email) || me.email || '', ph = (S.priv && S.priv.phone) || '';
    var steps = ['onb_s1', 'onb_s2', 'onb_s3'].map(function (k, i) { return '<li><span class="lc-step">' + (i + 1) + '</span><span>' + esc(T(k)) + '</span></li>'; }).join('');
    return card(S.profile ? T('onb_edit') : T('onb_title'),
      (S.regError ? '<div class="lc-err">' + esc(S.regError) + '</div>' : '') +
      '<p>' + esc(T('onb_text')) + '</p><ol class="lc-steps">' + steps + '</ol>' +
      '<div class="lc-form"><label class="lc-lbl" for="lc-onb-phone">' + esc(T('onb_phone')) + '</label>' +
      '<input class="lc-in" id="lc-onb-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+243 81 234 5678" value="' + esc(ph) + '">' +
      '<label class="lc-lbl" for="lc-onb-email">' + esc(T('onb_email')) + '</label>' +
      '<input class="lc-in" id="lc-onb-email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" placeholder="nom@exemple.com" value="' + esc(em) + '">' +
      '<label class="lc-sw"><span class="lc-muted">' + esc(T('onb_consent')) + '</span><input type="checkbox" id="lc-onb-ok"' + (S.profile ? ' checked' : '') + '></label>' +
      btn('register', T('onb_save')) + '</div>');
  }
  function dirCard(ctx) {
    return card(ctx === 'ec' ? T('ec_add_title') : T('dir_title'),
      (ctx === 'ec' ? '<p class="lc-muted">' + esc(T('ec_how')) + '</p>' : '') +
      (ctx === 'share' ? '<label class="lc-sw"><span><b>' + esc(T('ex_label')) + '</b><br><span class="lc-muted">' + esc(T('ex_help')) + '</span></span><input type="checkbox" data-ch="exch"' + (S.exchange ? ' checked' : '') + '></label>' : '') +
      '<input class="lc-in" id="lc-dir-q" type="search" autocomplete="off" autocapitalize="none" placeholder="' + esc(T('dir_search_ph')) + '" value="' + esc(S.dir.q) + '">' +
      '<div id="lc-dir-res" style="margin-top:10px"></div>' +
      (ctx === 'share' ? '<div class="lc-invite"><span class="lc-muted">' + esc(T('invite_title')) + '</span>' + btn('invite', T('invite_btn'), 'sec sm') + '</div>' : ''));
  }
  function dirRow(p, ctx) {
    var out = S.outShares.filter(function (s) { return s.viewerUid === p.uid; })[0];
    var inn = S.inShares.filter(function (s) { return s.ownerUid === p.uid; })[0];
    var chips = [], acts = '', uidAttr = ' data-uid="' + esc(p.uid) + '"';
    if (ctx === 'share') {
      if (isActiveShare(out)) chips.push(T('st_sees_you')); else if (out && out.status === 'pending') chips.push(T('st_they_asked'));
      if (isActiveShare(inn)) chips.push(T('st_you_see')); else if (inn && inn.status === 'pending') chips.push(T('st_asked'));
      if (!(isActiveShare(inn) || (inn && inn.status === 'pending'))) acts += btn('locate', T('dir_locate'), '', uidAttr);
      if (!isActiveShare(out)) acts += btn('shareto', T('dir_share'), 'sec', uidAttr);
    } else {
      var ec = S.contacts.filter(function (c) { return c.contactUid === p.uid; })[0];
      if (ec) chips.push(ec.status === 'accepted' ? T('ec_accepted') : T('ec_pending')); else acts += btn('ecadd', T('dir_add'), '', uidAttr);
    }
    return '<div class="lc-person"><div class="top">' + av(p.name, p.photoURL) + '<div class="grow"><b>' + esc(p.name) + '</b>' +
      (p.username ? '<span class="lc-muted">@' + esc(p.username) + '</span>' : '') + '</div></div>' +
      (chips.length ? '<div>' + chips.map(function (c) { return '<span class="lc-chip-s">' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
      (acts ? '<div class="lc-diracts">' + acts + '</div>' : '') + '</div>';
  }
  function renderDirResults() {
    var host = $('lc-dir-res'); if (!host) return;
    var ctx = S.tab === 'sec' ? 'ec' : 'share', d = S.dir, h = '';
    if (d.error) h = '<div class="lc-err">' + esc(T('dir_error')) + '</div>';
    else if (d.loading && !d.results.length) h = '<p class="lc-muted">' + esc(T('loading')) + '</p>';
    else if (d.ready && !d.results.length && !d.q) h = '<div class="lc-warn" style="margin:0">' + esc(T('dir_solo')) + '</div>';
    else if (d.ready && !d.results.length) h = '<p class="lc-muted">' + esc(T('dir_empty')) + '</p>';
    else {
      if (!d.q) h += '<div class="lc-lbl" style="margin-bottom:8px">' + esc(T('dir_members')) + '</div>';
      h += d.results.map(function (p) { return dirRow(p, ctx); }).join('');
    }
    host.innerHTML = h;
  }

  function linkRow(l) {
    var n = S.outShares.filter(function (s) { return s.linkToken === l.id && isActiveShare(s); }).length;
    return '<div class="lc-person"><div class="top"><div class="grow"><b>' + esc(l.expiresAtMs ? T('lk_expires', { t: fmtTime(l.expiresAtMs) }) : T('lk_never')) + '</b>' +
      '<span class="lc-muted">' + esc(T('lk_viewers', { n: n })) + '</span></div></div>' +
      '<div class="lc-linkbox">' + esc(linkUrl(l.id)) + '</div>' +
      '<div class="lc-ch">' +
      btn('lkch', 'WhatsApp', 'sm', ' data-ch="wa" data-id="' + esc(l.id) + '"') + btn('lkch', 'Messenger', 'sm', ' data-ch="ms" data-id="' + esc(l.id) + '"') + btn('lkch', 'Facebook', 'sm', ' data-ch="fb" data-id="' + esc(l.id) + '"') +
      btn('lkch', 'Telegram', 'sec sm', ' data-ch="tg" data-id="' + esc(l.id) + '"') + btn('lkch', 'SMS', 'sec sm', ' data-ch="sms" data-id="' + esc(l.id) + '"') + btn('lkch', T('lk_other'), 'sec sm', ' data-ch="nat" data-id="' + esc(l.id) + '"') + '</div>' +
      '<div class="lc-diracts">' + btn('lkch', T('lk_copy'), 'sec sm', ' data-ch="copy" data-id="' + esc(l.id) + '"') + btn('lkoff', T('lk_off'), 'red sm', ' data-id="' + esc(l.id) + '"') + '</div></div>';
  }
  function linkCard() {
    var act = activeLinks();
    var chips = [[60, 'dur_60'], [480, 'dur_480'], [1440, 'dur_1440'], [0, 'dur_0']].map(function (c) {
      return '<button type="button" class="lc-chip' + (S.lkDur === c[0] ? ' on' : '') + '" data-act="lkdur" data-v="' + c[0] + '">' + esc(T(c[1])) + '</button>';
    }).join('');
    return card(T('lk_title'),
      '<p>' + esc(T('lk_intro')) + '</p><div class="lc-chips">' + chips + '</div>' + btn('lkcreate', T('lk_create'), '') +
      '<p class="lc-muted" style="margin-top:10px">' + esc(T('lk_warn')) + '</p>' +
      (act.length ? '<div class="lc-lbl" style="margin:12px 0 6px">' + esc(T('lk_active')) + '</div>' + act.map(linkRow).join('') + '<p class="lc-muted">' + esc(T('lk_social_hint')) + '</p>' : ''));
  }
  function tabShare() {
    if (!S.profileLoaded) return '<p class="lc-muted">' + esc(T('loading')) + '</p>';
    if (S.editProfile) return onboardCard();
    var me = myUid(), h = '', out = activeOut();
    if (!S.profile) h += onboardCard();
    if (out.length) h += '<div class="lc-banner">📍 ' + esc(T('sh_banner', { names: out.map(function (s) { return s.viewerName; }).join(', ') })) + '</div>';
    var reqs = S.outShares.filter(function (s) { return s.status === 'pending' && s.requestedBy !== me; });
    if (reqs.length) {
      h += card(T('sh_req_in') + ' (' + reqs.length + ')', reqs.map(function (s) {
        return '<div class="lc-person"><div class="top">' + av(s.viewerName) + '<div class="grow"><b>' + esc(s.viewerName) + '</b><span class="lc-muted">' + esc(T('sh_req_in_txt', { name: s.viewerName })) + '</span></div></div>' +
          '<div class="lc-diracts">' + btn('accept', T('sh_accept'), 'ok', ' data-id="' + esc(s.id) + '"') + btn('decline', T('req_delete'), 'sec', ' data-id="' + esc(s.id) + '"') + '</div></div>';
      }).join(''));
    }
    h += dirCard('share');
    h += linkCard();
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
          (has ? '<button type="button" class="lc-btn sm" data-act="fly" data-lat="' + p.lat + '" data-lng="' + p.lng + '" data-name="' + esc(s.ownerName) + '" data-ts="' + (p.updatedAtMs || 0) + '" data-acc="' + (typeof p.accuracy === 'number' ? p.accuracy : '') + '">' + esc(T('dv_view')) + '</button>' : '') + '</div>';
      }).join('')
      : '<p class="lc-muted">' + esc(T('sh_with_me_empty')) + '</p>');
    var sent = S.inShares.filter(function (s) { return s.status === 'pending' && s.requestedBy === me; });
    if (sent.length) {
      h += card(T('sh_sent'), sent.map(function (s) {
        return '<div class="lc-row">' + av(s.ownerName) + '<div class="grow"><b>' + esc(s.ownerName) + '</b><span class="lc-muted">' + esc(T('sh_waiting')) + '</span></div>' +
          btn('cancelreq', T('sh_cancel_req'), 'sec sm', ' data-id="' + esc(s.id) + '"') + '</div>';
      }).join(''));
    }
    return h + '<p class="lc-muted">' + esc(T('sh_info')) + '</p>' + closedInfo();
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
    h += card(T('ec_title'), S.contacts.length ? S.contacts.map(function (c) {
      return '<div class="lc-row">' + av(c.contactName) + '<div class="grow"><b>' + esc(c.contactName) + '</b><span class="lc-muted">' + esc(c.status === 'accepted' ? T('ec_accepted') : T('ec_pending')) + '</span></div>' +
        btn('rmcontact', T('ec_remove'), 'sec sm', ' data-id="' + esc(c.id) + '"') + '</div>';
    }).join('') : '<p class="lc-muted">' + esc(T('ec_empty')) + '</p>');
    if (S.profileLoaded && (!S.profile || S.editProfile)) h += onboardCard();
    else if (S.profile) h += S.contacts.length < CFG.MAX_CONTACTS ? dirCard('ec') : '<p class="lc-muted">' + esc(T('ec_limit')) + '</p>';

    if (S.contactsIn.some(function (c) { return c.status === 'accepted'; })) {
      h += card(T('sos_others'), S.sosOthers.length ? S.sosOthers.map(function (s) {
        var has = validCoords(s.lat, s.lng);
        return '<div class="lc-row"><span class="lc-av" style="background:#d7263d">SOS</span><div class="grow"><b>' + esc(s.ownerName) + '</b><span class="lc-muted">' +
          esc(T('sos_since', { ago: ago(s.startedAtMs) })) + ' · ' + (has ? esc(ago(s.updatedAtMs)) + ' · ' + esc(fmtAcc(s.accuracy)) : esc(T('sh_peer_nopos'))) + '</span></div>' +
          (has ? '<button type="button" class="lc-btn red sm" data-act="fly" data-lat="' + s.lat + '" data-lng="' + s.lng + '" data-name="SOS · ' + esc(s.ownerName) + '" data-ts="' + (s.updatedAtMs || 0) + '" data-acc="' + (typeof s.accuracy === 'number' ? s.accuracy : '') + '">' + esc(T('dv_view')) + '</button>' : '') + '</div>';
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
        (has ? '<button type="button" class="lc-btn sm" data-act="fly" data-lat="' + d.lat + '" data-lng="' + d.lng + '" data-name="' + esc(d.name || '') + '" data-ts="' + (d.lastPosMs || 0) + '" data-acc="' + (typeof d.accuracy === 'number' ? d.accuracy : '') + '">' + esc(T('dv_view')) + '</button>' : '') +
        (mine ? '' : btn('askdev', T('dv_ask'), 'sec sm', ' data-id="' + esc(d.id) + '"')) +
        btn('rename', T('dv_rename'), 'sec sm', ' data-id="' + esc(d.id) + '" data-name="' + esc(d.name || '') + '"') +
        btn('rmdev', T('dv_remove'), 'sec sm', ' data-id="' + esc(d.id) + '"') + '</div></div></div>';
    }).join('') : '<p class="lc-muted">' + esc(T('dv_empty')) + '</p>');
    return h + '<p class="lc-muted">' + esc(T('dv_limits')) + '</p>' + closedInfo();
  }

  /* ---- Onglet Historique ---- */
  function tabHist() {
    if (!cfg.history) return card(T('hi_title'), '<p class="lc-muted">' + esc(T('hi_off')) + '</p>');
    var h = '<p class="lc-muted">' + esc(T('hi_rule', { n: cfg.historyMin, m: CFG.HISTORY_MIN_DIST_M, d: cfg.retention })) + '</p>';
    if (S.histErr) h += '<div class="lc-err">' + esc(errText(S.histErr)) + '</div>';
    h += S.history.length ? S.history.map(function (p) {
      return '<div class="lc-row"><div class="grow"><b>' + esc(fmtTime(p.tsMs)) + '</b><span class="lc-muted">' + fmtCoord(p.lat) + ', ' + fmtCoord(p.lng) + ' · ' + esc(fmtAcc(p.accuracy)) + '</span></div>' +
        '<button type="button" class="lc-btn sec sm" data-act="fly" data-lat="' + p.lat + '" data-lng="' + p.lng + '" data-ts="' + (p.tsMs || 0) + '" data-acc="' + (typeof p.accuracy === 'number' ? p.accuracy : '') + '">' + esc(T('dv_view')) + '</button></div>';
    }).join('') : (S.histErr ? '' : '<p class="lc-muted">' + esc(T('hi_empty')) + '</p>');
    if (S.history.length) h += '<div style="margin-top:10px">' + btn('clearhist', T('hi_clear'), 'sec sm') + '</div>';
    return card(T('hi_title'), h);
  }

  /* ---- Onglet Confidentialité ---- */
  function diagCard() {
    var d = S.diag, h = '';
    if (d && d.running) h = '<p class="lc-muted">' + esc(T('dg_running')) + '</p>';
    else if (d) {
      var bad = false;
      h = d.items.map(function (it) {
        if (it.ok === false) bad = true;
        var cls = it.ok === true ? 'ok' : (it.ok === false ? 'ko' : 'na');
        return '<div class="lc-dg ' + cls + '"><i>' + (it.ok === true ? '✓' : (it.ok === false ? '✕' : '!')) + '</i><div><b>' + esc(it.label) + '</b>' + (it.hint ? '<small>' + esc(it.hint) + '</small>' : '') + '</div></div>';
      }).join('');
      if (bad) h = '<div style="margin-bottom:6px">' + btn('repair', T('dg_fix'), '') + '</div>' + h;
    }
    var ti = S.techInfo, tech = '';
    if (ti && d && !d.running) {
      tech = '<details class="lc-details" style="margin-top:10px"><summary>' + esc(T('dg_tech')) + '</summary><p class="lc-muted" style="margin-top:6px;word-break:break-word">' +
        'Permissions-Policy (serveur) : <b>' + esc(ti.serverPP || '—') + '</b><br>' +
        'GPS autorisé par la page : <b>' + (ti.pageGeo ? 'oui' : 'non') + '</b><br>' +
        'Carte bloquée (CSP) : <b>' + (ti.cspSeen ? 'oui' : 'non') + '</b><br>' +
        'Fenêtre principale : <b>' + (ti.top ? 'oui' : 'non (intégrée dans un cadre)') + '</b><br>' +
        'Application installée : <b>' + (ti.standalone ? 'oui' : 'non') + '</b> · WebView : <b>' + (ti.wv ? 'oui' : 'non') + '</b></p></details>';
    }
    return card(T('dg_title'), h + '<div style="margin-top:10px">' + btn('diag', T('dg_run'), 'sec sm', (d && d.running) ? ' disabled' : '') + '</div>' + tech);
  }
  function tabPriv() {
    var items = ['pv_1', 'pv_2', 'pv_3', 'pv_4', 'pv_5', 'pv_6', 'pv_7'].map(function (k) { return '<li style="margin-bottom:6px">' + esc(T(k)) + '</li>'; }).join('');
    var h = card(T('pv_title'), '<ul style="margin:0;padding-left:18px;font-size:.86rem;line-height:1.45">' + items + '</ul>');
    var freq = CFG.HISTORY_INTERVALS_MIN.map(function (n) { return '<option value="' + n + '"' + (cfg.historyMin === n ? ' selected' : '') + '>' + n + ' ' + T('min_unit') + '</option>'; }).join('');
    var keep = CFG.HISTORY_RETENTIONS_DAYS.map(function (n) { return '<option value="' + n + '"' + (cfg.retention === n ? ' selected' : '') + '>' + n + ' ' + T('day_unit') + '</option>'; }).join('');
    h += card(T('pv_history'),
      '<label class="lc-sw"><span><b>' + esc(T('pv_history')) + '</b></span><input type="checkbox" data-ch="hist"' + (cfg.history ? ' checked' : '') + '></label>' +
      '<div class="lc-grid"><div class="lc-kv"><small>' + esc(T('pv_every')) + '</small><select class="lc-in" data-ch="histfreq">' + freq + '</select></div>' +
      '<div class="lc-kv"><small>' + esc(T('pv_keep')) + '</small><select class="lc-in" data-ch="histkeep">' + keep + '</select></div></div>');
    if (S.profile) {
      h += card(T('pv_dir'), '<p class="lc-muted">' + esc(((S.priv && S.priv.email) || '') + (S.priv && S.priv.email && S.priv.phone ? ' · ' : '') + ((S.priv && S.priv.phone) || '')) + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + btn('editprofile', T('onb_edit'), 'sec sm') + btn('leavedir', T('pv_leave'), 'sec sm') + '</div>');
    }
    h += diagCard();
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
  function openDurSheet(title, text, okLabel, onOk) {
    var sh = $('lc-sheet'); if (!sh) return;
    S.sheetDur = 60; S.sheetOk = onOk;
    var chips = [[15, 'dur_15'], [60, 'dur_60'], [480, 'dur_480'], [0, 'dur_0']].map(function (c) {
      return '<button type="button" class="lc-chip' + (c[0] === 60 ? ' on' : '') + '" data-act="chipdur" data-v="' + c[0] + '">' + esc(T(c[1])) + '</button>';
    }).join('');
    sh.innerHTML = '<div class="lc-sheet-box" role="dialog"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="lc-chips">' + chips + '</div>' +
      btn('durok', okLabel, 'ok') + btn('sheetno', T('cancel'), 'sec') + '</div>';
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
      case 'close': if (S.fs) mapBack(); else close(); break;
      case 'mapfs': S.fs = !S.fs; applyFs(); break;
      case 'mapback': mapBack(); break;
      case 'layers': openLayers(); break;
      case 'layersx': closeLayers(); break;
      case 'mbase': if (MAP_BASES[t.getAttribute('data-v')]) { S.mp.base = t.getAttribute('data-v'); saveMapPrefs(); applyBase(); renderLayersSheet(); } break;
      case 'mdet': { var dk = t.getAttribute('data-v'); if (dk === 'labels' || dk === 'acc') { S.mp[dk] = !S.mp[dk]; saveMapPrefs(); applyBase(); drawMap(); renderLayersSheet(); } break; }
      case 'placex': clearSel(); break;
      case 'plcopy': placeCopy(); break;
      case 'plshare': placeShare(); break;
      case 'selplace': selectPlace({ lat: parseFloat(t.getAttribute('data-lat')), lng: parseFloat(t.getAttribute('data-lng')), label: t.getAttribute('data-name') || '', ts: parseInt(t.getAttribute('data-ts'), 10) || 0, acc: t.getAttribute('data-acc') === '' ? null : parseFloat(t.getAttribute('data-acc')) }, true); break;
      case 'recenter': { var lk = lastKnown(); if (lk) { if (S.sel) clearSel(); flyTo(lk.lat, lk.lng); } break; }
      case 'tab': setTab(t.getAttribute('data-tab')); break;
      case 'startpos': lsSet(LS_CONSENT, '1'); S.watchId = null; startWatch(); queryPerm(); renderTab(); break;
      case 'stoppos': stopWatch(); renderTab(); break;
      case 'refreshpos': oneShotFix(); geocodeMaybe(true); break;
      case 'fly': showOnMap(parseFloat(t.getAttribute('data-lat')), parseFloat(t.getAttribute('data-lng')), t.getAttribute('data-name') || '', parseInt(t.getAttribute('data-ts'), 10) || 0, t.getAttribute('data-acc') === null || t.getAttribute('data-acc') === '' ? null : parseFloat(t.getAttribute('data-acc'))); break;
      case 'register': {
        var okb = $('lc-onb-ok');
        if (!okb || !okb.checked) { toastLC(T('onb_consent_needed'), 'error'); break; }
        run(t, function () {
          return registerProfile(val('lc-onb-phone'), val('lc-onb-email'))
            .then(function () { S.regError = ''; S.editProfile = false; S.dir.ready = false; })
            .catch(function (e) { S.regError = userErr(e); throw e; });
        }, T('onb_done'));
        break;
      }
      case 'gojoin': setTab('share'); break;
      case 'lkdur': S.lkDur = parseInt(t.getAttribute('data-v'), 10) || 0; renderTab(); break;
      case 'lkcreate':
        if (!lsGet(LS_CONSENT)) {
          openSheet(T('consent_title'), T('consent_text'), '', T('consent_btn'), function () {
            lsSet(LS_CONSENT, '1'); closeSheet(); run(null, function () { return createLink(S.lkDur); }, T('lk_created'));
          });
        } else run(t, function () { return createLink(S.lkDur); }, T('lk_created'));
        break;
      case 'lkch': shareVia(t.getAttribute('data-ch'), id); break;
      case 'lkoff': run(t, function () { return revokeLink(id); }, T('lk_off_done')); break;
      case 'diag': runDiagnostics(); break;
      case 'repair': repairApp(); break;
      case 'retrymap': { S.leafletPromise = null; var fbx = $('lc-mapfb'); if (fbx) fbx.style.display = 'none'; var wr = document.querySelector('.lc-mapwrap'); if (wr) wr.classList.remove('fb'); initMap(); break; }
      case 'editprofile': S.editProfile = true; setTab('share'); break;
      case 'leavedir':
        openSheet(T('pv_leave'), T('pv_leave_confirm'), '', T('pv_leave'), function () {
          closeSheet(); leaveDirectory().then(function () { toastLC(T('pv_left')); renderTab(); }).catch(function (e) { toastLC(errText(e), 'error'); });
        });
        break;
      case 'locate': {
        var lp = dirFind(t.getAttribute('data-uid')); if (!lp) break;
        if (S.exchange) {
          if (needPos()) break;
          openDurSheet(T('ex_title', { name: lp.name }), T('ex_text', { name: lp.name }), T('sheet_confirm'), function (dur) {
            closeSheet();
            run(null, function () { return askPositionUid({ uid: lp.uid, name: lp.name }).then(function () { return shareWithUid({ uid: lp.uid, name: lp.name }, dur); }); }, T('ex_done'));
          });
        } else run(t, function () { return askPositionUid({ uid: lp.uid, name: lp.name }); }, T('sh_asked'));
        break;
      }
      case 'shareto': {
        var sp = dirFind(t.getAttribute('data-uid')); if (!sp || needPos()) break;
        openDurSheet(T('sheet_share_title', { name: sp.name }), T('sheet_text', { name: sp.name }), T('sheet_confirm'), function (dur) {
          closeSheet(); run(null, function () { return shareWithUid({ uid: sp.uid, name: sp.name }, dur); }, T('sh_done'));
        });
        break;
      }
      case 'accept': {
        if (needPos()) break;
        var rq = S.outShares.filter(function (s) { return s.id === id; })[0]; if (!rq) break;
        openDurSheet(T('sheet_accept_title', { name: rq.viewerName }), T('sheet_text', { name: rq.viewerName }), T('sheet_confirm'), function (dur) {
          closeSheet(); run(null, function () { return acceptRequest(id, dur); }, T('sh_done'));
        });
        break;
      }
      case 'chipdur': {
        S.sheetDur = parseInt(t.getAttribute('data-v'), 10) || 0;
        Array.prototype.forEach.call(document.querySelectorAll('#lc-sheet .lc-chip'), function (c) { c.classList.toggle('on', c === t); });
        break;
      }
      case 'durok': { var dcb = S.sheetOk; if (dcb) dcb(S.sheetDur); break; }
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
      case 'ecadd': { var ep = dirFind(t.getAttribute('data-uid')); if (ep) run(t, function () { return inviteContactUid({ uid: ep.uid, name: ep.name }); }, T('ec_sent')); break; }
      case 'invite': {
        var txt = T('invite_text', { url: location.origin });
        if (navigator.share) { navigator.share({ text: txt }).catch(function () { /* annulé */ }); }
        else root.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
        break;
      }
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
    if (ch === 'exch') { S.exchange = !!t.checked; }
    else if (ch === 'track') { setTrack(!!t.checked); }
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
      var ae = document.activeElement;
      var typing = ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName);
      if (!typing && (S.tab === 'share' || S.tab === 'dev' || S.tab === 'pos')) renderTab();
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
    S.editProfile = false; S.dir.ready = false;
    Promise.all([loadProfile(), loadBlocked(), loadShares(), loadContacts(), loadDevices(), loadSosMine(), loadLinks()]).then(function () {
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
    S.open = false; S.fs = false; applyFs(); closeSheet();
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
    Promise.all([loadShares(), loadSosMine(), loadLinks()]).then(function () {
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

  // Ouvre un lien de localisation reçu (?loc=link&t=…) : confirmation, puis carte plein écran
  function openLink(token) {
    open('share');
    fetchLink(token).then(function (l) {
      var until = l.expiresAtMs ? fmtTime(l.expiresAtMs) : T('sh_manual');
      openSheet(T('lk_open_title', { name: l.ownerName }), T('lk_open_text', { until: until }), '', T('lk_open_btn'), function () {
        closeSheet();
        run(null, function () { return claimLink(l).then(function () { S.fs = true; applyFs(); focusPeer(l.ownerUid); }); }, T('lk_done'));
      });
    }).catch(function (e) {
      var c = e && e.code;
      toastLC(c === 'badlink' ? T('lk_bad') : c === 'expiredlink' ? T('lk_expired') : c === 'ownlink' ? T('lk_own') : errText(e), 'error');
    });
  }

  root.LocationCenter = {
    open: open, close: close, boot: boot, openLink: openLink,
    isOpen: function () { return S.open; },
    _test: { haversine: haversine, validCoords: validCoords, remaining: remaining, ago: ago, isActiveShare: isActiveShare }
  };
})();
