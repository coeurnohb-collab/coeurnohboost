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
const FCM_VAPID_KEY = "BCwBF4M8jxL1uYPBERZvSFz0lYZk34m7vNLUtBby1lUwfoYVLFgY4c23OX6r7QCSCtEOu4GWG8_enFL_Ff5muck";

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
  document.getElementById('view-order').classList.add('hidden');
  document.getElementById('view-recharge').classList.add('hidden');
  document.getElementById('view-monetization').classList.add('hidden');
  document.getElementById('view-shop').classList.add('hidden');
  document.getElementById('view-seller').classList.add('hidden');
  document.getElementById('view-notifications').classList.add('hidden');
}
function showHome() {
  hideAllViews();
  document.getElementById('view-home').classList.remove('hidden');
}
function showDashboard() {
  hideAllViews();
  document.getElementById('view-dashboard').classList.remove('hidden');
  showDashTab('home');
  updateNotifBadge();
}
function showDashTab(tab) {
  document.querySelectorAll('.dash-tab').forEach(el => el.classList.add('hidden'));
  document.getElementById('dash-tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.bnav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('bnav-' + tab).classList.add('active');
  if (tab === 'orders') loadOrders();
  if (tab === 'home') {
    renderFAQ();
    const shopFeedEl = document.getElementById('shop-feed');
    if (shopFeedEl) shopFeedEl.innerHTML = '';
    loadHomeFeed();
  }
  if (tab === 'account') renderReferralBox();
}
function showServices() {
  hideAllViews();
  document.getElementById('view-services').classList.remove('hidden');
  renderPlatformGrid('platform-grid');
}


let selectedPlatformId = null;
let selectedQuality = "standard";

/* =========================================================
   PAIEMENTS — pays d'Afrique francophone + voisins RDC + crypto
   ⚠️ Taux de change indicatifs, à ajuster régulièrement.
   ========================================================= */
const COUNTRIES = [
  { code:"CD", name:"RD Congo",             flag:"🇨🇩", currency:"CDF",  rate:2800,  ops:["Vodacom M-Pesa","Airtel Money","Orange Money"] },
  { code:"CG", name:"Congo-Brazzaville",     flag:"🇨🇬", currency:"XAF",  rate:600,   ops:["MTN Mobile Money","Airtel Money"] },
  { code:"CF", name:"Centrafrique",          flag:"🇨🇫", currency:"XAF",  rate:600,   ops:["Orange Money","Telecel Money"] },
  { code:"CM", name:"Cameroun",              flag:"🇨🇲", currency:"XAF",  rate:600,   ops:["MTN Mobile Money","Orange Money"] },
  { code:"CI", name:"Côte d'Ivoire",         flag:"🇨🇮", currency:"XOF",  rate:600,   ops:["Orange Money","MTN Mobile Money","Moov Money","Wave"] },
  { code:"SN", name:"Sénégal",               flag:"🇸🇳", currency:"XOF",  rate:600,   ops:["Orange Money","Free Money","Wave"] },
  { code:"ML", name:"Mali",                  flag:"🇲🇱", currency:"XOF",  rate:600,   ops:["Orange Money","Moov Money"] },
  { code:"BF", name:"Burkina Faso",          flag:"🇧🇫", currency:"XOF",  rate:600,   ops:["Orange Money","Moov Money"] },
  { code:"TG", name:"Togo",                  flag:"🇹🇬", currency:"XOF",  rate:600,   ops:["T-Money (Togocom)","Moov Money"] },
  { code:"BJ", name:"Bénin",                 flag:"🇧🇯", currency:"XOF",  rate:600,   ops:["MTN Mobile Money","Moov Money"] },
  { code:"GN", name:"Guinée",                flag:"🇬🇳", currency:"GNF",  rate:8600,  ops:["Orange Money","MTN Mobile Money"] },
  { code:"NE", name:"Niger",                 flag:"🇳🇪", currency:"XOF",  rate:600,   ops:["Airtel Money","Orange Money","Moov Money"] },
  { code:"UG", name:"Ouganda",               flag:"🇺🇬", currency:"UGX",  rate:3700,  ops:["MTN Mobile Money","Airtel Money"] },
  { code:"RW", name:"Rwanda",                flag:"🇷🇼", currency:"RWF",  rate:1300,  ops:["MTN Mobile Money","Airtel Money"] },
  { code:"BI", name:"Burundi",               flag:"🇧🇮", currency:"BIF",  rate:2900,  ops:["Lumitel Pesa","Ecocash"] },
  { code:"TZ", name:"Tanzanie",              flag:"🇹🇿", currency:"TZS",  rate:2500,  ops:["M-Pesa (Vodacom)","Tigo Pesa","Airtel Money"] },
  { code:"ZM", name:"Zambie",                flag:"🇿🇲", currency:"ZMW",  rate:27,    ops:["MTN Mobile Money","Airtel Money"] },
  { code:"AO", name:"Angola",                flag:"🇦🇴", currency:"AOA",  rate:830,   ops:["Unitel Money","Multicaixa Express"] },
  { code:"KE", name:"Kenya",                 flag:"🇰🇪", currency:"KES",  rate:129,   ops:["M-Pesa (Safaricom)","Airtel Money"] },
  { code:"SS", name:"Soudan du Sud",         flag:"🇸🇸", currency:"SSP",  rate:130,   ops:["MTN Mobile Money","Zain Cash"] },
  { code:"SD", name:"Soudan",                flag:"🇸🇩", currency:"SDG",  rate:600,   ops:["Zain Cash","MTN Mobile Money"] },
  { code:"LY", name:"Libye",                 flag:"🇱🇾", currency:"LYD",  rate:4.8,   ops:["Mobicash"] },
  { code:"MA", name:"Maroc",                 flag:"🇲🇦", currency:"MAD",  rate:9.9,   ops:["Orange Money","inwi money"] },
  { code:"TN", name:"Tunisie",               flag:"🇹🇳", currency:"TND",  rate:3.1,   ops:["Orange Money","D17"] },
  { code:"DZ", name:"Algérie",               flag:"🇩🇿", currency:"DZD",  rate:134,   ops:["Djezzy","Mobilis"] },
  { code:"GH", name:"Ghana",                 flag:"🇬🇭", currency:"GHS",  rate:15,    ops:["MTN Mobile Money","Vodafone Cash","AirtelTigo Money"] },
  { code:"NG", name:"Nigeria",               flag:"🇳🇬", currency:"NGN",  rate:1550,  ops:["MTN MoMo","Airtel Money","Opay"] },
  { code:"TD", name:"Tchad",                 flag:"🇹🇩", currency:"XAF",  rate:600,   ops:["Airtel Money","Moov Money"] },
  { code:"ET", name:"Éthiopie",              flag:"🇪🇹", currency:"ETB",  rate:120,   ops:["Telebirr"] },
  { code:"SL", name:"Sierra Leone",          flag:"🇸🇱", currency:"SLE",  rate:22.5,  ops:["Orange Money","Africell Money"] },
  { code:"ZA", name:"Afrique du Sud",        flag:"🇿🇦", currency:"ZAR",  rate:18,    ops:["MTN MoMo","Vodacom"] },
  { code:"MG", name:"Madagascar",            flag:"🇲🇬", currency:"MGA",  rate:4500,  ops:["Orange Money","Telma Mvola","Airtel Money"] }
];

const CRYPTOS = [
  { id:"usdt-trc20", name:"USDT (TRC20 - Tron)", icon:"₮", bg:"#26A17B" },
  { id:"usdt-bep20", name:"USDT (BEP20 - BSC)",  icon:"₮", bg:"#26A17B" },
  { id:"btc",        name:"Bitcoin (BTC)",        icon:"₿", bg:"#F7931A" },
  { id:"trx",        name:"TRON (TRX)",           icon:"T", bg:"#EB0029" }
];

/* Badge coloré par opérateur mobile money (reconnaissance visuelle par marque) */
function getOperatorBadge(name) {
  const n = name.toLowerCase();
  if (n.includes('m-pesa') && n.includes('vodacom')) return { bg:'#E60000', label:'M' };
  if (n.includes('m-pesa')) return { bg:'#4CAF50', label:'M' };
  if (n.includes('vodacom')) return { bg:'#E60000', label:'V' };
  if (n.includes('airteltigo')) return { bg:'#0033A0', label:'AT' };
  if (n.includes('airtel')) return { bg:'#ED1C24', label:'A' };
  if (n.includes('orange')) return { bg:'#FF6600', label:'O' };
  if (n.includes('mtn')) return { bg:'#FFCC00', label:'M', dark:true };
  if (n.includes('moov')) return { bg:'#0066CC', label:'M' };
  if (n.includes('wave')) return { bg:'#00A3E0', label:'W' };
  if (n.includes('free')) return { bg:'#CC0000', label:'F' };
  if (n.includes('telecel')) return { bg:'#6A1B9A', label:'T' };
  if (n.includes('t-money') || n.includes('togocom')) return { bg:'#00A19A', label:'T' };
  if (n.includes('zain')) return { bg:'#6A1B9A', label:'Z' };
  if (n.includes('lumitel')) return { bg:'#F7941D', label:'L' };
  if (n.includes('ecocash')) return { bg:'#1E8449', label:'E' };
  if (n.includes('unitel')) return { bg:'#0057A8', label:'U' };
  if (n.includes('multicaixa')) return { bg:'#D32F2F', label:'MC' };
  if (n.includes('djezzy')) return { bg:'#6A1B9A', label:'D' };
  if (n.includes('mobilis')) return { bg:'#2E7D32', label:'M' };
  if (n.includes('mobicash')) return { bg:'#0057A8', label:'MC' };
  if (n.includes('inwi')) return { bg:'#FF6600', label:'I' };
  if (n.includes('d17')) return { bg:'#0057A8', label:'D17' };
  if (n.includes('telebirr')) return { bg:'#2E9E4F', label:'T' };
  if (n.includes('africell')) return { bg:'#6A1B9A', label:'A' };
  if (n.includes('opay')) return { bg:'#00A650', label:'O' };
  return { bg:'#555555', label: name[0] };
}

let payMethod = "mobile";
let payCountryCode = null;
let payOperator = null;
let payCryptoId = null;
let payCurrency = "USD";
let LIVE_RATES = null;

/* Récupère les taux de change en direct (API publique, gratuite, sans clé) */
async function fetchLiveRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      LIVE_RATES = data.rates;
      console.log('✅ Taux de change en direct chargés');
    }
  } catch (e) {
    console.warn('⚠️ Taux en direct indisponibles, utilisation des taux indicatifs.', e.message);
    LIVE_RATES = null;
  }
}

/* Charge les prix personnalisés définis par l'admin (collection Firestore "pricing") */
async function loadPricingOverrides() {
  try {
    const snap = await db.collection('pricing').get();
    const overrides = {};
    snap.forEach(doc => { overrides[doc.id] = doc.data().services || []; });
    applyPricingOverrides(overrides);
    console.log('✅ Prix personnalisés chargés');
  } catch (e) {
    console.warn('⚠️ Pas de prix personnalisés (utilisation des prix par défaut).', e.message);
  }
}

function renderPlatformGrid(gridId) {
  const el = document.getElementById(gridId);
  el.innerHTML = PLATFORMS.map(p => `
    <div class="platform-badge" onclick="onPlatformClick('${p.id}')">
      ${platformBadgeHTML(p)}
      <span class="p-name">${p.name}</span>
    </div>
  `).join('');
}
function initHomeCatalog() {
  renderPlatformGrid('home-platform-grid');
}
function filterPlatformGrid(gridId, query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll(`#${gridId} .platform-badge`).forEach(card => {
    const name = card.querySelector('.p-name').textContent.toLowerCase();
    card.style.display = name.includes(q) ? '' : 'none';
  });
}

/* Sur l'accueil public (non connecté) → ouvre l'inscription.
   Depuis le dashboard → ouvre le formulaire de commande. */
function onPlatformClick(platformId) {
  if (currentUser) {
    openOrderForm(platformId);
  } else {
    openAuth('register');
  }
}

function openOrderForm(platformId, presetTypeIndex, presetQty, presetTier) {
  selectedPlatformId = platformId;
  selectedQuality = presetTier || "standard";
  const p = PLATFORMS.find(x => x.id === platformId);
  document.getElementById('order-platform-header').innerHTML = `
    ${platformBadgeHTML(p)}
    <h2>${p.name}</h2>
  `;

  renderBundles(platformId);

  const services = SERVICE_CATALOG[platformId] || [];
  const select = document.getElementById('order-service-select');
  select.innerHTML = services.map((s, i) => `<option value="${i}">${s.label}</option>`).join('');

  const qtyInput = document.getElementById('order-qty');
  if (presetTypeIndex !== undefined) {
    select.value = presetTypeIndex;
    select.disabled = true;
    qtyInput.value = presetQty;
    qtyInput.readOnly = true;
  } else {
    select.disabled = false;
    qtyInput.readOnly = false;
    qtyInput.value = '';
  }

  renderQualityGrid();
  document.getElementById('order-link').value = '';
  document.getElementById('order-error').classList.add('hidden');
  onOrderInputChange();

  hideAllViews();
  document.getElementById('view-order').classList.remove('hidden');
}

function renderBundles(platformId) {
  const bundles = BUNDLES[platformId];
  const box = document.getElementById('bundles-box');
  const list = document.getElementById('bundles-list');
  if (!bundles || !bundles.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  list.innerHTML = bundles.map((b, i) => {
    const price = bundlePrice(platformId, b);
    return `
    <div class="bundle-card">
      <div class="bundle-head">
        <span class="bundle-label">${bundleLabel(platformId, b)}</span>
        <span class="bundle-price">${price.toFixed(2)}$</span>
      </div>
      <input type="url" id="bundle-link-${platformId}-${i}" class="text-input" data-i18n-placeholder="order_link_ph" placeholder="https://..." style="margin-top:8px">
      <div class="modal-error hidden" id="bundle-error-${platformId}-${i}" style="margin-top:8px"></div>
      <div class="modal-loading hidden" id="bundle-success-${platformId}-${i}" style="margin-top:8px"></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="buyBundle('${platformId}', ${i})">
        <span data-i18n="pkg_buy">Acheter</span> — ${price.toFixed(2)}$
      </button>
    </div>`;
  }).join('');
}
async function buyBundle(platformId, idx) {
  const bundle = BUNDLES[platformId][idx];
  const price = bundlePrice(platformId, bundle);
  const p = PLATFORMS.find(x => x.id === platformId);
  const errEl = document.getElementById(`bundle-error-${platformId}-${idx}`);
  const okEl = document.getElementById(`bundle-success-${platformId}-${idx}`);
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  const link = document.getElementById(`bundle-link-${platformId}-${idx}`).value.trim();
  if (!link) {
    errEl.textContent = t('order_err_link');
    errEl.classList.remove('hidden');
    return;
  }
  if ((currentUser.balance || 0) < price) {
    errEl.textContent = t('order_err_balance');
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const newBalance = (currentUser.balance || 0) - price;
    await db.collection('users').doc(currentUser.uid).update({ balance: newBalance });
    currentUser.balance = newBalance;
    await db.collection('orders').add({
      uid: currentUser.uid,
      email: currentUser.email,
      platform: p.name,
      service: bundleLabel(platformId, bundle),
      quality: 'bundle',
      link,
      quantity: null,
      price,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    document.getElementById('dash-balance').textContent = newBalance.toFixed(2) + '$';
    document.getElementById('wallet-balance').textContent = newBalance.toFixed(2) + '$';
    okEl.textContent = t('order_success');
    okEl.classList.remove('hidden');
  } catch (e) {
    console.error("Erreur achat forfait :", e.message);
    errEl.textContent = t('pay_err_generic');
    errEl.classList.remove('hidden');
  }
}

function renderQualityGrid() {
  const service = getSelectedService();
  const el = document.getElementById('quality-grid');
  el.innerHTML = QUALITY_TIERS.map(q => {
    const price = service ? service.price[q.id].toFixed(2) : '0.00';
    return `
    <div class="quality-card${q.id === selectedQuality ? ' active' : ''}" onclick="selectQuality('${q.id}')">
      <span class="q-name">${q.name}</span>
      <span class="q-mult">${price}$ <small>/1000</small></span>
    </div>`;
  }).join('');
}
function selectQuality(qId) {
  selectedQuality = qId;
  renderQualityGrid();
  onOrderInputChange();
}

function getSelectedService() {
  const services = SERVICE_CATALOG[selectedPlatformId] || [];
  const idx = parseInt(document.getElementById('order-service-select').value || 0, 10);
  return services[idx];
}

function onOrderInputChange() {
  const service = getSelectedService();
  if (!service) return;
  renderQualityGrid();
  const qty = parseInt(document.getElementById('order-qty').value || 0, 10);
  const price = (qty / 1000) * service.price[selectedQuality];

  document.getElementById('order-qty-hint').textContent =
    `Min ${service.min.toLocaleString('fr-FR')} · Max ${service.max.toLocaleString('fr-FR')}`;
  document.getElementById('order-total-price').textContent = price.toFixed(2) + '$';
  document.getElementById('order-user-balance').textContent = ((currentUser && currentUser.balance) || 0).toFixed(2) + '$';
}

/* Tente de transmettre la commande automatiquement à MoreThanPanel via le serveur.
   Si l'automatisation n'est pas encore branchée (pas de clé API, pas d'ID service),
   la commande reste simplement en attente pour un traitement manuel — rien ne casse. */
async function attemptAutomatedFulfillment(orderId, platformId, type, quality, link, quantity) {
  try {
    const res = await fetch('/api/place-smm-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: platformId, type, quality, link, quantity })
    });
    const data = await res.json();
    if (data.automated) {
      await db.collection('orders').doc(orderId).update({
        status: 'processing',
        mtpOrderId: data.mtpOrderId,
        mtpCost: data.mtpCost != null ? data.mtpCost : null,
        mtpCurrency: data.mtpCurrency || null
      });
    } else {
      await db.collection('orders').doc(orderId).update({
        debugReason: data.reason || 'Raison inconnue (reponse sans "reason")'
      });
    }
  } catch (e) {
    console.warn('Automatisation non disponible pour cette commande :', e.message);
    try {
      await db.collection('orders').doc(orderId).update({
        debugReason: 'Erreur fetch cote client : ' + e.message
      });
    } catch (e2) { /* rien de plus a faire */ }
  }
}

async function submitOrder() {
  const errEl = document.getElementById('order-error');
  errEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  const service = getSelectedService();
  const qty = parseInt(document.getElementById('order-qty').value || 0, 10);
  const link = document.getElementById('order-link').value.trim();
  const price = (qty / 1000) * service.price[selectedQuality];
  const qualityInfo = QUALITY_TIERS.find(q => q.id === selectedQuality);

  if (!link) { errEl.textContent = "Merci d'indiquer le lien à booster."; errEl.classList.remove('hidden'); return; }
  if (!qty || qty < service.min || qty > service.max) {
    errEl.textContent = `Quantité invalide (entre ${service.min} et ${service.max}).`;
    errEl.classList.remove('hidden');
    return;
  }
  if (price > (currentUser.balance || 0)) {
    errEl.textContent = "Solde insuffisant. Recharge ton portefeuille pour continuer.";
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const newBalance = currentUser.balance - price;
    const orderRef = await db.collection('orders').add({
      uid: currentUser.uid,
      email: currentUser.email,
      platform: selectedPlatformId,
      service: service.label,
      quality: qualityInfo.name,
      link, quantity: qty, price,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await db.collection('users').doc(currentUser.uid).update({ balance: newBalance });
    currentUser.balance = newBalance;

    attemptAutomatedFulfillment(orderRef.id, selectedPlatformId, service.type, selectedQuality, link, qty);

    showDashboard();
    showDashTab('orders');
    loadOrders();
  } catch (e) {
    console.error("Erreur commande :", e.message);
    errEl.textContent = "Erreur lors de l'enregistrement. Réessaie.";
    errEl.classList.remove('hidden');
  }
}

async function loadOrders() {
  if (!currentUser) return;
  const container = document.getElementById('dash-tab-orders');
  try {
    const snap = await db.collection('orders').where('uid', '==', currentUser.uid).get();
    const orders = [];
    snap.forEach(doc => orders.push(doc.data()));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (orders.length === 0) {
      container.innerHTML = `
        <h2 style="margin-bottom:14px">${t('tab_orders')}</h2>
        <div class="order-box">
          <p class="muted">${t('orders_empty')}</p>
          <button class="btn btn-primary" style="margin-top:12px" onclick="showServices()">${t('dash_orders_cta')}</button>
        </div>`;
      return;
    }
    container.innerHTML = `<h2 style="margin-bottom:14px">${t('tab_orders')}</h2>` + orders.map(o => {
      const p = PLATFORMS.find(x => x.id === o.platform);
      return `
        <div class="order-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong>${p ? p.name : o.platform} — ${o.service}</strong>
            <span class="order-status">${o.status}</span>
          </div>
          <p class="muted small">${o.quality} · Qté ${o.quantity.toLocaleString('fr-FR')} · ${o.price.toFixed(2)}$</p>
        </div>`;
    }).join('');
  } catch (e) {
    console.error("Erreur chargement commandes :", e.message);
  }
}

/* =========================================================
   RECHARGE / PAIEMENT
   ========================================================= */
function showRecharge() {
  hideAllViews();
  document.getElementById('view-recharge').classList.remove('hidden');
  payMethod = "mobile";
  payCountryCode = null;
  payOperator = null;
  payCryptoId = null;
  payCurrency = "USD";
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-phone').value = '';
  document.getElementById('recharge-error').classList.add('hidden');
  document.getElementById('recharge-success').classList.add('hidden');
  renderPayMethodTabs();
  renderPayCountrySelect();
  renderPayPanel();
  if (!LIVE_RATES) fetchLiveRates();
}
function renderPayMethodTabs() {
  const methods = [
    { id: "mobile", label: t('pay_mobile'), icon: "📱" },
    { id: "crypto", label: t('pay_crypto'), icon: "₿" },
    { id: "card",   label: t('pay_card'),   icon: "💳" }
  ];
  document.getElementById('pay-method-tabs').innerHTML = methods.map(m => `
    <button class="${m.id === payMethod ? 'active' : ''}" onclick="selectPayMethod('${m.id}')">${m.icon} ${m.label}</button>
  `).join('');
}
function selectPayMethod(m) {
  payMethod = m;
  renderPayMethodTabs();
  renderPayPanel();
}
function renderPayCountrySelect() {
  const sel = document.getElementById('pay-country-select');
  sel.innerHTML = `<option value="">${t('pay_choose_country')}</option>` +
    COUNTRIES.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join('');
}
function onPayCountryChange() {
  payCountryCode = document.getElementById('pay-country-select').value || null;
  payOperator = null;
  payCurrency = "USD";
  document.getElementById('recharge-amount').value = '';
  renderPayOperators();
  renderPayCurrencyToggle();
  updateRechargeEquivalent();
}
function renderPayCurrencyToggle() {
  const toggleEl = document.getElementById('pay-currency-toggle');
  const labelEl = document.getElementById('recharge-amount-label');
  const country = COUNTRIES.find(c => c.code === payCountryCode);

  if (payMethod !== 'mobile' || !country) {
    toggleEl.innerHTML = '';
    toggleEl.classList.add('hidden');
    labelEl.textContent = t('pay_amount_label');
    return;
  }

  // Seule la RD Congo autorise le choix entre USD et la devise locale (CDF).
  // Tous les autres pays sont exclusivement en USD, pour eviter toute confusion
  // sur la devise reellement facturee au client.
  if (country.code !== 'CD') {
    payCurrency = 'USD';
    toggleEl.innerHTML = '';
    toggleEl.classList.add('hidden');
    labelEl.textContent = t('pay_amount_label');
    return;
  }

  toggleEl.classList.remove('hidden');
  toggleEl.innerHTML = `
    <button class="${payCurrency === 'USD' ? 'active' : ''}" onclick="selectPayCurrency('USD')">USD ($)</button>
    <button class="${payCurrency === 'local' ? 'active' : ''}" onclick="selectPayCurrency('local')">${country.currency}</button>
  `;
  labelEl.textContent = payCurrency === 'USD' ? t('pay_amount_label') : `Montant (${country.currency})`;
}
function selectPayCurrency(cur) {
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  // Garde-fou : seule la RD Congo peut basculer vers la devise locale.
  if (cur === 'local' && (!country || country.code !== 'CD')) {
    cur = 'USD';
  }
  payCurrency = cur;
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-equivalent').textContent = '';
  renderPayCurrencyToggle();
}
function renderPayOperators() {
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  const el = document.getElementById('pay-operators');
  if (!country) { el.innerHTML = ''; return; }
  el.innerHTML = country.ops.map(op => {
    const badge = getOperatorBadge(op);
    return `
    <div class="op-card${op === payOperator ? ' active' : ''}" onclick="selectOperator('${op.replace(/'/g,"\\'")}')">
      <div class="op-icon" style="background:${badge.bg};${badge.dark ? 'color:#111' : 'color:#fff'}">${badge.label}</div>
      <span class="op-name">${op}</span>
    </div>`;
  }).join('');
}
function selectOperator(op) {
  payOperator = op;
  renderPayOperators();
}
function renderPayCryptoOptions() {
  const el = document.getElementById('pay-crypto-list');
  el.innerHTML = CRYPTOS.map(c => `
    <div class="op-card${c.id === payCryptoId ? ' active' : ''}" onclick="selectCrypto('${c.id}')">
      <div class="op-icon" style="background:${c.bg};color:#fff">${c.icon}</div>
      <span class="op-name">${c.name}</span>
    </div>
  `).join('');
}
function selectCrypto(id) {
  payCryptoId = id;
  renderPayCryptoOptions();
}
function renderPayPanel() {
  document.getElementById('pay-panel-mobile').classList.toggle('hidden', payMethod !== 'mobile');
  document.getElementById('pay-panel-crypto').classList.toggle('hidden', payMethod !== 'crypto');
  document.getElementById('pay-panel-card').classList.toggle('hidden', payMethod !== 'card');
  document.getElementById('recharge-amount-block').classList.toggle('hidden', payMethod === 'card');
  document.getElementById('recharge-submit-btn').classList.toggle('hidden', payMethod === 'card');
  if (payMethod === 'crypto') renderPayCryptoOptions();
  renderPayCurrencyToggle();
}
function updateRechargeEquivalent() {
  const amount = parseFloat(document.getElementById('recharge-amount').value || 0);
  const country = COUNTRIES.find(c => c.code === payCountryCode);
  const hint = document.getElementById('recharge-equivalent');
  if (payMethod === 'mobile' && country && amount > 0) {
    const liveRate = LIVE_RATES && LIVE_RATES[country.currency];
    const rate = liveRate || country.rate;
    const sourceTag = liveRate ? t('pay_rate_live') : t('pay_rate_indicative');
    if (payCurrency === 'local') {
      const usd = (amount / rate).toFixed(2);
      hint.textContent = `≈ ${usd} USD · ${sourceTag}`;
    } else {
      const local = (amount * rate).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
      hint.textContent = `≈ ${local} ${country.currency} · ${sourceTag}`;
    }
  } else {
    hint.textContent = '';
  }
}
async function submitRecharge() {
  const errEl = document.getElementById('recharge-error');
  const okEl = document.getElementById('recharge-success');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  if (payMethod === 'card') {
    return; // Carte virtuelle : bientôt disponible (le bouton est masqué pour cet onglet)
  }

  const rawAmount = parseFloat(document.getElementById('recharge-amount').value || 0);
  if (!rawAmount || rawAmount <= 0) {
    errEl.textContent = t('pay_err_amount');
    errEl.classList.remove('hidden');
    return;
  }
  if (payMethod === 'mobile' && (!payCountryCode || !payOperator)) {
    errEl.textContent = t('pay_err_operator');
    errEl.classList.remove('hidden');
    return;
  }
  const phone = document.getElementById('recharge-phone').value.trim();
  if (payMethod === 'mobile' && !phone) {
    errEl.textContent = t('pay_err_phone');
    errEl.classList.remove('hidden');
    return;
  }
  if (payMethod === 'crypto' && !payCryptoId) {
    errEl.textContent = t('pay_err_crypto');
    errEl.classList.remove('hidden');
    return;
  }

  // Si le client a saisi le montant dans la devise locale, on le convertit
  // en USD ici, une seule fois, pour que tout le reste du code (facture,
  // enregistrement Firestore, credit du solde) continue de travailler en USD.
  let amount = rawAmount;
  if (payMethod === 'mobile' && payCurrency === 'local' && payCountryCode) {
    const localCountry = COUNTRIES.find(c => c.code === payCountryCode);
    const liveRate = LIVE_RATES && localCountry && LIVE_RATES[localCountry.currency];
    const rate = liveRate || (localCountry ? localCountry.rate : 1);
    amount = rawAmount / rate;
  }

  try {
    const country = COUNTRIES.find(c => c.code === payCountryCode);
    const crypto = CRYPTOS.find(c => c.id === payCryptoId);

    if (payMethod === 'crypto') {
      // Paiement crypto : on cree une vraie facture Cryptomus via notre API serveur
      const response = await fetch('/api/cryptomus-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          amount: amount,
          currency: 'USD'
        })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Erreur creation facture Cryptomus :", data.error);
        errEl.textContent = t('pay_err_generic');
        errEl.classList.remove('hidden');
        return;
      }

      // On enregistre la demande en attente, en gardant l'ID de facture pour le suivi
      await db.collection('topup_requests').add({
        uid: currentUser.uid,
        email: currentUser.email,
        method: payMethod,
        crypto: crypto ? crypto.name : null,
        amountUSD: amount,
        status: 'pending_payment',
        cryptomusOrderId: data.orderId,
        cryptomusInvoiceId: data.invoiceId,
        createdAt: new Date().toISOString()
      });

      // On redirige l'utilisateur vers la page de paiement Cryptomus
      window.location.href = data.paymentUrl;
      return;
    }

    // Mobile Money : on tente MboтePay (pays couverts), sinon flux manuel comme avant
    if (payMethod === 'mobile') {
      const response = await fetch('/api/mbotepay-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          amountUSD: amount,
          countryCode: payCountryCode,
          operatorName: payOperator,
          phone: phone,
          chargeCurrency: payCurrency === 'USD' ? 'USD' : (country ? country.currency : null)
        })
      });
      const data = await response.json();

      if (data.supported && data.success) {
        // Automatise : le client va recevoir une invite mobile money sur son telephone
        await db.collection('topup_requests').add({
          uid: currentUser.uid,
          email: currentUser.email,
          method: payMethod,
          country: country ? country.name : null,
          operator: payOperator || null,
          phone,
          amountUSD: amount,
          localAmount: data.localAmount,
          localCurrency: data.currency,
          status: 'pending_payment',
          mbotepayReference: data.reference,
          createdAt: new Date().toISOString()
        });
        okEl.textContent = "Demande envoyée ! Confirme le paiement sur ton téléphone.";
        okEl.classList.remove('hidden');
        return;
      }
      if (data.supported && !data.success) {
        errEl.textContent = data.error || t('pay_err_generic');
        errEl.classList.remove('hidden');
        return;
      }
      // data.supported === false : pays non couvert par MboтePay, on tente CinetPay ci-dessous

      const cinetpayResponse = await fetch('/api/cinetpay-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          amountUSD: amount,
          countryCode: payCountryCode,
          clientEmail: currentUser.email,
          clientPhone: phone
        })
      });
      const cinetpayData = await cinetpayResponse.json();

      if (cinetpayData.supported && cinetpayData.success) {
        // Automatise : on enregistre la demande puis on redirige vers la page CinetPay
        // (Mobile Money OU Carte Bancaire selon le choix du client sur leur guichet)
        await db.collection('topup_requests').add({
          uid: currentUser.uid,
          email: currentUser.email,
          method: payMethod,
          country: country ? country.name : null,
          phone,
          amountUSD: amount,
          localAmount: cinetpayData.localAmount,
          localCurrency: cinetpayData.currency,
          status: 'pending_payment',
          cinetpayReference: cinetpayData.reference,
          createdAt: new Date().toISOString()
        });
        window.location.href = cinetpayData.paymentUrl;
        return;
      }
      if (cinetpayData.supported && !cinetpayData.success) {
        errEl.textContent = cinetpayData.error || t('pay_err_generic');
        errEl.classList.remove('hidden');
        return;
      }
      // cinetpayData.supported === false : pays non couvert non plus, on continue vers le flux manuel ci-dessous
    }

    // Autres methodes (et Mobile Money non couvert par MboтePay ni CinetPay) : demande manuelle comme avant
    await db.collection('topup_requests').add({
      uid: currentUser.uid,
      email: currentUser.email,
      method: payMethod,
      country: country ? country.name : null,
      operator: payOperator || null,
      phone: payMethod === 'mobile' ? phone : null,
      crypto: crypto ? crypto.name : null,
      amountUSD: amount,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    okEl.textContent = t('pay_success');
    okEl.classList.remove('hidden');
  } catch (e) {
    console.error("Erreur demande recharge :", e.message);
    errEl.textContent = t('pay_err_generic');
    errEl.classList.remove('hidden');
  }
}

/* =========================================================
   MONÉTISATION — critères par plateforme + services associés
   ========================================================= */
const MONETIZATION = {
  youtube: {
    program: "YouTube Partner Program",
    criteria: [
      { label: "Abonnés", value: "1 000 minimum" },
      { label: "Heures de visionnage", value: "4 000 heures sur 12 mois (vidéos longues)" },
      { label: "Alternative Shorts", value: "10 millions de vues Shorts sur 90 jours" },
      { label: "Compte AdSense", value: "Obligatoire, lié à la chaîne" },
      { label: "Règles de la communauté", value: "Aucune violation majeure sur les 90 derniers jours" }
    ],
    pack: { title: "Pack Monétisation YouTube", desc: "1 000 abonnés + 4 500 heures de visionnage (livraison progressive)", price: 149 }
  },
  tiktok: {
    program: "TikTok Creator Rewards Program",
    criteria: [
      { label: "Abonnés", value: "10 000 minimum" },
      { label: "Vues", value: "100 000 vues sur les 30 derniers jours" },
      { label: "Âge du compte", value: "18 ans minimum, compte en règle" },
      { label: "Format", value: "Vidéos de plus d'1 minute recommandées" }
    ],
    pack: { title: "Pack Monétisation TikTok", desc: "10 000 abonnés + 100 000 vues (30 derniers jours)", price: 89 }
  },
  facebook: {
    program: "Facebook In-Stream Ads",
    criteria: [
      { label: "Abonnés Page", value: "10 000 minimum" },
      { label: "Minutes vues", value: "600 000 minutes sur les 60 derniers jours" },
      { label: "Vidéos actives", value: "5 vidéos minimum publiées" }
    ],
    pack: { title: "Pack Monétisation Facebook", desc: "10 000 abonnés Page + 600 000 minutes vues", price: 129 }
  },
  instagram: {
    program: "Instagram Bonus Program",
    criteria: [
      { label: "Éligibilité", value: "Selon pays et invitation Meta" },
      { label: "Engagement", value: "Bon taux de likes/commentaires sur les Reels" },
      { label: "Régularité", value: "Publications fréquentes recommandées" }
    ],
    pack: { title: "Pack Engagement Instagram", desc: "5 000 vues Reels + 1 000 likes répartis sur tes publications", price: 39 }
  },
  twitch: {
    program: "Twitch Affiliate",
    criteria: [
      { label: "Abonnés (followers)", value: "50 minimum" },
      { label: "Temps de stream", value: "500 minutes sur les 30 derniers jours" },
      { label: "Jours de diffusion", value: "7 jours uniques" },
      { label: "Viewers moyens", value: "3 en moyenne par stream" }
    ],
    pack: { title: "Pack Affiliate Twitch", desc: "100 abonnés + viewers moyens boostés sur tes streams", price: 45 }
  },
  spotify: {
    program: "Spotify for Artists",
    criteria: [
      { label: "Écoutes", value: "Pas de seuil officiel, mais plus d'écoutes = plus de revenus" },
      { label: "Playlists", value: "L'ajout à des playlists augmente fortement la visibilité" }
    ],
    pack: { title: "Pack Visibilité Spotify", desc: "5 000 écoutes + 500 abonnés artiste", price: 35 }
  }
};

function renderMonetizationGrid() {
  const platforms = PLATFORMS.filter(p => MONETIZATION[p.id]);
  const el = document.getElementById('monetization-grid');
  el.innerHTML = platforms.map(p => `
    <div class="platform-badge" onclick="renderMonetizationDetail('${p.id}')">
      ${platformBadgeHTML(p)}
      <span class="p-name">${p.name}</span>
    </div>
  `).join('');
}
function renderMonetizationDetail(platformId) {
  const p = PLATFORMS.find(x => x.id === platformId);
  const m = MONETIZATION[platformId];
  const services = SERVICE_CATALOG[platformId] || [];
  const el = document.getElementById('monetization-detail');
  if (!p || !m) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="order-box">
      <div class="order-platform-header" style="margin-bottom:14px">
        ${platformBadgeHTML(p)}
        <div>
          <h2 style="font-size:1.05rem">${p.name}</h2>
          <p class="muted" style="font-size:0.8rem">${m.program}</p>
        </div>
      </div>
      ${m.criteria.map(c => `
        <div class="profile-row">
          <span>${c.label}</span>
          <span style="text-align:right;max-width:60%">${c.value}</span>
        </div>
      `).join('')}
    </div>

    <div class="order-box pack-card">
      <div class="pack-head">
        <div>
          <h3 style="color:var(--red);margin-bottom:2px">${m.pack.title}</h3>
          <p class="muted" style="font-size:0.8rem">${m.pack.desc}</p>
        </div>
        <div class="pack-price">${m.pack.price}$</div>
      </div>
      <label class="field-label" style="margin-top:14px" data-i18n="order_link_label">Lien</label>
      <input type="url" id="pack-link-${platformId}" class="text-input" data-i18n-placeholder="order_link_ph" placeholder="https://...">
      <div class="modal-error hidden" id="pack-error-${platformId}"></div>
      <div class="modal-loading hidden" id="pack-success-${platformId}"></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:14px" onclick="buyMonetizationPackage('${platformId}')">
        <span data-i18n="pack_buy_cta">Acheter ce pack</span> — ${m.pack.price}$
      </button>
    </div>
  `;
}
async function buyMonetizationPackage(platformId) {
  const m = MONETIZATION[platformId];
  const p = PLATFORMS.find(x => x.id === platformId);
  const errEl = document.getElementById(`pack-error-${platformId}`);
  const okEl = document.getElementById(`pack-success-${platformId}`);
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!currentUser) { openAuth('register'); return; }

  const link = document.getElementById(`pack-link-${platformId}`).value.trim();
  if (!link) {
    errEl.textContent = t('order_err_link');
    errEl.classList.remove('hidden');
    return;
  }
  if ((currentUser.balance || 0) < m.pack.price) {
    errEl.textContent = t('order_err_balance');
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const newBalance = (currentUser.balance || 0) - m.pack.price;
    await db.collection('users').doc(currentUser.uid).update({ balance: newBalance });
    currentUser.balance = newBalance;
    await db.collection('orders').add({
      uid: currentUser.uid,
      email: currentUser.email,
      platform: p.name,
      service: m.pack.title,
      quality: 'package',
      link,
      quantity: null,
      price: m.pack.price,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    document.getElementById('dash-balance').textContent = newBalance.toFixed(2) + '$';
    document.getElementById('wallet-balance').textContent = newBalance.toFixed(2) + '$';
    okEl.textContent = t('order_success');
    okEl.classList.remove('hidden');
  } catch (e) {
    console.error("Erreur achat pack :", e.message);
    errEl.textContent = t('pay_err_generic');
    errEl.classList.remove('hidden');
  }
}
function showMonetization() {
  hideAllViews();
  document.getElementById('view-monetization').classList.remove('hidden');
  renderMonetizationGrid();
  document.getElementById('monetization-detail').innerHTML = '';
}

/* =========================================================
   PARRAINAGE — lien unique par utilisateur, 5% de commission
   ========================================================= */
/* Ouvre directement la Boutique sur l'article partage, si le lien contient ?produit=ID */
async function openSharedProductIfAny() {
  const params = new URLSearchParams(window.location.search);
  const pubId = params.get('produit');
  if (!pubId) return;

  showShop();
  // Laisse le temps au fil de se charger avant de chercher la carte
  setTimeout(() => {
    const card = document.getElementById(`shop-card-${pubId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('shop-card-highlight');
      setTimeout(() => card.classList.remove('shop-card-highlight'), 2000);
    }
  }, 900);
}

function getPendingReferrerUid() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || null;
}
function renderReferralBox() {
  if (!currentUser) return;
  const link = `${window.location.origin}${window.location.pathname}?ref=${currentUser.uid}`;
  const el = document.getElementById('referral-link-text');
  if (el) el.textContent = link;
  db.collection('users').where('referredBy', '==', currentUser.uid).get()
    .then(snap => {
      const countEl = document.getElementById('referral-count-text');
      if (countEl) countEl.textContent = `${snap.size} ${t('referral_count_suffix')}`;
    })
    .catch(() => {});
}
function copyReferralLink() {
  const link = document.getElementById('referral-link-text').textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => alert(t('referral_copied')));
  }
}

/* =========================================================
   FAQ
   ========================================================= */
const FAQ_ITEMS = [
  { q: "faq_q1", a: "faq_a1" },
  { q: "faq_q2", a: "faq_a2" },
  { q: "faq_q3", a: "faq_a3" },
  { q: "faq_q4", a: "faq_a4" },
  { q: "faq_q5", a: "faq_a5" }
];
function renderFAQ() {
  const el = document.getElementById('faq-list');
  if (!el) return;
  el.innerHTML = FAQ_ITEMS.map((item, i) => `
    <div class="faq-item">
      <button class="faq-q" onclick="toggleFAQ(${i})">
        <span>${t(item.q)}</span>
        <span class="faq-icon" id="faq-icon-${i}">+</span>
      </button>
      <div class="faq-a" id="faq-a-${i}">${t(item.a)}</div>
    </div>
  `).join('');
}
function toggleFAQ(i) {
  document.getElementById(`faq-a-${i}`).classList.toggle('open');
  document.getElementById(`faq-icon-${i}`).classList.toggle('open');
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
        referredBy: getPendingReferrerUid(),
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
        referredBy: getPendingReferrerUid(),
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
  document.getElementById('admin-shortcut-btn').classList.add('hidden');
  document.getElementById('notif-bell-btn').classList.add('hidden');
  stopNotifWatch();
}
function renderLoggedInNav(uid) {
  document.getElementById('nav-login-btn').classList.add('hidden');
  document.getElementById('nav-register-btn').classList.add('hidden');
  document.getElementById('nav-dashboard-btn').classList.remove('hidden');
  document.getElementById('admin-shortcut-btn').classList.toggle('hidden', uid !== ADMIN_UID);
  document.getElementById('notif-bell-btn').classList.remove('hidden');
  startNotifWatch();
}

if (fbReady) {
  loadPricingOverrides();
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

      renderLoggedInNav(user.uid);
      document.getElementById('dash-name').textContent = currentUser.name;
      document.getElementById('wallet-balance').textContent = (currentUser.balance || 0).toFixed(2) + '$';
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
      document.getElementById('profile-since').textContent = currentUser.createdAt
        ? new Date(currentUser.createdAt).toLocaleDateString('fr-FR')
        : '—';
      document.getElementById('profile-loyalty').textContent = currentUser.loyaltyPoints || 0;

      showDashboard();
      openSharedProductIfAny();
      registerPushNotifications();
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
  initTutorialAutoShow();
  updateCartBadge();
});

/* ================= TUTORIEL / GUIDE D'UTILISATION ================= */
let tutorialCurrentStep = 0;
const TUTORIAL_SEEN_KEY = 'coeurnohboost_tutorial_seen';

/* ================= NOTIFICATIONS ================= */
function openNotifPanel() {
  if (!currentUser) { openAuth('register'); return; }
  hideAllViews();
  document.getElementById('view-notifications').classList.remove('hidden');
  toggleNotifPanelContent();
}

function closeNotifPanel() {
  showDashboard();
}

function initTutorialAutoShow() {
  try {
    const alreadySeen = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!alreadySeen) {
      setTimeout(() => openTutorial(), 900);
    }
  } catch (e) {
    // localStorage indisponible (mode privé, etc.) : on n'affiche pas automatiquement
  }
}

function tutorialStepCount() {
  return document.querySelectorAll('.tutorial-step').length;
}

function openTutorial() {
  tutorialCurrentStep = 0;
  const dotsContainer = document.getElementById('tutorial-dots');
  dotsContainer.innerHTML = '';
  for (let i = 0; i < tutorialStepCount(); i++) {
    const dot = document.createElement('span');
    dot.className = 'tutorial-dot' + (i === 0 ? ' active' : '');
    dot.dataset.step = i;
    dotsContainer.appendChild(dot);
  }
  renderTutorialStep();
  document.getElementById('tutorial-modal').classList.remove('hidden');
}

function closeTutorial() {
  document.getElementById('tutorial-modal').classList.add('hidden');
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (e) {
    // localStorage indisponible : pas grave, le tutoriel se réaffichera simplement
  }
}

function tutorialNext() {
  if (tutorialCurrentStep < tutorialStepCount() - 1) {
    tutorialCurrentStep++;
    renderTutorialStep();
  } else {
    closeTutorial();
  }
}

function tutorialPrev() {
  if (tutorialCurrentStep > 0) {
    tutorialCurrentStep--;
    renderTutorialStep();
  }
}

function renderTutorialStep() {
  document.querySelectorAll('.tutorial-step').forEach((el) => {
    el.classList.toggle('hidden', parseInt(el.dataset.tutorialStep, 10) !== tutorialCurrentStep);
  });
  document.querySelectorAll('.tutorial-dot').forEach((dot) => {
    dot.classList.toggle('active', parseInt(dot.dataset.step, 10) === tutorialCurrentStep);
  });
  const prevBtn = document.getElementById('tutorial-prev');
  const nextBtn = document.getElementById('tutorial-next');
  prevBtn.classList.toggle('tutorial-nav-hidden', tutorialCurrentStep === 0);
  if (tutorialCurrentStep === tutorialStepCount() - 1) {
    nextBtn.classList.add('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }
}

/* ================= BOUTIQUE (livres & produits) ================= */
/* ================= PANIER (produits uniquement) ================= */
const CART_STORAGE_KEY = 'coeurnohboost_cart';
let cartItems = [];
try {
  cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
} catch (e) { cartItems = []; }

function saveCart() {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); } catch (e) { /* pas grave */ }
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  if (cartItems.length > 0) {
    badge.textContent = cartItems.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function toggleCartItem(pubId, title, price, imageUrl) {
  if (!currentUser) { openAuth('register'); return; }
  const idx = cartItems.findIndex(c => c.id === pubId);
  if (idx >= 0) {
    cartItems.splice(idx, 1);
  } else {
    cartItems.push({ id: pubId, title, price, imageUrl });
  }
  saveCart();
  renderShopFeed(); // met a jour le bouton "Ajouter" / "Dans le panier" sur la carte
}

function removeFromCart(pubId) {
  cartItems = cartItems.filter(c => c.id !== pubId);
  saveCart();
  renderCartModal();
  renderShopFeed();
}

function getCartTotal() {
  const subtotal = cartItems.reduce((sum, c) => sum + c.price, 0);
  const discountApplies = cartItems.length > 3;
  const total = discountApplies ? Math.round(subtotal * 0.95 * 100) / 100 : subtotal;
  return { subtotal: Math.round(subtotal * 100) / 100, discountApplies, total };
}

function openCart() {
  if (!currentUser) { openAuth('register'); return; }
  if (!document.getElementById('cart-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="cart-modal">
        <div class="modal">
          <button class="modal-close" onclick="document.getElementById('cart-modal').classList.add('hidden')">×</button>
          <h2>🛒 Mon panier</h2>
          <div class="modal-error hidden" id="cart-error"></div>
          <div id="cart-items-list"></div>
          <div id="cart-summary"></div>
          <button class="btn btn-primary" style="width:100%;margin-top:14px" id="cart-checkout-btn" onclick="checkoutCart()">Payer</button>
        </div>
      </div>`);
  }
  document.getElementById('cart-modal').classList.remove('hidden');
  renderCartModal();
}

function renderCartModal() {
  const listEl = document.getElementById('cart-items-list');
  const summaryEl = document.getElementById('cart-summary');
  if (!listEl) return;

  if (cartItems.length === 0) {
    listEl.innerHTML = '<p class="muted">Ton panier est vide.</p>';
    summaryEl.innerHTML = '';
    document.getElementById('cart-checkout-btn').classList.add('hidden');
    return;
  }
  document.getElementById('cart-checkout-btn').classList.remove('hidden');

  listEl.innerHTML = cartItems.map(c => `
    <div class="cart-row">
      <img src="${c.imageUrl}" class="cart-row-img" alt="">
      <div class="cart-row-info"><strong>${c.title}</strong><div class="muted small">${c.price.toFixed(2)}$</div></div>
      <button class="shop-action-btn" onclick="removeFromCart('${c.id}')">🗑️</button>
    </div>
  `).join('');

  const { subtotal, discountApplies, total } = getCartTotal();
  summaryEl.innerHTML = `
    <div class="cart-summary-row"><span>Sous-total</span><span>${subtotal.toFixed(2)}$</span></div>
    ${discountApplies ? `<div class="cart-summary-row cart-discount-row"><span>🎉 Remise -5% (plus de 3 articles)</span><span>-${(subtotal - total).toFixed(2)}$</span></div>` : ''}
    <div class="cart-summary-row cart-total-row"><span>Total</span><span>${total.toFixed(2)}$</span></div>`;
}

async function checkoutCart() {
  const errEl = document.getElementById('cart-error');
  errEl.classList.add('hidden');
  const { total } = getCartTotal();

  if (total > (currentUser.balance || 0)) {
    errEl.textContent = "Solde insuffisant. Recharge ton portefeuille pour continuer.";
    errEl.classList.remove('hidden');
    return;
  }

  document.getElementById('cart-checkout-btn').classList.add('hidden');
  try {
    const response = await fetch('/api/shop-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUser.uid, pubIds: cartItems.map(c => c.id) })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Erreur lors du paiement");

    currentUser.balance = data.newBalance;
    cartItems = [];
    saveCart();
    document.getElementById('cart-items-list').innerHTML = `<p style="text-align:center;color:var(--green);font-weight:700">✅ Achat confirmé ! Contacte les vendeurs via WhatsApp sur chaque article pour la livraison.</p>`;
    document.getElementById('cart-summary').innerHTML = '';
    renderShopFeed();
  } catch (e) {
    document.getElementById('cart-checkout-btn').classList.remove('hidden');
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

let shopFeedItems = [];
let shopLikedMap = {};
let shopPurchasedSet = new Set();
let shopActiveFilter = 'all';
let shopActiveSort = 'recent';
let shopActiveCategory = 'all';

function setShopSort(sort) {
  shopActiveSort = sort;
  renderShopFeed();
}

function setShopCategory(category) {
  shopActiveCategory = category;
  renderShopFeed();
}

function openSellForm() {
  if (!currentUser) { openAuth('register'); return; }
  const modalHtml = `
    <div class="modal-overlay" id="sell-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('sell-modal').remove()">×</button>
        <h2>➕ Vendre un article</h2>
        <p class="sub">CoeurnohBoost prélève 10% de commission sur chaque vente. Tu reçois 90% directement sur ton solde.</p>
        <div class="modal-error hidden" id="sell-form-error"></div>

        <div class="field">
          <label>Type</label>
          <select id="sell-type" class="text-input" onchange="toggleSellFields()">
            <option value="book">📖 Livre (avec lien de téléchargement)</option>
            <option value="product">🛍️ Produit (photo)</option>
          </select>
        </div>
        <div class="field">
          <label>Titre</label>
          <input type="text" id="sell-title" class="text-input" placeholder="Nom de ton article">
        </div>
        <div class="field">
          <label>Description</label>
          <textarea id="sell-description" class="text-input" rows="3" placeholder="Décris ce que tu vends..."></textarea>
        </div>
        <div class="field">
          <label>Prix (USD)</label>
          <input type="number" id="sell-price" class="text-input" placeholder="Ex: 5.99" step="0.01" min="0">
        </div>
        <div class="field">
          <label>Catégorie</label>
          <select id="sell-category" class="text-input">
            <option value="ebooks">📚 Livres & Ebooks</option>
            <option value="beaute">💄 Beauté & Bien-être</option>
            <option value="mode">👗 Mode & Accessoires</option>
            <option value="electronique">🔌 Électronique</option>
            <option value="maison">🏠 Maison & Déco</option>
            <option value="autres">📦 Autres</option>
          </select>
        </div>
        <div class="field">
          <label>Promotion (optionnel)</label>
          <div style="display:flex;gap:8px">
            <select id="sell-discount" class="text-input" style="flex:1">
              <option value="0">Aucune réduction</option>
              <option value="10">-10%</option>
              <option value="20">-20%</option>
              <option value="30">-30%</option>
            </select>
            <select id="sell-discount-duration" class="text-input" style="flex:1">
              <option value="0">Sans limite de temps</option>
              <option value="24">24 heures</option>
              <option value="72">3 jours</option>
              <option value="168">7 jours</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Lien de la photo</label>
          <input type="url" id="sell-image" class="text-input" placeholder="https://i.postimg.cc/...">
          <p class="muted small" style="margin-top:4px">Uploade ta photo sur <strong>postimages.org</strong>, copie le "Lien direct", colle-le ici.</p>
        </div>
        <div class="field" id="sell-file-field">
          <label>Lien du fichier PDF</label>
          <input type="url" id="sell-file" class="text-input" placeholder="https://drive.google.com/...">
        </div>
        <div class="field" id="sell-phone-field" style="display:none">
          <label>Ton numéro WhatsApp (pour que l'acheteur te contacte)</label>
          <input type="tel" id="sell-phone" class="text-input" placeholder="+243...">
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="submitSellForm()">Publier</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  toggleSellFields();
}

function toggleSellFields() {
  const type = document.getElementById('sell-type').value;
  document.getElementById('sell-file-field').style.display = type === 'book' ? 'block' : 'none';
  document.getElementById('sell-phone-field').style.display = type === 'product' ? 'block' : 'none';
}

async function submitSellForm() {
  const errEl = document.getElementById('sell-form-error');
  errEl.classList.add('hidden');

  const type = document.getElementById('sell-type').value;
  const title = document.getElementById('sell-title').value.trim();
  const description = document.getElementById('sell-description').value.trim();
  const price = parseFloat(document.getElementById('sell-price').value);
  const category = document.getElementById('sell-category').value;
  const imageUrl = document.getElementById('sell-image').value.trim();
  const fileUrl = document.getElementById('sell-file').value.trim();
  const phone = document.getElementById('sell-phone').value.trim();
  const discountPercent = parseInt(document.getElementById('sell-discount').value, 10) || 0;
  const discountDurationHours = parseInt(document.getElementById('sell-discount-duration').value, 10) || 0;

  if (!title || !description || isNaN(price) || price <= 0) {
    errEl.textContent = "Merci de remplir le titre, la description et un prix valide.";
    errEl.classList.remove('hidden');
    return;
  }
  if (!imageUrl || !imageUrl.startsWith('http')) {
    errEl.textContent = "Merci de coller un lien de photo valide.";
    errEl.classList.remove('hidden');
    return;
  }
  if (type === 'book' && (!fileUrl || !fileUrl.startsWith('http'))) {
    errEl.textContent = "Merci de coller un lien valide vers le fichier PDF.";
    errEl.classList.remove('hidden');
    return;
  }
  if (type === 'product' && !phone) {
    errEl.textContent = "Merci d'indiquer ton numéro WhatsApp pour que les acheteurs te contactent.";
    errEl.classList.remove('hidden');
    return;
  }

  try {
    await db.collection('publications').add({
      type, title, description, price, category, imageUrl,
      fileUrl: type === 'book' ? fileUrl : null,
      sellerUid: currentUser.uid,
      sellerName: currentUser.name || 'Vendeur CoeurnohBoost',
      sellerPhone: type === 'product' ? phone : null,
      discountPercent: discountPercent,
      promoExpiresAt: (discountPercent > 0 && discountDurationHours > 0)
        ? new Date(Date.now() + discountDurationHours * 60 * 60 * 1000).toISOString()
        : null,
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    });

    // Annonce publique visible par tous (panneau notifications) + vraie alerte push
    const annTitle = discountPercent > 0 ? 'Promotion disponible 🎉' : 'Nouveau produit disponible 🆕';
    const annBody = `${title} — ${price.toFixed(2)}$${discountPercent > 0 ? ` (-${discountPercent}%)` : ''}`;
    await db.collection('announcements').add({
      title: annTitle, body: annBody, type: 'announcement', createdAt: new Date().toISOString()
    });
    broadcastPush(annTitle, annBody);

    document.getElementById('sell-modal').remove();
    loadShopFeed();
  } catch (e) {
    errEl.textContent = "Erreur lors de la publication : " + e.message;
    errEl.classList.remove('hidden');
  }
}

/* Fil de publications sur l'Accueil : PHOTOS/VIDEOS/TEXTES (type 'post'),
   rendu style Instagram/Facebook — volontairement different des cartes
   Boutique (pas de prix, media en plein format, legende en dessous). */
async function loadHomeFeed() {
  const feedEl = document.getElementById('home-feed');
  if (!feedEl) return;
  feedEl.innerHTML = '<p class="muted">Chargement...</p>';
  try {
    const snap = await db.collection('publications')
      .where('status', '==', 'published')
      .where('type', '==', 'post')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    if (snap.empty) {
      feedEl.innerHTML = '<p class="muted">Aucune publication pour l\'instant. Sois le premier à publier !</p>';
      return;
    }

    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let likedMap = {};
    if (currentUser) {
      const likeChecks = await Promise.all(items.map(item =>
        db.collection('publication_likes').doc(`${item.id}_${currentUser.uid}`).get()
      ));
      items.forEach((item, i) => { likedMap[item.id] = likeChecks[i].exists; });
    }

    feedEl.innerHTML = items.map(item => renderPostCard(item, likedMap[item.id])).join('');
  } catch (e) {
    feedEl.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
  }
}

function renderPostCard(item, isLiked) {
  const timeStr = timeAgo(item.createdAt);
  let mediaHtml = '';
  if (item.mediaType === 'photo' && item.imageUrl) {
    mediaHtml = `<img src="${item.imageUrl}" alt="" class="post-media" onclick="openMediaViewer('${item.imageUrl}','photo')">`;
  } else if (item.mediaType === 'video' && item.videoUrl) {
    mediaHtml = `<video src="${item.videoUrl}" class="post-media" controls onclick="openMediaViewer('${item.videoUrl}','video')"></video>`;
  }

  const shareUrl = `https://coeurnohboost.vercel.app/?produit=${item.id}`;

  return `
  <div class="post-card" id="shop-card-${item.id}">
    <div class="post-card-header">
      <div class="post-avatar">${(item.sellerName || 'C')[0].toUpperCase()}</div>
      <div>
        <strong>${item.sellerName || 'CoeurnohBoost'}</strong>
        <div class="post-time">${timeStr}</div>
      </div>
    </div>
    ${item.description ? `<p class="post-caption">${item.description}</p>` : ''}
    ${mediaHtml}
    <div class="post-actions">
      <button class="shop-action-btn ${isLiked ? 'liked' : ''}" id="shop-like-${item.id}" onclick="toggleShopLike('${item.id}')">
        <span id="shop-like-icon-${item.id}">${isLiked ? '❤️' : '🤍'}</span>
        <span id="shop-like-count-${item.id}">${item.likesCount || 0}</span>
      </button>
      <button class="shop-action-btn" onclick="toggleShopComments('${item.id}')">
        💬 <span id="shop-comment-count-${item.id}">${item.commentsCount || 0}</span>
      </button>
      <button class="shop-action-btn" onclick="sharePost('${item.id}','${escapeForJs(item.description || '')}','${shareUrl}')">
        ${ICON_SHARE} Partager
      </button>
    </div>
    <div class="shop-comments hidden" id="shop-comments-${item.id}">
      <div class="shop-comments-list" id="shop-comments-list-${item.id}"><p class="muted small">Chargement des commentaires...</p></div>
      <div class="shop-comment-form">
        <input type="text" class="text-input" id="shop-comment-input-${item.id}" placeholder="Écris un commentaire...">
        <button class="btn btn-outline btn-sm" onclick="addShopComment('${item.id}')">Envoyer</button>
      </div>
    </div>
  </div>`;
}

function sharePost(pubId, caption, url) {
  if (navigator.share) {
    navigator.share({ title: 'CoeurnohBoost', text: caption || 'Regarde cette publication', url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url);
    alert('Lien copié !');
  }
  notifyPublicationShared(pubId);
}

// Notifie le proprietaire d'une publication (post OU article boutique) quand
// quelqu'un la partage — utilise par sharePost() et shareShopItem().
async function notifyPublicationShared(pubId) {
  if (!currentUser) return;
  try {
    const pubSnap = await db.collection('publications').doc(pubId).get();
    const pub = pubSnap.data();
    if (pub && pub.sellerUid && pub.sellerUid !== currentUser.uid) {
      const title = 'Partage 🔗';
      const body = `${currentUser.name || 'Quelqu\'un'} a partagé "${pub.title || pub.description || 'ta publication'}".`;
      await db.collection('notifications').add({
        uid: pub.sellerUid, title, body, type: 'share', read: false, createdAt: new Date().toISOString()
      });
      notifyUserPush(pub.sellerUid, title, body);
    }
  } catch (e) { /* pas grave si la notification echoue */ }
}

/* ================= VISIONNEUSE PLEIN ECRAN ================= */
function openMediaViewer(url, type) {
  const contentEl = document.getElementById('media-viewer-content');
  contentEl.innerHTML = type === 'video'
    ? `<video src="${url}" controls autoplay class="media-viewer-media"></video>`
    : `<img src="${url}" alt="" class="media-viewer-media">`;
  document.getElementById('media-viewer-download-btn').onclick = () => downloadMedia(url, type);
  document.getElementById('media-viewer').classList.remove('hidden');
}

function closeMediaViewer() {
  document.getElementById('media-viewer').classList.add('hidden');
  document.getElementById('media-viewer-content').innerHTML = '';
}

async function downloadMedia(url, type) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `coeurnohboost-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    alert("Téléchargement automatique impossible. Fais un appui long sur l'image/vidéo puis choisis \"Enregistrer\".");
  }
}

/* ================= CREER UNE PUBLICATION (Accueil) ================= */
function openCreatePostForm() {
  if (!currentUser) { openAuth('register'); return; }
  document.getElementById('create-post-modal').classList.remove('hidden');
  togglePostMediaField();
}

function closeCreatePostForm() {
  document.getElementById('create-post-modal').classList.add('hidden');
}

function togglePostMediaField() {
  const type = document.getElementById('post-media-type').value;
  document.getElementById('post-media-url-field').style.display = type === 'text' ? 'none' : 'block';
}

async function submitCreatePost() {
  const errEl = document.getElementById('post-form-error');
  errEl.classList.add('hidden');

  const mediaType = document.getElementById('post-media-type').value;
  const mediaUrl = document.getElementById('post-media-url').value.trim();
  const caption = document.getElementById('post-caption').value.trim();

  if (mediaType !== 'text' && (!mediaUrl || !mediaUrl.startsWith('http'))) {
    errEl.textContent = "Merci de coller un lien valide vers ta photo ou vidéo.";
    errEl.classList.remove('hidden');
    return;
  }
  if (!caption && mediaType === 'text') {
    errEl.textContent = "Merci d'écrire un texte.";
    errEl.classList.remove('hidden');
    return;
  }

  try {
    await db.collection('publications').add({
      type: 'post',
      mediaType,
      imageUrl: mediaType === 'photo' ? mediaUrl : null,
      videoUrl: mediaType === 'video' ? mediaUrl : null,
      description: caption,
      sellerUid: currentUser.uid,
      sellerName: currentUser.name || 'Utilisateur',
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    });

    // Annonce publique visible par tous (panneau notifications) + vraie alerte push
    const mediaLabel = mediaType === 'photo' ? 'une photo' : mediaType === 'video' ? 'une vidéo' : 'un texte';
    const annTitle = 'Nouvelle publication 📸';
    const annBody = `${currentUser.name || 'Quelqu\'un'} a publié ${mediaLabel}${caption ? ` : "${caption.slice(0, 60)}"` : ''}`;
    db.collection('announcements').add({
      title: annTitle, body: annBody, type: 'announcement', createdAt: new Date().toISOString()
    }).catch(() => {});
    broadcastPush(annTitle, annBody);

    document.getElementById('post-media-url').value = '';
    document.getElementById('post-caption').value = '';
    closeCreatePostForm();
    loadHomeFeed();
  } catch (e) {
    errEl.textContent = "Erreur lors de la publication : " + e.message;
    errEl.classList.remove('hidden');
  }
}

function showShop() {
  hideAllViews();
  document.getElementById('view-shop').classList.remove('hidden');
  const homeFeedEl = document.getElementById('home-feed');
  if (homeFeedEl) homeFeedEl.innerHTML = '';
  loadShopFeed();
}

/* ================= ESPACE VENDEUR ================= */
const SELLER_TIERS = [
  { min: 50, name: 'Diamant', emoji: '💎', color: '#5ec1ea' },
  { min: 20, name: 'Or',      emoji: '🥇', color: '#e8a534' },
  { min: 5,  name: 'Argent',  emoji: '🥈', color: '#9aa3ad' },
  { min: 0,  name: 'Bronze',  emoji: '🥉', color: '#b8722f' }
];

function getSellerTier(salesCount) {
  return SELLER_TIERS.find(t => salesCount >= t.min);
}

function showSellerPage() {
  if (!currentUser) { openAuth('register'); return; }
  hideAllViews();
  document.getElementById('view-seller').classList.remove('hidden');
  loadSellerStats();
  loadMyPublications();
  loadSellerWithdrawals();
}

/* ================= RETRAIT VENDEUR ================= */
let withdrawMethod = 'mobile'; // 'mobile' ou 'crypto'
let withdrawCountry = null;
let withdrawOperator = null;

function openWithdrawForm() {
  const balance = currentUser.balance || 0;
  const modalHtml = `
    <div class="modal-overlay" id="withdraw-modal">
      <div class="modal">
        <button class="modal-close" onclick="document.getElementById('withdraw-modal').remove()">×</button>
        <h2>💸 Demander un retrait</h2>
        <p class="sub">Ton solde disponible : <strong>${balance.toFixed(2)}$</strong></p>
        <p class="muted small" style="margin-bottom:14px">Ta demande sera traitée manuellement par CoeurnohBoost, généralement sous 24-48h.</p>
        <div class="modal-error hidden" id="withdraw-form-error"></div>

        <div class="pay-method-tabs" id="withdraw-method-tabs"></div>

        <div id="withdraw-panel-mobile">
          <div class="field">
            <label>Pays</label>
            <select id="withdraw-country-select" class="select-input" onchange="onWithdrawCountryChange()"></select>
          </div>
          <div class="op-grid" id="withdraw-operators"></div>
          <div class="field">
            <label>Numéro de téléphone</label>
            <input type="tel" id="withdraw-phone" class="text-input" placeholder="+243...">
          </div>
        </div>

        <div class="hidden" id="withdraw-panel-crypto">
          <div class="field">
            <label>Réseau</label>
            <select id="withdraw-crypto-network" class="select-input">
              <option value="usdt-trc20">USDT (TRC20 - Tron)</option>
              <option value="usdt-bep20">USDT (BEP20 - BSC)</option>
              <option value="btc">Bitcoin (BTC)</option>
              <option value="trx">TRON (TRX)</option>
            </select>
          </div>
          <div class="field">
            <label>Adresse du portefeuille</label>
            <input type="text" id="withdraw-address" class="text-input" placeholder="Colle ton adresse ici">
          </div>
        </div>

        <div class="field">
          <label>Montant à retirer (USD)</label>
          <input type="number" id="withdraw-amount" class="text-input" placeholder="Ex: 20" step="0.01" min="1" max="${balance}">
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="submitWithdrawRequest()">Envoyer la demande</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  withdrawMethod = 'mobile'; withdrawCountry = null; withdrawOperator = null;
  renderWithdrawMethodTabs();
  renderWithdrawCountrySelect();
}

function renderWithdrawMethodTabs() {
  const methods = [{ id: 'mobile', label: 'Mobile Money', icon: '📱' }, { id: 'crypto', label: 'Crypto', icon: '₿' }];
  document.getElementById('withdraw-method-tabs').innerHTML = methods.map(m => `
    <button class="${m.id === withdrawMethod ? 'active' : ''}" onclick="selectWithdrawMethod('${m.id}')">${m.icon} ${m.label}</button>
  `).join('');
  document.getElementById('withdraw-panel-mobile').classList.toggle('hidden', withdrawMethod !== 'mobile');
  document.getElementById('withdraw-panel-crypto').classList.toggle('hidden', withdrawMethod !== 'crypto');
}

function selectWithdrawMethod(m) {
  withdrawMethod = m;
  renderWithdrawMethodTabs();
}

function renderWithdrawCountrySelect() {
  const sel = document.getElementById('withdraw-country-select');
  sel.innerHTML = `<option value="">Choisis ton pays</option>` +
    COUNTRIES.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join('');
}

function onWithdrawCountryChange() {
  withdrawCountry = document.getElementById('withdraw-country-select').value || null;
  withdrawOperator = null;
  renderWithdrawOperators();
}

function renderWithdrawOperators() {
  const country = COUNTRIES.find(c => c.code === withdrawCountry);
  const el = document.getElementById('withdraw-operators');
  if (!country) { el.innerHTML = ''; return; }
  el.innerHTML = country.ops.map(op => {
    const badge = getOperatorBadge(op);
    return `
    <div class="op-card${op === withdrawOperator ? ' active' : ''}" onclick="selectWithdrawOperator('${op.replace(/'/g, "\\'")}')">
      <div class="op-icon" style="background:${badge.bg};${badge.dark ? 'color:#111' : 'color:#fff'}">${badge.label}</div>
      <span class="op-name">${op}</span>
    </div>`;
  }).join('');
}

function selectWithdrawOperator(op) {
  withdrawOperator = op;
  renderWithdrawOperators();
}

async function submitWithdrawRequest() {
  const errEl = document.getElementById('withdraw-form-error');
  errEl.classList.add('hidden');

  const amount = parseFloat(document.getElementById('withdraw-amount').value);
  let method, accountDetails;

  if (withdrawMethod === 'mobile') {
    const phone = document.getElementById('withdraw-phone').value.trim();
    const country = COUNTRIES.find(c => c.code === withdrawCountry);
    if (!withdrawCountry || !withdrawOperator || !phone) {
      errEl.textContent = "Merci de choisir ton pays, ton opérateur et ton numéro.";
      errEl.classList.remove('hidden');
      return;
    }
    method = `${withdrawOperator} (${country.name})`;
    accountDetails = phone;
  } else {
    const network = document.getElementById('withdraw-crypto-network').value;
    const address = document.getElementById('withdraw-address').value.trim();
    if (!address) {
      errEl.textContent = "Merci d'indiquer ton adresse crypto.";
      errEl.classList.remove('hidden');
      return;
    }
    const cryptoNames = { 'usdt-trc20': 'USDT (TRC20)', 'usdt-bep20': 'USDT (BEP20)', 'btc': 'Bitcoin', 'trx': 'TRON' };
    method = cryptoNames[network] || network;
    accountDetails = address;
  }

  if (isNaN(amount) || amount <= 0) {
    errEl.textContent = "Merci d'indiquer un montant valide.";
    errEl.classList.remove('hidden');
    return;
  }
  if (amount > (currentUser.balance || 0)) {
    errEl.textContent = "Ce montant dépasse ton solde disponible.";
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const newBalance = Math.round((currentUser.balance - amount) * 100) / 100;
    // On retire le montant du solde tout de suite pour eviter qu'il soit depense ailleurs
    // pendant que la demande est en attente de traitement manuel.
    await db.collection('users').doc(currentUser.uid).update({ balance: newBalance });
    currentUser.balance = newBalance;

    await db.collection('withdrawal_requests').add({
      uid: currentUser.uid,
      sellerName: currentUser.name || 'Vendeur',
      method,
      accountDetails,
      amountUSD: amount,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    document.getElementById('withdraw-modal').remove();
    loadSellerWithdrawals();
    loadSellerStats();
  } catch (e) {
    errEl.textContent = "Erreur : " + e.message;
    errEl.classList.remove('hidden');
  }
}

async function loadSellerWithdrawals() {
  const el = document.getElementById('seller-withdrawals-list');
  try {
    const snap = await db.collection('withdrawal_requests')
      .where('uid', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      el.innerHTML = '<p class="muted">Aucune demande de retrait pour l\'instant.</p>';
      return;
    }

    const statusLabels = { pending: '⏳ En attente', paid: '✅ Payé', rejected: '❌ Rejeté' };
    el.innerHTML = snap.docs.map(doc => {
      const w = doc.data();
      return `
      <div class="seller-sale-row">
        <div>
          <strong>${w.amountUSD.toFixed(2)}$</strong> — ${w.method}
          <div class="muted small">${new Date(w.createdAt).toLocaleDateString('fr-FR')} · ${statusLabels[w.status] || w.status}</div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
  }
}

async function loadSellerStats() {
  const badgeEl = document.getElementById('seller-badge-card');
  const statsEl = document.getElementById('seller-stats-grid');
  const salesEl = document.getElementById('seller-recent-sales');

  try {
    const snap = await db.collection('shop_orders')
      .where('sellerUid', '==', currentUser.uid)
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .get();

    const sales = snap.docs.map(doc => doc.data());
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.sellerPayoutUSD || 0), 0);
    const bookSales = sales.filter(s => s.itemType === 'book').length;
    const productSales = sales.filter(s => s.itemType === 'product').length;

    const tier = getSellerTier(totalSales);
    const nextTier = SELLER_TIERS.slice().reverse().find(t => t.min > totalSales);

    badgeEl.innerHTML = `
      <div class="seller-badge-card" style="border-color:${tier.color}">
        <div class="seller-badge-emoji">${tier.emoji}</div>
        <div>
          <div class="seller-badge-name" style="color:${tier.color}">Niveau ${tier.name}</div>
          <div class="muted small">${totalSales} vente${totalSales > 1 ? 's' : ''} au total
            ${nextTier ? ` · Encore ${nextTier.min - totalSales} pour atteindre ${nextTier.name} ${nextTier.emoji}` : ' · Niveau maximum atteint !'}
          </div>
        </div>
      </div>`;

    statsEl.innerHTML = `
      <div class="seller-stat-box">
        <div class="seller-stat-value">${totalRevenue.toFixed(2)}$</div>
        <div class="seller-stat-label">Revenu total (90%)</div>
      </div>
      <div class="seller-stat-box">
        <div class="seller-stat-value">${totalSales}</div>
        <div class="seller-stat-label">Ventes totales</div>
      </div>
      <div class="seller-stat-box">
        <div class="seller-stat-value">${bookSales}</div>
        <div class="seller-stat-label">📖 Livres vendus</div>
      </div>
      <div class="seller-stat-box">
        <div class="seller-stat-value">${productSales}</div>
        <div class="seller-stat-label">🛍️ Produits vendus</div>
      </div>`;

    if (sales.length === 0) {
      salesEl.innerHTML = '<p class="muted">Aucune vente pour l\'instant.</p>';
    } else {
      salesEl.innerHTML = sales.slice(0, 20).map(s => `
        <div class="seller-sale-row">
          <div>
            <strong>${s.itemTitle}</strong>
            <div class="muted small">${new Date(s.createdAt).toLocaleDateString('fr-FR')}</div>
          </div>
          <div class="seller-sale-amount">+${(s.sellerPayoutUSD || 0).toFixed(2)}$</div>
        </div>
      `).join('');
    }
  } catch (e) {
    badgeEl.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
    statsEl.innerHTML = '';
    salesEl.innerHTML = '';
  }
}

async function loadMyPublications() {
  const el = document.getElementById('seller-publications-list');
  try {
    const snap = await db.collection('publications')
      .where('sellerUid', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      el.innerHTML = '<p class="muted">Tu n\'as encore rien publié.</p>';
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const typeLabel = d.type === 'book' ? '📖' : '🛍️';
      return `
      <div class="seller-pub-row">
        <img src="${d.imageUrl}" alt="" class="seller-pub-img">
        <div class="seller-pub-info">
          <strong>${typeLabel} ${d.title}</strong>
          <div class="muted small">${(d.price || 0).toFixed(2)}$ · ❤️ ${d.likesCount || 0}</div>
        </div>
        <button class="shop-action-btn" onclick="deleteMyPublication('${doc.id}')">🗑️</button>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
  }
}

async function deleteMyPublication(pubId) {
  if (!confirm("Supprimer definitivement cette publication ?")) return;
  try {
    await db.collection('publications').doc(pubId).delete();
    loadMyPublications();
  } catch (e) {
    alert("Erreur : " + e.message);
  }
}

function setShopFilter(filter) {
  shopActiveFilter = filter;
  document.querySelectorAll('#shop-filter-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderShopFeed();
}

async function loadShopFeed() {
  const feedEl = document.getElementById('shop-feed');
  feedEl.innerHTML = '<p class="muted">Chargement...</p>';
  try {
    const snap = await db.collection('publications')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .get();

    shopFeedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    shopLikedMap = {};
    shopPurchasedSet = new Set();

    if (currentUser) {
      // Verifie en parallele les likes et les achats deja effectues (acces livres)
      const [likeChecks, ordersSnap] = await Promise.all([
        Promise.all(shopFeedItems.map(item =>
          db.collection('publication_likes').doc(`${item.id}_${currentUser.uid}`).get()
        )),
        db.collection('shop_orders')
          .where('uid', '==', currentUser.uid)
          .where('status', '==', 'completed')
          .get()
      ]);
      shopFeedItems.forEach((item, i) => { shopLikedMap[item.id] = likeChecks[i].exists; });
      ordersSnap.docs.forEach(doc => shopPurchasedSet.add(doc.data().pubId));
    }

    renderShopFeed();
  } catch (e) {
    feedEl.innerHTML = `<p class="muted">Erreur de chargement : ${e.message}</p>`;
  }
}

function renderShopFeed() {
  const feedEl = document.getElementById('shop-feed');
  const searchText = (document.getElementById('shop-search-input').value || '').trim().toLowerCase();

  let filtered = shopFeedItems;
  if (shopActiveFilter !== 'all') {
    filtered = filtered.filter(item => item.type === shopActiveFilter);
  }
  if (shopActiveCategory !== 'all') {
    filtered = filtered.filter(item => item.category === shopActiveCategory);
  }
  if (searchText) {
    filtered = filtered.filter(item =>
      (item.title || '').toLowerCase().includes(searchText) ||
      (item.description || '').toLowerCase().includes(searchText)
    );
  }

  filtered = filtered.slice(); // copie pour ne pas alterer l'ordre original de shopFeedItems
  if (shopActiveSort === 'popular') {
    filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Rejoue le fondu doux a chaque mise a jour (retire puis rajoute la classe)
  feedEl.classList.remove('fade-refresh');
  void feedEl.offsetWidth; // force le navigateur a "relire" avant de rajouter la classe
  feedEl.classList.add('fade-refresh');

  if (filtered.length === 0) {
    feedEl.innerHTML = '<p class="muted">Aucun résultat. Essaie une autre recherche.</p>';
    return;
  }

  feedEl.innerHTML = filtered.map(item =>
    renderShopCard(item, shopLikedMap[item.id], shopPurchasedSet.has(item.id))
  ).join('');
}

function getEffectivePrice(item) {
  if (item.discountPercent > 0) {
    const stillValid = !item.promoExpiresAt || new Date(item.promoExpiresAt) > new Date();
    if (stillValid) {
      return Math.round(item.price * (1 - item.discountPercent / 100) * 100) / 100;
    }
  }
  return item.price;
}

function renderShopCard(item, isLiked, isPurchased) {
  const typeLabel = item.type === 'book' ? '📖 Livre' : '🛍️ Produit';
  const alreadyOwned = item.type === 'book' && isPurchased;
  const effectivePrice = getEffectivePrice(item);
  const hasPromo = effectivePrice < item.price;

  const priceHtml = hasPromo
    ? `<div class="shop-card-price">${effectivePrice.toFixed(2)}$ <span class="shop-card-price-old">${item.price.toFixed(2)}$</span> <span class="shop-card-promo-badge">-${item.discountPercent}%</span></div>`
    : `<div class="shop-card-price">${item.price.toFixed(2)}$</div>`;

  let buyButtonHtml;
  if (alreadyOwned) {
    buyButtonHtml = `<a class="btn btn-primary btn-sm" style="margin-left:auto" href="${item.fileUrl}" target="_blank">📖 Télécharger</a>`;
  } else if (item.type === 'book') {
    buyButtonHtml = `<button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="buyShopItem('${item.id}','${escapeForJs(item.title)}',${effectivePrice},'${item.type}')" data-i18n="shop_buy">Commander</button>`;
  } else {
    const inCart = cartItems.some(c => c.id === item.id);
    buyButtonHtml = `<button class="btn ${inCart ? 'btn-outline' : 'btn-primary'} btn-sm" style="margin-left:auto" onclick="toggleCartItem('${item.id}','${escapeForJs(item.title)}',${effectivePrice},'${item.imageUrl}')">${inCart ? '✓ Dans le panier' : '🛒 Ajouter'}</button>`;
  }

  // Le bouton WhatsApp n'apparait que sur les PRODUITS (coordination livraison),
  // jamais sur les livres (achat direct + telechargement immediat suffit).
  let whatsappHtml = '';
  if (item.type === 'product' && item.sellerPhone) {
    const waMessage = encodeURIComponent(`Bonjour, je suis intéressé(e) par : ${item.title}`);
    whatsappHtml = `<a class="shop-action-btn" href="https://wa.me/${item.sellerPhone.replace(/\D/g,'')}?text=${waMessage}" target="_blank" title="Contacter le vendeur">${ICON_WHATSAPP}</a>`;
  }

  const shareHtml = `<button class="shop-action-btn" onclick="shareShopItem('${item.id}','${escapeForJs(item.title)}')" title="Partager">${ICON_SHARE}</button>`;

  const sellerLine = item.sellerName
    ? `<span class="shop-card-seller">Vendu par ${item.sellerName}</span>`
    : '';

  const categoryLabels = {
    ebooks: '📚 Livres & Ebooks', beaute: '💄 Beauté & Bien-être', mode: '👗 Mode & Accessoires',
    electronique: '🔌 Électronique', maison: '🏠 Maison & Déco', autres: '📦 Autres'
  };
  const categoryLine = item.category && categoryLabels[item.category]
    ? `<span class="shop-card-category">${categoryLabels[item.category]}</span>`
    : '';

  return `
  <div class="shop-card" id="shop-card-${item.id}">
    <img src="${item.imageUrl}" alt="${item.title}" class="shop-card-img">
    <div class="shop-card-body">
      <span class="shop-card-type">${typeLabel}${alreadyOwned ? ' · ✅ Déjà acheté' : ''}</span>
      ${categoryLine}
      <h3 class="shop-card-title">${item.title}</h3>
      ${sellerLine}
      <p class="shop-card-desc">${item.description}</p>
      ${priceHtml}

      <div class="shop-card-actions">
        <button class="shop-action-btn ${isLiked ? 'liked' : ''}" id="shop-like-${item.id}" onclick="toggleShopLike('${item.id}')">
          <span id="shop-like-icon-${item.id}">${isLiked ? '❤️' : '🤍'}</span>
          <span id="shop-like-count-${item.id}">${item.likesCount || 0}</span>
        </button>
        <button class="shop-action-btn" onclick="toggleShopComments('${item.id}')">
          💬 <span id="shop-comment-count-${item.id}">${item.commentsCount || 0}</span>
        </button>
        ${whatsappHtml}
        ${shareHtml}
        ${buyButtonHtml}
      </div>

      <div class="shop-comments hidden" id="shop-comments-${item.id}">
        <div class="shop-comments-list" id="shop-comments-list-${item.id}"><p class="muted small">Chargement des commentaires...</p></div>
        <div class="shop-comment-form">
          <input type="text" class="text-input" id="shop-comment-input-${item.id}" placeholder="Écris un commentaire...">
          <button class="btn btn-outline btn-sm" onclick="addShopComment('${item.id}')">Envoyer</button>
        </div>
      </div>
    </div>
  </div>`;
}

const ICON_WHATSAPP = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01a7.94 7.94 0 0 0 5.54-13.58zM12.06 18.4a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.65.67-2.43-.16-.25a6.58 6.58 0 0 1 10.24-8.13 6.55 6.55 0 0 1 1.94 4.66 6.6 6.6 0 0 1-6.59 6.56zm3.6-4.93c-.2-.1-1.17-.58-1.35-.64s-.32-.1-.45.1-.5.64-.62.77-.23.15-.43.05a5.4 5.4 0 0 1-1.6-.98 6 6 0 0 1-1.1-1.37c-.12-.2 0-.3.09-.4s.2-.23.3-.35.13-.2.2-.33a.36.36 0 0 0 0-.35c-.05-.1-.45-1.08-.61-1.48s-.32-.33-.45-.33h-.38a.74.74 0 0 0-.53.25 2.24 2.24 0 0 0-.7 1.67 3.9 3.9 0 0 0 .81 2.05 8.9 8.9 0 0 0 3.4 3c.48.2.85.33 1.14.42a2.74 2.74 0 0 0 1.26.08 2.07 2.07 0 0 0 1.35-.95 1.68 1.68 0 0 0 .12-.95c-.05-.08-.18-.13-.38-.23z"/></svg>`;
const ICON_SHARE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>`;

async function shareShopItem(pubId, title) {
  const shareUrl = `https://coeurnohboost.vercel.app/?produit=${pubId}`;
  const shareText = `Regarde ça sur CoeurnohBoost : ${title}`;

  if (navigator.share) {
    // Ouvre le menu de partage natif du telephone : WhatsApp, Statut, Messenger,
    // Facebook, Instagram, TikTok... tout ce qui est installe s'affiche automatiquement.
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
    } catch (e) { /* l'utilisateur a simplement annule le partage */ }
  } else {
    // Repli pour les navigateurs desktop qui n'ont pas le partage natif
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert('Lien copié ! Tu peux le coller où tu veux (WhatsApp, Facebook...).');
    } catch (e) {
      prompt('Copie ce lien :', shareUrl);
    }
  }
  notifyPublicationShared(pubId);
}

function escapeForJs(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function toggleShopLike(pubId) {
  if (!currentUser) { openAuth('register'); return; }
  const likeRef = db.collection('publication_likes').doc(`${pubId}_${currentUser.uid}`);
  const pubRef = db.collection('publications').doc(pubId);
  const iconEl = document.getElementById(`shop-like-icon-${pubId}`);
  const countEl = document.getElementById(`shop-like-count-${pubId}`);
  const btnEl = document.getElementById(`shop-like-${pubId}`);

  try {
    const likeDoc = await likeRef.get();
    if (likeDoc.exists) {
      await likeRef.delete();
      await pubRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
      iconEl.textContent = '🤍';
      btnEl.classList.remove('liked');
      countEl.textContent = Math.max(0, parseInt(countEl.textContent, 10) - 1);
    } else {
      await likeRef.set({ pubId, uid: currentUser.uid, createdAt: new Date().toISOString() });
      await pubRef.update({ likesCount: firebase.firestore.FieldValue.increment(1) });
      iconEl.textContent = '❤️';
      btnEl.classList.add('liked');
      countEl.textContent = parseInt(countEl.textContent, 10) + 1;

      // Notifie le proprietaire de la publication (sauf s'il s'est like lui-meme)
      try {
        const pubSnap = await pubRef.get();
        const pub = pubSnap.data();
        if (pub && pub.sellerUid && pub.sellerUid !== currentUser.uid) {
          const title = 'Nouveau like ❤️';
          const body = `${currentUser.name || 'Quelqu\'un'} a aimé "${pub.title || pub.description || 'ta publication'}".`;
          await db.collection('notifications').add({
            uid: pub.sellerUid, title, body, type: 'like', read: false, createdAt: new Date().toISOString()
          });
          notifyUserPush(pub.sellerUid, title, body);
        }
      } catch (e) { /* pas grave si la notification echoue */ }
    }
  } catch (e) {
    console.log('[shop] Erreur like :', e.message);
  }
}

let shopCommentsLoaded = {};
async function toggleShopComments(pubId) {
  const panel = document.getElementById(`shop-comments-${pubId}`);
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden') && !shopCommentsLoaded[pubId]) {
    shopCommentsLoaded[pubId] = true;
    await loadShopComments(pubId);
  }
}

async function loadShopComments(pubId) {
  const listEl = document.getElementById(`shop-comments-list-${pubId}`);
  try {
    const snap = await db.collection('publication_comments')
      .where('pubId', '==', pubId)
      .orderBy('createdAt', 'asc')
      .limit(50)
      .get();
    if (snap.empty) {
      listEl.innerHTML = '<p class="muted small">Aucun commentaire. Sois le premier !</p>';
      return;
    }
    listEl.innerHTML = snap.docs.map(doc => {
      const c = doc.data();
      return `<div class="shop-comment"><strong>${c.name || 'Client'}</strong><span>${c.text}</span></div>`;
    }).join('');
  } catch (e) {
    listEl.innerHTML = `<p class="muted small">Erreur de chargement : ${e.message}</p>`;
  }
}

async function addShopComment(pubId) {
  if (!currentUser) { openAuth('register'); return; }
  const input = document.getElementById(`shop-comment-input-${pubId}`);
  const text = input.value.trim();
  if (!text) return;

  try {
    await db.collection('publication_comments').add({
      pubId,
      uid: currentUser.uid,
      name: currentUser.name || 'Client',
      text,
      createdAt: new Date().toISOString()
    });
    await db.collection('publications').doc(pubId).update({
      commentsCount: firebase.firestore.FieldValue.increment(1)
    });
    input.value = '';
    shopCommentsLoaded[pubId] = false;
    await toggleShopComments(pubId); // referme
    await toggleShopComments(pubId); // rouvre avec le nouveau commentaire
    const countEl = document.getElementById(`shop-comment-count-${pubId}`);
    countEl.textContent = parseInt(countEl.textContent, 10) + 1;

    // Notifie le proprietaire de la publication (sauf s'il a commente lui-meme)
    try {
      const pubSnap = await db.collection('publications').doc(pubId).get();
      const pub = pubSnap.data();
      if (pub && pub.sellerUid && pub.sellerUid !== currentUser.uid) {
        const title = 'Nouveau commentaire 💬';
        const body = `${currentUser.name || 'Quelqu\'un'} a commenté "${pub.title || pub.description || 'ta publication'}" : "${text.slice(0, 60)}"`;
        await db.collection('notifications').add({
          uid: pub.sellerUid, title, body, type: 'comment', read: false, createdAt: new Date().toISOString()
        });
        notifyUserPush(pub.sellerUid, title, body);
      }
    } catch (e) { /* pas grave si la notification echoue */ }
  } catch (e) {
    alert("Erreur lors de l'envoi du commentaire : " + e.message);
  }
}

/* ================= PAIEMENT BOUTIQUE (par article, via solde portefeuille) ================= */
function buyShopItem(pubId, title, price, itemType) {
  if (!currentUser) { openAuth('register'); return; }

  const modalHtml = `
    <div class="modal-overlay" id="shop-checkout-modal">
      <div class="modal">
        <button class="modal-close" onclick="closeShopCheckout()">×</button>
        <h2>🛍️ ${title}</h2>
        <p class="sub">Prix : <strong>${price.toFixed(2)}$</strong> — Ton solde : <strong>${(currentUser.balance || 0).toFixed(2)}$</strong></p>
        <div class="modal-error hidden" id="shop-checkout-error"></div>
        <div class="hidden" id="shop-checkout-success">
          <div class="tutorial-emoji">✅</div>
          <p class="sub" style="text-align:center;font-weight:700;color:var(--green)">Achat confirmé !</p>
          <div id="shop-checkout-download"></div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:14px" id="shop-checkout-submit" onclick="confirmShopPurchase('${pubId}','${escapeForJs(title)}',${price},'${itemType}')">Confirmer l'achat (${price.toFixed(2)}$)</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeShopCheckout() {
  const modal = document.getElementById('shop-checkout-modal');
  if (modal) modal.remove();
}

async function confirmShopPurchase(pubId, title, price, itemType) {
  const errEl = document.getElementById('shop-checkout-error');
  errEl.classList.add('hidden');

  if (price > (currentUser.balance || 0)) {
    errEl.textContent = "Solde insuffisant. Recharge ton portefeuille pour continuer.";
    errEl.classList.remove('hidden');
    return;
  }

  document.getElementById('shop-checkout-submit').classList.add('hidden');

  try {
    const response = await fetch('/api/shop-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUser.uid, pubId })
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erreur lors de l'achat");
    }

    currentUser.balance = data.newBalance;
    document.getElementById('shop-checkout-success').classList.remove('hidden');

    if (itemType === 'book') {
      shopPurchasedSet.add(pubId);
      if (data.fileUrl) {
        document.getElementById('shop-checkout-download').innerHTML =
          `<a class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px" href="${data.fileUrl}" target="_blank">📖 Télécharger le livre</a>`;
      }
      renderShopFeed(); // le bouton "Commander" de la carte devient "Télécharger"
    } else {
      document.getElementById('shop-checkout-download').innerHTML =
        `<p class="muted" style="text-align:center;margin-top:10px">Achat confirmé ! Utilise le bouton WhatsApp sur l'article pour coordonner la livraison avec le vendeur.</p>`;
    }
  } catch (e) {
    document.getElementById('shop-checkout-submit').classList.remove('hidden');
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

/* ================= NOTIFICATIONS PUSH (alertes reelles, meme app fermee) ================= */
async function registerPushNotifications() {
  if (!currentUser) return;
  try {
    if (!('Notification' in window) || !firebase.messaging) {
      console.log('[push] Notifications non supportees sur ce navigateur');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log("[push] Permission refusee par l'utilisateur");
      return;
    }

    const messaging = firebase.messaging();
    // IMPORTANT : on lie explicitement le jeton au service worker /sw.js deja
    // enregistre (qui gere onBackgroundMessage). Sans ce lien, Firebase tente
    // d'utiliser /firebase-messaging-sw.js par defaut (qui n'existe pas chez
    // nous) et les notifications ne peuvent jamais arriver app fermee.
    const swReg = await navigator.serviceWorker.ready;
    const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: swReg });

    if (token) {
      await db.collection('users').doc(currentUser.uid).update({ fcmToken: token });
      console.log('[push] Jeton enregistre avec succes');
    }

    // Reception d'une notification pendant que l'app est ouverte au premier plan
    messaging.onMessage((payload) => {
      const title = (payload.notification && payload.notification.title) || 'CoeurnohBoost';
      const body = (payload.notification && payload.notification.body) || '';
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
      playNotifSound();
      updateNotifBadge();
    });
  } catch (e) {
    console.log('[push] Erreur configuration :', e.message);
  }
}

// Petit bip genere directement (pas besoin de fichier audio) pour signaler
// une notification recue pendant que l'app est ouverte au premier plan.
// Quand l'app est fermee/en arriere-plan, c'est la sonnerie native du
// telephone (geree par le systeme via sw.js) qui joue, comme les autres apps.
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) { /* pas grave si le navigateur bloque l'audio */ }
}

/* ================= HELPERS D'ENVOI DE PUSH REEL (serveur) ================= */
// Notifie UN utilisateur precis (like, commentaire, partage...).
async function notifyUserPush(uid, title, body) {
  if (!currentUser || !uid) return;
  try {
    await fetch('/api/notify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUid: currentUser.uid, uid, title, body })
    });
  } catch (e) { /* pas grave si le push echoue, la notif Firestore reste visible dans l'app */ }
}

// Notifie TOUT LE MONDE (nouvelle publication, produit, promo...).
async function broadcastPush(title, body) {
  if (!currentUser) return;
  try {
    await fetch('/api/broadcast-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUid: currentUser.uid, excludeUid: currentUser.uid, title, body })
    });
  } catch (e) { /* pas grave si le push echoue, l'annonce reste visible dans le panneau */ }
}

/* ================= NOTIFICATIONS ================= */
let notifUnsubscribe = null;
let announcementsUnsubscribe = null;
let notifCache = [];
let announcementsCache = [];

function startNotifWatch() {
  if (notifUnsubscribe) return; // deja actif
  notifUnsubscribe = db.collection('notifications')
    .where('uid', '==', currentUser.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snap) => {
      notifCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateNotifBadge();
      if (!document.getElementById('notif-panel').classList.contains('hidden')) {
        renderNotifPanel();
      }
    }, (err) => console.log('[notif] Erreur suivi notifications :', err.message));

  // Suivi EN DIRECT des annonces publiques (nouvelles publications, promos...)
  // pour que le badge monte des qu'une annonce arrive, meme sans ouvrir le panneau.
  if (!announcementsUnsubscribe) {
    announcementsUnsubscribe = db.collection('announcements')
      .orderBy('createdAt', 'desc')
      .limit(15)
      .onSnapshot((snap) => {
        announcementsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateNotifBadge();
        if (!document.getElementById('notif-panel').classList.contains('hidden')) {
          renderNotifPanel();
        }
      }, (err) => console.log('[notif] Erreur suivi annonces :', err.message));
  }
}

function stopNotifWatch() {
  if (notifUnsubscribe) { notifUnsubscribe(); notifUnsubscribe = null; }
  if (announcementsUnsubscribe) { announcementsUnsubscribe(); announcementsUnsubscribe = null; }
  notifCache = [];
  announcementsCache = [];
}

// Les annonces sont publiques (pas de champ "read" par utilisateur), donc on
// retient juste la date de la derniere annonce vue par CE telephone.
function getLastSeenAnnouncementAt() {
  return localStorage.getItem('lastSeenAnnouncementAt') || '1970-01-01T00:00:00.000Z';
}

function updateNotifBadge() {
  const lastSeen = getLastSeenAnnouncementAt();
  const unreadPersonal = notifCache.filter(n => !n.read).length;
  const unreadAnnouncements = announcementsCache.filter(a => a.createdAt > lastSeen).length;
  const unreadCount = unreadPersonal + unreadAnnouncements;
  const badge = document.getElementById('notif-badge-bnav');
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function toggleNotifPanelContent() {
  renderNotifPanel();

  // Marque toutes les notifications personnelles non lues comme lues
  const unread = notifCache.filter(n => !n.read);
  if (unread.length > 0) {
    try {
      const batch = db.batch();
      unread.forEach(n => batch.update(db.collection('notifications').doc(n.id), { read: true }));
      await batch.commit();
    } catch (e) { /* pas grave si ca echoue, ce n'est pas critique */ }
  }

  // Marque les annonces publiques comme vues par ce telephone (pour le badge)
  if (announcementsCache.length > 0) {
    localStorage.setItem('lastSeenAnnouncementAt', announcementsCache[0].createdAt);
  }
  updateNotifBadge();

  // Efface la pastille sur l'icone de l'app une fois tout consulte
  if ('clearAppBadge' in navigator) {
    try { navigator.clearAppBadge(); } catch (e) { /* pas grave */ }
  }
}

function renderNotifPanel() {
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;
  // Fusionne notifications personnelles + annonces publiques, triees par date
  const merged = [
    ...notifCache.map(n => ({ ...n, isAnnouncement: false })),
    ...announcementsCache.map(a => ({ ...a, isAnnouncement: true }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);

  if (merged.length === 0) {
    listEl.innerHTML = '<p class="muted small" style="padding:16px">Aucune notification pour l\'instant.</p>';
    return;
  }

  const typeIcons = {
    recharge: '💰', purchase: '🛒', sale: '🎉', like: '❤️', comment: '💬',
    share: '🔗', order: '📦', announcement: '📢', admin_message: '📢'
  };

  const lastSeen = getLastSeenAnnouncementAt();
  listEl.innerHTML = merged.map(n => `
    <div class="notif-row ${(!n.isAnnouncement && !n.read) || (n.isAnnouncement && n.createdAt > lastSeen) ? 'unread' : ''}">
      <span class="notif-icon">${typeIcons[n.type] || '🔔'}</span>
      <div class="notif-content">
        <strong>${n.title}</strong>
        <p>${n.body}</p>
        <span class="notif-time">${timeAgo(n.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

function timeAgo(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}
