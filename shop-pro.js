/* Coeurnoh Universe — Boutique « vitrine » (chargée à la première ouverture de la Boutique).
   Remplace l'ancienne liste par une vraie vitrine de marché en ligne : bannière avec recherche, catégories,
   ventes flash avec compte à rebours, nouveautés, plus aimés, vendeurs vérifiés, vus récemment, catalogue avec
   filtres (type, prix, promotions, vendeurs vérifiés, favoris) et tris, vitrine d'un vendeur, QR de boutique à
   faire scanner, panier flottant avec la remise de 5 % dès 4 articles.
   Aucun calcul d'argent ici : on affiche seulement. Achat, panier, « j'aime », partage et suppression utilisent
   les fonctions déjà présentes dans l'application (le serveur reste seul à calculer et à écrire les montants).
   Couleurs de la Boutique : vert et jaune de l'affiche (aplats, sans dégradé). Textes en 8 langues. */
(function () {
  'use strict';
  if (window.cnShopPro) return;

  /* ---------- Textes : fr, en, es, it, pt, de, sw, ln ---------- */
  var LG = ['fr', 'en', 'es', 'it', 'pt', 'de', 'sw', 'ln'];
  var D = {
    hero_sub: ['Livres et produits de vendeurs de confiance. Achète en sécurité, vends gratuitement.', 'Books and products from trusted sellers. Buy safely, sell for free.', 'Libros y productos de vendedores de confianza. Compra con seguridad, vende gratis.', 'Libri e prodotti di venditori affidabili. Acquista in sicurezza, vendi gratis.', 'Livros e produtos de vendedores de confiança. Compra em segurança, vende de graça.', 'Bücher und Produkte von vertrauenswürdigen Verkäufern. Sicher kaufen, kostenlos verkaufen.', 'Vitabu na bidhaa kutoka kwa wauzaji wanaoaminika. Nunua kwa usalama, uza bure.', 'Mikanda mpe biloko ya batekisi bandimami. Somba na libateli, teka ofele.'],
    search_ph: ['Livre, produit ou vendeur…', 'Book, product or seller…', 'Libro, producto o vendedor…', 'Libro, prodotto o venditore…', 'Livro, produto ou vendedor…', 'Buch, Produkt oder Verkäufer…', 'Kitabu, bidhaa au muuzaji…', 'Buku, eloko to motekisi…'],
    all_cat: ['Tout', 'All', 'Todo', 'Tutto', 'Tudo', 'Alle', 'Zote', 'Nyonso'],
    f_type: ['Type', 'Type', 'Tipo', 'Tipo', 'Tipo', 'Typ', 'Aina', 'Lolenge'],
    clear_q: ['Effacer la recherche', 'Clear search', 'Borrar búsqueda', 'Cancella ricerca', 'Limpar pesquisa', 'Suche löschen', 'Futa utafutaji', 'Longola boluki'],
    sell: ['Vendre', 'Sell', 'Vender', 'Vendi', 'Vender', 'Verkaufen', 'Uza', 'Koteka'],
    my_qr: ['QR de ma boutique', 'My shop QR', 'QR de mi tienda', 'QR del mio negozio', 'QR da minha loja', 'QR meines Shops', 'QR ya duka langu', 'QR ya ndako na ngai'],
    my_space: ['Espace vendeur', 'Seller space', 'Espacio vendedor', 'Area venditore', 'Espaço vendedor', 'Verkäuferbereich', 'Eneo la muuzaji', 'Esika ya motekisi'],
    cta_title: ['Plus de clients, plus de ventes, zéro complication', 'More customers, more sales, zero hassle', 'Más clientes, más ventas, cero complicaciones', 'Più clienti, più vendite, zero complicazioni', 'Mais clientes, mais vendas, zero complicação', 'Mehr Kunden, mehr Verkäufe, null Aufwand', 'Wateja zaidi, mauzo zaidi, bila usumbufu', 'Bakiliya mingi, bitekeli mingi, mikakatano te'],
    cta_sub: ['Ouvre ta boutique gratuitement et partage ton QR : tes clients arrivent directement chez toi.', 'Open your shop for free and share your QR code: customers land straight on your shop.', 'Abre tu tienda gratis y comparte tu QR: tus clientes llegan directo a ti.', 'Apri il tuo negozio gratis e condividi il tuo QR: i clienti arrivano direttamente da te.', 'Abre a tua loja grátis e partilha o teu QR: os clientes chegam diretamente a ti.', 'Eröffne deinen Shop kostenlos und teile deinen QR-Code: Kunden landen direkt bei dir.', 'Fungua duka lako bure na ushiriki QR yako: wateja wanafika moja kwa moja kwako.', 'Fungola ndako na yo ya koteka ofele mpe kabola QR na yo: bakiliya bakoya nokinoki epai na yo.'],
    cta_btn: ['Ouvrir ma boutique gratuitement', 'Open my shop for free', 'Abrir mi tienda gratis', 'Apri il mio negozio gratis', 'Abrir a minha loja grátis', 'Meinen Shop kostenlos eröffnen', 'Fungua duka langu bure', 'Fungola ndako na ngai ofele'],
    mine_title: ['Ma boutique', 'My shop', 'Mi tienda', 'Il mio negozio', 'A minha loja', 'Mein Shop', 'Duka langu', 'Ndako na ngai'],
    mine_sub: ['Articles en ligne : {n}. Ajoute ton WhatsApp et ton moyen de paiement pour que tes clients te joignent et te paient facilement.', 'Items online: {n}. Add your WhatsApp and payment method so customers can reach and pay you easily.', 'Artículos en línea: {n}. Añade tu WhatsApp y tu medio de pago para que tus clientes te contacten y te paguen fácilmente.', 'Articoli online: {n}. Aggiungi il tuo WhatsApp e il metodo di pagamento: i clienti ti contatteranno e ti pagheranno facilmente.', 'Artigos online: {n}. Adiciona o teu WhatsApp e o meio de pagamento para que os clientes te contactem e te paguem com facilidade.', 'Artikel online: {n}. Füge dein WhatsApp und deine Zahlungsart hinzu, damit Kunden dich leicht erreichen und bezahlen können.', 'Bidhaa mtandaoni: {n}. Ongeza WhatsApp yako na njia ya malipo ili wateja wakufikie na kukulipa kwa urahisi.', 'Biloko na internet: {n}. Bakisa WhatsApp na yo mpe lolenge ya kofuta mpo bakiliya bakoka kosolola na yo mpe kofuta yo malamu.'],
    see_mine: ['Voir ma vitrine', 'View my storefront', 'Ver mi escaparate', 'Vedi la mia vetrina', 'Ver a minha montra', 'Meine Auslage ansehen', 'Tazama vitrini yangu', 'Tala vitrine na ngai'],
    trust_pay: ['Paiement sécurisé', 'Secure payment', 'Pago seguro', 'Pagamento sicuro', 'Pagamento seguro', 'Sichere Zahlung', 'Malipo salama', 'Kofuta na libateli'],
    trust_ver: ['Vendeurs vérifiés', 'Verified sellers', 'Vendedores verificados', 'Venditori verificati', 'Vendedores verificados', 'Geprüfte Verkäufer', 'Wauzaji waliothibitishwa', 'Batekisi bandimami'],
    trust_dl: ['Livres immédiats', 'Instant books', 'Libros al instante', 'Libri immediati', 'Livros imediatos', 'Bücher sofort', 'Vitabu papo hapo', 'Mikanda nokinoki'],
    trust_wa: ['Contact WhatsApp', 'WhatsApp contact', 'Contacto WhatsApp', 'Contatto WhatsApp', 'Contacto WhatsApp', 'WhatsApp-Kontakt', 'Mawasiliano WhatsApp', 'Kosolola na WhatsApp'],
    stat_items: ['{n} articles', '{n} items', '{n} artículos', '{n} articoli', '{n} artigos', '{n} Artikel', 'bidhaa {n}', 'biloko {n}'],
    stat_sellers: ['{n} vendeurs', '{n} sellers', '{n} vendedores', '{n} venditori', '{n} vendedores', '{n} Verkäufer', 'wauzaji {n}', 'batekisi {n}'],
    stat_items_1: ['1 article', '1 item', '1 artículo', '1 articolo', '1 artigo', '1 Artikel', 'bidhaa 1', 'eloko 1'],
    stat_sellers_1: ['1 vendeur', '1 seller', '1 vendedor', '1 venditore', '1 vendedor', '1 Verkäufer', 'muuzaji 1', 'motekisi 1'],
    stat_verified_1: ['1 vérifié', '1 verified', '1 verificado', '1 verificato', '1 verificado', '1 geprüft', '1 amethibitishwa', '1 andimami'],
    stat_verified: ['{n} vérifiés', '{n} verified', '{n} verificados', '{n} verificati', '{n} verificados', '{n} geprüft', '{n} waliothibitishwa', '{n} bandimami'],
    tab_home: ['Accueil', 'Home', 'Inicio', 'Home', 'Início', 'Start', 'Mwanzo', 'Ebandeli'],
    tab_catalog: ['Catalogue', 'Catalogue', 'Catálogo', 'Catalogo', 'Catálogo', 'Katalog', 'Orodha', 'Katalogi'],
    tab_cart: ['Panier', 'Cart', 'Carrito', 'Carrello', 'Carrinho', 'Warenkorb', 'Kikapu', 'Panye'],
    flash: ['Ventes flash', 'Flash deals', 'Ofertas flash', 'Offerte lampo', 'Ofertas relâmpago', 'Blitzangebote', 'Ofa za haraka', 'Bitekeli ya noki'],
    flash_sub: ['Prix réduits, pour un temps limité', 'Reduced prices for a limited time', 'Precios reducidos por tiempo limitado', 'Prezzi ridotti per un tempo limitato', 'Preços reduzidos por tempo limitado', 'Reduzierte Preise, nur für kurze Zeit', 'Bei zilizopunguzwa kwa muda mfupi', 'Ntalo ekitisami mpo na ntango moke'],
    ends_in: ['Fin dans {t}', 'Ends in {t}', 'Termina en {t}', 'Finisce tra {t}', 'Termina em {t}', 'Endet in {t}', 'Inaisha baada ya {t}', 'Esili na {t}'],
    ends_soon: ['Bientôt terminé', 'Ending soon', 'Termina pronto', 'Quasi finita', 'A terminar', 'Endet bald', 'Inakaribia kuisha', 'Ekosila noki'],
    new_arrivals: ['Nouveautés', 'New arrivals', 'Novedades', 'Novità', 'Novidades', 'Neuheiten', 'Bidhaa mpya', 'Biloko ya sika'],
    top_liked: ['Les plus aimés', 'Most loved', 'Los más queridos', 'I più amati', 'Os mais amados', 'Am beliebtesten', 'Zinazopendwa zaidi', 'Oyo ekolingama mingi'],
    recent: ['Vus récemment', 'Recently viewed', 'Vistos recientemente', 'Visti di recente', 'Vistos recentemente', 'Zuletzt angesehen', 'Ulizoona hivi karibuni', 'Omonaki sika'],
    see_all: ['Tout voir', 'See all', 'Ver todo', 'Vedi tutto', 'Ver tudo', 'Alle ansehen', 'Ona zote', 'Tala nyonso'],
    all_items: ['Tous les articles', 'All items', 'Todos los artículos', 'Tutti gli articoli', 'Todos os artigos', 'Alle Artikel', 'Bidhaa zote', 'Biloko nyonso'],
    results_n: ['{n} résultats', '{n} results', '{n} resultados', '{n} risultati', '{n} resultados', '{n} Ergebnisse', 'matokeo {n}', 'Biloko {n} emonani'],
    result_1: ['1 résultat', '1 result', '1 resultado', '1 risultato', '1 resultado', '1 Ergebnis', 'tokeo 1', 'Eloko 1 emonani'],
    filters: ['Filtres', 'Filters', 'Filtros', 'Filtri', 'Filtros', 'Filter', 'Vichujio', 'Bafiltre'],
    sort: ['Trier', 'Sort', 'Ordenar', 'Ordina', 'Ordenar', 'Sortieren', 'Panga', 'Kopona molongo'],
    sort_recent: ['Plus récents', 'Newest', 'Más recientes', 'Più recenti', 'Mais recentes', 'Neueste', 'Mpya zaidi', 'Ya sika'],
    sort_popular: ['Plus aimés', 'Most liked', 'Más gustados', 'Più apprezzati', 'Mais gostados', 'Beliebteste', 'Zinazopendwa', 'Elingami mingi'],
    sort_low: ['Prix croissant', 'Price: low to high', 'Precio: de menor a mayor', 'Prezzo crescente', 'Preço crescente', 'Preis aufsteigend', 'Bei: chini kwenda juu', 'Ntalo moke liboso'],
    sort_high: ['Prix décroissant', 'Price: high to low', 'Precio: de mayor a menor', 'Prezzo decrescente', 'Preço decrescente', 'Preis absteigend', 'Bei: juu kwenda chini', 'Ntalo monene liboso'],
    sort_deal: ['Meilleures remises', 'Biggest discounts', 'Mayores descuentos', 'Sconti maggiori', 'Maiores descontos', 'Größte Rabatte', 'Punguzo kubwa zaidi', 'Bokitisi monene'],
    price_range: ['Prix (USD)', 'Price (USD)', 'Precio (USD)', 'Prezzo (USD)', 'Preço (USD)', 'Preis (USD)', 'Bei (USD)', 'Ntalo (USD)'],
    p_min: ['Min', 'Min', 'Mín', 'Min', 'Mín', 'Min', 'Chini', 'Moke'],
    p_max: ['Max', 'Max', 'Máx', 'Max', 'Máx', 'Max', 'Juu', 'Monene'],
    only_promo: ['Promotions seulement', 'Deals only', 'Solo ofertas', 'Solo offerte', 'Só promoções', 'Nur Angebote', 'Punguzo pekee', 'Bokitisi kaka'],
    only_ver: ['Vendeurs vérifiés seulement', 'Verified sellers only', 'Solo vendedores verificados', 'Solo venditori verificati', 'Só vendedores verificados', 'Nur geprüfte Verkäufer', 'Wauzaji waliothibitishwa pekee', 'Batekisi bandimami kaka'],
    only_fav: ['Mes favoris', 'My favourites', 'Mis favoritos', 'I miei preferiti', 'Os meus favoritos', 'Meine Favoriten', 'Vipendwa vyangu', 'Biloko nalingi'],
    apply: ['Voir les résultats', 'Show results', 'Ver resultados', 'Mostra risultati', 'Ver resultados', 'Ergebnisse anzeigen', 'Onyesha matokeo', 'Tala biyano'],
    reset: ['Réinitialiser', 'Reset', 'Restablecer', 'Reimposta', 'Repor', 'Zurücksetzen', 'Weka upya', 'Zongisa ndenge ezalaki'],
    b_new: ['Nouveau', 'New', 'Nuevo', 'Nuovo', 'Novo', 'Neu', 'Mpya', 'Ya sika'],
    k_book: ['Livre', 'Book', 'Libro', 'Libro', 'Livro', 'Buch', 'Kitabu', 'Buku'],
    k_product: ['Produit', 'Product', 'Producto', 'Prodotto', 'Produto', 'Produkt', 'Bidhaa', 'Eloko'],
    add: ['Ajouter', 'Add', 'Añadir', 'Aggiungi', 'Adicionar', 'Hinzufügen', 'Weka', 'Bakisa'],
    in_cart: ['Dans le panier', 'In cart', 'En el carrito', 'Nel carrello', 'No carrinho', 'Im Warenkorb', 'Kikapuni', 'Na panye'],
    download: ['Télécharger', 'Download', 'Descargar', 'Scarica', 'Descarregar', 'Herunterladen', 'Pakua', 'Kozwa'],
    owned: ['Déjà acheté', 'Already bought', 'Ya comprado', 'Già acquistato', 'Já comprado', 'Bereits gekauft', 'Umeshanunua', 'Osombi yango'],
    by: ['par {name}', 'by {name}', 'de {name}', 'di {name}', 'por {name}', 'von {name}', 'na {name}', 'na {name}'],
    free: ['Gratuit', 'Free', 'Gratis', 'Gratis', 'Grátis', 'Gratis', 'Bure', 'Ofele'],
    empty_title: ['Aucun article trouvé', 'No items found', 'No se encontraron artículos', 'Nessun articolo trovato', 'Nenhum artigo encontrado', 'Keine Artikel gefunden', 'Hakuna bidhaa zilizopatikana', 'Eloko moko te emonani'],
    empty_sub: ['Essaie une autre recherche ou retire un filtre.', 'Try another search or remove a filter.', 'Prueba otra búsqueda o quita un filtro.', 'Prova un’altra ricerca o rimuovi un filtro.', 'Tenta outra pesquisa ou remove um filtro.', 'Versuche eine andere Suche oder entferne einen Filter.', 'Jaribu utafutaji mwingine au uondoe kichujio.', 'Meká koluka mosusu to longola filtre.'],
    clear: ['Effacer les filtres', 'Clear filters', 'Borrar filtros', 'Cancella filtri', 'Limpar filtros', 'Filter löschen', 'Futa vichujio', 'Longola bafiltre'],
    empty_seller: ['Ce vendeur n’a pas encore d’article.', 'This seller has no items yet.', 'Este vendedor aún no tiene artículos.', 'Questo venditore non ha ancora articoli.', 'Este vendedor ainda não tem artigos.', 'Dieser Verkäufer hat noch keine Artikel.', 'Muuzaji huyu bado hana bidhaa.', 'Motekisi oyo azali naino na eloko te.'],
    empty_mine: ['Publie ton premier article : il apparaît ici.', 'Publish your first item: it shows up here.', 'Publica tu primer artículo: aparecerá aquí.', 'Pubblica il tuo primo articolo: apparirà qui.', 'Publica o teu primeiro artigo: aparece aqui.', 'Veröffentliche deinen ersten Artikel: er erscheint hier.', 'Chapisha bidhaa yako ya kwanza: itaonekana hapa.', 'Pesa eloko na yo ya liboso: ekomonana awa.'],
    more: ['Voir plus d’articles', 'Show more items', 'Ver más artículos', 'Mostra altri articoli', 'Ver mais artigos', 'Mehr Artikel anzeigen', 'Onyesha bidhaa zaidi', 'Tala biloko mosusu'],
    view_cart: ['Voir le panier', 'View cart', 'Ver carrito', 'Vedi carrello', 'Ver carrinho', 'Warenkorb ansehen', 'Tazama kikapu', 'Tala panye'],
    hint_n: ['Ajoute {n} de plus : −5 % sur le panier', 'Add {n} more: 5% off your cart', 'Añade {n} más: 5 % de descuento', 'Aggiungine {n}: −5% sul carrello', 'Adiciona mais {n}: −5 % no carrinho', 'Noch {n} dazu: 5 % Rabatt', 'Ongeza {n} zaidi: punguzo la 5 %', 'Bakisa {n} mosusu: −5 % na panye'],
    hint_ok: ['Remise de 5 % appliquée', '5% discount applied', 'Descuento del 5 % aplicado', 'Sconto del 5% applicato', 'Desconto de 5 % aplicado', '5 % Rabatt angewendet', 'Punguzo la 5 % limetumika', 'Bokitisi ya 5 % etiami'],
    share: ['Partager', 'Share', 'Compartir', 'Condividi', 'Partilhar', 'Teilen', 'Shiriki', 'Kokabola'],
    copied: ['Lien copié !', 'Link copied!', '¡Enlace copiado!', 'Link copiato!', 'Link copiado!', 'Link kopiert!', 'Kiungo kimenakiliwa!', 'Lien ekopami!'],
    seller_title: ['Boutique de {name}', '{name}’s shop', 'Tienda de {name}', 'Negozio di {name}', 'Loja de {name}', 'Shop von {name}', 'Duka la {name}', 'Ndako ya {name}'],
    all_shop: ['Toute la boutique', 'Whole shop', 'Toda la tienda', 'Tutto il negozio', 'Toda a loja', 'Ganzer Shop', 'Duka lote', 'Boutique mobimba'],
    verified: ['Vérifié', 'Verified', 'Verificado', 'Verificato', 'Verificado', 'Geprüft', 'Amethibitishwa', 'Andimami'],
    qr_sub: ['Fais scanner ce code : tes clients arrivent directement sur tes articles.', 'Let people scan this code: they land straight on your items.', 'Haz que escaneen este código: llegan directo a tus artículos.', 'Fai scansionare questo codice: arrivano direttamente ai tuoi articoli.', 'Pede para lerem este código: chegam diretamente aos teus artigos.', 'Lass den Code scannen: Kunden landen direkt bei deinen Artikeln.', 'Waache wachanue msimbo huu: wanafika moja kwa moja kwenye bidhaa zako.', 'Pesa bato báscanner kode oyo: bakoya nokinoki epai ya biloko na yo.'],
    qr_copy: ['Copier le lien', 'Copy link', 'Copiar enlace', 'Copia link', 'Copiar link', 'Link kopieren', 'Nakili kiungo', 'Kopi lien'],
    qr_save: ['Enregistrer l’image', 'Save image', 'Guardar imagen', 'Salva immagine', 'Guardar imagem', 'Bild speichern', 'Hifadhi picha', 'Bomba elilingi'],
    qr_share: ['Partager ma boutique', 'Share my shop', 'Compartir mi tienda', 'Condividi il mio negozio', 'Partilhar a minha loja', 'Meinen Shop teilen', 'Shiriki duka langu', 'Kabola ndako na ngai'],
    qr_share_text: ['Découvre ma boutique sur Coeurnoh Universe', 'Discover my shop on Coeurnoh Universe', 'Descubre mi tienda en Coeurnoh Universe', 'Scopri il mio negozio su Coeurnoh Universe', 'Descobre a minha loja na Coeurnoh Universe', 'Entdecke meinen Shop auf Coeurnoh Universe', 'Gundua duka langu kwenye Coeurnoh Universe', 'Tala ndako na ngai na Coeurnoh Universe'],
    qr_login: ['Connecte-toi pour obtenir le QR de ta boutique.', 'Log in to get your shop QR.', 'Inicia sesión para obtener el QR de tu tienda.', 'Accedi per ottenere il QR del tuo negozio.', 'Inicia sessão para obter o QR da tua loja.', 'Melde dich an, um deinen Shop-QR zu erhalten.', 'Ingia ili upate QR ya duka lako.', 'Kota mpo na kozwa QR ya ndako na yo.'],
    close: ['Fermer', 'Close', 'Cerrar', 'Chiudi', 'Fechar', 'Schließen', 'Funga', 'Kokanga'],
    err: ['Impossible de charger la boutique.', 'Could not load the shop.', 'No se pudo cargar la tienda.', 'Impossibile caricare il negozio.', 'Não foi possível carregar a loja.', 'Der Shop konnte nicht geladen werden.', 'Imeshindwa kupakia duka.', 'Boutique ekoki kofungwama te.'],
    retry: ['Réessayer', 'Retry', 'Reintentar', 'Riprova', 'Tentar de novo', 'Erneut versuchen', 'Jaribu tena', 'Meká lisusu'],
    refresh: ['Actualiser', 'Refresh', 'Actualizar', 'Aggiorna', 'Atualizar', 'Aktualisieren', 'Onyesha upya', 'Bongisa'],
    like: ['J’aime', 'Like', 'Me gusta', 'Mi piace', 'Gosto', 'Gefällt mir', 'Penda', 'Kolinga'],
    comments: ['Commentaires', 'Comments', 'Comentarios', 'Commenti', 'Comentários', 'Kommentare', 'Maoni', 'Ba commentaire'],
    settings_title: ['Contacts et paiement', 'Contacts and payment', 'Contactos y pago', 'Contatti e pagamento', 'Contactos e pagamento', 'Kontakt und Zahlung', 'Mawasiliano na malipo', 'Kosolola mpe kofuta'],
    settings_sub: ['Ces informations s’affichent sur ta vitrine : tes clients te contactent et te paient directement.', 'This information appears on your storefront: customers contact and pay you directly.', 'Esta información aparece en tu escaparate: tus clientes te contactan y te pagan directamente.', 'Queste informazioni compaiono sulla tua vetrina: i clienti ti contattano e ti pagano direttamente.', 'Estas informações aparecem na tua montra: os clientes contactam-te e pagam-te diretamente.', 'Diese Angaben erscheinen in deiner Auslage: Kunden kontaktieren und bezahlen dich direkt.', 'Maelezo haya yanaonekana kwenye vitrini yako: wateja wanawasiliana nawe na kukulipa moja kwa moja.', 'Makambo oyo ekomonana na vitrine na yo: bakiliya bakosolola na yo mpe bakofuta yo na yo moko.'],
    s_contacts: ['Contacts', 'Contacts', 'Contactos', 'Contatti', 'Contactos', 'Kontakt', 'Mawasiliano', 'Kosolola'],
    f_whatsapp: ['WhatsApp (avec l’indicatif, ex. 243812345678)', 'WhatsApp (with country code, e.g. 243812345678)', 'WhatsApp (con prefijo, p. ej. 243812345678)', 'WhatsApp (con prefisso, es. 243812345678)', 'WhatsApp (com indicativo, ex. 243812345678)', 'WhatsApp (mit Landesvorwahl, z. B. 243812345678)', 'WhatsApp (na msimbo wa nchi, mf. 243812345678)', 'WhatsApp (na kode ya ekolo, ndakisa 243812345678)'],
    f_call: ['Numéro d’appel', 'Phone number', 'Número de llamada', 'Numero di telefono', 'Número de chamada', 'Telefonnummer', 'Namba ya simu', 'Nimero ya telefone'],
    f_email: ['E-mail', 'Email', 'Correo electrónico', 'E-mail', 'E-mail', 'E-Mail', 'Barua pepe', 'Imeli'],
    f_facebook: ['Facebook (lien ou nom)', 'Facebook (link or name)', 'Facebook (enlace o nombre)', 'Facebook (link o nome)', 'Facebook (link ou nome)', 'Facebook (Link oder Name)', 'Facebook (kiungo au jina)', 'Facebook (lien to nkombo)'],
    f_instagram: ['Instagram (lien ou nom)', 'Instagram (link or name)', 'Instagram (enlace o nombre)', 'Instagram (link o nome)', 'Instagram (link ou nome)', 'Instagram (Link oder Name)', 'Instagram (kiungo au jina)', 'Instagram (lien to nkombo)'],
    f_tiktok: ['TikTok (lien ou nom)', 'TikTok (link or name)', 'TikTok (enlace o nombre)', 'TikTok (link o nome)', 'TikTok (link ou nome)', 'TikTok (Link oder Name)', 'TikTok (kiungo au jina)', 'TikTok (lien to nkombo)'],
    f_telegram: ['Telegram (lien ou nom)', 'Telegram (link or name)', 'Telegram (enlace o nombre)', 'Telegram (link o nome)', 'Telegram (link ou nome)', 'Telegram (Link oder Name)', 'Telegram (kiungo au jina)', 'Telegram (lien to nkombo)'],
    f_website: ['Site web (https://…)', 'Website (https://…)', 'Sitio web (https://…)', 'Sito web (https://…)', 'Site (https://…)', 'Webseite (https://…)', 'Tovuti (https://…)', 'Site ya internet (https://…)'],
    s_pay: ['Paiement', 'Payment', 'Pago', 'Pagamento', 'Pagamento', 'Zahlung', 'Malipo', 'Kofuta'],
    pay_intro: ['Ajoute le lien de ta passerelle de paiement (Mobile Money, PayPal, Stripe, Flutterwave, banque…) et/ou ton QR de paiement. Jusqu’à 3 liens.', 'Add the link of your payment gateway (Mobile Money, PayPal, Stripe, Flutterwave, bank…) and/or your payment QR code. Up to 3 links.', 'Añade el enlace de tu pasarela de pago (Mobile Money, PayPal, Stripe, Flutterwave, banco…) y/o tu QR de pago. Hasta 3 enlaces.', 'Aggiungi il link del tuo gateway di pagamento (Mobile Money, PayPal, Stripe, Flutterwave, banca…) e/o il tuo QR di pagamento. Fino a 3 link.', 'Adiciona o link da tua plataforma de pagamento (Mobile Money, PayPal, Stripe, Flutterwave, banco…) e/ou o teu QR de pagamento. Até 3 links.', 'Füge den Link deines Zahlungsanbieters (Mobile Money, PayPal, Stripe, Flutterwave, Bank…) und/oder deinen Zahlungs-QR hinzu. Bis zu 3 Links.', 'Weka kiungo cha njia yako ya malipo (Mobile Money, PayPal, Stripe, Flutterwave, benki…) na/au QR yako ya malipo. Hadi viungo 3.', 'Tia lien ya bisika ya kofuta na yo (Mobile Money, PayPal, Stripe, Flutterwave, banki…) mpe/to QR na yo ya kofuta. Tii kino ba lien 3.'],
    pay_label_ph: ['Nom (ex. Orange Money)', 'Name (e.g. Orange Money)', 'Nombre (p. ej. Orange Money)', 'Nome (es. Orange Money)', 'Nome (ex. Orange Money)', 'Name (z. B. Orange Money)', 'Jina (mf. Orange Money)', 'Nkombo (ndakisa Orange Money)'],
    pay_add: ['Ajouter un lien', 'Add a link', 'Añadir un enlace', 'Aggiungi un link', 'Adicionar um link', 'Link hinzufügen', 'Ongeza kiungo', 'Bakisa lien'],
    pay_remove: ['Retirer', 'Remove', 'Quitar', 'Rimuovi', 'Remover', 'Entfernen', 'Ondoa', 'Longola'],
    pay_qr: ['QR de paiement (image)', 'Payment QR (image)', 'QR de pago (imagen)', 'QR di pagamento (immagine)', 'QR de pagamento (imagem)', 'Zahlungs-QR (Bild)', 'QR ya malipo (picha)', 'QR ya kofuta (elilingi)'],
    pay_qr_pick: ['Choisir l’image du QR', 'Choose the QR image', 'Elegir la imagen del QR', 'Scegli l’immagine del QR', 'Escolher a imagem do QR', 'QR-Bild auswählen', 'Chagua picha ya QR', 'Cha elilingi ya QR'],
    pay_qr_change: ['Changer l’image', 'Change image', 'Cambiar imagen', 'Cambia immagine', 'Mudar imagem', 'Bild ändern', 'Badilisha picha', 'Bongola elilingi'],
    pay_qr_remove: ['Retirer le QR', 'Remove the QR', 'Quitar el QR', 'Rimuovi il QR', 'Remover o QR', 'QR entfernen', 'Ondoa QR', 'Longola QR'],
    pay_note: ['Message pour l’acheteur (facultatif)', 'Message for the buyer (optional)', 'Mensaje para el comprador (opcional)', 'Messaggio per l’acquirente (facoltativo)', 'Mensagem para o comprador (facultativo)', 'Nachricht an den Käufer (optional)', 'Ujumbe kwa mnunuzi (hiari)', 'Nsango mpo na mosombi (ya malamu kaka)'],
    pay_note_ph: ['Ex. Envoie la preuve de paiement sur WhatsApp', 'E.g. Send the proof of payment on WhatsApp', 'P. ej. Envía el comprobante de pago por WhatsApp', 'Es. Invia la prova di pagamento su WhatsApp', 'Ex. Envia o comprovativo de pagamento por WhatsApp', 'z. B. Sende den Zahlungsbeleg per WhatsApp', 'Mf. Tuma uthibitisho wa malipo kwa WhatsApp', 'Ndakisa Tinda preuve ya kofuta na WhatsApp'],
    pay_own_warn: ['Le paiement se fait chez ta passerelle, pas dans Coeurnoh Universe. L’application ne le confirme pas : vérifie toi-même que tu as reçu l’argent avant de livrer.', 'Payment happens at your gateway, not inside Coeurnoh Universe. The app does not confirm it: check yourself that you received the money before delivering.', 'El pago se hace en tu pasarela, no dentro de Coeurnoh Universe. La aplicación no lo confirma: comprueba tú mismo que recibiste el dinero antes de entregar.', 'Il pagamento avviene sul tuo gateway, non dentro Coeurnoh Universe. L’app non lo conferma: verifica tu stesso di aver ricevuto i soldi prima di consegnare.', 'O pagamento é feito na tua plataforma, não dentro da Coeurnoh Universe. A aplicação não o confirma: verifica tu próprio que recebeste o dinheiro antes de entregar.', 'Die Zahlung läuft über deinen Anbieter, nicht in Coeurnoh Universe. Die App bestätigt sie nicht: Prüfe selbst, ob das Geld angekommen ist, bevor du lieferst.', 'Malipo hufanyika kwenye njia yako ya malipo, si ndani ya Coeurnoh Universe. Programu haithibitishi: hakikisha mwenyewe umepokea pesa kabla ya kukabidhi.', 'Kofuta esalemi na bisika na yo, kati na Coeurnoh Universe te. Application ekondimisaka yango te: tala yo moko ete ozwi mbongo liboso ya kopesa eloko.'],
    save: ['Enregistrer', 'Save', 'Guardar', 'Salva', 'Guardar', 'Speichern', 'Hifadhi', 'Bomba'],
    saving: ['Enregistrement…', 'Saving…', 'Guardando…', 'Salvataggio…', 'A guardar…', 'Wird gespeichert…', 'Inahifadhi…', 'Ezali kobomba…'],
    saved: ['Boutique enregistrée', 'Shop saved', 'Tienda guardada', 'Negozio salvato', 'Loja guardada', 'Shop gespeichert', 'Duka limehifadhiwa', 'Ndako ebombami'],
    loading_profile: ['Chargement…', 'Loading…', 'Cargando…', 'Caricamento…', 'A carregar…', 'Wird geladen…', 'Inapakia…', 'Ezali kofungwama…'],
    err_https: ['Chaque lien doit avoir un nom et commencer par https://', 'Each link needs a name and must start with https://', 'Cada enlace necesita un nombre y empezar por https://', 'Ogni link deve avere un nome e iniziare con https://', 'Cada link precisa de um nome e começar por https://', 'Jeder Link braucht einen Namen und muss mit https:// beginnen', 'Kila kiungo kinahitaji jina na kuanza na https://', 'Lien nyonso esengeli kozala na nkombo mpe ebanda na https://'],
    blocked_note: ['Tes moyens de paiement sont bloqués. Contacte le support.', 'Your payment methods are blocked. Contact support.', 'Tus medios de pago están bloqueados. Contacta con el soporte.', 'I tuoi metodi di pagamento sono bloccati. Contatta il supporto.', 'Os teus meios de pagamento estão bloqueados. Contacta o suporte.', 'Deine Zahlungsmethoden sind gesperrt. Kontaktiere den Support.', 'Njia zako za malipo zimezuiwa. Wasiliana na msaada.', 'Bisika na yo ya kofuta ekangami. Benga lisalisi.'],
    pay_btn: ['Payer le vendeur', 'Pay the seller', 'Pagar al vendedor', 'Paga il venditore', 'Pagar ao vendedor', 'Verkäufer bezahlen', 'Mlipe muuzaji', 'Futa motekisi'],
    pay_warn: ['Paiement direct au vendeur, hors Coeurnoh Universe. L’application ne le confirme pas et ne peut pas le rembourser. Ne paie que si tu fais confiance au vendeur et garde ta preuve de paiement.', 'Direct payment to the seller, outside Coeurnoh Universe. The app does not confirm it and cannot refund it. Only pay if you trust the seller, and keep your proof of payment.', 'Pago directo al vendedor, fuera de Coeurnoh Universe. La aplicación no lo confirma ni puede reembolsarlo. Paga solo si confías en el vendedor y guarda tu comprobante.', 'Pagamento diretto al venditore, fuori da Coeurnoh Universe. L’app non lo conferma e non può rimborsarlo. Paga solo se ti fidi del venditore e conserva la prova di pagamento.', 'Pagamento direto ao vendedor, fora da Coeurnoh Universe. A aplicação não o confirma nem pode reembolsá-lo. Paga só se confiares no vendedor e guarda o comprovativo.', 'Direkte Zahlung an den Verkäufer, außerhalb von Coeurnoh Universe. Die App bestätigt sie nicht und kann sie nicht erstatten. Zahle nur, wenn du dem Verkäufer vertraust, und bewahre den Beleg auf.', 'Malipo ya moja kwa moja kwa muuzaji, nje ya Coeurnoh Universe. Programu haithibitishi wala haiwezi kurudisha pesa. Lipa tu ukimwamini muuzaji na uhifadhi uthibitisho wako.', 'Kofuta na motekisi mbala moko, libanda ya Coeurnoh Universe. Application ekondimisaka yango te mpe ekoki kozongisa mbongo te. Futá kaka soki ondimi motekisi mpe bombá preuve na yo.'],
    pay_with: ['Payer avec {label}', 'Pay with {label}', 'Pagar con {label}', 'Paga con {label}', 'Pagar com {label}', 'Mit {label} bezahlen', 'Lipa kwa {label}', 'Futa na {label}'],
    pay_qr_cap: ['Scanne ce QR avec l’application de paiement du vendeur.', 'Scan this QR with the seller’s payment app.', 'Escanea este QR con la aplicación de pago del vendedor.', 'Scansiona questo QR con l’app di pagamento del venditore.', 'Lê este QR com a aplicação de pagamento do vendedor.', 'Scanne diesen QR mit der Zahlungs-App des Verkäufers.', 'Chanua QR hii kwa programu ya malipo ya muuzaji.', 'Scanner QR oyo na application ya kofuta ya motekisi.'],
    leave_title: ['Tu quittes l’application', 'You are leaving the app', 'Sales de la aplicación', 'Stai uscendo dall’app', 'Vais sair da aplicação', 'Du verlässt die App', 'Unatoka kwenye programu', 'Ozali kobima na application'],
    leave_body: ['Tu vas ouvrir : {host}. Vérifie que c’est bien la passerelle de paiement du vendeur.', 'You are about to open: {host}. Check that it is really the seller’s payment gateway.', 'Vas a abrir: {host}. Comprueba que es la pasarela de pago del vendedor.', 'Stai per aprire: {host}. Verifica che sia davvero il gateway di pagamento del venditore.', 'Vais abrir: {host}. Confirma que é mesmo a plataforma de pagamento do vendedor.', 'Du öffnest: {host}. Prüfe, ob es wirklich der Zahlungsanbieter des Verkäufers ist.', 'Utafungua: {host}. Hakikisha ni njia ya malipo ya muuzaji kweli.', 'Ozali kofungola: {host}. Tala soki ezali solo bisika ya kofuta ya motekisi.'],
    go_on: ['Continuer', 'Continue', 'Continuar', 'Continua', 'Continuar', 'Weiter', 'Endelea', 'Kobanda'],
    cancel: ['Annuler', 'Cancel', 'Cancelar', 'Annulla', 'Cancelar', 'Abbrechen', 'Ghairi', 'Kotika'],
    report_link: ['Signaler ce vendeur', 'Report this seller', 'Denunciar a este vendedor', 'Segnala questo venditore', 'Denunciar este vendedor', 'Diesen Verkäufer melden', 'Ripoti muuzaji huyu', 'Yebisa likambo ya motekisi oyo'],
    contact_title: ['Contacter le vendeur', 'Contact the seller', 'Contactar al vendedor', 'Contatta il venditore', 'Contactar o vendedor', 'Verkäufer kontaktieren', 'Wasiliana na muuzaji', 'Kosolola na motekisi'],
    ch_call: ['Appeler', 'Call', 'Llamar', 'Chiama', 'Ligar', 'Anrufen', 'Piga simu', 'Benga'],
    ch_web: ['Site web', 'Website', 'Sitio web', 'Sito web', 'Site', 'Webseite', 'Tovuti', 'Site ya internet'],
    wa_hello: ['Bonjour, je vous contacte depuis votre boutique Coeurnoh Universe.', 'Hello, I am contacting you from your Coeurnoh Universe shop.', 'Hola, te contacto desde tu tienda de Coeurnoh Universe.', 'Ciao, ti contatto dal tuo negozio su Coeurnoh Universe.', 'Olá, contacto-te a partir da tua loja na Coeurnoh Universe.', 'Hallo, ich schreibe dir über deinen Shop auf Coeurnoh Universe.', 'Habari, ninakuandikia kutoka duka lako kwenye Coeurnoh Universe.', 'Mbote, nazali kokomela yo uta na ndako na yo na Coeurnoh Universe.'],
    hub_publish: ['Publier un article', 'Publish an item', 'Publicar un artículo', 'Pubblica un articolo', 'Publicar um artigo', 'Artikel veröffentlichen', 'Chapisha bidhaa', 'Pesa eloko'],
    hint_setup: ['Ajouter WhatsApp et paiement', 'Add WhatsApp and payment', 'Añadir WhatsApp y pago', 'Aggiungi WhatsApp e pagamento', 'Adicionar WhatsApp e pagamento', 'WhatsApp und Zahlung hinzufügen', 'Ongeza WhatsApp na malipo', 'Bakisa WhatsApp mpe kofuta'],
    qr_zoom: ['Agrandir', 'Enlarge', 'Ampliar', 'Ingrandisci', 'Ampliar', 'Vergrößern', 'Kuza', 'Monisa monene'],
    uploading: ['Envoi de l’image…', 'Uploading image…', 'Subiendo imagen…', 'Caricamento immagine…', 'A enviar imagem…', 'Bild wird gesendet…', 'Inatuma picha…', 'Ezali kotinda elilingi…'],
    del: ['Supprimer', 'Delete', 'Eliminar', 'Elimina', 'Eliminar', 'Löschen', 'Futa', 'Longola']
  };

  /* ---------- Calculs purs (testés) ---------- */
  var DAY = 86400000;
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function eff(item, now) {
    var p = num(item.price), d = num(item.discountPercent);
    if (d > 0 && d < 100) {
      var end = item.promoExpiresAt ? new Date(item.promoExpiresAt).getTime() : NaN;
      if (!item.promoExpiresAt || (isFinite(end) && end > (now || Date.now()))) return Math.round(p * (1 - d / 100) * 100) / 100;
    }
    return p;
  }
  function onSale(item, now) { return eff(item, now) < num(item.price); }
  function discountOf(item, now) { return onSale(item, now) ? Math.round(num(item.discountPercent)) : 0; }
  function isNew(item, now) {
    var t = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
    var n = now || Date.now();
    return isFinite(t) && n - t < 7 * DAY && n - t > -3600000;
  }
  function norm(s) {
    var x = String(s == null ? '' : s).toLowerCase();
    try { x = x.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ancien navigateur : on garde les accents */ }
    return x;
  }
  var CAT_LABEL = { ebooks: 'shop_cat_ebooks', beaute: 'shop_cat_beaute', mode: 'shop_cat_mode', electronique: 'shop_cat_electronique', maison: 'shop_cat_maison', autres: 'shop_cat_autres' };
  function matchesQuery(item, terms) {
    if (!terms.length) return true;
    var hay = norm([item.title, item.description, item.sellerName, item.category].join(' '));
    for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
    return true;
  }
  function select(items, st, ctx) {
    ctx = ctx || {}; var now = ctx.now || Date.now(), liked = ctx.liked || {};
    var terms = norm(st.q).split(/\s+/).filter(Boolean);
    var min = st.min === '' || st.min == null ? null : num(st.min), max = st.max === '' || st.max == null ? null : num(st.max);
    var out = items.filter(function (it) {
      if (st.type && st.type !== 'all' && it.type !== st.type) return false;
      if (st.cat && st.cat !== 'all' && it.category !== st.cat) return false;
      if (st.seller && it.sellerUid !== st.seller) return false;
      if (st.promo && !onSale(it, now)) return false;
      if (st.verified && !it.sellerVerified) return false;
      if (st.fav && !liked[it.id]) return false;
      if (min != null || max != null) { var p = eff(it, now); if (min != null && p < min) return false; if (max != null && p > max) return false; }
      return matchesQuery(it, terms);
    });
    var byDate = function (a, b) { return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0); };
    var by = {
      recent: byDate,
      popular: function (a, b) { return (num(b.likesCount) - num(a.likesCount)) || byDate(a, b); },
      low: function (a, b) { return (eff(a, now) - eff(b, now)) || byDate(a, b); },
      high: function (a, b) { return (eff(b, now) - eff(a, now)) || byDate(a, b); },
      deal: function (a, b) { return (discountOf(b, now) - discountOf(a, now)) || byDate(a, b); }
    };
    return out.sort(by[st.sort] || by.recent);
  }
  function activeCount(st) {
    var n = 0;
    if (st.type && st.type !== 'all') n++;
    if (st.promo) n++; if (st.verified) n++; if (st.fav) n++;
    if (st.min !== '' && st.min != null) n++;
    if (st.max !== '' && st.max != null) n++;
    return n;
  }
  function sellerStats(items) {
    var all = {}, ver = {};
    items.forEach(function (i) { if (!i.sellerUid) return; all[i.sellerUid] = 1; if (i.sellerVerified) ver[i.sellerUid] = 1; });
    return { items: items.length, sellers: Object.keys(all).length, verified: Object.keys(ver).length };
  }
  function verifiedSellers(items, limit) {
    var m = {};
    items.forEach(function (i) {
      if (!i.sellerUid || !i.sellerVerified) return;
      var s = m[i.sellerUid] || (m[i.sellerUid] = { uid: i.sellerUid, name: i.sellerName || '', photo: i.sellerPhotoURL || '', n: 0 });
      s.n++;
    });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, limit || 12);
  }
  function fmtLeft(ms, dayUnit) {
    if (!(ms > 0)) return '';
    var m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 1) return d + (dayUnit || 'd') + ' ' + (h - d * 24) + 'h';
    if (h >= 1) return h + 'h ' + (m - h * 60) + 'm';
    return Math.max(1, m) + 'm';
  }
  function fmtPrice(n) { return (Math.round(num(n) * 100) / 100).toFixed(2) + '$'; }
  function cartHint(count) { return count >= 4 ? { ok: true, n: 0 } : (count > 0 ? { ok: false, n: 4 - count } : null); }

  var API = { eff: eff, onSale: onSale, discountOf: discountOf, isNew: isNew, select: select, activeCount: activeCount, sellerStats: sellerStats, verifiedSellers: verifiedSellers, fmtLeft: fmtLeft, fmtPrice: fmtPrice, cartHint: cartHint, norm: norm, DICT: D, LANGS: LG };
  window.CNShopLogic = API;

  /* ---------- Utilitaires d'accès à l'application ---------- */
  function lang() { var l = 'fr'; try { if (typeof currentLang !== 'undefined' && currentLang) l = currentLang; } catch (e) { /* ignore */ } var i = LG.indexOf(l); return i < 0 ? 1 : i; }
  function T(k, vars) {
    var a = D[k]; if (!a) return k;
    var s = a[lang()] || a[1] || a[0];
    if (vars) Object.keys(vars).forEach(function (x) { s = s.split('{' + x + '}').join(String(vars[x])); });
    return s;
  }
  function TN(k, n) { return T(n === 1 && D[k + '_1'] ? k + '_1' : k, { n: n }); }
  function tt(k) { try { return typeof t === 'function' ? t(k) : k; } catch (e) { return k; } }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function feed() { try { return shopFeedItems || []; } catch (e) { return []; } }
  function likedMap() { try { return shopLikedMap || {}; } catch (e) { return {}; } }
  function bought() { try { return shopPurchasedSet || new Set(); } catch (e) { return new Set(); } }
  function cart() { try { return cartItems || []; } catch (e) { return []; } }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }
  function call(fn) { try { if (typeof window[fn] === 'function') return window[fn].apply(null, [].slice.call(arguments, 1)); } catch (e) { /* ignore */ } }
  function toast(m, k) { try { showToast(m, k || 'info'); } catch (e) { /* ignore */ } }
  function viewEl() { return document.getElementById('view-shop'); }

  /* ---------- Icônes (SVG en ligne, traits) ---------- */
  var IC = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v0M17 20h4M20 17v0"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16"/>',
    store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    badge: '<path d="M12 2.5l2.4 1.7 2.9-.1 1 2.7 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-1 2.7-2.9-.1L12 21.5l-2.4-1.7-2.9.1-1-2.7-2.4-1.7.9-2.8-.9-2.8 2.4-1.7 1-2.7 2.9.1z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    beaute: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/>',
    mode: '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2z"/>',
    electronique: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    maison: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    autres: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    truck: '<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.2L3 9M4 13a8 8 0 0 0 14.5 4.2L21 15M3 4v5h5M21 20v-5h-5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    whatsapp: '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 9.2c0 3 2.6 5.6 5.6 5.6l1.2-1.4-2-1-1 .8a4 4 0 0 1-1.9-1.9l.8-1-1-2z"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5c0-.3.2-.5.5-.5z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.5 2.2 4 5 4.2"/>',
    telegram: '<path d="M21 4 3 11l6 2 2 6 3-4 5 3z"/><path d="m9 13 7-5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
    upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>'
  };
  function svg(n, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }

  /* ---------- Style (sobre : palette de l'application, bleu nuit + bleu d'action + ardoise ; clair et sombre) ---------- */
  var CSS =
    '.sx,.sx-ov{--sx-g:#1d4f91;--sx-gl:#1d4f91;--sx-gd:#14263f;--sx-gt:#eef1f6;--sx-a:#f39c1f;--sx-ad:#14263f;--sx-ink:#141a26;--sx-mut:#5b6577;--sx-line:#e2e6ee;--sx-card:#fff;--sx-bg:#f4f6fa;--sx-red:#b42318;--sx-promo:#b42318;--sx-sel:#14263f;--sx-slate:#28374f;--sx-ring:#1d4f91}' +
    'html[data-theme="dark"] .sx,html[data-theme="dark"] .sx-ov{--sx-g:#2b62a8;--sx-gl:#8db6ec;--sx-gd:#0e1a2c;--sx-gt:#232d3d;--sx-ink:#e9edf4;--sx-mut:#9aa6b8;--sx-line:#2a3444;--sx-card:#171e2a;--sx-bg:#0f141d;--sx-red:#ff8a80;--sx-promo:#c4352a;--sx-sel:#3a4a63;--sx-slate:#c3cddd;--sx-ring:#8db6ec}' +
    '#view-shop.sx-on .wrap>:not(#sx-root){display:none!important}' +
    '.sx{color:var(--sx-ink);padding-bottom:150px}.sx *,.sx-ov *{box-sizing:border-box}:where(.sx,.sx-ov) button{font:inherit;color:inherit;cursor:pointer}' +
    '.sx-back{display:inline-flex;align-items:center;gap:6px;border:0;background:none;color:var(--sx-gl);font-weight:700;padding:6px 2px;margin-bottom:8px}' +
    '.sx-hero{padding:2px 0 0}.sx-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}.sx-hero h2{margin:0;font-size:1.35rem;line-height:1.2;font-weight:800;color:var(--sx-ink)}.sx-hero p{margin:0 0 12px;font-size:.86rem;line-height:1.4;color:var(--sx-mut)}.sx-compact .sx-hero p,.sx-compact .sx-stats{display:none}.sx-compact .sx-top{margin-bottom:10px}' +
    '.sx-search{position:relative;display:flex;align-items:center;background:var(--sx-card);border:1.5px solid var(--sx-line);border-radius:12px;color:var(--sx-ink)}.sx-search>svg{position:absolute;left:13px;color:var(--sx-mut)}.sx-search input{flex:1;min-width:0;border:0;background:none;outline:0;padding:12px 40px 12px 40px;font-size:.95rem;color:var(--sx-ink);border-radius:12px}.sx-search input::placeholder{color:var(--sx-mut)}' +
    '.sx-search:focus-within{border-color:var(--sx-ring);box-shadow:0 0 0 3px rgba(29,79,145,.18)}.sx-search button{position:absolute;right:6px;width:32px;height:32px;border:0;background:none;color:var(--sx-mut);border-radius:50%;display:flex;align-items:center;justify-content:center}' +
    '.sx-hero-acts{display:flex;gap:8px;flex-wrap:nowrap;flex:0 0 auto}' +
    '.sx-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:12px;padding:10px 14px;font-weight:800;font-size:.86rem;line-height:1.1;text-decoration:none;min-height:42px}' +
    '.sx-btn:focus-visible,.sx-tab:focus-visible,.sx-chip:focus-visible,.sx-heart:focus-visible,.sx-ib:focus-visible{outline:3px solid var(--sx-ring);outline-offset:2px}' +
    '.sx-amber{background:var(--sx-a);color:var(--sx-ad)}.sx-ghost{background:transparent;color:var(--sx-ink);box-shadow:inset 0 0 0 1.5px var(--sx-line)}' +
    '.sx-green{background:var(--sx-g);color:#fff}.sx-out{background:transparent;color:var(--sx-gl);box-shadow:inset 0 0 0 1.5px var(--sx-gl)}' +
    '.sx-stats{display:flex;gap:4px 14px;flex-wrap:wrap;margin-top:10px;font-size:.78rem;font-weight:600;color:var(--sx-mut)}' +
    '.sx-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid var(--sx-line);margin:14px 0 2px}' +
    '.sx-tab{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;padding:9px 1px 8px;font-size:.7rem;font-weight:700;color:var(--sx-mut);min-width:0}.sx-tab span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.sx-tab.on{color:var(--sx-ink);border-bottom-color:var(--sx-ink)}.sx-tab i{position:absolute;top:2px;right:calc(50% - 24px);min-width:17px;height:17px;border-radius:9px;background:var(--sx-sel);color:#fff;font-style:normal;font-size:.62rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px}' +
    '.sx-cats{display:flex;gap:8px;overflow-x:auto;padding:12px 2px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.sx-cats::-webkit-scrollbar{display:none}' +
    '.sx-chip{flex:0 0 auto;display:flex;align-items:center;gap:7px;padding:8px 13px;border:1px solid var(--sx-line);border-radius:999px;background:var(--sx-card);font-size:.78rem;font-weight:700;color:var(--sx-ink);white-space:nowrap;line-height:1.2}' +
    '.sx-chip b{display:flex;color:var(--sx-slate)}.sx-chip.on{background:var(--sx-sel);border-color:var(--sx-sel);color:#fff}.sx-chip.on b{color:#fff}' +
    '.sx-sec{margin:20px 0 0}.sx-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 2px 10px}.sx-sh h3{margin:0;font-size:1.08rem;display:flex;align-items:center;gap:7px}.sx-sh h3 svg{color:var(--sx-gl)}.sx-sh small{display:block;font-size:.76rem;color:var(--sx-mut);margin-top:2px;font-weight:600}' +
    '.sx-sh button{border:0;background:none;color:var(--sx-gl);font-weight:800;font-size:.8rem;padding:6px 2px;white-space:nowrap}' +
    '.sx-flash .sx-sh h3 svg{color:#b07d00}html[data-theme="dark"] .sx-flash .sx-sh h3 svg{color:var(--sx-a)}' +
    '.sx-row{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x proximity;scrollbar-width:none;-webkit-overflow-scrolling:touch}.sx-row::-webkit-scrollbar{display:none}.sx-row>.sx-card{flex:0 0 150px;scroll-snap-align:start}' +
    '.sx-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(min-width:760px){.sx-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}.sx-grid>.sx-card{content-visibility:auto;contain-intrinsic-size:auto 330px}' +
    '.sx-card{position:relative;background:var(--sx-card);border:1px solid var(--sx-line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;min-width:0}' +
    '.sx-mw{position:relative}.sx-media{position:relative;aspect-ratio:4/5;background:var(--sx-gt);cursor:pointer;display:block;width:100%;border:0;padding:0;overflow:hidden}.sx-media img{width:100%;height:100%;object-fit:cover;display:block}.sx-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--sx-gl)}' +
    '.sx-badges{position:absolute;left:8px;top:8px;display:flex;flex-direction:column;gap:5px;align-items:flex-start;pointer-events:none}.sx-bd{font-size:.68rem;font-weight:800;line-height:1;padding:5px 8px;border-radius:8px}.sx-promo{background:var(--sx-a);color:var(--sx-ad)}.sx-new{background:var(--sx-g);color:#fff}' +
    '.sx-heart{position:absolute;right:8px;top:8px;display:flex;align-items:center;gap:4px;border:0;background:rgba(255,255,255,.95);color:#13261b;border-radius:16px;padding:6px 9px;font-size:.72rem;font-weight:800;min-height:32px}.sx-heart.liked{color:var(--sx-red)}.sx-heart svg{display:block}.sx-heart .reaction-emoji{font-size:15px;line-height:1}' +
    '.sx-body{display:flex;flex-direction:column;gap:5px;padding:10px 10px 12px;flex:1;min-width:0}.sx-kind{font-size:.66rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--sx-gl)}' +
    '.sx-title{margin:0;font-size:.9rem;line-height:1.28;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer;word-break:break-word}' +
    '.sx-seller{display:flex;align-items:center;gap:4px;border:0;background:none;padding:0;color:var(--sx-mut);font-size:.74rem;font-weight:600;text-align:left;min-width:0}.sx-seller span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sx-seller svg{flex:0 0 auto}' +
    '.sx-price{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:2px}.sx-price b{font-size:1.02rem;color:var(--sx-ink)}.sx-price s{font-size:.76rem;color:var(--sx-mut)}.sx-end{font-size:.7rem;font-weight:700;color:#8a5f00}html[data-theme="dark"] .sx-end{color:var(--sx-a)}' +
    '.sx-acts{display:flex;gap:6px;align-items:center;margin-top:6px}.sx-acts .sx-btn{flex:1;min-height:38px;padding:8px 10px;font-size:.8rem}.sx-ib{flex:0 0 auto;width:38px;height:38px;border:0;border-radius:12px;background:var(--sx-gt);color:var(--sx-gl);display:flex;align-items:center;justify-content:center;text-decoration:none}' +
    '.sx-row .sx-card .sx-acts .sx-ib,.sx-row .sx-card .sx-seller,.sx-row .sx-card .sx-kind{display:none}.sx-row .sx-card .sx-btn span{display:none}.sx-row .sx-card .sx-btn{min-height:36px}' +
    '.sx-cta{display:flex;flex-direction:column;gap:10px;background:var(--sx-a);color:var(--sx-ad);border-radius:20px;padding:16px;margin-top:16px}.sx-cta h3{margin:0;font-size:1.15rem;line-height:1.2}.sx-cta p{margin:0;font-size:.86rem;line-height:1.4}.sx-cta .sx-btn{background:var(--sx-gd);color:#fff;align-self:flex-start}' +
    '.sx-mine{background:var(--sx-card);border:1px solid var(--sx-line);color:var(--sx-ink)}.sx-mine .sx-btn.sx-green{background:var(--sx-g)}.sx-cta-row{display:flex;gap:8px;flex-wrap:wrap}' +
    '.sx-trust{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px}.sx-trust div{display:flex;align-items:center;gap:8px;background:var(--sx-card);border:1px solid var(--sx-line);border-radius:14px;padding:10px;font-size:.76rem;font-weight:700;line-height:1.2}.sx-trust svg{flex:0 0 auto;color:var(--sx-gl)}@media(min-width:760px){.sx-trust{grid-template-columns:repeat(4,1fr)}}' +
    '.sx-vs{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:none}.sx-vs::-webkit-scrollbar{display:none}.sx-v{flex:0 0 auto;width:78px;display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;font-size:.7rem;font-weight:700;text-align:center;line-height:1.2}.sx-v .post-avatar,.sx-v .post-avatar-img{box-shadow:0 0 0 3px var(--sx-card),0 0 0 5px var(--sx-a)}.sx-v em{font-style:normal;color:var(--sx-mut);font-weight:600}.sx-v span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.sx-tool{display:flex;align-items:center;gap:8px;margin:14px 0 10px;flex-wrap:wrap}.sx-count{flex:1;min-width:90px;font-weight:800;font-size:.9rem}' +
    '.sx-tool .sx-btn{min-height:40px;padding:8px 12px}.sx-sel{border:1.5px solid var(--sx-line);background:var(--sx-card);color:var(--sx-ink);border-radius:12px;padding:9px 10px;font:inherit;font-size:.82rem;font-weight:700;min-height:40px;max-width:46vw}.sx-sel:focus-visible{outline:3px solid var(--sx-a)}' +
    '.sx-fb{position:relative}.sx-fb i{font-style:normal;min-width:18px;height:18px;border-radius:9px;background:var(--sx-a);color:var(--sx-ad);font-size:.68rem;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}' +
    '.sx-pills{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.sx-pill{display:inline-flex;align-items:center;gap:6px;border:0;background:var(--sx-gt);color:var(--sx-gl);border-radius:999px;padding:6px 10px;font-size:.76rem;font-weight:800}' +
    '.sx-shophead{display:flex;align-items:center;gap:12px;background:var(--sx-card);border:1px solid var(--sx-line);border-radius:20px;padding:14px;margin-top:14px}.sx-sn{min-width:0;flex:1}.sx-shophead>.post-avatar,.sx-shophead>.post-avatar-img{flex:0 0 auto}.sx-shophead h3{margin:0;font-size:1.05rem;display:flex;align-items:center;gap:6px;word-break:break-word}.sx-shophead small{color:var(--sx-mut);font-weight:600;font-size:.78rem}.sx-shophead .sx-ib{flex:0 0 auto}' +
    '.sx-empty{text-align:center;padding:34px 16px;background:var(--sx-card);border:1px dashed var(--sx-line);border-radius:20px;margin-top:8px}.sx-empty b{display:block;font-size:1rem;margin:10px 0 4px}.sx-empty p{margin:0 0 14px;color:var(--sx-mut);font-size:.86rem}.sx-empty svg{color:var(--sx-gl)}' +
    '.sx-more{display:flex;justify-content:center;margin:16px 0 0}.sx-sk{border-radius:18px;background:var(--sx-gt);aspect-ratio:4/6.2;animation:sxp 1.3s ease-in-out infinite}@keyframes sxp{50%{opacity:.55}}@media(prefers-reduced-motion:reduce){.sx-sk{animation:none}}' +
    '.sx-cartbar{position:fixed;z-index:190;left:50%;transform:translateX(-50%);bottom:calc(72px + env(safe-area-inset-bottom,0px));width:min(560px,calc(100% - 24px));display:flex;align-items:center;gap:10px;background:var(--sx-gd);color:#fff;border-radius:18px;padding:10px 10px 10px 14px;box-shadow:0 8px 24px rgba(8,40,22,.35)}.sx-cartbar.hidden{display:none}' +
    '.sx-cartbar div{flex:1;min-width:0;line-height:1.25}.sx-cartbar b{display:block;font-size:.92rem}.sx-cartbar small{display:block;font-size:.72rem;color:rgba(255,255,255,.9)}.sx-cartbar .sx-btn{flex:0 0 auto}' +
    '.sx-ov{position:fixed;inset:0;z-index:400;background:rgba(10,24,16,.55);display:flex;align-items:flex-end;justify-content:center;overscroll-behavior:contain}' +
    '.sx-sheet{width:min(560px,100%);max-height:88vh;overflow:auto;background:var(--sx-card);color:var(--sx-ink);border-radius:24px 24px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px))}' +
    '.sx-sheet h3{margin:0 0 4px;font-size:1.1rem;display:flex;justify-content:space-between;align-items:center;gap:8px}.sx-sheet h4{margin:16px 0 8px;font-size:.84rem;color:var(--sx-mut);text-transform:uppercase;letter-spacing:.04em}' +
    '.sx-opts{display:flex;gap:8px;flex-wrap:wrap}.sx-opt{border:1.5px solid var(--sx-line);background:var(--sx-card);color:var(--sx-ink);border-radius:999px;padding:9px 14px;font-weight:700;font-size:.84rem}.sx-opt.on{background:var(--sx-g);border-color:var(--sx-gl);color:#fff}' +
    '.sx-prices{display:flex;gap:10px}.sx-prices input{flex:1;min-width:0;border:1.5px solid var(--sx-line);border-radius:12px;padding:11px;font:inherit;background:var(--sx-card);color:var(--sx-ink)}.sx-prices input:focus-visible{outline:3px solid var(--sx-a)}' +
    '.sx-tg{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--sx-line);font-weight:700;font-size:.9rem}.sx-tg input{width:24px;height:24px;accent-color:var(--sx-gl)}' +
    '.sx-sheet-acts{display:flex;gap:10px;margin-top:18px}.sx-sheet-acts .sx-btn{flex:1}' +
    '.sx-qrbox{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}.sx-qrbox .q{background:#fff;border-radius:18px;padding:12px;width:min(260px,70vw);border:2px solid var(--sx-g)}.sx-qrbox .q svg{display:block;width:100%;height:auto}.sx-qrbox p{margin:0;color:var(--sx-mut);font-size:.86rem}.sx-qrbox .u{font-size:.74rem;word-break:break-all;color:var(--sx-mut)}.sx-qrbox .sx-btn{width:100%}' +
    '.sx-lb{display:flex;align-items:center;gap:12px;width:100%;border:1px solid var(--sx-line);background:var(--sx-card);color:var(--sx-ink);border-radius:16px;padding:12px 14px;margin-top:10px;font-weight:800;font-size:.92rem;text-align:left}.sx-lb b{flex:0 0 auto;width:42px;height:42px;border-radius:13px;background:var(--sx-gt);color:var(--sx-gl);display:flex;align-items:center;justify-content:center}.sx-lb small{display:block;font-weight:600;color:var(--sx-mut);font-size:.76rem;margin-top:2px}.sx-lb:focus-visible{outline:3px solid var(--sx-a)}' +
    '.sx-chs{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.sx-ch{width:40px;height:40px;border-radius:12px;background:var(--sx-gt);color:var(--sx-gl);display:flex;align-items:center;justify-content:center;text-decoration:none}.sx-ch:focus-visible{outline:3px solid var(--sx-a);outline-offset:2px}' +
    '.sx-shophead{flex-wrap:wrap}.sx-shophead .sx-sp{flex:1 0 100%}.sx-shophead .sx-btn{margin-top:10px;width:100%}' +
    '.sx-note{display:flex;gap:10px;align-items:flex-start;background:#fff4cc;color:#3a2a00;border-radius:14px;padding:12px;font-size:.8rem;line-height:1.4;font-weight:600;margin:10px 0}.sx-note svg{flex:0 0 auto;margin-top:1px}html[data-theme="dark"] .sx-note{background:#3a2f0a;color:#ffe9a6}' +
    '.sx-fld{display:block;margin-top:12px}.sx-fld span{display:block;font-size:.78rem;font-weight:700;color:var(--sx-mut);margin-bottom:5px}.sx-fld input,.sx-fld textarea{width:100%;border:1.5px solid var(--sx-line);border-radius:12px;padding:11px;font:inherit;font-size:.9rem;background:var(--sx-card);color:var(--sx-ink)}.sx-fld input:focus-visible,.sx-fld textarea:focus-visible{outline:3px solid var(--sx-a);outline-offset:0}' +
    '.sx-pr{display:grid;grid-template-columns:1fr;gap:6px;margin-top:10px;padding:10px;border:1px dashed var(--sx-line);border-radius:14px}.sx-pr input{width:100%;border:1.5px solid var(--sx-line);border-radius:12px;padding:10px;font:inherit;font-size:.88rem;background:var(--sx-card);color:var(--sx-ink)}.sx-pr button{justify-self:end;border:0;background:none;color:var(--sx-red);font-weight:800;font-size:.78rem;padding:4px}' +
    '.sx-err{color:var(--sx-red);font-weight:700;font-size:.82rem;margin-top:10px}.sx-qrp{display:flex;align-items:center;gap:12px;margin-top:8px}.sx-qrp img{width:84px;height:84px;object-fit:contain;border-radius:12px;border:1px solid var(--sx-line);background:#fff}' +
    '.sx-sub{margin:6px 0 0;color:var(--sx-mut);font-size:.84rem;line-height:1.4}a.sx-lb{text-decoration:none}.sx-qrimg{border:0;background:#fff;border-radius:16px;padding:10px;width:min(240px,70vw);border:2px solid var(--sx-g)}.sx-qrimg img{display:block;width:100%;height:auto}' +
    '.sx-acts{flex-wrap:wrap;gap:8px}.sx-acts .sx-btn{flex:1 0 100%}.sx-acts .sx-ib{flex:0 0 auto;width:40px;height:36px}' +
    '.sx h2,.sx h3,.sx-ov h3{font-family:inherit;letter-spacing:0}' +
    '.sx-ib,.sx-ch,.sx-lb b,.sx-pill,.sx-empty svg,.sx-sh h3 svg,.sx-trust svg{color:var(--sx-slate)}.sx-ib,.sx-ch,.sx-lb b,.sx-pill{background:var(--sx-gt)}.sx-flash .sx-sh h3 svg{color:var(--sx-red)}' +
    '.sx-card{border-radius:14px}.sx-media{aspect-ratio:1/1}.sx-promo{background:var(--sx-promo);color:#fff}.sx-new{background:var(--sx-slate);color:var(--sx-card)}' +
    '.sx-kind{color:var(--sx-mut);letter-spacing:.06em}.sx-end{color:var(--sx-red)}.sx-title{font-weight:600}' +
    '.sx-out{color:var(--sx-slate);box-shadow:inset 0 0 0 1.5px var(--sx-slate)}.sx-sm{min-height:38px;padding:8px 12px;font-size:.8rem}' +
    '.sx-cta{background:var(--sx-card);border:1px solid var(--sx-line);color:var(--sx-ink);border-radius:14px}.sx-cta h3{font-size:1.02rem}.sx-cta .sx-btn{background:var(--sx-g);color:#fff}.sx-cta .sx-btn.sx-out{background:transparent;color:var(--sx-slate)}' +
    '.sx-trust{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:16px}.sx-trust div{background:none;border:0;padding:0;font-size:.74rem;font-weight:600;color:var(--sx-mut)}.sx-trust svg{width:16px;height:16px}' +
    '.sx-v .post-avatar,.sx-v .post-avatar-img{box-shadow:0 0 0 2px var(--sx-line)}.sx-shophead,.sx-empty{border-radius:14px}' +
    '.sx-cartbar{border-radius:14px;box-shadow:0 8px 24px rgba(10,20,40,.3)}.sx-cartbar .sx-btn{background:#fff;color:#14263f}' +
    '.sx-ov{background:rgba(12,20,34,.55)}.sx-sheet{border-radius:18px 18px 0 0}.sx-opt.on{background:var(--sx-sel);border-color:var(--sx-sel);color:#fff}' +
    '.sx-qrbox .q,.sx-qrimg{border:1px solid var(--sx-line)}.sx-fb i{background:var(--sx-sel);color:#fff}.sx-tg input{accent-color:var(--sx-g)}' +
    '.sx-sk{border-radius:14px;aspect-ratio:1/1.5}.sx-grid>.sx-card{contain-intrinsic-size:auto 290px}' +
    '.sx-zoom{position:fixed;inset:0;z-index:420;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:18px}.sx-zoom img{max-width:100%;max-height:100%;background:#fff;border-radius:16px;padding:10px}';

  /* ---------- État ---------- */
  var S = { page: 'home', q: '', type: 'all', cat: 'all', sort: 'recent', promo: false, verified: false, fav: false, min: '', max: '', seller: '', shown: 20, state: 'idle', err: null };
  var mounted = false, tick = null, qTimer = null, RECENT_KEY = 'cn_shop_recent';
  var PAGE = 20;

  /* ---------- Boutique du vendeur : contacts et paiement (enregistrés côté serveur, jamais dans le téléphone) ---------- */
  var PROF = {}, PROF_AT = {}, PROF_TTL = 300000, profTimer = null;
  var CH = [['whatsapp', 'whatsapp'], ['call', 'phone'], ['email', 'mail'], ['facebook', 'facebook'], ['instagram', 'instagram'], ['tiktok', 'tiktok'], ['telegram', 'telegram'], ['website', 'globe']];
  function prof(uid) { return (uid && PROF[uid]) || null; }
  function dg(v, min) { var d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length >= (min || 6) && d.length <= 15 ? d : ''; }
  function chLabel(k) { return { whatsapp: 'WhatsApp', call: T('ch_call'), email: T('f_email'), facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', telegram: 'Telegram', website: T('ch_web') }[k] || k; }
  function chHref(k, v) {
    v = String(v || ''); if (!v) return '';
    if (k === 'whatsapp') { v = dg(v, 8); return v ? 'https://wa.me/' + v + '?text=' + encodeURIComponent(T('wa_hello')) : ''; }
    if (k === 'call') { v = dg(v, 6); return v ? 'tel:+' + v : ''; }
    if (k === 'email') return /^[^\s@<>"'?&=%#]+@[^\s@<>"'?&=%#]+\.[A-Za-z]{2,}$/.test(v) ? 'mailto:' + v : '';
    return /^https:\/\/[^\s"'<>]+$/.test(v) ? v : '';
  }
  function httpsOnly(u) { return /^https:\/\/[^\s"'<>]+$/.test(String(u || '')) ? String(u) : ''; }
  function qrOk(u) { return /^https:\/\/res\.cloudinary\.com\/[^\s"'<>]+\/image\/upload\/[^\s"'<>]+$/.test(String(u || '')) ? String(u) : ''; }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function apiCall(action, body) {
    var a = null; try { a = auth; } catch (e) { a = null; }
    if (!a || !a.currentUser) return Promise.reject(new Error('login'));
    return a.currentUser.getIdToken().then(function (idToken) {
      return fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body || {})) });
    }).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (d) {
      if (!d || !d.success) throw new Error((d && d.error) || 'error');
      return d;
    });
  }
  // Demande en UNE requête les boutiques des vendeurs affichés (réponse gardée 5 minutes). Retourne true si une boutique a des infos.
  function wantProfiles(uids, force) {
    if (!me()) return Promise.resolve(false);
    var now = Date.now(), need = [];
    uids.forEach(function (u) { if (u && /^[A-Za-z0-9_-]{6,128}$/.test(u) && need.indexOf(u) < 0 && (force || !PROF_AT[u] || now - PROF_AT[u] > PROF_TTL)) need.push(u); });
    need = need.slice(0, 40);
    if (!need.length) return Promise.resolve(false);
    need.forEach(function (u) { PROF_AT[u] = now; });
    return apiCall('shop_profile_get', { uids: need }).then(function (d) {
      var pr = d.profiles || {}, any = false;
      need.forEach(function (u) { PROF[u] = pr[u] || {}; if (pr[u]) any = true; });
      return any;
    }, function () { need.forEach(function (u) { PROF_AT[u] = now - PROF_TTL + 60000; }); return false; });
  }
  function scanProfiles() {
    if (!active() || !me()) return;
    var uids = []; if (S.seller) uids.push(S.seller);
    [].forEach.call(document.querySelectorAll('#sx-body .sx-seller[data-uid]'), function (n) { uids.push(n.getAttribute('data-uid')); });
    wantProfiles(uids).then(function (changed) { if (changed && active()) renderBody(); });
  }

  function ensureStyle() {
    if (document.getElementById('sx-style')) return;
    var st = document.createElement('style'); st.id = 'sx-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  function recentIds() { try { var a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }).slice(0, 12) : []; } catch (e) { return []; } }
  function pushRecent(id) { try { var a = recentIds().filter(function (x) { return x !== id; }); a.unshift(id); localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 12))); } catch (e) { /* stockage bloqué : sans importance */ } }

  function filtersState() { return { q: S.q, type: S.type, cat: S.cat, sort: S.sort, promo: S.promo, verified: S.verified, fav: S.fav, min: S.min, max: S.max, seller: S.seller }; }
  function results() { return select(feed(), filtersState(), { liked: likedMap(), now: Date.now() }); }
  function isCatalog() { return !!(S.q || S.seller || S.page === 'catalog' || activeCount(S) || S.cat !== 'all'); }

  /* ---------- Cartes ---------- */
  function imgSrc(u) { try { return esc(typeof normalizeMediaUrl === 'function' ? normalizeMediaUrl(u) : u); } catch (e) { return ''; } }
  function cardHtml(it, o) {
    o = o || {}; var now = Date.now(), id = esc(it.id), e = eff(it, now), sale = e < num(it.price), disc = discountOf(it, now);
    var lk = likedMap()[it.id], own = bought().has(it.id) && it.type === 'book', mine = me() && me().uid === it.sellerUid;
    var priceHtml = (e <= 0 ? '<b>' + esc(T('free')) + '</b>' : '<b>' + esc(fmtPrice(e)) + '</b>') + (sale ? '<s>' + esc(fmtPrice(it.price)) + '</s>' : '');
    var endHtml = '';
    if (sale && it.promoExpiresAt) { var left = new Date(it.promoExpiresAt).getTime() - now; if (left > 0) endHtml = '<div class="sx-end" data-end="' + esc(it.promoExpiresAt) + '">' + esc(left < 3600000 * 6 ? T('ends_soon') : T('ends_in', { t: fmtLeft(left, lang() === 0 ? 'j' : 'd') })) + '</div>'; }
    var badges = (sale ? '<span class="sx-bd sx-promo">-' + disc + '%</span>' : '') + (isNew(it, now) ? '<span class="sx-bd sx-new">' + esc(T('b_new')) + '</span>' : '');
    var heartIcon = (typeof reactionIconHtml === 'function') ? reactionIconHtml(lk) : svg('chat', 15);
    var cnt = Math.max(0, Math.floor(num(it.likesCount))), cntTxt = (typeof formatCompactCount === 'function') ? formatCompactCount(cnt) : String(cnt);
    var media = it.imageUrl
      ? '<img src="' + imgSrc(it.imageUrl) + '" alt="' + esc(it.title) + '" loading="lazy" decoding="async" onerror="mediaLoadError(this)">'
      : '<span class="sx-ph">' + svg(it.type === 'book' ? 'book' : 'store', 34) + '</span>';
    var main;
    if (own && it.fileUrl && typeof safeHref === 'function') main = '<a class="sx-btn sx-green" href="' + safeHref(it.fileUrl) + '" target="_blank" rel="noopener">' + svg('download', 16) + '<span>' + esc(T('download')) + '</span></a>';
    else if (it.type === 'book') main = '<button type="button" class="sx-btn sx-green" data-a="buy" data-id="' + id + '">' + svg('book', 16) + '<span>' + esc(tt('shop_buy')) + '</span></button>';
    else {
      var inCart = cart().some(function (c) { return c.id === it.id; });
      main = '<button type="button" class="sx-btn ' + (inCart ? 'sx-out' : 'sx-green') + '" data-a="cart" data-id="' + id + '" data-cartbtn="' + id + '" aria-pressed="' + inCart + '">' + svg(inCart ? 'check' : 'cart', 16) + '<span>' + esc(inCart ? T('in_cart') : T('add')) + '</span></button>';
    }
    var pf = prof(it.sellerUid), waNum = dg((pf && pf.whatsapp) || it.sellerPhone, 8);
    var wa = (it.type === 'product' && waNum)
      ? '<a class="sx-ib" href="https://wa.me/' + esc(waNum) + '?text=' + encodeURIComponent(it.title || '') + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">' + svg('whatsapp', 18) + '</a>' : '';
    var pay = (it.type === 'product' && !mine && pf && (pf.pay || pf.payQr))
      ? '<button type="button" class="sx-ib" data-a="pay" data-uid="' + esc(it.sellerUid || '') + '" data-id="' + id + '" aria-label="' + esc(T('pay_btn')) + '">' + svg('wallet', 18) + '</button>' : '';
    var del = mine ? '<button type="button" class="sx-ib" data-a="del" data-id="' + id + '" aria-label="' + esc(T('del')) + '">' + svg('trash', 17) + '</button>' : '';
    var verifiedIc = it.sellerVerified && typeof ICON_VERIFIED_BADGE !== 'undefined' ? ICON_VERIFIED_BADGE : '';
    var sellerLine = it.sellerName ? '<button type="button" class="sx-seller" data-a="seller" data-uid="' + esc(it.sellerUid || '') + '"><span>' + esc(T('by', { name: it.sellerName })) + '</span>' + verifiedIc + '</button>' : '';
    return '<article class="sx-card" data-card="' + id + '">' +
      '<div class="sx-mw"><div class="sx-media" role="button" tabindex="0" data-a="open" data-id="' + id + '" aria-label="' + esc(it.title) + '">' + media + '</div>' +
      '<div class="sx-badges">' + badges + '</div>' +
      '<button type="button" class="sx-heart' + (lk ? ' liked' : '') + '" data-a="like" data-id="' + id + '" data-like-btn="' + id + '" aria-label="' + esc(T('like')) + '"><span data-like-icon="' + id + '">' + heartIcon + '</span><span data-like-count="' + id + '" data-raw="' + cnt + '">' + esc(cntTxt) + '</span></button></div>' +
      '<div class="sx-body"><span class="sx-kind">' + esc(T(it.type === 'book' ? 'k_book' : 'k_product')) + (own ? ' · ' + esc(T('owned')) : '') + '</span>' +
      '<h3 class="sx-title" data-a="open" data-id="' + id + '">' + esc(it.title) + '</h3>' + sellerLine +
      '<div class="sx-price">' + priceHtml + '</div>' + endHtml +
      '<div class="sx-acts">' + main + wa + pay + '<button type="button" class="sx-ib" data-a="share" data-id="' + id + '" aria-label="' + esc(T('share')) + '">' + svg('share', 17) + '</button>' + del + '</div></div></article>';
  }
  function rowHtml(list) { return '<div class="sx-row">' + list.map(function (i) { return cardHtml(i, { row: 1 }); }).join('') + '</div>'; }
  function secHead(icon, title, sub, act) {
    return '<div class="sx-sh"><div><h3>' + (icon ? svg(icon, 19) : '') + esc(title) + '</h3>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (act ? '<button type="button" data-a="seeall" data-sec="' + act + '">' + esc(T('see_all')) + '</button>' : '') + '</div>';
  }
  function skeleton() { var h = ''; for (var i = 0; i < 6; i++) h += '<div class="sx-sk"></div>'; return '<div class="sx-grid" aria-busy="true">' + h + '</div>'; }

  /* ---------- Coquille (créée à chaque ouverture, dans la langue du moment) ---------- */
  var CATS = ['all', 'ebooks', 'beaute', 'mode', 'electronique', 'maison', 'autres'];
  function catLabel(c) { return c === 'all' ? tt('shop_cat_all') : tt(CAT_LABEL[c]); }
  function catsHtml() {
    return CATS.map(function (c) {
      var label = c === 'all' ? T('all_cat') : catLabel(c);
      return '<button type="button" class="sx-chip' + (S.cat === c ? ' on' : '') + '" data-a="cat" data-cat="' + c + '" aria-pressed="' + (S.cat === c) + '"><b>' + svg(c === 'all' ? 'grid' : (c === 'ebooks' ? 'book' : c), 18) + '</b><span>' + esc(label) + '</span></button>';
    }).join('');
  }
  function tabsHtml() {
    var n = cart().length;
    function tab(a, ic, label, on, badge) { return '<button type="button" class="sx-tab' + (on ? ' on' : '') + '" data-a="tab" data-tab="' + a + '" role="tab" aria-selected="' + !!on + '">' + svg(ic, 20) + '<span>' + esc(label) + '</span>' + (badge ? '<i>' + badge + '</i>' : '') + '</button>'; }
    var cat = isCatalog();
    return tab('home', 'store', T('tab_home'), !cat) + tab('catalog', 'grid', T('tab_catalog'), cat) + tab('lib', 'book', tt('library_title'), false) + tab('cart', 'cart', T('tab_cart'), false, n ? n : 0);
  }
  function shell() {
    return '<div class="sx" id="sx">' +
      '<button type="button" class="sx-back" data-a="back">' + svg('back', 18) + '<span>' + esc(tt('services_back').replace(/^←\s*/, '')) + '</span></button>' +
      '<section class="sx-hero"><div class="sx-top"><h2>' + esc(tt('shop_title')) + '</h2><div class="sx-hero-acts">' +
      '<button type="button" class="sx-btn sx-ghost sx-sm" data-a="hub">' + svg('store', 16) + esc(T('mine_title')) + '</button>' +
      '<button type="button" class="sx-btn sx-amber sx-sm" data-a="sell">' + svg('plus', 16) + esc(T('sell')) + '</button></div></div>' +
      '<p>' + esc(T('hero_sub')) + '</p>' +
      '<div class="sx-search">' + svg('search', 18) + '<input id="sx-q" type="search" enterkeyhint="search" autocomplete="off" maxlength="80" placeholder="' + esc(T('search_ph')) + '" aria-label="' + esc(T('search_ph')) + '" value="' + esc(S.q) + '">' +
      '<button type="button" id="sx-qx" data-a="clearq" aria-label="' + esc(T('clear_q')) + '"' + (S.q ? '' : ' hidden') + '>' + svg('x', 16) + '</button></div>' +
      '<div class="sx-stats" id="sx-stats"></div></section>' +
      '<nav class="sx-tabs" id="sx-tabs" role="tablist"></nav>' +
      '<div class="sx-cats" id="sx-cats"></div>' +
      '<div id="sx-body"></div>' +
      '<div class="sx-cartbar hidden" id="sx-cartbar"></div></div>';
  }

  /* ---------- Rendu ---------- */
  function statsHtml() {
    var st = sellerStats(feed()); if (!st.items) return '';
    return '<span>' + esc(TN('stat_items', st.items)) + '</span><span>' + esc(TN('stat_sellers', st.sellers)) + '</span>' + (st.verified ? '<span>' + esc(TN('stat_verified', st.verified)) + '</span>' : '');
  }
  function ctaHtml() {
    var u = me(), mine = u ? feed().filter(function (i) { return i.sellerUid === u.uid; }) : [];
    if (mine.length) {
      return '<section class="sx-cta sx-mine"><h3>' + esc(T('mine_title')) + '</h3><p>' + esc(T('mine_sub', { n: mine.length })) + '</p><div class="sx-cta-row"><button type="button" class="sx-btn sx-green" data-a="seller" data-uid="' + esc(u.uid) + '">' + svg('store', 16) + esc(T('see_mine')) + '</button><button type="button" class="sx-btn sx-out" data-a="hub">' + svg('wallet', 16) + esc(T('settings_title')) + '</button></div></section>';
    }
    return '<section class="sx-cta"><h3>' + esc(T('cta_title')) + '</h3><p>' + esc(T('cta_sub')) + '</p><button type="button" class="sx-btn" data-a="sell">' + svg('store', 16) + esc(T('cta_btn')) + '</button></section>';
  }
  function trustHtml() {
    function i(ic, k) { return '<div>' + svg(ic, 20) + '<span>' + esc(T(k)) + '</span></div>'; }
    return '<div class="sx-trust">' + i('shield', 'trust_pay') + i('badge', 'trust_ver') + i('download', 'trust_dl') + i('chat', 'trust_wa') + '</div>';
  }
  function contactsHtml(pf, fallbackPhone) {
    var h = '';
    CH.forEach(function (c) {
      var k = c[0], v = k === 'whatsapp' ? ((pf && pf.whatsapp) || fallbackPhone || '') : ((pf && pf[k]) || '');
      var href = chHref(k, v); if (!href) return;
      var ext = k !== 'call' && k !== 'email';
      h += '<a class="sx-ch" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + ' aria-label="' + esc(chLabel(k)) + '">' + svg(c[1], 20) + '</a>';
    });
    return h ? '<div class="sx-chs">' + h + '</div>' : '';
  }
  function sellerHeadHtml() {
    var uid = S.seller, items = feed().filter(function (i) { return i.sellerUid === uid; }), f = items[0], u = me(), own = u && u.uid === uid, pf = prof(uid) || {};
    var name = (f && f.sellerName) || (own && u.name) || '', photo = (f && f.sellerPhotoURL) || (own && u.photoURL) || '', ver = (f && f.sellerVerified);
    var av = typeof renderAvatarHtml === 'function' ? renderAvatarHtml(name || 'C', photo, 52) : '';
    var extra = contactsHtml(pf, f && f.sellerPhone);
    if (own) extra += '<button type="button" class="sx-btn sx-out" data-a="settings">' + svg('edit', 16) + esc(T('settings_title')) + '</button>';
    else if (pf.pay || pf.payQr) extra += '<button type="button" class="sx-btn sx-green" data-a="pay" data-uid="' + esc(uid) + '">' + svg('wallet', 16) + esc(T('pay_btn')) + '</button>';
    return '<section class="sx-shophead">' + av + '<div class="sx-sn"><h3>' + esc(T('seller_title', { name: name || '…' })) + (ver && typeof ICON_VERIFIED_BADGE !== 'undefined' ? ICON_VERIFIED_BADGE : '') + '</h3><small>' + esc(TN('stat_items', items.length)) + '</small></div>' +
      '<button type="button" class="sx-ib" data-a="shareseller" data-uid="' + esc(uid) + '" aria-label="' + esc(T('share')) + '">' + svg('share', 18) + '</button>' +
      (own ? '<button type="button" class="sx-ib" data-a="qr" aria-label="' + esc(T('my_qr')) + '">' + svg('qr', 18) + '</button>' : '') +
      (extra ? '<div class="sx-sp">' + extra + '</div>' : '') + '</section>' +
      '<div class="sx-pills"><button type="button" class="sx-pill" data-a="exitseller">' + svg('back', 14) + esc(T('all_shop')) + '</button></div>';
  }
  function emptyHtml() {
    var own = S.seller && me() && me().uid === S.seller;
    var title = own ? T('empty_mine') : (S.seller ? T('empty_seller') : T('empty_title'));
    var act = own ? '<button type="button" class="sx-btn sx-green" data-a="sell">' + svg('plus', 16) + esc(T('sell')) + '</button>'
      : '<button type="button" class="sx-btn sx-green" data-a="clear">' + esc(T('clear')) + '</button>';
    return '<div class="sx-empty">' + svg('search', 34) + '<b>' + esc(own || S.seller ? title : T('empty_title')) + '</b><p>' + esc(own || S.seller ? '' : T('empty_sub')) + '</p>' + act + '</div>';
  }
  function pillsHtml() {
    var p = [];
    function pill(k, label) { p.push('<button type="button" class="sx-pill" data-a="unset" data-k="' + k + '">' + esc(label) + svg('x', 13) + '</button>'); }
    if (S.type !== 'all') pill('type', S.type === 'book' ? tt('shop_filter_books') : tt('shop_filter_products'));
    if (S.cat !== 'all') pill('cat', catLabel(S.cat));
    if (S.promo) pill('promo', T('only_promo'));
    if (S.verified) pill('verified', T('only_ver'));
    if (S.fav) pill('fav', T('only_fav'));
    if (S.min !== '') pill('min', T('p_min') + ' ' + fmtPrice(S.min));
    if (S.max !== '') pill('max', T('p_max') + ' ' + fmtPrice(S.max));
    return p.length ? '<div class="sx-pills">' + p.join('') + '</div>' : '';
  }
  function sortOptions() {
    return [['recent', 'sort_recent'], ['popular', 'sort_popular'], ['low', 'sort_low'], ['high', 'sort_high'], ['deal', 'sort_deal']].map(function (o) { return '<option value="' + o[0] + '"' + (S.sort === o[0] ? ' selected' : '') + '>' + esc(T(o[1])) + '</option>'; }).join('');
  }
  function catalogHtml() {
    var list = results(), shown = list.slice(0, S.shown), n = list.length;
    var head = S.seller ? sellerHeadHtml() : '';
    var tool = '<div class="sx-tool"><div class="sx-count" aria-live="polite">' + esc(n === 1 ? T('result_1') : T('results_n', { n: n })) + '</div>' +
      '<button type="button" class="sx-btn sx-out sx-fb" data-a="filters">' + svg('sliders', 16) + esc(T('filters')) + (activeCount(S) ? ' <i>' + activeCount(S) + '</i>' : '') + '</button>' +
      '<select class="sx-sel" id="sx-sort" aria-label="' + esc(T('sort')) + '">' + sortOptions() + '</select></div>' + pillsHtml();
    if (!n) return head + tool + emptyHtml();
    return head + tool + '<div class="sx-grid">' + shown.map(function (i) { return cardHtml(i); }).join('') + '</div>' +
      (n > shown.length ? '<div class="sx-more"><button type="button" class="sx-btn sx-out" data-a="more">' + esc(T('more')) + '</button></div>' : '') +
      '<div class="sx-more"><button type="button" class="sx-btn sx-out" data-a="refresh">' + svg('refresh', 15) + esc(T('refresh')) + '</button></div>';
  }
  function homeHtml() {
    var items = feed(), now = Date.now(), h = ctaHtml() + trustHtml();
    var deals = items.filter(function (i) { return onSale(i, now); }).sort(function (a, b) { return discountOf(b, now) - discountOf(a, now); }).slice(0, 10);
    if (deals.length) h += '<section class="sx-sec sx-flash">' + secHead('zap', T('flash'), T('flash_sub'), 'flash') + rowHtml(deals) + '</section>';
    var fresh = items.slice().sort(function (a, b) { return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0); }).slice(0, 10);
    if (fresh.length) h += '<section class="sx-sec">' + secHead('', T('new_arrivals'), '', 'new') + rowHtml(fresh) + '</section>';
    var top = items.filter(function (i) { return num(i.likesCount) > 0; }).sort(function (a, b) { return num(b.likesCount) - num(a.likesCount); }).slice(0, 10);
    if (top.length >= 3) h += '<section class="sx-sec">' + secHead('', T('top_liked'), '', 'top') + rowHtml(top) + '</section>';
    var vs = verifiedSellers(items, 12);
    if (vs.length) {
      h += '<section class="sx-sec">' + secHead('badge', T('trust_ver'), '', '') + '<div class="sx-vs">' + vs.map(function (s) {
        var av = typeof renderAvatarHtml === 'function' ? renderAvatarHtml(s.name || 'C', s.photo, 56) : '';
        return '<button type="button" class="sx-v" data-a="seller" data-uid="' + esc(s.uid) + '">' + av + '<span>' + esc(s.name || '—') + '</span><em>' + esc(TN('stat_items', s.n)) + '</em></button>';
      }).join('') + '</div></section>';
    }
    var byId = {}; items.forEach(function (i) { byId[i.id] = i; });
    var rec = recentIds().map(function (id) { return byId[id]; }).filter(Boolean).slice(0, 8);
    if (rec.length) h += '<section class="sx-sec">' + secHead('', T('recent'), '', '') + rowHtml(rec) + '</section>';
    var all = items.slice().sort(function (a, b) { return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0); }).slice(0, 8);
    h += '<section class="sx-sec">' + secHead('', T('all_items'), '', 'all') + (all.length ? '<div class="sx-grid">' + all.map(function (i) { return cardHtml(i); }).join('') + '</div>' : emptyHtml()) + '</section>';
    return h;
  }
  function errorHtml() {
    return '<div class="sx-empty">' + svg('refresh', 34) + '<b>' + esc(T('err')) + '</b><p></p><button type="button" class="sx-btn sx-green" data-a="refresh">' + esc(T('retry')) + '</button></div>';
  }
  function renderBody() {
    var body = document.getElementById('sx-body'); if (!body) return;
    var html;
    if (S.state === 'loading' && !feed().length) html = skeleton();
    else if (S.state === 'error' && !feed().length) html = errorHtml();
    else html = isCatalog() ? catalogHtml() : homeHtml();
    body.innerHTML = html;
    var st = document.getElementById('sx-stats'); if (st) st.innerHTML = statsHtml();
    var cats = document.getElementById('sx-cats'); if (cats) cats.innerHTML = catsHtml();
    var tabs = document.getElementById('sx-tabs'); if (tabs) tabs.innerHTML = tabsHtml();
    var qx = document.getElementById('sx-qx'); if (qx) qx.hidden = !S.q;
    var sxEl = document.getElementById('sx'); if (sxEl) sxEl.classList.toggle('sx-compact', isCatalog());
    cartSync();
    clearTimeout(profTimer); profTimer = setTimeout(scanProfiles, 80);
  }

  /* ---------- Panier flottant ---------- */
  function cartSync() {
    var bar = document.getElementById('sx-cartbar'), v = viewEl();
    if (bar) {
      var items = cart(), n = items.length;
      if (!n || !v || v.classList.contains('hidden')) bar.classList.add('hidden');
      else {
        var tot = 0; try { tot = getCartTotal().total; } catch (e) { tot = items.reduce(function (a, c) { return a + num(c.price); }, 0); }
        var hint = cartHint(n);
        bar.innerHTML = '<div><b>' + esc(TN('stat_items', n)) + ' · ' + esc(fmtPrice(tot)) + '</b><small>' + esc(hint ? (hint.ok ? T('hint_ok') : T('hint_n', { n: hint.n })) : '') + '</small></div>' +
          '<button type="button" class="sx-btn sx-amber" data-a="cartopen">' + svg('cart', 16) + esc(T('view_cart')) + '</button>';
        bar.classList.remove('hidden');
      }
    }
    var tabs = document.getElementById('sx-tabs'); if (tabs && mounted) tabs.innerHTML = tabsHtml();
  }
  function cardSync(id) {
    var it = feed().filter(function (i) { return i.id === id; })[0];
    if (it) {
      var inCart = cart().some(function (c) { return c.id === id; });
      [].forEach.call(document.querySelectorAll('[data-cartbtn="' + String(id).replace(/[^\w-]/g, '') + '"]'), function (b) {
        b.className = 'sx-btn ' + (inCart ? 'sx-out' : 'sx-green'); b.setAttribute('aria-pressed', String(inCart));
        b.innerHTML = svg(inCart ? 'check' : 'cart', 16) + '<span>' + esc(inCart ? T('in_cart') : T('add')) + '</span>';
      });
    }
    cartSync();
  }

  /* ---------- Fenêtres : filtres et QR ---------- */
  function closeOv() { var o = document.getElementById('sx-ov'); if (o && o.parentNode) o.parentNode.removeChild(o); document.removeEventListener('keydown', escKey); }
  function escKey(e) { if (e.key === 'Escape') closeOv(); }
  function openOv(inner) {
    closeOv();
    var o = document.createElement('div'); o.className = 'sx-ov'; o.id = 'sx-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="sx-sheet">' + inner + '</div>';
    o.addEventListener('click', function (e) { if (e.target === o) closeOv(); });
    document.body.appendChild(o); document.addEventListener('keydown', escKey);
    return o;
  }
  function openFilters() {
    var draft = { type: S.type, promo: S.promo, verified: S.verified, fav: S.fav, min: S.min, max: S.max };
    function opt(k, v, label) { return '<button type="button" class="sx-opt' + (draft[k] === v ? ' on' : '') + '" data-k="' + k + '" data-v="' + v + '">' + esc(label) + '</button>'; }
    function tg(k, label) { return '<label class="sx-tg"><span>' + esc(label) + '</span><input type="checkbox" data-t="' + k + '"' + (draft[k] ? ' checked' : '') + '></label>'; }
    var o = openOv('<h3><span>' + esc(T('filters')) + '</span><button type="button" class="sx-ib" data-x="1" aria-label="' + esc(T('close')) + '">' + svg('x', 18) + '</button></h3>' +
      '<h4>' + esc(T('f_type')) + '</h4><div class="sx-opts" id="sx-f-type">' + opt('type', 'all', tt('shop_filter_all')) + opt('type', 'book', tt('shop_filter_books')) + opt('type', 'product', tt('shop_filter_products')) + '</div>' +
      '<h4>' + esc(T('price_range')) + '</h4><div class="sx-prices"><input type="number" inputmode="decimal" min="0" step="0.01" id="sx-f-min" placeholder="' + esc(T('p_min')) + '" aria-label="' + esc(T('p_min')) + '" value="' + esc(draft.min) + '"><input type="number" inputmode="decimal" min="0" step="0.01" id="sx-f-max" placeholder="' + esc(T('p_max')) + '" aria-label="' + esc(T('p_max')) + '" value="' + esc(draft.max) + '"></div>' +
      '<div style="margin-top:8px">' + tg('promo', T('only_promo')) + tg('verified', T('only_ver')) + tg('fav', T('only_fav')) + '</div>' +
      '<div class="sx-sheet-acts"><button type="button" class="sx-btn sx-out" data-r="1">' + esc(T('reset')) + '</button><button type="button" class="sx-btn sx-green" data-ok="1">' + esc(T('apply')) + '</button></div>');
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.getAttribute('data-x')) { closeOv(); return; }
      if (b.getAttribute('data-k')) { draft[b.getAttribute('data-k')] = b.getAttribute('data-v'); [].forEach.call(o.querySelectorAll('#sx-f-type .sx-opt'), function (x) { x.classList.toggle('on', x === b); }); return; }
      if (b.getAttribute('data-r')) { S.type = 'all'; S.promo = S.verified = S.fav = false; S.min = S.max = ''; closeOv(); S.shown = PAGE; renderBody(); return; }
      if (b.getAttribute('data-ok')) {
        var mn = document.getElementById('sx-f-min').value.trim(), mx = document.getElementById('sx-f-max').value.trim();
        S.type = draft.type; S.min = mn === '' || num(mn) < 0 ? '' : String(num(mn)); S.max = mx === '' || num(mx) < 0 ? '' : String(num(mx));
        [].forEach.call(o.querySelectorAll('input[data-t]'), function (c) { S[c.getAttribute('data-t')] = c.checked; });
        if (S.min !== '' && S.max !== '' && num(S.min) > num(S.max)) { var t0 = S.min; S.min = S.max; S.max = t0; }
        closeOv(); S.shown = PAGE; S.page = 'catalog'; renderBody(); scrollTop();
      }
    });
  }
  function shopUrl(uid) { return 'https://coeurnohuniverse.com/?boutique=' + encodeURIComponent(uid); }
  function copyText(txt) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(function () { toast(T('copied'), 'success'); }, function () { fallbackCopy(txt); }); } catch (e) { /* repli */ }
    fallbackCopy(txt);
  }
  function fallbackCopy(txt) {
    try { var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast(T('copied'), 'success'); } catch (e) { /* rien de plus à faire */ }
  }
  function shareLink(uid, title) {
    var url = shopUrl(uid);
    if (navigator.share) { try { var p = navigator.share({ title: title || '', text: T('qr_share_text'), url: url }); if (p && p.catch) p.catch(function () { /* partage annulé */ }); return; } catch (e) { /* repli : copie */ } }
    copyText(T('qr_share_text') + ' ' + url);
  }
  function saveQr(svgText, name) {
    try {
      var sized = svgText.replace('<svg ', '<svg width="720" height="720" ');
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = 720; c.height = 720; var x = c.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(0, 0, 720, 720); x.drawImage(img, 0, 0, 720, 720);
          c.toBlob(function (b) { if (b) dl(b, name + '.png'); else dl(new Blob([svgText], { type: 'image/svg+xml' }), name + '.svg'); }, 'image/png');
        } catch (e) { dl(new Blob([svgText], { type: 'image/svg+xml' }), name + '.svg'); }
      };
      img.onerror = function () { dl(new Blob([svgText], { type: 'image/svg+xml' }), name + '.svg'); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
    } catch (e) { dl(new Blob([svgText], { type: 'image/svg+xml' }), name + '.svg'); }
  }
  function dl(blob, name) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  }
  function openQr() {
    var u = me(); if (!u) { toast(T('qr_login'), 'info'); call('openAuth', 'register'); return; }
    var url = shopUrl(u.uid), art = '';
    try { if (window.CNQR) art = window.CNQR.svg(url, { fg: '#0b5a2e', bg: '#ffffff', margin: 2 }); } catch (e) { art = ''; }
    var o = openOv('<h3><span>' + esc(T('my_qr')) + '</span><button type="button" class="sx-ib" data-x="1" aria-label="' + esc(T('close')) + '">' + svg('x', 18) + '</button></h3>' +
      '<div class="sx-qrbox">' + (art ? '<div class="q">' + art + '</div>' : '') + '<p>' + esc(T('qr_sub')) + '</p><div class="u">' + esc(url) + '</div>' +
      '<button type="button" class="sx-btn sx-green" data-q="share">' + svg('share', 16) + esc(T('qr_share')) + '</button>' +
      '<button type="button" class="sx-btn sx-out" data-q="copy">' + svg('qr', 16) + esc(T('qr_copy')) + '</button>' +
      (art ? '<button type="button" class="sx-btn sx-out" data-q="save">' + svg('download', 16) + esc(T('qr_save')) + '</button>' : '') + '</div>');
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.getAttribute('data-x')) { closeOv(); return; }
      var a = b.getAttribute('data-q');
      if (a === 'share') shareLink(u.uid, T('mine_title'));
      else if (a === 'copy') copyText(url);
      else if (a === 'save') saveQr(art, 'coeurnoh-boutique-qr');
    });
  }

  /* ---------- Ma boutique : menu, réglages (contacts + paiement), fenêtre « Payer le vendeur » ---------- */
  function lbHtml(attr, ic, title, small) {
    return '<button type="button" class="sx-lb" ' + attr + '><b>' + svg(ic, 20) + '</b><span>' + esc(title) + (small ? '<small>' + esc(small) + '</small>' : '') + '</span></button>';
  }
  function head(title) { return '<h3><span>' + esc(title) + '</span><button type="button" class="sx-ib" data-x="1" aria-label="' + esc(T('close')) + '">' + svg('x', 18) + '</button></h3>'; }
  function goSeller(uid) { S.seller = uid || ''; S.page = 'catalog'; S.q = ''; var qi = document.getElementById('sx-q'); if (qi) qi.value = ''; go(); }
  function needLogin() { toast(T('qr_login'), 'info'); call('openAuth', 'register'); }
  function openHub() {
    var u = me(); if (!u) { needLogin(); return; }
    function body() {
      var p = prof(u.uid) || {}, names = CH.filter(function (c) { return p[c[0]]; }).map(function (c) { return chLabel(c[0]); });
      if (p.pay || p.payQr) names.push(T('s_pay'));
      return head(T('mine_title')) + '<p class="sx-sub">' + esc(T('settings_sub')) + '</p>' +
        lbHtml('data-h="settings"', 'wallet', T('settings_title'), names.length ? names.join(' · ') : T('hint_setup')) +
        lbHtml('data-h="sell"', 'plus', T('hub_publish'), '') + lbHtml('data-h="seller"', 'store', T('see_mine'), '') +
        lbHtml('data-h="qr"', 'qr', T('my_qr'), '') + lbHtml('data-h="space"', 'grid', T('my_space'), '');
    }
    var o = openOv(body());
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.getAttribute('data-x')) { closeOv(); return; }
      var h = b.getAttribute('data-h'); if (!h) return;
      closeOv();
      if (h === 'settings') openSettings(); else if (h === 'sell') call('openSellForm'); else if (h === 'seller') goSeller(u.uid); else if (h === 'qr') openQr(); else if (h === 'space') call('showSellerPage');
    });
    wantProfiles([u.uid], true).then(function () { var sh = document.querySelector('#sx-ov .sx-sheet'); if (sh && document.getElementById('sx-ov') === o) sh.innerHTML = body(); });
  }
  function openSettings() {
    var u = me(); if (!u) { needLogin(); return; }
    var o = openOv('<h3><span>' + esc(T('settings_title')) + '</span></h3><p class="sx-sub">' + esc(T('loading_profile')) + '</p>');
    wantProfiles([u.uid], true).then(function () { if (document.getElementById('sx-ov') === o) build(o, u); });
  }
  function build(o, u) {
    var base = prof(u.uid) || {}, blocked = !!base.payBlocked;
    var ST = { pay: (base.pay || []).map(function (r) { return { label: r.label || '', url: r.url || '' }; }), qr: qrOk(base.payQr), busy: false, up: false, err: '', note: base.payNote || '' };
    var vals = {}; CH.forEach(function (c) { vals[c[0]] = base[c[0]] || ''; });
    if (!ST.pay.length) ST.pay.push({ label: '', url: '' });
    function field(k) {
      var type = (k === 'whatsapp' || k === 'call') ? 'tel' : (k === 'email' ? 'email' : (k === 'website' ? 'url' : 'text'));
      return '<label class="sx-fld"><span>' + esc(T('f_' + k)) + '</span><input type="' + type + '" inputmode="' + (type === 'tel' ? 'tel' : (type === 'text' ? 'text' : type)) + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="300" data-f="' + k + '" value="' + esc(vals[k]) + '"></label>';
    }
    function payPart() {
      if (blocked) return '<div class="sx-note">' + svg('alert', 18) + '<span>' + esc(T('blocked_note')) + '</span></div>';
      var rows = ST.pay.map(function (r, i) {
        return '<div class="sx-pr"><input type="text" maxlength="30" data-pl="' + i + '" placeholder="' + esc(T('pay_label_ph')) + '" aria-label="' + esc(T('pay_label_ph')) + '" value="' + esc(r.label) + '">' +
          '<input type="url" inputmode="url" maxlength="500" autocapitalize="off" autocorrect="off" spellcheck="false" data-pu="' + i + '" placeholder="https://…" aria-label="https://" value="' + esc(r.url) + '">' +
          '<button type="button" data-rm="' + i + '">' + esc(T('pay_remove')) + '</button></div>';
      }).join('');
      var add = ST.pay.length < 3 ? '<button type="button" class="sx-btn sx-out" style="margin-top:10px" data-add="1">' + svg('plus', 16) + esc(T('pay_add')) + '</button>' : '';
      var qr = ST.qr
        ? '<div class="sx-qrp"><img src="' + imgSrc(ST.qr) + '" alt="QR" width="84" height="84"><div style="display:grid;gap:8px"><button type="button" class="sx-btn sx-out" data-up="1">' + esc(T('pay_qr_change')) + '</button><button type="button" class="sx-btn sx-out" data-qrm="1">' + esc(T('pay_qr_remove')) + '</button></div></div>'
        : '<button type="button" class="sx-btn sx-out" style="margin-top:6px" data-up="1">' + svg('upload', 16) + esc(ST.up ? T('uploading') : T('pay_qr_pick')) + '</button>';
      return '<p class="sx-sub">' + esc(T('pay_intro')) + '</p>' + rows + add + '<h4>' + esc(T('pay_qr')) + '</h4>' + qr + '<input type="file" accept="image/*" id="sx-qrfile" hidden>' +
        '<label class="sx-fld"><span>' + esc(T('pay_note')) + '</span><textarea rows="2" maxlength="160" data-note="1" placeholder="' + esc(T('pay_note_ph')) + '">' + esc(ST.note) + '</textarea></label>' +
        '<div class="sx-note">' + svg('alert', 18) + '<span>' + esc(T('pay_own_warn')) + '</span></div>';
    }
    function html() {
      return head(T('settings_title')) + '<p class="sx-sub">' + esc(T('settings_sub')) + '</p>' +
        '<h4>' + esc(T('s_contacts')) + '</h4>' + CH.map(function (c) { return field(c[0]); }).join('') +
        '<h4>' + esc(T('s_pay')) + '</h4>' + payPart() +
        (ST.err ? '<div class="sx-err" role="alert">' + esc(ST.err) + '</div>' : '') +
        '<div class="sx-sheet-acts"><button type="button" class="sx-btn sx-green" data-save="1"' + (ST.busy || ST.up ? ' disabled' : '') + '>' + esc(ST.busy ? T('saving') : T('save')) + '</button></div>';
    }
    function readForm() {
      var sh = o.querySelector('.sx-sheet'); if (!sh) return;
      [].forEach.call(sh.querySelectorAll('input[data-f]'), function (i) { vals[i.getAttribute('data-f')] = i.value; });
      [].forEach.call(sh.querySelectorAll('input[data-pl]'), function (i) { var n = +i.getAttribute('data-pl'); if (ST.pay[n]) ST.pay[n].label = i.value; });
      [].forEach.call(sh.querySelectorAll('input[data-pu]'), function (i) { var n = +i.getAttribute('data-pu'); if (ST.pay[n]) ST.pay[n].url = i.value; });
      var nt = sh.querySelector('textarea[data-note]'); if (nt) ST.note = nt.value;
    }
    function draw() { if (document.getElementById('sx-ov') !== o) return; var sh = o.querySelector('.sx-sheet'); if (sh) sh.innerHTML = html(); }
    function redraw() { readForm(); draw(); }
    function save() {
      readForm(); if (ST.busy || ST.up) return;
      var bad = !blocked && ST.pay.some(function (r) { var l = r.label.trim(), w = r.url.trim(); return (l || w) && (!l || !/^https:\/\//i.test(w)); });
      if (bad) { ST.err = T('err_https'); draw(); return; }
      ST.busy = true; ST.err = ''; draw();
      var body = {}; CH.forEach(function (c) { body[c[0]] = String(vals[c[0]] || '').trim(); });
      body.pay = blocked ? [] : ST.pay.filter(function (r) { return r.label.trim() && r.url.trim(); }).map(function (r) { return { label: r.label.trim(), url: r.url.trim() }; });
      body.payQr = blocked ? '' : ST.qr; body.payNote = blocked ? '' : ST.note.trim();
      apiCall('shop_profile_save', body).then(function (d) {
        PROF[u.uid] = d.profile || {}; PROF_AT[u.uid] = Date.now();
        toast(T('saved'), 'success'); if (document.getElementById('sx-ov') === o) closeOv(); if (active()) renderBody();
      }, function (e) {
        ST.busy = false; ST.err = (e && e.message && e.message !== 'error' && e.message !== 'login') ? e.message : T('err'); draw();
      });
    }
    o.innerHTML = '<div class="sx-sheet">' + html() + '</div>';
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.getAttribute('data-x')) { closeOv(); return; }
      if (b.getAttribute('data-save')) { save(); return; }
      if (b.getAttribute('data-add')) { readForm(); if (ST.pay.length < 3) ST.pay.push({ label: '', url: '' }); draw(); return; }
      if (b.getAttribute('data-rm') !== null) { readForm(); ST.pay.splice(+b.getAttribute('data-rm'), 1); if (!ST.pay.length) ST.pay.push({ label: '', url: '' }); draw(); return; }
      if (b.getAttribute('data-qrm')) { readForm(); ST.qr = ''; draw(); return; }
      if (b.getAttribute('data-up')) { var fi = document.getElementById('sx-qrfile'); if (fi) fi.click(); }
    });
    o.addEventListener('change', function (e) {
      var fi = e.target; if (!fi || fi.id !== 'sx-qrfile' || !fi.files || !fi.files[0]) return;
      var file = fi.files[0];
      if (!/^image\//.test(file.type || '')) { ST.err = T('err'); redraw(); return; }
      readForm(); ST.up = true; ST.err = ''; draw();
      var pr; try { pr = call('uploadFileToStorage', file, 'boutique-images', { maxSizeMB: 5 }); } catch (x) { pr = null; }
      Promise.resolve(pr).then(function (r) {
        if (!r || !qrOk(r.url)) throw new Error('upload');
        ST.qr = r.url; ST.up = false; ST.err = ''; draw();
      }).catch(function () { ST.up = false; ST.err = T('err'); draw(); });
    });
  }
  function openPay(uid, itemId) {
    if (!me()) { needLogin(); return; }
    var pf = prof(uid) || {}, it = itemId ? byId(itemId) : null, first = feed().filter(function (i) { return i.sellerUid === uid; })[0];
    var links = (Array.isArray(pf.pay) ? pf.pay : []).filter(function (r) { return r && r.label && httpsOnly(r.url); }).slice(0, 3);
    var qr = qrOk(pf.payQr), reportId = (it && it.id) || (first && first.id) || '';
    var waNum = dg(pf.whatsapp || (first && first.sellerPhone), 8);
    function main() {
      var h = head(T('pay_btn')) + '<div class="sx-note">' + svg('alert', 18) + '<span>' + esc(T('pay_warn')) + '</span></div>';
      if (it) h += '<p class="sx-sub"><b>' + esc(it.title || '') + '</b> · ' + esc(fmtPrice(eff(it, Date.now()))) + '</p>';
      links.forEach(function (r, i) { h += lbHtml('data-l="' + i + '"', 'wallet', T('pay_with', { label: r.label }), hostOf(r.url)); });
      if (qr) h += '<h4>' + esc(T('pay_qr')) + '</h4><div class="sx-qrbox"><button type="button" class="sx-qrimg" data-z="1" aria-label="' + esc(T('qr_zoom')) + '"><img src="' + imgSrc(qr) + '" alt="QR" loading="lazy" decoding="async"></button><p>' + esc(T('pay_qr_cap')) + '</p></div>';
      if (pf.payNote) h += '<p class="sx-sub">' + esc(pf.payNote) + '</p>';
      if (waNum) h += '<a class="sx-lb" href="https://wa.me/' + esc(waNum) + '?text=' + encodeURIComponent(T('wa_hello') + (it && it.title ? ' — ' + it.title : '')) + '" target="_blank" rel="noopener noreferrer"><b>' + svg('whatsapp', 20) + '</b><span>' + esc(T('contact_title')) + '<small>WhatsApp</small></span></a>';
      if (reportId) h += lbHtml('data-rp="1"', 'flag', T('report_link'), '');
      return h;
    }
    function leave(i) {
      var r = links[i]; if (!r) return main();
      return head(T('leave_title')) + '<div class="sx-note">' + svg('alert', 18) + '<span>' + esc(T('leave_body', { host: hostOf(r.url) })) + '</span></div>' +
        '<p class="sx-sub" style="word-break:break-all">' + esc(r.url) + '</p>' +
        '<div class="sx-sheet-acts"><button type="button" class="sx-btn sx-out" data-bk="1">' + esc(T('cancel')) + '</button><a class="sx-btn sx-green" data-go="1" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(T('go_on')) + '</a></div>';
    }
    var o = openOv(main());
    function setSheet(h) { var sh = o.querySelector('.sx-sheet'); if (sh) sh.innerHTML = h; }
    o.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a[data-go]')) { setTimeout(closeOv, 400); return; }
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.getAttribute('data-x')) { closeOv(); return; }
      if (b.getAttribute('data-bk')) { setSheet(main()); return; }
      if (b.getAttribute('data-l') !== null) { setSheet(leave(+b.getAttribute('data-l'))); return; }
      if (b.getAttribute('data-z')) {
        var z = document.createElement('div'); z.className = 'sx-zoom'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-modal', 'true');
        var im = document.createElement('img'); im.alt = 'QR'; try { im.src = typeof normalizeMediaUrl === 'function' ? normalizeMediaUrl(qr) : qr; } catch (x) { im.src = qr; }
        z.appendChild(im); z.addEventListener('click', function () { if (z.parentNode) z.parentNode.removeChild(z); }); document.body.appendChild(z); return;
      }
      if (b.getAttribute('data-rp')) { closeOv(); call('openReportModal', reportId, uid, 'publication'); }
    });
    wantProfiles([uid], true).then(function () { if (document.getElementById('sx-ov') === o && !o.querySelector('[data-go]')) { pf = prof(uid) || {}; links = (Array.isArray(pf.pay) ? pf.pay : []).filter(function (r) { return r && r.label && httpsOnly(r.url); }).slice(0, 3); qr = qrOk(pf.payQr); waNum = dg(pf.whatsapp || (first && first.sellerPhone), 8); setSheet(main()); } });
  }

  /* ---------- Actions ---------- */
  function scrollTop() { try { var v = viewEl(); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); } catch (e) { /* ignore */ } }
  function byId(id) { return feed().filter(function (i) { return i.id === id; })[0]; }
  function resetFilters() { S.q = ''; S.type = 'all'; S.cat = 'all'; S.promo = S.verified = S.fav = false; S.min = S.max = ''; S.shown = PAGE; var q = document.getElementById('sx-q'); if (q) q.value = ''; }
  function go(fn) { S.shown = PAGE; renderBody(); if (fn !== false) scrollTop(); }
  function act(a, el) {
    var id = el.getAttribute('data-id'), it = id ? byId(id) : null, u = me();
    switch (a) {
      case 'back': call('showDashboard'); break;
      case 'open': if (id) { pushRecent(id); call('openPostDetail', id); } break;
      case 'like': if (id) { if (u) call('watchPostsCounts', [id]); call('toggleShopLike', id); } break;
      case 'cart': if (it) call('toggleCartItem', it.id, it.title || '', eff(it, Date.now()), it.imageUrl || ''); break;
      case 'buy': if (it) call('buyShopItem', it.id, it.title || '', eff(it, Date.now()), it.type); break;
      case 'share': if (it) call('shareShopItem', it.id, it.title || ''); break;
      case 'del': if (id) call('deleteMyPublication', id); break;
      case 'seller': goSeller(el.getAttribute('data-uid')); break;
      case 'exitseller': S.seller = ''; go(); break;
      case 'shareseller': shareLink(el.getAttribute('data-uid'), ''); break;
      case 'cat': S.cat = el.getAttribute('data-cat') || 'all'; S.page = S.cat === 'all' ? S.page : 'catalog'; go(false); break;
      case 'tab': {
        var tb = el.getAttribute('data-tab');
        if (tb === 'home') { resetFilters(); S.seller = ''; S.page = 'home'; go(); }
        else if (tb === 'catalog') { S.page = 'catalog'; S.seller = ''; go(); }
        else if (tb === 'lib') call('showLibrary');
        else if (tb === 'cart') call('openCart');
        break;
      }
      case 'sell': if (!u) call('openAuth', 'register'); else call('openSellForm'); break;
      case 'space': if (!u) call('openAuth', 'register'); else call('showSellerPage'); break;
      case 'qr': openQr(); break;
      case 'hub': openHub(); break;
      case 'settings': if (!u) needLogin(); else openSettings(); break;
      case 'pay': openPay(el.getAttribute('data-uid') || '', id); break;
      case 'filters': openFilters(); break;
      case 'clear': resetFilters(); S.seller = ''; S.page = 'catalog'; go(false); break;
      case 'unset': { var k = el.getAttribute('data-k'); if (k === 'type') S.type = 'all'; else if (k === 'cat') S.cat = 'all'; else if (k === 'min' || k === 'max') S[k] = ''; else S[k] = false; go(false); break; }
      case 'clearq': S.q = ''; var q2 = document.getElementById('sx-q'); if (q2) { q2.value = ''; q2.focus(); } go(false); break;
      case 'more': S.shown += PAGE; renderBody(); break;
      case 'refresh': S.state = 'loading'; call('loadShopFeed', true); break;
      case 'cartopen': call('openCart'); break;
      case 'seeall': {
        var sec = el.getAttribute('data-sec');
        resetFilters(); S.seller = ''; S.page = 'catalog';
        if (sec === 'flash') { S.promo = true; S.sort = 'deal'; } else if (sec === 'top') S.sort = 'popular'; else S.sort = 'recent';
        go(); break;
      }
    }
  }
  function onClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-a]') : null;
    if (!el || !el.closest('#sx-root')) return;
    if (el.tagName === 'A') return;
    act(el.getAttribute('data-a'), el);
  }
  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('sx-media')) { e.preventDefault(); act('open', e.target); }
  }
  function onInput(e) {
    if (!e.target || e.target.id !== 'sx-q') return;
    var v = e.target.value; clearTimeout(qTimer);
    qTimer = setTimeout(function () { S.q = v.trim(); S.shown = PAGE; if (S.q) S.page = 'catalog'; renderBody(); }, 220);
  }
  function onChange(e) {
    if (e.target && e.target.id === 'sx-sort') { S.sort = e.target.value; S.shown = PAGE; renderBody(); }
  }

  /* ---------- Compte à rebours des promotions (une seule horloge, seulement quand la Boutique est visible) ---------- */
  function startTick() {
    if (tick) return;
    tick = setInterval(function () {
      if (!active()) { clearInterval(tick); tick = null; return; }
      var now = Date.now(), reload = false;
      [].forEach.call(document.querySelectorAll('[data-end]'), function (n) {
        var left = new Date(n.getAttribute('data-end')).getTime() - now;
        if (left <= 0) { reload = true; return; }
        n.textContent = left < 3600000 * 6 ? T('ends_soon') : T('ends_in', { t: fmtLeft(left, lang() === 0 ? 'j' : 'd') });
      });
      if (reload) renderBody();
    }, 60000);
  }

  /* ---------- Cycle de vie ---------- */
  function active() { var v = viewEl(); return !!(mounted && v && !v.classList.contains('hidden') && document.getElementById('sx-root')); }
  function mount() {
    var v = viewEl(); if (!v) return false;
    var wrap = v.querySelector('.wrap'); if (!wrap) return false;
    ensureStyle();
    var root = document.getElementById('sx-root');
    if (!root) { root = document.createElement('div'); root.id = 'sx-root'; wrap.insertBefore(root, wrap.firstChild); root.addEventListener('click', onClick); root.addEventListener('keydown', onKey); root.addEventListener('input', onInput); root.addEventListener('change', onChange); }
    root.innerHTML = shell();
    v.classList.add('sx-on');
    mounted = true;
    return true;
  }
  function open(opts) {
    opts = opts || {};
    if (!mount()) { call('loadShopFeed'); return; }
    if (opts.seller) { S.seller = String(opts.seller); S.page = 'catalog'; S.q = ''; S.cat = 'all'; }
    else if (!opts.keep) { S.seller = ''; if (!S.q) S.page = 'home'; }
    S.shown = PAGE; S.state = feed().length ? 'ready' : 'loading';
    renderBody();
    startTick();
    var p = call('loadShopFeed');
    if (p && p.then) p.then(function () { /* renderShopFeed est rappelé par le chargement */ }, function () { /* erreur déjà affichée */ });
  }
  /* Bouton Retour du téléphone : ferme d'abord l'image agrandie, puis la fenêtre ouverte (paiement, réglages…). */
  (function () {
    var orig = window.closeTopmostOverlay;
    window.closeTopmostOverlay = function () {
      var z = document.querySelector('.sx-zoom');
      if (z) { if (z.parentNode) z.parentNode.removeChild(z); return true; }
      if (document.getElementById('sx-ov')) { closeOv(); return true; }
      return typeof orig === 'function' ? orig.apply(this, arguments) : false;
    };
  })();
  window.cnShopPro = {
    open: open, active: active,
    render: function () { S.state = 'ready'; if (active()) renderBody(); },
    loading: function () { if (!feed().length) { S.state = 'loading'; if (active()) renderBody(); } },
    fail: function (e) { S.err = e; S.state = 'error'; if (active()) renderBody(); },
    cardSync: cardSync, cartSync: cartSync,
    state: S
  };
})();
