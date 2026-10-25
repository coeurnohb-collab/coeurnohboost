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

// CORRECTIF (chantier 3) : pour une valeur inseree DANS un attribut
// onclick="...('${valeur}')" (double contexte : attribut HTML ET chaine
// JavaScript entre apostrophes), escapeHtml() seule ne suffit pas -- une
// apostrophe non echappee referme prematurement la chaine JS et permet
// d'y injecter du code qui s'execute dans la session de l'admin (tous les
// droits). Exemple concret corrige : le champ "targetId" d'un signalement
// est ecrit par n'importe quel utilisateur connecte (regles Firestore) et
// n'etait pas nettoye avant ce correctif. Meme fonction que escapeForJs()
// dans script.js, dupliquee ici car admin.js est un fichier independant.
function escapeForJs(str) {
  // Chaque caractère dangereux (\ ' " & < > retour-ligne) devient \uXXXX : la valeur reste
  // identique pour la fonction appelée, mais rien ne peut sortir de la chaîne JavaScript.
  return String(str == null ? '' : str).replace(/[\\'"&<>\r\n\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
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
  if (window.cnInitAppCheck) window.cnInitAppCheck(); // App Check (surveillance) : voir app-check.js
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
const ADMIN_GROUPS = [
  { title: "Aperçu", tabs: [
    { id: "stats", label: "Statistiques", icon: "📊" },
    { id: "profit", label: "Bénéfices", icon: "💹" } ] },
  { title: "Ventes & argent", tabs: [
    { id: "orders", label: "Commandes", icon: "🛒" },
    { id: "deposits", label: "Dépôts", icon: "💰" },
    { id: "withdrawals", label: "Retraits vendeurs", icon: "💸" },
    { id: "panels", label: "Panels clients", icon: "📈" } ] },
  { title: "Prix & offres", tabs: [
    { id: "pricing", label: "Tarifs SMM", icon: "🏷️" },
    { id: "packages", label: "Packages", icon: "📦" },
    { id: "monetization", label: "Monétisation", icon: "💵" },
    { id: "academy", label: "Académie", icon: "🎓" },
    { id: "domains", label: "Prix Site & Entreprise", icon: "🌐" },
    { id: "resellers", label: "API revendeurs", icon: "🔌" } ] },
  { title: "Sites & Entreprises", tabs: [
    { id: "sites", label: "Sites créés", icon: "🖥️" },
    { id: "sitehelp", label: "Messages sites", icon: "📩" },
    { id: "businesses", label: "Entreprises", icon: "🏢" } ] },
  { title: "Communauté", tabs: [
    { id: "users", label: "Utilisateurs", icon: "👤" },
    { id: "shop", label: "Boutique", icon: "🏪" },
    { id: "reports", label: "Signalements", icon: "🚩" },
    { id: "announcements", label: "Annonces", icon: "📢" } ] },
  { title: "Système", tabs: [
    { id: "automation", label: "Automatisation", icon: "🤖" },
    { id: "errors", label: "Erreurs", icon: "🐞" } ] }
];
const ADMIN_TABS = ADMIN_GROUPS.reduce((all, g) => all.concat(g.tabs), []);
function initAdminPanel() {
  const el = document.getElementById('admin-tabs');
  el.innerHTML = `
    <div class="adm-search"><input type="search" id="adm-menu-search" placeholder="Rechercher une section…" oninput="filterAdminMenu(this.value)"></div>
    ${ADMIN_GROUPS.map(g => `<div class="adm-group" data-group><h6>${escapeHtml(g.title)}</h6>${g.tabs.map(t =>
      `<button type="button" data-tab="${t.id}" onclick="showAdminTab('${t.id}')"><span class="adm-ic">${t.icon}</span><span class="adm-lb">${t.label}</span></button>`).join('')}</div>`).join('')}`;
  showAdminTab('stats');
}
function toggleAdminMenu(force) {
  const open = typeof force === 'boolean' ? force : !document.body.classList.contains('adm-menu-open');
  document.body.classList.toggle('adm-menu-open', open);
}
function filterAdminMenu(q) {
  q = (q || '').trim().toLowerCase();
  document.querySelectorAll('#admin-tabs [data-group]').forEach(g => {
    let any = false;
    g.querySelectorAll('button').forEach(b => {
      const ok = !q || b.textContent.toLowerCase().includes(q);
      b.style.display = ok ? '' : 'none'; if (ok) any = true;
    });
    g.style.display = any ? '' : 'none';
  });
}
function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
  document.getElementById('admin-tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('#admin-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const meta = ADMIN_TABS.find(t => t.id === tab);
  const ttl = document.getElementById('adm-title');
  if (ttl && meta) ttl.textContent = meta.icon + '  ' + meta.label;
  toggleAdminMenu(false);
  window.scrollTo(0, 0);
  if (tab === 'resellers') loadResellersAdmin();
  if (tab === 'sites') loadSitesAdmin();
  if (tab === 'businesses') loadBusinessesAdmin();

  if (tab === 'stats') loadStats();
  if (tab === 'orders') loadOrdersAdmin();
  if (tab === 'deposits') loadDepositsAdmin();
  if (tab === 'profit') loadProfitAdmin();
  if (tab === 'pricing') loadPricingAdmin();
  if (tab === 'packages') loadPackagesAdmin();
  if (tab === 'monetization') { loadMonetizationAdmin(); loadMockupAiPricing(); }
  if (tab === 'academy') loadAcademyAiConfig();
  if (tab === 'shop') loadShopAdmin();
  if (tab === 'withdrawals') loadWithdrawalsAdmin();
  if (tab === 'panels' && window.loadPanelsAdmin) window.loadPanelsAdmin();
  if (tab === 'sitehelp' && window.loadSiteHelpAdmin) window.loadSiteHelpAdmin();
  if (tab === 'domains') loadDomainsAdmin();
  if (tab === 'reports') loadReportsAdmin();
  if (tab === 'errors') loadErrorsAdmin();
  if (tab === 'announcements') { loadAnnouncementsAdmin(); loadScheduledBroadcastsAdmin(); updateSchedRecurrenceFields(); }
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
    el.innerHTML = `<p class="admin-empty">Erreur de chargement : ${escapeHtml(e.message)}</p>`;
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
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
// CORRECTIF (chantier 3) : le document "topup_requests" est en partie
// ecrit par le NAVIGATEUR du client (regles Firestore : seul le champ
// "uid" est verifie a la creation) -- email, montant, pays, operateur,
// telephone, devise crypto ne sont PAS valides par les regles. Avant, ces
// champs etaient injectes tels quels dans du HTML (faille XSS via
// "email") et meme dans du JavaScript SANS guillemets (faille XSS plus
// grave via "amountUSD" : une valeur non numerique executait du code dans
// TA session admin, qui a tous les droits). Desormais : tout texte passe
// par escapeHtml(), le montant est force en nombre fini (jamais injecte
// tel quel dans l'attribut onclick), et une ligne mal formee affiche une
// simple erreur A LA PLACE de cette ligne au lieu de casser tout l'onglet.
function safeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function safeDateLabel(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? 'Date inconnue' : d.toLocaleString('fr-FR');
}
async function loadDepositsAdmin() {
  const el = document.getElementById('admin-deposits-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('topup_requests').orderBy('createdAt', 'desc').limit(50).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune demande pour l'instant.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      try {
        const d = doc.data();
        const status = escapeHtml(d.status || 'pending');
        const amount = safeAmount(d.amountUSD);
        const uidAttr = escapeForJs(String(d.uid || ''));
        const detail = d.method === 'mobile'
          ? `${escapeHtml(d.country || '')} · ${escapeHtml(d.operator || '')} · ${escapeHtml(d.phone || '')}`
          : (d.method === 'crypto' ? escapeHtml(d.crypto || '') : 'Carte bancaire');
        return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${amount.toFixed(2)}$ — ${escapeHtml(d.email || '')}</div>
            <div class="admin-row-meta">${detail}<br>${safeDateLabel(d.createdAt)}</div>
          </div>
          <span class="admin-badge ${status}">${status}</span>
        </div>
        ${d.status === 'pending' || !d.status ? `
        <div class="admin-row-actions">
          <button class="btn btn-primary btn-sm" onclick="approveDeposit('${doc.id}','${uidAttr}',${amount})">✓ Valider et créditer</button>
          <button class="btn btn-outline btn-sm" onclick="rejectDeposit('${doc.id}')">Rejeter</button>
        </div>` : ''}
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="deleteDeposit('${doc.id}')">🗑️ Supprimer</button>
        </div>
      </div>`;
      } catch (rowErr) {
        // Une seule ligne malformee affiche juste une erreur a sa place,
        // au lieu de faire echouer tout l'onglet Depots.
        return `<div class="admin-row"><p class="admin-empty">Ligne illisible (id ${escapeHtml(doc.id)}) : ${escapeHtml(rowErr.message)}</p></div>`;
      }
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
          <p class="muted small" style="margin:-4px 0 8px">${escapeHtml(s.description)}</p>
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
   GÉNÉRATION IA DE MOCKUPS — essais gratuits + prix
   Stocké dans app_config/mockup_ai, relu par api/generate-mockup.js à
   chaque appel : un changement ici prend effet immédiatement, sans
   redéploiement.
   ========================================================= */
async function loadMockupAiPricing() {
  const msg = document.getElementById('mockup-ai-pricing-msg');
  if (msg) msg.textContent = '';
  try {
    const snap = await db.collection('app_config').doc('mockup_ai').get();
    const data = snap.exists ? snap.data() : {};
    document.getElementById('mockup-ai-free-quota').value = (data.freeQuota != null) ? data.freeQuota : 3;
    document.getElementById('mockup-ai-price').value = (data.priceUsd != null) ? data.priceUsd : 0.30;
  } catch (e) {
    if (msg) msg.textContent = 'Erreur de chargement : ' + e.message;
  }
}

async function saveMockupAiPricing() {
  const msg = document.getElementById('mockup-ai-pricing-msg');
  const freeQuota = Math.max(0, Math.floor(parseFloat(document.getElementById('mockup-ai-free-quota').value) || 0));
  const priceUsd = Math.max(0, parseFloat(document.getElementById('mockup-ai-price').value) || 0);
  try {
    await db.collection('app_config').doc('mockup_ai').set({
      freeQuota, priceUsd, updatedAt: new Date().toISOString(), updatedBy: ADMIN_UID
    }, { merge: true });
    if (msg) { msg.textContent = '✅ Enregistré — appliqué immédiatement pour tous les utilisateurs.'; setTimeout(() => { msg.textContent = ''; }, 3000); }
  } catch (e) {
    if (msg) msg.textContent = 'Erreur : ' + e.message;
  }
}

/* =========================================================
   ACADÉMIE — AUTO-ÉTUDES PAR IA : prix d'Académie Plus, limites, modèle
   Stocké dans app_config/academy_ai, relu par le serveur à chaque appel
   (api/_lib/academy-study.js) : un changement ici est immédiat.
   ========================================================= */
const ACAD_AI_FIELDS = [
  ['acad-ai-price', 'plusPriceMonth', 5], ['acad-ai-price-quarter', 'plusPriceQuarter', 13], ['acad-ai-price-semester', 'plusPriceSemester', 24], ['acad-ai-price-year', 'plusPriceYear', 45],
  ['acad-ai-free-lessons', 'freeLessonsTotal', 2], ['acad-ai-free-tutor', 'freeTutorTotal', 5], ['acad-ai-free-paths', 'freeMaxPaths', 1],
  ['acad-ai-plus-lessons', 'plusLessonsPerDay', 30], ['acad-ai-plus-tutor', 'plusTutorPerDay', 100], ['acad-ai-plus-paths', 'plusMaxPaths', 20]
];
// Les identifiants doivent correspondre à api/_lib/academy-catalog.js
const ACAD_CATEGORIES = [
  ['languages', 'Langues'], ['tech', 'Informatique et numérique'], ['business', 'Business et gestion'], ['science', 'Sciences et ingénierie'],
  ['health', 'Médecine et santé'], ['math', 'Mathématiques et logique'], ['arts', 'Arts et créativité'], ['sport', 'Sport et arts martiaux'], ['exams', 'Examens et concours'],
  ['career', 'Métiers et compétences pro'], ['society', 'Droit et sciences humaines'], ['personal', 'Développement personnel']
];
function renderAcademyAccess(access) {
  const host = document.getElementById('acad-access-list');
  if (!host) return;
  host.innerHTML = ACAD_CATEGORIES.map(([id, label]) => {
    const a = (access && access[id]) || {};
    const mode = ['free', 'plus', 'paid'].includes(a.mode) ? a.mode : 'free';
    return `<div class="admin-row" data-acc="${id}" style="margin-bottom:10px">
      <div class="admin-row-title" style="margin-bottom:8px">${escapeHtml(label)}</div>
      <div class="field"><label>Accès</label>
        <select class="text-input acc-mode"><option value="free"${mode === 'free' ? ' selected' : ''}>Gratuit</option><option value="plus"${mode === 'plus' ? ' selected' : ''}>Réservé aux membres Plus</option><option value="paid"${mode === 'paid' ? ' selected' : ''}>Payant (déblocage)</option></select></div>
      <div class="field"><label>Prix du déblocage ($)</label><input type="number" class="text-input acc-price" min="0" step="0.01" value="${Number(a.price) > 0 ? a.price : 0}"></div>
      <div class="field"><label>Durée du déblocage (jours)</label><input type="number" class="text-input acc-days" min="1" max="365" step="1" value="${Number(a.days) > 0 ? a.days : 90}"></div>
      <div class="field"><label>Catégorie ouverte</label>
        <select class="text-input acc-on"><option value="1"${a.enabled === false ? '' : ' selected'}>Oui</option><option value="0"${a.enabled === false ? ' selected' : ''}>Non (fermée)</option></select></div>
    </div>`;
  }).join('');
}
// Remplit le formulaire avec les prix conseillés pour les matières à forte valeur ; rien n'est enregistré tant que tu n'appuies pas sur « Enregistrer ».
function applySuggestedAcademyPrices() {
  const sug = { exams: 5, health: 8, business: 6 };
  Object.keys(sug).forEach((id) => {
    const row = document.querySelector(`[data-acc="${id}"]`);
    if (!row) return;
    row.querySelector('.acc-mode').value = 'paid';
    row.querySelector('.acc-price').value = sug[id];
    row.querySelector('.acc-days').value = 90;
    row.querySelector('.acc-on').value = '1';
  });
  const msg = document.getElementById('acad-ai-msg');
  if (msg) msg.textContent = 'Prix conseillés appliqués au formulaire : modifie-les si tu veux, puis appuie sur « Enregistrer tous les réglages ».';
}
function updateAcademySummary() {
  const el = document.getElementById('acad-summary');
  if (!el) return;
  const v = (id) => Math.max(0, parseFloat((document.getElementById(id) || {}).value) || 0);
  const free = `Un élève reçoit ${Math.floor(v('acad-ai-free-lessons'))} leçon(s) et ${Math.floor(v('acad-ai-free-tutor'))} question(s) gratuites.`;
  const plans = [['1 mois', 'acad-ai-price', 30], ['3 mois', 'acad-ai-price-quarter', 90], ['6 mois', 'acad-ai-price-semester', 180], ['1 an', 'acad-ai-price-year', 365]]
    .filter(([, id]) => v(id) > 0).map(([n, id, d]) => `${n} : ${v(id)} $ (${(v(id) / (d / 30)).toFixed(2)} $/mois)`);
  el.textContent = free + ' Ensuite : ' + (plans.length ? plans.join(' · ') : 'aucune formule active (les élèves ne pourront pas continuer).');
}
async function loadAcademyAiConfig() {
  const msg = document.getElementById('acad-ai-msg');
  if (msg) msg.textContent = '';
  try {
    const snap = await db.collection('app_config').doc('academy_ai').get();
    const d = snap.exists ? snap.data() : {};
    ACAD_AI_FIELDS.forEach(([id, key, def]) => { document.getElementById(id).value = (d[key] != null) ? d[key] : def; });
    document.getElementById('acad-ai-enabled').value = d.enabled === false ? '0' : '1';
    document.getElementById('acad-ai-provider').value = ['auto', 'anthropic', 'gemini'].includes(d.provider) ? d.provider : 'auto';
    document.getElementById('acad-ai-model').value = d.model || '';
    document.getElementById('acad-ai-model-plus').value = d.modelPlus || '';
    renderAcademyAccess(d.domainAccess);
    updateAcademySummary();
    const tab = document.getElementById('admin-tab-academy');
    if (tab && !tab.dataset.sumBound) { tab.dataset.sumBound = '1'; tab.addEventListener('input', updateAcademySummary); }
  } catch (e) {
    if (msg) msg.textContent = 'Erreur de chargement : ' + e.message;
  }
}

async function saveAcademyAiConfig() {
  const msg = document.getElementById('acad-ai-msg');
  const data = { enabled: document.getElementById('acad-ai-enabled').value === '1', provider: document.getElementById('acad-ai-provider').value };
  ACAD_AI_FIELDS.forEach(([id, key]) => {
    const n = parseFloat(document.getElementById(id).value);
    data[key] = Number.isFinite(n) ? Math.max(0, /^plusPrice/.test(key) ? n : Math.floor(n)) : 0;
  });
  const okModel = (v) => /^[A-Za-z0-9._:\-\/]{3,80}$/.test(v);
  const m1 = document.getElementById('acad-ai-model').value.trim(), m2 = document.getElementById('acad-ai-model-plus').value.trim();
  if ((m1 && !okModel(m1)) || (m2 && !okModel(m2))) { if (msg) msg.textContent = 'Nom de modèle invalide (lettres, chiffres, . _ - : /).'; return; }
  data.model = m1; data.modelPlus = m2;
  const access = {};
  for (const [id, label] of ACAD_CATEGORIES) {
    const row = document.querySelector(`[data-acc="${id}"]`);
    if (!row) continue;
    const mode = row.querySelector('.acc-mode').value;
    const price = Math.max(0, parseFloat(row.querySelector('.acc-price').value) || 0);
    const days = Math.min(365, Math.max(1, Math.floor(parseFloat(row.querySelector('.acc-days').value) || 90)));
    if (mode === 'paid' && !(price > 0)) { if (msg) msg.textContent = `« ${label} » est en mode Payant : indique un prix supérieur à 0.`; return; }
    access[id] = { mode, price: Math.round(price * 100) / 100, days, enabled: row.querySelector('.acc-on').value === '1' };
  }
  data.domainAccess = access;
  data.updatedAt = new Date().toISOString(); data.updatedBy = ADMIN_UID;
  try {
    await db.collection('app_config').doc('academy_ai').set(data, { merge: true });
    if (msg) { msg.textContent = 'Enregistré : appliqué immédiatement pour tous les utilisateurs.'; setTimeout(() => { msg.textContent = ''; }, 3500); }
  } catch (e) {
    if (msg) msg.textContent = 'Erreur : ' + e.message;
  }
}

/* =========================================================
   UTILISATEURS
   ========================================================= */
async function loadUsersAdmin() {
  const el = document.getElementById('admin-users-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucun utilisateur.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
      <div class="admin-row" data-q="${escapeHtml(((d.name || '') + ' ' + (d.email || '') + ' ' + (d.username || '')).toLowerCase())}">
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
          <button class="btn btn-primary btn-sm" onclick="openAdminMessage('${escapeForJs(doc.id)}', '${escapeForJs(d.name || d.email || '')}')">💬 Message</button>
          <button class="btn btn-outline btn-sm" onclick="diagnoseUserNotifs('${doc.id}')">🔍 Diagnostic notifs</button>
        </div>
        <div id="notif-diag-${doc.id}"></div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
      el.innerHTML = `🔴 Pas encore connecté.<br><span style="color:#a3241f;font-size:0.78rem">Détail de l'erreur : ${escapeHtml(data.error || 'inconnue')} (code ${res.status})</span><br>Les commandes restent en attente de traitement manuel en attendant.`;
    }
  } catch (e) {
    el.innerHTML = `🔴 Erreur de connexion au serveur.<br><span style="color:#a3241f;font-size:0.78rem">Détail : ${escapeHtml(e.message)}</span>`;
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
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
            ? `<div class="admin-thumb-wrap" onclick="openMediaViewer('${escapeForJs(mediaUrl)}','video')"><video src="${escapeHtml(mediaUrl)}" muted class="admin-thumb"></video><span class="admin-thumb-play">${ICON_PLAY}</span></div>`
            : `<img src="${escapeHtml(mediaUrl)}" alt="" class="admin-thumb" onclick="openMediaViewer('${escapeForJs(mediaUrl)}','photo')">`)
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
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
            <div class="admin-row-title">${w.source === 'panel' && w.netUSD != null ? `À envoyer : ${Number(w.netUSD).toFixed(2)}$ net <small class="muted">(demandé ${w.amountUSD.toFixed(2)}$ − commission ${Number(w.feeUSD || 0).toFixed(2)}$)</small>` : `${w.amountUSD.toFixed(2)}$`} — ${escapeHtml(w.sellerName || 'Vendeur')}${w.source === 'panel' ? ' <small class="muted">· Panel ' + escapeHtml(w.panelSlug || '') + '</small>' : ''}</div>
            <div class="admin-row-meta">${escapeHtml(methodLabels[w.method] || w.method)} · ${escapeHtml(w.accountDetails)}</div>
            ${w.risk && w.risk.level === 'review' ? `<div class="admin-row-meta" style="color:#b45309">⚠️ À vérifier : ${escapeHtml((w.risk.reasons || []).join(' · '))}</div>` : (w.source === 'panel' && w.status === 'pending' ? '<div class="admin-row-meta" style="color:#166534">✓ Aucun signal de risque</div>' : '')}
          </div>
          <span class="admin-badge ${w.status}">${w.status}</span>
        </div>
        ${w.status === 'pending' ? `
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="markWithdrawalPaid('${doc.id}')">✅ Marquer comme payé</button>
          <button class="btn btn-outline btn-sm" onclick="rejectWithdrawal('${escapeForJs(doc.id)}','${escapeForJs(w.uid)}',${Number(w.amountUSD) || 0})">❌ Rejeter (rembourse)</button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
          <button class="btn btn-outline btn-sm" onclick="window.open('index.html?produit=${encodeURIComponent(r.targetId || '')}','_blank')">👁️ Voir la publication</button>
          ${status === 'pending' ? `
          <button class="btn btn-outline btn-sm" onclick="resolveReport('${doc.id}','resolved')">✅ Marquer comme traité</button>
          <button class="btn btn-outline btn-sm" onclick="resolveReport('${doc.id}','dismissed')">❌ Rejeter</button>
          ` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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
   TARIFS "CRÉE TON SITE" (Premium + domaine) --
   entièrement gérés par l'admin, document Firestore pricing/site.
   Tant que rien n'est enregistré ici, le serveur (api/payments-actions.js)
   et le client (script.js) retombent sur des valeurs par défaut codées en
   dur (20$/mois Premium, 4$/mois pour le domaine).
   Le prix de domaine est un SEUL prix "par mois" : les durées proposées
   au client (1 mois, 3 mois/trimestre, 6 mois/semestre, 1 an) sont
   calculées AUTOMATIQUEMENT à partir de ce prix -- l'admin ne règle
   qu'un seul chiffre, jamais une formule à la fois.
   ========================================================= */
const SITE_DOMAIN_DURATIONS_MONTHS_ADMIN = [
  { months: 1, label: '1 mois' },
  { months: 3, label: '3 mois (trimestre)' },
  { months: 6, label: '6 mois (semestre)' },
  { months: 12, label: '1 an' }
];

async function loadDomainsAdmin() {
  await loadSitePricingEditor();
  await loadDomainRequestsList();
}

async function loadSitePricingEditor() {
  const el = document.getElementById('admin-site-pricing-editor');
  el.innerHTML = `<p class="admin-empty">Chargement des tarifs...</p>`;
  try {
    const snap = await db.collection('pricing').doc('site').get();
    const data = snap.exists ? snap.data() : {};
    const premiumPriceMonth = (typeof data.premiumPriceMonth === 'number' && data.premiumPriceMonth > 0) ? data.premiumPriceMonth : 20;
    const domainPriceMonth = (typeof data.domainPriceMonth === 'number' && data.domainPriceMonth > 0) ? data.domainPriceMonth : 4;
    const businessProPrice = (typeof data.businessProPrice === 'number' && data.businessProPrice > 0) ? data.businessProPrice : 15;
    renderSitePricingEditor(premiumPriceMonth, domainPriceMonth, businessProPrice);
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur de chargement des tarifs : ${escapeHtml(e.message)}</p>`;
  }
}

function renderSitePricingEditor(premiumPriceMonth, domainPriceMonth, businessProPrice) {
  const el = document.getElementById('admin-site-pricing-editor');
  el.innerHTML = `
    <div class="order-box">
      <div class="pricing-service-block">
        <label class="pricing-service-label">Abonnement Site Premium</label>
        <p class="muted small" style="margin:-4px 0 8px">Prix facturé pour 30 jours de Premium (photos et articles illimités, catégories, thèmes, retrait de la mention, statistiques, éligibilité à l'achat de domaine).</p>
        <div class="pricing-tier-row" style="grid-template-columns:1fr">
          <div class="pricing-tier-field">
            <span>Prix par mois ($)</span>
            <input type="number" step="0.01" min="0" id="site-pricing-premium-month" value="${premiumPriceMonth}">
          </div>
        </div>
      </div>

      <div class="pricing-service-block">
        <label class="pricing-service-label">Abonnement Entreprise Pro</label>
        <p class="muted small" style="margin:-4px 0 8px">Prix facturé pour 30 jours de Pro (page web publique, équipe, offres d'emploi, médiathèque illimitée, devis, etc.).</p>
        <div class="pricing-tier-row" style="grid-template-columns:1fr">
          <div class="pricing-tier-field">
            <span>Prix par mois ($)</span>
            <input type="number" step="0.01" min="0" id="site-pricing-business-pro" value="${businessProPrice}">
          </div>
        </div>
      </div>

      <div class="pricing-service-block">
        <label class="pricing-service-label">Achat de domaine</label>
        <p class="muted small" style="margin:-4px 0 8px">Un seul prix "par mois" : le prix pour 3 mois, 6 mois ou 1 an est calculé automatiquement, en multipliant simplement par le nombre de mois. Le propriétaire du site choisit la durée qui lui convient au moment de la demande.</p>
        <div class="pricing-tier-row" style="grid-template-columns:1fr">
          <div class="pricing-tier-field">
            <span>Prix par mois ($)</span>
            <input type="number" step="0.01" min="0" id="site-pricing-domain-month" oninput="updateSiteDomainPricingPreview()" value="${domainPriceMonth}">
          </div>
        </div>
        <div id="site-domain-pricing-preview" style="margin-top:10px"></div>
      </div>

      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="saveSitePricingConfig()">💾 Enregistrer les tarifs</button>
      <div class="modal-loading hidden" id="site-pricing-saved-msg" style="margin-top:10px">✅ Tarifs enregistrés !</div>
    </div>`;
  updateSiteDomainPricingPreview();
}

// Recalcule et affiche, en direct pendant que l'admin tape, le prix que
// verra le client pour chacune des 4 durees standards -- pour qu'il voie
// immediatement l'effet du prix mensuel qu'il est en train de regler.
function updateSiteDomainPricingPreview() {
  const input = document.getElementById('site-pricing-domain-month');
  const previewEl = document.getElementById('site-domain-pricing-preview');
  if (!input || !previewEl) return;
  const monthPrice = parseFloat(input.value) || 0;
  previewEl.innerHTML = SITE_DOMAIN_DURATIONS_MONTHS_ADMIN.map(d => {
    const price = Math.round(monthPrice * d.months * 100) / 100;
    return `<div class="admin-row-meta" style="margin-bottom:2px">${d.label} → <strong>${price}$</strong></div>`;
  }).join('');
}

async function saveSitePricingConfig() {
  const premiumPriceMonth = parseFloat(document.getElementById('site-pricing-premium-month').value) || 0;
  const domainPriceMonth = parseFloat(document.getElementById('site-pricing-domain-month').value) || 0;
  const businessProPrice = parseFloat(document.getElementById('site-pricing-business-pro').value) || 0;
  if (businessProPrice <= 0) { alert('Le prix Entreprise Pro doit être supérieur à 0.'); return; }
  if (premiumPriceMonth <= 0) { alert('Le prix Premium doit être supérieur à 0.'); return; }
  if (domainPriceMonth <= 0) { alert('Le prix du domaine doit être supérieur à 0.'); return; }
  try {
    await db.collection('pricing').doc('site').set({ premiumPriceMonth, domainPriceMonth, businessProPrice }, { merge: true });
    const msg = document.getElementById('site-pricing-saved-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2500);
  } catch (e) {
    alert("Erreur d'enregistrement : " + e.message);
  }
}

/* ---- Demandes d'achat de domaine -- traitement manuel. Meme principe
   que Retraits ci-dessus : le paiement (debit du portefeuille) a deja eu
   lieu cote serveur au moment de la demande (api/payments-actions.js,
   action site_domain_purchase, avec le prix ET la duree de la formule
   choisie a ce moment-la, stockes sur la demande -- "months"). Ici
   l'admin achete REELLEMENT le nom de domaine chez un registrar, connecte
   le DNS/Vercel a la main, puis marque la demande "active" : la date
   d'expiration respecte alors la formule payee, pas une duree fixe. Si le
   nom demande n'est pas disponible, "Rejeter" rembourse automatiquement
   le montant paye (r.pricePaid) sur le portefeuille du proprietaire,
   exactement comme rejectWithdrawal. */
async function loadDomainRequestsList() {
  const el = document.getElementById('admin-domains-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('domain_purchase_requests').orderBy('createdAt', 'desc').limit(100).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucune demande d'achat de domaine.</p>`; return; }

    const statusLabels = { pending: 'en attente', active: 'actif', rejected: 'rejeté' };

    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const status = r.status || 'pending';
      const months = r.months || 12;
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${escapeHtml(r.desiredDomain || '')}</div>
            <div class="admin-row-meta">Propriétaire : ${escapeHtml(r.uid || doc.id)} · Payé : ${(r.pricePaid || 0).toFixed(2)}$ (${escapeHtml(r.planLabel || months + ' mois')})</div>
          </div>
          <span class="admin-badge ${status}">${statusLabels[status] || status}</span>
        </div>
        ${status === 'pending' ? `
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="activateDomain('${escapeForJs(doc.id)}','${escapeForJs(r.desiredDomain || '')}',${months})">✅ Marquer comme actif (${months} mois)</button>
          <button class="btn btn-outline btn-sm" onclick="rejectDomain('${doc.id}','${r.uid || doc.id}',${r.pricePaid || 0})">❌ Rejeter (rembourse)</button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
  }
}

async function activateDomain(uid, desiredDomain, months) {
  if (!confirm(`Confirmer que "${desiredDomain}" est bien acheté et connecté au site ?`)) return;
  try {
    const expiresAt = new Date(Date.now() + (months || 12) * 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.collection('domain_purchase_requests').doc(uid).update({
      status: 'active', expiresAt, processedAt: new Date().toISOString()
    });
    loadDomainRequestsList();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

async function rejectDomain(uid, ownerUid, amount) {
  if (!confirm("Rejeter cette demande ? Le montant sera automatiquement remboursé sur le portefeuille du propriétaire.")) return;
  try {
    const userRef = db.collection('users').doc(ownerUid);
    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("Compte introuvable");
      const currentBalance = userSnap.data().balance || 0;
      const newBalance = Math.round((currentBalance + amount) * 100) / 100;
      transaction.update(userRef, { balance: newBalance });
      transaction.update(db.collection('domain_purchase_requests').doc(uid), {
        status: 'rejected',
        processedAt: new Date().toISOString()
      });
      transaction.set(db.collection('wallet_transactions').doc(), {
        uid: ownerUid, type: 'site_domain_purchase_rejected_refund', amount, balanceAfter: newBalance,
        description: 'Achat de domaine refusé, remboursé', relatedId: uid,
        createdAt: new Date().toISOString()
      });
    });
    loadDomainRequestsList();
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
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
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

/* =========================================================
   MESSAGES PROGRAMMÉS (envoi automatique récurrent)
   Collection Firestore "scheduled_broadcasts" — un cron Vercel
   (api/run-scheduled-broadcasts.js) vérifie régulièrement ce qui est dû
   et envoie tout seul, même si l'admin n'est pas connecté.
   ========================================================= */
const SCHED_WEEKDAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function updateSchedRecurrenceFields() {
  const mode = document.getElementById('sched-recurrence').value;
  document.getElementById('sched-field-once').classList.toggle('hidden', mode !== 'once');
  document.getElementById('sched-field-interval').classList.toggle('hidden', mode !== 'interval_hours');
  document.getElementById('sched-field-weekly').classList.toggle('hidden', mode !== 'weekly');
}

// Prochaine occurrence d'un jour de semaine + heure donnés, à partir de
// maintenant (ex: "chaque dimanche à 8h" -> le prochain dimanche 8h).
function computeNextWeeklyLocal(weekday, timeOfDay) {
  const [hh, mm] = String(timeOfDay || '08:00').split(':').map(n => parseInt(n, 10) || 0);
  const now = new Date();
  const next = new Date(now.getTime());
  next.setHours(hh, mm, 0, 0);
  let diff = (weekday - next.getDay() + 7) % 7;
  if (diff === 0 && next.getTime() <= now.getTime()) diff = 7;
  next.setDate(next.getDate() + diff);
  return next;
}

async function createScheduledBroadcast() {
  const msgEl = document.getElementById('sched-form-msg');
  msgEl.textContent = '';
  const title = document.getElementById('sched-title').value.trim();
  const body = document.getElementById('sched-body').value.trim();
  const recurrence = document.getElementById('sched-recurrence').value;
  if (!title || !body) { msgEl.textContent = "Merci de remplir le titre et le message."; return; }

  let nextSendAt = null;
  const payload = { title, body, recurrence, active: true, sentCount: 0, lastSentAt: null, createdBy: ADMIN_UID, createdAt: new Date().toISOString() };

  if (recurrence === 'once') {
    const raw = document.getElementById('sched-once-at').value;
    if (!raw) { msgEl.textContent = "Choisis une date et une heure d'envoi."; return; }
    nextSendAt = new Date(raw);
  } else if (recurrence === 'interval_hours') {
    const hours = Math.max(1, parseInt(document.getElementById('sched-interval-hours').value, 10) || 24);
    const rawStart = document.getElementById('sched-interval-start').value;
    if (!rawStart) { msgEl.textContent = "Indique à partir de quand le premier envoi doit partir."; return; }
    nextSendAt = new Date(rawStart);
    payload.intervalHours = hours;
  } else if (recurrence === 'weekly') {
    const weekday = parseInt(document.getElementById('sched-weekday').value, 10);
    const timeOfDay = document.getElementById('sched-weekly-time').value || '08:00';
    nextSendAt = computeNextWeeklyLocal(weekday, timeOfDay);
    payload.weekday = weekday;
    payload.timeOfDay = timeOfDay;
  }
  if (!nextSendAt || isNaN(nextSendAt.getTime())) { msgEl.textContent = "Date invalide."; return; }
  payload.nextSendAt = nextSendAt.toISOString();

  try {
    await db.collection('scheduled_broadcasts').add(payload);
    document.getElementById('sched-title').value = '';
    document.getElementById('sched-body').value = '';
    msgEl.textContent = '✅ Message programmé.';
    loadScheduledBroadcastsAdmin();
  } catch (e) {
    msgEl.textContent = "Erreur : " + e.message;
  }
}

function schedRecurrenceLabel(d) {
  if (d.recurrence === 'once') return 'Une seule fois';
  if (d.recurrence === 'interval_hours') return `Toutes les ${d.intervalHours || 24} h`;
  if (d.recurrence === 'weekly') return `Chaque ${SCHED_WEEKDAY_LABELS[d.weekday] || ''} à ${d.timeOfDay || ''}`;
  return d.recurrence || '';
}

async function loadScheduledBroadcastsAdmin() {
  const el = document.getElementById('admin-scheduled-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('scheduled_broadcasts').orderBy('createdAt', 'desc').limit(100).get();
    if (snap.empty) { el.innerHTML = `<p class="admin-empty">Aucun message programmé pour l'instant.</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const next = d.nextSendAt ? new Date(d.nextSendAt).toLocaleString('fr-FR') : '—';
      const last = d.lastSentAt ? new Date(d.lastSentAt).toLocaleString('fr-FR') : 'Jamais encore envoyé';
      return `
      <div class="admin-row">
        <div class="admin-row-top">
          <div>
            <div class="admin-row-title">${escapeHtml(d.title)} ${d.active ? '' : '<span class="muted small">(en pause)</span>'}</div>
            <div class="admin-row-meta">${escapeHtml(d.body)}</div>
            <div class="admin-row-meta">🔁 ${escapeHtml(schedRecurrenceLabel(d))} · Prochain envoi : ${next} · Envoyé ${d.sentCount || 0} fois · Dernier envoi : ${last}</div>
          </div>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="toggleScheduledBroadcast('${doc.id}', ${!d.active})">${d.active ? '⏸️ Mettre en pause' : '▶️ Réactiver'}</button>
          <button class="btn btn-outline btn-sm" onclick="deleteScheduledBroadcast('${doc.id}')">🗑️ Supprimer</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`;
  }
}

async function toggleScheduledBroadcast(id, active) {
  try {
    await db.collection('scheduled_broadcasts').doc(id).update({ active });
    loadScheduledBroadcastsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

async function deleteScheduledBroadcast(id) {
  if (!confirm("Supprimer ce message programmé ?")) return;
  try {
    await db.collection('scheduled_broadcasts').doc(id).delete();
    loadScheduledBroadcastsAdmin();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

/* =========================================================
   SURVEILLANCE : tableau de bord des erreurs (collection client_errors)
   Lecture limitée à 500 documents par chargement (quota gratuit Firebase).
   ========================================================= */
let errorGroupsCache = [];
let errorRawIds = [];

// Regroupe les doublons : les chiffres et identifiants longs sont remplacés (« 404 » et « 500 » = même famille)
function normalizeErrorMessage(msg) {
  return String(msg || '').replace(/[0-9a-f]{8,}/gi, 'ID').replace(/\d+/g, 'N').slice(0, 140);
}
function errorDeviceLabel(ua) {
  ua = String(ua || '');
  if (/iPhone|iPad|iPod/.test(ua)) return 'iPhone/iPad';
  if (/Android/.test(ua)) return 'Android';
  return 'Ordinateur';
}

async function loadErrorsAdmin() {
  const el = document.getElementById('admin-errors-body');
  if (!el) return;
  const days = parseInt(document.getElementById('admin-errors-range').value, 10) || 1;
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    let threshold = 10;
    try {
      const cfg = await db.collection('app_config').doc('monitoring').get();
      if (cfg.exists && Number(cfg.data().errorThreshold) >= 2) threshold = Number(cfg.data().errorThreshold);
    } catch (e) { /* seuil par défaut */ }
    document.getElementById('admin-errors-threshold').value = threshold;

    const since = Date.now() - days * 86400000;
    const snap = await db.collection('client_errors').where('at', '>=', since).orderBy('at', 'desc').limit(500).get();
    if (snap.empty) {
      errorGroupsCache = []; errorRawIds = [];
      el.innerHTML = `<p class="admin-empty">Aucune erreur sur cette période 🎉</p>`;
      return;
    }

    const groups = new Map(), byPage = {}, byDay = {}, users = new Set();
    errorRawIds = [];
    snap.forEach((doc) => {
      const d = doc.data();
      errorRawIds.push(doc.id);
      users.add(d.uid);
      const key = normalizeErrorMessage(d.msg) + '|' + (d.file || '') + ':' + (d.line || 0);
      let g = groups.get(key);
      if (!g) { g = { key, msg: d.msg || '', file: d.file || '', line: d.line || 0, count: 0, uids: new Set(), pages: {}, devices: {}, first: d.at, last: d.at, ids: [] }; groups.set(key, g); }
      g.count++; g.uids.add(d.uid); g.ids.push(doc.id);
      g.pages[d.page || '/'] = (g.pages[d.page || '/'] || 0) + 1;
      const dev = errorDeviceLabel(d.ua); g.devices[dev] = (g.devices[dev] || 0) + 1;
      if (d.at < g.first) g.first = d.at;
      if (d.at > g.last) g.last = d.at;
      byPage[d.page || '/'] = (byPage[d.page || '/'] || 0) + 1;
      const day = new Date(d.at).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    errorGroupsCache = Array.from(groups.values()).sort((a, b) => b.count - a.count);

    // Barres par jour (jours sans erreur inclus)
    const dayList = [];
    for (let i = Math.min(days, 30) - 1; i >= 0; i--) dayList.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    const maxDay = Math.max(1, ...dayList.map((k) => byDay[k] || 0));
    const bars = days === 1 ? '' : `
      <div class="admin-row" style="margin-bottom:14px">
        <div class="admin-row-title">Erreurs par jour</div>
        <div style="display:flex;align-items:flex-end;gap:3px;height:90px;margin-top:8px">
          ${dayList.map((k) => `<div title="${escapeHtml(k)} : ${byDay[k] || 0}" style="flex:1;min-width:4px;background:var(--red,#d7263d);opacity:${(byDay[k] || 0) ? 1 : .15};height:${Math.max(3, Math.round(((byDay[k] || 0) / maxDay) * 100))}%;border-radius:3px 3px 0 0"></div>`).join('')}
        </div>
        <div class="admin-row-meta" style="display:flex;justify-content:space-between"><span>${escapeHtml(dayList[0])}</span><span>${escapeHtml(dayList[dayList.length - 1])}</span></div>
      </div>`;

    const pages = Object.entries(byPage).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topPage = pages[0] ? pages[0][0] : '—';
    const limited = snap.size >= 500 ? `<p class="admin-empty" style="margin-bottom:10px">⚠️ Affichage limité aux 500 erreurs les plus récentes.</p>` : '';

    el.innerHTML = `
      <div class="stats-cards" style="margin-bottom:14px">
        <div class="stat-card"><span class="stat-value">${snap.size}</span><span class="stat-label">Erreurs</span></div>
        <div class="stat-card"><span class="stat-value">${errorGroupsCache.length}</span><span class="stat-label">Messages différents</span></div>
        <div class="stat-card"><span class="stat-value">${users.size}</span><span class="stat-label">Personnes touchées</span></div>
        <div class="stat-card"><span class="stat-value" style="font-size:1rem">${escapeHtml(topPage)}</span><span class="stat-label">Page la plus touchée</span></div>
      </div>
      ${limited}${bars}
      <h3 style="margin:6px 0 10px">Erreurs regroupées</h3>
      ${errorGroupsCache.map((g, i) => {
        const hot = g.count >= threshold;
        const pgs = Object.entries(g.pages).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${escapeHtml(p)} (${n})`).join(', ');
        const devs = Object.entries(g.devices).map(([p, n]) => `${escapeHtml(p)} (${n})`).join(', ');
        return `
        <div class="admin-row" style="${hot ? 'border-left:4px solid var(--red,#d7263d)' : ''}">
          <div class="admin-row-top">
            <div class="admin-row-title">${hot ? '🔴 ' : ''}${escapeHtml(g.msg)}</div>
            <strong>×${g.count}</strong>
          </div>
          <div class="admin-row-meta">
            📄 ${escapeHtml(g.file || 'inconnu')}${g.line ? ':' + g.line : ''}<br>
            👥 ${g.uids.size} personne(s) · 📱 ${devs}<br>
            🕒 première : ${escapeHtml(new Date(g.first).toLocaleString('fr-FR'))} · dernière : ${escapeHtml(new Date(g.last).toLocaleString('fr-FR'))}<br>
            🧭 ${pgs}
          </div>
          <div style="margin-top:8px"><button class="btn btn-outline btn-sm" onclick="deleteErrorGroup(${i})">🗑 Supprimer ce groupe (${g.count})</button></div>
        </div>`;
      }).join('')}
      <h3 style="margin:18px 0 10px">Par page</h3>
      <div class="admin-row">${pages.map(([p, n]) => `<div style="display:flex;justify-content:space-between"><span>${escapeHtml(p)}</span><strong>${n}</strong></div>`).join('')}</div>
      <div style="margin-top:16px"><button class="btn btn-outline btn-sm" onclick="deleteAllErrorsInView()">🗑 Vider toutes les erreurs affichées (${snap.size})</button></div>`;
  } catch (e) {
    el.innerHTML = `<p class="admin-empty">Erreur de chargement : ${escapeHtml(e.message)}</p>`;
  }
}

async function deleteErrorDocs(ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch();
    ids.slice(i, i + 400).forEach((id) => batch.delete(db.collection('client_errors').doc(id)));
    await batch.commit();
  }
}
async function deleteErrorGroup(index) {
  const g = errorGroupsCache[index];
  if (!g || !confirm('Supprimer ces ' + g.count + ' erreurs ?')) return;
  try { await deleteErrorDocs(g.ids); loadErrorsAdmin(); } catch (e) { alert('Suppression impossible : ' + e.message); }
}
async function deleteAllErrorsInView() {
  if (!errorRawIds.length || !confirm('Supprimer les ' + errorRawIds.length + ' erreurs affichées ?')) return;
  try { await deleteErrorDocs(errorRawIds); loadErrorsAdmin(); } catch (e) { alert('Suppression impossible : ' + e.message); }
}
async function saveErrorThreshold() {
  const n = parseInt(document.getElementById('admin-errors-threshold').value, 10);
  if (!(n >= 2 && n <= 1000)) { alert('Choisis un nombre entre 2 et 1000.'); return; }
  try {
    await db.collection('app_config').doc('monitoring').set({ errorThreshold: n }, { merge: true });
    alert('Seuil enregistré : alerte dès ' + n + ' erreurs identiques en 24 h.');
    loadErrorsAdmin();
  } catch (e) { alert('Enregistrement impossible : ' + e.message); }
}


/* =========================================================
   SITES CRÉÉS & ENTREPRISES — gestion depuis l'espace admin
   (écritures faites côté serveur : api/payments-actions.js, admin_manage)
   ========================================================= */
let adminSitesCache = [];
let adminBizCache = [];

async function adminManageCall(target, id, op, extra) {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch('/api/payments-actions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ idToken, action: 'admin_manage', target, id, op }, extra || {}))
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!data) throw new Error('Le serveur n’est pas à jour : mettez en ligne api/payments-actions.js (dossier api) puis attendez la fin du déploiement Vercel.');
  if (!data.success) throw new Error(data.error || 'Erreur');
  return data;
}

function admFmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'; }
function admMediaCount(d) {
  const m = Array.isArray(d.media) ? d.media : [];
  const c = (t) => m.filter(x => x && x.type === t).length;
  return `${c('image')} img · ${c('video')} vid · ${c('file')} fichiers`;
}

let adminLeadStats = null;
async function loadAdminLeadStats() {
  try { adminLeadStats = await adminManageCall(null, null, 'leads_stats'); } catch (e) { adminLeadStats = null; }
  if (typeof renderSitesAdmin === 'function' && document.getElementById('admin-sites-kpis')) { renderSitesAdmin(); }
  if (typeof renderBusinessesAdmin === 'function' && document.getElementById('admin-biz-kpis') && adminBizCache.length) { renderBusinessesAdmin(); }
}
function admLeadKpis() {
  const l = adminLeadStats; if (!l) return '';
  return `<div class="adm-kpi"><b>${l.appointments}</b><span>Rendez-vous${l.appointmentsNew ? ' · ' + l.appointmentsNew + ' nouv.' : ''}</span></div><div class="adm-kpi"><b>${l.subscribers}</b><span>Abonnés newsletter</span></div>`;
}
async function loadSitesAdmin() {
  loadAdminLeadStats();
  const el = document.getElementById('admin-sites-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('mini_sites').orderBy('createdAt', 'desc').limit(200).get();
    adminSitesCache = snap.docs.map(d => Object.assign({ _id: d.id }, d.data()));
    renderSitesAdmin();
  } catch (e) { el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`; }
}
function renderSitesAdmin() {
  const el = document.getElementById('admin-sites-list');
  const q = ((document.getElementById('admin-sites-search') || {}).value || '').trim().toLowerCase();
  const f = ((document.getElementById('admin-sites-filter') || {}).value) || 'all';
  const now = Date.now();
  const list = adminSitesCache.filter(s => {
    const prem = !!(s.premium && s.premiumUntil && new Date(s.premiumUntil).getTime() > now);
    if (f === 'premium' && !prem) return false;
    if (f === 'free' && prem) return false;
    if (f === 'published' && s.status !== 'published') return false;
    if (q && !((s.businessName || '') + ' ' + (s.slug || '') + ' ' + (s.contactEmail || '')).toLowerCase().includes(q)) return false;
    return true;
  });
  const premCount = adminSitesCache.filter(s => s.premium && s.premiumUntil && new Date(s.premiumUntil).getTime() > now).length;
  document.getElementById('admin-sites-kpis').innerHTML = `
    <div class="adm-kpi"><b>${adminSitesCache.length}</b><span>Sites créés</span></div>
    <div class="adm-kpi"><b>${premCount}</b><span>Premium actifs</span></div>
    <div class="adm-kpi"><b>${adminSitesCache.filter(s => s.status === 'published').length}</b><span>Publiés</span></div>${admLeadKpis()}`;
  if (!list.length) { el.innerHTML = `<p class="admin-empty">Aucun site.</p>`; return; }
  el.innerHTML = list.map(s => {
    const prem = !!(s.premium && s.premiumUntil && new Date(s.premiumUntil).getTime() > now);
    return `<div class="admin-row adm-card">
      <div class="admin-row-top"><div style="min-width:0">
        <div class="admin-row-title">${escapeHtml(s.businessName || '—')} <span class="adm-pill ${prem ? 'gold' : ''}">${prem ? 'Premium' : 'Gratuit'}</span> <span class="adm-pill ${s.status === 'published' ? 'ok' : ''}">${s.status === 'published' ? 'Publié' : 'Brouillon'}</span></div>
        <div class="admin-row-meta">/s/${escapeHtml(s.slug || '')} · type ${escapeHtml(s.siteType || '—')} · ${s.viewsCount || 0} vues<br>${prem ? 'Premium jusqu\'au ' + admFmtDate(s.premiumUntil) + ' · ' : ''}${admMediaCount(s)} · ${(s.portfolio || []).length} projets · ${(s.blogPosts || []).length} actus<br>Créé le ${admFmtDate(s.createdAt)}</div>
      </div></div>
      <div class="admin-row-actions">
        <a class="btn btn-outline btn-sm" href="/s/${encodeURIComponent(s.slug || '')}" target="_blank" rel="noopener">Voir</a>
        <button class="btn btn-outline btn-sm" onclick="adminGrant('site','${s._id}')">Offrir Premium…</button>
        ${prem ? `<button class="btn btn-outline btn-sm" onclick="adminOp('site','${s._id}','revoke')">Retirer Premium</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="adminOp('site','${s._id}','status','${s.status === 'published' ? 'draft' : 'published'}')">${s.status === 'published' ? 'Dépublier' : 'Publier'}</button>
        <button class="btn btn-outline btn-sm adm-danger" onclick="adminOp('site','${s._id}','delete')">Supprimer</button>
      </div></div>`;
  }).join('');
}

async function loadBusinessesAdmin() {
  if (!adminLeadStats) loadAdminLeadStats();
  const el = document.getElementById('admin-biz-list');
  el.innerHTML = `<p class="admin-empty">Chargement...</p>`;
  try {
    const snap = await db.collection('businesses').limit(300).get();
    adminBizCache = snap.docs.map(d => Object.assign({ _id: d.id }, d.data()))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    renderBusinessesAdmin();
  } catch (e) { el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`; }
}
function renderBusinessesAdmin() {
  const el = document.getElementById('admin-biz-list');
  const q = ((document.getElementById('admin-biz-search') || {}).value || '').trim().toLowerCase();
  const f = ((document.getElementById('admin-biz-filter') || {}).value) || 'all';
  const now = Date.now();
  const isPro = (b) => !!(b.pro && b.proUntil && new Date(b.proUntil).getTime() > now);
  const list = adminBizCache.filter(b => {
    if (f === 'pro' && !isPro(b)) return false;
    if (f === 'free' && isPro(b)) return false;
    if (f === 'verified' && !b.adminVerified) return false;
    if (q && !((b.businessName || '') + ' ' + (b.category || '') + ' ' + (b.address || '') + ' ' + (b.email || '')).toLowerCase().includes(q)) return false;
    return true;
  });
  document.getElementById('admin-biz-kpis').innerHTML = `
    <div class="adm-kpi"><b>${adminBizCache.length}</b><span>Entreprises</span></div>
    <div class="adm-kpi"><b>${adminBizCache.filter(isPro).length}</b><span>Pro actives</span></div>
    <div class="adm-kpi"><b>${adminBizCache.filter(b => b.adminVerified).length}</b><span>Vérifiées</span></div>${admLeadKpis()}`;
  if (!list.length) { el.innerHTML = `<p class="admin-empty">Aucune entreprise.</p>`; return; }
  el.innerHTML = list.map(b => {
    const pro = isPro(b);
    return `<div class="admin-row adm-card">
      <div class="admin-row-top"><div style="min-width:0">
        <div class="admin-row-title">${b.adminVerified ? '<span class="adm-pill ok">Vérifiée</span> ' : ''}${escapeHtml(b.businessName || '—')} <span class="adm-pill ${pro ? 'gold' : ''}">${pro ? 'Pro' : 'Gratuit'}</span> <span class="adm-pill ${b.status === 'hidden' ? '' : 'ok'}">${b.status === 'hidden' ? 'Masquée' : 'Visible'}</span></div>
        <div class="admin-row-meta">${escapeHtml(b.category || '')} · ${escapeHtml(b.address || '—')} · ${b.viewsCount || 0} vues<br>${pro ? 'Pro jusqu\'au ' + admFmtDate(b.proUntil) + ' · ' : ''}${admMediaCount(b)} · ${(b.catalog || []).length} produits · ${(b.jobs || []).length} offres d'emploi<br>Créée le ${admFmtDate(b.createdAt)}</div>
      </div></div>
      <div class="admin-row-actions">
        ${pro ? `<a class="btn btn-outline btn-sm" href="/e/${encodeURIComponent(b._id)}" target="_blank" rel="noopener">Page web</a>` : ''}
        <button class="btn btn-outline btn-sm" onclick="adminGrant('business','${b._id}')">Offrir Pro…</button>
        ${pro ? `<button class="btn btn-outline btn-sm" onclick="adminOp('business','${b._id}','revoke')">Retirer Pro</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="adminOp('business','${b._id}','verify',${!b.adminVerified})">${b.adminVerified ? 'Retirer badge' : 'Vérifier'}</button>
        <button class="btn btn-outline btn-sm" onclick="adminOp('business','${b._id}','status','${b.status === 'hidden' ? 'active' : 'hidden'}')">${b.status === 'hidden' ? 'Rendre visible' : 'Masquer'}</button>
        <button class="btn btn-outline btn-sm adm-danger" onclick="adminOp('business','${b._id}','delete')">Supprimer</button>
      </div></div>`;
  }).join('');
}

function adminGrant(target, id) {
  const isSite = target === 'site';
  const feats = isSite
    ? [['publish', 'Publication du site'], ['look', 'Design et options Pro'], ['content', 'Contenu étendu (photos, projets, actus)']]
    : [['web', 'Page web de l’entreprise'], ['tools', 'Outils professionnels'], ['content', 'Catalogue et offres étendus']];
  const old = document.getElementById('adm-grant-modal'); if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'adm-grant-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,12,24,.72);display:flex;align-items:flex-end;justify-content:center;padding:0';
  m.innerHTML = `<div style="background:#fff;color:#111827;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:20px 18px 24px;max-height:92vh;overflow:auto;font-family:inherit">
    <div style="font-weight:800;font-size:17px;margin-bottom:4px">${isSite ? 'Offrir Premium' : 'Offrir Pro'}</div>
    <div style="font-size:13px;color:#6b7280;margin-bottom:14px">Choisissez ce que vous offrez, puis la durée.</div>
    <label style="display:flex;gap:10px;align-items:center;padding:12px;border:1.5px solid #2563eb;border-radius:12px;margin-bottom:8px;cursor:pointer">
      <input type="radio" name="ag-mode" value="all" checked> <span><b>Tout offrir en Pro</b><br><small style="color:#6b7280">Toutes les fonctions Pro sont débloquées</small></span></label>
    <label style="display:flex;gap:10px;align-items:center;padding:12px;border:1.5px solid #d1d5db;border-radius:12px;margin-bottom:10px;cursor:pointer">
      <input type="radio" name="ag-mode" value="pick"> <span><b>Choisir les services à offrir</b><br><small style="color:#6b7280">Seulement ceux que vous cochez</small></span></label>
    <div id="ag-list" style="display:none;margin:0 0 12px;padding:6px 4px">
      ${feats.map(f => `<label style="display:flex;gap:10px;align-items:center;padding:8px 4px;cursor:pointer"><input type="checkbox" class="ag-f" value="${f[0]}"> ${f[1]}</label>`).join('')}
    </div>
    <label style="font-size:13px;font-weight:700">Durée (jours)</label>
    <div style="display:flex;gap:6px;margin:6px 0 16px;flex-wrap:wrap">
      ${[7, 30, 90, 365].map(d => `<button type="button" class="btn btn-outline btn-sm ag-d" data-d="${d}">${d} j</button>`).join('')}
      <input id="ag-days" type="number" min="1" max="3650" value="30" style="width:90px;padding:8px;border:1px solid #d1d5db;border-radius:8px">
    </div>
    <div style="display:flex;gap:8px"><button type="button" class="btn btn-outline" id="ag-cancel" style="flex:1">Annuler</button>
    <button type="button" class="btn btn-primary" id="ag-ok" style="flex:2">Offrir</button></div></div>`;
  document.body.appendChild(m);
  const q = (s) => m.querySelector(s);
  m.querySelectorAll('input[name=ag-mode]').forEach(r => r.addEventListener('change', () => {
    q('#ag-list').style.display = q('input[name=ag-mode]:checked').value === 'pick' ? 'block' : 'none';
  }));
  m.querySelectorAll('.ag-d').forEach(b => b.addEventListener('click', () => { q('#ag-days').value = b.dataset.d; }));
  q('#ag-cancel').addEventListener('click', () => m.remove());
  m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
  q('#ag-ok').addEventListener('click', async () => {
    const days = parseInt(q('#ag-days').value, 10);
    if (!days || days < 1) { alert('Nombre de jours invalide.'); return; }
    const pick = q('input[name=ag-mode]:checked').value === 'pick';
    const features = pick ? Array.from(m.querySelectorAll('.ag-f:checked')).map(x => x.value) : [];
    if (pick && !features.length) { alert('Cochez au moins un service.'); return; }
    q('#ag-ok').disabled = true;
    try { await adminManageCall(target, id, 'grant', pick ? { days, features } : { days }); m.remove(); await adminReload(target); }
    catch (e) { q('#ag-ok').disabled = false; alert(e.message); }
  });
}
async function adminOp(target, id, op, value) {
  const labels = { revoke: 'Retirer l’abonnement ?', delete: 'Supprimer définitivement ? Cette action est irréversible.' };
  if (labels[op] && !confirm(labels[op])) return;
  try { await adminManageCall(target, id, op, { value }); await adminReload(target); } catch (e) { alert(e.message); }
}
async function adminReload(target) { return target === 'site' ? loadSitesAdmin() : loadBusinessesAdmin(); }


/* =========================================================
   API REVENDEURS : réglages globaux, clés actives, suspension
   ========================================================= */
let adminResellers = { items: [], settings: {} };
async function loadResellersAdmin() {
  const el = document.getElementById('admin-resellers-list');
  el.innerHTML = '<p class="admin-empty">Chargement...</p>';
  try {
    const d = await adminManageCall(null, null, 'api_list');
    adminResellers = d;
    renderResellersAdmin();
  } catch (e) { el.innerHTML = `<p class="admin-empty">Erreur : ${escapeHtml(e.message)}</p>`; }
}
function renderResellersAdmin() {
  const st = adminResellers.settings || {};
  const items = adminResellers.items || [];
  const set = document.getElementById('admin-resellers-settings');
  set.innerHTML = `
    <div class="adm-card admin-row">
      <div class="admin-row-title">Réglages de l'API</div>
      <label class="adm-inline"><input type="checkbox" id="rs-enabled" ${st.enabled !== false ? 'checked' : ''}> API activée pour tous</label>
      <div class="adm-grid2">
        <label>Remise revendeur (%)<input type="number" id="rs-discount" min="0" max="40" step="1" value="${Number(st.discountPct != null ? st.discountPct : 15)}"></label>
        <label>Plafond par jour ($)<input type="number" id="rs-limit" min="1" max="10000" step="1" value="${Number(st.dailyLimitDefault || 100)}"></label>
      </div>
      <div class="admin-row-actions"><button class="btn btn-primary btn-sm" onclick="saveResellerSettings()">Enregistrer</button></div>
    </div>`;
  document.getElementById('admin-resellers-kpis').innerHTML = `
    <div class="adm-kpi"><b>${items.length}</b><span>Clés</span></div>
    <div class="adm-kpi"><b>${items.filter(x => x.active).length}</b><span>Actives</span></div>
    <div class="adm-kpi"><b>${items.reduce((a, x) => a + (x.ordersCount || 0), 0)}</b><span>Commandes API</span></div>`;
  const el = document.getElementById('admin-resellers-list');
  if (!items.length) { el.innerHTML = '<p class="admin-empty">Aucune clé créée pour le moment.</p>'; return; }
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = items.map(x => {
    const spent = x.spentDay && x.spentDay.date === today ? Number(x.spentDay.amount || 0) : 0;
    return `<div class="admin-row adm-card">
      <div class="admin-row-title">${escapeHtml(x.email || x.uid)} <span class="adm-pill ${x.active ? 'ok' : ''}">${x.active ? 'Active' : 'Suspendue'}</span></div>
      <div class="admin-row-meta">${escapeHtml(x.prefix || '')}… · ${x.ordersCount || 0} commandes · aujourd'hui ${spent.toFixed(2)} / ${x.dailyLimit} $<br>Dernier usage : ${admFmtDate(x.lastUsedAt)}${x.lastIp ? ' · ' + escapeHtml(x.lastIp) : ''} · créée le ${admFmtDate(x.createdAt)}</div>
      <div class="admin-row-actions">
        <button class="btn btn-outline btn-sm" onclick="resellerAdminToggle('${x.id}', ${x.active ? 'false' : 'true'})">${x.active ? 'Suspendre' : 'Réactiver'}</button>
        <button class="btn btn-outline btn-sm" onclick="resellerAdminLimit('${x.id}', ${x.dailyLimit})">Plafond</button>
        <button class="btn btn-outline btn-sm" style="color:#b42318" onclick="resellerAdminDelete('${x.id}')">Supprimer</button>
      </div></div>`;
  }).join('');
}
async function saveResellerSettings() {
  try {
    await adminManageCall(null, null, 'api_settings', {
      enabled: document.getElementById('rs-enabled').checked,
      discountPct: parseFloat(document.getElementById('rs-discount').value) || 0,
      dailyLimitDefault: parseFloat(document.getElementById('rs-limit').value) || 100
    });
    alert('Réglages enregistrés.'); loadResellersAdmin();
  } catch (e) { alert('Erreur : ' + e.message); }
}
async function resellerAdminToggle(id, value) {
  try { await adminManageCall(null, id, 'api_toggle', { value }); loadResellersAdmin(); } catch (e) { alert('Erreur : ' + e.message); }
}
async function resellerAdminLimit(id, cur) {
  const v = prompt('Plafond de dépense par jour (en $) :', cur); if (v == null) return;
  try { await adminManageCall(null, id, 'api_limit', { value: parseFloat(v) }); loadResellersAdmin(); } catch (e) { alert('Erreur : ' + e.message); }
}
async function resellerAdminDelete(id) {
  if (!confirm('Supprimer cette clé définitivement ?')) return;
  try { await adminManageCall(null, id, 'api_delete'); loadResellersAdmin(); } catch (e) { alert('Erreur : ' + e.message); }
}

/* ===== Icônes vectorielles professionnelles (v-pro24) =====
   window.cnIcon(nom, taille) : renvoie un SVG. Un balayeur remplace aussi les emoji
   décoratifs de l'interface (boutons, titres, tuiles) par ces icônes. */
(function () {
  'use strict';
  if (window.cnIcon) return;
  var P = {
    news: '<path d="M4 4h13v16H6a2 2 0 0 1-2-2V4zM17 8h3v10a2 2 0 0 1-2 2h-1M8 8h5M8 12h5M8 16h3"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9l4-6zM2 9h20M9 3l3 6 3-6M12 21L9 9M12 21l3-12"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .8 3 2.5 3 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    handshake: '<path d="M3 12l4-4 4 2 3-2 4 3 3-1M7 8l-4 4 6 6 2-1M21 12l-6 6-3-2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 0 2 2h13"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    alert: '<path d="M12 3l10 18H2L12 3zM12 10v5M12 18h.01"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-12 7l-5 1 1.5-4.5A8 8 0 1 1 21 12z"/>',
    check: '<path d="M5 12.5l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
    megaphone: '<path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chart: '<path d="M3 20h18M6 20v-6M11 20V9M16 20v-9M21 20V5"/>',
    cart: '<path d="M3 4h2l2.5 11h10L20 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    building: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2M13 9h2M9 13h2M13 13h2M9 17h6"/>',
    store: '<path d="M4 9l1-5h14l1 5M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M5 12v8h14v-8"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6"/>',
    bug: '<rect x="8" y="8" width="8" height="11" rx="4"/><path d="M12 8V5M5 12h3M16 12h3M6 18l2-2M18 18l-2-2M8 6l2 2M16 6l-2 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    spark: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3zM18 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    clip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.3.2-2.5 1.5-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    dot: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
    trend: '<path d="M3 17l6-6 4 4 8-9M15 6h6v6"/>',
    undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
    heart: '<path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>'
  };
  window.cnIcon = function (name, size) {
    var s = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.dot) + '</svg>';
  };
  var M = {
    '📰': 'news', '🗂': 'folder', '🖼': 'image', '💎': 'gem', '👥': 'users', '👤': 'user', '🤝': 'handshake', '🕓': 'clock', '🕒': 'clock', '🕐': 'clock',
    '🏷': 'tag', '📅': 'calendar', '📬': 'mail', '✉': 'mail', '📩': 'mail', '🔌': 'plug', '📋': 'copy', '♻': 'refresh', '🔁': 'refresh', '🗑': 'trash',
    '📘': 'book', '📖': 'book', '📚': 'book', '🔒': 'lock', '⚠': 'alert', '📞': 'phone', '📱': 'phone', '💬': 'chat', '✓': 'check', '✔': 'check', '✅': 'check',
    '❌': 'x', '✕': 'x', '📥': 'download', '⬇': 'download', '📄': 'doc', '📷': 'camera', '📸': 'camera', '🎬': 'video', '🎥': 'video', '📢': 'megaphone',
    '💾': 'save', '➕': 'plus', '📊': 'chart', '🛒': 'cart', '🛍': 'cart', '💰': 'wallet', '💵': 'wallet', '💸': 'wallet', '💳': 'wallet', '🌐': 'globe',
    '🖥': 'monitor', '🏢': 'building', '🏪': 'store', '🚩': 'flag', '🤖': 'bot', '🐞': 'bug', '🔍': 'search', '🔎': 'search', '🧭': 'compass', '🏠': 'home',
    '📦': 'box', '🎯': 'target', '✨': 'spark', '📍': 'pin', '🎵': 'music', '🔊': 'volume', '📎': 'clip', '🏅': 'award', '🥇': 'award', '🥈': 'award', '🥉': 'award',
    '🎨': 'palette', '👁': 'eye', '🔴': 'dot', '🟢': 'dot', '💹': 'trend', '↩': 'undo', '💄': 'spark', '👗': 'store', '🎉': 'spark', '📚️': 'book'
  };
  var keys = Object.keys(M).sort(function (a, b) { return b.length - a.length; });
  var RE = new RegExp('^[\\s\\uFE0F]*(' + keys.join('|') + ')\\uFE0F?[\\s\\uFE0F]*', 'u');
  var RE_END = new RegExp('[\\s\\uFE0F]*(' + keys.join('|') + ')\\uFE0F?[\\s\\uFE0F]*$', 'u');
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|CODE|PRE|SVG|TITLE)$/;
  var queued = false;
  function fixNode(n) {
    var p = n.parentNode; if (!p || SKIP.test(p.nodeName)) return;
    if (p.isContentEditable || (p.closest && p.closest('[data-keep-emoji],textarea,[contenteditable="true"],svg'))) return;
    var v = n.nodeValue; if (!v || v.length > 120) return;
    var m = v.match(RE);
    if (m) {
      var span = document.createElement('span'); span.className = 'ico-i'; span.innerHTML = window.cnIcon(M[m[1]], 18);
      p.insertBefore(span, n); n.nodeValue = v.slice(m[0].length); return;
    }
    m = v.match(RE_END);
    if (m && v.length - m[0].length > 0) {
      var s2 = document.createElement('span'); s2.className = 'ico-i ico-i-end'; s2.innerHTML = window.cnIcon(M[m[1]], 18);
      n.nodeValue = v.slice(0, v.length - m[0].length);
      p.insertBefore(s2, n.nextSibling);
    }
  }
  function sweep() {
    queued = false;
    if (!document.body) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) { if (n.nodeValue && n.nodeValue.length < 120 && /[^\x00- ]/.test(n.nodeValue)) list.push(n); }
    for (var i = 0; i < list.length; i++) { try { fixNode(list[i]); } catch (e) { /* ignore */ } }
    // options de listes : on retire seulement l'emoji décoratif
    var opts = document.querySelectorAll('option');
    for (var j = 0; j < opts.length; j++) { var t = opts[j].textContent; var m2 = t.match(RE); if (m2 && t.length > m2[0].length) opts[j].textContent = t.slice(m2[0].length); }
  }
  function queue() { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(sweep); } }
  function start() { try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) { /* ignore */ } queue(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
