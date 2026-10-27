/* Coeurnoh Universe — Paiements & Portefeuille professionnels.
   - Retour de paiement (?payment=success|failed) : message clair, vérification automatique du solde.
   - Relevé du portefeuille : résumé entrées/sorties, filtres, recherche, regroupement par jour,
     détail de chaque mouvement, reçu imprimable / PDF, export CSV.
   - Suivi des recharges (en attente, en vérification, créditée, échouée).
   - Écran de recharge : récapitulatif du montant, alerte si une recharge est déjà en cours, aide.
   Aucun changement serveur : lit les mêmes collections que l'application (wallet_transactions, topup_requests). */
(function () {
  'use strict';
  if (window.__cnPayPro) return; window.__cnPayPro = true;
  var tries = 0;
  function go() {
    if (typeof window.loadWalletHistory !== 'function' || typeof window.showRecharge !== 'function') { if (++tries < 120) setTimeout(go, 250); return; }
    main();
  }
  function main() {
    var $ = function (id) { return document.getElementById(id); };
    function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
    function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
    function usd(n, sign) { var v = Number(n) || 0; return (sign && v > 0 ? '+' : '') + v.toFixed(2) + ' $'; }
    function fmtDate(iso, long) { var d = new Date(iso); if (isNaN(d)) return ''; return d.toLocaleString('fr-FR', long ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' }); }
    function dayLabel(iso) {
      var d = new Date(iso); if (isNaN(d)) return 'Date inconnue';
      var t0 = new Date(); t0.setHours(0, 0, 0, 0); var d0 = new Date(d); d0.setHours(0, 0, 0, 0);
      var diff = Math.round((t0 - d0) / 86400000);
      if (diff === 0) return 'Aujourd’hui'; if (diff === 1) return 'Hier';
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === t0.getFullYear() ? undefined : 'numeric' });
    }
    function meta(type) { var m = (typeof WALLET_TX_LABELS !== 'undefined' && WALLET_TX_LABELS[type]) || null; return m || { label: type || 'Transaction', icon: 'card' }; }
    function ico(n) { try { return cnIco(n); } catch (e) { return ''; } }

    var CSS = '.pp-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.pp-sum div{background:var(--white,#fff);border-radius:14px;padding:10px;text-align:center;box-shadow:0 2px 10px rgba(20,38,63,.07)}.pp-sum b{display:block;font-size:1.02rem}.pp-sum small{font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#5d6779)}.pp-in{color:#0b7a50}.pp-out{color:#b0182c}' +
      '.pp-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px}.pp-chips button{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:999px;padding:6px 13px;font-size:.8rem;font-weight:700;white-space:nowrap;cursor:pointer;color:inherit}.pp-chips button.on{background:#14263f;color:#fff;border-color:#14263f}' +
      '.pp-day{font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#5d6779);padding:12px 0 4px}.pp-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line,#dde3ec);cursor:pointer;background:none;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;color:inherit;font:inherit}.pp-row>div{display:flex;gap:10px;align-items:center;min-width:0}.pp-row strong{white-space:nowrap}' +
      '.pp-tools{display:flex;gap:8px;margin:10px 0 0}.pp-b{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:12px;padding:9px 14px;font-weight:700;font-size:.82rem;cursor:pointer;color:inherit}.pp-b.p{background:#1b4fd8;border-color:#1b4fd8;color:#fff}' +
      '.pp-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.pp-pill.ok{background:#e3f6ec;color:#0b7a50}.pp-pill.wait{background:#fff3d6;color:#8a5a00}.pp-pill.bad{background:#fde5e8;color:#b0182c}' +
      '.pp-ov{position:fixed;inset:0;z-index:2800;background:rgba(10,20,36,.55);display:flex;align-items:flex-end;justify-content:center}.pp-sheet{background:var(--white,#fff);width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:20px 18px max(20px,env(safe-area-inset-bottom));max-height:88vh;overflow-y:auto}.pp-sheet h3{margin:0 0 2px}.pp-kv{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line,#dde3ec);font-size:.9rem}.pp-kv span:first-child{color:var(--muted,#5d6779)}.pp-kv span:last-child{text-align:right;word-break:break-word}' +
      '.pp-big{font-size:1.9rem;font-weight:800;margin:6px 0 8px}.pp-ban{border-radius:16px;padding:14px 16px;margin:0 0 14px;font-size:.9rem;line-height:1.5}.pp-ban.ok{background:#e3f6ec;color:#0b5c3d}.pp-ban.wait{background:#fff3d6;color:#6e4700}.pp-ban.bad{background:#fde5e8;color:#8c1223}.pp-ban b{display:block;font-size:1rem;margin-bottom:2px}.pp-ban button{margin-top:8px}' +
      '.pp-rc{position:fixed;inset:0;z-index:2900;background:#fff;overflow-y:auto;padding:22px 18px 40px;color:#14263f}.pp-rc .box{max-width:520px;margin:0 auto}.pp-rc h2{margin:0 0 2px}.pp-rc .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #14263f;padding-bottom:12px;margin-bottom:14px}' +
      '@media print{body>*:not(.pp-rc){display:none!important}.pp-rc{position:static;padding:0}.pp-rc .noprint{display:none!important}}';
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    /* ================= RETOUR DE PAIEMENT ================= */
    function readReturn() {
      try {
        var u = new URL(location.href), p = u.searchParams.get('payment');
        if (p !== 'success' && p !== 'failed') return null;
        u.searchParams.delete('payment'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
        return p;
      } catch (e) { return null; }
    }
    var ret = readReturn();
    async function getBalance() { var s = await db.collection('users').doc(currentUser.uid).get(); return s.exists ? Number(s.data().balance) || 0 : 0; }
    function setBalanceUi(b) { try { currentUser.balance = b; var el = $('wallet-balance'); if (el) el.textContent = b.toFixed(2) + '$'; } catch (e) { /* ignore */ } }
    function showReturn(kind) {
      var o = document.createElement('div'); o.className = 'pp-ov'; o.id = 'pp-ret';
      var body = kind === 'failed'
        ? '<div class="pp-ban bad"><b>Paiement non abouti</b>Aucun montant n’a été débité par nos services. Si vous avez été débité, patientez quelques minutes : le crédit se fait automatiquement après confirmation.</div>'
        : '<div class="pp-ban wait" id="pp-rstate"><b>Paiement reçu — vérification en cours</b>Nous contrôlons la confirmation de votre paiement. Votre solde sera mis à jour automatiquement, sans rien faire de votre côté.</div>';
      o.innerHTML = '<div class="pp-sheet"><h3>Recharge du portefeuille</h3>' + body + '<div id="pp-rbal" class="muted small"></div><div class="pp-tools"><button class="pp-b p" data-r="wallet">Voir mon portefeuille</button><button class="pp-b" data-r="close">Fermer</button></div></div>';
      document.body.appendChild(o);
      o.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-r]'); if (!b && e.target !== o) return;
        var a = b ? b.getAttribute('data-r') : 'close'; o.remove();
        if (a === 'wallet') { try { showDashboard(); showDashTab('wallet'); } catch (er) { /* ignore */ } }
      });
      if (kind === 'success') poll(o);
    }
    // Filet de sécurité (Mobile Money SasPay) : demande au serveur de revérifier nos recharges en attente,
    // au cas où la notification automatique tarde. Le serveur ne crédite qu'après contrôle auprès de SasPay.
    async function syncSaspay() {
      try {
        var a = (typeof auth !== 'undefined' && auth) || (window.firebase && window.firebase.auth && window.firebase.auth());
        if (!a || !a.currentUser) return;
        var tk = await a.currentUser.getIdToken();
        await fetch('/api/payment-webhook?provider=saspay-sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk } });
      } catch (e) { /* la notification automatique reste le chemin principal */ }
    }
    async function poll(o) {
      var before = null, n = 0;
      try { before = await getBalance(); setBalanceUi(before); } catch (e) { return; }
      syncSaspay();
      var iv = setInterval(async function () {
        n++;
        if (n === 2 || n === 6 || n === 10) syncSaspay();
        if (!document.body.contains(o)) { clearInterval(iv); return; }
        try {
          var now = await getBalance();
          if (now > before + 0.0001) {
            clearInterval(iv); setBalanceUi(now);
            var s = $('pp-rstate'); if (s) { s.className = 'pp-ban ok'; s.innerHTML = '<b>Recharge créditée : ' + usd(now - before, true) + '</b>Votre nouveau solde est de ' + usd(now) + '.'; }
            var r = $('pp-rbal'); if (r) r.textContent = ''; try { window.loadWalletHistory(); } catch (e) { /* ignore */ }
          } else if (n >= 12) {
            clearInterval(iv);
            var s2 = $('pp-rstate'); if (s2) s2.innerHTML = '<b>Confirmation en attente</b>Votre paiement n’est pas encore confirmé par l’opérateur. Ce délai est normal pour certains moyens de paiement : le solde sera crédité automatiquement. Suivez l’état dans « Mes recharges ».';
          }
        } catch (e) { /* on réessaie */ }
      }, 5000);
    }
    if (ret) {
      var w = 0, wi = setInterval(function () { w++; if (window.currentUser || (typeof currentUser !== 'undefined' && currentUser)) { clearInterval(wi); showReturn(ret); } else if (w > 60) clearInterval(wi); }, 500);
    }

    /* ================= RELEVÉ DU PORTEFEUILLE ================= */
    var TX = [], FILTER = 'all', PERIOD = 'all', QUERY = '';
    function inRange(t) {
      if (PERIOD === 'all') return true; var d = new Date(t.createdAt); if (isNaN(d)) return false; var now = new Date();
      if (PERIOD === '30') return now - d <= 30 * 86400000;
      if (PERIOD === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    }
    function passes(t) {
      var a = Number(t.amount) || 0;
      if (FILTER === 'in' && a < 0) return false; if (FILTER === 'out' && a >= 0) return false;
      if (FILTER === 'topup' && String(t.type || '').indexOf('topup') !== 0) return false;
      if (!inRange(t)) return false;
      if (QUERY) { var hay = (meta(t.type).label + ' ' + (t.type || '') + ' ' + (t.id || '') + ' ' + (t.note || '') + ' ' + (t.description || '')).toLowerCase(); if (hay.indexOf(QUERY) < 0) return false; }
      return true;
    }
    function drawWallet() {
      var host = $('wallet-history-list'); if (!host) return;
      var list = TX.filter(passes), inn = 0, out = 0;
      list.forEach(function (t) { var a = Number(t.amount) || 0; if (a >= 0) inn += a; else out += -a; });
      var chip = function (id, label) { return '<button type="button" data-f="' + id + '" class="' + (FILTER === id ? 'on' : '') + '">' + label + '</button>'; };
      var pchip = function (id, label) { return '<button type="button" data-p="' + id + '" class="' + (PERIOD === id ? 'on' : '') + '">' + label + '</button>'; };
      var h = '<div class="pp-sum"><div><b class="pp-in">' + usd(inn) + '</b><small>Entrées</small></div><div><b class="pp-out">' + usd(out) + '</b><small>Sorties</small></div><div><b>' + usd(inn - out, true) + '</b><small>Net</small></div></div>' +
        '<div class="pp-chips">' + chip('all', 'Tout') + chip('in', 'Entrées') + chip('out', 'Sorties') + chip('topup', 'Recharges') + '</div>' +
        '<div class="pp-chips">' + pchip('all', 'Toute la période') + pchip('month', 'Ce mois-ci') + pchip('30', '30 jours') + '</div>' +
        '<input type="search" class="text-input" id="pp-q" placeholder="Rechercher une opération" value="' + esc(QUERY) + '" style="margin-bottom:6px">';
      if (!list.length) h += '<p class="muted small" style="padding:14px 0;text-align:center">Aucune opération ne correspond à ce filtre.</p>';
      else {
        var last = '';
        list.forEach(function (t) {
          var dl = dayLabel(t.createdAt); if (dl !== last) { h += '<div class="pp-day">' + esc(dl) + '</div>'; last = dl; }
          var m = meta(t.type), a = Number(t.amount) || 0;
          h += '<button type="button" class="pp-row" data-tx="' + esc(t.id) + '"><div><span style="display:inline-flex">' + ico(m.icon) + '</span><div style="min-width:0"><div style="font-weight:600;font-size:.92rem">' + esc(m.label) + '</div><div class="muted small">' + esc(fmtDate(t.createdAt)) + '</div></div></div><strong class="' + (a >= 0 ? 'pp-in' : 'pp-out') + '">' + usd(a, true) + '</strong></button>';
        });
      }
      h += '<div class="pp-tools"><button type="button" class="pp-b" data-x="csv">Exporter en CSV</button></div>';
      host.innerHTML = h;
      var q = $('pp-q'); if (q) q.addEventListener('input', function () { QUERY = q.value.trim().toLowerCase(); var pos = q.selectionStart; drawWallet(); var q2 = $('pp-q'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } });
    }
    function exportCsv() {
      var rows = [['Date', 'Opération', 'Type', 'Montant (USD)', 'Référence']];
      TX.filter(passes).forEach(function (t) { rows.push([t.createdAt || '', meta(t.type).label, t.type || '', (Number(t.amount) || 0).toFixed(2), t.id]); });
      var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'releve-coeurnoh.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function openTx(id) {
      var t = TX.find(function (x) { return x.id === id; }); if (!t) return;
      var m = meta(t.type), a = Number(t.amount) || 0;
      var o = document.createElement('div'); o.className = 'pp-ov';
      var kv = function (k, v) { return v ? '<div class="pp-kv"><span>' + k + '</span><span>' + esc(v) + '</span></div>' : ''; };
      o.innerHTML = '<div class="pp-sheet"><h3>' + esc(m.label) + '</h3><div class="pp-big ' + (a >= 0 ? 'pp-in' : 'pp-out') + '">' + usd(a, true) + '</div>' +
        kv('Date', fmtDate(t.createdAt, true)) + kv('Statut', 'Terminé') + kv('Référence', t.id.slice(0, 12).toUpperCase()) +
        (typeof t.balanceAfter === 'number' ? kv('Solde après opération', usd(t.balanceAfter)) : '') + kv('Détail', t.note || t.description || '') +
        '<div class="pp-tools"><button class="pp-b p" data-d="receipt">Voir le reçu</button><button class="pp-b" data-d="close">Fermer</button></div></div>';
      document.body.appendChild(o);
      o.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-d]'); if (b && b.getAttribute('data-d') === 'receipt') { o.remove(); receipt(t); } else if (!b && e.target === o || b) o.remove(); });
    }
    function receipt(t) {
      var m = meta(t.type), a = Number(t.amount) || 0, u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : {}) || {};
      var o = document.createElement('div'); o.className = 'pp-rc';
      var kv = function (k, v) { return v ? '<div class="pp-kv"><span>' + k + '</span><span>' + esc(v) + '</span></div>' : ''; };
      o.innerHTML = '<div class="box"><div class="hd"><div><h2>Reçu de transaction</h2><div style="font-size:.85rem;opacity:.75">Coeurnoh Universe</div></div><div style="text-align:right;font-size:.8rem">N° ' + esc(t.id.slice(0, 10).toUpperCase()) + '<br>' + esc(fmtDate(t.createdAt, true)) + '</div></div>' +
        kv('Titulaire', u.name || u.displayName || u.email || '') + kv('Opération', m.label) + kv('Type', a >= 0 ? 'Crédit' : 'Débit') + kv('Montant', usd(Math.abs(a))) + (typeof t.balanceAfter === 'number' ? kv('Solde après opération', usd(t.balanceAfter)) : '') + kv('Détail', t.note || t.description || '') + kv('Statut', 'Terminé') +
        '<p style="font-size:.75rem;opacity:.7;margin-top:18px">Document généré automatiquement. Il atteste du mouvement enregistré sur le portefeuille Coeurnoh Universe.</p>' +
        '<div class="pp-tools noprint"><button class="pp-b p" data-q="print">Imprimer / enregistrer en PDF</button><button class="pp-b" data-q="close">Fermer</button></div></div>';
      document.body.appendChild(o);
      o.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-q]'); if (!b) return; if (b.getAttribute('data-q') === 'print') window.print(); else o.remove(); });
    }
    var oldLoad = window.loadWalletHistory;
    window.loadWalletHistory = async function () {
      var host = $('wallet-history-list'); if (!host || typeof currentUser === 'undefined' || !currentUser) return oldLoad.apply(this, arguments);
      if (!host.getAttribute('data-pp')) {
        host.setAttribute('data-pp', '1');
        host.addEventListener('click', function (e) {
          var f = e.target.closest('[data-f]'); if (f) { FILTER = f.getAttribute('data-f'); drawWallet(); return; }
          var p = e.target.closest('[data-p]'); if (p) { PERIOD = p.getAttribute('data-p'); drawWallet(); return; }
          var r = e.target.closest('[data-tx]'); if (r) { openTx(r.getAttribute('data-tx')); return; }
          if (e.target.closest('[data-x="csv"]')) exportCsv();
        });
      }
      host.innerHTML = '<p class="muted small">Chargement…</p>';
      try {
        var snap = await db.collection('wallet_transactions').where('uid', '==', currentUser.uid).orderBy('createdAt', 'desc').limit(200).get();
        TX = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        if (!TX.length) { host.innerHTML = '<p class="muted small">Aucune transaction pour l’instant.</p>'; }
        else drawWallet();
      } catch (e) { host.innerHTML = '<p class="muted small">Impossible de charger le relevé. <button class="pp-b" data-retry="1">Réessayer</button></p>'; var rb = host.querySelector('[data-retry]'); if (rb) rb.onclick = function () { window.loadWalletHistory(); }; }
      loadTopups();
    };

    /* ================= SUIVI DES RECHARGES ================= */
    var STATUS = {
      completed: ['Créditée', 'ok'], pending_payment: ['En attente de paiement', 'wait'], pending: ['En vérification', 'wait'], pending_admin_review: ['En vérification', 'wait'],
      failed: ['Échouée', 'bad'], rejected: ['Refusée', 'bad'], cancelled: ['Annulée', 'bad']
    };
    var METHOD = { mobile: 'Mobile Money', crypto: 'Crypto', card: 'Carte bancaire', illicocash: 'illicocash' };
    var TOPUPS = [];
    async function fetchTopups() {
      var snap = await db.collection('topup_requests').where('uid', '==', currentUser.uid).limit(40).get();
      TOPUPS = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
      return TOPUPS;
    }
    async function loadTopups() {
      var tab = $('dash-tab-wallet'); if (!tab) return;
      var box = $('pp-topups');
      if (!box) { box = document.createElement('div'); box.id = 'pp-topups'; box.className = 'order-box'; tab.appendChild(box); }
      try {
        var list = await fetchTopups();
        if (!list.length) { box.style.display = 'none'; return; }
        box.style.display = '';
        box.innerHTML = '<h3>Mes recharges</h3><p class="muted small" style="margin-bottom:6px">Suivi de vos demandes de recharge. Le solde est crédité automatiquement dès la confirmation.</p>' + list.slice(0, 10).map(function (r) {
          var s = STATUS[r.status] || [r.status || 'En cours', 'wait'];
          return '<div class="pp-kv" style="align-items:center"><span><b style="color:inherit">' + usd(r.amountUSD != null ? r.amountUSD : r.amount) + '</b><br><small>' + esc(METHOD[r.method] || r.method || 'Recharge') + ' · ' + esc(fmtDate(r.createdAt, true)) + '</small></span><span><span class="pp-pill ' + s[1] + '">' + esc(s[0]) + '</span></span></div>';
        }).join('') + '<div class="pp-tools"><button class="pp-b" data-tu="refresh">Actualiser</button></div>';
        var rb = box.querySelector('[data-tu]'); if (rb) rb.onclick = async function () { try { var b = await getBalance(); setBalanceUi(b); } catch (e) { /* ignore */ } window.loadWalletHistory(); toast('Mise à jour effectuée', 'success'); };
      } catch (e) { box.style.display = 'none'; /* règles Firestore : lecture non autorisée → section masquée */ }
    }

    /* ================= ÉCRAN DE RECHARGE ================= */
    var oldRecharge = window.showRecharge;
    window.showRecharge = function () {
      var r = oldRecharge.apply(this, arguments);
      try { decorateRecharge(); } catch (e) { /* amélioration facultative */ }
      return r;
    };
    function decorateRecharge() {
      var view = $('view-recharge'); if (!view) return;
      var amt = $('recharge-amount');
      if (amt && !$('pp-sum')) {
        var s = document.createElement('div'); s.id = 'pp-sum'; s.className = 'muted small'; s.style.margin = '4px 0 0';
        var eq = $('recharge-equivalent'); (eq || amt).insertAdjacentElement('afterend', s);
        amt.addEventListener('input', sumUpdate); amt.addEventListener('change', sumUpdate);
      }
      if (!$('pp-help')) {
        var cfg = window.CN_COMPANY || {}, sup = cfg.support || {}, link = sup.whatsapp ? 'https://wa.me/' + String(sup.whatsapp).replace(/\D/g, '') : (sup.email ? 'mailto:' + sup.email : '');
        var hp = document.createElement('p'); hp.id = 'pp-help'; hp.className = 'muted small'; hp.style.cssText = 'text-align:center;margin-top:10px';
        hp.innerHTML = 'Un souci avec un paiement ? Consultez l’état dans <a href="#" data-pp-go="wallet">Portefeuille › Mes recharges</a>' + (link ? ' ou <a href="' + esc(link) + '" target="_blank" rel="noopener">contactez le support</a>' : '') + '.';
        var note = $('pay-manual-note'); if (note) note.insertAdjacentElement('beforebegin', hp); else view.querySelector('.wrap').appendChild(hp);
        hp.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-pp-go]'); if (a) { e.preventDefault(); try { showDashboard(); showDashTab('wallet'); } catch (er) { /* ignore */ } } });
      }
      sumUpdate();
      // alerte : recharge déjà en cours
      var old = $('pp-pending'); if (old) old.remove();
      if (typeof currentUser !== 'undefined' && currentUser) {
        fetchTopups().then(function (list) {
          var cut = Date.now() - 3 * 3600000;
          var p = list.filter(function (r) { return (r.status === 'pending_payment' || r.status === 'pending' || r.status === 'pending_admin_review') && new Date(r.createdAt).getTime() > cut; })[0];
          if (!p || $('pp-pending')) return;
          var d = document.createElement('div'); d.id = 'pp-pending'; d.className = 'pp-ban wait'; d.innerHTML = '<b>Une recharge est déjà en cours</b>' + usd(p.amountUSD != null ? p.amountUSD : p.amount) + ' · ' + esc(METHOD[p.method] || 'Recharge') + ' · ' + esc(fmtDate(p.createdAt, true)) + '. Vérifiez son état avant d’en créer une nouvelle pour éviter un double paiement.';
          var h = view.querySelector('.page-title'); if (h) h.insertAdjacentElement('beforebegin', d);
        }).catch(function () { /* lecture non autorisée : pas d'alerte */ });
      }
    }
    function sumUpdate() {
      var s = $('pp-sum'), amt = $('recharge-amount'); if (!s || !amt) return;
      var v = parseFloat(amt.value || 0); var local = false;
      try { local = typeof payMethod !== 'undefined' && payMethod === 'mobile' && typeof payCurrency !== 'undefined' && payCurrency === 'local'; } catch (e) { /* ignore */ }
      if (!v || v <= 0 || local) { s.textContent = ''; return; }
      var min = 0; try { if (typeof isOptMethod === 'function' && isOptMethod()) min = CARD_OPT_MIN_USD; } catch (e) { /* ignore */ }
      if (min && v < min) { s.innerHTML = '<span class="pp-out">Montant minimum pour ce moyen de paiement : ' + min + ' $.</span>'; return; }
      s.innerHTML = 'Montant crédité sur votre solde : <b>' + v.toFixed(2) + ' $</b>';
    }
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#pay-method-tabs, #pay-operators, .cn-amt-chips')) setTimeout(sumUpdate, 50); });
  }
  go();
})();
