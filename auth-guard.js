/* =====================================================================
   auth-guard.js — Connexion plus stable (Coeurnoh Universe)
   Chargé par menu-pro.js APRÈS script.js. N'écrase rien : il enveloppe
   les fonctions existantes (signInWithGoogle, translateAuthError, openAuth).

   Problèmes réglés :
   1. Google REFUSE la connexion dans les mini-navigateurs de TikTok,
      Instagram, Facebook, Messenger, Snapchat… (et dans les WebView).
      → on le détecte, on explique et on propose d'ouvrir Chrome/Safari.
      L'email + mot de passe reste possible partout.
   2. Double-clic sur « Continuer avec Google » (fenêtre qui se ferme).
   3. Messages d'erreur clairs et utiles pour chaque cas.
   4. Lien conservé : après connexion, la personne retombe sur la page
      du lien qu'elle avait ouvert (voir menu-pro.js).
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnAuthGuard) return;
  window.__cnAuthGuard = true;

  var ua = navigator.userAgent || '';

  function inAppKind() {
    if (/FBAN|FBAV|FB_IAB|FBIOS|Instagram|TikTok|musical_ly|Bytedance|Snapchat|MicroMessenger|Line\/|Twitter|LinkedInApp|Pinterest/i.test(ua)) return 'social';
    if (/Android/i.test(ua) && /; wv\)/.test(ua)) return 'webview';
    if (/iPhone|iPad|iPod/i.test(ua) && navigator.standalone === true) return 'ios-app';
    return '';
  }
  var KIND = inAppKind();

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) { try { if (typeof showToast === 'function') showToast(msg, 'success'); } catch (e) { /* ignore */ } }

  /* ---------- 1. Messages d'erreur ---------- */
  var MSG = {
    'auth/popup-closed-by-user': "Connexion Google annulée. Réessaie, ou connecte-toi avec ton email et ton mot de passe juste en dessous.",
    'auth/popup-blocked': "Ton navigateur a bloqué la fenêtre Google. Autorise les pop-ups pour ce site, ou connecte-toi avec ton email.",
    'auth/cancelled-popup-request': "Connexion déjà en cours… patiente un instant.",
    'auth/operation-not-supported-in-this-environment': "Google n'est pas disponible dans ce navigateur intégré. Ouvre l'application dans Chrome ou Safari, ou utilise ton email.",
    'auth/web-storage-unsupported': "Ton navigateur bloque le stockage nécessaire à la connexion (mode privé ou cookies bloqués). Ouvre l'application dans Chrome ou Safari, ou utilise ton email.",
    'auth/account-exists-with-different-credential': "Un compte existe déjà avec cet email. Connecte-toi avec ton mot de passe.",
    'auth/user-disabled': "Ce compte a été désactivé. Contacte le support.",
    'auth/internal-error': "Le service de connexion a eu un souci temporaire. Réessaie dans un instant.",
    'auth/timeout': "La connexion a pris trop de temps. Vérifie ton réseau puis réessaie.",
    'auth/invalid-login-credentials': "Email ou mot de passe incorrect. Si tu t'es inscrit avec Google, utilise « Continuer avec Google » ; sinon touche « Mot de passe oublié ».",
    'auth/invalid-credential': "Email ou mot de passe incorrect. Si tu t'es inscrit avec Google, utilise « Continuer avec Google » ; sinon touche « Mot de passe oublié ».",
    'auth/wrong-password': "Mot de passe incorrect. Touche « Mot de passe oublié » pour le changer.",
    'auth/operation-not-allowed': "Ce mode de connexion n'est pas activé (contacte l'admin).",
    'auth/missing-password': "Entre ton mot de passe.",
    'auth/missing-email': "Entre ton email.",
    'auth/network-request-failed': "Pas de connexion internet stable. Vérifie ton réseau puis réessaie."
  };
  var origTranslate = window.translateAuthError;
  window.translateAuthError = function (e) {
    var c = (e && e.code) || '';
    if (MSG[c]) return MSG[c];
    if (typeof origTranslate === 'function') return origTranslate(e);
    return (e && e.message) || 'Une erreur est survenue.';
  };

  /* ---------- 2. Google : un seul essai à la fois, hors-ligne détecté ---------- */
  var busy = false, busyTimer = null;
  var origGoogle = window.signInWithGoogle;
  if (typeof origGoogle === 'function') {
    window.signInWithGoogle = function () {
      if (busy) return undefined;
      if (navigator.onLine === false) {
        try { showAuthError(MSG['auth/network-request-failed']); } catch (e) { /* ignore */ }
        return undefined;
      }
      busy = true;
      clearTimeout(busyTimer); busyTimer = setTimeout(function () { busy = false; }, 60000);
      var done = function () { busy = false; clearTimeout(busyTimer); };
      var p;
      try { p = origGoogle.apply(this, arguments); } catch (e) { done(); throw e; }
      Promise.resolve(p).then(done, done);
      return p;
    };
  }

  /* ---------- 3. Avertissement « navigateur intégré » ---------- */
  function currentUrl() { return window.location.href; }
  function copyLink() {
    var url = currentUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast('Lien copié ! Colle-le dans Chrome ou Safari.'); }, function () { window.prompt('Copie ce lien :', url); });
    } else window.prompt('Copie ce lien :', url);
  }
  function openInBrowser() {
    var url = currentUrl();
    if (/Android/i.test(ua)) {
      try {
        var u = new URL(url);
        window.location.href = 'intent://' + u.host + u.pathname + u.search + u.hash +
          '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
        return;
      } catch (e) { /* ignore */ }
    }
    copyLink();
  }
  function noticeText() {
    if (KIND === 'ios-app') return "Sur iPhone, dans l'application installée, la connexion Google peut échouer. Utilise ton email et ton mot de passe, ou ouvre le site dans Safari.";
    return "Tu es dans le navigateur intégré d'une application (TikTok, Instagram, Facebook…). Google refuse la connexion ici. Ouvre dans Chrome / Safari, ou connecte-toi avec ton email juste en dessous.";
  }
  function renderNotice() {
    if (!KIND) return;
    var anchor = document.getElementById('google-btn');
    if (!anchor || document.getElementById('cn-inapp-notice')) return;
    var box = document.createElement('div');
    box.id = 'cn-inapp-notice';
    box.setAttribute('role', 'note');
    box.style.cssText = 'background:#fff4e6;color:#8a4b00;border:1px solid #ffd8a8;border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:.86rem;line-height:1.45';
    box.innerHTML = '<div style="font-weight:800;margin-bottom:4px">⚠️ Connexion Google limitée ici</div><div>' + esc(noticeText()) + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      (KIND === 'ios-app' ? '' : '<button type="button" data-cn="open" style="border:0;border-radius:10px;padding:9px 14px;font:inherit;font-weight:800;background:#e8590c;color:#fff;cursor:pointer">Ouvrir dans le navigateur</button>') +
      '<button type="button" data-cn="copy" style="border:1px solid #ffd8a8;border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;background:#fff;color:#8a4b00;cursor:pointer">Copier le lien</button></div>';
    box.addEventListener('click', function (ev) {
      var k = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-cn');
      if (k === 'open') openInBrowser(); else if (k === 'copy') copyLink();
    });
    anchor.parentNode.insertBefore(box, anchor);
  }
  var origOpenAuth = window.openAuth;
  if (typeof origOpenAuth === 'function') {
    window.openAuth = function () {
      var r = origOpenAuth.apply(this, arguments);
      try { renderNotice(); } catch (e) { /* ignore */ }
      return r;
    };
  }

  /* ---------- 3 bis. Auto-réparation du compte ----------
     Si l'inscription a été interrompue (réseau coupé, fenêtre fermée) juste après la
     création du compte de connexion, le document « users » peut manquer : la personne
     est connectée mais l'app se comporte comme cassée. On le recrée une fois, sans rien écraser. */
  var healed = {};
  function healAccount(user) {
    try {
      if (!user || healed[user.uid] || typeof firebase === 'undefined' || !firebase.firestore) return;
      healed[user.uid] = true;
      setTimeout(function () {
        var dbx = firebase.firestore();
        dbx.collection('users').doc(user.uid).get().then(function (s) {
          if (s.exists) return null;
          var name = user.displayName || (user.email ? user.email.split('@')[0] : 'Membre');
          var ref = null; try { ref = new URLSearchParams(location.search).get('ref') || null; } catch (e) { /* ignore */ }
          return dbx.collection('users').doc(user.uid).set({
            name: name, email: user.email || '', photoURL: user.photoURL || null, balance: 0, referredBy: ref, createdAt: new Date().toISOString()
          }).then(function () {
            try { if (typeof syncPublicProfile === 'function') syncPublicProfile(user.uid, { name: name, photoURL: user.photoURL || null, verified: false, referredBy: ref }); } catch (e) { /* ignore */ }
          });
        }).catch(function () { /* au prochain démarrage */ });
      }, 5000);
    } catch (e) { /* ignore */ }
  }
  try {
    if (typeof firebase !== 'undefined' && firebase.auth) firebase.auth().onAuthStateChanged(function (u) { if (u) healAccount(u); });
  } catch (e) { /* ignore */ }

  /* ---------- 4. Note de contexte (« Connecte-toi pour voir… ») ---------- */
  window.CnAuthGuard = {
    kind: KIND,
    // Affiche un message en haut de la fenêtre de connexion (utilisé pour les liens partagés)
    setContextNote: function (text) {
      var anchor = document.getElementById('google-btn');
      if (!anchor) return;
      var el = document.getElementById('cn-auth-context');
      if (!el) {
        el = document.createElement('div');
        el.id = 'cn-auth-context';
        el.style.cssText = 'background:#e7f5ff;color:#0b4a78;border-radius:12px;padding:11px 14px;margin:0 0 12px;font-size:.88rem;font-weight:700;line-height:1.4';
        anchor.parentNode.insertBefore(el, anchor);
      }
      el.textContent = text;
    },
    clearContextNote: function () { var el = document.getElementById('cn-auth-context'); if (el) el.remove(); }
  };
})();
