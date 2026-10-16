/* admin-icons.js — l'administrateur change lui-même TOUTES les icônes de l'application (menu, barre du bas, services,
   boutons…) en les remplaçant par une photo. Visible et utilisable UNIQUEMENT par le compte administrateur.
   Les photos sont lues par tout le monde (pricing/site.showcasePhotos) mais seul l'administrateur peut les enregistrer.
   S'appuie sur showcase.js (CNShowcase). Jamais bloquant : sans photo, rien ne change. */
(function () {
  'use strict';
  if (window.__cnAdminIcons) return; window.__cnAdminIcons = true;
  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  var TX = {
    fr: { edit: 'Modifier les icônes', done: 'Terminer', hint: 'Touche une icône pour changer sa photo.', top: 'Mode icônes : touche une icône pour changer sa photo', pick: 'Choisir une photo', reset: 'Remettre l’icône d’origine', cancel: 'Annuler', title: 'Icône', none: 'Aucune icône trouvée ici.' },
    en: { edit: 'Edit icons', done: 'Done', hint: 'Tap an icon to change its photo.', top: 'Icon mode: tap an icon to change its photo', pick: 'Choose a photo', reset: 'Restore original icon', cancel: 'Cancel', title: 'Icon', none: 'No icon found here.' }
  };
  function tx() { return TX[lang()]; }
  function sc() { return window.CNShowcase; }
  function isAdm() { try { return !!sc() && sc().isAdmin(); } catch (e) { return false; } }
  function photo(k) { try { return sc() ? sc().photo(k) : ''; } catch (e) { return ''; } }
  var editing = false;
  var HOLD = '.mp-tile,.mp-short,.mp-row,.bnav-btn,button,a,[onclick],[role="button"],li,label,.gate-card,.sbx-type';
  var TILE = '.mp-tile[data-id],.mp-short[data-id],.mp-row[data-id]';

  /* ---------- Identité stable d'une icône ---------- */
  var kc = typeof WeakMap === 'function' ? new WeakMap() : null;
  function hash(str) { var h = 5381; str = String(str); for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function holderOf(svg) { return svg.closest(HOLD) || svg.parentElement || svg; }
  function keyOf(svg) {
    if (kc && kc.has(svg)) return kc.get(svg);
    var tile = svg.closest(TILE), k;
    if (tile) k = 'svc_' + tile.getAttribute('data-id');
    else {
      var h = holderOf(svg);
      var anchor = h.id || h.getAttribute('data-id') || h.getAttribute('data-action') || h.getAttribute('onclick') || h.getAttribute('aria-label') || (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
      k = 'ico_' + hash(svg.innerHTML) + '_' + hash(anchor);
    }
    if (kc) kc.set(svg, k);
    return k;
  }
  function labelOf(svg) {
    var h = holderOf(svg), t = (h.textContent || '').trim().replace(/\s+/g, ' ');
    return t.slice(0, 40) || h.getAttribute('aria-label') || tx().title;
  }

  /* ---------- Services : photo à l'intérieur de la pastille (.mp-ico) ---------- */
  function applyTiles() {
    document.querySelectorAll(TILE).forEach(function (t) {
      var ico = t.querySelector('.mp-ico'); if (!ico) return;
      var id = t.getAttribute('data-id'), u = photo('svc_' + id), cur = ico.querySelector('img.mp-photo');
      if (u) {
        ico.classList.add('has-photo');
        if (!cur) { var im = document.createElement('img'); im.className = 'mp-photo'; im.alt = ''; im.loading = 'lazy'; im.onerror = function () { im.remove(); ico.classList.remove('has-photo'); }; im.src = u; ico.appendChild(im); }
        else if (cur.getAttribute('src') !== u) cur.src = u;
      } else if (cur) { cur.remove(); ico.classList.remove('has-photo'); }
    });
  }

  /* ---------- Toutes les autres icônes (pictogrammes SVG de petite taille) ---------- */
  function sizeOf(svg) {
    var r = svg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return [r.width, r.height];
    var w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
    return (w > 0 && h > 0) ? [w, h] : null;
  }
  function restore(svg) {
    var n = svg.nextElementSibling;
    if (n && n.classList && n.classList.contains('cn-ico-img')) n.remove();
    svg.classList.remove('cn-ico-off');
  }
  function applyGeneric() {
    if (!sc()) return;
    var any = false;
    try { any = sc().count('ico_') > 0; } catch (e) { }
    // Retire les photos dont la clé n'existe plus (photo retirée)
    document.querySelectorAll('svg.cn-ico-off').forEach(function (svg) {
      if (!any || !photo(keyOf(svg))) restore(svg);
    });
    if (!any) return;
    document.querySelectorAll('svg').forEach(function (svg) {
      if (svg.classList.contains('cn-ico-off') || svg.closest(TILE + ',.cn-ie-ui,#cn-ie-sheet,.cn-ico-img')) return;
      var k = keyOf(svg), u = photo(k); if (!u) return;
      var sz = sizeOf(svg); if (!sz || sz[0] > 120 || sz[1] > 120) return;
      var im = document.createElement('img');
      im.className = 'cn-ico-img'; im.alt = ''; im.src = u; im.style.width = sz[0] + 'px'; im.style.height = sz[1] + 'px'; im.setAttribute('data-k', k);
      im.onerror = function () { im.remove(); svg.classList.remove('cn-ico-off'); };
      svg.classList.add('cn-ico-off');
      svg.insertAdjacentElement('afterend', im);
    });
  }

  /* ---------- Interface administrateur ---------- */
  var IC_EDIT = '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-5-5L5 21"/>';
  function ui() {
    var fab = document.getElementById('cn-ie-fab'), top = document.getElementById('cn-ie-top');
    var show = isAdm();
    try { show = show && !!currentUser; } catch (e) { show = false; }
    if (!show) { if (fab) fab.remove(); if (top) top.remove(); var b0 = document.getElementById('cn-ie-bar'); if (b0) b0.remove(); document.documentElement.classList.remove('cn-ie-on'); editing = false; return; }
    if (!fab) {
      fab = document.createElement('button'); fab.id = 'cn-ie-fab'; fab.type = 'button'; fab.className = 'cn-ie-ui'; fab.setAttribute('data-toggle', '1');
      fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC_EDIT + '</svg>';
      document.body.appendChild(fab);
    }
    fab.setAttribute('aria-label', tx().edit); fab.title = tx().edit;
    fab.style.display = editing ? 'none' : '';
    if (editing && !top) {
      top = document.createElement('div'); top.id = 'cn-ie-top'; top.className = 'cn-ie-ui';
      top.innerHTML = '<span></span><button type="button" data-toggle="1"></button>'; document.body.appendChild(top);
    }
    if (top) { if (!editing) top.remove(); else { top.firstChild.textContent = tx().top; top.lastChild.textContent = tx().done; } }
    document.documentElement.classList.toggle('cn-ie-on', editing);
    // Barre rappel dans l'écran Services (comme avant)
    var host = document.getElementById('menu-screen-items-services'), bar = document.getElementById('cn-ie-bar');
    if (host && !bar) {
      var hdr = host.querySelector('.menu-page-header');
      if (hdr) { bar = document.createElement('div'); bar.id = 'cn-ie-bar'; bar.className = 'cn-ie-bar cn-ie-ui'; hdr.insertAdjacentElement('afterend', bar); }
    }
    if (bar) bar.innerHTML = '<button type="button" class="cn-ie-btn' + (editing ? ' on' : '') + '" data-toggle="1">' + (editing ? tx().done : tx().edit) + '</button>' + (editing ? '<span>' + tx().hint + '</span>' : '');
  }
  function closeSheet() { var s = document.getElementById('cn-ie-sheet'); if (s) s.remove(); }
  function openSheet(svg) {
    closeSheet();
    var k = keyOf(svg), has = !!photo(k), t = tx();
    var s = document.createElement('div'); s.id = 'cn-ie-sheet';
    var lbl = labelOf(svg).replace(/[<>&"]/g, '');
    s.innerHTML = '<div class="cn-ie-back" data-sh="close"></div><div class="cn-ie-card" role="dialog" aria-label="' + t.title + '"><b>' + t.title + ' · ' + lbl + '</b>' +
      '<button type="button" class="cn-ie-main" data-sh="pick">' + t.pick + '</button>' + (has ? '<button type="button" data-sh="reset">' + t.reset + '</button>' : '') + '<button type="button" data-sh="close">' + t.cancel + '</button></div>';
    s._k = k; document.body.appendChild(s);
  }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0 || !t0.closest) return;
    if (t0.closest('[data-toggle]')) { if (isAdm()) { ev.preventDefault(); ev.stopPropagation(); editing = !editing; closeSheet(); ui(); } return; }
    var sh = t0.closest('[data-sh]');
    if (sh) {
      ev.preventDefault(); ev.stopPropagation();
      var box = document.getElementById('cn-ie-sheet'), k = box && box._k, a = sh.getAttribute('data-sh');
      closeSheet();
      if (!isAdm() || !k) return;
      if (a === 'pick') sc().pick(k); else if (a === 'reset') sc().drop(k);
      return;
    }
    if (!editing || !isAdm()) return;
    var svg = t0.closest('svg');
    if (!svg) { var im = t0.closest('img.cn-ico-img,img.mp-photo'); if (im) { svg = (im.className === 'cn-ico-img') ? im.previousElementSibling : (im.closest(TILE) || im).querySelector('svg'); } }
    if (!svg) { var h = t0.closest(HOLD); if (h) svg = h.querySelector('svg'); }
    if (svg && svg.tagName && svg.tagName.toLowerCase() === 'svg') { ev.preventDefault(); ev.stopPropagation(); openSheet(svg); }
  }, true);
  document.addEventListener('cn-showcase-photos', function () { applyTiles(); applyGeneric(); });
  var tm = null;
  function later() { clearTimeout(tm); tm = setTimeout(function () { ui(); applyTiles(); applyGeneric(); }, 200); }
  try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) { var n = m[i].target; if (n && n.id && /^cn-ie-/.test(n.id)) continue; later(); return; } }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
  setTimeout(later, 600);
  var css = [
    '.mp-ico.has-photo{overflow:hidden;position:relative;background:#14263f!important}',
    '.mp-ico.has-photo svg{opacity:0!important}',
    '.mp-ico img.mp-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}',
    '.cn-ico-off{display:none!important}',
    '.cn-ico-img{object-fit:cover;border-radius:24%;display:inline-block;vertical-align:middle;flex:0 0 auto}',
    '.cn-ie-bar{display:flex;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}.cn-ie-bar span{font-size:.75rem;color:var(--cnh-sub,#5a6577);flex:1;min-width:180px}',
    '.cn-ie-btn{min-height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);font:inherit;font-weight:700;font-size:.8125rem;cursor:pointer}',
    '.cn-ie-btn.on{background:#14263f;border-color:#14263f;color:#fff}',
    '.cn-ie-on :is(button,a,[onclick],[role="button"],.mp-tile) svg,.cn-ie-on .cn-ico-img{outline:2px dashed var(--cnh-brand,#1d4f91);outline-offset:3px;border-radius:6px}',
    '.mp-tile{position:relative}',
    '#cn-ie-fab{position:fixed;left:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:1190;width:44px;height:44px;border-radius:50%;border:0;background:#14263f;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;opacity:.9}',
    '#cn-ie-top{position:fixed;left:0;right:0;top:0;z-index:2100;background:#14263f;color:#fff;display:flex;align-items:center;gap:12px;justify-content:space-between;padding:max(8px,env(safe-area-inset-top)) 12px 8px;font:600 .8125rem/1.3 var(--cnh-font,system-ui,sans-serif)}',
    '#cn-ie-top button{min-height:36px;padding:0 14px;border-radius:10px;border:0;background:#fff;color:#14263f;font:inherit;font-weight:700;cursor:pointer}',
    '#cn-ie-sheet{position:fixed;inset:0;z-index:2200;display:flex;align-items:flex-end;justify-content:center;font-family:var(--cnh-font,system-ui,sans-serif)}',
    '.cn-ie-back{position:absolute;inset:0;background:rgba(10,20,35,.5)}',
    '.cn-ie-card{position:relative;width:100%;max-width:480px;background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);border-radius:20px 20px 0 0;padding:16px 16px max(16px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;animation:cnIeUp .22s ease-out}',
    '.cn-ie-card b{font-size:.9375rem;padding:2px 2px 6px}',
    '.cn-ie-card button{min-height:48px;border-radius:12px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:inherit;font:inherit;font-weight:600;font-size:.9375rem;cursor:pointer}',
    '.cn-ie-card .cn-ie-main{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91);color:#fff}',
    '@keyframes cnIeUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
