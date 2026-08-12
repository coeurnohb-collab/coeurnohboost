/* =========================================================
   FIREBASE — même projet que le site public
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

let auth, db;
try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
} catch (e) {
  console.error("🔴 Firebase a échoué :", e.message);
}

/* =========================================================
   ACCÈS — porte d'entrée réservée à l'UID admin
   ========================================================= */
function showAdminGateError(msg) {
  const el = document.getElementById('admin-login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
async function adminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  document.getElementById('admin-login-error').classList.add('hidden');
  if (!email || !password) { showAdminGateError("Email et mot de passe requis."); return; }
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    showAdminGateError("Email ou mot de passe incorrect.");
  }
}
function adminLogout() {
  auth.signOut();
}

auth.onAuthStateChanged(user => {
  const gate = document.getElementById('admin-gate');
  const panel = document.getElementById('admin-panel');
  if (user && user.uid === ADMIN_UID) {
    gate.classList.add('hidden');
    panel.classList.remove('hidden');
    initAdminPanel();
  } else {
    panel.classList.add('hidden');
    gate.classList.remove('hidden');
    if (user && user.uid !== ADMIN_UID) {
      showAdminGateError("Ce compte n'a pas accès à l'administration.");
      auth.signOut();
    }
  }
});

/* =========================================================
   NAVIGATION PAR ONGLETS
   ========================================================= */
const ADMIN_TABS = [
  { id: "stats",      label: "📊 Stats" },
  { id: "orders",     label: "🛒 Commandes" },
  { id: "deposits",   label: "💰 Dépôts" },
  { id: "pricing",    label: "🏷️ Tarifs" },
  { id: "users",      label: "👤 Utilisateurs" },
  { id: "automation", label: "🤖 Automatisation" }
];
function initAdminPanel() {
  document.getElementById('admin-tabs').innerHTML = ADMIN_TABS.map((t, i) =>
    `<button class="${i === 0 ? 'active' : ''}" onclick="showAdminTab('${t.id}')">${t.label}</button>`
  ).join('');
  showAdminTab('stats');
}
function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
  document.getElementById('admin-tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('#admin-tabs button').forEach(b => b.classList.remove('active'));
  const idx = ADMIN_TABS.findIndex(t => t.id === tab);
  document.querySelectorAll('#admin-tabs button')[idx].classList.add('active');

  if (tab === 'stats') loadStats();
  if (tab === 'orders') loadOrdersAdmin();
  if (tab === 'deposits') loadDepositsAdmin();
  if (tab === 'pricing') loadPricingAdmin();
  if (tab === 'users') loadUsersAdmin();
  if (tab === 'automation') loadAutomationStatus();
}

/* =========================================================
   STATISTIQUES
   ========================================================= */
async function loadStats() {
  const el = document.getElementById('admin-stats-cards');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const [usersSnap, ordersSnap, depositsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('orders').get(),
      db.collection('topup_requests').where('status', '==', 'pending').get()
    ]);
    let revenue = 0, pendingOrders = 0;
    ordersSnap.forEach(doc => {
      const d = doc.data();
      revenue += d.price || 0;
      if (d.status === 'pending') pendingOrders++;
    });
    el.innerHTML = `
      <div class="stat-card"><span class="stat-value">${usersSnap.size}</span><span class="stat-label">Utilisateurs</span></div>
      <div class="stat-card"><span class="stat-value">${ordersSnap.size}</span><span class="stat-label">Commandes totales</span></div>
      <div class="stat-card"><span class="stat-value">${revenue.toFixed(2)}$</span><span class="stat-label">Chiffre d'affaires</span></div>
      <div class="stat-card"><span class="stat-value">${pendingOrders}</span><span class="stat-label">Commandes en attente</span></div>
      <div class="stat-card"><span class="stat-value">${depositsSnap.size}</span><span class="stat-label">Dépôts à valider</span></div>
    `;
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur de chargement : ${e.message}</p>`;
  }
}

/* =========================================================
   COMMANDES
   ========================================================= */
async function loadOrdersAdmin() {
  const el = document.getElementById('admin-orders-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune commande pour l'instant.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const status = d.status || 'pending';
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${d.platform || ''} — ${d.service || ''}</div>
            <div class="admin-row-meta">${d.email || ''}<br>${d.link || ''}<br>${d.quantity ? d.quantity + ' unités · ' : ''}${(d.price || 0).toFixed(2)}$ · ${new Date(d.createdAt).toLocaleString('fr-FR')}</div>
          </div>
          <span class="admin-badge ${status}">${status}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="updateOrderStatus('${doc.id}','processing')">En cours</button>
          <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${doc.id}','completed')">Terminée</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}
async function updateOrderStatus(orderId, status) {
  try {
    await db.collection('orders').doc(orderId).update({ status });
    loadOrdersAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

/* =========================================================
   DÉPÔTS (demandes de recharge)
   ========================================================= */
async function loadDepositsAdmin() {
  const el = document.getElementById('admin-deposits-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('topup_requests').orderBy('createdAt', 'desc').limit(50).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune demande pour l'instant.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const status = d.status || 'pending';
      const detail = d.method === 'mobile' ? `${d.country} · ${d.operator} · ${d.phone || ''}` : (d.method === 'crypto' ? d.crypto : 'Carte virtuelle');
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${(d.amountUSD || 0).toFixed(2)}$ — ${d.email || ''}</div>
            <div class="admin-row-meta">${detail}<br>${new Date(d.createdAt).toLocaleString('fr-FR')}</div>
          </div>
          <span class="admin-badge ${status}">${status}</span>
        </div>
        ${status === 'pending' ? `
        <div class="admin-row-actions">
          <button class="btn btn-primary btn-sm" onclick="approveDeposit('${doc.id}','${d.uid}',${d.amountUSD})">✓ Valider et créditer</button>
          <button class="btn btn-outline btn-sm" onclick="rejectDeposit('${doc.id}')">Rejeter</button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}
async function approveDeposit(depositId, uid, amount) {
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const currentBalance = userDoc.exists ? (userDoc.data().balance || 0) : 0;
    await userRef.update({ balance: currentBalance + amount });
    await db.collection('topup_requests').doc(depositId).update({ status: 'approved' });
    loadDepositsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}
async function rejectDeposit(depositId) {
  try {
    await db.collection('topup_requests').doc(depositId).update({ status: 'rejected' });
    loadDepositsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

/* =========================================================
   TARIFS — édition des prix de base, sauvegardés dans Firestore
   ========================================================= */
let pricingActivePlatform = PLATFORMS[0].id;
function loadPricingAdmin() {
  const tabsEl = document.getElementById('pricing-platform-tabs');
  tabsEl.innerHTML = PLATFORMS.map(p =>
    `<button class="platform-tab${p.id === pricingActivePlatform ? ' active' : ''}" onclick="selectPricingPlatform('${p.id}')">${p.name}</button>`
  ).join('');
  renderPricingEditor(pricingActivePlatform);
}
function selectPricingPlatform(platformId) {
  pricingActivePlatform = platformId;
  loadPricingAdmin();
}
function renderPricingEditor(platformId) {
  const services = SERVICE_CATALOG[platformId] || [];
  const el = document.getElementById('pricing-editor');
  el.innerHTML = `
    <div class="order-box">
      ${services.map((s, i) => `
        <div class="pricing-row">
          <label>${s.label}</label>
          <input type="number" step="0.01" id="price-${platformId}-${i}" value="${s.base}" oninput="updatePricingPreview('${platformId}', ${i})">
          <span class="pricing-preview" id="preview-${platformId}-${i}">Std ${s.base.toFixed(2)}$ · Prem ${(s.base * QUALITY_TIERS[1].mult).toFixed(2)}$ · VIP ${(s.base * QUALITY_TIERS[2].mult).toFixed(2)}$</span>
        </div>
      `).join('')}
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px" onclick="savePricing('${platformId}')">💾 Enregistrer les tarifs ${PLATFORMS.find(p=>p.id===platformId).name}</button>
      <div class="modal-loading hidden" id="pricing-saved-msg" style="margin-top:10px">✅ Tarifs enregistrés !</div>
    </div>
  `;
}
function updatePricingPreview(platformId, i) {
  const val = parseFloat(document.getElementById(`price-${platformId}-${i}`).value || 0);
  document.getElementById(`preview-${platformId}-${i}`).textContent =
    `Std ${val.toFixed(2)}$ · Prem ${(val * QUALITY_TIERS[1].mult).toFixed(2)}$ · VIP ${(val * QUALITY_TIERS[2].mult).toFixed(2)}$`;
}
async function savePricing(platformId) {
  const services = SERVICE_CATALOG[platformId] || [];
  const updated = services.map((s, i) => ({
    type: s.type,
    base: parseFloat(document.getElementById(`price-${platformId}-${i}`).value) || s.base
  }));
  try {
    await db.collection('pricing').doc(platformId).set({ services: updated });
    applyPricingOverrides({ [platformId]: updated });
    const msg = document.getElementById('pricing-saved-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2500);
  } catch (e) {
    alert("Erreur d'enregistrement : " + e.message);
  }
}

/* =========================================================
   UTILISATEURS
   ========================================================= */
async function loadUsersAdmin() {
  const el = document.getElementById('admin-users-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(50).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucun utilisateur.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${d.name || '—'}</div>
            <div class="admin-row-meta">${d.email || ''}<br>Solde : ${(d.balance || 0).toFixed(2)}$ · Membre depuis ${d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—'}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

/* =========================================================
   AUTOMATISATION — état de la connexion MoreThanPanel
   ========================================================= */
async function loadAutomationStatus() {
  const el = document.getElementById('automation-status');
  el.textContent = "Vérification...";
  try {
    const res = await fetch('/api/mtp-balance');
    const data = await res.json();
    if (res.ok) {
      el.innerHTML = `🟢 Connecté à MoreThanPanel — solde fournisseur : ${data.balance || '—'} ${data.currency || ''}`;
    } else {
      el.innerHTML = `🔴 Pas encore connecté.<br><span style="color:#a3241f;font-size:0.78rem">Détail de l'erreur : ${data.error || 'inconnue'} (code ${res.status})</span><br>Les commandes restent en attente de traitement manuel en attendant.`;
    }
  } catch (e) {
    el.innerHTML = `🔴 Erreur de connexion au serveur.<br><span style="color:#a3241f;font-size:0.78rem">Détail : ${e.message}</span>`;
  }
}
