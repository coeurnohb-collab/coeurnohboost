/* site-gallery.js — « Crée ton site » : galerie de modèles 100 % RÉELS.
   Chaque carte et chaque aperçu plein écran est le VRAI rendu serveur d'un site (api/render-site.js, route ?sample=<type>&tpl=<modèle>),
   avec traduction, connexion et espace propriétaire : ce que tu vois ici est exactement ce que ton site donnera.
   20 types d'activité × 23 styles. « Utiliser ce modèle » ouvre le vrai créateur avec le type et le style déjà choisis. Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnSiteGallery) return; window.__cnSiteGallery = true;
  var LANGS = ['fr', 'en', 'es', 'it', 'pt'];
  function lang() { try { return LANGS.indexOf(currentLang) >= 0 ? currentLang : 'fr'; } catch (e) { return 'fr'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(p, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }

  var T = {
    fr: { h: 'Choisis un modèle', s: 'Vrais sites prêts à publier : traduction en 5 langues, connexion, espace propriétaire et messagerie inclus. Touche un modèle pour l’essayer en vrai.', use: 'Utiliser ce modèle', prev: 'Aperçu réel', back: 'Retour', style: 'Style', phone: 'Mobile', desk: 'Ordinateur', pro: 'PRO', load: 'Chargement du site…', note: 'Site d’exemple : le tien affichera tes textes, photos et prix.',
      cats: { all: 'Tous', commerce: 'Commerce', services: 'Services', tourisme: 'Tourisme', creatif: 'Créatif', education: 'Éducation', communaute: 'Communauté' } },
    en: { h: 'Pick a template', s: 'Real, ready-to-publish sites: 5-language translation, login, owner space and messaging included. Tap a template to try it for real.', use: 'Use this template', prev: 'Live preview', back: 'Back', style: 'Style', phone: 'Mobile', desk: 'Desktop', pro: 'PRO', load: 'Loading site…', note: 'Sample site: yours will show your own text, photos and prices.',
      cats: { all: 'All', commerce: 'Commerce', services: 'Services', tourisme: 'Travel', creatif: 'Creative', education: 'Education', communaute: 'Community' } },
    es: { h: 'Elige una plantilla', s: 'Sitios reales listos para publicar: traducción en 5 idiomas, acceso, espacio de propietario y mensajería incluidos. Toca una plantilla para probarla de verdad.', use: 'Usar esta plantilla', prev: 'Vista real', back: 'Volver', style: 'Estilo', phone: 'Móvil', desk: 'Ordenador', pro: 'PRO', load: 'Cargando sitio…', note: 'Sitio de ejemplo: el tuyo mostrará tus textos, fotos y precios.',
      cats: { all: 'Todos', commerce: 'Comercio', services: 'Servicios', tourisme: 'Turismo', creatif: 'Creativo', education: 'Educación', communaute: 'Comunidad' } },
    it: { h: 'Scegli un modello', s: 'Siti reali pronti da pubblicare: traduzione in 5 lingue, login, spazio proprietario e messaggistica inclusi. Tocca un modello per provarlo davvero.', use: 'Usa questo modello', prev: 'Anteprima reale', back: 'Indietro', style: 'Stile', phone: 'Mobile', desk: 'Computer', pro: 'PRO', load: 'Caricamento del sito…', note: 'Sito di esempio: il tuo mostrerà i tuoi testi, foto e prezzi.',
      cats: { all: 'Tutti', commerce: 'Commercio', services: 'Servizi', tourisme: 'Turismo', creatif: 'Creativo', education: 'Istruzione', communaute: 'Comunità' } },
    pt: { h: 'Escolha um modelo', s: 'Sites reais prontos para publicar: tradução em 5 idiomas, login, espaço do dono e mensagens incluídos. Toque num modelo para testá-lo de verdade.', use: 'Usar este modelo', prev: 'Prévia real', back: 'Voltar', style: 'Estilo', phone: 'Celular', desk: 'Computador', pro: 'PRO', load: 'Carregando site…', note: 'Site de exemplo: o seu mostrará seus textos, fotos e preços.',
      cats: { all: 'Todos', commerce: 'Comércio', services: 'Serviços', tourisme: 'Turismo', creatif: 'Criativo', education: 'Educação', communaute: 'Comunidade' } }
  };

  // Catalogue : type d'activité + style par défaut + catégorie (tous les types fonctionnent avec tous les styles)
  var TPL = [
    { ty: 'boutique', tp: 'savane', cat: 'commerce' }, { ty: 'restaurant', tp: 'corail', cat: 'commerce' }, { ty: 'smm', tp: 'cyber', cat: 'commerce' }, { ty: 'auto', tp: 'rubis', cat: 'commerce' },
    { ty: 'entreprise', tp: 'corporate', cat: 'services' }, { ty: 'immobilier', tp: 'ardoise', cat: 'services' }, { ty: 'sante', tp: 'lagon', cat: 'services' }, { ty: 'beaute', tp: 'doux', cat: 'services' },
    { ty: 'juridique', tp: 'royal', cat: 'services' }, { ty: 'sport', tp: 'poster', cat: 'services' },
    { ty: 'hotel', tp: 'or', cat: 'tourisme' }, { ty: 'voyage', tp: 'ocean', cat: 'tourisme' }, { ty: 'evenement', tp: 'festival', cat: 'tourisme' },
    { ty: 'portfolio', tp: 'minimal', cat: 'creatif' }, { ty: 'musique', tp: 'nuit', cat: 'creatif' }, { ty: 'media', tp: 'magazine', cat: 'creatif' }, { ty: 'agence', tp: 'studio', cat: 'creatif' }, { ty: 'tech', tp: 'aurora', cat: 'creatif' },
    { ty: 'education', tp: 'violet', cat: 'education' }, { ty: 'association', tp: 'sable', cat: 'communaute' }
  ];
  var FALLBACK_NAME = { smm: 'Panel SMM', entreprise: 'Entreprise', boutique: 'Boutique', restaurant: 'Restaurant', portfolio: 'Portfolio', musique: 'Musique', education: 'Éducation', sante: 'Santé', immobilier: 'Immobilier', evenement: 'Événements', association: 'Association', beaute: 'Beauté', media: 'Média', agence: 'Agence', hotel: 'Hôtel', voyage: 'Voyage', auto: 'Auto', sport: 'Sport', juridique: 'Juridique', tech: 'Tech' };
  function typeName(ty) { try { if (typeof siteTypeText === 'function') return siteTypeText(ty, 0); } catch (e) { } return FALLBACK_NAME[ty] || ty; }
  function typeDesc(ty) { try { if (typeof siteTypeText === 'function') return siteTypeText(ty, 1); } catch (e) { } return ''; }

  // Styles disponibles (mêmes identifiants que le rendu serveur)
  var TP_NAMES = {
    classique: { fr: 'Classique', en: 'Classic', es: 'Clásico', it: 'Classico', pt: 'Clássico', accent: '#2563eb', premium: false },
    ardoise: { fr: 'Ardoise', en: 'Slate', es: 'Pizarra', it: 'Ardesia', pt: 'Ardósia', accent: '#334155', premium: false },
    ocean: { fr: 'Océan', en: 'Ocean', es: 'Océano', it: 'Oceano', pt: 'Oceano', accent: '#0369a1', premium: false },
    minimal: { fr: 'Minimal', en: 'Minimal', es: 'Minimal', it: 'Minimal', pt: 'Minimal', accent: '#111827', premium: false },
    savane: { fr: 'Savane', en: 'Savanna', es: 'Sabana', it: 'Savana', pt: 'Savana', accent: '#a16207', premium: false },
    royal: { fr: 'Royal', en: 'Royal', es: 'Real', it: 'Reale', pt: 'Real', accent: '#c9a227', premium: true },
    corail: { fr: 'Corail', en: 'Coral', es: 'Coral', it: 'Corallo', pt: 'Coral', accent: '#e8590c', premium: false },
    emeraude: { fr: 'Émeraude', en: 'Emerald', es: 'Esmeralda', it: 'Smeraldo', pt: 'Esmeralda', accent: '#047857', premium: true },
    magazine: { fr: 'Magazine', en: 'Magazine', es: 'Revista', it: 'Rivista', pt: 'Revista', accent: '#be123c', premium: true },
    violet: { fr: 'Violet', en: 'Violet', es: 'Violeta', it: 'Viola', pt: 'Violeta', accent: '#6d28d9', premium: true },
    sable: { fr: 'Sable', en: 'Sand', es: 'Arena', it: 'Sabbia', pt: 'Areia', accent: '#b45309', premium: false },
    nuit: { fr: 'Nuit', en: 'Night', es: 'Noche', it: 'Notte', pt: 'Noite', accent: '#22d3ee', premium: true },
    congo: { fr: 'Congo', en: 'Congo', es: 'Congo', it: 'Congo', pt: 'Congo', accent: '#007fff', premium: true },
    aurora: { fr: 'Aurore', en: 'Aurora', es: 'Aurora', it: 'Aurora', pt: 'Aurora', accent: '#8b5cf6', premium: true },
    cyber: { fr: 'Cyber', en: 'Cyber', es: 'Cyber', it: 'Cyber', pt: 'Cyber', accent: '#10b981', premium: true },
    studio: { fr: 'Studio', en: 'Studio', es: 'Estudio', it: 'Studio', pt: 'Estúdio', accent: '#0f172a', premium: false },
    atelier: { fr: 'Atelier', en: 'Workshop', es: 'Taller', it: 'Atelier', pt: 'Ateliê', accent: '#b45309', premium: false },
    poster: { fr: 'Affiche', en: 'Poster', es: 'Cartel', it: 'Locandina', pt: 'Pôster', accent: '#ef4444', premium: true },
    festival: { fr: 'Festival', en: 'Festival', es: 'Festival', it: 'Festival', pt: 'Festival', accent: '#f59e0b', premium: true },
    lagon: { fr: 'Lagon', en: 'Lagoon', es: 'Laguna', it: 'Laguna', pt: 'Lagoa', accent: '#0891b2', premium: false },
    or: { fr: 'Or', en: 'Gold', es: 'Oro', it: 'Oro', pt: 'Ouro', accent: '#c9a227', premium: true },
    corporate: { fr: 'Corporate', en: 'Corporate', es: 'Corporativo', it: 'Corporate', pt: 'Corporativo', accent: '#1d4ed8', premium: false },
    foret: { fr: 'Forêt', en: 'Forest', es: 'Bosque', it: 'Foresta', pt: 'Floresta', accent: '#166534', premium: false },
    rubis: { fr: 'Rubis', en: 'Ruby', es: 'Rubí', it: 'Rubino', pt: 'Rubi', accent: '#be123c', premium: true }
  };
  var STYLE_ORDER = ['classique', 'corporate', 'ocean', 'lagon', 'foret', 'savane', 'sable', 'atelier', 'studio', 'minimal', 'ardoise', 'corail', 'violet', 'aurora', 'cyber', 'nuit', 'royal', 'or', 'emeraude', 'magazine', 'rubis', 'poster', 'festival', 'congo'];
  // Enregistre les styles dans le créateur (liste déroulante + noms traduits) sans toucher à sa logique
  function registerTemplates() {
    try {
      Object.keys(TP_NAMES).forEach(function (k) {
        if (k === 'classique') return;
        var o = TP_NAMES[k], key = 'site_template_' + k;
        try { if (typeof SITE_TEMPLATES === 'object' && !SITE_TEMPLATES[k]) { var e = { label: key, accent: o.accent }; if (o.premium) e.premium = true; SITE_TEMPLATES[k] = e; } } catch (e1) { }
        try { LANGS.forEach(function (l) { if (TRANSLATIONS[l] && !TRANSLATIONS[l][key]) TRANSLATIONS[l][key] = o[l] || o.fr; }); } catch (e2) { }
      });
    } catch (e) { }
  }
  registerTemplates();
  function isPro(tp) { try { return !!(SITE_TEMPLATES[tp] && SITE_TEMPLATES[tp].premium); } catch (e) { return !!(TP_NAMES[tp] && TP_NAMES[tp].premium); } }
  function sampleUrl(ty, tp) { return '/api/render-site?sample=' + encodeURIComponent(ty) + '&tpl=' + encodeURIComponent(tp) + '&lang=' + lang(); }

  var curCat = 'all', io = null;
  function chips() {
    var t = T[lang()];
    return '<div class="sg-chips" role="tablist">' + ['all', 'commerce', 'services', 'tourisme', 'creatif', 'education', 'communaute'].map(function (k) {
      return '<button type="button" class="sg-chip' + (k === curCat ? ' on' : '') + '" data-sg-cat="' + k + '">' + esc(t.cats[k]) + '</button>';
    }).join('') + '</div>';
  }
  function card(x) {
    var t = T[lang()], tn = TP_NAMES[x.tp] || {};
    return '<div class="sg-card" role="button" tabindex="0" data-sg-open="' + x.ty + '" data-tp="' + x.tp + '">' +
      '<div class="sg-shot" data-src="' + esc(sampleUrl(x.ty, x.tp)) + '"><span class="sg-spin"></span></div>' +
      '<div class="sg-meta"><div><b>' + esc(typeName(x.ty)) + '</b><small><i style="background:' + (tn.accent || '#2563eb') + '"></i>' + esc(tn[lang()] || x.tp) + (isPro(x.tp) ? ' · ' + t.pro : '') + '</small></div><span class="sg-go">' + svg('<polyline points="9 6 15 12 9 18"/>', 18) + '</span></div></div>';
  }
  function gallery() {
    var t = T[lang()];
    return '<section class="sg" data-sg="1"><h3>' + esc(t.h) + '</h3><p>' + esc(t.s) + '</p>' + chips() + '<div class="sg-grid">' + TPL.filter(function (x) { return curCat === 'all' || x.cat === curCat; }).map(card).join('') + '</div></section>';
  }
  // Les aperçus des cartes sont de vrais sites réduits : chargés seulement quand la carte devient visible
  function mountShots(root) {
    var shots = (root || document).querySelectorAll('.sg-shot:not([data-m])');
    for (var i = 0; i < shots.length; i++) fit(shots[i]);
    if (!('IntersectionObserver' in window)) { for (var j = 0; j < shots.length; j++) load(shots[j]); return; }
    if (!io) io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } }); }, { rootMargin: '300px 0px' });
    for (var k = 0; k < shots.length; k++) { shots[k].setAttribute('data-m', '1'); io.observe(shots[k]); }
  }
  function fit(el) { var w = el.clientWidth || 300, sc = w / 390; el.style.setProperty('--sc', sc); el.style.height = Math.round(Math.min(300, 560 * sc)) + 'px'; }
  function load(el) {
    if (el.querySelector('iframe')) return;
    var f = document.createElement('iframe'); f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true'); f.setAttribute('title', ''); f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    f.onload = function () { var s = el.querySelector('.sg-spin'); if (s) s.remove(); };
    f.src = el.getAttribute('data-src'); el.appendChild(f);
  }

  // ---- Aperçu plein écran (vrai site, interactif) ----
  var cur = null; // { ty, tp, mode }
  function open(ty, tp) {
    close(); cur = { ty: ty, tp: tp, mode: 'mobile' };
    var t = T[lang()];
    var styles = STYLE_ORDER.map(function (k) { var o = TP_NAMES[k]; return '<button type="button" class="sg-st' + (k === tp ? ' on' : '') + '" data-sg-style="' + k + '"><i style="background:' + o.accent + '"></i>' + esc(o[lang()] || k) + (isPro(k) ? '<em>' + t.pro + '</em>' : '') + '</button>'; }).join('');
    var w = document.createElement('div'); w.id = 'sg-wrap';
    w.innerHTML = '<div class="sg-full"><div class="sg-fbar"><button type="button" class="sg-ib" data-sg-close aria-label="' + esc(t.back) + '">' + svg('<polyline points="15 18 9 12 15 6"/>', 22) + '</button>' +
      '<div class="sg-ft"><b id="sg-fname"></b><small>' + esc(t.prev) + '</small></div>' +
      '<div class="sg-seg"><button type="button" class="on" data-sg-mode="mobile">' + esc(t.phone) + '</button><button type="button" data-sg-mode="desktop">' + esc(t.desk) + '</button></div></div>' +
      '<div class="sg-styles"><span>' + esc(t.style) + '</span>' + styles + '</div>' +
      '<div class="sg-stage" id="sg-stage"><div class="sg-frame" id="sg-frame"><iframe id="sg-iframe" title="' + esc(t.prev) + '" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div><div class="sg-load" id="sg-load">' + esc(t.load) + '</div></div>' +
      '<div class="sg-fcta"><p>' + esc(t.note) + '</p><button type="button" class="sg-use" data-sg-use>' + svg('<path d="M12 5v14M5 12h14"/>', 18) + '<span id="sg-usel"></span></button></div></div>';
    document.body.appendChild(w); document.documentElement.classList.add('sg-lock');
    window.addEventListener('resize', layout); refresh(true);
  }
  function close() { var w = document.getElementById('sg-wrap'); if (w) w.remove(); document.documentElement.classList.remove('sg-lock'); window.removeEventListener('resize', layout); cur = null; }
  function refresh(first) {
    if (!cur) return;
    var t = T[lang()], tn = TP_NAMES[cur.tp] || {}, f = document.getElementById('sg-iframe'), ld = document.getElementById('sg-load');
    document.getElementById('sg-fname').textContent = typeName(cur.ty) + ' · ' + (tn[lang()] || cur.tp);
    document.getElementById('sg-usel').textContent = t.use + (isPro(cur.tp) ? ' · ' + t.pro : '');
    Array.prototype.forEach.call(document.querySelectorAll('#sg-wrap .sg-st'), function (b) { b.classList.toggle('on', b.getAttribute('data-sg-style') === cur.tp); });
    if (ld) ld.style.display = '';
    if (f) { f.onload = function () { if (ld) ld.style.display = 'none'; }; f.src = sampleUrl(cur.ty, cur.tp); }
    layout();
    if (first) { var on = document.querySelector('#sg-wrap .sg-st.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { } } }
  }
  function layout() {
    var stage = document.getElementById('sg-stage'), fr = document.getElementById('sg-frame'); if (!stage || !fr || !cur) return;
    var w = stage.clientWidth, h = stage.clientHeight;
    if (cur.mode === 'desktop') {
      var dw = 1100, sc = Math.min(1, (w - 16) / dw);
      fr.className = 'sg-frame desk'; fr.style.width = dw + 'px'; fr.style.height = Math.round((h - 16) / sc) + 'px'; fr.style.transform = 'scale(' + sc + ')'; fr.style.transformOrigin = 'top left'; fr.style.margin = '8px 0 0 ' + Math.round((w - dw * sc) / 2) + 'px';
    } else {
      var fw = w <= 480 ? w : Math.min(w - 16, 420);
      fr.className = 'sg-frame mob' + (w <= 480 ? ' edge' : ''); fr.style.width = fw + 'px'; fr.style.height = (w <= 480 ? h : h - 16) + 'px'; fr.style.transform = 'none'; fr.style.margin = w <= 480 ? '0' : '8px auto 0';
    }
  }

  // « Utiliser ce modèle » : ouvre le vrai créateur avec le type d'activité et le style déjà choisis
  function use() {
    if (!cur) return; var ty = cur.ty, tp = cur.tp;
    close();
    try {
      if (typeof currentUser === 'undefined' || !currentUser) { openAuth('register'); return; }
      pendingSiteType = ty;
      openSiteForm();
    } catch (e) { try { openSiteTypeGate(); } catch (e2) { } return; }
    var n = 0, iv = setInterval(function () {
      n++;
      var sel = document.getElementById('site-template');
      if (sel) {
        clearInterval(iv);
        try { if (sel.querySelector('option[value="' + tp + '"]')) sel.value = tp; } catch (e) { }
        try { selectSiteType(ty); } catch (e) { }
      } else if (n > 40) clearInterval(iv);
    }, 100);
  }
  function sync() {
    var host = document.getElementById('site-builder-status'); if (!host) return;
    var hasGate = host.querySelector('[onclick*="openSiteTypeGate"]');
    var g = host.querySelector('[data-sg]');
    if (hasGate && !g) { host.insertAdjacentHTML('beforeend', gallery()); mountShots(host); }
    else if (!hasGate && g) g.remove();
  }
  function rerender() { var g = document.querySelector('[data-sg]'); if (g) { g.remove(); } sync(); }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0.closest) return;
    var st = t0.closest('[data-sg-style]'); if (st && cur) { ev.stopPropagation(); cur.tp = st.getAttribute('data-sg-style'); refresh(); return; }
    var md = t0.closest('[data-sg-mode]'); if (md && cur) { ev.stopPropagation(); cur.mode = md.getAttribute('data-sg-mode'); Array.prototype.forEach.call(document.querySelectorAll('#sg-wrap .sg-seg button'), function (b) { b.classList.toggle('on', b === md); }); layout(); return; }
    var ct = t0.closest('[data-sg-cat]'); if (ct) { ev.stopPropagation(); curCat = ct.getAttribute('data-sg-cat'); rerender(); return; }
    var o = t0.closest('[data-sg-open]'); if (o) { ev.stopPropagation(); open(o.getAttribute('data-sg-open'), o.getAttribute('data-tp')); return; }
    if (t0.closest('[data-sg-close]')) { close(); return; }
    if (t0.closest('[data-sg-use]')) use();
  }, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-sg-open]')) { ev.preventDefault(); open(ev.target.getAttribute('data-sg-open'), ev.target.getAttribute('data-tp')); } });
  window.addEventListener('message', function (e) { if (e && e.data && e.data.cnPreviewBack && document.getElementById('sg-wrap')) close(); });
  (function () {
    var orig = window.closeTopmostOverlay;
    window.closeTopmostOverlay = function () {
      var other = Array.prototype.some.call(document.querySelectorAll('.modal-overlay:not(.hidden)'), function (e) { return e.id !== 'main-menu-modal'; });
      if (!other && document.getElementById('sg-wrap')) { close(); return true; }
      return typeof orig === 'function' ? orig() : false;
    };
  })();
  var tm = null;
  try { new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(sync, 150); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }

  var css = [
    '.sg{margin-top:22px;font-family:var(--cnh-font,system-ui,sans-serif);color:var(--cnh-ink,#111827)}.sg *{box-sizing:border-box}',
    '.sg h3{margin:0 0 4px;font-size:1.125rem;font-weight:700;letter-spacing:-.01em}.sg>p{margin:0 0 12px;font-size:.8125rem;color:var(--cnh-sub,#5a6577);line-height:1.5}',
    '.sg-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}.sg-chips::-webkit-scrollbar{display:none}',
    '.sg-chip{flex:0 0 auto;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:inherit;font:inherit;font-size:.8125rem;font-weight:600;cursor:pointer}.sg-chip.on{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91);color:#fff}',
    '.sg-grid{display:grid;gap:14px;grid-template-columns:1fr 1fr}@media(min-width:900px){.sg-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:380px){.sg-grid{grid-template-columns:1fr}}',
    '.sg-card{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:var(--cnh-shadow,0 4px 14px rgba(17,24,39,.06));transition:transform .18s,box-shadow .18s;touch-action:manipulation;position:relative}',
    '.sg-card:active{transform:scale(.985)}@media(hover:hover){.sg-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(17,24,39,.14)}}',
    '.sg-shot{position:relative;overflow:hidden;background:#e8edf4;width:100%}',
    '.sg-shot iframe{position:absolute;left:0;top:0;width:390px;height:560px;border:0;transform:scale(var(--sc,.4));transform-origin:0 0;pointer-events:none;background:#fff}',
    '.sg-shot::after{content:"";position:absolute;inset:0;z-index:2}',
    '.sg-spin{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:3px solid rgba(100,116,139,.3);border-top-color:#64748b;animation:sgspin .8s linear infinite}@keyframes sgspin{to{transform:rotate(360deg)}}',
    '.sg-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px}.sg-meta b{display:block;font-size:.875rem}.sg-meta small{display:flex;align-items:center;gap:6px;font-size:.72rem;color:var(--cnh-sub,#5a6577)}.sg-meta small i{width:9px;height:9px;border-radius:50%;display:inline-block}.sg-go{color:var(--cnh-brand,#1d4f91)}',
    '.sg-lock{overflow:hidden}#sg-wrap .sg-full{position:fixed;inset:0;z-index:1100;display:flex;flex-direction:column;background:var(--cnh-page,#f4f6f9);color:var(--cnh-ink,#111827);font-family:var(--cnh-font,system-ui,sans-serif);animation:sgIn .26s cubic-bezier(.2,.8,.2,1)}#sg-wrap *{box-sizing:border-box}',
    '@keyframes sgIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
    '.sg-fbar{display:flex;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) 10px 8px;background:var(--cnh-card,#fff)}.sg-ft{flex:1;min-width:0}.sg-ft b{display:block;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sg-ft small{font-size:.72rem;color:var(--cnh-sub,#5a6577)}',
    '.sg-ib{width:42px;height:42px;border-radius:12px;border:0;background:var(--cnh-soft,#eef3f9);color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.sg-seg{display:flex;background:var(--cnh-soft,#eef3f9);border-radius:10px;padding:3px;flex:0 0 auto}.sg-seg button{border:0;background:none;color:inherit;font:inherit;font-size:.75rem;font-weight:700;padding:7px 10px;border-radius:8px;cursor:pointer}.sg-seg button.on{background:var(--cnh-card,#fff);box-shadow:0 1px 4px rgba(0,0,0,.15)}',
    '.sg-styles{display:flex;align-items:center;gap:6px;overflow-x:auto;padding:8px 10px;background:var(--cnh-card,#fff);border-bottom:1px solid var(--cnh-line,#e1e6ed);scrollbar-width:none}.sg-styles::-webkit-scrollbar{display:none}.sg-styles>span{font-size:.72rem;font-weight:700;color:var(--cnh-sub,#5a6577);flex:0 0 auto}',
    '.sg-st{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}.sg-st i{width:10px;height:10px;border-radius:50%}.sg-st em{font-style:normal;font-size:.6rem;font-weight:800;background:#fde68a;color:#78350f;border-radius:6px;padding:1px 5px}.sg-st.on{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91);color:#fff}',
    '.sg-stage{flex:1;position:relative;overflow:hidden;background:#cfd6e0}.sg-frame{background:#fff;overflow:hidden}.sg-frame iframe{width:100%;height:100%;border:0;display:block;background:#fff}.sg-frame.mob:not(.edge){border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.3)}.sg-frame.desk{border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.3)}',
    '.sg-load{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(15,23,42,.85);color:#fff;font-size:.8rem;font-weight:600;padding:8px 14px;border-radius:10px;pointer-events:none}',
    '.sg-fcta{padding:8px 16px max(12px,env(safe-area-inset-bottom));background:var(--cnh-card,#fff);border-top:1px solid var(--cnh-line,#e1e6ed)}.sg-fcta p{margin:0 0 8px;font-size:.72rem;color:var(--cnh-sub,#5a6577);text-align:center}',
    '.sg-use{width:100%;min-height:50px;border-radius:14px;border:0;background:var(--cnh-brand,#1d4f91);color:#fff;font:inherit;font-weight:700;font-size:.9375rem;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}html[data-theme="dark"] .sg-use{color:#0b1220}',
    '@media(prefers-reduced-motion:reduce){#sg-wrap .sg-full{animation:none}.sg-spin{animation:none}}'
  ].join('\n');
  try { var stl = document.createElement('style'); stl.textContent = css; document.head.appendChild(stl); } catch (e) { }
})();
