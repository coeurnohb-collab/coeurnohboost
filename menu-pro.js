/* =====================================================================
   menu-pro.js — Menu professionnel de Coeurnoh Universe

   S'ajoute PAR-DESSUS le menu existant (script.js n'est pas modifié) :
   - barre de recherche universelle (services, outils, réglages)
   - raccourcis épinglables (façon Facebook)
   - hub "Services" en grille avec badges Gratuit / Premium / Pro
   - Boîte à outils 100 % gratuite (QR Code, lien WhatsApp, texte stylé,
     convertisseur de devises, calculateur de prix, hashtags)
   - écran "Plans & tarifs" (lit les vraies constantes de script.js)
   - liens rapides ?open=tools | services | plans | wallet (raccourcis
     de l'icône Android déclarés dans manifest.json)

   Si ce fichier échoue pour une raison quelconque, l'ancien menu reste
   intact et fonctionne comme avant (amélioration progressive).
   Aucune écriture Firestore : les règles Firestore restent inchangées.
   ===================================================================== */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : globalThis;
  if (root.__menuProLoaded) return;
  root.__menuProLoaded = true;

  /* ===================================================================
     1. FONCTIONS PURES (testables hors navigateur)
     =================================================================== */

  /* ---------- Générateur de QR Code (octets, correction M, versions 1-10) ---------- */
  var QR_ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  var QR_BLK = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

  function qrRawModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(degree) {
    var result = [], i, j;
    for (i = 0; i < degree; i++) result.push(0);
    result[degree - 1] = 1;
    var rootV = 1;
    for (i = 0; i < degree; i++) {
      for (j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], rootV);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      rootV = gfMul(rootV, 2);
    }
    return result;
  }
  function rsRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      divisor.forEach(function (coef, i) { result[i] ^= gfMul(coef, factor); });
    });
    return result;
  }
  function getBit(x, i) { return ((x >>> i) & 1) !== 0; }

  function qrPenalty(m) {
    var n = m.length, score = 0, x, y, k;
    var pA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var pB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function line(get) {
      var run = 1, i, j, ok1, ok2;
      for (i = 1; i < n; i++) {
        if (get(i) === get(i - 1)) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
      for (i = 0; i + 11 <= n; i++) {
        ok1 = true; ok2 = true;
        for (j = 0; j < 11; j++) {
          var v = get(i + j) ? 1 : 0;
          if (v !== pA[j]) ok1 = false;
          if (v !== pB[j]) ok2 = false;
        }
        if (ok1) score += 40;
        if (ok2) score += 40;
      }
    }
    for (y = 0; y < n; y++) (function (yy) { line(function (i) { return m[yy][i]; }); })(y);
    for (x = 0; x < n; x++) (function (xx) { line(function (i) { return m[i][xx]; }); })(x);
    var dark = 0;
    for (y = 0; y < n; y++) {
      for (x = 0; x < n; x++) {
        if (m[y][x]) dark++;
        if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
      }
    }
    var total = n * n;
    k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * 10;
    return score;
  }

  /* Renvoie une matrice de booléens (true = module foncé), ou null si le texte
     est vide ou trop long (capacité max ≈ 213 octets en version 10). */
  function qrEncode(text) {
    var data = [];
    if (typeof TextEncoder !== 'undefined') data = Array.prototype.slice.call(new TextEncoder().encode(text));
    else { var u = unescape(encodeURIComponent(text)); for (var q = 0; q < u.length; q++) data.push(u.charCodeAt(q)); }
    if (!data.length) return null;

    var ver, dataCap = 0;
    for (ver = 1; ver <= 10; ver++) {
      var cap = Math.floor(qrRawModules(ver) / 8) - QR_ECC[ver] * QR_BLK[ver];
      var bitsNeeded = 4 + (ver < 10 ? 8 : 16) + data.length * 8;
      if (bitsNeeded <= cap * 8) { dataCap = cap; break; }
    }
    if (!dataCap) return null;

    // 1) Bits de données
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4);
    put(data.length, ver < 10 ? 8 : 16);
    data.forEach(function (b) { put(b, 8); });
    var maxBits = dataCap * 8;
    put(0, Math.min(4, maxBits - bits.length));
    while (bits.length % 8) bits.push(0);
    for (var pad = 0xEC; bits.length < maxBits; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var codewords = [];
    for (var bi = 0; bi < bits.length; bi += 8) {
      var byte = 0;
      for (var bj = 0; bj < 8; bj++) byte = (byte << 1) | bits[bi + bj];
      codewords.push(byte);
    }

    // 2) Correction d'erreurs + entrelacement
    var numBlocks = QR_BLK[ver], blockEccLen = QR_ECC[ver];
    var rawCodewords = Math.floor(qrRawModules(ver) / 8);
    var numShort = numBlocks - rawCodewords % numBlocks;
    var shortBlockLen = Math.floor(rawCodewords / numBlocks);
    var blocks = [], div = rsDivisor(blockEccLen);
    for (var i = 0, k = 0; i < numBlocks; i++) {
      var datLen = shortBlockLen - blockEccLen + (i < numShort ? 0 : 1);
      var dat = codewords.slice(k, k + datLen);
      k += datLen;
      var ecc = rsRemainder(dat, div);
      if (i < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var all = [];
    for (var c = 0; c < blocks[0].length; c++) {
      blocks.forEach(function (blk, j) {
        if (c !== shortBlockLen - blockEccLen || j >= numShort) all.push(blk[c]);
      });
    }

    // 3) Matrice
    var size = ver * 4 + 17;
    var modules = [], isFn = [];
    for (var yy = 0; yy < size; yy++) {
      modules.push([]); isFn.push([]);
      for (var xx = 0; xx < size; xx++) { modules[yy].push(false); isFn[yy].push(false); }
    }
    function setFn(x, y, dark) { modules[y][x] = dark; isFn[y][x] = true; }

    for (var t = 0; t < size; t++) { setFn(6, t, t % 2 === 0); setFn(t, 6, t % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var alignPos = [];
    if (ver > 1) {
      var numAlign = Math.floor(ver / 7) + 2;
      var step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
      alignPos = [6];
      for (var pos = size - 7; alignPos.length < numAlign; pos -= step) alignPos.splice(1, 0, pos);
    }
    for (var ai = 0; ai < alignPos.length; ai++) for (var aj = 0; aj < alignPos.length; aj++) {
      var last = alignPos.length - 1;
      if ((ai === 0 && aj === 0) || (ai === 0 && aj === last) || (ai === last && aj === 0)) continue;
      for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++)
        setFn(alignPos[ai] + ax, alignPos[aj] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
    }

    function drawFormat(mask) {
      var d = (0 << 3) | mask; // niveau de correction M = 0
      var rem = d;
      for (var r = 0; r < 10; r++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fb = ((d << 10) | rem) ^ 0x5412, n;
      for (n = 0; n <= 5; n++) setFn(8, n, getBit(fb, n));
      setFn(8, 7, getBit(fb, 6)); setFn(8, 8, getBit(fb, 7)); setFn(7, 8, getBit(fb, 8));
      for (n = 9; n < 15; n++) setFn(14 - n, 8, getBit(fb, n));
      for (n = 0; n < 8; n++) setFn(size - 1 - n, 8, getBit(fb, n));
      for (n = 8; n < 15; n++) setFn(8, size - 15 + n, getBit(fb, n));
      setFn(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var vr = ver;
      for (var v = 0; v < 12; v++) vr = (vr << 1) ^ ((vr >>> 11) * 0x1F25);
      var vb = (ver << 12) | vr;
      for (var vi = 0; vi < 18; vi++) {
        var a = size - 11 + vi % 3, b = Math.floor(vi / 3);
        setFn(a, b, getBit(vb, vi)); setFn(b, a, getBit(vb, vi));
      }
    }

    var bitIdx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x2 = right - j, upward = ((right + 1) & 2) === 0, y2 = upward ? size - 1 - vert : vert;
          if (!isFn[y2][x2] && bitIdx < all.length * 8) {
            modules[y2][x2] = getBit(all[bitIdx >>> 3], 7 - (bitIdx & 7));
            bitIdx++;
          }
        }
      }
    }

    function applyMask(mask) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var inv;
        switch (mask) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!isFn[y][x] && inv) modules[y][x] = !modules[y][x];
      }
    }
    var bestMask = 0, bestScore = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      applyMask(mk); drawFormat(mk);
      var sc = qrPenalty(modules);
      if (sc < bestScore) { bestScore = sc; bestMask = mk; }
      applyMask(mk); // annule
    }
    applyMask(bestMask); drawFormat(bestMask);
    return modules;
  }

  /* ---------- Texte stylé ---------- */
  var FONT_STYLES = [
    { id: 'bold', U: 0x1D400, l: 0x1D41A, d: 0x1D7CE },
    { id: 'italic', U: 0x1D434, l: 0x1D44E, ex: { h: '\u210E' } },
    { id: 'bolditalic', U: 0x1D468, l: 0x1D482 },
    { id: 'script', U: 0x1D4D0, l: 0x1D4EA },
    { id: 'fraktur', U: 0x1D56C, l: 0x1D586 },
    { id: 'double', U: 0x1D538, l: 0x1D552, d: 0x1D7D8, exU: { C: '\u2102', H: '\u210D', N: '\u2115', P: '\u2119', Q: '\u211A', R: '\u211D', Z: '\u2124' } },
    { id: 'sans', U: 0x1D5D4, l: 0x1D5EE, d: 0x1D7EC },
    { id: 'mono', U: 0x1D670, l: 0x1D68A, d: 0x1D7F6 },
    { id: 'circle', U: 0x24B6, l: 0x24D0, circleDigits: true },
    { id: 'full', U: 0xFF21, l: 0xFF41, d: 0xFF10 }
  ];
  function stripAccents(s) { return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; }
  function styleText(text, st) {
    var out = '';
    Array.from(stripAccents(text)).forEach(function (ch) {
      var c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) out += (st.exU && st.exU[ch]) || String.fromCodePoint(st.U + c - 65);
      else if (c >= 97 && c <= 122) out += (st.ex && st.ex[ch]) || String.fromCodePoint(st.l + c - 97);
      else if (c >= 48 && c <= 57) {
        if (st.circleDigits) out += String.fromCodePoint(c === 48 ? 0x24EA : 0x2460 + c - 49);
        else if (st.d) out += String.fromCodePoint(st.d + c - 48);
        else out += ch;
      } else out += ch;
    });
    return out;
  }

  /* ---------- Calculateur de prix ---------- */
  function calcPrice(cost, fixed, marginPct, feePct, qty) {
    var base = (cost || 0) + (fixed || 0);
    var denom = 1 - ((marginPct || 0) + (feePct || 0)) / 100;
    if (!(denom > 0) || !(base >= 0)) return null;
    var price = base / denom;
    var profitUnit = price * (marginPct || 0) / 100;
    return {
      price: price,
      profitUnit: profitUnit,
      profitTotal: profitUnit * (qty || 1),
      markup: base > 0 ? profitUnit / base * 100 : 0
    };
  }

  /* ---------- Hashtags ---------- */
  var HASH_PACKS = {
    general: ['fyp', 'pourtoi', 'viral', 'africa', 'afrique', 'rdc', 'congo', 'trending', 'explore', 'reels', 'tiktokafrica', 'foryou'],
    fashion: ['mode', 'beaute', 'style', 'ootd', 'makeup', 'coiffure', 'africanfashion', 'skincare', 'glow', 'pagne', 'tendance', 'wax'],
    music: ['musique', 'rumba', 'afrobeat', 'gospel', 'amapiano', 'newmusic', 'clip', 'concert', 'studio', 'chanteur', 'piano', 'worship'],
    business: ['business', 'entrepreneur', 'entrepreneuriat', 'startup', 'marketing', 'vente', 'ecommerce', 'digitalmarketing', 'reussite', 'africabusiness', 'freelance', 'argent'],
    food: ['cuisine', 'food', 'foodie', 'recette', 'restaurant', 'africanfood', 'delicieux', 'chef', 'maisonfait', 'streetfood', 'gastronomie', 'miam'],
    fitness: ['sport', 'fitness', 'workout', 'gym', 'sante', 'motivation', 'training', 'football', 'running', 'bienetre', 'musculation', 'healthylife'],
    travel: ['voyage', 'travel', 'tourisme', 'vacances', 'nature', 'aventure', 'wanderlust', 'visitafrica', 'photography', 'paysage', 'trip', 'decouverte'],
    faith: ['foi', 'jesus', 'priere', 'gospel', 'bible', 'eglise', 'louange', 'dieu', 'verset', 'worship', 'espoir', 'benediction'],
    humor: ['humour', 'comedie', 'drole', 'rire', 'blague', 'mdr', 'comedy', 'funny', 'memes', 'sketch', 'lol', 'ambiance'],
    tech: ['tech', 'technologie', 'digital', 'innovation', 'ia', 'coding', 'startup', 'mobile', 'application', 'web', 'numerique', 'gadgets']
  };
  function slugTag(s) { return stripAccents(String(s || '')).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function makeHashtags(keyword, niche) {
    var words = stripAccents(String(keyword || '')).toLowerCase().split(/[\s,;]+/).map(slugTag).filter(Boolean);
    if (!words.length) return [];
    var joined = words.join('');
    var tags = [joined];
    if (words.length > 1) words.forEach(function (w) { if (w.length > 2) tags.push(w); });
    ['africa', 'rdc', 'life', 'tiktok', 'officiel'].forEach(function (suf) { tags.push(joined + suf); });
    (HASH_PACKS[niche] || HASH_PACKS.general).forEach(function (x) { tags.push(x); });
    HASH_PACKS.general.slice(0, 6).forEach(function (x) { tags.push(x); });
    var seen = {}, out = [];
    tags.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push('#' + x); } });
    return out.slice(0, 30);
  }

  /* ---------- Numéro WhatsApp ---------- */
  function cleanPhone(raw) {
    var s = String(raw || '').trim();
    var digits = s.replace(/\D/g, '');
    if (s.charAt(0) !== '+' && digits.indexOf('00') === 0) digits = digits.slice(2);
    if (digits.length < 8 || digits.length > 15) return null;
    if (s.charAt(0) !== '+' && digits.charAt(0) === '0') return null; // indicatif pays manquant
    return digits;
  }

  /* Export pour les tests Node, puis on s'arrête : pas de DOM. */
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { qrEncode: qrEncode, styleText: styleText, FONT_STYLES: FONT_STYLES, calcPrice: calcPrice, makeHashtags: makeHashtags, cleanPhone: cleanPhone };
    }
    return;
  }

  /* ===================================================================
     2. TEXTES (5 langues : fr, en, es, it, pt)
     =================================================================== */
  var LANGS = ['fr', 'en', 'es', 'it', 'pt'];
  var D = {
    search_ph: ['Rechercher un service, un outil…', 'Search a service or tool…', 'Buscar un servicio o herramienta…', 'Cerca un servizio o strumento…', 'Pesquisar um serviço ou ferramenta…'],
    shortcuts: ['Vos raccourcis', 'Your shortcuts', 'Tus accesos directos', 'Le tue scorciatoie', 'Seus atalhos'],
    no_result: ['Aucun résultat pour', 'No results for', 'Sin resultados para', 'Nessun risultato per', 'Nenhum resultado para'],
    tools_row: ['Boîte à outils gratuite', 'Free toolbox', 'Herramientas gratuitas', 'Strumenti gratuiti', 'Ferramentas gratuitas'],
    plans_row: ['Plans & tarifs', 'Plans & pricing', 'Planes y precios', 'Piani e prezzi', 'Planos e preços'],
    badge_free: ['Gratuit', 'Free', 'Gratis', 'Gratis', 'Grátis'],
    badge_premium: ['Gratuit + Premium', 'Free + Premium', 'Gratis + Premium', 'Gratis + Premium', 'Grátis + Premium'],
    badge_pro: ['Gratuit + Pro', 'Free + Pro', 'Gratis + Pro', 'Gratis + Pro', 'Grátis + Pro'],
    badge_paid: ['Gratuit + payant', 'Free + paid', 'Gratis + de pago', 'Gratis + a pagamento', 'Grátis + pago'],
    badge_new: ['Nouveau', 'New', 'Nuevo', 'Nuovo', 'Novo'],
    sec_business: ['Vendre & entreprendre', 'Sell & build a business', 'Vender y emprender', 'Vendere e fare impresa', 'Vender e empreender'],
    sec_jobs: ['Emploi & formation', 'Jobs & learning', 'Empleo y formación', 'Lavoro e formazione', 'Emprego e formação'],
    sec_immo: ['Immobilier & voyages', 'Real estate & travel', 'Inmobiliaria y viajes', 'Immobili e viaggi', 'Imóveis e viagens'],
    sec_community: ['Communauté & évènements', 'Community & events', 'Comunidad y eventos', 'Comunità ed eventi', 'Comunidade e eventos'],
    tools_title: ['Boîte à outils', 'Toolbox', 'Herramientas', 'Strumenti', 'Ferramentas'],
    tools_sub: ['Des outils 100 % gratuits, sans plan payant.', '100% free tools, no paid plan needed.', 'Herramientas 100 % gratuitas, sin plan de pago.', 'Strumenti 100% gratuiti, senza piano a pagamento.', 'Ferramentas 100% gratuitas, sem plano pago.'],
    promo_title: ['Passe au niveau Pro', 'Go Pro', 'Pasa al nivel Pro', 'Passa a Pro', 'Suba para o Pro'],
    promo_sub: ['Site Premium, Business Pro, campagnes de visibilité', 'Premium site, Business Pro, visibility campaigns', 'Sitio Premium, Business Pro, campañas de visibilidad', 'Sito Premium, Business Pro, campagne di visibilità', 'Site Premium, Business Pro, campanhas de visibilidade'],
    pin: ['Épingler aux raccourcis', 'Pin to shortcuts', 'Fijar en accesos directos', 'Fissa nelle scorciatoie', 'Fixar nos atalhos'],
    unpin: ['Retirer des raccourcis', 'Remove from shortcuts', 'Quitar de accesos directos', 'Rimuovi dalle scorciatoie', 'Remover dos atalhos'],
    back: ['Retour', 'Back', 'Volver', 'Indietro', 'Voltar'],
    copy: ['Copier', 'Copy', 'Copiar', 'Copia', 'Copiar'],
    copied: ['Copié ✓', 'Copied ✓', 'Copiado ✓', 'Copiato ✓', 'Copiado ✓'],
    download: ['Télécharger', 'Download', 'Descargar', 'Scarica', 'Baixar'],
    share: ['Partager', 'Share', 'Compartir', 'Condividi', 'Compartilhar'],
    open: ['Ouvrir', 'Open', 'Abrir', 'Apri', 'Abrir'],
    unavailable: ['Fonction indisponible pour le moment.', 'Feature unavailable right now.', 'Función no disponible por ahora.', 'Funzione non disponibile al momento.', 'Recurso indisponível no momento.'],

    tool_qr: ['Générateur de QR Code', 'QR Code generator', 'Generador de código QR', 'Generatore di QR Code', 'Gerador de QR Code'],
    tool_qr_d: ['Pour ton site, ton profil ou ton WhatsApp', 'For your site, profile or WhatsApp', 'Para tu sitio, perfil o WhatsApp', 'Per il tuo sito, profilo o WhatsApp', 'Para seu site, perfil ou WhatsApp'],
    tool_wa: ['Lien WhatsApp direct', 'WhatsApp direct link', 'Enlace directo de WhatsApp', 'Link diretto WhatsApp', 'Link direto do WhatsApp'],
    tool_wa_d: ['Un clic pour te contacter, message pré-rempli', 'One tap to chat, message pre-filled', 'Un toque para escribirte, mensaje prellenado', 'Un tocco per scriverti, messaggio precompilato', 'Um toque para falar, mensagem pré-preenchida'],
    tool_font: ['Texte stylé pour bio', 'Stylish bio text', 'Texto con estilo para bio', 'Testo stilizzato per bio', 'Texto estilizado para bio'],
    tool_font_d: ['Gras, cursif, bulles… pour TikTok, Instagram', 'Bold, script, bubbles… for TikTok, Instagram', 'Negrita, cursiva, burbujas… para TikTok, Instagram', 'Grassetto, corsivo, bolle… per TikTok, Instagram', 'Negrito, cursivo, bolhas… para TikTok, Instagram'],
    tool_fx: ['Convertisseur de devises', 'Currency converter', 'Conversor de divisas', 'Convertitore di valuta', 'Conversor de moedas'],
    tool_fx_d: ['USD, CDF, FCFA, EUR… taux du jour', 'USD, CDF, XOF, EUR… daily rates', 'USD, CDF, XOF, EUR… tasas del día', 'USD, CDF, XOF, EUR… tassi del giorno', 'USD, CDF, XOF, EUR… taxas do dia'],
    tool_meme: ["Générateur d'affiches", 'Poster generator', 'Generador de carteles', 'Generatore di poster', 'Gerador de cartazes'],
    tool_meme_d: ['Texte stylé sur fond noir ou sur ta photo', 'Styled text on black or on your photo', 'Texto con estilo en negro o en tu foto', 'Testo in stile su nero o sulla tua foto', 'Texto estilizado em preto ou na sua foto'],
    tool_mockup: ['Mockups produits', 'Product mockups', 'Mockups de producto', 'Mockup di prodotto', 'Mockups de produto'],
    tool_mockup_d: ['Montre tes produits sur des modèles (t-shirts, emballages)', 'Show your products on models (t-shirts, packaging)', 'Muestra tus productos en modelos (camisetas, empaques)', 'Mostra i tuoi prodotti su modelli (t-shirt, imballaggi)', 'Mostre seus produtos em modelos (camisetas, embalagens)'],
    tool_hash: ['Générateur de hashtags', 'Hashtag generator', 'Generador de hashtags', 'Generatore di hashtag', 'Gerador de hashtags'],
    tool_hash_d: ['Hashtags prêts à copier pour ta niche', 'Ready-to-copy hashtags for your niche', 'Hashtags listos para copiar', 'Hashtag pronti da copiare', 'Hashtags prontas para copiar'],
    tool_loc: ['Centre de localisation', 'Location center', 'Centro de ubicación', 'Centro di localizzazione', 'Central de localização'],
    tool_loc_d: ['Position, partage, SOS, appareil perdu', 'Position, sharing, SOS, lost device', 'Posición, compartir, SOS, dispositivo perdido', 'Posizione, condivisione, SOS, dispositivo smarrito', 'Posição, partilha, SOS, dispositivo perdido'],

    qr_text_label: ['Lien ou texte', 'Link or text', 'Enlace o texto', 'Link o testo', 'Link ou texto'],
    qr_my_profile: ['Mon profil', 'My profile', 'Mi perfil', 'Il mio profilo', 'Meu perfil'],
    qr_my_ref: ['Mon lien de parrainage', 'My referral link', 'Mi enlace de referido', 'Il mio link referral', 'Meu link de indicação'],
    qr_fg: ['Couleur du code', 'Code color', 'Color del código', 'Colore del codice', 'Cor do código'],
    qr_bg: ['Couleur du fond', 'Background color', 'Color de fondo', 'Colore di sfondo', 'Cor de fundo'],
    qr_too_long: ['Texte trop long pour un QR Code (≈ 200 caractères max).', 'Text too long for a QR Code (≈ 200 characters max).', 'Texto demasiado largo para un código QR (≈ 200 caracteres máx.).', 'Testo troppo lungo per un QR Code (≈ 200 caratteri max).', 'Texto muito longo para um QR Code (≈ 200 caracteres máx.).'],
    qr_empty: ['Saisis un lien ou un texte pour générer ton QR Code.', 'Enter a link or text to generate your QR Code.', 'Escribe un enlace o texto para generar tu código QR.', 'Inserisci un link o un testo per generare il QR Code.', 'Digite um link ou texto para gerar seu QR Code.'],
    qr_contrast: ['Pour un scan fiable, utilise une couleur foncée sur fond clair.', 'For reliable scanning, use a dark color on a light background.', 'Para un escaneo fiable, usa un color oscuro sobre fondo claro.', 'Per una scansione affidabile, usa un colore scuro su sfondo chiaro.', 'Para leitura confiável, use cor escura em fundo claro.'],

    wa_phone: ['Numéro avec indicatif pays', 'Number with country code', 'Número con prefijo de país', 'Numero con prefisso internazionale', 'Número com código do país'],
    wa_msg: ['Message pré-rempli (facultatif)', 'Pre-filled message (optional)', 'Mensaje prellenado (opcional)', 'Messaggio precompilato (facoltativo)', 'Mensagem pré-preenchida (opcional)'],
    wa_invalid: ["Numéro invalide : ajoute l'indicatif pays (ex : 243…), sans 0 au début.", 'Invalid number: add the country code (e.g. 243…), no leading 0.', 'Número no válido: añade el prefijo de país (p. ej. 243…), sin 0 inicial.', 'Numero non valido: aggiungi il prefisso internazionale (es. 243…), senza 0 iniziale.', 'Número inválido: adicione o código do país (ex.: 243…), sem 0 no início.'],
    wa_link: ['Ton lien', 'Your link', 'Tu enlace', 'Il tuo link', 'Seu link'],
    wa_make_qr: ['Créer un QR Code', 'Create a QR Code', 'Crear código QR', 'Crea QR Code', 'Criar QR Code'],

    font_ph: ['Écris ton texte ici', 'Type your text here', 'Escribe tu texto aquí', 'Scrivi qui il tuo testo', 'Escreva seu texto aqui'],
    font_note: ['Les accents sont retirés dans les styles spéciaux.', 'Accents are removed in special styles.', 'Los acentos se quitan en los estilos especiales.', 'Gli accenti vengono rimossi negli stili speciali.', 'Os acentos são removidos nos estilos especiais.'],

    fx_amount: ['Montant', 'Amount', 'Importe', 'Importo', 'Valor'],
    fx_loading: ['Chargement des taux…', 'Loading rates…', 'Cargando tasas…', 'Caricamento tassi…', 'Carregando taxas…'],
    fx_error: ['Taux indisponibles. Vérifie ta connexion.', 'Rates unavailable. Check your connection.', 'Tasas no disponibles. Revisa tu conexión.', 'Tassi non disponibili. Controlla la connessione.', 'Taxas indisponíveis. Verifique sua conexão.'],
    fx_offline: ['Taux enregistrés (hors ligne)', 'Saved rates (offline)', 'Tasas guardadas (sin conexión)', 'Tassi salvati (offline)', 'Taxas salvas (offline)'],
    fx_updated: ['Mis à jour', 'Updated', 'Actualizado', 'Aggiornato', 'Atualizado'],
    fx_indicative: ['Taux indicatifs : ceux des opérateurs peuvent différer.', 'Indicative rates: operator rates may differ.', 'Tasas indicativas: las de los operadores pueden variar.', 'Tassi indicativi: quelli degli operatori possono variare.', 'Taxas indicativas: as das operadoras podem variar.'],

    pr_cost: ["Coût d'achat (par unité)", 'Purchase cost (per unit)', 'Costo de compra (por unidad)', "Costo d'acquisto (per unità)", 'Custo de compra (por unidade)'],
    pr_fixed: ['Autres frais par unité (transport, emballage)', 'Other costs per unit (shipping, packaging)', 'Otros costos por unidad (envío, embalaje)', 'Altri costi per unità (trasporto, imballaggio)', 'Outros custos por unidade (frete, embalagem)'],
    pr_margin: ['Marge souhaitée (%)', 'Target margin (%)', 'Margen deseado (%)', 'Margine desiderato (%)', 'Margem desejada (%)'],
    pr_fee: ['Frais de paiement (%), ex. Mobile Money', 'Payment fees (%), e.g. mobile money', 'Comisión de pago (%), p. ej. dinero móvil', 'Commissioni di pagamento (%), es. mobile money', 'Taxa de pagamento (%), ex.: mobile money'],
    pr_qty: ['Quantité vendue', 'Quantity sold', 'Cantidad vendida', 'Quantità venduta', 'Quantidade vendida'],
    pr_price: ['Prix de vente conseillé', 'Recommended selling price', 'Precio de venta recomendado', 'Prezzo di vendita consigliato', 'Preço de venda recomendado'],
    pr_profit_unit: ['Bénéfice par unité', 'Profit per unit', 'Beneficio por unidad', 'Profitto per unità', 'Lucro por unidade'],
    pr_profit_total: ['Bénéfice total', 'Total profit', 'Beneficio total', 'Profitto totale', 'Lucro total'],
    pr_markup: ['Majoration sur le coût', 'Markup on cost', 'Recargo sobre el costo', 'Ricarico sul costo', 'Acréscimo sobre o custo'],
    pr_invalid: ['Marge + frais doivent rester sous 100 %.', 'Margin + fees must stay under 100%.', 'Margen + comisiones deben ser menos del 100 %.', 'Margine + commissioni devono restare sotto il 100%.', 'Margem + taxas devem ficar abaixo de 100%.'],

    hs_kw: ['Ton mot-clé (ex : mode, musique, resto)', 'Your keyword (e.g. fashion, music)', 'Tu palabra clave (p. ej. moda, música)', 'La tua parola chiave (es. moda, musica)', 'Sua palavra-chave (ex.: moda, música)'],
    hs_niche: ['Ta niche', 'Your niche', 'Tu nicho', 'La tua nicchia', 'Seu nicho'],
    hs_copy_all: ['Tout copier', 'Copy all', 'Copiar todo', 'Copia tutto', 'Copiar tudo'],
    hs_empty: ['Écris un mot-clé pour générer des hashtags.', 'Type a keyword to generate hashtags.', 'Escribe una palabra clave para generar hashtags.', 'Scrivi una parola chiave per generare hashtag.', 'Digite uma palavra-chave para gerar hashtags.'],
    n_general: ['Général', 'General', 'General', 'Generale', 'Geral'],
    n_fashion: ['Mode & beauté', 'Fashion & beauty', 'Moda y belleza', 'Moda e bellezza', 'Moda e beleza'],
    n_music: ['Musique', 'Music', 'Música', 'Musica', 'Música'],
    n_business: ['Business', 'Business', 'Negocios', 'Business', 'Negócios'],
    n_food: ['Cuisine', 'Food', 'Cocina', 'Cucina', 'Culinária'],
    n_fitness: ['Sport & forme', 'Sport & fitness', 'Deporte y forma', 'Sport e fitness', 'Esporte e fitness'],
    n_travel: ['Voyage', 'Travel', 'Viajes', 'Viaggi', 'Viagens'],
    n_faith: ['Foi', 'Faith', 'Fe', 'Fede', 'Fé'],
    n_humor: ['Humour', 'Humor', 'Humor', 'Umorismo', 'Humor'],
    n_tech: ['Tech', 'Tech', 'Tecnología', 'Tecnologia', 'Tecnologia'],

    meme_mode: ['Style', 'Style', 'Estilo', 'Stile', 'Estilo'],
    meme_mode_text: ['Fond coloré', 'Colored background', 'Fondo de color', 'Sfondo colorato', 'Fundo colorido'],
    meme_mode_photo: ['Sur une photo', 'On a photo', 'Sobre una foto', 'Su una foto', 'Sobre uma foto'],
    meme_text_label: ['Ton texte — une ligne = un bloc surligné', 'Your text — one line = one highlighted block', 'Tu texto — una línea = un bloque resaltado', 'Il tuo testo — una riga = un blocco evidenziato', 'Seu texto — uma linha = um bloco destacado'],
    meme_text_ph: ['Des fois je ne\nt\'écris pas\nokanisi sabotage', 'Sometimes I don\'t\nwrite to you\nit\'s not sabotage', 'A veces no\nte escribo\nno es sabotaje', 'A volte non\nti scrivo\nnon è sabotaggio', 'Às vezes eu não\nte escrevo\nnão é sabotagem'],
    meme_banner_label: ['Texte de la bannière (haut de l\'image)', 'Banner text (top of the image)', 'Texto del banner (arriba de la imagen)', 'Testo del banner (in alto nell\'immagine)', 'Texto do banner (topo da imagem)'],
    meme_banner_ph: ['Ce que nous traversons après…', 'What we go through after…', 'Lo que pasamos después de…', 'Quello che affrontiamo dopo…', 'O que passamos depois…'],
    meme_bg_color: ['Fond', 'Background', 'Fondo', 'Sfondo', 'Fundo'],
    meme_highlight_color: ['Surlignage', 'Highlight', 'Resaltado', 'Evidenziazione', 'Destaque'],
    meme_text_color: ['Texte', 'Text', 'Texto', 'Testo', 'Texto'],
    meme_choose_photo: ['Choisir une photo', 'Choose a photo', 'Elegir una foto', 'Scegli una foto', 'Escolher uma foto'],
    meme_change_photo: ['Changer la photo', 'Change photo', 'Cambiar foto', 'Cambia foto', 'Trocar foto'],
    meme_empty: ['Écris ton texte pour générer l\'affiche.', 'Type your text to generate the poster.', 'Escribe tu texto para generar el cartel.', 'Scrivi il tuo testo per generare il poster.', 'Escreva seu texto para gerar o cartaz.'],
    meme_photo_required: ['Choisis une photo pour ce mode.', 'Choose a photo for this mode.', 'Elige una foto para este modo.', 'Scegli una foto per questa modalità.', 'Escolha uma foto para este modo.'],
    meme_dl_name: ['affiche', 'poster', 'cartel', 'poster', 'cartaz'],

    mockup_choose_base: ['Photo de ton produit (sac, boîte, t-shirt...)', 'Photo of your product (bag, box, t-shirt...)', 'Foto de tu producto (bolsa, caja, camiseta...)', 'Foto del tuo prodotto (borsa, scatola, maglietta...)', 'Foto do teu produto (sacola, caixa, camiseta...)'],
    mockup_loading: ['Chargement des modèles...', 'Loading templates...', 'Cargando modelos...', 'Caricamento modelli...', 'Carregando modelos...'],
    mockup_pick_hint: ['Choisis un modèle professionnel, ou utilise ta propre photo.', 'Pick a professional template, or use your own photo.', 'Elige una plantilla profesional, o usa tu propia foto.', 'Scegli un modello professionale, oppure usa la tua foto.', 'Escolhe um modelo profissional, ou usa a tua própria foto.'],
    mockup_own_photo: ['Utiliser ma propre photo', 'Use my own photo', 'Usar mi propia foto', 'Usa la mia foto', 'Usar a minha foto'],
    mockup_admin_add: ['Ajouter un mockup', 'Add a mockup', 'Añadir un mockup', 'Aggiungi un mockup', 'Adicionar um mockup'],
    mockup_change_tpl: ['Autre modèle', 'Other template', 'Otra plantilla', 'Altro modello', 'Outro modelo'],
    mockup_cancel: ['Annuler', 'Cancel', 'Cancelar', 'Annulla', 'Cancelar'],
    mockup_admin_hint: ['Upload la photo du produit vierge, puis place et redimensionne le cadre à l\'endroit exact où le design devra apparaître (ex: le devant du sac, la poche du t-shirt).', 'Upload the blank product photo, then place and resize the frame exactly where the design should appear (e.g. the front of the bag, the t-shirt pocket).', 'Sube la foto del producto en blanco, luego coloca y ajusta el marco exactamente donde debe aparecer el diseño.', 'Carica la foto del prodotto vuoto, poi posiziona e ridimensiona il riquadro esattamente dove deve apparire il design.', 'Carrega a foto do produto em branco, depois posiciona e redimensiona o quadro exatamente onde o design deve aparecer.'],
    mockup_admin_name_label: ['Nom du modèle', 'Template name', 'Nombre de la plantilla', 'Nome del modello', 'Nome do modelo'],
    mockup_admin_name_ph: ['Ex: T-shirt blanc, Sac cadeau...', 'E.g: White t-shirt, Gift bag...', 'Ej: Camiseta blanca, Bolsa regalo...', 'Es: T-shirt bianca, Sacchetto regalo...', 'Ex: Camiseta branca, Saco de presente...'],
    mockup_admin_zone_hint: ['Fais glisser le cadre orange pour le positionner sur ta photo.', 'Drag the orange frame to position it on your photo.', 'Arrastra el marco naranja para colocarlo en tu foto.', 'Trascina il riquadro arancione per posizionarlo sulla tua foto.', 'Arrasta o quadro laranja para posicioná-lo na tua foto.'],
    mockup_admin_save: ['Enregistrer ce modèle', 'Save this template', 'Guardar esta plantilla', 'Salva questo modello', 'Guardar este modelo'],
    mockup_admin_saving: ['Enregistrement...', 'Saving...', 'Guardando...', 'Salvataggio...', 'A guardar...'],
    mockup_admin_need_photo: ['Ajoute une photo du produit.', 'Add a product photo.', 'Añade una foto del producto.', 'Aggiungi una foto del prodotto.', 'Adiciona uma foto do produto.'],
    mockup_admin_need_name: ['Donne un nom à ce modèle.', 'Give this template a name.', 'Dale un nombre a esta plantilla.', 'Dai un nome a questo modello.', 'Dá um nome a este modelo.'],
    mockup_admin_save_error: ['Erreur pendant l\'enregistrement.', 'Error while saving.', 'Error al guardar.', 'Errore durante il salvataggio.', 'Erro ao guardar.'],
    mockup_choose_design: ['Choisir ton design / logo', 'Choose your design / logo', 'Elegir tu diseño / logo', 'Scegli il tuo design / logo', 'Escolher seu design / logo'],
    mockup_change_design: ['Changer le design', 'Change design', 'Cambiar diseño', 'Cambia design', 'Trocar design'],
    mockup_scale: ['Taille du design', 'Design size', 'Tamaño del diseño', 'Dimensione del design', 'Tamanho do design'],
    mockup_rotation: ['Inclinaison', 'Rotation', 'Inclinación', 'Inclinazione', 'Inclinação'],
    mockup_drag_hint: ['Fais glisser le design avec le doigt pour le positionner sur ta photo.', 'Drag the design with your finger to position it on your photo.', 'Arrastra el diseño con el dedo para colocarlo en tu foto.', 'Trascina il design con il dito per posizionarlo sulla tua foto.', 'Arraste o design com o dedo para posicioná-lo na tua foto.'],
    mockup_empty_base: ["Ajoute d'abord une photo de ton produit.", 'First add a photo of your product.', 'Añade primero una foto de tu producto.', 'Aggiungi prima una foto del tuo prodotto.', 'Adiciona primeiro uma foto do teu produto.'],
    mockup_empty_design: ['Ajoute maintenant ton design / logo.', 'Now add your design / logo.', 'Ahora añade tu diseño / logo.', 'Ora aggiungi il tuo design / logo.', 'Agora adiciona o teu design / logo.'],
    mockup_dl_name: ['mockup', 'mockup', 'mockup', 'mockup', 'mockup'],
    mockup_ai_generate: ['Générer un mockup professionnel (IA)', 'Generate a professional mockup (AI)', 'Generar un mockup profesional (IA)', 'Genera un mockup professionale (IA)', 'Gerar um mockup profissional (IA)'],
    mockup_ai_loading: ['Génération en cours (10-20 sec)...', 'Generating (10-20 sec)...', 'Generando (10-20 seg)...', 'Generazione in corso (10-20 sec)...', 'Gerando (10-20 seg)...'],
    mockup_ai_hint: ['Tes {q} premières générations sont gratuites, puis {p} $ par mockup (débité de ton portefeuille).', 'Your first {q} generations are free, then {p} $ per mockup (deducted from your wallet).', 'Tus {q} primeras generaciones son gratis, luego {p} $ por mockup (de tu billetera).', 'Le tue prime {q} generazioni sono gratuite, poi {p} $ per mockup (dal tuo portafoglio).', 'As tuas {q} primeiras gerações são grátis, depois {p} $ por mockup (da tua carteira).'],
    mockup_ai_error: ["La génération a échoué. Réessaie dans un instant.", 'Generation failed. Try again in a moment.', 'La generación falló. Inténtalo de nuevo en un momento.', 'La generazione non è riuscita. Riprova tra un momento.', 'A geração falhou. Tenta novamente daqui a pouco.'],
    mockup_ai_login_needed: ['Connecte-toi pour utiliser la génération IA.', 'Log in to use AI generation.', 'Inicia sesión para usar la generación IA.', 'Accedi per usare la generazione IA.', 'Inicia sessão para usar a geração IA.'],
    mockup_ai_recharge_btn: ['Recharger mon portefeuille', 'Top up my wallet', 'Recargar mi billetera', 'Ricarica il mio portafoglio', 'Recarregar a minha carteira'],
    mockup_ai_free_left: ['générations gratuites restantes', 'free generations left', 'generaciones gratis restantes', 'generazioni gratuite rimaste', 'gerações grátis restantes'],
    mockup_ai_charged: ['0,20 $ débités de ton portefeuille pour ce mockup.', '$0.20 deducted from your wallet for this mockup.', 'Se dedujeron 0,20 $ de tu billetera por este mockup.', '0,20 $ addebitati dal tuo portafoglio per questo mockup.', '0,20 $ debitados da tua carteira para este mockup.'],
    mockup_ai_result_label: ['Mockup généré par IA', 'AI-generated mockup', 'Mockup generado por IA', 'Mockup generato dall\'IA', 'Mockup gerado por IA'],
    mockup_ai_redo: ['Repositionner et régénérer', 'Reposition and regenerate', 'Reposicionar y regenerar', 'Riposiziona e rigenera', 'Reposicionar e regerar'],

    pl_intro: ['Tout ce qui est essentiel reste gratuit. Passe à un plan payant seulement quand ton activité grandit.', 'Everything essential stays free. Upgrade only when your activity grows.', 'Lo esencial sigue siendo gratis. Mejora solo cuando tu actividad crezca.', "L'essenziale resta gratis. Passa a un piano a pagamento solo quando la tua attività cresce.", 'O essencial continua grátis. Faça upgrade só quando sua atividade crescer.'],
    pl_free: ['Gratuit pour tous', 'Free for everyone', 'Gratis para todos', 'Gratis per tutti', 'Grátis para todos'],
    pl_f1: ['Commandes réseaux sociaux, portefeuille, parrainage', 'Social media orders, wallet, referrals', 'Pedidos de redes sociales, billetera, referidos', 'Ordini social, portafoglio, referral', 'Pedidos de redes sociais, carteira, indicações'],
    pl_f2: ['Publications, stories, abonnés et boutique', 'Posts, stories, followers and shop', 'Publicaciones, historias, seguidores y tienda', 'Post, storie, follower e negozio', 'Publicações, stories, seguidores e loja'],
    pl_f3: ['Ton mini-site et ta fiche entreprise de base', 'Your mini-site and basic business page', 'Tu mini sitio y ficha de empresa básica', 'Il tuo mini-sito e la scheda azienda base', 'Seu mini-site e página de empresa básica'],
    pl_f4: ['Emploi, immobilier, voyages, réservation, alertes, factures', 'Jobs, real estate, travel, booking, alerts, invoices', 'Empleo, inmobiliaria, viajes, reservas, alertas, facturas', 'Lavoro, immobili, viaggi, prenotazioni, avvisi, fatture', 'Emprego, imóveis, viagens, reservas, alertas, faturas'],
    pl_f5: ['Toute la boîte à outils', 'The whole toolbox', 'Todas las herramientas', 'Tutti gli strumenti', 'Todas as ferramentas'],
    per_month: ['/ mois', '/ month', '/ mes', '/ mese', '/ mês'],
    pl_photos: ['Photos du site', 'Site photos', 'Fotos del sitio', 'Foto del sito', 'Fotos do site'],
    pl_catalog: ['Produits au catalogue', 'Catalog products', 'Productos en catálogo', 'Prodotti a catalogo', 'Produtos no catálogo'],
    pl_coupons: ['Coupons promo', 'Promo coupons', 'Cupones promo', 'Coupon promo', 'Cupons promo'],
    pl_clients: ['Clients suivis (CRM)', 'Tracked clients (CRM)', 'Clientes en seguimiento (CRM)', 'Clienti seguiti (CRM)', 'Clientes acompanhados (CRM)'],
    pl_campaigns: ['Campagnes de visibilité (boost, bannière, promo) dès 2 $', 'Visibility campaigns (boost, banner, promo) from $2', 'Campañas de visibilidad (boost, banner, promo) desde 2 $', 'Campagne di visibilità (boost, banner, promo) da 2 $', 'Campanhas de visibilidade (boost, banner, promo) a partir de 2 $'],
    pl_cta_site: ['Activer Premium', 'Get Premium', 'Activar Premium', 'Attiva Premium', 'Ativar Premium'],
    pl_cta_biz: ['Activer Pro', 'Get Pro', 'Activar Pro', 'Attiva Pro', 'Ativar Pro'],
    pl_pay: ['Recharge ton portefeuille par Mobile Money, crypto ou carte, puis active le plan en un tap.', 'Top up your wallet with mobile money, crypto or card, then activate a plan in one tap.', 'Recarga tu billetera con dinero móvil, cripto o tarjeta y activa el plan con un toque.', 'Ricarica il portafoglio con mobile money, crypto o carta e attiva il piano con un tocco.', 'Recarregue a carteira com mobile money, cripto ou cartão e ative o plano com um toque.'],
    pl_cta_wallet: ['Recharger mon portefeuille', 'Top up my wallet', 'Recargar mi billetera', 'Ricarica portafoglio', 'Recarregar carteira'],
    unlimited_short: ['illimité', 'unlimited', 'ilimitado', 'illimitato', 'ilimitado']
  };

  function curLang() {
    try { if (typeof currentLang !== 'undefined' && currentLang) return currentLang; } catch (e) { /* ignore */ }
    return 'fr';
  }
  function L(key) {
    var a = D[key];
    if (!a) return key;
    var i = LANGS.indexOf(curLang());
    if (i < 0) i = 1;
    return a[i] || a[1] || a[0];
  }
  function TT(key) { // clés existantes de translations.js
    try { if (typeof t === 'function') return t(key); } catch (e) { /* ignore */ }
    return key;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return stripAccents(String(s || '')).toLowerCase(); }
  function call(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (typeof root[name] === 'function') return root[name].apply(null, args);
    toast(L('unavailable'));
  }
  function toast(msg, type) {
    try { if (typeof showToast === 'function') { showToast(msg, type || 'info'); return; } } catch (e) { /* ignore */ }
  }
  function getUser() {
    try { if (typeof currentUser !== 'undefined') return currentUser; } catch (e) { /* ignore */ }
    return null;
  }
  function $(id) { return document.getElementById(id); }

  /* ===================================================================
     3. ICÔNES
     =================================================================== */
  var ICONS = {
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2Z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="7" x2="9" y2="7.01"/><line x1="15" y1="7" x2="15" y2="7.01"/><line x1="9" y1="11" x2="9" y2="11.01"/><line x1="15" y1="11" x2="15" y2="11.01"/><path d="M10 22v-4h4v4"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    home: '<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
    plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    pin: '<path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><line x1="13" y1="5" x2="13" y2="19" stroke-dasharray="2 2"/>',
    trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    network: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    bookmark: '<path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2v-.5a2 2 0 0 1 2-2h2a4 4 0 0 0 4-4A10 10 0 0 0 12 2Z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    meme: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><rect x="6.5" y="7.6" width="11" height="3.1" rx="1" fill="#1a1a1a" stroke="none"/><rect x="6.5" y="13.3" width="7" height="3.1" rx="1" fill="#1a1a1a" stroke="none"/>',
    mockup: '<path d="M9 3 5 6l2 4 2-1.4V21h6V8.6L17 10l2-4-4-3q-1.6 2-3 2t-3-2Z"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    globe2: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    exchange: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/><line x1="8" y1="19" x2="12" y2="19"/>',
    hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    crown: '<path d="M2 20h20"/><path d="M4 20 2 7l6 5 4-8 4 8 6-5-2 13"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    tools: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    chevronR: '<polyline points="9 18 15 12 9 6"/>',
    chevronL: '<polyline points="15 18 9 12 15 6"/>',
    swap: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>'
  };
  function svg(name, size) {
    size = size || 22;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.star) + '</svg>';
  }
  function ico(entry, size) {
    return '<span class="mp-ico" style="background:linear-gradient(145deg,' + entry.c[0] + ',' + entry.c[1] + ')">' + svg(entry.ic, size || 22) + '</span>';
  }

  /* ===================================================================
     4. CATALOGUE DES ENTRÉES (services, outils, raccourcis, réglages)
     =================================================================== */
  var ENTRIES = [
    // ---- Services (grille du hub) ----
    { id: 'pro', grp: 'service', sec: 'business', tk: 'svc_pro', ic: 'wrench', c: ['#ff922b', '#e8590c'], b: 'free', fn: 'openServiceRequestScreen', kw: 'professionnel artisan freelance devis prestataire service provider quote hire' },
    { id: 'site', grp: 'service', sec: 'business', tk: 'svc_site', ic: 'globe', c: ['#4dabf7', '#1971c2'], b: 'premium', fn: 'openSiteBuilderScreen', kw: 'site web mini site vitrine page website landing creer' },
    { id: 'business', grp: 'service', sec: 'business', tk: 'svc_business', ic: 'building', c: ['#9775fa', '#6741d9'], b: 'pro', fn: 'openBusinessScreen', kw: 'entreprise societe commerce catalogue coupon clients company shop crm' },
    { id: 'invoices', grp: 'service', sec: 'business', tk: 'svc_invoices', ic: 'file', c: ['#38d9a9', '#0ca678'], b: 'free', fn: 'openInvoiceScreen', kw: 'facture recu devis invoice receipt pdf' },
    { id: 'jobs', grp: 'service', sec: 'jobs', tk: 'svc_jobs', ic: 'briefcase', c: ['#ffd43b', '#f08c00'], b: 'free', fn: 'openJobsScreen', kw: 'emploi travail freelance offre cv job work hiring recrutement' },
    { id: 'academy', grp: 'service', sec: 'jobs', tk: 'svc_academy', ic: 'cap', c: ['#748ffc', '#3b5bdb'], b: 'paid', fn: 'openAcademyScreen', kw: 'academie formation cours apprendre course learn training ecole' },
    { id: 'immo', grp: 'service', sec: 'immo', tk: 'svc_immo', ic: 'home', c: ['#f783ac', '#d6336c'], b: 'free', fn: 'openImmoScreen', kw: 'immobilier maison terrain louer vendre appartement real estate rent house' },
    { id: 'travel', grp: 'service', sec: 'immo', tk: 'svc_travel', ic: 'plane', c: ['#3bc9db', '#1098ad'], b: 'free', fn: 'openTravelScreen', kw: 'voyage tourisme lieux vacances travel tourism trip' },
    { id: 'booking', grp: 'service', sec: 'immo', tk: 'svc_booking', ic: 'calendar', c: ['#faa2c1', '#e64980'], b: 'free', fn: 'openBookingScreen', kw: 'reservation rendez-vous booking appointment' },
    { id: 'nearby', grp: 'service', sec: 'immo', tk: 'svc_nearby', ic: 'pin', c: ['#69db7c', '#2f9e44'], b: 'free', fn: 'openNearbyScreen', kw: 'pres proche autour carte nearby map local' },
    { id: 'events', grp: 'service', sec: 'community', tk: 'svc_events', ic: 'ticket', c: ['#da77f2', '#ae3ec9'], b: 'paid', fn: 'openEventsScreen', kw: 'evenement billet billetterie concert event ticket' },
    { id: 'contests', grp: 'service', sec: 'community', tk: 'svc_contests', ic: 'trophy', c: ['#ffa94d', '#f76707'], b: 'paid', fn: 'openContestsScreen', kw: 'concours recompense jeu prix contest reward prize' },
    { id: 'alerts', grp: 'service', sec: 'community', tk: 'svc_alerts', ic: 'bell', c: ['#ff8787', '#e03131'], b: 'free', fn: 'openAlertsScreen', kw: 'alerte avis perdu objet alert notice' },

    // ---- Boîte à outils (100 % gratuite) ----
    { id: 't_qr', grp: 'tool', lk: 'tool_qr', dk: 'tool_qr_d', ic: 'qr', c: ['#495057', '#212529'], b: 'new', tool: 'qr', kw: 'qr code scan lien link' },
    { id: 't_wa', grp: 'tool', lk: 'tool_wa', dk: 'tool_wa_d', ic: 'chat', c: ['#40c057', '#2b8a3e'], b: 'new', tool: 'wa', kw: 'whatsapp wa.me contact message lien' },
    { id: 't_font', grp: 'tool', lk: 'tool_font', dk: 'tool_font_d', ic: 'type', c: ['#f06595', '#c2255c'], b: 'new', tool: 'font', kw: 'texte style police bio gras cursif font fancy instagram tiktok' },
    { id: 't_fx', grp: 'tool', lk: 'tool_fx', dk: 'tool_fx_d', ic: 'exchange', c: ['#15aabf', '#0b7285'], b: 'new', tool: 'fx', kw: 'devise change taux dollar franc cdf fcfa euro currency exchange convert' },
    { id: 't_meme', grp: 'tool', lk: 'tool_meme', dk: 'tool_meme_d', ic: 'meme', c: ['#ffd43b', '#f2b600'], b: 'new', tool: 'meme', kw: 'affiche citation texte image meme generateur photo jaune noir poster quote' },
    { id: 't_mockup', grp: 'tool', lk: 'tool_mockup', dk: 'tool_mockup_d', ic: 'mockup', c: ['#6c5ce7', '#4b3fb0'], b: 'new', tool: 'mockup', kw: 'mockup produit t-shirt tshirt emballage packaging design vetement pochette sachet' },
    { id: 't_hash', grp: 'tool', lk: 'tool_hash', dk: 'tool_hash_d', ic: 'hash', c: ['#7950f2', '#5f3dc4'], b: 'new', tool: 'hash', kw: 'hashtag tags tiktok instagram viral' },
    { id: 't_loc', grp: 'tool', lk: 'tool_loc', dk: 'tool_loc_d', ic: 'locate', c: ['#f76707', '#c92a2a'], b: 'new', tool: 'loc', kw: 'localisation position gps sos urgence carte partage appareil perdu telephone retrouver location map emergency find phone lost' },

    // ---- Accès rapides de l'application ----
    { id: 'wallet', grp: 'core', tk: 'tab_wallet', ic: 'wallet', c: ['#20c997', '#087f5b'], go: function () { call('closeMainMenu'); call('showDashTab', 'wallet'); }, kw: 'portefeuille recharge solde argent mobile money crypto carte wallet balance top up deposit' },
    { id: 'shop', grp: 'core', tk: 'shop_title', ic: 'bag', c: ['#ff6b6b', '#c92a2a'], go: function () { call('closeMainMenu'); call('showShop'); }, kw: 'boutique acheter vendre produits shop buy sell marketplace' },
    { id: 'network', grp: 'core', tk: 'tab_network', ic: 'network', c: ['#339af0', '#1864ab'], go: function () { call('closeMainMenu'); call('showDashTab', 'orders'); }, kw: 'reseau commande booster followers likes vues abonnes order boost smm' },
    { id: 'referral', grp: 'core', tk: 'menu_referral', ic: 'gift', c: ['#f783ac', '#a61e4d'], acc: 'section-referral', kw: 'parrainage commission inviter amis referral invite earn' },
    { id: 'saved', grp: 'core', tk: 'menu_saved', ic: 'bookmark', c: ['#845ef7', '#5f3dc4'], acc: 'section-saved', kw: 'enregistres favoris sauvegardes saved bookmarks' },

    // ---- Réglages et aide (recherche seulement) ----
    { id: 's_security', grp: 'setting', tk: 'menu_security', ic: 'shield', c: ['#868e96', '#495057'], acc: 'section-security', kw: 'securite mot de passe password security' },
    { id: 's_notif', grp: 'setting', tk: 'menu_notifications', ic: 'bell', c: ['#868e96', '#495057'], acc: 'section-notifprefs', kw: 'notifications alertes push' },
    { id: 's_look', grp: 'setting', tk: 'menu_appearance', ic: 'palette', c: ['#868e96', '#495057'], acc: 'section-appearance', kw: 'apparence theme sombre dark mode taille texte' },
    { id: 's_lang', grp: 'setting', tk: 'menu_language', ic: 'globe2', c: ['#868e96', '#495057'], acc: 'section-language', kw: 'langue language francais english espanol italiano portugues' },
    { id: 's_account', grp: 'setting', tk: 'menu_account', ic: 'user', c: ['#868e96', '#495057'], acc: 'section-editaccount', kw: 'compte profil nom photo account edit' },
    { id: 's_privacy', grp: 'setting', tk: 'menu_privacy', ic: 'ban', c: ['#868e96', '#495057'], acc: 'section-blocked', kw: 'confidentialite bloques privacy blocked' },
    { id: 's_faq', grp: 'setting', tk: 'menu_faq', ic: 'help', c: ['#868e96', '#495057'], acc: 'section-faq', kw: 'aide faq questions help' },
    { id: 's_support', grp: 'setting', tk: 'menu_support', ic: 'chat', c: ['#868e96', '#495057'], acc: 'section-contact', kw: 'assistance support contact aide' },
    { id: 's_about', grp: 'setting', tk: 'menu_about', ic: 'info', c: ['#868e96', '#495057'], acc: 'section-about', kw: 'a propos about coeurnoh' },
    { id: 's_share', grp: 'setting', tk: 'menu_share', ic: 'share', c: ['#868e96', '#495057'], acc: 'section-share', kw: 'partager application share app invite' },

    // ---- Écrans du menu ----
    { id: 'toolbox', grp: 'meta', lk: 'tools_row', ic: 'tools', c: ['#12b886', '#0b7285'], go: function () { openToolsScreen(); }, kw: 'outils boite tools toolbox gratuit free' },
    { id: 'plans', grp: 'meta', lk: 'plans_row', ic: 'crown', c: ['#fcc419', '#e67700'], go: function () { openPlansScreen(); }, kw: 'plans tarifs prix premium pro abonnement pricing upgrade payant gratuit' }
  ];
  var BY_ID = {};
  ENTRIES.forEach(function (e) { BY_ID[e.id] = e; });

  function labelOf(e) { return e.tk ? TT(e.tk) : L(e.lk); }
  function badgeHtml(kind) {
    if (!kind) return '';
    return '<em class="mp-badge mp-b-' + kind + '">' + esc(L('badge_' + kind)) + '</em>';
  }
  function runEntry(e) {
    if (!e) return;
    if (e.tool) { openTool(e.tool); return; }
    if (e.go) { e.go(); return; }
    if (e.acc) { call('goToAccountSection', e.acc); return; }
    if (e.fn) { call(e.fn); return; }
  }

  /* ===================================================================
     5. RACCOURCIS ÉPINGLABLES (stockés sur l'appareil)
     =================================================================== */
  var PINS_KEY = 'cn_menu_pins_v1';
  var DEFAULT_PINS = ['wallet', 'shop', 'network', 'site', 'business', 'toolbox', 'referral', 'saved'];
  var MAX_PINS = 8;

  function getPins() {
    try {
      var raw = localStorage.getItem(PINS_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter(function (id) { return BY_ID[id]; }).slice(0, MAX_PINS);
      }
    } catch (e) { /* localStorage indisponible */ }
    return DEFAULT_PINS.slice();
  }
  function setPins(arr) {
    try { localStorage.setItem(PINS_KEY, JSON.stringify(arr.slice(0, MAX_PINS))); } catch (e) { /* ignore */ }
  }
  function togglePin(id) {
    var pins = getPins();
    var i = pins.indexOf(id);
    if (i >= 0) pins.splice(i, 1);
    else { pins.unshift(id); if (pins.length > MAX_PINS) pins.length = MAX_PINS; }
    setPins(pins);
    renderShortcuts();
    renderHub();
    renderToolsList();
  }

  /* ===================================================================
     6. AMÉLIORATION DU MENU (injection dans le DOM existant)
     =================================================================== */
  var enhanced = false;

  function backHeader(target, titleId) {
    return '<div class="menu-page-header">' +
      '<button class="menu-back-btn" type="button" data-mp-back="' + target + '" aria-label="' + esc(L('back')) + '">' + svg('chevronL', 20) + '</button>' +
      '<h2' + (titleId ? ' id="' + titleId + '"' : '') + '></h2></div>';
  }

  function enhanceMenu() {
    if (enhanced) return;
    var panel = document.querySelector('#main-menu-modal .main-menu-panel');
    var cat = $('menu-screen-categories');
    var services = $('menu-screen-items-services');
    if (!panel || !cat || !services) return;

    // 6a. Écran d'accueil du menu : recherche + raccourcis + promo
    var card = cat.querySelector('.menu-card');
    var logoutBtn = cat.querySelector(':scope > .btn.btn-outline');
    var profile = $('menu-profile-card');
    if (card) card.classList.add('mp-collapsible');
    if (logoutBtn) logoutBtn.classList.add('mp-collapsible');

    var block = document.createElement('div');
    block.innerHTML =
      '<div class="mp-search-wrap">' + svg('search', 18) +
      '<input type="search" id="mp-search" class="mp-search-input" autocomplete="off" enterkeyhint="search"></div>' +
      '<div id="mp-search-results" class="hidden"></div>' +
      '<div id="mp-home-blocks" class="mp-collapsible">' +
      '<div class="mp-section-title" id="mp-shortcuts-title"></div>' +
      '<div class="mp-shortcuts" id="mp-shortcuts"></div>' +
      '<button type="button" class="mp-promo" id="mp-promo">' +
      '<span class="mp-ico">' + svg('crown', 22) + '</span>' +
      '<span class="mp-promo-text"><div class="mp-promo-title" id="mp-promo-title"></div><div class="mp-promo-sub" id="mp-promo-sub"></div></span>' +
      '<svg class="menu-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS.chevronR + '</svg>' +
      '</button></div>';
    var anchor = card || logoutBtn;
    while (block.firstChild) {
      if (anchor) cat.insertBefore(block.firstChild, anchor);
      else cat.appendChild(block.firstChild);
    }
    // (les nœuds sont insérés avant la carte des catégories, après la carte profil)
    if (profile && profile.nextSibling && card) { /* ordre déjà correct */ }

    // 6b. Deux lignes de plus dans la carte des catégories
    if (card) {
      var rows = card.querySelectorAll('.menu-category-row');
      var ref = rows.length >= 3 ? rows[3] : null; // avant "Aide & informations"
      var extra = [
        { id: 'toolbox', lab: 'mp-row-tools' },
        { id: 'plans', lab: 'mp-row-plans' }
      ];
      extra.forEach(function (x) {
        var e = BY_ID[x.id];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'menu-category-row';
        btn.setAttribute('data-mp-row', x.id);
        btn.innerHTML = svg(e.ic, 22) + '<span id="' + x.lab + '"></span>' +
          '<em class="mp-badge mp-b-' + (x.id === 'toolbox' ? 'new' : 'premium') + '" id="' + x.lab + '-badge"></em>' +
          '<svg class="menu-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS.chevronR + '</svg>';
        if (ref) card.insertBefore(btn, ref); else card.appendChild(btn);
      });
    }

    // 6c. Hub "Services" : on masque l'ancienne liste, on ajoute la grille
    var hub = document.createElement('div');
    hub.id = 'mp-services-hub';
    var header = services.querySelector('.menu-page-header');
    if (header && header.nextSibling) services.insertBefore(hub, header.nextSibling);
    else services.appendChild(hub);
    services.classList.add('mp-enhanced');
    Array.prototype.forEach.call(services.children, function (child) {
      if (child === header || child === hub) return;
      child.classList.add('mp-legacy');
      child.style.display = 'none';
    });

    // 6d. Nouveaux écrans : boîte à outils, outil, plans
    var screens = document.createElement('div');
    screens.innerHTML =
      '<div id="menu-screen-tools" class="hidden">' + backHeader('categories', 'mp-tools-title') +
      '<p class="mp-intro" id="mp-tools-sub"></p><div class="mp-grid" id="mp-tools-list"></div></div>' +
      '<div id="menu-screen-tool" class="hidden">' + backHeader('tools', 'mp-tool-title') + '<div id="mp-tool-body"></div></div>' +
      '<div id="menu-screen-plans" class="hidden">' + backHeader('categories', 'mp-plans-title') + '<div id="mp-plans-body"></div></div>';
    while (screens.firstChild) panel.appendChild(screens.firstChild);

    // 6e. Événements (délégation : un seul écouteur par zone)
    var input = $('mp-search');
    input.addEventListener('input', onSearchInput);
    $('mp-promo').addEventListener('click', openPlansScreen);
    cat.addEventListener('click', function (ev) {
      var row = ev.target.closest ? ev.target.closest('[data-mp-row]') : null;
      if (row) runEntry(BY_ID[row.getAttribute('data-mp-row')]);
    });
    $('mp-shortcuts').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-id]') : null;
      if (b) runEntry(BY_ID[b.getAttribute('data-id')]);
    });
    $('mp-search-results').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-id]') : null;
      if (b) runEntry(BY_ID[b.getAttribute('data-id')]);
    });
    bindGrid($('mp-services-hub'));
    bindGrid($('mp-tools-list'));
    panel.addEventListener('click', function (ev) {
      var back = ev.target.closest ? ev.target.closest('[data-mp-back]') : null;
      if (back) call('showMenuScreen', back.getAttribute('data-mp-back'));
    });

    enhanced = true;
  }

  function bindGrid(el) {
    if (!el) return;
    el.addEventListener('click', function (ev) {
      var pin = ev.target.closest ? ev.target.closest('[data-pin]') : null;
      if (pin) { ev.stopPropagation(); togglePin(pin.getAttribute('data-pin')); return; }
      var tile = ev.target.closest ? ev.target.closest('.mp-tile') : null;
      if (tile) runEntry(BY_ID[tile.getAttribute('data-id')]);
    });
    el.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var tile = ev.target.classList && ev.target.classList.contains('mp-tile') ? ev.target : null;
      if (tile) { ev.preventDefault(); runEntry(BY_ID[tile.getAttribute('data-id')]); }
    });
  }

  /* ---------- Rendus ---------- */
  function renderShortcuts() {
    var el = $('mp-shortcuts');
    if (!el) return;
    el.innerHTML = getPins().map(function (id) {
      var e = BY_ID[id];
      return '<button type="button" class="mp-short" data-id="' + e.id + '">' + ico(e, 22) +
        '<span class="mp-short-label">' + esc(labelOf(e)) + '</span></button>';
    }).join('');
  }

  function tileHtml(e, showDesc) {
    var pinned = getPins().indexOf(e.id) >= 0;
    return '<div class="mp-tile" role="button" tabindex="0" data-id="' + e.id + '">' +
      '<button type="button" class="mp-pin' + (pinned ? ' on' : '') + '" data-pin="' + e.id + '" aria-label="' + esc(L(pinned ? 'unpin' : 'pin')) + '">' + svg('star', 16) + '</button>' +
      ico(e, 22) +
      '<span class="mp-tile-label">' + esc(labelOf(e)) + '</span>' +
      (showDesc && e.dk ? '<span class="mp-tile-desc">' + esc(L(e.dk)) + '</span>' : '') +
      badgeHtml(e.b) + '</div>';
  }

  function renderHub() {
    var el = $('mp-services-hub');
    if (!el) return;
    var secs = ['business', 'jobs', 'immo', 'community'];
    el.innerHTML = secs.map(function (s) {
      var items = ENTRIES.filter(function (e) { return e.grp === 'service' && e.sec === s; });
      return '<div class="mp-hub-section"><div class="mp-section-title">' + esc(L('sec_' + s)) + '</div>' +
        '<div class="mp-grid">' + items.map(function (e) { return tileHtml(e, false); }).join('') + '</div></div>';
    }).join('');
  }

  function renderToolsList() {
    var el = $('mp-tools-list');
    if (!el) return;
    el.innerHTML = ENTRIES.filter(function (e) { return e.grp === 'tool'; }).map(function (e) { return tileHtml(e, true); }).join('');
  }

  function renderChrome() {
    var s = $('mp-search'); if (s) s.placeholder = L('search_ph');
    var st = $('mp-shortcuts-title'); if (st) st.textContent = L('shortcuts');
    var pt = $('mp-promo-title'); if (pt) pt.textContent = L('promo_title');
    var ps = $('mp-promo-sub'); if (ps) ps.textContent = L('promo_sub');
    var a = $('mp-row-tools'); if (a) a.textContent = L('tools_row');
    var ab = $('mp-row-tools-badge'); if (ab) ab.textContent = L('badge_new');
    var b = $('mp-row-plans'); if (b) b.textContent = L('plans_row');
    var bb = $('mp-row-plans-badge'); if (bb) bb.textContent = L('badge_premium').replace(/^.*\+\s*/, '') + ' / Pro';
    var tt = $('mp-tools-title'); if (tt) tt.textContent = L('tools_title');
    var ts = $('mp-tools-sub'); if (ts) ts.textContent = L('tools_sub');
    var pl = $('mp-plans-title'); if (pl) pl.textContent = L('plans_row');
  }

  function refresh() {
    if (!enhanced) return;
    var input = $('mp-search');
    if (input) input.value = '';
    var cat = $('menu-screen-categories');
    if (cat) cat.classList.remove('mp-searching');
    var res = $('mp-search-results');
    if (res) { res.classList.add('hidden'); res.innerHTML = ''; }
    renderChrome();
    renderShortcuts();
    renderHub();
    renderToolsList();
  }

  /* ---------- Recherche ---------- */
  function onSearchInput() {
    var q = norm($('mp-search').value.trim());
    var cat = $('menu-screen-categories');
    var res = $('mp-search-results');
    if (!q) {
      cat.classList.remove('mp-searching');
      res.classList.add('hidden');
      res.innerHTML = '';
      return;
    }
    cat.classList.add('mp-searching');
    var found = ENTRIES.filter(function (e) {
      return norm(labelOf(e) + ' ' + (e.dk ? L(e.dk) : '') + ' ' + e.kw).indexOf(q) >= 0;
    }).sort(function (a, b) {
      var an = norm(labelOf(a)).indexOf(q) === 0 ? 0 : 1;
      var bn = norm(labelOf(b)).indexOf(q) === 0 ? 0 : 1;
      return an - bn;
    });
    res.classList.remove('hidden');
    if (!found.length) {
      res.innerHTML = '<div class="mp-empty">' + esc(L('no_result')) + ' «&nbsp;' + esc($('mp-search').value.trim()) + '&nbsp;»</div>';
      return;
    }
    res.innerHTML = '<div class="mp-rows">' + found.map(function (e) {
      var desc = e.dk ? '<span class="mp-row-desc">' + esc(L(e.dk)) + '</span>' : '';
      return '<button type="button" class="mp-row" data-id="' + e.id + '">' + ico(e, 20) +
        '<span class="mp-row-label">' + esc(labelOf(e)) + desc + '</span>' + badgeHtml(e.b) + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- Ouverture d'écrans ---------- */
  function ensureMenuOpen() {
    var modal = $('main-menu-modal');
    if (modal && modal.classList.contains('hidden')) call('openMainMenu');
  }
  function openToolsScreen() {
    if (!enhanced) return;
    renderChrome(); renderToolsList();
    call('showMenuScreen', 'tools');
  }
  function openPlansScreen() {
    if (!enhanced) return;
    renderChrome(); renderPlans();
    call('showMenuScreen', 'plans');
  }

  /* ===================================================================
     7. PLANS & TARIFS (lit les vraies constantes de script.js)
     =================================================================== */
  // Lecture des constantes de script.js (déclarées avec const : accessibles
  // par leur nom, pas via window). Pas d'eval : la CSP du site l'interdit.
  function num(read, fallback) {
    try {
      var v = read();
      return (typeof v === 'number' && !isNaN(v)) ? v : fallback;
    } catch (e) { return fallback; }
  }
  function fmtLimit(n) { return (n === Infinity) ? L('unlimited_short') : n; }
  function renderPlans() {
    var body = $('mp-plans-body');
    if (!body) return;
    var sitePrice = num(function () { return SITE_PREMIUM_PRICE; }, 5);
    var bizPrice = num(function () { return BUSINESS_PRO_PRICE; }, 15);
    var photosF = num(function () { return SITE_FREE_PHOTO_LIMIT; }, 6), photosP = num(function () { return SITE_PREMIUM_PHOTO_LIMIT; }, 15);
    var catF = num(function () { return BUSINESS_FREE_CATALOG_LIMIT; }, 6), catP = num(function () { return BUSINESS_PRO_CATALOG_LIMIT; }, 30);
    var coupF = num(function () { return BUSINESS_FREE_COUPON_LIMIT; }, 1), coupP = num(function () { return BUSINESS_PRO_COUPON_LIMIT; }, 10);
    var cliF = num(function () { return BUSINESS_FREE_CLIENT_LIMIT; }, 20), cliP = num(function () { return BUSINESS_PRO_CLIENT_LIMIT; }, 300);

    function li(text, val) {
      return '<li>' + svg('check', 16) + '<span>' + esc(text) + '</span>' + (val ? '<b>' + esc(val) + '</b>' : '') + '</li>';
    }
    body.innerHTML =
      '<p class="mp-intro">' + esc(L('pl_intro')) + '</p>' +

      '<div class="mp-plan"><div class="mp-plan-head"><span class="mp-plan-name">' + esc(L('pl_free')) + '</span>' +
      '<em class="mp-badge mp-b-free">0 $</em></div><ul class="mp-plan-list">' +
      li(L('pl_f1')) + li(L('pl_f2')) + li(L('pl_f3')) + li(L('pl_f4')) + li(L('pl_f5')) + '</ul></div>' +

      '<div class="mp-plan mp-plan-premium"><div class="mp-plan-head"><span class="mp-plan-name">Pack Site Professionnel</span>' +
      '<span class="mp-plan-price">' + sitePrice + ' $ <small>' + esc(L('per_month')) + '</small></span></div><ul class="mp-plan-list">' +
      li(L('pl_photos'), photosF + ' → ' + fmtLimit(photosP)) + '</ul>' +
      '<button type="button" class="btn btn-primary" id="mp-cta-site">' + esc(L('pl_cta_site')) + '</button></div>' +

      '<div class="mp-plan mp-plan-pro"><div class="mp-plan-head"><span class="mp-plan-name">Business Pro</span>' +
      '<span class="mp-plan-price">' + bizPrice + ' $ <small>' + esc(L('per_month')) + '</small></span></div><ul class="mp-plan-list">' +
      li(L('pl_catalog'), catF + ' → ' + catP) + li(L('pl_coupons'), coupF + ' → ' + coupP) + li(L('pl_clients'), cliF + ' → ' + cliP) +
      li(L('pl_campaigns')) + '</ul>' +
      '<button type="button" class="btn btn-primary" id="mp-cta-biz">' + esc(L('pl_cta_biz')) + '</button></div>' +

      '<p class="mp-hint">' + esc(L('pl_pay')) + '</p>' +
      '<button type="button" class="btn btn-outline" style="width:100%" id="mp-cta-wallet">' + esc(L('pl_cta_wallet')) + '</button>';

    $('mp-cta-site').addEventListener('click', function () { call('openSiteBuilderScreen'); });
    $('mp-cta-biz').addEventListener('click', function () { call('openBusinessScreen'); });
    $('mp-cta-wallet').addEventListener('click', function () { call('closeMainMenu'); call('showDashTab', 'wallet'); });
  }

  /* ===================================================================
     8. OUTILS
     =================================================================== */
  function copyText(text, btn) {
    function done() {
      if (!btn) { toast(L('copied'), 'success'); return; }
      var old = btn.textContent;
      btn.textContent = L('copied');
      btn.classList.add('done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1400);
    }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (e) { toast(L('unavailable')); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  var TOOL_TITLE = { qr: 'tool_qr', wa: 'tool_wa', font: 'tool_font', fx: 'tool_fx', meme: 'tool_meme', mockup: 'tool_mockup', hash: 'tool_hash', loc: 'tool_loc' };
  var pendingQrText = '';

  /* ---------- Centre de localisation (module chargé à la demande) ---------- */
  var locLoading = false;
  function withLocationModule(cb) {
    if (root.LocationCenter) { cb(root.LocationCenter); return; }
    if (locLoading) return;
    locLoading = true;
    var s = document.createElement('script');
    s.src = 'location-center.js';
    s.onload = function () { locLoading = false; if (root.LocationCenter) cb(root.LocationCenter); };
    s.onerror = function () { locLoading = false; toast(L('unavailable')); };
    document.head.appendChild(s);
  }
  function openLocationCenter(tab) { withLocationModule(function (lc) { lc.open(tab); }); }

  function openTool(id) {
    if (id === 'loc') { openLocationCenter(); return; }
    if (!enhanced) return;
    ensureMenuOpen();
    call('showMenuScreen', 'tool');
    var title = $('mp-tool-title'); if (title) title.textContent = L(TOOL_TITLE[id] || 'tools_title');
    var body = $('mp-tool-body');
    body.innerHTML = '';
    var builders = { qr: buildQr, wa: buildWa, font: buildFont, fx: buildFx, meme: buildMeme, mockup: buildMockup, hash: buildHash };
    try { if (builders[id]) builders[id](body); }
    catch (e) { console.warn('[menu-pro] outil', id, e); body.innerHTML = '<div class="mp-empty">' + esc(L('unavailable')) + '</div>'; }
    var panel = document.querySelector('#main-menu-modal .main-menu-panel');
    if (panel) panel.scrollTop = 0;
  }

  /* ---------- QR Code ---------- */
  function luminance(hex) {
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var r = parseInt(h.slice(0, 2), 16) || 0, g = parseInt(h.slice(2, 4), 16) || 0, b = parseInt(h.slice(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  function drawQr(canvas, modules, fg, bg) {
    var n = modules.length, quiet = 4;
    var scale = Math.max(3, Math.floor(600 / (n + quiet * 2)));
    var px = (n + quiet * 2) * scale;
    canvas.width = px; canvas.height = px;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = fg;
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if (modules[y][x]) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
    }
  }
  function buildQr(body) {
    var user = getUser();
    body.innerHTML = '<div id="mp-qr-wrap">' +
      '<div class="mp-field"><label for="mp-qr-text">' + esc(L('qr_text_label')) + '</label>' +
      '<textarea id="mp-qr-text" class="text-input" rows="2" maxlength="400" placeholder="https://…"></textarea></div>' +
      (user ? '<div class="mp-chips"><button type="button" class="mp-chip" data-fill="profile">' + esc(L('qr_my_profile')) + '</button>' +
        '<button type="button" class="mp-chip" data-fill="ref">' + esc(L('qr_my_ref')) + '</button></div>' : '') +
      '<div class="mp-two"><label class="mp-color"><input type="color" id="mp-qr-fg" value="#000000"><span>' + esc(L('qr_fg')) + '</span></label>' +
      '<label class="mp-color"><input type="color" id="mp-qr-bg" value="#ffffff"><span>' + esc(L('qr_bg')) + '</span></label></div>' +
      '<div class="mp-qr-stage"><canvas id="mp-qr-canvas" width="300" height="300"></canvas></div>' +
      '<p class="mp-hint" id="mp-qr-msg"></p>' +
      '<div class="mp-actions"><button type="button" class="btn btn-primary" id="mp-qr-dl">' + svg('download', 16) + ' ' + esc(L('download')) + '</button>' +
      '<button type="button" class="btn btn-outline" id="mp-qr-share">' + svg('share', 16) + ' ' + esc(L('share')) + '</button></div></div>';

    var txt = $('mp-qr-text'), fg = $('mp-qr-fg'), bg = $('mp-qr-bg'), canvas = $('mp-qr-canvas'), msg = $('mp-qr-msg');
    var ready = false;

    function render() {
      var v = txt.value.trim();
      var lowContrast = luminance(fg.value) > luminance(bg.value);
      msg.className = 'mp-hint';
      if (!v) {
        ready = false; msg.textContent = L('qr_empty');
        var c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      var m = qrEncode(v);
      if (!m) { ready = false; msg.classList.add('err'); msg.textContent = L('qr_too_long'); return; }
      drawQr(canvas, m, fg.value, bg.value);
      ready = true;
      msg.textContent = lowContrast ? L('qr_contrast') : '';
    }
    txt.addEventListener('input', render);
    fg.addEventListener('input', render);
    bg.addEventListener('input', render);
    $('mp-qr-wrap').addEventListener('click', function (ev) {
      var chip = ev.target.closest ? ev.target.closest('[data-fill]') : null;
      if (!chip || !user) return;
      var base = location.origin + location.pathname;
      txt.value = base + (chip.getAttribute('data-fill') === 'ref' ? '?ref=' : '?profile=') + user.uid;
      render();
    });
    $('mp-qr-dl').addEventListener('click', function () {
      if (!ready) return;
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'coeurnoh-qr.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }, 'image/png');
    });
    $('mp-qr-share').addEventListener('click', function () {
      if (!ready) return;
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var file = null;
        try { file = new File([blob], 'coeurnoh-qr.png', { type: 'image/png' }); } catch (e) { /* ignore */ }
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          navigator.share({ files: [file], text: txt.value.trim() }).catch(function () { /* annulé */ });
        } else if (navigator.share) {
          navigator.share({ text: txt.value.trim() }).catch(function () { /* annulé */ });
        } else copyText(txt.value.trim(), null);
      }, 'image/png');
    });

    if (pendingQrText) { txt.value = pendingQrText; pendingQrText = ''; }
    render();
  }

  /* ---------- Lien WhatsApp ---------- */
  function buildWa(body) {
    body.innerHTML =
      '<div class="mp-field"><label for="mp-wa-phone">' + esc(L('wa_phone')) + '</label>' +
      '<input type="tel" id="mp-wa-phone" class="text-input" inputmode="tel" placeholder="+243 8X XXX XXXX"></div>' +
      '<div class="mp-field"><label for="mp-wa-msg">' + esc(L('wa_msg')) + '</label>' +
      '<textarea id="mp-wa-msg" class="text-input" rows="3" maxlength="500"></textarea></div>' +
      '<p class="mp-hint err" id="mp-wa-err"></p><div id="mp-wa-out"></div>';
    var phone = $('mp-wa-phone'), msg = $('mp-wa-msg'), err = $('mp-wa-err'), out = $('mp-wa-out');
    function render() {
      out.innerHTML = ''; err.textContent = '';
      if (!phone.value.trim()) return;
      var digits = cleanPhone(phone.value);
      if (!digits) { err.textContent = L('wa_invalid'); return; }
      var link = 'https://wa.me/' + digits + (msg.value.trim() ? '?text=' + encodeURIComponent(msg.value.trim()) : '');
      out.innerHTML =
        '<div class="mp-field"><label>' + esc(L('wa_link')) + '</label></div>' +
        '<div class="mp-out"><span class="mp-out-text small">' + esc(link) + '</span>' +
        '<button type="button" class="mp-copy" id="mp-wa-copy">' + esc(L('copy')) + '</button></div>' +
        '<div class="mp-actions"><button type="button" class="btn btn-primary" id="mp-wa-open">' + esc(L('open')) + '</button>' +
        '<button type="button" class="btn btn-outline" id="mp-wa-qr">' + esc(L('wa_make_qr')) + '</button></div>';
      $('mp-wa-copy').addEventListener('click', function () { copyText(link, $('mp-wa-copy')); });
      $('mp-wa-open').addEventListener('click', function () { window.open(link, '_blank', 'noopener'); });
      $('mp-wa-qr').addEventListener('click', function () { pendingQrText = link; openTool('qr'); });
    }
    phone.addEventListener('input', render);
    msg.addEventListener('input', render);
  }

  /* ---------- Texte stylé ---------- */
  function buildFont(body) {
    body.innerHTML =
      '<div class="mp-field"><label for="mp-font-in">' + esc(L('font_ph')) + '</label>' +
      '<textarea id="mp-font-in" class="text-input" rows="2" maxlength="120" placeholder="' + esc(L('font_ph')) + '"></textarea></div>' +
      '<p class="mp-hint">' + esc(L('font_note')) + '</p><div id="mp-font-out"></div>';
    var input = $('mp-font-in'), out = $('mp-font-out');
    function render() {
      var v = input.value.trim() || 'Coeurnoh';
      out.innerHTML = FONT_STYLES.map(function (st, i) {
        return '<div class="mp-out"><span class="mp-out-text">' + esc(styleText(v, st)) + '</span>' +
          '<button type="button" class="mp-copy" data-i="' + i + '">' + esc(L('copy')) + '</button></div>';
      }).join('');
    }
    out.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-i]') : null;
      if (!b) return;
      copyText(styleText(input.value.trim() || 'Coeurnoh', FONT_STYLES[+b.getAttribute('data-i')]), b);
    });
    input.addEventListener('input', render);
    render();
  }

  /* ---------- Convertisseur de devises ---------- */
  var FX_CODES = ['USD', 'EUR', 'CDF', 'XOF', 'XAF', 'GNF', 'MAD', 'DZD', 'TND', 'NGN', 'GHS', 'KES', 'TZS', 'UGX', 'RWF', 'ZAR', 'EGP', 'GBP', 'CAD', 'CNY', 'AED', 'TRY', 'BRL', 'INR'];
  var FX_KEY = 'cn_fx_cache_v1';
  var FX_TTL = 6 * 3600 * 1000;

  function fxName(code) {
    try { return new Intl.DisplayNames([curLang()], { type: 'currency' }).of(code) || code; } catch (e) { return code; }
  }
  function fxLoad() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(FX_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (cached && cached.rates && Date.now() - cached.t < FX_TTL) return Promise.resolve({ rates: cached.rates, t: cached.t, stale: false });
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 9000) : null;
    return fetch('https://open.er-api.com/v6/latest/USD', ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        if (!data || !data.rates) throw new Error('format');
        var pack = { t: Date.now(), rates: data.rates };
        try { localStorage.setItem(FX_KEY, JSON.stringify(pack)); } catch (e) { /* ignore */ }
        return { rates: pack.rates, t: pack.t, stale: false };
      })
      .catch(function (e) {
        if (timer) clearTimeout(timer);
        if (cached && cached.rates) return { rates: cached.rates, t: cached.t, stale: true };
        throw e;
      });
  }
  function buildFx(body) {
    var opts = FX_CODES.map(function (c) { return '<option value="' + c + '">' + c + ' — ' + esc(fxName(c)) + '</option>'; }).join('');
    body.innerHTML =
      '<div class="mp-field"><label for="mp-fx-amt">' + esc(L('fx_amount')) + '</label>' +
      '<input type="number" id="mp-fx-amt" class="text-input" inputmode="decimal" min="0" step="any" value="100"></div>' +
      '<div class="mp-field"><select id="mp-fx-from" class="text-input">' + opts + '</select></div>' +
      '<button type="button" class="mp-swap" id="mp-fx-swap" aria-label="swap">' + svg('swap', 18) + '</button>' +
      '<div class="mp-field"><select id="mp-fx-to" class="text-input">' + opts + '</select></div>' +
      '<div class="mp-result-card"><div class="mp-result-big" id="mp-fx-res">…</div><div class="mp-result-sub" id="mp-fx-sub">' + esc(L('fx_loading')) + '</div></div>' +
      '<p class="mp-hint" id="mp-fx-note"></p>';
    var amt = $('mp-fx-amt'), from = $('mp-fx-from'), to = $('mp-fx-to');
    from.value = 'USD'; to.value = 'CDF';
    var state = null;
    function fmt(n, max) {
      try { return n.toLocaleString(curLang(), { maximumFractionDigits: max }); } catch (e) { return String(n); }
    }
    function render() {
      if (!state) return;
      var r = state.rates, a = parseFloat(amt.value);
      if (!r[from.value] || !r[to.value]) { $('mp-fx-res').textContent = '—'; return; }
      var unit = r[to.value] / r[from.value];
      $('mp-fx-res').textContent = isNaN(a) ? '—' : fmt(a * unit, 2) + ' ' + to.value;
      $('mp-fx-sub').textContent = '1 ' + from.value + ' = ' + fmt(unit, 4) + ' ' + to.value;
      var d = new Date(state.t);
      $('mp-fx-note').textContent = (state.stale ? L('fx_offline') + ' · ' : '') + L('fx_updated') + ' ' + d.toLocaleDateString(curLang()) + ' · ' + L('fx_indicative');
    }
    [amt, from, to].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
    $('mp-fx-swap').addEventListener('click', function () { var x = from.value; from.value = to.value; to.value = x; render(); });
    fxLoad().then(function (s) { state = s; render(); }).catch(function () {
      $('mp-fx-res').textContent = '—';
      $('mp-fx-sub').textContent = L('fx_error');
    });
  }

  /* ---------- Générateur d'affiches (texte façon "meme" jaune/noir, ou texte
     sur une photo) — tout est dessiné côté client sur un <canvas>, rien n'est
     envoyé à un serveur. Un discret filigrane "Coeurnoh Universe" est ajouté
     automatiquement dans un coin de l'image téléchargée. ---------- */
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function memeWrapLine(ctx, text, maxWidth) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    var lines = [], cur = words[0];
    for (var i = 1; i < words.length; i++) {
      var test = cur + ' ' + words[i];
      if (ctx.measureText(test).width <= maxWidth) cur = test;
      else { lines.push(cur); cur = words[i]; }
    }
    lines.push(cur);
    return lines;
  }
  function memeWatermark(ctx, W, H) {
    // Filigrane texte, discret et petit -- juste le nom "Coeurnoh Universe",
    // comme demandé (pas de logo graphique ici, ça ne rendait pas bien).
    var pad = Math.round(W * 0.025);
    var fs = Math.max(14, Math.round(W * 0.022));
    ctx.save();
    ctx.font = '600 ' + fs + 'px Inter, Arial, sans-serif';
    var label = 'Coeurnoh Universe';
    var tw = ctx.measureText(label).width;
    var padX = Math.round(fs * 0.7), padY = Math.round(fs * 0.45);
    var pillW = tw + padX * 2, pillH = fs + padY * 2;
    var x = W - pillW - pad, y = H - pillH - pad;
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000000';
    roundRectPath(ctx, x, y, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + pillW / 2, y + pillH / 2 + fs * 0.02);
    ctx.restore();
  }
  var MEME_W = 1080;
  function buildMeme(body) {
    var state = { mode: 'text', bg: '#0b0b0d', hi: '#ffe100', fg: '#111111', photoFile: null, photoImg: null };
    var ready = false;

    function drawTextMode(canvas, ctx, rawText) {
      var padY = Math.round(MEME_W * 0.09);
      var fontSize = Math.round(MEME_W * 0.062);
      ctx.font = '800 ' + fontSize + 'px "Sora","Arial Black",Arial,sans-serif';
      var padInnerX = Math.round(fontSize * 0.34), padInnerY = Math.round(fontSize * 0.24);
      var maxTextWidth = MEME_W - Math.round(MEME_W * 0.09) * 2 - padInnerX * 2;
      var rawLines = String(rawText || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var blocks = [];
      rawLines.forEach(function (line) {
        memeWrapLine(ctx, line, maxTextWidth).forEach(function (w) {
          blocks.push({ text: w, width: ctx.measureText(w).width });
        });
      });
      if (!blocks.length) return false;
      var blockGap = Math.round(fontSize * 0.5);
      var blockHeight = fontSize + padInnerY * 2;
      var totalHeight = padY * 2 + blocks.length * blockHeight + (blocks.length - 1) * blockGap;
      canvas.width = MEME_W;
      canvas.height = Math.max(360, Math.round(totalHeight));
      ctx.font = '800 ' + fontSize + 'px "Sora","Arial Black",Arial,sans-serif';
      ctx.fillStyle = state.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var y = padY;
      blocks.forEach(function (b) {
        var rectW = b.width + padInnerX * 2;
        var x = (canvas.width - rectW) / 2;
        ctx.fillStyle = state.hi;
        roundRectPath(ctx, x, y, rectW, blockHeight, Math.round(fontSize * 0.14));
        ctx.fill();
        ctx.fillStyle = state.fg;
        ctx.fillText(b.text, canvas.width / 2, y + blockHeight / 2 + fontSize * 0.03);
        y += blockHeight + blockGap;
      });
      memeWatermark(ctx, canvas.width, canvas.height);
      return true;
    }

    function drawPhotoMode(canvas, ctx, bannerText, img) {
      if (!img) return false;
      var fontSize = Math.round(MEME_W * 0.062);
      ctx.font = '800 ' + fontSize + 'px "Sora","Arial Black",Arial,sans-serif';
      var padX = Math.round(MEME_W * 0.06), padY = Math.round(MEME_W * 0.05);
      var lines = [];
      String(bannerText || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (line) {
        memeWrapLine(ctx, line, MEME_W - padX * 2).forEach(function (w) { lines.push(w); });
      });
      var lineHeight = Math.round(fontSize * 1.18);
      var bannerHeight = lines.length ? (padY * 2 + lines.length * lineHeight) : 0;
      var photoHeight = Math.round(MEME_W * (img.naturalHeight / img.naturalWidth || 1));
      canvas.width = MEME_W;
      canvas.height = bannerHeight + photoHeight;
      ctx.font = '800 ' + fontSize + 'px "Sora","Arial Black",Arial,sans-serif';
      if (bannerHeight) {
        ctx.fillStyle = state.hi;
        ctx.fillRect(0, 0, MEME_W, bannerHeight);
        ctx.fillStyle = state.fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var ty = padY + lineHeight / 2;
        lines.forEach(function (l) { ctx.fillText(l, MEME_W / 2, ty); ty += lineHeight; });
      }
      ctx.drawImage(img, 0, bannerHeight, MEME_W, photoHeight);
      memeWatermark(ctx, canvas.width, canvas.height);
      return true;
    }

    function draw() {
      var canvas = $('mp-meme-canvas'); if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var msg = $('mp-meme-msg');
      var ok = false;
      if (state.mode === 'text') {
        var txtEl = $('mp-meme-text');
        var txt = txtEl ? txtEl.value : '';
        if (!txt.trim()) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (msg) msg.textContent = L('meme_empty');
          ready = false; return;
        }
        ok = drawTextMode(canvas, ctx, txt);
      } else {
        if (!state.photoImg) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (msg) msg.textContent = L('meme_photo_required');
          ready = false; return;
        }
        var bannerEl = $('mp-meme-banner');
        ok = drawPhotoMode(canvas, ctx, bannerEl ? bannerEl.value : '', state.photoImg);
      }
      if (msg) msg.textContent = '';
      ready = !!ok;
    }

    function wire() {
      Array.prototype.forEach.call(body.querySelectorAll('.mp-meme-mode-btn'), function (b) {
        b.addEventListener('click', function () { state.mode = b.getAttribute('data-mode'); render(); });
      });
      var hi = $('mp-meme-hi'), fg = $('mp-meme-fg'), bg = $('mp-meme-bg');
      if (hi) hi.addEventListener('input', function () { state.hi = hi.value; draw(); });
      if (fg) fg.addEventListener('input', function () { state.fg = fg.value; draw(); });
      if (bg) bg.addEventListener('input', function () { state.bg = bg.value; draw(); });
      var txt = $('mp-meme-text'); if (txt) txt.addEventListener('input', draw);
      var banner = $('mp-meme-banner'); if (banner) banner.addEventListener('input', draw);
      var photoInput = $('mp-meme-photo');
      if (photoInput) photoInput.addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (!f) return;
        state.photoFile = f;
        var img = new Image();
        img.onload = function () { state.photoImg = img; draw(); };
        img.src = URL.createObjectURL(f);
        var lblTxt = $('mp-meme-photo-text'); if (lblTxt) lblTxt.textContent = '✅ ' + f.name;
        var lblWrap = $('mp-meme-photo-label'); if (lblWrap) lblWrap.classList.add('has-file');
      });
      var dl = $('mp-meme-dl');
      if (dl) dl.addEventListener('click', function () {
        if (!ready) return;
        var canvas = $('mp-meme-canvas');
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'coeurnoh-universe-' + (L('meme_dl_name') || 'affiche') + '-' + Date.now() + '.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        }, 'image/png');
      });
      var sh = $('mp-meme-share');
      if (sh) sh.addEventListener('click', function () {
        if (!ready) return;
        var canvas = $('mp-meme-canvas');
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var file = null;
          try { file = new File([blob], 'coeurnoh-universe-affiche.png', { type: 'image/png' }); } catch (e) { /* ignore */ }
          if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            navigator.share({ files: [file] }).catch(function () { /* annulé */ });
          } else if (navigator.share) {
            navigator.share({ title: 'Coeurnoh Universe' }).catch(function () { /* annulé */ });
          } else toast(L('unavailable'));
        }, 'image/png');
      });
    }

    function render() {
      body.innerHTML =
        '<div class="mp-two mp-meme-modes">' +
          '<button type="button" class="mp-chip mp-meme-mode-btn' + (state.mode === 'text' ? ' active' : '') + '" data-mode="text">' + esc(L('meme_mode_text')) + '</button>' +
          '<button type="button" class="mp-chip mp-meme-mode-btn' + (state.mode === 'photo' ? ' active' : '') + '" data-mode="photo">' + esc(L('meme_mode_photo')) + '</button>' +
        '</div>' +
        (state.mode === 'text'
          ? '<div class="mp-field"><label for="mp-meme-text">' + esc(L('meme_text_label')) + '</label>' +
            '<textarea id="mp-meme-text" class="text-input" rows="4" maxlength="240" placeholder="' + esc(L('meme_text_ph')) + '"></textarea></div>'
          : '<div class="mp-field"><label for="mp-meme-photo">' + esc(L('meme_choose_photo')) + '</label>' +
            '<input type="file" id="mp-meme-photo" class="file-input-hidden" accept="image/*">' +
            '<label for="mp-meme-photo" class="file-picker-btn' + (state.photoFile ? ' has-file' : '') + '" id="mp-meme-photo-label">' +
              '<span class="file-picker-icon">🖼️</span><span class="file-picker-text" id="mp-meme-photo-text">' + esc(state.photoFile ? ('✅ ' + state.photoFile.name) : L('meme_choose_photo')) + '</span>' +
            '</label>' +
            '<div class="mp-field" style="margin-top:12px"><label for="mp-meme-banner">' + esc(L('meme_banner_label')) + '</label>' +
            '<textarea id="mp-meme-banner" class="text-input" rows="2" maxlength="140" placeholder="' + esc(L('meme_banner_ph')) + '"></textarea></div>') +
        '<div class="mp-two">' +
          '<label class="mp-color"><input type="color" id="mp-meme-hi" value="' + state.hi + '"><span>' + esc(L('meme_highlight_color')) + '</span></label>' +
          '<label class="mp-color"><input type="color" id="mp-meme-fg" value="' + state.fg + '"><span>' + esc(L('meme_text_color')) + '</span></label>' +
        '</div>' +
        (state.mode === 'text' ? '<div class="mp-field"><label class="mp-color"><input type="color" id="mp-meme-bg" value="' + state.bg + '"><span>' + esc(L('meme_bg_color')) + '</span></label></div>' : '') +
        '<div class="mp-qr-stage mp-meme-stage"><canvas id="mp-meme-canvas" width="' + MEME_W + '" height="480"></canvas></div>' +
        '<p class="mp-hint err" id="mp-meme-msg"></p>' +
        '<div class="mp-actions"><button type="button" class="btn btn-primary" id="mp-meme-dl">' + svg('download', 16) + ' ' + esc(L('download')) + '</button>' +
        '<button type="button" class="btn btn-outline" id="mp-meme-share">' + svg('share', 16) + ' ' + esc(L('share')) + '</button></div>';
      wire();
      draw();
      // Repasse une fois les polices web (Sora) chargées, au cas où le canvas
      // aurait dessiné avant -- évite un rendu avec la police de repli.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { draw(); }).catch(function () {});
      }
    }
    render();
  }

  /* ---------- Mockups produits (t-shirt / emballage) ----------
     Silhouettes dessinées au vecteur (canvas) -- pas de vraies photos de
     produits disponibles ici, donc rendu "mockup plat" propre plutôt que
     photoréaliste : couleur de produit au choix + design de l'utilisateur
     posé dessus, avec le même filigrane de marque que le générateur
     d'affiches. */
  /* ---------- Mockups produits (photo réelle + design positionnable) ----------
     Rendu réaliste en 2 temps :
       1. Un aperçu manuel rapide et gratuit (glisser/redimensionner sur
          canvas), pour se positionner.
       2. Un bouton "Générer un mockup professionnel (IA)" qui envoie les
          deux images à une vraie IA de génération d'image (Gemini / "Nano
          Banana", via /api/generate-mockup) pour un rendu réellement
          photoréaliste -- le design appliqué avec les bonnes ombres, plis
          et perspective, comme s'il sortait tel quel de l'usine. */
  function buildMockup(body) {
    var state = {
      screen: 'pick', templates: [], templatesLoaded: false, templatesLoading: false,
      chosenTemplate: null,
      baseFile: null, baseImg: null,
      designFile: null, designImg: null,
      ox: 0.5, oy: 0.5, scale: 0.34, rot: 0,
      newName: '', newBaseFile: null, newBaseImg: null, saving: false,
      aiLoading: false, aiResultImg: null, aiError: '', aiErrorIsBalance: false, aiBillingNote: '',
      pricingQuota: 3, pricingPrice: 0.30
    };
    db.collection('app_config').doc('mockup_ai').get().then(function (snap) {
      if (!snap.exists) return;
      var d = snap.data();
      if (Number.isFinite(d.freeQuota)) state.pricingQuota = d.freeQuota;
      if (Number.isFinite(d.priceUsd)) state.pricingPrice = d.priceUsd;
      if (state.screen === 'design') render();
    }).catch(function () { /* tant pis, on garde les valeurs par défaut */ });
    var ready = false;
    var dragging = false, dragDX = 0, dragDY = 0;
    var isAdminUser = (typeof currentUser !== 'undefined' && currentUser && typeof ADMIN_UID !== 'undefined' && currentUser.uid === ADMIN_UID);

    function canvasPoint(canvas, clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    }
    function boxOf(canvas, img) {
      var w = canvas.width * state.scale;
      var h = w * (img.naturalHeight / img.naturalWidth);
      return { cx: state.ox * canvas.width, cy: state.oy * canvas.height, w: w, h: h };
    }
    function clipRotatedBox(ctx, box, rotDeg) {
      ctx.translate(box.cx, box.cy);
      ctx.rotate(rotDeg * Math.PI / 180);
      ctx.beginPath();
      ctx.rect(-box.w / 2, -box.h / 2, box.w, box.h);
      ctx.clip();
      ctx.rotate(-rotDeg * Math.PI / 180);
      ctx.translate(-box.cx, -box.cy);
    }

    // ---------- Ecran 1 : choisir un modèle pro ou sa propre photo ----------
    function loadTemplates(cb) {
      if (state.templatesLoading) return;
      state.templatesLoading = true;
      db.collection('mockup_templates').orderBy('createdAt', 'desc').limit(40).get().then(function (snap) {
        state.templates = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        state.templatesLoaded = true;
        state.templatesLoading = false;
        if (cb) cb();
      }).catch(function () {
        state.templatesLoaded = true;
        state.templatesLoading = false;
        if (cb) cb();
      });
    }

    function renderPick() {
      if (!state.templatesLoaded) {
        body.innerHTML = '<p class="mp-hint">' + esc(L('mockup_loading')) + '</p>';
        loadTemplates(renderPick);
        return;
      }
      var cards = state.templates.map(function (t) {
        return '<button type="button" class="mockup-tpl-card" data-tpl="' + t.id + '">' +
          '<img src="' + esc(t.imageUrl) + '" alt="' + esc(t.name) + '" loading="lazy">' +
          '<span>' + esc(t.name) + '</span></button>';
      }).join('');
      var ownCard = '<button type="button" class="mockup-tpl-card mockup-tpl-own" data-tpl="__own__">' +
        '<span class="mockup-tpl-own-icon">📷</span><span>' + esc(L('mockup_own_photo')) + '</span></button>';
      var adminCard = isAdminUser
        ? '<button type="button" class="mockup-tpl-card mockup-tpl-admin" data-tpl="__admin__">' +
          '<span class="mockup-tpl-own-icon">➕</span><span>' + esc(L('mockup_admin_add')) + '</span></button>'
        : '';
      body.innerHTML =
        '<p class="mp-hint" style="margin-bottom:10px">' + esc(L('mockup_pick_hint')) + '</p>' +
        '<div class="mockup-tpl-grid">' + cards + ownCard + adminCard + '</div>';

      Array.prototype.forEach.call(body.querySelectorAll('.mockup-tpl-card'), function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-tpl');
          if (id === '__own__') {
            state.chosenTemplate = null; state.baseImg = null; state.baseFile = null;
            state.designImg = null; state.designFile = null;
            state.aiResultImg = null; state.aiError = ''; state.aiErrorIsBalance = false;
            state.ox = 0.5; state.oy = 0.5; state.scale = 0.34; state.rot = 0;
            state.screen = 'design'; render();
          } else if (id === '__admin__') {
            state.newName = ''; state.newBaseFile = null; state.newBaseImg = null;
            state.ox = 0.5; state.oy = 0.5; state.scale = 0.34; state.rot = 0;
            state.screen = 'admin_new'; render();
          } else {
            var tpl = state.templates.filter(function (t) { return t.id === id; })[0];
            if (!tpl) return;
            state.chosenTemplate = tpl;
            state.ox = tpl.zone ? tpl.zone.ox : 0.5;
            state.oy = tpl.zone ? tpl.zone.oy : 0.5;
            state.scale = tpl.zone ? tpl.zone.scale : 0.34;
            state.rot = tpl.zone ? tpl.zone.rot : 0;
            state.baseImg = null;
            state.aiResultImg = null; state.aiError = ''; state.aiErrorIsBalance = false;
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () { state.baseImg = img; if (state.screen === 'design') draw(); };
            img.src = tpl.imageUrl;
            state.designImg = null; state.designFile = null;
            state.screen = 'design'; render();
          }
        });
      });
    }

    // ---------- Ecran 2 : positionner le design sur la base choisie ----------
    function draw() {
      var canvas = $('mp-mockup-canvas'); if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var msg = $('mp-mockup-msg');
      // Si un résultat IA a été généré, c'est lui qu'on montre et qu'on
      // télécharge -- plus besoin du montage manuel par-dessus.
      if (state.aiResultImg) {
        canvas.width = state.aiResultImg.naturalWidth;
        canvas.height = state.aiResultImg.naturalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(state.aiResultImg, 0, 0, canvas.width, canvas.height);
        memeWatermark(ctx, canvas.width, canvas.height);
        if (msg) msg.textContent = '';
        ready = true;
        return;
      }
      if (!state.baseImg) {
        canvas.width = 1080; canvas.height = 1080;
        ctx.fillStyle = '#e9ebef';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (msg) msg.textContent = L('mockup_empty_base');
        ready = false;
        return;
      }
      var maxSide = 1080;
      var ratio = Math.min(1, maxSide / Math.max(state.baseImg.naturalWidth, state.baseImg.naturalHeight));
      canvas.width = Math.round(state.baseImg.naturalWidth * ratio);
      canvas.height = Math.round(state.baseImg.naturalHeight * ratio);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(state.baseImg, 0, 0, canvas.width, canvas.height);

      if (!state.designImg) {
        if (msg) msg.textContent = L('mockup_empty_design');
        memeWatermark(ctx, canvas.width, canvas.height);
        ready = true;
        return;
      }
      if (msg) msg.textContent = '';
      var box = boxOf(canvas, state.designImg);
      ctx.save();
      ctx.translate(box.cx, box.cy);
      ctx.rotate(state.rot * Math.PI / 180);
      ctx.drawImage(state.designImg, -box.w / 2, -box.h / 2, box.w, box.h);
      ctx.restore();
      // Réalisme : on laisse transparaître les ombres/plis/texture du
      // produit à travers le design (comme un vrai flocage), au lieu
      // d'un simple collage plat qui "fait local".
      ctx.save();
      clipRotatedBox(ctx, box, state.rot);
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(state.baseImg, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.25;
      ctx.drawImage(state.baseImg, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      memeWatermark(ctx, canvas.width, canvas.height);
      ready = true;
    }

    function startDrag(canvas, clientX, clientY) {
      if (!state.designImg && state.screen !== 'admin_new') return;
      if (state.screen === 'admin_new' && !state.newBaseImg) return;
      var p = canvasPoint(canvas, clientX, clientY);
      var refImg = state.screen === 'admin_new' ? state.newBaseImg : state.designImg;
      var box = boxOf(canvas, refImg);
      dragDX = p.x - box.cx;
      dragDY = p.y - box.cy;
      dragging = true;
    }
    function moveDrag(canvas, clientX, clientY) {
      if (!dragging) return;
      var p = canvasPoint(canvas, clientX, clientY);
      state.ox = Math.min(1, Math.max(0, (p.x - dragDX) / canvas.width));
      state.oy = Math.min(1, Math.max(0, (p.y - dragDY) / canvas.height));
      if (state.screen === 'admin_new') drawAdminZone(); else draw();
    }

    function wireCanvasDrag(canvas) {
      canvas.addEventListener('mousedown', function (e) { startDrag(canvas, e.clientX, e.clientY); });
      window.addEventListener('mousemove', function (e) { moveDrag(canvas, e.clientX, e.clientY); });
      window.addEventListener('mouseup', function () { dragging = false; });
      canvas.addEventListener('touchstart', function (e) {
        var t = e.touches[0]; startDrag(canvas, t.clientX, t.clientY);
        if (state.designImg || state.newBaseImg) e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        var t = e.touches[0]; moveDrag(canvas, t.clientX, t.clientY);
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchend', function () { dragging = false; });
    }

    function positionHintText() {
      var vert = state.oy < 0.38 ? 'haut' : (state.oy > 0.62 ? 'bas' : 'milieu');
      var horiz = state.ox < 0.38 ? 'gauche' : (state.ox > 0.62 ? 'droite' : 'centre');
      return 'Placer le design vers le ' + vert + '-' + horiz + ' du produit, occupant environ ' + Math.round(state.scale * 100) + '% de la largeur, avec une inclinaison de ' + state.rot + ' degrés.';
    }

    function imgToDataUrl(img, maxSide, mime, quality) {
      var ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      c.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      var cctx = c.getContext('2d');
      if (mime === 'image/jpeg') { cctx.fillStyle = '#fff'; cctx.fillRect(0, 0, c.width, c.height); }
      cctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL(mime, quality);
    }

    function generateAiMockup() {
      if (!state.baseImg || !state.designImg || state.aiLoading) return;
      if (typeof auth === 'undefined' || !auth.currentUser) { toast(L('mockup_ai_login_needed')); return;
      }
      state.aiLoading = true;
      state.aiError = '';
      state.aiErrorIsBalance = false;
      state.aiBillingNote = '';
      render();
      var baseDataUrl = imgToDataUrl(state.baseImg, 1024, 'image/jpeg', 0.88);
      var designDataUrl = imgToDataUrl(state.designImg, 1024, 'image/png');
      auth.currentUser.getIdToken().then(function (idToken) {
        return fetch('/api/generate-mockup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({ baseImage: baseDataUrl, designImage: designDataUrl, placementHint: positionHintText() })
        });
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          state.aiLoading = false;
          if (!res.ok || !res.data || res.data.success === false || !res.data.imageDataUrl) {
            var errMsg = (res.data && res.data.error) || L('mockup_ai_error');
            state.aiError = errMsg;
            // Detecte un refus pour solde insuffisant (message renvoyé par
            // l'API) pour proposer directement le bouton de recharge.
            state.aiErrorIsBalance = /solde insuffisant|insufficient balance/i.test(errMsg);
            render();
            return;
          }
          var billing = res.data.billing;
          if (billing) {
            state.aiBillingNote = billing.type === 'free'
              ? (billing.freeRemaining > 0 ? (billing.freeRemaining + ' ' + L('mockup_ai_free_left')) : L('mockup_ai_charged'))
              : L('mockup_ai_charged');
          }
          var img = new Image();
          img.onload = function () { state.aiResultImg = img; render(); };
          img.src = res.data.imageDataUrl;
        }).catch(function () {
          state.aiLoading = false;
          state.aiError = L('mockup_ai_error');
          render();
        });
    }

    function wireDesignScreen() {
      var backBtn = $('mp-mockup-back');
      if (backBtn) backBtn.addEventListener('click', function () { state.screen = 'pick'; render(); });

      var baseInput = $('mp-mockup-base');
      if (baseInput) baseInput.addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (!f) return;
        state.baseFile = f;
        state.aiResultImg = null; state.aiError = ''; state.aiErrorIsBalance = false;
        var img = new Image();
        img.onload = function () { state.baseImg = img; draw(); };
        img.src = URL.createObjectURL(f);
        var lblTxt = $('mp-mockup-base-text'); if (lblTxt) lblTxt.textContent = '✅ ' + f.name;
        var lblWrap = $('mp-mockup-base-label'); if (lblWrap) lblWrap.classList.add('has-file');
      });
      var designInput = $('mp-mockup-design');
      if (designInput) designInput.addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (!f) return;
        state.designFile = f;
        state.aiResultImg = null; state.aiError = ''; state.aiErrorIsBalance = false;
        var img = new Image();
        img.onload = function () { state.designImg = img; draw(); };
        img.src = URL.createObjectURL(f);
        var lblTxt = $('mp-mockup-design-text'); if (lblTxt) lblTxt.textContent = '✅ ' + f.name;
        var lblWrap = $('mp-mockup-design-label'); if (lblWrap) lblWrap.classList.add('has-file');
      });

      var canvas = $('mp-mockup-canvas');
      if (canvas) wireCanvasDrag(canvas);

      var scaleInput = $('mp-mockup-scale');
      if (scaleInput) scaleInput.addEventListener('input', function () { state.scale = parseInt(scaleInput.value, 10) / 100; draw(); });
      var rotInput = $('mp-mockup-rot');
      if (rotInput) rotInput.addEventListener('input', function () { state.rot = parseInt(rotInput.value, 10); draw(); });

      var aiBtn = $('mp-mockup-ai-generate');
      if (aiBtn) aiBtn.addEventListener('click', generateAiMockup);
      var aiRedo = $('mp-mockup-ai-redo');
      if (aiRedo) aiRedo.addEventListener('click', function () { state.aiResultImg = null; state.aiError = ''; state.aiErrorIsBalance = false; state.aiBillingNote = ''; render(); });
      var aiRecharge = $('mp-mockup-ai-recharge');
      if (aiRecharge) aiRecharge.addEventListener('click', function () {
        if (typeof showRecharge === 'function') showRecharge();
      });

      var dl = $('mp-mockup-dl');
      if (dl) dl.addEventListener('click', function () {
        if (!ready) return;
        var canvas = $('mp-mockup-canvas');
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'coeurnoh-universe-' + (L('mockup_dl_name') || 'mockup') + '-' + Date.now() + '.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        }, 'image/png');
      });
      var sh = $('mp-mockup-share');
      if (sh) sh.addEventListener('click', function () {
        if (!ready) return;
        var canvas = $('mp-mockup-canvas');
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var file = null;
          try { file = new File([blob], 'coeurnoh-universe-mockup.png', { type: 'image/png' }); } catch (e) { /* ignore */ }
          if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            navigator.share({ files: [file] }).catch(function () { /* annulé */ });
          } else if (navigator.share) {
            navigator.share({ title: 'Coeurnoh Universe' }).catch(function () { /* annulé */ });
          } else toast(L('unavailable'));
        }, 'image/png');
      });
    }

    function renderDesign() {
      var tpl = state.chosenTemplate;
      var showAiResult = !!state.aiResultImg;
      body.innerHTML =
        '<button type="button" class="mp-back-link" id="mp-mockup-back">← ' + esc(L('mockup_change_tpl')) + '</button>' +
        (tpl
          ? '<p class="mp-hint" style="margin:6px 0 12px"><b>' + esc(tpl.name) + '</b></p>'
          : '<div class="mp-field"><label for="mp-mockup-base">' + esc(L('mockup_choose_base')) + '</label>' +
            '<input type="file" id="mp-mockup-base" class="file-input-hidden" accept="image/*">' +
            '<label for="mp-mockup-base" class="file-picker-btn' + (state.baseFile ? ' has-file' : '') + '" id="mp-mockup-base-label">' +
              '<span class="file-picker-icon">📦</span><span class="file-picker-text" id="mp-mockup-base-text">' + esc(state.baseFile ? ('✅ ' + state.baseFile.name) : L('mockup_choose_base')) + '</span>' +
            '</label></div>') +
        '<div class="mp-field"><label for="mp-mockup-design">' + esc(L('mockup_choose_design')) + '</label>' +
          '<input type="file" id="mp-mockup-design" class="file-input-hidden" accept="image/*">' +
          '<label for="mp-mockup-design" class="file-picker-btn' + (state.designFile ? ' has-file' : '') + '" id="mp-mockup-design-label">' +
            '<span class="file-picker-icon">🎨</span><span class="file-picker-text" id="mp-mockup-design-text">' + esc(state.designFile ? ('✅ ' + state.designFile.name) : L('mockup_choose_design')) + '</span>' +
          '</label>' +
        '</div>' +
        '<div class="mp-qr-stage mp-meme-stage"><canvas id="mp-mockup-canvas" width="1080" height="1080" class="mp-mockup-canvas"></canvas></div>' +
        (showAiResult
          ? '<p class="mp-hint mockup-ai-badge">✨ ' + esc(L('mockup_ai_result_label')) + '</p>' +
            (state.aiBillingNote ? '<p class="mp-hint small">' + esc(state.aiBillingNote) + '</p>' : '') +
            '<button type="button" class="mp-back-link" id="mp-mockup-ai-redo">↩ ' + esc(L('mockup_ai_redo')) + '</button>'
          : '<p class="mp-hint" id="mp-mockup-drag-hint">' + esc(L('mockup_drag_hint')) + '</p>' +
            '<div class="mp-field"><label>' + esc(L('mockup_scale')) + '</label><input type="range" id="mp-mockup-scale" min="10" max="80" value="' + Math.round(state.scale * 100) + '"></div>' +
            '<div class="mp-field"><label>' + esc(L('mockup_rotation')) + '</label><input type="range" id="mp-mockup-rot" min="-45" max="45" value="' + state.rot + '"></div>' +
            '<button type="button" class="btn btn-ai" id="mp-mockup-ai-generate" ' + (state.aiLoading ? 'disabled' : '') + '>' +
              (state.aiLoading ? ('⏳ ' + esc(L('mockup_ai_loading'))) : ('✨ ' + esc(L('mockup_ai_generate')))) +
            '</button>' +
            '<p class="mp-hint small">' + esc(L('mockup_ai_hint').replace('{q}', state.pricingQuota).replace('{p}', state.pricingPrice.toFixed(2))) + '</p>' +
            (state.aiError ? '<p class="mp-hint err">' + esc(state.aiError) + '</p>' : '') +
            (state.aiErrorIsBalance ? '<button type="button" class="btn btn-outline" id="mp-mockup-ai-recharge" style="width:100%;justify-content:center;margin-top:6px">💳 ' + esc(L('mockup_ai_recharge_btn')) + '</button>' : '')
        ) +
        '<p class="mp-hint err" id="mp-mockup-msg"></p>' +
        '<div class="mp-actions"><button type="button" class="btn btn-primary" id="mp-mockup-dl">' + svg('download', 16) + ' ' + esc(L('download')) + '</button>' +
        '<button type="button" class="btn btn-outline" id="mp-mockup-share">' + svg('share', 16) + ' ' + esc(L('share')) + '</button></div>';
      wireDesignScreen();
      draw();
    }

    // ---------- Ecran admin : ajouter un nouveau modèle ----------
    function drawAdminZone() {
      var canvas = $('mp-mockup-canvas'); if (!canvas) return;
      var ctx = canvas.getContext('2d');
      if (!state.newBaseImg) {
        canvas.width = 1080; canvas.height = 1080;
        ctx.fillStyle = '#e9ebef';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }
      var maxSide = 1080;
      var ratio = Math.min(1, maxSide / Math.max(state.newBaseImg.naturalWidth, state.newBaseImg.naturalHeight));
      canvas.width = Math.round(state.newBaseImg.naturalWidth * ratio);
      canvas.height = Math.round(state.newBaseImg.naturalHeight * ratio);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(state.newBaseImg, 0, 0, canvas.width, canvas.height);
      var box = boxOf(canvas, state.newBaseImg);
      ctx.save();
      ctx.translate(box.cx, box.cy);
      ctx.rotate(state.rot * Math.PI / 180);
      ctx.fillStyle = 'rgba(243,156,31,.22)';
      ctx.fillRect(-box.w / 2, -box.h / 2, box.w, box.h);
      ctx.strokeStyle = '#f39c1f';
      ctx.lineWidth = Math.max(2, canvas.width * 0.004);
      ctx.setLineDash([canvas.width * 0.012, canvas.width * 0.008]);
      ctx.strokeRect(-box.w / 2, -box.h / 2, box.w, box.h);
      ctx.restore();
    }

    function wireAdminScreen() {
      var backBtn = $('mp-mockup-back');
      if (backBtn) backBtn.addEventListener('click', function () { state.screen = 'pick'; render(); });
      var nameInput = $('mp-mockup-new-name');
      if (nameInput) nameInput.addEventListener('input', function () { state.newName = nameInput.value; });
      var baseInput = $('mp-mockup-new-base');
      if (baseInput) baseInput.addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (!f) return;
        state.newBaseFile = f;
        var img = new Image();
        img.onload = function () { state.newBaseImg = img; state.ox = 0.5; state.oy = 0.5; state.scale = 0.34; state.rot = 0; drawAdminZone(); };
        img.src = URL.createObjectURL(f);
        var lblTxt = $('mp-mockup-new-base-text'); if (lblTxt) lblTxt.textContent = '✅ ' + f.name;
        var lblWrap = $('mp-mockup-new-base-label'); if (lblWrap) lblWrap.classList.add('has-file');
      });
      var canvas = $('mp-mockup-canvas');
      if (canvas) wireCanvasDrag(canvas);
      var scaleInput = $('mp-mockup-scale');
      if (scaleInput) scaleInput.addEventListener('input', function () { state.scale = parseInt(scaleInput.value, 10) / 100; drawAdminZone(); });
      var rotInput = $('mp-mockup-rot');
      if (rotInput) rotInput.addEventListener('input', function () { state.rot = parseInt(rotInput.value, 10); drawAdminZone(); });

      var saveBtn = $('mp-mockup-save-tpl');
      if (saveBtn) saveBtn.addEventListener('click', function () {
        var msg = $('mp-mockup-new-msg');
        if (!state.newBaseFile || !state.newBaseImg) { if (msg) msg.textContent = L('mockup_admin_need_photo'); return; }
        if (!state.newName.trim()) { if (msg) msg.textContent = L('mockup_admin_need_name'); return; }
        if (state.saving) return;
        state.saving = true;
        saveBtn.disabled = true;
        if (msg) msg.textContent = L('mockup_admin_saving');
        uploadFileToStorage(state.newBaseFile, 'mockup_templates', { maxSizeMB: 10 }).then(function (res) {
          return db.collection('mockup_templates').add({
            name: state.newName.trim(),
            imageUrl: res.url,
            zone: { ox: state.ox, oy: state.oy, scale: state.scale, rot: state.rot },
            createdAt: new Date().toISOString(),
            createdBy: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null
          });
        }).then(function () {
          state.saving = false;
          state.templatesLoaded = false;
          state.screen = 'pick';
          render();
        }).catch(function (e) {
          state.saving = false;
          saveBtn.disabled = false;
          if (msg) msg.textContent = (e && e.message) || L('mockup_admin_save_error');
        });
      });
    }

    function renderAdminNew() {
      body.innerHTML =
        '<button type="button" class="mp-back-link" id="mp-mockup-back">← ' + esc(L('mockup_cancel')) + '</button>' +
        '<p class="mp-hint" style="margin:6px 0 12px">' + esc(L('mockup_admin_hint')) + '</p>' +
        '<div class="mp-field"><label for="mp-mockup-new-name">' + esc(L('mockup_admin_name_label')) + '</label>' +
          '<input type="text" id="mp-mockup-new-name" class="text-input" maxlength="60" placeholder="' + esc(L('mockup_admin_name_ph')) + '" value="' + esc(state.newName) + '"></div>' +
        '<div class="mp-field"><label for="mp-mockup-new-base">' + esc(L('mockup_choose_base')) + '</label>' +
          '<input type="file" id="mp-mockup-new-base" class="file-input-hidden" accept="image/*">' +
          '<label for="mp-mockup-new-base" class="file-picker-btn' + (state.newBaseFile ? ' has-file' : '') + '" id="mp-mockup-new-base-label">' +
            '<span class="file-picker-icon">📦</span><span class="file-picker-text" id="mp-mockup-new-base-text">' + esc(state.newBaseFile ? ('✅ ' + state.newBaseFile.name) : L('mockup_choose_base')) + '</span>' +
          '</label></div>' +
        '<div class="mp-qr-stage mp-meme-stage"><canvas id="mp-mockup-canvas" width="1080" height="1080" class="mp-mockup-canvas"></canvas></div>' +
        '<p class="mp-hint">' + esc(L('mockup_admin_zone_hint')) + '</p>' +
        '<div class="mp-field"><label>' + esc(L('mockup_scale')) + '</label><input type="range" id="mp-mockup-scale" min="10" max="80" value="' + Math.round(state.scale * 100) + '"></div>' +
        '<div class="mp-field"><label>' + esc(L('mockup_rotation')) + '</label><input type="range" id="mp-mockup-rot" min="-45" max="45" value="' + state.rot + '"></div>' +
        '<p class="mp-hint err" id="mp-mockup-new-msg"></p>' +
        '<div class="mp-actions"><button type="button" class="btn btn-primary" id="mp-mockup-save-tpl">' + svg('check', 16) + ' ' + esc(L('mockup_admin_save')) + '</button></div>';
      wireAdminScreen();
      drawAdminZone();
    }

    function render() {
      if (state.screen === 'design') renderDesign();
      else if (state.screen === 'admin_new') renderAdminNew();
      else renderPick();
    }
    render();
  }


  /* ---------- Hashtags ---------- */
  function buildHash(body) {
    var niches = Object.keys(HASH_PACKS).map(function (k) { return '<option value="' + k + '">' + esc(L('n_' + k)) + '</option>'; }).join('');
    body.innerHTML =
      '<div class="mp-field"><label for="mp-hs-kw">' + esc(L('hs_kw')) + '</label><input type="text" id="mp-hs-kw" class="text-input" maxlength="40" autocomplete="off"></div>' +
      '<div class="mp-field"><label for="mp-hs-niche">' + esc(L('hs_niche')) + '</label><select id="mp-hs-niche" class="text-input">' + niches + '</select></div>' +
      '<div id="mp-hs-out"></div>';
    var kw = $('mp-hs-kw'), niche = $('mp-hs-niche'), out = $('mp-hs-out');
    function render() {
      var tags = makeHashtags(kw.value, niche.value);
      if (!tags.length) { out.innerHTML = '<p class="mp-hint">' + esc(L('hs_empty')) + '</p>'; return; }
      out.innerHTML = '<div class="mp-tags">' + tags.map(function (x) { return '<span class="mp-tag">' + esc(x) + '</span>'; }).join('') + '</div>' +
        '<button type="button" class="btn btn-primary" style="width:100%" id="mp-hs-copy">' + esc(L('hs_copy_all')) + '</button>';
      $('mp-hs-copy').addEventListener('click', function () { copyText(tags.join(' '), $('mp-hs-copy')); });
    }
    kw.addEventListener('input', render);
    niche.addEventListener('change', render);
    render();
  }

  /* ===================================================================
     9. BRANCHEMENT SUR L'EXISTANT + LIENS RAPIDES
     =================================================================== */
  function hookOpenMainMenu() {
    if (typeof root.openMainMenu !== 'function' || root.openMainMenu.__mp) return;
    var orig = root.openMainMenu;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      try { enhanceMenu(); refresh(); } catch (e) { console.warn('[menu-pro]', e); }
      return r;
    };
    wrapped.__mp = true;
    root.openMainMenu = wrapped;
  }

  // Liens rapides ?open=... (capturés tout de suite : script.js peut nettoyer l'URL ensuite)
  var deepLink = null;
  try { deepLink = new URLSearchParams(location.search).get('open'); } catch (e) { /* ignore */ }

  function handleDeepLink() {
    if (!deepLink) return;
    var target = deepLink;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (getUser() && typeof root.openMainMenu === 'function') {
        clearInterval(iv);
        setTimeout(function () {
          try {
            if (target === 'wallet') { call('showDashTab', 'wallet'); return; }
            call('openMainMenu');
            if (target === 'tools') openToolsScreen();
            else if (target === 'plans') openPlansScreen();
            else if (target === 'services') call('showMenuScreen', 'items-services');
          } catch (e) { console.warn('[menu-pro] lien rapide', e); }
        }, 700);
      } else if (tries > 60) clearInterval(iv);
    }, 400);
  }

  /* ---------- Liens profonds : on conserve la destination pendant la connexion ----------
     ?loc=link&t=…  → lien de localisation partagé par un ami
     ?loc=sos|share → notification du Centre de localisation
     ?open= / ?profile= / ?openTab= → ouverts par script.js une fois la personne connectée
     Si la personne n'est pas connectée : on affiche la fenêtre de connexion avec un message
     clair, on garde la destination (même si la page se recharge), puis on l'ouvre. */
  var PENDING_KEY = 'cn_pending_link';
  var qs = null;
  try { qs = new URLSearchParams(location.search); } catch (e) { qs = null; }
  var locLink = qs ? qs.get('loc') : null;
  var locToken = qs ? qs.get('t') : null;
  var needLoginLink = !!(qs && (locLink || qs.get('open') || qs.get('profile') || qs.get('openTab')));
  var locBoot = false;
  try { locBoot = localStorage.getItem('cn_loc_boot') === '1'; } catch (e) { /* ignore */ }
  var pending = null;
  try {
    if (locLink === 'link' && locToken) { pending = { loc: 'link', t: locToken, at: Date.now() }; localStorage.setItem(PENDING_KEY, JSON.stringify(pending)); }
    else if (!locLink) {
      var raw = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      if (raw && raw.t && Date.now() - raw.at < 30 * 60000) pending = raw; else localStorage.removeItem(PENDING_KEY);
    }
  } catch (e) { /* ignore */ }
  function cleanUrlParams(keys) {
    try { var u = new URL(location.href); keys.forEach(function (k) { u.searchParams.delete(k); }); history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); } catch (e) { /* ignore */ }
  }
  function loadHelper(src, mark) {
    if (document.querySelector('script[' + mark + ']')) return;
    var s = document.createElement('script');
    s.src = src; s.async = true; s.setAttribute(mark, '1');
    document.head.appendChild(s);
  }
  function loadAuthGuard() {
    loadHelper('auth-guard.js', 'data-cn-ag');   // connexion plus stable
    loadHelper('pay-guard.js', 'data-cn-pg');    // message clair quand le Mobile Money ne couvre pas le pays
  }
  function promptLoginForLink() {
    var note = pending ? 'Connecte-toi pour voir la position partagée avec toi.' : 'Connecte-toi pour ouvrir ce contenu.';
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (typeof openAuth === 'function' && document.getElementById('google-btn')) {
        clearInterval(t);
        try { var m = document.getElementById('auth-modal'); var open = m && !m.classList.contains('hidden'); if (!open) openAuth('login'); } catch (e) { /* ignore */ }
        setTimeout(function () { try { if (root.CnAuthGuard) root.CnAuthGuard.setContextNote(note); } catch (e) { /* ignore */ } }, 250);
      } else if (tries > 20) clearInterval(t);
    }, 400);
  }
  function handleLocationStartup() {
    loadAuthGuard();
    if (!needLoginLink && !pending && !locBoot) return;
    var tries = 0, asked = false;
    var iv = setInterval(function () {
      tries++;
      if (getUser()) {
        clearInterval(iv);
        try { if (root.CnAuthGuard) root.CnAuthGuard.clearContextNote(); } catch (e) { /* ignore */ }
        if (pending && pending.loc === 'link') {
          try { localStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ }
          cleanUrlParams(['loc', 't']);
          var tk = pending.t;
          withLocationModule(function (lc) { lc.openLink(tk); });
        } else if (locLink) {
          openLocationCenter(locLink === 'sos' ? 'sec' : 'share');
          cleanUrlParams(['loc']);
        } else withLocationModule(function (lc) { lc.boot(); });
      } else {
        if (!asked && tries >= 5 && (pending || needLoginLink)) { asked = true; promptLoginForLink(); }
        if (tries > 600) clearInterval(iv); // ~5 minutes
      }
    }, 500);
  }

  function init() {
    try { enhanceMenu(); refresh(); } catch (e) { console.warn('[menu-pro] init', e); }
    hookOpenMainMenu();
    handleDeepLink();
    handleLocationStartup();
  }

  root.MenuPro = { openLocation: openLocationCenter, openTools: function () { ensureMenuOpen(); openToolsScreen(); }, openPlans: function () { ensureMenuOpen(); openPlansScreen(); }, openTool: openTool, refresh: refresh };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
