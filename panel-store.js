/* Coeurnoh Universe — Panel de croissance (boutique du panel + espace propriétaire).
   1) Boutique cliente : s'ouvre via /?panel=<adresse-du-site> (depuis la page publique /panel/<adresse>).
      Nouvelle commande · Liste des services · Mes commandes · Aide. Paiement par solde, recharge sans quitter la boutique.
   2) Espace propriétaire : tuile « Panel de croissance » dans le tableau de bord du site (marge, activation, ventes, gains).
   Tous les prix et paiements sont calculés par le serveur ; ce fichier n'envoie jamais de prix. */
(function () {
  'use strict';
  if (window.__cnPanelStore) return; window.__cnPanelStore = true;
  var tries = 0;
  function go() { if (typeof auth === 'undefined' || typeof escapeHtml !== 'function') { if (++tries < 160) setTimeout(go, 250); return; } main(); }

  var SA = !!window.__CN_STANDALONE; // page autonome du panel (hors application)
  var S = { slug: '', store: null, tab: 'new', sel: null, rid: '', q: '', busy: false };
  var LS = 'cn_pm_return';
  var ST = { pending: ['En attente', 'w'], processing: ['En cours', 'i'], completed: ['Terminé', 'g'], partial: ['Partiel', 'w'], refunded: ['Remboursé', 'n'], pending_review: ['En vérification', 'w'] };
  function pIcon(pid, nm) {
    try { var p = (typeof PLATFORMS !== 'undefined' ? PLATFORMS : []).filter(function (x) { return x.id === pid; })[0]; if (p && typeof platformBadgeHTML === 'function') return '<span class="pm-pi">' + platformBadgeHTML(p) + '</span>'; } catch (e) { /* ignore */ }
    return '<span class="pm-pi"><span class="p-icon" style="background:#1f2f4d;color:#fff">' + esc(String(nm || pid || '?').charAt(0)) + '</span></span>';
  }

  function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
  function money(n) { n = Number(n) || 0; return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' $'; }
  function money4(n) { n = Number(n) || 0; return (Math.round(n * 10000) / 10000).toFixed(n < 1 ? 3 : 2).replace('.', ',') + ' $'; }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '') : String(Date.now()) + Math.random().toString(16).slice(2); }
  async function api(action, body) {
    if (window.__CN_PREVIEW_STORE) throw new Error('Aperçu : publie ton panel pour recevoir de vraies commandes.');
    if (!auth.currentUser) throw new Error('Connecte-toi pour continuer.');
    var idToken = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body || {})) });
    var j = await r.json(); if (!j.success) { var e = new Error(j.error || 'Erreur'); throw e; } return j;
  }
  function lsSet(v) { try { localStorage.setItem(LS, v); } catch (e) { /* ignore */ } }
  function lsGet() { try { return localStorage.getItem(LS) || ''; } catch (e) { return ''; } }
  function lsDel() { try { localStorage.removeItem(LS); } catch (e) { /* ignore */ } }

  var CSS = '.pm-ov{position:fixed;inset:0;z-index:100000;background:#f3f5f9;color:#14213d;overflow:auto;-webkit-overflow-scrolling:touch;font-family:inherit}' +
    '.pm-in{max-width:760px;margin:0 auto;padding:0 0 96px}.pm-top{position:sticky;top:0;z-index:2;background:var(--pm-a,#1b4fd8);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px}' +
    '.pm-top img{width:38px;height:38px;border-radius:10px;object-fit:cover;background:#fff}.pm-top h1{font-size:1.02rem;margin:0;line-height:1.2;flex:1;min-width:0}.pm-top small{display:block;font-weight:400;opacity:.85;font-size:.74rem}' +
    '.pm-x{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:10px;width:36px;height:36px;font-size:1.1rem;cursor:pointer}' +
    '.pm-bal{display:flex;gap:10px;align-items:center;justify-content:space-between;background:#fff;margin:12px 14px;border-radius:16px;padding:12px 14px;box-shadow:0 1px 4px rgba(20,33,61,.08)}.pm-bal b{font-size:1.25rem}.pm-bal span{font-size:.75rem;color:#5b6475;display:block}' +
    '.pm-tabs{display:flex;gap:6px;margin:0 14px 12px;overflow-x:auto}.pm-tabs button{flex:1;white-space:nowrap;border:1px solid #d5dbe6;background:#fff;border-radius:12px;padding:10px 12px;font:inherit;font-weight:700;font-size:.84rem;cursor:pointer;color:inherit}.pm-tabs button.on{background:var(--pm-a,#1b4fd8);border-color:var(--pm-a,#1b4fd8);color:#fff}' +
    '.pm-card{background:#fff;border-radius:16px;margin:0 14px 12px;padding:14px;box-shadow:0 1px 4px rgba(20,33,61,.08)}.pm-card h2{font-size:.95rem;margin:0 0 8px}.pm-f{margin:11px 0}.pm-f label{display:block;font-size:.78rem;font-weight:700;color:#5b6475;margin-bottom:5px}' +
    '.pm-f input,.pm-f select,.pm-f textarea{width:100%;box-sizing:border-box;border:1px solid #d5dbe6;border-radius:12px;padding:11px 12px;font:inherit;background:#fff;color:#14213d}' +
    '.pm-b{border:1px solid #d5dbe6;background:#fff;border-radius:12px;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer;color:inherit}.pm-b.p{background:var(--pm-a,#1b4fd8);border-color:var(--pm-a,#1b4fd8);color:#fff}.pm-b.w{width:100%}.pm-b[disabled]{opacity:.55}' +
    '.pm-n{font-size:.78rem;color:#5b6475;margin:6px 0}.pm-sum{background:#eef3ff;border-radius:12px;padding:11px 12px;font-size:.86rem;margin:12px 0}.pm-sum b{font-size:1.1rem}.pm-err{color:#b42318;font-size:.84rem;margin:8px 0}' +
    '.pm-row{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #e9edf4;font-size:.84rem}.pm-row:last-child{border:0}.pm-row small{display:block;color:#5b6475;font-size:.74rem;margin-top:2px;word-break:break-all}' +
    '.pm-bd{display:inline-block;border-radius:99px;padding:3px 9px;font-size:.7rem;font-weight:800;white-space:nowrap}.pm-bd.g{background:#dcfce7;color:#166534}.pm-bd.i{background:#dbeafe;color:#1e40af}.pm-bd.w{background:#fef3c7;color:#92400e}.pm-bd.n{background:#e5e7eb;color:#374151}' +
    '.pm-g{font-size:.74rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#5b6475;margin:14px 0 4px}.pm-pr{font-weight:800;white-space:nowrap;text-align:right}' +
    '.pm-tr{display:flex;gap:8px;flex-wrap:wrap;margin:8px 14px 0}.pm-tr span{font-size:.72rem;background:#fff;border-radius:99px;padding:5px 10px;color:#374151;box-shadow:0 1px 3px rgba(20,33,61,.08)}' +
    '.pm-top{gap:8px}.pm-chip{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:99px;padding:8px 12px;font:inherit;font-weight:800;font-size:.8rem;cursor:pointer;white-space:nowrap}' +
    '.pm-nav{position:fixed;left:0;right:0;bottom:0;z-index:3;display:flex;background:#fff;border-top:1px solid #d5dbe6;padding:6px 4px calc(6px + env(safe-area-inset-bottom));box-shadow:0 -4px 16px rgba(20,33,61,.08)}.pm-nav button{flex:1;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:2px;font:inherit;font-size:.66rem;font-weight:700;color:#5b6475;padding:6px 2px;cursor:pointer;min-width:0}.pm-nav button.on{color:var(--pm-a,#1b4fd8)}.pm-nav button span{white-space:nowrap}' +
    '.pm-pi{display:inline-flex}.pm-pi .p-icon{width:38px!important;height:38px!important;border-radius:11px!important;display:flex;align-items:center;justify-content:center}.pm-pi .p-icon svg{width:20px;height:20px}.pm-g{display:flex;align-items:center;gap:10px;margin:16px 0 6px!important}.pm-g span{font-size:.8rem}' +
    '.pm-ref{background:#eef3ff;border-radius:14px;padding:12px 14px;font-size:.84rem;line-height:1.5;margin:10px 0}.pm-link{word-break:break-all;background:#fff;border:1px dashed #9db4e6;border-radius:10px;padding:9px 10px;font-size:.8rem;margin:8px 0}.pm-kpi{display:flex;gap:8px;margin:8px 0}.pm-kpi div{flex:1;background:#fff;border-radius:12px;padding:10px;text-align:center;border:1px solid #e3e8f2}.pm-kpi b{display:block;font-size:1.05rem}.pm-kpi span{font-size:.7rem;color:#5b6475}' +
    '.pm-hero{background:#1f2f4d;color:#fff}.pm-hero h2{color:#fff;font-size:1.1rem}.pm-hero p{font-size:.88rem;line-height:1.5;margin:6px 0 12px;color:#d7e4f5}.pm-cta{background:var(--pm-a,#1b4fd8);border-color:var(--pm-a,#1b4fd8);color:#fff}.pm-big{font-size:2rem;font-weight:800;margin:4px 0 12px}' +
    '.pm-stats{display:flex;gap:8px;margin:0 14px 12px}.pm-stats div{flex:1;background:#fff;border-radius:14px;padding:10px 6px;text-align:center;box-shadow:0 1px 4px rgba(20,33,61,.08)}.pm-stats b{display:block;font-size:1.1rem}.pm-stats span{font-size:.7rem;color:#5b6475}' +
    '.pm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pm-plat{border:1px solid #d5dbe6;background:#fff;border-radius:14px;padding:12px 4px;font:inherit;cursor:pointer;color:inherit;display:flex;flex-direction:column;align-items:center;gap:4px}.pm-plat span{font-size:1.3rem}.pm-plat b{font-size:.74rem}' +
'@media(prefers-color-scheme:dark){.pm-ov{background:#0e1424;color:#e6eaf3}.pm-bal,.pm-card,.pm-nav,.pm-stats div,.pm-plat,.pm-b{background:#182036;color:#e6eaf3;border-color:#2a3553}.pm-f input,.pm-f select,.pm-f textarea{background:#101830;color:#e6eaf3;border-color:#2a3553}.pm-sum{background:#14264d}.pm-row{border-color:#2a3553}.pm-n,.pm-bal span,.pm-row small,.pm-g,.pm-f label{color:#9aa6c0}.pm-tabs button.on,.pm-b.p{color:#fff}}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function close() { if (SA && S.slug) { openStore(S.slug); return; } var o = document.getElementById('pm-ov'); if (o) o.remove(); document.body.style.overflow = ''; try { var u = new URL(location.href); if (u.searchParams.has('panel')) { u.searchParams.delete('panel'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } } catch (e) { /* ignore */ } }

  async function loadStore(slug) {
    var r = await fetch('/api/render-site?pstore=' + encodeURIComponent(slug) + '&json=1'); var j = await r.json();
    if (!j.success) throw new Error(j.error || 'Panel introuvable.'); return j;
  }
  async function openStore(slug) {
    slug = String(slug || '').toLowerCase(); if (!/^[a-z0-9-]{3,30}$/.test(slug)) return;
    S.slug = slug; S.tab = 'home'; S.sel = null; S.rid = uid();
    try { var rq = new URL(location.href).searchParams.get('ref'); if (rq && /^[A-Za-z0-9_-]{6,128}$/.test(rq)) localStorage.setItem('cn_pm_ref_' + slug, rq); } catch (e) { /* ignore */ }
    var o = document.getElementById('pm-ov'); if (o) o.remove();
    o = document.createElement('div'); o.className = 'pm-ov'; o.id = 'pm-ov'; o.innerHTML = '<div class="pm-in"><p class="pm-n" style="padding:30px;text-align:center">Chargement du panel…</p></div>';
    document.body.appendChild(o); document.body.style.overflow = 'hidden';
    try { S.store = window.__CN_PREVIEW_STORE || await loadStore(slug); } catch (e) { o.innerHTML = '<div class="pm-in"><div class="pm-card" style="margin-top:30px"><h2>Panel indisponible</h2><p class="pm-n">' + esc(e.message) + '</p><button class="pm-b p" id="pm-close">Fermer</button></div></div>'; o.querySelector('#pm-close').onclick = close; return; }
    if (S.store.shop.accent) o.style.setProperty('--pm-a', S.store.shop.accent);
    render();
  }

  var NAV = [['home', 'Accueil', 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'], ['svc', 'Services', 'M4 6h16M4 12h16M4 18h16'], ['new', 'Commander', 'M12 5v14M5 12h14'], ['ord', 'Historique', 'M9 4h6l1 2h3v14H5V6h3zM9 12h6M9 16h4'], ['wal', 'Portefeuille', 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h3']];
  function render() {
    var o = document.getElementById('pm-ov'); if (!o || !S.store) return; var sh = S.store.shop, logged = !!auth.currentUser;
    o.innerHTML = '<div class="pm-in"><div class="pm-top">' + (sh.logo ? '<img src="' + esc(sh.logo) + '" alt="">' : '') + '<h1>' + esc(sh.name || 'Panel') + '<small>' + esc(S.store.title) + '</small></h1>' +
      (logged ? '<button class="pm-chip" id="pm-balchip" aria-label="Mon solde">…</button>' : '<button class="pm-chip" id="pm-login">Se connecter</button>') + (SA ? (logged ? (S.isOwner ? '<button class="pm-chip" id="pm-admin">Admin</button>' : '') + '<button class="pm-chip" id="pm-out">Quitter</button>' : '') : '<button class="pm-x" id="pm-close" aria-label="Fermer">✕</button>') + '</div><div id="pm-pane"></div></div>' +
      '<nav class="pm-nav" aria-label="Menu du panel">' + NAV.map(function (n) { return '<button type="button" data-t="' + n[0] + '" class="' + (S.tab === n[0] ? 'on' : '') + '"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + n[2] + '"/></svg><span>' + n[1] + '</span></button>'; }).join('') + '</nav>';
    var cl = o.querySelector('#pm-close'); if (cl) cl.onclick = close;
    var ad = o.querySelector('#pm-admin'); if (ad) ad.onclick = openOwner;
    var ou = o.querySelector('#pm-out'); if (ou) ou.onclick = function () { S.isOwner = undefined; auth.signOut().then(render); };
    var lb = o.querySelector('#pm-login'); if (lb) lb.onclick = function () { if (SA) { loginModal(); return; } lsSet(S.slug + '|' + Date.now()); close(); try { openAuth('login'); } catch (e) { /* ignore */ } };
    var bc = o.querySelector('#pm-balchip'); if (bc) bc.onclick = function () { S.tab = 'wal'; render(); };
    o.querySelectorAll('.pm-nav [data-t]').forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-t'); render(); o.scrollTop = 0; }; });
    ({ home: paneHome, new: paneNew, svc: paneSvc, ord: paneOrd, wal: paneWallet })[S.tab](o.querySelector('#pm-pane'));
    if (logged) refreshBalance();
    if (SA && logged && S.isOwner === undefined) { S.isOwner = false; api('pm_owner_get').then(function (r) { if (r && r.slug === S.slug && r.cfg && r.cfg.on) { S.isOwner = true; render(); } }).catch(function () { }); }
  }

  function refBlock(box) {
    if (!auth.currentUser) { box.innerHTML = ''; return; }
    var pct = S.store.refPct || 0;
    if (!pct) { box.innerHTML = ''; return; }
    var link = location.origin + '/panel/' + S.slug + '?ref=' + auth.currentUser.uid;
    box.innerHTML = '<div class="pm-card"><h2>Parrainage</h2><p class="pm-n">Invite tes amis : tu gagnes <b>' + pct + ' %</b> de la marge du panel sur leurs commandes, ajouté à ton solde automatiquement.</p><div class="pm-link" id="pm-rlink">' + esc(link) + '</div>' +
      '<div class="pm-kpi"><div><b id="pm-rc">…</b><span>Filleuls</span></div><div><b id="pm-re">…</b><span>Gains</span></div></div><button class="pm-b p w" id="pm-rcopy">Copier mon lien</button><button class="pm-b w" id="pm-rshare" style="margin-top:8px">Partager</button></div>';
    box.querySelector('#pm-rcopy').onclick = function () { try { navigator.clipboard.writeText(link); toast('Lien copié', 'success'); } catch (e) { toast(link); } };
    box.querySelector('#pm-rshare').onclick = function () { if (navigator.share) { navigator.share({ title: S.store.shop.name, text: 'Commande tes services de croissance ici :', url: link }).catch(function () { }); } else { box.querySelector('#pm-rcopy').click(); } };
    api('pm_ref', { slug: S.slug }).then(function (r) { var a = box.querySelector('#pm-rc'), b = box.querySelector('#pm-re'); if (a) a.textContent = r.count; if (b) b.textContent = money(r.earned); }).catch(function () { });
  }
  function goRecharge() { if (SA) { rechargeModal(); return; } lsSet(S.slug + '|' + Date.now()); close(); try { showRecharge(); } catch (e) { toast('Ouvre ton portefeuille pour recharger.'); } }
  function paneHome(pane) {
    var g = groups(), names = Object.keys(g), n = (S.store.items || []).length;
    pane.innerHTML = '<div class="pm-card pm-hero"><h2>' + esc(S.store.title) + '</h2><p>' + esc(S.store.welcome || S.store.shop.tagline || 'Abonnés, likes, vues et plus pour tes réseaux sociaux. Livraison rapide, paiement simple.') + '</p><button class="pm-b w pm-cta" id="pm-h-go">Commander maintenant</button></div>' +
      '<div class="pm-stats"><div><b>' + names.length + '</b><span>Réseaux</span></div><div><b>' + n + '</b><span>Services</span></div><div><b>24/7</b><span>Automatique</span></div></div>' +
      '<div class="pm-card"><h2>Choisis un réseau</h2><div class="pm-grid">' + names.map(function (nm) { var pid = g[nm][0].platform; return '<button type="button" class="pm-plat" data-g="' + esc(nm) + '">' + pIcon(pid, nm) + '<b>' + esc(nm) + '</b></button>'; }).join('') + '</div></div>' +
      '<div class="pm-card"><h2>Comment ça marche</h2><p class="pm-n"><b>1.</b> Recharge ton solde (Portefeuille).<br><b>2.</b> Choisis le service, colle ton lien, indique la quantité.<br><b>3.</b> La commande part automatiquement ; suis-la dans « Historique ».<br><b>4.</b> Si elle n’aboutit pas, tu es remboursé automatiquement.</p></div>';
    pane.querySelector('#pm-h-go').onclick = function () { S.tab = 'new'; render(); };
    pane.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { S.sel = (g[b.getAttribute('data-g')] || [])[0]; S.tab = 'new'; render(); }; });
    var rbx = document.createElement('div'); pane.appendChild(rbx); refBlock(rbx);
    var h = document.createElement('div'); pane.appendChild(h); paneHelp(h);
  }
  function paneWallet(pane) {
    if (!auth.currentUser) { pane.innerHTML = '<div class="pm-card"><h2>Portefeuille</h2><p class="pm-n">Connecte-toi pour voir ton solde et recharger.</p><button class="pm-b p w" id="pm-lg3">Se connecter</button></div>'; pane.querySelector('#pm-lg3').onclick = function () { document.getElementById('pm-login').click(); }; return; }
    pane.innerHTML = '<div class="pm-card pm-hero"><p style="margin:0;opacity:.85">Solde disponible</p><div class="pm-big" id="pm-wbal">…</div><button class="pm-b w pm-cta" id="pm-w-rc">+ Recharger mon solde</button><p class="pm-n" style="color:#d7e4f5">Mobile Money, carte ou crypto selon ton pays.</p></div><div id="pm-refbox"></div><div class="pm-card"><h2>Derniers mouvements</h2><div id="pm-wtx"><p class="pm-n">Chargement…</p></div></div>';
    refBlock(pane.querySelector('#pm-refbox'));
    pane.querySelector('#pm-w-rc').onclick = goRecharge;
    api('pm_orders', { slug: S.slug }).then(function (r) { var el = pane.querySelector('#pm-wbal'); if (el) el.textContent = money(r.balance); }).catch(function () { });
    var LBL = { order_purchase: 'Commande', order_refund: 'Remboursement', panel_income: 'Marge panel', panel_referral: 'Parrainage', panel_referral_reversed: 'Parrainage annulé', topup: 'Recharge', deposit: 'Recharge' };
    try {
      db.collection('wallet_transactions').where('uid', '==', auth.currentUser.uid).limit(60).get().then(function (sn) {
        var rows = sn.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 15);
        pane.querySelector('#pm-wtx').innerHTML = rows.length ? rows.map(function (t) { var pos = (t.amount || 0) >= 0; return '<div class="pm-row"><div><b>' + esc(LBL[t.type] || t.type) + '</b><small>' + esc((t.description || '').slice(0, 70)) + '<br>' + esc(new Date(t.createdAt).toLocaleString('fr-FR')) + '</small></div><div class="pm-pr" style="color:' + (pos ? '#166534' : '#b42318') + '">' + (pos ? '+' : '') + money(t.amount) + '</div></div>'; }).join('') : '<p class="pm-n">Aucun mouvement pour l’instant.</p>';
      }).catch(function () { pane.querySelector('#pm-wtx').innerHTML = '<p class="pm-n">Historique indisponible.</p>'; });
    } catch (e) { /* ignore */ }
  }
  function refreshBalance() { api('pm_orders', { slug: S.slug }).then(function (r) { var el = document.getElementById('pm-balchip'); if (el) el.textContent = money(r.balance); S.bal = r.balance; }).catch(function () { var el = document.getElementById('pm-balchip'); if (el) el.textContent = '—'; }); }

  function groups() { var g = {}; (S.store.items || []).forEach(function (x) { (g[x.group] = g[x.group] || []).push(x); }); return g; }
  function paneNew(pane) {
    var g = groups(), names = Object.keys(g); if (!names.length) { pane.innerHTML = '<div class="pm-card"><p class="pm-n">Aucun service disponible pour le moment.</p></div>'; return; }
    var curGroup = S.sel ? S.sel.group : names[0];
    var svcs = g[curGroup] || [];
    if (!S.sel || S.sel.group !== curGroup) S.sel = svcs[0];
    pane.innerHTML = '<div class="pm-card"><h2>Nouvelle commande</h2>' + (S.store.welcome ? '<p class="pm-n">' + esc(S.store.welcome) + '</p>' : '') + '<div class="pm-f" style="margin-top:0">' + (S.sel ? pIcon(S.sel.platform, S.sel.group) : '') + '</div>' +
      '<div class="pm-f"><label for="pm-g">Réseau</label><select id="pm-g">' + names.map(function (n) { return '<option' + (n === curGroup ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>' +
      '<div class="pm-f"><label for="pm-s">Service</label><select id="pm-s">' + svcs.map(function (x) { return '<option value="' + esc(x.id) + '"' + (S.sel && S.sel.id === x.id ? ' selected' : '') + '>' + esc(x.name) + ' — ' + money(x.per1000) + ' / 1000</option>'; }).join('') + '</select></div>' +
      '<p class="pm-n" id="pm-info"></p>' +
      '<div class="pm-f"><label for="pm-l">Lien ou nom du compte</label><input id="pm-l" maxlength="300" placeholder="https://… ou @compte" autocomplete="off" inputmode="url"></div>' +
      '<div class="pm-f"><label for="pm-q">Quantité</label><input id="pm-q" inputmode="numeric" maxlength="8" placeholder=""></div>' +
      '<div class="pm-sum">Total à payer : <b id="pm-tot">0,00 $</b><div class="pm-n" id="pm-rng"></div></div><p class="pm-err" id="pm-err"></p>' +
      '<button class="pm-b p w" id="pm-go">Commander</button><p class="pm-n">Le montant est débité de ton solde. Si le service n’aboutit pas, tu es remboursé automatiquement.</p></div>';
    var sel = pane.querySelector('#pm-s'), qty = pane.querySelector('#pm-q'), err = pane.querySelector('#pm-err');
    function upd() { var x = S.sel; if (!x) return; pane.querySelector('#pm-info').textContent = x.info || ''; pane.querySelector('#pm-rng').textContent = 'Min ' + x.min + ' · Max ' + x.max.toLocaleString('fr-FR') + ' · ' + money4(x.per1000) + ' / 1000';
      var q = parseInt(qty.value, 10), t = (q > 0) ? Math.max(0.01, Math.ceil(x.per1000 * q / 1000 * 100 - 1e-9) / 100) : 0; pane.querySelector('#pm-tot').textContent = money(t); qty.placeholder = String(x.min); }
    pane.querySelector('#pm-g').onchange = function () { S.sel = (g[this.value] || [])[0]; paneNew(pane); };
    sel.onchange = function () { S.sel = svcs.filter(function (x) { return String(x.id) === sel.value; })[0]; upd(); };
    qty.oninput = upd; upd();
    pane.querySelector('#pm-go').onclick = async function () {
      var b = this; err.textContent = '';
      if (!auth.currentUser) { lsSet(S.slug + '|' + Date.now()); close(); try { openAuth('login'); } catch (e) { /* ignore */ } return; }
      var x = S.sel, q = parseInt(qty.value, 10), link = pane.querySelector('#pm-l').value.trim();
      if (!link) { err.textContent = 'Indique le lien ou le nom du compte.'; return; }
      if (!(q >= x.min && q <= x.max)) { err.textContent = 'Quantité : entre ' + x.min + ' et ' + x.max + '.'; return; }
      var tot = pane.querySelector('#pm-tot').textContent;
      if (!confirm('Confirmer la commande ?\n' + x.group + ' — ' + x.name + '\nQuantité : ' + q + '\nTotal : ' + tot)) return;
      b.disabled = true; b.textContent = 'Envoi en cours…';
      try {
        var r = await api('pm_order', { slug: S.slug, serviceId: x.id, quantity: q, link: link, requestId: S.rid, ref: (function () { try { return localStorage.getItem('cn_pm_ref_' + S.slug) || ''; } catch (e) { return ''; } })() });
        S.rid = uid(); toast(r.status === 'refunded' ? (r.message || 'Commande non acceptée — remboursé.') : 'Commande envoyée ✓', r.status === 'refunded' ? 'error' : 'success');
        S.tab = 'ord'; render();
      } catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Commander'; if (/solde insuffisant/i.test(e.message)) { err.innerHTML = esc(e.message) + ' <a href="#" id="pm-rc2">Recharger</a>'; var a = pane.querySelector('#pm-rc2'); if (a) a.onclick = function (ev) { ev.preventDefault(); goRecharge(); }; } }
    };
  }
  function paneSvc(pane) {
    pane.innerHTML = '<div class="pm-card"><div class="pm-f" style="margin-top:0"><input id="pm-sq" placeholder="Rechercher (ex. TikTok abonnés)" maxlength="40" value="' + esc(S.q) + '"></div><div id="pm-sl"></div></div>';
    function draw() {
      var q = S.q.toLowerCase(), g = groups(), h = '';
      Object.keys(g).forEach(function (n) {
        var l = g[n].filter(function (x) { return !q || (n + ' ' + x.name).toLowerCase().indexOf(q) >= 0; }); if (!l.length) return;
        h += '<div class="pm-g">' + pIcon(l[0].platform, n) + '<span>' + esc(n) + '</span></div>' + l.map(function (x) { return '<div class="pm-row"><div><b>' + esc(x.name) + '</b><small>ID ' + esc(x.id) + ' · ' + esc(x.info) + ' · Min ' + x.min + ' · Max ' + x.max.toLocaleString('fr-FR') + '</small></div><div class="pm-pr">' + money4(x.per1000) + '<small>/ 1000</small></div></div>'; }).join('');
      });
      pane.querySelector('#pm-sl').innerHTML = h || '<p class="pm-n">Aucun résultat.</p>';
    }
    pane.querySelector('#pm-sq').oninput = function () { S.q = this.value; draw(); }; draw();
  }
  function paneOrd(pane) {
    if (!auth.currentUser) { pane.innerHTML = '<div class="pm-card"><p class="pm-n">Connecte-toi pour voir tes commandes.</p><button class="pm-b p" id="pm-lg2">Se connecter</button></div>'; pane.querySelector('#pm-lg2').onclick = function () { document.getElementById('pm-login').click(); }; return; }
    pane.innerHTML = '<div class="pm-card"><h2>Historique</h2><p class="pm-n">Chargement…</p></div>';
    api('pm_orders', { slug: S.slug }).then(function (r) {
      var el = document.getElementById('pm-balchip'); if (el) el.textContent = money(r.balance);
      pane.innerHTML = '<div class="pm-card"><h2>Historique des commandes</h2>' + (r.orders.length ? r.orders.map(function (o) { var s = ST[o.status] || [o.status, 'n']; return '<div class="pm-row"><div><b>' + esc(o.service) + '</b> × ' + esc(o.quantity) + '<small>' + esc(o.link) + '<br>' + esc(new Date(o.createdAt).toLocaleString('fr-FR')) + (o.remains ? ' · Restant : ' + esc(o.remains) : '') + '</small></div><div style="text-align:right"><span class="pm-bd ' + s[1] + '">' + s[0] + '</span><div class="pm-pr" style="margin-top:4px">' + money(o.price) + '</div></div></div>'; }).join('') : '<p class="pm-n">Aucune commande pour l’instant.</p>') + '<button class="pm-b w" id="pm-rf" style="margin-top:10px">Actualiser</button></div>';
      pane.querySelector('#pm-rf').onclick = function () { paneOrd(pane); };
    }).catch(function (e) { pane.innerHTML = '<div class="pm-card"><p class="pm-err">' + esc(e.message) + '</p></div>'; });
  }
  function paneHelp(pane) {
    var wa = (S.store.shop.whatsapp || '').replace(/\D/g, '');
    pane.innerHTML = '<div class="pm-card"><h2>Questions fréquentes</h2><p class="pm-n"><b>Mon compte doit-il être public ?</b> Oui, le temps de la livraison.<br><br><b>Combien de temps ?</b> Le démarrage est généralement rapide ; les grosses quantités sont livrées progressivement.<br><br><b>Et si ça échoue ?</b> Tu es remboursé automatiquement sur ton solde.<br><br><b>Faut-il donner mon mot de passe ?</b> Jamais.</p></div>' +
      (wa.length > 6 ? '<div class="pm-card"><a class="pm-b p w" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">Contacter ' + esc(S.store.shop.name || 'le vendeur') + ' sur WhatsApp</a></div>' : '');
  }

  /* ================= Espace propriétaire ================= */
  var OW = null;
  function openOwner() {
    if (!auth.currentUser) { toast('Connecte-toi d’abord.'); return; }
    var o = document.getElementById('pm-ov'); if (o) o.remove();
    o = document.createElement('div'); o.className = 'pm-ov'; o.id = 'pm-ov'; document.body.appendChild(o); document.body.style.overflow = 'hidden';
    o.innerHTML = '<div class="pm-in"><div class="pm-top"><h1>Mon panel de croissance<small>Tu vends, nous livrons</small></h1><button class="pm-x" id="pm-close">✕</button></div><div id="pm-pane"><p class="pm-n" style="padding:24px">Chargement…</p></div></div>';
    o.querySelector('#pm-close').onclick = close;
    api('pm_owner_get').then(function (r) { OW = r; drawOwner(o.querySelector('#pm-pane')); }).catch(function (e) { o.querySelector('#pm-pane').innerHTML = '<div class="pm-card"><p class="pm-err">' + esc(e.message) + '</p></div>'; });
  }
  function drawOwner(pane) {
    var c = OW.cfg, st = OW.stats, url = OW.slug ? location.origin + '/panel/' + OW.slug : '';
    pane.innerHTML = '<div class="pm-card"><h2>Résumé</h2><div class="pm-row"><span>Commandes</span><b>' + st.orders + '</b></div><div class="pm-row"><span>Ventes de tes clients</span><b>' + money(st.sales) + '</b></div><div class="pm-row"><span>Tes gains (marge)</span><b>' + money(st.earned) + '</b></div>' + (st.pending ? '<div class="pm-row"><span>Gains en vérification</span><b>' + money(st.pending) + '</b></div>' : '') + '<p class="pm-n">Tes gains sont ajoutés automatiquement à ton solde dès que la commande est acceptée. Tu n’as aucune clé, aucun identifiant de service à gérer : tout est prêt et tenu à jour par Coeurnoh.</p></div>' +
      '<div class="pm-card"><h2>Réglages</h2><div class="pm-f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pm-on" style="width:20px;height:20px"' + (c.on ? ' checked' : '') + '><label for="pm-on" style="margin:0">Activer mon panel</label></div>' +
      '<div class="pm-f"><label for="pm-t">Titre</label><input id="pm-t" maxlength="80" placeholder="Services de croissance" value="' + esc(c.title) + '"></div>' +
      '<div class="pm-f"><label for="pm-w">Message d’accueil (facultatif)</label><textarea id="pm-w" rows="2" maxlength="300">' + esc(c.welcome) + '</textarea></div>' +
      '<div class="pm-f"><label for="pm-m">Ta marge sur le prix de gros (%, max ' + OW.maxMarkup + ')</label><input id="pm-m" inputmode="decimal" maxlength="5" value="' + esc(c.markup) + '"></div><div class="pm-sum" id="pm-ex"></div>' +
      '<div class="pm-f"><label for="pm-rp">Parrainage : part de ta marge reversée au parrain (%, 0 à 50)</label><input id="pm-rp" inputmode="numeric" maxlength="2" value="' + esc(c.refPct != null ? c.refPct : 20) + '"><p class="pm-n">Quand un client parrainé commande, son parrain reçoit ce pourcentage de TA marge. Cela fait venir de nouveaux clients sans te coûter plus que ce que tu gagnes.</p></div>' +
      '<div class="pm-f"><label>Réseaux proposés</label>' + OW.platforms.map(function (p) { return '<label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:6px 0"><input type="checkbox" style="width:18px;height:18px" data-p="' + esc(p.id) + '"' + (c.hiddenPlatforms.indexOf(p.id) < 0 ? ' checked' : '') + '>' + esc(p.name) + '</label>'; }).join('') + '</div>' +
      '<p class="pm-err" id="pm-err"></p><button class="pm-b p w" id="pm-save">Enregistrer</button></div>' +
      (url ? '<div class="pm-card"><h2>Ton panel</h2><p class="pm-n" style="word-break:break-all">' + esc(url) + '</p><button class="pm-b w" id="pm-copy">Copier le lien</button>' + (typeof CNShare !== 'undefined' ? '' : '') + '</div>' : '<div class="pm-card"><p class="pm-n">Publie ton site pour obtenir l’adresse de ton panel.</p></div>') +
      '<div class="pm-card"><h2>Dernières ventes</h2>' + (OW.recent.length ? OW.recent.map(function (o) { var s = ST[o.status] || [o.status, 'n']; return '<div class="pm-row"><div><b>' + esc(o.service) + '</b> × ' + esc(o.quantity) + '<small>' + esc(new Date(o.createdAt).toLocaleString('fr-FR')) + '</small></div><div style="text-align:right"><span class="pm-bd ' + s[1] + '">' + s[0] + '</span><div class="pm-pr">+' + money(o.margin) + '</div></div></div>'; }).join('') : '<p class="pm-n">Aucune vente pour l’instant. Partage le lien de ton panel !</p>') + '</div>';
    var m = pane.querySelector('#pm-m'), ex = pane.querySelector('#pm-ex');
    function sample() { var mk = Math.min(Math.max(parseFloat(String(m.value).replace(',', '.')) || 0, 0), OW.maxMarkup), s = OW.sample[0]; if (!s) return; var base = s.per1000 / (1 + (OW.cfg.markup || 0) / 100), price = base * (1 + mk / 100); ex.innerHTML = 'Exemple : ' + esc(s.group + ' ' + s.label) + ' — le client paie <b>' + money4(price) + '</b> / 1000, ton gain <b>' + money4(price - base) + '</b>.'; }
    m.oninput = sample; sample();
    var cp = pane.querySelector('#pm-copy'); if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(url); toast('Lien copié', 'success'); } catch (e) { toast(url); } };
    pane.querySelector('#pm-save').onclick = async function () {
      var b = this, er = pane.querySelector('#pm-err'); er.textContent = ''; b.disabled = true;
      var hidden = [].filter.call(pane.querySelectorAll('[data-p]'), function (x) { return !x.checked; }).map(function (x) { return x.getAttribute('data-p'); });
      try { var r = await api('pm_owner_save', { on: pane.querySelector('#pm-on').checked, title: pane.querySelector('#pm-t').value, welcome: pane.querySelector('#pm-w').value, markup: parseFloat(String(m.value).replace(',', '.')) || 0, refPct: parseInt(pane.querySelector('#pm-rp').value, 10) || 0, hiddenPlatforms: hidden }); toast('Panel enregistré', 'success'); OW.cfg = r.cfg; drawOwner(pane); } catch (e) { er.textContent = e.message; }
      b.disabled = false;
    };
  }


  /* ===== Page autonome : connexion et recharge sans l'application ===== */
  function modal(inner) {
    var m = document.getElementById('pm-modal'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'pm-modal'; m.style.cssText = 'position:fixed;inset:0;z-index:100010;background:rgba(10,16,32,.6);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
    m.innerHTML = '<div class="pm-card" style="margin:0;max-width:400px;width:100%;position:relative">' + inner + '</div>';
    try { if (S.store && S.store.shop.accent) m.style.setProperty('--pm-a', S.store.shop.accent); } catch (e) { /* ignore */ }
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m); return m;
  }
  function loginModal() {
    if (window.__CN_PREVIEW_STORE) { modal('<h2>Aperçu</h2><p class="pm-n">La connexion est désactivée dans l’aperçu. Publie ton site, puis ouvre-le avec son lien pour te connecter et commander.</p><button class="pm-b p" style="width:100%" onclick="document.getElementById(\'pm-modal\').remove()">OK</button>'); return; }
    var reg = false;
    var m = modal('<h2 id="pm-lt">Connexion</h2><p class="pm-n">Utilise ton compte Coeurnoh Universe, ou crée-en un gratuitement : le même compte fonctionne partout.</p>' +
      '<button class="pm-b w" id="pm-g" style="display:flex;align-items:center;justify-content:center;gap:8px"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continuer avec Google</button>' +
      '<p class="pm-n" style="text-align:center">ou avec ton e-mail</p><div class="pm-f"><input id="pm-em" type="email" autocomplete="email" placeholder="Adresse e-mail"></div><div class="pm-f"><input id="pm-pw" type="password" autocomplete="current-password" placeholder="Mot de passe (6 caractères min.)"></div>' +
      '<div class="pm-err" id="pm-le"></div><button class="pm-b p w" id="pm-ls" style="width:100%">Se connecter</button><p class="pm-n" style="text-align:center"><a href="#" id="pm-sw">Créer un compte</a> · <a href="#" id="pm-fp">Mot de passe oublié</a></p>');
    var err = m.querySelector('#pm-le'), done = function () { m.remove(); };
    function fail(e) { var c = (e && e.code) || ''; err.textContent = /wrong-password|invalid-credential|user-not-found/.test(c) ? 'E-mail ou mot de passe incorrect.' : /email-already/.test(c) ? 'Un compte existe déjà avec cet e-mail : connecte-toi.' : /weak-password/.test(c) ? 'Mot de passe trop court (6 minimum).' : /invalid-email/.test(c) ? 'Adresse e-mail invalide.' : /popup-closed|cancelled/.test(c) ? '' : /network/.test(c) ? 'Connexion internet indisponible.' : (c ? 'Connexion impossible (' + c.replace('auth/', '') + '). Réessaie ou ouvre le panel dans ton navigateur.' : 'Connexion impossible, réessaie.'); }
    m.querySelector('#pm-g').onclick = function () {
      err.textContent = ''; var pr = new firebase.auth.GoogleAuthProvider();
      var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      (ios ? auth.signInWithRedirect(pr) : auth.signInWithPopup(pr).then(done)).catch(function (e) { if (e && /popup-blocked/.test(e.code || '')) auth.signInWithRedirect(pr); else fail(e); });
    };
    m.querySelector('#pm-sw').onclick = function (ev) { ev.preventDefault(); reg = !reg; m.querySelector('#pm-lt').textContent = reg ? 'Créer un compte' : 'Connexion'; m.querySelector('#pm-ls').textContent = reg ? 'Créer mon compte' : 'Se connecter'; ev.target.textContent = reg ? 'J’ai déjà un compte' : 'Créer un compte'; };
    m.querySelector('#pm-fp').onclick = function (ev) { ev.preventDefault(); var em = m.querySelector('#pm-em').value.trim(); if (!em) { err.textContent = 'Saisis ton e-mail ci-dessus.'; return; } auth.sendPasswordResetEmail(em).then(function () { err.style.color = '#166534'; err.textContent = 'E-mail de réinitialisation envoyé.'; }).catch(fail); };
    m.querySelector('#pm-ls').onclick = function () {
      var em = m.querySelector('#pm-em').value.trim(), pw = m.querySelector('#pm-pw').value; err.style.color = ''; err.textContent = '';
      if (!em || !pw) { err.textContent = 'E-mail et mot de passe requis.'; return; }
      (reg ? auth.createUserWithEmailAndPassword(em, pw) : auth.signInWithEmailAndPassword(em, pw)).then(done).catch(fail);
    };
  }
  function rechargeModal() {
    if (!auth.currentUser) { loginModal(); return; }
    var amt = 10, method = 'card';
    var m = modal('<h2>Recharger mon solde</h2><p class="pm-n">Le solde sert à payer tes commandes. Il est crédité automatiquement après paiement.</p><div class="pm-f"><label>Montant (USD)</label><div id="pm-am" style="display:flex;gap:6px;flex-wrap:wrap"></div><input id="pm-ac" type="number" min="2" max="1000" step="1" placeholder="Autre montant" style="margin-top:8px"></div>' +
      '<div class="pm-f"><label>Moyen de paiement</label><select id="pm-mt"><option value="card">Carte bancaire / Mobile Money</option><option value="crypto">Crypto (USDT, BTC…)</option></select></div><div class="pm-err" id="pm-re2"></div><button class="pm-b p" id="pm-pay" style="width:100%">Payer</button><p class="pm-n" style="text-align:center">Paiement sécurisé, hébergé chez nos partenaires. Minimum 2 $.</p>');
    var box = m.querySelector('#pm-am');
    function chips() { box.innerHTML = [5, 10, 20, 50].map(function (a) { return '<button type="button" class="pm-b' + (a === amt ? ' p' : '') + '" data-a="' + a + '">' + a + ' $</button>'; }).join(''); box.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { amt = Number(b.getAttribute('data-a')); m.querySelector('#pm-ac').value = ''; chips(); }; }); }
    chips(); m.querySelector('#pm-ac').oninput = function (e) { amt = Number(e.target.value) || 0; chips(); };
    m.querySelector('#pm-mt').onchange = function (e) { method = e.target.value; };
    m.querySelector('#pm-pay').onclick = async function () {
      var b = this, err = m.querySelector('#pm-re2'); err.textContent = '';
      if (!(amt >= 2 && amt <= 1000)) { err.textContent = 'Montant : entre 2 et 1000 $.'; return; }
      b.disabled = true; b.textContent = 'Redirection…';
      try {
        var tok = await auth.currentUser.getIdToken();
        var body = method === 'crypto' ? { provider: 'crypto', amount: amt } : { provider: 'optgateway', amountUSD: amt, onlyMethod: 'card' };
        body.idToken = tok; body.returnSlug = S.slug;
        var r = await fetch('/api/payment-initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); var j = await r.json();
        if (!r.ok || !j.success || !/^https:\/\//.test(j.paymentUrl || '')) throw new Error(j.error || 'Paiement indisponible pour le moment.');
        location.href = j.paymentUrl;
      } catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Payer'; }
    };
  }

  /* ===== Ouvrir un site dans l'application, sans la quitter ===== */
  function openSiteInApp(url) {
    var o = document.getElementById('pm-site'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'pm-site'; o.className = 'pm-ov'; o.style.zIndex = '99990'; o.style.background = '#fff';
    o.innerHTML = '<div style="position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#1f2f4d;color:#fff;z-index:2"><b style="font-size:.9rem">Aperçu du site</b><button class="pm-x" id="pm-site-x" aria-label="Fermer">✕</button></div><iframe src="' + esc(url) + '" title="Site" style="border:0;width:100%;height:calc(100% - 52px)" referrerpolicy="same-origin"></iframe>';
    document.body.appendChild(o); document.body.style.overflow = 'hidden';
    o.querySelector('#pm-site-x').onclick = function () { o.remove(); document.body.style.overflow = ''; };
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || !e.data.cnStore) return;
    var o = document.getElementById('pm-site'); if (o) o.remove(); openStore(String(e.data.cnStore));
  });
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[target="_blank"]'); if (!a) return;
    try {
      var u = new URL(a.href, location.href), m = u.origin === location.origin && u.pathname.match(/^\/s\/([a-z0-9-]{3,30})\/?$/);
      if (!m) return;
      ev.preventDefault();
      fetch('/api/render-site?pstore=' + encodeURIComponent(m[1]) + '&json=1').then(function (r) { return r.json(); }).then(function (j) { if (j && j.success) openStore(m[1]); else openSiteInApp(u.pathname); }).catch(function () { openSiteInApp(u.pathname); });
    } catch (e) { /* ignore */ }
  }, true);

  function main() {
    window.CNPanel = { open: openStore, owner: openOwner, site: openSiteInApp };
    if (SA) {
      openStore(window.__CN_STANDALONE);
      try { auth.onAuthStateChanged(function () { S.isOwner = undefined; if (S.store) render(); }); } catch (e) { /* ignore */ }
      try { var pq = new URL(location.href).searchParams.get('payment'); if (pq) { toast(pq === 'success' ? 'Paiement reçu : ton solde est mis à jour dans quelques instants.' : 'Paiement annulé.', pq === 'success' ? 'success' : 'info'); if (pq === 'success') S.tab = 'wal'; var u2 = new URL(location.href); u2.searchParams.delete('payment'); history.replaceState(null, '', u2.pathname + (u2.search || '')); } } catch (e) { /* ignore */ }
      return;
    }
    var orig = window.siteHubHtml;
    if (typeof orig === 'function') {
      window.siteHubHtml = function () {
        var h = orig.apply(this, arguments);
        var tile = '<button type="button" class="sp-tile" onclick="CNPanel.owner()"><span class="sp-ic">' + (typeof uiIc === 'function' ? uiIc('chart', 20) : '📈') + '</span><b>Panel de croissance</b><small>Vends des services, gagne ta marge</small></button>';
        return /<\/div>\s*$/.test(h) ? h.replace(/<\/div>\s*$/, tile + '</div>') : h + tile;
      };
    }
    var slug = ''; try { slug = new URL(location.href).searchParams.get('panel') || ''; } catch (e) { /* ignore */ }
    if (!slug) { var v = lsGet().split('|'); if (v[0] && Date.now() - Number(v[1] || 0) < 7200000) slug = v[0]; }
    if (slug) {
      var done = false;
      var run = function () { if (done) return; done = true; lsDel(); openStore(slug); };
      try { auth.onAuthStateChanged(function () { setTimeout(run, 600); }); } catch (e) { run(); }
      setTimeout(run, 6000);
    }
  }
  go();
})();
