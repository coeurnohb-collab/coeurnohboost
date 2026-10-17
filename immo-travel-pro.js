/* Coeurnoh Universe — Immobilier & Voyage professionnels.
   Immobilier : cartes avec photo, filtres (devise, prix, chambres, ville), tri, comparateur (jusqu'à 3 biens),
                galerie photo, prix au m², simulateur de crédit (vente) / coût du loyer (location),
                demande de visite prête à envoyer, annonces similaires, partage.
   Voyage     : cartes avec photo, filtres (pays) et tri, galerie, météo des 5 prochains jours à destination,
                estimateur de budget, liste de préparation du voyage, lieux similaires, itinéraire.
   Aucun changement serveur. Les montants calculés sont des ESTIMATIONS indicatives. */
(function () {
  'use strict';
  if (window.__cnItPro) return; window.__cnItPro = true;
  var tries = 0;
  function go() {
    if (typeof window.renderImmoCards !== 'function' || typeof window.runImmoFilter !== 'function' || typeof window.openImmoDetail !== 'function' ||
        typeof window.renderTravelCards !== 'function' || typeof window.runTravelFilter !== 'function' || typeof window.openTravelDetail !== 'function') { if (++tries < 120) setTimeout(go, 250); return; }
    main();
  }
  function main() {
    var $ = function (id) { return document.getElementById(id); };
    function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
    function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }
    function fmt(n, d) { return (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: d == null ? 0 : d }); }
    function href(u) { try { return safeHref(u); } catch (e) { return /^https?:\/\//i.test(u) ? u : '#'; } }
    function isNew(p) { var t = new Date(p.createdAt).getTime(); return isFinite(t) && Date.now() - t < 7 * 86400000; }
    function photos(p) { return Array.isArray(p.photos) ? p.photos.filter(function (x) { return typeof x === 'string' && /^https?:\/\//i.test(x); }) : []; }
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
    function tl(map, k) { try { return t(map[k]) || k || ''; } catch (e) { return k || ''; } }

    var CSS = '.it-img{width:100%;height:150px;object-fit:cover;border-radius:12px;margin-bottom:10px;background:#e9edf3;display:block}.it-badges{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}.it-b{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:#e9edf3;color:#14263f}.it-b.n{background:#e3f6ec;color:#0b7a50}' +
      '.it-price{display:block;font-size:1.12rem;font-weight:800;margin:2px 0 6px}.it-fb{background:var(--white,#fff);border:1px solid var(--line,#dde3ec);border-radius:14px;padding:10px 12px;margin-bottom:12px}.it-fb summary{cursor:pointer;font-weight:700;font-size:.9rem}.it-g{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.it-g label{font-size:.72rem;font-weight:700;color:var(--muted,#5d6779);display:block;margin-bottom:3px}.it-g input,.it-g select{width:100%}' +
      '.it-bt{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:12px;padding:8px 13px;font-weight:700;font-size:.82rem;cursor:pointer;color:inherit}.it-bt.p{background:#1b4fd8;border-color:#1b4fd8;color:#fff}.it-cmp{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:700;margin-top:6px;cursor:pointer}' +
      '.it-bar{position:sticky;bottom:10px;z-index:30;background:#14263f;color:#fff;border-radius:14px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin:8px 0;box-shadow:0 6px 20px rgba(20,38,63,.3)}.it-bar button{border:0;border-radius:10px;padding:7px 14px;font-weight:700;cursor:pointer}' +
      '.it-sec{border-top:1px solid var(--line,#dde3ec);padding-top:12px;margin-top:12px}.it-sec h4{margin:0 0 8px;font-size:.95rem}.it-gal{margin-bottom:12px}.it-gal img.m{width:100%;max-height:260px;object-fit:cover;border-radius:14px;background:#e9edf3}.it-th{display:flex;gap:6px;margin-top:6px;overflow-x:auto}.it-th img{width:58px;height:46px;object-fit:cover;border-radius:8px;cursor:pointer;opacity:.7;flex:0 0 auto}.it-th img.on{opacity:1;outline:2px solid #1b4fd8}' +
      '.it-res{background:#f3f5f9;border-radius:12px;padding:10px 12px;margin-top:8px;font-size:.88rem;line-height:1.55}.it-res b{font-size:1.05rem}.it-note{font-size:.72rem;color:var(--muted,#5d6779);margin-top:6px}' +
      '.it-ov{position:fixed;inset:0;z-index:2750;background:rgba(10,20,36,.55);display:flex;align-items:flex-end;justify-content:center}.it-sheet{background:var(--white,#fff);width:100%;max-width:560px;border-radius:22px 22px 0 0;padding:18px 16px max(18px,env(safe-area-inset-bottom));max-height:90vh;overflow:auto}.it-tbl{width:100%;border-collapse:collapse;font-size:.84rem}.it-tbl th,.it-tbl td{padding:8px 6px;border-bottom:1px solid var(--line,#dde3ec);text-align:left;vertical-align:top}.it-tbl th{color:var(--muted,#5d6779);font-weight:700;width:30%}.it-tbl td.best{color:#0b7a50;font-weight:800}' +
      '.it-wx{display:flex;gap:6px;overflow-x:auto}.it-wx div{flex:1 0 62px;background:#f3f5f9;border-radius:12px;padding:8px 4px;text-align:center;font-size:.74rem}.it-wx b{display:block;font-size:.95rem}.it-ck label{display:flex;gap:8px;align-items:center;padding:6px 0;font-size:.88rem}.it-sim{display:flex;flex-direction:column;gap:6px}.it-sim a,.it-sim button{text-align:left}';
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    function gallery(list) {
      if (!list.length) return '';
      return '<div class="it-gal"><img class="m" src="' + esc(href(list[0])) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' + (list.length > 1 ? '<div class="it-th">' + list.map(function (u, i) { return '<img src="' + esc(href(u)) + '" class="' + (i ? '' : 'on') + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'; }).join('') + '</div>' : '') + '</div>';
    }
    function bindGallery(root) {
      var m = root.querySelector('.it-gal img.m'); if (!m) return;
      root.querySelectorAll('.it-th img').forEach(function (im) { im.addEventListener('click', function () { m.src = im.src; m.style.display = ''; root.querySelectorAll('.it-th img').forEach(function (x) { x.classList.remove('on'); }); im.classList.add('on'); }); });
    }
    function hideOldPhotoLinks(modal) {
      modal.querySelectorAll('div[style*="flex-wrap:wrap"]').forEach(function (d) { if (d.querySelector('a[target="_blank"]') && !d.querySelector('.btn')) d.style.display = 'none'; });
    }
    function sheet(html) {
      var o = document.createElement('div'); o.className = 'it-ov'; o.innerHTML = '<div class="it-sheet">' + html + '</div>';
      o.addEventListener('click', function (e) { if (e.target === o || (e.target.closest && e.target.closest('[data-it="close"]'))) o.remove(); });
      document.body.appendChild(o); return o;
    }
    function findIn(cacheNames, id) {
      for (var i = 0; i < cacheNames.length; i++) { var c = cacheNames[i](); if (c) { var f = c.find(function (x) { return x.id === id; }); if (f) return f; } }
      return null;
    }
    var immoById = function (id) { return findIn([function () { return typeof immoCache !== 'undefined' ? immoCache : null; }, function () { return typeof immoMyCache !== 'undefined' ? immoMyCache : null; }], id); };
    var travelById = function (id) { return findIn([function () { return typeof travelCache !== 'undefined' ? travelCache : null; }, function () { return typeof travelMyCache !== 'undefined' ? travelMyCache : null; }], id); };

    /* ======================= IMMOBILIER ======================= */
    var IM = { cur: '', min: '', max: '', beds: 0, city: '', sort: 'recent' }, CMP = [];
    function surf(p) { return num(p.surfaceArea); }
    function ppm(p) { var s = surf(p); return s > 0 && p.transactionType === 'vente' ? (Number(p.price) || 0) / s : 0; }

    window.runImmoFilter = function () {
      if (typeof immoCache === 'undefined' || !immoCache) return;
      ensureImmoFilters();
      var q = ($('immo-search-input') ? $('immo-search-input').value : '').trim().toLowerCase();
      var min = num(IM.min), max = num(IM.max);
      var list = immoCache.filter(function (p) {
        if (immoSelectedTransaction && p.transactionType !== immoSelectedTransaction) return false;
        if (immoSelectedType && p.propertyType !== immoSelectedType) return false;
        if (q && (String(p.title || '') + ' ' + String(p.city || '') + ' ' + String(p.description || '')).toLowerCase().indexOf(q) < 0) return false;
        if (IM.cur && (p.currency || 'USD') !== IM.cur) return false;
        if (min > 0 && (Number(p.price) || 0) < min) return false;
        if (max > 0 && (Number(p.price) || 0) > max) return false;
        if (IM.beds > 0 && (Number(p.bedrooms) || 0) < IM.beds) return false;
        if (IM.city && String(p.city || '').trim().toLowerCase() !== IM.city.toLowerCase()) return false;
        return true;
      });
      var by = { recent: function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }, asc: function (a, b) { return (a.price || 0) - (b.price || 0); }, desc: function (a, b) { return (b.price || 0) - (a.price || 0); }, surf: function (a, b) { return surf(b) - surf(a); } }[IM.sort];
      list.sort(by);
      window.renderImmoCards(list, 'immo-browse-list', t('immo_empty_browse'));
      var c = $('it-count'); if (c) c.textContent = list.length + ' annonce' + (list.length > 1 ? 's' : '');
      drawCmpBar();
    };
    function ensureImmoFilters() {
      var host = $('immo-tab-browse'), tabs = $('immo-type-tabs'); if (!host || !tabs) return;
      var cities = {}, curs = {};
      (immoCache || []).forEach(function (p) { if (p.city) cities[String(p.city).trim()] = 1; curs[p.currency || 'USD'] = 1; });
      var cityOpts = '<option value="">Toutes les villes</option>' + Object.keys(cities).sort().map(function (c) { return '<option' + (IM.city === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
      var curOpts = '<option value="">Toutes</option>' + Object.keys(curs).sort().map(function (c) { return '<option' + (IM.cur === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
      var box = $('it-fb');
      if (box && box.getAttribute('data-sig') === cityOpts + curOpts) return;
      var open = box && box.querySelector('details') && box.querySelector('details').open;
      if (!box) { box = document.createElement('div'); box.id = 'it-fb'; tabs.insertAdjacentElement('afterend', box); box.addEventListener('input', onFb); box.addEventListener('change', onFb); box.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('button[data-f="reset"]')) onFb(e); }); }
      box.setAttribute('data-sig', cityOpts + curOpts);
      box.className = 'it-fb';
      box.innerHTML = '<details' + (open ? ' open' : '') + '><summary>Filtres et tri <span class="muted small" id="it-count" style="font-weight:400"></span></summary><div class="it-g">' +
        '<div><label>Devise</label><select class="select-input" data-f="cur">' + curOpts + '</select></div><div><label>Chambres min.</label><select class="select-input" data-f="beds">' + [0, 1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (IM.beds === n ? ' selected' : '') + '>' + (n ? n + '+' : 'Indifférent') + '</option>'; }).join('') + '</select></div>' +
        '<div><label>Prix min.</label><input type="number" class="text-input" data-f="min" min="0" value="' + esc(IM.min) + '"></div><div><label>Prix max.</label><input type="number" class="text-input" data-f="max" min="0" value="' + esc(IM.max) + '"></div>' +
        '<div><label>Ville</label><select class="select-input" data-f="city">' + cityOpts + '</select></div><div><label>Trier par</label><select class="select-input" data-f="sort"><option value="recent"' + (IM.sort === 'recent' ? ' selected' : '') + '>Plus récentes</option><option value="asc"' + (IM.sort === 'asc' ? ' selected' : '') + '>Prix croissant</option><option value="desc"' + (IM.sort === 'desc' ? ' selected' : '') + '>Prix décroissant</option><option value="surf"' + (IM.sort === 'surf' ? ' selected' : '') + '>Plus grande surface</option></select></div></div>' +
        '<p class="it-note">Les prix filtrent la devise choisie. Choisissez une devise pour des résultats comparables.</p><button type="button" class="it-bt" data-f="reset" style="margin-top:8px">Réinitialiser</button></details>';
    }
    function onFb(e) {
      var el = e.target.closest && e.target.closest('[data-f]'); if (!el) return; var f = el.getAttribute('data-f');
      if (f === 'reset') { IM = { cur: '', min: '', max: '', beds: 0, city: '', sort: 'recent' }; var b = $('it-fb'); if (b) b.removeAttribute('data-sig'); window.runImmoFilter(); return; }
      if (e.type === 'input' && el.tagName === 'SELECT') return;
      IM[f] = f === 'beds' ? parseInt(el.value, 10) || 0 : el.value;
      clearTimeout(onFb.t); onFb.t = setTimeout(function () { window.runImmoFilter(); }, f === 'min' || f === 'max' ? 400 : 0);
    }

    window.renderImmoCards = function (list, targetId, emptyMessage) {
      var host = $(targetId); if (!host) return;
      var visible = list.filter(function (p) { return !(typeof blockedSet !== 'undefined' && blockedSet.has(p.ownerUid)); });
      if (!visible.length) { host.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">' + esc(emptyMessage) + '</p>'; return; }
      host.innerHTML = visible.map(function (p) {
        var ph = photos(p), d = [];
        if (p.bedrooms) d.push(esc(p.bedrooms) + ' ch.'); if (p.bathrooms) d.push(esc(p.bathrooms) + ' sdb'); if (p.surfaceArea) d.push(esc(p.surfaceArea));
        var pm = ppm(p);
        return '<div class="order-box" style="margin-bottom:12px">' + (ph.length ? '<img class="it-img" src="' + esc(href(ph[0])) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          '<div class="it-badges"><span class="it-b">' + esc(tl(IMMO_TRANSACTION_LABELS, p.transactionType)) + '</span><span class="it-b">' + esc(tl(IMMO_TYPE_LABELS, p.propertyType)) + '</span>' + (isNew(p) ? '<span class="it-b n">Nouveau</span>' : '') + '</div>' +
          '<strong style="font-size:1.02rem">' + esc(p.title || t('immo_default_title')) + '</strong><div class="muted small" style="margin:3px 0">' + esc(p.city || '—') + (d.length ? ' · ' + d.join(' · ') : '') + '</div>' +
          '<span class="it-price">' + fmt(p.price) + ' ' + esc(p.currency || 'USD') + (p.transactionType === 'location' ? ' ' + esc(t('immo_per_month_suffix')) : '') + '</span>' + (pm ? '<div class="it-note" style="margin:-2px 0 6px">≈ ' + fmt(pm) + ' ' + esc(p.currency || 'USD') + ' / m²</div>' : '') +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-outline btn-sm" onclick="openImmoDetail(\'' + esc(p.id) + '\')">' + esc(t('immo_view_details_btn')) + '</button>' +
          (targetId === 'immo-browse-list' ? '<label class="it-cmp"><input type="checkbox" data-cmp="' + esc(p.id) + '"' + (CMP.indexOf(p.id) >= 0 ? ' checked' : '') + '> Comparer</label>' : '') + '</div></div>';
      }).join('');
      if (!host.getAttribute('data-it')) { host.setAttribute('data-it', '1'); host.addEventListener('change', function (e) { var c = e.target.closest && e.target.closest('[data-cmp]'); if (!c) return; var id = c.getAttribute('data-cmp'), i = CMP.indexOf(id); if (c.checked) { if (CMP.length >= 3) { c.checked = false; toast('Vous pouvez comparer 3 biens au maximum.'); return; } CMP.push(id); } else if (i >= 0) CMP.splice(i, 1); drawCmpBar(); }); }
    };
    function drawCmpBar() {
      var b = $('it-cmpbar'), host = $('immo-browse-list'); if (!host) return;
      if (!CMP.length) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('div'); b.id = 'it-cmpbar'; b.className = 'it-bar'; host.insertAdjacentElement('afterend', b); b.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-c]'); if (!a) return; if (a.getAttribute('data-c') === 'clear') { CMP = []; window.runImmoFilter(); } else openCompare(); }); }
      b.innerHTML = '<span>' + CMP.length + ' bien' + (CMP.length > 1 ? 's' : '') + ' sélectionné' + (CMP.length > 1 ? 's' : '') + '</span><span><button data-c="clear" style="background:rgba(255,255,255,.15);color:#fff;margin-right:6px">Vider</button><button data-c="go" style="background:#fff;color:#14263f"' + (CMP.length < 2 ? ' disabled style="opacity:.5"' : '') + '>Comparer</button></span>';
    }
    function openCompare() {
      var items = CMP.map(immoById).filter(Boolean); if (items.length < 2) { toast('Sélectionnez au moins 2 biens.'); return; }
      var minPpm = Math.min.apply(null, items.map(ppm).filter(function (x) { return x > 0; }).concat([Infinity]));
      var minPrice = Math.min.apply(null, items.map(function (p) { return Number(p.price) || 0; }));
      var row = function (k, f, best) { return '<tr><th>' + k + '</th>' + items.map(function (p) { var v = f(p); return '<td class="' + (best && best(p) ? 'best' : '') + '">' + (v == null || v === '' ? '—' : v) + '</td>'; }).join('') + '</tr>'; };
      var sameCur = items.every(function (p) { return (p.currency || 'USD') === (items[0].currency || 'USD'); });
      sheet('<h3 style="margin:0 0 10px">Comparaison</h3><table class="it-tbl"><tr><th></th>' + items.map(function (p) { return '<td><b>' + esc(p.title || 'Bien') + '</b></td>'; }).join('') + '</tr>' +
        row('Prix', function (p) { return fmt(p.price) + ' ' + esc(p.currency || 'USD') + (p.transactionType === 'location' ? ' / mois' : ''); }, function (p) { return sameCur && (Number(p.price) || 0) === minPrice; }) +
        row('Offre', function (p) { return esc(tl(IMMO_TRANSACTION_LABELS, p.transactionType)); }) + row('Type', function (p) { return esc(tl(IMMO_TYPE_LABELS, p.propertyType)); }) + row('Ville', function (p) { return esc(p.city); }) +
        row('Chambres', function (p) { return esc(p.bedrooms); }) + row('Salles de bain', function (p) { return esc(p.bathrooms); }) + row('Surface', function (p) { return esc(p.surfaceArea); }) +
        row('Prix au m²', function (p) { var v = ppm(p); return v ? fmt(v) + ' ' + esc(p.currency || 'USD') : ''; }, function (p) { return sameCur && ppm(p) > 0 && ppm(p) === minPpm; }) +
        '</table>' + (sameCur ? '<p class="it-note">En vert : la meilleure valeur parmi les biens comparés.</p>' : '<p class="it-note">Devises différentes : les prix ne sont pas directement comparables.</p>') +
        '<button class="it-bt" data-it="close" style="margin-top:10px;width:100%">Fermer</button>');
    }

    function loanHtml(p) {
      if (p.transactionType === 'vente') {
        return '<div class="it-sec"><h4>Simulateur de crédit</h4><div class="it-g"><div><label>Apport (%)</label><input type="number" class="text-input" id="it-ap" value="20" min="0" max="90"></div><div><label>Durée (années)</label><input type="number" class="text-input" id="it-yr" value="15" min="1" max="30"></div><div><label>Taux annuel (%)</label><input type="number" class="text-input" id="it-rt" value="10" min="0" step="0.1"></div></div><div class="it-res" id="it-loan"></div><div class="it-note">Estimation indicative hors assurance et frais de dossier. Le taux réel dépend de votre banque ou institution de microfinance.</div></div>';
      }
      return '<div class="it-sec"><h4>Coût du loyer</h4><div class="it-g"><div><label>Mois d’avance demandés</label><input type="number" class="text-input" id="it-adv" value="3" min="0" max="24"></div><div><label>Durée du bail (mois)</label><input type="number" class="text-input" id="it-bail" value="12" min="1" max="120"></div></div><div class="it-res" id="it-rent"></div><div class="it-note">Estimation : confirmez avec le propriétaire le nombre de mois d’avance et les éventuelles charges.</div></div>';
    }
    function calcLoan(p) {
      var el = $('it-loan'); if (!el) return; var price = Number(p.price) || 0, ap = Math.min(90, Math.max(0, num($('it-ap').value))), yrs = Math.max(1, num($('it-yr').value)), rate = Math.max(0, num($('it-rt').value));
      var principal = price * (1 - ap / 100), n = yrs * 12, r = rate / 100 / 12, m = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n)), total = m * n, cur = esc(p.currency || 'USD');
      el.innerHTML = 'Apport : <b>' + fmt(price * ap / 100) + ' ' + cur + '</b><br>Montant emprunté : <b>' + fmt(principal) + ' ' + cur + '</b><br>Mensualité : <b>' + fmt(m) + ' ' + cur + '</b> pendant ' + fmt(yrs, 1) + ' an(s)<br>Coût total du crédit : <b>' + fmt(total - principal) + ' ' + cur + '</b>';
    }
    function calcRent(p) {
      var el = $('it-rent'); if (!el) return; var m = Number(p.price) || 0, adv = Math.max(0, num($('it-adv').value)), bail = Math.max(1, num($('it-bail').value)), cur = esc(p.currency || 'USD');
      el.innerHTML = 'À payer à l’entrée : <b>' + fmt(m * adv) + ' ' + cur + '</b> (' + fmt(adv) + ' mois)<br>Coût sur ' + fmt(bail) + ' mois : <b>' + fmt(m * bail) + ' ' + cur + '</b><br>Par an : <b>' + fmt(m * 12) + ' ' + cur + '</b>';
    }
    function visitHtml(p) {
      return '<div class="it-sec"><h4>Demander une visite</h4><div class="it-g"><div><label>Date souhaitée</label><input type="date" class="text-input" id="it-vd"></div><div><label>Heure</label><input type="time" class="text-input" id="it-vt" value="10:00"></div></div><textarea class="text-input" id="it-vm" rows="3" style="width:100%;margin-top:8px" placeholder="Message (facultatif)"></textarea><div class="it-sim" id="it-vl" style="margin-top:8px"></div></div>';
    }
    function visitLinks(p, kind) {
      var host = $('it-vl'); if (!host) return;
      var d = $('it-vd').value, tm = $('it-vt').value, extra = $('it-vm').value.trim();
      var when = d ? new Date(d + 'T' + (tm || '10:00')).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'à convenir';
      var msg = 'Bonjour, je suis intéressé(e) par « ' + (p.title || 'votre annonce') + ' »' + (p.city ? ' à ' + p.city : '') + ' sur Coeurnoh Universe. ' + (kind === 'travel' ? 'Pourrions-nous échanger au sujet d’un séjour ' : 'Puis-je organiser une visite ') + (d ? 'le ' : '') + when + ' ? ' + extra;
      var out = '';
      if (p.whatsapp) out += '<a class="it-bt p" target="_blank" rel="noopener" href="https://wa.me/' + String(p.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(msg) + '">Envoyer par WhatsApp</a>';
      if (p.email) out += '<a class="it-bt" href="mailto:' + esc(String(p.email).trim()) + '?subject=' + encodeURIComponent((kind === 'travel' ? 'Renseignements : ' : 'Demande de visite : ') + (p.title || '')) + '&body=' + encodeURIComponent(msg) + '">Envoyer par e-mail</a>';
      out += '<button type="button" class="it-bt" data-v="copy">Copier le message</button>';
      host.innerHTML = out;
      var cp = host.querySelector('[data-v="copy"]'); if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(msg).then(function () { toast('Message copié', 'success'); }); } catch (e) { toast('Copie impossible', 'error'); } };
    }
    function similarHtml(p, pool, openFn, label) {
      var sim = (pool || []).filter(function (x) { return x.id !== p.id && (!blockedHas(x)) && ((p.city && x.city === p.city) || (p.propertyType && x.propertyType === p.propertyType) || (p.category && x.category === p.category)); }).slice(0, 3);
      if (!sim.length) return '';
      return '<div class="it-sec"><h4>' + label + '</h4><div class="it-sim">' + sim.map(function (x) { return '<button type="button" class="it-bt" data-sim="' + esc(x.id) + '">' + esc(x.title || 'Voir') + (x.city ? ' · ' + esc(x.city) : '') + (x.price ? ' · ' + fmt(x.price) + ' ' + esc(x.currency || 'USD') : '') + '</button>'; }).join('') + '</div></div>';
    }
    function blockedHas(x) { try { return blockedSet.has(x.ownerUid); } catch (e) { return false; } }

    var origImmo = window.openImmoDetail;
    window.openImmoDetail = async function (id) {
      await origImmo.apply(this, arguments);
      try {
        var modal = $('immo-detail-modal'); if (!modal || modal.querySelector('.it-sec')) return;
        var p = immoById(id); if (!p) { var s = await db.collection('properties').doc(id).get(); if (!s.exists) return; p = Object.assign({ id: s.id }, s.data()); }
        var box = modal.querySelector('.modal'), h3 = box.querySelector('h3'), ph = photos(p);
        hideOldPhotoLinks(modal);
        if (ph.length && h3) { h3.insertAdjacentHTML('beforebegin', gallery(ph)); bindGallery(box); }
        var pm = ppm(p); if (pm) { var pr = box.querySelector('strong[style*="1.15rem"]'); if (pr) pr.insertAdjacentHTML('afterend', '<div class="it-note" style="margin:-6px 0 10px">≈ ' + fmt(pm) + ' ' + esc(p.currency || 'USD') + ' / m²</div>'); }
        var fav = $('immo-fav-btn'), extra = loanHtml(p) + visitHtml(p) + similarHtml(p, typeof immoCache !== 'undefined' ? immoCache : [], null, 'Annonces similaires');
        if (fav) fav.insertAdjacentHTML('beforebegin', '<div id="it-xtra">' + extra + '</div>'); else box.insertAdjacentHTML('beforeend', '<div id="it-xtra">' + extra + '</div>');
        var x = $('it-xtra');
        x.addEventListener('input', function () { if (p.transactionType === 'vente') calcLoan(p); else calcRent(p); visitLinks(p); });
        x.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-sim]'); if (b) { modal.remove(); window.openImmoDetail(b.getAttribute('data-sim')); } });
        if (p.transactionType === 'vente') calcLoan(p); else calcRent(p); visitLinks(p);
        if (window.CNShare && !modal.querySelector('[data-it="share"]') && fav) fav.insertAdjacentHTML('afterend', '<button type="button" data-it="share" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px">Partager cette annonce</button>');
        var sh = modal.querySelector('[data-it="share"]'); if (sh) sh.onclick = function () { try { window.CNShare.open({ kind: 'immo', id: p.id }); } catch (e) { /* ignore */ } };
      } catch (e) { /* amélioration facultative */ }
    };

    /* ======================= VOYAGE ======================= */
    var TV = { country: '', sort: 'recent' };
    window.runTravelFilter = function () {
      if (typeof travelCache === 'undefined' || !travelCache) return;
      ensureTravelFilters();
      var q = ($('travel-search-input') ? $('travel-search-input').value : '').trim().toLowerCase();
      var list = travelCache.filter(function (s) {
        if (travelSelectedCategory && s.category !== travelSelectedCategory) return false;
        if (q && (String(s.title || '') + ' ' + String(s.city || '') + ' ' + String(s.country || '') + ' ' + String(s.description || '')).toLowerCase().indexOf(q) < 0) return false;
        if (TV.country && String(s.country || '').trim().toLowerCase() !== TV.country.toLowerCase()) return false;
        return true;
      });
      list.sort(TV.sort === 'az' ? function (a, b) { return String(a.title || '').localeCompare(String(b.title || ''), 'fr'); } : function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
      window.renderTravelCards(list, 'travel-browse-list', t('travel_empty_browse'));
      var c = $('tv-count'); if (c) c.textContent = list.length + ' lieu' + (list.length > 1 ? 'x' : '');
    };
    function ensureTravelFilters() {
      var host = $('travel-tab-browse'), tabs = $('travel-category-tabs'); if (!host || !tabs) return;
      var countries = {}; (travelCache || []).forEach(function (s) { if (s.country) countries[String(s.country).trim()] = 1; });
      var opts = '<option value="">Tous les pays</option>' + Object.keys(countries).sort().map(function (c) { return '<option' + (TV.country === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
      var box = $('tv-fb'); if (box && box.getAttribute('data-sig') === opts) return;
      if (!box) { box = document.createElement('div'); box.id = 'tv-fb'; box.className = 'it-fb'; tabs.insertAdjacentElement('afterend', box); box.addEventListener('change', function (e) { var el = e.target.closest && e.target.closest('[data-f]'); if (!el) return; TV[el.getAttribute('data-f')] = el.value; window.runTravelFilter(); }); }
      box.setAttribute('data-sig', opts);
      box.innerHTML = '<div class="it-g" style="margin-top:0"><div><label>Pays</label><select class="select-input" data-f="country">' + opts + '</select></div><div><label>Trier par</label><select class="select-input" data-f="sort"><option value="recent"' + (TV.sort === 'recent' ? ' selected' : '') + '>Plus récents</option><option value="az"' + (TV.sort === 'az' ? ' selected' : '') + '>Ordre alphabétique</option></select></div></div><div class="it-note" id="tv-count"></div>';
    }
    window.renderTravelCards = function (list, targetId, emptyMessage) {
      var host = $(targetId); if (!host) return;
      var visible = list.filter(function (s) { return !blockedHas(s); });
      if (!visible.length) { host.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">' + esc(emptyMessage) + '</p>'; return; }
      host.innerHTML = visible.map(function (s) {
        var ph = photos(s);
        return '<div class="order-box" style="margin-bottom:12px">' + (ph.length ? '<img class="it-img" src="' + esc(href(ph[0])) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          '<div class="it-badges"><span class="it-b">' + esc(tl(TRAVEL_CATEGORY_LABELS, s.category)) + '</span>' + (isNew(s) ? '<span class="it-b n">Nouveau</span>' : '') + '</div>' +
          '<strong style="font-size:1.02rem">' + esc(s.title || t('travel_default_title')) + '</strong><div class="muted small" style="margin:3px 0">' + esc([s.city, s.country].filter(Boolean).join(', ') || '—') + '</div>' +
          (s.priceIndication ? '<div class="it-price" style="font-size:.95rem">' + esc(s.priceIndication) + '</div>' : '') +
          '<button class="btn btn-outline btn-sm" onclick="openTravelDetail(\'' + esc(s.id) + '\')">' + esc(t('travel_view_details_btn')) + '</button></div>';
      }).join('');
    };

    var WX = {};
    async function weather(s) {
      var key = (s.city || '') + '|' + (s.country || ''); if (WX[key]) return WX[key];
      var g = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=' + encodeURIComponent([s.city, s.country].filter(Boolean).join(', ')));
      var gj = await g.json(); if (!gj || !gj[0]) throw new Error('lieu');
      var w = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + gj[0].lat + '&longitude=' + gj[0].lon + '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5');
      var wj = await w.json(); if (!wj || !wj.daily) throw new Error('meteo');
      WX[key] = wj; return wj;
    }
    function wxHtml(wj) {
      var LP = window.CNLocationPro, d = wj.daily;
      return '<div class="it-wx">' + d.time.map(function (day, i) {
        var dn = new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        return '<div>' + esc(dn) + '<div>' + (LP && LP.wxIcon ? LP.wxIcon(d.weather_code[i], false, 30) : '') + '</div><b>' + Math.round(d.temperature_2m_max[i]) + '°</b>' + Math.round(d.temperature_2m_min[i]) + '°<div style="color:#1b4fd8">' + (d.precipitation_probability_max[i] != null ? d.precipitation_probability_max[i] + ' %' : '') + '</div></div>';
      }).join('') + '</div><div class="it-note">' + (LP && LP.wmo ? esc(LP.wmo(wj.current.weather_code)) + ' · ' : '') + 'Maintenant : ' + Math.round(wj.current.temperature_2m) + '° · Prévisions Open-Meteo</div>';
    }
    var CHECK = ['Pièce d’identité ou passeport valide', 'Réservation confirmée (hébergement, transport)', 'Carnet de vaccination (fièvre jaune si requis)', 'Argent liquide en petites coupures', 'Chargeur et batterie externe', 'Médicaments personnels', 'Anti-moustiques et protection solaire', 'Copie des documents (papier ou téléphone)'];
    function budgetHtml(s) {
      var base = num(s.priceIndication); if (!(base > 0)) return '';
      return '<div class="it-sec"><h4>Estimer mon budget</h4><div class="it-g"><div><label>Voyageurs</label><input type="number" class="text-input" id="tv-n" value="2" min="1" max="50"></div><div><label>Nuits / jours</label><input type="number" class="text-input" id="tv-d" value="3" min="1" max="90"></div></div><div class="it-g" style="grid-template-columns:1fr"><div><label>Le prix indiqué (' + esc(s.priceIndication) + ') est…</label><select class="select-input" id="tv-u"><option value="pn">par personne et par nuit</option><option value="p">par personne (une fois)</option><option value="n">par nuit (pour tout le groupe)</option><option value="t">un total fixe</option></select></div></div><div class="it-res" id="tv-bud"></div><div class="it-note">Estimation basée sur l’indication de prix de l’annonce. Confirmez le tarif réel avec le prestataire.</div></div>';
    }
    function calcBudget(s) {
      var el = $('tv-bud'); if (!el) return; var base = num(s.priceIndication), n = Math.max(1, num($('tv-n').value)), d = Math.max(1, num($('tv-d').value)), u = $('tv-u').value;
      var tot = u === 'pn' ? base * n * d : u === 'p' ? base * n : u === 'n' ? base * d : base;
      var cur = (String(s.priceIndication).match(/[A-Za-z$€]+/) || [''])[0];
      el.innerHTML = 'Total estimé : <b>' + fmt(tot) + (cur ? ' ' + esc(cur) : '') + '</b><br>Par personne : <b>' + fmt(tot / n) + (cur ? ' ' + esc(cur) : '') + '</b>';
    }
    var origTravel = window.openTravelDetail;
    window.openTravelDetail = async function (id) {
      await origTravel.apply(this, arguments);
      try {
        var modal = $('travel-detail-modal'); if (!modal || modal.querySelector('.it-sec')) return;
        var s = travelById(id); if (!s) { var sn = await db.collection('travel_spots').doc(id).get(); if (!sn.exists) return; s = Object.assign({ id: sn.id }, sn.data()); }
        var box = modal.querySelector('.modal'), h3 = box.querySelector('h3'), ph = photos(s);
        hideOldPhotoLinks(modal);
        if (ph.length && h3) { h3.insertAdjacentHTML('beforebegin', gallery(ph)); bindGallery(box); }
        var saved = []; try { saved = JSON.parse(lsGet('cn_trip_' + s.id) || '[]'); } catch (e) { saved = []; }
        var maps = (s.city || s.country) ? '<a class="it-bt" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([s.title, s.city, s.country].filter(Boolean).join(', ')) + '">Voir sur la carte / itinéraire</a>' : '';
        var extra = '<div class="it-sec"><h4>Météo à destination</h4><div id="tv-wx" class="muted small">Chargement…</div></div>' + budgetHtml(s) +
          '<div class="it-sec"><h4>Préparer mon voyage</h4><div class="it-ck">' + CHECK.map(function (c, i) { return '<label><input type="checkbox" data-ck="' + i + '"' + (saved.indexOf(i) >= 0 ? ' checked' : '') + '> ' + esc(c) + '</label>'; }).join('') + '</div></div>' +
          visitHtml(s).replace('Demander une visite', 'Contacter pour un séjour') + (maps ? '<div class="it-sec"><div class="it-sim">' + maps + '</div></div>' : '') + similarHtml(s, typeof travelCache !== 'undefined' ? travelCache : [], null, 'Lieux similaires');
        var fav = $('travel-fav-btn'); if (fav) fav.insertAdjacentHTML('beforebegin', '<div id="it-xtra">' + extra + '</div>'); else box.insertAdjacentHTML('beforeend', '<div id="it-xtra">' + extra + '</div>');
        var x = $('it-xtra');
        x.addEventListener('input', function () { calcBudget(s); visitLinks(s, 'travel'); });
        x.addEventListener('change', function (e) { var c = e.target.closest && e.target.closest('[data-ck]'); if (!c) return; var on = []; x.querySelectorAll('[data-ck]').forEach(function (k) { if (k.checked) on.push(parseInt(k.getAttribute('data-ck'), 10)); }); lsSet('cn_trip_' + s.id, JSON.stringify(on)); });
        x.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-sim]'); if (b) { modal.remove(); window.openTravelDetail(b.getAttribute('data-sim')); } });
        calcBudget(s); visitLinks(s, 'travel');
        weather(s).then(function (wj) { var w = $('tv-wx'); if (w) w.innerHTML = wxHtml(wj); }).catch(function () { var w = $('tv-wx'); if (w) w.textContent = 'Météo indisponible pour ce lieu.'; });
        if (window.CNShare && fav && !modal.querySelector('[data-it="share"]')) fav.insertAdjacentHTML('afterend', '<button type="button" data-it="share" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px">Partager ce lieu</button>');
        var sh = modal.querySelector('[data-it="share"]'); if (sh) sh.onclick = function () { try { window.CNShare.open({ kind: 'travel', id: s.id }); } catch (e) { /* ignore */ } };
      } catch (e) { /* amélioration facultative */ }
    };

    window.CNImmoTravelPro = { _calcLoan: function (price, ap, yrs, rate) { var P = price * (1 - ap / 100), n = yrs * 12, r = rate / 1200; return r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n)); } };
    try { if (typeof immoCache !== 'undefined' && immoCache) window.runImmoFilter(); if (typeof travelCache !== 'undefined' && travelCache) window.runTravelFilter(); } catch (e) { /* ignore */ }
  }
  go();
})();
