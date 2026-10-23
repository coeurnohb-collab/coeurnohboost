// api/_lib/site-chrome.js
// Textes d'interface propres à chaque TYPE de site, en 5 langues.
// Ordre : [bouton principal, titre de la liste, sous-titre, bouton d'un élément, titre « à propos », titre de la galerie, libellé du menu].
// Le script commun des sites (site-runtime.js) apparie le français avec la langue choisie par le visiteur.
const T = {
  fr: {
    entreprise: ['Demander un devis', 'Nos services', 'Ce que nous faisons pour vous', 'Demander', 'Qui sommes-nous', 'En images', 'Services'],
    boutique: ['Commander sur WhatsApp', 'Nos produits', 'Disponibles maintenant', 'Commander', 'Notre boutique', 'Galerie', 'Produits'],
    restaurant: ['Réserver une table', 'Notre menu', 'Cuisine préparée avec soin', 'Commander', 'Notre histoire', 'L’ambiance', 'Menu'],
    portfolio: ['Me contacter', 'Mes services', 'Comment je peux vous aider', 'Me contacter', 'À propos de moi', 'Mes réalisations', 'Services'],
    smm: ['Commander maintenant', 'Nos services', 'Prix pour 1000 · livraison rapide', 'Commander', 'Pourquoi nous choisir', 'Résultats', 'Services'],
    musique: ['Réserver l’artiste', 'Nos offres', 'Concerts, studio et collaborations', 'Réserver', 'L’artiste', 'En images', 'Offres'],
    education: ['S’inscrire', 'Nos formations', 'Des programmes pour progresser', 'S’inscrire', 'Notre établissement', 'La vie du centre', 'Formations'],
    sante: ['Prendre rendez-vous', 'Nos soins', 'Une équipe à votre écoute', 'Rendez-vous', 'Notre structure', 'Nos locaux', 'Soins'],
    immobilier: ['Visiter un bien', 'Nos biens', 'À vendre ou à louer', 'Je suis intéressé', 'Notre agence', 'Photos des biens', 'Biens'],
    evenement: ['Réserver la date', 'Nos formules', 'Pour des moments inoubliables', 'Réserver', 'Notre savoir-faire', 'Nos événements', 'Formules'],
    association: ['Nous rejoindre', 'Nos activités', 'Rejoignez-nous', 'En savoir plus', 'Notre mission', 'En images', 'Activités'],
    beaute: ['Prendre rendez-vous', 'Nos prestations', 'Tarifs clairs, résultat soigné', 'Réserver', 'Notre salon', 'Nos réalisations', 'Prestations'],
    media: ['Nous contacter', 'Rubriques et offres', 'Ce que nous proposons', 'Contacter', 'Notre rédaction', 'À la une', 'Rubriques et offres'],
    agence: ['Demander un devis', 'Nos offres', 'Stratégie, création, résultats', 'Demander', 'Notre agence', 'Nos projets', 'Offres'],
    hotel: ['Réserver une chambre', 'Nos chambres', 'Confort et vue exceptionnelle', 'Réserver', 'Notre hôtel', 'Photos', 'Chambres'],
    voyage: ['Planifier mon voyage', 'Nos circuits', 'Excursions et séjours sur mesure', 'Réserver', 'Notre agence', 'Nos destinations', 'Circuits'],
    auto: ['Demander un devis', 'Nos prestations', 'Entretien, réparation et vente', 'Demander', 'Notre garage', 'Notre atelier', 'Prestations'],
    sport: ['Essai gratuit', 'Nos abonnements', 'Des formules pour tous les objectifs', 'S’inscrire', 'Notre salle', 'La salle en images', 'Abonnements'],
    juridique: ['Prendre rendez-vous', 'Nos domaines', 'Conseil, rédaction et défense', 'Consulter', 'Le cabinet', 'Le cabinet', 'Domaines'],
    tech: ['Essayer gratuitement', 'Nos offres', 'Des plans pour chaque besoin', 'Choisir', 'Notre produit', 'Aperçus', 'Offres']
  },
  en: {
    entreprise: ['Request a quote', 'Our services', 'What we do for you', 'Request', 'Who we are', 'In pictures', 'Services'],
    boutique: ['Order on WhatsApp', 'Our products', 'Available now', 'Order', 'Our shop', 'Gallery', 'Products'],
    restaurant: ['Book a table', 'Our menu', 'Food prepared with care', 'Order', 'Our story', 'The atmosphere', 'Menu'],
    portfolio: ['Contact me', 'My services', 'How I can help you', 'Contact me', 'About me', 'My work', 'Services'],
    smm: ['Order now', 'Our services', 'Price per 1000 · fast delivery', 'Order', 'Why choose us', 'Results', 'Services'],
    musique: ['Book the artist', 'Our offers', 'Concerts, studio and collaborations', 'Book', 'The artist', 'In pictures', 'Offers'],
    education: ['Enrol', 'Our courses', 'Programmes to help you progress', 'Enrol', 'Our school', 'Life at the centre', 'Courses'],
    sante: ['Book an appointment', 'Our care', 'A team that listens', 'Appointment', 'Our facility', 'Our premises', 'Care'],
    immobilier: ['Visit a property', 'Our properties', 'For sale or to rent', 'I’m interested', 'Our agency', 'Property photos', 'Properties'],
    evenement: ['Book the date', 'Our packages', 'For unforgettable moments', 'Book', 'Our expertise', 'Our events', 'Packages'],
    association: ['Join us', 'Our activities', 'Join us', 'Learn more', 'Our mission', 'In pictures', 'Activities'],
    beaute: ['Book an appointment', 'Our services', 'Clear prices, polished results', 'Book', 'Our salon', 'Our work', 'Services'],
    media: ['Contact us', 'Sections and offers', 'What we offer', 'Contact', 'Our newsroom', 'Top stories', 'Sections and offers'],
    agence: ['Request a quote', 'Our offers', 'Strategy, creativity, results', 'Request', 'Our agency', 'Our projects', 'Offers'],
    hotel: ['Book a room', 'Our rooms', 'Comfort and an exceptional view', 'Book', 'Our hotel', 'Photos', 'Rooms'],
    voyage: ['Plan my trip', 'Our tours', 'Tailor-made excursions and stays', 'Book', 'Our agency', 'Our destinations', 'Tours'],
    auto: ['Request a quote', 'Our services', 'Maintenance, repair and sales', 'Request', 'Our garage', 'Our workshop', 'Services'],
    sport: ['Free trial', 'Our memberships', 'Plans for every goal', 'Join', 'Our gym', 'The gym in pictures', 'Memberships'],
    juridique: ['Book an appointment', 'Our practice areas', 'Advice, drafting and defence', 'Consult', 'The firm', 'The firm', 'Practice areas'],
    tech: ['Try for free', 'Our offers', 'Plans for every need', 'Choose', 'Our product', 'Previews', 'Offers']
  },
  es: {
    entreprise: ['Pedir presupuesto', 'Nuestros servicios', 'Lo que hacemos por ti', 'Solicitar', 'Quiénes somos', 'En imágenes', 'Servicios'],
    boutique: ['Pedir por WhatsApp', 'Nuestros productos', 'Disponibles ahora', 'Pedir', 'Nuestra tienda', 'Galería', 'Productos'],
    restaurant: ['Reservar una mesa', 'Nuestro menú', 'Cocina preparada con cariño', 'Pedir', 'Nuestra historia', 'El ambiente', 'Menú'],
    portfolio: ['Contáctame', 'Mis servicios', 'Cómo puedo ayudarte', 'Contáctame', 'Sobre mí', 'Mis trabajos', 'Servicios'],
    smm: ['Pedir ahora', 'Nuestros servicios', 'Precio por 1000 · entrega rápida', 'Pedir', 'Por qué elegirnos', 'Resultados', 'Servicios'],
    musique: ['Contratar al artista', 'Nuestras ofertas', 'Conciertos, estudio y colaboraciones', 'Reservar', 'El artista', 'En imágenes', 'Ofertas'],
    education: ['Inscribirse', 'Nuestros cursos', 'Programas para progresar', 'Inscribirse', 'Nuestro centro', 'La vida del centro', 'Cursos'],
    sante: ['Pedir cita', 'Nuestra atención', 'Un equipo que te escucha', 'Cita', 'Nuestro centro', 'Nuestras instalaciones', 'Atención'],
    immobilier: ['Visitar un inmueble', 'Nuestros inmuebles', 'En venta o alquiler', 'Me interesa', 'Nuestra agencia', 'Fotos de los inmuebles', 'Inmuebles'],
    evenement: ['Reservar la fecha', 'Nuestros paquetes', 'Para momentos inolvidables', 'Reservar', 'Nuestro saber hacer', 'Nuestros eventos', 'Paquetes'],
    association: ['Únete', 'Nuestras actividades', 'Únete a nosotros', 'Saber más', 'Nuestra misión', 'En imágenes', 'Actividades'],
    beaute: ['Pedir cita', 'Nuestros servicios', 'Precios claros, resultado cuidado', 'Reservar', 'Nuestro salón', 'Nuestros trabajos', 'Servicios'],
    media: ['Contáctanos', 'Secciones y ofertas', 'Lo que ofrecemos', 'Contactar', 'Nuestra redacción', 'Destacados', 'Secciones y ofertas'],
    agence: ['Pedir presupuesto', 'Nuestras ofertas', 'Estrategia, creatividad, resultados', 'Solicitar', 'Nuestra agencia', 'Nuestros proyectos', 'Ofertas'],
    hotel: ['Reservar habitación', 'Nuestras habitaciones', 'Confort y vistas excepcionales', 'Reservar', 'Nuestro hotel', 'Fotos', 'Habitaciones'],
    voyage: ['Planificar mi viaje', 'Nuestros circuitos', 'Excursiones y estancias a medida', 'Reservar', 'Nuestra agencia', 'Nuestros destinos', 'Circuitos'],
    auto: ['Pedir presupuesto', 'Nuestros servicios', 'Mantenimiento, reparación y venta', 'Solicitar', 'Nuestro taller', 'Nuestro taller', 'Servicios'],
    sport: ['Prueba gratuita', 'Nuestras cuotas', 'Planes para todos los objetivos', 'Inscribirse', 'Nuestro gimnasio', 'El gimnasio en imágenes', 'Cuotas'],
    juridique: ['Pedir cita', 'Nuestras áreas', 'Asesoría, redacción y defensa', 'Consultar', 'El despacho', 'El despacho', 'Áreas'],
    tech: ['Probar gratis', 'Nuestras ofertas', 'Planes para cada necesidad', 'Elegir', 'Nuestro producto', 'Vistas previas', 'Ofertas']
  },
  it: {
    entreprise: ['Richiedi un preventivo', 'I nostri servizi', 'Cosa facciamo per te', 'Richiedi', 'Chi siamo', 'In immagini', 'Servizi'],
    boutique: ['Ordina su WhatsApp', 'I nostri prodotti', 'Disponibili ora', 'Ordina', 'Il nostro negozio', 'Galleria', 'Prodotti'],
    restaurant: ['Prenota un tavolo', 'Il nostro menu', 'Cucina preparata con cura', 'Ordina', 'La nostra storia', 'L’atmosfera', 'Menu'],
    portfolio: ['Contattami', 'I miei servizi', 'Come posso aiutarti', 'Contattami', 'Chi sono', 'I miei lavori', 'Servizi'],
    smm: ['Ordina ora', 'I nostri servizi', 'Prezzo per 1000 · consegna rapida', 'Ordina', 'Perché sceglierci', 'Risultati', 'Servizi'],
    musique: ['Prenota l’artista', 'Le nostre offerte', 'Concerti, studio e collaborazioni', 'Prenota', 'L’artista', 'In immagini', 'Offerte'],
    education: ['Iscriviti', 'I nostri corsi', 'Programmi per progredire', 'Iscriviti', 'Il nostro istituto', 'La vita del centro', 'Corsi'],
    sante: ['Prenota una visita', 'Le nostre cure', 'Un team che ti ascolta', 'Appuntamento', 'La nostra struttura', 'I nostri locali', 'Cure'],
    immobilier: ['Visita un immobile', 'I nostri immobili', 'In vendita o in affitto', 'Mi interessa', 'La nostra agenzia', 'Foto degli immobili', 'Immobili'],
    evenement: ['Prenota la data', 'Le nostre formule', 'Per momenti indimenticabili', 'Prenota', 'Il nostro know-how', 'I nostri eventi', 'Formule'],
    association: ['Unisciti a noi', 'Le nostre attività', 'Unisciti a noi', 'Scopri di più', 'La nostra missione', 'In immagini', 'Attività'],
    beaute: ['Prenota un appuntamento', 'I nostri servizi', 'Prezzi chiari, risultato curato', 'Prenota', 'Il nostro salone', 'I nostri lavori', 'Servizi'],
    media: ['Contattaci', 'Rubriche e offerte', 'Cosa offriamo', 'Contatta', 'La nostra redazione', 'In primo piano', 'Rubriche e offerte'],
    agence: ['Richiedi un preventivo', 'Le nostre offerte', 'Strategia, creatività, risultati', 'Richiedi', 'La nostra agenzia', 'I nostri progetti', 'Offerte'],
    hotel: ['Prenota una camera', 'Le nostre camere', 'Comfort e vista eccezionale', 'Prenota', 'Il nostro hotel', 'Foto', 'Camere'],
    voyage: ['Pianifica il mio viaggio', 'I nostri tour', 'Escursioni e soggiorni su misura', 'Prenota', 'La nostra agenzia', 'Le nostre destinazioni', 'Tour'],
    auto: ['Richiedi un preventivo', 'I nostri servizi', 'Manutenzione, riparazione e vendita', 'Richiedi', 'La nostra officina', 'La nostra officina', 'Servizi'],
    sport: ['Prova gratuita', 'I nostri abbonamenti', 'Formule per ogni obiettivo', 'Iscriviti', 'La nostra palestra', 'La palestra in immagini', 'Abbonamenti'],
    juridique: ['Prenota un appuntamento', 'Le nostre aree', 'Consulenza, redazione e difesa', 'Consulta', 'Lo studio', 'Lo studio', 'Aree'],
    tech: ['Prova gratis', 'Le nostre offerte', 'Piani per ogni esigenza', 'Scegli', 'Il nostro prodotto', 'Anteprime', 'Offerte']
  },
  pt: {
    entreprise: ['Pedir orçamento', 'Nossos serviços', 'O que fazemos por você', 'Solicitar', 'Quem somos', 'Em imagens', 'Serviços'],
    boutique: ['Pedir pelo WhatsApp', 'Nossos produtos', 'Disponíveis agora', 'Pedir', 'Nossa loja', 'Galeria', 'Produtos'],
    restaurant: ['Reservar uma mesa', 'Nosso cardápio', 'Cozinha preparada com cuidado', 'Pedir', 'Nossa história', 'O ambiente', 'Cardápio'],
    portfolio: ['Fale comigo', 'Meus serviços', 'Como posso ajudar', 'Fale comigo', 'Sobre mim', 'Meus trabalhos', 'Serviços'],
    smm: ['Pedir agora', 'Nossos serviços', 'Preço por 1000 · entrega rápida', 'Pedir', 'Por que nos escolher', 'Resultados', 'Serviços'],
    musique: ['Contratar o artista', 'Nossas ofertas', 'Shows, estúdio e colaborações', 'Reservar', 'O artista', 'Em imagens', 'Ofertas'],
    education: ['Inscrever-se', 'Nossos cursos', 'Programas para progredir', 'Inscrever-se', 'Nossa instituição', 'A vida do centro', 'Cursos'],
    sante: ['Marcar consulta', 'Nossos cuidados', 'Uma equipe que escuta você', 'Consulta', 'Nossa estrutura', 'Nossas instalações', 'Cuidados'],
    immobilier: ['Visitar um imóvel', 'Nossos imóveis', 'À venda ou para alugar', 'Tenho interesse', 'Nossa imobiliária', 'Fotos dos imóveis', 'Imóveis'],
    evenement: ['Reservar a data', 'Nossos pacotes', 'Para momentos inesquecíveis', 'Reservar', 'Nosso know-how', 'Nossos eventos', 'Pacotes'],
    association: ['Junte-se a nós', 'Nossas atividades', 'Junte-se a nós', 'Saiba mais', 'Nossa missão', 'Em imagens', 'Atividades'],
    beaute: ['Marcar horário', 'Nossos serviços', 'Preços claros, resultado cuidadoso', 'Reservar', 'Nosso salão', 'Nossos trabalhos', 'Serviços'],
    media: ['Fale conosco', 'Seções e ofertas', 'O que oferecemos', 'Contatar', 'Nossa redação', 'Destaques', 'Seções e ofertas'],
    agence: ['Pedir orçamento', 'Nossas ofertas', 'Estratégia, criação, resultados', 'Solicitar', 'Nossa agência', 'Nossos projetos', 'Ofertas'],
    hotel: ['Reservar um quarto', 'Nossos quartos', 'Conforto e vista excepcional', 'Reservar', 'Nosso hotel', 'Fotos', 'Quartos'],
    voyage: ['Planejar minha viagem', 'Nossos roteiros', 'Passeios e estadias sob medida', 'Reservar', 'Nossa agência', 'Nossos destinos', 'Roteiros'],
    auto: ['Pedir orçamento', 'Nossos serviços', 'Manutenção, reparo e venda', 'Solicitar', 'Nossa oficina', 'Nossa oficina', 'Serviços'],
    sport: ['Aula experimental', 'Nossos planos', 'Planos para todos os objetivos', 'Inscrever-se', 'Nossa academia', 'A academia em imagens', 'Planos'],
    juridique: ['Marcar consulta', 'Nossas áreas', 'Consultoria, redação e defesa', 'Consultar', 'O escritório', 'O escritório', 'Áreas'],
    tech: ['Experimente grátis', 'Nossas ofertas', 'Planos para cada necessidade', 'Escolher', 'Nosso produto', 'Prévias', 'Ofertas']
  }
};

function typeTexts(type) {
  const out = {};
  Object.keys(T).forEach((l) => { out[l] = T[l][type] || T[l].entreprise; });
  return out;
}
module.exports = { TYPE_I18N: T, typeTexts };
