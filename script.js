// --- CONFIGURATION FIREBASE & ADMIN COEURNOH BOOST ---

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier la session admin enregistrée
    const savedSession = localStorage.getItem('coeurnoh_admin_session');
    
    // Si Firebase est présent sur la page, charger les données
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        loadAdminData();
    } else {
        // Fallback si pas de serveur Firebase direct
        renderMockOrLocalData();
    }
});

// Navigation entre les onglets
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

// Fonction de chargement dynamique des données (Commandes, Utilisateurs, Statistiques, Dépôts)
function loadAdminData() {
    const db = firebase.firestore();

    // 1. Charger les Utilisateurs
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
        const usersContainer = document.getElementById('users-list');
        if (usersContainer) usersContainer.innerHTML = html;
    }).catch((err) => {
        console.error("Erreur utilisateurs:", err);
        document.getElementById('users-list').innerHTML = "<p style='color:red;'>Erreur de chargement des utilisateurs.</p>";
    });

    // 2. Charger les Commandes
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
        const ordersContainer = document.getElementById('orders-list');
        if (ordersContainer) ordersContainer.innerHTML = html;
    }).catch(() => {
        document.getElementById('orders-list').innerHTML = "<p style='color:red;'>Erreur de chargement des commandes.</p>";
    });

    // 3. Charger les Dépôts
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
        const depositsContainer = document.getElementById('deposits-list');
        if (depositsContainer) depositsContainer.innerHTML = html;
    }).catch(() => {
        document.getElementById('deposits-list').innerHTML = "<p style='color:red;'>Erreur de chargement des dépôts.</p>";
    });

    // 4. Statistiques
    const statsContainer = document.getElementById('stats-content');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-top:10px;">
                <div style="background:#F8FAFC; padding:20px; border-radius:12px; border:1px solid #E2E8F0; text-align:center;">
                    <div style="font-size:12px; color:#64748B; font-weight:bold;">SYSTÈME</div>
                    <div style="font-size:20px; font-weight:bold; color:#064E3B; margin-top:5px;">Firebase Connecté</div>
                </div>
                <div style="background:#F8FAFC; padding:20px; border-radius:12px; border:1px solid #E2E8F0; text-align:center;">
                    <div style="font-size:12px; color:#64748B; font-weight:bold;">AUTOMATISATION</div>
                    <div style="font-size:20px; font-weight:bold; color:#064E3B; margin-top:5px;">MoreThanPanel</div>
                </div>
            </div>`;
    }
}

// Si Firebase n'est pas configuré sur cette vue
function renderMockOrLocalData() {
    const usersContainer = document.getElementById('users-list');
    if (usersContainer) {
        usersContainer.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Connectez Firebase pour consulter les utilisateurs en direct.</p>`;
    }
    const ordersContainer = document.getElementById('orders-list');
    if (ordersContainer) {
        ordersContainer.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Connectez Firebase pour consulter les commandes en direct.</p>`;
    }
    const depositsContainer = document.getElementById('deposits-list');
    if (depositsContainer) {
        depositsContainer.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Connectez Firebase pour consulter l'historique des dépôts.</p>`;
    }
    const statsContainer = document.getElementById('stats-content');
    if (statsContainer) {
        statsContainer.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Statistiques en attente de synchronisation Firebase.</p>`;
    }
}

// Enregistrer la grille tarifaire (Standard, Premium, VIP)
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
    alert('✅ Tarifs (Standard, Premium, VIP) enregistrés avec succès !');
}

// Enregistrer la cartographie des ID d'automatisation MoreThanPanel
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
