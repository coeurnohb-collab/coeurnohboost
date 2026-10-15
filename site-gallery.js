/* site-gallery.js — « Crée ton site » : galerie de modèles de sites à la manière des grandes plateformes.
   Chaque modèle s'ouvre en aperçu plein écran (menu, bannière, produits, appel à l'action, pied de page) et mène au vrai
   créateur de site. L'administrateur peut y mettre ses propres photos de bannière (comme pour les autres écrans). Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnSiteGallery) return; window.__cnSiteGallery = true;
  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(p, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var CAM = '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>';
  var T = {
    fr: { h: 'Choisis un modèle', s: 'Des sites prêts à publier, adaptés à ton activité. Touche un modèle pour voir comment ton site se présentera.', use: 'Utiliser ce modèle', ex: 'Modèle', prev: 'Aperçu du site', back: 'Retour', note: 'Aperçu d’exemple : ton site affichera tes vrais textes, photos et prix.', feat: 'Sélection', all: 'Voir tout', cta: 'Prêt à lancer ton site ?', foot: ['Boutique', 'À propos', 'Contact'], items: ['Article', 'Article', 'Article', 'Article'], perks: ['Livraison rapide', 'Paiement sécurisé', 'Support 7j/7'] },
    en: { h: 'Pick a template', s: 'Ready-to-publish sites for your activity. Tap a template to see how your site will look.', use: 'Use this template', ex: 'Template', prev: 'Site preview', back: 'Back', note: 'Sample preview: your site will show your real texts, photos and prices.', feat: 'Featured', all: 'See all', cta: 'Ready to launch your site?', foot: ['Shop', 'About', 'Contact'], items: ['Item', 'Item', 'Item', 'Item'], perks: ['Fast delivery', 'Secure payment', '24/7 support'] }
  };
  var TPL = [
    { id: 'boutique', c: '#2f9e44', bg: '#14181f', ink: '#fff', dark: true, fr: { n: 'Boutique en ligne', brand: 'MaBoutique', t: 'Les meilleurs produits pour ton quotidien', cta: 'Acheter', cats: ['Nouveautés', 'Meilleures ventes', 'Promotions'], it: ['Écouteurs sans fil', 'Montre connectée', 'Enceinte portable', 'Souris gaming'] }, en: { n: 'Online store', brand: 'MyStore', t: 'The best products for your daily life', cta: 'Shop now', cats: ['New', 'Best sellers', 'Sale'], it: ['Wireless earbuds', 'Smartwatch', 'Portable speaker', 'Gaming mouse'] } },
    { id: 'immobilier', c: '#ee7c35', bg: '#2b3480', ink: '#fff', dark: true, fr: { n: 'Immobilier', brand: 'MonAgence', t: 'Investis dans la maison de tes rêves', cta: 'Voir les biens', cats: ['Maisons', 'Appartements', 'Terrains'], it: ['Villa familiale', 'Appartement moderne', 'Parcelle viabilisée', 'Local commercial'] }, en: { n: 'Real estate', brand: 'MyAgency', t: 'Invest in your dream home', cta: 'View properties', cats: ['Houses', 'Apartments', 'Plots'], it: ['Family villa', 'Modern apartment', 'Serviced plot', 'Commercial unit'] } },
    { id: 'decoration', c: '#d9824a', bg: '#efe8df', ink: '#2a2420', dark: false, fr: { n: 'Décoration & intérieur', brand: 'Atelier Déco', t: 'Compose l’intérieur qui te ressemble', cta: 'Découvrir', cats: ['Salon', 'Bureau', 'Chambre'], it: ['Fauteuil élégant', 'Vase en céramique', 'Lampe minimaliste', 'Table basse'] }, en: { n: 'Home & decor', brand: 'Decor Studio', t: 'Design the interior that suits you', cta: 'Explore', cats: ['Living room', 'Office', 'Bedroom'], it: ['Elegant armchair', 'Ceramic vase', 'Minimalist lamp', 'Coffee table'] } },
    { id: 'restaurant', c: '#c92a2a', bg: '#fff7ec', ink: '#2a1a12', dark: false, fr: { n: 'Restaurant & traiteur', brand: 'Chez Mama', t: 'Une cuisine généreuse, livrée chez toi', cta: 'Commander', cats: ['Plats', 'Boissons', 'Desserts'], it: ['Poulet moambe', 'Poisson braisé', 'Pondu et riz', 'Beignets maison'] }, en: { n: 'Restaurant & catering', brand: 'Mama’s Kitchen', t: 'Generous cooking, delivered to you', cta: 'Order now', cats: ['Mains', 'Drinks', 'Desserts'], it: ['Chicken moambe', 'Grilled fish', 'Pondu and rice', 'Homemade doughnuts'] } },
    { id: 'formation', c: '#3b5bdb', bg: '#eef3ff', ink: '#141a2e', dark: false, fr: { n: 'Formation & coaching', brand: 'Académie Pro', t: 'Apprends, progresse et obtiens ton certificat', cta: 'S’inscrire', cats: ['Cours', 'Ateliers', 'Coaching'], it: ['Excel avancé', 'Marketing digital', 'Anglais pro', 'Gestion de projet'] }, en: { n: 'Training & coaching', brand: 'Pro Academy', t: 'Learn, progress and get certified', cta: 'Enroll', cats: ['Courses', 'Workshops', 'Coaching'], it: ['Advanced Excel', 'Digital marketing', 'Business English', 'Project management'] } }
  ];
  function sc() { return window.CNShowcase; }
  function ph(id) { try { return sc() ? sc().photo('tpl_' + id) : ''; } catch (e) { return ''; } }
  function adm() { try { return sc() && sc().isAdmin(); } catch (e) { return false; } }
  function camBtn(id) { return adm() ? '<span class="sg-adm"><button type="button" data-sg-photo="' + id + '" aria-label="Photo">' + svg(CAM, 15) + '</button>' + (ph(id) ? '<button type="button" data-sg-drop="' + id + '" aria-label="X">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 15) + '</button>' : '') + '</span>' : ''; }

  function mini(tp) {
    var d = tp[lang()], u = ph(tp.id);
    return '<div class="sg-card" role="button" tabindex="0" data-sg-open="' + tp.id + '" style="--a:' + tp.c + ';--bg:' + tp.bg + ';--ink:' + tp.ink + '">' +
      '<div class="sg-frame"><div class="sg-bar"><i></i><i></i><i></i><span></span></div>' +
      '<div class="sg-nav"><b>' + esc(d.brand) + '</b><span>' + d.cats.map(function (c) { return '<u>' + esc(c) + '</u>'; }).join('') + '</span></div>' +
      '<div class="sg-hero' + (u ? ' ph' : '') + '">' + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy" onerror="this.remove()">' : '<i class="o1"></i><i class="o2"></i>') + '<div class="sg-ht"><h4>' + esc(d.t) + '</h4><em>' + esc(d.cta) + '</em></div></div>' +
      '<div class="sg-row"><i></i><i></i><i></i></div>' + camBtn(tp.id) + '</div>' +
      '<div class="sg-meta"><div><b>' + esc(d.n) + '</b><small>' + T[lang()].ex + '</small></div><span class="sg-go">' + svg('<polyline points="9 6 15 12 9 18"/>', 18) + '</span></div></div>';
  }
  function gallery() {
    var t = T[lang()];
    return '<section class="sg" data-sg="1"><h3>' + t.h + '</h3><p>' + t.s + '</p><div class="sg-grid">' + TPL.map(mini).join('') + '</div></section>';
  }
  function full(tp) {
    var l = lang(), d = tp[l], t = T[l], u = ph(tp.id);
    var items = d.it.map(function (n, i) { return '<div class="sg-prod"><div class="sg-pimg" style="--k:' + i + '"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="m21 16-5-5-9 8"/></svg></div><b>' + esc(n) + '</b><span>' + (10 + i * 7) + ' $</span><em>' + esc(d.cta) + '</em></div>'; }).join('');
    return '<div class="sg-full" id="sg-full" style="--a:' + tp.c + ';--bg:' + tp.bg + ';--ink:' + tp.ink + '"><div class="sg-fbar"><button type="button" class="sg-ib" data-sg-close aria-label="' + t.back + '">' + svg('<polyline points="15 18 9 12 15 6"/>', 22) + '</button><b>' + t.prev + '</b><span class="sg-tag">' + t.ex + '</span></div>' +
      '<div class="sg-fscroll"><div class="sg-note">' + esc(t.note) + '</div><div class="sg-site">' +
      '<div class="sg-snav"><b>' + esc(d.brand) + '</b><span>' + d.cats.map(function (c) { return '<u>' + esc(c) + '</u>'; }).join('') + '</span></div>' +
      '<div class="sg-shero' + (u ? ' ph' : '') + '">' + (u ? '<img src="' + esc(u) + '" alt="" onerror="this.remove()">' : '<i class="o1"></i><i class="o2"></i>') + camBtn(tp.id) + '<div class="sg-sht"><h2>' + esc(d.t) + '</h2><em>' + esc(d.cta) + '</em></div></div>' +
      '<div class="sg-perks">' + t.perks.map(function (p) { return '<span>' + svg('<path d="m5 12 5 5 9-10"/>', 15) + esc(p) + '</span>'; }).join('') + '</div>' +
      '<h3 class="sg-st">' + t.feat + '</h3><div class="sg-prods">' + items + '</div>' +
      '<div class="sg-band"><b>' + t.cta + '</b><em>' + esc(d.cta) + '</em></div>' +
      '<div class="sg-foot"><b>' + esc(d.brand) + '</b><span>' + t.foot.join(' · ') + '</span></div></div></div>' +
      '<div class="sg-fcta"><button type="button" class="sg-use" data-sg-use>' + svg('<path d="M12 5v14M5 12h14"/>', 18) + t.use + '</button></div></div>';
  }
  function open(id) {
    var tp = TPL.filter(function (x) { return x.id === id; })[0]; if (!tp) return;
    close(); var w = document.createElement('div'); w.id = 'sg-wrap'; w.innerHTML = full(tp); w.setAttribute('data-id', id); document.body.appendChild(w); document.documentElement.classList.add('sg-lock');
  }
  function close() { var w = document.getElementById('sg-wrap'); if (w) w.remove(); document.documentElement.classList.remove('sg-lock'); }
  function sync() {
    var host = document.getElementById('site-builder-status'); if (!host) return;
    var hasGate = host.querySelector('[onclick*="openSiteTypeGate"]');
    var g = host.querySelector('[data-sg]');
    if (hasGate && !g) host.insertAdjacentHTML('beforeend', gallery());
    else if (!hasGate && g) g.remove();
  }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0.closest) return;
    var p = t0.closest('[data-sg-photo]'); if (p) { ev.stopPropagation(); ev.preventDefault(); sc().pick('tpl_' + p.getAttribute('data-sg-photo')); return; }
    var dr = t0.closest('[data-sg-drop]'); if (dr) { ev.stopPropagation(); ev.preventDefault(); sc().drop('tpl_' + dr.getAttribute('data-sg-drop')); return; }
    var o = t0.closest('[data-sg-open]'); if (o) { ev.stopPropagation(); open(o.getAttribute('data-sg-open')); return; }
    if (t0.closest('[data-sg-close]')) { close(); return; }
    if (t0.closest('[data-sg-use]')) { close(); try { openSiteTypeGate(); } catch (e) { } }
  }, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-sg-open]')) { ev.preventDefault(); open(ev.target.getAttribute('data-sg-open')); } });
  document.addEventListener('cn-showcase-photos', function () { var g = document.querySelector('[data-sg]'); if (g) g.remove(); sync(); var w = document.getElementById('sg-wrap'); if (w) { var id = w.getAttribute('data-id'); open(id); } });
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
    '.sg h3{margin:0 0 4px;font-size:1.125rem;font-weight:700;letter-spacing:-.01em}.sg>p{margin:0 0 14px;font-size:.8125rem;color:var(--cnh-sub,#5a6577);line-height:1.5}',
    '.sg-grid{display:grid;gap:14px}@media(min-width:620px){.sg-grid{grid-template-columns:1fr 1fr}}',
    '.sg-card{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:18px;overflow:hidden;cursor:pointer;box-shadow:var(--cnh-shadow,0 4px 14px rgba(17,24,39,.06));transition:transform .18s,box-shadow .18s;touch-action:manipulation;position:relative}',
    '.sg-card:active{transform:scale(.985)}@media(hover:hover){.sg-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(17,24,39,.14)}}',
    '.sg-frame{position:relative;background:var(--bg);color:var(--ink);padding:0 0 10px}',
    '.sg-bar{display:flex;align-items:center;gap:5px;padding:8px 10px;background:rgba(0,0,0,.12)}.sg-bar i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.55)}.sg-bar span{flex:1;height:9px;border-radius:99px;background:rgba(255,255,255,.22);margin-left:8px}',
    '.sg-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;font-size:.6875rem}.sg-nav b{font-size:.75rem}.sg-nav span{display:flex;gap:10px;opacity:.75}.sg-nav u{text-decoration:none;white-space:nowrap}',
    '.sg-hero{position:relative;margin:0 10px;border-radius:12px;height:116px;overflow:hidden;background:color-mix(in srgb,var(--a) 28%,var(--bg));display:flex;align-items:center}',
    '.sg-hero img,.sg-shero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.sg-hero.ph::after,.sg-shero.ph::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.55),rgba(0,0,0,.05))}',
    '.sg-hero .o1,.sg-shero .o1{position:absolute;right:-30px;top:-40px;width:150px;height:150px;border-radius:50%;background:color-mix(in srgb,var(--a) 40%,transparent)}.sg-hero .o2,.sg-shero .o2{position:absolute;right:50px;bottom:-40px;width:90px;height:90px;border-radius:50%;background:color-mix(in srgb,var(--a) 22%,transparent)}',
    '.sg-ht{position:relative;z-index:1;padding:0 14px;max-width:70%;color:#fff}.sg-ht h4{margin:0 0 8px;font-size:.9375rem;line-height:1.25;font-weight:700}.sg-ht em,.sg-sht em,.sg-band em,.sg-prod em{font-style:normal;display:inline-block;background:var(--a);color:#fff;font-size:.6875rem;font-weight:700;padding:5px 12px;border-radius:8px}',
    '.sg-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 10px 0}.sg-row i{height:34px;border-radius:8px;background:rgba(255,255,255,.1);border:1px solid rgba(128,128,128,.22)}',
    '.sg-meta{display:flex;align-items:center;justify-content:space-between;padding:12px 14px}.sg-meta b{display:block;font-size:.9375rem}.sg-meta small{font-size:.75rem;color:var(--cnh-sub,#5a6577)}.sg-go{color:var(--cnh-brand,#1d4f91)}',
    '.sg-adm{position:absolute;top:34px;right:16px;display:flex;gap:6px;z-index:5}.sg-adm button{width:30px;height:30px;border-radius:50%;border:0;background:#14263f;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}',
    '.sg-lock{overflow:hidden}.sg-full{position:fixed;inset:0;z-index:1100;display:flex;flex-direction:column;background:var(--cnh-page,#f4f6f9);color:var(--cnh-ink,#111827);font-family:var(--cnh-font,system-ui,sans-serif);animation:sgIn .28s cubic-bezier(.2,.8,.2,1)}.sg-full *{box-sizing:border-box}',
    '@keyframes sgIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
    '.sg-fbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) 10px 10px;background:var(--cnh-card,#fff);border-bottom:1px solid var(--cnh-line,#e1e6ed)}',
    '.sg-ib{width:42px;height:42px;border-radius:12px;border:0;background:var(--cnh-soft,#eef3f9);color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer}.sg-tag{font-size:.6875rem;font-weight:700;background:var(--cnh-soft,#eef3f9);color:var(--cnh-sub,#5a6577);border-radius:999px;padding:3px 10px}',
    '.sg-fscroll{flex:1;overflow-y:auto;padding:12px;max-width:760px;width:100%;margin:0 auto}.sg-note{font-size:.75rem;background:var(--cnh-warn-bg,#fbf3e2);color:var(--cnh-warn,#8a5a0b);border-radius:10px;padding:8px 12px;margin-bottom:12px}',
    '.sg-site{background:var(--bg);color:var(--ink);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(17,24,39,.15);padding-bottom:6px}',
    '.sg-snav{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;font-size:.8125rem}.sg-snav b{font-size:1rem}.sg-snav span{display:flex;gap:12px;opacity:.75;font-size:.75rem}.sg-snav u{text-decoration:none}',
    '.sg-shero{position:relative;margin:0 12px;border-radius:14px;min-height:220px;overflow:hidden;background:color-mix(in srgb,var(--a) 28%,var(--bg));display:flex;align-items:flex-end}',
    '.sg-sht{position:relative;z-index:1;padding:18px;color:#fff}.sg-sht h2{margin:0 0 12px;font-size:1.5rem;line-height:1.2;font-weight:700;max-width:85%}',
    '.sg-shero .sg-adm{top:10px;right:10px}',
    '.sg-perks{display:flex;flex-wrap:wrap;gap:8px 16px;padding:14px 16px;font-size:.75rem;opacity:.9}.sg-perks span{display:inline-flex;align-items:center;gap:6px;color:var(--a)}',
    '.sg-st{margin:8px 16px 10px;font-size:1rem}.sg-prods{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 12px}',
    '.sg-prod{background:var(--cnh-card,#fff);color:#111827;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}.sg-prod b{font-size:.8125rem}.sg-prod span{font-weight:700;font-size:.875rem}',
    '.sg-pimg{width:100%;aspect-ratio:4/3;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--a) calc(10% + var(--k)*4%),#f3f4f6);color:var(--a)}',
    '.sg-band{margin:16px 12px 10px;border-radius:14px;padding:18px;background:color-mix(in srgb,var(--a) 22%,var(--bg));display:flex;flex-direction:column;gap:10px;align-items:flex-start}.sg-band b{font-size:1.0625rem}',
    '.sg-foot{padding:14px 16px;font-size:.75rem;opacity:.7;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}',
    '.sg-fcta{padding:12px 16px max(12px,env(safe-area-inset-bottom));background:var(--cnh-card,#fff);border-top:1px solid var(--cnh-line,#e1e6ed)}',
    '.sg-use{width:100%;min-height:50px;border-radius:14px;border:0;background:var(--cnh-brand,#1d4f91);color:#fff;font:inherit;font-weight:700;font-size:.9375rem;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}html[data-theme="dark"] .sg-use{color:#0b1220}',
    '@media(prefers-reduced-motion:reduce){.sg-full{animation:none}}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
