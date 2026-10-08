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
    if (/iPhone|iPad|iPod/i.test(ua) && navigator.standalone === true) return proxied() ? '' : 'ios-app';
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
    'auth/too-many-requests': "Trop de tentatives. Par sécurité, patiente quelques minutes puis réessaie, ou utilise « Mot de passe oublié ».",
    'auth/network-request-failed': "Pas de connexion internet stable. Vérifie ton réseau puis réessaie.",
    'auth/unauthorized-domain': "Ce site n'est pas encore autorisé pour la connexion Google. Utilise ton email, ou contacte le support.",
    'auth/redirect-cancelled-by-user': "Connexion Google annulée. Touche « Continuer avec Google » pour réessayer.",
    'auth/redirect-operation-pending': "Connexion déjà en cours… patiente un instant."
  };
  var origTranslate = window.translateAuthError;
  window.translateAuthError = function (e) {
    var c = (e && e.code) || '';
    if (MSG[c]) return MSG[c];
    if (typeof origTranslate === 'function') return origTranslate(e);
    return (e && e.message) || 'Une erreur est survenue.';
  };

  /* ---------- 1 bis. Mot de passe solide à l'inscription (invisible pour la connexion) ----------
     8 caractères minimum, pas un mot de passe « classique », pas l'email. Aucune étape supplémentaire. */
  var COMMON = ['12345678', '123456789', '1234567890', 'password', 'password1', 'azerty123', 'azertyuiop', 'qwerty123', 'qwertyuiop', 'motdepasse', 'motdepasse1', '11111111', '00000000', 'abc12345', 'iloveyou', 'coeurnoh', 'coeurnoh1', 'coeurnoh123', 'admin123', 'welcome1', 'azerty12', '87654321', 'football', 'whatsapp'];
  var PW = {
    fr: { short: 'Choisis un mot de passe d\'au moins 8 caractères.', common: 'Ce mot de passe est trop courant. Choisis-en un plus personnel (lettres + chiffres).', email: 'Le mot de passe ne doit pas ressembler à ton email.', weak: 'Faible', ok: 'Correct', strong: 'Solide' },
    en: { short: 'Choose a password with at least 8 characters.', common: 'This password is too common. Pick a more personal one (letters + numbers).', email: 'The password should not look like your email.', weak: 'Weak', ok: 'Fair', strong: 'Strong' },
    es: { short: 'Elige una contraseña de al menos 8 caracteres.', common: 'Esta contraseña es demasiado común. Elige una más personal (letras + números).', email: 'La contraseña no debe parecerse a tu correo.', weak: 'Débil', ok: 'Correcta', strong: 'Sólida' },
    it: { short: 'Scegli una password di almeno 8 caratteri.', common: 'Questa password è troppo comune. Scegline una più personale (lettere + numeri).', email: 'La password non deve somigliare alla tua email.', weak: 'Debole', ok: 'Discreta', strong: 'Solida' },
    pt: { short: 'Escolha uma senha com pelo menos 8 caracteres.', common: 'Esta senha é muito comum. Escolha uma mais pessoal (letras + números).', email: 'A senha não deve parecer o seu email.', weak: 'Fraca', ok: 'Razoável', strong: 'Sólida' }
  };
  function pwL() { try { if (typeof currentLang !== 'undefined' && PW[currentLang]) return PW[currentLang]; } catch (e) { /* ignore */ } return PW.fr; }
  function pwProblem(pw, email) {
    var L = pwL(), p = String(pw || ''), local = String(email || '').split('@')[0].toLowerCase();
    if (p.length < 8) return L.short;
    if (COMMON.indexOf(p.toLowerCase()) >= 0 || /^(.)\1+$/.test(p) || /^\d+$/.test(p)) return L.common;
    if (local.length >= 4 && p.toLowerCase().indexOf(local) >= 0) return L.email;
    return '';
  }
  function pwScore(p) {
    var s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  function renderMeter() {
    var input = document.getElementById('auth-password'); if (!input) return;
    var reg = false; try { reg = (typeof authMode !== 'undefined' && authMode === 'register'); } catch (e) { /* ignore */ }
    var m = document.getElementById('cn-pw-meter');
    if (!reg || !input.value) { if (m) m.style.display = 'none'; return; }
    if (!m) {
      m = document.createElement('div'); m.id = 'cn-pw-meter'; m.setAttribute('aria-live', 'polite');
      m.style.cssText = 'margin:6px 2px 0;font-size:.78rem;font-weight:700;display:flex;align-items:center;gap:8px';
      var wrap = input.closest('.auth-input') || input.parentNode; wrap.parentNode.insertBefore(m, wrap.nextSibling);
    }
    var L = pwL(), sc = pwScore(input.value), lvl = sc <= 2 ? 0 : sc <= 3 ? 1 : 2, col = ['#e03131', '#f08c00', '#2f9e44'][lvl];
    m.style.display = 'flex';
    m.innerHTML = '<span style="flex:1;height:5px;border-radius:99px;background:#e6e9f0;overflow:hidden"><i style="display:block;height:100%;width:' + ((lvl + 1) * 33.3) + '%;background:' + col + ';transition:width .25s ease"></i></span><span style="color:' + col + '">' + [L.weak, L.ok, L.strong][lvl] + '</span>';
  }
  document.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'auth-password') renderMeter(); });
  // Le texte d'aide du champ annonce « 6 caractères min. » : à l'inscription on affiche la vraie règle (8).
  function syncPlaceholder() {
    var input = document.getElementById('auth-password'); if (!input) return;
    var reg = false; try { reg = (typeof authMode !== 'undefined' && authMode === 'register'); } catch (e) { /* ignore */ }
    if (!input.hasAttribute('data-ph0')) input.setAttribute('data-ph0', input.getAttribute('placeholder') || '');
    var base = input.getAttribute('data-ph0');
    input.setAttribute('placeholder', reg ? base.replace(/\b6\b/, '8') : base);
  }
  document.addEventListener('click', function (ev) { if (ev.target && ev.target.closest && ev.target.closest('#auth-modal')) setTimeout(function () { syncPlaceholder(); renderMeter(); }, 40); });
  var origSubmitAuth = window.submitAuth;
  if (typeof origSubmitAuth === 'function') {
    window.submitAuth = function () {
      try {
        var reg = (typeof authMode !== 'undefined' && authMode === 'register');
        if (reg) {
          var bad = pwProblem((document.getElementById('auth-password') || {}).value, (document.getElementById('auth-email') || {}).value);
          if (bad) { try { showAuthError(bad); } catch (e) { /* ignore */ } return undefined; }
        }
      } catch (e) { /* on laisse la fonction d'origine faire son travail */ }
      return origSubmitAuth.apply(this, arguments);
    };
  }

  /* ---------- 2. Google : fenêtre sur Android/ordinateur, REDIRECTION sur iPhone/iPad ----------
     Sur iPhone (Safari ou application installée), la petite fenêtre Google est bloquée ou fermée
     d'office. On passe donc par une redirection plein écran : la personne choisit son compte Google,
     puis revient dans l'application déjà connectée. Fonctionne avec n'importe quelle adresse liée
     à un compte Google (Gmail, iCloud, Outlook…). */
  var REDIR_KEY = 'cn_g_redirect_at';
  function proxied() { try { return firebase.app().options.authDomain === location.hostname; } catch (e) { return false; } }
  function isApple() { try { return !!IS_IOS_DEVICE; } catch (e) { return /iPad|iPhone|iPod/.test(ua); } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // Crée le profil la toute première fois (même contenu que l'inscription classique), sans rien écraser.
  function ensureUserDoc(user) {
    if (!user) return Promise.resolve();
    var dbx = firebase.firestore();
    var ref = dbx.collection('users').doc(user.uid);
    return ref.get().then(function (snap) {
      if (snap.exists) return null;
      var name = user.displayName || (user.email ? user.email.split('@')[0] : 'Membre');
      var refUid = null; try { refUid = getPendingReferrerUid(); } catch (e) { /* ignore */ }
      return ref.set({
        name: name, email: user.email || '', photoURL: user.photoURL || null, balance: 0, referredBy: refUid, createdAt: new Date().toISOString()
      }).then(function () {
        try { if (typeof syncPublicProfile === 'function') syncPublicProfile(user.uid, { name: name, photoURL: user.photoURL || null, verified: false, referredBy: refUid }); } catch (e) { /* ignore */ }
      });
    });
  }
  function finishOk() { try { if (typeof closeAuth === 'function') closeAuth(); } catch (e) { /* ignore */ } }
  function failMsg(e) {
    try { console.log('[auth] Google :', e && e.code, e && e.message); } catch (x) { /* ignore */ }
    try { showAuthError(window.translateAuthError(e)); } catch (x) { /* ignore */ }
  }

  var busy = false, busyTimer = null;
  window.signInWithGoogle = function () {
    if (busy) return undefined;
    if (navigator.onLine === false) {
      try { showAuthError(MSG['auth/network-request-failed']); } catch (e) { /* ignore */ }
      return undefined;
    }
    if (typeof firebase === 'undefined' || !firebase.auth) {
      try { showAuthError("Connexion au service indisponible. Vérifie ta connexion internet et réessaie."); } catch (e) { /* ignore */ }
      return undefined;
    }
    busy = true;
    clearTimeout(busyTimer); busyTimer = setTimeout(function () { busy = false; }, 60000);
    var done = function () { busy = false; clearTimeout(busyTimer); try { if (typeof setAuthLoading === 'function') setAuthLoading(false); } catch (e) { /* ignore */ } };
    try { if (typeof hideAuthError === 'function') hideAuthError(); } catch (e) { /* ignore */ }
    try { if (typeof setAuthLoading === 'function') setAuthLoading(true); } catch (e) { /* ignore */ }

    var a = firebase.auth();
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    function viaRedirect() {
      lsSet(REDIR_KEY, String(Date.now()));
      return a.signInWithRedirect(provider); // la page part chez Google puis revient ici
    }
    var p;
    try {
      if (isApple() && proxied()) p = viaRedirect();
      else p = a.signInWithPopup(provider).then(function (res) {
        return ensureUserDoc(res && res.user).then(finishOk);
      }).catch(function (e) {
        var c = e && e.code;
        if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') return viaRedirect();
        throw e;
      });
    } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).catch(function (e) { lsSet(REDIR_KEY, null); failMsg(e); }).then(done, done);
  };

  // Retour de chez Google (redirection) : on termine la connexion et on ferme la fenêtre.
  function handleRedirectReturn() {
    var at = parseInt(lsGet(REDIR_KEY) || '0', 10) || 0;
    if (!at) return;
    if (Date.now() - at > 10 * 60 * 1000) { lsSet(REDIR_KEY, null); return; }
    try {
      firebase.auth().getRedirectResult().then(function (res) {
        lsSet(REDIR_KEY, null);
        if (res && res.user) return ensureUserDoc(res.user).then(finishOk);
        return null;
      }).catch(function (e) {
        lsSet(REDIR_KEY, null);
        try { if (typeof openAuth === 'function') openAuth('login'); } catch (x) { /* ignore */ }
        failMsg(e);
      });
    } catch (e) { lsSet(REDIR_KEY, null); }
  }
  setTimeout(handleRedirectReturn, 0);

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
      try { setTimeout(syncPlaceholder, 40); } catch (e) { /* ignore */ }
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
