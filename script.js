// Navigation entre les onglets de l'admin
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const btns = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => tab.classList.remove('active'));
    btns.forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
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
