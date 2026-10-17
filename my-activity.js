/* Coeurnoh Universe — « Mon activité » : tableau de bord personnel dans l'onglet Portefeuille.
   Regroupe en un coup d'œil : mouvements récents, prochain événement, mes événements,
   factures à encaisser, demandes de service en cours et annonces publiées. Chaque tuile ouvre
   l'écran concerné. Lecture seule, avec les mêmes requêtes que les écrans de l'application ;
   une tuile dont la lecture est refusée se masque sans gêner les autres. */
(function () {
  'use strict';
  if (window.__cnActivity) return; window.__cnActivity = true;
  var tries = 0;
  function go() { if (!document.getElementById('dash-tab-wallet') || typeof window.showDashTab !== 'function') { if (++tries < 120) setTimeout(go, 250); return; } main(); }
  function main() {
    function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
    function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }
    function fmt(n, d) { return (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 2 : d }); }
    function call(fn) { try { if (typeof window[fn] === 'function') window[fn].apply(null, [].slice.call(arguments, 1)); } catch (e) { /* ignore */ } }

    var ICO = { ticket: '<path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M13 5v14" stroke-dasharray="2 3"/>', cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>', home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' };
    function ic(n) { return '<span class="ma-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[n] + '</svg></span>'; }

    /* ---------- calculs purs (testés) ---------- */
    function invoiceDue(inv, now) {
      var total = Number(inv.total) || 0, paid = Math.min(total, (inv.payments || []).reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0));
      var due = Math.max(0, total - paid), late = false;
      if (due > 0.005 && inv.dueDate) { var d = new Date(inv.dueDate + 'T23:59:59'); late = !isNaN(d) && d.getTime() < (now || Date.now()); }
      return { due: due > 0.005 ? due : 0, late: late };
    }
    function summarizeInvoices(list, now) {
      var by = {}, late = 0, open = 0;
      list.forEach(function (i) { var s = invoiceDue(i, now); if (s.due > 0) { var c = i.currency || 'USD'; by[c] = (by[c] || 0) + s.due; open++; if (s.late) late++; } });
      return { byCurrency: by, open: open, late: late };
    }
    function nextTicket(tickets, now) {
      var best = null;
      tickets.forEach(function (t) { if (t.status === 'cancelled') return; var ms = new Date(t.eventStartDate).getTime(); if (!isFinite(ms) || ms < (now || Date.now()) - 3 * 3600000) return; if (!best || ms < best.ms) best = { ms: ms, t: t }; });
      return best;
    }
    function netRecent(txs, days, now) {
      var from = (now || Date.now()) - days * 86400000, net = 0;
      txs.forEach(function (t) { var ms = new Date(t.createdAt).getTime(); if (isFinite(ms) && ms >= from) net += Number(t.amount) || 0; });
      return Math.round(net * 100) / 100;
    }
    function daysLabel(ms, now) {
      var d0 = new Date(now || Date.now()); d0.setHours(0, 0, 0, 0); var d1 = new Date(ms); d1.setHours(0, 0, 0, 0); var n = Math.round((d1 - d0) / 86400000);
      return n <= 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : 'Dans ' + n + ' jours';
    }
    window.CNActivity = { invoiceDue: invoiceDue, summarizeInvoices: summarizeInvoices, nextTicket: nextTicket, netRecent: netRecent, daysLabel: daysLabel };

    var st = document.createElement('style');
    st.textContent = '.ma-wrap{margin:0 0 14px}.ma-h{margin:2px 2px 10px}.ma-h b{display:block;font-size:1.02rem}.ma-h small{display:block;font-size:.78rem;color:var(--muted,#5d6779);margin-top:2px}.ma-h button{border:0;background:none;color:#1b4fd8;font-weight:700;font-size:.82rem;cursor:pointer;padding:0;margin-top:4px}.ma-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.ma-t{background:var(--white,#fff);border:0;border-radius:20px;padding:14px;text-align:left;cursor:pointer;color:inherit;font:inherit;min-width:0;box-shadow:0 2px 14px rgba(20,38,63,.07);display:block}.ma-t.w{grid-column:1/3}.ma-ic{width:34px;height:34px;border-radius:11px;background:#eef2f8;color:#14263f;display:flex;align-items:center;justify-content:center;margin-bottom:10px}.ma-t small{display:block;font-size:.66rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#5d6779);margin-bottom:4px}.ma-t b{display:block;font-size:1.08rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ma-t span.s{display:block;font-size:.78rem;color:var(--muted,#5d6779);margin-top:2px}.ma-t .bad{color:#b0182c;font-weight:700}.ma-t .ok{color:#0b7a50;font-weight:700}';
    document.head.appendChild(st);

    var cache = { at: 0, uid: '', html: '' }, busy = false;
    async function q(name, fn) { try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, v: null, name: name }; } }
    async function build() {
      var u = me(); if (!u) return '';
      var col = function (c, f) { return db.collection(c).where(f, '==', u.uid).limit(200).get().then(function (s) { return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }); };
      var R = await Promise.all([
        q('tx', function () { return db.collection('wallet_transactions').where('uid', '==', u.uid).orderBy('createdAt', 'desc').limit(100).get().then(function (s) { return s.docs.map(function (d) { return d.data(); }); }); }),
        q('tk', function () { return col('event_tickets', 'buyerUid'); }),
        q('ev', function () { return col('events', 'ownerUid'); }),
        q('inv', function () { return col('invoices', 'ownerUid'); }),
        q('sr', function () { return col('service_requests', 'clientUid'); }),
        q('im', function () { return col('properties', 'ownerUid'); }),
        q('tv', function () { return col('travel_spots', 'ownerUid'); }),
        q('jb', function () { return col('job_offers', 'ownerUid'); }),
        q('co', function () { return col('courses', 'ownerUid'); })
      ]);
      var tiles = '';
      if (R[1].ok) {
        var nt = nextTicket(R[1].v);
        tiles += '<button type="button" class="ma-t" data-ma="ticket" data-id="' + esc(nt ? nt.t.eventId : '') + '">' + ic('ticket') + '<small>Prochain événement</small>' + (nt ? '<b>' + esc(nt.t.eventTitle || 'Événement') + '</b><span class="s">' + esc(daysLabel(nt.ms)) + '</span>' : '<b>Aucun billet</b><span class="s">Découvrir les événements</span>') + '</button>';
      }
      if (R[2].ok) {
        var sold = 0, rev = 0; R[2].v.forEach(function (e) { (e.ticketTypes || []).forEach(function (t) { var s = Number(t.quantitySold) || 0; sold += s; rev += s * (Number(t.price) || 0); }); });
        tiles += '<button type="button" class="ma-t" data-ma="events">' + ic('cal') + '<small>Mes événements</small><b>' + R[2].v.length + '</b><span class="s">' + (R[2].v.length ? fmt(sold) + ' billet' + (sold > 1 ? 's' : '') + ' vendu' + (sold > 1 ? 's' : '') + ' · ' + fmt(rev, 2) + ' $' : 'Créer un événement') + '</span></button>';
      }
      if (R[3].ok && R[3].v.length) {
        var s = summarizeInvoices(R[3].v), cur = Object.keys(s.byCurrency);
        tiles += '<button type="button" class="ma-t" data-ma="invoices">' + ic('file') + '<small>Factures à encaisser</small><b>' + (cur.length ? cur.map(function (c) { return fmt(s.byCurrency[c], 2) + ' ' + esc(c); }).join(' + ') : 'Tout est réglé') + '</b><span class="s">' + (s.late ? '<i class="bad" style="font-style:normal">' + s.late + ' en retard</i>' : s.open ? s.open + ' en attente' : 'Aucune en attente') + '</span></button>';
      }
      if (R[4].ok && R[4].v.length) {
        var open = R[4].v.filter(function (r) { return r.status === 'open'; }).length, prog = R[4].v.filter(function (r) { return r.status === 'in_progress'; }).length;
        tiles += '<button type="button" class="ma-t" data-ma="requests">' + ic('tool') + '<small>Demandes de service</small><b>' + (open + prog) + ' en cours</b><span class="s">' + open + ' ouverte' + (open > 1 ? 's' : '') + ' · ' + prog + ' acceptée' + (prog > 1 ? 's' : '') + '</span></button>';
      }
      var ads = [['Immobilier', R[5], 'immo'], ['Voyage', R[6], 'travel'], ['Emplois', R[7], 'jobs'], ['Cours', R[8], 'courses']].filter(function (a) { return a[1].ok && a[1].v.length; });
      if (ads.length) tiles += '<div class="ma-t w" style="cursor:default">' + ic('home') + '<small>Mes annonces publiées</small><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">' + ads.map(function (a) { return '<button type="button" data-ma="' + a[2] + '" style="border:1px solid var(--line,#dde3ec);background:#f3f5f9;border-radius:999px;padding:5px 12px;font-weight:700;font-size:.8rem;cursor:pointer;color:inherit">' + a[0] + ' · ' + a[1].v.length + '</button>'; }).join('') + '</div></div>';
      return '<div class="ma-h"><b>Mon activité</b><small>Vos événements, factures, demandes et annonces en un coup d’œil.</small><button type="button" data-ma="refresh">Actualiser</button></div><div class="ma-g">' + tiles + '</div>';
    }
    async function render(force) {
      var host = document.getElementById('ma-wrap'), u = me();
      if (!host) {
        var anchor = document.querySelector('#dash-tab-wallet .wallet-box'); if (!anchor) return;
        host = document.createElement('div'); host.id = 'ma-wrap'; host.className = 'ma-wrap'; anchor.insertAdjacentElement('afterend', host);
        host.addEventListener('click', onClick);
      }
      if (!u) { host.innerHTML = ''; return; }
      if (!force && cache.uid === u.uid && Date.now() - cache.at < 60000 && cache.html) { host.innerHTML = cache.html; return; }
      if (busy) return; busy = true;
      try { var html = await build(); cache = { at: Date.now(), uid: u.uid, html: html }; host.innerHTML = html; } catch (e) { /* ignore */ }
      busy = false;
    }
    function onClick(e) {
      var b = e.target.closest && e.target.closest('[data-ma]'); if (!b) return; var a = b.getAttribute('data-ma');
      if (a === 'refresh') { render(true); return; }
      if (a === 'ticket') { var id = b.getAttribute('data-id'); if (id) { call('openEventsScreen'); call('openEventDetail', id); } else call('openEventsScreen'); }
      else if (a === 'events') call('openEventsScreen');
      else if (a === 'invoices') call('openInvoiceScreen');
      else if (a === 'requests') call('openServiceRequestScreen');
      else if (a === 'immo') call('openImmoScreen');
      else if (a === 'travel') call('openTravelScreen');
      else if (a === 'jobs') call('openJobsScreen');
      else if (a === 'courses') call('openAcademyScreen');
    }
    var orig = window.showDashTab;
    window.showDashTab = function (tab) { var r = orig.apply(this, arguments); if (tab === 'wallet') setTimeout(function () { render(false); }, 50); return r; };
    
  }
  go();
})();
