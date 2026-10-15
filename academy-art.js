/* =====================================================================
   academy-art.js — Illustrations des catégories de l'Académie
   Une scène dessinée par catégorie (médecin en blouse blanche, sportifs, peintre, etc.), en SVG :
   légère, nette sur tous les écrans, aucune image à télécharger.

   VRAIES PHOTOS : pour remplacer une illustration par une photo, déposez le fichier dans le dossier
   img/academie/ sous le nom de la catégorie (ex. img/academie/health.jpg) puis ajoutez ce nom à la liste
   PHOTOS ci-dessous. Format conseillé : JPG ou WebP, 800 x 500 px, moins de 150 Ko.
   Identifiants : languages, tech, business, science, health, math, arts, sport, exams, career, society, personal
   ===================================================================== */
(function () {
  'use strict';
  if (window.CNArt) return;

  // Catégories qui ont une vraie photo dans img/academie/ (nom du fichier = identifiant + extension)
  var PHOTOS = {
    // health: 'jpg',
    // sport: 'jpg'
  };

  /* ---------- Petit moteur de personnages (style aplat, sans visage) ---------- */
  function line(x1, y1, x2, y2, c, w) { return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" fill="none"/>'; }
  function person(o) {
    var s = o.s || 1, skin = o.skin || '#c68a5e', top = o.top || '#1d4f91', bot = o.bot || '#1f2937', shoe = o.shoe || '#111827';
    var la = o.la || [-9, 24], ra = o.ra || [9, 24], ll = o.ll || [-1, 0], rl = o.rl || [1, 0], hair = o.hair || '#1b1b1b';
    var g = '<g transform="translate(' + o.x + ' ' + o.y + ') scale(' + s + ')">';
    // jambes
    g += line(-6, -34, -7 + ll[0], ll[1] || 0, bot, 10) + line(6, -34, 7 + rl[0], rl[1] || 0, bot, 10);
    g += '<ellipse cx="' + (-7 + ll[0] - 2) + '" cy="' + ((ll[1] || 0) + 1) + '" rx="8" ry="4" fill="' + shoe + '"/><ellipse cx="' + (7 + rl[0] + 2) + '" cy="' + ((rl[1] || 0) + 1) + '" rx="8" ry="4" fill="' + shoe + '"/>';
    // bras gauche (derrière), torse, bras droit
    g += line(-14, -60, -14 + la[0], -60 + la[1], o.sleeve || top, 9) + '<circle cx="' + (-14 + la[0]) + '" cy="' + (-60 + la[1]) + '" r="4.8" fill="' + skin + '"/>';
    g += '<rect x="-15" y="-68" width="30" height="40" rx="11" fill="' + top + '"' + (o.topStroke ? ' stroke="' + o.topStroke + '" stroke-width="1.2"' : '') + '/>';
    if (o.beltY) g += '<rect x="-15" y="' + o.beltY + '" width="30" height="5" fill="' + o.belt + '"/>';
    g += line(14, -60, 14 + ra[0], -60 + ra[1], o.sleeve || top, 9) + '<circle cx="' + (14 + ra[0]) + '" cy="' + (-60 + ra[1]) + '" r="4.8" fill="' + skin + '"/>';
    if (o.extra) g += o.extra;
    // cou + tête + cheveux
    var h = o.hairStyle || 'short';
    if (h === 'long') g += '<path d="M-14 -80a14 14 0 0 1 28 0v20a5 5 0 0 1-5 5h-18a5 5 0 0 1-5-5z" fill="' + hair + '"/>';
    g += '<rect x="-4" y="-74" width="8" height="8" fill="' + skin + '"/><circle cx="0" cy="-82" r="12" fill="' + skin + '"/>';
    if (h === 'short') g += '<path d="M-12.5 -83a12.5 12.5 0 0 1 25 0c-4-5-9-7-12.500-7s-8.500 2-12.500 7z" fill="' + hair + '"/>';
    else if (h === 'afro') g += '<path d="M-15 -80a15 15 0 0 1 30 0c0 2-1 3-2 3-2-6-7-10-13-10s-11 4-13 10c-1 0-2-1-2-3z" fill="' + hair + '"/>';
    else if (h === 'bun') g += '<path d="M-12.500 -83a12.500 12.500 0 0 1 25 0c-5-3-9-4-12.500-4s-7.500 1-12.500 4z" fill="' + hair + '"/><circle cx="0" cy="-97" r="6" fill="' + hair + '"/>';
    else if (h === 'long') g += '<path d="M-12.500 -83a12.500 12.500 0 0 1 25 0c-5-4-9-5-12.500-5s-7.500 1-12.500 5z" fill="' + hair + '"/>';
    return g + (o.hat || '') + '</g>';
  }
  function frame(bg, ground, inner) {
    return '<svg class="cnh-scene" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="320" height="200" fill="' + bg + '"/>' + inner + '</svg>';
  }
  function floor(c) { return '<rect x="0" y="170" width="320" height="30" fill="' + c + '"/>'; }
  function txt(x, y, s, size, c, w) { return '<text x="' + x + '" y="' + y + '" font-family="Inter,Arial,sans-serif" font-size="' + size + '" font-weight="' + (w || 700) + '" fill="' + c + '" text-anchor="middle">' + s + '</text>'; }

  var SCENES = {
    languages: function () {
      return frame('#e6eefb', '', '<circle cx="270" cy="45" r="48" fill="#d3e0f6"/><circle cx="48" cy="150" r="34" fill="#d3e0f6"/>' + floor('#c9d9f2') +
        '<rect x="48" y="38" width="86" height="40" rx="14" fill="#fff"/><path d="M92 78l8 12 6-12z" fill="#fff"/>' + txt(91, 64, 'Hello', 18, '#1d4f91') +
        '<rect x="186" y="26" width="92" height="40" rx="14" fill="#1d4f91"/><path d="M226 66l-4 12 12-12z" fill="#1d4f91"/>' + txt(232, 52, 'Bonjour', 17, '#fff') +
        person({ x: 100, y: 170, skin: '#8a5a3c', top: '#1d4f91', bot: '#334155', hair: '#111', hairStyle: 'afro', ra: [16, -6] }) +
        person({ x: 225, y: 170, skin: '#e2b48f', top: '#c2410c', bot: '#1f2937', hair: '#5b3a1e', hairStyle: 'long', la: [-16, -6] }));
    },
    tech: function () {
      var code = '';
      [[0, 60], [10, 90], [10, 50], [0, 70], [20, 40]].forEach(function (r, i) { code += '<rect x="' + (184 + r[0]) + '" y="' + (62 + i * 11) + '" width="' + r[1] + '" height="5" rx="2.500" fill="' + (i % 2 ? '#5eead4' : '#93c5fd') + '"/>'; });
      return frame('#e1f1ef', '', '<circle cx="50" cy="48" r="40" fill="#cde8e4"/>' + floor('#bfe0db') +
        person({ x: 105, y: 170, skin: '#a8714a', top: '#0f766e', bot: '#1f2937', hair: '#161616', hairStyle: 'short', la: [28, 14], ra: [34, 8] }) +
        '<rect x="160" y="52" width="130" height="82" rx="8" fill="#0f172a"/>' + code + txt(255, 112, '&lt;/&gt;', 20, '#5eead4') +
        '<rect x="214" y="134" width="22" height="14" fill="#94a3b8"/><rect x="198" y="146" width="54" height="6" rx="3" fill="#94a3b8"/>' +
        '<rect x="70" y="150" width="220" height="8" rx="3" fill="#7c8da0"/><rect x="82" y="158" width="6" height="14" fill="#7c8da0"/><rect x="272" y="158" width="6" height="14" fill="#7c8da0"/>' +
        '<rect x="112" y="136" width="46" height="5" rx="2" fill="#475569"/><path d="M114 136l6-24h34l4 24z" fill="#64748b"/>');
    },
    business: function () {
      return frame('#ece9f7', '', '<circle cx="272" cy="40" r="44" fill="#ddd7f1"/>' + floor('#d3cced') +
        '<rect x="148" y="26" width="150" height="102" rx="6" fill="#fff" stroke="#b9b0e0" stroke-width="3"/>' +
        '<rect x="168" y="92" width="18" height="24" fill="#a99be0"/><rect x="196" y="78" width="18" height="38" fill="#8a79d6"/><rect x="224" y="62" width="18" height="54" fill="#6a56c4"/><rect x="252" y="44" width="18" height="72" fill="#5b4bb0"/>' +
        '<path d="M166 80l30-14 28-14 40-18" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M262 32l8 0-2 8" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        person({ x: 90, y: 170, skin: '#d9a47c', top: '#1f2937', bot: '#111827', hair: '#2a1b10', hairStyle: 'short', ra: [38, -34], extra: '<path d="M0 -68l-5 7 5 22 5-22z" fill="#b91c1c"/><path d="M-5 -68h10l-5 5z" fill="#fff"/>' }));
    },
    science: function () {
      return frame('#e7f2ea', '', '<circle cx="268" cy="46" r="40" fill="#d4e8d9"/>' + floor('#c6dfcc') +
        '<g fill="none" stroke="#2f6b3a" stroke-width="2.500"><ellipse cx="268" cy="46" rx="30" ry="11"/><ellipse cx="268" cy="46" rx="30" ry="11" transform="rotate(60 268 46)"/><ellipse cx="268" cy="46" rx="30" ry="11" transform="rotate(-60 268 46)"/></g><circle cx="268" cy="46" r="5" fill="#2f6b3a"/>' +
        '<rect x="170" y="138" width="130" height="8" rx="3" fill="#7a8f80"/><rect x="180" y="146" width="6" height="26" fill="#7a8f80"/><rect x="284" y="146" width="6" height="26" fill="#7a8f80"/>' +
        '<path d="M196 138v-22h-6v-6h20v6h-6v22z" fill="#cfe8ff"/><path d="M196 132v6h8v-6z" fill="#34d399"/><path d="M226 138l-10-18v-12h6v12l10 18z" fill="#fde68a"/><circle cx="256" cy="128" r="10" fill="#fbcfe8"/><rect x="252" y="112" width="8" height="8" fill="#e9d5ff"/>' +
        person({ x: 105, y: 170, skin: '#7b4b2f', top: '#ffffff', topStroke: '#c9d3df', bot: '#334155', hair: '#0f0f0f', hairStyle: 'afro', ra: [26, -26], extra: '<path d="M-4 -68l4 12 4-12" fill="none" stroke="#c9d3df" stroke-width="1.5"/>' }) +
        '<g transform="translate(131 111)"><path d="M0 0v-14h-4v-5h14v5h-4v14l6 12a3 3 0 0 1-3 4h-14a3 3 0 0 1-3-4z" fill="#a7f3d0" stroke="#2f6b3a" stroke-width="2"/></g>');
    },
    health: function () {
      return frame('#e3f0f6', '', '<circle cx="60" cy="52" r="42" fill="#cfe4ee"/>' + floor('#c2dce8') +
        '<rect x="216" y="30" width="72" height="72" rx="14" fill="#fff"/><path d="M246 46h12v14h14v12h-14v14h-12V72h-14V60h14z" fill="#dc2626"/>' +
        '<path d="M176 168c20-18 60-18 80 0" stroke="#bcd7e3" stroke-width="0" fill="none"/>' +
        person({ x: 130, y: 170, skin: '#7a4a2e', top: '#ffffff', topStroke: '#bccbd8', bot: '#475569', hair: '#111', hairStyle: 'bun', hairColor: '#111', la: [-6, 30],
          ra: [22, -8], extra: '<path d="M-8 -68c-2 14 0 24 8 24s10-10 8-24" fill="none" stroke="#334155" stroke-width="2.500" stroke-linecap="round"/><circle cx="0" cy="-43" r="3.500" fill="#64748b"/><path d="M-15 -62h30v6h-30z" fill="none"/>' }) +
        '<g transform="translate(160 120) rotate(8)"><rect x="-1" y="-14" width="30" height="40" rx="4" fill="#fff" stroke="#0e6f8a" stroke-width="2.500"/><rect x="8" y="-18" width="12" height="7" rx="2" fill="#0e6f8a"/><path d="M5 0h18M5 8h18M5 16h12" stroke="#7fb4c6" stroke-width="2.500" stroke-linecap="round"/></g>');
    },
    math: function () {
      return frame('#f5efdc', '', '<circle cx="40" cy="42" r="34" fill="#ece3c4"/>' + floor('#e6dbb7') +
        '<rect x="44" y="20" width="232" height="108" rx="6" fill="#2f4f43" stroke="#a9835a" stroke-width="5"/>' +
        txt(96, 62, '&#960;', 30, '#fff', 400) + txt(166, 62, '&#931;', 30, '#fff', 400) + txt(236, 62, 'x&#178;', 26, '#fff', 400) +
        '<path d="M70 92h60M150 92h36M206 92h50" stroke="#e5ecd9" stroke-width="3" stroke-linecap="round"/><path d="M70 108h40M130 108h70" stroke="#e5ecd9" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
        '<rect x="44" y="128" width="232" height="6" fill="#a9835a"/><rect x="190" y="124" width="14" height="4" rx="2" fill="#fff"/>' +
        person({ x: 282, y: 170, s: .92, skin: '#e0b08a', top: '#8a6a0c', bot: '#374151', hair: '#6b3f1a', hairStyle: 'long', la: [-26, -30], ra: [4, 24] }));
    },
    arts: function () {
      return frame('#f7e9ef', '', '<circle cx="268" cy="46" r="40" fill="#f0d5e0"/>' + floor('#ecc9d7') +
        '<path d="M70 170l22-92M150 170l-22-92M110 170v-86" stroke="#8a6a46" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="62" y="40" width="96" height="70" rx="3" fill="#fff" stroke="#8a6a46" stroke-width="3"/><circle cx="130" cy="62" r="9" fill="#fbbf24"/><path d="M64 108V86c14-14 26-6 40-14s28-8 52 8v28z" fill="#34a56b"/><path d="M64 108V96c20-8 34 0 50-4s30-4 42 4v12z" fill="#2f6fb5"/>' +
        person({ x: 210, y: 170, skin: '#8d5a3b', top: '#8e2f5a', bot: '#2b2b3a', hair: '#111', hairStyle: 'short', la: [-14, 4], ra: [-34, -20],
          extra: '<ellipse cx="-24" cy="-48" rx="15" ry="10" fill="#f5deb3"/><circle cx="-29" cy="-50" r="2.800" fill="#ef4444"/><circle cx="-22" cy="-53" r="2.800" fill="#3b82f6"/><circle cx="-17" cy="-47" r="2.800" fill="#22c55e"/>',
          hat: '<path d="M-13 -92a14 7 0 0 1 28 0c-2 3-26 3-28 0z" fill="#8e2f5a"/><circle cx="1" cy="-98" r="2" fill="#8e2f5a"/>' }));
    },
    sport: function () {
      return frame('#e5f1e4', '', '<circle cx="278" cy="40" r="26" fill="#fde68a"/><rect x="0" y="150" width="320" height="50" fill="#5fae62"/><path d="M0 170h320" stroke="#7cc47e" stroke-width="3"/><path d="M0 160h320" stroke="#4f9c53" stroke-width="2" opacity=".6"/>' +
        person({ x: 92, y: 172, skin: '#7a4a2e', top: '#facc15', bot: '#1d4ed8', hair: '#0f0f0f', hairStyle: 'short', rl: [34, -14], la: [-22, 10], ra: [20, 18] }) +
        '<g transform="translate(146 150)"><circle r="9" fill="#fff" stroke="#1f2937" stroke-width="2"/><path d="M0-4l4 3-1.500 5h-5L-4-1z" fill="#1f2937"/></g>' +
        person({ x: 240, y: 172, skin: '#d9a47c', top: '#ffffff', topStroke: '#cbd5e1', bot: '#ffffff', hair: '#1b1b1b', hairStyle: 'short', beltY: -36, belt: '#111827', ll: [-16, 0], rl: [18, 0], la: [-6, 8], ra: [38, -4], shoe: '#e5e7eb' }));
    },
    exams: function () {
      return frame('#e6ebf7', '', '<circle cx="46" cy="46" r="38" fill="#d5ddf1"/>' + floor('#cdd6ed') +
        '<rect x="190" y="26" width="92" height="116" rx="6" fill="#fff" stroke="#b6c1e2" stroke-width="3"/>' +
        '<path d="M204 56l6 6 12-12" stroke="#16a34a" stroke-width="3.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M204 82l6 6 12-12" stroke="#16a34a" stroke-width="3.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M204 108l6 6 12-12" stroke="#16a34a" stroke-width="3.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M232 56h38M232 82h38M232 108h38" stroke="#b6c1e2" stroke-width="4" stroke-linecap="round"/>' + txt(262, 136, 'A+', 18, '#3d4f8f') +
        person({ x: 110, y: 170, skin: '#6e4129', top: '#3d4f8f', bot: '#1f2937', hair: '#0f0f0f', hairStyle: 'short', la: [-12, 20], ra: [20, -4],
          extra: '<g transform="translate(36 -64) rotate(-35)"><rect x="-4" y="-4" width="34" height="10" rx="5" fill="#fef3c7" stroke="#d6b36a" stroke-width="1.500"/><circle cx="2" cy="1" r="3.500" fill="#dc2626"/></g>',
          hat: '<path d="M0 -104l-24 8 24 9 24-9z" fill="#111827"/><path d="M-13 -94v6c6 4 20 4 26 0v-6" fill="#1f2937"/><path d="M22 -96v10" stroke="#facc15" stroke-width="2"/><circle cx="22" cy="-84" r="2.500" fill="#facc15"/>' }));
    },
    career: function () {
      var gear = '<g transform="translate(262 62)"><circle r="26" fill="none" stroke="#c9b98a" stroke-width="12" stroke-dasharray="9 7"/><circle r="18" fill="#efe5c9" stroke="#c9b98a" stroke-width="5"/><circle r="6" fill="#c9b98a"/></g>';
      return frame('#f3ecdd', '', '<circle cx="48" cy="48" r="38" fill="#eadfc3"/>' + floor('#e4d8b9') + gear +
        person({ x: 120, y: 170, skin: '#8a5a3c', top: '#f97316', bot: '#334155', hair: '#111', hairStyle: 'none', la: [-12, 20], ra: [28, -18],
          extra: '<rect x="-15" y="-52" width="30" height="5" fill="#fde68a" opacity=".8"/><g transform="translate(40 -84) rotate(30)"><rect x="-3" y="-4" width="6" height="40" rx="3" fill="#6b7280"/><path d="M-9 -4a9 9 0 0 1 18 0h-6a3 3 0 0 0-6 0z" fill="#6b7280"/></g>',
          hat: '<path d="M-14 -88a14 14 0 0 1 28 0z" fill="#facc15"/><rect x="-17" y="-89" width="34" height="5" rx="2.500" fill="#eab308"/>' }));
    },
    society: function () {
      return frame('#f4e7e7', '', '<circle cx="268" cy="44" r="40" fill="#ebd3d3"/>' + floor('#e6caca') +
        '<g stroke="#7a3b3b" stroke-width="5" stroke-linecap="round" fill="none"><path d="M250 170V70M226 170h48M214 62h72"/><path d="M220 62l-14 38M220 62l14 38M280 62l-14 38M280 62l14 38" stroke-width="2.500"/></g>' +
        '<path d="M200 100h40a20 12 0 0 1-40 0zM260 100h40a20 12 0 0 1-40 0z" fill="#d9b25a"/><circle cx="250" cy="58" r="6" fill="#7a3b3b"/>' +
        person({ x: 96, y: 170, skin: '#e0b08a', top: '#2b2b3a', bot: '#1f2937', hair: '#3b2a1a', hairStyle: 'short', la: [-12, 20], ra: [26, -10],
          extra: '<g transform="translate(34 -68)"><rect x="-4" y="-12" width="26" height="32" rx="3" fill="#7a3b3b"/><rect x="0" y="-8" width="18" height="3" fill="#e8c98a"/><rect x="0" y="-2" width="12" height="3" fill="#e8c98a"/></g><path d="M0 -68l-5 7 5 24 5-24z" fill="#fff"/>' }));
    },
    personal: function () {
      return frame('#fbeedd', '', '<circle cx="262" cy="46" r="26" fill="#fcd9a8"/>' + floor('#f1dcc0') +
        '<path d="M0 170L90 76l60 94z" fill="#d9b48a"/><path d="M90 170l90-120 100 120z" fill="#c1946a"/><path d="M180 50l-26 34 14-6 12 8 10-8 14 6z" fill="#fff"/>' +
        '<path d="M180 50V22" stroke="#6b4b2a" stroke-width="3"/><path d="M180 22l22 6-22 8z" fill="#c2410c"/>' +
        person({ x: 128, y: 170, skin: '#7a4a2e', top: '#0e6f8a', bot: '#374151', hair: '#111', hairStyle: 'short', la: [-12, -20], ra: [12, -20], s: .95 }));
    }
  };
  // Tout identifiant inconnu : scène neutre (livre ouvert)
  SCENES._default = function () {
    return frame('#e6eefb', '', '<circle cx="160" cy="100" r="70" fill="#d3e0f6"/><path d="M160 140c-24-14-60-14-84 0V66c24-14 60-14 84 0 24-14 60-14 84 0v74c-24-14-60-14-84 0z" fill="#fff" stroke="#1d4f91" stroke-width="4" stroke-linejoin="round"/><path d="M160 66v74" stroke="#1d4f91" stroke-width="4"/>');
  };

  function scene(id) { return (SCENES[id] || SCENES._default)(); }
  // Photo si elle est déclarée dans PHOTOS, sinon illustration. L'illustration reste dessous pendant le chargement.
  function art(id, cls) {
    var ph = PHOTOS[id] ? '<img class="cnh-photo" src="img/academie/' + encodeURIComponent(id) + '.' + PHOTOS[id] + '" alt="" loading="lazy" decoding="async">' : '';
    return '<span class="cnh-art ' + (cls || '') + '">' + scene(id) + ph + '</span>';
  }
  document.addEventListener('error', function (e) {
    var t = e.target; if (t && t.tagName === 'IMG' && t.classList && t.classList.contains('cnh-photo')) t.remove();
  }, true);

  window.CNArt = { scene: scene, art: art, has: function (id) { return !!SCENES[id]; } };
})();
