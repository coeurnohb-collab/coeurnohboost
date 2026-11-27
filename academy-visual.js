/* =====================================================================
   academy-visual.js — Académie : lecteur audio guidé, « écouter et répéter » (prononciation), schémas dessinés et photos réelles.
   Chargé à la demande par academy-hub.js (ouverture d'une leçon d'auto-étude). Expose window.CNVisual.

   - Voix : synthèse vocale du navigateur (speechSynthesis). Rien n'est envoyé à un serveur, aucun quota.
   - Photos : images libres de Wikipédia (miniatures upload.wikimedia.org), source toujours citée ; si la recherche échoue, rien n'est affiché.
   - Schémas : dessinés ici en SVG à partir de données déjà nettoyées côté serveur (types connus, textes courts) ; aucun HTML venant de l'IA.
   - Tout texte affiché passe par esc() ou textContent. Aucun emoji, aucun dégradé, couleurs = variables de academy-ui.css (--cnh-*).
   - Textes en 8 langues (fr, en, es, it, pt, de, sw, ln).
   ===================================================================== */
(function () {
  'use strict';
  if (window.CNVisual) return;

  /* ---------------------------- Textes ---------------------------- */
  var DICT = {
    fr: { listenAll: 'Écouter la leçon', practice: 'Écouter et répéter', pause: 'Pause', resume: 'Reprendre', close: 'Fermer', prev: 'Précédent', next: 'Suivant', speed: 'Vitesse', slow: 'Lent', normal: 'Normal', fast: 'Rapide', part: '{a} sur {b}', secListen: 'Écouter cette partie', yourTurn: 'À toi : répète à voix haute…', done: 'Lecture terminée', ttsNo: 'La lecture vocale n’est pas disponible sur ce navigateur.', noVoice: 'Aucune voix « {l} » sur cet appareil : la prononciation peut être approximative.', figT: 'Schéma de la leçon', figAuto: 'Schéma des points essentiels', imgSrc: 'Image : Wikipédia', imgsSrc: 'Images : Wikipédia', chipSimple: 'Explique plus simplement', chipExample: 'Un exemple de la vie courante', chipSum: 'Résume en 5 lignes', qSimple: 'Explique cette leçon plus simplement, avec des mots faciles et un exemple.', qExample: 'Donne-moi un exemple concret de la vie courante pour cette leçon.', qSum: 'Résume cette leçon en 5 lignes.', textSize: 'Taille du texte', kTitle: 'Titre', kObj: 'Objectif', kCourse: 'Cours', kKey: 'À retenir', kWords: 'Mots', kPhr: 'Phrases', kSum: 'Résumé', plTitle: 'Lecture de la leçon' },
    en: { listenAll: 'Listen to the lesson', practice: 'Listen and repeat', pause: 'Pause', resume: 'Resume', close: 'Close', prev: 'Previous', next: 'Next', speed: 'Speed', slow: 'Slow', normal: 'Normal', fast: 'Fast', part: '{a} of {b}', secListen: 'Listen to this part', yourTurn: 'Your turn: say it out loud…', done: 'Reading finished', ttsNo: 'Voice playback is not available in this browser.', noVoice: 'No “{l}” voice on this device: pronunciation may be approximate.', figT: 'Lesson diagram', figAuto: 'Diagram of the key points', imgSrc: 'Image: Wikipedia', imgsSrc: 'Images: Wikipedia', chipSimple: 'Explain more simply', chipExample: 'An everyday example', chipSum: 'Summarise in 5 lines', qSimple: 'Explain this lesson more simply, with easy words and an example.', qExample: 'Give me a concrete everyday example for this lesson.', qSum: 'Summarise this lesson in 5 lines.', textSize: 'Text size', kTitle: 'Title', kObj: 'Goal', kCourse: 'Lesson', kKey: 'Key points', kWords: 'Words', kPhr: 'Phrases', kSum: 'Summary', plTitle: 'Lesson audio' },
    es: { listenAll: 'Escuchar la lección', practice: 'Escuchar y repetir', pause: 'Pausa', resume: 'Reanudar', close: 'Cerrar', prev: 'Anterior', next: 'Siguiente', speed: 'Velocidad', slow: 'Lento', normal: 'Normal', fast: 'Rápido', part: '{a} de {b}', secListen: 'Escuchar esta parte', yourTurn: 'Tu turno: repite en voz alta…', done: 'Lectura terminada', ttsNo: 'La lectura en voz alta no está disponible en este navegador.', noVoice: 'No hay voz «{l}» en este dispositivo: la pronunciación puede ser aproximada.', figT: 'Esquema de la lección', figAuto: 'Esquema de los puntos clave', imgSrc: 'Imagen: Wikipedia', imgsSrc: 'Imágenes: Wikipedia', chipSimple: 'Explícalo más sencillo', chipExample: 'Un ejemplo de la vida diaria', chipSum: 'Resume en 5 líneas', qSimple: 'Explica esta lección de forma más sencilla, con palabras fáciles y un ejemplo.', qExample: 'Dame un ejemplo concreto de la vida diaria para esta lección.', qSum: 'Resume esta lección en 5 líneas.', textSize: 'Tamaño del texto', kTitle: 'Título', kObj: 'Objetivo', kCourse: 'Lección', kKey: 'A recordar', kWords: 'Palabras', kPhr: 'Frases', kSum: 'Resumen', plTitle: 'Lectura de la lección' },
    it: { listenAll: 'Ascolta la lezione', practice: 'Ascolta e ripeti', pause: 'Pausa', resume: 'Riprendi', close: 'Chiudi', prev: 'Precedente', next: 'Successivo', speed: 'Velocità', slow: 'Lento', normal: 'Normale', fast: 'Veloce', part: '{a} di {b}', secListen: 'Ascolta questa parte', yourTurn: 'Tocca a te: ripeti ad alta voce…', done: 'Lettura terminata', ttsNo: 'La lettura vocale non è disponibile in questo browser.', noVoice: 'Nessuna voce «{l}» su questo dispositivo: la pronuncia può essere approssimativa.', figT: 'Schema della lezione', figAuto: 'Schema dei punti chiave', imgSrc: 'Immagine: Wikipedia', imgsSrc: 'Immagini: Wikipedia', chipSimple: 'Spiega più semplicemente', chipExample: 'Un esempio di vita quotidiana', chipSum: 'Riassumi in 5 righe', qSimple: 'Spiega questa lezione in modo più semplice, con parole facili e un esempio.', qExample: 'Dammi un esempio concreto di vita quotidiana per questa lezione.', qSum: 'Riassumi questa lezione in 5 righe.', textSize: 'Dimensione del testo', kTitle: 'Titolo', kObj: 'Obiettivo', kCourse: 'Lezione', kKey: 'Da ricordare', kWords: 'Parole', kPhr: 'Frasi', kSum: 'Riepilogo', plTitle: 'Lettura della lezione' },
    pt: { listenAll: 'Ouvir a lição', practice: 'Ouvir e repetir', pause: 'Pausa', resume: 'Retomar', close: 'Fechar', prev: 'Anterior', next: 'Seguinte', speed: 'Velocidade', slow: 'Lento', normal: 'Normal', fast: 'Rápido', part: '{a} de {b}', secListen: 'Ouvir esta parte', yourTurn: 'A tua vez: repete em voz alta…', done: 'Leitura terminada', ttsNo: 'A leitura em voz alta não está disponível neste navegador.', noVoice: 'Não há voz «{l}» neste dispositivo: a pronúncia pode ser aproximada.', figT: 'Esquema da lição', figAuto: 'Esquema dos pontos principais', imgSrc: 'Imagem: Wikipédia', imgsSrc: 'Imagens: Wikipédia', chipSimple: 'Explica mais simples', chipExample: 'Um exemplo do dia a dia', chipSum: 'Resume em 5 linhas', qSimple: 'Explica esta lição de forma mais simples, com palavras fáceis e um exemplo.', qExample: 'Dá-me um exemplo concreto do dia a dia para esta lição.', qSum: 'Resume esta lição em 5 linhas.', textSize: 'Tamanho do texto', kTitle: 'Título', kObj: 'Objetivo', kCourse: 'Lição', kKey: 'A reter', kWords: 'Palavras', kPhr: 'Frases', kSum: 'Resumo', plTitle: 'Leitura da lição' },
    de: { listenAll: 'Lektion anhören', practice: 'Anhören und nachsprechen', pause: 'Pause', resume: 'Fortsetzen', close: 'Schließen', prev: 'Zurück', next: 'Weiter', speed: 'Tempo', slow: 'Langsam', normal: 'Normal', fast: 'Schnell', part: '{a} von {b}', secListen: 'Diesen Abschnitt anhören', yourTurn: 'Du bist dran: sprich laut nach…', done: 'Vorlesen beendet', ttsNo: 'Das Vorlesen ist in diesem Browser nicht verfügbar.', noVoice: 'Keine Stimme „{l}“ auf diesem Gerät: Die Aussprache kann ungenau sein.', figT: 'Schaubild zur Lektion', figAuto: 'Schaubild der wichtigsten Punkte', imgSrc: 'Bild: Wikipedia', imgsSrc: 'Bilder: Wikipedia', chipSimple: 'Einfacher erklären', chipExample: 'Ein Alltagsbeispiel', chipSum: 'In 5 Zeilen zusammenfassen', qSimple: 'Erkläre diese Lektion einfacher, mit leichten Wörtern und einem Beispiel.', qExample: 'Gib mir ein konkretes Alltagsbeispiel zu dieser Lektion.', qSum: 'Fasse diese Lektion in 5 Zeilen zusammen.', textSize: 'Textgröße', kTitle: 'Titel', kObj: 'Ziel', kCourse: 'Lektion', kKey: 'Merken', kWords: 'Wörter', kPhr: 'Sätze', kSum: 'Zusammenfassung', plTitle: 'Lektion vorlesen' },
    sw: { listenAll: 'Sikiliza somo', practice: 'Sikiliza na kurudia', pause: 'Simama kidogo', resume: 'Endelea', close: 'Funga', prev: 'Iliyotangulia', next: 'Inayofuata', speed: 'Kasi', slow: 'Polepole', normal: 'Kawaida', fast: 'Haraka', part: '{a} kati ya {b}', secListen: 'Sikiliza sehemu hii', yourTurn: 'Zamu yako: rudia kwa sauti…', done: 'Usomaji umekwisha', ttsNo: 'Usomaji kwa sauti haupatikani kwenye kivinjari hiki.', noVoice: 'Hakuna sauti ya «{l}» kwenye kifaa hiki: matamshi yanaweza kutofautiana.', figT: 'Mchoro wa somo', figAuto: 'Mchoro wa mambo muhimu', imgSrc: 'Picha: Wikipedia', imgsSrc: 'Picha: Wikipedia', chipSimple: 'Eleza kwa urahisi zaidi', chipExample: 'Mfano wa maisha ya kila siku', chipSum: 'Fupisha kwa mistari 5', qSimple: 'Eleza somo hili kwa urahisi zaidi, kwa maneno rahisi na mfano.', qExample: 'Nipe mfano halisi wa maisha ya kila siku kwa somo hili.', qSum: 'Fupisha somo hili kwa mistari 5.', textSize: 'Ukubwa wa maandishi', kTitle: 'Kichwa', kObj: 'Lengo', kCourse: 'Somo', kKey: 'Ya kukumbuka', kWords: 'Maneno', kPhr: 'Sentensi', kSum: 'Muhtasari', plTitle: 'Usomaji wa somo' },
    ln: { listenAll: 'Yoka lisolo', practice: 'Yoka mpe pesa lisusu', pause: 'Telema', resume: 'Koba', close: 'Kanga', prev: 'Ya liboso', next: 'Oyo elandi', speed: 'Mbangu', slow: 'Malembe', normal: 'Ya ntango nyonso', fast: 'Noki', part: '{a} na {b}', secListen: 'Yoka eteni oyo', yourTurn: 'Ezali mokolo na yo: pesa lisusu na mingongo makasi…', done: 'Kotánga esili', ttsNo: 'Kotánga na mingongo ezali te na navigateur oyo.', noVoice: 'Mingongo ya « {l} » ezali te na appareil oyo: kolobela ekoki kozala pembeni.', figT: 'Elilingi ya lisolo', figAuto: 'Elilingi ya makambo ya ntina', imgSrc: 'Elilingi: Wikipédia', imgsSrc: 'Bilili: Wikipédia', chipSimple: 'Limbola na pɛtɛɛ', chipExample: 'Ndakisa ya bomoi ya mokolo na mokolo', chipSum: 'Pesa mokuse na milongo 5', qSimple: 'Limbola lisolo oyo na pɛtɛɛ, na maloba ya pɛtɛɛ mpe ndakisa moko.', qExample: 'Pesa ngai ndakisa ya solo ya bomoi ya mokolo na mokolo mpo na lisolo oyo.', qSum: 'Pesa mokuse ya lisolo oyo na milongo 5.', textSize: 'Monene ya makomi', kTitle: 'Titre', kObj: 'Mokano', kCourse: 'Cours', kKey: 'Oyo ya kobosana te', kWords: 'Maloba', kPhr: 'Ba phrases', kSum: 'Mokuse', plTitle: 'Kotánga lisolo' }
  };
  var UI_TAGS = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', de: 'de-DE', sw: 'sw-KE', ln: 'fr-CD' };

  function lang() { try { if (typeof currentLang !== 'undefined' && currentLang && DICT[currentLang]) return currentLang; } catch (e) { /* ignore */ } return 'fr'; }
  function T(k, v) {
    var s = (DICT[lang()] && DICT[lang()][k]) || DICT.en[k] || DICT.fr[k] || '';
    if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]);
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { try { if (typeof showToast === 'function') showToast(m, 'info'); } catch (e) { /* ignore */ } }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9À-￿ ]+/gi, ' ').replace(/\s+/g, ' ').trim(); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------------------------- Icônes (SVG) ---------------------------- */
  var ICO = {
    play: '<path d="M8 5v14l11-7z"/>', pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
    prev: '<path d="M6 5v14M19 5v14L9 12z"/>', next: '<path d="M18 5v14M5 5v14l10-7z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>', volume: '<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', repeat: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>'
  };
  function ico(n, size) { return '<svg class="cnv-ico" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[n] || '') + '</svg>'; }

  /* =====================================================================
     1. SCHÉMAS EN SVG
     Types : steps (étapes), timeline (repères), cycle, compare (2 colonnes), tree (idée centrale + branches).
     ===================================================================== */
  var W = 340;
  function wrap(text, maxChars, maxLines) {
    var words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) {
      while (w.length > maxChars) {
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, maxChars - 1) + '-'); w = w.slice(maxChars - 1);
      }
      if (!cur) cur = w; else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      lines[maxLines - 1] = (last.length > maxChars - 1 ? last.slice(0, maxChars - 1) : last).replace(/[\s,;:.-]+$/, '') + '…';
    }
    return lines;
  }
  function tb(lines, x, y, cls, lh, anchor) {
    return '<text class="' + cls + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + lines.map(function (l, i) { return '<tspan x="' + x + '" dy="' + (i ? lh : 0) + '">' + esc(l) + '</tspan>'; }).join('') + '</text>';
  }
  function r1(n) { return Math.round(n * 10) / 10; }

  // Etapes (steps) ou repères (timeline) : une colonne, pastille à gauche reliée par un trait.
  function drawList(d, dots) {
    var nodes = d.nodes, cardX = 46, cardW = W - cardX - 8, y = 8, parts = [], marks = [], centers = [];
    nodes.forEach(function (n, i) {
      var lab = wrap(n.label, 33, 2), det = n.detail ? wrap(n.detail, 39, 3) : [];
      var h = 16 + lab.length * 17 + (det.length ? 4 + det.length * 15 : 0) + 8, cy = y + (dots ? 22 : 24);
      centers.push(cy);
      parts.push('<rect class="bx" x="' + cardX + '" y="' + y + '" width="' + cardW + '" height="' + h + '" rx="12"/>' +
        tb(lab, cardX + 14, y + 25, 'tl', 17) + (det.length ? tb(det, cardX + 14, y + 25 + (lab.length - 1) * 17 + 19, 'td', 15) : ''));
      marks.push(dots ? '<circle class="ac" cx="18" cy="' + cy + '" r="6"/>' : '<circle class="ac" cx="18" cy="' + cy + '" r="14"/><text class="tn" x="18" y="' + (cy + 5) + '" text-anchor="middle">' + (i + 1) + '</text>');
      y += h + 10;
    });
    var line = centers.length > 1 ? '<line class="ln" x1="18" y1="' + centers[0] + '" x2="18" y2="' + centers[centers.length - 1] + '"/>' : '';
    return { h: y - 2, body: line + parts.join('') + marks.join('') };
  }
  function drawCycle(d) {
    var n = d.nodes.length, cx = W / 2, cy = 172, R = 112, bw = 108, bh = 46, parts = [], arrows = [];
    parts.push('<circle class="ring" cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>');
    var ang = function (i) { return -Math.PI / 2 + i * 2 * Math.PI / n; };
    for (var i = 0; i < n; i++) {
      var a = ang(i), nx = cx + R * Math.cos(a), ny = cy + R * Math.sin(a);
      var mid = a + Math.PI / n, mx = cx + R * Math.cos(mid), my = cy + R * Math.sin(mid), rot = mid * 180 / Math.PI + 90;
      arrows.push('<path class="ac" d="M-6,-5 L6,0 L-6,5 Z" transform="translate(' + r1(mx) + ' ' + r1(my) + ') rotate(' + r1(rot) + ')"/>');
      var lab = wrap(d.nodes[i].label, 13, 2);
      parts.push('<rect class="bx hd" x="' + r1(nx - bw / 2) + '" y="' + r1(ny - bh / 2) + '" width="' + bw + '" height="' + bh + '" rx="12"/>' +
        tb(lab, r1(nx), r1(ny - (lab.length - 1) * 7.5 + 4.5), 'tw', 15, 'middle'));
    }
    return { h: cy * 2 - 2, body: parts.join('') + arrows.join('') };
  }
  function drawCompare(d) {
    var colW = (W - 8 * 3) / 2, cols = [], maxH = 0;
    d.nodes.slice(0, 2).forEach(function (n) {
      var head = wrap(n.label, 17, 2), items = String(n.detail || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4), body = [], bh = 12;
      items.forEach(function (it) { var l = wrap(it, 20, 3); body.push(l); bh += l.length * 15 + 8; });
      cols.push({ head: head, body: body, hh: 14 + head.length * 17 + 6, bh: Math.max(bh, 40) });
    });
    cols.forEach(function (c) { maxH = Math.max(maxH, c.hh + c.bh); });
    var out = '';
    cols.forEach(function (c, i) {
      var x = 8 + i * (colW + 8), y = 8, by = y + c.hh;
      out += '<rect class="bx hd" x="' + x + '" y="' + y + '" width="' + colW + '" height="' + c.hh + '" rx="12"/>' + tb(c.head, x + colW / 2, y + 24, 'tw', 17, 'middle') +
        '<rect class="bx" x="' + x + '" y="' + (by - 8) + '" width="' + colW + '" height="' + (maxH - c.hh + 8) + '" rx="12"/>';
      var ty = by + 12;
      c.body.forEach(function (l) { out += '<circle class="ac" cx="' + (x + 12) + '" cy="' + (ty - 4) + '" r="2.5"/>' + tb(l, x + 22, ty, 'td2', 15); ty += l.length * 15 + 8; });
    });
    return { h: maxH + 16, body: out };
  }
  function drawTree(d, single) {
    var title = wrap(d.title || '', single ? 36 : 30, 3), y = 8, out = '', n = d.nodes.length, top;
    var ch = title.length ? 18 + title.length * 18 : 0;
    if (title.length) {
      var tx0 = single ? 8 : 40, tw0 = single ? W - 16 : W - 80;
      out += '<rect class="bx hd" x="' + tx0 + '" y="' + y + '" width="' + tw0 + '" height="' + ch + '" rx="14"/>' + tb(title, W / 2, y + 26, 'tw', 18, 'middle');
      y += ch;
    }
    top = y;
    var trunkX = single ? 18 : W / 2, cardW = single ? W - 34 - 8 : 150, cards = [], layout = [], i;
    var meas = d.nodes.map(function (nd) {
      var lab = wrap(nd.label, single ? 38 : 16, 4), det = nd.detail ? wrap(nd.detail, single ? 44 : 19, 3) : [];
      return { lab: lab, det: det, h: 14 + lab.length * 16 + (det.length ? 4 + det.length * 14 : 0) + 8 };
    });
    if (single) for (i = 0; i < n; i++) layout.push([i]); else for (i = 0; i < n; i += 2) layout.push(i + 1 < n ? [i, i + 1] : [i]);
    y += 14;
    var firstCy = null, lastCy = null;
    layout.forEach(function (row) {
      var rh = 0; row.forEach(function (k) { rh = Math.max(rh, meas[k].h); });
      var cy = y + Math.min(rh / 2, 26);
      row.forEach(function (k, pos) {
        var m = meas[k], x = single ? 34 : (pos === 0 ? 8 : W - 8 - cardW), edge = single ? 34 : (pos === 0 ? 8 + cardW : W - 8 - cardW);
        cards.push('<line class="ln" x1="' + trunkX + '" y1="' + cy + '" x2="' + edge + '" y2="' + cy + '"/>' +
          '<rect class="bx" x="' + x + '" y="' + y + '" width="' + cardW + '" height="' + rh + '" rx="12"/>' +
          tb(m.lab, x + 12, y + 22, 'tl2', 16) + (m.det.length ? tb(m.det, x + 12, y + 22 + (m.lab.length - 1) * 16 + 17, 'td', 14) : ''));
      });
      if (firstCy === null) firstCy = cy;
      lastCy = cy; y += rh + 10;
    });
    var trunk = lastCy === null ? '' : '<line class="ln" x1="' + trunkX + '" y1="' + (title.length ? top : firstCy) + '" x2="' + trunkX + '" y2="' + lastCy + '"/>';
    return { h: y - 2, body: trunk + cards.join('') + out };
  }
  var DTYPES = { steps: 1, timeline: 1, cycle: 1, compare: 1, tree: 1 };
  function diagramSvg(d, opts) {
    if (!d || !DTYPES[d.type] || !Array.isArray(d.nodes) || d.nodes.length < (d.type === 'compare' ? 2 : 3)) return '';
    var nodes = d.nodes.slice(0, 6).map(function (n) { return { label: String(n && n.label || ''), detail: String(n && n.detail || '') }; }).filter(function (n) { return n.label; });
    if (nodes.length < (d.type === 'compare' ? 2 : 3)) return '';
    var dd = { type: d.type, title: String(d.title || ''), nodes: nodes }, g;
    if (d.type === 'steps') g = drawList(dd, false);
    else if (d.type === 'timeline') g = drawList(dd, true);
    else if (d.type === 'cycle') g = drawCycle(dd);
    else if (d.type === 'compare') g = drawCompare(dd);
    else g = drawTree(dd, !!(opts && opts.single));
    var label = dd.title || nodes.map(function (n) { return n.label; }).join(', ');
    return '<svg class="cnv-svg" viewBox="0 0 ' + W + ' ' + Math.ceil(g.h) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(label) + '" preserveAspectRatio="xMidYMid meet"><title>' + esc(label) + '</title>' + g.body + '</svg>';
  }
  // Pour les leçons déjà créées (sans schéma enregistré) : carte des points essentiels, construite à partir de « À retenir ».
  function autoDiagram(l) {
    var kp = (l && l.keyPoints || []).filter(function (k) { return typeof k === 'string' && k.trim(); }).slice(0, 6);
    if (kp.length < 3) return null;
    return { type: 'tree', title: String(l.title || ''), nodes: kp.map(function (k) { return { label: k.replace(/\*\*/g, '').replace(/`/g, ''), detail: '' }; }) };
  }

  /* =====================================================================
     2. PHOTOS RÉELLES (Wikipédia, images libres)
     ===================================================================== */
  var IMG_KEY = 'cnv_img_v1', IMG_MAX = 160, TTL_OK = 30 * 864e5, TTL_NO = 3 * 864e5, imgCache = null;
  function cacheLoad() { if (imgCache) return imgCache; try { imgCache = JSON.parse(lsGet(IMG_KEY) || '{}') || {}; } catch (e) { imgCache = {}; } return imgCache; }
  function cacheSave() {
    try {
      var c = cacheLoad(), keys = Object.keys(c);
      if (keys.length > IMG_MAX) keys.sort(function (a, b) { return (c[a].at || 0) - (c[b].at || 0); }).slice(0, keys.length - IMG_MAX).forEach(function (k) { delete c[k]; });
      lsSet(IMG_KEY, JSON.stringify(c));
    } catch (e) { /* ignore */ }
  }
  function okThumb(u) { return typeof u === 'string' && /^https:\/\/upload\.wikimedia\.org\/[A-Za-z0-9_\-\/.%(),'~+:@!*]{4,400}$/.test(u); }
  function okPage(u, code) { return typeof u === 'string' && u.indexOf('https://' + code + '.wikipedia.org/') === 0 && u.length < 400 && !/[\s"'<>]/.test(u); }
  var WIKI_CODES = { fr: 1, en: 1, es: 1, it: 1, pt: 1, de: 1, sw: 1, ln: 1 };
  function wikiApi(code, params) {
    var qs = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return 'https://' + code + '.wikipedia.org/w/api.php?format=json&formatversion=2&origin=*&' + qs;
  }
  var PROPS = { prop: 'pageimages|pageprops|info', inprop: 'url', ppprop: 'disambiguation', piprop: 'thumbnail', pithumbsize: '560', pilicense: 'free', redirects: '1' };
  function getJson(url) {
    return new Promise(function (resolve) {
      var done = false, ctl = window.AbortController ? new AbortController() : null;
      var tm = setTimeout(function () { if (ctl) { try { ctl.abort(); } catch (e) { /* ignore */ } } fin(null); }, 9000);
      function fin(v) { if (done) return; done = true; clearTimeout(tm); resolve(v); }
      try {
        fetch(url, { referrerPolicy: 'no-referrer', credentials: 'omit', signal: ctl ? ctl.signal : undefined })
          .then(function (r) { return r.ok ? r.json() : null; }).then(fin, function () { fin(null); });
      } catch (e) { fin(null); }
    });
  }
  // Lecture d'une réponse Wikipédia : première page utile (miniature libre, pas une page d'homonymie).
  // strict = le titre (ou la redirection) doit être EXACTEMENT le mot cherché ; sinon on accepte la page désignée par l'IA.
  function parseWiki(j, term, code, strict) {
    var q = j && j.query; if (!q || !Array.isArray(q.pages)) return null;
    var want = norm(term), froms = {};
    (q.redirects || []).forEach(function (r) { if (r && r.from && r.to) froms[norm(r.to)] = (froms[norm(r.to)] || []).concat([norm(r.from)]); });
    var pages = q.pages.slice().sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      if (!p || p.missing || (p.pageprops && p.pageprops.disambiguation !== undefined)) continue;
      var th = p.thumbnail && p.thumbnail.source;
      if (!okThumb(th) || !okPage(p.fullurl, code)) continue;
      var t = norm(p.title);
      var exact = t === want || (froms[t] || []).indexOf(want) >= 0;
      if (strict && !exact) continue;
      if (!strict && !exact && t.indexOf(want) < 0 && want.indexOf(t) < 0) continue;
      return { url: th, title: String(p.title || '').slice(0, 120), page: p.fullurl };
    }
    return null;
  }
  var queue = [], active = 0;
  function pump() { while (active < 3 && queue.length) { active++; queue.shift()(); } }
  function enqueue(fn) {
    return new Promise(function (resolve) {
      queue.push(function () { var p; try { p = fn(); } catch (e) { p = Promise.resolve(null); } p.then(resolve, function () { resolve(null); }).then(function () { active--; pump(); }); });
      pump();
    });
  }
  // photo('Apple', 'en', false) -> Promise<{url,title,page,code}|null> ; résultats (positifs et négatifs) gardés sur l'appareil.
  function photo(term, code, strict) {
    term = String(term || '').trim();
    if (!term || term.length > 80 || !WIKI_CODES[code]) return Promise.resolve(null);
    var key = code + '|' + norm(term) + (strict ? '|s' : ''), c = cacheLoad(), hit = c[key], now = Date.now();
    if (hit && now - (hit.at || 0) < (hit.n ? TTL_NO : TTL_OK)) return Promise.resolve(hit.n ? null : { url: hit.u, title: hit.t, page: hit.p, code: code });
    return enqueue(function () {
      return getJson(wikiApi(code, Object.assign({ action: 'query', titles: term }, PROPS))).then(function (j) {
        var r = parseWiki(j, term, code, strict);
        if (r || strict) return r;
        return getJson(wikiApi(code, Object.assign({ action: 'query', generator: 'search', gsrsearch: term, gsrlimit: '3', gsrnamespace: '0' }, PROPS))).then(function (j2) { return parseWiki(j2, term, code, false); });
      }).then(function (r) {
        var cc = cacheLoad();
        if (r) cc[key] = { u: r.url, t: r.title, p: r.page, at: Date.now() };
        else if (!(hit && hit.n === 0)) cc[key] = { n: 1, at: Date.now() };
        cacheSave();
        return r ? { url: r.url, title: r.title, page: r.page, code: code } : null;
      });
    });
  }

  /* =====================================================================
     3. VOIX : synthèse vocale + lecteur guidé
     ===================================================================== */
  var V = { tok: 0, rate: 0.9, warned: {}, u: null, wake: null };
  function ttsOk() { try { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); } catch (e) { return false; } }
  function pickVoice(tag) {
    try {
      var vs = window.speechSynthesis.getVoices() || [], t0 = String(tag || '').toLowerCase().replace('_', '-'), b = t0.split('-')[0], best = null, score = -1;
      vs.forEach(function (v) {
        var l = String(v.lang || '').toLowerCase().replace('_', '-'), s = -1;
        if (l === t0) s = 3; else if (l.split('-')[0] === b) s = 2;
        if (s < 0) return;
        if (/google|natural|neural|online/i.test(v.name || '')) s += 0.5;
        if (s > score) { score = s; best = v; }
      });
      return { voice: best, any: vs.length > 0 };
    } catch (e) { return { voice: null, any: false }; }
  }
  function cleanSpeech(t) {
    return String(t == null ? '' : t).replace(/```[\s\S]*?```/g, ' ').replace(/\|/g, ' ').replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/^\s*[-*•]\s+/gm, '').replace(/^\s*\d+[.)]\s+/gm, '').replace(/[*_`>]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Découpe un texte en groupes de phrases d'au plus `max` caractères (affichage lisible + lecture sans coupure).
  function sentences(t, max) {
    var s = cleanSpeech(t), out = [], cur = '';
    if (!s) return out;
    s.replace(/([.!?…])\s+/g, '$1\u0001').split('\u0001').forEach(function (p) {
      if (!p) return;
      if (cur && (cur + ' ' + p).length > max) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p;
    });
    if (cur) out.push(cur);
    return out.reduce(function (acc, x) { while (x.length > max + 60) { var k = x.lastIndexOf(' ', max); if (k < 40) k = max; acc.push(x.slice(0, k)); x = x.slice(k).trim(); } if (x) acc.push(x); return acc; }, []);
  }
  function chunks(t) { return sentences(t, 170); }
  function say(text, tag, rate, token, done) {
    var parts = chunks(text), i = 0, pv = pickVoice(tag);
    if (!parts.length) { done(); return; }
    if (tag && pv.any && !pv.voice && !V.warned[tag]) { V.warned[tag] = 1; toast(T('noVoice', { l: tag })); }
    (function next() {
      if (token !== V.tok) return;
      if (i >= parts.length) { done(); return; }
      var u = new SpeechSynthesisUtterance(parts[i++]);
      u.lang = tag || UI_TAGS[lang()]; u.rate = rate;
      if (pv.voice) u.voice = pv.voice;
      u.onend = next;
      u.onerror = function () { if (token === V.tok) done(); };
      V.u = u;
      try { window.speechSynthesis.speak(u); } catch (e) { done(); }
    })();
  }
  function wakeOn() { try { if (navigator.wakeLock && !V.wake) navigator.wakeLock.request('screen').then(function (w) { V.wake = w; w.addEventListener('release', function () { V.wake = null; }); }, function () { /* ignore */ }); } catch (e) { /* ignore */ } }
  function wakeOff() { try { if (V.wake) { V.wake.release(); V.wake = null; } } catch (e) { /* ignore */ } }

  var P = null; // lecteur en cours : { items, i, playing, scope, mode, el }
  var RATES = [0.75, 0.9, 1.1];
  function item(kind, label, show, sub, parts) { return { kind: kind, label: label, show: show, sub: sub || '', parts: parts }; }
  function pauseFor(text) { return Math.max(2200, Math.min(9000, 1500 + String(text || '').length * 95)); }
  // Texte Markdown du cours -> éléments de lecture (titres = étiquettes, tableaux et code ignorés).
  function mdItems(src, ui) {
    var out = [], label = T('kCourse');
    String(src || '').replace(/\r/g, '').split('```').forEach(function (blk, bi) {
      if (bi % 2 === 1) return;
      blk.split('\n').forEach(function (line) {
        var s = line.trim();
        if (!s || s.charAt(0) === '|') return;
        var h = /^#{1,4}\s+(.*)$/.exec(s);
        if (h) { label = cleanSpeech(h[1]) || label; return; }
        sentences(s, 230).forEach(function (x) { out.push(item('course', label, x, '', [{ text: x, tag: ui }])); });
      });
    });
    return out;
  }
  function lessonItems(l) {
    var ui = UI_TAGS[lang()], sp = l.speechLang || '', out = [], slow = RATES[0];
    if (l.title) out.push(item('title', T('kTitle'), cleanSpeech(l.title), '', [{ text: cleanSpeech(l.title), tag: ui }]));
    if (l.objective) sentences(l.objective, 230).forEach(function (x) { out.push(item('obj', T('kObj'), x, '', [{ text: x, tag: ui }])); });
    mdItems(l.content, ui).forEach(function (x) { out.push(x); });
    (l.keyPoints || []).forEach(function (k, i) { var x = cleanSpeech(k); if (x) out.push(item('key', T('kKey'), x, '', i === 0 ? [{ text: T('kKey') + '.', tag: ui }, { text: x, tag: ui }] : [{ text: x, tag: ui }])); });
    (l.vocabulary || []).forEach(function (v) {
      if (!v.term) return;
      out.push(item('words', T('kWords'), v.term, v.meaning || '', sp ? [{ text: v.term, tag: sp, rate: slow }, { text: v.meaning || '', tag: ui }] : [{ text: v.term + '. ' + (v.meaning || ''), tag: ui }]));
    });
    (l.phrases || []).forEach(function (p) {
      if (!p.text) return;
      out.push(item('phr', T('kPhr'), p.text, p.translation || '', [{ text: p.text, tag: sp || ui, rate: sp ? slow : undefined }, { text: p.translation || '', tag: ui }]));
    });
    if (l.summary) sentences(l.summary, 230).forEach(function (x, i) { out.push(item('sum', T('kSum'), x, '', i === 0 ? [{ text: T('kSum') + '.', tag: ui }, { text: x, tag: ui }] : [{ text: x, tag: ui }])); });
    return out;
  }
  // « Écouter et répéter » : lent, pause pour répéter, vitesse naturelle, puis la traduction.
  function practiceItems(l) {
    var ui = UI_TAGS[lang()], sp = l.speechLang || '', out = [];
    if (!sp) return out;
    (l.phrases || []).forEach(function (p) {
      if (!p.text) return;
      out.push(item('phr', T('kPhr'), p.text, [p.phonetic, p.translation].filter(Boolean).join(' — '), [
        { text: p.text, tag: sp, rate: 0.7 }, { pause: pauseFor(p.text), repeat: true }, { text: p.text, tag: sp, rate: 0.95 }, { text: p.translation || '', tag: ui }]));
    });
    (l.vocabulary || []).forEach(function (v) {
      if (!v.term) return;
      out.push(item('words', T('kWords'), v.term, [v.phonetic ? '/' + v.phonetic + '/' : '', v.meaning].filter(Boolean).join(' — '), [
        { text: v.term, tag: sp, rate: 0.7 }, { pause: pauseFor(v.term), repeat: true }, { text: v.term, tag: sp, rate: 0.95 }, { text: v.meaning || '', tag: ui }]));
    });
    return out;
  }

  function el(id) { return document.getElementById(id); }
  function playerHtml() {
    return '<div class="cnv-pl-top"><span class="cnv-pl-kind" id="cnv-kind"></span><span class="cnv-pl-n" id="cnv-n"></span><button type="button" class="cnv-pl-x" data-cnv="stop" aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div>' +
      '<p class="cnv-pl-txt" id="cnv-txt" aria-live="polite"></p><p class="cnv-pl-sub" id="cnv-sub"></p>' +
      '<div class="cnv-pl-bar"><i id="cnv-bar"></i></div>' +
      '<div class="cnv-pl-ctl"><button type="button" class="cnv-pl-b" data-cnv="prev" aria-label="' + esc(T('prev')) + '">' + ico('prev', 20) + '</button>' +
      '<button type="button" class="cnv-pl-b big" id="cnv-pp" data-cnv="pp" aria-label="' + esc(T('pause')) + '">' + ico('pause', 24) + '</button>' +
      '<button type="button" class="cnv-pl-b" data-cnv="next" aria-label="' + esc(T('next')) + '">' + ico('next', 20) + '</button>' +
      '<button type="button" class="cnv-pl-rate" id="cnv-rate" data-cnv="rate" aria-label="' + esc(T('speed')) + '"></button></div>';
  }
  function rateLabel() { return T(V.rate < 0.8 ? 'slow' : V.rate > 1 ? 'fast' : 'normal'); }
  function paint() {
    if (!P) return;
    var it = P.items[P.i]; if (!it) return;
    var k = el('cnv-kind'), n = el('cnv-n'), tx = el('cnv-txt'), sb = el('cnv-sub'), bar = el('cnv-bar'), pp = el('cnv-pp'), rt = el('cnv-rate');
    if (k) k.textContent = it.label || '';
    if (n) n.textContent = T('part', { a: P.i + 1, b: P.items.length });
    if (tx) tx.textContent = it.show;
    if (sb) sb.textContent = P.repeat ? T('yourTurn') : (it.sub || '');
    if (bar) bar.style.width = Math.round((P.i + 1) / P.items.length * 100) + '%';
    if (rt) rt.textContent = rateLabel();
    if (pp) { pp.innerHTML = ico(P.playing ? 'pause' : 'play', 24); pp.setAttribute('aria-label', T(P.playing ? 'pause' : 'resume')); }
    if (P.el) P.el.classList.toggle('repeat', !!P.repeat);
  }
  function finish() {
    if (!P) return;
    P.playing = false; P.repeat = false; P.finished = true; wakeOff();
    var tx = el('cnv-txt'), sb = el('cnv-sub'), pp = el('cnv-pp');
    if (tx) tx.textContent = T('done');
    if (sb) sb.textContent = '';
    if (pp) { pp.innerHTML = ico('repeat', 22); pp.setAttribute('aria-label', T('resume')); }
    if (P.el) P.el.classList.remove('repeat');
  }
  function run(token) {
    if (!P || token !== V.tok) return;
    var it = P.items[P.i];
    if (!it) { finish(); return; }
    P.repeat = false; paint();
    var k = 0;
    (function step() {
      if (!P || token !== V.tok) return;
      var pt = it.parts[k++];
      if (!pt) {
        P.i++;
        if (P.i >= P.items.length) { finish(); return; }
        P.timer = setTimeout(function () { run(token); }, 220);
        return;
      }
      if (pt.pause) { P.repeat = true; paint(); P.timer = setTimeout(function () { if (P) { P.repeat = false; paint(); } step(); }, pt.pause); return; }
      if (!pt.text) { step(); return; }
      say(pt.text, pt.tag, pt.rate ? pt.rate * (V.rate / 0.9) : V.rate, token, step);
    })();
  }
  function hush() { V.tok++; if (P && P.timer) { clearTimeout(P.timer); P.timer = null; } try { if (ttsOk()) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  function restart(delay) { hush(); var token = V.tok; if (!P) return; P.playing = true; P.finished = false; wakeOn(); paint(); setTimeout(function () { run(token); }, delay == null ? 90 : delay); }
  function stop(scope) {
    if (!P) return;
    if (scope && P.scope !== scope) return;
    hush(); wakeOff();
    if (P && P.el && P.el.parentNode) P.el.parentNode.removeChild(P.el);
    document.documentElement.classList.remove('cnv-playing');
    P = null;
  }
  function openPlayer(items, opts) {
    if (!ttsOk()) { toast(T('ttsNo')); return false; }
    if (!items || !items.length) return false;
    stop();
    var box = document.createElement('div');
    box.id = 'cnv-player'; box.className = 'cnv-player cnh-root'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', T('plTitle'));
    box.innerHTML = playerHtml();
    document.body.appendChild(box);
    document.documentElement.classList.add('cnv-playing');
    P = { items: items, i: 0, playing: true, scope: (opts && opts.scope) || 'fs', el: box, timer: null, repeat: false, finished: false };
    restart(40);
    return true;
  }
  function playLesson(l, opts) { return openPlayer(lessonItems(l || {}), opts); }
  function playPractice(l, opts) { return openPlayer(practiceItems(l || {}), opts); }
  function playSection(label, texts, opts) {
    var ui = UI_TAGS[lang()], items = [];
    texts.forEach(function (t) { sentences(t, 230).forEach(function (x) { items.push(item('course', label, x, '', [{ text: x, tag: ui }])); }); });
    if (label) items.unshift(item('course', label, label, '', [{ text: label, tag: ui }]));
    return openPlayer(items, opts);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && P && P.playing) { P.playing = false; hush(); wakeOff(); paint(); } });
  window.addEventListener('pagehide', function () { stop(); });

  /* =====================================================================
     4. ILLUSTRATION D'UNE LEÇON (hydratation de l'écran déjà dessiné par academy-hub.js)
     ===================================================================== */
  var CUR = null;
  function imgTag(src, alt, cls) { return '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">'; }
  function figures(root, ctx) {
    var l = ctx.lesson, md = root.querySelector('.cnh-md'); if (!md || root.querySelector('.cnv-figs')) return;
    var host = document.createElement('div'); host.className = 'cnv-figs';
    var d = l.diagram && diagramSvg(l.diagram) ? { svg: diagramSvg(l.diagram), t: T('figT') } : null, auto = false;
    if (!d) { var ad = autoDiagram(l), s = ad && diagramSvg(ad, { single: true }); if (s) { d = { svg: s, t: T('figAuto') }; auto = true; } }
    if (d) host.insertAdjacentHTML('beforeend', '<figure class="cnv-fig"><figcaption class="cnv-fig-t">' + esc(d.t) + '</figcaption><div class="cnv-fig-b' + (auto ? ' auto' : '') + '">' + d.svg + '</div></figure>');
    if (!host.firstChild && !(l.visual && l.visual.query)) return;
    md.parentNode.insertBefore(host, md);
    if (l.visual && l.visual.query) {
      var slot = document.createElement('figure'); slot.className = 'cnv-fig cnv-photo loading'; slot.innerHTML = '<div class="cnv-ph"></div>';
      host.insertBefore(slot, host.firstChild);
      photo(l.visual.query, 'en', false).then(function (r) {
        if (!slot.parentNode) return;
        if (!r || !okPage(r.page, r.code)) { slot.remove(); if (!host.firstChild) host.remove(); return; }
        slot.classList.remove('loading');
        slot.innerHTML = '<div class="cnv-ph">' + imgTag(r.url, l.visual.caption || r.title, 'cnv-img') + '</div><figcaption class="cnv-cap"><span>' + esc(l.visual.caption || r.title) + '</span><a href="' + esc(r.page) + '" target="_blank" rel="noopener noreferrer">' + esc(T('imgSrc')) + '</a></figcaption>';
        var im = slot.querySelector('img'); if (im) im.addEventListener('error', function () { slot.remove(); if (!host.firstChild) host.remove(); });
      });
    }
  }
  function vocabPics(root, ctx) {
    var cards = [].slice.call(root.querySelectorAll('.cnh-vi')); if (!cards.length) return;
    var vocab = ctx.lesson.vocabulary || [], loaded = 0, credit = false;
    function creditOnce() {
      if (credit) return; credit = true;
      var grid = root.querySelector('.cnh-vocab'); if (!grid || root.querySelector('.cnv-credit')) return;
      var p = document.createElement('p'); p.className = 'cnh-hint cnv-credit'; p.textContent = T('imgsSrc'); grid.parentNode.insertBefore(p, grid.nextSibling);
    }
    function fill(card, v) {
      var code, term, strict;
      if (v.img) { code = 'en'; term = v.img; strict = false; }
      else if (v.img === '') return; // l'IA a décidé : mot abstrait ou non photographiable
      else {
        // Leçons créées avant les images : on ne montre une photo que si le sens est UN mot courant ET que la page porte exactement ce nom.
        var m = String(v.meaning || '').trim();
        if (!ctx.lesson.speechLang || !/^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'’ -]{1,23}$/.test(m) || m.split(' ').length > 2) return;
        code = WIKI_CODES[lang()] ? lang() : 'en'; term = m; strict = true;
      }
      photo(term, code, strict).then(function (r) {
        if (!r || !card.parentNode || card.querySelector('.cnv-vimg')) return;
        var sp = document.createElement('span'); sp.className = 'cnv-vimg'; sp.innerHTML = imgTag(r.url, v.term || term, 'cnv-vi-img');
        var im = sp.firstChild; im.addEventListener('error', function () { sp.remove(); card.classList.remove('has-img'); });
        card.insertBefore(sp, card.firstChild); card.classList.add('has-img'); loaded++; creditOnce();
      });
    }
    var io = window.IntersectionObserver ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); var i = cards.indexOf(e.target); if (vocab[i]) fill(e.target, vocab[i]); } });
    }, { rootMargin: '240px 0px' }) : null;
    cards.forEach(function (c, i) { if (!vocab[i]) return; if (io) io.observe(c); else fill(c, vocab[i]); });
  }
  function sections(root, ctx) {
    var md = root.querySelector('.cnh-md'); if (!md || !ttsOk()) return;
    [].forEach.call(md.querySelectorAll('h4'), function (h, i) {
      if (h.querySelector('.cnv-spk')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cnh-spk sm cnv-spk'; b.setAttribute('data-cnv', 'sec'); b.setAttribute('data-i', String(i));
      b.setAttribute('aria-label', T('secListen')); b.innerHTML = ico('volume', 15); h.appendChild(b);
    });
  }
  function tools(root, ctx) {
    var bar = root.querySelector('.cnh-tools'); if (!bar || bar.querySelector('[data-cnv="size"]')) return;
    var l = ctx.lesson;
    if (ttsOk() && l.speechLang && ((l.phrases || []).length || (l.vocabulary || []).length)) {
      var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'cnh-chip'; pb.setAttribute('data-cnv', 'practice');
      pb.innerHTML = ico('repeat', 16) + '<span>' + esc(T('practice')) + '</span>'; bar.insertBefore(pb, bar.children[1] || null);
    }
    var sb = document.createElement('button'); sb.type = 'button'; sb.className = 'cnh-chip cnv-size'; sb.setAttribute('data-cnv', 'size'); sb.setAttribute('aria-label', T('textSize'));
    sb.innerHTML = '<span>Aa</span>'; bar.appendChild(sb);
  }
  function applySize(root) { var n = +lsGet('cnv_ts') || 1; root.setAttribute('data-cnv-ts', String(n >= 1 && n <= 3 ? n : 1)); }
  function hydrate(root, ctx) {
    if (!root || !ctx || !ctx.lesson) return;
    CUR = ctx;
    [sections, figures, vocabPics, tools].forEach(function (fn) { try { fn(root, ctx); } catch (e) { /* une amélioration qui échoue ne doit jamais casser la leçon */ } });
    try { applySize(root); } catch (e) { /* ignore */ }
  }
  // Questions rapides dans la fenêtre du tuteur : un geste au lieu de taper.
  function tutorChips(sheetEl) {
    try {
      var form = sheetEl && sheetEl.querySelector('#cnh-chat-f'); if (!form || form.parentNode.querySelector('.cnv-qchips')) return;
      var row = document.createElement('div'); row.className = 'cnv-qchips';
      [['chipSimple', 'qSimple'], ['chipExample', 'qExample'], ['chipSum', 'qSum']].forEach(function (p) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'cnh-chip'; b.textContent = T(p[0]); b.setAttribute('data-q', T(p[1])); row.appendChild(b);
      });
      row.addEventListener('click', function (e) {
        var b = e.target.closest('[data-q]'); if (!b) return;
        var inp = form.querySelector('#cnh-chat-i'); if (!inp) return;
        inp.value = b.getAttribute('data-q');
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      });
      form.parentNode.insertBefore(row, form);
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------- Gestes ---------------------------- */
  function sectionTexts(h) {
    var out = [], n = h.nextElementSibling;
    while (n && n.tagName !== 'H4') {
      if (!/^(PRE|TABLE)$/.test(n.tagName) && !n.classList.contains('cnh-scroll')) out.push(n.textContent || '');
      n = n.nextElementSibling;
    }
    return out;
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-cnv]') : null; if (!b) return;
    var a = b.getAttribute('data-cnv');
    if (a === 'pp') {
      if (!P) return;
      if (P.finished) { P.i = 0; restart(40); return; }
      if (P.playing) { P.playing = false; hush(); wakeOff(); paint(); } else restart(40);
    } else if (a === 'prev') { if (P) { P.i = Math.max(0, P.i - 1); restart(40); } }
    else if (a === 'next') { if (P) { P.i = Math.min(P.items.length - 1, P.i + 1); restart(40); } }
    else if (a === 'stop') stop();
    else if (a === 'rate') { V.rate = RATES[(RATES.indexOf(V.rate) + 1) % RATES.length] || 0.9; if (P && P.playing) restart(40); else paint(); }
    else if (a === 'practice') { if (CUR) playPractice(CUR.lesson, { scope: CUR.scope || 'fs' }); }
    else if (a === 'size') { var root = b.closest('[data-cnv-ts]') || b.closest('.cnh-fs-body') || b.closest('#cnh-sheet-b') || document.body; var n = (+lsGet('cnv_ts') || 1) % 3 + 1; lsSet('cnv_ts', String(n)); root.setAttribute('data-cnv-ts', String(n)); }
    else if (a === 'sec') {
      var h = b.closest('h4'); if (!h) return;
      var label = (h.textContent || '').trim();
      playSection(label, sectionTexts(h), { scope: CUR && CUR.scope || 'fs' });
    }
  });

  window.CNVisual = {
    T: T, DICT: DICT, hydrate: hydrate, tutorChips: tutorChips, stop: stop,
    playLesson: playLesson, playPractice: playPractice, playSection: playSection,
    diagramSvg: diagramSvg, autoDiagram: autoDiagram, wrap: wrap, sentences: sentences, mdItems: mdItems, lessonItems: lessonItems, practiceItems: practiceItems,
    photo: photo, parseWiki: parseWiki, okThumb: okThumb, okPage: okPage, ttsOk: ttsOk
  };
})();
