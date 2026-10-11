// api/render-site.js
//
// Sert deux choses en UN SEUL fichier (pour rester sous la limite de 12
// fonctions serverless du plan Vercel Hobby -- meme logique que
// payments-actions.js qui regroupe deja plusieurs actions) :
//
//   1) La VRAIE page publique d'un mini-site ("Crée ton site"), a l'adresse
//      /s/<slug> (voir la regle "rewrites" dans vercel.json). Contrairement
//      a l'ancienne adresse "/?site=<slug>" (uniquement cote client, page
//      blanche tant que le JavaScript n'a pas fini de charger et d'interroger
//      Firestore), cette page est entierement generee CoTE SERVEUR : elle
//      repond meme si le visiteur a une connexion lente, un vieux telephone,
//      ou si un bloqueur de script est actif -- exactement ce qu'attendent
//      Google, Bing et les autres moteurs de recherche pour indexer une
//      page (ils ne referencent fiablement que du contenu present dans le
//      HTML initial, pas ce qui n'apparait qu'apres execution de JS).
//      Balises title/description/Open Graph uniques par site, donnees
//      structurees JSON-LD (LocalBusiness), contenu FAQ en <details> (donc
//      lisible sans JavaScript), liens tel:/mailto:/wa.me reels.
//
//   2) Le plan du site dynamique (/sitemap-sites.xml -> voir vercel.json)
//      qui liste TOUS les mini-sites publies, pour aider les moteurs de
//      recherche a les decouvrir. Genere a la demande (jamais stocke), donc
//      toujours a jour des qu'un site est publie ou depublie.
//
// Aucune ecriture cote client n'est necessaire pour que cette page existe :
// elle lit simplement, en lecture seule, exactement les memes documents
// Firestore ("mini_sites") que le reste de l'application.

const admin = require('firebase-admin');
const { initFirebaseAdmin } = require('./_lib/security');

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

initFirebaseAdmin();
const db = admin.firestore();

const SITE_ORIGIN = 'https://coeurnohboost.vercel.app';
const SITE_TEMPLATES = {
  classique: { accent: '#2563eb' },
  sombre: { accent: '#111827' },
  chaleureux: { accent: '#d97706' },
  doux: { accent: '#db2777' },
  nature: { accent: '#15803d' }
};

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function escapeAttr(str) { return escapeHtml(str); }
// Texte sûr entre apostrophes dans un onclick="fn('...')" : \ ' " & < > deviennent \uXXXX.
// (escapeAttr + replace(/'/g) ne suffisait pas : &#39; redevient une apostrophe dans l'attribut.)
function jsStr(str) {
  return String(str == null ? '' : str).replace(/[\\'"&<>\r\n\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
// Lien externe : seulement http(s) (refuse javascript:, data: ...).
function safeHttpUrl(raw) {
  const u = String(raw == null ? '' : raw).trim();
  return /^https?:\/\//i.test(u) ? u : '#';
}
function escapeXml(str) { return escapeHtml(str); }
function waLinkFrom(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}
function siteIsPremiumActive(site) {
  return !!(site && site.premium && site.premiumUntil && new Date(site.premiumUntil).getTime() > Date.now());
}

function notFoundPage(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=30');
  return res.status(404).send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Site introuvable — Coeurnoh Universe</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f3ede1;color:#1c1a17;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}
.card{max-width:420px}h1{font-size:1.3rem;margin-bottom:8px}p{color:#6b675f;line-height:1.5}
a{display:inline-block;margin-top:16px;background:#1c1a17;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700}</style>
</head><body><div class="card">
<h1>Ce site n'existe pas ou n'est plus disponible.</h1>
<p>Le lien est peut-être incorrect, ou le propriétaire n'a pas encore publié son site.</p>
<a href="${SITE_ORIGIN}/">Découvrir Coeurnoh Universe</a>
</div></body></html>`);
}

const SOCIAL_KEYS = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn'], ['x', 'X'], ['website', 'Site web']];

function buildSiteHtml(site, slug, opts) {
  opts = opts || {};
  const pageUrl = opts.preview ? `${SITE_ORIGIN}/` : (opts.pagePath ? `${SITE_ORIGIN}${opts.pagePath}` : `${SITE_ORIGIN}/s/${encodeURIComponent(slug)}`);
  const isPremium = !!opts.forcePremium || siteIsPremiumActive(site);
  const customAccent = (isPremium && /^#[0-9a-fA-F]{6}$/.test(String(site.accentColor || ''))) ? site.accentColor : null;
  const accent = customAccent || (SITE_TEMPLATES[site.template] || SITE_TEMPLATES.classique).accent;
  const title = escapeHtml((site.seoTitle || site.businessName || 'Site professionnel') + ' — Coeurnoh Universe');
  const description = escapeAttr((site.seoDescription || site.tagline || site.aboutText || '').slice(0, 160)
    || `Découvrez ${site.businessName || 'ce professionnel'} sur Coeurnoh Universe.`);
  const ogImage = site.coverImageUrl || site.logoUrl || `${SITE_ORIGIN}/og-image.jpg`;
  const waLink = waLinkFrom(site.contactWhatsapp);
  const gallery = Array.isArray(site.gallery) ? site.gallery.filter(Boolean) : [];
  const services = Array.isArray(site.services) ? site.services.filter((s) => s.name) : [];
  const faq = Array.isArray(site.faq) ? site.faq.filter((f) => f.question && f.answer) : [];
  const testimonials = Array.isArray(site.testimonials) ? site.testimonials.filter((x) => x.name && x.text) : [];
  const blogPosts = Array.isArray(site.blogPosts) ? site.blogPosts.filter((x) => x.title && x.body).slice().reverse() : [];
  const customSections = Array.isArray(site.customSections) ? site.customSections.filter((x) => x.title && x.body) : [];
  const stats = Array.isArray(site.stats) ? site.stats.filter((x) => x && x.value && x.label).slice(0, 4) : [];
  const announcement = String(site.announcement || '').trim().slice(0, 140);
  const initial = (site.businessName || '?').trim().charAt(0).toUpperCase();

  // Donnees structurees (schema.org) : aide Google a comprendre qu'il
  // s'agit d'une vraie fiche d'entreprise (nom, contact, adresse, avis).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.businessName || undefined,
    description: site.aboutText || site.tagline || undefined,
    image: ogImage || undefined,
    url: pageUrl,
    telephone: site.contactPhone || undefined,
    email: site.contactEmail || undefined,
    address: site.address ? { '@type': 'PostalAddress', streetAddress: site.address } : undefined,
    sameAs: SOCIAL_KEYS.map(([k]) => site.socialLinks && site.socialLinks[k]).filter(Boolean)
  };
  Object.keys(jsonLd).forEach((k) => jsonLd[k] === undefined && delete jsonLd[k]);

  const faqJsonLd = faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question', name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer }
    }))
  } : null;

  // ---- Type de site : adapte les textes, l'ordre des sections et les boutons ----
  // "siteType" est optionnel (anciens sites = "entreprise").
  const TYPES = {
    entreprise: { cta: 'Demander un devis', waVerb: 'un devis pour', itemsTitle: 'Nos services', itemsSub: 'Ce que nous faisons pour vous', itemBtn: 'Demander', aboutTitle: 'Qui sommes-nous', galleryTitle: 'En images', order: ['about', 'items', 'gallery'] },
    boutique: { cta: 'Commander sur WhatsApp', waVerb: 'commander', itemsTitle: 'Nos produits', itemsSub: 'Disponibles maintenant', itemBtn: 'Commander', aboutTitle: 'Notre boutique', galleryTitle: 'Galerie', order: ['items', 'gallery', 'about'] },
    restaurant: { cta: 'Réserver une table', waVerb: 'réserver / commander', itemsTitle: 'Notre menu', itemsSub: 'Cuisine préparée avec soin', itemBtn: 'Commander', aboutTitle: 'Notre histoire', galleryTitle: 'L’ambiance', order: ['about', 'items', 'gallery'], menu: true },
    portfolio: { cta: 'Me contacter', waVerb: 'travailler avec vous sur', itemsTitle: 'Mes services', itemsSub: 'Comment je peux vous aider', itemBtn: 'Me contacter', aboutTitle: 'À propos de moi', galleryTitle: 'Mes réalisations', order: ['gallery', 'about', 'items'] }
  };
  const siteType = TYPES[site.siteType] ? site.siteType : 'entreprise';
  const TY = Object.assign({}, TYPES[siteType]);
  if (opts.ctaLabel) TY.cta = String(opts.ctaLabel).slice(0, 40);
  const dark = site.template === 'sombre';
  const mapsLink = site.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}` : null;
  const waHref = (txt) => waLink ? `${waLink}?text=${encodeURIComponent(txt)}` : null;
  const mainCtaHref = waLink ? waHref(`Bonjour ${site.businessName || ''}, je vous contacte depuis votre site.`) : (site.contactPhone ? `tel:${site.contactPhone}` : (site.contactEmail ? `mailto:${site.contactEmail}` : '#site-sec-contact'));
  const hasContact = !!(waLink || site.contactPhone || site.contactEmail || site.address);

  const IC = {
    wa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    quote: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M9.5 6C6.5 7 4.5 9.7 4.5 13v5h6v-6h-3c0-2 1-3.4 3-4zM19.5 6c-3 1-5 3.7-5 7v5h6v-6h-3c0-2 1-3.4 3-4z"/></svg>',
    up: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>'
  };

  const navLinks = [
    ['site-sec-about', TY.aboutTitle === 'À propos de moi' ? 'À propos' : 'À propos'],
    services.length ? ['site-sec-services', TY.itemsTitle.replace(/^(Nos|Notre|Mes)\s+/i, '').replace(/^./, (c) => c.toUpperCase())] : null,
    gallery.length ? ['site-sec-gallery', 'Galerie'] : null,
    blogPosts.length ? ['site-sec-blog', 'Actualités'] : null,
    testimonials.length ? ['site-sec-testimonials', 'Avis'] : null,
    faq.length ? ['site-sec-faq', 'FAQ'] : null,
    hasContact ? ['site-sec-contact', 'Contact'] : null
  ].filter(Boolean).filter((n) => n[0] !== 'site-sec-about' || site.aboutText);

  const blogCategories = [...new Set(blogPosts.map((p) => p.category).filter(Boolean))];

  const itemCards = services.map((sv, i) => {
    const order = waHref(`Bonjour, je souhaite ${TY.waVerb} : ${sv.name}${sv.price ? ' (' + sv.price + ')' : ''}.`);
    if (TY.menu) {
      return `<div class="menu-row"><div class="menu-main"><div class="menu-top"><div class="menu-name">${escapeHtml(sv.name)}</div><div class="menu-dots" aria-hidden="true"></div>${sv.price ? `<div class="menu-price">${escapeHtml(sv.price)}</div>` : ''}</div>${sv.desc ? `<div class="menu-desc">${escapeHtml(sv.desc)}</div>` : ''}</div></div>`;
    }
    return `<article class="item-card reveal">
      <div class="item-num">${String(i + 1).padStart(2, '0')}</div>
      <h3>${escapeHtml(sv.name)}</h3>
      ${sv.price ? `<div class="item-price">${escapeHtml(sv.price)}</div>` : ''}
      ${sv.desc ? `<p class="item-desc">${escapeHtml(sv.desc)}</p>` : ''}
      ${order ? `<a class="item-btn" href="${escapeAttr(order)}" target="_blank" rel="noopener">${TY.itemBtn} ${IC.arrow}</a>` : ''}
    </article>`;
  }).join('');

  const sectionAbout = site.aboutText ? `
  <section class="section" id="site-sec-about">
    <div class="about reveal${gallery.length || site.coverImageUrl ? ' has-img' : ''}">
      ${(gallery[0] || site.coverImageUrl) ? `<img class="about-img" src="${escapeAttr(gallery[0] || site.coverImageUrl)}" alt="" loading="lazy">` : ''}
      <div class="about-text">
        <span class="eyebrow">${escapeHtml(TY.aboutTitle)}</span>
        <h2>${escapeHtml(site.tagline || site.businessName || '')}</h2>
        <p>${escapeHtml(site.aboutText).replace(/\n/g, '<br>')}</p>
        <ul class="about-points">
          ${site.hours ? `<li>${IC.check}<span>${escapeHtml(site.hours)}</span></li>` : ''}
          ${site.address ? `<li>${IC.check}<span>${escapeHtml(site.address)}</span></li>` : ''}
          ${waLink ? `<li>${IC.check}<span>Réponse rapide sur WhatsApp</span></li>` : ''}
        </ul>
      </div>
    </div>
  </section>` : '';
  const sectionItems = services.length ? `
  <section class="section" id="site-sec-services">
    <div class="section-head reveal"><span class="eyebrow">${escapeHtml(TY.itemsSub)}</span><h2>${escapeHtml(TY.itemsTitle)}</h2></div>
    ${TY.menu ? `<div class="menu reveal">${itemCards}</div>` : `<div class="items-grid">${itemCards}</div>`}
  </section>` : '';
  const sectionGallery = gallery.length ? `
  <section class="section" id="site-sec-gallery">
    <div class="section-head reveal"><span class="eyebrow">${gallery.length} photo${gallery.length > 1 ? 's' : ''}</span><h2>${escapeHtml(TY.galleryTitle)}</h2></div>
    <div class="gallery">${gallery.map((g, i) => `<button type="button" class="g-item reveal" onclick="openSiteLightbox('${jsStr(g)}')" aria-label="Agrandir la photo ${i + 1}"><img src="${escapeAttr(g)}" alt="${escapeAttr(site.businessName || '')} ${i + 1}" loading="lazy"></button>`).join('')}</div>
  </section>` : '';
  const blocks = { about: sectionAbout, items: sectionItems, gallery: sectionGallery };
  const mainSections = TY.order.map((k) => blocks[k]).join('');

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="${escapeAttr(accent)}">
<link rel="canonical" href="${pageUrl}">
<meta name="robots" content="${opts.preview ? 'noindex, nofollow' : 'index, follow'}">
<meta property="og:type" content="business.business">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${escapeAttr(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
${site.logoUrl ? `<link rel="icon" href="${escapeAttr(site.logoUrl)}">` : ''}
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>
${faqJsonLd ? `<script type="application/ld+json">${safeJsonLd(faqJsonLd)}</script>` : ''}
<style>
  :root{--accent:${accent};--accent-soft:color-mix(in srgb,var(--accent) 10%,#fff);--wa:#1fa855;--ink:#0f172a;--muted:#5b6678;--bg:#f6f8fb;--card:#fff;--border:#e4e8ef;--radius:18px;--shadow:0 14px 40px -18px rgba(15,23,42,.25)}
  ${dark ? `:root{--accent-soft:color-mix(in srgb,var(--accent) 22%,#1b2332);--ink:#eef2f8;--muted:#9aa6ba;--bg:#0c111b;--card:#141b29;--border:#232d3f;--shadow:0 14px 40px -18px rgba(0,0,0,.7)}` : ''}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth;scroll-padding-top:76px}
  body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  img{max-width:100%}
  h1,h2,h3{line-height:1.15;letter-spacing:-.02em;margin:0}
  .container{max-width:1080px;margin:0 auto;padding:0 20px}

  /* Barre de navigation */
  .topbar{position:sticky;top:0;z-index:20;background:linear-gradient(180deg,rgba(10,22,51,.92),rgba(8,18,44,.84));color:#eaf0ff;backdrop-filter:saturate(180%) blur(16px);-webkit-backdrop-filter:saturate(180%) blur(16px);border-bottom:1px solid rgba(255,255,255,.12);box-shadow:0 10px 30px -18px rgba(0,0,0,.6)}
  .topbar .nav a,.topbar .navscroll a{color:#c9d6f5}
  .topbar .nav a:hover{color:#fff;background:rgba(255,255,255,.1)}
  .topbar .navscroll a{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.12)}
  .topbar .pro-badge{background:rgba(255,255,255,.14);color:#fff}
  .progress{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--accent),#7dd3fc);z-index:60;transition:width .1s}
  .announce{background:linear-gradient(90deg,#0a1633,#12306b);color:#e8efff;font-size:.82rem;font-weight:600;text-align:center;padding:9px 40px;position:relative;border-bottom:1px solid rgba(255,255,255,.12)}
  .announce button{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;color:#c9d6f5;font-size:1.2rem;cursor:pointer;line-height:1}
  .topbar-row{display:flex;align-items:center;gap:14px;height:62px}
  .brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;font-size:1rem;min-width:0}
  .brand-logo{width:34px;height:34px;border-radius:10px;object-fit:cover;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex:0 0 auto}
  .brand-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pro-badge{background:var(--accent-soft);color:var(--accent);font-size:.66rem;font-weight:800;padding:3px 8px;border-radius:999px;letter-spacing:.04em}
  .nav{display:none;gap:4px;margin-left:auto}
  .nav a{text-decoration:none;color:var(--muted);font-weight:600;font-size:.9rem;padding:8px 12px;border-radius:10px}
  .nav a:hover{color:var(--ink);background:var(--accent-soft)}
    .navscroll{display:flex;gap:6px;overflow-x:auto;padding:0 20px 10px;scrollbar-width:none}
  .navscroll::-webkit-scrollbar{display:none}
  .navscroll a{flex:0 0 auto;text-decoration:none;color:var(--muted);font-weight:700;font-size:.82rem;padding:7px 14px;border-radius:999px;background:var(--accent-soft)}
  @media(max-width:859px){.pro-badge{display:none}.topbar-row{height:56px}}
  @media(min-width:860px){.nav{display:flex}.navscroll{display:none}}

  /* Bandeau d'accueil */
  .hero{position:relative;color:#fff;overflow:hidden;background:radial-gradient(900px 420px at 88% -8%,color-mix(in srgb,var(--accent) 45%,transparent),transparent 70%),radial-gradient(700px 380px at -10% 110%,rgba(56,120,255,.28),transparent 70%),linear-gradient(160deg,#0a1633,#0b1d44 55%,#050b1c)}
  .hero::after{content:"";position:absolute;inset:-20% -40%;z-index:1;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.07) 50%,transparent 58%);animation:sheen 9s ease-in-out infinite;pointer-events:none}
  @keyframes sheen{0%,100%{transform:translateX(-18%)}50%{transform:translateX(18%)}}
  .hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .hero::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,14,36,.55) 0%,rgba(5,11,28,.9) 100%);z-index:1}
  .hero .container{position:relative;z-index:2}
  .hero-inner{position:relative;z-index:2;margin:36px 0 56px;max-width:720px;padding:30px 26px;border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);box-shadow:0 30px 70px -30px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.35)}
  @media(min-width:860px){.hero-inner{padding:44px 44px;margin:64px 0 84px}}
  .hero-logo{width:72px;height:72px;border-radius:20px;object-fit:cover;background:linear-gradient(145deg,var(--accent),#0b1d44);display:flex;align-items:center;justify-content:center;font-size:1.9rem;font-weight:800;border:3px solid rgba(255,255,255,.85);box-shadow:0 12px 30px rgba(0,0,0,.35);margin-bottom:22px}
  .hero h1{font-size:clamp(2rem,6.4vw,3.4rem);font-weight:800}
  .hero-tag{font-size:clamp(1rem,2.6vw,1.2rem);opacity:.92;margin:14px 0 0;max-width:560px}
  .hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;text-decoration:none;font-weight:700;font-size:.95rem;padding:14px 22px;border-radius:14px;border:0;cursor:pointer;transition:transform .15s,box-shadow .15s}
  .btn:active{transform:scale(.97)}
  .btn-primary{background:var(--wa);color:#fff;box-shadow:0 12px 28px -10px var(--wa)}
  .btn-accent{background:var(--accent);color:#fff;box-shadow:0 12px 28px -10px var(--accent)}
  .btn-ghost{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(6px)}
  .btn-outline{background:var(--card);color:var(--ink);border:1px solid var(--border)}
  .hero-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
  .chip{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);padding:8px 13px;border-radius:999px;font-size:.82rem;font-weight:600;backdrop-filter:blur(6px)}
  .chip svg{width:15px;height:15px}

  /* Chiffres cles (verre) */
  .stats{position:relative;z-index:3;margin-top:-46px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  @media(min-width:760px){.stats{grid-template-columns:repeat(4,1fr)}}
  .stat{background:linear-gradient(145deg,#0f2150,#0a1633);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px 16px;text-align:center;box-shadow:0 20px 40px -22px rgba(5,11,28,.9),inset 0 1px 0 rgba(255,255,255,.22)}
  .stat b{display:block;font-size:clamp(1.5rem,5vw,2.1rem);font-weight:800;letter-spacing:-.02em}
  .stat span{font-size:.78rem;color:#b8c8ee;font-weight:600}
  .item-desc{margin:0;color:var(--muted);font-size:.88rem}
  .menu-main{flex:1}
  .menu-top{display:flex;align-items:baseline;gap:10px}
  .menu-desc{color:var(--muted);font-size:.84rem;margin-top:3px}
  .cform{display:grid;gap:10px;margin-top:16px}
  .cform input,.cform textarea{width:100%;font:inherit;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:13px 14px;outline:none}
  .cform input::placeholder,.cform textarea::placeholder{color:rgba(255,255,255,.6)}
  .cform input:focus,.cform textarea:focus{border-color:#fff;background:rgba(255,255,255,.16)}
  .footer-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
  .footer-actions button{background:var(--card);border:1px solid var(--border);color:var(--ink);font:inherit;font-weight:700;font-size:.82rem;padding:10px 16px;border-radius:999px;cursor:pointer}

  /* Sections */
  .section{padding:56px 0}
  .section-head{margin-bottom:28px}
  .eyebrow{display:inline-block;color:var(--accent);font-size:.74rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
  .section-head h2,.about-text h2{font-size:clamp(1.55rem,4.4vw,2.2rem);font-weight:800}

  .about{display:grid;gap:26px;align-items:center}
  .about-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius);box-shadow:var(--shadow)}
  .about-text p{color:var(--muted);margin:14px 0 0;font-size:1.02rem}
  .about-points{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:10px}
  .about-points li{display:flex;gap:10px;align-items:flex-start;font-weight:600;font-size:.92rem}
  .about-points svg{flex:0 0 auto;color:#fff;background:var(--accent);border-radius:50%;padding:3px;width:20px;height:20px;margin-top:2px}
  @media(min-width:860px){.about.has-img{grid-template-columns:1fr 1fr;gap:48px}}

  .items-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
  .item-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px;box-shadow:0 1px 2px rgba(15,23,42,.04);display:flex;flex-direction:column;gap:8px;transition:transform .2s,box-shadow .2s,border-color .2s}
  .item-card:hover{transform:translateY(-4px);box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--accent) 40%,var(--border))}
  .item-num{width:38px;height:38px;border-radius:12px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem}
  .item-card h3{font-size:1.08rem;font-weight:700;margin-top:6px}
  .item-price{color:var(--accent);font-weight:800;font-size:1.05rem}
  .item-btn{margin-top:auto;padding-top:10px;display:inline-flex;align-items:center;gap:7px;color:var(--accent);font-weight:700;font-size:.88rem;text-decoration:none}
  .item-btn:hover{gap:11px}
  .menu{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:10px 22px;box-shadow:var(--shadow);max-width:720px}
  .menu-row{display:flex;align-items:baseline;gap:10px;padding:14px 0;border-bottom:1px dashed var(--border)}
  .menu-row:last-child{border-bottom:0}
  .menu-name{font-weight:700}
  .menu-dots{flex:1;border-bottom:2px dotted var(--border);transform:translateY(-4px)}
  .menu-price{font-weight:800;color:var(--accent);white-space:nowrap}

  .gallery{display:grid;gap:12px;grid-template-columns:repeat(2,1fr)}
  @media(min-width:700px){.gallery{grid-template-columns:repeat(3,1fr)}}
  .g-item{padding:0;border:0;background:var(--card);border-radius:16px;overflow:hidden;cursor:zoom-in;aspect-ratio:1;position:relative}
  .g-item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}
  .g-item:hover img{transform:scale(1.07)}
  .g-item:first-child{grid-column:span 2;grid-row:span 2}

  .filters{display:flex;gap:8px;overflow-x:auto;margin-bottom:18px;scrollbar-width:none}
  .filters::-webkit-scrollbar{display:none}
  .filter-chip{border:1px solid var(--border);background:var(--card);color:var(--muted);border-radius:999px;padding:8px 16px;font-size:.82rem;font-weight:700;white-space:nowrap;cursor:pointer}
  .filter-chip.active{background:var(--accent);color:#fff;border-color:var(--accent)}
  .posts{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
  .post-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}
  .post-card img{width:100%;height:190px;object-fit:cover;display:block;cursor:zoom-in}
  .post-body{padding:20px}
  .post-category{display:inline-block;background:var(--accent-soft);color:var(--accent);font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:4px 10px;border-radius:999px;margin-bottom:10px}
  .post-body h3{font-size:1.1rem;font-weight:700}
  .post-date{font-size:.78rem;color:var(--muted);margin:6px 0 10px}
  .post-body p{margin:0;color:var(--muted);font-size:.93rem}

  .testis{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
  .testi{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;position:relative}
  .testi svg{color:var(--accent);opacity:.25}
  .testi p{margin:10px 0 18px;color:var(--ink)}
  .testi-who{display:flex;align-items:center;gap:12px;font-weight:700;font-size:.9rem}
  .testi-av{width:38px;height:38px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}

  .faq{max-width:760px}
  details{border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:10px;background:var(--card)}
  details[open]{border-color:color-mix(in srgb,var(--accent) 45%,var(--border))}
  summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:12px;align-items:center}
  summary::-webkit-details-marker{display:none}
  summary::after{content:"+";color:var(--accent);font-size:1.4rem;line-height:1;font-weight:500}
  details[open] summary::after{content:"–"}
  details p{margin:12px 0 0;color:var(--muted)}

  .contact-card{display:grid;gap:26px;background:radial-gradient(600px 300px at 100% 0,color-mix(in srgb,var(--accent) 35%,transparent),transparent 70%),linear-gradient(150deg,#0b1d44,#07112b);color:#fff;border-radius:26px;padding:30px 24px;box-shadow:0 30px 60px -28px rgba(5,11,28,.9),inset 0 1px 0 rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.14)}
  .contact-card h2{font-size:clamp(1.5rem,4.4vw,2.1rem)}
  .contact-card p{margin:10px 0 0;opacity:.9}
  .contact-list{display:grid;gap:12px;margin-top:6px}
  .contact-item{display:flex;gap:12px;align-items:center;text-decoration:none;font-weight:600;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);padding:13px 16px;border-radius:14px}
  .contact-item svg{flex:0 0 auto}
  .contact-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
  .socials{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
  .socials a{font-size:.82rem;font-weight:700;text-decoration:none;background:rgba(255,255,255,.16);padding:8px 14px;border-radius:999px}
  @media(min-width:860px){.contact-card{grid-template-columns:1.1fr 1fr;padding:44px 48px;align-items:center}}

  .footer{padding:34px 0 40px;text-align:center;color:var(--muted);font-size:.85rem}
  .footer a{color:var(--accent);font-weight:700;text-decoration:none}

  .fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:30;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
  .fab-wa{display:inline-flex;align-items:center;gap:9px;background:var(--wa);color:#fff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:999px;box-shadow:0 14px 30px -8px rgba(31,168,85,.7)}
  .fab-up{width:42px;height:42px;border-radius:50%;border:1px solid var(--border);background:var(--card);color:var(--ink);display:none;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--shadow)}
  .fab-up.show{display:flex}
  .fab-wa{display:none}.fab-wa.show{display:inline-flex}

  .lightbox{position:fixed;inset:0;z-index:50;background:rgba(8,10,16,.95);display:none;align-items:center;justify-content:center;padding:24px;cursor:zoom-out}
  .lightbox.open{display:flex}
  .lightbox img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .lightbox-close{position:absolute;top:16px;right:18px;background:rgba(255,255,255,.14);color:#fff;border:none;width:42px;height:42px;border-radius:50%;font-size:1.4rem;cursor:pointer;line-height:1}

  .js .reveal{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}
  .js .reveal.in{opacity:1;transform:none}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.js .reveal{opacity:1;transform:none;transition:none}}
</style>
</head>
<body class="t-${siteType}">
<div class="progress" id="site-progress"></div>
${announcement ? `<div class="announce" id="site-announce">${escapeHtml(announcement)}<button type="button" onclick="document.getElementById('site-announce').remove()" aria-label="Fermer">×</button></div>` : ''}
<header class="topbar">
  <div class="container topbar-row">
    <a class="brand" href="#top">
      ${site.logoUrl ? `<img class="brand-logo" src="${escapeAttr(site.logoUrl)}" alt="">` : `<span class="brand-logo">${escapeHtml(initial)}</span>`}
      <span class="brand-name">${escapeHtml(site.businessName || '')}</span>
      ${isPremium ? '<span class="pro-badge">PRO</span>' : ''}
    </a>
    ${navLinks.length ? `<nav class="nav" aria-label="Navigation">${navLinks.map(([id, label]) => `<a href="#${id}">${escapeHtml(label)}</a>`).join('')}</nav>` : ''}
  </div>
  ${navLinks.length ? `<nav class="navscroll" aria-label="Sections">${navLinks.map(([id, label]) => `<a href="#${id}">${escapeHtml(label)}</a>`).join('')}</nav>` : ''}
</header>

<main id="top">
  <section class="hero">
    ${site.coverImageUrl ? `<img class="hero-bg" src="${escapeAttr(site.coverImageUrl)}" alt="">` : ''}
    <div class="container">
      <div class="hero-inner">
        ${site.logoUrl ? `<img class="hero-logo" src="${escapeAttr(site.logoUrl)}" alt="${escapeAttr(site.businessName || '')}">` : `<div class="hero-logo">${escapeHtml(initial)}</div>`}
        <h1>${escapeHtml(site.businessName || '')}</h1>
        ${site.tagline ? `<p class="hero-tag">${escapeHtml(site.tagline)}</p>` : ''}
        <div class="hero-actions">
          <a class="btn btn-primary" href="${escapeAttr(mainCtaHref)}"${waLink ? ' target="_blank" rel="noopener"' : ''}>${waLink ? IC.wa : ''}${escapeHtml(TY.cta)}</a>
          ${services.length ? `<a class="btn btn-ghost" href="#site-sec-services">${escapeHtml(TY.itemsTitle)} ${IC.arrow}</a>` : ''}
        </div>
        ${(site.hours || site.address) ? `<div class="hero-chips">
          ${site.hours ? `<span class="chip">${IC.clock}${escapeHtml(site.hours)}</span>` : ''}
          ${site.address ? `<span class="chip">${IC.pin}${escapeHtml(site.address)}</span>` : ''}
        </div>` : ''}
      </div>
    </div>
  </section>

  <div class="container">
  ${stats.length ? `<div class="stats">${stats.map((x) => `<div class="stat reveal"><b data-count="${escapeAttr(x.value)}">${escapeHtml(x.value)}</b><span>${escapeHtml(x.label)}</span></div>`).join('')}</div>` : ''}
  ${mainSections}

  ${customSections.map((cs) => `
  <section class="section">
    <div class="section-head reveal"><h2>${escapeHtml(cs.title)}</h2></div>
    <div class="reveal" style="max-width:760px;color:var(--muted);font-size:1.02rem">${escapeHtml(cs.body).replace(/\n/g, '<br>')}</div>
  </section>`).join('')}

  ${blogPosts.length ? `
  <section class="section" id="site-sec-blog">
    <div class="section-head reveal"><span class="eyebrow">${blogPosts.length} publication${blogPosts.length > 1 ? 's' : ''}</span><h2>Actualités</h2></div>
    ${blogCategories.length ? `<div class="filters" id="site-blog-filters">
      <button type="button" class="filter-chip active" data-filter="all" onclick="filterSiteBlog('all',this)">Tout</button>
      ${blogCategories.map((c) => `<button type="button" class="filter-chip" data-filter="${escapeAttr(c)}" onclick="filterSiteBlog('${jsStr(c)}',this)">${escapeHtml(c)}</button>`).join('')}
    </div>` : ''}
    <div class="posts" id="site-blog-list">
    ${blogPosts.map((post) => `
    <article class="post-card reveal" data-category="${escapeAttr(post.category || '')}">
      ${post.imageUrl ? `<img src="${escapeAttr(post.imageUrl)}" alt="" loading="lazy" onclick="openSiteLightbox('${jsStr(post.imageUrl)}')">` : ''}
      <div class="post-body">
        ${post.category ? `<span class="post-category">${escapeHtml(post.category)}</span>` : ''}
        <h3>${escapeHtml(post.title)}</h3>
        <p class="post-date">${new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>${escapeHtml(post.body).replace(/\n/g, '<br>')}</p>
      </div>
    </article>`).join('')}
    </div>
  </section>` : ''}

  ${testimonials.length ? `
  <section class="section" id="site-sec-testimonials">
    <div class="section-head reveal"><span class="eyebrow">Ils nous font confiance</span><h2>Avis de clients</h2></div>
    <div class="testis">${testimonials.map((x) => `
      <figure class="testi reveal" style="margin:0">${IC.quote}
        <p>${escapeHtml(x.text)}</p>
        <figcaption class="testi-who"><span class="testi-av">${escapeHtml((x.name || '?').trim().charAt(0).toUpperCase())}</span>${escapeHtml(x.name)}</figcaption>
      </figure>`).join('')}</div>
  </section>` : ''}

  ${faq.length ? `
  <section class="section" id="site-sec-faq">
    <div class="section-head reveal"><span class="eyebrow">Besoin d'aide ?</span><h2>Questions fréquentes</h2></div>
    <div class="faq reveal">${faq.map((f) => `<details><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer).replace(/\n/g, '<br>')}</p></details>`).join('')}</div>
  </section>` : ''}

  ${hasContact ? `
  <section class="section" id="site-sec-contact">
    <div class="contact-card reveal">
      <div>
        <span class="eyebrow" style="color:#fff;opacity:.8">Contact</span>
        <h2>Parlons de votre projet</h2>
        <p>Laissez un message, nous vous répondons rapidement.</p>
        <form class="cform" onsubmit="return sendSiteMessage(event)">
          <input type="text" id="cf-name" placeholder="Votre nom" maxlength="60" required>
          <textarea id="cf-msg" rows="3" placeholder="Votre message" maxlength="500" required></textarea>
          <button class="btn btn-primary" type="submit">${waLink ? IC.wa : IC.mail} Envoyer le message</button>
        </form>
        ${SOCIAL_KEYS.some(([k]) => site.socialLinks && site.socialLinks[k]) ? `<div class="socials">
          ${SOCIAL_KEYS.filter(([k]) => site.socialLinks && site.socialLinks[k]).map(([k, label]) => `<a href="${escapeAttr(safeHttpUrl(site.socialLinks[k]))}" target="_blank" rel="noopener">${label}</a>`).join('')}
        </div>` : ''}
      </div>
      <div class="contact-list">
        ${site.address ? `<a class="contact-item" href="${escapeAttr(mapsLink)}" target="_blank" rel="noopener">${IC.pin}<span>${escapeHtml(site.address)}</span></a>` : ''}
        ${site.hours ? `<div class="contact-item">${IC.clock}<span>${escapeHtml(site.hours)}</span></div>` : ''}
        ${site.contactPhone ? `<a class="contact-item" href="tel:${escapeAttr(site.contactPhone)}">${IC.phone}<span>${escapeHtml(site.contactPhone)}</span></a>` : ''}
        ${site.contactEmail ? `<a class="contact-item" href="mailto:${escapeAttr(site.contactEmail)}">${IC.mail}<span>${escapeHtml(site.contactEmail)}</span></a>` : ''}
      </div>
    </div>
  </section>` : ''}
  </div>
</main>

<footer class="footer"><div class="container">
  <div class="footer-actions">
    <button type="button" onclick="shareSite()">Partager ce site</button>
    ${(site.contactPhone || site.contactEmail) ? `<button type="button" onclick="saveSiteContact()">Enregistrer le contact</button>` : ''}
  </div>
  <p>© ${new Date().getFullYear()} ${escapeHtml(site.businessName || '')}${(isPremium && site.hideBranding) ? '' : ` · Site créé avec <a href="${SITE_ORIGIN}/">Coeurnoh Universe</a>`}</p>
  ${(isPremium && site.hideBranding) ? '' : `<p><a href="${SITE_ORIGIN}/">Crée ton propre site →</a></p>`}
</div></footer>

<div class="fab">
  <button type="button" class="fab-up" id="site-up" onclick="window.scrollTo({top:0})" aria-label="Haut de page">${IC.up}</button>
  ${waLink ? `<a class="fab-wa" href="${escapeAttr(mainCtaHref)}" target="_blank" rel="noopener">${IC.wa} WhatsApp</a>` : ''}
</div>
<div class="lightbox" id="site-lightbox" onclick="closeSiteLightbox()">
  <button type="button" class="lightbox-close" onclick="event.stopPropagation();closeSiteLightbox()" aria-label="Fermer">×</button>
  <img id="site-lightbox-img" src="" alt="">
</div>
<script>
document.documentElement.classList.add('js');
function openSiteLightbox(src){var b=document.getElementById('site-lightbox');document.getElementById('site-lightbox-img').src=src;b.classList.add('open')}
function closeSiteLightbox(){document.getElementById('site-lightbox').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSiteLightbox()});
function filterSiteBlog(cat,btn){
  document.querySelectorAll('#site-blog-filters .filter-chip').forEach(function(c){c.classList.remove('active')});
  btn.classList.add('active');
  document.querySelectorAll('#site-blog-list .post-card').forEach(function(card){card.style.display=(cat==='all'||card.dataset.category===cat)?'':'none'});
}
(function(){
  var els=document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});}
  else{var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12});els.forEach(function(e){io.observe(e)});}
  var up=document.getElementById('site-up');var wa=document.querySelector('.fab-wa');var pr=document.getElementById('site-progress');
  function onScroll(){var y=window.scrollY;up.classList.toggle('show',y>600);if(wa)wa.classList.toggle('show',y>520);var h=document.documentElement.scrollHeight-window.innerHeight;pr.style.width=(h>0?Math.min(100,y/h*100):0)+'%'}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  document.querySelectorAll('[data-count]').forEach(function(el){
    var raw=el.getAttribute('data-count');var m=raw.match(/^(\\D*)(\\d{1,9})(\\D*)$/);if(!m)return;
    var num=parseInt(m[2],10);if(!isFinite(num)||num>1e9)return;
    var done=false;var run=function(){if(done)return;done=true;var t0=null;(function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1400);var e=1-Math.pow(1-k,3);el.textContent=m[1]+Math.round(num*e).toLocaleString('fr-FR')+m[3];if(k<1)requestAnimationFrame(f)})(performance.now())};
    if('IntersectionObserver' in window){var o=new IntersectionObserver(function(en){if(en[0].isIntersecting){run();o.disconnect()}});o.observe(el)}else run();
  });
})();
var SITE_WA=${JSON.stringify(waLink || '').replace(/</g, '\\u003c')};
var SITE_MAIL=${JSON.stringify(site.contactEmail || '').replace(/</g, '\\u003c')};
var SITE_NAME=${JSON.stringify(site.businessName || '').replace(/</g, '\\u003c')};
var SITE_TEL=${JSON.stringify(site.contactPhone || site.contactWhatsapp || '').replace(/</g, '\\u003c')};
function sendSiteMessage(e){e.preventDefault();var n=document.getElementById('cf-name').value.trim(),m=document.getElementById('cf-msg').value.trim();if(!n||!m)return false;
  var txt='Bonjour, je suis '+n+'. '+m;
  if(SITE_WA){window.open(SITE_WA+'?text='+encodeURIComponent(txt),'_blank')}
  else if(SITE_MAIL){location.href='mailto:'+SITE_MAIL+'?subject='+encodeURIComponent('Message de '+n)+'&body='+encodeURIComponent(m)}
  return false}
function shareSite(){var u=location.href;if(navigator.share){navigator.share({title:SITE_NAME,url:u}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(u)}}
function saveSiteContact(){var v='BEGIN:VCARD\\nVERSION:3.0\\nFN:'+SITE_NAME.replace(/[\\n;]/g,' ')+'\\nORG:'+SITE_NAME.replace(/[\\n;]/g,' ')+(SITE_TEL?'\\nTEL:'+SITE_TEL.replace(/[^0-9+]/g,''):'')+(SITE_MAIL?'\\nEMAIL:'+SITE_MAIL:'')+'\\nEND:VCARD';
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([v],{type:'text/vcard'}));a.download='contact.vcf';document.body.appendChild(a);a.click();a.remove()}
</script>
</body></html>`;
  return html;
}

async function renderSitePage(req, res, slug) {
  if (!/^[a-z0-9-]{3,30}$/.test(slug)) return notFoundPage(res);

  let site, ownerUid;
  try {
    const snap = await db.collection('mini_sites').where('slug', '==', slug).limit(1).get();
    if (snap.empty || snap.docs[0].data().status !== 'published') return notFoundPage(res);
    site = snap.docs[0].data();
    // Publication en ligne reservee au Pack Pro : sans Pack actif, le site reste prive.
    if (!siteIsPremiumActive(site)) return notFoundPage(res);
    ownerUid = snap.docs[0].id;
  } catch (e) {
    console.error('[render-site] Firestore:', e.message);
    return notFoundPage(res);
  }

  // Incremente le compteur de vues, sans jamais bloquer ni faire echouer
  // l'affichage de la page si cette ecriture secondaire rate.
  db.collection('mini_sites').doc(ownerUid).update({
    viewsCount: admin.firestore.FieldValue.increment(1)
  }).catch(() => {});

  const html = buildSiteHtml(site, slug, {});
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Rapide (mis en cache un court moment sur le reseau de Vercel) mais
  // jamais perimé longtemps : "stale-while-revalidate" sert une version en
  // cache instantanement pendant qu'une version fraiche se prepare derriere.
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}


// ---- Page web publique d'une ENTREPRISE (section "Entreprises" de l'application) ----
// Reservee aux entreprises Pro : /e/<uid>. Reutilise exactement le meme rendu que
// les sites, a partir de la fiche "businesses/{uid}" + avis clients reels + abonnes.
function businessIsProActive(b) {
  return !!(b && b.pro && b.proUntil && new Date(b.proUntil).getTime() > Date.now());
}

async function renderBusinessPage(req, res, id) {
  if (!/^[A-Za-z0-9_-]{10,60}$/.test(id)) return notFoundPage(res);
  let b, reviews = [], followers = 0;
  try {
    const doc = await db.collection('businesses').doc(id).get();
    if (!doc.exists) return notFoundPage(res);
    b = doc.data();
    if (b.status !== 'active' || !businessIsProActive(b)) return notFoundPage(res);
    const [rv, fl] = await Promise.all([
      db.collection('public_reviews').where('targetType', '==', 'business').where('targetId', '==', id).limit(60).get(),
      db.collection('follows').where('followedUid', '==', id).limit(1000).get()
    ]);
    reviews = rv.docs.map((d) => d.data()).filter((r) => r.comment || r.rating);
    followers = fl.size;
  } catch (e) {
    console.error('[render-site] business:', e.message);
    return notFoundPage(res);
  }
  db.collection('businesses').doc(id).update({ viewsCount: admin.firestore.FieldValue.increment(1) }).catch(() => {});

  const rated = reviews.filter((r) => r.rating);
  const avg = rated.length ? rated.reduce((a, r) => a + (r.rating || 0), 0) / rated.length : 0;
  const year = parseInt(b.foundedYear, 10);
  const years = (year > 1900 && year <= new Date().getFullYear()) ? new Date().getFullYear() - year : 0;
  const stats = [];
  if (followers > 0) stats.push({ value: String(followers), label: followers > 1 ? 'Abonnés' : 'Abonné' });
  if (rated.length) stats.push({ value: avg.toFixed(1) + '/5', label: `Note (${rated.length} avis)` });
  if (years > 0) stats.push({ value: years + ' ans', label: 'D’expérience' });
  if (b.teamSize) stats.push({ value: String(b.teamSize), label: 'Collaborateurs' });

  const customSections = [];
  const legal = [];
  if (year) legal.push(`Fondée en ${year}`);
  if (b.legalId) legal.push(`N° d'enregistrement : ${b.legalId}`);
  if (b.languages) legal.push(`Langues : ${b.languages}`);
  if (legal.length) customSections.push({ title: 'Informations sur l’entreprise', body: legal.join('\n') });
  if (Array.isArray(b.team) && b.team.length) customSections.push({ title: 'Notre équipe', body: b.team.filter((m) => m && m.name).map((m) => `${m.name}${m.role ? ' — ' + m.role : ''}`).join('\n') });
  if (Array.isArray(b.awards) && b.awards.length) customSections.push({ title: 'Distinctions et certifications', body: b.awards.filter(Boolean).join('\n') });

  const site = {
    slug: 'e-' + id.slice(0, 8),
    siteType: 'entreprise',
    template: 'classique',
    accentColor: /^#[0-9a-fA-F]{6}$/.test(String(b.brandColor || '')) ? b.brandColor : null,
    businessName: b.businessName,
    tagline: b.tagline || '',
    aboutText: b.description || '',
    announcement: b.announcement || '',
    logoUrl: b.logoUrl, coverImageUrl: b.coverImageUrl,
    services: Array.isArray(b.catalog) ? b.catalog : [],
    gallery: Array.isArray(b.gallery) ? b.gallery : [],
    contactWhatsapp: b.whatsapp, contactPhone: b.phone, contactEmail: b.email,
    address: b.address, hours: b.hours,
    socialLinks: { facebook: b.facebookUrl, tiktok: b.tiktokUrl, instagram: b.instagramUrl, youtube: b.youtubeUrl, linkedin: b.linkedinUrl, website: b.website },
    faq: Array.isArray(b.faq) ? b.faq : [],
    testimonials: reviews.filter((r) => r.comment).slice(0, 12).map((r) => ({ name: r.authorName || 'Client', text: r.comment })),
    customSections, stats,
    status: 'published'
  };
  const html = buildSiteHtml(site, site.slug, { forcePremium: true, pagePath: `/e/${encodeURIComponent(id)}`, ctaLabel: b.ctaLabel });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}

async function renderSitemap(req, res) {
  let urls = [];
  try {
    const snap = await db.collection('mini_sites').where('status', '==', 'published').get();
    try {
      const bs = await db.collection('businesses').where('status', '==', 'active').limit(500).get();
      bs.docs.filter((d) => businessIsProActive(d.data())).forEach((d) => urls.push({ loc: `${SITE_ORIGIN}/e/${encodeURIComponent(d.id)}`, lastmod: new Date().toISOString().slice(0, 10) }));
    } catch (e) { /* secondaire */ }
    urls = urls.concat(snap.docs.map((d) => d.data()).filter((s) => s.slug && siteIsPremiumActive(s)).map((s) => ({
      loc: `${SITE_ORIGIN}/s/${encodeURIComponent(s.slug)}`,
      lastmod: (s.updatedAt || s.createdAt || new Date().toISOString()).slice(0, 10)
    })));
  } catch (e) {
    console.error('[render-site] sitemap:', e.message);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  return res.status(200).send(xml);
}

// Apercu fidele (POST) : meme rendu que le site public, a partir des donnees
// du formulaire / du site (brouillon inclus), avec option "voir en Premium"
// pour montrer avant paiement ce que donne le Pack Pro. Aucune lecture ni
// ecriture en base, aucun compteur de vues, page noindex.
function renderPreview(req, res) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  const raw = b && b.site;
  if (!raw || typeof raw !== 'object' || JSON.stringify(raw).length > 400000) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(400).send('Bad request');
  }
  const site = Object.assign({}, raw, { status: 'published' });
  const slug = String(site.slug || 'apercu').toLowerCase();
  const html = buildSiteHtml(site, slug, { preview: true, forcePremium: !!b.premium });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(html);
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST') return renderPreview(req, res);
  if (req.query.sitemap === '1') return renderSitemap(req, res);
  if (req.query.biz) return renderBusinessPage(req, res, String(req.query.biz));
  const slug = String(req.query.slug || '').toLowerCase();
  return renderSitePage(req, res, slug);
};
