/* showcase.js — fiches « Exemple » dans chaque service.
   Quand un service a encore peu de publications, affiche sous la liste réelle quelques modèles de fiches
   (clairement marqués « Exemple ») pour montrer à quoi ressemble une belle publication, avec un bouton
   « Publier la mienne ». Rien n'est enregistré, rien n'est mélangé aux vraies données. Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnShowcase) return; window.__cnShowcase = true;

  function lang() { try { return (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var I = {
    job: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v11h14V10"/><path d="M10 21v-6h4v6"/>',
    ticket: '<path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z"/><path d="M13 5v14" stroke-dasharray="2 3"/>',
    plane: '<path d="M10.2 13.8 3 11l1.5-1.5 9 .5L18 5.5a2 2 0 1 1 2.5 2.5L16 12.5l.5 9L15 23l-2.8-7.2"/>',
    shop: '<path d="M3 9 4.5 3h15L21 9"/><path d="M4 9v12h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 17l-4 4-5.7-1.3a4 4 0 0 1-5-5L3 8.5 7 4.5Z"/>',
    cap: '<path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    book: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4Z"/><path d="M8 20V8"/>',
    trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/>',
    pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 5 5 9-10"/>'
  };
  function svg(p, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }

  /* Chaque service : conteneur de la liste, fonction « publier », modèles (fr / en). */
  var SV = [
    { id: 'jobs-browse-list', fn: 'openJobForm', ic: 'job', c: '#1d4f91',
      fr: { cta: 'Publier une offre', items: [
        ['Développeur web junior', 'Agence digitale · Kampala', ['Temps plein', 'Sur site'], '600 $ / mois', 'Offre'],
        ['Community manager', 'Boutique en ligne · À distance', ['Mi-temps', 'À distance'], '250 $ / mois', 'Offre'],
        ['Comptable freelance', 'Cabinet de conseil · Goma', ['Mission', 'Hybride'], '400 $ / mission', 'Offre']] },
      en: { cta: 'Post a job', items: [
        ['Junior web developer', 'Digital agency · Kampala', ['Full time', 'On site'], '$600 / month', 'Job'],
        ['Community manager', 'Online store · Remote', ['Part time', 'Remote'], '$250 / month', 'Job'],
        ['Freelance accountant', 'Consulting firm · Goma', ['Contract', 'Hybrid'], '$400 / project', 'Job']] } },
    { id: 'jobseekers-browse-list', fn: 'openJobSeekerForm', ic: 'user', c: '#0f766e',
      fr: { cta: 'Publier mon profil', items: [
        ['Graphiste & motion designer', '4 ans d’expérience · Kampala', ['Disponible', 'Freelance'], 'dès 80 $ / projet', 'Profil'],
        ['Vendeuse e-commerce', '2 ans d’expérience · Goma', ['Disponible', 'Temps plein'], '200 $ / mois', 'Profil']] },
      en: { cta: 'Publish my profile', items: [
        ['Graphic & motion designer', '4 years experience · Kampala', ['Available', 'Freelance'], 'from $80 / project', 'Profile'],
        ['E-commerce sales associate', '2 years experience · Goma', ['Available', 'Full time'], '$200 / month', 'Profile']] } },
    { id: 'immo-browse-list', fn: 'openImmoForm', ic: 'home', c: '#b45309',
      fr: { cta: 'Publier un bien', items: [
        ['Appartement 2 chambres meublé', 'Quartier résidentiel · Kampala', ['2 ch.', '1 sdb', '65 m²'], '450 $ / mois', 'Location'],
        ['Parcelle constructible 20×30', 'Zone en développement · Goma', ['600 m²', 'Titre foncier'], '18 000 $', 'Vente'],
        ['Local commercial centre-ville', 'Rue passante · Kampala', ['40 m²', 'Vitrine'], '300 $ / mois', 'Location']] },
      en: { cta: 'List a property', items: [
        ['Furnished 2-bedroom apartment', 'Residential area · Kampala', ['2 bd', '1 ba', '65 m²'], '$450 / month', 'Rent'],
        ['Building plot 20×30', 'Growing area · Goma', ['600 m²', 'Land title'], '$18,000', 'Sale'],
        ['Downtown shop unit', 'Busy street · Kampala', ['40 m²', 'Shop window'], '$300 / month', 'Rent']] } },
    { id: 'events-browse-list', fn: 'openEventForm', ic: 'ticket', c: '#be123c',
      fr: { cta: 'Créer un événement', items: [
        ['Soirée networking entrepreneurs', 'Samedi · 18:00 · Kampala', ['Billets en ligne', '150 places'], 'dès 5 $', 'Événement'],
        ['Concert live acoustique', 'Vendredi · 20:00 · Goma', ['Placement libre', 'Scan QR'], 'dès 8 $', 'Événement'],
        ['Atelier photo débutants', 'Dimanche · 09:00 · Kampala', ['Places limitées', '3 h'], '12 $', 'Événement']] },
      en: { cta: 'Create an event', items: [
        ['Entrepreneurs networking night', 'Saturday · 6 PM · Kampala', ['Online tickets', '150 seats'], 'from $5', 'Event'],
        ['Live acoustic concert', 'Friday · 8 PM · Goma', ['Open seating', 'QR scan'], 'from $8', 'Event'],
        ['Beginner photo workshop', 'Sunday · 9 AM · Kampala', ['Limited seats', '3 h'], '$12', 'Event']] } },
    { id: 'travel-browse-list', fn: 'openTravelForm', ic: 'plane', c: '#0369a1',
      fr: { cta: 'Proposer un voyage', items: [
        ['Safari 3 jours · parc national', 'Départ de Kampala', ['Hébergement inclus', 'Guide'], '320 $ / pers.', 'Séjour'],
        ['Week-end bord de lac', 'Départ de Goma', ['Transport inclus', '2 nuits'], '95 $ / pers.', 'Séjour'],
        ['Billet bus Kampala → Nairobi', 'Départs quotidiens', ['Climatisé', 'Bagage inclus'], '40 $', 'Transport']] },
      en: { cta: 'Offer a trip', items: [
        ['3-day national park safari', 'Departing Kampala', ['Lodging included', 'Guide'], '$320 / person', 'Stay'],
        ['Lakeside weekend', 'Departing Goma', ['Transport included', '2 nights'], '$95 / person', 'Stay'],
        ['Bus ticket Kampala → Nairobi', 'Daily departures', ['Air-conditioned', 'Luggage included'], '$40', 'Transport']] } },
    { id: 'business-browse-list', fn: 'openBusinessForm', ic: 'shop', c: '#6741d9',
      fr: { cta: 'Créer ma page entreprise', items: [
        ['Atelier Couture Élégance', 'Mode sur mesure · Kampala', ['Catalogue', 'Coupons', 'Avis clients'], 'Ouvert 8h–18h', 'Entreprise'],
        ['Fresh Market Livraison', 'Alimentation · Goma', ['Livraison', 'Paiement mobile'], 'Ouvert 7h–20h', 'Entreprise'],
        ['Studio Pixel Agency', 'Marketing digital · Kampala', ['Devis gratuit', 'Portfolio'], 'Sur rendez-vous', 'Entreprise']] },
      en: { cta: 'Create my business page', items: [
        ['Elegance Tailoring Studio', 'Custom fashion · Kampala', ['Catalog', 'Coupons', 'Reviews'], 'Open 8 AM–6 PM', 'Business'],
        ['Fresh Market Delivery', 'Food · Goma', ['Delivery', 'Mobile pay'], 'Open 7 AM–8 PM', 'Business'],
        ['Pixel Studio Agency', 'Digital marketing · Kampala', ['Free quote', 'Portfolio'], 'By appointment', 'Business']] } },
    { id: 'booking-find-list', fn: null, ic: 'cal', c: '#0f766e',
      fr: { cta: '', items: [
        ['Coiffure & soins à domicile', 'Salon mobile · Kampala', ['Créneaux 30 min', 'Rappel SMS'], 'dès 10 $', 'Réservation'],
        ['Consultation juridique', 'Cabinet · Goma', ['Visio ou présentiel', '45 min'], '30 $', 'Réservation'],
        ['Coaching sportif', 'Coach certifié · Kampala', ['Séance 1 h', 'Pack 5 séances'], '15 $', 'Réservation']] },
      en: { cta: '', items: [
        ['Hair & home care', 'Mobile salon · Kampala', ['30 min slots', 'SMS reminder'], 'from $10', 'Booking'],
        ['Legal consultation', 'Law office · Goma', ['Video or in person', '45 min'], '$30', 'Booking'],
        ['Fitness coaching', 'Certified coach · Kampala', ['1 h session', '5-session pack'], '$15', 'Booking']] } },
    { id: 'srequest-available-list', fn: 'openSRequestForm', ic: 'wrench', c: '#c2410c',
      fr: { cta: 'Publier ma demande', items: [
        ['Besoin d’un électricien pour une installation', 'Maison de 3 chambres · Kampala', ['Devis demandé', 'Cette semaine'], 'Budget 60–90 $', 'Demande'],
        ['Création d’un logo et d’une charte', 'Nouvelle boutique · À distance', ['Devis demandé', '7 jours'], 'Budget 80 $', 'Demande'],
        ['Traducteur français ↔ anglais', 'Document de 10 pages', ['Devis demandé', '48 h'], 'Budget 25 $', 'Demande']] },
      en: { cta: 'Post my request', items: [
        ['Electrician needed for an installation', '3-bedroom house · Kampala', ['Quote requested', 'This week'], 'Budget $60–90', 'Request'],
        ['Logo and brand kit design', 'New shop · Remote', ['Quote requested', '7 days'], 'Budget $80', 'Request'],
        ['French ↔ English translator', '10-page document', ['Quote requested', '48 h'], 'Budget $25', 'Request']] } },
    { id: 'academy-browse-list', fn: 'openCourseForm', ic: 'cap', c: '#7c3aed',
      fr: { cta: 'Créer un cours', items: [
        ['Excel professionnel : de zéro à expert', '12 chapitres · Par un formateur', ['Débutant', 'Certificat'], '15 $', 'Cours'],
        ['Vendre sur les réseaux sociaux', '8 chapitres · Par un formateur', ['Intermédiaire', 'Vidéos'], '10 $', 'Cours'],
        ['Anglais pour le travail', '20 leçons · Par un formateur', ['Débutant', 'Quiz'], 'Gratuit', 'Cours']] },
      en: { cta: 'Create a course', items: [
        ['Professional Excel: zero to expert', '12 chapters · By an instructor', ['Beginner', 'Certificate'], '$15', 'Course'],
        ['Selling on social media', '8 chapters · By an instructor', ['Intermediate', 'Videos'], '$10', 'Course'],
        ['Business English', '20 lessons · By an instructor', ['Beginner', 'Quizzes'], 'Free', 'Course']] } },
    { id: 'books-browse-list', fn: 'openBookForm', ic: 'book', c: '#475569',
      fr: { cta: 'Publier un livre', items: [
        ['Guide de l’entrepreneur débutant', 'Ebook PDF · 120 pages', ['Téléchargement immédiat'], '6 $', 'Livre'],
        ['Recettes de cuisine d’Afrique centrale', 'Ebook PDF · 85 pages', ['Téléchargement immédiat'], '4 $', 'Livre']] },
      en: { cta: 'Publish a book', items: [
        ['The beginner entrepreneur’s guide', 'PDF ebook · 120 pages', ['Instant download'], '$6', 'Book'],
        ['Central African cooking recipes', 'PDF ebook · 85 pages', ['Instant download'], '$4', 'Book']] } }
  ];
  var T = {
    fr: { ex: 'Exemple', title: 'Exemples de fiches', sub: 'Voici à quoi ressemble une publication réussie. Ce sont des modèles, pas de vraies annonces.', note: 'Modèle d’exemple' },
    en: { ex: 'Example', title: 'Example listings', sub: 'This is what a great listing looks like. These are templates, not real ads.', note: 'Sample template' }
  };

  function realCount(box) {
    var n = 0;
    Array.prototype.forEach.call(box.children, function (el) {
      if (el.hasAttribute('data-cn-ex')) return;
      if (el.tagName === 'P' && /muted/.test(el.className)) return;
      if (/skeleton|skel/.test(el.className)) return;
      if (el.textContent.trim() === '' && !el.querySelector('img,svg')) return;
      n++;
    });
    return n;
  }
  function block(sv) {
    var l = lang(), d = sv[l], tx = T[l];
    var cards = d.items.map(function (it) {
      return '<div class="cnx-card"><span class="cnx-ic" style="--t:' + sv.c + '">' + svg(I[sv.ic], 22) + '</span>' +
        '<div class="cnx-b"><div class="cnx-top"><span class="cnx-kind" style="--t:' + sv.c + '">' + esc(it[4]) + '</span><span class="cnx-ex">' + tx.ex + '</span></div>' +
        '<b class="cnx-t">' + esc(it[0]) + '</b><span class="cnx-s">' + esc(it[1]) + '</span>' +
        '<div class="cnx-m">' + it[2].map(function (m) { return '<i>' + esc(m) + '</i>'; }).join('') + '</div>' +
        '<div class="cnx-f"><strong>' + esc(it[3]) + '</strong></div></div></div>';
    }).join('');
    return '<section class="cnx" data-cn-ex="1"><div class="cnx-h"><div><h4>' + tx.title + '</h4><p>' + tx.sub + '</p></div></div>' + cards +
      (sv.fn && d.cta ? '<button type="button" class="cnx-cta" data-cnx-fn="' + sv.fn + '">' + svg('<path d="M12 5v14M5 12h14"/>', 18) + '<span>' + esc(d.cta) + '</span></button>' : '') + '</section>';
  }
  var busy = false;
  function sync(sv) {
    var box = document.getElementById(sv.id); if (!box) return;
    var ex = box.querySelector(':scope > [data-cn-ex]');
    var loading = /Chargement|Loading/.test(box.textContent) && !ex && realCount(box) === 0 && box.querySelector('p.muted');
    var want = !loading && realCount(box) < 3 && !(box.closest('.hidden') && false);
    if (want && !ex) { busy = true; box.insertAdjacentHTML('beforeend', block(sv)); busy = false; }
    else if (!want && ex) { busy = true; ex.remove(); busy = false; }
  }
  function all() { if (busy) return; SV.forEach(sync); }
  var tm = null;
  function later() { if (busy) return; clearTimeout(tm); tm = setTimeout(all, 250); }
  try { new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-cnx-fn]'); if (!b) return;
    try { var f = window[b.getAttribute('data-cnx-fn')]; if (typeof f === 'function') f(); } catch (e) { /* ignore */ }
  });
  setTimeout(all, 800);

  var css = [
    '.cnx{margin-top:18px;padding-top:6px}',
    '.cnx-h h4{margin:0 0 2px;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cnh-sub,#5a6577)}',
    '.cnx-h p{margin:0 0 12px;font-size:.8125rem;color:var(--cnh-sub,#5a6577);line-height:1.5}',
    '.cnx-card{display:flex;gap:12px;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;padding:12px;margin-bottom:10px;box-shadow:var(--cnh-shadow,0 1px 2px rgba(17,24,39,.04))}',
    '.cnx-ic{flex:0 0 auto;width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--t) 13%,var(--cnh-card,#fff));color:var(--t)}',
    'html[data-theme="dark"] .cnx-ic{color:color-mix(in srgb,var(--t) 55%,#fff)}',
    '.cnx-b{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}',
    '.cnx-top{display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.cnx-kind{font-size:.6875rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--t)}',
    'html[data-theme="dark"] .cnx-kind{color:color-mix(in srgb,var(--t) 55%,#fff)}',
    '.cnx-ex{font-size:.6875rem;font-weight:700;color:var(--cnh-sub,#5a6577);background:var(--cnh-soft,#eef3f9);border-radius:999px;padding:2px 9px}',
    '.cnx-t{font-size:.9375rem;line-height:1.35;color:var(--cnh-ink,#111827);word-break:break-word}',
    '.cnx-s{font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.cnx-m{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}',
    '.cnx-m i{font-style:normal;font-size:.75rem;color:var(--cnh-sub,#5a6577);background:var(--cnh-soft2,#f6f8fb);border:1px solid var(--cnh-line,#e1e6ed);border-radius:8px;padding:2px 8px}',
    '.cnx-f{margin-top:6px;font-size:.9375rem;color:var(--cnh-ink,#111827)}',
    '.cnx-cta{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:12px;border:1.5px dashed var(--cnh-brand,#1d4f91);background:var(--cnh-brand-tint,rgba(29,79,145,.08));color:var(--cnh-brand-ink,#173f75);font:inherit;font-weight:700;font-size:.9375rem;cursor:pointer;margin-top:2px}',
    'html[data-theme="dark"] .cnx-cta{color:var(--cnh-ink,#eceff4)}',
    '.cnx-cta:active{transform:scale(.985)}'
  ].join('\n');
  try { var st = document.createElement('style'); st.setAttribute('data-cn-showcase', '1'); st.textContent = css; document.head.appendChild(st); } catch (e) { /* ignore */ }
})();
