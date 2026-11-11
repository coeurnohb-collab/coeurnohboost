/* site-give.js — Coeurnoh Universe : « Donner mon site » et « Recevoir un site ».
   Donner : le propriétaire crée un lien + un code de transfert (7 jours), l'envoie par WhatsApp, et peut l'annuler.
   Recevoir : la personne ouvre le lien (ou entre le code), voit ce qu'elle reçoit, puis accepte : le site passe dans son compte
   et c'est elle qui le gère et paie l'abonnement. Tout est décidé par le serveur (/api/render-site, actions site_transfer_*).
   Chargé à la demande par script.js. */
(function () {
  'use strict';
  if (window.CNSiteTransfer) return;

  var KEY = 'cn_site_transfer';
  var D = {
    fr: {
      close: 'Fermer', done: 'Terminé', loading: 'Chargement…', err: 'Une erreur est survenue. Réessaie.', err_net: 'Pas de connexion. Réessaie.', need_login: 'Connecte-toi pour continuer.',
      g_title: 'Donner mon site',
      g_lead: 'La personne que tu choisis devient la propriétaire du site. Elle le gère et paie l’abonnement. Toi, tu n’y as plus accès.',
      g_given: 'Ce qui est donné', g_g1: 'Le site complet : pages, photos, produits et messages reçus', g_g2: 'Son adresse : {0}', g_g3: 'Le nom de domaine {0}',
      g_g4: 'Le Pack Pro en cours, jusqu’au {0}', g_g4n: 'Le site n’a pas de Pack Pro actif : la personne pourra l’activer.',
      g_kept: 'Ce qui reste à toi', g_k1: 'Ton compte et ton solde ne changent pas.', g_k2: 'Les clés de connexion du site (liens de notification, clé d’API) sont effacées, par sécurité.',
      g_how: 'Comment ça marche', g_h1: 'Tu crées le lien de transfert ici.', g_h2: 'Tu l’envoies à la personne, par WhatsApp par exemple.', g_h3: 'Elle ouvre le lien, se connecte et touche « Accepter ».',
      g_h4: 'Le lien est valable 7 jours. Tu peux l’annuler tant qu’elle n’a pas accepté.',
      g_create: 'Créer le lien de transfert', g_creating: 'Création…',
      g_nosite: 'Tu n’as pas encore de site à donner. Crée d’abord ton site.',
      g_blocked: 'Tu ne peux pas donner ce site pour le moment',
      p_title: 'Transfert en attente', p_lead: 'Un lien a été créé pour ton site. Il est valable jusqu’au {0}. Par sécurité, le code n’est montré qu’une seule fois : si tu l’as perdu, crée un nouveau lien (l’ancien sera annulé).',
      p_new: 'Créer un nouveau lien', cancel: 'Annuler le transfert', cancel_q: 'Annuler ce transfert ?', cancel_yes: 'Oui, annuler', cancel_no: 'Non, garder', cancelled: 'Transfert annulé. Le site reste à toi.',
      r_title: 'Le lien est prêt', r_lead: 'Envoie-le à la personne qui doit recevoir le site.', r_code: 'Code de transfert', r_valid: 'Valable jusqu’au {0}',
      r_wa: 'Envoyer par WhatsApp', r_copy_link: 'Copier le lien', r_copy_code: 'Copier le code', copied: 'Copié',
      r_note: 'Quand la personne accepte, tu reçois une notification et le site quitte ton compte.',
      wa_msg: 'Bonjour, je te donne mon site « {0} ».\n\n1. Ouvre ce lien : {1}\n2. Connecte-toi (ou crée ton compte) à Coeurnoh Universe\n3. Touche « Accepter »\n\nSi le lien ne s’ouvre pas, entre ce code dans « Crée ton site », puis « J’ai reçu un site » : {2}\nValable jusqu’au {3}.',
      v_eyebrow: 'Recevoir un site', v_title: 'J’ai reçu un code', v_lead: 'Entre le code que la personne t’a envoyé. Il ressemble à K7HM-2QXP-9TRA.', v_label: 'Code de transfert', v_check: 'Vérifier le code', v_checking: 'Vérification…',
      a_title: 'Un site t’est offert', a_from: 'Envoyé par {0}', a_pro: 'Pack Pro', a_pro_on: 'Actif jusqu’au {0}', a_pro_off: 'Pas de Pack Pro actif', a_dom: 'Nom de domaine', a_state: 'État', a_pub: 'Publié', a_draft: 'Brouillon', a_valid: 'Lien valable jusqu’au {0}',
      a_info_t: 'En acceptant, tu deviens propriétaire', a_i1: 'Tu gères le site et tu paies l’abonnement (Pack Pro, domaine).', a_i2: 'L’ancien propriétaire n’y a plus aucun accès.', a_i3: 'Pense ensuite à vérifier tes coordonnées et ton moyen de paiement dans le site.',
      a_accept: 'Accepter et devenir propriétaire', a_accepting: 'Transfert en cours…', a_decline: 'Pas maintenant',
      e_own: 'Ce site est déjà dans ton compte.', e_has_site: 'Tu as déjà un site. Pour recevoir celui-ci, supprime d’abord ton site actuel ou donne-le à quelqu’un, puis reviens avec ce même code.', e_client_mode: 'Tu es dans le compte d’un client. Reviens d’abord à ton propre compte.',
      s_title: 'Le site est à toi', s_lead: '« {0} » est maintenant dans ton compte. Voici quoi faire tout de suite :', s_t1: 'Vérifie tes coordonnées : téléphone, WhatsApp, e-mail et adresse.', s_t2: 'Choisis comment tes clients te paient.', s_t3: 'Vérifie le Pack Pro : il est actif jusqu’au {0}. Pense à le renouveler avant.', s_t3n: 'Active le Pack Pro pour mettre le site en ligne.',
      s_open: 'Ouvrir mon site', s_view: 'Voir le site en ligne'
    },
    en: {
      close: 'Close', done: 'Done', loading: 'Loading…', err: 'Something went wrong. Try again.', err_net: 'No connection. Try again.', need_login: 'Sign in to continue.',
      g_title: 'Give my site',
      g_lead: 'The person you choose becomes the owner of the site. They manage it and pay the subscription. You will no longer have access.',
      g_given: 'What is given', g_g1: 'The whole site: pages, photos, products and received messages', g_g2: 'Its address: {0}', g_g3: 'The domain name {0}',
      g_g4: 'The current Pro Pack, until {0}', g_g4n: 'The site has no active Pro Pack: the new owner can activate it.',
      g_kept: 'What stays yours', g_k1: 'Your account and balance do not change.', g_k2: 'The site’s connection keys (notification links, API key) are erased, for security.',
      g_how: 'How it works', g_h1: 'You create the transfer link here.', g_h2: 'You send it to the person, on WhatsApp for example.', g_h3: 'They open the link, sign in and tap “Accept”.',
      g_h4: 'The link is valid for 7 days. You can cancel it until they accept.',
      g_create: 'Create the transfer link', g_creating: 'Creating…',
      g_nosite: 'You have no site to give yet. Create your site first.',
      g_blocked: 'You cannot give this site right now',
      p_title: 'Transfer pending', p_lead: 'A link has been created for your site. It is valid until {0}. For security, the code is shown only once: if you lost it, create a new link (the old one will be cancelled).',
      p_new: 'Create a new link', cancel: 'Cancel the transfer', cancel_q: 'Cancel this transfer?', cancel_yes: 'Yes, cancel', cancel_no: 'No, keep it', cancelled: 'Transfer cancelled. The site stays yours.',
      r_title: 'The link is ready', r_lead: 'Send it to the person who should receive the site.', r_code: 'Transfer code', r_valid: 'Valid until {0}',
      r_wa: 'Send on WhatsApp', r_copy_link: 'Copy the link', r_copy_code: 'Copy the code', copied: 'Copied',
      r_note: 'When the person accepts, you get a notification and the site leaves your account.',
      wa_msg: 'Hello, I am giving you my site “{0}”.\n\n1. Open this link: {1}\n2. Sign in (or create your account) on Coeurnoh Universe\n3. Tap “Accept”\n\nIf the link does not open, enter this code in “Create your site”, then “I received a site”: {2}\nValid until {3}.',
      v_eyebrow: 'Receive a site', v_title: 'I received a code', v_lead: 'Enter the code the person sent you. It looks like K7HM-2QXP-9TRA.', v_label: 'Transfer code', v_check: 'Check the code', v_checking: 'Checking…',
      a_title: 'A site is being given to you', a_from: 'Sent by {0}', a_pro: 'Pro Pack', a_pro_on: 'Active until {0}', a_pro_off: 'No active Pro Pack', a_dom: 'Domain name', a_state: 'Status', a_pub: 'Published', a_draft: 'Draft', a_valid: 'Link valid until {0}',
      a_info_t: 'By accepting, you become the owner', a_i1: 'You manage the site and pay the subscription (Pro Pack, domain).', a_i2: 'The previous owner no longer has any access.', a_i3: 'Then check your contact details and payment method inside the site.',
      a_accept: 'Accept and become the owner', a_accepting: 'Transferring…', a_decline: 'Not now',
      e_own: 'This site is already in your account.', e_has_site: 'You already have a site. To receive this one, first delete your current site or give it to someone, then come back with the same code.', e_client_mode: 'You are inside a client’s account. Go back to your own account first.',
      s_title: 'The site is yours', s_lead: '“{0}” is now in your account. Here is what to do right away:', s_t1: 'Check your contact details: phone, WhatsApp, e-mail and address.', s_t2: 'Choose how your customers pay you.', s_t3: 'Check the Pro Pack: it is active until {0}. Remember to renew it before then.', s_t3n: 'Activate the Pro Pack to put the site online.',
      s_open: 'Open my site', s_view: 'View the live site'
    }
  };
  function lang() { try { return (typeof currentLang === 'string' && D[currentLang]) ? currentLang : 'en'; } catch (e) { return 'en'; } }
  function L(k) {
    var s = (D[lang()][k] != null ? D[lang()][k] : D.en[k]) || k;
    for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]);
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dateText(iso) {
    try { return new Date(iso).toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return String(iso || '').slice(0, 10); }
  }
  function authObj() { try { return typeof auth !== 'undefined' ? auth : (window.firebase && window.firebase.auth ? window.firebase.auth() : null); } catch (e) { return null; } }
  function toast(m, kind) { try { if (typeof showToast === 'function') showToast(m, kind || 'info'); } catch (e) { /* ignore */ } }
  function ic(path, size) { return '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'; }
  var I = {
    check: '<polyline points="20 6 9 17 4 12"/>', x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    site: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>', gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>'
  };

  /* ---------------- Serveur ---------------- */
  function call(action, body) {
    return new Promise(function (resolve, reject) {
      var a = authObj();
      if (!a || !a.currentUser) { reject(new Error(L('need_login'))); return; }
      a.currentUser.getIdToken().then(function (t) {
        var b = body || {}; b.action = action;
        return fetch('/api/render-site', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify(b) });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok && j && j.success !== false) { resolve(j); return; }
          var er = new Error(j && j.error ? j.error : L('err')); er.data = j || {}; er.status = r.status; reject(er);
        });
      }).catch(function (e) { reject(e && e.message ? e : new Error(L('err_net'))); });
    });
  }

  /* ---------------- Habillage ---------------- */
  function css() {
    if (document.getElementById('tr-style')) return;
    var st = document.createElement('style'); st.id = 'tr-style';
    st.textContent =
      '.tr-ov{position:fixed;inset:0;z-index:3500;background:rgba(10,14,22,.55);display:flex;align-items:flex-end;justify-content:center}' +
      '.tr-sheet{background:var(--white,#fff);color:var(--ink,#16202f);width:100%;max-width:480px;max-height:94vh;max-height:94dvh;display:flex;flex-direction:column;overflow:hidden;border-radius:20px 20px 0 0;box-shadow:var(--shadow-lg,0 20px 50px rgba(0,0,0,.3))}' +
      '@media (min-width:600px){.tr-ov{align-items:center}.tr-sheet{border-radius:20px}}' +
      '.tr-sheet:focus{outline:none}' +
      '.tr-body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 16px 8px}' +
      '.tr-foot{flex:none;display:flex;flex-direction:column;gap:8px;padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,#e3e8f0);background:var(--white,#fff)}' +
      '.tr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}' +
      '.tr-eyebrow{display:block;font-size:.74rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#5d6779);margin-bottom:3px;overflow-wrap:anywhere}' +
      '.tr-head h3{margin:0;font-size:1.25rem;line-height:1.25}' +
      '.tr-x{flex:none;width:40px;height:40px;border-radius:12px;border:1px solid var(--line,#e3e8f0);background:var(--white,#fff);color:inherit;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}' +
      '.tr-lead{margin:10px 0 14px;font-size:.95rem;line-height:1.5;color:var(--ink-2,#2b3646)}' +
      '.tr-box{background:var(--soft,#f3f5f9);border-radius:14px;padding:12px 14px;margin-bottom:10px}' +
      '.tr-box h4{margin:0 0 8px;font-size:.82rem;letter-spacing:.03em;text-transform:uppercase;color:var(--muted,#5d6779)}' +
      '.tr-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}' +
      '.tr-list li{display:flex;gap:10px;align-items:flex-start;font-size:.92rem;line-height:1.4;overflow-wrap:anywhere}' +
      '.tr-list li svg{flex:none;margin-top:2px;color:var(--green-dark-text,#15803d)}' +
      '.tr-list li.off svg{color:var(--muted,#5d6779)}.tr-list li.off{color:var(--muted,#5d6779)}' +
      '.tr-steps{margin:0;padding:0;list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:8px}' +
      '.tr-steps li{counter-increment:s;display:flex;gap:10px;align-items:flex-start;font-size:.92rem;line-height:1.4}' +
      '.tr-steps li::before{content:counter(s);flex:none;width:22px;height:22px;border-radius:50%;background:var(--btn,#27364f);color:var(--on-primary,#fff);font-size:.78rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-top:1px}' +
      '.tr-steps li.plain::before{display:none}.tr-steps li.plain{color:var(--muted,#5d6779);font-size:.85rem;padding-left:32px}' +
      '.tr-warn{display:flex;gap:10px;align-items:flex-start;background:var(--tint-red,#fde8ec);color:var(--tint-red-ink,#8f1d33);border-radius:14px;padding:12px 14px;margin-bottom:10px;font-size:.9rem;line-height:1.45}' +
      '.tr-warn svg{flex:none;margin-top:2px}' +
      '.tr-ok{display:flex;gap:10px;align-items:flex-start;background:var(--tint-green,#e3f6ea);color:var(--tint-green-ink,#14633a);border-radius:14px;padding:12px 14px;margin-bottom:10px;font-size:.9rem;line-height:1.45}' +
      '.tr-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:800;font-size:1.55rem;letter-spacing:.08em;text-align:center;padding:16px 8px;border-radius:14px;border:2px dashed var(--line-2,#c3cad6);background:var(--soft,#f3f5f9);user-select:all;-webkit-user-select:all;overflow-wrap:anywhere}' +
      '.tr-small{margin:8px 0 14px;text-align:center;font-size:.84rem;color:var(--muted,#5d6779)}' +
      '.tr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;padding:0 16px;border-radius:14px;font:inherit;font-weight:700;font-size:1rem;cursor:pointer;border:2px solid var(--btn,#27364f);background:var(--btn,#27364f);color:var(--on-primary,#fff)}' +
      '.tr-btn.sec{background:var(--white,#fff);color:var(--ink,#16202f);border-color:var(--line-2,#c3cad6)}' +
      '.tr-btn.danger{background:var(--white,#fff);color:var(--red-text,#c3183f);border-color:var(--line-2,#c3cad6)}' +
      '.tr-btn.wa{background:#1a7f4b;border-color:#1a7f4b;color:#fff}' +
      '.tr-btn[disabled]{opacity:.6;cursor:default}' +
      '.tr-btn:focus-visible,.tr-x:focus-visible,.tr-in:focus-visible{outline:3px solid var(--link,#2f5dd0);outline-offset:2px}' +
      '.tr-row{display:flex;gap:8px}.tr-row .tr-btn{min-height:44px;font-size:.92rem}' +
      '.tr-lab{display:block;font-weight:700;font-size:.9rem;margin:0 0 6px}' +
      '.tr-in{width:100%;min-height:54px;border-radius:14px;border:2px solid var(--line-2,#c3cad6);background:var(--white,#fff);color:inherit;font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700;font-size:1.25rem;letter-spacing:.08em;text-align:center;text-transform:uppercase;padding:0 12px}' +
      '.tr-err{margin:10px 0 0;color:var(--red-text,#c3183f);font-size:.9rem;line-height:1.4}' +
      '.tr-card{display:flex;gap:12px;align-items:center;border:1px solid var(--line,#e3e8f0);border-radius:16px;padding:12px;margin:12px 0}' +
      '.tr-logo{flex:none;width:56px;height:56px;border-radius:14px;background:var(--soft-2,#e9edf5);display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--muted,#5d6779);font-weight:800;font-size:1.3rem}' +
      '.tr-logo img{width:100%;height:100%;object-fit:cover}' +
      '.tr-card b{display:block;font-size:1.05rem;line-height:1.25;overflow-wrap:anywhere}.tr-card small{display:block;color:var(--muted,#5d6779);font-size:.84rem;line-height:1.35;overflow-wrap:anywhere}' +
      '.tr-kv{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--line,#e3e8f0);font-size:.9rem}.tr-kv:first-child{border-top:0}.tr-kv span:first-child{color:var(--muted,#5d6779)}.tr-kv span:last-child{font-weight:700;text-align:right;overflow-wrap:anywhere}' +
      '.tr-link{display:inline-block;text-align:center;color:var(--link,#2f5dd0);font-weight:700;text-decoration:underline;padding:6px}' +
      '@media (prefers-reduced-motion:no-preference){.tr-sheet{animation:trUp .18s ease-out}@keyframes trUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}}';
    document.head.appendChild(st);
  }

  var ov = null, busy = false;
  function keyH(e) { if (e.key === 'Escape' && !busy) close(); }
  function open() {
    css(); close();
    ov = document.createElement('div'); ov.className = 'tr-ov'; ov.id = 'tr-overlay';
    ov.addEventListener('click', function (e) { if (e.target === ov && !busy) close(); });
    document.body.appendChild(ov);
    document.addEventListener('keydown', keyH);
    return ov;
  }
  function close() {
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    ov = null; busy = false;
    document.removeEventListener('keydown', keyH);
  }
  function show(eyebrow, title, bodyHtml, footHtml) {
    if (!ov) return;
    ov.innerHTML = '<div class="tr-sheet" role="dialog" aria-modal="true" aria-labelledby="tr-title" tabindex="-1"><div class="tr-body">' +
      '<div class="tr-head"><div>' + (eyebrow ? '<span class="tr-eyebrow">' + esc(eyebrow) + '</span>' : '') + '<h3 id="tr-title">' + esc(title) + '</h3></div>' +
      '<button type="button" class="tr-x" data-tr="close" aria-label="' + esc(L('close')) + '">' + ic(I.x, 20) + '</button></div>' + bodyHtml + '</div>' +
      '<div class="tr-foot">' + footHtml + '</div></div>';
    var sh = ov.querySelector('.tr-sheet'); if (sh) sh.focus({ preventScroll: true });
  }
  function btn(act, label, cls, icon, extra) { return '<button type="button" class="tr-btn' + (cls ? ' ' + cls : '') + '" data-tr="' + act + '"' + (extra || '') + '>' + (icon ? ic(icon, 18) : '') + esc(label) + '</button>'; }
  function loadingView(title) { show('', title, '<p class="tr-lead">' + esc(L('loading')) + '</p>', btn('close', L('close'), 'sec')); }
  function li(text, off) { return '<li' + (off ? ' class="off"' : '') + '>' + ic(off ? I.x : I.check, 16) + '<span>' + esc(text) + '</span></li>'; }

  /* ---------------- DONNER ---------------- */
  var G = { st: null, link: null, confirmCancel: false };

  function openGive() {
    if (typeof currentUser === 'undefined' || !currentUser) { try { openAuth('login'); } catch (e) { /* ignore */ } return; }
    open(); G = { st: null, link: null, confirmCancel: false };
    loadingView(L('g_title'));
    call('site_transfer_status').then(function (st) { G.st = st; renderGive(); }).catch(function (e) {
      show('', L('g_title'), '<div class="tr-warn">' + ic(I.alert, 18) + '<span>' + esc(e.message) + '</span></div>', btn('close', L('close'), 'sec'));
    });
  }
  function renderGive() {
    var st = G.st; if (!st) return;
    if (!st.hasSite) { show('', L('g_title'), '<p class="tr-lead">' + esc(L('g_nosite')) + '</p>', btn('close', L('close'), 'sec')); return; }
    var name = st.site.name || '';
    if (st.blockers && st.blockers.length) {
      show(name, L('g_title'), '<div class="tr-warn">' + ic(I.alert, 18) + '<div><b>' + esc(L('g_blocked')) + '</b><br>' + st.blockers.map(function (b) { return esc(b.message); }).join('<br>') + '</div></div>', btn('close', L('close'), 'sec'));
      return;
    }
    if (G.link) { renderLink(); return; }
    if (st.pending) {
      var cancelBlock = G.confirmCancel
        ? '<p class="tr-small" style="margin:0"><b>' + esc(L('cancel_q')) + '</b></p><div class="tr-row">' + btn('cancel_yes', L('cancel_yes'), 'danger') + btn('cancel_no', L('cancel_no'), 'sec') + '</div>'
        : btn('cancel', L('cancel'), 'danger');
      show(name, L('p_title'), '<p class="tr-lead">' + esc(L('p_lead', dateText(st.pending.expiresAt))) + '</p>', btn('create', L('p_new'), '') + cancelBlock + btn('close', L('close'), 'sec'));
      return;
    }
    var site = st.site, given = li(L('g_g1')) + li(L('g_g2', (site.url || '').replace(/^https?:\/\//, '')));
    if (site.domain) given += li(L('g_g3', site.domain));
    given += site.proUntil ? li(L('g_g4', dateText(site.proUntil))) : li(L('g_g4n'), true);
    show(name, L('g_title'),
      '<p class="tr-lead">' + esc(L('g_lead')) + '</p>' +
      '<div class="tr-box"><h4>' + esc(L('g_given')) + '</h4><ul class="tr-list">' + given + '</ul></div>' +
      '<div class="tr-box"><h4>' + esc(L('g_kept')) + '</h4><ul class="tr-list">' + li(L('g_k1')) + li(L('g_k2')) + '</ul></div>' +
      '<div class="tr-box"><h4>' + esc(L('g_how')) + '</h4><ol class="tr-steps"><li>' + esc(L('g_h1')) + '</li><li>' + esc(L('g_h2')) + '</li><li>' + esc(L('g_h3')) + '</li><li class="plain">' + esc(L('g_h4')) + '</li></ol></div>',
      btn('create', L('g_create'), '') + btn('close', L('close'), 'sec'));
  }
  function renderLink() {
    var r = G.link, st = G.st;
    var cancelBlock = G.confirmCancel
      ? '<p class="tr-small" style="margin:0"><b>' + esc(L('cancel_q')) + '</b></p><div class="tr-row">' + btn('cancel_yes', L('cancel_yes'), 'danger') + btn('cancel_no', L('cancel_no'), 'sec') + '</div>'
      : btn('cancel', L('cancel'), 'danger');
    show(r.siteName || (st && st.site && st.site.name) || '', L('r_title'),
      '<p class="tr-lead">' + esc(L('r_lead')) + '</p>' +
      '<span class="tr-lab">' + esc(L('r_code')) + '</span><div class="tr-code" id="tr-code">' + esc(r.code) + '</div>' +
      '<p class="tr-small">' + esc(L('r_valid', dateText(r.expiresAt))) + '</p>' +
      '<div class="tr-row" style="margin-bottom:12px">' + btn('copy_link', L('r_copy_link'), 'sec', I.copy) + btn('copy_code', L('r_copy_code'), 'sec', I.copy) + '</div>' +
      '<div class="tr-ok">' + ic(I.check, 18) + '<span>' + esc(L('r_note')) + '</span></div>',
      btn('wa', L('r_wa'), 'wa', I.msg) + cancelBlock + btn('close', L('done'), 'sec'));
  }
  function doCreate(b) {
    if (busy) return; busy = true; b.disabled = true; b.textContent = L('g_creating');
    call('site_transfer_create').then(function (r) {
      busy = false; G.link = r; G.confirmCancel = false; renderGive();
    }).catch(function (e) {
      busy = false; b.disabled = false; renderGive();
      var body = ov && ov.querySelector('.tr-body'); if (body) body.insertAdjacentHTML('afterbegin', '<div class="tr-warn">' + ic(I.alert, 18) + '<span>' + esc(e.message) + '</span></div>');
    });
  }
  function doCancel() {
    if (busy) return; busy = true;
    call('site_transfer_cancel').then(function () {
      busy = false; G.link = null; G.confirmCancel = false; if (G.st) G.st.pending = null;
      toast(L('cancelled'), 'success'); close();
    }).catch(function (e) { busy = false; toast(e.message, 'error'); });
  }
  function copyText(text) {
    var done = function () { toast(L('copied'), 'success'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); return; } } catch (e) { /* ignore */ }
    fallback();
    function fallback() {
      try { var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done(); } catch (e) { /* ignore */ }
    }
  }
  function sendWhatsApp() {
    var r = G.link; if (!r) return;
    var msg = L('wa_msg', r.siteName || '', r.link, r.code, dateText(r.expiresAt));
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }

  /* ---------------- RECEVOIR ---------------- */
  var R = { code: '', pv: null, err: '' };
  function fmtCode(v) {
    var c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    return (c.match(/.{1,4}/g) || []).join('-');
  }
  function openReceive(code) {
    if (typeof currentUser === 'undefined' || !currentUser) {
      if (code) { try { sessionStorage.setItem(KEY, code); } catch (e) { /* ignore */ } }
      try { openAuth('register'); } catch (e) { /* ignore */ } return;
    }
    open(); R = { code: fmtCode(code), pv: null, err: '' };
    if (R.code.replace(/-/g, '').length === 12) checkCode(); else renderInput();
  }
  function renderInput() {
    show(L('v_eyebrow'), L('v_title'),
      '<p class="tr-lead">' + esc(L('v_lead')) + '</p>' +
      '<label class="tr-lab" for="tr-in">' + esc(L('v_label')) + '</label>' +
      '<input id="tr-in" class="tr-in" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="14" placeholder="K7HM-2QXP-9TRA" value="' + esc(R.code) + '">' +
      (R.err ? '<p class="tr-err" role="alert">' + esc(R.err) + '</p>' : ''),
      btn('check', L('v_check'), '') + btn('close', L('close'), 'sec'));
    var inp = ov && ov.querySelector('#tr-in');
    if (inp) {
      inp.addEventListener('input', function () { var v = fmtCode(inp.value); if (inp.value !== v) inp.value = v; R.code = v; });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checkCode(); } });
    }
  }
  function checkCode() {
    if (busy) return; busy = true;
    var b = ov && ov.querySelector('[data-tr="check"]'); if (b) { b.disabled = true; b.textContent = L('v_checking'); } else loadingView(L('v_title'));
    call('site_transfer_preview', { code: R.code }).then(function (r) {
      busy = false; R.pv = r; try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } renderPreview();
    }).catch(function (e) {
      busy = false; R.err = e.message || L('err'); R.pv = null;
      if (e.data && /^(used|cancelled|expired|unknown_code|bad_code)$/.test(e.data.code || '')) { try { sessionStorage.removeItem(KEY); } catch (x) { /* ignore */ } }
      renderInput();
    });
  }
  function renderPreview() {
    var p = R.pv, t = p.transfer;
    var reasons = { own: L('e_own'), has_site: L('e_has_site'), client_mode: L('e_client_mode') };
    var initial = esc((t.siteName || '?').trim().charAt(0).toUpperCase());
    var logo = t.logoUrl ? '<img src="' + esc(t.logoUrl) + '" alt="" loading="lazy">' : initial;
    var rows = '<div class="tr-kv"><span>' + esc(L('a_pro')) + '</span><span>' + esc(t.proUntil ? L('a_pro_on', dateText(t.proUntil)) : L('a_pro_off')) + '</span></div>' +
      (t.domain ? '<div class="tr-kv"><span>' + esc(L('a_dom')) + '</span><span>' + esc(t.domain) + '</span></div>' : '') +
      '<div class="tr-kv"><span>' + esc(L('a_state')) + '</span><span>' + esc(t.published ? L('a_pub') : L('a_draft')) + '</span></div>';
    var warn = p.canAccept ? '' : '<div class="tr-warn">' + ic(I.alert, 18) + '<span>' + esc(reasons[p.reason] || L('err')) + '</span></div>';
    var info = p.canAccept ? '<div class="tr-box"><h4>' + esc(L('a_info_t')) + '</h4><ul class="tr-list">' + li(L('a_i1')) + li(L('a_i2')) + li(L('a_i3')) + '</ul></div>' : '';
    show(L('a_from', t.fromName), L('a_title'),
      '<div class="tr-card"><div class="tr-logo">' + logo + '</div><div style="min-width:0"><b>' + esc(t.siteName) + '</b><small>' + esc((t.url || '').replace(/^https?:\/\//, '')) + '</small>' + (t.tagline ? '<small>' + esc(t.tagline) + '</small>' : '') + '</div></div>' +
      '<div class="tr-box" style="padding-top:4px;padding-bottom:4px">' + rows + '</div>' + warn + info +
      '<p class="tr-small" style="margin:0 0 8px">' + esc(L('a_valid', dateText(t.expiresAt))) + '</p>',
      (p.canAccept ? btn('accept', L('a_accept'), '') : '') + btn('close', p.canAccept ? L('a_decline') : L('close'), 'sec'));
  }
  function doAccept() {
    if (busy) return; busy = true;
    var b = ov && ov.querySelector('[data-tr="accept"]'); if (b) { b.disabled = true; b.textContent = L('a_accepting'); }
    call('site_transfer_accept', { code: R.code }).then(function (r) {
      busy = false;
      try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      try { if (typeof mySiteCache !== 'undefined') mySiteCache = null; } catch (e) { /* ignore */ }
      renderDone(r.site);
    }).catch(function (e) {
      busy = false; if (b) { b.disabled = false; b.textContent = L('a_accept'); }
      var body = ov && ov.querySelector('.tr-body'); if (body) body.insertAdjacentHTML('afterbegin', '<div class="tr-warn">' + ic(I.alert, 18) + '<span>' + esc(e.message) + '</span></div>');
    });
  }
  function renderDone(site) {
    show('', L('s_title'),
      '<p class="tr-lead">' + esc(L('s_lead', site.name)) + '</p>' +
      '<div class="tr-box"><ul class="tr-list">' + li(L('s_t1')) + li(L('s_t2')) + (site.proUntil ? li(L('s_t3', dateText(site.proUntil))) : li(L('s_t3n'))) + '</ul></div>',
      btn('open_site', L('s_open'), '') + (site.published && site.url ? '<a class="tr-link" href="' + esc(site.url) + '" target="_blank" rel="noopener">' + esc(L('s_view')) + '</a>' : '') + btn('close', L('close'), 'sec'));
  }

  /* ---------------- Boutons ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-tr]') : null;
    if (!el || !ov || !ov.contains(el)) return;
    var a = el.getAttribute('data-tr');
    if (a === 'close') { if (!busy) close(); }
    else if (a === 'create') doCreate(el);
    else if (a === 'cancel') { G.confirmCancel = true; renderGive(); }
    else if (a === 'cancel_no') { G.confirmCancel = false; renderGive(); }
    else if (a === 'cancel_yes') doCancel();
    else if (a === 'copy_link') copyText(G.link.link);
    else if (a === 'copy_code') copyText(G.link.code);
    else if (a === 'wa') sendWhatsApp();
    else if (a === 'check') checkCode();
    else if (a === 'accept') doAccept();
    else if (a === 'open_site') { close(); try { if (typeof openSiteBuilderScreen === 'function') openSiteBuilderScreen(); } catch (x) { /* ignore */ } }
  });

  // Code reçu par lien et gardé le temps de se connecter : on l'ouvre dès que la personne est connectée.
  function boot() {
    var c = ''; try { c = sessionStorage.getItem(KEY) || ''; } catch (e) { /* ignore */ }
    if (c) openReceive(c);
  }

  window.CNSiteTransfer = { give: openGive, receive: openReceive, boot: boot, close: function () { if (!busy) close(); }, _fmt: fmtCode };
})();
