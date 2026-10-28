/* =====================================================================
   pay-guard.js — ANCIEN garde-fou « pays non couvert » du Mobile Money.
   Il n'est plus chargé : le Mobile Money passe maintenant par SasPay, une seule page de
   paiement où la personne choisit elle-même son pays et son opérateur (voir script.js,
   section « Mobile Money »). Il n'y a donc plus de message « pays non couvert » ni de renvoi
   forcé vers la crypto ou la carte. Ce fichier ne fait plus rien et peut être supprimé du dépôt.
   ===================================================================== */
(function () {
  'use strict';
  try { var n = document.getElementById('cn-pay-notice'); if (n && n.parentNode) n.parentNode.removeChild(n); } catch (e) { /* rien à nettoyer */ }
})();
