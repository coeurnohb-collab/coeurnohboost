/* post-social.js — « Personnes qui ont aimé » (comme sur Facebook) + contact direct.
   Chargé à la demande (script.js : openLikersSheet). Aucune écriture : la liste vient du serveur
   (api/payments-actions.js, action « post_likers »). Chaque ligne permet de voir le profil,
   de suivre la personne et de lui écrire un message (messagerie de l'application).
   Textes en 8 langues (fr, en, es, it, pt, de, sw, ln). Aucun emoji ajouté, aucune couleur nouvelle. */
(function () {
  'use strict';
  if (window.cnPostSocial) return;

  var DICT = {
    fr: { title: 'Personnes qui ont aimé', count: '{n} J’aime', write: 'Écrire', you: 'Toi', empty: 'Personne n’a encore aimé cette publication.', fail: 'Impossible de charger la liste. Réessaie dans un instant.', close: 'Fermer', more: 'et {n} autres personnes', login: 'Connecte-toi pour voir qui a aimé.', user: 'Utilisateur', profile: 'Voir le profil', views: 'vues', retry: 'Réessayer' },
    en: { title: 'People who liked this', count: '{n} likes', write: 'Message', you: 'You', empty: 'Nobody has liked this post yet.', fail: 'Could not load the list. Please try again in a moment.', close: 'Close', more: 'and {n} more people', login: 'Sign in to see who liked this.', user: 'User', profile: 'View profile', views: 'views', retry: 'Try again' },
    es: { title: 'Personas a las que les gustó', count: '{n} Me gusta', write: 'Escribir', you: 'Tú', empty: 'Aún a nadie le ha gustado esta publicación.', fail: 'No se pudo cargar la lista. Inténtalo de nuevo en un momento.', close: 'Cerrar', more: 'y {n} personas más', login: 'Inicia sesión para ver a quién le gustó.', user: 'Usuario', profile: 'Ver perfil', views: 'vistas', retry: 'Reintentar' },
    it: { title: 'Persone a cui è piaciuto', count: '{n} Mi piace', write: 'Scrivi', you: 'Tu', empty: 'A nessuno è ancora piaciuto questo post.', fail: 'Impossibile caricare l’elenco. Riprova tra un attimo.', close: 'Chiudi', more: 'e altre {n} persone', login: 'Accedi per vedere a chi è piaciuto.', user: 'Utente', profile: 'Vedi profilo', views: 'visualizzazioni', retry: 'Riprova' },
    pt: { title: 'Pessoas que gostaram', count: '{n} Gostos', write: 'Escrever', you: 'Você', empty: 'Ninguém gostou desta publicação ainda.', fail: 'Não foi possível carregar a lista. Tente novamente em instantes.', close: 'Fechar', more: 'e mais {n} pessoas', login: 'Entre para ver quem gostou.', user: 'Utilizador', profile: 'Ver perfil', views: 'visualizações', retry: 'Tentar de novo' },
    de: { title: 'Personen, denen das gefällt', count: '{n} Gefällt mir', write: 'Nachricht', you: 'Du', empty: 'Diesen Beitrag hat noch niemand mit „Gefällt mir“ markiert.', fail: 'Die Liste konnte nicht geladen werden. Bitte gleich noch einmal versuchen.', close: 'Schließen', more: 'und {n} weitere Personen', login: 'Melde dich an, um zu sehen, wem das gefällt.', user: 'Nutzer', profile: 'Profil ansehen', views: 'Aufrufe', retry: 'Erneut versuchen' },
    sw: { title: 'Watu waliopenda', count: 'Napenda {n}', write: 'Andika', you: 'Wewe', empty: 'Bado hakuna aliyependa chapisho hili.', fail: 'Imeshindwa kupakia orodha. Jaribu tena baada ya muda mfupi.', close: 'Funga', more: 'na watu wengine {n}', login: 'Ingia ili uone waliopenda.', user: 'Mtumiaji', profile: 'Tazama wasifu', views: 'mitazamo', retry: 'Jaribu tena' },
    ln: { title: 'Bato baye balingi yango', count: 'Nalingi {n}', write: 'Koma', you: 'Yo', empty: 'Moto moko te alingi lisolo oyo naino.', fail: 'Tokoki kolakisa liste te. Meka lisusu na mua ntango.', close: 'Kanga', more: 'mpe bato mosusu {n}', login: 'Kota mpo ya komona baoyo balingi.', user: 'Mosaleli', profile: 'Tala profil', views: 'botali', retry: 'Meka lisusu' }
  };

  function lang() { try { return (typeof currentLang === 'string' && DICT[currentLang]) ? currentLang : 'fr'; } catch (e) { return 'fr'; } }
  function T(k, v) {
    var d = DICT[lang()] || DICT.fr;
    var s = d[k] != null ? d[k] : (DICT.fr[k] != null ? DICT.fr[k] : k);
    if (v) Object.keys(v).forEach(function (x) { s = s.replace('{' + x + '}', v[x]); });
    return s;
  }
  function esc(s) { try { return escapeHtml(String(s == null ? '' : s)); } catch (e) { return String(s == null ? '' : s).replace(/[&<>"']/g, ''); } }
  function me() { try { return currentUser || null; } catch (e) { return null; } }
  function compact(n) { try { return formatCompactCount(Number(n) || 0); } catch (e) { return String(Number(n) || 0); } }
  var X_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var CHAT_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var HEART_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

  function api(pubId) {
    var a = null; try { a = auth; } catch (e) { a = null; }
    if (!a || !a.currentUser) return Promise.reject(new Error('login'));
    return a.currentUser.getIdToken().then(function (idToken) {
      return fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: idToken, action: 'post_likers', pubId: pubId }) });
    }).then(function (r) { return r.json().catch(function () { return null; }); }).then(function (d) {
      if (!d || !d.success) throw new Error((d && d.error) || 'error');
      return d;
    });
  }

  function badge(type) {
    if (!type || type === 'heart') return HEART_SVG;
    try { return reactionIconHtml(type); } catch (e) { return HEART_SVG; }
  }

  function rowHtml(l) {
    var self = me() && l.uid === me().uid;
    var name = l.name || T('user');
    var following = false; try { following = !!(typeof followingSet !== 'undefined' && followingSet.has(l.uid)); } catch (e) { following = false; }
    var av = '';
    try { av = renderAvatarHtml(name, l.photoURL, 46, ''); } catch (e) { av = '<div class="post-avatar" style="width:46px;height:46px">' + esc((name || 'C').charAt(0).toUpperCase()) + '</div>'; }
    var verified = ''; try { verified = l.verified ? ICON_VERIFIED_BADGE : ''; } catch (e) { verified = ''; }
    var acts = self ? '<span class="cnl-you">' + esc(T('you')) + '</span>' :
      '<button type="button" class="follow-btn cnl-follow' + (following ? ' following' : '') + '" data-follow-btn="' + esc(l.uid) + '" data-act="follow"><span data-follow-label="' + esc(l.uid) + '">' + esc(following ? t('btn_following') : t('btn_follow')) + '</span></button>' +
      '<button type="button" class="cnl-msg" data-act="chat" aria-label="' + esc(T('write') + ' ' + name) + '">' + CHAT_SVG + '<span>' + esc(T('write')) + '</span></button>';
    return '<div class="cnl-row" data-uid="' + esc(l.uid) + '" data-name="' + esc(name) + '" data-verified="' + (l.verified ? '1' : '0') + '">' +
      '<button type="button" class="cnl-who" data-act="profile" aria-label="' + esc(T('profile') + ' ' + name) + '">' +
        '<span class="cnl-av">' + av + '<span class="cnl-react">' + badge(l.type) + '</span></span>' +
        '<span class="cnl-name">' + esc(name) + verified + '</span>' +
      '</button>' +
      '<div class="cnl-acts">' + acts + '</div>' +
    '</div>';
  }

  function skeleton() {
    var r = '<div class="cnl-row cnl-sk"><span class="cnl-skc"></span><span class="cnl-skl"></span></div>';
    return r + r + r + r;
  }

  function close() {
    var ov = document.getElementById('cnl-ov');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  }

  function open(pubId) {
    if (!me()) { try { openAuth('register'); } catch (e) { /* ignore */ } return; }
    close();
    var ov = document.createElement('div');
    ov.className = 'action-sheet-overlay cnl-ov';
    ov.id = 'cnl-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', T('title'));
    ov.innerHTML = '<div class="action-sheet cnl-sheet">' +
      '<div class="cnl-grip" aria-hidden="true"></div>' +
      '<div class="cnl-head"><div class="cnl-ht"><strong>' + esc(T('title')) + '</strong><small id="cnl-sub"></small></div>' +
      '<button type="button" class="cnl-x" data-act="close" aria-label="' + esc(T('close')) + '">' + X_SVG + '</button></div>' +
      '<div class="cnl-body" id="cnl-body">' + skeleton() + '</div></div>';
    ov.addEventListener('click', function (e) {
      if (e.target === ov) { close(); return; }
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'close') { close(); return; }
      if (act === 'retry') { load(pubId); return; }
      var row = b.closest('.cnl-row');
      if (!row) return;
      var uid = row.getAttribute('data-uid'), name = row.getAttribute('data-name') || '';
      if (act === 'profile') {
        close();
        try { openProfileModal(uid, name, row.getAttribute('data-verified') === '1'); } catch (er) { /* ignore */ }
      } else if (act === 'chat') {
        close();
        try { if (typeof window.openChatWith === 'function') window.openChatWith(uid, name); } catch (er) { /* ignore */ }
      } else if (act === 'follow') {
        try { toggleFollow(uid, name); } catch (er) { /* ignore */ }
      }
    });
    document.body.appendChild(ov);
    load(pubId);
  }

  function load(pubId) {
    var body = document.getElementById('cnl-body');
    if (body) body.innerHTML = skeleton();
    api(pubId).then(function (d) {
      var b = document.getElementById('cnl-body');
      if (!b) return;
      var sub = document.getElementById('cnl-sub');
      if (sub) sub.textContent = T('count', { n: compact(d.total) });
      if (!d.likers || !d.likers.length) { b.innerHTML = '<p class="cnl-empty">' + esc(T('empty')) + '</p>'; return; }
      var more = d.total > d.shown ? '<p class="cnl-more">' + esc(T('more', { n: compact(d.total - d.shown) })) + '</p>' : '';
      b.innerHTML = d.likers.map(rowHtml).join('') + more;
    }).catch(function (e) {
      var b = document.getElementById('cnl-body');
      if (!b) return;
      var msg = (e && e.message === 'login') ? T('login') : T('fail');
      b.innerHTML = '<div class="cnl-empty"><p>' + esc(msg) + '</p><button type="button" class="btn btn-outline btn-sm" data-act="retry">' + esc(T('retry')) + '</button></div>';
    });
  }

  window.cnPostSocial = { open: open, close: close, T: T, DICT: DICT, rowHtml: rowHtml };
})();
