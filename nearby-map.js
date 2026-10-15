/* nearby-map.js — « Près de chez vous » : carte interactive, recherche de n'importe quelle position dans le monde,
   catégories à proximité, fiche détaillée (adresse, distance, itinéraire, appel, partage).
   Cartes OpenStreetMap + Leaflet, recherche Nominatim : aucune clé, aucun compte. L'annuaire existant reste en dessous.
   La position n'est utilisée qu'avec ton accord et n'est jamais envoyée au serveur. Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnNearbyMap) return; window.__cnNearbyMap = true;

  var JS = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'];
  var CSS = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'];
  var TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var NOM = 'https://nominatim.openstreetmap.org';
  var DEFAULT = [-4.325, 15.322]; // Kinshasa

  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  var D = {
    fr: { search: 'Rechercher un lieu, une adresse, une ville…', me: 'Ma position', loading: 'Recherche…', none: 'Aucun résultat. Essaie un autre nom ou une autre ville.', err: 'Recherche indisponible pour le moment. Vérifie ta connexion.', near: 'À proximité', results: 'Résultats', dir: 'Itinéraire', copy: 'Copier', share: 'Partager', call: 'Appeler', web: 'Site web', away: 'de toi', copied: 'Coordonnées copiées', coords: 'Coordonnées', geoOff: 'Position refusée : active-la dans les réglages du navigateur.', geoWait: 'Localisation…', place: 'Lieu', hint: 'Touche la carte pour voir l’adresse d’un endroit.', dirTitle: 'Annuaire Coeurnoh', mapErr: 'La carte n’a pas pu se charger. Vérifie ta connexion puis réessaie.',
      cats: [['restaurant', 'Restaurants'], ['pharmacy', 'Pharmacies'], ['hospital', 'Hôpitaux'], ['bank', 'Banques'], ['hotel', 'Hôtels'], ['supermarket', 'Supermarchés'], ['fuel', 'Stations'], ['school', 'Écoles'], ['atm', 'Distributeurs']] },
    en: { search: 'Search a place, address, city…', me: 'My location', loading: 'Searching…', none: 'No result. Try another name or city.', err: 'Search unavailable right now. Check your connection.', near: 'Nearby', results: 'Results', dir: 'Directions', copy: 'Copy', share: 'Share', call: 'Call', web: 'Website', away: 'from you', copied: 'Coordinates copied', coords: 'Coordinates', geoOff: 'Location denied: enable it in your browser settings.', geoWait: 'Locating…', place: 'Place', hint: 'Tap the map to see the address of any spot.', dirTitle: 'Coeurnoh directory', mapErr: 'The map could not load. Check your connection and retry.',
      cats: [['restaurant', 'Restaurants'], ['pharmacy', 'Pharmacies'], ['hospital', 'Hospitals'], ['bank', 'Banks'], ['hotel', 'Hotels'], ['supermarket', 'Supermarkets'], ['fuel', 'Fuel'], ['school', 'Schools'], ['atm', 'ATMs']] }
  };
  function L(k) { return D[lang()][k]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(p, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>',
    nav: '<path d="m3 11 19-9-9 19-2-8z"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>', pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>', close: '<path d="M18 6 6 18M6 6l12 12"/>'
  };

  var map = null, mk = null, me = null, meMarker = null, ready = false, host = null, results = [], sel = null, cat = '', busy = 0, loadingLib = null;

  function loadLib() {
    if (window.L && window.L.map) return Promise.resolve();
    if (loadingLib) return loadingLib;
    loadingLib = new Promise(function (res, rej) {
      var i = 0;
      CSS.forEach(function (h, k) { if (k === 0) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); } });
      (function next() {
        if (i >= JS.length) return rej(new Error('leaflet'));
        var s = document.createElement('script'); s.src = JS[i++]; s.async = true;
        s.onload = function () { window.L && window.L.map ? res() : next(); };
        s.onerror = next; document.head.appendChild(s);
      })();
    });
    return loadingLib;
  }

  function build() {
    var scr = document.getElementById('menu-screen-nearby'); if (!scr) return false;
    if (document.getElementById('nm-root')) { host = document.getElementById('nm-root'); return true; }
    var hdr = scr.querySelector('.menu-page-header'); if (!hdr) return false;
    var el = document.createElement('div'); el.id = 'nm-root'; el.className = 'nm';
    el.innerHTML =
      '<div class="nm-search">' + svg(IC.search, 18) + '<input id="nm-q" type="search" placeholder="' + esc(L('search')) + '" autocomplete="off" maxlength="120" enterkeyhint="search"><button type="button" class="nm-clear" data-nm="clear" aria-label="Effacer" hidden>' + svg(IC.close, 16) + '</button></div>' +
      '<div class="nm-chips" id="nm-chips">' + D[lang()].cats.map(function (c) { return '<button type="button" class="nm-chip" data-nm="cat" data-v="' + c[0] + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="nm-mapwrap"><div id="nm-map" class="nm-map"></div><button type="button" class="nm-me" data-nm="me" aria-label="' + esc(L('me')) + '">' + svg(IC.locate, 22) + '</button><div class="nm-hint" id="nm-hint">' + esc(L('hint')) + '</div></div>' +
      '<div id="nm-sheet" class="nm-sheet" hidden></div><div id="nm-list" class="nm-list"></div>' +
      '<h3 class="nm-h">' + esc(L('dirTitle')) + '</h3>';
    hdr.insertAdjacentElement('afterend', el); host = el; return true;
  }

  function dist(a, b) {
    var R = 6371000, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function fmtD(m) { return m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km'; }
  function pinIcon(on) { return window.L.divIcon({ className: 'nm-pin' + (on ? ' on' : ''), html: '<span></span>', iconSize: [30, 38], iconAnchor: [15, 36] }); }

  function initMap() {
    return loadLib().then(function () {
      if (map) { setTimeout(function () { map.invalidateSize(); }, 80); return; }
      var el = document.getElementById('nm-map'); if (!el) return;
      map = window.L.map(el, { zoomControl: false, attributionControl: true }).setView(me || DEFAULT, me ? 14 : 11);
      window.L.control.zoom({ position: 'bottomleft' }).addTo(map);
      window.L.tileLayer(TILES, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      map.on('click', function (e) { reverse(e.latlng.lat, e.latlng.lng); });
      setTimeout(function () { map.invalidateSize(); }, 120);
    });
  }

  function jget(url) {
    return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); });
  }
  function norm(r) {
    var a = r.address || {}, name = r.name || (r.namedetails && r.namedetails.name) || a.road || (r.display_name || '').split(',')[0];
    var x = r.extratags || {};
    return { id: r.place_id, lat: +r.lat, lon: +r.lon, name: name, type: (r.type || r.category || '').replace(/_/g, ' '), addr: r.display_name || '', city: a.city || a.town || a.village || a.state || '', country: a.country || '', phone: x.phone || x['contact:phone'] || '', web: x.website || x['contact:website'] || '', hours: x.opening_hours || '' };
  }
  function setList(items, title) {
    results = items; var el = document.getElementById('nm-list'); if (!el) return;
    if (!items.length) { el.innerHTML = '<div class="nm-empty">' + svg(IC.pin, 28) + '<p>' + esc(L('none')) + '</p></div>'; return; }
    el.innerHTML = '<h3 class="nm-h">' + esc(title || L('results')) + ' · ' + items.length + '</h3>' + items.map(function (p, i) {
      var d = me ? ' · ' + fmtD(dist(me, [p.lat, p.lon])) : '';
      return '<button type="button" class="nm-item" data-nm="pick" data-i="' + i + '"><span class="nm-ic">' + svg(IC.pin, 20) + '</span><span class="nm-tx"><b>' + esc(p.name) + '</b><small>' + esc(p.addr) + '</small><em>' + esc(p.type) + d + '</em></span></button>';
    }).join('');
    if (map && window.L) {
      if (mk) { mk.forEach(function (m) { m.remove(); }); }
      mk = items.map(function (p, i) { var m = window.L.marker([p.lat, p.lon], { icon: pinIcon(false) }).addTo(map); m.on('click', function () { choose(i); }); return m; });
      try { var b = window.L.latLngBounds(items.map(function (p) { return [p.lat, p.lon]; })); if (me) b.extend(me); map.fitBounds(b, { padding: [40, 40], maxZoom: 16 }); } catch (e) { }
    }
  }
  function loading() { var el = document.getElementById('nm-list'); if (el) el.innerHTML = '<div class="nm-skel"></div><div class="nm-skel"></div>'; }

  function search(q) {
    q = (q || '').trim(); if (!q) return;
    var id = ++busy; loading(); hideSheet();
    var url = NOM + '/search?format=jsonv2&limit=10&addressdetails=1&extratags=1&namedetails=1&accept-language=' + lang() + '&q=' + encodeURIComponent(q);
    if (me && cat === '') url += '&viewbox=' + [me[1] - 1, me[0] + 1, me[1] + 1, me[0] - 1].join(',');
    jget(url).then(function (r) { if (id !== busy) return; setList(r.map(norm), L('results')); if (r.length === 1) choose(0); })
      .catch(function () { if (id !== busy) return; var el = document.getElementById('nm-list'); if (el) el.innerHTML = '<div class="nm-empty"><p>' + esc(L('err')) + '</p></div>'; });
  }
  function nearby(term) {
    var c = map ? map.getCenter() : { lat: (me || DEFAULT)[0], lng: (me || DEFAULT)[1] };
    var id = ++busy; loading(); hideSheet();
    var d = 0.06, vb = [c.lng - d, c.lat + d, c.lng + d, c.lat - d].join(',');
    var url = NOM + '/search?format=jsonv2&limit=20&addressdetails=1&extratags=1&namedetails=1&bounded=1&accept-language=' + lang() + '&viewbox=' + vb + '&q=' + encodeURIComponent(term);
    jget(url).then(function (r) {
      if (id !== busy) return;
      var items = r.map(norm); var ref = me || [c.lat, c.lng];
      items.sort(function (a, b) { return dist(ref, [a.lat, a.lon]) - dist(ref, [b.lat, b.lon]); });
      setList(items, L('near'));
    }).catch(function () { if (id !== busy) return; var el = document.getElementById('nm-list'); if (el) el.innerHTML = '<div class="nm-empty"><p>' + esc(L('err')) + '</p></div>'; });
  }
  function reverse(lat, lon) {
    jget(NOM + '/reverse?format=jsonv2&zoom=18&addressdetails=1&extratags=1&namedetails=1&accept-language=' + lang() + '&lat=' + lat + '&lon=' + lon)
      .then(function (r) { var p = norm(r); if (!r.lat) { p.lat = lat; p.lon = lon; } p.name = p.name || L('place'); showSheet(p, true); })
      .catch(function () { showSheet({ lat: lat, lon: lon, name: L('place'), addr: '', type: '', phone: '', web: '', hours: '' }, true); });
  }
  function choose(i) { var p = results[i]; if (!p) return; showSheet(p, false); if (map) map.setView([p.lat, p.lon], Math.max(map.getZoom(), 16)); }

  function showSheet(p, drop) {
    sel = p;
    if (map && window.L) {
      if (drop) { if (window.__nmDrop) window.__nmDrop.remove(); window.__nmDrop = window.L.marker([p.lat, p.lon], { icon: pinIcon(true) }).addTo(map); map.panTo([p.lat, p.lon]); }
    }
    var el = document.getElementById('nm-sheet'); if (!el) return;
    var d = me ? fmtD(dist(me, [p.lat, p.lon])) + ' ' + L('away') : '';
    el.hidden = false;
    el.innerHTML = '<div class="nm-sh-h"><span class="nm-ic big">' + svg(IC.pin, 24) + '</span><div><b>' + esc(p.name) + '</b><small>' + esc([p.type, d].filter(Boolean).join(' · ')) + '</small></div><button type="button" class="nm-x" data-nm="closesheet" aria-label="Fermer">' + svg(IC.close, 18) + '</button></div>' +
      (p.addr ? '<p class="nm-addr">' + esc(p.addr) + '</p>' : '') +
      (p.hours ? '<p class="nm-meta">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 15) + esc(p.hours) + '</p>' : '') +
      '<p class="nm-meta">' + svg(IC.pin, 15) + esc(L('coords')) + ' : ' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) + '</p>' +
      '<div class="nm-acts"><a class="nm-btn pri" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lon + '">' + svg(IC.nav, 17) + L('dir') + '</a>' +
      (p.phone ? '<a class="nm-btn" href="tel:' + esc(String(p.phone).split(';')[0].replace(/[^+\d]/g, '')) + '">' + svg(IC.phone, 17) + L('call') + '</a>' : '') +
      (p.web && /^https?:\/\//.test(p.web) ? '<a class="nm-btn" target="_blank" rel="noopener noreferrer" href="' + esc(p.web) + '">' + svg(IC.globe, 17) + L('web') + '</a>' : '') +
      '<button type="button" class="nm-btn" data-nm="copy">' + svg(IC.copy, 17) + L('copy') + '</button><button type="button" class="nm-btn" data-nm="share">' + svg(IC.share, 17) + L('share') + '</button></div>';
    try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { }
  }
  function hideSheet() { var el = document.getElementById('nm-sheet'); if (el) el.hidden = true; if (window.__nmDrop) { window.__nmDrop.remove(); window.__nmDrop = null; } sel = null; }

  function locate(silent) {
    if (!navigator.geolocation) return;
    var h = document.getElementById('nm-hint'); if (h && !silent) h.textContent = L('geoWait');
    navigator.geolocation.getCurrentPosition(function (pos) {
      me = [pos.coords.latitude, pos.coords.longitude];
      initMap().then(function () {
        if (!map) return; map.setView(me, 15);
        if (meMarker) meMarker.remove();
        meMarker = window.L.marker(me, { icon: window.L.divIcon({ className: 'nm-me-dot', html: '<span></span>', iconSize: [22, 22] }), interactive: false }).addTo(map);
        var hh = document.getElementById('nm-hint'); if (hh) hh.textContent = L('hint');
      });
    }, function () { var hh = document.getElementById('nm-hint'); if (hh) hh.textContent = silent ? L('hint') : L('geoOff'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  function onClick(ev) {
    var b = ev.target.closest && ev.target.closest('[data-nm]'); if (!b || !b.closest('#nm-root')) return;
    var a = b.getAttribute('data-nm');
    if (a === 'me') locate(false);
    else if (a === 'cat') {
      var v = b.getAttribute('data-v'); cat = cat === v ? '' : v;
      document.querySelectorAll('#nm-chips .nm-chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-v') === cat); });
      if (cat) nearby(cat); else { var l = document.getElementById('nm-list'); if (l) l.innerHTML = ''; }
    }
    else if (a === 'pick') choose(parseInt(b.getAttribute('data-i'), 10));
    else if (a === 'closesheet') hideSheet();
    else if (a === 'clear') { var q = document.getElementById('nm-q'); q.value = ''; b.hidden = true; q.focus(); }
    else if (a === 'copy' && sel) { try { navigator.clipboard.writeText(sel.lat.toFixed(6) + ', ' + sel.lon.toFixed(6)).then(function () { try { showToast(L('copied'), 'success'); } catch (e) { } }); } catch (e) { } }
    else if (a === 'share' && sel) {
      var url = 'https://www.google.com/maps/search/?api=1&query=' + sel.lat + ',' + sel.lon, txt = sel.name + (sel.addr ? ' — ' + sel.addr : '');
      if (navigator.share) navigator.share({ title: sel.name, text: txt, url: url }).catch(function () { }); else { try { navigator.clipboard.writeText(txt + ' ' + url); showToast(L('copied'), 'success'); } catch (e) { } }
    }
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('input', function (ev) { if (ev.target.id === 'nm-q') { var c = document.querySelector('#nm-root .nm-clear'); if (c) c.hidden = !ev.target.value; } });
  document.addEventListener('keydown', function (ev) { if (ev.target.id === 'nm-q' && ev.key === 'Enter') { ev.preventDefault(); cat = ''; document.querySelectorAll('#nm-chips .nm-chip').forEach(function (c) { c.classList.remove('on'); }); search(ev.target.value); ev.target.blur(); } });

  function enter() {
    if (!build()) return;
    initMap().then(function () { if (!meMarker && !me) locate(true); }).catch(function () {
      var m = document.getElementById('nm-map'); if (m) m.innerHTML = '<div class="nm-empty"><p>' + esc(L('mapErr')) + '</p></div>';
    });
  }
  var orig = window.openNearbyScreen;
  window.openNearbyScreen = function () { if (typeof orig === 'function') orig.apply(this, arguments); setTimeout(enter, 60); };
  // aussi si l'écran est ouvert autrement
  try { new MutationObserver(function () { var s = document.getElementById('menu-screen-nearby'); if (s && !s.classList.contains('hidden') && !document.getElementById('nm-root')) enter(); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] }); } catch (e) { }

  var css = [
    '.nm{margin:0 0 6px;font-family:var(--cnh-font,system-ui,sans-serif);color:var(--cnh-ink,#111827)}.nm *{box-sizing:border-box}',
    '.nm-search{display:flex;align-items:center;gap:10px;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:16px;padding:0 14px;min-height:52px;box-shadow:var(--cnh-shadow,0 4px 14px rgba(17,24,39,.06));color:var(--cnh-sub,#5a6577)}',
    '.nm-search:focus-within{border-color:var(--cnh-brand,#1d4f91);box-shadow:0 0 0 3px var(--cnh-brand-tint,rgba(29,79,145,.12))}',
    '.nm-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:.9375rem;color:var(--cnh-ink,#111827)}',
    '.nm-clear{border:0;background:var(--cnh-soft,#eef3f9);color:inherit;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}.nm-clear[hidden]{display:none}',
    '.nm-chips{display:flex;gap:8px;overflow-x:auto;padding:12px 2px;scrollbar-width:none}.nm-chips::-webkit-scrollbar{display:none}',
    '.nm-chip{flex:0 0 auto;min-height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);font:inherit;font-weight:600;font-size:.8125rem;cursor:pointer;touch-action:manipulation}',
    '.nm-chip.on{background:#14263f;border-color:#14263f;color:#fff}',
    '.nm-mapwrap{position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--cnh-line,#e1e6ed);box-shadow:var(--cnh-shadow,0 4px 14px rgba(17,24,39,.08))}',
    '.nm-map{height:300px;background:#e6edf5;z-index:0}',
    '.nm-me{position:absolute;right:12px;bottom:12px;z-index:500;width:48px;height:48px;border-radius:50%;border:0;background:var(--cnh-card,#fff);color:var(--cnh-brand,#1d4f91);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}',
    '.nm-hint{position:absolute;left:12px;top:12px;z-index:500;max-width:70%;background:rgba(20,38,63,.88);color:#fff;font-size:.75rem;padding:6px 10px;border-radius:999px}',
    '.nm-pin{background:none;border:0}.nm-pin span{display:block;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1d4f91;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);margin-top:4px}.nm-pin.on span{background:#d6336c}',
    '.nm-me-dot span{display:block;width:18px;height:18px;border-radius:50%;background:#1d6ff0;border:3px solid #fff;box-shadow:0 0 0 6px rgba(29,111,240,.25)}',
    '.nm-sheet{margin-top:12px;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:18px;padding:14px;box-shadow:var(--cnh-shadow,0 4px 14px rgba(17,24,39,.08));animation:nmUp .25s cubic-bezier(.2,.8,.2,1)}.nm-sheet[hidden]{display:none}',
    '@keyframes nmUp{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}',
    '.nm-sh-h{display:flex;align-items:center;gap:12px}.nm-sh-h>div{flex:1;min-width:0}.nm-sh-h b{display:block;font-size:1.0625rem;line-height:1.3;word-break:break-word}.nm-sh-h small{color:var(--cnh-sub,#5a6577);font-size:.8125rem}',
    '.nm-x{border:0;background:var(--cnh-soft,#eef3f9);color:inherit;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.nm-ic{width:40px;height:40px;border-radius:12px;background:var(--cnh-brand-tint,rgba(29,79,145,.1));color:var(--cnh-brand,#1d4f91);display:flex;align-items:center;justify-content:center;flex:0 0 auto}.nm-ic.big{width:48px;height:48px;border-radius:14px;background:#1d4f91;color:#fff}',
    '.nm-addr{margin:10px 0 4px;font-size:.875rem;line-height:1.5;color:var(--cnh-ink,#111827)}.nm-meta{display:flex;align-items:center;gap:8px;margin:6px 0 0;font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.nm-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}',
    '.nm-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:0 14px;border-radius:12px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);font:inherit;font-weight:600;font-size:.8125rem;text-decoration:none;cursor:pointer;touch-action:manipulation}',
    '.nm-btn.pri{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91);color:#fff;flex:1 1 140px}html[data-theme="dark"] .nm-btn.pri{color:#0b1220}',
    '.nm-h{margin:20px 0 10px;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cnh-sub,#5a6577)}',
    '.nm-list{display:grid;gap:8px}.nm-list .nm-h{margin:14px 0 2px}',
    '.nm-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;padding:10px 12px;cursor:pointer;color:inherit;font:inherit;touch-action:manipulation}',
    '.nm-item:active{transform:scale(.985)}.nm-tx{min-width:0;display:flex;flex-direction:column;gap:2px}.nm-tx b{font-size:.9375rem;line-height:1.3;word-break:break-word}',
    '.nm-tx small{font-size:.75rem;color:var(--cnh-sub,#5a6577);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.nm-tx em{font-style:normal;font-size:.75rem;font-weight:600;color:var(--cnh-brand,#1d4f91);text-transform:capitalize}',
    '.nm-empty{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;color:var(--cnh-sub,#5a6577);padding:22px 12px}.nm-empty p{margin:0;font-size:.875rem}',
    '.nm-skel{height:64px;border-radius:14px;background:linear-gradient(90deg,var(--cnh-soft,#eef3f9) 25%,var(--cnh-soft2,#f6f8fb) 50%,var(--cnh-soft,#eef3f9) 75%);background-size:200% 100%;animation:nmSk 1.2s linear infinite}@keyframes nmSk{to{background-position:-200% 0}}',
    '.nm .nm-map.leaflet-container{font:inherit;width:100%;height:300px}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
