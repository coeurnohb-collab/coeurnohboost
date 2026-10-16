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
  var NET = [
    { id: 'wa', n: 'WhatsApp', c: '#1fa855', l: 'W', u: function (o) { return 'https://wa.me/?text=' + encodeURIComponent(shareText(o)); } },
    { id: 'fb', n: 'Facebook', c: '#1877f2', l: 'f', u: function (o) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(o.url) + '&quote=' + encodeURIComponent((o.info && o.info.title) || o.title || ''); } },
    { id: 'tg', n: 'Telegram', c: '#229ed9', l: 'T', u: function (o) { return 'https://t.me/share/url?url=' + encodeURIComponent(o.url) + '&text=' + encodeURIComponent(((o.info && o.info.title) || o.title || '') + ((o.info && o.info.price) ? ' — ' + o.info.price : '')); } },
    { id: 'x', n: 'X', c: '#111827', l: 'X', u: function (o) { return 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(o.url) + '&text=' + encodeURIComponent(((o.info && o.info.title) || o.title || '') + ((o.info && o.info.price) ? ' — ' + o.info.price : '')); } }
  ];
  function render(o) {
    var t = tx(), i = o.info || {};
    var s = document.getElementById('cnsh'); if (!s) { s = document.createElement('div'); s.id = 'cnsh'; document.body.appendChild(s); }
    var prev = '<div class="cnsh-prev">' + (i.image ? '<img src="' + esc(i.image) + '" alt="" onerror="this.remove()">' : '<span class="cnsh-ph">CU</span>') +
      '<div><b>' + esc(i.title || o.title || 'Coeurnoh Universe') + '</b>' + (i.price ? '<em>' + esc(i.price) + '</em>' : '') + '<small>' + esc((i.meta || []).join(' · ') || t.badge[o.kind] || '') + '</small></div></div>';
    s.innerHTML = '<div class="cnsh-back" data-sh-x="close"></div><div class="cnsh-card" role="dialog" aria-label="' + t.title + '"><div class="cnsh-hd"><b>' + t.title + '</b><button type="button" data-sh-x="close" aria-label="' + t.cancel + '">×</button></div>' + prev +
      '<div class="cnsh-nets">' + NET.map(function (n) { return '<button type="button" data-sh-net="' + n.id + '"><i style="background:' + n.c + '">' + n.l + '</i><span>' + n.n + '</span></button>'; }).join('') + '</div>' +
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
    if (net && cur) { ev.preventDefault(); var n = NET.filter(function (x) { return x.id === net.getAttribute('data-sh-net'); })[0]; if (n) { window.open(n.u(cur), '_blank', 'noopener'); } return; }
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
