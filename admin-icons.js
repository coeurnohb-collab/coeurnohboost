/* admin-icons.js — l'administrateur change lui-même TOUTES les icônes de l'application (menu, barre du bas, services,
   boutons…) en les remplaçant par une photo. Visible et utilisable UNIQUEMENT par le compte administrateur.
   Les photos sont lues par tout le monde (pricing/site.showcasePhotos) mais seul l'administrateur peut les enregistrer.
   Les icônes de la page d'accueil publique (services, « confiance », « pourquoi nous ») portent un attribut data-ik : une photo choisie ici
   s'affiche aussi sur l'accueil, pour tous les visiteurs. Les services partagent la même clé que dans l'application (svc_<id>).
   S'appuie sur showcase.js (CNShowcase). Jamais bloquant : sans photo, rien ne change. */
(function () {
  'use strict';
  if (window.__cnAdminIcons) return; window.__cnAdminIcons = true;
  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  var TX = {
    fr: { homeBg: 'Fond de l’accueil', edit: 'Modifier les icônes', done: 'Terminer', hint: 'Touche une icône pour changer sa photo.', top: 'Mode icônes : touche une icône pour changer sa photo', pick: 'Choisir une photo', reset: 'Remettre l’icône d’origine', cancel: 'Annuler', title: 'Icône', none: 'Aucune icône trouvée ici.', pickAll: 'Changer partout (toutes les icônes identiques)', resetImg: 'Remettre l’image d’origine', resetAll: 'Tout remettre à l’origine', cover: 'Image de couverture', coverH: 'Choisis une belle image large : elle remplace le fond du bandeau.', home: 'Accueil', homeT: 'Icônes de la page d’accueil', homeH: 'Touche une icône pour changer sa photo. Elle change aussi dans l’application.', close: 'Fermer' },
    en: { homeBg: 'Home background', edit: 'Edit icons', done: 'Done', hint: 'Tap an icon to change its photo.', top: 'Icon mode: tap an icon to change its photo', pick: 'Choose a photo', reset: 'Restore original icon', cancel: 'Cancel', title: 'Icon', none: 'No icon found here.', pickAll: 'Change everywhere (all identical icons)', resetImg: 'Restore original image', resetAll: 'Restore everything', cover: 'Cover image', coverH: 'Choose a wide, elegant image: it replaces the banner background.', home: 'Home', homeT: 'Home page icons', homeH: 'Tap an icon to change its photo. It also changes inside the app.', close: 'Close' }
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
  function shapeOf(svg) { return 'any_' + hash(svg.innerHTML); }
  function pho(svg, k) { return photo(k) || photo(shapeOf(svg)); }
  function holderOf(svg) { return svg.closest(HOLD) || svg.parentElement || svg; }
  function keyOf(svg) {
    if (kc && kc.has(svg)) return kc.get(svg);
    var tile = svg.closest(TILE), own = svg.closest('[data-ik]'), ik = own ? own.getAttribute('data-ik') : '', k;
    if (ik) k = ik;
    else if (tile) k = 'svc_' + tile.getAttribute('data-id');
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
      var id = t.getAttribute('data-id'), sv0 = ico.querySelector('svg'), u = photo('svc_' + id) || (sv0 ? photo(shapeOf(sv0)) : ''), cur = ico.querySelector('img.mp-photo');
      if (u) {
        ico.classList.add('has-photo');
        if (!cur) { var im = document.createElement('img'); im.className = 'mp-photo'; im.alt = ''; im.loading = 'lazy'; im.onerror = function () { im.remove(); ico.classList.remove('has-photo'); }; im.src = u; ico.appendChild(im); }
        else if (cur.getAttribute('src') !== u) cur.src = u;
      } else if (cur) { cur.remove(); ico.classList.remove('has-photo'); }
    });
  }

  /* ---------- Page d'accueil publique : pastilles .hm-ico[data-ik] (photo dans la pastille, lue par tous les visiteurs) ---------- */
  function applyHome() {
    var hh = document.querySelector('.hm-hero'), hu0 = photo('home_hero');
    if (hh) {
      if (hu0) { hh.classList.add('has-cover'); hh.style.backgroundImage = coverUrl(hu0); }
      else if (hh.classList.contains('has-cover')) { hh.classList.remove('has-cover'); hh.style.backgroundImage = ''; }
    }
    document.querySelectorAll('.hm-ico[data-ik]').forEach(function (ico) {
      var sv1 = ico.querySelector('svg'), u = photo(ico.getAttribute('data-ik')) || (sv1 ? photo(shapeOf(sv1)) : ''), cur = ico.querySelector('img.mp-photo');
      if (u) {
        ico.classList.add('has-photo');
        if (!cur) { var im = document.createElement('img'); im.className = 'mp-photo'; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.onerror = function () { im.remove(); ico.classList.remove('has-photo'); }; im.src = u; ico.appendChild(im); }
        else if (cur.getAttribute('src') !== u) cur.src = u;
      } else if (cur) { cur.remove(); ico.classList.remove('has-photo'); }
    });
  }

  /* ---------- Académie : image de couverture du bandeau et image de chaque catégorie (domaine d'auto-études) ---------- */
  function coverUrl(u) { return 'url("' + String(u).replace(/["\\\n\r]/g, '') + '")'; }
  function applyAcademy() {
    var hero = document.querySelector('.cn-acad-hero'), hu = photo('acad_hero');
    if (hero) {
      if (hu) { hero.classList.add('has-cover'); hero.style.backgroundImage = coverUrl(hu); }
      else if (hero.classList.contains('has-cover')) { hero.classList.remove('has-cover'); hero.style.backgroundImage = ''; }
    }
    document.querySelectorAll('.cnh-art[data-art]').forEach(function (a) {
      var u = photo('acad_' + a.getAttribute('data-art')), cur = a.querySelector('img.cnh-admin-photo');
      if (u) {
        if (!cur) { var im = document.createElement('img'); im.className = 'cnh-admin-photo'; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.onerror = function () { im.remove(); }; im.src = u; a.appendChild(im); }
        else if (cur.getAttribute('src') !== u) cur.src = u;
      } else if (cur) cur.remove();
    });
  }
  function artLabel(a) {
    var box = a.closest('.cnh-tile,.cnh-banner') || a.parentElement, t = box && box.querySelector('strong,h2,h3');
    return t ? (t.textContent || '').trim().slice(0, 40) : (a.getAttribute('data-art') || '');
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
    try { any = sc().count('ico_') > 0 || sc().count('home_') > 0 || sc().count('any_') > 0; } catch (e) { }
    // Retire les photos dont la clé n'existe plus (photo retirée)
    document.querySelectorAll('svg.cn-ico-off').forEach(function (svg) {
      if (!any || !pho(svg, keyOf(svg))) restore(svg);
    });
    if (!any) return;
    document.querySelectorAll('svg').forEach(function (svg) {
      if (svg.classList.contains('cn-ico-off') || svg.closest(TILE + ',.hm-ico[data-ik],.cn-ie-ui,#cn-ie-sheet,#cn-ie-home,.cn-ico-img')) return;
      var k = keyOf(svg), u = pho(svg, k); if (!u) return;
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
      top.innerHTML = '<span></span><button type="button" data-home="1"></button><button type="button" data-toggle="1"></button>'; document.body.appendChild(top);
    }
    if (top) { if (!editing) top.remove(); else { top.firstChild.textContent = tx().top; top.querySelector('[data-home]').textContent = tx().home; top.querySelector('[data-toggle]').textContent = tx().done; } }
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
  function openSheet(svg) { openSheetKey(keyOf(svg), labelOf(svg), { shape: shapeOf(svg) }); }
  function openSheetKey(k, label, o) {
    closeSheet(); o = o || {};
    var has = !!photo(k), hasAll = !!(o.shape && photo(o.shape)), t = tx();
    var s = document.createElement('div'); s.id = 'cn-ie-sheet';
    var lbl = String(label || '').replace(/[<>&"]/g, '');
    s.innerHTML = '<div class="cn-ie-back" data-sh="close"></div><div class="cn-ie-card" role="dialog" aria-label="' + t.title + '"><b>' + (o.title || t.title) + ' · ' + lbl + '</b>' + (o.hint ? '<p>' + o.hint + '</p>' : '') +
      '<button type="button" class="cn-ie-main" data-sh="pick">' + t.pick + '</button>' +
      (o.shape ? '<button type="button" data-sh="pickall">' + t.pickAll + '</button>' : '') +
      (has ? '<button type="button" data-sh="reset">' + (o.title ? t.resetImg : t.reset) + '</button>' : '') +
      (hasAll ? '<button type="button" data-sh="resetall">' + t.resetAll + '</button>' : '') +
      '<button type="button" data-sh="close">' + t.cancel + '</button></div>';
    s._k = k; s._shape = o.shape || ''; document.body.appendChild(s);
  }
  /* ---------- Liste des icônes de l'accueil (l'administrateur ne voit pas la page publique une fois connecté) ---------- */
  function homeItems() {
    var seen = {}, out = [];
    out.push({ k: 'home_hero', label: tx().homeBg, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>', shape: '' });
    document.querySelectorAll('.hm-ico[data-ik],svg[data-ik]').forEach(function (el) {
      var k = el.getAttribute('data-ik'); if (!k || seen[k]) return; seen[k] = 1;
      var box = el.closest('.hm-card,.hm-why-item,li') || el.parentElement, lab = '';
      var t = box && box.querySelector('.hm-card-t,h3,span[data-i18n]'); if (t) lab = (t.textContent || '').trim();
      var sv = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
      out.push({ k: k, label: lab || k, svg: sv ? sv.outerHTML : '', shape: sv ? shapeOf(sv) : '' });
    });
    return out;
  }
  function closeHome() { var s = document.getElementById('cn-ie-home'); if (s) s.remove(); }
  function openHome() {
    closeHome(); closeSheet();
    var t = tx(), items = homeItems(), s = document.createElement('div'); s.id = 'cn-ie-home';
    var grid = items.map(function (it) {
      var u = photo(it.k), lab = it.label.replace(/[<>&"]/g, '');
      return '<button type="button" class="cn-ie-hi" data-hk="' + it.k + '" data-hl="' + lab + '" data-hs="' + it.shape + '"><span class="cn-ie-hv">' + (u ? '<img src="' + u + '" alt="">' : it.svg) + '</span><small>' + lab + '</small></button>';
    }).join('');
    s.innerHTML = '<div class="cn-ie-back" data-hc="1"></div><div class="cn-ie-card cn-ie-wide" role="dialog" aria-label="' + t.homeT + '"><b>' + t.homeT + '</b><p>' + t.homeH + '</p><div class="cn-ie-grid">' + (grid || '<p>' + t.none + '</p>') + '</div><button type="button" data-hc="1">' + t.close + '</button></div>';
    document.body.appendChild(s);
  }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0 || !t0.closest) return;
    if (t0.closest('[data-home]')) { if (isAdm()) { ev.preventDefault(); ev.stopPropagation(); openHome(); } return; }
    if (t0.closest('[data-hc]')) { ev.preventDefault(); ev.stopPropagation(); closeHome(); return; }
    var hk = t0.closest('[data-hk]');
    if (hk) { ev.preventDefault(); ev.stopPropagation(); if (isAdm()) { closeHome(); var hkk = hk.getAttribute('data-hk'); openSheetKey(hkk, hk.getAttribute('data-hl'), hkk === 'home_hero' ? { title: tx().cover, hint: tx().coverH } : { shape: hk.getAttribute('data-hs') || '' }); } return; }
    if (t0.closest('[data-toggle]')) { if (isAdm()) { ev.preventDefault(); ev.stopPropagation(); editing = !editing; closeSheet(); ui(); } return; }
    var sh = t0.closest('[data-sh]');
    if (sh) {
      ev.preventDefault(); ev.stopPropagation();
      var box = document.getElementById('cn-ie-sheet'), k = box && box._k, shp = box && box._shape, a = sh.getAttribute('data-sh');
      closeSheet();
      if (!isAdm() || !k) return;
      if (a === 'pick') sc().pick(k); else if (a === 'reset') sc().drop(k);
      else if (a === 'pickall' && shp) sc().pick(k, [shp]); else if (a === 'resetall' && shp) sc().drop(k, [shp]);
      return;
    }
    if (!editing || !isAdm()) return;
    var heroEl = t0.closest('.cn-acad-hero');
    if (heroEl) { ev.preventDefault(); ev.stopPropagation(); openSheetKey('acad_hero', heroEl.querySelector('h3') ? heroEl.querySelector('h3').textContent.trim().slice(0, 40) : '', { title: tx().cover, hint: tx().coverH }); return; }
    var artEl = t0.closest('.cnh-art[data-art]');
    if (artEl) { ev.preventDefault(); ev.stopPropagation(); openSheetKey('acad_' + artEl.getAttribute('data-art'), artLabel(artEl), { title: tx().cover, hint: tx().coverH }); return; }
    var svg = t0.closest('svg');
    if (!svg) { var im = t0.closest('img.cn-ico-img,img.mp-photo'); if (im) { svg = (im.className === 'cn-ico-img') ? im.previousElementSibling : (im.closest(TILE) || im).querySelector('svg'); } }
    if (!svg) { var h = t0.closest(HOLD); if (h) svg = h.querySelector('svg'); }
    if (svg && svg.tagName && svg.tagName.toLowerCase() === 'svg') { ev.preventDefault(); ev.stopPropagation(); openSheet(svg); }
  }, true);
  document.addEventListener('cn-showcase-photos', function () { applyTiles(); applyHome(); applyAcademy(); applyGeneric(); });
  var tm = null;
  function later() { clearTimeout(tm); tm = setTimeout(function () { ui(); applyTiles(); applyHome(); applyAcademy(); applyGeneric(); }, 200); }
  try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) { var n = m[i].target; if (n && n.id && /^cn-ie-/.test(n.id)) continue; later(); return; } }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
  setTimeout(later, 600);
  var css = [
    '.mp-ico.has-photo{overflow:hidden;position:relative;background:#14263f!important}',
    '.mp-ico.has-photo svg{opacity:0!important}',
    '.mp-ico img.mp-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}',
    '.hm-ico.has-photo{position:relative;overflow:hidden;background:#fff!important}',
    '.hm-ico.has-photo svg{opacity:0!important}',
    '.hm-ico img.mp-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}',
    '#menu-screen-academy .cn-acad-hero.has-cover{position:relative;overflow:hidden;background-color:#14263f;background-size:cover;background-position:center;background-repeat:no-repeat;isolation:isolate}',
    '#menu-screen-academy .cn-acad-hero.has-cover::before{content:"";position:absolute;inset:0;background:rgba(14,26,46,.56);border-radius:inherit;z-index:-1}',
    '.cnh-art img.cnh-admin-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}',
    '.cn-ie-on .cn-acad-hero,.cn-ie-on .cnh-art[data-art]{outline:2px dashed var(--cnh-brand,#1d4f91);outline-offset:-4px}',
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
    '#cn-ie-top button[data-home]{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)}',
    '#cn-ie-home{position:fixed;inset:0;z-index:2200;display:flex;align-items:flex-end;justify-content:center;font-family:var(--cnh-font,system-ui,sans-serif)}',
    '.cn-ie-wide{max-height:82vh;overflow:auto}.cn-ie-card p{margin:0;font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.cn-ie-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
    '.cn-ie-card .cn-ie-hi{min-height:0;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:7px;font-size:.72rem;font-weight:600;line-height:1.2;text-align:center}',
    '.cn-ie-hv{width:44px;height:44px;border-radius:12px;background:var(--cnh-soft,#eef1f6);display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--cnh-ink,#111827)}',
    '.cn-ie-hv svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.cn-ie-hv img{width:100%;height:100%;object-fit:cover}',
    '.cn-ie-hi small{display:block;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
    '@keyframes cnIeUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
