/* =====================================================================
   polish.js — finitions et filet de sécurité (Coeurnoh Universe)
   Chargé après script.js. N'écrase aucune donnée : il enveloppe des
   fonctions existantes (showToast, openTutorial) et ajoute des garde-fous.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnPolish) return;
  window.__cnPolish = true;

  var L10N = {
    fr: { later: 'Plus tard', go: 'Découvrir en 30 s', hi: 'Bienvenue sur Coeurnoh Universe', b1: 'Boost de TikTok, Instagram, YouTube et plus', b2: 'Paiement mobile money, crypto ou carte', b3: 'Boutique, emploi, immobilier et services au même endroit', oops: 'Un petit souci est survenu. Réessaie dans un instant.', newn: 'Nouvelle notification', close: 'Fermer' },
    en: { later: 'Maybe later', go: 'Quick tour (30 s)', hi: 'Welcome to Coeurnoh Universe', b1: 'Boost TikTok, Instagram, YouTube and more', b2: 'Pay with mobile money, crypto or card', b3: 'Shop, jobs, real estate and services in one place', oops: 'Something went wrong. Please try again in a moment.', newn: 'New notification', close: 'Close' },
    es: { later: 'Más tarde', go: 'Descubrir en 30 s', hi: 'Bienvenido a Coeurnoh Universe', b1: 'Impulsa TikTok, Instagram, YouTube y más', b2: 'Paga con mobile money, cripto o tarjeta', b3: 'Tienda, empleo, inmuebles y servicios en un solo lugar', oops: 'Ha ocurrido un pequeño problema. Inténtalo de nuevo en un momento.', newn: 'Nueva notificación', close: 'Cerrar' },
    it: { later: 'Più tardi', go: 'Scopri in 30 s', hi: 'Benvenuto su Coeurnoh Universe', b1: 'Potenzia TikTok, Instagram, YouTube e altro', b2: 'Paga con mobile money, cripto o carta', b3: 'Negozio, lavoro, immobili e servizi in un unico posto', oops: 'Si è verificato un piccolo problema. Riprova tra un momento.', newn: 'Nuova notifica', close: 'Chiudi' },
    pt: { later: 'Mais tarde', go: 'Descobrir em 30 s', hi: 'Bem-vindo ao Coeurnoh Universe', b1: 'Impulsione TikTok, Instagram, YouTube e mais', b2: 'Pague com mobile money, cripto ou cartão', b3: 'Loja, emprego, imóveis e serviços num só lugar', oops: 'Ocorreu um pequeno problema. Tente novamente em instantes.', newn: 'Nova notificação', close: 'Fechar' }
  };
  function lang() { try { if (typeof currentLang !== 'undefined' && L10N[currentLang]) return currentLang; } catch (e) { /* ignore */ } var n = (navigator.language || 'fr').slice(0, 2); return L10N[n] ? n : 'fr'; }
  function tx(k) { return (L10N[lang()] || L10N.fr)[k] || L10N.fr[k]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- 1. Notifications (bulles) : icône, barre de temps, fermeture au toucher ---------- */
  var ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7.5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 7v6M12 17v.1"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 11v6M12 7v.1"/></svg>'
  };
  var origToast = window.showToast;
  window.showToast = function (message, type) {
    var container = document.getElementById('toast-container');
    if (!container) { return typeof origToast === 'function' ? origToast(message, type) : undefined; }
    type = (type === 'success' || type === 'error') ? type : 'info';
    // jamais plus de 3 bulles à l'écran, et pas deux fois le même message d'affilée
    var last = container.lastElementChild;
    if (last && last.getAttribute('data-msg') === String(message)) return;
    while (container.children.length >= 3) container.removeChild(container.firstElementChild);
    var el = document.createElement('div');
    el.className = 'toast cn-toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.setAttribute('data-msg', String(message));
    var ms = type === 'error' ? 5200 : 3400;
    el.innerHTML = '<span class="ti">' + ICONS[type] + '</span><span class="tx">' + esc(message) + '</span><span class="tb" style="animation-duration:' + ms + 'ms"></span>';
    container.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    var gone = false;
    function dismiss() { if (gone) return; gone = true; el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320); }
    el.addEventListener('click', dismiss);
    setTimeout(dismiss, ms);
    if (type === 'error') { try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) { /* ignore */ } }
  };

  /* ---------- 2. Bandeau « nouvelle notification » quand l'application est ouverte ---------- */
  var seen = null, bannerTimer = null;
  function iconForType(t) {
    var p = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
    if (t === 'sos') return p + '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v5M12 17.6v.1"/></svg>';
    if (t === 'location') return p + '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
    if (t === 'sale' || t === 'purchase' || t === 'recharge' || t === 'topup') return p + '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/></svg>';
    return p + '<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
  }
  function showBanner(n) {
    var el = document.getElementById('cn-inapp-notif');
    if (!el) {
      el = document.createElement('button');
      el.id = 'cn-inapp-notif'; el.type = 'button';
      el.addEventListener('click', function (ev) {
        if (ev.target && ev.target.classList && ev.target.classList.contains('nx')) { hideBanner(); return; }
        hideBanner();
        try { if (typeof openNotifPanel === 'function') openNotifPanel(); } catch (e) { /* ignore */ }
      });
      document.body.appendChild(el);
    }
    var title = n.title || tx('newn'), body = n.body || n.message || n.text || '';
    el.innerHTML = '<span class="ni">' + iconForType(n.type) + '</span><span style="flex:1;min-width:0"><b>' + esc(title) + '</b>' + (body ? '<span class="nb">' + esc(String(body).slice(0, 140)) + '</span>' : '') + '</span><span class="nx" role="button" aria-label="' + esc(tx('close')) + '" style="display:flex;align-items:center;justify-content:center">✕</span>';
    requestAnimationFrame(function () { el.classList.add('on'); });
    document.body.classList.add('cn-banner-on');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(hideBanner, 6500);
    try { if (navigator.vibrate) navigator.vibrate([14, 40, 14]); } catch (e) { /* ignore */ }
  }
  function hideBanner() { var el = document.getElementById('cn-inapp-notif'); if (el) el.classList.remove('on'); document.body.classList.remove('cn-banner-on'); clearTimeout(bannerTimer); }
  function checkNewNotifs() {
    var cache; try { cache = (typeof notifCache !== 'undefined') ? notifCache : null; } catch (e) { cache = null; }
    if (!cache) return;
    var ids = {}; cache.forEach(function (n) { ids[n.id] = n; });
    if (seen === null) { seen = {}; Object.keys(ids).forEach(function (k) { seen[k] = 1; }); return; } // 1re lecture = historique, pas de bandeau
    cache.forEach(function (n) {
      if (seen[n.id]) return; seen[n.id] = 1;
      if (n.read) return;
      if (document.visibilityState !== 'visible') return;
      showBanner(n);
    });
  }
  var origBadge = window.updateNotifBadge;
  if (typeof origBadge === 'function') {
    window.updateNotifBadge = function () { var r = origBadge.apply(this, arguments); try { checkNewNotifs(); } catch (e) { /* ignore */ } return r; };
  }
  var origStop = window.stopNotifWatch;
  if (typeof origStop === 'function') window.stopNotifWatch = function () { seen = null; hideBanner(); return origStop.apply(this, arguments); };

  /* ---------- 3. Premier accueil : un choix, pas un tutoriel imposé de 17 étapes ---------- */
  var SEEN_KEY = 'coeurnohboost_tutorial_seen', manual = false;
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('#help-shortcut-btn, [onclick*="openTutorial"]') : null;
    if (t) { manual = true; setTimeout(function () { manual = false; }, 500); }
  }, true);
  function isSeen() { try { return !!localStorage.getItem(SEEN_KEY); } catch (e) { return true; } }
  function markSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ } }
  // Ouverture par un lien précis (notification, espace du site, partage) : on va droit au but, sans l'écran d'accueil.
  var DEEP = /[?&](mysite|open|openTab|profile|leads|panel|product|contest|biz|espace)=/.test(location.search);
  var origTour = window.openTutorial;
  function closeWelcome() { var w = document.getElementById('cn-welcome'); if (w) { w.classList.remove('on'); setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 400); } }
  function showWelcome() {
    if (document.getElementById('cn-welcome')) return;
    var w = document.createElement('div');
    w.id = 'cn-welcome'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
    w.innerHTML = '<div class="cw"><div class="cw-top"><img src="icon-512-v2.png" alt="" width="50" height="50"><h2>' + esc(tx('hi')) + '</h2></div>' +
      '<ul><li><i>' + (window.cnIcon ? window.cnIcon('spark', 18) : '') + '</i><span>' + esc(tx('b1')) + '</span></li><li><i>' + (window.cnIcon ? window.cnIcon('wallet', 18) : '') + '</i><span>' + esc(tx('b2')) + '</span></li><li><i>' + (window.cnIcon ? window.cnIcon('cart', 18) : '') + '</i><span>' + esc(tx('b3')) + '</span></li></ul>' +
      '<div class="cw-acts"><button type="button" class="cw-go">' + esc(tx('go')) + '</button><button type="button" class="cw-later">' + esc(tx('later')) + '</button></div></div>';
    document.body.appendChild(w);
    w.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t === w || (t.classList && t.classList.contains('cw-later'))) { markSeen(); closeWelcome(); }
      else if (t.classList && t.classList.contains('cw-go')) { markSeen(); closeWelcome(); manual = true; try { origTour && origTour.call(window); } finally { manual = false; } }
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { w.classList.add('on'); }); });
  }
  if (typeof origTour === 'function') {
    window.openTutorial = function () {
      if (!manual && !isSeen()) { if (DEEP) return undefined; showWelcome(); return undefined; }
      return origTour.apply(this, arguments);
    };
  }

  /* ---------- 4. Filet de sécurité : une erreur isolée ne casse plus l'expérience en silence ---------- */
  var lastOops = 0;
  window.addEventListener('error', function (ev) {
    var tgt = ev.target;
    if (tgt && tgt !== window && tgt.tagName === 'IMG') { // image introuvable : jamais d'icône cassée
      tgt.classList.add('cn-img-fail'); tgt.removeAttribute('alt'); return;
    }
    var msg = String(ev.message || '');
    if (!msg || /ResizeObserver|Script error|Non-Error promise rejection/i.test(msg)) return;
    var file = String(ev.filename || '');
    if (file && file.indexOf(location.origin) !== 0) return; // erreurs d'extensions / scripts tiers : ignorées
    try { console.warn('[cn] erreur interceptée :', msg, file + ':' + ev.lineno); } catch (e) { /* ignore */ }
    report(msg, file, ev.lineno);
    var now = Date.now();
    if (now - lastOops > 15000) { lastOops = now; try { window.showToast(tx('oops'), 'error'); } catch (e) { /* ignore */ } }
  }, true);
  window.addEventListener('unhandledrejection', function (ev) {
    try { console.warn('[cn] promesse rejetée :', ev.reason && (ev.reason.message || ev.reason.code || ev.reason)); } catch (e) { /* ignore */ }
  });

  /* ---------- 4 bis. Ambiance vidéo (accueil et connexion) + logo en filigrane ---------- */
  function videoAllowed() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return false;
    } catch (e) { /* ignore */ }
    return true;
  }
  function safePlay(v) { try { var p = v.play(); if (p && p.catch) p.catch(function () { /* lecture auto refusée : l'image fixe reste */ }); } catch (e) { /* ignore */ } }
  function mountVideo(host, base) {
    if (!host || host.querySelector('.cn-bgvideo')) return;
    var wm = document.createElement('div'); wm.className = 'cn-watermark'; wm.setAttribute('aria-hidden', 'true');
    host.insertBefore(wm, host.firstChild);
    if (!videoAllowed()) return;
    var v = document.createElement('video');
    v.className = 'cn-bgvideo'; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto'; v.tabIndex = -1; v.disablePictureInPicture = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.poster = base + '-poster.jpg';
    v.innerHTML = '<source src="' + base + '.mp4" type="video/mp4"><source src="' + base + '.webm" type="video/webm">';
    v.addEventListener('playing', function () { v.classList.add('on'); });
    // Seule l'erreur de la vidéo elle-même compte (toutes les sources ont échoué) : une source non lue (ex. MP4) laisse la suivante (WebM) essayer.
    v.addEventListener('error', function (ev) { if (ev.target === v && v.parentNode) v.parentNode.removeChild(v); });
    host.insertBefore(v, host.firstChild);
    safePlay(v);
    // Batterie et données : pause dès que le bloc n'est plus visible ou que l'onglet est caché
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) safePlay(v); else v.pause(); }); }, { threshold: 0.01 }).observe(host);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) v.pause(); else if (host.offsetParent !== null) safePlay(v); });
  }
  var origOpenAuth = window.openAuth;
  if (typeof origOpenAuth === 'function') {
    window.openAuth = function () {
      var r = origOpenAuth.apply(this, arguments);
      return r;
    };
  }
  function mountHome() { try { mountVideo(document.querySelector('.hero'), 'intro-light'); } catch (e) { /* ignore */ } }

  /* ---------- 4 ter. Journal d'erreurs : les erreurs réelles des utilisateurs connectés sont consignées (30 jours) ---------- */
  var errSent = 0, errSeen = {};
  function report(msg, file, line) {
    try {
      if (errSent >= 3) return;
      var u = (typeof currentUser !== 'undefined') ? currentUser : null;
      if (!u || !u.uid || typeof db === 'undefined' || typeof firebase === 'undefined') return;
      var key = String(msg).slice(0, 120) + '|' + file + '|' + line; if (errSeen[key]) return; errSeen[key] = 1; errSent++;
      var now = Date.now();
      db.collection('client_errors').add({
        uid: u.uid, msg: String(msg).slice(0, 300), file: String(file || '').replace(location.origin, '').slice(0, 120), line: (line | 0),
        page: location.pathname.slice(0, 80), ua: (navigator.userAgent || '').slice(0, 140), v: 'p2', at: now,
        expireAt: firebase.firestore.Timestamp.fromMillis(now + 30 * 86400000)
      }).catch(function () { /* silencieux */ });
    } catch (e) { /* ignore */ }
  }

  /* ---------- 5. Confort : images différées, ombre d'en-tête au défilement ---------- */
  function tuneImages(root) {
    var imgs = (root || document).querySelectorAll ? (root || document).querySelectorAll('img') : [];
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (!im.hasAttribute('decoding')) im.decoding = 'async';
      if (!im.hasAttribute('loading') && !im.closest('#nav, #app-splash, .auth-brand, #cn-welcome')) im.loading = 'lazy';
    }
  }
  // Le nom « Coeurnoh » s'adapte à la largeur disponible (toutes polices, tous écrans) au lieu d'être coupé.
  // Logo : on garde le plus de marque possible. Ordre : icône + nom ▸ nom seul ▸ icône seule
  // (l'icône contient déjà « COEURNOH UNIVERSE »). Jamais de nom coupé, quelle que soit la police.
  function fitLogo() {
    try {
      var b = document.querySelector('#nav .logo b'), lg = b && b.parentNode;
      if (!b || document.body.classList.contains('app-mode')) return;
      lg.classList.remove('cn-no-mark', 'cn-icon-only'); lg.style.fontSize = '';
      function over() { return b.scrollWidth > b.clientWidth + 1; }
      function shrink(min) { var s = parseFloat(getComputedStyle(lg).fontSize), n = 0; while (over() && s > min && n++ < 30) { s -= 0.5; lg.style.fontSize = s + 'px'; } return !over(); }
      if (shrink(14.5)) return;
      lg.classList.add('cn-no-mark'); lg.style.fontSize = '';
      if (shrink(13.5)) return;
      lg.classList.remove('cn-no-mark'); lg.classList.add('cn-icon-only'); lg.style.fontSize = '';
    } catch (e) { /* ignore */ }
  }
  var fitTimer = null;
  function onReady() {
    fitLogo();
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 700); };
    setTimeout(function () { idle(mountHome); }, 900);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLogo);
    window.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitLogo, 120); });
    window.addEventListener('orientationchange', function () { setTimeout(fitLogo, 250); });
    tuneImages(document);
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) { m.addedNodes && m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.tagName === 'IMG') tuneImages({ querySelectorAll: function () { return [n]; } }); else tuneImages(n); } }); });
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* ignore */ }
    var nav = document.getElementById('nav');
    if (nav) {
      var on = false;
      window.addEventListener('scroll', function () { var s = window.scrollY > 6; if (s !== on) { on = s; nav.classList.toggle('cn-scrolled', s); } }, { passive: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
})();


/* ===== Interface sans emoji décoratifs =====
   1) Les messages courts (toasts) perdent les emoji décoratifs en début/fin de texte.
   2) Les pastilles des champs « fichier » deviennent de vraies icônes vectorielles,
      y compris celles créées plus tard par les formulaires. */
(function () {
  'use strict';
  var DECOR = '\\u2705\\u2713\\u2714\\u26A0\\u274C\\u2728\\u2139\\u2795\\u{1F389}\\u{1F525}\\u{1F680}\\u{1F44B}\\u{1F4A1}\\u{1F4E9}\\u{1F4DA}\\u{1F4B3}\\u{1F381}\\u{1F514}\\u{1F4C5}\\u{1F6CD}\\u{1F4D6}\\u{1F5BC}\\u{1F4F7}\\u{1F4C4}\\u{1F4CE}\\u{1F50E}\\u{1F50D}\\u{1F4BC}\\u{1F393}\\u{1F4E6}';
  var LEAD = new RegExp('^[\\s\\uFE0F]*[' + DECOR + ']+[\\uFE0F\\s]*', 'u');
  var TRAIL = new RegExp('[\\s\\uFE0F]*[' + DECOR + ']+[\\uFE0F\\s]*$', 'u');
  function clean(m) {
    if (typeof m !== 'string') return m;
    var r = m.replace(LEAD, '').replace(TRAIL, '');
    return r || m;
  }
  var orig = window.showToast;
  if (typeof orig === 'function' && !orig.__cnClean) {
    var wrapped = function (m, t) { return orig.call(this, clean(m), t); };
    wrapped.__cnClean = true;
    window.showToast = wrapped;
  }

  var MAP = { '\u2705': 'check', '\u2713': 'check', '\u2714': 'check', '\u{1F5BC}': 'image', '\u{1F4C4}': 'file', '\u{1F4F7}': 'camera', '\u{1F4CE}': 'paperclip', '\u{1F3A5}': 'video' };
  function icon(name) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  var queued = false;
  function fix() {
    queued = false;
    var list = document.querySelectorAll('.file-picker-icon');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.firstElementChild) continue;
      var t = (el.textContent || '').replace(/\uFE0F/g, '').trim();
      if (MAP[t]) el.innerHTML = icon(MAP[t]);
    }
  }
  function queue() { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(fix); } }
  try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) { /* ignore */ }
  queue();
})();
/* ===== Icônes vectorielles professionnelles (v-pro24) =====
   window.cnIcon(nom, taille) : renvoie un SVG. Un balayeur remplace aussi les emoji
   décoratifs de l'interface (boutons, titres, tuiles) par ces icônes. */
(function () {
  'use strict';
  if (window.cnIcon) return;
  var P = {
    news: '<path d="M4 4h13v16H6a2 2 0 0 1-2-2V4zM17 8h3v10a2 2 0 0 1-2 2h-1M8 8h5M8 12h5M8 16h3"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9l4-6zM2 9h20M9 3l3 6 3-6M12 21L9 9M12 21l3-12"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .8 3 2.5 3 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    handshake: '<path d="M3 12l4-4 4 2 3-2 4 3 3-1M7 8l-4 4 6 6 2-1M21 12l-6 6-3-2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 0 2 2h13"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    alert: '<path d="M12 3l10 18H2L12 3zM12 10v5M12 18h.01"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-12 7l-5 1 1.5-4.5A8 8 0 1 1 21 12z"/>',
    check: '<path d="M5 12.5l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
    megaphone: '<path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chart: '<path d="M3 20h18M6 20v-6M11 20V9M16 20v-9M21 20V5"/>',
    cart: '<path d="M3 4h2l2.5 11h10L20 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    building: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2M13 9h2M9 13h2M13 13h2M9 17h6"/>',
    store: '<path d="M4 9l1-5h14l1 5M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M5 12v8h14v-8"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6"/>',
    bug: '<rect x="8" y="8" width="8" height="11" rx="4"/><path d="M12 8V5M5 12h3M16 12h3M6 18l2-2M18 18l-2-2M8 6l2 2M16 6l-2 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    spark: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3zM18 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    clip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.3.2-2.5 1.5-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    dot: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
    trend: '<path d="M3 17l6-6 4 4 8-9M15 6h6v6"/>',
    undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
    heart: '<path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>'
  };
  window.cnIcon = function (name, size) {
    var s = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.dot) + '</svg>';
  };
  var M = {
    '📰': 'news', '🗂': 'folder', '🖼': 'image', '💎': 'gem', '👥': 'users', '👤': 'user', '🤝': 'handshake', '🕓': 'clock', '🕒': 'clock', '🕐': 'clock',
    '🏷': 'tag', '📅': 'calendar', '📬': 'mail', '✉': 'mail', '📩': 'mail', '🔌': 'plug', '📋': 'copy', '♻': 'refresh', '🔁': 'refresh', '🗑': 'trash',
    '📘': 'book', '📖': 'book', '📚': 'book', '🔒': 'lock', '⚠': 'alert', '📞': 'phone', '📱': 'phone', '💬': 'chat', '✓': 'check', '✔': 'check', '✅': 'check',
    '❌': 'x', '✕': 'x', '📥': 'download', '⬇': 'download', '📄': 'doc', '📷': 'camera', '📸': 'camera', '🎬': 'video', '🎥': 'video', '📢': 'megaphone',
    '💾': 'save', '➕': 'plus', '📊': 'chart', '🛒': 'cart', '🛍': 'cart', '💰': 'wallet', '💵': 'wallet', '💸': 'wallet', '💳': 'wallet', '🌐': 'globe',
    '🖥': 'monitor', '🏢': 'building', '🏪': 'store', '🚩': 'flag', '🤖': 'bot', '🐞': 'bug', '🔍': 'search', '🔎': 'search', '🧭': 'compass', '🏠': 'home',
    '📦': 'box', '🎯': 'target', '✨': 'spark', '📍': 'pin', '🎵': 'music', '🔊': 'volume', '📎': 'clip', '🏅': 'award', '🥇': 'award', '🥈': 'award', '🥉': 'award',
    '🎨': 'palette', '👁': 'eye', '🔴': 'dot', '🟢': 'dot', '💹': 'trend', '↩': 'undo', '💄': 'spark', '👗': 'store', '🎉': 'spark', '📚️': 'book'
  };
  var keys = Object.keys(M).sort(function (a, b) { return b.length - a.length; });
  var RE = new RegExp('^[\\s\\uFE0F]*(' + keys.join('|') + ')\\uFE0F?[\\s\\uFE0F]*', 'u');
  var RE_END = new RegExp('[\\s\\uFE0F]*(' + keys.join('|') + ')\\uFE0F?[\\s\\uFE0F]*$', 'u');
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|CODE|PRE|SVG|TITLE)$/;
  var queued = false;
  function fixNode(n) {
    var p = n.parentNode; if (!p || SKIP.test(p.nodeName)) return;
    if (p.isContentEditable || (p.closest && p.closest('[data-keep-emoji],textarea,[contenteditable="true"],svg'))) return;
    var v = n.nodeValue; if (!v || v.length > 120) return;
    var m = v.match(RE);
    if (m) {
      var span = document.createElement('span'); span.className = 'ico-i'; span.innerHTML = window.cnIcon(M[m[1]], 18);
      p.insertBefore(span, n); n.nodeValue = v.slice(m[0].length); return;
    }
    m = v.match(RE_END);
    if (m && v.length - m[0].length > 0) {
      var s2 = document.createElement('span'); s2.className = 'ico-i ico-i-end'; s2.innerHTML = window.cnIcon(M[m[1]], 18);
      n.nodeValue = v.slice(0, v.length - m[0].length);
      p.insertBefore(s2, n.nextSibling);
    }
  }
  function sweep() {
    queued = false;
    if (!document.body) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) { if (n.nodeValue && n.nodeValue.length < 120 && /[^\x00- ]/.test(n.nodeValue)) list.push(n); }
    for (var i = 0; i < list.length; i++) { try { fixNode(list[i]); } catch (e) { /* ignore */ } }
    // options de listes : on retire seulement l'emoji décoratif
    var opts = document.querySelectorAll('option');
    for (var j = 0; j < opts.length; j++) { var t = opts[j].textContent; var m2 = t.match(RE); if (m2 && t.length > m2[0].length) opts[j].textContent = t.slice(m2[0].length); }
  }
  function queue() { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(sweep); } }
  function start() { try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) { /* ignore */ } queue(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
