/* =========================================================
   FIREBASE CONFIG — remplace par la config de ton projet
   "coeurnoh-business" (Console Firebase > Paramètres du projet)
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAK9j8lmKlxp267bfwKegKgW54fo_jrS9E",
  authDomain: "coeurnohboost.firebaseapp.com",
  projectId: "coeurnohboost",
  storageBucket: "coeurnohboost.firebasestorage.app",
  messagingSenderId: "295783149587",
  appId: "1:295783149587:web:13aec67a2ae0109eaa4fe6"
};
let fbReady = false;
try { firebase.initializeApp(firebaseConfig); fbReady = true; }
catch(e){ console.warn("Firebase non configuré :", e.message); }
const auth = fbReady ? firebase.auth() : null;
const db = fbReady ? firebase.firestore() : null;

// Remplace par ton propre UID Firebase une fois connecté (pour débloquer /admin.html)
const ADMIN_UID = "REPLACE_WITH_YOUR_UID";

/* =========================================================
   CATALOGUE — 15 plateformes, prix pour 1000 unités
   (quantité libre calculée au prorata, prix ajustables via admin.html)
   ========================================================= */
const DEFAULT_CATALOG = {
  TikTok: [
    {name:"Followers réels", desc:"Croissance progressive, comptes actifs", price1k:4, min:50, elite:true},
    {name:"Vues vidéo", desc:"Livraison rapide 12-24h", price1k:1.5, min:100},
    {name:"Likes", desc:"Boost d'engagement instantané", price1k:1.5, min:50},
    {name:"Commentaires réels", desc:"Commentaires positifs variés", price1k:8, min:10, elite:true},
    {name:"Partages", desc:"Amplifie la portée organique", price1k:3, min:50},
  ],
  Instagram: [
    {name:"Followers réels", desc:"Comptes actifs, rétention garantie", price1k:5, min:50, elite:true},
    {name:"Likes", desc:"Livraison en quelques heures", price1k:1.5, min:50},
    {name:"Vues Reels/Stories", desc:"Boost algorithme", price1k:1.5, min:100},
    {name:"Commentaires réels", desc:"Commentaires positifs variés", price1k:8, min:10, elite:true},
  ],
  YouTube: [
    {name:"Vues", desc:"Rétention correcte, sources variées", price1k:6, min:100},
    {name:"Abonnés réels", desc:"Comptes actifs et stables", price1k:8, min:50, elite:true},
    {name:"Likes vidéo", desc:"Renforce le taux d'engagement", price1k:2.5, min:50},
    {name:"Commentaires réels", desc:"Commentaires positifs variés", price1k:9, min:10, elite:true},
  ],
  Facebook: [
    {name:"Likes Page", desc:"Croissance progressive", price1k:2.5, min:50},
    {name:"Followers profil/page", desc:"Comptes réels", price1k:3.5, min:50},
    {name:"Vues vidéo", desc:"Boost de portée", price1k:1.5, min:100},
    {name:"Commentaires réels", desc:"Commentaires positifs variés", price1k:8, min:10, elite:true},
    {name:"Partages", desc:"Amplifie la portée organique", price1k:3, min:50},
  ],
  Spotify: [
    {name:"Écoutes (Plays)", desc:"Répartition naturelle sur tes titres", price1k:3, min:100, elite:true},
    {name:"Auditeurs mensuels", desc:"Renforce ton profil artiste", price1k:6, min:50},
    {name:"Followers artiste", desc:"Croissance progressive", price1k:4, min:50},
  ],
  Shazam: [
    {name:"Reconnaissances (Shazams)", desc:"Booste la découverte de ton titre", price1k:5, min:50, elite:true},
  ],
  Pinterest: [
    {name:"Followers", desc:"Comptes actifs", price1k:3, min:50},
    {name:"Enregistrements (Saves)", desc:"Booste la portée de tes épingles", price1k:2.5, min:100},
    {name:"Vues", desc:"Visibilité accrue", price1k:1.5, min:100},
  ],
  Telegram: [
    {name:"Membres groupe/chaîne", desc:"Comptes réels", price1k:4, min:50},
    {name:"Vues de publication", desc:"Boost de portée", price1k:1.5, min:100},
  ],
  WhatsApp: [
    {name:"Membres groupe (via lien)", desc:"Croissance progressive", price1k:5, min:20},
    {name:"Vues de statut", desc:"Boost de visibilité", price1k:3, min:50},
  ],
  Snapchat: [
    {name:"Followers", desc:"Comptes actifs", price1k:4, min:50},
    {name:"Vues Snap", desc:"Boost de visibilité", price1k:2, min:100},
  ],
  X: [
    {name:"Followers", desc:"Comptes actifs", price1k:5, min:50, elite:true},
    {name:"Likes", desc:"Boost d'engagement", price1k:2, min:50},
    {name:"Retweets", desc:"Amplifie la portée", price1k:3, min:50},
    {name:"Vues", desc:"Visibilité accrue", price1k:1.5, min:100},
  ],
  LinkedIn: [
    {name:"Followers", desc:"Profil ou page entreprise", price1k:6, min:50, elite:true},
    {name:"Vues de publication", desc:"Boost professionnel", price1k:3, min:100},
    {name:"Réactions", desc:"Renforce l'engagement", price1k:3, min:50},
  ],
  SoundCloud: [
    {name:"Écoutes", desc:"Répartition naturelle", price1k:2, min:100},
    {name:"Followers", desc:"Croissance progressive", price1k:4, min:50},
    {name:"Likes", desc:"Boost d'engagement", price1k:2, min:50},
  ],
  "Apple Music": [
    {name:"Écoutes", desc:"Répartition naturelle sur tes titres", price1k:4, min:100, elite:true},
  ],
  Audiomack: [
    {name:"Écoutes", desc:"Répartition naturelle", price1k:2.5, min:100},
    {name:"Followers", desc:"Croissance progressive", price1k:3.5, min:50},
  ],
};

// Charge un catalogue personnalisé (modifié via admin.html) si présent, sinon les valeurs par défaut
let CATALOG = JSON.parse(JSON.stringify(DEFAULT_CATALOG));

const MONETIZATION_PACKS = [
  {name:"Pack Monétisation YouTube", desc:"4000h de watch time + 1000 abonnés — seuil Partner Program", price:150},
  {name:"Pack Monétisation TikTok", desc:"Vues + followers ciblés pour atteindre le seuil Creator Rewards", price:75},
  {name:"Pack Créateur Instagram", desc:"Followers + engagement pour candidater aux bonus créateurs", price:60},
  {name:"Pack Artiste Spotify/Audiomack", desc:"Écoutes + auditeurs pour renforcer ton profil artiste", price:65},
];

/* =========================================================
   LANGUE
   ========================================================= */
let currentLang = detectLang();

function t(key){ return (I18N[currentLang] && I18N[currentLang][key]) || I18N.fr[key] || key; }

function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById('lang-current').textContent = currentLang.toUpperCase();
  renderTabs(); renderServices(); renderMonetization();
  renderAppNavLabels();
}
function setLang(lang){
  currentLang = lang;
  document.getElementById('lang-menu').classList.add('hidden');
  applyTranslations();
  if(currentUser && db) db.collection('users').doc(currentUser.uid).update({lang}).catch(()=>{});
}
function toggleLangMenu(){ document.getElementById('lang-menu').classList.toggle('hidden'); }
function renderAppNavLabels(){
  const map = {accueil:'app_home',commande:'app_order',activites:'app_activity',portefeuille:'app_wallet',compte:'app_account'};
  document.querySelectorAll('.app-nav-item').forEach(item=>{
    const key = map[item.dataset.view];
    if(key){ const lbl = item.querySelector('.nav-label'); if(lbl) lbl.textContent = t(key); }
  });
}

/* =========================================================
   RENDER CATALOGUE
   ========================================================= */
let currentTab = "TikTok";

function renderTabs(){
  ['svc-tabs','dash-tabs'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = Object.keys(CATALOG).map(k =>
      `<button class="tab ${k===currentTab?'active':''}" onclick="switchTab('${k}','${id}')">${k}</button>`
    ).join('');
  });
}
function switchTab(tab, from){
  currentTab = tab; renderTabs(); renderServices();
  if(from==='dash-tabs') populateDashServiceSelect(tab, null);
}

function renderServices(){
  const grid = document.getElementById('svc-grid');
  if(!grid) return;
  grid.innerHTML = CATALOG[currentTab].map(s => {
    const priceFor500 = (s.price1k * 0.5).toFixed(2);
    return `
    <div class="svc-card ${s.elite?'elite':''}">
      <span class="tag">${currentTab}${s.elite? ' · Élite':''}</span>
      <h3>${s.name}</h3>
      <p class="desc">${s.desc}</p>
      <div class="price-row">
        <span class="price">${priceFor500}$</span>
        <span class="unit">/ 500 · min. ${s.min}</span>
      </div>
      <button onclick="requireLoginThenOrder('${currentTab}',${JSON.stringify(s.name)})">${t('order_btn')}</button>
    </div>`;
  }).join('');
}

function renderMonetization(){
  const el = document.getElementById('mon-grid');
  if(!el) return;
  el.innerHTML = MONETIZATION_PACKS.map(p => `
    <div class="mon-card">
      <span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--gold);font-weight:700">${t('mon_eyebrow')}</span>
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      <div class="price">${p.price}$</div>
      <button onclick="requireLoginThenOrder('Monétisation',${JSON.stringify(p.name)})">${t('order_btn')}</button>
    </div>
  `).join('');
}

function requireLoginThenOrder(platform, service){
  if(!currentUser){ openAuth('login'); return; }
  enterApp(); switchAppView('commande'); populateDashServiceSelect(platform, service);
}

/* =========================================================
   NAVIGATION APP SHELL
   ========================================================= */
function enterApp(){
  document.getElementById('public-nav').classList.add('hidden');
  document.getElementById('view-public').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
}
function exitApp(){
  document.getElementById('public-nav').classList.remove('hidden');
  document.getElementById('view-public').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}
function switchAppView(view){
  document.querySelectorAll('.app-view').forEach(v=>v.classList.add('hidden'));
  document.getElementById('app-'+view).classList.remove('hidden');
  document.querySelectorAll('.app-nav-item').forEach(i=>i.classList.toggle('active', i.dataset.view===view));
  const titles = {accueil:t('app_home'),commande:t('app_order'),activites:t('app_activity'),portefeuille:t('app_wallet'),compte:t('app_account')};
  document.getElementById('app-view-title').textContent = titles[view];
  if(view==='commande'){ renderTabs(); if(!document.getElementById('d-service').value) populateDashServiceSelect(currentTab, null); }
  if(view==='activites') loadOrders();
}

/* =========================================================
   AUTH (Email + Google)
   ========================================================= */
let currentUser = null;
let authMode = 'register';

function openAuth(mode){ authMode = mode; updateAuthModalMode(); document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuth(){ document.getElementById('auth-modal').classList.add('hidden'); }
function toggleAuthMode(){ authMode = authMode==='register' ? 'login' : 'register'; updateAuthModalMode(); }
function updateAuthModalMode(){
  const isReg = authMode==='register';
  document.getElementById('auth-title').textContent = isReg ? 'Créer un compte' : 'Se connecter';
  document.getElementById('auth-name-field').classList.toggle('hidden', !isReg);
  document.getElementById('auth-submit').textContent = isReg ? 'Créer mon compte' : 'Se connecter';
  document.getElementById('auth-switch-text').textContent = isReg ? 'Déjà un compte ?' : 'Pas encore de compte ?';
  document.getElementById('auth-switch-btn').textContent = isReg ? 'Se connecter' : "S'inscrire";
  document.getElementById('auth-error').classList.add('hidden');
}
function showAuthError(msg){ const el=document.getElementById('auth-error'); el.textContent=msg; el.classList.remove('hidden'); }

async function submitAuth(){
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  if(!fbReady){ showAuthError("Connecte d'abord ce site à ton projet Firebase (voir firebaseConfig dans script.js)."); return; }
  if(!email || !password){ showAuthError("Email et mot de passe requis."); return; }
  try{
    if(authMode==='register'){
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({name: name || email.split('@')[0], email, balance: 0, lang: currentLang, createdAt: new Date().toISOString()});
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    closeAuth();
  } catch(e){ showAuthError(e.message); }
}

// Connexion Google — le sélecteur natif du navigateur/téléphone propose
// directement les comptes déjà connectés sur l'appareil.
async function signInWithGoogle(){
  if(!fbReady){ showAuthError("Connecte d'abord ce site à ton projet Firebase."); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  try{
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const ref = db.collection('users').doc(user.uid);
    const doc = await ref.get();
    if(!doc.exists){
      await ref.set({name:user.displayName || user.email.split('@')[0], email:user.email, balance:0, lang:currentLang, createdAt:new Date().toISOString()});
    }
    closeAuth();
  } catch(e){ showAuthError(e.message); }
}

function logout(){ if(fbReady) auth.signOut(); exitApp(); }

if(fbReady){
  auth.onAuthStateChanged(async (user) => {
    if(user){
      const doc = await db.collection('users').doc(user.uid).get();
      const data = doc.exists ? doc.data() : {name:user.email, email:user.email, balance:0, lang:'fr', createdAt:new Date().toISOString()};
      currentUser = {uid:user.uid, ...data};
      if(data.lang) { currentLang = data.lang; }
      enterApp();
      document.getElementById('dash-username').textContent = currentUser.name;
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
      document.getElementById('profile-since').textContent = new Date(currentUser.createdAt).toLocaleDateString('fr-FR');
      const langSelect = document.getElementById('profile-lang');
      if(langSelect) langSelect.value = currentLang;
      updateBalanceDisplays();
      applyTranslations();
      switchAppView('accueil');
      loadOrders();
    } else {
      currentUser = null;
    }
  });
}

function updateProfileLang(lang){ setLang(lang); }

function updateBalanceDisplays(){
  const bal = (currentUser?.balance || 0).toFixed(2);
  const navBal = document.getElementById('nav-balance'); if(navBal) navBal.textContent = bal + '$';
  const dashBal = document.getElementById('dash-balance'); if(dashBal) dashBal.textContent = bal + '$';
  const dashBal2 = document.getElementById('dash-balance-2'); if(dashBal2) dashBal2.textContent = bal + '$';
}

/* =========================================================
   DEPOSIT — structure prête pour une vraie API de paiement
   (Flutterwave / PayChangu / Chapa). Remplace PUBLIC_KEY / logique
   d'appel par l'intégration réelle une fois ton compte marchand créé.
   ========================================================= */
const PAYMENT_PUBLIC_KEY = "REPLACE_WITH_YOUR_PUBLIC_KEY"; // ex: Flutterwave/PayChangu

let selectedNetwork = null;
function selectNetwork(el){
  document.querySelectorAll('.pay-opt').forEach(o=>o.classList.remove('selected'));
  el.classList.add('selected'); selectedNetwork = el.dataset.net;
}

// Fonction "stub" représentant l'appel à l'API de paiement.
// À remplacer par le vrai SDK/API une fois le compte marchand actif.
async function callPaymentGateway({amount, phone, network}){
  console.log("[stub] Appel API paiement :", {amount, phone, network, publicKey: PAYMENT_PUBLIC_KEY});
  // return await fetch("https://api.ton-agregateur.com/charge", {...})
  return {success:false, reason:"Aucune passerelle de paiement réelle connectée pour le moment."};
}

async function submitDeposit(){
  if(!currentUser){ openAuth('login'); return; }
  if(!selectedNetwork){ alert("Choisis un réseau mobile money."); return; }
  const amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
  const phone = document.getElementById('deposit-phone').value.trim();
  if(amount <= 0 || !phone){ alert("Renseigne un montant et un numéro valides."); return; }

  await db.collection('deposits').add({uid: currentUser.uid, amount, network: selectedNetwork, phone, status: 'pending', createdAt: new Date().toISOString()});
  const result = await callPaymentGateway({amount, phone, network:selectedNetwork});
  if(result.success){
    alert("Paiement confirmé, ton solde a été crédité.");
  } else {
    alert("Demande de recharge enregistrée (" + amount + "$ via " + selectedNetwork + "). Une fois ta passerelle de paiement connectée, le solde se créditera automatiquement ; pour l'instant, confirme avec le support si besoin.");
  }
}

/* =========================================================
   ORDERS — quantité libre au prorata du prix/1000
   ========================================================= */
function populateDashServiceSelect(platform, serviceName){
  const select = document.getElementById('d-service');
  select.innerHTML = '';
  Object.entries(CATALOG).forEach(([plat, services]) => {
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({platform:plat, name:s.name, price1k:s.price1k, min:s.min});
      opt.textContent = `${plat} — ${s.name} (${s.price1k}$ / 1000)`;
      if(plat===platform && (!serviceName || s.name===serviceName)) opt.selected = true;
      select.appendChild(opt);
    });
  });
  updateOrderCost();
}
document.addEventListener('input', (e)=>{ if(e.target.id==='d-qty') updateOrderCost(); });
document.addEventListener('change', (e)=>{ if(e.target.id==='d-service') updateOrderCost(); });
function updateOrderCost(){
  const select = document.getElementById('d-service');
  if(!select || !select.value) return;
  const svc = JSON.parse(select.value);
  const qty = Math.max(svc.min||10, parseInt(document.getElementById('d-qty').value) || svc.min || 10);
  document.getElementById('d-cost').textContent = (svc.price1k * (qty/1000)).toFixed(2) + '$';
}

async function placeOrder(){
  const msgEl = document.getElementById('order-msg');
  if(!currentUser){ openAuth('login'); return; }
  const select = document.getElementById('d-service');
  if(!select.value){ msgEl.textContent = "Choisis un service."; msgEl.style.color='var(--red)'; return; }
  const svc = JSON.parse(select.value);
  const qty = Math.max(svc.min||10, parseInt(document.getElementById('d-qty').value) || svc.min || 10);
  const link = document.getElementById('d-link').value.trim();
  const cost = svc.price1k * (qty/1000);

  if(!link){ msgEl.textContent = "Ajoute le lien du profil/publication."; msgEl.style.color='var(--red)'; return; }
  if(cost > (currentUser.balance||0)){ msgEl.textContent = "Solde insuffisant — recharge ton portefeuille."; msgEl.style.color='var(--red)'; return; }

  const newBalance = currentUser.balance - cost;
  await db.collection('users').doc(currentUser.uid).update({balance:newBalance});
  currentUser.balance = newBalance;
  updateBalanceDisplays();

  await db.collection('orders').add({uid: currentUser.uid, platform: svc.platform, service: svc.name, qty, link, amount: cost, status: 'pending', createdAt: new Date().toISOString()});

  msgEl.textContent = "Commande envoyée ! Suivi disponible dans Activités.";
  msgEl.style.color = 'var(--green)';
  document.getElementById('d-link').value = '';
  loadOrders();
}

async function loadOrders(){
  if(!currentUser || !db) return;
  const snap = await db.collection('orders').where('uid','==',currentUser.uid).orderBy('createdAt','desc').limit(20).get();
  const tbody = document.getElementById('orders-table');
  if(snap.empty){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Aucune commande pour le moment</td></tr>';
    document.getElementById('dash-order-count').textContent = '0';
    return;
  }
  document.getElementById('dash-order-count').textContent = snap.size;
  tbody.innerHTML = snap.docs.map(d => {
    const o = d.data();
    const date = new Date(o.createdAt).toLocaleDateString('fr-FR');
    return `<tr><td>${date}</td><td>${o.platform} — ${o.service}</td><td>${o.qty}</td><td>${o.amount.toFixed(2)}$</td><td><span class="status ${o.status==='done'?'done':'pending'}">${o.status==='done'?'Livré':'En cours'}</span></td></tr>`;
  }).join('');
}

/* =========================================================
   SUPPORT — messages rapides + formulaire de contact
   ========================================================= */
function contactSupport(prefilledMessage){
  const base = "https://wa.me/243825001290?text=";
  const text = prefilledMessage ? prefilledMessage : "Bonjour, j'ai une question concernant mon compte Coeurnoh Boost.";
  window.open(base + encodeURIComponent(text), '_blank');
}

function submitContactForm(){
  const name = document.getElementById('contact-name').value.trim();
  const subject = document.getElementById('contact-subject').value.trim();
  const message = document.getElementById('contact-message').value.trim();
  if(!name || !message){ alert("Merci de remplir au moins ton nom et ton message."); return; }
  contactSupport(`Nom: ${name}\nSujet: ${subject}\nMessage: ${message}`);
}

/* =========================================================
   VIEWS PUBLIQUES (légal / à propos)
   ========================================================= */
function showPublicPage(id){
  document.querySelectorAll('.public-page').forEach(p=>p.classList.add('hidden'));
  document.getElementById('view-public-home').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo({top:0});
}
function showPublicHome(){
  document.querySelectorAll('.public-page').forEach(p=>p.classList.add('hidden'));
  document.getElementById('view-public-home').classList.remove('hidden');
}

/* =========================================================
   OVERRIDES DE PRIX — chargés depuis Firestore si admin.html
   a été utilisé pour ajuster les tarifs (marge personnalisée).
   ========================================================= */
async function loadCatalogOverrides(){
  if(!db) return;
  try{
    const doc = await db.collection('settings').doc('pricing').get();
    if(doc.exists){
      const overrides = doc.data();
      Object.keys(overrides).forEach(platform => {
        if(!CATALOG[platform]) return;
        overrides[platform].forEach(o => {
          const svc = CATALOG[platform].find(s => s.name === o.name);
          if(svc) svc.price1k = o.price1k;
        });
      });
      renderServices();
    }
  } catch(e){ console.warn("Pas de tarifs personnalisés trouvés :", e.message); }
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  loadCatalogOverrides();
});
