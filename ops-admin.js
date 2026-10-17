/* Coeurnoh Universe — Administration : assistance, sauvegarde et journal (onglet « Assistance & sauvegarde »).
   - Demandes d'assistance : lire, répondre (l'utilisateur est notifié), clôturer, rouvrir.
   - Sauvegarde : télécharge en un fichier JSON les données essentielles (à faire chaque semaine, par exemple).
   - Journal : les dernières actions d'administration enregistrées par le serveur.
   Passe par l'action serveur « payments-actions » (réservée à l'administrateur). */
(function () {
  'use strict';
  if (window.__cnOpsAdmin) return; window.__cnOpsAdmin = true;
  var tries = 0;
  function go() { var tab = document.getElementById('admin-tab-ops'); if (!tab || typeof auth === 'undefined') { if (++tries < 120) setTimeout(go, 250); return; } main(tab); }
  go();
  function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
  function dt(s) { try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  async function api(action, body) {
    var idToken = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body || {})) });
    var j = await r.json(); if (!j.success) throw new Error(j.error || 'Erreur'); return j;
  }
  function main(tab) {
    var st = document.createElement('style');
    st.textContent = '.op-t{border:1px solid #e3e8f0;border-radius:14px;padding:11px 12px;margin:8px 0;background:#fff}.op-t .h{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.op-s{font-size:.74rem;font-weight:800;border-radius:999px;padding:3px 9px}.op-s.open{background:#fff1d6;color:#8a5a00}.op-s.answered{background:#dff5e8;color:#16743d}.op-s.closed{background:#e9edf3;color:#5d6779}' +
      '.op-m{font-size:.86rem;margin:6px 0 0;white-space:pre-wrap;word-break:break-word}.op-m.a{background:#eef3ff;border-radius:10px;padding:8px 10px}.op-act{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.op-act input{flex:1;min-width:160px;border:1px solid #d5dbe6;border-radius:10px;padding:9px 10px;font:inherit}.op-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #e3e8f0;font-size:.86rem}.op-bar{height:10px;border-radius:6px;background:#e3e8f0;overflow:hidden;margin:8px 0}.op-bar i{display:block;height:100%;background:#1b4fd8;width:0}';
    document.head.appendChild(st);
    tab.innerHTML = '<h2 class="page-title">Assistance &amp; sauvegarde</h2>' +
      '<div class="order-box" style="margin-bottom:14px"><h3 style="margin:0 0 4px">Demandes d’assistance <span id="op-cnt" class="muted small"></span></h3><div class="op-act" style="margin:6px 0"><select id="op-flt" class="text-input"><option value="">Toutes</option><option value="open" selected>En attente</option><option value="answered">Répondues</option><option value="closed">Clôturées</option></select><button type="button" class="btn btn-outline" id="op-rf">Actualiser</button></div><div id="op-list"><p class="muted small">Chargement…</p></div></div>' +
      '<div class="order-box" style="margin-bottom:14px"><h3 style="margin:0 0 4px">Sauvegarde des données</h3><p class="muted small">Télécharge une copie de vos données essentielles (utilisateurs, commandes, recharges, portefeuille, sites, entreprises, événements, réglages…). Conservez le fichier en lieu sûr (Drive, ordinateur). Il contient des informations personnelles : ne le partagez pas.</p><button type="button" class="btn btn-primary" id="op-bk">Télécharger une sauvegarde</button><div class="op-bar" id="op-bar" style="display:none"><i></i></div><p class="muted small" id="op-bkn"></p></div>' +
      '<div class="order-box"><h3 style="margin:0 0 4px">Journal des actions d’administration</h3><p class="muted small">Octrois Premium/Pro, opérations sur les clés API, réponses d’assistance et sauvegardes. Les 60 dernières actions.</p><div id="op-log"><p class="muted small">Chargement…</p></div></div>';
    var list = tab.querySelector('#op-list'), flt = tab.querySelector('#op-flt'), cnt = tab.querySelector('#op-cnt');
    var SL = { open: 'En attente', answered: 'Répondue', closed: 'Clôturée' };
    async function loadList() {
      try {
        var r = await api('support_admin', { op: 'list', status: flt.value });
        cnt.textContent = r.counts && r.counts.open ? '· ' + r.counts.open + ' en attente' : '';
        if (!r.items.length) { list.innerHTML = '<p class="muted small">Aucune demande.</p>'; return; }
        list.innerHTML = r.items.map(function (t) {
          var rep = (t.replies || []).map(function (m) { return '<div class="op-m' + (m.from === 'admin' ? ' a' : '') + '"><b>' + (m.from === 'admin' ? 'Vous' : 'Utilisateur') + '</b> · ' + esc(dt(m.at)) + '<br>' + esc(m.text) + '</div>'; }).join('');
          return '<div class="op-t" data-id="' + esc(t.id) + '"><div class="h"><b>#' + esc(t.ref) + ' · ' + esc(t.subject) + '</b><span class="op-s ' + esc(t.status) + '">' + esc(SL[t.status] || t.status) + '</span></div><div class="muted small">' + esc(t.name || 'Utilisateur') + ' · ' + esc(t.email || '') + ' · ' + esc(t.category) + ' · ' + esc(dt(t.createdAt)) + '</div><div class="op-m">' + esc(t.message) + '</div>' + rep +
            '<div class="op-act"><input placeholder="Votre réponse" maxlength="1500"><button type="button" class="btn btn-primary" data-a="reply">Répondre</button>' + (t.status === 'closed' ? '<button type="button" class="btn btn-outline" data-a="reopen">Rouvrir</button>' : '<button type="button" class="btn btn-outline" data-a="close">Clôturer</button>') + '</div></div>';
        }).join('');
      } catch (e) { list.innerHTML = '<p class="muted small">' + esc(e.message) + '</p>'; }
    }
    list.addEventListener('click', async function (e) {
      var b = e.target.closest && e.target.closest('[data-a]'); if (!b) return; var card = b.closest('.op-t'), id = card.getAttribute('data-id'), a = b.getAttribute('data-a');
      try {
        if (a === 'reply') { var v = card.querySelector('input').value; if (!v.trim()) return; await api('support_admin', { op: 'reply', id: id, text: v }); } else await api('support_admin', { op: a, id: id });
        loadList(); loadLog();
      } catch (er) { alert(er.message); }
    });
    flt.addEventListener('change', loadList); tab.querySelector('#op-rf').addEventListener('click', function () { loadList(); loadLog(); });

    var log = tab.querySelector('#op-log');
    async function loadLog() {
      try {
        var r = await api('audit_list');
        log.innerHTML = r.items.length ? r.items.map(function (x) { return '<div class="op-row"><span><b>' + esc(x.action) + '</b><br><small class="muted">' + esc(x.detail) + '</small></span><span class="muted small">' + esc(dt(x.at)) + '</span></div>'; }).join('') : '<p class="muted small">Aucune action enregistrée pour l’instant.</p>';
      } catch (e) { log.innerHTML = '<p class="muted small">' + esc(e.message) + '</p>'; }
    }

    var bk = tab.querySelector('#op-bk'), bar = tab.querySelector('#op-bar'), bn = tab.querySelector('#op-bkn');
    bk.addEventListener('click', async function () {
      bk.disabled = true; bar.style.display = 'block'; var out = { generatedAt: new Date().toISOString(), collections: {} };
      try {
        var cols = (await api('backup_export', { op: 'list' })).collections;
        for (var i = 0; i < cols.length; i++) {
          var after = '', docs = [];
          bn.textContent = 'Sauvegarde de « ' + cols[i] + ' » (' + (i + 1) + '/' + cols.length + ')…'; bar.firstChild.style.width = Math.round(i / cols.length * 100) + '%';
          for (var page = 0; page < 200; page++) {
            var r = await api('backup_export', { collection: cols[i], after: after }); docs = docs.concat(r.docs); if (!r.next) break; after = r.next;
          }
          out.collections[cols[i]] = docs;
        }
        bar.firstChild.style.width = '100%';
        var blob = new Blob([JSON.stringify(out)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'sauvegarde-coeurnoh-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        var total = Object.keys(out.collections).reduce(function (s, k) { return s + out.collections[k].length; }, 0);
        bn.textContent = 'Sauvegarde terminée : ' + total + ' documents.'; loadLog();
      } catch (e) { bn.textContent = 'Échec : ' + e.message; }
      bk.disabled = false;
    });

    // Journal automatique : chaque écriture faite depuis cette page (prix, validations, réglages…) est notée (chemin + champs, jamais les valeurs).
    try {
      var q = [], t = 0, FS = window.firebase && firebase.firestore;
      var flush = function () { t = 0; if (!q.length) return; var entries = q.splice(0, 20); api('audit_log', { entries: entries }).catch(function () { /* secondaire */ }); if (q.length) t = setTimeout(flush, 1500); };
      var note = function (op, path, data) { if (/^(admin_audit|client_errors)\//.test(path)) return; q.push({ op: op, path: path, keys: data && typeof data === 'object' ? Object.keys(data).slice(0, 12) : [] }); if (!t) t = setTimeout(flush, 4000); };
      var wrap = function (proto, name, refOf, dataIdx) { var f = proto && proto[name]; if (typeof f !== 'function') return; proto[name] = function () { try { var r = refOf(this, arguments); if (r && r.path) note(name, r.path, arguments[dataIdx]); } catch (e) { /* ignore */ } return f.apply(this, arguments); }; };
      if (FS) {
        ['set', 'update', 'delete'].forEach(function (n) { wrap(FS.DocumentReference.prototype, n, function (self) { return self; }, 0); wrap(FS.WriteBatch && FS.WriteBatch.prototype, n, function (self, a) { return a[0]; }, 1); });
      }
    } catch (e) { /* le journal ne doit jamais gêner l'administration */ }

    var first = true, orig = window.showAdminTab;
    if (typeof orig === 'function') window.showAdminTab = function (t) { var r = orig.apply(this, arguments); if (t === 'ops') { loadList(); loadLog(); } return r; };
  }
})();
