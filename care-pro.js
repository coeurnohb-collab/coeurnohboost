/* Coeurnoh Universe — Assistance et données personnelles (côté utilisateur).
   1) Dans « Besoin d'aide ? » : envoyer une demande d'assistance suivie (numéro de référence, statut, réponses de l'équipe).
   2) Dans « Sécurité » : télécharger toutes ses données personnelles (fichier JSON).
   Tout passe par le serveur (action payments-actions) : aucune règle Firestore à modifier. */
(function () {
  'use strict';
  if (window.__cnCare) return; window.__cnCare = true;
  var tries = 0;
  function go() {
    var a = document.getElementById('section-contact'), b = document.getElementById('section-security');
    if ((!a && !b) || typeof auth === 'undefined') { if (++tries < 120) setTimeout(go, 250); return; }
    if (a) mountSupport(a); if (b) mountData(b);
  }
  go();

  function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
  async function api(action, body) {
    if (!auth.currentUser) throw new Error('Connecte-toi pour continuer.');
    var idToken = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body || {})) });
    var j = await r.json(); if (!j.success) throw new Error(j.error || 'Erreur, réessaie.'); return j;
  }
  var st = document.createElement('style');
  st.textContent = '.cr-box{margin-top:16px;padding-top:14px;border-top:1px solid #e3e8f0}.cr-box h4{margin:0 0 4px;font-size:1rem}.cr-box .field{margin:8px 0}.cr-box select,.cr-box input,.cr-box textarea{width:100%;box-sizing:border-box;border:1px solid #d5dbe6;border-radius:12px;padding:11px 12px;font:inherit;background:#fff;color:inherit}.cr-box textarea{min-height:96px;resize:vertical}' +
    '.cr-t{border:1px solid #e3e8f0;border-radius:14px;padding:11px 12px;margin:8px 0;background:#fff}.cr-t .h{display:flex;justify-content:space-between;gap:8px;align-items:center}.cr-t b{font-size:.92rem}.cr-s{font-size:.74rem;font-weight:800;border-radius:999px;padding:3px 9px;white-space:nowrap}.cr-s.open{background:#fff1d6;color:#8a5a00}.cr-s.answered{background:#dff5e8;color:#16743d}.cr-s.closed{background:#e9edf3;color:#5d6779}' +
    '.cr-m{font-size:.85rem;margin:6px 0 0;white-space:pre-wrap;word-break:break-word}.cr-m.a{background:#eef3ff;border-radius:10px;padding:8px 10px}.cr-m small{display:block;color:#5d6779;margin-bottom:2px}.cr-act{display:flex;gap:8px;margin-top:8px}.cr-act input{flex:1}';
  document.head.appendChild(st);

  var SL = { open: 'En attente', answered: 'Réponse reçue', closed: 'Clôturée' };
  function dt(s) { try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function mountSupport(sec) {
    if (sec.querySelector('.cr-box')) return;
    var box = document.createElement('div'); box.className = 'cr-box';
    box.innerHTML = '<h4>Envoyer une demande</h4><p class="muted small" style="margin:0 0 8px">Un problème de paiement, de commande ou de compte ? Décris-le ici : tu reçois un numéro de suivi et la réponse apparaît dans cette page.</p>' +
      '<div class="field"><select id="cr-cat"><option value="paiement">Paiement / recharge</option><option value="commande">Commande</option><option value="compte">Mon compte</option><option value="technique">Problème technique</option><option value="autre">Autre</option></select></div>' +
      '<div class="field"><input id="cr-sub" maxlength="90" placeholder="Sujet (ex. Recharge non reçue)"></div>' +
      '<div class="field"><textarea id="cr-msg" maxlength="1500" placeholder="Explique ce qui s’est passé (montant, date, numéro de commande…)"></textarea></div>' +
      '<button type="button" class="btn btn-primary" id="cr-send">Envoyer la demande</button><p class="muted small" id="cr-note" style="margin-top:6px"></p>' +
      '<h4 style="margin-top:16px">Mes demandes</h4><div id="cr-list"><p class="muted small">Chargement…</p></div>';
    sec.appendChild(box);
    var list = box.querySelector('#cr-list'), note = box.querySelector('#cr-note'), send = box.querySelector('#cr-send');
    async function load() {
      try {
        var r = await api('support_mine');
        if (!r.items.length) { list.innerHTML = '<p class="muted small">Aucune demande pour le moment.</p>'; return; }
        list.innerHTML = r.items.map(function (t) {
          var rep = (t.replies || []).map(function (m) { return '<div class="cr-m' + (m.from === 'admin' ? ' a' : '') + '"><small>' + (m.from === 'admin' ? 'Équipe Coeurnoh' : 'Vous') + ' · ' + esc(dt(m.at)) + '</small>' + esc(m.text) + '</div>'; }).join('');
          return '<div class="cr-t" data-id="' + esc(t.id) + '"><div class="h"><b>#' + esc(t.ref) + ' · ' + esc(t.subject) + '</b><span class="cr-s ' + esc(t.status) + '">' + esc(SL[t.status] || t.status) + '</span></div><div class="muted small">' + esc(t.category) + ' · ' + esc(dt(t.createdAt)) + '</div><div class="cr-m">' + esc(t.message) + '</div>' + rep +
            (t.status === 'closed' ? '' : '<div class="cr-act"><input maxlength="1500" placeholder="Ajouter un message"><button type="button" class="btn btn-outline" data-a="send">Envoyer</button><button type="button" class="btn btn-outline" data-a="close">Clôturer</button></div>') + '</div>';
        }).join('');
      } catch (e) { list.innerHTML = '<p class="muted small">Connecte-toi pour voir tes demandes.</p>'; }
    }
    send.addEventListener('click', async function () {
      var sub = box.querySelector('#cr-sub').value, msg = box.querySelector('#cr-msg').value; note.textContent = ''; send.disabled = true;
      try {
        var r = await api('support_create', { category: box.querySelector('#cr-cat').value, subject: sub, message: msg });
        box.querySelector('#cr-sub').value = ''; box.querySelector('#cr-msg').value = '';
        note.textContent = 'Demande envoyée. Numéro de suivi : #' + r.ref + '. Nous te répondons dès que possible.'; toast('Demande envoyée', 'success'); load();
      } catch (e) { note.textContent = e.message; toast(e.message, 'error'); }
      send.disabled = false;
    });
    list.addEventListener('click', async function (e) {
      var b = e.target.closest && e.target.closest('[data-a]'); if (!b) return; var card = b.closest('.cr-t'), id = card.getAttribute('data-id');
      try {
        if (b.getAttribute('data-a') === 'close') await api('support_user', { id: id, op: 'close' });
        else { var inp = card.querySelector('input'); if (!inp.value.trim()) return; await api('support_user', { id: id, text: inp.value }); }
        load();
      } catch (er) { toast(er.message, 'error'); }
    });
    load();
    if (auth.onAuthStateChanged) auth.onAuthStateChanged(function (u) { if (u) load(); });
  }

  function mountData(sec) {
    if (sec.querySelector('.cr-data')) return;
    var anchor = null; sec.querySelectorAll('button').forEach(function (b) { if (!anchor && /logoutAllDevices/.test(b.getAttribute('onclick') || '')) anchor = b; });
    var box = document.createElement('div'); box.className = 'cr-box cr-data';
    box.innerHTML = '<h4>Mes données</h4><p class="muted small" style="margin:0 0 8px">Télécharge une copie de tes informations : profil, commandes, recharges, relevé du portefeuille, billets, certificats, publications et demandes d’assistance.</p><button type="button" class="btn btn-outline" id="cr-exp">Télécharger mes données</button><p class="muted small" id="cr-expn" style="margin-top:6px"></p>';
    if (anchor) anchor.parentNode.insertBefore(box, anchor); else sec.appendChild(box);
    var btn = box.querySelector('#cr-exp'), n = box.querySelector('#cr-expn');
    btn.addEventListener('click', async function () {
      btn.disabled = true; n.textContent = 'Préparation…';
      try {
        var r = await api('export_my_data'), blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'mes-donnees-coeurnoh-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        n.textContent = 'Fichier téléchargé.';
      } catch (e) { n.textContent = e.message; }
      btn.disabled = false;
    });
  }
})();
