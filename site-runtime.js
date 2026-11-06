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
  P('Achat en confiance', 'Shop with confidence', 'Compra con confianza', 'Acquisto sicuro', 'Compra com confiança');
  P('Vous êtes accompagné jusqu\'à la réception', 'We support you until delivery', 'Te acompañamos hasta la entrega', 'Ti seguiamo fino alla consegna', 'Acompanhamos você até a entrega');
  P('Réponse rapide', 'Quick reply', 'Respuesta rápida', 'Risposta rapida', 'Resposta rápida');
  P('Réponse immédiate', 'Instant reply', 'Respuesta inmediata', 'Risposta immediata', 'Resposta imediata');
  P('Livraison rapide', 'Fast delivery', 'Entrega rápida', 'Consegna rapida', 'Entrega rápida');
  P('Retrait ou livraison selon votre adresse', 'Pick-up or delivery depending on your address', 'Recogida o entrega según tu dirección', 'Ritiro o consegna in base al tuo indirizzo', 'Retirada ou entrega conforme o seu endereço');
  P('Une question ? Écrivez-nous sur WhatsApp', 'A question? Message us on WhatsApp', '¿Una pregunta? Escríbenos por WhatsApp', 'Una domanda? Scrivici su WhatsApp', 'Uma dúvida? Escreva-nos no WhatsApp');
  P('Une question ? Contactez-nous', 'A question? Contact us', '¿Una pregunta? Contáctanos', 'Una domanda? Contattaci', 'Uma dúvida? Fale connosco');
  P('Horaires', 'Opening hours', 'Horario', 'Orari', 'Horários');
  P('Service client', 'Customer service', 'Atención al cliente', 'Servizio clienti', 'Atendimento ao cliente');
  P('À votre écoute avant et après votre achat', 'Here for you before and after your purchase', 'A tu disposición antes y después de tu compra', 'A tua disposizione prima e dopo l’acquisto', 'À sua disposição antes e depois da compra');
  P('Voir tous les produits', 'See all products', 'Ver todos los productos', 'Vedi tutti i prodotti', 'Ver todos os produtos');
  P('Voir tous les services', 'See all services', 'Ver todos los servicios', 'Vedi tutti i servizi', 'Ver todos os serviços');
  P('Vous aimerez aussi', 'You may also like', 'También te puede gustar', 'Potrebbe piacerti anche', 'Também poderá gostar');
  P('Autres services', 'Other services', 'Otros servicios', 'Altri servizi', 'Outros serviços');
  P('À lire aussi', 'Related reading', 'Te puede interesar', 'Da leggere anche', 'Leia também');
  P('Partager cet article', 'Share this article', 'Compartir este artículo', 'Condividi questo articolo', 'Partilhar este artigo');
  P('Toutes les actualités', 'All news', 'Todas las noticias', 'Tutte le novità', 'Todas as novidades');
  P('Installer sur mon écran', 'Install on my screen', 'Instalar en mi pantalla', 'Installa sulla schermata', 'Instalar no meu ecrã');
  P('Ajouté', 'Added', 'Añadido', 'Aggiunto', 'Adicionado');
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
  P('Message envoyé. Nous vous répondons rapidement.', 'Message sent. We will reply quickly.', 'Mensaje enviado. Responderemos pronto.', 'Messaggio inviato. Rispondiamo presto.', 'Mensagem enviada. Responderemos em breve.');
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
    copied: ['Lien copié', 'Link copied', 'Enlace copiado', 'Link copiato', 'Link copiado'],
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
    ed_g: ['Général', 'General'], ed_brand: ['Marque', 'Brand'], ed_seo: ['Visibilité', 'Visibility'], ed_cx: ['Connexions', 'Connections'], ed_ac: ['Accès', 'Access'], ed_dm: ['Domaine', 'Domain'],
    br_t: ['Image de marque', 'Brand identity'],
    br_i: ['Votre logo et votre photo de couverture donnent son identité à votre site : ils apparaissent en haut du site, sur Google et quand on partage votre lien.', 'Your logo and cover photo give your site its identity: they appear at the top of the site, on Google and when your link is shared.'],
    br_logo: ['Logo ou photo de profil', 'Logo or profile photo'], br_cover: ['Photo de couverture', 'Cover photo'],
    br_logo_h: ['Format carré conseillé (512 × 512).', 'Square format recommended (512 × 512).'], br_cover_h: ['Format large conseillé (1600 × 900).', 'Wide format recommended (1600 × 900).'],
    br_up: ['Choisir une photo', 'Choose a photo'], br_change: ['Changer la photo', 'Change photo'], br_del: ['Retirer', 'Remove'], br_wait: ['Envoi en cours…', 'Uploading…'],
    br_color: ['Couleur de la marque', 'Brand colour'], br_color_h: ['Utilisée pour les boutons et les accents du site.', 'Used for buttons and accents across the site.'],
    br_color_lock: ['Réservée au Pack Pro « Apparence ».', 'Reserved for the Pro “Look” pack.'], br_reset: ['Utiliser la couleur du modèle', 'Use the template colour'], br_saved: ['Image de marque enregistrée.', 'Brand identity saved.'],
    sq_t: ['Visibilité sur Google', 'Visibility on Google'],
    sq_i: ['Plus votre site est complet, mieux il est compris et classé par les moteurs de recherche. Voici votre note et comment l’améliorer.', 'The more complete your site, the better search engines understand and rank it. Here is your score and how to improve it.'],
    sq_score: ['Note de visibilité', 'Visibility score'], sq_todo: ['À améliorer', 'To improve'], sq_done: ['Réussi', 'Done'], sq_fix: ['Corriger', 'Fix'],
    sq_c_title: ['Titre Google de 15 à 70 caractères', 'Google title of 15 to 70 characters'], sq_c_desc: ['Description Google de 70 à 160 caractères', 'Google description of 70 to 160 characters'],
    sq_c_logo: ['Logo ajouté', 'Logo added'], sq_c_cover: ['Photo de couverture ajoutée', 'Cover photo added'], sq_c_tagline: ['Slogan renseigné', 'Tagline filled in'],
    sq_c_about: ['Texte « À propos » d’au moins 120 caractères', '“About” text of at least 120 characters'], sq_c_items: ['Au moins 3 produits ou services avec prix', 'At least 3 products or services with prices'],
    sq_c_itemPhotos: ['Au moins 3 photos de produits ou services', 'At least 3 product or service photos'], sq_c_contact: ['Un moyen de contact', 'A way to contact you'], sq_c_address: ['Adresse renseignée', 'Address filled in'],
    sq_c_posts: ['Au moins 1 article publié', 'At least 1 published article'], sq_c_faq: ['Au moins 2 questions fréquentes', 'At least 2 frequently asked questions'], sq_c_verify: ['Site vérifié chez Google ou Bing', 'Site verified with Google or Bing'],
    sq_title: ['Titre affiché sur Google', 'Title shown on Google'], sq_desc: ['Description affichée sur Google', 'Description shown on Google'], sq_prev: ['Aperçu sur Google', 'Google preview'],
    sq_codes: ['Codes de vérification', 'Verification codes'], sq_codes_h: ['Collez le code donné par Google Search Console ou Bing Webmaster (la balise entière ou seulement le code).', 'Paste the code given by Google Search Console or Bing Webmaster (the whole tag or just the code).'],
    sq_ping: ['Prévenir les moteurs de recherche', 'Notify search engines'], sq_ping_h: ['Envoie la liste de vos pages à Bing, Yandex et aux autres moteurs. Pour Google, ajoutez le plan du site dans Search Console.', 'Sends your page list to Bing, Yandex and other engines. For Google, add the sitemap in Search Console.'],
    sq_ping_ok: ['Les moteurs de recherche ont été prévenus.', 'Search engines have been notified.'], sq_ping_no: ['Envoi impossible pour le moment, réessayez plus tard.', 'Could not send right now, try again later.'], sq_last: ['Dernier envoi', 'Last sent'],
    sq_map: ['Plan du site', 'Sitemap'], sq_urls: ['pages référencées', 'pages listed'], sq_gsc: ['Ouvrir Google Search Console', 'Open Google Search Console'], sq_saved: ['Visibilité enregistrée.', 'Visibility saved.'],
    cx_t: ['Connexions', 'Connections'], cx_i: ['Reliez votre site à vos autres outils : comptabilité, livraison, messages automatiques, Zapier, Make…', 'Connect your site to your other tools: accounting, delivery, automatic messages, Zapier, Make…'],
    cx_pay: ['Moyens de paiement', 'Payment methods'], cx_pay_i: ['Branchez vos propres passerelles (PayPal, Stripe, Flutterwave, Wave…) : l’argent arrive directement chez vous.', 'Plug in your own gateways (PayPal, Stripe, Flutterwave, Wave…): the money goes straight to you.'], cx_pay_b: ['Gérer mes moyens de paiement', 'Manage my payment methods'],
    cx_wh: ['Notifications automatiques (webhook)', 'Automatic notifications (webhook)'], cx_wh_i: ['À chaque commande, message ou rendez-vous, votre site envoie les informations à cette adresse, avec une signature de sécurité.', 'For every order, message or appointment, your site sends the details to this address, with a security signature.'],
    cx_url: ['Adresse de réception (https://…)', 'Receiving address (https://…)'], cx_on: ['Activer l’envoi', 'Enable sending'], cx_secret: ['Clé de signature : copiez-la maintenant, elle ne sera plus affichée.', 'Signing key: copy it now, it will not be shown again.'],
    cx_regen: ['Créer une nouvelle clé de signature', 'Create a new signing key'], cx_test: ['Envoyer un test', 'Send a test'], cx_test_ok: ['Test réussi : votre adresse a répondu.', 'Test passed: your address replied.'], cx_test_no: ['Votre adresse n’a pas répondu correctement.', 'Your address did not reply correctly.'],
    cx_events: ['Événements envoyés', 'Events sent'], cx_saved: ['Connexion enregistrée.', 'Connection saved.'],
    cx_api: ['Clé d’API', 'API key'], cx_api_i: ['Lisez vos commandes et vos produits, ou marquez une commande « payée » depuis votre propre système.', 'Read your orders and products, or mark an order “paid” from your own system.'],
    cx_api_make: ['Créer une clé', 'Create a key'], cx_api_new: ['Créer une nouvelle clé', 'Create a new key'], cx_api_rev: ['Supprimer la clé', 'Delete the key'], cx_api_once: ['Copiez cette clé maintenant : elle ne sera plus affichée.', 'Copy this key now: it will not be shown again.'],
    cx_api_set: ['Clé active, se terminant par', 'Active key, ending in'], cx_api_none: ['Aucune clé active.', 'No active key.'], cx_endpoint: ['Adresse de l’API', 'API address'], cx_docs: ['Exemples', 'Examples'], cx_sig: ['Vérifier la signature', 'Verify the signature'],
    ac_t: ['Pour qui est ce site ?', 'Who is this site for?'], ac_self: ['Pour moi', 'For me'], ac_client: ['Pour un client', 'For a client'], ac_client_name: ['Nom du client', 'Client name'],
    ac_client_i: ['Invitez votre client : il se connecte à son propre espace (commandes, produits, paiement) sans avoir accès à votre compte.', 'Invite your client: they sign in to their own space (orders, products, payment) without access to your account.'],
    ac_save: ['Enregistrer', 'Save'], ac_mgr: ['Gestionnaires', 'Managers'], ac_none: ['Aucun gestionnaire pour le moment.', 'No manager yet.'], ac_rm: ['Retirer', 'Remove'], ac_rm_q: ['Retirer ce gestionnaire ? Il n’aura plus accès au site.', 'Remove this manager? They will lose access to the site.'],
    ac_inv: ['Inviter un gestionnaire', 'Invite a manager'], ac_inv_b: ['Créer un lien d’invitation', 'Create an invitation link'], ac_inv_i: ['Le lien fonctionne une seule fois et expire dans 14 jours.', 'The link works once and expires in 14 days.'],
    ac_inv_msg: ['Voici votre invitation pour gérer le site', 'Here is your invitation to manage the site'], ac_share: ['Partager le lien', 'Share the link'], ac_pending: ['Invitations en attente', 'Pending invitations'], ac_revoke: ['Annuler', 'Cancel'], ac_exp: ['expire le', 'expires on'],
    ac_saved: ['Enregistré.', 'Saved.'], ac_link: ['Lien d’invitation', 'Invitation link'],
    aud_q: ['Ce site est pour qui ?', 'Who is this site for?'], aud_i: ['Choisissez une fois : cela adapte votre espace.', 'Choose once: this adapts your space.'], aud_self: ['Pour moi-même', 'For myself'], aud_client: ['Pour un client', 'For a client'],
    inv_login: ['Connectez-vous pour accepter l’invitation et gérer ce site.', 'Sign in to accept the invitation and manage this site.', 'Inicia sesión para aceptar la invitación y gestionar este sitio.', 'Accedi per accettare l’invito e gestire questo sito.', 'Entre para aceitar o convite e gerir este site.'], inv_ok: ['Vous gérez maintenant ce site.', 'You now manage this site.', 'Ahora gestionas este sitio.', 'Ora gestisci questo sito.', 'Agora você gerencia este site.'], inv_bad: ['Invitation invalide ou expirée.', 'Invalid or expired invitation.', 'Invitación no válida o caducada.', 'Invito non valido o scaduto.', 'Convite inválido ou expirado.'], role_mgr: ['Gestionnaire du site', 'Site manager', 'Gestor del sitio', 'Gestore del sito', 'Gestor do site'],
    dm_t: ['Nom de domaine', 'Domain name'], dm_i: ['Utilisez votre propre adresse, sans « www » et sans mention de la plateforme : par exemple monsite.com.', 'Use your own address, without “www” and without any platform mention: for example mysite.com.'],
    dm_save: ['Enregistrer le domaine', 'Save domain'], dm_dns: ['Ajoutez ces réglages chez votre fournisseur de domaine :', 'Add these settings at your domain provider:'], dm_wait: ['L’activation peut prendre jusqu’à 24 heures.', 'Activation can take up to 24 hours.'],
    dm_manual: ['Notre équipe a été prévenue et active votre domaine.', 'Our team has been notified and will activate your domain.'], dm_auto: ['Domaine ajouté.', 'Domain added.'], dm_none: ['Aucun domaine personnalisé pour le moment.', 'No custom domain yet.'], dm_remove: ['Retirer le domaine', 'Remove domain'],
    dm_go: ['Continuer', 'Continue'], dm_chk: ['Vérification…', 'Checking…'], dm_av: ['est disponible', 'is available'], dm_yr: ['pour 1 an', 'for 1 year'],
    dm_inc1: ['Achat et connexion automatiques, rien à configurer', 'Automatic purchase and connection, nothing to set up'],
    dm_inc2: ['Site sécurisé (HTTPS) et rapide, sur votre propre adresse', 'Secure (HTTPS), fast site on your own address'],
    dm_inc3: ['Ajouté au plan du site pour les moteurs de recherche', 'Added to the sitemap for search engines'],
    dm_bal: ['Votre solde', 'Your balance'], dm_low: ['Solde insuffisant. Rechargez votre portefeuille dans l’application, puis revenez ici.', 'Insufficient balance. Top up your wallet in the app, then come back.'],
    dm_buy: ['Acheter et activer', 'Buy and activate'], dm_cf: ['Acheter {d} pour {p} $ ? Le montant est débité de votre portefeuille.', 'Buy {d} for ${p}? The amount is taken from your wallet.'],
    dm_off: ['L’achat automatique n’est pas encore activé. Si vous avez déjà ce nom, connectez-le plus bas.', 'Automatic purchase is not enabled yet. If you already own this name, connect it below.'],
    dm_taken: ['Ce nom est déjà pris. Essayez une autre orthographe ou une autre extension (.com, .shop, .online).', 'This name is taken. Try another spelling or extension (.com, .shop, .online).'],
    dm_unsup: ['Cette extension ne peut pas être achetée ici. Si vous possédez déjà ce nom, connectez-le plus bas.', 'This extension cannot be bought here. If you already own this name, connect it below.'],
    dm_unr: ['Vérification impossible pour le moment. Réessayez dans un instant.', 'Cannot check right now. Try again in a moment.'],
    dm_own_t: ['Vous avez déjà ce domaine ?', 'Already own this domain?'], dm_own_i: ['Connectez-le ici, puis faites les 2 réglages chez votre fournisseur.', 'Connect it here, then make the 2 settings at your provider.'],
    dm_own_b: ['Connecter mon domaine', 'Connect my domain'], dm_none_in: ['Écrivez d’abord votre nom de domaine.', 'Enter your domain name first.'],
    dm_p_t: ['Achat en cours', 'Purchase in progress'], dm_p_i: ['Ne fermez pas cette page : cela prend en général moins de 2 minutes.', 'Keep this page open: it usually takes under 2 minutes.'],
    dm_s1: ['Paiement reçu', 'Payment received'], dm_s2: ['Achat du nom de domaine', 'Registering the domain'], dm_s3: ['Connexion à votre site', 'Connecting to your site'], dm_s4: ['Mise en ligne sécurisée (HTTPS)', 'Going live securely (HTTPS)'],
    dm_rev: ['Nous vérifions votre commande. Si elle n’aboutit pas, votre paiement vous est rendu. Vous serez prévenu(e).', 'We are checking your order. If it does not complete, your payment is returned. You will be notified.'],
    dm_fail: ['Dernier achat annulé et remboursé :', 'Last purchase cancelled and refunded:'],
    dm_pend_h: ['Connexion de votre domaine', 'Connecting your domain'], dm_pend: ['En cours', 'In progress'], dm_pend_i: ['Cela prend en général quelques minutes, parfois jusqu’à 24 heures.', 'This usually takes a few minutes, sometimes up to 24 hours.'],
    dm_man_h: ['Activation par notre équipe', 'Activation by our team'], dm_exp: ['Domaine acheté ici, valable jusqu’au', 'Domain bought here, valid until'],
    dm_renew: ['Renouveler 1 an', 'Renew for 1 year'], dm_renew_cf: ['Renouveler {d} pour 1 an ({p} $) ? Le montant est débité de votre portefeuille.', 'Renew {d} for 1 year (${p})? The amount is taken from your wallet.'], dm_renewed: ['Domaine renouvelé.', 'Domain renewed.'],
    dm_verify: ['Vérifier maintenant', 'Check now'], dm_view: ['Voir mon site', 'View my site'], dm_keep: ['Un domaine acheté ici reste réservé pour vous : vous pouvez le remettre en ligne quand vous voulez.', 'A domain bought here stays reserved for you: you can put it back online anytime.'],
    dm_seo: ['Pour être trouvé plus vite : ouvrez Visibilité et envoyez votre site aux moteurs de recherche.', 'To be found faster: open Visibility and send your site to search engines.'], dm_seo_b: ['Ouvrir Visibilité', 'Open Visibility'],
    dm_now: ['Votre site est en ligne sur', 'Your site is live at'], dm_removed: ['Domaine retiré.', 'Domain removed.'],
    mo_t: ['Mes commandes', 'My orders', 'Mis pedidos', 'I miei ordini', 'Meus pedidos'], mo_none: ['Aucune commande pour le moment.', 'No orders yet.', 'Aún no hay pedidos.', 'Nessun ordine per ora.', 'Nenhum pedido por enquanto.'], mo_paid: ['Payée', 'Paid', 'Pagado', 'Pagato', 'Pago'], mo_unpaid: ['À payer', 'To pay', 'Por pagar', 'Da pagare', 'A pagar'], mo_order: ['Commande', 'Order', 'Pedido', 'Ordine', 'Pedido'],
    ins_bar: ['Installer {n}', 'Install {n}', 'Instalar {n}', 'Installa {n}', 'Instalar {n}'],
    ins_bar_sub: ['Accès direct, comme une application', 'Direct access, like an app', 'Acceso directo, como una aplicación', 'Accesso diretto, come un’app', 'Acesso direto, como uma aplicação'],
    ins_go: ['Installer', 'Install', 'Instalar', 'Installa', 'Instalar'],
    shell_t: ['Ce site est ouvert dans une autre application', 'This site is open inside another app', 'Este sitio está abierto en otra aplicación', 'Questo sito è aperto in un’altra app', 'Este site está aberto noutra aplicação'],
    shell_sub: ['Ouvrez-le dans le navigateur pour l’installer avec sa propre icône.', 'Open it in the browser to install it with its own icon.', 'Ábralo en el navegador para instalarlo con su propio icono.', 'Aprilo nel browser per installarlo con la sua icona.', 'Abra-o no navegador para o instalar com o seu próprio ícone.'],
    shell_go: ['Ouvrir', 'Open', 'Abrir', 'Apri', 'Abrir'],
    ins_prev: ['Aperçu : vos visiteurs verront ici le bouton pour installer votre site sur leur écran d’accueil, dès qu’il sera publié.', 'Preview: your visitors will see the button to install your site on their home screen here, once it is published.', 'Vista previa: tus visitantes verán aquí el botón para instalar tu sitio en su pantalla de inicio, cuando esté publicado.', 'Anteprima: i tuoi visitatori vedranno qui il pulsante per installare il tuo sito sulla schermata Home, una volta pubblicato.', 'Pré-visualização: os seus visitantes verão aqui o botão para instalar o seu site no ecrã principal, quando estiver publicado.'],
    ins_help_t: ['Ajouter à l’écran d’accueil', 'Add to home screen', 'Añadir a la pantalla de inicio', 'Aggiungi alla schermata Home', 'Adicionar ao ecrã principal'],
    ins_i1: ['Touchez le bouton Partager (le carré avec une flèche vers le haut).', 'Tap the Share button (the square with an arrow pointing up).', 'Toca el botón Compartir (el cuadrado con una flecha hacia arriba).', 'Tocca il pulsante Condividi (il quadrato con la freccia verso l’alto).', 'Toque no botão Partilhar (o quadrado com uma seta para cima).'],
    ins_i2: ['Faites défiler et touchez « Sur l’écran d’accueil ».', 'Scroll down and tap “Add to Home Screen”.', 'Desplázate y toca «Añadir a pantalla de inicio».', 'Scorri e tocca «Aggiungi alla schermata Home».', 'Deslize e toque em «Adicionar ao ecrã principal».'],
    ins_i3: ['Touchez « Ajouter » : l’icône du site apparaît sur votre écran.', 'Tap “Add”: the site icon appears on your screen.', 'Toca «Añadir»: el icono del sitio aparece en tu pantalla.', 'Tocca «Aggiungi»: l’icona del sito appare sulla schermata.', 'Toque em «Adicionar»: o ícone do site aparece no ecrã.'],
    ins_a1: ['Ouvrez le menu de votre navigateur (les trois points en haut à droite).', 'Open your browser menu (the three dots at the top right).', 'Abre el menú del navegador (los tres puntos arriba a la derecha).', 'Apri il menu del browser (i tre puntini in alto a destra).', 'Abra o menu do navegador (os três pontos no canto superior direito).'],
    ins_a2: ['Touchez « Installer l’application » ou « Ajouter à l’écran d’accueil ».', 'Tap “Install app” or “Add to Home screen”.', 'Toca «Instalar aplicación» o «Añadir a pantalla de inicio».', 'Tocca «Installa app» o «Aggiungi a schermata Home».', 'Toque em «Instalar aplicação» ou «Adicionar ao ecrã principal».'],
    ins_a3: ['Confirmez : le site s’ouvre ensuite directement depuis son icône.', 'Confirm: the site then opens directly from its icon.', 'Confirma: el sitio se abrirá directamente desde su icono.', 'Conferma: il sito si aprirà direttamente dalla sua icona.', 'Confirme: o site abre depois diretamente a partir do ícone.'],
    ins_tip: ['Astuce : si vous êtes dans Facebook, Instagram ou WhatsApp, ouvrez d’abord ce site dans Chrome ou Safari.', 'Tip: if you are inside Facebook, Instagram or WhatsApp, open this site in Chrome or Safari first.', 'Consejo: si estás en Facebook, Instagram o WhatsApp, abre primero este sitio en Chrome o Safari.', 'Suggerimento: se sei in Facebook, Instagram o WhatsApp, apri prima questo sito in Chrome o Safari.', 'Dica: se estiver no Facebook, Instagram ou WhatsApp, abra primeiro este site no Chrome ou Safari.'],
    ins_t: ['Installer sur mon écran', 'Install on my screen', 'Instalar en mi pantalla', 'Installa sulla schermata', 'Instalar no meu ecrã'], ins_ios: ['Sur iPhone : touchez le bouton Partager, puis « Sur l’écran d’accueil ».', 'On iPhone: tap the Share button, then “Add to Home Screen”.', 'En iPhone: toca el botón Compartir y luego «Añadir a pantalla de inicio».', 'Su iPhone: tocca Condividi, poi «Aggiungi alla schermata Home».', 'No iPhone: toque em Partilhar e depois em «Adicionar ao ecrã principal».'], ins_ok: ['Site installé sur votre écran.', 'Site installed on your screen.', 'Sitio instalado en tu pantalla.', 'Sito installato sulla schermata.', 'Site instalado no seu ecrã.'],
    co_track: ['Connectez-vous pour retrouver vos commandes.', 'Sign in to find your orders.', 'Inicia sesión para ver tus pedidos.', 'Accedi per ritrovare i tuoi ordini.', 'Entre para ver os seus pedidos.'],
    f_tagline: ['Slogan', 'Tagline', 'Eslogan', 'Slogan', 'Slogan'],
    f_announcement: ['Bandeau d’annonce', 'Announcement banner', 'Banner de anuncio', 'Banner di annuncio', 'Faixa de aviso'],
    f_hours: ['Horaires', 'Opening hours', 'Horarios', 'Orari', 'Horários'],
    f_address: ['Adresse', 'Address', 'Dirección', 'Indirizzo', 'Endereço'],
    f_contactPhone: ['Téléphone', 'Phone', 'Teléfono', 'Telefono', 'Telefone'],
    f_contactWhatsapp: ['WhatsApp (avec indicatif)', 'WhatsApp (with country code)', 'WhatsApp (con prefijo)', 'WhatsApp (con prefisso)', 'WhatsApp (com DDI)'],
    f_contactEmail: ['E-mail de contact', 'Contact email', 'Correo de contacto', 'E-mail di contatto', 'E-mail de contato'],
    f_aboutText: ['À propos / présentation', 'About / presentation', 'Acerca de / presentación', 'Chi siamo / presentazione', 'Sobre / apresentação'],
    save: ['Enregistrer', 'Save', 'Guardar', 'Salva', 'Salvar'],
    saved: ['Modifications enregistrées', 'Changes saved', 'Cambios guardados', 'Modifiche salvate', 'Alterações salvas'],
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
    h_sent: ['Message envoyé', 'Message sent', 'Mensaje enviado', 'Messaggio inviato', 'Mensagem enviada'],
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
    t_shop: ['Boutique', 'Shop'],
    sh_title: ['Ma boutique', 'My shop'],
    sh_intro: ['Ajoute tes produits et choisis comment tes clients te paient. Les commandes arrivent ici et sur ton téléphone.', 'Add your products and choose how customers pay you. Orders arrive here and on your phone.'],
    sh_new_orders: ['Nouvelles commandes', 'New orders'],
    sh_total_orders: ['au total', 'in total'],
    sh_products: ['Mes produits', 'My products'],
    sh_add: ['Ajouter un produit', 'Add a product'],
    sh_new_t: ['Nouveau produit', 'New product'],
    sh_edit_t: ['Modifier le produit', 'Edit product'],
    sh_none: ['Aucun produit pour le moment. Ajoute le premier.', 'No products yet. Add the first one.'],
    sh_f_name: ['Nom du produit', 'Product name'],
    sh_f_price: ['Prix (ex. 15 $ ou 5 000 FC)', 'Price (e.g. $15 or 5,000 FC)'],
    sh_f_old: ['Ancien prix barré (facultatif)', 'Old crossed-out price (optional)'],
    sh_f_cat: ['Catégorie (facultatif)', 'Category (optional)'],
    sh_f_badge: ['Étiquette (ex. Nouveau, Promo)', 'Label (e.g. New, Sale)'],
    sh_f_desc: ['Description courte', 'Short description'],
    sh_photo: ['Choisir une photo', 'Choose a photo'],
    sh_photo_up: ['Envoi de la photo…', 'Uploading photo…'],
    sh_price_h: ['Écris un montant avec des chiffres pour que le client puisse commander en ligne.', 'Write an amount with digits so customers can order online.'],
    sh_need: ['Écris le nom et le prix du produit.', 'Write the product name and price.'],
    sh_del_q: ['Supprimer ce produit ?', 'Delete this product?'],
    sh_pay: ['Paiement', 'Payment'],
    sh_pay_intro: ['Choisis ce que tes clients voient quand ils commandent. L’argent va directement chez toi : nous ne touchons à aucun paiement.', 'Choose what customers see when they order. Money goes straight to you: we never handle any payment.'],
    sh_orders_on: ['Activer le panier et la commande en ligne', 'Enable cart and online ordering'],
    sh_cod: ['Payer à la livraison ou au retrait', 'Pay on delivery or pickup'],
    sh_momo: ['Mobile Money', 'Mobile Money'],
    sh_op: ['Opérateur (M-Pesa, Airtel Money, Orange Money…)', 'Operator (M-Pesa, Airtel Money…)'],
    sh_num: ['Numéro', 'Number'],
    sh_holder: ['Nom du titulaire', 'Account holder name'],
    sh_add_num: ['Ajouter un numéro', 'Add a number'],
    sh_gw: ['Passerelles de paiement', 'Payment gateways'],
    sh_gw_intro: ['Branche TA passerelle : colle le lien de paiement créé dans ton compte. Le client est envoyé chez toi pour payer, l’argent arrive directement chez toi.', 'Connect YOUR gateway: paste the payment link created in your account. Customers pay you directly and the money goes straight to you.'],
    sh_gw_add: ['Ajouter une passerelle', 'Add a gateway'],
    sh_gw_pick: ['Choisir la passerelle', 'Choose the gateway'],
    sh_gw_url: ['Lien de paiement (https://…)', 'Payment link (https://…)'],
    sh_gw_label: ['Nom affiché au client', 'Name shown to the customer'],
    sh_gw_test: ['Tester le lien', 'Test the link'],
    sh_gw_vars: ['Dans le lien tu peux écrire {amount} (montant), {currency} (devise) et {ref} (numéro de commande) : ils sont remplacés automatiquement.', 'In the link you can write {amount}, {currency} and {ref}: they are replaced automatically.'],
    sh_gw_h_paypal: ['Ouvre paypal.me, copie ton lien et ajoute /{amount}{currency} à la fin. Exemple : https://paypal.me/tonnom/{amount}{currency}', 'Open paypal.me, copy your link and add /{amount}{currency} at the end. Example: https://paypal.me/yourname/{amount}{currency}'],
    sh_gw_h_stripe: ['Dans Stripe, crée un « lien de paiement » et colle-le ici.', 'In Stripe, create a “payment link” and paste it here.'],
    sh_gw_h_flutterwave: ['Dans Flutterwave, crée un « Payment Link » et colle-le ici.', 'In Flutterwave, create a “Payment Link” and paste it here.'],
    sh_gw_h_paystack: ['Dans Paystack, crée une « Payment Page » et colle son lien ici.', 'In Paystack, create a “Payment Page” and paste its link here.'],
    sh_gw_h_wave: ['Dans Wave Business, crée un lien de paiement et colle-le ici.', 'In Wave Business, create a payment link and paste it here.'],
    sh_gw_h_def: ['Colle ici le lien de paiement créé dans ton compte.', 'Paste here the payment link created in your account.'],
    pay_gw: ['Passerelle', 'Gateway'],
    o_paid: ['Payée', 'Paid'],
    o_unpaid: ['À encaisser', 'To collect'],
    o_mark_paid: ['Marquer payée', 'Mark as paid'],
    o_mark_unpaid: ['Marquer non payée', 'Mark as unpaid'],
    sh_note: ['Message pour le client (facultatif)', 'Message for the customer (optional)'],
    sh_see_orders: ['Voir les commandes', 'See orders'],
    l_order: ['Commandes', 'Orders'],
    orders: ['Commandes', 'Orders'],
    o_total: ['Total', 'Total'],
    o_pay: ['Paiement', 'Payment'],
    o_addr: ['Adresse', 'Address'],
    o_done: ['Marquer livrée', 'Mark delivered'],
    pay_cod: ['À la livraison', 'On delivery'],
    pay_momo: ['Mobile Money', 'Mobile Money'],
    pay_link: ['Lien de paiement', 'Payment link'],
    pay_whatsapp: ['Via WhatsApp', 'Via WhatsApp'],
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
    seed_ok: ['Contenu du modèle ajouté', 'Template content added', 'Contenido de la plantilla añadido', 'Contenuto del modello aggiunto', 'Conteúdo do modelo adicionado'],
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
    app: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
    bag: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
    globe2: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3 4.5 6.5 4.5 10S15 19 12 22c-3-3-4.5-6.5-4.5-10S9 5 12 2z'
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
    '.cn-btn.ins{border-color:var(--accent,#2563eb);color:var(--accent,#2563eb)}' +
    '.cn-btn.pri{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}' +
    '.cn-btn.pri:hover{color:#fff;filter:brightness(1.08)}' +
    '.cn-btn .dot{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 2px #fff}' +
    '.tpl-dark .cn-btn{background:rgba(255,255,255,.08);color:#e2e8f0;border-color:rgba(255,255,255,.25)}' +
    '@media(max-width:520px){.cn-btn .t{display:none}.cn-btn{padding:0 10px}.cn-btn.keep .t{display:inline}}' +
    '@media(min-width:861px) and (max-width:1180px){.cn-btn.ins .t{display:none}.cn-btn.ins{padding:0 10px}}' +
    '.cn-pop{position:absolute;right:0;top:44px;min-width:190px;background:var(--card,#fff);color:var(--ink,#0f172a);border:1px solid var(--border,#e4e8ef);border-radius:14px;box-shadow:0 18px 50px -12px rgba(15,23,42,.35);padding:6px;display:none;z-index:95}' +
    '.cn-pop.open{display:block}' +
    '.cn-pop button,.cn-pop a{display:flex;width:100%;align-items:center;gap:8px;text-align:left;border:0;background:none;color:inherit;font:600 .88rem inherit;font-family:inherit;padding:10px 12px;border-radius:9px;cursor:pointer;text-decoration:none}' +
    '.cn-pop button:hover,.cn-pop a:hover{background:var(--accent-soft,rgba(37,99,235,.1))}' +
    '.cn-pop button.on{color:var(--accent,#2563eb)}' +
    '.cn-pop .who{padding:8px 12px 6px;font-size:.76rem;color:var(--muted,#5b6678);word-break:break-all}' +
    '.cn-ibar{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--card,#fff);color:var(--ink,#0f172a);border-bottom:1px solid var(--border,#e4e8ef);font-family:inherit}' +
    '.cn-ibar .ic{flex:0 0 auto;width:34px;height:34px;border-radius:8px;object-fit:cover;background:var(--accent,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.95rem}' +
    '.cn-ibar .tx{flex:1;min-width:0;line-height:1.25}.cn-ibar .tx b{display:block;font-size:.8rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cn-ibar .tx span{display:block;font-size:.72rem;color:var(--muted,#5b6678);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cn-ibar .go{flex:0 0 auto;border:0;border-radius:8px;background:var(--accent,#2563eb);color:#fff;font:700 .78rem/1 inherit;font-family:inherit;padding:9px 14px;cursor:pointer}' +
    '.cn-ibar .no{flex:0 0 auto;border:0;background:none;color:var(--muted,#5b6678);width:30px;height:30px;border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}' +
    '.cn-steps{list-style:none;margin:6px 0 4px;padding:0;display:grid;gap:10px;counter-reset:s}.cn-steps li{counter-increment:s;display:flex;gap:12px;align-items:flex-start;font-size:.92rem;line-height:1.45}' +
    '.cn-steps li::before{content:counter(s);flex:0 0 auto;width:24px;height:24px;border-radius:50%;background:var(--accent,#2563eb);color:#fff;font-size:.78rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px}' +
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
    '.cn-av{flex:0 0 auto;width:44px;height:44px;border-radius:13px;background:var(--accent,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15rem;overflow:hidden}' +
    '.cn-av img{width:100%;height:100%;object-fit:cover}' +
    '.cn-os-h .tt{flex:1;min-width:0}.cn-os-h b{display:block;font-size:1.04rem;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cn-os-h small{display:flex;align-items:center;gap:6px;color:var(--muted,#5b6678);font-size:.76rem;margin-top:2px}' +
    '.cn-pill{display:inline-flex;align-items:center;gap:5px;font-size:.66rem;font-weight:800;letter-spacing:.02em;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e}' +
    '.cn-pill.live{background:#dcfce7;color:#166534}.cn-pill.live:before{content:"";width:6px;height:6px;border-radius:50%;background:#16a34a}' +
    '.cn-nav{display:flex;gap:2px;padding:6px 6px max(6px,env(safe-area-inset-bottom));background:var(--card,#fff);border-top:1px solid var(--border,#e4e8ef)}' +
    '.cn-tab{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:none;color:var(--muted,#5b6678);font:700 .68rem/1.1 inherit;font-family:inherit;padding:4px 2px;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}' +
    '.cn-tab .ic{display:flex;align-items:center;justify-content:center;width:52px;height:30px;border-radius:999px;transition:background .15s,color .15s}' +
    '.cn-tab span.l{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '@media(max-width:460px){.cn-nav{gap:0;padding-left:2px;padding-right:2px}.cn-tab{font-size:.62rem;padding:4px 0}.cn-tab .ic{width:42px}.cn-tab .dot{left:calc(50% + 8px)}}' +
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
    '.cn-hero{background:var(--accent,#2563eb);color:#fff;border:0;border-radius:22px;padding:18px;margin:0 0 12px}' +
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
    '.cn-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cn-2 .cn-in{min-width:0}' +
    '.cn-ph{display:block;width:104px;height:104px;border-radius:12px;object-fit:cover;border:1px solid var(--border,#e4e8ef);margin:0 0 10px}' +
    '.cn-sub{font-size:.78rem;color:var(--muted,#5b6678);margin:-4px 0 10px}' +
    '.cn-mm{border:1px solid var(--border,#e4e8ef);border-radius:12px;padding:10px;margin:0 0 10px}.cn-mm .cn-in{margin-bottom:8px}' +
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
    '.cn-brand{border:1px solid var(--border,#e4e8ef);border-radius:18px;overflow:hidden;background:var(--card,#fff);margin:0 0 14px;position:relative}' +
    '.cn-brand .cv{height:132px;background:var(--accent-soft,#e8efff);display:flex;align-items:center;justify-content:center;color:var(--muted,#5b6678);font-size:.8rem}' +
    '.cn-brand .cv img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.cn-brand .lg{position:absolute;left:16px;top:92px;width:78px;height:78px;border-radius:18px;border:4px solid var(--card,#fff);background:var(--accent,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.8rem;overflow:hidden}' +
    '.cn-brand .lg img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.cn-brand .nm{padding:46px 16px 14px}.cn-brand .nm b{display:block;font-size:1.05rem}.cn-brand .nm small{color:var(--muted,#5b6678)}' +
    '.cn-gp{border:1px solid var(--border,#e4e8ef);border-radius:14px;padding:14px;background:#fff;color:#202124;margin:0 0 12px}' +
    '.cn-gp .u{font-size:.78rem;color:#4d5156;word-break:break-all}.cn-gp .t{font-size:1.12rem;color:#1a0dab;margin:2px 0 3px;line-height:1.3}.cn-gp .d{font-size:.86rem;color:#4d5156;line-height:1.5}' +
    '.cn-score{display:flex;align-items:center;gap:16px;margin:0 0 12px}.cn-score svg{flex:0 0 auto}.cn-score b{display:block;font-size:1.05rem}.cn-score small{color:var(--muted,#5b6678);font-size:.82rem}' +
    '.cn-chk{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border,#e4e8ef);font-size:.88rem}.cn-chk:last-child{border-bottom:0}' +
    '.cn-chk>svg{flex:0 0 auto}.cn-chk.ok>svg{color:#16a34a}.cn-chk.no>svg{color:#b42318}.cn-chk span{flex:1;min-width:0}.cn-chk em{font-style:normal;color:var(--muted,#5b6678);font-size:.74rem;font-weight:700}' +
    '.cn-cnt{float:right;font-weight:600;color:var(--muted,#5b6678)}' +
    '.cn-dm{border:1px solid var(--border,#e4e8ef);background:var(--card,#fff);border-radius:16px;padding:16px;margin:0 0 12px}.cn-dm h4{margin:0 0 2px;font-size:1rem}' +
    '.cn-dmd{font-size:.8rem;color:var(--muted,#5b6678);margin:0 0 10px;word-break:break-all}.cn-dmbox{margin:12px 0 4px}' +
    '.cn-price{display:flex;align-items:baseline;gap:6px;margin:6px 0 12px}.cn-price b{font-size:1.8rem;letter-spacing:-.02em}.cn-price span{color:var(--muted,#5b6678);font-size:.85rem}' +
    '.cn-ul{list-style:none;margin:0 0 12px;padding:0}.cn-ul li{display:flex;gap:8px;align-items:flex-start;font-size:.84rem;margin:0 0 7px}.cn-ul li svg{flex:0 0 auto;color:#067647;margin-top:2px}' +
    '.cn-steps{list-style:none;margin:6px 0 12px;padding:0}.cn-steps li{display:flex;align-items:center;gap:10px;padding:10px 0;font-size:.88rem;color:var(--muted,#5b6678);border-bottom:1px solid var(--border,#e4e8ef)}.cn-steps li:last-child{border-bottom:0}' +
    '.cn-steps li i{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:2px solid var(--border,#cbd5e1);display:inline-flex;align-items:center;justify-content:center;color:#fff}' +
    '.cn-steps li.ok{color:var(--ink,#0f172a)}.cn-steps li.ok i{background:#067647;border-color:#067647}.cn-steps li.on{color:var(--ink,#0f172a);font-weight:700}' +
    '.cn-steps li.on i{border-color:var(--accent,#2563eb);border-top-color:transparent;animation:cn-spin .8s linear infinite}@keyframes cn-spin{to{transform:rotate(360deg)}}' +
    'a.cn-b{font-size:.83rem;font-weight:700;text-decoration:none}.cn-bd{display:inline-block;font-weight:700;font-size:.72rem;line-height:1;padding:6px 10px;border-radius:999px;background:#fef3c7;color:#92400e;margin:0 0 8px}.cn-bd.ok{background:#dcfce7;color:#067647}' +
    '.cn-code{display:block;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:12px;font:500 .74rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-all;margin:0 0 10px}' +
    '.cn-key{display:flex;align-items:center;gap:8px;background:var(--accent-soft,#e8efff);border:1px solid var(--border,#e4e8ef);border-radius:12px;padding:10px 12px;margin:0 0 10px;font:600 .78rem ui-monospace,Menlo,monospace;word-break:break-all}' +
    '.cn-key span{flex:1;min-width:0}' +
    '.cn-seg{display:flex;gap:8px;margin:0 0 12px}.cn-seg button{flex:1;border:1px solid var(--border,#e4e8ef);background:var(--card,#fff);color:var(--ink,#0f172a);border-radius:12px;padding:12px;font:700 .88rem inherit;font-family:inherit;cursor:pointer}' +
    '.cn-seg button.on{border-color:var(--accent,#2563eb);box-shadow:0 0 0 2px var(--accent-soft,#e8efff);color:var(--accent,#2563eb)}' +
    '.cn-person{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--border,#e4e8ef);border-radius:14px;background:var(--card,#fff);margin:0 0 8px}.cn-person .m{flex:1;min-width:0}.cn-person b{display:block;font-size:.9rem}.cn-person small{color:var(--muted,#5b6678);font-size:.74rem}' +
    '.cn-ord{border:1px solid var(--border,#e4e8ef);border-radius:14px;padding:12px;margin:0 0 10px;background:var(--card,#fff)}.cn-ord b{font-size:.95rem}.cn-ord p{margin:4px 0 0;font-size:.82rem;color:var(--muted,#5b6678)}' +
    '.cn-b+.cn-sub,.cn-b+.cn-code,.cn-b+.cn-note,.cn-key+.cn-b,.cn-sw+.cn-b{margin-top:12px}.cn-chip{white-space:nowrap}' +
    '.cn-spark{width:100%;height:70px;display:block}';
  function injectCss() { var s = E('style'); s.id = 'cn-rt-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ------------------------------------------------------------------ 5. FIREBASE (chargé seulement si besoin) */
  var auth = null, user = null, fbState = 0, fbCbs = [], isOwner = false, isManager = false, ownerBadge = false, inviteToken = '';
  (function () {
    var m = /[?&]invite=([A-Za-z0-9_-]{20,80})/.exec(location.search);
    if (!m || C.kind !== 'site' || C.preview || C.sample) return;
    inviteToken = m[1];
    try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])invite=[^&]*&?/, '$1').replace(/[?&]$/, '') + location.hash); } catch (e) { /* ignore */ }
  })();
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
        if (isManager && !b.siteId && /^(site_owner_|leads_)/.test(action)) b.siteId = C.id;
        return fetch('/api/render-site', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify(b) });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (r.ok && j && j.success !== false) resolve(j); else { var er = new Error((j && j.error) ? (window.cnT ? window.cnT(j.error) : j.error) : U('err')); er.data = j || {}; reject(er); } });
      }).catch(function (e) { reject(e && e.message ? e : new Error(U('e_net'))); });
    });
  }

  /* ------------------------------------------------------------------ 6. BARRE D'OUTILS : langue + connexion + « Mon espace » */
  var tools, langBtn, langPop, accBtn, accPop, insBtn;
  function closePops() { if (langPop) langPop.classList.remove('open'); if (accPop) accPop.classList.remove('open'); }
  function buildTools() {
    var row = document.querySelector('.topbar-row');
    tools = E('div', 'cn-rt cn-tools'); if (!row) tools.className += ' cn-float';
    langBtn = E('button', 'cn-btn'); langBtn.type = 'button'; langBtn.setAttribute('aria-haspopup', 'true');
    langPop = E('div', 'cn-pop'); langPop.setAttribute('role', 'menu');
    var lw = E('div'); lw.style.position = 'relative'; A(lw, langBtn, langPop);
    langBtn.onclick = function (e) { e.stopPropagation(); var o = langPop.classList.contains('open'); closePops(); if (!o) langPop.classList.add('open'); };
    A(tools, lw);
    if (canInstallUi() && !isStandalone()) {
      insBtn = E('button', 'cn-btn ins'); insBtn.type = 'button'; insBtn.setAttribute('data-cn-install', 'head');
      insBtn.setAttribute('aria-label', U('ins_t'));
      A(insBtn, icon(IC.download, 16), E('span', 't', U('ins_go')));
      insBtn.onclick = function (e) { e.stopPropagation(); installNow(); };
      A(tools, insBtn);
    }
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
    else if (isOwner || isManager) { accBtn.className = 'cn-btn pri keep'; A(accBtn, icon(IC.grid, 16), E('span', 't', U('myspace')), ownerBadge ? E('i', 'dot') : null); accBtn.setAttribute('aria-label', U('myspace')); }
    else { var ini = E('span', 't', (user.displayName || user.email || '?').trim().charAt(0).toUpperCase()); ini.style.display = 'inline'; A(accBtn, icon(IC.user, 16), ini); accBtn.setAttribute('aria-label', U('signed')); }
  }
  function drawAccPop() {
    accPop.textContent = '';
    A(accPop, E('div', 'who', (user && (user.email || user.displayName)) || ''));
    if (isOwner || isManager) { var s = E('button', '', U('myspace')); s.type = 'button'; s.onclick = function () { closePops(); openSpace(); }; accPop.appendChild(s); }
    if (!isOwner && !isManager && C.co) { var mo = E('button', '', U('mo_t')); mo.type = 'button'; mo.onclick = function () { closePops(); openOrders(); }; accPop.appendChild(mo); }
    var o = E('button', '', U('logout')); o.type = 'button'; o.onclick = function () { closePops(); if (auth) auth.signOut(); }; accPop.appendChild(o);
  }
  function setLang(l) {
    if (LI[l] === undefined) return;
    lang = l; try { localStorage.setItem('cn_site_lang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l;
    walk(document.body);
    drawLang(); drawAcc(); drawInstallLabels();
    if (spaceOpen) renderSpace();
    try { window.dispatchEvent(new CustomEvent('cnlang', { detail: l })); } catch (e) { /* ignore */ }
  }
  function enterSpaceUser() {
    drawAcc();
    call('site_owner_overview', {}).then(function (j) { ownerBadge = !!((j.leads && j.leads.fresh) || (j.help && j.help.unread)); drawAcc(); }).catch(function () { });
    if (/[?&]espace=1\b/.test(location.search) && !spaceOpen && !autoOpened) { autoOpened = true; openSpace(); }
  }
  // Un client invité qui a ouvert le lien d'invitation : le lien ne sert qu'une fois.
  function acceptInvite() {
    var tk = inviteToken; if (!tk || !user) return; inviteToken = '';
    call('site_invite_accept', { siteId: C.id, token: tk }).then(function () {
      isManager = true; toast(U('inv_ok')); enterSpaceUser(); setTimeout(function () { if (!spaceOpen) openSpace(); }, 700);
    }).catch(function (e) { toast(e && e.message ? e.message : U('inv_bad')); });
  }
  function checkManager() {
    var u = user;
    call('site_manager_check', { siteId: C.id }).then(function (j) {
      if (!j.manager || user !== u) return;
      isManager = true; enterSpaceUser();
    }).catch(function () { });
  }
  function onUser() {
    isOwner = !!(user && C.kind === 'site' && C.id && user.uid === C.id && !C.sample);
    isManager = false; ownerBadge = false;
    drawAcc();
    if (isOwner) { inviteToken = ''; enterSpaceUser(); }
    else {
      if (user && C.kind === 'site' && C.id && !C.sample && !C.preview) { if (inviteToken) acceptInvite(); else checkManager(); }
    }
    if (!user && spaceOpen) closeSpace();
    drawCoHint();
  }
  var autoOpened = false;

  /* ------------------------------------------------------------------ 7. CONNEXION */
  function overlay() {
    var o = E('div', 'cn-rt cn-ov'); o.onclick = function (e) { if (e.target === o) o.remove(); };
    var s = E('div', 'cn-sheet'); o.appendChild(s); document.body.appendChild(o);
    return { o: o, s: s };
  }
  function openLogin(note) {
    if (C.sample) { toast(U('pv')); return; }
    var reg = false, ov = overlay(), s = ov.s;
    var hd = E('div', 'cn-hd'), h2 = E('h2', '', U('login')), x = E('button', 'cn-x'); x.type = 'button'; x.setAttribute('aria-label', U('close')); x.appendChild(icon(IC.x, 16)); x.onclick = function () { ov.o.remove(); };
    A(hd, h2, x); A(s, hd, E('p', 'cn-p', note || U('login_sub')));
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
  var shopList = null, shopPay = null, shopEdit = null, shopBusy = false;
  var dirty = false, pubMode = '', pubBusy = false, pubFlash = '', progBar = null, progTxt = null, draft = { t: '', b: '' };
  var TABS = ['ov', 'shop', 'leads', 'pub', 'edit', 'help'];
  var TAB_IC = { ov: 'home', shop: 'bag', pub: 'plus', leads: 'inbox', edit: 'sliders', help: 'chat' };
  var CLOUD = { name: 'aqe4fxh4', preset: 'coeurnoh_universe' };
  var LIMIT_MB = { image: 10, video: 100, file: 25 };
  var ACCEPT = { image: 'image/jpeg,image/png,image/webp,image/gif', video: 'video/*', file: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip' };
  var FILE_RE = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)$/i;

  function tabsNow() { return isManager ? TABS.filter(function (k) { return k !== 'help'; }) : TABS; }
  function slugOf() { return C.slug || (ovData && ovData.site.slug) || ''; }
  function openSpace() {
    if (!isOwner && !isManager) return;
    if (spaceEl) spaceEl.remove();
    spaceEl = E('div', 'cn-rt cn-os'); spaceEl.setAttribute('role', 'dialog'); spaceEl.setAttribute('aria-modal', 'true');
    document.body.appendChild(spaceEl); document.documentElement.style.overflow = 'hidden'; spaceOpen = true;
    ovData = null; leadsData = null; helpData = null; tab = 'ov'; pubMode = ''; pubFlash = ''; shopList = null; shopPay = null; shopEdit = null;
    editSub = 'gen'; cxData = null; cxSecret = ''; cxKey = ''; accData = null; accLink = ''; dmInfo = null; dmReset();
    var tm = /[?&]tab=(\w+)/.exec(location.search);
    if (tm) { var tt = tm[1] === 'sec' ? 'edit' : tm[1]; if (tabsNow().indexOf(tt) >= 0) tab = tt; }
    var sm = /[?&]sub=(\w+)/.exec(location.search);
    if (sm && SUBS.some(function (x) { return x[0] === sm[1]; })) editSub = sm[1];
    renderSpace(); loadTab();
  }
  // Après une publication, la page du site derrière l'espace est périmée : on la recharge à jour (adresse « fresh », jamais comptée comme visite).
  function freshUrl(hash) { return (C.host ? '/' : '/s/' + encodeURIComponent(slugOf())) + '?fresh=' + Date.now() + (hash || ''); }
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
    var sub = E('small'); if (st) sub.appendChild(E('span', 'cn-pill' + (st.published ? ' live' : ''), st.published ? U('live') : U('draft'))); sub.appendChild(E('span', '', U(isManager ? 'role_mgr' : 'owner')));
    A(tt, E('b', '', nm), sub);
    var x = E('button', 'cn-x'); x.type = 'button'; x.setAttribute('aria-label', U('close')); x.appendChild(icon(IC.x, 16)); x.onclick = function () { if (pubBusy) return; closeSpace(); };
    A(h, av, tt, x);
    var body = E('div', 'cn-os-b'), wrap = E('div', 'cn-wrap'); body.appendChild(wrap);
    var nav = E('div', 'cn-nav'); nav.setAttribute('role', 'tablist');
    tabsNow().forEach(function (k) {
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
    if (tab === 'shop') return ovData ? drawShop(w) : loading(w);
    if (tab === 'leads') return leadsData ? drawLeads(w) : loading(w);
    if (tab === 'edit') return ovData ? drawEdit(w) : loading(w);
    return helpData ? drawHelp(w) : loading(w);
  }
  function loadTab() {
    var need = null;
    if ((tab === 'ov' || tab === 'edit' || tab === 'pub' || tab === 'shop') && !ovData) need = call('site_owner_overview', {}).then(function (j) { ovData = j; });
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
    var d = ovData, st = d.site, url = C.host ? location.origin : location.origin + '/s/' + st.slug;
    var hero = E('div', 'cn-card cn-hero');
    var first = user && user.displayName ? ' ' + user.displayName.split(' ')[0] : '';
    A(hero, E('h3', '', U('hello') + first), E('p', '', U('welcome')));
    var u = E('div', 'cn-url'), cp = E('button'); cp.type = 'button'; cp.appendChild(icon(IC.copy, 14)); cp.appendChild(document.createTextNode(U('copy'))); cp.onclick = function () { copyLink(url); };
    A(u, E('span', '', url.replace(/^https?:\/\//, '')), cp); hero.appendChild(u); w.appendChild(hero);
    if (!st.published) w.appendChild(E('div', 'cn-warn', U('unpub')));
    if (d.role === 'owner' && !d.audience) {
      var an = E('div', 'cn-note'), ab = E('div'), a1 = E('button', 'cn-b s', U('aud_self')), a2 = E('button', 'cn-b s', U('aud_client'));
      a1.type = 'button'; a2.type = 'button';
      function pickAud(forClient) {
        a1.disabled = true; a2.disabled = true;
        call('site_owner_client_set', forClient ? { forClient: { name: '' } } : { audience: 'self' }).then(function (r) {
          d.audience = r.audience; d.forClient = r.forClient; accData = null;
          if (forClient) { editSub = 'ac'; tab = 'edit'; }
          renderSpace(); loadTab();
        }).catch(function (e) { a1.disabled = false; a2.disabled = false; toast(e.message || U('err')); });
      }
      a1.onclick = function () { pickAud(false); }; a2.onclick = function () { pickAud(true); };
      A(ab, E('b', '', U('aud_q')), E('p', '', U('aud_i')), a1, a2); A(an, icon(IC.users, 20), ab); w.appendChild(an);
    }
    if (d.starter && !d.starter.dismissed) {
      var n = E('div', 'cn-note'), nb = E('div'), ok = E('button', 'cn-b s', U('st_ok')); ok.type = 'button';
      ok.onclick = function () { ok.disabled = true; call('site_owner_update', { starterDismiss: true }).then(function () { d.starter.dismissed = true; renderSpace(); }).catch(function (e) { ok.disabled = false; toast(e.message); }); };
      A(nb, E('b', '', U('st_title')), E('p', '', U('st_txt')), ok); A(n, icon(IC.spark, 20), nb); w.appendChild(n);
    }
    if (!d.art && !d.starter) {
      var n2 = E('div', 'cn-note'), b2 = E('div'), sb = E('button', 'cn-b s', U('seed_b')); sb.type = 'button'; sb.onclick = function () { doSeed(sb); };
      A(b2, E('b', '', U('seed_h')), E('p', '', U('seed_t')), sb); A(n2, icon(IC.spark, 20), b2); w.appendChild(n2);
    }
    var g = E('div', 'cn-grid'), shopRel = !!(d.shop && d.shop.shopType) || d.leads.order > 0;
    function toLeads(f) { return function () { tab = 'leads'; leadFilter = f; renderSpace(); loadTab(); }; }
    A(g, statCard(d.stats ? d.stats.total.view : st.viewsCount, U('v30')), statCard(d.stats ? d.stats.actions : 0, U('act')), statCard(d.leads.fresh, U('newq'), toLeads('all')));
    if (shopRel) g.appendChild(statCard(d.leads.order, U('orders'), toLeads('order')));
    g.appendChild(statCard(d.leads.message, U('msgs'), toLeads('message')));
    if (!shopRel || d.leads.appointment) g.appendChild(statCard(d.leads.appointment, U('appts'), toLeads('appointment')));
    g.appendChild(statCard(d.leads.newsletter, U('subs'), toLeads('newsletter')));
    w.appendChild(g);
    if (d.stats && d.stats.series && d.stats.series.length) { var c = E('div', 'cn-card'); c.style.color = 'var(--accent,#2563eb)'; A(c, E('span', 'k', U('v30')), spark(d.stats.series)); w.appendChild(c); }
    w.appendChild(E('div', 'cn-h4', U('quick')));
    var q = E('div', 'cn-acts');
    // Le lien « application » doit sortir de la fenêtre d'aperçu de l'application (il y est parfois ouvert dans un cadre).
    var appTile = actTile('app', U('editApp'), '', null, '/?mysite=1&edit=1'); appTile.target = '_top';
    A(q, actTile('bag', U('t_shop'), '', function () { goTab('shop'); }),
      actTile('plus', U('t_pub'), U('pub_article_s').split(' + ')[0] + ' · ' + U('pub_l_img') + ' · ' + U('pub_l_vid'), function () { goTab('pub'); }),
      actTile('ext', U('seeSite'), '', function () { viewSite(''); }),
      appTile,
      actTile('inbox', U('t_leads'), '', function () { goTab('leads'); }),
      actTile('search', U('ed_seo'), d.seo ? d.seo.score + '/100' : '', function () { editSub = 'seo'; goTab('edit'); }),
      actTile('image', U('ed_brand'), '', function () { editSub = 'brand'; goTab('edit'); }),
      actTile('link', U('ed_cx'), '', function () { editSub = 'cx'; goTab('edit'); }));
    if (d.role === 'owner') {
      A(q, actTile('users', U('ed_ac'), d.forClient ? (d.forClient.name || U('aud_client')) : '', function () { editSub = 'ac'; goTab('edit'); }),
        actTile('globe2', U('ed_dm'), d.domain || '', function () { editSub = 'dm'; goTab('edit'); }),
        actTile('chat', U('t_help'), '', function () { goTab('help'); }));
    }
    w.appendChild(q);
  }

  function tagFor(l) { var s = l.status || 'new'; return E('span', 'cn-tag ' + (s === 'new' ? 'new' : s === 'cancelled' ? 'no' : 'ok'), U('st_' + s)); }
  function digits(v) { return String(v || '').replace(/[^0-9]/g, ''); }
  function leadAction(l, label, status) {
    var b = E('button', 'cn-b s', label); b.type = 'button';
    b.onclick = function () { b.disabled = true; call('leads_update', { leadId: l.id, status: status }).then(function () { l.status = status; renderSpace(); }).catch(function (e) { b.disabled = false; toast(e.message); }); };
    return b;
  }
  function paidAction(l) {
    var b = E('button', 'cn-b s', U(l.paid ? 'o_mark_unpaid' : 'o_mark_paid')); b.type = 'button';
    b.onclick = function () { b.disabled = true; call('leads_update', { leadId: l.id, paid: !l.paid }).then(function () { l.paid = !l.paid; renderSpace(); }).catch(function (e) { b.disabled = false; toast(e.message); }); };
    return b;
  }
  function drawLeads(w) {
    var chips = E('div', 'cn-chips');
    [['all', 'all'], ['order', 'l_order'], ['appointment', 'l_appt'], ['message', 'l_msg'], ['newsletter', 'l_news']].forEach(function (c) {
      var b = E('button', 'cn-chip' + (leadFilter === c[0] ? ' on' : ''), U(c[1])); b.type = 'button';
      b.onclick = function () { leadFilter = c[0]; renderSpace(); }; chips.appendChild(b);
    });
    w.appendChild(chips);
    var list = leadsData.filter(function (l) { return leadFilter === 'all' || l.type === leadFilter; });
    if (!list.length) { w.appendChild(E('p', 'cn-p', U('empty'))); return; }
    list.forEach(function (l) {
      var c = E('div', 'cn-card cn-lead');
      var head = E('h4', '', l.type === 'newsletter' ? (l.email || '') : (l.name || '—') + (l.type === 'order' && l.ref ? ' · ' + l.ref : ''));
      A(c, A(E('div'), tagFor(l), E('span', 'cn-tag', U(l.type === 'appointment' ? 'l_appt' : l.type === 'message' ? 'l_msg' : l.type === 'order' ? 'l_order' : 'l_news')), l.type === 'order' ? E('span', 'cn-tag ' + (l.paid ? 'ok' : 'new'), U(l.paid ? 'o_paid' : 'o_unpaid')) : null, E('small', '', fmtDate(l.createdAt))), head);
      if (l.type === 'appointment') { A(c, E('p', '', (l.phone || '') + (l.service ? ' · ' + l.service : '')), E('p', '', l.date + ' · ' + l.time)); if (l.message) c.appendChild(E('p', '', l.message)); }
      if (l.type === 'order') {
        (l.items || []).forEach(function (it) { c.appendChild(E('p', '', it.q + ' × ' + it.n)); });
        A(c, E('p', '', U('o_total') + ' : ' + (l.total || '')), E('p', '', U('o_pay') + ' : ' + (l.payLabel || U('pay_' + (l.pay || 'cod'))) + (l.payRef ? ' · ' + l.payRef : '')));
        if (l.phone) c.appendChild(E('p', '', l.phone));
        if (l.address) c.appendChild(E('p', '', U('o_addr') + ' : ' + l.address));
        if (l.note) c.appendChild(E('p', '', l.note));
      }
      if (l.type === 'message') { if (l.contact) c.appendChild(E('p', '', l.contact)); c.appendChild(E('p', '', l.message || '')); }
      var row = E('div', 'row');
      var ph = (l.type === 'appointment' || l.type === 'order') ? l.phone : (l.type === 'message' && digits(l.contact).length >= 6 && l.contact.indexOf('@') < 0 ? l.contact : '');
      if (ph) {
        var a1 = E('a', 'cn-b s', U('call')); a1.href = 'tel:' + String(ph).replace(/[^0-9+]/g, '');
        var a2 = E('a', 'cn-b s', U('wa')); a2.href = 'https://wa.me/' + digits(ph); a2.target = '_blank'; a2.rel = 'noopener'; A(row, a1, a2);
      }
      var mail = l.type === 'newsletter' ? l.email : (l.type === 'message' && l.contact && l.contact.indexOf('@') > 0 ? l.contact : '');
      if (mail) { var a3 = E('a', 'cn-b s', U('reply')); a3.href = 'mailto:' + mail; row.appendChild(a3); }
      if (l.type === 'appointment') { if (l.status !== 'confirmed') row.appendChild(leadAction(l, U('a_confirm'), 'confirmed')); if (l.status !== 'done') row.appendChild(leadAction(l, U('a_done'), 'done')); if (l.status !== 'cancelled') row.appendChild(leadAction(l, U('a_cancel'), 'cancelled')); }
      else if (l.type === 'order') { row.appendChild(paidAction(l)); if (l.status !== 'confirmed' && l.status !== 'done') row.appendChild(leadAction(l, U('a_confirm'), 'confirmed')); if (l.status !== 'done') row.appendChild(leadAction(l, U('o_done'), 'done')); if (l.status !== 'cancelled') row.appendChild(leadAction(l, U('a_cancel'), 'cancelled')); }
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
  /* ---------- Boutique : produits et moyens de paiement du vendeur ---------- */
  var GW_IDS = [['paypal', 'PayPal'], ['stripe', 'Stripe'], ['flutterwave', 'Flutterwave'], ['paystack', 'Paystack'], ['cinetpay', 'CinetPay'], ['paydunya', 'PayDunya'], ['fedapay', 'FedaPay'], ['kkiapay', 'KKiaPay'], ['wave', 'Wave'], ['orange', 'Orange Money'], ['mpesa', 'M-Pesa'], ['lygos', 'Lygos'], ['pawapay', 'PawaPay'], ['other', 'Autre / other']];
  var GW_HINT = { paypal: 1, stripe: 1, flutterwave: 1, paystack: 1, wave: 1 };
  function copyOf(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
  function saveProducts(list) {
    return call('site_owner_products_save', { products: list }).then(function (r) {
      shopList = (r.products || []).map(copyOf); if (ovData && ovData.shop) ovData.shop.products = shopList.map(copyOf); dirty = true;
    });
  }
  function shopField(parent, label, key, f, max, ph) {
    var l = E('label', 'cn-l', label), i = E('input', 'cn-in'); i.type = 'text'; i.maxLength = max; i.value = f[key] || ''; if (ph) i.placeholder = ph;
    i.oninput = function () { f[key] = i.value; }; A(parent, l, i); return i;
  }
  function drawProductForm(w) {
    var isNew = shopEdit === -1, f = isNew ? { name: '', price: '', oldPrice: '', desc: '', image: '', category: '', badge: '' } : copyOf(shopList[shopEdit]);
    var c = E('div', 'cn-card'); c.style.margin = '0 0 12px';
    A(c, E('h4', '', isNew ? U('sh_new_t') : U('sh_edit_t')));
    c.lastChild.style.margin = '0 0 12px';
    var pv = E('img', 'cn-ph'); pv.alt = ''; if (f.image) pv.src = f.image; else pv.style.display = 'none';
    var fi = E('input'); fi.type = 'file'; fi.accept = ACCEPT.image; fi.style.display = 'none';
    var pick = E('button', 'cn-b'); pick.type = 'button'; pick.appendChild(icon(IC.image, 18)); pick.appendChild(document.createTextNode(U('sh_photo')));
    pick.onclick = function () { fi.click(); };
    var go = E('button', 'cn-b p', U('save')); go.type = 'button';
    fi.onchange = function () {
      var file = fi.files && fi.files[0]; if (!file) return;
      var bad = checkFile('image', file); if (bad) { toast(bad); return; }
      shopBusy = true; go.disabled = true; pick.disabled = true; var old = pick.lastChild.textContent; pick.lastChild.textContent = U('sh_photo_up');
      shrink(file).then(function (b) { return cloud('image', b, file.name, 'sites/products'); })
        .then(function (url) { f.image = url; pv.src = url; pv.style.display = 'block'; })
        .catch(function (e) { toast(e.message || U('pub_err')); })
        .then(function () { shopBusy = false; go.disabled = false; pick.disabled = false; pick.lastChild.textContent = old; });
    };
    A(c, pv, pick, fi);
    shopField(c, U('sh_f_name'), 'name', f, 80);
    var pr = E('div', 'cn-2'), a1 = E('div'), a2 = E('div'); A(pr, a1, a2);
    var pi = shopField(a1, U('sh_f_price'), 'price', f, 40); shopField(a2, U('sh_f_old'), 'oldPrice', f, 40);
    var hint = E('p', 'cn-sub', U('sh_price_h')); hint.style.display = /\d/.test(f.price || '') ? 'none' : 'block';
    pi.addEventListener('input', function () { hint.style.display = /\d/.test(pi.value) ? 'none' : 'block'; });
    A(c, pr, hint);
    var cb = E('div', 'cn-2'), b1 = E('div'), b2 = E('div'); A(cb, b1, b2); shopField(b1, U('sh_f_cat'), 'category', f, 30); shopField(b2, U('sh_f_badge'), 'badge', f, 20); c.appendChild(cb);
    var dl = E('label', 'cn-l', U('sh_f_desc')), dt = E('textarea', 'cn-in'); dt.rows = 3; dt.maxLength = 160; dt.value = f.desc || ''; dt.oninput = function () { f.desc = dt.value; }; A(c, dl, dt);
    var no = E('button', 'cn-b', U('pub_cancel')); no.type = 'button'; no.onclick = function () { shopEdit = null; renderSpace(); };
    go.onclick = function () {
      if (shopBusy) return;
      if (!String(f.name || '').trim() || !String(f.price || '').trim()) { toast(U('sh_need')); return; }
      var list = shopList.map(copyOf); if (isNew) list.push(f); else list[shopEdit] = f;
      go.disabled = true;
      saveProducts(list).then(function () { shopEdit = null; toast(U('saved')); renderSpace(); }).catch(function (e) { go.disabled = false; toast(e.message || U('err')); });
    };
    A(c, go, no); w.appendChild(c);
  }
  function drawPayForm(w, sh) {
    var P = shopPay, c = E('div', 'cn-card');
    var swo = E('label', 'cn-sw'), cbo = E('input'); cbo.type = 'checkbox'; cbo.checked = P.orders; cbo.onchange = function () { P.orders = cbo.checked; }; A(swo, cbo, E('span', '', U('sh_orders_on')));
    var swc = E('label', 'cn-sw'), cbc = E('input'); cbc.type = 'checkbox'; cbc.checked = P.cod; cbc.onchange = function () { P.cod = cbc.checked; }; A(swc, cbc, E('span', '', U('sh_cod')));
    A(c, swo, swc, E('div', 'cn-h4', U('sh_momo')));
    var box = E('div');
    function drawMm() {
      box.textContent = '';
      P.momo.forEach(function (m, i) {
        var r = E('div', 'cn-mm'), op = E('input', 'cn-in'), nu = E('input', 'cn-in'), nm = E('input', 'cn-in'), rm = E('button', 'cn-b s', U('a_del'));
        op.type = 'text'; op.maxLength = 30; op.placeholder = U('sh_op'); op.value = m.op; op.oninput = function () { m.op = op.value; };
        nu.type = 'tel'; nu.maxLength = 30; nu.placeholder = U('sh_num'); nu.value = m.num; nu.oninput = function () { m.num = nu.value; };
        nm.type = 'text'; nm.maxLength = 60; nm.placeholder = U('sh_holder'); nm.value = m.name; nm.oninput = function () { m.name = nm.value; };
        rm.type = 'button'; rm.onclick = function () { P.momo.splice(i, 1); drawMm(); };
        A(r, op, nu, nm, rm); box.appendChild(r);
      });
      if (P.momo.length < 4) { var add = E('button', 'cn-b', U('sh_add_num')); add.type = 'button'; add.onclick = function () { P.momo.push({ op: '', num: '', name: '' }); drawMm(); }; box.appendChild(add); }
    }
    drawMm(); c.appendChild(box);
    c.appendChild(E('div', 'cn-h4', U('sh_gw'))); c.appendChild(E('p', 'cn-sub', U('sh_gw_intro')));
    var gbox = E('div');
    function drawGw() {
      gbox.textContent = '';
      P.gateways.forEach(function (g, i) {
        var r = E('div', 'cn-mm'), sel = E('select', 'cn-in'), nm = E('input', 'cn-in'), url = E('input', 'cn-in'), rm = E('button', 'cn-b s', U('a_del')), test = E('button', 'cn-b s', U('sh_gw_test'));
        GW_IDS.forEach(function (x) { var o = E('option', '', x[1]); o.value = x[0]; if (x[0] === g.id) o.selected = true; sel.appendChild(o); });
        var hint = E('p', 'cn-sub', U(GW_HINT[g.id] ? 'sh_gw_h_' + g.id : 'sh_gw_h_def'));
        sel.onchange = function () { g.id = sel.value; hint.textContent = U(GW_HINT[g.id] ? 'sh_gw_h_' + g.id : 'sh_gw_h_def'); nm.style.display = g.id === 'other' ? '' : 'none'; };
        nm.type = 'text'; nm.maxLength = 30; nm.placeholder = U('sh_gw_label'); nm.value = g.label; nm.oninput = function () { g.label = nm.value; }; nm.style.display = g.id === 'other' ? '' : 'none';
        url.type = 'url'; url.maxLength = 400; url.placeholder = 'https://'; url.value = g.url; url.oninput = function () { g.url = url.value; };
        rm.type = 'button'; rm.onclick = function () { P.gateways.splice(i, 1); drawGw(); };
        test.type = 'button'; test.onclick = function () { var u = String(g.url || '').replace(/\{(amount|currency|ref)\}/g, function (m, k) { return k === 'amount' ? '10' : k === 'currency' ? 'USD' : 'TEST'; }); if (/^https:\/\//i.test(u)) window.open(u, '_blank', 'noopener'); else toast(U('err')); };
        A(r, sel, nm, url, hint, rm, document.createTextNode(' '), test); gbox.appendChild(r);
      });
      if (P.gateways.length < 4) { var add = E('button', 'cn-b', U('sh_gw_add')); add.type = 'button'; add.onclick = function () { P.gateways.push({ id: GW_IDS[0][0], label: '', url: '' }); drawGw(); }; gbox.appendChild(add); }
      if (P.gateways.length) gbox.appendChild(E('p', 'cn-sub', U('sh_gw_vars')));
    }
    drawGw(); c.appendChild(gbox);
    var nl = E('label', 'cn-l', U('sh_note')), ni = E('input', 'cn-in'); ni.type = 'text'; ni.maxLength = 160; ni.value = P.note; ni.oninput = function () { P.note = ni.value; };
    A(c, nl, ni);
    var sv = E('button', 'cn-b p', U('save')); sv.type = 'button';
    sv.onclick = function () {
      sv.disabled = true;
      var body = { payment: { orders: P.orders, cod: P.cod, momo: P.momo, gateways: P.gateways, note: P.note } };
      if (!sh.shopType) body.cartOn = P.orders;
      call('site_owner_payment_save', body).then(function (r) { var p = r.payment || {}; sh.payment = p; sh.cartOn = sh.shopType || P.orders; shopPay = null; dirty = true; sv.disabled = false; toast(U('saved')); renderSpace(); }).catch(function (e) { sv.disabled = false; toast(e.message || U('err')); });
    };
    c.appendChild(sv); w.appendChild(c);
  }
  function drawShop(w) {
    var sh = ovData.shop || { products: [], payment: {}, cartOn: false, shopType: false };
    if (!shopList) shopList = (sh.products || []).map(copyOf);
    if (!shopPay) {
      var pm = sh.payment || {};
      shopPay = { orders: pm.orders !== false, cod: !!pm.cod, momo: (pm.momo || []).map(function (m) { return { op: m.op || '', num: m.num || '', name: m.name || '' }; }), gateways: (pm.gateways || []).map(function (g) { return { id: g.id || 'other', label: g.label || '', url: g.url || '' }; }), note: pm.note || '' };
    }
    A(w, E('h3', '', U('sh_title')), E('p', 'cn-p', U('sh_intro')));
    var n = ovData.leads.order || 0, nn = ovData.leads.orderNew || 0, oc = E('div', 'cn-card link');
    A(oc, E('b', 'n', String(nn)), E('span', 'k', U('sh_new_orders') + ' · ' + n + ' ' + U('sh_total_orders')));
    oc.onclick = function () { tab = 'leads'; leadFilter = 'order'; renderSpace(); loadTab(); }; w.appendChild(oc);
    w.appendChild(E('div', 'cn-h4', U('sh_products')));
    if (shopEdit !== null) drawProductForm(w);
    else {
      if (!shopList.length) w.appendChild(E('p', 'cn-p', U('sh_none')));
      shopList.forEach(function (p, i) {
        var th = p.image ? p.image : icon(IC.bag, 22);
        var r = rowOf(th, p.name, (p.price || '') + (p.category ? ' · ' + p.category : ''), function () {
          if (shopBusy || !confirm(U('sh_del_q'))) return;
          var list = shopList.map(copyOf); list.splice(i, 1);
          saveProducts(list).then(function () { toast(U('saved')); renderSpace(); }).catch(function (e) { toast(e.message || U('err')); });
        });
        r.style.cursor = 'pointer';
        r.onclick = function (e) { if (e.target.closest && e.target.closest('.cn-ib')) return; shopEdit = i; renderSpace(); };
        w.appendChild(r);
      });
      var add = E('button', 'cn-b p', U('sh_add')); add.type = 'button'; add.style.marginTop = '8px'; add.onclick = function () { shopEdit = -1; renderSpace(); }; w.appendChild(add);
    }
    w.appendChild(E('div', 'cn-h4', U('sh_pay'))); w.appendChild(E('p', 'cn-p', U('sh_pay_intro')));
    drawPayForm(w, sh);
  }

  /* ---------- Réglages : Général · Marque · Visibilité · Connexions · Accès · Domaine ---------- */
  var editSub = 'gen', cxData = null, cxSecret = '', cxKey = '', accData = null, accLink = '', dmInfo = null;
  var SUBS = [['gen', 'ed_g'], ['brand', 'ed_brand'], ['seo', 'ed_seo'], ['cx', 'ed_cx'], ['ac', 'ed_ac'], ['dm', 'ed_dm']];
  function subsNow() { return SUBS.filter(function (s) { return !(ovData && ovData.role === 'manager' && (s[0] === 'ac' || s[0] === 'dm')); }); }
  function drawEdit(w) {
    var chips = E('div', 'cn-chips');
    subsNow().forEach(function (s) {
      var c = E('button', 'cn-chip' + (s[0] === editSub ? ' on' : ''), U(s[1])); c.type = 'button';
      c.onclick = function () { editSub = s[0]; if (s[0] === 'dm') dmReset(); renderSpace(); }; chips.appendChild(c);
    });
    w.appendChild(chips);
    if (editSub === 'brand') return drawBrand(w);
    if (editSub === 'seo') return drawSeo(w);
    if (editSub === 'cx') return drawConnect(w);
    if (editSub === 'ac') return drawAccess(w);
    if (editSub === 'dm') return drawDomain(w);
    return drawGeneral(w);
  }
  function field(parent, label, type, value, max, ph) {
    var l = E('label', 'cn-l', label), i = E(type === 'textarea' ? 'textarea' : 'input', 'cn-in');
    if (type !== 'textarea') i.type = type; else i.rows = 3;
    i.maxLength = max || 200; i.value = value || ''; if (ph) i.placeholder = ph; A(parent, l, i); return i;
  }
  function counter(label, input, max) {
    var c = E('span', 'cn-cnt'); label.appendChild(c);
    function up() { c.textContent = input.value.length + '/' + max; } input.addEventListener('input', up); up();
  }
  function shareText(text, url) {
    if (navigator.share) { navigator.share({ text: text, url: url }).catch(function () { }); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank', 'noopener');
  }

  // --- Marque ---
  function drawBrand(w) {
    var B = ovData.brand, st = ovData.site;
    A(w, E('h3', '', U('br_t')), E('p', 'cn-p', U('br_i')));
    var pv = E('div', 'cn-brand'), cv = E('div', 'cv'), lg = E('div', 'lg'), nm = E('div', 'nm');
    if (B.coverImageUrl) { var ci = E('img'); ci.src = B.coverImageUrl; ci.alt = ''; cv.appendChild(ci); } else cv.textContent = U('br_cover');
    if (B.logoUrl) { var li = E('img'); li.src = B.logoUrl; li.alt = ''; lg.appendChild(li); } else lg.textContent = (st.businessName || '?').trim().charAt(0).toUpperCase();
    A(nm, E('b', '', st.businessName || ''), E('small', '', st.tagline || ''));
    A(pv, cv, lg, nm); w.appendChild(pv);
    function saveBrand(body, btn) {
      if (btn) btn.disabled = true;
      return call('site_owner_brand_save', body).then(function (r) { ovData.brand = Object.assign(ovData.brand, r.brand); dirty = true; toast(U('br_saved')); renderSpace(); }).catch(function (e) { if (btn) btn.disabled = false; toast(e.message || U('err')); });
    }
    function picker(key, label, hint) {
      var box = E('div'); A(box, E('div', 'cn-h4', label), E('p', 'cn-sub', hint));
      var fi = E('input'); fi.type = 'file'; fi.accept = ACCEPT.image; fi.style.display = 'none';
      var go = E('button', 'cn-b'); go.type = 'button'; go.appendChild(icon(IC.image, 18)); go.appendChild(document.createTextNode(U(B[key] ? 'br_change' : 'br_up')));
      go.onclick = function () { fi.click(); };
      fi.onchange = function () {
        var f = fi.files && fi.files[0]; if (!f) return;
        var bad = checkFile('image', f); if (bad) { toast(bad); return; }
        go.disabled = true; go.lastChild.textContent = U('br_wait');
        shrink(f).then(function (b) { return cloud('image', b, f.name, 'sites/brand'); }).then(function (url) { var body = {}; body[key] = url; return saveBrand(body, go); })
          .catch(function (e) { go.disabled = false; go.lastChild.textContent = U(B[key] ? 'br_change' : 'br_up'); toast(e.message || U('pub_err')); });
      };
      A(box, go, fi);
      if (B[key]) { var rm = E('button', 'cn-b s', U('br_del')); rm.type = 'button'; rm.onclick = function () { var body = {}; body[key] = ''; saveBrand(body, rm); }; box.appendChild(rm); }
      w.appendChild(box);
    }
    picker('logoUrl', U('br_logo'), U('br_logo_h'));
    picker('coverImageUrl', U('br_cover'), U('br_cover_h'));
    w.appendChild(E('div', 'cn-h4', U('br_color')));
    w.appendChild(E('p', 'cn-sub', U(B.canColor ? 'br_color_h' : 'br_color_lock')));
    var col = E('input', 'cn-in'); col.type = 'color'; col.value = B.accentColor || '#2563eb'; col.style.height = '48px'; col.style.padding = '4px'; col.disabled = !B.canColor;
    col.onchange = function () { saveBrand({ accentColor: col.value }, col); };
    w.appendChild(col);
    if (B.canColor && B.accentColor) { var rc = E('button', 'cn-b s', U('br_reset')); rc.type = 'button'; rc.onclick = function () { saveBrand({ accentColor: '' }, rc); }; w.appendChild(rc); }
  }

  // --- Visibilité ---
  function ring(score) {
    var s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 120 120'); s.setAttribute('width', '96'); s.setAttribute('height', '96');
    var col = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626', r = 52, c = 2 * Math.PI * r;
    var bg = document.createElementNS(SVGNS, 'circle'); bg.setAttribute('cx', '60'); bg.setAttribute('cy', '60'); bg.setAttribute('r', String(r)); bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', 'rgba(100,116,139,.2)'); bg.setAttribute('stroke-width', '10');
    var fg = document.createElementNS(SVGNS, 'circle'); fg.setAttribute('cx', '60'); fg.setAttribute('cy', '60'); fg.setAttribute('r', String(r)); fg.setAttribute('fill', 'none'); fg.setAttribute('stroke', col); fg.setAttribute('stroke-width', '10'); fg.setAttribute('stroke-linecap', 'round');
    fg.setAttribute('stroke-dasharray', (c * score / 100).toFixed(1) + ' ' + c.toFixed(1)); fg.setAttribute('transform', 'rotate(-90 60 60)');
    var tx = document.createElementNS(SVGNS, 'text'); tx.setAttribute('x', '60'); tx.setAttribute('y', '68'); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('font-size', '30'); tx.setAttribute('font-weight', '800'); tx.setAttribute('fill', 'currentColor'); tx.textContent = String(score);
    A(s, bg, fg, tx); return s;
  }
  function drawSeo(w) {
    var S = ovData.seo, st = ovData.site, host = ovData.domain || (location.host + '/s/' + st.slug);
    A(w, E('h3', '', U('sq_t')), E('p', 'cn-p', U('sq_i')));
    var sc = E('div', 'cn-card cn-score'), tx = E('div'); A(tx, E('b', '', U('sq_score') + ' : ' + S.score + '/100'), E('small', '', S.urls + ' ' + U('sq_urls')));
    A(sc, ring(S.score), tx); w.appendChild(sc);
    var inputs = {};
    var target = { title: 'title', desc: 'title', logo: 'brand', cover: 'brand', tagline: 'gen', about: 'gen', contact: 'gen', address: 'gen', items: 'shop', itemPhotos: 'shop', posts: 'pub', faq: 'app', verify: 'codes' };
    var list = E('div', 'cn-card');
    S.checks.slice().sort(function (a, b) { return (a.ok ? 1 : 0) - (b.ok ? 1 : 0); }).forEach(function (c) {
      var r = E('div', 'cn-chk ' + (c.ok ? 'ok' : 'no')); r.appendChild(icon(c.ok ? IC.check : IC.x, 18)); r.appendChild(E('span', '', U('sq_c_' + c.k)));
      if (!c.ok) {
        var f = E('button', 'cn-b s', U('sq_fix')); f.type = 'button';
        f.onclick = function () {
          var t = target[c.k];
          if (t === 'brand' || t === 'gen') { editSub = t; renderSpace(); }
          else if (t === 'shop' || t === 'pub') goTab(t);
          else if (t === 'app') location.href = '/?mysite=1&edit=1';
          else { var el = inputs[t === 'codes' ? 'google' : 'title']; if (el) { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus(); } catch (e) { /* ignore */ } } }
        };
        r.appendChild(f);
      } else r.appendChild(E('em', '', '+' + c.pts));
      list.appendChild(r);
    });
    w.appendChild(list);
    // Titre et description + aperçu Google
    var tl = E('label', 'cn-l', U('sq_title')), ti = E('input', 'cn-in'); ti.type = 'text'; ti.maxLength = 70; ti.value = S.title || st.businessName || ''; inputs.title = ti;
    var dl = E('label', 'cn-l', U('sq_desc')), di = E('textarea', 'cn-in'); di.rows = 3; di.maxLength = 160; di.value = S.description || ''; inputs.desc = di;
    w.appendChild(E('div', 'cn-h4', U('sq_prev')));
    var gp = E('div', 'cn-gp'), gu = E('div', 'u'), gt = E('div', 't'), gd = E('div', 'd'); A(gp, gu, gt, gd); w.appendChild(gp);
    function paint() { gu.textContent = host; gt.textContent = ti.value || st.businessName || ''; gd.textContent = di.value || st.tagline || ''; }
    ti.addEventListener('input', paint); di.addEventListener('input', paint); paint();
    A(w, tl, ti, dl, di); counter(tl, ti, 70); counter(dl, di, 160);
    w.appendChild(E('div', 'cn-h4', U('sq_codes'))); w.appendChild(E('p', 'cn-sub', U('sq_codes_h')));
    [['google', 'Google'], ['bing', 'Bing'], ['yandex', 'Yandex'], ['facebook', 'Facebook']].forEach(function (k) {
      var i = field(w, k[1], 'text', (S.codes && S.codes[k[0]]) || '', 200, ''); inputs[k[0]] = i;
    });
    var sv = E('button', 'cn-b p', U('save')); sv.type = 'button';
    sv.onclick = function () {
      sv.disabled = true;
      call('site_owner_seo_save', { seoTitle: ti.value, seoDescription: di.value, seo: { google: inputs.google.value, bing: inputs.bing.value, yandex: inputs.yandex.value, facebook: inputs.facebook.value } })
        .then(function (r) { S.score = r.seo.score; S.checks = r.seo.checks; S.title = ti.value; S.description = di.value; dirty = true; toast(U('sq_saved')); renderSpace(); }).catch(function (e) { sv.disabled = false; toast(e.message || U('err')); });
    };
    w.appendChild(sv);
    // Plan du site + prévenir les moteurs
    w.appendChild(E('div', 'cn-h4', U('sq_map')));
    var u = E('div', 'cn-key'), cp = E('button', 'cn-b s'); cp.type = 'button'; cp.appendChild(icon(IC.copy, 14)); cp.onclick = function () { copyLink(S.sitemap); };
    A(u, E('span', '', S.sitemap), cp); w.appendChild(u);
    var gs = E('a', 'cn-b', U('sq_gsc')); gs.href = 'https://search.google.com/search-console'; gs.target = '_blank'; gs.rel = 'noopener'; gs.insertBefore(icon(IC.ext, 16), gs.firstChild); w.appendChild(gs);
    w.appendChild(E('p', 'cn-sub', U('sq_ping_h')));
    var pg = E('button', 'cn-b', U('sq_ping')); pg.type = 'button'; pg.disabled = !st.published;
    pg.onclick = function () { pg.disabled = true; call('site_owner_seo_ping', {}).then(function (r) { S.pingAt = r.at; toast(U(r.ok ? 'sq_ping_ok' : 'sq_ping_no')); renderSpace(); }).catch(function (e) { pg.disabled = false; toast(e.message || U('err')); }); };
    w.appendChild(pg);
    if (S.pingAt) w.appendChild(E('p', 'cn-sub', U('sq_last') + ' : ' + fmtDate(S.pingAt)));
  }

  // --- Connexions ---
  function drawConnect(w) {
    A(w, E('h3', '', U('cx_t')), E('p', 'cn-p', U('cx_i')));
    // Moyens de paiement : même écran que « Boutique »
    var pc = E('div', 'cn-card'); pc.style.margin = '0 0 12px';
    A(pc, E('b', '', U('cx_pay')), E('p', 'cn-sub', U('cx_pay_i')));
    var pb = E('button', 'cn-b', U('cx_pay_b')); pb.type = 'button'; pb.onclick = function () { goTab('shop'); }; pc.appendChild(pb); w.appendChild(pc);
    if (!cxData) { loading(w); call('site_owner_integrations_get', {}).then(function (j) { cxData = j; if (spaceOpen && tab === 'edit' && editSub === 'cx') renderSpace(); }).catch(function (e) { toast(e.message || U('err')); }); return; }
    var X = cxData;
    // Webhook
    w.appendChild(E('div', 'cn-h4', U('cx_wh'))); w.appendChild(E('p', 'cn-sub', U('cx_wh_i')));
    var ui = field(w, U('cx_url'), 'url', X.webhook.url, 300, 'https://');
    var sw = E('label', 'cn-sw'), cb = E('input'); cb.type = 'checkbox'; cb.checked = X.webhook.on || !X.webhook.url; A(sw, cb, E('span', '', U('cx_on'))); w.appendChild(sw);
    var sv = E('button', 'cn-b p', U('save')); sv.type = 'button';
    sv.onclick = function () {
      sv.disabled = true;
      call('site_owner_webhook_save', { url: ui.value, on: cb.checked }).then(function (r) { cxData = r; cxSecret = r.secret || cxSecret; toast(U('cx_saved')); renderSpace(); }).catch(function (e) { sv.disabled = false; toast(e.message || U('err')); });
    };
    w.appendChild(sv);
    if (cxSecret) { var k = E('div', 'cn-key'), kc = E('button', 'cn-b s'); kc.type = 'button'; kc.appendChild(icon(IC.copy, 14)); kc.onclick = function () { copyLink(cxSecret); }; A(k, E('span', '', cxSecret), kc); A(w, E('p', 'cn-sub', U('cx_secret')), k); }
    if (X.webhook.url && X.webhook.hasSecret) {
      var ts = E('button', 'cn-b', U('cx_test')); ts.type = 'button';
      ts.onclick = function () { ts.disabled = true; call('site_owner_webhook_test', {}).then(function (r) { ts.disabled = false; toast(U(r.ok ? 'cx_test_ok' : 'cx_test_no') + (r.status ? ' (' + r.status + ')' : '')); }).catch(function (e) { ts.disabled = false; toast(e.message || U('err')); }); };
      var rg = E('button', 'cn-b s', U('cx_regen')); rg.type = 'button';
      rg.onclick = function () { rg.disabled = true; call('site_owner_webhook_save', { url: X.webhook.url, on: X.webhook.on, regenerate: true }).then(function (r) { cxData = r; cxSecret = r.secret || ''; renderSpace(); }).catch(function (e) { rg.disabled = false; toast(e.message || U('err')); }); };
      A(w, ts, rg);
    }
    w.appendChild(E('p', 'cn-sub', U('cx_events') + ' : ' + X.events.filter(function (e) { return e !== 'ping'; }).join(', ')));
    w.appendChild(E('div', 'cn-code', 'X-Coeurnoh-Signature = "sha256=" + HMAC_SHA256(clé, X-Coeurnoh-Timestamp + "." + corps)'));
    // Clé d'API
    w.appendChild(E('div', 'cn-h4', U('cx_api'))); w.appendChild(E('p', 'cn-sub', U('cx_api_i')));
    if (cxKey) { var ak = E('div', 'cn-key'), ac = E('button', 'cn-b s'); ac.type = 'button'; ac.appendChild(icon(IC.copy, 14)); ac.onclick = function () { copyLink(cxKey); }; A(ak, E('span', '', cxKey), ac); A(w, E('p', 'cn-sub', U('cx_api_once')), ak); }
    w.appendChild(E('p', 'cn-sub', X.apiKey.set ? U('cx_api_set') + ' …' + X.apiKey.last4 : U('cx_api_none')));
    var mk = E('button', 'cn-b' + (X.apiKey.set ? '' : ' p'), U(X.apiKey.set ? 'cx_api_new' : 'cx_api_make')); mk.type = 'button';
    mk.onclick = function () { if (X.apiKey.set && !confirm(U('cx_api_new') + ' ?')) return; mk.disabled = true; call('site_owner_apikey_create', {}).then(function (r) { cxKey = r.key || ''; cxData = r; renderSpace(); }).catch(function (e) { mk.disabled = false; toast(e.message || U('err')); }); };
    w.appendChild(mk);
    if (X.apiKey.set) { var dl = E('button', 'cn-b s', U('cx_api_rev')); dl.type = 'button'; dl.onclick = function () { if (!confirm(U('cx_api_rev') + ' ?')) return; dl.disabled = true; call('site_owner_apikey_revoke', {}).then(function (r) { cxKey = ''; cxData = r; renderSpace(); }).catch(function (e) { dl.disabled = false; toast(e.message || U('err')); }); }; w.appendChild(dl); }
    w.appendChild(E('p', 'cn-sub', U('cx_endpoint') + ' : ' + X.endpoint));
    w.appendChild(E('div', 'cn-h4', U('cx_docs')));
    w.appendChild(E('div', 'cn-code', 'curl -H "Authorization: Bearer cnk_…" \\\n  ' + X.endpoint + '/orders?status=new\n\ncurl -X POST -H "Authorization: Bearer cnk_…" \\\n  -H "Content-Type: application/json" -d \'{"paid":true}\' \\\n  ' + X.endpoint + '/orders/C4K7P2\n\nGET /site · /products · /orders · /orders/{ref}\nGET /messages · /appointments · /subscribers'));
  }

  // --- Accès : pour qui est ce site, gestionnaires, invitations ---
  function drawAccess(w) {
    A(w, E('h3', '', U('ac_t')), E('p', 'cn-p', U('ac_client_i')));
    if (!accData) { loading(w); call('site_owner_access_get', {}).then(function (j) { accData = j; if (spaceOpen && tab === 'edit' && editSub === 'ac') renderSpace(); }).catch(function (e) { toast(e.message || U('err')); }); return; }
    var X = accData, isClient = !!X.forClient, seg = E('div', 'cn-seg'), b1 = E('button', isClient ? '' : 'on', U('ac_self')), b2 = E('button', isClient ? 'on' : '', U('ac_client'));
    b1.type = 'button'; b2.type = 'button'; A(seg, b1, b2); w.appendChild(seg);
    var nameIn = null;
    function setClient(c) {
      call('site_owner_client_set', { forClient: c }).then(function (r) { X.forClient = r.forClient; ovData.forClient = r.forClient; ovData.audience = r.forClient ? 'client' : 'self'; toast(U('ac_saved')); renderSpace(); }).catch(function (e) { toast(e.message || U('err')); });
    }
    b1.onclick = function () { if (isClient) setClient(null); };
    b2.onclick = function () { if (!isClient) setClient({ name: '' }); };
    if (isClient) {
      nameIn = field(w, U('ac_client_name'), 'text', X.forClient.name, 60, '');
      var sn = E('button', 'cn-b', U('ac_save')); sn.type = 'button'; sn.onclick = function () { setClient({ name: nameIn.value }); }; w.appendChild(sn);
    }
    w.appendChild(E('div', 'cn-h4', U('ac_mgr')));
    if (!X.managers.length) w.appendChild(E('p', 'cn-p', U('ac_none')));
    X.managers.forEach(function (m) {
      var r = E('div', 'cn-person'), av = E('div', 'cn-av', (m.name || '?').trim().charAt(0).toUpperCase()), mm = E('div', 'm'), rm = E('button', 'cn-b s', U('ac_rm')); rm.type = 'button';
      A(mm, E('b', '', m.name), E('small', '', fmtDate(m.at)));
      rm.onclick = function () { if (!confirm(U('ac_rm_q'))) return; rm.disabled = true; call('site_owner_manager_remove', { uid: m.uid }).then(function (j) { accData = j; renderSpace(); }).catch(function (e) { rm.disabled = false; toast(e.message || U('err')); }); };
      A(r, av, mm, rm); w.appendChild(r);
    });
    w.appendChild(E('div', 'cn-h4', U('ac_inv'))); w.appendChild(E('p', 'cn-sub', U('ac_inv_i')));
    var mk = E('button', 'cn-b p', U('ac_inv_b')); mk.type = 'button';
    mk.onclick = function () { mk.disabled = true; call('site_owner_invite_create', {}).then(function (j) { accData = j; accLink = j.inviteUrl || ''; renderSpace(); }).catch(function (e) { mk.disabled = false; toast(e.message || U('err')); }); };
    w.appendChild(mk);
    if (accLink) {
      var k = E('div', 'cn-key'), kc = E('button', 'cn-b s'); kc.type = 'button'; kc.appendChild(icon(IC.copy, 14)); kc.onclick = function () { copyLink(accLink); }; A(k, E('span', '', accLink), kc);
      var sh = E('button', 'cn-b', U('ac_share')); sh.type = 'button'; sh.onclick = function () { shareText(U('ac_inv_msg') + ' « ' + (ovData.site.businessName || '') + ' ».', accLink); };
      A(w, E('p', 'cn-sub', U('ac_link')), k, sh);
    }
    if (X.invites.length) {
      w.appendChild(E('div', 'cn-h4', U('ac_pending')));
      X.invites.forEach(function (i) {
        var r = E('div', 'cn-person'), mm = E('div', 'm'), rv = E('button', 'cn-b s', U('ac_revoke')); rv.type = 'button';
        A(mm, E('b', '', '#' + i.id), E('small', '', U('ac_exp') + ' ' + fmtDate(i.exp)));
        rv.onclick = function () { rv.disabled = true; call('site_owner_invite_revoke', { id: i.id }).then(function (j) { accData = j; renderSpace(); }).catch(function (e) { rv.disabled = false; toast(e.message || U('err')); }); };
        A(r, mm, rv); w.appendChild(r);
      });
    }
  }

  // --- Domaine : vérifier le nom, acheter (portefeuille), suivre, connecter, renouveler ---
  var dmSt = null, dmChk = null, dmVal = '', dmBusy = false, dmTimer = 0;
  function dmFill(k, o) { var t = U(k); Object.keys(o).forEach(function (x) { t = t.split('{' + x + '}').join(o[x]); }); return t; }
  function dmDate(iso) { try { return new Date(iso).toLocaleDateString(({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', pt: 'pt-BR' })[lang], { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return String(iso || '').slice(0, 10); } }
  function dmOnTab() { return spaceOpen && tab === 'edit' && editSub === 'dm'; }
  function dmRefresh() {
    clearTimeout(dmTimer);
    return call('site_owner_domain_status', {}).then(function (r) {
      dmSt = r; if (ovData) ovData.domain = r.domain || '';
      if (!dmOnTab()) return;
      renderSpace();
      if (r.state === 'purchasing') dmTimer = setTimeout(dmRefresh, 4000);
    }).catch(function (e) {
      if (!dmSt) dmSt = { state: 'none', enabled: false };
      if (dmOnTab()) { renderSpace(); if (dmSt.state === 'purchasing') dmTimer = setTimeout(dmRefresh, 8000); }
      toast(e.message || U('err'));
    });
  }
  function dmReset() { clearTimeout(dmTimer); dmSt = null; dmChk = null; dmVal = ''; dmBusy = false; }

  function drawDomain(w) {
    A(w, E('h3', '', U('dm_t')), E('p', 'cn-p', U('dm_i')));
    if (!dmSt) { loading(w); dmRefresh(); return; }
    if (dmSt.state === 'purchasing') return dmDrawProgress(w);
    if (dmSt.domain) return dmDrawCurrent(w);
    dmDrawStart(w);
  }

  function dmDrawStart(w) {
    var o = dmSt.order;
    if (o && o.status === 'refunded' && o.error) { var n = E('div', 'cn-note'), nb = E('div'); A(nb, E('p', '', U('dm_fail') + ' ' + o.error)); A(n, icon(IC.globe, 20), nb); w.appendChild(n); }
    var inp = field(w, U('dm_t'), 'text', dmVal, 100, 'monsite.com');
    inp.autocapitalize = 'none'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('autocorrect', 'off'); inp.setAttribute('inputmode', 'url');
    var box = E('div', 'cn-dmbox');
    var go = E('button', 'cn-b p', U('dm_go')); go.type = 'button';
    go.onclick = function () {
      var v = String(inp.value || '').trim(); if (!v) { toast(U('dm_none_in')); return; }
      dmVal = v; go.disabled = true; go.textContent = U('dm_chk');
      call('site_owner_domain_check', { domain: v }).then(function (r) { dmChk = r; renderSpace(); }).catch(function (e) { go.disabled = false; go.textContent = U('dm_go'); toast(e.message || U('err')); });
    };
    inp.addEventListener('input', function () { dmVal = inp.value; if (dmChk) { dmChk = null; box.textContent = ''; } });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });
    w.appendChild(go); w.appendChild(box);
    if (dmChk) dmDrawCheck(box);
    A(w, E('h3', '', U('dm_own_t')), E('p', 'cn-p', U('dm_own_i')));
    var own = E('button', 'cn-b', U('dm_own_b')); own.type = 'button';
    own.onclick = function () {
      var v = String(inp.value || '').trim(); if (!v) { toast(U('dm_none_in')); return; }
      own.disabled = true;
      call('site_owner_domain_save', { domain: v }).then(function (r) { dirty = true; dmReset(); toast(U(r.connect && r.connect.mode === 'auto' ? 'dm_auto' : 'dm_manual')); renderSpace(); }).catch(function (e) { own.disabled = false; toast(e.message || U('err')); });
    };
    w.appendChild(own);
  }

  function dmDrawCheck(box) {
    var c = dmChk, d = c.domain;
    if (c.state !== 'available') { var m = { taken: 'dm_taken', unsupported: 'dm_unsup', unreachable: 'dm_unr' }[c.state] || 'dm_unr'; var n = E('div', 'cn-note'), nb = E('div'); A(nb, E('b', '', d), E('p', '', U(m))); A(n, icon(IC.globe, 20), nb); box.appendChild(n); return; }
    var card = E('div', 'cn-dm'), pr = E('div', 'cn-price'), ul = E('ul', 'cn-ul'), low = c.balance < c.price;
    A(pr, E('b', '', c.price + ' $'), E('span', '', U('dm_yr')));
    A(card, E('h4', '', d + ' ' + U('dm_av')), pr);
    ['dm_inc1', 'dm_inc2', 'dm_inc3'].forEach(function (k) { var li = E('li'); A(li, icon(IC.check, 16), E('span', '', U(k))); ul.appendChild(li); });
    card.appendChild(ul);
    card.appendChild(E('p', 'cn-dmd', U('dm_bal') + ' : ' + c.balance + ' $'));
    if (!c.enabled) card.appendChild(E('p', 'cn-p', U('dm_off'))); else if (low) card.appendChild(E('p', 'cn-p', U('dm_low')));
    var bb = E('button', 'cn-b p', U('dm_buy') + ' — ' + c.price + ' $'); bb.type = 'button'; bb.disabled = !c.enabled || low;
    bb.onclick = function () {
      if (dmBusy || !confirm(dmFill('dm_cf', { d: d, p: c.price }))) return;
      dmBusy = true; bb.disabled = true;
      call('site_owner_domain_buy', { domain: d, price: c.price }).then(function () { dirty = true; dmReset(); renderSpace(); }).catch(function (e) {
        dmBusy = false; var x = (e && e.data) || {};
        if (x.code === 'price_changed' && x.price) { c.price = x.price; renderSpace(); } else bb.disabled = false;
        toast(e.message || U('err'));
      });
    };
    card.appendChild(bb); box.appendChild(card);
  }

  function dmDrawProgress(w) {
    var o = dmSt.order || {}, card = E('div', 'cn-dm'), ol = E('ul', 'cn-steps');
    A(card, E('h4', '', U('dm_p_t')), E('p', 'cn-dmd', o.domain || ''));
    [['dm_s1', 'ok'], ['dm_s2', 'on'], ['dm_s3', ''], ['dm_s4', '']].forEach(function (x) {
      var li = E('li', x[1]), ic = E('i'); if (x[1] === 'ok') ic.appendChild(icon(IC.check, 13)); A(li, ic, E('span', '', U(x[0]))); ol.appendChild(li);
    });
    card.appendChild(ol); card.appendChild(E('p', 'cn-p', U(o.status === 'review' ? 'dm_rev' : 'dm_p_i')));
    w.appendChild(card);
  }

  function dmDrawCurrent(w) {
    var s = dmSt, d = s.domain, live = s.state === 'live', card = E('div', 'cn-dm');
    A(card, E('span', 'cn-bd' + (live ? ' ok' : ''), live ? U('live') : U(s.state === 'manual' ? 'dm_man_h' : 'dm_pend')),
      E('h4', '', U(live ? 'dm_now' : (s.state === 'manual' ? 'dm_man_h' : 'dm_pend_h'))), E('p', 'cn-dmd', 'https://' + d));
    if (s.state === 'pending' && !s.dns) card.appendChild(E('p', 'cn-p', U('dm_pend_i')));
    if (s.state === 'manual') card.appendChild(E('p', 'cn-p', U('dm_manual')));
    if (s.owned && s.expiresAt) card.appendChild(E('p', 'cn-p', U('dm_exp') + ' ' + dmDate(s.expiresAt)));
    if (s.canRenew && s.renewPrice) {
      var rn = E('button', 'cn-b p', U('dm_renew') + ' — ' + s.renewPrice + ' $'); rn.type = 'button';
      rn.onclick = function () {
        if (!confirm(dmFill('dm_renew_cf', { d: d, p: s.renewPrice }))) return; rn.disabled = true;
        call('site_owner_domain_renew', { price: s.renewPrice }).then(function () { toast(U('dm_renewed')); dmSt = null; renderSpace(); }).catch(function (e) {
          var x = (e && e.data) || {}; if (x.code === 'price_changed' && x.price) { s.renewPrice = x.price; renderSpace(); } else rn.disabled = false; toast(e.message || U('err'));
        });
      };
      card.appendChild(rn);
    }
    if (s.dns) {
      A(card, E('p', 'cn-sub', U('dm_dns')), E('div', 'cn-code', 'A      @      ' + s.dns.a.value + '\nCNAME  www    ' + s.dns.cname.value), E('p', 'cn-p', U('dm_wait')));
    }
    if (s.state === 'pending' || s.state === 'manual') { var vf = E('button', 'cn-b', U('dm_verify')); vf.type = 'button'; vf.onclick = function () { vf.disabled = true; dmRefresh(); }; card.appendChild(vf); }
    if (live) {
      var vw = E('a', 'cn-b', U('dm_view')); vw.href = 'https://' + d; vw.target = '_blank'; vw.rel = 'noopener'; card.appendChild(vw);
      card.appendChild(E('p', 'cn-p', U('dm_seo')));
      var sb = E('button', 'cn-b', U('dm_seo_b')); sb.type = 'button'; sb.onclick = function () { editSub = 'seo'; renderSpace(); }; card.appendChild(sb);
    }
    w.appendChild(card);
    var rm = E('button', 'cn-b s', U('dm_remove')); rm.type = 'button';
    rm.onclick = function () {
      if (!confirm(U('dm_remove') + ' ?')) return; rm.disabled = true;
      call('site_owner_domain_save', { domain: '' }).then(function () { dirty = true; dmReset(); toast(U('dm_removed')); renderSpace(); }).catch(function (e) { rm.disabled = false; toast(e.message || U('err')); });
    };
    w.appendChild(rm);
    if (s.owned) w.appendChild(E('p', 'cn-sub', U('dm_keep')));
  }

  function drawGeneral(w) {
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

  /* ------------------------------------------------------------------ 8b. VISITEUR : mes commandes, installation sur l'écran */
  window.cnAuthToken = function () { return auth && auth.currentUser ? auth.currentUser.getIdToken() : ''; };
  var coHint = null, deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (typeof scheduleInsBar === 'function' && !isStandalone()) scheduleInsBar(); });
  function drawCoHint() {
    var f = document.getElementById('co-form'); if (!f || !C.co || C.preview) return;
    if (user) { if (coHint) { coHint.remove(); coHint = null; } return; }
    if (coHint) return;
    coHint = E('div', 'cn-cohint'); var b = E('button', '', U('login')); b.type = 'button'; b.onclick = function () { openLogin(U('co_track')); };
    A(coHint, E('span', '', U('co_track')), b); f.insertBefore(coHint, f.firstChild);
  }
  function openOrders() {
    var ov = overlay(), s = ov.s, hd = E('div', 'cn-hd'), x = E('button', 'cn-x'); x.type = 'button'; x.setAttribute('aria-label', U('close')); x.appendChild(icon(IC.x, 16)); x.onclick = function () { ov.o.remove(); };
    A(hd, E('h2', '', U('mo_t')), x); s.appendChild(hd);
    var box = E('div'); box.appendChild(E('p', 'cn-p', U('loading'))); s.appendChild(box);
    call('site_customer_orders', { siteId: C.id }).then(function (j) {
      box.textContent = '';
      if (!j.items.length) { box.appendChild(E('p', 'cn-p', U('mo_none'))); return; }
      j.items.forEach(function (o) {
        var c = E('div', 'cn-ord'), t = E('b', '', '#' + o.ref + (o.total ? ' · ' + o.total : ''));
        var meta = E('p', '', fmtDate(o.createdAt) + ' · ' + U('st_' + o.status) + ' · ' + U(o.paid ? 'mo_paid' : 'mo_unpaid') + (o.payLabel ? ' (' + o.payLabel + ')' : ''));
        var lines = E('p', '', o.items.map(function (i) { return i.q + ' × ' + i.n; }).join(', '));
        A(c, t, meta, lines); box.appendChild(c);
      });
    }).catch(function (e) { box.textContent = ''; box.appendChild(E('p', 'cn-p', e.message || U('err'))); });
  }
  // Installation sur l'écran d'accueil : bandeau discret en haut de page (une fois, puis plus pendant 14 jours),
  // bouton dans le pied de page, et explications pas à pas quand le navigateur ne propose pas l'installation lui-même.
  function isStandalone() { return !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone); }
  function insEnv() {
    var ua = navigator.userAgent || '';
    return {
      ios: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      inApp: /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|TikTok|musical_ly|; wv\)/i.test(ua)
    };
  }
  var insBar = null, insTimer = 0;
  function insKey() { return 'cn_ins_x_' + (C.slug || C.host || 's'); }
  function hideInsBar() { if (insBar) { insBar.remove(); insBar = null; } }
  // Le bouton « Installer » existe sur tous les sites publiés, et aussi dans l'aperçu du propriétaire (là, il explique seulement).
  function canInstallUi() { return !!(C.pwa || C.preview || C.sample); }
  function openInstallHelp() {
    var env = insEnv(), ov = overlay(), s = ov.s;
    var hd = E('div', 'cn-hd'), x = E('button', 'cn-x'); x.type = 'button'; x.setAttribute('aria-label', U('close')); x.appendChild(icon(IC.x, 16)); x.onclick = function () { ov.o.remove(); };
    A(hd, E('h2', '', U('ins_help_t')), x); A(s, hd);
    var ol = E('ol', 'cn-steps');
    (env.ios ? ['ins_i1', 'ins_i2', 'ins_i3'] : ['ins_a1', 'ins_a2', 'ins_a3']).forEach(function (k) { ol.appendChild(E('li', '', U(k))); });
    A(s, ol);
    if (env.inApp) A(s, E('p', 'cn-p', U('ins_tip')));
  }
  function installNow() {
    if (!C.pwa) { toast(U('ins_prev')); return; }
    if (deferredInstall) {
      var d = deferredInstall; deferredInstall = null; d.prompt();
      if (d.userChoice) d.userChoice.then(function (r) { if (r && r.outcome === 'accepted') hideInsBar(); });
      return;
    }
    openInstallHelp();
  }
  // Bandeau en haut de page : pour tout visiteur sur téléphone qui n'a pas encore installé le site (fermable, puis silence 14 jours).
  function showInsBar() {
    if (insBar || isStandalone() || !C.pwa || C.preview || C.sample) return;
    if (!(window.matchMedia && matchMedia('(max-width: 760px)').matches)) return;
    try { var t = parseInt(localStorage.getItem(insKey()) || '0', 10); if (t && Date.now() - t < 14 * 86400000) return; } catch (e) { /* ignore */ }
    var m = document.querySelector('meta[property="og:site_name"]'), name = (m && m.content) || document.title || '';
    var lg = document.querySelector('.topbar .brand-logo'), ic;
    if (lg && lg.tagName === 'IMG' && lg.src) { ic = E('img', 'ic'); ic.src = lg.src; ic.alt = ''; } else ic = E('span', 'ic', (name.trim().charAt(0) || '?').toUpperCase());
    var tx = E('div', 'tx'); A(tx, E('b', '', U('ins_bar').replace('{n}', name)), E('span', '', U('ins_bar_sub')));
    var go = E('button', 'go', U('ins_go')); go.type = 'button'; go.onclick = installNow;
    var no = E('button', 'no'); no.type = 'button'; no.setAttribute('aria-label', U('close')); no.appendChild(icon(IC.x, 14));
    no.onclick = function () { try { localStorage.setItem(insKey(), String(Date.now())); } catch (e) { /* ignore */ } hideInsBar(); };
    insBar = E('div', 'cn-rt cn-ibar'); A(insBar, ic, tx, go, no);
    document.body.insertBefore(insBar, document.body.firstChild);
  }
  function scheduleInsBar() { clearTimeout(insTimer); insTimer = setTimeout(showInsBar, 1500); }
  function drawInstallLabels() {
    if (insBtn) { insBtn.setAttribute('aria-label', U('ins_t')); var t = insBtn.querySelector('.t'); if (t) t.textContent = U('ins_go'); }
    var list = document.querySelectorAll('#cn-install, .hero-install');
    for (var i = 0; i < list.length; i++) { var b = list[i]; if (b.hidden || !b.firstChild) continue; b.lastChild.textContent = U(b.classList.contains('hero-install') ? 'ins_help_t' : 'ins_t'); }
    if (insBar) { hideInsBar(); showInsBar(); }
  }
  function wireInstallButtons() {
    // Pied de page (#cn-install) et bouton d'accueil (.hero-install) : même fonctionnement.
    var list = document.querySelectorAll('#cn-install, .hero-install');
    for (var i = 0; i < list.length; i++) {
      (function (b) {
        var hero = b.classList.contains('hero-install');
        b.textContent = ''; b.appendChild(icon(IC.download, 16)); b.appendChild(document.createTextNode(U(hero ? 'ins_help_t' : 'ins_t')));
        b.hidden = false; b.onclick = installNow;
      })(list[i]);
    }
  }
  // Sur Android, une application installée du même nom de domaine (ex. la plateforme) capte les liens du site et l'ouvre dans sa propre fenêtre :
  // le site n'y est alors pas installable. On le détecte (fenêtre « application » sans lancement du site lui-même) et on propose le navigateur.
  function ownLaunch() {
    var k = 'cn_own_' + (C.slug || C.host || 's');
    try { if (/[?&]source=pwa(&|$)/.test(location.search)) { sessionStorage.setItem(k, '1'); return true; } return sessionStorage.getItem(k) === '1'; } catch (e) { return true; }
  }
  function shellKey() { return 'cn_shell_x_' + (C.slug || C.host || 's'); }
  function showShellBar() {
    if (document.querySelector('.cn-shellbar') || !isStandalone() || !C.pwa || C.preview || C.sample) return;
    if (!/Android/i.test(navigator.userAgent || '') || ownLaunch()) return;
    try { var t = parseInt(localStorage.getItem(shellKey()) || '0', 10); if (t && Date.now() - t < 3 * 86400000) return; } catch (e) { /* ignore */ }
    var m = document.querySelector('meta[property="og:site_name"]'), name = (m && m.content) || document.title || '';
    var lg = document.querySelector('.topbar .brand-logo'), ic;
    if (lg && lg.tagName === 'IMG' && lg.src) { ic = E('img', 'ic'); ic.src = lg.src; ic.alt = ''; } else ic = E('span', 'ic', (name.trim().charAt(0) || '?').toUpperCase());
    var tx = E('div', 'tx'); A(tx, E('b', '', U('shell_t')), E('span', '', U('shell_sub')));
    var go = E('button', 'go', U('shell_go')); go.type = 'button';
    go.onclick = function () {
      var clean = location.search.replace(/([?&])source=pwa(&|$)/, '$1').replace(/[?&]$/, '');
      var path = location.pathname + clean + location.hash, full = location.origin + path;
      // Chrome est désigné par son nom : Android ne laisse pas l'autre application reprendre le lien.
      location.href = 'intent://' + location.host + path + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(full) + ';end';
    };
    var no = E('button', 'no'); no.type = 'button'; no.setAttribute('aria-label', U('close')); no.appendChild(icon(IC.x, 14));
    var bar = E('div', 'cn-rt cn-ibar cn-shellbar'); A(bar, ic, tx, go, no);
    no.onclick = function () { try { localStorage.setItem(shellKey(), String(Date.now())); } catch (e) { /* ignore */ } bar.remove(); };
    document.body.insertBefore(bar, document.body.firstChild);
  }
  function initInstall() {
    if (!canInstallUi()) return;
    if (C.pwa && 'serviceWorker' in navigator) { try { navigator.serviceWorker.register((C.base || '') + '/sw.js', { scope: (C.base || '') + '/' }).catch(function () { }); } catch (e) { /* ignore */ } }
    if (isStandalone()) { ownLaunch(); setTimeout(showShellBar, 900); return; }
    window.addEventListener('appinstalled', function () {
      var l = document.querySelectorAll('#cn-install, .hero-install'); for (var i = 0; i < l.length; i++) l[i].hidden = true;
      if (insBtn) insBtn.remove(); hideInsBar(); deferredInstall = null; toast(U('ins_ok'));
    });
    wireInstallButtons();
    scheduleInsBar();
  }

  /* ------------------------------------------------------------------ 9. DÉMARRAGE */
  function init() {
    injectCss(); buildTools();
    document.documentElement.lang = lang;
    if (lang !== 'fr') walk(document.body);
    startObserver();
    initInstall(); drawCoHint();
    if (C.preview) return;
    if (inviteToken) { loadFb(function (a) { if (a) setTimeout(function () { if (!user && inviteToken) openLogin(U('inv_login')); }, 1500); }); return; }
    var want = /[?&]espace=1\b/.test(location.search);
    if (want) { loadFb(function (a) { if (a && !user) { /* connexion demandée */ setTimeout(function () { if (!user && !spaceOpen) openLogin(); }, 1200); } }); return; }
    hasStoredAuth(function (yes) { if (yes) loadFb(function () { }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
