/* =====================================================================
   stability.js — Stabilité de l'application (Coeurnoh Universe)
   Chargé par auth-guard.js après script.js. N'écrase rien : il enveloppe
   des fonctions existantes et ne change aucune donnée.

   1. Aperçu du site : le bouton « retour » du téléphone ferme l'aperçu
      (avant, il pouvait faire sortir de l'application).
   2. Aperçu du site : chaque changement de modèle ne crée plus d'entrée
      dans l'historique du navigateur (sinon plusieurs « retour » étaient
      avalés, puis l'application se fermait).
   3. Bandeau « nouvelle notification » : se ferme toujours tout seul,
      même si le minuteur d'origine est retardé par le téléphone.
   4. Charge academy-pro.js (affiliation, codes promo, gains) et academy-studio.js
      (quiz, certificats, documents, packs, design de l'Académie).
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnStability) return;
  window.__cnStability = true;

  /* 1. Retour du téléphone = fermer l'aperçu */
  var origTop = window.closeTopmostOverlay;
  if (typeof origTop === 'function') {
    window.closeTopmostOverlay = function () {
      try {
        if (document.getElementById('site-preview-screen') && typeof window.closeSitePreview === 'function') {
          window.closeSitePreview();
          return true;
        }
      } catch (e) { /* on laisse la fonction d'origine faire son travail */ }
      return origTop.apply(this, arguments);
    };
  }

  /* 2. Aperçu : remplacer le cadre au lieu de le renaviguer */
  function patchFrame(ifr, initialUsed) {
    if (!ifr || ifr.__cnPatched) return;
    ifr.__cnPatched = true;
    var used = !!initialUsed;
    try {
      Object.defineProperty(ifr, 'srcdoc', {
        configurable: true,
        get: function () { return ifr.getAttribute('srcdoc') || ''; },
        set: function (v) {
          if (!used || !ifr.parentNode) { used = true; ifr.setAttribute('srcdoc', v); return; }
          var n = ifr.cloneNode(false);
          n.removeAttribute('srcdoc');
          ifr.parentNode.replaceChild(n, ifr);
          patchFrame(n, true);
          n.setAttribute('srcdoc', v);
        }
      });
    } catch (e) { /* si le navigateur refuse, l'aperçu fonctionne comme avant */ }
  }

  /* 3. Bandeau de notification : fermeture de secours */
  var bannerT = null, bannerWatched = false;
  function watchBanner(el) {
    if (bannerWatched || !el) return;
    bannerWatched = true;
    new MutationObserver(function () {
      if (el.classList.contains('on')) {
        clearTimeout(bannerT);
        bannerT = setTimeout(function () {
          el.classList.remove('on');
          document.body.classList.remove('cn-banner-on');
        }, 7500);
      }
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }


  /* 4. Académie : programme d'affiliation (fichier séparé, jamais bloquant) */
  try {
    if (!document.querySelector('script[data-cn-ap]')) {
      var ap = document.createElement('script');
      ap.src = 'academy-pro.js?v=20261014'; ap.async = true; ap.setAttribute('data-cn-ap', '1');
      document.head.appendChild(ap);
    }
    if (!document.querySelector('script[data-cn-as]')) {
      var as = document.createElement('script');
      as.src = 'academy-studio.js?v=20261014'; as.async = true; as.setAttribute('data-cn-as', '1');
      document.head.appendChild(as);
    }
  } catch (e) { /* ignore */ }

  function scan() {
    var f = document.getElementById('site-preview-iframe');
    if (f && !f.__cnPatched) patchFrame(f, false);
    var b = document.getElementById('cn-inapp-notif');
    if (b) watchBanner(b);
  }
  try {
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
  } catch (e) { /* ignore */ }
})();
