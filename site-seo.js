// api/_lib/site-seo.js
// Référencement des sites publiés : adresses lisibles des produits / services / articles, données structurées (schema.org),
// plan du site avec images, codes de vérification (Google, Bing…), prévenir les moteurs (IndexNow), note de visibilité.
// Module partagé (pas une fonction Vercel). Aucune lecture en base ici : tout reçoit les données en paramètre.

const shopLib = require('./site-shop');
const { parsePrice } = require('./site-extras');

// Clé IndexNow (Bing, Yandex, Seznam, Naver…) : le fichier <clé>.txt à la racine du site contient cette même clé.
const INDEXNOW_KEY = '7c2e9a41d05b4f68a3e17b5c90d2f6e8';

const SCHEMA_TYPE = {
  entreprise: 'ProfessionalService', boutique: 'Store', restaurant: 'Restaurant', portfolio: 'ProfessionalService', smm: 'ProfessionalService',
  musique: 'EntertainmentBusiness', education: 'EducationalOrganization', sante: 'MedicalClinic', immobilier: 'RealEstateAgent',
  evenement: 'LocalBusiness', association: 'NGO', beaute: 'BeautySalon', media: 'NewsMediaOrganization', agence: 'ProfessionalService',
  hotel: 'Hotel', voyage: 'TravelAgency', auto: 'AutoRepair', sport: 'SportsActivityLocation', juridique: 'LegalService', tech: 'Organization'
};
const DAY_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function slugify(s, fallback) {
  let t = String(s == null ? '' : s).toLowerCase();
  try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ancien moteur */ }
  t = t.replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
  return t || fallback || 'page';
}
// Une adresse unique par élément : deux produits au même nom → « nom » et « nom-2 ».
function uniqueSlugs(names, fallback) {
  const seen = {};
  return names.map((n) => {
    const base = slugify(n, fallback);
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] === 1 ? base : base + '-' + seen[base];
  });
}
// Même liste que la page publique (articles sans titre ou sans texte ignorés, les plus récents d'abord).
function publicPosts(site) {
  return (Array.isArray(site && site.blogPosts) ? site.blogPosts : []).filter((x) => x && x.title && x.body).slice().reverse();
}
function itemSlugs(site) { return uniqueSlugs(shopLib.catalog(site).map((s) => s.name), 'produit'); }
function postSlugs(site) { return uniqueSlugs(publicPosts(site).map((p) => p.title), 'article'); }
// Chemin des fiches : « produit » pour une boutique, « service » pour les autres sites.
function itemPath(site) { return site && site.siteType === 'boutique' ? 'produit' : 'service'; }

function isoOf(cur) { return shopLib.ISO[cur] || ''; }
function httpsOnly(u) { return /^https:\/\//i.test(String(u || '')) ? String(u) : ''; }
function cut(s, n) { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; }

// ---- Données structurées ----
function offerOf(url, price, seller) {
  const pp = parsePrice(price);
  if (!pp) return undefined;
  const o = { '@type': 'Offer', url, price: String(pp.amount), availability: 'https://schema.org/InStock', seller: { '@type': 'Organization', name: seller } };
  const iso = isoOf(pp.cur); if (iso) o.priceCurrency = iso;
  return o;
}
function breadcrumb(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] })) };
}
function stripUndef(o) { Object.keys(o).forEach((k) => { if (o[k] === undefined || o[k] === '') delete o[k]; }); return o; }

// Page d'accueil du site : le commerce, le site web et la liste des produits.
function siteGraph(o) {
  const site = o.site, url = o.pageUrl;
  const sameAs = (o.sameAs || []).filter(Boolean);
  const hours = o.hours && o.hours.on ? o.hours.week.map((w, i) => (w && !w.x) ? { '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_EN[i], opens: w.o, closes: w.c } : null).filter(Boolean) : [];
  const org = stripUndef({
    '@type': SCHEMA_TYPE[site.siteType] || 'LocalBusiness', '@id': url + '#org', name: site.businessName || undefined, url,
    description: cut(site.seoDescription || site.tagline || site.aboutText, 300) || undefined,
    image: o.image || undefined, logo: o.logo || undefined, telephone: site.contactPhone || site.contactWhatsapp || undefined, email: site.contactEmail || undefined,
    address: site.address ? { '@type': 'PostalAddress', streetAddress: site.address } : undefined,
    openingHoursSpecification: hours.length ? hours : undefined, sameAs: sameAs.length ? sameAs : undefined,
    contactPoint: (site.contactPhone || site.contactWhatsapp || site.contactEmail) ? stripUndef({ '@type': 'ContactPoint', contactType: 'customer service', telephone: site.contactPhone || site.contactWhatsapp || undefined, email: site.contactEmail || undefined, availableLanguage: 'French' }) : undefined
  });
  const web = { '@type': 'WebSite', '@id': url + '#website', url, name: site.businessName || '', inLanguage: 'fr', publisher: { '@id': url + '#org' } };
  const graph = [org, web];
  if (o.items && o.items.length) {
    graph.push({ '@type': 'ItemList', name: o.itemsTitle || 'Catalogue', itemListElement: o.items.slice(0, 50).map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: it.url, name: it.name })) });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

// Fiche produit (boutique) ou service : Product / Service + fil d'Ariane.
function itemGraph(o) {
  const site = o.site, it = o.item, url = o.pageUrl, name = site.businessName || '';
  const offer = offerOf(url, it.price, name);
  const node = stripUndef(o.isProduct
    ? { '@type': 'Product', '@id': url + '#item', name: it.name, description: cut(it.desc, 300) || undefined, image: it.image ? [it.image] : undefined, category: it.category || undefined, brand: { '@type': 'Brand', name }, offers: offer }
    : { '@type': 'Service', '@id': url + '#item', name: it.name, description: cut(it.desc, 300) || undefined, image: it.image ? [it.image] : undefined, provider: { '@type': 'Organization', name, url: o.siteUrl }, offers: offer });
  return { '@context': 'https://schema.org', '@graph': [node, breadcrumb([[name, o.siteUrl], [o.isProduct ? 'Produits' : 'Services', o.siteUrl + '#site-sec-services'], [it.name, url]])] };
}

// Article du blog.
function postGraph(o) {
  const site = o.site, p = o.post, url = o.pageUrl, name = site.businessName || '';
  const node = stripUndef({
    '@type': 'BlogPosting', '@id': url + '#post', headline: cut(p.title, 110), description: cut(p.body, 200), image: p.imageUrl ? [p.imageUrl] : undefined,
    datePublished: p.date || undefined, dateModified: p.date || undefined, mainEntityOfPage: url, inLanguage: 'fr',
    author: { '@type': 'Organization', name }, publisher: stripUndef({ '@type': 'Organization', name, logo: o.logo ? { '@type': 'ImageObject', url: o.logo } : undefined })
  });
  return { '@context': 'https://schema.org', '@graph': [node, breadcrumb([[name, o.siteUrl], ['Actualités', o.siteUrl + '#site-sec-blog'], [p.title, url]])] };
}

// ---- Codes de vérification (Search Console, Bing Webmaster, Yandex, Meta) ----
const VERIFY = { google: 'google-site-verification', bing: 'msvalidate.01', yandex: 'yandex-verification', facebook: 'facebook-domain-verification' };
function cleanCode(v) {
  let t = String(v == null ? '' : v).trim();
  const m = /content\s*=\s*["']([^"']+)["']/i.exec(t); // le propriétaire peut coller toute la balise : on garde seulement le code
  if (m) t = m[1].trim();
  return /^[A-Za-z0-9_\-:.=]{8,120}$/.test(t) ? t : '';
}
function normalizeSeo(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  Object.keys(VERIFY).forEach((k) => { out[k] = cleanCode(r[k]); });
  return out;
}
function verifyTags(seo, esc) {
  const e = esc || ((x) => String(x).replace(/"/g, '&quot;'));
  const n = normalizeSeo(seo);
  return Object.keys(VERIFY).filter((k) => n[k]).map((k) => `<meta name="${VERIFY[k]}" content="${e(n[k])}">`).join('\n');
}

// ---- Plan du site ----
// Toutes les adresses publiques d'un site : accueil, fiches, articles (avec photos pour Google Images).
function siteUrls(site, origin, slug, prefix) {
  // prefix : par défaut « /s/<adresse> » ; vide pour un nom de domaine personnalisé (le site est à la racine).
  const base = prefix === undefined ? `${origin}/s/${encodeURIComponent(slug)}` : `${origin}${prefix}`;
  const last = String(site.updatedAt || site.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  const imgs = [site.coverImageUrl, site.logoUrl].filter((u) => httpsOnly(u)).slice(0, 2).map((u) => ({ loc: u, title: site.businessName || '' }));
  const out = [{ loc: base, lastmod: last, priority: '0.9', images: imgs }];
  const items = shopLib.catalog(site), is = itemSlugs(site), path = itemPath(site);
  items.slice(0, 200).forEach((it, i) => out.push({ loc: `${base}/${path}/${is[i]}`, lastmod: last, priority: '0.7', images: httpsOnly(it.image) ? [{ loc: it.image, title: it.name }] : [] }));
  const posts = publicPosts(site), ps = postSlugs(site);
  posts.slice(0, 100).forEach((p, i) => out.push({ loc: `${base}/article/${ps[i]}`, lastmod: String(p.date || last).slice(0, 10), priority: '0.6', images: httpsOnly(p.imageUrl) ? [{ loc: p.imageUrl, title: p.title }] : [] }));
  return out;
}
function xmlEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function sitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `  <url><loc>${xmlEsc(u.loc)}</loc><lastmod>${xmlEsc(u.lastmod)}</lastmod>${u.changefreq === false ? '' : `<changefreq>${u.changefreq || 'weekly'}</changefreq>`}${u.priority ? `<priority>${u.priority}</priority>` : ''}${(u.images || []).slice(0, 5).map((im) => `<image:image><image:loc>${xmlEsc(im.loc)}</image:loc>${im.title ? `<image:title>${xmlEsc(String(im.title).slice(0, 100))}</image:title>` : ''}</image:image>`).join('')}</url>`).join('\n')}
</urlset>`;
}

// ---- Prévenir les moteurs de recherche (IndexNow : Bing, Yandex, Seznam, Naver). Google lit le plan du site. ----
async function pingIndexNow(urls, opts) {
  const o = opts || {};
  const list = (urls || []).filter((u) => /^https:\/\//i.test(u)).slice(0, 100);
  if (!list.length) return { ok: false, sent: 0, status: 0 };
  const host = new URL(list[0]).host;
  const f = o.fetch || (typeof fetch === 'function' ? fetch : null);
  if (!f) return { ok: false, sent: 0, status: 0 };
  try {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), o.timeoutMs || 3500) : null;
    const r = await f('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`, urlList: list })
    });
    if (timer) clearTimeout(timer);
    return { ok: r.status === 200 || r.status === 202, sent: list.length, status: r.status };
  } catch (e) {
    return { ok: false, sent: 0, status: 0 };
  }
}

// ---- Note de visibilité : ce qui aide vraiment un site à être trouvé ----
function seoCheck(site) {
  const s = site || {};
  const items = shopLib.catalog(s), posts = publicPosts(s);
  const len = (v) => String(v || '').trim().length;
  const checks = [
    ['title', len(s.seoTitle) >= 15 && len(s.seoTitle) <= 70, 10],
    ['desc', len(s.seoDescription) >= 70 && len(s.seoDescription) <= 160, 10],
    ['logo', !!httpsOnly(s.logoUrl), 8],
    ['cover', !!httpsOnly(s.coverImageUrl), 8],
    ['tagline', len(s.tagline) >= 10, 6],
    ['about', len(s.aboutText) >= 120, 12],
    ['items', items.filter((x) => x.price).length >= 3, 10],
    ['itemPhotos', items.filter((x) => httpsOnly(x.image)).length >= 3, 8],
    ['contact', !!(s.contactWhatsapp || s.contactPhone || s.contactEmail), 6],
    ['address', len(s.address) >= 8, 6],
    ['posts', posts.length >= 1, 8],
    ['faq', (Array.isArray(s.faq) ? s.faq : []).filter((f) => f && f.question && f.answer).length >= 2, 4],
    ['verify', !!(normalizeSeo(s.seo).google || normalizeSeo(s.seo).bing), 4]
  ];
  const score = checks.reduce((a, c) => a + (c[1] ? c[2] : 0), 0);
  return { score, checks: checks.map((c) => ({ k: c[0], ok: c[1], pts: c[2] })) };
}

module.exports = { INDEXNOW_KEY, SCHEMA_TYPE, slugify, uniqueSlugs, publicPosts, itemSlugs, postSlugs, itemPath, siteGraph, itemGraph, postGraph, breadcrumb, normalizeSeo, cleanCode, verifyTags, siteUrls, sitemapXml, pingIndexNow, seoCheck, cut };
