/* =====================================================================
   academy-pro.js — Académie : programme d'affiliation (Coeurnoh Universe)
   Chargé par stability.js après script.js. N'écrase rien : il enveloppe
   l'ouverture d'un cours et d'un livre pour y ajouter un bloc « Affiliation ».

   - Le vendeur choisit un pourcentage (0 à 40 %), pris sur SA part.
     La plateforme garde toujours sa commission habituelle.
   - Toute personne connectée obtient un lien à partager et gagne ce
     pourcentage à chaque vente réalisée avec son lien.
   - Le calcul et le paiement se font UNIQUEMENT côté serveur
     (api/payments-actions.js) : ce fichier ne déplace jamais d'argent.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnAcademyPro) return;
  window.__cnAcademyPro = true;

  var MAX_PCT = 40;
  var KEY = 'cn_aff_v1';
  var DAY = 86400000;

  var TXT = {
    fr: { ownTitle: "Programme d'affiliation", ownHelp: "Laisse d'autres personnes promouvoir ce contenu. À chaque vente faite avec leur lien, elles gagnent le pourcentage choisi, pris sur ta part. La plateforme garde sa commission habituelle.", ownLabel: "Commission d'affiliation (0 à 40 %)", save: 'Enregistrer', saved: 'Affiliation enregistrée', fail: "Impossible d'enregistrer pour le moment.", bad: 'Choisis un nombre entre 0 et 40.', visTitle: 'Gagne de l\'argent en partageant', visText: 'Reçois {pct} % (environ {amt} $) sur ton solde à chaque vente faite avec ton lien.', copy: 'Copier mon lien', share: 'Partager', copied: 'Lien copié', login: 'Connecte-toi pour obtenir ton lien', shareText: 'Découvre sur Coeurnoh Universe :', promoTitle: 'Code promo', promoPh: 'Ton code', promoApply: 'Appliquer', promoOk: 'Code appliqué : -{pct} %. Prix final {amt} $.', promoRemove: 'Retirer', cpTitle: 'Codes promo', cpHelp: 'Crée des codes de réduction pour ce contenu. La réduction est prise sur ta part.', cpCode: 'Code (ex. BIENVENUE10)', cpPct: 'Réduction %', cpMax: 'Utilisations max (0 = illimité)', cpDays: 'Durée en jours (0 = sans fin)', cpCreate: 'Créer le code', cpNone: 'Aucun code pour le moment.', cpUses: '{n} utilisation(s)', cpDel: 'Supprimer', cpDone: 'Code créé', cpGone: 'Code supprimé', cpFail: 'Action impossible pour le moment.', eaTitle: 'Mes gains de formateur', eaTotal: 'Total gagné', ea30: '30 derniers jours', eaSales: 'Ventes', eaAff: 'Gains d\'affiliation', eaTop: 'Tes meilleurs contenus', eaNone: 'Pas encore de gains. Partage tes contenus pour commencer.', eaNote: 'Basé sur tes 500 dernières opérations.', eaLoad: 'Chargement...' },
    en: { ownTitle: 'Affiliate program', ownHelp: 'Let other people promote this content. For each sale made with their link, they earn the percentage you choose, taken from your share. The platform keeps its usual commission.', ownLabel: 'Affiliate commission (0 to 40 %)', save: 'Save', saved: 'Affiliate program saved', fail: 'Could not save right now.', bad: 'Choose a number between 0 and 40.', visTitle: 'Earn money by sharing', visText: 'Get {pct} % (about {amt} $) on your balance for every sale made with your link.', copy: 'Copy my link', share: 'Share', copied: 'Link copied', login: 'Sign in to get your link', shareText: 'Discover on Coeurnoh Universe:', promoTitle: 'Promo code', promoPh: 'Your code', promoApply: 'Apply', promoOk: 'Code applied: -{pct} %. Final price {amt} $.', promoRemove: 'Remove', cpTitle: 'Promo codes', cpHelp: 'Create discount codes for this content. The discount comes out of your share.', cpCode: 'Code (e.g. WELCOME10)', cpPct: 'Discount %', cpMax: 'Max uses (0 = unlimited)', cpDays: 'Duration in days (0 = no end)', cpCreate: 'Create code', cpNone: 'No codes yet.', cpUses: '{n} use(s)', cpDel: 'Delete', cpDone: 'Code created', cpGone: 'Code deleted', cpFail: 'Could not do this right now.', eaTitle: 'My instructor earnings', eaTotal: 'Total earned', ea30: 'Last 30 days', eaSales: 'Sales', eaAff: 'Affiliate earnings', eaTop: 'Your best content', eaNone: 'No earnings yet. Share your content to get started.', eaNote: 'Based on your last 500 operations.', eaLoad: 'Loading...' },
    es: { ownTitle: 'Programa de afiliados', ownHelp: 'Deja que otras personas promuevan este contenido. Por cada venta hecha con su enlace, ganan el porcentaje que elijas, tomado de tu parte. La plataforma mantiene su comisión habitual.', ownLabel: 'Comisión de afiliado (0 a 40 %)', save: 'Guardar', saved: 'Programa de afiliados guardado', fail: 'No se pudo guardar ahora.', bad: 'Elige un número entre 0 y 40.', visTitle: 'Gana dinero compartiendo', visText: 'Recibe {pct} % (unos {amt} $) en tu saldo por cada venta hecha con tu enlace.', copy: 'Copiar mi enlace', share: 'Compartir', copied: 'Enlace copiado', login: 'Inicia sesión para obtener tu enlace', shareText: 'Descubre en Coeurnoh Universe:', promoTitle: 'Código promocional', promoPh: 'Tu código', promoApply: 'Aplicar', promoOk: 'Código aplicado: -{pct} %. Precio final {amt} $.', promoRemove: 'Quitar', cpTitle: 'Códigos promocionales', cpHelp: 'Crea códigos de descuento para este contenido. El descuento sale de tu parte.', cpCode: 'Código (ej. BIENVENIDO10)', cpPct: 'Descuento %', cpMax: 'Usos máx. (0 = ilimitado)', cpDays: 'Duración en días (0 = sin fin)', cpCreate: 'Crear código', cpNone: 'Aún no hay códigos.', cpUses: '{n} uso(s)', cpDel: 'Eliminar', cpDone: 'Código creado', cpGone: 'Código eliminado', cpFail: 'No se pudo hacer ahora.', eaTitle: 'Mis ganancias como formador', eaTotal: 'Total ganado', ea30: 'Últimos 30 días', eaSales: 'Ventas', eaAff: 'Ganancias de afiliación', eaTop: 'Tus mejores contenidos', eaNone: 'Aún no hay ganancias. Comparte tus contenidos para empezar.', eaNote: 'Basado en tus últimas 500 operaciones.', eaLoad: 'Cargando...' },
    it: { ownTitle: 'Programma di affiliazione', ownHelp: 'Lascia che altre persone promuovano questo contenuto. Per ogni vendita fatta con il loro link guadagnano la percentuale scelta, presa dalla tua parte. La piattaforma mantiene la sua commissione abituale.', ownLabel: 'Commissione di affiliazione (da 0 a 40 %)', save: 'Salva', saved: 'Affiliazione salvata', fail: 'Impossibile salvare al momento.', bad: 'Scegli un numero tra 0 e 40.', visTitle: 'Guadagna condividendo', visText: 'Ricevi {pct} % (circa {amt} $) sul tuo saldo per ogni vendita fatta con il tuo link.', copy: 'Copia il mio link', share: 'Condividi', copied: 'Link copiato', login: 'Accedi per ottenere il tuo link', shareText: 'Scopri su Coeurnoh Universe:', promoTitle: 'Codice promozionale', promoPh: 'Il tuo codice', promoApply: 'Applica', promoOk: 'Codice applicato: -{pct} %. Prezzo finale {amt} $.', promoRemove: 'Rimuovi', cpTitle: 'Codici promozionali', cpHelp: 'Crea codici sconto per questo contenuto. Lo sconto viene preso dalla tua parte.', cpCode: 'Codice (es. BENVENUTO10)', cpPct: 'Sconto %', cpMax: 'Utilizzi max (0 = illimitato)', cpDays: 'Durata in giorni (0 = senza fine)', cpCreate: 'Crea codice', cpNone: 'Nessun codice per ora.', cpUses: '{n} utilizzo/i', cpDel: 'Elimina', cpDone: 'Codice creato', cpGone: 'Codice eliminato', cpFail: 'Impossibile al momento.', eaTitle: 'I miei guadagni da formatore', eaTotal: 'Totale guadagnato', ea30: 'Ultimi 30 giorni', eaSales: 'Vendite', eaAff: 'Guadagni di affiliazione', eaTop: 'I tuoi migliori contenuti', eaNone: 'Ancora nessun guadagno. Condividi i tuoi contenuti per iniziare.', eaNote: 'Basato sulle tue ultime 500 operazioni.', eaLoad: 'Caricamento...' },
    pt: { ownTitle: 'Programa de afiliados', ownHelp: 'Deixe outras pessoas divulgarem este conteúdo. Em cada venda feita com o link delas, ganham a percentagem escolhida, retirada da sua parte. A plataforma mantém a comissão habitual.', ownLabel: 'Comissão de afiliado (0 a 40 %)', save: 'Guardar', saved: 'Programa de afiliados guardado', fail: 'Não foi possível guardar agora.', bad: 'Escolha um número entre 0 e 40.', visTitle: 'Ganhe dinheiro partilhando', visText: 'Receba {pct} % (cerca de {amt} $) no seu saldo a cada venda feita com o seu link.', copy: 'Copiar o meu link', share: 'Partilhar', copied: 'Link copiado', login: 'Inicie sessão para obter o seu link', shareText: 'Descubra no Coeurnoh Universe:', promoTitle: 'Código promocional', promoPh: 'O seu código', promoApply: 'Aplicar', promoOk: 'Código aplicado: -{pct} %. Preço final {amt} $.', promoRemove: 'Remover', cpTitle: 'Códigos promocionais', cpHelp: 'Crie códigos de desconto para este conteúdo. O desconto sai da sua parte.', cpCode: 'Código (ex. BEMVINDO10)', cpPct: 'Desconto %', cpMax: 'Usos máx. (0 = ilimitado)', cpDays: 'Duração em dias (0 = sem fim)', cpCreate: 'Criar código', cpNone: 'Ainda sem códigos.', cpUses: '{n} uso(s)', cpDel: 'Eliminar', cpDone: 'Código criado', cpGone: 'Código eliminado', cpFail: 'Não foi possível agora.', eaTitle: 'Os meus ganhos de formador', eaTotal: 'Total ganho', ea30: 'Últimos 30 dias', eaSales: 'Vendas', eaAff: 'Ganhos de afiliação', eaTop: 'Os seus melhores conteúdos', eaNone: 'Ainda sem ganhos. Partilhe os seus conteúdos para começar.', eaNote: 'Com base nas suas últimas 500 operações.', eaLoad: 'A carregar...' }
  };
  function lang() { try { if (typeof currentLang !== 'undefined' && TXT[currentLang]) return currentLang; } catch (e) { /* ignore */ } return 'fr'; }
  function tx(k, v) { var s = (TXT[lang()] || TXT.fr)[k] || TXT.fr[k] || ''; if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]); return s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, type) { try { if (typeof showToast === 'function') showToast(m, type || 'info'); } catch (e) { /* ignore */ } }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }

  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2"/><path d="M16 12v8M12 16h8"/></svg>';

  /* ---------- Mémoire du lien d'affilié (30 jours, par contenu) ---------- */
  function readMap() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeMap(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* ignore */ } }
  function getAff(id) {
    var m = readMap(), a = m[id];
    if (!a || !a.u || (Date.now() - (a.t || 0)) > 30 * DAY) return null;
    return a.u;
  }
  function setAff(id, uid) {
    if (!/^[A-Za-z0-9]{10,64}$/.test(uid) || !/^[A-Za-z0-9_-]{4,64}$/.test(id)) return;
    var m = readMap(); m[id] = { u: uid, t: Date.now() }; writeMap(m);
  }

  /* ---------- Lien reçu : on mémorise l'affilié et on ouvre le contenu ---------- */
  function handleIncoming() {
    var p; try { p = new URLSearchParams(window.location.search); } catch (e) { return; }
    var acad = p.get('acad'), aff = p.get('aff');
    if (!acad) return;
    var parts = acad.split(':'); var kind = parts[0], id = parts[1];
    if ((kind !== 'course' && kind !== 'book') || !id) return;
    if (aff) setAff(id, aff);
    try { p.delete('acad'); p.delete('aff'); var q = p.toString(); window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : '')); } catch (e) { /* ignore */ }
    var tries = 0;
    (function openLater() {
      var fn = kind === 'course' ? window.openCourseDetail : window.openBookDetail;
      if (typeof fn === 'function') { try { fn(id); } catch (e) { /* ignore */ } return; }
      if (++tries < 20) setTimeout(openLater, 400);
    })();
  }

  var PROMO = {};   // code promo validé, par contenu (en mémoire seulement)

  /* ---------- Envoi de l'affilié et du code promo avec l'achat (le serveur re-vérifie tout) ---------- */
  var origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf('/api/payments-actions') > -1 && init && typeof init.body === 'string') {
          var b = JSON.parse(init.body);
          if (b && (b.action === 'course_enroll' || b.action === 'book_purchase')) {
            var itemId = b.courseId || b.bookId, changed = false;
            var a = !b.aff ? getAff(itemId) : null;
            if (a) { b.aff = a; changed = true; }
            if (!b.coupon && PROMO[itemId]) { b.coupon = PROMO[itemId]; changed = true; }
            if (changed) init = Object.assign({}, init, { body: JSON.stringify(b) });
          }
        }
      } catch (e) { /* on envoie la requête d'origine */ }
      return origFetch.call(this, input, init);
    };
  }

  /* ---------- Bloc « Affiliation » ---------- */
  function linkFor(kind, id) { var u = me(); return window.location.origin + window.location.pathname + '?acad=' + kind + ':' + id + '&aff=' + (u ? u.uid : ''); }

  function buildBlock(kind, id, data, isOwner) {
    var col = kind === 'course' ? 'courses' : 'academy_books';
    var pct = Math.max(0, Math.min(MAX_PCT, Number(data.affiliatePercent) || 0));
    var box = document.createElement('div');
    box.className = 'order-box cn-aff-box';
    box.style.cssText = 'margin:14px 0';
    var head = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-weight:800">' + ICON + '<span>';

    if (isOwner) {
      box.innerHTML = head + esc(tx('ownTitle')) + '</span></div><p class="muted small" style="margin:0 0 10px">' + esc(tx('ownHelp')) +
        '</p><label class="small" style="display:block;margin-bottom:6px">' + esc(tx('ownLabel')) + '</label>' +
        '<div style="display:flex;gap:8px"><input type="number" inputmode="decimal" min="0" max="' + MAX_PCT + '" step="1" value="' + pct + '" class="cn-aff-input" style="flex:1;min-width:0">' +
        '<button type="button" class="btn btn-primary btn-sm cn-aff-save">' + esc(tx('save')) + '</button></div>';
      box.querySelector('.cn-aff-save').addEventListener('click', function () {
        var v = Number(box.querySelector('.cn-aff-input').value);
        if (!isFinite(v) || v < 0 || v > MAX_PCT) { toast(tx('bad'), 'error'); return; }
        v = Math.round(v * 10) / 10;
        db.collection(col).doc(id).update({ affiliatePercent: v }).then(function () { toast(tx('saved'), 'success'); }).catch(function () { toast(tx('fail'), 'error'); });
      });
      return box;
    }

    if (!(pct > 0) || !(Number(data.price) > 0) || data.status === 'closed') return null;
    var amt = (Number(data.price) * pct / 100).toFixed(2);
    var u = me();
    box.innerHTML = head + esc(tx('visTitle')) + '</span></div><p class="muted small" style="margin:0 0 10px">' + esc(tx('visText', { pct: pct, amt: amt })) + '</p>';
    var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px';
    if (!u) {
      row.innerHTML = '<button type="button" class="btn btn-outline btn-sm" style="flex:1;justify-content:center">' + esc(tx('login')) + '</button>';
      row.firstChild.addEventListener('click', function () { try { openAuth('register'); } catch (e) { /* ignore */ } });
    } else {
      row.innerHTML = '<button type="button" class="btn btn-primary btn-sm cn-aff-copy" style="flex:1;justify-content:center">' + esc(tx('copy')) + '</button>' +
        '<button type="button" class="btn btn-outline btn-sm cn-aff-share" style="flex:1;justify-content:center">' + esc(tx('share')) + '</button>';
      row.querySelector('.cn-aff-copy').addEventListener('click', function () {
        var link = linkFor(kind, id);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(tx('copied'), 'success'); }, function () { window.prompt('', link); });
        else window.prompt('', link);
      });
      row.querySelector('.cn-aff-share').addEventListener('click', function () {
        var link = linkFor(kind, id);
        if (navigator.share) navigator.share({ title: data.title || 'Coeurnoh Universe', text: tx('shareText'), url: link }).catch(function () { /* annulé */ });
        else if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast(tx('copied'), 'success'); });
      });
    }
    box.appendChild(row);
    return box;
  }

  /* ---------- Appel serveur des codes promo ---------- */
  async function couponCall(payload) {
    var u = auth.currentUser;
    if (!u) throw new Error('login');
    var token = await u.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: token, action: 'academy_coupon' }, payload)) });
    var j = await r.json();
    if (!j.success) throw new Error(j.error || tx('cpFail'));
    return j;
  }

  /* ---------- Acheteur : champ « Code promo » ---------- */
  function buildPromoBox(kind, id) {
    var box = document.createElement('div');
    box.className = 'order-box cn-promo-box';
    box.style.cssText = 'margin:14px 0';
    box.innerHTML = '<div style="font-weight:800;margin-bottom:8px">' + esc(tx('promoTitle')) + '</div>' +
      '<div style="display:flex;gap:8px"><input type="text" maxlength="20" autocapitalize="characters" autocomplete="off" placeholder="' + esc(tx('promoPh')) + '" class="cn-promo-input" style="flex:1;min-width:0;text-transform:uppercase">' +
      '<button type="button" class="btn btn-outline btn-sm cn-promo-apply">' + esc(tx('promoApply')) + '</button></div>' +
      '<p class="small cn-promo-msg" style="margin:8px 0 0"></p>';
    var input = box.querySelector('.cn-promo-input'), msg = box.querySelector('.cn-promo-msg'), btn = box.querySelector('.cn-promo-apply');
    if (PROMO[id]) { input.value = PROMO[id]; }
    btn.addEventListener('click', async function () {
      if (PROMO[id]) { delete PROMO[id]; input.value = ''; msg.textContent = ''; btn.textContent = tx('promoApply'); return; }
      var code = input.value.trim();
      if (!code) return;
      btn.disabled = true;
      try {
        var r = await couponCall({ op: 'check', kind: kind, itemId: id, code: code });
        PROMO[id] = code.toUpperCase();
        msg.style.color = '#15803d'; msg.textContent = tx('promoOk', { pct: r.percent, amt: Number(r.finalPrice).toFixed(2) });
        btn.textContent = tx('promoRemove');
      } catch (e) {
        msg.style.color = '#b91c1c'; msg.textContent = (e && e.message && e.message !== 'login') ? e.message : tx('cpFail');
      }
      btn.disabled = false;
    });
    return box;
  }

  /* ---------- Vendeur : gestion des codes promo ---------- */
  function buildCouponManager(kind, id) {
    var box = document.createElement('div');
    box.className = 'order-box cn-coupon-box';
    box.style.cssText = 'margin:14px 0';
    box.innerHTML = '<div style="font-weight:800;margin-bottom:4px">' + esc(tx('cpTitle')) + '</div><p class="muted small" style="margin:0 0 10px">' + esc(tx('cpHelp')) + '</p>' +
      '<div class="cn-cp-list" style="margin-bottom:10px"></div>' +
      '<div style="display:grid;gap:8px">' +
      '<input type="text" maxlength="20" autocapitalize="characters" autocomplete="off" placeholder="' + esc(tx('cpCode')) + '" class="cn-cp-code" style="text-transform:uppercase">' +
      '<div style="display:flex;gap:8px"><input type="number" inputmode="numeric" min="1" max="90" placeholder="' + esc(tx('cpPct')) + '" class="cn-cp-pct" style="flex:1;min-width:0"><input type="number" inputmode="numeric" min="0" placeholder="' + esc(tx('cpMax')) + '" class="cn-cp-max" style="flex:1;min-width:0"></div>' +
      '<input type="number" inputmode="numeric" min="0" max="365" placeholder="' + esc(tx('cpDays')) + '" class="cn-cp-days">' +
      '<button type="button" class="btn btn-primary btn-sm cn-cp-create" style="justify-content:center">' + esc(tx('cpCreate')) + '</button></div>';
    var listEl = box.querySelector('.cn-cp-list');

    function draw(items) {
      listEl.innerHTML = '';
      if (!items.length) { listEl.innerHTML = '<p class="muted small" style="margin:0">' + esc(tx('cpNone')) + '</p>'; return; }
      items.forEach(function (c) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid rgba(15,23,42,.08)';
        var info = document.createElement('div');
        info.innerHTML = '<b></b> <span class="muted small"></span>';
        info.firstChild.textContent = c.code + ' · -' + c.percent + ' %';
        info.lastChild.textContent = tx('cpUses', { n: c.uses + (c.maxUses ? '/' + c.maxUses : '') });
        var del = document.createElement('button');
        del.type = 'button'; del.className = 'btn btn-outline btn-sm'; del.textContent = tx('cpDel');
        del.addEventListener('click', async function () {
          del.disabled = true;
          try { await couponCall({ op: 'delete', kind: kind, itemId: id, code: c.code }); toast(tx('cpGone'), 'success'); refresh(); }
          catch (e) { toast((e && e.message) || tx('cpFail'), 'error'); del.disabled = false; }
        });
        row.appendChild(info); row.appendChild(del); listEl.appendChild(row);
      });
    }
    async function refresh() {
      try { var r = await couponCall({ op: 'list', kind: kind, itemId: id }); draw(r.coupons || []); }
      catch (e) { listEl.innerHTML = ''; }
    }
    box.querySelector('.cn-cp-create').addEventListener('click', async function () {
      var btn = this; btn.disabled = true;
      try {
        await couponCall({ op: 'create', kind: kind, itemId: id, code: box.querySelector('.cn-cp-code').value, percent: box.querySelector('.cn-cp-pct').value, maxUses: box.querySelector('.cn-cp-max').value, expiresInDays: box.querySelector('.cn-cp-days').value });
        toast(tx('cpDone'), 'success');
        ['.cn-cp-code', '.cn-cp-pct', '.cn-cp-max', '.cn-cp-days'].forEach(function (q) { box.querySelector(q).value = ''; });
        refresh();
      } catch (e) { toast((e && e.message && e.message !== 'login') ? e.message : tx('cpFail'), 'error'); }
      btn.disabled = false;
    });
    refresh();
    return box;
  }

  async function inject(kind, id) {
    var holder = kind === 'course' ? document.getElementById('course-detail-reviews') : document.getElementById('book-detail-reviews');
    if (!holder || !holder.parentNode) return;
    var anchor = holder.parentNode;               // le bloc « Avis »
    var host = anchor.parentNode;
    if (host.querySelector('.cn-aff-box, .cn-promo-box, .cn-coupon-box')) return;
    var snap = await db.collection(kind === 'course' ? 'courses' : 'academy_books').doc(id).get();
    if (!snap.exists) return;
    var data = snap.data(), u = me();
    var isOwner = !!(u && u.uid === data.ownerUid);
    var blocks = [];
    if (!isOwner && u && Number(data.price) > 0 && data.status !== 'closed') {
      // pas de champ « code promo » si la personne a déjà le contenu
      var owned = false;
      try { owned = (await db.collection(kind === 'course' ? 'course_enrollments' : 'book_purchases').doc(id + '_' + u.uid).get()).exists; } catch (e) { /* on affiche quand même */ }
      if (!owned) blocks.push(buildPromoBox(kind, id));
    }
    blocks.push(buildBlock(kind, id, data, isOwner));
    if (isOwner && Number(data.price) > 0) blocks.push(buildCouponManager(kind, id));
    if (host.querySelector('.cn-aff-box, .cn-promo-box, .cn-coupon-box')) return;
    blocks.forEach(function (b) { if (b) host.insertBefore(b, anchor); });
  }

  /* ---------- Tableau de gains du formateur (onglet « Mon enseignement ») ---------- */
  var earnBusy = false;
  async function renderEarnings() {
    var tab = document.getElementById('academy-tab-myteaching');
    var u = me();
    if (!tab || !u || earnBusy) return;
    var box = tab.querySelector('.cn-earn-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'order-box cn-earn-box';
      box.style.cssText = 'margin-bottom:14px';
      tab.insertBefore(box, tab.firstChild);
    }
    earnBusy = true;
    box.innerHTML = '<div style="font-weight:800;margin-bottom:8px">' + esc(tx('eaTitle')) + '</div><p class="muted small" style="margin:0">' + esc(tx('eaLoad')) + '</p>';
    try {
      var snap = await db.collection('wallet_transactions').where('uid', '==', u.uid).orderBy('createdAt', 'desc').limit(500).get();
      var total = 0, last30 = 0, sales = 0, aff = 0, byItem = {};
      var since = Date.now() - 30 * DAY;
      snap.forEach(function (d) {
        var t = d.data();
        if ((t.type !== 'course_income' && t.type !== 'book_income') || !(t.amount > 0)) return;
        var isAff = String(t.description || '').indexOf('Commission d\'affiliation') === 0;
        total += t.amount;
        if (new Date(t.createdAt).getTime() >= since) last30 += t.amount;
        if (isAff) { aff += t.amount; return; }
        sales += 1;
        var k = t.relatedId || t.description;
        if (!byItem[k]) byItem[k] = { name: String(t.description || ''), sum: 0, n: 0 };
        byItem[k].sum += t.amount; byItem[k].n += 1;
      });
      if (total <= 0) { box.innerHTML = '<div style="font-weight:800;margin-bottom:8px">' + esc(tx('eaTitle')) + '</div><p class="muted small" style="margin:0">' + esc(tx('eaNone')) + '</p>'; earnBusy = false; return; }
      function tile(label, value) { return '<div style="flex:1 1 45%;min-width:130px;padding:12px;border-radius:14px;background:rgba(37,99,235,.07)"><div class="muted small">' + esc(label) + '</div><div style="font-size:1.25rem;font-weight:800">' + esc(value) + '</div></div>'; }
      var top = Object.keys(byItem).map(function (k) { return byItem[k]; }).sort(function (a, b) { return b.sum - a.sum; }).slice(0, 5);
      var html = '<div style="font-weight:800;margin-bottom:10px">' + esc(tx('eaTitle')) + '</div><div style="display:flex;flex-wrap:wrap;gap:10px">' +
        tile(tx('eaTotal'), total.toFixed(2) + ' $') + tile(tx('ea30'), last30.toFixed(2) + ' $') + tile(tx('eaSales'), String(sales)) + tile(tx('eaAff'), aff.toFixed(2) + ' $') + '</div>';
      if (top.length) {
        html += '<div style="font-weight:700;margin:14px 0 6px">' + esc(tx('eaTop')) + '</div>';
        top.forEach(function (t) { html += '<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid rgba(15,23,42,.08)"><span class="small" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.name) + '</span><b class="small">' + t.sum.toFixed(2) + ' $</b></div>'; });
      }
      html += '<p class="muted small" style="margin:10px 0 0">' + esc(tx('eaNote')) + '</p>';
      box.innerHTML = html;
    } catch (e) { box.innerHTML = ''; }
    earnBusy = false;
  }
  (function () {
    var origTab = window.setAcademyTab;
    if (typeof origTab !== 'function') return;
    window.setAcademyTab = function (tab) {
      var r = origTab.apply(this, arguments);
      if (tab === 'myteaching') { try { renderEarnings(); } catch (e) { /* ignore */ } }
      return r;
    };
  })();

  function wrap(name, kind) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = async function (id) {
      var r = await orig.apply(this, arguments);
      try { await inject(kind, id); } catch (e) { /* le bloc est un plus : jamais bloquant */ }
      return r;
    };
  }
  wrap('openCourseDetail', 'course');
  wrap('openBookDetail', 'book');
  handleIncoming();
})();
