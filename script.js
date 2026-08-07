/* =========================================================
   FIREBASE CONFIG — configuration du projet coeurnohboost
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAK9j8lmKlxp267bfwKegKgW54fo_jrS9E",
  authDomain: "coeurnohboost.firebaseapp.com",
  projectId: "coeurnohboost",
  storageBucket: "coeurnohboost.firebasestorage.app",
  messagingSenderId: "295783149587",
  appId: "1:295783149587:web:13aec67a2ae0109eaa4fe6"
};
let fbReady = false;
try { 
  firebase.initializeApp(firebaseConfig); 
  fbReady = true; 
} catch(e) { 
  console.warn("Firebase non configuré :", e.message); 
}

const auth = fbReady ? firebase.auth() : null;
const db = fbReady ? firebase.firestore() : null;

// UID Firebase Admin
const ADMIN_UID = "8BqWONj07hVZePHe2DrkHWYRjse2";

/* =========================================================
   SYSTEME DE TRADUCTION & DELECTATION DE LANGUE
   ========================================================= */
function detectLang() {
  const navLang = (navigator.language || 'fr').slice(0, 2);
  return ['fr', 'en'].includes(navLang) ? navLang : 'fr';
}

const I18N = {
  fr: {
    app_home: "Accueil",
    app_order: "Nouvelle Commande",
    app_activity: "Activités & Suivi",
    app_wallet: "Portefeuille",
    app_account: "Mon Compte",
    order_btn: "Commander maintenant",
    mon_eyebrow: "Offre Spéciale Monétisation"
  },
  en: {
    app_home: "Home",
    app_order: "New Order",
    app_activity: "Activities",
    app_wallet: "Wallet",
    app_account: "Account",
    order_btn: "Order Now",
    mon_eyebrow: "Monetization Special Offer"
  }
};

/* =========================================================
   BADGES DE PLATEFORME — monogrammes aux couleurs de marque
   ========================================================= */
const PLATFORM_BADGES = {
  TikTok: { bg: "#000000", fg: "#25F4EE", text: "♪" },
  Instagram: { bg: "linear-gradient(45deg,#f58529,#dd2a7b,#8134af,#515bd4)", fg: "#fff", text: "IG" },
  YouTube: { bg: "#FF0000", fg: "#fff", text: "▶" },
  Facebook: { bg: "#1877F2", fg: "#fff", text: "f" },
  Spotify: { bg: "#1DB954", fg: "#fff", text: "♫" },
  Shazam: { bg: "#0088FF", fg: "#fff", text: "Sh" },
  Pinterest: { bg: "#E60023", fg: "#fff", text: "P" },
  Telegram: { bg: "#26A5E4", fg: "#fff", text: "✈" },
  WhatsApp: { bg: "#25D366", fg: "#fff", text: "W" },
  Snapchat: { bg: "#FFFC00", fg: "#000", text: "S" },
  X: { bg: "#000000", fg: "#fff", text: "X" },
  LinkedIn: { bg: "#0A66C2", fg: "#fff", text: "in" },
  SoundCloud: { bg: "#FF7700", fg: "#fff", text: "SC" },
  "Apple Music": { bg: "linear-gradient(135deg,#FA243C,#FB5C74)", fg: "#fff", text: "♫" },
  Audiomack: { bg: "#FFA200", fg: "#000", text: "A" },
  "Monétisation": { bg: "#C9992F", fg: "#fff", text: "💎" }
};

function platformBadge(name, size) {
  size = size || 22;
  const b = PLATFORM_BADGES[name] || { bg: "#0b3d2e", fg: "#fff", text: name.slice(0, 2) };
  return `<span class="platform-badge" style="width:${size}px;height:${size}px;background:${b.bg};color:${b.fg};font-size:${Math.round(size * 0.48)}px">${b.text}</span>`;
}

/* =========================================================
   NOTIFICATIONS (toasts simples)
   ========================================================= */
function showNotification(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { 
    toast.classList.add('toast-out'); 
    setTimeout(() => toast.remove(), 400); 
  }, 3200);
}

/* =========================================================
   CATALOGUE — 15 plateformes
   ========================================================= */
const DEFAULT_CATALOG = {
  TikTok: [
    { name: "Followers", desc: "Croissance progressive", tiers: [{ label: "Standard", price1k: 2.5, min: 100 }, { label: "Premium ⭐", price1k: 6, min: 50 }, { label: "VIP 👑", price1k: 9.6, min: 50 }] },
    { name: "Vues vidéo", desc: "Livraison rapide 12-24h", tiers: [{ label: "Standard", price1k: 0.4, min: 200 }, { label: "Premium ⭐", price1k: 1.2, min: 100 }, { label: "VIP 👑", price1k: 1.9, min: 100 }] },
    { name: "Likes", desc: "Boost d'engagement instantané", tiers: [{ label: "Standard", price1k: 0.8, min: 100 }, { label: "Premium ⭐", price1k: 2, min: 50 }, { label: "VIP 👑", price1k: 3.2, min: 50 }] },
    { name: "Commentaires", desc: "Commentaires positifs variés", tiers: [{ label: "Standard", price1k: 5, min: 10 }, { label: "Premium ⭐", price1k: 11, min: 10 }, { label: "VIP 👑", price1k: 17.6, min: 10 }] },
    { name: "Partages", desc: "Amplifie la portée organique", tiers: [{ label: "Standard", price1k: 1.5, min: 50 }, { label: "Premium ⭐", price1k: 3.5, min: 50 }, { label: "VIP 👑", price1k: 5.6, min: 50 }] },
    { name: "Pack Tout-en-un", desc: "Followers + Vues + Likes combinés, prix réduit vs achat séparé", tiers: [{ label: "Standard", price1k: 3.0, min: 100 }, { label: "Premium ⭐", price1k: 7.8, min: 50 }, { label: "VIP 👑", price1k: 12.5, min: 50 }] },
  ],
  Instagram: [
    { name: "Followers", desc: "Comptes actifs", tiers: [{ label: "Standard", price1k: 3, min: 100 }, { label: "Premium ⭐", price1k: 7, min: 50 }, { label: "VIP 👑", price1k: 11.2, min: 50 }] },
    { name: "Likes", desc: "Livraison en quelques heures", tiers: [{ label: "Standard", price1k: 0.8, min: 100 }, { label: "Premium ⭐", price1k: 2, min: 50 }, { label: "VIP 👑", price1k: 3.2, min: 50 }] },
    { name: "Vues Reels/Stories", desc: "Boost algorithme", tiers: [{ label: "Standard", price1k: 0.5, min: 200 }, { label: "Premium ⭐", price1k: 1.2, min: 100 }, { label: "VIP 👑", price1k: 1.9, min: 100 }] },
    { name: "Commentaires", desc: "Commentaires positifs variés", tiers: [{ label: "Standard", price1k: 5, min: 10 }, { label: "Premium ⭐", price1k: 11, min: 10 }, { label: "VIP 👑", price1k: 17.6, min: 10 }] },
    { name: "Pack Tout-en-un", desc: "Followers + Vues + Likes combinés, prix réduit vs achat séparé", tiers: [{ label: "Standard", price1k: 3.7, min: 100 }, { label: "Premium ⭐", price1k: 8.7, min: 50 }, { label: "VIP 👑", price1k: 13.9, min: 50 }] },
  ],
  YouTube: [
    { name: "Vues", desc: "Sources variées", tiers: [{ label: "Standard", price1k: 2, min: 200 }, { label: "Premium ⭐ (rétention haute)", price1k: 5, min: 100 }, { label: "VIP 👑", price1k: 8, min: 100 }] },
    { name: "Abonnés", desc: "Comptes actifs et stables", tiers: [{ label: "Standard", price1k: 5, min: 100 }, { label: "Premium ⭐", price1k: 11, min: 50 }, { label: "VIP 👑", price1k: 17.6, min: 50 }] },
    { name: "Likes vidéo", desc: "Renforce le taux d'engagement", tiers: [{ label: "Standard", price1k: 1.5, min: 50 }, { label: "Premium ⭐", price1k: 4, min: 50 }, { label: "VIP 👑", price1k: 6.4, min: 50 }] },
    { name: "Commentaires", desc: "Commentaires positifs variés", tiers: [{ label: "Standard", price1k: 6, min: 10 }, { label: "Premium ⭐", price1k: 13, min: 10 }, { label: "VIP 👑", price1k: 20.8, min: 10 }] },
    { name: "Pack Tout-en-un", desc: "Abonnés + Vues + Likes combinés, prix réduit vs achat séparé", tiers: [{ label: "Standard", price1k: 7.2, min: 100 }, { label: "Premium ⭐", price1k: 17, min: 50 }, { label: "VIP 👑", price1k: 27.2, min: 50 }] },
  ],
  Facebook: [
    { name: "Likes Page", desc: "Croissance progressive", tiers: [{ label: "Standard", price1k: 1.5, min: 100 }, { label: "Premium ⭐", price1k: 4, min: 50 }, { label: "VIP 👑", price1k: 6.4, min: 50 }] },
    { name: "Followers", desc: "Comptes réels", tiers: [{ label: "Standard", price1k: 2, min: 100 }, { label: "Premium ⭐", price1k: 5, min: 50 }, { label: "VIP 👑", price1k: 8, min: 50 }] },
    { name: "Vues vidéo", desc: "Boost de portée", tiers: [{ label: "Standard", price1k: 0.5, min: 200 }, { label: "Premium ⭐", price1k: 1.5, min: 100 }, { label: "VIP 👑", price1k: 2.4, min: 100 }] },
    { name: "Commentaires", desc: "Commentaires positifs variés", tiers: [{ label: "Standard", price1k: 5, min: 10 }, { label: "Premium ⭐", price1k: 11, min: 10 }, { label: "VIP 👑", price1k: 17.6, min: 10 }] },
    { name: "Partages", desc: "Amplifie la portée organique", tiers: [{ label: "Standard", price1k: 1.5, min: 50 }, { label: "Premium ⭐", price1k: 3.5, min: 50 }, { label: "VIP 👑", price1k: 5.6, min: 50 }] },
    { name: "Pack Tout-en-un", desc: "Followers + Vues + Likes combinés, prix réduit vs achat séparé", tiers: [{ label: "Standard", price1k: 3.4, min: 100 }, { label: "Premium ⭐", price1k: 8.9, min: 50 }, { label: "VIP 👑", price1k: 14.3, min: 50 }] },
  ],
  Spotify: [
    { name: "Écoutes (Plays)", desc: "Répartition naturelle sur tes titres", tiers: [{ label: "Standard", price1k: 1.5, min: 200 }, { label: "Premium ⭐", price1k: 3.5, min: 100 }, { label: "VIP 👑", price1k: 5.6, min: 100 }] },
    { name: "Auditeurs mensuels", desc: "Renforce ton profil artiste", tiers: [{ label: "Standard", price1k: 3, min: 100 }, { label: "Premium ⭐", price1k: 7, min: 50 }, { label: "VIP 👑", price1k: 11.2, min: 50 }] },
    { name: "Followers artiste", desc: "Croissance progressive", tiers: [{ label: "Standard", price1k: 2.5, min: 100 }, { label: "Premium ⭐", price1k: 6, min: 50 }, { label: "VIP 👑", price1k: 9.6, min: 50 }] },
  ],
  Shazam: [
    { name: "Reconnaissances (Shazams)", desc: "Booste la découverte de ton titre", tiers: [{ label: "Standard", price1k: 3, min: 100 }, { label: "Premium ⭐", price1k: 6.5, min: 50 }, { label: "VIP 👑", price1k: 10.4, min: 50 }] },
  ],
  Pinterest: [
    { name: "Followers", desc: "Comptes actifs", tiers: [{ label: "Standard", price1k: 1.5, min: 100 }, { label: "Premium ⭐", price1k: 4, min: 50 }, { label: "VIP 👑", price1k: 6.4, min: 50 }] },
    { name: "Enregistrements (Saves)", desc: "Booste la portée de tes épingles", tiers: [{ label: "Standard", price1k: 1.5, min: 100 }, { label: "Premium ⭐", price1k: 3.5, min: 100 }, { label: "VIP 👑", price1k: 5.6, min: 100 }] },
    { name: "Vues", desc: "Visibilité accrue", tiers: [{ label: "Standard", price1k: 0.5, min: 200 }, { label: "Premium ⭐", price1k: 1.2, min: 100 }, { label: "VIP 👑", price1k: 1.9, min: 100 }] },
  ],
  Telegram: [
    { name: "Membres groupe/chaîne", desc: "Comptes réels", tiers: [{ label: "Standard", price1k: 2.5, min: 100 }, { label: "Premium ⭐", price1k: 6, min: 50 }, { label: "VIP 👑", price1k: 9.6, min: 50 }] },
    { name: "Vues de publication", desc: "Boost de portée", tiers: [{ label: "Standard", price1k: 0.5, min: 200 }, { label: "Premium ⭐", price1k: 1.2, min: 100 }, { label: "VIP 👑", price1k: 1.9, min: 100 }] },
  ],
  WhatsApp: [
    { name: "Membres groupe (via lien)", desc: "Croissance progressive", tiers: [{ label: "Standard", price1k: 3, min: 20 }, { label: "Premium ⭐", price1k: 7, min: 20 }, { label: "VIP 👑", price1k: 11.2, min: 20 }] },
    { name: "Vues de statut", desc: "Boost de visibilité", tiers: [{ label: "Standard", price1k: 1.5, min: 50 }, { label: "Premium ⭐", price1k: 4, min: 50 }, { label: "VIP 👑", price1k: 6.4, min: 50 }] },
  ],
  Snapchat: [
    { name: "Followers", desc: "Comptes actifs", tiers: [{ label: "Standard", price1k: 2.5, min: 100 }, { label: "Premium ⭐", price1k: 6, min: 50 }, { label: "VIP 👑", price1k: 9.6, min: 50 }] },
    { name: "Vues Snap", desc: "Boost de visibilité", tiers: [{ label: "Standard", price1k: 1, min: 200 }, { label: "Premium ⭐", price1k: 2.5, min: 100 }, { label: "VIP 👑", price1k: 4, min: 100 }] },
  ],
  X: [
    { name: "Followers", desc: "Comptes actifs", tiers: [{ label: "Standard", price1k: 3, min: 100 }, { label: "Premium ⭐", price1k: 7, min: 50 }, { label: "VIP 👑", price1k: 11.2, min: 50 }] },
    { name: "Likes", desc: "Boost d'engagement", tiers: [{ label: "Standard", price1k: 1, min: 100 }, { label: "Premium ⭐", price1k: 2.5, min: 50 }, { label: "VIP 👑", price1k: 4, min: 50 }] },
    { name: "Retweets", desc: "Amplifie la portée", tiers: [{ label: "Standard", price1k: 1.5, min: 50 }, { label: "Premium ⭐", price1k: 3.5, min: 50 }, { label: "VIP 👑", price1k: 5.6, min: 50 }] },
    { name: "Vues", desc: "Visibilité accrue", tiers: [{ label: "Standard", price1k: 0.5, min: 200 }, { label: "Premium ⭐", price1k: 1.2, min: 100 }, { label: "VIP 👑", price1k: 1.9, min: 100 }] },
  ],
  LinkedIn: [
    { name: "Followers", desc: "Profil ou page entreprise", tiers: [{ label: "Standard", price1k: 3.5, min: 100 }, { label: "Premium ⭐", price1k: 8, min: 50 }, { label: "VIP 👑", price1k: 12.8, min: 50 }] },
    { name: "Vues de publication", desc: "Boost professionnel", tiers: [{ label: "Standard", price1k: 1.5, min: 100 }, { label: "Premium ⭐", price1k: 4, min: 100 }, { label: "VIP 👑", price1k: 6.4, min: 100 }] },
    { name: "Réactions", desc: "Renforce l'engagement", tiers: [{ label: "Standard", price1k: 1.5, min: 50 }, { label: "Premium ⭐", price1k: 4, min: 50 }, { label: "VIP 👑", price1k: 6.4, min: 50 }] },
  ],
  SoundCloud: [
    { name: "Écoutes", desc: "Répartition naturelle", tiers: [{ label: "Standard", price1k: 1, min: 200 }, { label: "Premium ⭐", price1k: 2.5, min: 100 }, { label: "VIP 👑", price1k: 4, min: 100 }] },
    { name: "Followers", desc: "Croissance progressive", tiers: [{ label: "Standard", price1k: 2.5, min: 100 }, { label: "Premium ⭐", price1k: 6, min: 50 }, { label: "VIP 👑", price1k: 9.6, min: 50 }] },
    { name: "Likes", desc: "Boost d'engagement", tiers: [{ label: "Standard", price1k: 1, min: 100 }, { label: "Premium ⭐", price1k: 2.5, min: 50 }, { label: "VIP 👑", price1k: 4, min: 50 }] },
  ],
  "Apple Music": [
    { name: "Écoutes", desc: "Répartition naturelle sur tes titres", tiers: [{ label: "Standard", price1k: 2.5, min: 200 }, { label: "Premium ⭐", price1k: 5.5, min: 100 }, { label: "VIP 👑", price1k: 8.8, min: 100 }] },
  ],
  Audiomack: [
    { name: "Écoutes", desc: "Répartition naturelle", tiers: [{ label: "Standard", price1k: 1.5, min: 200 }, { label: "Premium ⭐", price1k: 3.5, min: 100 }, { label: "VIP 👑", price1k: 5.6, min: 100 }] },
    { name: "Followers", desc: "Croissance progressive", tiers: [{ label: "Standard", price1k: 2, min: 100 }, { label: "Premium ⭐", price1k: 4.5, min: 50 }, { label: "VIP 👑", price1k: 7.2, min: 50 }] },
  ],
};

let CATALOG = JSON.parse(JSON.stringify(DEFAULT_CATALOG));

const MONETIZATION_PACKS = [
  { name: "Pack Monétisation YouTube", desc: "4000h de watch time + 1000 abonnés — seuil Partner Program", criteria: "Critères YouTube : 1 000 abonnés + 4 000h de visionnage sur 12 mois (ou 10M vues Shorts/90 jours)", price: 150 },
  { name: "Pack Monétisation TikTok", desc: "Vues + followers ciblés pour atteindre le seuil Creator Rewards", criteria: "Critères TikTok : 10 000 followers + 100 000 vues sur 30 jours", price: 75 },
  { name: "Pack Créateur Instagram", desc: "Followers + engagement pour candidater aux bonus créateurs", criteria: "Critères Instagram : compte professionnel + engagement régulier requis", price: 60 },
  { name: "Pack Artiste Spotify/Audiomack", desc: "Écoutes + auditeurs pour renforcer ton profil artiste", criteria: "Utile pour candidater à Spotify for Artists et aux playlists éditoriales", price: 65 },
];

const COMBO_PACKS = [
  { name: "Combo TikTok + Instagram", desc: "2000 followers TikTok + 2000 followers Instagram", oldPrice: 38, newPrice: 29, saveLabel: "-24%" },
  { name: "Combo YouTube + TikTok", desc: "3000 vues YouTube + 5000 vues TikTok", oldPrice: 22, newPrice: 16, saveLabel: "-27%" },
  { name: "Combo Réseau Complet", desc: "1000 followers sur TikTok, Instagram, Facebook + 1000 abonnés YouTube", oldPrice: 65, newPrice: 45, saveLabel: "-30%" },
  { name: "Pack Croissance TikTok complet", desc: "1000 followers + 2000 likes + 5000 vues TikTok en une seule commande", oldPrice: 19, newPrice: 14, saveLabel: "-26%" },
  { name: "Pack Croissance Instagram complet", desc: "1000 followers + 2000 likes + 3000 vues Reels en une seule commande", oldPrice: 21, newPrice: 15, saveLabel: "-28%" },
  { name: "Pack Croissance YouTube complet", desc: "500 abonnés + 2000 likes + 5000 vues en une seule commande", oldPrice: 26, newPrice: 19, saveLabel: "-27%" },
];

const TESTIMONIALS = [
  { name: "[À remplacer]", text: "[Colle ici un vrai retour client, avec son accord]", rating: 5 },
  { name: "[À remplacer]", text: "[Colle ici un vrai retour client, avec son accord]", rating: 5 },
];

/* =========================================================
   RÉSEAUX MOBILE MONEY PAR PAYS
   ========================================================= */
const COUNTRY_NETWORKS = {
  "RDC 🇨🇩": ["Vodacom M-Pesa", "Airtel Money", "Orange Money"],
  "Congo-Brazzaville 🇨🇬": ["Airtel Money", "MTN MoMo"],
  "République Centrafricaine 🇨🇫": ["Orange Money", "MTN MoMo"],
  "Soudan du Sud 🇸🇸": ["MTN MoMo", "Zain Cash"],
  "Ouganda 🇺🇬": ["MTN MoMo", "Airtel Money"],
  "Rwanda 🇷🇼": ["MTN MoMo", "Airtel Money"],
  "Burundi 🇧🇮": ["Lumicash", "Ecocash"],
  "Zambie 🇿🇲": ["MTN MoMo", "Airtel Money"],
  "Angola 🇦🇴": ["Unitel Money", "Afrimoney"],
  "Tanzanie 🇹🇿": ["Vodacom M-Pesa", "Airtel Money", "Tigo Pesa"],
  "Cameroun 🇨🇲": ["Orange Money", "MTN MoMo"],
  "Gabon 🇬🇦": ["Airtel Money", "Moov Money"],
  "Tchad 🇹🇩": ["Airtel Money", "Moov Money"],
  "Guinée Équatoriale 🇬🇶": ["Orange Money"],
  "Côte d'Ivoire 🇨🇮": ["Orange Money", "MTN MoMo", "Moov Money", "Wave"],
  "Sénégal 🇸🇳": ["Orange Money", "Wave", "Free Money"],
  "Mali 🇲🇱": ["Orange Money", "Moov Money", "Wave"],
  "Burkina Faso 🇧🇫": ["Orange Money", "Moov Money"],
  "Niger 🇳🇪": ["Orange Money", "Moov Money"],
  "Togo 🇹🇬": ["Moov Money", "T-Money"],
  "Bénin 🇧🇯": ["MTN MoMo", "Moov Money"],
  "Guinée 🇬🇳": ["Orange Money", "MTN MoMo"],
  "Madagascar 🇲🇬": ["Orange Money", "Mvola", "Airtel Money"],
  "Djibouti 🇩🇯": ["Waafi", "D-Money"],
  "Comores 🇰MF": ["Mvola"],
  "Kenya 🇰🇪": ["Safaricom M-Pesa", "Airtel Money"],
  "Afrique du Sud 🇿🇦": ["MTN MoMo", "Vodacom M-Pesa"],
  "Nigeria 🇳🇬": ["MTN MoMo", "Opay", "Palmpay"],
  "Ghana 🇬🇭": ["MTN MoMo", "AirtelTigo Money", "Vodafone Cash"],
  "Sierra Leone 🇸🇱": ["Orange Money", "Africell Money"],
  "Égypte 🇪🇬": ["Vodafone Cash", "Orange Money", "Etisalat Cash"],
  "Maroc 🇲🇦": ["Orange Money Maroc", "inwi money"],
  "Malawi 🇲🇼": ["Airtel Money", "TNM Mpamba"],
  "Éthiopie 🇪🇹": ["Telebirr", "M-Birr"],
};

/* =========================================================
   TAUX DE CHANGE APPROXIMATIFS
   ========================================================= */
const CURRENCY_RATES = {
  "RDC 🇨🇩": { code: "CDF", rate: 2870 },
  "Congo-Brazzaville 🇨🇬": { code: "XAF", rate: 610 },
  "République Centrafricaine 🇨🇫": { code: "XAF", rate: 610 },
  "Soudan du Sud 🇸🇸": { code: "SSP", rate: 130 },
  "Ouganda 🇺🇬": { code: "UGX", rate: 3700 },
  "Rwanda 🇷🇼": { code: "RWF", rate: 1360 },
  "Burundi 🇧🇮": { code: "BIF", rate: 2870 },
  "Zambie 🇿🇲": { code: "ZMW", rate: 27 },
  "Angola 🇦🇴": { code: "AOA", rate: 920 },
  "Tanzanie 🇹🇿": { code: "TZS", rate: 2600 },
  "Cameroun 🇨🇲": { code: "XAF", rate: 610 },
  "Gabon 🇬🇦": { code: "XAF", rate: 610 },
  "Tchad 🇹🇩": { code: "XAF", rate: 610 },
  "Guinée Équatoriale 🇬🇶": { code: "XAF", rate: 610 },
  "Côte d'Ivoire 🇨🇮": { code: "XOF", rate: 610 },
  "Sénégal 🇸🇳": { code: "XOF", rate: 610 },
  "Mali 🇲🇱": { code: "XOF", rate: 610 },
  "Burkina Faso 🇧🇫": { code: "XOF", rate: 610 },
  "Niger 🇳🇪": { code: "XOF", rate: 610 },
  "Togo 🇹🇬": { code: "XOF", rate: 610 },
  "Bénin 🇧🇯": { code: "XOF", rate: 610 },
  "Guinée 🇬🇳": { code: "GNF", rate: 8600 },
  "Madagascar 🇲🇬": { code: "MGA", rate: 4500 },
  "Djibouti 🇩🇯": { code: "DJF", rate: 178 },
  "Comores 🇰MF": { code: "KMF", rate: 450 },
  "Kenya 🇰🇪": { code: "KES", rate: 129 },
  "Afrique du Sud 🇿🇦": { code: "ZAR", rate: 18 },
  "Nigeria 🇳🇬": { code: "NGN", rate: 1600 },
  "Ghana 🇬🇭": { code: "GHS", rate: 15 },
  "Sierra Leone 🇸🇱": { code: "SLE", rate: 23 },
  "Égypte 🇪🇬": { code: "EGP", rate: 49 },
  "Maroc 🇲🇦": { code: "MAD", rate: 9.5 },
  "Malawi 🇲🇼": { code: "MWK", rate: 1740 },
  "Éthiopie 🇪🇹": { code: "ETB", rate: 123 },
};

let selectedCountry = "RDC 🇨🇩";

function convertToLocal(usdAmount) {
  const rateInfo = CURRENCY_RATES[selectedCountry];
  if (!rateInfo) return '';
  const local = (usdAmount * rateInfo.rate).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  return `≈ ${local} ${rateInfo.code}`;
}

/* =========================================================
   PACKS STARTER / PRO / BUSINESS
   ========================================================= */
const PACKAGE_PLANS = [
  { name: "Starter", tagline: "Pour démarrer", price: 15, includes: ["1 plateforme au choix", "1000 unités qualité Standard", "Support WhatsApp"] },
  { name: "Pro", tagline: "Le plus populaire", price: 45, includes: ["2 plateformes au choix", "3000 unités qualité Premium", "Support prioritaire", "1 pack combiné offert"], featured: true },
  { name: "Business", tagline: "Pour les marques", price: 120, includes: ["4 plateformes au choix", "10 000 unités qualité VIP", "Support dédié 7j/7", "2 packs combinés offerts", "Rapport de performance mensuel"] },
];

let currentLang = detectLang();

function t(key) { 
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.fr[key] || key; 
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const langCurr = document.getElementById('lang-current');
  if (langCurr) langCurr.textContent = currentLang.toUpperCase();
  
  renderTabs(); 
  renderServices(); 
  renderMonetization(); 
  renderCombos(); 
  renderTestimonials(); 
  renderPackagePlans();
  renderAppNavLabels();
}

function setLang(lang) {
  currentLang = lang;
  const langMenu = document.getElementById('lang-menu');
  if (langMenu) langMenu.classList.add('hidden');
  applyTranslations();
  if (currentUser && db) db.collection('users').doc(currentUser.uid).update({ lang }).catch(() => {});
}

function toggleLangMenu() { 
  const langMenu = document.getElementById('lang-menu');
  if (langMenu) langMenu.classList.toggle('hidden'); 
}

function renderAppNavLabels() {
  const map = { accueil: 'app_home', commande: 'app_order', activites: 'app_activity', portefeuille: 'app_wallet', compte: 'app_account' };
  document.querySelectorAll('.app-nav-item').forEach(item => {
    const key = map[item.dataset.view];
    if (key) { 
      const lbl = item.querySelector('.nav-label'); 
      if (lbl) lbl.textContent = t(key); 
    }
  });
}

/* =========================================================
   RENDER CATALOGUE
   ========================================================= */
let currentTab = "TikTok";

function renderTabs() {
  ['svc-tabs', 'dash-tabs'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = Object.keys(CATALOG).map(k =>
      `<button class="tab ${k === currentTab ? 'active' : ''}" onclick="switchTab('${k}','${id}')">${platformBadge(k)} ${k}</button>`
    ).join('');
  });
}

function switchTab(tab, from) {
  currentTab = tab; 
  renderTabs(); 
  renderServices();
  if (from === 'dash-tabs') populateDashServiceSelect(tab, null);
}

function renderServices() {
  const grid = document.getElementById('svc-grid');
  if (!grid) return;
  const icon = platformBadge(currentTab);
  grid.innerHTML = CATALOG[currentTab].map(s => {
    const tierRows = s.tiers.map((tier, i) => {
      let cls = '';
      if (i === s.tiers.length - 1 && s.tiers.length === 3) cls = 'vip';
      else if (i === s.tiers.length - 1 && s.tiers.length > 1) cls = 'premium';
      return `<div class="tier-row ${cls}"><span>${tier.label}</span><strong>${tier.price1k}$ /1000</strong></div>`;
    }).join('');
    return `
    <div class="svc-card">
      <span class="tag">${icon} ${currentTab}</span>
      <h3>${s.name}</h3>
      <p class="desc">${s.desc}</p>
      <div class="tier-prices">${tierRows}</div>
      <button onclick="requireLoginThenOrder('${currentTab}',${JSON.stringify(s.name)})">${t('order_btn')}</button>
    </div>`;
  }).join('');
}

function renderMonetization() {
  const el = document.getElementById('mon-grid');
  if (!el) return;
  el.innerHTML = MONETIZATION_PACKS.map(p => `
    <div class="mon-card">
      <span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--gold);font-weight:700">💎 ${t('mon_eyebrow')}</span>
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      <p class="criteria">📋 ${p.criteria}</p>
      <div class="price">${p.price}$</div>
      <button onclick="requireLoginThenOrder('Monétisation',${JSON.stringify(p.name)})">${t('order_btn')}</button>
    </div>
  `).join('');
}

function renderCombos() {
  const el = document.getElementById('combo-grid');
  if (!el) return;
  el.innerHTML = COMBO_PACKS.map(c => `
    <div class="combo-card">
      <span class="save-badge">${c.saveLabel}</span>
      <h3>${c.name}</h3>
      <p class="desc">${c.desc}</p>
      <div class="price-compare"><span class="old-price">${c.oldPrice}$</span><span class="new-price">${c.newPrice}$</span></div>
      <button onclick="contactSupport('Bonjour, je veux commander le pack : ${c.name} (${c.newPrice}\$)')">Commander ce combo</button>
    </div>
  `).join('');
}

let carouselIndex = 0;
let carouselTimer = null;

function renderTestimonials() {
  const el = document.getElementById('testimonials-grid');
  const dotsEl = document.getElementById('carousel-dots');
  if (!el) return;
  el.innerHTML = TESTIMONIALS.map((t, i) => `
    <div class="testimonial-card ${i === 0 ? 'active' : ''}">
      <div class="stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
      <p class="quote">"${t.text}"</p>
      <p class="author">— ${t.name}</p>
    </div>
  `).join('');
  if (dotsEl) {
    dotsEl.innerHTML = TESTIMONIALS.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="goToCarousel(${i})"></span>`).join('');
  }
  carouselIndex = 0;
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => moveCarousel(1), 5000);
}

function moveCarousel(dir) {
  const total = TESTIMONIALS.length;
  carouselIndex = (carouselIndex + dir + total) % total;
  updateCarouselDisplay();
}

function goToCarousel(i) {
  carouselIndex = i;
  updateCarouselDisplay();
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => moveCarousel(1), 5000);
}

function updateCarouselDisplay() {
  document.querySelectorAll('#testimonials-grid .testimonial-card').forEach((el, i) => {
    el.classList.toggle('active', i === carouselIndex);
  });
  document.querySelectorAll('#carousel-dots .dot').forEach((el, i) => {
    el.classList.toggle('active', i === carouselIndex);
  });
}

function renderPackagePlans() {
  const el = document.getElementById('plans-grid');
  if (!el) return;
  el.innerHTML = PACKAGE_PLANS.map(p => `
    <div class="plan-card ${p.featured ? 'featured' : ''}">
      ${p.featured ? '<span class="plan-badge">Le plus populaire</span>' : ''}
      <h3>${p.name}</h3>
      <p class="tagline">${p.tagline}</p>
      <div class="plan-price">${p.price}$</div>
      <ul>${p.includes.map(i => `<li>✓ ${i}</li>`).join('')}</ul>
      <a href="https://wa.me/243825001290?text=${encodeURIComponent('Bonjour, je veux le pack ' + p.name + ' (' + p.price + '$)')}" class="btn ${p.featured ? 'btn-gold' : 'btn-outline'}" style="justify-content:center;padding:12px;border-radius:100px;font-weight:700">Choisir ${p.name}</a>
    </div>
  `).join('');
}

function switchOrderMode(mode) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('order-mode-boost').classList.toggle('hidden', mode !== 'boost');
  document.getElementById('order-mode-mon').classList.toggle('hidden', mode !== 'mon');
  document.getElementById('order-mode-packs').classList.toggle('hidden', mode !== 'packs');
  if (mode === 'mon') renderDashMonetization();
  if (mode === 'packs') renderDashPacks();
}

function renderDashPacks() {
  const plansEl = document.getElementById('dash-plans-grid');
  const combosEl = document.getElementById('dash-combo-grid');
  if (plansEl) {
    plansEl.innerHTML = PACKAGE_PLANS.map(p => `
      <div class="plan-card ${p.featured ? 'featured' : ''}">
        ${p.featured ? '<span class="plan-badge">Le plus populaire</span>' : ''}
        <h3>${p.name}</h3>
        <p class="tagline">${p.tagline}</p>
        <div class="plan-price">${p.price}$</div>
        <ul>${p.includes.map(i => `<li>✓ ${i}</li>`).join('')}</ul>
        <a href="https://wa.me/243825001290?text=${encodeURIComponent('Bonjour, je veux le pack ' + p.name + ' (' + p.price + '$)')}" target="_blank" class="btn ${p.featured ? 'btn-gold' : 'btn-outline'}" style="justify-content:center;padding:12px;border-radius:100px;font-weight:700">Choisir ${p.name}</a>
      </div>
    `).join('');
  }
  if (combosEl) {
    combosEl.innerHTML = COMBO_PACKS.map(c => `
      <div class="combo-card">
        <span class="save-badge">${c.saveLabel}</span>
        <h3>${c.name}</h3>
        <p class="desc">${c.desc}</p>
        <div class="price-compare"><span class="old-price">${c.oldPrice}$</span><span class="new-price">${c.newPrice}$</span></div>
        <button onclick="contactSupport('Bonjour, je veux commander le pack : ${c.name} (${c.newPrice}\$)')">Commander ce combo</button>
      </div>
    `).join('');
  }
}

function renderDashMonetization() {
  const el = document.getElementById('dash-mon-grid');
  if (!el) return;
  el.innerHTML = MONETIZATION_PACKS.map(p => `
    <div class="mon-card">
      <span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--gold);font-weight:700">💎 Pack monétisation</span>
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      <p class="criteria">📋 ${p.criteria}</p>
      <div class="price">${p.price}$</div>
      <button onclick="contactSupport('Bonjour, je veux le pack : ${p.name} (${p.price}\$)')">Commander ce pack</button>
    </div>
  `).join('');
}

function requireLoginThenOrder(platform, service) {
  if (!currentUser) { openAuth('login'); return; }
  enterApp(); 
  switchAppView('commande'); 
  populateDashServiceSelect(platform, service);
}

/* =========================================================
   NAVIGATION APP SHELL
   ========================================================= */
function enterApp() {
  document.getElementById('public-nav').classList.add('hidden');
  document.getElementById('view-public-home').classList.add('hidden');
  document.getElementById('public-footer').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
}

function exitApp() {
  document.getElementById('public-nav').classList.remove('hidden');
  document.getElementById('view-public-home').classList.remove('hidden');
  document.getElementById('public-footer').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

function switchAppView(view) {
  document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
  document.getElementById('app-' + view).classList.remove('hidden');
  document.querySelectorAll('.app-nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === view));
  const titles = { accueil: t('app_home'), commande: t('app_order'), activites: t('app_activity'), portefeuille: t('app_wallet'), compte: t('app_account') };
  const titleEl = document.getElementById('app-view-title');
  if (titleEl) titleEl.textContent = titles[view];
  
  if (view === 'commande') { 
    renderTabs(); 
    const svcVal = document.getElementById('d-service');
    if (svcVal && !svcVal.value) populateDashServiceSelect(currentTab, null); 
  }
  if (view === 'activites') loadOrders();
  if (view === 'portefeuille') renderCountrySelect();
}

/* =========================================================
   AUTH (Email + Google)
   ========================================================= */
let currentUser = null;
let authMode = 'register';

function openAuth(mode) { 
  authMode = mode; 
  updateAuthModalMode(); 
  document.getElementById('auth-modal').classList.remove('hidden'); 
}

function closeAuth() { 
  document.getElementById('auth-modal').classList.add('hidden'); 
}

function toggleAuthMode() { 
  authMode = authMode === 'register' ? 'login' : 'register'; 
  updateAuthModalMode(); 
}

function updateAuthModalMode() {
  const isReg = authMode === 'register';
  document.getElementById('auth-title').textContent = isReg ? 'Créer un compte' : 'Se connecter';
  document.getElementById('auth-name-field').classList.toggle('hidden', !isReg);
  document.getElementById('auth-submit').textContent = isReg ? 'Créer mon compte' : 'Se connecter';
  document.getElementById('auth-switch-text').textContent = isReg ? 'Déjà un compte ?' : 'Pas encore de compte ?';
  document.getElementById('auth-switch-btn').textContent = isReg ? 'Se connecter' : "S'inscrire";
  document.getElementById('auth-error').classList.add('hidden');
}

function showAuthError(msg) { 
  const el = document.getElementById('auth-error'); 
  el.textContent = msg; 
  el.classList.remove('hidden'); 
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  if (!fbReady) { showAuthError("Connecte d'abord ce site à ton projet Firebase (voir firebaseConfig)."); return; }
  if (!email || !password) { showAuthError("Email et mot de passe requis."); return; }
  try {
    if (authMode === 'register') {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({ name: name || email.split('@')[0], email, balance: 0, lang: currentLang, referredBy: getReferralCodeFromURL(), createdAt: new Date().toISOString() });
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    closeAuth();
  } catch(e) { showAuthError(e.message); }
}

async function signInWithGoogle() {
  if (!fbReady) { showAuthError("Connecte d'abord ce site à ton projet Firebase."); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const ref = db.collection('users').doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({ name: user.displayName || user.email.split('@')[0], email: user.email, balance: 0, lang: currentLang, createdAt: new Date().toISOString() });
    }
    closeAuth();
  } catch(e) { showAuthError(e.message); }
}

function logout() { 
  if (fbReady) auth.signOut(); 
  exitApp(); 
}

/* =========================================================
   PROGRAMME D'AFFILIATION
   ========================================================= */
const REFERRAL_COMMISSION_RATE = 0.05;

function getReferralCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || null;
}

function getReferralLink() {
  if (!currentUser) return '';
  return window.location.origin + window.location.pathname + '?ref=' + currentUser.uid;
}

function copyReferralLink() {
  const link = getReferralLink();
  navigator.clipboard.writeText(link).then(() => {
    document.getElementById('referral-copy-msg').textContent = "✅ Lien copié !";
  }).catch(() => {
    document.getElementById('referral-copy-msg').textContent = link;
  });
}

async function loadReferralStats() {
  if (!currentUser || !db) return;
  const el = document.getElementById('referral-link-display');
  if (el) el.textContent = getReferralLink();
  try {
    const snap = await db.collection('users').where('referredBy', '==', currentUser.uid).get();
    const countEl = document.getElementById('referral-count');
    if (countEl) countEl.textContent = snap.size;
  } catch(e) { console.warn("Stats parrainage non disponibles :", e.message); }
}

if (fbReady) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const doc = await db.collection('users').doc(user.uid).get();
      const data = doc.exists ? doc.data() : { name: user.email, email: user.email, balance: 0, lang: 'fr', createdAt: new Date().toISOString() };
      currentUser = { uid: user.uid, ...data };
      if (data.lang) { currentLang = data.lang; }
      enterApp();
      
      const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      setTxt('dash-username', currentUser.name);
      setTxt('profile-name', currentUser.name);
      setTxt('profile-email', currentUser.email);
      setTxt('profile-since', new Date(currentUser.createdAt).toLocaleDateString('fr-FR'));

      const adminBox = document.getElementById('admin-access-box');
      if (adminBox) adminBox.classList.toggle('hidden', currentUser.uid !== ADMIN_UID);
      
      const langSelect = document.getElementById('profile-lang');
      if (langSelect) langSelect.value = currentLang;
      
      document.body.classList.toggle('dark-mode', !!data.darkMode);
      updateBalanceDisplays();
      applyTranslations();
      switchAppView('accueil');
      loadOrders();
      loadReferralStats();
    } else {
      currentUser = null;
    }
  });
}

function updateProfileLang(lang) { setLang(lang); }

function updateBalanceDisplays() {
  const bal = (currentUser?.balance || 0).toFixed(2);
  const setBal = (id) => { const el = document.getElementById(id); if (el) el.textContent = bal + '$'; };
  setBal('nav-balance');
  setBal('dash-balance');
  setBal('dash-balance-2');
  
  const ptsEl = document.getElementById('loyalty-points-display');
  if (ptsEl) ptsEl.textContent = (currentUser?.loyaltyPoints || 0) + ' pts';
}

/* =========================================================
   DEPOSIT — PAIEMENTS
   ========================================================= */
const PAYMENT_PUBLIC_KEY = "REPLACE_WITH_YOUR_PUBLIC_KEY";
const STRIPE_PUBLIC_KEY = "REPLACE_WITH_YOUR_STRIPE_PUBLIC_KEY";

let selectedNetwork = null;

function selectNetwork(el) {
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected'); 
  selectedNetwork = el.dataset.net;
  const note = document.getElementById('card-note');
  if (note) note.classList.toggle('hidden', selectedNetwork !== 'card');
}

function renderCountrySelect() {
  const select = document.getElementById('country-select');
  if (!select) return;
  select.innerHTML = Object.keys(COUNTRY_NETWORKS).map(c => `<option value="${c}">${c}</option>`).join('');
  select.value = selectedCountry;
  renderMobileNetworks();
  updateLocalConversion();
}

function onCountryChange() {
  selectedCountry = document.getElementById('country-select').value;
  renderMobileNetworks();
  updateLocalConversion();
}

function renderMobileNetworks() {
  const grid = document.getElementById('mobile-networks-grid');
  if (!grid) return;
  const networks = COUNTRY_NETWORKS[selectedCountry] || [];
  grid.innerHTML = networks.map(n =>
    `<div class="pay-opt" data-net="${n.toLowerCase().replace(/\s+/g, '-')}" onclick="selectNetwork(this)">📱 ${n}</div>`
  ).join('');
}

function updateLocalConversion() {
  const el = document.getElementById('local-conversion');
  if (!el) return;
  const amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
  el.textContent = amount > 0 ? convertToLocal(amount) + " (taux indicatif, susceptible de varier)" : '';
}

async function redeemLoyaltyPoints() {
  const msgEl = document.getElementById('redeem-msg');
  if (!currentUser) { openAuth('login'); return; }
  const points = currentUser.loyaltyPoints || 0;
  if (points < 100) { 
    msgEl.textContent = "Il te faut au moins 100 points pour convertir (tu en as " + points + ")."; 
    msgEl.style.color = 'var(--red)'; 
    return; 
  }
  const credit = Math.floor(points / 100);
  const usedPoints = credit * 100;
  const newBalance = (currentUser.balance || 0) + credit;
  const newPoints = points - usedPoints;
  await db.collection('users').doc(currentUser.uid).update({ balance: newBalance, loyaltyPoints: newPoints });
  currentUser.balance = newBalance;
  currentUser.loyaltyPoints = newPoints;
  updateBalanceDisplays();
  msgEl.textContent = `✅ ${usedPoints} points convertis en ${credit}$ de crédit !`;
  msgEl.style.color = 'var(--green)';
}

async function callPaymentGateway({ amount, phone, network }) {
  if (network === 'card') {
    console.log("[stub] Appel Stripe Checkout :", { amount, publicKey: STRIPE_PUBLIC_KEY });
    return { success: false, reason: "Stripe non connecté pour le moment." };
  }
  console.log("[stub] Appel API paiement mobile money :", { amount, phone, network, publicKey: PAYMENT_PUBLIC_KEY });
  return { success: false, reason: "Aucune passerelle de paiement réelle connectée." };
}

async function submitDeposit() {
  if (!currentUser) { openAuth('login'); return; }
  if (!selectedNetwork) { alert("Choisis un mode de paiement."); return; }
  const amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
  const phone = document.getElementById('deposit-phone').value.trim();
  const isCard = selectedNetwork === 'card';
  if (amount <= 0 || (!isCard && !phone)) { 
    alert("Renseigne un montant" + (isCard ? " valide." : " et un numéro valides.")); 
    return; 
  }

  await db.collection('deposits').add({ uid: currentUser.uid, amount, network: selectedNetwork, phone, status: 'pending', createdAt: new Date().toISOString() });
  const result = await callPaymentGateway({ amount, phone, network: selectedNetwork });
  if (result.success) {
    showNotification("✅ Paiement reçu — solde crédité !");
  } else {
    showNotification("⏳ Demande de recharge enregistrée. Confirme avec le support si besoin.");
  }
}

async function creditReferralCommissionIfFirstOrder(orderAmount) {
  if (!currentUser.referredBy) return;
  const priorOrders = await db.collection('orders').where('uid', '==', currentUser.uid).get();
  if (priorOrders.size > 1) return;
  const commission = orderAmount * REFERRAL_COMMISSION_RATE;
  const referrerRef = db.collection('users').doc(currentUser.referredBy);
  const referrerDoc = await referrerRef.get();
  if (referrerDoc.exists) {
    await referrerRef.update({ balance: (referrerDoc.data().balance || 0) + commission });
  }
}

/* =========================================================
   UTILITAIRES DE LIENS DE COMMANDES
   ========================================================= */
function normalizeLink(link) {
  link = link.trim();
  if (!/^https?:\/\//i.test(link)) link = 'https://' + link;
  return link;
}

function isValidLink(link) {
  try {
    const url = new URL(link);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch(e) { return false; }
}

/* =========================================================
   GESTION DES COMMANDES
   ========================================================= */
function populateDashServiceSelect(platform, serviceName) {
  const select = document.getElementById('d-service');
  if (!select) return;
  select.innerHTML = '';
  const services = CATALOG[platform] || [];
  services.forEach(s => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify({ platform, name: s.name });
    opt.textContent = s.name;
    if (!serviceName || s.name === serviceName) opt.selected = true;
    select.appendChild(opt);
  });
  populateQualitySelect();
  updateOrderCost();
}

function populateQualitySelect() {
  const select = document.getElementById('d-service');
  const qualitySelect = document.getElementById('d-quality');
  if (!select || !select.value || !qualitySelect) return;
  const chosen = JSON.parse(select.value);
  const svc = (CATALOG[chosen.platform] || []).find(s => s.name === chosen.name);
  if (!svc) return;
  qualitySelect.innerHTML = svc.tiers.map((tier, i) =>
    `<option value="${i}">${tier.label} — ${tier.price1k}$ / 1000</option>`
  ).join('');
}

document.addEventListener('input', (e) => { if (e.target.id === 'd-qty') updateOrderCost(); });
document.addEventListener('change', (e) => {
  if (e.target.id === 'd-service') { populateQualitySelect(); updateOrderCost(); }
  if (e.target.id === 'd-quality') { updateOrderCost(); }
});

function getSelectedTier() {
  const select = document.getElementById('d-service');
  const qualitySelect = document.getElementById('d-quality');
  if (!select || !select.value) return null;
  const chosen = JSON.parse(select.value);
  const svc = (CATALOG[chosen.platform] || []).find(s => s.name === chosen.name);
  if (!svc) return null;
  const tierIndex = parseInt(qualitySelect.value) || 0;
  return { platform: chosen.platform, name: svc.name, tier: svc.tiers[tierIndex] };
}

const TARGETING_MULTIPLIERS = {
  none: 1, france: 1.4, canada: 1.4, belgique: 1.4, afrique: 1.15, nigeria: 1.2, rdc: 1.15, usa: 1.45
};

function updateOrderCost() {
  const sel = getSelectedTier();
  if (!sel) return;
  const qtyInput = document.getElementById('d-qty');
  const qty = Math.max(sel.tier.min || 10, parseInt(qtyInput ? qtyInput.value : 0) || sel.tier.min || 10);
  const targetEl = document.getElementById('d-targeting');
  const multiplier = TARGETING_MULTIPLIERS[targetEl ? targetEl.value : 'none'] || 1;
  const cost = sel.tier.price1k * (qty / 1000) * multiplier;
  
  const costEl = document.getElementById('d-cost');
  if (costEl) costEl.textContent = cost.toFixed(2) + '$';

  const upsellEl = document.getElementById('upsell-suggestion');
  if (upsellEl) {
    const doubleQty = qty * 2;
    const doubleCost = sel.tier.price1k * (doubleQty / 1000) * multiplier;
    const extra = (doubleCost - cost).toFixed(2);
    upsellEl.innerHTML = `Envie de plus d'impact ? Double ta quantité (${doubleQty}) pour seulement <strong>+${extra}$</strong> de plus.
      <button type="button" onclick="applyUpsell(${doubleQty})">Doubler ma commande</button>`;
    upsellEl.classList.remove('hidden');
  }
}

function applyUpsell(newQty) {
  const qtyEl = document.getElementById('d-qty');
  if (qtyEl) qtyEl.value = newQty;
  updateOrderCost();
}

async function placeOrder() {
  const msgEl = document.getElementById('order-msg');
  if (!currentUser) { openAuth('login'); return; }
  const sel = getSelectedTier();
  if (!sel) { msgEl.textContent = "Choisis un service."; msgEl.style.color = 'var(--red)'; return; }
  const qtyInput = document.getElementById('d-qty');
  const qty = Math.max(sel.tier.min || 10, parseInt(qtyInput ? qtyInput.value : 0) || sel.tier.min || 10);
  const rawLink = document.getElementById('d-link').value;
  const link = normalizeLink(rawLink);
  const targetEl = document.getElementById('d-targeting');
  const targeting = targetEl ? targetEl.value : 'none';
  const multiplier = TARGETING_MULTIPLIERS[targeting] || 1;
  const cost = sel.tier.price1k * (qty / 1000) * multiplier;

  if (!rawLink.trim()) { msgEl.textContent = "Ajoute le lien du profil/publication."; msgEl.style.color = 'var(--red)'; return; }
  if (!isValidLink(link)) { msgEl.textContent = "Ce lien ne semble pas valide (doit commencer par http:// ou https://)."; msgEl.style.color = 'var(--red)'; return; }
  if (cost > (currentUser.balance || 0)) { msgEl.textContent = "Solde insuffisant — recharge ton portefeuille."; msgEl.style.color = 'var(--red)'; return; }

  const pointsEarned = Math.max(1, Math.round(cost));
  const newBalance = currentUser.balance - cost;
  const newPoints = (currentUser.loyaltyPoints || 0) + pointsEarned;
  await db.collection('users').doc(currentUser.uid).update({ balance: newBalance, loyaltyPoints: newPoints });
  currentUser.balance = newBalance;
  currentUser.loyaltyPoints = newPoints;
  updateBalanceDisplays();

  const orderRef = await db.collection('orders').add({ uid: currentUser.uid, platform: sel.platform, service: sel.name, quality: sel.tier.label, targeting, qty, link, amount: cost, status: 'pending', createdAt: new Date().toISOString() });
  await creditReferralCommissionIfFirstOrder(cost);
  await tryAutoSendToMTP(orderRef.id, sel.platform, sel.name, sel.tier.label, link, qty);

  msgEl.textContent = "Commande envoyée ! Suivi disponible dans Activités.";
  msgEl.style.color = 'var(--green)';
  document.getElementById('d-link').value = '';
  showNotification(`✅ Commande validée — +${pointsEarned} points fidélité`);
  loadOrders();
}

/* =========================================================
   ENVOI AUTOMATIQUE À MORETHANPANEL (API)
   ========================================================= */
const API_BASE = "https://coeurnohboost.vercel.app/api";

async function tryAutoSendToMTP(orderId, platform, service, qualityLabel, link, qty) {
  try {
    const doc = await db.collection('settings').doc('mtpServiceMap').get();
    if (!doc.exists) return;
    const key = platform + '|' + service;
    const ids = doc.data()[key];
    if (!ids) return;
    const tierIndex = qualityLabel.startsWith('VIP') ? 2 : (qualityLabel.startsWith('Premium') ? 1 : 0);
    const serviceId = ids[tierIndex];
    if (!serviceId) return;

    const res = await fetch(API_BASE + '/place-smm-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: serviceId, link, quantity: qty })
    });
    const data = await res.json();
    if (data.success) {
      await db.collection('orders').doc(orderId).update({ mtpOrderId: data.orderId, status: 'done' });
    } else {
      await db.collection('orders').doc(orderId).update({ status: 'failed' });
    }
  } catch(e) {
    console.warn("Envoi automatique MTP non disponible :", e.message);
  }
}

let ordersUnsubscribe = null;

function loadOrders() {
  if (!currentUser || !db) return;
  if (ordersUnsubscribe) ordersUnsubscribe();
  ordersUnsubscribe = db.collection('orders').where('uid', '==', currentUser.uid).orderBy('createdAt', 'desc').limit(20)
    .onSnapshot(snap => {
      const tbody = document.getElementById('orders-table');
      if (!tbody) return;
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Aucune commande pour le moment</td></tr>';
        const countEl = document.getElementById('dash-order-count');
        if (countEl) countEl.textContent = '0';
        return;
      }
      const countEl = document.getElementById('dash-order-count');
      if (countEl) countEl.textContent = snap.size;
      tbody.innerHTML = snap.docs.map(d => {
        const o = d.data();
        const date = new Date(o.createdAt).toLocaleDateString('fr-FR');
        const statusLabel = o.status === 'done' ? 'Livré' : (o.status === 'cancelled' ? 'Annulé (remboursé)' : 'En cours');
        const statusClass = o.status === 'done' ? 'done' : (o.status === 'cancelled' ? 'cancelled' : 'pending');
        return `<tr><td>${date}</td><td>${o.platform} — ${o.service}</td><td>${o.qty}</td><td>${o.amount.toFixed(2)}$</td><td><span class="status ${statusClass}">${statusLabel}</span></td></tr>`;
      }).join('');
    }, err => console.warn("Suivi temps réel indisponible :", err.message));
}

/* =========================================================
   MODE SOMBRE / CLAIR
   ========================================================= */
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  if (currentUser && db) {
    db.collection('users').doc(currentUser.uid).update({ darkMode: isDark }).catch(() => {});
  }
}

/* =========================================================
   PARTAGE DU SITE
   ========================================================= */
function shareSite() {
  const url = window.location.origin + window.location.pathname;
  const shareData = { title: "Coeurnoh Boost", text: "Fais grandir ta présence sur les réseaux sociaux avec Coeurnoh Boost !", url };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      showNotification("🔗 Lien du site copié !");
    }).catch(() => {
      alert(url);
    });
  }
}

/* =========================================================
   NEWSLETTER
   ========================================================= */
async function subscribeNewsletter() {
  const input = document.getElementById('newsletter-email');
  const msg = document.getElementById('newsletter-msg');
  const email = input.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.textContent = "Entre un email valide."; msg.style.color = '#ff8a8a'; return;
  }
  if (!db) { msg.textContent = "Service indisponible pour le moment."; return; }
  try {
    await db.collection('newsletter').add({ email, createdAt: new Date().toISOString() });
    msg.textContent = "✅ Inscrit ! Merci."; msg.style.color = '#8fd6b0';
    input.value = '';
  } catch(e) {
    msg.textContent = "Erreur, réessaie."; msg.style.color = '#ff8a8a';
  }
}

/* =========================================================
   BOUTON RETOUR EN HAUT
   ========================================================= */
window.addEventListener('scroll', () => {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  btn.classList.toggle('hidden', window.scrollY < 400);
});

/* =========================================================
   SUPPORT ET CONTACT
   ========================================================= */
function contactSupport(prefilledMessage) {
  const base = "https://wa.me/243825001290?text=";
  const text = prefilledMessage ? prefilledMessage : "Bonjour, j'ai une question concernant mon compte Coeurnoh Boost.";
  window.open(base + encodeURIComponent(text), '_blank');
}

function submitContactForm() {
  const name = document.getElementById('contact-name').value.trim();
  const subject = document.getElementById('contact-subject').value.trim();
  const message = document.getElementById('contact-message').value.trim();
  if (!name || !message) { alert("Merci de remplir au moins ton nom et ton message."); return; }
  contactSupport(`Nom: ${name}\nSujet: ${subject}\nMessage: ${message}`);
}

/* =========================================================
   VIEWS PUBLIQUES
   ========================================================= */
function showPublicPage(id) {
  document.querySelectorAll('.public-page').forEach(p => p.classList.add('hidden'));
  document.getElementById('view-public-home').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo({ top: 0 });
}

function showPublicHome() {
  document.querySelectorAll('.public-page').forEach(p => p.classList.add('hidden'));
  document.getElementById('view-public-home').classList.remove('hidden');
}

/* =========================================================
   OVERRIDES DE PRIX (FIRESTORE)
   ========================================================= */
async function loadCatalogOverrides() {
  if (!db) return;
  try {
    const doc = await db.collection('settings').doc('pricing').get();
    if (doc.exists) {
      const overrides = doc.data();
      Object.keys(overrides).forEach(platform => {
        if (!CATALOG[platform]) return;
        overrides[platform].forEach(o => {
          const svc = CATALOG[platform].find(s => s.name === o.name);
          if (svc && o.tiers) svc.tiers = o.tiers;
        });
      });
      renderServices();
    }
  } catch(e) { console.warn("Pas de tarifs personnalisés trouvés :", e.message); }
  
  try {
    const monDoc = await db.collection('settings').doc('monetizationPricing').get();
    if (monDoc.exists && monDoc.data().packs) {
      monDoc.data().packs.forEach(o => {
        const pack = MONETIZATION_PACKS.find(p => p.name === o.name);
        if (pack) pack.price = o.price;
      });
      renderMonetization();
    }
  } catch(e) { console.warn("Pas de tarifs de monétisation personnalisés :", e.message); }
}

/* =========================================================
   COMPTEUR ANIMÉ
   ========================================================= */
function animateCounters() {
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(eased * target);
      el.textContent = value.toLocaleString('fr-FR') + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/* =========================================================
   RECHERCHE INTERNE
   ========================================================= */
function searchServices(query) {
  const resultsEl = document.getElementById('search-results');
  if (!resultsEl) return;
  query = query.trim().toLowerCase();
  if (query.length < 2) { resultsEl.innerHTML = ''; resultsEl.classList.add('hidden'); return; }
  const matches = [];
  Object.entries(CATALOG).forEach(([platform, services]) => {
    services.forEach(s => {
      if (s.name.toLowerCase().includes(query) || platform.toLowerCase().includes(query)) {
        matches.push({ platform, service: s.name });
      }
    });
  });
  if (matches.length === 0) {
    resultsEl.innerHTML = '<div class="search-result-item">Aucun résultat.</div>';
  } else {
    resultsEl.innerHTML = matches.slice(0, 8).map(m =>
      `<div class="search-result-item" onclick="requireLoginThenOrder('${m.platform}', ${JSON.stringify(m.service)})">${platformBadge(m.platform, 18)} ${m.platform} — ${m.service}</div>`
    ).join('');
  }
  resultsEl.classList.remove('hidden');
}

/* =========================================================
   INITIALISATION
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  loadCatalogOverrides();
  
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { animateCounters(); statObserver.disconnect(); }
    });
  }, { threshold: 0.4 });
  
  const statStrip = document.querySelector('.stat-strip');
  if (statStrip) statObserver.observe(statStrip);
});
