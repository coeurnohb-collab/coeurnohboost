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
        ['Développeur web junior', 'Agence digitale · Kinshasa', ['Temps plein', 'Sur site'], '600 $ / mois', 'Offre'],
        ['Community manager', 'Boutique en ligne · À distance', ['Mi-temps', 'À distance'], '250 $ / mois', 'Offre'],
        ['Comptable freelance', 'Cabinet de conseil · Lubumbashi', ['Mission', 'Hybride'], '400 $ / mission', 'Offre']] },
      en: { cta: 'Post a job', items: [
        ['Junior web developer', 'Digital agency · Kinshasa', ['Full time', 'On site'], '$600 / month', 'Job'],
        ['Community manager', 'Online store · Remote', ['Part time', 'Remote'], '$250 / month', 'Job'],
        ['Freelance accountant', 'Consulting firm · Lubumbashi', ['Contract', 'Hybrid'], '$400 / project', 'Job']] } },
    { id: 'jobseekers-browse-list', fn: 'openJobSeekerForm', ic: 'user', c: '#0f766e',
      fr: { cta: 'Publier mon profil', items: [
        ['Graphiste & motion designer', '4 ans d’expérience · Kinshasa', ['Disponible', 'Freelance'], 'dès 80 $ / projet', 'Profil'],
        ['Vendeuse e-commerce', '2 ans d’expérience · Abidjan', ['Disponible', 'Temps plein'], '200 $ / mois', 'Profil']] },
      en: { cta: 'Publish my profile', items: [
        ['Graphic & motion designer', '4 years experience · Kinshasa', ['Available', 'Freelance'], 'from $80 / project', 'Profile'],
        ['E-commerce sales associate', '2 years experience · Abidjan', ['Available', 'Full time'], '$200 / month', 'Profile']] } },
    { id: 'immo-browse-list', fn: 'openImmoForm', ic: 'home', c: '#b45309',
      fr: { cta: 'Publier un bien', items: [
        ['Appartement 2 chambres meublé', 'Gombe · Kinshasa', ['2 ch.', '1 sdb', '65 m²'], '450 $ / mois', 'Location'],
        ['Parcelle constructible 20×30', 'Bord du lac Kivu · Goma', ['600 m²', 'Titre foncier'], '18 000 $', 'Vente'],
        ['Local commercial centre-ville', 'Plateau, centre-ville · Dakar', ['40 m²', 'Vitrine'], '300 $ / mois', 'Location']] },
      en: { cta: 'List a property', items: [
        ['Furnished 2-bedroom apartment', 'Gombe · Kinshasa', ['2 bd', '1 ba', '65 m²'], '$450 / month', 'Rent'],
        ['Building plot 20×30', 'Lake Kivu shore · Goma', ['600 m²', 'Land title'], '$18,000', 'Sale'],
        ['Downtown shop unit', 'Plateau, downtown · Dakar', ['40 m²', 'Shop window'], '$300 / month', 'Rent']] } },
    { id: 'events-browse-list', fn: 'openEventForm', ic: 'ticket', c: '#be123c',
      fr: { cta: 'Créer un événement', items: [
        ['Soirée networking entrepreneurs', 'Samedi · 18:00 · Kinshasa', ['Billets en ligne', '150 places'], 'dès 5 $', 'Événement'],
        ['Concert live acoustique', 'Vendredi · 20:00 · Brazzaville', ['Placement libre', 'Scan QR'], 'dès 8 $', 'Événement'],
        ['Atelier photo débutants', 'Dimanche · 09:00 · Paris', ['Places limitées', '3 h'], '12 $', 'Événement']] },
      en: { cta: 'Create an event', items: [
        ['Entrepreneurs networking night', 'Saturday · 6 PM · Kinshasa', ['Online tickets', '150 seats'], 'from $5', 'Event'],
        ['Live acoustic concert', 'Friday · 8 PM · Brazzaville', ['Open seating', 'QR scan'], 'from $8', 'Event'],
        ['Beginner photo workshop', 'Sunday · 9 AM · Paris', ['Limited seats', '3 h'], '$12', 'Event']] } },
    { id: 'travel-browse-list', fn: 'openTravelForm', ic: 'plane', c: '#0369a1',
      fr: { cta: 'Proposer un voyage', items: [
        ['Trek des gorilles · parc des Virunga', 'Départ de Goma', ['Permis inclus', 'Guide'], '400 $ / pers.', 'Séjour'],
        ['Week-end aux chutes de Zongo', 'Départ de Kinshasa', ['Transport inclus', '2 nuits'], '95 $ / pers.', 'Séjour'],
        ['Séjour à l’île de Gorée', 'Départ de Dakar', ['Visite guidée', '3 nuits'], '180 $ / pers.', 'Séjour']] },
      en: { cta: 'Offer a trip', items: [
        ['Mountain gorilla trek · Virunga park', 'Departing Goma', ['Permit included', 'Guide'], '$400 / person', 'Stay'],
        ['Weekend at Zongo Falls', 'Departing Kinshasa', ['Transport included', '2 nights'], '$95 / person', 'Stay'],
        ['Gorée Island stay', 'Departing Dakar', ['Guided tour', '3 nights'], '$180 / person', 'Stay']] } },
    { id: 'business-browse-list', fn: 'openBusinessForm', ic: 'shop', c: '#6741d9',
      fr: { cta: 'Créer ma page entreprise', items: [
        ['Atelier Couture Élégance', 'Mode sur mesure · Kinshasa', ['Catalogue', 'Coupons', 'Avis clients'], 'Ouvert 8h–18h', 'Entreprise'],
        ['Fresh Market Livraison', 'Alimentation · Lubumbashi', ['Livraison', 'Paiement mobile'], 'Ouvert 7h–20h', 'Entreprise'],
        ['Studio Pixel Agency', 'Marketing digital · Abidjan', ['Devis gratuit', 'Portfolio'], 'Sur rendez-vous', 'Entreprise']] },
      en: { cta: 'Create my business page', items: [
        ['Elegance Tailoring Studio', 'Custom fashion · Kinshasa', ['Catalog', 'Coupons', 'Reviews'], 'Open 8 AM–6 PM', 'Business'],
        ['Fresh Market Delivery', 'Food · Lubumbashi', ['Delivery', 'Mobile pay'], 'Open 7 AM–8 PM', 'Business'],
        ['Pixel Studio Agency', 'Digital marketing · Abidjan', ['Free quote', 'Portfolio'], 'By appointment', 'Business']] } },
    { id: 'booking-find-list', fn: null, ic: 'cal', c: '#0f766e',
      fr: { cta: '', items: [
        ['Coiffure & soins à domicile', 'Salon mobile · Kinshasa', ['Créneaux 30 min', 'Rappel SMS'], 'dès 10 $', 'Réservation'],
        ['Consultation juridique', 'Cabinet · Bukavu', ['Visio ou présentiel', '45 min'], '30 $', 'Réservation'],
        ['Coaching sportif', 'Coach certifié · Brazzaville', ['Séance 1 h', 'Pack 5 séances'], '15 $', 'Réservation']] },
      en: { cta: '', items: [
        ['Hair & home care', 'Mobile salon · Kinshasa', ['30 min slots', 'SMS reminder'], 'from $10', 'Booking'],
        ['Legal consultation', 'Law office · Bukavu', ['Video or in person', '45 min'], '$30', 'Booking'],
        ['Fitness coaching', 'Certified coach · Brazzaville', ['1 h session', '5-session pack'], '$15', 'Booking']] } },
    { id: 'srequest-available-list', fn: 'openSRequestForm', ic: 'wrench', c: '#c2410c',
      fr: { cta: 'Publier ma demande', items: [
        ['Besoin d’un électricien pour une installation', 'Maison de 3 chambres · Kinshasa', ['Devis demandé', 'Cette semaine'], 'Budget 60–90 $', 'Demande'],
        ['Création d’un logo et d’une charte', 'Nouvelle boutique · À distance', ['Devis demandé', '7 jours'], 'Budget 80 $', 'Demande'],
        ['Traducteur français ↔ anglais', 'Document de 10 pages', ['Devis demandé', '48 h'], 'Budget 25 $', 'Demande']] },
      en: { cta: 'Post my request', items: [
        ['Electrician needed for an installation', '3-bedroom house · Kinshasa', ['Quote requested', 'This week'], 'Budget $60–90', 'Request'],
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
    { id: 'contests-example', fn: 'openContestForm', ic: 'trophy', c: '#1d4f91',
      fr: { cta: 'Proposer un concours', items: [['Meilleure photo de la ville', 'Concours ouvert à tous · Gratuit', ['Vote du public', 'Classement en direct'], '200 $ + trophée', 'Concours']] },
      en: { cta: 'Propose a contest', items: [['Best photo of the city', 'Open to everyone · Free', ['Public vote', 'Live leaderboard'], '$200 + trophy', 'Contest']] } },
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

  /* ---------- Photos gérées par l'admin (stockées dans pricing/site.showcasePhotos) ---------- */
  var PH = {}, phLoaded = false;
  function key(x) { return String(x).replace(/[^a-zA-Z0-9]+/g, '_'); }
  function isAdm() { try { return !!currentUser && currentUser.uid === ADMIN_UID; } catch (e) { return false; } }
  function loadPhotos() {
    if (phLoaded) return; phLoaded = true;
    try {
      db.collection('pricing').doc('site').get().then(function (d) {
        var m = d.exists && d.data().showcasePhotos; if (m && typeof m === 'object') PH = m;
        document.dispatchEvent(new CustomEvent('cn-showcase-photos')); later();
      }).catch(function () { });
    } catch (e) { }
  }
  function photo(k) { var u = PH[key(k)]; return (typeof u === 'string' && /^https:\/\//.test(u)) ? u : ''; }
  function toast(m, ty) { try { showToast(m, ty || 'info'); } catch (e) { } }
  function pickPhoto(k) {
    if (!isAdm()) return;
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      toast(lang() === 'en' ? 'Uploading…' : 'Envoi en cours…');
      uploadFileToStorage(f, 'showcase', { maxSizeMB: 8 }).then(function (up) {
        var o = {}; o[key(k)] = up.url;
        return db.collection('pricing').doc('site').set({ showcasePhotos: o }, { merge: true }).then(function () { PH[key(k)] = up.url; });
      }).then(function () { toast(lang() === 'en' ? 'Photo saved' : 'Photo enregistrée', 'success'); refresh(); })
        .catch(function (e) { var m = e && e.message || 'Erreur'; try { m = friendlyErrorMessage(e); } catch (x) { } toast(m, 'error'); });
    };
    inp.click();
  }
  function dropPhoto(k) {
    if (!isAdm()) return;
    var o = {}; o[key(k)] = firebase.firestore.FieldValue.delete();
    db.collection('pricing').doc('site').set({ showcasePhotos: o }, { merge: true }).then(function () { delete PH[key(k)]; toast(lang() === 'en' ? 'Photo removed' : 'Photo retirée', 'success'); refresh(); }).catch(function () { });
  }
  function adminBtns(k) {
    if (!isAdm()) return '';
    return '<span class="cnx-adm"><button type="button" data-cnx-photo="' + esc(k) + '" aria-label="Photo">' + svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>', 16) + '</button>' +
      (photo(k) ? '<button type="button" data-cnx-unphoto="' + esc(k) + '" aria-label="Retirer">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 16) + '</button>' : '') + '</span>';
  }
  function coverHtml(sv, k, big) {
    var u = photo(k);
    return '<div class="cnx-cover' + (big ? ' big' : '') + (u ? ' has' : '') + '" style="--t:' + sv.c + '">' +
      (u ? '<img src="' + esc(u) + '" alt="" loading="lazy" onerror="this.remove()">' : '<i class="a"></i><i class="b"></i><span class="cnx-cico">' + svg(I[sv.ic], big ? 40 : 26) + '</span>') + adminBtns(k) + '</div>';
  }

  /* ---------- Descriptions détaillées (page d'exemple) ---------- */
  var ABOUT = {
    fr: { p: 'Une bonne fiche présente clairement l’offre, le prix, le lieu et la façon de vous contacter. Ajoute de belles photos, décris ce qui te distingue et réponds vite : les fiches complètes reçoivent beaucoup plus de contacts.',
      pts: ['Titre précis et prix affichés dès le début', 'Photos nettes qui montrent le vrai résultat', 'Informations de contact et horaires à jour', 'Avis et réponses rapides pour inspirer confiance'],
      note: 'Ceci est une fiche d’exemple. Elle n’est pas contactable et ne correspond à aucune vraie annonce.', h1: 'Aperçu de la fiche', h2: 'Ce qui fait une fiche réussie', contact: 'Contacter', save: 'Enregistrer' },
    en: { p: 'A good listing clearly shows the offer, price, place and how to reach you. Add sharp photos, explain what makes you different and reply fast: complete listings get far more contacts.',
      pts: ['A precise title and the price up front', 'Sharp photos showing the real result', 'Up-to-date contact details and hours', 'Reviews and fast replies to build trust'],
      note: 'This is a sample listing. It cannot be contacted and does not match any real ad.', h1: 'Listing preview', h2: 'What makes a listing work', contact: 'Contact', save: 'Save' }
  };
  function openExample(id, i) {
    var sv = SV.filter(function (x) { return x.id === id; })[0]; if (!sv) return;
    var l = lang(), d = sv[l], it = d.items[i], ab = ABOUT[l], k = id + '_' + i;
    closeExample();
    var el = document.createElement('div'); el.id = 'cnx-detail'; el.className = 'cnx-detail';
    el.innerHTML = '<div class="cnx-dbar"><button type="button" class="cnx-ib" data-cnx-close aria-label="Retour">' + svg('<polyline points="15 18 9 12 15 6"/>', 22) + '</button><span>' + esc(it[4]) + '</span><span class="cnx-ex">' + T[l].ex + '</span></div>' +
      '<div class="cnx-dscroll">' + coverHtml(sv, k, true) +
      '<div class="cnx-dbody"><div class="cnx-note">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>', 16) + '<span>' + esc(ab.note) + '</span></div>' +
      '<h2>' + esc(it[0]) + '</h2><p class="cnx-s">' + esc(it[1]) + '</p>' +
      '<div class="cnx-m">' + it[2].map(function (m) { return '<i>' + esc(m) + '</i>'; }).join('') + '</div>' +
      '<div class="cnx-price"><small>' + esc(l === 'en' ? 'Price' : 'Prix') + '</small><b>' + esc(it[3]) + '</b></div>' +
      '<h4>' + ab.h1 + '</h4><p class="cnx-p">' + esc(ab.p) + '</p><h4>' + ab.h2 + '</h4><ul class="cnx-pts">' + ab.pts.map(function (x) { return '<li>' + svg(I.check, 16) + '<span>' + esc(x) + '</span></li>'; }).join('') + '</ul></div></div>' +
      '<div class="cnx-dcta"><div class="cnx-two"><button type="button" class="cnx-btn" disabled>' + ab.contact + '</button><button type="button" class="cnx-btn" disabled>' + ab.save + '</button></div>' +
      (sv.fn && d.cta ? '<button type="button" class="cnx-cta solid" data-cnx-fn="' + sv.fn + '" data-cnx-close>' + svg('<path d="M12 5v14M5 12h14"/>', 18) + '<span>' + esc(d.cta) + '</span></button>' : '') + '</div>';
    document.body.appendChild(el); document.documentElement.classList.add('cnx-lock');
  }
  function closeExample() { var e = document.getElementById('cnx-detail'); if (e) e.remove(); document.documentElement.classList.remove('cnx-lock'); }
  function refresh() { document.querySelectorAll('[data-cn-ex]').forEach(function (e) { e.remove(); }); all(); document.dispatchEvent(new CustomEvent('cn-showcase-photos')); }

  function block(sv) {
    var l = lang(), d = sv[l], tx = T[l];
    var cards = d.items.map(function (it, i) {
      var k = sv.id + '_' + i, u = photo(k);
      return '<div class="cnx-card" role="button" tabindex="0" data-cnx-open="' + sv.id + '|' + i + '">' +
        (u ? coverHtml(sv, k, false) : '<span class="cnx-ic" style="--t:' + sv.c + '">' + svg(I[sv.ic], 22) + adminBtns(k) + '</span>') +
        '<div class="cnx-b"><div class="cnx-top"><span class="cnx-kind" style="--t:' + sv.c + '">' + esc(it[4]) + '</span><span class="cnx-ex">' + tx.ex + '</span></div>' +
        '<b class="cnx-t">' + esc(it[0]) + '</b><span class="cnx-s">' + esc(it[1]) + '</span>' +
        '<div class="cnx-m">' + it[2].map(function (m) { return '<i>' + esc(m) + '</i>'; }).join('') + '</div>' +
        '<div class="cnx-f"><strong>' + esc(it[3]) + '</strong><span class="cnx-more">' + (l === 'en' ? 'View' : 'Voir') + svg('<polyline points="9 6 15 12 9 18"/>', 14) + '</span></div></div></div>';
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
    var t0 = ev.target; if (!t0.closest) return;
    var ph = t0.closest('[data-cnx-photo]'); if (ph) { ev.stopPropagation(); pickPhoto(ph.getAttribute('data-cnx-photo')); return; }
    var un = t0.closest('[data-cnx-unphoto]'); if (un) { ev.stopPropagation(); dropPhoto(un.getAttribute('data-cnx-unphoto')); return; }
    var fnb = t0.closest('[data-cnx-fn]');
    if (fnb) { var wasClose = fnb.hasAttribute('data-cnx-close'); if (wasClose) closeExample(); try { var f = window[fnb.getAttribute('data-cnx-fn')]; if (typeof f === 'function') f(); } catch (e) { } return; }
    if (t0.closest('[data-cnx-close]')) { closeExample(); return; }
    var op = t0.closest('[data-cnx-open]'); if (op) { var p = op.getAttribute('data-cnx-open').split('|'); openExample(p[0], parseInt(p[1], 10) || 0); }
  }, true);
  (function () {
    var orig = window.closeTopmostOverlay;
    window.closeTopmostOverlay = function () {
      var other = Array.prototype.some.call(document.querySelectorAll('.modal-overlay:not(.hidden)'), function (e) { return e.id !== 'main-menu-modal'; });
      if (!other && document.getElementById('cnx-detail')) { closeExample(); return true; }
      return typeof orig === 'function' ? orig() : false;
    };
  })();
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeExample();
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-cnx-open]')) { ev.preventDefault(); ev.target.click(); }
  });
  window.CNShowcase = { photo: photo, pick: pickPhoto, drop: dropPhoto, isAdmin: isAdm };
  loadPhotos();
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
    '.cnx-cta:active{transform:scale(.985)}',
    '.cnx-card{touch-action:manipulation;cursor:pointer;transition:transform .15s,box-shadow .15s}.cnx-card:active{transform:scale(.985)}',
    '@media(hover:hover){.cnx-card:hover{box-shadow:0 8px 22px rgba(17,24,39,.1)}}',
    '.cnx-f{display:flex;align-items:center;justify-content:space-between;gap:8px}.cnx-more{display:inline-flex;align-items:center;gap:2px;font-size:.8125rem;font-weight:600;color:var(--cnh-brand,#1d4f91)}',
    '.cnx-card:has(.cnx-cover){flex-direction:column;padding:0;overflow:hidden;gap:0}.cnx-card:has(.cnx-cover) .cnx-b{padding:12px}',
    '.cnx-cover{position:relative;height:130px;overflow:hidden;background:color-mix(in srgb,var(--t) 16%,var(--cnh-card,#fff));color:var(--t)}',
    '.cnx-cover.big{height:220px}.cnx-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.cnx-cover .a{position:absolute;width:150px;height:150px;border-radius:50%;right:-40px;top:-60px;background:color-mix(in srgb,var(--t) 22%,transparent)}',
    '.cnx-cover .b{position:absolute;width:90px;height:90px;border-radius:50%;left:-24px;bottom:-40px;background:color-mix(in srgb,var(--t) 16%,transparent)}',
    '.cnx-cico{position:absolute;left:16px;bottom:14px;width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:var(--cnh-card,#fff);box-shadow:0 6px 16px color-mix(in srgb,var(--t) 28%,transparent)}',
    '.cnx-ic{position:relative}',
    '.cnx-adm{position:absolute;top:6px;right:6px;display:flex;gap:6px;z-index:3}.cnx-ic .cnx-adm{top:-8px;right:-8px}',
    '.cnx-adm button{width:30px;height:30px;border-radius:50%;border:0;background:#14263f;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
    '.cnx-lock{overflow:hidden}','.cnx-detail,.cnx-detail *{box-sizing:border-box}',
    '.cnx-detail{position:fixed;inset:0;z-index:1100;background:var(--cnh-page,#f4f6f9);display:flex;flex-direction:column;color:var(--cnh-ink,#111827);font-family:var(--cnh-font,system-ui,sans-serif);animation:cnxIn .28s cubic-bezier(.2,.8,.2,1)}',
    '@keyframes cnxIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
    '.cnx-dbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) 10px 10px;background:var(--cnh-card,#fff);border-bottom:1px solid var(--cnh-line,#e1e6ed);font-weight:700}',
    '.cnx-ib{width:42px;height:42px;border-radius:12px;border:0;background:var(--cnh-soft,#eef3f9);color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.cnx-dscroll{flex:1;overflow-y:auto;max-width:760px;width:100%;margin:0 auto}',
    '.cnx-dbody{padding:16px}.cnx-dbody h2{margin:12px 0 4px;font-size:1.375rem;font-weight:700;letter-spacing:-.015em;line-height:1.25}',
    '.cnx-dbody h4{margin:22px 0 8px;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cnh-sub,#5a6577)}',
    '.cnx-note{display:flex;gap:8px;align-items:flex-start;background:var(--cnh-warn-bg,#fbf3e2);color:var(--cnh-warn,#8a5a0b);border-radius:12px;padding:10px 12px;font-size:.8125rem;line-height:1.45}.cnx-note svg{flex:0 0 auto;margin-top:2px}',
    '.cnx-price{margin-top:14px;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;padding:12px 14px}.cnx-price small{display:block;font-size:.6875rem;letter-spacing:.08em;text-transform:uppercase;color:var(--cnh-sub,#5a6577)}.cnx-price b{font-size:1.25rem}',
    '.cnx-p{margin:0;font-size:.9375rem;line-height:1.65}',
    '.cnx-pts{list-style:none;margin:0;padding:0;display:grid;gap:10px}.cnx-pts li{display:flex;gap:10px;font-size:.875rem;line-height:1.5}.cnx-pts svg{flex:0 0 auto;margin-top:3px;color:var(--cnh-ok,#17653a)}',
    '.cnx-dcta{padding:12px 16px max(12px,env(safe-area-inset-bottom));background:var(--cnh-card,#fff);border-top:1px solid var(--cnh-line,#e1e6ed);max-width:760px;width:100%;margin:0 auto}',
    '.cnx-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}',
    '.cnx-btn{min-height:44px;border-radius:12px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-soft2,#f6f8fb);color:var(--cnh-sub,#5a6577);font:inherit;font-weight:600}',
    '.cnx-cta.solid{background:var(--cnh-brand,#1d4f91);border:1px solid var(--cnh-brand,#1d4f91);color:#fff;margin:0}',
    'html[data-theme="dark"] .cnx-cta.solid{color:#0b1220}'
  ].join('\n');
  try { var st = document.createElement('style'); st.setAttribute('data-cn-showcase', '1'); st.textContent = css; document.head.appendChild(st); } catch (e) { /* ignore */ }
})();
