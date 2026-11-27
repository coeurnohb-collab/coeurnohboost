/* Coeurnoh Universe — « Créer ton site » : options avancées.
   Ajoute trois outils dans le tableau de bord du site :
   1) Horaires d'ouverture : badge « Ouvert maintenant / Fermé · ouvre demain à 08:00 » sur le site public.
   2) Panier WhatsApp : le visiteur ajoute plusieurs articles et envoie UNE commande récapitulative sur WhatsApp.
   3) Affiche QR : une affiche prête à imprimer (nom, logo, QR code, adresse du site) pour vitrine, flyers, cartes.
   Les réglages sont enregistrés par le serveur (action « site_extras »), aucune règle Firestore à modifier. */
(function () {
  'use strict';
  // Texte d'erreur lisible (jamais de message technique en anglais)
  function RE(e) { try { return readableError(e); } catch (x) { return (e && e.message) || ''; } }
  if (window.__cnSitePro) return; window.__cnSitePro = true;
  var tries = 0;
  function go() { if (typeof siteHubHtml !== 'function' || typeof spShell !== 'function' || typeof mySiteCache === 'undefined') { if (++tries < 160) setTimeout(go, 250); return; } main(); }
  go();

  var DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  var ZONES = [[-8, 'UTC−8 · Amérique du Nord (Pacifique)'], [-5, 'UTC−5 · Amérique du Nord (Est), Colombie, Pérou'], [-3, 'UTC−3 · Brésil (Brasília), Argentine'], [0, 'UTC+0 · Afrique de l’Ouest (Abidjan, Dakar), Royaume-Uni (hiver)'], [1, 'UTC+1 · Afrique centrale (Kinshasa, Douala), France, Belgique'], [2, 'UTC+2 · Afrique centrale et australe (Lubumbashi, Kigali, Johannesburg)'], [3, 'UTC+3 · Afrique de l’Est (Nairobi, Kampala), Moscou'], [4, 'UTC+4 · Maurice, La Réunion, Dubaï'], [5.5, 'UTC+5:30 · Inde'], [8, 'UTC+8 · Chine, Singapour'], [9, 'UTC+9 · Japon, Corée du Sud']];
  // Liste affichée : celle ci-dessus, plus le fuseau déjà enregistré s'il n'y figure pas (jamais de perte).
  function zoneList(tz) { if (ZONES.some(function (z) { return z[0] === tz; })) return ZONES; var a = Math.abs(tz), h = Math.floor(a), mm = Math.round((a - h) * 60); return ZONES.concat([[tz, 'UTC' + (tz < 0 ? '−' : '+') + h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '')]]).sort(function (x, y) { return x[0] - y[0]; }); }
  function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
  async function api(action, body) {
    var idToken = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body || {})) });
    var j = await r.json(); if (!j.success) throw new Error(j.error || 'Erreur'); return j;
  }
  function extras() { var e = (mySiteCache && mySiteCache.extras) || {}; var wk = []; for (var i = 0; i < 7; i++) { var w = (e.week && e.week[i]) || {}; wk.push({ x: !!w.x, o: w.o || '08:00', c: w.c || '18:00' }); } return { tz: e.tz != null ? e.tz : 1, hoursOn: !!e.hoursOn, week: wk, cart: { on: !!(e.cart && e.cart.on), note: (e.cart && e.cart.note) || '' }, formation: e.formation || undefined }; }
  async function saveExtras(ex) { var r = await api('site_extras', { extras: ex }); mySiteCache.extras = r.extras; return r.extras; }

  var st = document.createElement('style');
  st.textContent = '.spx-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:6px 8px;align-items:center;margin:6px 0;font-size:.86rem}.spx-row b{grid-column:1/-1;font-size:.9rem}.spx-row input[type=time]{width:100%;min-width:0;box-sizing:border-box;border:1px solid #d5dbe6;border-radius:10px;padding:8px;font:inherit}.spx-row label{font-size:.78rem;display:flex;gap:4px;align-items:center;justify-content:flex-end}' +
    '.spx-f{margin:10px 0}.spx-f select,.spx-f textarea,.spx-f input[type=text]{width:100%;box-sizing:border-box;border:1px solid #d5dbe6;border-radius:12px;padding:10px 12px;font:inherit;background:#fff;color:inherit}.spx-sw{display:flex;gap:10px;align-items:center;font-weight:700}.spx-sw input{width:20px;height:20px}' +
    '.spx-b{border:1px solid #d5dbe6;background:#fff;border-radius:12px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;color:inherit}.spx-b.p{background:var(--action,#1d4f91);border-color:var(--action,#1d4f91);color:#fff}.spx-seg{display:flex;gap:6px;margin-bottom:10px}.spx-kg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.spx-k{background:#f3f5f9;border-radius:12px;padding:10px 6px;text-align:center}.spx-k b{display:block;font-size:1.25rem}.spx-k span{font-size:.7rem;color:#5d6779}.spx-bars{display:flex;align-items:flex-end;gap:2px;height:110px;margin:14px 0 2px;border-bottom:1px solid #d5dbe6}.spx-bars i{flex:1;background:var(--act,#28374f);border-radius:2px 2px 0 0;min-height:2px}.spx-lab{display:flex;justify-content:space-between;font-size:.7rem;color:#5d6779}.spx-n{font-size:.8rem;color:#5d6779;margin:6px 0}.spx-poster{display:block;width:100%;max-width:340px;margin:10px auto;border:1px solid #d5dbe6;border-radius:8px}';
  st.textContent += '.spx-pn{display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #e4e8ef;font-size:.8rem}.spx-pn input{margin-top:3px;width:18px;height:18px}.spx-req{padding:10px 0;border-bottom:1px solid #e4e8ef;font-size:.88rem}.spx-req .spx-seg{margin:8px 0 0}.spx-req a.spx-b{text-decoration:none;display:inline-block}';
  st.textContent += '.fm-row{border:1px solid #d5dbe6;border-radius:14px;padding:10px;margin:8px 0;display:grid;gap:8px}.fm-row .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.fm-row label.spx-n{display:block;margin:0}.fm-in{width:100%;box-sizing:border-box;border:1px solid #d5dbe6;border-radius:12px;padding:10px 12px;font:inherit;background:#fff;color:inherit;min-height:42px}.fm-row .spx-b{justify-self:start;font-weight:600;font-size:.82rem;padding:8px 12px}';
  document.head.appendChild(st);

  function hoursView() {
    var ex = extras(), body = document.getElementById('sp-body'); if (!body) return;
    var zl = zoneList(ex.tz), zo = zl.map(function (z, i) { return '<option value="' + i + '"' + (z[0] === ex.tz ? ' selected' : '') + '>' + esc(z[1]) + '</option>'; }).join('');
    body.innerHTML = '<div class="spx-f spx-sw"><input type="checkbox" id="spx-on"' + (ex.hoursOn ? ' checked' : '') + '><label for="spx-on">Afficher « Ouvert maintenant » sur mon site</label></div>' +
      '<div class="spx-f"><label class="spx-n" for="spx-tz">Fuseau horaire de votre activité</label><select id="spx-tz">' + zo + '</select></div>' +
      ex.week.map(function (w, i) { return '<div class="spx-row" data-i="' + i + '"><b>' + DAYS[i] + '</b><input type="time" class="o" value="' + esc(w.o) + '" aria-label="Ouverture ' + DAYS[i] + '"><input type="time" class="c" value="' + esc(w.c) + '" aria-label="Fermeture ' + DAYS[i] + '"><label><input type="checkbox" class="x"' + (w.x ? ' checked' : '') + '>Fermé</label></div>'; }).join('') +
      '<div class="spx-f"><button type="button" class="spx-b" id="spx-copy">Copier le lundi sur tous les jours</button></div><p class="spx-n" id="spx-msg"></p><button type="button" class="spx-b p" id="spx-save">Enregistrer les horaires</button>';
    body.querySelector('#spx-copy').onclick = function () { var r0 = body.querySelector('.spx-row[data-i="0"]'); body.querySelectorAll('.spx-row').forEach(function (r) { r.querySelector('.o').value = r0.querySelector('.o').value; r.querySelector('.c').value = r0.querySelector('.c').value; r.querySelector('.x').checked = r0.querySelector('.x').checked; }); };
    body.querySelector('#spx-save').onclick = async function () {
      var b = this, m = body.querySelector('#spx-msg'); b.disabled = true; m.textContent = '';
      try {
        var cur = extras(), week = [].map.call(body.querySelectorAll('.spx-row'), function (r) { return { x: r.querySelector('.x').checked, o: r.querySelector('.o').value || '08:00', c: r.querySelector('.c').value || '18:00' }; });
        cur.week = week; cur.hoursOn = body.querySelector('#spx-on').checked; cur.tz = (zl[parseInt(body.querySelector('#spx-tz').value, 10)] || zl[0])[0];
        await saveExtras(cur); toast('Horaires enregistrés', 'success'); m.textContent = 'Enregistré. Le badge apparaît sur votre site public.';
      } catch (e) { m.textContent = RE(e); }
      b.disabled = false;
    };
  }
  function openHours() { if (!mySiteCache) return; spModal = 'hours'; spShell('Horaires d’ouverture', ''); hoursView(); }

  function openCart() {
    if (!mySiteCache) return; spModal = 'cart'; spShell('Panier WhatsApp', '');
    var ex = extras(), body = document.getElementById('sp-body'), priced = (mySiteCache.services || []).filter(function (s) { return s && s.name && /\d/.test(s.price || ''); }).length, hasWa = !!(mySiteCache.contactWhatsapp || '').replace(/\D/g, '');
    body.innerHTML = '<p class="spx-n">Vos visiteurs ajoutent plusieurs articles au panier, puis envoient <b>une seule commande</b> récapitulative sur votre WhatsApp (articles, quantités, total, nom et adresse).</p>' +
      (!hasWa ? '<p class="spx-n" style="color:#b42318"><b>Ajoutez d’abord votre numéro WhatsApp</b> dans les informations de contact du site.</p>' : '') +
      (!priced ? '<p class="spx-n" style="color:#b42318"><b>Ajoutez des services ou produits avec un prix</b> (ex. « 10 $ », « 25 € » ou « 5 000 FC ») : seuls ces articles ont un bouton « Ajouter au panier ».</p>' : '<p class="spx-n">' + priced + ' article' + (priced > 1 ? 's' : '') + ' avec prix pourront être ajoutés au panier.</p>') +
      '<div class="spx-f spx-sw"><input type="checkbox" id="spx-cart"' + (ex.cart.on ? ' checked' : '') + '><label for="spx-cart">Activer le panier sur mon site</label></div>' +
      '<div class="spx-f"><label class="spx-n" for="spx-note">Message affiché dans le panier (facultatif)</label><input type="text" id="spx-note" maxlength="120" placeholder="Ex. Paiement à la livraison · Livraison sous 48 h" value="' + esc(ex.cart.note) + '"></div><p class="spx-n" id="spx-msg"></p><button type="button" class="spx-b p" id="spx-save">Enregistrer</button>';
    body.querySelector('#spx-save').onclick = async function () {
      var b = this, m = body.querySelector('#spx-msg'); b.disabled = true;
      try { var cur = extras(); cur.cart = { on: body.querySelector('#spx-cart').checked, note: body.querySelector('#spx-note').value }; await saveExtras(cur); toast('Panier enregistré', 'success'); m.textContent = 'Enregistré.'; }
      catch (e) { m.textContent = RE(e); }
      b.disabled = false;
    };
  }

  /* ----- affiche QR ----- */
  function loadImg(src) { return new Promise(function (res) { if (!src) return res(null); var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }
  function wrap(ctx, text, maxW, maxLines) { var words = String(text).split(/\s+/), lines = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines.slice(0, maxLines); }
  async function drawPoster(site, cv) {
    var W = 1240, H = 1754, ctx = cv.getContext('2d'); cv.width = W; cv.height = H;
    var accent = /^#[0-9a-fA-F]{6}$/.test(site.accentColor || '') ? site.accentColor : '#1d4ed8', link = location.origin + '/s/' + encodeURIComponent(site.slug || '');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 330); ctx.fillRect(0, H - 120, W, 120);
    var logo = await loadImg(site.logoUrl), y = 70;
    if (logo) { var s = 190, lx = W / 2 - s / 2; ctx.save(); ctx.beginPath(); ctx.arc(W / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip(); ctx.drawImage(logo, lx, y, s, s); ctx.restore(); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '800 64px system-ui,Arial,sans-serif';
    var nm = wrap(ctx, site.businessName || 'Mon site', W - 160, 2); nm.forEach(function (l, i) { ctx.fillText(l, W / 2, (logo ? 330 : 190) + i * 72 - (logo ? 0 : 20)); });
    ctx.fillStyle = '#12295f'; ctx.font = '600 44px system-ui,Arial,sans-serif'; var ty = 450;
    if (site.tagline) { wrap(ctx, site.tagline, W - 220, 3).forEach(function (l, i) { ctx.fillText(l, W / 2, ty + i * 58); }); ty += 60 * Math.min(3, wrap(ctx, site.tagline, W - 220, 3).length) + 20; }
    ctx.font = '800 56px system-ui,Arial,sans-serif'; ctx.fillStyle = accent; ctx.fillText('Scannez pour nous retrouver', W / 2, Math.max(ty + 60, 600));
    var qr = window.CNQR && CNQR.encode(link), box = 680, bx = W / 2 - box / 2, by = Math.max(ty + 100, 660);
    ctx.fillStyle = '#fff'; ctx.fillRect(bx - 20, by - 20, box + 40, box + 40); ctx.strokeStyle = '#12295f'; ctx.lineWidth = 6; ctx.strokeRect(bx - 20, by - 20, box + 40, box + 40);
    if (qr) { var n = qr.length, m = box / (n + 2), ox = bx + m, oy = by + m; ctx.fillStyle = '#000'; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr[r][c]) ctx.fillRect(Math.floor(ox + c * m), Math.floor(oy + r * m), Math.ceil(m), Math.ceil(m)); }
    var uy = by + box + 100; ctx.fillStyle = '#12295f'; ctx.font = '700 46px system-ui,Arial,sans-serif'; ctx.fillText(link.replace(/^https?:\/\//, ''), W / 2, uy);
    var info = [site.contactWhatsapp ? 'WhatsApp : ' + site.contactWhatsapp : '', site.address || ''].filter(Boolean);
    ctx.font = '600 38px system-ui,Arial,sans-serif'; ctx.fillStyle = '#4a5568'; info.forEach(function (t, i) { ctx.fillText(t.slice(0, 60), W / 2, uy + 64 + i * 50); });
    ctx.fillStyle = '#fff'; ctx.font = '600 32px system-ui,Arial,sans-serif'; ctx.fillText('Site créé avec Coeurnoh Universe', W / 2, H - 50);
    return link;
  }
  function openPoster() {
    if (!mySiteCache) return; spModal = 'poster'; spShell('Affiche QR à imprimer', '');
    var body = document.getElementById('sp-body'), site = mySiteCache;
    if (!site.slug) { body.innerHTML = '<p class="spx-n">Enregistrez d’abord l’adresse de votre site.</p>'; return; }
    body.innerHTML = '<p class="spx-n">Une affiche A4 avec le nom de votre activité et un QR code vers votre site. Imprimez-la pour votre vitrine, vos flyers ou vos cartes de visite.</p><canvas id="spx-cv" class="spx-poster"></canvas><p class="spx-n" id="spx-msg">Préparation…</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="spx-b p" id="spx-dl">Télécharger l’affiche (PNG)</button><button type="button" class="spx-b" id="spx-pr">Imprimer</button></div>';
    var cv = body.querySelector('#spx-cv'), msg = body.querySelector('#spx-msg');
    drawPoster(site, cv).then(function () { msg.textContent = ''; }).catch(function () { msg.textContent = 'Impossible de créer l’affiche.'; });
    function blobOf(cb) { try { cv.toBlob(cb, 'image/png'); } catch (e) { cb(null); } }
    body.querySelector('#spx-dl').onclick = function () { blobOf(function (b) { if (!b) { msg.textContent = 'Téléchargement impossible : le logo vient d’un autre site. Retirez-le puis réessayez.'; return; } var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'affiche-' + (site.slug || 'site') + '.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }); };
    body.querySelector('#spx-pr').onclick = function () { blobOf(function (b) { if (!b) { msg.textContent = 'Impression impossible : téléchargez d’abord l’image.'; return; } var u = URL.createObjectURL(b), f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(f); var d = f.contentWindow.document; d.open(); d.write('<!doctype html><title>Affiche</title><style>@page{size:A4;margin:0}html,body{margin:0}img{width:100%;display:block}</style><img src="' + u + '">'); d.close(); f.contentWindow.onload = function () { setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); }, 200); setTimeout(function () { f.remove(); URL.revokeObjectURL(u); }, 60000); }; }); };
  }

  /* ----- statistiques de visites ----- */
  var LABELS = { view: 'Visites', wa: 'Clics WhatsApp', call: 'Appels', map: 'Itinéraires', cart: 'Commandes panier', share: 'Partages' };
  function openStats(days) {
    if (!mySiteCache) return; days = days || 30; spModal = 'stats'; spShell('Statistiques du site', '');
    var body = document.getElementById('sp-body'); body.innerHTML = '<p class="spx-n">Chargement…</p>';
    api('site_stats', { days: days }).then(function (r) {
      var max = Math.max.apply(null, r.series.map(function (x) { return x.view; }).concat([1]));
      var kp = ['view', 'wa', 'call', 'map', 'cart', 'share'].map(function (k) { return '<div class="spx-k"><b>' + (r.total[k] || 0) + '</b><span>' + esc(LABELS[k]) + '</span></div>'; }).join('');
      var bars = r.series.map(function (x) { return '<i title="' + esc(x.day) + ' : ' + x.view + ' visite' + (x.view > 1 ? 's' : '') + '" style="height:' + Math.max(2, Math.round(x.view / max * 100)) + '%"></i>'; }).join('');
      var tip = !r.total.view ? 'Aucune visite enregistrée pour l’instant. Partagez votre lien ou imprimez l’affiche QR pour attirer vos premiers visiteurs.' :
        (r.contactRate >= 10 ? 'Bon résultat : ' + r.contactRate + ' % de vos visiteurs vous contactent.' : 'Seulement ' + r.contactRate + ' % des visiteurs vous contactent. Ajoutez un bouton WhatsApp visible, des prix et des photos pour améliorer ce chiffre.');
      body.innerHTML = '<div class="spx-seg"><button type="button" class="spx-b' + (days === 7 ? ' p' : '') + '" data-d="7">7 jours</button><button type="button" class="spx-b' + (days === 30 ? ' p' : '') + '" data-d="30">30 jours</button><button type="button" class="spx-b' + (days === 90 ? ' p' : '') + '" data-d="90">90 jours</button></div>' +
        '<div class="spx-kg">' + kp + '</div><div class="spx-bars" role="img" aria-label="Visites par jour">' + bars + '</div><div class="spx-lab"><span>' + esc(r.series[0].day.slice(5)) + '</span><span>' + esc(r.series[r.series.length - 1].day.slice(5)) + '</span></div>' +
        '<p class="spx-n"><b>' + r.contactRate + ' %</b> des visiteurs ont contacté ou commandé' + (r.bestDay ? ' · meilleur jour : ' + esc(r.bestDay) : '') + '</p><p class="spx-n">' + esc(tip) + '</p><p class="spx-n">Vos propres visites sont comptées. Les chiffres sont indicatifs.</p>';
      body.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { openStats(parseInt(b.getAttribute('data-d'), 10)); }; });
    }).catch(function (e) { body.innerHTML = '<p class="spx-n">' + esc(RE(e)) + '</p>'; });
  }

  /* ----- Panel : connexion API du fournisseur, catalogue et demandes ----- */
  var PN = { sel: {}, list: [], q: '' };
  function pnPanel() { return (mySiteCache && mySiteCache.panel) || { on: false, markup: 30, title: '', items: [] }; }
  function money(n) { return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' $'; }
  function openPanel() {
    if (!mySiteCache) return; spModal = 'panel'; spShell('Panel et API', '');
    var body = document.getElementById('sp-body'); body.innerHTML = '<p class="spx-n">Chargement…</p>';
    api('panel_get').then(function (r) {
      mySiteCache.panel = r.panel;
      body.innerHTML = '<div class="spx-seg"><button type="button" class="spx-b p" data-t="c">Connexion</button><button type="button" class="spx-b" data-t="k">Catalogue</button><button type="button" class="spx-b" data-t="d">Demandes</button></div><div id="pn-pane"></div>';
      var go = function (t) { body.querySelectorAll('[data-t]').forEach(function (b) { b.classList.toggle('p', b.getAttribute('data-t') === t); }); api('panel_get').then(function (r2) { mySiteCache.panel = r2.panel; (t === 'c' ? pnConn : t === 'k' ? pnCat : pnReq)(r2, body.querySelector('#pn-pane')); }).catch(function (e) { body.querySelector('#pn-pane').innerHTML = '<p class="spx-n">' + esc(RE(e)) + '</p>'; }); };
      body.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-t')); }; });
      go(r.connected ? 'k' : 'c');
    }).catch(function (e) { body.innerHTML = '<p class="spx-n">' + esc(RE(e)) + '</p>'; });
  }
  function pnConn(r, pane) {
    pane.innerHTML = '<p class="spx-n">Connectez l’API de <b>votre fournisseur</b> (panel au format « API v2 », le plus courant). Vos visiteurs commandent sur votre site, <b>vous</b> validez, puis la commande part chez votre fournisseur. Rien ne s’exécute sans votre clic.</p>' +
      '<p class="spx-n">Sécurité : la clé est chiffrée sur nos serveurs et n’est jamais réaffichée ; elle ne sert qu’à votre site, jamais à l’application. Seules les adresses https publiques sont acceptées.</p>' +
      (r.connected ? '<p class="spx-n"><b>Connecté à ' + esc(r.host) + '</b> · clé ' + esc(r.keyMask) + '</p>' : '') +
      '<div class="spx-f"><label class="spx-n" for="pn-url">Adresse de l’API</label><input type="text" id="pn-url" maxlength="300" placeholder="https://monfournisseur.com/api/v2" autocomplete="off"></div>' +
      '<div class="spx-f"><label class="spx-n" for="pn-key">Clé API' + (r.connected ? ' (laisser vide pour la conserver)' : '') + '</label><input type="text" id="pn-key" maxlength="200" autocomplete="off" placeholder="' + (r.connected ? '••••' : 'Collez votre clé') + '"></div>' +
      '<p class="spx-n" id="pn-msg"></p><button type="button" class="spx-b p" id="pn-save">Connecter et tester</button> ' + (r.connected ? '<button type="button" class="spx-b" id="pn-off">Déconnecter</button>' : '');
    var msg = pane.querySelector('#pn-msg'); if (r.connected && r.host) pane.querySelector('#pn-url').value = 'https://' + r.host + '/';
    pane.querySelector('#pn-save').onclick = async function () {
      var b = this; b.disabled = true; msg.textContent = 'Vérification…';
      try { await api('panel_save', { url: pane.querySelector('#pn-url').value, key: pane.querySelector('#pn-key').value }); var t = await api('panel_test'); msg.textContent = 'Connexion réussie' + (t.balance ? ' · solde chez le fournisseur : ' + t.balance + ' ' + t.currency : '') + '. Passez à « Catalogue ».'; toast('Panel connecté', 'success'); pane.querySelector('#pn-key').value = ''; }
      catch (e) { msg.textContent = RE(e); }
      b.disabled = false;
    };
    var off = pane.querySelector('#pn-off'); if (off) off.onclick = async function () { if (!confirm('Déconnecter ce panel ? Le catalogue sera retiré de votre site.')) return; try { await api('panel_disconnect'); toast('Panel déconnecté', 'success'); openPanel(); } catch (e) { msg.textContent = RE(e); } };
  }
  function pnCat(r, pane) {
    if (!r.connected) { pane.innerHTML = '<p class="spx-n">Connectez d’abord votre panel (onglet « Connexion »).</p>'; return; }
    var cur = pnPanel(); PN.sel = {}; (cur.items || []).forEach(function (x) { PN.sel[x.id] = 1; });
    pane.innerHTML = '<div class="spx-f spx-sw"><input type="checkbox" id="pn-on"' + (cur.on ? ' checked' : '') + '><label for="pn-on">Afficher la section « Commander » sur mon site</label></div>' +
      '<div class="spx-f"><label class="spx-n" for="pn-title">Titre de la section</label><input type="text" id="pn-title" maxlength="80" placeholder="Passer une commande" value="' + esc(cur.title || '') + '"></div>' +
      '<div class="spx-f"><label class="spx-n" for="pn-mk">Votre marge sur le prix du fournisseur (%)</label><input type="text" inputmode="numeric" id="pn-mk" maxlength="4" value="' + esc(cur.markup != null ? cur.markup : 30) + '"></div>' +
      '<div class="spx-f"><input type="text" id="pn-q" maxlength="60" placeholder="Rechercher un service (ex. Instagram)"></div><button type="button" class="spx-b" id="pn-load">Charger les services du fournisseur</button>' +
      '<div id="pn-list" class="spx-n"></div><p class="spx-n" id="pn-msg"></p><button type="button" class="spx-b p" id="pn-pub">Publier sur mon site</button>';
    var list = pane.querySelector('#pn-list'), msg = pane.querySelector('#pn-msg');
    function draw() { var mk = parseFloat(pane.querySelector('#pn-mk').value) || 0; list.innerHTML = (PN.list.length ? '<p>' + PN.list.length + ' service(s) affiché(s). Cochez ceux à vendre. Prix de vente = coût + ' + mk + ' %.</p>' : '') + PN.list.map(function (x) { var pr = Math.round(x.cost * (1 + mk / 100) * 10000) / 10000; return '<label class="spx-pn"><input type="checkbox" data-id="' + esc(x.id) + '"' + (PN.sel[x.id] ? ' checked' : '') + '><span><b>' + esc(x.name) + '</b><br>' + esc(x.cat) + ' · coût ' + x.cost + ' $ · <b>vente ' + pr + ' $</b> / 1000 · ' + x.min + '–' + x.max + '</span></label>'; }).join(''); list.querySelectorAll('[data-id]').forEach(function (c) { c.onchange = function () { if (c.checked) PN.sel[c.getAttribute('data-id')] = 1; else delete PN.sel[c.getAttribute('data-id')]; }; }); }
    pane.querySelector('#pn-mk').oninput = function () { if (PN.list.length) draw(); };
    pane.querySelector('#pn-load').onclick = async function () { var b = this; b.disabled = true; msg.textContent = 'Chargement…'; try { var j = await api('panel_services', { markup: parseFloat(pane.querySelector('#pn-mk').value) || 0, q: pane.querySelector('#pn-q').value }); PN.list = j.items; msg.textContent = j.total + ' services chez le fournisseur' + (j.items.length < j.total ? ' · affinez la recherche pour en voir d’autres.' : '.'); draw(); } catch (e) { msg.textContent = RE(e); } b.disabled = false; };
    pane.querySelector('#pn-pub').onclick = async function () { var b = this; b.disabled = true; msg.textContent = 'Publication…'; try { var j = await api('panel_publish', { on: pane.querySelector('#pn-on').checked, title: pane.querySelector('#pn-title').value, markup: parseFloat(pane.querySelector('#pn-mk').value) || 0, ids: Object.keys(PN.sel) }); mySiteCache.panel = j.panel; msg.textContent = 'Publié : ' + j.panel.items.length + ' service(s) sur votre site. Les prix sont recalculés par le serveur.'; toast('Catalogue publié', 'success'); } catch (e) { msg.textContent = RE(e); } b.disabled = false; };
  }
  function pnReq(r, pane) {
    pane.innerHTML = '<p class="spx-n">Chargement…</p>';
    leadsCall({ action: 'leads_list', kind: 'site' }).then(function (j) {
      var it = (j.items || []).filter(function (x) { return x.type === 'panelorder'; });
      if (!it.length) { pane.innerHTML = '<p class="spx-n">Aucune demande pour l’instant.</p>'; return; }
      pane.innerHTML = it.map(function (x) {
        var pv = x.provider || {}, sent = pv.orderId, wa = String(x.contact || '').replace(/\D/g, '');
        return '<div class="spx-req" data-id="' + esc(x.id) + '"><b>' + esc(x.serviceName) + '</b> × ' + esc(x.quantity) + ' · ' + money(x.total) + '<br><span class="spx-n">' + esc(x.name) + ' · ' + esc(x.contact) + '<br>Cible : ' + esc(x.link) + '<br>Statut : ' + esc(x.status) + (sent ? ' · commande fournisseur n° ' + esc(pv.orderId) + (pv.status ? ' (' + esc(pv.status) + ')' : '') : '') + (pv.state === 'error' ? ' · erreur : ' + esc(pv.error) : '') + '</span><div class="spx-seg">' +
          (sent ? '<button type="button" class="spx-b" data-a="st">Vérifier l’état</button>' : '<button type="button" class="spx-b p" data-a="send">Envoyer au fournisseur</button>') + (wa.length > 6 ? '<a class="spx-b" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">WhatsApp</a>' : '') + '</div></div>';
      }).join('');
      pane.querySelectorAll('.spx-req').forEach(function (row) {
        var id = row.getAttribute('data-id'), q = row.querySelector('[data-a]');
        q.onclick = async function () {
          var a = q.getAttribute('data-a'); if (a === 'send' && !confirm('Envoyer cette commande au fournisseur ? Elle sera débitée de votre solde chez lui.')) return;
          q.disabled = true; try { await api(a === 'send' ? 'panel_send' : 'panel_status', { leadId: id }); toast(a === 'send' ? 'Commande envoyée' : 'État mis à jour', 'success'); pnReq(r, pane); } catch (e) { toast(RE(e), 'error'); q.disabled = false; }
        };
      });
    }).catch(function (e) { pane.innerHTML = '<p class="spx-n">' + esc(RE(e)) + '</p>'; });
  }

  /* ----- Programme et sessions (formations, ateliers, cours) ----- */
  var FM_LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux'], FM_MODES = ['Présentiel', 'En ligne', 'Hybride'];
  var FM_BADGES = ['Certificat délivré', 'Paiement échelonné possible', 'Places limitées', 'Formateurs expérimentés', 'Supports de cours inclus', 'Accompagnement après la formation'];
  var FM_STEPS = [
    { title: 'Choisissez votre formation', text: 'Consultez le programme, la durée et le prix, puis choisissez la session qui vous convient.' },
    { title: 'Contactez-nous', text: 'Écrivez-nous sur WhatsApp ou remplissez le formulaire : nous répondons rapidement à vos questions.' },
    { title: 'Confirmez votre place', text: 'Nous vous indiquons les modalités de paiement et nous réservons votre place.' },
    { title: 'Commencez à apprendre', text: 'Rejoignez la session, suivez les cours et obtenez votre attestation à la fin.' }
  ];
  var FM = null, FMT = 'p';
  function fmLoad() {
    var f = (mySiteCache && mySiteCache.extras && mySiteCache.extras.formation) || {}, m = f.meta || {};
    FM = {
      on: f.on === true,
      meta: { duration: m.duration || '', level: m.level || '', mode: m.mode || '', schedule: m.schedule || '', language: m.language || '', certificate: m.certificate || '' },
      sessions: (f.sessions || []).map(function (s) { return { course: s.course || '', date: s.date || '', end: s.end || '', place: s.place || '', seats: s.seats || '', price: s.price || '' }; }),
      steps: (f.steps || []).map(function (s) { return { title: s.title || '', text: s.text || '' }; }),
      badges: (f.badges || []).slice()
    };
  }
  function fmOpts(list, cur) {
    var l = list.slice(); if (cur && l.indexOf(cur) < 0) l.push(cur);
    return '<option value="">Non précisé</option>' + l.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  }
  // Recopie ce qui est saisi à l'écran dans l'état (avant de changer d'onglet ou d'enregistrer).
  function fmRead(body) {
    var q = function (id) { var e = body.querySelector(id); return e ? e.value : null; };
    if (FMT === 'p') {
      var on = body.querySelector('#fm-on'); if (on) FM.on = on.checked;
      ['duration', 'level', 'mode', 'schedule', 'language', 'certificate'].forEach(function (k) { var v = q('#fm-' + k); if (v !== null) FM.meta[k] = v; });
    } else if (FMT === 's') {
      FM.sessions = [].map.call(body.querySelectorAll('.fm-row'), function (r) { return { course: r.querySelector('.c').value, date: r.querySelector('.d').value, end: r.querySelector('.e').value, place: r.querySelector('.p').value, seats: r.querySelector('.n').value, price: r.querySelector('.r').value }; });
    } else if (FMT === 'i') {
      FM.steps = [].map.call(body.querySelectorAll('.fm-row'), function (r) { return { title: r.querySelector('.t').value, text: r.querySelector('.x').value }; });
      FM.badges = [].map.call(body.querySelectorAll('.fm-bd:checked'), function (c) { return c.value; });
    }
  }
  function fmTab(tab) {
    var body = document.getElementById('sp-body'); if (!body) return;
    // Changement d'onglet : on garde ce qui est saisi. Les autres appels (ajout, retrait) ont déjà recopié l'écran dans l'état.
    if (tab && FM && body.querySelector('#fm-pane')) fmRead(body.querySelector('#fm-pane'));
    FMT = tab || FMT;
    var site = mySiteCache, premium = false; try { premium = siteIsPremiumActive(site, 'content'); } catch (e) { /* ignore */ }
    var live = site.slug && site.status === 'published' ? '<a class="spx-b" style="text-decoration:none;display:inline-block;margin-top:8px" target="_blank" rel="noopener" href="/s/' + encodeURIComponent(site.slug) + '#site-sec-formation">Voir sur mon site</a>' : '';
    var seg = '<div class="spx-seg"><button type="button" class="spx-b' + (FMT === 'p' ? ' p' : '') + '" data-t="p">Programme</button><button type="button" class="spx-b' + (FMT === 's' ? ' p' : '') + '" data-t="s">Sessions</button><button type="button" class="spx-b' + (FMT === 'i' ? ' p' : '') + '" data-t="i">Inscription</button></div>';
    var pane = '';
    if (FMT === 'p') {
      var m = FM.meta, fld = function (id, label, ph, max) { return '<div class="spx-f"><label class="spx-n" for="fm-' + id + '">' + label + '</label><input type="text" id="fm-' + id + '" maxlength="' + max + '" placeholder="' + esc(ph) + '" value="' + esc(m[id]) + '"></div>'; };
      pane = '<div class="spx-f spx-sw"><input type="checkbox" id="fm-on"' + (FM.on ? ' checked' : '') + '><label for="fm-on">Afficher la section « Programme et inscriptions » sur mon site</label></div>' +
        '<p class="spx-n">Ces informations s’affichent sous forme de fiches claires. Laissez vide ce qui ne vous concerne pas.</p>' +
        fld('duration', 'Durée', 'Ex. 6 semaines · 48 heures', 40) +
        '<div class="spx-f"><label class="spx-n" for="fm-level">Niveau</label><select id="fm-level">' + fmOpts(FM_LEVELS, m.level) + '</select></div>' +
        '<div class="spx-f"><label class="spx-n" for="fm-mode">Mode</label><select id="fm-mode">' + fmOpts(FM_MODES, m.mode) + '</select></div>' +
        fld('schedule', 'Horaires', 'Ex. Lundi et mercredi · 17h–19h', 70) + fld('language', 'Langue des cours', 'Ex. Français', 40) + fld('certificate', 'Certificat ou attestation', 'Ex. Certificat de fin de formation', 70);
    } else if (FMT === 's') {
      var names = (site.services || []).filter(function (x) { return x && x.name; }).map(function (x) { return '<option value="' + esc(x.name) + '">'; }).join('');
      pane = '<p class="spx-n">Ajoutez les dates de vos prochaines sessions. Chaque session a un bouton « Réserver ma place » qui ouvre WhatsApp avec un message prêt. Une session terminée disparaît toute seule.' + (premium ? '' : ' Version gratuite : les 3 prochaines sessions sont affichées.') + '</p>' +
        '<datalist id="fm-names">' + names + '</datalist>' +
        FM.sessions.map(function (s, i) {
          return '<div class="fm-row" data-i="' + i + '"><input class="fm-in c" list="fm-names" maxlength="80" placeholder="Formation concernée (ex. Design graphique)" aria-label="Formation concernée" value="' + esc(s.course) + '">' +
            '<div class="g2"><label class="spx-n">Début<input type="date" class="fm-in d" value="' + esc(s.date) + '"></label><label class="spx-n">Fin (facultatif)<input type="date" class="fm-in e" value="' + esc(s.end) + '"></label></div>' +
            '<input class="fm-in p" maxlength="60" placeholder="Lieu ou plateforme (ex. Campus principal, En ligne)" aria-label="Lieu ou plateforme" value="' + esc(s.place) + '">' +
            '<div class="g2"><input class="fm-in n" type="number" min="0" max="9999" inputmode="numeric" placeholder="Places" aria-label="Nombre de places" value="' + esc(s.seats) + '"><input class="fm-in r" maxlength="40" placeholder="Prix (ex. 45 $)" aria-label="Prix" value="' + esc(s.price) + '"></div>' +
            '<button type="button" class="spx-b" data-rm="' + i + '">Retirer cette session</button></div>';
        }).join('') +
        (FM.sessions.length < 12 ? '<button type="button" class="spx-b" id="fm-add">Ajouter une session</button>' : '<p class="spx-n">Maximum 12 sessions.</p>');
    } else {
      var custom = FM.badges.filter(function (b) { return FM_BADGES.indexOf(b) < 0; }), all = FM_BADGES.concat(custom);
      pane = '<p class="spx-n">Expliquez en quelques étapes comment s’inscrire : c’est ce qui rassure le plus vos futurs élèves.</p>' +
        FM.steps.map(function (s, i) {
          return '<div class="fm-row" data-i="' + i + '"><input class="fm-in t" maxlength="60" placeholder="Titre de l’étape" aria-label="Titre de l’étape" value="' + esc(s.title) + '"><input class="fm-in x" maxlength="160" placeholder="Explication courte (facultatif)" aria-label="Explication" value="' + esc(s.text) + '"><button type="button" class="spx-b" data-rm="' + i + '">Retirer</button></div>';
        }).join('') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (FM.steps.length < 6 ? '<button type="button" class="spx-b" id="fm-add">Ajouter une étape</button>' : '') + '<button type="button" class="spx-b" id="fm-starter">Utiliser les étapes recommandées</button></div>' +
        '<p class="spx-n" style="margin-top:16px"><b>Badges de confiance</b> (6 au maximum)</p>' +
        all.map(function (b) { return '<label class="spx-pn"><input type="checkbox" class="fm-bd" value="' + esc(b) + '"' + (FM.badges.indexOf(b) >= 0 ? ' checked' : '') + '><span>' + esc(b) + '</span></label>'; }).join('') +
        '<div class="spx-f"><input type="text" class="fm-in" id="fm-bx" maxlength="40" placeholder="Autre badge (ex. Stage en entreprise)" aria-label="Autre badge"></div>';
    }
    body.innerHTML = seg + '<div id="fm-pane">' + pane + '</div><p class="spx-n" id="fm-msg"></p><button type="button" class="spx-b p" id="fm-save">Enregistrer</button> ' + live;
    var P = body.querySelector('#fm-pane'), msg = body.querySelector('#fm-msg');
    body.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { fmTab(b.getAttribute('data-t')); }; });
    P.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { fmRead(P); var i = parseInt(b.getAttribute('data-rm'), 10); (FMT === 's' ? FM.sessions : FM.steps).splice(i, 1); fmTab(); }; });
    var add = P.querySelector('#fm-add');
    if (add) add.onclick = function () { fmRead(P); if (FMT === 's') FM.sessions.push({ course: '', date: '', end: '', place: '', seats: '', price: '' }); else FM.steps.push({ title: '', text: '' }); fmTab(); };
    var starter = P.querySelector('#fm-starter');
    if (starter) starter.onclick = function () { fmRead(P); if (FM.steps.some(function (s) { return s.title; }) && !confirm('Remplacer vos étapes par les étapes recommandées ?')) return; FM.steps = FM_STEPS.map(function (s) { return { title: s.title, text: s.text }; }); fmTab(); };
    var bx = P.querySelector('#fm-bx');
    if (bx) bx.onkeydown = function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); var v = bx.value.trim(); if (!v) return; fmRead(P); if (FM.badges.length >= 6) { msg.textContent = 'Maximum 6 badges.'; return; } if (FM.badges.indexOf(v) < 0) FM.badges.push(v.slice(0, 40)); fmTab(); } };
    P.querySelectorAll('.fm-bd').forEach(function (c) { c.onchange = function () { if (P.querySelectorAll('.fm-bd:checked').length > 6) { c.checked = false; msg.textContent = 'Maximum 6 badges.'; } else msg.textContent = ''; }; });
    body.querySelector('#fm-save').onclick = async function () {
      var b = this; fmRead(P); b.disabled = true; msg.textContent = '';
      var bad = FM.sessions.find(function (s) { return !s.date; });
      if (bad) { msg.textContent = 'Chaque session a besoin d’une date de début.'; b.disabled = false; return; }
      var late = FM.sessions.find(function (s) { return s.end && s.end < s.date; });
      if (late) { msg.textContent = 'La date de fin doit être après la date de début.'; b.disabled = false; return; }
      try {
        var cur = extras(); cur.formation = { on: FM.on, meta: FM.meta, sessions: FM.sessions, steps: FM.steps, badges: FM.badges };
        var saved = await saveExtras(cur); mySiteCache.extras = saved; fmLoad();
        toast('Programme enregistré', 'success');
        var f = saved.formation || {}, has = Object.keys(f.meta || {}).some(function (k) { return f.meta[k]; }) || (f.sessions || []).length || (f.steps || []).length || (f.badges || []).length;
        msg.textContent = !f.on ? 'Enregistré. La section est désactivée : cochez « Afficher » dans l’onglet Programme pour la publier.' : (!has ? 'Enregistré. Ajoutez au moins une information pour que la section s’affiche.' : 'Enregistré. La section apparaît sur votre site public.');
        try { if (typeof renderSiteStatusView === 'function' && document.getElementById('site-builder-status')) renderSiteStatusView(); } catch (e2) { /* ignore */ }
      } catch (e) { msg.textContent = RE(e); }
      b.disabled = false;
    };
  }
  function openFormation() { if (!mySiteCache) return; spModal = 'formation'; spShell('Programme et sessions', ''); fmLoad(); fmTab('p'); }

  function main() {
    var orig = window.siteHubHtml;
    window.siteHubHtml = function (site, isPremium) {
      var h = orig.apply(this, arguments), ex = (site && site.extras) || {};
      var tile = function (ic, label, sub, fn) { return '<button type="button" class="sp-tile" onclick="' + fn + '"><span class="sp-ic">' + uiIc(ic, 20) + '</span><b>' + esc(label) + '</b><small>' + esc(sub) + '</small></button>'; };
      var fmOn = !!(ex.formation && ex.formation.on), fmTile = tile('cap', 'Programme et sessions', fmOn ? 'Section active' : 'Désactivé', 'CNSitePro.formation()'), isEdu = false; try { isEdu = (typeof siteTypeOf === 'function' ? siteTypeOf(site || {}) : (site || {}).siteType) === 'education'; } catch (e0) { /* ignore */ }
      var add = (isEdu ? fmTile : '') + tile('clock', 'Horaires d’ouverture', ex.hoursOn ? 'Badge actif' : 'Désactivé', 'CNSitePro.hours()') + tile('cart', 'Panier WhatsApp', (ex.cart && ex.cart.on) ? 'Activé' : 'Désactivé', 'CNSitePro.cart()') + tile('target', 'Affiche QR', 'Imprimer', 'CNSitePro.poster()') + tile('chart', 'Statistiques', 'Visites et clics', 'CNSitePro.stats()') + tile('plug', 'Panel et API', (ex.panel && ex.panel.on) ? 'Catalogue actif' : 'Connecter un fournisseur', 'CNSitePro.panel()') + (isEdu ? '' : fmTile);
      return /<\/div>\s*$/.test(h) ? h.replace(/<\/div>\s*$/, add + '</div>') : h + add;
    };
    window.CNSitePro = { formation: openFormation, hours: openHours, cart: openCart, poster: openPoster, stats: function () { openStats(30); }, panel: openPanel };
    try { if (typeof renderSiteStatusView === 'function' && document.getElementById('site-builder-status') && mySiteCache) renderSiteStatusView(); } catch (e) { /* ignore */ }
  }
})();
