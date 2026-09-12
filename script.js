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
const FCM_VAPID_KEY = "BCwBF4M8jxL1uYPBERZvSFz0lYZk34m7vNLUtBby1lUwfoYVLFgY4c23OX6r7QCSCtEOu4GWG8_enFL_Ff5muck";

/* ================= NOTIFICATIONS "TOAST" (bannieres discretes) =================
   Remplace les alert() bloquants pour les messages courts (succes, erreur,
   confirmation) — sauf pour les instructions longues et le fallback de
   copie manuelle, ou une vraie boite de dialogue reste plus adaptee. */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) { alert(message); return; }
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Protege contre l'injection de code (XSS) : transforme un texte libre
// (nom, titre, description, commentaire...) pour qu'il s'affiche tel quel
// au lieu d'etre interprete comme du HTML/JavaScript. A utiliser partout
// ou du texte saisi par un utilisateur est affiche a l'ecran.
// AVANT : un lien de partage Google Drive colle tel quel (ex :
// https://drive.google.com/file/d/XXXX/view?usp=sharing) ne fonctionne PAS
// comme source directe d'image/video -- Drive sert une page de visualisation,
// pas le fichier brut. Resultat : image/video cassee ("boite noire") pour
// tout le monde qui la regarde. Cette fonction convertit automatiquement le
// format de partage le plus courant vers un lien qui fonctionne vraiment.
function normalizeMediaUrl(url) {
  if (!url) return url;
  const trimmed = url.trim();

  // Format "https://drive.google.com/file/d/FICHIER_ID/view?..."
  let m = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  // Format "https://drive.google.com/open?id=FICHIER_ID"
  m = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  return trimmed;
}

// Affiche un message propre a la place d'une image/video cassee, plutot
// que la petite icone cassee du navigateur sur fond noir (mauvaise
// impression professionnelle, comme signale par un utilisateur).
function mediaLoadError(el) {
  if (el.dataset.errorHandled) return;
  el.dataset.errorHandled = '1';
  el.style.display = 'none';
  const msg = document.createElement('div');
  msg.className = 'media-error-placeholder';
  msg.innerHTML = `${ICON_INFO || ''} Média indisponible — le lien est peut-être invalide ou expiré.`;
  el.insertAdjacentElement('afterend', msg);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ================= UPLOAD DE FICHIER DIRECT (Cloudinary) =================
   Envoie un vrai fichier choisi sur le telephone (photo, video, PDF) vers
   Cloudinary (pas besoin de carte bancaire, contrairement a Firebase
   Storage), avec suivi de progression, et renvoie l'URL a stocker dans
   Firestore. Remplace le systeme "colle un lien externe" (postimages.org /
   Google Drive) qui obligeait chaque utilisateur a passer par un site tiers
   avant de pouvoir publier.

   CONFIGURATION REQUISE (une seule fois) :
   1. Cree un compte gratuit sur https://cloudinary.com (aucune carte requise).
   2. Sur le tableau de bord, copie ton "Cloud name" -> colle-le ci-dessous.
   3. Va dans Settings (icone engrenage) > Upload > tout en bas "Upload presets"
      > "Add upload preset" > mets "Signing Mode" sur "Unsigned" > Save.
      Copie le nom du preset -> colle-le ci-dessous. */
const CLOUDINARY_CLOUD_NAME = "aqe4fxh4";
const CLOUDINARY_UPLOAD_PRESET = "coeurnoh_universe";

function uploadFileToStorage(file, folder, options = {}) {
  const { onProgress, maxSizeMB = 100 } = options;
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error("Aucun fichier sélectionné.")); return; }
    if (file.size > maxSizeMB * 1024 * 1024) {
      reject(new Error(`Fichier trop volumineux (max ${maxSizeMB} Mo).`));
      return;
    }
    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME.startsWith('COLLE_') ||
        !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET.startsWith('COLLE_')) {
      reject(new Error("L'envoi de fichiers n'est pas encore configuré (Cloudinary manquant)."));
      return;
    }

    // Le type de ressource Cloudinary determine l'URL a utiliser : les
    // images et videos passent par leurs endpoints dedies, tout le reste
    // (PDF, etc.) passe par "raw" pour garder le fichier tel quel.
    let resourceType = 'raw';
    if (file.type.startsWith('image/')) resourceType = 'image';
    else if (file.type.startsWith('video/')) resourceType = 'video';

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
      if (xhr.status >= 200 && xhr.status < 300 && data && data.secure_url) {
        resolve({ url: data.secure_url, path: data.public_id });
      } else {
        const msg = (data && data.error && data.error.message) || "Échec de l'envoi du fichier.";
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'envoi du fichier."));
    xhr.send(formData);
  });
}

// Petites aides pour afficher/mettre a jour une barre de progression
// d'upload generique (utilisee pour les publications ET la boutique).
function resetUploadProgress(prefix) {
  const wrap = document.getElementById(`${prefix}-progress-wrap`);
  const fill = document.getElementById(`${prefix}-progress-fill`);
  const label = document.getElementById(`${prefix}-progress-label`);
  if (wrap) wrap.classList.add('hidden');
  if (fill) fill.style.width = '0%';
  if (label) label.textContent = '0%';
}

function setUploadProgress(prefix, pct) {
  const wrap = document.getElementById(`${prefix}-progress-wrap`);
  const fill = document.getElementById(`${prefix}-progress-fill`);
  const label = document.getElementById(`${prefix}-progress-label`);
  if (wrap) wrap.classList.remove('hidden');
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;
}

let fbReady = false;
let auth = null;
let db = null;

/* ================= APPARENCE (theme + taille de police) =================
   Reglage local a l'appareil (localStorage), applique immediatement au
   chargement de la page — meme avant connexion — pour eviter tout flash
   du mauvais theme. Par defaut : theme automatique (suit le systeme) et
   taille de texte normale, donc aucun changement visuel pour les
   utilisateurs qui n'ont jamais touche a ce reglage. */
function applyAppearance() {
  const theme = localStorage.getItem('appTheme') || 'auto';
  const fontSize = localStorage.getItem('appFontSize') || 'normal';
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveTheme = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme;

  document.documentElement.setAttribute('data-theme', effectiveTheme);
  document.documentElement.setAttribute('data-fontsize', fontSize);

  document.querySelectorAll('.theme-choice').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  document.querySelectorAll('.fontsize-choice').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.fontsize === fontSize);
  });
}

function setTheme(theme) {
  localStorage.setItem('appTheme', theme);
  applyAppearance();
}

function setFontSize(size) {
  localStorage.setItem('appFontSize', size);
  applyAppearance();
}

applyAppearance();

// En mode "Automatique", suit un changement de theme du systeme en direct
// (ex: le telephone bascule en sombre au coucher du soleil).
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('appTheme') || 'auto') === 'auto') applyAppearance();
  });
}

/* ================= INSTALLATION DE L'APP (PWA) =================
   Pour les gens qui utilisent encore le site dans un navigateur classique :
   propose d'installer l'app comme une vraie application (icone sur l'ecran
   d'accueil), sans passer par un store. */
let deferredInstallPrompt = null;

function isAppAlreadyInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!isAppAlreadyInstalled()) {
    const btn = document.getElementById('install-app-btn');
    if (btn) btn.classList.remove('hidden');
  }
});

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.classList.add('hidden');
  deferredInstallPrompt = null;
});

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[install] Choix utilisateur :', outcome);
    deferredInstallPrompt = null;
    document.getElementById('install-app-btn').classList.add('hidden');
    return;
  }
  // Pas d'invite native disponible (iPhone/iPad, ou certains navigateurs) :
  // on explique la manipulation manuelle.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) {
    alert("Pour installer l'app sur iPhone/iPad :\n\n1. Touche le bouton Partager (le carré avec la flèche vers le haut) en bas de Safari\n2. Fais défiler et touche \"Sur l'écran d'accueil\"\n3. Touche \"Ajouter\"");
  } else {
    alert("Pour installer : ouvre le menu de ton navigateur (⋮ en haut à droite) puis choisis \"Installer l'application\" ou \"Ajouter à l'écran d'accueil\".");
  }
}

// Sur iPhone/iPad, il n'y a jamais d'evenement "beforeinstallprompt" -- on
// affiche quand meme le bouton (avec l'astuce manuelle) si l'app n'est pas
// deja installee.
(function () {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !isAppAlreadyInstalled()) {
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('install-app-btn');
      if (btn) btn.classList.remove('hidden');
    });
  }
})();

let currentUser = null;
let authMode = 'register';

try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  // Garde la connexion active indefiniment sur cet appareil, meme apres
  // fermeture complete de l'app/du navigateur -- deconnexion UNIQUEMENT si
  // la personne clique explicitement sur "Deconnexion".
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((e) => {
    console.log('[auth] Persistance non definie :', e.message);
  });
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
  document.getElementById('view-shop').classList.add('hidden');
  document.getElementById('view-library').classList.add('hidden');
  document.getElementById('view-seller').classList.add('hidden');
  document.getElementById('view-notifications').classList.add('hidden');
}
function showHome() {
  hideAllViews();
  document.getElementById('view-home').classList.remove('hidden');
}
function showDashboard() {
  hideAllViews();
  document.getElementById('view-dashboard').classList.remove('hidden');
  showDashTab('home');
  updateNotifBadge();
}
function showDashTab(tab) {
  document.querySelectorAll('.dash-tab').forEach(el => el.classList.add('hidden'));
  document.getElementById('dash-tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.bnav-btn').forEach(el => el.classList.remove('active'));
  // "account" n'a plus de bouton dedie dans la nav basse depuis qu'il est
  // accessible via le menu ☰ -- sans cette verification, la ligne suivante
  // plantait (element introuvable) et empechait TOUT le reste de la
  // fonction de s'executer (chargement des sections du compte, etc.).
  const navBtn = document.getElementById('bnav-' + tab);
  if (navBtn) navBtn.classList.add('active');
  else if (tab === 'account') {
    const menuBtn = document.getElementById('bnav-menu');
    if (menuBtn) menuBtn.classList.add('active');
  }
  if (tab === 'orders') loadOrders();
  if (tab === 'home') {
    renderFAQ();
    const shopFeedEl = document.getElementById('shop-feed');
    if (shopFeedEl) shopFeedEl.innerHTML = '';
    loadHomeFeed();
  }
  if (tab === 'account') { renderReferralBox(); applyNotifPrefsToUI(); fillAccountForm(); loadSavedFeed(); loadFollowingList(); loadBlockedList(); loadFollowersList(); }
}
function showServices() {
  hideAllViews();
  document.getElementById('view-services').classList.remove('hidden');
  renderPlatformGrid('platform-grid');
}


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
  { id:"usdt-trc20", name:"USDT (TRC20 - Tron)", icon:"₮", bg:"#26A17B" },
  { id:"usdt-bep20", name:"USDT (BEP20 - BSC)",  icon:"₮", bg:"#26A17B" },
  { id:"btc",        name:"Bitcoin (BTC)",        icon:"₿", bg:"#F7931A" },
  { id:"trx",        name:"TRON (TRX)",           icon:"T", bg:"#EB0029" }
];

/* Badge coloré par opérateur mobile money (reconnaissance visuelle par marque) */
function getOperatorBadge(name) {
  const n = name.toLowerCase();
  if (n.includes('m-pesa') && n.includes('vodacom')) return { bg:'#E60000', label:'M' };
  if (n.includes('m-pesa')) return { bg:'#4CAF50', label:'M' };
  if (n.includes('vodacom')) return { bg:'#E60000', label:'V' };
  if (n.includes('airteltigo')) return { bg:'#0033A0', label:'AT' };
  if (n.includes('airtel')) return { bg:'#ED1C24', label:'A' };
  if (n.includes('orange')) return { bg:'#FF6600', label:'O' };
  if (n.includes('mtn')) return { bg:'#FFCC00', label:'M', dark:true };
  if (n.includes('moov')) return { bg:'#0066CC', label:'M' };
  if (n.includes('wave')) return { bg:'#00A3E0', label:'W' };
  if (n.includes('free')) return { bg:'#CC0000', label:'F' };
  if (n.includes('telecel')) return { bg:'#6A1B9A', label:'T' };
  if (n.includes('t-money') || n.includes('togocom')) return { bg:'#00A19A', label:'T' };
  if (n.includes('zain')) return { bg:'#6A1B9A', label:'Z' };
  if (n.includes('lumitel')) return { bg:'#F7941D', label:'L' };
  if (n.includes('ecocash')) return { bg:'#1E8449', label:'E' };
  if (n.includes('unitel')) return { bg:'#0057A8', label:'U' };
  if (n.includes('multicaixa')) return { bg:'#D32F2F', label:'MC' };
  if (n.includes('djezzy')) return { bg:'#6A1B9A', label:'D' };
  if (n.includes('mobilis')) return { bg:'#2E7D32', label:'M' };
  if (n.includes('mobicash')) return { bg:'#0057A8', label:'MC' };
  if (n.includes('inwi')) return { bg:'#FF6600', label:'I' };
  if (n.includes('d17')) return { bg:'#0057A8', label:'D17' };
  if (n.includes('telebirr')) return { bg:'#2E9E4F', label:'T' };
  if (n.includes('africell')) return { bg:'#6A1B9A', label:'A' };
  if (n.includes('opay')) return { bg:'#00A650', label:'O' };
  return { bg:'#555555', label: name[0] };
}

let payMethod = "mobile";
let payCountryCode = null;
let payOperator = null;
let payCryptoId = null;
let payCurrency = "USD";
let LIVE_RATES = null;

/* Récupère les taux de change en direct (API publique, gratuite, sans clé) */
async function fetchLiveRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      LIVE_RATES = data.rates;
      console.log('✅ Taux de change en direct chargés');
    }
  } catch (e) {
    console.warn('⚠️ Taux en direct indisponibles, utilisation des taux indicatifs.', e.message);
    LIVE_RATES = null;
  }
}

/* Charge les prix personnalisés définis par l'admin (collection Firestore "pricing") */
async function loadPricingOverrides() {
  try {
    const snap = await db.collection('pricing').get();
    const overrides = {};
    snap.forEach(doc => { overrides[doc.id] = doc.data().services || []; });
    applyPricingOverrides(overrides);
    console.log('✅ Prix personnalisés chargés');
  } catch (e) {
    console.warn('⚠️ Pas de prix personnalisés (utilisation des prix par défaut).', e.message);
  }
}

/* Charge les prix de forfaits personnalisés (collection Firestore
   "bundle_pricing", onglet "Packages" de l'admin). AVANT, cette fonction
   n'existait pas : l'admin pouvait modifier le prix d'un forfait, ça
   s'enregistrait bien, mais le site public ne le chargeait jamais --
   les clients voyaient toujours le prix par defaut calcule automatiquement,
   jamais le prix personnalise. */
async function loadBundlePricingOverrides() {
  try {
    const snap = await db.collection('bundle_pricing').get();
    const overrides = {};
    snap.forEach(doc => { overrides[doc.id] = doc.data().bundles || []; });
    applyBundlePricingOverrides(overrides);
    console.log('✅ Prix de forfaits personnalisés chargés');
  } catch (e) {
    console.warn('⚠️ Pas de prix de forfaits personnalisés (utilisation des prix par défaut).', e.message);
  }
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
function filterPlatformGrid(gridId, query) {
  const q = query.trim().toLowerCase();
  const grid = document.getElementById(gridId);
  let visibleCount = 0;
  grid.querySelectorAll('.platform-badge').forEach(card => {
    const name = card.querySelector('.p-name').textContent.toLowerCase();
    const match = name.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });
  let emptyMsg = grid.parentElement.querySelector('.platform-search-empty');
  if (visibleCount === 0) {
    if (!emptyMsg) {
      emptyMsg = document.createElement('p');
      emptyMsg.className = 'muted platform-search-empty';
      emptyMsg.style.cssText = 'text-align:center;padding:20px 0';
      emptyMsg.textContent = 'Aucun réseau trouvé. Essaie une autre recherche.';
      grid.insertAdjacentElement('afterend', emptyMsg);
    }
    emptyMsg.style.display = '';
  } else if (emptyMsg) {
    emptyMsg.style.display = 'none';
  }
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

function openOrderForm(platformId, presetTypeIndex, presetQty, presetTier) {
  selectedPlatformId = platformId;
  selectedQuality = presetTier || "standard";
  const p = PLATFORMS.find(x => x.id === platformId);
  document.getElementById('order-platform-header').innerHTML = `
    ${platformBadgeHTML(p)}
    <h2>${p.name}</h2>
  `;

  renderBundles(platformId);

  const services = SERVICE_CATALOG[platformId] || [];
  const select = document.getElementById('order-service-select');
  select.innerHTML = services.map((s, i) => `<option value="${i}">${s.label}</option>`).join('');

  const qtyInput = document.getElementById('order-qty');
  if (presetTypeIndex !== undefined) {
    select.value = presetTypeIndex;
    select.disabled = true;
    qtyInput.value = presetQty;
    qtyInput.readOnly = true;
  } else {
    select.disabled = false;
    qtyInput.readOnly = false;
    qtyInput.value = '';
  }

  renderQualityGrid();
  document.getElementById('order-link').value = '';
  document.getElementById('order-error').classList.add('hidden');
  onOrderInputChange();

  hideAllViews();
  document.getElementById('view-order').classList.remove('hidden');
}

function renderBundles(platformId) {
  const bundles = BUNDLES[platformId];
  const box = document.getElementById('bundles-box');
  const list = document.getElementById('bundles-list');
  if (!bundles || !bundles.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  list.innerHTML = bundles.map((b, i) => {
    const price = bundlePrice(platformId, b);
    return `
    <div class="bundle-card">
      <div class="bundle-head">
        <span class="bundle-label">${bundleLabel(platformId, b)}</span>
        <span class="bundle-price">${price.toFixed(2)}$</span>
      </div>
      <input type="url" id="bundle-link-${platformId}-${i}" class="text-input" data-i18n-placeholder="order_link_ph" placeholder="https://..." style="margin-top:8px">
      <div class="modal-error hidden" id="bundle-error-${platformId}-${i}" style="margin-top:8px"></div>
      <div class="modal-loading hidden" id="bundle-success-${platformId}-${i}" style="margin-top:8px"></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="buyBundle('${platformId}', ${i})">
        <span data-i18n="pkg_buy">Acheter</span> — ${price.toFixed(2)}$
      </button>
    </div>`;
  }).join('');
}
async function buyBundle(platformId, idx) {
  const bundle = BUNDLES[platformId][idx];
  const price = bundlePrice(platformId, bundle);
  const p = PLATFORMS.find(x => x.id === platformId);
  const errEl = document.getElementById(`bundle-error-${platformId}-${idx}`);
  const okEl = document.getElementById(`bundle-success-${platformId}-${idx}`);
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  const link = document.getElementById(`bundle-link-${platformId}-${idx}`).value.trim();
  if (!link) {
    errEl.textContent = t('order_err_link');
    errEl.classList.remove('hidden');
    return;
  }
  if ((currentUser.balance || 0) < price) {
    errEl.textContent = t('order_err_balance');
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/place-smm-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken, orderKind: 'bundle', price,
        platform: platformId, platformName: p.name,
        service: bundleLabel(platformId, bundle), quality: 'bundle', link
      })
    });
    const data = await resp.json();
    if (!data.success) {
      errEl.textContent = data.error || t('pay_err_generic');
      errEl.classList.remove('hidden');
      return;
    }
    currentUser.balance = data.newBalance;
    document.getElementById('wallet-balance').textContent = data.newBalance.toFixed(2) + '$';
    okEl.textContent = t('order_success');
    okEl.classList.remove('hidden');
  } catch (e) {
    console.error("Erreur achat forfait :", e.message);
    errEl.textContent = t('pay_err_generic');
    errEl.classList.remove('hidden');
  }
}

function renderQualityGrid() {
  const service = getSelectedService();
  const el = document.getElementById('quality-grid');
  el.innerHTML = QUALITY_TIERS.map(q => {
    const price = service ? service.price[q.id].toFixed(2) : '0.00';
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
  const price = (qty / 1000) * service.price[selectedQuality];

  document.getElementById('order-qty-hint').textContent =
    `Min ${service.min.toLocaleString('fr-FR')} · Max ${service.max.toLocaleString('fr-FR')}`;
  document.getElementById('order-total-price').textContent = price.toFixed(2) + '$';
  document.getElementById('order-user-balance').textContent = ((currentUser && currentUser.balance) || 0).toFixed(2) + '$';
}

/* L'automatisation MoreThanPanel se fait desormais entierement cote
   serveur (voir api/place-smm-order.js), dans le meme appel que le debit
   du solde -- plus besoin d'une etape separee ici. */

async function submitOrder() {
  const errEl = document.getElementById('order-error');
  errEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  const service = getSelectedService();
  const qty = parseInt(document.getElementById('order-qty').value || 0, 10);
  const link = document.getElementById('order-link').value.trim();
  const price = (qty / 1000) * service.price[selectedQuality];
  const qualityInfo = QUALITY_TIERS.find(q => q.id === selectedQuality);
  const p = PLATFORMS.find(x => x.id === selectedPlatformId);

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
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/place-smm-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken, orderKind: 'service', price,
        platform: selectedPlatformId, platformName: (p && p.name) || selectedPlatformId,
        service: service.label, quality: qualityInfo.name,
        link, quantity: qty, type: service.type
      })
    });
    const data = await resp.json();
    if (!data.success) {
      errEl.textContent = data.error || "Erreur lors de l'enregistrement. Réessaie.";
      errEl.classList.remove('hidden');
      return;
    }
    currentUser.balance = data.newBalance;

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
  payCurrency = "USD";
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-phone').value = '';
  document.getElementById('recharge-error').classList.add('hidden');
  document.getElementById('recharge-success').classList.add('hidden');
  renderPayMethodTabs();
  renderPayCountrySelect();
  renderPayPanel();
  if (!LIVE_RATES) fetchLiveRates();
}
function renderPayMethodTabs() {
  const methods = [
    { id: "mobile", label: t('pay_mobile'), icon: "📱" },
    { id: "crypto", label: t('pay_crypto'), icon: "₿" },
    { id: "card",   label: t('pay_card'),   icon: "💳" }
  ];
  document.getElementById('pay-method-tabs').innerHTML = methods.map(m => `
    <button class="${m.id === payMethod ? 'active' : ''}" onclick="selectPayMethod('${m.id}')">${m.icon} ${m.label}</button>
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
  payCurrency = "USD";
  document.getElementById('recharge-amount').value = '';
  renderPayOperators();
  renderPayCurrencyToggle();
  updateRechargeEquivalent();
}
function renderPayCurrencyToggle() {
  const toggleEl = document.getElementById('pay-currency-toggle');
  const labelEl = document.getElementById('recharge-amount-label');
  const country = COUNTRIES.find(c => c.code === payCountryCode);

  if (payMethod !== 'mobile' || !country) {
    toggleEl.innerHTML = '';
    toggleEl.classList.add('hidden');
    labelEl.textContent = t('pay_amount_label');
    return;
  }

  // Seule la RD Congo autorise le choix entre USD et la devise locale (CDF).
  // Tous les autres pays sont exclusivement en USD, pour eviter toute confusion
  // sur la devise reellement facturee au client.
  if (country.code !== 'CD') {
    payCurrency = 'USD';
    toggleEl.innerHTML = '';
    toggleEl.classList.add('hidden');
    labelEl.textContent = t('pay_amount_label');
    return;
  }

  toggleEl.classList.remove('hidden');
  toggleEl.innerHTML = `
    <button class="${payCurrency === 'USD' ? 'active' : ''}" onclick="selectPayCurrency('USD')">USD ($)</button>
    <button class="${payCurrency === 'local' ? 'active' : ''}" onclick="selectPayCurrency('local')">${country.currency}</button>
  `;
  labelEl.textContent = payCurrency === 'USD' ? t('pay_amount_label') : `Montant (${country.currency})`;
}
function selectPayCurrency(cur) {
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  // Garde-fou : seule la RD Congo peut basculer vers la devise locale.
  if (cur === 'local' && (!country || country.code !== 'CD')) {
    cur = 'USD';
  }
  payCurrency = cur;
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-equivalent').textContent = '';
  renderPayCurrencyToggle();
}
function renderPayOperators() {
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  const el = document.getElementById('pay-operators');
  if (!country) { el.innerHTML = ''; return; }
  el.innerHTML = country.ops.map(op => {
    const badge = getOperatorBadge(op);
    return `
    <div class="op-card${op === payOperator ? ' active' : ''}" onclick="selectOperator('${op.replace(/'/g,"\\'")}')">
      <div class="op-icon" style="background:${badge.bg};${badge.dark ? 'color:#111' : 'color:#fff'}">${badge.label}</div>
      <span class="op-name">${op}</span>
    </div>`;
  }).join('');
}
function selectOperator(op) {
  payOperator = op;
  renderPayOperators();
}
function renderPayCryptoOptions() {
  const el = document.getElementById('pay-crypto-list');
  el.innerHTML = CRYPTOS.map(c => `
    <div class="op-card${c.id === payCryptoId ? ' active' : ''}" onclick="selectCrypto('${c.id}')">
      <div class="op-icon" style="background:${c.bg};color:#fff">${c.icon}</div>
      <span class="op-name">${c.name}</span>
    </div>
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
  renderPayCurrencyToggle();
}
function updateRechargeEquivalent() {
  const amount = parseFloat(document.getElementById('recharge-amount').value || 0);
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  const hint = document.getElementById('recharge-equivalent');
  if (payMethod === 'mobile' && country && amount > 0) {
    const liveRate = LIVE_RATES && LIVE_RATES[country.currency];
    const rate = liveRate || country.rate;
    const sourceTag = liveRate ? t('pay_rate_live') : t('pay_rate_indicative');
    if (payCurrency === 'local') {
      const usd = (amount / rate).toFixed(2);
      hint.textContent = `≈ ${usd} USD · ${sourceTag}`;
    } else {
      const local = (amount * rate).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
      hint.textContent = `≈ ${local} ${country.currency} · ${sourceTag}`;
    }
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
    return; // Carte virtuelle : bientôt disponible (le bouton est masqué pour cet onglet)
  }

  const rawAmount = parseFloat(document.getElementById('recharge-amount').value || 0);
  if (!rawAmount || rawAmount <= 0) {
    errEl.textContent = t('pay_err_amount');
    errEl.classList.remove('hidden');
    return;
  }
  if (payMethod === 'mobile' && (!payCountryCode || !payOperator)) {
    errEl.textContent = t('pay_err_operator');
    errEl.classList.remove('hidden');
    return;
  }
  const phone = document.getElementById('recharge-phone').value.trim();
  if (payMethod === 'mobile' && !phone) {
    errEl.textContent = t('pay_err_phone');
    errEl.classList.remove('hidden');
    return;
  }
  if (payMethod === 'crypto' && !payCryptoId) {
    errEl.textContent = t('pay_err_crypto');
    errEl.classList.remove('hidden');
    return;
  }

  // Si le client a saisi le montant dans la devise locale, on le convertit
  // en USD ici, une seule fois, pour que tout le reste du code (facture,
  // enregistrement Firestore, credit du solde) continue de travailler en USD.
  let amount = rawAmount;
  if (payMethod === 'mobile' && payCurrency === 'local' && payCountryCode) {
    const localCountry = COUNTRIES.find(c => c.code === payCountryCode);
    const liveRate = LIVE_RATES && localCountry && LIVE_RATES[localCountry.currency];
    const rate = liveRate || (localCountry ? localCountry.rate : 1);
    amount = rawAmount / rate;
  }

  try {
    const country = COUNTRIES.find(c => c.code === payCountryCode);
    const crypto = CRYPTOS.find(c => c.id === payCryptoId);

    if (payMethod === 'crypto') {
      // Paiement crypto : on cree une vraie facture Cryptomus via notre API serveur
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/cryptomus-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          amount: amount,
          currency: 'USD'
        })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Erreur creation facture Cryptomus :", data.error);
        errEl.textContent = t('pay_err_generic');
        errEl.classList.remove('hidden');
        return;
      }

      // La demande de recharge est desormais enregistree cote serveur
      // (api/cryptomus-payment.js), avec un montant fiable et non
      // falsifiable -- on redirige simplement vers la page de paiement.
      window.location.href = data.paymentUrl;
      return;
    }

    // Mobile Money : on tente MboтePay (pays couverts), sinon flux manuel comme avant
    if (payMethod === 'mobile') {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/mbotepay-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          amountUSD: amount,
          countryCode: payCountryCode,
          operatorName: payOperator,
          phone: phone,
          chargeCurrency: payCurrency === 'USD' ? 'USD' : (country ? country.currency : null)
        })
      });
      const data = await response.json();

      if (data.supported && data.success) {
        // La demande de recharge est desormais enregistree cote serveur
        // (api/mbotepay-payment.js), avec un montant fiable et non
        // falsifiable -- avant, le navigateur l'ecrivait lui-meme, ce qui
        // permettait de payer une petite somme reelle tout en enregistrant
        // un montant bien plus eleve.
        okEl.textContent = "Demande envoyée ! Confirme le paiement sur ton téléphone.";
        okEl.classList.remove('hidden');
        return;
      }
      if (data.supported && !data.success) {
        errEl.textContent = data.error || t('pay_err_generic');
        errEl.classList.remove('hidden');
        return;
      }
      // data.supported === false : pays non couvert par MboтePay, on tente CinetPay ci-dessous

      // ⚠️ CinetPay n'est pas encore reconstruit (retire temporairement).
      // Quand il sera de retour, la demande de recharge devra etre creee
      // DANS api/cinetpay-payment.js (cote serveur), avec le meme montant
      // que celui de la vraie facture -- surtout PAS ici cote client, pour
      // les memes raisons de securite que Cryptomus et MboтePay ci-dessus.
      const cinetpayResponse = await fetch('/api/cinetpay-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          amountUSD: amount,
          countryCode: payCountryCode,
          clientEmail: currentUser.email,
          clientPhone: phone
        })
      });
      const cinetpayData = await cinetpayResponse.json();

      if (cinetpayData.supported && cinetpayData.success) {
        // Quand CinetPay sera reconstruit, la demande de recharge devra
        // etre creee cote serveur dans api/cinetpay-payment.js (voir le
        // commentaire ci-dessus) -- pas ici.
        window.location.href = cinetpayData.paymentUrl;
        return;
      }
      if (cinetpayData.supported && !cinetpayData.success) {
        errEl.textContent = cinetpayData.error || t('pay_err_generic');
        errEl.classList.remove('hidden');
        return;
      }
      // cinetpayData.supported === false : pays non couvert non plus, on continue vers le flux manuel ci-dessous
    }

    // Autres methodes (et Mobile Money non couvert par MboтePay ni CinetPay) : demande manuelle comme avant
    await db.collection('topup_requests').add({
      uid: currentUser.uid,
      email: currentUser.email,
      method: payMethod,
      country: country ? country.name : null,
      operator: payOperator || null,
      phone: payMethod === 'mobile' ? phone : null,
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
    ],
    pack: { title: "Pack Monétisation YouTube", desc: "1 000 abonnés + 4 500 heures de visionnage (livraison progressive)", price: 149 }
  },
  tiktok: {
    program: "TikTok Creator Rewards Program",
    criteria: [
      { label: "Abonnés", value: "10 000 minimum" },
      { label: "Vues", value: "100 000 vues sur les 30 derniers jours" },
      { label: "Âge du compte", value: "18 ans minimum, compte en règle" },
      { label: "Format", value: "Vidéos de plus d'1 minute recommandées" }
    ],
    pack: { title: "Pack Monétisation TikTok", desc: "10 000 abonnés + 100 000 vues (30 derniers jours)", price: 89 }
  },
  facebook: {
    program: "Facebook In-Stream Ads",
    criteria: [
      { label: "Abonnés Page", value: "10 000 minimum" },
      { label: "Minutes vues", value: "600 000 minutes sur les 60 derniers jours" },
      { label: "Vidéos actives", value: "5 vidéos minimum publiées" }
    ],
    pack: { title: "Pack Monétisation Facebook", desc: "10 000 abonnés Page + 600 000 minutes vues", price: 129 }
  },
  instagram: {
    program: "Instagram Bonus Program",
    criteria: [
      { label: "Éligibilité", value: "Selon pays et invitation Meta" },
      { label: "Engagement", value: "Bon taux de likes/commentaires sur les Reels" },
      { label: "Régularité", value: "Publications fréquentes recommandées" }
    ],
    pack: { title: "Pack Engagement Instagram", desc: "5 000 vues Reels + 1 000 likes répartis sur tes publications", price: 39 }
  },
  twitch: {
    program: "Twitch Affiliate",
    criteria: [
      { label: "Abonnés (followers)", value: "50 minimum" },
      { label: "Temps de stream", value: "500 minutes sur les 30 derniers jours" },
      { label: "Jours de diffusion", value: "7 jours uniques" },
      { label: "Viewers moyens", value: "3 en moyenne par stream" }
    ],
    pack: { title: "Pack Affiliate Twitch", desc: "100 abonnés + viewers moyens boostés sur tes streams", price: 45 }
  },
  spotify: {
    program: "Spotify for Artists",
    criteria: [
      { label: "Écoutes", value: "Pas de seuil officiel, mais plus d'écoutes = plus de revenus" },
      { label: "Playlists", value: "L'ajout à des playlists augmente fortement la visibilité" }
    ],
    pack: { title: "Pack Visibilité Spotify", desc: "5 000 écoutes + 500 abonnés artiste", price: 35 }
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
  const services = SERVICE_CATALOG[platformId] || [];
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
    </div>

    <div class="order-box pack-card">
      <div class="pack-head">
        <div>
          <h3 style="color:var(--red);margin-bottom:2px">${m.pack.title}</h3>
          <p class="muted" style="font-size:0.8rem">${m.pack.desc}</p>
        </div>
        <div class="pack-price">${m.pack.price}$</div>
      </div>
      <label class="field-label" style="margin-top:14px" data-i18n="order_link_label">Lien</label>
      <input type="url" id="pack-link-${platformId}" class="text-input" data-i18n-placeholder="order_link_ph" placeholder="https://...">
      <div class="modal-error hidden" id="pack-error-${platformId}"></div>
      <div class="modal-loading hidden" id="pack-success-${platformId}"></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:14px" onclick="buyMonetizationPackage('${platformId}')">
        <span data-i18n="pack_buy_cta">Acheter ce pack</span> — ${m.pack.price}$
      </button>
    </div>
  `;
}
async function buyMonetizationPackage(platformId) {
  const m = MONETIZATION[platformId];
  const p = PLATFORMS.find(x => x.id === platformId);
  const errEl = document.getElementById(`pack-error-${platformId}`);
  const okEl = document.getElementById(`pack-success-${platformId}`);
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  const link = document.getElementById(`pack-link-${platformId}`).value.trim();
  if (!link) {
    errEl.textContent = t('order_err_link');
    errEl.classList.remove('hidden');
    return;
  }
  if ((currentUser.balance || 0) < m.pack.price) {
    errEl.textContent = t('order_err_balance');
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/place-smm-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken, orderKind: 'package', price: m.pack.price,
        platform: platformId, platformName: p.name,
        service: m.pack.title, quality: 'package', link
      })
    });
    const data = await resp.json();
    if (!data.success) {
      errEl.textContent = data.error || t('pay_err_generic');
      errEl.classList.remove('hidden');
      return;
    }
    currentUser.balance = data.newBalance;
    document.getElementById('wallet-balance').textContent = data.newBalance.toFixed(2) + '$';
    okEl.textContent = t('order_success');
    okEl.classList.remove('hidden');
  } catch (e) {
    console.error("Erreur achat pack :", e.message);
    errEl.textContent = t('pay_err_generic');
    errEl.classList.remove('hidden');
  }
}
function showMonetization() {
  hideAllViews();
  document.getElementById('view-monetization').classList.remove('hidden');
  renderMonetizationGrid();
  document.getElementById('monetization-detail').innerHTML = '';
}

/* =========================================================
   PARRAINAGE — lien unique par utilisateur, 5% de commission
   ========================================================= */
/* Ouvre directement la Boutique sur l'article partage, si le lien contient ?produit=ID */
async function openSharedProductIfAny() {
  const params = new URLSearchParams(window.location.search);
  const pubId = params.get('produit');
  if (!pubId) return;

  showShop();
  // Laisse le temps au fil de se charger avant de chercher la carte
  setTimeout(() => {
    const card = document.getElementById(`shop-card-${pubId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('shop-card-highlight');
      setTimeout(() => card.classList.remove('shop-card-highlight'), 2000);
    }
  }, 900);
}

// Ouvre automatiquement le bon contenu quand on arrive depuis le clic sur
// une notification (ex: ?open=ID_PUBLICATION ou ?openTab=orders). Avant,
// cliquer sur une notification ouvrait toujours juste l'accueil.
function openNotifTargetIfAny() {
  const params = new URLSearchParams(window.location.search);
  const pubId = params.get('open');
  const tab = params.get('openTab');
  const profileUid = params.get('profile');
  if (pubId) {
    openPostDetail(pubId);
  } else if (profileUid) {
    openSharedProfile(profileUid);
  } else if (tab) {
    showDashTab(tab);
  }
  if (pubId || tab || profileUid) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// Ouvre un profil partage via un lien (?profile=UID). On ne connait que
// l'UID (pas le nom, "users" etant prive) -- on le retrouve via une de ses
// publications publiques, comme le fait deja la recherche de comptes.
async function openSharedProfile(uid) {
  try {
    const snap = await db.collection('publications')
      .where('sellerUid', '==', uid)
      .where('status', '==', 'published')
      .limit(1).get();
    if (snap.empty) { showToast('Ce profil est introuvable.', 'error'); return; }
    const d = snap.docs[0].data();
    openProfileModal(uid, d.sellerName || 'Compte', !!d.sellerVerified);
  } catch (e) {
    showToast('Impossible d\'ouvrir ce profil pour le moment.', 'error');
  }
}

function shareMyProfile() {
  if (!currentUser) return;
  const url = `${window.location.origin}${window.location.pathname}?profile=${currentUser.uid}`;
  const caption = `Suis-moi sur Coeurnoh Universe !`;
  if (navigator.share) {
    navigator.share({ title: 'Coeurnoh Universe', text: caption, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url);
    showToast('Lien de ton profil copié !', 'success');
  }
}

function getPendingReferrerUid() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || null;
}
function renderReferralBox() {
  if (!currentUser) return;
  const link = `${window.location.origin}${window.location.pathname}?ref=${currentUser.uid}`;
  const el = document.getElementById('referral-link-text');
  if (el) el.textContent = link;
  db.collection('users').where('referredBy', '==', currentUser.uid).get()
    .then(snap => {
      const countEl = document.getElementById('referral-count-text');
      if (countEl) countEl.textContent = `${snap.size} ${t('referral_count_suffix')}`;
    })
    .catch(() => {});
}
function copyReferralLink() {
  const link = document.getElementById('referral-link-text').textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => showToast(t('referral_copied'), 'success'));
  }
}

/* =========================================================
   FAQ
   ========================================================= */
const FAQ_ITEMS = [
  { q: "faq_q1", a: "faq_a1" },
  { q: "faq_q2", a: "faq_a2" },
  { q: "faq_q3", a: "faq_a3" },
  { q: "faq_q4", a: "faq_a4" },
  { q: "faq_q5", a: "faq_a5" }
];
function renderFAQ() {
  const el = document.getElementById('faq-list');
  if (!el) return;
  el.innerHTML = FAQ_ITEMS.map((item, i) => `
    <div class="faq-item">
      <button class="faq-q" onclick="toggleFAQ(${i})">
        <span>${t(item.q)}</span>
        <span class="faq-icon" id="faq-icon-${i}">+</span>
      </button>
      <div class="faq-a" id="faq-a-${i}">${t(item.a)}</div>
    </div>
  `).join('');
}
function toggleFAQ(i) {
  document.getElementById(`faq-a-${i}`).classList.toggle('open');
  document.getElementById(`faq-icon-${i}`).classList.toggle('open');
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
        referredBy: getPendingReferrerUid(),
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
        referredBy: getPendingReferrerUid(),
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

/* ================= PARTAGER L'APPLICATION ================= */
async function shareApp() {
  const url = 'https://coeurnohboost.vercel.app/';
  const shareText = 'Coeurnoh Universe — fais grandir tes réseaux sociaux (TikTok, Instagram, YouTube, Facebook) avec des paiements Mobile Money, crypto ou carte.';
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Coeurnoh Universe', text: shareText, url });
    } catch (e) { /* l'utilisateur a annule le partage, rien a faire */ }
  } else {
    try {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      showToast('Lien copié !', 'success');
    } catch (e) {
      alert(url);
    }
  }
}

/* ================= MODIFIER MON COMPTE (page Parametres > Compte) ================= */
function fillAccountForm() {
  if (!currentUser) return;
  const nameEl = document.getElementById('account-name-input');
  const emailEl = document.getElementById('account-email-input');
  if (nameEl) nameEl.value = currentUser.name || '';
  if (emailEl) emailEl.value = currentUser.email || '';
  const emailMsg = document.getElementById('account-email-msg');
  const passMsg = document.getElementById('account-pass-msg');
  if (emailMsg) emailMsg.textContent = '';
  if (passMsg) passMsg.textContent = '';
}

// Traduit les erreurs Firebase (techniques) en messages comprehensibles.
// Traduit une erreur technique (Firebase, reseau...) en message
// comprehensible pour la personne. Ne renvoie JAMAIS le message brut —
// les details techniques restent uniquement dans la console (console.log),
// pour le developpeur qui diagnostique un probleme.
function friendlyErrorMessage(e) {
  const code = e && e.code;
  console.log('[erreur]', code || '', e && e.message);
  if (code === 'permission-denied') return "Tu n'as pas la permission de faire ça.";
  if (code === 'unavailable' || code === 'network-request-failed') return 'Problème de connexion. Vérifie ton internet et réessaie.';
  if (code === 'not-found') return "Élément introuvable (peut-être déjà supprimé).";
  if (code === 'resource-exhausted') return 'Trop de demandes en même temps. Réessaie dans un instant.';
  if (code && code.startsWith('auth/')) return friendlyAuthError(e);
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

function friendlyAuthError(e) {
  const code = e && e.code;
  if (code === 'auth/wrong-password') return "Mot de passe actuel incorrect.";
  if (code === 'auth/too-many-requests') return "Trop de tentatives. Réessaie dans quelques minutes.";
  if (code === 'auth/email-already-in-use') return "Cette adresse e-mail est déjà utilisée par un autre compte.";
  if (code === 'auth/invalid-email') return "Adresse e-mail invalide.";
  if (code === 'auth/requires-recent-login') return "Merci de te reconnecter puis de réessayer.";
  if (code === 'auth/weak-password') return "Mot de passe trop faible (6 caractères minimum).";
  return "Une erreur est survenue. Réessaie dans un instant.";
}

async function saveAccountName() {
  if (!currentUser) return;
  const name = document.getElementById('account-name-input').value.trim();
  if (!name) { showToast("Merci d'indiquer un nom.", 'error'); return; }
  try {
    await db.collection('users').doc(currentUser.uid).update({ name });
    currentUser.name = name;
    document.getElementById('dash-name').textContent = name;
    document.getElementById('profile-name').textContent = name;
    showToast('Nom mis à jour !', 'success');
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

// Redemande le mot de passe actuel — obligatoire cote Firebase avant tout
// changement sensible (email, mot de passe), meme si l'utilisateur est
// deja connecte, pour eviter qu'un telephone laisse deverrouille suffise
// a detourner un compte.
async function reauthenticateCurrentUser(currentPassword) {
  const user = auth.currentUser;
  const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
  await user.reauthenticateWithCredential(cred);
}

async function saveAccountEmail() {
  if (!currentUser) return;
  const msgEl = document.getElementById('account-email-msg');
  msgEl.style.color = 'var(--red)';
  const newEmail = document.getElementById('account-email-input').value.trim();
  const currentPassword = document.getElementById('account-email-currentpass').value;
  if (!newEmail || !currentPassword) {
    msgEl.textContent = "Merci de remplir le nouvel e-mail et ton mot de passe actuel.";
    return;
  }
  try {
    await reauthenticateCurrentUser(currentPassword);
    await auth.currentUser.updateEmail(newEmail);
    await db.collection('users').doc(currentUser.uid).update({ email: newEmail });
    currentUser.email = newEmail;
    document.getElementById('profile-email').textContent = newEmail;
    document.getElementById('account-email-currentpass').value = '';
    msgEl.style.color = 'var(--green)';
    msgEl.textContent = 'E-mail mis à jour avec succès.';
  } catch (e) {
    msgEl.textContent = friendlyAuthError(e);
  }
}

async function saveAccountPassword() {
  if (!currentUser) return;
  const msgEl = document.getElementById('account-pass-msg');
  msgEl.style.color = 'var(--red)';
  const currentPassword = document.getElementById('account-pass-current').value;
  const newPassword = document.getElementById('account-pass-new').value;
  if (!currentPassword || !newPassword) {
    msgEl.textContent = 'Merci de remplir les deux champs.';
    return;
  }
  if (newPassword.length < 6) {
    msgEl.textContent = 'Le nouveau mot de passe doit faire au moins 6 caractères.';
    return;
  }
  try {
    await reauthenticateCurrentUser(currentPassword);
    await auth.currentUser.updatePassword(newPassword);
    document.getElementById('account-pass-current').value = '';
    document.getElementById('account-pass-new').value = '';
    msgEl.style.color = 'var(--green)';
    msgEl.textContent = 'Mot de passe changé avec succès.';
  } catch (e) {
    msgEl.textContent = friendlyAuthError(e);
  }
}

// Supprime definitivement le compte : demande le mot de passe pour
// reauthentifier (obligatoire cote Firebase pour une action aussi sensible),
// puis demande au serveur de supprimer le compte de connexion, la fiche
// personnelle et les publications. Les commandes deja passees restent.
async function deleteMyAccount() {
  if (!currentUser || !auth.currentUser) return;
  const msgEl = document.getElementById('delete-account-msg');
  msgEl.style.color = 'var(--red)';
  const password = document.getElementById('delete-account-pass').value;
  if (!password) {
    msgEl.textContent = 'Merci de saisir ton mot de passe pour confirmer.';
    return;
  }
  if (!confirm('Dernière confirmation : ton compte, tes publications et ton solde seront supprimés définitivement. Continuer ?')) {
    return;
  }
  try {
    await reauthenticateCurrentUser(password);
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/notify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-account', idToken })
    });
    const data = await resp.json().catch(() => ({}));
    if (data && data.success) {
      showToast('Ton compte a bien été supprimé.', 'success');
      logout();
    } else {
      msgEl.textContent = 'Une erreur est survenue. Réessaie dans un instant.';
    }
  } catch (e) {
    msgEl.textContent = friendlyAuthError(e);
  }
}

// Invalide immediatement TOUTES les sessions actives de ce compte (tous les
// appareils, y compris celui-ci) via Firebase Admin, cote serveur.
async function logoutAllDevices() {
  if (!currentUser || !auth.currentUser) return;
  if (!confirm("Ça va te déconnecter de TOUS les appareils, y compris celui-ci. Continuer ?")) return;
  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/notify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke-sessions', idToken })
    });
  } catch (e) { /* on se deconnecte quand meme localement, meme si l'appel echoue */ }
  logout();
}

/* =========================================================
   ÉTAT DE CONNEXION — met à jour l'interface automatiquement
   ========================================================= */
function renderLoggedOutNav() {
  document.getElementById('nav-login-btn').classList.remove('hidden');
  document.getElementById('nav-register-btn').classList.remove('hidden');
  document.getElementById('nav-dashboard-btn').classList.add('hidden');
  document.getElementById('admin-shortcut-btn').classList.add('hidden');
  stopNotifWatch();
  stopPresenceUpdates();
  blockedSet = new Set();
}
function renderLoggedInNav(uid) {
  document.getElementById('nav-login-btn').classList.add('hidden');
  document.getElementById('nav-register-btn').classList.add('hidden');
  document.getElementById('nav-dashboard-btn').classList.remove('hidden');
  document.getElementById('admin-shortcut-btn').classList.toggle('hidden', uid !== ADMIN_UID);
  startNotifWatch();
  startPresenceUpdates();
  loadBlockedSet();
  loadFollowingSet();
}

/* ================= MENU PRINCIPAL (☰) =================
   Reorganise l'ACCES a ce qui existe deja (ancien onglet "Compte") sans
   rien dupliquer : chaque section (profil, securite, notifications...)
   existe UNE SEULE FOIS dans le HTML. Ouvrir un item du menu deplace
   physiquement cette section dans l'ecran "contenu" (un seul a la fois,
   rien de mélangé), puis la replace a son emplacement d'origine quand on
   revient en arriere -- pas de duplication d'id, pas de code JS refait. */
let menuContentOriginalParent = null;
let menuContentOriginalNextSibling = null;
let menuCurrentCategoryScreen = 'categories';

function openMainMenu() {
  showMenuScreen('categories');
  document.getElementById('main-menu-modal').classList.remove('hidden');
}

function closeMainMenu() {
  // Si une section est actuellement affichee dans "contenu", la remettre
  // a sa place d'origine avant de fermer, pour ne jamais la perdre.
  restoreMenuContentSection();
  document.getElementById('main-menu-modal').classList.add('hidden');
}

function showMenuScreen(screen) {
  document.querySelectorAll('[id^="menu-screen-"]').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById('menu-screen-' + screen);
  if (target) target.classList.remove('hidden');
  if (screen === 'categories' || screen.startsWith('items-')) {
    menuCurrentCategoryScreen = screen;
  }
}

// Ecran generique "Bientot disponible" -- utilise par les 14 futurs
// services (roadmap) tant qu'ils ne sont pas encore construits. Quand un
// vrai service sera developpe, seul son bouton dans la liste devra changer
// pour appeler la vraie fonctionnalite a la place de celle-ci.
function showComingSoon(title, description) {
  document.getElementById('comingsoon-title').textContent = title;
  document.getElementById('comingsoon-desc').textContent = description;
  showMenuScreen('comingsoon');
}

function restoreMenuContentSection() {
  const slot = document.getElementById('menu-content-slot');
  const el = slot.firstElementChild;
  if (el && menuContentOriginalParent) {
    if (menuContentOriginalNextSibling) {
      menuContentOriginalParent.insertBefore(el, menuContentOriginalNextSibling);
    } else {
      menuContentOriginalParent.appendChild(el);
    }
  }
  menuContentOriginalParent = null;
  menuContentOriginalNextSibling = null;
}

function goToAccountSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;

  restoreMenuContentSection(); // au cas ou une autre section etait deja ouverte

  menuContentOriginalParent = el.parentNode;
  menuContentOriginalNextSibling = el.nextSibling;

  const slot = document.getElementById('menu-content-slot');
  slot.innerHTML = '';
  slot.appendChild(el);

  document.getElementById('menu-content-title').textContent = el.dataset.menuTitle || '';
  showMenuScreen('content');

  // Les donnees de chaque section sont chargees normalement par
  // showDashTab('account') habituellement -- on les recharge ici au cas
  // par cas pour la section demandee, sans dupliquer cette logique.
  refreshMenuSectionData(sectionId);
}

function menuGoBackFromContent() {
  restoreMenuContentSection();
  showMenuScreen(menuCurrentCategoryScreen);
}

function refreshMenuSectionData(sectionId) {
  if (!currentUser) return;
  const refreshers = {
    'section-referral': renderReferralBox,
    'section-saved': loadSavedFeed,
    'section-followers': loadFollowersList,
    'section-following': loadFollowingList,
    'section-blocked': loadBlockedList,
    'section-editaccount': fillAccountForm,
    'section-notifprefs': applyNotifPrefsToUI,
    'section-faq': renderFAQ
  };
  const fn = refreshers[sectionId];
  if (fn) fn();
}

/* ================= STATUT EN LIGNE (leger, sans systeme lourd) =================
   Stocke dans sa propre collection "presence" (juste un horodatage), separee
   de "users" qui contient des donnees sensibles (email, solde...) et n'est
   lisible que par soi-meme/l'admin. "presence" est publique en lecture pour
   que le profil d'un vendeur puisse afficher "En ligne" / "Vu il y a...". */
let presenceInterval = null;

async function touchPresence() {
  if (!currentUser) return;
  try {
    await db.collection('presence').doc(currentUser.uid).set({
      lastActiveAt: new Date().toISOString()
    });
  } catch (e) { /* pas grave, pas une fonctionnalite critique */ }
}

function startPresenceUpdates() {
  touchPresence();
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = setInterval(touchPresence, 2 * 60 * 1000); // toutes les 2 min
}

function stopPresenceUpdates() {
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = null;
}

if (fbReady) {
  loadPricingOverrides();
  loadBundlePricingOverrides();
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

      renderLoggedInNav(user.uid);
      document.getElementById('dash-name').textContent = currentUser.name;
      document.getElementById('wallet-balance').textContent = (currentUser.balance || 0).toFixed(2) + '$';
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
      document.getElementById('profile-since').textContent = currentUser.createdAt
        ? new Date(currentUser.createdAt).toLocaleDateString('fr-FR')
        : '—';
      document.getElementById('profile-loyalty').textContent = currentUser.loyaltyPoints || 0;

      showDashboard();
      openSharedProductIfAny();
      openNotifTargetIfAny();
      registerPushNotifications();
      installBackTrap();
      hideAppSplash();
    } else {
      currentUser = null;
      renderLoggedOutNav();
      showHome();
      hideAppSplash();
    }
  });
} else {
  renderLoggedOutNav();
  hideAppSplash();
}

// Cache l'ecran de chargement initial, une fois qu'on sait si la personne
// est deja connectee ou non — evite qu'un compte deja connecte revoie
// brievement la page d'accueil publique (Se connecter / Creer un compte)
// avant de basculer sur son tableau de bord.
function hideAppSplash() {
  const splash = document.getElementById('app-splash');
  if (splash) splash.classList.add('hidden');
}

// Empeche le bouton "retour" (telephone/navigateur) de ramener un compte
// deja connecte sur la page d'accueil publique. Tant qu'on est connecte,
// un retour arriere revient simplement au tableau de bord — il faut se
// deconnecter explicitement (bouton "Se deconnecter") pour quitter le compte.
let backTrapInstalled = false;
function installBackTrap() {
  if (backTrapInstalled) return;
  backTrapInstalled = true;
  history.pushState({ app: true }, '', window.location.href);
  window.addEventListener('popstate', () => {
    if (currentUser) {
      history.pushState({ app: true }, '', window.location.href);
      showDashboard();
    }
  });
}

/* Applique la langue détectée (ou choisie) dès que la page est prête */
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations(currentLang);
  initHomeCatalog();
  initTutorialAutoShow();
  updateCartBadge();
});

/* ================= TUTORIEL / GUIDE D'UTILISATION ================= */
let tutorialCurrentStep = 0;
const TUTORIAL_SEEN_KEY = 'coeurnohboost_tutorial_seen';

/* ================= NOTIFICATIONS ================= */
function openNotifPanel() {
  if (!currentUser) { openAuth('register'); return; }
  hideAllViews();
  document.getElementById('view-notifications').classList.remove('hidden');
  toggleNotifPanelContent();
}

function closeNotifPanel() {
  showDashboard();
}

function initTutorialAutoShow() {
  try {
    const alreadySeen = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!alreadySeen) {
      setTimeout(() => openTutorial(), 900);
    }
  } catch (e) {
    // localStorage indisponible (mode privé, etc.) : on n'affiche pas automatiquement
  }
}

function tutorialStepCount() {
  return document.querySelectorAll('.tutorial-step').length;
}

function openTutorial() {
  tutorialCurrentStep = 0;
  const dotsContainer = document.getElementById('tutorial-dots');
  dotsContainer.innerHTML = '';
  for (let i = 0; i < tutorialStepCount(); i++) {
    const dot = document.createElement('span');
    dot.className = 'tutorial-dot' + (i === 0 ? ' active' : '');
    dot.dataset.step = i;
    dotsContainer.appendChild(dot);
  }
  renderTutorialStep();
  document.getElementById('tutorial-modal').classList.remove('hidden');
}

function closeTutorial() {
  document.getElementById('tutorial-modal').classList.add('hidden');
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (e) {
    // localStorage indisponible : pas grave, le tutoriel se réaffichera simplement
  }
}

function tutorialNext() {
  if (tutorialCurrentStep < tutorialStepCount() - 1) {
    tutorialCurrentStep++;
    renderTutorialStep();
  } else {
    closeTutorial();
  }
}

function tutorialPrev() {
  if (tutorialCurrentStep > 0) {
    tutorialCurrentStep--;
    renderTutorialStep();
  }
}

function renderTutorialStep() {
  document.querySelectorAll('.tutorial-step').forEach((el) => {
    el.classList.toggle('hidden', parseInt(el.dataset.tutorialStep, 10) !== tutorialCurrentStep);
  });
  document.querySelectorAll('.tutorial-dot').forEach((dot) => {
    dot.classList.toggle('active', parseInt(dot.dataset.step, 10) === tutorialCurrentStep);
  });
  const prevBtn = document.getElementById('tutorial-prev');
  const nextBtn = document.getElementById('tutorial-next');
  prevBtn.classList.toggle('tutorial-nav-hidden', tutorialCurrentStep === 0);
  if (tutorialCurrentStep === tutorialStepCount() - 1) {
    nextBtn.classList.add('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }
}

/* ================= BOUTIQUE (livres & produits) ================= */
/* ================= PANIER (produits uniquement) ================= */
const CART_STORAGE_KEY = 'coeurnohboost_cart';
let cartItems = [];
try {
  cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
} catch (e) { cartItems = []; }

function saveCart() {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); } catch (e) { /* pas grave */ }
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  if (cartItems.length > 0) {
    badge.textContent = cartItems.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function toggleCartItem(pubId, title, price, imageUrl) {
  if (!currentUser) { openAuth('register'); return; }
  const idx = cartItems.findIndex(c => c.id === pubId);
  if (idx >= 0) {
    cartItems.splice(idx, 1);
  } else {
    cartItems.push({ id: pubId, title, price, imageUrl });
  }
  saveCart();
  renderShopFeed(); // met a jour le bouton "Ajouter" / "Dans le panier" sur la carte
}

function removeFromCart(pubId) {
  cartItems = cartItems.filter(c => c.id !== pubId);
  saveCart();
  renderCartModal();
  renderShopFeed();
}

function getCartTotal() {
  const subtotal = cartItems.reduce((sum, c) => sum + c.price, 0);
  const discountApplies = cartItems.length > 3;
  const total = discountApplies ? Math.round(subtotal * 0.95 * 100) / 100 : subtotal;
  return { subtotal: Math.round(subtotal * 100) / 100, discountApplies, total };
}

function openCart() {
  if (!currentUser) { openAuth('register'); return; }
  if (!document.getElementById('cart-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="cart-modal">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('cart-modal').classList.add('hidden')" aria-label="Fermer">×</button>
          <h2>${ICON_CART} Mon panier</h2>
          <div class="modal-error hidden" id="cart-error"></div>
          <div id="cart-items-list"></div>
          <div id="cart-summary"></div>
          <button class="btn btn-primary" style="width:100%;margin-top:14px" id="cart-checkout-btn" onclick="checkoutCart()">Payer</button>
        </div>
      </div>`);
  }
  document.getElementById('cart-modal').classList.remove('hidden');
  renderCartModal();
}

function renderCartModal() {
  const listEl = document.getElementById('cart-items-list');
  const summaryEl = document.getElementById('cart-summary');
  if (!listEl) return;

  if (cartItems.length === 0) {
    listEl.innerHTML = '<p class="muted">Ton panier est vide.</p>';
    summaryEl.innerHTML = '';
    document.getElementById('cart-checkout-btn').classList.add('hidden');
    return;
  }
  document.getElementById('cart-checkout-btn').classList.remove('hidden');

  listEl.innerHTML = cartItems.map(c => `
    <div class="cart-row">
      <img src="${escapeHtml(c.imageUrl)}" class="cart-row-img" alt="" loading="lazy">
      <div class="cart-row-info"><strong>${escapeHtml(c.title)}</strong><div class="muted small">${c.price.toFixed(2)}$</div></div>
      <button class="shop-action-btn" onclick="removeFromCart('${c.id}')" aria-label="Retirer du panier">${ICON_TRASH}</button>
    </div>
  `).join('');

  const { subtotal, discountApplies, total } = getCartTotal();
  summaryEl.innerHTML = `
    <div class="cart-summary-row"><span>Sous-total</span><span>${subtotal.toFixed(2)}$</span></div>
    ${discountApplies ? `<div class="cart-summary-row cart-discount-row"><span>🎉 Remise -5% (plus de 3 articles)</span><span>-${(subtotal - total).toFixed(2)}$</span></div>` : ''}
    <div class="cart-summary-row cart-total-row"><span>Total</span><span>${total.toFixed(2)}$</span></div>`;
}

async function checkoutCart() {
  const errEl = document.getElementById('cart-error');
  errEl.classList.add('hidden');
  const { total } = getCartTotal();

  if (total > (currentUser.balance || 0)) {
    errEl.textContent = "Solde insuffisant. Recharge ton portefeuille pour continuer.";
    errEl.classList.remove('hidden');
    return;
  }

  document.getElementById('cart-checkout-btn').classList.add('hidden');
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/shop-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, pubIds: cartItems.map(c => c.id) })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Erreur lors du paiement");

    currentUser.balance = data.newBalance;
    cartItems = [];
    saveCart();
    document.getElementById('cart-items-list').innerHTML = `<p style="text-align:center;color:var(--green);font-weight:700">✅ Achat confirmé ! Contacte les vendeurs via WhatsApp sur chaque article pour la livraison.</p>`;
    document.getElementById('cart-summary').innerHTML = '';
    renderShopFeed();
  } catch (e) {
    document.getElementById('cart-checkout-btn').classList.remove('hidden');
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  }
}

let shopFeedItems = [];
let shopLikedMap = {};
let shopPurchasedSet = new Set();
let shopActiveFilter = 'all';
let shopActiveSort = 'recent';
let shopActiveCategory = 'all';

function setShopSort(sort) {
  shopActiveSort = sort;
  renderShopFeed();
}

function setShopCategory(category) {
  shopActiveCategory = category;
  renderShopFeed();
}

function openSellForm() {
  if (!currentUser) { openAuth('register'); return; }
  const modalHtml = `
    <div class="modal-overlay" id="sell-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('sell-modal').remove()" aria-label="Fermer">×</button>
        <h2>➕ Vendre un article</h2>
        <p class="sub">Coeurnoh Universe prélève 10% de commission sur chaque vente. Tu reçois 90% directement sur ton solde.</p>
        <div class="modal-error hidden" id="sell-form-error"></div>

        <div class="field">
          <label>Type</label>
          <select id="sell-type" class="text-input" onchange="toggleSellFields()">
            <option value="book">📖 Livre (avec lien de téléchargement)</option>
            <option value="product">🛍️ Produit (photo)</option>
          </select>
        </div>
        <div class="field">
          <label>Titre</label>
          <input type="text" id="sell-title" class="text-input" placeholder="Nom de ton article">
        </div>
        <div class="field">
          <label>Description</label>
          <textarea id="sell-description" class="text-input" rows="3" placeholder="Décris ce que tu vends..."></textarea>
        </div>
        <div class="field">
          <label>Prix (USD)</label>
          <input type="number" id="sell-price" class="text-input" placeholder="Ex: 5.99" step="0.01" min="0">
        </div>
        <div class="field">
          <label>Catégorie</label>
          <select id="sell-category" class="text-input">
            <option value="ebooks">📚 Livres & Ebooks</option>
            <option value="beaute">💄 Beauté & Bien-être</option>
            <option value="mode">👗 Mode & Accessoires</option>
            <option value="electronique">🔌 Électronique</option>
            <option value="maison">🏠 Maison & Déco</option>
            <option value="autres">📦 Autres</option>
          </select>
        </div>
        <div class="field">
          <label>Promotion (optionnel)</label>
          <div style="display:flex;gap:8px">
            <select id="sell-discount" class="text-input" style="flex:1">
              <option value="0">Aucune réduction</option>
              <option value="10">-10%</option>
              <option value="20">-20%</option>
              <option value="30">-30%</option>
            </select>
            <select id="sell-discount-duration" class="text-input" style="flex:1">
              <option value="0">Sans limite de temps</option>
              <option value="24">24 heures</option>
              <option value="72">3 jours</option>
              <option value="168">7 jours</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="sell-image-file">Photo de l'article</label>
          <input type="file" id="sell-image-file" class="file-drop-input" accept="image/*" onchange="handleSellImageFileChange(event)">
          <p class="muted small" style="margin-top:4px">Choisis la photo directement depuis ton téléphone (max 10 Mo).</p>
          <div class="upload-progress-wrap hidden" id="sell-image-progress-wrap">
            <div class="upload-progress-fill" id="sell-image-progress-fill"></div>
            <span class="upload-progress-label" id="sell-image-progress-label">0%</span>
          </div>
          <div id="sell-image-preview"></div>
        </div>
        <div class="field" id="sell-file-field">
          <label for="sell-file-input">Fichier du livre (PDF)</label>
          <input type="file" id="sell-file-input" class="file-drop-input" accept="application/pdf" onchange="handleSellBookFileChange(event)">
          <p class="muted small" style="margin-top:4px">Choisis le PDF directement depuis ton téléphone (max 50 Mo).</p>
          <div class="upload-progress-wrap hidden" id="sell-file-progress-wrap">
            <div class="upload-progress-fill" id="sell-file-progress-fill"></div>
            <span class="upload-progress-label" id="sell-file-progress-label">0%</span>
          </div>
          <p class="muted small" id="sell-file-name" style="margin-top:4px"></p>
        </div>
        <div class="field" id="sell-phone-field" style="display:none">
          <label>Ton numéro WhatsApp (pour que l'acheteur te contacte)</label>
          <input type="tel" id="sell-phone" class="text-input" placeholder="+243...">
        </div>

        <button class="btn btn-primary" id="sell-submit-btn" style="width:100%;justify-content:center;margin-top:10px" onclick="submitSellForm()">Publier</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  pendingSellImageFile = null;
  pendingSellBookFile = null;
  toggleSellFields();
}

function toggleSellFields() {
  const type = document.getElementById('sell-type').value;
  document.getElementById('sell-file-field').style.display = type === 'book' ? 'block' : 'none';
  document.getElementById('sell-phone-field').style.display = type === 'product' ? 'block' : 'none';
}

// Fichiers choisis sur le telephone pour l'article boutique : gardes en
// memoire et uploades vers Firebase Storage seulement au clic sur "Publier".
let pendingSellImageFile = null;
let pendingSellBookFile = null;

function handleSellImageFileChange(event) {
  pendingSellImageFile = (event.target.files && event.target.files[0]) || null;
  const previewEl = document.getElementById('sell-image-preview');
  if (!previewEl) return;
  previewEl.innerHTML = pendingSellImageFile
    ? `<img src="${URL.createObjectURL(pendingSellImageFile)}" class="post-media-preview-media" alt="">`
    : '';
}

function handleSellBookFileChange(event) {
  pendingSellBookFile = (event.target.files && event.target.files[0]) || null;
  const nameEl = document.getElementById('sell-file-name');
  if (nameEl) nameEl.textContent = pendingSellBookFile ? `📄 ${pendingSellBookFile.name}` : '';
}

async function submitSellForm() {
  const errEl = document.getElementById('sell-form-error');
  errEl.classList.add('hidden');

  const type = document.getElementById('sell-type').value;
  const title = document.getElementById('sell-title').value.trim();
  const description = document.getElementById('sell-description').value.trim();
  const price = parseFloat(document.getElementById('sell-price').value);
  const category = document.getElementById('sell-category').value;
  const phone = document.getElementById('sell-phone').value.trim();
  const discountPercent = parseInt(document.getElementById('sell-discount').value, 10) || 0;
  const discountDurationHours = parseInt(document.getElementById('sell-discount-duration').value, 10) || 0;

  if (!title || !description || isNaN(price) || price <= 0) {
    errEl.textContent = "Merci de remplir le titre, la description et un prix valide.";
    errEl.classList.remove('hidden');
    return;
  }
  if (!pendingSellImageFile) {
    errEl.textContent = "Merci de choisir une photo depuis ton téléphone.";
    errEl.classList.remove('hidden');
    return;
  }
  if (type === 'book' && !pendingSellBookFile) {
    errEl.textContent = "Merci de choisir le fichier PDF de ton livre depuis ton téléphone.";
    errEl.classList.remove('hidden');
    return;
  }
  if (type === 'product' && !phone) {
    errEl.textContent = "Merci d'indiquer ton numéro WhatsApp pour que les acheteurs te contactent.";
    errEl.classList.remove('hidden');
    return;
  }

  const submitBtn = document.getElementById('sell-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publication en cours...'; }

  try {
    const { url: imageUrl } = await uploadFileToStorage(pendingSellImageFile, 'boutique-images', {
      maxSizeMB: 10,
      onProgress: (pct) => setUploadProgress('sell-image', pct)
    });

    let fileUrl = null;
    if (type === 'book') {
      const uploaded = await uploadFileToStorage(pendingSellBookFile, 'boutique-livres', {
        maxSizeMB: 50,
        onProgress: (pct) => setUploadProgress('sell-file', pct)
      });
      fileUrl = uploaded.url;
    }

    const newPubRef = await db.collection('publications').add({
      type, title, description, price, category, imageUrl,
      fileUrl: type === 'book' ? fileUrl : null,
      sellerUid: currentUser.uid,
      sellerName: currentUser.name || 'Vendeur Coeurnoh Universe',
      sellerVerified: !!currentUser.verified,
      sellerPhone: type === 'product' ? phone : null,
      discountPercent: discountPercent,
      promoExpiresAt: (discountPercent > 0 && discountDurationHours > 0)
        ? new Date(Date.now() + discountDurationHours * 60 * 60 * 1000).toISOString()
        : null,
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    });

    // Annonce publique visible par tous (panneau notifications) + vraie alerte push
    const annTitle = discountPercent > 0 ? 'Promotion disponible 🎉' : 'Nouveau produit disponible 🆕';
    const annBody = `${title} — ${price.toFixed(2)}$${discountPercent > 0 ? ` (-${discountPercent}%)` : ''}`;
    await db.collection('announcements').add({
      title: annTitle, body: annBody, type: 'announcement', url: '/?open=' + newPubRef.id, createdAt: new Date().toISOString()
    });
    broadcastPush(annTitle, annBody, 'content', '/?open=' + newPubRef.id);

    // CoeurNoh Alertes : notifie les utilisateurs dont une recherche
    // enregistree correspond a ce nouveau produit (non bloquant : si ca
    // echoue, la publication du produit reste quand meme reussie).
    if (type === 'product') {
      checkAlertsForNewProduct({ id: newPubRef.id, title, description, price, category }).catch(() => {});
    }

    document.getElementById('sell-modal').remove();
    loadShopFeed();
  } catch (e) {
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Publier'; }
  }
}

/* Fil de publications sur l'Accueil : PHOTOS/VIDEOS/TEXTES (type 'post'),
   rendu style Instagram/Facebook — volontairement different des cartes
   Boutique (pas de prix, media en plein format, legende en dessous). */
let homeFeedLastDoc = null;
let followingSet = new Set();

function renderFeedSkeletons(count = 3) {
  return Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-body">
        <div class="skeleton-avatar-row">
          <div class="skeleton-avatar skeleton-shine"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <div class="skeleton-line w-40 skeleton-shine"></div>
            <div class="skeleton-line w-60 skeleton-shine" style="height:8px"></div>
          </div>
        </div>
      </div>
      <div class="skeleton-media skeleton-shine"></div>
      <div class="skeleton-body">
        <div class="skeleton-line w-90 skeleton-shine"></div>
        <div class="skeleton-line w-60 skeleton-shine"></div>
      </div>
    </div>
  `).join('');
}

async function loadHomeFeed(append = false) {
  const feedEl = document.getElementById('home-feed');
  if (!feedEl) return;
  if (!append) {
    feedEl.innerHTML = renderFeedSkeletons(3);
    homeFeedLastDoc = null;
  }
  try {
    let query = db.collection('publications')
      .where('status', '==', 'published')
      .where('type', '==', 'post')
      .orderBy('createdAt', 'desc')
      .limit(30);
    if (append && homeFeedLastDoc) query = query.startAfter(homeFeedLastDoc);

    const snap = await query.get();

    const oldBtn = document.getElementById('home-feed-load-more');
    if (oldBtn) oldBtn.remove();

    if (snap.empty) {
      if (!append) feedEl.innerHTML = '<p class="muted">Aucune publication pour l\'instant. Sois le premier à publier !</p>';
      return;
    }

    homeFeedLastDoc = snap.docs[snap.docs.length - 1];
    let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    items = items.filter(item => !blockedSet.has(item.sellerUid));

    if (items.length === 0 && !append) {
      feedEl.innerHTML = '<p class="muted">Aucune publication pour l\'instant. Sois le premier à publier !</p>';
      return;
    }

    let likedMap = {};
    let savedMap = {};
    if (currentUser) {
      try {
        const [likeChecks, saveChecks] = await Promise.all([
          Promise.all(items.map(item =>
            db.collection('publication_likes').doc(`${item.id}_${currentUser.uid}`).get()
          )),
          Promise.all(items.map(item =>
            db.collection('saved_items').doc(`${item.id}_${currentUser.uid}`).get()
          ))
        ]);
        items.forEach((item, i) => {
          likedMap[item.id] = likeChecks[i].exists;
          savedMap[item.id] = saveChecks[i].exists;
        });
      } catch (e) {
        // Non bloquant : le fil s'affiche quand meme, juste sans les etats
        // like/enregistre precalcules (ils se corrigeront au premier clic).
        console.log('[like/save] non bloquant :', e.message);
      }

      // Requete isolee dans son propre try/catch : si "follows" a un souci
      // (regles pas encore publiees, etc.), le fil d'accueil continue quand
      // meme a s'afficher normalement -- juste sans le tri par abonnements.
      try {
        const followSnap = await db.collection('follows').where('followerUid', '==', currentUser.uid).get();
        followingSet = new Set(followSnap.docs.map(d => d.data().followedUid));
      } catch (e) {
        console.log('[follows] non bloquant :', e.message);
        followingSet = new Set();
      }

      // Priorise les publications des comptes suivis, sans casser l'ordre
      // chronologique a l'interieur de chaque groupe (tri stable JS).
      // Pas de nouvelle requete, pas d'IA : juste un reclassement simple.
      if (followingSet.size > 0) {
        items.sort((a, b) => {
          const aFollowed = followingSet.has(a.sellerUid) ? 0 : 1;
          const bFollowed = followingSet.has(b.sellerUid) ? 0 : 1;
          return aFollowed - bFollowed;
        });
      }
    }

    const html = items.map(item => renderPostCard(item, likedMap[item.id], savedMap[item.id])).join('');
    if (append) {
      feedEl.insertAdjacentHTML('beforeend', html);
    } else {
      feedEl.innerHTML = html;
    }
    // Ecoute en direct les likes/commentaires de ces publications, pour que
    // les compteurs montent aussi chez les autres utilisateurs qui regardent
    // le meme fil au meme moment (pas seulement chez celui qui like/commente).
    watchPostsCounts(items.map(item => item.id));

    // Bouton "Charger plus" uniquement si la page est pleine : il y a
    // probablement encore des publications plus anciennes a recuperer.
    if (snap.docs.length === 30) {
      feedEl.insertAdjacentHTML('beforeend',
        '<button class="btn btn-outline" id="home-feed-load-more" style="width:100%;margin-top:10px" onclick="loadHomeFeed(true)">Charger plus</button>');
    }
  } catch (e) {
    if (!append) {
      feedEl.innerHTML = `<p class="muted"><span data-i18n="shop_load_error_prefix">Erreur de chargement :</span> ${e.message}</p>`;
    } else {
      showToast(friendlyErrorMessage(e), 'error');
    }
  }
}

function renderPostCard(item, isLiked, isSaved, hideFollowBtn) {
  const timeStr = timeAgo(item.createdAt);
  let mediaHtml = '';
  if (item.mediaType === 'photo' && item.imageUrl) {
    const rawUrl = normalizeMediaUrl(item.imageUrl);
    mediaHtml = `<img src="${escapeHtml(rawUrl)}" alt="" class="post-media" loading="lazy" onclick="openMediaViewer('${escapeForJs(rawUrl)}','photo')" onerror="mediaLoadError(this)">`;
  } else if (item.mediaType === 'video' && item.videoUrl) {
    const rawUrl = normalizeMediaUrl(item.videoUrl);
    mediaHtml = `<video src="${escapeHtml(rawUrl)}" class="post-media" controls onclick="openMediaViewer('${escapeForJs(rawUrl)}','video')" onerror="mediaLoadError(this)"></video>`;
  }

  const shareUrl = `https://coeurnohboost.vercel.app/?produit=${item.id}`;
  const isOwnPost = currentUser && currentUser.uid === item.sellerUid;
  const isFollowing = item.sellerUid && followingSet.has(item.sellerUid);
  const followBtnHtml = (item.sellerUid && !isOwnPost && !hideFollowBtn) ? `
    <button class="follow-btn ${isFollowing ? 'following' : ''}" data-follow-btn="${item.sellerUid}"
      onclick="toggleFollow('${item.sellerUid}','${escapeForJs(item.sellerName || 'ce compte')}')">
      <span data-follow-label="${item.sellerUid}">${isFollowing ? 'Abonné' : '+ Suivre'}</span>
    </button>` : '';

  const profileClick = item.sellerUid
    ? `onclick="openProfileModal('${item.sellerUid}','${escapeForJs(item.sellerName || 'Coeurnoh Universe')}',${item.sellerVerified ? 'true' : 'false'})" style="cursor:pointer"`
    : '';

  return `
  <div class="post-card" id="shop-card-${item.id}">
    <div class="post-card-header">
      <div class="post-avatar" ${profileClick}>${escapeHtml((item.sellerName || 'C')[0].toUpperCase())}</div>
      <div ${profileClick}>
        <strong>${escapeHtml(item.sellerName || 'Coeurnoh Universe')}${item.sellerVerified ? ' ✔️' : ''}</strong>
        <div class="post-time">${timeStr}</div>
      </div>
      ${followBtnHtml}
      ${isOwnPost ? `
      <button class="post-more-btn" onclick="openPostOptionsMenu('${item.id}')" title="Options" aria-label="Options de la publication">${ICON_DOTS}</button>
      ` : ''}
    </div>
    ${item.description ? `<p class="post-caption">${escapeHtml(item.description)}</p>` : ''}
    ${mediaHtml}
    <div class="post-actions">
      <button class="shop-action-btn ${isLiked ? 'liked' : ''}" data-like-btn="${item.id}" onclick="toggleShopLike('${item.id}')">
        <span data-like-icon="${item.id}">${isLiked ? ICON_HEART_FILLED : ICON_HEART_OUTLINE}</span>
        <span data-like-count="${item.id}">${item.likesCount || 0}</span>
      </button>
      <button class="shop-action-btn" onclick="openPostDetail('${item.id}')">
        ${ICON_COMMENT} <span data-comment-count="${item.id}">${item.commentsCount || 0}</span>
      </button>
      <button class="shop-action-btn" onclick="sharePost('${item.id}','${escapeForJs(item.description || '')}','${shareUrl}')">
        ${ICON_SHARE} Partager
      </button>
      <button class="shop-action-btn ${isSaved ? 'liked' : ''}" data-save-btn="${item.id}" onclick="toggleSavePost('${item.id}')" title="Enregistrer" aria-label="Enregistrer cette publication" style="margin-left:auto">
        <span data-save-icon="${item.id}">${isSaved ? ICON_BOOKMARK_FILLED : ICON_BOOKMARK}</span>
      </button>
    </div>
  </div>`;
}

function sharePost(pubId, caption, url) {
  if (navigator.share) {
    navigator.share({ title: 'Coeurnoh Universe', text: caption || 'Regarde cette publication', url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url);
    showToast('Lien copié !', 'success');
  }
  notifyPublicationShared(pubId);
}

// Notifie le proprietaire d'une publication (post OU article boutique) quand
// quelqu'un la partage — utilise par sharePost() et shareShopItem().
async function notifyPublicationShared(pubId) {
  if (!currentUser) return;
  try {
    const pubSnap = await db.collection('publications').doc(pubId).get();
    const pub = pubSnap.data();
    if (pub && pub.sellerUid && pub.sellerUid !== currentUser.uid) {
      const title = 'Partage 🔗';
      const body = `${currentUser.name || 'Quelqu\'un'} a partagé "${pub.title || pub.description || 'ta publication'}".`;
      await db.collection('notifications').add({
        uid: pub.sellerUid, title, body, type: 'share', read: false, url: '/?open=' + pubId, createdAt: new Date().toISOString()
      });
      notifyUserPush(pub.sellerUid, title, body, 'activity', '/?open=' + pubId);
    }
  } catch (e) { /* pas grave si la notification echoue */ }
}

/* ================= VISIONNEUSE PLEIN ECRAN ================= */
function openMediaViewer(url, type) {
  const contentEl = document.getElementById('media-viewer-content');
  contentEl.innerHTML = type === 'video'
    ? `<video src="${escapeHtml(url)}" controls autoplay class="media-viewer-media"></video>`
    : `<img src="${escapeHtml(url)}" alt="" class="media-viewer-media" loading="lazy">`;
  document.getElementById('media-viewer-download-btn').onclick = () => downloadMedia(url, type);
  document.getElementById('media-viewer').classList.remove('hidden');
}

function closeMediaViewer() {
  document.getElementById('media-viewer').classList.add('hidden');
  document.getElementById('media-viewer-content').innerHTML = '';
}

async function downloadMedia(url, type) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `coeurnohboost-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    showToast("Téléchargement auto impossible : appui long sur l'image/vidéo puis \"Enregistrer\".", 'info');
  }
}

/* ================= COMPTEURS EN TEMPS REEL (likes / commentaires) =================
   AVANT : le nombre de likes/commentaires n'etait mis a jour que sur l'ecran
   de la personne qui likait/commentait elle-meme (patch DOM local). Un autre
   utilisateur regardant la meme publication au meme moment ne voyait rien
   bouger tant qu'il ne rechargeait pas la page. On ecoute maintenant chaque
   publication affichee en direct (onSnapshot) : le compteur monte pour tout
   le monde, en temps reel, des qu'un like ou un commentaire arrive. */
const postRealtimeListeners = new Map();
const POST_REALTIME_MAX = 60; // securite : evite d'accumuler des ecouteurs sans fin sur un long fil

function watchPostCounts(pubId) {
  if (!pubId || postRealtimeListeners.has(pubId)) return;

  // Si trop d'ecouteurs sont deja ouverts (long defilement), on detache le
  // plus ancien avant d'en ouvrir un nouveau -- simple garde-fou de securite.
  if (postRealtimeListeners.size >= POST_REALTIME_MAX) {
    const oldestKey = postRealtimeListeners.keys().next().value;
    unwatchPostCounts(oldestKey);
  }

  try {
    const unsubscribe = db.collection('publications').doc(pubId).onSnapshot((doc) => {
      if (!doc.exists) return;
      const d = doc.data();
      document.querySelectorAll(`[data-like-count="${pubId}"]`).forEach(el => {
        el.textContent = d.likesCount || 0;
      });
      document.querySelectorAll(`[data-comment-count="${pubId}"]`).forEach(el => {
        el.textContent = d.commentsCount || 0;
      });
    }, (err) => {
      console.log('[compteurs temps reel] non bloquant :', err.message);
    });
    postRealtimeListeners.set(pubId, unsubscribe);
  } catch (e) {
    console.log('[compteurs temps reel] non bloquant :', e.message);
  }
}

function unwatchPostCounts(pubId) {
  const unsubscribe = postRealtimeListeners.get(pubId);
  if (unsubscribe) {
    try { unsubscribe(); } catch (e) { /* pas grave */ }
    postRealtimeListeners.delete(pubId);
  }
}

function watchPostsCounts(pubIds) {
  (pubIds || []).forEach(watchPostCounts);
}

/* ================= MENU OPTIONS PUBLICATION (3 points, façon Facebook) =================
   Remplace les anciens boutons crayon (modifier) + poubelle (supprimer)
   affiches en permanence sur chaque publication : un seul bouton "..."
   ouvre desormais ce menu (Modifier / Telecharger / Supprimer), exactement
   comme sur Facebook/Instagram. La publication est relue au moment du clic
   pour proposer des actions toujours a jour (pas de donnees perimees). */
let postOptionsPubId = null;

function openPostOptionsMenu(pubId) {
  postOptionsPubId = pubId;
  const sheet = document.getElementById('post-options-sheet');
  const overlay = document.getElementById('post-options-overlay');
  if (!sheet || !overlay) return;
  sheet.innerHTML = `
    <button class="action-sheet-btn" onclick="postOptionsEdit()">${ICON_EDIT} Modifier</button>
    <button class="action-sheet-btn" onclick="postOptionsDownload()">${ICON_DOWNLOAD} Télécharger</button>
    <button class="action-sheet-btn action-sheet-btn-danger" onclick="postOptionsDelete()">${ICON_TRASH} Supprimer</button>
    <button class="action-sheet-btn action-sheet-cancel" onclick="closePostOptionsMenu()">Annuler</button>
  `;
  overlay.classList.remove('hidden');
}

function closePostOptionsMenu() {
  const overlay = document.getElementById('post-options-overlay');
  if (overlay) overlay.classList.add('hidden');
  postOptionsPubId = null;
}

async function postOptionsEdit() {
  const pubId = postOptionsPubId;
  closePostOptionsMenu();
  if (!pubId) return;
  try {
    const snap = await db.collection('publications').doc(pubId).get();
    if (!snap.exists) { showToast('Publication introuvable (peut-être déjà supprimée).', 'error'); return; }
    const d = snap.data();
    if (d.type && d.type !== 'post') {
      openEditPubForm(pubId, d.type, d.title || '', d.description || '', d.price || 0);
    } else {
      openEditPostForm(pubId, d.description || '');
    }
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function postOptionsDownload() {
  const pubId = postOptionsPubId;
  closePostOptionsMenu();
  if (!pubId) return;
  try {
    const snap = await db.collection('publications').doc(pubId).get();
    if (!snap.exists) return;
    const d = snap.data();
    const rawUrl = d.mediaType === 'video' ? d.videoUrl : (d.imageUrl || d.fileUrl);
    const url = normalizeMediaUrl(rawUrl);
    if (!url) { showToast('Aucun fichier à télécharger pour cette publication.', 'error'); return; }
    downloadMedia(url, d.mediaType === 'video' ? 'video' : 'photo');
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function postOptionsDelete() {
  const pubId = postOptionsPubId;
  closePostOptionsMenu();
  if (!pubId) return;
  if (!confirm('Supprimer définitivement cette publication ?')) return;
  try {
    await db.collection('publications').doc(pubId).delete();
    unwatchPostCounts(pubId);
    document.getElementById(`shop-card-${pubId}`)?.remove();
    closePostDetail();
    showToast('Publication supprimée', 'success');
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= CREER UNE PUBLICATION (Accueil) =================
   Le fichier choisi sur le telephone est garde en memoire (pendingPostMediaFile)
   et n'est envoye vers Firebase Storage qu'au moment de "Publier", pour
   pouvoir encore changer d'avis / de fichier avant l'upload reel. */
let pendingPostMediaFile = null;

function openCreatePostForm() {
  if (!currentUser) { openAuth('register'); return; }
  document.getElementById('create-post-modal').classList.remove('hidden');
  document.getElementById('post-media-preview').innerHTML = '';
  document.getElementById('post-media-file').value = '';
  pendingPostMediaFile = null;
  resetUploadProgress('post-media');
  togglePostMediaField();
}

function closeCreatePostForm() {
  document.getElementById('create-post-modal').classList.add('hidden');
}

function togglePostMediaField() {
  const type = document.getElementById('post-media-type').value;
  document.getElementById('post-media-url-field').style.display = type === 'text' ? 'none' : 'block';
  const fileInput = document.getElementById('post-media-file');
  if (fileInput) fileInput.accept = type === 'video' ? 'video/*' : 'image/*';
  updatePostMediaPreview();
}

function handlePostMediaFileChange(event) {
  pendingPostMediaFile = (event.target.files && event.target.files[0]) || null;
  updatePostMediaPreview();
}

// Apercu instantane a partir du fichier choisi sur le telephone (pas
// besoin d'attendre l'upload pour voir a quoi ressemble la publication).
function updatePostMediaPreview() {
  const previewEl = document.getElementById('post-media-preview');
  const type = document.getElementById('post-media-type').value;

  if (type === 'text' || !pendingPostMediaFile) {
    previewEl.innerHTML = '';
    return;
  }

  const localUrl = URL.createObjectURL(pendingPostMediaFile);
  previewEl.innerHTML = type === 'video'
    ? `<video src="${localUrl}" class="post-media-preview-media" controls></video>`
    : `<img src="${localUrl}" class="post-media-preview-media" alt="">`;
}

async function submitCreatePost() {
  const errEl = document.getElementById('post-form-error');
  errEl.classList.add('hidden');

  const mediaType = document.getElementById('post-media-type').value;
  const caption = document.getElementById('post-caption').value.trim();

  if (mediaType !== 'text' && !pendingPostMediaFile) {
    errEl.textContent = "Merci de choisir une photo ou une vidéo depuis ton téléphone.";
    errEl.classList.remove('hidden');
    return;
  }
  if (!caption && mediaType === 'text') {
    errEl.textContent = "Merci d'écrire un texte.";
    errEl.classList.remove('hidden');
    return;
  }

  const submitBtn = document.getElementById('create-post-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publication en cours...'; }

  try {
    let imageUrl = null;
    let videoUrl = null;

    if (mediaType !== 'text' && pendingPostMediaFile) {
      const maxSizeMB = mediaType === 'video' ? 100 : 10;
      const { url } = await uploadFileToStorage(pendingPostMediaFile, 'posts', {
        maxSizeMB,
        onProgress: (pct) => setUploadProgress('post-media', pct)
      });
      if (mediaType === 'photo') imageUrl = url; else videoUrl = url;
    }

    const newPubRef = await db.collection('publications').add({
      type: 'post',
      mediaType,
      imageUrl,
      videoUrl,
      description: caption,
      sellerUid: currentUser.uid,
      sellerName: currentUser.name || 'Utilisateur',
      sellerVerified: !!currentUser.verified,
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    });

    // Annonce publique visible par tous (panneau notifications) + vraie alerte push
    const mediaLabel = mediaType === 'photo' ? 'une photo' : mediaType === 'video' ? 'une vidéo' : 'un texte';
    const annTitle = 'Nouvelle publication 📸';
    const annBody = `${currentUser.name || 'Quelqu\'un'} a publié ${mediaLabel}${caption ? ` : "${caption.slice(0, 60)}"` : ''}`;
    db.collection('announcements').add({
      title: annTitle, body: annBody, type: 'announcement', url: '/?open=' + newPubRef.id, createdAt: new Date().toISOString()
    }).catch(() => {});
    broadcastPush(annTitle, annBody, 'content', '/?open=' + newPubRef.id);

    document.getElementById('post-media-file').value = '';
    pendingPostMediaFile = null;
    document.getElementById('post-caption').value = '';
    document.getElementById('post-media-preview').innerHTML = '';
    resetUploadProgress('post-media');
    closeCreatePostForm();
    loadHomeFeed();
  } catch (e) {
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Publier'; }
  }
}

function showShop() {
  hideAllViews();
  document.getElementById('view-shop').classList.remove('hidden');
  const homeFeedEl = document.getElementById('home-feed');
  if (homeFeedEl) homeFeedEl.innerHTML = '';
  loadShopFeed();
}

/* ================= BIBLIOTHEQUE (livres uniquement, espace dedie) =================
   Reutilise le meme cache (shopFeedItems / shopLikedMap / shopPurchasedSet) et
   la meme carte (renderShopCard) que la Boutique -- juste un affichage separe,
   filtre sur les livres, avec sa propre recherche. */
async function showLibrary() {
  hideAllViews();
  document.getElementById('view-library').classList.remove('hidden');
  const homeFeedEl = document.getElementById('home-feed');
  if (homeFeedEl) homeFeedEl.innerHTML = '';
  if (shopFeedItems.length === 0) {
    await loadShopFeed();
  }
  renderLibraryFeed();
}

function renderLibraryFeed() {
  const feedEl = document.getElementById('library-feed');
  const searchText = (document.getElementById('library-search-input').value || '').trim().toLowerCase();

  let filtered = shopFeedItems.filter(item => item.type === 'book');
  if (searchText) {
    filtered = filtered.filter(item =>
      (item.title || '').toLowerCase().includes(searchText) ||
      (item.description || '').toLowerCase().includes(searchText)
    );
  }
  filtered = filtered.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (filtered.length === 0) {
    feedEl.innerHTML = '<p class="muted" data-i18n="library_no_results">Aucun livre trouvé. Essaie une autre recherche.</p>';
    return;
  }

  feedEl.innerHTML = filtered.map(item =>
    renderShopCard(item, shopLikedMap[item.id], shopPurchasedSet.has(item.id))
  ).join('');
  watchPostsCounts(filtered.map(item => item.id));
}

/* ================= ESPACE VENDEUR ================= */
const SELLER_TIERS = [
  { min: 50, name: 'Diamant', emoji: '💎', color: '#5ec1ea' },
  { min: 20, name: 'Or',      emoji: '🥇', color: '#e8a534' },
  { min: 5,  name: 'Argent',  emoji: '🥈', color: '#9aa3ad' },
  { min: 0,  name: 'Bronze',  emoji: '🥉', color: '#b8722f' }
];

function getSellerTier(salesCount) {
  return SELLER_TIERS.find(t => salesCount >= t.min);
}

function showSellerPage() {
  if (!currentUser) { openAuth('register'); return; }
  hideAllViews();
  document.getElementById('view-seller').classList.remove('hidden');
  loadSellerStats();
  loadMyPublications();
  loadSellerWithdrawals();
}

/* ================= RETRAIT VENDEUR ================= */
let withdrawMethod = 'mobile'; // 'mobile' ou 'crypto'
let withdrawCountry = null;
let withdrawOperator = null;

function openWithdrawForm() {
  const balance = currentUser.balance || 0;
  const modalHtml = `
    <div class="modal-overlay" id="withdraw-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('withdraw-modal').remove()" aria-label="Fermer">×</button>
        <h2>💸 Demander un retrait</h2>
        <p class="sub">Ton solde disponible : <strong>${balance.toFixed(2)}$</strong></p>
        <p class="muted small" style="margin-bottom:14px">Ta demande sera traitée manuellement par Coeurnoh Universe, généralement sous 24-48h.</p>
        <div class="modal-error hidden" id="withdraw-form-error"></div>

        <div class="pay-method-tabs" id="withdraw-method-tabs"></div>

        <div id="withdraw-panel-mobile">
          <div class="field">
            <label>Pays</label>
            <select id="withdraw-country-select" class="select-input" onchange="onWithdrawCountryChange()"></select>
          </div>
          <div class="op-grid" id="withdraw-operators"></div>
          <div class="field">
            <label>Numéro de téléphone</label>
            <input type="tel" id="withdraw-phone" class="text-input" placeholder="+243...">
          </div>
        </div>

        <div class="hidden" id="withdraw-panel-crypto">
          <div class="field">
            <label>Réseau</label>
            <select id="withdraw-crypto-network" class="select-input">
              <option value="usdt-trc20">USDT (TRC20 - Tron)</option>
              <option value="usdt-bep20">USDT (BEP20 - BSC)</option>
              <option value="btc">Bitcoin (BTC)</option>
              <option value="trx">TRON (TRX)</option>
            </select>
          </div>
          <div class="field">
            <label>Adresse du portefeuille</label>
            <input type="text" id="withdraw-address" class="text-input" placeholder="Colle ton adresse ici">
          </div>
        </div>

        <div class="field">
          <label>Montant à retirer (USD)</label>
          <input type="number" id="withdraw-amount" class="text-input" placeholder="Ex: 20" step="0.01" min="1" max="${balance}">
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="submitWithdrawRequest()">Envoyer la demande</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  withdrawMethod = 'mobile'; withdrawCountry = null; withdrawOperator = null;
  renderWithdrawMethodTabs();
  renderWithdrawCountrySelect();
}

function renderWithdrawMethodTabs() {
  const methods = [{ id: 'mobile', label: 'Mobile Money', icon: '📱' }, { id: 'crypto', label: 'Crypto', icon: '₿' }];
  document.getElementById('withdraw-method-tabs').innerHTML = methods.map(m => `
    <button class="${m.id === withdrawMethod ? 'active' : ''}" onclick="selectWithdrawMethod('${m.id}')">${m.icon} ${m.label}</button>
  `).join('');
  document.getElementById('withdraw-panel-mobile').classList.toggle('hidden', withdrawMethod !== 'mobile');
  document.getElementById('withdraw-panel-crypto').classList.toggle('hidden', withdrawMethod !== 'crypto');
}

function selectWithdrawMethod(m) {
  withdrawMethod = m;
  renderWithdrawMethodTabs();
}

function renderWithdrawCountrySelect() {
  const sel = document.getElementById('withdraw-country-select');
  sel.innerHTML = `<option value="">Choisis ton pays</option>` +
    COUNTRIES.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join('');
}

function onWithdrawCountryChange() {
  withdrawCountry = document.getElementById('withdraw-country-select').value || null;
  withdrawOperator = null;
  renderWithdrawOperators();
}

function renderWithdrawOperators() {
  const country = COUNTRIES.find(c => c.code === withdrawCountry);
  const el = document.getElementById('withdraw-operators');
  if (!country) { el.innerHTML = ''; return; }
  el.innerHTML = country.ops.map(op => {
    const badge = getOperatorBadge(op);
    return `
    <div class="op-card${op === withdrawOperator ? ' active' : ''}" onclick="selectWithdrawOperator('${op.replace(/'/g, "\\'")}')">
      <div class="op-icon" style="background:${badge.bg};${badge.dark ? 'color:#111' : 'color:#fff'}">${badge.label}</div>
      <span class="op-name">${op}</span>
    </div>`;
  }).join('');
}

function selectWithdrawOperator(op) {
  withdrawOperator = op;
  renderWithdrawOperators();
}

async function submitWithdrawRequest() {
  const errEl = document.getElementById('withdraw-form-error');
  errEl.classList.add('hidden');

  const amount = parseFloat(document.getElementById('withdraw-amount').value);
  let method, accountDetails;

  if (withdrawMethod === 'mobile') {
    const phone = document.getElementById('withdraw-phone').value.trim();
    const country = COUNTRIES.find(c => c.code === withdrawCountry);
    if (!withdrawCountry || !withdrawOperator || !phone) {
      errEl.textContent = "Merci de choisir ton pays, ton opérateur et ton numéro.";
      errEl.classList.remove('hidden');
      return;
    }
    method = `${withdrawOperator} (${country.name})`;
    accountDetails = phone;
  } else {
    const network = document.getElementById('withdraw-crypto-network').value;
    const address = document.getElementById('withdraw-address').value.trim();
    if (!address) {
      errEl.textContent = "Merci d'indiquer ton adresse crypto.";
      errEl.classList.remove('hidden');
      return;
    }
    const cryptoNames = { 'usdt-trc20': 'USDT (TRC20)', 'usdt-bep20': 'USDT (BEP20)', 'btc': 'Bitcoin', 'trx': 'TRON' };
    method = cryptoNames[network] || network;
    accountDetails = address;
  }

  if (isNaN(amount) || amount <= 0) {
    errEl.textContent = "Merci d'indiquer un montant valide.";
    errEl.classList.remove('hidden');
    return;
  }
  if (amount > (currentUser.balance || 0)) {
    errEl.textContent = "Ce montant dépasse ton solde disponible.";
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/notify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request-withdrawal', idToken, amount, method, accountDetails })
    });
    const data = await resp.json();
    if (!data.success) {
      errEl.textContent = data.error || 'Erreur : réessaie.';
      errEl.classList.remove('hidden');
      return;
    }
    currentUser.balance = data.newBalance;

    document.getElementById('withdraw-modal').remove();
    loadSellerWithdrawals();
    loadSellerStats();
  } catch (e) {
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  }
}

async function loadSellerWithdrawals() {
  const el = document.getElementById('seller-withdrawals-list');
  try {
    const snap = await db.collection('withdrawal_requests')
      .where('uid', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      el.innerHTML = '<p class="muted">Aucune demande de retrait pour l\'instant.</p>';
      return;
    }

    const statusLabels = { pending: '⏳ En attente', paid: '✅ Payé', rejected: '❌ Rejeté' };
    el.innerHTML = snap.docs.map(doc => {
      const w = doc.data();
      return `
      <div class="seller-sale-row">
        <div>
          <strong>${w.amountUSD.toFixed(2)}$</strong> — ${w.method}
          <div class="muted small">${new Date(w.createdAt).toLocaleDateString('fr-FR')} · ${statusLabels[w.status] || w.status}</div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadSellerStats() {
  const badgeEl = document.getElementById('seller-badge-card');
  const statsEl = document.getElementById('seller-stats-grid');
  const salesEl = document.getElementById('seller-recent-sales');

  try {
    const snap = await db.collection('shop_orders')
      .where('sellerUid', '==', currentUser.uid)
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .get();

    const sales = snap.docs.map(doc => doc.data());
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.sellerPayoutUSD || 0), 0);
    const bookSales = sales.filter(s => s.itemType === 'book').length;
    const productSales = sales.filter(s => s.itemType === 'product').length;

    const tier = getSellerTier(totalSales);
    const nextTier = SELLER_TIERS.slice().reverse().find(t => t.min > totalSales);

    badgeEl.innerHTML = `
      <div class="seller-badge-card" style="border-color:${tier.color}">
        <div class="seller-badge-emoji">${tier.emoji}</div>
        <div>
          <div class="seller-badge-name" style="color:${tier.color}">Niveau ${tier.name}</div>
          <div class="muted small">${totalSales} vente${totalSales > 1 ? 's' : ''} au total
            ${nextTier ? ` · Encore ${nextTier.min - totalSales} pour atteindre ${nextTier.name} ${nextTier.emoji}` : ' · Niveau maximum atteint !'}
          </div>
        </div>
      </div>`;

    statsEl.innerHTML = `
      <div class="seller-stat-box">
        <div class="seller-stat-value">${totalRevenue.toFixed(2)}$</div>
        <div class="seller-stat-label">Revenu total (90%)</div>
      </div>
      <div class="seller-stat-box">
        <div class="seller-stat-value">${totalSales}</div>
        <div class="seller-stat-label">Ventes totales</div>
      </div>
      <div class="seller-stat-box">
        <div class="seller-stat-value">${bookSales}</div>
        <div class="seller-stat-label">📖 Livres vendus</div>
      </div>
      <div class="seller-stat-box">
        <div class="seller-stat-value">${productSales}</div>
        <div class="seller-stat-label">🛍️ Produits vendus</div>
      </div>`;

    if (sales.length === 0) {
      salesEl.innerHTML = '<p class="muted">Aucune vente pour l\'instant.</p>';
    } else {
      salesEl.innerHTML = sales.slice(0, 20).map(s => `
        <div class="seller-sale-row">
          <div>
            <strong>${s.itemTitle}</strong>
            <div class="muted small">${new Date(s.createdAt).toLocaleDateString('fr-FR')}</div>
          </div>
          <div class="seller-sale-amount">+${(s.sellerPayoutUSD || 0).toFixed(2)}$</div>
        </div>
      `).join('');
    }
  } catch (e) {
    badgeEl.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
    statsEl.innerHTML = '';
    salesEl.innerHTML = '';
  }
}

async function loadMyPublications() {
  const el = document.getElementById('seller-publications-list');
  try {
    const snap = await db.collection('publications')
      .where('sellerUid', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      el.innerHTML = '<p class="muted">Tu n\'as encore rien publié.</p>';
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const typeLabel = d.type === 'book' ? '📖' : '🛍️';
      return `
      <div class="seller-pub-row">
        <img src="${escapeHtml(d.imageUrl)}" alt="" class="seller-pub-img" loading="lazy">
        <div class="seller-pub-info">
          <strong>${typeLabel} ${escapeHtml(d.title)}</strong>
          <div class="muted small">${(d.price || 0).toFixed(2)}$ · ${ICON_HEART_FILLED} ${d.likesCount || 0}</div>
        </div>
        <button class="shop-action-btn" onclick="openEditPubForm('${doc.id}','${d.type}','${escapeForJs(d.title || '')}','${escapeForJs(d.description || '')}',${d.price || 0})" aria-label="Modifier cette publication">${ICON_EDIT}</button>
        <button class="shop-action-btn" onclick="deleteMyPublication('${doc.id}')" aria-label="Supprimer cette publication">${ICON_TRASH}</button>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
  }
}

async function deleteMyPublication(pubId) {
  if (!confirm("Supprimer definitivement cette publication ?")) return false;
  try {
    await db.collection('publications').doc(pubId).delete();
    loadMyPublications();
    return true;
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
    return false;
  }
}

// Route vers le bon formulaire de modification selon le type de publication :
// une publication sociale (post) n'a qu'une legende a corriger, alors qu'un
// article boutique (livre/produit) a un titre, une description et un prix.
function openEditPubForm(pubId, type, title, description, price) {
  if (type === 'post') {
    openEditPostForm(pubId, description);
  } else {
    openEditShopItemForm(pubId, title, description, price);
  }
}

function openEditShopItemForm(pubId, title, description, price) {
  if (document.getElementById('edit-shopitem-modal')) return;
  const html = `
    <div class="modal-overlay" id="edit-shopitem-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('edit-shopitem-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">Modifier l'article</h3>
        <div class="field">
          <label for="edit-shopitem-title">Titre</label>
          <input type="text" id="edit-shopitem-title" class="text-input" value="${escapeHtml(title)}" maxlength="120">
        </div>
        <div class="field">
          <label for="edit-shopitem-desc">Description</label>
          <textarea id="edit-shopitem-desc" class="text-input" rows="4" style="resize:vertical" maxlength="1000">${escapeHtml(description)}</textarea>
        </div>
        <div class="field">
          <label for="edit-shopitem-price">Prix ($)</label>
          <input type="number" id="edit-shopitem-price" class="text-input" value="${price}" min="0.01" step="0.01">
        </div>
        <button class="btn btn-primary" id="edit-shopitem-save-btn" style="width:100%;justify-content:center;margin-top:8px" onclick="saveEditShopItem('${pubId}')">Enregistrer</button>
        <p class="muted small" id="edit-shopitem-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveEditShopItem(pubId) {
  const btn = document.getElementById('edit-shopitem-save-btn');
  const msgEl = document.getElementById('edit-shopitem-msg');
  const title = document.getElementById('edit-shopitem-title').value.trim();
  const description = document.getElementById('edit-shopitem-desc').value.trim();
  const price = parseFloat(document.getElementById('edit-shopitem-price').value);

  if (!title) { msgEl.textContent = 'Le titre ne peut pas être vide.'; return; }
  if (!(price > 0)) { msgEl.textContent = 'Le prix doit être supérieur à 0.'; return; }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  try {
    await db.collection('publications').doc(pubId).update({ title, description, price });
    const modal = document.getElementById('edit-shopitem-modal');
    if (modal) modal.remove();
    showToast('Article modifié', 'success');
    loadMyPublications();
    renderShopFeed();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

// AVANT : une publication ne pouvait qu'etre supprimee, jamais corrigee --
// une simple faute de frappe obligeait a tout republier de zero (perdant
// les likes/commentaires deja recus).
function openEditPostForm(pubId, currentCaption) {
  if (document.getElementById('edit-post-modal')) return;
  const html = `
    <div class="modal-overlay" id="edit-post-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('edit-post-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:10px">Modifier ta publication</h3>
        <textarea id="edit-post-caption" class="text-input" rows="4" style="resize:vertical" maxlength="1000">${escapeHtml(currentCaption)}</textarea>
        <button class="btn btn-primary" id="edit-post-save-btn" style="width:100%;justify-content:center;margin-top:12px" onclick="saveEditPost('${pubId}')">Enregistrer</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveEditPost(pubId) {
  const btn = document.getElementById('edit-post-save-btn');
  const newCaption = document.getElementById('edit-post-caption').value.trim();
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  try {
    await db.collection('publications').doc(pubId).update({ description: newCaption });
    const modal = document.getElementById('edit-post-modal');
    if (modal) modal.remove();
    showToast('Publication modifiée', 'success');
    loadHomeFeed();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

function setShopFilter(filter) {
  shopActiveFilter = filter;
  document.querySelectorAll('#shop-filter-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderShopFeed();
}

async function loadShopFeed() {
  const feedEl = document.getElementById('shop-feed');
  feedEl.innerHTML = renderFeedSkeletons(4);
  try {
    // Limite de securite : la recherche/filtre boutique se fait cote
    // telephone sur cette liste, donc une vraie pagination "Charger plus"
    // casserait la recherche (des resultats pourraient manquer). En
    // attendant une vraie recherche cote serveur, on plafonne a 200 pour
    // eviter que le chargement devienne trop lourd avec le temps.
    const snap = await db.collection('publications')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    shopFeedItems = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      // IMPORTANT : cette collection contient aussi les publications du fil
      // d'accueil (photo/vidéo/texte, sans prix) — on ne garde ici que les
      // vrais articles de Boutique/Bibliothèque (livres et produits), sinon
      // le calcul du prix plante sur les publications sans prix.
      .filter(item => item.type === 'book' || item.type === 'product');
    shopLikedMap = {};
    shopPurchasedSet = new Set();

    if (currentUser) {
      // Verifie en parallele les likes et les achats deja effectues (acces
      // livres). Isole dans son propre try/catch : si ca echoue, la
      // boutique s'affiche quand meme (juste sans ces etats precalcules)
      // au lieu de disparaitre completement derriere un message d'erreur.
      try {
        const [likeChecks, ordersSnap] = await Promise.all([
          Promise.all(shopFeedItems.map(item =>
            db.collection('publication_likes').doc(`${item.id}_${currentUser.uid}`).get()
          )),
          db.collection('shop_orders')
            .where('uid', '==', currentUser.uid)
            .where('status', '==', 'completed')
            .get()
        ]);
        shopFeedItems.forEach((item, i) => { shopLikedMap[item.id] = likeChecks[i].exists; });
        ordersSnap.docs.forEach(doc => shopPurchasedSet.add(doc.data().pubId));
      } catch (e) {
        console.log('[shop like/achat] non bloquant :', e.message);
      }
    }

    renderShopFeed();
  } catch (e) {
    feedEl.innerHTML = `<p class="muted"><span data-i18n="shop_load_error_prefix">Erreur de chargement :</span> ${e.message}</p>`;
  }
}

function renderShopFeed() {
  const feedEl = document.getElementById('shop-feed');
  const searchText = (document.getElementById('shop-search-input').value || '').trim().toLowerCase();

  let filtered = shopFeedItems;
  if (shopActiveFilter !== 'all') {
    filtered = filtered.filter(item => item.type === shopActiveFilter);
  }
  if (shopActiveCategory !== 'all') {
    filtered = filtered.filter(item => item.category === shopActiveCategory);
  }
  if (searchText) {
    filtered = filtered.filter(item =>
      (item.title || '').toLowerCase().includes(searchText) ||
      (item.description || '').toLowerCase().includes(searchText)
    );
  }

  filtered = filtered.slice(); // copie pour ne pas alterer l'ordre original de shopFeedItems
  if (shopActiveSort === 'popular') {
    filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Rejoue le fondu doux a chaque mise a jour (retire puis rajoute la classe)
  feedEl.classList.remove('fade-refresh');
  void feedEl.offsetWidth; // force le navigateur a "relire" avant de rajouter la classe
  feedEl.classList.add('fade-refresh');

  if (filtered.length === 0) {
    feedEl.innerHTML = '<p class="muted" data-i18n="shop_no_results">Aucun résultat. Essaie une autre recherche.</p>';
    return;
  }

  feedEl.innerHTML = filtered.map(item =>
    renderShopCard(item, shopLikedMap[item.id], shopPurchasedSet.has(item.id))
  ).join('');
  watchPostsCounts(filtered.map(item => item.id));
}

function getEffectivePrice(item) {
  if (item.discountPercent > 0) {
    const stillValid = !item.promoExpiresAt || new Date(item.promoExpiresAt) > new Date();
    if (stillValid) {
      return Math.round(item.price * (1 - item.discountPercent / 100) * 100) / 100;
    }
  }
  return item.price;
}

function renderShopCard(item, isLiked, isPurchased) {
  const typeLabel = item.type === 'book' ? '📖 Livre' : '🛍️ Produit';
  const alreadyOwned = item.type === 'book' && isPurchased;
  const effectivePrice = getEffectivePrice(item);
  const hasPromo = effectivePrice < item.price;

  const priceHtml = hasPromo
    ? `<div class="shop-card-price">${effectivePrice.toFixed(2)}$ <span class="shop-card-price-old">${item.price.toFixed(2)}$</span> <span class="shop-card-promo-badge">-${item.discountPercent}%</span></div>`
    : `<div class="shop-card-price">${item.price.toFixed(2)}$</div>`;

  let buyButtonHtml;
  if (alreadyOwned) {
    buyButtonHtml = `<a class="btn btn-primary btn-sm btn-buy-full" href="${escapeHtml(item.fileUrl)}" target="_blank">📖 Télécharger</a>`;
  } else if (item.type === 'book') {
    buyButtonHtml = `<button class="btn btn-primary btn-sm btn-buy-full" onclick="buyShopItem('${item.id}','${escapeForJs(item.title)}',${effectivePrice},'${item.type}')" data-i18n="shop_buy">Commander</button>`;
  } else {
    const inCart = cartItems.some(c => c.id === item.id);
    buyButtonHtml = `<button class="btn ${inCart ? 'btn-outline' : 'btn-primary'} btn-sm btn-buy-full" onclick="toggleCartItem('${item.id}','${escapeForJs(item.title)}',${effectivePrice},'${escapeForJs(item.imageUrl)}')">${inCart ? ICON_CHECK + ' Dans le panier' : ICON_CART + ' Ajouter'}</button>`;
  }

  // Le bouton WhatsApp n'apparait que sur les PRODUITS (coordination livraison),
  // jamais sur les livres (achat direct + telechargement immediat suffit).
  let whatsappHtml = '';
  if (item.type === 'product' && item.sellerPhone) {
    const waMessage = encodeURIComponent(`Bonjour, je suis intéressé(e) par : ${item.title}`);
    whatsappHtml = `<a class="shop-action-btn" href="https://wa.me/${item.sellerPhone.replace(/\D/g,'')}?text=${waMessage}" target="_blank" title="Contacter le vendeur">${ICON_WHATSAPP}</a>`;
  }

  const shareHtml = `<button class="shop-action-btn" onclick="shareShopItem('${item.id}','${escapeForJs(item.title)}')" title="Partager">${ICON_SHARE}</button>`;

  const deleteHtml = (currentUser && currentUser.uid === item.sellerUid)
    ? `<button class="shop-action-btn" onclick="deleteMyPublication('${item.id}')" title="Supprimer" aria-label="Supprimer cette publication" style="color:var(--red)">${ICON_TRASH}</button>`
    : '';

  const sellerLine = item.sellerName
    ? `<span class="shop-card-seller">Vendu par ${escapeHtml(item.sellerName)}${item.sellerVerified ? ' ✔️' : ''}</span>`
    : '';

  const categoryLabels = {
    ebooks: '📚 Livres & Ebooks', beaute: '💄 Beauté & Bien-être', mode: '👗 Mode & Accessoires',
    electronique: '🔌 Électronique', maison: '🏠 Maison & Déco', autres: '📦 Autres'
  };
  const categoryLine = item.category && categoryLabels[item.category]
    ? `<span class="shop-card-category">${categoryLabels[item.category]}</span>`
    : '';

  return `
  <div class="shop-card" id="shop-card-${item.id}">
    <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="shop-card-img" loading="lazy" onclick="openPostDetail('${item.id}')" onerror="mediaLoadError(this)">
    <div class="shop-card-body">
      <span class="shop-card-type">${typeLabel}${alreadyOwned ? ' · ✅ Déjà acheté' : ''}</span>
      ${categoryLine}
      <h3 class="shop-card-title">${escapeHtml(item.title)}</h3>
      ${sellerLine}
      <p class="shop-card-desc">${escapeHtml(item.description)}</p>
      ${priceHtml}

      <div class="shop-card-actions">
        <button class="shop-action-btn ${isLiked ? 'liked' : ''}" data-like-btn="${item.id}" onclick="toggleShopLike('${item.id}')">
          <span data-like-icon="${item.id}">${isLiked ? ICON_HEART_FILLED : ICON_HEART_OUTLINE}</span>
          <span data-like-count="${item.id}">${item.likesCount || 0}</span>
        </button>
        <button class="shop-action-btn" onclick="openPostDetail('${item.id}')">
          ${ICON_COMMENT} <span data-comment-count="${item.id}">${item.commentsCount || 0}</span>
        </button>
        ${whatsappHtml}
        ${shareHtml}
        ${deleteHtml}
        ${buyButtonHtml}
      </div>
    </div>
  </div>`;
}

const ICON_WHATSAPP = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01a7.94 7.94 0 0 0 5.54-13.58zM12.06 18.4a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.65.67-2.43-.16-.25a6.58 6.58 0 0 1 10.24-8.13 6.55 6.55 0 0 1 1.94 4.66 6.6 6.6 0 0 1-6.59 6.56zm3.6-4.93c-.2-.1-1.17-.58-1.35-.64s-.32-.1-.45.1-.5.64-.62.77-.23.15-.43.05a5.4 5.4 0 0 1-1.6-.98 6 6 0 0 1-1.1-1.37c-.12-.2 0-.3.09-.4s.2-.23.3-.35.13-.2.2-.33a.36.36 0 0 0 0-.35c-.05-.1-.45-1.08-.61-1.48s-.32-.33-.45-.33h-.38a.74.74 0 0 0-.53.25 2.24 2.24 0 0 0-.7 1.67 3.9 3.9 0 0 0 .81 2.05 8.9 8.9 0 0 0 3.4 3c.48.2.85.33 1.14.42a2.74 2.74 0 0 0 1.26.08 2.07 2.07 0 0 0 1.35-.95 1.68 1.68 0 0 0 .12-.95c-.05-.08-.18-.13-.38-.23z"/></svg>`;
const ICON_SHARE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>`;

// Jeu d'icones professionnelles (lignes fines, style Instagram/Facebook),
// pour remplacer les emoji sur les actions et sections principales.
const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const ICON_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_EDIT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
// Icone "..." (options), remplace les anciens boutons crayon+poubelle affiches
// en permanence sur chaque publication -- meme logique que Facebook/Instagram.
const ICON_DOTS = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="12" cy="19" r="2.1"/></svg>`;
const ICON_DOWNLOAD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const ICON_PALETTE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 10 10c0-1-1-2-2-2h-2.5a2.5 2.5 0 0 1 0-5H19a2 2 0 0 0 2-2c0-2-4-3-9-3Z"/></svg>`;
const ICON_BELL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
const ICON_SHIELD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`;
const ICON_INFO = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
const ICON_HEART_OUTLINE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`;
const ICON_HEART_FILLED = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`;
const ICON_BOOKMARK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const ICON_BOOKMARK_FILLED = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const ICON_FLAG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
const ICON_COMMENT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>`;
const ICON_CART = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>`;
const ICON_WALLET = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-4a2 2 0 0 1 0-4h4Z"/></svg>`;
const ICON_PACKAGE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`;
const ICON_TAG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 12.3 12.7 20.2a2 2 0 0 1-2.8 0l-7.1-7.1a2 2 0 0 1 0-2.8L10.7 2.3a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.9a2 2 0 0 1-.4 1.7Z"/><circle cx="15.5" cy="7.5" r="1.5"/></svg>`;
const ICON_LINK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5"/></svg>`;

async function shareShopItem(pubId, title) {
  const shareUrl = `https://coeurnohboost.vercel.app/?produit=${pubId}`;
  const shareText = `Regarde ça sur Coeurnoh Universe : ${title}`;

  if (navigator.share) {
    // Ouvre le menu de partage natif du telephone : WhatsApp, Statut, Messenger,
    // Facebook, Instagram, TikTok... tout ce qui est installe s'affiche automatiquement.
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
    } catch (e) { /* l'utilisateur a simplement annule le partage */ }
  } else {
    // Repli pour les navigateurs desktop qui n'ont pas le partage natif
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      showToast('Lien copié !', 'success');
    } catch (e) {
      prompt('Copie ce lien :', shareUrl);
    }
  }
  notifyPublicationShared(pubId);
}

function escapeForJs(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Empeche un clic rapide et repete (ou un double-tap) de declencher
// plusieurs requetes en meme temps sur le meme like.
const likeInFlight = new Set();

async function toggleShopLike(pubId) {
  if (!currentUser) { openAuth('register'); return; }
  const lockKey = pubId + '_' + currentUser.uid;
  if (likeInFlight.has(lockKey)) return;
  likeInFlight.add(lockKey);

  const likeRef = db.collection('publication_likes').doc(`${pubId}_${currentUser.uid}`);
  const pubRef = db.collection('publications').doc(pubId);
  // querySelectorAll : le meme bouton peut exister a la fois dans le fil ET
  // dans la fiche plein ecran ouverte -- on met les deux a jour ensemble.
  const iconEls = document.querySelectorAll(`[data-like-icon="${pubId}"]`);
  const countEls = document.querySelectorAll(`[data-like-count="${pubId}"]`);
  const btnEls = document.querySelectorAll(`[data-like-btn="${pubId}"]`);

  try {
    const likeDoc = await likeRef.get();
    if (likeDoc.exists) {
      await likeRef.delete();
      await pubRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
      iconEls.forEach(el => el.innerHTML = ICON_HEART_OUTLINE);
      btnEls.forEach(el => el.classList.remove('liked'));
      countEls.forEach(el => el.textContent = Math.max(0, parseInt(el.textContent, 10) - 1));
    } else {
      await likeRef.set({ pubId, uid: currentUser.uid, createdAt: new Date().toISOString() });
      await pubRef.update({ likesCount: firebase.firestore.FieldValue.increment(1) });
      iconEls.forEach(el => {
        el.innerHTML = ICON_HEART_FILLED;
        el.classList.remove('like-pop');
        void el.offsetWidth;
        el.classList.add('like-pop');
      });
      btnEls.forEach(el => el.classList.add('liked'));
      countEls.forEach(el => el.textContent = parseInt(el.textContent, 10) + 1);

      // Notifie le proprietaire de la publication (sauf s'il s'est like lui-meme)
      try {
        const pubSnap = await pubRef.get();
        const pub = pubSnap.data();
        if (pub && pub.sellerUid && pub.sellerUid !== currentUser.uid) {
          const title = 'Nouveau like ❤️';
          const body = `${currentUser.name || 'Quelqu\'un'} a aimé "${pub.title || pub.description || 'ta publication'}".`;
          await db.collection('notifications').add({
            uid: pub.sellerUid, title, body, type: 'like', read: false, url: '/?open=' + pubId, createdAt: new Date().toISOString()
          });
          notifyUserPush(pub.sellerUid, title, body, 'activity', '/?open=' + pubId);
        }
      } catch (e) { /* pas grave si la notification echoue */ }
    }
  } catch (e) {
    console.log('[shop] Erreur like :', e.message);
  } finally {
    likeInFlight.delete(lockKey);
  }
}

/* ================= CONTENUS ENREGISTRÉS ================= */
async function toggleSavePost(pubId) {
  if (!currentUser) { openAuth('register'); return; }
  const lockKey = 'save_' + pubId + '_' + currentUser.uid;
  if (likeInFlight.has(lockKey)) return;
  likeInFlight.add(lockKey);

  const saveRef = db.collection('saved_items').doc(`${pubId}_${currentUser.uid}`);
  const iconEls = document.querySelectorAll(`[data-save-icon="${pubId}"]`);
  const btnEls = document.querySelectorAll(`[data-save-btn="${pubId}"]`);
  btnEls.forEach(el => el.style.opacity = '0.6');

  try {
    const saveDoc = await saveRef.get();
    if (saveDoc.exists) {
      await saveRef.delete();
      iconEls.forEach(el => el.innerHTML = ICON_BOOKMARK);
      btnEls.forEach(el => el.classList.remove('liked'));
      showToast('Retiré des enregistrements', 'info');
    } else {
      await saveRef.set({ pubId, uid: currentUser.uid, createdAt: new Date().toISOString() });
      iconEls.forEach(el => el.innerHTML = ICON_BOOKMARK_FILLED);
      btnEls.forEach(el => el.classList.add('liked'));
      showToast('Enregistré', 'success');
    }
  } catch (e) {
    console.log('[shop] Erreur enregistrement :', e.message);
  } finally {
    btnEls.forEach(el => el.style.opacity = '');
    likeInFlight.delete(lockKey);
  }
}

/* ================= ABONNEMENTS (SUIVRE UN COMPTE) ================= */
async function toggleFollow(sellerUid, sellerName) {
  if (!currentUser) { openAuth('register'); return; }
  if (sellerUid === currentUser.uid) return;
  const lockKey = 'follow_' + sellerUid;
  if (likeInFlight.has(lockKey)) return;
  likeInFlight.add(lockKey);

  const followRef = db.collection('follows').doc(`${currentUser.uid}_${sellerUid}`);
  const btnEls = document.querySelectorAll(`[data-follow-btn="${sellerUid}"]`);
  const labelEls = document.querySelectorAll(`[data-follow-label="${sellerUid}"]`);
  // AVANT : aucun retour visuel entre le clic et la reponse du serveur
  // (quelques centaines de ms de silence total, comme si rien ne s'etait passe).
  btnEls.forEach(el => el.style.opacity = '0.6');

  try {
    if (followingSet.has(sellerUid)) {
      await followRef.delete();
      followingSet.delete(sellerUid);
      btnEls.forEach(el => el.classList.remove('following'));
      labelEls.forEach(el => el.textContent = '+ Suivre');
    } else {
      await followRef.set({
        followerUid: currentUser.uid,
        followerName: currentUser.name || '',
        followedUid: sellerUid,
        followedName: sellerName || '',
        createdAt: new Date().toISOString()
      });
      followingSet.add(sellerUid);
      btnEls.forEach(el => el.classList.add('following'));
      labelEls.forEach(el => el.textContent = 'Abonné');
      showToast(`Tu suis maintenant ${sellerName || 'ce compte'}`, 'success');
    }
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  } finally {
    btnEls.forEach(el => el.style.opacity = '');
    likeInFlight.delete(lockKey);
  }
}

/* ================= BLOCAGE DE COMPTE ================= */
// Effet du blocage : les publications du compte bloque disparaissent de
// ton fil d'accueil et de la recherche de comptes. Prive (personne d'autre
// ne peut voir qui tu as bloque), et bloquer quelqu'un annule
// automatiquement un eventuel abonnement dans les deux sens.
let blockedSet = new Set();

async function toggleBlockAccount(targetUid, targetName) {
  if (!currentUser) return;
  const lockKey = 'block_' + targetUid;
  if (likeInFlight.has(lockKey)) return;
  likeInFlight.add(lockKey);

  const blockRef = db.collection('blocks').doc(`${currentUser.uid}_${targetUid}`);
  const labelEls = document.querySelectorAll(`[data-block-label="${targetUid}"]`);

  try {
    const blockDoc = await blockRef.get();
    if (blockDoc.exists) {
      await blockRef.delete();
      blockedSet.delete(targetUid);
      labelEls.forEach(el => el.textContent = 'Bloquer ce compte');
      showToast(`${targetName || 'Ce compte'} débloqué`, 'info');
    } else {
      if (!confirm(`Bloquer ${targetName || 'ce compte'} ? Ses publications n'apparaîtront plus dans ton fil.`)) {
        return;
      }
      await blockRef.set({
        blockerUid: currentUser.uid,
        blockedUid: targetUid,
        blockedName: targetName || '',
        createdAt: new Date().toISOString()
      });
      blockedSet.add(targetUid);
      labelEls.forEach(el => el.textContent = 'Débloquer ce compte');
      showToast(`${targetName || 'Ce compte'} bloqué`, 'success');

      // Si on se suivait mutuellement, on annule la relation (ca n'a plus de sens)
      if (followingSet.has(targetUid)) {
        try {
          await db.collection('follows').doc(`${currentUser.uid}_${targetUid}`).delete();
          followingSet.delete(targetUid);
        } catch (e) { /* pas grave */ }
      }
      closeProfileModal();
    }
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  } finally {
    likeInFlight.delete(lockKey);
  }
}

async function loadBlockedSet() {
  if (!currentUser) { blockedSet = new Set(); return; }
  try {
    const snap = await db.collection('blocks').where('blockerUid', '==', currentUser.uid).get();
    blockedSet = new Set(snap.docs.map(d => d.data().blockedUid));
  } catch (e) {
    console.log('[blocks] chargement non bloquant :', e.message);
  }
}

// AVANT : followingSet n'etait charge que dans loadHomeFeed(), donc si
// quelqu'un allait directement dans Menu -> Mes abonnes sans etre passe
// par l'Accueil, l'etat "+ Suivre"/"Abonne" pouvait etre incorrect au
// premier affichage. Charge maintenant aussi a la connexion, comme
// blockedSet, pour etre toujours a jour peu importe le chemin emprunte.
async function loadFollowingSet() {
  if (!currentUser) { followingSet = new Set(); return; }
  try {
    const snap = await db.collection('follows').where('followerUid', '==', currentUser.uid).get();
    followingSet = new Set(snap.docs.map(d => d.data().followedUid));
  } catch (e) {
    console.log('[follows] chargement non bloquant :', e.message);
  }
}

/* ================= PROFIL PUBLIC (mini version) ================= */
async function openProfileModal(sellerUid, sellerName, sellerVerified) {
  const modal = document.getElementById('profile-modal');
  const body = document.getElementById('profile-modal-body');
  modal.classList.remove('hidden');
  body.innerHTML = renderFeedSkeletons(2);

  try {
    const isOwn = currentUser && currentUser.uid === sellerUid;
    const isFollowing = followingSet.has(sellerUid);

    // Pas d'orderBy ici (evite un nouvel index Firestore composite) :
    // on trie cote telephone, comme pour "Enregistres". Le filtre
    // status=='published' est fait ICI (pas juste apres coup) car les
    // regles Firestore refusent toute la requete si elle pourrait
    // retourner un brouillon d'un autre utilisateur -- il faut donc
    // que le filtre soit deja dans la requete elle-meme.
    const [pubsSnap, followersSnap] = await Promise.all([
      db.collection('publications')
        .where('sellerUid', '==', sellerUid)
        .where('status', '==', 'published')
        .limit(50).get(),
      db.collection('follows').where('followedUid', '==', sellerUid).get()
    ]);

    // Statut bloque -- isole dans son propre try/catch comme les autres
    // requetes secondaires de cette fiche (presence, etc.).
    let isBlocked = false;
    try {
      if (currentUser && !isOwn) {
        const blockDoc = await db.collection('blocks').doc(`${currentUser.uid}_${sellerUid}`).get();
        isBlocked = blockDoc.exists;
      }
    } catch (e) {
      console.log('[blocks] non bloquant :', e.message);
    }

    const posts = pubsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.type === 'post')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const followerCount = followersSnap.size;

    // Statut en ligne -- isole dans son propre try/catch (comme les autres
    // requetes secondaires de ce fichier) : si ca echoue, le profil s'affiche
    // quand meme, juste sans le badge "En ligne".
    let onlineStatusHtml = '';
    try {
      const presenceDoc = await db.collection('presence').doc(sellerUid).get();
      if (presenceDoc.exists) {
        const lastActive = new Date(presenceDoc.data().lastActiveAt);
        const minutesAgo = (Date.now() - lastActive.getTime()) / 60000;
        if (minutesAgo < 5) {
          onlineStatusHtml = `<p class="muted small" style="color:var(--green)"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:5px"></span>En ligne</p>`;
        } else {
          onlineStatusHtml = `<p class="muted small">Vu ${timeAgo(presenceDoc.data().lastActiveAt)}</p>`;
        }
      }
    } catch (e) {
      console.log('[presence] non bloquant :', e.message);
    }

    // Vrai etat like/enregistre pour chaque publication (comme loadHomeFeed),
    // pour que le coeur/signet refletent bien ce que l'utilisateur a deja fait.
    let likedMap = {};
    let savedMap = {};
    if (currentUser && posts.length > 0) {
      const [likeChecks, saveChecks] = await Promise.all([
        Promise.all(posts.map(p => db.collection('publication_likes').doc(`${p.id}_${currentUser.uid}`).get())),
        Promise.all(posts.map(p => db.collection('saved_items').doc(`${p.id}_${currentUser.uid}`).get()))
      ]);
      posts.forEach((p, i) => {
        likedMap[p.id] = likeChecks[i].exists;
        savedMap[p.id] = saveChecks[i].exists;
      });
    }

    const followBtnHtml = !isOwn ? `
      <button class="follow-btn ${isFollowing ? 'following' : ''}" data-follow-btn="${sellerUid}"
        onclick="toggleFollow('${sellerUid}','${escapeForJs(sellerName)}')" style="margin:14px 0 0 0">
        <span data-follow-label="${sellerUid}">${isFollowing ? 'Abonné' : '+ Suivre'}</span>
      </button>` : '';

    const blockLinkHtml = !isOwn ? `
      <p style="margin-top:8px">
        <span style="color:var(--muted);font-size:0.82rem;text-decoration:underline;cursor:pointer" data-block-label="${sellerUid}"
          onclick="toggleBlockAccount('${sellerUid}','${escapeForJs(sellerName)}')">
          ${isBlocked ? 'Débloquer ce compte' : 'Bloquer ce compte'}
        </span>
      </p>` : '';

    body.innerHTML = `
      <div style="text-align:center;padding:10px 0 18px">
        <div class="post-avatar" style="width:64px;height:64px;font-size:1.6rem;margin:0 auto 10px">${escapeHtml((sellerName || 'C')[0].toUpperCase())}</div>
        <h3 style="margin-bottom:4px">${escapeHtml(sellerName || 'Coeurnoh Universe')}${sellerVerified ? ' ✔️' : ''}</h3>
        ${onlineStatusHtml}
        <p class="muted small">${posts.length} publication${posts.length > 1 ? 's' : ''} · ${followerCount} abonné${followerCount > 1 ? 's' : ''}</p>
        ${followBtnHtml}
        ${blockLinkHtml}
      </div>
      <div id="profile-posts-list">
        ${posts.length === 0
          ? '<p class="muted small" style="text-align:center">Aucune publication pour l\'instant.</p>'
          : posts.map(p => renderPostCard(p, likedMap[p.id], savedMap[p.id], true)).join('')}
      </div>
    `;
    watchPostsCounts(posts.map(p => p.id));
  } catch (e) {
    body.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
}

/* ================= RECHERCHE DE COMPTES ================= */
// "users" est prive (donnees sensibles : email, solde...), impossible d'y
// chercher un nom directement. On construit donc la liste des comptes a
// partir des publications PUBLIQUES deja publiees (meme requete deja
// utilisee/indexee que la Boutique -- aucun nouvel index Firestore requis),
// mise en cache pour ne pas re-interroger a chaque lettre tapee.
let allSellersCache = null;
let accountSearchDebounce = null;

function searchAccounts(query) {
  clearTimeout(accountSearchDebounce);
  accountSearchDebounce = setTimeout(() => runAccountSearch(query.trim()), 250);
}

async function runAccountSearch(q) {
  const resultsEl = document.getElementById('account-search-results');
  if (!q) { resultsEl.classList.add('hidden'); resultsEl.innerHTML = ''; return; }

  resultsEl.classList.remove('hidden');

  if (!allSellersCache) {
    resultsEl.innerHTML = '<p class="muted small" style="padding:10px">Recherche...</p>';
    try {
      const snap = await db.collection('publications')
        .where('status', '==', 'published')
        .orderBy('createdAt', 'desc')
        .limit(300)
        .get();
      const sellersMap = {};
      snap.forEach(doc => {
        const d = doc.data();
        if (d.sellerUid && !sellersMap[d.sellerUid]) {
          sellersMap[d.sellerUid] = { uid: d.sellerUid, name: d.sellerName || 'Compte', verified: !!d.sellerVerified };
        }
      });
      allSellersCache = Object.values(sellersMap);
    } catch (e) {
      resultsEl.innerHTML = '<p class="muted small" style="padding:10px">Erreur de recherche.</p>';
      return;
    }
  }

  const qLower = q.toLowerCase();
  const matches = allSellersCache
    .filter(s => !blockedSet.has(s.uid))
    .filter(s => s.name.toLowerCase().includes(qLower))
    .slice(0, 15);

  resultsEl.innerHTML = matches.length === 0
    ? '<p class="muted small" style="padding:10px">Aucun compte trouvé.</p>'
    : matches.map(s => `
      <div class="account-search-row" onmousedown="selectAccountSearchResult('${s.uid}','${escapeForJs(s.name)}',${s.verified})">
        <div class="post-avatar" style="width:34px;height:34px;font-size:0.9rem;flex:0 0 auto">${escapeHtml(s.name[0].toUpperCase())}</div>
        <span>${escapeHtml(s.name)}${s.verified ? ' ✔️' : ''}</span>
      </div>
    `).join('');
}

function selectAccountSearchResult(uid, name, verified) {
  document.getElementById('account-search-input').value = '';
  document.getElementById('account-search-results').classList.add('hidden');
  openProfileModal(uid, name, verified);
}

/* ================= FICHES PROFESSIONNELLES =================
   Une fiche par personne (id du document = son propre uid), publique en
   lecture. Utilisees par le service "Pres de chez vous" (recherche +
   categories + ville) -- l'ancien ecran separe "Annuaire professionnel"
   faisait exactement la meme chose avec juste une recherche texte en moins
   les categories/ville, donc les deux ont ete fusionnes en un seul service
   pour ne pas avoir deux endroits qui montrent les memes fiches. */
let directoryCache = null;
let directoryIsEditingExisting = false;

async function updateDirectoryMyListingButton() {
  const labelEl = document.getElementById('directory-my-listing-label');
  if (!labelEl) return;
  if (!currentUser) { labelEl.textContent = 'Créer ma fiche professionnelle'; return; }
  try {
    const doc = await db.collection('directory_listings').doc(currentUser.uid).get();
    labelEl.textContent = doc.exists ? 'Modifier ma fiche professionnelle' : 'Créer ma fiche professionnelle';
  } catch (e) {
    console.log('[fiches pro] non bloquant :', e.message);
  }
}

// Charge les fiches professionnelles une seule fois et les met en cache
// (directoryCache), utilisees par "Pres de chez vous".
async function fetchAllListings(force) {
  if (directoryCache && !force) return directoryCache;
  const snap = await db.collection('directory_listings').limit(300).get();
  directoryCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return directoryCache;
}

function openDirectoryEditForm() {
  if (!currentUser) { openAuth('register'); return; }
  if (document.getElementById('directory-edit-modal')) return;

  db.collection('directory_listings').doc(currentUser.uid).get().then(doc => {
    const f = doc.exists ? doc.data() : {};
    directoryIsEditingExisting = doc.exists;
    const html = `
      <div class="modal-overlay" id="directory-edit-modal">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('directory-edit-modal').remove()" aria-label="Fermer">×</button>
          <h3 style="margin-bottom:14px">Ma fiche professionnelle</h3>
          <div class="field">
            <label for="directory-name">Nom ou nom de l'entreprise</label>
            <input type="text" id="directory-name" class="text-input" value="${escapeHtml(f.name || '')}" maxlength="80">
          </div>
          <div class="field">
            <label for="directory-profession">Métier</label>
            <input type="text" id="directory-profession" class="text-input" placeholder="ex: Mécanicien, Graphiste..." value="${escapeHtml(f.profession || '')}" maxlength="60">
          </div>
          <div class="field">
            <label for="directory-city">Ville</label>
            <input type="text" id="directory-city" class="text-input" value="${escapeHtml(f.city || '')}" maxlength="60">
          </div>
          <div class="field">
            <label for="directory-category">Catégorie (pour apparaître dans « Près de chez vous »)</label>
            <select id="directory-category" class="select-input">
              <option value="">— Choisir —</option>
              ${Object.entries(NEARBY_CATEGORY_LABELS).map(([val, label]) =>
                `<option value="${val}" ${f.category === val ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field">
            <label for="directory-phone">Téléphone WhatsApp</label>
            <input type="tel" id="directory-phone" class="text-input" placeholder="+243..." value="${escapeHtml(f.phone || '')}">
          </div>
          <div class="field">
            <label for="directory-desc">Description (facultatif)</label>
            <textarea id="directory-desc" class="text-input" rows="3" style="resize:vertical" maxlength="400">${escapeHtml(f.description || '')}</textarea>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 12px;padding-top:14px;border-top:1px solid var(--line)">
            <label class="field-label" style="margin:0">Accepter les réservations en ligne</label>
            <label class="switch"><input type="checkbox" id="directory-booking-enabled" ${f.bookingEnabled ? 'checked' : ''} onchange="toggleBookingConfigVisibility()"><span class="slider"></span></label>
          </div>

          <div id="directory-booking-config" class="${f.bookingEnabled ? '' : 'hidden'}">
            <label class="field-label" style="display:block">Jours de disponibilité</label>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">
              ${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => `
                <label style="display:flex;align-items:center;gap:5px;font-size:0.85rem">
                  <input type="checkbox" class="directory-booking-day" value="${i}" ${(f.bookingDays || []).includes(i) ? 'checked' : ''}> ${d}
                </label>`).join('')}
            </div>
            <div style="display:flex;gap:8px">
              <div class="field" style="flex:1">
                <label for="directory-booking-start">Ouverture</label>
                <input type="time" id="directory-booking-start" class="text-input" value="${escapeHtml(f.bookingStart || '08:00')}">
              </div>
              <div class="field" style="flex:1">
                <label for="directory-booking-end">Fermeture</label>
                <input type="time" id="directory-booking-end" class="text-input" value="${escapeHtml(f.bookingEnd || '17:00')}">
              </div>
            </div>
            <div class="field">
              <label for="directory-booking-duration">Durée de chaque créneau</label>
              <select id="directory-booking-duration" class="select-input">
                <option value="15" ${f.slotDuration === 15 ? 'selected' : ''}>15 minutes</option>
                <option value="30" ${!f.slotDuration || f.slotDuration === 30 ? 'selected' : ''}>30 minutes</option>
                <option value="45" ${f.slotDuration === 45 ? 'selected' : ''}>45 minutes</option>
                <option value="60" ${f.slotDuration === 60 ? 'selected' : ''}>1 heure</option>
              </select>
            </div>
            <label class="field-label" style="display:block">Services proposés (facultatif)</label>
            <div id="directory-service-rows"></div>
            <button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin:6px 0 4px" onclick="addDirectoryServiceRow()">+ Ajouter un service</button>
          </div>

          <button class="btn btn-primary" id="directory-save-btn" style="width:100%;justify-content:center;margin-top:14px" onclick="saveDirectoryListing()">Enregistrer</button>
          ${doc.exists ? `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-top:10px;color:var(--red);border-color:var(--red)" onclick="deleteDirectoryListing()">Supprimer ma fiche</button>` : ''}
          <p class="muted small" id="directory-form-msg" style="margin-top:6px"></p>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const existingServices = Array.isArray(f.services) && f.services.length > 0 ? f.services : [];
    existingServices.forEach(s => addDirectoryServiceRow(s));
  }).catch(e => showToast(friendlyErrorMessage(e), 'error'));
}

function toggleBookingConfigVisibility() {
  const enabled = document.getElementById('directory-booking-enabled').checked;
  document.getElementById('directory-booking-config').classList.toggle('hidden', !enabled);
}

function addDirectoryServiceRow(service) {
  const rowsEl = document.getElementById('directory-service-rows');
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <input type="text" class="text-input directory-service-name" placeholder="Nom du service" value="${escapeHtml(service ? service.name || '' : '')}" style="flex:2">
    <input type="text" class="text-input directory-service-price" placeholder="Prix (ex: 10$)" value="${escapeHtml(service ? service.price || '' : '')}" style="flex:1">
    <button type="button" class="invoice-row-remove" onclick="this.parentElement.remove()" aria-label="Retirer">×</button>`;
  rowsEl.appendChild(row);
}

async function saveDirectoryListing() {
  const btn = document.getElementById('directory-save-btn');
  const msgEl = document.getElementById('directory-form-msg');
  const name = document.getElementById('directory-name').value.trim();
  const profession = document.getElementById('directory-profession').value.trim();
  const city = document.getElementById('directory-city').value.trim();
  const category = document.getElementById('directory-category').value;
  const phone = document.getElementById('directory-phone').value.trim();
  const description = document.getElementById('directory-desc').value.trim();
  const bookingEnabled = document.getElementById('directory-booking-enabled').checked;
  const bookingDays = Array.from(document.querySelectorAll('.directory-booking-day:checked')).map(el => parseInt(el.value, 10));
  const bookingStart = document.getElementById('directory-booking-start').value;
  const bookingEnd = document.getElementById('directory-booking-end').value;
  const slotDuration = parseInt(document.getElementById('directory-booking-duration').value, 10);
  const services = Array.from(document.querySelectorAll('#directory-service-rows .invoice-item-row')).map(row => ({
    name: row.querySelector('.directory-service-name').value.trim(),
    price: row.querySelector('.directory-service-price').value.trim()
  })).filter(s => s.name);

  if (!name || !profession || !city || !phone) {
    msgEl.textContent = 'Merci de remplir au moins le nom, le métier, la ville et le téléphone.';
    return;
  }
  if (bookingEnabled && bookingDays.length === 0) {
    msgEl.textContent = 'Coche au moins un jour de disponibilité pour activer les réservations.';
    return;
  }
  if (bookingEnabled && bookingStart >= bookingEnd) {
    msgEl.textContent = "L'heure de fermeture doit être après l'heure d'ouverture.";
    return;
  }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  try {
    const payload = {
      ownerUid: currentUser.uid,
      name, profession, city, category: category || null, phone, description,
      bookingEnabled, bookingDays, bookingStart, bookingEnd, slotDuration, services,
      updatedAt: new Date().toISOString()
    };
    if (!directoryIsEditingExisting) payload.createdAt = new Date().toISOString();

    await db.collection('directory_listings').doc(currentUser.uid).set(payload, { merge: true });
    const modal = document.getElementById('directory-edit-modal');
    if (modal) modal.remove();
    directoryCache = null;
    showToast('Fiche enregistrée', 'success');
    updateDirectoryMyListingButton();
    loadNearbyListings();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

async function deleteDirectoryListing() {
  if (!confirm('Supprimer définitivement ta fiche professionnelle ?')) return;
  try {
    await db.collection('directory_listings').doc(currentUser.uid).delete();
    const modal = document.getElementById('directory-edit-modal');
    if (modal) modal.remove();
    directoryCache = null;
    showToast('Fiche supprimée', 'info');
    updateDirectoryMyListingButton();
    loadNearbyListings();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= FACTURES & REÇUS =================
   Une facture = un document dans "invoices", possede uniquement par son
   createur (ownerUid). La numerotation (FA-0001, FA-0002...) est garantie
   unique via un compteur dans "invoice_counters/{uid}", incremente dans
   une transaction Firestore -- uniquement a la creation, jamais modifie
   ensuite meme si la facture est editee ou supprimee. */
let invoicesCache = null;
let invoiceRowSeq = 0;
let invoiceEditingId = null;

function openInvoiceScreen() {
  if (!currentUser) { openAuth('login'); return; }
  showMenuScreen('invoices');
  loadInvoices();
}

async function loadInvoices() {
  const listEl = document.getElementById('invoice-list');
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    // Meme raison que pour "alerts" : pas d'orderBy pour eviter d'exiger
    // un index Firestore compose inexistant sur cette collection neuve.
    const snap = await db.collection('invoices')
      .where('ownerUid', '==', currentUser.uid)
      .limit(200)
      .get();
    invoicesCache = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderInvoiceList(invoicesCache);
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${escapeHtml(e.message)}</p>`;
  }
}

function renderInvoiceList(list) {
  const listEl = document.getElementById('invoice-list');

  if (!list || list.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucune facture pour l\'instant. Touche « Nouvelle facture » pour créer la première.</p>';
    return;
  }

  listEl.innerHTML = list.map(inv => {
    const dateLabel = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : '';
    const currency = inv.currency || 'USD';
    const total = (inv.total || 0).toFixed(2);
    return `
    <div class="order-box" style="margin-bottom:12px;cursor:pointer" onclick="viewInvoice('${inv.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <strong style="font-size:1.02rem">Facture ${escapeHtml(inv.number || '—')}</strong>
          <div class="shop-card-category" style="margin:4px 0">${escapeHtml(inv.clientName || 'Client')}</div>
        </div>
        <strong style="white-space:nowrap;margin-left:10px">${total} ${escapeHtml(currency)}</strong>
      </div>
      <div class="muted small" style="margin-top:6px">${escapeHtml(dateLabel)}</div>
    </div>`;
  }).join('');
}

/* ---- Formulaire de creation / modification ---- */

function openInvoiceForm(invoiceId) {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('invoice-form-modal')) return;

  invoiceEditingId = invoiceId || null;
  const existing = invoiceEditingId ? (invoicesCache || []).find(i => i.id === invoiceEditingId) : null;

  const html = `
    <div class="modal-overlay" id="invoice-form-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="closeInvoiceForm()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">${existing ? 'Modifier la facture ' + escapeHtml(existing.number || '') : 'Nouvelle facture'}</h3>

        <div class="field">
          <label for="inv-client-name">Nom du client</label>
          <input type="text" id="inv-client-name" class="text-input" maxlength="80" value="${existing ? escapeHtml(existing.clientName || '') : ''}">
        </div>
        <div class="field">
          <label for="inv-client-phone">Téléphone / WhatsApp (facultatif)</label>
          <input type="tel" id="inv-client-phone" class="text-input" placeholder="+243..." value="${existing ? escapeHtml(existing.clientPhone || '') : ''}">
        </div>
        <div class="field">
          <label for="inv-currency">Devise</label>
          <select id="inv-currency" class="select-input">
            <option value="USD" ${existing && existing.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
            <option value="CDF" ${existing && existing.currency === 'CDF' ? 'selected' : ''}>CDF (FC)</option>
          </select>
        </div>

        <label class="field-label" style="display:block">Articles / Services</label>
        <div id="invoice-items-rows"></div>
        <button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin:6px 0 14px" onclick="addInvoiceRow()">+ Ajouter une ligne</button>

        <div class="field">
          <label>Remise</label>
          <div style="display:flex;gap:8px">
            <select id="inv-discount-type" class="select-input" style="flex:1" onchange="recalcInvoiceTotals()">
              <option value="none" ${!existing || !existing.discountType || existing.discountType === 'none' ? 'selected' : ''}>Aucune</option>
              <option value="percent" ${existing && existing.discountType === 'percent' ? 'selected' : ''}>Pourcentage (%)</option>
              <option value="amount" ${existing && existing.discountType === 'amount' ? 'selected' : ''}>Montant fixe</option>
            </select>
            <input type="number" id="inv-discount-value" class="text-input" style="flex:1" placeholder="0" min="0" step="0.01" value="${existing ? (existing.discountValue || '') : ''}" oninput="recalcInvoiceTotals()">
          </div>
        </div>

        <div class="field">
          <label for="inv-notes">Note (facultatif)</label>
          <textarea id="inv-notes" class="text-input" rows="2" style="resize:vertical" maxlength="300">${existing ? escapeHtml(existing.notes || '') : ''}</textarea>
        </div>

        <div class="order-box" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:4px">
            <span class="muted">Sous-total</span><span id="inv-subtotal-display">0.00</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:4px">
            <span class="muted">Remise</span><span id="inv-discount-display">-0.00</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-weight:800;font-size:1.05rem;margin-top:6px;padding-top:6px;border-top:1px solid var(--line)">
            <span>Total</span><span id="inv-total-display">0.00</span>
          </div>
        </div>

        <button class="btn btn-primary" id="invoice-save-btn" style="width:100%;justify-content:center" onclick="saveInvoiceForm()">${existing ? 'Enregistrer les modifications' : 'Enregistrer la facture'}</button>
        <p class="muted small" id="invoice-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  if (existing && Array.isArray(existing.items) && existing.items.length > 0) {
    existing.items.forEach(it => addInvoiceRow(it));
  } else {
    addInvoiceRow();
  }
  recalcInvoiceTotals();
}

function closeInvoiceForm() {
  const modal = document.getElementById('invoice-form-modal');
  if (modal) modal.remove();
  invoiceEditingId = null;
}

function addInvoiceRow(item) {
  const rowId = 'row' + (++invoiceRowSeq);
  const rowsEl = document.getElementById('invoice-items-rows');
  const qtyVal = item && item.qty != null ? item.qty : 1;
  const priceVal = item && item.price != null ? item.price : '';
  const html = `
    <div class="invoice-item-row" data-row-id="${rowId}">
      <input type="text" class="text-input inv-item-desc" placeholder="Description" value="${item ? escapeHtml(item.desc || '') : ''}" oninput="recalcInvoiceTotals()">
      <input type="number" class="text-input inv-item-qty" placeholder="Qté" min="0" step="1" value="${qtyVal}" oninput="recalcInvoiceTotals()">
      <input type="number" class="text-input inv-item-price" placeholder="Prix" min="0" step="0.01" value="${priceVal}" oninput="recalcInvoiceTotals()">
      <button type="button" class="invoice-row-remove" onclick="removeInvoiceRow('${rowId}')" aria-label="Retirer la ligne">×</button>
    </div>`;
  rowsEl.insertAdjacentHTML('beforeend', html);
}

function removeInvoiceRow(rowId) {
  const rowsEl = document.getElementById('invoice-items-rows');
  const row = rowsEl.querySelector(`[data-row-id="${rowId}"]`);
  if (row) row.remove();
  // On garde toujours au moins une ligne visible pour ne pas bloquer la saisie
  if (rowsEl.children.length === 0) addInvoiceRow();
  recalcInvoiceTotals();
}

function readInvoiceItemsFromForm() {
  const rows = document.querySelectorAll('#invoice-items-rows .invoice-item-row');
  const items = [];
  rows.forEach(row => {
    const desc = row.querySelector('.inv-item-desc').value.trim();
    const qty = parseFloat(row.querySelector('.inv-item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.inv-item-price').value) || 0;
    if (desc && qty > 0) items.push({ desc, qty, price });
  });
  return items;
}

function recalcInvoiceTotals() {
  const items = readInvoiceItemsFromForm();
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);

  const discountType = document.getElementById('inv-discount-type').value;
  const discountValueRaw = parseFloat(document.getElementById('inv-discount-value').value) || 0;
  let discountAmount = 0;
  if (discountType === 'percent') discountAmount = subtotal * (discountValueRaw / 100);
  else if (discountType === 'amount') discountAmount = discountValueRaw;
  discountAmount = Math.min(discountAmount, subtotal);

  const total = subtotal - discountAmount;

  document.getElementById('inv-subtotal-display').textContent = subtotal.toFixed(2);
  document.getElementById('inv-discount-display').textContent = '-' + discountAmount.toFixed(2);
  document.getElementById('inv-total-display').textContent = total.toFixed(2);

  return { subtotal, discountAmount, total };
}

async function saveInvoiceForm() {
  const btn = document.getElementById('invoice-save-btn');
  const msgEl = document.getElementById('invoice-form-msg');
  const clientName = document.getElementById('inv-client-name').value.trim();
  const clientPhone = document.getElementById('inv-client-phone').value.trim();
  const currency = document.getElementById('inv-currency').value;
  const discountType = document.getElementById('inv-discount-type').value;
  const discountValue = parseFloat(document.getElementById('inv-discount-value').value) || 0;
  const notes = document.getElementById('inv-notes').value.trim();
  const items = readInvoiceItemsFromForm();

  if (!clientName) { msgEl.textContent = "Merci d'indiquer le nom du client."; return; }
  if (items.length === 0) { msgEl.textContent = 'Ajoute au moins un article ou service avec une quantité.'; return; }

  const { subtotal, discountAmount, total } = recalcInvoiceTotals();

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  msgEl.textContent = '';

  const payload = {
    ownerUid: currentUser.uid,
    clientName, clientPhone, currency,
    items, discountType, discountValue,
    subtotal, discountAmount, total, notes,
    updatedAt: new Date().toISOString()
  };

  try {
    if (invoiceEditingId) {
      await db.collection('invoices').doc(invoiceEditingId).update(payload);
    } else {
      payload.createdAt = new Date().toISOString();
      const counterRef = db.collection('invoice_counters').doc(currentUser.uid);
      const invRef = db.collection('invoices').doc();
      await db.runTransaction(async tx => {
        const counterDoc = await tx.get(counterRef);
        const next = (counterDoc.exists ? (counterDoc.data().count || 0) : 0) + 1;
        payload.number = 'FA-' + String(next).padStart(4, '0');
        tx.set(counterRef, { count: next }, { merge: true });
        tx.set(invRef, payload);
      });
    }
    closeInvoiceForm();
    invoicesCache = null;
    showToast(invoiceEditingId ? 'Facture modifiée' : 'Facture créée', 'success');
    loadInvoices();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = invoiceEditingId ? 'Enregistrer les modifications' : 'Enregistrer la facture';
  }
}

/* ---- Consultation / impression / suppression ---- */

async function viewInvoice(invoiceId) {
  let inv = (invoicesCache || []).find(i => i.id === invoiceId);
  if (!inv) {
    try {
      const doc = await db.collection('invoices').doc(invoiceId).get();
      if (!doc.exists) { showToast('Facture introuvable', 'error'); return; }
      inv = { id: doc.id, ...doc.data() };
    } catch (e) {
      showToast(friendlyErrorMessage(e), 'error');
      return;
    }
  }
  if (document.getElementById('invoice-view-modal')) return;

  const dateLabel = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : '';
  const currency = inv.currency || 'USD';
  const itemsHtml = (inv.items || []).map(it => `
    <div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:0.88rem">
      <span style="flex:1">${escapeHtml(it.desc)}<br><span class="muted small">${it.qty} × ${(it.price || 0).toFixed(2)}</span></span>
      <strong>${(it.qty * it.price).toFixed(2)}</strong>
    </div>`).join('');

  const html = `
    <div class="modal-overlay" id="invoice-view-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('invoice-view-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:4px">Facture ${escapeHtml(inv.number || '')}</h3>
        <p class="muted small" style="margin-bottom:14px">${escapeHtml(dateLabel)}</p>

        <p style="margin-bottom:4px"><strong>${escapeHtml(inv.clientName || 'Client')}</strong></p>
        ${inv.clientPhone ? `<p class="muted small" style="margin-bottom:14px">${escapeHtml(inv.clientPhone)}</p>` : '<div style="margin-bottom:14px"></div>'}

        <div style="margin-bottom:10px">${itemsHtml}</div>

        <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:4px">
          <span class="muted">Sous-total</span><span>${(inv.subtotal || 0).toFixed(2)} ${escapeHtml(currency)}</span>
        </div>
        ${inv.discountAmount ? `<div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:4px">
          <span class="muted">Remise</span><span>-${(inv.discountAmount || 0).toFixed(2)} ${escapeHtml(currency)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:1.05rem;margin-top:6px;padding-top:6px;border-top:1px solid var(--line);margin-bottom:16px">
          <span>Total</span><span>${(inv.total || 0).toFixed(2)} ${escapeHtml(currency)}</span>
        </div>
        ${inv.notes ? `<p class="muted small" style="margin-bottom:16px">${escapeHtml(inv.notes)}</p>` : ''}

        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:10px" onclick="printInvoice('${inv.id}')">Imprimer / Télécharger PDF</button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:10px" onclick="document.getElementById('invoice-view-modal').remove();openInvoiceForm('${inv.id}')">Modifier</button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;color:var(--red);border-color:var(--red)" onclick="deleteInvoiceConfirm('${inv.id}')">Supprimer</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function printInvoice(invoiceId) {
  const inv = (invoicesCache || []).find(i => i.id === invoiceId);
  if (!inv) return;
  const currency = inv.currency || 'USD';
  const dateLabel = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : '';
  const rowsHtml = (inv.items || []).map(it => `
    <tr>
      <td style="padding:6px 4px">${escapeHtml(it.desc)}</td>
      <td style="padding:6px 4px;text-align:center">${it.qty}</td>
      <td style="padding:6px 4px;text-align:right">${(it.price || 0).toFixed(2)}</td>
      <td style="padding:6px 4px;text-align:right">${(it.qty * it.price).toFixed(2)}</td>
    </tr>`).join('');

  const sheetHtml = `
    <div style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;color:#161a1f">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          <h1 style="font-size:1.4rem;margin:0 0 4px;color:#0e6b45">CoeurNoh Business</h1>
          <p style="margin:0;font-size:0.85rem;color:#5b6472">Facture ${escapeHtml(inv.number || '')}</p>
        </div>
        <div style="text-align:right;font-size:0.85rem;color:#5b6472">${escapeHtml(dateLabel)}</div>
      </div>
      <div style="margin-bottom:20px">
        <p style="margin:0;font-size:0.8rem;color:#5b6472">Facturé à</p>
        <p style="margin:2px 0 0;font-weight:700">${escapeHtml(inv.clientName || 'Client')}</p>
        ${inv.clientPhone ? `<p style="margin:2px 0 0;font-size:0.85rem;color:#5b6472">${escapeHtml(inv.clientPhone)}</p>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr style="border-bottom:2px solid #161a1f;font-size:0.8rem;text-align:left">
            <th style="padding:6px 4px">Description</th>
            <th style="padding:6px 4px;text-align:center">Qté</th>
            <th style="padding:6px 4px;text-align:right">Prix</th>
            <th style="padding:6px 4px;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody style="font-size:0.88rem">${rowsHtml}</tbody>
      </table>
      <div style="width:220px;margin-left:auto;font-size:0.9rem">
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Sous-total</span><span>${(inv.subtotal || 0).toFixed(2)} ${escapeHtml(currency)}</span></div>
        ${inv.discountAmount ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>Remise</span><span>-${(inv.discountAmount || 0).toFixed(2)} ${escapeHtml(currency)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #161a1f;font-weight:800;font-size:1.05rem"><span>Total</span><span>${(inv.total || 0).toFixed(2)} ${escapeHtml(currency)}</span></div>
      </div>
      ${inv.notes ? `<p style="margin-top:24px;font-size:0.85rem;color:#5b6472">${escapeHtml(inv.notes)}</p>` : ''}
    </div>`;

  document.getElementById('invoice-print-sheet').innerHTML = sheetHtml;
  window.print();
}

async function deleteInvoiceConfirm(invoiceId) {
  if (!confirm('Supprimer définitivement cette facture ?')) return;
  try {
    await db.collection('invoices').doc(invoiceId).delete();
    const viewModal = document.getElementById('invoice-view-modal');
    if (viewModal) viewModal.remove();
    invoicesCache = null;
    showToast('Facture supprimée', 'info');
    loadInvoices();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= COEURNOH ALERTES =================
   Une alerte = une recherche enregistree par l'utilisateur (mot-cle +
   filtres optionnels prix max / categorie), stockee dans "alerts". Quand un
   vendeur publie un nouveau produit (voir publishSellItem plus haut), on
   verifie cote client les alertes actives de TOUS les utilisateurs qui
   matchent ce produit, et on notifie chaque proprietaire concerne (creation
   d'un document "notifications" + push reel via notifyUserPush, exactement
   comme pour les likes/commentaires). Pas de nouvelle infrastructure
   serveur : on reutilise le systeme de notifications deja en place. */
let alertsCache = null;

function openAlertsScreen() {
  if (!currentUser) { openAuth('login'); return; }
  showMenuScreen('alerts');
  loadAlerts();
}

async function loadAlerts() {
  const listEl = document.getElementById('alerts-list');
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    // Pas d'orderBy ici : "alerts" est une collection neuve sans index
    // compose pour (ownerUid, createdAt) -- Firestore refuserait la
    // requete entiere. Tri fait cote telephone a la place.
    const snap = await db.collection('alerts')
      .where('ownerUid', '==', currentUser.uid)
      .get();
    alertsCache = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderAlertsList(alertsCache);
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${escapeHtml(e.message)}</p>`;
  }
}

const ALERT_CATEGORY_LABELS = {
  all: 'Toutes catégories', ebooks: '📚 Livres & Ebooks', beaute: '💄 Beauté & Bien-être',
  mode: '👗 Mode & Accessoires', electronique: '🔌 Électronique', maison: '🏠 Maison & Déco', autres: '📦 Autres'
};

function renderAlertsList(list) {
  const listEl = document.getElementById('alerts-list');

  if (!list || list.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucune alerte enregistrée. Touche « Nouvelle alerte » pour créer la première.</p>';
    return;
  }

  listEl.innerHTML = list.map(a => {
    const parts = [];
    if (a.maxPrice) parts.push(`moins de ${a.maxPrice}$`);
    if (a.category && a.category !== 'all') parts.push(ALERT_CATEGORY_LABELS[a.category] || a.category);
    const sub = parts.length ? parts.join(' · ') : 'Toutes catégories, tous prix';
    return `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="min-width:0">
          <strong style="font-size:1.02rem;word-break:break-word">${escapeHtml(a.keyword)}</strong>
          <div class="muted small" style="margin-top:4px">${escapeHtml(sub)}</div>
        </div>
        <label class="switch" style="margin-top:2px">
          <input type="checkbox" ${a.active !== false ? 'checked' : ''} onchange="toggleAlertActive('${a.id}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:12px;color:var(--red);border-color:var(--red)" onclick="deleteAlertConfirm('${a.id}')">Supprimer</button>
    </div>`;
  }).join('');
}

function openAlertForm() {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('alert-form-modal')) return;

  const html = `
    <div class="modal-overlay" id="alert-form-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('alert-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">Nouvelle alerte</h3>

        <div class="field">
          <label for="alert-keyword">Mot-clé (ex: iPhone 13)</label>
          <input type="text" id="alert-keyword" class="text-input" maxlength="80" placeholder="Ce que tu recherches">
        </div>
        <div class="field">
          <label for="alert-maxprice">Prix maximum en $ (facultatif)</label>
          <input type="number" id="alert-maxprice" class="text-input" min="0" step="0.01" placeholder="Aucune limite">
        </div>
        <div class="field">
          <label for="alert-category">Catégorie (facultatif)</label>
          <select id="alert-category" class="select-input">
            <option value="all">Toutes catégories</option>
            <option value="ebooks">📚 Livres & Ebooks</option>
            <option value="beaute">💄 Beauté & Bien-être</option>
            <option value="mode">👗 Mode & Accessoires</option>
            <option value="electronique">🔌 Électronique</option>
            <option value="maison">🏠 Maison & Déco</option>
            <option value="autres">📦 Autres</option>
          </select>
        </div>

        <button class="btn btn-primary" id="alert-save-btn" style="width:100%;justify-content:center;margin-top:4px" onclick="saveAlert()">Créer l'alerte</button>
        <p class="muted small" id="alert-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveAlert() {
  const btn = document.getElementById('alert-save-btn');
  const msgEl = document.getElementById('alert-form-msg');
  const keyword = document.getElementById('alert-keyword').value.trim();
  const maxPriceRaw = document.getElementById('alert-maxprice').value;
  const maxPrice = maxPriceRaw ? parseFloat(maxPriceRaw) : null;
  const category = document.getElementById('alert-category').value;

  if (!keyword) { msgEl.textContent = 'Merci d\'indiquer un mot-clé.'; return; }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Création...';
  try {
    await db.collection('alerts').add({
      ownerUid: currentUser.uid,
      keyword,
      keywordLower: keyword.toLowerCase(),
      maxPrice: (maxPrice && maxPrice > 0) ? maxPrice : null,
      category: category === 'all' ? null : category,
      active: true,
      createdAt: new Date().toISOString()
    });
    document.getElementById('alert-form-modal').remove();
    alertsCache = null;
    showToast('Alerte créée', 'success');
    loadAlerts();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = "Créer l'alerte";
  }
}

async function toggleAlertActive(alertId, active) {
  try {
    await db.collection('alerts').doc(alertId).update({ active });
    alertsCache = null;
    showToast(active ? 'Alerte activée' : 'Alerte mise en pause', 'info');
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
    loadAlerts(); // resynchronise l'affichage si la mise a jour a echoue
  }
}

async function deleteAlertConfirm(alertId) {
  if (!confirm('Supprimer définitivement cette alerte ?')) return;
  try {
    await db.collection('alerts').doc(alertId).delete();
    alertsCache = null;
    showToast('Alerte supprimée', 'info');
    loadAlerts();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

// Verifie les alertes actives de tous les utilisateurs contre un nouveau
// produit, et notifie (Firestore + push) chaque proprietaire concerne.
// Plafonne a 500 alertes actives par appel : largement suffisant pour le
// volume actuel, a revoir seulement si l'app grossit enormement.
async function checkAlertsForNewProduct(product) {
  const snap = await db.collection('alerts').where('active', '==', true).limit(500).get();
  if (snap.empty) return;

  const haystack = `${product.title || ''} ${product.description || ''}`.toLowerCase();
  const matches = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => {
      if (a.ownerUid === currentUser.uid) return false; // pas de notif a soi-meme
      if (!haystack.includes((a.keywordLower || a.keyword || '').toLowerCase())) return false;
      if (a.maxPrice && product.price > a.maxPrice) return false;
      if (a.category && a.category !== product.category) return false;
      return true;
    });

  for (const alert of matches) {
    const title = 'Une annonce correspond à ton alerte 🔔';
    const body = `« ${alert.keyword} » — ${product.title} à ${(product.price || 0).toFixed(2)}$`;
    try {
      await db.collection('notifications').add({
        uid: alert.ownerUid, title, body, type: 'alert_match',
        url: '/?open=' + product.id, read: false, createdAt: new Date().toISOString()
      });
      notifyUserPush(alert.ownerUid, title, body, 'activity', '/?open=' + product.id);
    } catch (e) { /* une alerte en echec ne doit pas bloquer les autres */ }
  }
}

/* ================= PRES DE CHEZ VOUS =================
   Service unique de decouverte des fiches professionnelles -- fusionne
   avec l'ancien ecran separe "Annuaire professionnel" (qui affichait les
   memes fiches avec juste une recherche texte, sans categories ni ville).
   Desormais un seul endroit : recherche libre (metier, nom, ville) +
   filtre categorie (restaurants, coiffeurs, mecaniciens...), sur les memes
   fiches "directory_listings" mises en cache par fetchAllListings(). */
const NEARBY_CATEGORY_LABELS = {
  restaurants: 'Restaurants', coiffeurs: 'Coiffeurs', mecaniciens: 'Mécaniciens',
  photographes: 'Photographes', informaticiens: 'Informaticiens', boutiques: 'Boutiques',
  professionnels: 'Professionnels', evenements: 'Événements', services: 'Services'
};
let nearbySelectedCategory = '';
let nearbySearchDebounce = null;

function openNearbyScreen() {
  showMenuScreen('nearby');
  updateDirectoryMyListingButton();
  loadNearbyListings();
}

async function loadNearbyListings() {
  const resultsEl = document.getElementById('nearby-results');
  resultsEl.innerHTML = renderFeedSkeletons(2);
  try {
    // Force toujours des donnees a jour en entrant sur l'ecran : une fiche
    // fraichement creee/modifiee doit apparaitre immediatement.
    await fetchAllListings(true);
    runNearbyFilter();
  } catch (e) {
    resultsEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function setNearbyCategory(cat) {
  nearbySelectedCategory = cat;
  document.querySelectorAll('#nearby-category-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
  runNearbyFilter();
}

function scheduleNearbySearch() {
  clearTimeout(nearbySearchDebounce);
  nearbySearchDebounce = setTimeout(runNearbyFilter, 250);
}

function runNearbyFilter() {
  if (!directoryCache) return; // encore en train de charger
  const query = document.getElementById('nearby-search-input').value.trim().toLowerCase();

  const matches = directoryCache.filter(f => {
    if (nearbySelectedCategory && f.category !== nearbySelectedCategory) return false;
    if (query) {
      const haystack = `${f.profession || ''} ${f.name || ''} ${f.city || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  renderNearbyResults(matches);
}

function renderNearbyResults(list) {
  const resultsEl = document.getElementById('nearby-results');
  const visible = list.filter(f => !blockedSet.has(f.ownerUid));

  if (visible.length === 0) {
    resultsEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucun résultat pour l\'instant. Élargis ta recherche, ou sois le premier à créer ta fiche.</p>';
    return;
  }

  resultsEl.innerHTML = visible.map(f => {
    const waLink = f.phone ? `https://wa.me/${f.phone.replace(/\D/g, '')}` : null;
    const catLabel = f.category ? NEARBY_CATEGORY_LABELS[f.category] : null;
    return `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(f.name || 'Professionnel')}</strong>
        ${catLabel ? `<span class="shop-card-category" style="white-space:nowrap">${catLabel}</span>` : ''}
      </div>
      <div class="muted small" style="margin:4px 0">${escapeHtml(f.profession || '—')}</div>
      ${f.city ? `<div class="muted small" style="margin-bottom:8px">${escapeHtml(f.city)}</div>` : ''}
      ${f.description ? `<p class="muted small" style="margin-bottom:10px">${escapeHtml(f.description)}</p>` : ''}
      ${waLink ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(waLink)}" target="_blank">${ICON_WHATSAPP} Contacter</a>` : ''}
    </div>`;
  }).join('');
}

/* ================= CONCOURS & RECOMPENSES =================
   "contests" (cree par l'admin uniquement, comme le panneau d'annonces) --
   "contest_entries" (une participation = un document, liee a un concours et
   un utilisateur) -- "contest_votes" (un document par vote, id deterministe
   "{contestId}_{entryId}_{uid}" pour empecher tout double-vote sans avoir a
   interroger toute la collection a chaque clic).
   Le statut (a-venir / en-cours / termine) n'est jamais stocke : il est
   toujours recalcule a partir des dates de debut/fin, pour ne jamais avoir
   un concours "bloque" sur un mauvais statut.
   Concours PAYANTS : le modele de donnees (type, entryFee) est deja en
   place, mais le debit reel du portefeuille n'est volontairement pas
   branche tant que je n'ai pas vu le code exact de la fonction serveur qui
   gere deja les paiements par solde (ex: shop-purchase.js) -- pour reutiliser
   exactement la meme logique securisee plutot que d'en inventer une
   deuxieme en parallele qui risquerait un bug de solde. En attendant, la
   participation a un concours payant affiche clairement l'information au
   lieu de faire semblant que ca fonctionne. */
const CONTEST_CATEGORY_META = {
  createur:     { label: 'Meilleur créateur',      icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  entrepreneur: { label: 'Meilleur entrepreneur',   icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
  talent:       { label: 'Talent de la semaine',    icon: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>' },
  photo:        { label: 'Meilleure photo',         icon: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>' },
  video:        { label: 'Meilleure vidéo',         icon: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2" ry="2"/>' },
  vendeur:      { label: 'Meilleur vendeur',        icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
  entreprise:   { label: "Concours d'entreprise",   icon: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M14 9h1"/><path d="M14 13h1"/><path d="M9 21v-4h6v4"/>' }
};
const CONTEST_TROPHY_ICON = '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/>';
const CONTEST_VOTE_ICON = '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>';

function contestIconSvg(pathHtml, size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathHtml}</svg>`;
}

let contestsCache = null;
let contestStatusFilter = 'active';
let contestEntriesCache = {}; // { [contestId]: [entries] }
let contestMyVotesCache = null; // Set des "entryId" deja votes par l'utilisateur courant

function computeContestStatus(c) {
  const now = Date.now();
  const start = c.startDate ? new Date(c.startDate).getTime() : 0;
  const end = c.endDate ? new Date(c.endDate).getTime() : Infinity;
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

function openContestsScreen() {
  showMenuScreen('contests');
  document.getElementById('contest-create-btn').classList.toggle('hidden', !currentUser || currentUser.uid !== ADMIN_UID);
  loadContests();
}

async function loadContests() {
  const listEl = document.getElementById('contests-list');
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('contests').orderBy('startDate', 'desc').limit(100).get();
    contestsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderContestsList();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${escapeHtml(e.message)}</p>`;
  }
}

function setContestStatusFilter(status) {
  contestStatusFilter = status;
  document.querySelectorAll('#contest-status-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderContestsList();
}

function renderContestsList() {
  const listEl = document.getElementById('contests-list');
  if (!contestsCache) return;

  const filtered = contestsCache.filter(c => computeContestStatus(c) === contestStatusFilter);

  if (filtered.length === 0) {
    const msg = contestStatusFilter === 'active' ? 'Aucun concours en cours pour le moment.' :
      contestStatusFilter === 'upcoming' ? 'Aucun concours à venir pour le moment.' :
      'Aucun concours terminé pour le moment.';
    listEl.innerHTML = `<p class="muted small" style="text-align:center;padding:20px 0">${msg}</p>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => {
    const meta = CONTEST_CATEGORY_META[c.category] || { label: c.category || 'Concours', icon: CONTEST_TROPHY_ICON };
    const dateRange = c.startDate && c.endDate
      ? `${new Date(c.startDate).toLocaleDateString('fr-FR')} — ${new Date(c.endDate).toLocaleDateString('fr-FR')}`
      : '';
    const feeBadge = c.type === 'paid'
      ? `<span class="shop-card-category" style="background:#fdecea;color:#c3183f">Payant · ${(c.entryFee || 0).toFixed(2)}$</span>`
      : `<span class="shop-card-category">Gratuit</span>`;
    return `
    <div class="order-box" style="margin-bottom:12px;cursor:pointer" onclick="viewContest('${c.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="min-width:0">
          <div class="muted small" style="display:flex;align-items:center;gap:6px;margin-bottom:4px">${contestIconSvg(meta.icon)} ${escapeHtml(meta.label)}</div>
          <strong style="font-size:1.02rem;word-break:break-word">${escapeHtml(c.title || 'Concours')}</strong>
        </div>
        ${feeBadge}
      </div>
      ${dateRange ? `<div class="muted small" style="margin-top:8px">${escapeHtml(dateRange)}</div>` : ''}
      ${c.prize ? `<div class="muted small" style="margin-top:4px">Récompense : ${escapeHtml(c.prize)}</div>` : ''}
    </div>`;
  }).join('');
}

/* ---- Creation d'un concours (admin uniquement) ---- */

function openContestForm() {
  if (!currentUser || currentUser.uid !== ADMIN_UID) return;
  if (document.getElementById('contest-form-modal')) return;

  const catOptions = Object.entries(CONTEST_CATEGORY_META)
    .map(([val, meta]) => `<option value="${val}">${escapeHtml(meta.label)}</option>`).join('');

  const html = `
    <div class="modal-overlay" id="contest-form-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('contest-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">Nouveau concours</h3>

        <div class="field">
          <label for="contest-title">Titre du concours</label>
          <input type="text" id="contest-title" class="text-input" maxlength="100">
        </div>
        <div class="field">
          <label for="contest-category">Catégorie</label>
          <select id="contest-category" class="select-input">${catOptions}</select>
        </div>
        <div class="field">
          <label for="contest-description">Règlement / description</label>
          <textarea id="contest-description" class="text-input" rows="3" style="resize:vertical" maxlength="600"></textarea>
        </div>
        <div class="field">
          <label for="contest-prize">Récompense</label>
          <input type="text" id="contest-prize" class="text-input" placeholder="ex: 50$ + mise en avant sur la page d'accueil" maxlength="120">
        </div>
        <div class="field">
          <label>Dates</label>
          <div style="display:flex;gap:8px">
            <input type="date" id="contest-start" class="text-input" style="flex:1">
            <input type="date" id="contest-end" class="text-input" style="flex:1">
          </div>
        </div>
        <div class="field">
          <label>Type de concours</label>
          <div style="display:flex;gap:8px">
            <select id="contest-type" class="select-input" style="flex:1" onchange="document.getElementById('contest-fee').classList.toggle('hidden', this.value !== 'paid')">
              <option value="free">Gratuit</option>
              <option value="paid">Payant</option>
            </select>
            <input type="number" id="contest-fee" class="text-input hidden" style="flex:1" placeholder="Frais en $" min="0" step="0.01">
          </div>
        </div>
        <div class="field">
          <label for="contest-cover">Image de couverture — lien (facultatif)</label>
          <input type="url" id="contest-cover" class="text-input" placeholder="https://...">
        </div>

        <button class="btn btn-primary" id="contest-save-btn" style="width:100%;justify-content:center;margin-top:4px" onclick="saveContestForm()">Publier le concours</button>
        <p class="muted small" id="contest-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveContestForm() {
  const btn = document.getElementById('contest-save-btn');
  const msgEl = document.getElementById('contest-form-msg');
  const title = document.getElementById('contest-title').value.trim();
  const category = document.getElementById('contest-category').value;
  const description = document.getElementById('contest-description').value.trim();
  const prize = document.getElementById('contest-prize').value.trim();
  const startDate = document.getElementById('contest-start').value;
  const endDate = document.getElementById('contest-end').value;
  const type = document.getElementById('contest-type').value;
  const entryFee = parseFloat(document.getElementById('contest-fee').value) || 0;
  const coverImage = document.getElementById('contest-cover').value.trim();

  if (!title || !startDate || !endDate) {
    msgEl.textContent = 'Merci de remplir au moins le titre et les deux dates.';
    return;
  }
  if (new Date(endDate) < new Date(startDate)) {
    msgEl.textContent = 'La date de fin doit être après la date de début.';
    return;
  }
  if (type === 'paid' && entryFee <= 0) {
    msgEl.textContent = 'Indique des frais de participation supérieurs à 0 pour un concours payant.';
    return;
  }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Publication...';
  try {
    await db.collection('contests').add({
      title, category, description, prize,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate + 'T23:59:59').toISOString(),
      type, entryFee: type === 'paid' ? entryFee : 0,
      coverImage: coverImage || null,
      organizerUid: currentUser.uid,
      createdAt: new Date().toISOString()
    });
    document.getElementById('contest-form-modal').remove();
    contestsCache = null;
    showToast('Concours publié', 'success');
    loadContests();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Publier le concours';
  }
}

/* ---- Detail d'un concours + participations + votes ---- */

async function viewContest(contestId) {
  const c = (contestsCache || []).find(x => x.id === contestId);
  if (!c) return;
  if (document.getElementById('contest-view-modal')) return;

  const meta = CONTEST_CATEGORY_META[c.category] || { label: c.category || 'Concours', icon: CONTEST_TROPHY_ICON };
  const status = computeContestStatus(c);
  const dateRange = `${new Date(c.startDate).toLocaleDateString('fr-FR')} — ${new Date(c.endDate).toLocaleDateString('fr-FR')}`;

  let participateHtml;
  if (status === 'ended') {
    participateHtml = '';
  } else if (!currentUser) {
    participateHtml = `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:14px" onclick="openAuth('login')">Se connecter pour participer</button>`;
  } else if (c.type === 'paid') {
    participateHtml = `<button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:14px" onclick="openContestEntryForm('${c.id}', true, ${c.entryFee || 0})">Participer — ${(c.entryFee || 0).toFixed(2)}$</button>`;
  } else {
    participateHtml = `<button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:14px" onclick="openContestEntryForm('${c.id}', false, 0)">Participer</button>`;
  }

  const html = `
    <div class="modal-overlay" id="contest-view-modal">
      <div class="modal" style="max-width:480px">
        <button class="modal-close" onclick="document.getElementById('contest-view-modal').remove()" aria-label="Fermer">×</button>
        <div class="muted small" style="display:flex;align-items:center;gap:6px;margin-bottom:4px">${contestIconSvg(meta.icon)} ${escapeHtml(meta.label)}</div>
        <h3 style="margin-bottom:4px">${escapeHtml(c.title)}</h3>
        <p class="muted small" style="margin-bottom:12px">${escapeHtml(dateRange)}</p>
        ${c.description ? `<p class="small" style="margin-bottom:10px">${escapeHtml(c.description)}</p>` : ''}
        ${c.prize ? `<p class="small" style="margin-bottom:14px"><strong>Récompense :</strong> ${escapeHtml(c.prize)}</p>` : ''}

        ${participateHtml}

        <h4 style="margin-bottom:10px;font-size:0.95rem">Participants</h4>
        <div id="contest-entries-list-${c.id}"><p class="muted small">Chargement...</p></div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  loadContestEntries(c.id, status);
}

async function loadContestEntries(contestId, status) {
  const listEl = document.getElementById(`contest-entries-list-${contestId}`);
  try {
    // Meme raison que pour "alerts"/"invoices" : "contest_entries" est
    // une collection neuve sans index compose pour (contestId, votesCount).
    const snap = await db.collection('contest_entries')
      .where('contestId', '==', contestId)
      .limit(100)
      .get();
    const entries = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
    contestEntriesCache[contestId] = entries;

    if (currentUser && !contestMyVotesCache) {
      // Charge une seule fois par session tous mes votes existants (id
      // deterministe "{contestId}_{entryId}_{uid}") pour savoir quels
      // boutons "Voter" desactiver, sans requete supplementaire par entree.
      contestMyVotesCache = new Set();
    }

    renderContestEntries(contestId, entries, status);
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${escapeHtml(e.message)}</p>`;
  }
}

function renderContestEntries(contestId, entries, status) {
  const listEl = document.getElementById(`contest-entries-list-${contestId}`);
  if (!listEl) return;

  if (entries.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:14px 0">Aucun participant pour l\'instant.</p>';
    return;
  }

  listEl.innerHTML = entries.map((e, i) => {
    const rank = i + 1;
    const voteKey = `${contestId}_${e.id}_${currentUser ? currentUser.uid : ''}`;
    const alreadyVoted = currentUser && contestMyVotesCache && contestMyVotesCache.has(voteKey);
    const isWinner = status === 'ended' && rank === 1;
    const canVote = currentUser && status === 'active' && e.uid !== currentUser.uid;

    return `
    <div class="order-box" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">
          ${isWinner ? contestIconSvg(CONTEST_TROPHY_ICON, 18) : `<span class="muted small" style="min-width:20px">#${rank}</span>`}
          <strong style="word-break:break-word">${escapeHtml(e.name || 'Participant')}</strong>
        </div>
        <span class="muted small" style="white-space:nowrap">${e.votesCount || 0} vote${(e.votesCount || 0) > 1 ? 's' : ''}</span>
      </div>
      ${e.caption ? `<p class="muted small" style="margin-top:6px">${escapeHtml(e.caption)}</p>` : ''}
      ${e.submissionUrl ? `<a href="${escapeHtml(e.submissionUrl)}" target="_blank" class="btn btn-outline btn-sm" style="margin-top:8px">Voir la participation</a>` : ''}
      ${canVote ? `<button class="btn ${alreadyVoted ? 'btn-outline' : 'btn-primary'} btn-sm" style="margin-top:8px;margin-left:8px" ${alreadyVoted ? 'disabled' : ''} onclick="voteForEntry('${contestId}', '${e.id}')">${contestIconSvg(CONTEST_VOTE_ICON, 14)} ${alreadyVoted ? 'Voté' : 'Voter'}</button>` : ''}
    </div>`;
  }).join('');
}

function openContestEntryForm(contestId, isPaid, entryFee) {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('contest-entry-modal')) return;

  const html = `
    <div class="modal-overlay" id="contest-entry-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('contest-entry-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">Participer au concours</h3>
        ${isPaid ? `<p class="muted small" style="margin-bottom:14px">Frais de participation : <strong>${entryFee.toFixed(2)}$</strong>, débités de ton solde Coeurnoh Universe à l'envoi.</p>` : ''}
        <div class="field">
          <label for="entry-name">Ton nom / nom d'artiste</label>
          <input type="text" id="entry-name" class="text-input" maxlength="60" value="${escapeHtml(currentUser.name || '')}">
        </div>
        <div class="field">
          <label for="entry-url">Lien vers ta photo / vidéo / preuve</label>
          <input type="url" id="entry-url" class="text-input" placeholder="https://...">
        </div>
        <div class="field">
          <label for="entry-caption">Message (facultatif)</label>
          <textarea id="entry-caption" class="text-input" rows="2" style="resize:vertical" maxlength="200"></textarea>
        </div>
        <button class="btn btn-primary" id="entry-save-btn" style="width:100%;justify-content:center" onclick="${isPaid ? `payAndSubmitContestEntry('${contestId}')` : `saveContestEntry('${contestId}')`}">${isPaid ? `Payer ${entryFee.toFixed(2)}$ et participer` : 'Envoyer ma participation'}</button>
        <p class="muted small" id="entry-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveContestEntry(contestId) {
  const btn = document.getElementById('entry-save-btn');
  const msgEl = document.getElementById('entry-form-msg');
  const name = document.getElementById('entry-name').value.trim();
  const submissionUrl = document.getElementById('entry-url').value.trim();
  const caption = document.getElementById('entry-caption').value.trim();

  if (!name) { msgEl.textContent = 'Merci d\'indiquer ton nom.'; return; }
  if (!submissionUrl || !submissionUrl.startsWith('http')) { msgEl.textContent = 'Merci de coller un lien valide vers ta participation.'; return; }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Envoi...';
  try {
    // Id deterministe "{contestId}_{uid}" : une seule participation par
    // personne et par concours (un nouvel envoi remplace la precedente
    // tant que le concours n'est pas termine).
    await db.collection('contest_entries').doc(`${contestId}_${currentUser.uid}`).set({
      contestId, uid: currentUser.uid, name, submissionUrl, caption,
      votesCount: 0, paid: false, createdAt: new Date().toISOString()
    }, { merge: true });
    document.getElementById('contest-entry-modal').remove();
    showToast('Participation envoyée', 'success');
    const status = computeContestStatus((contestsCache || []).find(c => c.id === contestId) || {});
    loadContestEntries(contestId, status);
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Envoyer ma participation';
  }
}

// Concours PAYANT : passe par le serveur (firebase-admin) qui verifie le
// jeton, deduit le solde et cree la participation dans UNE SEULE
// transaction securisee -- exactement le meme principe que le paiement de
// la Boutique (api/shop-purchase.js). Voir api/payments-actions.js.
async function payAndSubmitContestEntry(contestId) {
  const btn = document.getElementById('entry-save-btn');
  const msgEl = document.getElementById('entry-form-msg');
  const name = document.getElementById('entry-name').value.trim();
  const submissionUrl = document.getElementById('entry-url').value.trim();
  const caption = document.getElementById('entry-caption').value.trim();

  if (!name) { msgEl.textContent = 'Merci d\'indiquer ton nom.'; return; }
  if (!submissionUrl || !submissionUrl.startsWith('http')) { msgEl.textContent = 'Merci de coller un lien valide vers ta participation.'; return; }

  if (btn.disabled) return;
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Paiement en cours...';
  msgEl.textContent = '';

  try {
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/payments-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, action: 'contest_entry', contestId, name, submissionUrl, caption })
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Le paiement a échoué.');

    currentUser.balance = data.newBalance;
    const dashBalanceEl = document.getElementById('wallet-balance');
    if (dashBalanceEl) dashBalanceEl.textContent = data.newBalance.toFixed(2) + '$';
    document.getElementById('contest-entry-modal').remove();
    showToast('Participation payée et confirmée', 'success');
    const status = computeContestStatus((contestsCache || []).find(c => c.id === contestId) || {});
    loadContestEntries(contestId, status);
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function voteForEntry(contestId, entryId) {
  if (!currentUser) { openAuth('login'); return; }
  const voteKey = `${contestId}_${entryId}_${currentUser.uid}`;
  const voteRef = db.collection('contest_votes').doc(voteKey);
  const entryRef = db.collection('contest_entries').doc(entryId);
  try {
    await db.runTransaction(async tx => {
      const voteDoc = await tx.get(voteRef);
      if (voteDoc.exists) throw new Error('ALREADY_VOTED');
      tx.set(voteRef, { contestId, entryId, uid: currentUser.uid, createdAt: new Date().toISOString() });
      tx.update(entryRef, { votesCount: firebase.firestore.FieldValue.increment(1) });
    });
    contestMyVotesCache.add(voteKey);
    showToast('Vote enregistré', 'success');
    const status = computeContestStatus((contestsCache || []).find(c => c.id === contestId) || {});
    loadContestEntries(contestId, status);
  } catch (e) {
    if (e.message === 'ALREADY_VOTED') {
      showToast('Tu as déjà voté pour cette participation', 'info');
    } else {
      showToast(friendlyErrorMessage(e), 'error');
    }
  }
}

function closeAccountSearchOnBlur() {
  // Petit delai pour laisser le temps au clic sur un resultat de se
  // declencher (onmousedown, pas onclick) avant que la liste disparaisse.
  setTimeout(() => {
    document.getElementById('account-search-results').classList.add('hidden');
  }, 150);
}

async function loadFollowingList() {
  const el = document.getElementById('following-list');
  if (!el || !currentUser) return;
  el.innerHTML = '<p class="muted small">Chargement...</p>';
  try {
    const snap = await db.collection('follows').where('followerUid', '==', currentUser.uid).get();
    if (snap.empty) {
      el.innerHTML = '<p class="muted small">Tu ne suis encore personne. Ouvre le profil d\'un vendeur depuis le fil d\'accueil pour le suivre.</p>';
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const f = doc.data();
      return `
      <div class="admin-row" style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="cursor:pointer;font-weight:600" onclick="openProfileModal('${f.followedUid}','${escapeForJs(f.followedName || 'ce compte')}',false)">${escapeHtml(f.followedName || 'Compte')}</span>
        <button class="btn btn-outline btn-sm" onclick="unfollowFromList('${f.followedUid}')">Ne plus suivre</button>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function unfollowFromList(sellerUid) {
  followingSet.add(sellerUid); // pour que toggleFollow bascule bien vers "ne plus suivre"
  await toggleFollow(sellerUid, '');
  loadFollowingList();
}

async function loadFollowersList() {
  const el = document.getElementById('followers-list');
  if (!el || !currentUser) return;
  el.innerHTML = '<p class="muted small">Chargement...</p>';
  try {
    const snap = await db.collection('follows').where('followedUid', '==', currentUser.uid).get();
    if (snap.empty) {
      el.innerHTML = '<p class="muted small">Personne ne te suit encore.</p>';
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const f = doc.data();
      const isFollowingBack = followingSet.has(f.followerUid);
      return `
      <div class="admin-row" style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="cursor:pointer;font-weight:600" onclick="openProfileModal('${f.followerUid}','${escapeForJs(f.followerName || 'ce compte')}',false)">${escapeHtml(f.followerName || 'Compte')}</span>
        <button class="follow-btn ${isFollowingBack ? 'following' : ''}" data-follow-btn="${f.followerUid}"
          onclick="toggleFollow('${f.followerUid}','${escapeForJs(f.followerName || 'ce compte')}')">
          <span data-follow-label="${f.followerUid}">${isFollowingBack ? 'Abonné' : '+ Suivre'}</span>
        </button>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadBlockedList() {
  const el = document.getElementById('blocked-list');
  if (!el || !currentUser) return;
  el.innerHTML = '<p class="muted small">Chargement...</p>';
  try {
    const snap = await db.collection('blocks').where('blockerUid', '==', currentUser.uid).get();
    if (snap.empty) {
      el.innerHTML = '<p class="muted small">Aucun compte bloqué.</p>';
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const b = doc.data();
      return `
      <div class="admin-row" style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="font-weight:600">${escapeHtml(b.blockedName || 'Compte')}</span>
        <button class="btn btn-outline btn-sm" onclick="unblockFromList('${b.blockedUid}')">Débloquer</button>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function unblockFromList(targetUid) {
  blockedSet.add(targetUid); // pour que toggleBlockAccount bascule bien vers "debloquer"
  const lockKey = 'block_' + targetUid;
  likeInFlight.delete(lockKey); // au cas ou, pour ne pas rester bloque par erreur
  try {
    await db.collection('blocks').doc(`${currentUser.uid}_${targetUid}`).delete();
    blockedSet.delete(targetUid);
    showToast('Compte débloqué', 'info');
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
  loadBlockedList();
}

async function loadSavedFeed() {
  const feedEl = document.getElementById('saved-feed');
  if (!feedEl || !currentUser) return;
  feedEl.innerHTML = renderFeedSkeletons(2);
  try {
    // Pas d'orderBy ici : evite d'exiger un nouvel index composite Firestore
    // pour cette collection ("saved_items" est nouvelle). Le tri se fait
    // cote telephone juste apres, comme pour d'autres listes de l'app.
    const savedSnap = await db.collection('saved_items')
      .where('uid', '==', currentUser.uid)
      .limit(30)
      .get();

    if (savedSnap.empty) {
      feedEl.innerHTML = '<p class="muted small">Aucun contenu enregistré pour l\'instant. Appuie sur le signet sous une publication pour la retrouver ici.</p>';
      return;
    }

    const savedDocs = savedSnap.docs.slice().sort((a, b) =>
      new Date(b.data().createdAt) - new Date(a.data().createdAt));

    const pubDocs = await Promise.all(
      savedDocs.map(d => db.collection('publications').doc(d.data().pubId).get())
    );
    const items = pubDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

    if (items.length === 0) {
      feedEl.innerHTML = '<p class="muted small">Aucun contenu enregistré pour l\'instant.</p>';
      return;
    }

    feedEl.innerHTML = items.map(item =>
      item.type === 'book' || item.type === 'product'
        ? renderShopCard(item, false, false)
        : renderPostCard(item, false, true)
    ).join('');
  } catch (e) {
    feedEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

/* ================= EMPLOI & FREELANCE =================
   "job_offers" (creee par n'importe quel utilisateur, comme une publication
   -- pas de "profil recruteur" separe a creer, meme logique legere que
   l'espace Vendeur de la Boutique) -- "job_applications" (une candidature =
   un document, id deterministe "{offerId}_{uid}" pour empecher les
   candidatures en double sur la meme offre, meme principe que
   contest_entries). Le champ "featured" (mise en avant) n'est modifiable
   que par l'admin via les regles Firestore -- gere depuis l'espace
   administratif, pas depuis cette interface utilisateur. */
const JOB_TYPE_LABELS = { emploi: 'Emploi', stage: 'Stage', freelance: 'Freelance', 'petit-boulot': 'Petit boulot' };
const JOB_CONTRACT_LABELS = { cdi: 'CDI', cdd: 'CDD', freelance: 'Freelance / Prestation', stage: 'Stage', temporaire: 'Temporaire / Ponctuel' };
const JOB_APP_STATUS_LABELS = { envoyee: 'Envoyée', vue: 'Vue', acceptee: 'Acceptée', refusee: 'Refusée' };

let jobsCache = null; // offres actives, mises en cache pour filtrer sans re-interroger a chaque frappe
let jobsCurrentTab = 'browse';
let jobsTypeFilter = '';
let jobsSearchDebounce = null;
let myJobOffersCache = null;
let editingJobOfferId = null; // non-null = formulaire en mode modification
let currentJobApplyOfferId = null;
let currentJobDetailId = null;

let jobsCurrentWorld = 'offers';

function openJobsScreen() {
  showMenuScreen('jobs');
  setJobsWorld(jobsCurrentWorld || 'offers');
}

function setJobsWorld(world) {
  jobsCurrentWorld = world;
  document.querySelectorAll('#jobs-world-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.world === world));
  document.getElementById('jobs-world-offers').classList.toggle('hidden', world !== 'offers');
  document.getElementById('jobs-world-seekers').classList.toggle('hidden', world !== 'seekers');
  if (world === 'offers') setJobsTab(jobsCurrentTab || 'browse');
  else setJobSeekersTab(jobSeekersCurrentTab || 'browse');
}

function setJobsTab(tab) {
  jobsCurrentTab = tab;
  document.querySelectorAll('#jobs-main-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  ['browse', 'myapps', 'myoffers'].forEach(t => {
    document.getElementById('jobs-tab-' + t).classList.toggle('hidden', t !== tab);
  });

  if (tab === 'browse') {
    loadJobOffers();
  } else if (tab === 'myapps') {
    loadMyJobApplications();
  } else if (tab === 'myoffers') {
    loadMyJobOffers();
  }
}

async function loadJobOffers() {
  const listEl = document.getElementById('jobs-browse-list');
  if (!jobsCache) listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('job_offers').where('status', '==', 'active').limit(300).get();
    jobsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    runJobsFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function setJobsTypeFilter(type) {
  jobsTypeFilter = type;
  document.querySelectorAll('#jobs-type-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  runJobsFilter();
}

function scheduleJobsSearch() {
  clearTimeout(jobsSearchDebounce);
  jobsSearchDebounce = setTimeout(runJobsFilter, 250);
}

function runJobsFilter() {
  if (!jobsCache) return;
  const query = document.getElementById('jobs-search-input').value.trim().toLowerCase();

  const matches = jobsCache.filter(o => {
    if (jobsTypeFilter && o.type !== jobsTypeFilter) return false;
    if (query) {
      const haystack = `${o.title || ''} ${o.category || ''} ${o.location || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  // Les offres mises en avant par l'admin remontent en premier.
  matches.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  renderJobsBrowseList(matches);
}

function jobSalaryLabel(o) {
  if (o.salaryHidden || (!o.salaryMin && !o.salaryMax)) return 'Rémunération non communiquée';
  if (o.salaryMin && o.salaryMax) return `${o.salaryMin}$ - ${o.salaryMax}$`;
  return `${(o.salaryMin || o.salaryMax)}$`;
}

function renderJobsBrowseList(list) {
  const listEl = document.getElementById('jobs-browse-list');
  if (list.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucune offre pour l\'instant. Élargis ta recherche, ou sois le premier à en publier une.</p>';
    return;
  }
  listEl.innerHTML = list.map(o => `
    <div class="order-box" style="margin-bottom:12px${o.featured ? ';border-color:#f5a623' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(o.title || 'Offre')}</strong>
        <span class="shop-card-category">${JOB_TYPE_LABELS[o.type] || o.type}</span>
      </div>
      ${o.featured ? '<span class="shop-card-category" style="background:#fff4e0;color:#b5720b;margin-top:4px;display:inline-block">Mise en avant</span>' : ''}
      <div class="muted small" style="margin:4px 0">${escapeHtml(o.location || '—')} · ${JOB_CONTRACT_LABELS[o.contractType] || ''}</div>
      <div class="muted small" style="margin-bottom:10px">${escapeHtml(jobSalaryLabel(o))}</div>
      <button class="btn btn-outline btn-sm" onclick="openJobDetail('${o.id}')">Voir l'offre</button>
    </div>`).join('');
}

async function openJobDetail(offerId) {
  currentJobDetailId = offerId;
  const bodyEl = document.getElementById('job-detail-body');
  bodyEl.innerHTML = '<p class="muted small">Chargement...</p>';
  document.getElementById('job-detail-modal').classList.remove('hidden');

  try {
    const snap = await db.collection('job_offers').doc(offerId).get();
    if (!snap.exists) {
      bodyEl.innerHTML = '<p class="muted small">Cette offre n\'existe plus.</p>';
      return;
    }
    const o = { id: snap.id, ...snap.data() };
    const isOwner = currentUser && currentUser.uid === o.ownerUid;

    let actionHtml;
    if (isOwner) {
      actionHtml = `
        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openJobCandidates('${o.id}')">Voir les candidats (${o.applicationsCount || 0})</button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openJobForm('${o.id}')">Modifier l'offre</button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleJobOfferStatus('${o.id}', '${o.status === 'active' ? 'closed' : 'active'}')">${o.status === 'active' ? 'Clôturer l\'offre' : 'Réactiver l\'offre'}</button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;color:var(--red)" onclick="deleteJobOffer('${o.id}')">Supprimer l'offre</button>`;
    } else if (!currentUser) {
      actionHtml = `<button class="btn btn-primary" style="width:100%;justify-content:center" onclick="openAuth('register')">Se connecter pour postuler</button>`;
    } else if (o.status !== 'active') {
      actionHtml = `<p class="muted small" style="text-align:center">Cette offre n'accepte plus de candidatures.</p>`;
    } else {
      actionHtml = `<p class="muted small" id="job-apply-status-slot">Vérification...</p>`;
    }

    bodyEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <h3 style="margin:0">${escapeHtml(o.title || 'Offre')}</h3>
        <span class="shop-card-category">${JOB_TYPE_LABELS[o.type] || o.type}</span>
      </div>
      <div class="muted small" style="margin-bottom:10px">${escapeHtml(o.location || '—')} · ${JOB_CONTRACT_LABELS[o.contractType] || ''}${o.category ? ' · ' + escapeHtml(o.category) : ''}</div>
      <p style="white-space:pre-wrap;margin-bottom:10px">${escapeHtml(o.description || '')}</p>
      <p class="muted small" style="margin-bottom:16px"><strong>${escapeHtml(jobSalaryLabel(o))}</strong></p>
      <div id="job-detail-actions">${actionHtml}</div>
      ${!isOwner && currentUser ? `<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px" onclick="openReportModal('${o.id}', '${o.ownerUid}', 'job_offer')">Signaler cette offre</button>` : ''}
    `;

    // Verifie en arriere-plan si l'utilisateur a deja postule, sans bloquer
    // l'affichage du reste de la fiche.
    if (!isOwner && currentUser && o.status === 'active') {
      const appSnap = await db.collection('job_applications').doc(`${o.id}_${currentUser.uid}`).get();
      const slot = document.getElementById('job-apply-status-slot');
      if (!slot) return; // la fiche a ete fermee entre-temps
      if (appSnap.exists) {
        const status = appSnap.data().status || 'envoyee';
        slot.outerHTML = `<p class="muted small" style="text-align:center">Tu as déjà postulé — statut : <strong>${JOB_APP_STATUS_LABELS[status] || status}</strong></p>`;
      } else {
        slot.outerHTML = `<button class="btn btn-primary" style="width:100%;justify-content:center" onclick="openJobApplyForm('${o.id}', '${escapeHtml(o.title || '')}')">Postuler</button>`;
      }
    }
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function closeJobDetail() {
  document.getElementById('job-detail-modal').classList.add('hidden');
  currentJobDetailId = null;
}

function openJobForm(offerId = null) {
  if (!currentUser) { openAuth('register'); return; }
  editingJobOfferId = offerId;
  document.getElementById('job-form-error').classList.add('hidden');
  document.getElementById('job-form-title').textContent = offerId ? "Modifier l'offre" : 'Publier une offre';
  document.getElementById('job-form-submit-btn').textContent = offerId ? 'Enregistrer' : 'Publier';

  if (offerId) {
    const cached = (jobsCache || []).find(o => o.id === offerId) || (myJobOffersCache || []).find(o => o.id === offerId);
    const fill = (o) => {
      document.getElementById('job-title-input').value = o.title || '';
      document.getElementById('job-type-select').value = o.type || 'emploi';
      document.getElementById('job-contract-select').value = o.contractType || 'cdi';
      document.getElementById('job-category-input').value = o.category || '';
      document.getElementById('job-location-input').value = o.location || '';
      document.getElementById('job-description-input').value = o.description || '';
      document.getElementById('job-salary-min-input').value = o.salaryMin || '';
      document.getElementById('job-salary-max-input').value = o.salaryMax || '';
      document.getElementById('job-salary-hidden-input').checked = !!o.salaryHidden;
    };
    if (cached) {
      fill(cached);
    } else {
      db.collection('job_offers').doc(offerId).get().then(snap => { if (snap.exists) fill(snap.data()); });
    }
  } else {
    document.getElementById('job-title-input').value = '';
    document.getElementById('job-type-select').value = 'emploi';
    document.getElementById('job-contract-select').value = 'cdi';
    document.getElementById('job-category-input').value = '';
    document.getElementById('job-location-input').value = '';
    document.getElementById('job-description-input').value = '';
    document.getElementById('job-salary-min-input').value = '';
    document.getElementById('job-salary-max-input').value = '';
    document.getElementById('job-salary-hidden-input').checked = false;
  }

  document.getElementById('job-form-modal').classList.remove('hidden');
}

function closeJobForm() {
  document.getElementById('job-form-modal').classList.add('hidden');
  editingJobOfferId = null;
}

async function saveJobOffer() {
  const errEl = document.getElementById('job-form-error');
  errEl.classList.add('hidden');

  const title = document.getElementById('job-title-input').value.trim();
  const type = document.getElementById('job-type-select').value;
  const contractType = document.getElementById('job-contract-select').value;
  const category = document.getElementById('job-category-input').value.trim();
  const location = document.getElementById('job-location-input').value.trim();
  const description = document.getElementById('job-description-input').value.trim();
  const salaryMin = parseFloat(document.getElementById('job-salary-min-input').value) || null;
  const salaryMax = parseFloat(document.getElementById('job-salary-max-input').value) || null;
  const salaryHidden = document.getElementById('job-salary-hidden-input').checked;

  if (!title || !location || !description) {
    errEl.textContent = 'Merci de remplir au moins le titre, la ville et la description.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('job-form-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Envoi...';

  try {
    const payload = { title, type, contractType, category, location, description, salaryMin, salaryMax, salaryHidden };
    if (editingJobOfferId) {
      await db.collection('job_offers').doc(editingJobOfferId).update(payload);
      showToast('Offre mise à jour', 'success');
    } else {
      await db.collection('job_offers').add({
        ...payload,
        ownerUid: currentUser.uid,
        ownerName: currentUser.name || 'Utilisateur',
        status: 'active',
        featured: false,
        applicationsCount: 0,
        createdAt: new Date().toISOString()
      });
      showToast('Offre publiée', 'success');
    }
    closeJobForm();
    jobsCache = null; // force un rechargement pour voir l'offre a jour
    if (jobsCurrentTab === 'browse') loadJobOffers();
    if (jobsCurrentTab === 'myoffers') loadMyJobOffers();
  } catch (e) {
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function toggleJobOfferStatus(offerId, newStatus) {
  try {
    await db.collection('job_offers').doc(offerId).update({ status: newStatus });
    showToast(newStatus === 'active' ? 'Offre réactivée' : 'Offre clôturée', 'success');
    jobsCache = null;
    closeJobDetail();
    loadMyJobOffers();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function deleteJobOffer(offerId) {
  if (!confirm('Supprimer définitivement cette offre ? Les candidatures reçues resteront visibles par les candidats mais ne seront plus liées à une offre active.')) return;
  try {
    await db.collection('job_offers').doc(offerId).delete();
    showToast('Offre supprimée', 'success');
    jobsCache = null;
    closeJobDetail();
    loadMyJobOffers();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

function openJobApplyForm(offerId, offerTitle) {
  if (!currentUser) { openAuth('register'); return; }
  currentJobApplyOfferId = offerId;
  document.getElementById('job-apply-offer-title').textContent = offerTitle ? `Offre : ${offerTitle}` : '';
  document.getElementById('job-apply-message').value = '';
  document.getElementById('job-apply-cv').value = '';
  document.getElementById('job-apply-error').classList.add('hidden');
  document.getElementById('job-apply-modal').classList.remove('hidden');
}

function closeJobApplyForm() {
  document.getElementById('job-apply-modal').classList.add('hidden');
  currentJobApplyOfferId = null;
}

async function submitJobApplication() {
  const errEl = document.getElementById('job-apply-error');
  errEl.classList.add('hidden');
  if (!currentUser || !currentJobApplyOfferId) { closeJobApplyForm(); return; }

  const message = document.getElementById('job-apply-message').value.trim();
  const cvUrl = document.getElementById('job-apply-cv').value.trim();
  if (!message) {
    errEl.textContent = 'Merci d\'écrire un message de motivation.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('job-apply-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Envoi...';

  const offerId = currentJobApplyOfferId;
  try {
    const offerSnap = await db.collection('job_offers').doc(offerId).get();
    if (!offerSnap.exists) throw new Error('OFFER_GONE');
    const offer = offerSnap.data();

    await db.collection('job_applications').doc(`${offerId}_${currentUser.uid}`).set({
      offerId, offerOwnerUid: offer.ownerUid, offerTitle: offer.title || '',
      applicantUid: currentUser.uid, applicantName: currentUser.name || 'Utilisateur',
      message, cvUrl: cvUrl || null, status: 'envoyee', createdAt: new Date().toISOString()
    });

    // Compteur best-effort : une candidature reussie mais un compteur qui
    // echoue a s'incrementer ne doit jamais bloquer l'envoi lui-meme.
    db.collection('job_offers').doc(offerId).update({
      applicationsCount: firebase.firestore.FieldValue.increment(1)
    }).catch(() => {});

    const title = 'Nouvelle candidature 📩';
    const body = `${currentUser.name || "Quelqu'un"} a postulé à ton offre "${offer.title || ''}".`;
    db.collection('notifications').add({
      uid: offer.ownerUid, title, body, type: 'job_application', read: false,
      url: '/?open=' + offerId, createdAt: new Date().toISOString()
    }).catch(() => {});
    notifyUserPush(offer.ownerUid, title, body, 'activity', '/?open=' + offerId);

    closeJobApplyForm();
    showToast('Candidature envoyée', 'success');
    openJobDetail(offerId); // rafraichit la fiche pour montrer le statut "Envoyee"
  } catch (e) {
    if (e.message === 'OFFER_GONE') {
      errEl.textContent = "Cette offre n'existe plus.";
    } else if (e.code === 'permission-denied') {
      errEl.textContent = 'Tu as déjà postulé à cette offre.';
    } else {
      errEl.textContent = friendlyErrorMessage(e);
    }
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Envoyer ma candidature';
  }
}

async function loadMyJobApplications() {
  const listEl = document.getElementById('jobs-myapps-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small">Connecte-toi pour voir tes candidatures.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('job_applications').where('applicantUid', '==', currentUser.uid).get();
    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    apps.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (apps.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore postulé à aucune offre.</p>';
      return;
    }
    listEl.innerHTML = apps.map(a => `
      <div class="order-box" style="margin-bottom:12px">
        <strong>${escapeHtml(a.offerTitle || 'Offre')}</strong>
        <div class="muted small" style="margin:4px 0">Statut : ${JOB_APP_STATUS_LABELS[a.status] || a.status}</div>
        <button class="btn btn-outline btn-sm" onclick="openJobDetail('${a.offerId}')">Voir l'offre</button>
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadMyJobOffers() {
  const listEl = document.getElementById('jobs-myoffers-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small">Connecte-toi pour gérer tes offres.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('job_offers').where('ownerUid', '==', currentUser.uid).get();
    myJobOffersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    myJobOffersCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (myJobOffersCache.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore publié aucune offre.</p>';
      return;
    }
    listEl.innerHTML = myJobOffersCache.map(o => `
      <div class="order-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong>${escapeHtml(o.title || 'Offre')}</strong>
          <span class="shop-card-category">${o.status === 'active' ? 'Active' : 'Clôturée'}</span>
        </div>
        <div class="muted small" style="margin:4px 0">${o.applicationsCount || 0} candidature(s)</div>
        <button class="btn btn-outline btn-sm" onclick="openJobDetail('${o.id}')">Gérer</button>
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function openJobCandidates(offerId) {
  const bodyEl = document.getElementById('job-detail-body');
  bodyEl.innerHTML = `
    <button class="menu-back-btn" onclick="openJobDetail('${offerId}')" aria-label="Retour" style="margin-bottom:10px">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <h3 style="margin-bottom:12px">Candidats</h3>
    <div id="job-candidates-list"><p class="muted small">Chargement...</p></div>`;

  try {
    const snap = await db.collection('job_applications').where('offerId', '==', offerId).get();
    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    apps.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const listEl = document.getElementById('job-candidates-list');

    if (apps.length === 0) {
      listEl.innerHTML = '<p class="muted small">Aucune candidature reçue pour l\'instant.</p>';
      return;
    }
    listEl.innerHTML = apps.map(a => `
      <div class="order-box" style="margin-bottom:12px">
        <strong>${escapeHtml(a.applicantName || 'Candidat')}</strong>
        <div class="muted small" style="margin:6px 0;white-space:pre-wrap">${escapeHtml(a.message || '')}</div>
        ${a.cvUrl ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(a.cvUrl)}" target="_blank" style="margin-bottom:8px">Voir le CV / portfolio</a>` : ''}
        <div class="muted small" style="margin-bottom:8px">Statut : ${JOB_APP_STATUS_LABELS[a.status] || a.status}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="setJobApplicationStatus('${a.id}', 'vue', '${offerId}')">Marquer vue</button>
          <button class="btn btn-primary btn-sm" onclick="setJobApplicationStatus('${a.id}', 'acceptee', '${offerId}')">Accepter</button>
          <button class="btn btn-outline btn-sm" style="color:var(--red)" onclick="setJobApplicationStatus('${a.id}', 'refusee', '${offerId}')">Refuser</button>
        </div>
      </div>`).join('');
  } catch (e) {
    document.getElementById('job-candidates-list').innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function setJobApplicationStatus(appId, status, offerId) {
  try {
    const appSnap = await db.collection('job_applications').doc(appId).get();
    if (!appSnap.exists) return;
    const app = appSnap.data();
    await db.collection('job_applications').doc(appId).update({ status });

    const title = 'Ta candidature a été mise à jour';
    const body = `Ta candidature pour "${app.offerTitle || 'une offre'}" est maintenant : ${JOB_APP_STATUS_LABELS[status] || status}.`;
    db.collection('notifications').add({
      uid: app.applicantUid, title, body, type: 'job_application_status', read: false,
      url: '/?open=' + offerId, createdAt: new Date().toISOString()
    }).catch(() => {});
    notifyUserPush(app.applicantUid, title, body, 'activity', '/?open=' + offerId);

    showToast('Statut mis à jour', 'success');
    openJobCandidates(offerId);
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= EMPLOI & FREELANCE — DEMANDES (chercheurs d'emploi) =================
   "job_seekers" : un profil de demande d'emploi = un document, id
   deterministe = uid du chercheur (un seul profil actif par personne a la
   fois, meme principe que "mini_sites" pour Crée ton site). Contrairement
   aux offres, il n'y a PAS de cycle de candidature ici : le recruteur qui
   parcourt les profils contacte directement le chercheur via WhatsApp
   (meme logique que "Trouver un professionnel" et "Crée ton site").
   Le champ "featured" (mise en avant, payant) suit exactement le meme
   mecanisme que "job_offers" : modifiable uniquement par l'admin via les
   regles Firestore, pas depuis cette interface. */
let jobSeekersCache = null; // profils des AUTRES utilisateurs (parcourir)
let jobSeekersCurrentTab = 'browse';
let jobSeekersTypeFilter = '';
let jobSeekersSearchDebounce = null;
let myJobSeekerProfile = null;
let currentJobSeekerDetailId = null;

function setJobSeekersTab(tab) {
  jobSeekersCurrentTab = tab;
  document.querySelectorAll('#jobseekers-main-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  ['browse', 'mine'].forEach(t => document.getElementById('jobseekers-tab-' + t).classList.toggle('hidden', t !== tab));
  if (tab === 'browse') loadJobSeekers();
  else loadMyJobSeekerProfile();
}

function setJobSeekersTypeFilter(type) {
  jobSeekersTypeFilter = type;
  document.querySelectorAll('#jobseekers-type-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
  runJobSeekersFilter();
}

function scheduleJobSeekersSearch() {
  clearTimeout(jobSeekersSearchDebounce);
  jobSeekersSearchDebounce = setTimeout(runJobSeekersFilter, 250);
}

async function loadJobSeekers() {
  const listEl = document.getElementById('jobseekers-browse-list');
  if (!jobSeekersCache) listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('job_seekers').where('status', '==', 'active').limit(300).get();
    jobSeekersCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !currentUser || p.ownerUid !== currentUser.uid);
    runJobSeekersFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function runJobSeekersFilter() {
  if (!jobSeekersCache) return;
  const query = document.getElementById('jobseekers-search-input').value.trim().toLowerCase();
  const matches = jobSeekersCache.filter(p => {
    if (jobSeekersTypeFilter && p.type !== jobSeekersTypeFilter) return false;
    if (query) {
      const haystack = `${p.title || ''} ${p.category || ''} ${p.location || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  matches.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  renderJobSeekersBrowseList(matches);
}

function jobSeekerSalaryLabel(p) {
  if (p.salaryHidden || (!p.salaryMin && !p.salaryMax)) return 'Prétention salariale non communiquée';
  if (p.salaryMin && p.salaryMax) return `${p.salaryMin}$ - ${p.salaryMax}$`;
  return `${(p.salaryMin || p.salaryMax)}$`;
}

function renderJobSeekersBrowseList(list) {
  const listEl = document.getElementById('jobseekers-browse-list');
  if (list.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucun profil pour l\'instant. Élargis ta recherche, ou sois le premier à publier le tien.</p>';
    return;
  }
  listEl.innerHTML = list.map(p => `
    <div class="order-box" style="margin-bottom:12px${p.featured ? ';border-color:#f5a623' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(p.title || 'Profil')}</strong>
        <span class="shop-card-category">${JOB_TYPE_LABELS[p.type] || p.type}</span>
      </div>
      ${p.featured ? '<span class="shop-card-category" style="background:#fff4e0;color:#b5720b;margin-top:4px;display:inline-block">Mise en avant</span>' : ''}
      <div class="muted small" style="margin:4px 0">${escapeHtml(p.location || '—')}${p.category ? ' · ' + escapeHtml(p.category) : ''}</div>
      <button class="btn btn-outline btn-sm" onclick="openJobSeekerDetail('${p.id}')">Voir le profil</button>
    </div>`).join('');
}

async function openJobSeekerDetail(profileId) {
  currentJobSeekerDetailId = profileId;
  const bodyEl = document.getElementById('jobseeker-detail-body');
  bodyEl.innerHTML = '<p class="muted small">Chargement...</p>';
  document.getElementById('jobseeker-detail-modal').classList.remove('hidden');

  try {
    const cached = (jobSeekersCache || []).find(p => p.id === profileId);
    const snap = cached ? null : await db.collection('job_seekers').doc(profileId).get();
    const p = cached || (snap && snap.exists ? { id: snap.id, ...snap.data() } : null);
    if (!p) {
      bodyEl.innerHTML = '<p class="muted small">Ce profil n\'existe plus.</p>';
      return;
    }
    const isOwner = currentUser && currentUser.uid === p.ownerUid;
    const waLink = p.whatsapp ? `https://wa.me/${p.whatsapp.replace(/\D/g, '')}` : null;

    bodyEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <h3 style="margin:0">${escapeHtml(p.title || 'Profil')}</h3>
        <span class="shop-card-category">${JOB_TYPE_LABELS[p.type] || p.type}</span>
      </div>
      <div class="muted small" style="margin-bottom:10px">${escapeHtml(p.location || '—')}${p.category ? ' · ' + escapeHtml(p.category) : ''}${p.experience ? ' · ' + escapeHtml(p.experience) : ''}</div>
      <p style="white-space:pre-wrap;margin-bottom:10px">${escapeHtml(p.description || '')}</p>
      <p class="muted small" style="margin-bottom:16px"><strong>${escapeHtml(jobSeekerSalaryLabel(p))}</strong></p>
      ${p.cvUrl ? `<a class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" href="${escapeHtml(p.cvUrl)}" target="_blank">Voir le CV / portfolio</a>` : ''}
      ${!isOwner ? `
        <div id="jobseeker-detail-actions">
          ${waLink ? `<a class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" href="${escapeHtml(waLink)}" target="_blank">Contacter sur WhatsApp</a>` : ''}
          ${p.phone ? `<p class="muted small" style="text-align:center;margin-bottom:8px">Téléphone : ${escapeHtml(p.phone)}</p>` : ''}
        </div>
        ${currentUser ? `<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:4px" onclick="openReportModal('${p.id}', '${p.ownerUid}', 'job_seeker')">Signaler ce profil</button>` : ''}
      ` : `<p class="muted small" style="text-align:center">Ceci est ton profil. Modifie-le depuis l'onglet "Mon profil".</p>`}
    `;
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function closeJobSeekerDetail() {
  document.getElementById('jobseeker-detail-modal').classList.add('hidden');
  currentJobSeekerDetailId = null;
}

/* ---- Onglet "Mon profil" ---- */
async function loadMyJobSeekerProfile() {
  const statusEl = document.getElementById('jobseekers-mine-status');
  if (!currentUser) {
    statusEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour publier ta demande d\'emploi.</p>';
    return;
  }
  statusEl.innerHTML = '<p class="muted small">Chargement...</p>';
  try {
    const snap = await db.collection('job_seekers').doc(currentUser.uid).get();
    myJobSeekerProfile = snap.exists ? { id: snap.id, ...snap.data() } : null;
    renderMyJobSeekerProfile();
  } catch (e) {
    statusEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function renderMyJobSeekerProfile() {
  const statusEl = document.getElementById('jobseekers-mine-status');
  if (!myJobSeekerProfile) {
    statusEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as pas encore publié de demande d\'emploi.</p>';
    return;
  }
  const p = myJobSeekerProfile;
  statusEl.innerHTML = `
    <div class="order-box" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.05rem">${escapeHtml(p.title || 'Mon profil')}</strong>
        <span class="shop-card-category">${p.status === 'active' ? 'Actif' : 'En pause'}</span>
      </div>
      <div class="muted small" style="margin:4px 0">${escapeHtml(p.location || '—')}${p.category ? ' · ' + escapeHtml(p.category) : ''}</div>
    </div>
    <button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openJobSeekerForm()">Modifier mon profil</button>
    ${p.status === 'active'
      ? `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleJobSeekerStatus('paused')">Mettre en pause</button>`
      : `<button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleJobSeekerStatus('active')">Réactiver</button>`}
    <button class="btn btn-outline" style="width:100%;justify-content:center;color:var(--red)" onclick="deleteJobSeekerProfile()">Supprimer mon profil</button>`;
}

async function toggleJobSeekerStatus(newStatus) {
  try {
    await db.collection('job_seekers').doc(currentUser.uid).update({ status: newStatus });
    myJobSeekerProfile.status = newStatus;
    showToast(newStatus === 'active' ? 'Profil réactivé' : 'Profil mis en pause', 'success');
    renderMyJobSeekerProfile();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function deleteJobSeekerProfile() {
  if (!confirm('Supprimer définitivement ta demande d\'emploi ?')) return;
  try {
    await db.collection('job_seekers').doc(currentUser.uid).delete();
    myJobSeekerProfile = null;
    showToast('Profil supprimé', 'info');
    renderMyJobSeekerProfile();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ---- Formulaire de creation/modification du profil ---- */
function openJobSeekerForm() {
  if (!currentUser) { openAuth('register'); return; }
  document.getElementById('jobseeker-form-error').classList.add('hidden');
  document.getElementById('jobseeker-form-title').textContent = myJobSeekerProfile ? 'Modifier mon profil' : "Publier ma demande d'emploi";
  document.getElementById('jobseeker-form-submit-btn').textContent = myJobSeekerProfile ? 'Enregistrer' : 'Publier';

  const p = myJobSeekerProfile || {};
  document.getElementById('jobseeker-title-input').value = p.title || '';
  document.getElementById('jobseeker-type-select').value = p.type || 'emploi';
  document.getElementById('jobseeker-category-input').value = p.category || '';
  document.getElementById('jobseeker-location-input').value = p.location || '';
  document.getElementById('jobseeker-experience-input').value = p.experience || '';
  document.getElementById('jobseeker-description-input').value = p.description || '';
  document.getElementById('jobseeker-salary-min-input').value = p.salaryMin || '';
  document.getElementById('jobseeker-salary-max-input').value = p.salaryMax || '';
  document.getElementById('jobseeker-salary-hidden-input').checked = !!p.salaryHidden;
  document.getElementById('jobseeker-cv-input').value = p.cvUrl || '';
  document.getElementById('jobseeker-whatsapp-input').value = p.whatsapp || '';
  document.getElementById('jobseeker-phone-input').value = p.phone || '';

  document.getElementById('jobseeker-form-modal').classList.remove('hidden');
}

function closeJobSeekerForm() {
  document.getElementById('jobseeker-form-modal').classList.add('hidden');
}

async function saveJobSeekerProfile() {
  const errEl = document.getElementById('jobseeker-form-error');
  errEl.classList.add('hidden');

  const title = document.getElementById('jobseeker-title-input').value.trim();
  const type = document.getElementById('jobseeker-type-select').value;
  const category = document.getElementById('jobseeker-category-input').value.trim();
  const location = document.getElementById('jobseeker-location-input').value.trim();
  const experience = document.getElementById('jobseeker-experience-input').value.trim();
  const description = document.getElementById('jobseeker-description-input').value.trim();
  const salaryMin = parseFloat(document.getElementById('jobseeker-salary-min-input').value) || null;
  const salaryMax = parseFloat(document.getElementById('jobseeker-salary-max-input').value) || null;
  const salaryHidden = document.getElementById('jobseeker-salary-hidden-input').checked;
  const cvUrl = document.getElementById('jobseeker-cv-input').value.trim();
  const whatsapp = document.getElementById('jobseeker-whatsapp-input').value.trim();
  const phone = document.getElementById('jobseeker-phone-input').value.trim();

  if (!title || !location || !description || !whatsapp) {
    errEl.textContent = 'Merci de remplir au moins le poste recherché, la ville, la présentation et le WhatsApp.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('jobseeker-form-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Envoi...';

  try {
    const payload = {
      title, type, category, location, experience, description,
      salaryMin, salaryMax, salaryHidden, cvUrl: cvUrl || null, whatsapp, phone: phone || null
    };
    if (myJobSeekerProfile) {
      await db.collection('job_seekers').doc(currentUser.uid).update({ ...payload, updatedAt: new Date().toISOString() });
      showToast('Profil mis à jour', 'success');
    } else {
      await db.collection('job_seekers').doc(currentUser.uid).set({
        ...payload,
        ownerUid: currentUser.uid,
        ownerName: currentUser.name || 'Utilisateur',
        status: 'active',
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      showToast('Demande d\'emploi publiée', 'success');
    }
    closeJobSeekerForm();
    loadMyJobSeekerProfile();
  } catch (e) {
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

/* ================= EVENEMENTS & BILLETTERIE =================
   "events" (creee par n'importe quel organisateur, meme logique legere que
   les offres d'emploi et les publications) avec un tableau "ticketTypes"
   integre au document (nom, prix, places totales, places vendues) --
   plusieurs types de billets par evenement sans avoir besoin d'une
   sous-collection. "event_tickets" = une reservation par document.

   IMPORTANT SECURITE : contrairement aux autres services, TOUTES les
   reservations et annulations passent par le serveur (voir
   /api/payments-actions.js), meme les evenements GRATUITS. Pourquoi :
   incrementer "quantitySold" depuis le telephone d'un client, meme pour
   un evenement gratuit, permettrait a deux personnes de reserver la
   derniere place en meme temps (double reservation) ou a quelqu'un de
   trafiquer le nombre de places restantes. Le serveur utilise une
   transaction Firestore atomique pour verifier les places disponibles
   ET gerer le paiement, en
   une seule fois, ce qui rend une survente impossible. Cote regles
   Firestore, "event_tickets" est donc en lecture seule pour le client
   (allow write: if false) : aucune ecriture directe n'est possible. */
let eventsCache = null;
let eventsCurrentTab = 'browse';
let eventsSearchDebounce = null;
let myEventsCache = null;
let editingEventId = null;
let eventTicketRowCounter = 0;
let currentEventReserve = null; // { eventId, ticketTypeId, ticketTypeName, unitPrice, availableLeft }

function openEventsScreen() {
  showMenuScreen('events');
  setEventsTab(eventsCurrentTab || 'browse');
}

function setEventsTab(tab) {
  eventsCurrentTab = tab;
  document.querySelectorAll('#events-main-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  ['browse', 'mytickets', 'myevents'].forEach(t => {
    document.getElementById('events-tab-' + t).classList.toggle('hidden', t !== tab);
  });

  if (tab === 'browse') loadEvents();
  else if (tab === 'mytickets') loadMyEventTickets();
  else if (tab === 'myevents') loadMyOrganizedEvents();
}

async function loadEvents() {
  const listEl = document.getElementById('events-browse-list');
  if (!eventsCache) listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('events').where('status', '==', 'active').limit(300).get();
    const now = Date.now();
    // On ne montre dans "Decouvrir" que les evenements pas encore termines.
    eventsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(e => new Date(e.endDate || e.startDate).getTime() >= now - 24 * 3600 * 1000);
    eventsCache.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    runEventsFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function scheduleEventsSearch() {
  clearTimeout(eventsSearchDebounce);
  eventsSearchDebounce = setTimeout(runEventsFilter, 250);
}

function runEventsFilter() {
  if (!eventsCache) return;
  const query = document.getElementById('events-search-input').value.trim().toLowerCase();
  const matches = query
    ? eventsCache.filter(e => `${e.title || ''} ${e.category || ''} ${e.location || ''}`.toLowerCase().includes(query))
    : eventsCache;
  renderEventsBrowseList(matches);
}

function eventDateRangeLabel(e) {
  const start = new Date(e.startDate).toLocaleDateString('fr-FR');
  if (e.endDate && e.endDate !== e.startDate) {
    return `${start} — ${new Date(e.endDate).toLocaleDateString('fr-FR')}`;
  }
  return start;
}

function eventPriceFromLabel(e) {
  const types = e.ticketTypes || [];
  if (types.length === 0) return 'Places non définies';
  const prices = types.map(t => t.price || 0);
  const min = Math.min(...prices);
  if (min === 0 && prices.every(p => p === 0)) return 'Gratuit';
  return min === 0 ? 'À partir de gratuit' : `À partir de ${min}$`;
}

function renderEventsBrowseList(list) {
  const listEl = document.getElementById('events-browse-list');
  if (list.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucun événement à venir pour l\'instant. Sois le premier à en publier un.</p>';
    return;
  }
  listEl.innerHTML = list.map(e => `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(e.title || 'Événement')}</strong>
        <span class="shop-card-category">${escapeHtml(e.category || '—')}</span>
      </div>
      <div class="muted small" style="margin:4px 0">${escapeHtml(eventDateRangeLabel(e))} · ${escapeHtml(e.location || '—')}</div>
      <div class="muted small" style="margin-bottom:10px">${eventPriceFromLabel(e)}</div>
      <button class="btn btn-outline btn-sm" onclick="openEventDetail('${e.id}')">Voir l'événement</button>
    </div>`).join('');
}

async function openEventDetail(eventId) {
  const bodyEl = document.getElementById('event-detail-body');
  bodyEl.innerHTML = '<p class="muted small">Chargement...</p>';
  document.getElementById('event-detail-modal').classList.remove('hidden');

  try {
    const snap = await db.collection('events').doc(eventId).get();
    if (!snap.exists) {
      bodyEl.innerHTML = '<p class="muted small">Cet événement n\'existe plus.</p>';
      return;
    }
    const e = { id: snap.id, ...snap.data() };
    const isOwner = currentUser && currentUser.uid === e.ownerUid;
    const isPast = new Date(e.endDate || e.startDate).getTime() < Date.now();
    const types = e.ticketTypes || [];

    const ticketsHtml = types.map(t => {
      const left = (t.quantityTotal || 0) - (t.quantitySold || 0);
      const soldOut = left <= 0;
      let btnHtml;
      if (isOwner) {
        btnHtml = `<span class="muted small">${left} place(s) restante(s)</span>`;
      } else if (isPast || e.status !== 'active') {
        btnHtml = `<span class="muted small">Événement terminé</span>`;
      } else if (soldOut) {
        btnHtml = `<span class="muted small">Complet</span>`;
      } else if (!currentUser) {
        btnHtml = `<button class="btn btn-outline btn-sm" onclick="openAuth('register')">Se connecter pour réserver</button>`;
      } else {
        btnHtml = `<button class="btn btn-primary btn-sm" onclick='openEventReserveForm(${JSON.stringify(eventId)}, ${JSON.stringify(t.id)}, ${JSON.stringify(t.name || "Billet")}, ${t.price || 0}, ${left})'>Réserver</button>`;
      }
      return `<div class="order-box" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div><strong>${escapeHtml(t.name || 'Billet')}</strong><div class="muted small">${(t.price || 0) === 0 ? 'Gratuit' : (t.price || 0) + '$'} · ${left}/${t.quantityTotal || 0} places restantes</div></div>
          ${btnHtml}
        </div>
      </div>`;
    }).join('') || '<p class="muted small">Aucun type de billet défini.</p>';

    let ownerActionsHtml = '';
    if (isOwner) {
      ownerActionsHtml = `
        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openEventAttendees('${e.id}')">Voir les réservations</button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openEventForm('${e.id}')">Modifier l'événement</button>
        ${e.status === 'active'
          ? `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleEventStatus('${e.id}', 'cancelled')">Annuler l'événement</button>`
          : `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleEventStatus('${e.id}', 'active')">Réactiver l'événement</button>`}
        <button class="btn btn-outline" style="width:100%;justify-content:center;color:var(--red)" onclick="deleteEvent('${e.id}')">Supprimer l'événement</button>`;
    }

    bodyEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <h3 style="margin:0">${escapeHtml(e.title || 'Événement')}</h3>
        <span class="shop-card-category">${escapeHtml(e.category || '—')}</span>
      </div>
      <div class="muted small" style="margin-bottom:10px">${escapeHtml(eventDateRangeLabel(e))} · ${escapeHtml(e.location || '—')}</div>
      ${e.status === 'cancelled' ? '<p class="muted small" style="color:var(--red);margin-bottom:10px">Cet événement a été annulé par l\'organisateur.</p>' : ''}
      <p style="white-space:pre-wrap;margin-bottom:16px">${escapeHtml(e.description || '')}</p>
      <h4 style="margin-bottom:8px">Billets</h4>
      ${ticketsHtml}
      <div style="margin-top:14px">${ownerActionsHtml}</div>
      ${!isOwner && currentUser ? `<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px" onclick="openReportModal('${e.id}', '${e.ownerUid}', 'event')">Signaler cet événement</button>` : ''}
    `;
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function closeEventDetail() {
  document.getElementById('event-detail-modal').classList.add('hidden');
}

/* ---- Formulaire de creation / modification ---- */
function openEventForm(eventId = null) {
  if (!currentUser) { openAuth('register'); return; }
  editingEventId = eventId;
  document.getElementById('event-form-error').classList.add('hidden');
  document.getElementById('event-form-title').textContent = eventId ? "Modifier l'événement" : 'Créer un événement';
  document.getElementById('event-form-submit-btn').textContent = eventId ? 'Enregistrer' : "Publier l'événement";
  document.getElementById('event-ticket-types-list').innerHTML = '';

  const fill = (e) => {
    document.getElementById('event-title-input').value = e.title || '';
    document.getElementById('event-category-input').value = e.category || '';
    document.getElementById('event-location-input').value = e.location || '';
    document.getElementById('event-start-input').value = e.startDate ? e.startDate.slice(0, 10) : '';
    document.getElementById('event-end-input').value = e.endDate ? e.endDate.slice(0, 10) : '';
    document.getElementById('event-description-input').value = e.description || '';
    document.getElementById('event-cover-input').value = e.coverImage || '';
    (e.ticketTypes || []).forEach(t => addEventTicketTypeRow(t));
    if (!e.ticketTypes || e.ticketTypes.length === 0) addEventTicketTypeRow();
  };

  if (eventId) {
    const cached = (eventsCache || []).find(e => e.id === eventId) || (myEventsCache || []).find(e => e.id === eventId);
    if (cached) {
      fill(cached);
    } else {
      db.collection('events').doc(eventId).get().then(snap => { if (snap.exists) fill(snap.data()); });
    }
  } else {
    document.getElementById('event-title-input').value = '';
    document.getElementById('event-category-input').value = '';
    document.getElementById('event-location-input').value = '';
    document.getElementById('event-start-input').value = '';
    document.getElementById('event-end-input').value = '';
    document.getElementById('event-description-input').value = '';
    document.getElementById('event-cover-input').value = '';
    addEventTicketTypeRow();
  }

  document.getElementById('event-form-modal').classList.remove('hidden');
}

function closeEventForm() {
  document.getElementById('event-form-modal').classList.add('hidden');
  editingEventId = null;
}

// Un type de billet existant garde son id (necessaire pour ne pas perdre
// les places deja vendues en cas de modification) ; un nouveau type recoit
// un id genere ici et definitif des la creation.
function addEventTicketTypeRow(existing = null) {
  eventTicketRowCounter++;
  const rowId = 'ett-' + eventTicketRowCounter;
  const ticketId = existing && existing.id ? existing.id : 'tt-' + Date.now().toString(36) + eventTicketRowCounter;
  const soldSoFar = existing ? (existing.quantitySold || 0) : 0;

  const row = document.createElement('div');
  row.id = rowId;
  row.dataset.ticketId = ticketId;
  row.dataset.quantitySold = soldSoFar;
  row.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;align-items:center';
  row.innerHTML = `
    <input type="text" class="text-input event-tt-name" placeholder="Nom (ex: Standard)" style="flex:2" value="${existing ? escapeHtml(existing.name || '') : ''}">
    <input type="number" class="text-input event-tt-price" placeholder="Prix $" min="0" step="0.01" style="flex:1" value="${existing ? (existing.price || 0) : 0}">
    <input type="number" class="text-input event-tt-quantity" placeholder="Places" min="${soldSoFar}" step="1" style="flex:1" value="${existing ? (existing.quantityTotal || 0) : ''}">
    <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('${rowId}').remove()" aria-label="Retirer">×</button>`;
  document.getElementById('event-ticket-types-list').appendChild(row);
}

function collectEventTicketTypesFromForm() {
  return Array.from(document.querySelectorAll('#event-ticket-types-list > div')).map(row => ({
    id: row.dataset.ticketId,
    name: row.querySelector('.event-tt-name').value.trim() || 'Billet',
    price: parseFloat(row.querySelector('.event-tt-price').value) || 0,
    quantityTotal: parseInt(row.querySelector('.event-tt-quantity').value, 10) || 0,
    quantitySold: parseInt(row.dataset.quantitySold, 10) || 0
  })).filter(t => t.quantityTotal > 0);
}

async function saveEvent() {
  const errEl = document.getElementById('event-form-error');
  errEl.classList.add('hidden');

  const title = document.getElementById('event-title-input').value.trim();
  const category = document.getElementById('event-category-input').value.trim();
  const location = document.getElementById('event-location-input').value.trim();
  const startDate = document.getElementById('event-start-input').value;
  const endDate = document.getElementById('event-end-input').value;
  const description = document.getElementById('event-description-input').value.trim();
  const coverImage = document.getElementById('event-cover-input').value.trim();
  const ticketTypes = collectEventTicketTypesFromForm();

  if (!title || !location || !startDate) {
    errEl.textContent = 'Merci de remplir au moins le titre, le lieu et la date de début.';
    errEl.classList.remove('hidden');
    return;
  }
  if (endDate && new Date(endDate) < new Date(startDate)) {
    errEl.textContent = 'La date de fin doit être après la date de début.';
    errEl.classList.remove('hidden');
    return;
  }
  if (ticketTypes.length === 0) {
    errEl.textContent = 'Ajoute au moins un type de billet avec un nombre de places.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('event-form-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Envoi...';

  try {
    const payload = {
      title, category, location, description,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : new Date(startDate).toISOString(),
      coverImage: coverImage || null,
      ticketTypes
    };
    if (editingEventId) {
      await db.collection('events').doc(editingEventId).update(payload);
      showToast('Événement mis à jour', 'success');
    } else {
      await db.collection('events').add({
        ...payload,
        ownerUid: currentUser.uid,
        ownerName: currentUser.name || 'Utilisateur',
        status: 'active',
        createdAt: new Date().toISOString()
      });
      showToast('Événement publié', 'success');
    }
    closeEventForm();
    eventsCache = null;
    if (eventsCurrentTab === 'browse') loadEvents();
    if (eventsCurrentTab === 'myevents') loadMyOrganizedEvents();
  } catch (e) {
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function toggleEventStatus(eventId, newStatus) {
  try {
    await db.collection('events').doc(eventId).update({ status: newStatus });
    showToast(newStatus === 'active' ? 'Événement réactivé' : 'Événement annulé', 'success');
    eventsCache = null;
    closeEventDetail();
    loadMyOrganizedEvents();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Supprimer définitivement cet événement ? Les billets déjà réservés resteront visibles par les acheteurs mais ne seront plus liés à un événement actif.')) return;
  try {
    await db.collection('events').doc(eventId).delete();
    showToast('Événement supprimé', 'success');
    eventsCache = null;
    closeEventDetail();
    loadMyOrganizedEvents();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ---- Reservation (toujours via le serveur, voir note de securite plus haut) ---- */
function openEventReserveForm(eventId, ticketTypeId, ticketTypeName, unitPrice, availableLeft) {
  if (!currentUser) { openAuth('register'); return; }
  currentEventReserve = { eventId, ticketTypeId, ticketTypeName, unitPrice, availableLeft };
  document.getElementById('event-reserve-ticket-label').textContent = `${ticketTypeName} — ${unitPrice === 0 ? 'Gratuit' : unitPrice + '$'} (${availableLeft} place(s) restante(s))`;
  document.getElementById('event-reserve-quantity').value = 1;
  document.getElementById('event-reserve-quantity').max = availableLeft;
  document.getElementById('event-reserve-error').classList.add('hidden');
  updateEventReserveTotal();
  document.getElementById('event-reserve-modal').classList.remove('hidden');
}

function updateEventReserveTotal() {
  if (!currentEventReserve) return;
  const qty = parseInt(document.getElementById('event-reserve-quantity').value, 10) || 0;
  const total = qty * currentEventReserve.unitPrice;
  document.getElementById('event-reserve-total').textContent = total === 0 ? 'Gratuit' : total.toFixed(2) + '$';
}

function closeEventReserveForm() {
  document.getElementById('event-reserve-modal').classList.add('hidden');
  currentEventReserve = null;
}

async function submitEventReservation() {
  const errEl = document.getElementById('event-reserve-error');
  errEl.classList.add('hidden');
  if (!currentUser || !currentEventReserve) { closeEventReserveForm(); return; }

  const quantity = parseInt(document.getElementById('event-reserve-quantity').value, 10) || 0;
  if (quantity < 1) {
    errEl.textContent = 'Indique au moins 1 place.';
    errEl.classList.remove('hidden');
    return;
  }
  if (quantity > currentEventReserve.availableLeft) {
    errEl.textContent = `Il ne reste que ${currentEventReserve.availableLeft} place(s).`;
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('event-reserve-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Réservation...';

  try {
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/payments-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken, action: 'event_reserve',
        eventId: currentEventReserve.eventId,
        ticketTypeId: currentEventReserve.ticketTypeId,
        quantity
      })
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'La réservation a échoué.');

    if (typeof data.newBalance === 'number') {
      currentUser.balance = data.newBalance;
      const dashBalanceEl = document.getElementById('wallet-balance');
      if (dashBalanceEl) dashBalanceEl.textContent = data.newBalance.toFixed(2) + '$';
    }
    const reservedEventId = currentEventReserve.eventId;
    closeEventReserveForm();
    showToast('Réservation confirmée', 'success');
    eventsCache = null;
    openEventDetail(reservedEventId);
  } catch (e) {
    errEl.textContent = e.message || 'Une erreur est survenue.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmer la réservation';
  }
}

async function loadMyEventTickets() {
  const listEl = document.getElementById('events-mytickets-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small">Connecte-toi pour voir tes réservations.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('event_tickets').where('buyerUid', '==', currentUser.uid).get();
    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tickets.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (tickets.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore réservé aucun billet.</p>';
      return;
    }
    listEl.innerHTML = tickets.map(t => {
      const isPast = t.eventStartDate && new Date(t.eventStartDate).getTime() < Date.now();
      const canCancel = t.status === 'confirmed' && !isPast;
      return `
      <div class="order-box" style="margin-bottom:12px">
        <strong>${escapeHtml(t.eventTitle || 'Événement')}</strong>
        <div class="muted small" style="margin:4px 0">${escapeHtml(t.ticketTypeName || '')} × ${t.quantity || 1} — ${(t.amountPaid || 0) === 0 ? 'Gratuit' : (t.amountPaid || 0).toFixed(2) + '$'}</div>
        <div class="muted small" style="margin-bottom:8px">Statut : ${t.status === 'cancelled' ? 'Annulée' : 'Confirmée'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="openEventDetail('${t.eventId}')">Voir l'événement</button>
          ${canCancel ? `<button class="btn btn-outline btn-sm" style="color:var(--red)" onclick="cancelEventTicket('${t.id}')">Annuler</button>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function cancelEventTicket(ticketId) {
  if (!confirm('Annuler cette réservation ? Si elle était payante, le montant sera remboursé sur ton solde.')) return;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const resp = await fetch('/api/payments-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, action: 'event_cancel', ticketId })
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || "L'annulation a échoué.");

    if (typeof data.newBalance === 'number') {
      currentUser.balance = data.newBalance;
      const dashBalanceEl = document.getElementById('wallet-balance');
      if (dashBalanceEl) dashBalanceEl.textContent = data.newBalance.toFixed(2) + '$';
    }
    showToast('Réservation annulée', 'success');
    loadMyEventTickets();
  } catch (e) {
    showToast(e.message || 'Une erreur est survenue.', 'error');
  }
}

async function loadMyOrganizedEvents() {
  const listEl = document.getElementById('events-myevents-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small">Connecte-toi pour gérer tes événements.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('events').where('ownerUid', '==', currentUser.uid).get();
    myEventsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    myEventsCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (myEventsCache.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore publié aucun événement.</p>';
      return;
    }
    listEl.innerHTML = myEventsCache.map(e => {
      const sold = (e.ticketTypes || []).reduce((sum, t) => sum + (t.quantitySold || 0), 0);
      return `
      <div class="order-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong>${escapeHtml(e.title || 'Événement')}</strong>
          <span class="shop-card-category">${e.status === 'active' ? 'Actif' : 'Annulé'}</span>
        </div>
        <div class="muted small" style="margin:4px 0">${escapeHtml(eventDateRangeLabel(e))} · ${sold} billet(s) vendu(s)</div>
        <button class="btn btn-outline btn-sm" onclick="openEventDetail('${e.id}')">Gérer</button>
      </div>`;
    }).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function openEventAttendees(eventId) {
  const bodyEl = document.getElementById('event-detail-body');
  bodyEl.innerHTML = `
    <button class="menu-back-btn" onclick="openEventDetail('${eventId}')" aria-label="Retour" style="margin-bottom:10px">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <h3 style="margin-bottom:12px">Réservations</h3>
    <div id="event-attendees-list"><p class="muted small">Chargement...</p></div>`;

  try {
    const snap = await db.collection('event_tickets').where('eventId', '==', eventId).get();
    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tickets.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const listEl = document.getElementById('event-attendees-list');

    if (tickets.length === 0) {
      listEl.innerHTML = '<p class="muted small">Aucune réservation pour l\'instant.</p>';
      return;
    }
    listEl.innerHTML = tickets.map(t => `
      <div class="order-box" style="margin-bottom:10px">
        <strong>${escapeHtml(t.buyerName || 'Participant')}</strong>
        <div class="muted small">${escapeHtml(t.ticketTypeName || '')} × ${t.quantity || 1} — ${(t.amountPaid || 0) === 0 ? 'Gratuit' : (t.amountPaid || 0).toFixed(2) + '$'}</div>
        <div class="muted small">Statut : ${t.status === 'cancelled' ? 'Annulée' : 'Confirmée'}</div>
      </div>`).join('');
  } catch (e) {
    document.getElementById('event-attendees-list').innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

/* ================= COEURNOH TRAVEL =================
   Sur le meme modele que "Evenements & Billetterie" : n'importe quel
   utilisateur connecte peut publier un lieu ("travel_spots"), pas
   seulement l'admin -- ce n'est pas un annuaire officiel CoeurNoh, mais un
   espace ouvert de bons plans/lieux partages par la communaute.
   IMPORTANT (transparence, pas de fausse fonctionnalite) : il n'existe pas
   ici de reservation reelle d'hotel ni de paiement en ligne -- une vraie
   reservation d'hotel/vol necessiterait une API de voyage payante (type
   Amadeus, Booking.com Affiliate...) qui n'est pas configuree. Ce service
   met donc en relation directe (WhatsApp / site web) entre le voyageur et
   l'etablissement, exactement comme "Pres de chez vous" le fait deja pour
   les professionnels -- aucune donnee ni reservation n'est simulee. */
let travelCache = null;
let travelFavoritesCache = null; // Set des spotId déjà en favoris pour l'utilisateur courant
let travelMyCache = null;
let travelCurrentTab = 'browse';
let travelSelectedCategory = '';
let travelSearchDebounce = null;
let editingTravelSpotId = null;

const TRAVEL_CATEGORY_LABELS = {
  hotel: 'Hôtel', restaurant: 'Restaurant', site: 'Site touristique',
  activite: 'Activité', bon_plan: 'Bon plan'
};

function openTravelScreen() {
  showMenuScreen('travel');
  setTravelTab(travelCurrentTab || 'browse');
}

function setTravelTab(tab) {
  travelCurrentTab = tab;
  document.querySelectorAll('#travel-main-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  ['browse', 'favorites', 'mine'].forEach(t => {
    document.getElementById('travel-tab-' + t).classList.toggle('hidden', t !== tab);
  });

  if (tab === 'browse') loadTravelSpots();
  else if (tab === 'favorites') loadTravelFavorites();
  else if (tab === 'mine') loadMyTravelSpots();
}

async function loadTravelSpots() {
  const listEl = document.getElementById('travel-browse-list');
  if (!travelCache) listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('travel_spots').where('status', '==', 'active').limit(300).get();
    travelCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    travelCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    runTravelFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function setTravelCategory(cat) {
  travelSelectedCategory = cat;
  document.querySelectorAll('#travel-category-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
  runTravelFilter();
}

function scheduleTravelSearch() {
  clearTimeout(travelSearchDebounce);
  travelSearchDebounce = setTimeout(runTravelFilter, 250);
}

function runTravelFilter() {
  if (!travelCache) return;
  const query = document.getElementById('travel-search-input').value.trim().toLowerCase();
  const matches = travelCache.filter(s => {
    if (travelSelectedCategory && s.category !== travelSelectedCategory) return false;
    if (query) {
      const haystack = `${s.title || ''} ${s.city || ''} ${s.country || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  renderTravelBrowseList(matches);
}

function renderTravelBrowseList(list) {
  renderTravelCards(list, 'travel-browse-list', "Aucun résultat pour l'instant. Sois le premier à publier un lieu ou un bon plan.");
}

function renderTravelCards(list, targetId, emptyMessage) {
  const listEl = document.getElementById(targetId);
  const visible = list.filter(s => !blockedSet.has(s.ownerUid));

  if (visible.length === 0) {
    listEl.innerHTML = `<p class="muted small" style="text-align:center;padding:20px 0">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  listEl.innerHTML = visible.map(s => `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(s.title || 'Lieu')}</strong>
        <span class="shop-card-category" style="white-space:nowrap">${escapeHtml(TRAVEL_CATEGORY_LABELS[s.category] || s.category || '—')}</span>
      </div>
      <div class="muted small" style="margin:4px 0">${escapeHtml([s.city, s.country].filter(Boolean).join(', ') || '—')}</div>
      ${s.priceIndication ? `<div class="muted small" style="margin-bottom:8px">${escapeHtml(s.priceIndication)}</div>` : ''}
      <button class="btn btn-outline btn-sm" onclick="openTravelDetail('${s.id}')">Voir les détails</button>
    </div>`).join('');
}

async function openTravelDetail(spotId) {
  let spot = (travelCache || []).find(s => s.id === spotId) || (travelMyCache || []).find(s => s.id === spotId);
  if (!spot) {
    try {
      const doc = await db.collection('travel_spots').doc(spotId).get();
      if (!doc.exists) { showToast('Ce lieu n\'existe plus', 'error'); return; }
      spot = { id: doc.id, ...doc.data() };
    } catch (e) { showToast(friendlyErrorMessage(e), 'error'); return; }
  }
  if (document.getElementById('travel-detail-modal')) return;

  let isFavorited = false;
  if (currentUser) {
    if (!travelFavoritesCache) {
      try {
        const favSnap = await db.collection('travel_favorites').where('uid', '==', currentUser.uid).get();
        travelFavoritesCache = new Set(favSnap.docs.map(d => d.data().spotId));
      } catch (e) { travelFavoritesCache = new Set(); }
    }
    isFavorited = travelFavoritesCache.has(spotId);
  }

  const photos = Array.isArray(spot.photos) ? spot.photos.filter(Boolean) : [];
  const waLink = spot.whatsapp ? `https://wa.me/${spot.whatsapp.replace(/\D/g, '')}` : null;

  const html = `
    <div class="modal-overlay" id="travel-detail-modal">
      <div class="modal" style="max-width:480px">
        <button class="modal-close" onclick="document.getElementById('travel-detail-modal').remove()" aria-label="Fermer">×</button>
        <div class="muted small" style="margin-bottom:4px">${escapeHtml(TRAVEL_CATEGORY_LABELS[spot.category] || spot.category || '—')}</div>
        <h3 style="margin-bottom:4px">${escapeHtml(spot.title || 'Lieu')}</h3>
        <p class="muted small" style="margin-bottom:12px">${escapeHtml([spot.city, spot.country].filter(Boolean).join(', '))}</p>
        ${spot.priceIndication ? `<p class="small" style="margin-bottom:10px"><strong>${escapeHtml(spot.priceIndication)}</strong></p>` : ''}
        ${spot.description ? `<p class="small" style="margin-bottom:14px">${escapeHtml(spot.description)}</p>` : ''}
        ${photos.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${photos.map((p, i) => `<a href="${escapeHtml(p)}" target="_blank" class="muted small" style="display:inline-flex;align-items:center;gap:4px">${ICON_LINK} Photo ${i + 1}</a>`).join('')}</div>` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${waLink ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(waLink)}" target="_blank">${ICON_WHATSAPP} WhatsApp</a>` : ''}
          ${spot.website ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(spot.website)}" target="_blank">${ICON_LINK} Site web</a>` : ''}
        </div>

        <button class="btn ${isFavorited ? 'btn-outline' : 'btn-primary'}" id="travel-fav-btn" style="width:100%;justify-content:center" onclick="toggleTravelFavorite('${spot.id}')">${isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
        ${currentUser && currentUser.uid !== spot.ownerUid ? `<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px" onclick="openReportModal('${spot.id}', '${spot.ownerUid}', 'travel_spot')">Signaler ce lieu</button>` : ''}
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function toggleTravelFavorite(spotId) {
  if (!currentUser) { openAuth('login'); return; }
  const favRef = db.collection('travel_favorites').doc(`${spotId}_${currentUser.uid}`);
  const btn = document.getElementById('travel-fav-btn');
  if (btn) btn.disabled = true;
  try {
    if (travelFavoritesCache && travelFavoritesCache.has(spotId)) {
      await favRef.delete();
      travelFavoritesCache.delete(spotId);
      if (btn) { btn.textContent = 'Ajouter aux favoris'; btn.classList.remove('btn-outline'); btn.classList.add('btn-primary'); }
      showToast('Retiré des favoris', 'info');
    } else {
      await favRef.set({ spotId, uid: currentUser.uid, createdAt: new Date().toISOString() });
      if (!travelFavoritesCache) travelFavoritesCache = new Set();
      travelFavoritesCache.add(spotId);
      if (btn) { btn.textContent = 'Retirer des favoris'; btn.classList.add('btn-outline'); btn.classList.remove('btn-primary'); }
      showToast('Ajouté aux favoris', 'success');
    }
    if (travelCurrentTab === 'favorites') loadTravelFavorites();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadTravelFavorites() {
  const listEl = document.getElementById('travel-favorites-list');
  if (!currentUser) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour voir tes favoris.</p>';
    return;
  }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const favSnap = await db.collection('travel_favorites').where('uid', '==', currentUser.uid).get();
    const favDocs = favSnap.docs.slice().sort((a, b) => (b.data().createdAt || '').localeCompare(a.data().createdAt || ''));
    travelFavoritesCache = new Set(favDocs.map(d => d.data().spotId));

    if (favDocs.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucun favori pour l\'instant. Touche « Ajouter aux favoris » sur un lieu qui t\'intéresse.</p>';
      return;
    }

    const spotDocs = await Promise.all(favDocs.map(d => db.collection('travel_spots').doc(d.data().spotId).get()));
    const spots = spotDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
    renderTravelCards(spots, 'travel-favorites-list', "Aucun favori pour l'instant. Touche « Ajouter aux favoris » sur un lieu qui t'intéresse.");
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadMyTravelSpots() {
  const listEl = document.getElementById('travel-mine-list');
  if (!currentUser) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour publier un lieu.</p>';
    return;
  }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('travel_spots').where('ownerUid', '==', currentUser.uid).get();
    travelMyCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    travelMyCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (travelMyCache.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore rien publié.</p>';
      return;
    }

    listEl.innerHTML = travelMyCache.map(s => `
      <div class="order-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong style="font-size:1.02rem">${escapeHtml(s.title)}</strong>
          <span class="shop-card-category">${s.status === 'active' ? 'Visible' : 'Masqué'}</span>
        </div>
        <div class="muted small" style="margin:4px 0">${escapeHtml(TRAVEL_CATEGORY_LABELS[s.category] || s.category || '—')} · ${escapeHtml([s.city, s.country].filter(Boolean).join(', '))}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <button class="btn btn-outline btn-sm" onclick="openTravelForm('${s.id}')">Modifier</button>
          <button class="btn btn-outline btn-sm" onclick="toggleTravelSpotStatus('${s.id}', '${s.status === 'active' ? 'inactive' : 'active'}')">${s.status === 'active' ? 'Masquer' : 'Réactiver'}</button>
          <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red)" onclick="deleteTravelSpot('${s.id}')">Supprimer</button>
        </div>
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function openTravelForm(spotId) {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('travel-form-modal')) return;
  editingTravelSpotId = spotId || null;
  const existing = editingTravelSpotId ? (travelMyCache || []).find(s => s.id === editingTravelSpotId) : null;

  const catOptions = Object.entries(TRAVEL_CATEGORY_LABELS)
    .map(([val, label]) => `<option value="${val}" ${existing && existing.category === val ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');

  const html = `
    <div class="modal-overlay" id="travel-form-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('travel-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">${existing ? 'Modifier le lieu' : 'Publier un lieu / bon plan'}</h3>
        <div class="field">
          <label for="travel-title">Titre</label>
          <input type="text" id="travel-title" class="text-input" maxlength="100" value="${existing ? escapeHtml(existing.title || '') : ''}">
        </div>
        <div class="field">
          <label for="travel-category">Catégorie</label>
          <select id="travel-category" class="select-input">${catOptions}</select>
        </div>
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1">
            <label for="travel-city">Ville</label>
            <input type="text" id="travel-city" class="text-input" maxlength="60" value="${existing ? escapeHtml(existing.city || '') : ''}">
          </div>
          <div class="field" style="flex:1">
            <label for="travel-country">Pays</label>
            <input type="text" id="travel-country" class="text-input" maxlength="60" value="${existing ? escapeHtml(existing.country || '') : ''}">
          </div>
        </div>
        <div class="field">
          <label for="travel-description">Description</label>
          <textarea id="travel-description" class="text-input" rows="3" style="resize:vertical" maxlength="500">${existing ? escapeHtml(existing.description || '') : ''}</textarea>
        </div>
        <div class="field">
          <label for="travel-price">Indication de prix (facultatif)</label>
          <input type="text" id="travel-price" class="text-input" placeholder="ex: à partir de 30$/nuit" maxlength="80" value="${existing ? escapeHtml(existing.priceIndication || '') : ''}">
        </div>
        <div class="field">
          <label for="travel-whatsapp">WhatsApp de contact</label>
          <input type="tel" id="travel-whatsapp" class="text-input" placeholder="+243..." value="${existing ? escapeHtml(existing.whatsapp || '') : ''}">
        </div>
        <div class="field">
          <label for="travel-website">Site web (facultatif)</label>
          <input type="url" id="travel-website" class="text-input" placeholder="https://..." value="${existing ? escapeHtml(existing.website || '') : ''}">
        </div>
        <label class="field-label" style="display:block">Photos — liens (facultatif, 5 max)</label>
        <div id="travel-photo-rows"></div>
        <button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin:6px 0 14px" onclick="addTravelPhotoRow()">+ Ajouter un lien photo</button>

        <button class="btn btn-primary" id="travel-save-btn" style="width:100%;justify-content:center" onclick="saveTravelSpot()">${existing ? 'Enregistrer les modifications' : 'Publier'}</button>
        <p class="muted small" id="travel-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const existingPhotos = existing && Array.isArray(existing.photos) && existing.photos.length > 0 ? existing.photos : [''];
  existingPhotos.forEach(p => addTravelPhotoRow(p));
}

function addTravelPhotoRow(value) {
  const rowsEl = document.getElementById('travel-photo-rows');
  if (rowsEl.children.length >= 5) return;
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <input type="url" class="text-input travel-photo-link" placeholder="https://..." value="${escapeHtml(value || '')}" style="flex:1">
    <button type="button" class="invoice-row-remove" onclick="this.parentElement.remove()" aria-label="Retirer">×</button>`;
  rowsEl.appendChild(row);
}

async function saveTravelSpot() {
  const btn = document.getElementById('travel-save-btn');
  const msgEl = document.getElementById('travel-form-msg');
  const title = document.getElementById('travel-title').value.trim();
  const category = document.getElementById('travel-category').value;
  const city = document.getElementById('travel-city').value.trim();
  const country = document.getElementById('travel-country').value.trim();
  const description = document.getElementById('travel-description').value.trim();
  const priceIndication = document.getElementById('travel-price').value.trim();
  const whatsapp = document.getElementById('travel-whatsapp').value.trim();
  const website = document.getElementById('travel-website').value.trim();
  const photos = Array.from(document.querySelectorAll('.travel-photo-link'))
    .map(inp => inp.value.trim()).filter(v => v.startsWith('http')).slice(0, 5);

  if (!title || !city || !whatsapp) {
    msgEl.textContent = 'Merci de remplir au moins le titre, la ville et le WhatsApp.';
    return;
  }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  try {
    const payload = { title, category, city, country, description, priceIndication, whatsapp, website: website || null, photos };
    if (editingTravelSpotId) {
      await db.collection('travel_spots').doc(editingTravelSpotId).update(payload);
      showToast('Lieu mis à jour', 'success');
    } else {
      await db.collection('travel_spots').add({
        ...payload, ownerUid: currentUser.uid, ownerName: currentUser.name || 'Utilisateur',
        status: 'active', createdAt: new Date().toISOString()
      });
      showToast('Lieu publié', 'success');
    }
    document.getElementById('travel-form-modal').remove();
    travelCache = null;
    if (travelCurrentTab === 'browse') loadTravelSpots();
    if (travelCurrentTab === 'mine') loadMyTravelSpots();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = editingTravelSpotId ? 'Enregistrer les modifications' : 'Publier';
  }
}

async function toggleTravelSpotStatus(spotId, newStatus) {
  try {
    await db.collection('travel_spots').doc(spotId).update({ status: newStatus });
    showToast(newStatus === 'active' ? 'Lieu réactivé' : 'Lieu masqué', 'success');
    travelCache = null;
    loadMyTravelSpots();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function deleteTravelSpot(spotId) {
  if (!confirm('Supprimer définitivement cette publication ?')) return;
  try {
    await db.collection('travel_spots').doc(spotId).delete();
    showToast('Publication supprimée', 'info');
    travelCache = null;
    loadMyTravelSpots();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= RESERVATION EN LIGNE =================
   Reutilise entierement les fiches professionnelles de "Pres de chez vous"
   (directory_listings) -- un professionnel qui active "bookingEnabled" sur
   sa fiche (jours, horaires, duree de creneau, services) devient reservable
   ici. Aucune nouvelle fiche, aucun doublon avec l'Annuaire/Pres de chez
   vous : ce service ajoute juste la logique de calendrier par-dessus.
   Un rendez-vous ("bookings") a un id deterministe
   "{proUid}_{date}_{heureDebut}" : ca empeche mathematiquement deux
   personnes de reserver le meme creneau (la transaction Firestore echoue
   proprement sur le second essai au lieu de creer un conflit). */
let bookingCurrentTab = 'find';
let bookingSearchDebounce = null;
let bookingProsCache = null;
let bookingSelectedProUid = null;
let bookingSelectedDate = null;
let bookingSelectedSlot = null;

function openBookingScreen() {
  showMenuScreen('booking');
  setBookingTab(bookingCurrentTab || 'find');
}

function setBookingTab(tab) {
  bookingCurrentTab = tab;
  document.querySelectorAll('#booking-main-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  ['find', 'mine', 'received'].forEach(t => {
    document.getElementById('booking-tab-' + t).classList.toggle('hidden', t !== tab);
  });

  if (tab === 'find') loadBookableProfessionals();
  else if (tab === 'mine') loadMyBookings();
  else if (tab === 'received') loadReceivedBookings();
}

/* ---- Onglet "Trouver un pro" ---- */

async function loadBookableProfessionals() {
  const listEl = document.getElementById('booking-find-list');
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    await fetchAllListings();
    bookingProsCache = (directoryCache || []).filter(f => f.bookingEnabled);
    runBookingSearch();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function scheduleBookingSearch() {
  clearTimeout(bookingSearchDebounce);
  bookingSearchDebounce = setTimeout(runBookingSearch, 250);
}

function runBookingSearch() {
  if (!bookingProsCache) return;
  const query = document.getElementById('booking-search-input').value.trim().toLowerCase();
  const matches = query
    ? bookingProsCache.filter(f => `${f.profession || ''} ${f.name || ''} ${f.city || ''}`.toLowerCase().includes(query))
    : bookingProsCache;
  renderBookableProfessionals(matches);
}

function renderBookableProfessionals(list) {
  const listEl = document.getElementById('booking-find-list');
  const visible = list.filter(f => !blockedSet.has(f.ownerUid));

  if (visible.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucun professionnel n\'accepte encore les réservations en ligne. Reviens bientôt, ou active-le sur ta propre fiche dans « Près de chez vous ».</p>';
    return;
  }

  listEl.innerHTML = visible.map(f => `
    <div class="order-box" style="margin-bottom:12px">
      <strong style="font-size:1.02rem">${escapeHtml(f.name || 'Professionnel')}</strong>
      <div class="muted small" style="margin:4px 0">${escapeHtml(f.profession || '—')}${f.city ? ' · ' + escapeHtml(f.city) : ''}</div>
      <button class="btn btn-outline btn-sm" onclick="openBookingFlow('${f.ownerUid}')">Réserver</button>
    </div>`).join('');
}

/* ---- Parcours de reservation : service -> date -> creneau -> confirmation ---- */

function openBookingFlow(proUid) {
  if (!currentUser) { openAuth('login'); return; }
  const pro = (bookingProsCache || (directoryCache || [])).find(f => f.ownerUid === proUid);
  if (!pro) { showToast('Professionnel introuvable', 'error'); return; }
  if (document.getElementById('booking-flow-modal')) return;

  bookingSelectedProUid = proUid;
  bookingSelectedDate = null;
  bookingSelectedSlot = null;

  const services = Array.isArray(pro.services) && pro.services.length > 0 ? pro.services : [{ name: 'Rendez-vous général', price: '' }];
  const todayStr = new Date().toISOString().slice(0, 10);

  const html = `
    <div class="modal-overlay" id="booking-flow-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('booking-flow-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:4px">Réserver chez ${escapeHtml(pro.name || 'ce professionnel')}</h3>
        <p class="muted small" style="margin-bottom:14px">${escapeHtml(pro.profession || '')}</p>

        <div class="field">
          <label for="booking-service-select">Service</label>
          <select id="booking-service-select" class="select-input">
            ${services.map((s, i) => `<option value="${i}">${escapeHtml(s.name)}${s.price ? ' — ' + escapeHtml(s.price) : ''}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="booking-date-input">Date</label>
          <input type="date" id="booking-date-input" class="text-input" min="${todayStr}" onchange="loadAvailableSlots('${proUid}')">
        </div>

        <div id="booking-slots-container"></div>

        <button class="btn btn-primary" id="booking-confirm-btn" style="width:100%;justify-content:center;margin-top:10px" disabled onclick="confirmBooking()">Choisis un créneau</button>
        <p class="muted small" id="booking-flow-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(min) {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

async function loadAvailableSlots(proUid) {
  const date = document.getElementById('booking-date-input').value;
  const containerEl = document.getElementById('booking-slots-container');
  const confirmBtn = document.getElementById('booking-confirm-btn');
  bookingSelectedSlot = null;
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Choisis un créneau';
  if (!date) { containerEl.innerHTML = ''; return; }

  const pro = (bookingProsCache || []).find(f => f.ownerUid === proUid);
  if (!pro) return;

  // Convertit getDay() (0=dimanche) vers notre indexation (0=lundi..6=dimanche)
  const jsDay = new Date(date + 'T00:00:00').getDay();
  const myDayIndex = (jsDay + 6) % 7;
  if (!(pro.bookingDays || []).includes(myDayIndex)) {
    containerEl.innerHTML = '<p class="muted small">Ce professionnel n\'est pas disponible ce jour-là.</p>';
    return;
  }

  containerEl.innerHTML = '<p class="muted small">Chargement des créneaux...</p>';
  try {
    const duration = pro.slotDuration || 30;
    const startMin = timeToMinutes(pro.bookingStart || '08:00');
    const endMin = timeToMinutes(pro.bookingEnd || '17:00');
    const allSlots = [];
    for (let t = startMin; t + duration <= endMin; t += duration) allSlots.push(minutesToTime(t));

    const snap = await db.collection('bookings')
      .where('proUid', '==', proUid)
      .where('date', '==', date)
      .get();
    const taken = new Set(snap.docs.map(d => d.data()).filter(b => b.status !== 'cancelled').map(b => b.startTime));

    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const available = allSlots.filter(t => !taken.has(t) && !(isToday && timeToMinutes(t) <= nowMin));

    if (available.length === 0) {
      containerEl.innerHTML = '<p class="muted small">Aucun créneau disponible ce jour-là. Essaie une autre date.</p>';
      return;
    }

    containerEl.innerHTML = `
      <label class="field-label" style="display:block;margin-top:10px">Créneaux disponibles</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${available.map(t => `<button type="button" class="btn btn-outline btn-sm" data-slot="${t}" onclick="selectBookingSlot('${t}', ${duration})">${t}</button>`).join('')}
      </div>`;
  } catch (e) {
    containerEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function selectBookingSlot(startTime, duration) {
  bookingSelectedSlot = { startTime, endTime: minutesToTime(timeToMinutes(startTime) + duration) };
  document.querySelectorAll('#booking-slots-container button').forEach(btn => {
    btn.classList.toggle('btn-primary', btn.dataset.slot === startTime);
    btn.classList.toggle('btn-outline', btn.dataset.slot !== startTime);
  });
  const confirmBtn = document.getElementById('booking-confirm-btn');
  confirmBtn.disabled = false;
  confirmBtn.textContent = `Confirmer pour ${startTime}`;
}

async function confirmBooking() {
  const btn = document.getElementById('booking-confirm-btn');
  const msgEl = document.getElementById('booking-flow-msg');
  const date = document.getElementById('booking-date-input').value;
  const serviceIdx = parseInt(document.getElementById('booking-service-select').value, 10);
  const pro = (bookingProsCache || []).find(f => f.ownerUid === bookingSelectedProUid);
  if (!pro || !date || !bookingSelectedSlot) return;
  const services = Array.isArray(pro.services) && pro.services.length > 0 ? pro.services : [{ name: 'Rendez-vous général', price: '' }];
  const service = services[serviceIdx] || services[0];

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Réservation...';
  msgEl.textContent = '';

  const bookingRef = db.collection('bookings').doc(`${bookingSelectedProUid}_${date}_${bookingSelectedSlot.startTime}`);
  try {
    await db.runTransaction(async tx => {
      const existing = await tx.get(bookingRef);
      if (existing.exists && existing.data().status !== 'cancelled') {
        throw new Error('Ce créneau vient d\'être pris par quelqu\'un d\'autre, choisis-en un autre.');
      }
      tx.set(bookingRef, {
        proUid: bookingSelectedProUid, proName: pro.name || 'Professionnel',
        clientUid: currentUser.uid, clientName: currentUser.name || 'Client',
        serviceName: service.name, servicePrice: service.price || '',
        date, startTime: bookingSelectedSlot.startTime, endTime: bookingSelectedSlot.endTime,
        status: 'confirmed', createdAt: new Date().toISOString()
      });
    });

    await db.collection('notifications').add({
      uid: bookingSelectedProUid, title: 'Nouvelle réservation 📅',
      body: `${currentUser.name || 'Un client'} a réservé "${service.name}" le ${new Date(date).toLocaleDateString('fr-FR')} à ${bookingSelectedSlot.startTime}.`,
      type: 'booking', read: false, createdAt: new Date().toISOString()
    });
    notifyUserPush(bookingSelectedProUid, 'Nouvelle réservation 📅', `${currentUser.name || 'Un client'} a réservé le ${new Date(date).toLocaleDateString('fr-FR')} à ${bookingSelectedSlot.startTime}.`);

    document.getElementById('booking-flow-modal').remove();
    showToast('Réservation confirmée', 'success');
    if (bookingCurrentTab === 'mine') loadMyBookings();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e) || e.message;
    btn.disabled = false;
    btn.textContent = `Confirmer pour ${bookingSelectedSlot.startTime}`;
  }
}

/* ---- "Mes réservations" (cote client) et "Rendez-vous reçus" (cote pro) ---- */

function renderBookingsList(list, targetId, emptyMessage, isProSide) {
  const listEl = document.getElementById(targetId);
  if (list.length === 0) {
    listEl.innerHTML = `<p class="muted small" style="text-align:center;padding:20px 0">${escapeHtml(emptyMessage)}</p>`;
    return;
  }
  const now = new Date();
  listEl.innerHTML = list.map(b => {
    const isPast = new Date(`${b.date}T${b.endTime}`) < now;
    const statusLabel = b.status === 'cancelled' ? 'Annulée' : (isPast ? 'Terminée' : 'Confirmée');
    return `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(b.serviceName || 'Rendez-vous')}</strong>
        <span class="shop-card-category">${statusLabel}</span>
      </div>
      <div class="muted small" style="margin:4px 0">${escapeHtml(isProSide ? b.clientName : b.proName)}</div>
      <div class="muted small">${new Date(b.date).toLocaleDateString('fr-FR')} · ${escapeHtml(b.startTime)} — ${escapeHtml(b.endTime)}</div>
      ${(!isPast && b.status !== 'cancelled') ? `<button class="btn btn-outline btn-sm" style="margin-top:8px;color:var(--red);border-color:var(--red)" onclick="cancelBooking('${b.id}')">Annuler</button>` : ''}
    </div>`;
  }).join('');
}

async function loadMyBookings() {
  const listEl = document.getElementById('booking-mine-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour voir tes réservations.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('bookings').where('clientUid', '==', currentUser.uid).get();
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
    renderBookingsList(bookings, 'booking-mine-list', 'Aucune réservation pour l\'instant.', false);
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadReceivedBookings() {
  const listEl = document.getElementById('booking-received-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour voir tes rendez-vous.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('bookings').where('proUid', '==', currentUser.uid).get();
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
    renderBookingsList(bookings, 'booking-received-list', 'Aucun rendez-vous reçu pour l\'instant.', true);
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function cancelBooking(bookingId) {
  if (!confirm('Annuler ce rendez-vous ?')) return;
  try {
    await db.collection('bookings').doc(bookingId).update({ status: 'cancelled' });
    showToast('Rendez-vous annulé', 'info');
    if (bookingCurrentTab === 'mine') loadMyBookings();
    else loadReceivedBookings();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= COEURNOH ACADEMY =================
   "courses" (creee par n'importe quel utilisateur -- pas de "profil
   formateur" a creer, meme logique legere que les autres services) avec un
   tableau "chapters" integre au document (titre, type de contenu, lien ou
   texte). "course_enrollments" = une inscription par personne et par cours
   (id deterministe "{courseId}_{uid}").

   SECURITE : une inscription GRATUITE peut s'ecrire directement depuis le
   client (regles Firestore : amountPaid doit valoir 0). Une inscription
   PAYANTE passe par le serveur (/api/payments-actions, action
   "course_enroll") pour deduire le solde et payer le formateur en toute
   securite -- exactement comme la reservation d'un evenement payant. La
   progression (chapitres termines) est modifiable uniquement par
   l'etudiant sur SA PROPRE inscription (regle Firestore : le champ
   "completedChapters" uniquement). */
const COURSE_LEVEL_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

let academyCache = null;
let academyCurrentTab = 'browse';
let academySearchDebounce = null;
let myTaughtCoursesCache = null;
let editingCourseId = null;
let courseChapterRowCounter = 0;
let currentCourseEnroll = null; // { courseId, courseTitle, price }

function openAcademyScreen() {
  showMenuScreen('academy');
  setAcademyTab(academyCurrentTab || 'browse');
}

function setAcademyTab(tab) {
  academyCurrentTab = tab;
  document.querySelectorAll('#academy-main-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  ['browse', 'mycourses', 'myteaching'].forEach(t => {
    document.getElementById('academy-tab-' + t).classList.toggle('hidden', t !== tab);
  });

  if (tab === 'browse') loadCourses();
  else if (tab === 'mycourses') loadMyEnrolledCourses();
  else if (tab === 'myteaching') loadMyTaughtCourses();
}

async function loadCourses() {
  const listEl = document.getElementById('academy-browse-list');
  if (!academyCache) listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('courses').where('status', '==', 'active').limit(300).get();
    academyCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    runAcademyFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function scheduleAcademySearch() {
  clearTimeout(academySearchDebounce);
  academySearchDebounce = setTimeout(runAcademyFilter, 250);
}

function runAcademyFilter() {
  if (!academyCache) return;
  const query = document.getElementById('academy-search-input').value.trim().toLowerCase();
  const matches = query
    ? academyCache.filter(c => `${c.title || ''} ${c.category || ''}`.toLowerCase().includes(query))
    : academyCache;
  renderAcademyBrowseList(matches);
}

function coursePriceLabel(c) {
  return (c.price || 0) === 0 ? 'Gratuit' : `${c.price}$`;
}

function renderAcademyBrowseList(list) {
  const listEl = document.getElementById('academy-browse-list');
  const visible = list.filter(c => !blockedSet.has(c.ownerUid));
  if (visible.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucun cours pour l\'instant. Sois le premier à en publier un.</p>';
    return;
  }
  listEl.innerHTML = visible.map(c => `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(c.title || 'Cours')}</strong>
        <span class="shop-card-category">${escapeHtml(c.category || '—')}</span>
      </div>
      <div class="muted small" style="margin:4px 0">${COURSE_LEVEL_LABELS[c.level] || ''} · ${(c.chapters || []).length} chapitre(s) · ${c.studentsCount || 0} étudiant(s)</div>
      <div class="muted small" style="margin-bottom:10px">${coursePriceLabel(c)}</div>
      <button class="btn btn-outline btn-sm" onclick="openCourseDetail('${c.id}')">Voir le cours</button>
    </div>`).join('');
}

async function openCourseDetail(courseId) {
  const bodyEl = document.getElementById('course-detail-body');
  bodyEl.innerHTML = '<p class="muted small">Chargement...</p>';
  document.getElementById('course-detail-modal').classList.remove('hidden');

  try {
    const snap = await db.collection('courses').doc(courseId).get();
    if (!snap.exists) {
      bodyEl.innerHTML = '<p class="muted small">Ce cours n\'existe plus.</p>';
      return;
    }
    const c = { id: snap.id, ...snap.data() };
    const isOwner = currentUser && currentUser.uid === c.ownerUid;
    const chapters = c.chapters || [];

    let enrollment = null;
    if (!isOwner && currentUser) {
      const enrSnap = await db.collection('course_enrollments').doc(`${courseId}_${currentUser.uid}`).get();
      if (enrSnap.exists) enrollment = enrSnap.data();
    }

    let ownerActionsHtml = '';
    if (isOwner) {
      ownerActionsHtml = `
        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openCourseStudents('${c.id}')">Voir les étudiants (${c.studentsCount || 0})</button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openCourseForm('${c.id}')">Modifier le cours</button>
        ${c.status === 'active'
          ? `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleCourseStatus('${c.id}', 'closed')">Clôturer le cours</button>`
          : `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleCourseStatus('${c.id}', 'active')">Réactiver le cours</button>`}
        <button class="btn btn-outline" style="width:100%;justify-content:center;color:var(--red)" onclick="deleteCourse('${c.id}')">Supprimer le cours</button>`;
    }

    let chaptersHtml;
    if (isOwner || enrollment) {
      const completed = (enrollment && enrollment.completedChapters) || [];
      chaptersHtml = chapters.map((ch, i) => {
        const done = completed.includes(ch.id);
        const contentHtml = ch.contentType === 'video' || ch.contentType === 'document'
          ? `<a href="${escapeHtml(ch.content || '')}" target="_blank" class="btn btn-outline btn-sm" style="margin:6px 0">${ch.contentType === 'video' ? 'Voir la vidéo' : 'Voir le document'}</a>`
          : `<p style="white-space:pre-wrap;margin:6px 0">${escapeHtml(ch.content || '')}</p>`;
        return `<div class="order-box" style="margin-bottom:8px">
          <strong>${i + 1}. ${escapeHtml(ch.title || 'Chapitre')}</strong>
          ${contentHtml}
          ${enrollment ? `<button class="btn btn-outline btn-sm" onclick="toggleChapterComplete('${c.id}', '${ch.id}', ${done})">${done ? '✓ Terminé' : 'Marquer comme terminé'}</button>` : ''}
        </div>`;
      }).join('') || '<p class="muted small">Aucun chapitre pour l\'instant.</p>';
    } else {
      chaptersHtml = chapters.map((ch, i) => `<div class="order-box" style="margin-bottom:8px"><strong>${i + 1}. ${escapeHtml(ch.title || 'Chapitre')}</strong></div>`).join('')
        || '<p class="muted small">Aucun chapitre pour l\'instant.</p>';
    }

    let enrollActionHtml = '';
    if (!isOwner) {
      if (!currentUser) {
        enrollActionHtml = `<button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="openAuth('register')">Se connecter pour s'inscrire</button>`;
      } else if (enrollment) {
        const total = chapters.length || 1;
        const pct = Math.round(((enrollment.completedChapters || []).length / total) * 100);
        enrollActionHtml = `<p class="muted small" style="margin-top:10px">Inscrit(e) — progression : <strong>${pct}%</strong></p>`;
      } else if (c.status !== 'active') {
        enrollActionHtml = `<p class="muted small" style="margin-top:10px">Ce cours n'accepte plus d'inscriptions.</p>`;
      } else {
        enrollActionHtml = `<button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="openCourseEnroll('${c.id}', '${escapeHtml(c.title || '')}', ${c.price || 0})">S'inscrire${(c.price || 0) > 0 ? ' — ' + c.price + '$' : ' gratuitement'}</button>`;
      }
    }

    bodyEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <h3 style="margin:0">${escapeHtml(c.title || 'Cours')}</h3>
        <span class="shop-card-category">${escapeHtml(c.category || '—')}</span>
      </div>
      <div class="muted small" style="margin-bottom:10px">${COURSE_LEVEL_LABELS[c.level] || ''} · ${coursePriceLabel(c)}</div>
      <p style="white-space:pre-wrap;margin-bottom:16px">${escapeHtml(c.description || '')}</p>
      <h4 style="margin-bottom:8px">Chapitres</h4>
      ${chaptersHtml}
      ${enrollActionHtml}
      <div style="margin-top:14px">${ownerActionsHtml}</div>
      ${!isOwner && currentUser ? `<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px" onclick="openReportModal('${c.id}', '${c.ownerUid}', 'course')">Signaler ce cours</button>` : ''}
    `;
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function closeCourseDetail() {
  document.getElementById('course-detail-modal').classList.add('hidden');
}

/* ---- Formulaire de creation / modification ---- */
function openCourseForm(courseId = null) {
  if (!currentUser) { openAuth('register'); return; }
  editingCourseId = courseId;
  document.getElementById('course-form-error').classList.add('hidden');
  document.getElementById('course-form-title').textContent = courseId ? 'Modifier le cours' : 'Créer un cours';
  document.getElementById('course-form-submit-btn').textContent = courseId ? 'Enregistrer' : 'Publier';
  document.getElementById('course-chapters-list').innerHTML = '';

  const fill = (c) => {
    document.getElementById('course-title-input').value = c.title || '';
    document.getElementById('course-category-input').value = c.category || '';
    document.getElementById('course-level-select').value = c.level || 'debutant';
    document.getElementById('course-description-input').value = c.description || '';
    document.getElementById('course-cover-input').value = c.coverImage || '';
    document.getElementById('course-price-input').value = c.price || 0;
    (c.chapters || []).forEach(ch => addCourseChapterRow(ch));
    if (!c.chapters || c.chapters.length === 0) addCourseChapterRow();
  };

  if (courseId) {
    const cached = (academyCache || []).find(c => c.id === courseId) || (myTaughtCoursesCache || []).find(c => c.id === courseId);
    if (cached) {
      fill(cached);
    } else {
      db.collection('courses').doc(courseId).get().then(snap => { if (snap.exists) fill(snap.data()); });
    }
  } else {
    document.getElementById('course-title-input').value = '';
    document.getElementById('course-category-input').value = '';
    document.getElementById('course-level-select').value = 'debutant';
    document.getElementById('course-description-input').value = '';
    document.getElementById('course-cover-input').value = '';
    document.getElementById('course-price-input').value = 0;
    addCourseChapterRow();
  }

  document.getElementById('course-form-modal').classList.remove('hidden');
}

function closeCourseForm() {
  document.getElementById('course-form-modal').classList.add('hidden');
  editingCourseId = null;
}

// Un chapitre existant garde son id (necessaire pour que la progression
// deja enregistree par les etudiants reste valide apres modification).
function addCourseChapterRow(existing = null) {
  courseChapterRowCounter++;
  const rowId = 'cch-' + courseChapterRowCounter;
  const chapterId = existing && existing.id ? existing.id : 'ch-' + Date.now().toString(36) + courseChapterRowCounter;

  const row = document.createElement('div');
  row.id = rowId;
  row.dataset.chapterId = chapterId;
  row.className = 'order-box';
  row.style.cssText = 'margin-bottom:8px';
  row.innerHTML = `
    <input type="text" class="text-input course-ch-title" placeholder="Titre du chapitre" style="margin-bottom:6px" value="${existing ? escapeHtml(existing.title || '') : ''}">
    <select class="text-input course-ch-type" style="margin-bottom:6px">
      <option value="texte" ${existing && existing.contentType === 'texte' ? 'selected' : ''}>Texte</option>
      <option value="video" ${existing && existing.contentType === 'video' ? 'selected' : ''}>Lien vidéo</option>
      <option value="document" ${existing && existing.contentType === 'document' ? 'selected' : ''}>Lien document</option>
    </select>
    <textarea class="text-input course-ch-content" rows="2" placeholder="Texte du chapitre, ou lien https://...">${existing ? escapeHtml(existing.content || '') : ''}</textarea>
    <button type="button" class="btn btn-outline btn-sm" style="margin-top:6px" onclick="document.getElementById('${rowId}').remove()">Retirer ce chapitre</button>`;
  document.getElementById('course-chapters-list').appendChild(row);
}

function collectCourseChaptersFromForm() {
  return Array.from(document.querySelectorAll('#course-chapters-list > div')).map((row, i) => ({
    id: row.dataset.chapterId,
    title: row.querySelector('.course-ch-title').value.trim() || `Chapitre ${i + 1}`,
    contentType: row.querySelector('.course-ch-type').value,
    content: row.querySelector('.course-ch-content').value.trim(),
    order: i
  })).filter(ch => ch.content);
}

async function saveCourse() {
  const errEl = document.getElementById('course-form-error');
  errEl.classList.add('hidden');

  const title = document.getElementById('course-title-input').value.trim();
  const category = document.getElementById('course-category-input').value.trim();
  const level = document.getElementById('course-level-select').value;
  const description = document.getElementById('course-description-input').value.trim();
  const coverImage = document.getElementById('course-cover-input').value.trim();
  const price = parseFloat(document.getElementById('course-price-input').value) || 0;
  const chapters = collectCourseChaptersFromForm();

  if (!title || !description) {
    errEl.textContent = 'Merci de remplir au moins le titre et la description.';
    errEl.classList.remove('hidden');
    return;
  }
  if (chapters.length === 0) {
    errEl.textContent = 'Ajoute au moins un chapitre avec du contenu.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('course-form-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Envoi...';

  try {
    const payload = { title, category, level, description, coverImage: coverImage || null, price, chapters };
    if (editingCourseId) {
      await db.collection('courses').doc(editingCourseId).update(payload);
      showToast('Cours mis à jour', 'success');
    } else {
      await db.collection('courses').add({
        ...payload,
        ownerUid: currentUser.uid,
        ownerName: currentUser.name || 'Utilisateur',
        status: 'active',
        studentsCount: 0,
        createdAt: new Date().toISOString()
      });
      showToast('Cours publié', 'success');
    }
    closeCourseForm();
    academyCache = null;
    if (academyCurrentTab === 'browse') loadCourses();
    if (academyCurrentTab === 'myteaching') loadMyTaughtCourses();
  } catch (e) {
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function toggleCourseStatus(courseId, newStatus) {
  try {
    await db.collection('courses').doc(courseId).update({ status: newStatus });
    showToast(newStatus === 'active' ? 'Cours réactivé' : 'Cours clôturé', 'success');
    academyCache = null;
    closeCourseDetail();
    loadMyTaughtCourses();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function deleteCourse(courseId) {
  if (!confirm('Supprimer définitivement ce cours ? Les étudiants déjà inscrits ne pourront plus y accéder.')) return;
  try {
    await db.collection('courses').doc(courseId).delete();
    showToast('Cours supprimé', 'success');
    academyCache = null;
    closeCourseDetail();
    loadMyTaughtCourses();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ---- Inscription (gratuite = client, payante = serveur) ---- */
function openCourseEnroll(courseId, courseTitle, price) {
  if (!currentUser) { openAuth('register'); return; }
  currentCourseEnroll = { courseId, courseTitle, price };
  document.getElementById('course-enroll-summary').textContent = price > 0
    ? `"${courseTitle}" — ${price}$ seront déduits de ton solde.`
    : `"${courseTitle}" — inscription gratuite.`;
  document.getElementById('course-enroll-error').classList.add('hidden');
  document.getElementById('course-enroll-modal').classList.remove('hidden');
}

function closeCourseEnrollModal() {
  document.getElementById('course-enroll-modal').classList.add('hidden');
  currentCourseEnroll = null;
}

async function submitCourseEnrollment() {
  const errEl = document.getElementById('course-enroll-error');
  errEl.classList.add('hidden');
  if (!currentUser || !currentCourseEnroll) { closeCourseEnrollModal(); return; }

  const { courseId, price } = currentCourseEnroll;
  const btn = document.getElementById('course-enroll-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Inscription...';

  try {
    if (price > 0) {
      // Paiement securise cote serveur, meme mecanisme que les billets d'evenements payants.
      const idToken = await auth.currentUser.getIdToken();
      const resp = await fetch('/api/payments-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, action: 'course_enroll', courseId })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "L'inscription a échoué.");
      if (typeof data.newBalance === 'number') {
        currentUser.balance = data.newBalance;
        const walletBalanceEl = document.getElementById('wallet-balance');
        if (walletBalanceEl) walletBalanceEl.textContent = data.newBalance.toFixed(2) + '$';
      }
    } else {
      // Cours gratuit : ecriture directe, sans risque (pas de solde en jeu,
      // et l'id deterministe empeche une double inscription).
      const courseSnap = await db.collection('courses').doc(courseId).get();
      if (!courseSnap.exists) throw new Error('OFFER_GONE');
      const course = courseSnap.data();

      await db.collection('course_enrollments').doc(`${courseId}_${currentUser.uid}`).set({
        courseId, courseTitle: course.title || '', courseOwnerUid: course.ownerUid,
        studentUid: currentUser.uid, studentName: currentUser.name || 'Utilisateur',
        completedChapters: [], amountPaid: 0, createdAt: new Date().toISOString()
      });
      db.collection('courses').doc(courseId).update({
        studentsCount: firebase.firestore.FieldValue.increment(1)
      }).catch(() => {});

      const title = 'Nouvel étudiant inscrit 📚';
      const body = `${currentUser.name || "Quelqu'un"} s'est inscrit(e) à "${course.title || ''}".`;
      db.collection('notifications').add({
        uid: course.ownerUid, title, body, type: 'course_enrollment', read: false,
        url: '/?open=' + courseId, createdAt: new Date().toISOString()
      }).catch(() => {});
      notifyUserPush(course.ownerUid, title, body, 'activity', '/?open=' + courseId);
    }

    closeCourseEnrollModal();
    showToast('Inscription confirmée', 'success');
    openCourseDetail(courseId);
  } catch (e) {
    if (e.message === 'OFFER_GONE') {
      errEl.textContent = "Ce cours n'existe plus.";
    } else if (e.code === 'permission-denied') {
      errEl.textContent = 'Tu es déjà inscrit(e) à ce cours.';
    } else {
      errEl.textContent = e.message || friendlyErrorMessage(e);
    }
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirmer l'inscription";
  }
}

async function toggleChapterComplete(courseId, chapterId, currentlyDone) {
  if (!currentUser) return;
  const enrRef = db.collection('course_enrollments').doc(`${courseId}_${currentUser.uid}`);
  try {
    const snap = await enrRef.get();
    if (!snap.exists) return;
    const completed = snap.data().completedChapters || [];
    const updated = currentlyDone ? completed.filter(id => id !== chapterId) : [...completed, chapterId];
    await enrRef.update({ completedChapters: updated });
    openCourseDetail(courseId);
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function loadMyEnrolledCourses() {
  const listEl = document.getElementById('academy-mycourses-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small">Connecte-toi pour voir tes cours.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('course_enrollments').where('studentUid', '==', currentUser.uid).get();
    const enrollments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    enrollments.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (enrollments.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'es inscrit(e) à aucun cours pour l\'instant.</p>';
      return;
    }
    listEl.innerHTML = enrollments.map(en => `
      <div class="order-box" style="margin-bottom:12px">
        <strong>${escapeHtml(en.courseTitle || 'Cours')}</strong>
        <div class="muted small" style="margin:4px 0">${(en.completedChapters || []).length} chapitre(s) terminé(s)</div>
        <button class="btn btn-outline btn-sm" onclick="openCourseDetail('${en.courseId}')">Continuer</button>
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadMyTaughtCourses() {
  const listEl = document.getElementById('academy-myteaching-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small">Connecte-toi pour gérer tes cours.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('courses').where('ownerUid', '==', currentUser.uid).get();
    myTaughtCoursesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    myTaughtCoursesCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (myTaughtCoursesCache.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore publié aucun cours.</p>';
      return;
    }
    listEl.innerHTML = myTaughtCoursesCache.map(c => `
      <div class="order-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong>${escapeHtml(c.title || 'Cours')}</strong>
          <span class="shop-card-category">${c.status === 'active' ? 'Actif' : 'Clôturé'}</span>
        </div>
        <div class="muted small" style="margin:4px 0">${c.studentsCount || 0} étudiant(s)</div>
        <button class="btn btn-outline btn-sm" onclick="openCourseDetail('${c.id}')">Gérer</button>
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function openCourseStudents(courseId) {
  const bodyEl = document.getElementById('course-detail-body');
  bodyEl.innerHTML = `
    <button class="menu-back-btn" onclick="openCourseDetail('${courseId}')" aria-label="Retour" style="margin-bottom:10px">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <h3 style="margin-bottom:12px">Étudiants</h3>
    <div id="course-students-list"><p class="muted small">Chargement...</p></div>`;

  try {
    const courseSnap = await db.collection('courses').doc(courseId).get();
    const totalChapters = courseSnap.exists ? (courseSnap.data().chapters || []).length || 1 : 1;
    const snap = await db.collection('course_enrollments').where('courseId', '==', courseId).get();
    const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    students.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const listEl = document.getElementById('course-students-list');

    if (students.length === 0) {
      listEl.innerHTML = '<p class="muted small">Aucun étudiant inscrit pour l\'instant.</p>';
      return;
    }
    listEl.innerHTML = students.map(s => {
      const pct = Math.round(((s.completedChapters || []).length / totalChapters) * 100);
      return `<div class="order-box" style="margin-bottom:10px">
        <strong>${escapeHtml(s.studentName || 'Étudiant')}</strong>
        <div class="muted small">Progression : ${pct}%${(s.amountPaid || 0) > 0 ? ` · ${s.amountPaid.toFixed(2)}$ payés` : ' · gratuit'}</div>
      </div>`;
    }).join('');
  } catch (e) {
    document.getElementById('course-students-list').innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

/* ================= COEURNOH IMMO =================
   Sur le meme modele que "CoeurNoh Travel" et "Evenements" : n'importe quel
   utilisateur connecte peut publier une annonce ("properties"), pas
   seulement l'admin. Favoris dans une collection dediee "property_favorites"
   (meme principe que "travel_favorites", pour ne pas polluer le systeme
   generique "Enregistrements" qui est specifique aux publications de la
   Boutique).
   TRANSPARENCE : aucune transaction immobiliere reelle ni paiement de depot
   ne se fait ici -- comme pour Travel, c'est une mise en relation directe
   (WhatsApp) entre l'acheteur/locataire et le proprietaire/l'agence. */
let immoCache = null;
let immoFavoritesCache = null;
let immoMyCache = null;
let immoCurrentTab = 'browse';
let immoSelectedTransaction = '';
let immoSelectedType = '';
let immoSearchDebounce = null;
let editingImmoId = null;

const IMMO_TYPE_LABELS = {
  maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain', local_commercial: 'Local commercial'
};
const IMMO_TRANSACTION_LABELS = { vente: 'À vendre', location: 'À louer' };
const IMMO_STATUS_LABELS = { disponible: 'Disponible', vendu: 'Vendu', loue: 'Loué' };

function openImmoScreen() {
  showMenuScreen('immo');
  setImmoTab(immoCurrentTab || 'browse');
}

function setImmoTab(tab) {
  immoCurrentTab = tab;
  document.querySelectorAll('#immo-main-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  ['browse', 'favorites', 'mine'].forEach(t => {
    document.getElementById('immo-tab-' + t).classList.toggle('hidden', t !== tab);
  });

  if (tab === 'browse') loadImmoProperties();
  else if (tab === 'favorites') loadImmoFavorites();
  else if (tab === 'mine') loadMyImmoProperties();
}

async function loadImmoProperties() {
  const listEl = document.getElementById('immo-browse-list');
  if (!immoCache) listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('properties').where('status', '==', 'disponible').limit(300).get();
    immoCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    immoCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    runImmoFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function setImmoTransaction(tx) {
  immoSelectedTransaction = tx;
  document.querySelectorAll('#immo-transaction-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.tx === tx));
  runImmoFilter();
}
function setImmoType(type) {
  immoSelectedType = type;
  document.querySelectorAll('#immo-type-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
  runImmoFilter();
}
function scheduleImmoSearch() {
  clearTimeout(immoSearchDebounce);
  immoSearchDebounce = setTimeout(runImmoFilter, 250);
}

function runImmoFilter() {
  if (!immoCache) return;
  const query = document.getElementById('immo-search-input').value.trim().toLowerCase();
  const matches = immoCache.filter(p => {
    if (immoSelectedTransaction && p.transactionType !== immoSelectedTransaction) return false;
    if (immoSelectedType && p.propertyType !== immoSelectedType) return false;
    if (query && !`${p.title || ''} ${p.city || ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
  renderImmoCards(matches, 'immo-browse-list', "Aucune annonce pour l'instant. Sois le premier à publier.");
}

function renderImmoCards(list, targetId, emptyMessage) {
  const listEl = document.getElementById(targetId);
  const visible = list.filter(p => !blockedSet.has(p.ownerUid));

  if (visible.length === 0) {
    listEl.innerHTML = `<p class="muted small" style="text-align:center;padding:20px 0">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  listEl.innerHTML = visible.map(p => {
    const details = [];
    if (p.bedrooms) details.push(`${p.bedrooms} ch.`);
    if (p.bathrooms) details.push(`${p.bathrooms} sdb`);
    if (p.surfaceArea) details.push(escapeHtml(p.surfaceArea));
    return `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.02rem">${escapeHtml(p.title || 'Bien immobilier')}</strong>
        <span class="shop-card-category" style="white-space:nowrap">${escapeHtml(IMMO_TRANSACTION_LABELS[p.transactionType] || '')}</span>
      </div>
      <div class="muted small" style="margin:4px 0">${escapeHtml(IMMO_TYPE_LABELS[p.propertyType] || p.propertyType || '—')} · ${escapeHtml(p.city || '—')}</div>
      ${details.length ? `<div class="muted small" style="margin-bottom:6px">${details.join(' · ')}</div>` : ''}
      <strong style="display:block;margin-bottom:8px">${(p.price || 0).toLocaleString('fr-FR')} ${escapeHtml(p.currency || 'USD')}${p.transactionType === 'location' ? ' / mois' : ''}</strong>
      <button class="btn btn-outline btn-sm" onclick="openImmoDetail('${p.id}')">Voir les détails</button>
    </div>`;
  }).join('');
}

async function openImmoDetail(propertyId) {
  let p = (immoCache || []).find(x => x.id === propertyId) || (immoMyCache || []).find(x => x.id === propertyId);
  if (!p) {
    try {
      const doc = await db.collection('properties').doc(propertyId).get();
      if (!doc.exists) { showToast('Cette annonce n\'existe plus', 'error'); return; }
      p = { id: doc.id, ...doc.data() };
    } catch (e) { showToast(friendlyErrorMessage(e), 'error'); return; }
  }
  if (document.getElementById('immo-detail-modal')) return;

  let isFavorited = false;
  if (currentUser) {
    if (!immoFavoritesCache) {
      try {
        const favSnap = await db.collection('property_favorites').where('uid', '==', currentUser.uid).get();
        immoFavoritesCache = new Set(favSnap.docs.map(d => d.data().propertyId));
      } catch (e) { immoFavoritesCache = new Set(); }
    }
    isFavorited = immoFavoritesCache.has(propertyId);
  }

  const photos = Array.isArray(p.photos) ? p.photos.filter(Boolean) : [];
  const waLink = p.whatsapp ? `https://wa.me/${p.whatsapp.replace(/\D/g, '')}` : null;
  const details = [];
  if (p.bedrooms) details.push(`${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''}`);
  if (p.bathrooms) details.push(`${p.bathrooms} salle${p.bathrooms > 1 ? 's' : ''} de bain`);
  if (p.surfaceArea) details.push(escapeHtml(p.surfaceArea));

  const html = `
    <div class="modal-overlay" id="immo-detail-modal">
      <div class="modal" style="max-width:480px">
        <button class="modal-close" onclick="document.getElementById('immo-detail-modal').remove()" aria-label="Fermer">×</button>
        <div class="muted small" style="margin-bottom:4px">${escapeHtml(IMMO_TRANSACTION_LABELS[p.transactionType] || '')} · ${escapeHtml(IMMO_TYPE_LABELS[p.propertyType] || '')}</div>
        <h3 style="margin-bottom:4px">${escapeHtml(p.title || 'Bien immobilier')}</h3>
        <p class="muted small" style="margin-bottom:10px">${escapeHtml(p.city || '')}</p>
        <strong style="display:block;font-size:1.15rem;margin-bottom:10px">${(p.price || 0).toLocaleString('fr-FR')} ${escapeHtml(p.currency || 'USD')}${p.transactionType === 'location' ? ' / mois' : ''}</strong>
        ${details.length ? `<p class="small" style="margin-bottom:10px">${details.join(' · ')}</p>` : ''}
        ${p.description ? `<p class="small" style="margin-bottom:14px">${escapeHtml(p.description)}</p>` : ''}
        ${photos.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${photos.map((ph, i) => `<a href="${escapeHtml(ph)}" target="_blank" class="muted small" style="display:inline-flex;align-items:center;gap:4px">${ICON_LINK} Photo ${i + 1}</a>`).join('')}</div>` : ''}

        ${waLink ? `<a class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:10px" href="${escapeHtml(waLink)}" target="_blank">${ICON_WHATSAPP} Contacter sur WhatsApp</a>` : ''}
        <button class="btn ${isFavorited ? 'btn-outline' : 'btn-primary'}" id="immo-fav-btn" style="width:100%;justify-content:center" onclick="toggleImmoFavorite('${p.id}')">${isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function toggleImmoFavorite(propertyId) {
  if (!currentUser) { openAuth('login'); return; }
  const favRef = db.collection('property_favorites').doc(`${propertyId}_${currentUser.uid}`);
  const btn = document.getElementById('immo-fav-btn');
  if (btn) btn.disabled = true;
  try {
    if (immoFavoritesCache && immoFavoritesCache.has(propertyId)) {
      await favRef.delete();
      immoFavoritesCache.delete(propertyId);
      if (btn) { btn.textContent = 'Ajouter aux favoris'; btn.classList.remove('btn-outline'); btn.classList.add('btn-primary'); }
      showToast('Retiré des favoris', 'info');
    } else {
      await favRef.set({ propertyId, uid: currentUser.uid, createdAt: new Date().toISOString() });
      if (!immoFavoritesCache) immoFavoritesCache = new Set();
      immoFavoritesCache.add(propertyId);
      if (btn) { btn.textContent = 'Retirer des favoris'; btn.classList.add('btn-outline'); btn.classList.remove('btn-primary'); }
      showToast('Ajouté aux favoris', 'success');
    }
    if (immoCurrentTab === 'favorites') loadImmoFavorites();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadImmoFavorites() {
  const listEl = document.getElementById('immo-favorites-list');
  if (!currentUser) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour voir tes favoris.</p>';
    return;
  }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const favSnap = await db.collection('property_favorites').where('uid', '==', currentUser.uid).get();
    const favDocs = favSnap.docs.slice().sort((a, b) => (b.data().createdAt || '').localeCompare(a.data().createdAt || ''));
    immoFavoritesCache = new Set(favDocs.map(d => d.data().propertyId));

    if (favDocs.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucun favori pour l\'instant.</p>';
      return;
    }
    const propDocs = await Promise.all(favDocs.map(d => db.collection('properties').doc(d.data().propertyId).get()));
    const properties = propDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
    renderImmoCards(properties, 'immo-favorites-list', "Aucun favori pour l'instant.");
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadMyImmoProperties() {
  const listEl = document.getElementById('immo-mine-list');
  if (!currentUser) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour publier une annonce.</p>';
    return;
  }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('properties').where('ownerUid', '==', currentUser.uid).get();
    immoMyCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    immoMyCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (immoMyCache.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore publié aucune annonce.</p>';
      return;
    }

    listEl.innerHTML = immoMyCache.map(p => {
      const nextStatus = p.status === 'disponible' ? (p.transactionType === 'location' ? 'loue' : 'vendu') : 'disponible';
      const nextLabel = p.status === 'disponible' ? `Marquer comme ${IMMO_STATUS_LABELS[nextStatus].toLowerCase()}` : 'Remettre disponible';
      return `
      <div class="order-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong style="font-size:1.02rem">${escapeHtml(p.title)}</strong>
          <span class="shop-card-category">${escapeHtml(IMMO_STATUS_LABELS[p.status] || p.status)}</span>
        </div>
        <div class="muted small" style="margin:4px 0">${escapeHtml(IMMO_TYPE_LABELS[p.propertyType] || '')} · ${escapeHtml(p.city || '')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <button class="btn btn-outline btn-sm" onclick="openImmoForm('${p.id}')">Modifier</button>
          <button class="btn btn-outline btn-sm" onclick="toggleImmoStatus('${p.id}', '${nextStatus}')">${nextLabel}</button>
          <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red)" onclick="deleteImmoProperty('${p.id}')">Supprimer</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function openImmoForm(propertyId) {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('immo-form-modal')) return;
  editingImmoId = propertyId || null;
  const existing = editingImmoId ? (immoMyCache || []).find(p => p.id === editingImmoId) : null;

  const typeOptions = Object.entries(IMMO_TYPE_LABELS)
    .map(([val, label]) => `<option value="${val}" ${existing && existing.propertyType === val ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');

  const html = `
    <div class="modal-overlay" id="immo-form-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('immo-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">${existing ? "Modifier l'annonce" : 'Publier une annonce'}</h3>
        <div class="field">
          <label for="immo-title">Titre</label>
          <input type="text" id="immo-title" class="text-input" maxlength="100" value="${existing ? escapeHtml(existing.title || '') : ''}">
        </div>
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1">
            <label for="immo-transaction">Transaction</label>
            <select id="immo-transaction" class="select-input">
              <option value="vente" ${existing && existing.transactionType === 'vente' ? 'selected' : ''}>À vendre</option>
              <option value="location" ${existing && existing.transactionType === 'location' ? 'selected' : ''}>À louer</option>
            </select>
          </div>
          <div class="field" style="flex:1">
            <label for="immo-type">Type de bien</label>
            <select id="immo-type" class="select-input">${typeOptions}</select>
          </div>
        </div>
        <div class="field">
          <label for="immo-city">Ville / quartier</label>
          <input type="text" id="immo-city" class="text-input" maxlength="80" value="${existing ? escapeHtml(existing.city || '') : ''}">
        </div>
        <div class="field">
          <label for="immo-price">Prix en $ ${existing && existing.transactionType === 'location' ? '(par mois)' : ''}</label>
          <input type="number" id="immo-price" class="text-input" min="0" step="1" value="${existing ? (existing.price || '') : ''}">
        </div>
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1">
            <label for="immo-bedrooms">Chambres (facultatif)</label>
            <input type="number" id="immo-bedrooms" class="text-input" min="0" value="${existing && existing.bedrooms ? existing.bedrooms : ''}">
          </div>
          <div class="field" style="flex:1">
            <label for="immo-bathrooms">Salles de bain (facultatif)</label>
            <input type="number" id="immo-bathrooms" class="text-input" min="0" value="${existing && existing.bathrooms ? existing.bathrooms : ''}">
          </div>
        </div>
        <div class="field">
          <label for="immo-surface">Superficie (facultatif)</label>
          <input type="text" id="immo-surface" class="text-input" placeholder="ex: 120 m²" value="${existing ? escapeHtml(existing.surfaceArea || '') : ''}">
        </div>
        <div class="field">
          <label for="immo-description">Description</label>
          <textarea id="immo-description" class="text-input" rows="3" style="resize:vertical" maxlength="500">${existing ? escapeHtml(existing.description || '') : ''}</textarea>
        </div>
        <div class="field">
          <label for="immo-whatsapp">WhatsApp de contact</label>
          <input type="tel" id="immo-whatsapp" class="text-input" placeholder="+243..." value="${existing ? escapeHtml(existing.whatsapp || '') : ''}">
        </div>
        <label class="field-label" style="display:block">Photos — liens (facultatif, 5 max)</label>
        <div id="immo-photo-rows"></div>
        <button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin:6px 0 14px" onclick="addImmoPhotoRow()">+ Ajouter un lien photo</button>

        <button class="btn btn-primary" id="immo-save-btn" style="width:100%;justify-content:center" onclick="saveImmoProperty()">${existing ? 'Enregistrer les modifications' : 'Publier'}</button>
        <p class="muted small" id="immo-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const existingPhotos = existing && Array.isArray(existing.photos) && existing.photos.length > 0 ? existing.photos : [''];
  existingPhotos.forEach(ph => addImmoPhotoRow(ph));
}

function addImmoPhotoRow(value) {
  const rowsEl = document.getElementById('immo-photo-rows');
  if (rowsEl.children.length >= 5) return;
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <input type="url" class="text-input immo-photo-link" placeholder="https://..." value="${escapeHtml(value || '')}" style="flex:1">
    <button type="button" class="invoice-row-remove" onclick="this.parentElement.remove()" aria-label="Retirer">×</button>`;
  rowsEl.appendChild(row);
}

async function saveImmoProperty() {
  const btn = document.getElementById('immo-save-btn');
  const msgEl = document.getElementById('immo-form-msg');
  const title = document.getElementById('immo-title').value.trim();
  const transactionType = document.getElementById('immo-transaction').value;
  const propertyType = document.getElementById('immo-type').value;
  const city = document.getElementById('immo-city').value.trim();
  const price = parseFloat(document.getElementById('immo-price').value) || 0;
  const bedrooms = parseInt(document.getElementById('immo-bedrooms').value, 10) || null;
  const bathrooms = parseInt(document.getElementById('immo-bathrooms').value, 10) || null;
  const surfaceArea = document.getElementById('immo-surface').value.trim();
  const description = document.getElementById('immo-description').value.trim();
  const whatsapp = document.getElementById('immo-whatsapp').value.trim();
  const photos = Array.from(document.querySelectorAll('.immo-photo-link'))
    .map(inp => inp.value.trim()).filter(v => v.startsWith('http')).slice(0, 5);

  if (!title || !city || !price || !whatsapp) {
    msgEl.textContent = 'Merci de remplir au moins le titre, la ville, le prix et le WhatsApp.';
    return;
  }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  try {
    const payload = {
      title, transactionType, propertyType, city, price, currency: 'USD',
      bedrooms, bathrooms, surfaceArea, description, whatsapp, photos
    };
    if (editingImmoId) {
      await db.collection('properties').doc(editingImmoId).update(payload);
      showToast('Annonce mise à jour', 'success');
    } else {
      await db.collection('properties').add({
        ...payload, ownerUid: currentUser.uid, ownerName: currentUser.name || 'Utilisateur',
        status: 'disponible', createdAt: new Date().toISOString()
      });
      showToast('Annonce publiée', 'success');
    }
    document.getElementById('immo-form-modal').remove();
    immoCache = null;
    if (immoCurrentTab === 'browse') loadImmoProperties();
    if (immoCurrentTab === 'mine') loadMyImmoProperties();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = editingImmoId ? 'Enregistrer les modifications' : 'Publier';
  }
}

async function toggleImmoStatus(propertyId, newStatus) {
  try {
    await db.collection('properties').doc(propertyId).update({ status: newStatus });
    showToast('Statut mis à jour', 'success');
    immoCache = null;
    loadMyImmoProperties();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function deleteImmoProperty(propertyId) {
  if (!confirm('Supprimer définitivement cette annonce ?')) return;
  try {
    await db.collection('properties').doc(propertyId).delete();
    showToast('Annonce supprimée', 'info');
    immoCache = null;
    loadMyImmoProperties();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= TROUVER UN PROFESSIONNEL =================
   Ce n'est PAS un doublon de l'Annuaire / "Pres de chez vous" -- c'est un
   vrai systeme de demande de service avec devis :
   1) le client publie une demande ("service_requests") ;
   2) les professionnels interesses envoient un devis ("service_quotes",
      un seul par professionnel et par demande grace a l'id deterministe
      "{requestId}_{proUid}") ;
   3) le client accepte UN devis -> la demande passe "en cours", les autres
      devis sont automatiquement refuses et le professionnel choisi est
      notifie ;
   4) une fois le service rendu, le client marque la demande "terminee" et
      peut laisser un avis ("professional_reviews").
   Categories reutilisees telles quelles depuis "Pres de chez vous"
   (NEARBY_CATEGORY_LABELS) -- aucune nouvelle taxonomie inventee. */
let srequestCurrentTab = 'mine';
let srequestMineCache = null;
let srequestAvailableCache = null;
let srequestMyQuotesCache = null;
let srequestSelectedCategory = '';
let srequestSearchDebounce = null;
let srequestMyQuotedIds = null; // Set des requestId pour lesquels j'ai deja envoye un devis

function openServiceRequestScreen() {
  showMenuScreen('srequests');
  populateSRequestCategoryTabs();
  setSRequestTab(srequestCurrentTab || 'mine');
}

function populateSRequestCategoryTabs() {
  const tabsEl = document.getElementById('srequest-category-tabs');
  if (tabsEl.dataset.populated) return;
  tabsEl.dataset.populated = '1';
  Object.entries(NEARBY_CATEGORY_LABELS).forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.dataset.cat = val;
    btn.textContent = label;
    btn.onclick = () => setSRequestCategory(val);
    tabsEl.appendChild(btn);
  });
}

function setSRequestTab(tab) {
  srequestCurrentTab = tab;
  document.querySelectorAll('#srequest-main-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  ['mine', 'available', 'myquotes'].forEach(t => document.getElementById('srequest-tab-' + t).classList.toggle('hidden', t !== tab));

  if (tab === 'mine') loadMySRequests();
  else if (tab === 'available') loadAvailableSRequests();
  else if (tab === 'myquotes') loadMyQuotes();
}

/* ---- Onglet "Mes demandes" (cote client) ---- */

function openSRequestForm() {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('srequest-form-modal')) return;

  const catOptions = Object.entries(NEARBY_CATEGORY_LABELS)
    .map(([val, label]) => `<option value="${val}">${escapeHtml(label)}</option>`).join('');

  const html = `
    <div class="modal-overlay" id="srequest-form-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('srequest-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">Nouvelle demande</h3>
        <div class="field">
          <label for="srequest-title">Ce dont tu as besoin</label>
          <input type="text" id="srequest-title" class="text-input" placeholder="ex: Réparer une fuite d'eau" maxlength="100">
        </div>
        <div class="field">
          <label for="srequest-category">Catégorie</label>
          <select id="srequest-category" class="select-input">${catOptions}</select>
        </div>
        <div class="field">
          <label for="srequest-city">Ville</label>
          <input type="text" id="srequest-city" class="text-input" maxlength="60">
        </div>
        <div class="field">
          <label for="srequest-description">Détails</label>
          <textarea id="srequest-description" class="text-input" rows="3" style="resize:vertical" maxlength="500"></textarea>
        </div>
        <div class="field">
          <label for="srequest-budget">Budget indicatif (facultatif)</label>
          <input type="text" id="srequest-budget" class="text-input" placeholder="ex: 20-30$">
        </div>
        <button class="btn btn-primary" id="srequest-save-btn" style="width:100%;justify-content:center" onclick="saveSRequest()">Publier la demande</button>
        <p class="muted small" id="srequest-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveSRequest() {
  const btn = document.getElementById('srequest-save-btn');
  const msgEl = document.getElementById('srequest-form-msg');
  const title = document.getElementById('srequest-title').value.trim();
  const category = document.getElementById('srequest-category').value;
  const city = document.getElementById('srequest-city').value.trim();
  const description = document.getElementById('srequest-description').value.trim();
  const budget = document.getElementById('srequest-budget').value.trim();

  if (!title || !city || !description) { msgEl.textContent = 'Merci de remplir au moins le titre, la ville et les détails.'; return; }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Publication...';
  try {
    await db.collection('service_requests').add({
      clientUid: currentUser.uid, clientName: currentUser.name || 'Client',
      title, category, city, description, budget,
      status: 'open', acceptedProUid: null, acceptedProName: null,
      createdAt: new Date().toISOString()
    });
    document.getElementById('srequest-form-modal').remove();
    showToast('Demande publiée', 'success');
    loadMySRequests();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Publier la demande';
  }
}

const SREQUEST_STATUS_LABELS = { open: 'Ouverte', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée' };

async function loadMySRequests() {
  const listEl = document.getElementById('srequest-mine-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour publier une demande.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('service_requests').where('clientUid', '==', currentUser.uid).get();
    srequestMineCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    srequestMineCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (srequestMineCache.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucune demande pour l\'instant.</p>';
      return;
    }

    listEl.innerHTML = srequestMineCache.map(r => `
      <div class="order-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong style="font-size:1.02rem">${escapeHtml(r.title)}</strong>
          <span class="shop-card-category">${escapeHtml(SREQUEST_STATUS_LABELS[r.status] || r.status)}</span>
        </div>
        <div class="muted small" style="margin:4px 0">${escapeHtml(NEARBY_CATEGORY_LABELS[r.category] || '')} · ${escapeHtml(r.city || '')}</div>
        ${r.status === 'in_progress' ? `<div class="muted small" style="margin-bottom:8px">Attribuée à ${escapeHtml(r.acceptedProName || '')}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          ${r.status === 'open' ? `<button class="btn btn-outline btn-sm" onclick="viewSRequestQuotes('${r.id}')">Voir les devis</button>` : ''}
          ${r.status === 'in_progress' ? `<button class="btn btn-outline btn-sm" onclick="completeSRequest('${r.id}')">Marquer terminée</button>` : ''}
          ${r.status === 'open' ? `<button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red)" onclick="cancelSRequest('${r.id}')">Annuler</button>` : ''}
        </div>
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function viewSRequestQuotes(requestId) {
  if (document.getElementById('srequest-quotes-modal')) return;
  const req = (srequestMineCache || []).find(r => r.id === requestId);
  if (!req) return;

  const html = `
    <div class="modal-overlay" id="srequest-quotes-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('srequest-quotes-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:4px">Devis reçus</h3>
        <p class="muted small" style="margin-bottom:14px">${escapeHtml(req.title)}</p>
        <div id="srequest-quotes-list"><p class="muted small">Chargement...</p></div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const listEl = document.getElementById('srequest-quotes-list');
  try {
    const snap = await db.collection('service_quotes').where('requestId', '==', requestId).get();
    const quotes = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.price || 0) - (b.price || 0));

    if (quotes.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:14px 0">Aucun devis reçu pour l\'instant.</p>';
      return;
    }

    listEl.innerHTML = quotes.map(q => `
      <div class="order-box" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong>${escapeHtml(q.proName)}</strong>
          <strong>${(q.price || 0).toFixed(2)}$</strong>
        </div>
        ${q.message ? `<p class="muted small" style="margin:4px 0">${escapeHtml(q.message)}</p>` : ''}
        <button class="btn btn-primary btn-sm" style="margin-top:6px" onclick="acceptQuote('${requestId}', '${q.proUid}', '${escapeHtml(q.proName)}')">Accepter ce devis</button>
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function acceptQuote(requestId, proUid, proName) {
  if (!confirm(`Confirmer ${proName} pour cette demande ?`)) return;
  try {
    const quotesSnap = await db.collection('service_quotes').where('requestId', '==', requestId).get();
    const batch = db.batch();
    quotesSnap.docs.forEach(d => {
      batch.update(d.ref, { status: d.data().proUid === proUid ? 'accepted' : 'declined' });
    });
    batch.update(db.collection('service_requests').doc(requestId), {
      status: 'in_progress', acceptedProUid: proUid, acceptedProName: proName
    });
    await batch.commit();

    await db.collection('notifications').add({
      uid: proUid, title: 'Devis accepté ✅', body: `Ton devis a été accepté pour une demande de service.`,
      type: 'quote_accepted', read: false, createdAt: new Date().toISOString()
    });
    notifyUserPush(proUid, 'Devis accepté ✅', 'Ton devis a été accepté pour une demande de service.');

    document.getElementById('srequest-quotes-modal').remove();
    showToast('Devis accepté', 'success');
    loadMySRequests();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function completeSRequest(requestId) {
  const req = (srequestMineCache || []).find(r => r.id === requestId);
  if (!req) return;
  if (!confirm('Marquer cette demande comme terminée ?')) return;
  try {
    await db.collection('service_requests').doc(requestId).update({ status: 'completed' });
    showToast('Demande terminée', 'success');
    loadMySRequests();
    if (req.acceptedProUid) openReviewForm(requestId, req.acceptedProUid, req.acceptedProName);
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function cancelSRequest(requestId) {
  if (!confirm('Annuler définitivement cette demande ?')) return;
  try {
    await db.collection('service_requests').doc(requestId).update({ status: 'cancelled' });
    showToast('Demande annulée', 'info');
    loadMySRequests();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

function openReviewForm(requestId, proUid, proName) {
  if (document.getElementById('review-form-modal')) return;
  const html = `
    <div class="modal-overlay" id="review-form-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('review-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:4px">Évaluer ${escapeHtml(proName)}</h3>
        <p class="muted small" style="margin-bottom:14px">Ton avis aide les autres utilisateurs.</p>
        <div class="field">
          <label for="review-rating">Note</label>
          <select id="review-rating" class="select-input">
            <option value="5">5 — Excellent</option>
            <option value="4">4 — Très bien</option>
            <option value="3">3 — Correct</option>
            <option value="2">2 — Décevant</option>
            <option value="1">1 — Mauvais</option>
          </select>
        </div>
        <div class="field">
          <label for="review-comment">Commentaire (facultatif)</label>
          <textarea id="review-comment" class="text-input" rows="3" style="resize:vertical" maxlength="300"></textarea>
        </div>
        <button class="btn btn-primary" id="review-save-btn" style="width:100%;justify-content:center" onclick="saveReview('${requestId}', '${proUid}')">Envoyer l'avis</button>
        <p class="muted small" id="review-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveReview(requestId, proUid) {
  const btn = document.getElementById('review-save-btn');
  const rating = parseInt(document.getElementById('review-rating').value, 10);
  const comment = document.getElementById('review-comment').value.trim();
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Envoi...';
  try {
    await db.collection('professional_reviews').add({
      proUid, clientUid: currentUser.uid, clientName: currentUser.name || 'Client',
      requestId, rating, comment, createdAt: new Date().toISOString()
    });
    document.getElementById('review-form-modal').remove();
    showToast('Avis envoyé, merci !', 'success');
  } catch (e) {
    document.getElementById('review-form-msg').textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = "Envoyer l'avis";
  }
}

/* ---- Onglet "Demandes à pourvoir" (cote professionnel) ---- */

async function loadAvailableSRequests() {
  const listEl = document.getElementById('srequest-available-list');
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const [reqSnap, myQuotesSnap] = await Promise.all([
      db.collection('service_requests').where('status', '==', 'open').limit(300).get(),
      currentUser ? db.collection('service_quotes').where('proUid', '==', currentUser.uid).get() : Promise.resolve(null)
    ]);
    srequestAvailableCache = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    srequestAvailableCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    srequestMyQuotedIds = new Set(myQuotesSnap ? myQuotesSnap.docs.map(d => d.data().requestId) : []);
    runSRequestFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function setSRequestCategory(cat) {
  srequestSelectedCategory = cat;
  document.querySelectorAll('#srequest-category-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.cat === cat));
  runSRequestFilter();
}
function scheduleSRequestSearch() {
  clearTimeout(srequestSearchDebounce);
  srequestSearchDebounce = setTimeout(runSRequestFilter, 250);
}

function runSRequestFilter() {
  if (!srequestAvailableCache) return;
  const query = document.getElementById('srequest-search-input').value.trim().toLowerCase();
  const matches = srequestAvailableCache.filter(r => {
    if (srequestSelectedCategory && r.category !== srequestSelectedCategory) return false;
    if (query && !`${r.title || ''} ${r.city || ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
  renderAvailableSRequests(matches);
}

function renderAvailableSRequests(list) {
  const listEl = document.getElementById('srequest-available-list');
  const visible = list.filter(r => !blockedSet.has(r.clientUid) && (!currentUser || r.clientUid !== currentUser.uid));

  if (visible.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucune demande disponible pour l\'instant dans cette catégorie.</p>';
    return;
  }

  listEl.innerHTML = visible.map(r => {
    const alreadyQuoted = srequestMyQuotedIds && srequestMyQuotedIds.has(r.id);
    return `
    <div class="order-box" style="margin-bottom:12px">
      <strong style="font-size:1.02rem">${escapeHtml(r.title)}</strong>
      <div class="muted small" style="margin:4px 0">${escapeHtml(NEARBY_CATEGORY_LABELS[r.category] || '')} · ${escapeHtml(r.city || '')}</div>
      ${r.budget ? `<div class="muted small" style="margin-bottom:6px">Budget indicatif : ${escapeHtml(r.budget)}</div>` : ''}
      <p class="muted small" style="margin-bottom:10px">${escapeHtml(r.description || '')}</p>
      ${alreadyQuoted
        ? `<span class="shop-card-category">Devis envoyé</span>`
        : `<button class="btn btn-primary btn-sm" onclick="openQuoteForm('${r.id}')">Envoyer un devis</button>`}
    </div>`;
  }).join('');
}

function openQuoteForm(requestId) {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('quote-form-modal')) return;
  const req = (srequestAvailableCache || []).find(r => r.id === requestId);
  if (!req) return;

  const html = `
    <div class="modal-overlay" id="quote-form-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('quote-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:4px">Envoyer un devis</h3>
        <p class="muted small" style="margin-bottom:14px">${escapeHtml(req.title)}</p>
        <div class="field">
          <label for="quote-price">Ton prix en $</label>
          <input type="number" id="quote-price" class="text-input" min="0" step="0.01">
        </div>
        <div class="field">
          <label for="quote-message">Message (facultatif)</label>
          <textarea id="quote-message" class="text-input" rows="3" style="resize:vertical" maxlength="300"></textarea>
        </div>
        <button class="btn btn-primary" id="quote-save-btn" style="width:100%;justify-content:center" onclick="saveQuote('${requestId}')">Envoyer le devis</button>
        <p class="muted small" id="quote-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveQuote(requestId) {
  const btn = document.getElementById('quote-save-btn');
  const msgEl = document.getElementById('quote-form-msg');
  const price = parseFloat(document.getElementById('quote-price').value);
  const message = document.getElementById('quote-message').value.trim();
  const req = (srequestAvailableCache || []).find(r => r.id === requestId);

  if (!price || price <= 0) { msgEl.textContent = 'Indique un prix valide.'; return; }
  if (!req) return;

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Envoi...';
  try {
    await db.collection('service_quotes').doc(`${requestId}_${currentUser.uid}`).set({
      requestId, proUid: currentUser.uid, proName: currentUser.name || 'Professionnel',
      price, message, status: 'pending', createdAt: new Date().toISOString()
    });

    await db.collection('notifications').add({
      uid: req.clientUid, title: 'Nouveau devis reçu 💬',
      body: `${currentUser.name || 'Un professionnel'} a envoyé un devis pour "${req.title}".`,
      type: 'new_quote', read: false, createdAt: new Date().toISOString()
    });
    notifyUserPush(req.clientUid, 'Nouveau devis reçu 💬', `Nouveau devis pour "${req.title}".`);

    document.getElementById('quote-form-modal').remove();
    if (!srequestMyQuotedIds) srequestMyQuotedIds = new Set();
    srequestMyQuotedIds.add(requestId);
    showToast('Devis envoyé', 'success');
    runSRequestFilter();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Envoyer le devis';
  }
}

/* ---- Onglet "Mes devis envoyés" ---- */

async function loadMyQuotes() {
  const listEl = document.getElementById('srequest-myquotes-list');
  if (!currentUser) { listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour voir tes devis.</p>'; return; }
  listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('service_quotes').where('proUid', '==', currentUser.uid).get();
    srequestMyQuotesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    srequestMyQuotesCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (srequestMyQuotesCache.length === 0) {
      listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Tu n\'as encore envoyé aucun devis.</p>';
      return;
    }

    const QUOTE_STATUS_LABELS = { pending: 'En attente', accepted: 'Accepté', declined: 'Refusé' };
    listEl.innerHTML = srequestMyQuotesCache.map(q => `
      <div class="order-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong>${(q.price || 0).toFixed(2)}$</strong>
          <span class="shop-card-category">${escapeHtml(QUOTE_STATUS_LABELS[q.status] || q.status)}</span>
        </div>
        ${q.message ? `<p class="muted small" style="margin-top:4px">${escapeHtml(q.message)}</p>` : ''}
      </div>`).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

/* ================= CREE TON SITE =================
   Un mini-site public par utilisateur : "mini_sites/{uid}" (un seul site,
   comme une fiche -- meme logique que directory_listings). Le lien
   partageable est "<origine>/?site=SLUG" : PAS besoin d'hebergement
   externe ni de domaine, la meme application sert la page publique. Un
   visiteur qui ouvre ce lien voit uniquement le mini-site (aucune
   connexion requise), via checkForPublicSiteView() lancee au chargement.

   L'unicite du "slug" (partie de l'URL) est garantie par une collection
   de reservation "site_slugs/{slug}" -> { ownerUid }, mise a jour dans la
   MEME transaction que le site : impossible que deux personnes se
   retrouvent avec la meme URL.

   ---- SITE PREMIUM (5$/mois, payé depuis le portefeuille interne, meme
   mecanisme que payContestEntry dans /api/payments-actions.js -- AUCUN
   deuxieme portefeuille cree) ----
   Avantages Premium : plus de photos (15 au lieu de 6), themes
   supplementaires, retrait de la mention "Cree avec Coeurnoh Universe",
   statistiques de visites, et (des que le proprietaire de la plateforme
   aura connecte un vrai nom de domaine a Vercel) une adresse personnalisee
   en sous-domaine "slug.domaine.com" en plus du lien "/?site=slug" qui
   reste gratuit et fonctionne pour tout le monde. Tant qu'aucun domaine
   n'est connecte, le code de detection de sous-domaine ci-dessous reste
   inactif (aucune casse) et pourra s'activer sans rien reecrire. */
const SITE_TEMPLATES = {
  classique: { label: 'Classique', accent: '#2563eb' },
  sombre: { label: 'Sombre', accent: '#111827' },
  chaleureux: { label: 'Chaleureux', accent: '#e11d48' },
  doux: { label: 'Doux (Premium)', accent: '#db2777', premium: true },
  nature: { label: 'Nature (Premium)', accent: '#15803d', premium: true }
};
const SITE_PREMIUM_PRICE = 5; // en $, par mois
const SITE_FREE_PHOTO_LIMIT = 6;
const SITE_PREMIUM_PHOTO_LIMIT = 15;

let mySiteCache = null;
let editingSiteExisting = null;

function siteIsPremiumActive(site) {
  return !!(site && site.premium && site.premiumUntil && new Date(site.premiumUntil).getTime() > Date.now());
}

function openSiteBuilderScreen() {
  showMenuScreen('site');
  loadMySite();
}

async function loadMySite() {
  const statusEl = document.getElementById('site-builder-status');
  if (!currentUser) {
    statusEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour créer ton site.</p>';
    return;
  }
  statusEl.innerHTML = '<p class="muted small">Chargement...</p>';
  try {
    const snap = await db.collection('mini_sites').doc(currentUser.uid).get();
    mySiteCache = snap.exists ? snap.data() : null;
    renderSiteStatusView();
  } catch (e) {
    statusEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function renderSiteStatusView() {
  const statusEl = document.getElementById('site-builder-status');
  if (!mySiteCache) {
    statusEl.innerHTML = `
      <p class="muted small" style="margin-bottom:14px">Crée gratuitement une page de présentation pour ton activité : présentation, services, photos, contact WhatsApp. Elle sera accessible via un lien que tu pourras partager partout.</p>
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="openSiteForm()">Créer mon site</button>`;
    return;
  }
  const site = mySiteCache;
  const link = `${window.location.origin}/?site=${encodeURIComponent(site.slug)}`;
  const isPremium = siteIsPremiumActive(site);
  const subdomainReady = SITE_ROOT_DOMAIN !== null; // devient vrai des qu'un domaine sera connecte a Vercel
  const subdomainLink = subdomainReady ? `https://${encodeURIComponent(site.slug)}.${SITE_ROOT_DOMAIN}` : null;

  const premiumBlockHtml = isPremium ? `
    <div class="order-box" style="margin-bottom:14px;border-color:#f5a623">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Premium actif ✨</strong>
        <span class="shop-card-category" style="background:#fff4e0;color:#b5720b">Jusqu'au ${escapeHtml(new Date(site.premiumUntil).toLocaleDateString())}</span>
      </div>
      <div class="muted small" style="margin:8px 0">${site.viewsCount || 0} visite(s) depuis la création du site</div>
      ${subdomainLink ? `<p class="muted small" style="word-break:break-all;margin-bottom:8px">Adresse perso : ${escapeHtml(subdomainLink)}</p>` : `<p class="muted small" style="margin-bottom:8px">Adresse perso en sous-domaine : bientôt disponible, dès qu'un nom de domaine sera connecté.</p>`}
      <button class="btn btn-outline btn-sm" onclick="purchaseSitePremium()">Renouveler (+30 jours, ${SITE_PREMIUM_PRICE}$)</button>
    </div>` : `
    <div class="order-box" style="margin-bottom:14px">
      <strong>Passe en Premium — ${SITE_PREMIUM_PRICE}$/mois</strong>
      <ul class="muted small" style="margin:8px 0 10px;padding-left:18px;line-height:1.6">
        <li>Jusqu'à ${SITE_PREMIUM_PHOTO_LIMIT} photos (au lieu de ${SITE_FREE_PHOTO_LIMIT})</li>
        <li>Thèmes supplémentaires</li>
        <li>Aucune mention "Créé avec Coeurnoh Universe"</li>
        <li>Statistiques de visites</li>
        <li>Adresse perso en sous-domaine (dès qu'un domaine sera connecté)</li>
      </ul>
      <button class="btn btn-primary btn-sm" onclick="purchaseSitePremium()">Activer le Premium</button>
    </div>`;

  statusEl.innerHTML = `
    <div class="order-box" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong style="font-size:1.05rem">${escapeHtml(site.businessName || 'Mon site')}</strong>
        <span class="shop-card-category">${site.status === 'published' ? 'Publié' : 'Brouillon'}</span>
      </div>
      <p class="muted small" id="site-link-text" style="margin:8px 0;word-break:break-all">${escapeHtml(link)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="copySiteLink()">Copier le lien</button>
        <a class="btn btn-outline btn-sm" href="${escapeHtml(link)}" target="_blank">Aperçu</a>
      </div>
    </div>
    ${premiumBlockHtml}
    <button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openSiteForm()">Modifier mon site</button>
    ${site.status === 'published'
      ? `<button class="btn btn-outline" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleSitePublish('draft')">Dépublier</button>`
      : `<button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="toggleSitePublish('published')">Publier mon site</button>`}
    <button class="btn btn-outline" style="width:100%;justify-content:center;color:var(--red)" onclick="deleteMySite()">Supprimer mon site</button>`;
}

/* SITE_ROOT_DOMAIN reste "null" tant qu'aucun nom de domaine n'est connecte
   au projet Vercel. Le jour ou un domaine (ex: "coeurnohboost.com") est
   ajoute et qu'un sous-domaine generique "*.coeurnohboost.com" est
   configure dans Vercel (+ le record DNS correspondant chez le
   registrar), il suffit de remplacer "null" par la chaine du domaine
   ci-dessous pour activer les adresses personnalisees -- aucun autre
   changement de code necessaire. */
const SITE_ROOT_DOMAIN = null;

async function purchaseSitePremium() {
  if (!currentUser || !mySiteCache) return;
  if (!confirm(`Activer/renouveler le Premium de ton site pour ${SITE_PREMIUM_PRICE}$ (30 jours), déduits de ton solde Coeurnoh Universe ?`)) return;
  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/payments-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, action: 'site_premium_purchase' })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Paiement impossible', 'error');
      return;
    }
    showToast('Site Premium activé 🎉', 'success');
    mySiteCache.premium = true;
    mySiteCache.premiumUntil = data.premiumUntil;
    renderSiteStatusView();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

function copySiteLink() {
  const text = document.getElementById('site-link-text').textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('Lien copié', 'success'));
}

async function toggleSitePublish(newStatus) {
  try {
    await db.collection('mini_sites').doc(currentUser.uid).update({ status: newStatus });
    mySiteCache.status = newStatus;
    showToast(newStatus === 'published' ? 'Site publié 🎉' : 'Site dépublié', 'success');
    renderSiteStatusView();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

async function deleteMySite() {
  if (!confirm('Supprimer définitivement ton site ? Le lien cessera de fonctionner.')) return;
  try {
    const slug = mySiteCache.slug;
    const batch = db.batch();
    batch.delete(db.collection('mini_sites').doc(currentUser.uid));
    if (slug) batch.delete(db.collection('site_slugs').doc(slug));
    await batch.commit();
    mySiteCache = null;
    showToast('Site supprimé', 'info');
    renderSiteStatusView();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ---- Formulaire (modal injecte dynamiquement, meme pattern que Travel) ---- */
function openSiteForm() {
  if (!currentUser) { openAuth('register'); return; }
  if (document.getElementById('site-form-modal')) return;
  editingSiteExisting = mySiteCache;
  const s = editingSiteExisting || {};
  const isPremium = siteIsPremiumActive(s);
  const photoLimit = isPremium ? SITE_PREMIUM_PHOTO_LIMIT : SITE_FREE_PHOTO_LIMIT;

  const templateOptions = Object.entries(SITE_TEMPLATES)
    .map(([val, t]) => `<option value="${val}" ${s.template === val ? 'selected' : ''} ${t.premium && !isPremium ? 'disabled' : ''}>${escapeHtml(t.label)}${t.premium && !isPremium ? ' — nécessite Premium' : ''}</option>`).join('');

  const html = `
    <div class="modal-overlay" id="site-form-modal">
      <div class="modal" style="max-width:480px">
        <button class="modal-close" onclick="document.getElementById('site-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">${editingSiteExisting ? 'Modifier mon site' : 'Créer mon site'}</h3>
        <div class="modal-error hidden" id="site-form-error"></div>

        <div class="field">
          <label for="site-slug">Adresse de ton site</label>
          <div class="muted small" style="margin-bottom:4px;word-break:break-all">${escapeHtml(window.location.origin)}/?site=<span id="site-slug-preview">${escapeHtml(s.slug || '')}</span></div>
          <input type="text" id="site-slug" class="text-input" placeholder="ex: boutique-fatou" maxlength="30" value="${escapeHtml(s.slug || '')}" oninput="document.getElementById('site-slug-preview').textContent = this.value.trim().toLowerCase()">
        </div>
        <div class="field">
          <label for="site-template">Thème</label>
          <select id="site-template" class="select-input">${templateOptions}</select>
        </div>
        <div class="field">
          <label for="site-business-name">Nom de l'activité</label>
          <input type="text" id="site-business-name" class="text-input" maxlength="80" value="${escapeHtml(s.businessName || '')}">
        </div>
        <div class="field">
          <label for="site-tagline">Phrase d'accroche</label>
          <input type="text" id="site-tagline" class="text-input" maxlength="120" placeholder="ex: Coiffure et beauté à domicile" value="${escapeHtml(s.tagline || '')}">
        </div>
        <div class="field">
          <label for="site-about">À propos</label>
          <textarea id="site-about" class="text-input" rows="3" maxlength="800">${escapeHtml(s.aboutText || '')}</textarea>
        </div>
        <div class="field">
          <label for="site-logo">Logo (lien, facultatif)</label>
          <input type="url" id="site-logo" class="text-input" placeholder="https://..." value="${escapeHtml(s.logoUrl || '')}">
        </div>
        <div class="field">
          <label for="site-cover">Image de couverture (lien, facultatif)</label>
          <input type="url" id="site-cover" class="text-input" placeholder="https://..." value="${escapeHtml(s.coverImageUrl || '')}">
        </div>

        <label class="field-label" style="display:block">Services / produits (facultatif)</label>
        <div id="site-service-rows"></div>
        <button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin:6px 0 14px" onclick="addSiteServiceRow()">+ Ajouter</button>

        <label class="field-label" style="display:block">Photos — liens (facultatif, ${photoLimit} max${isPremium ? '' : ', Premium : jusqu\'à ' + SITE_PREMIUM_PHOTO_LIMIT})</label>
        <div id="site-photo-rows"></div>
        <button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin:6px 0 14px" onclick="addSitePhotoRow(null, ${photoLimit})">+ Ajouter un lien photo</button>

        <div class="field">
          <label for="site-whatsapp">WhatsApp de contact</label>
          <input type="tel" id="site-whatsapp" class="text-input" placeholder="+243..." value="${escapeHtml(s.contactWhatsapp || '')}">
        </div>
        <div class="field">
          <label for="site-phone">Téléphone (facultatif)</label>
          <input type="tel" id="site-phone" class="text-input" value="${escapeHtml(s.contactPhone || '')}">
        </div>
        <div class="field">
          <label for="site-email">E-mail (facultatif)</label>
          <input type="email" id="site-email" class="text-input" value="${escapeHtml(s.contactEmail || '')}">
        </div>
        <div class="field">
          <label for="site-address">Adresse / ville (facultatif)</label>
          <input type="text" id="site-address" class="text-input" value="${escapeHtml(s.address || '')}">
        </div>
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1">
            <label for="site-facebook">Facebook (facultatif)</label>
            <input type="url" id="site-facebook" class="text-input" placeholder="https://..." value="${escapeHtml((s.socialLinks && s.socialLinks.facebook) || '')}">
          </div>
          <div class="field" style="flex:1">
            <label for="site-instagram">Instagram (facultatif)</label>
            <input type="url" id="site-instagram" class="text-input" placeholder="https://..." value="${escapeHtml((s.socialLinks && s.socialLinks.instagram) || '')}">
          </div>
        </div>

        <button class="btn btn-primary" id="site-form-submit-btn" style="width:100%;justify-content:center" onclick="saveMySite()">Enregistrer</button>
        <p class="muted small" id="site-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const existingServices = Array.isArray(s.services) && s.services.length > 0 ? s.services : [];
  existingServices.forEach(sv => addSiteServiceRow(sv));
  const existingPhotos = Array.isArray(s.gallery) && s.gallery.length > 0 ? s.gallery : [''];
  existingPhotos.forEach(p => addSitePhotoRow(p, photoLimit));
}

function addSiteServiceRow(service) {
  const rowsEl = document.getElementById('site-service-rows');
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <input type="text" class="text-input site-service-name" placeholder="Nom du service/produit" value="${escapeHtml(service ? service.name || '' : '')}" style="flex:2">
    <input type="text" class="text-input site-service-price" placeholder="Prix (ex: 10$)" value="${escapeHtml(service ? service.price || '' : '')}" style="flex:1">
    <button type="button" class="invoice-row-remove" onclick="this.parentElement.remove()" aria-label="Retirer">×</button>`;
  rowsEl.appendChild(row);
}

function addSitePhotoRow(value, max) {
  const rowsEl = document.getElementById('site-photo-rows');
  if (rowsEl.children.length >= (max || SITE_FREE_PHOTO_LIMIT)) return;
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <input type="url" class="text-input site-photo-link" placeholder="https://..." value="${escapeHtml(value || '')}" style="flex:1">
    <button type="button" class="invoice-row-remove" onclick="this.parentElement.remove()" aria-label="Retirer">×</button>`;
  rowsEl.appendChild(row);
}

async function saveMySite() {
  const btn = document.getElementById('site-form-submit-btn');
  const errEl = document.getElementById('site-form-error');
  const msgEl = document.getElementById('site-form-msg');
  errEl.classList.add('hidden');
  msgEl.textContent = '';

  const slug = document.getElementById('site-slug').value.trim().toLowerCase();
  const template = document.getElementById('site-template').value;
  const businessName = document.getElementById('site-business-name').value.trim();
  const tagline = document.getElementById('site-tagline').value.trim();
  const aboutText = document.getElementById('site-about').value.trim();
  const logoUrl = document.getElementById('site-logo').value.trim();
  const coverImageUrl = document.getElementById('site-cover').value.trim();
  const services = Array.from(document.querySelectorAll('#site-service-rows .invoice-item-row')).map(row => ({
    name: row.querySelector('.site-service-name').value.trim(),
    price: row.querySelector('.site-service-price').value.trim()
  })).filter(sv => sv.name);
  const isPremiumNow = siteIsPremiumActive(editingSiteExisting);
  const gallery = Array.from(document.querySelectorAll('.site-photo-link')).map(i => i.value.trim()).filter(v => v.startsWith('http')).slice(0, isPremiumNow ? SITE_PREMIUM_PHOTO_LIMIT : SITE_FREE_PHOTO_LIMIT);
  const contactWhatsapp = document.getElementById('site-whatsapp').value.trim();
  const contactPhone = document.getElementById('site-phone').value.trim();
  const contactEmail = document.getElementById('site-email').value.trim();
  const address = document.getElementById('site-address').value.trim();
  const socialLinks = {
    facebook: document.getElementById('site-facebook').value.trim() || null,
    instagram: document.getElementById('site-instagram').value.trim() || null
  };

  if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
    errEl.textContent = "L'adresse du site doit faire 3 à 30 caractères : lettres minuscules, chiffres et tirets uniquement.";
    errEl.classList.remove('hidden');
    return;
  }
  if (!businessName || !aboutText || !contactWhatsapp) {
    errEl.textContent = 'Merci de remplir au moins le nom, le "à propos" et le WhatsApp de contact.';
    errEl.classList.remove('hidden');
    return;
  }
  if (SITE_TEMPLATES[template] && SITE_TEMPLATES[template].premium && !isPremiumNow) {
    errEl.textContent = 'Ce thème est réservé aux sites Premium. Active le Premium ou choisis un autre thème.';
    errEl.classList.remove('hidden');
    return;
  }

  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';

  const uid = currentUser.uid;
  const oldSlug = editingSiteExisting ? editingSiteExisting.slug : null;
  const newSiteRef = db.collection('mini_sites').doc(uid);
  const newSlugRef = db.collection('site_slugs').doc(slug);
  const oldSlugRef = (oldSlug && oldSlug !== slug) ? db.collection('site_slugs').doc(oldSlug) : null;

  try {
    await db.runTransaction(async (tx) => {
      const [slugSnap, oldSlugSnap] = await Promise.all([
        tx.get(newSlugRef),
        oldSlugRef ? tx.get(oldSlugRef) : Promise.resolve(null)
      ]);
      if (slugSnap.exists && slugSnap.data().ownerUid !== uid) {
        throw new Error('SLUG_TAKEN');
      }
      tx.set(newSiteRef, {
        ownerUid: uid, slug, template, businessName, tagline, aboutText,
        logoUrl: logoUrl || null, coverImageUrl: coverImageUrl || null,
        services, gallery, contactWhatsapp, contactPhone, contactEmail, address, socialLinks,
        status: editingSiteExisting ? editingSiteExisting.status : 'draft',
        // "premium", "premiumUntil" et "viewsCount" ne sont jamais ecrits
        // ici (merge:true les preserve) : seul /api/payments-actions.js
        // (via l'admin SDK) et l'incrementation des vues sont autorises a
        // les toucher, jamais un enregistrement classique du formulaire.
        premium: editingSiteExisting ? (editingSiteExisting.premium || false) : false,
        premiumUntil: editingSiteExisting ? (editingSiteExisting.premiumUntil || null) : null,
        viewsCount: editingSiteExisting ? (editingSiteExisting.viewsCount || 0) : 0,
        createdAt: editingSiteExisting ? editingSiteExisting.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      tx.set(newSlugRef, { ownerUid: uid });
      if (oldSlugRef && oldSlugSnap && oldSlugSnap.exists) {
        tx.delete(oldSlugRef);
      }
    });

    document.getElementById('site-form-modal').remove();
    showToast('Site enregistré', 'success');
    editingSiteExisting = null;
    loadMySite();
  } catch (e) {
    if (e.message === 'SLUG_TAKEN') {
      errEl.textContent = 'Cette adresse est déjà utilisée par quelqu\'un d\'autre, choisis-en une autre.';
    } else {
      errEl.textContent = friendlyErrorMessage(e);
    }
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

/* ---- Vue publique (lien partageable, aucune connexion requise) ---- */
function slugFromSubdomain() {
  // Reste "null" tant que SITE_ROOT_DOMAIN est "null" (aucun domaine
  // connecte a Vercel pour l'instant) -- voir la note pres de
  // SITE_ROOT_DOMAIN plus haut.
  if (!SITE_ROOT_DOMAIN) return null;
  const host = window.location.hostname;
  const suffix = '.' + SITE_ROOT_DOMAIN;
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, -suffix.length);
  if (!sub || sub === 'www') return null;
  return sub;
}

async function checkForPublicSiteView() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('site') || slugFromSubdomain();
  if (!slug) return;

  const overlay = document.getElementById('public-site-overlay');
  overlay.innerHTML = '<p class="muted small" style="padding:40px;text-align:center">Chargement du site...</p>';
  overlay.classList.remove('hidden');

  try {
    const snap = await db.collection('mini_sites').where('slug', '==', slug).limit(1).get();
    if (snap.empty || snap.docs[0].data().status !== 'published') {
      overlay.innerHTML = '<p class="muted small" style="padding:40px;text-align:center">Ce site n\'existe pas ou n\'est plus disponible.</p>';
      return;
    }
    const siteDoc = snap.docs[0];
    renderPublicSiteHtml(siteDoc.data(), overlay);
    // Comptage des visites, best-effort : ne doit jamais bloquer ni
    // ralentir l'affichage du site pour le visiteur.
    siteDoc.ref.update({ viewsCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
  } catch (e) {
    overlay.innerHTML = `<p class="muted small" style="padding:40px;text-align:center">Erreur de chargement : ${escapeHtml(e.message)}</p>`;
  }
}

function renderPublicSiteHtml(site, overlay) {
  document.title = (site.businessName || 'Site') + ' — CoeurNoh';
  const accent = (SITE_TEMPLATES[site.template] || SITE_TEMPLATES.classique).accent;
  const waLink = site.contactWhatsapp ? `https://wa.me/${site.contactWhatsapp.replace(/\D/g, '')}` : null;
  const gallery = Array.isArray(site.gallery) ? site.gallery.filter(Boolean) : [];
  const services = Array.isArray(site.services) ? site.services.filter(s => s.name) : [];

  overlay.innerHTML = `
    <div style="max-width:640px;margin:0 auto;font-family:inherit">
      ${site.coverImageUrl ? `<img src="${escapeHtml(site.coverImageUrl)}" style="width:100%;max-height:260px;object-fit:cover;display:block">` : `<div style="height:100px;background:${accent}"></div>`}
      <div style="padding:24px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          ${site.logoUrl ? `<img src="${escapeHtml(site.logoUrl)}" style="width:64px;height:64px;border-radius:50%;object-fit:cover">` : ''}
          <div>
            <h1 style="margin:0;font-size:1.4rem">${escapeHtml(site.businessName || '')}</h1>
            ${site.tagline ? `<p class="muted small" style="margin:2px 0 0">${escapeHtml(site.tagline)}</p>` : ''}
          </div>
        </div>

        ${site.aboutText ? `<p style="white-space:pre-wrap;line-height:1.5;margin-bottom:20px">${escapeHtml(site.aboutText)}</p>` : ''}

        ${services.length > 0 ? `
          <h3 style="color:${accent};margin-bottom:10px">Services & produits</h3>
          <div style="margin-bottom:20px">${services.map(sv => `
            <div class="order-box" style="margin-bottom:8px">
              <strong>${escapeHtml(sv.name)}</strong>${sv.price ? ` — ${escapeHtml(sv.price)}` : ''}
            </div>`).join('')}</div>` : ''}

        ${gallery.length > 0 ? `
          <h3 style="color:${accent};margin-bottom:10px">Photos</h3>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">
            ${gallery.map(g => `<img src="${escapeHtml(g)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px">`).join('')}
          </div>` : ''}

        ${site.address ? `<p class="muted small" style="margin-bottom:8px">📍 ${escapeHtml(site.address)}</p>` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:20px 0">
          ${waLink ? `<a class="btn btn-primary" href="${escapeHtml(waLink)}" target="_blank">${ICON_WHATSAPP} Contacter sur WhatsApp</a>` : ''}
          ${site.contactPhone ? `<a class="btn btn-outline" href="tel:${escapeHtml(site.contactPhone)}">Appeler</a>` : ''}
          ${site.contactEmail ? `<a class="btn btn-outline" href="mailto:${escapeHtml(site.contactEmail)}">E-mail</a>` : ''}
          ${site.socialLinks && site.socialLinks.facebook ? `<a class="btn btn-outline" href="${escapeHtml(site.socialLinks.facebook)}" target="_blank">Facebook</a>` : ''}
          ${site.socialLinks && site.socialLinks.instagram ? `<a class="btn btn-outline" href="${escapeHtml(site.socialLinks.instagram)}" target="_blank">Instagram</a>` : ''}
        </div>

        ${siteIsPremiumActive(site) ? '' : `<p class="muted small" style="text-align:center;margin-top:30px">Site créé avec <a href="${escapeHtml(window.location.origin)}" style="color:${accent}">Coeurnoh Universe</a></p>`}
      </div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', checkForPublicSiteView);

/* ================= COEURNOH BUSINESS =================
   Different de "Pres de chez vous" (fiche statique orientee recherche
   locale/reservation) et de "Cree ton site" (page publique partageable
   hors de l'application) : ici c'est une PAGE D'ENTREPRISE a l'interieur
   de l'app, avec un fil d'actualites ("business_posts") que les gens
   peuvent suivre -- comme une page Facebook professionnelle. Reutilise
   directement le systeme de suivi existant ("follows" + toggleFollow(),
   deja utilise pour les vendeurs de la Boutique) : aucun nouveau systeme
   de suivi invente. Categories reutilisees depuis NEARBY_CATEGORY_LABELS
   pour rester coherent avec le reste de l'app.
   Un seul profil entreprise par utilisateur ("businesses/{uid}", meme
   principe que directory_listings et mini_sites). */
let businessCache = null;
let businessMyProfile = null;
let businessCurrentTab = 'browse';
let businessSelectedCategory = '';
let businessSearchDebounce = null;

function openBusinessScreen() {
  showMenuScreen('business');
  populateBusinessCategoryTabs();
  setBusinessTab(businessCurrentTab || 'browse');
}

function populateBusinessCategoryTabs() {
  const tabsEl = document.getElementById('business-category-tabs');
  if (tabsEl.dataset.populated) return;
  tabsEl.dataset.populated = '1';
  Object.entries(NEARBY_CATEGORY_LABELS).forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.dataset.cat = val;
    btn.textContent = label;
    btn.onclick = () => setBusinessCategory(val);
    tabsEl.appendChild(btn);
  });
}

function setBusinessTab(tab) {
  businessCurrentTab = tab;
  document.querySelectorAll('#business-main-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  ['browse', 'mine'].forEach(t => document.getElementById('business-tab-' + t).classList.toggle('hidden', t !== tab));

  if (tab === 'browse') loadBusinesses();
  else if (tab === 'mine') loadMyBusiness();
}

async function loadBusinesses() {
  const listEl = document.getElementById('business-browse-list');
  if (!businessCache) listEl.innerHTML = renderFeedSkeletons(2);
  try {
    const snap = await db.collection('businesses').where('status', '==', 'active').limit(300).get();
    businessCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    runBusinessFilter();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

function setBusinessCategory(cat) {
  businessSelectedCategory = cat;
  document.querySelectorAll('#business-category-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.cat === cat));
  runBusinessFilter();
}
function scheduleBusinessSearch() {
  clearTimeout(businessSearchDebounce);
  businessSearchDebounce = setTimeout(runBusinessFilter, 250);
}

function runBusinessFilter() {
  if (!businessCache) return;
  const query = document.getElementById('business-search-input').value.trim().toLowerCase();
  const matches = businessCache.filter(b => {
    if (businessSelectedCategory && b.category !== businessSelectedCategory) return false;
    if (query && !`${b.businessName || ''} ${NEARBY_CATEGORY_LABELS[b.category] || ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
  renderBusinessCards(matches);
}

function renderBusinessCards(list) {
  const listEl = document.getElementById('business-browse-list');
  const visible = list.filter(b => !blockedSet.has(b.ownerUid));
  if (visible.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Aucune entreprise pour l\'instant.</p>';
    return;
  }
  listEl.innerHTML = visible.map(b => `
    <div class="order-box" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        ${b.logoUrl ? `<img src="${escapeHtml(b.logoUrl)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">` : ''}
        <div>
          <strong>${escapeHtml(b.businessName || 'Entreprise')}</strong>
          <div class="muted small">${escapeHtml(NEARBY_CATEGORY_LABELS[b.category] || '')}</div>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="openBusinessDetail('${b.ownerUid}')">Voir la page</button>
    </div>`).join('');
}

async function openBusinessDetail(ownerUid) {
  if (document.getElementById('business-detail-modal')) return;
  let b = (businessCache || []).find(x => x.ownerUid === ownerUid);
  if (!b) {
    try {
      const doc = await db.collection('businesses').doc(ownerUid).get();
      if (!doc.exists) { showToast("Cette page n'existe plus", 'error'); return; }
      b = { id: doc.id, ...doc.data() };
    } catch (e) { showToast(friendlyErrorMessage(e), 'error'); return; }
  }

  const isOwn = currentUser && currentUser.uid === ownerUid;
  const isFollowing = followingSet.has(ownerUid);
  const waLink = b.whatsapp ? `https://wa.me/${b.whatsapp.replace(/\D/g, '')}` : null;
  const followBtnHtml = !isOwn && currentUser ? `
    <button class="follow-btn ${isFollowing ? 'following' : ''}" data-follow-btn="${ownerUid}"
      onclick="toggleFollow('${ownerUid}','${escapeForJs(b.businessName || '')}')">
      <span data-follow-label="${ownerUid}">${isFollowing ? 'Abonné' : '+ Suivre'}</span>
    </button>` : '';

  const html = `
    <div class="modal-overlay" id="business-detail-modal">
      <div class="modal post-detail-modal-inner">
        <button class="modal-close" onclick="document.getElementById('business-detail-modal').remove()" aria-label="Fermer">×</button>
        ${b.coverImageUrl ? `<img src="${escapeHtml(b.coverImageUrl)}" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px">` : ''}
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          ${b.logoUrl ? `<img src="${escapeHtml(b.logoUrl)}" style="width:56px;height:56px;border-radius:50%;object-fit:cover">` : ''}
          <div>
            <h3 style="margin:0">${escapeHtml(b.businessName || '')}</h3>
            <div class="muted small">${escapeHtml(NEARBY_CATEGORY_LABELS[b.category] || '')}</div>
          </div>
        </div>
        ${followBtnHtml}
        ${b.description ? `<p style="white-space:pre-wrap;margin:12px 0">${escapeHtml(b.description)}</p>` : ''}
        ${b.address ? `<p class="muted small">📍 ${escapeHtml(b.address)}</p>` : ''}
        ${b.hours ? `<p class="muted small">🕒 ${escapeHtml(b.hours)}</p>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
          ${waLink ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(waLink)}" target="_blank">${ICON_WHATSAPP} WhatsApp</a>` : ''}
          ${b.phone ? `<a class="btn btn-outline btn-sm" href="tel:${escapeHtml(b.phone)}">Appeler</a>` : ''}
        </div>
        ${!isOwn && currentUser ? `<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-bottom:10px" onclick="openReportModal('${ownerUid}', '${ownerUid}', 'business')">Signaler cette page</button>` : ''}
        <h4 style="margin:14px 0 8px">Actualités</h4>
        <div id="business-detail-posts"><p class="muted small">Chargement...</p></div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  loadBusinessPostsFeed(ownerUid, 'business-detail-posts');
}

async function loadBusinessPostsFeed(ownerUid, targetId) {
  const el = document.getElementById(targetId);
  try {
    const snap = await db.collection('business_posts').where('businessUid', '==', ownerUid).limit(30).get();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (posts.length === 0) {
      el.innerHTML = '<p class="muted small">Aucune actualité publiée pour l\'instant.</p>';
      return;
    }
    const isOwn = currentUser && currentUser.uid === ownerUid;
    el.innerHTML = posts.map(p => `
      <div class="order-box" style="margin-bottom:8px">
        ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" style="width:100%;border-radius:8px;margin-bottom:8px">` : ''}
        <p style="white-space:pre-wrap;margin:0">${escapeHtml(p.text || '')}</p>
        ${isOwn ? `<button class="btn btn-outline btn-sm" style="margin-top:8px;color:var(--red)" onclick="deleteBusinessPost('${p.id}', '${ownerUid}', '${targetId}')">Supprimer</button>` : ''}
      </div>`).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

/* ---- Onglet "Mon entreprise" ---- */
async function loadMyBusiness() {
  const statusEl = document.getElementById('business-mine-status');
  if (!currentUser) { statusEl.innerHTML = '<p class="muted small" style="text-align:center;padding:20px 0">Connecte-toi pour créer ta page entreprise.</p>'; return; }
  statusEl.innerHTML = '<p class="muted small">Chargement...</p>';
  try {
    const snap = await db.collection('businesses').doc(currentUser.uid).get();
    businessMyProfile = snap.exists ? snap.data() : null;
    renderMyBusinessStatus();
  } catch (e) {
    statusEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function renderMyBusinessStatus() {
  const statusEl = document.getElementById('business-mine-status');
  if (!businessMyProfile) {
    statusEl.innerHTML = `
      <p class="muted small" style="margin-bottom:14px">Crée la page de ton entreprise : profil, services, et un fil d'actualités que tes clients peuvent suivre.</p>
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="openBusinessForm()">Créer ma page entreprise</button>`;
    return;
  }
  let followerCount = '…';
  try {
    const favSnap = await db.collection('follows').where('followedUid', '==', currentUser.uid).get();
    followerCount = favSnap.size;
  } catch (e) { followerCount = '—'; }

  statusEl.innerHTML = `
    <div class="order-box" style="margin-bottom:14px">
      <strong>${escapeHtml(businessMyProfile.businessName || '')}</strong>
      <div class="muted small" style="margin:4px 0">${followerCount} abonné(s)</div>
      <button class="btn btn-outline btn-sm" onclick="openBusinessForm()">Modifier ma page</button>
    </div>
    <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:14px" onclick="openBusinessPostForm()">Publier une actualité</button>
    <h4 style="margin-bottom:8px">Mes actualités</h4>
    <div id="business-mine-posts"><p class="muted small">Chargement...</p></div>`;
  loadBusinessPostsFeed(currentUser.uid, 'business-mine-posts');
}

function openBusinessForm() {
  if (!currentUser) { openAuth('login'); return; }
  if (document.getElementById('business-form-modal')) return;
  const b = businessMyProfile || {};
  const catOptions = Object.entries(NEARBY_CATEGORY_LABELS)
    .map(([val, label]) => `<option value="${val}" ${b.category === val ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');

  const html = `
    <div class="modal-overlay" id="business-form-modal">
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('business-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">${businessMyProfile ? 'Modifier ma page' : 'Créer ma page entreprise'}</h3>
        <div class="field">
          <label for="business-name">Nom de l'entreprise</label>
          <input type="text" id="business-name" class="text-input" maxlength="80" value="${escapeHtml(b.businessName || '')}">
        </div>
        <div class="field">
          <label for="business-category">Catégorie</label>
          <select id="business-category" class="select-input">${catOptions}</select>
        </div>
        <div class="field">
          <label for="business-description">Présentation</label>
          <textarea id="business-description" class="text-input" rows="3" style="resize:vertical" maxlength="500">${escapeHtml(b.description || '')}</textarea>
        </div>
        <div class="field">
          <label for="business-logo">Logo (lien, facultatif)</label>
          <input type="url" id="business-logo" class="text-input" placeholder="https://..." value="${escapeHtml(b.logoUrl || '')}">
        </div>
        <div class="field">
          <label for="business-cover">Image de couverture (lien, facultatif)</label>
          <input type="url" id="business-cover" class="text-input" placeholder="https://..." value="${escapeHtml(b.coverImageUrl || '')}">
        </div>
        <div class="field">
          <label for="business-address">Adresse / ville</label>
          <input type="text" id="business-address" class="text-input" value="${escapeHtml(b.address || '')}">
        </div>
        <div class="field">
          <label for="business-hours">Horaires (facultatif)</label>
          <input type="text" id="business-hours" class="text-input" placeholder="ex: Lun-Sam 8h-18h" value="${escapeHtml(b.hours || '')}">
        </div>
        <div class="field">
          <label for="business-whatsapp">WhatsApp de contact</label>
          <input type="tel" id="business-whatsapp" class="text-input" placeholder="+243..." value="${escapeHtml(b.whatsapp || '')}">
        </div>
        <div class="field">
          <label for="business-phone">Téléphone (facultatif)</label>
          <input type="tel" id="business-phone" class="text-input" value="${escapeHtml(b.phone || '')}">
        </div>
        <button class="btn btn-primary" id="business-save-btn" style="width:100%;justify-content:center" onclick="saveBusinessProfile()">Enregistrer</button>
        <p class="muted small" id="business-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveBusinessProfile() {
  const btn = document.getElementById('business-save-btn');
  const msgEl = document.getElementById('business-form-msg');
  const businessName = document.getElementById('business-name').value.trim();
  const category = document.getElementById('business-category').value;
  const description = document.getElementById('business-description').value.trim();
  const logoUrl = document.getElementById('business-logo').value.trim();
  const coverImageUrl = document.getElementById('business-cover').value.trim();
  const address = document.getElementById('business-address').value.trim();
  const hours = document.getElementById('business-hours').value.trim();
  const whatsapp = document.getElementById('business-whatsapp').value.trim();
  const phone = document.getElementById('business-phone').value.trim();

  if (!businessName || !description || !whatsapp) {
    msgEl.textContent = 'Merci de remplir au moins le nom, la présentation et le WhatsApp.';
    return;
  }
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  try {
    await db.collection('businesses').doc(currentUser.uid).set({
      ownerUid: currentUser.uid, businessName, category, description,
      logoUrl: logoUrl || null, coverImageUrl: coverImageUrl || null,
      address, hours, whatsapp, phone,
      status: 'active',
      createdAt: businessMyProfile ? businessMyProfile.createdAt : new Date().toISOString()
    }, { merge: true });
    document.getElementById('business-form-modal').remove();
    showToast('Page enregistrée', 'success');
    businessCache = null;
    loadMyBusiness();
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

function openBusinessPostForm() {
  if (document.getElementById('business-post-form-modal')) return;
  const html = `
    <div class="modal-overlay" id="business-post-form-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('business-post-form-modal').remove()" aria-label="Fermer">×</button>
        <h3 style="margin-bottom:14px">Publier une actualité</h3>
        <div class="field">
          <label for="business-post-text">Texte</label>
          <textarea id="business-post-text" class="text-input" rows="3" style="resize:vertical" maxlength="500"></textarea>
        </div>
        <div class="field">
          <label for="business-post-image">Image (lien, facultatif)</label>
          <input type="url" id="business-post-image" class="text-input" placeholder="https://...">
        </div>
        <button class="btn btn-primary" id="business-post-save-btn" style="width:100%;justify-content:center" onclick="saveBusinessPost()">Publier</button>
        <p class="muted small" id="business-post-form-msg" style="margin-top:6px"></p>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function saveBusinessPost() {
  const btn = document.getElementById('business-post-save-btn');
  const msgEl = document.getElementById('business-post-form-msg');
  const text = document.getElementById('business-post-text').value.trim();
  const imageUrl = document.getElementById('business-post-image').value.trim();
  if (!text) { msgEl.textContent = 'Écris un texte pour ton actualité.'; return; }
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Publication...';
  try {
    await db.collection('business_posts').add({
      businessUid: currentUser.uid, businessName: (businessMyProfile && businessMyProfile.businessName) || '',
      text, imageUrl: imageUrl || null, createdAt: new Date().toISOString()
    });
    document.getElementById('business-post-form-modal').remove();
    showToast('Actualité publiée', 'success');
    loadBusinessPostsFeed(currentUser.uid, 'business-mine-posts');
  } catch (e) {
    msgEl.textContent = friendlyErrorMessage(e);
    btn.disabled = false;
    btn.textContent = 'Publier';
  }
}

async function deleteBusinessPost(postId, ownerUid, targetId) {
  if (!confirm('Supprimer cette actualité ?')) return;
  try {
    await db.collection('business_posts').doc(postId).delete();
    showToast('Actualité supprimée', 'info');
    loadBusinessPostsFeed(ownerUid, targetId);
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= SIGNALEMENT DE CONTENU ================= */
let reportTargetId = null;
let reportTargetOwnerUid = null;
let reportTargetType = 'publication';

function openReportModal(pubId, ownerUid, targetType = 'publication') {
  if (!currentUser) { openAuth('register'); return; }
  reportTargetId = pubId;
  reportTargetOwnerUid = ownerUid;
  reportTargetType = targetType;
  document.querySelectorAll('input[name="report-reason"]').forEach(el => el.checked = false);
  document.getElementById('report-comment').value = '';
  document.getElementById('report-error').style.display = 'none';
  document.getElementById('report-modal').classList.remove('hidden');
}

function closeReportModal() {
  document.getElementById('report-modal').classList.add('hidden');
  reportTargetId = null;
  reportTargetOwnerUid = null;
  reportTargetType = 'publication';
}

async function submitReport() {
  const errorEl = document.getElementById('report-error');
  const checked = document.querySelector('input[name="report-reason"]:checked');
  if (!checked) {
    errorEl.textContent = 'Choisis une raison avant d\'envoyer.';
    errorEl.style.display = 'block';
    return;
  }
  if (!currentUser || !reportTargetId) { closeReportModal(); return; }

  // AVANT : aucune protection anti double-clic ici (contrairement aux
  // autres actions comme le like ou l'enregistrement) -- un double-tap
  // rapide pouvait envoyer deux fois le meme signalement.
  const btn = document.getElementById('report-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Envoi...';

  try {
    await db.collection('reports').add({
      targetType: reportTargetType,
      targetId: reportTargetId,
      targetOwnerUid: reportTargetOwnerUid || null,
      reason: checked.value,
      comment: (document.getElementById('report-comment').value || '').trim().slice(0, 500),
      reporterUid: currentUser.uid,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    closeReportModal();
    showToast('Signalement envoyé, merci pour ta vigilance', 'success');
  } catch (e) {
    errorEl.textContent = friendlyErrorMessage(e);
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

/* ================= FICHE PUBLICATION PLEIN ECRAN (comme Facebook) =================
   Un tap sur la photo/video ou sur le compteur de commentaires ouvre cette fiche :
   c'est LA seule ou les commentaires sont visibles. Le J'aime reste utilisable
   depuis le fil ET depuis la fiche (les deux sont synchronises en direct). */
async function openPostDetail(pubId) {
  try {
    const pubSnap = await db.collection('publications').doc(pubId).get();
    if (!pubSnap.exists) return;
    const item = { id: pubId, ...pubSnap.data() };

    let isLiked = false;
    if (currentUser) {
      const likeDoc = await db.collection('publication_likes').doc(`${pubId}_${currentUser.uid}`).get();
      isLiked = likeDoc.exists;
    }

    const mediaUrl = item.imageUrl || null;
    const videoUrl = item.videoUrl || null;
    let mediaHtml = '';
    if (videoUrl) {
      const rawUrl = normalizeMediaUrl(videoUrl);
      mediaHtml = `<video src="${escapeHtml(rawUrl)}" class="post-detail-media" controls autoplay onclick="openMediaViewer('${escapeForJs(rawUrl)}','video')" onerror="mediaLoadError(this)"></video>`;
    } else if (mediaUrl) {
      const rawUrl = normalizeMediaUrl(mediaUrl);
      mediaHtml = `<img src="${escapeHtml(rawUrl)}" class="post-detail-media" alt="" loading="lazy" onclick="openMediaViewer('${escapeForJs(rawUrl)}','photo')" onerror="mediaLoadError(this)">`;
    }

    // Avis clients -- uniquement pour les articles boutique (livre/produit),
    // pas pour les publications sociales (photo/video/texte). Isole dans son
    // propre try/catch : si les avis ont un souci, la fiche s'ouvre quand
    // meme, juste sans cette section.
    let reviewsHtml = '';
    if (item.type && item.type !== 'post') {
      try {
        reviewsHtml = await renderReviewsSection(pubId, item.sellerUid);
      } catch (e) {
        console.log('[reviews] non bloquant :', e.message);
      }
    }

    const isOwnItem = currentUser && currentUser.uid === item.sellerUid;

    document.getElementById('post-detail-body').innerHTML = `
      <div class="post-card-header">
        <div class="post-avatar">${escapeHtml((item.sellerName || 'C')[0].toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(item.sellerName || 'Coeurnoh Universe')}${item.sellerVerified ? ' ✔️' : ''}</strong>
          <div class="post-time">${timeAgo(item.createdAt)}</div>
        </div>
        ${isOwnItem
          ? `<button class="post-more-btn" onclick="openPostOptionsMenu('${item.id}')" title="Options" aria-label="Options de la publication">${ICON_DOTS}</button>`
          : ''}
      </div>
      ${item.title ? `<h3 class="post-detail-title">${escapeHtml(item.title)}</h3>` : ''}
      ${item.description ? `<p class="post-caption">${escapeHtml(item.description)}</p>` : ''}
      ${mediaHtml}
      <div class="post-actions">
        <button class="shop-action-btn ${isLiked ? 'liked' : ''}" data-like-btn="${item.id}" onclick="toggleShopLike('${item.id}')">
          <span data-like-icon="${item.id}">${isLiked ? ICON_HEART_FILLED : ICON_HEART_OUTLINE}</span>
          <span data-like-count="${item.id}">${item.likesCount || 0}</span>
        </button>
        <span class="shop-action-btn">${ICON_COMMENT} <span data-comment-count="${item.id}">${item.commentsCount || 0}</span></span>
      </div>
      <div class="shop-comments" id="shop-comments-${item.id}">
        <div class="shop-comments-list" id="shop-comments-list-${item.id}"><p class="muted small">Chargement des commentaires...</p></div>
        <div class="shop-comment-form">
          <input type="text" class="text-input" id="shop-comment-input-${item.id}" placeholder="Écris un commentaire...">
          <button class="btn btn-outline btn-sm" id="shop-comment-btn-${item.id}" onclick="addShopComment('${item.id}')">Envoyer</button>
        </div>
      </div>
      ${reviewsHtml}
      ${!isOwnItem ? `
      <button class="btn btn-outline btn-sm" style="margin-top:14px;color:var(--muted);border-color:var(--line);display:inline-flex;align-items:center;gap:6px" onclick="openReportModal('${item.id}', '${item.sellerUid || ''}')">${ICON_FLAG} Signaler ce contenu</button>
      ` : ''}
    `;
    document.getElementById('post-detail-modal').classList.remove('hidden');
    await loadShopComments(pubId);
    // Compteurs de like/commentaire a jour en temps reel tant que la fiche est ouverte.
    watchPostCounts(pubId);
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

function closePostDetail() {
  document.getElementById('post-detail-modal').classList.add('hidden');
  document.getElementById('post-detail-body').innerHTML = '';
}

/* ================= AVIS / NOTES (apres un achat confirme) ================= */
function renderStars(rating) {
  const full = Math.round(rating);
  return '⭐'.repeat(full) + '☆'.repeat(5 - full);
}

// Recupere les avis existants d'un article, et propose le formulaire
// d'avis SEULEMENT a un acheteur ayant une commande confirmee pour cet
// article et n'ayant pas deja laisse d'avis (un avis par achat).
async function renderReviewsSection(pubId, sellerUid) {
  // Pas d'orderBy ici : "reviews" n'a pas d'index compose pour
  // (pubId, createdAt), et Firestore refuse la requete entiere dans ce
  // cas -- c'est ce qui causait l'erreur generique au clic sur un livre.
  // On trie cote telephone a la place.
  const snap = await db.collection('reviews').where('pubId', '==', pubId).limit(20).get();
  const reviews = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  let formHtml = '';
  if (currentUser && currentUser.uid !== sellerUid) {
    try {
      const orderSnap = await db.collection('shop_orders')
        .where('uid', '==', currentUser.uid)
        .where('pubId', '==', pubId)
        .where('status', '==', 'completed')
        .limit(1).get();
      if (!orderSnap.empty) {
        const orderId = orderSnap.docs[0].id;
        const already = reviews.some(r => r.id === orderId);
        if (!already) {
          formHtml = `
            <div class="review-form">
              <p class="muted small" style="margin-bottom:6px">Tu as acheté cet article — laisse ton avis :</p>
              <div class="star-picker" id="star-picker-${pubId}">
                ${[1, 2, 3, 4, 5].map(n => `<span data-star="${n}" role="button" tabindex="0" aria-label="${n} étoile${n > 1 ? 's' : ''}" onclick="setReviewStars('${pubId}', ${n})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setReviewStars('${pubId}', ${n})}">☆</span>`).join('')}
              </div>
              <textarea class="text-input" id="review-comment-${pubId}" placeholder="Ton avis (optionnel)" style="margin-top:8px;min-height:60px;width:100%"></textarea>
              <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="submitReview('${pubId}', '${sellerUid}', '${orderId}')">Envoyer mon avis</button>
            </div>
          `;
        }
      }
    } catch (e) { /* si la verification d'achat echoue, on n'affiche simplement pas le formulaire */ }
  }

  const listHtml = reviews.length
    ? reviews.map(r => `
        <div class="review-row">
          <strong>${escapeHtml(r.buyerName || 'Client')}</strong> ${renderStars(r.rating)}
          ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : ''}
          <span class="notif-time">${timeAgo(r.createdAt)}</span>
        </div>
      `).join('')
    : '<p class="muted small">Aucun avis pour l\'instant.</p>';

  return `
    <div class="reviews-section">
      <h4>⭐ Avis ${reviews.length ? `— ${avg.toFixed(1)}/5 (${reviews.length})` : ''}</h4>
      ${formHtml}
      <div class="reviews-list">${listHtml}</div>
    </div>
  `;
}

let selectedReviewStars = {};
function setReviewStars(pubId, n) {
  selectedReviewStars[pubId] = n;
  document.querySelectorAll(`#star-picker-${pubId} span`).forEach((el, i) => {
    el.textContent = (i < n) ? '⭐' : '☆';
  });
}

// Un avis = un achat : le document est enregistre sous l'id de la
// commande elle-meme, donc impossible d'en laisser deux pour le meme achat.
async function submitReview(pubId, sellerUid, orderId) {
  const rating = selectedReviewStars[pubId] || 0;
  if (!rating) { showToast('Choisis une note (1 à 5 étoiles).', 'error'); return; }
  const commentEl = document.getElementById(`review-comment-${pubId}`);
  const comment = commentEl ? commentEl.value.trim() : '';
  try {
    await db.collection('reviews').doc(orderId).set({
      orderId, pubId, sellerUid,
      buyerUid: currentUser.uid,
      buyerName: currentUser.name || 'Client',
      rating, comment,
      createdAt: new Date().toISOString()
    });
    showToast('Merci pour ton avis !', 'success');
    openPostDetail(pubId);
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

// Supprime la publication ouverte dans la fiche detaillee (reutilise la
// meme fonction que "Mes ventes", qui demande deja confirmation), puis
// ferme la fiche.
async function deletePublicationFromDetail(pubId) {
  const deleted = await deleteMyPublication(pubId);
  if (deleted) closePostDetail();
}

async function loadShopComments(pubId) {
  const listEl = document.getElementById(`shop-comments-list-${pubId}`);
  if (!listEl) return;
  try {
    const snap = await db.collection('publication_comments')
      .where('pubId', '==', pubId)
      .orderBy('createdAt', 'asc')
      .limit(50)
      .get();
    if (snap.empty) {
      listEl.innerHTML = '<p class="muted small">Aucun commentaire. Sois le premier !</p>';
      return;
    }
    listEl.innerHTML = snap.docs.map(doc => {
      const c = doc.data();
      const isOwn = currentUser && currentUser.uid === c.uid;
      return `<div class="shop-comment ${isOwn ? 'own-comment' : ''}" data-comment-id="${doc.id}" data-pub-id="${pubId}">
        <strong>${escapeHtml(c.name || 'Client')}</strong>
        <span class="shop-comment-text" id="comment-text-${doc.id}">${escapeHtml(c.text)}</span>${c.edited ? '<span class="shop-comment-edited">(modifié)</span>' : ''}
      </div>`;
    }).join('');
    // Active l'appui long (Modifier/Supprimer) sur ses propres commentaires --
    // une seule fois pour toute l'application (delegation d'evenements).
    bindCommentLongPress();
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function deleteShopComment(pubId, commentId) {
  if (!currentUser) return;
  if (!confirm('Supprimer ce commentaire ?')) return;
  try {
    await db.collection('publication_comments').doc(commentId).delete();
    await db.collection('publications').doc(pubId).update({
      commentsCount: firebase.firestore.FieldValue.increment(-1)
    });
    document.querySelectorAll(`[data-comment-count="${pubId}"]`).forEach(el => {
      el.textContent = Math.max(0, (parseInt(el.textContent) || 1) - 1);
    });
    loadShopComments(pubId);
    showToast('Commentaire supprimé', 'info');
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

/* ================= COMMENTAIRES : appui long -> Modifier/Supprimer =================
   AVANT : une icone poubelle etait affichee en permanence a cote de chaque
   commentaire (jugee peu professionnelle). Maintenant : rester appuye
   ~500ms sur SON PROPRE commentaire ouvre un petit menu (Modifier /
   Supprimer), exactement comme sur Instagram/WhatsApp -- meme principe que
   la selection longue deja utilisee sur les notifications de cette appli. */
let commentLongPressTimer = null;
let commentLongPressFired = false;
let commentPressStartX = 0;
let commentPressStartY = 0;
const COMMENT_MOVE_THRESHOLD = 12; // px : en dessous, on considere que c'est un appui immobile
let commentListenersBound = false;

function bindCommentLongPress() {
  if (commentListenersBound) return;
  commentListenersBound = true;

  // Delegation sur "document" (et non un conteneur precis) car l'id de la
  // liste change selon la publication ouverte -- ainsi ca fonctionne pour
  // n'importe quelle fiche commentaires, sans devoir re-attacher a chaque
  // rechargement de loadShopComments().
  document.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.shop-comment.own-comment');
    if (!row || row.classList.contains('editing-comment')) return;
    commentPressStartX = e.clientX;
    commentPressStartY = e.clientY;
    startCommentLongPress(row);
  });
  document.addEventListener('pointermove', (e) => {
    const dx = Math.abs(e.clientX - commentPressStartX);
    const dy = Math.abs(e.clientY - commentPressStartY);
    if (dx > COMMENT_MOVE_THRESHOLD || dy > COMMENT_MOVE_THRESHOLD) cancelCommentLongPress();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
    document.addEventListener(evt, () => cancelCommentLongPress());
  });

  // Repli tactile natif (memes raisons que pour les notifications : plus
  // fiable que Pointer Events sur certaines versions Android/WebView). Un
  // petit deplacement du doigt reste tolere pour ne pas annuler l'appui
  // long au moindre tremblement.
  document.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.shop-comment.own-comment');
    if (!row || row.classList.contains('editing-comment')) return;
    const t = e.touches[0];
    commentPressStartX = t.clientX;
    commentPressStartY = t.clientY;
    startCommentLongPress(row);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - commentPressStartX);
    const dy = Math.abs(t.clientY - commentPressStartY);
    if (dx > COMMENT_MOVE_THRESHOLD || dy > COMMENT_MOVE_THRESHOLD) cancelCommentLongPress();
  }, { passive: true });
  ['touchend', 'touchcancel'].forEach((evt) => {
    document.addEventListener(evt, () => cancelCommentLongPress(), { passive: true });
  });
}

function startCommentLongPress(row) {
  commentLongPressFired = false;
  clearTimeout(commentLongPressTimer);
  commentLongPressTimer = setTimeout(() => {
    commentLongPressFired = true;
    if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) { /* pas grave */ } }
    openCommentOptionsMenu(row.dataset.pubId, row.dataset.commentId);
  }, 500);
}

function cancelCommentLongPress() {
  clearTimeout(commentLongPressTimer);
}

function openCommentOptionsMenu(pubId, commentId) {
  const overlay = document.getElementById('comment-options-overlay');
  const menu = document.getElementById('comment-options-menu');
  if (!overlay || !menu) return;
  menu.innerHTML = `
    <button class="action-sheet-btn" onclick="commentOptionsEdit('${pubId}','${commentId}')">${ICON_EDIT} Modifier</button>
    <button class="action-sheet-btn action-sheet-btn-danger" onclick="commentOptionsDelete('${pubId}','${commentId}')">${ICON_TRASH} Supprimer</button>
    <button class="action-sheet-btn action-sheet-cancel" onclick="closeCommentOptionsMenu()">Annuler</button>
  `;
  overlay.classList.remove('hidden');
}

function closeCommentOptionsMenu() {
  document.getElementById('comment-options-overlay')?.classList.add('hidden');
}

function commentOptionsDelete(pubId, commentId) {
  closeCommentOptionsMenu();
  deleteShopComment(pubId, commentId);
}

function commentOptionsEdit(pubId, commentId) {
  closeCommentOptionsMenu();
  startEditShopComment(pubId, commentId);
}

// Remplace la ligne du commentaire par un champ modifiable, directement en
// place (pas de popup separee) -- plus rapide et plus clair pour la personne.
function startEditShopComment(pubId, commentId) {
  const rowEl = document.querySelector(`.shop-comment[data-comment-id="${commentId}"]`);
  const textEl = document.getElementById(`comment-text-${commentId}`);
  if (!rowEl || !textEl) return;
  const currentText = textEl.textContent || '';
  rowEl.classList.add('editing-comment');
  rowEl.innerHTML = `
    <div class="comment-edit-row">
      <input type="text" class="text-input" id="comment-edit-input-${commentId}" value="${escapeHtml(currentText)}" maxlength="500">
      <button class="btn btn-primary btn-sm" aria-label="Enregistrer" onclick="saveEditShopComment('${pubId}','${commentId}')">${ICON_CHECK}</button>
      <button class="btn btn-outline btn-sm" aria-label="Annuler" onclick="loadShopComments('${pubId}')">${ICON_CLOSE}</button>
    </div>
  `;
  const input = document.getElementById(`comment-edit-input-${commentId}`);
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

async function saveEditShopComment(pubId, commentId) {
  const input = document.getElementById(`comment-edit-input-${commentId}`);
  if (!input) return;
  const newText = input.value.trim();
  if (!newText) { showToast('Le commentaire ne peut pas être vide.', 'error'); return; }
  if (newText.length > 500) { showToast('Commentaire trop long (500 caractères maximum).', 'error'); return; }
  input.disabled = true;
  try {
    await db.collection('publication_comments').doc(commentId).update({
      text: newText,
      edited: true,
      editedAt: new Date().toISOString()
    });
    showToast('Commentaire modifié', 'success');
    loadShopComments(pubId);
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
    input.disabled = false;
  }
}

async function addShopComment(pubId) {
  if (!currentUser) { openAuth('register'); return; }
  const input = document.getElementById(`shop-comment-input-${pubId}`);
  const btn = document.getElementById(`shop-comment-btn-${pubId}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  if (text.length > 500) {
    showToast('Commentaire trop long (500 caractères maximum).', 'error');
    return;
  }
  const now = Date.now();
  const lastCommentAt = Number(localStorage.getItem('lastCommentAt') || 0);
  if (now - lastCommentAt < 4000) {
    showToast('Attends quelques secondes avant de commenter à nouveau.', 'error');
    return;
  }
  localStorage.setItem('lastCommentAt', String(now));

  // AVANT : aucun retour visuel pendant l'envoi -- rien n'indiquait que le
  // commentaire partait, et rien n'empechait un double-clic tres rapide.
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = 'Envoi...'; }
  input.disabled = true;

  try {
    await db.collection('publication_comments').add({
      pubId,
      uid: currentUser.uid,
      name: currentUser.name || 'Client',
      text,
      createdAt: new Date().toISOString()
    });
    await db.collection('publications').doc(pubId).update({
      commentsCount: firebase.firestore.FieldValue.increment(1)
    });
    input.value = '';
    await loadShopComments(pubId);
    document.querySelectorAll(`[data-comment-count="${pubId}"]`).forEach(el => {
      el.textContent = parseInt(el.textContent, 10) + 1;
    });

    // Notifie le proprietaire de la publication (sauf s'il a commente lui-meme)
    try {
      const pubSnap = await db.collection('publications').doc(pubId).get();
      const pub = pubSnap.data();
      if (pub && pub.sellerUid && pub.sellerUid !== currentUser.uid) {
        const title = 'Nouveau commentaire 💬';
        const body = `${currentUser.name || 'Quelqu\'un'} a commenté "${pub.title || pub.description || 'ta publication'}" : "${text.slice(0, 60)}"`;
        await db.collection('notifications').add({
          uid: pub.sellerUid, title, body, type: 'comment', read: false, url: '/?open=' + pubId, createdAt: new Date().toISOString()
        });
        notifyUserPush(pub.sellerUid, title, body, 'activity', '/?open=' + pubId);
      }
    } catch (e) { /* pas grave si la notification echoue */ }
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Envoyer'; }
    input.disabled = false;
  }
}

/* ================= PAIEMENT BOUTIQUE (par article, via solde portefeuille) ================= */
function buyShopItem(pubId, title, price, itemType) {
  if (!currentUser) { openAuth('register'); return; }

  const modalHtml = `
    <div class="modal-overlay" id="shop-checkout-modal">
      <div class="modal">
        <button class="modal-close" onclick="closeShopCheckout()" aria-label="Fermer">×</button>
        <h2>🛍️ ${title}</h2>
        <p class="sub">Prix : <strong>${price.toFixed(2)}$</strong> — Ton solde : <strong>${(currentUser.balance || 0).toFixed(2)}$</strong></p>
        <div class="modal-error hidden" id="shop-checkout-error"></div>
        <div class="hidden" id="shop-checkout-success">
          <div class="tutorial-emoji">✅</div>
          <p class="sub" style="text-align:center;font-weight:700;color:var(--green)">Achat confirmé !</p>
          <div id="shop-checkout-download"></div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:14px" id="shop-checkout-submit" onclick="confirmShopPurchase('${pubId}','${escapeForJs(title)}',${price},'${itemType}')">Confirmer l'achat (${price.toFixed(2)}$)</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeShopCheckout() {
  const modal = document.getElementById('shop-checkout-modal');
  if (modal) modal.remove();
}

async function confirmShopPurchase(pubId, title, price, itemType) {
  const errEl = document.getElementById('shop-checkout-error');
  errEl.classList.add('hidden');

  if (price > (currentUser.balance || 0)) {
    errEl.textContent = "Solde insuffisant. Recharge ton portefeuille pour continuer.";
    errEl.classList.remove('hidden');
    return;
  }

  document.getElementById('shop-checkout-submit').classList.add('hidden');

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/shop-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, pubId })
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erreur lors de l'achat");
    }

    currentUser.balance = data.newBalance;
    document.getElementById('shop-checkout-success').classList.remove('hidden');

    if (itemType === 'book') {
      shopPurchasedSet.add(pubId);
      if (data.fileUrl) {
        document.getElementById('shop-checkout-download').innerHTML =
          `<a class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" href="${escapeHtml(data.fileUrl)}" target="_blank">📖 Télécharger le livre</a>`;
      }
      renderShopFeed(); // le bouton "Commander" de la carte devient "Télécharger"
    } else {
      document.getElementById('shop-checkout-download').innerHTML =
        `<p class="muted" style="text-align:center;margin-top:10px">Achat confirmé ! Utilise le bouton WhatsApp sur l'article pour coordonner la livraison avec le vendeur.</p>`;
    }
  } catch (e) {
    document.getElementById('shop-checkout-submit').classList.remove('hidden');
    errEl.textContent = friendlyErrorMessage(e);
    errEl.classList.remove('hidden');
  }
}

/* ================= NOTIFICATIONS PUSH (alertes reelles, meme app fermee) ================= */
async function registerPushNotifications() {
  if (!currentUser) return;
  try {
    if (!('Notification' in window) || !firebase.messaging) {
      console.log('[push] Notifications non supportees sur ce navigateur');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log("[push] Permission refusee par l'utilisateur");
      return;
    }

    const messaging = firebase.messaging();
    // IMPORTANT : on lie explicitement le jeton au service worker /sw.js deja
    // enregistre (qui gere onBackgroundMessage). Sans ce lien, Firebase tente
    // d'utiliser /firebase-messaging-sw.js par defaut (qui n'existe pas chez
    // nous) et les notifications ne peuvent jamais arriver app fermee.
    const swReg = await navigator.serviceWorker.ready;
    const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: swReg });

    if (token) {
      // fcmTokens est une LISTE : chaque appareil connecte ajoute son jeton
      // sans effacer celui des autres appareils du meme compte (avant, un
      // seul champ "fcmToken" etait ecrase a chaque nouvelle connexion, ce
      // qui coupait silencieusement les notifications des autres appareils).
      await db.collection('users').doc(currentUser.uid).update({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
      });
      console.log('[push] Jeton enregistre avec succes');
    }

    // Reception d'une notification pendant que l'app est ouverte au premier plan
    messaging.onMessage((payload) => {
      const title = (payload.notification && payload.notification.title) || 'Coeurnoh Universe';
      const body = (payload.notification && payload.notification.body) || '';
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
      playNotifSound();
      updateNotifBadge();
    });
  } catch (e) {
    console.log('[push] Erreur configuration :', e.message);
  }
}

// Petit bip genere directement (pas besoin de fichier audio) pour signaler
// une notification recue pendant que l'app est ouverte au premier plan.
// Quand l'app est fermee/en arriere-plan, c'est la sonnerie native du
// telephone (geree par le systeme via sw.js) qui joue, comme les autres apps.
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) { /* pas grave si le navigateur bloque l'audio */ }
}

/* ================= HELPERS D'ENVOI DE PUSH REEL (serveur) ================= */
// Notifie UN utilisateur precis (like, commentaire, partage...).
async function notifyUserPush(uid, title, body, category = 'activity', url = null) {
  if (!currentUser || !uid) return;
  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/notify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, uid, title, body, category, url })
    });
  } catch (e) { /* pas grave si le push echoue, la notif Firestore reste visible dans l'app */ }
}

// Notifie TOUT LE MONDE (nouvelle publication, produit, promo...).
async function broadcastPush(title, body, category = 'content', url = null) {
  if (!currentUser) return;
  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/broadcast-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, title, body, category, url })
    });
  } catch (e) { /* pas grave si le push echoue, l'annonce reste visible dans le panneau */ }
}

/* ================= PREFERENCES DE NOTIFICATIONS (page Parametres) ================= */
// Par defaut tout est active, pour ne rien changer au comportement des
// comptes existants qui n'ont jamais touche a ces reglages.
const DEFAULT_NOTIF_PREFS = { push: true, email: true, content: true, activity: true, orders: true };

function applyNotifPrefsToUI() {
  if (!currentUser) return;
  const prefs = { ...DEFAULT_NOTIF_PREFS, ...(currentUser.notifPrefs || {}) };
  ['push', 'email', 'content', 'activity', 'orders'].forEach((key) => {
    const el = document.getElementById('notifpref-' + key);
    if (el) el.checked = !!prefs[key];
  });
}

async function saveNotifPrefs() {
  if (!currentUser) return;
  const prefs = {};
  ['push', 'email', 'content', 'activity', 'orders'].forEach((key) => {
    const el = document.getElementById('notifpref-' + key);
    if (el) prefs[key] = el.checked;
  });
  currentUser.notifPrefs = prefs;
  try {
    await db.collection('users').doc(currentUser.uid).update({ notifPrefs: prefs });
  } catch (e) { console.log('[notifPrefs] Erreur sauvegarde :', e.message); }
}

/* ================= NOTIFICATIONS ================= */
let notifUnsubscribe = null;
let announcementsUnsubscribe = null;
let notifCache = [];
let announcementsCache = [];

function startNotifWatch() {
  if (notifUnsubscribe) return; // deja actif
  notifUnsubscribe = db.collection('notifications')
    .where('uid', '==', currentUser.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snap) => {
      notifCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateNotifBadge();
      if (!document.getElementById('view-notifications').classList.contains('hidden')) {
        renderNotifPanel();
      }
    }, (err) => console.log('[notif] Erreur suivi notifications :', err.message));

  // Suivi EN DIRECT des annonces publiques (nouvelles publications, promos...)
  // pour que le badge monte des qu'une annonce arrive, meme sans ouvrir le panneau.
  if (!announcementsUnsubscribe) {
    announcementsUnsubscribe = db.collection('announcements')
      .orderBy('createdAt', 'desc')
      .limit(15)
      .onSnapshot((snap) => {
        announcementsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateNotifBadge();
        if (!document.getElementById('view-notifications').classList.contains('hidden')) {
          renderNotifPanel();
        }
      }, (err) => console.log('[notif] Erreur suivi annonces :', err.message));
  }
}

function stopNotifWatch() {
  if (notifUnsubscribe) { notifUnsubscribe(); notifUnsubscribe = null; }
  if (announcementsUnsubscribe) { announcementsUnsubscribe(); announcementsUnsubscribe = null; }
  notifCache = [];
  announcementsCache = [];
}

// Les annonces sont publiques (pas de champ "read" par utilisateur), donc on
// retient juste la date de la derniere annonce vue par CE telephone.
function getLastSeenAnnouncementAt() {
  return localStorage.getItem('lastSeenAnnouncementAt') || '1970-01-01T00:00:00.000Z';
}

function updateNotifBadge() {
  const lastSeen = getLastSeenAnnouncementAt();
  const unreadPersonal = notifCache.filter(n => !n.read).length;
  const unreadAnnouncements = announcementsCache.filter(a => a.createdAt > lastSeen).length;
  const unreadCount = unreadPersonal + unreadAnnouncements;
  const label = unreadCount > 9 ? '9+' : String(unreadCount);
  // Deux pastilles a tenir a jour ensemble : celle du haut (cloche) et celle du bas (Notifs)
  ['notif-badge', 'notif-badge-bnav'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (unreadCount > 0) {
      badge.textContent = label;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });
}

async function toggleNotifPanelContent() {
  renderNotifPanel();

  // Marque toutes les notifications personnelles non lues comme lues
  const unread = notifCache.filter(n => !n.read);
  if (unread.length > 0) {
    try {
      const batch = db.batch();
      unread.forEach(n => batch.update(db.collection('notifications').doc(n.id), { read: true }));
      await batch.commit();
    } catch (e) { /* pas grave si ca echoue, ce n'est pas critique */ }
  }

  // Marque les annonces publiques comme vues par ce telephone (pour le badge)
  if (announcementsCache.length > 0) {
    localStorage.setItem('lastSeenAnnouncementAt', announcementsCache[0].createdAt);
  }
  updateNotifBadge();

  // Efface la pastille sur l'icone de l'app une fois tout consulte
  if ('clearAppBadge' in navigator) {
    try { navigator.clearAppBadge(); } catch (e) { /* pas grave */ }
  }
}

let notifSelectMode = false;
let selectedNotifIds = new Set();
let notifLongPressTimer = null;
let notifLongPressFired = false;

// Met a jour l'affichage de l'entete (normal ou barre de selection) et le
// compteur, sans tout re-generer.
function syncNotifSelectHeader() {
  const normal = document.getElementById('notif-header-normal');
  const select = document.getElementById('notif-header-select');
  const hint = document.getElementById('notif-select-hint');
  const count = document.getElementById('notif-select-count');
  if (normal) normal.classList.toggle('hidden', notifSelectMode);
  if (select) select.classList.toggle('hidden', !notifSelectMode);
  if (hint) hint.classList.toggle('hidden', notifSelectMode);
  if (count) count.textContent = `${selectedNotifIds.size} sélectionnée(s)`;
}

function toggleNotifSelectMode() {
  notifSelectMode = !notifSelectMode;
  selectedNotifIds.clear();
  syncNotifSelectHeader();
  renderNotifPanel();
}

// Reste appuye ~500ms sur une notification = entre en mode selection et
// coche celle-ci directement, exactement comme sur Instagram/WhatsApp/TikTok.
function handleNotifPressStart(id, isAnnouncement) {
  if (isAnnouncement) return; // les annonces globales ne se selectionnent pas
  notifLongPressFired = false;
  clearTimeout(notifLongPressTimer);
  notifLongPressTimer = setTimeout(() => {
    notifLongPressFired = true;
    if (!notifSelectMode) {
      notifSelectMode = true;
      syncNotifSelectHeader();
    }
    toggleNotifRowSelected(id);
    if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) { /* pas grave */ } }
  }, 500);
}

function handleNotifPressEnd() {
  clearTimeout(notifLongPressTimer);
}

// Clic normal sur une ligne : ouvre la notification, SAUF en mode
// selection ou il coche/decoche a la place (comme sur Instagram).
function handleNotifRowClick(id, isAnnouncement) {
  if (notifLongPressFired) { notifLongPressFired = false; return; }
  if (notifSelectMode) {
    if (!isAnnouncement) toggleNotifRowSelected(id);
    return;
  }
  openNotifRow(id, isAnnouncement);
}

function toggleNotifRowSelected(id) {
  if (selectedNotifIds.has(id)) selectedNotifIds.delete(id);
  else selectedNotifIds.add(id);
  if (selectedNotifIds.size === 0) {
    notifSelectMode = false;
  }
  syncNotifSelectHeader();
  renderNotifPanel();
}

// Supprime toutes les notifications personnelles cochees d'un coup (les
// annonces globales ne sont jamais proposees a la selection : elles
// concernent tout le monde et restent gerees par l'admin).
async function deleteSelectedNotifs() {
  if (selectedNotifIds.size === 0) {
    showToast('Sélectionne au moins une notification.', 'error');
    return;
  }
  if (!confirm(`Supprimer ${selectedNotifIds.size} notification(s) ?`)) return;
  try {
    const batch = db.batch();
    selectedNotifIds.forEach((id) => batch.delete(db.collection('notifications').doc(id)));
    await batch.commit();
    notifCache = notifCache.filter((n) => !selectedNotifIds.has(n.id));
    showToast('Notifications supprimées.', 'success');
    toggleNotifSelectMode();
    updateNotifBadge();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

function renderNotifPanel() {
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;
  // Fusionne notifications personnelles + annonces publiques, triees par date
  const merged = [
    ...notifCache.map(n => ({ ...n, isAnnouncement: false })),
    ...announcementsCache.map(a => ({ ...a, isAnnouncement: true }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);

  if (merged.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="padding:16px">Aucune notification pour l\'instant.</p>';
    return;
  }

  const typeIcons = {
    recharge: ICON_WALLET, purchase: ICON_CART, sale: ICON_TAG, like: ICON_HEART_FILLED, comment: ICON_COMMENT,
    share: ICON_SHARE, order: ICON_PACKAGE, announcement: ICON_BELL, admin_message: ICON_SHIELD
  };

  const lastSeen = getLastSeenAnnouncementAt();
  listEl.innerHTML = merged.map(n => {
    const isSelected = selectedNotifIds.has(n.id);
    return `
    <div class="notif-row ${(!n.isAnnouncement && !n.read) || (n.isAnnouncement && n.createdAt > lastSeen) ? 'unread' : ''} ${isSelected ? 'notif-row-selected' : ''}"
      data-id="${n.id}" data-announcement="${n.isAnnouncement ? '1' : '0'}">
      ${notifSelectMode && !n.isAnnouncement ? `<span class="notif-select-dot ${isSelected ? 'checked' : ''}">${ICON_CHECK}</span>` : ''}
      <span class="notif-icon">${typeIcons[n.type] || ICON_BELL}</span>
      <div class="notif-content">
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.body)}</p>
        <span class="notif-time">${timeAgo(n.createdAt)}</span>
      </div>
      ${(!notifSelectMode && !n.isAnnouncement) ? `<button class="notif-delete-btn" data-notif-delete="${n.id}" aria-label="Supprimer cette notification">${ICON_TRASH}</button>` : ''}
    </div>
  `;
  }).join('');
  bindNotifListEvents();
}

// Delegation d'evenements unique sur le conteneur (au lieu d'attributs en
// ligne sur chaque ligne) : plus fiable sur mobile/webview, et continue de
// fonctionner meme apres un reaffichage de la liste puisqu'elle est
// attachee une seule fois au conteneur parent, qui lui ne change jamais.
let notifListenersBound = false;
let notifPressStartX = 0;
let notifPressStartY = 0;
const NOTIF_MOVE_THRESHOLD = 12; // px : en dessous, on considere que c'est un appui immobile

function bindNotifListEvents() {
  const listEl = document.getElementById('notif-list');
  if (!listEl || notifListenersBound) return;
  notifListenersBound = true;

  listEl.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.notif-row');
    if (!row) return;
    notifPressStartX = e.clientX;
    notifPressStartY = e.clientY;
    handleNotifPressStart(row.dataset.id, row.dataset.announcement === '1');
  });
  listEl.addEventListener('pointermove', (e) => {
    const dx = Math.abs(e.clientX - notifPressStartX);
    const dy = Math.abs(e.clientY - notifPressStartY);
    if (dx > NOTIF_MOVE_THRESHOLD || dy > NOTIF_MOVE_THRESHOLD) handleNotifPressEnd();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
    listEl.addEventListener(evt, () => handleNotifPressEnd());
  });

  // Repli avec les evenements tactiles natifs (touchstart/touchend), plus
  // anciens mais parfois plus fiables que Pointer Events selon la version
  // Android/WebView -- les deux systemes cohabitent sans se doubler grace
  // au minuteur qui est toujours annule/relance proprement.
  //
  // IMPORTANT : avant, "touchmove" annulait l'appui long au moindre pixel
  // de mouvement -- un tremblement naturel du doigt pendant les 500ms
  // suffisait a annuler la selection avant qu'elle se declenche. Comme sur
  // Instagram/WhatsApp, on tolere maintenant un petit deplacement.
  listEl.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.notif-row');
    if (!row) return;
    const t = e.touches[0];
    notifPressStartX = t.clientX;
    notifPressStartY = t.clientY;
    handleNotifPressStart(row.dataset.id, row.dataset.announcement === '1');
  }, { passive: true });
  listEl.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - notifPressStartX);
    const dy = Math.abs(t.clientY - notifPressStartY);
    if (dx > NOTIF_MOVE_THRESHOLD || dy > NOTIF_MOVE_THRESHOLD) handleNotifPressEnd();
  }, { passive: true });
  ['touchend', 'touchcancel'].forEach((evt) => {
    listEl.addEventListener(evt, () => handleNotifPressEnd(), { passive: true });
  });

  listEl.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.notif-delete-btn');
    if (deleteBtn) {
      e.stopPropagation();
      deleteNotifRow(deleteBtn.dataset.notifDelete);
      return;
    }
    const row = e.target.closest('.notif-row');
    if (!row) return;
    handleNotifRowClick(row.dataset.id, row.dataset.announcement === '1');
  });
}

// Ouvre le contenu lie a une notification (publication, onglet commandes...)
// quand on clique dessus. Si la notification n'a pas de lien precis (ancienne
// notification, ou info generale sans cible), affiche quand meme le message
// complet dans une petite fenetre, pour que la personne puisse le relire en
// entier.
function openNotifRow(id, isAnnouncement) {
  const list = isAnnouncement ? announcementsCache : notifCache;
  const n = list.find((x) => x.id === id);
  if (!n) return;

  if (n.url) {
    const params = new URLSearchParams(n.url.split('?')[1] || '');
    const pubId = params.get('open');
    const tab = params.get('openTab');
    if (pubId) { openPostDetail(pubId); return; }
    if (tab) { showDashTab(tab); return; }
  }
  document.getElementById('notif-detail-title').textContent = n.title || '';
  document.getElementById('notif-detail-body').textContent = n.body || '';
  document.getElementById('notif-detail-modal').classList.remove('hidden');
}

function closeNotifDetailModal() {
  document.getElementById('notif-detail-modal').classList.add('hidden');
}

// Supprime une notification personnelle de la liste (pas les annonces
// globales, qui concernent tout le monde et restent gerees par l'admin).
async function deleteNotifRow(notifId) {
  try {
    await db.collection('notifications').doc(notifId).delete();
    notifCache = notifCache.filter(n => n.id !== notifId);
    renderNotifPanel();
    updateNotifBadge();
  } catch (e) {
    showToast(friendlyErrorMessage(e), 'error');
  }
}

function timeAgo(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}
