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

  const navLinks = [
    services.length ? ['site-sec-services', 'Services'] : null,
    gallery.length ? ['site-sec-gallery', 'Photos'] : null,
    blogPosts.length ? ['site-sec-blog', 'Actualités'] : null,
    testimonials.length ? ['site-sec-testimonials', 'Avis'] : null,
    faq.length ? ['site-sec-faq', 'Questions'] : null,
    (waLink || site.contactPhone || site.contactEmail) ? ['site-sec-contact', 'Contact'] : null
  ].filter(Boolean);

  // Categories reellement disponibles parmi les articles publies (une
  // categorie creee mais jamais utilisee sur un article n'apparait pas
  // comme filtre -- inutile de montrer un filtre vide).
  const blogCategories = [...new Set(blogPosts.map((p) => p.category).filter(Boolean))];

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
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
  :root{--accent:${accent};--wa:#25D366;--ink:#0f172a;--muted:#64748b;--bg:#f8fafc;--border:#e6e9ee;--card:#ffffff}
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  .wrap{max-width:720px;margin:0 auto;padding-bottom:${waLink ? '84px' : '40px'}}
  .header{position:sticky;top:0;z-index:6;background:rgba(255,255,255,.94);backdrop-filter:saturate(180%) blur(10px);border-bottom:1px solid var(--border)}
  .header-row{display:flex;align-items:center;gap:10px;padding:12px 18px}
  .header-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.82rem;font-weight:800;flex:0 0 auto}
  .header-name{font-weight:800;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
  .header-cta{flex:0 0 auto;background:var(--ink);color:#fff;text-decoration:none;font-size:.78rem;font-weight:700;padding:8px 14px;border-radius:8px;white-space:nowrap}
  .nav{display:flex;gap:18px;overflow-x:auto;padding:0 18px 12px;scrollbar-width:none}
  .nav::-webkit-scrollbar{display:none}
  .nav a{text-decoration:none;color:var(--muted);font-size:.82rem;font-weight:700;white-space:nowrap;padding-bottom:3px;border-bottom:2px solid transparent}
  .nav a:hover{color:var(--ink);border-bottom-color:var(--accent)}

  .hero{position:relative}
  .hero-media{width:100%;height:240px;object-fit:cover;display:block;background:linear-gradient(135deg,var(--accent),#0f172a)}
  .hero-media-fallback{width:100%;height:240px;background:linear-gradient(135deg,var(--accent),#0f172a)}
  .hero-card{background:var(--card);margin:-40px 18px 0;position:relative;border-radius:18px;padding:20px;box-shadow:0 12px 30px -14px rgba(15,23,42,.18);border:1px solid var(--border)}
  .hero-logo{width:64px;height:64px;border-radius:16px;object-fit:cover;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.6rem;font-weight:800;margin-top:-46px;border:4px solid var(--card);box-shadow:0 4px 12px rgba(15,23,42,.15)}
  .hero-card h1{font-size:1.5rem;margin:12px 0 2px;letter-spacing:-.3px}
  .hero-tagline{color:var(--muted);margin:0 0 10px;font-size:.95rem}
  .hero-meta{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px}
  .hero-meta span{font-size:.82rem;color:var(--muted);display:flex;align-items:center;gap:5px}
  .hero-actions{display:flex;gap:10px;flex-wrap:wrap}

  .btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700;font-size:.88rem;border:none;cursor:pointer}
  .btn-wa{background:var(--wa)}
  .btn-outline{background:#fff;color:var(--ink);border:1px solid var(--border)}

  .section{margin:40px 18px}
  .section-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px}
  .section-head h2{font-size:1.15rem;margin:0;letter-spacing:-.2px}
  .section-head span{font-size:.78rem;color:var(--muted);font-weight:600}

  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 1px 2px rgba(15,23,42,.03)}
  .about-card{white-space:pre-line;color:#334155}

  .grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .service-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px}
  .service-card strong{display:block;font-size:.92rem;margin-bottom:2px}
  .service-card .price{color:var(--accent);font-weight:800;font-size:.88rem}

  .gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid var(--border)}

  .filters{display:flex;gap:8px;overflow-x:auto;margin-bottom:16px;scrollbar-width:none}
  .filters::-webkit-scrollbar{display:none}
  .filter-chip{border:1px solid var(--border);background:#fff;color:var(--muted);border-radius:999px;padding:6px 14px;font-size:.78rem;font-weight:700;white-space:nowrap;cursor:pointer}
  .filter-chip.active{background:var(--ink);color:#fff;border-color:var(--ink)}

  .post-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px}
  .post-card img{width:100%;height:180px;object-fit:cover;display:block}
  .post-body{padding:18px}
  .post-category{display:inline-block;background:#eef2ff;color:var(--accent);font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:4px 10px;border-radius:999px;margin-bottom:8px}
  .post-body h3{margin:0 0 4px;font-size:1.05rem;letter-spacing:-.1px}
  .post-date{font-size:.78rem;color:var(--muted);margin:0 0 10px}
  .post-body p{margin:0;color:#334155;font-size:.92rem}

  .testimonial-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:10px}
  .testimonial-card .quote{font-style:italic;margin:0 0 10px;color:#334155}
  .testimonial-card strong{font-size:.85rem;color:var(--muted);font-weight:700}

  details{border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:8px;background:var(--card)}
  summary{font-weight:700;cursor:pointer;font-size:.92rem}
  summary::marker{color:var(--accent)}
  details p{margin:10px 0 0;color:#334155;font-size:.9rem}

  .contact-card{display:flex;flex-direction:column;gap:10px}
  .contact-row{display:flex;align-items:center;gap:10px;font-size:.88rem;color:#334155}

  .fixedbar{position:fixed;left:0;right:0;bottom:0;padding:10px 14px;background:#fff;border-top:1px solid var(--border);box-shadow:0 -4px 16px rgba(15,23,42,.06)}
  .fixedbar .btn{width:100%;justify-content:center;max-width:720px;margin:0 auto;display:flex}

  .footer{margin:40px 18px 0;padding:24px 18px;border-top:1px solid var(--border);text-align:center}
  .footer p{margin:0 0 8px;font-size:.82rem;color:var(--muted)}
  .footer a{color:var(--accent);font-weight:700;text-decoration:none;font-size:.82rem}
</style>
</head>
<body>
<div class="header">
  <div class="header-row">
    ${site.logoUrl ? `<img class="header-avatar" src="${escapeAttr(site.logoUrl)}" alt="">` : `<div class="header-avatar">${escapeHtml(initial)}</div>`}
    <span class="header-name">${escapeHtml(site.businessName || '')}</span>
    ${waLink ? `<a class="header-cta" href="${escapeAttr(waLink)}" target="_blank" rel="noopener">Contacter</a>` : (navLinks.some(n => n[0] === 'site-sec-contact') ? `<a class="header-cta" href="#site-sec-contact">Contacter</a>` : '')}
  </div>
  ${navLinks.length ? `<nav class="nav">${navLinks.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>` : ''}
</div>

<div class="wrap">
  <div class="hero">
    ${site.coverImageUrl ? `<img class="hero-media" src="${escapeAttr(site.coverImageUrl)}" alt="">` : `<div class="hero-media-fallback"></div>`}
    <div class="hero-card">
      ${site.logoUrl ? `<img class="hero-logo" src="${escapeAttr(site.logoUrl)}" alt="${escapeAttr(site.businessName || '')}">` : `<div class="hero-logo">${escapeHtml(initial)}</div>`}
      <h1>${escapeHtml(site.businessName || '')}${isPremium ? ' ✨' : ''}</h1>
      ${site.tagline ? `<p class="hero-tagline">${escapeHtml(site.tagline)}</p>` : ''}
      ${(site.hours || site.address) ? `<div class="hero-meta">
        ${site.hours ? `<span>🕒 ${escapeHtml(site.hours)}</span>` : ''}
        ${site.address ? `<span>📍 ${escapeHtml(site.address)}</span>` : ''}
      </div>` : ''}
      <div class="hero-actions">
        ${waLink ? `<a class="btn btn-wa" href="${escapeAttr(waLink)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        ${site.contactPhone ? `<a class="btn btn-outline" href="tel:${escapeAttr(site.contactPhone)}">Appeler</a>` : ''}
        ${site.contactEmail ? `<a class="btn btn-outline" href="mailto:${escapeAttr(site.contactEmail)}">Email</a>` : ''}
      </div>
    </div>
  </div>

  ${site.aboutText ? `<div class="section"><div class="card about-card">${escapeHtml(site.aboutText)}</div></div>` : ''}

  ${services.length ? `
  <div class="section" id="site-sec-services">
    <div class="section-head"><h2>Services</h2></div>
    <div class="grid-2">${services.map((sv) => `<div class="service-card"><strong>${escapeHtml(sv.name)}</strong>${sv.price ? `<span class="price">${escapeHtml(sv.price)}</span>` : ''}</div>`).join('')}</div>
  </div>` : ''}

  ${gallery.length ? `
  <div class="section" id="site-sec-gallery">
    <div class="section-head"><h2>Photos</h2></div>
    <div class="gallery">${gallery.map((g, i) => `<img src="${escapeAttr(g)}" alt="${escapeAttr(site.businessName || '')} ${i + 1}" loading="lazy">`).join('')}</div>
  </div>` : ''}

  ${customSections.map((cs) => `
  <div class="section">
    <div class="section-head"><h2>${escapeHtml(cs.title)}</h2></div>
    <div class="card about-card">${escapeHtml(cs.body)}</div>
  </div>`).join('')}

  ${blogPosts.length ? `
  <div class="section" id="site-sec-blog">
    <div class="section-head"><h2>Actualités</h2><span>${blogPosts.length} publication${blogPosts.length > 1 ? 's' : ''}</span></div>
    ${blogCategories.length ? `<div class="filters" id="site-blog-filters">
      <button type="button" class="filter-chip active" data-filter="all" onclick="filterSiteBlog('all',this)">Tout</button>
      ${blogCategories.map((c) => `<button type="button" class="filter-chip" data-filter="${escapeAttr(c)}" onclick="filterSiteBlog('${escapeAttr(c).replace(/'/g, "\\'")}',this)">${escapeHtml(c)}</button>`).join('')}
    </div>` : ''}
    <div id="site-blog-list">
    ${blogPosts.map((post) => `
    <article class="post-card" data-category="${escapeAttr(post.category || '')}">
      ${post.imageUrl ? `<img src="${escapeAttr(post.imageUrl)}" alt="" loading="lazy">` : ''}
      <div class="post-body">
        ${post.category ? `<span class="post-category">${escapeHtml(post.category)}</span>` : ''}
        <h3>${escapeHtml(post.title)}</h3>
        <p class="post-date">${new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>${escapeHtml(post.body).replace(/\n/g, '<br>')}</p>
      </div>
    </article>`).join('')}
    </div>
  </div>` : ''}

  ${testimonials.length ? `
  <div class="section" id="site-sec-testimonials">
    <div class="section-head"><h2>Avis</h2></div>
    ${testimonials.map((x) => `
    <div class="testimonial-card">
      <p class="quote">“${escapeHtml(x.text)}”</p>
      <strong>— ${escapeHtml(x.name)}</strong>
    </div>`).join('')}
  </div>` : ''}

  ${faq.length ? `
  <div class="section" id="site-sec-faq">
    <div class="section-head"><h2>Questions fréquentes</h2></div>
    ${faq.map((f) => `<details><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer).replace(/\n/g, '<br>')}</p></details>`).join('')}
  </div>` : ''}

  <div class="section" id="site-sec-contact">
    <div class="section-head"><h2>Contact</h2></div>
    <div class="card contact-card">
      ${site.address ? `<div class="contact-row">📍 ${escapeHtml(site.address)}</div>` : ''}
      ${site.hours ? `<div class="contact-row">🕒 ${escapeHtml(site.hours)}</div>` : ''}
      ${site.contactPhone ? `<div class="contact-row">📞 ${escapeHtml(site.contactPhone)}</div>` : ''}
      ${site.contactEmail ? `<div class="contact-row">✉️ ${escapeHtml(site.contactEmail)}</div>` : ''}
      <div class="hero-actions">
        ${waLink ? `<a class="btn btn-wa" href="${escapeAttr(waLink)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        ${site.contactPhone ? `<a class="btn btn-outline" href="tel:${escapeAttr(site.contactPhone)}">Appeler</a>` : ''}
        ${site.contactEmail ? `<a class="btn btn-outline" href="mailto:${escapeAttr(site.contactEmail)}">Email</a>` : ''}
        ${site.socialLinks && site.socialLinks.facebook ? `<a class="btn btn-outline" href="${escapeAttr(site.socialLinks.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ''}
        ${site.socialLinks && site.socialLinks.instagram ? `<a class="btn btn-outline" href="${escapeAttr(site.socialLinks.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
        ${site.socialLinks && site.socialLinks.tiktok ? `<a class="btn btn-outline" href="${escapeAttr(site.socialLinks.tiktok)}" target="_blank" rel="noopener">TikTok</a>` : ''}
      </div>
    </div>
  </div>

  ${(isPremium && site.hideBranding) ? '' : `
  <div class="footer">
    <p>Créé avec <strong style="color:var(--accent)">Coeurnoh Universe</strong></p>
    <a href="${SITE_ORIGIN}/">Crée ton propre site gratuitement →</a>
  </div>`}
</div>
${waLink ? `<div class="fixedbar"><a class="btn btn-wa" href="${escapeAttr(waLink)}" target="_blank" rel="noopener">Contacter sur WhatsApp</a></div>` : ''}
${blogCategories.length ? `<script>
function filterSiteBlog(cat, btn){
  document.querySelectorAll('#site-blog-filters .filter-chip').forEach(function(c){c.classList.remove('active')});
  btn.classList.add('active');
  document.querySelectorAll('#site-blog-list .post-card').forEach(function(card){
    card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
  });
}
</script>` : ''}
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
