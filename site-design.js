// api/_lib/site-design.js
// Apparence « vrai site » des sites créés par les utilisateurs (Crée ton site) :
//  - DESIGN_CSS : feuille commune (couleurs unies, bordures fines, titres nets, sections aérées) appliquée à TOUS les modèles ;
//  - shopCss / shopHtml / shopJs : vitrine de vente (en-tête avec recherche et panier, grille de produits, filtres, pied de page).
// Aucun dégradé, aucun effet de verre, aucun emoji. Les polices (CN Inter, CN Display) sont celles de l'application.
// Module partagé : ce n'est PAS une fonction Vercel (il reste 12 fonctions dans api/).

// Feuille commune. Elle vient APRÈS les anciens réglages « compacts » et les remplace par une mise en page plus ample.
const DESIGN_CSS = `
  /* ===== Design pro : sobre, solide, lisible (tailles de texte réduites, bandeau plein écran) ===== */
  html{font-size:15px;-webkit-text-size-adjust:100%}
  @media(min-width:860px){html{font-size:16px}}
  body{line-height:1.55}
  .topbar{background:var(--card);backdrop-filter:none;-webkit-backdrop-filter:none;border-bottom:1px solid var(--border)}
  .topbar-row{height:56px}
  @media(min-width:860px){.topbar-row{height:64px}}
  .brand{font-size:.92rem;font-weight:700;letter-spacing:-.01em}
  .brand-logo{width:32px;height:32px;border-radius:8px}
  .nav a{font-size:.84rem;font-weight:500;padding:7px 11px;border-radius:8px}
  .navscroll a{font-size:.78rem;font-weight:600;padding:6px 12px}
  .pro-badge{border-radius:6px;font-size:.58rem}
  .announce{font-size:.76rem;padding:8px 36px}

  /* Bandeau d'accueil : la couverture occupe toute la largeur, le profil et les boutons sont posés dessus */
  .hero{position:relative;overflow:hidden;color:#fff;background:var(--hero1);display:flex;align-items:flex-end;border:0}
  .hero::before,.hero::after{display:none}
  .hero .container{position:relative;z-index:2;width:100%}
  .hero-bg{position:absolute;inset:0;width:100%;height:100%;margin:0;border-radius:0;box-shadow:none;transform:none;object-fit:cover;object-position:center;filter:brightness(.52);display:block;z-index:0}
  .hero.has-cover{min-height:clamp(420px,76svh,680px)}
  .hero-inner{position:relative;z-index:2;margin:0;padding:44px 0 32px;max-width:600px;background:none;border:0;box-shadow:none;border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none}
  .hero.has-cover .hero-inner{padding-top:150px;padding-bottom:36px}
  @media(min-width:860px){.hero-inner{padding:76px 0 60px;max-width:640px}.hero.has-cover .hero-inner{padding-top:170px;padding-bottom:68px}}
  .hero-logo{width:58px;height:58px;border-radius:14px;margin:0 0 14px;border:2px solid rgba(255,255,255,.92);object-fit:cover;background:var(--accent);font-size:1.3rem}
  .hero h1{font-size:clamp(1.55rem,5.6vw,2.7rem);line-height:1.12;letter-spacing:-.025em;font-weight:700}
  .hero-tag{font-size:.94rem;line-height:1.5;opacity:.92;margin:10px 0 0;max-width:520px}
  @media(min-width:860px){.hero-tag{font-size:1.04rem}}
  .hero-actions{gap:8px;margin-top:20px}
  .btn{font-size:.84rem;padding:10px 18px;border-radius:8px;font-weight:600;gap:7px;min-height:40px}
  .btn svg{width:16px;height:16px}
  .btn-primary,.btn-accent{box-shadow:none}
  .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.55)}
  .hero-chips{margin-top:18px;gap:8px 16px;align-items:center}
  .chip{font-size:.76rem;padding:0;background:transparent;border:0;border-radius:0;font-weight:500;gap:6px;opacity:.92}
  .chip svg{width:14px;height:14px}
  .open-badge{font-size:.74rem;padding:5px 11px}
  .stats{display:flex;flex-wrap:wrap;gap:0;margin:-24px 0 0;background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;position:relative;z-index:3}
  .stat{flex:1 1 120px;min-width:0;background:transparent;border:0;border-right:1px solid var(--border);border-bottom:1px solid var(--border);margin:0 -1px -1px 0;border-radius:0;padding:14px 10px;display:block;text-align:center;color:var(--ink)}
  .stat b{display:block;font-size:clamp(1.15rem,3.4vw,1.5rem);font-weight:700;letter-spacing:-.02em;color:var(--ink);line-height:1.2}
  .stat span{font-size:.72rem;color:var(--muted);font-weight:500}
  .section{padding:36px 0}
  @media(min-width:860px){.section{padding:64px 0}}
  .section-head{margin-bottom:20px}
  .eyebrow{font-size:.66rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
  .section-head h2,.about-text h2{font-size:clamp(1.25rem,3.6vw,1.8rem);font-weight:700;letter-spacing:-.025em;line-height:1.15}
  .about-text p{font-size:.94rem;line-height:1.65}
  .about-points li{font-size:.88rem}
  .item-card,.plan,.testi,.member,.post-card,.pf-card,.book-card,.job,.news-card,.faq details{background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:none}
  .item-card:hover,.plan:hover,.pf-card:hover,.post-card:hover{transform:none;box-shadow:none;border-color:color-mix(in srgb,var(--accent) 50%,var(--border))}
  .item-num{border-radius:8px}
  .item-card{padding:18px;gap:6px}
  .item-card h3{font-size:1rem;margin-top:4px}
  .item-desc{font-size:.84rem}
  .item-price{display:inline-block;align-self:flex-start;justify-self:start;width:fit-content;color:var(--ink);background:color-mix(in srgb,var(--accent) 12%,var(--card));border-radius:999px;padding:3px 11px;font-weight:700;font-size:.82rem}
  .item-btn{color:var(--accent);font-size:.82rem}
  .plan-price{font-size:1.45rem}
  .post-body h3,.pf-body h3{font-size:1rem}
  .contact-card{background:var(--card);color:var(--ink);border:1px solid var(--border);border-radius:14px;padding:22px 18px;gap:22px;box-shadow:none}
  @media(min-width:860px){.contact-card{grid-template-columns:1.1fr .9fr;padding:36px 36px}}
  .contact-card .eyebrow{color:var(--accent)}
  .contact-card h2{font-size:clamp(1.15rem,3.2vw,1.45rem);color:var(--ink);font-weight:700}
  .contact-card p{font-size:.88rem;color:var(--muted);margin:6px 0 0;opacity:1}
  .contact-list{gap:8px}
  .contact-item{background:transparent;border:1px solid var(--border);color:var(--ink);padding:10px 12px;border-radius:8px;font-size:.86rem;font-weight:500}
  .contact-item svg{color:var(--accent);width:17px;height:17px}
  .cform{gap:8px;margin-top:14px}
  .cform input,.cform textarea{font-size:.9rem;padding:10px 12px;border-radius:8px;background:var(--bg);color:var(--ink);border:1px solid var(--border)}
  .cform input::placeholder,.cform textarea::placeholder{color:var(--muted)}
  .cform input:focus,.cform textarea:focus{border-color:var(--accent);background:var(--card)}
  .cform textarea{height:92px;min-height:92px;resize:vertical}
  .socials a{border-radius:8px;background:transparent;color:var(--ink);border:1px solid var(--border);font-size:.78rem;padding:7px 12px}
  .footer{padding:40px 0 48px;text-align:left;border-top:1px solid var(--border);background:var(--card)}
  .footer-actions{justify-content:flex-start}
  .footer-actions button{border-radius:8px}
  .ft-grid{display:grid;gap:28px;margin-bottom:28px}
  @media(min-width:760px){.ft-grid{grid-template-columns:1.4fr 1fr 1fr}}
  .ft-brand{font-weight:700;font-size:1.05rem;color:var(--ink);margin:0 0 8px}
  .ft-grid h4{margin:0 0 10px;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
  .ft-grid p,.ft-grid a{display:block;margin:0 0 7px;color:var(--muted);text-decoration:none;font-weight:500;font-size:.9rem}
  .ft-grid a:hover{color:var(--accent)}
  .ft-bottom{border-top:1px solid var(--border);padding-top:20px;display:flex;flex-wrap:wrap;gap:10px 20px;justify-content:space-between;align-items:center}
  .ft-bottom p{margin:0}
  .fab{right:14px;bottom:calc(14px + env(safe-area-inset-bottom))}
  .fab-up{width:36px;height:36px;box-shadow:none;border-color:var(--border)}
  body{padding-bottom:0}
  #cart-bar{background:var(--accent);border-radius:12px;box-shadow:none}
  #cart-sheet .cs{border-radius:16px 16px 0 0}
  .cs-go{border-radius:10px}
  /* ===== Panier et validation de la commande ===== */
  #cart-sheet [hidden]{display:none!important}
  #cart-sheet .cs{max-width:560px;margin:0 auto}
  .cs h4{margin:16px 0 4px;font-size:.74rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:700}
  .cs-go.main{background:var(--accent);color:#fff;text-decoration:none;align-items:center}
  .cs-alt{display:flex;justify-content:center;align-items:center;width:100%;box-sizing:border-box;margin-top:8px;border:1px solid var(--border);border-radius:10px;padding:13px;background:transparent;color:var(--ink);font:inherit;font-weight:700;cursor:pointer;text-decoration:none}
  .co-pay{display:grid;gap:8px;margin:8px 0}
  .co-opt{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:10px;padding:12px 14px;cursor:pointer;font-weight:600;font-size:.94rem}
  .co-opt input{width:auto;margin:0;accent-color:var(--accent)}
  .co-opt.on{border-color:var(--accent);background:var(--accent-soft,transparent)}
  .co-info{border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:.88rem;line-height:1.5;margin:8px 0;color:var(--muted)}
  .co-info b{color:var(--ink)}
  .co-num{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border)}
  .co-num>div{min-width:0}.co-num span{color:var(--muted);font-size:.84rem;display:block}
  .co-copy{flex:0 0 auto;white-space:nowrap;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--ink);font:inherit;font-weight:700;padding:8px 12px;cursor:pointer}
  .co-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none}
  .co-done{text-align:center;padding:6px 0 2px}
  .co-ok{width:54px;height:54px;border-radius:50%;background:var(--accent);color:#fff;display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px}
  .co-ok svg{width:26px;height:26px}
  .co-ref{display:inline-block;border:1px solid var(--border);border-radius:8px;padding:6px 14px;font-weight:800;letter-spacing:.1em;margin:6px 0;font-size:1.1rem}
  .co-done .co-info{text-align:left}
`;

// Vitrine de vente : une disposition à part (« shop »). dark = bandeau sombre (modèles à bandeau sombre), sinon bandeau clair.
function shopCss(dark) {
  return `
  /* ===== Vitrine de vente ===== */
  .lay-shop .hero:not(.has-cover){background:${dark ? 'var(--hbg,#0f172a)' : 'var(--hbg,var(--card))'};color:${dark ? '#fff' : 'var(--ink)'};border-bottom:1px solid var(--border)}
  .lay-shop .hero:not(.has-cover) .hero-inner{padding:40px 0 34px}
  .lay-shop .hero:not(.has-cover) .btn-ghost{background:transparent;color:inherit;border:1px solid ${dark ? 'rgba(255,255,255,.5)' : 'color-mix(in srgb,var(--ink) 30%,transparent)'}}
  .lay-shop .btn-primary{background:var(--accent);box-shadow:none}
  .hdr-tools{display:flex;align-items:center;gap:8px;margin-left:auto}
  .lay-shop .nav{margin-left:14px}
  .lay-shop .brand{flex:0 0 auto}
  .lay-shop .brand-name{max-width:210px}
  .hdr-search{display:none;position:relative;width:230px}
  .hdr-search input{width:100%;font:inherit;font-size:.9rem;color:var(--ink);background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:9px 12px 9px 36px;outline:none}
  .hdr-search input:focus{border-color:var(--accent)}
  .hdr-search svg,.shop-search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--muted);pointer-events:none}
  @media(min-width:960px){.hdr-search{display:block}}
  .hdr-cart{position:relative;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--ink);cursor:pointer;padding:0}
  .hdr-cart svg{width:20px;height:20px}
  .hdr-cart b{position:absolute;top:-6px;right:-6px;min-width:19px;height:19px;border-radius:10px;background:var(--accent);color:#fff;font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px}
  .hdr-cart b[hidden]{display:none}
  .shop-head{display:flex;flex-wrap:wrap;gap:14px 20px;align-items:flex-end;justify-content:space-between;margin-bottom:18px}
  .shop-head .section-head{margin:0}
  .shop-count{margin:6px 0 0;color:var(--muted);font-size:.88rem}
  .shop-tools{display:flex;gap:10px;flex-wrap:wrap;width:100%}
  @media(min-width:760px){.shop-tools{width:auto}}
  .shop-search{position:relative;flex:1 1 220px;min-width:0}
  .shop-search input{width:100%;font:inherit;font-size:.95rem;color:var(--ink);background:var(--card);border:1px solid var(--border);border-radius:10px;padding:11px 12px 11px 38px;outline:none}
  .shop-search input:focus,.shop-sort:focus{border-color:var(--accent)}
  .shop-sort{font:inherit;font-size:.92rem;color:var(--ink);background:var(--card);border:1px solid var(--border);border-radius:10px;padding:11px 12px;outline:none}
  .shop-cats{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 0 20px;padding-bottom:2px}
  .shop-cats::-webkit-scrollbar{display:none}
  .shop-cat{flex:0 0 auto;font:inherit;font-size:.86rem;font-weight:600;color:var(--ink);background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;cursor:pointer}
  .shop-cat.on{background:var(--ink);color:var(--card);border-color:var(--ink)}
  .shop-grid{display:grid;gap:14px;grid-template-columns:repeat(2,1fr)}
  @media(min-width:760px){.shop-grid{gap:20px;grid-template-columns:repeat(3,1fr)}}
  @media(min-width:1040px){.shop-grid{grid-template-columns:repeat(4,1fr)}}
  .pc{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;min-width:0}
  .pc[hidden]{display:none}
  .pc:hover{border-color:color-mix(in srgb,var(--accent) 50%,var(--border))}
  .pc-img{position:relative;aspect-ratio:1/1;background:var(--accent-soft);overflow:hidden}
  .pc-img img{width:100%;height:100%;object-fit:cover;display:block}
  .pc-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'CN Display','CN Inter',sans-serif;font-size:3rem;font-weight:700;color:var(--accent);opacity:.85}
  .pc-badge{position:absolute;top:10px;left:10px;background:var(--accent);color:#fff;font-size:.7rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 8px;border-radius:6px}
  .pc-body{padding:14px 14px 4px;display:flex;flex-direction:column;gap:6px;flex:1}
  .pc-name{font-size:.98rem;font-weight:600;letter-spacing:-.01em;line-height:1.3;margin:0}
  .pc-desc{margin:0;color:var(--muted);font-size:.82rem;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .pc-price{margin-top:auto;padding-top:4px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
  .pc-price b{font-size:1.1rem;font-weight:700;color:var(--ink)}
  .pc-price s{font-size:.85rem;color:var(--muted)}
  .pc-act{padding:12px 14px 14px;display:grid;gap:8px}
  .pc-act .cart-add{margin:0;width:100%;border:0;background:var(--accent);color:#fff;border-radius:10px;padding:11px 6px;font:inherit;font-weight:600;font-size:.84rem;white-space:nowrap;cursor:pointer;align-self:auto}
  .pc-act .cart-add:active{transform:scale(.98)}
  .pc-order{display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;color:var(--ink);font-weight:600;font-size:.84rem;border:1px solid var(--border);border-radius:10px;padding:9px 10px}
  .pc-order:hover{border-color:var(--ink)}
  .hero-mosaic{display:grid!important;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:10px;background:none}
  .hero-mosaic>*{display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden;background:var(--accent-soft);color:var(--accent);font-family:'CN Display','CN Inter',sans-serif;font-weight:700;font-size:2.4rem;min-width:0;min-height:0}
  .hero-mosaic>img{width:100%;height:100%;object-fit:cover}
  .hero-mosaic>.t2,.hero-mosaic>.t3{background:var(--accent);color:#fff}
  .shop-empty{padding:40px 0;text-align:center;color:var(--muted)}
  .trust{display:grid;gap:0;grid-template-columns:1fr;margin-top:40px;border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
  @media(min-width:760px){.trust{grid-template-columns:repeat(3,1fr)}}
  .trust div{display:flex;gap:12px;align-items:flex-start;padding:18px;border-bottom:1px solid var(--border)}
  @media(min-width:760px){.trust div{border-bottom:0;border-right:1px solid var(--border)}.trust div:last-child{border-right:0}}
  .trust div:last-child{border-bottom:0}
  .trust svg{flex:0 0 auto;width:22px;height:22px;color:var(--accent);margin-top:2px}
  .trust b{display:block;font-size:.92rem}
  .trust span{font-size:.82rem;color:var(--muted)}
`;
}

const SVG = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
};

// En-tête : recherche (grand écran) + bouton panier avec compteur.
// La recherche est un vrai formulaire : sur une fiche produit, elle ramène à la boutique avec le mot tapé (?q=…).
function shopHeaderTools(o) {
  const action = String((o && o.action) || '/').replace(/"/g, '&quot;');
  return `<div class="hdr-tools">
      <form class="hdr-search" role="search" action="${action}#site-sec-services" method="get">${SVG.search}<input type="search" name="q" id="shop-hq" placeholder="Rechercher un produit" aria-label="Rechercher un produit" autocomplete="off" maxlength="60"></form>
      <button type="button" class="hdr-cart" id="cart-top" aria-label="Ouvrir le panier">${SVG.bag}<b id="cart-top-n" hidden>0</b></button>
    </div>`;
}

// Mosaïque d'en-tête quand le site n'a pas de photo de couverture : photos des produits, sinon tuiles unies.
function shopMosaic(items, escapeHtml, escapeAttr) {
  const four = items.slice(0, 4);
  if (four.length < 2) return '';
  return `<div class="hero-bg hero-mosaic" aria-hidden="true">${four.map((x, k) => x.img
    ? `<img src="${escapeAttr(x.img)}" alt="" loading="lazy">`
    : `<span class="${k === 1 ? 't2' : k === 2 ? 't3' : ''}">${escapeHtml(String(x.name).trim().charAt(0).toUpperCase())}</span>`).join('')}</div>`;
}

// Section produits. items : [{ i, name, price, oldPrice, desc, img, cat, badge, amount, order }] (déjà nettoyés par l'appelant).
function shopHtml(o) {
  const e = o.escapeHtml, a = o.escapeAttr;
  const items = o.items;
  const cats = [...new Set(items.map((x) => x.cat).filter(Boolean))].slice(0, 12);
  const cards = items.map((x) => `
    <article class="pc reveal" data-i="${x.i}" data-n="${a(x.name + ' ' + (x.desc || '') + ' ' + (x.cat || ''))}" data-a="${x.amount || 0}" data-cat="${a(x.cat || '')}">
      <div class="pc-img">${x.href ? `<a class="pc-imglink" href="${a(x.href)}" tabindex="-1" aria-hidden="true">` : ''}${x.img ? `<img src="${a(x.img)}" alt="${a(x.name)}" loading="lazy">` : `<span class="pc-ph" aria-hidden="true">${e(String(x.name).trim().charAt(0).toUpperCase())}</span>`}${x.href ? '</a>' : ''}${x.badge ? `<span class="pc-badge">${e(x.badge)}</span>` : ''}</div>
      <div class="pc-body">
        <h3 class="pc-name">${x.href ? `<a class="item-link" href="${a(x.href)}">${e(x.name)}</a>` : e(x.name)}</h3>
        ${x.desc ? `<p class="pc-desc">${e(x.desc)}</p>` : ''}
        ${x.price ? `<div class="pc-price"><b>${e(x.price)}</b>${x.oldPrice ? `<s>${e(x.oldPrice)}</s>` : ''}</div>` : ''}
      </div>
      <div class="pc-act">
        ${o.cartOn && x.amount ? `<button type="button" class="cart-add" data-i="${x.i}">+ Ajouter au panier</button>` : ''}
        ${x.order ? `<a class="pc-order" href="${a(x.order)}" target="_blank" rel="noopener">${o.waIcon || ''}${e(o.orderLabel)}</a>` : ''}
      </div>
    </article>`).join('');
  return `
  <section class="section" id="site-sec-services">
    <div class="shop-head">
      <div class="section-head reveal"><span class="eyebrow">${e(o.sub)}</span><h2>${e(o.title)}</h2><p class="shop-count"><span id="shop-n">${items.length}</span> article${items.length > 1 ? 's' : ''}</p></div>
      <div class="shop-tools">
        <label class="shop-search">${SVG.search}<input type="search" id="shop-q" placeholder="Rechercher un produit" aria-label="Rechercher un produit" autocomplete="off"></label>
        <select class="shop-sort" id="shop-sort" aria-label="Trier"><option value="">Pertinence</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option></select>
      </div>
    </div>
    ${cats.length ? `<div class="shop-cats" id="shop-cats"><button type="button" class="shop-cat on" data-cat="">Tout</button>${cats.map((c) => `<button type="button" class="shop-cat" data-cat="${a(c)}">${e(c)}</button>`).join('')}</div>` : ''}
    <div class="shop-grid" id="shop-grid">${cards}</div>
    <p class="shop-empty" id="shop-empty" hidden>Aucun produit ne correspond à votre recherche.</p>
    <div class="trust">
      <div>${SVG.truck}<p style="margin:0"><b>${e(o.trust[0][0])}</b><span>${e(o.trust[0][1])}</span></p></div>
      <div>${SVG.shield}<p style="margin:0"><b>${e(o.trust[1][0])}</b><span>${e(o.trust[1][1])}</span></p></div>
      <div>${SVG.chat}<p style="margin:0"><b>${e(o.trust[2][0])}</b><span>${e(o.trust[2][1])}</span></p></div>
    </div>
  </section>`;
}

// Filtre, tri et recherche (côté navigateur, sans rechargement). Le panier lui-même reste celui de la page.
const SHOP_JS = `
(function(){var g=document.getElementById('shop-grid');if(!g)return;
var cards=[].slice.call(g.children),q=document.getElementById('shop-q'),hq=document.getElementById('shop-hq'),so=document.getElementById('shop-sort'),cn=document.getElementById('shop-n'),em=document.getElementById('shop-empty'),cb=document.getElementById('shop-cats'),cat='';
function norm(s){s=String(s||'').toLowerCase();try{s=s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}catch(e){}return s}
function run(){var t=norm(q.value),n=0,list=cards.slice();
if(so.value)list.sort(function(a,b){return (so.value==='asc'?1:-1)*((+a.getAttribute('data-a')||0)-(+b.getAttribute('data-a')||0))});
list.forEach(function(c){var ok=(!t||norm(c.getAttribute('data-n')).indexOf(t)>-1)&&(!cat||c.getAttribute('data-cat')===cat);c.hidden=!ok;if(ok)n++;g.appendChild(c)});
cn.textContent=n;em.hidden=n>0}
function toShop(){var s=document.getElementById('site-sec-services');if(s)s.scrollIntoView({behavior:'smooth',block:'start'})}
q.addEventListener('input',function(){if(hq)hq.value=q.value;run()});
so.addEventListener('change',run);
if(hq){hq.addEventListener('input',function(){q.value=hq.value;run()});hq.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();q.value=hq.value;run();toShop()}});if(hq.form)hq.form.addEventListener('submit',function(e){e.preventDefault();q.value=hq.value;run();toShop()})}
if(cb)cb.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.shop-cat');if(!b)return;cat=b.getAttribute('data-cat')||'';[].forEach.call(cb.children,function(x){x.classList.toggle('on',x===b)});run()});
try{var m=/[?&]q=([^&#]*)/.exec(location.search);if(m){var v=decodeURIComponent(m[1].replace(/\\+/g,' ')).slice(0,60);q.value=v;if(hq)hq.value=v;run();setTimeout(toShop,60)}}catch(e){}
})();
`;

// Pied de page en colonnes (adresse, contact, liens).
function footerHtml(o) {
  const e = o.escapeHtml, a = o.escapeAttr;
  const hb = String(o.hrefBase || '');
  const links = (o.navLinks || []).slice(0, 7).map(([id, label]) => `<a href="${a(hb)}#${id}">${e(label)}</a>`).join('');
  const contact = [
    o.address ? `<p>${e(o.address)}</p>` : '',
    o.hours ? `<p>${e(o.hours)}</p>` : '',
    o.phone ? `<a href="tel:${a(o.phone)}">${e(o.phone)}</a>` : '',
    o.email ? `<a href="mailto:${a(o.email)}">${e(o.email)}</a>` : ''
  ].join('');
  return `<div class="ft-grid">
    <div><p class="ft-brand">${e(o.name)}</p>${o.tagline ? `<p>${e(o.tagline)}</p>` : ''}</div>
    ${links ? `<div><h4>Navigation</h4>${links}</div>` : '<div></div>'}
    ${contact ? `<div><h4>Contact</h4>${contact}</div>` : '<div></div>'}
  </div>`;
}

// ===== Pages détaillées (fiche produit / service, article) : une adresse à elles, lisible par les moteurs de recherche =====
const DETAIL_CSS = `
  .dt-wrap{padding-top:26px;padding-bottom:8px}
  .crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:.84rem;color:var(--muted);margin:0 0 22px}
  .crumbs a{color:var(--muted);text-decoration:none;font-weight:500}.crumbs a:hover{color:var(--accent)}
  .crumbs svg{width:14px;height:14px;opacity:.55;flex:0 0 auto}.crumbs [aria-current]{color:var(--ink);font-weight:600}
  .dt{display:grid;gap:26px}
  @media(min-width:860px){.dt{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:52px;align-items:start}}
  .dt-media{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--accent-soft);aspect-ratio:1/1;display:flex;align-items:center;justify-content:center}
  .dt-media img{width:100%;height:100%;object-fit:cover;display:block}
  .dt-ph{font:800 5rem/1 'CN Display','CN Inter',sans-serif;color:var(--accent)}
  .dt-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 6px}
  .dt-chip{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:4px 11px;font-size:.76rem;font-weight:700;color:var(--muted);background:var(--card)}
  .dt-chip.hot{background:var(--accent);border-color:var(--accent);color:#fff}
  .dt-info h1{font-size:clamp(1.7rem,4vw,2.4rem);margin:8px 0 14px}
  .dt-price{display:flex;align-items:baseline;gap:12px;margin:0 0 18px}.dt-price b{font-size:1.9rem;letter-spacing:-.02em}.dt-price s{color:var(--muted);font-size:1.05rem}
  .dt-desc{color:var(--muted);font-size:1.02rem;margin:0 0 24px;white-space:pre-line;line-height:1.7}
  .dt-actions{display:grid;gap:10px;max-width:440px}.dt-actions .btn{justify-content:center;width:100%}
  .dt-points{list-style:none;padding:22px 0 0;margin:28px 0 0;display:grid;gap:14px;border-top:1px solid var(--border)}
  .dt-points li{display:flex;gap:12px;align-items:flex-start;font-size:.92rem}.dt-points svg{color:var(--accent);flex:0 0 auto;width:20px;height:20px;margin-top:2px}
  .dt-points b{display:block}.dt-points span{color:var(--muted)}
  .rel{margin:58px 0 26px}.rel h2{font-size:1.4rem;margin:0 0 18px}
  .rel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media(min-width:760px){.rel-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
  .rel-card{display:block;text-decoration:none;color:inherit;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card);transition:border-color .15s}
  .rel-card:hover{border-color:var(--accent)}
  .rel-card .im{aspect-ratio:4/3;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--accent);font-size:1.8rem}
  .rel-card .im img{width:100%;height:100%;object-fit:cover;display:block}
  .rel-card .tx{padding:12px 14px}.rel-card b{display:block;font-size:.95rem;line-height:1.3;margin:0 0 3px}.rel-card span{color:var(--muted);font-size:.86rem}
  .art{max-width:760px;margin:0 auto}.art h1{font-size:clamp(1.8rem,4.4vw,2.6rem);margin:12px 0 12px}
  .art-meta{color:var(--muted);font-size:.88rem;margin:0 0 24px}
  .art-cover{display:block;width:100%;border-radius:14px;border:1px solid var(--border);margin:0 0 28px;aspect-ratio:16/9;object-fit:cover}
  .art-body p{font-size:1.06rem;line-height:1.85;margin:0 0 1.15em}
  .art-foot{margin:34px 0 0;padding-top:22px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap}
  .art-foot .btn{justify-content:center}
  .btn-ghost-dark{background:transparent;color:var(--ink);border:1px solid color-mix(in srgb,var(--ink) 24%,transparent)}
  .btn-ghost-dark:hover{border-color:var(--accent);color:var(--accent)}
  .item-link{color:inherit;text-decoration:none}.item-link:hover{color:var(--accent);text-decoration:underline;text-underline-offset:3px}
  .read-more{color:var(--accent);font-weight:600;text-decoration:none;white-space:nowrap}.read-more:hover{text-decoration:underline}
  .pc-imglink{display:block;width:100%;height:100%}
  .dt-actions .cart-add{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:48px;padding:0 20px;border-radius:12px;border:0;background:var(--accent);color:#fff;font:700 1rem/1 inherit;font-family:inherit;cursor:pointer}
  .dt-actions .cart-add:hover{filter:brightness(.94)}
  #cn-install{display:inline-flex;align-items:center;gap:8px;margin:16px 0 0;min-height:44px;padding:0 18px;border-radius:12px;border:1px solid currentColor;background:transparent;color:inherit;font:600 .88rem/1 inherit;font-family:inherit;cursor:pointer;opacity:.9}
  #cn-install:hover{opacity:1}#cn-install[hidden]{display:none}#cn-install svg{width:16px;height:16px;flex:0 0 auto}
  .cn-cohint{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:11px 14px;border:1px solid var(--line,rgba(100,116,139,.28));border-radius:12px;font-size:.84rem;color:var(--muted,#5b6678)}
  .cn-cohint button{border:0;background:transparent;color:var(--accent);font:700 .84rem inherit;font-family:inherit;cursor:pointer;padding:6px 0}
`;

function crumbsHtml(o) {
  const e = o.e, a = o.a;
  const parts = o.crumbs.map((c, i) => i === o.crumbs.length - 1
    ? `<span aria-current="page">${e(c[0])}</span>`
    : `<a href="${a(c[1])}">${e(c[0])}</a>${SVG.chev}`);
  return `<nav class="crumbs" aria-label="Fil d'Ariane">${parts.join('')}</nav>`;
}
function relatedHtml(o, title) {
  if (!o.related || !o.related.length) return '';
  const e = o.e, a = o.a;
  return `<section class="rel"><h2>${e(title)}</h2><div class="rel-grid">${o.related.map((r) => `<a class="rel-card" href="${a(r.href)}"><div class="im">${r.img ? `<img src="${a(r.img)}" alt="${a(r.name)}" loading="lazy">` : e(String(r.name).trim().charAt(0).toUpperCase())}</div><div class="tx"><b>${e(r.name)}</b>${r.sub ? `<span>${e(r.sub)}</span>` : ''}</div></a>`).join('')}</div></section>`;
}

// Fiche produit ou service.
function detailItemHtml(o) {
  const e = o.e, a = o.a, it = o.item;
  const chips = [it.cat ? `<span class="dt-chip">${e(it.cat)}</span>` : '', it.badge ? `<span class="dt-chip hot">${e(it.badge)}</span>` : ''].join('');
  const points = (o.points || []).map((p, i) => `<li>${SVG[p[2]] || [SVG.chat, SVG.shield, SVG.clock][i % 3]}<div><b>${e(p[0])}</b><span>${e(p[1])}</span></div></li>`).join('');
  return `<div class="container dt-wrap">
  ${crumbsHtml(o)}
  <article class="dt">
    <div class="dt-media">${it.img ? `<img src="${a(it.img)}" alt="${a(it.name)}" fetchpriority="high">` : `<span class="dt-ph" aria-hidden="true">${e(String(it.name).trim().charAt(0).toUpperCase())}</span>`}</div>
    <div class="dt-info">
      ${chips ? `<div class="dt-chips">${chips}</div>` : ''}
      <h1>${e(it.name)}</h1>
      ${it.price ? `<div class="dt-price"><b>${e(it.price)}</b>${it.oldPrice ? `<s>${e(it.oldPrice)}</s>` : ''}</div>` : ''}
      ${it.desc ? `<p class="dt-desc">${e(it.desc)}</p>` : ''}
      <div class="dt-actions">
        ${o.cartIndex != null ? `<button type="button" class="cart-add" data-i="${Number(o.cartIndex) || 0}">+ Ajouter au panier</button>` : ''}
        ${it.order ? `<a class="btn ${o.cartIndex != null ? 'btn-ghost-dark' : 'btn-accent'}" href="${a(it.order)}" target="_blank" rel="noopener">${o.waIcon || ''}${e(o.orderLabel)}</a>` : ''}
        <a class="btn btn-ghost-dark" href="${a(o.homeHref + '#site-sec-services')}">${e(o.backLabel)}</a>
      </div>
      ${points ? `<ul class="dt-points">${points}</ul>` : ''}
    </div>
  </article>
  ${relatedHtml(o, o.relatedTitle)}
</div>`;
}

// Article de blog.
function detailPostHtml(o) {
  const e = o.e, a = o.a, p = o.post;
  const paras = String(p.body || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${e(x).replace(/\n/g, '<br>')}</p>`).join('');
  return `<div class="container dt-wrap">
  ${crumbsHtml(o)}
  <article class="art">
    ${p.category ? `<span class="dt-chip">${e(p.category)}</span>` : ''}
    <h1>${e(p.title)}</h1>
    <p class="art-meta">${e(p.dateLabel)} · ${e(p.minutes)} min de lecture</p>
    ${p.img ? `<img class="art-cover" src="${a(p.img)}" alt="${a(p.title)}" fetchpriority="high">` : ''}
    <div class="art-body">${paras}</div>
    <div class="art-foot">
      <button type="button" class="btn btn-ghost-dark" onclick="shareSite()">Partager cet article</button>
      <a class="btn btn-ghost-dark" href="${a(o.homeHref + '#site-sec-blog')}">Toutes les actualités</a>
    </div>
  </article>
  ${relatedHtml(o, 'À lire aussi')}
</div>`;
}

module.exports = { DETAIL_CSS, detailItemHtml, detailPostHtml, DESIGN_CSS, shopCss, shopHtml, shopMosaic, shopHeaderTools, SHOP_JS, footerHtml, SVG };
