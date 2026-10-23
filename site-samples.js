// api/_lib/site-samples.js
// Sites d'exemple pour l'aperçu des modèles « Crée ton site ». L'aperçu utilise le VRAI rendu serveur
// (buildSiteHtml) avec ces données : ce que tu vois dans la galerie est exactement ce que ton site donnera.
// Les illustrations sont des images SVG générées ici (aucune photo externe, aucun droit à gérer).

const MOTIFS = ['skyline', 'waves', 'hills', 'circles', 'grid', 'sun'];

function svgArt(motif, c1, c2, label) {
  const W = 1200, H = 800;
  let body = '';
  const light = 'rgba(255,255,255,.16)', mid = 'rgba(255,255,255,.28)', dark = 'rgba(0,0,0,.18)';
  if (motif === 'skyline') {
    const bs = [[60, 360, 120], [200, 260, 150], [370, 420, 110], [500, 200, 170], [690, 330, 130], [840, 250, 150], [1010, 400, 120]];
    body = bs.map((b, i) => `<rect x="${b[0]}" y="${H - b[1]}" width="${b[2]}" height="${b[1]}" fill="${i % 2 ? mid : light}"/>` + Array.from({ length: 6 }, (_, k) => `<rect x="${b[0] + 18 + (k % 2) * 46}" y="${H - b[1] + 30 + Math.floor(k / 2) * 60}" width="22" height="30" fill="rgba(255,255,255,.35)"/>`).join('')).join('');
    body += `<circle cx="980" cy="170" r="70" fill="rgba(255,255,255,.35)"/>`;
  } else if (motif === 'waves') {
    body = [0, 1, 2, 3].map((i) => `<path d="M0 ${430 + i * 90} Q 150 ${360 + i * 90} 300 ${430 + i * 90} T 600 ${430 + i * 90} T 900 ${430 + i * 90} T 1200 ${430 + i * 90} V ${H} H0Z" fill="${i % 2 ? light : mid}"/>`).join('') + `<circle cx="260" cy="210" r="90" fill="rgba(255,255,255,.3)"/>`;
  } else if (motif === 'hills') {
    body = `<path d="M0 560 Q 260 330 520 520 T 1040 470 T 1200 520 V800 H0Z" fill="${mid}"/><path d="M0 660 Q 300 500 600 640 T 1200 600 V800 H0Z" fill="${dark}"/><circle cx="900" cy="190" r="80" fill="rgba(255,255,255,.4)"/>`;
  } else if (motif === 'circles') {
    body = [[220, 260, 170], [560, 430, 250], [930, 250, 150], [980, 600, 190], [120, 640, 120]].map((c, i) => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="${i % 2 ? light : mid}"/>`).join('');
  } else if (motif === 'grid') {
    for (let x = 0; x < 6; x++) for (let y = 0; y < 4; y++) body += `<rect x="${60 + x * 190}" y="${60 + y * 180}" width="170" height="160" rx="18" fill="${(x + y) % 3 === 0 ? mid : light}"/>`;
  } else {
    body = `<circle cx="600" cy="400" r="260" fill="${light}"/><circle cx="600" cy="400" r="170" fill="${mid}"/><circle cx="600" cy="400" r="80" fill="rgba(255,255,255,.55)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${body}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// c1/c2 = dégradé des illustrations ; mo = motif
function mk(o) {
  const art = (i) => svgArt(MOTIFS[(o.m0 + i) % MOTIFS.length], i % 2 ? o.c2 : o.c1, i % 2 ? o.c1 : o.c2);
  return {
    siteType: o.type,
    businessName: o.name,
    tagline: o.tag,
    aboutText: o.about,
    announcement: o.ann || '',
    coverImageUrl: art(0),
    gallery: [art(1), art(2), art(3), art(4), art(5), art(6)],
    services: o.items.map((x, i) => ({ name: x[0], price: x[1], desc: x[2] || '', image: o.photos ? art(i + 1) : '' })),
    stats: o.stats.map((x) => ({ value: x[0], label: x[1] })),
    testimonials: [{ name: 'Jean-Paul K.', text: o.rv[0] }, { name: 'Marie T.', text: o.rv[1] }, { name: 'Patrick M.', text: o.rv[2] || o.rv[0] }],
    faq: o.faq.map((x) => ({ question: x[0], answer: x[1] })),
    team: (o.team || [['Amani B.', 'Responsable'], ['Grace L.', 'Conseillère'], ['David N.', 'Technicien']]).map((x) => ({ name: x[0], role: x[1] })),
    plans: o.plans ? o.plans.map((p) => ({ name: p[0], price: p[1], features: p[2] })) : [],
    partners: o.partners || [],
    timeline: o.timeline || [],
    hours: o.hours || 'Lun–Sam · 8h–18h',
    address: o.addr || 'Avenue du Commerce 24, Kinshasa, RDC',
    contactWhatsapp: '+243812345678', contactPhone: '+243812345678', contactEmail: 'contact@exemple.com',
    socialLinks: { facebook: 'https://facebook.com/exemple', instagram: 'https://instagram.com/exemple', tiktok: 'https://tiktok.com/@exemple', youtube: 'https://youtube.com/@exemple' },
    booking: { enabled: !!o.booking, note: 'Réponse sous 24 h.' },
    newsletter: { enabled: true, title: 'Restez informé' },
    extras: { hoursOn: true, tz: 1, week: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ x: d === 6, o: '08:00', c: '18:00' })), cart: { on: !!o.cart, note: 'Livraison possible selon votre quartier.' } },
    blogPosts: o.blog ? o.blog.map((b, i) => ({ title: b[0], category: b[1], body: b[2], date: new Date(Date.UTC(2026, 8, 20 - i * 6)).toISOString() })) : [],
    portfolio: o.port ? o.port.map((p, i) => ({ title: p[0], category: p[1], desc: p[2], image: art(i + 2) })) : [],
    status: 'published'
  };
}

const D = {
  smm: { type: 'smm', name: 'BoostPro RDC', tag: 'Faites grandir vos réseaux sociaux, simplement et rapidement', about: 'Abonnés, likes, vues et commentaires pour Instagram, TikTok, Facebook et YouTube. Prix clairs pour 1000, livraison automatique et remboursement si la commande n’aboutit pas.', c1: '#0ea5a4', c2: '#0b4f6c', m0: 4,
    items: [['Abonnés Instagram (1000)', '2 $', 'Profil réel, livraison progressive'], ['Vues TikTok (1000)', '1 $', 'Démarrage en quelques minutes'], ['Likes Facebook (1000)', '2,5 $', 'Sur publication ou page'], ['Abonnés YouTube (1000)', '9 $', 'Garantie 30 jours'], ['Vues Instagram Reels (1000)', '0,8 $', 'Livraison rapide']],
    stats: [['24/7', 'Commandes automatiques'], ['5 000+', 'Commandes livrées'], ['100%', 'Remboursement si échec']], rv: ['Livraison rapide, mon compte a vraiment décollé.', 'Prix honnêtes et un support qui répond.'],
    faq: [['Faut-il donner mon mot de passe ?', 'Jamais. Il suffit du lien de votre profil ou publication.'], ['Combien de temps pour la livraison ?', 'Le démarrage est rapide, les grosses quantités sont livrées progressivement.']] },
  entreprise: { type: 'entreprise', name: 'Congo Logistics', tag: 'Transport et dédouanement entre Matadi, Kinshasa et Lubumbashi', about: 'Depuis 12 ans, nous accompagnons les entreprises congolaises : transport routier, dédouanement, entreposage et suivi de vos marchandises en temps réel.', c1: '#0369a1', c2: '#04263d', m0: 0, booking: true,
    items: [['Transport routier', 'sur devis', 'Camions de 5 à 40 tonnes'], ['Dédouanement', 'dès 120 $', 'Dossiers complets, zéro retard'], ['Entreposage', 'dès 3 $/m²', 'Sécurisé, assuré, gardé 24 h/24'], ['Suivi GPS', 'inclus', 'Suivez vos colis en direct']],
    stats: [['12 ans', 'd’expérience'], ['850+', 'clients'], ['98%', 'livraisons à l’heure']], rv: ['Nos conteneurs arrivent toujours à temps.', 'Équipe sérieuse et réactive.'],
    faq: [['Comment obtenir un devis ?', 'Envoyez-nous le trajet et le type de marchandise, nous répondons sous 24 h.'], ['Assurez-vous la marchandise ?', 'Oui, chaque transport est assuré.']], partners: ['Port de Matadi', 'Gécamines', 'Bralima', 'Vodacom', 'Brasimba'], timeline: [['2014', 'Création de l’entreprise à Matadi'], ['2018', 'Ouverture de l’agence de Kinshasa'], ['2022', 'Lancement du suivi GPS']] },
  boutique: { type: 'boutique', name: 'Kin Market', tag: 'Mode, tech et maison livrées partout à Kinshasa', about: 'Une sélection de produits de qualité, au meilleur prix. Commandez en quelques clics, payez à la livraison.', c1: '#e11d48', c2: '#7f1d3a', m0: 2, cart: true, photos: true,
    items: [['Sneakers urbaines', '45 $', 'Pointures 38 à 45'], ['Casque Bluetooth', '29 $', 'Autonomie 30 heures'], ['Sac en cuir', '38 $', 'Fait main'], ['Montre connectée', '55 $', 'Étanche, suivi sportif'], ['Robe wax', '32 $', 'Tissu 100 % coton'], ['Enceinte portable', '24 $', 'Son puissant']],
    stats: [['2 000+', 'clients satisfaits'], ['24 h', 'livraison Kinshasa'], ['7 jours', 'pour changer d’avis']], rv: ['Produit conforme et livraison le jour même.', 'Très bon service client.'],
    faq: [['Livrez-vous hors de Kinshasa ?', 'Oui, via nos partenaires de transport (3 à 5 jours).'], ['Puis-je payer à la livraison ?', 'Oui, à Kinshasa et Lubumbashi.']] },
  restaurant: { type: 'restaurant', name: 'Chez Maman Lumière', tag: 'Une cuisine congolaise généreuse, livrée chez vous', about: 'Des recettes de famille préparées chaque jour avec des produits frais du marché : moambe, liboké, pondu et grillades. Salle climatisée et service traiteur.', c1: '#e8590c', c2: '#7c2d12', m0: 3, booking: true, photos: true,
    items: [['Poulet à la moambe', '12 $', 'Riz, chikwangue, légumes'], ['Liboké de poisson', '10 $', 'Cuit dans la feuille de bananier'], ['Pondu et riz', '6 $', 'Feuilles de manioc mijotées'], ['Brochettes mixtes', '8 $', 'Bœuf, poulet, plantains'], ['Jus de gingembre', '2 $', 'Fait maison']],
    stats: [['15 ans', 'de cuisine maison'], ['120', 'couverts par jour'], ['4,8/5', 'note clients']], rv: ['Le meilleur poulet moambe de la ville.', 'Cadre agréable, service impeccable.'],
    faq: [['Faites-vous la livraison ?', 'Oui, dans un rayon de 8 km.'], ['Peut-on privatiser la salle ?', 'Oui, jusqu’à 60 personnes. Contactez-nous.']] },
  portfolio: { type: 'portfolio', name: 'Studio Amani', tag: 'Photographe et vidéaste à Bukavu. Des images qui racontent votre histoire', about: 'Photographe professionnel depuis 8 ans : mariages, portraits, événements et films d’entreprise. Chaque projet est livré avec soin et dans les délais.', c1: '#7c3aed', c2: '#2e1065', m0: 1, booking: true, port: [['Mariage à Goma', 'Mariage', 'Reportage complet, 800 photos'], ['Portrait corporate', 'Portrait', 'Séance en studio'], ['Clip « Lac Kivu »', 'Vidéo', 'Clip musical tourné en 4K']],
    items: [['Mariage (journée complète)', '450 $', 'Photos + vidéo'], ['Séance portrait', '60 $', '20 photos retouchées'], ['Film d’entreprise', 'dès 300 $', 'Scénario, tournage, montage']],
    stats: [['8 ans', 'd’expérience'], ['350+', 'projets réalisés'], ['100%', 'clients satisfaits']], rv: ['Des photos magnifiques, nous sommes ravis.', 'Professionnel et très créatif.'],
    faq: [['Combien de temps pour recevoir les photos ?', 'Entre 7 et 14 jours selon le projet.'], ['Vous déplacez-vous ?', 'Oui, dans tout le Kivu.']] },
  musique: { type: 'musique', name: 'Rumba Live Productions', tag: 'Concerts, studio et collaborations, de Kinshasa à Paris', about: 'Groupe de rumba et de musique urbaine : concerts privés, festivals, enregistrement studio et productions sur mesure.', c1: '#9333ea', c2: '#2a0f52', m0: 5, booking: true,
    items: [['Concert privé', 'dès 800 $', 'Jusqu’à 3 heures, sonorisation incluse'], ['Enregistrement studio', '40 $/h', 'Ingénieur du son inclus'], ['Composition sur mesure', 'dès 150 $', 'Jingle, bande-son, titre'], ['Atelier piano', '25 $', 'Cours individuel d’une heure']],
    stats: [['12', 'titres publiés'], ['60+', 'concerts'], ['1,4 M', 'écoutes']], rv: ['Une ambiance incroyable à notre mariage.', 'Un son professionnel, des musiciens exceptionnels.'],
    faq: [['Comment réserver une date ?', 'Remplissez le formulaire de rendez-vous ou écrivez-nous sur WhatsApp.'], ['Voyagez-vous ?', 'Oui, en Afrique centrale et en Europe.']], blog: [['Nouvel album : « Mama Africa »', 'Actualité', 'Notre prochain album sortira en décembre, avec 10 titres inédits.']] },
  education: { type: 'education', name: 'Académie Lubumbashi Pro', tag: 'Apprenez, progressez et obtenez votre certificat', about: 'Centre de formation professionnelle : design graphique, comptabilité, informatique et marketing digital. Cours en présentiel et en ligne.', c1: '#4f46e5', c2: '#1e1b4b', m0: 4, booking: true,
    items: [['Design graphique', '45 $', '6 semaines, certificat inclus'], ['Comptabilité pratique', '60 $', 'Cas réels et logiciels'], ['Marketing digital', '50 $', 'Réseaux sociaux et publicité'], ['Informatique de base', '30 $', 'Word, Excel, Internet']],
    stats: [['1 200+', 'diplômés'], ['15', 'formateurs'], ['92%', 'insertion pro']], rv: ['J’ai trouvé un emploi un mois après ma formation.', 'Formateurs passionnés et très pédagogues.'],
    faq: [['Quand commencent les cours ?', 'Une nouvelle session démarre chaque mois.'], ['Délivrez-vous un certificat ?', 'Oui, reconnu par nos entreprises partenaires.']], plans: [['Essentiel', '30 $', 'Cours en ligne\nSupport PDF'], ['Complet', '60 $', 'Cours en présentiel\nCertificat\nSuivi personnalisé'], ['Premium', '120 $', 'Tout le pack Complet\nStage en entreprise\nCoaching emploi']] },
  sante: { type: 'sante', name: 'Clinique Espoir', tag: 'Des soins de qualité, près de chez vous à Goma', about: 'Clinique pluridisciplinaire : consultations, pédiatrie, maternité, laboratoire et urgences. Une équipe médicale à votre écoute, 7 jours sur 7.', c1: '#0d9488', c2: '#134e4a', m0: 2, booking: true,
    items: [['Consultation générale', '15 $', 'Sur rendez-vous ou sans'], ['Pédiatrie', '20 $', 'Suivi de l’enfant'], ['Analyses de laboratoire', 'dès 12 $', 'Résultats en 24 h'], ['Maternité', 'sur devis', 'Suivi de grossesse et accouchement']],
    stats: [['7j/7', 'ouvert'], ['20', 'soignants'], ['15 000+', 'patients suivis']], rv: ['Accueil chaleureux et soins sérieux.', 'Ils ont sauvé mon fils, merci.'],
    faq: [['Acceptez-vous les assurances ?', 'Oui, la plupart des assurances locales.'], ['Y a-t-il des urgences la nuit ?', 'Oui, 24 h/24.']], hours: 'Tous les jours · 7h–21h' },
  immobilier: { type: 'immobilier', name: 'Résidences Gombe', tag: 'Trouvez la maison de vos rêves à Kinshasa, Lubumbashi ou Goma', about: 'Agence immobilière : vente, location et gestion de biens. Visites sur rendez-vous, dossiers vérifiés et accompagnement jusqu’à la remise des clés.', c1: '#0f766e', c2: '#0f172a', m0: 0, booking: true, photos: true,
    items: [['Villa 4 chambres, Ma Campagne', '185 000 $', 'Piscine, groupe électrogène'], ['Appartement 2 chambres, Gombe', '850 $/mois', 'Vue sur le fleuve'], ['Terrain 600 m², Mont-Ngafula', '48 000 $', 'Titre foncier'], ['Bureau 80 m², Centre-ville', '1 400 $/mois', 'Climatisé, parking']],
    stats: [['600+', 'biens vendus'], ['10 ans', 'd’expertise'], ['100%', 'titres vérifiés']], rv: ['Une transaction claire du début à la fin.', 'Ils ont trouvé exactement ce que je cherchais.'],
    faq: [['Comment visiter un bien ?', 'Prenez rendez-vous en ligne, nous organisons la visite.'], ['Vérifiez-vous les titres de propriété ?', 'Oui, chaque dossier est contrôlé.']] },
  evenement: { type: 'evenement', name: 'Prestige Events Brazzaville', tag: 'Des moments d’exception, organisés de A à Z', about: 'Mariages, anniversaires, conférences et soirées d’entreprise : décoration, traiteur, sonorisation et coordination le jour J.', c1: '#c026d3', c2: '#3b0764', m0: 3, booking: true,
    items: [['Mariage civil et religieux', 'dès 1 800 $', 'Décoration, traiteur, DJ'], ['Anniversaire', 'dès 300 $', 'Thème au choix'], ['Conférence', 'dès 600 $', 'Salle, sono, accueil'], ['Soirée d’entreprise', 'sur devis', 'Sur mesure']],
    stats: [['300+', 'événements'], ['4,9/5', 'avis clients'], ['10 ans', 'd’expérience']], rv: ['Notre mariage était un rêve éveillé.', 'Organisation parfaite jusqu’au dernier détail.'],
    faq: [['Combien de temps avant la date réserver ?', 'Idéalement 3 mois, mais nous étudions toute demande.'], ['Proposez-vous un devis gratuit ?', 'Oui, sous 48 heures.']] },
  association: { type: 'association', name: 'Entraide Kivu', tag: 'Ensemble, donnons une chance à chaque enfant d’aller à l’école', about: 'Association à but non lucratif : scolarisation des enfants, soutien aux familles et formation des jeunes. Chaque don est utilisé avec transparence.', c1: '#b45309', c2: '#451a03', m0: 2,
    items: [['Parrainer un enfant', '10 $/mois', 'Frais de scolarité et uniforme'], ['Kit scolaire', '15 $', 'Cahiers, stylos, sac'], ['Repas solidaire', '2 $', 'Un repas pour un enfant'], ['Devenir bénévole', 'Gratuit', 'Donnez un peu de votre temps']],
    stats: [['850', 'enfants scolarisés'], ['12', 'écoles partenaires'], ['100%', 'dons reversés']], rv: ['Grâce à vous, ma fille est à l’école.', 'Une association sérieuse et transparente.'],
    faq: [['Mes dons sont-ils sécurisés ?', 'Oui, chaque don est tracé et un rapport annuel est publié.']], hours: 'Lun–Ven · 9h–16h' },
  beaute: { type: 'beaute', name: 'Salon Éclat Abidjan', tag: 'Votre beauté, notre savoir-faire', about: 'Coiffure, tresses, soins du visage, maquillage et manucure dans un cadre élégant. Produits professionnels et hygiène irréprochable.', c1: '#db2777', c2: '#500724', m0: 5, booking: true,
    items: [['Tresses africaines', '25 $', 'Tous styles'], ['Soin du visage', '30 $', 'Nettoyage et hydratation'], ['Maquillage de mariée', '80 $', 'Essai inclus'], ['Manucure', '12 $', 'Vernis semi-permanent']],
    stats: [['5 000+', 'clientes'], ['8', 'coiffeuses'], ['4,9/5', 'avis']], rv: ['Mes tresses ont tenu 2 mois, parfait.', 'Ambiance très agréable.'],
    faq: [['Faut-il réserver ?', 'C’est conseillé, surtout le week-end.']], hours: 'Mar–Dim · 9h–19h' },
  media: { type: 'media', name: 'Le Courrier du Grand Lac', tag: 'L’actualité de la région, expliquée simplement', about: 'Média indépendant de la région des Grands Lacs : société, économie, culture et sport. Une rédaction de terrain, une information vérifiée.', c1: '#dc2626', c2: '#1c1917', m0: 4,
    items: [['Publicité sur le site', 'dès 40 $', 'Bannière et article sponsorisé'], ['Abonnement newsletter', 'Gratuit', 'L’essentiel chaque matin'], ['Reportage sur mesure', 'sur devis', 'Pour institutions et entreprises']],
    stats: [['80 000', 'lecteurs / mois'], ['15', 'journalistes'], ['6 ans', 'd’existence']], rv: ['Mon journal de référence.', 'Des articles clairs et fiables.'],
    faq: [['Comment publier une annonce ?', 'Contactez-nous via le formulaire.']], blog: [['Le port de Goma se modernise', 'Économie', 'De nouveaux quais et des grues seront installés d’ici l’an prochain pour fluidifier le trafic.'], ['Rentrée scolaire : ce qui change', 'Société', 'Les frais, les horaires et les nouveautés expliqués aux parents.'], ['Festival Amani : le programme', 'Culture', 'Trois jours de concerts et de débats au bord du lac.']] },
  agence: { type: 'agence', name: 'Studio Moko Kinshasa', tag: 'Sites web, logos et campagnes qui font parler de vous', about: 'Agence de communication digitale : identité visuelle, sites web, réseaux sociaux et publicité en ligne. Des projets pensés pour vos résultats.', c1: '#4f46e5', c2: '#0f172a', m0: 1, booking: true, port: [['Refonte de marque Bralima', 'Branding', 'Logo, charte et packaging'], ['Site e-commerce Kin Market', 'Web', 'Boutique en ligne complète'], ['Campagne Vodacom', 'Publicité', '2 millions de vues']],
    items: [['Création de logo', '80 $', 'Trois propositions'], ['Site vitrine', '350 $', 'Responsive et rapide'], ['Gestion des réseaux sociaux', '120 $/mois', '12 publications']],
    stats: [['150+', 'projets'], ['9', 'experts'], ['6 ans', 'd’expérience']], rv: ['Notre image de marque a été transformée.', 'Une équipe créative et fiable.'],
    faq: [['Combien de temps pour un site ?', 'En général 2 à 3 semaines.']], plans: [['Starter', '350 $', 'Site vitrine\nHébergement 1 an'], ['Business', '900 $', 'Site complet\nSEO de base\nFormation'], ['Premium', '1 800 $', 'Site sur mesure\nSEO avancé\nMaintenance 6 mois']] },
  hotel: { type: 'hotel', name: 'Hôtel Lac Kivu Palace', tag: 'Une escale d’exception au bord du lac', about: 'Hôtel 4 étoiles face au lac Kivu : 60 chambres, restaurant gastronomique, piscine et salles de séminaire. Réservez directement pour les meilleurs tarifs.', c1: '#0e7490', c2: '#083344', m0: 2, booking: true, photos: true,
    items: [['Chambre standard', '85 $/nuit', 'Lit double, climatisation, Wi-Fi'], ['Suite lac', '160 $/nuit', 'Balcon et vue sur le lac'], ['Salle de séminaire', '300 $/jour', 'Jusqu’à 80 personnes'], ['Petit-déjeuner buffet', '12 $', 'Inclus en suite']],
    stats: [['60', 'chambres'], ['4,7/5', 'avis voyageurs'], ['24/7', 'réception']], rv: ['Vue magnifique et personnel adorable.', 'Le meilleur séjour de notre voyage.'],
    faq: [['Heure d’arrivée et de départ ?', 'Arrivée dès 14h, départ avant 12h.'], ['Le petit-déjeuner est-il inclus ?', 'Oui pour les suites, en option pour les chambres.']], hours: 'Réception 24 h/24', plans: [['Escale', '85 $', 'Chambre standard\nWi-Fi'], ['Confort', '120 $', 'Chambre supérieure\nPetit-déjeuner'], ['Prestige', '160 $', 'Suite vue lac\nPetit-déjeuner\nNavette aéroport']] },
  voyage: { type: 'voyage', name: 'Safari Kivu Voyages', tag: 'Gorilles, volcans et lac : vivez l’aventure en toute sécurité', about: 'Agence de voyages locale : excursions, safaris, billets d’avion et transferts. Guides expérimentés et programmes sur mesure à travers la RDC et la région.', c1: '#16a34a', c2: '#052e16', m0: 2, booking: true, photos: true,
    items: [['Trek des gorilles', '450 $', '2 jours, permis inclus'], ['Ascension du Nyiragongo', '300 $', '2 jours, bivouac au sommet'], ['Croisière lac Kivu', '60 $', 'Demi-journée'], ['Transfert aéroport', '25 $', 'Goma ou Bukavu']],
    stats: [['2 500+', 'voyageurs'], ['12', 'guides certifiés'], ['4,9/5', 'avis']], rv: ['Une expérience inoubliable, merci à toute l’équipe.', 'Organisation impeccable.'],
    faq: [['Faut-il un visa ?', 'Nous vous aidons à préparer vos démarches.'], ['Voyages en groupe ?', 'Oui, tarifs dégressifs dès 5 personnes.']], timeline: [['2016', 'Premières excursions à Goma'], ['2020', 'Ouverture de l’agence de Bukavu'], ['2024', 'Lancement des circuits sur mesure']] },
  auto: { type: 'auto', name: 'Garage Moderne Kinshasa', tag: 'Entretien, réparation et vente de véhicules fiables', about: 'Garage multimarque : diagnostic électronique, mécanique, carrosserie et vente de véhicules d’occasion contrôlés. Devis gratuit et garantie sur les réparations.', c1: '#f97316', c2: '#1c1917', m0: 1, booking: true, photos: true,
    items: [['Vidange complète', '35 $', 'Huile + filtres'], ['Diagnostic électronique', '25 $', 'Toutes marques'], ['Freins avant', '70 $', 'Pièces et main-d’œuvre'], ['Voiture d’occasion', 'dès 4 500 $', 'Contrôlée et garantie 6 mois']],
    stats: [['15 ans', 'd’atelier'], ['6 mois', 'garantie'], ['3 000+', 'véhicules réparés']], rv: ['Honnêtes, rapides et compétents.', 'Ma voiture est comme neuve.'],
    faq: [['Faites-vous un devis gratuit ?', 'Oui, avant toute intervention.'], ['Délais de réparation ?', 'En général 24 à 48 h.']] },
  sport: { type: 'sport', name: 'Force & Forme Gym', tag: 'Transformez votre corps avec des coachs diplômés', about: 'Salle de sport moderne : musculation, cardio, cours collectifs et coaching personnalisé. Abonnements flexibles, essai gratuit de 3 jours.', c1: '#ef4444', c2: '#18181b', m0: 3, booking: true, photos: true,
    items: [['Abonnement mensuel', '25 $', 'Accès illimité'], ['Cours collectifs', '10 $', 'Zumba, cross-training, yoga'], ['Coaching personnel', '30 $/séance', 'Programme sur mesure'], ['Pass trimestre', '60 $', 'Économisez 20 %']],
    stats: [['1 200', 'membres'], ['10', 'coachs'], ['6h–22h', 'ouvert']], rv: ['J’ai perdu 12 kg en 4 mois.', 'Ambiance motivante, matériel neuf.'],
    faq: [['Puis-je essayer avant de payer ?', 'Oui, 3 jours d’essai offerts.']], hours: 'Lun–Sam · 6h–22h', plans: [['Mensuel', '25 $', 'Accès illimité\nVestiaires'], ['Trimestre', '60 $', 'Accès illimité\n2 séances coaching'], ['Annuel', '200 $', 'Accès illimité\nCoaching mensuel\nBilan santé']] },
  juridique: { type: 'juridique', name: 'Cabinet Mukendi & Associés', tag: 'Conseil juridique et fiscal pour particuliers et entreprises', about: 'Cabinet d’avocats et de conseil : droit des affaires, droit du travail, création de sociétés et contentieux. Confidentialité et rigueur.', c1: '#1e3a8a', c2: '#0b1220', m0: 4, booking: true,
    items: [['Consultation juridique', '50 $', 'Une heure avec un avocat'], ['Création de société', 'dès 400 $', 'Statuts, RCCM, NIF'], ['Contrat de travail', '80 $', 'Rédaction et relecture'], ['Représentation en justice', 'sur devis', 'Selon la nature du dossier']],
    stats: [['20 ans', 'd’expérience'], ['1 500+', 'dossiers traités'], ['95%', 'clients satisfaits']], rv: ['Un cabinet sérieux qui explique tout clairement.', 'Ils ont réglé mon litige rapidement.'],
    faq: [['La première consultation est-elle gratuite ?', 'Un court échange téléphonique est offert, la consultation complète est payante.']], team: [['Me Mukendi', 'Associé fondateur'], ['Me Kabila', 'Droit des affaires'], ['Me Tshala', 'Droit du travail']] },
  tech: { type: 'tech', name: 'NovaPay Congo', tag: 'Payez, envoyez et encaissez depuis votre téléphone', about: 'Application de paiement mobile pensée pour l’Afrique : transferts instantanés, factures, paiements marchands et API pour développeurs. Simple, rapide, sécurisé.', c1: '#6366f1', c2: '#0f172a', m0: 4,
    items: [['Compte Starter', 'Gratuit', 'Transferts illimités'], ['Compte Business', '9 $/mois', 'Encaissement marchand'], ['API développeurs', 'dès 29 $/mois', 'Documentation et sandbox'], ['Cartes virtuelles', '2 $', 'Paiements en ligne']],
    stats: [['300 000', 'utilisateurs'], ['0,5 s', 'par transfert'], ['99,9%', 'disponibilité']], rv: ['L’application la plus fluide que j’ai utilisée.', 'Parfait pour mon commerce.'],
    faq: [['Mes données sont-elles protégées ?', 'Oui, chiffrement de bout en bout et authentification renforcée.']], plans: [['Starter', 'Gratuit', 'Transferts illimités\nSupport par e-mail'], ['Business', '9 $/mois', 'Encaissement marchand\nFactures\nSupport prioritaire'], ['Pro', '29 $/mois', 'API\nTableau de bord\nSupport dédié']], blog: [['Nouvelle version 3.0', 'Produit', 'Paiements par QR code et factures automatiques.']] }
};

const BUILT = {};
function sampleSite(type, tplId) {
  const key = D[type] ? type : 'entreprise';
  if (!BUILT[key]) BUILT[key] = mk(D[key]);
  return Object.assign({}, BUILT[key], { template: tplId || 'classique', slug: 'modele-' + key });
}

module.exports = { sampleSite, svgArt, SAMPLE_TYPES: Object.keys(D) };
