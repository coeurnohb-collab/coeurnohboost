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
  chaleureux: { accent: '#e11d48' },
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

async function renderSitePage(req, res, slug) {
  if (!/^[a-z0-9-]{3,30}$/.test(slug)) return notFoundPage(res);

  let site, ownerUid;
  try {
    const snap = await db.collection('mini_sites').where('slug', '==', slug).limit(1).get();
    if (snap.empty || snap.docs[0].data().status !== 'published') return notFoundPage(res);
    site = snap.docs[0].data();
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

  const accent = (SITE_TEMPLATES[site.template] || SITE_TEMPLATES.classique).accent;
  const isPremium = siteIsPremiumActive(site);
  const pageUrl = `${SITE_ORIGIN}/s/${encodeURIComponent(slug)}`;
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
    sameAs: [site.socialLinks && site.socialLinks.facebook, site.socialLinks && site.socialLinks.instagram, site.socialLinks && site.socialLinks.tiktok].filter(Boolean)
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
  const TY = TYPES[siteType];
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
      return `<div class="menu-row"><div class="menu-name">${escapeHtml(sv.name)}</div><div class="menu-dots" aria-hidden="true"></div>${sv.price ? `<div class="menu-price">${escapeHtml(sv.price)}</div>` : ''}</div>`;
    }
    return `<article class="item-card reveal">
      <div class="item-num">${String(i + 1).padStart(2, '0')}</div>
      <h3>${escapeHtml(sv.name)}</h3>
      ${sv.price ? `<div class="item-price">${escapeHtml(sv.price)}</div>` : ''}
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
<meta name="robots" content="index, follow">
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
  .topbar{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--card) 90%,transparent);backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--border)}
  .topbar-row{display:flex;align-items:center;gap:14px;height:62px}
  .brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;font-size:1rem;min-width:0}
  .brand-logo{width:34px;height:34px;border-radius:10px;object-fit:cover;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex:0 0 auto}
  .brand-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pro-badge{background:var(--accent-soft);color:var(--accent);font-size:.66rem;font-weight:800;padding:3px 8px;border-radius:999px;letter-spacing:.04em}
  .nav{display:none;gap:4px;margin-left:auto}
  .nav a{text-decoration:none;color:var(--muted);font-weight:600;font-size:.9rem;padding:8px 12px;border-radius:10px}
  .nav a:hover{color:var(--ink);background:var(--accent-soft)}
  .top-cta{margin-left:auto;display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;font-size:.85rem;padding:10px 16px;border-radius:12px;box-shadow:0 8px 20px -8px var(--accent)}
  .navscroll{display:flex;gap:6px;overflow-x:auto;padding:0 20px 10px;scrollbar-width:none}
  .navscroll::-webkit-scrollbar{display:none}
  .navscroll a{flex:0 0 auto;text-decoration:none;color:var(--muted);font-weight:700;font-size:.82rem;padding:7px 14px;border-radius:999px;background:var(--accent-soft)}
  @media(max-width:859px){.top-cta{padding:9px 12px;font-size:.76rem;max-width:44vw;text-align:center;line-height:1.2}.pro-badge{display:none}}
  @media(min-width:860px){.nav{display:flex}.navscroll{display:none}.top-cta{margin-left:8px}}

  /* Bandeau d'accueil */
  .hero{position:relative;color:#fff;overflow:hidden;background:linear-gradient(135deg,var(--accent),#0b1220)}
  .hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .hero::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,22,.35) 0%,rgba(8,12,22,.78) 100%);z-index:1}
  .hero-inner{position:relative;z-index:2;padding:72px 0 64px;max-width:760px}
  .hero-logo{width:72px;height:72px;border-radius:20px;object-fit:cover;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.9rem;font-weight:800;border:3px solid rgba(255,255,255,.85);box-shadow:0 12px 30px rgba(0,0,0,.35);margin-bottom:22px}
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
  .chip{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);padding:8px 13px;border-radius:999px;font-size:.82rem;font-weight:600;backdrop-filter:blur(6px)}
  .chip svg{width:15px;height:15px}

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

  .contact-card{display:grid;gap:26px;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 55%,#0b1220));color:#fff;border-radius:26px;padding:30px 24px;box-shadow:var(--shadow)}
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
<header class="topbar">
  <div class="container topbar-row">
    <a class="brand" href="#top">
      ${site.logoUrl ? `<img class="brand-logo" src="${escapeAttr(site.logoUrl)}" alt="">` : `<span class="brand-logo">${escapeHtml(initial)}</span>`}
      <span class="brand-name">${escapeHtml(site.businessName || '')}</span>
      ${isPremium ? '<span class="pro-badge">PRO</span>' : ''}
    </a>
    ${navLinks.length ? `<nav class="nav" aria-label="Navigation">${navLinks.map(([id, label]) => `<a href="#${id}">${escapeHtml(label)}</a>`).join('')}</nav>` : ''}
    <a class="top-cta" href="${escapeAttr(mainCtaHref)}"${waLink ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(TY.cta)}</a>
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
        <p>Écrivez-nous, nous répondons rapidement.</p>
        <div class="contact-actions">
          ${waLink ? `<a class="btn btn-primary" href="${escapeAttr(mainCtaHref)}" target="_blank" rel="noopener">${IC.wa} WhatsApp</a>` : ''}
          ${site.contactPhone ? `<a class="btn btn-ghost" href="tel:${escapeAttr(site.contactPhone)}">${IC.phone} Appeler</a>` : ''}
          ${site.contactEmail ? `<a class="btn btn-ghost" href="mailto:${escapeAttr(site.contactEmail)}">${IC.mail} Email</a>` : ''}
        </div>
        ${(site.socialLinks && (site.socialLinks.facebook || site.socialLinks.instagram || site.socialLinks.tiktok)) ? `<div class="socials">
          ${site.socialLinks.facebook ? `<a href="${escapeAttr(safeHttpUrl(site.socialLinks.facebook))}" target="_blank" rel="noopener">Facebook</a>` : ''}
          ${site.socialLinks.instagram ? `<a href="${escapeAttr(safeHttpUrl(site.socialLinks.instagram))}" target="_blank" rel="noopener">Instagram</a>` : ''}
          ${site.socialLinks.tiktok ? `<a href="${escapeAttr(safeHttpUrl(site.socialLinks.tiktok))}" target="_blank" rel="noopener">TikTok</a>` : ''}
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
  var up=document.getElementById('site-up');
  window.addEventListener('scroll',function(){up.classList.toggle('show',window.scrollY>600)},{passive:true});
})();
</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Rapide (mis en cache un court moment sur le reseau de Vercel) mais
  // jamais perimé longtemps : "stale-while-revalidate" sert une version en
  // cache instantanement pendant qu'une version fraiche se prepare derriere.
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}

async function renderSitemap(req, res) {
  let urls = [];
  try {
    const snap = await db.collection('mini_sites').where('status', '==', 'published').get();
    urls = snap.docs.map((d) => d.data()).filter((s) => s.slug).map((s) => ({
      loc: `${SITE_ORIGIN}/s/${encodeURIComponent(s.slug)}`,
      lastmod: (s.updatedAt || s.createdAt || new Date().toISOString()).slice(0, 10)
    }));
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

module.exports = async function handler(req, res) {
  if (req.query.sitemap === '1') return renderSitemap(req, res);
  const slug = String(req.query.slug || '').toLowerCase();
  return renderSitePage(req, res, slug);
};
