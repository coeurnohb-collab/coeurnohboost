/* site-gallery.js — « Crée ton site » : 15 modèles de sites aux dispositions différentes (carte en verre, deux colonnes,
   centré, bannière plein écran, minimaliste, magazine), chacun relié à un VRAI modèle du rendu serveur (api/render-site.js).
   Chaque modèle s'ouvre en aperçu plein écran puis mène au vrai créateur de site avec le type d'activité et le modèle déjà
   choisis. L'administrateur peut mettre ses propres photos de bannière. Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnSiteGallery) return; window.__cnSiteGallery = true;
  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(p, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var CAM = '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>';
  var CHECK = '<path d="m5 12 5 5 9-10"/>';
  var IMG = '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-5-5L5 21"/>';

  var T = {
    fr: { h: 'Choisis un modèle', s: 'Des sites prêts à publier, avec des mises en page différentes. Touche un modèle pour voir comment ton site se présentera.', use: 'Utiliser ce modèle', ex: 'Modèle', prev: 'Aperçu du site', back: 'Retour', note: 'Aperçu d’exemple : ton site affichera tes vrais textes, photos et prix.',
      feat: 'Fonctionnalités incluses', items: 'Sélection', rev: 'Ce que disent les clients', contact: 'Contact', wa: 'Écrire sur WhatsApp', call: 'Appeler', pro: 'PRO', made: 'Créé avec Coeurnoh Universe',
      cats: { all: 'Tous', commerce: 'Commerce', services: 'Services', creatif: 'Créatif', education: 'Éducation', communaute: 'Communauté' }, layouts: { glass: 'Carte en verre', split: 'Deux colonnes', center: 'Centré', banner: 'Bannière', minimal: 'Minimal', magazine: 'Magazine' } },
    en: { h: 'Pick a template', s: 'Ready-to-publish sites with different layouts. Tap a template to see how your site will look.', use: 'Use this template', ex: 'Template', prev: 'Site preview', back: 'Back', note: 'Sample preview: your site will show your real text, photos and prices.',
      feat: 'Included features', items: 'Selection', rev: 'What customers say', contact: 'Contact', wa: 'Write on WhatsApp', call: 'Call', pro: 'PRO', made: 'Built with Coeurnoh Universe',
      cats: { all: 'All', commerce: 'Shops', services: 'Services', creatif: 'Creative', education: 'Education', communaute: 'Community' }, layouts: { glass: 'Glass card', split: 'Two columns', center: 'Centered', banner: 'Banner', minimal: 'Minimal', magazine: 'Magazine' } }
  };

  // Fonctionnalités réellement gérées par le rendu serveur
  var F = {
    fr: { wa: 'Commande et contact WhatsApp', book: 'Prise de rendez-vous en ligne', gal: 'Galerie photos', rev: 'Avis clients', map: 'Carte et itinéraire', news: 'Newsletter', blog: 'Blog et actualités', faq: 'Questions fréquentes', team: 'Équipe', vid: 'Vidéos', plan: 'Forfaits et tarifs', stat: 'Chiffres clés', promo: 'Bandeau de promotion', jobs: 'Offres d’emploi', docs: 'Documents à télécharger', dom: 'Nom de domaine' },
    en: { wa: 'WhatsApp ordering and contact', book: 'Online appointments', gal: 'Photo gallery', rev: 'Customer reviews', map: 'Map and directions', news: 'Newsletter', blog: 'Blog and news', faq: 'FAQ', team: 'Team', vid: 'Videos', plan: 'Plans and pricing', stat: 'Key figures', promo: 'Promotion banner', jobs: 'Job offers', docs: 'Downloadable documents', dom: 'Custom domain' }
  };

  // c = couleur d'accent, hero : l = bandeau clair, d = sombre
  var TPL = [
    { id: 'boutique', ty: 'boutique', tp: 'nuit', cat: 'commerce', lay: 'banner', c: '#22d3ee', dark: true, h: '#0b1426',
      fr: { n: 'Boutique en ligne', brand: 'Kin Market', t: 'Mode, tech et maison livrées partout à Kinshasa', cta: 'Commander', cats: ['Nouveautés', 'Promos', 'Contact'], it: [['Sneakers urbaines', '45 $'], ['Casque Bluetooth', '29 $'], ['Sac en cuir', '38 $'], ['Montre connectée', '52 $']], st: [['2 400+', 'clients'], ['24 h', 'livraison'], ['4,8/5', 'avis']], rv: ['Livraison rapide et produit conforme.', 'Je recommande, service client très réactif.'], ft: ['wa', 'gal', 'rev', 'promo', 'map', 'dom'] },
      en: { n: 'Online shop', brand: 'Kin Market', t: 'Fashion, tech and home delivered across Kinshasa', cta: 'Order', cats: ['New in', 'Deals', 'Contact'], it: [['Urban sneakers', '$45'], ['Bluetooth headset', '$29'], ['Leather bag', '$38'], ['Smart watch', '$52']], st: [['2,400+', 'customers'], ['24 h', 'delivery'], ['4.8/5', 'reviews']], rv: ['Fast delivery, product as described.', 'Highly recommended, very responsive support.'], ft: ['wa', 'gal', 'rev', 'promo', 'map', 'dom'] } },
    { id: 'immobilier', ty: 'immobilier', tp: 'ardoise', cat: 'services', lay: 'split', c: '#334155', hl: true, hbg: '#e9eef5', bg: '#ffffff', ink: '#0f172a',
      fr: { n: 'Immobilier', brand: 'Résidences Gombe', t: 'Trouvez la maison de vos rêves à Kinshasa, Lubumbashi ou Goma', cta: 'Voir les biens', cats: ['Acheter', 'Louer', 'Agence'], it: [['Villa 4 chambres, Ma Campagne', '185 000 $'], ['Appartement 2 ch., Gombe', '850 $/mois'], ['Terrain 600 m², Lubumbashi', '42 000 $'], ['Bureau 120 m², Goma', '1 200 $/mois']], st: [['320', 'biens vendus'], ['12 ans', 'd’expérience'], ['3 villes', 'couvertes']], rv: ['Visite organisée en 48 h, dossier clair.', 'Équipe sérieuse et transparente.'], ft: ['wa', 'book', 'gal', 'map', 'team', 'faq'] },
      en: { n: 'Real estate', brand: 'Gombe Residences', t: 'Find your dream home in Kinshasa, Lubumbashi or Goma', cta: 'See listings', cats: ['Buy', 'Rent', 'Agency'], it: [['4-bedroom villa, Ma Campagne', '$185,000'], ['2-bed flat, Gombe', '$850/mo'], ['600 m² plot, Lubumbashi', '$42,000'], ['120 m² office, Goma', '$1,200/mo']], st: [['320', 'properties sold'], ['12 yrs', 'experience'], ['3 cities', 'covered']], rv: ['Visit arranged within 48 h, clear paperwork.', 'Serious and transparent team.'], ft: ['wa', 'book', 'gal', 'map', 'team', 'faq'] } },
    { id: 'decoration', ty: 'boutique', tp: 'savane', cat: 'commerce', lay: 'center', c: '#a16207', bg: '#fbf6ec', ink: '#2b1d07', h: '#2b1d07',
      fr: { n: 'Décoration et intérieur', brand: 'Atelier Kivu Déco', t: 'Composez un intérieur chaleureux qui vous ressemble', cta: 'Découvrir la collection', cats: ['Salon', 'Bureau', 'Chambre'], it: [['Canapé 3 places sur mesure', '420 $'], ['Rideaux et tentures', '60 $'], ['Lampadaire en rotin', '85 $'], ['Table basse en bois', '130 $']], st: [['150+', 'projets'], ['7 j', 'devis offert'], ['5 ans', 'garantie']], rv: ['Le salon est exactement comme sur la photo.', 'Conseils précieux et finitions soignées.'], ft: ['wa', 'gal', 'book', 'rev', 'plan', 'map'] },
      en: { n: 'Home decor', brand: 'Kivu Decor Studio', t: 'Create a warm interior that looks like you', cta: 'Browse the collection', cats: ['Living room', 'Office', 'Bedroom'], it: [['Custom 3-seat sofa', '$420'], ['Curtains and drapes', '$60'], ['Rattan floor lamp', '$85'], ['Wooden coffee table', '$130']], st: [['150+', 'projects'], ['7 d', 'free quote'], ['5 yrs', 'warranty']], rv: ['The living room is exactly like the photo.', 'Great advice and careful finishing.'], ft: ['wa', 'gal', 'book', 'rev', 'plan', 'map'] } },
    { id: 'restaurant', ty: 'restaurant', tp: 'corail', cat: 'commerce', lay: 'center', c: '#e8590c', bg: '#fff7f1', ink: '#3a1403', h: '#3a1403',
      fr: { n: 'Restaurant et traiteur', brand: 'Chez Maman Lumière', t: 'Une cuisine congolaise généreuse, livrée chez vous', cta: 'Commander', cats: ['Menu', 'Traiteur', 'Réserver'], it: [['Poulet à la moambe', '12 $'], ['Liboké de poisson', '10 $'], ['Saka-saka et fufu', '8 $'], ['Brochettes mixtes', '9 $']], st: [['4,9/5', 'avis'], ['30 min', 'livraison'], ['500+', 'repas par semaine']], rv: ['Le goût de la maison, portions généreuses.', 'Parfait pour nos événements de famille.'], ft: ['wa', 'book', 'gal', 'rev', 'map', 'promo'] },
      en: { n: 'Restaurant and catering', brand: 'Mama Lumière’s Kitchen', t: 'Generous Congolese cooking, delivered to your door', cta: 'Order now', cats: ['Menu', 'Catering', 'Book'], it: [['Chicken moambe', '$12'], ['Fish liboké', '$10'], ['Saka-saka and fufu', '$8'], ['Mixed skewers', '$9']], st: [['4.9/5', 'reviews'], ['30 min', 'delivery'], ['500+', 'meals a week']], rv: ['Tastes like home, generous portions.', 'Perfect for our family events.'], ft: ['wa', 'book', 'gal', 'rev', 'map', 'promo'] } },
    { id: 'formation', ty: 'education', tp: 'violet', cat: 'education', lay: 'split', c: '#6d28d9', hl: true, hbg: '#efeafb', bg: '#ffffff', ink: '#1a1033',
      fr: { n: 'Formation et coaching', brand: 'Académie Lubumbashi Pro', t: 'Apprenez, progressez et obtenez votre certificat', cta: 'S’inscrire', cats: ['Formations', 'Certificats', 'Contact'], it: [['Design graphique', '45 $'], ['Comptabilité pratique', '60 $'], ['Marketing digital', '50 $'], ['Anglais professionnel', '35 $']], st: [['1 800', 'élèves'], ['25', 'formateurs'], ['92 %', 'réussite']], rv: ['Des cours clairs et un suivi sérieux.', 'J’ai trouvé un emploi après la formation.'], ft: ['book', 'plan', 'vid', 'team', 'docs', 'faq'] },
      en: { n: 'Training and coaching', brand: 'Lubumbashi Pro Academy', t: 'Learn, progress and earn your certificate', cta: 'Enrol', cats: ['Courses', 'Certificates', 'Contact'], it: [['Graphic design', '$45'], ['Practical accounting', '$60'], ['Digital marketing', '$50'], ['Business English', '$35']], st: [['1,800', 'students'], ['25', 'trainers'], ['92%', 'pass rate']], rv: ['Clear lessons and serious follow-up.', 'I found a job after the course.'], ft: ['book', 'plan', 'vid', 'team', 'docs', 'faq'] } },
    { id: 'sante', ty: 'sante', tp: 'emeraude', cat: 'services', lay: 'banner', c: '#10b981', dark: false, h: '#052e22', bg: '#f4faf7', ink: '#052e22',
      fr: { n: 'Clinique et santé', brand: 'Clinique Espoir', t: 'Des soins de qualité, près de chez vous à Goma', cta: 'Prendre rendez-vous', cats: ['Soins', 'Équipe', 'Urgences'], it: [['Consultation générale', '15 $'], ['Pédiatrie', '20 $'], ['Analyses en laboratoire', '12 $'], ['Suivi de grossesse', '25 $']], st: [['24 h/24', 'urgences'], ['18', 'médecins'], ['10 000+', 'patients']], rv: ['Accueil chaleureux et médecins à l’écoute.', 'Rendez-vous pris en ligne, aucune attente.'], ft: ['book', 'team', 'map', 'faq', 'docs', 'rev'] },
      en: { n: 'Clinic and health', brand: 'Hope Clinic', t: 'Quality care close to you in Goma', cta: 'Book an appointment', cats: ['Care', 'Team', 'Emergency'], it: [['General consultation', '$15'], ['Paediatrics', '$20'], ['Laboratory tests', '$12'], ['Pregnancy follow-up', '$25']], st: [['24/7', 'emergency'], ['18', 'doctors'], ['10,000+', 'patients']], rv: ['Warm welcome and attentive doctors.', 'Booked online, no waiting.'], ft: ['book', 'team', 'map', 'faq', 'docs', 'rev'] } },
    { id: 'portfolio', ty: 'portfolio', tp: 'minimal', cat: 'creatif', lay: 'minimal', c: '#111827', hl: true, hbg: '#ffffff', bg: '#ffffff', ink: '#111827',
      fr: { n: 'Portfolio créatif', brand: 'Studio Amani', t: 'Photographe et vidéaste à Bukavu. Des images qui racontent votre histoire', cta: 'Me contacter', cats: ['Travaux', 'Tarifs', 'Contact'], it: [['Mariage (journée complète)', '450 $'], ['Séance portrait', '60 $'], ['Clip et publicité', '700 $'], ['Reportage entreprise', '300 $']], st: [['200+', 'séances'], ['8 ans', 'd’expérience'], ['48 h', 'livraison photos']], rv: ['Des photos magnifiques, livrées à temps.', 'Très professionnel et créatif.'], ft: ['gal', 'vid', 'plan', 'book', 'wa', 'rev'] },
      en: { n: 'Creative portfolio', brand: 'Amani Studio', t: 'Photographer and videographer in Bukavu. Images that tell your story', cta: 'Get in touch', cats: ['Work', 'Pricing', 'Contact'], it: [['Wedding (full day)', '$450'], ['Portrait session', '$60'], ['Clip and advert', '$700'], ['Corporate coverage', '$300']], st: [['200+', 'sessions'], ['8 yrs', 'experience'], ['48 h', 'photo delivery']], rv: ['Beautiful photos, delivered on time.', 'Very professional and creative.'], ft: ['gal', 'vid', 'plan', 'book', 'wa', 'rev'] } },
    { id: 'media', ty: 'media', tp: 'magazine', cat: 'creatif', lay: 'magazine', c: '#be123c', hl: true, hbg: '#f5efe6', bg: '#fbf8f3', ink: '#1c1917', serif: true,
      fr: { n: 'Magazine et actualités', brand: 'Le Courrier du Grand Lac', t: 'L’actualité de la région, expliquée simplement', cta: 'Lire les actualités', cats: ['À la une', 'Société', 'Économie'], it: [['Le port de Goma se modernise', 'Économie'], ['Rentrée scolaire : ce qui change', 'Société'], ['Festival de rumba à Kinshasa', 'Culture'], ['Agriculture : la saison s’annonce bonne', 'Région']], st: [['45 000', 'lecteurs'], ['Chaque jour', 'nouvel article'], ['Gratuit', 'newsletter']], rv: ['Des articles clairs et vérifiés.', 'Mon média local préféré.'], ft: ['blog', 'news', 'vid', 'team', 'promo', 'docs'] },
      en: { n: 'Magazine and news', brand: 'The Great Lakes Courier', t: 'Regional news, explained simply', cta: 'Read the news', cats: ['Top story', 'Society', 'Economy'], it: [['Goma port is modernising', 'Economy'], ['Back to school: what changes', 'Society'], ['Rumba festival in Kinshasa', 'Culture'], ['Farming: a good season ahead', 'Region']], st: [['45,000', 'readers'], ['Daily', 'new article'], ['Free', 'newsletter']], rv: ['Clear, fact-checked articles.', 'My favourite local outlet.'], ft: ['blog', 'news', 'vid', 'team', 'promo', 'docs'] } },
    { id: 'evenement', ty: 'evenement', tp: 'royal', cat: 'services', lay: 'split', c: '#c9a227', dark: true, h: '#0a1230',
      fr: { n: 'Événements et mariages', brand: 'Prestige Events Brazzaville', t: 'Des moments d’exception, organisés de A à Z', cta: 'Réserver la date', cats: ['Formules', 'Réalisations', 'Devis'], it: [['Mariage civil et religieux', 'dès 1 800 $'], ['Anniversaire et baptême', 'dès 400 $'], ['Conférence et séminaire', 'dès 900 $'], ['Soirée d’entreprise', 'dès 1 200 $']], st: [['350+', 'événements'], ['3 pays', 'couverts'], ['100 %', 'sur mesure']], rv: ['Une organisation parfaite, nos invités étaient ravis.', 'Équipe disponible et créative.'], ft: ['book', 'gal', 'plan', 'wa', 'vid', 'rev'] },
      en: { n: 'Events and weddings', brand: 'Prestige Events Brazzaville', t: 'Exceptional moments, organised from A to Z', cta: 'Book the date', cats: ['Packages', 'Our work', 'Quote'], it: [['Civil and religious wedding', 'from $1,800'], ['Birthday and christening', 'from $400'], ['Conference and seminar', 'from $900'], ['Company party', 'from $1,200']], st: [['350+', 'events'], ['3 countries', 'covered'], ['100%', 'tailor-made']], rv: ['Perfect organisation, our guests loved it.', 'Available and creative team.'], ft: ['book', 'gal', 'plan', 'wa', 'vid', 'rev'] } },
    { id: 'beaute', ty: 'beaute', tp: 'doux', cat: 'services', lay: 'glass', c: '#db2777', dark: true, h: '#2b0a1b',
      fr: { n: 'Salon et beauté', brand: 'Salon Éclat Abidjan', t: 'Votre beauté, notre savoir-faire', cta: 'Prendre rendez-vous', cats: ['Prestations', 'Galerie', 'Horaires'], it: [['Tresses africaines', '25 $'], ['Soin du visage', '30 $'], ['Maquillage mariée', '80 $'], ['Manucure et pédicure', '20 $']], st: [['4,9/5', 'avis'], ['6', 'stylistes'], ['7 j/7', 'ouvert']], rv: ['Un résultat magnifique, merci !', 'Accueil soigné et produits de qualité.'], ft: ['book', 'gal', 'plan', 'rev', 'wa', 'promo'] },
      en: { n: 'Salon and beauty', brand: 'Éclat Salon Abidjan', t: 'Your beauty, our craft', cta: 'Book an appointment', cats: ['Services', 'Gallery', 'Hours'], it: [['African braids', '$25'], ['Facial care', '$30'], ['Bridal makeup', '$80'], ['Manicure and pedicure', '$20']], st: [['4.9/5', 'reviews'], ['6', 'stylists'], ['7/7', 'open']], rv: ['A gorgeous result, thank you!', 'Caring welcome and quality products.'], ft: ['book', 'gal', 'plan', 'rev', 'wa', 'promo'] } },
    { id: 'entreprise', ty: 'entreprise', tp: 'ocean', cat: 'services', lay: 'banner', c: '#0ea5e9', dark: false, h: '#04263d', bg: '#f4f8fb', ink: '#04263d',
      fr: { n: 'Entreprise et services', brand: 'Congo Logistics', t: 'Transport et dédouanement entre Matadi, Kinshasa et Lubumbashi', cta: 'Demander un devis', cats: ['Services', 'Références', 'Contact'], it: [['Transport routier', 'sur devis'], ['Dédouanement', 'dès 150 $'], ['Entreposage', 'dès 40 $/mois'], ['Suivi de colis', 'inclus']], st: [['15 ans', 'd’expérience'], ['120', 'camions'], ['2 500+', 'livraisons/mois']], rv: ['Marchandises livrées à la date prévue.', 'Interlocuteurs sérieux, prix clairs.'], ft: ['wa', 'plan', 'team', 'docs', 'jobs', 'map'] },
      en: { n: 'Business and services', brand: 'Congo Logistics', t: 'Freight and customs between Matadi, Kinshasa and Lubumbashi', cta: 'Request a quote', cats: ['Services', 'References', 'Contact'], it: [['Road freight', 'on quote'], ['Customs clearance', 'from $150'], ['Warehousing', 'from $40/mo'], ['Parcel tracking', 'included']], st: [['15 yrs', 'experience'], ['120', 'trucks'], ['2,500+', 'deliveries/month']], rv: ['Goods delivered on the planned date.', 'Serious contacts, clear prices.'], ft: ['wa', 'plan', 'team', 'docs', 'jobs', 'map'] } },
    { id: 'association', ty: 'association', tp: 'sable', cat: 'communaute', lay: 'center', c: '#b45309', hl: true, hbg: '#f3e9d8', bg: '#faf5ec', ink: '#2a1a08',
      fr: { n: 'Association et ONG', brand: 'Entraide Kivu', t: 'Ensemble, donnons une chance à chaque enfant d’aller à l’école', cta: 'Nous rejoindre', cats: ['Mission', 'Actions', 'Faire un don'], it: [['Parrainer un enfant', '10 $/mois'], ['Kit scolaire', '15 $'], ['Cantine solidaire', '5 $'], ['Devenir bénévole', 'gratuit']], st: [['1 200', 'enfants aidés'], ['40', 'bénévoles'], ['9 écoles', 'soutenues']], rv: ['Une association transparente et efficace.', 'Chaque don a un impact visible.'], ft: ['blog', 'gal', 'news', 'vid', 'stat', 'map'] },
      en: { n: 'Charity and NGO', brand: 'Kivu Mutual Aid', t: 'Together, let’s give every child a chance to go to school', cta: 'Join us', cats: ['Mission', 'Actions', 'Donate'], it: [['Sponsor a child', '$10/month'], ['School kit', '$15'], ['Solidarity canteen', '$5'], ['Become a volunteer', 'free']], st: [['1,200', 'children helped'], ['40', 'volunteers'], ['9 schools', 'supported']], rv: ['A transparent and effective charity.', 'Every donation has a visible impact.'], ft: ['blog', 'gal', 'news', 'vid', 'stat', 'map'] } },
    { id: 'smm', ty: 'smm', tp: 'classique', cat: 'commerce', lay: 'glass', c: '#2563eb', dark: true, h: '#0a1633',
      fr: { n: 'Boost réseaux sociaux', brand: 'BoostPro RDC', t: 'Faites grandir vos réseaux sociaux, simplement et rapidement', cta: 'Commander maintenant', cats: ['Services', 'Tarifs', 'Support'], it: [['Abonnés Instagram (1000)', '2 $'], ['Vues TikTok (1000)', '1 $'], ['J’aime Facebook (1000)', '2 $'], ['Abonnés YouTube (100)', '5 $']], st: [['10 000+', 'commandes'], ['24/7', 'support'], ['5 min', 'démarrage']], rv: ['Commande livrée en quelques minutes.', 'Prix honnêtes, support disponible.'], ft: ['wa', 'plan', 'faq', 'rev', 'stat', 'promo'] },
      en: { n: 'Social media boost', brand: 'BoostPro DRC', t: 'Grow your social media, simply and fast', cta: 'Order now', cats: ['Services', 'Pricing', 'Support'], it: [['Instagram followers (1000)', '$2'], ['TikTok views (1000)', '$1'], ['Facebook likes (1000)', '$2'], ['YouTube subscribers (100)', '$5']], st: [['10,000+', 'orders'], ['24/7', 'support'], ['5 min', 'start time']], rv: ['Order delivered within minutes.', 'Honest prices, support available.'], ft: ['wa', 'plan', 'faq', 'rev', 'stat', 'promo'] } },
    { id: 'agence', ty: 'agence', tp: 'congo', cat: 'creatif', lay: 'minimal', c: '#007fff', hl: true, hbg: '#fff9db', bg: '#ffffff', ink: '#0b1b33',
      fr: { n: 'Agence et studio', brand: 'Studio Moko Kinshasa', t: 'Sites web, logos et campagnes qui font parler de vous', cta: 'Demander un devis', cats: ['Projets', 'Offres', 'Contact'], it: [['Création de logo', '80 $'], ['Site vitrine', '350 $'], ['Gestion des réseaux', '150 $/mois'], ['Campagne publicitaire', 'sur devis']], st: [['90+', 'clients'], ['6 ans', 'd’expérience'], ['5 j', 'premier visuel']], rv: ['Une identité visuelle qui nous distingue.', 'Livraison rapide, très à l’écoute.'], ft: ['gal', 'plan', 'team', 'vid', 'wa', 'book'] },
      en: { n: 'Agency and studio', brand: 'Moko Studio Kinshasa', t: 'Websites, logos and campaigns that get you noticed', cta: 'Request a quote', cats: ['Projects', 'Offers', 'Contact'], it: [['Logo design', '$80'], ['Showcase website', '$350'], ['Social media management', '$150/mo'], ['Advertising campaign', 'on quote']], st: [['90+', 'clients'], ['6 yrs', 'experience'], ['5 d', 'first visual']], rv: ['A visual identity that sets us apart.', 'Fast delivery, very attentive.'], ft: ['gal', 'plan', 'team', 'vid', 'wa', 'book'] } },
    { id: 'musique', ty: 'musique', tp: 'nuit', cat: 'creatif', lay: 'banner', c: '#22d3ee', dark: true, h: '#060b16',
      fr: { n: 'Artiste et musique', brand: 'Rumba Live Productions', t: 'Concerts, studio et collaborations, de Kinshasa à Paris', cta: 'Réserver l’artiste', cats: ['Concerts', 'Titres', 'Booking'], it: [['Concert privé', 'dès 800 $'], ['Enregistrement studio', '60 $/h'], ['Clip vidéo', '500 $'], ['Animation de mariage', '350 $']], st: [['120+', 'concerts'], ['3 albums', 'sortis'], ['2 continents', 'tournées']], rv: ['Une ambiance incroyable toute la soirée.', 'Professionnels et ponctuels.'], ft: ['book', 'vid', 'gal', 'plan', 'blog', 'news'] },
      en: { n: 'Artist and music', brand: 'Rumba Live Productions', t: 'Concerts, studio and collaborations, from Kinshasa to Paris', cta: 'Book the artist', cats: ['Concerts', 'Tracks', 'Booking'], it: [['Private concert', 'from $800'], ['Studio recording', '$60/h'], ['Music video', '$500'], ['Wedding entertainment', '$350']], st: [['120+', 'concerts'], ['3 albums', 'released'], ['2 continents', 'toured']], rv: ['Incredible atmosphere all night.', 'Professional and punctual.'], ft: ['book', 'vid', 'gal', 'plan', 'blog', 'news'] } }
  ];

  var LAY_NAMES = ['glass', 'split', 'center', 'banner', 'minimal', 'magazine'];
  // Noms des modèles dans le sélecteur du créateur (vrais modèles du rendu serveur)
  var TP_NAMES = {
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
    congo: { fr: 'Congo', en: 'Congo', es: 'Congo', it: 'Congo', pt: 'Congo', accent: '#007fff', premium: true }
  };
  function registerTemplates() {
    try {
      Object.keys(TP_NAMES).forEach(function (k) {
        var o = TP_NAMES[k], key = 'site_template_' + k;
        try { if (typeof SITE_TEMPLATES === 'object' && !SITE_TEMPLATES[k]) { var e = { label: key, accent: o.accent }; if (o.premium) e.premium = true; SITE_TEMPLATES[k] = e; } } catch (e1) { }
        try { ['fr', 'en', 'es', 'it', 'pt'].forEach(function (l) { if (TRANSLATIONS[l] && !TRANSLATIONS[l][key]) TRANSLATIONS[l][key] = o[l] || o.fr; }); } catch (e2) { }
      });
    } catch (e) { }
  }
  registerTemplates();
  function isPremiumTpl(tp) { try { return !!(SITE_TEMPLATES[tp] && SITE_TEMPLATES[tp].premium); } catch (e) { return false; } }

  function sc() { return window.CNShowcase; }
  function ph(id) { try { return sc() ? sc().photo('tpl_' + id) : ''; } catch (e) { return ''; } }
  function adm() { try { return sc() && sc().isAdmin(); } catch (e) { return false; } }
  function camBtn(id) { return adm() ? '<span class="sg-adm"><button type="button" data-sg-photo="' + id + '" aria-label="Photo">' + svg(CAM, 15) + '</button>' + (ph(id) ? '<button type="button" data-sg-drop="' + id + '" aria-label="×">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 15) + '</button>' : '') + '</span>' : ''; }
  function vars(tp) {
    var dark = !!tp.dark, bg = dark ? (tp.h || '#0f141c') : (tp.bg || '#fff'), ink = dark ? '#eef2f8' : (tp.ink || '#111827');
    var hb = tp.hl ? (tp.hbg || '#eef2f7') : (tp.h || '#0a1633');
    var hi = tp.hl ? ink : '#ffffff';
    return '--a:' + tp.c + ';--bg:' + bg + ';--ink:' + ink + ';--hb:' + hb + ';--hi:' + hi + ';--cd:' + (dark ? 'rgba(255,255,255,.07)' : '#fff') + ';--ln:' + (dark ? 'rgba(255,255,255,.14)' : 'rgba(15,23,42,.1)');
  }
  function cls(tp) { return 'sg-l-' + tp.lay + (tp.serif ? ' sg-serif' : ''); }
  function media(u, alt) { return u ? '<img src="' + esc(u) + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="this.remove()">' : '<span class="sg-ph">' + svg(IMG, 30) + '</span>'; }

  // ---- Miniature (carte de la galerie) ----
  function mini(tp) {
    var d = tp[lang()], u = ph(tp.id), t = T[lang()];
    var hero;
    var title = '<h4>' + esc(d.t) + '</h4>', btn = '<em>' + esc(d.cta) + '</em>';
    if (tp.lay === 'split') hero = '<div class="sg-hero"><div class="sg-ht">' + title + btn + '</div><div class="sg-hm">' + media(u) + '</div></div>';
    else if (tp.lay === 'magazine') hero = '<div class="sg-hero"><div class="sg-hm">' + media(u) + '</div><div class="sg-ht">' + title + '</div></div>';
    else if (tp.lay === 'minimal') hero = '<div class="sg-hero"><div class="sg-ht">' + title + btn + '</div></div>';
    else hero = '<div class="sg-hero">' + (tp.lay === 'banner' || tp.lay === 'center' ? '<div class="sg-hm">' + media(u) + '</div>' : '') + '<div class="sg-ht">' + title + btn + '</div></div>';
    return '<div class="sg-card" role="button" tabindex="0" data-sg-open="' + tp.id + '" data-cat="' + tp.cat + '" style="' + vars(tp) + '">' +
      '<div class="sg-frame ' + cls(tp) + '"><div class="sg-bar"><i></i><i></i><i></i><span></span></div>' +
      '<div class="sg-nav"><b>' + esc(d.brand) + '</b><span>' + d.cats.map(function (c) { return '<u>' + esc(c) + '</u>'; }).join('') + '</span></div>' + hero +
      '<div class="sg-row"><i></i><i></i><i></i></div>' + camBtn(tp.id) + '</div>' +
      '<div class="sg-meta"><div><b>' + esc(d.n) + '</b><small>' + esc(t.layouts[tp.lay]) + (isPremiumTpl(tp.tp) ? ' · ' + t.pro : '') + '</small></div><span class="sg-go">' + svg('<polyline points="9 6 15 12 9 18"/>', 18) + '</span></div></div>';
  }
  var curCat = 'all';
  function chips() {
    var t = T[lang()];
    return '<div class="sg-chips" role="tablist">' + ['all', 'commerce', 'services', 'creatif', 'education', 'communaute'].map(function (k) {
      return '<button type="button" class="sg-chip' + (k === curCat ? ' on' : '') + '" data-sg-cat="' + k + '">' + esc(t.cats[k]) + '</button>';
    }).join('') + '</div>';
  }
  function gallery() {
    var t = T[lang()];
    return '<section class="sg" data-sg="1"><h3>' + t.h + '</h3><p>' + t.s + '</p>' + chips() + '<div class="sg-grid">' + TPL.filter(function (x) { return curCat === 'all' || x.cat === curCat; }).map(mini).join('') + '</div></section>';
  }

  // ---- Aperçu plein écran ----
  function full(tp) {
    var l = lang(), d = tp[l], t = T[l], u = ph(tp.id), ff = F[l];
    var list = tp.lay === 'magazine';
    var items = d.it.map(function (n, i) {
      return list ? '<div class="sg-li"><b>' + esc(n[0]) + '</b><span>' + esc(n[1]) + '</span></div>'
        : '<div class="sg-prod"><div class="sg-pimg" style="--k:' + i + '">' + svg(IMG, 30) + '</div><b>' + esc(n[0]) + '</b><span>' + esc(n[1]) + '</span><em>' + esc(d.cta) + '</em></div>';
    }).join('');
    var hero;
    var h2 = '<h2>' + esc(d.t) + '</h2><p class="sg-sub">' + esc(d.n) + ' · ' + esc(d.brand) + '</p><div class="sg-acts"><em>' + esc(d.cta) + '</em><u>' + esc(t.call) + '</u></div>';
    if (tp.lay === 'split') hero = '<div class="sg-shero"><div class="sg-sht">' + h2 + '</div><div class="sg-shm">' + media(u) + camBtn(tp.id) + '</div></div>';
    else if (tp.lay === 'magazine') hero = '<div class="sg-shero"><div class="sg-shm">' + media(u) + camBtn(tp.id) + '</div><div class="sg-sht">' + h2 + '</div></div>';
    else if (tp.lay === 'minimal') hero = '<div class="sg-shero"><div class="sg-sht">' + h2 + '</div>' + camBtn(tp.id) + '</div>';
    else hero = '<div class="sg-shero"><div class="sg-shm">' + media(u) + '</div>' + camBtn(tp.id) + '<div class="sg-sht">' + h2 + '</div></div>';
    var stats = '<div class="sg-stats">' + d.st.map(function (s) { return '<div><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join('') + '</div>';
    var feats = '<div class="sg-feats">' + d.ft.map(function (k) { return '<span>' + svg(CHECK, 15) + esc(ff[k]) + '</span>'; }).join('') + '</div>';
    var rv = '<div class="sg-revs">' + d.rv.map(function (r, i) { return '<blockquote><p>' + esc(r) + '</p><cite>' + (i ? 'Marie T.' : 'Jean-Paul K.') + '</cite></blockquote>'; }).join('') + '</div>';
    return '<div class="sg-full" id="sg-full" style="' + vars(tp) + '"><div class="sg-fbar"><button type="button" class="sg-ib" data-sg-close aria-label="' + t.back + '">' + svg('<polyline points="15 18 9 12 15 6"/>', 22) + '</button><b>' + t.prev + '</b><span class="sg-tag">' + esc(t.layouts[tp.lay]) + '</span></div>' +
      '<div class="sg-fscroll"><div class="sg-note">' + esc(t.note) + '</div><div class="sg-site ' + cls(tp) + '">' +
      '<div class="sg-snav"><b>' + esc(d.brand) + '</b><span>' + d.cats.map(function (c) { return '<u>' + esc(c) + '</u>'; }).join('') + '</span></div>' + hero + stats +
      '<h3 class="sg-st">' + (list ? esc(d.cats[0]) : t.items) + '</h3><div class="' + (list ? 'sg-list' : 'sg-prods') + '">' + items + '</div>' +
      '<h3 class="sg-st">' + t.feat + '</h3>' + feats +
      '<h3 class="sg-st">' + t.rev + '</h3>' + rv +
      '<div class="sg-band"><b>' + t.contact + '</b><div class="sg-acts"><em>' + svg('<path d="M21 12a8 8 0 0 1-12 7l-5 1 1.5-4.5A8 8 0 1 1 21 12z"/>', 15) + t.wa + '</em><u>' + t.call + '</u></div></div>' +
      '<div class="sg-foot"><b>' + esc(d.brand) + '</b><span>' + t.made + '</span></div></div></div>' +
      '<div class="sg-fcta"><button type="button" class="sg-use" data-sg-use>' + svg('<path d="M12 5v14M5 12h14"/>', 18) + t.use + (isPremiumTpl(tp.tp) ? ' · ' + t.pro : '') + '</button></div></div>';
  }
  function open(id) {
    var tp = TPL.filter(function (x) { return x.id === id; })[0]; if (!tp) return;
    close(); var w = document.createElement('div'); w.id = 'sg-wrap'; w.setAttribute('data-id', id); w.innerHTML = full(tp); document.body.appendChild(w); document.documentElement.classList.add('sg-lock');
  }
  function close() { var w = document.getElementById('sg-wrap'); if (w) w.remove(); document.documentElement.classList.remove('sg-lock'); }

  // « Utiliser ce modèle » : ouvre le vrai créateur avec le type d'activité et le modèle déjà choisis
  function use(id) {
    var tp = TPL.filter(function (x) { return x.id === id; })[0]; if (!tp) return;
    close();
    try {
      if (typeof currentUser === 'undefined' || !currentUser) { openAuth('register'); return; }
      pendingSiteType = tp.ty;
      openSiteForm();
    } catch (e) { try { openSiteTypeGate(); } catch (e2) { } return; }
    var n = 0, iv = setInterval(function () {
      n++;
      var sel = document.getElementById('site-template');
      if (sel) {
        clearInterval(iv);
        try { if (sel.querySelector('option[value="' + tp.tp + '"]')) sel.value = tp.tp; } catch (e) { }
        try { selectSiteType(tp.ty); } catch (e) { }
      } else if (n > 40) clearInterval(iv);
    }, 100);
  }
  function sync() {
    var host = document.getElementById('site-builder-status'); if (!host) return;
    var hasGate = host.querySelector('[onclick*="openSiteTypeGate"]');
    var g = host.querySelector('[data-sg]');
    if (hasGate && !g) host.insertAdjacentHTML('beforeend', gallery());
    else if (!hasGate && g) g.remove();
  }
  function rerender() { var g = document.querySelector('[data-sg]'); if (g) { g.remove(); } sync(); }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0.closest) return;
    var p = t0.closest('[data-sg-photo]'); if (p) { ev.stopPropagation(); ev.preventDefault(); sc().pick('tpl_' + p.getAttribute('data-sg-photo')); return; }
    var dr = t0.closest('[data-sg-drop]'); if (dr) { ev.stopPropagation(); ev.preventDefault(); sc().drop('tpl_' + dr.getAttribute('data-sg-drop')); return; }
    var ct = t0.closest('[data-sg-cat]'); if (ct) { ev.stopPropagation(); curCat = ct.getAttribute('data-sg-cat'); rerender(); return; }
    var o = t0.closest('[data-sg-open]'); if (o) { ev.stopPropagation(); open(o.getAttribute('data-sg-open')); return; }
    if (t0.closest('[data-sg-close]')) { close(); return; }
    if (t0.closest('[data-sg-use]')) { var w = document.getElementById('sg-wrap'); use(w ? w.getAttribute('data-id') : ''); }
  }, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-sg-open]')) { ev.preventDefault(); open(ev.target.getAttribute('data-sg-open')); } });
  document.addEventListener('cn-showcase-photos', function () { rerender(); var w = document.getElementById('sg-wrap'); if (w) open(w.getAttribute('data-id')); });
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
    '.sg-grid{display:grid;gap:14px}@media(min-width:620px){.sg-grid{grid-template-columns:1fr 1fr}}',
    '.sg-card{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:18px;overflow:hidden;cursor:pointer;box-shadow:var(--cnh-shadow,0 4px 14px rgba(17,24,39,.06));transition:transform .18s,box-shadow .18s;touch-action:manipulation;position:relative}',
    '.sg-card:active{transform:scale(.985)}@media(hover:hover){.sg-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(17,24,39,.14)}}',
    '.sg-frame{position:relative;background:var(--bg);color:var(--ink);padding:0 0 10px;height:236px;overflow:hidden}',
    '.sg-bar{display:flex;align-items:center;gap:5px;padding:8px 10px;background:rgba(128,128,128,.16)}.sg-bar i{width:7px;height:7px;border-radius:50%;background:rgba(128,128,128,.55)}.sg-bar span{flex:1;height:9px;border-radius:99px;background:rgba(128,128,128,.25);margin-left:8px}',
    '.sg-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;font-size:.6875rem}.sg-nav b{font-size:.75rem}.sg-nav span{display:flex;gap:10px;opacity:.75}.sg-nav u{text-decoration:none;white-space:nowrap}',
    '.sg-hero{position:relative;margin:0 10px;border-radius:12px;height:116px;overflow:hidden;background:var(--hb);color:var(--hi);display:flex;align-items:center}',
    '.sg-hm{position:absolute;inset:0;overflow:hidden}.sg-hm img{width:100%;height:100%;object-fit:cover;display:block}.sg-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--a);opacity:.55;background:color-mix(in srgb,var(--a) 22%,var(--hb))}',
    '.sg-ht{position:relative;z-index:1;padding:0 14px;max-width:72%}.sg-ht h4{margin:0 0 8px;font-size:.875rem;line-height:1.25;font-weight:700}.sg-ht em,.sg-acts em,.sg-prod em{font-style:normal;display:inline-flex;align-items:center;gap:6px;background:var(--a);color:#fff;font-size:.6875rem;font-weight:700;padding:5px 12px;border-radius:8px}',
    '.sg-l-banner .sg-hero .sg-hm::after,.sg-l-center .sg-hero .sg-hm::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.45)}.sg-l-banner .sg-hero{align-items:flex-end;padding-bottom:10px;color:#fff}.sg-l-banner .sg-ht{max-width:80%}.sg-l-center .sg-hero{justify-content:center;text-align:center;color:#fff}.sg-l-center .sg-ht{max-width:88%}',
    '.sg-l-glass .sg-ht{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:10px 12px;margin-left:10px}',
    '.sg-l-split .sg-hero{border-radius:12px}.sg-l-split .sg-hm{left:auto;right:8px;top:8px;bottom:8px;width:38%;border-radius:10px}.sg-l-split .sg-ht{max-width:58%}',
    '.sg-l-minimal .sg-hero{border:0;background:var(--hb)}.sg-l-minimal .sg-ht h4{font-size:1rem}.sg-l-minimal .sg-ht h4::after{content:"";display:block;width:34px;height:3px;border-radius:2px;background:var(--a);margin-top:6px}',
    '.sg-l-magazine .sg-hero{flex-direction:column;align-items:stretch;border-radius:4px}.sg-l-magazine .sg-hm{position:relative;height:50px;inset:auto}.sg-l-magazine .sg-ht{max-width:100%;padding:8px 12px;border-top:2px solid var(--ink)}.sg-l-magazine .sg-ht h4{font-family:Georgia,serif;font-size:.8125rem}',
    '.sg-l-center .sg-ph svg,.sg-l-banner .sg-ph svg,.sg-l-glass .sg-ph svg{display:none}',
    '.sg-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 10px 0}.sg-row i{height:34px;border-radius:8px;background:var(--cd);border:1px solid var(--ln)}',
    '.sg-meta{display:flex;align-items:center;justify-content:space-between;padding:12px 14px}.sg-meta b{display:block;font-size:.9375rem}.sg-meta small{font-size:.75rem;color:var(--cnh-sub,#5a6577)}.sg-go{color:var(--cnh-brand,#1d4f91)}',
    '.sg-adm{position:absolute;bottom:14px;right:12px;display:flex;gap:6px;z-index:5}.sg-shero>.sg-adm,.sg-shm>.sg-adm{bottom:auto;top:10px;right:10px}.sg-adm button{width:30px;height:30px;border-radius:50%;border:0;background:#14263f;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}',
    '.sg-lock{overflow:hidden}.sg-full{position:fixed;inset:0;z-index:1100;display:flex;flex-direction:column;background:var(--cnh-page,#f4f6f9);color:var(--cnh-ink,#111827);font-family:var(--cnh-font,system-ui,sans-serif);animation:sgIn .28s cubic-bezier(.2,.8,.2,1)}.sg-full *{box-sizing:border-box}',
    '@keyframes sgIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
    '.sg-fbar{display:flex;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) 10px 10px;background:var(--cnh-card,#fff);border-bottom:1px solid var(--cnh-line,#e1e6ed)}.sg-fbar b{flex:1;font-size:1.0625rem;text-align:center}',
    '.sg-ib{width:42px;height:42px;border-radius:12px;border:0;background:var(--cnh-soft,#eef3f9);color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer}.sg-tag{font-size:.6875rem;font-weight:700;background:var(--cnh-soft,#eef3f9);color:var(--cnh-sub,#5a6577);border-radius:999px;padding:4px 10px}',
    '.sg-fscroll{flex:1;overflow-y:auto;padding:12px;max-width:760px;width:100%;margin:0 auto}.sg-note{font-size:.75rem;background:var(--cnh-warn-bg,#fbf3e2);color:var(--cnh-warn,#8a5a0b);border-radius:10px;padding:8px 12px;margin-bottom:12px}',
    '.sg-site{background:var(--bg);color:var(--ink);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(17,24,39,.15);padding-bottom:6px}.sg-serif h2,.sg-serif h3,.sg-l-magazine h2,.sg-l-magazine h3{font-family:Georgia,serif}',
    '.sg-snav{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;font-size:.8125rem}.sg-snav b{font-size:1rem}.sg-snav span{display:flex;gap:12px;opacity:.75;font-size:.75rem}.sg-snav u{text-decoration:none}',
    '.sg-l-center .sg-snav{justify-content:center;flex-direction:column;gap:4px}',
    '.sg-shero{position:relative;margin:0 12px;border-radius:14px;min-height:230px;overflow:hidden;background:var(--hb);color:var(--hi);display:flex;align-items:flex-end}',
    '.sg-shm{position:absolute;inset:0}.sg-shm img{width:100%;height:100%;object-fit:cover;display:block}.sg-shm .sg-ph{position:absolute;inset:0}',
    '.sg-sht{position:relative;z-index:1;padding:20px;width:100%}.sg-sht h2{margin:0 0 8px;font-size:1.5rem;line-height:1.2;font-weight:700;max-width:92%}.sg-sub{margin:0 0 14px;font-size:.8125rem;opacity:.8}',
    '.sg-acts{display:flex;flex-wrap:wrap;gap:8px}.sg-acts u{text-decoration:none;display:inline-flex;align-items:center;font-size:.6875rem;font-weight:700;padding:5px 12px;border-radius:8px;border:1px solid currentColor;opacity:.85}.sg-acts em{padding:7px 14px;font-size:.75rem}',
    '.sg-l-banner .sg-shero .sg-shm::after,.sg-l-center .sg-shero .sg-shm::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.5)}.sg-l-banner .sg-shero{min-height:300px;color:#fff}.sg-l-center .sg-shero{justify-content:center;align-items:center;text-align:center;min-height:240px;color:#fff}.sg-l-center .sg-sht h2{margin-left:auto;margin-right:auto}.sg-l-center .sg-acts{justify-content:center}',
    '.sg-l-glass .sg-sht{margin:14px;width:auto;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:14px;color:#fff;padding:18px}.sg-l-glass .sg-shero{min-height:250px;color:#fff}',
    '.sg-l-split .sg-shero{display:grid;grid-template-columns:1.1fr .9fr;align-items:center;min-height:240px}.sg-l-split .sg-shm{position:relative;inset:auto;height:78%;margin:12px 12px 12px 0;border-radius:12px;overflow:hidden;order:2;min-height:180px}.sg-l-split .sg-sht h2{font-size:1.2rem}.sg-l-split .sg-sub{display:none}',
    '.sg-l-minimal .sg-shero{background:var(--hb);min-height:200px;align-items:center}.sg-l-minimal .sg-sht h2{font-size:1.9rem}.sg-l-minimal .sg-sht h2::after{content:"";display:block;width:52px;height:5px;border-radius:3px;background:var(--a);margin-top:12px}',
    '.sg-l-magazine .sg-shero{display:block;border-radius:4px;min-height:0}.sg-l-magazine .sg-shm{position:relative;inset:auto;height:150px}.sg-l-magazine .sg-sht{border-top:3px solid var(--ink);margin-top:0}.sg-l-magazine .sg-sht h2{font-size:1.75rem}.sg-l-magazine .sg-acts em{border-radius:3px}',
    '.sg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px 12px 4px}.sg-stats div{background:var(--cd);border:1px solid var(--ln);border-radius:12px;padding:10px 8px;text-align:center}.sg-stats b{display:block;font-size:.9375rem}.sg-stats span{font-size:.6875rem;opacity:.7}',
    '.sg-st{margin:16px 16px 10px;font-size:1rem}.sg-prods{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 12px}',
    '.sg-prod{background:var(--cd);border:1px solid var(--ln);color:var(--ink);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}.sg-prod b{font-size:.8125rem}.sg-prod span{font-weight:700;font-size:.875rem;color:var(--a)}',
    '.sg-pimg{width:100%;aspect-ratio:4/3;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--a) calc(10% + var(--k)*5%),var(--bg));color:var(--a)}',
    '.sg-list{padding:0 16px}.sg-li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--ln)}.sg-li b{font-family:Georgia,serif;font-size:.9375rem}.sg-li span{font-size:.75rem;font-weight:700;color:var(--a);white-space:nowrap}',
    '.sg-feats{display:grid;gap:8px;padding:0 16px}@media(min-width:520px){.sg-feats{grid-template-columns:1fr 1fr}}.sg-feats span{display:flex;align-items:center;gap:8px;font-size:.8125rem;padding:9px 12px;border-radius:10px;background:var(--cd);border:1px solid var(--ln)}.sg-feats svg{color:var(--a);flex:0 0 auto}',
    '.sg-revs{display:grid;gap:10px;padding:0 12px}.sg-revs blockquote{margin:0;padding:14px;border-radius:12px;background:var(--cd);border:1px solid var(--ln);border-left:4px solid var(--a)}.sg-revs p{margin:0 0 6px;font-size:.8125rem;line-height:1.5}.sg-revs cite{font-size:.6875rem;opacity:.7;font-style:normal}',
    '.sg-band{margin:18px 12px 10px;border-radius:14px;padding:18px;background:var(--hb);color:var(--hi);display:flex;flex-direction:column;gap:10px;align-items:flex-start}.sg-band b{font-size:1.0625rem}',
    '.sg-foot{padding:14px 16px;font-size:.75rem;opacity:.7;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}',
    '.sg-fcta{padding:12px 16px max(12px,env(safe-area-inset-bottom));background:var(--cnh-card,#fff);border-top:1px solid var(--cnh-line,#e1e6ed)}',
    '.sg-use{width:100%;min-height:50px;border-radius:14px;border:0;background:var(--cnh-brand,#1d4f91);color:#fff;font:inherit;font-weight:700;font-size:.9375rem;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}html[data-theme="dark"] .sg-use{color:#0b1220}',
    '@media(prefers-reduced-motion:reduce){.sg-full{animation:none}}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
