/* site-models.js — « Crée ton site », étape 3 : les MODÈLES d'une marque.
   Après avoir choisi la marque (boutique, restaurant…), la personne voit ici plus de 40 modèles, tous de VRAIS sites rendus par le serveur
   (api/render-site.js, route ?sample=<marque>&tpl=<modèle>) : ce qu'elle voit est exactement ce que son site donnera.
   Les modèles conseillés pour la marque passent en premier (badge « Recommandé »). Toucher un modèle l'ouvre en grand (mobile / ordinateur) ;
   « Utiliser ce modèle » ouvre le formulaire avec la marque ET le modèle déjà choisis.
   Fichier chargé à la demande par script.js (cnOpenSiteModels). Jamais bloquant : en cas d'échec, script.js ouvre directement le formulaire. */
(function () {
  'use strict';
  if (window.CNSiteModels) return;
  var LANGS = ['fr', 'en', 'es', 'it', 'pt'];
  function lang() { try { return LANGS.indexOf(currentLang) >= 0 ? currentLang : 'fr'; } catch (e) { return 'fr'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(p, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }

  var T = {
    fr: { h: 'Modèles', n: '{n} modèles prêts à publier', back: 'Retour', use: 'Utiliser ce modèle', prev: 'Aperçu réel', phone: 'Mobile', desk: 'Ordinateur', pro: 'PRO', rec: 'Recommandé', load: 'Chargement du site…',
      note: 'Site d’exemple : le vôtre affichera vos textes, vos photos et vos prix.', proNote: 'Modèle du Pack Pro : mise en ligne avec le Pack Pro.', foot: 'Tous les modèles se modifient ensuite (couleurs, logo, textes, photos) et vous pourrez changer de modèle plus tard.',
      f: { rec: 'Recommandés', all: 'Tous', free: 'Gratuits', pro: 'Pro', light: 'Clairs', dark: 'Sombres', color: 'Colorés' }, tone: { light: 'Clair', dark: 'Sombre', color: 'Coloré' }, empty: 'Aucun modèle dans cette liste.', models: 'Modèles' },
    en: { h: 'Templates', n: '{n} ready-to-publish templates', back: 'Back', use: 'Use this template', prev: 'Live preview', phone: 'Mobile', desk: 'Desktop', pro: 'PRO', rec: 'Recommended', load: 'Loading site…',
      note: 'Sample site: yours will show your own text, photos and prices.', proNote: 'Pro Pack template: publishing needs the Pro Pack.', foot: 'Every template can be edited afterwards (colours, logo, text, photos) and you can switch template later.',
      f: { rec: 'Recommended', all: 'All', free: 'Free', pro: 'Pro', light: 'Light', dark: 'Dark', color: 'Colourful' }, tone: { light: 'Light', dark: 'Dark', color: 'Colourful' }, empty: 'No template in this list.', models: 'Templates' },
    es: { h: 'Plantillas', n: '{n} plantillas listas para publicar', back: 'Volver', use: 'Usar esta plantilla', prev: 'Vista real', phone: 'Móvil', desk: 'Ordenador', pro: 'PRO', rec: 'Recomendada', load: 'Cargando sitio…',
      note: 'Sitio de ejemplo: el tuyo mostrará tus textos, fotos y precios.', proNote: 'Plantilla del Pack Pro: la publicación requiere el Pack Pro.', foot: 'Todas las plantillas se pueden editar después (colores, logo, textos, fotos) y podrás cambiar de plantilla más tarde.',
      f: { rec: 'Recomendadas', all: 'Todas', free: 'Gratis', pro: 'Pro', light: 'Claras', dark: 'Oscuras', color: 'Coloridas' }, tone: { light: 'Claro', dark: 'Oscuro', color: 'Colorido' }, empty: 'Ninguna plantilla en esta lista.', models: 'Plantillas' },
    it: { h: 'Modelli', n: '{n} modelli pronti da pubblicare', back: 'Indietro', use: 'Usa questo modello', prev: 'Anteprima reale', phone: 'Mobile', desk: 'Computer', pro: 'PRO', rec: 'Consigliato', load: 'Caricamento del sito…',
      note: 'Sito di esempio: il tuo mostrerà i tuoi testi, foto e prezzi.', proNote: 'Modello del Pack Pro: la pubblicazione richiede il Pack Pro.', foot: 'Ogni modello si può modificare dopo (colori, logo, testi, foto) e potrai cambiare modello più tardi.',
      f: { rec: 'Consigliati', all: 'Tutti', free: 'Gratuiti', pro: 'Pro', light: 'Chiari', dark: 'Scuri', color: 'Colorati' }, tone: { light: 'Chiaro', dark: 'Scuro', color: 'Colorato' }, empty: 'Nessun modello in questo elenco.', models: 'Modelli' },
    pt: { h: 'Modelos', n: '{n} modelos prontos a publicar', back: 'Voltar', use: 'Usar este modelo', prev: 'Prévia real', phone: 'Celular', desk: 'Computador', pro: 'PRO', rec: 'Recomendado', load: 'Carregando site…',
      note: 'Site de exemplo: o seu mostrará seus textos, fotos e preços.', proNote: 'Modelo do Pack Pro: a publicação exige o Pack Pro.', foot: 'Todos os modelos podem ser editados depois (cores, logo, textos, fotos) e você poderá trocar de modelo mais tarde.',
      f: { rec: 'Recomendados', all: 'Todos', free: 'Grátis', pro: 'Pro', light: 'Claros', dark: 'Escuros', color: 'Coloridos' }, tone: { light: 'Claro', dark: 'Escuro', color: 'Colorido' }, empty: 'Nenhum modelo nesta lista.', models: 'Modelos' }
  };

  // Tous les modèles (mêmes identifiants que api/render-site.js), classés par tonalité.
  var DARK = { sombre: 1, royal: 1, nuit: 1, aurora: 1, cyber: 1, festival: 1, or: 1, rubis: 1, kinshasa: 1, goma: 1, virunga: 1, ebene: 1, saphir: 1 };
  var LIGHT = { ardoise: 1, minimal: 1, magazine: 1, violet: 1, sable: 1, congo: 1, studio: 1, atelier: 1, lagon: 1, foret: 1, kivu: 1, katanga: 1, okapi: 1, ivoire: 1, amethyste: 1, leopard: 1, equateur: 1, kasai: 1 };
  var ALL = ['classique', 'corporate', 'ocean', 'lagon', 'tanganyika', 'kivu', 'foret', 'equateur', 'savane', 'sable', 'katanga', 'atelier', 'studio', 'leopard', 'minimal', 'ivoire', 'ardoise', 'lualaba', 'corail', 'chaleureux', 'doux', 'nature', 'emeraude',
    'violet', 'amethyste', 'kasai', 'magazine', 'okapi', 'congo', 'poster', 'festival', 'rubis', 'goma', 'kinshasa', 'virunga', 'aurora', 'cyber', 'nuit', 'saphir', 'royal', 'or', 'ebene', 'sombre'];
  // Les 6 modèles qui vont le mieux à chaque marque (affichés en premier, avec le badge « Recommandé »).
  var REC = {
    boutique: ['kinshasa', 'corail', 'savane', 'congo', 'royal', 'kivu'], restaurant: ['corail', 'katanga', 'savane', 'chaleureux', 'goma', 'okapi'],
    smm: ['cyber', 'aurora', 'nuit', 'saphir', 'virunga', 'kinshasa'], auto: ['rubis', 'goma', 'corporate', 'kinshasa', 'ebene', 'saphir'],
    entreprise: ['corporate', 'tanganyika', 'ardoise', 'classique', 'saphir', 'ocean'], immobilier: ['ardoise', 'ivoire', 'corporate', 'equateur', 'tanganyika', 'royal'],
    sante: ['lagon', 'kivu', 'equateur', 'classique', 'emeraude', 'tanganyika'], beaute: ['doux', 'amethyste', 'kasai', 'ivoire', 'or', 'ebene'],
    juridique: ['royal', 'ebene', 'ivoire', 'corporate', 'okapi', 'ardoise'], sport: ['poster', 'goma', 'festival', 'rubis', 'leopard', 'virunga'],
    hotel: ['or', 'ivoire', 'kivu', 'tanganyika', 'royal', 'ebene'], voyage: ['ocean', 'kivu', 'lagon', 'virunga', 'equateur', 'tanganyika'],
    evenement: ['festival', 'poster', 'amethyste', 'kinshasa', 'goma', 'kasai'], portfolio: ['minimal', 'studio', 'ivoire', 'atelier', 'leopard', 'okapi'],
    musique: ['nuit', 'festival', 'kinshasa', 'aurora', 'goma', 'saphir'], media: ['magazine', 'okapi', 'studio', 'leopard', 'classique', 'ardoise'],
    agence: ['studio', 'leopard', 'aurora', 'minimal', 'kinshasa', 'saphir'], tech: ['aurora', 'cyber', 'saphir', 'nuit', 'lualaba', 'corporate'],
    education: ['violet', 'lualaba', 'classique', 'kivu', 'equateur', 'corporate'], association: ['sable', 'nature', 'equateur', 'katanga', 'foret', 'chaleureux']
  };
  var FALLBACK_NAME = { smm: 'Panel SMM', entreprise: 'Entreprise', boutique: 'Boutique', restaurant: 'Restaurant', portfolio: 'Portfolio', musique: 'Musique', education: 'Éducation', sante: 'Santé', immobilier: 'Immobilier', evenement: 'Événements', association: 'Association', beaute: 'Beauté', media: 'Média', agence: 'Agence', hotel: 'Hôtel', voyage: 'Voyage', auto: 'Auto', sport: 'Sport', juridique: 'Juridique', tech: 'Tech' };

  function tone(k) { return DARK[k] ? 'dark' : LIGHT[k] ? 'light' : 'color'; }
  function typeName(ty) { try { if (typeof siteTypeText === 'function') return siteTypeText(ty, 0); } catch (e) { } return FALLBACK_NAME[ty] || ty; }
  function tpl(k) { try { return (typeof SITE_TEMPLATES === 'object' && SITE_TEMPLATES[k]) || null; } catch (e) { return null; } }
  function nameOf(k) { var o = tpl(k); try { if (o && typeof t === 'function') { var s = t(o.label); if (s && s !== o.label) return s; } } catch (e) { } return k.charAt(0).toUpperCase() + k.slice(1); }
  function accentOf(k) { var o = tpl(k); return (o && o.accent) || '#2563eb'; }
  function isPro(k) { var o = tpl(k); return !!(o && o.premium); }
  function sampleUrl(ty, k) { return '/api/render-site?sample=' + encodeURIComponent(ty) + '&tpl=' + encodeURIComponent(k) + '&lang=' + lang() + '&v=20261106'; }
  function models(ty) {
    var rec = (REC[ty] || []).filter(function (k) { return ALL.indexOf(k) >= 0; });
    return rec.concat(ALL.filter(function (k) { return rec.indexOf(k) < 0; }));
  }

  var curTy = '', curFilter = 'all', io = null, ioOff = null, queue = [], busy = 0;

  /* ---------- Page « modèles » ---------- */
  function visible() {
    var list = models(curTy), rec = REC[curTy] || [];
    return list.filter(function (k) {
      if (curFilter === 'rec') return rec.indexOf(k) >= 0;
      if (curFilter === 'free') return !isPro(k);
      if (curFilter === 'pro') return isPro(k);
      if (curFilter === 'light' || curFilter === 'dark' || curFilter === 'color') return tone(k) === curFilter;
      return true;
    });
  }
  function chips() {
    var tt = T[lang()];
    return '<div class="sm-chips" role="tablist">' + ['rec', 'all', 'free', 'pro', 'light', 'dark', 'color'].map(function (k) {
      return '<button type="button" class="sm-chip' + (k === curFilter ? ' on' : '') + '" data-sm-f="' + k + '">' + esc(tt.f[k]) + '</button>';
    }).join('') + '</div>';
  }
  function card(k) {
    var tt = T[lang()], rec = (REC[curTy] || []).indexOf(k) >= 0;
    return '<div class="sm-card" role="button" tabindex="0" data-sm-open="' + k + '" aria-label="' + esc(nameOf(k)) + '">' +
      '<div class="sm-shot" data-src="' + esc(sampleUrl(curTy, k)) + '"><span class="sm-spin"></span></div>' +
      '<div class="sm-meta"><div class="sm-mt"><b>' + esc(nameOf(k)) + (isPro(k) ? '<em class="sm-pro">' + esc(tt.pro) + '</em>' : '') + '</b>' +
      '<small><i style="background:' + accentOf(k) + '"></i>' + esc(tt.tone[tone(k)]) + (rec ? '<span class="sm-rec">' + esc(tt.rec) + '</span>' : '') + '</small></div>' +
      '<span class="sm-go">' + svg('<polyline points="9 6 15 12 9 18"/>', 18) + '</span></div></div>';
  }
  function drawGrid() {
    var g = document.getElementById('sm-grid'); if (!g) return;
    var tt = T[lang()], list = visible();
    var c = document.getElementById('sm-count'); if (c) c.textContent = tt.n.replace('{n}', models(curTy).length);
    g.innerHTML = list.length ? list.map(card).join('') : '<p class="sm-empty">' + esc(tt.empty) + '</p>';
    unloadAll(); mountShots(g);
    var sc = document.getElementById('sm-body'); if (sc) sc.scrollTop = 0;
  }
  function openType(ty) {
    if (!REC[ty] && !FALLBACK_NAME[ty]) return false;
    closeAll(); curTy = ty; curFilter = 'all';
    var tt = T[lang()];
    var w = document.createElement('div'); w.id = 'sm-page'; w.className = 'sm-page';
    w.innerHTML = '<div class="sm-bar"><button type="button" class="sm-ib" data-sm-back aria-label="' + esc(tt.back) + '">' + svg('<polyline points="15 18 9 12 15 6"/>', 22) + '</button>' +
      '<div class="sm-ft"><b>' + esc(tt.h) + ' · ' + esc(typeName(ty)) + '</b><small id="sm-count"></small></div></div>' +
      '<div class="sm-body" id="sm-body">' + chips() + '<div class="sm-grid" id="sm-grid"></div><p class="sm-foot">' + svg('<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>', 16) + '<span>' + esc(tt.foot) + '</span></p></div>';
    document.body.appendChild(w); document.body.classList.add('fs-open');
    drawGrid();
    return true;
  }
  function closeAll() {
    closeFull();
    var w = document.getElementById('sm-page'); if (w) w.remove();
    if (io) { try { io.disconnect(); } catch (e) { } io = null; } if (ioOff) { try { ioOff.disconnect(); } catch (e) { } ioOff = null; }
    queue = []; busy = 0;
    if (!document.querySelector('.fs-page')) document.body.classList.remove('fs-open');
  }

  /* ---------- Aperçus en miniature : de vrais sites réduits, chargés à mesure qu'on défile (4 à la fois, et déchargés quand ils sortent de l'écran) ---------- */
  function fit(el) { var w = el.clientWidth || 160, sc = w / 390; el.style.setProperty('--sc', sc); el.style.height = Math.round(Math.min(300, 540 * sc)) + 'px'; }
  function mountShots(root) {
    var shots = root.querySelectorAll('.sm-shot');
    for (var i = 0; i < shots.length; i++) fit(shots[i]);
    if (!('IntersectionObserver' in window)) { for (var j = 0; j < Math.min(8, shots.length); j++) enqueue(shots[j]); return; }
    if (io) io.disconnect(); if (ioOff) ioOff.disconnect();
    io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) enqueue(e.target); }); }, { root: document.getElementById('sm-body'), rootMargin: '350px 0px' });
    ioOff = new IntersectionObserver(function (en) { en.forEach(function (e) { if (!e.isIntersecting) unload(e.target); }); }, { root: document.getElementById('sm-body'), rootMargin: '1600px 0px' });
    for (var k = 0; k < shots.length; k++) { io.observe(shots[k]); ioOff.observe(shots[k]); }
  }
  function enqueue(el) { if (el.querySelector('iframe') || el.__q) return; el.__q = 1; queue.push(el); pump(); }
  function pump() {
    while (busy < 4 && queue.length) {
      var el = queue.shift(); el.__q = 0;
      if (!el.isConnected || el.querySelector('iframe')) continue;
      busy++;
      var done = false, fin = function (sp) { if (done) return; done = true; busy = Math.max(0, busy - 1); if (sp && sp.parentNode) sp.remove(); pump(); };
      var f = document.createElement('iframe'); f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true'); f.setAttribute('title', ''); f.setAttribute('sandbox', 'allow-scripts allow-same-origin'); f.setAttribute('loading', 'lazy');
      var sp = el.querySelector('.sm-spin');
      f.onload = function () { fin(sp); }; f.onerror = function () { fin(sp); };
      setTimeout(function () { fin(sp); }, 9000);
      f.src = el.getAttribute('data-src'); el.insertBefore(f, el.firstChild);
    }
  }
  function unload(el) {
    var f = el.querySelector('iframe'); if (!f) return;
    f.remove(); if (!el.querySelector('.sm-spin')) { var sp = document.createElement('span'); sp.className = 'sm-spin'; el.appendChild(sp); }
  }
  function unloadAll() { var l = document.querySelectorAll('#sm-grid .sm-shot iframe'); for (var i = 0; i < l.length; i++) l[i].remove(); queue = []; }

  /* ---------- Aperçu plein écran (vrai site, interactif) ---------- */
  var cur = null; // { k, mode }
  function openFull(k) {
    closeFull(); cur = { k: k, mode: 'mobile' };
    var tt = T[lang()];
    var strip = visible().map(function (m) { return '<button type="button" class="sm-st' + (m === k ? ' on' : '') + '" data-sm-pick="' + m + '"><i style="background:' + accentOf(m) + '"></i>' + esc(nameOf(m)) + (isPro(m) ? '<em>' + esc(tt.pro) + '</em>' : '') + '</button>'; }).join('');
    var w = document.createElement('div'); w.id = 'sm-full'; w.className = 'sm-full';
    w.innerHTML = '<div class="sm-bar"><button type="button" class="sm-ib" data-sm-fclose aria-label="' + esc(tt.back) + '">' + svg('<polyline points="15 18 9 12 15 6"/>', 22) + '</button>' +
      '<div class="sm-ft"><b id="sm-fname"></b><small>' + esc(tt.prev) + '</small></div>' +
      '<div class="sm-seg"><button type="button" class="on" data-sm-mode="mobile">' + esc(tt.phone) + '</button><button type="button" data-sm-mode="desktop">' + esc(tt.desk) + '</button></div></div>' +
      '<div class="sm-styles"><span>' + esc(tt.models) + '</span>' + strip + '</div>' +
      '<div class="sm-stage" id="sm-stage"><div class="sm-frame" id="sm-frame"><iframe id="sm-iframe" title="' + esc(tt.prev) + '" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div><div class="sm-load" id="sm-load">' + esc(tt.load) + '</div></div>' +
      '<div class="sm-fcta"><p id="sm-fnote"></p><button type="button" class="sm-use" data-sm-use>' + svg('<path d="M12 5v14M5 12h14"/>', 18) + '<span id="sm-usel"></span></button></div>';
    document.body.appendChild(w); document.documentElement.classList.add('sm-lock');
    window.addEventListener('resize', layout); refresh(true);
  }
  function closeFull() { var w = document.getElementById('sm-full'); if (w) w.remove(); document.documentElement.classList.remove('sm-lock'); window.removeEventListener('resize', layout); cur = null; }
  function refresh(first) {
    if (!cur) return;
    var tt = T[lang()], f = document.getElementById('sm-iframe'), ld = document.getElementById('sm-load');
    document.getElementById('sm-fname').textContent = typeName(curTy) + ' · ' + nameOf(cur.k);
    document.getElementById('sm-usel').textContent = tt.use + (isPro(cur.k) ? ' · ' + tt.pro : '');
    document.getElementById('sm-fnote').textContent = isPro(cur.k) ? tt.proNote : tt.note;
    Array.prototype.forEach.call(document.querySelectorAll('#sm-full .sm-st'), function (b) { b.classList.toggle('on', b.getAttribute('data-sm-pick') === cur.k); });
    if (ld) ld.style.display = '';
    if (f) { f.onload = function () { if (ld) ld.style.display = 'none'; }; f.src = sampleUrl(curTy, cur.k); }
    layout();
    if (first) { var on = document.querySelector('#sm-full .sm-st.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { } } }
  }
  function layout() {
    var stage = document.getElementById('sm-stage'), fr = document.getElementById('sm-frame'); if (!stage || !fr || !cur) return;
    var w = stage.clientWidth, h = stage.clientHeight;
    if (cur.mode === 'desktop') {
      var dw = 1100, sc = Math.min(1, (w - 16) / dw);
      fr.className = 'sm-frame desk'; fr.style.width = dw + 'px'; fr.style.height = Math.round((h - 16) / sc) + 'px'; fr.style.transform = 'scale(' + sc + ')'; fr.style.transformOrigin = 'top left'; fr.style.margin = '8px 0 0 ' + Math.round((w - dw * sc) / 2) + 'px';
    } else {
      var fw = w <= 480 ? w : Math.min(w - 16, 420);
      fr.className = 'sm-frame mob' + (w <= 480 ? ' edge' : ''); fr.style.width = fw + 'px'; fr.style.height = (w <= 480 ? h : h - 16) + 'px'; fr.style.transform = 'none'; fr.style.margin = w <= 480 ? '0' : '8px auto 0';
    }
  }

  // « Utiliser ce modèle » : ouvre le formulaire de création avec la marque et le modèle déjà choisis.
  function use() {
    if (!cur) return; var ty = curTy, k = cur.k;
    try {
      if (typeof currentUser === 'undefined' || !currentUser) { closeAll(); openAuth('register'); return; }
    } catch (e0) { }
    closeAll();
    try { if (typeof closeSiteTypeGate === 'function') closeSiteTypeGate(); } catch (e1) { }
    try { pendingSiteType = ty; openSiteForm(); } catch (e2) { try { openSiteTypeGate(); } catch (e3) { } return; }
    var n = 0, iv = setInterval(function () {
      n++;
      var sel = document.getElementById('site-template');
      if (sel) {
        clearInterval(iv);
        try { if (sel.querySelector('option[value="' + k + '"]')) sel.value = k; } catch (e) { }
        try { selectSiteType(ty); } catch (e) { }
      } else if (n > 40) clearInterval(iv);
    }, 100);
  }

  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0 || !t0.closest) return;
    var pk = t0.closest('[data-sm-pick]'); if (pk && cur) { ev.stopPropagation(); cur.k = pk.getAttribute('data-sm-pick'); refresh(); return; }
    var md = t0.closest('[data-sm-mode]'); if (md && cur) { ev.stopPropagation(); cur.mode = md.getAttribute('data-sm-mode'); Array.prototype.forEach.call(document.querySelectorAll('#sm-full .sm-seg button'), function (b) { b.classList.toggle('on', b === md); }); layout(); return; }
    var fl = t0.closest('[data-sm-f]'); if (fl) { ev.stopPropagation(); curFilter = fl.getAttribute('data-sm-f'); Array.prototype.forEach.call(document.querySelectorAll('#sm-page .sm-chip'), function (b) { b.classList.toggle('on', b === fl); }); drawGrid(); return; }
    var o = t0.closest('[data-sm-open]'); if (o) { ev.stopPropagation(); openFull(o.getAttribute('data-sm-open')); return; }
    if (t0.closest('[data-sm-fclose]')) { ev.stopPropagation(); closeFull(); return; }
    if (t0.closest('[data-sm-back]')) { ev.stopPropagation(); closeAll(); return; }
    if (t0.closest('[data-sm-use]')) { ev.stopPropagation(); use(); }
  }, true);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { if (document.getElementById('sm-full')) closeFull(); else if (document.getElementById('sm-page')) closeAll(); }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.matches && ev.target.matches('[data-sm-open]')) { ev.preventDefault(); openFull(ev.target.getAttribute('data-sm-open')); }
  });
  // Le bouton « retour » du site d'exemple (dans l'aperçu) ferme l'aperçu.
  window.addEventListener('message', function (e) { if (e && e.data && e.data.cnPreviewBack && document.getElementById('sm-full')) closeFull(); });
  // Le bouton « retour » du téléphone ferme d'abord l'aperçu, puis la page des modèles.
  (function () {
    var orig = window.closeTopmostOverlay;
    window.closeTopmostOverlay = function () {
      if (document.getElementById('sm-full')) { closeFull(); return true; }
      if (document.getElementById('sm-page')) { closeAll(); return true; }
      return typeof orig === 'function' ? orig() : false;
    };
  })();

  var css = [
    '.sm-page{position:fixed;inset:0;z-index:1250;display:flex;flex-direction:column;background:var(--soft,#f4f6f9);color:var(--ink,#111827);animation:smIn .24s cubic-bezier(.2,.8,.2,1)}.sm-page *,.sm-full *{box-sizing:border-box}',
    '@keyframes smIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}',
    '.sm-bar{display:flex;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) 10px 8px;background:var(--white,#fff);border-bottom:1px solid var(--line,#e1e6ed)}.sm-ft{flex:1;min-width:0}.sm-ft b{display:block;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sm-ft small{display:block;font-size:.72rem;color:var(--muted,#5a6577)}',
    '.sm-ib{width:42px;height:42px;border-radius:12px;border:0;background:var(--soft-2,#eef3f9);color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.sm-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 12px max(24px,env(safe-area-inset-bottom))}',
    '.sm-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}.sm-chips::-webkit-scrollbar{display:none}',
    '.sm-chip{flex:0 0 auto;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#e1e6ed);background:var(--white,#fff);color:inherit;font:inherit;font-size:.8125rem;font-weight:600;cursor:pointer}.sm-chip.on{background:var(--btn,#1d4f91);border-color:var(--btn,#1d4f91);color:#fff}',
    '.sm-grid{display:grid;gap:12px;grid-template-columns:1fr 1fr}@media(min-width:760px){.sm-grid{grid-template-columns:repeat(3,1fr)}}@media(min-width:1100px){.sm-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:340px){.sm-grid{grid-template-columns:1fr}}',
    '.sm-card{background:var(--white,#fff);border:1px solid var(--line,#e1e6ed);border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .16s,box-shadow .16s;touch-action:manipulation;position:relative}',
    '.sm-card:active{transform:scale(.985)}@media(hover:hover){.sm-card:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(17,24,39,.14)}}.sm-card:focus-visible{outline:2px solid var(--btn,#1d4f91);outline-offset:2px}',
    '.sm-shot{position:relative;overflow:hidden;background:#e8edf4;width:100%;min-height:120px}',
    '.sm-shot iframe{position:absolute;left:0;top:0;width:390px;height:560px;border:0;transform:scale(var(--sc,.4));transform-origin:0 0;pointer-events:none;background:#fff}',
    '.sm-shot::after{content:"";position:absolute;inset:0;z-index:2}',
    '.sm-spin{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:3px solid rgba(100,116,139,.3);border-top-color:#64748b;animation:smspin .8s linear infinite}@keyframes smspin{to{transform:rotate(360deg)}}',
    '.sm-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px}.sm-mt{min-width:0}.sm-meta b{display:flex;align-items:center;gap:6px;font-size:.875rem}.sm-meta small{display:flex;align-items:center;flex-wrap:wrap;gap:3px 6px;font-size:.72rem;color:var(--muted,#5a6577);margin-top:2px}.sm-meta small i{width:9px;height:9px;border-radius:50%;display:inline-block;flex:0 0 auto}.sm-go{color:var(--btn,#1d4f91);flex:0 0 auto}',
    '.sm-pro{font-style:normal;font-size:.58rem;font-weight:800;background:#fde68a;color:#78350f;border-radius:5px;padding:2px 5px;letter-spacing:.02em}.sm-rec{flex-basis:100%;font-weight:700;color:var(--btn,#28374f)}',
    '.sm-empty{grid-column:1/-1;text-align:center;color:var(--muted,#5a6577);font-size:.875rem;padding:30px 0}',
    '.sm-foot{display:flex;gap:8px;align-items:flex-start;margin:18px 2px 0;font-size:.75rem;line-height:1.5;color:var(--muted,#5a6577)}.sm-foot svg{flex:0 0 auto;margin-top:1px}',
    '.sm-lock{overflow:hidden}.sm-full{position:fixed;inset:0;z-index:1300;display:flex;flex-direction:column;background:var(--soft,#f4f6f9);color:var(--ink,#111827);animation:smIn .24s cubic-bezier(.2,.8,.2,1)}',
    '.sm-seg{display:flex;background:var(--soft-2,#eef3f9);border-radius:10px;padding:3px;flex:0 0 auto}.sm-seg button{border:0;background:none;color:inherit;font:inherit;font-size:.75rem;font-weight:700;padding:7px 10px;border-radius:8px;cursor:pointer}.sm-seg button.on{background:var(--white,#fff);box-shadow:0 1px 4px rgba(0,0,0,.15)}',
    '.sm-styles{display:flex;align-items:center;gap:6px;overflow-x:auto;padding:8px 10px;background:var(--white,#fff);border-bottom:1px solid var(--line,#e1e6ed);scrollbar-width:none}.sm-styles::-webkit-scrollbar{display:none}.sm-styles>span{font-size:.72rem;font-weight:700;color:var(--muted,#5a6577);flex:0 0 auto}',
    '.sm-st{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,#e1e6ed);background:var(--white,#fff);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}.sm-st i{width:10px;height:10px;border-radius:50%}.sm-st em{font-style:normal;font-size:.6rem;font-weight:800;background:#fde68a;color:#78350f;border-radius:6px;padding:1px 5px}.sm-st.on{background:var(--btn,#1d4f91);border-color:var(--btn,#1d4f91);color:#fff}',
    '.sm-stage{flex:1;position:relative;overflow:hidden;background:#cfd6e0}.sm-frame{background:#fff;overflow:hidden}.sm-frame iframe{width:100%;height:100%;border:0;display:block;background:#fff}.sm-frame.mob:not(.edge){border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.3)}.sm-frame.desk{border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.3)}',
    '.sm-load{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(15,23,42,.85);color:#fff;font-size:.8rem;font-weight:600;padding:8px 14px;border-radius:10px;pointer-events:none}',
    '.sm-fcta{padding:8px 16px max(12px,env(safe-area-inset-bottom));background:var(--white,#fff);border-top:1px solid var(--line,#e1e6ed)}.sm-fcta p{margin:0 0 8px;font-size:.72rem;color:var(--muted,#5a6577);text-align:center}',
    '.sm-use{width:100%;min-height:50px;border-radius:14px;border:0;background:var(--btn,#1d4f91);color:#fff;font:inherit;font-weight:700;font-size:.9375rem;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}',
    '@media(prefers-reduced-motion:reduce){.sm-page,.sm-full{animation:none}.sm-spin{animation:none}}'
  ].join('\n');
  try { var stl = document.createElement('style'); stl.textContent = css; document.head.appendChild(stl); } catch (e) { }

  window.CNSiteModels = { open: openType, close: closeAll, ALL: ALL, REC: REC, tone: tone, models: models, __T: T };
})();
