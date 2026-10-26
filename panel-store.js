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
    var s = document.createElement('script'); s.src = '/panel-i18n.js'; s.onload = main; s.onerror = main; document.head.appendChild(s);
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
    '.pm-wal{background:linear-gradient(135deg,#1f2f4d,#16233b);color:#fff;border:0}.pm-wal .l{font-size:.78rem;opacity:.8;display:flex;align-items:center;gap:6px}.pm-wal .v{font-size:2.2rem;font-weight:800;margin:6px 0 14px;letter-spacing:-.02em}.pm-wal .btns{display:flex;gap:8px}.pm-wal .btns .pm-b{flex:1;padding:12px 8px;font-size:.86rem}.pm-wal .pm-b.g{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.28);color:#fff}' +
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
    '.pm-secure{display:flex;gap:8px;align-items:flex-start;font-size:.74rem;color:var(--mu);margin-top:12px;line-height:1.45}.pm-secure svg{flex:none;color:#16a34a;margin-top:1px}' +
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
      if (!confirm(T('o_confirm') + '\n' + x.group + ' — ' + x.name + '\n' + T('o_qty') + ' : ' + q + '\n' + T('o_total') + ' : ' + tot)) return;
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
  function drawWd(box, r) {
    var st = r.settings, can = !!st.enabled && !r.hasPending && r.available >= st.minUsd, dis = can ? '' : ' disabled';
    var reason = !st.enabled ? '<p class="pm-err">' + esc(T('g_off')) + '</p>' : r.hasPending ? '<p class="pm-n"><b>' + esc(T('g_pend')) + '</b></p>' : r.available < st.minUsd ? '<p class="pm-n"><b>' + esc(T('g_need', { min: money(st.minUsd) })) + '</b></p>' : '';
    var h = '<div class="pm-card" id="pm-wd"><h2>' + ico('up', 18) + esc(T('g_title')) + '</h2><div class="pm-kpi"><div><b>' + money(r.available) + '</b><span>' + esc(T('g_avail')) + '</span></div><div><b>' + money(r.onHold) + '</b><span>' + esc(T('g_hold')) + '</span></div><div><b>' + money(r.withdrawn) + '</b><span>' + esc(T('g_done')) + '</span></div></div>' +
      '<p class="pm-n">' + esc(T('g_note', { h: st.holdHours, fee: st.feePct, min: money(st.minUsd) })) + '</p>' + reason +
      '<div class="pm-f"><label for="pm-wm">' + esc(T('g_method')) + '</label><select id="pm-wm"' + dis + '>' + r.methods.map(function (m) { return '<option value="' + esc(m.id) + '" data-k="' + esc(m.kind) + '">' + esc(m.label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="pm-f" id="pm-wnamebox"><label for="pm-wn">' + esc(T('g_name')) + '</label><input id="pm-wn" maxlength="60" autocomplete="name"' + dis + '></div>' +
      '<div class="pm-f"><label for="pm-wa" id="pm-wal"></label><input id="pm-wa" maxlength="80" autocomplete="off"' + dis + '></div>' +
      '<div class="pm-f"><label for="pm-wv">' + esc(T('g_amt')) + '</label><input id="pm-wv" inputmode="decimal" maxlength="8" value="' + esc(Math.floor(r.available * 100) / 100) + '"' + dis + '></div>' +
      '<div class="pm-sum" id="pm-wsum"></div><div class="pm-err" id="pm-werr"></div><button class="pm-b p w" id="pm-wgo"' + dis + '>' + esc(T('g_go')) + '</button>' +
      '<p class="pm-n">' + esc(T('g_warn')) + '</p></div>';
    if (r.history && r.history.length) h += '<div class="pm-card"><h2>' + esc(T('g_hist')) + '</h2>' + r.history.map(function (w) { var b = WDC[w.status] || [w.status, 'n']; return '<div class="pm-row"><div><b>' + money(w.net) + ' ' + esc(T('g_net')) + '</b><small>' + esc(w.method) + ' · ' + esc(String(w.createdAt || '').slice(0, 10)) + (w.fee ? ' · ' + esc(T('g_fee')) + ' ' + money(w.fee) : '') + '</small></div><span class="pm-bd ' + b[1] + '">' + esc(WDC[w.status] ? T(b[0]) : b[0]) + '</span></div>'; }).join('') + '</div>';
    box.innerHTML = h;
    var go = box.querySelector('#pm-wgo');
    var sel = box.querySelector('#pm-wm'), val = box.querySelector('#pm-wv'), sum = box.querySelector('#pm-wsum'), err = box.querySelector('#pm-werr'), rid = uid();
    function upd() {
      var k = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].getAttribute('data-k') : 'phone', phone = k === 'phone';
      box.querySelector('#pm-wnamebox').style.display = phone ? '' : 'none';
      box.querySelector('#pm-wal').textContent = phone ? T('g_phone') : (k === 'trc20' ? T('g_trc') : T('g_bep'));
      var a = Number(String(val.value).replace(',', '.')) || 0, fee = Math.round(a * st.feePct) / 100;
      sum.innerHTML = esc(T('g_recv', { net: '@@N@@', amt: '@@A@@', fee: '@@F@@' })).replace('@@N@@', '<b>' + money(Math.max(0, a - fee)) + '</b>').replace('@@A@@', money(a)).replace('@@F@@', money(fee));
    }
    sel.onchange = upd; val.oninput = upd; upd();
    go.onclick = async function () {
      err.textContent = '';
      var a = Number(String(val.value).replace(',', '.')) || 0;
      if (!(a >= st.minUsd)) { err.textContent = T('g_e_min', { min: money(st.minUsd) }); return; }
      if (a > r.available + 0.001) { err.textContent = T('g_e_max', { max: money(r.available) }); return; }
      if (!confirm(T('g_confirm', { amt: money(a) }) + '\n' + sel.options[sel.selectedIndex].text + '\n' + box.querySelector('#pm-wa').value)) return;
      go.disabled = true; go.textContent = T('o_sending');
      try {
        var res = await api('pm_wd_request', { method: sel.value, account: box.querySelector('#pm-wa').value, holderName: box.querySelector('#pm-wn').value, amount: a, requestId: rid });
        toast(T('g_sent', { net: money(res.net) }), 'success'); wdBlock(box);
      } catch (e) { err.textContent = errMsg(e); go.disabled = false; go.textContent = T('g_go'); }
    };
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
    box.innerHTML = '<div class="pm-inst"><div class="t">' + esc(T('in_banner', { name: S.store.shop.name || 'panel' })) + '<small>' + esc(T('in_card_s')) + '</small></div><button class="go" id="pm-ib-go">' + esc(T('install')) + '</button><button class="no" id="pm-ib-no" aria-label="' + esc(T('close')) + '">✕</button></div>';
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

  /* ===== Recharge complète (mêmes moyens que l'application) ===== */
  var MIN_USD = 2, MAX_USD = 1000;
  var COVERED = ['CD']; // pays où le Mobile Money direct est actif (comme l'application)
  // Mobile Money via la page de paiement sécurisée OPTGateway (hors RDC) : mêmes 20 pays que l'application (script.js, OPT_MOBILE_CODES).
  var OPT_MOBILE = ['CD', 'BJ', 'BF', 'CM', 'CG', 'CI', 'ET', 'GA', 'GH', 'KE', 'LS', 'MW', 'MZ', 'NG', 'UG', 'SN', 'SL', 'TZ', 'ZM', 'ZW'];
  function optMob(code) { return code !== 'CD' && OPT_MOBILE.indexOf(code) >= 0; }
  function mobOk(code) { return COVERED.indexOf(code) >= 0 || optMob(code); }
  var CTRY = [
    ['CD', '🇨🇩', 'RDC (Congo)', ['CDF', 'USD'], ['Vodacom M-Pesa', 'Airtel Money', 'Orange Money']],
    ['CG', '🇨🇬', 'Congo-Brazzaville', ['XAF'], ['Airtel Money', 'MTN Mobile Money']],
    ['CM', '🇨🇲', 'Cameroun', ['XAF'], ['MTN Mobile Money']],
    ['CI', '🇨🇮', 'Côte d’Ivoire', ['XOF'], ['Orange Money', 'MTN Mobile Money']],
    ['SN', '🇸🇳', 'Sénégal', ['XOF'], ['Orange Money', 'Free Money']],
    ['BJ', '🇧🇯', 'Bénin', ['XOF'], ['MTN Mobile Money']],
    ['GA', '🇬🇦', 'Gabon', ['XAF'], ['Airtel Money']],
    ['KE', '🇰🇪', 'Kenya', ['KES'], ['M-Pesa (Safaricom)']],
    ['RW', '🇷🇼', 'Rwanda', ['RWF'], ['Airtel Money', 'MTN Mobile Money']],
    ['UG', '🇺🇬', 'Uganda', ['UGX'], ['Airtel Money', 'MTN Mobile Money']],
    ['ZM', '🇿🇲', 'Zambia', ['ZMW'], ['Airtel Money', 'MTN Mobile Money', 'Zamtel Kwacha']],
    ['SL', '🇸🇱', 'Sierra Leone', ['SLE'], ['Orange Money']],
    ['BF', '🇧🇫', 'Burkina Faso', ['XOF'], ['Orange Money', 'Moov Money']],
    ['ET', '🇪🇹', 'Ethiopia', ['ETB'], ['Telebirr']],
    ['GH', '🇬🇭', 'Ghana', ['GHS'], ['MTN Mobile Money', 'Telecel Cash', 'AirtelTigo Money']],
    ['LS', '🇱🇸', 'Lesotho', ['LSL'], ['M-Pesa', 'EcoCash']],
    ['MW', '🇲🇼', 'Malawi', ['MWK'], ['Airtel Money', 'TNM Mpamba']],
    ['MZ', '🇲🇿', 'Mozambique', ['MZN'], ['M-Pesa', 'e-Mola', 'mKesh']],
    ['NG', '🇳🇬', 'Nigeria', ['NGN'], ['MTN MoMo', 'Airtel Money', 'Opay']],
    ['TZ', '🇹🇿', 'Tanzania', ['TZS'], ['M-Pesa', 'Airtel Money', 'Tigo Pesa']],
    ['ZW', '🇿🇼', 'Zimbabwe', ['ZWG'], ['EcoCash', 'OneMoney']]
  ];
  function opPill(n) { return /pesa/i.test(n) ? LG.mpesa : /airtel/i.test(n) ? LG.airtel : /orange/i.test(n) ? LG.orange : /mtn/i.test(n) ? '<i class="pm-lg lg-mtn">MTN</i>' : '<i class="pm-lg lg-gen">' + esc(String(n).slice(0, 5)) + '</i>'; }
  function opLabel(n) { return String(n).replace('Vodacom ', '').replace(' Mobile Money', '').replace(' (Safaricom)', ''); }
  function rechargeModal() {
    if (!auth.currentUser) { loginModal(); return; }
    var amt = 10, method = 'mobile', op = '', cc = 'CD', busy = false;
    var m = sheet('<div id="pm-rcb"></div>');
    var box = m.querySelector('#pm-rcb');
    function tabs() {
      var T4 = [['mobile', 'rc_mobile', LG.mpesa + LG.airtel + LG.orange], ['illico', 'rc_illico', LG.illico], ['card', 'rc_card', LG.visa + LG.mc], ['crypto', 'rc_crypto', LG.usdt + LG.btc + LG.trx]];
      return '<div class="pm-tabs">' + T4.map(function (t) { return '<button type="button" class="pm-tab' + (method === t[0] ? ' on' : '') + '" data-m="' + t[0] + '"><span class="lgs">' + t[2] + '</span><b>' + esc(T(t[1])) + '</b></button>'; }).join('') + '</div>';
    }
    function how() {
      var l = method === 'mobile' && !optMob(cc) ? ['rc_m1', 'rc_m2', 'rc_m3'] : method === 'crypto' ? ['rc_c1', 'rc_c2', 'rc_c3'] : ['rc_o1', 'rc_o2', 'rc_o3'], note = method === 'illico' ? T('rc_illico_note') : method === 'card' ? T('rc_card_note') : method === 'crypto' ? T('rc_crypto_note') : method === 'mobile' && optMob(cc) ? T('rc_opt_note') : T('rc_drc_only');
      return '<p class="pm-n">' + esc(note) + '</p><div class="pm-f" style="margin-bottom:0"><label>' + esc(T('rc_how')) + '</label><ol class="pm-steps">' + l.map(function (k, i) { return '<li><i>' + (i + 1) + '</i><span>' + esc(T(k)) + '</span></li>'; }).join('') + '</ol></div>';
    }
    function cty() { return CTRY.filter(function (c) { return c[0] === cc; })[0] || CTRY[0]; }
    function mobileBlock(keepPhone, keepCur) {
      var c = cty(), ok = mobOk(c[0]);
      var h = '<div class="pm-f"><label for="pm-cc">' + esc(T('rc_country')) + '</label><select id="pm-cc">' + CTRY.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cc ? ' selected' : '') + '>' + x[1] + ' ' + esc(x[2]) + (mobOk(x[0]) ? '' : ' — ' + esc(T('rc_soon'))) + '</option>'; }).join('') + '</select></div>';
      if (!ok) return h + '<div class="pm-ref">' + esc(T('rc_soon_msg', { c: c[2] })) + '</div><div style="display:flex;gap:8px"><button type="button" class="pm-b w" data-m="card">' + LG.visa + esc(T('rc_card')) + '</button><button type="button" class="pm-b w" data-m="crypto">' + LG.usdt + esc(T('rc_crypto')) + '</button></div>';
      if (optMob(c[0])) return h; // OPTGateway : opérateur et numéro se saisissent sur la page de paiement sécurisée
      if (c[4].indexOf(op) < 0) op = '';
      return h + '<div class="pm-f"><label>' + esc(T('rc_op')) + '</label><div class="pm-ops">' + c[4].map(function (o) { return '<button type="button" class="pm-op' + (op === o ? ' on' : '') + '" data-o="' + esc(o) + '">' + opPill(o) + '<b>' + esc(opLabel(o)) + '</b></button>'; }).join('') + '</div></div>' +
        '<div class="pm-f"><label for="pm-ph">' + esc(T('rc_phone')) + '</label><input id="pm-ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="243…" value="' + esc(keepPhone) + '"></div>' + (c[3].length > 1 ? '<div class="pm-f"><label for="pm-cur">' + esc(T('rc_cur')) + '</label><select id="pm-cur">' + c[3].map(function (u) { return '<option value="' + u + '"' + (keepCur === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div>' : '');
    }
    function draw() {
      var keepPhone = (box.querySelector('#pm-ph') || {}).value || '', keepCur = (box.querySelector('#pm-cur') || {}).value || '';
      box.innerHTML = '<div class="hd"><h2>' + esc(T('rc_title')) + '</h2><button class="pm-x" data-x aria-label="' + esc(T('close')) + '">' + ico('x', 18) + '</button></div><p class="pm-n" style="margin-top:0">' + esc(T('rc_sub')) + '</p>' + tabs() +
        '<div class="pm-f"><label>' + esc(T('rc_amount')) + '</label><div class="pm-amts">' + [2, 5, 10, 20, 50].map(function (a) { return '<button type="button" class="pm-b' + (a === amt ? ' p' : '') + '" data-a="' + a + '">' + a + ' $</button>'; }).join('') + '</div><input id="pm-ac" type="number" min="' + MIN_USD + '" max="' + MAX_USD + '" step="1" placeholder="' + esc(T('rc_other')) + '" style="margin-top:8px" value="' + ([2, 5, 10, 20, 50].indexOf(amt) >= 0 ? '' : amt) + '"></div>' +
        (method === 'mobile' ? mobileBlock(keepPhone, keepCur) : '') +
        how() + '<div class="pm-err" id="pm-re2"></div><button class="pm-b p w" id="pm-pay">' + esc(T('rc_pay')) + ' ' + (amt > 0 ? amt + ' $' : '') + '</button><div class="pm-secure">' + ico('shield', 16) + '<span>' + esc(T('rc_secure')) + '</span></div>';
      box.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = function () { m.remove(); }; });
      box.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { method = b.getAttribute('data-m'); draw(); }; });
      box.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { amt = Number(b.getAttribute('data-a')); draw(); }; });
      box.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { op = b.getAttribute('data-o'); draw(); }; });
      var ccs = box.querySelector('#pm-cc'); if (ccs) ccs.onchange = function () { cc = ccs.value; op = ''; draw(); };
      box.querySelector('#pm-ac').oninput = function (e) { amt = Number(e.target.value) || 0; var p = box.querySelector('#pm-pay'); if (p) p.textContent = T('rc_pay') + ' ' + (amt > 0 ? amt + ' $' : ''); box.querySelectorAll('[data-a]').forEach(function (b) { b.className = 'pm-b' + (Number(b.getAttribute('data-a')) === amt ? ' p' : ''); }); };
      box.querySelector('#pm-pay').onclick = pay;
    }
    function pollBalance(prev) {
      var n = 0, iv = setInterval(function () {
        if (++n > 30 || !document.getElementById('pm-ov')) { clearInterval(iv); return; }
        api('pm_orders', { slug: S.slug }).then(function (r) { if (typeof r.balance === 'number' && r.balance > prev + 0.0001) { clearInterval(iv); S.bal = r.balance; toast(T('rc_paid'), 'success'); var mm = document.getElementById('pm-modal'); if (mm) mm.remove(); render(); } }).catch(function () { });
      }, 5000);
    }
    async function pay() {
      if (busy) return; var b = box.querySelector('#pm-pay'), err = box.querySelector('#pm-re2'); err.className = 'pm-err'; err.textContent = '';
      if (!(amt > 0) || amt !== Math.round(amt * 100) / 100) { err.textContent = T('rc_e_amount'); return; }
      if (amt < MIN_USD) { err.textContent = T('rc_e_min', { min: MIN_USD }); return; }
      if (amt > MAX_USD) { err.textContent = T('rc_e_amount'); return; }
      var body;
      if (method === 'mobile') {
        var phEl = box.querySelector('#pm-ph'), ph = ((phEl && phEl.value) || '').replace(/\D/g, '');
        if (!mobOk(cc)) { err.textContent = T('rc_soon_msg', { c: cty()[2] }); return; }
        if (optMob(cc)) body = { provider: 'optgateway', amountUSD: amt, onlyMethod: 'mobile_money', countryCode: cc };
        else {
        if (!op) { err.textContent = T('rc_e_op'); return; }
        if (ph.length < 8) { err.textContent = T('rc_e_phone'); return; }
        var curEl = box.querySelector('#pm-cur'); body = { provider: 'mobile', amountUSD: amt, countryCode: cc, operatorName: op, phone: ph, chargeCurrency: curEl ? curEl.value : cty()[3][0] };
        }
      } else if (method === 'crypto') body = { provider: 'crypto', amount: amt };
      else body = { provider: 'optgateway', amountUSD: amt, onlyMethod: method === 'illico' ? 'illicocash' : 'card' };
      busy = true; b.disabled = true; b.textContent = T('rc_paying');
      try {
        var tok = await auth.currentUser.getIdToken(), prev = Number(S.bal) || 0;
        body.idToken = tok; body.returnSlug = S.slug;
        var r = await fetch('/api/payment-initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); var j = await r.json();
        if (method === 'mobile' && !optMob(cc)) {
          if (!j.success) throw new Error(j.error || T('rc_e_gen'));
          box.innerHTML = '<div class="hd"><h2>' + esc(T('rc_title')) + '</h2><button class="pm-x" data-x>' + ico('x', 18) + '</button></div><div class="pm-ref" style="margin-top:12px">' + esc(T('rc_sent')) + '</div><button class="pm-b p w" data-x>' + esc(T('ok')) + '</button>';
          box.querySelectorAll('[data-x]').forEach(function (x) { x.onclick = function () { m.remove(); }; });
          pollBalance(prev); return;
        }
        if (r.status === 429) throw new Error(j.error || T('rc_e_many'));
        if (!r.ok || !j.success || !/^https:\/\//.test(j.paymentUrl || '')) throw new Error(j.error || T('rc_e_gen'));
        location.href = j.paymentUrl;
      } catch (e) { err.textContent = errMsg(e); busy = false; b.disabled = false; b.textContent = T('rc_pay') + ' ' + amt + ' $'; }
    }
    draw();
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
      try { var pq = new URL(location.href).searchParams.get('payment'); if (pq) { toast(pq === 'success' ? T('rc_return_ok') : T('rc_return_ko'), pq === 'success' ? 'success' : 'info'); if (pq === 'success') S.tab = 'wal'; var u2 = new URL(location.href); u2.searchParams.delete('payment'); history.replaceState(null, '', u2.pathname + (u2.search || '')); } } catch (e) { /* ignore */ }
      openStore(window.__CN_STANDALONE);
      try { auth.onAuthStateChanged(function () { S.isOwner = undefined; if (S.store) render(); }); } catch (e) { /* ignore */ }
      return;
    }
    var orig = window.siteHubHtml;
    if (typeof orig === 'function') {
      window.siteHubHtml = function () {
        var h = orig.apply(this, arguments);
        var tile = '<button type="button" class="sp-tile" onclick="CNPanel.owner()"><span class="sp-ic">' + (typeof uiIc === 'function' ? uiIc('chart', 20) : '📈') + '</span><b>' + esc(T('ow_title')) + '</b><small>' + esc(T('ow_sub')) + '</small></button>';
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
