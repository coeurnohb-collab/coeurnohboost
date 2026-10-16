/* Coeurnoh Universe — Centre de localisation PLUS
   1) Météo complète en plein écran (Open-Meteo) : aujourd'hui, heures, 7 jours, air, soleil & lune.
   2) « Autour de moi » : adresse et quartier précis (OSM), vue aérienne réelle, rues proches, lieux reconnus,
      sites & monuments avec photos (Wikipédia), photos réelles proches (Wikimedia Commons).
   3) Carte : trajet parcouru en direct + lieux autour de moi, export GPX.
   Dépend de location-pro.js (position en direct). Aucune clé API requise. */
(function () {
  'use strict';
  if (window.__cnLocPlus) return; window.__cnLocPlus = true;

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v.toFixed(d || 0) : '–'; }
  function LP() { return window.CNLocationPro || {}; }
  function hav(a, b) { return LP().hav ? LP().hav(a, b) : 0; }
  function ico(d, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  function getJSON(url, ms) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms || 20000);
    return fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function fmtDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km'; }
  function bearing(a, b) { var r = Math.PI / 180, y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r), x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r); return (Math.atan2(y, x) / r + 360) % 360; }
  var DIR8 = ['au nord', 'au nord-est', 'à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest'];
  function dirWord(deg) { return DIR8[Math.round(deg / 45) % 8]; }
  function hhmm(s) { return typeof s === 'string' && s.length >= 16 ? s.slice(11, 16) : '–'; }
  function durH(sec) { if (typeof sec !== 'number') return '–'; var h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60); return h + ' h ' + (m < 10 ? '0' : '') + m; }
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function dayName(iso, i) { if (i === 0) return 'Aujourd’hui'; if (i === 1) return 'Demain'; var d = new Date(iso + 'T12:00:00'); return JOURS[d.getDay()].charAt(0).toUpperCase() + JOURS[d.getDay()].slice(1); }

  /* ================= CSS ================= */
  var CSS = '.lx{position:fixed;inset:0;z-index:2600;background:var(--bg,#f3f5f9);color:var(--text,#14263f);display:flex;flex-direction:column;font-family:inherit}' +
    '.lx-hd{display:flex;align-items:center;gap:10px;padding:max(12px,env(safe-area-inset-top)) 14px 10px;background:#14263f;color:#fff}.lx-hd h2{margin:0;font-size:1.05rem;flex:1}.lx-hd button{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:12px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer}' +
    '.lx-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 14px;background:#14263f;scrollbar-width:none}.lx-tabs::-webkit-scrollbar{display:none}.lx-tabs button{flex:0 0 auto;border:0;border-radius:999px;padding:8px 14px;font-weight:700;font-size:.8rem;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}.lx-tabs button.on{background:#fff;color:#14263f}' +
    '.lx-body{flex:1;overflow-y:auto;padding:14px 14px calc(24px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}' +
    '.lx-c{background:var(--white,#fff);border-radius:20px;padding:16px;margin-bottom:14px;box-shadow:0 4px 18px rgba(20,38,63,.08)}.lx-c h3{margin:0 0 10px;font-size:.74rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#5d6779);font-weight:800}' +
    '.lx-hero{background:#14263f;color:#fff;border-radius:22px;padding:20px;margin-bottom:14px}.lx-hero .t{display:flex;align-items:center;gap:14px}.lx-hero .t b{font-size:3.4rem;line-height:1;font-weight:800;letter-spacing:-.03em}.lx-hero .d{opacity:.8;font-size:.9rem;margin-top:4px}.lx-hero .m{display:flex;gap:16px;margin-top:14px;font-size:.84rem;opacity:.9;flex-wrap:wrap}' +
    '.lx-g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.lx-k{background:var(--bg,#f3f5f9);border-radius:14px;padding:12px}.lx-k small{display:block;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#5d6779)}.lx-k b{display:block;font-size:1.05rem;margin-top:3px}.lx-k i{display:block;font-style:normal;font-size:.72rem;color:var(--muted,#5d6779);margin-top:2px}' +
    '.lx-adv{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(0,0,0,.06);font-size:.9rem;line-height:1.4}.lx-adv:first-of-type{border-top:0}.lx-adv span{flex:0 0 8px;height:8px;border-radius:50%;background:#1b4fd8;margin-top:6px}.lx-adv.w span{background:#e8590c}.lx-adv.b span{background:#d7263d}.lx-adv.g span{background:#0b9a6a}' +
    '.lx-row{display:grid;grid-template-columns:62px 30px 1fr auto;gap:8px;align-items:center;padding:9px 0;border-top:1px solid rgba(0,0,0,.06);font-size:.86rem}.lx-row:first-of-type{border-top:0}.lx-row small{color:var(--muted,#5d6779)}.lx-row .r{text-align:right;white-space:nowrap;font-weight:700}' +
    '.lx-bar{height:7px;border-radius:4px;background:#e3e8f0;position:relative;overflow:hidden}.lx-bar i{position:absolute;top:0;bottom:0;border-radius:4px;background:#f08c00}.lx-lvl{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.72rem;font-weight:800;color:#fff}' +
    '.lx-note{font-size:.8rem;color:var(--muted,#5d6779);line-height:1.45;margin:8px 0 0}.lx-btn{border:0;border-radius:12px;background:#1b4fd8;color:#fff;font-weight:700;padding:10px 14px;cursor:pointer;font-size:.86rem}.lx-btn.s{background:#e9edf3;color:#14263f}' +
    '.lx-pl{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(0,0,0,.06);cursor:pointer}.lx-pl:first-of-type{border-top:0}.lx-pl .ic{flex:0 0 40px;height:40px;border-radius:12px;background:#e8f0fa;color:#1d4f91;display:flex;align-items:center;justify-content:center}.lx-pl b{display:block;font-size:.92rem}.lx-pl small{color:var(--muted,#5d6779);font-size:.76rem}.lx-pl .r{margin-left:auto;text-align:right;font-weight:700;font-size:.82rem;white-space:nowrap}' +
    '.lx-wk{display:flex;gap:12px;padding:10px 0;border-top:1px solid rgba(0,0,0,.06)}.lx-wk:first-of-type{border-top:0}.lx-wk img{width:84px;height:84px;object-fit:cover;border-radius:14px;background:#e3e8f0;flex:0 0 84px}.lx-wk b{display:block;font-size:.92rem}.lx-wk small{color:var(--muted,#5d6779);font-size:.78rem;line-height:1.35;display:block;margin-top:2px}.lx-wk a{color:#1d4f91;font-weight:700;font-size:.78rem}' +
    '.lx-ph{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.lx-ph button{border:0;padding:0;border-radius:12px;overflow:hidden;aspect-ratio:1;background:#e3e8f0;cursor:pointer}.lx-ph img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.lx-aer{position:relative;width:100%;aspect-ratio:1;max-width:520px;margin:0 auto;overflow:hidden;border-radius:18px;background:#1b2a3d}.lx-aer .tl{position:absolute}.lx-aer .pin{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:3px solid #fff;background:#d7263d;box-shadow:0 2px 8px rgba(0,0,0,.5)}.lx-aer .ring{position:absolute;left:50%;top:50%;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:rgba(27,79,216,.18);transform:translate(-50%,-50%)}' +
    '.lx-zm{display:flex;gap:6px;justify-content:center;margin-top:10px}.lx-zm button{border:0;border-radius:10px;background:#e9edf3;padding:8px 14px;font-weight:700;cursor:pointer}.lx-zm button.on{background:#14263f;color:#fff}' +
    '.lx-chart{width:100%;height:auto;display:block}.lx-empty{text-align:center;color:var(--muted,#5d6779);padding:18px 0;font-size:.88rem}' +
    '.lx-lb{position:fixed;inset:0;z-index:2700;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px}.lx-lb img{max-width:100%;max-height:78vh;border-radius:10px}.lx-lb p{color:#fff;font-size:.82rem;text-align:center;margin:10px 0 0;max-width:520px}.lx-lb a{color:#9ec5ff}.lx-lb button{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:12px;width:42px;height:42px;font-size:1.4rem;cursor:pointer}' +
    '.lx-pt{width:12px;height:12px;border-radius:50%;background:#1b4fd8;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)}';
  function css() { if ($('lx-css')) return; var s = document.createElement('style'); s.id = 'lx-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ================= Cadre plein écran ================= */
  var view = null;
  function openShell(title, tabs, onTab) {
    css(); closeShell();
    var el = document.createElement('div'); el.className = 'lx'; el.id = 'lx-shell'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="lx-hd"><button type="button" data-lx="close" aria-label="Retour">' + ico('<polyline points="15 18 9 12 15 6"/>') + '</button><h2>' + esc(title) + '</h2><button type="button" data-lx="refresh" aria-label="Actualiser">' + ico('<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>') + '</button></div>' +
      (tabs ? '<div class="lx-tabs">' + tabs.map(function (t, i) { return '<button type="button" data-lx-tab="' + t[0] + '" class="' + (i ? '' : 'on') + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' : '') + '<div class="lx-body" id="lx-body"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-lx],[data-lx-tab]'); if (!t) return;
      if (t.hasAttribute('data-lx-tab')) { Array.prototype.forEach.call(el.querySelectorAll('[data-lx-tab]'), function (b) { b.classList.toggle('on', b === t); }); onTab(t.getAttribute('data-lx-tab')); $('lx-body').scrollTop = 0; return; }
      var a = t.getAttribute('data-lx'); if (a === 'close') closeShell(); else if (a === 'refresh' && view && view.refresh) view.refresh();
    });
    return el;
  }
  function closeShell() { var e = $('lx-shell'); if (e) e.remove(); var l = $('lx-lb'); if (l) l.remove(); view = null; }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('lx-lb')) $('lx-lb').remove(); else closeShell(); } });
  function lightbox(src, cap, link) {
    var o = document.createElement('div'); o.className = 'lx-lb'; o.id = 'lx-lb';
    o.innerHTML = '<button type="button" aria-label="Fermer">×</button><img src="' + esc(src) + '" alt="">' + (cap ? '<p>' + esc(cap) + (link ? ' · <a href="' + esc(link) + '" target="_blank" rel="noopener">Source</a>' : '') + '</p>' : '');
    o.addEventListener('click', function (e) { if (e.target === o || e.target.tagName === 'BUTTON') o.remove(); }); document.body.appendChild(o);
  }
  function needPos(posGetter) {
    var p = posGetter(); if (p) return p;
    $('lx-body').innerHTML = '<div class="lx-c"><div class="lx-empty">Position introuvable. Active la localisation, attends quelques secondes le signal GPS, puis réessaie.</div></div>'; return null;
  }
  function curPos(fromEvent) { var st = LP().state && LP().state(); return (st && st.pos) || fromEvent || null; }

  /* ================= MÉTÉO COMPLÈTE ================= */
  var WX = { data: null, air: null, key: '', tab: 'today', err: false };
  function wxUrl(p) {
    var la = p.lat.toFixed(3), lo = p.lng.toFixed(3);
    return ['https://api.open-meteo.com/v1/forecast?latitude=' + la + '&longitude=' + lo +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,visibility,uv_index' +
      '&minutely_15=precipitation&forecast_minutely_15=8' +
      '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,pressure_msl,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,precipitation_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant' +
      '&wind_speed_unit=kmh&timezone=auto&forecast_days=7&past_hours=3&forecast_hours=48',
    'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + la + '&longitude=' + lo +
      '&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&hourly=european_aqi&timezone=auto&forecast_hours=24'];
  }
  function openWeather(pos) {
    var p = curPos(pos); WX.tab = 'today';
    openShell('Météo complète', [['today', 'Aujourd’hui'], ['hours', 'Heures'], ['days', '7 jours'], ['air', 'Air'], ['sun', 'Soleil et lune']], function (t) { WX.tab = t; paintWx(); });
    view = { refresh: function () { WX.key = ''; loadWx(); } };
    if (!p) { needPos(function () { return null; }); return; }
    loadWx();
  }
  function loadWx() {
    var p = curPos(); if (!p) return needPos(function () { return null; });
    var key = p.lat.toFixed(2) + ',' + p.lng.toFixed(2);
    if (WX.key === key && WX.data) { paintWx(); return; }
    $('lx-body').innerHTML = '<div class="lx-c"><div class="lx-empty">Chargement de la météo…</div></div>';
    var u = wxUrl(p);
    Promise.all([getJSON(u[0]), getJSON(u[1]).catch(function () { return null; })]).then(function (r) { WX.data = r[0]; WX.air = r[1]; WX.key = key; WX.at = Date.now(); paintWx(); })
      .catch(function () { $('lx-body').innerHTML = '<div class="lx-c"><div class="lx-empty">Météo indisponible pour le moment.<br><br><button class="lx-btn" data-lx="refresh">Réessayer</button></div></div>'; });
  }
  function icon(code, night, sz) { return LP().wxIcon ? LP().wxIcon(code, night, sz) : ''; }
  function wmo(c) { return LP().wmo ? LP().wmo(c) : ''; }
  function comp(d) { return LP().compass ? LP().compass(d) : '–'; }

  function advice(cur, hr, air, rain) {
    var a = [], n0 = 3, i;
    var pmax = 0; for (i = n0; i < n0 + 4 && i < (hr.precipitation_probability || []).length; i++) pmax = Math.max(pmax, hr.precipitation_probability[i] || 0);
    if (rain && rain.text) a.push([rain.soon ? 'b' : 'g', rain.text]);
    if (pmax >= 50 && !(rain && rain.soon)) a.push(['w', 'Risque de pluie dans les prochaines heures (' + Math.round(pmax) + ' %). Prévois un parapluie.']);
    if (cur.weather_code >= 95) a.push(['b', 'Orage en cours ou imminent : évite les zones dégagées, les arbres isolés et les déplacements inutiles.']);
    if (cur.uv_index >= 8) a.push(['b', 'Indice UV très élevé (' + num(cur.uv_index, 1) + ') : évite le soleil entre 10 h et 16 h, protège-toi (crème, chapeau, lunettes).']);
    else if (cur.uv_index >= 6) a.push(['w', 'Indice UV élevé : crème solaire et couvre-chef conseillés en journée.']);
    if (cur.apparent_temperature >= 35) a.push(['b', 'Chaleur très forte (ressenti ' + num(cur.apparent_temperature) + '°) : bois régulièrement, reste à l’ombre.']);
    else if (cur.apparent_temperature >= 31) a.push(['w', 'Il fait très chaud : hydrate-toi souvent et limite l’effort physique en plein soleil.']);
    else if (cur.apparent_temperature <= 12) a.push(['w', 'Il fait frais : prévois une veste.']);
    if (cur.wind_gusts_10m >= 50) a.push(['b', 'Rafales violentes (' + num(cur.wind_gusts_10m) + ' km/h) : prudence, surtout en moto ou près des arbres.']);
    else if (cur.wind_gusts_10m >= 35) a.push(['w', 'Vent soutenu avec rafales à ' + num(cur.wind_gusts_10m) + ' km/h.']);
    if (typeof cur.visibility === 'number' && cur.visibility < 2000) a.push(['w', 'Visibilité réduite (' + fmtDist(cur.visibility) + ') : conduis lentement et allume tes feux.']);
    if (air && air.current && air.current.european_aqi > 60) a.push([air.current.european_aqi > 80 ? 'b' : 'w', 'Qualité de l’air dégradée : limite l’effort en extérieur, surtout pour les enfants et les personnes fragiles.']);
    if (!a.length) a.push(['g', 'Conditions agréables : aucun point d’attention particulier pour le moment.']);
    return a.slice(0, 6);
  }
  function rainNow(m15) {
    if (!m15 || !m15.time || !m15.precipitation) return null;
    var now = Date.now(), best = null, total = 0, first = -1;
    for (var i = 0; i < m15.time.length; i++) { var v = m15.precipitation[i] || 0; if (v >= 0.1) { if (first < 0) first = i; total += v; } }
    if (first < 0) return { soon: false, text: 'Pas de pluie prévue dans les 2 prochaines heures.' };
    return { soon: true, text: first === 0 ? 'Il pleut en ce moment (' + total.toFixed(1) + ' mm dans les 2 prochaines heures).' : 'Pluie attendue vers ' + hhmm(m15.time[first]) + ' (' + total.toFixed(1) + ' mm sur 2 h).' };
  }
  function chart24(h, from) {
    var n = Math.min(25, h.time.length - from), W = 340, H = 140, pl = 26, pr = 8, pt = 14, pb = 22, i, T = [], P = [];
    for (i = 0; i < n; i++) { T.push(h.temperature_2m[from + i]); P.push(h.precipitation[from + i] || 0); }
    var mn = Math.floor(Math.min.apply(null, T)) - 1, mx = Math.ceil(Math.max.apply(null, T)) + 1, pm = Math.max(2, Math.max.apply(null, P));
    var X = function (k) { return pl + k * (W - pl - pr) / (n - 1); }, Y = function (v) { return pt + (mx - v) / (mx - mn) * (H - pt - pb); };
    var line = T.map(function (v, k) { return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
    var bars = P.map(function (v, k) { var bh = v / pm * 38; return v > 0 ? '<rect x="' + (X(k) - 3.5).toFixed(1) + '" y="' + (H - pb - bh).toFixed(1) + '" width="7" height="' + bh.toFixed(1) + '" rx="2" fill="#74b3f2" opacity=".85"/>' : ''; }).join('');
    var lbl = ''; for (i = 0; i < n; i += 4) lbl += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" text-anchor="middle" fill="#7a8699">' + esc(h.time[from + i].slice(11, 13)) + ' h</text>';
    var y1 = '<text x="2" y="' + (Y(mx - 1) + 3).toFixed(1) + '" font-size="9" fill="#7a8699">' + (mx - 1) + '°</text><text x="2" y="' + (Y(mn + 1) + 3).toFixed(1) + '" font-size="9" fill="#7a8699">' + (mn + 1) + '°</text>';
    var peak = T.indexOf(Math.max.apply(null, T));
    return '<svg class="lx-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Évolution de la température sur 24 heures">' + y1 + bars + '<path d="' + line + '" fill="none" stroke="#e8590c" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + X(peak).toFixed(1) + '" cy="' + Y(T[peak]).toFixed(1) + '" r="4" fill="#e8590c"/><text x="' + X(peak).toFixed(1) + '" y="' + (Y(T[peak]) - 8).toFixed(1) + '" font-size="10" font-weight="700" text-anchor="middle" fill="#14263f">' + Math.round(T[peak]) + '°</text>' + lbl + '</svg>';
  }
  function windRose(deg, sp, gust) {
    var s = 130, c = s / 2, r = 46, a = ((deg || 0) + 180) * Math.PI / 180; // flèche : direction vers laquelle souffle le vent
    var x2 = c + Math.sin(a) * (r - 6), y2 = c - Math.cos(a) * (r - 6), x1 = c - Math.sin(a) * (r - 6), y1 = c + Math.cos(a) * (r - 6);
    var L = ['N', 'E', 'S', 'O'].map(function (t, i) { var an = i * Math.PI / 2; return '<text x="' + (c + Math.sin(an) * (r + 11)).toFixed(1) + '" y="' + (c - Math.cos(an) * (r + 11) + 3.5).toFixed(1) + '" font-size="10" font-weight="700" text-anchor="middle" fill="#7a8699">' + t + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + s + ' ' + s + '" width="130" height="130" role="img" aria-label="Direction du vent"><circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#f3f5f9" stroke="#d5dce8"/>' + L +
      '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#1b4fd8" stroke-width="3" stroke-linecap="round"/><circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="5" fill="#1b4fd8"/>' +
      '<text x="' + c + '" y="' + (c + 4) + '" font-size="12" font-weight="800" text-anchor="middle" fill="#14263f" opacity="0">' + num(sp) + '</text></svg>';
  }
  function kv(l, v, s) { return '<div class="lx-k"><small>' + esc(l) + '</small><b>' + v + '</b>' + (s ? '<i>' + esc(s) + '</i>' : '') + '</div>'; }
  function card(t, inner) { return '<div class="lx-c">' + (t ? '<h3>' + esc(t) + '</h3>' : '') + inner + '</div>'; }

  function paintWx() {
    var body = $('lx-body'); if (!body || !WX.data) return;
    var d = WX.data, c = d.current || {}, h = d.hourly || {}, dy = d.daily || {}, N = 3, air = WX.air, out = '';
    var night = c.is_day === 0, rain = rainNow(d.minutely_15);
    if (WX.tab === 'today') {
      var p = curPos(); var pt = N < (h.pressure_msl || []).length ? h.pressure_msl[N] - h.pressure_msl[0] : 0;
      out += '<div class="lx-hero"><div class="t">' + icon(c.weather_code, night, 64) + '<div><b>' + num(c.temperature_2m) + '°</b><div class="d">' + esc(wmo(c.weather_code)) + '</div></div></div><div class="m"><span>Ressenti ' + num(c.apparent_temperature) + '°</span><span>Max ' + num(dy.temperature_2m_max && dy.temperature_2m_max[0]) + '° · Min ' + num(dy.temperature_2m_min && dy.temperature_2m_min[0]) + '°</span></div></div>';
      out += card('À savoir maintenant', advice(c, h, air, rain).map(function (a) { return '<div class="lx-adv ' + a[0] + '"><span></span><div>' + esc(a[1]) + '</div></div>'; }).join(''));
      if (h.time) out += card('Prochaines 24 h', chart24(h, N) + '<p class="lx-note">Courbe : température. Barres bleues : précipitations.</p>');
      out += card('Vent', '<div style="display:flex;align-items:center;gap:16px">' + windRose(c.wind_direction_10m, c.wind_speed_10m, c.wind_gusts_10m) + '<div><div style="font-size:1.7rem;font-weight:800">' + num(c.wind_speed_10m) + ' km/h</div><div class="lx-note" style="margin-top:2px">Vient du ' + esc(comp(c.wind_direction_10m)) + ' (' + num(c.wind_direction_10m) + '°)<br>Rafales jusqu’à ' + num(c.wind_gusts_10m) + ' km/h</div></div></div>');
      out += card('Détails', '<div class="lx-g">' + kv('Humidité', num(c.relative_humidity_2m) + ' %', 'Point de rosée ' + num(c.dew_point_2m) + '°') +
        kv('Pression', num(c.pressure_msl) + ' hPa', pt > 1 ? 'En hausse' : pt < -1 ? 'En baisse' : 'Stable') + kv('Visibilité', typeof c.visibility === 'number' ? fmtDist(c.visibility) : '–') + kv('Nébulosité', num(c.cloud_cover) + ' %') +
        kv('Indice UV', num(c.uv_index, 1), uvWord(c.uv_index)) + kv('Précipitations', num(c.precipitation, 1) + ' mm', 'Dernière heure') + '</div>');
      out += '<p class="lx-note" style="text-align:center">Mis à jour à ' + esc(new Date(WX.at).toTimeString().slice(0, 5)) + ' · Données Open-Meteo</p>';
    } else if (WX.tab === 'hours') {
      var rows = '';
      for (var i = N; i < h.time.length; i++) {
        rows += '<div class="lx-row" style="grid-template-columns:48px 30px 1fr auto"><b>' + esc(h.time[i].slice(11, 13)) + ' h</b>' + icon(h.weather_code[i], h.is_day && h.is_day[i] === 0, 26) +
          '<span><small>' + esc(wmo(h.weather_code[i])) + '</small><br><small>Vent ' + num(h.wind_speed_10m[i]) + ' km/h ' + esc(comp(h.wind_direction_10m[i])) + (h.uv_index && h.uv_index[i] >= 3 ? ' · UV ' + num(h.uv_index[i], 0) : '') + '</small></span><span class="r">' + num(h.temperature_2m[i]) + '°<br><small style="color:#1c7ed6">' + (h.precipitation_probability[i] > 5 ? Math.round(h.precipitation_probability[i]) + ' %' : '') + (h.precipitation[i] >= 0.1 ? ' · ' + h.precipitation[i].toFixed(1) + ' mm' : '') + '</small></span></div>';
      }
      out += card('48 prochaines heures', rows);
    } else if (WX.tab === 'days') {
      var mn = Math.min.apply(null, dy.temperature_2m_min), mx = Math.max.apply(null, dy.temperature_2m_max), sp = Math.max(1, mx - mn), r = '';
      for (var j = 0; j < dy.time.length; j++) {
        r += '<div class="lx-row" style="grid-template-columns:86px 30px 1fr 84px"><b>' + esc(dayName(dy.time[j], j)) + '</b>' + icon(dy.weather_code[j], false, 26) +
          '<span><span class="lx-bar"><i style="left:' + ((dy.temperature_2m_min[j] - mn) / sp * 100).toFixed(1) + '%;right:' + ((mx - dy.temperature_2m_max[j]) / sp * 100).toFixed(1) + '%"></i></span><small>' + esc(wmo(dy.weather_code[j])) + ' · Vent max ' + num(dy.wind_speed_10m_max[j]) + ' km/h · UV ' + num(dy.uv_index_max[j], 0) + '</small></span>' +
          '<span class="r">' + num(dy.temperature_2m_min[j]) + '° / ' + num(dy.temperature_2m_max[j]) + '°<br><small style="color:#1c7ed6">' + (dy.precipitation_probability_max[j] > 5 ? Math.round(dy.precipitation_probability_max[j]) + ' %' : '') + (dy.precipitation_sum[j] >= 0.1 ? ' · ' + dy.precipitation_sum[j].toFixed(1) + ' mm' : '') + '</small></span></div>';
      }
      out += card('7 prochains jours', r);
    } else if (WX.tab === 'air') {
      out += airTab(air);
    } else if (WX.tab === 'sun') {
      out += sunTab(dy, h, N);
    }
    body.innerHTML = out;
  }
  function uvWord(u) { return typeof u !== 'number' ? '' : u < 3 ? 'Faible' : u < 6 ? 'Modéré' : u < 8 ? 'Élevé' : u < 11 ? 'Très élevé' : 'Extrême'; }
  var LV = [['Bon', '#0b9a6a'], ['Correct', '#7cb518'], ['Moyen', '#f08c00'], ['Mauvais', '#e8590c'], ['Très mauvais', '#d7263d'], ['Dangereux', '#7b1f3a']];
  function aqLvl(v) { return v <= 20 ? 0 : v <= 40 ? 1 : v <= 60 ? 2 : v <= 80 ? 3 : v <= 100 ? 4 : 5; }
  function airTab(air) {
    if (!air || !air.current) return card('Qualité de l’air', '<div class="lx-empty">Données de qualité de l’air indisponibles ici pour le moment.</div>');
    var c = air.current, i = aqLvl(c.european_aqi), lv = LV[i];
    var out = '<div class="lx-hero" style="background:' + lv[1] + '"><div class="t"><div><b>' + Math.round(c.european_aqi) + '</b></div><div><div style="font-size:1.2rem;font-weight:800">' + lv[0] + '</div><div class="d">Indice européen de qualité de l’air' + (typeof c.us_aqi === 'number' ? ' · US ' + Math.round(c.us_aqi) : '') + '</div></div></div></div>';
    var P = [['PM2,5 (particules fines)', c.pm2_5, 15, 'µg/m³'], ['PM10 (poussières)', c.pm10, 45, 'µg/m³'], ['Ozone (O₃)', c.ozone, 100, 'µg/m³'], ['Dioxyde d’azote (NO₂)', c.nitrogen_dioxide, 25, 'µg/m³'], ['Dioxyde de soufre (SO₂)', c.sulphur_dioxide, 40, 'µg/m³'], ['Monoxyde de carbone (CO)', c.carbon_monoxide, 4000, 'µg/m³'], ['Poussières désertiques', c.dust, 50, 'µg/m³']];
    out += card('Polluants', P.filter(function (p) { return typeof p[1] === 'number'; }).map(function (p) {
      var ratio = p[1] / p[2], pct = Math.min(100, ratio * 50), col = ratio < 1 ? '#0b9a6a' : ratio < 2 ? '#f08c00' : '#d7263d';
      return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:.86rem"><span>' + esc(p[0]) + '</span><b>' + num(p[1], 1) + ' ' + p[3] + '</b></div><div class="lx-bar" style="margin-top:5px"><i style="left:0;right:' + (100 - pct).toFixed(0) + '%;background:' + col + '"></i></div></div>';
    }).join('') + '<p class="lx-note">Repère : la barre est à moitié pleine quand la concentration atteint le seuil de référence de l’OMS / de l’UE.</p>');
    var tips = i <= 1 ? 'L’air est de bonne qualité : toutes les activités en extérieur sont possibles.' : i === 2 ? 'Qualité moyenne : les personnes sensibles (asthme, enfants, personnes âgées) devraient limiter les efforts prolongés dehors.' : 'Qualité mauvaise : limite les efforts en extérieur, aère aux heures les moins polluées et protège les personnes fragiles.';
    out += card('Conseil santé', '<p style="margin:0;font-size:.9rem;line-height:1.45">' + esc(tips) + '</p>');
    return out;
  }
  function moon(date) {
    var syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14), days = (date.getTime() - ref) / 86400000, f = ((days % syn) + syn) % syn / syn;
    var ill = (1 - Math.cos(2 * Math.PI * f)) / 2, k = Math.cos(2 * Math.PI * f), r = 30, c = 34, wax = f < 0.5, s1 = wax ? 1 : 0, s2 = wax ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
    var name = f < 0.03 || f > 0.97 ? 'Nouvelle lune' : f < 0.22 ? 'Premier croissant' : f < 0.28 ? 'Premier quartier' : f < 0.47 ? 'Gibbeuse croissante' : f < 0.53 ? 'Pleine lune' : f < 0.72 ? 'Gibbeuse décroissante' : f < 0.78 ? 'Dernier quartier' : 'Dernier croissant';
    var svg = '<svg viewBox="0 0 68 68" width="84" height="84" aria-hidden="true"><circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#2b3547"/>' + (ill > 0.01 ? '<path d="M' + c + ' ' + (c - r) + ' A' + r + ' ' + r + ' 0 0 ' + s1 + ' ' + c + ' ' + (c + r) + ' A' + (Math.abs(k) * r).toFixed(2) + ' ' + r + ' 0 0 ' + s2 + ' ' + c + ' ' + (c - r) + 'Z" fill="#f1ecd8"/>' : '') + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="#5b6780" stroke-width="1"/></svg>';
    var nextFull = ((0.5 - f + 1) % 1) * syn, nextNew = ((1 - f) % 1) * syn;
    return { svg: svg, name: name, ill: ill, nextFull: nextFull, nextNew: nextNew };
  }
  function addMin(hm, m) { var a = hm.split(':'); var t = (parseInt(a[0], 10) * 60 + parseInt(a[1], 10) + m + 1440) % 1440; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  function sunTab(dy, h, N) {
    var sr = hhmm(dy.sunrise[0]), ss = hhmm(dy.sunset[0]), mo = moon(new Date());
    var noon = (function () { var a = sr.split(':'), b = ss.split(':'); var m = ((+a[0] * 60 + +a[1]) + (+b[0] * 60 + +b[1])) / 2; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0'); })();
    var out = '<div class="lx-hero"><div class="t"><div><b style="font-size:2.4rem">' + esc(sr) + ' – ' + esc(ss) + '</b><div class="d">Journée de ' + esc(durH(dy.daylight_duration[0])) + ' · ensoleillement prévu ' + esc(durH(dy.sunshine_duration[0])) + '</div></div></div></div>';
    out += card('Soleil', '<div class="lx-g">' + kv('Lever', esc(sr)) + kv('Coucher', esc(ss)) + kv('Midi solaire', esc(noon), 'Soleil au plus haut') + kv('Heure dorée', esc(addMin(ss, -60)) + ' – ' + esc(ss), 'Meilleure lumière photo') + kv('Aube', esc(addMin(sr, -25)), 'Début de la clarté') + kv('Crépuscule', esc(addMin(ss, 25)), 'Fin de la clarté') + '</div>');
    if (h.uv_index) {
      var bars = '', mx = Math.max(3, Math.max.apply(null, h.uv_index.slice(N, N + 24).map(function (v) { return v || 0; })));
      for (var i = N; i < Math.min(h.time.length, N + 24); i++) { var v = h.uv_index[i] || 0, col = v < 3 ? '#0b9a6a' : v < 6 ? '#f08c00' : v < 8 ? '#e8590c' : '#d7263d'; bars += '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px"><div style="width:100%;height:' + Math.max(2, v / mx * 70).toFixed(0) + 'px;background:' + col + ';border-radius:3px"></div>' + ((i - N) % 4 === 0 ? '<small style="font-size:.6rem;color:#7a8699">' + esc(h.time[i].slice(11, 13)) + '</small>' : '<small style="font-size:.6rem">&nbsp;</small>') + '</div>'; }
      out += card('Indice UV sur 24 h', '<div style="display:flex;gap:2px;height:96px;align-items:flex-end">' + bars + '</div><p class="lx-note">Pic prévu aujourd’hui : ' + num(dy.uv_index_max[0], 1) + ' (' + esc(uvWord(dy.uv_index_max[0])) + '). Protège-toi dès que l’indice dépasse 3.</p>');
    }
    out += card('Lune', '<div style="display:flex;gap:16px;align-items:center">' + mo.svg + '<div><b style="font-size:1.05rem">' + esc(mo.name) + '</b><div class="lx-note" style="margin-top:3px">Illumination ' + Math.round(mo.ill * 100) + ' %<br>Prochaine pleine lune dans ' + Math.round(mo.nextFull) + ' j · nouvelle lune dans ' + Math.round(mo.nextNew) + ' j</div></div></div>');
    return out;
  }

  /* ================= AUTOUR DE MOI ================= */
  var EX = { pos: null, addr: null, poi: null, wiki: null, photos: null, zoom: 18, tab: 'here', key: '' };
  function openExplore(pos) {
    EX.tab = 'here';
    openShell('Autour de moi', [['here', 'Mon endroit'], ['places', 'Lieux'], ['sights', 'Sites et photos']], function (t) { EX.tab = t; paintEx(); });
    view = { refresh: function () { EX.key = ''; EX.addr = EX.poi = EX.wiki = EX.photos = null; startEx(); } };
    var p = curPos(pos); if (!p) { needPos(function () { return null; }); return; }
    startEx();
  }
  function startEx() {
    var p = curPos(); if (!p) return needPos(function () { return null; });
    EX.pos = p; var key = p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
    if (EX.key !== key) { EX.key = key; EX.addr = EX.poi = EX.wiki = EX.photos = null; }
    paintEx();
    if (!EX.addr) fetchAddr(p); if (!EX.poi) fetchPoi(p); if (!EX.wiki) fetchWiki(p); if (!EX.photos) fetchPhotos(p);
  }
  function stillHere(p) { return EX.pos && EX.pos.lat === p.lat && EX.pos.lng === p.lng; }
  function fetchAddr(p) {
    getJSON('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=fr&lat=' + p.lat + '&lon=' + p.lng, 15000)
      .then(function (j) { if (!stillHere(p)) return; EX.addr = j && j.address ? j : { err: true }; paintEx(); }).catch(function () { if (stillHere(p)) { EX.addr = { err: true }; paintEx(); } });
  }
  var CAT = [
    ['sante', 'Santé', ico('<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.600-7 10-7 10z"/>'), function (t) { return /^(hospital|clinic|pharmacy|doctors|dentist)$/.test(t.amenity || '') || t.healthcare; }],
    ['educ', 'Éducation', ico('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.500 3 3 6 3s6-1.500 6-3v-5"/>'), function (t) { return /^(school|university|college|kindergarten|library)$/.test(t.amenity || ''); }],
    ['bank', 'Banques et argent', ico('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.500"/>'), function (t) { return /^(bank|atm|bureau_de_change|money_transfer)$/.test(t.amenity || ''); }],
    ['food', 'Restaurants et cafés', ico('<path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v8M7 3v6M17 3c-2 2-2 6 0 8v10"/>'), function (t) { return /^(restaurant|cafe|fast_food|bar|pub|ice_cream|food_court)$/.test(t.amenity || ''); }],
    ['shop', 'Commerces', ico('<path d="M4 7h16l-1 13H5z"/><path d="M8 7a4 4 0 0 1 8 0"/>'), function (t) { return !!t.shop; }],
    ['trans', 'Transports', ico('<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21l1-4M16 21l-1-4"/>'), function (t) { return /^(bus_station|taxi|ferry_terminal|fuel|parking)$/.test(t.amenity || '') || t.public_transport || t.highway === 'bus_stop' || t.aeroway; }],
    ['relig', 'Lieux de culte', ico('<path d="M12 3v4M10 5h4M6 21V11l6-4 6 4v10zM10 21v-5h4v5"/>'), function (t) { return t.amenity === 'place_of_worship'; }],
    ['admin', 'Administrations', ico('<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-6 10 6z"/>'), function (t) { return /^(townhall|police|courthouse|fire_station|post_office|community_centre|embassy)$/.test(t.amenity || '') || t.office === 'government'; }],
    ['loisir', 'Loisirs et tourisme', ico('<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>'), function (t) { return t.tourism || t.leisure || /^(cinema|theatre|nightclub|marketplace|arts_centre)$/.test(t.amenity || ''); }]
  ];
  function fetchPoi(p) {
    var la = p.lat.toFixed(5), lo = p.lng.toFixed(5);
    var q = '[out:json][timeout:25];(nwr(around:700,' + la + ',' + lo + ')[amenity][name];nwr(around:700,' + la + ',' + lo + ')[shop][name];nwr(around:700,' + la + ',' + lo + ')[tourism][name];nwr(around:700,' + la + ',' + lo + ')[leisure~"park|stadium|sports_centre|playground|pitch"][name];nwr(around:700,' + la + ',' + lo + ')[public_transport][name];nwr(around:700,' + la + ',' + lo + ')[office=government][name];way(around:220,' + la + ',' + lo + ')[highway][name];);out center tags 220;';
    var urls = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
    var tryN = function (i) {
      return getJSON(urls[i] + '?data=' + encodeURIComponent(q), 28000).catch(function (e) { if (i + 1 < urls.length) return tryN(i + 1); throw e; });
    };
    tryN(0).then(function (j) { if (!stillHere(p)) return; EX.poi = parsePoi(j, p); paintEx(); }).catch(function () { if (stillHere(p)) { EX.poi = { err: true }; paintEx(); } });
  }
  function parsePoi(j, p) {
    var places = [], streets = {}, seen = {};
    (j.elements || []).forEach(function (e) {
      var t = e.tags || {}, name = t.name; if (!name) return;
      var pt = e.type === 'node' ? { lat: e.lat, lng: e.lon } : e.center ? { lat: e.center.lat, lng: e.center.lon } : null; if (!pt) return;
      var dist = hav(p, pt);
      if (t.highway && !t.amenity && !t.shop) { if (!streets[name] || dist < streets[name].dist) streets[name] = { name: name, dist: dist, kind: t.highway }; return; }
      var cat = null; for (var i = 0; i < CAT.length; i++) if (CAT[i][3](t)) { cat = CAT[i][0]; break; } if (!cat) return;
      var k = name + cat; if (seen[k]) return; seen[k] = 1;
      places.push({ name: name, cat: cat, dist: dist, lat: pt.lat, lng: pt.lng, sub: t.amenity || t.shop || t.tourism || t.leisure || '', dir: dirWord(bearing(p, pt)) });
    });
    places.sort(function (a, b) { return a.dist - b.dist; });
    return { places: places, streets: Object.keys(streets).map(function (k) { return streets[k]; }).sort(function (a, b) { return a.dist - b.dist; }) };
  }
  var SUB = { hospital: 'Hôpital', clinic: 'Clinique', pharmacy: 'Pharmacie', doctors: 'Cabinet médical', dentist: 'Dentiste', school: 'École', university: 'Université', college: 'Collège', kindergarten: 'Maternelle', library: 'Bibliothèque', bank: 'Banque', atm: 'Distributeur', restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Restauration rapide', bar: 'Bar', pub: 'Bar', place_of_worship: 'Lieu de culte', marketplace: 'Marché', fuel: 'Station-service', bus_station: 'Gare routière', taxi: 'Taxi', parking: 'Parking', police: 'Police', townhall: 'Mairie', post_office: 'Poste', hotel: 'Hôtel', guest_house: 'Maison d’hôtes', hostel: 'Auberge', museum: 'Musée', attraction: 'Attraction', viewpoint: 'Point de vue', park: 'Parc', stadium: 'Stade', sports_centre: 'Centre sportif', playground: 'Aire de jeux', pitch: 'Terrain de sport', supermarket: 'Supermarché', convenience: 'Alimentation', bakery: 'Boulangerie', clothes: 'Vêtements', mobile_phone: 'Téléphonie', hairdresser: 'Coiffeur', cinema: 'Cinéma', nightclub: 'Club', money_transfer: 'Transfert d’argent' };
  function fetchWiki(p) {
    var u = 'https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=' + p.lat + '%7C' + p.lng + '&ggsradius=10000&ggslimit=14&prop=pageimages%7Ccoordinates%7Cdescription%7Cextracts&piprop=thumbnail&pithumbsize=300&exintro=1&explaintext=1&exchars=170&colimit=14';
    getJSON(u, 15000).then(function (j) {
      if (!stillHere(p)) return;
      var pages = j && j.query ? Object.keys(j.query.pages).map(function (k) { return j.query.pages[k]; }) : [];
      EX.wiki = pages.filter(function (g) { return g.coordinates && g.coordinates[0]; }).map(function (g) { var c = g.coordinates[0]; return { title: g.title, desc: g.description || '', ext: g.extract || '', img: g.thumbnail && /^https:\/\//.test(g.thumbnail.source) ? g.thumbnail.source : '', dist: hav(p, { lat: c.lat, lng: c.lon }), id: g.pageid }; }).sort(function (a, b) { return a.dist - b.dist; });
      paintEx();
    }).catch(function () { if (stillHere(p)) { EX.wiki = []; EX.wikiErr = true; paintEx(); } });
  }
  function fetchPhotos(p) {
    var u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggsnamespace=6&ggscoord=' + p.lat + '%7C' + p.lng + '&ggsradius=1500&ggslimit=18&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=420&iiurlheight=420';
    getJSON(u, 15000).then(function (j) {
      if (!stillHere(p)) return;
      var pages = j && j.query ? Object.keys(j.query.pages).map(function (k) { return j.query.pages[k]; }) : [];
      EX.photos = pages.map(function (g) { var ii = g.imageinfo && g.imageinfo[0]; if (!ii || !/^https:\/\/upload\.wikimedia\.org\//.test(ii.thumburl || '')) return null; var m = ii.extmetadata || {}; return { thumb: ii.thumburl, full: /^https:\/\/upload\.wikimedia\.org\//.test(ii.url || '') ? ii.url : ii.thumburl, title: (g.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' '), page: ii.descriptionurl, author: m.Artist ? String(m.Artist.value || '').replace(/<[^>]*>/g, '') : '' }; }).filter(Boolean);
      paintEx();
    }).catch(function () { if (stillHere(p)) { EX.photos = []; EX.photoErr = true; paintEx(); } });
  }

  /* ----- Vue aérienne (Esri World Imagery) ----- */
  function aerial(p, z, size) {
    var n = Math.pow(2, z), px = (p.lng + 180) / 360 * n * 256, sr = Math.sin(p.lat * Math.PI / 180), py = (0.5 - Math.log((1 + sr) / (1 - sr)) / (4 * Math.PI)) * n * 256;
    var tx = Math.floor(px / 256), ty = Math.floor(py / 256), offx = px - tx * 256, offy = py - ty * 256, html = '';
    for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) {
      var X = tx + dx, Y = ty + dy; if (Y < 0 || Y >= n) continue; X = ((X % n) + n) % n;
      html += '<img class="tl" alt="" loading="lazy" referrerpolicy="no-referrer" style="left:calc(50% + ' + ((dx * 256 - offx) * size / 360).toFixed(2) + 'px);top:calc(50% + ' + ((dy * 256 - offy) * size / 360).toFixed(2) + 'px);width:' + (256 * size / 360).toFixed(2) + 'px;height:' + (256 * size / 360).toFixed(2) + 'px" src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + Y + '/' + X + '">';
    }
    return html;
  }
  function metersPerPx(lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); }
  function aerialCard(p) {
    var wEl = $('lx-body'), size = Math.min(520, (wEl ? wEl.clientWidth : 360) - 60), z = EX.zoom, acc = LP().state && LP().state().pos ? LP().state().pos.acc : null;
    var ring = acc ? Math.min(size * 0.9, (acc / metersPerPx(p.lat, z)) * (size / 360) * 2) : 0;
    return card('Vue aérienne réelle de ton emplacement', '<div class="lx-aer" id="lx-aer" style="height:' + size + 'px;max-width:' + size + 'px">' + aerial(p, z, size) + (ring > 14 ? '<div class="ring" style="width:' + ring.toFixed(0) + 'px;height:' + ring.toFixed(0) + 'px"></div>' : '') + '<div class="pin"></div></div>' +
      '<div class="lx-zm">' + [[17, 'Quartier'], [18, 'Rue'], [19, 'Maison']].map(function (a) { return '<button type="button" data-ex-z="' + a[0] + '" class="' + (z === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      '<p class="lx-note" style="text-align:center">Image satellite Esri, échelle ≈ ' + Math.round(metersPerPx(p.lat, z) * 100 / (size / 360)) + ' m pour 100 px. Le cercle blanc montre la marge d’erreur du GPS. Si l’image est floue, cette zone n’est pas couverte en haute résolution.</p>');
  }
  function addrCard(a) {
    if (!a) return card('Mon adresse', '<div class="lx-empty">Recherche de l’adresse…</div>');
    if (a.err) return card('Mon adresse', '<div class="lx-empty">Adresse introuvable pour le moment.<br><br><button class="lx-btn s" data-lx="refresh">Réessayer</button></div>');
    var d = a.address || {}, rows = [], pick = function (l, v) { if (v) rows.push(kv(l, esc(v))); };
    var road = [d.house_number, d.road || d.pedestrian || d.path].filter(Boolean).join(' ');
    pick('Rue / avenue', road); pick('Quartier', d.neighbourhood || d.quarter || d.suburb); pick('Commune / zone', d.city_district || d.borough || (d.neighbourhood ? d.suburb : '')); pick('Ville', d.city || d.town || d.village || d.municipality || d.county); pick('Province / région', d.state || d.region); pick('Pays', d.country); pick('Code postal', d.postcode);
    var p = EX.pos, coords = p.lat.toFixed(6) + ', ' + p.lng.toFixed(6);
    return card('Mon adresse', '<p style="margin:0 0 12px;font-size:.95rem;line-height:1.4;font-weight:700">' + esc(a.display_name || '') + '</p><div class="lx-g">' + rows.join('') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="lx-btn s" data-ex="copy" data-v="' + esc(coords) + '">Copier les coordonnées</button><button class="lx-btn s" data-ex="maps">Ouvrir dans Maps</button><button class="lx-btn" data-ex="share">Envoyer ma position</button></div><p class="lx-note">' + esc(coords) + (a.type ? ' · ' + esc(a.type.replace(/_/g, ' ')) : '') + '</p>');
  }
  function placesHtml(P) {
    if (!P) return card('Lieux reconnus', '<div class="lx-empty">Recherche des lieux autour de toi…</div>');
    if (P.err) return card('Lieux reconnus', '<div class="lx-empty">Le service de cartographie est occupé.<br><br><button class="lx-btn s" data-lx="refresh">Réessayer</button></div>');
    var out = '<div style="margin-bottom:12px"><button class="lx-btn" data-ex="onmap">Voir ces lieux sur la carte</button></div>';
    out += P.streets.length ? card('Rues et avenues proches', P.streets.slice(0, 8).map(function (s) { return '<div class="lx-pl"><div class="ic">' + ico('<path d="M5 21l4-18M19 21L15 3M12 6v3M12 12v3M12 18v3"/>') + '</div><div><b>' + esc(s.name) + '</b><small>' + esc(streetKind(s.kind)) + '</small></div><div class="r">' + fmtDist(s.dist) + '</div></div>'; }).join('')) : '';
    var any = false;
    CAT.forEach(function (c) {
      var l = P.places.filter(function (x) { return x.cat === c[0]; }).slice(0, 8); if (!l.length) return; any = true;
      out += card(c[1] + ' (' + P.places.filter(function (x) { return x.cat === c[0]; }).length + ')', l.map(function (x) {
        return '<div class="lx-pl" data-ex-go="' + x.lat + ',' + x.lng + '"><div class="ic">' + c[2] + '</div><div><b>' + esc(x.name) + '</b><small>' + esc(SUB[x.sub] || '') + (SUB[x.sub] ? ' · ' : '') + esc(x.dir) + '</small></div><div class="r">' + fmtDist(x.dist) + '</div></div>';
      }).join(''));
    });
    if (!any && !P.streets.length) out += card('', '<div class="lx-empty">Peu de lieux sont répertoriés ici sur OpenStreetMap. Tu peux aider : ajoute les commerces et services de ton quartier sur openstreetmap.org, ils apparaîtront ici.</div>');
    return out + '<p class="lx-note" style="text-align:center">Données © contributeurs OpenStreetMap</p>';
  }
  function streetKind(k) { return { motorway: 'Autoroute', trunk: 'Route nationale', primary: 'Route principale', secondary: 'Avenue', tertiary: 'Rue', residential: 'Rue résidentielle', service: 'Voie de service', unclassified: 'Route', living_street: 'Rue résidentielle', pedestrian: 'Voie piétonne', footway: 'Sentier', track: 'Piste', path: 'Chemin' }[k] || 'Voie'; }
  function sightsHtml() {
    var out = '';
    if (!EX.wiki) out += card('Sites et monuments à proximité', '<div class="lx-empty">Recherche…</div>');
    else if (!EX.wiki.length) out += card('Sites et monuments à proximité', '<div class="lx-empty">' + (EX.wikiErr ? 'Service indisponible pour le moment.' : 'Aucun site documenté dans un rayon de 10 km.') + '</div>');
    else out += card('Sites et monuments à proximité', EX.wiki.map(function (w) {
      return '<div class="lx-wk">' + (w.img ? '<img src="' + esc(w.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-ex-img="' + esc(w.img) + '" data-cap="' + esc(w.title) + '">' : '<div style="flex:0 0 84px;height:84px;border-radius:14px;background:#e3e8f0"></div>') +
        '<div><b>' + esc(w.title) + '</b><small>' + esc(w.desc || w.ext) + '</small><small>À ' + fmtDist(w.dist) + '</small><a href="https://fr.wikipedia.org/?curid=' + encodeURIComponent(w.id) + '" target="_blank" rel="noopener">Lire sur Wikipédia</a></div></div>';
    }).join(''));
    if (!EX.photos) out += card('Photos réelles du quartier', '<div class="lx-empty">Recherche…</div>');
    else if (!EX.photos.length) out += card('Photos réelles du quartier', '<div class="lx-empty">' + (EX.photoErr ? 'Service indisponible pour le moment.' : 'Aucune photo libre géolocalisée dans un rayon de 1,5 km. Tu peux en ajouter sur commons.wikimedia.org.') + '</div>');
    else out += card('Photos réelles du quartier', '<div class="lx-ph">' + EX.photos.map(function (f, i) { return '<button type="button" data-ex-ph="' + i + '" aria-label="' + esc(f.title) + '"><img src="' + esc(f.thumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>'; }).join('') + '</div><p class="lx-note">Photos libres de Wikimedia Commons, prises à moins de 1,5 km. Touche une photo pour l’agrandir.</p>');
    return out;
  }
  function paintEx() {
    var body = $('lx-body'); if (!body || !EX.pos) return; var p = EX.pos, st = body.scrollTop, out = '';
    if (EX.tab === 'here') out = aerialCard(p) + addrCard(EX.addr) + movementCard();
    else if (EX.tab === 'places') out = placesHtml(EX.poi);
    else out = sightsHtml();
    body.innerHTML = out; body.scrollTop = st;
    if (!body.__ex) {
      body.__ex = true;
      body.addEventListener('click', function (e) {
        var t = e.target; if (!t.closest) return;
        var z = t.closest('[data-ex-z]'); if (z) { EX.zoom = +z.getAttribute('data-ex-z'); paintEx(); return; }
        var ph = t.closest('[data-ex-ph]'); if (ph && EX.photos) { var f = EX.photos[+ph.getAttribute('data-ex-ph')]; if (f) lightbox(f.full, f.title + (f.author ? ' — ' + f.author : ''), f.page); return; }
        var im = t.closest('[data-ex-img]'); if (im) { lightbox(im.getAttribute('data-ex-img'), im.getAttribute('data-cap')); return; }
        var go = t.closest('[data-ex-go]'); if (go) { window.open('https://www.openstreetmap.org/?mlat=' + go.getAttribute('data-ex-go').split(',')[0] + '&mlon=' + go.getAttribute('data-ex-go').split(',')[1] + '#map=19/' + go.getAttribute('data-ex-go').replace(',', '/'), '_blank', 'noopener'); return; }
        var ex = t.closest('[data-ex]'); if (!ex) return; var a = ex.getAttribute('data-ex');
        if (a === 'copy') { try { navigator.clipboard.writeText(ex.getAttribute('data-v')); ex.textContent = 'Copié'; } catch (er) { /* ignore */ } }
        else if (a === 'maps') window.open('https://www.google.com/maps/search/?api=1&query=' + EX.pos.lat + ',' + EX.pos.lng, '_blank', 'noopener');
        else if (a === 'share') shareMe();
        else if (a === 'onmap') { showPoisOnMap(); closeShell(); }
        else if (a === 'gpx') exportGpx();
      });
    }
  }
  function shareMe() {
    var p = EX.pos, a = EX.addr && EX.addr.display_name ? EX.addr.display_name : '', url = 'https://www.openstreetmap.org/?mlat=' + p.lat.toFixed(6) + '&mlon=' + p.lng.toFixed(6) + '#map=18/' + p.lat.toFixed(6) + '/' + p.lng.toFixed(6);
    var text = 'Ma position' + (a ? ' : ' + a : '') + '\n' + url;
    if (navigator.share) navigator.share({ title: 'Ma position', text: text }).catch(function () { /* annulé */ }); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }
  function movementCard() {
    var st = LP().state && LP().state(), n = st && st.trk ? st.trk.length : 0;
    return card('Mon déplacement', '<p style="margin:0 0 10px;font-size:.88rem;line-height:1.45">' + (n > 1 ? 'Ton trajet de cette session est tracé sur la carte du Centre de localisation (' + n + ' points, ' + fmtDist(st.dist) + ').' : 'Déplace-toi : ton trajet sera tracé en direct sur la carte.') + '</p>' + (n > 1 ? '<button class="lx-btn s" data-ex="gpx">Exporter le trajet (GPX)</button>' : ''));
  }
  function exportGpx() {
    var st = LP().state && LP().state(); if (!st || !st.trk || st.trk.length < 2) return;
    var x = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Coeurnoh Universe" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Trajet Coeurnoh</name><trkseg>' + st.trk.map(function (p) { return '<trkpt lat="' + p.lat.toFixed(6) + '" lon="' + p.lng.toFixed(6) + '">' + (typeof p.alt === 'number' ? '<ele>' + p.alt.toFixed(1) + '</ele>' : '') + '<time>' + new Date(p.ts).toISOString() + '</time></trkpt>'; }).join('') + '</trkseg></trk></gpx>';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([x], { type: 'application/gpx+xml' })); a.download = 'trajet-' + new Date().toISOString().slice(0, 10) + '.gpx'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ================= Carte Leaflet : trajet + lieux ================= */
  var MAP = { map: null, trail: null, start: null, pois: null };
  function onMap(m) {
    var c = m.getContainer && m.getContainer(); if (!c || c.id !== 'lc-map') return;
    MAP.map = m; MAP.trail = MAP.pois = MAP.start = null; m.on('unload', function () { if (MAP.map === m) { MAP.map = null; MAP.trail = MAP.pois = MAP.start = null; } });
    drawTrail();
  }
  function hookL(L) { try { if (L && L.Map && L.Map.addInitHook && !L.__cnHooked) { L.__cnHooked = true; L.Map.addInitHook(function () { var m = this; setTimeout(function () { onMap(m); }, 0); }); } } catch (e) { /* ignore */ } }
  (function watchL() {
    if (window.L) { hookL(window.L); return; }
    try {
      var cur; Object.defineProperty(window, 'L', { configurable: true, enumerable: true, get: function () { return cur; }, set: function (v) { cur = v; hookL(v); } });
    } catch (e) { var iv = setInterval(function () { if (window.L) { clearInterval(iv); hookL(window.L); } }, 400); }
  })();
  function drawTrail() {
    var L = window.L, m = MAP.map; if (!L || !m) return;
    var st = LP().state && LP().state(), trk = st && st.trk ? st.trk : []; if (trk.length < 2) return;
    var ll = trk.map(function (p) { return [p.lat, p.lng]; });
    try {
      if (!MAP.trail) { MAP.trail = L.polyline(ll, { color: '#1b4fd8', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(m); MAP.start = L.circleMarker(ll[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#0b9a6a', fillOpacity: 1 }).addTo(m).bindTooltip('Départ'); }
      else MAP.trail.setLatLngs(ll);
    } catch (e) { /* carte détruite */ }
  }
  document.addEventListener('cn-lp-pos', drawTrail);
  function showPoisOnMap() {
    var L = window.L, m = MAP.map, P = EX.poi; if (!L || !m || !P || !P.places) return;
    try {
      if (MAP.pois) { MAP.pois.remove(); }
      MAP.pois = L.layerGroup(P.places.slice(0, 60).map(function (x) { return L.circleMarker([x.lat, x.lng], { radius: 6, color: '#fff', weight: 2, fillColor: '#e8590c', fillOpacity: 1 }).bindTooltip(x.name + ' · ' + fmtDist(x.dist)); })).addTo(m);
      var b = L.latLngBounds(P.places.slice(0, 30).map(function (x) { return [x.lat, x.lng]; })); if (EX.pos) b.extend([EX.pos.lat, EX.pos.lng]); m.fitBounds(b, { padding: [30, 30], maxZoom: 18 });
    } catch (e) { /* ignore */ }
  }

  document.addEventListener('cn-lp-open', function (e) { var d = e.detail || {}; if (d.view === 'weather') openWeather(d.pos); else if (d.view === 'explore') openExplore(d.pos); });
  window.CNLocationPlus = { openWeather: openWeather, openExplore: openExplore, _moon: moon, _parsePoi: parsePoi, _rainNow: rainNow, _aqLvl: aqLvl };
})();
