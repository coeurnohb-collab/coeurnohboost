/* pull-refresh.js — « tirer pour actualiser » partout dans l'application (comme les grandes applications).
   Tire l'écran vers le bas depuis le haut : l'écran ouvert est actualisé sur place (on reste exactement là où on est). La page ne se recharge que si on n'est pas connecté. Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnPtr) return; window.__cnPtr = true;
  var TH = 72, MAX = 120, sy = 0, dy = 0, pulling = false, scroller = null, busy = false, ind = null;
  function mk() {
    if (ind) return ind;
    ind = document.createElement('div'); ind.className = 'cn-ptr';
    ind.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>';
    document.body.appendChild(ind); return ind;
  }
  function scrollParent(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      var cs = getComputedStyle(el), oy = cs.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
      el = el.parentElement;
    }
    return null;
  }
  function blocked(t) {
    return !!(t.closest && t.closest('input,textarea,select,.leaflet-container,video,[data-no-ptr],.cnc-strip,.cnc-cats,.cnc-chips,.cn-chat,.cn-call-ov,#cn-chat,#cn-call-ov'));
  }
  document.addEventListener('touchstart', function (e) {
    if (busy || e.touches.length !== 1 || blocked(e.target)) { pulling = false; return; }
    scroller = scrollParent(e.target);
    var top = scroller ? scroller.scrollTop : (window.scrollY || document.documentElement.scrollTop);
    if (top > 0) { pulling = false; return; }
    sy = e.touches[0].clientY; dy = 0; pulling = true;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!pulling) return;
    dy = e.touches[0].clientY - sy;
    if (dy <= 0) { hide(); return; }
    var top = scroller ? scroller.scrollTop : (window.scrollY || 0);
    if (top > 0) { pulling = false; hide(); return; }
    var d = Math.min(MAX, dy * 0.5), i = mk();
    i.style.transform = 'translate(-50%,' + (d - 40) + 'px) rotate(' + (d * 4) + 'deg)'; i.style.opacity = Math.min(1, d / 40); i.classList.toggle('ready', d >= TH * 0.5);
  }, { passive: true });
  function hide() { if (ind) { ind.style.opacity = 0; ind.style.transform = 'translate(-50%,-40px)'; ind.classList.remove('spin'); } }
  var MAP = { contests: 'openContestsScreen', jobs: 'openJobsScreen', events: 'openEventsScreen', travel: 'openTravelScreen', booking: 'openBookingScreen', immo: 'openImmoScreen', srequests: 'openServiceRequestScreen', academy: 'openAcademyScreen', business: 'openBusinessScreen', nearby: 'openNearbyScreen', invoices: 'openInvoiceScreen', alerts: 'openAlertsScreen', site: 'openSiteBuilderScreen' };
  function refresh() {
    try {
      var modal = document.getElementById('main-menu-modal');
      if (modal && !modal.classList.contains('hidden')) {
        var sc = modal.querySelector('[id^="menu-screen-"]:not(.hidden)');
        var id = sc && sc.id.replace('menu-screen-', ''), fn = id && window[MAP[id]];
        if (typeof fn === 'function') { fn(); return true; }
      }
    } catch (e) { }
    // Sinon : on actualise l'onglet courant SUR PLACE (sans recharger la page, sans retour a l'intro ni a l'Accueil)
    try { if (typeof window.cnRefreshInPlace === 'function' && window.cnRefreshInPlace()) return true; } catch (e) { }
    return false;
  }
  document.addEventListener('touchend', function () {
    if (!pulling) return; pulling = false;
    if (dy * 0.5 < TH * 0.7) { hide(); return; }
    busy = true; var i = mk(); i.style.opacity = 1; i.style.transform = 'translate(-50%,24px)'; i.classList.add('spin');
    var ok = refresh();
    setTimeout(function () { busy = false; hide(); if (!ok) { try { location.reload(); } catch (e) { } } }, ok ? 900 : 350);
  }, { passive: true });
  var css = '.cn-ptr{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;width:42px;height:42px;border-radius:50%;background:var(--cnh-card,#fff);color:var(--cnh-brand,#1d4f91);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(17,24,39,.22);z-index:10050;opacity:0;transform:translate(-50%,-40px);pointer-events:none;transition:opacity .15s}.cn-ptr.ready{color:var(--cnh-ok,#17653a)}.cn-ptr.spin svg{animation:cnPtrSpin .8s linear infinite}@keyframes cnPtrSpin{to{transform:rotate(360deg)}}';
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
