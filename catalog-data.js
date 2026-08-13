/* =========================================================
   CATALOGUE PARTAGÉ — plateformes, services, prix, forfaits
   Utilisé par le site public (script.js) ET l'admin (admin.js).
   Modifier un prix ici = modifier partout. Les prix peuvent
   aussi être surchargés depuis Firestore (collection "pricing")
   via applyPricingOverrides().

   MISE À JOUR : les lignes marquées "// MAJ ID xxxx (MoreThanPanel)"
   utilisent les vrais prix d'achat relevés sur MoreThanPanel,
   avec marges appliquées (+50% Standard / +100% Premium / +150% VIP).
   Les lignes marquées "// ⚠️ À VÉRIFIER" sont encore des prix
   d'exemple (pas de correspondance exacte trouvée dans les captures) :
   à corriger toi-même plus tard avec les vrais tarifs.
   ========================================================= */
const ICONS = {
  tiktok: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82c-1.02-.9-1.63-2.14-1.7-3.52h-3.13v13.4c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .58.05.85.13V9.75a6.15 6.15 0 0 0-.85-.06A6.11 6.11 0 0 0 2.8 15.8a6.11 6.11 0 0 0 6.07 6.1 6.11 6.11 0 0 0 6.07-6.1V9.02a9.34 9.34 0 0 0 4.79 1.32V7.2c-1.05 0-2.28-.5-3.13-1.38z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5h2V5.5h-2c-2.2 0-3.5 1.4-3.5 3.6V11H8v3h2.5v6h3v-6H16l.5-3h-3V9.3c0-.5.2-.8.9-.8z"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5l12.8 14h-2.4L4.6 5H6zm-.7 14L11 12.5 5.3 5H4l7.4 8.7L3.3 19h2z"/></svg>`,
  telegram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 4.3 3.4 11.2c-.9.35-.87 1.65.04 1.94l4.4 1.4 1.7 5.35c.25.78 1.24.95 1.75.3l2.5-3.1 4.55 3.36c.7.5 1.7.13 1.9-.72L23 5.4c.2-.9-.7-1.6-1.5-1.1zM8.8 13.7l8.6-6c.2-.14.4.1.2.3l-7 6.7-.3 3.3-1.5-4.3z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.3A9 9 0 1 0 12 3zm0 1.8a7.2 7.2 0 0 1 6.1 11l-.2.3.3 3.4-3.4-1-.3.1a7.2 7.2 0 1 1-2.5-13.8zm-3.5 3.9c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.15.2 2 3.1 4.9 4.2 2.4.9 2.9.7 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.15-1.4-.05-.1-.2-.2-.4-.35-.2-.1-1.3-.6-1.5-.7-.2-.1-.35-.15-.5.15-.15.3-.6.7-.7.85-.15.15-.25.15-.45.05-.2-.1-.9-.35-1.7-1.1-.6-.55-1.05-1.25-1.15-1.45-.15-.25 0-.35.1-.5.1-.1.2-.25.3-.4.1-.15.15-.25.2-.4.05-.15.05-.3 0-.4-.05-.1-.5-1.3-.7-1.75-.2-.45-.35-.4-.5-.4z"/></svg>`,
  snapchat: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5c2.6 0 4.4 1.9 4.4 4.4 0 1 0 2 .1 2.4.1.3.6.5 1.1.5.4 0 .8-.1 1-.1.3 0 .5.2.5.5s-.2.4-.5.6c-.4.2-1 .5-1 .9 0 .5 1.2 1.5 2.7 1.7.2 0 .4.2.3.5-.1.5-1 .8-1.9 1-.1.3-.2.6-.3.8-.1.2-.3.3-.6.3h-1c-.4 0-.7.1-1.1.4-.5.4-1.1.9-2.5.9s-2-.5-2.5-.9c-.4-.3-.7-.4-1.1-.4h-1c-.3 0-.5-.1-.6-.3-.1-.2-.2-.5-.3-.8-.9-.2-1.8-.5-1.9-1-.1-.3.1-.5.3-.5 1.5-.2 2.7-1.2 2.7-1.7 0-.4-.6-.7-1-.9-.3-.2-.5-.3-.5-.6s.2-.5.5-.5c.2 0 .6.1 1 .1.5 0 1-.2 1.1-.5.1-.4.1-1.4.1-2.4 0-2.5 1.8-4.4 4.4-4.4z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5H4V20h2.94V8.5zM5.47 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20 13.3c0-3-1.6-4.4-3.7-4.4-1.7 0-2.5 1-2.9 1.6V8.5H10.4c.04.9 0 11.5 0 11.5h2.94v-6.4c0-.35.03-.7.13-.95.28-.7.9-1.4 1.97-1.4 1.4 0 1.96 1.05 1.96 2.6v6.15H20v-6.7z"/></svg>`,
  pinterest: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5a8.5 8.5 0 0 0-3.1 16.4c-.05-.7-.1-1.8 0-2.6l1.1-4.9s-.3-.6-.3-1.4c0-1.35.8-2.35 1.75-2.35.8 0 1.2.6 1.2 1.35 0 .8-.5 2.05-.8 3.2-.25.95.5 1.75 1.4 1.75 1.7 0 2.85-2.2 2.85-4.8 0-2-1.35-3.5-3.8-3.5-2.8 0-4.5 2.05-4.5 4.35 0 .8.25 1.35.6 1.8.15.2.2.25.13.5-.05.15-.15.6-.2.75-.05.25-.25.35-.5.25-1.3-.55-1.9-1.95-1.9-3.55 0-2.65 2.2-5.8 6.6-5.8 3.5 0 5.9 2.55 5.9 5.3 0 3.6-2 6.3-4.95 6.3-1 0-1.9-.55-2.25-1.15l-.6 2.4c-.2.8-.6 1.6-.95 2.2A8.5 8.5 0 1 0 12 3.5z"/></svg>`,
  twitch: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3 3.5 6.6v12.7H8V22l3-2.7h3.6L19.5 15V3H5zm12.6 11.1-2.7 2.6h-3.6l-2.4 2.2v-2.2H5.9V4.9h11.7v9.2z"/><path d="M14.6 7.5h1.7v4.6h-1.7zM9.9 7.5h1.7v4.6H9.9z"/></svg>`,
  spotify: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5A9.5 9.5 0 1 0 21.5 12 9.5 9.5 0 0 0 12 2.5zm4.2 13.7a.6.6 0 0 1-.8.2c-2.2-1.35-5-1.65-8.3-.9a.6.6 0 1 1-.27-1.17c3.6-.82 6.7-.47 9.2 1.05a.6.6 0 0 1 .17.8zm1.1-2.65a.75.75 0 0 1-1.03.25c-2.5-1.55-6.3-2-9.25-1.1a.75.75 0 1 1-.44-1.44c3.4-1 7.6-.5 10.47 1.25a.75.75 0 0 1 .25 1.04zm.1-2.75C14.6 9 8.9 8.8 5.98 9.7a.9.9 0 1 1-.53-1.72c3.36-1 9.65-.77 13.3 1.4a.9.9 0 1 1-.93 1.54z"/></svg>`,
  discord: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 5.6a16 16 0 0 0-4-1.25l-.2.4a14 14 0 0 1 3.5 1.3 15.3 15.3 0 0 0-13.6 0 13 13 0 0 1 3.5-1.3l-.2-.4a16 16 0 0 0-4 1.25C2 9.7 1.3 13.6 1.6 17.5a16 16 0 0 0 4.8 2.4l.6-1a10 10 0 0 1-1.6-.8c.15-.1.3-.2.4-.3a11.5 11.5 0 0 0 9.9 0c.15.1.3.2.4.3-.5.3-1 .6-1.6.8l.6 1a16 16 0 0 0 4.8-2.4c.4-4.5-.7-8.3-2.4-11.9zM8.9 14.9c-.9 0-1.6-.85-1.6-1.9s.7-1.9 1.6-1.9 1.6.85 1.6 1.9-.7 1.9-1.6 1.9zm6.2 0c-.9 0-1.6-.85-1.6-1.9s.7-1.9 1.6-1.9 1.6.85 1.6 1.9-.7 1.9-1.6 1.9z"/></svg>`,
  threads: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.2 22c-2.9 0-5.2-.9-6.7-2.6-1.4-1.6-2.1-3.9-2.2-6.9v-.9c.1-3 .8-5.3 2.2-6.9C7 3 9.3 2 12.2 2c2.6 0 4.7.8 6.2 2.3 1.2 1.3 2 3 2.2 5l-1.9.4c-.15-1.6-.75-2.9-1.7-3.9-1.15-1.15-2.8-1.75-4.9-1.75-2.35 0-4.15.8-5.3 2.3-1 1.3-1.6 3.15-1.7 5.5v.3c.05 2.4.65 4.3 1.7 5.6 1.15 1.5 2.95 2.3 5.3 2.3 2 0 3.5-.5 4.5-1.5.85-.85 1.3-1.9 1.35-3.1-.5.3-1.15.5-2 .6a5 5 0 0 1-2.9-.4c-1.1-.5-1.75-1.4-1.75-2.5 0-1.2.7-2.15 1.9-2.65a5.5 5.5 0 0 1 3.3-.2c-.15-.65-.45-1.15-.9-1.5-.5-.4-1.2-.6-2-.6-1.1 0-2 .4-2.6 1.15l-1.5-1.1c.9-1.2 2.35-1.85 4.1-1.85 1.3 0 2.4.35 3.2 1 1 .8 1.55 2 1.6 3.5v.1c1.15.7 1.85 1.85 1.85 3.35 0 1.85-.85 3.35-2.35 4.4-1.35.9-3.05 1.35-4.95 1.35zm.85-8.85c-.75-.05-1.5.05-2.05.3-.55.25-.8.6-.8 1.05 0 .5.35.85.95 1.05.6.2 1.35.2 2-.05.75-.3 1.15-.9 1.2-1.8v-.35a4 4 0 0 0-1.3-.2z"/></svg>`,
  kwai: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h5.5l2 5 2-5H19l-4.5 8L19 20h-5.5l-2-5-2 5H4l4.5-8L4 4z"/></svg>`,
  likee: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10.1C4.5 7.4 6.6 5.3 9.2 5.3c1.4 0 2.6.7 3.3 1.8.7-1.1 1.9-1.8 3.3-1.8 2.6 0 4.7 2.1 4.7 5.1 0 5.5-7.5 10.1-7.5 10.1z"/></svg>`,
  reddit: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.3c0-1.2-1-2.2-2.2-2.2-.6 0-1.1.2-1.5.6-1.4-1-3.3-1.6-5.4-1.7l1-4.5 3.2.7c0 .9.7 1.6 1.6 1.6.9 0 1.6-.7 1.6-1.6s-.7-1.6-1.6-1.6c-.6 0-1.2.4-1.4.9l-3.6-.8c-.2 0-.4.1-.4.3l-1.1 5c-2.1.1-4 .7-5.4 1.7-.4-.4-.9-.6-1.5-.6-1.2 0-2.2 1-2.2 2.2 0 .9.5 1.6 1.2 2-.05.25-.05.5-.05.75 0 2.8 3.4 5.1 7.7 5.1s7.7-2.3 7.7-5.1c0-.25 0-.5-.05-.75.7-.4 1.15-1.15 1.15-2.05zM7.5 13.5c0-.7.6-1.3 1.3-1.3.7 0 1.3.6 1.3 1.3 0 .7-.6 1.3-1.3 1.3-.7 0-1.3-.6-1.3-1.3zm7.7 3.6c-.8.8-2 1.15-3.2 1.15s-2.4-.35-3.2-1.15c-.15-.15-.15-.4 0-.55.15-.15.4-.15.55 0 .6.6 1.6.9 2.65.9s2.05-.3 2.65-.9c.15-.15.4-.15.55 0 .15.15.15.4 0 .55zm-.4-2.3c-.7 0-1.3-.6-1.3-1.3 0-.7.6-1.3 1.3-1.3.7 0 1.3.6 1.3 1.3 0 .7-.6 1.3-1.3 1.3z"/></svg>`,
  soundcloud: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 10.2v7.3h9.8c1.7 0 3.1-1.4 3.1-3.1 0-1.7-1.35-3.05-3.05-3.1-.15-2.1-1.9-3.7-4-3.7-1.05 0-2 .4-2.7 1.05-.3-.3-.7-.45-1.1-.45-.9 0-1.6.7-1.6 1.6v.4zm-1.3 7.3V11c-.3-.1-.6-.15-.9-.15-.65 0-1.15.5-1.15 1.15v5.1c0 .35.25.6.6.6h1.45zm-2.7-.4v-4.2c-.6.1-1 .6-1 1.2v2.5c0 .35.25.65.6.65.15 0 .3-.05.4-.15z"/></svg>`
};

const PLATFORMS = [
  { id: "tiktok",    name: "TikTok",     bg: "#000000" },
  { id: "instagram", name: "Instagram",  bg: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" },
  { id: "youtube",   name: "YouTube",    bg: "#FF0000" },
  { id: "facebook",  name: "Facebook",   bg: "#1877F2" },
  { id: "twitter",   name: "X",          bg: "#000000" },
  { id: "telegram",  name: "Telegram",   bg: "#26A5E4" },
  { id: "whatsapp",  name: "WhatsApp",   bg: "#25D366" },
  { id: "snapchat",  name: "Snapchat",   bg: "#FFFC00", dark: true },
  { id: "linkedin",  name: "LinkedIn",   bg: "#0A66C2" },
  { id: "pinterest", name: "Pinterest",  bg: "#E60023" },
  { id: "twitch",    name: "Twitch",     bg: "#9146FF" },
  { id: "spotify",   name: "Spotify",    bg: "#1DB954" },
  { id: "discord",   name: "Discord",    bg: "#5865F2" },
  { id: "threads",   name: "Threads",    bg: "#000000" },
  { id: "kwai",      name: "Kwai",       bg: "#FF8000" },
  { id: "likee",     name: "Likee",      bg: "linear-gradient(135deg,#FE2C55,#FFC000)" },
  { id: "reddit",    name: "Reddit",     bg: "#FF4500" },
  { id: "soundcloud",name: "SoundCloud", bg: "#FF5500" }
];

/* Niveaux de qualité — le prix réel s'affiche désormais en $, plus de multiplicateur brut */
const QUALITY_TIERS = [
  { id: "standard", name: "Standard", mult: 1,    desc: "Bon rapport qualité-prix" },
  { id: "premium",  name: "Premium",  mult: 1.6,  desc: "Plus rapide, meilleure rétention" },
  { id: "vip",      name: "VIP",      mult: 2.5,  desc: "Ultra rapide, qualité maximale" }
];

/* Catalogue de services par plateforme — prix de vente ($ / 1000), min, max
   Marges appliquées sur le prix d'achat MoreThanPanel : Standard +50%, Premium +100%, VIP +150%. */
const SERVICE_CATALOG = {
  tiktok:    [
    { type:"followers", label:"Abonnés",       price:{standard:8.99,  premium:11.98, vip:14.98}, min:100, max:10000 }, // MAJ ID 2560 (MoreThanPanel) — achat $5.99
    { type:"likes",      label:"Likes",         price:{standard:0.77,  premium:1.02,  vip:1.28},  min:5,   max:1000  }, // MAJ ID 5737 (MoreThanPanel) — achat $0.51
    { type:"views",      label:"Vues",          price:{standard:0.21,  premium:0.28,  vip:0.35},  min:100, max:1000000 }, // MAJ ID 9742 (MoreThanPanel) — achat $0.14
    { type:"comments",   label:"Commentaires",  price:{standard:6.99,  premium:6.99,  vip:104.99}, min:1,  max:1000  }, // ⚠️ À VÉRIFIER (prix d'exemple)
    { type:"shares",     label:"Partages",      price:{standard:0.38,  premium:0.50,  vip:0.63},  min:5,  max:1000  } // MAJ ID 2572 (MoreThanPanel) — achat $0.25
  ],
  instagram: [
    { type:"followers", label:"Abonnés",       price:{standard:2.07, premium:2.76, vip:3.45}, min:100, max:50000 }, // MAJ ID 5787 (MoreThanPanel) — achat $1.38
    { type:"likes",      label:"Likes",         price:{standard:0.44, premium:0.58, vip:0.73}, min:100, max:100000 }, // MAJ ID 2518 (MoreThanPanel) — achat $0.29
    { type:"views",      label:"Vues Reels",    price:{standard:0.08, premium:0.10, vip:0.13}, min:500, max:500000 }, // MAJ ID 2524 (MoreThanPanel) — achat $0.05
    { type:"comments",   label:"Commentaires",  price:{standard:4.5,  premium:7.2,  vip:11.25}, min:20, max:5000 } // ⚠️ À VÉRIFIER (prix d'exemple)
  ],
  youtube:   [
    { type:"views",      label:"Vues",     price:{standard:3.05,  premium:4.06,  vip:5.08},  min:1000, max:1000000 }, // MAJ ID 8121 (MoreThanPanel) — achat $2.03
    { type:"followers",  label:"Abonnés",  price:{standard:30.23, premium:40.30, vip:50.38}, min:100,  max:20000 }, // MAJ ID 8355 (MoreThanPanel) — achat $20.15
    { type:"likes",      label:"Likes",    price:{standard:2.84,  premium:3.78,  vip:4.73},  min:50,   max:50000 }, // ⚠️ À VÉRIFIER — prix basé sur "Comment Likes" ID 912, pas "Likes vidéo" ; confirme avec MoreThanPanel
    { type:"watchtime",  label:"Watch Time (heures de visionnage)", price:{standard:0, premium:0, vip:0}, min:1000, max:100000 } // ⚠️ À CONFIGURER TOI-MÊME — aucune offre "Watch Time" trouvée chez MoreThanPanel dans les captures fournies. Prix vendu ici en $ / 1000 minutes de visionnage. Renseigne le prix réel dans l'onglet Tarifs de l'admin dès que tu as une source fiable (ex: un autre fournisseur spécialisé "4000 heures YouTube").
  ],
  facebook:  [
    { type:"followers", label:"Followers Page", price:{standard:0.77, premium:1.02, vip:1.28}, min:100, max:50000 }, // MAJ ID 9771 (MoreThanPanel) — achat $0.51
    { type:"likes",      label:"Likes Post",     price:{standard:1.5,  premium:2.4,  vip:3.75}, min:100, max:100000 }, // ⚠️ À VÉRIFIER (prix d'exemple)
    { type:"views",      label:"Vues",           price:{standard:0.24, premium:0.32, vip:0.40}, min:500, max:500000 }, // MAJ ID 9798 (MoreThanPanel) — achat $0.16
    { type:"shares",     label:"Partages",       price:{standard:1.13, premium:1.50, vip:1.88}, min:50,  max:5000000 } // MAJ ID 9318 (MoreThanPanel) — achat $0.75 (Split Delivery)
  ],
  twitter:   [
    { type:"followers", label:"Abonnés",  price:{standard:6.53, premium:8.70, vip:10.88}, min:100, max:50000 }, // MAJ ID 2596 (MoreThanPanel) — achat $4.35
    { type:"likes",      label:"Likes",    price:{standard:6.53, premium:8.70, vip:10.88}, min:50,  max:50000 }, // MAJ ID 5802 (MoreThanPanel) — achat $4.35
    { type:"shares",     label:"Retweets", price:{standard:4.34, premium:5.78, vip:7.23},  min:50,  max:10000000 }, // MAJ ID 3308 (MoreThanPanel) — achat $2.89 (Refill 7 jours, plus fiable que l'option "No Refill" à $1.19)
    { type:"views",      label:"Vues",     price:{standard:0.03, premium:0.04, vip:0.05},  min:100, max:10000000 } // MAJ ID 2990 (MoreThanPanel) — achat $0.02 (Tweet/Vidéo Views)
  ],
  telegram:  [
    { type:"followers", label:"Membres",     price:{standard:3.90, premium:5.20, vip:6.50}, min:100, max:100000 }, // MAJ ID 3521 (MoreThanPanel) — achat $2.60
    { type:"views",      label:"Vues Post",   price:{standard:0.23, premium:0.30, vip:0.38}, min:10, max:300000 } // MAJ ID 2951 (MoreThanPanel) — achat $0.15 ("Last 50 Post"). D'autres variantes existent (ID 8499-8508, "Future Post") avec prix différents selon nombre de posts futurs — à ajuster si tu préfères ce mode.
  ],
  whatsapp:  [
    { type:"followers", label:"Abonnés Chaîne", price:{standard:25.02, premium:33.36, vip:41.70}, min:100, max:20000 }, // MAJ ID 4885 (MoreThanPanel) — achat $16.68
    { type:"views",      label:"Vues Statut",    price:{standard:1.0,   premium:1.6,   vip:2.5},   min:100, max:50000 } // ⚠️ À VÉRIFIER (prix d'exemple)
  ],
  snapchat:  [
    { type:"followers", label:"Abonnés",   price:{standard:24.57, premium:32.76, vip:40.95}, min:100, max:20000 }, // MAJ ID 8384 (MoreThanPanel) — achat $16.38
    { type:"views",      label:"Vues Story",price:{standard:1.2,   premium:1.92,  vip:3.0},   min:200, max:100000 } // ⚠️ À VÉRIFIER (prix d'exemple)
  ],
  linkedin:  [
    { type:"followers", label:"Abonnés",     price:{standard:32.63, premium:43.50, vip:54.38}, min:100, max:20000 }, // MAJ ID 5467 (MoreThanPanel) — achat $21.75
    { type:"likes",      label:"Likes Post",  price:{standard:17.40, premium:23.20, vip:29.00}, min:20, max:10000 } // MAJ ID 5472 (MoreThanPanel) — achat $11.60
  ],
  pinterest: [
    { type:"followers", label:"Abonnés", price:{standard:25.02, premium:33.36, vip:41.70}, min:100, max:30000 }, // MAJ ID 2922 (MoreThanPanel) — achat $16.68
    { type:"repins",     label:"Repins",  price:{standard:1.5,   premium:2.4,   vip:3.75},  min:50,  max:10000 } // ⚠️ À VÉRIFIER (prix d'exemple)
  ],
  twitch:    [
    { type:"followers", label:"Abonnés", price:{standard:0.21, premium:0.28, vip:0.35}, min:50,  max:20000 }, // MAJ ID 7189 (MoreThanPanel) — achat $0.14
    { type:"views",      label:"Vues VOD",price:{standard:1.0,  premium:1.6,  vip:2.5},  min:200, max:100000 } // ⚠️ À VÉRIFIER (prix d'exemple)
  ],
  spotify:   [
    { type:"views",      label:"Écoutes", price:{standard:0.89, premium:1.18, vip:1.48}, min:500, max:500000 }, // MAJ ID 2549 (MoreThanPanel) — achat $0.59
    { type:"followers",  label:"Abonnés", price:{standard:0.30, premium:0.40, vip:0.50}, min:100, max:100000000 } // MAJ ID 4502 (MoreThanPanel) — achat $0.20 (Playlist-User-Artist, Lifetime Guarantee)
  ],
  discord:   [
    { type:"followers", label:"Membres", price:{standard:2.72, premium:3.62, vip:4.53}, min:50, max:20000 } // MAJ ID 7344 (MoreThanPanel) — achat $1.81
  ],
  threads:   [
    { type:"followers", label:"Abonnés", price:{standard:29.37, premium:39.16, vip:48.95}, min:100, max:30000 }, // MAJ ID 2775 (MoreThanPanel) — achat $19.58
    { type:"likes",      label:"Likes",   price:{standard:16.86, premium:22.48, vip:28.10}, min:50,  max:50000 } // MAJ ID 2776 (MoreThanPanel) — achat $11.24
  ],
  kwai:      [
    { type:"followers", label:"Abonnés", price:{standard:0.68, premium:0.90, vip:1.13}, min:100, max:50000 }, // MAJ ID 9612 (MoreThanPanel) — achat $0.45
    { type:"likes",      label:"Likes",   price:{standard:0.33, premium:0.44, vip:0.55}, min:100, max:100000 }, // MAJ ID 9614 (MoreThanPanel) — achat $0.22
    { type:"views",      label:"Vues",    price:{standard:0.5,  premium:0.8,  vip:1.25}, min:500, max:1000000 } // ⚠️ À VÉRIFIER (prix d'exemple)
  ],
  likee:     [
    // ⚠️ LIKEE N'A PAS D'ID CHEZ MORETHANPANEL — ces prix sont fictifs (placeholders).
    // Solution : trouver un autre fournisseur pour Likee, ou retirer ce réseau du site en attendant.
    { type:"followers", label:"Abonnés", price:{standard:2.2, premium:3.52, vip:5.5},  min:100, max:50000 },
    { type:"likes",      label:"Likes",   price:{standard:1.1, premium:1.76, vip:2.75}, min:100, max:100000 },
    { type:"views",      label:"Vues",    price:{standard:0.5, premium:0.8,  vip:1.25}, min:500, max:500000 }
  ],
  reddit:    [
    { type:"followers", label:"Membres", price:{standard:3.60, premium:4.80, vip:6.00}, min:50, max:20000 }, // MAJ ID 8039 (MoreThanPanel) — achat $2.40
    { type:"likes",      label:"Upvotes", price:{standard:19.58, premium:26.10, vip:32.63}, min:100, max:15000 } // MAJ ID 7339 (MoreThanPanel) — achat $13.05
  ],
  soundcloud:[
    { type:"views",      label:"Écoutes", price:{standard:1.50,  premium:2.00,  vip:2.50},  min:500, max:500000 }, // MAJ ID 9910 (MoreThanPanel) — achat $1.00
    { type:"followers",  label:"Abonnés", price:{standard:18.63, premium:24.84, vip:31.05}, min:100, max:20000 }, // MAJ ID 2198 (MoreThanPanel) — achat $12.42
    { type:"likes",      label:"Likes",   price:{standard:18.84, premium:25.12, vip:31.40}, min:100, max:50000 } // MAJ ID 2205 (MoreThanPanel) — achat $12.56
  ]
};

/* =========================================================
   FORFAITS À QUANTITÉS FIXES (style MoreThanPanel)
   Ex: "200 Abonnés + 200 Likes + 200 Vues" — un seul prix, un clic.
   Par défaut (price: null), le prix additionne chaque composant à son
   tarif Standard, avec 10% de remise. Si "price" est rempli (ex: par
   l'admin dans l'onglet Packages), CE prix remplace le calcul automatique.
   ========================================================= */
const BUNDLES = {
  tiktok:    [ { price:null, items:[{type:"followers",qty:200},{type:"likes",qty:200},{type:"views",qty:200}] }, { price:null, items:[{type:"followers",qty:500},{type:"likes",qty:500},{type:"views",qty:1000}] } ],
  instagram: [ { price:null, items:[{type:"followers",qty:200},{type:"likes",qty:200},{type:"views",qty:200}] }, { price:null, items:[{type:"followers",qty:500},{type:"likes",qty:500}] } ],
  youtube:   [ { price:null, items:[{type:"followers",qty:100},{type:"views",qty:500},{type:"likes",qty:100}] } ],
  facebook:  [ { price:null, items:[{type:"followers",qty:200},{type:"likes",qty:200},{type:"views",qty:200}] } ],
  twitter:   [ { price:null, items:[{type:"followers",qty:200},{type:"likes",qty:200},{type:"shares",qty:100}] } ],
  telegram:  [ { price:null, items:[{type:"followers",qty:300},{type:"views",qty:500}] } ],
  whatsapp:  [ { price:null, items:[{type:"followers",qty:200},{type:"views",qty:300}] } ],
  snapchat:  [ { price:null, items:[{type:"followers",qty:200},{type:"views",qty:300}] } ],
  linkedin:  [ { price:null, items:[{type:"followers",qty:100},{type:"likes",qty:100}] } ],
  pinterest: [ { price:null, items:[{type:"followers",qty:200},{type:"repins",qty:200}] } ],
  twitch:    [ { price:null, items:[{type:"followers",qty:100},{type:"views",qty:300}] } ],
  spotify:   [ { price:null, items:[{type:"views",qty:1000},{type:"followers",qty:200}] } ],
  discord:   [ { price:null, items:[{type:"followers",qty:200}] } ],
  threads:   [ { price:null, items:[{type:"followers",qty:200},{type:"likes",qty:200}] } ],
  kwai:      [ { price:null, items:[{type:"followers",qty:200},{type:"likes",qty:200},{type:"views",qty:200}] } ],
  likee:     [ { price:null, items:[{type:"followers",qty:200},{type:"likes",qty:200},{type:"views",qty:200}] } ],
  reddit:    [ { price:null, items:[{type:"followers",qty:100},{type:"likes",qty:100}] } ],
  soundcloud:[ { price:null, items:[{type:"views",qty:1000},{type:"followers",qty:200},{type:"likes",qty:200}] } ]
};
function bundlePrice(platformId, bundle) {
  if (bundle.price != null) return bundle.price; // prix fixé manuellement par l'admin
  const services = SERVICE_CATALOG[platformId] || [];
  const total = bundle.items.reduce((sum, item) => {
    const s = services.find(x => x.type === item.type);
    return s ? sum + (item.qty / 1000) * s.price.standard : sum;
  }, 0);
  return total * 0.9; // 10% de remise sur les forfaits groupés
}
/* Applique les prix de packages personnalisés (admin, onglet "Packages") par-dessus BUNDLES. */
function applyBundlePricingOverrides(overrides) {
  if (!overrides) return;
  Object.keys(overrides).forEach(platformId => {
    const bundles = BUNDLES[platformId];
    if (!bundles) return;
    overrides[platformId].forEach(o => {
      if (bundles[o.index]) bundles[o.index].price = o.price;
    });
  });
}

/* =========================================================
   MONÉTISATION — services spéciaux liés à la monétisation
   (ex: vues qui comptent pour le programme de monétisation
   YouTube/TikTok, abonnés utilisables pour le seuil requis...).
   Séparé de SERVICE_CATALOG car ce ne sont pas des services
   "classiques" par plateforme, mais des services à part.
   ========================================================= */
const MONETIZATION_SERVICES = [
  {
    id: "yt-monetized-views",
    platformId: "youtube",
    label: "Vues Monétisables (Non Drop)",
    description: "Vues qui comptent pour la monétisation YouTube, Non Drop, Speed 10-100K/Day",
    price: { standard: 4.32, premium: 5.76, vip: 7.20 } // MAJ ID 9903 (MoreThanPanel) — achat $2.88
  },
  {
    id: "yt-subscribers-monetizable",
    platformId: "youtube",
    label: "Abonnés (compatibles seuil de monétisation)",
    description: "Abonnés réels, utilisables pour atteindre le seuil de monétisation YouTube",
    price: { standard: 30.23, premium: 40.30, vip: 50.38 } // même base que ID 8355
  },
  {
    id: "yt-watch-time",
    platformId: "youtube",
    label: "Watch Time (4000 Heures)",
    description: "Heures de visionnage nécessaires à la monétisation. ⚠️ Prix à définir toi-même (varie selon durée de vidéo)",
    price: { standard: 0, premium: 0, vip: 0 } // ⚠️ À CONFIGURER — aucun prix confirmé dans les captures fournies
  },
  {
    id: "tiktok-monetization-views",
    platformId: "tiktok",
    label: "Vues Monétisables",
    description: "Vues comptant pour le programme de monétisation TikTok. ⚠️ Prix à définir toi-même",
    price: { standard: 0, premium: 0, vip: 0 } // ⚠️ À CONFIGURER — aucun prix confirmé dans les captures fournies
  }
];
/* Applique les prix Monétisation personnalisés (admin) par-dessus MONETIZATION_SERVICES. */
function applyMonetizationOverrides(updated) {
  if (!updated) return;
  updated.forEach(o => {
    const s = MONETIZATION_SERVICES.find(x => x.id === o.id);
    if (s && o.price) s.price = o.price;
  });
}
function bundleLabel(platformId, bundle) {
  const services = SERVICE_CATALOG[platformId] || [];
  return bundle.items.map(item => {
    const s = services.find(x => x.type === item.type);
    return `${item.qty.toLocaleString('fr-FR')} ${s ? s.label : item.type}`;
  }).join(' + ');
}

function platformBadgeHTML(p) {
  const color = p.dark ? 'color:#111' : 'color:#fff';
  return `<div class="p-icon" style="background:${p.bg};${color}">${ICONS[p.id] || p.name[0]}</div>`;
}

/* Applique les prix personnalisés enregistrés par l'admin (Firestore) par-dessus les prix par défaut. */
function applyPricingOverrides(overrides) {
  if (!overrides) return;
  Object.keys(overrides).forEach(platformId => {
    const services = SERVICE_CATALOG[platformId];
    if (!services) return;
    overrides[platformId].forEach(o => {
      const s = services.find(x => x.type === o.type);
      if (s && o.price) s.price = o.price;
    });
  });
}
