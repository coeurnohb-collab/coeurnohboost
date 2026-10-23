/* site-runtime.js — moteur commun de TOUS les sites créés avec « Crée ton site » (Coeurnoh Universe).
 * Ajoute à chaque site, sans rien changer à son contenu :
 *   1) la traduction de l'interface en 5 langues (fr, en, es, it, pt) avec un sélecteur de langue ;
 *   2) la connexion visiteur / propriétaire (Firebase Auth, même compte que l'application) ;
 *   3) l'ESPACE PROPRIÉTAIRE (visible seulement par le créateur du site, vérifié par le serveur) :
 *      aperçu chiffré, demandes reçues, réglages rapides, messagerie « Aide pour mon site », conseils de sécurité.
 * Toutes les écritures passent par /api/render-site avec le jeton de connexion ; la page ne décide jamais qui est propriétaire.
 */
(function () {
  'use strict';
  var C = window.__CN_SITE;
  if (!C || window.__CN_RT) return;
  window.__CN_RT = 1;
  var LANGS = [['fr', 'Français'], ['en', 'English'], ['es', 'Español'], ['it', 'Italiano'], ['pt', 'Português']];
  var LI = { fr: 0, en: 1, es: 2, it: 3, pt: 4 };

  /* ------------------------------------------------------------------ 1. DICTIONNAIRE (texte français d'origine -> 4 langues) */
  var D = {};
  function P(fr, en, es, it, pt) { D[fr] = [fr, en, es, it, pt]; }
  P('À propos', 'About', 'Acerca de', 'Chi siamo', 'Sobre');
  P('À propos de moi', 'About me', 'Sobre mí', 'Chi sono', 'Sobre mim');
  P('Galerie', 'Gallery', 'Galería', 'Galleria', 'Galeria');
  P('Réalisations', 'Our work', 'Trabajos', 'Realizzazioni', 'Realizações');
  P('Forfaits', 'Plans', 'Planes', 'Piani', 'Planos');
  P('Équipe', 'Team', 'Equipo', 'Team', 'Equipe');
  P('Vidéos', 'Videos', 'Vídeos', 'Video', 'Vídeos');
  P('Carrières', 'Careers', 'Empleo', 'Carriere', 'Carreiras');
  P('Documents', 'Documents', 'Documentos', 'Documenti', 'Documentos');
  P('Actualités', 'News', 'Noticias', 'Notizie', 'Notícias');
  P('Avis', 'Reviews', 'Opiniones', 'Recensioni', 'Avaliações');
  P('FAQ', 'FAQ', 'FAQ', 'FAQ', 'FAQ');
  P('Commander', 'Order', 'Pedir', 'Ordina', 'Pedir');
  P('Rendez-vous', 'Appointment', 'Cita', 'Appuntamento', 'Agendamento');
  P('Contact', 'Contact', 'Contacto', 'Contatti', 'Contato');
  P('Nos forfaits', 'Our plans', 'Nuestros planes', 'I nostri piani', 'Nossos planos');
  P('Tarifs', 'Pricing', 'Tarifas', 'Tariffe', 'Preços');
  P('Notre équipe', 'Our team', 'Nuestro equipo', 'Il nostro team', 'Nossa equipe');
  P('Les personnes derrière le projet', 'The people behind the project', 'Las personas detrás del proyecto', 'Le persone dietro il progetto', 'As pessoas por trás do projeto');
  P('Présentation', 'Presentation', 'Presentación', 'Presentazione', 'Apresentação');
  P('À télécharger', 'To download', 'Para descargar', 'Da scaricare', 'Para baixar');
  P('Partenaires et clients', 'Partners and clients', 'Socios y clientes', 'Partner e clienti', 'Parceiros e clientes');
  P('Ils nous font confiance', 'They trust us', 'Confían en nosotros', 'Si fidano di noi', 'Eles confiam em nós');
  P('Notre parcours', 'Our journey', 'Nuestra trayectoria', 'Il nostro percorso', 'Nossa trajetória');
  P('Historique', 'History', 'Historia', 'Storia', 'Histórico');
  P('Avis de clients', 'Customer reviews', 'Opiniones de clientes', 'Recensioni dei clienti', 'Avaliações de clientes');
  P("Besoin d'aide ?", 'Need help?', '¿Necesitas ayuda?', 'Serve aiuto?', 'Precisa de ajuda?');
  P('Questions fréquentes', 'Frequently asked questions', 'Preguntas frecuentes', 'Domande frequenti', 'Perguntas frequentes');
  P('Réservation', 'Booking', 'Reserva', 'Prenotazione', 'Reserva');
  P('Prendre rendez-vous', 'Book an appointment', 'Pedir cita', 'Prenota un appuntamento', 'Marcar horário');
  P('Parlons de votre projet', 'Let’s talk about your project', 'Hablemos de tu proyecto', 'Parliamo del tuo progetto', 'Vamos falar do seu projeto');
  P('Laissez un message, nous vous répondons rapidement.', 'Leave a message, we reply quickly.', 'Deja un mensaje, respondemos rápido.', 'Lascia un messaggio, rispondiamo in fretta.', 'Deixe uma mensagem, respondemos rápido.');
  P('Votre nom', 'Your name', 'Tu nombre', 'Il tuo nome', 'Seu nome');
  P('Votre téléphone ou e-mail', 'Your phone or email', 'Tu teléfono o correo', 'Il tuo telefono o e-mail', 'Seu telefone ou e-mail');
  P('Votre message', 'Your message', 'Tu mensaje', 'Il tuo messaggio', 'Sua mensagem');
  P('Envoyer le message', 'Send message', 'Enviar mensaje', 'Invia messaggio', 'Enviar mensagem');
  P('Demander ce rendez-vous', 'Request this appointment', 'Solicitar esta cita', 'Richiedi questo appuntamento', 'Solicitar este horário');
  P('Nom complet', 'Full name', 'Nombre completo', 'Nome completo', 'Nome completo');
  P('Téléphone', 'Phone', 'Teléfono', 'Telefono', 'Telefone');
  P('Service souhaité', 'Desired service', 'Servicio deseado', 'Servizio desiderato', 'Serviço desejado');
  P('Choisir…', 'Choose…', 'Elegir…', 'Scegli…', 'Escolher…');
  P('Choisir', 'Choose', 'Elegir', 'Scegli', 'Escolher');
  P('Date', 'Date', 'Fecha', 'Data', 'Data');
  P('Heure', 'Time', 'Hora', 'Ora', 'Hora');
  P('Précisions (facultatif)', 'Details (optional)', 'Detalles (opcional)', 'Dettagli (facoltativo)', 'Detalhes (opcional)');
  P('Demande envoyée', 'Request sent', 'Solicitud enviada', 'Richiesta inviata', 'Solicitação enviada');
  P('Nous vous confirmons le rendez-vous très vite.', 'We will confirm your appointment very soon.', 'Confirmaremos tu cita muy pronto.', 'Confermeremo presto il tuo appuntamento.', 'Confirmaremos seu horário em breve.');
  P('Confirmer sur WhatsApp', 'Confirm on WhatsApp', 'Confirmar por WhatsApp', 'Conferma su WhatsApp', 'Confirmar no WhatsApp');
  P('Restez informé', 'Stay informed', 'Mantente informado', 'Resta aggiornato', 'Fique informado');
  P('Recevez nos nouveautés et offres. Pas de spam, désinscription à tout moment.', 'Get our news and offers. No spam, unsubscribe anytime.', 'Recibe novedades y ofertas. Sin spam, cancela cuando quieras.', 'Ricevi novità e offerte. Niente spam, disiscriviti quando vuoi.', 'Receba novidades e ofertas. Sem spam, cancele quando quiser.');
  P('Votre e-mail', 'Your email', 'Tu correo', 'La tua e-mail', 'Seu e-mail');
  P("S'abonner", 'Subscribe', 'Suscribirse', 'Iscriviti', 'Inscrever-se');
  P('Merci, vous êtes inscrit(e).', 'Thank you, you are subscribed.', 'Gracias, ya estás suscrito/a.', 'Grazie, sei iscritto/a.', 'Obrigado, você está inscrito(a).');
  P('Partager ce site', 'Share this site', 'Compartir este sitio', 'Condividi questo sito', 'Compartilhar este site');
  P('Enregistrer le contact', 'Save contact', 'Guardar contacto', 'Salva contatto', 'Salvar contato');
  P('Crée ton propre site →', 'Create your own site →', 'Crea tu propio sitio →', 'Crea il tuo sito →', 'Crie seu próprio site →');
  P('Réponse rapide sur WhatsApp', 'Quick reply on WhatsApp', 'Respuesta rápida por WhatsApp', 'Risposta rapida su WhatsApp', 'Resposta rápida no WhatsApp');
  P('+ Ajouter au panier', '+ Add to cart', '+ Añadir al carrito', '+ Aggiungi al carrello', '+ Adicionar ao carrinho');
  P('Ajouté ✓', 'Added ✓', 'Añadido ✓', 'Aggiunto ✓', 'Adicionado ✓');
  P('Mon panier', 'My cart', 'Mi carrito', 'Il mio carrello', 'Meu carrinho');
  P('Envoyer ma commande sur WhatsApp', 'Send my order on WhatsApp', 'Enviar mi pedido por WhatsApp', 'Invia il mio ordine su WhatsApp', 'Enviar meu pedido no WhatsApp');
  P('Votre nom (facultatif)', 'Your name (optional)', 'Tu nombre (opcional)', 'Il tuo nome (facoltativo)', 'Seu nome (opcional)');
  P('Adresse de livraison ou précision (facultatif)', 'Delivery address or details (optional)', 'Dirección de entrega o detalles (opcional)', 'Indirizzo di consegna o dettagli (facoltativo)', 'Endereço de entrega ou detalhes (opcional)');
  P('Voir', 'View', 'Ver', 'Vedi', 'Ver');
  P('Total', 'Total', 'Total', 'Totale', 'Total');
  P('selon les articles', 'depending on items', 'según los artículos', 'in base agli articoli', 'conforme os itens');
  P('Voir le projet', 'View project', 'Ver proyecto', 'Vedi progetto', 'Ver projeto');
  P('Postuler', 'Apply', 'Postularse', 'Candidati', 'Candidatar-se');
  P('Tout', 'All', 'Todo', 'Tutto', 'Tudo');
  P('Agrandir', 'Enlarge', 'Ampliar', 'Ingrandisci', 'Ampliar');
  P('Fermer', 'Close', 'Cerrar', 'Chiudi', 'Fechar');
  P('Haut de page', 'Back to top', 'Subir', 'Torna su', 'Voltar ao topo');
  P('Retour', 'Back', 'Volver', 'Indietro', 'Voltar');
  P('Navigation', 'Navigation', 'Navegación', 'Navigazione', 'Navegação');
  P('Sections', 'Sections', 'Secciones', 'Sezioni', 'Seções');
  P('Ouvrir le panier', 'Open cart', 'Abrir carrito', 'Apri il carrello', 'Abrir carrinho');
  P('Retirer un', 'Remove one', 'Quitar uno', 'Rimuovi uno', 'Remover um');
  P('Ajouter un', 'Add one', 'Añadir uno', 'Aggiungi uno', 'Adicionar um');
  P('Fermé', 'Closed', 'Cerrado', 'Chiuso', 'Fechado');
  P('Passer une commande', 'Place an order', 'Hacer un pedido', 'Fai un ordine', 'Fazer um pedido');
  P('Service', 'Service', 'Servicio', 'Servizio', 'Serviço');
  P('Lien ou nom du compte', 'Link or account name', 'Enlace o nombre de cuenta', 'Link o nome dell’account', 'Link ou nome da conta');
  P('Quantité', 'Quantity', 'Cantidad', 'Quantità', 'Quantidade');
  P('WhatsApp ou e-mail', 'WhatsApp or email', 'WhatsApp o correo', 'WhatsApp o e-mail', 'WhatsApp ou e-mail');
  P('Total estimé', 'Estimated total', 'Total estimado', 'Totale stimato', 'Total estimado');
  P('Envoyer la demande', 'Send request', 'Enviar solicitud', 'Invia richiesta', 'Enviar solicitação');
  P('Votre demande est transmise au vendeur, qui vous confirme le paiement et le démarrage.', 'Your request goes to the seller, who confirms payment and start.', 'Tu solicitud se envía al vendedor, que confirma el pago y el inicio.', 'La tua richiesta va al venditore, che conferma pagamento e avvio.', 'Sua solicitação vai ao vendedor, que confirma o pagamento e o início.');
  P('Demande envoyée. Le vendeur vous répondra très vite.', 'Request sent. The seller will reply very soon.', 'Solicitud enviada. El vendedor responderá muy pronto.', 'Richiesta inviata. Il venditore risponderà presto.', 'Solicitação enviada. O vendedor responderá em breve.');
  /* messages affichés par la page */
  P('Aperçu : l’envoi est actif sur la page publiée.', 'Preview: sending is active on the published page.', 'Vista previa: el envío funciona en la página publicada.', 'Anteprima: l’invio è attivo sulla pagina pubblicata.', 'Prévia: o envio funciona na página publicada.');
  P('Envoi…', 'Sending…', 'Enviando…', 'Invio…', 'Enviando…');
  P('Connexion impossible, réessayez.', 'Connection failed, please try again.', 'Sin conexión, inténtalo de nuevo.', 'Connessione non riuscita, riprova.', 'Falha na conexão, tente novamente.');
  P('Envoi impossible, réessayez.', 'Could not send, please try again.', 'No se pudo enviar, inténtalo de nuevo.', 'Invio non riuscito, riprova.', 'Não foi possível enviar, tente novamente.');
  P('Remplissez nom, téléphone, date et heure.', 'Fill in name, phone, date and time.', 'Completa nombre, teléfono, fecha y hora.', 'Compila nome, telefono, data e ora.', 'Preencha nome, telefone, data e hora.');
  P('Adresse e-mail invalide.', 'Invalid email address.', 'Correo electrónico no válido.', 'Indirizzo e-mail non valido.', 'E-mail inválido.');
  P('Renseignez votre nom et votre message.', 'Enter your name and your message.', 'Indica tu nombre y tu mensaje.', 'Inserisci nome e messaggio.', 'Informe seu nome e sua mensagem.');
  P('Message envoyé ✓ Nous vous répondons rapidement.', 'Message sent ✓ We will reply quickly.', 'Mensaje enviado ✓ Responderemos pronto.', 'Messaggio inviato ✓ Rispondiamo presto.', 'Mensagem enviada ✓ Responderemos em breve.');
  P('Nom et message requis.', 'Name and message required.', 'Nombre y mensaje obligatorios.', 'Nome e messaggio obbligatori.', 'Nome e mensagem obrigatórios.');
  P('Remplissez le lien, votre nom et votre contact.', 'Fill in the link, your name and your contact.', 'Completa el enlace, tu nombre y tu contacto.', 'Compila link, nome e contatto.', 'Preencha o link, seu nome e seu contato.');
  P('Demande invalide.', 'Invalid request.', 'Solicitud no válida.', 'Richiesta non valida.', 'Solicitação inválida.');
  P('Service non disponible.', 'Service unavailable.', 'Servicio no disponible.', 'Servizio non disponibile.', 'Serviço indisponível.');
  P('Erreur serveur, réessayez.', 'Server error, please try again.', 'Error del servidor, inténtalo de nuevo.', 'Errore del server, riprova.', 'Erro do servidor, tente novamente.');
  P('Trop de demandes, réessayez plus tard.', 'Too many requests, try again later.', 'Demasiadas solicitudes, inténtalo más tarde.', 'Troppe richieste, riprova più tardi.', 'Muitas solicitações, tente mais tarde.');
  /* pastilles de confiance des types de sites */
  [['Commande en ligne', 'Online ordering', 'Pedidos en línea', 'Ordini online', 'Pedidos online'],
   ['Tarifs clairs pour 1000', 'Clear prices per 1000', 'Precios claros por 1000', 'Prezzi chiari per 1000', 'Preços claros por 1000'],
   ['Support WhatsApp', 'WhatsApp support', 'Soporte por WhatsApp', 'Assistenza WhatsApp', 'Suporte no WhatsApp'],
   ['Services professionnels', 'Professional services', 'Servicios profesionales', 'Servizi professionali', 'Serviços profissionais'],
   ['Devis gratuit', 'Free quote', 'Presupuesto gratis', 'Preventivo gratuito', 'Orçamento grátis'],
   ['Nos produits', 'Our products', 'Nuestros productos', 'I nostri prodotti', 'Nossos produtos'],
   ['Commande WhatsApp', 'WhatsApp ordering', 'Pedidos por WhatsApp', 'Ordini su WhatsApp', 'Pedidos no WhatsApp'],
   ['Cuisine maison', 'Home cooking', 'Cocina casera', 'Cucina casalinga', 'Cozinha caseira'],
   ['Réservation facile', 'Easy booking', 'Reserva fácil', 'Prenotazione facile', 'Reserva fácil'],
   ['Travaux récents', 'Recent work', 'Trabajos recientes', 'Lavori recenti', 'Trabalhos recentes'],
   ['Contact direct', 'Direct contact', 'Contacto directo', 'Contatto diretto', 'Contato direto'],
   ['Titres et concerts', 'Tracks and concerts', 'Temas y conciertos', 'Brani e concerti', 'Músicas e shows'],
   ['Booking', 'Booking', 'Contrataciones', 'Booking', 'Contratações'],
   ['Formations', 'Courses', 'Cursos', 'Corsi', 'Cursos'],
   ['Inscriptions ouvertes', 'Enrolment open', 'Inscripciones abiertas', 'Iscrizioni aperte', 'Inscrições abertas'],
   ['Soins et suivi', 'Care and follow-up', 'Atención y seguimiento', 'Cure e follow-up', 'Cuidados e acompanhamento'],
   ['Biens à découvrir', 'Properties to discover', 'Inmuebles por descubrir', 'Immobili da scoprire', 'Imóveis para conhecer'],
   ['Visites sur rendez-vous', 'Visits by appointment', 'Visitas con cita', 'Visite su appuntamento', 'Visitas com hora marcada'],
   ['Moments uniques', 'Unique moments', 'Momentos únicos', 'Momenti unici', 'Momentos únicos'],
   ['Réservez votre date', 'Book your date', 'Reserva tu fecha', 'Prenota la tua data', 'Reserve sua data'],
   ['Communauté', 'Community', 'Comunidad', 'Comunità', 'Comunidade'],
   ['Dons et soutien', 'Donations and support', 'Donaciones y apoyo', 'Donazioni e sostegno', 'Doações e apoio'],
   ['Soins et style', 'Care and style', 'Cuidado y estilo', 'Cura e stile', 'Cuidado e estilo'],
   ['Newsletter', 'Newsletter', 'Boletín', 'Newsletter', 'Newsletter'],
   ['Résultats mesurables', 'Measurable results', 'Resultados medibles', 'Risultati misurabili', 'Resultados mensuráveis'],
   ['Confort 4 étoiles', '4-star comfort', 'Confort 4 estrellas', 'Comfort 4 stelle', 'Conforto 4 estrelas'],
   ['Circuits guidés', 'Guided tours', 'Circuitos guiados', 'Tour guidati', 'Roteiros guiados'],
   ['Devis WhatsApp', 'WhatsApp quote', 'Presupuesto por WhatsApp', 'Preventivo su WhatsApp', 'Orçamento no WhatsApp'],
   ['Rendez-vous atelier', 'Workshop appointments', 'Citas en taller', 'Appuntamenti in officina', 'Agendamento na oficina'],
   ['Coachs diplômés', 'Certified coaches', 'Entrenadores titulados', 'Coach diplomati', 'Treinadores formados'],
   ['Essai gratuit', 'Free trial', 'Prueba gratuita', 'Prova gratuita', 'Aula experimental'],
   ['Conseil confidentiel', 'Confidential advice', 'Asesoría confidencial', 'Consulenza riservata', 'Consultoria confidencial'],
   ['Rapide et sécurisé', 'Fast and secure', 'Rápido y seguro', 'Veloce e sicuro', 'Rápido e seguro'],
   ['Plans flexibles', 'Flexible plans', 'Planes flexibles', 'Piani flessibili', 'Planos flexíveis']
  ].forEach(function (r) { if (!D[r[0]]) P(r[0], r[1], r[2], r[3], r[4]); });
  /* textes propres au type du site (bouton principal, titres, etc.) : fournis par le serveur */
  (function () {
    if (!C.tx || !C.fr) return;
    for (var i = 0; i < C.fr.length; i++) {
      var k = C.fr[i];
      if (!k) continue;
      D[k] = [k, (C.tx.en || [])[i] || k, (C.tx.es || [])[i] || k, (C.tx.it || [])[i] || k, (C.tx.pt || [])[i] || k];
    }
  })();

  var DAYS = { Lun: ['Mon', 'Lun', 'Lun', 'Seg'], Mar: ['Tue', 'Mar', 'Mar', 'Ter'], Mer: ['Wed', 'Mié', 'Mer', 'Qua'], Jeu: ['Thu', 'Jue', 'Gio', 'Qui'], Ven: ['Fri', 'Vie', 'Ven', 'Sex'], Sam: ['Sat', 'Sáb', 'Sab', 'Sáb'], Dim: ['Sun', 'Dom', 'Dom', 'Dom'] };
  var WORDS = { // « aujourd'hui » / « demain » et pluriels
    today: ["aujourd'hui", 'today', 'hoy', 'oggi', 'hoje'], tomorrow: ['demain', 'tomorrow', 'mañana', 'domani', 'amanhã'],
    open: ['Ouvert', 'Open', 'Abierto', 'Aperto', 'Aberto'], closes: ['ferme à', 'closes at', 'cierra a las', 'chiude alle', 'fecha às'], opens: ['ouvre', 'opens', 'abre', 'apre', 'abre'], closed: ['Fermé', 'Closed', 'Cerrado', 'Chiuso', 'Fechado']
  };
  var PLUR = { // [singulier, pluriel] par langue pour « N photos », « N projets »…
    photo: [['photo', 'photos'], ['photo', 'photos'], ['foto', 'fotos'], ['foto', 'foto'], ['foto', 'fotos']],
    projet: [['projet', 'projets'], ['project', 'projects'], ['proyecto', 'proyectos'], ['progetto', 'progetti'], ['projeto', 'projetos']],
    poste: [['poste ouvert', 'postes ouverts'], ['open position', 'open positions'], ['puesto abierto', 'puestos abiertos'], ['posizione aperta', 'posizioni aperte'], ['vaga aberta', 'vagas abertas']],
    pub: [['publication', 'publications'], ['post', 'posts'], ['publicación', 'publicaciones'], ['pubblicazione', 'pubblicazioni'], ['publicação', 'publicações']],
    art: [['article', 'articles'], ['item', 'items'], ['artículo', 'artículos'], ['articolo', 'articoli'], ['item', 'itens']]
  };
  function pl(k, n, li) { var x = PLUR[k][li]; return n + ' ' + (n > 1 ? x[1] : x[0]); }

  /* Traduit un texte français (sans les espaces de bord). Retourne null si rien à traduire. */
  function trCore(t, li) {
    var e = D[t]; if (e) return e[li];
    var m;
    if ((m = /^(\d+) photos?$/.exec(t))) return pl('photo', +m[1], li);
    if ((m = /^(\d+) projets?$/.exec(t))) return pl('projet', +m[1], li);
    if ((m = /^(\d+) postes? ouverts?$/.exec(t))) return pl('poste', +m[1], li);
    if ((m = /^(\d+) publications?$/.exec(t))) return pl('pub', +m[1], li);
    if ((m = /^Panier · (\d+) articles?$/.exec(t))) return [null, 'Cart', 'Carrito', 'Carrello', 'Carrinho'][li] + ' · ' + pl('art', +m[1], li);
    if ((m = /^© (\d{4}) (.*) · Site créé avec$/.exec(t))) return '© ' + m[1] + ' ' + m[2] + ' · ' + [null, 'Site built with', 'Sitio creado con', 'Sito creato con', 'Site criado com'][li];
    if ((m = /^Ouvert · ferme à (.+)$/.exec(t))) return WORDS.open[li] + ' · ' + WORDS.closes[li] + ' ' + m[1];
    if ((m = /^Fermé · ouvre (.+) à (.+)$/.exec(t))) { var w = m[1]; if (w === WORDS.today[0]) w = WORDS.today[li]; else if (w === WORDS.tomorrow[0]) w = WORDS.tomorrow[li]; else if (DAYS[w]) w = DAYS[w][li - 1]; return WORDS.closed[li] + ' · ' + WORDS.opens[li] + ' ' + w + ' ' + [null, 'at', '', 'alle', 'às'][li] + ' ' + m[2]; }
    if ((m = /^dès (.+)$/.exec(t))) return [null, 'from', 'desde', 'da', 'a partir de'][li] + ' ' + m[1];
    if ((m = /^Min (\d+) · Max (.+)$/.exec(t))) return 'Min ' + m[1] + ' · Max ' + m[2];
    if ((m = /^Quantité : entre (\d+) et (\d+)\.$/.exec(t))) return [null, 'Quantity: between ', 'Cantidad: entre ', 'Quantità: tra ', 'Quantidade: entre '][li] + m[1] + [null, ' and ', ' y ', ' e ', ' e '][li] + m[2] + '.';
    return null;
  }
  function tr(raw, li) {
    if (li === 0) return raw;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
    if (!m[2]) return raw;
    var out = trCore(m[2], li);
    return out == null ? raw : m[1] + out + m[3];
  }
  window.cnT = function (txt) { return tr(String(txt), LI[lang] || 0); };

  /* ------------------------------------------------------------------ 2. LANGUE : état + traduction du DOM */
  var lang = 'fr';
  try {
    var qm = /[?&]lang=(fr|en|es|it|pt)\b/.exec(location.search);
    var st = qm ? qm[1] : localStorage.getItem('cn_site_lang');
    if (st && LI[st] !== undefined) lang = st;
  } catch (e) { /* stockage indisponible */ }
  if (lang === 'fr' && C.lang && LI[C.lang] !== undefined && !/[?&]lang=/.test(location.search)) { var stored = null; try { stored = localStorage.getItem('cn_site_lang'); } catch (e) { /* ignore */ } if (!stored) lang = C.lang; }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  var ATTRS = ['placeholder', 'aria-label', 'title'];
  function skipped(n) {
    for (var p = n.parentNode; p && p !== document.body; p = p.parentNode) {
      if (p.nodeType === 1 && (SKIP[p.tagName] || p.hasAttribute('data-nt') || (p.classList && p.classList.contains('cn-rt')))) return true;
    }
    return false;
  }
  function applyNode(n) {
    var cur = n.nodeValue;
    if (n.__tr === undefined || cur !== n.__tr) n.__fr = cur; // texte modifié par la page : nouvelle référence française
    var out = tr(n.__fr, LI[lang]);
    n.__tr = out;
    if (cur !== out) n.nodeValue = out;
  }
  function applyAttrs(el) {
    if (el.nodeType !== 1 || (el.classList && el.classList.contains('cn-rt')) || (el.closest && el.closest('.cn-rt'))) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var m = el.__fa || (el.__fa = {}), cur = el.getAttribute(a);
      if (!m[a] || m[a].tr !== cur) m[a] = { fr: cur, tr: cur };
      var out = tr(m[a].fr, LI[lang]);
      m[a].tr = out;
      if (cur !== out) el.setAttribute(a, out);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.nodeValue.trim() && !skipped(root)) applyNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    var w = document.createTreeWalker(root, 4, null, false), n, list = [];
    while ((n = w.nextNode())) { if (n.nodeValue.trim()) list.push(n); }
    for (var i = 0; i < list.length; i++) if (!skipped(list[i])) applyNode(list[i]);
    var els = (root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label],[title]') : []);
    for (var j = 0; j < els.length; j++) applyAttrs(els[j]);
    if (root.nodeType === 1) applyAttrs(root);
  }
  var pend = [], raf = 0;
  function flush() { raf = 0; var l = pend; pend = []; for (var i = 0; i < l.length; i++) { try { walk(l[i]); } catch (e) { /* page en cours de modification */ } } }
  function startObserver() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') pend.push(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) pend.push(m.addedNodes[j]);
      }
      if (pend.length && !raf) raf = (window.requestAnimationFrame || setTimeout)(flush);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* ------------------------------------------------------------------ 3. TEXTES DE L'INTERFACE DU MOTEUR (connexion, espace propriétaire) */
  var UI = {
    login: ['Connexion', 'Log in', 'Acceder', 'Accedi', 'Entrar'],
    login_sub: ['Connecte-toi pour accéder à ton compte ou à ton espace.', 'Sign in to access your account or your space.', 'Inicia sesión para acceder a tu cuenta o a tu espacio.', 'Accedi per entrare nel tuo account o nel tuo spazio.', 'Entre para acessar sua conta ou seu espaço.'],
    g: ['Continuer avec Google', 'Continue with Google', 'Continuar con Google', 'Continua con Google', 'Continuar com Google'],
    or: ['ou', 'or', 'o', 'oppure', 'ou'],
    email: ['E-mail', 'Email', 'Correo', 'E-mail', 'E-mail'],
    pw: ['Mot de passe', 'Password', 'Contraseña', 'Password', 'Senha'],
    go: ['Se connecter', 'Log in', 'Entrar', 'Accedi', 'Entrar'],
    reg: ['Créer un compte', 'Create an account', 'Crear una cuenta', 'Crea un account', 'Criar uma conta'],
    have: ['J’ai déjà un compte', 'I already have an account', 'Ya tengo cuenta', 'Ho già un account', 'Já tenho conta'],
    mk: ['Créer mon compte', 'Create my account', 'Crear mi cuenta', 'Crea il mio account', 'Criar minha conta'],
    forgot: ['Mot de passe oublié ?', 'Forgot password?', '¿Olvidaste la contraseña?', 'Password dimenticata?', 'Esqueceu a senha?'],
    sent: ['Lien envoyé : vérifie ta boîte mail.', 'Link sent: check your inbox.', 'Enlace enviado: revisa tu correo.', 'Link inviato: controlla la posta.', 'Link enviado: verifique seu e-mail.'],
    e_bad: ['E-mail ou mot de passe incorrect.', 'Wrong email or password.', 'Correo o contraseña incorrectos.', 'E-mail o password errati.', 'E-mail ou senha incorretos.'],
    e_exists: ['Un compte existe déjà avec cet e-mail.', 'An account already exists with this email.', 'Ya existe una cuenta con este correo.', 'Esiste già un account con questa e-mail.', 'Já existe uma conta com este e-mail.'],
    e_weak: ['Mot de passe trop court (6 caractères minimum).', 'Password too short (6 characters minimum).', 'Contraseña demasiado corta (mínimo 6).', 'Password troppo corta (minimo 6).', 'Senha muito curta (mínimo 6).'],
    e_mail: ['Adresse e-mail invalide.', 'Invalid email address.', 'Correo no válido.', 'E-mail non valida.', 'E-mail inválido.'],
    e_net: ['Connexion impossible, vérifie internet.', 'Connection failed, check your internet.', 'Sin conexión, revisa internet.', 'Connessione assente, controlla internet.', 'Sem conexão, verifique a internet.'],
    e_many: ['Trop de tentatives, réessaie plus tard.', 'Too many attempts, try again later.', 'Demasiados intentos, inténtalo más tarde.', 'Troppi tentativi, riprova più tardi.', 'Muitas tentativas, tente mais tarde.'],
    e_need: ['Saisis d’abord ton e-mail.', 'Enter your email first.', 'Escribe primero tu correo.', 'Inserisci prima la tua e-mail.', 'Informe primeiro seu e-mail.'],
    e_req: ['Saisis ton e-mail et ton mot de passe.', 'Enter your email and password.', 'Escribe tu correo y contraseña.', 'Inserisci e-mail e password.', 'Informe e-mail e senha.'],
    logout: ['Déconnexion', 'Log out', 'Cerrar sesión', 'Esci', 'Sair'],
    myspace: ['Mon espace', 'My space', 'Mi espacio', 'Il mio spazio', 'Meu espaço'],
    signed: ['Connecté', 'Signed in', 'Sesión iniciada', 'Connesso', 'Conectado'],
    owner: ['Propriétaire du site', 'Site owner', 'Propietario del sitio', 'Proprietario del sito', 'Dono do site'],
    t_ov: ['Aperçu', 'Overview', 'Resumen', 'Panoramica', 'Resumo'],
    t_leads: ['Demandes', 'Requests', 'Solicitudes', 'Richieste', 'Solicitações'],
    t_edit: ['Réglages', 'Settings', 'Ajustes', 'Impostazioni', 'Ajustes'],
    t_help: ['Aide', 'Help', 'Ayuda', 'Aiuto', 'Ajuda'],
    t_sec: ['Sécurité', 'Security', 'Seguridad', 'Sicurezza', 'Segurança'],
    hello: ['Bonjour', 'Hello', 'Hola', 'Ciao', 'Olá'],
    welcome: ['Voici l’activité de ton site.', 'Here is your site activity.', 'Esta es la actividad de tu sitio.', 'Ecco l’attività del tuo sito.', 'Esta é a atividade do seu site.'],
    v30: ['Visites (30 jours)', 'Visits (30 days)', 'Visitas (30 días)', 'Visite (30 giorni)', 'Visitas (30 dias)'],
    act: ['Actions de contact', 'Contact actions', 'Acciones de contacto', 'Azioni di contatto', 'Ações de contato'],
    newq: ['Nouvelles demandes', 'New requests', 'Solicitudes nuevas', 'Nuove richieste', 'Novas solicitações'],
    msgs: ['Messages reçus', 'Messages received', 'Mensajes recibidos', 'Messaggi ricevuti', 'Mensagens recebidas'],
    appts: ['Rendez-vous', 'Appointments', 'Citas', 'Appuntamenti', 'Agendamentos'],
    subs: ['Abonnés newsletter', 'Newsletter subscribers', 'Suscriptores', 'Iscritti newsletter', 'Inscritos newsletter'],
    seeSite: ['Voir mon site', 'View my site', 'Ver mi sitio', 'Vedi il mio sito', 'Ver meu site'],
    editApp: ['Modifier dans l’application', 'Edit in the app', 'Editar en la aplicación', 'Modifica nell’app', 'Editar no aplicativo'],
    copy: ['Copier le lien', 'Copy link', 'Copiar enlace', 'Copia link', 'Copiar link'],
    copied: ['Lien copié ✓', 'Link copied ✓', 'Enlace copiado ✓', 'Link copiato ✓', 'Link copiado ✓'],
    unpub: ['Ton site n’est pas public : active le Pack Pro dans l’application pour le publier.', 'Your site is not public: activate the Pro Pack in the app to publish it.', 'Tu sitio no es público: activa el Pack Pro en la aplicación para publicarlo.', 'Il tuo sito non è pubblico: attiva il Pack Pro nell’app per pubblicarlo.', 'Seu site não é público: ative o Pack Pro no aplicativo para publicá-lo.'],
    all: ['Tout', 'All', 'Todo', 'Tutto', 'Tudo'],
    l_appt: ['Rendez-vous', 'Appointments', 'Citas', 'Appuntamenti', 'Agendamentos'],
    l_msg: ['Messages', 'Messages', 'Mensajes', 'Messaggi', 'Mensagens'],
    l_news: ['Abonnés', 'Subscribers', 'Suscriptores', 'Iscritti', 'Inscritos'],
    empty: ['Aucune demande pour le moment.', 'No requests yet.', 'Aún no hay solicitudes.', 'Nessuna richiesta per ora.', 'Nenhuma solicitação por enquanto.'],
    st_new: ['Nouveau', 'New', 'Nuevo', 'Nuovo', 'Novo'],
    st_confirmed: ['Confirmé', 'Confirmed', 'Confirmado', 'Confermato', 'Confirmado'],
    st_done: ['Traité', 'Done', 'Atendido', 'Gestito', 'Concluído'],
    st_cancelled: ['Annulé', 'Cancelled', 'Cancelado', 'Annullato', 'Cancelado'],
    a_confirm: ['Confirmer', 'Confirm', 'Confirmar', 'Conferma', 'Confirmar'],
    a_done: ['Marquer traité', 'Mark as done', 'Marcar atendido', 'Segna come gestito', 'Marcar concluído'],
    a_cancel: ['Annuler', 'Cancel', 'Cancelar', 'Annulla', 'Cancelar'],
    a_del: ['Supprimer', 'Delete', 'Eliminar', 'Elimina', 'Excluir'],
    del_q: ['Supprimer cette demande ?', 'Delete this request?', '¿Eliminar esta solicitud?', 'Eliminare questa richiesta?', 'Excluir esta solicitação?'],
    call: ['Appeler', 'Call', 'Llamar', 'Chiama', 'Ligar'],
    wa: ['WhatsApp', 'WhatsApp', 'WhatsApp', 'WhatsApp', 'WhatsApp'],
    reply: ['Répondre par e-mail', 'Reply by email', 'Responder por correo', 'Rispondi via e-mail', 'Responder por e-mail'],
    ed_title: ['Informations du site', 'Site information', 'Información del sitio', 'Informazioni del sito', 'Informações do site'],
    f_tagline: ['Slogan', 'Tagline', 'Eslogan', 'Slogan', 'Slogan'],
    f_announcement: ['Bandeau d’annonce', 'Announcement banner', 'Banner de anuncio', 'Banner di annuncio', 'Faixa de aviso'],
    f_hours: ['Horaires', 'Opening hours', 'Horarios', 'Orari', 'Horários'],
    f_address: ['Adresse', 'Address', 'Dirección', 'Indirizzo', 'Endereço'],
    f_contactPhone: ['Téléphone', 'Phone', 'Teléfono', 'Telefono', 'Telefone'],
    f_contactWhatsapp: ['WhatsApp (avec indicatif)', 'WhatsApp (with country code)', 'WhatsApp (con prefijo)', 'WhatsApp (con prefisso)', 'WhatsApp (com DDI)'],
    f_contactEmail: ['E-mail de contact', 'Contact email', 'Correo de contacto', 'E-mail di contatto', 'E-mail de contato'],
    f_aboutText: ['À propos / présentation', 'About / presentation', 'Acerca de / presentación', 'Chi siamo / presentazione', 'Sobre / apresentação'],
    save: ['Enregistrer', 'Save', 'Guardar', 'Salva', 'Salvar'],
    saved: ['Modifications enregistrées ✓', 'Changes saved ✓', 'Cambios guardados ✓', 'Modifiche salvate ✓', 'Alterações salvas ✓'],
    ed_note: ['Les changements apparaissent sur ton site d’ici quelques minutes. Pour les photos, le design et les services, utilise l’application.', 'Changes appear on your site within a few minutes. For photos, design and services, use the app.', 'Los cambios aparecen en tu sitio en unos minutos. Para fotos, diseño y servicios, usa la aplicación.', 'Le modifiche appaiono sul sito entro pochi minuti. Per foto, design e servizi usa l’app.', 'As alterações aparecem no site em alguns minutos. Para fotos, design e serviços, use o aplicativo.'],
    h_title: ['Aide pour mon site', 'Help for my site', 'Ayuda para mi sitio', 'Aiuto per il mio sito', 'Ajuda para o meu site'],
    h_intro: ['Écris ici ce dont ton site a besoin : modification, nom de domaine, paiement, problème… L’équipe te répond ici et par notification.', 'Write here what your site needs: changes, domain name, payment, a problem… The team replies here and by notification.', 'Escribe aquí lo que necesita tu sitio: cambios, dominio, pago, un problema… El equipo responde aquí y por notificación.', 'Scrivi qui di cosa ha bisogno il tuo sito: modifiche, dominio, pagamento, problemi… Il team risponde qui e con una notifica.', 'Escreva aqui o que seu site precisa: alterações, domínio, pagamento, um problema… A equipe responde aqui e por notificação.'],
    cat_modification: ['Modification du site', 'Site change', 'Cambio en el sitio', 'Modifica del sito', 'Alteração no site'],
    cat_domaine: ['Nom de domaine', 'Domain name', 'Nombre de dominio', 'Nome di dominio', 'Nome de domínio'],
    cat_paiement: ['Paiement / abonnement', 'Payment / subscription', 'Pago / suscripción', 'Pagamento / abbonamento', 'Pagamento / assinatura'],
    cat_bug: ['Problème technique', 'Technical problem', 'Problema técnico', 'Problema tecnico', 'Problema técnico'],
    cat_autre: ['Autre demande', 'Other request', 'Otra solicitud', 'Altra richiesta', 'Outro pedido'],
    h_ph: ['Décris ce que tu veux…', 'Describe what you need…', 'Describe lo que necesitas…', 'Descrivi di cosa hai bisogno…', 'Descreva o que você precisa…'],
    h_send: ['Envoyer', 'Send', 'Enviar', 'Invia', 'Enviar'],
    h_sent: ['Message envoyé ✓', 'Message sent ✓', 'Mensaje enviado ✓', 'Messaggio inviato ✓', 'Mensagem enviada ✓'],
    h_empty: ['Aucun message pour le moment.', 'No messages yet.', 'Aún no hay mensajes.', 'Nessun messaggio per ora.', 'Nenhuma mensagem por enquanto.'],
    h_you: ['Toi', 'You', 'Tú', 'Tu', 'Você'],
    h_team: ['Équipe Coeurnoh', 'Coeurnoh team', 'Equipo Coeurnoh', 'Team Coeurnoh', 'Equipe Coeurnoh'],
    h_open: ['En attente de réponse', 'Waiting for a reply', 'Esperando respuesta', 'In attesa di risposta', 'Aguardando resposta'],
    h_answered: ['Répondu', 'Answered', 'Respondido', 'Risposto', 'Respondido'],
    h_closed: ['Résolu', 'Resolved', 'Resuelto', 'Risolto', 'Resolvido'],
    h_short: ['Écris ton message (3 caractères minimum).', 'Write your message (3 characters minimum).', 'Escribe tu mensaje (mínimo 3 caracteres).', 'Scrivi il messaggio (minimo 3 caratteri).', 'Escreva sua mensagem (mínimo 3 caracteres).'],
    s_title: ['Sécurité du compte', 'Account security', 'Seguridad de la cuenta', 'Sicurezza dell’account', 'Segurança da conta'],
    s1: ['Ton espace est protégé par ta connexion : seul le compte propriétaire y accède, vérifié côté serveur à chaque action.', 'Your space is protected by your login: only the owner account can enter, checked on the server for every action.', 'Tu espacio está protegido por tu sesión: solo la cuenta propietaria entra, verificado en el servidor en cada acción.', 'Il tuo spazio è protetto dal login: solo l’account proprietario può entrare, verificato sul server a ogni azione.', 'Seu espaço é protegido pelo login: só a conta dona entra, verificado no servidor a cada ação.'],
    s2: ['Choisis un mot de passe long et unique et ne le partage jamais : l’équipe ne te le demandera jamais.', 'Choose a long, unique password and never share it: the team will never ask for it.', 'Elige una contraseña larga y única y no la compartas: el equipo nunca la pedirá.', 'Scegli una password lunga e unica e non condividerla: il team non te la chiederà mai.', 'Escolha uma senha longa e única e nunca a compartilhe: a equipe nunca a pedirá.'],
    s3: ['Les messages de tes visiteurs sont stockés sur des serveurs sécurisés ; les formulaires sont protégés contre le spam et les robots.', 'Your visitors’ messages are stored on secure servers; forms are protected against spam and bots.', 'Los mensajes de tus visitantes se guardan en servidores seguros; los formularios están protegidos contra spam y robots.', 'I messaggi dei visitatori sono su server sicuri; i moduli sono protetti da spam e bot.', 'As mensagens dos visitantes ficam em servidores seguros; os formulários são protegidos contra spam e robôs.'],
    s4: ['Ton site est servi en HTTPS : les données échangées sont chiffrées.', 'Your site is served over HTTPS: exchanged data is encrypted.', 'Tu sitio se sirve por HTTPS: los datos se cifran.', 'Il sito usa HTTPS: i dati sono cifrati.', 'Seu site usa HTTPS: os dados são criptografados.'],
    s5: ['En cas de doute, change ton mot de passe et écris-nous dans l’onglet Aide.', 'If in doubt, change your password and write to us in the Help tab.', 'Si dudas, cambia tu contraseña y escríbenos en la pestaña Ayuda.', 'In caso di dubbio cambia la password e scrivici nella scheda Aiuto.', 'Em caso de dúvida, troque a senha e escreva na aba Ajuda.'],
    s_reset: ['Changer mon mot de passe par e-mail', 'Change my password by email', 'Cambiar mi contraseña por correo', 'Cambia la password via e-mail', 'Trocar minha senha por e-mail'],
    s_logout: ['Me déconnecter', 'Log me out', 'Cerrar mi sesión', 'Disconnettimi', 'Sair da conta'],
    close: ['Fermer', 'Close', 'Cerrar', 'Chiudi', 'Fechar'],
    loading: ['Chargement…', 'Loading…', 'Cargando…', 'Caricamento…', 'Carregando…'],
    err: ['Une erreur est survenue, réessaie.', 'Something went wrong, try again.', 'Ocurrió un error, inténtalo de nuevo.', 'Si è verificato un errore, riprova.', 'Ocorreu um erro, tente novamente.'],
    need_login: ['Connecte-toi d’abord.', 'Please log in first.', 'Inicia sesión primero.', 'Accedi prima.', 'Entre primeiro.'],
    pv: ['Aperçu : la connexion est active sur le site publié.', 'Preview: login is active on the published site.', 'Vista previa: el acceso funciona en el sitio publicado.', 'Anteprima: il login è attivo sul sito pubblicato.', 'Prévia: o login funciona no site publicado.'],
    t_pub: ['Publier', 'Publish', 'Publicar', 'Pubblica', 'Publicar'],
    pub_title: ['Publier sur ton site', 'Publish on your site', 'Publica en tu sitio', 'Pubblica sul tuo sito', 'Publique no seu site'],
    pub_intro: ['Ajoute des photos, des vidéos, des documents PDF ou des articles. Ils apparaissent sur ton site dès que tu publies.', 'Add photos, videos, PDF documents or articles. They appear on your site as soon as you publish.', 'Añade fotos, vídeos, documentos PDF o artículos. Aparecen en tu sitio en cuanto publicas.', 'Aggiungi foto, video, documenti PDF o articoli. Compaiono sul tuo sito appena pubblichi.', 'Adicione fotos, vídeos, documentos PDF ou artigos. Eles aparecem no seu site assim que você publica.'],
    pub_article: ['Écrire un article', 'Write an article', 'Escribir un artículo', 'Scrivi un articolo', 'Escrever um artigo'],
    pub_article_s: ['Texte + photo', 'Text + photo', 'Texto + foto', 'Testo + foto', 'Texto + foto'],
    pub_photo: ['Ajouter des photos', 'Add photos', 'Añadir fotos', 'Aggiungi foto', 'Adicionar fotos'],
    pub_photo_s: ['Galerie du site', 'Site gallery', 'Galería del sitio', 'Galleria del sito', 'Galeria do site'],
    pub_video: ['Ajouter une vidéo', 'Add a video', 'Añadir un vídeo', 'Aggiungi un video', 'Adicionar um vídeo'],
    pub_video_s: ['MP4 · 100 Mo max', 'MP4 · 100 MB max', 'MP4 · 100 MB máx.', 'MP4 · 100 MB max', 'MP4 · 100 MB máx.'],
    pub_doc: ['Ajouter un document', 'Add a document', 'Añadir un documento', 'Aggiungi un documento', 'Adicionar um documento'],
    pub_doc_s: ['PDF, Word, Excel…', 'PDF, Word, Excel…', 'PDF, Word, Excel…', 'PDF, Word, Excel…', 'PDF, Word, Excel…'],
    pub_a_t: ['Titre de l’article', 'Article title', 'Título del artículo', 'Titolo dell’articolo', 'Título do artigo'],
    pub_a_b: ['Écris ton texte ici…', 'Write your text here…', 'Escribe tu texto aquí…', 'Scrivi qui il tuo testo…', 'Escreva seu texto aqui…'],
    pub_a_img: ['Ajouter une photo (facultatif)', 'Add a photo (optional)', 'Añadir una foto (opcional)', 'Aggiungi una foto (facoltativo)', 'Adicionar uma foto (opcional)'],
    pub_go: ['Publier maintenant', 'Publish now', 'Publicar ahora', 'Pubblica ora', 'Publicar agora'],
    pub_cancel: ['Annuler', 'Cancel', 'Cancelar', 'Annulla', 'Cancelar'],
    pub_up: ['Envoi en cours…', 'Uploading…', 'Enviando…', 'Caricamento…', 'Enviando…'],
    pub_ok: ['Publié ! Ton site est à jour.', 'Published! Your site is up to date.', '¡Publicado! Tu sitio está actualizado.', 'Pubblicato! Il tuo sito è aggiornato.', 'Publicado! Seu site está atualizado.'],
    pub_see: ['Voir sur mon site', 'See it on my site', 'Verlo en mi sitio', 'Vedi sul mio sito', 'Ver no meu site'],
    pub_big: ['Fichier trop lourd :', 'File too large:', 'Archivo demasiado grande:', 'File troppo grande:', 'Arquivo muito grande:'],
    pub_type: ['Type de fichier non accepté.', 'File type not accepted.', 'Tipo de archivo no aceptado.', 'Tipo di file non accettato.', 'Tipo de arquivo não aceito.'],
    pub_err: ['Envoi impossible, vérifie ta connexion.', 'Upload failed, check your connection.', 'No se pudo enviar, revisa tu conexión.', 'Caricamento non riuscito, controlla la connessione.', 'Falha no envio, verifique sua conexão.'],
    pub_none: ['Rien de publié pour l’instant.', 'Nothing published yet.', 'Aún no hay nada publicado.', 'Ancora nulla di pubblicato.', 'Nada publicado ainda.'],
    pub_done_h: ['Déjà publié sur ton site', 'Already on your site', 'Ya publicado en tu sitio', 'Già sul tuo sito', 'Já no seu site'],
    pub_l_art: ['Articles', 'Articles', 'Artículos', 'Articoli', 'Artigos'],
    pub_l_img: ['Photos', 'Photos', 'Fotos', 'Foto', 'Fotos'],
    pub_l_vid: ['Vidéos', 'Videos', 'Vídeos', 'Video', 'Vídeos'],
    pub_l_doc: ['Documents', 'Documents', 'Documentos', 'Documenti', 'Documentos'],
    pub_del: ['Retirer ceci de ton site ?', 'Remove this from your site?', '¿Quitar esto de tu sitio?', 'Rimuovere questo dal tuo sito?', 'Remover isto do seu site?'],
    pub_short: ['Écris un titre et un texte.', 'Write a title and some text.', 'Escribe un título y un texto.', 'Scrivi un titolo e un testo.', 'Escreva um título e um texto.'],
    pub_ready: ['Ajouter à la publication', 'Add to the post', 'Añadir a la publicación', 'Aggiungi alla pubblicazione', 'Adicionar à publicação'],
    live: ['En ligne', 'Online', 'En línea', 'Online', 'No ar'],
    draft: ['Brouillon', 'Draft', 'Borrador', 'Bozza', 'Rascunho'],
    quick: ['Actions rapides', 'Quick actions', 'Acciones rápidas', 'Azioni rapide', 'Ações rápidas'],
    st_title: ['Contenu d’exemple', 'Sample content', 'Contenido de ejemplo', 'Contenuto di esempio', 'Conteúdo de exemplo'],
    st_txt: ['Ton site démarre avec des textes et des illustrations du modèle. Remplace-les par les tiens : photos, services, prix.', 'Your site starts with texts and illustrations from the template. Replace them with your own: photos, services, prices.', 'Tu sitio empieza con textos e ilustraciones de la plantilla. Sustitúyelos por los tuyos: fotos, servicios, precios.', 'Il tuo sito parte con testi e illustrazioni del modello. Sostituiscili con i tuoi: foto, servizi, prezzi.', 'Seu site começa com textos e ilustrações do modelo. Substitua pelos seus: fotos, serviços, preços.'],
    st_ok: ['J’ai compris', 'Got it', 'Entendido', 'Ho capito', 'Entendi'],
    seed_h: ['Contenu du modèle', 'Template content', 'Contenido de la plantilla', 'Contenuto del modello', 'Conteúdo do modelo'],
    seed_b: ['Remplir avec le contenu du modèle', 'Fill with the template content', 'Rellenar con el contenido de la plantilla', 'Compila con il contenuto del modello', 'Preencher com o conteúdo do modelo'],
    seed_t: ['Ajoute des textes, des services et des illustrations d’exemple sur les parties vides de ton site. Ton travail n’est jamais écrasé.', 'Adds sample texts, services and illustrations to the empty parts of your site. Your own work is never overwritten.', 'Añade textos, servicios e ilustraciones de ejemplo en las partes vacías de tu sitio. Tu trabajo nunca se sobrescribe.', 'Aggiunge testi, servizi e illustrazioni di esempio nelle parti vuote del sito. Il tuo lavoro non viene mai sovrascritto.', 'Adiciona textos, serviços e ilustrações de exemplo nas partes vazias do seu site. Seu trabalho nunca é sobrescrito.'],
    seed_ok: ['Contenu du modèle ajouté ✓', 'Template content added ✓', 'Contenido de la plantilla añadido ✓', 'Contenuto del modello aggiunto ✓', 'Conteúdo do modelo adicionado ✓'],
    art_t: ['Illustrations du modèle tant que je n’ai pas mes propres photos', 'Template illustrations until I add my own photos', 'Ilustraciones de la plantilla hasta que añada mis fotos', 'Illustrazioni del modello finché non aggiungo le mie foto', 'Ilustrações do modelo até eu adicionar minhas fotos'],
    ed_more: ['Photos, design et services : ouvre l’application.', 'Photos, design and services: open the app.', 'Fotos, diseño y servicios: abre la aplicación.', 'Foto, design e servizi: apri l’app.', 'Fotos, design e serviços: abra o aplicativo.'],
    lang_t: ['Langue', 'Language', 'Idioma', 'Lingua', 'Idioma']
  };
  function U(k) { var e = UI[k]; return e ? (e[LI[lang]] || e[0]) : k; }

  /* ------------------------------------------------------------------ 4. OUTILS DOM (jamais d'innerHTML avec du texte venant d'un utilisateur) */
  function E(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function A(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function icon(path, size) {
    var s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size || 18); s.setAttribute('height', size || 18);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', path); s.appendChild(p); return s;
  }
  var IC = {
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3 4.5 6.5 4.5 10S15 19 12 22c-3-3-4.5-6.5-4.5-10S9 5 12 2z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    x: 'M18 6 6 18M6 6l12 12',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
    home: 'M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5',
    plus: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v8M8 12h8',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    chat: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
    video: 'M23 7l-7 5 7 5V7zM3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
    ext: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
    check: 'M20 6L9 17l-5-5',
    copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z',
    app: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2'
  };
  function toast(msg) {
    var t = document.getElementById('cn-rt-toast');
    if (!t) { t = E('div', 'cn-rt cn-t'); t.id = 'cn-rt-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'cn-rt cn-t show'; clearTimeout(t.__h); t.__h = setTimeout(function () { t.className = 'cn-rt cn-t'; }, 3400);
  }
  function fmtDate(iso) { try { return new Date(iso).toLocaleString(({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', pt: 'pt-BR' })[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(iso || '').slice(0, 16); } }

  var CSS = '' +
    '.cn-rt,.cn-rt *{box-sizing:border-box}' +
    '.cn-tools{display:flex;align-items:center;gap:8px;margin-left:auto;position:relative;z-index:30}' +
    '@media(min-width:860px){.cn-tools{margin-left:12px}}' +
    '.cn-tools.cn-float{position:fixed;top:10px;right:10px;z-index:90}' +
    '.cn-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 11px;border-radius:999px;border:1px solid rgba(100,116,139,.45);background:rgba(255,255,255,.55);color:#334155;font:700 .8rem/1 inherit;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.cn-btn:hover{border-color:var(--accent,#2563eb);color:var(--accent,#2563eb)}' +
    '.cn-btn.pri{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}' +
    '.cn-btn.pri:hover{color:#fff;filter:brightness(1.08)}' +
    '.cn-btn .dot{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 2px #fff}' +
    '.tpl-dark .cn-btn{background:rgba(255,255,255,.08);color:#e2e8f0;border-color:rgba(255,255,255,.25)}' +
    '@media(max-width:520px){.cn-btn .t{display:none}.cn-btn{padding:0 10px}.cn-btn.keep .t{display:inline}}' +
    '.cn-pop{position:absolute;right:0;top:44px;min-width:190px;background:var(--card,#fff);color:var(--ink,#0f172a);border:1px solid var(--border,#e4e8ef);border-radius:14px;box-shadow:0 18px 50px -12px rgba(15,23,42,.35);padding:6px;display:none;z-index:95}' +
    '.cn-pop.open{display:block}' +
    '.cn-pop button,.cn-pop a{display:flex;width:100%;align-items:center;gap:8px;text-align:left;border:0;background:none;color:inherit;font:600 .88rem inherit;font-family:inherit;padding:10px 12px;border-radius:9px;cursor:pointer;text-decoration:none}' +
    '.cn-pop button:hover,.cn-pop a:hover{background:var(--accent-soft,rgba(37,99,235,.1))}' +
    '.cn-pop button.on{color:var(--accent,#2563eb)}' +
    '.cn-pop .who{padding:8px 12px 6px;font-size:.76rem;color:var(--muted,#5b6678);word-break:break-all}' +
    '.cn-fab{position:fixed;left:14px;bottom:14px;z-index:60;box-shadow:0 12px 30px -10px rgba(0,0,0,.45);height:44px;padding:0 16px}' +
    '.cn-ov{position:fixed;inset:0;z-index:200;background:rgba(2,6,23,.55);display:flex;align-items:flex-end;justify-content:center;animation:cnfade .18s}' +
    '@keyframes cnfade{from{opacity:0}to{opacity:1}}' +
    '.cn-sheet{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#0f172a);border-radius:22px 22px 0 0;padding:18px 18px 22px;font-family:inherit;-webkit-overflow-scrolling:touch}' +
    '@media(min-width:640px){.cn-ov{align-items:center}.cn-sheet{border-radius:22px}}' +
    '.cn-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}' +
    '.cn-hd h2{font-size:1.2rem;margin:0}' +
    '.cn-x{border:0;background:var(--accent-soft,#eef2ff);color:var(--ink,#0f172a);width:34px;height:34px;border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}' +
    '.cn-p{color:var(--muted,#5b6678);font-size:.88rem;margin:6px 0 12px}' +
    '.cn-in{width:100%;font:inherit;font-size:.95rem;color:var(--ink,#0f172a);background:var(--bg,#f6f8fb);border:1px solid var(--border,#e4e8ef);border-radius:12px;padding:12px 13px;margin:0 0 10px;outline:none}' +
    '.cn-in:focus{border-color:var(--accent,#2563eb)}' +
    'textarea.cn-in{resize:vertical;min-height:90px}' +
    '.cn-b{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:1px solid var(--border,#e4e8ef);background:var(--card,#fff);color:var(--ink,#0f172a);font:700 .92rem inherit;font-family:inherit;padding:12px 14px;border-radius:12px;cursor:pointer;margin:0 0 10px;text-decoration:none}' +
    '.cn-b.p{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}' +
    '.cn-b.s{width:auto;display:inline-flex;padding:8px 12px;font-size:.8rem;margin:0}' +
    '.cn-b[disabled]{opacity:.6;cursor:default}' +
    '.cn-err{color:#b42318;font-size:.84rem;min-height:1.1em;margin:0 0 8px}' +
    '.cn-ok{color:#166534}' +
    '.cn-l{font-size:.78rem;font-weight:700;color:var(--muted,#5b6678);display:block;margin:0 0 4px}' +
    '.cn-link{color:var(--accent,#2563eb);cursor:pointer;font-weight:700;text-decoration:underline;background:none;border:0;font:inherit;padding:0}' +
    '.cn-os{position:fixed;inset:0;z-index:210;background:var(--bg,#f6f8fb);color:var(--ink,#0f172a);display:flex;flex-direction:column;font-family:inherit}' +
    '.cn-os-h{display:flex;align-items:center;gap:12px;padding:max(12px,env(safe-area-inset-top)) 14px 12px;border-bottom:1px solid var(--border,#e4e8ef);background:var(--card,#fff)}' +
    '.cn-av{flex:0 0 auto;width:44px;height:44px;border-radius:13px;background:var(--accent,#2563eb);background-image:linear-gradient(135deg,rgba(255,255,255,.28),rgba(0,0,0,.18));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15rem;overflow:hidden}' +
    '.cn-av img{width:100%;height:100%;object-fit:cover}' +
    '.cn-os-h .tt{flex:1;min-width:0}.cn-os-h b{display:block;font-size:1.04rem;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cn-os-h small{display:flex;align-items:center;gap:6px;color:var(--muted,#5b6678);font-size:.76rem;margin-top:2px}' +
    '.cn-pill{display:inline-flex;align-items:center;gap:5px;font-size:.66rem;font-weight:800;letter-spacing:.02em;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e}' +
    '.cn-pill.live{background:#dcfce7;color:#166534}.cn-pill.live:before{content:"";width:6px;height:6px;border-radius:50%;background:#16a34a}' +
    '.cn-nav{display:flex;gap:2px;padding:6px 6px max(6px,env(safe-area-inset-bottom));background:var(--card,#fff);border-top:1px solid var(--border,#e4e8ef)}' +
    '.cn-tab{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:none;color:var(--muted,#5b6678);font:700 .68rem/1.1 inherit;font-family:inherit;padding:4px 2px;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}' +
    '.cn-tab .ic{display:flex;align-items:center;justify-content:center;width:52px;height:30px;border-radius:999px;transition:background .15s,color .15s}' +
    '.cn-tab span.l{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.cn-tab.on{color:var(--accent,#2563eb)}.cn-tab.on .ic{background:var(--accent-soft,#e8efff)}' +
    '.cn-tab .dot{position:absolute;top:2px;left:calc(50% + 10px);width:9px;height:9px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 2px var(--card,#fff)}' +
    '.cn-os-b{flex:1;overflow:auto;padding:16px 14px 24px;-webkit-overflow-scrolling:touch}' +
    '.cn-wrap{max-width:720px;margin:0 auto}' +
    '.cn-wrap h3{font-size:1.25rem;margin:0 0 2px;letter-spacing:-.01em}' +
    '.cn-h4{font-size:.74rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#5b6678);margin:20px 0 8px}' +
    '.cn-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0}' +
    '@media(min-width:640px){.cn-grid{grid-template-columns:repeat(3,1fr)}}' +
    '.cn-card{background:var(--card,#fff);border:1px solid var(--border,#e4e8ef);border-radius:18px;padding:15px;box-shadow:0 8px 24px -18px rgba(15,23,42,.35)}' +
    '.cn-card b.n{display:block;font-size:1.75rem;line-height:1.1;letter-spacing:-.02em}' +
    '.cn-card span.k{color:var(--muted,#5b6678);font-size:.78rem;font-weight:600}' +
    '.cn-card.link{cursor:pointer;transition:transform .12s,border-color .12s}.cn-card.link:hover{border-color:var(--accent,#2563eb)}.cn-card.link:active{transform:scale(.98)}' +
    '.cn-hero{background:linear-gradient(135deg,var(--accent,#2563eb),color-mix(in srgb,var(--accent,#2563eb) 55%,#000));color:#fff;border:0;border-radius:22px;padding:18px;margin:0 0 12px}' +
    '.cn-hero h3{color:#fff;margin:0 0 4px}.cn-hero p{margin:0 0 14px;opacity:.88;font-size:.88rem}' +
    '.cn-url{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.16);border-radius:12px;padding:8px 8px 8px 12px;font-size:.82rem;font-weight:600}' +
    '.cn-url span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cn-url button{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border:0;border-radius:9px;background:#fff;color:#0f172a;font:700 .76rem inherit;font-family:inherit;padding:7px 10px;cursor:pointer}' +
    '.cn-warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:14px;padding:12px 14px;font-size:.86rem;margin:10px 0}' +
    '.cn-note{display:flex;gap:12px;align-items:flex-start;background:var(--accent-soft,#eef2ff);border:1px solid var(--border,#e4e8ef);border-radius:16px;padding:14px;margin:0 0 12px}' +
    '.cn-note>svg{flex:0 0 auto;color:var(--accent,#2563eb);margin-top:2px}.cn-note b{display:block;font-size:.92rem;margin-bottom:2px}.cn-note p{margin:0 0 8px;font-size:.84rem;color:var(--muted,#5b6678)}' +
    '.cn-acts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:14px 0}' +
    '.cn-act{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px;border-radius:18px;border:1px solid var(--border,#e4e8ef);background:var(--card,#fff);color:inherit;font:inherit;font-family:inherit;text-align:left;cursor:pointer;position:relative;text-decoration:none;transition:transform .12s,border-color .12s;-webkit-tap-highlight-color:transparent}' +
    '.cn-act:hover{border-color:var(--accent,#2563eb)}.cn-act:active{transform:scale(.97)}.cn-act[disabled]{opacity:.55;cursor:default;pointer-events:none}' +
    '.cn-act i{width:42px;height:42px;border-radius:13px;background:var(--accent-soft,#e8efff);color:var(--accent,#2563eb);display:flex;align-items:center;justify-content:center}' +
    '.cn-act b{font-size:.92rem;line-height:1.2}.cn-act small{color:var(--muted,#5b6678);font-size:.74rem;margin-top:-6px}' +
    '.cn-act input[type=file]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0}' +
    '.cn-act.on{border-color:var(--accent,#2563eb);box-shadow:0 0 0 2px var(--accent-soft,#e8efff)}' +
    '.cn-bar{height:8px;border-radius:99px;background:var(--accent-soft,#e8efff);overflow:hidden;margin:8px 0 0}.cn-bar i{display:block;height:100%;width:0;background:var(--accent,#2563eb);border-radius:99px;transition:width .2s}' +
    '.cn-ok-card{display:flex;gap:12px;align-items:center;background:#ecfdf3;border:1px solid #abefc6;color:#067647;border-radius:16px;padding:12px 14px;margin:0 0 12px;font-size:.88rem;font-weight:700}' +
    '.cn-ok-card>span{flex:1}.cn-ok-card .cn-b{width:auto;margin:0;flex:0 0 auto;border-color:#067647;background:#067647;color:#fff;padding:8px 12px;font-size:.8rem}' +
    '.cn-row{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--border,#e4e8ef);border-radius:14px;background:var(--card,#fff);margin:0 0 8px}' +
    '.cn-row .th{flex:0 0 auto;width:52px;height:52px;border-radius:11px;background:var(--accent-soft,#e8efff);color:var(--accent,#2563eb);display:flex;align-items:center;justify-content:center;overflow:hidden}.cn-row .th img{width:100%;height:100%;object-fit:cover}' +
    '.cn-row .m{flex:1;min-width:0}.cn-row .m b{display:block;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cn-row .m small{color:var(--muted,#5b6678);font-size:.74rem}' +
    '.cn-ib{flex:0 0 auto;width:36px;height:36px;border-radius:10px;border:1px solid var(--border,#e4e8ef);background:var(--card,#fff);color:var(--muted,#5b6678);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.cn-ib:hover{color:#b42318;border-color:#fda29b}' +
    '.cn-pg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 8px}@media(min-width:560px){.cn-pg{grid-template-columns:repeat(5,1fr)}}' +
    '.cn-pg div{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--accent-soft,#e8efff)}.cn-pg img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.cn-pg button{position:absolute;top:5px;right:5px;width:28px;height:28px;border-radius:50%;border:0;background:rgba(15,23,42,.72);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}' +
    '.cn-prev{width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin:0 0 10px;display:block}' +
    '.cn-chips{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 12px}' +
    '.cn-chip{border:1px solid var(--border,#e4e8ef);background:var(--card,#fff);color:var(--ink,#0f172a);border-radius:999px;padding:7px 13px;font:700 .78rem inherit;font-family:inherit;cursor:pointer}' +
    '.cn-chip.on{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}' +
    '.cn-lead{margin:0 0 10px}.cn-lead h4{margin:0 0 4px;font-size:.98rem}.cn-lead p{margin:3px 0;font-size:.86rem;color:var(--muted,#5b6678);word-break:break-word}' +
    '.cn-lead .row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
    '.cn-tag{display:inline-block;font-size:.7rem;font-weight:800;padding:3px 8px;border-radius:999px;background:var(--accent-soft,#eef2ff);color:var(--accent,#2563eb);margin-right:6px}' +
    '.cn-tag.new{background:#fee2e2;color:#b91c1c}.cn-tag.ok{background:#dcfce7;color:#166534}.cn-tag.no{background:#e5e7eb;color:#4b5563}' +
    '.cn-bub{max-width:86%;padding:10px 12px;border-radius:14px;margin:0 0 8px;font-size:.9rem;white-space:pre-wrap;word-break:break-word}' +
    '.cn-bub small{display:block;opacity:.7;font-size:.7rem;margin-bottom:3px;font-weight:700}' +
    '.cn-bub.me{margin-left:auto;background:var(--accent,#2563eb);color:#fff}' +
    '.cn-bub.ad{background:var(--card,#fff);border:1px solid var(--border,#e4e8ef)}' +
    '.cn-sec{display:flex;gap:10px;align-items:flex-start;margin:0 0 10px;font-size:.88rem}.cn-sec svg{flex:0 0 auto;color:var(--accent,#2563eb);margin-top:2px}' +
    '.cn-sw{display:flex;gap:10px;align-items:flex-start;font-size:.86rem;margin:4px 0 12px}.cn-sw input{margin-top:3px;width:18px;height:18px;accent-color:var(--accent,#2563eb)}' +
    '.cn-t{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(20px);z-index:300;max-width:90%;background:#0f172a;color:#fff;padding:11px 16px;border-radius:12px;font:600 .86rem system-ui;opacity:0;pointer-events:none;transition:.25s}' +
    '.cn-t.show{opacity:1;transform:translateX(-50%) translateY(0)}' +
    '.cn-spark{width:100%;height:70px;display:block}';
  function injectCss() { var s = E('style'); s.id = 'cn-rt-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ------------------------------------------------------------------ 5. FIREBASE (chargé seulement si besoin) */
  var auth = null, user = null, fbState = 0, fbCbs = [], isOwner = false, ownerBadge = false;
  function loadScript(src, cb) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = function () { cb(); }; s.onerror = function () { cb(new Error('load')); }; document.head.appendChild(s); }
  function loadFb(cb) {
    if (auth) { cb(auth); return; }
    fbCbs.push(cb); if (fbState) return; fbState = 1;
    function done(a) { var l = fbCbs; fbCbs = []; fbState = a ? 2 : 0; l.forEach(function (f) { f(a); }); }
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', function (e1) {
      if (e1) return done(null);
      loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', function (e2) {
        if (e2) return done(null);
        try {
          var cfg = { apiKey: 'AIzaSyAK9j8lmKlxp267bfwKegKgW54fo_jrS9E', authDomain: 'coeurnohboost.firebaseapp.com', projectId: 'coeurnohboost', storageBucket: 'coeurnohboost.firebasestorage.app', messagingSenderId: '295783149587', appId: '1:295783149587:web:13aec67a2ae0109eaa4fe6' };
          var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          if (ios && location.hostname === 'coeurnohuniverse.com') cfg.authDomain = location.hostname;
          if (!firebase.apps.length) firebase.initializeApp(cfg);
          auth = firebase.auth();
          auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () { });
          auth.onAuthStateChanged(function (u) { user = u; onUser(); });
          done(auth);
        } catch (e) { done(null); }
      });
    });
  }
  // Vrai si le navigateur garde déjà une session (compte de l'application) : on charge alors Firebase en arrière-plan.
  function hasStoredAuth(cb) {
    try {
      if (!window.indexedDB) return cb(false);
      var req = indexedDB.open('firebaseLocalStorageDb'), existed = true;
      req.onupgradeneeded = function (ev) { existed = false; try { ev.target.transaction.abort(); } catch (e) { /* ignore */ } };
      req.onerror = function () { cb(false); };
      req.onsuccess = function () {
        try {
          var db = req.result;
          if (!existed || !db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); return cb(false); }
          var c = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').count();
          c.onsuccess = function () { db.close(); cb(c.result > 0); };
          c.onerror = function () { db.close(); cb(false); };
        } catch (e) { cb(false); }
      };
    } catch (e) { cb(false); }
  }
  function call(action, body) {
    return new Promise(function (resolve, reject) {
      if (!auth || !auth.currentUser) { reject(new Error(U('need_login'))); return; }
      auth.currentUser.getIdToken().then(function (t) {
        var b = body || {}; b.action = action;
        return fetch('/api/render-site', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify(b) });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (r.ok && j && j.success !== false) resolve(j); else reject(new Error((j && j.error) ? (window.cnT ? window.cnT(j.error) : j.error) : U('err'))); });
      }).catch(function (e) { reject(e && e.message ? e : new Error(U('e_net'))); });
    });
  }

  /* ------------------------------------------------------------------ 6. BARRE D'OUTILS : langue + connexion + « Mon espace » */
  var tools, langBtn, langPop, accBtn, accPop, fab;
  function closePops() { if (langPop) langPop.classList.remove('open'); if (accPop) accPop.classList.remove('open'); }
  function buildTools() {
    var row = document.querySelector('.topbar-row');
    tools = E('div', 'cn-rt cn-tools'); if (!row) tools.className += ' cn-float';
    langBtn = E('button', 'cn-btn'); langBtn.type = 'button'; langBtn.setAttribute('aria-haspopup', 'true');
    langPop = E('div', 'cn-pop'); langPop.setAttribute('role', 'menu');
    var lw = E('div'); lw.style.position = 'relative'; A(lw, langBtn, langPop);
    langBtn.onclick = function (e) { e.stopPropagation(); var o = langPop.classList.contains('open'); closePops(); if (!o) langPop.classList.add('open'); };
    A(tools, lw);
    if (!(C.preview && !C.sample)) {
      accBtn = E('button', 'cn-btn'); accBtn.type = 'button'; accBtn.setAttribute('aria-haspopup', 'true');
      accPop = E('div', 'cn-pop');
      var aw = E('div'); aw.style.position = 'relative'; A(aw, accBtn, accPop);
      accBtn.onclick = function (e) {
        e.stopPropagation();
        if (!user) { openLogin(); return; }
        var o = accPop.classList.contains('open'); closePops(); if (!o) { drawAccPop(); accPop.classList.add('open'); }
      };
      A(tools, aw);
    }
    if (row) row.appendChild(tools); else document.body.appendChild(tools);
    document.addEventListener('click', closePops);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePops(); });
    drawLang(); drawAcc();
  }
  function drawLang() {
    if (!langBtn) return;
    langBtn.textContent = ''; A(langBtn, icon(IC.globe, 16), E('span', 't', lang.toUpperCase()));
    langBtn.setAttribute('aria-label', U('lang_t') + ' : ' + lang.toUpperCase());
    langBtn.querySelector('.t').style.display = 'inline';
    langPop.textContent = '';
    LANGS.forEach(function (l) {
      var b = E('button', l[0] === lang ? 'on' : '', l[1]); b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.onclick = function () { setLang(l[0]); closePops(); };
      langPop.appendChild(b);
    });
  }
  function drawAcc() {
    if (!accBtn) return;
    accBtn.textContent = ''; accBtn.className = 'cn-btn';
    if (!user) { A(accBtn, icon(IC.user, 16), E('span', 't', U('login'))); accBtn.setAttribute('aria-label', U('login')); }
    else if (isOwner) { accBtn.className = 'cn-btn pri keep'; A(accBtn, icon(IC.grid, 16), E('span', 't', U('myspace')), ownerBadge ? E('i', 'dot') : null); accBtn.setAttribute('aria-label', U('myspace')); }
    else { var ini = E('span', 't', (user.displayName || user.email || '?').trim().charAt(0).toUpperCase()); ini.style.display = 'inline'; A(accBtn, icon(IC.user, 16), ini); accBtn.setAttribute('aria-label', U('signed')); }
    if (fab) { fab.textContent = ''; A(fab, icon(IC.grid, 18), E('span', '', U('myspace')), ownerBadge ? E('i', 'dot') : null); }
  }
  function drawAccPop() {
    accPop.textContent = '';
    A(accPop, E('div', 'who', (user && (user.email || user.displayName)) || ''));
    if (isOwner) { var s = E('button', '', U('myspace')); s.type = 'button'; s.onclick = function () { closePops(); openSpace(); }; accPop.appendChild(s); }
    var o = E('button', '', U('logout')); o.type = 'button'; o.onclick = function () { closePops(); if (auth) auth.signOut(); }; accPop.appendChild(o);
  }
  function setLang(l) {
    if (LI[l] === undefined) return;
    lang = l; try { localStorage.setItem('cn_site_lang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l;
    walk(document.body);
    drawLang(); drawAcc();
    if (spaceOpen) renderSpace();
    try { window.dispatchEvent(new CustomEvent('cnlang', { detail: l })); } catch (e) { /* ignore */ }
  }
  function onUser() {
    isOwner = !!(user && C.kind === 'site' && C.id && user.uid === C.id && !C.sample);
    ownerBadge = false;
    drawAcc();
    if (isOwner) {
      if (!fab) { fab = E('button', 'cn-rt cn-btn pri cn-fab keep'); fab.type = 'button'; fab.onclick = openSpace; document.body.appendChild(fab); drawAcc(); }
      call('site_owner_overview', {}).then(function (j) { ownerBadge = !!((j.leads && j.leads.fresh) || (j.help && j.help.unread)); drawAcc(); }).catch(function () { });
      if (/[?&]espace=1\b/.test(location.search) && !spaceOpen && !autoOpened) { autoOpened = true; openSpace(); }
    } else if (fab) { fab.remove(); fab = null; }
  }
  var autoOpened = false;

  /* ------------------------------------------------------------------ 7. CONNEXION */
  function overlay() {
    var o = E('div', 'cn-rt cn-ov'); o.onclick = function (e) { if (e.target === o) o.remove(); };
    var s = E('div', 'cn-sheet'); o.appendChild(s); document.body.appendChild(o);
    return { o: o, s: s };
  }
  function openLogin() {
    if (C.sample) { toast(U('pv')); return; }
    var reg = false, ov = overlay(), s = ov.s;
    var hd = E('div', 'cn-hd'), h2 = E('h2', '', U('login')), x = E('button', 'cn-x'); x.type = 'button'; x.setAttribute('aria-label', U('close')); x.appendChild(icon(IC.x, 16)); x.onclick = function () { ov.o.remove(); };
    A(hd, h2, x); A(s, hd, E('p', 'cn-p', U('login_sub')));
    var g = E('button', 'cn-b', U('g')); g.type = 'button';
    var em = E('input', 'cn-in'); em.type = 'email'; em.placeholder = U('email'); em.autocomplete = 'email';
    var pw = E('input', 'cn-in'); pw.type = 'password'; pw.placeholder = U('pw'); pw.autocomplete = 'current-password';
    var err = E('p', 'cn-err'), go = E('button', 'cn-b p', U('go')); go.type = 'button';
    var sw = E('button', 'cn-link', U('reg')); sw.type = 'button'; var fp = E('button', 'cn-link', U('forgot')); fp.type = 'button';
    var links = E('p', 'cn-p'); links.style.textAlign = 'center'; A(links, sw, document.createTextNode('  ·  '), fp);
    var orp = E('p', 'cn-p', U('or')); orp.style.textAlign = 'center';
    A(s, g, orp, em, pw, err, go, links);
    function fail(e) {
      var c = (e && e.code) || ''; err.className = 'cn-err';
      err.textContent = /wrong-password|invalid-credential|user-not-found/.test(c) ? U('e_bad') : /email-already/.test(c) ? U('e_exists') : /weak-password/.test(c) ? U('e_weak') : /invalid-email/.test(c) ? U('e_mail') : /popup-closed|cancelled/.test(c) ? '' : /network/.test(c) ? U('e_net') : /too-many/.test(c) ? U('e_many') : U('err');
      go.disabled = false;
    }
    function ready(fn) { loadFb(function (a) { if (!a) { err.className = 'cn-err'; err.textContent = U('e_net'); return; } fn(a); }); }
    g.onclick = function () {
      err.textContent = '';
      ready(function (a) {
        var pr = new firebase.auth.GoogleAuthProvider();
        var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        var p = ios ? a.signInWithRedirect(pr) : a.signInWithPopup(pr).then(function () { ov.o.remove(); });
        p.catch(function (e) { if (e && /popup-blocked/.test(e.code || '')) a.signInWithRedirect(pr); else fail(e); });
      });
    };
    sw.onclick = function () { reg = !reg; h2.textContent = reg ? U('reg') : U('login'); go.textContent = reg ? U('mk') : U('go'); sw.textContent = reg ? U('have') : U('reg'); pw.autocomplete = reg ? 'new-password' : 'current-password'; };
    fp.onclick = function () {
      var v = em.value.trim(); if (!v) { err.className = 'cn-err'; err.textContent = U('e_need'); return; }
      ready(function (a) { a.sendPasswordResetEmail(v).then(function () { err.className = 'cn-err cn-ok'; err.textContent = U('sent'); }).catch(fail); });
    };
    go.onclick = function () {
      var v = em.value.trim(), p = pw.value; err.className = 'cn-err'; err.textContent = '';
      if (!v || !p) { err.textContent = U('e_req'); return; }
      go.disabled = true;
      ready(function (a) { (reg ? a.createUserWithEmailAndPassword(v, p) : a.signInWithEmailAndPassword(v, p)).then(function () { ov.o.remove(); }).catch(fail); });
    };
  }

  /* ------------------------------------------------------------------ 8. ESPACE PROPRIÉTAIRE */
  var spaceOpen = false, spaceEl = null, tab = 'ov', ovData = null, leadsData = null, leadFilter = 'all', helpData = null;
  var dirty = false, pubMode = '', pubBusy = false, pubFlash = '', progBar = null, progTxt = null, draft = { t: '', b: '' };
  var TABS = ['ov', 'pub', 'leads', 'edit', 'help'];
  var TAB_IC = { ov: 'home', pub: 'plus', leads: 'inbox', edit: 'sliders', help: 'chat' };
  var CLOUD = { name: 'aqe4fxh4', preset: 'coeurnoh_universe' };
  var LIMIT_MB = { image: 10, video: 100, file: 25 };
  var ACCEPT = { image: 'image/jpeg,image/png,image/webp,image/gif', video: 'video/*', file: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip' };
  var FILE_RE = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)$/i;

  function slugOf() { return C.slug || (ovData && ovData.site.slug) || ''; }
  function openSpace() {
    if (!isOwner) return;
    if (spaceEl) spaceEl.remove();
    spaceEl = E('div', 'cn-rt cn-os'); spaceEl.setAttribute('role', 'dialog'); spaceEl.setAttribute('aria-modal', 'true');
    document.body.appendChild(spaceEl); document.documentElement.style.overflow = 'hidden'; spaceOpen = true;
    ovData = null; leadsData = null; helpData = null; tab = 'ov'; pubMode = ''; pubFlash = '';
    var tm = /[?&]tab=(\w+)/.exec(location.search);
    if (tm) { var tt = tm[1] === 'sec' ? 'edit' : tm[1]; if (TABS.indexOf(tt) >= 0) tab = tt; }
    renderSpace(); loadTab();
  }
  // Après une publication, la page du site derrière l'espace est périmée : on la recharge à jour (adresse « fresh », jamais comptée comme visite).
  function freshUrl(hash) { return '/s/' + encodeURIComponent(slugOf()) + '?fresh=' + Date.now() + (hash || ''); }
  function closeSpace() {
    if (spaceEl) spaceEl.remove(); spaceEl = null; spaceOpen = false; document.documentElement.style.overflow = '';
    if (dirty && !C.preview) { dirty = false; location.href = freshUrl(''); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && spaceOpen && !pubBusy) closeSpace(); });
  function viewSite(hash) {
    if (dirty) { dirty = false; location.href = freshUrl(hash); return; }
    closeSpace();
    var el = hash ? document.querySelector(hash) : null;
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0 });
  }
  function goTab(k) { tab = k; renderSpace(); loadTab(); }

  function renderSpace() {
    if (!spaceEl) return;
    var keep = spaceEl.querySelector('.cn-os-b'), top = keep ? keep.scrollTop : 0;
    spaceEl.textContent = '';
    var st = ovData && ovData.site, nm = (st && st.businessName) || C.name || U('myspace');
    var h = E('div', 'cn-os-h'), tt = E('div', 'tt'), av = E('div', 'cn-av', (nm || 'A').trim().charAt(0).toUpperCase());
    var sub = E('small'); if (st) sub.appendChild(E('span', 'cn-pill' + (st.published ? ' live' : ''), st.published ? U('live') : U('draft'))); sub.appendChild(E('span', '', U('owner')));
    A(tt, E('b', '', nm), sub);
    var x = E('button', 'cn-x'); x.type = 'button'; x.setAttribute('aria-label', U('close')); x.appendChild(icon(IC.x, 16)); x.onclick = function () { if (pubBusy) return; closeSpace(); };
    A(h, av, tt, x);
    var body = E('div', 'cn-os-b'), wrap = E('div', 'cn-wrap'); body.appendChild(wrap);
    var nav = E('div', 'cn-nav'); nav.setAttribute('role', 'tablist');
    TABS.forEach(function (k) {
      var b = E('button', 'cn-tab' + (k === tab ? ' on' : '')); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === tab ? 'true' : 'false');
      var ic = E('span', 'ic'); ic.appendChild(icon(IC[TAB_IC[k]], 20)); A(b, ic, E('span', 'l', U('t_' + k)));
      if ((k === 'leads' && ovData && ovData.leads.fresh) || (k === 'help' && ovData && ovData.help.unread && k !== tab)) b.appendChild(E('i', 'dot'));
      b.onclick = function () { if (pubBusy) return; goTab(k); };
      nav.appendChild(b);
    });
    A(spaceEl, h, body, nav);
    drawTab(wrap);
    if (top) body.scrollTop = top;
  }
  function loading(w) { w.appendChild(E('p', 'cn-p', U('loading'))); }
  function drawTab(w) {
    if (tab === 'ov') return ovData ? drawOv(w) : loading(w);
    if (tab === 'pub') return ovData ? drawPub(w) : loading(w);
    if (tab === 'leads') return leadsData ? drawLeads(w) : loading(w);
    if (tab === 'edit') return ovData ? drawEdit(w) : loading(w);
    return helpData ? drawHelp(w) : loading(w);
  }
  function loadTab() {
    var need = null;
    if ((tab === 'ov' || tab === 'edit' || tab === 'pub') && !ovData) need = call('site_owner_overview', {}).then(function (j) { ovData = j; });
    else if (tab === 'leads' && !leadsData) need = call('leads_list', { kind: 'site' }).then(function (j) { leadsData = j.items || []; if (!ovData) return call('site_owner_overview', {}).then(function (o) { ovData = o; }); });
    else if (tab === 'help' && !helpData) need = call('site_help_thread', {}).then(function (j) { helpData = j; if (ovData) ovData.help.unread = false; });
    if (!need) return;
    need.then(function () { if (spaceOpen) renderSpace(); }).catch(function (e) { toast(e.message || U('err')); });
  }

  function statCard(n, k, onclick) { var c = E('div', 'cn-card' + (onclick ? ' link' : '')); A(c, E('b', 'n', String(n)), E('span', 'k', k)); if (onclick) c.onclick = onclick; return c; }
  function spark(series) {
    var svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'cn-spark'); svg.setAttribute('viewBox', '0 0 300 70'); svg.setAttribute('preserveAspectRatio', 'none');
    var max = 1; series.forEach(function (r) { if (r.view > max) max = r.view; });
    var pts = series.map(function (r, i) { return (i * 300 / Math.max(1, series.length - 1)).toFixed(1) + ',' + (64 - r.view / max * 56).toFixed(1); }).join(' ');
    var area = document.createElementNS(SVGNS, 'polygon'); area.setAttribute('points', '0,70 ' + pts + ' 300,70'); area.setAttribute('fill', 'currentColor'); area.setAttribute('opacity', '.12');
    var line = document.createElementNS(SVGNS, 'polyline'); line.setAttribute('points', pts); line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-width', '2.5'); line.setAttribute('stroke-linejoin', 'round');
    A(svg, area, line); return svg;
  }
  function copyLink(url) { try { navigator.clipboard.writeText(url).then(function () { toast(U('copied')); }, function () { toast(url); }); } catch (e) { toast(url); } }
  function actTile(ic, title, sub, fn, href, tag) {
    var t = E(href ? 'a' : (tag || 'button'), 'cn-act'); if (!href && !tag) t.type = 'button'; else if (href) t.href = href;
    var i = E('i'); i.appendChild(icon(IC[ic], 22)); A(t, i, E('b', '', title)); if (sub) t.appendChild(E('small', '', sub));
    if (fn) t.onclick = fn; return t;
  }
  function doSeed(btn) {
    btn.disabled = true;
    call('site_owner_seed', {}).then(function () { dirty = true; ovData = null; toast(U('seed_ok')); renderSpace(); loadTab(); }).catch(function (e) { btn.disabled = false; toast(e.message); });
  }
  function drawOv(w) {
    var d = ovData, st = d.site, url = location.origin + '/s/' + st.slug;
    var hero = E('div', 'cn-card cn-hero');
    var first = user && user.displayName ? ' ' + user.displayName.split(' ')[0] : '';
    A(hero, E('h3', '', U('hello') + first + ' 👋'), E('p', '', U('welcome')));
    var u = E('div', 'cn-url'), cp = E('button'); cp.type = 'button'; cp.appendChild(icon(IC.copy, 14)); cp.appendChild(document.createTextNode(U('copy'))); cp.onclick = function () { copyLink(url); };
    A(u, E('span', '', url.replace(/^https?:\/\//, '')), cp); hero.appendChild(u); w.appendChild(hero);
    if (!st.published) w.appendChild(E('div', 'cn-warn', U('unpub')));
    if (d.starter && !d.starter.dismissed) {
      var n = E('div', 'cn-note'), nb = E('div'), ok = E('button', 'cn-b s', U('st_ok')); ok.type = 'button';
      ok.onclick = function () { ok.disabled = true; call('site_owner_update', { starterDismiss: true }).then(function () { d.starter.dismissed = true; renderSpace(); }).catch(function (e) { ok.disabled = false; toast(e.message); }); };
      A(nb, E('b', '', U('st_title')), E('p', '', U('st_txt')), ok); A(n, icon(IC.spark, 20), nb); w.appendChild(n);
    }
    if (!d.art && !d.starter) {
      var n2 = E('div', 'cn-note'), b2 = E('div'), sb = E('button', 'cn-b s', U('seed_b')); sb.type = 'button'; sb.onclick = function () { doSeed(sb); };
      A(b2, E('b', '', U('seed_h')), E('p', '', U('seed_t')), sb); A(n2, icon(IC.spark, 20), b2); w.appendChild(n2);
    }
    var g = E('div', 'cn-grid');
    A(g, statCard(d.stats ? d.stats.total.view : st.viewsCount, U('v30')), statCard(d.stats ? d.stats.actions : 0, U('act')),
      statCard(d.leads.fresh, U('newq'), function () { tab = 'leads'; renderSpace(); loadTab(); }),
      statCard(d.leads.message, U('msgs'), function () { tab = 'leads'; leadFilter = 'message'; renderSpace(); loadTab(); }),
      statCard(d.leads.appointment, U('appts'), function () { tab = 'leads'; leadFilter = 'appointment'; renderSpace(); loadTab(); }),
      statCard(d.leads.newsletter, U('subs'), function () { tab = 'leads'; leadFilter = 'newsletter'; renderSpace(); loadTab(); }));
    w.appendChild(g);
    if (d.stats && d.stats.series && d.stats.series.length) { var c = E('div', 'cn-card'); c.style.color = 'var(--accent,#2563eb)'; A(c, E('span', 'k', U('v30')), spark(d.stats.series)); w.appendChild(c); }
    w.appendChild(E('div', 'cn-h4', U('quick')));
    var q = E('div', 'cn-acts');
    A(q, actTile('plus', U('t_pub'), U('pub_article_s').split(' + ')[0] + ' · ' + U('pub_l_img') + ' · ' + U('pub_l_vid'), function () { goTab('pub'); }),
      actTile('ext', U('seeSite'), '', function () { viewSite(''); }),
      actTile('app', U('editApp'), '', null, '/?mysite=1&edit=1'),
      actTile('chat', U('t_help'), '', function () { goTab('help'); }));
    // Le lien « application » doit sortir de la fenêtre d'aperçu de l'application (il y est parfois ouvert dans un cadre).
    q.children[2].target = '_top';
    w.appendChild(q);
  }

  function tagFor(l) { var s = l.status || 'new'; return E('span', 'cn-tag ' + (s === 'new' ? 'new' : s === 'cancelled' ? 'no' : 'ok'), U('st_' + s)); }
  function digits(v) { return String(v || '').replace(/[^0-9]/g, ''); }
  function leadAction(l, label, status) {
    var b = E('button', 'cn-b s', label); b.type = 'button';
    b.onclick = function () { b.disabled = true; call('leads_update', { leadId: l.id, status: status }).then(function () { l.status = status; renderSpace(); }).catch(function (e) { b.disabled = false; toast(e.message); }); };
    return b;
  }
  function drawLeads(w) {
    var chips = E('div', 'cn-chips');
    [['all', 'all'], ['appointment', 'l_appt'], ['message', 'l_msg'], ['newsletter', 'l_news']].forEach(function (c) {
      var b = E('button', 'cn-chip' + (leadFilter === c[0] ? ' on' : ''), U(c[1])); b.type = 'button';
      b.onclick = function () { leadFilter = c[0]; renderSpace(); }; chips.appendChild(b);
    });
    w.appendChild(chips);
    var list = leadsData.filter(function (l) { return leadFilter === 'all' || l.type === leadFilter; });
    if (!list.length) { w.appendChild(E('p', 'cn-p', U('empty'))); return; }
    list.forEach(function (l) {
      var c = E('div', 'cn-card cn-lead');
      var head = E('h4', '', l.type === 'newsletter' ? (l.email || '') : (l.name || '—'));
      A(c, A(E('div'), tagFor(l), E('span', 'cn-tag', U(l.type === 'appointment' ? 'l_appt' : l.type === 'message' ? 'l_msg' : 'l_news')), E('small', '', fmtDate(l.createdAt))), head);
      if (l.type === 'appointment') { A(c, E('p', '', (l.phone || '') + (l.service ? ' · ' + l.service : '')), E('p', '', l.date + ' · ' + l.time)); if (l.message) c.appendChild(E('p', '', l.message)); }
      if (l.type === 'message') { if (l.contact) c.appendChild(E('p', '', l.contact)); c.appendChild(E('p', '', l.message || '')); }
      var row = E('div', 'row');
      var ph = l.type === 'appointment' ? l.phone : (l.type === 'message' && digits(l.contact).length >= 6 && l.contact.indexOf('@') < 0 ? l.contact : '');
      if (ph) {
        var a1 = E('a', 'cn-b s', U('call')); a1.href = 'tel:' + String(ph).replace(/[^0-9+]/g, '');
        var a2 = E('a', 'cn-b s', U('wa')); a2.href = 'https://wa.me/' + digits(ph); a2.target = '_blank'; a2.rel = 'noopener'; A(row, a1, a2);
      }
      var mail = l.type === 'newsletter' ? l.email : (l.type === 'message' && l.contact && l.contact.indexOf('@') > 0 ? l.contact : '');
      if (mail) { var a3 = E('a', 'cn-b s', U('reply')); a3.href = 'mailto:' + mail; row.appendChild(a3); }
      if (l.type === 'appointment') { if (l.status !== 'confirmed') row.appendChild(leadAction(l, U('a_confirm'), 'confirmed')); if (l.status !== 'done') row.appendChild(leadAction(l, U('a_done'), 'done')); if (l.status !== 'cancelled') row.appendChild(leadAction(l, U('a_cancel'), 'cancelled')); }
      else if (l.type === 'message' && l.status !== 'done') row.appendChild(leadAction(l, U('a_done'), 'done'));
      var del = E('button', 'cn-b s', U('a_del')); del.type = 'button';
      del.onclick = function () { if (!confirm(U('del_q'))) return; call('leads_update', { leadId: l.id, op: 'delete' }).then(function () { leadsData = leadsData.filter(function (x) { return x.id !== l.id; }); renderSpace(); }).catch(function (e) { toast(e.message); }); };
      row.appendChild(del); c.appendChild(row); w.appendChild(c);
    });
  }

  /* ---------- Publier : photos, vidéos, documents, articles (envoi Cloudinary, comme dans l'application) ---------- */
  function shrink(file) {
    return new Promise(function (res) {
      if (!/^image\/(jpeg|webp)$/.test(file.type) || file.size < 600 * 1024) { res(file); return; }
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        try {
          var s = Math.min(1, 1800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          c.toBlob(function (b) { URL.revokeObjectURL(url); res(b && b.size < file.size ? b : file); }, 'image/jpeg', 0.84);
        } catch (e) { URL.revokeObjectURL(url); res(file); }
      };
      im.onerror = function () { URL.revokeObjectURL(url); res(file); }; im.src = url;
    });
  }
  function cloud(kind, blob, name, folder) {
    return new Promise(function (resolve, reject) {
      var fd = new FormData(); fd.append('file', blob, name); fd.append('upload_preset', CLOUD.preset); fd.append('folder', folder);
      var x = new XMLHttpRequest(); x.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUD.name + '/' + (kind === 'file' ? 'raw' : kind) + '/upload', true);
      x.upload.onprogress = function (e) { if (e.lengthComputable) setProg(Math.round(e.loaded / e.total * 100)); };
      x.onload = function () { var j = null; try { j = JSON.parse(x.responseText); } catch (e) { /* ignore */ } if (x.status >= 200 && x.status < 300 && j && j.secure_url) resolve(j.secure_url); else reject(new Error(U('pub_err'))); };
      x.onerror = function () { reject(new Error(U('pub_err'))); };
      x.send(fd);
    });
  }
  function setProg(pct, label) { if (progBar) progBar.style.width = pct + '%'; if (label != null && progTxt) progTxt.textContent = label; }
  function checkFile(kind, f) {
    var ok = kind === 'image' ? /^image\/(jpeg|png|webp|gif)$/.test(f.type) : kind === 'video' ? /^video\//.test(f.type) : FILE_RE.test(f.name);
    if (!ok) return U('pub_type');
    if (f.size > LIMIT_MB[kind] * 1024 * 1024) return U('pub_big') + ' ' + LIMIT_MB[kind] + ' MB';
    return '';
  }
  function uploadMedia(kind, list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length || pubBusy) return;
    pubBusy = true; pubFlash = ''; renderSpace();
    var n = files.length, added = 0, chain = Promise.resolve();
    files.forEach(function (f, i) {
      chain = chain.then(function () {
        var bad = checkFile(kind, f); if (bad) { toast(f.name + ' — ' + bad); return; }
        setProg(0, (n > 1 ? (i + 1) + '/' + n + ' · ' : '') + f.name);
        return (kind === 'image' ? shrink(f) : Promise.resolve(f)).then(function (blob) { return cloud(kind, blob, f.name, 'sites/media'); })
          .then(function (url) { return call('site_owner_media_add', { type: kind, url: url, name: f.name }); })
          .then(function (r) { if (r && r.item) ovData.media.push(r.item); added++; dirty = true; });
      });
    });
    chain.then(function () { if (added) { pubFlash = kind === 'image' ? '#site-sec-gallery' : kind === 'video' ? '#site-sec-videos' : '#site-sec-docs'; toast(U('pub_ok')); } })
      .catch(function (e) { toast(e.message || U('pub_err')); })
      .then(function () { pubBusy = false; progBar = progTxt = null; if (spaceOpen) renderSpace(); });
  }
  function publishArticle(ti, bo, fileInput, btn) {
    var title = ti.value.trim(), text = bo.value.trim();
    if (title.length < 2 || text.length < 2) { toast(U('pub_short')); return; }
    var f = fileInput.files && fileInput.files[0];
    if (f) { var bad = checkFile('image', f); if (bad) { toast(bad); return; } }
    pubBusy = true; btn.disabled = true; renderSpace();
    setProg(0, title);
    (f ? shrink(f).then(function (b) { return cloud('image', b, f.name, 'sites/articles'); }) : Promise.resolve(''))
      .then(function (url) { return call('site_owner_post_add', { title: title, body: text, imageUrl: url || undefined }); })
      .then(function (r) { if (r && r.post) ovData.posts.push(r.post); dirty = true; pubMode = ''; draft = { t: '', b: '' }; pubFlash = '#site-sec-blog'; toast(U('pub_ok')); })
      .catch(function (e) { toast(e.message || U('pub_err')); })
      .then(function () { pubBusy = false; progBar = progTxt = null; if (spaceOpen) renderSpace(); });
  }
  function pickTile(kind, ic, title, sub) {
    var t = actTile(ic, title, sub, null, null, 'div'), inp = E('input'); inp.type = 'file'; inp.accept = ACCEPT[kind]; if (kind !== 'video') inp.multiple = true; inp.setAttribute('aria-label', title);
    inp.onchange = function () { var l = inp.files; uploadMedia(kind, l); };
    t.appendChild(inp); if (pubBusy) t.setAttribute('disabled', ''); return t;
  }
  function drawComposer(w) {
    var c = E('div', 'cn-card'); c.style.margin = '0 0 12px';
    var ti = E('input', 'cn-in'); ti.type = 'text'; ti.maxLength = 100; ti.placeholder = U('pub_a_t'); ti.value = draft.t; ti.oninput = function () { draft.t = ti.value; };
    var bo = E('textarea', 'cn-in'); bo.maxLength = 1500; bo.rows = 6; bo.placeholder = U('pub_a_b'); bo.value = draft.b; bo.oninput = function () { draft.b = bo.value; };
    var fi = E('input'); fi.type = 'file'; fi.accept = ACCEPT.image; fi.style.display = 'none';
    var pv = E('img', 'cn-prev'); pv.alt = ''; pv.style.display = 'none';
    var pick = E('button', 'cn-b'); pick.type = 'button'; pick.appendChild(icon(IC.image, 18)); pick.appendChild(document.createTextNode(U('pub_a_img')));
    pick.onclick = function () { fi.click(); };
    fi.onchange = function () { var f = fi.files && fi.files[0]; if (f && /^image\//.test(f.type)) { pv.src = URL.createObjectURL(f); pv.style.display = 'block'; } else { pv.style.display = 'none'; } };
    var go = E('button', 'cn-b p', U('pub_go')); go.type = 'button'; go.onclick = function () { publishArticle(ti, bo, fi, go); };
    var no = E('button', 'cn-b', U('pub_cancel')); no.type = 'button'; no.onclick = function () { pubMode = ''; renderSpace(); };
    A(c, ti, bo, pv, pick, fi, go, no);
    if (pubBusy) { go.disabled = true; no.disabled = true; }
    w.appendChild(c);
  }
  function mediaOf(t) { return (ovData.media || []).filter(function (m) { return m.type === t; }); }
  function delMedia(m) {
    if (pubBusy || !confirm(U('pub_del'))) return;
    call('site_owner_media_del', { url: m.url }).then(function () { ovData.media = ovData.media.filter(function (x) { return x.url !== m.url; }); dirty = true; renderSpace(); }).catch(function (e) { toast(e.message); });
  }
  function delPost(p) {
    if (pubBusy || !confirm(U('pub_del'))) return;
    call('site_owner_post_del', { date: p.date }).then(function () { ovData.posts = ovData.posts.filter(function (x) { return x.date !== p.date; }); dirty = true; renderSpace(); }).catch(function (e) { toast(e.message); });
  }
  function rowOf(th, title, sub, onDel) {
    var r = E('div', 'cn-row'), t = E('div', 'th'), m = E('div', 'm'), d = E('button', 'cn-ib'); d.type = 'button'; d.setAttribute('aria-label', U('a_del')); d.appendChild(icon(IC.trash, 17)); d.onclick = onDel;
    if (typeof th === 'string') { var im = E('img'); im.alt = ''; im.loading = 'lazy'; im.src = th; t.appendChild(im); } else t.appendChild(th);
    A(m, E('b', '', title), E('small', '', sub)); A(r, t, m, d); return r;
  }
  function drawPub(w) {
    A(w, E('h3', '', U('pub_title')), E('p', 'cn-p', U('pub_intro')));
    if (pubFlash && !pubBusy) {
      var ok = E('div', 'cn-ok-card'), see = E('button', 'cn-b'); see.type = 'button'; see.textContent = U('pub_see'); var h = pubFlash; see.onclick = function () { viewSite(h); };
      A(ok, icon(IC.check, 20), E('span', '', U('pub_ok')), see); w.appendChild(ok);
    }
    if (pubBusy) {
      var pc = E('div', 'cn-card'); progTxt = E('b', '', ''); progTxt.style.fontSize = '.9rem'; var bar = E('div', 'cn-bar'); progBar = E('i'); bar.appendChild(progBar);
      A(pc, E('span', 'k', U('pub_up')), E('div'), progTxt, bar); pc.style.margin = '0 0 12px'; w.appendChild(pc);
    }
    var g = E('div', 'cn-acts');
    var art = actTile('pen', U('pub_article'), U('pub_article_s'), function () { if (pubBusy) return; pubMode = pubMode === 'article' ? '' : 'article'; renderSpace(); });
    if (pubMode === 'article') art.className += ' on'; if (pubBusy) art.setAttribute('disabled', '');
    A(g, art, pickTile('image', 'image', U('pub_photo'), U('pub_photo_s')), pickTile('video', 'video', U('pub_video'), U('pub_video_s')), pickTile('file', 'file', U('pub_doc'), U('pub_doc_s')));
    w.appendChild(g);
    if (pubMode === 'article') drawComposer(w);
    var posts = (ovData.posts || []).slice().reverse(), imgs = mediaOf('image'), vids = mediaOf('video'), docs = mediaOf('file');
    w.appendChild(E('div', 'cn-h4', U('pub_done_h')));
    if (!posts.length && !imgs.length && !vids.length && !docs.length) { w.appendChild(E('p', 'cn-p', U('pub_none'))); return; }
    if (posts.length) {
      w.appendChild(E('div', 'cn-h4', U('pub_l_art') + ' · ' + posts.length));
      posts.forEach(function (p) {
        w.appendChild(rowOf(p.imageUrl || icon(IC.pen, 22), p.title, fmtDate(p.date), function () { delPost(p); }));
      });
    }
    if (imgs.length) {
      w.appendChild(E('div', 'cn-h4', U('pub_l_img') + ' · ' + imgs.length));
      var pg = E('div', 'cn-pg');
      imgs.forEach(function (m) { var c = E('div'), im = E('img'); im.alt = ''; im.loading = 'lazy'; im.src = m.url; var d = E('button'); d.type = 'button'; d.setAttribute('aria-label', U('a_del')); d.appendChild(icon(IC.trash, 14)); d.onclick = function () { delMedia(m); }; A(c, im, d); pg.appendChild(c); });
      w.appendChild(pg);
    }
    if (vids.length) { w.appendChild(E('div', 'cn-h4', U('pub_l_vid') + ' · ' + vids.length)); vids.forEach(function (m) { w.appendChild(rowOf(icon(IC.video, 22), m.title || m.name, fmtDate(m.createdAt), function () { delMedia(m); })); }); }
    if (docs.length) { w.appendChild(E('div', 'cn-h4', U('pub_l_doc') + ' · ' + docs.length)); docs.forEach(function (m) { w.appendChild(rowOf(icon(IC.file, 22), m.title || m.name, m.name || '', function () { delMedia(m); })); }); }
  }

  /* ---------- Réglages ---------- */
  var EDIT_FIELDS = [['tagline', 'input'], ['announcement', 'input'], ['hours', 'input'], ['address', 'input'], ['contactPhone', 'input'], ['contactWhatsapp', 'input'], ['contactEmail', 'input'], ['aboutText', 'textarea']];
  function drawEdit(w) {
    var st = ovData.site, inputs = {};
    A(w, E('h3', '', U('ed_title')), E('p', 'cn-p', U('ed_note')));
    EDIT_FIELDS.forEach(function (f) {
      var lab = E('label', 'cn-l', U('f_' + f[0])), inp = E(f[1], 'cn-in');
      if (f[1] === 'textarea') inp.rows = 5; inp.value = st[f[0]] || ''; inp.maxLength = f[0] === 'aboutText' ? 1500 : 160;
      inputs[f[0]] = inp; A(w, lab, inp);
    });
    var save = E('button', 'cn-b p', U('save')); save.type = 'button';
    save.onclick = function () {
      var body = {}; EDIT_FIELDS.forEach(function (f) { body[f[0]] = inputs[f[0]].value; });
      save.disabled = true;
      call('site_owner_update', body).then(function () { EDIT_FIELDS.forEach(function (f) { st[f[0]] = body[f[0]]; }); save.disabled = false; dirty = true; toast(U('saved')); }).catch(function (e) { save.disabled = false; toast(e.message); });
    };
    w.appendChild(save);
    var app = E('a', 'cn-b', U('editApp')); app.href = '/?mysite=1&edit=1'; app.target = '_top'; w.appendChild(app);
    w.appendChild(E('p', 'cn-p', U('ed_more')));
    // Contenu et illustrations du modèle
    w.appendChild(E('div', 'cn-h4', U('seed_h')));
    if (ovData.art) {
      var sw = E('label', 'cn-sw'), cb = E('input'); cb.type = 'checkbox'; cb.checked = true;
      cb.onchange = function () { var on = cb.checked; cb.disabled = true; call('site_owner_update', { artOn: on }).then(function () { dirty = true; cb.disabled = false; toast(U('saved')); }).catch(function (e) { cb.disabled = false; cb.checked = !on; toast(e.message); }); };
      A(sw, cb, E('span', '', U('art_t'))); w.appendChild(sw);
    } else {
      var sd = E('button', 'cn-b', U('seed_b')); sd.type = 'button'; sd.onclick = function () { doSeed(sd); };
      A(w, E('p', 'cn-p', U('seed_t')), sd);
    }
    // Sécurité du compte
    w.appendChild(E('div', 'cn-h4', U('s_title')));
    ['s1', 's2', 's3', 's4', 's5'].forEach(function (k) { var r = E('div', 'cn-sec'); A(r, icon(IC.shield, 20), E('span', '', U(k))); w.appendChild(r); });
    var rs = E('button', 'cn-b', U('s_reset')); rs.type = 'button'; rs.style.marginTop = '12px';
    rs.onclick = function () { if (!user || !user.email) return; auth.sendPasswordResetEmail(user.email).then(function () { toast(U('sent')); }).catch(function () { toast(U('err')); }); };
    var lo = E('button', 'cn-b', U('s_logout')); lo.type = 'button'; lo.onclick = function () { closeSpace(); if (auth) auth.signOut(); };
    A(w, rs, lo);
  }

  function drawHelp(w) {
    A(w, E('h3', '', U('h_title')), E('p', 'cn-p', U('h_intro')));
    var stt = helpData.status; if (stt && stt !== 'none') w.appendChild(E('span', 'cn-tag ' + (stt === 'answered' ? 'ok' : stt === 'closed' ? 'no' : 'new'), U('h_' + stt)));
    var box = E('div'); box.style.margin = '12px 0';
    var msgs = helpData.messages || [];
    if (!msgs.length) box.appendChild(E('p', 'cn-p', U('h_empty')));
    msgs.forEach(function (m) { var b = E('div', 'cn-bub ' + (m.from === 'owner' ? 'me' : 'ad')); A(b, E('small', '', (m.from === 'owner' ? U('h_you') : U('h_team')) + ' · ' + fmtDate(m.at)), document.createTextNode(m.text || '')); box.appendChild(b); });
    w.appendChild(box);
    var sel = E('select', 'cn-in'); ['modification', 'domaine', 'paiement', 'bug', 'autre'].forEach(function (k) { var o = E('option', '', U('cat_' + k)); o.value = k; sel.appendChild(o); });
    var ta = E('textarea', 'cn-in'); ta.placeholder = U('h_ph'); ta.maxLength = 1000; ta.rows = 4;
    var send = E('button', 'cn-b p', U('h_send')); send.type = 'button';
    send.onclick = function () {
      var v = ta.value.trim(); if (v.length < 3) { toast(U('h_short')); return; }
      send.disabled = true;
      call('site_help_send', { message: v, category: sel.value }).then(function () { toast(U('h_sent')); helpData = null; renderSpace(); loadTab(); }).catch(function (e) { send.disabled = false; toast(e.message); });
    };
    A(w, sel, ta, send);
    if (box.lastChild) setTimeout(function () { try { send.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ } }, 50);
  }

  /* ------------------------------------------------------------------ 9. DÉMARRAGE */
  function init() {
    injectCss(); buildTools();
    document.documentElement.lang = lang;
    if (lang !== 'fr') walk(document.body);
    startObserver();
    if (C.preview) return;
    var want = /[?&]espace=1\b/.test(location.search);
    if (want) { loadFb(function (a) { if (a && !user) { /* connexion demandée */ setTimeout(function () { if (!user && !spaceOpen) openLogin(); }, 1200); } }); return; }
    hasStoredAuth(function (yes) { if (yes) loadFb(function () { }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
