/* Coeurnoh Universe — Accessibilité : donne un nom lisible aux boutons, champs et images qui n'en ont pas
   (lecteurs d'écran, commande vocale), annonce les messages (toasts), rend le focus clavier visible et
   respecte « réduire les animations ». Ne change ni la mise en page ni les couleurs. */
(function () {
  'use strict';
  if (window.__cnA11y) return; window.__cnA11y = true;

  // Texte lisible déduit d'une icône (<use href="#i-xxx">), puis d'un mot-clé de la classe ou de l'identifiant.
  var ICON = { close: 'Fermer', x: 'Fermer', back: 'Retour', arrow: 'Retour', search: 'Rechercher', menu: 'Menu', share: 'Partager', trash: 'Supprimer', delete: 'Supprimer', edit: 'Modifier', plus: 'Ajouter', minus: 'Retirer', download: 'Télécharger', copy: 'Copier', bell: 'Notifications', heart: 'J’aime', star: 'Favori', bookmark: 'Enregistrer', filter: 'Filtrer', settings: 'Réglages', user: 'Profil', home: 'Accueil', cart: 'Panier', camera: 'Prendre une photo', image: 'Choisir une image', send: 'Envoyer', check: 'Valider', refresh: 'Actualiser', more: 'Plus d’options', play: 'Lecture', pause: 'Pause', eye: 'Afficher', lock: 'Verrouillé', sun: 'Mode clair', moon: 'Mode sombre', locate: 'Ma position', pin: 'Lieu', link: 'Lien', mail: 'E-mail', message: 'Message', chat: 'Discussion' };
  var KEYWORDS = [[/close|fermer|dismiss/i, 'Fermer'], [/back|retour|prev/i, 'Retour'], [/search|recherch/i, 'Rechercher'], [/menu|burger/i, 'Menu'], [/share|partag/i, 'Partager'], [/delete|remove|suppr|trash/i, 'Supprimer'], [/edit|modif/i, 'Modifier'], [/next|suiv/i, 'Suivant'], [/add|plus|ajout/i, 'Ajouter'], [/send|envoy/i, 'Envoyer'], [/copy|copier/i, 'Copier'], [/refresh|reload|actualis/i, 'Actualiser'], [/locate|gps|position/i, 'Ma position']];

  function nameFromIcon(el) {
    var u = el.querySelector && el.querySelector('use'); if (u) { var h = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace(/^#i-?/, '').toLowerCase(); if (ICON[h]) return ICON[h]; for (var k in ICON) if (h.indexOf(k) >= 0) return ICON[k]; }
    var hint = (el.className && el.className.baseVal === undefined ? el.className : '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('onclick') || '') + ' ' + (el.getAttribute('data-action') || '');
    for (var i = 0; i < KEYWORDS.length; i++) if (KEYWORDS[i][0].test(hint)) return KEYWORDS[i][1];
    var t = (el.textContent || '').trim(); if (/^[×✕✖xX]$/.test(t)) return 'Fermer'; if (/^[‹‹←<]$/.test(t)) return 'Retour'; if (/^[›→>]$/.test(t)) return 'Suivant'; if (/^[+＋]$/.test(t)) return 'Ajouter';
    return '';
  }
  function hasText(el) { return !!(el.textContent || '').replace(/[\s​]+/g, ''); }

  function fix(root) {
    var q = root.querySelectorAll ? root : document, n = 0;
    q.querySelectorAll('button:not([aria-label]):not([aria-labelledby]), [role="button"]:not([aria-label]):not([aria-labelledby])').forEach(function (b) {
      if (hasText(b) || b.title) return; var nm = nameFromIcon(b); if (nm) { b.setAttribute('aria-label', nm); n++; }
    });
    q.querySelectorAll('a[href]:not([aria-label])').forEach(function (a) { if (hasText(a) || a.title || a.querySelector('img[alt]:not([alt=""])')) return; var nm = nameFromIcon(a); if (nm) a.setAttribute('aria-label', nm); });
    q.querySelectorAll('input:not([type=hidden]):not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]), select:not([aria-label])').forEach(function (i) {
      if (i.id && document.querySelector('label[for="' + i.id.replace(/"/g, '') + '"]')) return; if (i.closest('label')) return;
      var nm = i.getAttribute('placeholder') || i.title || ''; if (!nm && i.type === 'search') nm = 'Rechercher'; if (!nm && i.type === 'file') nm = 'Choisir un fichier'; if (nm) i.setAttribute('aria-label', nm);
    });
    q.querySelectorAll('img:not([alt])').forEach(function (im) { im.setAttribute('alt', im.title || ''); });
    q.querySelectorAll('svg:not([aria-hidden]):not([role])').forEach(function (s) { if (!s.querySelector('title')) s.setAttribute('aria-hidden', 'true'); });
    return n;
  }
  var st = document.createElement('style');
  st.textContent = ':focus-visible{outline:3px solid #1b4fd8;outline-offset:2px}button:focus:not(:focus-visible),a:focus:not(:focus-visible){outline:none}@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}';
  document.head.appendChild(st);

  function live() { var t = document.getElementById('toast-container'); if (t && !t.getAttribute('aria-live')) { t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); t.setAttribute('aria-atomic', 'true'); } }
  var timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { try { fix(document); live(); } catch (e) { /* ignore */ } }, 400); }
  try { new MutationObserver(function (recs) { for (var i = 0; i < recs.length; i++) if (recs[i].addedNodes && recs[i].addedNodes.length) { schedule(); return; } }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
  document.documentElement.lang || document.documentElement.setAttribute('lang', 'fr');
  schedule();
  window.CNA11y = { fix: fix, nameFromIcon: nameFromIcon };
})();
