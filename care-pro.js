/* Coeurnoh Universe — Assistance et données personnelles (côté utilisateur).
   1) Dans « Besoin d'aide ? » : envoyer une demande d'assistance suivie (numéro de référence, statut, réponses de l'équipe).
   2) Dans « Sécurité » : télécharger toutes ses données personnelles (fichier JSON).
   Tout passe par le serveur (action payments-actions) : aucune règle Firestore à modifier. */
(function () {
  'use strict';
  // Texte d'erreur lisible (jamais de message technique en anglais)
  function RE(e) { try { return readableError(e); } catch (x) { return (e && e.message) || ''; } }
  if (window.__cnCare) return; window.__cnCare = true;

  /* Textes en 7 langues (fr, en, es, it, pt, sw, ln). La langue vient de l'application ; si un texte manque : français. */
  var CT = {
    h_send: ['Envoyer une demande', 'Send a request', 'Enviar una solicitud', 'Invia una richiesta', 'Enviar um pedido', 'Tuma ombi', 'Tinda lisengi'],
    p_send: ['Un problème de paiement, de commande ou de compte ? Décris-le ici : tu reçois un numéro de suivi et la réponse apparaît dans cette page.', 'A problem with a payment, an order or your account? Describe it here: you get a tracking number and the answer appears on this page.', '¿Un problema con un pago, un pedido o tu cuenta? Descríbelo aquí: recibes un número de seguimiento y la respuesta aparece en esta página.', 'Un problema con un pagamento, un ordine o il tuo account? Descrivilo qui: ricevi un numero di tracciamento e la risposta compare in questa pagina.', 'Um problema com pagamento, pedido ou conta? Descreve aqui: recebes um número de acompanhamento e a resposta aparece nesta página.', 'Tatizo la malipo, oda au akaunti? Lieleze hapa: utapata nambari ya ufuatiliaji na jibu litaonekana kwenye ukurasa huu.', 'Likambo ya kofuta, ya commande to ya kompte? Limbolá yango awa: okozwa nimero ya landi mpe eyano ekomonana na page oyo.'],
    c_pay: ['Paiement / recharge', 'Payment / top-up', 'Pago / recarga', 'Pagamento / ricarica', 'Pagamento / recarga', 'Malipo / kuweka pesa', 'Kofuta / kotia mbongo'],
    c_order: ['Commande', 'Order', 'Pedido', 'Ordine', 'Pedido', 'Oda', 'Commande'],
    c_acc: ['Mon compte', 'My account', 'Mi cuenta', 'Il mio account', 'A minha conta', 'Akaunti yangu', 'Kompte na ngai'],
    c_tech: ['Problème technique', 'Technical problem', 'Problema técnico', 'Problema tecnico', 'Problema técnico', 'Tatizo la kiufundi', 'Likambo ya technique'],
    c_other: ['Autre', 'Other', 'Otro', 'Altro', 'Outro', 'Nyingine', 'Mosusu'],
    ph_sub: ['Sujet (ex. Recharge non reçue)', 'Subject (e.g. Top-up not received)', 'Asunto (p. ej. Recarga no recibida)', 'Oggetto (es. Ricarica non ricevuta)', 'Assunto (ex. Recarga não recebida)', 'Mada (mf. Pesa hazijaingia)', 'Likambo (ndakisa Mbongo ekoti te)'],
    ph_msg: ['Explique ce qui s’est passé (montant, date, numéro de commande…)', 'Explain what happened (amount, date, order number…)', 'Explica lo que pasó (importe, fecha, número de pedido…)', 'Spiega cosa è successo (importo, data, numero d’ordine…)', 'Explica o que aconteceu (valor, data, número do pedido…)', 'Eleza kilichotokea (kiasi, tarehe, nambari ya oda…)', 'Limbolá oyo esalemaki (motango ya mbongo, mokolo, nimero ya commande…)'],
    b_send: ['Envoyer la demande', 'Send the request', 'Enviar la solicitud', 'Invia la richiesta', 'Enviar o pedido', 'Tuma ombi', 'Tinda lisengi'],
    h_mine: ['Mes demandes', 'My requests', 'Mis solicitudes', 'Le mie richieste', 'Os meus pedidos', 'Maombi yangu', 'Ba lisengi na ngai'],
    loading: ['Chargement…', 'Loading…', 'Cargando…', 'Caricamento…', 'A carregar…', 'Inapakia…', 'Ezali kozwa…'],
    none: ['Aucune demande pour le moment.', 'No requests yet.', 'Aún no hay solicitudes.', 'Nessuna richiesta per ora.', 'Ainda sem pedidos.', 'Hakuna ombi kwa sasa.', 'Lisengi moko te mpo na ngonga oyo.'],
    team: ['Équipe Coeurnoh', 'Coeurnoh team', 'Equipo Coeurnoh', 'Team Coeurnoh', 'Equipa Coeurnoh', 'Timu ya Coeurnoh', 'Etuluku ya Coeurnoh'],
    you: ['Vous', 'You', 'Tú', 'Tu', 'Tu', 'Wewe', 'Yo'],
    ph_add: ['Ajouter un message', 'Add a message', 'Añadir un mensaje', 'Aggiungi un messaggio', 'Adicionar uma mensagem', 'Ongeza ujumbe', 'Bakisa message'],
    b_reply: ['Envoyer', 'Send', 'Enviar', 'Invia', 'Enviar', 'Tuma', 'Tinda'],
    b_close: ['Clôturer', 'Close', 'Cerrar', 'Chiudi', 'Encerrar', 'Funga', 'Kokanga'],
    login: ['Connecte-toi pour voir tes demandes.', 'Log in to see your requests.', 'Inicia sesión para ver tus solicitudes.', 'Accedi per vedere le tue richieste.', 'Inicia sessão para ver os teus pedidos.', 'Ingia ili uone maombi yako.', 'Kota mpo na komona ba lisengi na yo.'],
    login2: ['Connecte-toi pour continuer.', 'Log in to continue.', 'Inicia sesión para continuar.', 'Accedi per continuare.', 'Inicia sessão para continuar.', 'Ingia ili kuendelea.', 'Kota mpo na kokoba.'],
    err: ['Erreur, réessaie.', 'Error, try again.', 'Error, inténtalo de nuevo.', 'Errore, riprova.', 'Erro, tenta de novo.', 'Hitilafu, jaribu tena.', 'Libunga, meka lisusu.'],
    sent: ['Demande envoyée. Numéro de suivi : #{ref}. Nous te répondons dès que possible.', 'Request sent. Tracking number: #{ref}. We will answer as soon as possible.', 'Solicitud enviada. Número de seguimiento: #{ref}. Te respondemos lo antes posible.', 'Richiesta inviata. Numero di tracciamento: #{ref}. Ti rispondiamo il prima possibile.', 'Pedido enviado. Número de acompanhamento: #{ref}. Respondemos o mais depressa possível.', 'Ombi limetumwa. Nambari ya ufuatiliaji: #{ref}. Tutakujibu haraka iwezekanavyo.', 'Lisengi etindami. Nimero ya landi: #{ref}. Tokopesa yo eyano noki ekoki.'],
    sent_t: ['Demande envoyée', 'Request sent', 'Solicitud enviada', 'Richiesta inviata', 'Pedido enviado', 'Ombi limetumwa', 'Lisengi etindami'],
    s_open: ['En attente', 'Pending', 'En espera', 'In attesa', 'Em espera', 'Inasubiri', 'Ezali kozela'],
    s_answered: ['Réponse reçue', 'Answer received', 'Respuesta recibida', 'Risposta ricevuta', 'Resposta recebida', 'Jibu limepokelewa', 'Eyano ezwami'],
    s_closed: ['Clôturée', 'Closed', 'Cerrada', 'Chiusa', 'Encerrada', 'Imefungwa', 'Ekangami'],
    h_data: ['Mes données', 'My data', 'Mis datos', 'I miei dati', 'Os meus dados', 'Data zangu', 'Ba données na ngai'],
    p_data: ['Télécharge une copie de tes informations : profil, commandes, recharges, relevé du portefeuille, billets, certificats, publications et demandes d’assistance.', 'Download a copy of your information: profile, orders, top-ups, wallet statement, tickets, certificates, posts and support requests.', 'Descarga una copia de tu información: perfil, pedidos, recargas, extracto de la billetera, entradas, certificados, publicaciones y solicitudes de ayuda.', 'Scarica una copia delle tue informazioni: profilo, ordini, ricariche, estratto del portafoglio, biglietti, certificati, pubblicazioni e richieste di assistenza.', 'Descarrega uma cópia das tuas informações: perfil, pedidos, recargas, extrato da carteira, bilhetes, certificados, publicações e pedidos de assistência.', 'Pakua nakala ya taarifa zako: wasifu, oda, uwekaji pesa, taarifa ya pochi, tiketi, vyeti, machapisho na maombi ya msaada.', 'Zwa copie ya ba informations na yo: profil, ba commandes, ba recharges, relevé ya portefeuille, ba billets, ba certificats, ba publications mpe ba lisengi ya lisungi.'],
    b_data: ['Télécharger mes données', 'Download my data', 'Descargar mis datos', 'Scarica i miei dati', 'Descarregar os meus dados', 'Pakua data zangu', 'Kozwa ba données na ngai'],
    prep: ['Préparation…', 'Preparing…', 'Preparando…', 'Preparazione…', 'A preparar…', 'Inaandaa…', 'Ezali kobongisama…'],
    done: ['Fichier téléchargé.', 'File downloaded.', 'Archivo descargado.', 'File scaricato.', 'Ficheiro descarregado.', 'Faili imepakuliwa.', 'Fichier ezwami.']
  };
  var CL = ['fr', 'en', 'es', 'it', 'pt', 'sw', 'ln'];
  function X(key, vars) {
    var a = CT[key]; if (!a) return key;
    var l = 'fr'; try { if (typeof currentLang !== 'undefined' && currentLang) l = currentLang; } catch (e) { /* ignore */ }
    var i = CL.indexOf(l); if (i < 0) i = 1;
    var s = a[i] || a[0];
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }
  var CATK = { paiement: 'c_pay', commande: 'c_order', compte: 'c_acc', technique: 'c_tech', autre: 'c_other' };
  var LOC = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', sw: 'sw-KE', ln: 'fr-FR' };
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
    if (!auth.currentUser) throw new Error(X('login2'));
    var idToken = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body || {})) });
    var j = await r.json(); if (!j.success) throw new Error(j.error || X('err')); return j;
  }
  var st = document.createElement('style');
  st.textContent = '.cr-box{margin-top:16px;padding-top:14px;border-top:1px solid #e3e8f0}.cr-box h4{margin:0 0 4px;font-size:1rem}.cr-box .field{margin:8px 0}.cr-box select,.cr-box input,.cr-box textarea{width:100%;box-sizing:border-box;border:1px solid #d5dbe6;border-radius:12px;padding:11px 12px;font:inherit;background:#fff;color:inherit}.cr-box textarea{min-height:96px;resize:vertical}' +
    '.cr-t{border:1px solid #e3e8f0;border-radius:14px;padding:11px 12px;margin:8px 0;background:#fff}.cr-t .h{display:flex;justify-content:space-between;gap:8px;align-items:center}.cr-t b{font-size:.92rem}.cr-s{font-size:.74rem;font-weight:800;border-radius:999px;padding:3px 9px;white-space:nowrap}.cr-s.open{background:#fff1d6;color:#8a5a00}.cr-s.answered{background:#dff5e8;color:#16743d}.cr-s.closed{background:#e9edf3;color:#5d6779}' +
    '.cr-m{font-size:.85rem;margin:6px 0 0;white-space:pre-wrap;word-break:break-word}.cr-m.a{background:#eef3ff;border-radius:10px;padding:8px 10px}.cr-m small{display:block;color:#5d6779;margin-bottom:2px}.cr-act{display:flex;gap:8px;margin-top:8px}.cr-act input{flex:1}';
  document.head.appendChild(st);


  var SL = { open: X('s_open'), answered: X('s_answered'), closed: X('s_closed') };
  function dt(s) { try { return new Date(s).toLocaleString(LOC[(typeof currentLang !== 'undefined' && currentLang) || 'fr'] || 'fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function mountSupport(sec) {
    if (sec.querySelector('.cr-box')) return;
    var box = document.createElement('div'); box.className = 'cr-box';
    box.innerHTML = '<h4>' + X('h_send') + '</h4><p class="muted small" style="margin:0 0 8px">' + X('p_send') + '</p>' +
      '<div class="field"><select id="cr-cat"><option value="paiement">' + X('c_pay') + '</option><option value="commande">' + X('c_order') + '</option><option value="compte">' + X('c_acc') + '</option><option value="technique">' + X('c_tech') + '</option><option value="autre">' + X('c_other') + '</option></select></div>' +
      '<div class="field"><input id="cr-sub" maxlength="90" placeholder="' + esc(X('ph_sub')) + '"></div>' +
      '<div class="field"><textarea id="cr-msg" maxlength="1500" placeholder="' + esc(X('ph_msg')) + '"></textarea></div>' +
      '<button type="button" class="btn btn-primary" id="cr-send">' + X('b_send') + '</button><p class="muted small" id="cr-note" style="margin-top:6px"></p>' +
      '<h4 style="margin-top:16px">' + X('h_mine') + '</h4><div id="cr-list"><p class="muted small">' + X('loading') + '</p></div>';
    sec.appendChild(box);
    var list = box.querySelector('#cr-list'), note = box.querySelector('#cr-note'), send = box.querySelector('#cr-send');
    async function load() {
      try {
        var r = await api('support_mine');
        if (!r.items.length) { list.innerHTML = '<p class="muted small">' + X('none') + '</p>'; return; }
        list.innerHTML = r.items.map(function (t) {
          var rep = (t.replies || []).map(function (m) { return '<div class="cr-m' + (m.from === 'admin' ? ' a' : '') + '"><small>' + (m.from === 'admin' ? X('team') : X('you')) + ' · ' + esc(dt(m.at)) + '</small>' + esc(m.text) + '</div>'; }).join('');
          return '<div class="cr-t" data-id="' + esc(t.id) + '"><div class="h"><b>#' + esc(t.ref) + ' · ' + esc(t.subject) + '</b><span class="cr-s ' + esc(t.status) + '">' + esc(SL[t.status] || t.status) + '</span></div><div class="muted small">' + esc(CATK[t.category] ? X(CATK[t.category]) : t.category) + ' · ' + esc(dt(t.createdAt)) + '</div><div class="cr-m">' + esc(t.message) + '</div>' + rep +
            (t.status === 'closed' ? '' : '<div class="cr-act"><input maxlength="1500" placeholder="' + esc(X('ph_add')) + '"><button type="button" class="btn btn-outline" data-a="send">' + X('b_reply') + '</button><button type="button" class="btn btn-outline" data-a="close">' + X('b_close') + '</button></div>') + '</div>';
        }).join('');
      } catch (e) { list.innerHTML = '<p class="muted small">' + X('login') + '</p>'; }
    }
    send.addEventListener('click', async function () {
      var sub = box.querySelector('#cr-sub').value, msg = box.querySelector('#cr-msg').value; note.textContent = ''; send.disabled = true;
      try {
        var r = await api('support_create', { category: box.querySelector('#cr-cat').value, subject: sub, message: msg });
        box.querySelector('#cr-sub').value = ''; box.querySelector('#cr-msg').value = '';
        note.textContent = X('sent', { ref: r.ref }); toast(X('sent_t'), 'success'); load();
      } catch (e) { note.textContent = RE(e); toast(RE(e), 'error'); }
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
    box.innerHTML = '<h4>' + X('h_data') + '</h4><p class="muted small" style="margin:0 0 8px">' + X('p_data') + '</p><button type="button" class="btn btn-outline" id="cr-exp">' + X('b_data') + '</button><p class="muted small" id="cr-expn" style="margin-top:6px"></p>';
    if (anchor) anchor.parentNode.insertBefore(box, anchor); else sec.appendChild(box);
    var btn = box.querySelector('#cr-exp'), n = box.querySelector('#cr-expn');
    btn.addEventListener('click', async function () {
      btn.disabled = true; n.textContent = X('prep');
      try {
        var r = await api('export_my_data'), blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'mes-donnees-coeurnoh-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        n.textContent = X('done');
      } catch (e) { n.textContent = RE(e); }
      btn.disabled = false;
    });
  }
})();
