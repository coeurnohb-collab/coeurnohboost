// --- GESTION DE LA CONNEXION ADMIN ---
function loginAdmin() {
    const adminUidInput = document.getElementById('admin-uid') || document.getElementById('admin-password');
    const uid = adminUidInput ? adminUidInput.value.trim() : '';

    if (!uid) {
        alert("Veuillez entrer votre identifiant (UID) d'administration.");
        return;
    }

    // Sauvegarde de la session en local
    localStorage.setItem('coeurnoh_admin_session', uid);
    
    // Si la page contient une zone de connexion à cacher et un panneau à afficher
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel') || document.querySelector('.container');

    if (loginSection) {
        loginSection.style.display = 'none';
    }
    if (adminPanel) {
        adminPanel.style.display = 'block';
    }

    alert("Connexion réussie !");
}

// Auto-vérification au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const savedSession = localStorage.getItem('coeurnoh_admin_session');
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel');

    if (savedSession && loginSection && adminPanel) {
        loginSection.style.display = 'none';
        adminPanel.style.display = 'block';
    }
});

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

// --- ENREGISTRER LA GRILLE TARIFAIRE ---
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

// --- ENREGISTRER L'AUTOMATISATION ---
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
