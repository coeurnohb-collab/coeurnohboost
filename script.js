/* =========================================================
   FIREBASE CONFIG — projet "coeurnohboost"
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAK9j8lmKlxp267bfwKegKgW54fo_jrS9E",
  authDomain: "coeurnohboost.firebaseapp.com",
  projectId: "coeurnohboost",
  storageBucket: "coeurnohboost.firebasestorage.app",
  messagingSenderId: "295783149587",
  appId: "1:295783149587:web:13aec67a2ae0109eaa4fe6"
};

const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";

let fbReady = false;
let auth = null;
let db = null;
let currentUser = null;
let authMode = 'register';

try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  fbReady = true;
  console.log("✅ Firebase initialisé");
} catch (e) {
  console.error("🔴 Firebase a échoué :", e.message);
}

/* =========================================================
   NAVIGATION ENTRE VUES
   ========================================================= */
function hideAllViews() {
  document.getElementById('view-home').classList.add('hidden');
  document.getElementById('view-dashboard').classList.add('hidden');
  document.getElementById('view-services').classList.add('hidden');
  document.getElementById('view-order').classList.add('hidden');
  document.getElementById('view-recharge').classList.add('hidden');
  document.getElementById('view-monetization').classList.add('hidden');
}
function showHome() {
  hideAllViews();
  document.getElementById('view-home').classList.remove('hidden');
}
function showDashboard() {
  hideAllViews();
  document.getElementById('view-dashboard').classList.remove('hidden');
  showDashTab('home');
}
function showDashTab(tab) {
  document.querySelectorAll('.dash-tab').forEach(el => el.classList.add('hidden'));
  document.getElementById('dash-tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.bnav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('bnav-' + tab).classList.add('active');
  if (tab === 'orders') loadOrders();
}
function showServices() {
  hideAllViews();
  document.getElementById('view-services').classList.remove('hidden');
  renderPlatformGrid('platform-grid');
}

/* =========================================================
   14 RÉSEAUX SOCIAUX — icônes SVG vectorielles + couleur de marque
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
  threads: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.2 22c-2.9 0-5.2-.9-6.7-2.6-1.4-1.6-2.1-3.9-2.2-6.9v-.9c.1-3 .8-5.3 2.2-6.9C7 3 9.3 2 12.2 2c2.6 0 4.7.8 6.2 2.3 1.2 1.3 2 3 2.2 5l-1.9.4c-.15-1.6-.75-2.9-1.7-3.9-1.15-1.15-2.8-1.75-4.9-1.75-2.35 0-4.15.8-5.3 2.3-1 1.3-1.6 3.15-1.7 5.5v.3c.05 2.4.65 4.3 1.7 5.6 1.15 1.5 2.95 2.3 5.3 2.3 2 0 3.5-.5 4.5-1.5.85-.85 1.3-1.9 1.35-3.1-.5.3-1.15.5-2 .6a5 5 0 0 1-2.9-.4c-1.1-.5-1.75-1.4-1.75-2.5 0-1.2.7-2.15 1.9-2.65a5.5 5.5 0 0 1 3.3-.2c-.15-.65-.45-1.15-.9-1.5-.5-.4-1.2-.6-2-.6-1.1 0-2 .4-2.6 1.15l-1.5-1.1c.9-1.2 2.35-1.85 4.1-1.85 1.3 0 2.4.35 3.2 1 1 .8 1.55 2 1.6 3.5v.1c1.15.7 1.85 1.85 1.85 3.35 0 1.85-.85 3.35-2.35 4.4-1.35.9-3.05 1.35-4.95 1.35zm.85-8.85c-.75-.05-1.5.05-2.05.3-.55.25-.8.6-.8 1.05 0 .5.35.85.95 1.05.6.2 1.35.2 2-.05.75-.3 1.15-.9 1.2-1.8v-.35a4 4 0 0 0-1.3-.2z"/></svg>`
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
  { id: "threads",   name: "Threads",    bg: "#000000" }
];

/* Niveaux de qualité — le prix réel s'affiche désormais en $, plus de multiplicateur brut */
const QUALITY_TIERS = [
  { id: "standard", name: "Standard", mult: 1,    desc: "Bon rapport qualité-prix" },
  { id: "premium",  name: "Premium",  mult: 1.6,  desc: "Plus rapide, meilleure rétention" },
  { id: "vip",      name: "VIP",      mult: 2.5,  desc: "Ultra rapide, qualité maximale" }
];

/* Catalogue de services par plateforme — prix de base ($ / 1000), min, max
   ⚠️ Prix d'exemple, à remplacer par les vrais tarifs plus tard. */
const SERVICE_CATALOG = {
  tiktok:    [ {type:"followers",label:"Abonnés",base:2.5,min:100,max:50000}, {type:"likes",label:"Likes",base:1.2,min:100,max:100000}, {type:"views",label:"Vues",base:0.6,min:500,max:1000000}, {type:"comments",label:"Commentaires",base:4.0,min:20,max:5000}, {type:"shares",label:"Partages",base:1.8,min:50,max:20000} ],
  instagram: [ {type:"followers",label:"Abonnés",base:3.0,min:100,max:50000}, {type:"likes",label:"Likes",base:1.5,min:100,max:100000}, {type:"views",label:"Vues Reels",base:0.8,min:500,max:500000}, {type:"comments",label:"Commentaires",base:4.5,min:20,max:5000} ],
  youtube:   [ {type:"views",label:"Vues",base:3.5,min:1000,max:1000000}, {type:"followers",label:"Abonnés",base:8.0,min:100,max:20000}, {type:"likes",label:"Likes",base:2.0,min:50,max:50000} ],
  facebook:  [ {type:"followers",label:"Followers Page",base:3.0,min:100,max:50000}, {type:"likes",label:"Likes Post",base:1.5,min:100,max:100000}, {type:"views",label:"Vues",base:0.7,min:500,max:500000}, {type:"shares",label:"Partages",base:2.0,min:50,max:10000} ],
  twitter:   [ {type:"followers",label:"Abonnés",base:3.5,min:100,max:50000}, {type:"likes",label:"Likes",base:1.6,min:50,max:50000}, {type:"shares",label:"Retweets",base:2.2,min:50,max:20000}, {type:"views",label:"Vues",base:0.5,min:500,max:1000000} ],
  telegram:  [ {type:"followers",label:"Membres",base:2.0,min:100,max:100000}, {type:"views",label:"Vues Post",base:0.8,min:500,max:200000} ],
  whatsapp:  [ {type:"followers",label:"Abonnés Chaîne",base:3.0,min:100,max:20000}, {type:"views",label:"Vues Statut",base:1.0,min:100,max:50000} ],
  snapchat:  [ {type:"followers",label:"Abonnés",base:3.5,min:100,max:20000}, {type:"views",label:"Vues Story",base:1.2,min:200,max:100000} ],
  linkedin:  [ {type:"followers",label:"Abonnés",base:5.0,min:50,max:20000}, {type:"likes",label:"Likes Post",base:2.5,min:20,max:10000} ],
  pinterest: [ {type:"followers",label:"Abonnés",base:2.5,min:100,max:30000}, {type:"package",label:"Repins",base:1.5,min:50,max:10000} ],
  twitch:    [ {type:"followers",label:"Abonnés",base:4.0,min:50,max:20000}, {type:"views",label:"Vues VOD",base:1.0,min:200,max:100000} ],
  spotify:   [ {type:"views",label:"Écoutes",base:2.0,min:500,max:500000}, {type:"followers",label:"Abonnés",base:3.5,min:100,max:20000} ],
  discord:   [ {type:"followers",label:"Membres",base:2.5,min:50,max:20000} ],
  threads:   [ {type:"followers",label:"Abonnés",base:3.0,min:100,max:30000}, {type:"likes",label:"Likes",base:1.5,min:50,max:50000} ]
};

let selectedPlatformId = null;
let selectedQuality = "standard";

/* =========================================================
   PAIEMENTS — pays d'Afrique francophone + voisins RDC + crypto
   ⚠️ Taux de change indicatifs, à ajuster régulièrement.
   ========================================================= */
const COUNTRIES = [
  { code:"CD", name:"RD Congo",             flag:"🇨🇩", currency:"CDF",  rate:2800,  ops:["Vodacom M-Pesa","Airtel Money","Orange Money"] },
  { code:"CG", name:"Congo-Brazzaville",     flag:"🇨🇬", currency:"XAF",  rate:600,   ops:["MTN Mobile Money","Airtel Money"] },
  { code:"CF", name:"Centrafrique",          flag:"🇨🇫", currency:"XAF",  rate:600,   ops:["Orange Money","Telecel Money"] },
  { code:"CM", name:"Cameroun",              flag:"🇨🇲", currency:"XAF",  rate:600,   ops:["MTN Mobile Money","Orange Money"] },
  { code:"CI", name:"Côte d'Ivoire",         flag:"🇨🇮", currency:"XOF",  rate:600,   ops:["Orange Money","MTN Mobile Money","Moov Money","Wave"] },
  { code:"SN", name:"Sénégal",               flag:"🇸🇳", currency:"XOF",  rate:600,   ops:["Orange Money","Free Money","Wave"] },
  { code:"ML", name:"Mali",                  flag:"🇲🇱", currency:"XOF",  rate:600,   ops:["Orange Money","Moov Money"] },
  { code:"BF", name:"Burkina Faso",          flag:"🇧🇫", currency:"XOF",  rate:600,   ops:["Orange Money","Moov Money"] },
  { code:"TG", name:"Togo",                  flag:"🇹🇬", currency:"XOF",  rate:600,   ops:["T-Money (Togocom)","Moov Money"] },
  { code:"BJ", name:"Bénin",                 flag:"🇧🇯", currency:"XOF",  rate:600,   ops:["MTN Mobile Money","Moov Money"] },
  { code:"GN", name:"Guinée",                flag:"🇬🇳", currency:"GNF",  rate:8600,  ops:["Orange Money","MTN Mobile Money"] },
  { code:"NE", name:"Niger",                 flag:"🇳🇪", currency:"XOF",  rate:600,   ops:["Airtel Money","Orange Money","Moov Money"] },
  { code:"UG", name:"Ouganda",               flag:"🇺🇬", currency:"UGX",  rate:3700,  ops:["MTN Mobile Money","Airtel Money"] },
  { code:"RW", name:"Rwanda",                flag:"🇷🇼", currency:"RWF",  rate:1300,  ops:["MTN Mobile Money","Airtel Money"] },
  { code:"BI", name:"Burundi",               flag:"🇧🇮", currency:"BIF",  rate:2900,  ops:["Lumitel Pesa","Ecocash"] },
  { code:"TZ", name:"Tanzanie",              flag:"🇹🇿", currency:"TZS",  rate:2500,  ops:["M-Pesa (Vodacom)","Tigo Pesa","Airtel Money"] },
  { code:"ZM", name:"Zambie",                flag:"🇿🇲", currency:"ZMW",  rate:27,    ops:["MTN Mobile Money","Airtel Money"] },
  { code:"AO", name:"Angola",                flag:"🇦🇴", currency:"AOA",  rate:830,   ops:["Unitel Money","Multicaixa Express"] },
  { code:"KE", name:"Kenya",                 flag:"🇰🇪", currency:"KES",  rate:129,   ops:["M-Pesa (Safaricom)","Airtel Money"] },
  { code:"SS", name:"Soudan du Sud",         flag:"🇸🇸", currency:"SSP",  rate:130,   ops:["MTN Mobile Money","Zain Cash"] },
  { code:"SD", name:"Soudan",                flag:"🇸🇩", currency:"SDG",  rate:600,   ops:["Zain Cash","MTN Mobile Money"] },
  { code:"LY", name:"Libye",                 flag:"🇱🇾", currency:"LYD",  rate:4.8,   ops:["Mobicash"] },
  { code:"MA", name:"Maroc",                 flag:"🇲🇦", currency:"MAD",  rate:9.9,   ops:["Orange Money","inwi money"] },
  { code:"TN", name:"Tunisie",               flag:"🇹🇳", currency:"TND",  rate:3.1,   ops:["Orange Money","D17"] },
  { code:"DZ", name:"Algérie",               flag:"🇩🇿", currency:"DZD",  rate:134,   ops:["Djezzy","Mobilis"] },
  { code:"GH", name:"Ghana",                 flag:"🇬🇭", currency:"GHS",  rate:15,    ops:["MTN Mobile Money","Vodafone Cash","AirtelTigo Money"] },
  { code:"NG", name:"Nigeria",               flag:"🇳🇬", currency:"NGN",  rate:1550,  ops:["MTN MoMo","Airtel Money","Opay"] },
  { code:"TD", name:"Tchad",                 flag:"🇹🇩", currency:"XAF",  rate:600,   ops:["Airtel Money","Moov Money"] },
  { code:"ET", name:"Éthiopie",              flag:"🇪🇹", currency:"ETB",  rate:120,   ops:["Telebirr"] },
  { code:"SL", name:"Sierra Leone",          flag:"🇸🇱", currency:"SLE",  rate:22.5,  ops:["Orange Money","Africell Money"] },
  { code:"ZA", name:"Afrique du Sud",        flag:"🇿🇦", currency:"ZAR",  rate:18,    ops:["MTN MoMo","Vodacom"] },
  { code:"MG", name:"Madagascar",            flag:"🇲🇬", currency:"MGA",  rate:4500,  ops:["Orange Money","Telma Mvola","Airtel Money"] }
];

const CRYPTOS = [
  { id:"usdt-trc20", name:"USDT (TRC20 - Tron)", icon:"₮" },
  { id:"usdt-bep20", name:"USDT (BEP20 - BSC)",  icon:"₮" },
  { id:"btc",        name:"Bitcoin (BTC)",        icon:"₿" },
  { id:"trx",        name:"TRON (TRX)",           icon:"⚡" }
];

let payMethod = "mobile";
let payCountryCode = null;
let payOperator = null;
let payCryptoId = null;

function platformBadgeHTML(p) {
  const color = p.dark ? 'color:#111' : 'color:#fff';
  return `<div class="p-icon" style="background:${p.bg};${color}">${ICONS[p.id] || p.name[0]}</div>`;
}

function renderPlatformGrid(gridId) {
  const el = document.getElementById(gridId);
  el.innerHTML = PLATFORMS.map(p => `
    <div class="platform-badge" onclick="onPlatformClick('${p.id}')">
      ${platformBadgeHTML(p)}
      <span class="p-name">${p.name}</span>
    </div>
  `).join('');
}
function initHomeCatalog() {
  renderPlatformGrid('home-platform-grid');
}

/* Sur l'accueil public (non connecté) → ouvre l'inscription.
   Depuis le dashboard → ouvre le formulaire de commande. */
function onPlatformClick(platformId) {
  if (currentUser) {
    openOrderForm(platformId);
  } else {
    openAuth('register');
  }
}

function openOrderForm(platformId) {
  selectedPlatformId = platformId;
  selectedQuality = "standard";
  const p = PLATFORMS.find(x => x.id === platformId);
  document.getElementById('order-platform-header').innerHTML = `
    ${platformBadgeHTML(p)}
    <h2>${p.name}</h2>
  `;

  const services = SERVICE_CATALOG[platformId] || [];
  const select = document.getElementById('order-service-select');
  select.innerHTML = services.map((s, i) => `<option value="${i}">${s.label}</option>`).join('');

  renderQualityGrid();
  document.getElementById('order-link').value = '';
  document.getElementById('order-qty').value = '';
  document.getElementById('order-error').classList.add('hidden');
  onOrderInputChange();

  hideAllViews();
  document.getElementById('view-order').classList.remove('hidden');
}

function renderQualityGrid() {
  const service = getSelectedService();
  const el = document.getElementById('quality-grid');
  el.innerHTML = QUALITY_TIERS.map(q => {
    const price = service ? (service.base * q.mult).toFixed(2) : '0.00';
    return `
    <div class="quality-card${q.id === selectedQuality ? ' active' : ''}" onclick="selectQuality('${q.id}')">
      <span class="q-name">${q.name}</span>
      <span class="q-mult">${price}$ <small>/1000</small></span>
    </div>`;
  }).join('');
}
function selectQuality(qId) {
  selectedQuality = qId;
  renderQualityGrid();
  onOrderInputChange();
}

function getSelectedService() {
  const services = SERVICE_CATALOG[selectedPlatformId] || [];
  const idx = parseInt(document.getElementById('order-service-select').value || 0, 10);
  return services[idx];
}

function onOrderInputChange() {
  const service = getSelectedService();
  if (!service) return;
  renderQualityGrid();
  const qty = parseInt(document.getElementById('order-qty').value || 0, 10);
  const quality = QUALITY_TIERS.find(q => q.id === selectedQuality);
  const price = (qty / 1000) * service.base * quality.mult;

  document.getElementById('order-qty-hint').textContent =
    `Min ${service.min.toLocaleString('fr-FR')} · Max ${service.max.toLocaleString('fr-FR')}`;
  document.getElementById('order-total-price').textContent = price.toFixed(2) + '$';
  document.getElementById('order-user-balance').textContent = ((currentUser && currentUser.balance) || 0).toFixed(2) + '$';
}

async function submitOrder() {
  const errEl = document.getElementById('order-error');
  errEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  const service = getSelectedService();
  const qty = parseInt(document.getElementById('order-qty').value || 0, 10);
  const link = document.getElementById('order-link').value.trim();
  const quality = QUALITY_TIERS.find(q => q.id === selectedQuality);
  const price = (qty / 1000) * service.base * quality.mult;

  if (!link) { errEl.textContent = "Merci d'indiquer le lien à booster."; errEl.classList.remove('hidden'); return; }
  if (!qty || qty < service.min || qty > service.max) {
    errEl.textContent = `Quantité invalide (entre ${service.min} et ${service.max}).`;
    errEl.classList.remove('hidden');
    return;
  }
  if (price > (currentUser.balance || 0)) {
    errEl.textContent = "Solde insuffisant. Recharge ton portefeuille pour continuer.";
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const newBalance = currentUser.balance - price;
    await db.collection('orders').add({
      uid: currentUser.uid,
      email: currentUser.email,
      platform: selectedPlatformId,
      service: service.label,
      quality: quality.name,
      link, quantity: qty, price,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await db.collection('users').doc(currentUser.uid).update({ balance: newBalance });
    currentUser.balance = newBalance;

    showDashboard();
    showDashTab('orders');
    loadOrders();
  } catch (e) {
    console.error("Erreur commande :", e.message);
    errEl.textContent = "Erreur lors de l'enregistrement. Réessaie.";
    errEl.classList.remove('hidden');
  }
}

async function loadOrders() {
  if (!currentUser) return;
  const container = document.getElementById('dash-tab-orders');
  try {
    const snap = await db.collection('orders').where('uid', '==', currentUser.uid).get();
    const orders = [];
    snap.forEach(doc => orders.push(doc.data()));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (orders.length === 0) {
      container.innerHTML = `
        <h2 style="margin-bottom:14px">${t('tab_orders')}</h2>
        <div class="order-box">
          <p class="muted">${t('orders_empty')}</p>
          <button class="btn btn-primary" style="margin-top:12px" onclick="showServices()">${t('dash_orders_cta')}</button>
        </div>`;
      return;
    }
    container.innerHTML = `<h2 style="margin-bottom:14px">${t('tab_orders')}</h2>` + orders.map(o => {
      const p = PLATFORMS.find(x => x.id === o.platform);
      return `
        <div class="order-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong>${p ? p.name : o.platform} — ${o.service}</strong>
            <span class="order-status">${o.status}</span>
          </div>
          <p class="muted small">${o.quality} · Qté ${o.quantity.toLocaleString('fr-FR')} · ${o.price.toFixed(2)}$</p>
        </div>`;
    }).join('');
  } catch (e) {
    console.error("Erreur chargement commandes :", e.message);
  }
}

/* =========================================================
   RECHARGE / PAIEMENT
   ========================================================= */
function showRecharge() {
  hideAllViews();
  document.getElementById('view-recharge').classList.remove('hidden');
  payMethod = "mobile";
  payCountryCode = null;
  payOperator = null;
  payCryptoId = null;
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-error').classList.add('hidden');
  document.getElementById('recharge-success').classList.add('hidden');
  renderPayMethodTabs();
  renderPayCountrySelect();
  renderPayPanel();
}
function renderPayMethodTabs() {
  const methods = [
    { id: "mobile", label: t('pay_mobile') },
    { id: "crypto", label: t('pay_crypto') },
    { id: "card",   label: t('pay_card') }
  ];
  document.getElementById('pay-method-tabs').innerHTML = methods.map(m => `
    <button class="platform-tab${m.id === payMethod ? ' active' : ''}" onclick="selectPayMethod('${m.id}')">${m.label}</button>
  `).join('');
}
function selectPayMethod(m) {
  payMethod = m;
  renderPayMethodTabs();
  renderPayPanel();
}
function renderPayCountrySelect() {
  const sel = document.getElementById('pay-country-select');
  sel.innerHTML = `<option value="">${t('pay_choose_country')}</option>` +
    COUNTRIES.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join('');
}
function onPayCountryChange() {
  payCountryCode = document.getElementById('pay-country-select').value || null;
  payOperator = null;
  renderPayOperators();
  updateRechargeEquivalent();
}
function renderPayOperators() {
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  const el = document.getElementById('pay-operators');
  if (!country) { el.innerHTML = ''; return; }
  el.innerHTML = country.ops.map(op => `
    <button class="quality-card${op === payOperator ? ' active' : ''}" style="padding:12px 8px" onclick="selectOperator('${op.replace(/'/g,"\\'")}')">
      <span class="q-name" style="font-size:0.78rem">${op}</span>
    </button>
  `).join('');
}
function selectOperator(op) {
  payOperator = op;
  renderPayOperators();
}
function renderPayCryptoOptions() {
  const el = document.getElementById('pay-crypto-list');
  el.innerHTML = CRYPTOS.map(c => `
    <button class="quality-card${c.id === payCryptoId ? ' active' : ''}" style="padding:12px 6px" onclick="selectCrypto('${c.id}')">
      <span class="q-name" style="font-size:0.78rem">${c.icon} ${c.name}</span>
    </button>
  `).join('');
}
function selectCrypto(id) {
  payCryptoId = id;
  renderPayCryptoOptions();
}
function renderPayPanel() {
  document.getElementById('pay-panel-mobile').classList.toggle('hidden', payMethod !== 'mobile');
  document.getElementById('pay-panel-crypto').classList.toggle('hidden', payMethod !== 'crypto');
  document.getElementById('pay-panel-card').classList.toggle('hidden', payMethod !== 'card');
  document.getElementById('recharge-amount-block').classList.toggle('hidden', payMethod === 'card');
  document.getElementById('recharge-submit-btn').classList.toggle('hidden', payMethod === 'card');
  if (payMethod === 'crypto') renderPayCryptoOptions();
}
function updateRechargeEquivalent() {
  const amount = parseFloat(document.getElementById('recharge-amount').value || 0);
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  const hint = document.getElementById('recharge-equivalent');
  if (payMethod === 'mobile' && country && amount > 0) {
    const local = (amount * country.rate).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    hint.textContent = `≈ ${local} ${country.currency}`;
  } else {
    hint.textContent = '';
  }
}
async function submitRecharge() {
  const errEl = document.getElementById('recharge-error');
  const okEl = document.getElementById('recharge-success');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  if (payMethod === 'card') {
    window.open('https://wa.me/243825001290?text=' + encodeURIComponent('Bonjour, je souhaite recharger via carte virtuelle.'), '_blank');
    return;
  }

  const amount = parseFloat(document.getElementById('recharge-amount').value || 0);
  if (!amount || amount <= 0) {
    errEl.textContent = t('pay_err_amount');
    errEl.classList.remove('hidden');
    return;
  }
  if (payMethod === 'mobile' && (!payCountryCode || !payOperator)) {
    errEl.textContent = t('pay_err_operator');
    errEl.classList.remove('hidden');
    return;
  }
  if (payMethod === 'crypto' && !payCryptoId) {
    errEl.textContent = t('pay_err_crypto');
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const country = COUNTRIES.find(c => c.code === payCountryCode);
    const crypto = CRYPTOS.find(c => c.id === payCryptoId);
    await db.collection('topup_requests').add({
      uid: currentUser.uid,
      email: currentUser.email,
      method: payMethod,
      country: country ? country.name : null,
      operator: payOperator || null,
      crypto: crypto ? crypto.name : null,
      amountUSD: amount,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    okEl.textContent = t('pay_success');
    okEl.classList.remove('hidden');
  } catch (e) {
    console.error("Erreur demande recharge :", e.message);
    errEl.textContent = t('pay_err_generic');
    errEl.classList.remove('hidden');
  }
}

/* =========================================================
   MONÉTISATION — critères par plateforme + services associés
   ========================================================= */
const MONETIZATION = {
  youtube: {
    program: "YouTube Partner Program",
    criteria: [
      { label: "Abonnés", value: "1 000 minimum" },
      { label: "Heures de visionnage", value: "4 000 heures sur 12 mois (vidéos longues)" },
      { label: "Alternative Shorts", value: "10 millions de vues Shorts sur 90 jours" },
      { label: "Compte AdSense", value: "Obligatoire, lié à la chaîne" },
      { label: "Règles de la communauté", value: "Aucune violation majeure sur les 90 derniers jours" }
    ]
  },
  tiktok: {
    program: "TikTok Creator Rewards Program",
    criteria: [
      { label: "Abonnés", value: "10 000 minimum" },
      { label: "Vues", value: "100 000 vues sur les 30 derniers jours" },
      { label: "Âge du compte", value: "18 ans minimum, compte en règle" },
      { label: "Format", value: "Vidéos de plus d'1 minute recommandées" }
    ]
  },
  facebook: {
    program: "Facebook In-Stream Ads",
    criteria: [
      { label: "Abonnés Page", value: "10 000 minimum" },
      { label: "Minutes vues", value: "600 000 minutes sur les 60 derniers jours" },
      { label: "Vidéos actives", value: "5 vidéos minimum publiées" }
    ]
  },
  instagram: {
    program: "Instagram Bonus Program",
    criteria: [
      { label: "Éligibilité", value: "Selon pays et invitation Meta" },
      { label: "Engagement", value: "Bon taux de likes/commentaires sur les Reels" },
      { label: "Régularité", value: "Publications fréquentes recommandées" }
    ]
  },
  twitch: {
    program: "Twitch Affiliate",
    criteria: [
      { label: "Abonnés (followers)", value: "50 minimum" },
      { label: "Temps de stream", value: "500 minutes sur les 30 derniers jours" },
      { label: "Jours de diffusion", value: "7 jours uniques" },
      { label: "Viewers moyens", value: "3 en moyenne par stream" }
    ]
  },
  spotify: {
    program: "Spotify for Artists",
    criteria: [
      { label: "Écoutes", value: "Pas de seuil officiel, mais plus d'écoutes = plus de revenus" },
      { label: "Playlists", value: "L'ajout à des playlists augmente fortement la visibilité" }
    ]
  }
};

function renderMonetizationGrid() {
  const platforms = PLATFORMS.filter(p => MONETIZATION[p.id]);
  const el = document.getElementById('monetization-grid');
  el.innerHTML = platforms.map(p => `
    <div class="platform-badge" onclick="renderMonetizationDetail('${p.id}')">
      ${platformBadgeHTML(p)}
      <span class="p-name">${p.name}</span>
    </div>
  `).join('');
}
function renderMonetizationDetail(platformId) {
  const p = PLATFORMS.find(x => x.id === platformId);
  const m = MONETIZATION[platformId];
  const el = document.getElementById('monetization-detail');
  if (!p || !m) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="order-box">
      <div class="order-platform-header" style="margin-bottom:14px">
        ${platformBadgeHTML(p)}
        <div>
          <h2 style="font-size:1.05rem">${p.name}</h2>
          <p class="muted" style="font-size:0.8rem">${m.program}</p>
        </div>
      </div>
      ${m.criteria.map(c => `
        <div class="profile-row">
          <span>${c.label}</span>
          <span style="text-align:right;max-width:60%">${c.value}</span>
        </div>
      `).join('')}
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px" onclick="onPlatformClick('${p.id}')" data-i18n="monetization_boost_cta">Booster mes statistiques →</button>
    </div>
  `;
}
function showMonetization() {
  hideAllViews();
  document.getElementById('view-monetization').classList.remove('hidden');
  renderMonetizationGrid();
  document.getElementById('monetization-detail').innerHTML = '';
}

/* =========================================================
   MODAL AUTH
   ========================================================= */
function openAuth(mode) {
  authMode = mode;
  updateAuthModalMode();
  document.getElementById('auth-modal').classList.remove('hidden');
}
function closeAuth() {
  document.getElementById('auth-modal').classList.add('hidden');
  hideAuthError();
  setAuthLoading(false);
}
function toggleAuthMode() {
  authMode = authMode === 'register' ? 'login' : 'register';
  updateAuthModalMode();
}
function updateAuthModalMode() {
  const isReg = authMode === 'register';
  document.getElementById('auth-title').textContent = isReg ? t('auth_title_register') : t('auth_title_login');
  document.getElementById('auth-name-field').classList.toggle('hidden', !isReg);
  document.getElementById('auth-submit').textContent = isReg ? t('auth_submit_register') : t('auth_submit_login');
  document.getElementById('auth-switch-text').textContent = isReg ? t('auth_switch_to_login') : t('auth_switch_to_register');
  document.getElementById('auth-switch-btn').textContent = isReg ? t('auth_switch_btn_login') : t('auth_switch_btn_register');
  hideAuthError();
}
function togglePasswordVisibility() {
  const input = document.getElementById('auth-password');
  const btn = document.getElementById('password-toggle-btn');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? t('auth_show_password') : t('auth_hide_password');
}
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideAuthError() {
  document.getElementById('auth-error').classList.add('hidden');
}
function setAuthLoading(isLoading) {
  document.getElementById('auth-loading').classList.toggle('hidden', !isLoading);
  document.getElementById('auth-submit').disabled = isLoading;
  document.getElementById('google-btn').disabled = isLoading;
}

/* Traduit les erreurs Firebase en messages compréhensibles en français */
function translateAuthError(e) {
  const code = e.code || '';
  const map = {
    'auth/email-already-in-use': "Cet email est déjà utilisé. Essaie de te connecter à la place.",
    'auth/invalid-email': "Cet email n'est pas valide.",
    'auth/weak-password': "Le mot de passe doit contenir au moins 6 caractères.",
    'auth/user-not-found': "Aucun compte trouvé avec cet email.",
    'auth/wrong-password': "Mot de passe incorrect.",
    'auth/invalid-credential': "Email ou mot de passe incorrect.",
    'auth/too-many-requests': "Trop de tentatives. Réessaie dans quelques minutes.",
    'auth/network-request-failed': "Problème de connexion internet. Vérifie ton réseau.",
    'auth/popup-closed-by-user': "Fenêtre Google fermée avant la fin de connexion.",
    'auth/configuration-not-found': "Ce mode de connexion n'est pas encore activé côté serveur (contacte l'admin).",
    'auth/unauthorized-domain': "Ce site n'est pas encore autorisé pour la connexion (contacte l'admin)."
  };
  return map[code] || e.message || "Une erreur inconnue est survenue.";
}

async function submitAuth() {
  hideAuthError();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();

  if (!fbReady) {
    showAuthError("Connexion au service indisponible. Vérifie ta connexion internet et réessaie.");
    return;
  }
  if (!email || !password) {
    showAuthError("Email et mot de passe requis.");
    return;
  }

  setAuthLoading(true);
  try {
    if (authMode === 'register') {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({
        name: name || email.split('@')[0],
        email,
        balance: 0,
        createdAt: new Date().toISOString()
      });
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    closeAuth();
  } catch (e) {
    console.error("Erreur auth :", e.code, e.message);
    showAuthError(translateAuthError(e));
  } finally {
    setAuthLoading(false);
  }
}

async function signInWithGoogle() {
  hideAuthError();
  if (!fbReady) {
    showAuthError("Connexion au service indisponible. Vérifie ta connexion internet et réessaie.");
    return;
  }
  setAuthLoading(true);
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const ref = db.collection('users').doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        balance: 0,
        createdAt: new Date().toISOString()
      });
    }
    closeAuth();
  } catch (e) {
    console.error("Erreur Google auth :", e.code, e.message);
    showAuthError(translateAuthError(e));
  } finally {
    setAuthLoading(false);
  }
}

function logout() {
  if (fbReady) auth.signOut();
  showHome();
}

/* =========================================================
   ÉTAT DE CONNEXION — met à jour l'interface automatiquement
   ========================================================= */
function renderLoggedOutNav() {
  document.getElementById('nav-login-btn').classList.remove('hidden');
  document.getElementById('nav-register-btn').classList.remove('hidden');
  document.getElementById('nav-dashboard-btn').classList.add('hidden');
}
function renderLoggedInNav() {
  document.getElementById('nav-login-btn').classList.add('hidden');
  document.getElementById('nav-register-btn').classList.add('hidden');
  document.getElementById('nav-dashboard-btn').classList.remove('hidden');
}

if (fbReady) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      let data;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        data = doc.exists ? doc.data() : { name: user.email, email: user.email, balance: 0, createdAt: new Date().toISOString() };
      } catch (e) {
        console.error("Erreur lecture profil :", e.message);
        data = { name: user.email, email: user.email, balance: 0, createdAt: new Date().toISOString() };
      }
      currentUser = { uid: user.uid, ...data };

      renderLoggedInNav();
      document.getElementById('dash-name').textContent = currentUser.name;
      document.getElementById('dash-balance').textContent = (currentUser.balance || 0).toFixed(2) + '$';
      document.getElementById('wallet-balance').textContent = (currentUser.balance || 0).toFixed(2) + '$';
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
      document.getElementById('profile-since').textContent = currentUser.createdAt
        ? new Date(currentUser.createdAt).toLocaleDateString('fr-FR')
        : '—';

      showDashboard();
    } else {
      currentUser = null;
      renderLoggedOutNav();
      showHome();
    }
  });
} else {
  renderLoggedOutNav();
}

/* Applique la langue détectée (ou choisie) dès que la page est prête */
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations(currentLang);
  initHomeCatalog();
});
