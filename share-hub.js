/* share-hub.js — Partage professionnel de toutes les publications (produits, publications, emplois, événements, voyages,
   immobilier, cours, concours, entreprises) avec l'identité complète : photo, titre, prix, détails et marque Coeurnoh Universe.
   - Le lien partagé est /p/<type>/<id> : les réseaux affichent une belle carte (photo + texte) et un clic ouvre directement
     le contenu dans l'application (?go=<type>:<id>).
   - Feuille de partage : WhatsApp, Facebook, Telegram, X, copier le lien, partage natif, et une image à la marque Coeurnoh.
   Jamais bloquant : si quelque chose échoue, le partage d'origine de l'application reste utilisable. */
(function () {
  'use strict';
  if (window.__cnShareHub) return; window.__cnShareHub = true;
  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, ty) { try { showToast(m, ty || 'info'); } catch (e) { } }
  var TX = {
    fr: { share: 'Partager', title: 'Partager', copy: 'Copier le lien', copied: 'Lien copié', native: 'Autres applications', image: 'Image à partager', imgDl: 'Télécharger l’image', imgBusy: 'Création de l’image…', imgFail: 'Impossible de créer l’image.', open: 'Ouvrir dans Coeurnoh Universe', brandLine: 'Coeurnoh Universe', via: 'Sur Coeurnoh Universe', cancel: 'Fermer', opening: 'Ouverture du contenu partagé…', gone: 'Ce contenu n’est plus disponible.',
      badge: { pub: 'Publication', job: 'Offre d’emploi', event: 'Événement', travel: 'Voyage et tourisme', immo: 'Immobilier', course: 'Cours', contest: 'Concours', biz: 'Entreprise', profile: 'Profil' }, free: 'Gratuit', freeEntry: 'Entrée gratuite', from: 'Dès', prize: 'Prix :', rooms: 'chambres', permonth: '/ mois' },
    en: { share: 'Share', title: 'Share', copy: 'Copy link', copied: 'Link copied', native: 'More apps', image: 'Shareable image', imgDl: 'Download image', imgBusy: 'Creating image…', imgFail: 'Could not create the image.', open: 'Open in Coeurnoh Universe', brandLine: 'Coeurnoh Universe', via: 'On Coeurnoh Universe', cancel: 'Close', opening: 'Opening shared content…', gone: 'This content is no longer available.',
      badge: { pub: 'Post', job: 'Job offer', event: 'Event', travel: 'Travel and tourism', immo: 'Real estate', course: 'Course', contest: 'Contest', biz: 'Business', profile: 'Profile' }, free: 'Free', freeEntry: 'Free entry', from: 'From', prize: 'Prize:', rooms: 'bedrooms', permonth: '/ month' }
  };
  function tx() { return TX[lang()]; }
  var COL = { pub: 'publications', job: 'job_offers', event: 'events', travel: 'travel_spots', immo: 'properties', course: 'courses', contest: 'contests' };
  var ORIGIN = location.origin;

  function link(kind, id) { return ORIGIN + '/p/' + kind + '/' + encodeURIComponent(id); }
  function money(v, cur) { var n = Number(v); if (!isFinite(n) || n <= 0) return ''; cur = String(cur || 'USD').toUpperCase(); return cur === 'USD' ? n.toLocaleString('fr-FR') + ' $' : n.toLocaleString('fr-FR') + ' ' + cur; }
  function clean(v, n) { return String(v == null ? '' : v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
  function cld(u) {
    u = String(u || ''); if (!/^https:\/\//i.test(u)) return '';
    var m = u.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i);
    if (m && !/^(c_|w_|h_|f_|q_)/.test(m[2])) return m[1] + 'c_fill,w_1080,h_567,q_auto,f_jpg/' + m[2];
    return u;
  }
  function first(a) { return Array.isArray(a) && a.length ? (typeof a[0] === 'string' ? a[0] : (a[0] && a[0].url) || '') : ''; }
  function infoFrom(kind, d) {
    var t = tx(), title = '', desc = '', image = '', price = '', meta = [];
    if (kind === 'pub') { title = clean(d.title || d.description, 90); desc = clean(d.title ? d.description : '', 200); image = d.imageUrl || ''; price = money(d.price); if (d.sellerName) meta.push(clean(d.sellerName, 40)); }
    else if (kind === 'job') { title = clean(d.title, 90); desc = clean(d.description, 200); if (d.location) meta.push(clean(d.location, 50)); if (d.contractType) meta.push(clean(d.contractType, 30)); if (!d.salaryHidden && d.salaryMin) price = money(d.salaryMin) + (d.salaryMax ? ' – ' + money(d.salaryMax) : ''); }
    else if (kind === 'event') {
      title = clean(d.title, 90); desc = clean(d.description, 200); image = d.coverImage || '';
      if (d.startDate) { try { meta.push(new Date(d.startDate).toLocaleDateString(lang() === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })); } catch (e) { } }
      if (d.location) meta.push(clean(d.location, 60));
      var ps = (Array.isArray(d.ticketTypes) ? d.ticketTypes : []).map(function (x) { return Number(x && x.price); }).filter(function (n) { return isFinite(n); });
      if (ps.length) { var mn = Math.min.apply(null, ps); price = mn === 0 ? t.freeEntry : t.from + ' ' + money(mn); }
    } else if (kind === 'travel') { title = clean(d.title, 90); desc = clean(d.description, 200); image = first(d.photos); meta = [d.city, d.country].filter(Boolean).map(function (x) { return clean(x, 40); }); price = clean(d.priceIndication, 40); }
    else if (kind === 'immo') { title = clean(d.title, 90); desc = clean(d.description, 200); image = first(d.photos); price = money(d.price, d.currency) + (d.transactionType === 'location' && d.price ? ' ' + t.permonth : ''); if (d.city) meta.push(clean(d.city, 40)); if (d.bedrooms) meta.push(d.bedrooms + ' ' + t.rooms); if (d.surfaceArea) meta.push(d.surfaceArea + ' m²'); }
    else if (kind === 'course') { title = clean(d.title, 90); desc = clean(d.description, 200); image = d.coverImage || ''; price = Number(d.price) > 0 ? money(d.price) : t.free; if (d.level) meta.push(clean(d.level, 30)); if (d.ownerName) meta.push(clean(d.ownerName, 40)); }
    else if (kind === 'contest') { title = clean(d.title, 90); desc = clean(d.description, 200); image = d.coverImage || ''; if (d.prize) price = t.prize + ' ' + clean(d.prize, 60); }
    return { title: title || 'Coeurnoh Universe', desc: desc, image: cld(image), price: price, meta: meta.filter(Boolean) };
  }
  function fetchInfo(kind, id) {
    return new Promise(function (resolve) {
      try {
        if (!COL[kind]) return resolve(null);
        db.collection(COL[kind]).doc(id).get().then(function (s) { resolve(s.exists ? infoFrom(kind, s.data()) : null); }).catch(function () { resolve(null); });
      } catch (e) { resolve(null); }
    });
  }

  /* ---------- Texte partagé ---------- */
  function shareText(o) {
    var i = o.info || {}, lines = [];
    lines.push((i.title || o.title || 'Coeurnoh Universe') + (i.price ? ' — ' + i.price : ''));
    if (i.meta && i.meta.length) lines.push(i.meta.join(' · '));
    if (o.text && (!i.title || o.text !== i.title)) lines.push(clean(o.text, 160));
    lines.push(''); lines.push(o.url); lines.push(''); lines.push(tx().via);
    return lines.filter(function (x, idx, arr) { return !(x === '' && arr[idx - 1] === ''); }).join('\n');
  }

  /* ---------- Image à la marque Coeurnoh Universe ---------- */
  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    var words = String(text).split(' '), line = '', n = 0;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        n++; if (n >= maxLines) { ctx.fillText(line.replace(/\s+$/, '') + '…', x, y); return y + lh; }
        ctx.fillText(line, x, y); y += lh; line = words[i];
      } else line = test;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }
  function loadImg(src, cors) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var im = new Image(); if (cors) im.crossOrigin = 'anonymous';
      im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src;
    });
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function makePoster(o) {
    var i = o.info || {}, t = tx();
    return Promise.all([loadImg(i.image, true), loadImg('logo-mark-white.png', false)]).then(function (r) {
      var photo = r[0], logo = r[1], W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      x.fillStyle = '#14263f'; x.fillRect(0, 0, W, H);
      // marque
      var bx = 60;
      if (logo) { x.drawImage(logo, bx, 52, 64, 64); bx = 140; }
      x.fillStyle = '#ffffff'; x.font = '700 42px Inter,Arial,sans-serif'; x.textBaseline = 'alphabetic'; x.fillText(t.brandLine, bx, 98);
      // carte
      var cx = 60, cy = 150, cw = 960, ch = 1080;
      x.save(); rr(x, cx, cy, cw, ch, 36); x.fillStyle = '#ffffff'; x.fill(); x.clip();
      var ph = 520;
      if (photo) {
        var sc = Math.max(cw / photo.width, ph / photo.height), dw = photo.width * sc, dh = photo.height * sc;
        x.drawImage(photo, cx + (cw - dw) / 2, cy + (ph - dh) / 2, dw, dh);
      } else { x.fillStyle = '#e8f0fa'; x.fillRect(cx, cy, cw, ph); x.fillStyle = '#1d4f91'; x.font = '800 120px Inter,Arial,sans-serif'; x.textAlign = 'center'; x.fillText('CU', cx + cw / 2, cy + ph / 2 + 40); x.textAlign = 'left'; }
      x.restore();
      var tx0 = cx + 44, ty = cy + ph + 64, mw = cw - 88;
      x.fillStyle = '#e8f0fa'; x.font = '700 26px Inter,Arial,sans-serif';
      var badge = (t.badge[o.kind] || '').toUpperCase(), bw = x.measureText(badge).width + 36;
      rr(x, tx0, ty - 34, bw, 46, 23); x.fill(); x.fillStyle = '#1d4f91'; x.fillText(badge, tx0 + 18, ty - 2);
      ty += 62; x.fillStyle = '#14263f'; x.font = '800 54px Inter,Arial,sans-serif'; ty = wrap(x, i.title || o.title || '', tx0, ty, mw, 64, 3);
      if (i.price) { ty += 4; x.fillStyle = '#1d4f91'; x.font = '800 50px Inter,Arial,sans-serif'; x.fillText(i.price, tx0, ty); ty += 56; }
      if (i.meta && i.meta.length) { x.fillStyle = '#5a6577'; x.font = '500 32px Inter,Arial,sans-serif'; ty = wrap(x, i.meta.join(' · '), tx0, ty, mw, 42, 2); }
      if (i.desc) { ty += 10; x.fillStyle = '#374151'; x.font = '400 30px Inter,Arial,sans-serif'; wrap(x, i.desc, tx0, ty, mw, 42, 4); }
      // bouton
      var by = cy + ch - 120;
      rr(x, tx0, by, mw, 84, 22); x.fillStyle = '#1d4f91'; x.fill();
      x.fillStyle = '#ffffff'; x.font = '700 34px Inter,Arial,sans-serif'; x.textAlign = 'center'; x.fillText(t.open, tx0 + mw / 2, by + 54); x.textAlign = 'left';
      // pied
      x.fillStyle = '#9fb1c7'; x.font = '500 28px Inter,Arial,sans-serif'; x.textAlign = 'center';
      x.fillText(o.url.replace(/^https?:\/\//, ''), W / 2, H - 52); x.textAlign = 'left';
      return new Promise(function (res, rej) { try { c.toBlob(function (b) { b ? res(b) : rej(new Error('blob')); }, 'image/png'); } catch (e) { rej(e); } });
    });
  }

  /* ---------- Feuille de partage ---------- */
  var cur = null;
  function close() { var s = document.getElementById('cnsh'); if (s) s.remove(); cur = null; }
  var NET_ICON = {
    wa: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
    fb: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
    tg: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
    li: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    ms: 'M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13',
    mail: 'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zm2.2-.3 6.8 5.6 6.8-5.6zM19 8.1l-6.4 5.2a1 1 0 0 1-1.2 0L5 8.1v9.4c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5z',
    sms: 'M5 3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-8l-5 4v-4H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm3 5.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm4 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm4 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z'
  };
  function netIcon(id) { return '<svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden="true"><path d="' + NET_ICON[id] + '"/></svg>'; }
  var NET = [
    { id: 'wa', n: 'WhatsApp', c: '#1fa855', l: 'wa', u: function (o) { return 'https://wa.me/?text=' + encodeURIComponent(shareText(o)); } },
    { id: 'fb', n: 'Facebook', c: '#1877f2', l: 'fb', u: function (o) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(o.url) + '&quote=' + encodeURIComponent((o.info && o.info.title) || o.title || ''); } },
    { id: 'tg', n: 'Telegram', c: '#229ed9', l: 'tg', u: function (o) { return 'https://t.me/share/url?url=' + encodeURIComponent(o.url) + '&text=' + encodeURIComponent(((o.info && o.info.title) || o.title || '') + ((o.info && o.info.price) ? ' — ' + o.info.price : '')); } },
    { id: 'x', n: 'X', c: '#111827', l: 'x', u: function (o) { return 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(o.url) + '&text=' + encodeURIComponent(((o.info && o.info.title) || o.title || '') + ((o.info && o.info.price) ? ' — ' + o.info.price : '')); } },
    { id: 'li', n: 'LinkedIn', c: '#0a66c2', l: 'li', u: function (o) { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(o.url); } },
    { id: 'ms', n: 'Messenger', c: '#0b84ff', l: 'ms', u: function (o) { return 'fb-messenger://share/?link=' + encodeURIComponent(o.url); } },
    { id: 'mail', n: 'E-mail', c: '#5b6472', l: 'mail', u: function (o) { return 'mailto:?subject=' + encodeURIComponent((o.info && o.info.title) || o.title || 'Coeurnoh Universe') + '&body=' + encodeURIComponent(shareText(o)); } },
    { id: 'sms', n: 'SMS', c: '#2f9e44', l: 'sms', u: function (o) { return 'sms:?&body=' + encodeURIComponent(shareText(o)); } }
  ];
  function render(o) {
    var t = tx(), i = o.info || {};
    var s = document.getElementById('cnsh'); if (!s) { s = document.createElement('div'); s.id = 'cnsh'; document.body.appendChild(s); }
    var prev = '<div class="cnsh-prev">' + (i.image ? '<img src="' + esc(i.image) + '" alt="" onerror="this.remove()">' : '<span class="cnsh-ph">CU</span>') +
      '<div><b>' + esc(i.title || o.title || 'Coeurnoh Universe') + '</b>' + (i.price ? '<em>' + esc(i.price) + '</em>' : '') + '<small>' + esc((i.meta || []).join(' · ') || t.badge[o.kind] || '') + '</small></div></div>';
    s.innerHTML = '<div class="cnsh-back" data-sh-x="close"></div><div class="cnsh-card" role="dialog" aria-label="' + t.title + '"><div class="cnsh-hd"><b>' + t.title + '</b><button type="button" data-sh-x="close" aria-label="' + t.cancel + '">×</button></div>' + prev +
      '<div class="cnsh-nets">' + NET.map(function (n) { return '<button type="button" data-sh-net="' + n.id + '"><i style="background:' + n.c + '">' + netIcon(n.l) + '</i><span>' + n.n + '</span></button>'; }).join('') + '</div>' +
      '<div class="cnsh-acts"><button type="button" data-sh-x="copy">' + t.copy + '</button>' + (navigator.share ? '<button type="button" data-sh-x="native">' + t.native + '</button>' : '') + '<button type="button" data-sh-x="image">' + t.image + '</button></div></div>';
  }
  function open(o) {
    o = o || {}; if (!o.kind) o.kind = 'pub';
    close();
    var tid = o.id ? String(o.id) : '';
    o.url = o.url || (tid ? link(o.kind, tid) : location.href);
    o.info = o.info || (o.title ? { title: clean(o.title, 90), desc: '', image: cld(o.image), price: o.price || '', meta: o.meta || [] } : null);
    cur = o; render(o);
    if (!o.fetched && COL[o.kind] && tid) {
      o.fetched = true;
      fetchInfo(o.kind, tid).then(function (inf) { if (inf && cur === o) { o.info = inf; render(o); } });
    }
  }
  function nativeShare(o) {
    var data = { title: (o.info && o.info.title) || o.title || 'Coeurnoh Universe', text: shareText(o).replace('\n\n' + o.url, ''), url: o.url };
    try { navigator.share(data).catch(function () { }); } catch (e) { }
  }
  function doImage(o, btn) {
    var t = tx(), old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = t.imgBusy; }
    makePoster(o).then(function (blob) {
      var file = null; try { file = new File([blob], 'coeurnoh-universe.png', { type: 'image/png' }); } catch (e) { }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: (o.info && o.info.title) || 'Coeurnoh Universe', text: shareText(o) }).catch(function () { });
      }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'coeurnoh-universe.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }).catch(function () { toast(t.imgFail, 'error'); }).then(function () { if (btn) { btn.disabled = false; btn.textContent = old; } });
  }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0 || !t0.closest) return;
    var shBtn = t0.closest('[data-cn-share]');
    if (shBtn) { ev.preventDefault(); ev.stopPropagation(); open({ kind: shBtn.getAttribute('data-kind'), id: shBtn.getAttribute('data-id') }); return; }
    var net = t0.closest('[data-sh-net]');
    if (net && cur) { ev.preventDefault(); var n = NET.filter(function (x) { return x.id === net.getAttribute('data-sh-net'); })[0]; if (n) { if (/^(mailto|sms|fb-messenger):/.test(n.u(cur))) { location.href = n.u(cur); return; } window.open(n.u(cur), '_blank', 'noopener'); } return; }
    var a = t0.closest('[data-sh-x]');
    if (!a) return;
    ev.preventDefault(); var act = a.getAttribute('data-sh-x');
    if (act === 'close') close();
    else if (cur && act === 'copy') { var txt = cur.url; var done = function () { toast(tx().copied, 'success'); }; try { navigator.clipboard.writeText(txt).then(done, function () { prompt('', txt); }); } catch (e) { prompt('', txt); } }
    else if (cur && act === 'native') nativeShare(cur);
    else if (cur && act === 'image') doImage(cur, a);
  }, true);
  (function () {
    var orig = window.closeTopmostOverlay;
    window.closeTopmostOverlay = function () { if (document.getElementById('cnsh')) { close(); return true; } return typeof orig === 'function' ? orig.apply(this, arguments) : false; };
  })();

  /* ---------- Remplace les partages existants ---------- */
  function wrapShare(name, fn) { try { if (typeof window[name] === 'function') { var o = window[name]; window[name] = function () { try { return fn.apply(this, arguments); } catch (e) { return o.apply(this, arguments); } }; window[name].__orig = o; } } catch (e) { } }
  wrapShare('sharePost', function (pubId, caption) { open({ kind: 'pub', id: pubId, text: caption }); try { if (typeof notifyPublicationShared === 'function') notifyPublicationShared(pubId); } catch (e) { } });
  wrapShare('shareShopItem', function (pubId, title) { open({ kind: 'pub', id: pubId, title: title }); try { if (typeof notifyPublicationShared === 'function') notifyPublicationShared(pubId); } catch (e) { } });
  wrapShare('shareContest', function (id, title) { open({ kind: 'contest', id: id, title: title }); });
  wrapShare('shareBusiness', function (ownerUid, name) {
    var known = null; try { known = (businessCache || []).find(function (x) { return x.ownerUid === ownerUid; }) || (businessMyProfile && businessMyProfile.ownerUid === ownerUid ? businessMyProfile : null) || window.__bizDetail; } catch (e) { }
    var url = (known && known.ownerUid === ownerUid && typeof businessIsProActive === 'function' && businessIsProActive(known, 'web') && typeof businessPublicUrl === 'function') ? businessPublicUrl(ownerUid) : (location.origin + location.pathname + '?entreprise=' + encodeURIComponent(ownerUid));
    open({ kind: 'biz', id: ownerUid, url: url, title: name, image: known && (known.coverImageUrl || known.logoUrl) });
  });
  wrapShare('shareMyProfile', function () { if (typeof currentUser === 'undefined' || !currentUser) throw new Error('x'); open({ kind: 'profile', id: currentUser.uid, url: location.origin + location.pathname + '?profile=' + currentUser.uid, title: (currentUser.username || currentUser.name || 'Coeurnoh Universe'), meta: [lang() === 'en' ? 'Follow me on Coeurnoh Universe' : 'Suis-moi sur Coeurnoh Universe'] }); });

  /* ---------- Bouton « Partager » dans chaque fiche détaillée ---------- */
  var DET = { job: 'job-detail-modal', event: 'event-detail-modal', course: 'course-detail-modal', travel: 'travel-detail-modal', immo: 'immo-detail-modal' };
  var FN = { job: 'openJobDetail', event: 'openEventDetail', course: 'openCourseDetail', travel: 'openTravelDetail', immo: 'openImmoDetail' };
  var curId = {};
  Object.keys(FN).forEach(function (k) { wrapShare(FN[k], function (id) { curId[k] = id; setTimeout(inject, 250); setTimeout(inject, 900); var o = window[FN[k]].__orig; return o.apply(this, arguments); }); });
  function inject() {
    Object.keys(DET).forEach(function (k) {
      var m = document.getElementById(DET[k]); if (!m || m.classList.contains('hidden') || !curId[k]) return;
      var inner = m.querySelector('.modal'); if (!inner) return;
      var b = inner.querySelector('[data-cn-share]');
      if (!b) {
        b = document.createElement('button'); b.type = 'button'; b.className = 'cnsh-fab'; b.setAttribute('data-cn-share', '1'); b.setAttribute('data-kind', k); b.setAttribute('aria-label', tx().share);
        b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg><span>' + tx().share + '</span>';
        inner.appendChild(b);
      }
      b.setAttribute('data-id', curId[k]);
    });
  }
  var tmr = null;
  try { new MutationObserver(function () { clearTimeout(tmr); tmr = setTimeout(inject, 200); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }

  /* ---------- Ouverture directe du contenu partagé (?go=type:id) ---------- */
  var go = null;
  try {
    var q = new URLSearchParams(location.search).get('go');
    if (q) { sessionStorage.setItem('cn_go', q); }
    go = sessionStorage.getItem('cn_go');
  } catch (e) { }
  function cleanUrl() { try { var u = new URL(location.href); u.searchParams.delete('go'); history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); } catch (e) { } }
  function runGo() {
    if (!go) return;
    var p = String(go).split(':'), kind = p[0], id = decodeURIComponent(p.slice(1).join(':') || '');
    var map = { pub: 'openPostDetail', job: 'openJobDetail', event: 'openEventDetail', travel: 'openTravelDetail', immo: 'openImmoDetail', course: 'openCourseDetail', contest: 'viewContest' };
    var fn = map[kind];
    if (!fn || !/^[A-Za-z0-9_-]{4,80}$/.test(id)) { go = null; try { sessionStorage.removeItem('cn_go'); } catch (e) { } cleanUrl(); return; }
    var tries = 0, iv = setInterval(function () {
      tries++;
      var ready = false;
      try { ready = typeof currentUser !== 'undefined' && !!currentUser && typeof window[fn] === 'function'; } catch (e) { }
      if (ready) {
        clearInterval(iv); go = null; try { sessionStorage.removeItem('cn_go'); } catch (e) { } cleanUrl();
        toast(tx().opening);
        setTimeout(function () { try { window[fn](id); } catch (e) { toast(tx().gone, 'error'); } }, 600);
      } else if (tries > 240) clearInterval(iv);
    }, 500);
  }
  runGo();

  window.CNShare = { open: open, link: link, close: close };

  var css = [
    '#cnsh{position:fixed;inset:0;z-index:2300;display:flex;align-items:flex-end;justify-content:center;font-family:var(--cnh-font,system-ui,sans-serif)}#cnsh *{box-sizing:border-box}',
    '.cnsh-back{position:absolute;inset:0;background:rgba(10,20,35,.55)}',
    '.cnsh-card{position:relative;width:100%;max-width:480px;background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);border-radius:22px 22px 0 0;padding:14px 16px max(16px,env(safe-area-inset-bottom));animation:cnshUp .24s cubic-bezier(.2,.8,.2,1);max-height:92vh;overflow-y:auto}',
    '@keyframes cnshUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}',
    '.cnsh-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.cnsh-hd b{font-size:1.0625rem}.cnsh-hd button{width:38px;height:38px;border-radius:50%;border:0;background:var(--cnh-soft,#eef3f9);color:inherit;font-size:22px;cursor:pointer;line-height:1}',
    '.cnsh-prev{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;margin-bottom:14px}.cnsh-prev img,.cnsh-ph{width:72px;height:72px;border-radius:10px;object-fit:cover;flex:0 0 auto;background:var(--cnh-soft,#eef3f9)}',
    '.cnsh-ph{display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--cnh-brand,#1d4f91)}.cnsh-prev div{min-width:0}.cnsh-prev b{display:block;font-size:.9375rem;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.cnsh-prev em{display:block;font-style:normal;font-weight:700;color:var(--cnh-brand,#1d4f91);font-size:.9375rem;margin-top:2px}.cnsh-prev small{display:block;color:var(--cnh-sub,#5a6577);font-size:.75rem;margin-top:2px}',
    '.cnsh-nets{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.cnsh-nets button{border:0;background:none;color:inherit;font:inherit;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;padding:6px 0}.cnsh-nets i{width:52px;height:52px;border-radius:16px;color:#fff;font-style:normal;font-weight:800;font-size:1.25rem;display:flex;align-items:center;justify-content:center}.cnsh-nets span{font-size:.75rem;font-weight:600}',
    '.cnsh-acts{display:flex;flex-direction:column;gap:8px}.cnsh-acts button{min-height:48px;border-radius:12px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:inherit;font:inherit;font-weight:600;font-size:.9375rem;cursor:pointer}.cnsh-acts button:first-child{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91);color:#fff}.cnsh-acts button:disabled{opacity:.6}',
    '.cnsh-fab{position:absolute;top:14px;right:14px;z-index:5;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px 0 12px;border-radius:999px;border:1px solid var(--line,#e1e6ed);background:var(--cream,#fff);color:var(--ink,#111827);font:inherit;font-weight:600;font-size:.8125rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)}',
    '@media(prefers-reduced-motion:reduce){.cnsh-card{animation:none}}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
