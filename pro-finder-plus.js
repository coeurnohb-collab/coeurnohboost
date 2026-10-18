/* Coeurnoh Universe — « Trouver un professionnel » : version professionnelle.
   - Client : tableau de bord, suivi par étapes, urgence et date souhaitée, comparaison des devis
     (meilleur prix, mieux noté, écart au prix moyen), réputation du professionnel, avis par étoiles,
     republier une demande.
   - Professionnel : tri (récentes, urgentes, budget), badges d'urgence, délai et validité du devis,
     historique de devis avec la demande concernée, retrait d'un devis en attente.
   - Corrige un bug : un nom de professionnel contenant une apostrophe (ex. « L'Atelier ») empêchait
     d'accepter son devis.
   Ne modifie pas script.js : surcharge les fonctions globales de l'écran. */
(function () {
  'use strict';
  if (window.__cnProPlus) return; window.__cnProPlus = true;
  var tries = 0;
  function go() {
    if (typeof window.loadMySRequests !== 'function' || typeof window.viewSRequestQuotes !== 'function' || typeof window.saveSRequest !== 'function') { if (++tries < 120) setTimeout(go, 250); return; }
    main();
  }
  function main() {
    var $ = function (id) { return document.getElementById(id); };
    function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
    function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
    function emsg(e) { try { return friendlyErrorMessage(e); } catch (x) { return (e && e.message) || 'Erreur'; } }
    function ago(iso) {
      var t = new Date(iso).getTime(); if (!t) return '';
      var m = Math.floor((Date.now() - t) / 60000);
      if (m < 2) return 'à l’instant'; if (m < 60) return 'il y a ' + m + ' min'; var h = Math.floor(m / 60); if (h < 24) return 'il y a ' + h + ' h';
      var d = Math.floor(h / 24); return d < 30 ? 'il y a ' + d + ' j' : new Date(iso).toLocaleDateString('fr-FR');
    }
    var URG = { now: ['Urgent', '#d7263d', '#fde5e8'], week: ['Cette semaine', '#b5720b', '#fff4e0'], flex: ['Flexible', '#4a5568', '#e9edf3'] };
    function urgBadge(u) { var x = URG[u]; return x ? '<span class="pp-b" style="background:' + x[2] + ';color:' + x[1] + '">' + x[0] + '</span>' : ''; }
    function dfr(v) { var d = new Date(v + (String(v).length === 10 ? 'T12:00:00' : '')); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }

    var CSS = '.pp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.pp-s{background:var(--white,#fff);border-radius:16px;padding:12px;text-align:center;box-shadow:0 2px 12px rgba(20,38,63,.07)}.pp-s b{display:block;font-size:1.3rem}.pp-s small{font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#5d6779)}' +
      '.pp-b{display:inline-block;padding:3px 9px;border-radius:999px;font-size:.68rem;font-weight:800;letter-spacing:.03em;margin:0 6px 4px 0}.pp-card{background:var(--white,#fff);border-radius:18px;padding:14px;margin-bottom:12px;box-shadow:0 2px 12px rgba(20,38,63,.07)}.pp-card.f{box-shadow:0 0 0 2px #f5a623,0 2px 12px rgba(20,38,63,.07)}' +
      '.pp-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.pp-top b{font-size:1rem}.pp-m{color:var(--muted,#5d6779);font-size:.8rem;margin:4px 0}.pp-steps{display:flex;gap:4px;margin:10px 0 6px}.pp-steps i{flex:1;height:5px;border-radius:3px;background:#e3e8f0}.pp-steps i.on{background:#1b4fd8}.pp-steps i.ok{background:#0b9a6a}' +
      '.pp-lbl{display:flex;justify-content:space-between;font-size:.68rem;color:var(--muted,#5d6779);font-weight:700;margin-bottom:8px}.pp-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.pp-sort{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none}.pp-sort button{flex:0 0 auto;border:0;border-radius:999px;padding:7px 13px;font-weight:700;font-size:.78rem;background:#e9edf3;color:#34415a;cursor:pointer}.pp-sort button.on{background:#14263f;color:#fff}' +
      '.pp-sum{background:#14263f;color:#fff;border-radius:16px;padding:14px;margin-bottom:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}.pp-sum small{display:block;font-size:.66rem;opacity:.75;text-transform:uppercase;letter-spacing:.05em}.pp-sum b{font-size:1.05rem}' +
      '.pp-rep{font-size:.78rem;color:var(--muted,#5d6779)}.pp-stars{display:flex;gap:6px;justify-content:center;margin:6px 0 14px}.pp-stars button{border:0;background:none;padding:2px;cursor:pointer;color:#cbd2de}.pp-stars button.on{color:#f59f00}' +
      '.pp-chips{display:flex;gap:6px;flex-wrap:wrap}.pp-chips button{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:999px;padding:7px 13px;font-weight:700;font-size:.8rem;cursor:pointer;color:inherit}.pp-chips button.on{background:#14263f;color:#fff;border-color:#14263f}';
    if (!$('pp-css')) { var st = document.createElement('style'); st.id = 'pp-css'; st.textContent = CSS; document.head.appendChild(st); }

    /* ================== CLIENT : mes demandes ================== */
    var STEP = { open: 1, in_progress: 2, completed: 3, cancelled: 0 };
    window.loadMySRequests = async function () {
      var listEl = $('srequest-mine-list'); if (!listEl) return;
      if (!currentUser) { listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour publier une demande.</p>'; return; }
      listEl.innerHTML = renderFeedSkeletons(2);
      try {
        var snap = await db.collection('service_requests').where('clientUid', '==', currentUser.uid).limit(200).get();
        srequestMineCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        srequestMineCache.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
        if (!srequestMineCache.length) { listEl.innerHTML = '<div class="pp-card" style="text-align:center"><b>Aucune demande pour l’instant</b><p class="pp-m">Décris ton besoin : les professionnels autour de toi t’envoient leurs devis, tu compares et tu choisis.</p></div>'; return; }
        var quoteInfo = {};
        try {
          var open = srequestMineCache.filter(function (r) { return r.status === 'open'; });
          var snaps = await Promise.all(open.map(function (r) { return db.collection('service_quotes').where('requestId', '==', r.id).limit(200).get(); }));
          open.forEach(function (r, i) { var ps = snaps[i].docs.map(function (d) { return Number(d.data().price) || 0; }).filter(Boolean); quoteInfo[r.id] = { n: snaps[i].size, min: ps.length ? Math.min.apply(null, ps) : 0 }; });
        } catch (e) { /* secondaire */ }
        var cnt = { open: 0, in_progress: 0, completed: 0 };
        srequestMineCache.forEach(function (r) { if (cnt[r.status] != null) cnt[r.status]++; });
        var html = '<div class="pp-stats"><div class="pp-s"><b>' + cnt.open + '</b><small>Ouvertes</small></div><div class="pp-s"><b>' + cnt.in_progress + '</b><small>En cours</small></div><div class="pp-s"><b>' + cnt.completed + '</b><small>Terminées</small></div></div>';
        html += srequestMineCache.map(function (r) {
          var s = STEP[r.status] || 0, qi = quoteInfo[r.id], cancelled = r.status === 'cancelled';
          var steps = [1, 2, 3].map(function (k) { return '<i class="' + (cancelled ? '' : (k < s || (k === 3 && s === 3)) ? 'ok' : k === s ? 'on' : '') + '"></i>'; }).join('');
          return '<div class="pp-card' + (r.featured ? ' f' : '') + '" data-id="' + esc(r.id) + '"><div class="pp-top"><b>' + esc(r.title) + '</b><span class="shop-card-category">' + esc(SREQUEST_STATUS_LABELS[r.status] || r.status) + '</span></div>' +
            '<div class="pp-m">' + esc(NEARBY_CATEGORY_LABELS[r.category] || '') + ' · ' + esc(r.city || '') + ' · publiée ' + esc(ago(r.createdAt)) + '</div>' +
            '<div>' + urgBadge(r.urgency) + (r.neededBy ? '<span class="pp-b" style="background:#e8f0fa;color:#1d4f91">Pour le ' + esc(dfr(r.neededBy)) + '</span>' : '') + (r.budget ? '<span class="pp-b" style="background:#e9edf3;color:#34415a">Budget ' + esc(r.budget) + '</span>' : '') + (r.featured ? '<span class="pp-b" style="background:#fff4e0;color:#b5720b">Mise en avant</span>' : '') + '</div>' +
            (cancelled ? '' : '<div class="pp-steps">' + steps + '</div><div class="pp-lbl"><span>Publiée</span><span>Devis reçus</span><span>Terminée</span></div>') +
            (r.status === 'open' ? '<div class="pp-m">' + (qi && qi.n ? '<b>' + qi.n + ' devis reçu' + (qi.n > 1 ? 's' : '') + '</b>' + (qi.min ? ' · à partir de ' + qi.min.toFixed(2) + ' $' : '') : 'En attente des premiers devis. Pense à partager ta demande.') + '</div>' : '') +
            (r.status === 'in_progress' ? '<div class="pp-m">Attribuée à <b>' + esc(r.acceptedProName || '') + '</b></div>' + renderContactLinksHtml({ whatsapp: r.acceptedProPhone, email: r.acceptedProEmail, facebook: r.acceptedProFacebook, tiktok: r.acceptedProTiktok }, 'row') : '') +
            '<div class="pp-acts">' + (r.status === 'open' ? '<button class="btn btn-primary btn-sm" data-pp="quotes">Comparer les devis</button>' : '') +
            (r.status === 'in_progress' ? '<button class="btn btn-primary btn-sm" data-pp="done">Marquer terminée</button>' : '') +
            (r.status === 'open' ? '<button class="btn btn-outline btn-sm" data-pp="share">Partager</button><button class="btn btn-outline btn-sm" data-pp="cancel">Annuler</button>' : '') +
            ((r.status === 'completed' || r.status === 'cancelled') ? '<button class="btn btn-outline btn-sm" data-pp="again">Republier</button>' : '') +
            '<button class="btn btn-outline btn-sm" style="color:var(--red-text);border-color:var(--red-text)" data-pp="del">Supprimer</button></div></div>';
        }).join('');
        listEl.innerHTML = html;
        listEl.onclick = function (e) {
          var b = e.target.closest && e.target.closest('[data-pp]'); if (!b) return; var card = b.closest('[data-id]'); if (!card) return; var id = card.getAttribute('data-id'), a = b.getAttribute('data-pp');
          var r = srequestMineCache.find(function (x) { return x.id === id; });
          if (a === 'quotes') window.viewSRequestQuotes(id); else if (a === 'done') window.completeSRequest(id); else if (a === 'cancel') window.cancelSRequest(id); else if (a === 'del') window.deleteSRequest(id);
          else if (a === 'again' && r) republish(r); else if (a === 'share' && r) shareReq(r);
        };
      } catch (e) { listEl.innerHTML = '<p class="muted small">Erreur de chargement : ' + esc(e.message) + '</p>'; }
    };
    function shareReq(r) {
      var text = 'Je cherche : ' + r.title + ' (' + (r.city || '') + '). Envoie ton devis sur Coeurnoh Universe.\nhttps://coeurnohuniverse.com/?open=srequests';
      if (navigator.share) navigator.share({ title: 'Demande de service', text: text }).catch(function () { /* annulé */ }); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    }
    async function republish(r) {
      if (!confirm('Republier cette demande avec les mêmes informations ?')) return;
      try {
        var p = { clientUid: currentUser.uid, clientName: currentUser.name || 'Client', title: r.title, category: r.category, city: r.city, description: r.description, budget: r.budget || '', phone: r.phone || null, status: 'open', acceptedProUid: null, acceptedProName: null, featured: false, createdAt: new Date().toISOString() };
        ['whatsapp', 'email', 'facebook', 'tiktok'].forEach(function (k) { if (r[k]) p[k] = r[k]; });
        await db.collection('service_requests').add(p); toast('Demande republiée', 'success'); window.loadMySRequests();
      } catch (e) { toast(emsg(e), 'error'); }
    }

    /* ----- formulaire : urgence + date souhaitée ----- */
    var origForm = window.openSRequestForm;
    window.openSRequestForm = function () {
      origForm.apply(this, arguments);
      var m = $('srequest-form-modal'); if (!m || $('srequest-urgency')) return;
      var anchor = $('srequest-budget'); anchor = anchor && anchor.closest('.field'); if (!anchor) return;
      anchor.insertAdjacentHTML('beforebegin', '<div class="field"><label>Urgence</label><div class="pp-chips" id="srequest-urgency" data-v="flex"><button type="button" data-u="now">Urgent</button><button type="button" data-u="week">Cette semaine</button><button type="button" data-u="flex" class="on">Flexible</button></div></div>' +
        '<div class="field"><label for="srequest-needed">Date souhaitée (facultatif)</label><input type="date" id="srequest-needed" class="text-input" min="' + new Date().toISOString().slice(0, 10) + '"></div>');
      $('srequest-urgency').addEventListener('click', function (e) { var b = e.target.closest('[data-u]'); if (!b) return; this.setAttribute('data-v', b.getAttribute('data-u')); Array.prototype.forEach.call(this.children, function (c) { c.classList.toggle('on', c === b); }); });
      var d = $('srequest-description'); if (d) d.setAttribute('placeholder', 'Décris précisément : quoi, où, quand, dimensions, état actuel…');
    };
    window.saveSRequest = async function () {
      var btn = $('srequest-save-btn'), msgEl = $('srequest-form-msg');
      var title = $('srequest-title').value.trim(), category = $('srequest-category').value, city = $('srequest-city').value.trim(), description = $('srequest-description').value.trim();
      var budget = $('srequest-budget').value.trim(), phone = $('srequest-phone').value.trim();
      if (!title || !city || !description) { msgEl.textContent = 'Merci de remplir au moins le titre, la ville et les détails.'; return; }
      if (title.length < 6) { msgEl.textContent = 'Le titre est trop court : précise ton besoin.'; return; }
      if (btn.disabled) return; btn.disabled = true; btn.textContent = 'Publication…';
      var urg = $('srequest-urgency') ? $('srequest-urgency').getAttribute('data-v') : 'flex', needed = $('srequest-needed') ? $('srequest-needed').value : '';
      var base = Object.assign({ clientUid: currentUser.uid, clientName: currentUser.name || 'Client', title: title, category: category, city: city, description: description, budget: budget, phone: phone || null },
        readContactFieldsValues('srequest'), { status: 'open', acceptedProUid: null, acceptedProName: null, featured: false, createdAt: new Date().toISOString() });
      try {
        try { await db.collection('service_requests').add(Object.assign({}, base, { urgency: urg, neededBy: needed || null })); }
        catch (e1) {
          // Règles Firestore plus strictes : on republie sans les champs facultatifs, en gardant l'information dans la description.
          var extra = (urg === 'now' ? '[Urgent] ' : urg === 'week' ? '[Cette semaine] ' : '') + (needed ? '[Pour le ' + dfr(needed) + '] ' : '');
          await db.collection('service_requests').add(Object.assign({}, base, { description: (extra + description).slice(0, 500) }));
        }
        $('srequest-form-modal').remove(); toast('Demande publiée', 'success'); window.loadMySRequests();
      } catch (e) { msgEl.textContent = emsg(e); btn.disabled = false; btn.textContent = 'Publier la demande'; }
    };

    /* ================== CLIENT : comparer les devis ================== */
    var QSORT = 'price';
    window.viewSRequestQuotes = async function (requestId) {
      if ($('srequest-quotes-modal')) return;
      var req = (srequestMineCache || []).find(function (r) { return r.id === requestId; }); if (!req) return;
      document.body.insertAdjacentHTML('beforeend', '<div class="modal-overlay" id="srequest-quotes-modal"><div class="modal" style="max-width:480px;max-height:92vh;overflow-y:auto"><button class="modal-close" aria-label="Fermer" data-pp-x="1">×</button><h3 style="margin-bottom:4px">Comparer les devis</h3><p class="muted small" style="margin-bottom:12px">' + esc(req.title) + '</p><div id="srequest-quotes-list"><p class="muted small">Chargement…</p></div></div></div>');
      var modal = $('srequest-quotes-modal'), listEl = $('srequest-quotes-list');
      modal.addEventListener('click', function (e) {
        var t = e.target; if (!t.closest) return;
        if (t === modal || t.closest('[data-pp-x]')) { modal.remove(); return; }
        var s = t.closest('[data-qs]'); if (s) { QSORT = s.getAttribute('data-qs'); draw(); return; }
        var a = t.closest('[data-acc]'); if (a) { window.acceptQuote(requestId, a.getAttribute('data-acc'), a.getAttribute('data-name')); }
      });
      var quotes = [], rep = {};
      function draw() {
        if (!quotes.length) { listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:14px 0">Aucun devis reçu pour l’instant. Les professionnels sont notifiés : reviens dans quelques heures.</p>'; return; }
        var prices = quotes.map(function (q) { return Number(q.price) || 0; }).filter(Boolean), mn = Math.min.apply(null, prices), mx = Math.max.apply(null, prices), avg = prices.reduce(function (a, b) { return a + b; }, 0) / (prices.length || 1);
        var bestRated = null; quotes.forEach(function (q) { var r = rep[q.proUid]; if (r && r.count >= 1 && (!bestRated || r.avg > rep[bestRated].avg)) bestRated = q.proUid; });
        var sorted = quotes.slice().sort(function (a, b) {
          if (QSORT === 'rating') return ((rep[b.proUid] ? rep[b.proUid].avg : 0) - (rep[a.proUid] ? rep[a.proUid].avg : 0)) || (a.price - b.price);
          if (QSORT === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
          return (Number(a.price) || 0) - (Number(b.price) || 0);
        });
        var h = '<div class="pp-sum"><div><small>Le moins cher</small><b>' + mn.toFixed(2) + ' $</b></div><div><small>Moyenne</small><b>' + avg.toFixed(2) + ' $</b></div><div><small>Le plus cher</small><b>' + mx.toFixed(2) + ' $</b></div></div>' +
          '<div class="pp-sort">' + [['price', 'Prix croissant'], ['rating', 'Mieux notés'], ['recent', 'Plus récents']].map(function (x) { return '<button type="button" data-qs="' + x[0] + '" class="' + (QSORT === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
        h += sorted.map(function (q) {
          var r = rep[q.proUid], p = Number(q.price) || 0, diff = avg ? Math.round((p - avg) / avg * 100) : 0;
          return '<div class="pp-card' + (q.featured ? ' f' : '') + '"><div class="pp-top"><b>' + esc(q.proName) + '</b><b>' + p.toFixed(2) + ' $</b></div><div style="margin-top:4px">' +
            (p === mn && prices.length > 1 ? '<span class="pp-b" style="background:#e3f6ec;color:#0b7a50">Meilleur prix</span>' : '') + (q.proUid === bestRated && Object.keys(rep).length > 0 ? '<span class="pp-b" style="background:#fff4e0;color:#b5720b">Mieux noté</span>' : '') + (q.featured ? '<span class="pp-b" style="background:#e8f0fa;color:#1d4f91">Mis en avant</span>' : '') +
            (q.delay ? '<span class="pp-b" style="background:#e9edf3;color:#34415a">Délai : ' + esc(q.delay) + '</span>' : '') + '</div>' +
            '<div class="pp-rep">' + (r ? '★ ' + r.avg.toFixed(1) + ' · ' + r.count + ' avis' + (r.done ? ' · ' + r.done + ' service' + (r.done > 1 ? 's' : '') + ' terminé' + (r.done > 1 ? 's' : '') : '') : 'Pas encore d’avis') + (prices.length > 1 ? ' · ' + (diff === 0 ? 'prix moyen' : (diff > 0 ? '+' : '') + diff + ' % vs moyenne') : '') + ' · reçu ' + esc(ago(q.createdAt)) + '</div>' +
            (q.message ? '<p class="muted small" style="margin:8px 0 0">' + esc(q.message) + '</p>' : '') +
            '<div class="pp-acts"><button class="btn btn-primary btn-sm" data-acc="' + esc(q.proUid) + '" data-name="' + esc(q.proName) + '">Accepter ce devis</button>' + renderContactLinksHtml({ whatsapp: q.proPhone, email: q.proEmail, facebook: q.proFacebook, tiktok: q.proTiktok }, 'row') + '</div></div>';
        }).join('');
        listEl.innerHTML = h;
      }
      try {
        var snap = await db.collection('service_quotes').where('requestId', '==', requestId).limit(200).get();
        quotes = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        draw();
        var uids = Array.from(new Set(quotes.map(function (q) { return q.proUid; })));
        await Promise.all(uids.map(async function (u) {
          try { var rs = await db.collection('professional_reviews').where('proUid', '==', u).limit(200).get(); var a = rs.docs.map(function (d) { return d.data(); }); if (a.length) rep[u] = { avg: a.reduce(function (s, r) { return s + (r.rating || 0); }, 0) / a.length, count: a.length, done: 0 }; } catch (e) { /* secondaire */ }
          try { var ds = await db.collection('service_requests').where('acceptedProUid', '==', u).limit(200).get(); var n = ds.docs.filter(function (d) { return d.data().status === 'completed'; }).length; if (n) { rep[u] = rep[u] || { avg: 0, count: 0, done: 0 }; rep[u].done = n; } } catch (e) { /* secondaire */ }
        }));
        if ($('srequest-quotes-modal')) draw();
      } catch (e) { listEl.innerHTML = '<p class="muted small">Erreur de chargement : ' + esc(e.message) + '</p>'; }
    };

    /* ----- avis par étoiles ----- */
    var origReview = window.openReviewForm;
    window.openReviewForm = function () {
      origReview.apply(this, arguments);
      var sel = $('review-rating'); if (!sel || $('pp-stars')) return;
      var f = sel.closest('.field'); if (!f) return; sel.value = '5'; f.style.display = 'none';
      var star = '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5 7 .8-5.200 4.800 1.400 7L12 17.500 5.800 21l1.400-7L2 9.300l7-.8z"/></svg>';
      f.insertAdjacentHTML('beforebegin', '<div class="pp-stars" id="pp-stars" role="radiogroup" aria-label="Note">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" class="on" aria-label="' + n + ' sur 5">' + star + '</button>'; }).join('') + '</div><p class="muted small" id="pp-stars-l" style="text-align:center;margin:-6px 0 12px">Excellent</p>');
      var L = ['', 'Mauvais', 'Décevant', 'Correct', 'Très bien', 'Excellent'];
      $('pp-stars').addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (!b) return; var n = +b.getAttribute('data-n'); sel.value = String(n); Array.prototype.forEach.call(this.children, function (c) { c.classList.toggle('on', +c.getAttribute('data-n') <= n); }); $('pp-stars-l').textContent = L[n]; });
    };

    /* ----- sécurité : accepter un devis (apostrophes dans le nom) ----- */
    // acceptQuote d'origine conservée : seul l'appel change (données dans des attributs data-*, pas dans onclick).

    /* ================== PROFESSIONNEL : demandes à pourvoir ================== */
    var SORT = 'recent';
    window.runSRequestFilter = function () {
      if (!srequestAvailableCache) return;
      var q = ($('srequest-search-input') ? $('srequest-search-input').value : '').trim().toLowerCase();
      var m = srequestAvailableCache.filter(function (r) {
        if (srequestSelectedCategory && r.category !== srequestSelectedCategory) return false;
        if (q && (String(r.title || '') + ' ' + String(r.city || '') + ' ' + String(r.description || '')).toLowerCase().indexOf(q) < 0) return false; return true;
      });
      var rank = { now: 0, week: 1, flex: 2 }, num = function (r) { var x = String(r.budget || '').match(/\d+([.,]\d+)?/g); return x ? Math.max.apply(null, x.map(function (v) { return parseFloat(v.replace(',', '.')); })) : 0; };
      m.sort(function (a, b) {
        var f = (b.featured ? 1 : 0) - (a.featured ? 1 : 0); if (f) return f;
        if (SORT === 'urgent') { var u = (rank[a.urgency] != null ? rank[a.urgency] : 3) - (rank[b.urgency] != null ? rank[b.urgency] : 3); if (u) return u; }
        if (SORT === 'budget') { var bb = num(b) - num(a); if (bb) return bb; }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      window.renderAvailableSRequests(m);
    };
    window.renderAvailableSRequests = function (list) {
      var listEl = $('srequest-available-list'); if (!listEl) return;
      var visible = list.filter(function (r) { return !blockedSet.has(r.clientUid) && (!currentUser || r.clientUid !== currentUser.uid); });
      var head = '<div class="pp-sort" id="pp-sort">' + [['recent', 'Récentes'], ['urgent', 'Urgentes'], ['budget', 'Budget']].map(function (x) { return '<button type="button" data-so="' + x[0] + '" class="' + (SORT === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '<span class="muted small" style="margin-left:auto;align-self:center;white-space:nowrap">' + visible.length + ' demande' + (visible.length > 1 ? 's' : '') + '</span></div>';
      if (!visible.length) { listEl.innerHTML = head + '<p class="muted small" style="text-align:center;padding:20px 0">Aucune demande disponible dans cette catégorie pour l’instant. Reviens bientôt.</p>'; bindSort(listEl); return; }
      listEl.innerHTML = head + visible.map(function (r) {
        var quoted = srequestMyQuotedIds && srequestMyQuotedIds.has(r.id), fresh = r.createdAt && Date.now() - new Date(r.createdAt).getTime() < 86400000;
        return '<div class="pp-card' + (r.featured ? ' f' : '') + '"><div>' + urgBadge(r.urgency) + (fresh ? '<span class="pp-b" style="background:#e3f6ec;color:#0b7a50">Nouveau</span>' : '') + (r.featured ? '<span class="pp-b" style="background:#fff4e0;color:#b5720b">Mise en avant</span>' : '') + '</div>' +
          '<b>' + esc(r.title) + '</b><div class="pp-m">' + esc(NEARBY_CATEGORY_LABELS[r.category] || '') + ' · ' + esc(r.city || '') + ' · ' + esc(ago(r.createdAt)) + (r.neededBy ? ' · pour le ' + esc(dfr(r.neededBy)) : '') + '</div>' +
          (r.budget ? '<div class="pp-m">Budget indicatif : <b>' + esc(r.budget) + '</b></div>' : '') + '<p class="muted small" style="margin:6px 0 10px">' + esc(r.description || '') + '</p>' +
          '<div class="pp-acts" style="margin-top:0">' + (quoted ? '<span class="shop-card-category">Devis envoyé</span>' : '<button class="btn btn-primary btn-sm" onclick="openQuoteForm(\'' + esc(r.id) + '\')">Envoyer un devis</button>') + renderContactLinksHtml(Object.assign({}, r, { whatsapp: r.phone }), 'row') + '</div></div>';
      }).join('');
      bindSort(listEl);
    };
    function bindSort(listEl) { var s = $('pp-sort'); if (s) s.onclick = function (e) { var b = e.target.closest('[data-so]'); if (!b) return; SORT = b.getAttribute('data-so'); window.runSRequestFilter(); }; }

    /* ----- devis : délai + validité ----- */
    var origQF = window.openQuoteForm;
    window.openQuoteForm = function (id) {
      origQF.apply(this, arguments);
      var m = $('quote-form-modal'); if (!m || $('quote-delay')) return;
      var a = $('quote-message'); a = a && a.closest('.field'); if (!a) return;
      a.insertAdjacentHTML('beforebegin', '<div class="field"><label for="quote-delay">Délai de réalisation</label><select id="quote-delay" class="select-input"><option value="">Non précisé</option><option>Immédiat</option><option>24 heures</option><option>2 à 3 jours</option><option>1 semaine</option><option>2 semaines</option><option>Plus de 2 semaines</option></select></div>');
      var msg = $('quote-message'); if (msg) msg.setAttribute('placeholder', 'Présente ton expérience, ce que ton prix inclut (déplacement, matériel…), tes disponibilités.');
    };
    var origSQ = window.saveQuote;
    window.saveQuote = async function (requestId) {
      var d = $('quote-delay'), delay = d ? d.value : '', p = parseFloat(($('quote-price') || {}).value);
      if (p && p > 0 && delay) {
        // Mémorise le délai à la volée : on attend l'écriture du devis puis on le complète (silencieux si les règles l'interdisent).
        var uidNow = currentUser && currentUser.uid;
        await origSQ.apply(this, arguments);
        try { if (uidNow && !$('quote-form-modal')) await db.collection('service_quotes').doc(requestId + '_' + uidNow).update({ delay: delay }); } catch (e) { /* facultatif */ }
        return;
      }
      return origSQ.apply(this, arguments);
    };

    /* ----- mes devis envoyés : avec la demande, retrait possible ----- */
    window.loadMyQuotes = async function () {
      var listEl = $('srequest-myquotes-list'); if (!listEl) return;
      if (!currentUser) { listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour voir tes devis.</p>'; return; }
      listEl.innerHTML = renderFeedSkeletons(2);
      try {
        var snap = await db.collection('service_quotes').where('proUid', '==', currentUser.uid).limit(200).get();
        srequestMyQuotesCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        srequestMyQuotesCache.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
        if (!srequestMyQuotesCache.length) { listEl.innerHTML = '<div class="pp-card" style="text-align:center"><b>Aucun devis envoyé</b><p class="pp-m">Va dans « Demandes à pourvoir » et réponds aux demandes de ta catégorie : un prix clair et un message précis augmentent tes chances.</p></div>'; return; }
        var c = { pending: 0, accepted: 0, declined: 0 }; srequestMyQuotesCache.forEach(function (q) { if (c[q.status] != null) c[q.status]++; });
        var rate = srequestMyQuotesCache.length ? Math.round(c.accepted / srequestMyQuotesCache.length * 100) : 0;
        var titles = {};
        await Promise.all(srequestMyQuotesCache.slice(0, 40).map(async function (q) { try { var d = await db.collection('service_requests').doc(q.requestId).get(); if (d.exists) titles[q.requestId] = d.data(); } catch (e) { /* secondaire */ } }));
        var LBL = { pending: ['En attente', '#b5720b', '#fff4e0'], accepted: ['Accepté', '#0b7a50', '#e3f6ec'], declined: ['Refusé', '#4a5568', '#e9edf3'] };
        listEl.innerHTML = '<div class="pp-stats"><div class="pp-s"><b>' + c.pending + '</b><small>En attente</small></div><div class="pp-s"><b>' + c.accepted + '</b><small>Acceptés</small></div><div class="pp-s"><b>' + rate + ' %</b><small>Taux d’acceptation</small></div></div>' +
          srequestMyQuotesCache.map(function (q) {
            var r = titles[q.requestId], l = LBL[q.status] || [q.status, '#4a5568', '#e9edf3'];
            return '<div class="pp-card" data-qid="' + esc(q.id) + '"><div class="pp-top"><b>' + esc(r ? r.title : 'Demande') + '</b><b>' + (Number(q.price) || 0).toFixed(2) + ' $</b></div><div class="pp-m">' + (r ? esc(r.city || '') + ' · ' : '') + 'envoyé ' + esc(ago(q.createdAt)) + (q.delay ? ' · délai ' + esc(q.delay) : '') + '</div>' +
              '<span class="pp-b" style="background:' + l[2] + ';color:' + l[1] + '">' + esc(l[0]) + '</span>' + (r && r.status === 'completed' && q.status === 'accepted' ? '<span class="pp-b" style="background:#e3f6ec;color:#0b7a50">Service terminé</span>' : '') +
              (q.message ? '<p class="muted small" style="margin:6px 0 0">' + esc(q.message) + '</p>' : '') + (q.status === 'pending' ? '<div class="pp-acts"><button class="btn btn-outline btn-sm" style="color:var(--red-text);border-color:var(--red-text)" data-wd="1">Retirer mon devis</button></div>' : '') + '</div>';
          }).join('');
        listEl.onclick = async function (e) {
          var b = e.target.closest && e.target.closest('[data-wd]'); if (!b) return; var id = b.closest('[data-qid]').getAttribute('data-qid');
          if (!confirm('Retirer ce devis ? Le client ne le verra plus.')) return;
          try { await db.collection('service_quotes').doc(id).delete(); toast('Devis retiré', 'info'); if (srequestMyQuotedIds) { var q = srequestMyQuotesCache.find(function (x) { return x.id === id; }); if (q) srequestMyQuotedIds.delete(q.requestId); } window.loadMyQuotes(); } catch (er) { toast(emsg(er), 'error'); }
        };
      } catch (e) { listEl.innerHTML = '<p class="muted small">Erreur de chargement : ' + esc(e.message) + '</p>'; }
    };
  }
  go();
})();
