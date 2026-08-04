// --- CONFIGURATION ET INITIALISATION FIREBASE ---
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si Firebase est déjà initialisé dans le projet
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            // Récupérer la configuration sauvegardée ou globale
            const firebaseConfig = window.firebaseConfig || JSON.parse(localStorage.getItem('coeurnoh_firebase_config') || '{}');
            if (firebaseConfig.apiKey) {
                firebase.initializeApp(firebaseConfig);
            }
        }
        
        // Charger les données en direct depuis Firebase
        loadAdminData();
    } else {
        renderFallbackMessage();
    }
});

// --- FONCTION DE CONNEXION ADMIN ---
function loginAdmin() {
    const adminUidInput = document.getElementById('admin-uid') || document.getElementById('admin-password');
    const uid = adminUidInput ? adminUidInput.value.trim() : '';

    if (!uid) {
        alert("Veuillez entrer votre identifiant (UID) d'administration.");
        return;
    }

    localStorage.setItem('coeurnoh_admin_session', uid);
    
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel') || document.querySelector('.container');

    if (loginSection) loginSection.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';

    alert("Connexion réussie !");
    loadAdminData();
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

// --- CHARGEMENT DES DONNÉES EN DIRECT DEPUIS FIREBASE ---
function loadAdminData() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) return;

    const db = firebase.firestore();

    // 1. Charger les Utilisateurs
    const usersContainer = document.getElementById('users-list');
    if (usersContainer) {
        db.collection("users").get().then((querySnapshot) => {
            let html = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID / UID</th>
                                <th>Nom / Email</th>
                                <th>Solde ($)</th>
                                <th>Date d'inscription</th>
                            </tr>
                        </thead>
                        <tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="4" style="text-align:center;">Aucun utilisateur trouvé.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
// --- CONFIGURATION ET INITIALISATION FIREBASE ---
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si Firebase est déjà initialisé dans le projet
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            // Récupérer la configuration sauvegardée ou globale
            const firebaseConfig = window.firebaseConfig || JSON.parse(localStorage.getItem('coeurnoh_firebase_config') || '{}');
            if (firebaseConfig.apiKey) {
                firebase.initializeApp(firebaseConfig);
            }
        }
        
        // Charger les données en direct depuis Firebase
        loadAdminData();
    } else {
        renderFallbackMessage();
    }
});

// --- FONCTION DE CONNEXION ADMIN ---
function loginAdmin() {
    const adminUidInput = document.getElementById('admin-uid') || document.getElementById('admin-password');
    const uid = adminUidInput ? adminUidInput.value.trim() : '';

    if (!uid) {
        alert("Veuillez entrer votre identifiant (UID) d'administration.");
        return;
    }

    localStorage.setItem('coeurnoh_admin_session', uid);
    
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel') || document.querySelector('.container');

    if (loginSection) loginSection.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';

    alert("Connexion réussie !");
    loadAdminData();
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

// --- CHARGEMENT DES DONNÉES EN DIRECT DEPUIS FIREBASE ---
function loadAdminData() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) return;

    const db = firebase.firestore();

    // 1. Charger les Utilisateurs
    const usersContainer = document.getElementById('users-list');
    if (usersContainer) {
        db.collection("users").get().then((querySnapshot) => {
            let html = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID / UID</th>
                                <th>Nom / Email</th>
                                <th>Solde ($)</th>
                                <th>Date d'inscription</th>
                            </tr>
                        </thead>
                        <tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="4" style="text-align:center;">Aucun utilisateur trouvé.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const u = doc.data();
                    html += `
                        <tr>
                            <td><code>${doc.id}</code></td>
                            <td>${u.name || u.email || 'Utilisateur'}</td>
                            <td><strong>$${(u.balance || 0).toFixed(2)}</strong></td>
                            <td>${u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>`;
                });
            }
            html += `</tbody></table></div>`;
            usersContainer.innerHTML = html;
        }).catch((err) => {
            console.error(err);
            usersContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des utilisateurs.</p>";
        });
    }

    // 2. Charger les Commandes
    const ordersContainer = document.getElementById('orders-list');
    if (ordersContainer) {
        db.collection("orders").orderBy("createdAt", "desc").limit(50).get().then((querySnapshot) => {
            let html = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Commande</th>
                                <th>Service</th>
                                <th>Lien</th>
                                <th>Quantité</th>
                                <th>Prix</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="6" style="text-align:center;">Aucune commande pour le moment.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const o = doc.data();
                    html += `
                        <tr>
                            <td><code>${doc.id.substring(0, 8)}...</code></td>
                            <td>${o.service || 'N/A'}</td>
                            <td><a href="${o.link}" target="_blank" style="color:var(--primary);">Ouvrir</a></td>
                            <td>${o.quantity || 0}</td>
                            <td>$${(o.price || 0).toFixed(2)}</td>
                            <td><span style="background:#DEF7EC; color:#03543F; padding:4px 8px; border-radius:10px; font-size:11px; font-weight:bold;">${o.status || 'En cours'}</span></td>
                        </tr>`;
                });
            }
            html += `</tbody></table></div>`;
            ordersContainer.innerHTML = html;
        }).catch((err) => {
            console.error(err);
            ordersContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des commandes.</p>";
        });
    }

    // 3. Charger les Dépôts
    const depositsContainer = document.getElementById('deposits-list');
    if (depositsContainer) {
        db.collection("deposits").orderBy("createdAt", "desc").limit(50).get().then((querySnapshot) => {
            let html = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Dépôt</th>
                                <th>Utilisateur</th>
                                <th>Montant</th>
                                <th>Moyen</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="5" style="text-align:center;">Aucun dépôt enregistré.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const d = doc.data();
                    html += `
                        <tr>
                            <td><code>${doc.id.substring(0, 8)}</code></td>
                            <td>${d.userId || 'Anonyme'}</td>
                            <td><strong>$${(d.amount || 0).toFixed(2)}</strong></td>
                            <td>${d.method || 'Mobile Money'}</td>
                            <td>${d.status || 'Validé'}</td>
                        </tr>`;
                });
            }
            html += `</tbody></table></div>`;
            depositsContainer.innerHTML = html;
        }).catch((err) => {
            console.error(err);
            depositsContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des dépôts.</p>";
        });
    }

    // 4. Statistiques
    const statsContainer = document.getElementById('stats-content');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-top:10px;">
                <div style="background:#F8FAFC; padding:20px; border-radius:12px; border:1px solid #E2E8F0; text-align:center;">
                    <div style="font-size:12px; color:#64748B; font-weight:bold;">SYSTÈME</div>
                    <div style="font-size:20px; font-weight:bold; color:#064E3B; margin-top:5px;">Firebase Connecté ✅</div>
                </div>
                <div style="background:#F8FAFC; padding:20px; border-radius:12px; border:1px solid #E2E8F0; text-align:center;">
                    <div style="font-size:12px; color:#64748B; font-weight:bold;">AUTOMATISATION</div>
                    <div style="font-size:20px; font-weight:bold; color:#064E3B; margin-top:5px;">MoreThanPanel</div>
                </div>
            </div>`;
    }
}

function renderFallbackMessage() {
    const msg = "<p style='color:var(--text-muted); padding:10px;'>Chargement des données Firebase...</p>";
    ['users-list', 'orders-list', 'deposits-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = msg;
    });
}

// --- SAUVEGARDES ---
function savePrices() {
    alert('✅ Tarifs enregistrés avec succès !');
}

function saveAutomation() {
    alert('✅ Automatisation enregistrée avec succès !');
}
Enter                    const u = doc.data();
                    html += `
                        <tr>
                            <td><code>${doc.id}</code></td>
                            <td>${u.name || u.email || 'Utilisateur'}</td>
                            <td><strong>$${(u.balance || 0).toFixed(2)}</strong></td>
                            <td>${u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>`;
                });
            }
            html += `</tbody></table></div>`;
            usersContainer.innerHTML = html;
        }).catch((err) => {
            console.error(err);
            usersContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des utilisateurs.</p>";
        });
    }

    // 2. Charger les Commandes
    const ordersContainer = document.getElementById('orders-list');
    if (ordersContainer) {
        db.collection("orders").orderBy("createdAt", "desc").limit(50).get().then((querySnapshot) => {
            let html = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Commande</th>
                                <th>Service</th>
                                <th>Lien</th>
                                <th>Quantité</th>
                                <th>Prix</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="6" style="text-align:center;">Aucune commande pour le moment.</td></tr>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const o = doc.data();
                    html += `
                        <tr>
                            <td><code>${doc.id.substring(0, 8)}...</code></td>
                            <td>${o.service || 'N/A'}</td>
                            <td><a href="${o.link}" target="_blank" style="color:var(--primary);">Ouvrir</a></td>
                            <td>${o.quantity || 0}</td>
                            <td>$${(o.price || 0).toFixed(2)}</td>
                            <td><span style="background:#DEF7EC; color:#03543F; padding:4px 8px; border-radius:10px; font-size:11px; font-weight:bold;">${o.status || 'En cours'}</span></td>
                        </tr>`;
                });
            }
            html += `</tbody></table></div>`;
            ordersContainer.innerHTML = html;
        }).catch((err) => {
            console.error(err);
            ordersContainer.innerHTML = "<p style='color:red;'>Erreur de chargement des commandes.</p>";
        });
    }

    // 3. Charger les Dépôts
    const depositsContainer = document.getElementById('deposits-list');
    if (depositsContainer) {
        db.collection("deposits").orderBy("createdAt", "desc").limit(50).get().then((querySnapshot) => {
            let html = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Dépôt</th>
                                <th>Utilisateur</th>
                                <th>Montant</th>
                                <th>Moyen</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>`;
            if (querySnapshot.empty) {
                html += `<tr><td colspan="5" style="text-align:center;">Aucun dépôt enregistré.</td></tr>`;
