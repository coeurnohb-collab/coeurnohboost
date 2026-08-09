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
}
function showHome() {
  hideAllViews();
  document.getElementById('view-home').classList.remove('hidden');
}
function showDashboard() {
  hideAllViews();
  document.getElementById('view-dashboard').classList.remove('hidden');
}
function showServices() {
  hideAllViews();
  document.getElementById('view-services').classList.remove('hidden');
  renderPlatformTabs('platform-tabs', 'services-list');
  renderServiceList(SERVICES[0].platform, 'services-list');
}

/* =========================================================
   CATALOGUE DE SERVICES (statique pour l'instant)
   Prix en $ pour 1000 unités. min/max = quantité par commande.
   ⚠️ À remplacer plus tard par les vrais services MTP + prix admin.
   ========================================================= */
const SERVICES = [
  { platform: "TikTok", icon: "♪", name: "Followers", price1000: 2.5, min: 100, max: 50000 },
  { platform: "TikTok", icon: "♪", name: "Vues", price1000: 0.6, min: 500, max: 1000000 },
  { platform: "TikTok", icon: "♪", name: "Likes", price1000: 1.2, min: 100, max: 100000 },
  { platform: "Instagram", icon: "IG", name: "Followers", price1000: 3.0, min: 100, max: 50000 },
  { platform: "Instagram", icon: "IG", name: "Vues Reels", price1000: 0.8, min: 500, max: 500000 },
  { platform: "Instagram", icon: "IG", name: "Likes", price1000: 1.5, min: 100, max: 100000 },
  { platform: "YouTube", icon: "YT", name: "Vues", price1000: 3.5, min: 1000, max: 1000000 },
  { platform: "YouTube", icon: "YT", name: "Abonnés", price1000: 8.0, min: 100, max: 20000 },
  { platform: "Facebook", icon: "FB", name: "Followers Page", price1000: 3.0, min: 100, max: 50000 },
  { platform: "Facebook", icon: "FB", name: "Likes Post", price1000: 1.5, min: 100, max: 100000 }
];

function renderPlatformTabs(tabsId, listId) {
  const platforms = [...new Set(SERVICES.map(s => s.platform))];
  const el = document.getElementById(tabsId);
  el.innerHTML = platforms.map((p, i) =>
    `<button class="platform-tab${i === 0 ? ' active' : ''}" onclick="selectPlatformTab(this,'${p}','${tabsId}','${listId}')">${p}</button>`
  ).join('');
}
function selectPlatformTab(btn, platform, tabsId, listId) {
  document.querySelectorAll(`#${tabsId} .platform-tab`).forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderServiceList(platform, listId);
}
function renderServiceList(platform, listId) {
  const list = SERVICES.filter(s => s.platform === platform);
  const el = document.getElementById(listId);
  el.innerHTML = list.map(s => `
    <div class="service-item">
      <h4>${s.icon} ${s.platform} — ${s.name}</h4>
      <div class="price">${s.price1000.toFixed(2)}$ / 1000</div>
      <div class="meta">Min ${s.min.toLocaleString('fr-FR')} · Max ${s.max.toLocaleString('fr-FR')}</div>
    </div>
  `).join('');
}
function initHomeCatalog() {
  renderPlatformTabs('home-platform-tabs', 'home-services-list');
  renderServiceList(SERVICES[0].platform, 'home-services-list');
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
