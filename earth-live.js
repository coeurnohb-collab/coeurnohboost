/* Coeurnoh Universe — « Terre en direct » : couches satellite réelles et outils de précision sur la carte du Centre de localisation.
   Couches : radar de pluie en direct (animation passé + prévision), nuages par satellite infrarouge (RainViewer),
             image satellite NASA du jour (VIIRS, couleurs réelles), feux actifs (NASA FIRMS), lumières nocturnes,
             relief ombré, archives satellite (Esri Wayback : le même lieu à des dates différentes).
   Outils    : lecture au centre de la carte (coordonnées, altitude, soleil), mesure de distance et de surface,
             fiche du point (DD, DMS, UTM, Plus Code, altitude, soleil), liens Google Earth / Street View, vue 3D (bêta).
   Aucune clé d'API. Les images viennent de services publics (NASA GIBS, Esri, RainViewer) : si l'un d'eux est
   indisponible, seule la couche concernée est signalée, le reste de la carte continue de fonctionner. */
(function () {
  'use strict';
  if (window.__cnEarth) return; window.__cnEarth = true;

  /* =================== Calculs purs (testés) =================== */
  var RAD = Math.PI / 180;
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function toDMS(v, isLat) {
    var h = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'O'); v = Math.abs(v);
    var d = Math.floor(v), m = Math.floor((v - d) * 60), s = ((v - d) * 60 - m) * 60;
    return d + '° ' + pad(m) + '′ ' + s.toFixed(1).replace(/^(\d)\./, '0$1.') + '″ ' + h;
  }
  function toUTM(lat, lon) {
    var a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
    var zone = Math.floor((lon + 180) / 6) + 1;
    if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zone = 32;
    if (lat >= 72 && lat < 84) { if (lon >= 0 && lon < 9) zone = 31; else if (lon >= 9 && lon < 21) zone = 33; else if (lon >= 21 && lon < 33) zone = 35; else if (lon >= 33 && lon < 42) zone = 37; }
    var lon0 = ((zone - 1) * 6 - 180 + 3) * RAD, phi = lat * RAD, lam = lon * RAD;
    var N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi)), T = Math.tan(phi) * Math.tan(phi), C = ep2 * Math.cos(phi) * Math.cos(phi), A = Math.cos(phi) * (lam - lon0);
    var M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi) + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi) - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi));
    var E = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5) / 120) + 500000;
    var Nn = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6) / 720));
    if (lat < 0) Nn += 10000000;
    var bands = 'CDEFGHJKLMNPQRSTUVWXX', band = bands.charAt(Math.max(0, Math.min(20, Math.floor((lat + 80) / 8))));
    return { zone: zone, band: band, easting: Math.round(E), northing: Math.round(Nn), text: zone + band + ' ' + Math.round(E) + ' E ' + Math.round(Nn) + ' N' };
  }
  var OLC = '23456789CFGHJMPQRVWX';
  function plusCode(lat, lng) {
    lat = Math.min(89.999999, Math.max(-90, lat)) + 90; lng = ((lng + 180) % 360 + 360) % 360;
    var latV = Math.floor(lat * 8000 + 1e-7), lngV = Math.floor(lng * 8000 + 1e-7), pairs = [];
    for (var i = 0; i < 5; i++) { pairs.unshift(OLC.charAt(latV % 20) + OLC.charAt(lngV % 20)); latV = Math.floor(latV / 20); lngV = Math.floor(lngV / 20); }
    var c = pairs.join(''); return c.slice(0, 8) + '+' + c.slice(8);
  }
  function hav(a, b) {
    var R = 6371008.8, dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD, s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function pathLength(pts) { var s = 0; for (var i = 1; i < pts.length; i++) s += hav(pts[i - 1], pts[i]); return s; }
  function polyArea(pts) {
    if (pts.length < 3) return 0; var R = 6378137, area = 0;
    for (var i = 0; i < pts.length; i++) { var p1 = pts[i], p2 = pts[(i + 1) % pts.length]; area += (p2.lng - p1.lng) * RAD * (2 + Math.sin(p1.lat * RAD) + Math.sin(p2.lat * RAD)); }
    return Math.abs(area * R * R / 2);
  }
  function fmtDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km'; }
  function fmtArea(m2) { return m2 < 10000 ? Math.round(m2).toLocaleString('fr-FR') + ' m²' : m2 < 1e6 ? (m2 / 10000).toFixed(2) + ' ha' : (m2 / 1e6).toFixed(2) + ' km²'; }
  function sunPosition(date, lat, lng) {
    var d = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545, lw = -lng * RAD, phi = lat * RAD;
    var M = RAD * (357.5291 + 0.98560028 * d), C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)), L = M + C + RAD * 102.9372 + Math.PI, e = RAD * 23.4397;
    var dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L)), H = RAD * (280.16 + 360.9856235 * d) - lw - ra;
    var alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
    return { altitude: alt / RAD, azimuth: ((az / RAD + 180) % 360 + 360) % 360 };
  }
  function parseRainViewer(j) {
    if (!j || !j.host) return null; var rad = j.radar || {}, sat = j.satellite || {};
    var mark = function (a, fc) { return (a || []).map(function (f) { return { time: f.time * 1000, path: f.path, forecast: !!fc }; }); };
    return { host: String(j.host).replace(/\/+$/, ''), radar: mark(rad.past).concat(mark(rad.nowcast, true)), infrared: mark(sat.infrared) };
  }
  function rvTile(host, path, kind) { return host + path + '/256/{z}/{x}/{y}/' + (kind === 'radar' ? '4/1_1' : '0/0_0') + '.png'; }
  var GIBS = {
    truecolor: { layer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor', level: 9, ext: 'jpeg', dated: true },
    fires: { layer: 'VIIRS_SNPP_Thermal_Anomalies_375m_All', level: 8, ext: 'png', dated: true },
    night: { layer: 'VIIRS_Black_Marble', level: 8, ext: 'png', dated: false }
  };
  function gibsTile(key, dateStr) {
    var g = GIBS[key]; if (!g) return ''; return 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/' + g.layer + '/default/' + (g.dated ? dateStr : '2016-01-01') + '/GoogleMapsCompatible_Level' + g.level + '/{z}/{y}/{x}.' + g.ext;
  }
  function parseWayback(cfg) {
    var out = [], seen = {};
    Object.keys(cfg || {}).forEach(function (id) { var t = (cfg[id] && cfg[id].itemTitle) || '', m = /(\d{4}-\d{2}-\d{2})/.exec(t); if (!m) return; out.push({ id: id, date: m[1] }); });
    out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return out.filter(function (r) { var k = r.date.slice(0, 7); if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function waybackTile(id) { return 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/world_imagery/mapserver/tile/' + id + '/{z}/{y}/{x}'; }
  /* Sur-zoom intelligent : quand une tuile n'existe pas à ce niveau, on affiche la partie correspondante d'une tuile du niveau supérieur. */
  function parentCrop(z, x, y, k) {
    var s = Math.pow(2, k), px = Math.floor(x / s), py = Math.floor(y / s);
    return { z: z - k, x: px, y: py, size: 256 * s, ox: (x - px * s) * 256, oy: (y - py * s) * 256 };
  }
  var POI_FR = { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', fast_food: 'Restauration rapide', school: 'École', university: 'Université', college: 'Établissement scolaire', kindergarten: 'Maternelle', hospital: 'Hôpital', clinic: 'Clinique', pharmacy: 'Pharmacie', doctors: 'Cabinet médical', dentist: 'Dentiste', bank: 'Banque', atm: 'Distributeur', place_of_worship: 'Lieu de culte', marketplace: 'Marché', fuel: 'Station-service', police: 'Police', townhall: 'Mairie', post_office: 'Poste', library: 'Bibliothèque', cinema: 'Cinéma', theatre: 'Théâtre', hotel: 'Hôtel', guest_house: 'Maison d’hôtes', hostel: 'Auberge', supermarket: 'Supermarché', convenience: 'Alimentation', bakery: 'Boulangerie', clothes: 'Vêtements', hairdresser: 'Coiffeur', mobile_phone: 'Téléphonie', attraction: 'Site touristique', museum: 'Musée', viewpoint: 'Point de vue', park: 'Parc', stadium: 'Stade', pitch: 'Terrain de sport', sports_centre: 'Centre sportif', bus_station: 'Gare routière', apartments: 'Immeuble', office: 'Bureau', monument: 'Monument', memorial: 'Mémorial', ruins: 'Ruines' };
  function poiLabel(t) { return POI_FR[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ') : 'Lieu'); }
  function poiCat(tg) {
    var a = tg.amenity || '', sh = tg.shop, tr = tg.tourism, le = tg.leisure;
    if (/^(restaurant|cafe|bar|fast_food|pub|ice_cream|food_court)$/.test(a)) return 'food';
    if (/^(hospital|clinic|pharmacy|doctors|dentist)$/.test(a) || tg.healthcare) return 'health';
    if (a === 'place_of_worship') return 'faith';
    if (/^(school|university|college|kindergarten|library)$/.test(a)) return 'edu';
    if (/^(hotel|guest_house|hostel|motel|apartment)$/.test(tr || '')) return 'stay';
    if (sh || a === 'marketplace' || a === 'bank' || a === 'atm' || a === 'fuel') return 'shop';
    if (le || tr || tg.historic) return 'leisure';
    if (/^(townhall|police|post_office|courthouse|fire_station|bus_station)$/.test(a)) return 'civic';
    return 'other';
  }
  function parseOverpass(j, c, limit) {
    var seen = {}, out = [];
    ((j && j.elements) || []).forEach(function (e) {
      var tg = e.tags || {}, name = tg.name || tg['name:fr']; if (!name) return;
      var lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon; if (lat == null || lng == null) return;
      var type = tg.amenity || tg.shop || tg.tourism || tg.leisure || tg.historic || tg.office || tg.healthcare || tg.building || '';
      var k = name.toLowerCase() + '|' + Math.round(lat * 2000) + '|' + Math.round(lng * 2000); if (seen[k]) return; seen[k] = 1;
      out.push({ name: String(name).slice(0, 80), type: poiLabel(type), cat: poiCat(tg), lat: lat, lng: lng, dist: Math.round(hav(c, { lat: lat, lng: lng })) });
    });
    return out.sort(function (a, b) { return a.dist - b.dist; }).slice(0, limit || 40);
  }
  function parseWikiGeo(j) { return (((j || {}).query || {}).geosearch || []).map(function (g) { return { title: String(g.title || '').slice(0, 90), lat: g.lat, lng: g.lon, dist: Math.round(g.dist || 0) }; }); }
  window.CNEarth = { poiCat: poiCat, parentCrop: parentCrop, poiLabel: poiLabel, parseOverpass: parseOverpass, parseWikiGeo: parseWikiGeo, toDMS: toDMS, toUTM: toUTM, plusCode: plusCode, hav: hav, pathLength: pathLength, polyArea: polyArea, fmtDist: fmtDist, fmtArea: fmtArea, sunPosition: sunPosition, parseRainViewer: parseRainViewer, rvTile: rvTile, gibsTile: gibsTile, parseWayback: parseWayback, waybackTile: waybackTile };

  if (typeof document === 'undefined' || !document.createElement) return;

  /* =================== Interface =================== */
  var HD = 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', LAB1 = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', LAB2 = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', SHARP = 'contrast(1.14) saturate(1.22) brightness(1.04)';
  var HILL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}';
  var M = { map: null, layers: {}, on: {}, rv: null, rvIdx: 0, rvTimer: null, rvKind: null, gDate: '', wb: null, wbIdx: 0, op: 0.75, measure: false, pts: [], mLine: null, mDots: null, elevT: 0, elev: null, panel: null, wrap: null };
  function esc(s) { try { return escapeHtml(s == null ? '' : String(s)); } catch (e) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); } }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
  function getJSON(url, ms) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 12000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }
  function dayStr(offset) { var d = new Date(Date.now() + offset * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }

  var css = document.createElement('style');
  css.textContent = '.el-btn{position:absolute;left:10px;top:10px;z-index:700;border:0;border-radius:14px;background:#fff;box-shadow:0 2px 10px rgba(20,38,63,.25);padding:9px 13px;font-weight:800;font-size:.82rem;color:#14263f;cursor:pointer;display:flex;gap:7px;align-items:center}' +
    '.el-read{position:absolute;left:10px;top:54px;z-index:650;background:rgba(20,38,63,.88);color:#fff;border-radius:12px;padding:7px 10px;font:600 .72rem/1.45 system-ui,sans-serif;max-width:78%;pointer-events:none}.el-read b{font-weight:800}' +
    '.el-cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;z-index:640;pointer-events:none}.el-cross:before,.el-cross:after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.45)}.el-cross:before{left:10px;top:0;width:2px;height:22px}.el-cross:after{top:10px;left:0;height:2px;width:22px}' +
    '.el-pn{position:absolute;left:0;right:0;bottom:0;z-index:760;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -6px 24px rgba(20,38,63,.25);padding:14px 14px 16px;max-height:62%;overflow-y:auto;color:#14263f;font-family:inherit}' +
    '.el-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.el-h b{font-size:1rem}.el-x{border:0;background:#eef2f8;border-radius:10px;width:34px;height:34px;font-size:1.2rem;cursor:pointer;color:inherit}' +
    '.el-ch{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 10px}.el-ch button{border:1px solid #dde3ec;background:#fff;border-radius:999px;padding:8px 13px;font-weight:700;font-size:.8rem;cursor:pointer;color:inherit}.el-ch button.on{background:#14263f;border-color:#14263f;color:#fff}.el-ch button.bad{opacity:.5;text-decoration:line-through}' +
    '.el-row{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:.82rem}.el-row input[type=range]{flex:1}.el-s{font-size:.74rem;color:#5d6779;margin:2px 0 6px}.el-b{border:1px solid #dde3ec;background:#fff;border-radius:11px;padding:8px 13px;font-weight:700;font-size:.82rem;cursor:pointer;color:inherit}.el-b.p{background:#1b4fd8;border-color:#1b4fd8;color:#fff}' +
    '.el-kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #e9edf3;font-size:.86rem}.el-kv span:first-child{color:#5d6779}.el-kv button{border:0;background:none;color:#1b4fd8;font-weight:700;cursor:pointer;padding:0 0 0 8px}' +
    '.el-3d{position:fixed;inset:0;z-index:2900;background:#0b1626}.el-3d .top{position:absolute;left:0;right:0;top:0;z-index:5;display:flex;gap:8px;align-items:center;padding:max(10px,env(safe-area-inset-top)) 12px 10px;background:linear-gradient(#0b1626cc,#0b162600)}.el-3d .top button{border:0;border-radius:12px;background:#fff;padding:9px 13px;font-weight:800;cursor:pointer}.el-3d .top span{color:#fff;font-weight:700;font-size:.85rem;flex:1}.el-3d #el-3dmap{position:absolute;inset:0}';
  css.textContent += '.el-pin{pointer-events:auto}.el-pin i{display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);margin:-20px 0 0 -10px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);position:relative}.el-pin i:after{content:"";position:absolute;left:5px;top:5px;width:6px;height:6px;border-radius:50%;background:#fff}' +
    '.el-pin span{position:absolute;left:12px;top:-24px;white-space:nowrap;font:700 11px/1.1 system-ui,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000,0 0 2px #000;display:none;max-width:150px;overflow:hidden;text-overflow:ellipsis}.el-lab .el-pin span{display:block}' +
    '.el-pin .c-food{background:#e8590c}.el-pin .c-shop{background:#1b64f2}.el-pin .c-health{background:#d62839}.el-pin .c-faith{background:#6b7a90}.el-pin .c-edu{background:#7048e8}.el-pin .c-stay{background:#0c8599}.el-pin .c-leisure{background:#2f9e44}.el-pin .c-civic{background:#364a6b}.el-pin .c-other{background:#868e96}';
  document.head.appendChild(css);

  /* ----- couches ----- */
  function tileLayer(url, o) { var L = window.L; return L.tileLayer(url, Object.assign({ maxZoom: 20, opacity: M.op, zIndex: 400 }, o || {})); }
  function failed(key, why) { var b = M.panel && M.panel.querySelector('[data-el-l="' + key + '"]'); if (b) b.classList.add('bad'); M.on[key] = false; removeLayer(key); toast('Couche indisponible pour le moment : ' + why, 'error'); updateChips(); }
  function removeLayer(key) { var m = M.map, l = M.layers[key]; if (l) { try { (Array.isArray(l) ? l : [l]).forEach(function (x) { m.removeLayer(x); }); } catch (e) { /* ignore */ } } delete M.layers[key]; if ((key === 'radar' || key === 'ir') && M.rvTimer) { clearInterval(M.rvTimer); M.rvTimer = null; } }
  /* Repli : tuile du niveau supérieur recadrée et agrandie. Renvoie false quand il n'y a plus rien à essayer. */
  function applyFallback(tile, coords, tpl) {
    var k = (tile.__cnk || 0) + 1; if (k > 4 || coords.z - k < 0) { tile.style.visibility = 'hidden'; return false; }
    tile.__cnk = k; var c = parentCrop(coords.z, coords.x, coords.y, k), st = tile.style;
    st.width = st.height = c.size + 'px'; st.marginLeft = -c.ox + 'px'; st.marginTop = -c.oy + 'px'; st.maxWidth = 'none';
    st.clipPath = 'inset(' + c.oy + 'px ' + (c.size - c.ox - 256) + 'px ' + (c.size - c.oy - 256) + 'px ' + c.ox + 'px)';
    tile.src = tpl.replace('{z}', c.z).replace('{x}', c.x).replace('{y}', c.y); return true;
  }
  function smartLayer(tpl, o) { var l = tileLayer(tpl, o); l.on('tileerror', function (e) { if (e.tile && e.coords) applyFallback(e.tile, e.coords, tpl); }); return l; }
  function guard(layer, key, why) { var errs = 0, ok = false; layer.on('tileload', function () { ok = true; errs = 0; }); layer.on('tileerror', function () { errs++; if (!ok && errs >= 6) failed(key, why); }); return layer; }
  function loadRV() {
    if (M.rv) return Promise.resolve(M.rv);
    return getJSON('https://api.rainviewer.com/public/weather-maps.json').then(function (j) { var p = parseRainViewer(j); if (!p) throw new Error('format'); M.rv = p; return p; });
  }
  function showRVFrame(kind, i) {
    var arr = kind === 'radar' ? M.rv.radar : M.rv.infrared; if (!arr.length) return; i = (i + arr.length) % arr.length; M.rvIdx = i;
    var key = kind === 'radar' ? 'radar' : 'ir', set = M.layers[key]; if (!set || !Array.isArray(set)) return;
    arr.forEach(function (f, k) { if (!set[k] && k === i) { set[k] = guard(tileLayer(rvTile(M.rv.host, f.path, kind), { opacity: 0, maxNativeZoom: kind === 'radar' ? 7 : 6 }), key, kind === 'radar' ? 'radar de pluie' : 'nuages satellite'); set[k].addTo(M.map); } if (set[k]) set[k].setOpacity(k === i ? M.op : 0); });
    var f = arr[i], lab = document.getElementById('el-rvt'), sl = document.getElementById('el-rvs');
    if (lab) lab.textContent = new Date(f.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + (f.forecast ? ' · prévision' : '');
    if (sl) sl.value = i;
  }
  function playRV(kind) {
    if (M.rvTimer) { clearInterval(M.rvTimer); M.rvTimer = null; drawPanel(); return; }
    M.rvTimer = setInterval(function () { showRVFrame(kind, M.rvIdx + 1); }, 700); drawPanel();
  }
  function toggle(key) {
    var L = window.L, m = M.map; if (!L || !m) return;
    if (M.on[key]) { M.on[key] = false; if (key === 'sharp') setSharp(false); removeLayer(key); if ((key === 'radar' || key === 'ir') && M.rvKind === (key === 'radar' ? 'radar' : 'infrared')) M.rvKind = null; drawPanel(); return; }
    var chip = M.panel && M.panel.querySelector('[data-el-l="' + key + '"]'); if (chip) chip.classList.remove('bad');
    if (key === 'sharp') { M.on.sharp = true; setSharp(true); drawPanel(); return; }
    if (key === 'radar' || key === 'ir') {
      ['radar', 'ir'].forEach(function (k) { if (M.on[k]) { M.on[k] = false; removeLayer(k); } });
      M.on[key] = true; M.rvKind = key === 'radar' ? 'radar' : 'infrared'; drawPanel();
      loadRV().then(function (rv) {
        var arr = key === 'radar' ? rv.radar : rv.infrared; if (!arr.length) throw new Error('vide');
        M.layers[key] = []; var now = Date.now(), idx = 0; arr.forEach(function (f, k) { if (!f.forecast && f.time <= now) idx = k; });
        showRVFrame(M.rvKind, idx); drawPanel();
      }).catch(function (e) { failed(key, key === 'radar' ? 'radar de pluie (' + (e && e.message || 'réseau') + ')' : 'nuages satellite (' + (e && e.message || 'réseau') + ')'); });
      return;
    }
    M.on[key] = true;
    if (key === 'truecolor' || key === 'fires' || key === 'night') {
      var g = GIBS[key]; M.layers[key] = guard(tileLayer(gibsTile(key, M.gDate), { maxNativeZoom: g.level, attribution: 'NASA GIBS / EOSDIS' }), key, key === 'truecolor' ? 'image NASA' : key === 'fires' ? 'feux actifs' : 'lumières nocturnes').addTo(m);
    } else if (key === 'pins') {
      M.layers.pins = window.L.layerGroup().addTo(m); M.pinKeys = {}; schedulePins(true);
    } else if (key === 'hd') {
      M.layers.hd = guard(smartLayer(HD, { maxZoom: 22, maxNativeZoom: 19, opacity: 1, zIndex: 440, attribution: 'Imagery © Esri Clarity, Maxar, Earthstar Geographics' }), 'hd', 'satellite HD').addTo(m);
      if (!M.hdTip) { M.hdTip = 1; toast('Satellite HD : zoomez jusqu’au bout, l’image la plus nette disponible s’affiche.', 'info'); }
    } else if (key === 'labels') {
      M.layers.labels = [smartLayer(LAB1, { maxZoom: 22, maxNativeZoom: 19, opacity: 1, zIndex: 700, attribution: 'Esri' }).addTo(m), smartLayer(LAB2, { maxZoom: 22, maxNativeZoom: 19, opacity: .9, zIndex: 690 }).addTo(m)];
    } else if (key === 'hill') {
      M.layers.hill = guard(tileLayer(HILL, { maxNativeZoom: 16, opacity: .55, attribution: 'Esri' }), 'hill', 'relief').addTo(m);
    } else if (key === 'wayback') {
      M.on.wayback = true; drawPanel();
      var go = function (wb) { M.wb = wb; if (!wb.length) { failed('wayback', 'archives'); return; } M.wbIdx = 0; setWayback(0); drawPanel(); };
      if (M.wb) go(M.wb); else getJSON('https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json', 20000).then(function (c) { go(parseWayback(c)); }).catch(function () { failed('wayback', 'archives'); });
      return;
    }
    drawPanel();
  }
  function setWayback(i) {
    if (!M.wb || !M.wb[i]) return; M.wbIdx = i; var m = M.map, L = window.L;
    if (M.layers.wayback) { try { m.removeLayer(M.layers.wayback); } catch (e) { /* ignore */ } }
    M.layers.wayback = guard(L.tileLayer(waybackTile(M.wb[i].id), { maxZoom: 20, maxNativeZoom: 17, opacity: 1, zIndex: 450, attribution: 'Esri Wayback · Maxar, Earthstar Geographics' }), 'wayback', 'archives').addTo(m);
    var lab = document.getElementById('el-wbt'); if (lab) lab.textContent = new Date(M.wb[i].date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  function setOpacity(v) { M.op = v; Object.keys(M.layers).forEach(function (k) { if (k === 'wayback' || k === 'hd' || k === 'labels') return; var l = M.layers[k]; if (Array.isArray(l)) { l.forEach(function (x, i) { if (x && i === M.rvIdx) x.setOpacity(v); }); } else if (l && l.setOpacity && k !== 'hill') l.setOpacity(v); }); }
  /* ----- repères sur la carte (style Google Earth) ----- */
  var pinT = 0, pinCtl = null, pinCache = {};
  function schedulePins(now) { clearTimeout(pinT); if (!M.on.pins) return; pinT = setTimeout(loadPins, now ? 50 : 900); }
  function pinEndpoints(q) { return ['https://overpass-api.de/api/interpreter?data=', 'https://overpass.kumi.systems/api/interpreter?data='].map(function (u) { return u + encodeURIComponent(q); }); }
  function loadPins() {
    var m = M.map; if (!m || !M.on.pins || !M.layers.pins) return; var z = m.getZoom(), wrap = M.wrap;
    if (wrap) wrap.classList.toggle('el-lab', z >= 17);
    if (z < 15) { M.layers.pins.clearLayers(); M.pinKeys = {}; if (!M.pinHint) { M.pinHint = 1; toast('Zoomez pour voir les lieux : commerces, écoles, hôpitaux, lieux de culte…', 'info'); } return; }
    M.pinHint = 0; var b = m.getBounds(), q = '[out:json][timeout:20];nwr[name][~"^(amenity|shop|tourism|leisure|office|healthcare|historic)$"~"."](' + b.getSouth().toFixed(5) + ',' + b.getWest().toFixed(5) + ',' + b.getNorth().toFixed(5) + ',' + b.getEast().toFixed(5) + ');out center 250;';
    var ck = z + '|' + b.getSouth().toFixed(3) + '|' + b.getWest().toFixed(3) + '|' + b.getNorth().toFixed(3) + '|' + b.getEast().toFixed(3);
    var draw = function (j) { var c = m.getCenter(), arr = parseOverpass(j, { lat: c.lat, lng: c.lng }, 220); arr.forEach(function (p) {
        var id = p.name + '|' + p.lat.toFixed(5) + '|' + p.lng.toFixed(5); if (M.pinKeys[id]) return; M.pinKeys[id] = 1;
        var L = window.L, mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'el-pin', html: '<i class="c-' + p.cat + '"></i><span>' + esc(p.name) + '</span>', iconSize: [0, 0] }), keyboard: false });
        mk.bindPopup('<b>' + esc(p.name) + '</b><br>' + esc(p.type)); M.layers.pins && M.layers.pins.addLayer(mk); });
      var n = Object.keys(M.pinKeys).length; if (n > 600) { M.layers.pins.clearLayers(); M.pinKeys = {}; } };
    if (pinCache[ck]) { draw(pinCache[ck]); return; }
    if (pinCtl) { try { pinCtl.abort(); } catch (e) { /* ignore */ } } pinCtl = typeof AbortController === 'function' ? new AbortController() : null;
    var tryEp = function (i) { var eps = pinEndpoints(q); if (i >= eps.length) return Promise.reject(new Error('indisponible')); return fetch(eps[i], pinCtl ? { signal: pinCtl.signal } : {}).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }).catch(function (e) { if (e && e.name === 'AbortError') throw e; return tryEp(i + 1); }); };
    tryEp(0).then(function (j) { pinCache[ck] = j; draw(j); }).catch(function (e) { if (e && e.name === 'AbortError') return; if (!M.pinFail) { M.pinFail = 1; toast('Les lieux sont momentanément indisponibles.', 'error'); setTimeout(function () { M.pinFail = 0; }, 30000); } });
  }
  var EARTH = ['hd', 'labels', 'pins', 'sharp'];
  function earthOn() { return EARTH.every(function (k) { return M.on[k]; }); }
  function setEarth(on) { EARTH.forEach(function (k) { if (!!M.on[k] !== on) toggle(k); }); try { localStorage.setItem('cn-el-mode', on ? '1' : '0'); } catch (e) { /* ignore */ } drawPanel(); }
  function setSharp(on) { try { var p = M.map.getPane('tilePane'); if (p) p.style.filter = on ? SHARP : ''; } catch (e) { /* ignore */ } }
  function updateChips() { if (!M.panel) return; M.panel.querySelectorAll('[data-el-l]').forEach(function (b) { b.classList.toggle('on', !!M.on[b.getAttribute('data-el-l')]); }); }

  /* ----- panneau ----- */
  var CH = [['pins', 'Lieux et commerces'], ['hd', 'Satellite HD'], ['labels', 'Noms et routes'], ['sharp', 'Netteté +'], ['radar', 'Radar de pluie'], ['ir', 'Nuages (satellite)'], ['truecolor', 'Image NASA du jour'], ['fires', 'Feux actifs'], ['night', 'Lumières nocturnes'], ['hill', 'Relief ombré'], ['wayback', 'Archives satellite']];
  function drawPanel() {
    if (!M.panel) return; var on = M.on, h = '<div class="el-h"><b>Terre en direct</b><button class="el-x" data-el="close" aria-label="Fermer">×</button></div>';
    h += '<div class="el-ch"><button type="button" data-el="earth" class="' + (earthOn() ? 'on' : '') + '">Mode Earth : ' + (earthOn() ? 'activé' : 'désactivé') + '</button></div><div class="el-s">Images satellite réelles de la NASA, d’Esri et de RainViewer. Touchez une couche pour l’afficher sur la carte.</div><div class="el-ch">' + CH.map(function (c) { return '<button type="button" data-el-l="' + c[0] + '" class="' + (on[c[0]] ? 'on' : '') + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
    if (on.radar || on.ir) { var kind = on.radar ? 'radar' : 'infrared', n = M.rv ? (kind === 'radar' ? M.rv.radar : M.rv.infrared).length : 0; h += '<div class="el-row"><button class="el-b p" data-el="play">' + (M.rvTimer ? 'Pause' : 'Lecture') + '</button><input type="range" id="el-rvs" min="0" max="' + Math.max(0, n - 1) + '" value="' + M.rvIdx + '"><b id="el-rvt" style="min-width:90px;text-align:right"></b></div><div class="el-s">' + (on.radar ? 'Pluie des 2 dernières heures et prévision à court terme.' : 'Nuages vus par satellite infrarouge, mis à jour toutes les 10 minutes environ.') + '</div>'; }
    if (on.truecolor || on.fires) { h += '<div class="el-row"><span>Date</span><input type="date" id="el-gd" class="text-input" value="' + esc(M.gDate) + '" max="' + dayStr(0) + '" style="flex:1"><button class="el-b" data-el="yday">Hier</button></div><div class="el-s">Passage du satellite NASA : l’image d’aujourd’hui peut n’être disponible que partiellement. Les zones nuageuses restent blanches.</div>'; }
    if (on.wayback) { var wbn = M.wb ? M.wb.length : 0; h += wbn ? '<div class="el-row"><span>Plus ancien</span><input type="range" id="el-wbs" min="0" max="' + (wbn - 1) + '" value="' + M.wbIdx + '" style="direction:rtl"><span>Récent</span></div><div class="el-row"><b>Image de <span id="el-wbt"></span></b></div><div class="el-s">Comparez le même lieu au fil des années (constructions, routes, forêts). Zoomez pour plus de détails.</div>' : '<div class="el-s">Chargement des archives…</div>'; }
    h += '<div class="el-row"><span>Transparence</span><input type="range" id="el-op" min="20" max="100" value="' + Math.round(M.op * 100) + '"></div>';
    h += '<div class="el-ch"><button type="button" data-el="measure" class="' + (M.measure ? 'on' : '') + '">' + (M.measure ? 'Mesure en cours' : 'Mesurer') + '</button><button type="button" data-el="point">Fiche du point central</button><button type="button" data-el="poi">Que trouve-t-on ici ?</button><button type="button" data-el="3d">Vue 3D (bêta)</button></div>';
    if (M.measure) h += '<div class="el-s" id="el-mres"></div><div class="el-ch"><button type="button" data-el="undo">Annuler le point</button><button type="button" data-el="clear">Effacer</button></div>';
    M.panel.innerHTML = h;
    if (on.wayback && M.wb) { var lab = document.getElementById('el-wbt'); if (lab && M.wb[M.wbIdx]) lab.textContent = new Date(M.wb[M.wbIdx].date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
    if (M.rv && (on.radar || on.ir)) showRVFrame(on.radar ? 'radar' : 'infrared', M.rvIdx);
    if (M.measure) drawMeasure();
  }
  function openPanel() {
    if (M.panel) { M.panel.remove(); M.panel = null; return; }
    var p = document.createElement('div'); p.className = 'el-pn'; M.wrap.appendChild(p); M.panel = p;
    ['mousedown', 'touchstart', 'dblclick', 'wheel'].forEach(function (ev) { p.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    p.addEventListener('click', function (e) {
      var l = e.target.closest && e.target.closest('[data-el-l]'); if (l) { toggle(l.getAttribute('data-el-l')); return; }
      var a = e.target.closest && e.target.closest('[data-el]'); if (!a) return; var act = a.getAttribute('data-el');
      if (act === 'close') { M.panel.remove(); M.panel = null; }
      else if (act === 'play') playRV(M.on.radar ? 'radar' : 'infrared');
      else if (act === 'yday') { M.gDate = dayStr(-1); reloadGibs(); drawPanel(); }
      else if (act === 'measure') { M.measure = !M.measure; if (!M.measure) clearMeasure(); drawPanel(); }
      else if (act === 'undo') { M.pts.pop(); drawMeasure(); } else if (act === 'clear') { clearMeasure(); drawMeasure(); }
      else if (act === 'point') openPoint(); else if (act === 'poi') openPoi(); else if (act === 'earth') setEarth(!earthOn()); else if (act === '3d') open3D();
    });
    p.addEventListener('input', function (e) {
      var t = e.target; if (t.id === 'el-op') setOpacity(t.value / 100);
      else if (t.id === 'el-rvs') { if (M.rvTimer) { clearInterval(M.rvTimer); M.rvTimer = null; } showRVFrame(M.on.radar ? 'radar' : 'infrared', parseInt(t.value, 10)); }
      else if (t.id === 'el-wbs') setWayback(parseInt(t.value, 10));
    });
    p.addEventListener('change', function (e) { if (e.target.id === 'el-gd' && e.target.value) { M.gDate = e.target.value; reloadGibs(); } });
    drawPanel();
  }
  function reloadGibs() { ['truecolor', 'fires'].forEach(function (k) { if (M.on[k]) { removeLayer(k); M.on[k] = false; toggle(k); } }); }

  /* ----- mesure ----- */
  function clearMeasure() { M.pts = []; if (M.mLine) { try { M.map.removeLayer(M.mLine); } catch (e) { /* ignore */ } M.mLine = null; } if (M.mDots) { try { M.map.removeLayer(M.mDots); } catch (e) { /* ignore */ } M.mDots = null; } }
  function drawMeasure() {
    var L = window.L, m = M.map; if (!L || !m) return;
    if (M.mLine) { try { m.removeLayer(M.mLine); } catch (e) { /* ignore */ } M.mLine = null; } if (M.mDots) { try { m.removeLayer(M.mDots); } catch (e) { /* ignore */ } M.mDots = null; }
    var ll = M.pts.map(function (p) { return [p.lat, p.lng]; });
    if (ll.length > 2) M.mLine = L.polygon(ll, { color: '#e8590c', weight: 3, fillOpacity: .15 }).addTo(m); else if (ll.length === 2) M.mLine = L.polyline(ll, { color: '#e8590c', weight: 3 }).addTo(m);
    M.mDots = L.layerGroup(ll.map(function (c) { return L.circleMarker(c, { radius: 6, color: '#fff', weight: 2, fillColor: '#e8590c', fillOpacity: 1 }); })).addTo(m);
    var el = document.getElementById('el-mres'); if (!el) return;
    el.innerHTML = !M.pts.length ? 'Touchez la carte pour placer le premier point.' : '<b>' + fmtDist(pathLength(M.pts)) + '</b>' + (M.pts.length > 2 ? ' · périmètre ' + fmtDist(pathLength(M.pts.concat([M.pts[0]]))) + ' · surface <b>' + fmtArea(polyArea(M.pts)) + '</b>' : '') + ' · ' + M.pts.length + ' point' + (M.pts.length > 1 ? 's' : '');
  }

  /* ----- lecture au centre + fiche du point ----- */
  function drawRead() {
    var m = M.map, r = M.wrap && M.wrap.querySelector('.el-read'); if (!m || !r) return;
    var c = m.getCenter(), z = m.getZoom(), mpp = 156543.03392 * Math.cos(c.lat * RAD) / Math.pow(2, z);
    var sun = sunPosition(new Date(), c.lat, c.lng);
    r.innerHTML = '<b>' + c.lat.toFixed(6) + ', ' + c.lng.toFixed(6) + '</b><br>Zoom ' + z + ' · 1 pixel ≈ ' + (mpp < 1 ? (mpp * 100).toFixed(0) + ' cm' : mpp.toFixed(1) + ' m') + (M.elev != null ? ' · altitude ' + Math.round(M.elev) + ' m' : '') + ' · soleil ' + Math.round(sun.altitude) + '° ' + (sun.altitude < 0 ? '(nuit)' : '');
  }
  function fetchElev(lat, lng) { return getJSON('https://api.open-meteo.com/v1/elevation?latitude=' + lat.toFixed(5) + '&longitude=' + lng.toFixed(5), 8000).then(function (j) { return j && j.elevation && j.elevation[0] != null ? Number(j.elevation[0]) : null; }); }
  function onMove() {
    drawRead(); clearTimeout(M.elevT);
    M.elevT = setTimeout(function () { var c = M.map && M.map.getCenter(); if (!c) return; fetchElev(c.lat, c.lng).then(function (e) { M.elev = e; drawRead(); }).catch(function () { /* facultatif */ }); }, 700);
  }
  function openPoint() {
    var c = M.map.getCenter(), lat = c.lat, lng = c.lng, o = document.createElement('div'); o.className = 'el-pn'; o.style.zIndex = 800;
    var sun = sunPosition(new Date(), lat, lng), utm = toUTM(lat, lng), pc = plusCode(lat, lng);
    var dd = lat.toFixed(6) + ', ' + lng.toFixed(6), dms = toDMS(lat, true) + '  ' + toDMS(lng, false);
    var kv = function (k, v, copy) { return '<div class="el-kv"><span>' + k + '</span><span>' + esc(v) + (copy ? '<button data-cp="' + esc(copy) + '">Copier</button>' : '') + '</span></div>'; };
    o.innerHTML = '<div class="el-h"><b>Fiche du point</b><button class="el-x" data-x="1" aria-label="Fermer">×</button></div>' + kv('Coordonnées (DD)', dd, dd) + kv('Degrés, minutes, secondes', dms, dms) + kv('UTM', utm.text, utm.text) + kv('Plus Code', pc, pc) + '<div id="el-pe">' + kv('Altitude', M.elev != null ? Math.round(M.elev) + ' m' : 'calcul…') + '</div>' +
      kv('Soleil maintenant', 'hauteur ' + Math.round(sun.altitude) + '° · azimut ' + Math.round(sun.azimuth) + '°') +
      '<div class="el-ch" style="margin-top:10px"><a class="el-b p" target="_blank" rel="noopener" href="https://earth.google.com/web/@' + lat.toFixed(6) + ',' + lng.toFixed(6) + ',' + Math.round(M.elev || 0) + 'a,800d,35y,0h,45t,0r">Ouvrir dans Google Earth</a><a class="el-b" target="_blank" rel="noopener" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat.toFixed(6) + ',' + lng.toFixed(6) + '">Street View</a><button class="el-b" data-sh="1">Partager</button></div>';
    M.wrap.appendChild(o);
    ['mousedown', 'touchstart', 'dblclick', 'wheel'].forEach(function (ev) { o.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    o.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) { o.remove(); return; }
      var cp = e.target.closest('[data-cp]'); if (cp) { try { navigator.clipboard.writeText(cp.getAttribute('data-cp')).then(function () { toast('Copié', 'success'); }); } catch (er) { toast('Copie impossible', 'error'); } return; }
      if (e.target.closest('[data-sh]')) { var url = 'https://www.google.com/maps/search/?api=1&query=' + lat.toFixed(6) + ',' + lng.toFixed(6), txt = 'Ma position : ' + dd + ' (' + pc + ')'; if (navigator.share) navigator.share({ title: 'Position', text: txt, url: url }).catch(function () { /* annulé */ }); else { try { navigator.clipboard.writeText(txt + ' ' + url); toast('Lien copié', 'success'); } catch (er) { /* ignore */ } } }
    });
    fetchElev(lat, lng).then(function (el) { M.elev = el; var d = o.querySelector('#el-pe'); if (d) d.innerHTML = kv('Altitude', el != null ? Math.round(el) + ' m' : 'indisponible'); }).catch(function () { var d = o.querySelector('#el-pe'); if (d) d.innerHTML = kv('Altitude', 'indisponible'); });
  }

  /* ----- Que trouve-t-on ici ? ----- */
  function openPoi() {
    var m = M.map, c = m.getCenter(), z = m.getZoom(), R = z >= 18 ? 150 : z >= 16 ? 350 : z >= 14 ? 800 : 1500, o = document.createElement('div'); o.className = 'el-pn'; o.style.zIndex = 810;
    o.innerHTML = '<div class="el-h"><b>Que trouve-t-on ici ?</b><button class="el-x" data-x="1" aria-label="Fermer">×</button></div><div class="el-s">Lieux nommés dans un rayon de ' + (R >= 1000 ? (R / 1000) + ' km' : R + ' m') + ' autour du centre de la carte. Zoomez pour affiner.</div><div id="el-poil">Recherche en cours…</div>';
    M.wrap.appendChild(o);
    ['mousedown', 'touchstart', 'dblclick', 'wheel'].forEach(function (ev) { o.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    var list = o.querySelector('#el-poil'), items = [];
    o.addEventListener('click', function (e) { if (e.target.closest('[data-x]')) { o.remove(); return; } var r = e.target.closest('[data-i]'); if (!r) return; var it = items[+r.getAttribute('data-i')]; if (it) { m.setView([it.lat, it.lng], Math.max(m.getZoom(), 19)); o.remove(); } });
    var q = '[out:json][timeout:15];nwr(around:' + R + ',' + c.lat.toFixed(6) + ',' + c.lng.toFixed(6) + ')[name][~"^(amenity|shop|tourism|leisure|office|healthcare|historic)$"~"."];out center 120;';
    var wiki = 'https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=' + c.lat.toFixed(6) + '%7C' + c.lng.toFixed(6) + '&gsradius=' + Math.min(10000, R * 3) + '&gslimit=6&format=json&origin=*';
    Promise.all([getJSON('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q), 18000).catch(function () { return null; }), getJSON(wiki, 10000).catch(function () { return null; })]).then(function (r) {
      var pc = { lat: c.lat, lng: c.lng }; items = (r[0] ? parseOverpass(r[0], pc) : []).slice(0, 30);
      var wk = parseWikiGeo(r[1]).map(function (w) { return { name: w.title, type: 'Repère Wikipédia', lat: w.lat, lng: w.lng, dist: w.dist }; });
      items = items.concat(wk);
      if (!items.length) { list.innerHTML = r[0] || r[1] ? 'Aucun lieu nommé trouvé ici. Essayez de dézoomer un peu.' : 'Service momentanément indisponible. Réessayez dans un instant.'; return; }
      list.innerHTML = items.map(function (it, i) { return '<div class="el-kv" data-i="' + i + '" style="cursor:pointer"><span><b style="color:#14263f">' + esc(it.name) + '</b><br><small>' + esc(it.type) + '</small></span><span>' + esc(fmtDist(it.dist)) + '</span></div>'; }).join('');
    });
  }

  /* ----- vue 3D (bêta) ----- */
  var ML_JS = ['https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.js', 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.6.0/maplibre-gl.min.js'], ML_CSS = ['https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.css', 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.6.0/maplibre-gl.min.css'];
  var mlP = null;
  function loadML() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl); if (mlP) return mlP;
    var tryCss = function (i) { if (i >= ML_CSS.length) return; var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ML_CSS[i]; l.onerror = function () { l.remove(); tryCss(i + 1); }; document.head.appendChild(l); };
    tryCss(0);
    var tryJs = function (i) { return new Promise(function (res, rej) { if (i >= ML_JS.length) { rej(new Error('lib')); return; } var s = document.createElement('script'); s.src = ML_JS[i]; s.async = true; s.onload = function () { window.maplibregl ? res(window.maplibregl) : tryJs(i + 1).then(res, rej); }; s.onerror = function () { s.remove(); tryJs(i + 1).then(res, rej); }; document.head.appendChild(s); }); };
    mlP = tryJs(0); mlP.catch(function () { mlP = null; }); return mlP;
  }
  function webgl() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  function open3D() {
    if (!webgl()) { toast('Votre appareil ne permet pas l’affichage 3D.', 'error'); return; }
    var c = M.map.getCenter(), z = Math.max(11, Math.min(15, M.map.getZoom())), ov = document.createElement('div'); ov.className = 'el-3d';
    ov.innerHTML = '<div class="top"><button data-d="close">Fermer</button><span>Vue 3D · inclinez avec deux doigts</span><button data-d="up">Relief +</button><button data-d="dn">Relief −</button></div><div id="el-3dmap"></div>';
    document.body.appendChild(ov); var ex = 1.5, map3 = null;
    ov.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-d]'); if (!b) return; var a = b.getAttribute('data-d'); if (a === 'close') { try { if (map3) map3.remove(); } catch (er) { /* ignore */ } ov.remove(); } else if (map3) { ex = Math.max(0.5, Math.min(4, ex + (a === 'up' ? 0.5 : -0.5))); try { map3.setTerrain({ source: 'dem', exaggeration: ex }); } catch (er) { /* ignore */ } } });
    loadML().then(function (ml) {
      map3 = new ml.Map({
        container: 'el-3dmap', center: [c.lng, c.lat], zoom: z, pitch: 62, bearing: 20, maxPitch: 80, attributionControl: { compact: true },
        style: { version: 8, sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 17, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }, dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 14, encoding: 'terrarium', attribution: 'Terrain © Mapzen, AWS' } }, layers: [{ id: 'sat', type: 'raster', source: 'sat' }], terrain: { source: 'dem', exaggeration: ex } }
      });
      map3.addControl(new ml.NavigationControl({ visualizePitch: true }), 'bottom-right');
      map3.on('error', function () { /* tuiles manquantes : on continue */ });
    }).catch(function () { ov.remove(); toast('La vue 3D n’a pas pu être chargée. Vérifiez votre connexion et réessayez.', 'error'); });
  }

  /* ----- montage sur la carte du Centre de localisation ----- */
  function onMap(m) {
    var wrap = (m.getContainer() && m.getContainer().closest && m.getContainer().closest('.lc-mapwrap')) || (m.getContainer() && m.getContainer().parentElement); if (!wrap || wrap.querySelector('.el-btn')) return;
    if (M.map && M.map !== m) { try { removeAllLayers(); } catch (e) { /* ignore */ } }
    M.map = m; M.wrap = wrap; M.layers = {}; M.on = {}; M.pts = []; M.measure = false; M.rvKind = null; M.gDate = dayStr(-1);
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'el-btn'; b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>Terre en direct';
    var r = document.createElement('div'); r.className = 'el-read'; var x = document.createElement('div'); x.className = 'el-cross';
    wrap.appendChild(b); wrap.appendChild(r); wrap.appendChild(x);
    ['mousedown', 'touchstart', 'dblclick'].forEach(function (ev) { b.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    b.addEventListener('click', openPanel);
    m.on('moveend zoomend', onMove); m.on('move', drawRead);
    m.on('click', function (e) { if (!M.measure) return; M.pts.push({ lat: e.latlng.lat, lng: e.latlng.lng }); drawMeasure(); });
    m.on('unload', function () { removeAllLayers(); if (M.map === m) { M.map = null; M.wrap = null; M.panel = null; } });
    m.on('moveend', function () { schedulePins(false); });
    drawRead(); onMove();
    var pref = null; try { pref = localStorage.getItem('cn-el-mode'); } catch (e) { /* ignore */ }
    if (pref !== '0') setTimeout(function () { if (M.map === m && !earthOn()) setEarth(true); }, 400);
  }
  function removeAllLayers() { setSharp(false); Object.keys(M.layers).forEach(removeLayer); if (M.rvTimer) { clearInterval(M.rvTimer); M.rvTimer = null; } clearMeasure(); }
  function hookL(L) { try { if (L && L.Map && L.Map.addInitHook && !L.__cnEarth) { L.__cnEarth = true; L.Map.addInitHook(function () { var m = this; setTimeout(function () { try { var c = m.getContainer(); if (c && c.id === 'lc-map') onMap(m); } catch (e) { /* ignore */ } }, 50); }); } } catch (e) { /* ignore */ } }
  (function watchL() {
    if (window.L) { hookL(window.L); return; }
    try { var cur; Object.defineProperty(window, 'L', { configurable: true, enumerable: true, get: function () { return cur; }, set: function (v) { cur = v; hookL(v); } }); }
    catch (e) { var iv = setInterval(function () { if (window.L) { clearInterval(iv); hookL(window.L); } }, 400); }
  })();
})();
