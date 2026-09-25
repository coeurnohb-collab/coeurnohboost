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

  const navPills = [
    services.length ? ['site-sec-services', 'Services'] : null,
    gallery.length ? ['site-sec-gallery', 'Photos'] : null,
    blogPosts.length ? ['site-sec-blog', 'Actualités'] : null,
    testimonials.length ? ['site-sec-testimonials', 'Avis'] : null,
    faq.length ? ['site-sec-faq', 'Questions'] : null,
    (waLink || site.contactPhone || site.contactEmail) ? ['site-sec-contact', 'Contact'] : null
  ].filter(Boolean);

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
  :root{--accent:${accent};--wa:#25D366;--wa-dark:#1da851}
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3ede1;color:#1c1a17;line-height:1.5}
  .wrap{max-width:640px;margin:0 auto;padding-bottom:${waLink ? '84px' : '32px'}}
  .topbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(255,255,255,.96);backdrop-filter:saturate(180%) blur(8px);border-bottom:1px solid #ece5d6}
  .topbar-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;flex:0 0 auto}
  .topbar-name{font-weight:800;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cover{width:100%;height:190px;object-fit:cover;background:linear-gradient(135deg,var(--accent),#000)}
  .header{padding:0 18px;margin-top:-42px}
  .avatar{width:88px;height:88px;border-radius:50%;object-fit:cover;border:4px solid #f3ede1;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-size:2.1rem;font-weight:800;box-shadow:0 2px 10px rgba(0,0,0,.18)}
  h1{font-size:1.45rem;margin:12px 0 2px;letter-spacing:-.2px}
  .tagline{color:#4a4640;margin:0 0 6px}
  .meta{font-size:.85rem;color:#6b675f;margin:2px 0;display:flex;align-items:center;gap:6px}
  .pills{position:sticky;top:47px;z-index:4;display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;padding:12px 18px;margin-top:8px;background:#f3ede1cc;backdrop-filter:blur(4px)}
  .pill{border:1px solid #ddd6c8;background:#fff;color:#1c1a17;border-radius:999px;padding:7px 14px;font-size:.8rem;font-weight:700;text-decoration:none;white-space:nowrap}
  .card{background:#fff;border:1px solid #ece5d6;border-radius:16px;padding:16px;margin:14px 18px;box-shadow:0 1px 3px rgba(28,26,23,.04)}
  .section{margin:22px 18px}
  .section h2{color:var(--accent);font-size:1.05rem;margin-bottom:10px;font-weight:800}
  .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}
  .btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:700;font-size:.9rem;border:none}
  .btn-wa{background:var(--wa)}
  .btn-outline{background:#fff;color:#1c1a17;border:1px solid #ddd6c8}
  .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
  details{border:1px solid #ece5d6;border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#fff}
  summary{font-weight:700;cursor:pointer}
  .quote{font-style:italic;margin:0 0 6px}
  .fixedbar{position:fixed;left:0;right:0;bottom:0;padding:10px 14px;background:#fff;border-top:1px solid #ece5d6;box-shadow:0 -2px 10px rgba(0,0,0,.05)}
  .fixedbar .btn{width:100%;justify-content:center;max-width:640px;margin:0 auto;display:flex}
  .footer{margin:24px 18px 0;padding:18px;border-radius:14px;background:#fff;border:1px solid #ece5d6;text-align:center}
  .footer a{color:var(--accent);font-weight:700;text-decoration:none}
</style>
</head>
<body>
<div class="topbar">
  ${site.logoUrl ? `<img class="topbar-avatar" src="${escapeAttr(site.logoUrl)}" alt="">` : `<div class="topbar-avatar">${escapeHtml(initial)}</div>`}
  <span class="topbar-name">${escapeHtml(site.businessName || '')}${isPremium ? ' ✨' : ''}</span>
</div>
<div class="wrap">
  ${site.coverImageUrl ? `<img class="cover" src="${escapeAttr(site.coverImageUrl)}" alt="">` : `<div class="cover"></div>`}
  <div class="header">
    ${site.logoUrl ? `<img class="avatar" src="${escapeAttr(site.logoUrl)}" alt="${escapeAttr(site.businessName || '')}">` : `<div class="avatar">${escapeHtml(initial)}</div>`}
    <h1>${escapeHtml(site.businessName || '')}${isPremium ? ' ✨' : ''}</h1>
    ${site.tagline ? `<p class="tagline">${escapeHtml(site.tagline)}</p>` : ''}
    ${site.hours ? `<p class="meta">🕒 ${escapeHtml(site.hours)}</p>` : ''}
    ${site.address ? `<p class="meta">📍 ${escapeHtml(site.address)}</p>` : ''}
  </div>

  ${navPills.length ? `<nav class="pills">${navPills.map(([id, label]) => `<a class="pill" href="#${id}">${label}</a>`).join('')}</nav>` : ''}

  ${site.aboutText ? `<div class="card">${escapeHtml(site.aboutText).replace(/\n/g, '<br>')}</div>` : ''}

  ${services.length ? `
  <div class="section" id="site-sec-services">
    <h2>Services</h2>
    ${services.map((sv) => `<div class="card" style="margin-left:0;margin-right:0"><strong>${escapeHtml(sv.name)}</strong>${sv.price ? ` — ${escapeHtml(sv.price)}` : ''}</div>`).join('')}
  </div>` : ''}

  ${gallery.length ? `
  <div class="section" id="site-sec-gallery">
    <h2>Photos</h2>
    <div class="gallery">${gallery.map((g, i) => `<img src="${escapeAttr(g)}" alt="${escapeAttr(site.businessName || '')} ${i + 1}" loading="lazy">`).join('')}</div>
  </div>` : ''}

  ${customSections.map((cs) => `
  <div class="section">
    <h2>${escapeHtml(cs.title)}</h2>
    <div class="card" style="margin-left:0;margin-right:0">${escapeHtml(cs.body).replace(/\n/g, '<br>')}</div>
  </div>`).join('')}

  ${blogPosts.length ? `
  <div class="section" id="site-sec-blog">
    <h2>Actualités</h2>
    ${blogPosts.map((post) => `
    <div class="card" style="margin-left:0;margin-right:0">
      <strong>${escapeHtml(post.title)}</strong>
      <p class="meta">${new Date(post.date).toLocaleDateString('fr-FR')}</p>
      <p>${escapeHtml(post.body).replace(/\n/g, '<br>')}</p>
    </div>`).join('')}
  </div>` : ''}

  ${testimonials.length ? `
  <div class="section" id="site-sec-testimonials">
    <h2>Avis</h2>
    ${testimonials.map((x) => `
    <div class="card" style="margin-left:0;margin-right:0">
      <p class="quote">“${escapeHtml(x.text)}”</p>
      <strong style="font-size:.85rem;color:#6b675f">— ${escapeHtml(x.name)}</strong>
    </div>`).join('')}
  </div>` : ''}

  ${faq.length ? `
  <div class="section" id="site-sec-faq">
    <h2>Questions fréquentes</h2>
    ${faq.map((f) => `<details><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer).replace(/\n/g, '<br>')}</p></details>`).join('')}
  </div>` : ''}

  <div class="section" id="site-sec-contact">
    <div class="actions">
      ${waLink ? `<a class="btn btn-wa" href="${escapeAttr(waLink)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      ${site.contactPhone ? `<a class="btn btn-outline" href="tel:${escapeAttr(site.contactPhone)}">Appeler</a>` : ''}
      ${site.contactEmail ? `<a class="btn btn-outline" href="mailto:${escapeAttr(site.contactEmail)}">Email</a>` : ''}
      ${site.socialLinks && site.socialLinks.facebook ? `<a class="btn btn-outline" href="${escapeAttr(site.socialLinks.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ''}
      ${site.socialLinks && site.socialLinks.instagram ? `<a class="btn btn-outline" href="${escapeAttr(site.socialLinks.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
      ${site.socialLinks && site.socialLinks.tiktok ? `<a class="btn btn-outline" href="${escapeAttr(site.socialLinks.tiktok)}" target="_blank" rel="noopener">TikTok</a>` : ''}
    </div>
  </div>

  ${(isPremium && site.hideBranding) ? '' : `
  <div class="footer">
    <p style="margin:0 0 10px;font-weight:700">Créé avec <span style="color:var(--accent)">Coeurnoh Universe</span></p>
    <a href="${SITE_ORIGIN}/">Crée ton propre site gratuitement →</a>
  </div>`}
</div>
${waLink ? `<div class="fixedbar"><a class="btn btn-wa" href="${escapeAttr(waLink)}" target="_blank" rel="noopener">Contacter sur WhatsApp</a></div>` : ''}
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
