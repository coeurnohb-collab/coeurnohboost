/* Coeurnoh Universe — Panel de croissance (boutique du panel + espace propriétaire), v2.
   1) Boutique cliente : page autonome /panel/<adresse> ou /?panel=<adresse> dans l'application.
      Accueil · Services · Commander · Historique · Portefeuille (recharge complète) · Parrainage · Installation.
   2) Espace propriétaire : gains, retrait toujours visible, marge, activation, ventes.
   Langues : FR · EN · ES · IT · PT (clé « coeurnoh_lang », comme l'application).
   Tous les prix et paiements sont calculés par le serveur ; ce fichier n'envoie jamais de prix. */
(function () {
  'use strict';
  if (window.__cnPanelStore) return; window.__cnPanelStore = true;
  var tries = 0;
  function go() {
    if (typeof auth === 'undefined' || typeof escapeHtml !== 'function') { if (++tries < 160) setTimeout(go, 250); return; }
    if (window.CN_PANEL_I18N) { main(); return; }
    var s = document.createElement('script'); s.src = '/panel-i18n.js?v=20261065'; s.onload = main; s.onerror = main; document.head.appendChild(s);
  }

  var SA = !!window.__CN_STANDALONE; // page autonome du panel (hors application)
  var S = { slug: '', store: null, tab: 'home', sel: null, rid: '', q: '', isOwner: undefined, bal: null };
  var LS = 'cn_pm_return', LSD = 'cn_pm_inst_dis';
  var LANGS = [['fr', 'FR'], ['en', 'EN'], ['es', 'ES'], ['it', 'IT'], ['pt', 'PT']];
  var LOC = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', it: 'it-IT', pt: 'pt-PT' };

  /* ---------- langue ---------- */
  function lang() {
    var l = '';
    try { l = localStorage.getItem('coeurnoh_lang') || ''; } catch (e) { /* ignore */ }
    if (!l) { try { l = (typeof currentLang === 'string' && currentLang) || ''; } catch (e) { /* ignore */ } }
    if (!l) l = String(navigator.language || 'fr').slice(0, 2).toLowerCase();
    return LOC[l] ? l : 'fr';
  }
  function setLang(l) { try { localStorage.setItem('coeurnoh_lang', l); } catch (e) { /* ignore */ } try { document.documentElement.lang = l; } catch (e) { /* ignore */ } }
  function T(k, v) {
    var D = window.CN_PANEL_I18N || {}, s = (D[lang()] || {})[k];
    if (s == null) s = (D.fr || {})[k];
    if (s == null) s = k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function dt(x) { try { return new Date(x).toLocaleString(LOC[lang()]); } catch (e) { return String(x || ''); } }

  /* ---------- utilitaires ---------- */
  function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
  function money(n) { n = Number(n) || 0; var s = (Math.round(n * 100) / 100).toFixed(2); return (lang() === 'en' ? '$' + s : s.replace('.', ',') + ' $'); }
  function money4(n) { n = Number(n) || 0; var s = (Math.round(n * 10000) / 10000).toFixed(n < 1 ? 3 : 2); return (lang() === 'en' ? '$' + s : s.replace('.', ',') + ' $'); }
  function num(n) { try { return Number(n).toLocaleString(LOC[lang()]); } catch (e) { return String(n); } }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '') : String(Date.now()) + Math.random().toString(16).slice(2); }
  function lsSet(v) { try { localStorage.setItem(LS, v); } catch (e) { /* ignore */ } }
  function lsGet() { try { return localStorage.getItem(LS) || ''; } catch (e) { return ''; } }
  function lsDel() { try { localStorage.removeItem(LS); } catch (e) { /* ignore */ } }
  function errMsg(e) {
    var m = (e && e.message) || ''; if (!m) return T('e_gen');
    if (/failed to fetch|network|load failed/i.test(m)) return T('lg_e_net');
    return m;
  }
  async function api(action, body) {
    if (window.__CN_PREVIEW_STORE) throw new Error(T('pv_err'));
    if (!auth.currentUser) throw new Error(T('e_login'));
    var idToken = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body || {})) });
    var j = await r.json(); if (!j.success) { throw new Error(j.error || T('e_gen')); } return j;
  }

  /* ---------- icônes ---------- */
  var IC = {
    home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z', list: 'M4 6h16M4 12h16M4 18h16', plus: 'M12 5v14M5 12h14',
    hist: 'M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h3',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', down: 'M12 3v12M7 11l5 5 5-5M5 21h14', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4', refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6', check: 'M5 13l4 4L19 7',
    gift: 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z', copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    card: 'M2 5h20v14H2zM2 10h20M6 15h4', phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2', coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9h5a2 2 0 0 1 0 3H9h5.5a2 2 0 0 1 0 3H9M12 7v2M12 15v2',
    x: 'M6 6l12 12M18 6L6 18', up: 'M12 19V5M5 12l7-7 7 7', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4'
  };
  function ico(n, s) { s = s || 20; return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (IC[n] || '') + '"/></svg>'; }
  /* pastilles de marque (mêmes formes que l'application) */
  var LG = {
    mpesa: '<i class="pm-lg lg-mpesa">M-PESA</i>', orange: '<i class="pm-lg lg-orange">Orange</i>', airtel: '<i class="pm-lg lg-airtel">airtel</i>',
    visa: '<i class="pm-lg lg-visa">VISA</i>', mc: '<i class="pm-lg lg-mc"><b></b><b></b></i>',
    illico: '<i class="pm-lg lg-illico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h3"/></svg></i>',
    btc: '<i class="pm-lg lg-coin" style="background:#f7931a">₿</i>', usdt: '<i class="pm-lg lg-coin" style="background:#26a17b">₮</i>', trx: '<i class="pm-lg lg-coin" style="background:#eb0029">T</i>'
  };
  function pIcon(pid, nm) {
    try { var p = (typeof PLATFORMS !== 'undefined' ? PLATFORMS : []).filter(function (x) { return x.id === pid; })[0]; if (p && typeof platformBadgeHTML === 'function') return '<span class="pm-pi">' + platformBadgeHTML(p) + '</span>'; } catch (e) { /* ignore */ }
    return '<span class="pm-pi"><span class="p-icon" style="background:#1f2f4d;color:#fff">' + esc(String(nm || pid || '?').charAt(0)) + '</span></span>';
  }

  /* ---------- styles ---------- */
  var CSS = '.pm-ov{--bg:#f4f6fb;--cd:#fff;--tx:#14213d;--mu:#5b6475;--bd:#e3e8f2;--in:#fff;position:fixed;inset:0;z-index:100000;background:var(--bg);color:var(--tx);overflow:auto;-webkit-overflow-scrolling:touch;font-family:inherit}' +
    '.pm-in{max-width:760px;margin:0 auto;padding:0 0 100px}' +
    '.pm-top{position:sticky;top:0;z-index:3;background:var(--cd);border-bottom:1px solid var(--bd);padding:10px 14px;display:flex;align-items:center;gap:8px}' +
    '.pm-top img{width:38px;height:38px;border-radius:11px;object-fit:cover;background:#fff;box-shadow:0 0 0 1px var(--bd)}.pm-top .pm-lo{width:38px;height:38px;border-radius:11px;background:var(--pm-a,#1b4fd8);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}' +
    '.pm-top h1{font-size:1rem;margin:0;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pm-top small{display:block;font-weight:500;color:var(--mu);font-size:.72rem;overflow:hidden;text-overflow:ellipsis}' +
    '.pm-chip{border:1px solid var(--bd);background:var(--cd);color:var(--tx);border-radius:99px;padding:7px 11px;font:inherit;font-weight:800;font-size:.78rem;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}.pm-chip.a{background:var(--pm-a,#1b4fd8);border-color:var(--pm-a,#1b4fd8);color:#fff}' +
    '.pm-x{border:1px solid var(--bd);background:var(--cd);color:var(--tx);border-radius:11px;width:36px;height:36px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}' +
    '@media(max-width:430px){.pm-chip .tx{display:none}.pm-top small{display:none}}.pm-lang{border:1px solid var(--bd);background:var(--cd);color:var(--tx);border-radius:99px;padding:7px 8px;font:inherit;font-weight:800;font-size:.76rem;cursor:pointer}' +
    '.pm-card{background:var(--cd);border-radius:18px;margin:12px 14px 0;padding:16px;box-shadow:0 1px 3px rgba(20,33,61,.06),0 6px 18px rgba(20,33,61,.04);border:1px solid var(--bd)}.pm-card h2{font-size:.98rem;margin:0 0 10px;display:flex;align-items:center;gap:8px}' +
    '.pm-f{margin:12px 0}.pm-f label{display:block;font-size:.76rem;font-weight:800;color:var(--mu);margin-bottom:6px}' +
    '.pm-f input,.pm-f select,.pm-f textarea{width:100%;box-sizing:border-box;border:1.5px solid var(--bd);border-radius:12px;padding:12px;font:inherit;background:var(--in);color:var(--tx);outline:none}.pm-f input:focus,.pm-f select:focus,.pm-f textarea:focus{border-color:var(--pm-a,#1b4fd8)}.pm-f input[disabled],.pm-f select[disabled]{opacity:.55}' +
    '.pm-b{border:1.5px solid var(--bd);background:var(--cd);border-radius:13px;padding:12px 16px;font:inherit;font-weight:800;cursor:pointer;color:var(--tx);display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none}.pm-b.p{background:var(--pm-a,#1b4fd8);border-color:var(--pm-a,#1b4fd8);color:#fff}.pm-b.w{width:100%;box-sizing:border-box}.pm-b[disabled]{opacity:.5;cursor:not-allowed}' +
    '.pm-n{font-size:.78rem;color:var(--mu);margin:6px 0;line-height:1.5}.pm-sum{background:rgba(27,79,216,.08);border-radius:12px;padding:12px;font-size:.86rem;margin:12px 0}.pm-sum b{font-size:1.1rem}.pm-err{color:#b42318;font-size:.84rem;margin:8px 0}.pm-ok{color:#166534;font-size:.84rem;margin:8px 0}' +
    '.pm-row{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--bd);font-size:.84rem}.pm-row:last-child{border:0}.pm-row small{display:block;color:var(--mu);font-size:.72rem;margin-top:2px;word-break:break-all}' +
    '.pm-bd{display:inline-block;border-radius:99px;padding:3px 9px;font-size:.68rem;font-weight:800;white-space:nowrap}.pm-bd.g{background:#dcfce7;color:#166534}.pm-bd.i{background:#dbeafe;color:#1e40af}.pm-bd.w{background:#fef3c7;color:#92400e}.pm-bd.n{background:#e5e7eb;color:#374151}' +
    '.pm-grp{display:flex;align-items:center;gap:10px;margin:16px 0 4px;font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--mu)}.pm-pr{font-weight:800;white-space:nowrap;text-align:right}.pm-pr small{display:block;font-weight:500;color:var(--mu);font-size:.68rem}' +
    '.pm-nav{position:fixed;left:0;right:0;bottom:0;z-index:4;display:flex;background:var(--cd);border-top:1px solid var(--bd);padding:6px 4px calc(6px + env(safe-area-inset-bottom));box-shadow:0 -6px 20px rgba(20,33,61,.07)}.pm-nav button{flex:1;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit;font-size:.65rem;font-weight:800;color:var(--mu);padding:6px 2px;cursor:pointer;min-width:0}.pm-nav button.on{color:var(--pm-a,#1b4fd8)}.pm-nav button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}' +
    '.pm-pi{display:inline-flex}.pm-pi .p-icon{width:38px!important;height:38px!important;border-radius:11px!important;display:flex;align-items:center;justify-content:center}.pm-pi .p-icon svg{width:20px;height:20px}' +
    '.pm-hero{background:var(--cd)}.pm-hero h2{font-size:1.25rem;margin:0 0 6px;color:var(--tx)}.pm-hero p{font-size:.9rem;line-height:1.55;margin:0 0 14px;color:var(--mu)}' +
    '.pm-wal{background:#1f2f4d;color:#fff;border:0}.pm-wal .l{font-size:.78rem;opacity:.8;display:flex;align-items:center;gap:6px}.pm-wal .v{font-size:2.2rem;font-weight:800;margin:6px 0 14px;letter-spacing:-.02em}.pm-wal .btns{display:flex;gap:8px}.pm-wal .btns .pm-b{flex:1;padding:12px 8px;font-size:.86rem}.pm-wal .pm-b.g{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.28);color:#fff}' +
    '.pm-stats{display:flex;gap:8px;margin:12px 14px 0}.pm-stats div{flex:1;background:var(--cd);border-radius:14px;padding:12px 6px;text-align:center;border:1px solid var(--bd)}.pm-stats b{display:block;font-size:1.05rem}.pm-stats span{font-size:.68rem;color:var(--mu)}' +
    '.pm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pm-plat{border:1px solid var(--bd);background:var(--cd);border-radius:14px;padding:12px 4px;font:inherit;cursor:pointer;color:inherit;display:flex;flex-direction:column;align-items:center;gap:6px}.pm-plat b{font-size:.72rem}' +
    '.pm-trust{display:flex;gap:8px;flex-wrap:wrap;margin:12px 14px 0}.pm-trust span{font-size:.72rem;background:var(--cd);border:1px solid var(--bd);border-radius:99px;padding:6px 11px;color:var(--tx);display:inline-flex;align-items:center;gap:5px;font-weight:700}.pm-trust svg{color:#16a34a}' +
    '.pm-steps{margin:0;padding:0;list-style:none}.pm-steps li{display:flex;gap:10px;align-items:flex-start;font-size:.84rem;line-height:1.45;padding:6px 0}.pm-steps li i{flex:none;width:24px;height:24px;border-radius:50%;background:var(--pm-a,#1b4fd8);color:#fff;font-style:normal;font-weight:800;font-size:.75rem;display:flex;align-items:center;justify-content:center}' +
    '.pm-ref{background:rgba(27,79,216,.07);border-radius:14px;padding:12px 14px;font-size:.84rem;line-height:1.5;margin:10px 0}.pm-link{word-break:break-all;background:var(--in);border:1.5px dashed var(--bd);border-radius:10px;padding:10px;font-size:.78rem;margin:8px 0}.pm-kpi{display:flex;gap:8px;margin:8px 0}.pm-kpi div{flex:1;background:var(--in);border-radius:12px;padding:10px;text-align:center;border:1px solid var(--bd)}.pm-kpi b{display:block;font-size:1.05rem}.pm-kpi span{font-size:.7rem;color:var(--mu)}' +
    /* bandeau d'installation */
    '.pm-inst{margin:12px 14px 0;border-radius:16px;padding:12px 14px;background:var(--pm-a,#1b4fd8);color:#fff;display:flex;align-items:center;gap:10px}.pm-inst .t{flex:1;font-size:.84rem;font-weight:800;line-height:1.3}.pm-inst .t small{display:block;font-weight:500;opacity:.9;font-size:.72rem;margin-top:2px}.pm-inst button{border:0;border-radius:99px;padding:9px 14px;font:inherit;font-weight:800;font-size:.8rem;cursor:pointer}.pm-inst .go{background:#fff;color:#14213d}.pm-inst .no{background:rgba(255,255,255,.2);color:#fff;padding:9px 11px}' +
    /* recharge : onglets 2x2 + pastilles */
    '.pm-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 12px}.pm-tab{border:1.5px solid var(--bd);background:var(--cd);color:var(--tx);border-radius:14px;padding:10px;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:7px;text-align:left}.pm-tab b{font-size:.8rem}.pm-tab .lgs{display:flex;gap:4px;min-height:28px;align-items:center}.pm-tab.on{border-color:var(--pm-a,#1b4fd8);box-shadow:0 0 0 3px rgba(27,79,216,.12)}' +
    '.pm-lg{display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:28px;border-radius:8px;font-style:normal;font-weight:800;line-height:1;box-shadow:0 0 0 1px rgba(15,23,42,.09),0 1px 2px rgba(15,23,42,.08);overflow:hidden}' +
    '.lg-mpesa{background:#e60000;color:#fff;font-size:7px;padding:0 4px}.lg-orange{background:#ff7900;color:#fff;font-size:7.5px;padding:0 4px}.lg-airtel{background:#ed1c24;color:#fff;font-size:7.5px;padding:0 4px}.lg-visa{background:#fff;color:#1a1f71;font-size:12.5px;font-style:italic;font-weight:900;padding:0 7px;letter-spacing:-.03em}.lg-mc{background:#fff;padding:0 6px}.lg-mc b{width:15px;height:15px;border-radius:50%;background:#eb001b}.lg-mc b+b{background:#f79e1b;margin-left:-6px;mix-blend-mode:multiply}.lg-illico{background:#fff3d6;color:#d97706;padding:0 6px}.lg-illico svg{width:18px;height:18px}.lg-mtn{background:#ffcc00;color:#111;font-size:8px;padding:0 5px}.lg-gen{background:#475569;color:#fff;font-size:7px;padding:0 4px}.lg-coin{border-radius:50%;width:28px;padding:0;color:#fff;font-size:15px}' +
    '.pm-ops{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pm-op{border:1.5px solid var(--bd);background:var(--cd);color:var(--tx);border-radius:14px;padding:12px 4px;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:7px}.pm-op b{font-size:.7rem}.pm-op.on{border-color:var(--pm-a,#1b4fd8);box-shadow:0 0 0 3px rgba(27,79,216,.12)}' +
    '.pm-amts{display:flex;gap:6px;flex-wrap:wrap}.pm-amts .pm-b{padding:9px 14px;font-size:.84rem;border-radius:99px}' +
    '.pm-sheet{position:fixed;inset:0;z-index:100010;background:rgba(10,16,32,.55);display:flex;align-items:flex-end;justify-content:center;overflow:auto}.pm-sheet .box{--cd:#fff;--tx:#14213d;--mu:#5b6475;--bd:#e3e8f2;--in:#fff;background:var(--cd);color:var(--tx);width:100%;max-width:480px;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));max-height:94vh;overflow:auto;position:relative}@media(min-width:560px){.pm-sheet{align-items:center;padding:16px}.pm-sheet .box{border-radius:22px}}' +
    '.pm-sheet .hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}.pm-sheet h2{margin:0;font-size:1.1rem}' +
    '.pm-ph{display:flex;gap:8px;align-items:stretch}.pm-ph input{flex:1;min-width:0}.pm-dial{display:flex;align-items:center;padding:0 12px;border:1.5px solid var(--bd);border-radius:12px;background:var(--in);font-weight:800;font-size:.95rem}.pm-ph .pm-b{padding:0 16px}.pm-acts2{display:grid;gap:8px}.pm-secure{display:flex;gap:8px;align-items:flex-start;font-size:.74rem;color:var(--mu);margin-top:12px;line-height:1.45}.pm-secure svg{flex:none;color:#16a34a;margin-top:1px}' +
    '@media(prefers-color-scheme:dark){.pm-ov,.pm-sheet .box{--bg:#0e1424;--cd:#182036;--tx:#e6eaf3;--mu:#9aa6c0;--bd:#2a3553;--in:#101830}.pm-hero h2{color:#e6eaf3}.pm-sum,.pm-ref{background:rgba(120,150,255,.12)}.pm-lg.lg-visa,.pm-lg.lg-mc{background:#fff}}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function close() { if (SA && S.slug) { S.tab = 'home'; openStore(S.slug); return; } var o = document.getElementById('pm-ov'); if (o) o.remove(); document.body.style.overflow = ''; try { var u = new URL(location.href); if (u.searchParams.has('panel')) { u.searchParams.delete('panel'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } } catch (e) { /* ignore */ } }

  async function loadStore(slug) {
    var r = await fetch('/api/render-site?pstore=' + encodeURIComponent(slug) + '&json=1'); var j = await r.json();
    if (!j.success) throw new Error(j.error || T('e_unavail')); return j;
  }
  async function openStore(slug) {
    slug = String(slug || '').toLowerCase(); if (!/^[a-z0-9-]{3,30}$/.test(slug)) return;
    S.slug = slug; if (!S.tab) S.tab = 'home'; S.sel = null; S.rid = uid();
    try { var rq = new URL(location.href).searchParams.get('ref'); if (rq && /^[A-Za-z0-9_-]{6,128}$/.test(rq)) localStorage.setItem('cn_pm_ref_' + slug, rq); } catch (e) { /* ignore */ }
    var o = document.getElementById('pm-ov'); if (o) o.remove();
    o = document.createElement('div'); o.className = 'pm-ov'; o.id = 'pm-ov'; o.innerHTML = '<div class="pm-in"><p class="pm-n" style="padding:30px;text-align:center">' + esc(T('loading')) + '</p></div>';
    document.body.appendChild(o); document.body.style.overflow = 'hidden';
    try { S.store = window.__CN_PREVIEW_STORE || await loadStore(slug); } catch (e) { o.innerHTML = '<div class="pm-in"><div class="pm-card" style="margin-top:30px"><h2>' + esc(T('e_unavail')) + '</h2><p class="pm-n">' + esc(e.message) + '</p><button class="pm-b p" id="pm-close">' + esc(T('close')) + '</button></div></div>'; o.querySelector('#pm-close').onclick = close; return; }
    if (S.store.shop.accent) o.style.setProperty('--pm-a', S.store.shop.accent);
    render();
  }

  var NAV = [['home', 'n_home', 'home'], ['svc', 'n_svc', 'list'], ['new', 'n_new', 'plus'], ['ord', 'n_ord', 'hist'], ['wal', 'n_wal', 'wallet']];
  function langSel() { return '<select class="pm-lang" id="pm-lang" aria-label="' + esc(T('lang')) + '">' + LANGS.map(function (l) { return '<option value="' + l[0] + '"' + (lang() === l[0] ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') + '</select>'; }
  function render() {
    var o = document.getElementById('pm-ov'); if (!o || !S.store) return; var sh = S.store.shop, logged = !!auth.currentUser, keep = o.scrollTop;
    var showInst = SA && !isInstalled();
    o.innerHTML = '<div class="pm-in"><div class="pm-top">' + (sh.logo ? '<img src="' + esc(sh.logo) + '" alt="">' : '<span class="pm-lo">' + esc(String(sh.name || 'P').charAt(0).toUpperCase()) + '</span>') + '<h1>' + esc(sh.name || 'Panel') + '<small>' + esc(S.store.title) + '</small></h1>' + langSel() +
      (showInst ? '<button class="pm-chip" id="pm-instchip" aria-label="' + esc(T('in_title')) + '">' + ico('down', 15) + '<span class="tx">' + esc(T('install')) + '</span></button>' : '') +
      (S.isOwner ? '<button class="pm-chip" id="pm-adm" aria-label="' + esc(T('admin')) + '">' + ico('cog', 15) + '<span class="tx">' + esc(T('admin')) + '</span></button>' : '') + (logged ? '<button class="pm-chip a" id="pm-balchip" aria-label="' + esc(T('balance')) + '">…</button>' : '<button class="pm-chip a" id="pm-login">' + esc(T('login')) + '</button>') +
      (SA ? (logged ? '<button class="pm-x" id="pm-menu" aria-label="Menu">' + ico('user', 18) + '</button>' : '') : '<button class="pm-x" id="pm-close" aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button>') + '</div>' +
      '<div id="pm-instbn"></div><div id="pm-pane"></div></div>' +
      '<nav class="pm-nav" aria-label="Menu">' + NAV.map(function (n) { return '<button type="button" data-t="' + n[0] + '" class="' + (S.tab === n[0] ? 'on' : '') + '">' + ico(n[2], 22) + '<span>' + esc(T(n[1])) + '</span></button>'; }).join('') + '</nav>';
    var cl = o.querySelector('#pm-close'); if (cl) cl.onclick = close;
    o.querySelector('#pm-lang').onchange = function () { setLang(this.value); render(); };
    var ic = o.querySelector('#pm-instchip'); if (ic) ic.onclick = installApp;
    var ad = o.querySelector('#pm-adm'); if (ad) ad.onclick = function () { openOwner(); };
    var mn = o.querySelector('#pm-menu'); if (mn) mn.onclick = accountMenu;
    var lb = o.querySelector('#pm-login'); if (lb) lb.onclick = function () { if (SA) { loginModal(); return; } lsSet(S.slug + '|' + Date.now()); close(); try { openAuth('login'); } catch (e) { /* ignore */ } };
    var bc = o.querySelector('#pm-balchip'); if (bc) bc.onclick = function () { S.tab = 'wal'; render(); };
    o.querySelectorAll('.pm-nav [data-t]').forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-t'); render(); o.scrollTop = 0; }; });
    ({ home: paneHome, new: paneNew, svc: paneSvc, ord: paneOrd, wal: paneWallet })[S.tab](o.querySelector('#pm-pane'));
    if (showInst) installBanner(o.querySelector('#pm-instbn'));
    o.scrollTop = keep;
    if (logged) refreshBalance();
    if (logged && S.isOwner === undefined) { S.isOwner = false; api('pm_owner_get').then(function (r) { if (r && String(r.slug || '').toLowerCase() === S.slug) { S.isOwner = true; render(); } }).catch(function () { }); }
  }
  function accountMenu() {
    var m = sheet('<div class="hd"><h2>' + esc((auth.currentUser && (auth.currentUser.displayName || auth.currentUser.email)) || T('login')) + '</h2><button class="pm-x" data-x aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div>' +
      '<div style="display:grid;gap:8px;margin-top:10px">' + (S.isOwner ? '<button class="pm-b w" id="pm-am-ow">' + ico('cog', 18) + esc(T('admin')) + '</button><button class="pm-b w" id="pm-am-wd">' + ico('up', 18) + esc(T('w_wd')) + '</button>' : '') +
      '<button class="pm-b w" id="pm-am-out">' + ico('out', 18) + esc(T('logout')) + '</button></div>');
    var a = m.querySelector('#pm-am-ow'); if (a) a.onclick = function () { m.remove(); openOwner(); };
    var w = m.querySelector('#pm-am-wd'); if (w) w.onclick = function () { m.remove(); openOwner(true); };
    m.querySelector('#pm-am-out').onclick = function () { m.remove(); S.isOwner = undefined; auth.signOut().then(render); };
  }

  /* ---------- parrainage ---------- */
  function refBlock(box) {
    if (!auth.currentUser) { box.innerHTML = ''; return; }
    var pct = S.store.refPct || 0; if (!pct) { box.innerHTML = ''; return; }
    var link = location.origin + '/panel/' + S.slug + '?ref=' + auth.currentUser.uid;
    box.innerHTML = '<div class="pm-card"><h2>' + ico('gift', 18) + esc(T('ref_title')) + '</h2><p class="pm-n">' + esc(T('ref_text', { pct: pct })) + '</p><div class="pm-link">' + esc(link) + '</div>' +
      '<div class="pm-kpi"><div><b id="pm-rc">…</b><span>' + esc(T('ref_count')) + '</span></div><div><b id="pm-re">…</b><span>' + esc(T('ref_earn')) + '</span></div></div><button class="pm-b p w" id="pm-rcopy">' + ico('copy', 16) + esc(T('copy')) + '</button><button class="pm-b w" id="pm-rshare" style="margin-top:8px">' + ico('share', 16) + esc(T('ref_share')) + '</button></div>';
    box.querySelector('#pm-rcopy').onclick = function () { try { navigator.clipboard.writeText(link); toast(T('copied'), 'success'); } catch (e) { toast(link); } };
    box.querySelector('#pm-rshare').onclick = function () { if (navigator.share) { navigator.share({ title: S.store.shop.name, text: T('ref_msg'), url: link }).catch(function () { }); } else { box.querySelector('#pm-rcopy').click(); } };
    api('pm_ref', { slug: S.slug }).then(function (r) { var a = box.querySelector('#pm-rc'), b = box.querySelector('#pm-re'); if (a) a.textContent = r.count; if (b) b.textContent = money(r.earned); }).catch(function () { });
  }
  function goRecharge() { rechargeModal(); }

  function groups() { var g = {}; (S.store.items || []).forEach(function (x) { (g[x.group] = g[x.group] || []).push(x); }); return g; }
  function paneHome(pane) {
    var g = groups(), names = Object.keys(g), n = (S.store.items || []).length;
    var ownCard = S.isOwner ? '<div class="pm-card" style="border-color:var(--pm-a,#1b4fd8)"><h2>' + ico('cog', 18) + esc(T('ow_title')) + '</h2><p class="pm-n" style="margin-top:0">' + esc(T('ow_home')) + '</p><div style="display:flex;gap:8px"><button class="pm-b p w" id="pm-oh-a">' + esc(T('admin')) + '</button><button class="pm-b w" id="pm-oh-w">' + ico('up', 16) + esc(T('w_wd')) + '</button></div></div>' : '';
    pane.innerHTML = ownCard + '<div class="pm-card pm-hero"><h2>' + esc(S.store.title) + '</h2><p>' + esc(S.store.welcome || S.store.shop.tagline || T('h_default')) + '</p><button class="pm-b p w" id="pm-h-go">' + ico('bolt', 17) + esc(T('h_order')) + '</button></div>' +
      '<div class="pm-trust"><span>' + ico('shield', 14) + esc(T('t_secure')) + '</span><span>' + ico('refresh', 14) + esc(T('t_refund')) + '</span><span>' + ico('lock', 14) + esc(T('t_nopass')) + '</span></div>' +
      '<div class="pm-stats"><div><b>' + names.length + '</b><span>' + esc(T('h_nets')) + '</span></div><div><b>' + n + '</b><span>' + esc(T('h_svcs')) + '</span></div><div><b>24/7</b><span>' + esc(T('h_auto')) + '</span></div></div>' +
      '<div class="pm-card"><h2>' + esc(T('h_pick')) + '</h2><div class="pm-grid">' + names.map(function (nm) { var pid = g[nm][0].platform; return '<button type="button" class="pm-plat" data-g="' + esc(nm) + '">' + pIcon(pid, nm) + '<b>' + esc(nm) + '</b></button>'; }).join('') + '</div></div>' +
      '<div class="pm-card"><h2>' + esc(T('h_how')) + '</h2><ol class="pm-steps"><li><i>1</i><span>' + esc(T('h_how1')) + '</span></li><li><i>2</i><span>' + esc(T('h_how2')) + '</span></li><li><i>3</i><span>' + esc(T('h_how3')) + '</span></li><li><i>4</i><span>' + esc(T('h_how4')) + '</span></li></ol></div>';
    var oa = pane.querySelector('#pm-oh-a'); if (oa) { oa.onclick = function () { openOwner(); }; pane.querySelector('#pm-oh-w').onclick = function () { openOwner(true); }; }
    pane.querySelector('#pm-h-go').onclick = function () { S.tab = 'new'; render(); };
    pane.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { S.sel = (g[b.getAttribute('data-g')] || [])[0]; S.tab = 'new'; render(); }; });
    var rbx = document.createElement('div'); pane.appendChild(rbx); refBlock(rbx);
    var h = document.createElement('div'); pane.appendChild(h); paneHelp(h);
  }

  var TXLBL = ['order_purchase', 'order_refund', 'panel_income', 'panel_referral', 'panel_referral_reversed', 'topup', 'deposit', 'withdrawal_request', 'withdrawal_rejected_refund'];
  function paneWallet(pane) {
    if (!auth.currentUser) { pane.innerHTML = '<div class="pm-card pm-wal"><div class="l">' + ico('wallet', 16) + esc(T('w_title')) + '</div><p style="font-size:.9rem;margin:10px 0 14px;opacity:.9">' + esc(T('w_login')) + '</p><button class="pm-b w" id="pm-lg3">' + esc(T('login')) + '</button></div>'; pane.querySelector('#pm-lg3').onclick = function () { document.getElementById('pm-login').click(); }; return; }
    pane.innerHTML = '<div class="pm-card pm-wal"><div class="l">' + ico('wallet', 16) + esc(T('w_bal')) + '</div><div class="v" id="pm-wbal">' + (S.bal != null ? money(S.bal) : '…') + '</div><div class="btns"><button class="pm-b g" id="pm-w-rc" style="background:#fff;color:#14213d;border-color:#fff">' + ico('plus', 16) + esc(T('w_rc')) + '</button>' + (S.isOwner ? '<button class="pm-b g" id="pm-w-wd">' + ico('up', 16) + esc(T('w_wd')) + '</button>' : '') + '</div></div>' +
      '<div class="pm-card"><h2>' + esc(T('rc_title')) + '</h2><div class="pm-trust" style="margin:0 0 8px"><span>' + LG.mpesa + '</span><span>' + LG.airtel + '</span><span>' + LG.orange + '</span><span>' + LG.illico + '</span><span>' + LG.visa + '</span><span>' + LG.mc + '</span><span>' + LG.usdt + '</span><span>' + LG.btc + '</span></div><button class="pm-b p w" id="pm-w-rc2">' + ico('plus', 16) + esc(T('w_rc')) + '</button></div>' +
      '<div id="pm-refbox"></div><div class="pm-card"><h2>' + esc(T('w_moves')) + '</h2><div id="pm-wtx"><p class="pm-n">' + esc(T('loading')) + '</p></div></div>';
    refBlock(pane.querySelector('#pm-refbox'));
    pane.querySelector('#pm-w-rc').onclick = goRecharge; pane.querySelector('#pm-w-rc2').onclick = goRecharge;
    var wd = pane.querySelector('#pm-w-wd'); if (wd) wd.onclick = function () { openOwner(true); };
    api('pm_orders', { slug: S.slug }).then(function (r) { S.bal = r.balance; var el = pane.querySelector('#pm-wbal'); if (el) el.textContent = money(r.balance); }).catch(function () { });
    try {
      db.collection('wallet_transactions').where('uid', '==', auth.currentUser.uid).limit(60).get().then(function (sn) {
        var rows = sn.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 15), el = pane.querySelector('#pm-wtx'); if (!el) return;
        el.innerHTML = rows.length ? rows.map(function (t) { var pos = (t.amount || 0) >= 0, lb = TXLBL.indexOf(t.type) >= 0 ? T('tx_' + t.type) : t.type; return '<div class="pm-row"><div><b>' + esc(lb) + '</b><small>' + esc((t.description || '').slice(0, 70)) + '<br>' + esc(dt(t.createdAt)) + '</small></div><div class="pm-pr" style="color:' + (pos ? '#166534' : '#b42318') + '">' + (pos ? '+' : '') + money(t.amount) + '</div></div>'; }).join('') : '<p class="pm-n">' + esc(T('w_nomoves')) + '</p>';
      }).catch(function () { var el = pane.querySelector('#pm-wtx'); if (el) el.innerHTML = '<p class="pm-n">' + esc(T('w_unavail')) + '</p>'; });
    } catch (e) { /* ignore */ }
  }
  function refreshBalance() { api('pm_orders', { slug: S.slug }).then(function (r) { S.bal = r.balance; var el = document.getElementById('pm-balchip'); if (el) el.textContent = money(r.balance); }).catch(function () { var el = document.getElementById('pm-balchip'); if (el) el.textContent = '—'; }); }

  function paneNew(pane) {
    var g = groups(), names = Object.keys(g); if (!names.length) { pane.innerHTML = '<div class="pm-card"><p class="pm-n">' + esc(T('o_none')) + '</p></div>'; return; }
    var curGroup = S.sel ? S.sel.group : names[0];
    var svcs = g[curGroup] || [];
    if (!S.sel || S.sel.group !== curGroup) S.sel = svcs[0];
    pane.innerHTML = '<div class="pm-card"><h2>' + (S.sel ? pIcon(S.sel.platform, S.sel.group) : '') + esc(T('o_title')) + '</h2>' + (S.store.welcome ? '<p class="pm-n">' + esc(S.store.welcome) + '</p>' : '') +
      '<div class="pm-f"><label for="pm-g">' + esc(T('o_net')) + '</label><select id="pm-g">' + names.map(function (n) { return '<option' + (n === curGroup ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>' +
      '<div class="pm-f"><label for="pm-s">' + esc(T('o_svc')) + '</label><select id="pm-s">' + svcs.map(function (x) { return '<option value="' + esc(x.id) + '"' + (S.sel && S.sel.id === x.id ? ' selected' : '') + '>' + esc(x.name) + ' — ' + money(x.per1000) + ' ' + esc(T('s_per')) + '</option>'; }).join('') + '</select></div>' +
      '<p class="pm-n" id="pm-info"></p>' +
      '<div class="pm-f"><label for="pm-l">' + esc(T('o_link')) + '</label><input id="pm-l" maxlength="300" placeholder="https://… / @account" autocomplete="off" inputmode="url"></div>' +
      '<div class="pm-f"><label for="pm-q">' + esc(T('o_qty')) + '</label><input id="pm-q" inputmode="numeric" maxlength="8"></div>' +
      '<div class="pm-sum">' + esc(T('o_total')) + ' : <b id="pm-tot">' + money(0) + '</b><div class="pm-n" id="pm-rng"></div></div><p class="pm-err" id="pm-err"></p>' +
      '<button class="pm-b p w" id="pm-go">' + esc(T('o_go')) + '</button><p class="pm-n">' + esc(T('o_note')) + '</p></div>';
    var sel = pane.querySelector('#pm-s'), qty = pane.querySelector('#pm-q'), err = pane.querySelector('#pm-err');
    function upd() { var x = S.sel; if (!x) return; pane.querySelector('#pm-info').textContent = x.info || ''; pane.querySelector('#pm-rng').textContent = T('o_range', { min: x.min, max: num(x.max) }) + ' · ' + money4(x.per1000) + ' ' + T('s_per');
      var q = parseInt(qty.value, 10), t = (q > 0) ? Math.max(0.01, Math.ceil(x.per1000 * q / 1000 * 100 - 1e-9) / 100) : 0; pane.querySelector('#pm-tot').textContent = money(t); qty.placeholder = String(x.min); }
    pane.querySelector('#pm-g').onchange = function () { S.sel = (g[this.value] || [])[0]; paneNew(pane); };
    sel.onchange = function () { S.sel = svcs.filter(function (x) { return String(x.id) === sel.value; })[0]; upd(); };
    qty.oninput = upd; upd();
    pane.querySelector('#pm-go').onclick = async function () {
      var b = this; err.textContent = '';
      if (!auth.currentUser) { if (SA) { loginModal(); return; } lsSet(S.slug + '|' + Date.now()); close(); try { openAuth('login'); } catch (e) { /* ignore */ } return; }
      var x = S.sel, q = parseInt(qty.value, 10), link = pane.querySelector('#pm-l').value.trim();
      if (!link) { err.textContent = T('o_e_link'); return; }
      if (!(q >= x.min && q <= x.max)) { err.textContent = T('o_e_qty', { min: x.min, max: x.max }); return; }
      var tot = pane.querySelector('#pm-tot').textContent;
      if (!(await askSheet(T('o_confirm'), [[T('o_svc'), x.group + ' — ' + x.name], [T('o_qty'), String(q)], [T('o_total'), tot]], T('o_go'), T('g_cf_edit')))) return;
      b.disabled = true; b.textContent = T('o_sending');
      try {
        var r = await api('pm_order', { slug: S.slug, serviceId: x.id, quantity: q, link: link, requestId: S.rid, ref: (function () { try { return localStorage.getItem('cn_pm_ref_' + S.slug) || ''; } catch (e) { return ''; } })() });
        S.rid = uid();
        if (r.status === 'refunded') { err.textContent = r.message || T('o_refunded'); b.disabled = false; b.textContent = T('o_go'); refreshBalance(); return; }
        toast(T('o_sent'), 'success'); S.tab = 'ord'; render();
      } catch (e) {
        b.disabled = false; b.textContent = T('o_go'); err.textContent = errMsg(e);
        if (/solde insuffisant|insufficient|insuficiente|insufficiente/i.test(e.message || '')) { err.innerHTML = esc(T('e_low')) + ' <a href="#" id="pm-rc2">' + esc(T('o_recharge')) + '</a>'; var a = pane.querySelector('#pm-rc2'); if (a) a.onclick = function (ev) { ev.preventDefault(); goRecharge(); }; }
      }
    };
  }
  function paneSvc(pane) {
    pane.innerHTML = '<div class="pm-card"><div class="pm-f" style="margin-top:0"><input id="pm-sq" placeholder="' + esc(T('s_search')) + '" maxlength="40" value="' + esc(S.q) + '"></div><div id="pm-sl"></div></div>';
    function draw() {
      var q = S.q.toLowerCase(), g = groups(), h = '';
      Object.keys(g).forEach(function (n) {
        var l = g[n].filter(function (x) { return !q || (n + ' ' + x.name).toLowerCase().indexOf(q) >= 0; }); if (!l.length) return;
        h += '<div class="pm-grp">' + pIcon(l[0].platform, n) + '<span>' + esc(n) + '</span></div>' + l.map(function (x) { return '<div class="pm-row"><div><b>' + esc(x.name) + '</b><small>ID ' + esc(x.id) + ' · ' + esc(x.info) + ' · ' + esc(T('o_range', { min: x.min, max: num(x.max) })) + '</small></div><div class="pm-pr">' + money4(x.per1000) + '<small>' + esc(T('s_per')) + '</small></div></div>'; }).join('');
      });
      pane.querySelector('#pm-sl').innerHTML = h || '<p class="pm-n">' + esc(T('s_none')) + '</p>';
    }
    pane.querySelector('#pm-sq').oninput = function () { S.q = this.value; draw(); }; draw();
  }
  var STC = { pending: 'w', processing: 'i', completed: 'g', partial: 'w', refunded: 'n', pending_review: 'w', canceled: 'n' };
  function stBadge(s) { return '<span class="pm-bd ' + (STC[s] || 'n') + '">' + esc(['pending', 'processing', 'completed', 'partial', 'refunded', 'pending_review', 'canceled'].indexOf(s) >= 0 ? T('st_' + s) : s) + '</span>'; }
  function paneOrd(pane) {
    if (!auth.currentUser) { pane.innerHTML = '<div class="pm-card"><p class="pm-n">' + esc(T('r_login')) + '</p><button class="pm-b p w" id="pm-lg2">' + esc(T('login')) + '</button></div>'; pane.querySelector('#pm-lg2').onclick = function () { document.getElementById('pm-login').click(); }; return; }
    pane.innerHTML = '<div class="pm-card"><h2>' + esc(T('r_title')) + '</h2><p class="pm-n">' + esc(T('loading')) + '</p></div>';
    api('pm_orders', { slug: S.slug }).then(function (r) {
      S.bal = r.balance; var el = document.getElementById('pm-balchip'); if (el) el.textContent = money(r.balance);
      pane.innerHTML = '<div class="pm-card"><h2>' + ico('hist', 18) + esc(T('r_title')) + '</h2>' + (r.orders.length ? r.orders.map(function (o) { return '<div class="pm-row"><div><b>' + esc(o.service) + '</b> × ' + esc(o.quantity) + '<small>' + esc(o.link) + '<br>' + esc(dt(o.createdAt)) + (o.remains ? ' · ' + esc(T('r_rest')) + ' : ' + esc(o.remains) : '') + '</small></div><div style="text-align:right">' + stBadge(o.status) + '<div class="pm-pr" style="margin-top:4px">' + money(o.price) + '</div></div></div>'; }).join('') : '<p class="pm-n">' + esc(T('r_empty')) + '</p>') + '<button class="pm-b w" id="pm-rf" style="margin-top:10px">' + ico('refresh', 16) + esc(T('refresh')) + '</button></div>';
      pane.querySelector('#pm-rf').onclick = function () { paneOrd(pane); };
    }).catch(function (e) { pane.innerHTML = '<div class="pm-card"><p class="pm-err">' + esc(errMsg(e)) + '</p></div>'; });
  }
  function paneHelp(pane) {
    var wa = (S.store.shop.whatsapp || '').replace(/\D/g, '');
    pane.innerHTML = '<div class="pm-card"><h2>' + esc(T('f_title')) + '</h2><p class="pm-n"><b>' + esc(T('f_q1')) + '</b> ' + esc(T('f_a1')) + '<br><br><b>' + esc(T('f_q2')) + '</b> ' + esc(T('f_a2')) + '<br><br><b>' + esc(T('f_q3')) + '</b> ' + esc(T('f_a3')) + '<br><br><b>' + esc(T('f_q4')) + '</b> ' + esc(T('f_a4')) + '</p></div>' +
      (wa.length > 6 ? '<div class="pm-card"><a class="pm-b p w" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">' + esc(T('f_wa', { name: S.store.shop.name || T('f_seller') })) + '</a></div>' : '');
  }

  /* ================= Espace propriétaire ================= */
  var OW = null;
  function openOwner(toWd) {
    if (!auth.currentUser) { toast(T('e_login')); return; }
    var o = document.getElementById('pm-ov'); if (o) o.remove();
    o = document.createElement('div'); o.className = 'pm-ov'; o.id = 'pm-ov'; document.body.appendChild(o); document.body.style.overflow = 'hidden';
    try { if (S.store && S.store.shop.accent) o.style.setProperty('--pm-a', S.store.shop.accent); } catch (e) { /* ignore */ }
    o.innerHTML = '<div class="pm-in"><div class="pm-top"><h1>' + esc(T('ow_title')) + '<small>' + esc(T('ow_sub')) + '</small></h1>' + langSel() + '<button class="pm-x" id="pm-close" aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div><div id="pm-pane"><p class="pm-n" style="padding:24px">' + esc(T('loading')) + '</p></div></div>';
    o.querySelector('#pm-close').onclick = close;
    o.querySelector('#pm-lang').onchange = function () { setLang(this.value); if (OW) drawOwner(o.querySelector('#pm-pane'), toWd); };
    api('pm_owner_get').then(function (r) { OW = r; drawOwner(o.querySelector('#pm-pane'), toWd); }).catch(function (e) { o.querySelector('#pm-pane').innerHTML = '<div class="pm-card"><p class="pm-err">' + esc(errMsg(e)) + '</p></div>'; });
  }

  /* ===== Retrait des gains du propriétaire : formulaire toujours visible ===== */
  var WDC = { pending: ['wd_pending', 'w'], paid: ['wd_paid', 'g'], rejected: ['wd_rejected', 'n'] };
  function wdBlock(box) {
    box.innerHTML = '<div class="pm-card"><h2>' + ico('up', 18) + esc(T('g_title')) + '</h2><p class="pm-n">' + esc(T('loading')) + '</p></div>';
    api('pm_wd_info').then(function (r) { drawWd(box, r); }).catch(function (e) { box.innerHTML = '<div class="pm-card"><h2>' + esc(T('g_title')) + '</h2><p class="pm-err">' + esc(errMsg(e)) + '</p></div>'; });
  }
  // Pays de retrait Mobile Money : [code, indicatif, opérateurs courants]. Liste vide = on propose tous les opérateurs.
  var WD_C = [['CD', '243', ['mpesa', 'airtel', 'orange']], ['CG', '242', ['airtel', 'mtn']], ['CM', '237', ['mtn', 'orange']], ['CI', '225', ['orange', 'mtn']], ['SN', '221', ['orange']], ['ML', '223', ['orange']],
    ['BF', '226', ['orange']], ['BJ', '229', ['mtn']], ['TG', '228', []], ['NE', '227', ['airtel', 'orange']], ['GN', '224', ['orange', 'mtn']], ['GA', '241', ['airtel']], ['TD', '235', ['airtel']],
    ['CF', '236', []], ['BI', '257', []], ['RW', '250', ['mtn', 'airtel']], ['UG', '256', ['mtn', 'airtel']], ['KE', '254', ['mpesa', 'airtel']], ['TZ', '255', ['mpesa', 'airtel']], ['ZM', '260', ['mtn', 'airtel']],
    ['MW', '265', ['airtel']], ['MZ', '258', ['mpesa']], ['ZW', '263', []], ['ET', '251', []], ['GH', '233', ['mtn']], ['NG', '234', []], ['MG', '261', ['orange', 'airtel']], ['SL', '232', ['orange', 'airtel']], ['LS', '266', ['mpesa']]];
  var WD_LAST = 'cn_pm_wd_last';
  function wdCountry(c) { for (var i = 0; i < WD_C.length; i++) if (WD_C[i][0] === c) return WD_C[i]; return null; }
  // Numéro complet (chiffres seulement) : indicatif + numéro local, sans zéro de tête ni indicatif en double.
  function wdDigits(dial, raw) {
    var d = String(raw || '').replace(/[^\d]/g, '');
    if (!dial) return d;
    if (d.indexOf(dial) === 0 && d.length >= dial.length + 8) return d;
    return dial + d.replace(/^0+/, '');
  }
  function drawWd(box, r) {
    var st = r.settings, can = !!st.enabled && !r.hasPending && r.available >= st.minUsd, dis = can ? '' : ' disabled';
    var reason = !st.enabled ? '<p class="pm-err">' + esc(T('g_off')) + '</p>' : r.hasPending ? '<p class="pm-n"><b>' + esc(T('g_pend')) + '</b></p>' : r.available < st.minUsd ? '<p class="pm-n"><b>' + esc(T('g_need', { min: money(st.minUsd) })) + '</b></p>' : '';
    var label = {}, kindOf = {}; r.methods.forEach(function (m) { label[m.id] = m.label; kindOf[m.id] = m.kind; });
    var phoneIds = r.methods.filter(function (m) { return m.kind === 'phone'; }).map(function (m) { return m.id; });
    var cryptoIds = r.methods.filter(function (m) { return m.kind !== 'phone'; }).map(function (m) { return m.id; });
    var last = {}; try { last = JSON.parse(localStorage.getItem(WD_LAST) || '{}') || {}; } catch (e) { last = {}; }
    var gc = wdCountry(last.cc) ? last.cc : (wdCountry(guessCountry()) ? guessCountry() : '');
    var ST = { tab: phoneIds.length ? 'mm' : 'usdt', cc: gc, op: last.op || '', crypto: cryptoIds[0] || '' };
    var rid = uid();
    var h = '<div class="pm-card" id="pm-wd"><h2>' + ico('up', 18) + esc(T('g_title')) + '</h2><div class="pm-kpi"><div><b>' + money(r.available) + '</b><span>' + esc(T('g_avail')) + '</span></div><div><b>' + money(r.onHold) + '</b><span>' + esc(T('g_hold')) + '</span></div><div><b>' + money(r.withdrawn) + '</b><span>' + esc(T('g_done')) + '</span></div></div>' +
      '<p class="pm-n">' + esc(T('g_note', { h: st.holdHours, fee: st.feePct, min: money(st.minUsd) })) + '</p>' + reason +
      '<div id="pm-wdform"></div></div>';
    if (r.history && r.history.length) h += '<div class="pm-card"><h2>' + esc(T('g_hist')) + '</h2>' + r.history.map(function (w) { var b = WDC[w.status] || [w.status, 'n']; return '<div class="pm-row"><div><b>' + money(w.net) + ' ' + esc(T('g_net')) + '</b><small>' + esc(w.method) + ' · ' + esc(String(w.createdAt || '').slice(0, 10)) + (w.fee ? ' · ' + esc(T('g_fee')) + ' ' + money(w.fee) : '') + '</small></div><span class="pm-st ' + b[1] + '">' + esc(T(b[0])) + '</span></div>'; }).join('') + '</div>';
    box.innerHTML = h;
    var fm = box.querySelector('#pm-wdform'), amt = Math.floor(r.available * 100) / 100;
    function opsFor() { var c = wdCountry(ST.cc), l = c && c[2].length ? c[2].filter(function (x) { return phoneIds.indexOf(x) >= 0; }) : phoneIds; return l.length ? l : phoneIds; }
    function draw() {
      var mm = ST.tab === 'mm', c = wdCountry(ST.cc), ops = opsFor(); if (mm && ops.indexOf(ST.op) < 0) ST.op = ops.length === 1 ? ops[0] : '';
      var tabs = '<div class="pm-tabs" style="grid-template-columns:1fr 1fr">' + (phoneIds.length ? '<button type="button" class="pm-tab' + (mm ? ' on' : '') + '" data-t="mm"' + dis + '><span class="lgs">' + LG.mpesa + LG.airtel + LG.orange + '</span><b>' + esc(T('g_tab_mm')) + '</b></button>' : '') +
        (cryptoIds.length ? '<button type="button" class="pm-tab' + (!mm ? ' on' : '') + '" data-t="usdt"' + dis + '><span class="lgs">' + LG.usdt + '</span><b>' + esc(T('g_tab_usdt')) + '</b></button>' : '') + '</div>';
      var body;
      if (mm) {
        body = '<div class="pm-f"><label for="pm-wc">' + esc(T('g_country')) + '</label><select id="pm-wc"' + dis + '>' + (ST.cc ? '' : '<option value="">' + esc(T('g_pick')) + '</option>') +
          WD_C.map(function (x) { return [x[0], cname(x[0])]; }).sort(function (a, b) { return a[1].localeCompare(b[1], LOC[lang()]); }).map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === ST.cc ? ' selected' : '') + '>' + flagOf(x[0]) + ' ' + esc(x[1]) + '</option>'; }).join('') +
          '<option value="XX"' + (ST.cc === 'XX' ? ' selected' : '') + '>' + esc(T('g_other')) + '</option></select></div>' +
          '<div class="pm-f"><label for="pm-wo">' + esc(T('g_op')) + '</label><select id="pm-wo"' + dis + '>' + (ST.op ? '' : '<option value="">' + esc(T('g_pick_op')) + '</option>') + ops.map(function (id) { return '<option value="' + esc(id) + '"' + (id === ST.op ? ' selected' : '') + '>' + esc(label[id]) + '</option>'; }).join('') + '</select></div>' +
          '<div class="pm-f"><label for="pm-wn">' + esc(T('g_name')) + '</label><input id="pm-wn" maxlength="60" autocomplete="name"' + dis + '></div>' +
          '<div class="pm-f"><label for="pm-wa">' + esc(c ? T('g_num') : T('g_num_full')) + '</label><div class="pm-ph">' + (c ? '<span class="pm-dial">+' + c[1] + '</span>' : '') + '<input id="pm-wa" type="tel" inputmode="tel" maxlength="20" autocomplete="tel-national" placeholder="' + esc(c ? T('g_num_ph') : '243812345678') + '"' + dis + '></div></div>';
      } else {
        body = '<div class="pm-f"><label for="pm-wk">' + esc(T('g_net_t')) + '</label><select id="pm-wk"' + dis + '>' + cryptoIds.map(function (id) { return '<option value="' + esc(id) + '"' + (id === ST.crypto ? ' selected' : '') + '>' + esc(label[id]) + '</option>'; }).join('') + '</select></div>' +
          '<div class="pm-f"><label for="pm-wa">' + esc(kindOf[ST.crypto] === 'trc20' ? T('g_trc') : T('g_bep')) + '</label><input id="pm-wa" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false"' + dis + '></div>';
      }
      fm.innerHTML = tabs + body + '<div class="pm-f"><label for="pm-wv">' + esc(T('g_amt')) + '</label><div class="pm-ph"><input id="pm-wv" inputmode="decimal" maxlength="8" value="' + esc(amt) + '"' + dis + '><button type="button" class="pm-b" id="pm-wall"' + dis + '>' + esc(T('g_all')) + '</button></div></div>' +
        '<div class="pm-sum" id="pm-wsum"></div><div class="pm-err" id="pm-werr"></div><button class="pm-b p w" id="pm-wgo"' + dis + '>' + esc(T('g_continue')) + '</button><p class="pm-n">' + esc(T('g_warn')) + '</p>';
      fm.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { keep(); ST.tab = b.getAttribute('data-t'); draw(); }; });
      var sc = fm.querySelector('#pm-wc'); if (sc) sc.onchange = function () { keep(); ST.cc = sc.value; ST.op = ''; draw(); };
      var so = fm.querySelector('#pm-wo'); if (so) so.onchange = function () { ST.op = so.value; };
      var sk = fm.querySelector('#pm-wk'); if (sk) sk.onchange = function () { keep(); ST.crypto = sk.value; draw(); };
      fm.querySelector('#pm-wv').oninput = sum; fm.querySelector('#pm-wall').onclick = function () { fm.querySelector('#pm-wv').value = amt; sum(); };
      fm.querySelector('#pm-wgo').onclick = next; sum(); restore();
    }
    var KEEP = { n: '', a: '' };
    function keep() { var n = fm.querySelector('#pm-wn'), a = fm.querySelector('#pm-wa'), v = fm.querySelector('#pm-wv'); if (n) KEEP.n = n.value; if (a) KEEP.a = a.value; if (v) amt = Number(String(v.value).replace(',', '.')) || 0; }
    function restore() { var n = fm.querySelector('#pm-wn'), a = fm.querySelector('#pm-wa'); if (n) n.value = KEEP.n; if (a) a.value = KEEP.a; }
    function cur() { var v = fm.querySelector('#pm-wv'); return Number(String(v.value).replace(',', '.')) || 0; }
    function sum() { var a = cur(), fee = Math.round(a * st.feePct) / 100, el = fm.querySelector('#pm-wsum'); el.innerHTML = esc(T('g_recv', { net: '@@N@@', amt: '@@A@@', fee: '@@F@@' })).replace('@@N@@', '<b>' + money(Math.max(0, a - fee)) + '</b>').replace('@@A@@', money(a)).replace('@@F@@', money(fee)); }
    function next() {
      var err = fm.querySelector('#pm-werr'); err.textContent = ''; keep();
      var a = cur(), mm = ST.tab === 'mm', method, account, holder = '', shown;
      if (!(a >= st.minUsd)) { err.textContent = T('g_e_min', { min: money(st.minUsd) }); return; }
      if (a > r.available + 0.001) { err.textContent = T('g_e_max', { max: money(r.available) }); return; }
      if (mm) {
        var c = wdCountry(ST.cc);
        if (!ST.cc) { err.textContent = T('g_e_country'); return; }
        if (!ST.op) { err.textContent = T('g_e_op'); return; }
        holder = (fm.querySelector('#pm-wn').value || '').trim(); if (holder.length < 2) { err.textContent = T('g_e_name'); return; }
        var raw = fm.querySelector('#pm-wa').value; account = wdDigits(c ? c[1] : '', raw);
        if (account.length < 9 || account.length > 15 || (c && account.length - c[1].length < 7)) { err.textContent = T('g_e_num'); return; }
        method = ST.op; shown = '+' + account + ' — ' + holder;
      } else {
        method = ST.crypto; account = (fm.querySelector('#pm-wa').value || '').trim();
        if (kindOf[method] === 'trc20' ? !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(account) : !/^0x[0-9a-fA-F]{40}$/.test(account)) { err.textContent = T('g_e_addr'); return; }
        shown = account;
      }
      confirmSheet({ method: method, account: account, holder: holder, amount: a, label: label[method], shown: shown });
    }
    function confirmSheet(q) {
      var fee = Math.round(q.amount * st.feePct) / 100, net = Math.max(0, Math.round((q.amount - fee) * 100) / 100);
      var m = sheet('<div id="pm-wcf"></div>'), b = m.querySelector('#pm-wcf'), busy = false;
      function row(k, v, strong) { return '<div class="pm-row"><span>' + esc(k) + '</span><' + (strong ? 'b' : 'span') + ' style="text-align:right;word-break:break-all;max-width:62%">' + esc(v) + '</' + (strong ? 'b' : 'span') + '></div>'; }
      b.innerHTML = '<div class="hd"><h2>' + esc(T('g_cf_t')) + '</h2><button class="pm-x" data-x aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div>' +
        row(T('g_cf_amt'), money(q.amount)) + row(T('g_cf_fee'), '− ' + money(fee)) + row(T('g_cf_net'), money(net), true) + row(T('g_method'), q.label) + row(T('g_cf_to'), q.shown) +
        '<p class="pm-n">' + esc(T('g_warn')) + '</p><div class="pm-err" id="pm-cerr"></div><div class="pm-acts2"><button class="pm-b p w" id="pm-cok">' + esc(T('g_cf_go')) + '</button><button class="pm-b w" id="pm-cno">' + esc(T('g_cf_edit')) + '</button></div>';
      b.querySelector('[data-x]').onclick = b.querySelector('#pm-cno').onclick = function () { if (!busy) m.remove(); };
      b.querySelector('#pm-cok').onclick = async function () {
        if (busy) return; busy = true; var ok = this, er = b.querySelector('#pm-cerr'); er.textContent = ''; ok.disabled = true; ok.textContent = T('o_sending');
        try {
          var res = await api('pm_wd_request', { method: q.method, account: q.account, holderName: q.holder, amount: q.amount, requestId: rid });
          try { localStorage.setItem(WD_LAST, JSON.stringify({ cc: ST.cc, op: ST.op })); } catch (e) { /* ignore */ }
          b.innerHTML = '<div class="hd"><h2>' + esc(T('g_ok_t')) + '</h2></div><p class="pm-n" style="font-size:.9rem">' + esc(T('g_ok_b', { net: money(res.net) })) + '</p><button class="pm-b p w" id="pm-cfin">' + esc(T('g_ok_close')) + '</button>';
          b.querySelector('#pm-cfin').onclick = function () { m.remove(); wdBlock(box); };
        } catch (e) { er.textContent = errMsg(e); busy = false; ok.disabled = false; ok.textContent = T('g_cf_go'); }
      };
    }
    draw();
    // Pays proposé d'après l'adresse IP si la personne n'en a pas encore choisi (une seule demande par session).
    if (!ST.cc && can) ipCountry().then(function (c) { if (c && wdCountry(c) && !ST.cc && ST.tab === 'mm' && document.body.contains(fm)) { keep(); ST.cc = c; draw(); } });
  }

  function drawOwner(pane, toWd) {
    var c = OW.cfg, st = OW.stats, url = OW.slug ? location.origin + '/panel/' + OW.slug : '';
    pane.innerHTML = (c.suspended ? '<div class="pm-card"><p class="pm-err" style="margin:0"><b>' + esc(T('ow_susp')) + '</b></p></div>' : '') +
      '<div id="pm-wdbox"></div>' +
      '<div class="pm-card"><h2>' + esc(T('ow_sum')) + '</h2><div class="pm-row"><span>' + esc(T('ow_orders')) + '</span><b>' + st.orders + '</b></div><div class="pm-row"><span>' + esc(T('ow_sales')) + '</span><b>' + money(st.sales) + '</b></div><div class="pm-row"><span>' + esc(T('ow_earn')) + '</span><b>' + money(st.earned) + '</b></div><p class="pm-n">' + esc(T('ow_note')) + '</p></div>' +
      '<div class="pm-card"><h2>' + ico('cog', 18) + esc(T('ow_set')) + '</h2><div class="pm-f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pm-on" style="width:20px;height:20px"' + (c.on ? ' checked' : '') + '><label for="pm-on" style="margin:0">' + esc(T('ow_on')) + '</label></div>' +
      '<div class="pm-f"><label for="pm-t">' + esc(T('ow_t')) + '</label><input id="pm-t" maxlength="80" value="' + esc(c.title) + '"></div>' +
      '<div class="pm-f"><label for="pm-w">' + esc(T('ow_w')) + '</label><textarea id="pm-w" rows="2" maxlength="300">' + esc(c.welcome) + '</textarea></div>' +
      '<div class="pm-f"><label for="pm-m">' + esc(T('ow_mk', { max: OW.maxMarkup })) + '</label><input id="pm-m" inputmode="decimal" maxlength="5" value="' + esc(c.markup) + '"></div><div class="pm-sum" id="pm-ex"></div>' +
      '<div class="pm-f"><label for="pm-rp">' + esc(T('ow_rp')) + '</label><input id="pm-rp" inputmode="numeric" maxlength="2" value="' + esc(c.refPct != null ? c.refPct : 20) + '"><p class="pm-n">' + esc(T('ow_rpn')) + '</p></div>' +
      '<div class="pm-f"><label>' + esc(T('ow_nets')) + '</label>' + OW.platforms.map(function (p) { return '<label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:6px 0;color:inherit"><input type="checkbox" style="width:18px;height:18px" data-p="' + esc(p.id) + '"' + (c.hiddenPlatforms.indexOf(p.id) < 0 ? ' checked' : '') + '>' + esc(p.name) + '</label>'; }).join('') + '</div>' +
      '<p class="pm-err" id="pm-err"></p><button class="pm-b p w" id="pm-save">' + esc(T('save')) + '</button></div>' +
      (url ? '<div class="pm-card"><h2>' + esc(T('ow_link')) + '</h2><div class="pm-link">' + esc(url) + '</div><button class="pm-b w" id="pm-copy">' + ico('copy', 16) + esc(T('copy')) + '</button></div>' : '<div class="pm-card"><p class="pm-n">' + esc(T('ow_nolink')) + '</p></div>') +
      '<div class="pm-card"><h2>' + esc(T('ow_recent')) + '</h2>' + (OW.recent.length ? OW.recent.map(function (o) { return '<div class="pm-row"><div><b>' + esc(o.service) + '</b> × ' + esc(o.quantity) + '<small>' + esc(dt(o.createdAt)) + '</small></div><div style="text-align:right">' + stBadge(o.status) + '<div class="pm-pr">+' + money(o.margin) + '</div></div></div>'; }).join('') : '<p class="pm-n">' + esc(T('ow_norecent')) + '</p>') + '</div>';
    var m = pane.querySelector('#pm-m'), ex = pane.querySelector('#pm-ex');
    function sample() { var mk = Math.min(Math.max(parseFloat(String(m.value).replace(',', '.')) || 0, 0), OW.maxMarkup), s = OW.sample[0]; if (!s) { ex.style.display = 'none'; return; } var base = s.per1000 / (1 + (OW.cfg.markup || 0) / 100), price = base * (1 + mk / 100); ex.innerHTML = esc(T('ow_ex', { svc: s.group + ' ' + s.label, price: '@@P@@', gain: '@@G@@' })).replace('@@P@@', '<b>' + money4(price) + '</b>').replace('@@G@@', '<b>' + money4(price - base) + '</b>'); }
    m.oninput = sample; sample();
    var cp = pane.querySelector('#pm-copy'); if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(url); toast(T('copied'), 'success'); } catch (e) { toast(url); } };
    pane.querySelector('#pm-save').onclick = async function () {
      var b = this, er = pane.querySelector('#pm-err'); er.textContent = ''; b.disabled = true;
      var hidden = [].filter.call(pane.querySelectorAll('[data-p]'), function (x) { return !x.checked; }).map(function (x) { return x.getAttribute('data-p'); });
      try { var r = await api('pm_owner_save', { on: pane.querySelector('#pm-on').checked, title: pane.querySelector('#pm-t').value, welcome: pane.querySelector('#pm-w').value, markup: parseFloat(String(m.value).replace(',', '.')) || 0, refPct: parseInt(pane.querySelector('#pm-rp').value, 10) || 0, hiddenPlatforms: hidden }); toast(T('ow_saved'), 'success'); OW.cfg = r.cfg; drawOwner(pane); } catch (e) { er.textContent = errMsg(e); }
      b.disabled = false;
    };
    var ib = document.createElement('div'); pane.appendChild(ib); installCard(ib);
    wdBlock(pane.querySelector('#pm-wdbox'));
    if (toWd) setTimeout(function () { var el = document.getElementById('pm-wdbox'), ov = document.getElementById('pm-ov'); if (el && ov) ov.scrollTop = 0; }, 50);
  }

  /* ===== Fenêtres (feuille du bas sur mobile) ===== */
  // Confirmation dans une feuille du même style que le reste (remplace la fenêtre grise du navigateur). Répond true / false.
  function askSheet(title, rows, okLabel, noLabel) {
    return new Promise(function (resolve) {
      var m = sheet('<div id="pm-ask"></div>'), b = m.querySelector('#pm-ask'), done = false;
      function fin(v) { if (done) return; done = true; m.remove(); resolve(v); }
      b.innerHTML = '<div class="hd"><h2>' + esc(title) + '</h2><button class="pm-x" data-x aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div>' +
        rows.map(function (r) { return '<div class="pm-row"><span>' + esc(r[0]) + '</span><b style="text-align:right;word-break:break-word;max-width:62%">' + esc(r[1]) + '</b></div>'; }).join('') +
        '<div class="pm-acts2" style="margin-top:14px"><button type="button" class="pm-b p w" data-y>' + esc(okLabel) + '</button><button type="button" class="pm-b w" data-n>' + esc(noLabel) + '</button></div>';
      b.querySelector('[data-y]').onclick = function () { fin(true); };
      b.querySelector('[data-n]').onclick = b.querySelector('[data-x]').onclick = function () { fin(false); };
      m.addEventListener('click', function (e) { if (e.target === m) fin(false); });
    });
  }
  function sheet(inner) {
    var m = document.getElementById('pm-modal'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'pm-modal'; m.className = 'pm-sheet';
    m.innerHTML = '<div class="box">' + inner + '</div>';
    try { var ov = document.getElementById('pm-ov'); var a = (ov && ov.style.getPropertyValue('--pm-a')) || (S.store && S.store.shop.accent); if (a) m.style.setProperty('--pm-a', a); } catch (e) { /* ignore */ }
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    m.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = function () { m.remove(); }; });
    return m;
  }

  /* ===== Installation sur l'écran d'accueil (Android, iPhone/iPad, Windows, Mac, Linux) ===== */
  var DIP = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); DIP = e; try { if (S.store && SA) render(); } catch (x) { /* ignore */ } });
  window.addEventListener('appinstalled', function () { DIP = null; toast(T('in_done'), 'success'); var m = document.getElementById('pm-modal'); if (m) m.remove(); if (S.store) render(); });
  function isInstalled() { try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; } }
  function installApp() {
    if (DIP) { var d = DIP; DIP = null; d.prompt(); d.userChoice.then(function () { }).catch(function () { }); return; }
    var ua = navigator.userAgent, ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/.test(ua), safariMac = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua), ff = /Firefox/.test(ua);
    var nm = S.store ? S.store.shop.name : 'panel';
    var steps = ios ? T('in_ios') : android ? T('in_android') : safariMac ? T('in_safari') : ff ? T('in_ff') : T('in_desk', { name: esc(nm) });
    sheet('<div class="hd"><h2>' + esc(T('in_title')) + '</h2><button class="pm-x" data-x aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div><p class="pm-n">' + esc(T('in_sub', { name: nm })) + '</p><p style="font-size:.92rem;line-height:1.6">' + steps + '</p><button class="pm-b p w" data-x>' + esc(T('ok')) + '</button>');
  }
  function installBanner(box) {
    var dis = ''; try { dis = localStorage.getItem(LSD) || ''; } catch (e) { /* ignore */ }
    if (!box || dis) return;
    box.innerHTML = '<div class="pm-inst"><div class="t">' + esc(T('in_banner', { name: S.store.shop.name || 'panel' })) + '<small>' + esc(T('in_card_s')) + '</small></div><button class="go" id="pm-ib-go">' + esc(T('install')) + '</button><button class="no" id="pm-ib-no" aria-label="' + esc(T('close')) + '">' + ico('x', 14) + '</button></div>';
    box.querySelector('#pm-ib-go').onclick = installApp;
    box.querySelector('#pm-ib-no').onclick = function () { try { localStorage.setItem(LSD, '1'); } catch (e) { /* ignore */ } box.innerHTML = ''; };
  }
  function installCard(box) {
    if (!SA || isInstalled()) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="pm-card" style="display:flex;gap:12px;align-items:center"><div style="flex:1"><h2 style="margin:0 0 4px">' + esc(T('in_card_t')) + '</h2><p class="pm-n" style="margin:0">' + esc(T('in_card_s')) + '</p></div><button class="pm-b p" id="pm-inst">' + ico('down', 16) + esc(T('install')) + '</button></div>';
    box.querySelector('#pm-inst').onclick = installApp;
  }

  /* ===== Connexion (page autonome) ===== */
  function loginModal() {
    if (window.__CN_PREVIEW_STORE) { sheet('<div class="hd"><h2>' + esc(T('pv_title')) + '</h2><button class="pm-x" data-x>' + ico('x', 18) + '</button></div><p class="pm-n">' + esc(T('pv_msg')) + '</p><button class="pm-b p w" data-x>' + esc(T('ok')) + '</button>'); return; }
    var reg = false;
    var m = sheet('<div class="hd"><h2 id="pm-lt">' + esc(T('lg_title')) + '</h2><button class="pm-x" data-x aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div><p class="pm-n">' + esc(T('lg_sub')) + '</p>' +
      '<button class="pm-b w" id="pm-g"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>' + esc(T('lg_google')) + '</button>' +
      '<p class="pm-n" style="text-align:center">' + esc(T('lg_or')) + '</p><div class="pm-f"><input id="pm-em" type="email" autocomplete="email" placeholder="' + esc(T('lg_email')) + '"></div><div class="pm-f"><input id="pm-pw" type="password" autocomplete="current-password" placeholder="' + esc(T('lg_pw')) + '"></div>' +
      '<div class="pm-err" id="pm-le"></div><button class="pm-b p w" id="pm-ls">' + esc(T('lg_go')) + '</button><p class="pm-n" style="text-align:center"><a href="#" id="pm-sw">' + esc(T('lg_reg')) + '</a> · <a href="#" id="pm-fp">' + esc(T('lg_forgot')) + '</a></p>');
    var err = m.querySelector('#pm-le'), done = function () { m.remove(); };
    function fail(e) { var c = (e && e.code) || ''; err.style.color = ''; err.textContent = /wrong-password|invalid-credential|user-not-found/.test(c) ? T('lg_e_bad') : /email-already/.test(c) ? T('lg_e_exists') : /weak-password/.test(c) ? T('lg_e_weak') : /invalid-email/.test(c) ? T('lg_e_mail') : /popup-closed|cancelled/.test(c) ? '' : /network/.test(c) ? T('lg_e_net') : /too-many/.test(c) ? T('rc_e_many') : (c ? T('lg_e_code', { code: c.replace('auth/', '') }) : T('lg_e_gen')); }
    m.querySelector('#pm-g').onclick = function () {
      err.textContent = ''; var pr = new firebase.auth.GoogleAuthProvider();
      var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      (ios ? auth.signInWithRedirect(pr) : auth.signInWithPopup(pr).then(done)).catch(function (e) { if (e && /popup-blocked/.test(e.code || '')) auth.signInWithRedirect(pr); else fail(e); });
    };
    m.querySelector('#pm-sw').onclick = function (ev) { ev.preventDefault(); reg = !reg; m.querySelector('#pm-lt').textContent = reg ? T('lg_reg') : T('lg_title'); m.querySelector('#pm-ls').textContent = reg ? T('lg_mk') : T('lg_go'); ev.target.textContent = reg ? T('lg_have') : T('lg_reg'); };
    m.querySelector('#pm-fp').onclick = function (ev) { ev.preventDefault(); var em = m.querySelector('#pm-em').value.trim(); if (!em) { err.textContent = T('lg_need'); return; } auth.sendPasswordResetEmail(em).then(function () { err.style.color = '#166534'; err.textContent = T('lg_sent'); }).catch(fail); };
    m.querySelector('#pm-ls').onclick = function () {
      var em = m.querySelector('#pm-em').value.trim(), pw = m.querySelector('#pm-pw').value; err.style.color = ''; err.textContent = '';
      if (!em || !pw) { err.textContent = T('lg_req'); return; }
      (reg ? auth.createUserWithEmailAndPassword(em, pw) : auth.signInWithEmailAndPassword(em, pw)).then(done).catch(fail);
    };
  }

  /* ===== Recharge complète : même système que l'application (SasPay, tous les pays, envoi direct) ===== */
  var MIN_USD = 2, MAX_USD = 1000;
  // Tous les pays de la liste SasPay (identique à l'application, script.js : PAY_COUNTRY_CODES). Le serveur reste seul juge :
  // il refuse proprement un pays que SasPay n'a pas activé, et le solde n'est jamais crédité d'après ce que dit le navigateur.
  var PAY_CODES = ('AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ ' +
    'DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR ' +
    'KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY ' +
    'QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW').split(' ');
  var PAY_SET = {}; PAY_CODES.forEach(function (c) { PAY_SET[c] = 1; });
  var PAY_TZ = {
    'Africa/Kinshasa': 'CD', 'Africa/Lubumbashi': 'CD', 'Africa/Brazzaville': 'CG', 'Africa/Douala': 'CM', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'SN', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF',
    'Africa/Lome': 'TG', 'Africa/Porto-Novo': 'BJ', 'Africa/Conakry': 'GN', 'Africa/Niamey': 'NE', 'Africa/Kampala': 'UG', 'Africa/Kigali': 'RW', 'Africa/Bujumbura': 'BI', 'Africa/Dar_es_Salaam': 'TZ',
    'Africa/Lusaka': 'ZM', 'Africa/Nairobi': 'KE', 'Africa/Accra': 'GH', 'Africa/Lagos': 'NG', 'Africa/Ndjamena': 'TD', 'Africa/Addis_Ababa': 'ET', 'Africa/Freetown': 'SL', 'Indian/Antananarivo': 'MG',
    'Africa/Libreville': 'GA', 'Africa/Maseru': 'LS', 'Africa/Blantyre': 'MW', 'Africa/Maputo': 'MZ', 'Africa/Harare': 'ZW', 'Africa/Bangui': 'CF', 'Africa/Malabo': 'GQ', 'Africa/Bissau': 'GW'
  };
  var CN_OVR = { XK: 'Kosovo', CD: { fr: 'RD Congo', en: 'DR Congo', es: 'RD del Congo', it: 'RD del Congo', pt: 'RD Congo' }, CG: 'Congo-Brazzaville' };
  function flagOf(c) { try { return String.fromCodePoint.apply(null, String(c).toUpperCase().split('').map(function (ch) { return 127397 + ch.charCodeAt(0); })); } catch (e) { return ''; } }
  var DN = null;
  function cname(c) {
    var o = CN_OVR[c]; if (o) return typeof o === 'string' ? o : (o[lang()] || o.fr);
    try { if (!DN || DN.l !== lang()) DN = { l: lang(), f: new Intl.DisplayNames([LOC[lang()]], { type: 'region' }) }; var n = DN.f.of(c); if (n && n !== c) return n; } catch (e) { /* ignore */ }
    return c;
  }
  function payCountries() { return PAY_CODES.map(function (c) { return [c, cname(c)]; }).sort(function (a, b) { return a[1].localeCompare(b[1], LOC[lang()]); }); }
  function ssGet(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  // Pays proposé d'office : dernier choix de la session, adresse IP (déjà demandée), fuseau horaire, langue du téléphone.
  function guessCountry() {
    var m = ssGet('cn_pay_country'); if (PAY_SET[m]) return m;
    var ip = ssGet('cn_ip_country'); if (PAY_SET[ip]) return ip;
    try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && PAY_SET[PAY_TZ[tz]]) return PAY_TZ[tz]; } catch (e) { /* ignore */ }
    try { var ls = [].concat(navigator.languages || [], navigator.language || []); for (var i = 0; i < ls.length; i++) { var x = /[-_]([A-Za-z]{2})$/.exec(String(ls[i] || '')); if (x && PAY_SET[x[1].toUpperCase()]) return x[1].toUpperCase(); } } catch (e) { /* ignore */ }
    return '';
  }
  // Pays d'après l'adresse IP, demandé UNE fois par session au serveur (aucune donnée personnelle envoyée).
  function ipCountry() {
    var c = ssGet('cn_ip_country'); if (c) return Promise.resolve(PAY_SET[c] ? c : '');
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, 3500) : null;
    return fetch('/api/payment-initiate?geo=1', { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { var k = d && typeof d.country === 'string' && PAY_SET[d.country] ? d.country : ''; ssSet('cn_ip_country', k); return k; })
      .catch(function () { return ''; }).then(function (k) { if (tm) clearTimeout(tm); return k; });
  }

  /* --- Envoi direct vers la page de paiement : voile discret, aucune attente volontaire --- */
  var PQ_CSS = '.pq-ov{--cd:#fff;--tx:#14213d;--mu:#5b6475;--bd:#e3e8f2;--so:#f3f5f9;position:fixed;inset:0;z-index:100030;background:rgba(10,16,32,.55);display:flex;align-items:flex-end;justify-content:center;font-family:inherit;color:var(--tx)}' +
    '.pq-card{background:var(--cd);width:100%;max-width:480px;border-radius:22px 22px 0 0;padding:20px 18px max(20px,env(safe-area-inset-bottom));max-height:92vh;overflow:auto}' +
    '@media(min-width:600px){.pq-ov{align-items:center}.pq-card{border-radius:22px}}' +
    '.pq-mini{align-items:center}.pq-mini .pq-card{border-radius:18px;margin:0 20px;max-width:340px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}' +
    '.pq-card h3{margin:0 0 6px;font-size:1.15rem}.pq-card p{margin:0 0 12px;font-size:.9rem;line-height:1.55;color:var(--mu)}.pq-card b{display:block}.pq-card small{display:block;color:var(--mu);font-size:.78rem;margin-top:3px}' +
    '.pq-sp{width:26px;height:26px;flex:none;border:3px solid var(--bd);border-top-color:var(--pm-a,#1b4fd8);border-radius:50%;animation:pqs .8s linear infinite;display:inline-block}.pq-sp.s{width:14px;height:14px;border-width:2px}@keyframes pqs{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.pq-sp{animation:none}}' +
    '.pq-ic{width:46px;height:46px;border-radius:14px;background:var(--pm-a,#1b4fd8);color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:12px}.pq-ic.ok{background:#166534}.pq-ic.bad{background:#b42318}.pq-ic.late{background:#92400e}' +
    '.pq-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.pq-chips span{border:1px solid var(--bd);background:var(--so);border-radius:99px;padding:6px 12px;font-size:.78rem;font-weight:700}' +
    '.pq-steps{list-style:none;margin:6px 0 12px;padding:0}.pq-steps li{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--bd);font-size:.88rem}.pq-steps li:last-child{border:0}' +
    '.pq-steps i{flex:none;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--bd);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:.78rem;font-weight:800;color:var(--mu)}.pq-steps li.d i{background:#dcfce7;border-color:#86efac;color:#166534}.pq-steps li.n{font-weight:700}.pq-steps li.n i{border-color:var(--pm-a,#1b4fd8)}' +
    '.pq-tip{background:var(--so);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;font-size:.84rem;line-height:1.5;margin:0 0 12px}.pq-meta{display:flex;justify-content:space-between;font-size:.76rem;color:var(--mu);margin:0 0 12px}' +
    '.pq-amt{font-size:2rem;font-weight:800;color:#166534;margin:2px 0 10px}.pq-alt{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.pq-alt .pm-b{padding:8px 14px;border-radius:99px;font-size:.84rem}.pq-acts{display:grid;gap:8px}.pq-acts .pm-b{width:100%}.pq-stuck{display:none;flex-basis:100%;font-size:.84rem}.pq-stuck a{color:var(--pm-a,#1b4fd8);font-weight:700}' +
    '@media(prefers-color-scheme:dark){.pq-ov{--cd:#182036;--tx:#e6eaf3;--mu:#9aa6c0;--bd:#2a3553;--so:#101830}.pq-steps li.d i{background:#14532d;border-color:#166534;color:#bbf7d0}.pq-amt{color:#86efac}}';
  var pqs = document.createElement('style'); pqs.textContent = PQ_CSS; document.head.appendChild(pqs);
  var PQ_LAST = 'cn_pay_last', QK = null, RT = null;
  function qClose() { if (QK && QK.el) QK.el.remove(); QK = null; }
  function qStart(method, amount) {
    try {
      qClose();
      try { localStorage.setItem(PQ_LAST, JSON.stringify({ m: method || '', a: Number(amount) || 0, t: Date.now() })); } catch (e) { /* ignore */ }
      var o = document.createElement('div'); o.className = 'pq-ov pq-mini'; o.setAttribute('role', 'status');
      o.innerHTML = '<div class="pq-card"><i class="pq-sp"></i><div><b>' + esc(T('pf_title')) + '</b><span style="font-size:.88rem;color:var(--mu)">' + esc(T('pf_sub')) + '</span>' + (method === 'mobile' ? '<small>' + esc(T('pf_hint')) + '</small>' : '') + '</div><div class="pq-stuck" id="pq-stuck"><a href="#" id="pq-link" rel="noopener">' + esc(T('pf_stuck')) + '</a></div></div>';
      document.body.appendChild(o); QK = { el: o };
    } catch (e) { QK = null; }
  }
  function qGo(url) {
    try { var l = document.getElementById('pq-link'), s = document.getElementById('pq-stuck'); if (l) l.setAttribute('href', url); setTimeout(function () { if (s && QK) s.style.display = 'block'; }, 3500); setTimeout(qClose, 25000); } catch (e) { /* ignore */ }
    try { location.href = url; } catch (e) { /* ignore */ }
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) qClose(); });

  /* --- Retour de paiement : message clair, suivi du solde en direct --- */
  function lastPay() { try { var o = JSON.parse(localStorage.getItem(PQ_LAST) || 'null'); return o && Date.now() - (o.t || 0) < 6 * 3600 * 1000 ? o : null; } catch (e) { return null; } }
  function rClose() { if (RT) { try { clearInterval(RT.iv); clearInterval(RT.tick); if (RT.unsub) RT.unsub(); } catch (e) { /* ignore */ } if (RT.el) RT.el.remove(); } RT = null; }
  function rHtml(state, d) {
    var mobile = RT && RT.mobile, h = '<div class="pq-card"><div class="pq-ic' + (state === 'ok' ? ' ok' : state === 'bad' ? ' bad' : state === 'late' ? ' late' : '') + '">' + ico(state === 'ok' ? 'check' : state === 'bad' ? 'x' : mobile ? 'phone' : 'lock', 22) + '</div>', acts = '';
    if (state === 'ok') {
      h += '<h3>' + esc(T('pf_ok_title')) + '</h3><div class="pq-amt">' + esc(money(d.gain)) + '</div><p>' + esc(T('pf_ok_body', { b: money(d.balance) })) + '</p>';
      acts = '<button type="button" class="pm-b p" data-q="wallet">' + esc(T('pf_wallet')) + '</button><button type="button" class="pm-b" data-q="close">' + esc(T('pf_done')) + '</button>';
    } else if (state === 'bad') {
      h += '<h3>' + esc(T('pf_bad_title')) + '</h3><p>' + esc(T('pf_bad_body')) + '</p>';
      acts = '<button type="button" class="pm-b p" data-q="retry">' + esc(T('pf_retry')) + '</button><button type="button" class="pm-b" data-q="close">' + esc(T('pf_close')) + '</button>';
    } else {
      var late = state === 'late';
      h += '<h3>' + esc(late ? T('pf_late_title') : (mobile ? T('pf_w_title') : T('pf_w_title2'))) + '</h3><p>' + esc(late ? T('pf_late_body') : (mobile ? T('pf_w_body') : T('pf_w_body2'))) + '</p>';
      if (mobile && !late) h += '<div class="pq-chips" aria-hidden="true"><span>M‑Pesa</span><span>Airtel Money</span><span>Orange Money</span><span>MTN MoMo</span></div>';
      if (mobile) h += '<ol class="pq-steps"><li class="d"><i>' + ico('check', 14) + '</i>' + esc(T('pf_s1')) + '</li><li class="n"><i>' + (late ? '2' : '<span class="pq-sp s"></span>') + '</i>' + esc(T('pf_s2')) + '</li><li><i>3</i>' + esc(T('pf_s3')) + '</li></ol><div class="pq-tip"><b>' + esc(T('pf_tip_t')) + '</b>' + esc(T('pf_tip')) + '</div>';
      h += '<div class="pq-meta"><span>' + esc(late ? '' : T('pf_auto')) + '</span><span id="pq-el"></span></div>';
      acts = (late ? '<button type="button" class="pm-b p" data-q="check">' + esc(T('pf_check')) + '</button><button type="button" class="pm-b" data-q="retry">' + esc(T('pf_retry')) + '</button>' : '') +
        '<button type="button" class="pm-b' + (late ? '' : ' p') + '" data-q="wallet">' + esc(T('pf_wallet')) + '</button><button type="button" class="pm-b" data-q="close">' + esc(T('pf_close')) + '</button>';
    }
    return h + '<div class="pq-acts">' + acts + '</div></div>';
  }
  function rDraw(state, d) { if (RT && RT.el) { RT.state = state; RT.el.innerHTML = rHtml(state, d || {}); } }
  function rSync() {
    try { auth.currentUser.getIdToken().then(function (tk) { return fetch('/api/payment-webhook?provider=saspay-sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk } }); }).catch(function () { /* l'avis automatique reste le chemin principal */ }); } catch (e) { /* ignore */ }
  }
  function rCredited(now) {
    if (!RT) return; var before = RT.before == null ? now : RT.before, gain = now - before; if (gain <= 0.0001 && RT.amount) gain = RT.amount;
    try { clearInterval(RT.iv); clearInterval(RT.tick); if (RT.unsub) RT.unsub(); } catch (e) { /* ignore */ }
    S.bal = now; rDraw('ok', { gain: gain, balance: now }); try { render(); } catch (e) { /* ignore */ }
  }
  var SYNC_AT = { 1: 1, 3: 1, 6: 1, 10: 1, 15: 1, 20: 1, 30: 1, 45: 1 };
  function rPoller() {
    if (!RT) return; clearInterval(RT.iv); RT.n = 0;
    RT.iv = setInterval(function () {
      if (!RT) return; RT.n++; if (SYNC_AT[RT.n]) rSync();
      api('pm_orders', { slug: S.slug }).then(function (r) {
        if (!RT) return;
        if (typeof r.balance === 'number' && RT.before != null && r.balance > RT.before + 0.0001) { rCredited(r.balance); return; }
        if (RT.n >= 60) { clearInterval(RT.iv); clearInterval(RT.tick); rDraw('late'); }
      }).catch(function () { if (RT && RT.n >= 60) { clearInterval(RT.iv); rDraw('late'); } });
    }, 3000);
  }
  function rStart() {
    api('pm_orders', { slug: S.slug }).then(function (r) {
      if (!RT) return; RT.before = typeof r.balance === 'number' ? r.balance : 0; S.bal = RT.before;
      rSync();
      try { RT.unsub = db.collection('users').doc(auth.currentUser.uid).onSnapshot(function (s) { if (!RT || !s || !s.exists) return; var b = Number(s.data().balance) || 0; if (RT.before != null && b > RT.before + 0.0001) rCredited(b); }, function () { /* le contrôle régulier prend le relais */ }); } catch (e) { /* ignore */ }
      rPoller();
    }).catch(function () { /* hors ligne : on réessaie au prochain affichage */ });
  }
  function showPayReturn(kind) {
    rClose();
    var lp = lastPay(), o = document.createElement('div'); o.className = 'pq-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    RT = { el: o, mobile: !lp || lp.m === 'mobile', amount: lp ? lp.a : 0, t0: Date.now(), before: null, n: 0 };
    document.body.appendChild(o);
    o.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-q]'); if (!b) return; var a = b.getAttribute('data-q');
      if (a === 'check') { if (RT) { rDraw('wait'); rSync(); rPoller(); } return; }
      rClose();
      if (a === 'wallet') { S.tab = 'wal'; try { render(); } catch (er) { /* ignore */ } }
      else if (a === 'retry') { try { rechargeModal(); } catch (er) { /* ignore */ } }
    });
    if (kind === 'failed') { rDraw('bad'); return; }
    rDraw('wait');
    RT.tick = setInterval(function () { var el = document.getElementById('pq-el'); if (el && RT) { var s = Math.floor((Date.now() - RT.t0) / 1000); el.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); } }, 1000);
    var w = 0, wi = setInterval(function () {
      w++; if (!RT || RT.el !== o) { clearInterval(wi); return; }
      if (auth.currentUser && S.store) { clearInterval(wi); rStart(); } else if (w > 80) { clearInterval(wi); }
    }, 400);
  }

  function rechargeModal() {
    if (!auth.currentUser) { loginModal(); return; }
    var amt = 10, method = 'mobile', cc = guessCountry(), busy = false;
    var m = sheet('<div id="pm-rcb"></div>');
    var box = m.querySelector('#pm-rcb');
    function tabs() {
      var T4 = [['mobile', 'rc_mobile', LG.mpesa + LG.airtel + LG.orange], ['illico', 'rc_illico', LG.illico], ['card', 'rc_card', LG.visa + LG.mc], ['crypto', 'rc_crypto', LG.usdt + LG.btc + LG.trx]];
      return '<div class="pm-tabs">' + T4.map(function (t) { return '<button type="button" class="pm-tab' + (method === t[0] ? ' on' : '') + '" data-m="' + t[0] + '"><span class="lgs">' + t[2] + '</span><b>' + esc(T(t[1])) + '</b></button>'; }).join('') + '</div>';
    }
    function how() {
      var l = method === 'mobile' ? ['rc_m1', 'rc_m2', 'rc_m3'] : method === 'crypto' ? ['rc_c1', 'rc_c2', 'rc_c3'] : ['rc_o1', 'rc_o2', 'rc_o3'];
      var note = method === 'illico' ? T('rc_illico_note') : method === 'card' ? T('rc_card_note') : method === 'crypto' ? T('rc_crypto_note') : T('rc_opt_note');
      return '<p class="pm-n">' + esc(note) + '</p><div class="pm-f" style="margin-bottom:0"><label>' + esc(T('rc_how')) + '</label><ol class="pm-steps">' + l.map(function (k, i) { return '<li><i>' + (i + 1) + '</i><span>' + esc(T(k)) + '</span></li>'; }).join('') + '</ol></div>';
    }
    // Mobile Money : seul le PAYS se choisit ici (détecté tout seul). Réseau et numéro se saisissent sur la page de paiement sécurisée.
    function mobileBlock() {
      return '<div class="pm-f"><label for="pm-cc">' + esc(T('rc_country')) + '</label><select id="pm-cc">' + (cc ? '' : '<option value="">' + esc(T('rc_choose')) + '</option>') +
        payCountries().map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cc ? ' selected' : '') + '>' + flagOf(x[0]) + ' ' + esc(x[1]) + '</option>'; }).join('') + '</select></div>';
    }
    function draw() {
      box.innerHTML = '<div class="hd"><h2>' + esc(T('rc_title')) + '</h2><button class="pm-x" data-x aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div><p class="pm-n" style="margin-top:0">' + esc(T('rc_sub')) + '</p>' + tabs() +
        '<div class="pm-f"><label>' + esc(T('rc_amount')) + '</label><div class="pm-amts">' + [2, 5, 10, 20, 50].map(function (a) { return '<button type="button" class="pm-b' + (a === amt ? ' p' : '') + '" data-a="' + a + '">' + a + ' $</button>'; }).join('') + '</div><input id="pm-ac" type="number" min="' + MIN_USD + '" max="' + MAX_USD + '" step="1" inputmode="decimal" placeholder="' + esc(T('rc_other')) + '" style="margin-top:8px" value="' + (amt > 0 ? amt : '') + '"></div>' +
        (method === 'mobile' ? mobileBlock() : '') +
        how() + '<div class="pm-err" id="pm-re2"></div><button class="pm-b p w" id="pm-pay">' + esc(T('rc_pay')) + ' ' + (amt > 0 ? amt + ' $' : '') + '</button><div class="pm-secure">' + ico('shield', 16) + '<span>' + esc(T('rc_secure')) + '</span></div>';
      box.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = function () { m.remove(); }; });
      box.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { method = b.getAttribute('data-m'); draw(); }; });
      box.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { amt = Number(b.getAttribute('data-a')); draw(); }; });
      var ccs = box.querySelector('#pm-cc'); if (ccs) ccs.onchange = function () { cc = ccs.value; if (PAY_SET[cc]) ssSet('cn_pay_country', cc); };
      box.querySelector('#pm-ac').oninput = function (e) { amt = Number(e.target.value) || 0; var p = box.querySelector('#pm-pay'); if (p) p.textContent = T('rc_pay') + ' ' + (amt > 0 ? amt + ' $' : ''); box.querySelectorAll('[data-a]').forEach(function (b) { b.className = 'pm-b' + (Number(b.getAttribute('data-a')) === amt ? ' p' : ''); }); };
      box.querySelector('#pm-pay').onclick = pay;
    }
    async function pay() {
      if (busy) return; var b = box.querySelector('#pm-pay'), err = box.querySelector('#pm-re2'); err.className = 'pm-err'; err.textContent = '';
      if (!(amt > 0) || amt !== Math.round(amt * 100) / 100) { err.textContent = T('rc_e_amount'); return; }
      if (amt < MIN_USD) { err.textContent = T('rc_e_min', { min: MIN_USD }); return; }
      if (amt > MAX_USD) { err.textContent = T('rc_e_amount'); return; }
      var body;
      if (method === 'mobile') {
        if (!PAY_SET[cc]) { err.textContent = T('rc_e_country'); return; }
        body = { provider: 'optgateway', amountUSD: amt, onlyMethod: 'mobile_money', countryCode: cc };
      } else if (method === 'crypto') body = { provider: 'crypto', amount: amt };
      else body = { provider: 'optgateway', amountUSD: amt, onlyMethod: method === 'illico' ? 'illicocash' : 'card' };
      busy = true; b.disabled = true; b.textContent = T('rc_paying');
      qStart(method, amt); // voile immédiat : la personne voit que ça part
      var sent = false;
      try {
        var tok = await auth.currentUser.getIdToken();
        body.idToken = tok; body.returnSlug = S.slug;
        var r = await fetch('/api/payment-initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); var j = await r.json();
        if (r.status === 429) throw new Error(j.error || T('rc_e_many'));
        if (!r.ok || !j.success || !/^https:\/\//.test(j.paymentUrl || '')) { var ge = new Error(j.error || T('rc_e_gen')); ge.mobile = /^mobile_/.test(String(j.code || '')); throw ge; }
        sent = true; qGo(j.paymentUrl);
      } catch (e) {
        qClose(); err.textContent = errMsg(e);
        // Pays sans Mobile Money (ou service coupé un instant) : deux boutons mènent tout de suite à la carte ou à la crypto.
        if (e && e.mobile) { var alt = document.createElement('div'); alt.className = 'pq-alt'; alt.innerHTML = '<button type="button" class="pm-b" data-alt="card">' + esc(T('rc_card')) + '</button><button type="button" class="pm-b" data-alt="crypto">' + esc(T('rc_crypto')) + '</button>'; err.appendChild(alt); alt.onclick = function (ev) { var bb = ev.target.closest && ev.target.closest('[data-alt]'); if (bb) { method = bb.getAttribute('data-alt'); draw(); } }; }
        busy = false; b.disabled = false; b.textContent = T('rc_pay') + ' ' + amt + ' $'; }
      if (sent) setTimeout(function () { busy = false; b.disabled = false; b.textContent = T('rc_pay') + ' ' + amt + ' $'; }, 15000);
    }
    draw();
    // L'adresse IP donne le pays le plus fiable : elle prime sur le fuseau horaire, sauf si la personne a déjà choisi elle-même.
    if (!ssGet('cn_pay_country')) ipCountry().then(function (c) { if (c && c !== cc && !ssGet('cn_pay_country') && document.body.contains(box) && method === 'mobile') { cc = c; draw(); } });
  }

  /* ===== Ouvrir un site dans l'application, sans la quitter ===== */
  function openSiteInApp(url) {
    var o = document.getElementById('pm-site'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'pm-site'; o.className = 'pm-ov'; o.style.zIndex = '99990'; o.style.background = '#fff';
    o.innerHTML = '<div style="position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#1f2f4d;color:#fff;z-index:2"><b style="font-size:.9rem">' + esc(T('pv_title')) + '</b><button class="pm-x" id="pm-site-x" aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div><iframe src="' + esc(url) + '" title="Site" style="border:0;width:100%;height:calc(100% - 52px)" referrerpolicy="same-origin"></iframe>';
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
    window.CNPanel = { open: openStore, owner: openOwner, site: openSiteInApp, install: installApp };
    if (SA) {
      try { var pq = new URL(location.href).searchParams.get('payment'); if (pq === 'success' || pq === 'failed') { if (pq === 'success') S.tab = 'wal'; var u2 = new URL(location.href); u2.searchParams.delete('payment'); history.replaceState(null, '', u2.pathname + (u2.search || '')); setTimeout(function () { showPayReturn(pq); }, 0); } } catch (e) { /* ignore */ }
      openStore(window.__CN_STANDALONE);
      try { auth.onAuthStateChanged(function () { S.isOwner = undefined; if (S.store) render(); }); } catch (e) { /* ignore */ }
      return;
    }
    var orig = window.siteHubHtml;
    if (typeof orig === 'function') {
      window.siteHubHtml = function () {
        var h = orig.apply(this, arguments);
        var tile = '<button type="button" class="sp-tile" onclick="CNPanel.owner()"><span class="sp-ic">' + (typeof uiIc === 'function' ? uiIc('chart', 20) : ico('up', 20)) + '</span><b>' + esc(T('ow_title')) + '</b><small>' + esc(T('ow_sub')) + '</small></button>';
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
