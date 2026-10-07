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
  var origTour = window.openTutorial;
  function closeWelcome() { var w = document.getElementById('cn-welcome'); if (w) { w.classList.remove('on'); setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 400); } }
  function showWelcome() {
    if (document.getElementById('cn-welcome')) return;
    var w = document.createElement('div');
    w.id = 'cn-welcome'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
    w.innerHTML = '<div class="cw"><div class="cw-top"><img src="icon-512-v2.png" alt="" width="50" height="50"><h2>' + esc(tx('hi')) + '</h2></div>' +
      '<ul><li><i>🚀</i><span>' + esc(tx('b1')) + '</span></li><li><i>💳</i><span>' + esc(tx('b2')) + '</span></li><li><i>🛍️</i><span>' + esc(tx('b3')) + '</span></li></ul>' +
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
      if (!manual && !isSeen()) { showWelcome(); return undefined; }
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
      try { mountVideo(document.querySelector('.auth-hero'), 'intro-dark'); } catch (e) { /* ignore */ }
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
