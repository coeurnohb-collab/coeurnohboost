// --- CONFIGURATION FIREBASE & ADMIN COEURNOH BOOST ---

document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si une session admin existe déjà
    const savedSession = localStorage.getItem('coeurnoh_admin_session');
    if (savedSession) {
        showAdminPanel();
    }

    // Initialisation Firebase si présent
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        loadAdminData();
    }
});

// --- FONCTION DE CONNEXION ---
function loginAdmin() {
    // Récupère l'élément input peu importe son ID (admin-uid, password, admin-password, etc.)
    const inputField = document.getElementById('admin-uid') || 
                       document.getElementById('password') || 
                       document.getElementById('admin-password');
                       
    const uid = inputField ? inputField.value.trim() : '';

    if (!uid) {
        alert("Veuillez entrer votre identifiant ou mot de passe.");
        return;
    }

    // Enregistrement de la session
    localStorage.setItem('coeurnoh_admin_session', uid);
    showAdminPanel();
    
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        loadAdminData();
    }
}

function showAdminPanel() {
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel') || document.querySelector('.container') || document.querySelector('main');

    if (loginSection) loginSection.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';
}

// --- NAVIGATION ENTRE LES ONGLETS ---
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const btns = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => tab.classList.remove('active'));
    btns.forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// --- CHARGEMENT DES DONNÉES FIREBASE ---
function loadAdminData() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) return;

    const db = firebase.firestore();

    // 1. Utilisateurs
    const usersContainer = document.getElementById('users-list');
    if (usersContainer) {
        db.collection("users").get().then((querySnapshot) => {
            let html = `<div class="table-responsive"><table><thead><tr><th>ID / UID</th><th>Nom / Email</th><th>Solde ($)</th><th>Date</th></tr></thead><tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="4" style="text-align:center;">Aucun utilisateur trouvé.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const u = doc.data();
                    html += `<tr><td><code>${doc.id}</code></td><td>${u.name || u.email || 'Utilisateur'}</td><td><strong>$${(u.balance || 0).toFixed(2)}</strong></td><td>-</td></tr>`;
                });
            }
            html += `</tbody></table></div>`;
            usersContainer.innerHTML = html;
        }).catch(() => {
            usersContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des utilisateurs.</p>";
        });
    }

    // 2. Commandes
    const ordersContainer = document.getElementById('orders-list');
    if (ordersContainer) {
        db.collection("orders").orderBy("createdAt", "desc").limit(50).get().then((querySnapshot) => {
            let html = `<div class="table-responsive"><table><thead><tr><th>ID</th><th>Service</th><th>Lien</th><th>Quantité</th><th>Prix</th><th>Statut</th></tr></thead><tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="6" style="text-align:center;">Aucune commande.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const o = doc.data();
                    html += `<tr><td><code>${doc.id.substring(0, 8)}</code></td><td>${o.service || 'N/A'}</td><td><a href="${o.link}" target="_blank">Ouvrir</a></td><td>${o.quantity || 0}</td><td>$${(o.price || 0).toFixed(2)}</td><td>${o.status || 'En cours'}</td></tr>`;
                });
            }
            html += `</tbody></table></div>`;
            ordersContainer.innerHTML = html;
        }).catch(() => {
            ordersContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des commandes.</p>";
        });
    }

    // 3. Dépôts
    const depositsContainer = document.getElementById('deposits-list');
    if (depositsContainer) {
        db.collection("deposits").orderBy("createdAt", "desc").limit(50).get().then((querySnapshot) => {
            let html = `<div class="table-responsive"><table><thead><tr><th>ID</th><th>Utilisateur</th><th>Montant</th><th>Méthode</th><th>Statut</th></tr></thead><tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="5" style="text-align:center;">Aucun dépôt.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const d = doc.data();
                    html += `<tr><td><code>${doc.id.substring(0, 8)}</code></td><td>${d.userId || 'Anonyme'}</td><td><strong>$${(d.amount || 0).toFixed(2)}</strong></td><td>${d.method || 'Mobile'}</td><td>${d.status || 'Validé'}</td></tr>`;
                });
            }
            html += `</tbody></table></div>`;
            depositsContainer.innerHTML = html;
        }).catch(() => {
            depositsContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des dépôts.</p>";
        });
    }
}

// --- SAUVEGARDE DES PRIX ET AUTOMATISATION ---
function savePrices() {
    const prices = {
        tiktok: {
            followers: {
                std: parseFloat(document.getElementById('price-tiktok-followers-std')?.value || 2.5),
                prem: parseFloat(document.getElementById('price-tiktok-followers-prem')?.value || 9.6),
                vip: parseFloat(document.getElementById('price-tiktok-followers-vip')?.value || 15.0),
                min: parseInt(document.getElementById('min-tiktok-followers')?.value || 100)
            },
            views: {
                std: parseFloat(document.getElementById('price-tiktok-views-std')?.value || 0.4),
                prem: parseFloat(document.getElementById('price-tiktok-views-prem')?.value || 1.9),
                vip: parseFloat(document.getElementById('price-tiktok-views-vip')?.value || 3.5),
                min: parseInt(document.getElementById('min-tiktok-views')?.value || 200)
            },
            likes: {
                std: parseFloat(document.getElementById('price-tiktok-likes-std')?.value || 0.8),
                prem: parseFloat(document.getElementById('price-tiktok-likes-prem')?.value || 3.2),
                vip: parseFloat(document.getElementById('price-tiktok-likes-vip')?.value || 5.5),
                min: parseInt(document.getElementById('min-tiktok-likes')?.value || 100)
            }
        }
    };
    localStorage.setItem('coeurnoh_prices', JSON.stringify(prices));
    alert('✅ Tarifs enregistrés avec succès !');
}

function saveAutomation() {
    const automationMap = {
        "tiktok-followers-std": document.getElementById('mtp-tiktok-followers-std')?.value || "",
        "tiktok-followers-prem": document.getElementById('mtp-tiktok-followers-prem')?.value || "",
        "tiktok-followers-vip": document.getElementById('mtp-tiktok-followers-vip')?.value || "",
        "tiktok-views-std": document.getElementById('mtp-tiktok-views-std')?.value || "",
        "tiktok-views-prem": document.getElementById('mtp-tiktok-views-prem')?.value || "",
        "tiktok-views-vip": document.getElementById('mtp-tiktok-views-vip')?.value || "",
        "tiktok-likes-std": document.getElementById('mtp-tiktok-likes-std')?.value || "",
        "tiktok-likes-prem": document.getElementById('mtp-tiktok-likes-prem')?.value || "",
        "tiktok-likes-vip": document.getElementById('mtp-tiktok-likes-vip')?.value || ""
    };
    localStorage.setItem('coeurnoh_automation_map', JSON.stringify(automationMap));
    alert('✅ Cartographie d\'automatisation enregistrée avec succès !');
}
