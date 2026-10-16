/* Coeurnoh Universe — Centre de localisation : précision, mouvement en direct, météo complète.
   Add-on autonome : s'insère dans l'onglet Position (#lc-tabbody) sans toucher à location-center.js.
   Météo : Open-Meteo (sans clé). Aucune donnée n'est envoyée ailleurs que les coordonnées arrondies. */
(function () {
  'use strict';
  if (window.__cnLocPro) return; window.__cnLocPro = true;

  var FR = {
    live: 'Position en direct', acc: 'Précision', speed: 'Vitesse', head: 'Cap', alt: 'Altitude', dist: 'Distance', dur: 'Durée', trk: 'Suivi du déplacement',
    good: 'Très précis', mid: 'Correct', low: 'Approximatif', wait: 'Recherche du signal…', still: 'À l’arrêt', move: 'En mouvement', reset: 'Remettre à zéro',
    wx: 'Météo ici', feels: 'Ressenti', hum: 'Humidité', wind: 'Vent', gust: 'Rafales', press: 'Pression', uv: 'Indice UV', vis: 'Visibilité', rain: 'Précipitations',
    sun: 'Lever / coucher', aq: 'Qualité de l’air', hourly: 'Prochaines 24 h', daily: '7 prochains jours', today: 'Auj.', wxerr: 'Météo indisponible pour le moment.', retry: 'Réessayer',
    loading: 'Chargement de la météo…', upd: 'Mis à jour', cloud: 'Nébulosité', lvl: ['Bon', 'Correct', 'Moyen', 'Mauvais', 'Très mauvais', 'Dangereux'],
    uvl: ['Faible', 'Modéré', 'Élevé', 'Très élevé', 'Extrême'], n: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], uvhint: ['Aucune protection requise', 'Chapeau et crème conseillés', 'Évitez le soleil de midi', 'Protection indispensable', 'Restez à l’ombre'],
    wmo: { 0: 'Ciel dégagé', 1: 'Plutôt dégagé', 2: 'Partiellement nuageux', 3: 'Couvert', 45: 'Brouillard', 48: 'Brouillard givrant', 51: 'Bruine légère', 53: 'Bruine', 55: 'Bruine forte', 61: 'Pluie légère', 63: 'Pluie', 65: 'Pluie forte', 66: 'Pluie verglaçante', 67: 'Pluie verglaçante', 71: 'Neige légère', 73: 'Neige', 75: 'Neige forte', 77: 'Grains de neige', 80: 'Averses légères', 81: 'Averses', 82: 'Averses violentes', 85: 'Averses de neige', 86: 'Averses de neige', 95: 'Orage', 96: 'Orage et grêle', 99: 'Orage et grêle' },
    d: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  };
  var EN = {
    live: 'Live position', acc: 'Accuracy', speed: 'Speed', head: 'Heading', alt: 'Altitude', dist: 'Distance', dur: 'Duration', trk: 'Movement tracking',
    good: 'Very precise', mid: 'Fair', low: 'Approximate', wait: 'Looking for signal…', still: 'Stationary', move: 'Moving', reset: 'Reset',
    wx: 'Weather here', feels: 'Feels like', hum: 'Humidity', wind: 'Wind', gust: 'Gusts', press: 'Pressure', uv: 'UV index', vis: 'Visibility', rain: 'Precipitation',
    sun: 'Sunrise / sunset', aq: 'Air quality', hourly: 'Next 24 h', daily: 'Next 7 days', today: 'Today', wxerr: 'Weather unavailable right now.', retry: 'Retry',
    loading: 'Loading weather…', upd: 'Updated', cloud: 'Cloud cover', lvl: ['Good', 'Fair', 'Moderate', 'Poor', 'Very poor', 'Hazardous'],
    uvl: ['Low', 'Moderate', 'High', 'Very high', 'Extreme'], n: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], uvhint: ['No protection needed', 'Hat and sunscreen advised', 'Avoid midday sun', 'Protection essential', 'Stay in the shade'],
    wmo: { 0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Thunderstorm, hail' },
    d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };
  function L() { var l = 'fr'; try { l = (currentLang === 'en') ? 'en' : 'fr'; } catch (e) { /* ignore */ } return l === 'en' ? EN : FR; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v.toFixed(d || 0) : '–'; }

  /* ---------- Icônes météo (SVG, sans emoji) ---------- */
  function wxKind(c) {
    if (c === 0 || c === 1) return 'sun'; if (c === 2) return 'part'; if (c === 3) return 'cloud';
    if (c === 45 || c === 48) return 'fog'; if (c >= 71 && c <= 77 || c === 85 || c === 86) return 'snow';
    if (c >= 95) return 'storm'; return 'rain';
  }
  function wxIcon(c, night, sz) {
    var k = wxKind(c), s = sz || 28, col = '#f59f00', cl = '#7a8699';
    var sun = '<circle cx="12" cy="12" r="4.2" fill="' + col + '"/><g stroke="' + col + '" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></g>';
    var moon = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="#adb5bd"/>';
    var cloud = '<path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z" fill="' + cl + '"/>';
    var g = '';
    if (k === 'sun') g = night ? moon : sun;
    else if (k === 'part') g = (night ? '<g transform="translate(-3,-3) scale(.7)">' + moon + '</g>' : '<g transform="translate(-3,-3) scale(.7)">' + sun + '</g>') + '<g transform="translate(2,2) scale(.85)">' + cloud + '</g>';
    else if (k === 'cloud') g = cloud;
    else if (k === 'fog') g = '<g stroke="' + cl + '" stroke-width="2" stroke-linecap="round"><path d="M4 9h16M6 13h14M4 17h12"/></g>';
    else if (k === 'snow') g = '<g transform="translate(0,-3)">' + cloud + '</g><g stroke="#4dabf7" stroke-width="1.8" stroke-linecap="round"><path d="M8 19.5v.1M12 21v.1M16 19.5v.1"/></g>';
    else if (k === 'storm') g = '<g transform="translate(0,-3)">' + cloud + '</g><path d="M12.5 15l-2.5 4h2.3l-1 3 3.7-5h-2.4z" fill="#f59f00"/>';
    else g = '<g transform="translate(0,-3)">' + cloud + '</g><g stroke="#1c7ed6" stroke-width="1.8" stroke-linecap="round"><path d="M8 19l-.8 2M12 19l-.8 2M16 19l-.8 2"/></g>';
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">' + g + '</svg>';
  }
  function compass(deg) { var t = L().n; return (typeof deg === 'number' && isFinite(deg)) ? t[Math.round(((deg % 360) + 360) % 360 / 45) % 8] : '–'; }

  /* ---------- Utilitaires géo ---------- */
  function hav(a, b) {
    var R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function fmtDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km'; }
  function fmtDur(ms) { var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ' h ' + (m < 10 ? '0' : '') + m : m + ' min ' + (s % 60 < 10 ? '0' : '') + (s % 60) + ' s'; }

  /* ---------- État ---------- */
  var P = { id: null, pos: null, trk: [], dist: 0, t0: 0, maxSp: 0, wx: null, wxKey: '', wxLoading: false, wxErr: false, wxAt: 0, tick: null };
  var cache = {};

  function tabIsPos() {
    var on = document.querySelector('#lc-tabs .lc-navb.on'); return !on || on.getAttribute('data-tab') === 'pos';
  }
  function isOpen() { var r = document.getElementById('lc-root'); return !!(r && r.classList.contains('open')); }

  function onPos(p) {
    var c = p.coords, now = Date.now();
    var cur = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, sp: c.speed, hd: c.heading, alt: c.altitude, ts: now };
    var last = P.trk[P.trk.length - 1];
    if (!P.t0) P.t0 = now;
    if (!last) { P.trk.push(cur); }
    else {
      var d = hav(last, cur), thr = Math.max(4, Math.min(30, (cur.acc || 10) * 0.6));
      if (d >= thr && d < 2000) { P.dist += d; P.trk.push(cur); if (P.trk.length > 400) P.trk.shift(); }
    }
    if (typeof cur.sp === 'number' && cur.sp > P.maxSp) P.maxSp = cur.sp;
    P.pos = cur;
    loadWx(false); paint();
    try { document.dispatchEvent(new CustomEvent('cn-lp-pos', { detail: { trk: P.trk, pos: cur } })); } catch (e) { /* ignore */ }
  }
  function onErr() { paint(); }
  function startWatch() {
    if (P.id != null || !navigator.geolocation) return;
    try { P.id = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 }); } catch (e) { P.id = null; }
    if (!P.tick) P.tick = setInterval(paint, 1000);
  }
  function stopWatch() {
    if (P.id != null) { try { navigator.geolocation.clearWatch(P.id); } catch (e) { /* ignore */ } P.id = null; }
    if (P.tick) { clearInterval(P.tick); P.tick = null; }
  }

  /* ---------- Météo Open-Meteo ---------- */
  function loadWx(force) {
    if (!P.pos || P.wxLoading) return;
    var la = P.pos.lat.toFixed(2), lo = P.pos.lng.toFixed(2), key = la + ',' + lo;
    if (!force && P.wxKey === key && Date.now() - P.wxAt < 600000) return;
    if (!force && cache[key] && Date.now() - cache[key].at < 600000) { P.wx = cache[key].d; P.wxKey = key; P.wxAt = cache[key].at; P.wxErr = false; return; }
    P.wxLoading = true; P.wxErr = false;
    var u1 = 'https://api.open-meteo.com/v1/forecast?latitude=' + la + '&longitude=' + lo +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,uv_index' +
      '&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max' +
      '&wind_speed_unit=kmh&timezone=auto&forecast_days=7&forecast_hours=24';
    var u2 = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + la + '&longitude=' + lo + '&current=european_aqi,pm2_5,pm10&timezone=auto';
    var j = function (r) { if (!r.ok) throw new Error('http'); return r.json(); };
    Promise.all([fetch(u1).then(j), fetch(u2).then(j).catch(function () { return null; })]).then(function (r) {
      var d = { f: r[0], a: r[1] }; cache[key] = { d: d, at: Date.now() };
      P.wx = d; P.wxKey = key; P.wxAt = Date.now(); P.wxLoading = false; P.wxErr = false; paint();
    }).catch(function () { P.wxLoading = false; P.wxErr = true; paint(); });
  }

  /* ---------- Rendu ---------- */
  var CSS = '#lp-root{margin:0 0 14px}#lp-root .lp-card{border-radius:20px;padding:16px;margin-bottom:14px;background:var(--white,#fff);box-shadow:0 4px 18px rgba(20,26,38,.08)}' +
    '#lp-root h3{margin:0 0 10px;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#5d6779);font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    '#lp-root h3 button{border:0;background:none;color:var(--primary,#1b4fd8);font-weight:700;font-size:.74rem;text-transform:none;letter-spacing:0;cursor:pointer;padding:4px 6px}' +
    '.lp-big{display:flex;align-items:center;gap:14px;margin-bottom:12px}.lp-big b{font-size:2.5rem;line-height:1;font-weight:800;letter-spacing:-.02em}.lp-big span{display:block;font-size:.88rem;color:var(--muted,#5d6779);margin-top:4px}' +
    '.lp-g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.lp-k{background:var(--bg,#f3f5f9);border-radius:14px;padding:10px 8px;text-align:center}' +
    '.lp-k small{display:block;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#5d6779);margin-bottom:3px}.lp-k b{font-size:.95rem}.lp-k i{display:block;font-style:normal;font-size:.68rem;color:var(--muted,#5d6779);margin-top:2px}' +
    '.lp-pill{display:inline-flex;align-items:center;gap:6px;font-size:.74rem;font-weight:700;padding:4px 10px;border-radius:999px;background:#e6f6ee;color:#0b7a50}.lp-pill.mid{background:#fff3d6;color:#8a5a00}.lp-pill.low{background:#fde5e8;color:#b0182c}.lp-pill.idle{background:#e9edf3;color:#4a5568}' +
    '.lp-hr{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.lp-hr::-webkit-scrollbar{display:none}.lp-h{flex:0 0 58px;text-align:center;background:var(--bg,#f3f5f9);border-radius:14px;padding:8px 4px}.lp-h small{display:block;font-size:.7rem;color:var(--muted,#5d6779);font-weight:700}.lp-h b{display:block;font-size:.88rem;margin-top:2px}.lp-h em{display:block;font-style:normal;font-size:.66rem;color:#1c7ed6;min-height:12px}' +
    '.lp-d{display:grid;grid-template-columns:44px 30px 1fr 74px;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(0,0,0,.06);font-size:.86rem}.lp-d:first-of-type{border-top:0}.lp-bar{height:6px;border-radius:3px;background:#e3e8f0;position:relative}.lp-bar i{position:absolute;top:0;bottom:0;border-radius:3px;background:#f08c00}.lp-d span:last-child{text-align:right;font-weight:700;white-space:nowrap}' +
    '.lp-tools{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.lp-tools button{border:0;border-radius:18px;padding:14px;text-align:left;background:#14263f;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:4px}.lp-tools b{font-size:.95rem}.lp-tools small{font-size:.72rem;opacity:.75;line-height:1.3}.lp-note{font-size:.8rem;color:var(--muted,#5d6779);margin:10px 0 0}.lp-btn{border:0;border-radius:12px;background:var(--primary,#1b4fd8);color:#fff;font-weight:700;padding:9px 14px;cursor:pointer}' +
    '.lp-aq{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border-radius:14px;background:var(--bg,#f3f5f9);font-size:.86rem}.lp-aq b{font-weight:800}';
  function ensureCss() { if (document.getElementById('lp-css')) return; var s = document.createElement('style'); s.id = 'lp-css'; s.textContent = CSS; document.head.appendChild(s); }

  function accPill(a) {
    var t = L();
    if (typeof a !== 'number') return '<span class="lp-pill idle">' + esc(t.wait) + '</span>';
    return a <= 20 ? '<span class="lp-pill">' + esc(t.good) + ' · ±' + Math.round(a) + ' m</span>' : a <= 100 ? '<span class="lp-pill mid">' + esc(t.mid) + ' · ±' + Math.round(a) + ' m</span>' : '<span class="lp-pill low">' + esc(t.low) + ' · ±' + Math.round(a) + ' m</span>';
  }
  function liveCard() {
    var t = L(), p = P.pos;
    var spKmh = p && typeof p.sp === 'number' && p.sp >= 0 ? p.sp * 3.6 : null;
    if (spKmh == null && P.trk.length > 1) { var a = P.trk[P.trk.length - 2], b = P.trk[P.trk.length - 1], dt = (b.ts - a.ts) / 1000; if (dt > 0 && dt < 60) spKmh = hav(a, b) / dt * 3.6; }
    var moving = spKmh != null && spKmh > 1.5;
    var k = function (l, v, s) { return '<div class="lp-k"><small>' + esc(l) + '</small><b>' + v + '</b>' + (s ? '<i>' + esc(s) + '</i>' : '') + '</div>'; };
    return '<div class="lp-card"><h3><span>' + esc(t.live) + '</span><button type="button" data-lp="reset">' + esc(t.reset) + '</button></h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' + accPill(p && p.acc) + '<span class="lp-pill ' + (moving ? '' : 'idle') + '">' + esc(moving ? t.move : t.still) + '</span></div>' +
      '<div class="lp-g">' + k(t.speed, spKmh == null ? '–' : num(spKmh, 0) + ' km/h', P.maxSp ? 'max ' + num(P.maxSp * 3.6, 0) : '') +
      k(t.head, p && typeof p.hd === 'number' && isFinite(p.hd) ? compass(p.hd) + ' ' + Math.round(p.hd) + '°' : '–') +
      k(t.alt, p && typeof p.alt === 'number' ? Math.round(p.alt) + ' m' : '–') +
      k(t.dist, fmtDist(P.dist), t.trk) + k(t.dur, P.t0 ? fmtDur(Date.now() - P.t0) : '–') + k(t.acc, p && typeof p.acc === 'number' ? '±' + Math.round(p.acc) + ' m' : '–') + '</div></div>';
  }
  function uvIdx(u) { return u < 3 ? 0 : u < 6 ? 1 : u < 8 ? 2 : u < 11 ? 3 : 4; }
  function aqIdx(v) { return v <= 20 ? 0 : v <= 40 ? 1 : v <= 60 ? 2 : v <= 80 ? 3 : v <= 100 ? 4 : 5; }
  function hhmm(s) { return typeof s === 'string' && s.length >= 16 ? s.slice(11, 16) : '–'; }
  function wxCard() {
    var t = L();
    if (!P.pos) return '';
    if (P.wxErr && !P.wx) return '<div class="lp-card"><h3>' + esc(t.wx) + '</h3><p class="lp-note" style="margin:0 0 10px">' + esc(t.wxerr) + '</p><button type="button" class="lp-btn" data-lp="retry">' + esc(t.retry) + '</button></div>';
    if (!P.wx) return '<div class="lp-card"><h3>' + esc(t.wx) + '</h3><p class="lp-note" style="margin:0">' + esc(t.loading) + '</p></div>';
    var f = P.wx.f, a = P.wx.a, c = f.current || {}, h = f.hourly || {}, d = f.daily || {};
    var night = c.is_day === 0, code = c.weather_code;
    var k = function (l, v, s) { return '<div class="lp-k"><small>' + esc(l) + '</small><b>' + v + '</b>' + (s ? '<i>' + esc(s) + '</i>' : '') + '</div>'; };
    var uv = typeof c.uv_index === 'number' ? c.uv_index : (d.uv_index_max ? d.uv_index_max[0] : null), ui = uv == null ? 0 : uvIdx(uv);
    var out = '<div class="lp-card"><h3><span>' + esc(t.wx) + '</span><button type="button" data-lp="retry">' + esc(t.upd) + ' ' + esc(new Date(P.wxAt).toTimeString().slice(0, 5)) + '</button></h3>' +
      '<div class="lp-big">' + wxIcon(code, night, 56) + '<div><b>' + num(c.temperature_2m, 0) + '°</b><span>' + esc(t.wmo[code] || '') + '</span></div></div>' +
      '<div class="lp-g">' + k(t.feels, num(c.apparent_temperature, 0) + '°') + k(t.hum, num(c.relative_humidity_2m, 0) + ' %') +
      k(t.wind, num(c.wind_speed_10m, 0) + ' km/h', compass(c.wind_direction_10m) + ' · ' + t.gust + ' ' + num(c.wind_gusts_10m, 0)) +
      k(t.press, num(c.pressure_msl, 0) + ' hPa') + k(t.uv, uv == null ? '–' : num(uv, 1), uv == null ? '' : t.uvl[ui]) + k(t.rain, num(c.precipitation, 1) + ' mm', t.cloud + ' ' + num(c.cloud_cover, 0) + ' %') + '</div>';
    if (uv != null) out += '<p class="lp-note">' + esc(t.uvhint[ui]) + '</p>';
    if (d.sunrise && d.sunset) out += '<div class="lp-aq"><span>' + esc(t.sun) + '</span><b>' + esc(hhmm(d.sunrise[0])) + ' / ' + esc(hhmm(d.sunset[0])) + '</b></div>';
    if (a && a.current && typeof a.current.european_aqi === 'number') {
      var ai = aqIdx(a.current.european_aqi);
      out += '<div class="lp-aq"><span>' + esc(t.aq) + '</span><b>' + esc(t.lvl[ai]) + ' · ' + Math.round(a.current.european_aqi) + '</b><span style="margin-left:auto;font-size:.76rem">PM2.5 ' + num(a.current.pm2_5, 0) + '</span></div>';
    }
    out += '</div>';
    if (h.time && h.time.length) {
      var hs = '';
      for (var i = 0; i < h.time.length && i < 24; i++) {
        hs += '<div class="lp-h"><small>' + esc(h.time[i].slice(11, 13)) + ' h</small>' + wxIcon(h.weather_code[i], h.is_day && h.is_day[i] === 0, 26) + '<b>' + num(h.temperature_2m[i], 0) + '°</b><em>' + (h.precipitation_probability && h.precipitation_probability[i] > 10 ? Math.round(h.precipitation_probability[i]) + '%' : '') + '</em></div>';
      }
      out += '<div class="lp-card"><h3>' + esc(t.hourly) + '</h3><div class="lp-hr">' + hs + '</div></div>';
    }
    if (d.time && d.time.length) {
      var mn = Math.min.apply(null, d.temperature_2m_min), mx = Math.max.apply(null, d.temperature_2m_max), sp = Math.max(1, mx - mn), ds = '';
      for (var j = 0; j < d.time.length; j++) {
        var dt = new Date(d.time[j] + 'T12:00:00'), lo = d.temperature_2m_min[j], hi = d.temperature_2m_max[j];
        var pr = d.precipitation_probability_max ? d.precipitation_probability_max[j] : null;
        ds += '<div class="lp-d"><span>' + esc(j === 0 ? t.today : t.d[dt.getDay()]) + '</span>' + wxIcon(d.weather_code[j], false, 24) +
          '<span class="lp-bar"><i style="left:' + ((lo - mn) / sp * 100).toFixed(1) + '%;right:' + ((mx - hi) / sp * 100).toFixed(1) + '%"></i></span>' +
          '<span>' + num(lo, 0) + '° / ' + num(hi, 0) + '°' + (pr > 20 ? ' · ' + Math.round(pr) + '%' : '') + '</span></div>';
      }
      out += '<div class="lp-card"><h3>' + esc(t.daily) + '</h3>' + ds + '</div>';
    }
    return out;
  }

  function toolsCard() {
    var ic = function (d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    return '<div class="lp-tools"><button type="button" data-lp="weather">' + ic('<path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z"/>') + '<b>Météo complète</b><small>Heures, 7 jours, air, soleil, lune</small></button>' +
      '<button type="button" data-lp="explore">' + ic('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>') + '<b>Autour de moi</b><small>Quartier, rues, lieux, photos</small></button></div>';
  }
  function paint() {
    var host = document.getElementById('lp-root'); if (!host) return;
    var html = liveCard() + toolsCard() + wxCard();
    if (host.__h !== html) { host.__h = html; host.innerHTML = html; }
  }
  function inject() {
    var body = document.getElementById('lc-tabbody'); if (!body) return;
    if (!tabIsPos()) { var old = document.getElementById('lp-root'); if (old) old.remove(); stopWatch(); return; }
    var ok = body.querySelector('.lc-hero'); // pas avant le consentement
    if (!ok) return;
    ensureCss();
    var host = document.getElementById('lp-root');
    if (!host) {
      host = document.createElement('div'); host.id = 'lp-root'; host.setAttribute('aria-live', 'off');
      var hero = body.querySelector('.lc-hero'); hero.parentNode.insertBefore(host, hero.nextSibling);
      host.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-lp]'); if (!b) return;
        if (b.getAttribute('data-lp') === 'reset') { P.trk = P.pos ? [P.pos] : []; P.dist = 0; P.t0 = Date.now(); P.maxSp = 0; paint(); }
        else if (b.getAttribute('data-lp') === 'weather' || b.getAttribute('data-lp') === 'explore') { document.dispatchEvent(new CustomEvent('cn-lp-open', { detail: { view: b.getAttribute('data-lp'), pos: P.pos } })); }
        else { P.wxErr = false; loadWx(true); paint(); }
      });
    }
    var c = null; try { c = localStorage.getItem('cn_loc_consent'); } catch (e) { /* ignore */ }
    if (c && isOpen()) startWatch(); else stopWatch();
    paint();
  }

  var mo = null;
  function attach() {
    var body = document.getElementById('lc-tabbody');
    if (!body || body.__lp) return;
    body.__lp = true;
    mo = new MutationObserver(function () { if (!document.getElementById('lp-root') || !tabIsPos()) inject(); });
    mo.observe(body, { childList: true });
    var nav = document.getElementById('lc-tabs'); if (nav) new MutationObserver(inject).observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    inject();
  }
  function watchOpen(r) {
    if (r.__lpo) return; r.__lpo = true;
    new MutationObserver(function () { if (isOpen()) inject(); else stopWatch(); }).observe(r, { attributes: true, attributeFilter: ['class'] });
  }
  function watchRoot() {
    var obs = new MutationObserver(function () {
      var r = document.getElementById('lc-root');
      if (r) { attach(); watchOpen(r); } else { stopWatch(); }
    });
    obs.observe(document.body, { childList: true, subtree: false });
    if (document.getElementById('lc-root')) watchOpen(document.getElementById('lc-root'));
    if (document.getElementById('lc-root')) attach();
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopWatch(); else if (document.getElementById('lc-root')) inject(); });
  }
  if (document.body) watchRoot(); else document.addEventListener('DOMContentLoaded', watchRoot);
  window.CNLocationPro = { _hav: hav, _aq: aqIdx, _uv: uvIdx, _compass: compass, wxIcon: wxIcon, wxKind: wxKind, hav: hav, compass: compass, state: function () { return P; }, wmo: function (c) { return L().wmo[c] || ''; } };
})();
