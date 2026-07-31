/* ==========================================================================
   COEURNOH BOOST - COMPLETE FRONTEND CONTROLLER & APP ENGINE
   ========================================================================== */

// --- GLOBAL STATE ---
let currentLang = 'fr';
let translations = {};
let currentUser = {
    name: 'Invité',
    email: 'guest@coeurnohboost.com',
    balance: 25.00,
    isLoggedIn: true
};

// --- PLATFORMS & DEFAULT SERVICE PRICING (Per 1,000 units in USD) ---
let platformData = [
    { id: 'tiktok', name: 'TikTok', icon: 'video', services: [
        { id: 'tt_views', name: 'Vues TikTok Réelles', cost: 0.20, margin: 200 }, // Selling price = 0.60
        { id: 'tt_likes', name: 'Likes TikTok Stables', cost: 0.80, margin: 150 },
        { id: 'tt_followers', name: 'Abonnés TikTok Fr/Int', cost: 2.50, margin: 100 }
    ]},
    { id: 'instagram', name: 'Instagram', icon: 'camera', services: [
        { id: 'ig_likes', name: 'Likes Instagram HQ', cost: 0.50, margin: 150 },
        { id: 'ig_followers', name: 'Followers Instagram Ciblés', cost: 2.00, margin: 120 },
        { id: 'ig_reels', name: 'Vues Instagram Reels', cost: 0.15, margin: 200 }
    ]},
    { id: 'youtube', name: 'YouTube', icon: 'youtube', services: [
        { id: 'yt_views', name: 'Vues YouTube Éligibles Monétisation', cost: 1.50, margin: 100 },
        { id: 'yt_subs', name: 'Abonnés YouTube Stables', cost: 6.00, margin: 80 }
    ]},
    { id: 'facebook', name: 'Facebook', icon: 'facebook', services: [
        { id: 'fb_likes', name: 'Likes / Suiveurs Page Facebook', cost: 1.20, margin: 100 },
        { id: 'fb_shares', name: 'Partages de Publications', cost: 1.00, margin: 150 }
    ]},
    { id: 'spotify', name: 'Spotify', icon: 'music', services: [
        { id: 'sp_streams', name: 'Streams / Écoutes Premium', cost: 1.80, margin: 100 },
        { id: 'sp_followers', name: 'Abonnés Artiste', cost: 3.00, margin: 100 }
    ]},
    { id: 'shazam', name: 'Shazam', icon: 'disc', services: [
        { id: 'sh_shazams', name: 'Shazams Réels', cost: 2.00, margin: 100 }
    ]},
    { id: 'pinterest', name: 'Pinterest', icon: 'image', services: [
        { id: 'pin_followers', name: 'Abonnés Pinterest', cost: 2.50, margin: 100 }
    ]},
    { id: 'telegram', name: 'Telegram', icon: 'send', services: [
        { id: 'tg_members', name: 'Membres Canal / Groupe', cost: 1.50, margin: 100 }
    ]},
    { id: 'whatsapp', name: 'WhatsApp', icon: 'phone', services: [
        { id: 'wa_channel', name: 'Membres Chaîne WhatsApp', cost: 2.00, margin: 100 }
    ]},
    { id: 'snapchat', name: 'Snapchat', icon: 'ghost', services: [
        { id: 'sc_subscribers', name: 'Abonnés Profil Snapchat', cost: 3.50, margin: 100 }
    ]},
    { id: 'twitter', name: 'X (Twitter)', icon: 'twitter', services: [
        { id: 'tw_followers', name: 'Abonnés X Actifs', cost: 4.00, margin: 100 }
    ]},
    { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', services: [
        { id: 'li_followers', name: 'Abonnés Page Professionnelle', cost: 8.00, margin: 75 }
    ]},
    { id: 'soundcloud', name: 'SoundCloud', icon: 'cloud-lightning', services: [
        { id: 'sc_plays', name: 'Écoutes SoundCloud', cost: 0.50, margin: 200 }
    ]},
    { id: 'apple', name: 'Apple Music', icon: 'music', services: [
        { id: 'am_plays', name: 'Écoutes Apple Music', cost: 3.00, margin: 100 }
    ]},
    { id: 'audiomack', name: 'Audiomack', icon: 'radio', services: [
        { id: 'ack_plays', name: 'Écoutes Audiomack', cost: 0.60, margin: 150 }
    ]}
];

// --- INITIAL USER DATA STORE ---
let userOrders = [
    { id: 'ORD-9842', date: '2026-07-30 14:22', service: 'Vues TikTok Réelles', target: 'https://tiktok.com/@demo/video/1', qty: 10000, amount: 6.00, status: 'terminé' },
    { id: 'ORD-9843', date: '2026-07-31 09:10', service: 'Abonnés YouTube Stables', target: 'https://youtube.com/@demochannel', qty: 1000, amount: 10.80, status: 'en cours' }
];

let userTransactions = [
    { id: 'TX-1001', date: '2026-07-29 10:00', type: 'Recharge', method: 'Airtel Money (+24399...)', amount: '+$35.00', status: 'RÉUSSI' },
    { id: 'TX-1002', date: '2026-07-30 14:22', type: 'Commande', method: 'Paiement ORD-9842', amount: '-$6.00', status: 'RÉUSSI' },
    { id: 'TX-1003', date: '2026-07-31 09:10', type: 'Commande', method: 'Paiement ORD-9843', amount: '-$10.80', status: 'RÉUSSI' }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    detectAndSetLanguage();
    initUI();
    lucide.createIcons();
});

// --- LANGUAGE SWITCHING SYSTEM ---
async function detectAndSetLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    let targetLang = 'fr';

    if (userLang.startsWith('en')) targetLang = 'en';
    else if (userLang.startsWith('sw')) targetLang = 'sw';
    else if (userLang.startsWith('ln')) targetLang = 'ln';

    document.getElementById('langSelect').value = targetLang;
    await changeLanguage(targetLang);
}

async function changeLanguage(langCode) {
    currentLang = langCode;
    try {
        const response = await fetch(`lang/${langCode}.json`);
        translations = await response.json();
        applyTranslations();
    } catch (e) {
        console.warn('Could not load translation file dynamically, using default labels.', e);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });
}

// --- UI CONTROLLER & NAVIGATION ---
function initUI() {
    updateBalanceDisplay();
    renderPlatformsGrid();
    populateOrderDropdowns();
    renderActivities();
    renderWalletHistory();
    renderAdminTable();
    populateAccountForm();
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const targetSection = document.getElementById(`page-${pageId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const navLink = document.querySelector(`.nav-link[href="#${pageId}"]`);
    if (navLink) navLink.classList.add('active');

    // Close mobile menu if open
    document.getElementById('navMenu').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    document.getElementById('navMenu').classList.toggle('active');
}

function updateBalanceDisplay() {
    const formatted = `$${currentUser.balance.toFixed(2)}`;
    document.getElementById('userBalanceDisplay').textContent = formatted;
    document.getElementById('summaryCurrentBalance').textContent = formatted;
    document.getElementById('walletPageBalance').textContent = formatted;
}

// --- RENDER PLATFORMS HOME ---
function renderPlatformsGrid() {
    const container = document.getElementById('platformsList');
    if (!container) return;
    container.innerHTML = '';

    platformData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'platform-card';
        card.onclick = () => {
            showPage('order');
            document.getElementById('orderPlatform').value = p.id;
            updateServicesDropdown();
        };
        card.innerHTML = `
            <i data-lucide="${p.icon}"></i>
            <strong>${p.name}</strong>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

// --- ORDER CALCULATOR ENGINE ---
function populateOrderDropdowns() {
    const platformSelect = document.getElementById('orderPlatform');
    if (!platformSelect) return;
    platformSelect.innerHTML = '';

    platformData.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        platformSelect.appendChild(opt);
    });

    updateServicesDropdown();
}

function updateServicesDropdown() {
    const platId = document.getElementById('orderPlatform').value;
    const serviceSelect = document.getElementById('orderService');
    const plat = platformData.find(p => p.id === platId);

    serviceSelect.innerHTML = '';
    if (plat && plat.services) {
        plat.services.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            const sellingPricePer1k = calculateSellingPrice(s.cost, s.margin);
            opt.textContent = `${s.name} - $${sellingPricePer1k.toFixed(2)} / 1,000`;
            serviceSelect.appendChild(opt);
        });
    }
    calculateOrderPrice();
}

function calculateSellingPrice(cost, marginPercent) {
    return cost * (1 + marginPercent / 100);
}

function calculateOrderPrice() {
    const platId = document.getElementById('orderPlatform').value;
    const servId = document.getElementById('orderService').value;
    const qty = parseInt(document.getElementById('orderQuantity').value) || 0;

    const plat = platformData.find(p => p.id === platId);
    if (!plat) return;
    const serv = plat.services.find(s => s.id === servId);
    if (!serv) return;

    const unitPricePer1k = calculateSellingPrice(serv.cost, serv.margin);
    const totalPrice = (qty / 1000) * unitPricePer1k;

    document.getElementById('orderUnitPrice').value = `$${unitPricePer1k.toFixed(2)} / 1k`;
    document.getElementById('orderTotalPrice').textContent = `$${totalPrice.toFixed(2)}`;
}

function handleCreateOrder(e) {
    e.preventDefault();
    const platId = document.getElementById('orderPlatform').value;
    const servId = document.getElementById('orderService').value;
    const targetLink = document.getElementById('orderTargetLink').value;
    const qty = parseInt(document.getElementById('orderQuantity').value);

    const plat = platformData.find(p => p.id === platId);
    const serv = plat.services.find(s => s.id === servId);
    const unitPricePer1k = calculateSellingPrice(serv.cost, serv.margin);
    const totalPrice = (qty / 1000) * unitPricePer1k;

    if (currentUser.balance < totalPrice) {
        showToast("Solde insuffisant ! Veuillez recharger votre portefeuille.", "error");
        return;
    }

    // Deduct balance and create order
    currentUser.balance -= totalPrice;
    updateBalanceDisplay();

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    userOrders.unshift({
        id: orderId,
        date: now,
        service: serv.name,
        target: targetLink,
        qty: qty,
        amount: totalPrice,
        status: 'en attente'
    });

    userTransactions.unshift({
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        date: now,
        type: 'Commande',
        method: `Paiement ${orderId}`,
        amount: `-$${totalPrice.toFixed(2)}`,
        status: 'RÉUSSI'
    });

    renderActivities();
    renderWalletHistory();
    showToast(`Commande ${orderId} validée avec succès !`, "success");
    showPage('activity');
}

// --- ACTIVITIES TABLE ---
function renderActivities() {
    const tbody = document.getElementById('activityTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    userOrders.forEach(o => {
        let badgeClass = 'badge-pending';
        if (o.status === 'terminé') badgeClass = 'badge-completed';
        if (o.status === 'en cours') badgeClass = 'badge-progress';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${o.id}</strong></td>
            <td>${o.date}</td>
            <td>${o.service}</td>
            <td><a href="${o.target}" target="_blank" style="color:var(--primary)">Lien cible</a></td>
            <td>${o.qty.toLocaleString()}</td>
            <td><strong>$${o.amount.toFixed(2)}</strong></td>
            <td><span class="badge ${badgeClass}">${o.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- WALLET & MOBILE MONEY API STRUCT ---
function openRechargeModal() {
    document.getElementById('rechargeModal').classList.add('active');
}
function closeRechargeModal() {
    document.getElementById('rechargeModal').classList.remove('active');
}

function handleRechargeSubmit(e) {
    e.preventDefault();
    const provider = document.getElementById('paymentProvider').value;
    const phone = document.getElementById('rechargePhone').value;
    const amount = parseFloat(document.getElementById('rechargeAmount').value);

    // Simulated API call (Flutterwave / PayChangu / Chapa structure)
    initiateMobileMoneyPaymentAPI({
        publicKey: "FLWPUBK_TEST-xxxxxxxxxxxxxxxx-X",
        provider: provider,
        phoneNumber: phone,
        amount: amount,
        currency: "USD"
    }).then(response => {
        if(response.status === "success") {
            currentUser.balance += amount;
            updateBalanceDisplay();

            const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
            userTransactions.unshift({
                id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
                date: now,
                type: 'Recharge',
                method: `${provider} (${phone})`,
                amount: `+$${amount.toFixed(2)}`,
                status: 'RÉUSSI'
            });

            renderWalletHistory();
            closeRechargeModal();
            showToast(`Recharge de $${amount.toFixed(2)} effectuée avec succès !`, "success");
        }
    });
}

// Mock API Call Function (Ready for backend production integration)
function initiateMobileMoneyPaymentAPI(payload) {
    return new Promise((resolve) => {
        console.log("Sending payload to Mobile Money gateway API...", payload);
        setTimeout(() => {
            resolve({ status: "success", transactionRef: "MM-" + Date.now() });
        }, 1200);
    });
}

function renderWalletHistory() {
    const tbody = document.getElementById('walletHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    userTransactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.id}</strong></td>
            <td>${t.date}</td>
            <td>${t.type}</td>
            <td>${t.method}</td>
            <td style="color:${t.amount.startsWith('+') ? 'var(--primary)' : 'var(--accent-red)'}"><strong>${t.amount}</strong></td>
            <td><span class="badge badge-completed">${t.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- ADMIN PRICING CONTROLLER ---
function renderAdminTable() {
    const tbody = document.getElementById('adminPricingBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    platformData.forEach(p => {
        p.services.forEach(s => {
            const sellingPrice = calculateSellingPrice(s.cost, s.margin);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td>${s.name}</td>
                <td><input type="number" step="0.05" value="${s.cost.toFixed(2)}" class="form-control" style="width:90px" onchange="updateAdminCost('${p.id}', '${s.id}', this.value)"></td>
                <td><input type="number" step="5" value="${s.margin}" class="form-control" style="width:90px" onchange="updateAdminMargin('${p.id}', '${s.id}', this.value)"></td>
                <td><strong style="color:var(--primary); font-size:1.05rem;">$${sellingPrice.toFixed(2)}</strong></td>
                <td><button class="btn btn-outline btn-sm" onclick="showToast('Tarif mis à jour', 'success')"><i data-lucide="check"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    });
    lucide.createIcons();
}

function updateAdminCost(platId, servId, val) {
    const plat = platformData.find(p => p.id === platId);
    const serv = plat.services.find(s => s.id === servId);
    serv.cost = parseFloat(val) || 0;
    renderAdminTable();
    updateServicesDropdown();
}

function updateAdminMargin(platId, servId, val) {
    const plat = platformData.find(p => p.id === platId);
    const serv = plat.services.find(s => s.id === servId);
    serv.margin = parseFloat(val) || 0;
    renderAdminTable();
    updateServicesDropdown();
}

function resetAdminPrices() {
    showToast("Tarifs réinitialisés aux valeurs par défaut", "success");
    renderAdminTable();
}

// --- ACCOUNT & AUTH ---
function populateAccountForm() {
    document.getElementById('accName').value = currentUser.name;
    document.getElementById('accEmail').value = currentUser.email;
    document.getElementById('accLang').value = currentLang;
}

function handleAccountSave(e) {
    e.preventDefault();
    currentUser.name = document.getElementById('accName').value;
    currentUser.email = document.getElementById('accEmail').value;
    showToast("Informations du compte mises à jour !", "success");
}

function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
}
function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function selectQuickAccount(name, email) {
    currentUser.name = name;
    currentUser.email = email;
    document.getElementById('authBtnText').textContent = name.split(' ')[0];
    populateAccountForm();
    closeAuthModal();
    showToast(`Connecté en tant que ${name}`, "success");
}

function handleManualLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    currentUser.name = email.split('@')[0];
    currentUser.email = email;
    document.getElementById('authBtnText').textContent = currentUser.name;
    populateAccountForm();
    closeAuthModal();
    showToast("Connexion réussie !", "success");
}

// --- SUPPORT FORM & TEMPLATES ---
function applySupportTemplate(val) {
    if (!val) return;
    const parts = val.split(' : ');
    document.getElementById('supportSubject').value = parts[0];
    document.getElementById('supportMessage').value = parts[1] || '';
}

function handleSupportSend(e) {
    e.preventDefault();
    showToast("Votre message a été transmis à l'équipe support !", "success");
    document.getElementById('supportForm').reset();
}

// --- TOAST NOTIFICATION UTILITY ---
function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-triangle'}"></i> ${message}`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
