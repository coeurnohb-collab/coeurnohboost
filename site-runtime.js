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
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4'
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
    '@media(prefers-color-scheme:dark){.cn-btn{background:rgba(15,23,42,.6);color:#e2e8f0;border-color:rgba(148,163,184,.4)}}' +
    '.lay-aurora .cn-btn{background:rgba(255,255,255,.08);color:#e2e8f0;border-color:rgba(255,255,255,.25)}' +
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
    '.cn-os-h{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border,#e4e8ef);background:var(--card,#fff)}' +
    '.cn-os-h .tt{flex:1;min-width:0}.cn-os-h b{display:block;font-size:1.02rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cn-os-h small{color:var(--muted,#5b6678);font-size:.76rem}' +
    '.cn-tabs{display:flex;gap:4px;overflow-x:auto;padding:8px 10px;background:var(--card,#fff);border-bottom:1px solid var(--border,#e4e8ef);scrollbar-width:none}' +
    '.cn-tabs::-webkit-scrollbar{display:none}' +
    '.cn-tab{flex:0 0 auto;border:0;background:none;color:var(--muted,#5b6678);font:700 .86rem inherit;font-family:inherit;padding:9px 14px;border-radius:999px;cursor:pointer;position:relative}' +
    '.cn-tab.on{background:var(--accent,#2563eb);color:#fff}' +
    '.cn-tab .dot{position:absolute;top:5px;right:6px;width:8px;height:8px;border-radius:50%;background:#ef4444}' +
    '.cn-os-b{flex:1;overflow:auto;padding:14px;-webkit-overflow-scrolling:touch}' +
    '.cn-wrap{max-width:760px;margin:0 auto}' +
    '.cn-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0}' +
    '@media(min-width:640px){.cn-grid{grid-template-columns:repeat(3,1fr)}}' +
    '.cn-card{background:var(--card,#fff);border:1px solid var(--border,#e4e8ef);border-radius:16px;padding:14px;box-shadow:0 6px 20px -14px rgba(15,23,42,.3)}' +
    '.cn-card b.n{display:block;font-size:1.7rem;line-height:1.1;letter-spacing:-.02em}' +
    '.cn-card span.k{color:var(--muted,#5b6678);font-size:.78rem;font-weight:600}' +
    '.cn-card.link{cursor:pointer}.cn-card.link:hover{border-color:var(--accent,#2563eb)}' +
    '.cn-warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:14px;padding:12px 14px;font-size:.86rem;margin:10px 0}' +
    '.cn-chips{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 12px}' +
    '.cn-chip{border:1px solid var(--border,#e4e8ef);background:var(--card,#fff);color:var(--ink,#0f172a);border-radius:999px;padding:6px 12px;font:700 .78rem inherit;font-family:inherit;cursor:pointer}' +
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
  var TABS = ['ov', 'leads', 'edit', 'help', 'sec'];
  function openSpace() {
    if (!isOwner) return;
    if (spaceEl) spaceEl.remove();
    spaceEl = E('div', 'cn-rt cn-os'); spaceEl.setAttribute('role', 'dialog'); spaceEl.setAttribute('aria-modal', 'true');
    document.body.appendChild(spaceEl); document.documentElement.style.overflow = 'hidden'; spaceOpen = true;
    ovData = null; leadsData = null; helpData = null; tab = 'ov';
    var tm = /[?&]tab=(\w+)/.exec(location.search); if (tm && TABS.indexOf(tm[1]) >= 0) tab = tm[1];
    renderSpace(); loadTab();
  }
  function closeSpace() { if (spaceEl) spaceEl.remove(); spaceEl = null; spaceOpen = false; document.documentElement.style.overflow = ''; }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && spaceOpen) closeSpace(); });

  function renderSpace() {
    if (!spaceEl) return;
    spaceEl.textContent = '';
    var h = E('div', 'cn-os-h'), tt = E('div', 'tt');
    A(tt, E('b', '', (ovData && ovData.site.businessName) || C.name || U('myspace')), E('small', '', U('owner')));
    var x = E('button', 'cn-x'); x.type = 'button'; x.setAttribute('aria-label', U('close')); x.appendChild(icon(IC.x, 16)); x.onclick = closeSpace;
    A(h, icon(IC.grid, 22), tt, x);
    var tabs = E('div', 'cn-tabs'); tabs.setAttribute('role', 'tablist');
    TABS.forEach(function (k) {
      var b = E('button', 'cn-tab' + (k === tab ? ' on' : ''), U('t_' + k)); b.type = 'button'; b.setAttribute('role', 'tab');
      if ((k === 'leads' && ovData && ovData.leads.fresh) || (k === 'help' && ovData && ovData.help.unread && !(k === tab))) b.appendChild(E('i', 'dot'));
      b.onclick = function () { tab = k; renderSpace(); loadTab(); };
      tabs.appendChild(b);
    });
    var body = E('div', 'cn-os-b'), wrap = E('div', 'cn-wrap'); body.appendChild(wrap);
    A(spaceEl, h, tabs, body);
    drawTab(wrap);
  }
  function loading(w) { w.appendChild(E('p', 'cn-p', U('loading'))); }
  function drawTab(w) {
    if (tab === 'ov') return ovData ? drawOv(w) : loading(w);
    if (tab === 'leads') return leadsData ? drawLeads(w) : loading(w);
    if (tab === 'edit') return ovData ? drawEdit(w) : loading(w);
    if (tab === 'help') return helpData ? drawHelp(w) : loading(w);
    return drawSec(w);
  }
  function loadTab() {
    var need = null;
    if ((tab === 'ov' || tab === 'edit') && !ovData) need = call('site_owner_overview', {}).then(function (j) { ovData = j; });
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
  function drawOv(w) {
    var d = ovData, st = d.site;
    A(w, E('h3', '', U('hello') + (user && user.displayName ? ' ' + user.displayName.split(' ')[0] : '') + ' 👋'), E('p', 'cn-p', U('welcome')));
    if (!st.published) w.appendChild(E('div', 'cn-warn', U('unpub')));
    var g = E('div', 'cn-grid');
    A(g, statCard(d.stats ? d.stats.total.view : st.viewsCount, U('v30')), statCard(d.stats ? d.stats.actions : 0, U('act')),
      statCard(d.leads.fresh, U('newq'), function () { tab = 'leads'; renderSpace(); loadTab(); }),
      statCard(d.leads.message, U('msgs'), function () { tab = 'leads'; leadFilter = 'message'; renderSpace(); loadTab(); }),
      statCard(d.leads.appointment, U('appts'), function () { tab = 'leads'; leadFilter = 'appointment'; renderSpace(); loadTab(); }),
      statCard(d.leads.newsletter, U('subs'), function () { tab = 'leads'; leadFilter = 'newsletter'; renderSpace(); loadTab(); }));
    w.appendChild(g);
    if (d.stats && d.stats.series && d.stats.series.length) { var c = E('div', 'cn-card'); c.style.color = 'var(--accent,#2563eb)'; A(c, E('span', 'k', U('v30')), spark(d.stats.series)); w.appendChild(c); }
    var url = location.origin + '/s/' + st.slug;
    var see = E('a', 'cn-b p', U('seeSite')); see.href = url; see.style.marginTop = '14px'; see.onclick = function (e) { e.preventDefault(); closeSpace(); window.scrollTo({ top: 0 }); };
    var app = E('a', 'cn-b', U('editApp')); app.href = '/?mysite=1';
    var cp = E('button', 'cn-b', U('copy')); cp.type = 'button'; cp.onclick = function () { try { navigator.clipboard.writeText(url).then(function () { toast(U('copied')); }, function () { toast(url); }); } catch (e) { toast(url); } };
    A(w, see, app, cp);
  }

  function tagFor(l) { var s = l.status || 'new'; return E('span', 'cn-tag ' + (s === 'new' ? 'new' : s === 'cancelled' ? 'no' : 'ok'), U('st_' + s)); }
  function digits(v) { return String(v || '').replace(/[^0-9]/g, ''); }
  function leadAction(l, label, status) {
    var b = E('button', 'cn-b s', label); b.type = 'button';
    b.onclick = function () { b.disabled = true; call('leads_update', { leadId: l.id, status: status }).then(function () { l.status = status; if (ovData && status !== 'new') { } renderSpace(); }).catch(function (e) { b.disabled = false; toast(e.message); }); };
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
      call('site_owner_update', body).then(function () { EDIT_FIELDS.forEach(function (f) { st[f[0]] = body[f[0]]; }); save.disabled = false; toast(U('saved')); }).catch(function (e) { save.disabled = false; toast(e.message); });
    };
    w.appendChild(save);
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

  function drawSec(w) {
    w.appendChild(E('h3', '', U('s_title')));
    ['s1', 's2', 's3', 's4', 's5'].forEach(function (k) { var r = E('div', 'cn-sec'); A(r, icon(IC.shield, 20), E('span', '', U(k))); w.appendChild(r); });
    var rs = E('button', 'cn-b', U('s_reset')); rs.type = 'button'; rs.style.marginTop = '12px';
    rs.onclick = function () { if (!user || !user.email) return; auth.sendPasswordResetEmail(user.email).then(function () { toast(U('sent')); }).catch(function () { toast(U('err')); }); };
    var lo = E('button', 'cn-b', U('s_logout')); lo.type = 'button'; lo.onclick = function () { closeSpace(); if (auth) auth.signOut(); };
    A(w, rs, lo);
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
