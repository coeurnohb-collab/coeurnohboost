// api/_lib/site-packs.js : « dispositions » des modèles de sites.
// Un modèle choisit une valeur dans chaque liste fermée ci-dessous (jamais de texte libre dans le CSS) :
//   hr  bandeau d'accueil   : n normal · s court · f plein écran · c texte dans un panneau
//   tb  en-tête             : d standard · f flottant · l filet de couleur
//   st  chiffres clés       : f flottant · l bandeau plat · t teinté · n filet
//   ab  « à propos »        : s photo à côté · f photo à droite · k photo en haut · c carte sur la photo · p texte seul
//   sv  produits/services   : c cartes · r lignes · t tuiles · f première en vedette · i index numéroté
//   gl  galerie             : m mosaïque · e égale · s bande défilante · c colonnes · f cadres
//   hd  titres de section   : l à gauche · c centré · r filet · n numéroté · b barre
//   ts  avis                : c cartes · q citation · b bulle · s bande défilante
//   ft  pied de page        : c colonnes · m centré · d foncé
//   ord ordre des blocs principaux (a à propos · i produits/services · g galerie), ex. « iag »
// Chaque modèle obtient ainsi une vraie structure différente, pas seulement d'autres couleurs.
'use strict';

const LISTS = {
  hr: { n: '', s: 'hr-short', f: 'hr-full', c: 'hr-card' },
  tb: { d: '', f: 'tb-float', l: 'tb-line' },
  st: { f: '', l: 'st-flat', t: 'st-tint', n: 'st-line' },
  ab: { s: '', f: 'ab-flip', k: 'ab-stack', c: 'ab-card', p: 'ab-plain' },
  sv: { c: '', r: 'sv-rows', t: 'sv-tiles', f: 'sv-feat', i: 'sv-idx' },
  gl: { m: '', e: 'gl-even', s: 'gl-strip', c: 'gl-cols', f: 'gl-frame' },
  hd: { l: '', c: 'hd-center', r: 'hd-rule', n: 'hd-num', b: 'hd-bar' },
  ts: { c: '', q: 'ts-quote', b: 'ts-bubble', s: 'ts-strip' },
  ft: { c: '', m: 'ft-center', d: 'ft-dark' }
};
const ORDERS = ['aig', 'agi', 'iag', 'iga', 'gai', 'gia'];
const BLOCKS = { a: 'about', i: 'items', g: 'gallery' };

// Classes à poser sur <body> pour un modèle (shop = vitrine de vente : ses produits ont leur propre présentation).
function packClasses(pk, shop) {
  if (!pk || typeof pk !== 'object') return '';
  const out = [];
  Object.keys(LISTS).forEach((k) => {
    if (shop && (k === 'sv' || k === 'hr' || k === 'tb')) return;
    const c = LISTS[k][pk[k]];
    if (c) out.push(c);
  });
  return out.length ? ' pk ' + out.join(' ') : '';
}
// Ordre des trois blocs principaux : celui du modèle s'il en a un, sinon celui du type de site.
function packOrder(pk, fallback) {
  if (pk && ORDERS.indexOf(pk.ord) >= 0) return pk.ord.split('').map((c) => BLOCKS[c]);
  return fallback;
}

const PACK_CSS = `
  /* ===== Dispositions des modèles : emplacements et présentation des blocs ===== */
  /* Bandeau d'accueil */
  body.pk.hr-short .hero.has-cover{min-height:clamp(300px,52svh,470px)}
  body.pk.hr-short .hero.has-cover .hero-inner{padding-top:84px;padding-bottom:30px}
  body.pk.hr-full .hero.has-cover{min-height:clamp(540px,94svh,840px)}
  body.pk.hr-card .hero .hero-inner{padding:24px 22px;border-radius:var(--radius);margin-top:30px;margin-bottom:30px;border:1px solid color-mix(in srgb,currentColor 20%,transparent)}
  body.pk.hr-card .hero.has-cover{align-items:center}
  body.pk.hr-card .hero.has-cover .hero-inner{background:color-mix(in srgb,var(--hero1) 82%,transparent);border-color:rgba(255,255,255,.22);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  @media(min-width:860px){body.pk.hr-card .hero .hero-inner{padding:34px 36px}}

  /* En-tête */
  body.pk.tb-float .topbar{top:8px;margin:8px 10px 0;border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow)}
  body.pk.tb-float .topbar .container{padding-left:14px;padding-right:14px}
  body.pk.tb-line .topbar{border-bottom:2px solid var(--accent)}

  /* Chiffres clés */
  body.pk.st-flat .stats{margin-top:0;border-radius:0;border-left:0;border-right:0}
  body.pk.st-tint .stats{background:color-mix(in srgb,var(--accent) 11%,var(--card));border-color:color-mix(in srgb,var(--accent) 24%,var(--border))}
  body.pk.st-tint .stat b{color:var(--accent-ink)}
  body.pk.st-line .stats{background:transparent;border:0;border-top:2px solid var(--ink);border-bottom:1px solid var(--border);border-radius:0;margin-top:0;box-shadow:none}
  body.pk.st-line .stat{border:0;margin:0;padding:18px 8px}
  body.pk.st-line .stat b{font-weight:300;font-size:clamp(1.6rem,5vw,2.4rem)}

  /* Titres de section */
  body.pk.hd-center .section-head{text-align:center}
  body.pk.hd-center .section-head h2::after{content:"";display:block;width:42px;height:3px;border-radius:2px;background:var(--accent);margin:12px auto 0}
  body.pk.hd-center .sec-sub{margin-left:auto;margin-right:auto;max-width:560px}
  body.pk.hd-rule .section-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;padding-bottom:12px;border-bottom:1px solid var(--border)}
  body.pk.hd-rule .section-head h2{order:1;margin:0}
  body.pk.hd-rule .section-head .eyebrow{order:2;margin:0 0 0 auto}
  body.pk.hd-rule .section-head .sec-sub{order:3;flex:0 0 100%}
  body.pk.hd-num main{counter-reset:sec}
  body.pk.hd-num .section-head{counter-increment:sec}
  body.pk.hd-num .section-head::before{content:counter(sec,decimal-leading-zero);display:block;font-weight:300;font-size:2rem;line-height:1;letter-spacing:-.03em;color:var(--accent-ink);margin-bottom:8px}
  body.pk.hd-bar .section-head{border-left:4px solid var(--accent);padding-left:14px}

  /* À propos */
  body.pk.ab-flip .about.has-img .about-img{order:2}
  body.pk.ab-stack .about,body.pk.ab-stack .about.has-img{grid-template-columns:1fr;gap:22px}
  body.pk.ab-stack .about-img{aspect-ratio:16/9}
  body.pk.ab-stack .about-text{max-width:720px;margin:0 auto;text-align:center}
  body.pk.ab-stack .about-points{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px}
  @media(min-width:860px){body.pk.ab-stack .about-img{aspect-ratio:21/8}}
  body.pk.ab-card .about,body.pk.ab-card .about.has-img{display:block}
  body.pk.ab-card .about-img{display:block;aspect-ratio:16/10}
  body.pk.ab-card .about-text{position:relative;z-index:2;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px 20px;margin:-48px 12px 0;box-shadow:var(--shadow)}
  body.pk.ab-card .about:not(.has-img) .about-text{margin:0}
  @media(min-width:860px){
    body.pk.ab-card .about.has-img{display:grid;grid-template-columns:repeat(12,1fr);align-items:center;gap:0}
    body.pk.ab-card .about.has-img .about-img{grid-column:1/9;grid-row:1;aspect-ratio:16/10}
    body.pk.ab-card .about.has-img .about-text{grid-column:7/13;grid-row:1;margin:0;padding:32px 34px}
  }
  body.pk.ab-plain .about-img{display:none}
  body.pk.ab-plain .about,body.pk.ab-plain .about.has-img{display:block}
  body.pk.ab-plain .about-text{border-left:4px solid var(--accent);padding-left:20px;max-width:780px}
  body.pk.ab-plain .about-text p{font-size:1.08rem;line-height:1.7}
  body.pk.ab-plain .about-points{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}

  /* Produits et services */
  body.pk.sv-rows .items-grid{grid-template-columns:1fr;gap:10px}
  body.pk.sv-rows .item-card,body.pk.sv-rows .item-card.has-photo{display:grid;grid-template-columns:76px 1fr auto;column-gap:14px;row-gap:2px;align-items:center;padding:12px}
  body.pk.sv-rows .item-card .item-photo{grid-row:1/span 4;width:76px;height:76px;aspect-ratio:1;object-fit:cover;border-radius:calc(var(--radius) - 4px);margin:0}
  body.pk.sv-rows .item-card .item-num{grid-row:1/span 4;width:76px;height:76px;display:flex;align-items:center;justify-content:center;font-size:1.3rem}
  body.pk.sv-rows .item-card h3,body.pk.sv-rows .item-card.has-photo h3{grid-column:2;margin:0}
  body.pk.sv-rows .item-card .item-price{grid-column:3;grid-row:1;justify-self:end;align-self:start}
  body.pk.sv-rows .item-card .item-desc,body.pk.sv-rows .item-card.has-photo .item-desc{grid-column:2/-1;margin:0}
  body.pk.sv-rows .item-card .item-btn,body.pk.sv-rows .item-card.has-photo .item-btn,body.pk.sv-rows .item-card .cart-add{grid-column:2/-1;padding:4px 0 0;margin:0}
  body.pk.sv-rows .item-card.has-photo>:not(.item-photo){margin-left:0;margin-right:0}
  @media(min-width:860px){body.pk.sv-rows .items-grid{grid-template-columns:repeat(2,1fr)}}
  body.pk.sv-tiles .items-grid{grid-template-columns:repeat(2,1fr);gap:10px}
  body.pk.sv-tiles .item-card{padding:14px 12px}
  body.pk.sv-tiles .item-card.has-photo{padding:0}
  body.pk.sv-tiles .item-card.has-photo>:not(.item-photo){margin-left:12px;margin-right:12px}
  body.pk.sv-tiles .item-card .item-photo{aspect-ratio:1}
  body.pk.sv-tiles .item-card h3{font-size:.92rem}
  body.pk.sv-tiles .item-card .item-desc{font-size:.78rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  body.pk.sv-tiles .item-card .item-btn{font-size:.76rem}
  @media(min-width:860px){body.pk.sv-tiles .items-grid{grid-template-columns:repeat(4,1fr)}}
  body.pk.sv-feat .items-grid>.item-card:first-child{grid-column:1/-1}
  body.pk.sv-feat .items-grid>.item-card.has-photo:first-child .item-photo{aspect-ratio:16/9}
  body.pk.sv-feat .items-grid>.item-card:first-child h3{font-size:1.25rem}
  body.pk.sv-feat .items-grid>.item-card:first-child{padding-top:24px;padding-bottom:24px}
  body.pk.sv-feat .items-grid>.item-card.has-photo:first-child{padding:0}
  @media(min-width:760px){
    body.pk.sv-feat .items-grid>.item-card.has-photo:first-child{display:grid;grid-template-columns:1.2fr 1fr;align-items:center;column-gap:26px;padding:0}
    body.pk.sv-feat .items-grid>.item-card.has-photo:first-child .item-photo{grid-row:1/span 5;height:100%;aspect-ratio:auto;min-height:240px}
    body.pk.sv-feat .items-grid>.item-card.has-photo:first-child>:not(.item-photo){grid-column:2;margin-left:0;margin-right:24px}
  }
  body.pk.sv-idx .items-grid{gap:26px 22px}
  body.pk.sv-idx .item-card,body.pk.sv-idx .item-card.has-photo{background:transparent;border:0;border-top:2px solid var(--ink);border-radius:0;box-shadow:none;padding:14px 0 4px}
  body.pk.sv-idx .item-card.has-photo{padding:0;border-top:0}
  body.pk.sv-idx .item-card.has-photo .item-photo{border-radius:0;margin-bottom:0}
  body.pk.sv-idx .item-card.has-photo>:not(.item-photo){margin-left:0;margin-right:0}
  body.pk.sv-idx .item-card.has-photo h3{border-top:2px solid var(--ink);padding-top:12px;margin-top:12px}
  body.pk.sv-idx .item-num{background:none;color:var(--accent-ink);padding:0;width:auto;height:auto;justify-content:flex-start;font-size:1.7rem;font-weight:300;letter-spacing:-.03em}

  /* Galerie */
  body.pk.gl-even .g-item:first-child{grid-column:auto;grid-row:auto}
  body.pk.gl-strip .gallery{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:0 20px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  body.pk.gl-strip .gallery::-webkit-scrollbar{display:none}
  body.pk.gl-strip .g-item,body.pk.gl-strip .g-item:first-child{flex:0 0 74%;max-width:340px;aspect-ratio:4/5;scroll-snap-align:center;grid-column:auto;grid-row:auto}
  body.pk.gl-cols .gallery{display:block;column-count:2;column-gap:10px}
  body.pk.gl-cols .g-item,body.pk.gl-cols .g-item:first-child{display:block;width:100%;margin:0 0 10px;break-inside:avoid;grid-column:auto;grid-row:auto;aspect-ratio:1}
  body.pk.gl-cols .g-item:nth-child(3n+1){aspect-ratio:3/4}
  body.pk.gl-cols .g-item:nth-child(3n){aspect-ratio:4/5}
  @media(min-width:860px){body.pk.gl-cols .gallery{column-count:3}}
  body.pk.gl-frame .g-item,body.pk.gl-frame .g-item:first-child{border:7px solid var(--card);border-radius:3px;box-shadow:var(--shadow);outline:1px solid var(--border);aspect-ratio:4/5;grid-column:auto;grid-row:auto}

  /* Avis */
  body.pk.ts-quote .testis{grid-template-columns:1fr;gap:26px;max-width:780px}
  body.pk.ts-quote .testi{background:transparent;border:0;border-left:4px solid var(--accent);border-radius:0;box-shadow:none;padding:2px 0 2px 20px}
  body.pk.ts-quote .testi>svg{display:none}
  body.pk.ts-quote .testi p{font-size:1.12rem;line-height:1.55;font-weight:500;margin:0 0 14px}
  body.pk.ts-bubble .testi{background:color-mix(in srgb,var(--accent) 9%,var(--card));border:0;border-radius:var(--radius) var(--radius) var(--radius) 4px;box-shadow:none}
  body.pk.ts-strip .testis{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:0 20px 8px;scrollbar-width:none}
  body.pk.ts-strip .testis::-webkit-scrollbar{display:none}
  body.pk.ts-strip .testi{flex:0 0 82%;max-width:380px;scroll-snap-align:center}

  /* Pied de page */
  body.pk.ft-center .footer{text-align:center}
  body.pk.ft-center .ft-grid{grid-template-columns:1fr;justify-items:center}
  body.pk.ft-center .ft-bottom{justify-content:center;text-align:center;flex-direction:column}
  body.pk.ft-center .footer-actions{justify-content:center}
  body.pk.ft-dark .footer{background:var(--hero1);color:#e6ebf3;border-top:0}
  body.pk.ft-dark .ft-brand,body.pk.ft-dark .ft-grid h4{color:#fff}
  body.pk.ft-dark .ft-grid p,body.pk.ft-dark .ft-grid a,body.pk.ft-dark .ft-bottom p,body.pk.ft-dark .ft-bottom a,body.pk.ft-dark .ft-legal a,body.pk.ft-dark .ft-legal button{color:rgba(255,255,255,.74)}
  body.pk.ft-dark .ft-grid a:hover{color:#fff}
  body.pk.ft-dark .ft-bottom{border-top-color:rgba(255,255,255,.16)}
  body.pk.ft-dark .footer-actions button{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)}
`;

module.exports = { PACK_CSS, packClasses, packOrder, ORDERS, LISTS };
