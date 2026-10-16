/* referral-pro.js — Parrainage professionnel : carte d'accueil, statistiques (filleuls, gains, niveau), lien avec partage complet,
   messages élégants prêts à envoyer, explication en 3 étapes et historique des bonus reçus.
   Ne change aucune règle de gain (5 % sur les recharges des filleuls). Lit uniquement des données déjà lisibles par le parrain
   (public_profiles.referredBy, wallet_transactions du compte). Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnReferralPro) return; window.__cnReferralPro = true;
  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, ty) { try { showToast(m, ty || 'info'); } catch (e) { } }
  function me() { try { return currentUser || null; } catch (e) { return null; } }
  var TX = {
    fr: {
      kicker: 'Programme de parrainage', h: 'Invite tes amis. Gagne 5 % sur chacune de leurs recharges.', s: 'Chaque personne qui s’inscrit avec ton lien et recharge son portefeuille te rapporte une commission, sans limite de durée ni de nombre.',
      f: 'Filleuls', g: 'Gains reçus', lv: 'Niveau', link: 'Ton lien personnel', copy: 'Copier', copied: 'Lien copié', share: 'Partager mon lien', next: 'Prochain niveau', to: 'filleul(s) pour atteindre', top: 'Niveau maximum atteint',
      msgH: 'Messages prêts à envoyer', msgS: 'Touche un message pour l’envoyer ou le copier avec ton lien.', send: 'Envoyer', copyMsg: 'Copier le message', close: 'Fermer',
      howH: 'Comment ça marche', how: [['Partage ton lien', 'Envoie-le à tes amis, ta famille, tes clients ou publie-le sur tes réseaux.'], ['Ton ami s’inscrit', 'Il crée son compte avec ton lien et découvre tous les services de Coeurnoh Universe.'], ['Tu es récompensé', 'À chaque recharge de ton filleul, 5 % arrivent dans ton portefeuille automatiquement.']],
      histH: 'Derniers bonus reçus', histEmpty: 'Aucun bonus pour l’instant. Partage ton lien pour commencer.', lvNames: ['Débutant', 'Bronze', 'Argent', 'Or', 'Platine'], note: 'Les niveaux récompensent ton engagement d’ambassadeur. Le taux de commission reste de 5 %.',
      m1: 'Bonjour ! J’utilise Coeurnoh Universe pour développer mes réseaux sociaux, vendre, trouver du travail et me former, le tout au même endroit. Rejoins-moi avec mon lien :',
      m2: 'Tu veux booster ton activité en ligne ? Coeurnoh Universe réunit boutique, emploi, immobilier, formation et bien plus. Inscris-toi gratuitement ici :',
      m3: 'Une invitation à découvrir Coeurnoh Universe, la plateforme qui simplifie ta vie numérique en RDC et ailleurs. Crée ton compte avec mon lien :', mt: ['Invitation personnelle', 'Pour les entrepreneurs', 'Invitation courte'], shareTitle: 'Rejoins Coeurnoh Universe', shareMeta: 'Invitation de ' },
    en: {
      kicker: 'Referral programme', h: 'Invite your friends. Earn 5% on every top-up they make.', s: 'Everyone who signs up with your link and tops up their wallet earns you a commission, with no time or number limit.',
      f: 'Referrals', g: 'Earnings', lv: 'Level', link: 'Your personal link', copy: 'Copy', copied: 'Link copied', share: 'Share my link', next: 'Next level', to: 'referral(s) to reach', top: 'Top level reached',
      msgH: 'Ready-to-send messages', msgS: 'Tap a message to send or copy it with your link.', send: 'Send', copyMsg: 'Copy message', close: 'Close',
      howH: 'How it works', how: [['Share your link', 'Send it to friends, family and customers, or post it on your networks.'], ['Your friend signs up', 'They create an account with your link and discover every Coeurnoh Universe service.'], ['You get rewarded', 'On each top-up by your referral, 5% lands in your wallet automatically.']],
      histH: 'Latest bonuses received', histEmpty: 'No bonus yet. Share your link to get started.', lvNames: ['Starter', 'Bronze', 'Silver', 'Gold', 'Platinum'], note: 'Levels recognise your ambassador activity. The commission rate stays at 5%.',
      m1: 'Hi! I use Coeurnoh Universe to grow my social media, sell, find work and learn, all in one place. Join me with my link:',
      m2: 'Want to boost your online business? Coeurnoh Universe brings together shop, jobs, real estate, courses and more. Sign up for free here:',
      m3: 'An invitation to discover Coeurnoh Universe, the platform that simplifies your digital life. Create your account with my link:', mt: ['Personal invitation', 'For entrepreneurs', 'Short invitation'], shareTitle: 'Join Coeurnoh Universe', shareMeta: 'Invitation from ' }
  };
  function tx() { return TX[lang()]; }
  var LEVELS = [0, 1, 5, 20, 50];
  var state = { count: null, earned: null, hist: null, loaded: false };

  function url() { var u = me(); return u ? location.origin + location.pathname + '?ref=' + encodeURIComponent(u.uid) : ''; }
  function money(n) { n = Number(n) || 0; return n.toLocaleString(lang() === 'en' ? 'en-US' : 'fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' $'; }
  function levelOf(c) { var l = 0; for (var i = 0; i < LEVELS.length; i++) if (c >= LEVELS[i]) l = i; return l; }

  function load() {
    var u = me(); if (!u || state.loading) return; state.loading = true;
    try {
      db.collection('public_profiles').where('referredBy', '==', u.uid).limit(500).get().then(function (s) { state.count = s.size; paint(); }).catch(function () { state.count = state.count || 0; paint(); });
    } catch (e) { state.count = 0; }
    try {
      db.collection('wallet_transactions').where('uid', '==', u.uid).orderBy('createdAt', 'desc').limit(200).get().then(function (s) {
        var tot = 0, hist = [];
        s.docs.forEach(function (d) { var x = d.data(); if (x && x.type === 'referral_bonus') { tot += Number(x.amount) || 0; if (hist.length < 5) hist.push(x); } });
        state.earned = tot; state.hist = hist; paint();
      }).catch(function () { state.earned = 0; state.hist = []; paint(); });
    } catch (e) { state.earned = 0; state.hist = []; }
    state.loaded = true;
  }

  function html() {
    var t = tx(), c = state.count == null ? 0 : state.count, lv = levelOf(c), nxt = LEVELS[lv + 1];
    var pct = nxt ? Math.min(100, Math.round(((c - LEVELS[lv]) / (nxt - LEVELS[lv])) * 100)) : 100;
    var link = url();
    var hist = state.hist == null ? '' : (state.hist.length ? state.hist.map(function (h) {
      var d = ''; try { d = new Date(h.createdAt).toLocaleDateString(lang() === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { }
      return '<div class="rp-h"><span>' + esc(d) + '</span><b>+' + esc(money(h.amount)) + '</b></div>';
    }).join('') : '<p class="rp-empty">' + esc(t.histEmpty) + '</p>');
    return '<section class="rp" data-rp="1">' +
      '<div class="rp-hero"><span class="rp-k">' + esc(t.kicker) + '</span><h2>' + esc(t.h) + '</h2><p>' + esc(t.s) + '</p>' +
      '<div class="rp-stats"><div><b>' + (state.count == null ? '…' : c) + '</b><span>' + esc(t.f) + '</span></div><div><b>' + (state.earned == null ? '…' : esc(money(state.earned))) + '</b><span>' + esc(t.g) + '</span></div><div><b>' + esc(t.lvNames[lv]) + '</b><span>' + esc(t.lv) + '</span></div></div></div>' +
      '<div class="rp-card"><label>' + esc(t.link) + '</label><div class="rp-link"><span>' + esc(link) + '</span><button type="button" data-rp="copy">' + esc(t.copy) + '</button></div>' +
      '<button type="button" class="rp-main" data-rp="share">' + esc(t.share) + '</button>' +
      '<div class="rp-prog"><div class="rp-bar"><i style="width:' + pct + '%"></i></div><small>' + (nxt ? esc(t.next) + ' : ' + esc(t.lvNames[lv + 1]) + ' (' + Math.max(0, nxt - c) + ' ' + esc(t.to) + ' ' + esc(t.lvNames[lv + 1]) + ')' : esc(t.top)) + '</small></div></div>' +
      '<div class="rp-card"><h3>' + esc(t.msgH) + '</h3><p class="rp-sub">' + esc(t.msgS) + '</p>' + [1, 2, 3].map(function (i) { return '<button type="button" class="rp-msg" data-rp="msg" data-i="' + i + '"><b>' + esc(t.mt[i - 1]) + '</b><span>' + esc(t['m' + i]) + '</span></button>'; }).join('') + '</div>' +
      '<div class="rp-card"><h3>' + esc(t.howH) + '</h3><ol class="rp-how">' + t.how.map(function (h, i) { return '<li><i>' + (i + 1) + '</i><div><b>' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></div></li>'; }).join('') + '</ol></div>' +
      '<div class="rp-card"><h3>' + esc(t.histH) + '</h3>' + hist + '<p class="rp-note">' + esc(t.note) + '</p></div></section>';
  }
  function paint() {
    var box = document.getElementById('section-referral'); if (!box) return;
    var cur = box.querySelector('[data-rp="1"]');
    var h = html();
    if (cur) { var tmp = document.createElement('div'); tmp.innerHTML = h; cur.replaceWith(tmp.firstChild); }
    else {
      Array.prototype.forEach.call(box.children, function (el) { if (!el.hasAttribute('data-rp')) el.classList.add('rp-old'); });
      box.insertAdjacentHTML('afterbegin', h);
    }
  }
  function ensure() {
    var box = document.getElementById('section-referral'); if (!box || !me()) return;
    if (!box.querySelector('[data-rp="1"]')) { paint(); if (!state.loaded) load(); }
  }

  function sendMsg(i, mode) {
    var t = tx(), text = t['m' + i] + ' ' + url();
    if (mode === 'copy') { try { navigator.clipboard.writeText(text).then(function () { toast(t.copied, 'success'); }); } catch (e) { prompt('', text); } return; }
    if (window.CNShare) { window.CNShare.open({ kind: 'profile', id: me().uid, url: url(), title: t.shareTitle, meta: [t.shareMeta + ((me().username || me().name) || '')], text: text }); return; }
    if (navigator.share) navigator.share({ text: text }).catch(function () { }); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0 || !t0.closest) return;
    var a = t0.closest('[data-rp]'); if (!a || a.getAttribute('data-rp') === '1' || !me()) return;
    var act = a.getAttribute('data-rp');
    if (act === 'copy') { try { navigator.clipboard.writeText(url()).then(function () { toast(tx().copied, 'success'); }); } catch (e) { prompt('', url()); } }
    else if (act === 'share') { if (window.CNShare) window.CNShare.open({ kind: 'profile', id: me().uid, url: url(), title: tx().shareTitle, meta: [tx().shareMeta + ((me().username || me().name) || '')], text: tx().m1 }); else if (navigator.share) navigator.share({ title: tx().shareTitle, text: tx().m1, url: url() }).catch(function () { }); }
    else if (act === 'msg') {
      var i = a.getAttribute('data-i');
      var sheet = document.createElement('div'); sheet.className = 'rp-sheet';
      sheet.innerHTML = '<div class="rp-back" data-rp="x"></div><div class="rp-box"><p>' + esc(tx()['m' + i] + ' ' + url()) + '</p><button type="button" class="rp-main" data-rp="send" data-i="' + i + '">' + esc(tx().send) + '</button><button type="button" data-rp="cpy" data-i="' + i + '">' + esc(tx().copyMsg) + '</button><button type="button" data-rp="x">' + esc(tx().close) + '</button></div>';
      document.body.appendChild(sheet);
    } else if (act === 'x') { var s = document.querySelector('.rp-sheet'); if (s) s.remove(); }
    else if (act === 'send') { var s2 = document.querySelector('.rp-sheet'); if (s2) s2.remove(); sendMsg(a.getAttribute('data-i'), 'send'); }
    else if (act === 'cpy') { var s3 = document.querySelector('.rp-sheet'); if (s3) s3.remove(); sendMsg(a.getAttribute('data-i'), 'copy'); }
  }, true);
  var tm = null;
  try { new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(ensure, 150); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
  setTimeout(ensure, 700);
  var css = [
    '.rp-old{display:none!important}',
    '.rp{font-family:var(--cnh-font,system-ui,sans-serif);color:var(--cnh-ink,#111827);display:flex;flex-direction:column;gap:14px}.rp *{box-sizing:border-box}',
    '.rp-hero{background:#14263f;color:#fff;border-radius:20px;padding:22px 18px}.rp-k{display:inline-block;font-size:.6875rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:rgba(255,255,255,.14);border-radius:999px;padding:5px 11px}',
    '.rp-hero h2{margin:12px 0 8px;font-size:1.375rem;line-height:1.25;letter-spacing:-.01em}.rp-hero p{margin:0 0 16px;font-size:.875rem;line-height:1.55;opacity:.85}',
    '.rp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rp-stats div{background:rgba(255,255,255,.1);border-radius:14px;padding:12px 8px;text-align:center}.rp-stats b{display:block;font-size:1.0625rem}.rp-stats span{font-size:.6875rem;opacity:.75}',
    '.rp-card{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:18px;padding:16px}.rp-card h3{margin:0 0 4px;font-size:1rem}.rp-card label{display:block;font-size:.75rem;font-weight:700;color:var(--cnh-sub,#5a6577);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em}',
    '.rp-link{display:flex;align-items:center;gap:8px;background:var(--cnh-soft,#eef3f9);border-radius:12px;padding:6px 6px 6px 12px;margin-bottom:10px}.rp-link span{flex:1;min-width:0;font-size:.8125rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cnh-sub,#5a6577)}',
    '.rp-link button,.rp-box button{min-height:40px;padding:0 16px;border-radius:10px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:inherit;font:inherit;font-weight:700;font-size:.8125rem;cursor:pointer}',
    'button.rp-main{width:100%;min-height:50px;border-radius:14px;border:0;background:var(--cnh-brand,#1d4f91);color:#fff;font:inherit;font-weight:700;font-size:.9375rem;cursor:pointer}html[data-theme="dark"] button.rp-main{color:#0b1220}',
    '.rp-prog{margin-top:14px}.rp-bar{height:8px;border-radius:99px;background:var(--cnh-soft,#eef3f9);overflow:hidden}.rp-bar i{display:block;height:100%;background:var(--cnh-brand,#1d4f91);border-radius:99px}.rp-prog small{display:block;margin-top:6px;font-size:.75rem;color:var(--cnh-sub,#5a6577)}',
    '.rp-sub{margin:0 0 10px;font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.rp-msg{display:block;width:100%;text-align:left;background:var(--cnh-soft,#eef3f9);border:0;border-radius:12px;padding:12px 14px;margin-top:8px;color:inherit;font:inherit;cursor:pointer}.rp-msg b{display:block;font-size:.8125rem;margin-bottom:4px}.rp-msg span{display:block;font-size:.8125rem;line-height:1.5;color:var(--cnh-sub,#5a6577)}',
    '.rp-how{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}.rp-how li{display:flex;gap:12px;align-items:flex-start}.rp-how i{flex:0 0 30px;height:30px;border-radius:50%;background:var(--cnh-brand,#1d4f91);color:#fff;font-style:normal;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.875rem}.rp-how b{display:block;font-size:.9375rem}.rp-how span{display:block;font-size:.8125rem;color:var(--cnh-sub,#5a6577);line-height:1.5}',
    '.rp-h{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--cnh-line,#e1e6ed);font-size:.875rem}.rp-h b{color:#1a7f4b}.rp-empty{font-size:.8125rem;color:var(--cnh-sub,#5a6577);margin:8px 0}.rp-note{margin:12px 0 0;font-size:.75rem;color:var(--cnh-sub,#5a6577)}',
    '.rp-sheet{position:fixed;inset:0;z-index:2300;display:flex;align-items:flex-end;justify-content:center;font-family:var(--cnh-font,system-ui,sans-serif)}.rp-back{position:absolute;inset:0;background:rgba(10,20,35,.55)}',
    '.rp-box{position:relative;width:100%;max-width:480px;background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);border-radius:20px 20px 0 0;padding:18px 16px max(16px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px}.rp-box p{margin:0 0 4px;font-size:.9375rem;line-height:1.55;word-break:break-word}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
