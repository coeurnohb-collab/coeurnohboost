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
    fr: { ownTitle: "Programme d'affiliation", ownHelp: "Laisse d'autres personnes promouvoir ce contenu. À chaque vente faite avec leur lien, elles gagnent le pourcentage choisi, pris sur ta part. La plateforme garde sa commission habituelle.", ownLabel: "Commission d'affiliation (0 à 40 %)", save: 'Enregistrer', saved: 'Affiliation enregistrée', fail: "Impossible d'enregistrer pour le moment.", bad: 'Choisis un nombre entre 0 et 40.', visTitle: 'Gagne de l\'argent en partageant', visText: 'Reçois {pct} % (environ {amt} $) sur ton solde à chaque vente faite avec ton lien.', copy: 'Copier mon lien', share: 'Partager', copied: 'Lien copié', login: 'Connecte-toi pour obtenir ton lien', shareText: 'Découvre sur Coeurnoh Universe :' },
    en: { ownTitle: 'Affiliate program', ownHelp: 'Let other people promote this content. For each sale made with their link, they earn the percentage you choose, taken from your share. The platform keeps its usual commission.', ownLabel: 'Affiliate commission (0 to 40 %)', save: 'Save', saved: 'Affiliate program saved', fail: 'Could not save right now.', bad: 'Choose a number between 0 and 40.', visTitle: 'Earn money by sharing', visText: 'Get {pct} % (about {amt} $) on your balance for every sale made with your link.', copy: 'Copy my link', share: 'Share', copied: 'Link copied', login: 'Sign in to get your link', shareText: 'Discover on Coeurnoh Universe:' },
    es: { ownTitle: 'Programa de afiliados', ownHelp: 'Deja que otras personas promuevan este contenido. Por cada venta hecha con su enlace, ganan el porcentaje que elijas, tomado de tu parte. La plataforma mantiene su comisión habitual.', ownLabel: 'Comisión de afiliado (0 a 40 %)', save: 'Guardar', saved: 'Programa de afiliados guardado', fail: 'No se pudo guardar ahora.', bad: 'Elige un número entre 0 y 40.', visTitle: 'Gana dinero compartiendo', visText: 'Recibe {pct} % (unos {amt} $) en tu saldo por cada venta hecha con tu enlace.', copy: 'Copiar mi enlace', share: 'Compartir', copied: 'Enlace copiado', login: 'Inicia sesión para obtener tu enlace', shareText: 'Descubre en Coeurnoh Universe:' },
    it: { ownTitle: 'Programma di affiliazione', ownHelp: 'Lascia che altre persone promuovano questo contenuto. Per ogni vendita fatta con il loro link guadagnano la percentuale scelta, presa dalla tua parte. La piattaforma mantiene la sua commissione abituale.', ownLabel: 'Commissione di affiliazione (da 0 a 40 %)', save: 'Salva', saved: 'Affiliazione salvata', fail: 'Impossibile salvare al momento.', bad: 'Scegli un numero tra 0 e 40.', visTitle: 'Guadagna condividendo', visText: 'Ricevi {pct} % (circa {amt} $) sul tuo saldo per ogni vendita fatta con il tuo link.', copy: 'Copia il mio link', share: 'Condividi', copied: 'Link copiato', login: 'Accedi per ottenere il tuo link', shareText: 'Scopri su Coeurnoh Universe:' },
    pt: { ownTitle: 'Programa de afiliados', ownHelp: 'Deixe outras pessoas divulgarem este conteúdo. Em cada venda feita com o link delas, ganham a percentagem escolhida, retirada da sua parte. A plataforma mantém a comissão habitual.', ownLabel: 'Comissão de afiliado (0 a 40 %)', save: 'Guardar', saved: 'Programa de afiliados guardado', fail: 'Não foi possível guardar agora.', bad: 'Escolha um número entre 0 e 40.', visTitle: 'Ganhe dinheiro partilhando', visText: 'Receba {pct} % (cerca de {amt} $) no seu saldo a cada venda feita com o seu link.', copy: 'Copiar o meu link', share: 'Partilhar', copied: 'Link copiado', login: 'Inicie sessão para obter o seu link', shareText: 'Descubra no Coeurnoh Universe:' }
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

  /* ---------- Envoi de l'affilié avec l'achat (le serveur re-vérifie tout) ---------- */
  var origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf('/api/payments-actions') > -1 && init && typeof init.body === 'string') {
          var b = JSON.parse(init.body);
          if (b && (b.action === 'course_enroll' || b.action === 'book_purchase') && !b.aff) {
            var a = getAff(b.courseId || b.bookId);
            if (a) { b.aff = a; init = Object.assign({}, init, { body: JSON.stringify(b) }); }
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

  async function inject(kind, id) {
    var holder = kind === 'course' ? document.getElementById('course-detail-reviews') : document.getElementById('book-detail-reviews');
    if (!holder || !holder.parentNode) return;
    var anchor = holder.parentNode;               // le bloc « Avis »
    if (anchor.parentNode.querySelector('.cn-aff-box')) return;
    var snap = await db.collection(kind === 'course' ? 'courses' : 'academy_books').doc(id).get();
    if (!snap.exists) return;
    var data = snap.data(), u = me();
    var block = buildBlock(kind, id, data, !!(u && u.uid === data.ownerUid));
    if (block && !anchor.parentNode.querySelector('.cn-aff-box')) anchor.parentNode.insertBefore(block, anchor);
  }

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
