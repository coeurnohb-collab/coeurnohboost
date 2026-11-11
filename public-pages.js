// api/_lib/public-pages.js
// Pages publiques du guide d'utilisation (hub + 14 sujets) en 5 langues, rendues côté serveur pour les moteurs
// de recherche : titres, étapes, images avec texte alternatif, hreflang, données structurées (HowTo, FAQ, fil d'Ariane).
// Servi par api/render-site.js (limite de 12 fonctions Vercel Hobby) : ce fichier n'est pas une fonction.
'use strict';

const { PUBLIC_CSS } = require('./public-style');
const DATA = require('./guide-data');

const ORIGIN = 'https://coeurnohuniverse.com';
const LANGS = ['fr', 'en', 'es', 'it', 'pt'];
const LOCALE = { fr: 'fr_FR', en: 'en_US', es: 'es_ES', it: 'it_IT', pt: 'pt_PT' };
const LANG_NAME = { fr: 'FR', en: 'EN', es: 'ES', it: 'IT', pt: 'PT' };

// Adresses lisibles (identiques dans toutes les langues).
const SLUG = {
  start: 'getting-started', home: 'feed', chat: 'messages', wallet: 'wallet', boost: 'social-boost',
  shop: 'shop', site: 'website', biz: 'business', work: 'jobs', local: 'nearby', events: 'events',
  tools: 'free-tools', earn: 'referral', account: 'account-security'
};
const ID_BY_SLUG = Object.keys(SLUG).reduce((m, k) => { m[SLUG[k]] = k; return m; }, {});
// Capture d'écran réelle de l'application affichée à côté des étapes, quand elle correspond au sujet.
const SHOT = { start: 'menu', wallet: 'recharge', boost: 'reseau', tools: 'outils' };
const SHOT_SIZE = { menu: [560, 1212], recharge: [560, 1081], reseau: [560, 1081], outils: [560, 1212], wallet: [560, 995], boutique: [560, 718] };
const GALLERY = ['menu', 'recharge', 'reseau', 'outils', 'wallet'];

// Icônes (traits fins, sans emoji).
const ICON = {
  start: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  home: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M5 6l11-3v3"/>',
  boost: '<path d="M4 18l6-6 4 4 6-8"/><path d="M15 8h5v5"/>',
  shop: '<path d="M4 8h16l-1 12H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  biz: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-4h4v4"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
  local: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  events: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  earn: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 20a5 5 0 0 0-4-4.9"/>',
  account: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  plane: '<path d="M21 3L3 10l7 3 3 7z"/><path d="M10 13l11-10"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H4v2a3 3 0 0 0 4 2.8M16 6h4v2a3 3 0 0 1-4 2.8M12 14v4M8 21h8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/>',
  guide: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 8h6"/>'
};
function svg(name) {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ICON.guide}</svg>`;
}
// Pages « Services » : icône par adresse.
const SERVICE_ICON = {
  'croissance-reseaux-sociaux': 'boost', 'boutique-en-ligne': 'shop', 'creer-un-site-web': 'site', 'entreprise-en-ligne': 'biz',
  'factures-et-recus': 'receipt', 'emploi-et-freelance': 'work', 'trouver-un-professionnel': 'tools', 'academie-formations': 'cap',
  'immobilier': 'start', 'voyages-et-tourisme': 'plane', 'reservation-en-ligne': 'events', 'pres-de-chez-vous': 'local',
  'billetterie-evenements': 'ticket', 'concours-et-recompenses': 'trophy', 'alertes-produits': 'bell', 'localisation-et-securite': 'shield',
  'outils-gratuits': 'tools'
};
function serviceIcon(slug) { return SERVICE_ICON[slug] || 'guide'; }
// Photos d'icônes choisies par l'administrateur (pricing/site.showcasePhotos) : mêmes clés que dans l'application (svc_<id>).
const SLUG_SVC = {
  'croissance-reseaux-sociaux': 'network', 'boutique-en-ligne': 'shop', 'creer-un-site-web': 'site', 'entreprise-en-ligne': 'business',
  'factures-et-recus': 'invoices', 'emploi-et-freelance': 'jobs', 'trouver-un-professionnel': 'pro', 'academie-formations': 'academy',
  'immobilier': 'immo', 'voyages-et-tourisme': 'travel', 'reservation-en-ligne': 'booking', 'pres-de-chez-vous': 'nearby',
  'billetterie-evenements': 'events', 'concours-et-recompenses': 'contests', 'alertes-produits': 'alerts'
};
const TOPIC_SVC = { wallet: 'wallet', boost: 'network', shop: 'shop', site: 'site', biz: 'business', work: 'jobs', local: 'nearby', events: 'events', earn: 'referral' };
let PHOTOS = {};
function setPhotos(m) { PHOTOS = (m && typeof m === 'object') ? m : {}; }
function photoFor(id) {
  if (!id) return '';
  const u = PHOTOS['svc_' + String(id).replace(/[^a-zA-Z0-9]+/g, '_')];
  return (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u)) ? u : '';
}
function icoTile(name, svcId) {
  const u = photoFor(svcId || TOPIC_SVC[name]);
  if (u) return `<span class="ico has-photo"><img src="${esc(u)}" alt="" width="40" height="40" loading="lazy" decoding="async"></span>`;
  return `<span class="ico">${svg(name)}</span>`;
}
function serviceTile(slug) { return icoTile(serviceIcon(slug), SLUG_SVC[slug] || 'none'); }

// Textes de l'enveloppe, du hub et des légendes, par langue.
const T = {
  fr: {
    nav: ['Services', 'Guide', 'Aide'], open: 'Ouvrir l’application', openShort: 'Ouvrir', home: 'Accueil', services: 'Services', guide: 'Guide d’utilisation', help: 'Centre d’aide',
    hubTitle: 'Guide d’utilisation de Coeurnoh Universe : pas à pas, en images',
    hubDesc: 'Apprenez à utiliser Coeurnoh Universe en quelques minutes : portefeuille, boutique, site web, réseaux sociaux, emploi, événements et outils gratuits. 14 sujets expliqués étape par étape, avec captures d’écran.',
    hubH1: 'Utiliser <em>Coeurnoh Universe</em>, pas à pas', hubLead: 'Quatorze sujets courts pour prendre l’application en main : recharger son portefeuille, booster ses réseaux, vendre en boutique, créer son site, trouver un emploi et bien plus. Disponible en français, anglais, espagnol, italien et portugais.',
    screens: 'L’application en images', screensLead: 'Quelques écrans réels de l’application, tels qu’ils s’affichent sur un téléphone.',
    faq: 'Questions fréquentes', topicsH: 'Tous les sujets', read: 'Lire le sujet', related: 'Sujets voisins', prev: 'Précédent', next: 'Suivant',
    bandH: 'Prêt à essayer ?', bandP: 'Créez votre compte gratuit et suivez le guide directement dans l’application.', screenAlt: 'Capture d’écran de l’application Coeurnoh Universe',
    cardAlt: 'Illustration du guide', trust: ['Application gratuite', 'Mobile Money, crypto et carte', 'Français, English, Español, Italiano, Português', 'Support WhatsApp'],
    footAbout: 'À propos', footTerms: 'Conditions', footPrivacy: 'Confidentialité', footRefund: 'Remboursement', footContact: 'Contact',
    footNote: '© 2026 Coeurnoh Business — Coeurnoh Universe · Application congolaise (RDC) pour l’Afrique francophone.',
    share: 'Partager cette page', copied: 'Lien copié', steps: 'Pas à pas', tipLabel: 'Bon à savoir', openIn: 'Ouvrir dans l’application', shotsTitle: 'Capture d’écran',
    cap: { menu: 'Le Menu : raccourcis et tous les services', recharge: 'Recharger son solde par Mobile Money, carte ou crypto', reseau: 'Les réseaux sociaux disponibles pour booster un compte', outils: 'La boîte à outils gratuite', wallet: 'Le portefeuille et l’historique des transactions', boutique: 'La boutique : livres et produits' },
    faqList: [
      ['Qu’est-ce que Coeurnoh Universe ?', 'Coeurnoh Universe est une application gratuite, pensée en République démocratique du Congo, qui réunit un portefeuille, une boutique, la création de site web, la croissance des réseaux sociaux, l’emploi, l’immobilier, les événements et des outils gratuits.'],
      ['Faut-il installer l’application ?', 'Non, elle s’ouvre dans le navigateur. Vous pouvez aussi l’ajouter à l’écran d’accueil de votre téléphone pour l’ouvrir comme une application, sans barre d’adresse.'],
      ['Comment recharger mon portefeuille ?', 'Depuis le Portefeuille, touchez « Recharger », puis choisissez Mobile Money, carte bancaire ou crypto. Les paiements se font sur la page sécurisée du prestataire.'],
      ['Dans quelles langues est disponible l’application ?', 'En français, anglais, espagnol, italien et portugais. La langue se change dans les paramètres.']
    ]
  },
  en: {
    nav: ['Services', 'Guide', 'Help'], open: 'Open the app', openShort: 'Open', home: 'Home', services: 'Services', guide: 'User guide', help: 'Help centre',
    hubTitle: 'Coeurnoh Universe user guide: step by step, with screenshots',
    hubDesc: 'Learn to use Coeurnoh Universe in minutes: wallet, shop, website builder, social media growth, jobs, events and free tools. 14 topics explained step by step, with screenshots.',
    hubH1: 'Using <em>Coeurnoh Universe</em>, step by step', hubLead: 'Fourteen short topics to get started: top up your wallet, boost your social accounts, sell in the shop, build a website, find a job and more. Available in French, English, Spanish, Italian and Portuguese.',
    screens: 'The app in pictures', screensLead: 'A few real screens of the app, as they appear on a phone.',
    faq: 'Frequently asked questions', topicsH: 'All topics', read: 'Read the topic', related: 'Related topics', prev: 'Previous', next: 'Next',
    bandH: 'Ready to try it?', bandP: 'Create your free account and follow the guide right inside the app.', screenAlt: 'Screenshot of the Coeurnoh Universe app',
    cardAlt: 'Guide illustration', trust: ['Free app', 'Mobile Money, crypto and card', 'Français, English, Español, Italiano, Português', 'WhatsApp support'],
    footAbout: 'About', footTerms: 'Terms', footPrivacy: 'Privacy', footRefund: 'Refunds', footContact: 'Contact',
    footNote: '© 2026 Coeurnoh Business — Coeurnoh Universe · A Congolese (DRC) app for French-speaking Africa.',
    share: 'Share this page', copied: 'Link copied', steps: 'Step by step', tipLabel: 'Good to know', openIn: 'Open in the app', shotsTitle: 'Screenshot',
    cap: { menu: 'The Menu: shortcuts and every service', recharge: 'Top up your balance by Mobile Money, card or crypto', reseau: 'Social networks available for boosting an account', outils: 'The free toolbox', wallet: 'The wallet and transaction history', boutique: 'The shop: books and products' },
    faqList: [
      ['What is Coeurnoh Universe?', 'Coeurnoh Universe is a free app designed in the Democratic Republic of the Congo. It brings together a wallet, a shop, a website builder, social media growth, jobs, real estate, events and free tools.'],
      ['Do I need to install the app?', 'No, it opens in your browser. You can also add it to your phone’s home screen to open it like an app, without the address bar.'],
      ['How do I top up my wallet?', 'In the Wallet, tap “Top up”, then choose Mobile Money, bank card or crypto. Payments are made on the payment provider’s secure page.'],
      ['Which languages does the app support?', 'French, English, Spanish, Italian and Portuguese. You can change the language in the settings.']
    ]
  },
  es: {
    nav: ['Servicios', 'Guía', 'Ayuda'], open: 'Abrir la aplicación', openShort: 'Abrir', home: 'Inicio', services: 'Servicios', guide: 'Guía de uso', help: 'Centro de ayuda',
    hubTitle: 'Guía de uso de Coeurnoh Universe: paso a paso, con capturas',
    hubDesc: 'Aprende a usar Coeurnoh Universe en pocos minutos: monedero, tienda, creación de sitio web, redes sociales, empleo, eventos y herramientas gratuitas. 14 temas explicados paso a paso, con capturas de pantalla.',
    hubH1: 'Usar <em>Coeurnoh Universe</em>, paso a paso', hubLead: 'Catorce temas breves para empezar: recargar el monedero, impulsar tus redes, vender en la tienda, crear tu sitio web, encontrar empleo y mucho más. Disponible en francés, inglés, español, italiano y portugués.',
    screens: 'La aplicación en imágenes', screensLead: 'Algunas pantallas reales de la aplicación, tal como se ven en un teléfono.',
    faq: 'Preguntas frecuentes', topicsH: 'Todos los temas', read: 'Leer el tema', related: 'Temas relacionados', prev: 'Anterior', next: 'Siguiente',
    bandH: '¿Listo para probar?', bandP: 'Crea tu cuenta gratuita y sigue la guía directamente en la aplicación.', screenAlt: 'Captura de pantalla de la aplicación Coeurnoh Universe',
    cardAlt: 'Ilustración de la guía', trust: ['Aplicación gratuita', 'Mobile Money, cripto y tarjeta', 'Français, English, Español, Italiano, Português', 'Soporte por WhatsApp'],
    footAbout: 'Acerca de', footTerms: 'Condiciones', footPrivacy: 'Privacidad', footRefund: 'Reembolsos', footContact: 'Contacto',
    footNote: '© 2026 Coeurnoh Business — Coeurnoh Universe · Aplicación congoleña (RDC) para el África francófona.',
    share: 'Compartir esta página', copied: 'Enlace copiado', steps: 'Paso a paso', tipLabel: 'Conviene saber', openIn: 'Abrir en la aplicación', shotsTitle: 'Captura de pantalla',
    cap: { menu: 'El Menú: accesos directos y todos los servicios', recharge: 'Recargar el saldo con Mobile Money, tarjeta o cripto', reseau: 'Redes sociales disponibles para impulsar una cuenta', outils: 'La caja de herramientas gratuita', wallet: 'El monedero y el historial de transacciones', boutique: 'La tienda: libros y productos' },
    faqList: [
      ['¿Qué es Coeurnoh Universe?', 'Coeurnoh Universe es una aplicación gratuita pensada en la República Democrática del Congo. Reúne un monedero, una tienda, la creación de sitios web, el crecimiento en redes sociales, empleo, inmuebles, eventos y herramientas gratuitas.'],
      ['¿Hay que instalar la aplicación?', 'No, se abre en el navegador. También puedes añadirla a la pantalla de inicio del teléfono para abrirla como una aplicación, sin barra de direcciones.'],
      ['¿Cómo recargo mi monedero?', 'En el Monedero, toca «Recargar» y elige Mobile Money, tarjeta bancaria o cripto. Los pagos se hacen en la página segura del proveedor.'],
      ['¿En qué idiomas está disponible?', 'En francés, inglés, español, italiano y portugués. El idioma se cambia en los ajustes.']
    ]
  },
  it: {
    nav: ['Servizi', 'Guida', 'Aiuto'], open: 'Apri l’app', openShort: 'Apri', home: 'Home', services: 'Servizi', guide: 'Guida all’uso', help: 'Centro assistenza',
    hubTitle: 'Guida all’uso di Coeurnoh Universe: passo dopo passo, con schermate',
    hubDesc: 'Impara a usare Coeurnoh Universe in pochi minuti: portafoglio, negozio, creazione di siti web, social media, lavoro, eventi e strumenti gratuiti. 14 argomenti spiegati passo dopo passo, con schermate.',
    hubH1: 'Usare <em>Coeurnoh Universe</em>, passo dopo passo', hubLead: 'Quattordici argomenti brevi per iniziare: ricaricare il portafoglio, far crescere i social, vendere nel negozio, creare il proprio sito, trovare lavoro e molto altro. Disponibile in francese, inglese, spagnolo, italiano e portoghese.',
    screens: 'L’app in immagini', screensLead: 'Alcune schermate reali dell’app, come appaiono su un telefono.',
    faq: 'Domande frequenti', topicsH: 'Tutti gli argomenti', read: 'Leggi l’argomento', related: 'Argomenti correlati', prev: 'Precedente', next: 'Successivo',
    bandH: 'Pronto a provare?', bandP: 'Crea il tuo account gratuito e segui la guida direttamente nell’app.', screenAlt: 'Schermata dell’app Coeurnoh Universe',
    cardAlt: 'Illustrazione della guida', trust: ['App gratuita', 'Mobile Money, cripto e carta', 'Français, English, Español, Italiano, Português', 'Assistenza WhatsApp'],
    footAbout: 'Chi siamo', footTerms: 'Condizioni', footPrivacy: 'Privacy', footRefund: 'Rimborsi', footContact: 'Contatti',
    footNote: '© 2026 Coeurnoh Business — Coeurnoh Universe · App congolese (RDC) per l’Africa francofona.',
    share: 'Condividi questa pagina', copied: 'Link copiato', steps: 'Passo dopo passo', tipLabel: 'Da sapere', openIn: 'Apri nell’app', shotsTitle: 'Schermata',
    cap: { menu: 'Il Menu: scorciatoie e tutti i servizi', recharge: 'Ricaricare il saldo con Mobile Money, carta o cripto', reseau: 'I social disponibili per far crescere un account', outils: 'La cassetta degli attrezzi gratuita', wallet: 'Il portafoglio e lo storico delle transazioni', boutique: 'Il negozio: libri e prodotti' },
    faqList: [
      ['Che cos’è Coeurnoh Universe?', 'Coeurnoh Universe è un’app gratuita pensata nella Repubblica Democratica del Congo. Riunisce portafoglio, negozio, creazione di siti web, crescita sui social, lavoro, immobili, eventi e strumenti gratuiti.'],
      ['Bisogna installare l’app?', 'No, si apre nel browser. Puoi anche aggiungerla alla schermata Home del telefono per aprirla come un’app, senza barra degli indirizzi.'],
      ['Come ricarico il portafoglio?', 'Nel Portafoglio tocca «Ricarica», poi scegli Mobile Money, carta bancaria o cripto. I pagamenti avvengono sulla pagina sicura del fornitore.'],
      ['In quali lingue è disponibile?', 'In francese, inglese, spagnolo, italiano e portoghese. La lingua si cambia nelle impostazioni.']
    ]
  },
  pt: {
    nav: ['Serviços', 'Guia', 'Ajuda'], open: 'Abrir a aplicação', openShort: 'Abrir', home: 'Início', services: 'Serviços', guide: 'Guia de utilização', help: 'Centro de ajuda',
    hubTitle: 'Guia de utilização do Coeurnoh Universe: passo a passo, com capturas',
    hubDesc: 'Aprenda a usar o Coeurnoh Universe em poucos minutos: carteira, loja, criação de sites, redes sociais, emprego, eventos e ferramentas gratuitas. 14 temas explicados passo a passo, com capturas de ecrã.',
    hubH1: 'Usar o <em>Coeurnoh Universe</em>, passo a passo', hubLead: 'Catorze temas curtos para começar: carregar a carteira, impulsionar as redes, vender na loja, criar o seu site, encontrar emprego e muito mais. Disponível em francês, inglês, espanhol, italiano e português.',
    screens: 'A aplicação em imagens', screensLead: 'Alguns ecrãs reais da aplicação, tal como aparecem num telemóvel.',
    faq: 'Perguntas frequentes', topicsH: 'Todos os temas', read: 'Ler o tema', related: 'Temas relacionados', prev: 'Anterior', next: 'Seguinte',
    bandH: 'Pronto para experimentar?', bandP: 'Crie a sua conta gratuita e siga o guia diretamente na aplicação.', screenAlt: 'Captura de ecrã da aplicação Coeurnoh Universe',
    cardAlt: 'Ilustração do guia', trust: ['Aplicação gratuita', 'Mobile Money, cripto e cartão', 'Français, English, Español, Italiano, Português', 'Suporte por WhatsApp'],
    footAbout: 'Sobre', footTerms: 'Condições', footPrivacy: 'Privacidade', footRefund: 'Reembolsos', footContact: 'Contacto',
    footNote: '© 2026 Coeurnoh Business — Coeurnoh Universe · Aplicação congolesa (RDC) para a África francófona.',
    share: 'Partilhar esta página', copied: 'Ligação copiada', steps: 'Passo a passo', tipLabel: 'Bom saber', openIn: 'Abrir na aplicação', shotsTitle: 'Captura de ecrã',
    cap: { menu: 'O Menu: atalhos e todos os serviços', recharge: 'Carregar o saldo com Mobile Money, cartão ou cripto', reseau: 'Redes sociais disponíveis para impulsionar uma conta', outils: 'A caixa de ferramentas gratuita', wallet: 'A carteira e o histórico de transações', boutique: 'A loja: livros e produtos' },
    faqList: [
      ['O que é o Coeurnoh Universe?', 'O Coeurnoh Universe é uma aplicação gratuita pensada na República Democrática do Congo. Reúne carteira, loja, criação de sites, crescimento nas redes sociais, emprego, imóveis, eventos e ferramentas gratuitas.'],
      ['É preciso instalar a aplicação?', 'Não, abre no navegador. Também pode adicioná-la ao ecrã inicial do telemóvel para a abrir como uma aplicação, sem barra de endereço.'],
      ['Como carrego a minha carteira?', 'Na Carteira, toque em «Carregar» e escolha Mobile Money, cartão bancário ou cripto. Os pagamentos fazem-se na página segura do prestador.'],
      ['Em que idiomas está disponível?', 'Em francês, inglês, espanhol, italiano e português. O idioma altera-se nas definições.']
    ]
  }
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function normLang(l) { l = String(l || 'fr').toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : 'fr'; }
function hubPath(lang) { return (lang === 'fr' ? '' : '/' + lang) + '/guide'; }
function topicPath(lang, id) { return hubPath(lang) + '/' + SLUG[id]; }
function appUrl(ref, open) {
  const q = [];
  if (open) q.push('open=' + open);
  if (ref) q.push('ref=' + encodeURIComponent(ref));
  return ORIGIN + '/' + (q.length ? '?' + q.join('&') : '');
}
function shotUrl(k) { return ORIGIN + '/app-' + k + '.webp'; }
function cardUrl(id) { return ORIGIN + '/guide-' + id + '.jpg'; }

// Toutes les adresses publiques du guide, avec leurs variantes de langue et leurs images (pour le sitemap).
function guideUrls() {
  const out = [];
  const alts = (build) => LANGS.map((l) => ({ lang: l, href: ORIGIN + build(l) }));
  LANGS.forEach((l) => {
    out.push({ loc: ORIGIN + hubPath(l), lang: l, kind: 'hub', alternates: alts(hubPath), images: [ORIGIN + '/og-image.jpg'].concat(GALLERY.map(shotUrl)) });
    DATA.order.forEach((id) => {
      out.push({ loc: ORIGIN + topicPath(l, id), lang: l, kind: 'topic', id, alternates: alts((x) => topicPath(x, id)), images: [cardUrl(id)].concat(SHOT[id] ? [shotUrl(SHOT[id])] : []) });
    });
  });
  return out;
}

function hreflangTags(build) {
  return LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${ORIGIN + build(l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${ORIGIN + build('fr')}">`;
}

function shell(o) {
  const t = T[o.lang];
  const url = ORIGIN + o.path;
  const ogImage = o.image || ORIGIN + '/og-image.jpg';
  const langs = o.single
    ? `<a class="pill" href="${esc(o.appUrl || '/')}"><span class="lg">${esc(t.open)}</span><span class="sh">${esc(t.openShort)}</span></a>`
    : `<div class="langs" role="navigation" aria-label="Langues">${LANGS.map((l) => `<a href="${o.build(l)}" hreflang="${l}" lang="${l}" ${l === o.lang ? 'aria-current="true"' : ''}>${LANG_NAME[l]}</a>`).join('')}</div>`;
  const prefix = o.lang === 'fr' ? '' : '/' + o.lang;
  const others = LANGS.filter((l) => l !== o.lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`).join('');
  return `<!doctype html>
<html lang="${o.lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${url}">
${o.single ? '' : hreflangTags(o.build)}
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta property="og:type" content="${o.single ? 'website' : 'article'}"><meta property="og:site_name" content="Coeurnoh Universe">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${ogImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(o.imageAlt || o.title)}">
<meta property="og:locale" content="${LOCALE[o.lang]}">${o.single ? '' : others}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.title)}"><meta name="twitter:description" content="${esc(o.desc)}"><meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="${ORIGIN}/icon-192-v2.png"><link rel="apple-touch-icon" href="${ORIGIN}/icon-192-v2.png">
<link rel="preload" href="/cn-serif.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/cn-inter-400.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">${o.jsonld}</script>
<style>${PUBLIC_CSS}</style>
</head><body>
<header class="top"><div class="wrap"><a class="brand" href="${prefix || '/'}"><img src="/icon-192-v2.png" alt="" width="34" height="34">Coeurnoh <em>Universe</em></a>
<nav class="mainnav" aria-label="Navigation"><a href="/services">${esc(t.nav[0])}</a><a href="${hubPath(o.lang)}"${o.here === 'guide' ? ' aria-current="page"' : ''}>${esc(t.nav[1])}</a><a href="/aide">${esc(t.nav[2])}</a></nav>
${langs}</div></header>
${o.body}
<footer class="ft"><div class="wrap">
<strong>Coeurnoh Universe</strong><br><a href="/services">${esc(t.services)}</a><a href="${hubPath(o.lang)}">${esc(t.guide)}</a><a href="/aide">${esc(t.help)}</a>${o.footLinks || ''}
<p><a href="/about">${esc(t.footAbout)}</a><a href="/terms">${esc(t.footTerms)}</a><a href="/privacy">${esc(t.footPrivacy)}</a><a href="/refund">${esc(t.footRefund)}</a><a href="/contact">${esc(t.footContact)}</a><a href="https://wa.me/243825001290" rel="noopener">WhatsApp</a></p>
<p>${esc(t.footNote)}</p>
</div></footer>
<script>(function(){var b=document.getElementById('cn-share');if(!b)return;b.addEventListener('click',function(){var u=location.href.split('#')[0],t=document.title;if(navigator.share){navigator.share({title:t,url:u}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){b.textContent=${JSON.stringify(T[o.lang].copied)}})}})})();</script>
</body></html>`;
}

function trustStrip(t) { return '<div class="trust">' + t.trust.map((x) => `<span>${esc(x)}</span>`).join('') + '</div>'; }

function figure(k, t, cls) {
  const sz = SHOT_SIZE[k];
  return `<figure class="${cls}"><img src="/app-${k}.webp" width="${sz[0]}" height="${sz[1]}" loading="lazy" decoding="async" alt="${esc(t.screenAlt + ' — ' + t.cap[k])}"><figcaption>${esc(t.cap[k])}</figcaption></figure>`;
}

function renderHub(lang, ref) {
  const t = T[lang], ui = DATA.langs[lang].ui, ch = DATA.langs[lang].ch;
  const path = hubPath(lang);
  const app = appUrl(ref, 'guide');
  const topics = DATA.order.map((id) => `<a class="gp-topic" href="${topicPath(lang, id)}"><img src="/guide-${id}.jpg" width="1200" height="630" loading="lazy" decoding="async" alt="${esc(t.cardAlt + ' — ' + ch[id].t)}"><div>${icoTile(id)}<h3>${esc(ch[id].t)}</h3><p>${esc(ch[id].s)}</p><small>${esc(t.read)} →</small></div></a>`).join('');
  const body = `<div class="hero"><div class="wrap">
<p class="crumbs"><a href="/">${esc(t.home)}</a> › ${esc(t.guide)}</p>
<span class="tag">${esc(ui.kicker)}</span>
<h1 class="wide">${t.hubH1}</h1><p class="lead">${esc(t.hubLead)}</p>
<div class="cta"><a class="pill" href="${esc(app)}">${esc(t.open)}</a><button type="button" class="pill ghost" id="cn-share">${esc(t.share)}</button></div>
${trustStrip(t)}</div></div>
<main class="wrap">
<section aria-labelledby="g-topics"><h2 id="g-topics">${esc(t.topicsH)}</h2><div class="gp-topics">${topics}</div></section>
<section aria-labelledby="g-shots"><h2 id="g-shots">${esc(t.screens)}</h2><p class="lead" style="margin-bottom:18px">${esc(t.screensLead)}</p><div class="gp-gallery">${GALLERY.map((k) => figure(k, t, 'gp-shot')).join('')}</div></section>
<section aria-labelledby="g-faq"><h2 id="g-faq">${esc(t.faq)}</h2>${t.faqList.map((f) => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}</section>
<div class="band"><h2>${esc(t.bandH)}</h2><p>${esc(t.bandP)}</p><a class="pill" href="${esc(app)}">${esc(t.open)}</a></div>
</main>`;
  const crumbs = [[t.home, ORIGIN + '/'], [t.guide, ORIGIN + path]];
  const graph = [
    { '@type': 'CollectionPage', '@id': ORIGIN + path + '#page', url: ORIGIN + path, name: t.hubTitle, description: t.hubDesc, inLanguage: lang, isPartOf: { '@id': ORIGIN + '/#website' }, publisher: { '@id': ORIGIN + '/#organization' }, primaryImageOfPage: { '@type': 'ImageObject', url: ORIGIN + '/og-image.jpg', width: 1200, height: 630 }, hasPart: DATA.order.map((id) => ({ '@type': 'WebPage', name: ch[id].t, url: ORIGIN + topicPath(lang, id) })) },
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] })) },
    { '@type': 'ItemList', itemListElement: DATA.order.map((id, i) => ({ '@type': 'ListItem', position: i + 1, name: ch[id].t, url: ORIGIN + topicPath(lang, id) })) },
    { '@type': 'FAQPage', mainEntity: t.faqList.map((f) => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } })) }
  ].concat(GALLERY.map((k) => ({ '@type': 'ImageObject', contentUrl: shotUrl(k), name: t.cap[k], caption: t.cap[k], width: SHOT_SIZE[k][0], height: SHOT_SIZE[k][1], inLanguage: lang })));
  return shell({ lang, path, build: hubPath, title: t.hubTitle, desc: t.hubDesc, body, here: 'guide', jsonld: jsonLd({ '@context': 'https://schema.org', '@graph': graph }) });
}

function renderTopic(lang, id, ref) {
  const t = T[lang], ui = DATA.langs[lang].ui, ch = DATA.langs[lang].ch, c = ch[id];
  const path = topicPath(lang, id);
  const app = appUrl(ref, 'guide-' + id);
  const title = c.t + ' — ' + ui.title + ' · Coeurnoh Universe';
  const desc = (c.s + ' ' + c.a[0]).slice(0, 300);
  const i = DATA.order.indexOf(id);
  const prev = DATA.order[i - 1], next = DATA.order[i + 1];
  const shot = SHOT[id];
  const related = DATA.order.filter((x) => x !== id && x !== prev && x !== next).slice(0, 4);
  const steps = `<ol class="steps">${c.a.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>${c.tip ? `<div class="gp-tip"><b>${esc(t.tipLabel)}</b><p>${esc(c.tip)}</p></div>` : ''}`;
  const body = `<div class="hero"><div class="wrap">
<p class="crumbs"><a href="/">${esc(t.home)}</a> › <a href="${hubPath(lang)}">${esc(t.guide)}</a> › ${esc(c.t)}</p>
<span class="tag">${svg(id)} ${esc(ui.kicker)} ${i + 1}/${DATA.order.length}</span>
<h1 class="wide">${esc(c.t)}</h1><p class="lead">${esc(c.s)}</p>
<div class="cta"><a class="pill" href="${esc(app)}">${esc(t.openIn)}</a><button type="button" class="pill ghost" id="cn-share">${esc(t.share)}</button></div>
</div></div>
<main class="wrap">
<section aria-labelledby="g-steps"><h2 id="g-steps">${esc(t.steps)}</h2>
<div class="${shot ? 'gp-cols' : ''}"><div>${steps}</div>${shot ? figure(shot, t, 'gp-shot') : ''}</div></section>
<section><figure class="gp-fig"><img src="/guide-${id}.jpg" width="1200" height="630" loading="lazy" decoding="async" alt="${esc(t.cardAlt + ' — ' + c.t)}"></figure>
<div class="gp-nav">${prev ? `<a href="${topicPath(lang, prev)}" rel="prev"><small>← ${esc(t.prev)}</small><span>${esc(ch[prev].t)}</span></a>` : ''}${next ? `<a href="${topicPath(lang, next)}" rel="next"><small>${esc(t.next)} →</small><span>${esc(ch[next].t)}</span></a>` : ''}</div></section>
<section aria-labelledby="g-rel"><h2 id="g-rel">${esc(t.related)}</h2><div class="links">${related.map((x) => `<a href="${topicPath(lang, x)}">${icoTile(x)}${esc(ch[x].t)}</a>`).join('')}<a href="${hubPath(lang)}">${icoTile('guide')}${esc(ui.topics)}</a></div></section>
<div class="band"><h2>${esc(t.bandH)}</h2><p>${esc(t.bandP)}</p><a class="pill" href="${esc(app)}">${esc(t.open)}</a></div>
</main>`;
  const crumbs = [[t.home, ORIGIN + '/'], [t.guide, ORIGIN + hubPath(lang)], [c.t, ORIGIN + path]];
  const img = { '@type': 'ImageObject', url: cardUrl(id), width: 1200, height: 630 };
  const graph = [
    { '@type': 'WebPage', '@id': ORIGIN + path + '#page', url: ORIGIN + path, name: title, description: desc, inLanguage: lang, isPartOf: { '@id': ORIGIN + '/#website' }, publisher: { '@id': ORIGIN + '/#organization' }, primaryImageOfPage: img },
    { '@type': 'HowTo', '@id': ORIGIN + path + '#howto', name: c.t, description: c.s, inLanguage: lang, image: [cardUrl(id)].concat(shot ? [shotUrl(shot)] : []), totalTime: 'PT3M', step: c.a.map((s, n) => ({ '@type': 'HowToStep', position: n + 1, name: s.split(/[.:]/)[0].slice(0, 90), text: s, url: ORIGIN + path + '#g-steps' })) },
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((x, n) => ({ '@type': 'ListItem', position: n + 1, name: x[0], item: x[1] })) }
  ];
  return shell({ lang, path, build: (l) => topicPath(l, id), title, desc, body, here: 'guide', image: cardUrl(id), imageAlt: t.cardAlt + ' — ' + c.t, jsonld: jsonLd({ '@context': 'https://schema.org', '@graph': graph }) });
}

// Point d'entrée : slug vide = hub. Retourne { status, html } ou null si inconnu.
function renderGuide(langIn, slug, ref) {
  const lang = normLang(langIn);
  const s = String(slug || '').toLowerCase().replace(/\/+$/, '');
  if (!s) return { status: 200, html: renderHub(lang, ref) };
  const id = ID_BY_SLUG[s];
  if (!id) return null;
  return { status: 200, html: renderTopic(lang, id, ref) };
}

module.exports = { shell, serviceIcon, serviceTile, setPhotos, photoFor, renderGuide, guideUrls, SLUG, ID_BY_SLUG, LANGS, T, hubPath, topicPath, ORIGIN, svg, icoTile };
