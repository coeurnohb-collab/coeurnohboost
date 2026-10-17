/* Coeurnoh Universe — Billetterie professionnelle.
   Participant : e-billets avec QR code, code court, agrandissement plein écran, ajout au calendrier (.ics),
                 compte à rebours, alerte « dernières places ».
   Organisateur : validation à l'entrée (scan caméra si le navigateur le permet, sinon saisie du code),
                  admission partielle des billets multiples, anti-doublon côté serveur, statistiques en direct,
                  liste des participants avec recherche, filtres, validation manuelle et export CSV.
   Dépend de qr-lite.js (window.CNQR) et de l'action serveur « event_checkin » / « event_stats ». */
(function () {
  'use strict';
  if (window.__cnTicketPro) return; window.__cnTicketPro = true;
  var tries = 0;
  function go() {
    if (typeof window.openEventDetail !== 'function' || typeof window.loadMyEventTickets !== 'function') { if (++tries < 120) setTimeout(go, 250); return; }
    main();
  }
  function main() {
    var $ = function (id) { return document.getElementById(id); };
    function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
    function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
    function money(n) { return (Number(n) || 0) === 0 ? 'Gratuit' : (Number(n)).toFixed(2) + ' $'; }
    function fdate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }
    function shortCode(id) { return String(id || '').slice(0, 8).toUpperCase(); }
    function qrSvg(text, o) { return window.CNQR ? window.CNQR.svg(text, o) : ''; }
    async function api(action, body) {
      var idToken = await auth.currentUser.getIdToken();
      var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body)) });
      var j = await r.json(); if (!j.success) throw new Error(j.error || 'Erreur');
      return j;
    }
    var CSS = '.tp-tk{background:var(--white,#fff);border-radius:20px;overflow:hidden;margin-bottom:14px;box-shadow:0 4px 18px rgba(20,38,63,.1)}.tp-top{background:#14263f;color:#fff;padding:14px 16px}.tp-top b{display:block;font-size:1.02rem}.tp-top small{opacity:.8;font-size:.78rem}' +
      '.tp-mid{display:flex;gap:14px;padding:14px 16px;align-items:center;border-bottom:2px dashed var(--line,#dde3ec);position:relative}.tp-qr{flex:0 0 112px;width:112px;height:112px;border-radius:12px;background:#fff;border:1px solid var(--line,#dde3ec);padding:4px;cursor:pointer}.tp-qr svg{width:100%;height:100%;display:block}.tp-info{font-size:.84rem;line-height:1.5}.tp-info b{font-size:.95rem}' +
      '.tp-code{display:inline-block;font:700 .9rem ui-monospace,Menlo,monospace;letter-spacing:.12em;background:#eef2f8;border-radius:8px;padding:4px 8px;margin-top:4px}.tp-bot{padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
      '.tp-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.7rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.tp-pill.ok{background:#e3f6ec;color:#0b7a50}.tp-pill.used{background:#e9edf3;color:#4a5568}.tp-pill.bad{background:#fde5e8;color:#b0182c}.tp-pill.past{background:#fff3d6;color:#8a5a00}' +
      '.tp-big{position:fixed;inset:0;z-index:2700;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}.tp-big svg{width:min(78vw,340px);height:auto}.tp-big h3{margin:16px 0 4px}.tp-big .tp-code{font-size:1.2rem}.tp-big button.x{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;border:0;background:#eef2f8;border-radius:12px;width:42px;height:42px;font-size:1.4rem;cursor:pointer}' +
      '.tp-sc{position:fixed;inset:0;z-index:2650;background:var(--bg,#f3f5f9);display:flex;flex-direction:column}.tp-hd{display:flex;align-items:center;gap:10px;padding:max(12px,env(safe-area-inset-top)) 14px 12px;background:#14263f;color:#fff}.tp-hd h2{margin:0;font-size:1.02rem;flex:1}.tp-hd button{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:12px;width:40px;height:40px;cursor:pointer;font-size:1.2rem}' +
      '.tp-cnt{display:flex;gap:10px;padding:12px 14px 0}.tp-cnt div{flex:1;background:var(--white,#fff);border-radius:14px;padding:10px;text-align:center;box-shadow:0 2px 10px rgba(20,38,63,.07)}.tp-cnt b{display:block;font-size:1.3rem}.tp-cnt small{font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#5d6779)}' +
      '.tp-body{flex:1;overflow-y:auto;padding:14px}.tp-cam{position:relative;border-radius:18px;overflow:hidden;background:#000;aspect-ratio:1;max-height:42vh;width:100%;margin-bottom:12px}.tp-cam video{width:100%;height:100%;object-fit:cover}.tp-cam i{position:absolute;inset:18%;border:3px solid rgba(255,255,255,.85);border-radius:18px;box-shadow:0 0 0 999px rgba(0,0,0,.35)}' +
      '.tp-res{border-radius:18px;padding:18px;margin-top:12px;color:#fff;text-align:center}.tp-res.ok{background:#0b9a6a}.tp-res.warn{background:#e8890c}.tp-res.bad{background:#d7263d}.tp-res h3{margin:0 0 4px;font-size:1.25rem}.tp-res p{margin:0;opacity:.95;font-size:.9rem}' +
      '.tp-in{display:flex;gap:8px}.tp-in input{flex:1;font:700 1.05rem ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}.tp-b{border:0;border-radius:12px;background:#1b4fd8;color:#fff;font-weight:700;padding:11px 16px;cursor:pointer}.tp-b.s{background:#e9edf3;color:#14263f}' +
      '.tp-st{background:var(--white,#fff);border-radius:18px;padding:16px;margin-bottom:12px;box-shadow:0 2px 12px rgba(20,38,63,.07)}.tp-bar{height:9px;border-radius:5px;background:#e3e8f0;overflow:hidden;margin:6px 0}.tp-bar i{display:block;height:100%;background:#1b4fd8}.tp-bar i.g{background:#0b9a6a}' +
      '.tp-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(0,0,0,.06);font-size:.88rem}.tp-row:first-child{border-top:0}.tp-row small{color:var(--muted,#5d6779);display:block}.tp-chips{display:flex;gap:6px;overflow-x:auto;margin:10px 0;scrollbar-width:none}.tp-chips button{flex:0 0 auto;border:0;border-radius:999px;padding:7px 13px;font-weight:700;font-size:.78rem;background:#e9edf3;color:#34415a;cursor:pointer}.tp-chips button.on{background:#14263f;color:#fff}' +
      '.tp-soon{display:inline-block;background:#fde5e8;color:#b0182c;font-weight:800;font-size:.7rem;padding:2px 8px;border-radius:999px;margin-left:6px}.tp-evbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.tp-evbar button,.tp-evbar a{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:12px;padding:9px 13px;font-weight:700;font-size:.82rem;cursor:pointer;color:inherit;text-decoration:none}';
    if (!$('tp-css')) { var st = document.createElement('style'); st.id = 'tp-css'; st.textContent = CSS; document.head.appendChild(st); }

    /* ================= PARTICIPANT : mes billets ================= */
    function icsFor(ev) {
      var z = function (iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); };
      var s = ev.startDate || ev.eventStartDate, e = ev.endDate || s; if (!s) return '';
      var esc2 = function (t) { return String(t || '').replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\r?\n/g, '\\n'); };
      return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Coeurnoh Universe//Billetterie//FR', 'BEGIN:VEVENT', 'UID:' + (ev.id || Date.now()) + '@coeurnohboost.vercel.app', 'DTSTAMP:' + z(new Date().toISOString()), 'DTSTART:' + z(s), 'DTEND:' + z(e), 'SUMMARY:' + esc2(ev.title || ev.eventTitle), 'LOCATION:' + esc2(ev.location), 'DESCRIPTION:' + esc2(ev.description), 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    }
    function downloadIcs(ev, name) {
      var t = icsFor(ev); if (!t) { toast('Date de l’événement indisponible', 'error'); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/calendar;charset=utf-8' })); a.download = (name || 'evenement').replace(/[^\w-]+/g, '-').slice(0, 40) + '.ics'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    var TK = {};
    function tkState(tk) {
      var qty = tk.quantity || 1, used = Math.min(qty, tk.checkedInCount || 0);
      var past = tk.eventStartDate && new Date(tk.eventEndDate || tk.eventStartDate).getTime() < Date.now() - 6 * 3600e3;
      if (tk.status === 'cancelled') return ['bad', 'Annulé', used, qty];
      if (used >= qty) return ['used', 'Utilisé', used, qty];
      if (past) return ['past', 'Événement passé', used, qty];
      return ['ok', used ? 'Valide · ' + used + '/' + qty + ' entré(s)' : 'Valide', used, qty];
    }
    window.loadMyEventTickets = async function () {
      var listEl = $('events-mytickets-list'); if (!listEl) return;
      if (!currentUser) { listEl.innerHTML = '<p class="muted small">' + esc(t('event_login_mytickets_prompt')) + '</p>'; return; }
      listEl.innerHTML = renderFeedSkeletons(2);
      try {
        var snap = await db.collection('event_tickets').where('buyerUid', '==', currentUser.uid).limit(200).get();
        var list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); TK = {}; list.forEach(function (x) { TK[x.id] = x; });
        var now = Date.now();
        list.sort(function (a, b) { var fa = new Date(a.eventStartDate).getTime() >= now, fb = new Date(b.eventStartDate).getTime() >= now; if (fa !== fb) return fa ? -1 : 1; return fa ? new Date(a.eventStartDate) - new Date(b.eventStartDate) : (b.createdAt || '').localeCompare(a.createdAt || ''); });
        if (!list.length) { listEl.innerHTML = '<div class="tp-st" style="text-align:center"><b>Aucun billet pour l’instant</b><p class="muted small" style="margin:6px 0 0">Tes billets avec QR code apparaîtront ici dès ta première réservation.</p></div>'; return; }
        listEl.innerHTML = list.map(function (tk) {
          var s = tkState(tk), days = tk.eventStartDate ? Math.ceil((new Date(tk.eventStartDate).getTime() - now) / 86400000) : null;
          var cd = (s[0] === 'ok' && days != null) ? (days > 1 ? 'Dans ' + days + ' jours' : days === 1 ? 'Demain' : days === 0 ? 'Aujourd’hui' : '') : '';
          return '<div class="tp-tk" data-id="' + esc(tk.id) + '"><div class="tp-top"><b>' + esc(tk.eventTitle || 'Événement') + '</b><small>' + esc(fdate(tk.eventStartDate)) + (cd ? ' · ' + cd : '') + '</small></div>' +
            '<div class="tp-mid"><div class="tp-qr" data-tp="big" role="button" aria-label="Agrandir le QR code">' + (s[0] === 'bad' ? '' : qrSvg('CN1:' + tk.id, { margin: 1 })) + '</div><div class="tp-info"><span class="tp-pill ' + s[0] + '">' + esc(s[1]) + '</span><br><b>' + esc(tk.ticketTypeName || 'Billet') + '</b> × ' + (tk.quantity || 1) + '<br>' + esc(money(tk.amountPaid)) + '<br><span class="tp-code">' + shortCode(tk.id) + '</span></div></div>' +
            '<div class="tp-bot"><button class="btn btn-primary btn-sm" data-tp="big">Afficher le billet</button><button class="btn btn-outline btn-sm" data-tp="ics">Calendrier</button><button class="btn btn-outline btn-sm" data-tp="open">Détails</button>' +
            (tk.status === 'confirmed' && !s[2] && s[0] === 'ok' ? '<button class="btn btn-outline btn-sm" style="color:var(--red-text)" data-tp="cancel">Annuler</button>' : '') + '</div></div>';
        }).join('');
        listEl.onclick = function (e) {
          var b = e.target.closest && e.target.closest('[data-tp]'); if (!b) return; var card = b.closest('[data-id]'); var tk = card && TK[card.getAttribute('data-id')]; if (!tk) return; var a = b.getAttribute('data-tp');
          if (a === 'big') bigTicket(tk); else if (a === 'ics') downloadIcs({ id: tk.eventId, title: tk.eventTitle, startDate: tk.eventStartDate, endDate: tk.eventEndDate, location: tk.eventLocation }, tk.eventTitle);
          else if (a === 'open') window.openEventDetail(tk.eventId); else if (a === 'cancel') window.cancelEventTicket(tk.id);
        };
      } catch (e) { listEl.innerHTML = '<p class="muted small">' + esc(t('event_load_error_prefix')) + ' ' + esc(e.message) + '</p>'; }
    };
    function bigTicket(tk) {
      var s = tkState(tk), o = document.createElement('div'); o.className = 'tp-big';
      o.innerHTML = '<button class="x" aria-label="Fermer">×</button>' + (s[0] === 'bad' ? '<h3>Billet annulé</h3>' : qrSvg('CN1:' + tk.id, { margin: 2 }) + '<h3>' + esc(tk.eventTitle || '') + '</h3><div>' + esc(tk.ticketTypeName || '') + ' × ' + (tk.quantity || 1) + ' · ' + esc(tk.buyerName || '') + '</div><div class="tp-code" style="margin-top:10px">' + shortCode(tk.id) + '</div><p class="muted small" style="margin-top:10px">' + esc(s[1]) + ' · Présente ce code à l’entrée. Monte la luminosité de ton écran.</p>');
      o.addEventListener('click', function (e) { if (e.target === o || e.target.classList.contains('x')) o.remove(); });
      document.body.appendChild(o);
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
    }

    /* ================= Détail événement : outils participant + organisateur ================= */
    var origDetail = window.openEventDetail;
    window.openEventDetail = async function (eventId) {
      await origDetail.apply(this, arguments);
      try {
        var body = $('event-detail-body'); if (!body || body.querySelector('.tp-evbar')) return;
        var snap = await db.collection('events').doc(eventId).get(); if (!snap.exists) return; var ev = Object.assign({ id: snap.id }, snap.data());
        var isOwner = currentUser && (currentUser.uid === ev.ownerUid), h3 = body.querySelector('h3'); if (!h3) return;
        var bar = '<div class="tp-evbar"><button type="button" data-tp2="ics">Ajouter au calendrier</button>' + (ev.location ? '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ev.location) + '" target="_blank" rel="noopener">Itinéraire</a>' : '') + '</div>';
        var days = ev.startDate ? Math.ceil((new Date(ev.startDate).getTime() - Date.now()) / 86400000) : null;
        var info = '';
        if (days != null && days >= 0 && ev.status === 'active') info += '<p class="muted small" style="margin:0 0 10px"><b>' + (days === 0 ? 'C’est aujourd’hui' : days === 1 ? 'C’est demain' : 'Dans ' + days + ' jours') + '</b></p>';
        var anchor = body.querySelector('p[style*="pre-wrap"]'); if (anchor) anchor.insertAdjacentHTML('beforebegin', info + bar);
        // dernières places
        (ev.ticketTypes || []).forEach(function (tk) { var left = (tk.quantityTotal || 0) - (tk.quantitySold || 0); if (left > 0 && left <= 10 && !isOwner) { Array.prototype.forEach.call(body.querySelectorAll('.order-box strong'), function (el) { if (el.textContent === (tk.name || '') && !el.parentNode.querySelector('.tp-soon')) el.insertAdjacentHTML('afterend', '<span class="tp-soon">Plus que ' + left + '</span>'); }); } });
        if (isOwner) {
          var first = body.querySelector('button[onclick^="openEventAttendees"]');
          if (first) first.insertAdjacentHTML('beforebegin', '<button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" data-tp2="scan">Valider les billets à l’entrée</button><button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" data-tp2="stats">Statistiques en direct</button>');
        }
        body.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-tp2]'); if (!b) return; var a = b.getAttribute('data-tp2'); if (a === 'ics') downloadIcs(ev, ev.title); else if (a === 'scan') openScanner(ev); else if (a === 'stats') openStats(ev); });
      } catch (e) { /* amélioration facultative */ }
    };

    /* ================= ORGANISATEUR : validation à l'entrée ================= */
    function openScanner(ev) {
      var old = document.querySelector('.tp-sc'); if (old) old.remove();
      var o = document.createElement('div'); o.className = 'tp-sc';
      o.innerHTML = '<div class="tp-hd"><button data-s="close" aria-label="Fermer">×</button><h2>' + esc(ev.title || 'Entrée') + '</h2><button data-s="stats" aria-label="Statistiques" style="font-size:.8rem;width:auto;padding:0 12px">Stats</button></div>' +
        '<div class="tp-cnt"><div><b id="tp-in">–</b><small>Entrés</small></div><div><b id="tp-sold">–</b><small>Vendus</small></div><div><b id="tp-left">–</b><small>À venir</small></div></div>' +
        '<div class="tp-body"><div class="tp-cam" id="tp-cam" style="display:none"><video id="tp-vid" playsinline muted></video><i></i></div>' +
        '<div style="display:flex;gap:8px;margin-bottom:10px"><button class="tp-b" data-s="cam" id="tp-camb">Scanner un QR code</button></div>' +
        '<div class="tp-in"><input id="tp-code" class="text-input" placeholder="Code du billet" autocomplete="off" autocapitalize="characters" maxlength="30"><button class="tp-b" data-s="go">Vérifier</button></div>' +
        '<label class="muted small" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="tp-auto" checked> Valider automatiquement les billets individuels</label><div id="tp-res"></div></div>';
      document.body.appendChild(o);
      var stream = null, timer = null, busy = false, lastCode = '', lastAt = 0;
      function stopCam() { if (timer) { clearInterval(timer); timer = null; } if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } var c = $('tp-cam'); if (c) c.style.display = 'none'; var b = $('tp-camb'); if (b) b.textContent = 'Scanner un QR code'; }
      function close() { stopCam(); o.remove(); }
      async function refresh() { try { var s = await api('event_stats', { eventId: ev.id }); $('tp-in').textContent = s.present; $('tp-sold').textContent = s.sold; $('tp-left').textContent = Math.max(0, s.sold - s.present); } catch (e) { /* secondaire */ } }
      function show(kind, title, sub, html) { $('tp-res').innerHTML = '<div class="tp-res ' + kind + '"><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p>' + (html || '') + '</div>'; if (navigator.vibrate) navigator.vibrate(kind === 'ok' ? 80 : [60, 40, 60]); }
      async function verify(raw) {
        raw = String(raw || '').trim(); if (!raw || busy) return; busy = true;
        try {
          var auto = $('tp-auto').checked;
          var d = await api('event_checkin', { eventId: ev.id, code: raw, dryRun: true });
          var t = d.ticket;
          if (d.reason === 'cancelled') { show('bad', 'Billet annulé', t.buyerName + ' · ' + t.ticketTypeName); }
          else if (!d.valid) { show('warn', 'Déjà utilisé', t.buyerName + ' · ' + t.used + '/' + t.quantity + ' entrée(s)' + (t.lastCheckInAt ? ' · ' + new Date(t.lastCheckInAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')); }
          else if (t.remaining === 1 && auto) { await admit(t.id, 1); }
          else {
            show('warn', t.buyerName, t.ticketTypeName + ' · ' + t.remaining + ' place(s) restante(s) sur ' + t.quantity,
              '<div style="margin-top:12px;display:flex;gap:8px;justify-content:center;align-items:center"><button class="tp-b s" data-n="-1">−</button><b id="tp-n" style="font-size:1.4rem;min-width:36px">' + t.remaining + '</b><button class="tp-b s" data-n="1">+</button><button class="tp-b" data-ok="' + esc(t.id) + '" data-max="' + t.remaining + '" style="background:#fff;color:#14263f">Valider l’entrée</button></div>');
          }
        } catch (e) { show('bad', 'Billet non reconnu', e.message); }
        busy = false;
      }
      async function admit(id, n) {
        try { var d = await api('event_checkin', { eventId: ev.id, code: id, admit: n }); var t = d.ticket; show(d.valid ? 'ok' : 'warn', d.valid ? 'Entrée validée' : 'Déjà utilisé', t.buyerName + ' · ' + t.ticketTypeName + (d.valid ? ' · ' + d.admitted + ' personne(s) · reste ' + t.remaining : '')); $('tp-code').value = ''; refresh(); }
        catch (e) { show('bad', 'Erreur', e.message); }
      }
      async function startCam() {
        if (stream) { stopCam(); return; }
        if (!('BarcodeDetector' in window) || !navigator.mediaDevices) { show('warn', 'Scan caméra indisponible', 'Ton navigateur ne le permet pas : saisis le code à 8 caractères affiché sous le QR du billet.'); return; }
        try {
          var det = new window.BarcodeDetector({ formats: ['qr_code'] });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          var v = $('tp-vid'); v.srcObject = stream; await v.play(); $('tp-cam').style.display = ''; $('tp-camb').textContent = 'Arrêter la caméra';
          timer = setInterval(async function () {
            if (busy || v.readyState < 2) return;
            try { var r = await det.detect(v); if (r && r[0] && r[0].rawValue) { var c = r[0].rawValue; if (c === lastCode && Date.now() - lastAt < 4000) return; lastCode = c; lastAt = Date.now(); verify(c); } } catch (e) { /* image suivante */ }
          }, 350);
        } catch (e) { show('warn', 'Caméra inaccessible', 'Autorise l’accès à la caméra dans ton navigateur, ou saisis le code manuellement.'); }
      }
      o.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-s],[data-n],[data-ok]'); if (!b) return;
        if (b.hasAttribute('data-n')) { var el = $('tp-n'), mx = parseInt(b.parentNode.querySelector('[data-ok]').getAttribute('data-max'), 10); el.textContent = Math.max(1, Math.min(mx, (parseInt(el.textContent, 10) || 1) + parseInt(b.getAttribute('data-n'), 10))); return; }
        if (b.hasAttribute('data-ok')) { admit(b.getAttribute('data-ok'), parseInt($('tp-n').textContent, 10) || 1); return; }
        var a = b.getAttribute('data-s'); if (a === 'close') close(); else if (a === 'go') verify($('tp-code').value); else if (a === 'cam') startCam(); else if (a === 'stats') { openStats(ev); }
      });
      $('tp-code').addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(this.value); });
      refresh();
    }

    /* ================= ORGANISATEUR : statistiques ================= */
    async function openStats(ev) {
      var o = document.createElement('div'); o.className = 'tp-sc'; o.style.zIndex = 2680;
      o.innerHTML = '<div class="tp-hd"><button data-s="close" aria-label="Fermer">×</button><h2>Statistiques</h2><button data-s="csv" style="font-size:.8rem;width:auto;padding:0 12px">CSV</button></div><div class="tp-body" id="tp-stb"><p class="muted small">Chargement…</p></div>';
      document.body.appendChild(o); var data = null;
      o.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-s]'); if (!b) return; if (b.getAttribute('data-s') === 'close') o.remove(); else if (b.getAttribute('data-s') === 'csv') exportCsv(ev); });
      try {
        var s = await api('event_stats', { eventId: ev.id }); data = s;
        var pct = s.capacity ? Math.min(100, Math.round(s.sold / s.capacity * 100)) : 0, pr = s.sold ? Math.round(s.present / s.sold * 100) : 0;
        $('tp-stb').innerHTML = '<div class="tp-st"><div style="display:flex;justify-content:space-between"><b>Billets vendus</b><b>' + s.sold + ' / ' + s.capacity + '</b></div><div class="tp-bar"><i style="width:' + pct + '%"></i></div><small class="muted">' + pct + ' % de la capacité · ' + s.cancelled + ' annulé(s)</small></div>' +
          '<div class="tp-st"><div style="display:flex;justify-content:space-between"><b>Présents à l’entrée</b><b>' + s.present + ' / ' + s.sold + '</b></div><div class="tp-bar"><i class="g" style="width:' + pr + '%"></i></div><small class="muted">' + pr + ' % des billets vendus</small></div>' +
          '<div class="tp-st"><div style="display:flex;justify-content:space-between"><b>Revenus billetterie</b><b>' + (s.revenue || 0).toFixed(2) + ' $</b></div></div>' +
          '<div class="tp-st"><b>Par type de billet</b><div style="margin-top:6px">' + Object.keys(s.byType).map(function (k) { var x = s.byType[k]; return '<div class="tp-row"><span>' + esc(k) + '<small>' + x.present + ' présent(s)</small></span><span style="text-align:right"><b>' + x.sold + ' vendu(s)</b><small>' + x.revenue.toFixed(2) + ' $</small></span></div>'; }).join('') + '</div></div>';
      } catch (e) { $('tp-stb').innerHTML = '<p class="muted small">' + esc(e.message) + '</p>'; }
    }
    async function exportCsv(ev) {
      try {
        var snap = await db.collection('event_tickets').where('eventId', '==', ev.id).limit(2000).get();
        var rows = [['Code', 'Nom', 'Type', 'Quantite', 'Entres', 'Montant', 'Statut', 'Date achat']];
        snap.docs.forEach(function (d) { var t = d.data(); rows.push([shortCode(d.id), t.buyerName || '', t.ticketTypeName || '', t.quantity || 1, t.checkedInCount || 0, t.amountPaid || 0, t.status || '', (t.createdAt || '').slice(0, 10)]); });
        var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c); if (/^[=+\-@]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; }).join(';'); }).join('\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'participants-' + (ev.title || 'evenement').replace(/[^\w-]+/g, '-').slice(0, 30) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      } catch (e) { toast(e.message, 'error'); }
    }

    /* ================= ORGANISATEUR : liste des participants ================= */
    window.openEventAttendees = async function (eventId) {
      var bodyEl = $('event-detail-body'); if (!bodyEl) return;
      bodyEl.innerHTML = '<button class="menu-back-btn" onclick="openEventDetail(\'' + esc(eventId) + '\')" aria-label="Retour" style="margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button><h3 style="margin-bottom:8px">Participants</h3><input id="tp-q" class="text-input" placeholder="Rechercher un nom ou un code" style="margin-bottom:6px"><div class="tp-chips" id="tp-f"></div><div id="event-attendees-list"><p class="muted small">Chargement…</p></div>';
      try {
        var snap = await db.collection('event_tickets').where('eventId', '==', eventId).limit(500).get();
        var all = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
        var evSnap = await db.collection('events').doc(eventId).get(); var ev = Object.assign({ id: eventId }, evSnap.exists ? evSnap.data() : {});
        var F = 'all'; var chips = [['all', 'Tous'], ['in', 'Présents'], ['out', 'Pas encore entrés'], ['cancelled', 'Annulés']];
        function draw() {
          var q = ($('tp-q').value || '').trim().toLowerCase();
          var l = all.filter(function (t) { var used = Math.min(t.quantity || 1, t.checkedInCount || 0), c = t.status === 'cancelled'; if (F === 'cancelled' && !c) return false; if (F === 'in' && (c || !used)) return false; if (F === 'out' && (c || used >= (t.quantity || 1))) return false; return !q || ((t.buyerName || '') + ' ' + shortCode(t.id)).toLowerCase().indexOf(q) >= 0; });
          $('tp-f').innerHTML = chips.map(function (c) { return '<button type="button" data-f="' + c[0] + '" class="' + (F === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '<button type="button" data-f="csv">Exporter CSV</button><button type="button" data-f="scan">Valider à l’entrée</button>';
          $('event-attendees-list').innerHTML = l.length ? l.map(function (t) {
            var qty = t.quantity || 1, used = Math.min(qty, t.checkedInCount || 0), c = t.status === 'cancelled';
            return '<div class="tp-st" style="padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(t.buyerName || 'Participant') + '</b><span class="tp-pill ' + (c ? 'bad' : used >= qty ? 'used' : used ? 'past' : 'ok') + '">' + (c ? 'Annulé' : used >= qty ? 'Entré' : used ? used + '/' + qty + ' entrés' : 'Attendu') + '</span></div><div class="muted small">' + esc(t.ticketTypeName || '') + ' × ' + qty + ' · ' + esc(money(t.amountPaid)) + ' · code <b>' + shortCode(t.id) + '</b></div>' + (!c && used < qty ? '<button class="btn btn-outline btn-sm" style="margin-top:8px" data-man="' + esc(t.id) + '">Valider manuellement</button>' : '') + '</div>';
          }).join('') : '<p class="muted small" style="text-align:center;padding:16px 0">Aucun participant.</p>';
        }
        draw(); $('tp-q').oninput = draw;
        bodyEl.onclick = async function (e) {
          var f = e.target.closest && e.target.closest('[data-f]'); if (f) { var v = f.getAttribute('data-f'); if (v === 'csv') exportCsv(ev); else if (v === 'scan') openScanner(ev); else { F = v; draw(); } return; }
          var m = e.target.closest && e.target.closest('[data-man]'); if (m) { try { var r = await api('event_checkin', { eventId: eventId, code: m.getAttribute('data-man') }); toast(r.valid ? 'Entrée validée' : 'Déjà utilisé', r.valid ? 'success' : 'info'); var t = all.find(function (x) { return x.id === m.getAttribute('data-man'); }); if (t && r.ticket) t.checkedInCount = r.ticket.used; draw(); } catch (er) { toast(er.message, 'error'); } }
        };
      } catch (e) { $('event-attendees-list').innerHTML = '<p class="muted small">' + esc(t('event_load_error_prefix')) + ' ' + esc(e.message) + '</p>'; }
    };
  }
  go();
})();
