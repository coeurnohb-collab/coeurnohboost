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
}
function showHome() {
  hideAllViews();
  document.getElementById('view-home').classList.remove('hidden');
}
function showDashboard() {
  hideAllViews();
  document.getElementById('view-dashboard').classList.remove('hidden');
  showDashTab('home');
}
function showDashTab(tab) {
  document.querySelectorAll('.dash-tab').forEach(el => el.classList.add('hidden'));
  document.getElementById('dash-tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.bnav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('bnav-' + tab).classList.add('active');
  if (tab === 'orders') loadOrders();
  if (tab === 'home') renderFAQ();
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
}
function renderLoggedInNav(uid) {
  document.getElementById('nav-login-btn').classList.add('hidden');
  document.getElementById('nav-register-btn').classList.add('hidden');
  document.getElementById('nav-dashboard-btn').classList.remove('hidden');
  document.getElementById('admin-shortcut-btn').classList.toggle('hidden', uid !== ADMIN_UID);
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
      document.getElementById('dash-balance').textContent = (currentUser.balance || 0).toFixed(2) + '$';
      document.getElementById('wallet-balance').textContent = (currentUser.balance || 0).toFixed(2) + '$';
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
      document.getElementById('profile-since').textContent = currentUser.createdAt
        ? new Date(currentUser.createdAt).toLocaleDateString('fr-FR')
        : '—';
      document.getElementById('profile-loyalty').textContent = currentUser.loyaltyPoints || 0;

      showDashboard();
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
});

/* ================= TUTORIEL / GUIDE D'UTILISATION ================= */
let tutorialCurrentStep = 0;
const TUTORIAL_SEEN_KEY = 'coeurnohboost_tutorial_seen';

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
function showShop() {
  hideAllViews();
  document.getElementById('view-shop').classList.remove('hidden');
  loadShopFeed();
}

async function loadShopFeed() {
  const feedEl = document.getElementById('shop-feed');
  feedEl.innerHTML = '<p class="muted">Chargement...</p>';
  try {
    const snap = await db.collection('publications')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      feedEl.innerHTML = '<p class="muted">Aucune publication pour l\'instant. Reviens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    