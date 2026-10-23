/* Administration — Panels clients : vue d'ensemble, suspension, réglages des retraits, commandes à vérifier.
   Tout passe par le serveur (api/payments-actions) : réservé à l'administrateur, aucune règle Firestore à modifier. */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function usd(n) { return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2) + ' $'; }
  async function call(action, body) {
    var tok = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: tok, action: action }, body || {})) });
    var j = await r.json(); if (!j.success) throw new Error(j.error || 'Erreur'); return j;
  }
  var DATA = null;
  window.loadPanelsAdmin = async function () {
    var el = document.getElementById('admin-panels-box'); if (!el) return;
    el.innerHTML = '<p class="admin-empty">Chargement…</p>';
    try { DATA = await call('pm_admin_overview'); draw(el); } catch (e) { el.innerHTML = '<p class="admin-empty">Erreur : ' + esc(e.message) + '</p>'; }
  };
  function field(id, label, val, hint) { return '<label style="display:block;font-size:.8rem;margin:8px 0 2px">' + label + '</label><input id="' + id + '" class="text-input" inputmode="decimal" value="' + esc(val) + '">' + (hint ? '<small class="muted">' + hint + '</small>' : ''); }
  function draw(el) {
    var s = DATA.settings, tot = DATA.panels.reduce(function (a, p) { a.sales += p.sales; a.margin += p.margin; a.orders += p.orders; return a; }, { sales: 0, margin: 0, orders: 0 });
    var h = '<div class="admin-row"><div class="admin-row-title">Vue d’ensemble</div><div class="admin-row-meta">' + DATA.panels.length + ' panel(s) actif(s) · ' + tot.orders + ' commande(s) · ventes ' + usd(tot.sales) + ' · marges propriétaires ' + usd(tot.margin) + '</div>' +
      '<div class="admin-row-meta">Retraits à payer : <b>' + DATA.withdrawals.count + '</b> pour <b>' + usd(DATA.withdrawals.netPending) + '</b> net (onglet « Retraits vendeurs »)</div></div>';
    h += '<h3 style="margin:16px 0 8px">Commandes à vérifier (' + DATA.review.length + ')</h3>';
    h += DATA.review.length ? DATA.review.map(function (o) { return '<div class="admin-row"><div class="admin-row-title">' + esc(o.service) + ' · ' + usd(o.price) + '</div><div class="admin-row-meta">Panel ' + esc(o.slug) + ' · ' + esc(String(o.createdAt || '').slice(0, 16).replace('T', ' ')) + '</div><div class="admin-row-meta">' + esc(o.reason) + '</div></div>'; }).join('') : '<p class="admin-empty">Aucune commande en attente de vérification.</p>';
    h += '<h3 style="margin:16px 0 8px">Panels</h3>';
    h += DATA.panels.length ? DATA.panels.map(function (p) {
      return '<div class="admin-row"><div class="admin-row-top"><div><div class="admin-row-title">' + esc(p.name || p.slug) + ' <small class="muted">/panel/' + esc(p.slug) + '</small></div>' +
        '<div class="admin-row-meta">' + p.orders + ' commandes · ventes ' + usd(p.sales) + ' · marge propriétaire ' + usd(p.margin) + ' · marge fixée ' + esc(p.markup) + ' %</div>' +
        '<div class="admin-row-meta">Remboursées : ' + p.refunded + ' · À vérifier : ' + p.review + (p.last ? ' · Dernière : ' + esc(String(p.last).slice(0, 10)) : '') + '</div>' +
        (p.suspended ? '<div class="admin-row-meta" style="color:#b42318">Suspendu' + (p.reason ? ' — ' + esc(p.reason) : '') + '</div>' : '') + '</div>' +
        '<span class="admin-badge ' + (p.suspended ? 'rejected' : 'paid') + '">' + (p.suspended ? 'suspendu' : 'actif') + '</span></div>' +
        '<div class="admin-row-actions"><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="/panel/' + esc(p.slug) + '">Ouvrir</a>' +
        '<button class="btn btn-outline btn-sm" data-sus="' + esc(p.slug) + '" data-on="' + (p.suspended ? '0' : '1') + '">' + (p.suspended ? 'Réactiver' : 'Suspendre') + '</button></div></div>';
    }).join('') : '<p class="admin-empty">Aucun panel actif pour l’instant.</p>';
    h += '<h3 style="margin:16px 0 8px">Règles des retraits</h3><div class="admin-row">' +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pa-on"' + (s.enabled ? ' checked' : '') + '> Retraits activés</label>' +
      field('pa-min', 'Minimum par retrait ($)', s.minUsd) + field('pa-max', 'Maximum par retrait ($)', s.maxUsd) + field('pa-fee', 'Commission plateforme (%)', s.feePct, 'Retenue sur chaque retrait ; le propriétaire voit le net avant de valider.') +
      field('pa-hold', 'Délai de sécurité (heures)', s.holdHours, 'Un gain devient retirable quand la commande est terminée, ou après ce délai. Protège contre les remboursements et litiges.') +
      field('pa-auto', 'Seuil de contrôle renforcé ($)', s.autoMaxUsd, 'Au-dessus, la demande est marquée « À vérifier ».') + field('pa-new', 'Compte « récent » (jours)', s.newAccountDays) + field('pa-day', 'Demandes max par jour', s.dailyLimit) +
      '<button class="btn btn-primary btn-sm" id="pa-save" style="margin-top:12px">Enregistrer les règles</button><div id="pa-msg" class="muted small" style="margin-top:6px"></div></div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-sus]').forEach(function (b) {
      b.onclick = async function () {
        var on = b.getAttribute('data-on') === '1', slug = b.getAttribute('data-sus'), reason = '';
        if (on) { reason = prompt('Raison de la suspension (visible par le propriétaire) :', 'Activité suspecte'); if (reason === null) return; }
        else if (!confirm('Réactiver ce panel ?')) return;
        try { await call('pm_admin_panel', { slug: slug, suspended: on, reason: reason }); loadPanelsAdmin(); } catch (e) { alert('Erreur : ' + e.message); }
      };
    });
    el.querySelector('#pa-save').onclick = async function () {
      var g = function (id) { return document.getElementById(id).value; }, m = document.getElementById('pa-msg');
      try { await call('pm_admin_settings', { enabled: document.getElementById('pa-on').checked, minUsd: g('pa-min'), maxUsd: g('pa-max'), feePct: g('pa-fee'), holdHours: g('pa-hold'), autoMaxUsd: g('pa-auto'), newAccountDays: g('pa-new'), dailyLimit: g('pa-day') }); m.style.color = '#166534'; m.textContent = 'Règles enregistrées ✓'; }
      catch (e) { m.style.color = '#b42318'; m.textContent = e.message; }
    };
  }
})();

/* ---- Messages sites : demandes « Aide pour mon site » (api/render-site, actions site_help_admin_*) ---- */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  async function call(action, body) {
    var tok = await auth.currentUser.getIdToken();
    var r = await fetch('/api/render-site', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify(Object.assign({ action: action }, body || {})) });
    var j = await r.json().catch(function () { return {}; }); if (!r.ok || j.success === false) throw new Error(j.error || 'Erreur'); return j;
  }
  function when(iso) { try { return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  var ST = { open: 'À répondre', answered: 'Répondu', closed: 'Résolu' };
  window.loadSiteHelpAdmin = async function () {
    var el = document.getElementById('admin-sitehelp-box'); if (!el) return;
    el.innerHTML = '<p class="admin-empty">Chargement…</p>';
    try {
      var j = await call('site_help_admin_list');
      if (!j.items.length) { el.innerHTML = '<p class="admin-empty">Aucun message pour l’instant.</p>'; return; }
      el.innerHTML = j.items.map(function (x) {
        return '<div class="admin-row" data-id="' + esc(x.id) + '" style="cursor:pointer"><div class="admin-row-top"><div><div class="admin-row-title">' + esc(x.siteName || x.slug || x.id) + (x.unread ? ' <b style="color:#b42318">●</b>' : '') + ' <small class="muted">/s/' + esc(x.slug) + '</small></div>' +
          '<div class="admin-row-meta">' + (x.lastFrom === 'admin' ? 'Toi : ' : '') + esc(x.last) + '</div><div class="admin-row-meta">' + x.count + ' message(s) · ' + esc(when(x.updatedAt)) + '</div></div>' +
          '<span class="admin-badge ' + (x.status === 'open' ? 'pending' : 'paid') + '">' + esc(ST[x.status] || x.status) + '</span></div></div>';
      }).join('');
      Array.prototype.forEach.call(el.querySelectorAll('[data-id]'), function (r) { r.onclick = function () { openThread(r.getAttribute('data-id')); }; });
    } catch (e) { el.innerHTML = '<p class="admin-empty">Erreur : ' + esc(e.message) + '</p>'; }
  };
  async function openThread(id) {
    var el = document.getElementById('admin-sitehelp-box'); if (!el) return;
    try {
      var j = await call('site_help_admin_get', { id: id });
      el.innerHTML = '<button class="btn btn-outline btn-sm" id="sh-back">← Retour</button><h3 style="margin:12px 0 4px">' + esc(j.siteName || j.slug) + '</h3>' +
        '<p class="muted small" style="margin:0 0 10px">' + (j.slug ? '<a target="_blank" rel="noopener" href="/s/' + esc(j.slug) + '">Ouvrir le site</a> · ' : '') + esc(ST[j.status] || j.status) + '</p>' +
        '<div style="margin-bottom:12px">' + j.messages.map(function (m) {
          var me = m.from === 'admin';
          return '<div style="max-width:90%;margin:0 0 8px ' + (me ? 'auto' : '0') + ';padding:10px 12px;border-radius:12px;background:' + (me ? '#1d4f91' : 'rgba(128,128,128,.14)') + ';color:' + (me ? '#fff' : 'inherit') + ';white-space:pre-wrap;word-break:break-word"><small style="display:block;opacity:.75;font-weight:700;font-size:.7rem">' + (me ? 'Toi' : 'Propriétaire' + (m.category ? ' · ' + esc(m.category) : '')) + ' · ' + esc(when(m.at)) + '</small>' + esc(m.text) + '</div>';
        }).join('') + '</div>' +
        '<textarea id="sh-txt" class="text-input" rows="4" maxlength="1000" placeholder="Ta réponse…" style="width:100%"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="sh-send">Répondre</button><button class="btn btn-outline btn-sm" id="sh-close">Répondre et marquer résolu</button></div><div id="sh-msg" class="muted small" style="margin-top:6px"></div>';
      document.getElementById('sh-back').onclick = window.loadSiteHelpAdmin;
      var send = function (close) {
        var v = document.getElementById('sh-txt').value.trim(), m = document.getElementById('sh-msg');
        if (!v) { m.style.color = '#b42318'; m.textContent = 'Écris une réponse.'; return; }
        call('site_help_admin_reply', { id: id, message: v, close: !!close }).then(function () { openThread(id); }).catch(function (e) { m.style.color = '#b42318'; m.textContent = e.message; });
      };
      document.getElementById('sh-send').onclick = function () { send(false); };
      document.getElementById('sh-close').onclick = function () { send(true); };
    } catch (e) { el.innerHTML = '<p class="admin-empty">Erreur : ' + esc(e.message) + '</p>'; }
  }
})();
