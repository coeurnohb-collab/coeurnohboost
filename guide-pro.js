/* =====================================================================
   guide-pro.js — Guide d'utilisation de Coeurnoh Universe (refait à zéro)
   Chargé à la demande par script.js (openTutorial). Jamais bloquant :
   s'il ne se charge pas, l'application fonctionne normalement.

   - 14 sujets, du plus utile au plus occasionnel, avec une image par sujet.
   - 5 langues (fr, en, es, it, pt). Les images ne contiennent aucun texte :
     elles sont donc identiques dans toutes les langues.
   - Un bouton « Ouvrir » mène directement à l'écran concerné.
   - Ouvre : window.CNGuide.open() ou window.CNGuide.open('wallet').
   ===================================================================== */
(function () {
  'use strict';
  if (window.CNGuide) return;

  var SEEN_KEY = 'coeurnohboost_tutorial_seen';
  var DONE_KEY = 'cn_guide_done_v2';

  /* ---------------- Ordre et actions ---------------- */
  var ORDER = ['start', 'home', 'chat', 'wallet', 'boost', 'shop', 'site', 'biz', 'work', 'local', 'events', 'tools', 'earn', 'account'];
  var GO = {
    start: ['openMainMenu'], home: ['showDashTab', 'home'], chat: ['showDashTab', 'messages'], wallet: ['showDashTab', 'wallet'],
    boost: ['showDashTab', 'orders'], shop: ['showShop'], site: ['openSiteBuilderScreen'], biz: ['openBusinessScreen'],
    work: ['openJobsScreen'], local: ['openImmoScreen'], events: ['openEventsScreen'], tools: ['openMainMenu'],
    earn: ['goToAccountSection', 'section-referral'], account: ['goToAccountSection', 'section-security']
  };
  var ICON_OF = {
    start: 'compass', home: 'home', chat: 'chat', wallet: 'card', boost: 'trend', shop: 'bag', site: 'globe', biz: 'file',
    work: 'cap', local: 'pin', events: 'ticket', tools: 'grid', earn: 'gift', account: 'shield'
  };

  /* ---------------- Textes (5 langues) ---------------- */
  var D = {
    fr: {
      ui: { title: 'Guide d’utilisation', kicker: 'Guide', sub: 'Apprends à utiliser Coeurnoh Universe en quelques minutes, sujet par sujet.', start: 'Commencer le guide', resume: 'Reprendre', topics: 'Tous les sujets', back: 'Tous les sujets', prev: 'Précédent', next: 'Suivant', done: 'Terminer', close: 'Fermer', signup: 'Créer mon compte', tip: 'Bon à savoir', steps: 'Pas à pas', seen: 'Vu', of: 'sur', min: 'Environ 3 minutes', finished: 'Guide terminé. Bonne utilisation !', hint: 'Fais glisser l’écran pour changer de sujet.' },
      ch: {
        start: { t: 'Se repérer dans l’application', s: 'Six boutons en bas de l’écran, et le Menu pour tout le reste.', a: ['En bas de l’écran, six boutons : Accueil, Messages, Portefeuille, Boutique, Notifs et Menu.', 'Appuie sur Menu pour trouver tous les services : site web, factures, emploi, Académie, immobilier, événements, outils gratuits…', 'Tire l’écran vers le bas pour l’actualiser.', 'Ce guide se rouvre à tout moment : Menu › Aide & informations › Guide d’utilisation.'], tip: 'Installe l’application sur ton téléphone : elle s’ouvre comme une vraie application, sans barre d’adresse.', go: 'Ouvrir le Menu' },
        home: { t: 'Accueil : publier et partager', s: 'Ton fil d’actualité, comme sur les grands réseaux.', a: ['Appuie sur la zone « Exprime-toi, publie une photo… » pour écrire un message, ajouter une photo ou une vidéo.', 'Ajoute une story en haut de l’écran pour montrer un moment à tes abonnés.', 'Aime, commente ou partage une publication : la personne reçoit une notification.', 'Utilise « Rechercher un compte… » pour retrouver une personne ou une entreprise.'], tip: 'Appuie sur le nom d’un auteur pour ouvrir son profil et lui écrire.', go: 'Ouvrir l’Accueil' },
        chat: { t: 'Messages et appels', s: 'Discute en privé avec n’importe quel membre.', a: ['Ouvre l’onglet Messages, puis choisis une conversation, ou démarre-en une depuis un profil.', 'Envoie du texte, des photos, des vidéos, des documents ou un message vocal.', 'Les coches montrent l’état : une coche = envoyé, deux coches = reçu, deux coches bleues = lu.', 'Appuie sur l’icône d’appel pour passer un appel audio ou vidéo.'], tip: 'Application fermée ? Le message arrive sur l’écran du téléphone et tu peux répondre directement depuis la notification.', go: 'Ouvrir Messages' },
        wallet: { t: 'Recharger mon portefeuille', s: 'Ton solde paie les services, la boutique et le Pack Pro de ton site.', a: ['Ouvre l’onglet Portefeuille et choisis un moyen de recharge.', 'Mobile Money : choisis ton pays et ton opérateur (Orange Money, M-Pesa, Airtel Money, MTN MoMo, Wave…), entre ton numéro et le montant.', 'Crypto (USDT, Bitcoin…) ou carte : tu es envoyé vers la page de paiement sécurisée du fournisseur.', 'Ton solde est crédité dès que le paiement est confirmé. L’historique reste dans le Portefeuille.'], tip: 'Ne donne jamais ton code secret Mobile Money. L’application ne te le demande jamais.', go: 'Ouvrir le Portefeuille' },
        boost: { t: 'Booster mes réseaux sociaux', s: 'Abonnés, likes, vues : commande en quelques touches.', a: ['Ouvre Menu puis Réseau.', 'Choisis le réseau : TikTok, Instagram, YouTube, Facebook…', 'Choisis le service (abonnés, likes, vues…) et le niveau de qualité : Standard, Premium ou VIP.', 'Colle le lien de ton profil ou de ta publication, choisis la quantité et valide. Le prix est pris sur ton solde.'], tip: 'Ton profil doit être public pour que la livraison puisse démarrer.', go: 'Ouvrir Réseau' },
        shop: { t: 'Boutique : acheter et vendre', s: 'Livres numériques et produits, payés avec ton solde.', a: ['Ouvre l’onglet Boutique : choisis Livres ou Produits, ou utilise la recherche.', 'Appuie sur Commander : le prix est débité de ton solde. Un livre reste ensuite dans ta bibliothèque.', 'Pour un produit, écris au vendeur par WhatsApp (bouton sur l’article) pour convenir de la livraison.', 'Tu veux vendre ? Appuie sur Vendre, ajoute la photo et le prix, puis publie.'], tip: 'Dans le panier, une remise de 5 % s’applique dès 4 articles.', go: 'Ouvrir la Boutique' },
        site: { t: 'Créer mon site web', s: 'Un vrai site pour ton activité, sans écrire une ligne de code.', a: ['Ouvre Menu › Crée ton site.', 'Entre le nom de ton activité et choisis un modèle : ton adresse coeurnohuniverse.com/s/ton-nom est créée.', 'Ajoute tes photos, tes produits ou services, tes horaires et tes contacts, puis appuie sur Publier mon site.', 'Pack Pro : ton propre nom de domaine (ex. monsalon.com), plus d’outils de vente et de statistiques. Choisis 1, 3, 6, 12 ou 36 mois : plus la durée est longue, moins tu paies par mois.', 'Ton site est prêt ? Tu peux le donner à ton client avec « Donner mon site » : il en devient propriétaire et paie l’abonnement.'], tip: 'Tu crées des sites pour d’autres personnes ? Utilise « Créer le site pour un client ».', go: 'Ouvrir Crée ton site' },
        biz: { t: 'Entreprise, factures et reçus', s: 'Présente ton entreprise et gère tes clients.', a: ['Menu › Entreprises : crée la fiche de ton entreprise (logo, description, contacts).', 'Publie des actualités et des offres pour attirer des clients.', 'Menu › Factures & Reçus : crée une facture ou un reçu et partage-le par WhatsApp.', 'Dans le Portefeuille, « Mon activité » rassemble les factures à encaisser, tes événements et tes demandes en cours.'], tip: 'Ajoute ton numéro WhatsApp à la fiche : tes clients te contactent en un seul geste.', go: 'Ouvrir Entreprises' },
        work: { t: 'Emploi, formation et professionnels', s: 'Trouve un travail, apprends, ou trouve la bonne personne.', a: ['Menu › Emploi & Freelance : cherche une offre par ville ou mot-clé, ou publie ta demande d’emploi.', 'Menu › Académie : suis des cours en ligne, avec quiz et certificats.', 'Menu › Trouver un professionnel : demande un devis à un artisan ou à un prestataire.', 'Tu recrutes ? Appuie sur Publier une offre.'], tip: 'Un profil complet (photo, nom, ville) inspire davantage confiance.', go: 'Ouvrir Emploi & Freelance' },
        local: { t: 'Immobilier, voyages et près de chez vous', s: 'Trouve ou publie une annonce, réserve, explore.', a: ['Menu › Immobilier : parcours les annonces à vendre ou à louer, ou publie la tienne.', 'Menu › Voyages : découvre des lieux et des bons plans, ou publie un lieu.', 'Menu › Réservation en ligne : prends ou reçois des rendez-vous.', 'Menu › Près de chez vous : la carte des commerces et des services autour de toi.'], tip: 'Tu choisis toi-même si l’application peut utiliser ta position.', go: 'Ouvrir Immobilier' },
        events: { t: 'Événements, concours et alertes', s: 'Billets avec QR code, jeux concours et alertes.', a: ['Menu › Événements & Billetterie : achète un e-billet, un QR code arrive dans l’application.', 'Organisateur : publie ton événement et valide les entrées en scannant les QR codes.', 'Menu › Concours & Récompenses : participe, vote, ou crée ton propre concours.', 'Menu › Alertes : signale ou reçois un avis important (objet perdu, information…).'], tip: 'Appuie sur ton billet pour afficher le QR code en plein écran.', go: 'Ouvrir Événements' },
        tools: { t: 'Boîte à outils gratuite', s: 'Huit outils utiles, sans payer.', a: ['Ouvre Menu › Boîte à outils gratuite.', 'QR code, lien WhatsApp direct, polices de texte pour tes bios, taux de change, affiches et citations, maquettes de produits, hashtags.', 'Centre de localisation : partage ta position avec tes proches ou lance une alerte SOS.', 'Chaque outil produit une image ou un lien que tu peux enregistrer ou partager.'], tip: 'Le taux de change gère le franc congolais, le FCFA, le dollar, l’euro et bien d’autres devises.', go: 'Ouvrir le Menu' },
        earn: { t: 'Parrainage et gains', s: 'Invite tes amis : tu gagnes 5 % de leurs recharges.', a: ['Ouvre Menu › Parrainage et copie ton lien personnel.', 'Envoie-le par WhatsApp ou sur tes réseaux, avec les messages prêts à l’emploi.', 'Quand un ami s’inscrit avec ton lien puis recharge, 5 % du montant est ajouté à ton solde.', 'Suis tes filleuls, tes gains et ton niveau dans la même page.'], tip: 'Tes gains s’utilisent comme n’importe quel solde : services, boutique, Pack Pro.', go: 'Ouvrir Parrainage' },
        account: { t: 'Mon compte, sécurité et aide', s: 'Règle l’application à ta façon.', a: ['Menu › Compte : change ton nom et ta photo.', 'Menu › Sécurité : mot de passe, et téléchargement de toutes tes données.', 'Menu › Notifications : choisis ce que tu reçois. Application fermée, elles arrivent sur l’écran du téléphone, comme sur WhatsApp.', 'Menu › Apparence : mode sombre et taille du texte. Menu › Langue : français, anglais, espagnol, italien ou portugais.', 'Besoin d’aide ? Menu › Assistance : envoie une demande et suis la réponse.'], tip: 'Pour installer l’application : bouton « Installer l’app », ou menu du navigateur › Ajouter à l’écran d’accueil.', go: 'Ouvrir Sécurité' }
      }
    },
    en: {
      ui: { title: 'User guide', kicker: 'Guide', sub: 'Learn how to use Coeurnoh Universe in a few minutes, one topic at a time.', start: 'Start the guide', resume: 'Resume', topics: 'All topics', back: 'All topics', prev: 'Previous', next: 'Next', done: 'Finish', close: 'Close', signup: 'Create my account', tip: 'Good to know', steps: 'Step by step', seen: 'Seen', of: 'of', min: 'About 3 minutes', finished: 'Guide complete. Enjoy the app!', hint: 'Swipe to change topic.' },
      ch: {
        start: { t: 'Finding your way around', s: 'Six buttons at the bottom of the screen, and the Menu for everything else.', a: ['At the bottom of the screen: Home, Messages, Wallet, Shop, Notifs and Menu.', 'Tap Menu to find every service: website, invoices, jobs, Academy, real estate, events, free tools…', 'Pull the screen down to refresh it.', 'You can reopen this guide at any time: Menu › Help & information › User guide.'], tip: 'Install the app on your phone: it opens like a real app, without an address bar.', go: 'Open the Menu' },
        home: { t: 'Home: post and share', s: 'Your news feed, like on the big networks.', a: ['Tap the “Express yourself, post a photo…” box to write a message or add a photo or video.', 'Add a story at the top of the screen to share a moment with your followers.', 'Like, comment or share a post: the person gets a notification.', 'Use “Search for an account…” to find a person or a business.'], tip: 'Tap an author’s name to open their profile and message them.', go: 'Open Home' },
        chat: { t: 'Messages and calls', s: 'Chat privately with any member.', a: ['Open the Messages tab, then pick a conversation or start one from a profile.', 'Send text, photos, videos, documents or a voice message.', 'The ticks show the status: one tick = sent, two ticks = received, two blue ticks = read.', 'Tap the call icon to make an audio or video call.'], tip: 'App closed? The message appears on your phone screen and you can reply straight from the notification.', go: 'Open Messages' },
        wallet: { t: 'Top up my wallet', s: 'Your balance pays for services, the shop and your website’s Pro Pack.', a: ['Open the Wallet tab and choose a way to top up.', 'Mobile Money: choose your country and operator (Orange Money, M-Pesa, Airtel Money, MTN MoMo, Wave…), then enter your number and the amount.', 'Crypto (USDT, Bitcoin…) or card: you are sent to the provider’s secure payment page.', 'Your balance is credited as soon as the payment is confirmed. The history stays in the Wallet.'], tip: 'Never share your Mobile Money PIN. The app never asks for it.', go: 'Open the Wallet' },
        boost: { t: 'Boost my social media', s: 'Followers, likes, views: order in a few taps.', a: ['Open Menu, then Network.', 'Choose the network: TikTok, Instagram, YouTube, Facebook…', 'Choose the service (followers, likes, views…) and the quality level: Standard, Premium or VIP.', 'Paste the link to your profile or post, choose the quantity and confirm. The price is taken from your balance.'], tip: 'Your profile must be public so that delivery can start.', go: 'Open Network' },
        shop: { t: 'Shop: buy and sell', s: 'Digital books and products, paid with your balance.', a: ['Open the Shop tab: choose Books or Products, or use the search.', 'Tap Order: the price is taken from your balance. A book then stays in your library.', 'For a product, message the seller on WhatsApp (button on the item) to agree on delivery.', 'Want to sell? Tap Sell, add the photo and price, then publish.'], tip: 'In the cart, a 5% discount applies from 4 items.', go: 'Open the Shop' },
        site: { t: 'Build my website', s: 'A real website for your business, without writing a line of code.', a: ['Open Menu › Build your website.', 'Enter your business name and pick a template: your address coeurnohuniverse.com/s/your-name is created.', 'Add your photos, products or services, opening hours and contacts, then tap Publish my site.', 'Pro Pack: your own domain name (e.g. mysalon.com), plus more sales and statistics tools. Choose 1, 3, 6, 12 or 36 months: the longer the term, the less you pay per month.', 'Site ready? You can hand it over to your client with “Give my site”: they become the owner and pay the subscription.'], tip: 'Building sites for other people? Use “Create the site for a client”.', go: 'Open Build your website' },
        biz: { t: 'Business, invoices and receipts', s: 'Present your business and manage your customers.', a: ['Menu › Businesses: create your business page (logo, description, contacts).', 'Post news and offers to attract customers.', 'Menu › Invoices & Receipts: create an invoice or a receipt and share it on WhatsApp.', 'In the Wallet, “My activity” gathers invoices to collect, your events and your pending requests.'], tip: 'Add your WhatsApp number to the page: customers reach you in one tap.', go: 'Open Businesses' },
        work: { t: 'Jobs, training and professionals', s: 'Find a job, learn, or find the right person.', a: ['Menu › Jobs & Freelance: search offers by city or keyword, or post your job request.', 'Menu › Academy: follow online courses, with quizzes and certificates.', 'Menu › Find a professional: ask a craftsperson or provider for a quote.', 'Hiring? Tap Post an offer.'], tip: 'A complete profile (photo, name, city) builds more trust.', go: 'Open Jobs & Freelance' },
        local: { t: 'Real estate, travel and near you', s: 'Find or post a listing, book, explore.', a: ['Menu › Real Estate: browse listings for sale or rent, or post your own.', 'Menu › Travel: discover places and good deals, or post a place.', 'Menu › Online Booking: make or receive appointments.', 'Menu › Near You: the map of shops and services around you.'], tip: 'You decide whether the app may use your location.', go: 'Open Real Estate' },
        events: { t: 'Events, contests and alerts', s: 'Tickets with QR codes, contests and alerts.', a: ['Menu › Events & Ticketing: buy an e-ticket, a QR code arrives in the app.', 'Organizer: post your event and check people in by scanning QR codes.', 'Menu › Contests & Rewards: take part, vote, or create your own contest.', 'Menu › Alerts: report or receive an important notice (lost item, information…).'], tip: 'Tap your ticket to show the QR code full screen.', go: 'Open Events' },
        tools: { t: 'Free toolbox', s: 'Eight useful tools, no payment needed.', a: ['Open Menu › Free toolbox.', 'QR code, direct WhatsApp link, text fonts for your bios, exchange rates, posters and quotes, product mockups, hashtags.', 'Location center: share your position with loved ones or trigger an SOS alert.', 'Each tool produces an image or a link you can save or share.'], tip: 'The exchange rate tool handles the Congolese franc, CFA francs, the dollar, the euro and many more currencies.', go: 'Open the Menu' },
        earn: { t: 'Referrals and earnings', s: 'Invite your friends: you earn 5% of their top-ups.', a: ['Open Menu › Referrals and copy your personal link.', 'Send it on WhatsApp or your networks, with the ready-made messages.', 'When a friend signs up with your link and tops up, 5% of the amount is added to your balance.', 'Track your referrals, earnings and level on the same page.'], tip: 'Your earnings work like any balance: services, shop, Pro Pack.', go: 'Open Referrals' },
        account: { t: 'My account, security and help', s: 'Set the app up your way.', a: ['Menu › Account: change your name and photo.', 'Menu › Security: password, and download of all your data.', 'Menu › Notifications: choose what you receive. When the app is closed, they appear on your phone screen, like on WhatsApp.', 'Menu › Appearance: dark mode and text size. Menu › Language: French, English, Spanish, Italian or Portuguese.', 'Need help? Menu › Support: send a request and follow the answer.'], tip: 'To install the app: “Install app” button, or browser menu › Add to home screen.', go: 'Open Security' }
      }
    },
    es: {
      ui: { title: 'Guía de uso', kicker: 'Guía', sub: 'Aprende a usar Coeurnoh Universe en pocos minutos, tema por tema.', start: 'Empezar la guía', resume: 'Continuar', topics: 'Todos los temas', back: 'Todos los temas', prev: 'Anterior', next: 'Siguiente', done: 'Terminar', close: 'Cerrar', signup: 'Crear mi cuenta', tip: 'Conviene saber', steps: 'Paso a paso', seen: 'Visto', of: 'de', min: 'Unos 3 minutos', finished: 'Guía terminada. ¡Disfruta la aplicación!', hint: 'Desliza para cambiar de tema.' },
      ch: {
        start: { t: 'Orientarse en la aplicación', s: 'Seis botones abajo y el Menú para todo lo demás.', a: ['Abajo de la pantalla: Inicio, Mensajes, Billetera, Tienda, Notifs y Menú.', 'Toca Menú para encontrar todos los servicios: sitio web, facturas, empleo, Academia, inmobiliaria, eventos, herramientas gratuitas…', 'Desliza la pantalla hacia abajo para actualizarla.', 'Puedes abrir esta guía cuando quieras: Menú › Ayuda e información › Guía de uso.'], tip: 'Instala la aplicación en tu teléfono: se abre como una aplicación real, sin barra de direcciones.', go: 'Abrir el Menú' },
        home: { t: 'Inicio: publicar y compartir', s: 'Tu muro de noticias, como en las grandes redes.', a: ['Toca el cuadro “Expresate, publica una foto…” para escribir un mensaje o añadir una foto o un vídeo.', 'Añade una historia arriba de la pantalla para mostrar un momento a tus seguidores.', 'Da me gusta, comenta o comparte una publicación: la persona recibe una notificación.', 'Usa “Buscar una cuenta…” para encontrar a una persona o una empresa.'], tip: 'Toca el nombre de un autor para abrir su perfil y escribirle.', go: 'Abrir Inicio' },
        chat: { t: 'Mensajes y llamadas', s: 'Habla en privado con cualquier miembro.', a: ['Abre la pestaña Mensajes y elige una conversación, o empieza una desde un perfil.', 'Envía texto, fotos, vídeos, documentos o un mensaje de voz.', 'Las marcas muestran el estado: una marca = enviado, dos marcas = recibido, dos marcas azules = leído.', 'Toca el icono de llamada para hacer una llamada de audio o de vídeo.'], tip: '¿Aplicación cerrada? El mensaje aparece en la pantalla del teléfono y puedes responder desde la notificación.', go: 'Abrir Mensajes' },
        wallet: { t: 'Recargar mi billetera', s: 'Tu saldo paga los servicios, la tienda y el Pack Pro de tu sitio.', a: ['Abre la pestaña Billetera y elige cómo recargar.', 'Mobile Money: elige tu país y tu operador (Orange Money, M-Pesa, Airtel Money, MTN MoMo, Wave…), escribe tu número y el importe.', 'Cripto (USDT, Bitcoin…) o tarjeta: te llevamos a la página de pago segura del proveedor.', 'Tu saldo se acredita en cuanto se confirma el pago. El historial queda en la Billetera.'], tip: 'Nunca des tu código secreto de Mobile Money. La aplicación nunca te lo pide.', go: 'Abrir la Billetera' },
        boost: { t: 'Impulsar mis redes sociales', s: 'Seguidores, me gusta, vistas: pide en pocos toques.', a: ['Abre Menú y luego Red.', 'Elige la red: TikTok, Instagram, YouTube, Facebook…', 'Elige el servicio (seguidores, me gusta, vistas…) y el nivel de calidad: Standard, Premium o VIP.', 'Pega el enlace de tu perfil o publicación, elige la cantidad y confirma. El precio se descuenta de tu saldo.'], tip: 'Tu perfil debe ser público para que la entrega pueda empezar.', go: 'Abrir Red' },
        shop: { t: 'Tienda: comprar y vender', s: 'Libros digitales y productos, pagados con tu saldo.', a: ['Abre la pestaña Tienda: elige Libros o Productos, o usa el buscador.', 'Toca Pedir: el precio se descuenta de tu saldo. Un libro queda después en tu biblioteca.', 'Para un producto, escribe al vendedor por WhatsApp (botón del artículo) para acordar la entrega.', '¿Quieres vender? Toca Vender, añade la foto y el precio, y publica.'], tip: 'En el carrito se aplica un 5 % de descuento desde 4 artículos.', go: 'Abrir la Tienda' },
        site: { t: 'Crear mi sitio web', s: 'Un sitio de verdad para tu actividad, sin escribir una línea de código.', a: ['Abre Menú › Crea tu sitio web.', 'Escribe el nombre de tu actividad y elige una plantilla: se crea tu dirección coeurnohuniverse.com/s/tu-nombre.', 'Añade tus fotos, productos o servicios, horarios y contactos, y toca Publicar mi sitio.', 'Pack Pro: tu propio nombre de dominio (p. ej. misalon.com), más herramientas de venta y estadísticas. Elige 1, 3, 6, 12 o 36 meses: cuanto más largo, menos pagas al mes.', '¿Sitio listo? Puedes entregarlo a tu cliente con “Dar mi sitio”: pasa a ser el propietario y paga la suscripción.'], tip: '¿Creas sitios para otras personas? Usa “Crear el sitio para un cliente”.', go: 'Abrir Crea tu sitio web' },
        biz: { t: 'Empresa, facturas y recibos', s: 'Presenta tu empresa y gestiona a tus clientes.', a: ['Menú › Empresas: crea la ficha de tu empresa (logotipo, descripción, contactos).', 'Publica noticias y ofertas para atraer clientes.', 'Menú › Facturas y Recibos: crea una factura o un recibo y compártelo por WhatsApp.', 'En la Billetera, “Mi actividad” reúne las facturas por cobrar, tus eventos y tus solicitudes en curso.'], tip: 'Añade tu número de WhatsApp a la ficha: tus clientes te contactan con un toque.', go: 'Abrir Empresas' },
        work: { t: 'Empleo, formación y profesionales', s: 'Encuentra trabajo, aprende o encuentra a la persona adecuada.', a: ['Menú › Empleo y Freelance: busca ofertas por ciudad o palabra clave, o publica tu solicitud de empleo.', 'Menú › Academia: sigue cursos en línea, con cuestionarios y certificados.', 'Menú › Encontrar un profesional: pide un presupuesto a un artesano o prestador.', '¿Contratas? Toca Publicar una oferta.'], tip: 'Un perfil completo (foto, nombre, ciudad) da más confianza.', go: 'Abrir Empleo y Freelance' },
        local: { t: 'Inmobiliaria, viajes y cerca de ti', s: 'Encuentra o publica un anuncio, reserva, explora.', a: ['Menú › Inmobiliaria: consulta anuncios en venta o alquiler, o publica el tuyo.', 'Menú › Viajes: descubre lugares y buenas ofertas, o publica un lugar.', 'Menú › Reserva en línea: pide o recibe citas.', 'Menú › Cerca de ti: el mapa de comercios y servicios a tu alrededor.'], tip: 'Tú decides si la aplicación puede usar tu ubicación.', go: 'Abrir Inmobiliaria' },
        events: { t: 'Eventos, concursos y alertas', s: 'Entradas con código QR, concursos y alertas.', a: ['Menú › Eventos y Entradas: compra una entrada electrónica, un código QR llega a la aplicación.', 'Organizador: publica tu evento y valida los accesos escaneando los códigos QR.', 'Menú › Concursos y Recompensas: participa, vota o crea tu concurso.', 'Menú › Alertas: avisa o recibe un aviso importante (objeto perdido, información…).'], tip: 'Toca tu entrada para ver el código QR a pantalla completa.', go: 'Abrir Eventos' },
        tools: { t: 'Herramientas gratuitas', s: 'Ocho herramientas útiles, sin pagar.', a: ['Abre Menú › Herramientas gratuitas.', 'Código QR, enlace directo de WhatsApp, fuentes de texto para tus biografías, tipos de cambio, carteles y citas, maquetas de productos, hashtags.', 'Centro de localización: comparte tu posición con tus allegados o lanza una alerta SOS.', 'Cada herramienta crea una imagen o un enlace que puedes guardar o compartir.'], tip: 'El tipo de cambio incluye el franco congoleño, los francos CFA, el dólar, el euro y muchas más monedas.', go: 'Abrir el Menú' },
        earn: { t: 'Referidos y ganancias', s: 'Invita a tus amigos: ganas el 5 % de sus recargas.', a: ['Abre Menú › Referidos y copia tu enlace personal.', 'Envíalo por WhatsApp o por tus redes, con los mensajes ya preparados.', 'Cuando un amigo se registra con tu enlace y recarga, el 5 % del importe se añade a tu saldo.', 'Sigue a tus referidos, tus ganancias y tu nivel en la misma página.'], tip: 'Tus ganancias se usan como cualquier saldo: servicios, tienda, Pack Pro.', go: 'Abrir Referidos' },
        account: { t: 'Mi cuenta, seguridad y ayuda', s: 'Configura la aplicación a tu manera.', a: ['Menú › Cuenta: cambia tu nombre y tu foto.', 'Menú › Seguridad: contraseña y descarga de todos tus datos.', 'Menú › Notificaciones: elige lo que recibes. Con la aplicación cerrada, llegan a la pantalla del teléfono, como en WhatsApp.', 'Menú › Apariencia: modo oscuro y tamaño del texto. Menú › Idioma: francés, inglés, español, italiano o portugués.', '¿Necesitas ayuda? Menú › Soporte: envía una solicitud y sigue la respuesta.'], tip: 'Para instalar la aplicación: botón “Instalar app”, o menú del navegador › Añadir a la pantalla de inicio.', go: 'Abrir Seguridad' }
      }
    },
    it: {
      ui: { title: 'Guida all’uso', kicker: 'Guida', sub: 'Impara a usare Coeurnoh Universe in pochi minuti, un argomento alla volta.', start: 'Inizia la guida', resume: 'Riprendi', topics: 'Tutti gli argomenti', back: 'Tutti gli argomenti', prev: 'Indietro', next: 'Avanti', done: 'Fine', close: 'Chiudi', signup: 'Crea il mio account', tip: 'Da sapere', steps: 'Passo dopo passo', seen: 'Visto', of: 'di', min: 'Circa 3 minuti', finished: 'Guida completata. Buon utilizzo!', hint: 'Scorri per cambiare argomento.' },
      ch: {
        start: { t: 'Orientarsi nell’app', s: 'Sei pulsanti in basso e il Menu per tutto il resto.', a: ['In basso nello schermo: Home, Messaggi, Portafoglio, Negozio, Notifs e Menu.', 'Tocca Menu per trovare tutti i servizi: sito web, fatture, lavoro, Accademia, immobiliare, eventi, strumenti gratuiti…', 'Trascina lo schermo verso il basso per aggiornarlo.', 'Puoi riaprire questa guida quando vuoi: Menu › Aiuto e informazioni › Guida all’uso.'], tip: 'Installa l’app sul telefono: si apre come una vera app, senza barra degli indirizzi.', go: 'Apri il Menu' },
        home: { t: 'Home: pubblicare e condividere', s: 'La tua bacheca, come sui grandi social.', a: ['Tocca il riquadro “Esprimiti, pubblica una foto…” per scrivere un messaggio o aggiungere una foto o un video.', 'Aggiungi una storia in alto per mostrare un momento ai tuoi follower.', 'Metti mi piace, commenta o condividi un post: la persona riceve una notifica.', 'Usa “Cerca un account…” per trovare una persona o un’azienda.'], tip: 'Tocca il nome di un autore per aprire il suo profilo e scrivergli.', go: 'Apri la Home' },
        chat: { t: 'Messaggi e chiamate', s: 'Chatta in privato con qualsiasi membro.', a: ['Apri la scheda Messaggi, poi scegli una conversazione o iniziane una da un profilo.', 'Invia testo, foto, video, documenti o un messaggio vocale.', 'Le spunte mostrano lo stato: una spunta = inviato, due spunte = ricevuto, due spunte blu = letto.', 'Tocca l’icona della chiamata per fare una chiamata audio o video.'], tip: 'App chiusa? Il messaggio compare sullo schermo del telefono e puoi rispondere direttamente dalla notifica.', go: 'Apri Messaggi' },
        wallet: { t: 'Ricaricare il mio portafoglio', s: 'Il tuo saldo paga i servizi, il negozio e il Pack Pro del tuo sito.', a: ['Apri la scheda Portafoglio e scegli come ricaricare.', 'Mobile Money: scegli il paese e l’operatore (Orange Money, M-Pesa, Airtel Money, MTN MoMo, Wave…), poi inserisci il numero e l’importo.', 'Cripto (USDT, Bitcoin…) o carta: vieni indirizzato alla pagina di pagamento sicura del fornitore.', 'Il saldo viene accreditato appena il pagamento è confermato. Lo storico resta nel Portafoglio.'], tip: 'Non dare mai il tuo codice segreto Mobile Money. L’app non lo chiede mai.', go: 'Apri il Portafoglio' },
        boost: { t: 'Potenziare i miei social', s: 'Follower, like, visualizzazioni: ordina in pochi tocchi.', a: ['Apri Menu, poi Rete.', 'Scegli il social: TikTok, Instagram, YouTube, Facebook…', 'Scegli il servizio (follower, like, visualizzazioni…) e il livello di qualità: Standard, Premium o VIP.', 'Incolla il link del tuo profilo o post, scegli la quantità e conferma. Il prezzo viene scalato dal saldo.'], tip: 'Il tuo profilo deve essere pubblico perché la consegna possa iniziare.', go: 'Apri Rete' },
        shop: { t: 'Negozio: comprare e vendere', s: 'Libri digitali e prodotti, pagati con il tuo saldo.', a: ['Apri la scheda Negozio: scegli Libri o Prodotti, oppure usa la ricerca.', 'Tocca Ordina: il prezzo viene scalato dal saldo. Un libro resta poi nella tua biblioteca.', 'Per un prodotto, scrivi al venditore su WhatsApp (pulsante sull’articolo) per accordarti sulla consegna.', 'Vuoi vendere? Tocca Vendi, aggiungi foto e prezzo, poi pubblica.'], tip: 'Nel carrello si applica uno sconto del 5% da 4 articoli.', go: 'Apri il Negozio' },
        site: { t: 'Creare il mio sito web', s: 'Un vero sito per la tua attività, senza scrivere una riga di codice.', a: ['Apri Menu › Crea il tuo sito.', 'Inserisci il nome della tua attività e scegli un modello: viene creato il tuo indirizzo coeurnohuniverse.com/s/il-tuo-nome.', 'Aggiungi foto, prodotti o servizi, orari e contatti, poi tocca Pubblica il mio sito.', 'Pack Pro: il tuo nome di dominio (es. miosalone.com), più strumenti di vendita e statistiche. Scegli 1, 3, 6, 12 o 36 mesi: più è lunga la durata, meno paghi al mese.', 'Sito pronto? Puoi consegnarlo al tuo cliente con “Dai il mio sito”: ne diventa proprietario e paga l’abbonamento.'], tip: 'Crei siti per altre persone? Usa “Crea il sito per un cliente”.', go: 'Apri Crea il tuo sito' },
        biz: { t: 'Azienda, fatture e ricevute', s: 'Presenta la tua azienda e gestisci i clienti.', a: ['Menu › Aziende: crea la scheda della tua azienda (logo, descrizione, contatti).', 'Pubblica novità e offerte per attirare clienti.', 'Menu › Fatture e Ricevute: crea una fattura o una ricevuta e condividila su WhatsApp.', 'Nel Portafoglio, “La mia attività” riunisce le fatture da incassare, i tuoi eventi e le richieste in corso.'], tip: 'Aggiungi il tuo numero WhatsApp alla scheda: i clienti ti contattano con un tocco.', go: 'Apri Aziende' },
        work: { t: 'Lavoro, formazione e professionisti', s: 'Trova un lavoro, impara, o trova la persona giusta.', a: ['Menu › Lavoro e Freelance: cerca offerte per città o parola chiave, oppure pubblica la tua richiesta di lavoro.', 'Menu › Accademia: segui corsi online, con quiz e certificati.', 'Menu › Trova un professionista: chiedi un preventivo a un artigiano o a un fornitore.', 'Assumi? Tocca Pubblica un’offerta.'], tip: 'Un profilo completo (foto, nome, città) ispira più fiducia.', go: 'Apri Lavoro e Freelance' },
        local: { t: 'Immobiliare, viaggi e vicino a te', s: 'Trova o pubblica un annuncio, prenota, esplora.', a: ['Menu › Immobiliare: sfoglia gli annunci in vendita o in affitto, o pubblica il tuo.', 'Menu › Viaggi: scopri luoghi e buoni consigli, o pubblica un luogo.', 'Menu › Prenotazione online: prendi o ricevi appuntamenti.', 'Menu › Vicino a te: la mappa di negozi e servizi intorno a te.'], tip: 'Sei tu a decidere se l’app può usare la tua posizione.', go: 'Apri Immobiliare' },
        events: { t: 'Eventi, concorsi e avvisi', s: 'Biglietti con codice QR, concorsi e avvisi.', a: ['Menu › Eventi e Biglietteria: acquista un e-biglietto, un codice QR arriva nell’app.', 'Organizzatore: pubblica il tuo evento e convalida gli ingressi scansionando i codici QR.', 'Menu › Concorsi e Premi: partecipa, vota o crea il tuo concorso.', 'Menu › Avvisi: segnala o ricevi un avviso importante (oggetto smarrito, informazione…).'], tip: 'Tocca il biglietto per mostrare il codice QR a schermo intero.', go: 'Apri Eventi' },
        tools: { t: 'Strumenti gratuiti', s: 'Otto strumenti utili, senza pagare.', a: ['Apri Menu › Strumenti gratuiti.', 'Codice QR, link diretto WhatsApp, caratteri di testo per le bio, tassi di cambio, poster e citazioni, mockup di prodotti, hashtag.', 'Centro di localizzazione: condividi la tua posizione con i tuoi cari o lancia un allarme SOS.', 'Ogni strumento crea un’immagine o un link che puoi salvare o condividere.'], tip: 'Il tasso di cambio gestisce il franco congolese, i franchi CFA, il dollaro, l’euro e molte altre valute.', go: 'Apri il Menu' },
        earn: { t: 'Referral e guadagni', s: 'Invita i tuoi amici: guadagni il 5% delle loro ricariche.', a: ['Apri Menu › Programma referral e copia il tuo link personale.', 'Invialo su WhatsApp o sui tuoi social, con i messaggi già pronti.', 'Quando un amico si iscrive con il tuo link e ricarica, il 5% dell’importo viene aggiunto al tuo saldo.', 'Segui i tuoi invitati, i guadagni e il livello nella stessa pagina.'], tip: 'I tuoi guadagni si usano come qualsiasi saldo: servizi, negozio, Pack Pro.', go: 'Apri Programma referral' },
        account: { t: 'Il mio account, sicurezza e aiuto', s: 'Imposta l’app a modo tuo.', a: ['Menu › Account: cambia nome e foto.', 'Menu › Sicurezza: password e download di tutti i tuoi dati.', 'Menu › Notifiche: scegli cosa ricevere. Con l’app chiusa, arrivano sullo schermo del telefono, come su WhatsApp.', 'Menu › Aspetto: modalità scura e dimensione del testo. Menu › Lingua: francese, inglese, spagnolo, italiano o portoghese.', 'Serve aiuto? Menu › Assistenza: invia una richiesta e segui la risposta.'], tip: 'Per installare l’app: pulsante “Installa app”, oppure menu del browser › Aggiungi alla schermata Home.', go: 'Apri Sicurezza' }
      }
    },
    pt: {
      ui: { title: 'Guia de utilização', kicker: 'Guia', sub: 'Aprenda a usar o Coeurnoh Universe em poucos minutos, tema a tema.', start: 'Começar o guia', resume: 'Continuar', topics: 'Todos os temas', back: 'Todos os temas', prev: 'Anterior', next: 'Seguinte', done: 'Concluir', close: 'Fechar', signup: 'Criar a minha conta', tip: 'Bom saber', steps: 'Passo a passo', seen: 'Visto', of: 'de', min: 'Cerca de 3 minutos', finished: 'Guia concluído. Boa utilização!', hint: 'Deslize para mudar de tema.' },
      ch: {
        start: { t: 'Orientar-se na aplicação', s: 'Seis botões em baixo e o Menu para tudo o resto.', a: ['Em baixo no ecrã: Início, Mensagens, Carteira, Loja, Notifs e Menu.', 'Toque em Menu para encontrar todos os serviços: site, faturas, emprego, Academia, imóveis, eventos, ferramentas gratuitas…', 'Puxe o ecrã para baixo para o atualizar.', 'Pode reabrir este guia quando quiser: Menu › Ajuda e informações › Guia de utilização.'], tip: 'Instale a aplicação no telemóvel: abre como uma aplicação a sério, sem barra de endereços.', go: 'Abrir o Menu' },
        home: { t: 'Início: publicar e partilhar', s: 'O seu feed de notícias, como nas grandes redes.', a: ['Toque na caixa “Exprima-se, publique uma foto…” para escrever uma mensagem ou juntar uma foto ou um vídeo.', 'Adicione uma story no topo do ecrã para mostrar um momento aos seus seguidores.', 'Goste, comente ou partilhe uma publicação: a pessoa recebe uma notificação.', 'Use “Procurar uma conta…” para encontrar uma pessoa ou uma empresa.'], tip: 'Toque no nome de um autor para abrir o perfil e escrever-lhe.', go: 'Abrir o Início' },
        chat: { t: 'Mensagens e chamadas', s: 'Converse em privado com qualquer membro.', a: ['Abra o separador Mensagens e escolha uma conversa, ou inicie uma a partir de um perfil.', 'Envie texto, fotos, vídeos, documentos ou uma mensagem de voz.', 'Os vistos mostram o estado: um visto = enviado, dois vistos = recebido, dois vistos azuis = lido.', 'Toque no ícone de chamada para fazer uma chamada de áudio ou vídeo.'], tip: 'Aplicação fechada? A mensagem aparece no ecrã do telemóvel e pode responder diretamente na notificação.', go: 'Abrir Mensagens' },
        wallet: { t: 'Carregar a minha carteira', s: 'O seu saldo paga os serviços, a loja e o Pack Pro do seu site.', a: ['Abra o separador Carteira e escolha como carregar.', 'Mobile Money: escolha o país e o operador (Orange Money, M-Pesa, Airtel Money, MTN MoMo, Wave…), indique o número e o montante.', 'Cripto (USDT, Bitcoin…) ou cartão: é enviado para a página de pagamento segura do fornecedor.', 'O saldo é creditado assim que o pagamento é confirmado. O histórico fica na Carteira.'], tip: 'Nunca dê o seu código secreto de Mobile Money. A aplicação nunca o pede.', go: 'Abrir a Carteira' },
        boost: { t: 'Impulsionar as minhas redes sociais', s: 'Seguidores, gostos, visualizações: encomende em poucos toques.', a: ['Abra o Menu e depois Rede.', 'Escolha a rede: TikTok, Instagram, YouTube, Facebook…', 'Escolha o serviço (seguidores, gostos, visualizações…) e o nível de qualidade: Standard, Premium ou VIP.', 'Cole a ligação do seu perfil ou publicação, escolha a quantidade e confirme. O preço é retirado do seu saldo.'], tip: 'O seu perfil tem de ser público para a entrega poder começar.', go: 'Abrir Rede' },
        shop: { t: 'Loja: comprar e vender', s: 'Livros digitais e produtos, pagos com o seu saldo.', a: ['Abra o separador Loja: escolha Livros ou Produtos, ou use a pesquisa.', 'Toque em Encomendar: o preço é retirado do seu saldo. Um livro fica depois na sua biblioteca.', 'Para um produto, escreva ao vendedor por WhatsApp (botão no artigo) para combinar a entrega.', 'Quer vender? Toque em Vender, junte a foto e o preço e publique.'], tip: 'No carrinho aplica-se um desconto de 5 % a partir de 4 artigos.', go: 'Abrir a Loja' },
        site: { t: 'Criar o meu site', s: 'Um site a sério para a sua atividade, sem escrever uma linha de código.', a: ['Abra Menu › Crie seu site.', 'Indique o nome da sua atividade e escolha um modelo: é criado o seu endereço coeurnohuniverse.com/s/o-seu-nome.', 'Junte fotos, produtos ou serviços, horários e contactos e toque em Publicar o meu site.', 'Pack Pro: o seu próprio nome de domínio (ex. meusalao.com), mais ferramentas de venda e estatísticas. Escolha 1, 3, 6, 12 ou 36 meses: quanto mais longa a duração, menos paga por mês.', 'Site pronto? Pode entregá-lo ao seu cliente com “Dar o meu site”: ele passa a ser o proprietário e paga a subscrição.'], tip: 'Cria sites para outras pessoas? Use “Criar o site para um cliente”.', go: 'Abrir Crie seu site' },
        biz: { t: 'Empresa, faturas e recibos', s: 'Apresente a sua empresa e gira os seus clientes.', a: ['Menu › Empresas: crie a ficha da sua empresa (logótipo, descrição, contactos).', 'Publique novidades e ofertas para atrair clientes.', 'Menu › Faturas e Recibos: crie uma fatura ou um recibo e partilhe por WhatsApp.', 'Na Carteira, “A minha atividade” reúne as faturas a receber, os seus eventos e os pedidos em curso.'], tip: 'Junte o seu número de WhatsApp à ficha: os clientes contactam-no com um toque.', go: 'Abrir Empresas' },
        work: { t: 'Emprego, formação e profissionais', s: 'Encontre trabalho, aprenda, ou encontre a pessoa certa.', a: ['Menu › Emprego e Freelance: pesquise ofertas por cidade ou palavra-chave, ou publique o seu pedido de emprego.', 'Menu › Academia: siga cursos online, com questionários e certificados.', 'Menu › Encontrar um profissional: peça um orçamento a um artesão ou prestador.', 'Está a recrutar? Toque em Publicar uma oferta.'], tip: 'Um perfil completo (foto, nome, cidade) inspira mais confiança.', go: 'Abrir Emprego e Freelance' },
        local: { t: 'Imóveis, viagens e perto de si', s: 'Encontre ou publique um anúncio, reserve, explore.', a: ['Menu › Imóveis: veja anúncios para venda ou arrendamento, ou publique o seu.', 'Menu › Viagens: descubra lugares e boas dicas, ou publique um lugar.', 'Menu › Reserva online: marque ou receba marcações.', 'Menu › Perto de você: o mapa de lojas e serviços à sua volta.'], tip: 'É você que decide se a aplicação pode usar a sua localização.', go: 'Abrir Imóveis' },
        events: { t: 'Eventos, concursos e alertas', s: 'Bilhetes com código QR, concursos e alertas.', a: ['Menu › Eventos e Ingressos: compre um bilhete eletrónico, um código QR chega à aplicação.', 'Organizador: publique o seu evento e valide as entradas lendo os códigos QR.', 'Menu › Concursos e Prêmios: participe, vote ou crie o seu concurso.', 'Menu › Alertas: assinale ou receba um aviso importante (objeto perdido, informação…).'], tip: 'Toque no bilhete para mostrar o código QR em ecrã inteiro.', go: 'Abrir Eventos' },
        tools: { t: 'Ferramentas gratuitas', s: 'Oito ferramentas úteis, sem pagar.', a: ['Abra Menu › Ferramentas gratuitas.', 'Código QR, ligação direta do WhatsApp, tipos de letra para as bios, taxas de câmbio, cartazes e citações, maquetes de produtos, hashtags.', 'Centro de localização: partilhe a sua posição com os seus próximos ou lance um alerta SOS.', 'Cada ferramenta cria uma imagem ou uma ligação que pode guardar ou partilhar.'], tip: 'As taxas de câmbio incluem o franco congolês, os francos CFA, o dólar, o euro e muitas outras moedas.', go: 'Abrir o Menu' },
        earn: { t: 'Indicações e ganhos', s: 'Convide os amigos: ganha 5 % dos carregamentos deles.', a: ['Abra Menu › Indicações e copie a sua ligação pessoal.', 'Envie-a por WhatsApp ou pelas redes, com as mensagens já preparadas.', 'Quando um amigo se regista com a sua ligação e carrega, 5 % do montante é somado ao seu saldo.', 'Acompanhe os convidados, os ganhos e o nível na mesma página.'], tip: 'Os seus ganhos usam-se como qualquer saldo: serviços, loja, Pack Pro.', go: 'Abrir Indicações' },
        account: { t: 'A minha conta, segurança e ajuda', s: 'Configure a aplicação à sua maneira.', a: ['Menu › Conta: altere o nome e a foto.', 'Menu › Segurança: palavra-passe e transferência de todos os seus dados.', 'Menu › Notificações: escolha o que recebe. Com a aplicação fechada, chegam ao ecrã do telemóvel, como no WhatsApp.', 'Menu › Aparência: modo escuro e tamanho do texto. Menu › Idioma: francês, inglês, espanhol, italiano ou português.', 'Precisa de ajuda? Menu › Suporte: envie um pedido e acompanhe a resposta.'], tip: 'Para instalar a aplicação: botão “Instalar app”, ou menu do navegador › Adicionar ao ecrã inicial.', go: 'Abrir Segurança' }
      }
    }
  };

  /* ---------------- Petites icônes (traits fins) ---------------- */
  var IC = {
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    card: '<rect x="1.5" y="4" width="21" height="16" rx="2.5"/><path d="M1.5 10h21"/>',
    trend: '<path d="M23 6 13.5 15.5 8.5 10.5 1 18"/><path d="M17 6h6v6"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    gift: '<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    phone2: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M9.5 9.5c.4-1 1.3-1.5 2.5-1.5 1.5 0 2.5.8 2.5 2s-1 1.7-2.5 2-2.5.8-2.5 2 1 2 2.5 2c1.2 0 2.1-.5 2.5-1.5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.7V17c0 .6-.5 1-1 1.2-1.2.6-2 2-2 3.8"/><path d="M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0z"/>',
    brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L8 14.2 3 9.3l6.9-1z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    play: '<path d="M6 4v16l14-8z"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'
  };
  function ic(name, size, cls) {
    return '<svg class="' + (cls || 'gd-i') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[name] || '') + '</svg>';
  }

  /* ---------------- Illustrations (aucun texte : valables dans toutes les langues) ---------------- */
  var uid = 0;
  function R(x, y, w, h, r, c) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 0) + '" class="' + c + '"/>'; }
  function C(x, y, r, c) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="' + c + '"/>'; }
  function G(name, x, y, s, c) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 24) + ')" class="' + (c || 'a-ic') + '">' + (IC[name] || '') + '</g>'; }
  function T(x, y, s, size, c) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" class="' + c + '">' + s + '</text>'; }
  function P(d, c) { return '<path d="' + d + '" class="' + c + '"/>'; }
  function bars(x, y, w, n, gap, c, ws) { var o = ''; for (var i = 0; i < n; i++) o += R(x, y + i * gap, ws ? ws[i % ws.length] : w, 4, 2, c); return o; }
  function phone(inner) {
    var id = 'gdc' + (++uid);
    return '<g transform="translate(102 14)"><rect x="-6" y="-6" width="128" height="196" rx="22" class="a-body"/>' +
      '<clipPath id="' + id + '"><rect width="116" height="176" rx="16"/></clipPath>' +
      '<g clip-path="url(#' + id + ')"><rect width="116" height="176" class="a-screen"/>' + inner + '</g></g>';
  }
  function tile(x, y, icon, fg, bg) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect x="0" y="3" width="46" height="46" rx="13" class="a-shadow"/><rect width="46" height="46" rx="13" class="a-chip"/>' +
      (bg ? '<circle cx="23" cy="23" r="15" class="' + bg + '"/>' : '') + G(icon, 11, 11, 24, fg || 'a-ic') + '</g>';
  }
  function bottomNav(active) {
    var names = ['home', 'chat', 'card', 'bag', 'bell', 'menu'], o = R(0, 150, 116, 26, 0, 'a-screen') + R(0, 150, 116, 1, 0, 'a-line');
    for (var i = 0; i < 6; i++) {
      var cx = 10 + i * 19.2;
      o += G(names[i], cx - 6, 157, 12, i === active ? 'a-ic-p' : 'a-ic-m');
      if (i === active) o += R(cx - 6, 150, 12, 2, 1, 'a-acc');
    }
    return o;
  }
  var ART = {
    start: function () {
      return phone(C(14, 16, 7, 'a-soft2') + R(27, 10, 58, 12, 6, 'a-soft') + G('bell', 92, 9, 14, 'a-ic-m') +
        R(8, 34, 100, 40, 9, 'a-soft') + R(14, 42, 40, 5, 2.5, 'a-soft2') + R(14, 52, 70, 4, 2, 'a-soft2') + R(14, 60, 54, 4, 2, 'a-soft2') +
        R(8, 82, 48, 56, 9, 'a-soft') + R(60, 82, 48, 56, 9, 'a-soft') + R(14, 88, 36, 24, 6, 'a-soft2') + R(66, 88, 36, 24, 6, 'a-soft2') +
        R(14, 118, 28, 4, 2, 'a-soft2') + R(66, 118, 28, 4, 2, 'a-soft2') + bottomNav(0)) +
        tile(28, 54, 'menu', 'a-ic-a') + tile(246, 98, 'help', 'a-ic-p');
    },
    home: function () {
      var s = '';
      for (var i = 0; i < 4; i++) s += C(16 + i * 27, 20, 11, 'a-ring') + C(16 + i * 27, 20, 7.5, 'a-soft2');
      return phone(s + R(8, 42, 100, 18, 9, 'a-soft') + C(18, 51, 5, 'a-soft2') + R(28, 49, 44, 4, 2, 'a-soft2') + G('camera', 90, 45, 12, 'a-ic-m') +
        C(17, 74, 6, 'a-soft2') + R(28, 70, 40, 4, 2, 'a-soft2') + R(28, 77, 26, 3, 1.5, 'a-soft') +
        R(8, 88, 100, 44, 8, 'a-soft2') + C(86, 102, 7, 'a-acc') + P('M8 132 L40 106 L64 124 L84 112 L108 128 L108 132 Z', 'a-soft') +
        G('heart', 10, 138, 11, 'a-ic-r') + G('chat', 30, 138, 11, 'a-ic-m') + G('share', 50, 138, 11, 'a-ic-m') + bottomNav(0)) +
        tile(28, 50, 'heart', 'a-ic-r') + tile(246, 104, 'bell', 'a-ic-a');
    },
    chat: function () {
      return phone(R(0, 0, 116, 28, 0, 'a-soft') + C(15, 14, 7, 'a-soft2') + R(27, 8, 36, 4, 2, 'a-soft2') + R(27, 16, 22, 3, 1.5, 'a-soft2') + G('phone', 92, 7, 14, 'a-ic-p') +
        R(8, 36, 66, 16, 8, 'a-soft') + R(8, 56, 44, 14, 7, 'a-soft') +
        R(44, 78, 64, 16, 8, 'a-pri') + R(64, 98, 44, 14, 7, 'a-pri') + G('check', 90, 114, 8, 'a-ic-b') + G('check', 95, 114, 8, 'a-ic-b') +
        R(8, 122, 74, 20, 10, 'a-soft') + C(19, 132, 6, 'a-pri') + G('play', 16.5, 129.5, 5, 'a-ic-w') + R(30, 130, 3, 4, 1.5, 'a-soft2') + R(36, 126, 3, 12, 1.5, 'a-soft2') + R(42, 129, 3, 6, 1.5, 'a-soft2') + R(48, 124, 3, 16, 1.5, 'a-soft2') + R(54, 128, 3, 8, 1.5, 'a-soft2') + R(60, 130, 3, 4, 1.5, 'a-soft2') +
        R(8, 150, 86, 18, 9, 'a-soft') + C(102, 159, 8, 'a-pri') + G('send', 98.5, 155.5, 7, 'a-ic-w')) +
        tile(28, 44, 'phone', 'a-ic-w', 'a-ok') + tile(246, 100, 'camera', 'a-ic-p');
    },
    wallet: function () {
      return phone(R(8, 10, 100, 54, 11, 'a-pri') + R(16, 18, 30, 4, 2, 'a-wsoft') + R(16, 32, 56, 12, 4, 'a-w') + R(16, 50, 40, 4, 2, 'a-wsoft') + C(92, 24, 7, 'a-acc') +
        R(8, 74, 30, 30, 9, 'a-soft') + G('phone2', 15, 81, 16, 'a-ic-p') + R(43, 74, 30, 30, 9, 'a-soft') + G('coin', 50, 81, 16, 'a-ic-a') + R(78, 74, 30, 30, 9, 'a-soft') + G('card', 85, 81, 16, 'a-ic-p') +
        C(16, 124, 6, 'a-soft2') + R(27, 120, 38, 4, 2, 'a-soft2') + R(27, 127, 24, 3, 1.5, 'a-soft') + R(84, 121, 24, 6, 3, 'a-okbar') +
        C(16, 142, 6, 'a-soft2') + R(27, 138, 30, 4, 2, 'a-soft2') + R(27, 145, 20, 3, 1.5, 'a-soft') + R(88, 139, 20, 6, 3, 'a-okbar') + bottomNav(2)) +
        tile(28, 52, 'check', 'a-ic-w', 'a-ok') + tile(246, 98, 'lock', 'a-ic-p');
    },
    boost: function () {
      var cols = ['a-pri', 'a-acc', 'a-red', 'a-blue'], s = '';
      for (var i = 0; i < 4; i++) s += C(17 + i * 27, 20, 10, cols[i]);
      return phone(s + R(8, 40, 100, 20, 8, 'a-soft') + C(18, 50, 4, 'a-pri') + R(27, 48, 40, 4, 2, 'a-soft2') +
        R(8, 64, 100, 20, 8, 'a-soft') + C(18, 74, 4, 'a-soft2') + R(27, 72, 34, 4, 2, 'a-soft2') +
        R(8, 92, 100, 18, 9, 'a-soft') + R(10, 94, 32, 14, 7, 'a-soft2') + R(42, 94, 32, 14, 7, 'a-pri') + R(74, 94, 32, 14, 7, 'a-soft2') +
        R(10, 120, 96, 3, 1.5, 'a-soft2') + R(10, 120, 56, 3, 1.5, 'a-acc') + C(66, 121.5, 5, 'a-pri') +
        R(8, 132, 100, 6, 3, 'a-soft') + R(8, 142, 100, 22, 11, 'a-pri') + R(36, 151, 44, 4, 2, 'a-w')) +
        tile(28, 50, 'trend', 'a-ic-w', 'a-ok') + tile(246, 98, 'heart', 'a-ic-r');
    },
    shop: function () {
      var s = R(8, 8, 100, 14, 7, 'a-soft') + G('search', 14, 10, 10, 'a-ic-m') + R(8, 28, 48, 14, 7, 'a-pri') + R(60, 28, 48, 14, 7, 'a-soft');
      for (var i = 0; i < 4; i++) {
        var x = 8 + (i % 2) * 52, y = 50 + Math.floor(i / 2) * 50;
        s += R(x, y, 48, 46, 8, 'a-soft') + R(x + 4, y + 4, 40, 24, 5, 'a-soft2') + R(x + 4, y + 32, 28, 3, 1.5, 'a-soft2') + R(x + 4, y + 38, 18, 4, 2, 'a-acc');
      }
      return phone(s + C(98, 142, 11, 'a-pri') + G('bag', 91.5, 135.5, 13, 'a-ic-w') + bottomNav(3)) + tile(28, 50, 'bag', 'a-ic-p') + tile(246, 100, 'check', 'a-ic-w', 'a-ok');
    },
    site: function () {
      return phone(R(0, 0, 116, 22, 0, 'a-soft') + R(10, 6, 96, 11, 5.5, 'a-screen') + G('lock', 14, 7.5, 8, 'a-ic-m') + R(26, 10, 52, 3.5, 1.75, 'a-soft2') +
        R(0, 22, 116, 52, 0, 'a-pri') + R(12, 36, 60, 7, 3.5, 'a-w') + R(12, 48, 44, 4, 2, 'a-wsoft') + R(12, 58, 34, 10, 5, 'a-acc') +
        R(8, 82, 48, 40, 8, 'a-soft') + R(12, 86, 40, 22, 5, 'a-soft2') + R(12, 112, 24, 4, 2, 'a-soft2') +
        R(60, 82, 48, 40, 8, 'a-soft') + R(64, 86, 40, 22, 5, 'a-soft2') + R(64, 112, 24, 4, 2, 'a-soft2') +
        R(8, 130, 100, 14, 7, 'a-soft') + R(8, 150, 100, 20, 10, 'a-ok') + R(34, 158, 48, 4, 2, 'a-w')) +
        tile(24, 48, 'globe', 'a-ic-p') + '<g transform="translate(240 96)"><rect y="3" width="56" height="46" rx="13" class="a-shadow"/><rect width="56" height="46" rx="13" class="a-chip"/>' + T(28, 28, '.com', 15, 'a-tx') + '</g>';
    },
    biz: function () {
      return phone(R(8, 8, 100, 134, 8, 'a-soft') + R(16, 16, 34, 6, 3, 'a-pri') + R(16, 26, 24, 3, 1.5, 'a-soft2') + R(70, 16, 30, 3, 1.5, 'a-soft2') + R(70, 22, 30, 3, 1.5, 'a-soft2') + R(16, 40, 84, 1, 0, 'a-line') +
        R(16, 48, 40, 4, 2, 'a-soft2') + R(80, 48, 20, 4, 2, 'a-soft2') + R(16, 62, 52, 4, 2, 'a-soft2') + R(80, 62, 20, 4, 2, 'a-soft2') + R(16, 76, 34, 4, 2, 'a-soft2') + R(80, 76, 20, 4, 2, 'a-soft2') +
        R(16, 92, 84, 1, 0, 'a-line') + R(56, 100, 20, 5, 2.5, 'a-soft2') + R(80, 98, 20, 9, 4.5, 'a-acc') + C(30, 120, 10, 'a-ok') + G('check', 24, 114, 12, 'a-ic-w') + R(46, 116, 40, 4, 2, 'a-soft2') + R(46, 123, 28, 3, 1.5, 'a-soft2') +
        R(8, 150, 100, 20, 10, 'a-pri') + R(36, 158, 44, 4, 2, 'a-w')) +
        tile(28, 48, 'brief', 'a-ic-p') + tile(246, 100, 'share', 'a-ic-a');
    },
    work: function () {
      var s = '', cols = ['a-pri', 'a-acc', 'a-blue'];
      for (var i = 0; i < 3; i++) {
        var y = 8 + i * 46;
        s += R(8, y, 100, 40, 9, 'a-soft') + R(14, y + 7, 26, 26, 7, cols[i]) + R(46, y + 9, 40, 5, 2.5, 'a-soft2') + R(46, y + 19, 54, 3.5, 1.75, 'a-soft2') + R(46, y + 26, 30, 7, 3.5, i === 1 ? 'a-accsoft' : 'a-soft2');
      }
      return phone(s + R(8, 148, 100, 20, 10, 'a-pri') + R(34, 156, 48, 4, 2, 'a-w')) + tile(28, 50, 'cap', 'a-ic-p') + tile(246, 100, 'brief', 'a-ic-a');
    },
    local: function () {
      return phone(R(0, 0, 116, 176, 0, 'a-map') + P('M-4 40 L120 58', 'a-road') + P('M-4 100 L120 84', 'a-road') + P('M30 -4 L46 180', 'a-road') + P('M84 -4 L70 180', 'a-road') +
        R(14, 62, 18, 14, 3, 'a-soft2') + R(88, 110, 20, 16, 3, 'a-soft2') + R(52, 112, 14, 22, 3, 'a-soft2') +
        R(8, 8, 100, 16, 8, 'a-screen') + G('search', 14, 10.5, 11, 'a-ic-m') + R(30, 14, 44, 4, 2, 'a-soft2') +
        '<g transform="translate(40 50)">' + P('M10 0C4.5 0 0 4.4 0 9.8 0 17 10 26 10 26s10-9 10-16.2C20 4.4 15.5 0 10 0z', 'a-red') + C(10, 9.5, 4, 'a-w') + '</g>' +
        '<g transform="translate(70 90) scale(.8)">' + P('M10 0C4.5 0 0 4.4 0 9.8 0 17 10 26 10 26s10-9 10-16.2C20 4.4 15.5 0 10 0z', 'a-pri') + C(10, 9.5, 4, 'a-w') + '</g>' +
        '<g transform="translate(14 104) scale(.8)">' + P('M10 0C4.5 0 0 4.4 0 9.8 0 17 10 26 10 26s10-9 10-16.2C20 4.4 15.5 0 10 0z', 'a-acc') + C(10, 9.5, 4, 'a-w') + '</g>' +
        R(8, 138, 100, 30, 10, 'a-screen') + R(14, 145, 44, 5, 2.5, 'a-soft2') + R(14, 155, 62, 3.5, 1.75, 'a-soft2') + R(84, 146, 18, 14, 7, 'a-pri')) +
        tile(28, 52, 'home', 'a-ic-p') + tile(246, 98, 'pin', 'a-ic-r');
    },
    events: function () {
      var q = '', pat = [[1, 1, 1, 0, 1], [1, 0, 1, 1, 1], [1, 1, 0, 1, 0], [0, 1, 1, 0, 1], [1, 0, 1, 1, 1]];
      for (var i = 0; i < 5; i++) for (var j = 0; j < 5; j++) if (pat[i][j]) q += R(36 + j * 9, 92 + i * 9, 7, 7, 1.5, 'a-pri');
      return phone(R(8, 10, 100, 142, 12, 'a-soft') + R(16, 18, 84, 42, 7, 'a-pri') + C(86, 30, 6, 'a-acc') + R(22, 42, 40, 6, 3, 'a-w') + R(22, 52, 26, 3.5, 1.75, 'a-wsoft') +
        '<line x1="14" y1="72" x2="102" y2="72" class="a-dash"/>' + R(16, 80, 84, 66, 8, 'a-screen') + q + R(0, 150, 116, 26, 0, 'a-screen') + R(14, 154, 88, 16, 8, 'a-ok') + G('check', 51, 156, 12, 'a-ic-w')) +
        tile(28, 48, 'trophy', 'a-ic-a') + tile(246, 100, 'bell', 'a-ic-r');
    },
    tools: function () {
      var ics = ['grid', 'chat', 'user', 'coin', 'camera', 'bag', 'star', 'pin'], cl = ['a-ic-p', 'a-ic-ok', 'a-ic-a', 'a-ic-b', 'a-ic-r', 'a-ic-p', 'a-ic-a', 'a-ic-r'], s = '';
      for (var i = 0; i < 8; i++) {
        var x = 8 + (i % 2) * 52, y = 10 + Math.floor(i / 2) * 36;
        s += R(x, y, 48, 32, 9, 'a-soft') + G(ics[i], x + 6, y + 8, 16, cl[i]) + R(x + 26, y + 10, 16, 3.5, 1.75, 'a-soft2') + R(x + 26, y + 17, 11, 3, 1.5, 'a-soft2');
      }
      return phone(s + R(8, 156, 100, 14, 7, 'a-soft')) + tile(28, 50, 'grid', 'a-ic-p') + tile(246, 100, 'check', 'a-ic-w', 'a-ok');
    },
    earn: function () {
      return phone(R(8, 10, 100, 24, 12, 'a-soft') + G('share', 14, 16, 12, 'a-ic-m') + R(32, 20, 44, 4, 2, 'a-soft2') + R(82, 14, 22, 16, 8, 'a-pri') +
        T(58, 74, '5 %', 30, 'a-big') + R(24, 82, 68, 4, 2, 'a-soft2') +
        C(30, 112, 10, 'a-soft2') + C(58, 112, 10, 'a-soft2') + C(86, 112, 10, 'a-soft2') + G('user', 24, 106, 12, 'a-ic-m') + G('user', 52, 106, 12, 'a-ic-m') + G('user', 80, 106, 12, 'a-ic-m') +
        R(8, 130, 100, 16, 8, 'a-soft') + R(14, 136, 40, 4, 2, 'a-soft2') + R(80, 134, 22, 8, 4, 'a-okbar') + R(8, 150, 100, 20, 10, 'a-pri') + R(34, 158, 48, 4, 2, 'a-w')) +
        tile(28, 50, 'gift', 'a-ic-a') + tile(246, 100, 'users', 'a-ic-p');
    },
    account: function () {
      var rows = ['user', 'shield', 'bell', 'globe', 'help'], s = '';
      for (var i = 0; i < 5; i++) {
        var y = 10 + i * 31, on = i === 2 || i === 1;
        s += R(8, y, 100, 26, 9, 'a-soft') + C(22, y + 13, 8, 'a-soft2') + G(rows[i], 17, y + 8, 10, 'a-ic-p') + R(36, y + 9, 36, 4, 2, 'a-soft2') + R(36, y + 15, 24, 3, 1.5, 'a-soft2') +
          R(84, y + 7, 18, 12, 6, on ? 'a-ok' : 'a-soft2') + C(on ? 96 : 90, y + 13, 4.5, 'a-w');
      }
      return phone(s) + tile(28, 52, 'shield', 'a-ic-ok') + tile(246, 98, 'down', 'a-ic-p');
    }
  };
  function art(id) {
    var f = ART[id];
    return '<svg class="gd-art" viewBox="0 0 320 190" role="img" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"><rect width="320" height="190" class="a-bg"/>' +
      '<circle cx="42" cy="34" r="54" class="a-halo"/><circle cx="288" cy="170" r="64" class="a-halo"/>' + (f ? f() : '') + '</svg>';
  }

  /* ---------------- Habillage ---------------- */
  var CSS =
    '.gd-ov{position:fixed;inset:0;z-index:3600;background:rgba(10,14,22,.55);display:flex;align-items:flex-end;justify-content:center}' +
    '.gd-sheet{background:var(--white,#fff);color:var(--ink,#16202f);width:100%;max-width:520px;height:94vh;height:94dvh;display:flex;flex-direction:column;overflow:hidden;border-radius:22px 22px 0 0;box-shadow:var(--shadow-lg,0 20px 50px rgba(0,0,0,.28))}' +
    '@media (min-width:600px){.gd-ov{align-items:center}.gd-sheet{height:min(820px,92vh);border-radius:22px}}' +
    '.gd-sheet:focus{outline:none}' +
    '.gd-top{flex:none;display:flex;align-items:center;gap:10px;padding:12px 14px 10px 16px;border-bottom:1px solid var(--line,#e3e8f0)}' +
    '.gd-top .gd-ttl{flex:1;min-width:0}' +
    '.gd-kicker{display:block;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#5d6779)}' +
    '.gd-h{margin:2px 0 0;font-size:1.1rem;line-height:1.25;font-weight:700;overflow-wrap:anywhere}' +
    '.gd-x,.gd-bk{flex:none;width:40px;height:40px;border-radius:12px;border:1px solid var(--line,#e3e8f0);background:var(--white,#fff);color:inherit;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}' +
    '.gd-i{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.gd-body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}' +
    '.gd-foot{flex:none;display:flex;gap:8px;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,#e3e8f0);background:var(--white,#fff)}' +
    '.gd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 16px;border-radius:14px;font:inherit;font-weight:700;font-size:.98rem;cursor:pointer;border:2px solid var(--btn,#27364f);background:var(--btn,#27364f);color:var(--on-primary,#fff);flex:1 1 0;min-width:0}' +
    '.gd-btn.sec{background:var(--white,#fff);color:var(--ink,#16202f);border-color:var(--line-2,#c3cad6)}' +
    '.gd-btn[disabled]{opacity:.45;cursor:default}' +
    '.gd-x:focus-visible,.gd-bk:focus-visible,.gd-btn:focus-visible,.gd-row:focus-visible{outline:3px solid var(--link,#2f5dd0);outline-offset:2px}' +
    '.gd-intro{padding:18px 16px 6px}' +
    '.gd-intro h3{margin:0 0 6px;font-size:1.5rem;line-height:1.2;font-family:var(--font-head,inherit)}' +
    '.gd-intro p{margin:0 0 14px;font-size:.96rem;line-height:1.5;color:var(--ink-2,#2b3646)}' +
    '.gd-meta{display:block;margin-top:8px;text-align:center;font-size:.8rem;color:var(--muted,#5d6779)}' +
    '.gd-list{list-style:none;margin:0;padding:6px 16px 18px;display:flex;flex-direction:column;gap:8px}' +
    '.gd-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--line,#e3e8f0);border-radius:16px;background:var(--white,#fff);color:inherit;font:inherit;cursor:pointer}' +
    '.gd-row:active{background:var(--soft,#f3f5f9)}' +
    '.gd-chip{flex:none;width:42px;height:42px;border-radius:12px;background:var(--soft-2,#e8ecf3);color:var(--btn,#27364f);display:flex;align-items:center;justify-content:center}' +
    '.gd-row b{display:block;font-size:.96rem;line-height:1.25;overflow-wrap:anywhere}' +
    '.gd-row small{display:block;margin-top:2px;font-size:.82rem;line-height:1.35;color:var(--muted,#5d6779);overflow-wrap:anywhere}' +
    '.gd-row .gd-txt{flex:1;min-width:0}' +
    '.gd-tick{flex:none;display:inline-flex;align-items:center;gap:4px;font-size:.74rem;font-weight:700;color:var(--tint-green-ink,#15693a)}' +
    '.gd-chev{flex:none;color:var(--faint,#7b8599)}' +
    '.gd-art{display:block;width:100%;height:auto;max-height:230px;background:var(--soft,#f3f5f9)}' +
    '.gd-ch{padding:0 0 12px}' +
    '.gd-ch-in{padding:16px 16px 4px}' +
    '.gd-count{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#5d6779);margin:0 0 6px}' +
    '.gd-ch h3{margin:0;font-size:1.35rem;line-height:1.25;font-family:var(--font-head,inherit);overflow-wrap:anywhere}' +
    '.gd-ch .gd-s{margin:6px 0 14px;font-size:.96rem;line-height:1.5;color:var(--ink-2,#2b3646)}' +
    '.gd-steps{margin:0;padding:0;list-style:none;counter-reset:g;display:flex;flex-direction:column;gap:10px}' +
    '.gd-steps li{counter-increment:g;display:flex;gap:12px;align-items:flex-start;font-size:.95rem;line-height:1.5;overflow-wrap:anywhere}' +
    '.gd-steps li::before{content:counter(g);flex:none;width:26px;height:26px;border-radius:50%;background:var(--btn,#27364f);color:var(--on-primary,#fff);font-size:.82rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-top:-1px}' +
    '.gd-tip{display:flex;gap:10px;align-items:flex-start;margin:16px 0 0;padding:12px 14px;border-radius:14px;background:var(--tint-amber,#fcf1d8);color:var(--tint-amber-ink,#7a4a00);font-size:.9rem;line-height:1.45}' +
    '.gd-tip b{display:block;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px}' +
    '.gd-tip svg{margin-top:2px}' +
    '.gd-go{margin:14px 0 0;width:100%;flex:none}' +
    '.gd-dots{display:flex;justify-content:center;gap:5px;padding:8px 0 0}' +
    '.gd-dot{width:6px;height:6px;border-radius:50%;background:var(--line-2,#c3cad6)}.gd-dot.on{width:18px;border-radius:4px;background:var(--btn,#27364f)}' +
    '.gd-hint{text-align:center;margin:10px 16px 0;font-size:.76rem;color:var(--faint,#7b8599)}' +
    '.gd-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
    /* illustrations */
    '.a-bg{fill:var(--soft,#f3f5f9)}.a-halo{fill:var(--soft-2,#e8ecf3);opacity:.7}' +
    '.a-body{fill:#1d2738}html[data-theme=dark] .a-body{fill:#0b0f15;stroke:#3a4558;stroke-width:1.5}' +
    '.a-screen{fill:var(--white,#fff)}.a-soft{fill:var(--soft,#f3f5f9)}.a-soft2{fill:var(--soft-2,#e3e8f0)}.a-line{fill:var(--line,#e3e8f0)}' +
    '.a-map{fill:#e9eef3}html[data-theme=dark] .a-map{fill:#222a36}.a-road{fill:none;stroke:var(--white,#fff);stroke-width:7;stroke-linecap:round}' +
    '.a-pri{fill:var(--btn,#27364f)}.a-acc{fill:#d79a2b}.a-accsoft{fill:#f2dfb4}.a-ok{fill:#2f8f5b}.a-okbar{fill:#7cc3a0}.a-red{fill:#c9413f}.a-blue{fill:#3a63c8}' +
    '.a-w{fill:#fff}.a-wsoft{fill:rgba(255,255,255,.55)}.a-ring{fill:none;stroke:#d79a2b;stroke-width:2.2}' +
    '.a-chip{fill:var(--white,#fff);stroke:var(--line,#dfe4ec);stroke-width:1}.a-shadow{fill:rgba(16,24,40,.12)}html[data-theme=dark] .a-shadow{fill:rgba(0,0,0,.35)}' +
    '.a-dash{stroke:var(--line-2,#c3cad6);stroke-width:2;stroke-dasharray:4 4}' +
    '.a-ic,.a-ic-p,.a-ic-m,.a-ic-a,.a-ic-r,.a-ic-b,.a-ic-ok,.a-ic-w{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.a-ic,.a-ic-p{stroke:var(--btn,#27364f)}.a-ic-m{stroke:var(--faint,#8a94a6)}.a-ic-a{stroke:#c58a1f}.a-ic-r{stroke:#c9413f}.a-ic-b{stroke:#3a63c8}.a-ic-ok{stroke:#2f8f5b}.a-ic-w{stroke:#fff}' +
    '.a-tx{fill:var(--btn,#27364f);font-weight:800;text-anchor:middle}.a-big{fill:var(--btn,#27364f);font-weight:800;text-anchor:middle;font-size:30px}.a-ok .a-ic{stroke:#fff}' +
    '@media (prefers-reduced-motion:no-preference){.gd-sheet{animation:gdUp .2s ease-out}@keyframes gdUp{from{transform:translateY(26px);opacity:.6}to{transform:none;opacity:1}}.gd-ch{animation:gdIn .22s ease-out}@keyframes gdIn{from{opacity:.4;transform:translateX(10px)}to{opacity:1;transform:none}}}';

  /* ---------------- Outils ---------------- */
  function lang() {
    var l = 'fr';
    try { if (typeof currentLang !== 'undefined' && D[currentLang]) l = currentLang; else { var n = (navigator.language || 'fr').slice(0, 2); if (D[n]) l = n; } } catch (e) { /* ignore */ }
    return l;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignore */ } return null; }
  function doneSet() { try { var a = JSON.parse(ls(DONE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function markDone(id) { var a = doneSet(); if (a.indexOf(id) < 0) { a.push(id); ls(DONE_KEY, JSON.stringify(a)); } }
  function loggedIn() { try { return !!currentUser; } catch (e) { return false; } }

  var ov = null, sheet = null, st = { view: 'home', i: 0 }, lastFocus = null;

  function css() {
    if (document.getElementById('gd-style')) return;
    var s = document.createElement('style'); s.id = 'gd-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  function T_() { return D[lang()] || D.fr; }

  function render() {
    var t = T_(), u = t.ui, h = '', foot = '', title = u.title, kick = u.kicker;
    if (st.view === 'home') {
      var done = doneSet(), n = done.length, rows = '';
      ORDER.forEach(function (id, k) {
        var c = t.ch[id];
        rows += '<li><button type="button" class="gd-row" data-gd="open" data-i="' + k + '"><span class="gd-chip">' + ic(ICON_OF[id], 22) + '</span><span class="gd-txt"><b>' + esc(c.t) + '</b><small>' + esc(c.s) + '</small></span>' +
          (done.indexOf(id) >= 0 ? '<span class="gd-tick">' + ic('check', 14) + esc(u.seen) + '</span>' : ic('chevR', 18, 'gd-i gd-chev')) + '</button></li>';
      });
      h = '<div class="gd-intro"><h3>' + esc(u.title) + '</h3><p>' + esc(u.sub) + '</p><button type="button" class="gd-btn" data-gd="start" style="width:100%">' + esc(n > 0 && n < ORDER.length ? u.resume : u.start) + '</button><span class="gd-meta">' + esc(u.min) + '</span></div>' +
        '<ul class="gd-list" aria-label="' + esc(u.topics) + '">' + rows + '</ul>';
      foot = '';
    } else {
      var id2 = ORDER[st.i], c2 = t.ch[id2], steps = '';
      c2.a.forEach(function (x) { steps += '<li>' + esc(x) + '</li>'; });
      var dots = ''; ORDER.forEach(function (_, k) { dots += '<span class="gd-dot' + (k === st.i ? ' on' : '') + '"></span>'; });
      var guest = !loggedIn();
      h = art(id2) + '<div class="gd-ch" id="gd-ch"><div class="gd-ch-in"><p class="gd-count">' + (st.i + 1) + ' ' + esc(u.of) + ' ' + ORDER.length + '</p><h3 id="gd-h3" tabindex="-1">' + esc(c2.t) + '</h3><p class="gd-s">' + esc(c2.s) + '</p>' +
        '<ol class="gd-steps" aria-label="' + esc(u.steps) + '">' + steps + '</ol>' +
        '<div class="gd-tip">' + ic('star', 18) + '<div><b>' + esc(u.tip) + '</b>' + esc(c2.tip) + '</div></div>' +
        '<button type="button" class="gd-btn sec gd-go" data-gd="go">' + esc(guest ? u.signup : c2.go) + ' ' + ic('chevR', 18) + '</button></div>' +
        '<div class="gd-dots" aria-hidden="true">' + dots + '</div><p class="gd-hint">' + esc(u.hint) + '</p></div>';
      foot = '<button type="button" class="gd-btn sec" data-gd="prev"' + (st.i === 0 ? ' disabled' : '') + '>' + ic('chevL', 18) + esc(u.prev) + '</button>' +
        '<button type="button" class="gd-btn" data-gd="next">' + esc(st.i === ORDER.length - 1 ? u.done : u.next) + (st.i === ORDER.length - 1 ? '' : ic('chevR', 18)) + '</button>';
      title = t.ch[id2].t;
    }
    var back = st.view === 'home' ? '' : '<button type="button" class="gd-bk" data-gd="home" aria-label="' + esc(u.back) + '">' + ic('chevL', 20) + '</button>';
    sheet.innerHTML = '<div class="gd-top">' + back + '<div class="gd-ttl"><span class="gd-kicker">' + esc(kick) + '</span><p class="gd-h">' + esc(st.view === 'home' ? 'Coeurnoh Universe' : u.topics) + '</p></div>' +
      '<button type="button" class="gd-x" data-gd="close" aria-label="' + esc(u.close) + '">' + ic('x', 20) + '</button></div>' +
      '<div class="gd-body" id="gd-scroll">' + h + '</div>' + (foot ? '<div class="gd-foot">' + foot + '</div>' : '') +
      '<div class="gd-live" role="status" aria-live="polite">' + esc(st.view === 'home' ? '' : title) + '</div>';
    var sc = document.getElementById('gd-scroll'); if (sc) sc.scrollTop = 0;
  }

  function goTo(i) {
    if (i < 0) return;
    if (i >= ORDER.length) { finish(); return; }
    markDone(ORDER[st.i]);
    st.view = 'ch'; st.i = i; render();
    var h3 = document.getElementById('gd-h3'); if (h3) { try { h3.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function finish() {
    markDone(ORDER[ORDER.length - 1]); close();
    try { if (typeof showToast === 'function') showToast(T_().ui.finished, 'success'); } catch (e) { /* ignore */ }
  }
  function action(a, el) {
    if (a === 'close') { close(); return; }
    if (a === 'home') { if (st.view === 'ch') markDone(ORDER[st.i]); st.view = 'home'; render(); return; }
    if (a === 'start') { var d = doneSet(); var first = 0; for (var k = 0; k < ORDER.length; k++) { if (d.indexOf(ORDER[k]) < 0) { first = k; break; } } goTo(d.length >= ORDER.length ? 0 : first); return; }
    if (a === 'open') { goTo(parseInt(el.getAttribute('data-i'), 10) || 0); return; }
    if (a === 'prev') { goTo(st.i - 1); return; }
    if (a === 'next') { goTo(st.i + 1); return; }
    if (a === 'go') {
      var id = ORDER[st.i]; markDone(id); close();
      if (!loggedIn()) { try { openAuth('register'); } catch (e) { /* ignore */ } return; }
      var g = GO[id]; if (!g) return;
      try { var fn = window[g[0]]; if (typeof fn === 'function') fn.apply(window, g.slice(1)); else if (typeof closeMainMenu === 'function') { /* écran indisponible */ } } catch (e) { /* ignore */ }
    }
  }
  function keyH(e) {
    if (!ov) return;
    if (e.key === 'Escape') { close(); return; }
    if (st.view === 'ch' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { goTo(st.i + (e.key === 'ArrowRight' ? 1 : -1)); }
    if (e.key === 'Tab' && sheet) { // le focus reste dans la fenêtre
      var f = sheet.querySelectorAll('button:not([disabled])'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function open(id) {
    css(); close();
    lastFocus = document.activeElement;
    ov = document.createElement('div'); ov.className = 'gd-ov'; ov.id = 'gd-overlay';
    sheet = document.createElement('div'); sheet.className = 'gd-sheet'; sheet.tabIndex = -1;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', T_().ui.title);
    ov.appendChild(sheet); document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) { close(); return; }
      var b = e.target.closest ? e.target.closest('[data-gd]') : null;
      if (b && sheet.contains(b)) action(b.getAttribute('data-gd'), b);
    });
    var x0 = 0, y0 = 0, tracking = false;
    sheet.addEventListener('touchstart', function (e) { var t = e.touches && e.touches[0]; if (!t) return; x0 = t.clientX; y0 = t.clientY; tracking = true; }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (!tracking || st.view !== 'ch') return; tracking = false;
      var t = e.changedTouches && e.changedTouches[0]; if (!t) return;
      var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) goTo(st.i + (dx < 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('keydown', keyH);
    ls(SEEN_KEY, '1');
    var k = id ? ORDER.indexOf(id) : -1;
    if (k >= 0) { st.view = 'ch'; st.i = k; } else { st.view = 'home'; st.i = 0; }
    render();
    try { sheet.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function close() {
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    var had = !!ov; ov = null; sheet = null;
    document.removeEventListener('keydown', keyH);
    if (had) { try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    lastFocus = null;
  }

  window.CNGuide = { open: open, close: close, chapters: ORDER.slice(), _data: D };
})();
