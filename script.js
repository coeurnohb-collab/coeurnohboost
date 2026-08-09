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
   14 RÉSEAUX SOCIAUX — badges pro (couleur de marque + icône)
   ========================================================= */
const PLATFORMS = [
  { id: "tiktok",    name: "TikTok",     bg: "#000000", icon: "♪" },
  { id: "instagram", name: "Instagram",  bg: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", icon: "📷" },
  { id: "youtube",   name: "YouTube",    bg: "#FF0000", icon: "▶" },
  { id: "facebook",  name: "Facebook",   bg: "#1877F2", icon: "f" },
  { id: "twitter",   name: "X",          bg: "#000000", icon: "✕" },
  { id: "telegram",  name: "Telegram",   bg: "#26A5E4", icon: "✈" },
  { id: "whatsapp",  name: "WhatsApp",   bg: "#25D366", icon: "💬" },
  { id: "snapchat",  name: "Snapchat",   bg: "#FFFC00", icon: "👻", dark: true },
  { id: "linkedin",  name: "LinkedIn",   bg: "#0A66C2", icon: "in" },
  { id: "pinterest", name: "Pinterest",  bg: "#E60023", icon: "P" },
  { id: "twitch",    name: "Twitch",     bg: "#9146FF", icon: "🎮" },
  { id: "spotify",   name: "Spotify",    bg: "#1DB954", icon: "🎵" },
  { id: "discord",   name: "Discord",    bg: "#5865F2", icon: "🎧" },
  { id: "threads",   name: "Threads",    bg: "#000000", icon: "@" }
];

/* Niveaux de qualité — multiplicateur appliqué au prix de base */
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

function platformBadgeHTML(p, size) {
  const cls = size === 'lg' ? 'p-icon' : 'p-icon';
  const color = p.dark ? 'color:#111' : 'color:#fff';
  return `<div class="${cls}" style="background:${p.bg};${color}">${p.icon}</div>`;
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
  const el = document.getElementById('quality-grid');
  el.innerHTML = QUALITY_TIERS.map(q => `
    <div class="quality-card${q.id === selectedQuality ? ' active' : ''}" onclick="selectQuality('${q.id}')">
      <span class="q-name">${q.name}</span>
      <span class="q-mult">x${q.mult}</span>
    </div>
  `).join('');
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
