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

/* Icônes vivantes : entrée échelonnée, relief coloré, léger rebond au toucher. Respecte « réduire les animations ». */
(function () {
  'use strict';
  if (window.__cnHarmonyLive) return; window.__cnHarmonyLive = true;
  try {
    var st = document.createElement('style');
    st.textContent = [
      '.mp-ico[data-flat]{position:relative;transition:transform .22s cubic-bezier(.2,.9,.3,1.4),box-shadow .22s;box-shadow:0 6px 14px color-mix(in srgb,var(--t) 26%,transparent)!important}',
      '.mp-ico[data-flat]::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--t) 22%,transparent);pointer-events:none}',
      '.mp-ico[data-flat] svg{transition:transform .3s cubic-bezier(.2,.9,.3,1.4)}',
      '.mp-tile:active .mp-ico[data-flat],.mp-row:active .mp-ico[data-flat]{transform:scale(.9)}',
      '@media(hover:hover){.mp-tile:hover .mp-ico[data-flat]{transform:translateY(-3px) scale(1.06);box-shadow:0 12px 22px color-mix(in srgb,var(--t) 34%,transparent)!important}.mp-tile:hover .mp-ico[data-flat] svg{transform:rotate(-6deg) scale(1.08)}}',
      '.mp-ico[data-flat][data-live]{animation:cnIcoIn .5s cubic-bezier(.2,.9,.3,1.3) both;animation-delay:calc(var(--i,0)*45ms)}',
      '@keyframes cnIcoIn{from{opacity:0;transform:translateY(10px) scale(.7)}to{opacity:1;transform:none}}',
      '@keyframes cnIcoBreath{50%{transform:translateY(-2px)}}',
      '.mp-tile:first-child .mp-ico[data-flat]{animation:cnIcoIn .5s both,cnIcoBreath 3.4s ease-in-out 1s infinite}',
      '@media(prefers-reduced-motion:reduce){.mp-ico[data-flat],.mp-ico[data-flat] svg{animation:none!important;transition:none!important}}'
    ].join('\n');
    document.head.appendChild(st);
    var seen = new WeakSet(), n = 0;
    function live() {
      document.querySelectorAll('.mp-ico[data-flat]:not([data-live])').forEach(function (el) {
        if (seen.has(el)) return; seen.add(el); el.style.setProperty('--i', String(n++ % 12)); el.setAttribute('data-live', '1');
      });
    }
    var tm = null;
    new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(live, 90); }).observe(document.body, { childList: true, subtree: true });
    setTimeout(live, 200);
  } catch (e) { /* ignore */ }
})();
