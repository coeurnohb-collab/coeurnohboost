/* =====================================================================
   app-check.js — Firebase App Check (reCAPTCHA v3), MODE SURVEILLANCE
   ---------------------------------------------------------------------
   Rôle : prouver à Firebase que les requêtes viennent bien de TON application
   (et pas d'un script pirate). Invisible pour les utilisateurs : aucune étape de
   connexion en plus.

   MODE SURVEILLANCE : tant que tu ne cliques pas sur « Appliquer » dans la console
   Firebase (App Check > Cloud Firestore), RIEN n'est bloqué. Tu observes seulement
   le pourcentage de requêtes valides. N'applique qu'après quelques jours à ~100 %.

   ► POUR ACTIVER : colle ta clé de site reCAPTCHA v3 (la clé PUBLIQUE) entre les
     guillemets ci-dessous. Tant que la ligne reste vide, ce fichier ne fait rien.
   ===================================================================== */
(function () {
  'use strict';
  var SITE_KEY = '6Ldx5eQtAAAAABG-gRrPLOQUW4lAM13K2J7TtFwM';   // ← ex. '6LcAbCdEf...' (clé de site reCAPTCHA v3, commence par 6L)

  window.cnInitAppCheck = function () {
    try {
      if (!SITE_KEY) return false;                                   // pas de clé = désactivé
      if (typeof firebase === 'undefined' || !firebase.appCheck) return false;
      var host = location.hostname;
      // Développement local uniquement : jeton de débogage (affiché dans la console du navigateur)
      if (host === 'localhost' || host === '127.0.0.1') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      firebase.appCheck().activate(SITE_KEY, true);                  // true = renouvellement automatique
      window.__cnAppCheck = true;
      // Le badge reCAPTCHA est masqué (la mention légale est dans le pied de page, comme Google l'autorise)
      var s = document.createElement('style');
      s.textContent = '.grecaptcha-badge{visibility:hidden!important}';
      document.head.appendChild(s);
      var legal = document.getElementById('cn-recaptcha-legal'); if (legal) legal.style.display = '';
      return true;
    } catch (e) {
      console.log('[appcheck] non activé :', e && e.message);
      return false;
    }
  };
})();
