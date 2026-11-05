/* Coeurnoh Universe : début de « Crée ton site ».
   1) Le tutoriel (comment tout fonctionne : Pack Pro, domaine, paiements, Google), puis « Continuer ».
   2) Le choix : « Créer mon propre site » ou « Créer le site pour un client ».
   3) Site pour un client : le serveur crée le compte du client, l'agent y entre d'un bouton, construit le site, puis « Remet » : le client reçoit
      son e-mail + un mot de passe neuf et l'agent revient dans son propre compte (plus aucun accès à celui du client).
   Chargé à la demande par script.js. Tout ce qui touche aux comptes et à l'argent est décidé par le serveur (/api/render-site, actions client_site_*). */
(function () {
  'use strict';
  if (window.CNSiteStart) return;

  var LS = 'cn_client_mode', SS = 'cn_handover';

  var D = {
    fr: {
      back: 'Retour', close: 'Fermer', cancel: 'Annuler', cont: 'Continuer', done: 'Terminé', loading: 'Chargement…', err: 'Une erreur est survenue. Réessayez.', err_net: 'Pas de connexion. Réessayez.',
      need_login: 'Connectez-vous pour continuer.', err_store: 'Votre navigateur bloque l’enregistrement local. Sortez de la navigation privée et réessayez.',
      tuto_title: 'Crée ton site', tuto_sub: 'Comment ça marche',
      tuto_intro: 'Voici, en 6 étapes simples, comment fonctionne un site créé ici. Lisez-les, puis touchez « Continuer ».',
      s1t: 'Vous choisissez le type de site', s1d: 'Boutique, restaurant, salon, école, agence… Vous remplissez le nom, les photos, les services et le contact. C’est gratuit, et l’aperçu montre exactement ce que verront vos clients, avant de payer quoi que ce soit.',
      s2t: 'Vous activez le Pack Pro', s2d: 'Le Pack Pro ({0} $ par mois) met le site en ligne avec une vraie adresse, sans la marque Coeurnoh, avec des modèles et des couleurs au choix, les statistiques et la visibilité sur Google. Il se paie avec votre portefeuille.',
      s3t: 'Votre site a son adresse', s3d: 'Dès la publication, il s’ouvre sur coeurnohuniverse.com/s/votre-nom, directement, sans écran de présentation. Vos clients peuvent l’installer sur l’écran d’accueil de leur téléphone.',
      s4t: 'Votre propre nom de domaine', s4d: 'Avec « Achat Domaine », vous achetez monentreprise.com avec votre portefeuille. Le site s’y connecte en un clic : le cadenas de sécurité et la redirection « www » sont gérés pour vous.',
      s5t: 'Vos clients vous paient directement', s5d: 'Dans « Mon espace », vous choisissez les passerelles de paiement de votre site (Mobile Money, carte bancaire…) ou le paiement à la livraison. L’argent va chez vous, et les commandes arrivent dans votre espace.',
      s6t: 'Google, WhatsApp et suivi', s6d: 'Le site est prêt pour être trouvé sur Google (titre, description, plan du site) et partagé sur WhatsApp. Vous gérez commandes, messages, produits et statistiques depuis « Mon espace », en haut de votre site.',
      choice_title: 'Que voulez-vous faire ?', choice_sub: 'Choisissez pour qui est le site.',
      own_t: 'Créer mon propre site', own_d: 'Pour mon activité, mon entreprise ou mon projet. Le site est dans mon compte.',
      has_t: 'Ouvrir mon site', has_d: 'Vous avez déjà un site. Ouvrez-le pour le modifier ou le publier.',
      cli_t: 'Créer le site pour un client', cli_d: 'Pour un client, un ami ou une entreprise. Je prépare tout, puis je lui remets seulement son e-mail et son mot de passe.',
      mine_t: 'Mes sites clients', mine_d: '{0} projet(s) en préparation ou remis',
      form_title: 'Site pour un client',
      how_t: 'Comment ça marche', how1: 'Vous écrivez le nom et l’e-mail de votre client.', how2: 'Un compte est créé au nom du client. Vous y entrez d’un seul bouton, sans mot de passe, et vous construisez son site.', how3: 'Quand c’est prêt, vous touchez « Remettre au client » : il reçoit son e-mail et son mot de passe. Vous n’avez plus accès à son compte.',
      f_name: 'Nom de l’entreprise ou du projet', f_name_ph: 'Ex. Salon Aya Beauté', f_mail: 'E-mail du client', f_mail_ph: 'client@gmail.com', f_mail_hint: 'Il servira à se connecter. Utilisez une adresse que le client peut lire.',
      f_phone: 'WhatsApp du client (facultatif)', f_phone_ph: '+243 …', f_phone_hint: 'Pour lui envoyer ses accès en un clic.',
      pay_note: 'Le Pack Pro et le domaine se paient avec le portefeuille du client. Vous pouvez lui ajouter du solde depuis votre portefeuille.',
      create_btn: 'Créer le compte et commencer le site', creating: 'Création en cours…', e_name: 'Écrivez le nom de l’entreprise ou du projet.', e_mail: 'Écrivez l’adresse e-mail du client.',
      list_title: 'Mes sites clients', list_empty: 'Aucun site client pour le moment.', list_new: 'Nouveau site client',
      st_building: 'En préparation', st_handed: 'Remis au client', site_none: 'Site pas encore créé', published: 'Publié', draft: 'Brouillon', pro_on: 'Pack Pro actif', pro_off: 'Sans Pack Pro', bal: 'Solde du client',
      enter: 'Entrer dans le site', fund: 'Ajouter du solde', del: 'Supprimer', open: 'Ouvrir le site', entering: 'Entrée dans le compte du client…',
      fund_t: 'Ajouter du solde au client', fund_my: 'Votre solde', fund_amount: 'Montant en $', fund_note: 'Ce montant est pris sur votre portefeuille et mis dans celui du client. Il sert à payer le Pack Pro ou un domaine pour son site.', fund_go: 'Ajouter', fund_ok: '{0} $ ajoutés au portefeuille du client.', e_amount: 'Écrivez un montant entre 1 et 500 $.',
      del_t: 'Supprimer ce projet ?', del_d: 'Le compte du client et son site seront supprimés pour toujours. Le solde restant revient dans votre portefeuille.', del_go: 'Supprimer', del_ok: 'Projet supprimé.',
      bar_t: 'Site de {0}', bar_s: 'Vous le préparez pour votre client', bar_hand: 'Remettre', bar_back: 'Mon compte',
      hand_t: 'Remettre le site à {0}', hand_d: 'Le client recevra son e-mail et un nouveau mot de passe. Ensuite, vous ne pourrez plus entrer dans son compte.', hand_nosite: 'Créez d’abord le site du client, puis revenez le remettre.',
      hand_draft: 'Le site n’est pas encore publié. Le client pourra le publier lui-même avec le Pack Pro.', hand_live: 'Le site est publié et en ligne.', hand_go: 'Remettre maintenant', hand_wait: 'Remise en cours…', back_wait: 'Retour dans votre compte…',
      cred_title: 'Site remis à {0}', cred_ok: 'Le compte du client est prêt. Envoyez-lui maintenant ses accès.', cred_warn: 'Notez ce mot de passe maintenant : il ne sera plus affiché. Le client pourra le changer dans son profil.',
      l_site: 'Adresse du site', l_mail: 'E-mail', l_pass: 'Mot de passe', copy: 'Copier', copied: 'Copié', wa: 'Envoyer par WhatsApp', copy_msg: 'Copier le message',
      msg_live: 'Bonjour {0},\nVotre site {1} est prêt : {2}\n\nPour le gérer :\n1. Ouvrez ce lien : {2}\n2. Touchez « Mon espace », puis « Se connecter ».\n3. E-mail : {3}\n   Mot de passe : {4}\n\nChangez ce mot de passe dès votre première connexion (Profil).',
      msg_draft: 'Bonjour {0},\nVotre site {1} est préparé. Pour le gérer et le publier :\n1. Ouvrez https://coeurnohuniverse.com/ puis touchez « Se connecter ».\n2. E-mail : {3}\n   Mot de passe : {4}\n\nChangez ce mot de passe dès votre première connexion (Profil).'
    },
    en: {
      back: 'Back', close: 'Close', cancel: 'Cancel', cont: 'Continue', done: 'Done', loading: 'Loading…', err: 'Something went wrong. Try again.', err_net: 'No connection. Try again.',
      need_login: 'Sign in to continue.', err_store: 'Your browser blocks local storage. Leave private browsing and try again.',
      tuto_title: 'Create your site', tuto_sub: 'How it works',
      tuto_intro: 'Here, in 6 simple steps, is how a site created here works. Read them, then tap “Continue”.',
      s1t: 'You choose the type of site', s1d: 'Shop, restaurant, salon, school, agency… You fill in the name, photos, services and contact. It is free, and the preview shows exactly what your customers will see, before you pay anything.',
      s2t: 'You activate the Pro Pack', s2d: 'The Pro Pack ({0} $ per month) puts the site online with a real address, without the Coeurnoh brand, with templates and colours of your choice, statistics and Google visibility. You pay with your wallet.',
      s3t: 'Your site gets its address', s3d: 'Once published, it opens at coeurnohuniverse.com/s/your-name, straight away, with no splash screen. Your customers can install it on their phone’s home screen.',
      s4t: 'Your own domain name', s4d: 'With “Buy a domain”, you buy mybusiness.com with your wallet. The site connects to it in one tap: the security padlock and the “www” redirect are handled for you.',
      s5t: 'Your customers pay you directly', s5d: 'In “My space”, you choose your site’s payment gateways (Mobile Money, bank card…) or cash on delivery. The money goes to you, and orders arrive in your space.',
      s6t: 'Google, WhatsApp and tracking', s6d: 'The site is ready to be found on Google (title, description, sitemap) and shared on WhatsApp. You manage orders, messages, products and statistics from “My space”, at the top of your site.',
      choice_title: 'What do you want to do?', choice_sub: 'Choose who the site is for.',
      own_t: 'Create my own site', own_d: 'For my activity, business or project. The site is in my account.',
      has_t: 'Open my site', has_d: 'You already have a site. Open it to edit or publish it.',
      cli_t: 'Create the site for a client', cli_d: 'For a client, a friend or a company. I prepare everything, then hand over only their e-mail and password.',
      mine_t: 'My client sites', mine_d: '{0} project(s) in progress or handed over',
      form_title: 'Site for a client',
      how_t: 'How it works', how1: 'You enter your client’s name and e-mail.', how2: 'An account is created in the client’s name. You enter it with one button, no password, and build their site.', how3: 'When it is ready, tap “Hand over to client”: they receive their e-mail and password. You no longer have access to their account.',
      f_name: 'Business or project name', f_name_ph: 'E.g. Aya Beauty Salon', f_mail: 'Client’s e-mail', f_mail_ph: 'client@gmail.com', f_mail_hint: 'It will be used to sign in. Use an address the client can read.',
      f_phone: 'Client’s WhatsApp (optional)', f_phone_ph: '+243 …', f_phone_hint: 'To send them their access in one tap.',
      pay_note: 'The Pro Pack and the domain are paid from the client’s wallet. You can add balance to it from your own wallet.',
      create_btn: 'Create the account and start the site', creating: 'Creating…', e_name: 'Enter the business or project name.', e_mail: 'Enter the client’s e-mail address.',
      list_title: 'My client sites', list_empty: 'No client site yet.', list_new: 'New client site',
      st_building: 'In progress', st_handed: 'Handed over', site_none: 'Site not created yet', published: 'Published', draft: 'Draft', pro_on: 'Pro Pack active', pro_off: 'No Pro Pack', bal: 'Client balance',
      enter: 'Enter the site', fund: 'Add balance', del: 'Delete', open: 'Open the site', entering: 'Entering the client’s account…',
      fund_t: 'Add balance for the client', fund_my: 'Your balance', fund_amount: 'Amount in $', fund_note: 'This amount is taken from your wallet and put into the client’s. It pays for the Pro Pack or a domain for their site.', fund_go: 'Add', fund_ok: '{0} $ added to the client’s wallet.', e_amount: 'Enter an amount between 1 and 500 $.',
      del_t: 'Delete this project?', del_d: 'The client’s account and site will be deleted for good. Any remaining balance returns to your wallet.', del_go: 'Delete', del_ok: 'Project deleted.',
      bar_t: '{0}’s site', bar_s: 'You are preparing it for your client', bar_hand: 'Hand over', bar_back: 'My account',
      hand_t: 'Hand the site over to {0}', hand_d: 'The client will receive their e-mail and a new password. After that, you can no longer enter their account.', hand_nosite: 'Create the client’s site first, then come back to hand it over.',
      hand_draft: 'The site is not published yet. The client can publish it themselves with the Pro Pack.', hand_live: 'The site is published and online.', hand_go: 'Hand over now', hand_wait: 'Handing over…', back_wait: 'Going back to your account…',
      cred_title: 'Site handed over to {0}', cred_ok: 'The client’s account is ready. Send them their access now.', cred_warn: 'Write this password down now: it will not be shown again. The client can change it in their profile.',
      l_site: 'Site address', l_mail: 'E-mail', l_pass: 'Password', copy: 'Copy', copied: 'Copied', wa: 'Send on WhatsApp', copy_msg: 'Copy the message',
      msg_live: 'Hello {0},\nYour site {1} is ready: {2}\n\nTo manage it:\n1. Open this link: {2}\n2. Tap “My space”, then “Sign in”.\n3. E-mail: {3}\n   Password: {4}\n\nChange this password the first time you sign in (Profile).',
      msg_draft: 'Hello {0},\nYour site {1} is prepared. To manage and publish it:\n1. Open https://coeurnohuniverse.com/ then tap “Sign in”.\n2. E-mail: {3}\n   Password: {4}\n\nChange this password the first time you sign in (Profile).'
    }
  };

  function lang() { try { return (typeof currentLang !== 'undefined' && currentLang) || 'fr'; } catch (e) { return 'fr'; } }
  function L(k) {
    var d = D[lang()] || D.en, s = d[k] != null ? d[k] : (D.en[k] != null ? D.en[k] : k);
    for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(String(arguments[i]));
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }
  function toast(m, type) { try { if (typeof showToast === 'function') showToast(m, type || 'info'); } catch (e) { /* ignore */ } }
  function money(n) { var v = Math.round((Number(n) || 0) * 100) / 100; try { return v.toLocaleString(lang() === 'fr' ? 'fr-FR' : lang(), { maximumFractionDigits: 2 }) + ' $'; } catch (e) { return v + ' $'; } }
  function price() { try { return SITE_PRICING.premiumPriceMonth; } catch (e) { return 20; } }
  function authObj() { try { return typeof auth !== 'undefined' ? auth : (window.firebase && window.firebase.auth ? window.firebase.auth() : null); } catch (e) { return null; } }
  function ic(path, size) { return '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'; }
  var I = {
    back: '<polyline points="15 18 9 12 15 6"/>', chev: '<polyline points="9 18 15 12 9 6"/>', check: '<polyline points="20 6 9 17 4 12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    site: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="7" y1="6.5" x2="7.01" y2="6.5"/><line x1="10" y1="6.5" x2="10.01" y2="6.5"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'
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

  /* ---------------- Mémoire locale (téléphone de l'agent seulement) ---------------- */
  function readLs() { try { var v = JSON.parse(localStorage.getItem(LS) || 'null'); return v && v.uid && v.key ? v : null; } catch (e) { return null; } }
  function readSs() { try { var v = JSON.parse(sessionStorage.getItem(SS) || 'null'); return v && v.password ? v : null; } catch (e) { return null; } }

  /* ---------------- Style ---------------- */
  function css() {
    if (document.getElementById('ss-css')) return;
    var st = document.createElement('style'); st.id = 'ss-css';
    st.textContent =
      '.ss-page .fs-body{max-width:640px;width:100%;margin:0 auto;box-sizing:border-box}' +
      '.ss-intro{color:var(--muted);font-size:.92rem;line-height:1.5;margin:0 2px 14px}' +
      '.ss-steps{list-style:none;margin:0 0 18px;padding:0;display:flex;flex-direction:column;gap:10px}' +
      '.ss-steps li{display:flex;gap:12px;background:var(--white);border:1px solid var(--line);border-radius:14px;padding:13px 14px}' +
      '.ss-num{flex:none;width:28px;height:28px;border-radius:50%;background:var(--link);color:#fff;font-weight:700;font-size:.85rem;display:flex;align-items:center;justify-content:center}' +
      '.ss-steps b{display:block;font-size:.95rem;color:var(--ink);margin:2px 0 3px}' +
      '.ss-steps p{margin:0;font-size:.84rem;line-height:1.5;color:var(--muted)}' +
      '.ss-foot{position:sticky;bottom:0;margin:0 -16px -4px;padding:12px 16px calc(env(safe-area-inset-bottom,0px) + 4px);background:var(--soft);border-top:1px solid var(--line)}' +
      '.ss-foot .btn{width:100%;justify-content:center}' +
      '.ss-card{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:14px;margin:0 0 12px}' +
      '.ss-h{font-size:.95rem;font-weight:700;color:var(--ink);margin:0 0 8px}' +
      '.ss-choice{display:flex;align-items:center;gap:14px;width:100%;box-sizing:border-box;text-align:left;font-family:inherit;background:var(--white);border:1px solid var(--line);border-radius:16px;padding:16px;margin:0 0 12px;cursor:pointer;color:var(--ink)}' +
      '.ss-choice:active{transform:scale(.985)}' +
      '.ss-choice .ss-ci{flex:none;width:48px;height:48px;border-radius:14px;background:var(--tint-blue);color:var(--tint-blue-ink);display:flex;align-items:center;justify-content:center}' +
      '.ss-choice b{display:block;font-size:1rem;margin-bottom:3px}' +
      '.ss-choice small{display:block;font-size:.82rem;line-height:1.4;color:var(--muted)}' +
      '.ss-choice .ss-go{margin-left:auto;color:var(--faint);flex:none}' +
      '.ss-tx{flex:1;min-width:0}' +
      '.ss-how{margin:0;padding-left:20px;font-size:.86rem;line-height:1.55;color:var(--ink-2)}' +
      '.ss-how li{margin:0 0 4px}' +
      '.ss-lab{display:block;font-size:.8rem;font-weight:600;color:var(--ink);margin:12px 0 5px}' +
      '.ss-in{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid var(--line-2);border-radius:12px;background:var(--cream);color:var(--ink);font-size:1rem;font-family:inherit}' +
      '.ss-in:focus{outline:2px solid var(--link);outline-offset:1px}' +
      '.ss-hint{font-size:.76rem;color:var(--muted);margin:5px 2px 0;line-height:1.4}' +
      '.ss-note{display:flex;gap:9px;align-items:flex-start;font-size:.82rem;line-height:1.45;color:var(--tint-blue-ink);background:var(--tint-blue);border:1px solid var(--tint-blue-line);border-radius:12px;padding:10px 12px;margin:0 0 12px}' +
      '.ss-note svg{flex:none;margin-top:1px}' +
      '.ss-note.ok{color:var(--tint-green-ink);background:var(--tint-green);border-color:var(--tint-green-line)}' +
      '.ss-note.wait{color:var(--tint-amber-ink);background:var(--tint-amber);border-color:var(--tint-amber-line)}' +
      '.ss-err{font-size:.84rem;color:var(--tint-red-ink);background:var(--tint-red);border:1px solid var(--tint-red-line);border-radius:10px;padding:9px 11px;margin:12px 0 0}' +
      '.ss-chip{display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}' +
      '.ss-chip.ok{background:var(--tint-green);color:var(--tint-green-ink)}.ss-chip.wait{background:var(--tint-amber);color:var(--tint-amber-ink)}.ss-chip.no{background:var(--soft-2);color:var(--muted)}' +
      '.ss-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}' +
      '.ss-nm{font-weight:700;color:var(--ink);font-size:1rem;word-break:break-word}' +
      '.ss-sub{font-size:.8rem;color:var(--muted);margin-top:3px;word-break:break-all}' +
      '.ss-meta{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}' +
      '.ss-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
      '.ss-acts .btn{flex:1 1 auto;justify-content:center}' +
      '.ss-kv{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}.ss-kv:first-of-type{border-top:0}' +
      '.ss-kv>div{flex:1;min-width:0}.ss-kv small{display:block;font-size:.72rem;color:var(--muted)}.ss-kv code{display:block;font-size:.85rem;color:var(--ink);word-break:break-all;background:none;padding:0;font-weight:600}' +
      '.ss-big{font-size:1.1rem;letter-spacing:.04em}' +
      '#ss-sheet{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-end;justify-content:center;background:rgba(16,24,40,.5)}' +
      '#ss-sheet .ss-box{width:100%;max-width:520px;box-sizing:border-box;background:var(--cream);color:var(--ink);border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));max-height:92vh;overflow:auto}' +
      '#ss-sheet h3{margin:0 0 6px;font-size:1.1rem}#ss-sheet p{margin:0 0 10px;font-size:.88rem;line-height:1.5;color:var(--muted)}' +
      '.ss-btns{display:flex;gap:8px;margin-top:14px}.ss-btns .btn{flex:1;justify-content:center}' +
      '#ss-bar{position:sticky;top:0;z-index:1250;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;background:#0f172a;color:#fff;font-family:inherit}' +
      '#ss-bar .ss-bt{flex:1;min-width:0;line-height:1.25}#ss-bar b{display:block;font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ss-bar span{display:block;font-size:.7rem;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#ss-bar button{flex:none;border-radius:10px;padding:8px 11px;font:600 .76rem/1 inherit;font-family:inherit;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;min-height:34px}' +
      '#ss-bar button.go{background:#fff;color:#0f172a;border-color:#fff}' +
      'body.ss-cm #nav{top:var(--ss-h,52px)}body.ss-cm .fs-page,body.ss-cm .sbx-prev,body.ss-cm .sbx-set{top:var(--ss-h,52px)}';
    document.head.appendChild(st);
  }

  /* ---------------- Écran ---------------- */
  var S = { screen: 'tuto', form: { name: '', email: '', phone: '' }, busy: false, err: '', list: null, hasSite: false, pageEl: null };

  function mount() {
    css();
    var old = document.getElementById('ss-page');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'fs-page ss-page'; el.id = 'ss-page';
    document.body.appendChild(el);
    document.body.classList.add('fs-open');
    el.addEventListener('click', onClick);
    el.addEventListener('input', function (e) { var f = e.target && e.target.getAttribute && e.target.getAttribute('data-f'); if (f) S.form[f] = e.target.value; });
    el.addEventListener('submit', function (e) { e.preventDefault(); });
    S.pageEl = el;
    return el;
  }
  function closePage() {
    var el = document.getElementById('ss-page'); if (el) el.remove();
    if (!document.querySelector('.fs-page')) document.body.classList.remove('fs-open');
    S.pageEl = null;
  }
  function shell(title, sub, body, backAct) {
    return '<div class="fs-bar"><button type="button" class="fs-back" data-ss="' + (backAct || 'close') + '" aria-label="' + esc(L('back')) + '">' + ic(I.back, 22) + '</button>' +
      '<div class="fs-title"><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div></div><div class="fs-body">' + body + '</div>';
  }
  function render() {
    var el = S.pageEl && document.body.contains(S.pageEl) ? S.pageEl : mount();
    var h = '';
    if (S.screen === 'tuto') h = viewTuto();
    else if (S.screen === 'choice') h = viewChoice();
    else if (S.screen === 'form') h = viewForm();
    else if (S.screen === 'list') h = viewList();
    else if (S.screen === 'cred') h = viewCred();
    el.innerHTML = h;
    var b = el.querySelector('.fs-body'); if (b) b.scrollTop = 0;
  }

  function viewTuto() {
    var steps = [['s1t', 's1d'], ['s2t', 's2d'], ['s3t', 's3d'], ['s4t', 's4d'], ['s5t', 's5d'], ['s6t', 's6d']];
    var body = '<p class="ss-intro">' + esc(L('tuto_intro')) + '</p><ol class="ss-steps">' + steps.map(function (s, i) {
      return '<li><span class="ss-num">' + (i + 1) + '</span><div><b>' + esc(L(s[0])) + '</b><p>' + esc(i === 1 ? L(s[1], price()) : L(s[1])) + '</p></div></li>';
    }).join('') + '</ol><div class="ss-foot"><button type="button" class="btn btn-primary" data-ss="cont">' + esc(L('cont')) + '</button></div>';
    return shell(L('tuto_title'), L('tuto_sub'), body);
  }
  function choiceCard(act, icon, t, d) {
    return '<button type="button" class="ss-choice" data-ss="' + act + '"><span class="ss-ci">' + ic(icon, 24) + '</span><span class="ss-tx"><b>' + esc(t) + '</b><small>' + esc(d) + '</small></span><span class="ss-go">' + ic(I.chev, 18) + '</span></button>';
  }
  function viewChoice() {
    var n = S.list ? S.list.length : 0;
    var body = '<p class="ss-intro">' + esc(L('choice_sub')) + '</p>' +
      (S.hasSite ? choiceCard('own', I.site, L('has_t'), L('has_d')) : choiceCard('own', I.site, L('own_t'), L('own_d'))) +
      choiceCard('client', I.users, L('cli_t'), L('cli_d')) +
      (n ? choiceCard('list', I.user, L('mine_t'), L('mine_d', n)) : '');
    return shell(L('choice_title'), '', body, 'tuto');
  }
  function viewForm() {
    var f = S.form;
    var body = '<div class="ss-card"><div class="ss-h">' + esc(L('how_t')) + '</div><ol class="ss-how"><li>' + esc(L('how1')) + '</li><li>' + esc(L('how2')) + '</li><li>' + esc(L('how3')) + '</li></ol></div>' +
      '<form class="ss-card" id="ss-form" autocomplete="off" novalidate>' +
        '<label class="ss-lab" style="margin-top:0" for="ss-name">' + esc(L('f_name')) + '</label><input class="ss-in" id="ss-name" data-f="name" type="text" maxlength="60" placeholder="' + esc(L('f_name_ph')) + '" value="' + esc(f.name) + '">' +
        '<label class="ss-lab" for="ss-mail">' + esc(L('f_mail')) + '</label><input class="ss-in" id="ss-mail" data-f="email" type="email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="120" placeholder="' + esc(L('f_mail_ph')) + '" value="' + esc(f.email) + '"><p class="ss-hint">' + esc(L('f_mail_hint')) + '</p>' +
        '<label class="ss-lab" for="ss-phone">' + esc(L('f_phone')) + '</label><input class="ss-in" id="ss-phone" data-f="phone" type="tel" inputmode="tel" maxlength="24" placeholder="' + esc(L('f_phone_ph')) + '" value="' + esc(f.phone) + '"><p class="ss-hint">' + esc(L('f_phone_hint')) + '</p>' +
        (S.err ? '<div class="ss-err">' + esc(S.err) + '</div>' : '') +
      '</form>' +
      '<div class="ss-note">' + ic(I.info, 18) + '<span>' + esc(L('pay_note')) + '</span></div>' +
      '<div class="ss-foot"><button type="button" class="btn btn-primary" data-ss="create"' + (S.busy ? ' disabled' : '') + '>' + esc(S.busy ? L('creating') : L('create_btn')) + '</button></div>';
    return shell(L('form_title'), '', body, S.fromChoice === false ? 'close' : 'choice');
  }
  function dateOf(iso) { try { return new Date(iso).toLocaleDateString(lang() === 'fr' ? 'fr-FR' : lang(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
  function viewList() {
    var rows = S.list, body = '';
    if (!rows) body = '<p class="ss-intro">' + esc(L('loading')) + '</p>';
    else {
      body += '<div class="ss-foot" style="position:static;margin:0 0 14px;padding:0;border:0;background:none"><button type="button" class="btn btn-primary" data-ss="client">' + ic(I.plus, 16) + '<span style="margin-left:6px">' + esc(L('list_new')) + '</span></button></div>';
      if (!rows.length) body += '<p class="ss-intro">' + esc(L('list_empty')) + '</p>';
      body += rows.map(function (c) {
        var b = c.status === 'building';
        var chips = '<span class="ss-chip ' + (b ? 'wait' : 'ok') + '">' + esc(b ? L('st_building') : L('st_handed')) + '</span>';
        var meta = '';
        if (!c.hasSite) meta += '<span class="ss-chip no">' + esc(L('site_none')) + '</span>';
        else { meta += '<span class="ss-chip ' + (c.published ? 'ok' : 'no') + '">' + esc(c.published ? L('published') : L('draft')) + '</span><span class="ss-chip ' + (c.pro ? 'ok' : 'no') + '">' + esc(c.pro ? L('pro_on') : L('pro_off')) + '</span>'; }
        if (b) meta += '<span class="ss-chip no">' + esc(L('bal')) + ' : ' + esc(money(c.balance)) + '</span>';
        var acts = b
          ? '<button type="button" class="btn btn-primary btn-sm" data-ss="enter" data-u="' + esc(c.clientUid) + '">' + ic(I.login, 15) + '<span style="margin-left:6px">' + esc(L('enter')) + '</span></button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-ss="fund" data-u="' + esc(c.clientUid) + '">' + esc(L('fund')) + '</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-ss="del" data-u="' + esc(c.clientUid) + '" style="color:var(--red-text)">' + esc(L('del')) + '</button>'
          : (c.published && c.slug ? '<a class="btn btn-outline btn-sm" style="justify-content:center" target="_blank" rel="noopener" href="/s/' + encodeURIComponent(c.slug) + '">' + ic(I.ext, 15) + '<span style="margin-left:6px">' + esc(L('open')) + '</span></a>' : '');
        return '<div class="ss-card"><div class="ss-top"><div><div class="ss-nm">' + esc(c.name) + '</div><div class="ss-sub">' + esc(c.email) + (c.createdAt ? ' · ' + esc(dateOf(c.createdAt)) : '') + '</div></div>' + chips + '</div><div class="ss-meta">' + meta + '</div>' + (acts ? '<div class="ss-acts">' + acts + '</div>' : '') + '</div>';
      }).join('');
    }
    return shell(L('list_title'), '', body, S.fromChoice ? 'choice' : 'close');
  }
  function credMessage(ho) {
    var live = !!(ho.site && ho.site.published && ho.site.url);
    return L(live ? 'msg_live' : 'msg_draft', ho.clientName, (ho.site && ho.site.name) || ho.clientName, live ? ho.site.url : '', ho.email, ho.password);
  }
  function kv(label, value, key, big) {
    return '<div class="ss-kv"><div><small>' + esc(label) + '</small><code' + (big ? ' class="ss-big"' : '') + '>' + esc(value) + '</code></div><button type="button" class="btn btn-outline btn-sm" data-ss="copy" data-v="' + esc(value) + '">' + ic(I.copy, 14) + '<span style="margin-left:5px">' + esc(L('copy')) + '</span></button></div>';
  }
  function viewCred() {
    var ho = S.cred || {}, live = !!(ho.site && ho.site.published && ho.site.url);
    var body = '<div class="ss-note ok">' + ic(I.check, 18) + '<span>' + esc(L('cred_ok')) + '</span></div>' +
      '<div class="ss-card">' + (live ? kv(L('l_site'), ho.site.url) : '') + kv(L('l_mail'), ho.email) + kv(L('l_pass'), ho.password, 'p', true) + '</div>' +
      '<div class="ss-note wait">' + ic(I.info, 18) + '<span>' + esc(L('cred_warn')) + '</span></div>' +
      '<div class="ss-foot" style="position:static;margin:0;padding:0;border:0;background:none"><div class="ss-acts" style="margin-top:0;flex-direction:column">' +
        '<button type="button" class="btn btn-primary" data-ss="wa">' + ic(I.msg, 16) + '<span style="margin-left:6px">' + esc(L('wa')) + '</span></button>' +
        '<button type="button" class="btn btn-outline" data-ss="copymsg">' + ic(I.copy, 16) + '<span style="margin-left:6px">' + esc(L('copy_msg')) + '</span></button>' +
        '<button type="button" class="btn btn-outline" data-ss="creddone">' + esc(L('done')) + '</button></div></div>';
    return shell(L('cred_title', ho.clientName || ''), '', body, 'creddone');
  }

  /* ---------------- Fenêtres de confirmation ---------------- */
  function sheet(html) {
    var o = document.getElementById('ss-sheet'); if (o) o.remove();
    css();
    o = document.createElement('div'); o.id = 'ss-sheet';
    o.innerHTML = '<div class="ss-box">' + html + '</div>';
    o.addEventListener('click', function (e) { if (e.target === o) { o.remove(); return; } onClick(e); });
    document.body.appendChild(o);
    return o;
  }
  function closeSheet() { var o = document.getElementById('ss-sheet'); if (o) o.remove(); }

  /* ---------------- Actions ---------------- */
  function copy(text) {
    function ok() { toast(L('copied'), 'success'); }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, fallback); return; } } catch (e) { /* ignore */ }
    fallback();
    function fallback() { try { var t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); ok(); } catch (e) { toast(text); } }
  }
  function loadList() {
    return call('client_site_list').then(function (r) { S.list = r.clients || []; }).catch(function () { S.list = S.list || []; });
  }
  function checkSite() {
    var u = me(), a = authObj();
    if (!u) return Promise.resolve();
    try { return db.collection('mini_sites').doc(u.uid).get().then(function (s) { S.hasSite = !!s.exists; }).catch(function () { }); } catch (e) { return Promise.resolve(); }
  }
  function open(opts) {
    var o = opts || {};
    if (!me()) { try { if (typeof openAuth === 'function') openAuth('register'); } catch (e) { /* ignore */ } return; }
    S.err = ''; S.busy = false; S.fromChoice = true;
    S.screen = o.screen === 'list' ? 'list' : (o.screen === 'form' ? 'form' : 'tuto');
    if (o.screen === 'list' || o.screen === 'form') S.fromChoice = false;
    mount(); render();
    checkSite().then(function () { if (S.screen === 'choice') render(); });
    loadList().then(function () { if (S.screen === 'list' || S.screen === 'choice') render(); });
  }

  function createClient() {
    if (S.busy) return;
    var f = S.form;
    if (String(f.name || '').trim().length < 2) { S.err = L('e_name'); render(); return; }
    if (!/@/.test(f.email || '')) { S.err = L('e_mail'); render(); return; }
    S.err = ''; S.busy = true; render();
    call('client_site_create', { name: f.name, email: f.email, phone: f.phone }).then(function (r) {
      S.form = { name: '', email: '', phone: '' };
      return enterClient(r.clientUid, 'gate', f.phone);
    }).catch(function (e) { S.busy = false; S.err = e && e.message ? e.message : L('err'); render(); });
  }

  // L'agent entre dans le compte du client. La clé de retour reste dans ce téléphone ; le serveur n'en garde que l'empreinte.
  function enterClient(uid, next, phone) {
    var a = authObj(), u = me();
    return call('client_site_enter', { clientUid: uid }).then(function (r) {
      var st = { uid: r.client.uid, name: r.client.name, email: r.client.email, phone: r.client.phone || phone || '', key: r.returnKey, agent: u ? u.uid : '', next: next || '', at: Date.now() };
      try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) { throw new Error(L('err_store')); }
      return a.signInWithCustomToken(r.customToken);
    }).then(function () { try { location.reload(); } catch (e) { /* ignore */ } });
  }

  function leaveClient(token) {
    return authObj().signInWithCustomToken(token).then(function () { try { location.reload(); } catch (e) { /* ignore */ } });
  }
  function backToMe() {
    var st = readLs(); if (!st) { try { localStorage.removeItem(LS); } catch (e) { /* ignore */ } removeBar(); return; }
    toast(L('back_wait'));
    call('client_site_back', { returnKey: st.key }).then(function (r) {
      try { localStorage.removeItem(LS); } catch (e) { /* ignore */ }
      return leaveClient(r.customToken);
    }).catch(function (e) { toast(e && e.message ? e.message : L('err'), 'error'); });
  }
  function handoverSheet() {
    var st = readLs(), u = me(); if (!st || !u) return;
    var o = sheet('<h3>' + esc(L('hand_t', st.name)) + '</h3><p>' + esc(L('hand_d')) + '</p><div id="ss-hs"><p>' + esc(L('loading')) + '</p></div><div class="ss-btns"><button type="button" class="btn btn-outline" data-ss="sheetx">' + esc(L('cancel')) + '</button><button type="button" class="btn btn-primary" data-ss="handgo" disabled id="ss-hgo">' + esc(L('hand_go')) + '</button></div>');
    try {
      db.collection('mini_sites').doc(u.uid).get().then(function (s) {
        var box = o.querySelector('#ss-hs'), go = o.querySelector('#ss-hgo'); if (!box) return;
        if (!s.exists) { box.innerHTML = '<div class="ss-note wait">' + ic(I.info, 18) + '<span>' + esc(L('hand_nosite')) + '</span></div>'; return; }
        var d = s.data(), live = d.status === 'published';
        box.innerHTML = '<div class="ss-note ' + (live ? 'ok' : 'wait') + '">' + ic(live ? I.check : I.info, 18) + '<span>' + esc(live ? L('hand_live') : L('hand_draft')) + '</span></div>';
        if (go) go.disabled = false;
      }).catch(function () { var box = o.querySelector('#ss-hs'), go = o.querySelector('#ss-hgo'); if (box) box.innerHTML = ''; if (go) go.disabled = false; });
    } catch (e) { var g = o.querySelector('#ss-hgo'); if (g) g.disabled = false; }
  }
  function handoverNow() {
    var st = readLs(); if (!st) return;
    var go = document.getElementById('ss-hgo'); if (go) { go.disabled = true; go.textContent = L('hand_wait'); }
    call('client_site_handover', { returnKey: st.key }).then(function (r) {
      var ho = { agent: st.agent, email: r.email, password: r.password, clientName: r.clientName || st.name, phone: st.phone || '', site: r.site || {} };
      try { sessionStorage.setItem(SS, JSON.stringify(ho)); } catch (e) { /* le mot de passe reste affiché dans la page */ S.cred = ho; }
      try { localStorage.removeItem(LS); } catch (e) { /* ignore */ }
      return leaveClient(r.customToken);
    }).catch(function (e) {
      if (go) { go.disabled = false; go.textContent = L('hand_go'); }
      var box = document.getElementById('ss-hs'); if (box) box.insertAdjacentHTML('beforeend', '<div class="ss-err">' + esc(e && e.message ? e.message : L('err')) + '</div>');
    });
  }
  function fundSheet(uid) {
    var c = (S.list || []).filter(function (x) { return x.clientUid === uid; })[0]; if (!c) return;
    var my = me() ? me().balance : 0;
    sheet('<h3>' + esc(L('fund_t')) + '</h3><p>' + esc(c.name) + '</p>' +
      '<div class="ss-card" style="margin:0 0 10px"><small style="color:var(--muted)">' + esc(L('fund_my')) + '</small><div class="ss-nm">' + esc(money(my)) + '</div></div>' +
      '<label class="ss-lab" style="margin-top:0" for="ss-amt">' + esc(L('fund_amount')) + '</label><input class="ss-in" id="ss-amt" type="number" inputmode="decimal" min="1" max="500" step="0.5" placeholder="5">' +
      '<p class="ss-hint" style="margin-top:8px">' + esc(L('fund_note')) + '</p><div id="ss-fe"></div>' +
      '<div class="ss-btns"><button type="button" class="btn btn-outline" data-ss="sheetx">' + esc(L('cancel')) + '</button><button type="button" class="btn btn-primary" data-ss="fundgo" data-u="' + esc(uid) + '">' + esc(L('fund_go')) + '</button></div>');
  }
  function fundNow(uid, btn) {
    var inp = document.getElementById('ss-amt'), err = document.getElementById('ss-fe'), v = Number(inp && inp.value);
    if (!(v >= 1 && v <= 500)) { if (err) err.innerHTML = '<div class="ss-err">' + esc(L('e_amount')) + '</div>'; return; }
    btn.disabled = true;
    call('client_site_fund', { clientUid: uid, amount: v }).then(function (r) {
      try { if (me()) me().balance = r.balance; var w = document.getElementById('wallet-balance'); if (w) w.textContent = Number(r.balance).toFixed(2) + '$'; } catch (e) { /* ignore */ }
      closeSheet(); toast(L('fund_ok', String(v)), 'success');
      return loadList();
    }).then(function () { if (S.screen === 'list') render(); }).catch(function (e) { btn.disabled = false; if (err) err.innerHTML = '<div class="ss-err">' + esc(e && e.message ? e.message : L('err')) + '</div>'; });
  }
  function delSheet(uid) {
    var c = (S.list || []).filter(function (x) { return x.clientUid === uid; })[0]; if (!c) return;
    sheet('<h3>' + esc(L('del_t')) + '</h3><p><b>' + esc(c.name) + '</b></p><p>' + esc(L('del_d')) + '</p><div id="ss-fe"></div><div class="ss-btns"><button type="button" class="btn btn-outline" data-ss="sheetx">' + esc(L('cancel')) + '</button><button type="button" class="btn btn-primary" data-ss="delgo" data-u="' + esc(uid) + '" style="background:var(--red-text);border-color:var(--red-text)">' + esc(L('del_go')) + '</button></div>');
  }
  function delNow(uid, btn) {
    btn.disabled = true;
    call('client_site_remove', { clientUid: uid }).then(function () {
      closeSheet(); toast(L('del_ok'), 'success'); return loadList();
    }).then(function () { if (S.screen === 'list') render(); }).catch(function (e) { btn.disabled = false; var err = document.getElementById('ss-fe'); if (err) err.innerHTML = '<div class="ss-err">' + esc(e && e.message ? e.message : L('err')) + '</div>'; });
  }

  function onClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-ss]') : null;
    if (!el) return;
    var act = el.getAttribute('data-ss'), u = el.getAttribute('data-u');
    if (act === 'close') { closePage(); return; }
    if (act === 'sheetx') { closeSheet(); return; }
    if (act === 'tuto') { S.screen = 'tuto'; render(); return; }
    if (act === 'cont') { S.screen = 'choice'; render(); return; }
    if (act === 'choice') { S.screen = 'choice'; render(); return; }
    if (act === 'own') {
      closePage();
      try { if (S.hasSite) { if (typeof openMainMenu === 'function') openMainMenu(); if (typeof openSiteBuilderScreen === 'function') openSiteBuilderScreen(); } else if (typeof openSiteTypeGate === 'function') openSiteTypeGate(); } catch (er) { /* ignore */ }
      return;
    }
    if (act === 'client') { S.err = ''; S.screen = 'form'; render(); return; }
    if (act === 'list') { S.screen = 'list'; render(); loadList().then(function () { if (S.screen === 'list') render(); }); return; }
    if (act === 'create') { createClient(); return; }
    if (act === 'enter') { el.disabled = true; toast(L('entering')); enterClient(u, 'gate').catch(function (er) { el.disabled = false; toast(er && er.message ? er.message : L('err'), 'error'); }); return; }
    if (act === 'fund') { fundSheet(u); return; }
    if (act === 'fundgo') { fundNow(u, el); return; }
    if (act === 'del') { delSheet(u); return; }
    if (act === 'delgo') { delNow(u, el); return; }
    if (act === 'barback') { backToMe(); return; }
    if (act === 'barhand') { handoverSheet(); return; }
    if (act === 'handgo') { handoverNow(); return; }
    if (act === 'copy') { copy(el.getAttribute('data-v') || ''); return; }
    if (act === 'copymsg') { copy(credMessage(S.cred)); return; }
    if (act === 'wa') {
      var ho = S.cred || {}, ph = String(ho.phone || '').replace(/\D/g, '');
      var url = 'https://wa.me/' + (ph.length >= 8 ? ph : '') + '?text=' + encodeURIComponent(credMessage(ho));
      try { window.open(url, '_blank', 'noopener'); } catch (er) { location.href = url; }
      return;
    }
    if (act === 'creddone') { try { sessionStorage.removeItem(SS); } catch (er) { /* ignore */ } S.cred = null; closePage(); return; }
  }

  /* ---------------- Bandeau « mode client » ---------------- */
  function removeBar() {
    var b = document.getElementById('ss-bar'); if (b) b.remove();
    document.body.classList.remove('ss-cm'); document.documentElement.style.removeProperty('--ss-h');
  }
  function showBar(st) {
    css(); removeBar();
    var b = document.createElement('div'); b.id = 'ss-bar';
    b.innerHTML = '<div class="ss-bt"><b>' + esc(L('bar_t', st.name)) + '</b><span>' + esc(L('bar_s')) + '</span></div>' +
      '<button type="button" class="go" data-ss="barhand">' + esc(L('bar_hand')) + '</button><button type="button" data-ss="barback">' + esc(L('bar_back')) + '</button>';
    b.addEventListener('click', onClick);
    document.body.insertBefore(b, document.body.firstChild);
    document.body.classList.add('ss-cm');
    document.documentElement.style.setProperty('--ss-h', b.offsetHeight + 'px');
  }
  // Après l'entrée dans le compte du client : on ouvre directement le choix du type de site, puis la page « Mon site ».
  function goBuild() {
    try { if (typeof openMainMenu === 'function') openMainMenu(); if (typeof openSiteBuilderScreen === 'function') openSiteBuilderScreen(); } catch (e) { /* ignore */ }
    var u = me(); if (!u) return;
    try {
      db.collection('mini_sites').doc(u.uid).get().then(function (s) { if (!s.exists && typeof openSiteTypeGate === 'function') openSiteTypeGate(); }).catch(function () { });
    } catch (e) { /* ignore */ }
  }

  // Appelé par l'application une fois l'utilisateur connecté, seulement s'il y a un mode client ou une remise à afficher.
  function boot() {
    var u = me(); if (!u) return;
    var st = readLs();
    if (st) {
      if (st.uid === u.uid) {
        showBar(st);
        if (st.next) { st.next = ''; try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) { /* ignore */ } setTimeout(goBuild, 350); }
      } else { try { localStorage.removeItem(LS); } catch (e) { /* ignore */ } removeBar(); }
    } else removeBar();
    var ho = readSs();
    if (ho && ho.agent === u.uid && !document.getElementById('ss-page')) { css(); S.cred = ho; S.screen = 'cred'; mount(); render(); }
  }

  window.CNSiteStart = { open: open, boot: boot, openClients: function () { open({ screen: 'list' }); }, __dict: D };
})();
