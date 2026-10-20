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
const { initFirebaseAdmin, verifyCaller, enforceRateLimit, cleanText, getBody, getClientIp } = require('./_lib/security');
const { sendPushToUser } = require('./_lib/push');
const { normalizeExtras, parsePrice, openStatus } = require('./_lib/site-extras');
const { recordHit } = require('./_lib/site-stats');
const { createSitePanel } = require('./_lib/site-panel');
const { createManagedPanel } = require('./_lib/managed-panel');
const resellerLib = require('./_lib/reseller');
const { panelEnabled, panelHtml, panelCss, panelJs } = require('./_lib/site-panel-ui');

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

initFirebaseAdmin();
const db = admin.firestore();

const SITE_ORIGIN = 'https://coeurnohuniverse.com';
// Modeles de sites. Chaque modele = palette + disposition (layout) + style du bandeau d'accueil.
//   layout : glass (carte en verre, par defaut) | split (texte a gauche, photo a droite) | center (tout centre)
//            | banner (grande photo pleine largeur, texte en bas) | minimal (sobre, typographique) | magazine (editorial, serif)
//   hero   : 'light' = bandeau clair ; sinon bandeau sombre. dark = site entier en mode sombre.
const SITE_TEMPLATES = {
  classique: { accent: '#2563eb', layout: 'glass' },
  sombre: { accent: '#111827', layout: 'glass' },
  chaleureux: { accent: '#d97706', layout: 'glass' },
  doux: { accent: '#db2777', layout: 'glass' },
  nature: { accent: '#15803d', layout: 'glass' },
  ardoise: { accent: '#334155', layout: 'split', hero: 'light', hbg: '#e9eef5' },
  ocean: { accent: '#0369a1', layout: 'banner', h1: '#04263d', h2: '#073a5c' },
  minimal: { accent: '#111827', layout: 'minimal', hero: 'light', hbg: '#ffffff' },
  savane: { accent: '#a16207', layout: 'center', bg: '#fbf6ec', h1: '#2b1d07', h2: '#4a3410' },
  royal: { accent: '#c9a227', layout: 'split', dark: true, h1: '#0a1230', h2: '#111d52' },
  corail: { accent: '#e8590c', layout: 'center', bg: '#fff7f1', h1: '#3a1403', h2: '#5c2307' },
  emeraude: { accent: '#047857', layout: 'banner', h1: '#052e22', h2: '#064e3b' },
  magazine: { accent: '#be123c', layout: 'magazine', hero: 'light', hbg: '#f5efe6', bg: '#fbf8f3' },
  violet: { accent: '#6d28d9', layout: 'split', hero: 'light', hbg: '#efeafb' },
  sable: { accent: '#b45309', layout: 'center', hero: 'light', hbg: '#f3e9d8', bg: '#faf5ec' },
  nuit: { accent: '#22d3ee', layout: 'banner', dark: true, h1: '#060b16', h2: '#0b1426' },
  congo: { accent: '#007fff', layout: 'minimal', hero: 'light', hbg: '#fff9db' }
};
// Feuilles de style propres a chaque disposition (ajoutees apres la feuille principale).
const LAYOUT_CSS = {
  glass: '',
  split: `
  .lay-split .hero::before,.lay-split .hero::after{display:none}
  .lay-split .hero .container{display:grid;gap:8px;align-items:center}
  .lay-split .hero-inner{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;max-width:none;margin:30px 0 40px}
  .lay-split .hero-bg{position:relative;inset:auto;display:block;width:calc(100% - 40px);height:230px;margin:22px 20px 0;border-radius:22px;object-fit:cover;z-index:2}
  @media(min-width:860px){
    .lay-split .hero .container{grid-template-columns:1.1fr .9fr;min-height:480px}
    .lay-split .hero-inner{margin:64px 0}
    .lay-split .hero-bg{position:absolute;right:max(20px,calc((100vw - 1080px)/2 + 20px));top:50%;transform:translateY(-50%);width:min(40%,430px);height:min(78%,400px);margin:0;border-radius:28px;box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
  }`,
  center: `
  .lay-center .hero-inner{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;text-align:center;margin-left:auto;margin-right:auto;max-width:780px;padding:8px 0}
  .lay-center .hero-logo{margin-left:auto;margin-right:auto}
  .lay-center .hero-tag{margin-left:auto;margin-right:auto}
  .lay-center .hero-actions,.lay-center .hero-chips{justify-content:center}
  .lay-center .topbar-row{justify-content:center}
  .lay-center .topbar .nav{margin-left:0}`,
  banner: `
  .lay-banner .hero{min-height:500px;display:flex;align-items:flex-end}
  .lay-banner .hero::after{display:none}
  .lay-banner .hero::before{background:linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.78) 100%)}
  .lay-banner .hero .container{width:100%}
  .lay-banner .hero-inner{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;margin:0 0 70px;max-width:680px}
  .lay-banner .hero-logo{width:56px;height:56px;border-radius:14px;margin-bottom:14px}
  .lay-banner .hero h1{font-size:clamp(2.2rem,7vw,3.8rem)}`,
  minimal: `
  .lay-minimal .hero::before,.lay-minimal .hero::after{display:none}
  .lay-minimal .hero-bg{display:none}
  .lay-minimal .hero-inner{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;max-width:760px;margin:56px 0 64px}
  .lay-minimal .hero-logo{border-radius:12px;box-shadow:none;border:1px solid var(--border);width:56px;height:56px}
  .lay-minimal .hero h1{font-size:clamp(2.2rem,7vw,4rem);font-weight:800;position:relative;padding-bottom:18px}
  .lay-minimal .hero h1::after{content:"";position:absolute;left:0;bottom:0;width:64px;height:5px;border-radius:3px;background:var(--accent)}
  .lay-minimal .btn-primary{background:var(--accent);box-shadow:none}`,
  magazine: `
  .lay-magazine h1,.lay-magazine h2,.lay-magazine h3{font-family:Georgia,'Times New Roman',serif;letter-spacing:-.01em}
  .lay-magazine .hero::before,.lay-magazine .hero::after{display:none}
  .lay-magazine .hero-bg{position:relative;inset:auto;display:block;width:100%;height:260px;object-fit:cover;z-index:2}
  .lay-magazine .hero-inner{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;max-width:820px;margin:40px 0 48px;border-top:3px solid var(--ink);padding-top:22px}
  .lay-magazine .hero h1{font-size:clamp(2.2rem,7vw,4.2rem);font-weight:800}
  .lay-magazine .hero-tag{font-family:Georgia,serif;font-style:italic;font-size:1.15rem}
  .lay-magazine .btn{border-radius:4px}
  .lay-magazine .items-grid{grid-template-columns:1fr}
  .lay-magazine .stat,.lay-magazine .items-grid>*{border-radius:6px}`
};
const LIGHT_HERO_CSS = `
  .hero-light .hero{background:var(--hbg,#eef2f7);color:var(--ink)}
  .hero-light .hero::before,.hero-light .hero::after{display:none}
  .hero-light .hero-logo{border-color:var(--border)}
  .hero-light .btn-ghost{background:transparent;color:var(--ink);border:1px solid color-mix(in srgb,var(--ink) 28%,transparent);backdrop-filter:none}
  .hero-light .chip{background:var(--card);border-color:var(--border);color:var(--ink);backdrop-filter:none}
  .hero-light .hero-tag{opacity:.8}`;

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
function siteIsPremiumActive(site, key) {
  if (site && site.premium && site.premiumUntil && new Date(site.premiumUntil).getTime() > Date.now()) return true;
  const g = key && site && site.featureGrants && site.featureGrants[key];
  return !!(g && new Date(g).getTime() > Date.now());
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
  const isPremium = !!opts.forcePremium || siteIsPremiumActive(site, 'look');
  const fContent = !!opts.forcePremium || siteIsPremiumActive(site, 'content');
  const customAccent = (isPremium && /^#[0-9a-fA-F]{6}$/.test(String(site.accentColor || ''))) ? site.accentColor : null;
  let accent = customAccent || (SITE_TEMPLATES[site.template] || SITE_TEMPLATES.classique).accent;
  const title = escapeHtml((site.seoTitle || site.businessName || 'Site professionnel') + ' — Coeurnoh Universe');
  const description = escapeAttr((site.seoDescription || site.tagline || site.aboutText || '').slice(0, 160)
    || `Découvrez ${site.businessName || 'ce professionnel'} sur Coeurnoh Universe.`);
  const ogImage = site.coverImageUrl || site.logoUrl || `${SITE_ORIGIN}/og-image.jpg`;
  const waLink = waLinkFrom(site.contactWhatsapp);
  const httpsUrl = (u) => ((opts.preview ? /^(https:\/\/|blob:)/i : /^https:\/\//i).test(String(u || '')) ? String(u) : '');
  // Mediatheque : images / videos / fichiers. Gratuit = 3 images, 1 video,
  // 2 fichiers ; Premium/Pro = illimite (plafond applique ici aussi).
  const mediaAll = (Array.isArray(site.media) ? site.media : []).filter((m) => m && httpsUrl(m.url) && ['image', 'video', 'file'].includes(m.type));
  const capMedia = (type, free) => { const l = mediaAll.filter((m) => m.type === type); return fContent ? l : l.slice(0, free); };
  const mediaImages = capMedia('image', 3);
  const mediaVideos = capMedia('video', 1);
  const mediaFiles = capMedia('file', 2);
  const gallery = (Array.isArray(site.gallery) ? site.gallery.filter(Boolean) : []).concat(mediaImages.map((m) => m.url));
  const portfolio = (Array.isArray(site.portfolio) ? site.portfolio : []).filter((x) => x && x.title).slice(0, fContent ? 60 : 3);
  const jobs = (Array.isArray(site.jobs) ? site.jobs : []).filter((x) => x && x.title).slice(0, 20);
  const partners = (Array.isArray(site.partners) ? site.partners : []).filter(Boolean).slice(0, fContent ? 40 : 6);
  const timeline = (Array.isArray(site.timeline) ? site.timeline : []).filter((x) => x && x.year && x.text).slice(0, fContent ? 30 : 5);
  const plans = (Array.isArray(site.plans) ? site.plans : []).filter((x) => x && x.name).slice(0, fContent ? 12 : 3);
  const team = (Array.isArray(site.team) ? site.team : []).filter((x) => x && x.name).slice(0, fContent ? 30 : 4);
  const services = Array.isArray(site.services) ? site.services.filter((s) => s.name) : [];
  const faq = Array.isArray(site.faq) ? site.faq.filter((f) => f.question && f.answer) : [];
  const testimonials = Array.isArray(site.testimonials) ? site.testimonials.filter((x) => x.name && x.text) : [];
  const blogPosts = Array.isArray(site.blogPosts) ? site.blogPosts.filter((x) => x.title && x.body).slice().reverse() : [];
  const customSections = Array.isArray(site.customSections) ? site.customSections.filter((x) => x.title && x.body) : [];
  const stats = Array.isArray(site.stats) ? site.stats.filter((x) => x && x.value && x.label).slice(0, 4) : [];
  const announcement = String(site.announcement || '').trim().slice(0, 140);
  // Options avancees : horaires d'ouverture (badge « Ouvert maintenant ») et panier WhatsApp.
  const ex = normalizeExtras(site.extras);
  const cartOn = ex.cart.on && !!waLink && services.some((sv) => parsePrice(sv.price));
  const cartData = services.map((sv) => { const pp = parsePrice(sv.price); return { n: String(sv.name).slice(0, 80), p: String(sv.price || '').slice(0, 40), a: pp ? pp.amount : 0, c: pp ? pp.cur : '' }; });
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
    portfolio: { cta: 'Me contacter', waVerb: 'travailler avec vous sur', itemsTitle: 'Mes services', itemsSub: 'Comment je peux vous aider', itemBtn: 'Me contacter', aboutTitle: 'À propos de moi', galleryTitle: 'Mes réalisations', order: ['gallery', 'about', 'items'] },
    smm: { cta: 'Commander maintenant', waVerb: 'commander', itemsTitle: 'Nos services', itemsSub: 'Prix pour 1000 · livraison rapide', itemBtn: 'Commander', aboutTitle: 'Pourquoi nous choisir', galleryTitle: 'Résultats', order: ['items', 'about', 'gallery'], menu: true },
    musique: { cta: 'Réserver l’artiste', waVerb: 'réserver', itemsTitle: 'Nos offres', itemsSub: 'Concerts, studio et collaborations', itemBtn: 'Réserver', aboutTitle: 'L’artiste', galleryTitle: 'En images', order: ['about', 'gallery', 'items'] },
    education: { cta: 'S’inscrire', waVerb: 'm’inscrire à', itemsTitle: 'Nos formations', itemsSub: 'Des programmes pour progresser', itemBtn: 'S’inscrire', aboutTitle: 'Notre établissement', galleryTitle: 'La vie du centre', order: ['items', 'about', 'gallery'] },
    sante: { cta: 'Prendre rendez-vous', waVerb: 'prendre rendez-vous pour', itemsTitle: 'Nos soins', itemsSub: 'Une équipe à votre écoute', itemBtn: 'Rendez-vous', aboutTitle: 'Notre structure', galleryTitle: 'Nos locaux', order: ['about', 'items', 'gallery'] },
    immobilier: { cta: 'Visiter un bien', waVerb: 'visiter', itemsTitle: 'Nos biens', itemsSub: 'À vendre ou à louer', itemBtn: 'Je suis intéressé', aboutTitle: 'Notre agence', galleryTitle: 'Photos des biens', order: ['items', 'gallery', 'about'] },
    evenement: { cta: 'Réserver la date', waVerb: 'réserver', itemsTitle: 'Nos formules', itemsSub: 'Pour des moments inoubliables', itemBtn: 'Réserver', aboutTitle: 'Notre savoir-faire', galleryTitle: 'Nos événements', order: ['gallery', 'items', 'about'] },
    association: { cta: 'Nous rejoindre', waVerb: 'rejoindre', itemsTitle: 'Nos activités', itemsSub: 'Rejoignez-nous', itemBtn: 'En savoir plus', aboutTitle: 'Notre mission', galleryTitle: 'En images', order: ['about', 'items', 'gallery'] },
    beaute: { cta: 'Prendre rendez-vous', waVerb: 'prendre rendez-vous pour', itemsTitle: 'Nos prestations', itemsSub: 'Tarifs clairs, résultat soigné', itemBtn: 'Réserver', aboutTitle: 'Notre salon', galleryTitle: 'Nos réalisations', order: ['items', 'gallery', 'about'], menu: true },
    media: { cta: 'Nous contacter', waVerb: 'contacter pour', itemsTitle: 'Rubriques et offres', itemsSub: 'Ce que nous proposons', itemBtn: 'Contacter', aboutTitle: 'Notre rédaction', galleryTitle: 'À la une', order: ['about', 'items', 'gallery'] },
    agence: { cta: 'Demander un devis', waVerb: 'un devis pour', itemsTitle: 'Nos offres', itemsSub: 'Stratégie, création, résultats', itemBtn: 'Demander', aboutTitle: 'Notre agence', galleryTitle: 'Nos projets', order: ['gallery', 'items', 'about'] }
  };
  const siteType = TYPES[site.siteType] ? site.siteType : 'entreprise';
  // Identité visuelle de chaque marque : couleur par défaut + fond du bandeau + pastilles de confiance.
  const LOOK = {
    smm: { accent: '#0ea5a4', h1: '#04211f', h2: '#06403d', badges: ['bolt:Commande en ligne', 'tag:Tarifs clairs pour 1000', 'chat:Support WhatsApp'] },
    entreprise: { accent: '#2563eb', h1: '#0a1633', h2: '#0b1d44', badges: ['brief:Services professionnels', 'doc:Devis gratuit'] },
    boutique: { accent: '#e11d48', h1: '#2a0a14', h2: '#4a0f22', badges: ['bag:Nos produits', 'chat:Commande WhatsApp'] },
    restaurant: { accent: '#d97706', h1: '#2b1405', h2: '#4a2208', badges: ['fork:Cuisine maison', 'cal:Réservation facile'] },
    portfolio: { accent: '#7c3aed', h1: '#160a33', h2: '#26104d', badges: ['star:Travaux récents', 'chat:Contact direct'] },
    musique: { accent: '#9333ea', h1: '#14072b', h2: '#2a0f52', badges: ['note:Titres et concerts', 'cal:Booking'] },
    education: { accent: '#1d4ed8', h1: '#07163b', h2: '#0c2a6b', badges: ['cap:Formations', 'doc:Inscriptions ouvertes'] },
    sante: { accent: '#0d9488', h1: '#042622', h2: '#07403a', badges: ['heart:Soins et suivi', 'cal:Rendez-vous'] },
    immobilier: { accent: '#0f766e', h1: '#06201d', h2: '#0b3b36', badges: ['home:Biens à découvrir', 'pin:Visites sur rendez-vous'] },
    evenement: { accent: '#c026d3', h1: '#240a2b', h2: '#431050', badges: ['star:Moments uniques', 'cal:Réservez votre date'] },
    association: { accent: '#b45309', h1: '#261204', h2: '#44200a', badges: ['users:Communauté', 'heart:Dons et soutien'] },
    beaute: { accent: '#db2777', h1: '#2b0a1b', h2: '#4d1031', badges: ['spark:Soins et style', 'cal:Rendez-vous'] },
    media: { accent: '#dc2626', h1: '#240808', h2: '#401010', badges: ['news:Actualités', 'mail:Newsletter'] },
    agence: { accent: '#4f46e5', h1: '#0d0c33', h2: '#1a1856', badges: ['chart:Résultats mesurables', 'doc:Devis gratuit'] }
  };
  const BADGE_SVG = {
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>', tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/>', chat: '<path d="M21 12a8 8 0 0 1-12 7l-5 1 1.5-4.5A8 8 0 1 1 21 12z"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h6M9 16h6"/>', bag: '<path d="M4 7h16l-1 13H5L4 7zM8 7a4 4 0 0 1 8 0"/>',
    fork: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>',
    note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', cap: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>', heart: '<path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>', users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .8 3 2.5 3 6"/>',
    spark: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3z"/>', news: '<path d="M4 4h13v16H6a2 2 0 0 1-2-2V4zM17 8h3v10a2 2 0 0 1-2 2h-1M8 8h5M8 12h5"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', chart: '<path d="M3 20h18M6 20v-6M11 20V9M16 20v-9"/>'
  };
  const lk = LOOK[siteType] || LOOK.entreprise;
  if (!customAccent && (!site.template || site.template === 'classique')) accent = lk.accent;
  const typeBadges = lk.badges.filter((b) => !(b.startsWith('chat:') && !waLink)).map((b) => { const i = b.indexOf(':'); return `<span class="chip tbadge"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BADGE_SVG[b.slice(0, i)] || ''}</svg>${escapeHtml(b.slice(i + 1))}</span>`; }).join('');

  const TY = Object.assign({}, TYPES[siteType]);
  if (opts.ctaLabel) TY.cta = String(opts.ctaLabel).slice(0, 40);
  // Options Pro (reglees dans « Paramètres du site ») : appliquées seulement si le Pack Pro est actif.
  const po = (isPremium && site.proOptions && typeof site.proOptions === 'object') ? site.proOptions : {};
  const poText = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
  if (poText(po.ctaLabel, 40)) TY.cta = poText(po.ctaLabel, 40);
  const customCtaUrl = /^https:\/\/[^\s"'<>]+$/i.test(String(po.ctaUrl || '')) ? String(po.ctaUrl).slice(0, 300) : null;
  const promoText = poText(po.promoText, 120);
  const promoUntil = /^\d{4}-\d{2}-\d{2}$/.test(String(po.promoUntil || '')) ? String(po.promoUntil) : '';
  const TPL = SITE_TEMPLATES[site.template] || SITE_TEMPLATES.classique;
  const dark = site.template === 'sombre' || !!TPL.dark;
  const layoutName = LAYOUT_CSS[TPL.layout] !== undefined ? TPL.layout : 'glass';
  const heroLight = TPL.hero === 'light' && !dark;
  const mapsLink = site.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}` : null;
  const waHref = (txt) => waLink ? `${waLink}?text=${encodeURIComponent(txt)}` : null;
  const mainCtaHref = waLink ? waHref(`Bonjour ${site.businessName || ''}, je vous contacte depuis votre site.`) : (site.contactPhone ? `tel:${site.contactPhone}` : (site.contactEmail ? `mailto:${site.contactEmail}` : '#site-sec-contact'));
  const hasContact = !!(waLink || site.contactPhone || site.contactEmail || site.address);
  // Rendez-vous et newsletter : les envois passent par /api/render-site (action "lead").
  const lead = opts.lead && opts.lead.id ? { kind: opts.lead.kind === 'biz' ? 'biz' : 'site', id: String(opts.lead.id) } : null;
  const bookingOn = !!(site.booking && site.booking.enabled);
  const newsletterOn = !!(site.newsletter && site.newsletter.enabled);
  const bookingNote = site.booking && site.booking.note ? String(site.booking.note).slice(0, 200) : '';

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
    portfolio.length ? ['site-sec-portfolio', 'Réalisations'] : null,
    plans.length ? ['site-sec-plans', 'Forfaits'] : null,
    team.length ? ['site-sec-team', 'Équipe'] : null,
    mediaVideos.length ? ['site-sec-videos', 'Vidéos'] : null,
    jobs.length ? ['site-sec-jobs', 'Carrières'] : null,
    mediaFiles.length ? ['site-sec-docs', 'Documents'] : null,
    blogPosts.length ? ['site-sec-blog', 'Actualités'] : null,
    testimonials.length ? ['site-sec-testimonials', 'Avis'] : null,
    faq.length ? ['site-sec-faq', 'FAQ'] : null,
    panelEnabled(site) ? ['site-sec-panel', 'Commander'] : null,
    bookingOn ? ['site-sec-booking', 'Rendez-vous'] : null,
    hasContact ? ['site-sec-contact', 'Contact'] : null
  ].filter(Boolean).filter((n) => n[0] !== 'site-sec-about' || site.aboutText);

  const blogCategories = [...new Set(blogPosts.map((p) => p.category).filter(Boolean))];

  const cartBtn = (sv, i) => (cartOn && cartData[i] && cartData[i].a) ? `<button type="button" class="cart-add" data-i="${i}">+ Ajouter au panier</button>` : '';
  const itemCards = services.map((sv, i) => {
    const order = waHref(`Bonjour, je souhaite ${TY.waVerb} : ${sv.name}${sv.price ? ' (' + sv.price + ')' : ''}.`);
    const pimg = httpsUrl(sv.image);
    if (TY.menu) {
      return `<div class="menu-row">${pimg ? `<img class="menu-img" src="${escapeAttr(pimg)}" alt="" loading="lazy">` : ''}<div class="menu-main"><div class="menu-top"><div class="menu-name">${escapeHtml(sv.name)}</div><div class="menu-dots" aria-hidden="true"></div>${sv.price ? `<div class="menu-price">${escapeHtml(sv.price)}</div>` : ''}</div>${sv.desc ? `<div class="menu-desc">${escapeHtml(sv.desc)}</div>` : ''}${cartBtn(sv, i)}</div></div>`;
    }
    return `<article class="item-card reveal${pimg ? ' has-photo' : ''}">
      ${pimg ? `<img class="item-photo" src="${escapeAttr(pimg)}" alt="${escapeAttr(sv.name)}" loading="lazy">` : `<div class="item-num">${String(i + 1).padStart(2, '0')}</div>`}
      <h3>${escapeHtml(sv.name)}</h3>
      ${sv.price ? `<div class="item-price">${escapeHtml(sv.price)}</div>` : ''}
      ${sv.desc ? `<p class="item-desc">${escapeHtml(sv.desc)}</p>` : ''}
      ${cartBtn(sv, i)}
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
  const fileIcon = (name) => { const e = String(name || '').split('.').pop().toUpperCase().slice(0, 4); return escapeHtml(e || 'FILE'); };
  const sectionPortfolio = portfolio.length ? `
  <section class="section" id="site-sec-portfolio">
    <div class="section-head reveal"><span class="eyebrow">${portfolio.length} projet${portfolio.length > 1 ? 's' : ''}</span><h2>Réalisations</h2></div>
    <div class="pf-grid">${portfolio.map((p) => {
      const img = httpsUrl(p.image); const link = httpsUrl(p.link);
      return `<article class="pf-card reveal">
        ${img ? `<button type="button" class="pf-img" onclick="openSiteLightbox('${jsStr(img)}')" aria-label="Agrandir"><img src="${escapeAttr(img)}" alt="${escapeAttr(p.title)}" loading="lazy"></button>` : `<div class="pf-img pf-ph">${escapeHtml(String(p.title).charAt(0).toUpperCase())}</div>`}
        <div class="pf-body">
          ${p.category ? `<span class="post-category">${escapeHtml(p.category)}</span>` : ''}
          <h3>${escapeHtml(p.title)}</h3>
          ${p.desc ? `<p>${escapeHtml(p.desc)}</p>` : ''}
          ${link ? `<a class="item-btn" href="${escapeAttr(link)}" target="_blank" rel="noopener nofollow">Voir le projet ${IC.arrow}</a>` : ''}
        </div>
      </article>`;
    }).join('')}</div>
  </section>` : '';
  const sectionVideos = mediaVideos.length ? `
  <section class="section" id="site-sec-videos">
    <div class="section-head reveal"><span class="eyebrow">Présentation</span><h2>Vidéos</h2></div>
    <div class="vid-grid">${mediaVideos.map((v) => `<figure class="vid reveal"><video controls preload="metadata" playsinline src="${escapeAttr(httpsUrl(v.url))}"></video>${v.title ? `<figcaption>${escapeHtml(v.title)}</figcaption>` : ''}</figure>`).join('')}</div>
  </section>` : '';
  const sectionDocs = mediaFiles.length ? `
  <section class="section" id="site-sec-docs">
    <div class="section-head reveal"><span class="eyebrow">À télécharger</span><h2>Documents</h2></div>
    <div class="doc-list">${mediaFiles.map((f) => `<a class="doc reveal" href="${escapeAttr(httpsUrl(f.url))}" target="_blank" rel="noopener" download><span class="doc-ext">${fileIcon(f.name)}</span><span class="doc-name">${escapeHtml(f.title || f.name || 'Document')}</span><span class="doc-dl">${IC.arrow}</span></a>`).join('')}</div>
  </section>` : '';
  const sectionPlans = plans.length ? `
  <section class="section" id="site-sec-plans">
    <div class="section-head reveal"><span class="eyebrow">Tarifs</span><h2>Nos forfaits</h2></div>
    <div class="plans">${plans.map((p, i) => {
      const feats = String(p.features || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10);
      const order = waHref(`Bonjour, je suis intéressé par le forfait : ${p.name}${p.price ? ' (' + p.price + ')' : ''}.`);
      return `<article class="plan reveal${i === 1 && plans.length > 2 ? ' plan-hot' : ''}"><h3>${escapeHtml(p.name)}</h3>${p.price ? `<div class="plan-price">${escapeHtml(p.price)}</div>` : ''}${feats.length ? `<ul>${feats.map((f) => `<li>${IC.check}<span>${escapeHtml(f)}</span></li>`).join('')}</ul>` : ''}${order ? `<a class="btn btn-primary" href="${escapeAttr(order)}" target="_blank" rel="noopener">Choisir</a>` : ''}</article>`;
    }).join('')}</div>
  </section>` : '';
  const sectionTeam = team.length ? `
  <section class="section" id="site-sec-team">
    <div class="section-head reveal"><span class="eyebrow">Les personnes derrière le projet</span><h2>Notre équipe</h2></div>
    <div class="team">${team.map((m) => `<div class="member reveal">${httpsUrl(m.image) ? `<img src="${escapeAttr(httpsUrl(m.image))}" alt="" loading="lazy">` : `<span>${escapeHtml(String(m.name).charAt(0).toUpperCase())}</span>`}<b>${escapeHtml(m.name)}</b>${m.role ? `<small>${escapeHtml(m.role)}</small>` : ''}</div>`).join('')}</div>
  </section>` : '';
  const sectionJobs = jobs.length ? `
  <section class="section" id="site-sec-jobs">
    <div class="section-head reveal"><span class="eyebrow">${jobs.length} poste${jobs.length > 1 ? 's' : ''} ouvert${jobs.length > 1 ? 's' : ''}</span><h2>Carrières</h2></div>
    <div class="jobs">${jobs.map((j) => {
      const apply = waHref(`Bonjour, je souhaite postuler : ${j.title}.`);
      return `<article class="job reveal">${httpsUrl(j.image) ? `<img class="job-img" src="${escapeAttr(httpsUrl(j.image))}" alt="" loading="lazy">` : ''}<div class="job-main"><h3>${escapeHtml(j.title)}</h3>${j.meta ? `<span class="post-category">${escapeHtml(j.meta)}</span>` : ''}${j.desc ? `<p>${escapeHtml(j.desc)}</p>` : ''}</div>${apply ? `<a class="item-btn" href="${escapeAttr(apply)}" target="_blank" rel="noopener">Postuler ${IC.arrow}</a>` : ''}</article>`;
    }).join('')}</div>
  </section>` : '';
  const sectionPartners = partners.length ? `
  <section class="section" id="site-sec-partners">
    <div class="section-head reveal"><span class="eyebrow">Ils nous font confiance</span><h2>Partenaires et clients</h2></div>
    <div class="partners reveal">${partners.map((n) => `<span class="partner">${escapeHtml(n)}</span>`).join('')}</div>
  </section>` : '';
  const sectionTimeline = timeline.length ? `
  <section class="section" id="site-sec-timeline">
    <div class="section-head reveal"><span class="eyebrow">Notre parcours</span><h2>Historique</h2></div>
    <ol class="tl">${timeline.map((x) => `<li class="reveal"><b>${escapeHtml(x.year)}</b><span>${escapeHtml(x.text)}</span></li>`).join('')}</ol>
  </section>` : '';
  const blocks = { about: sectionAbout, items: sectionItems, gallery: sectionGallery };
  const mainSections = TY.order.map((k) => blocks[k]).join('') + sectionPortfolio + sectionPlans + sectionVideos + sectionTeam + sectionTimeline + sectionJobs + sectionDocs + sectionPartners;

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
  ${(!dark && TPL.bg) ? `:root{--bg:${TPL.bg}}` : ''}
  ${TPL.hbg ? `:root{--hbg:${TPL.hbg}}` : ''}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth;scroll-padding-top:76px}
  body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  img{max-width:100%}
  h1,h2,h3{line-height:1.15;letter-spacing:-.02em;margin:0}
  .container{max-width:1080px;margin:0 auto;padding:0 20px}

  /* Barre de navigation */
  .topbar{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.86);color:var(--ink);backdrop-filter:saturate(180%) blur(18px);-webkit-backdrop-filter:saturate(180%) blur(18px);border-bottom:1px solid rgba(15,23,42,.08)}
  .topbar .nav a,.topbar .navscroll a{color:#475569}
  .topbar .nav a:hover{color:var(--ink);background:rgba(15,23,42,.05)}
  .topbar .navscroll a{background:transparent;border:0;border-radius:0;padding:10px 4px;margin-right:14px;border-bottom:2px solid transparent}
  .topbar .navscroll a.on,.topbar .nav a.on{color:var(--accent);border-bottom-color:var(--accent)}
  .topbar .pro-badge{background:var(--accent-soft);color:var(--accent)}
  @media(prefers-color-scheme:dark){.topbar{background:rgba(15,23,42,.82);border-bottom-color:rgba(255,255,255,.1)}.topbar .nav a,.topbar .navscroll a{color:#cbd5e1}.topbar .nav a:hover{color:#fff;background:rgba(255,255,255,.08)}}
  .progress{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--accent),#7dd3fc);z-index:60;transition:width .1s}
  .announce{background:linear-gradient(90deg,#0a1633,#12306b);color:#e8efff;font-size:.82rem;font-weight:600;text-align:center;padding:9px 40px;position:relative;border-bottom:1px solid rgba(255,255,255,.12)}
  .announce button{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;color:#c9d6f5;font-size:1.2rem;cursor:pointer;line-height:1}
  .topbar-row{display:flex;align-items:center;gap:14px;height:62px}
  .brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;font-weight:800;font-size:1.02rem;letter-spacing:-.01em;min-width:0}
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
  .hero{position:relative;color:#fff;overflow:hidden;background:radial-gradient(900px 420px at 88% -8%,color-mix(in srgb,var(--accent) 45%,transparent),transparent 70%),radial-gradient(700px 380px at -10% 110%,rgba(56,120,255,.28),transparent 70%),linear-gradient(160deg,${TPL.h1 || lk.h1},${TPL.h2 || lk.h2} 55%,#050b1c)}
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
  .item-card.has-photo{padding:0;overflow:hidden;gap:0}
  .item-card.has-photo>:not(.item-photo){margin-left:18px;margin-right:18px}
  .item-card.has-photo h3{margin-top:14px}
  .item-card.has-photo .item-btn{padding:10px 0 18px}
  .item-card.has-photo .item-desc{margin-top:6px}
  .item-photo{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:var(--accent-soft)}
  .menu-img{width:64px;height:64px;border-radius:12px;object-fit:cover;flex:0 0 64px;margin-right:12px}
  .item-num{width:38px;height:38px;border-radius:12px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem}
  .item-card h3{font-size:1.08rem;font-weight:700;margin-top:6px}
  .item-price{color:var(--accent);font-weight:800;font-size:1.05rem}
  .item-btn{margin-top:auto;padding-top:10px;display:inline-flex;align-items:center;gap:7px;color:var(--accent);font-weight:700;font-size:.88rem;text-decoration:none}
  .item-btn:hover{gap:11px}
  .menu{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:10px 22px;box-shadow:var(--shadow);max-width:720px}
  .menu-row{display:flex;align-items:center;gap:10px;padding:14px 0;border-bottom:1px dashed var(--border)}
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

  .pf-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
  .pf-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}
  .pf-img{display:block;width:100%;aspect-ratio:4/3;border:0;padding:0;background:var(--accent-soft);cursor:zoom-in;overflow:hidden}
  .pf-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}
  .pf-card:hover .pf-img img{transform:scale(1.05)}
  .pf-ph{display:flex;align-items:center;justify-content:center;font-size:2.6rem;font-weight:800;color:var(--accent);cursor:default}
  .pf-body{padding:18px;display:flex;flex-direction:column;gap:6px}
  .pf-body .post-category{align-self:flex-start;margin-bottom:2px}
  .pf-body h3{margin:0;font-size:1.05rem}.pf-body p{margin:0;color:var(--muted);font-size:.92rem}
  .plans{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
  .plan{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;display:flex;flex-direction:column;gap:12px}
  .plan-hot{border-color:var(--accent);box-shadow:0 12px 40px rgba(0,0,0,.18)}
  .plan h3{margin:0;font-size:1.05rem}.plan-price{font-size:1.7rem;font-weight:800;color:var(--accent)}
  .plan ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;color:var(--muted);font-size:.92rem}
  .plan li{display:flex;gap:8px;align-items:flex-start}.plan li svg{flex:none;color:var(--accent);margin-top:3px}
  .plan .btn{margin-top:auto;justify-content:center}
  .team{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
  .member{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px 12px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}
  .member span{width:56px;height:56px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-weight:800;font-size:1.4rem;display:flex;align-items:center;justify-content:center;margin-bottom:6px}
  .member small{color:var(--muted)}
  .vid-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
  .vid{margin:0;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .vid video{width:100%;display:block;background:#000;max-height:420px}
  .vid figcaption{padding:12px 16px;font-weight:700;font-size:.92rem}
  .doc-list{display:grid;gap:10px;max-width:640px}
  .doc{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:14px;color:inherit;text-decoration:none}
  .doc:hover{border-color:var(--accent)}
  .doc-ext{min-width:46px;height:46px;border-radius:12px;background:var(--accent-soft);color:var(--accent);font-weight:800;font-size:.72rem;display:flex;align-items:center;justify-content:center}
  .doc-name{flex:1;font-weight:700;overflow:hidden;text-overflow:ellipsis}
  .doc-dl{color:var(--accent);display:flex}
  .jobs{display:grid;gap:12px;max-width:760px}
  .job{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:18px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)}
  .job h3{margin:0 0 6px;font-size:1.02rem}.job p{margin:8px 0 0;color:var(--muted);font-size:.9rem}
  .partners{display:flex;flex-wrap:wrap;gap:10px}
  .partner{padding:10px 18px;border:1px solid var(--border);background:var(--card);border-radius:999px;font-weight:700;font-size:.88rem}
  .tl{list-style:none;margin:0;padding:0 0 0 18px;border-left:2px solid var(--border);max-width:680px}
  .tl li{position:relative;padding:0 0 22px 22px;display:flex;flex-direction:column;gap:2px}
  .tl li::before{content:"";position:absolute;left:-26px;top:5px;width:12px;height:12px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}
  .tl b{color:var(--accent)}.tl span{color:var(--muted)}
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

  .promo-bar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;padding:9px 14px;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 55%,#0b1d44));color:#fff;font-weight:700;font-size:.84rem;text-align:center}
  .promo-bar b{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);padding:3px 10px;border-radius:999px;font-variant-numeric:tabular-nums;font-size:.8rem}
  @media(max-width:760px){
    .fab{bottom:calc(84px + env(safe-area-inset-bottom))}
    body{padding-bottom:84px}}
  .fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:30;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
  .fab-wa{display:inline-flex;align-items:center;gap:9px;background:var(--wa);color:#fff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:999px;box-shadow:0 14px 30px -8px rgba(31,168,85,.7)}
  .fab-up{width:42px;height:42px;border-radius:50%;border:1px solid var(--border);background:var(--card);color:var(--ink);display:none;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--shadow)}
  .fab-up.show{display:flex}
  .open-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;font-weight:700;font-size:.82rem;background:rgba(255,255,255,.92);color:#14263f;border:1px solid var(--border)}
  .open-badge:before{content:"";width:9px;height:9px;border-radius:50%;background:#868e96}.open-badge.on:before{background:#2f9e44}.open-badge.off:before{background:#d62839}
  .cart-add{margin-top:10px;border:1px solid var(--accent);background:transparent;color:var(--accent);border-radius:12px;padding:9px 14px;font:inherit;font-weight:700;font-size:.85rem;cursor:pointer;align-self:flex-start}.cart-add:active{transform:scale(.97)}
  #cart-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:40;display:none;align-items:center;justify-content:space-between;gap:10px;background:var(--ink);color:#fff;border:0;border-radius:16px;padding:14px 16px;font:inherit;font-weight:700;box-shadow:0 8px 28px rgba(0,0,0,.3);cursor:pointer}#cart-bar.show{display:flex}
  #cart-sheet{position:fixed;inset:0;z-index:60;display:none;background:rgba(10,18,30,.55)}#cart-sheet.open{display:block}
  #cart-sheet .cs{position:absolute;left:0;right:0;bottom:0;max-height:88%;overflow:auto;background:var(--card,#fff);color:var(--ink);border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}
  .cs h3{margin:0 0 10px;font-size:1.1rem}.cs-x{position:absolute;right:12px;top:12px;border:0;background:var(--border);width:34px;height:34px;border-radius:50%;font-size:1.2rem;cursor:pointer;color:inherit}
  .cs-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}.cs-row b{display:block;font-size:.92rem}.cs-row small{opacity:.7}
  .cs-q{display:flex;align-items:center;gap:8px}.cs-q button{width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:transparent;color:inherit;font-size:1.1rem;cursor:pointer}
  .cs-tot{display:flex;justify-content:space-between;font-weight:800;margin:12px 0;font-size:1.05rem}.cs input,.cs textarea{width:100%;box-sizing:border-box;margin:5px 0;border:1px solid var(--border);border-radius:12px;padding:11px 12px;font:inherit;background:transparent;color:inherit}
  .cs-go{display:flex;justify-content:center;width:100%;margin-top:8px;border:0;border-radius:14px;padding:14px;background:var(--wa,#25d366);color:#fff;font:inherit;font-weight:800;cursor:pointer}
  .fab-wa{display:none}.fab-wa.show{display:inline-flex}

  .lightbox{position:fixed;inset:0;z-index:50;background:rgba(8,10,16,.95);display:none;align-items:center;justify-content:center;padding:24px;cursor:zoom-out}
  .lightbox.open{display:flex}
  .lightbox img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .lightbox-close{position:absolute;top:16px;right:18px;background:rgba(255,255,255,.14);color:#fff;border:none;width:42px;height:42px;border-radius:50%;font-size:1.4rem;cursor:pointer;line-height:1}

  .js .reveal{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}
  .js .reveal.in{opacity:1;transform:none}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.js .reveal{opacity:1;transform:none;transition:none}}

  /* v-pro19 : typographie et espacements plus sobres */
  .hero h1{font-size:clamp(1.6rem,5vw,2.5rem);letter-spacing:-.02em}
  .hero-tag{font-size:clamp(.92rem,2.2vw,1.05rem);margin-top:10px}
  .hero-inner{margin:22px 0 40px;padding:22px 20px;border-radius:22px}
  @media(min-width:860px){.hero-inner{padding:32px 34px;margin:44px 0 60px}}
  .hero-logo{width:58px;height:58px;border-radius:16px;font-size:1.5rem;margin-bottom:16px}
  .hero-actions{gap:10px;margin-top:20px}
  .btn{font-size:.86rem;padding:11px 18px;border-radius:12px;gap:7px}
  .hero-chips{margin-top:18px;gap:8px}
  .chip{font-size:.76rem;padding:6px 11px}
  .stats{margin-top:-26px;gap:8px;grid-template-columns:repeat(auto-fit,minmax(110px,1fr))}
  .stat{border-radius:14px;padding:11px 10px}
  .stat b{font-size:clamp(1.05rem,3.6vw,1.45rem)}
  .stat span{font-size:.7rem}
  .section{padding:38px 0}
  .section-head{margin-bottom:20px}
  .eyebrow{font-size:.68rem;margin-bottom:6px}
  .section-head h2,.about-text h2{font-size:clamp(1.25rem,3.6vw,1.7rem)}
  .cform{gap:8px;margin-top:12px}
  .cform input,.cform textarea{font-size:.9rem;padding:10px 12px;border-radius:11px}
  .navscroll a{font-size:.76rem;padding:6px 12px}
  .brand{font-size:.92rem}
  .back-btn{flex:0 0 auto;width:36px;height:36px;border-radius:50%;border:1px solid rgba(15,23,42,.12);background:transparent;color:inherit;font-size:1.05rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
  .back-btn:active{transform:scale(.94)}

  /* v-pro20 : contact, rendez-vous, newsletter (sobres, lisibles) */
  .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
  .sec-sub{margin:6px 0 0;color:var(--muted);font-size:.86rem}
  .contact-card{background:var(--card);color:var(--ink);border:1px solid var(--border);border-radius:18px;padding:20px 18px;gap:18px;box-shadow:var(--shadow)}
  .contact-card h2{font-size:clamp(1.2rem,3.4vw,1.55rem)}
  .contact-card p{font-size:.86rem;color:var(--muted);opacity:1;margin:6px 0 0}
  .contact-card .eyebrow{color:var(--accent)!important;opacity:1!important}
  .contact-list{gap:8px}
  .contact-item{background:transparent;border:1px solid var(--border);color:var(--ink);padding:10px 12px;border-radius:12px;font-size:.84rem;font-weight:600;gap:10px;word-break:break-word}
  .contact-item svg{width:17px;height:17px;color:var(--accent)}
  .contact-card .cform input,.contact-card .cform textarea{color:var(--ink);background:var(--bg);border:1px solid var(--border)}
  .contact-card .cform input::placeholder,.contact-card .cform textarea::placeholder{color:var(--muted)}
  .contact-card .cform input:focus,.contact-card .cform textarea:focus{border-color:var(--accent);background:var(--card)}
  .contact-card .socials a{color:var(--ink);border-color:var(--border);background:transparent}
  @media(min-width:860px){.contact-card{padding:28px 32px}}
  .fab-wa{font-size:.8rem;padding:10px 15px;gap:7px}.fab-wa svg{width:17px;height:17px}
  .fab-up{width:38px;height:38px}
  .book-card,.news-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:18px;box-shadow:var(--shadow);max-width:560px}
  .bk-form{display:grid;gap:10px}
  .bk-form label{display:grid;gap:5px;font-size:.74rem;font-weight:700;color:var(--muted);letter-spacing:.02em}
  .bk-form input,.bk-form select,.bk-form textarea,.nl-form input{width:100%;font:inherit;font-size:.9rem;font-weight:500;color:var(--ink);background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:10px 12px;outline:none}
  .bk-form input:focus,.bk-form select:focus,.bk-form textarea:focus,.nl-form input:focus{border-color:var(--accent);background:var(--card)}
  .bk-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .bk-note{margin:0;font-size:.74rem;color:var(--muted);text-align:center}
  .bk-done{text-align:center;display:grid;gap:8px;justify-items:center;padding:8px 0}
  .bk-done[hidden],.nl-ok[hidden],.bk-form[hidden],.nl-form[hidden]{display:none}
  .bk-ok{width:44px;height:44px;border-radius:50%;background:color-mix(in srgb,var(--wa) 16%,transparent);color:var(--wa);display:flex;align-items:center;justify-content:center}
  .bk-done h3{margin:0;font-size:1.05rem}.bk-done p{margin:0;font-size:.86rem;color:var(--muted)}
  .news-card{display:grid;gap:12px;max-width:none}
  ${panelCss}
  .news-card h3{margin:0;font-size:1.05rem}.news-card p{margin:4px 0 0;font-size:.82rem;color:var(--muted)}
  .nl-form{display:flex;gap:8px;flex-wrap:wrap}.nl-form input[type=email]{flex:1 1 180px;width:auto}
  .nl-ok{margin:0!important;display:flex;gap:6px;align-items:center;color:var(--wa)!important;font-weight:700}
  @media(min-width:760px){.news-card{grid-template-columns:1fr 1fr;align-items:center;padding:22px 26px}}
  #cn-toast{position:fixed;left:50%;bottom:84px;transform:translate(-50%,12px);background:#0f172a;color:#fff;font-size:.82rem;font-weight:600;padding:10px 16px;border-radius:12px;opacity:0;pointer-events:none;transition:.25s;z-index:80;max-width:88vw;text-align:center}
  #cn-toast.show{opacity:1;transform:translate(-50%,0)}

  /* v-pro21 : page plus compacte et plus sobre */
  .topbar-row{height:52px}
  .brand-logo{width:30px;height:30px;border-radius:9px}
  .brand{font-size:.88rem}
  .hero-inner{margin:14px 0 26px;padding:16px 16px;border-radius:18px;max-width:640px}
  @media(min-width:860px){.hero-inner{padding:26px 30px;margin:34px 0 46px}}
  .hero-logo{width:46px;height:46px;border-radius:13px;font-size:1.2rem;margin-bottom:12px;border-width:2px}
  .hero h1{font-size:clamp(1.25rem,4.4vw,1.9rem);line-height:1.2}
  .hero-tag{font-size:.88rem;margin-top:6px}
  .hero-actions{margin-top:14px;gap:8px}
  .btn{font-size:.8rem;padding:9px 15px;border-radius:10px}
  .hero-chips{margin-top:12px;gap:6px}
  .chip{font-size:.72rem;padding:5px 10px}
  .stats{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:-14px}
  .stat{flex:0 1 auto;min-width:104px;padding:8px 16px;border-radius:12px;display:flex;align-items:baseline;justify-content:center;gap:7px}
  .stat b{display:inline;font-size:1.05rem}
  .stat span{font-size:.7rem}
  .section{padding:30px 0}
  .section-head{margin-bottom:16px}
  .section-head h2,.about-text h2{font-size:clamp(1.1rem,3.2vw,1.45rem)}
  .contact-card{padding:16px 14px;gap:14px;border-radius:16px}
  .contact-card h2{font-size:1.15rem}
  .contact-card p{font-size:.8rem}
  .contact-item{padding:8px 11px;font-size:.8rem;border-radius:10px}
  .fab-wa{font-size:.74rem;padding:8px 13px}
  .job{padding:12px;gap:12px;align-items:center}
  .job-img{width:64px;height:64px;border-radius:12px;object-fit:cover;flex:0 0 auto}
  .job-main{flex:1;min-width:0}
  .job h3{font-size:.95rem}
  .member img{width:56px;height:56px;border-radius:50%;object-fit:cover;margin-bottom:6px}
  ${LAYOUT_CSS[layoutName]}
  ${heroLight ? LIGHT_HERO_CSS : ''}
</style>
</head>
<body class="t-${siteType} lay-${layoutName}${heroLight ? ' hero-light' : ''}">
${promoText ? `<div class="promo-bar" id="promo-bar"${promoUntil ? ` data-until="${escapeAttr(promoUntil)}"` : ''}><span>${escapeHtml(promoText)}</span>${promoUntil ? '<b id="promo-count"></b>' : ''}</div>` : ''}
<div class="progress" id="site-progress"></div>
${announcement ? `<div class="announce" id="site-announce">${escapeHtml(announcement)}<button type="button" onclick="document.getElementById('site-announce').remove()" aria-label="Fermer">×</button></div>` : ''}
<header class="topbar">
  <div class="container topbar-row">
    <button type="button" class="back-btn" id="site-back" aria-label="Retour"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
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
          <a class="btn btn-primary" href="${escapeAttr(customCtaUrl || mainCtaHref)}"${(customCtaUrl || waLink) ? ' target="_blank" rel="noopener"' : ''}>${(waLink && !customCtaUrl) ? IC.wa : ''}${escapeHtml(TY.cta)}</a>
          ${bookingOn ? `<a class="btn btn-ghost" href="#site-sec-booking">Prendre rendez-vous ${IC.arrow}</a>` : ''}
          ${services.length ? `<a class="btn btn-ghost" href="#site-sec-services">${escapeHtml(TY.itemsTitle)} ${IC.arrow}</a>` : ''}
        </div>
        ${ex.hoursOn ? '<div class="hero-chips"><span class="open-badge" id="open-badge" hidden></span></div>' : ''}
        ${typeBadges ? `<div class="hero-chips">${typeBadges}</div>` : ''}
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

  ${bookingOn ? `
  <section class="section" id="site-sec-booking">
    <div class="section-head reveal"><span class="eyebrow">Réservation</span><h2>Prendre rendez-vous</h2>${bookingNote ? `<p class="sec-sub">${escapeHtml(bookingNote)}</p>` : ''}</div>
    <div class="book-card reveal">
      <form id="bk-form" class="bk-form" onsubmit="return cnBook(event)" novalidate>
        <input type="text" name="hp" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
        <label>Nom complet<input type="text" id="bk-name" maxlength="60" autocomplete="name" required></label>
        <label>Téléphone<input type="tel" id="bk-phone" maxlength="30" autocomplete="tel" placeholder="+243…" required></label>
        ${services.length ? `<label>Service souhaité<select id="bk-service"><option value="">Choisir…</option>${services.slice(0, 40).map((sv) => `<option>${escapeHtml(sv.name)}</option>`).join('')}</select></label>` : ''}
        <div class="bk-row">
          <label>Date<input type="date" id="bk-date" required></label>
          <label>Heure<input type="time" id="bk-time" required></label>
        </div>
        <label>Précisions (facultatif)<textarea id="bk-msg" rows="2" maxlength="400"></textarea></label>
        <button class="btn btn-accent" type="submit" id="bk-btn">Demander ce rendez-vous</button>
        <p class="bk-note">Vous recevrez une confirmation de ${escapeHtml(site.businessName || 'notre équipe')}.</p>
      </form>
      <div class="bk-done" id="bk-done" hidden>
        <div class="bk-ok">${IC.check}</div>
        <h3>Demande envoyée</h3>
        <p id="bk-done-txt">Nous vous confirmons le rendez-vous très vite.</p>
        ${waLink ? `<a class="btn btn-primary" id="bk-wa" href="${escapeAttr(waLink)}" target="_blank" rel="noopener">${IC.wa} Confirmer sur WhatsApp</a>` : ''}
      </div>
    </div>
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
  ${panelHtml(site)}
  ${newsletterOn ? `
  <section class="section" id="site-sec-newsletter">
    <div class="news-card reveal">
      <div><h3>${escapeHtml((site.newsletter && site.newsletter.title) ? String(site.newsletter.title).slice(0, 80) : 'Restez informé')}</h3><p>Recevez nos nouveautés et offres. Pas de spam, désinscription à tout moment.</p></div>
      <form id="nl-form" class="nl-form" onsubmit="return cnNews(event)" novalidate>
        <input type="text" name="hp" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
        <input type="email" id="nl-email" placeholder="Votre e-mail" maxlength="120" autocomplete="email" required>
        <button class="btn btn-accent" type="submit" id="nl-btn">S'abonner</button>
      </form>
      <p class="nl-ok" id="nl-ok" hidden>${IC.check} Merci, vous êtes inscrit(e).</p>
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
${cartOn ? `<button type="button" id="cart-bar" aria-label="Ouvrir le panier"><span id="cart-bar-n"></span><span id="cart-bar-t"></span></button>
<div id="cart-sheet" role="dialog" aria-label="Mon panier"><div class="cs"><button type="button" class="cs-x" id="cart-x" aria-label="Fermer">×</button><h3>Mon panier</h3><div id="cart-rows"></div><div class="cs-tot" id="cart-tot"></div>
<input id="cart-name" maxlength="60" placeholder="Votre nom (facultatif)" autocomplete="name"><textarea id="cart-note" maxlength="200" rows="2" placeholder="Adresse de livraison ou précision (facultatif)"></textarea>
${ex.cart.note ? `<p class="muted small" style="margin:6px 0">${escapeHtml(ex.cart.note)}</p>` : ''}<button type="button" class="cs-go" id="cart-go">Envoyer ma commande sur WhatsApp</button></div></div>` : ''}
<script>
document.documentElement.classList.add('js');
(function(){
  var b=document.getElementById('site-back');
  if(b)b.addEventListener('click',function(){
    if(window.parent&&window.parent!==window){try{window.parent.postMessage({cnPreviewBack:1},'*')}catch(e){}return}
    var same=false;try{same=document.referrer&&new URL(document.referrer).origin===location.origin}catch(e){}
    if(same&&history.length>1)history.back();else location.href='/';
  });
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');
    if(!a)return;
    var id=a.getAttribute('href').slice(1);
    var el=id?document.getElementById(id):document.getElementById('top');
    e.preventDefault();
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
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
  try{var links=[].slice.call(document.querySelectorAll('.topbar a[href^="#"]')).filter(function(a){return a.getAttribute('href').length>1});
  if(links.length&&'IntersectionObserver' in window){var sec={};links.forEach(function(a){var t=document.getElementById(a.getAttribute('href').slice(1));if(t)sec[t.id]=t});
  var ob=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){links.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+x.target.id)})}})},{rootMargin:'-30% 0px -60% 0px'});
  Object.keys(sec).forEach(function(k){ob.observe(sec[k])})}}catch(e){}
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
var SITE_EX=${JSON.stringify({ hoursOn: ex.hoursOn, tz: ex.tz, week: ex.week }).replace(/</g, '\\u003c')};
${openStatus.toString()}
(function(){var b=document.getElementById('open-badge');if(!b||!SITE_EX.hoursOn)return;
function upd(){var r=openStatus(SITE_EX.week,SITE_EX.tz,Date.now());b.textContent=r.label;b.className='open-badge '+(r.open?'on':'off');b.hidden=false}upd();setInterval(upd,60000)})();
${cartOn ? `var CART_ITEMS=${JSON.stringify(cartData).replace(/</g, '\\u003c')};
(function(){var Q={},bar=document.getElementById('cart-bar'),sh=document.getElementById('cart-sheet');if(!bar||!sh)return;
function fmt(n){return (Math.round(n*100)/100).toLocaleString('fr-FR')}
function totals(){var c='',mixed=false,sum=0,n=0;Object.keys(Q).forEach(function(i){var q=Q[i],it=CART_ITEMS[i];if(!q||!it)return;n+=q;if(it.a){if(!c)c=it.c;else if(c!==it.c)mixed=true;sum+=it.a*q}});return {n:n,sum:sum,cur:c,mixed:mixed}}
function draw(){var t=totals();bar.classList.toggle('show',t.n>0);document.getElementById('cart-bar-n').textContent='Panier · '+t.n+' article'+(t.n>1?'s':'');document.getElementById('cart-bar-t').textContent=t.mixed||!t.sum?'Voir':fmt(t.sum)+(t.cur?' '+t.cur:'');
var h='';Object.keys(Q).forEach(function(i){var q=Q[i],it=CART_ITEMS[i];if(!q||!it)return;h+='<div class="cs-row"><div><b></b><small></small></div><div class="cs-q"><button type="button" data-d="-1" data-i="'+i+'" aria-label="Retirer un">−</button><span>'+q+'</span><button type="button" data-d="1" data-i="'+i+'" aria-label="Ajouter un">+</button></div></div>'});
var rows=document.getElementById('cart-rows');rows.innerHTML=h;var k=0;Object.keys(Q).forEach(function(i){if(!Q[i]||!CART_ITEMS[i])return;var r=rows.children[k++];r.querySelector('b').textContent=CART_ITEMS[i].n;r.querySelector('small').textContent=CART_ITEMS[i].p});
document.getElementById('cart-tot').innerHTML='<span>Total</span><span></span>';document.getElementById('cart-tot').lastChild.textContent=t.mixed?'selon les articles':(t.sum?fmt(t.sum)+(t.cur?' '+t.cur:''):'')}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.cart-add');if(a){var i=a.getAttribute('data-i');Q[i]=(Q[i]||0)+1;draw();a.textContent='Ajouté ✓';setTimeout(function(){a.textContent='+ Ajouter au panier'},900);return}
var d=e.target.closest&&e.target.closest('[data-d]');if(d){var j=d.getAttribute('data-i');Q[j]=Math.max(0,(Q[j]||0)+parseInt(d.getAttribute('data-d'),10));draw();if(!totals().n)sh.classList.remove('open')}});
bar.addEventListener('click',function(){sh.classList.add('open')});document.getElementById('cart-x').addEventListener('click',function(){sh.classList.remove('open')});sh.addEventListener('click',function(e){if(e.target===sh)sh.classList.remove('open')});
document.getElementById('cart-go').addEventListener('click',function(){var t=totals();if(!t.n)return;var L=['Bonjour, je souhaite commander :'];Object.keys(Q).forEach(function(i){if(Q[i]&&CART_ITEMS[i])L.push('- '+Q[i]+' × '+CART_ITEMS[i].n+(CART_ITEMS[i].p?' ('+CART_ITEMS[i].p+')':''))});
if(!t.mixed&&t.sum)L.push('Total : '+fmt(t.sum)+(t.cur?' '+t.cur:''));var nm=document.getElementById('cart-name').value.trim(),nt=document.getElementById('cart-note').value.trim();if(nm)L.push('Nom : '+nm);if(nt)L.push('Précision : '+nt);
window.open(SITE_WA+'?text='+encodeURIComponent(L.join('\\n')),'_blank','noopener')})})();` : ''}
setTimeout(function(){if(SITE_PREVIEW||!SITE_LEAD||SITE_LEAD.kind!=='site')return;
function hit(ev){try{var b=JSON.stringify({action:'hit',id:SITE_LEAD.id,ev:ev});if(navigator.sendBeacon)navigator.sendBeacon('/api/render-site',new Blob([b],{type:'application/json'}));else fetch('/api/render-site',{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true})}catch(e){}}
try{var k='cnv_'+SITE_LEAD.id;if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');hit('view')}}catch(e){hit('view')}
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;var a=t.closest('a[href]');
if(a){var h=a.getAttribute('href')||'';if(/wa\\.me|whatsapp/i.test(h))hit('wa');else if(/^tel:/i.test(h))hit('call');else if(/maps\\.|goo\\.gl\\/maps|geo:/i.test(h))hit('map')}
if(t.closest('#cart-go'))hit('cart');if(t.closest('[onclick*="shareSite"]'))hit('share')})},0);
var SITE_WA=${JSON.stringify(waLink || '').replace(/</g, '\\u003c')};
var SITE_MAIL=${JSON.stringify(site.contactEmail || '').replace(/</g, '\\u003c')};
var SITE_NAME=${JSON.stringify(site.businessName || '').replace(/</g, '\\u003c')};
var SITE_TEL=${JSON.stringify(site.contactPhone || site.contactWhatsapp || '').replace(/</g, '\\u003c')};
var SITE_LEAD=${JSON.stringify(lead).replace(/</g, '\\u003c')};var SITE_PREVIEW=${opts.preview ? 'true' : 'false'};
function cnToast(t){var d=document.getElementById('cn-toast');if(!d){d=document.createElement('div');d.id='cn-toast';document.body.appendChild(d)}d.textContent=t;d.className='show';clearTimeout(window.__tt);window.__tt=setTimeout(function(){d.className=''},3200)}
function cnSend(payload,btn,ok){
  if(SITE_PREVIEW||!SITE_LEAD){cnToast('Aperçu : l\u2019envoi est actif sur la page publiée.');return false}
  var old=btn.textContent;btn.disabled=true;btn.textContent='Envoi…';
  payload.kind=SITE_LEAD.kind;payload.id=SITE_LEAD.id;payload.action='lead';
  fetch('/api/render-site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
   .then(function(r){return r.json().catch(function(){return {}}).then(function(j){return {ok:r.ok,j:j}})})
   .then(function(x){btn.disabled=false;btn.textContent=old;if(x.ok&&x.j.success){ok()}else{cnToast(x.j.error||'Envoi impossible, réessayez.')}})
   .catch(function(){btn.disabled=false;btn.textContent=old;cnToast('Connexion impossible, réessayez.')});
  return false}
(function(){var d=document.getElementById('bk-date');if(d){var t=new Date();t.setMinutes(t.getMinutes()-t.getTimezoneOffset());d.min=t.toISOString().slice(0,10)}})();
function cnBook(e){e.preventDefault();var f=document.getElementById('bk-form'),g=function(i){var el=document.getElementById(i);return el?el.value.trim():''};
  var p={type:'appointment',name:g('bk-name'),phone:g('bk-phone'),service:g('bk-service'),date:g('bk-date'),time:g('bk-time'),message:g('bk-msg'),hp:f.hp.value};
  if(!p.name||p.phone.length<6||!p.date||!p.time){cnToast('Remplissez nom, téléphone, date et heure.');return false}
  return cnSend(p,document.getElementById('bk-btn'),function(){f.hidden=true;document.getElementById('bk-done').hidden=false;
    var wa=document.getElementById('bk-wa');if(wa)wa.href=SITE_WA+'?text='+encodeURIComponent('Bonjour, je viens de demander un rendez-vous le '+p.date+' à '+p.time+' (au nom de '+p.name+').')})}
function cnNews(e){e.preventDefault();var f=document.getElementById('nl-form');var em=document.getElementById('nl-email').value.trim();
  if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$/.test(em)){cnToast('Adresse e-mail invalide.');return false}
  return cnSend({type:'newsletter',email:em,hp:f.hp.value},document.getElementById('nl-btn'),function(){f.hidden=true;document.getElementById('nl-ok').hidden=false})}
${panelJs(site)}
function sendSiteMessage(e){e.preventDefault();var n=document.getElementById('cf-name').value.trim(),m=document.getElementById('cf-msg').value.trim();if(!n||!m)return false;
  var txt='Bonjour, je suis '+n+'. '+m;
  if(SITE_WA){window.open(SITE_WA+'?text='+encodeURIComponent(txt),'_blank')}
  else if(SITE_MAIL){location.href='mailto:'+SITE_MAIL+'?subject='+encodeURIComponent('Message de '+n)+'&body='+encodeURIComponent(m)}
  return false}
(function(){var b=document.getElementById('promo-bar');if(!b||!b.getAttribute('data-until'))return;var c=document.getElementById('promo-count');var end=new Date(b.getAttribute('data-until')+'T23:59:59').getTime();function tick(){var d=end-Date.now();if(d<=0){b.style.display='none';return}var j=Math.floor(d/864e5),h=Math.floor(d%864e5/36e5),m=Math.floor(d%36e5/6e4);if(c)c.textContent=(j>0?j+' j ':'')+h+' h '+m+' min';setTimeout(tick,30000)}tick()})();
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
    if (!siteIsPremiumActive(site, 'publish')) return notFoundPage(res);
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

  const html = buildSiteHtml(site, slug, { lead: { kind: 'site', id: ownerUid } });
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
function businessIsProActive(b, key) {
  if (b && b.pro && b.proUntil && new Date(b.proUntil).getTime() > Date.now()) return true;
  const g = key && b && b.featureGrants && b.featureGrants[key];
  return !!(g && new Date(g).getTime() > Date.now());
}

async function renderBusinessPage(req, res, id) {
  if (!/^[A-Za-z0-9_-]{10,60}$/.test(id)) return notFoundPage(res);
  let b, reviews = [], followers = 0;
  try {
    const doc = await db.collection('businesses').doc(id).get();
    if (!doc.exists) return notFoundPage(res);
    b = doc.data();
    if (b.status !== 'active' || !businessIsProActive(b, 'web')) return notFoundPage(res);
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
  if (Array.isArray(b.branches) && b.branches.length) customSections.push({ title: 'Nos agences', body: b.branches.filter((x) => x && x.name).map((x) => `${x.name}${x.address ? ' — ' + x.address : ''}${x.phone ? ' · ' + x.phone : ''}`).join('\n') });
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
    booking: b.booking && typeof b.booking === 'object' ? b.booking : null,
    newsletter: b.newsletter && typeof b.newsletter === 'object' ? b.newsletter : null,
    team: Array.isArray(b.team) ? b.team : [],
    media: Array.isArray(b.media) ? b.media : [],
    jobs: Array.isArray(b.jobs) ? b.jobs : [],
    partners: Array.isArray(b.partners) ? b.partners : [],
    timeline: Array.isArray(b.timeline) ? b.timeline : [],
    status: 'published'
  };
  const html = buildSiteHtml(site, site.slug, { forcePremium: true, pagePath: `/e/${encodeURIComponent(id)}`, ctaLabel: b.ctaLabel, lead: { kind: 'biz', id } });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}


/* ---------- Partage : page publique avec aperçu riche (photo, titre, détails, marque Coeurnoh Universe) ----------
   Adresse : /p/<type>/<id>  (voir vercel.json). Les réseaux sociaux (WhatsApp, Facebook, Telegram, X…) lisent les balises
   Open Graph ; une personne qui clique est envoyée directement dans l'application (/?go=<type>:<id>). Dans le même fichier
   que le reste pour rester sous la limite de 12 fonctions serverless. Lecture seule : rien n'est écrit. */
const SHARE_KINDS = {
  pub: { col: 'publications', live: (d) => d.status === 'published' },
  job: { col: 'job_offers', live: (d) => d.status === 'active' },
  event: { col: 'events', live: (d) => d.status === 'active' },
  travel: { col: 'travel_spots', live: (d) => d.status === 'active' },
  immo: { col: 'properties', live: (d) => d.status !== 'archive' },
  course: { col: 'courses', live: (d) => d.status === 'active' },
  contest: { col: 'contests', live: (d) => d.status === 'approved' }
};
const SHARE_BADGE = { pub: 'Publication', job: 'Offre d’emploi', event: 'Événement', travel: 'Voyage et tourisme', immo: 'Immobilier', course: 'Cours', contest: 'Concours' };
function shareClean(v, n) { return String(v == null ? '' : v).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
function shareMoney(v, cur) {
  const n = Number(v); if (!Number.isFinite(n) || n <= 0) return '';
  const c = String(cur || 'USD').toUpperCase();
  return (c === 'USD' ? n.toLocaleString('fr-FR') + ' $' : n.toLocaleString('fr-FR') + ' ' + c);
}
function shareImage(u) {
  const x = String(u || '');
  if (!/^https:\/\//i.test(x)) return '';
  // Cloudinary : recadrage 1200x630 pour un bel aperçu sur tous les réseaux
  const m = x.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i);
  if (m && !/^(c_|w_|h_|f_|q_)/.test(m[2])) return m[1] + 'c_fill,w_1200,h_630,q_auto,f_jpg/' + m[2];
  return x;
}
function shareInfo(kind, d) {
  const first = (a) => (Array.isArray(a) && a.length ? (typeof a[0] === 'string' ? a[0] : (a[0] && a[0].url) || '') : '');
  let title = '', desc = '', image = '', price = '', meta = [];
  if (kind === 'pub') {
    title = shareClean(d.title || d.description, 90) || 'Publication sur Coeurnoh Universe';
    desc = shareClean(d.title ? d.description : '', 240);
    image = d.imageUrl || d.thumbnailUrl || '';
    price = shareMoney(d.price);
    if (d.sellerName) meta.push('Par ' + shareClean(d.sellerName, 40));
  } else if (kind === 'job') {
    title = shareClean(d.title, 90); desc = shareClean(d.description, 240);
    if (d.location) meta.push(shareClean(d.location, 50)); if (d.contractType) meta.push(shareClean(d.contractType, 30)); if (d.ownerName) meta.push(shareClean(d.ownerName, 40));
    if (!d.salaryHidden && d.salaryMin) price = shareMoney(d.salaryMin) + (d.salaryMax ? ' – ' + shareMoney(d.salaryMax) : '');
  } else if (kind === 'event') {
    title = shareClean(d.title, 90); desc = shareClean(d.description, 240); image = d.coverImage || '';
    if (d.startDate) { try { meta.push(new Date(d.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kinshasa' })); } catch (e) { /* ignore */ } }
    if (d.location) meta.push(shareClean(d.location, 60));
    const prices = (Array.isArray(d.ticketTypes) ? d.ticketTypes : []).map((t) => Number(t && t.price)).filter((n) => Number.isFinite(n));
    if (prices.length) { const mn = Math.min.apply(null, prices); price = mn === 0 ? 'Entrée gratuite' : 'Dès ' + shareMoney(mn); }
  } else if (kind === 'travel') {
    title = shareClean(d.title, 90); desc = shareClean(d.description, 240); image = first(d.photos);
    meta = [d.city, d.country].filter(Boolean).map((x) => shareClean(x, 40)); price = shareClean(d.priceIndication, 40);
  } else if (kind === 'immo') {
    title = shareClean(d.title, 90); desc = shareClean(d.description, 240); image = first(d.photos);
    price = shareMoney(d.price, d.currency) + (d.transactionType === 'location' ? ' / mois' : '');
    if (d.city) meta.push(shareClean(d.city, 40)); if (d.bedrooms) meta.push(d.bedrooms + ' chambres'); if (d.surfaceArea) meta.push(d.surfaceArea + ' m²');
  } else if (kind === 'course') {
    title = shareClean(d.title, 90); desc = shareClean(d.description, 240); image = d.coverImage || '';
    price = Number(d.price) > 0 ? shareMoney(d.price) : 'Gratuit'; if (d.level) meta.push(shareClean(d.level, 30)); if (d.ownerName) meta.push('Par ' + shareClean(d.ownerName, 40));
  } else if (kind === 'contest') {
    title = shareClean(d.title, 90); desc = shareClean(d.description, 240); image = d.coverImage || '';
    if (d.prize) price = 'Prix : ' + shareClean(d.prize, 60);
    if (d.endDate) { try { meta.push('Jusqu’au ' + new Date(d.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Africa/Kinshasa' })); } catch (e) { /* ignore */ } }
  }
  return { title: title || 'Coeurnoh Universe', desc, image: shareImage(image), price, meta: meta.filter(Boolean) };
}

function shareJsonLd(kind, d, info, url) {
  const base = { '@context': 'https://schema.org', url, name: info.title, description: info.desc || info.meta.join(' · ') || info.title };
  if (info.image) base.image = info.image;
  const prov = { '@type': 'Organization', name: 'Coeurnoh Universe', url: SITE_ORIGIN + '/' };
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
  const iso = (v) => { const t = new Date(v); return isNaN(t) ? null : t.toISOString(); };
  if (kind === 'pub') {
    const o = Object.assign({ '@type': 'Product' }, base);
    if (num(d.price)) o.offers = { '@type': 'Offer', price: num(d.price), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url };
    return o;
  }
  if (kind === 'event') {
    const o = Object.assign({ '@type': 'Event', eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode' }, base);
    if (iso(d.startDate)) o.startDate = iso(d.startDate);
    if (iso(d.endDate)) o.endDate = iso(d.endDate);
    if (d.location) o.location = { '@type': 'Place', name: shareClean(d.location, 80), address: shareClean(d.location, 120) };
    const prices = (Array.isArray(d.ticketTypes) ? d.ticketTypes : []).map((t) => Number(t && t.price)).filter((n) => Number.isFinite(n) && n >= 0);
    if (prices.length) o.offers = { '@type': 'Offer', price: Math.min.apply(null, prices), priceCurrency: 'USD', url, availability: 'https://schema.org/InStock' };
    o.organizer = prov;
    return o;
  }
  if (kind === 'job') {
    const o = Object.assign({ '@type': 'JobPosting', title: info.title, datePosted: iso(d.createdAt) || new Date().toISOString(), hiringOrganization: { '@type': 'Organization', name: shareClean(d.ownerName || 'Coeurnoh Universe', 60) } }, base);
    delete o.name;
    if (d.location) o.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: shareClean(d.location, 60) } };
    return o;
  }
  if (kind === 'immo') return Object.assign({ '@type': 'RealEstateListing' }, base);
  if (kind === 'course') return Object.assign({ '@type': 'Course', provider: prov }, base);
  if (kind === 'travel') return Object.assign({ '@type': 'TouristAttraction' }, base);
  return Object.assign({ '@type': 'WebPage', isPartOf: { '@type': 'WebSite', name: 'Coeurnoh Universe', url: SITE_ORIGIN + '/' } }, base);
}
/* ---------- Facture / reçu partageable : /p/facture/<id>?t=<jeton>[&r=<n>] ----------
   Lecture seule, protégée par un jeton secret propre à la facture (invoices.shareToken).
   Jamais indexée. Sans jeton valide -> page 404 générique. */
function fmtMoney(n, cur) {
  const v = Number(n) || 0;
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (cur === 'CDF' ? 'FC' : cur === 'USD' ? '$' : String(cur || ''));
}
function invoiceState(inv) {
  const total = Number(inv.total) || 0, paid = Math.min(total, (inv.payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0));
  if (inv.status === 'cancelled') return { key: 'cancelled', label: 'Annulée', paid, due: 0 };
  if (total > 0 && paid >= total - 0.005) return { key: 'paid', label: 'Payée', paid, due: 0 };
  const late = inv.dueDate && new Date(inv.dueDate + 'T23:59:59') < new Date();
  if (paid > 0) return { key: late ? 'late' : 'partial', label: late ? 'En retard' : 'Partiellement payée', paid, due: total - paid };
  return { key: late ? 'late' : 'open', label: late ? 'En retard' : 'À payer', paid, due: total };
}
function tokenOk(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length < 16 || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch (e) { return false; }
}
function buildInvoiceHtml(inv, id, receiptIdx) {
  const e = escapeHtml, st = invoiceState(inv), cur = inv.currency || 'USD';
  const iss = inv.issuer || {};
  const isReceipt = receiptIdx != null && (inv.payments || [])[receiptIdx];
  const pay = isReceipt ? inv.payments[receiptIdx] : null;
  const logo = /^https:\/\//.test(iss.logo || '') ? `<img class="logo" src="${escapeAttr(iss.logo)}" alt="">` : '';
  const rows = (inv.items || []).map((it) => `<tr><td>${e(it.desc)}</td><td class="n">${Number(it.qty) || 0}</td><td class="n">${fmtMoney(it.price, cur)}</td><td class="n">${fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0), cur)}</td></tr>`).join('');
  const fdate = (v) => { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); };
  const title = isReceipt ? `Reçu ${inv.number || ''}-R${receiptIdx + 1}` : `Facture ${inv.number || ''}`;
  const payRows = (inv.payments || []).map((p, i) => `<tr><td>${e(fdate(p.date))}</td><td>${e(p.method || '')}</td><td class="n">${fmtMoney(p.amount, cur)}</td><td class="n"><a href="?t=${encodeURIComponent(inv.shareToken)}&r=${i}">Reçu</a></td></tr>`).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${e(title)} — ${e(iss.name || 'Coeurnoh Universe')}</title>
<meta name="theme-color" content="#14263f">
<style>*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#14263f;font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:20px}
.sheet{max-width:760px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;box-shadow:0 10px 40px -18px rgba(20,38,63,.35);position:relative}
.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:3px solid #14263f;padding-bottom:18px;margin-bottom:20px}
.logo{max-height:56px;max-width:160px;display:block;margin-bottom:8px}h1{margin:0;font-size:1.5rem;letter-spacing:.02em}.sub{color:#5a6577;font-size:.86rem;line-height:1.5}
.pill{display:inline-block;padding:5px 12px;border-radius:999px;font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.paid{background:#e3f6ec;color:#0b7a50}.open{background:#e8f0fa;color:#1d4f91}.partial,.late{background:#fff3d6;color:#8a5a00}.late{background:#fde5e8;color:#b0182c}.cancelled{background:#e9edf3;color:#4a5568}
.two{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:22px}.two>div{flex:1;min-width:200px}.lbl{font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7a8699;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:.92rem}th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#7a8699;border-bottom:2px solid #14263f;padding:8px 4px}td{padding:9px 4px;border-bottom:1px solid #e5e9f0}.n{text-align:right;white-space:nowrap}th.n{text-align:right}
.tot{margin-left:auto;width:min(300px,100%);font-size:.95rem}.tot div{display:flex;justify-content:space-between;padding:5px 0}.tot .g{border-top:2px solid #14263f;font-weight:800;font-size:1.1rem;padding-top:9px;margin-top:4px}.tot .due{color:#b0182c;font-weight:800}
.note{margin-top:22px;font-size:.86rem;color:#5a6577;line-height:1.5;white-space:pre-wrap}.acts{max-width:760px;margin:14px auto;display:flex;gap:10px}.b{flex:1;display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:12px;background:#1d4f91;color:#fff;font-weight:700;text-decoration:none;border:0;font-size:.95rem;cursor:pointer}.b.s{background:#fff;color:#14263f}
.foot{text-align:center;color:#7a8699;font-size:.76rem;margin:16px 0 0}.rc{background:#f6f8fb;border-radius:12px;padding:16px;margin-bottom:18px}.rc b{font-size:1.4rem}
@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0;padding:0}.acts{display:none}}
@media(max-width:520px){.sheet{padding:20px}.top{flex-direction:column}}</style></head><body>
<div class="sheet"><div class="top"><div>${logo}<h1>${e(isReceipt ? 'REÇU DE PAIEMENT' : 'FACTURE')}</h1><div class="sub">N° ${e(isReceipt ? `${inv.number || ''}-R${receiptIdx + 1}` : inv.number || '')} · ${e(fdate(isReceipt ? pay.date : inv.createdAt))}${!isReceipt && inv.dueDate ? ` · Échéance ${e(fdate(inv.dueDate + 'T12:00:00'))}` : ''}</div></div>
<div style="text-align:right"><span class="pill ${st.key}">${e(isReceipt ? 'Paiement reçu' : st.label)}</span></div></div>
<div class="two"><div><div class="lbl">Émetteur</div><b>${e(iss.name || 'Coeurnoh Business')}</b><div class="sub">${e(iss.address || '')}${iss.phone ? '<br>' + e(iss.phone) : ''}${iss.email ? '<br>' + e(iss.email) : ''}${iss.taxId ? '<br>N° fiscal / RCCM : ' + e(iss.taxId) : ''}</div></div>
<div><div class="lbl">Client</div><b>${e(inv.clientName || 'Client')}</b><div class="sub">${e(inv.clientPhone || '')}</div></div></div>
${isReceipt ? `<div class="rc"><div class="lbl">Montant reçu</div><b>${fmtMoney(pay.amount, cur)}</b><div class="sub">Mode : ${e(pay.method || '—')} · Pour la facture ${e(inv.number || '')} d’un total de ${fmtMoney(inv.total, cur)}<br>Reste à payer : ${fmtMoney(Math.max(0, (Number(inv.total) || 0) - (inv.payments || []).slice(0, receiptIdx + 1).reduce((a, p) => a + (Number(p.amount) || 0), 0)), cur)}</div></div>` : ''}
<table><thead><tr><th>Description</th><th class="n">Qté</th><th class="n">Prix</th><th class="n">Total</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot"><div><span>Sous-total</span><span>${fmtMoney(inv.subtotal, cur)}</span></div>${inv.discountAmount ? `<div><span>Remise</span><span>-${fmtMoney(inv.discountAmount, cur)}</span></div>` : ''}${inv.taxAmount ? `<div><span>TVA (${Number(inv.taxRate) || 0} %)</span><span>${fmtMoney(inv.taxAmount, cur)}</span></div>` : ''}
<div class="g"><span>Total</span><span>${fmtMoney(inv.total, cur)}</span></div>${st.paid ? `<div><span>Déjà payé</span><span>${fmtMoney(st.paid, cur)}</span></div>` : ''}${st.due > 0 ? `<div class="due"><span>Reste à payer</span><span>${fmtMoney(st.due, cur)}</span></div>` : ''}</div>
${!isReceipt && payRows ? `<div class="lbl" style="margin-top:22px">Paiements reçus</div><table><tbody>${payRows}</tbody></table>` : ''}
${inv.notes ? `<div class="note">${e(inv.notes)}</div>` : ''}${!isReceipt && iss.payInfo ? `<div class="note"><b>Comment payer</b>\n${e(iss.payInfo)}</div>` : ''}</div>
<div class="acts"><button class="b" onclick="window.print()">Imprimer / Enregistrer en PDF</button>${isReceipt ? `<a class="b s" href="?t=${encodeURIComponent(inv.shareToken)}">Voir la facture</a>` : ''}</div>
<p class="foot">Document généré avec Coeurnoh Universe · ${e(SITE_ORIGIN.replace(/^https?:\/\//, ''))}</p></body></html>`;
}
async function renderInvoicePage(req, res, id) {
  const t = String(req.query.t || '');
  try {
    const doc = await db.collection('invoices').doc(id).get();
    const inv = doc.exists ? doc.data() : null;
    if (!inv || !tokenOk(inv.shareToken, t) || inv.shareEnabled === false) return notFoundPage(res);
    let ri = null;
    if (req.query.r !== undefined) { ri = parseInt(String(req.query.r), 10); if (!(ri >= 0) || !(inv.payments || [])[ri]) ri = null; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.status(200).send(buildInvoiceHtml(inv, id, ri));
  } catch (e) {
    console.error('[render-site] invoice:', e.message);
    return notFoundPage(res);
  }
}

async function renderSharePage(req, res, kind, id) {
  if (kind === 'facture' && /^[A-Za-z0-9_-]{6,80}$/.test(id)) return renderInvoicePage(req, res, id);
  const def = SHARE_KINDS[kind];
  if (!def || !/^[A-Za-z0-9_-]{6,80}$/.test(id)) return notFoundPage(res);
  let d;
  try {
    const doc = await db.collection(def.col).doc(id).get();
    if (!doc.exists) return notFoundPage(res);
    d = doc.data();
    if (!def.live(d)) return notFoundPage(res);
  } catch (e) {
    console.error('[render-site] share:', e.message);
    return notFoundPage(res);
  }
  const info = shareInfo(kind, d);
  const url = `${SITE_ORIGIN}/p/${kind}/${encodeURIComponent(id)}`;
  const appUrl = `${SITE_ORIGIN}/?go=${kind}:${encodeURIComponent(id)}`;
  const ogImage = info.image || `${SITE_ORIGIN}/og-image.jpg`;
  const desc = [info.price, info.meta.join(' · '), info.desc].filter(Boolean).join(' — ').slice(0, 200) || 'Découvre ça sur Coeurnoh Universe.';
  const e = escapeHtml;
  const html = `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(info.title)} — Coeurnoh Universe</title>
<meta name="description" content="${escapeAttr(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<script type="application/ld+json">${JSON.stringify(shareJsonLd(kind, d, info, url)).replace(/</g, '\\u003c')}</script>
<meta property="og:type" content="website"><meta property="og:site_name" content="Coeurnoh Universe">
<meta property="og:title" content="${escapeAttr(info.title)}"><meta property="og:description" content="${escapeAttr(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${escapeAttr(ogImage)}"><meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeAttr(info.title)}"><meta name="twitter:description" content="${escapeAttr(desc)}"><meta name="twitter:image" content="${escapeAttr(ogImage)}">
<meta name="theme-color" content="#14263f">
<link rel="icon" href="${SITE_ORIGIN}/icon-192-v2.png">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;background:#14263f;color:#14263f;font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif}
.brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800;font-size:1.05rem;margin-bottom:16px}.brand img{width:34px;height:34px;border-radius:9px}
.card{width:100%;max-width:440px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px -20px rgba(0,0,0,.6)}
.card img.cover{display:block;width:100%;aspect-ratio:1200/630;object-fit:cover;background:#e8edf3}
.body{padding:20px}.badge{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1d4f91;background:#e8f0fa;border-radius:999px;padding:4px 10px}
h1{font-size:1.35rem;line-height:1.25;margin:12px 0 6px}.price{font-weight:800;font-size:1.15rem;color:#1d4f91;margin:0 0 6px}.meta{font-size:.85rem;color:#5a6577;margin:0 0 10px}.desc{font-size:.92rem;line-height:1.55;color:#374151;margin:0 0 18px}
.btn{display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:14px;background:#1d4f91;color:#fff;font-weight:700;text-decoration:none;font-size:1rem}
.foot{margin-top:16px;font-size:.78rem;color:#9fb1c7;text-align:center}
</style></head><body>
<div class="brand"><img src="${SITE_ORIGIN}/icon-192-v2.png" alt="">Coeurnoh Universe</div>
<div class="card">
${info.image ? `<img class="cover" src="${escapeAttr(info.image)}" alt="">` : ''}
<div class="body"><span class="badge">${e(SHARE_BADGE[kind])}</span><h1>${e(info.title)}</h1>
${info.price ? `<p class="price">${e(info.price)}</p>` : ''}${info.meta.length ? `<p class="meta">${e(info.meta.join(' · '))}</p>` : ''}
${info.desc ? `<p class="desc">${e(info.desc)}</p>` : ''}
<a class="btn" id="open" href="${escapeAttr(appUrl)}">Ouvrir dans Coeurnoh Universe</a></div></div>
<p class="foot">Coeurnoh Universe · Services, boutique, emploi, formation et plus encore</p>
<script>if(!/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|preview|embed/i.test(navigator.userAgent||'')){setTimeout(function(){location.replace(${JSON.stringify(appUrl).replace(/</g, '\\u003c')})},60)}</script>
</body></html>`;
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
      bs.docs.filter((d) => businessIsProActive(d.data(), 'web')).forEach((d) => urls.push({ loc: `${SITE_ORIGIN}/e/${encodeURIComponent(d.id)}`, lastmod: new Date().toISOString().slice(0, 10) }));
    } catch (e) { /* secondaire */ }
    urls = urls.concat(snap.docs.map((d) => d.data()).filter((s) => s.slug && siteIsPremiumActive(s, 'publish')).map((s) => ({
      loc: `${SITE_ORIGIN}/s/${encodeURIComponent(s.slug)}`,
      lastmod: (s.updatedAt || s.createdAt || new Date().toISOString()).slice(0, 10)
    })));
    // Panels de croissance actifs : vitrine publique /panel/<adresse>
    urls = urls.concat(snap.docs.map((d) => d.data()).filter((s) => s.slug && s.mpanel && s.mpanel.on && siteIsPremiumActive(s, 'publish')).map((s) => ({
      loc: `${SITE_ORIGIN}/panel/${encodeURIComponent(s.slug)}`,
      lastmod: String((s.mpanel && s.mpanel.updatedAt) || s.updatedAt || s.createdAt || new Date().toISOString()).slice(0, 10)
    })));
  } catch (e) {
    console.error('[render-site] sitemap:', e.message);
  }
  // Pages publiques partageables (publications, evenements, emplois, immobilier, voyages, cours, concours)
  try {
    const parts = await Promise.all(Object.keys(SHARE_KINDS).map(async (k) => {
      try {
        const sn = await db.collection(SHARE_KINDS[k].col).limit(150).get();
        return sn.docs.filter((x) => { try { return SHARE_KINDS[k].live(x.data()); } catch (e) { return false; } })
          .map((x) => { const dd = x.data(); return { loc: `${SITE_ORIGIN}/p/${k}/${encodeURIComponent(x.id)}`, lastmod: String(dd.updatedAt || dd.createdAt || new Date().toISOString()).slice(0, 10) }; });
      } catch (e) { return []; }
    }));
    parts.forEach((l) => { urls = urls.concat(l); });
  } catch (e) { /* secondaire */ }
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

// ---------------- Rendez-vous et newsletter (v-pro20) ----------------
// Les visiteurs n'ont pas de compte : l'ecriture passe par le serveur (SDK admin),
// donc aucune regle Firestore a modifier. Collection "site_leads" (jamais lisible
// depuis le navigateur). Le proprietaire lit et gere ses demandes avec son jeton.
const LEAD_ACTIONS = ['lead', 'leads_list', 'leads_update'];
const sitePanel = createSitePanel({ db, admin, push: sendPushToUser });
// Commande visiteur (publique) : valide contre le catalogue publie, n'appelle jamais le fournisseur.
async function panelOrderApi(req, res, b) {
  try {
    const id = cleanText(b.id, 128);
    if (!id || /[\/]/.test(id)) return res.status(400).json({ error: 'Demande invalide.' });
    if (b.hp) return res.status(200).json({ success: true });
    await enforceRateLimit({ scope: 'site-panel-order', id: getClientIp(req), limit: 10, windowSec: 3600 });
    await enforceRateLimit({ scope: 'site-panel-order-target', id, limit: 300, windowSec: 86400 });
    const r = await sitePanel.publicOrder(id, b);
    return res.status(200).json({ success: true, total: r.total });
  } catch (e) {
    const code = e && e.status ? e.status : 500;
    return res.status(code).json({ error: code >= 500 ? 'Erreur serveur, réessayez.' : (e.message || 'Erreur') });
  }
}
const crypto = require('crypto');

async function leadsApi(req, res) {
  const b = getBody(req);
  const action = String(b.action || '');
  const json = (code, o) => res.status(code).json(o);
  try {
    if (action === 'lead') {
      const kind = b.kind === 'biz' ? 'biz' : 'site';
      const id = cleanText(b.id, 128);
      const type = b.type === 'newsletter' ? 'newsletter' : (b.type === 'appointment' ? 'appointment' : '');
      if (!id || !type || /[\/]/.test(id)) return json(400, { error: 'Demande invalide.' });
      if (b.hp) return json(200, { success: true }); // robot : on fait semblant
      const ip = getClientIp(req);
      await enforceRateLimit({ scope: 'site-lead', id: ip, limit: 10, windowSec: 3600 });
      await enforceRateLimit({ scope: 'site-lead-target', id: kind + ':' + id, limit: 200, windowSec: 86400 });

      let owner, label, cfg;
      if (kind === 'site') {
        const snap = await db.collection('mini_sites').doc(id).get();
        const d = snap.exists ? snap.data() : null;
        if (!d || d.status !== 'published' || !siteIsPremiumActive(d, 'publish')) return json(404, { error: 'Site introuvable.' });
        owner = id; label = d.businessName || 'votre site'; cfg = d;
      } else {
        const snap = await db.collection('businesses').doc(id).get();
        const d = snap.exists ? snap.data() : null;
        if (!d || !businessIsProActive(d, 'web')) return json(404, { error: 'Entreprise introuvable.' });
        owner = id; label = d.businessName || 'votre entreprise'; cfg = d;
      }
      const feature = type === 'appointment' ? cfg.booking : cfg.newsletter;
      if (!feature || !feature.enabled) return json(403, { error: 'Service non disponible.' });

      const nowIso = new Date().toISOString();
      const base = { ownerUid: owner, kind, type, status: 'new', createdAt: nowIso };
      let title, body, docRef;
      if (type === 'newsletter') {
        const email = cleanText(b.email, 120).toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json(400, { error: 'Adresse e-mail invalide.' });
        const key = crypto.createHash('sha1').update(email).digest('hex').slice(0, 24);
        docRef = db.collection('site_leads').doc(`nl_${kind}_${owner}_${key}`);
        const ex = await docRef.get();
        if (ex.exists) return json(200, { success: true });
        await docRef.set(Object.assign(base, { email }));
        title = '📬 Nouvel abonné newsletter'; body = email;
      } else {
        const name = cleanText(b.name, 60), phone = cleanText(b.phone, 30);
        const date = cleanText(b.date, 10), time = cleanText(b.time, 5);
        if (!name || phone.replace(/\D/g, '').length < 6) return json(400, { error: 'Nom et téléphone requis.' });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return json(400, { error: 'Date ou heure invalide.' });
        const t = Date.parse(date + 'T00:00:00Z');
        if (!isFinite(t) || t < Date.now() - 2 * 86400000 || t > Date.now() + 400 * 86400000) return json(400, { error: 'Choisissez une date à venir.' });
        docRef = db.collection('site_leads').doc();
        await docRef.set(Object.assign(base, { name, phone, service: cleanText(b.service, 80), date, time, message: cleanText(b.message, 400, { keepNewlines: true }) }));
        title = '📅 Nouveau rendez-vous'; body = `${name} · ${date} à ${time}`;
      }
      const url = '/?leads=' + kind;
      try {
        await db.collection('notifications').add({ uid: owner, title, body, type: 'lead', url, read: false, createdAt: nowIso });
        await sendPushToUser(owner, title, body, url, { category: 'activity' });
      } catch (e) { /* la demande est deja enregistree */ }
      return json(200, { success: true });
    }

    if (action === 'leads_list' || action === 'leads_update') {
      const caller = await verifyCaller(req);
      await enforceRateLimit({ scope: 'site-leads-owner', id: caller.uid, limit: 120, windowSec: 600 });
      if (action === 'leads_list') {
        const kind = b.kind === 'biz' ? 'biz' : 'site';
        const snap = await db.collection('site_leads').where('ownerUid', '==', caller.uid).limit(500).get();
        const items = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).filter((x) => x.kind === kind)
          .sort((a, c) => String(c.createdAt).localeCompare(String(a.createdAt))).slice(0, 300);
        return json(200, { success: true, items });
      }
      const leadId = cleanText(b.leadId, 128);
      if (!leadId || /[\/]/.test(leadId)) return json(400, { error: 'Demande invalide.' });
      const ref = db.collection('site_leads').doc(leadId);
      const d = await ref.get();
      if (!d.exists || d.data().ownerUid !== caller.uid) return json(404, { error: 'Introuvable.' });
      if (b.op === 'delete') { await ref.delete(); return json(200, { success: true }); }
      const st = ['new', 'confirmed', 'done', 'cancelled'].includes(b.status) ? b.status : null;
      if (!st) return json(400, { error: 'Statut invalide.' });
      await ref.update({ status: st, updatedAt: new Date().toISOString() });
      return json(200, { success: true });
    }
    return json(400, { error: 'Action inconnue.' });
  } catch (e) {
    const code = e && e.status ? e.status : 500;
    if (code >= 500) console.error('[render-site] leads:', e && e.message);
    return json(code, { error: code >= 500 ? 'Erreur serveur, réessayez.' : (e.message || 'Erreur') });
  }
}

// Compteur de visites / actions (public, anonyme, sans cookie). Toujours repond 204 : une statistique ne doit jamais gener le visiteur.
async function hitApi(req, res, b) {
  try {
    const ip = getClientIp(req);
    await enforceRateLimit({ scope: 'site-hit', id: ip, limit: 240, windowSec: 3600 });
    await recordHit(db, admin, { siteId: String(b.id || ''), ev: String(b.ev || '') });
  } catch (e) { /* silencieux */ }
  return res.status(204).end();
}

// =====================================================================
// PAGES DE DESTINATION (SEO) : /services, /services/<page> et /aide
// ---------------------------------------------------------------------
// Pages 100 % rendues cote serveur (aucune lecture en base, aucun JavaScript necessaire pour
// lire le contenu) : c'est ce que Google et Bing indexent. Une page par service, plus un
// centre d'aide. Chaque page a son titre, sa description, ses donnees structurees
// (WebPage + BreadcrumbList + FAQPage), ses liens vers les autres services et un bouton
// d'ouverture de l'application. Le parametre ?ref=<code> est conserve jusqu'a l'app (parrainage).
// Les textes decrivent uniquement ce que l'application propose reellement (aucun prix chiffre).
// =====================================================================
const LANDING_BADGES = {
  free: 'Gratuit pour commencer',
  option: 'Création gratuite · options Premium',
  pro: 'Création gratuite · options Pro',
  paid: 'Fonctions payantes selon l’usage'
};
const LANDINGS = [
  {
    slug: 'croissance-reseaux-sociaux', nav: 'Croissance réseaux sociaux', icon: '📈', badge: 'paid',
    title: 'Booster TikTok, Instagram, Facebook et YouTube',
    desc: 'Faites grandir vos comptes TikTok, Instagram, Facebook et YouTube depuis votre téléphone. Paiement Mobile Money, crypto ou carte partout en Afrique francophone.',
    intro: 'Passez votre commande en quelques touches, suivez-la depuis l’onglet Réseau et payez depuis votre portefeuille Coeurnoh. Trois niveaux de qualité (Standard, Premium, VIP) vous laissent choisir selon votre budget.',
    benefits: [
      ['Quatre grandes plateformes', 'TikTok, Instagram, Facebook et YouTube depuis une seule application, avec un catalogue clair par plateforme.'],
      ['Trois niveaux de qualité', 'Standard, Premium ou VIP : vous comparez les options et choisissez avant de payer.'],
      ['Paiement local', 'Rechargez votre portefeuille par Mobile Money (par pays et opérateur), crypto ou carte.'],
      ['Suivi des commandes', 'Chaque commande apparaît dans votre espace avec son état, et vous êtes prévenu par notification.'],
      ['Pour revendeurs', 'Une API revendeur est disponible pour les professionnels qui veulent intégrer le service à leur propre panel.']
    ],
    steps: ['Créez votre compte gratuit et ouvrez l’onglet Portefeuille.', 'Rechargez par Mobile Money, crypto ou carte.', 'Ouvrez l’onglet Réseau, choisissez la plateforme, le service et le niveau de qualité.', 'Collez le lien de votre compte ou de votre publication, puis validez la commande.'],
    faq: [
      ['Comment payer ?', 'Depuis le portefeuille de l’application : Mobile Money selon votre pays et votre opérateur, crypto-monnaie ou carte bancaire.'],
      ['Faut-il donner mon mot de passe ?', 'Non. Il suffit du lien public de votre compte ou de votre publication. Ne communiquez jamais votre mot de passe.'],
      ['Puis-je revendre le service ?', 'Oui, une API revendeur est proposée dans le menu de l’application pour les professionnels.']
    ],
    related: ['boutique-en-ligne', 'creer-un-site-web', 'outils-gratuits']
  },
  {
    slug: 'boutique-en-ligne', nav: 'Boutique en ligne', icon: '🛍️', badge: 'free',
    title: 'Boutique en ligne : acheter et vendre en toute confiance',
    desc: 'Vendez vos produits et achetez auprès d’autres membres sur la boutique Coeurnoh Universe : niveaux de vendeur, avis clients, retraits et paiement Mobile Money.',
    intro: 'La boutique réunit les produits publiés par les membres. Chaque vendeur progresse par niveaux (Bronze, Argent, Or, Diamant) et reçoit des avis d’acheteurs réels, ce qui aide les clients à choisir.',
    benefits: [
      ['Vendre depuis son téléphone', 'Publiez un produit avec photos et description, sans site ni logiciel à installer.'],
      ['Avis vérifiés', 'Seul un acheteur dont la commande est terminée peut laisser un avis : les notes restent crédibles.'],
      ['Niveaux de vendeur', 'Bronze, Argent, Or et Diamant valorisent les vendeurs réguliers et sérieux.'],
      ['Portefeuille et retraits', 'Les ventes alimentent votre portefeuille et vous pouvez demander un retrait.'],
      ['Alertes produits', 'Définissez une catégorie et un budget pour être prévenu des nouveaux produits qui correspondent.']
    ],
    steps: ['Créez un compte gratuit.', 'Parcourez la boutique ou publiez votre premier produit.', 'Payez avec votre portefeuille et suivez la commande.', 'Après réception, laissez un avis au vendeur.'],
    faq: [
      ['Qui peut vendre ?', 'Tout membre connecté peut publier ses produits depuis la section Vendre.'],
      ['Comment sont protégés les acheteurs ?', 'Les avis ne sont possibles qu’après une commande terminée, et chaque contenu peut être signalé à l’équipe.'],
      ['Comment récupérer mes gains ?', 'Depuis votre portefeuille, avec une demande de retrait traitée par l’équipe.']
    ],
    related: ['alertes-produits', 'factures-et-recus', 'croissance-reseaux-sociaux']
  },
  {
    slug: 'creer-un-site-web', nav: 'Crée ton site', icon: '🌐', badge: 'option',
    title: 'Créer un site web professionnel depuis son téléphone',
    desc: 'Créez votre mini-site en quelques minutes : vraie page publique indexable par Google, modèles, rendez-vous, boutique et statistiques. Gratuit pour commencer.',
    intro: 'Chaque site créé a sa propre adresse publique, une vraie page lisible par Google et Bing, qui s’affiche vite même avec une connexion lente. Vous gérez tout depuis l’application.',
    benefits: [
      ['Une vraie page publique', 'Adresse dédiée, titre et description uniques, partage WhatsApp avec aperçu : votre site peut être trouvé.'],
      ['Modèles prêts à l’emploi', 'Plusieurs styles de présentation (classique, nature, océan, royal…) à choisir en quelques touches.'],
      ['Sections au choix', 'Services, galerie, blog, avis, FAQ, contact : ajoutez ce dont votre activité a besoin.'],
      ['Contact direct', 'Boutons appel, e-mail et WhatsApp, prise de rendez-vous et formulaire de contact.'],
      ['Options Premium', 'Les fonctions avancées (publication référencée, personnalisation, nom de domaine préparé) sont proposées en option.']
    ],
    steps: ['Ouvrez Services puis Crée ton site.', 'Choisissez un modèle et remplissez votre activité.', 'Prévisualisez le rendu exact, puis publiez.', 'Partagez le lien sur vos réseaux et suivez les visites.'],
    faq: [
      ['Est-ce vraiment gratuit ?', 'La création et la prévisualisation sont gratuites. Des options Premium existent pour aller plus loin.'],
      ['Mon site apparaîtra-t-il sur Google ?', 'La page est conçue pour être indexée. La publication référencée fait partie des options Premium.'],
      ['Puis-je utiliser mon propre nom de domaine ?', 'Un système de nom de domaine personnalisé est prévu dans les paramètres de votre site.']
    ],
    related: ['entreprise-en-ligne', 'reservation-en-ligne', 'factures-et-recus']
  },
  {
    slug: 'entreprise-en-ligne', nav: 'Entreprises', icon: '🏢', badge: 'pro',
    title: 'Créer et présenter son entreprise en ligne',
    desc: 'Donnez une vitrine à votre entreprise : fiche publique, catalogue, publications, clients et cartes de fidélité depuis votre téléphone.',
    intro: 'Le service Entreprises donne à votre activité une fiche publique, un catalogue et un espace pour suivre vos clients, sans compétence technique.',
    benefits: [
      ['Fiche publique', 'Une page claire avec vos coordonnées et vos services, partageable en un lien.'],
      ['Publications', 'Annoncez vos nouveautés et promotions auprès de la communauté.'],
      ['Suivi des clients', 'Gardez la liste de vos clients et gérez vos relations depuis l’application.'],
      ['Fidélité', 'Des cartes de fidélité pour récompenser les clients réguliers.'],
      ['Options Pro', 'Les fonctions avancées de visibilité sont proposées en option.']
    ],
    steps: ['Ouvrez Services puis Entreprises.', 'Renseignez le nom, la catégorie et les coordonnées.', 'Ajoutez photos, catalogue et premières publications.', 'Partagez la fiche et recevez vos premiers clients.'],
    faq: [
      ['Faut-il payer pour créer ma fiche ?', 'Non, la création est gratuite. Des options Pro existent pour plus de visibilité.'],
      ['Ma fiche est-elle visible sur Google ?', 'Les fiches Pro actives sont proposées aux moteurs de recherche via le plan du site.'],
      ['Puis-je aussi avoir un site ?', 'Oui, le service Crée ton site complète la fiche entreprise.']
    ],
    related: ['creer-un-site-web', 'factures-et-recus', 'trouver-un-professionnel']
  },
  {
    slug: 'factures-et-recus', nav: 'Factures & Reçus', icon: '🧾', badge: 'free',
    title: 'Factures et reçus professionnels gratuits',
    desc: 'Créez et envoyez des factures et des reçus propres depuis votre téléphone, avec lien de partage et suivi des paiements. Gratuit.',
    intro: 'Établissez une facture ou un reçu en quelques touches, partagez-le par lien ou en PDF et gardez l’historique de tous vos documents.',
    benefits: [
      ['Documents propres', 'Une présentation soignée avec le nom de votre activité et le détail des lignes.'],
      ['Numérotation automatique', 'Vos factures sont numérotées sans effort.'],
      ['Partage simple', 'Envoyez un lien public ou un PDF à votre client par WhatsApp ou e-mail.'],
      ['Suivi des paiements', 'Notez les paiements reçus et voyez ce qui reste à encaisser.']
    ],
    steps: ['Ouvrez Services puis Factures & Reçus.', 'Ajoutez le client et les lignes.', 'Enregistrez et partagez le lien.', 'Marquez les paiements au fur et à mesure.'],
    faq: [
      ['Est-ce gratuit ?', 'Oui, le service est proposé gratuitement.'],
      ['Mes factures sont-elles publiques ?', 'Non. Seul le lien que vous partagez permet de les voir, et les pages de facture ne sont pas indexées.'],
      ['Puis-je retrouver d’anciennes factures ?', 'Oui, elles restent dans votre espace.']
    ],
    related: ['entreprise-en-ligne', 'creer-un-site-web', 'trouver-un-professionnel']
  },
  {
    slug: 'emploi-et-freelance', nav: 'Emploi & Freelance', icon: '💼', badge: 'free',
    title: 'Emploi et freelance : offres, candidatures et profils',
    desc: 'Publiez une offre d’emploi, postulez en un geste ou présentez votre profil de chercheur d’emploi ou de freelance. Gratuit en Afrique francophone.',
    intro: 'Recruteurs et candidats se retrouvent au même endroit. Une offre se publie en quelques minutes et chaque candidat ne peut postuler qu’une fois par offre.',
    benefits: [
      ['Publier une offre', 'Décrivez le poste, le lieu et la rémunération, puis suivez les candidatures reçues.'],
      ['Postuler simplement', 'Une candidature par offre, avec un suivi de son état.'],
      ['Profil de chercheur', 'Présentez vos compétences pour être trouvé par les recruteurs.'],
      ['Partage', 'Chaque offre a une page partageable avec aperçu sur WhatsApp et les réseaux.']
    ],
    steps: ['Créez un compte gratuit.', 'Ouvrez Services puis Emploi & Freelance.', 'Publiez une offre ou parcourez celles qui existent.', 'Postulez ou répondez aux candidats depuis l’application.'],
    faq: [
      ['Est-ce payant ?', 'La publication et la candidature sont gratuites.'],
      ['Puis-je postuler plusieurs fois à la même offre ?', 'Non, une seule candidature par offre est possible.'],
      ['Mon offre peut-elle être partagée ?', 'Oui, via un lien avec aperçu pour WhatsApp, Facebook et les autres réseaux.']
    ],
    related: ['academie-formations', 'trouver-un-professionnel', 'creer-un-site-web']
  },
  {
    slug: 'trouver-un-professionnel', nav: 'Trouver un professionnel', icon: '🛠️', badge: 'free',
    title: 'Trouver un professionnel et demander un devis',
    desc: 'Décrivez votre besoin, recevez des devis de professionnels et artisans, comparez et choisissez. Gratuit et simple depuis votre téléphone.',
    intro: 'Publiez une demande de service, recevez des devis de professionnels et acceptez celui qui vous convient. Les professionnels y trouvent de nouveaux clients.',
    benefits: [
      ['Une demande, plusieurs devis', 'Décrivez votre besoin une seule fois et comparez les réponses.'],
      ['Choix éclairé', 'Vous acceptez le devis de votre choix ; les avis aident à décider.'],
      ['Pour les professionnels', 'Répondez aux demandes qui correspondent à votre métier.'],
      ['Gratuit', 'Publier une demande ou un devis ne coûte rien.']
    ],
    steps: ['Ouvrez Services puis Trouver un professionnel.', 'Publiez votre demande avec les détails utiles.', 'Consultez les devis reçus.', 'Acceptez le devis choisi et laissez un avis ensuite.'],
    faq: [
      ['Qui voit ma demande ?', 'Les demandes sont visibles par les professionnels pour qu’ils puissent répondre.'],
      ['Puis-je refuser un devis ?', 'Oui, vous restez libre de choisir ou non.'],
      ['Je suis professionnel, comment participer ?', 'Créez un compte et répondez aux demandes ouvertes depuis la même section.']
    ],
    related: ['reservation-en-ligne', 'entreprise-en-ligne', 'emploi-et-freelance']
  },
  {
    slug: 'academie-formations', nav: 'Académie', icon: '🎓', badge: 'paid',
    title: 'Académie : cours en ligne, livres et formations',
    desc: 'Apprenez avec des cours et des livres, ou créez et vendez les vôtres. Inscriptions, progression par chapitres et avis d’apprenants.',
    intro: 'L’Académie réunit des cours et des livres publiés par la communauté. Les apprenants suivent leur progression chapitre par chapitre ; les créateurs publient et vendent leurs contenus.',
    benefits: [
      ['Cours par chapitres', 'Suivez votre avancement et reprenez où vous vous êtes arrêté.'],
      ['Livres', 'Des ouvrages publiés par leurs auteurs, avec avis des lecteurs.'],
      ['Devenir formateur', 'Publiez un cours ou un livre et touchez un public francophone.'],
      ['Avis réels', 'Seuls les inscrits ou acheteurs peuvent noter un cours ou un livre.']
    ],
    steps: ['Créez un compte gratuit.', 'Ouvrez Services puis Académie.', 'Inscrivez-vous à un cours ou achetez un livre.', 'Terminez les chapitres et laissez votre avis.'],
    faq: [
      ['Tout est-il payant ?', 'Cela dépend de chaque cours ou livre : certains contenus sont gratuits, d’autres payants.'],
      ['Puis-je publier mon propre cours ?', 'Oui, tout membre peut devenir formateur.'],
      ['Qui peut noter un cours ?', 'Seuls les apprenants inscrits, pour garder des avis fiables.']
    ],
    related: ['emploi-et-freelance', 'boutique-en-ligne', 'concours-et-recompenses']
  },
  {
    slug: 'immobilier', nav: 'Immobilier', icon: '🏠', badge: 'free',
    title: 'Immobilier : maisons, terrains et locations',
    desc: 'Publiez ou trouvez une maison, un appartement ou un terrain à vendre ou à louer. Annonces gratuites avec favoris et pages partageables.',
    intro: 'Publiez votre annonce avec photos, prix et lieu, ou parcourez les biens disponibles. Enregistrez vos favoris et partagez chaque annonce par lien.',
    benefits: [
      ['Annonces gratuites', 'Publier un bien ne coûte rien.'],
      ['Favoris', 'Gardez de côté les biens qui vous intéressent.'],
      ['Page partageable', 'Chaque annonce a sa page avec aperçu sur WhatsApp et Facebook.'],
      ['Contact direct', 'Échangez directement avec l’annonceur.']
    ],
    steps: ['Ouvrez Services puis Immobilier.', 'Parcourez les biens ou publiez le vôtre.', 'Ajoutez vos favoris.', 'Contactez l’annonceur depuis l’application.'],
    faq: [
      ['Les annonces sont-elles payantes ?', 'Non, la publication est gratuite.'],
      ['Puis-je vendre et louer ?', 'Oui, les deux types d’annonces sont possibles.'],
      ['Comment partager une annonce ?', 'Depuis la fiche du bien, avec un lien qui affiche un aperçu soigné.']
    ],
    related: ['pres-de-chez-vous', 'voyages-et-tourisme', 'trouver-un-professionnel']
  },
  {
    slug: 'voyages-et-tourisme', nav: 'Voyages', icon: '✈️', badge: 'free',
    title: 'Voyages et tourisme : découvrir et partager des lieux',
    desc: 'Découvrez des lieux à visiter, enregistrez vos favoris et partagez vos propres adresses touristiques en Afrique francophone.',
    intro: 'Parcourez les lieux partagés par la communauté, enregistrez ceux qui vous plaisent et publiez vos propres découvertes avec photos et description.',
    benefits: [
      ['Lieux à découvrir', 'Sites touristiques et adresses de sortie partagés par des membres.'],
      ['Favoris', 'Préparez votre voyage en gardant vos idées au même endroit.'],
      ['Publier un lieu', 'Faites connaître un endroit ou votre établissement touristique.'],
      ['Partage', 'Chaque lieu se partage avec un aperçu soigné.']
    ],
    steps: ['Ouvrez Services puis Voyages.', 'Explorez les lieux ou publiez le vôtre.', 'Ajoutez-les à vos favoris.', 'Partagez vos préférés avec vos proches.'],
    faq: [
      ['Est-ce gratuit ?', 'Oui, consulter et publier un lieu est gratuit.'],
      ['Puis-je promouvoir mon hôtel ou restaurant ?', 'Oui, publiez-le comme lieu et complétez-le avec une fiche entreprise.'],
      ['Y a-t-il une carte ?', 'Le service Près de chez vous affiche les lieux sur une carte.']
    ],
    related: ['pres-de-chez-vous', 'reservation-en-ligne', 'immobilier']
  },
  {
    slug: 'reservation-en-ligne', nav: 'Réservation en ligne', icon: '📅', badge: 'free',
    title: 'Réservation en ligne et prise de rendez-vous',
    desc: 'Réservez auprès d’un professionnel ou recevez des rendez-vous de vos clients, avec suivi de l’état des demandes. Gratuit.',
    intro: 'Les clients demandent un rendez-vous et le professionnel met à jour l’état de la réservation (en attente, confirmée…) directement dans l’application.',
    benefits: [
      ['Pour les clients', 'Demandez un rendez-vous sans appeler, et suivez la réponse.'],
      ['Pour les professionnels', 'Recevez et gérez vos demandes depuis votre téléphone.'],
      ['Suivi de l’état', 'Client et professionnel voient l’état de chaque réservation dans leur espace.'],
      ['Intégré à votre site', 'Le formulaire de rendez-vous s’ajoute à votre mini-site.']
    ],
    steps: ['Ouvrez Services puis Réservation en ligne.', 'Choisissez un professionnel et envoyez votre demande.', 'Suivez la réponse du professionnel dans l’application.', 'Présentez-vous au rendez-vous.'],
    faq: [
      ['Est-ce payant ?', 'Non, la demande de rendez-vous est gratuite.'],
      ['Qui peut modifier une réservation ?', 'Le client et le professionnel concernés, pour en changer l’état.'],
      ['Puis-je recevoir des rendez-vous sur mon site ?', 'Oui, via le formulaire de rendez-vous de votre mini-site.']
    ],
    related: ['creer-un-site-web', 'trouver-un-professionnel', 'entreprise-en-ligne']
  },
  {
    slug: 'pres-de-chez-vous', nav: 'Près de chez vous', icon: '📍', badge: 'free',
    title: 'Près de chez vous : services et lieux sur la carte',
    desc: 'Trouvez sur une carte les professionnels, entreprises et lieux autour de vous. Gratuit, depuis votre téléphone.',
    intro: 'Affichez sur une carte les services et lieux de votre quartier ou de votre ville pour trouver rapidement ce dont vous avez besoin.',
    benefits: [
      ['Carte interactive', 'Visualisez ce qui se trouve autour de vous.'],
      ['Services et lieux de la communauté', 'Les fiches et lieux publiés par les membres, à explorer sur la carte.'],
      ['Accès rapide', 'Ouvrez la fiche, contactez ou partagez en un geste.'],
      ['Votre position reste sous votre contrôle', 'Elle n’est utilisée que si vous autorisez la localisation.']
    ],
    steps: ['Ouvrez Services puis Près de chez vous.', 'Autorisez la localisation si vous le souhaitez.', 'Parcourez la carte et ouvrez une fiche.', 'Contactez ou partagez le lieu.'],
    faq: [
      ['Dois-je partager ma position ?', 'C’est facultatif : elle sert seulement à centrer la carte.'],
      ['Est-ce gratuit ?', 'Oui.'],
      ['Comment apparaître sur la carte ?', 'Créez une fiche entreprise ou publiez un lieu.']
    ],
    related: ['entreprise-en-ligne', 'voyages-et-tourisme', 'localisation-et-securite']
  },
  {
    slug: 'billetterie-evenements', nav: 'Événements & Billetterie', icon: '🎟️', badge: 'paid',
    title: 'Événements et billetterie en ligne',
    desc: 'Créez un événement, vendez vos billets et contrôlez les entrées avec un code. Concerts, fêtes, formations : tout depuis votre téléphone.',
    intro: 'Organisateurs et participants se retrouvent au même endroit : publication de l’événement, billets numériques et contrôle des entrées.',
    benefits: [
      ['Publier un événement', 'Date, lieu, description et visuel, avec une page partageable.'],
      ['Billets numériques', 'Chaque participant reçoit son billet dans l’application.'],
      ['Contrôle à l’entrée', 'Validez les billets avec un code pour éviter les doublons.'],
      ['Suivi pour l’organisateur', 'Voyez qui a acheté un billet pour votre événement.']
    ],
    steps: ['Ouvrez Services puis Événements & Billetterie.', 'Créez votre événement.', 'Partagez la page de l’événement.', 'Contrôlez les billets à l’entrée.'],
    faq: [
      ['La billetterie est-elle payante ?', 'Les événements gratuits sont possibles ; la vente de billets suit les conditions affichées dans l’application.'],
      ['Comment éviter les billets en double ?', 'Chaque billet est contrôlé par un code à l’entrée.'],
      ['Puis-je partager mon événement ?', 'Oui, avec un lien affichant un aperçu soigné sur WhatsApp et Facebook.']
    ],
    related: ['concours-et-recompenses', 'voyages-et-tourisme', 'creer-un-site-web']
  },
  {
    slug: 'concours-et-recompenses', nav: 'Concours & Récompenses', icon: '🏆', badge: 'paid',
    title: 'Concours en ligne et récompenses',
    desc: 'Organisez un concours, laissez la communauté voter et récompensez les gagnants. Un vote par personne, résultats transparents.',
    intro: 'Un concours est soumis à validation avant publication. Chaque participant vote une seule fois par candidat, ce qui garde les résultats équitables.',
    benefits: [
      ['Concours validés', 'Chaque concours est vérifié avant d’être publié.'],
      ['Un vote par personne', 'Le système empêche de gonfler les votes.'],
      ['Participation simple', 'S’inscrire et voter depuis le téléphone.'],
      ['Partage', 'Chaque concours se partage avec un aperçu pour attirer des participants.']
    ],
    steps: ['Ouvrez Services puis Concours & Récompenses.', 'Créez un concours ou participez à un concours existant.', 'Attendez la validation de l’équipe pour un nouveau concours.', 'Partagez et suivez le classement.'],
    faq: [
      ['Pourquoi une validation ?', 'Pour protéger les participants et éviter les concours trompeurs.'],
      ['Peut-on voter plusieurs fois ?', 'Non, un seul vote par candidat et par personne.'],
      ['Y a-t-il des frais ?', 'Cela dépend du type de concours, indiqué dans l’application avant de lancer.']
    ],
    related: ['billetterie-evenements', 'academie-formations', 'croissance-reseaux-sociaux']
  },
  {
    slug: 'alertes-produits', nav: 'Alertes', icon: '🔔', badge: 'free',
    title: 'Alertes : soyez prévenu des nouveaux produits',
    desc: 'Choisissez une catégorie et un budget et recevez une notification dès qu’un nouveau produit correspond. Gratuit.',
    intro: 'Créez une alerte et laissez l’application surveiller la boutique pour vous. Vous recevez une notification dès qu’un nouveau produit correspond à vos critères.',
    benefits: [
      ['Critères au choix', 'Catégorie, prix : toutes catégories et tous prix par défaut.'],
      ['Notifications', 'Un message sur votre téléphone, comme dans une application de messagerie.'],
      ['Privé', 'Vos alertes ne sont visibles que par vous.'],
      ['Gratuit', 'Créer et gérer ses alertes ne coûte rien.']
    ],
    steps: ['Ouvrez Services puis Alertes.', 'Créez une alerte avec vos critères.', 'Activez les notifications.', 'Ouvrez le produit dès qu’il apparaît.'],
    faq: [
      ['Combien d’alertes puis-je créer ?', 'Vous pouvez en créer et en supprimer librement depuis votre espace.'],
      ['Comment recevoir les notifications ?', 'Autorisez-les à l’installation de l’application sur votre téléphone.'],
      ['Mes alertes sont-elles publiques ?', 'Non, seules vous y avez accès.']
    ],
    related: ['boutique-en-ligne', 'croissance-reseaux-sociaux', 'outils-gratuits']
  },
  {
    slug: 'localisation-et-securite', nav: 'Localisation & SOS', icon: '🛰️', badge: 'free',
    title: 'Localisation, partage de position et SOS',
    desc: 'Partagez votre position en direct avec vos proches, ajoutez des contacts d’urgence et retrouvez vos appareils. Vous gardez le contrôle.',
    intro: 'Le Centre de localisation permet de partager votre position seulement avec les personnes que vous choisissez, pour la durée que vous décidez. Tout est refusé par défaut.',
    benefits: [
      ['Partage maîtrisé', 'Position en direct avec une personne ou par lien, avec une durée limitée que vous fixez.'],
      ['Contacts d’urgence', 'Un contact doit accepter avant de pouvoir recevoir votre alerte SOS.'],
      ['Appareils', 'Suivez vos propres appareils pour les retrouver en cas de perte.'],
      ['Historique privé', 'Visible par vous seul et supprimé automatiquement après un délai.'],
      ['Blocage', 'Vous pouvez bloquer une personne pour qu’elle ne puisse plus vous envoyer de demande.']
    ],
    steps: ['Ouvrez la Boîte à outils puis Localisation.', 'Créez votre profil de localisation.', 'Invitez une personne ou créez un lien à durée limitée.', 'Ajoutez vos contacts d’urgence et testez le SOS.'],
    faq: [
      ['Qui peut voir ma position ?', 'Uniquement les personnes à qui vous donnez l’accès, tant que le partage est actif.'],
      ['Puis-je arrêter à tout moment ?', 'Oui, un partage s’arrête ou expire, et chaque personne peut le supprimer.'],
      ['L’équipe peut-elle voir ma position ?', 'Non, la lecture des positions n’est pas ouverte à l’administration.']
    ],
    related: ['outils-gratuits', 'pres-de-chez-vous', 'voyages-et-tourisme']
  },
  {
    slug: 'outils-gratuits', nav: 'Boîte à outils gratuite', icon: '🧰', badge: 'free',
    title: 'Boîte à outils gratuite : QR code, WhatsApp, devises…',
    desc: 'QR code, lien WhatsApp, texte stylé, convertisseur de devises, hashtags, affiches et mockups : des outils gratuits pour créateurs et commerçants.',
    intro: 'Une boîte à outils 100 % gratuite pensée pour les créateurs, commerçants et entrepreneurs : tout est à portée de pouce, sans inscription compliquée.',
    benefits: [
      ['QR code', 'Générez un QR code pour votre lien, votre menu ou votre boutique.'],
      ['Lien WhatsApp', 'Créez un lien direct avec message prérempli pour vos clients.'],
      ['Texte stylé', 'Des polices originales pour vos biographies Instagram et TikTok.'],
      ['Devises', 'Convertissez dollar, franc congolais, FCFA et euro.'],
      ['Affiches et mockups', 'Créez une affiche de citation ou présentez un produit sur un support.'],
      ['Hashtags', 'Trouvez des hashtags adaptés à votre contenu.']
    ],
    steps: ['Ouvrez le menu de l’application.', 'Choisissez Boîte à outils.', 'Sélectionnez l’outil voulu.', 'Copiez, téléchargez ou partagez le résultat.'],
    faq: [
      ['Les outils sont-ils vraiment gratuits ?', 'Oui, toute la boîte à outils est gratuite.'],
      ['Faut-il un compte ?', 'Un compte gratuit permet d’accéder à l’application et à ses outils.'],
      ['Puis-je utiliser les images produites ?', 'Oui, elles sont à vous pour vos propres publications.']
    ],
    related: ['croissance-reseaux-sociaux', 'localisation-et-securite', 'creer-un-site-web']
  }
];
const LANDING_BY_SLUG = Object.create(null);
LANDINGS.forEach((l) => { LANDING_BY_SLUG[l.slug] = l; });

const HELP_FAQ = [
  ['Qu’est-ce que Coeurnoh Universe ?', 'Une application gratuite à installer sur le téléphone. Elle réunit la croissance sur les réseaux sociaux, une boutique, des mini-sites et entreprises, l’emploi, l’immobilier, les voyages, la billetterie, l’Académie et un centre de localisation.'],
  ['Comment créer un compte ?', 'Ouvrez l’application, choisissez « Créer un compte » et renseignez votre nom, votre e-mail et un mot de passe. Vous pouvez aussi vous connecter avec votre compte Google lorsque cette option est proposée.'],
  ['Comment installer l’application ?', 'Ouvrez le site dans Chrome (Android) ou Safari (iPhone), ouvrez le menu du navigateur puis choisissez « Ajouter à l’écran d’accueil » ou « Installer l’application ».'],
  ['Comment recharger mon portefeuille ?', 'Dans l’onglet Portefeuille, choisissez Mobile Money (selon votre pays et votre opérateur), crypto ou carte, indiquez le montant et suivez les instructions affichées.'],
  ['Mon paiement n’apparaît pas, que faire ?', 'Un délai peut venir de l’opérateur mobile. Patientez quelques minutes, actualisez l’application puis contactez le support avec la référence de la transaction si le solde ne bouge pas.'],
  ['Quels pays et quels moyens de paiement ?', 'Le Mobile Money est proposé dans de nombreux pays d’Afrique francophone selon l’opérateur, avec aussi la crypto-monnaie et la carte. Les options exactes s’affichent dans le portefeuille.'],
  ['Dans quelles langues est disponible l’application ?', 'Français, anglais, espagnol, italien et portugais. Changez la langue dans les paramètres.'],
  ['Comment gagner de l’argent avec le parrainage ?', 'Partagez votre lien de parrainage depuis l’application. Une commission est versée selon les conditions affichées dans la section Parrainage.'],
  ['Mes données sont-elles protégées ?', 'Les accès sont contrôlés compte par compte et les positions du Centre de localisation ne sont visibles que par les personnes que vous choisissez. Consultez la politique de confidentialité pour le détail.'],
  ['Comment contacter le support ?', 'Par WhatsApp au +243 825 001 290 ou depuis la page Contact. Indiquez votre nom d’utilisateur et décrivez le problème.'],
  ['Comment supprimer mon compte ou mes données ?', 'Contactez le support depuis la page Contact avec l’adresse e-mail du compte : nous traitons la demande conformément à la politique de confidentialité.']
];

function landingRefParam(req) {
  const r = String((req.query && req.query.ref) || '');
  return /^[A-Za-z0-9_-]{8,40}$/.test(r) ? r : '';
}
function landingAppUrl(ref, open) {
  const q = [];
  if (open) q.push('open=' + open);
  if (ref) q.push('ref=' + encodeURIComponent(ref));
  return SITE_ORIGIN + '/' + (q.length ? '?' + q.join('&') : '');
}
const LANDING_CSS = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:#f4f6fa;color:#14263f;font-family:Inter,-apple-system,'Segoe UI',Roboto,system-ui,sans-serif;line-height:1.6}
a{color:#1d4f91}.wrap{max-width:860px;margin:0 auto;padding:0 18px}
header.top{background:#14263f;color:#fff;position:sticky;top:0;z-index:5}header.top .wrap{display:flex;align-items:center;gap:10px;min-height:58px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;color:#fff;text-decoration:none;margin-right:auto}.brand img{width:32px;height:32px;border-radius:9px}
.pill{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:999px;background:#2bb673;color:#06281a;font-weight:800;text-decoration:none;border:0;font-size:.95rem;cursor:pointer;font-family:inherit}
.pill.ghost{background:transparent;color:inherit;border:1.5px solid currentColor}
.hero{background:linear-gradient(160deg,#14263f,#1d4f91);color:#fff;padding:34px 0 40px}
.crumbs{font-size:.82rem;opacity:.85;margin:0 0 14px}.crumbs a{color:#cfe0f5}
.tag{display:inline-block;font-size:.74rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:rgba(255,255,255,.16);border-radius:999px;padding:5px 12px}
h1{font-size:clamp(1.55rem,5.4vw,2.3rem);line-height:1.2;margin:14px 0 10px}.lead{font-size:1.05rem;opacity:.95;margin:0 0 20px;max-width:62ch}
.cta{display:flex;flex-wrap:wrap;gap:10px}
main section{padding:30px 0 4px}h2{font-size:1.35rem;margin:0 0 14px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,38,63,.06),0 8px 24px -16px rgba(20,38,63,.25)}.card h3{margin:0 0 6px;font-size:1.02rem}.card p{margin:0;color:#44546a;font-size:.94rem}
ol.steps{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:10px}ol.steps li{counter-increment:s;background:#fff;border-radius:14px;padding:14px 16px 14px 56px;position:relative;box-shadow:0 1px 2px rgba(20,38,63,.06)}
ol.steps li:before{content:counter(s);position:absolute;left:14px;top:12px;width:30px;height:30px;border-radius:50%;background:#1d4f91;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.trust{display:flex;flex-wrap:wrap;gap:8px 18px;color:#44546a;font-size:.88rem;margin-top:14px}.trust span:before{content:'✓ ';color:#2bb673;font-weight:800}.hero .trust{color:#d7e4f5}
details{background:#fff;border-radius:14px;margin:0 0 10px;box-shadow:0 1px 2px rgba(20,38,63,.06)}summary{cursor:pointer;padding:14px 16px;font-weight:700;list-style:none}summary::-webkit-details-marker{display:none}summary:after{content:'+';float:right;font-weight:800;color:#1d4f91}details[open] summary:after{content:'−'}details p{margin:0;padding:0 16px 16px;color:#44546a}
.links{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.links a{display:flex;gap:10px;align-items:center;background:#fff;border-radius:14px;padding:13px 15px;text-decoration:none;color:#14263f;font-weight:700;box-shadow:0 1px 2px rgba(20,38,63,.06)}.links a span{font-size:1.4rem}
.band{background:#14263f;color:#fff;border-radius:20px;padding:24px 20px;margin:30px 0;text-align:center}.band h2{margin-bottom:8px}.band p{margin:0 0 16px;opacity:.9}
footer.ft{background:#0c1a2b;color:#a9bad0;padding:28px 0 36px;margin-top:34px;font-size:.88rem}footer.ft a{color:#d7e4f5;text-decoration:none;margin-right:14px;display:inline-block;padding:4px 0}footer.ft p{margin:12px 0 0}
@media(min-width:700px){.hero{padding:52px 0 58px}}`;

function landingJsonLd(url, name, desc, crumbs, faq, extra) {
  const graph = [Object.assign({
    '@type': 'WebPage', '@id': url + '#page', url, name, description: desc, inLanguage: 'fr',
    isPartOf: { '@id': SITE_ORIGIN + '/#website' }, publisher: { '@id': SITE_ORIGIN + '/#organization' }
  }, extra || {}), {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] }))
  }];
  if (faq && faq.length) {
    graph.push({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } })) });
  }
  return safeJsonLd({ '@context': 'https://schema.org', '@graph': graph });
}
function landingShell(opts) {
  const e = escapeHtml;
  const url = SITE_ORIGIN + opts.path;
  const ogImage = SITE_ORIGIN + '/og-image.jpg';
  const footLinks = LANDINGS.map((l) => `<a href="/services/${l.slug}">${e(l.nav)}</a>`).join('');
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${e(opts.title)}</title>
<meta name="description" content="${escapeAttr(opts.desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="website"><meta property="og:site_name" content="Coeurnoh Universe">
<meta property="og:title" content="${escapeAttr(opts.title)}"><meta property="og:description" content="${escapeAttr(opts.desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${ogImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeAttr(opts.title)}"><meta name="twitter:description" content="${escapeAttr(opts.desc)}"><meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#14263f">
<link rel="icon" href="${SITE_ORIGIN}/icon-192-v2.png"><link rel="apple-touch-icon" href="${SITE_ORIGIN}/icon-192-v2.png">
<script type="application/ld+json">${opts.jsonld}</script>
<style>${LANDING_CSS}</style>
</head><body>
<header class="top"><div class="wrap"><a class="brand" href="/"><img src="/icon-192-v2.png" alt="" width="32" height="32">Coeurnoh Universe</a><a class="pill" href="${escapeAttr(opts.appUrl)}">Ouvrir l’app</a></div></header>
${opts.body}
<footer class="ft"><div class="wrap">
<strong style="color:#fff">Services</strong><br>${footLinks}<a href="/services">Tous les services</a><a href="/aide">Centre d’aide</a>
<p><a href="/about">À propos</a><a href="/terms">Conditions</a><a href="/privacy">Confidentialité</a><a href="/refund">Remboursement</a><a href="/contact">Contact</a><a href="https://wa.me/243825001290" rel="noopener">WhatsApp</a></p>
<p>© 2026 Coeurnoh Business — Coeurnoh Universe · Application congolaise (RDC) pour l’Afrique francophone.</p>
</div></footer>
<script>(function(){var b=document.getElementById('cn-share');if(!b)return;b.addEventListener('click',function(){var u=location.href.split('#')[0],t=document.title;if(navigator.share){navigator.share({title:t,url:u}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){b.textContent='Lien copié ✓'})}})})();</script>
</body></html>`;
}
function landingSend(res, html, status) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(status || 200).send(html);
}
function landingTrustStrip() {
  return '<div class="trust"><span>Application gratuite</span><span>Mobile Money, crypto et carte</span><span>Français, English, Español, Italiano, Português</span><span>Support WhatsApp</span></div>';
}
function landingRelatedLinks(slugs) {
  const e = escapeHtml;
  const items = slugs.map((s) => LANDING_BY_SLUG[s]).filter(Boolean);
  if (!items.length) return '';
  return `<section><h2>Découvrez aussi</h2><div class="links">${items.map((l) => `<a href="/services/${l.slug}"><span>${l.icon}</span>${e(l.nav)}</a>`).join('')}</div></section>`;
}

function renderLandingPage(req, res, slug) {
  const e = escapeHtml;
  const ref = landingRefParam(req);
  if (slug === 'index') return renderServicesHub(req, res, ref);
  if (slug === 'aide') return renderHelpPage(req, res, ref);
  const L = LANDING_BY_SLUG[slug];
  if (!L) return notFoundPage(res);
  const path = '/services/' + L.slug;
  const appUrl = landingAppUrl(ref, L.slug === 'outils-gratuits' ? 'tools' : 'services');
  const title = L.title + ' — Coeurnoh Universe';
  const crumbs = [['Accueil', SITE_ORIGIN + '/'], ['Services', SITE_ORIGIN + '/services'], [L.nav, SITE_ORIGIN + path]];
  const body = `<div class="hero"><div class="wrap">
<p class="crumbs"><a href="/">Accueil</a> › <a href="/services">Services</a> › ${e(L.nav)}</p>
<span class="tag">${L.icon} ${e(LANDING_BADGES[L.badge])}</span>
<h1>${e(L.title)}</h1><p class="lead">${e(L.intro)}</p>
<div class="cta"><a class="pill" href="${escapeAttr(appUrl)}">Commencer gratuitement</a><button type="button" class="pill ghost" id="cn-share">Partager cette page</button></div>
${landingTrustStrip()}
</div></div>
<main class="wrap">
<section><h2>Ce que vous pouvez faire</h2><div class="grid">${L.benefits.map((b) => `<div class="card"><h3>${e(b[0])}</h3><p>${e(b[1])}</p></div>`).join('')}</div></section>
<section><h2>Comment ça marche</h2><ol class="steps">${L.steps.map((s) => `<li>${e(s)}</li>`).join('')}</ol></section>
<section><h2>Questions fréquentes</h2>${L.faq.map((f) => `<details><summary>${e(f[0])}</summary><p>${e(f[1])}</p></details>`).join('')}</section>
${landingRelatedLinks(L.related)}
<div class="band"><h2>Prêt à essayer ?</h2><p>Créez votre compte gratuit et ouvrez ce service en quelques secondes.</p><a class="pill" href="${escapeAttr(appUrl)}">Ouvrir Coeurnoh Universe</a></div>
</main>`;
  return landingSend(res, landingShell({
    path, title, desc: L.desc, appUrl, body,
    jsonld: landingJsonLd(SITE_ORIGIN + path, title, L.desc, crumbs, L.faq.map((f) => [f[0], f[1]]), { about: L.nav })
  }));
}
function renderServicesHub(req, res, ref) {
  const e = escapeHtml;
  const path = '/services';
  const title = 'Tous les services Coeurnoh Universe — réseaux sociaux, boutique, site, emploi et plus';
  const desc = 'Découvrez tous les services de Coeurnoh Universe : croissance réseaux sociaux, boutique, création de site, emploi, immobilier, voyages, billetterie, Académie, localisation et outils gratuits.';
  const appUrl = landingAppUrl(ref, 'services');
  const crumbs = [['Accueil', SITE_ORIGIN + '/'], ['Services', SITE_ORIGIN + path]];
  const body = `<div class="hero"><div class="wrap">
<p class="crumbs"><a href="/">Accueil</a> › Services</p>
<h1>Tous les services Coeurnoh Universe</h1>
<p class="lead">Une seule application pour développer vos réseaux sociaux, vendre, créer votre site, trouver un emploi, un logement ou un professionnel, et bien plus.</p>
<div class="cta"><a class="pill" href="${escapeAttr(appUrl)}">Ouvrir l’application</a><button type="button" class="pill ghost" id="cn-share">Partager cette page</button></div>
${landingTrustStrip()}</div></div>
<main class="wrap"><section><h2>Choisissez un service</h2><div class="grid">${LANDINGS.map((l) => `<a class="card" href="/services/${l.slug}" style="text-decoration:none;color:inherit"><h3>${l.icon} ${e(l.nav)}</h3><p>${e(l.desc)}</p><p style="margin-top:8px;font-size:.8rem;font-weight:700;color:#1d4f91">${e(LANDING_BADGES[l.badge])}</p></a>`).join('')}</div></section>
<div class="band"><h2>Un besoin d’aide ?</h2><p>Notre centre d’aide répond aux questions les plus fréquentes.</p><a class="pill" href="/aide">Ouvrir le centre d’aide</a></div></main>`;
  const list = { '@type': 'CollectionPage', mainEntity: { '@type': 'ItemList', itemListElement: LANDINGS.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: l.nav, url: SITE_ORIGIN + '/services/' + l.slug })) } };
  return landingSend(res, landingShell({ path, title, desc, appUrl, body, jsonld: landingJsonLd(SITE_ORIGIN + path, title, desc, crumbs, null, list) }));
}
function renderHelpPage(req, res, ref) {
  const e = escapeHtml;
  const path = '/aide';
  const title = 'Centre d’aide — Coeurnoh Universe';
  const desc = 'Réponses aux questions fréquentes : créer un compte, installer l’application, recharger le portefeuille, payer par Mobile Money, parrainage, sécurité et support.';
  const appUrl = landingAppUrl(ref, 'services');
  const crumbs = [['Accueil', SITE_ORIGIN + '/'], ['Centre d’aide', SITE_ORIGIN + path]];
  const body = `<div class="hero"><div class="wrap">
<p class="crumbs"><a href="/">Accueil</a> › Centre d’aide</p>
<h1>Centre d’aide</h1><p class="lead">Les réponses aux questions les plus fréquentes sur Coeurnoh Universe. Vous ne trouvez pas ? Écrivez-nous sur WhatsApp.</p>
<div class="cta"><a class="pill" href="https://wa.me/243825001290" rel="noopener">Écrire au support</a><a class="pill ghost" href="${escapeAttr(appUrl)}">Ouvrir l’application</a></div></div></div>
<main class="wrap"><section><h2>Questions fréquentes</h2>${HELP_FAQ.map((f) => `<details><summary>${e(f[0])}</summary><p>${e(f[1])}</p></details>`).join('')}</section>
<section><h2>Explorer les services</h2><div class="links">${LANDINGS.slice(0, 8).map((l) => `<a href="/services/${l.slug}"><span>${l.icon}</span>${e(l.nav)}</a>`).join('')}</div></section>
<div class="band"><h2>Besoin d’un coup de main ?</h2><p>Indiquez votre nom d’utilisateur et décrivez le problème : nous vous répondons dès que possible.</p><a class="pill" href="/contact">Page contact</a></div></main>`;
  return landingSend(res, landingShell({ path, title, desc, appUrl, body, jsonld: landingJsonLd(SITE_ORIGIN + path, title, desc, crumbs, HELP_FAQ) }));
}



// ---- Panel de croissance gere : vitrine publique /panel/<adresse> (reference par Google) + catalogue JSON pour l'app ----
const managedPanel = createManagedPanel({ db, admin, push: sendPushToUser, loadCatalog: async (d) => resellerLib.loadCatalog(d, (await resellerLib.loadSettings(d)).discountPct) });
async function renderPanelStore(req, res, slug) {
  slug = String(slug || '').toLowerCase();
  let store;
  try { store = await managedPanel.publicStore(slug); }
  catch (err) {
    if (String(req.query.json || '') === '1') return res.status(err.status || 500).json({ success: false, error: err.message || 'Erreur' });
    return notFoundPage(res);
  }
  if (String(req.query.json || '') === '1') { res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60'); return res.status(200).json(store); }
  const e = escapeHtml, fmt = (n) => (Math.round(n * 1000) / 1000).toFixed(n < 1 ? 3 : 2).replace('.', ',') + ' $';
  const sh = store.shop, name = sh.name || 'Panel de croissance';
  const groups = {}; store.items.forEach((x) => { (groups[x.group] = groups[x.group] || []).push(x); });
  const rows = Object.keys(groups).map((g) => `<section><h2>${e(g)}</h2><div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(20,33,61,.08)">${groups[g].map((x) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e9edf4"><div><b>${e(x.name)}</b><div style="font-size:.78rem;color:#5b6475">${e(x.info)} · min ${x.min} · max ${x.max.toLocaleString('fr-FR')}</div></div><div style="font-weight:800;white-space:nowrap">${fmt(x.per1000)}<div style="font-size:.7rem;font-weight:400;color:#5b6475">/ 1000</div></div></div>`).join('')}</div></section>`).join('');
  const appUrl = `/?panel=${encodeURIComponent(slug)}`;
  const body = `<main class="wrap"><section class="hero" style="padding:28px 0 8px"><h1>${e(name)} — ${e(store.title)}</h1><p>${e(store.welcome || sh.tagline || 'Abonnés, likes, vues et plus : commande en quelques secondes, paiement simple par Mobile Money, carte ou crypto.')}</p><p><a class="pill" href="${appUrl}" style="display:inline-block;padding:12px 22px">Commander maintenant</a></p></section>${rows}<section><h2>Comment ça marche</h2><p>1. Crée ton compte gratuit et recharge ton solde.<br>2. Choisis le service, colle ton lien, indique la quantité.<br>3. La commande part automatiquement ; si elle n’aboutit pas, tu es remboursé automatiquement.</p></section></main>`;
  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Store', name, url: `${SITE_ORIGIN}/panel/${slug}`, description: store.title }).replace(/</g, '\\u003c');
  return landingSend(res, landingShell({ title: `${name} — ${store.title} | Coeurnoh Universe`, desc: `${name} : services de croissance pour réseaux sociaux. Prix clairs, paiement simple, remboursement automatique.`, path: `/panel/${slug}`, jsonld, appUrl, body }));
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const b = getBody(req);
    if (LEAD_ACTIONS.includes(String(b.action || ''))) return leadsApi(req, res);
    if (b.action === 'hit') return hitApi(req, res, b);
    if (b.action === 'panel_order') return panelOrderApi(req, res, b);
    return renderPreview(req, res);
  }
  if (req.query.pstore) return renderPanelStore(req, res, String(req.query.pstore));
  if (req.query.sitemap === '1') return renderSitemap(req, res);
  if (req.query.landing) return renderLandingPage(req, res, String(req.query.landing).toLowerCase());
  if (req.query.share) return renderSharePage(req, res, String(req.query.share), String(req.query.id || ''));
  if (req.query.biz) return renderBusinessPage(req, res, String(req.query.biz));
  const slug = String(req.query.slug || '').toLowerCase();
  return renderSitePage(req, res, slug);
};
