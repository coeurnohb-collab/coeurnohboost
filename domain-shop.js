/* Coeurnoh Universe — « Achat Domaine » : le client cherche un nom, voit son prix, paie avec son portefeuille,
   puis retrouve ses domaines dans « Mes domaines » (connecter à son site, détacher, renouveler).
   Chargé à la demande par menu-pro.js (menu, grille des Services). Tout passe par le serveur (/api/render-site,
   actions domain_shop_*) : prix, solde et remboursement sont décidés là-bas, jamais ici. */
(function () {
  'use strict';
  if (window.CNDomainShop) return;

  var D = {
    fr: {
      title: 'Achat Domaine', back: 'Retour',
      intro: 'Achetez ici le nom de votre site ou de votre entreprise. Vous payez avec votre portefeuille, prix pour 1 an, renouvelable.',
      wallet: 'Solde du portefeuille', recharge: 'Recharger',
      ph: 'Ex. monentreprise', search: 'Chercher', hint: 'Lettres, chiffres et tirets. Vous pouvez ajouter une extension : monentreprise.com',
      searching: 'Recherche en cours…', res_for: 'Résultats pour « {0} »', per_year: 'pour 1 an',
      avail: 'Disponible', taken: 'Déjà pris', unsup: 'Non proposé', buy: 'Acheter',
      no_res: 'Aucun nom disponible avec ce mot. Essayez un autre nom.',
      typed_tld: 'L’extension « .{0} » n’est pas proposée ici. Voici celles qui le sont.',
      mine: 'Mes domaines', mine_empty: 'Vous n’avez pas encore de domaine acheté ici.',
      expires: 'Expire le {0}', soon: 'Expire bientôt', expired: 'Expiré',
      s_live: 'En ligne', s_pending: 'Connexion en cours', s_free: 'Pas encore connecté',
      connect: 'Connecter à mon site', disconnect: 'Détacher du site', renew: 'Renouveler 1 an · {0}', open_site: 'Ouvrir le site',
      c_buy: 'Confirmer l’achat', c_renew: 'Confirmer le renouvellement', price_1y: 'Prix pour 1 an', bal_now: 'Solde actuel', bal_after: 'Solde après paiement',
      missing: 'Il vous manque {0} dans le portefeuille.', pay: 'Payer {0}', cancel: 'Annuler', close: 'Fermer',
      notice: 'Le domaine est enregistré au nom de Coeurnoh Universe, qui le gère pour vous. Il fonctionne avec votre site Coeurnoh. Si l’achat n’aboutit pas, vous êtes remboursé automatiquement.',
      c_replace: 'Votre site utilise déjà « {0} ». Il sera remplacé par « {1} ».', c_detach: 'Détacher « {0} » de votre site ? Le domaine reste à vous, vous pourrez le reconnecter.', yes: 'Confirmer',
      ordering: 'Achat de {0} en cours', ordering_sub: 'Cela prend en général quelques minutes. Vous pouvez quitter cet écran, nous vous prévenons.',
      review: 'Vérification de {0} en cours', review_sub: 'Votre paiement est sécurisé. Si l’achat n’aboutit pas, vous êtes remboursé automatiquement.',
      refunded: 'L’achat de {0} n’a pas abouti. Vous avez été remboursé.',
      bought: '{0} est acheté. Vous pouvez le connecter à votre site.', started: 'Achat lancé.', renewed: 'Domaine renouvelé pour 1 an.', connected: 'Domaine connecté à votre site.', detached: 'Domaine détaché de votre site.',
      need_login: 'Connectez-vous pour acheter un domaine.', login: 'Se connecter',
      off: 'L’achat de domaines est momentanément indisponible. Revenez un peu plus tard.',
      need_site: 'Pour connecter ce domaine, créez d’abord votre site.', create_site: 'Créer mon site',
      need_pro: 'Le Pack Pro est nécessaire pour mettre votre site en ligne sur votre propre domaine. Activez-le dans l’application, puis revenez ici.',
      how: 'Comment ça marche', how1: 'Cherchez le nom que vous voulez et choisissez l’extension.', how2: 'Payez avec votre portefeuille : le prix affiché est le prix final.', how3: 'Connectez le domaine à votre site Coeurnoh en un clic (Pack Pro).',
      err: 'Une erreur est survenue. Réessayez.', err_net: 'Pas de connexion. Réessayez.', loading: 'Chargement…'
    },
    en: {
      title: 'Buy a domain', back: 'Back',
      intro: 'Buy the name of your website or business here. You pay with your wallet, price for 1 year, renewable.',
      wallet: 'Wallet balance', recharge: 'Top up',
      ph: 'E.g. mybusiness', search: 'Search', hint: 'Letters, numbers and hyphens. You can add an extension: mybusiness.com',
      searching: 'Searching…', res_for: 'Results for “{0}”', per_year: 'for 1 year',
      avail: 'Available', taken: 'Already taken', unsup: 'Not offered', buy: 'Buy',
      no_res: 'No name is available with this word. Try another name.',
      typed_tld: 'The “.{0}” extension is not offered here. Here are the ones that are.',
      mine: 'My domains', mine_empty: 'You have not bought a domain here yet.',
      expires: 'Expires on {0}', soon: 'Expires soon', expired: 'Expired',
      s_live: 'Online', s_pending: 'Connecting', s_free: 'Not connected yet',
      connect: 'Connect to my site', disconnect: 'Detach from site', renew: 'Renew 1 year · {0}', open_site: 'Open the site',
      c_buy: 'Confirm purchase', c_renew: 'Confirm renewal', price_1y: 'Price for 1 year', bal_now: 'Current balance', bal_after: 'Balance after payment',
      missing: 'You are {0} short in your wallet.', pay: 'Pay {0}', cancel: 'Cancel', close: 'Close',
      notice: 'The domain is registered in the name of Coeurnoh Universe, which manages it for you. It works with your Coeurnoh site. If the purchase fails, you are refunded automatically.',
      c_replace: 'Your site already uses “{0}”. It will be replaced by “{1}”.', c_detach: 'Detach “{0}” from your site? The domain stays yours and you can reconnect it.', yes: 'Confirm',
      ordering: 'Buying {0}…', ordering_sub: 'This usually takes a few minutes. You can leave this screen, we will notify you.',
      review: 'Checking {0}', review_sub: 'Your payment is safe. If the purchase fails, you are refunded automatically.',
      refunded: 'The purchase of {0} did not go through. You have been refunded.',
      bought: '{0} is bought. You can connect it to your site.', started: 'Purchase started.', renewed: 'Domain renewed for 1 year.', connected: 'Domain connected to your site.', detached: 'Domain detached from your site.',
      need_login: 'Log in to buy a domain.', login: 'Log in',
      off: 'Domain purchases are temporarily unavailable. Please come back a little later.',
      need_site: 'To connect this domain, create your site first.', create_site: 'Create my site',
      need_pro: 'The Pro Pack is needed to put your site online on your own domain. Activate it in the app, then come back here.',
      how: 'How it works', how1: 'Search the name you want and pick the extension.', how2: 'Pay with your wallet: the price shown is the final price.', how3: 'Connect the domain to your Coeurnoh site in one tap (Pro Pack).',
      err: 'Something went wrong. Please try again.', err_net: 'No connection. Please try again.', loading: 'Loading…'
    }
  };

  var S = { list: null, res: null, q: '', sheet: null, busy: false, timer: null, prevOpen: false };
  // Le message « achat remboursé » est montré jusqu'à ce que la personne quitte l'écran, puis plus jamais pour cette commande.
  function seen() { try { return localStorage.getItem('cn_ds_seen') || ''; } catch (e) { return ''; } }
  function markSeen() { try { var o = S.list && S.list.order; if (o && o.status === 'refunded') localStorage.setItem('cn_ds_seen', o.at || ''); } catch (e) { /* ignore */ } }
  var scr = null;

  function lang() { try { return typeof currentLang === 'string' ? currentLang : 'fr'; } catch (e) { return 'fr'; } }
  function L(k, a, b) {
    var d = D[lang()] || D.en, s = d[k] != null ? d[k] : (D.fr[k] != null ? D.fr[k] : k);
    return s.replace('{0}', a == null ? '' : a).replace('{1}', b == null ? '' : b);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tr(m) { try { return window.cnT ? window.cnT(m) : m; } catch (e) { return m; } }
  function locale() { var l = lang(); return l === 'fr' ? 'fr-FR' : (l || 'fr'); }
  function money(n) { var v = Math.round((Number(n) || 0) * 100) / 100; try { return v.toLocaleString(locale(), { maximumFractionDigits: 2 }) + ' $'; } catch (e) { return v + ' $'; } }
  function dateOf(iso) { try { return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return String(iso || '').slice(0, 10); } }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }
  function toast(m, type) { try { if (typeof showToast === 'function') showToast(m, type || 'info'); } catch (e) { /* ignore */ } }
  function go(fn) { try { if (typeof window[fn] === 'function') window[fn].apply(null, [].slice.call(arguments, 1)); } catch (e) { /* ignore */ } }
  function ic(path, size) { return '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'; }
  var I = {
    back: '<polyline points="15 18 9 12 15 6"/>', search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>', clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
  };

  /* ---------------- Serveur ---------------- */
  function call(action, body) {
    return new Promise(function (resolve, reject) {
      var a = null; try { a = typeof auth !== 'undefined' ? auth : (window.firebase && window.firebase.auth ? window.firebase.auth() : null); } catch (e) { a = null; }
      if (!a || !a.currentUser) { reject(new Error(L('need_login'))); return; }
      a.currentUser.getIdToken().then(function (t) {
        var b = body || {}; b.action = action;
        return fetch('/api/render-site', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify(b) });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok && j && j.success !== false) { resolve(j); return; }
          var er = new Error(j && j.error ? tr(j.error) : L('err')); er.data = j || {}; er.status = r.status; reject(er);
        });
      }).catch(function (e) { reject(e && e.message ? e : new Error(L('err_net'))); });
    });
  }

  /* ---------------- Écran ---------------- */
  function css() {
    if (document.getElementById('ds-css')) return;
    var st = document.createElement('style'); st.id = 'ds-css';
    st.textContent =
      '#menu-screen-domains .ds-card{background:var(--cream);border:1px solid var(--line);border-radius:14px;padding:14px;margin:0 0 12px}' +
      '#menu-screen-domains .ds-intro{color:var(--muted);font-size:.9rem;line-height:1.45;margin:0 2px 12px}' +
      '#menu-screen-domains .ds-wallet{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
      '#menu-screen-domains .ds-lab{font-size:.78rem;color:var(--muted);display:flex;align-items:center;gap:6px}' +
      '#menu-screen-domains .ds-bal{font-size:1.3rem;font-weight:700;color:var(--ink);margin-top:2px}' +
      '#menu-screen-domains .ds-form{display:flex;gap:8px}' +
      '#menu-screen-domains .ds-input{flex:1;min-width:0;box-sizing:border-box;padding:12px 14px;border:1px solid var(--line-2);border-radius:12px;background:var(--cream);color:var(--ink);font-size:1rem;font-family:inherit}' +
      '#menu-screen-domains .ds-input:focus{outline:2px solid var(--link);outline-offset:1px}' +
      '#menu-screen-domains .ds-hint{font-size:.78rem;color:var(--muted);margin:8px 2px 0}' +
      '#menu-screen-domains .ds-h{font-size:.95rem;font-weight:700;color:var(--ink);margin:4px 2px 10px}' +
      '#menu-screen-domains .ds-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid var(--line)}' +
      '#menu-screen-domains .ds-row:first-of-type{border-top:0}' +
      '#menu-screen-domains .ds-dom{flex:1;min-width:0;word-break:break-all;font-weight:600;color:var(--ink);font-size:.98rem}' +
      '#menu-screen-domains .ds-tld{color:var(--accent-dark)}' +
      '#menu-screen-domains .ds-row.off .ds-dom{color:var(--faint);font-weight:500}' +
      '#menu-screen-domains .ds-row.off .ds-tld{color:var(--faint)}' +
      '#menu-screen-domains .ds-price{font-weight:700;color:var(--ink);white-space:nowrap;text-align:right;line-height:1.15}' +
      '#menu-screen-domains .ds-price small{display:block;font-weight:500;font-size:.7rem;color:var(--muted)}' +
      '#menu-screen-domains .ds-chip{display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}' +
      '#menu-screen-domains .ds-chip.ok{background:var(--tint-green);color:var(--tint-green-ink)}' +
      '#menu-screen-domains .ds-chip.wait{background:var(--tint-amber);color:var(--tint-amber-ink)}' +
      '#menu-screen-domains .ds-chip.no{background:var(--soft-2);color:var(--faint)}' +
      '#menu-screen-domains .ds-chip.bad{background:var(--tint-red);color:var(--tint-red-ink)}' +
      '#menu-screen-domains .ds-banner{display:flex;gap:10px;align-items:flex-start;border-radius:14px;padding:12px 14px;margin:0 0 12px;border:1px solid;font-size:.88rem;line-height:1.4}' +
      '#menu-screen-domains .ds-banner b{display:block;margin-bottom:2px}' +
      '#menu-screen-domains .ds-banner.info{background:var(--tint-blue);border-color:var(--tint-blue-line);color:var(--tint-blue-ink)}' +
      '#menu-screen-domains .ds-banner.wait{background:var(--tint-amber);border-color:var(--tint-amber-line);color:var(--tint-amber-ink)}' +
      '#menu-screen-domains .ds-banner.bad{background:var(--tint-red);border-color:var(--tint-red-line);color:var(--tint-red-ink)}' +
      '#menu-screen-domains .ds-banner svg{flex:none;margin-top:1px}' +
      '#menu-screen-domains .ds-mine{padding:12px 0;border-top:1px solid var(--line)}' +
      '#menu-screen-domains .ds-mine:first-of-type{border-top:0;padding-top:2px}' +
      '#menu-screen-domains .ds-top{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
      '#menu-screen-domains .ds-sub{font-size:.8rem;color:var(--muted);margin-top:4px}' +
      '#menu-screen-domains .ds-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
      '#menu-screen-domains .ds-link{display:inline-flex;align-items:center;gap:5px;color:var(--link);font-size:.85rem;font-weight:600;text-decoration:none;margin-top:6px}' +
      '#menu-screen-domains .ds-how{margin:0;padding-left:18px;color:var(--ink-2);font-size:.86rem;line-height:1.5}' +
      '#menu-screen-domains .ds-empty{color:var(--muted);font-size:.88rem;margin:0}' +
      '#ds-sheet{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-end;justify-content:center;background:rgba(16,24,40,.5)}' +
      '#ds-sheet .ds-box{width:100%;max-width:520px;box-sizing:border-box;background:var(--cream);color:var(--ink);border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:var(--shadow-lg);max-height:88vh;overflow:auto}' +
      '#ds-sheet h3{margin:0 0 4px;font-size:1.1rem;color:var(--ink)}' +
      '#ds-sheet .ds-big{font-size:1.15rem;font-weight:700;word-break:break-all;margin:0 0 12px}' +
      '#ds-sheet .ds-kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:.92rem}' +
      '#ds-sheet .ds-kv span:first-child{color:var(--muted)}' +
      '#ds-sheet .ds-kv b{color:var(--ink)}' +
      '#ds-sheet .ds-note{font-size:.8rem;color:var(--muted);line-height:1.45;margin:12px 0}' +
      '#ds-sheet .ds-warn{font-size:.86rem;color:var(--tint-red-ink);background:var(--tint-red);border:1px solid var(--tint-red-line);border-radius:10px;padding:9px 11px;margin:10px 0}' +
      '#ds-sheet .ds-btns{display:flex;gap:8px;margin-top:12px}' +
      '#ds-sheet .ds-btns .btn{flex:1;justify-content:center}';
    document.head.appendChild(st);
  }

  function ensureScreen() {
    if (scr && document.body.contains(scr)) return scr;
    scr = document.getElementById('menu-screen-domains');
    if (!scr) {
      var host = document.getElementById('menu-screen-site');
      if (!host || !host.parentNode) return null;
      scr = document.createElement('div');
      scr.id = 'menu-screen-domains'; scr.className = 'hidden';
      host.parentNode.appendChild(scr);
    }
    if (!scr.__ds) {
      scr.__ds = true;
      scr.addEventListener('click', onClick);
      scr.addEventListener('submit', function (e) { e.preventDefault(); doSearch(); });
      scr.addEventListener('input', function (e) { if (e.target && e.target.id === 'ds-q') S.q = e.target.value; });
    }
    return scr;
  }
  function isOpen() {
    var modal = document.getElementById('main-menu-modal');
    return !!(scr && !scr.classList.contains('hidden') && (!modal || !modal.classList.contains('hidden')));
  }

  function skeleton() {
    scr.innerHTML =
      '<div class="menu-page-header"><button type="button" class="menu-back-btn" data-ds="back" aria-label="' + esc(L('back')) + '">' + ic(I.back, 20) + '</button><h2>' + esc(L('title')) + '</h2></div>' +
      '<p class="ds-intro">' + esc(L('intro')) + '</p>' +
      '<div id="ds-login"></div>' +
      '<div id="ds-main" class="hidden">' +
        '<div class="ds-card ds-wallet" id="ds-wallet"></div>' +
        '<div id="ds-order"></div>' +
        '<form class="ds-card" id="ds-form" autocomplete="off" novalidate>' +
          '<div class="ds-form"><input id="ds-q" class="ds-input" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="70" placeholder="' + esc(L('ph')) + '" aria-label="' + esc(L('ph')) + '" value="' + esc(S.q) + '">' +
          '<button type="submit" class="btn btn-primary" id="ds-go">' + ic(I.search, 16) + '<span style="margin-left:6px">' + esc(L('search')) + '</span></button></div>' +
          '<p class="ds-hint">' + esc(L('hint')) + '</p>' +
        '</form>' +
        '<div id="ds-results"></div>' +
        '<div class="ds-card" id="ds-mine"></div>' +
        '<div class="ds-card"><div class="ds-h">' + esc(L('how')) + '</div><ol class="ds-how"><li>' + esc(L('how1')) + '</li><li>' + esc(L('how2')) + '</li><li>' + esc(L('how3')) + '</li></ol></div>' +
      '</div>';
  }

  function renderLogin() {
    var el = document.getElementById('ds-login'), main = document.getElementById('ds-main');
    if (!el || !main) return;
    if (me()) { el.innerHTML = ''; main.classList.remove('hidden'); return; }
    main.classList.add('hidden');
    el.innerHTML = '<div class="ds-card"><p class="ds-empty" style="margin-bottom:12px">' + esc(L('need_login')) + '</p><button type="button" class="btn btn-primary" data-ds="login">' + esc(L('login')) + '</button></div>';
  }
  function renderWallet() {
    var el = document.getElementById('ds-wallet'); if (!el) return;
    var bal = S.list ? S.list.balance : (me() ? me().balance : 0);
    el.innerHTML = '<div><div class="ds-lab">' + ic(I.wallet, 14) + esc(L('wallet')) + '</div><div class="ds-bal">' + esc(money(bal)) + '</div></div>' +
      '<button type="button" class="btn btn-outline btn-sm" data-ds="recharge">' + esc(L('recharge')) + '</button>';
  }
  function banner(kind, icon, title, sub) {
    return '<div class="ds-banner ' + kind + '">' + ic(icon, 18) + '<div><b>' + esc(title) + '</b>' + (sub ? esc(sub) : '') + '</div></div>';
  }
  function openOrder(o) { return !!(o && (o.status === 'paid' || o.status === 'purchasing' || o.status === 'review')); }
  function renderOrder() {
    var el = document.getElementById('ds-order'); if (!el) return;
    var l = S.list, o = l && l.order, h = '';
    if (l && !l.enabled && !openOrder(o)) h += banner('wait', I.info, L('off'), '');
    if (o && (o.status === 'paid' || o.status === 'purchasing')) h += banner('info', I.clock, L('ordering', o.domain), L('ordering_sub'));
    else if (o && o.status === 'review') h += banner('wait', I.clock, L('review', o.domain), L('review_sub'));
    else if (o && o.status === 'refunded' && o.kind !== 'renew' && seen() !== (o.at || '') && Date.now() - (Date.parse(o.at) || 0) < 86400000) {
      h += banner('bad', I.info, L('refunded', o.domain), o.error ? tr(o.error) : '');
    }
    el.innerHTML = h;
  }

  function domHtml(d) {
    var i = d.lastIndexOf('.');
    return i < 0 ? esc(d) : esc(d.slice(0, i)) + '<span class="ds-tld">' + esc(d.slice(i)) + '</span>';
  }
  function renderResults() {
    var el = document.getElementById('ds-results'); if (!el) return;
    var r = S.res;
    if (!r) { el.innerHTML = ''; return; }
    if (r.loading) { el.innerHTML = '<div class="ds-card"><p class="ds-empty">' + esc(L('searching')) + '</p></div>'; return; }
    var canBuy = !!(r.enabled !== false), any = false, rows = '';
    r.results.forEach(function (x) {
      if (x.state === 'available') {
        any = true;
        rows += '<div class="ds-row"><div class="ds-dom">' + domHtml(x.domain) + '</div><div class="ds-price">' + esc(money(x.price)) + '<small>' + esc(L('per_year')) + '</small></div>' +
          (canBuy ? '<button type="button" class="btn btn-primary btn-sm" data-ds="buy" data-d="' + esc(x.domain) + '" data-p="' + esc(x.price) + '">' + esc(L('buy')) + '</button>' : '') + '</div>';
      } else {
        rows += '<div class="ds-row off"><div class="ds-dom">' + domHtml(x.domain) + '</div><span class="ds-chip no">' + esc(x.state === 'taken' ? L('taken') : L('unsup')) + '</span></div>';
      }
    });
    el.innerHTML = '<div class="ds-card"><div class="ds-h">' + esc(L('res_for', r.label)) + '</div>' +
      (r.typed ? '<p class="ds-hint" style="margin:0 2px 8px">' + esc(L('typed_tld', r.typed)) + '</p>' : '') +
      (any ? '' : '<p class="ds-empty" style="margin-bottom:8px">' + esc(L('no_res')) + '</p>') + rows + '</div>';
  }

  function renderMine() {
    var el = document.getElementById('ds-mine'); if (!el) return;
    var l = S.list;
    if (!l) { el.innerHTML = '<div class="ds-h">' + esc(L('mine')) + '</div><p class="ds-empty">' + esc(L('loading')) + '</p>'; return; }
    var h = '<div class="ds-h">' + esc(L('mine')) + '</div>';
    if (!l.domains.length) h += '<p class="ds-empty">' + esc(L('mine_empty')) + '</p>';
    l.domains.forEach(function (d) {
      var chip = d.connected ? (d.state === 'live' ? '<span class="ds-chip ok">' + ic(I.check, 12) + esc(L('s_live')) + '</span>' : '<span class="ds-chip wait">' + ic(I.clock, 12) + esc(L('s_pending')) + '</span>') : '<span class="ds-chip no">' + esc(L('s_free')) + '</span>';
      var exp = '';
      if (d.expiresAt) {
        var late = d.daysLeft !== null && d.daysLeft < 0, soon = d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 30;
        exp = '<div class="ds-sub">' + esc(L('expires', dateOf(d.expiresAt))) + (late ? ' · ' + esc(L('expired')) : (soon ? ' · ' + esc(L('soon')) : '')) + '</div>';
      }
      var acts = '';
      acts += d.connected ? '<button type="button" class="btn btn-outline btn-sm" data-ds="detach" data-d="' + esc(d.domain) + '">' + esc(L('disconnect')) + '</button>'
        : '<button type="button" class="btn btn-primary btn-sm" data-ds="connect" data-d="' + esc(d.domain) + '">' + esc(L('connect')) + '</button>';
      if (d.canRenew && d.renewPrice > 0) acts += '<button type="button" class="btn btn-outline btn-sm" data-ds="renew" data-d="' + esc(d.domain) + '" data-p="' + esc(d.renewPrice) + '">' + esc(L('renew', money(d.renewPrice))) + '</button>';
      h += '<div class="ds-mine"><div class="ds-top"><div class="ds-dom">' + domHtml(d.domain) + '</div>' + chip + '</div>' + exp +
        (d.connected && d.state === 'live' ? '<a class="ds-link" href="https://' + esc(d.domain) + '" target="_blank" rel="noopener noreferrer">' + ic(I.ext, 14) + esc(L('open_site')) + '</a>' : '') +
        '<div class="ds-acts">' + acts + '</div></div>';
    });
    el.innerHTML = h;
  }

  /* ---------------- Fenêtre de confirmation ---------------- */
  function closeSheet() { var s = document.getElementById('ds-sheet'); if (s) s.remove(); S.sheet = null; }
  function sheet(html) {
    var s = document.getElementById('ds-sheet');
    if (!s) { s = document.createElement('div'); s.id = 'ds-sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true'); s.addEventListener('click', onClick); document.body.appendChild(s); }
    s.innerHTML = '<div class="ds-box">' + html + '</div>';
  }
  function renderSheet() {
    var sh = S.sheet; if (!sh) { closeSheet(); return; }
    var bal = S.list ? S.list.balance : (me() ? Number(me().balance) || 0 : 0), h = '';
    if (sh.type === 'buy' || sh.type === 'renew') {
      var short = Math.round((sh.price - bal) * 100) / 100;
      h = '<h3>' + esc(L(sh.type === 'buy' ? 'c_buy' : 'c_renew')) + '</h3><p class="ds-big">' + domHtml(sh.domain) + '</p>' +
        '<div class="ds-kv"><span>' + esc(L('price_1y')) + '</span><b>' + esc(money(sh.price)) + '</b></div>' +
        '<div class="ds-kv"><span>' + esc(L('bal_now')) + '</span><b>' + esc(money(bal)) + '</b></div>' +
        (short > 0 ? '' : '<div class="ds-kv"><span>' + esc(L('bal_after')) + '</span><b>' + esc(money(bal - sh.price)) + '</b></div>') +
        (sh.type === 'buy' ? '<p class="ds-note">' + esc(L('notice')) + '</p>' : '') +
        (sh.err ? '<div class="ds-warn">' + esc(sh.err) + '</div>' : '') +
        (short > 0 ? '<div class="ds-warn">' + esc(L('missing', money(short))) + '</div>' : '') +
        '<div class="ds-btns"><button type="button" class="btn btn-outline" data-ds="close">' + esc(L('cancel')) + '</button>' +
        (short > 0 ? '<button type="button" class="btn btn-primary" data-ds="recharge">' + esc(L('recharge')) + '</button>'
          : '<button type="button" class="btn btn-primary" data-ds="pay"' + (S.busy ? ' disabled' : '') + '>' + esc(L('pay', money(sh.price))) + '</button>') + '</div>';
    } else if (sh.type === 'replace' || sh.type === 'detach') {
      h = '<h3>' + esc(L(sh.type === 'replace' ? 'connect' : 'disconnect')) + '</h3><p class="ds-big">' + domHtml(sh.domain) + '</p>' +
        '<p class="ds-note" style="margin-top:0">' + esc(sh.type === 'replace' ? L('c_replace', sh.current, sh.domain) : L('c_detach', sh.domain)) + '</p>' +
        '<div class="ds-btns"><button type="button" class="btn btn-outline" data-ds="close">' + esc(L('cancel')) + '</button><button type="button" class="btn btn-primary" data-ds="' + (sh.type === 'replace' ? 'doconnect' : 'dodetach') + '"' + (S.busy ? ' disabled' : '') + '>' + esc(L('yes')) + '</button></div>';
    } else {
      var nosite = sh.type === 'nosite';
      h = '<h3>' + esc(L('connect')) + '</h3><p class="ds-note" style="margin-top:6px">' + esc(L(nosite ? 'need_site' : 'need_pro')) + '</p>' +
        '<div class="ds-btns"><button type="button" class="btn btn-outline" data-ds="close">' + esc(L('close')) + '</button>' + (nosite ? '<button type="button" class="btn btn-primary" data-ds="mksite">' + esc(L('create_site')) + '</button>' : '') + '</div>';
    }
    sheet(h);
  }

  /* ---------------- Actions ---------------- */
  function syncBalance(b) {
    try { var u = me(); if (u && typeof b === 'number') u.balance = b; var w = document.getElementById('wallet-balance'); if (w && typeof b === 'number') w.textContent = b.toFixed(2) + '$'; } catch (e) { /* ignore */ }
  }
  function renderAll() { renderLogin(); renderWallet(); renderOrder(); renderResults(); renderMine(); }

  function load(quiet) {
    if (!me()) { renderAll(); return Promise.resolve(); }
    return call('domain_shop_list').then(function (r) {
      var was = S.prevOpen;
      S.list = r; syncBalance(r.balance);
      var o = r.order, now = openOrder(o);
      if (was && !now && o && o.status === 'done' && o.kind === 'buy') toast(L('bought', o.domain), 'success');
      S.prevOpen = now;
      renderWallet(); renderOrder(); renderMine();
      if (S.sheet) renderSheet();
      schedule();
    }).catch(function (e) { if (!quiet) toast(e.message || L('err'), 'error'); schedule(); });
  }
  function schedule() {
    clearTimeout(S.timer);
    var l = S.list;
    if (!l || !isOpen()) return;
    var busy = openOrder(l.order) || l.domains.some(function (d) { return d.connected && d.state !== 'live'; });
    if (busy) S.timer = setTimeout(function () { if (isOpen()) load(true); }, 6000);
  }

  function doSearch() {
    var inp = document.getElementById('ds-q'), q = inp ? inp.value.trim() : S.q;
    S.q = q;
    if (!q) { if (inp) inp.focus(); return; }
    S.res = { loading: true }; renderResults();
    call('domain_shop_search', { name: q }).then(function (r) { S.res = r; syncBalance(r.balance); if (S.list) { S.list.balance = r.balance; renderWallet(); } renderResults(); })
      .catch(function (e) { S.res = null; renderResults(); toast(e.message || L('err'), 'error'); });
  }

  function findDomain(d) { var l = S.list; return l ? l.domains.filter(function (x) { return x.domain === d; })[0] : null; }

  function pay() {
    var sh = S.sheet; if (!sh || S.busy) return;
    S.busy = true; sh.err = ''; renderSheet();
    var act = sh.type === 'buy' ? 'domain_shop_buy' : 'domain_shop_renew';
    call(act, { domain: sh.domain, price: sh.price }).then(function (r) {
      S.busy = false; closeSheet();
      toast(sh.type === 'buy' ? L('started') : L('renewed'), 'success');
      if (sh.type === 'buy') S.res = null;
      S.prevOpen = sh.type === 'buy';
      renderResults(); return load(true);
    }).catch(function (e) {
      S.busy = false;
      var d = e.data || {};
      if (d.code === 'price_changed' && d.price > 0) sh.price = d.price;
      sh.err = e.message || L('err');
      if (typeof d.balance === 'number') { syncBalance(d.balance); if (S.list) S.list.balance = d.balance; renderWallet(); }
      if (d.refunded) { closeSheet(); toast(sh.err, 'error'); load(true); return; }
      renderSheet();
    });
  }

  function connectFlow(d) {
    var l = S.list; if (!l) return;
    if (!l.hasSite) { S.sheet = { type: 'nosite' }; renderSheet(); return; }
    if (!l.proOk) { S.sheet = { type: 'nopro' }; renderSheet(); return; }
    if (l.siteDomain && l.siteDomain !== d) { S.sheet = { type: 'replace', domain: d, current: l.siteDomain }; renderSheet(); return; }
    doConnect(d, 'connect');
  }
  function doConnect(d, mode) {
    if (S.busy) return;
    S.busy = true; if (S.sheet) renderSheet();
    call('domain_shop_connect', { domain: d, mode: mode }).then(function () {
      S.busy = false; closeSheet(); toast(L(mode === 'connect' ? 'connected' : 'detached'), 'success'); return load(true);
    }).catch(function (e) { S.busy = false; closeSheet(); toast(e.message || L('err'), 'error'); });
  }

  function onClick(e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.id === 'ds-sheet') { closeSheet(); return; }
    var b = t.closest('[data-ds]'); if (!b) return;
    var a = b.getAttribute('data-ds'), d = b.getAttribute('data-d'), p = Number(b.getAttribute('data-p'));
    if (a === 'back') { clearTimeout(S.timer); markSeen(); go('showMenuScreen', 'items-services'); }
    else if (a === 'login') { go('closeMainMenu'); go('openAuth', 'login'); }
    else if (a === 'recharge') { closeSheet(); go('closeMainMenu'); go('showDashTab', 'wallet'); }
    else if (a === 'buy') { S.sheet = { type: 'buy', domain: d, price: p }; renderSheet(); load(true); }
    else if (a === 'renew') { S.sheet = { type: 'renew', domain: d, price: p }; renderSheet(); }
    else if (a === 'pay') pay();
    else if (a === 'close') closeSheet();
    else if (a === 'connect') connectFlow(d);
    else if (a === 'doconnect') doConnect(S.sheet && S.sheet.domain, 'connect');
    else if (a === 'detach') { if (findDomain(d)) { S.sheet = { type: 'detach', domain: d }; renderSheet(); } }
    else if (a === 'dodetach') doConnect(S.sheet && S.sheet.domain, 'disconnect');
    else if (a === 'mksite') { closeSheet(); go('openSiteBuilderScreen'); }
  }

  function open() {
    css();
    if (!ensureScreen()) return;
    skeleton();
    S.res = null; S.sheet = null; closeSheet();
    go('showMenuScreen', 'domains');
    if (S.list) { renderAll(); } else { renderLogin(); renderWallet(); renderOrder(); renderMine(); }
    markSeen();
    load(false);
    try { var q = document.getElementById('ds-q'); if (q && !q.value && me() && !('ontouchstart' in window)) q.focus(); } catch (e) { /* ignore */ }
  }

  window.CNDomainShop = { open: open, _t: { L: L, money: money, domHtml: domHtml, esc: esc } };
})();
