/* ui-harmony.js — unifie le style des icônes du menu et des services : fond teinté doux au lieu des dégradés lourds.
   Ne change aucune fonction : lit la couleur déjà définie sur chaque icône et la réutilise. Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnHarmony) return; window.__cnHarmony = true;
  var RE = /linear-gradient\([^,]*,\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]*\))/;
  function flat(el) {
    if (el.hasAttribute('data-flat')) return;
    var m = RE.exec(el.getAttribute('style') || '');
    if (!m) return;
    el.style.setProperty('--t', m[1]); el.style.background = ''; el.setAttribute('data-flat', '1');
  }
  function scan(root) { try { (root || document).querySelectorAll('.mp-ico:not([data-flat])').forEach(flat); } catch (e) { /* ignore */ } }
  var t = null;
  try { new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 60); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
  scan();
})();
