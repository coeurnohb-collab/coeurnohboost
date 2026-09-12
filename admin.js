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

// Protege contre l'injection de code (XSS) : un titre ou une description
// soumis par un utilisateur ne doit jamais s'executer comme du code dans
// le navigateur de l'admin qui modere le contenu -- c'est la cible la plus
// sensible de toutes, puisque son compte a tous les droits.
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convertit un lien Google Drive "partage" en lien d'affichage direct --
// utile pour les anciennes publications qui utilisaient encore le systeme
// "colle un lien" avant le passage a l'upload direct (Cloudinary).
function normalizeMediaUrl(url) {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return url;
}

function mediaLoadError(el) {
  if (el.dataset.errorHandled) return;
  el.dataset.errorHandled = '1';
  el.style.display = 'none';
}

/* ================= UPLOAD DE FICHIER DIRECT (Cloudinary) =================
   Meme systeme que sur le site public (script.js) : envoie un vrai fichier
   choisi sur l'ordinateur/telephone de l'admin (photo, video, PDF) vers
   Cloudinary, avec suivi de progression, et renvoie l'URL a stocker dans
   Firestore. Remplace le systeme "colle un lien externe" (imgur/Google
   Drive) qui obligeait a passer par un site tiers avant de publier. */
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

function setUploadProgress(prefix, pct) {
  const wrap = document.getElementById(`${prefix}-progress-wrap`);
  const fill = document.getElementById(`${prefix}-progress-fill`);
  const label = document.getElementById(`${prefix}-progress-label`);
  if (wrap) wrap.classList.remove('hidden');
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;
}

/* ================= VISIONNEUSE PLEIN ECRAN (façon Facebook) =================
   Meme presentation que sur le site public : flèche de retour bleue en
   haut a gauche (pas d'emoji), fond noir, bouton telecharger. Utilisee
   pour ouvrir en grand les photos/videos publiees, directement depuis
   l'espace admin. */
const ICON_BACK = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
const ICON_PLAY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>`;

function openMediaViewer(url, type) {
  const contentEl = document.getElementById('media-viewer-content');
  if (!contentEl) return;
  contentEl.innerHTML = type === 'video'
    ? `<video src="${escapeHtml(url)}" controls autoplay class="media-viewer-media"></video>`
    : `<img src="${escapeHtml(url)}" alt="" class="media-viewer-media" loading="lazy">`;
  const backBtn = document.querySelector('.media-viewer-back');
  if (backBtn && !backBtn.innerHTML) backBtn.innerHTML = ICON_BACK;
  const downloadBtn = document.getElementById('media-viewer-download-btn');
  if (downloadBtn) downloadBtn.onclick = () => downloadMedia(url, type);
  document.getElementById('media-viewer').classList.remove('hidden');
}

function closeMediaViewer() {
  const el = document.getElementById('media-viewer');
  if (el) el.classList.add('hidden');
  const contentEl = document.getElementById('media-viewer-content');
  if (contentEl) contentEl.innerHTML = '';
}

async function downloadMedia(url, type) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `coeurnohboost-media.${type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    window.open(url, '_blank');
  }
}

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
  { id: "stats",        label: "📊 Stats" },
  { id: "orders",       label: "🛒 Commandes" },
  { id: "deposits",     label: "💰 Dépôts" },
  { id: "profit",       label: "💹 Bénéfices" },
  { id: "pricing",      label: "🏷️ Tarifs" },
  { id: "packages",     label: "📦 Packages" },
  { id: "monetization", label: "💵 Monétisation" },
  { id: "shop",         label: "🏪 Boutique" },
  { id: "withdrawals",  label: "💸 Retraits" },
  { id: "reports",      label: "🚩 Signalements" },
  { id: "announcements",label: "📢 Annonces" },
  { id: "users",        label: "👤 Utilisateurs" },
  { id: "automation",   label: "🤖 Automatisation" }
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
  if (tab === 'profit') loadProfitAdmin();
  if (tab === 'pricing') loadPricingAdmin();
  if (tab === 'packages') loadPackagesAdmin();
  if (tab === 'monetization') loadMonetizationAdmin();
  if (tab === 'shop') loadShopAdmin();
  if (tab === 'withdrawals') loadWithdrawalsAdmin();
  if (tab === 'reports') loadReportsAdmin();
  if (tab === 'announcements') loadAnnouncementsAdmin();
  if (tab === 'users') loadUsersAdmin();
  if (tab === 'automation') { loadAutomationStatus(); loadServiceMapAdmin(); }
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
// Exporte les commandes recentes (jusqu'a 2000) dans un fichier CSV
// telechargeable, pour la comptabilite ou une analyse dans un tableur.
async function exportOrdersCSV() {
  try {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(2000).get();
    if (snap.empty) { alert('Aucune commande à exporter.'); return; }

    const csvField = (val) => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;
    const headers = ['Date', 'Email', 'Plateforme', 'Service', 'Quantité', 'Prix ($)', 'Statut', 'Lien'];
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return [
        csvField(d.createdAt ? new Date(d.createdAt).toLocaleString('fr-FR') : ''),
        csvField(d.email || ''),
        csvField(d.platform || ''),
        csvField(d.service || ''),
        csvField(d.quantity || ''),
        csvField((d.price || 0).toFixed(2)),
        csvField(d.status || 'pending'),
        csvField(d.link || '')
      ].join(',');
    });

    // Le prefixe \uFEFF (BOM) garantit que les accents francais s'affichent
    // correctement en ouvrant le fichier dans Excel.
    const csvContent = '\uFEFF' + [headers.map(csvField).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes-coeurnohboost-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Erreur export : ' + e.message);
  }
}

async function loadOrdersAdmin() {
  const el = document.getElementById('admin-orders-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune commande pour l'instant.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const status = d.status || 'pending';
      // "refunded" / "pending_review" viennent de la correction du systeme
      // MoreThanPanel : remboursement automatique securise, et commandes en
      // attente de verification manuelle apres une erreur reseau ambigue.
      const statusLabels = { pending: 'en attente', processing: 'en cours', completed: 'terminée', refunded: 'remboursée', pending_review: 'à vérifier' };
      const statusLabel = statusLabels[status] || status;
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${escapeHtml(d.platform || '')} — ${escapeHtml(d.service || '')}</div>
            <div class="admin-row-meta">${escapeHtml(d.email || '')}<br>${escapeHtml(d.link || '')}<br>${d.quantity ? d.quantity + ' unités · ' : ''}${(d.price || 0).toFixed(2)}$ · ${new Date(d.createdAt).toLocaleString('fr-FR')}${d.debugReason ? `<br><span style="color:var(--red)">⚠️ Automatisation : ${escapeHtml(d.debugReason)}</span>` : ''}</div>
          </div>
          <span class="admin-badge ${status}">${statusLabel}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="updateOrderStatus('${doc.id}','processing')">En cours</button>
          <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${doc.id}','completed')">Terminée</button>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="deleteOrder('${doc.id}')">🗑️ Supprimer</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}
async function updateOrderStatus(orderId, status) {
  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    await db.collection('orders').doc(orderId).update({ status });
    if (status === 'completed' && orderDoc.exists) {
      const o = orderDoc.data();
      const title = 'Commande terminée ✅';
      const body = `Ta commande ${o.platform || ''} ${o.type || ''} est livrée.`;
      await db.collection('notifications').add({
        uid: o.uid,
        title,
        body,
        type: 'order',
        read: false,
        createdAt: new Date().toISOString()
      });
      // Vraie alerte push (en plus de la notification dans l'app)
      auth.currentUser.getIdToken().then(idToken => {
        fetch('/api/notify-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, uid: o.uid, title, body, category: 'orders', url: '/?openTab=orders' })
        }).catch(() => {});
      }).catch(() => {});
    }
    loadOrdersAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}
async function deleteOrder(orderId) {
  if (!confirm("Supprimer definitivement cette commande ? Cette action est irreversible.")) return;
  try {
    await db.collection('orders').doc(orderId).delete();
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
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="deleteDeposit('${doc.id}')">🗑️ Supprimer</button>
        </div>
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
    const newBalance = currentBalance + amount;
    await userRef.update({ balance: newBalance });
    await db.collection('topup_requests').doc(depositId).update({ status: 'approved' });
    await db.collection('wallet_transactions').add({
      uid, type: 'topup_admin', amount, balanceAfter: Math.round(newBalance * 100) / 100,
      description: 'Recharge validée par l\'équipe', relatedId: depositId,
      createdAt: new Date().toISOString()
    });
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
async function deleteDeposit(depositId) {
  if (!confirm("Supprimer definitivement cette demande ? Cette action est irreversible.")) return;
  try {
    await db.collection('topup_requests').doc(depositId).delete();
    loadDepositsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

/* =========================================================
   BÉNÉFICES — revenus clients vs coûts réels MoreThanPanel
   Calculé uniquement sur les commandes automatisées où le
   cout MTP (mtpCost) a pu être récupéré. Les commandes sans
   cout connu sont listées à part pour rester transparent.
   ========================================================= */
async function loadProfitAdmin() {
  const el = document.getElementById('admin-profit-cards');
  const listEl = document.getElementById('admin-profit-unknown-list');
  el.innerHTML = `<p class="admin-empty">Calcul en cours...</p>`;
  listEl.innerHTML = '';
  try {
    const snap = await db.collection('orders').get();
    let revenue = 0;
    let cost = 0;
    let countWithCost = 0;
    let unknownOrders = [];

    snap.forEach(doc => {
      const d = doc.data();
      const price = d.price || 0;
      if (typeof d.mtpCost === 'number') {
        revenue += price;
        cost += d.mtpCost;
        countWithCost++;
      } else if (d.status === 'processing' || d.status === 'completed') {
        // Commande automatisee ou terminee, mais dont le cout MTP est inconnu
        unknownOrders.push(d);
      }
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    el.innerHTML = `
      <div class="stat-card"><span class="stat-value">${revenue.toFixed(2)}$</span><span class="stat-label">Revenus (commandes suivies)</span></div>
      <div class="stat-card"><span class="stat-value">${cost.toFixed(2)}$</span><span class="stat-label">Coûts MoreThanPanel</span></div>
      <div class="stat-card"><span class="stat-value">${profit.toFixed(2)}$</span><span class="stat-label">Bénéfice net</span></div>
      <div class="stat-card"><span class="stat-value">${margin.toFixed(0)}%</span><span class="stat-label">Marge moyenne</span></div>
      <div class="stat-card"><span class="stat-value">${countWithCost}</span><span class="stat-label">Commandes avec coût connu</span></div>
    `;

    if (unknownOrders.length > 0) {
      listEl.innerHTML = `
        <p class="muted small" style="margin:16px 0 8px">
          ⚠️ ${unknownOrders.length} commande(s) automatisée(s) sans coût MTP connu (passées avant cette mise à jour, ou coût non recuperable) — non comptées ci-dessus.
        </p>`;
    }
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
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
        <div class="pricing-service-block">
          <label class="pricing-service-label">${s.label}</label>
          <div class="pricing-tier-row">
            <div class="pricing-tier-field">
              <span>Standard</span>
              <input type="number" step="0.01" id="price-${platformId}-${i}-standard" value="${s.price.standard}">
            </div>
            <div class="pricing-tier-field">
              <span>Premium</span>
              <input type="number" step="0.01" id="price-${platformId}-${i}-premium" value="${s.price.premium}">
            </div>
            <div class="pricing-tier-field">
              <span>VIP</span>
              <input type="number" step="0.01" id="price-${platformId}-${i}-vip" value="${s.price.vip}">
            </div>
          </div>
        </div>
      `).join('')}
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px" onclick="savePricing('${platformId}')">💾 Enregistrer les tarifs ${PLATFORMS.find(p=>p.id===platformId).name}</button>
      <div class="modal-loading hidden" id="pricing-saved-msg" style="margin-top:10px">✅ Tarifs enregistrés !</div>
    </div>
  `;
}
async function savePricing(platformId) {
  const services = SERVICE_CATALOG[platformId] || [];
  const updated = services.map((s, i) => ({
    type: s.type,
    price: {
      standard: parseFloat(document.getElementById(`price-${platformId}-${i}-standard`).value) || s.price.standard,
      premium: parseFloat(document.getElementById(`price-${platformId}-${i}-premium`).value) || s.price.premium,
      vip: parseFloat(document.getElementById(`price-${platformId}-${i}-vip`).value) || s.price.vip
    }
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
   PACKAGES — édition du prix de vente des forfaits (BUNDLES)
   ========================================================= */
let packagesActivePlatform = PLATFORMS[0].id;
function loadPackagesAdmin() {
  const tabsEl = document.getElementById('packages-platform-tabs');
  tabsEl.innerHTML = PLATFORMS.map(p =>
    `<button class="platform-tab${p.id === packagesActivePlatform ? ' active' : ''}" onclick="selectPackagesPlatform('${p.id}')">${p.name}</button>`
  ).join('');
  renderPackagesEditor(packagesActivePlatform);
}
function selectPackagesPlatform(platformId) {
  packagesActivePlatform = platformId;
  loadPackagesAdmin();
}
function computeBundleAutoPrice(platformId, bundle) {
  const services = SERVICE_CATALOG[platformId] || [];
  const total = bundle.items.reduce((sum, item) => {
    const s = services.find(x => x.type === item.type);
    return s ? sum + (item.qty / 1000) * s.price.standard : sum;
  }, 0);
  return total * 0.9;
}
function renderPackagesEditor(platformId) {
  const bundles = BUNDLES[platformId] || [];
  const el = document.getElementById('packages-editor');
  if (bundles.length === 0) {
    el.innerHTML = `<p class="admin-empty">Aucun forfait pour cette plateforme.</p>`;
    return;
  }
  el.innerHTML = `
    <div class="order-box">
      ${bundles.map((b, i) => {
        const label = bundleLabel(platformId, b);
        const autoPrice = computeBundleAutoPrice(platformId, b);
        const currentPrice = b.price != null ? b.price : autoPrice;
        return `
        <div class="pricing-service-block">
          <label class="pricing-service-label">${label}</label>
          <p class="muted small" style="margin:-4px 0 8px">Prix calculé automatiquement (composants -10%) : ${autoPrice.toFixed(2)}$</p>
          <div class="pricing-tier-row" style="grid-template-columns:1fr">
            <div class="pricing-tier-field">
              <span>Prix de vente ($)</span>
              <input type="number" step="0.01" id="package-${platformId}-${i}" value="${currentPrice.toFixed(2)}">
            </div>
          </div>
        </div>`;
      }).join('')}
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px" onclick="savePackagesPricing('${platformId}')">💾 Enregistrer les packages ${PLATFORMS.find(p=>p.id===platformId).name}</button>
      <div class="modal-loading hidden" id="packages-saved-msg" style="margin-top:10px">✅ Packages enregistrés !</div>
    </div>
  `;
}
async function savePackagesPricing(platformId) {
  const bundles = BUNDLES[platformId] || [];
  const updated = bundles.map((b, i) => ({
    index: i,
    price: parseFloat(document.getElementById(`package-${platformId}-${i}`).value) || 0
  }));
  try {
    await db.collection('bundle_pricing').doc(platformId).set({ bundles: updated });
    applyBundlePricingOverrides({ [platformId]: updated });
    const msg = document.getElementById('packages-saved-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2500);
  } catch (e) {
    alert("Erreur d'enregistrement : " + e.message);
  }
}

/* =========================================================
   MONÉTISATION — édition des prix des services spéciaux
   liés à la monétisation (YouTube, TikTok...)
   ========================================================= */
function loadMonetizationAdmin() {
  renderMonetizationEditor();
}
function renderMonetizationEditor() {
  const el = document.getElementById('monetization-editor');
  el.innerHTML = `
    <div class="order-box">
      ${MONETIZATION_SERVICES.map((s, i) => `
        <div class="pricing-service-block">
          <label class="pricing-service-label">${(PLATFORMS.find(p => p.id === s.platformId) || {}).name || s.platformId} — ${s.label}</label>
          <p class="muted small" style="margin:-4px 0 8px">${s.description}</p>
          <div class="pricing-tier-row">
            <div class="pricing-tier-field">
              <span>Standard</span>
              <input type="number" step="0.01" id="monet-${i}-standard" value="${s.price.standard}">
            </div>
            <div class="pricing-tier-field">
              <span>Premium</span>
              <input type="number" step="0.01" id="monet-${i}-premium" value="${s.price.premium}">
            </div>
            <div class="pricing-tier-field">
              <span>VIP</span>
              <input type="number" step="0.01" id="monet-${i}-vip" value="${s.price.vip}">
            </div>
          </div>
        </div>
      `).join('')}
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px" onclick="saveMonetizationPricing()">💾 Enregistrer les tarifs Monétisation</button>
      <div class="modal-loading hidden" id="monetization-saved-msg" style="margin-top:10px">✅ Tarifs enregistrés !</div>
    </div>
  `;
}
async function saveMonetizationPricing() {
  const updated = MONETIZATION_SERVICES.map((s, i) => ({
    id: s.id,
    price: {
      standard: parseFloat(document.getElementById(`monet-${i}-standard`).value) || 0,
      premium: parseFloat(document.getElementById(`monet-${i}-premium`).value) || 0,
      vip: parseFloat(document.getElementById(`monet-${i}-vip`).value) || 0
    }
  }));
  try {
    await db.collection('pricing').doc('monetization').set({ services: updated });
    applyMonetizationOverrides(updated);
    const msg = document.getElementById('monetization-saved-msg');
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
            <div class="admin-row-title">${d.verified ? '✔️ ' : ''}${escapeHtml(d.name || '—')}</div>
            <div class="admin-row-meta">${escapeHtml(d.email || '')}<br>Solde : ${(d.balance || 0).toFixed(2)}$ · Membre depuis ${d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—'}</div>
          </div>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="toggleUserVerified('${doc.id}', ${!d.verified})">
            ${d.verified ? '❌ Retirer la vérification' : '✔️ Vérifier ce vendeur'}
          </button>
          <button class="btn btn-outline btn-sm" onclick="diagnoseUserNotifs('${doc.id}')">🔍 Diagnostic notifs</button>
        </div>
        <div id="notif-diag-${doc.id}"></div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

// Affiche les 20 dernieres tentatives d'envoi de notification pour ce
// compte precis (succes, echec, raison) -- permet de repondre precisement
// a "je n'ai pas recu ma notification" au lieu de deviner.
async function diagnoseUserNotifs(uid) {
  const el = document.getElementById(`notif-diag-${uid}`);
  el.innerHTML = `<p class="admin-empty">Chargement du diagnostic...</p>`;
  try {
    const snap = await db.collection('notif_logs')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    if (snap.empty) {
      el.innerHTML = `<p class="admin-empty">Aucune tentative d'envoi enregistrée pour ce compte.</p>`;
      return;
    }
    el.innerHTML = `<div style="margin-top:10px;border-top:1px solid #e3e6eb;padding-top:10px">` + snap.docs.map(doc => {
      const l = doc.data();
      const icon = l.success ? '✅' : '❌';
      return `<div style="padding:6px 0;font-size:0.85rem;border-bottom:1px solid #f0f0f0">
        ${icon} <strong>${escapeHtml(l.title || l.category || '')}</strong>
        <span style="color:#888"> · ${escapeHtml(l.channel)} · ${new Date(l.createdAt).toLocaleString('fr-FR')}</span>
        <div style="color:#888">${escapeHtml(l.reason || '')}</div>
      </div>`;
    }).join('') + `</div>`;
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

// Bascule le badge "vendeur verifie" (coche bleue) d'un compte. Ce badge
// s'affiche desormais a cote de son nom partout ou ses publications
// apparaissent (fil, boutique, fiche detaillee). Mis a jour aussi dans
// "public_profiles" (petit profil public lu par l'app cote client pour
// garder nom/photo/certification a jour partout, meme sur les anciennes
// publications) -- sinon le badge resterait incoherent avec ce nouveau
// systeme tant que le vendeur ne retouche pas lui-meme son compte.
async function toggleUserVerified(uid, verified) {
  try {
    await db.collection('users').doc(uid).update({ verified });
    await db.collection('public_profiles').doc(uid).set({ verified }, { merge: true });
    loadUsersAdmin();
  } catch (e) {
    alert('Erreur : ' + e.message);
  }
}

/* =========================================================
   AUTOMATISATION — état de la connexion MoreThanPanel
   ========================================================= */
async function loadAutomationStatus() {
  const el = document.getElementById('automation-status');
  el.textContent = "Vérification...";
  try {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const res = await fetch('/api/mtp-balance', {
      headers: idToken ? { 'Authorization': 'Bearer ' + idToken } : {}
    });
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

/* =========================================================
   GESTION DES ID DE SERVICES (SMM) — correspondance MoreThanPanel,
   modifiable directement ici, sans jamais toucher au code.
   ========================================================= */
let serviceMapActivePlatform = null;
let serviceMapCache = {};

async function loadServiceMapAdmin() {
  const el = document.getElementById('service-map-editor');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('service_map').get();
    serviceMapCache = {};
    snap.forEach(doc => { serviceMapCache[doc.id] = doc.data(); });

    if (Object.keys(serviceMapCache).length === 0) {
      el.innerHTML = `
        <p class="muted small">Rien d'importé ici pour l'instant : les commandes utilisent encore le fichier de base (mtp-service-map.js). Importe-le une fois pour pouvoir tout modifier depuis cette page, ensuite.</p>
        <button class="btn btn-primary" onclick="importDefaultServiceMap()">⬇️ Importer les valeurs actuelles</button>`;
      document.getElementById('service-map-platform-tabs').innerHTML = '';
      return;
    }
    if (!serviceMapActivePlatform || !serviceMapCache[serviceMapActivePlatform]) {
      serviceMapActivePlatform = Object.keys(serviceMapCache).sort()[0];
    }
    renderServiceMapAdmin();
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

async function importDefaultServiceMap() {
  const el = document.getElementById('service-map-editor');
  el.innerHTML = `<p class="admin-empty">Import en cours...</p>`;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/get-service-map-defaults', {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    const defaults = await res.json();
    if (!res.ok) throw new Error(defaults.error || 'Erreur serveur');
    const batch = db.batch();
    Object.keys(defaults).forEach(platform => {
      batch.set(db.collection('service_map').doc(platform), defaults[platform]);
    });
    await batch.commit();
    await loadServiceMapAdmin();
  } catch (e) {
    alert("Erreur d'import : " + e.message);
    loadServiceMapAdmin();
  }
}

const SERVICE_MAP_KNOWN_PLATFORMS = ['tiktok','instagram','youtube','facebook','twitter','telegram','whatsapp','snapchat','linkedin','pinterest','twitch','spotify','discord','threads','kwai','likee','reddit','soundcloud'];
const SERVICE_MAP_KNOWN_TYPES = ['followers','likes','views','comments','shares','watchtime','repins'];

function renderServiceMapAdmin() {
  const platforms = Object.keys(serviceMapCache).sort();
  document.getElementById('service-map-platform-tabs').innerHTML =
    platforms.map(p =>
      `<button class="platform-tab${p === serviceMapActivePlatform ? ' active' : ''}" onclick="selectServiceMapPlatform('${p}')">${p}</button>`
    ).join('');

  const el = document.getElementById('service-map-editor');
  const types = serviceMapCache[serviceMapActivePlatform] || {};
  const typeKeys = Object.keys(types).sort();

  el.innerHTML = `
    <datalist id="svcmap-platform-list">${SERVICE_MAP_KNOWN_PLATFORMS.map(p => `<option value="${p}">`).join('')}</datalist>
    <datalist id="svcmap-type-list">${SERVICE_MAP_KNOWN_TYPES.map(t => `<option value="${t}">`).join('')}</datalist>

    <div style="display:flex;gap:8px;margin-bottom:16px">
      <input list="svcmap-platform-list" id="new-platform-input" class="text-input" placeholder="➕ Nouvelle plateforme (ex : tiktok)">
      <button class="btn btn-outline btn-sm" onclick="addServiceMapPlatform()">Ajouter</button>
    </div>

    <p class="muted small" style="margin-bottom:10px">Plateforme actuelle : <strong>${serviceMapActivePlatform || '—'}</strong></p>

    ${typeKeys.map(type => {
      const v = types[type] || {};
      return `
      <div class="pricing-service-block">
        <label class="pricing-service-label">
          ${type}
          <button class="btn btn-outline btn-sm" style="margin-left:8px" onclick="removeServiceMapType('${type}')" title="Supprimer ce type">🗑️</button>
        </label>
        <div class="pricing-tier-row">
          <div class="pricing-tier-field">
            <span>Standard</span>
            <input type="number" id="svcmap-${type}-standard" value="${v.standard ?? ''}" placeholder="ID">
          </div>
          <div class="pricing-tier-field">
            <span>Premium</span>
            <input type="number" id="svcmap-${type}-premium" value="${v.premium ?? ''}" placeholder="ID">
          </div>
          <div class="pricing-tier-field">
            <span>VIP</span>
            <input type="number" id="svcmap-${type}-vip" value="${v.vip ?? ''}" placeholder="ID">
          </div>
        </div>
      </div>`;
    }).join('') || '<p class="muted">Aucun type pour cette plateforme pour l\'instant — ajoutes-en un ci-dessous.</p>'}

    <div style="display:flex;gap:8px;margin-top:10px">
      <input list="svcmap-type-list" id="new-type-input" class="text-input" placeholder="➕ Nouveau type (ex : followers, likes, views...)">
      <button class="btn btn-outline btn-sm" onclick="addServiceMapType()">Ajouter</button>
    </div>

    <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:14px" onclick="saveServiceMapPlatform()">💾 Enregistrer "${serviceMapActivePlatform}"</button>
    <div class="modal-loading hidden" id="service-map-saved-msg" style="margin-top:10px">✅ Enregistré ! Actif tout de suite sur les prochaines commandes.</div>
    <button class="btn btn-outline" style="width:100%;justify-content:center;margin-top:16px;color:#a3241f;border-color:#a3241f" onclick="deleteServiceMapPlatform()">🗑️ Supprimer toute la plateforme "${serviceMapActivePlatform}" d'ici</button>
  `;
}

function selectServiceMapPlatform(p) {
  serviceMapActivePlatform = p;
  renderServiceMapAdmin();
}

function addServiceMapPlatform() {
  const input = document.getElementById('new-platform-input');
  const key = input.value.trim().toLowerCase().replace(/\s+/g, '');
  if (!key) return;
  serviceMapCache[key] = serviceMapCache[key] || {};
  serviceMapActivePlatform = key;
  renderServiceMapAdmin();
}

function addServiceMapType() {
  const input = document.getElementById('new-type-input');
  const key = input.value.trim().toLowerCase().replace(/\s+/g, '');
  if (!key) return;
  if (!serviceMapCache[serviceMapActivePlatform]) serviceMapCache[serviceMapActivePlatform] = {};
  serviceMapCache[serviceMapActivePlatform][key] = { standard: null, premium: null, vip: null };
  renderServiceMapAdmin();
}

function removeServiceMapType(type) {
  if (!confirm(`Supprimer le type "${type}" de "${serviceMapActivePlatform}" ?`)) return;
  delete serviceMapCache[serviceMapActivePlatform][type];
  renderServiceMapAdmin();
}

async function saveServiceMapPlatform() {
  const platform = serviceMapActivePlatform;
  const types = serviceMapCache[platform] || {};
  const updated = {};
  Object.keys(types).forEach(type => {
    const stdVal = document.getElementById(`svcmap-${type}-standard`).value;
    const premVal = document.getElementById(`svcmap-${type}-premium`).value;
    const vipVal = document.getElementById(`svcmap-${type}-vip`).value;
    updated[type] = {
      standard: stdVal === '' ? null : parseInt(stdVal, 10),
      premium: premVal === '' ? null : parseInt(premVal, 10),
      vip: vipVal === '' ? null : parseInt(vipVal, 10)
    };
  });
  try {
    await db.collection('service_map').doc(platform).set(updated);
    serviceMapCache[platform] = updated;
    const msg = document.getElementById('service-map-saved-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2500);
  } catch (e) {
    alert("Erreur d'enregistrement : " + e.message);
  }
}

async function deleteServiceMapPlatform() {
  const platform = serviceMapActivePlatform;
  if (!confirm(`Supprimer TOUTE la plateforme "${platform}" d'ici ? Les commandes pour cette plateforme retomberont sur le fichier de secours (si il la contient), sinon en traitement manuel.`)) return;
  try {
    await db.collection('service_map').doc(platform).delete();
    delete serviceMapCache[platform];
    serviceMapActivePlatform = null;
    await loadServiceMapAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

/* =========================================================
   BOUTIQUE — livres et produits (publications publiques)
   ========================================================= */
let pendingShopImageFile = null;
let pendingShopBookFile = null;

function toggleShopFileField() {
  const type = document.getElementById('shop-type').value;
  document.getElementById('shop-file-field').classList.toggle('hidden', type !== 'book');
}

function handleShopImageFileChange(event) {
  pendingShopImageFile = (event.target.files && event.target.files[0]) || null;
  const text = document.getElementById('shop-image-file-text');
  const label = document.getElementById('shop-image-file-label');
  if (text) text.textContent = pendingShopImageFile ? `✅ ${pendingShopImageFile.name}` : 'Choisir une photo';
  if (label) label.classList.toggle('has-file', !!pendingShopImageFile);
  const previewEl = document.getElementById('shop-image-preview');
  if (previewEl) {
    previewEl.innerHTML = pendingShopImageFile
      ? `<img src="${URL.createObjectURL(pendingShopImageFile)}" class="post-media-preview-media" alt="">`
      : '';
  }
}

function handleShopBookFileChange(event) {
  pendingShopBookFile = (event.target.files && event.target.files[0]) || null;
  const text = document.getElementById('shop-file-name');
  const label = document.getElementById('shop-file-input-label');
  if (text) text.textContent = pendingShopBookFile ? `✅ ${pendingShopBookFile.name}` : 'Choisir un PDF';
  if (label) label.classList.toggle('has-file', !!pendingShopBookFile);
}

function showShopFormError(msg) {
  const el = document.getElementById('shop-form-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function publishShopItem() {
  const errEl = document.getElementById('shop-form-error');
  errEl.classList.add('hidden');

  const type = document.getElementById('shop-type').value;
  const title = document.getElementById('shop-title').value.trim();
  const description = document.getElementById('shop-description').value.trim();
  const price = parseFloat(document.getElementById('shop-price').value);
  const category = document.getElementById('shop-category').value;
  const discountPercent = parseInt(document.getElementById('shop-discount').value, 10) || 0;
  const discountDurationHours = parseInt(document.getElementById('shop-discount-duration').value, 10) || 0;

  if (!title || !description || isNaN(price) || price <= 0) {
    showShopFormError("Merci de remplir le titre, la description et un prix valide.");
    return;
  }
  if (!pendingShopImageFile) {
    showShopFormError("Merci de choisir une photo pour cet article.");
    return;
  }
  if (type === 'book' && !pendingShopBookFile) {
    showShopFormError("Merci de choisir le fichier PDF du livre.");
    return;
  }

  const submitBtn = document.getElementById('shop-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publication en cours...'; }

  try {
    const { url: imageUrl } = await uploadFileToStorage(pendingShopImageFile, 'boutique-images', {
      maxSizeMB: 10,
      onProgress: (pct) => setUploadProgress('shop-image', pct)
    });

    let fileUrl = null;
    if (type === 'book') {
      const uploaded = await uploadFileToStorage(pendingShopBookFile, 'boutique-livres', {
        maxSizeMB: 50,
        onProgress: (pct) => setUploadProgress('shop-file', pct)
      });
      fileUrl = uploaded.url;
    }

    const newPubRef = await db.collection('publications').add({
      type,
      title,
      description,
      price,
      category,
      imageUrl,
      fileUrl: type === 'book' ? fileUrl : null,
      sellerUid: ADMIN_UID,
      sellerName: "Coeurnoh Universe",
      sellerVerified: true,
      sellerPhone: type === 'product' ? "243825001290" : null,
      discountPercent: discountPercent,
      promoExpiresAt: (discountPercent > 0 && discountDurationHours > 0)
        ? new Date(Date.now() + discountDurationHours * 60 * 60 * 1000).toISOString()
        : null,
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    });

    // Annonce publique visible par tous (panneau notifications)
    await db.collection('announcements').add({
      title: discountPercent > 0 ? 'Promotion disponible 🎉' : 'Nouveau produit disponible 🆕',
      body: `${title} — ${price.toFixed(2)}$${discountPercent > 0 ? ` (-${discountPercent}%)` : ''}`,
      type: 'announcement',
      url: '/?open=' + newPubRef.id,
      createdAt: new Date().toISOString()
    });

    // Vraie alerte push a TOUS les utilisateurs (meme app fermee) — manquait ici
    const broadcastIdToken1 = await auth.currentUser.getIdToken();
    fetch('/api/broadcast-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: broadcastIdToken1,
        title: discountPercent > 0 ? 'Promotion disponible 🎉' : 'Nouveau produit disponible 🆕',
        body: `${title} — ${price.toFixed(2)}$${discountPercent > 0 ? ` (-${discountPercent}%)` : ''}`,
        category: 'content',
        url: '/?open=' + newPubRef.id
      })
    }).catch(() => {});

    // Reinitialise le formulaire
    document.getElementById('shop-title').value = '';
    document.getElementById('shop-description').value = '';
    document.getElementById('shop-price').value = '';
    document.getElementById('shop-image-file').value = '';
    document.getElementById('shop-file-input').value = '';
    document.getElementById('shop-image-preview').innerHTML = '';
    document.getElementById('shop-image-file-text').textContent = 'Choisir une photo';
    document.getElementById('shop-image-file-label').classList.remove('has-file');
    document.getElementById('shop-file-name').textContent = 'Choisir un PDF';
    document.getElementById('shop-file-input-label').classList.remove('has-file');
    document.getElementById('shop-image-progress-wrap').classList.add('hidden');
    document.getElementById('shop-file-progress-wrap').classList.add('hidden');
    pendingShopImageFile = null;
    pendingShopBookFile = null;

    loadShopAdmin();
  } catch (e) {
    showShopFormError("Erreur lors de la publication : " + e.message);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Publier'; }
  }
}

/* =========================================================
   PUBLICATION PHOTO/VIDÉO (fil d'accueil, façon post social)
   ========================================================= */
let pendingAdminPostFile = null;

function toggleAdminPostFileField() {
  const type = document.getElementById('post-media-type').value;
  const input = document.getElementById('post-media-file');
  const labelText = document.getElementById('post-media-file-label-text');
  const iconEl = document.querySelector('#post-media-file-label .file-picker-icon');
  input.accept = type === 'video' ? 'video/*' : 'image/*';
  if (labelText) labelText.textContent = type === 'video' ? 'Vidéo' : 'Photo';
  if (iconEl) iconEl.textContent = type === 'video' ? '🎬' : '🖼️';
  // Le fichier choisi ne correspond plus forcement au type selectionne :
  // on le vide pour eviter d'envoyer une video comme photo (ou l'inverse).
  pendingAdminPostFile = null;
  input.value = '';
  document.getElementById('post-media-file-text').textContent = 'Choisir un fichier';
  document.getElementById('post-media-file-label').classList.remove('has-file');
  document.getElementById('post-media-preview').innerHTML = '';
}

function handleAdminPostFileChange(event) {
  pendingAdminPostFile = (event.target.files && event.target.files[0]) || null;
  const text = document.getElementById('post-media-file-text');
  const label = document.getElementById('post-media-file-label');
  if (text) text.textContent = pendingAdminPostFile ? `✅ ${pendingAdminPostFile.name}` : 'Choisir un fichier';
  if (label) label.classList.toggle('has-file', !!pendingAdminPostFile);

  const previewEl = document.getElementById('post-media-preview');
  const type = document.getElementById('post-media-type').value;
  if (!pendingAdminPostFile) { previewEl.innerHTML = ''; return; }
  const localUrl = URL.createObjectURL(pendingAdminPostFile);
  previewEl.innerHTML = type === 'video'
    ? `<video src="${localUrl}" class="post-media-preview-media" controls></video>`
    : `<img src="${localUrl}" class="post-media-preview-media" alt="">`;
}

function showPostFormError(msg) {
  const el = document.getElementById('post-form-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function submitAdminPost() {
  const errEl = document.getElementById('post-form-error');
  errEl.classList.add('hidden');

  const mediaType = document.getElementById('post-media-type').value;
  const caption = document.getElementById('post-caption').value.trim();

  if (!pendingAdminPostFile) {
    showPostFormError("Merci de choisir une photo ou une vidéo.");
    return;
  }

  const submitBtn = document.getElementById('post-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publication en cours...'; }

  try {
    const maxSizeMB = mediaType === 'video' ? 100 : 10;
    const { url } = await uploadFileToStorage(pendingAdminPostFile, 'posts', {
      maxSizeMB,
      onProgress: (pct) => setUploadProgress('post-media', pct)
    });

    const newPubRef = await db.collection('publications').add({
      type: 'post',
      mediaType,
      imageUrl: mediaType === 'photo' ? url : null,
      videoUrl: mediaType === 'video' ? url : null,
      description: caption,
      sellerUid: ADMIN_UID,
      sellerName: "Coeurnoh Universe",
      sellerVerified: true,
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    });

    // Annonce publique + vraie alerte push a tous les utilisateurs
    const annTitle = 'Nouvelle publication 📸';
    const annBody = caption ? caption.slice(0, 80) : (mediaType === 'video' ? 'Nouvelle vidéo' : 'Nouvelle photo');
    await db.collection('announcements').add({
      title: annTitle, body: annBody, type: 'announcement', url: '/?open=' + newPubRef.id, createdAt: new Date().toISOString()
    });
    const broadcastIdToken2 = await auth.currentUser.getIdToken();
    fetch('/api/broadcast-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: broadcastIdToken2, title: annTitle, body: annBody, category: 'content', url: '/?open=' + newPubRef.id })
    }).catch(() => {});

    // Reinitialise le formulaire
    document.getElementById('post-caption').value = '';
    document.getElementById('post-media-file').value = '';
    document.getElementById('post-media-file-text').textContent = 'Choisir un fichier';
    document.getElementById('post-media-file-label').classList.remove('has-file');
    document.getElementById('post-media-preview').innerHTML = '';
    document.getElementById('post-media-progress-wrap').classList.add('hidden');
    pendingAdminPostFile = null;

    loadShopAdmin();
    alert('Publication envoyée !');
  } catch (e) {
    showPostFormError("Erreur lors de la publication : " + e.message);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Publier'; }
  }
}

async function loadShopAdmin() {
  const el = document.getElementById('admin-shop-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('publications').orderBy('createdAt', 'desc').limit(100).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune publication pour l'instant.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const isPost = d.type === 'post';
      const typeLabel = d.type === 'book' ? '📖 Livre' : d.type === 'product' ? '🛍️ Produit' : (d.mediaType === 'video' ? '🎬 Vidéo' : '📸 Photo');
      const statusLabel = d.status === 'published' ? 'published' : 'draft';
      const titleText = isPost ? (d.description || '(sans légende)').slice(0, 60) : (d.title || '');
      const metaText = isPost
        ? `❤️ ${d.likesCount || 0} · 💬 ${d.commentsCount || 0}`
        : `${(d.price || 0).toFixed(2)}$ · ❤️ ${d.likesCount || 0} · 💬 ${d.commentsCount || 0}`;

      // Vignette cliquable -- ouvre la visionneuse plein ecran (fleche
      // bleue de retour) exactement comme sur le site public, que ce soit
      // une photo ou une video (avec icone de lecture superposee).
      const mediaUrl = normalizeMediaUrl(d.mediaType === 'video' ? d.videoUrl : d.imageUrl);
      const isVideo = d.mediaType === 'video' && d.videoUrl;
      const thumbHtml = mediaUrl
        ? (isVideo
            ? `<div class="admin-thumb-wrap" onclick="openMediaViewer('${escapeHtml(mediaUrl)}','video')"><video src="${escapeHtml(mediaUrl)}" muted class="admin-thumb"></video><span class="admin-thumb-play">${ICON_PLAY}</span></div>`
            : `<img src="${escapeHtml(mediaUrl)}" alt="" class="admin-thumb" onclick="openMediaViewer('${escapeHtml(mediaUrl)}','photo')">`)
        : `<div class="admin-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--cream);font-size:1.4rem">📄</div>`;

      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div style="display:flex;gap:12px;align-items:flex-start">
            ${thumbHtml}
            <div>
              <div class="admin-row-title">${typeLabel} — ${escapeHtml(titleText)}</div>
              <div class="admin-row-meta">${metaText}</div>
            </div>
          </div>
          <span class="admin-badge ${statusLabel}">${statusLabel}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="toggleShopStatus('${doc.id}','${d.status}')">${d.status === 'published' ? '⏸ Dépublier' : '▶️ Publier'}</button>
          <button class="btn btn-outline btn-sm" onclick="deleteShopItem('${doc.id}')">🗑️ Supprimer</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

async function toggleShopStatus(itemId, currentStatus) {
  try {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    await db.collection('publications').doc(itemId).update({ status: newStatus });
    loadShopAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

async function deleteShopItem(itemId) {
  if (!confirm("Supprimer definitivement cette publication ? Cette action est irreversible.")) return;
  try {
    await db.collection('publications').doc(itemId).delete();
    loadShopAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

/* =========================================================
   RETRAITS VENDEURS
   ========================================================= */
async function loadWithdrawalsAdmin() {
  const el = document.getElementById('admin-withdrawals-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('withdrawal_requests').orderBy('createdAt', 'desc').limit(100).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune demande de retrait.</p>`; return; }

    const methodLabels = { airtel: 'Airtel Money', mtn: 'MTN Mobile Money', crypto: 'Crypto (TRC20)' };

    el.innerHTML = snap.docs.map(doc => {
      const w = doc.data();
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${w.amountUSD.toFixed(2)}$ — ${escapeHtml(w.sellerName || 'Vendeur')}</div>
            <div class="admin-row-meta">${escapeHtml(methodLabels[w.method] || w.method)} · ${escapeHtml(w.accountDetails)}</div>
          </div>
          <span class="admin-badge ${w.status}">${w.status}</span>
        </div>
        ${w.status === 'pending' ? `
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="markWithdrawalPaid('${doc.id}')">✅ Marquer comme payé</button>
          <button class="btn btn-outline btn-sm" onclick="rejectWithdrawal('${doc.id}','${w.uid}',${w.amountUSD})">❌ Rejeter (rembourse)</button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

/* =========================================================
   SIGNALEMENTS DE CONTENU
   ========================================================= */
async function loadReportsAdmin() {
  const el = document.getElementById('admin-reports-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('reports').orderBy('createdAt', 'desc').limit(100).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucun signalement pour l'instant.</p>`; return; }

    const reasonLabels = {
      spam: 'Spam ou publicité', inapproprie: 'Contenu inapproprié',
      arnaque: 'Arnaque / fraude', autre: 'Autre raison'
    };

    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const status = r.status || 'pending';
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${escapeHtml(reasonLabels[r.reason] || r.reason)}</div>
            <div class="admin-row-meta">Publication : ${escapeHtml(r.targetId)} · Signalé par : ${escapeHtml(r.reporterUid)}</div>
            ${r.comment ? `<div class="admin-row-meta">💬 ${escapeHtml(r.comment)}</div>` : ''}
          </div>
          <span class="admin-badge ${status}">${status === 'pending' ? 'en attente' : status === 'resolved' ? 'traité' : 'rejeté'}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="window.open('index.html?produit=${r.targetId}','_blank')">👁️ Voir la publication</button>
          ${status === 'pending' ? `
          <button class="btn btn-outline btn-sm" onclick="resolveReport('${doc.id}','resolved')">✅ Marquer comme traité</button>
          <button class="btn btn-outline btn-sm" onclick="resolveReport('${doc.id}','dismissed')">❌ Rejeter</button>
          ` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

async function resolveReport(reportId, newStatus) {
  try {
    await db.collection('reports').doc(reportId).update({ status: newStatus });
    loadReportsAdmin();
  } catch (e) {
    alert('Erreur : ' + e.message);
  }
}

async function markWithdrawalPaid(reqId) {
  if (!confirm("Confirmer que tu as bien envoye l'argent au vendeur ?")) return;
  try {
    await db.collection('withdrawal_requests').doc(reqId).update({
      status: 'paid',
      processedAt: new Date().toISOString()
    });
    loadWithdrawalsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

async function rejectWithdrawal(reqId, uid, amount) {
  if (!confirm("Rejeter cette demande ? Le montant sera automatiquement rembourse sur le solde du vendeur.")) return;
  try {
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("Compte vendeur introuvable");
      const currentBalance = userSnap.data().balance || 0;
      const newBalance = Math.round((currentBalance + amount) * 100) / 100;
      transaction.update(userRef, { balance: newBalance });
      transaction.update(db.collection('withdrawal_requests').doc(reqId), {
        status: 'rejected',
        processedAt: new Date().toISOString()
      });
      transaction.set(db.collection('wallet_transactions').doc(), {
        uid, type: 'withdrawal_rejected_refund', amount, balanceAfter: newBalance,
        description: 'Retrait refusé, remboursé', relatedId: reqId,
        createdAt: new Date().toISOString()
      });
    });
    loadWithdrawalsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

/* =========================================================
   ANNONCES (messages publics admin)
   ========================================================= */
async function sendAnnouncement() {
  const title = document.getElementById('announce-title').value.trim();
  const body = document.getElementById('announce-body').value.trim();
  if (!title || !body) {
    alert("Merci de remplir le titre et le message.");
    return;
  }
  try {
    await db.collection('announcements').add({
      title: `📢 ${title}`,
      body,
      type: 'admin_message',
      url: '/?openTab=notifs',
      createdAt: new Date().toISOString()
    });

    // Vraie alerte push a TOUS les utilisateurs (meme app fermee)
    const broadcastIdToken2 = await auth.currentUser.getIdToken();
    fetch('/api/broadcast-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: broadcastIdToken2,
        title: `📢 ${title}`,
        body,
        category: 'admin',
        url: '/?openTab=notifs'
      })
    }).catch(() => {});

    document.getElementById('announce-title').value = '';
    document.getElementById('announce-body').value = '';
    loadAnnouncementsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

async function loadAnnouncementsAdmin() {
  const el = document.getElementById('admin-announcements-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('announcements').orderBy('createdAt', 'desc').limit(50).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune annonce pour l'instant.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const a = doc.data();
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${escapeHtml(a.title)}</div>
            <div class="admin-row-meta">${escapeHtml(a.body)}</div>
          </div>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="deleteAnnouncement('${doc.id}')">🗑️ Supprimer</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${e.message}</p>`;
  }
}

async function deleteAnnouncement(id) {
  if (!confirm("Supprimer cette annonce ?")) return;
  try {
    await db.collection('announcements').doc(id).delete();
    loadAnnouncementsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}
