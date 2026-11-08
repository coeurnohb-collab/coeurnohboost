/* =====================================================================
   login-pro.js — Moyens de connexion supplémentaires (Coeurnoh Universe)
   Chargé par menu-pro.js APRÈS script.js et auth-guard.js. N'écrase rien :
   il ajoute des boutons à l'écran de connexion et enveloppe quelques
   fonctions existantes (openAuth, closeAuth, setAuthLoading, fillAccountForm).

   Ce que ça ajoute (chaque moyen s'active depuis l'admin, onglet Utilisateurs) :
   • Apple (compte iCloud / Apple ID)           → pour les iPhone
   • Numéro de téléphone + code SMS             → pour ceux qui n'ont pas d'e-mail
   • Facebook, Microsoft                        → en option
   Google et e-mail + mot de passe restent TOUJOURS disponibles.

   Sécurité : reCAPTCHA invisible à chaque envoi de SMS, 60 s d'attente entre
   deux codes, 5 codes maximum par heure et par appareil, code à 6 chiffres à
   usage unique (géré par Firebase), confirmation d'identité avant de supprimer
   le compte. L'état des interrupteurs est lu dans Firestore : pricing/auth_methods
   (même collection publique que les prix : aucune règle à changer).
   ===================================================================== */
(function () {
  'use strict';

  /* =================================================================
     1. FONCTIONS PURES (testées dans tests/login-pro.test.js)
     ================================================================= */

  // [code pays ISO, indicatif, nom anglais de secours]. Les noms affichés viennent d'Intl.DisplayNames dans la langue de l'app.
  var COUNTRIES = [
    ['DZ', '213', 'Algeria'], ['AO', '244', 'Angola'], ['BJ', '229', 'Benin'], ['BW', '267', 'Botswana'], ['BF', '226', 'Burkina Faso'],
    ['BI', '257', 'Burundi'], ['CV', '238', 'Cabo Verde'], ['CM', '237', 'Cameroon'], ['CF', '236', 'Central African Republic'], ['TD', '235', 'Chad'],
    ['KM', '269', 'Comoros'], ['CG', '242', 'Congo (Brazzaville)'], ['CD', '243', 'DR Congo'], ['CI', '225', "Côte d'Ivoire"], ['DJ', '253', 'Djibouti'],
    ['EG', '20', 'Egypt'], ['GQ', '240', 'Equatorial Guinea'], ['ER', '291', 'Eritrea'], ['SZ', '268', 'Eswatini'], ['ET', '251', 'Ethiopia'],
    ['GA', '241', 'Gabon'], ['GM', '220', 'Gambia'], ['GH', '233', 'Ghana'], ['GN', '224', 'Guinea'], ['GW', '245', 'Guinea-Bissau'],
    ['KE', '254', 'Kenya'], ['LS', '266', 'Lesotho'], ['LR', '231', 'Liberia'], ['LY', '218', 'Libya'], ['MG', '261', 'Madagascar'],
    ['MW', '265', 'Malawi'], ['ML', '223', 'Mali'], ['MR', '222', 'Mauritania'], ['MU', '230', 'Mauritius'], ['MA', '212', 'Morocco'],
    ['MZ', '258', 'Mozambique'], ['NA', '264', 'Namibia'], ['NE', '227', 'Niger'], ['NG', '234', 'Nigeria'], ['RW', '250', 'Rwanda'],
    ['ST', '239', 'São Tomé and Príncipe'], ['SN', '221', 'Senegal'], ['SC', '248', 'Seychelles'], ['SL', '232', 'Sierra Leone'], ['SO', '252', 'Somalia'],
    ['ZA', '27', 'South Africa'], ['SS', '211', 'South Sudan'], ['SD', '249', 'Sudan'], ['TZ', '255', 'Tanzania'], ['TG', '228', 'Togo'],
    ['TN', '216', 'Tunisia'], ['UG', '256', 'Uganda'], ['ZM', '260', 'Zambia'], ['ZW', '263', 'Zimbabwe'],
    ['FR', '33', 'France'], ['BE', '32', 'Belgium'], ['CH', '41', 'Switzerland'], ['LU', '352', 'Luxembourg'], ['DE', '49', 'Germany'],
    ['IT', '39', 'Italy'], ['ES', '34', 'Spain'], ['PT', '351', 'Portugal'], ['GB', '44', 'United Kingdom'], ['IE', '353', 'Ireland'],
    ['NL', '31', 'Netherlands'], ['AT', '43', 'Austria'], ['SE', '46', 'Sweden'], ['NO', '47', 'Norway'], ['DK', '45', 'Denmark'],
    ['FI', '358', 'Finland'], ['PL', '48', 'Poland'], ['GR', '30', 'Greece'], ['RO', '40', 'Romania'], ['TR', '90', 'Türkiye'],
    ['RU', '7', 'Russia'], ['UA', '380', 'Ukraine'],
    ['US', '1', 'United States'], ['CA', '1', 'Canada'], ['MX', '52', 'Mexico'], ['BR', '55', 'Brazil'], ['AR', '54', 'Argentina'],
    ['CL', '56', 'Chile'], ['CO', '57', 'Colombia'], ['PE', '51', 'Peru'], ['VE', '58', 'Venezuela'], ['HT', '509', 'Haiti'], ['CU', '53', 'Cuba'],
    ['CN', '86', 'China'], ['IN', '91', 'India'], ['PK', '92', 'Pakistan'], ['BD', '880', 'Bangladesh'], ['JP', '81', 'Japan'],
    ['KR', '82', 'South Korea'], ['PH', '63', 'Philippines'], ['ID', '62', 'Indonesia'], ['VN', '84', 'Vietnam'], ['TH', '66', 'Thailand'],
    ['MY', '60', 'Malaysia'], ['SG', '65', 'Singapore'], ['AE', '971', 'United Arab Emirates'], ['SA', '966', 'Saudi Arabia'], ['QA', '974', 'Qatar'],
    ['KW', '965', 'Kuwait'], ['LB', '961', 'Lebanon'], ['IL', '972', 'Israel'], ['JO', '962', 'Jordan'], ['IQ', '964', 'Iraq'],
    ['AU', '61', 'Australia'], ['NZ', '64', 'New Zealand']
  ].map(function (c) { return { iso: c[0], dial: c[1], name: c[2] }; });

  function byIso(iso) {
    for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].iso === iso) return COUNTRIES[i];
    return null;
  }

  // Pays dont le numéro local garde son « 0 » initial.
  var KEEP_ZERO = { IT: 1, SM: 1, VA: 1 };

  /* Transforme ce que la personne a tapé en numéro international (E.164).
     Accepte : 081 234 5678 · 81 234 5678 · +243 81 234 5678 · 00243 81 234 5678 · 243812345678 · +243 (0)81… */
  function normalizePhone(iso, raw) {
    var c = byIso(iso);
    var s = String(raw == null ? '' : raw).replace(/\(0\)/g, '');
    s = s.replace(/[\s.\-()  ‑]/g, '');
    s = s.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
         .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06f0); });
    if (!s) return { ok: false, reason: 'short' };
    var intl = false;
    if (s.charAt(0) === '+') { intl = true; s = s.slice(1); }
    else if (s.slice(0, 2) === '00') { intl = true; s = s.slice(2); }
    if (!/^\d+$/.test(s)) return { ok: false, reason: 'invalid' };
    var e164;
    if (intl) {
      if (s.charAt(0) === '0') return { ok: false, reason: 'invalid' };
      e164 = '+' + s;
      if (s.length < 8) return { ok: false, reason: 'short' };
    } else {
      if (!c) return { ok: false, reason: 'invalid' };
      var n = s;
      // La personne a tapé l'indicatif sans « + » (ex. 243812345678) : on le retire.
      if (n.length >= 11 && n.indexOf(c.dial) === 0 && n.length - c.dial.length >= 8) n = n.slice(c.dial.length);
      if (n.charAt(0) === '0' && !KEEP_ZERO[iso]) n = n.slice(1);
      if (n.length < 6) return { ok: false, reason: 'short' };
      e164 = '+' + c.dial + n;
    }
    var digits = e164.slice(1);
    if (digits.length > 15 || digits.length < 8) return { ok: false, reason: digits.length < 8 ? 'short' : 'invalid' };
    return { ok: true, e164: e164 };
  }

  // +243812345678 → « +243 812 345 678 »
  function prettyPhone(e164) {
    var s = String(e164 || '');
    if (s.charAt(0) !== '+') return s;
    var d = s.slice(1), dial = '';
    for (var L = 3; L >= 1 && !dial; L--) {
      var p = d.slice(0, L);
      for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].dial === p) { dial = p; break; }
    }
    if (!dial) dial = d.slice(0, 3);
    var rest = d.slice(dial.length), groups = [];
    while (rest.length > 4) { groups.push(rest.slice(0, 3)); rest = rest.slice(3); }
    if (rest) groups.push(rest);
    return '+' + dial + ' ' + groups.join(' ');
  }

  // Limite d'envoi de SMS côté appareil : 60 s entre deux codes, 5 par heure.
  var COOLDOWN_MS = 60 * 1000, MAX_PER_HOUR = 5, HOUR_MS = 3600 * 1000;
  function smsGuard(stamps, now) {
    var recent = (Array.isArray(stamps) ? stamps : []).filter(function (x) { return typeof x === 'number' && isFinite(x) && now - x < HOUR_MS && x <= now + 1000; })
      .sort(function (a, b) { return a - b; });
    if (recent.length >= MAX_PER_HOUR) return { ok: false, reason: 'limit', wait: Math.ceil((recent[0] + HOUR_MS - now) / 1000), stamps: recent };
    var last = recent[recent.length - 1];
    if (last && now - last < COOLDOWN_MS) return { ok: false, reason: 'cooldown', wait: Math.ceil((last + COOLDOWN_MS - now) / 1000), stamps: recent };
    return { ok: true, wait: 0, stamps: recent };
  }

  // Réglages lus dans Firestore : seuls « true » exacts activent un moyen optionnel. Google et e-mail restent toujours actifs.
  function sanitizeConfig(raw) {
    var o = raw && typeof raw === 'object' ? raw : {};
    return { google: true, email: true, phone: o.phone === true, apple: o.apple === true, facebook: o.facebook === true, microsoft: o.microsoft === true };
  }

  // Pays proposé par défaut : région de la langue du téléphone, sinon fuseau horaire, sinon langue de l'app.
  var TZ_COUNTRY = {
    'Africa/Kinshasa': 'CD', 'Africa/Lubumbashi': 'CD', 'Africa/Brazzaville': 'CG', 'Africa/Douala': 'CM', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'SN',
    'Africa/Libreville': 'GA', 'Africa/Bangui': 'CF', 'Africa/Ndjamena': 'TD', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF', 'Africa/Niamey': 'NE',
    'Africa/Conakry': 'GN', 'Africa/Lome': 'TG', 'Africa/Porto-Novo': 'BJ', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE',
    'Africa/Kampala': 'UG', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kigali': 'RW', 'Africa/Bujumbura': 'BI', 'Africa/Luanda': 'AO', 'Africa/Addis_Ababa': 'ET',
    'Africa/Lusaka': 'ZM', 'Africa/Harare': 'ZW', 'Africa/Maputo': 'MZ', 'Africa/Johannesburg': 'ZA', 'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ',
    'Africa/Tunis': 'TN', 'Africa/Cairo': 'EG', 'Africa/Antananarivo': 'MG', 'Africa/Djibouti': 'DJ', 'Africa/Mogadishu': 'SO', 'Africa/Khartoum': 'SD',
    'Europe/Paris': 'FR', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'Europe/Luxembourg': 'LU', 'Europe/Berlin': 'DE', 'Europe/Rome': 'IT',
    'Europe/Madrid': 'ES', 'Europe/Lisbon': 'PT', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Amsterdam': 'NL',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Los_Angeles': 'US', 'America/Denver': 'US', 'America/Toronto': 'CA', 'America/Montreal': 'CA',
    'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX', 'America/Port-au-Prince': 'HT'
  };
  var LANG_COUNTRY = { fr: 'CD', en: 'US', es: 'ES', it: 'IT', pt: 'BR' };
  function defaultCountry(tags, tz, lang) {
    // Le fuseau horaire dit où se trouve la personne ; la région de la langue (fr-FR) dit seulement quelle version du français elle a choisie.
    if (tz && TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
    var list = Array.isArray(tags) ? tags : [tags];
    for (var i = 0; i < list.length; i++) {
      var m = /[-_]([A-Za-z]{2})$/.exec(String(list[i] || ''));
      if (m && byIso(m[1].toUpperCase())) return m[1].toUpperCase();
    }
    return LANG_COUNTRY[lang] || 'CD';
  }

  // Code d'erreur Firebase → clé de traduction (null = inconnu, l'appelant retombe sur le message général).
  function errorKey(code, message) {
    var c = String(code || ''), m = String(message || '');
    switch (c) {
      case 'auth/invalid-phone-number': return 'lp_e_phone_invalid';
      case 'auth/missing-phone-number': return 'lp_e_phone_short';
      case 'auth/too-many-requests': return 'lp_e_too_many';
      case 'auth/quota-exceeded': return 'lp_e_quota';
      case 'auth/captcha-check-failed': case 'auth/missing-app-credential': case 'auth/invalid-app-credential':
      case 'auth/recaptcha-not-enabled': case 'auth/argument-error': return 'lp_e_captcha';
      case 'auth/invalid-verification-code': return 'lp_e_code_bad';
      case 'auth/missing-verification-code': return 'lp_e_code_short';
      case 'auth/code-expired': case 'auth/session-expired': case 'auth/invalid-verification-id': case 'auth/missing-verification-id': return 'lp_e_code_expired';
      case 'auth/operation-not-allowed': return /region/i.test(m) ? 'lp_e_region' : 'lp_e_not_enabled';
      case 'auth/admin-restricted-operation': case 'auth/configuration-not-found': case 'auth/operation-not-supported-in-this-environment':
      case 'auth/billing-not-enabled': case 'auth/unauthorized-domain': case 'auth/app-not-authorized': return 'lp_e_not_enabled';
      case 'auth/popup-closed-by-user': case 'auth/cancelled-popup-request': case 'auth/redirect-cancelled-by-user': case 'auth/user-cancelled': return 'lp_e_cancelled';
      case 'auth/popup-blocked': return 'lp_e_popup';
      case 'auth/credential-already-in-use': case 'auth/phone-number-already-exists': case 'auth/email-already-in-use': return 'lp_e_in_use';
      case 'auth/provider-already-linked': return 'lp_e_already_linked';
      case 'auth/requires-recent-login': return 'lp_e_recent';
      case 'auth/network-request-failed': return 'lp_e_network';
      case 'auth/account-exists-with-different-credential': return 'lp_e_exists_generic';
      default: return null;
    }
  }

  var pure = {
    COUNTRIES: COUNTRIES, byIso: byIso, normalizePhone: normalizePhone, prettyPhone: prettyPhone, smsGuard: smsGuard,
    sanitizeConfig: sanitizeConfig, defaultCountry: defaultCountry, errorKey: errorKey,
    COOLDOWN_MS: COOLDOWN_MS, MAX_PER_HOUR: MAX_PER_HOUR
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__cnLoginPro) return;
  window.__cnLoginPro = true;

  /* =================================================================
     2. OUTILS
     ================================================================= */
  var ua = navigator.userAgent || '';
  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function lang() { try { if (typeof currentLang !== 'undefined' && currentLang) return currentLang; } catch (e) { /* ignore */ } return 'fr'; }
  function tr(key, vars) {
    var s = key;
    try { if (typeof t === 'function') s = t(key); } catch (e) { /* ignore */ }
    if (vars) Object.keys(vars).forEach(function (k) { s = String(s).split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ready() { return typeof firebase !== 'undefined' && !!firebase.auth && !!firebase.apps && firebase.apps.length > 0; }
  function authUser() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
  function isApple() { try { return !!IS_IOS_DEVICE; } catch (e) { return /iPad|iPhone|iPod/.test(ua); } }
  function proxied() { try { return firebase.app().options.authDomain === location.hostname; } catch (e) { return false; } }
  function isAdminUser(u) { try { return !!u && typeof ADMIN_UID !== 'undefined' && u.uid === ADMIN_UID; } catch (e) { return false; } }
  function toast(msg, kind) { try { if (typeof showToast === 'function') showToast(msg, kind || 'success'); } catch (e) { /* ignore */ } }
  function showErr(msg) {
    try { if (typeof showAuthError === 'function') showAuthError(msg); } catch (e) { /* ignore */ }
    try { var b = $('auth-error'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ignore */ }
  }
  function hideErr() { try { if (typeof hideAuthError === 'function') hideAuthError(); } catch (e) { /* ignore */ } }
  function errText(e) {
    var k = errorKey(e && e.code, e && e.message);
    if (k) return tr(k);
    try { if (typeof window.translateAuthError === 'function') return window.translateAuthError(e); } catch (x) { /* ignore */ }
    return (e && e.message) || tr('lp_e_network');
  }
  function isDenied(e) { return !!e && (e.code === 'permission-denied' || /permission/i.test(e.message || '')); }

  var PROV = {
    'apple.com': { label: 'Apple', key: 'lp_apple', icon: '<svg class="lp-ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>' },
    'phone': { label: '', key: 'lp_phone', icon: '<svg class="lp-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>' },
    'facebook.com': { label: 'Facebook', key: 'lp_facebook', icon: '<svg class="lp-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path fill="#fff" d="M13.4 21.5v-7.3h2.4l.4-2.9h-2.8V9.5c0-.8.3-1.4 1.4-1.4h1.5V5.5c-.3 0-1.1-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.4v7.3z"/></svg>' },
    'microsoft.com': { label: 'Microsoft', key: 'lp_microsoft', icon: '<svg class="lp-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/><rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/><rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/><rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/></svg>' },
    'google.com': { label: 'Google', key: 'auth_google', icon: '<svg class="lp-ico" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.4 0-13.7 4.1-17.1 10.2z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5c3.3 6.6 10.1 11.1 18 11.1z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.7 35.9 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>' }
  };

  /* =================================================================
     3. RÉGLAGES (quels moyens sont activés)
     ================================================================= */
  var CACHE_KEY = 'cn_auth_methods';
  var cfg = sanitizeConfig(readCache());
  var cfgAt = 0;
  function readCache() { try { var o = JSON.parse(lsGet(CACHE_KEY) || 'null'); return o && o.cfg ? o.cfg : null; } catch (e) { return null; } }
  function forceAll() { try { return new URLSearchParams(location.search).get('lp') === 'all'; } catch (e) { return false; } }
  function has(name) { return forceAll() ? true : !!cfg[name]; }
  function loadConfig(force) {
    if (!force && Date.now() - cfgAt < 5 * 60 * 1000) return;
    if (!ready() || !firebase.firestore) return;
    cfgAt = Date.now();
    try {
      firebase.firestore().collection('pricing').doc('auth_methods').get().then(function (snap) {
        cfg = sanitizeConfig(snap && snap.exists ? snap.data() : null);
        lsSet(CACHE_KEY, JSON.stringify({ at: Date.now(), cfg: cfg }));
        renderProviders();
        renderMethods();
      }).catch(function () { cfgAt = 0; /* hors ligne ou lecture refusée : on garde les réglages en mémoire */ });
    } catch (e) { cfgAt = 0; }
  }

  /* =================================================================
     4. STYLE
     ================================================================= */
  function injectStyle() {
    if ($('cn-lp-style')) return;
    var st = document.createElement('style');
    st.id = 'cn-lp-style';
    st.textContent = [
      '#auth-modal .divider-or{display:flex;align-items:center;gap:12px}',
      '#auth-modal .divider-or::before,#auth-modal .divider-or::after{content:"";position:static;flex:1;width:auto;height:1px;background:var(--line)}',
      '.lp-prov{display:flex;flex-direction:column;gap:10px;margin:0 0 2px}',
      '.lp-prov-top{margin:0 0 10px}',
      '.lp-prov .google-btn,.lp-prov-top .google-btn{margin:0}',
      '.lp-ico{width:20px;height:20px;flex:none;display:block}',
      '.lp-prov .google-btn,.lp-prov-top .google-btn{color:var(--ink)}',
      '.auth-body.cn-view-phone>*:not(#cn-phone):not(#auth-error):not(#auth-success):not(#auth-loading){display:none!important}',
      '.auth-modal.cn-phone-on .auth-hero-line,.auth-modal.cn-phone-on .auth-trust{display:none!important}',
      '.auth-modal.cn-phone-on .auth-hero{padding-bottom:16px!important}',
      '.lp-phone [hidden]{display:none!important}',
      '.auth-body>#cn-phone{animation:none!important;opacity:1!important}',
      '.lp-ph-back{display:inline-flex;align-items:center;gap:6px;background:none;border:0;color:var(--accent-dark);font-weight:700;font-size:.9rem;cursor:pointer;padding:6px 0;margin:0 0 6px;min-height:40px}',
      '.lp-ph-back svg{width:18px;height:18px}',
      '.lp-ph-h{font-size:1.3rem;margin:0 0 6px;color:var(--ink)}',
      '.lp-ph-sub{color:var(--muted);font-size:.9rem;line-height:1.5;margin:0 0 16px}',
      '.lp-f{margin-bottom:14px}',
      '.lp-f label{display:block;font-size:.78rem;font-weight:700;color:var(--ink);margin-bottom:6px}',
      '.lp-f select,.lp-f input.lp-in{width:100%;box-sizing:border-box;min-height:48px;padding:12px 14px;border-radius:14px;background:var(--cream);color:var(--ink);border:1.5px solid var(--line);font-size:16px;font-family:inherit}',
      '.lp-f select{appearance:none;-webkit-appearance:none;padding-right:40px;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238a93a3\' stroke-width=\'2.4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:20px}',
      '.lp-f select:focus,.lp-f input.lp-in:focus,.lp-numwrap:focus-within{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px rgba(243,156,31,.16)}',
      '.lp-numwrap{display:flex;align-items:stretch;border:1.5px solid var(--line);border-radius:14px;background:var(--cream);overflow:hidden}',
      '.lp-numwrap .lp-dial{display:flex;align-items:center;padding:0 12px;font-weight:700;color:var(--ink);border-right:1.5px solid var(--line);background:var(--soft);font-size:1rem;white-space:nowrap}',
      '.lp-numwrap input{flex:1;min-width:0;min-height:48px;border:0;background:transparent;color:var(--ink);padding:12px 14px;font-size:16px;font-family:inherit;outline:none;box-shadow:none}',
      '.lp-f input.lp-code{text-align:center;font-size:1.6rem;letter-spacing:.5em;font-weight:700;padding-left:.5em}',
      '.lp-ph-go{width:100%;margin-top:2px;padding:14px;border-radius:14px;font-size:.98rem;font-weight:700}',
      '.lp-ph-go:disabled{opacity:.6;cursor:not-allowed}',
      '.lp-ph-links{display:flex;justify-content:space-between;gap:12px;margin-top:10px;flex-wrap:wrap}',
      '.lp-ph-links .auth-link{min-height:40px;width:auto;margin:0;display:inline-flex;align-items:center;font-size:.88rem}',
      '.lp-ph-links .auth-link:disabled{color:var(--muted);cursor:default}',
      '.lp-recap{margin-top:16px;font-size:.7rem;line-height:1.5;color:var(--muted);text-align:center}',
      '.lp-recap a{color:var(--muted);text-decoration:underline}',
      '.grecaptcha-badge{visibility:hidden}',
      /* carte « Mes moyens de connexion » (Paramètres > Sécurité) */
      '.lp-methods{margin:0 0 18px}',
      '.lp-methods .lp-m-sub{margin:0 0 10px;color:var(--muted);font-size:.85rem;line-height:1.45}',
      '.lp-m-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line)}',
      '.lp-m-row:first-of-type{border-top:0}',
      '.lp-m-ico{width:36px;height:36px;border-radius:10px;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:none;color:var(--ink)}',
      '.lp-m-name{flex:1;min-width:0;font-weight:700;font-size:.92rem;color:var(--ink)}',
      '.lp-m-name small{display:block;font-weight:500;color:var(--muted);font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lp-m-ok{font-size:.78rem;font-weight:700;color:#15803d;white-space:nowrap}',
      '.lp-m-note{margin:6px 0 0;padding:10px 12px;border-radius:12px;background:var(--soft);color:var(--ink);font-size:.85rem;line-height:1.5}',
      '@media (prefers-reduced-motion:reduce){.lp-phone *{transition:none!important;animation:none!important}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* =================================================================
     5. BOUTONS DE L'ÉCRAN DE CONNEXION
     ================================================================= */
  function mkBtn(id) {
    var P = PROV[id];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'google-btn lp-pbtn';
    b.setAttribute('data-prov', id);
    b.innerHTML = P.icon + '<span data-i18n="' + P.key + '"></span>';
    b.querySelector('span').textContent = tr(P.key);
    b.addEventListener('click', function () { if (id === 'phone') openPhone('login'); else signInProvider(id); });
    return b;
  }

  function renderProviders() {
    var google = $('google-btn');
    if (!google || !google.parentNode) return;
    var top = $('cn-prov-top'), box = $('cn-prov');
    if (!top) { top = document.createElement('div'); top.id = 'cn-prov-top'; top.className = 'lp-prov-top'; google.parentNode.insertBefore(top, google); }
    if (!box) { box = document.createElement('div'); box.id = 'cn-prov'; box.className = 'lp-prov'; google.parentNode.insertBefore(box, google.nextSibling); }
    top.innerHTML = ''; box.innerHTML = '';
    var ios = isApple(), n = 0;
    if (has('apple')) { (ios ? top : box).appendChild(mkBtn('apple.com')); n++; }
    if (has('phone')) { box.appendChild(mkBtn('phone')); n++; }
    if (has('facebook')) { box.appendChild(mkBtn('facebook.com')); n++; }
    if (has('microsoft')) { box.appendChild(mkBtn('microsoft.com')); n++; }
    top.style.display = top.children.length ? '' : 'none';
    box.style.display = box.children.length ? '' : 'none';
    var dv = document.querySelector('#auth-modal .divider-or');
    if (dv) {
      var k = n ? 'lp_or_email' : 'auth_or';
      if (dv.getAttribute('data-i18n') !== k) dv.setAttribute('data-i18n', k);
      dv.textContent = tr(k);
    }
    // Les boutons sont réactivés par setAuthLoading(false)
  }

  /* =================================================================
     6. CONNEXION PAR FOURNISSEUR (Apple, Facebook, Microsoft, Google pour lier)
     ================================================================= */
  var REDIR_KEY = 'cn_p_redirect';
  var busy = false, busyTimer = null;

  function providerObj(id) {
    var A = firebase.auth;
    if (id === 'google.com') { var g = new A.GoogleAuthProvider(); g.setCustomParameters({ prompt: 'select_account' }); return g; }
    if (id === 'apple.com') { var p = new A.OAuthProvider('apple.com'); p.addScope('email'); p.addScope('name'); try { p.setCustomParameters({ locale: lang() }); } catch (e) { /* ignore */ } return p; }
    if (id === 'facebook.com') { var f = new A.FacebookAuthProvider(); f.addScope('email'); return f; }
    if (id === 'microsoft.com') { var m = new A.OAuthProvider('microsoft.com'); m.setCustomParameters({ prompt: 'select_account' }); return m; }
    throw new Error('provider?');
  }
  function provName(id) { return PROV[id] ? PROV[id].label : id; }
  function fallbackName(user) {
    if (user && user.displayName) return user.displayName;
    if (user && user.email) return String(user.email).split('@')[0];
    return 'Membre ' + String((user && user.uid) || '0000').slice(0, 4).toUpperCase();
  }

  // Crée le profil la toute première fois, sans rien écraser. Plusieurs formes sont essayées : si les règles de la base
  // refusent un champ en plus (téléphone), on réessaie avec le contenu habituel.
  function ensureProfile(user) {
    var dbx = firebase.firestore(), ref = dbx.collection('users').doc(user.uid);
    return ref.get().then(function (snap) {
      if (snap.exists) return { created: false };
      var name = fallbackName(user), refUid = null;
      try { refUid = getPendingReferrerUid(); } catch (e) { /* ignore */ }
      var base = { name: name, email: user.email || '', photoURL: user.photoURL || null, balance: 0, referredBy: refUid, createdAt: new Date().toISOString() };
      var tries = [];
      if (user.phoneNumber) { var w = {}; Object.keys(base).forEach(function (k) { w[k] = base[k]; }); w.phone = user.phoneNumber; tries.push(w); }
      tries.push(base);
      if (!user.email) { var ne = {}; Object.keys(base).forEach(function (k) { if (k !== 'email') ne[k] = base[k]; }); tries.push(ne); }
      var i = 0;
      function next() {
        return ref.set(tries[i]).catch(function (e) {
          if (isDenied(e) && i < tries.length - 1) { i++; return next(); }
          throw e;
        });
      }
      return next().then(function () {
        try { if (typeof syncPublicProfile === 'function') syncPublicProfile(user.uid, { name: name, photoURL: user.photoURL || null, verified: false, referredBy: refUid }); } catch (e) { /* ignore */ }
        return { created: true, name: name };
      });
    });
  }

  function closeModal() { try { if (typeof closeAuth === 'function') closeAuth(); else { var m = $('auth-modal'); if (m) m.classList.add('hidden'); } } catch (e) { /* ignore */ } }
  function openModalRaw() { var m = $('auth-modal'); if (m) m.classList.remove('hidden'); }
  function setLoading(on) { try { if (typeof setAuthLoading === 'function') setAuthLoading(on); } catch (e) { /* ignore */ } }

  function startBusy() {
    busy = true; clearTimeout(busyTimer);
    busyTimer = setTimeout(function () { busy = false; setLoading(false); }, 60000);
  }
  function endBusy() { busy = false; clearTimeout(busyTimer); setLoading(false); }

  function onSignedIn(cred) {
    var u = cred && cred.user;
    if (!u) return Promise.resolve(null);
    return ensureProfile(u).catch(function (e) { try { console.log('[login-pro] profil :', e && e.code, e && e.message); } catch (x) { /* ignore */ } return { created: false }; })
      .then(function (info) { return info; });
  }

  function signInProvider(id) {
    if (busy) return;
    if (navigator.onLine === false) { showErr(tr('lp_e_network')); return; }
    if (!ready()) { showErr(tr('lp_e_network')); return; }
    hideErr(); startBusy(); setLoading(true);
    var a = firebase.auth(), prov;
    try { prov = providerObj(id); } catch (e) { endBusy(); showErr(tr('lp_e_not_enabled')); return; }
    function viaRedirect() {
      lsSet(REDIR_KEY, JSON.stringify({ id: id, mode: 'login', at: Date.now() }));
      return a.signInWithRedirect(prov);
    }
    var p;
    try {
      if (isApple() && proxied()) p = viaRedirect();
      else p = a.signInWithPopup(prov).then(function (cred) { return onSignedIn(cred).then(closeModal); }).catch(function (e) {
        var c = e && e.code;
        if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') return viaRedirect();
        throw e;
      });
    } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).catch(function (e) { lsSet(REDIR_KEY, null); handleProviderError(e, id); }).then(endBusy, endBusy);
  }

  /* Un compte existe déjà avec cette adresse (ex. même adresse chez Google et chez Apple) : on explique et on relie
     automatiquement les deux dès que la personne se connecte avec la méthode d'origine. */
  var pending = null;
  var PENDING_KEY = 'cn_p_pending';
  function setPending(cred, email, id) {
    pending = { cred: cred, email: String(email || '').toLowerCase(), id: id };
    try { if (cred && cred.toJSON) sessionStorage.setItem(PENDING_KEY, JSON.stringify({ json: cred.toJSON(), email: pending.email, id: id, at: Date.now() })); } catch (e) { /* ignore */ }
  }
  function restorePending() {
    if (pending) return;
    try {
      var o = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
      if (!o || Date.now() - o.at > 15 * 60 * 1000) { sessionStorage.removeItem(PENDING_KEY); return; }
      var cred = firebase.auth.OAuthProvider.credentialFromJSON(o.json);
      if (cred) pending = { cred: cred, email: o.email, id: o.id };
    } catch (e) { try { sessionStorage.removeItem(PENDING_KEY); } catch (x) { /* ignore */ } }
  }
  function clearPending() { pending = null; try { sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ } }
  function methodName(m) {
    if (m === 'google.com') return 'Google';
    if (m === 'password') return tr('lp_m_password');
    if (m === 'phone') return tr('lp_m_phone');
    if (PROV[m]) return PROV[m].label;
    return '';
  }
  function handleProviderError(e, id) {
    try { console.log('[login-pro]', id, e && e.code, e && e.message); } catch (x) { /* ignore */ }
    if (e && e.code === 'auth/account-exists-with-different-credential') {
      var email = e.email || (e.customData && e.customData.email) || '';
      if (e.credential) setPending(e.credential, email, id);
      if (!email) { showErr(tr('lp_e_exists_generic')); return Promise.resolve(); }
      return firebase.auth().fetchSignInMethodsForEmail(email).then(function (methods) {
        var m = '';
        (methods || []).some(function (x) { m = methodName(x); return !!m; });
        showErr(m ? tr('lp_e_exists', { email: email, method: m, provider: provName(id) }) : tr('lp_e_exists_generic'));
      }).catch(function () { showErr(tr('lp_e_exists_generic')); });
    }
    showErr(errText(e));
    return Promise.resolve();
  }

  // Dès que la personne est connectée avec son adresse, on relie le compte mis de côté.
  function tryLinkPending(u) {
    if (!u) return;
    restorePending();
    if (!pending || !pending.cred) return;
    if (!u.email || String(u.email).toLowerCase() !== pending.email) return;
    var p = pending; clearPending();
    u.linkWithCredential(p.cred).then(function () {
      toast(tr('lp_linked_ok', { provider: provName(p.id) }), 'success');
      renderMethods();
    }).catch(function (e) { try { console.log('[login-pro] liaison :', e && e.code); } catch (x) { /* ignore */ } });
  }

  // Retour d'une redirection (iPhone) : on termine la connexion ou la liaison.
  function handleRedirectReturn() {
    var raw = lsGet(REDIR_KEY);
    if (!raw) return;
    var info = null;
    try { info = JSON.parse(raw); } catch (e) { /* ignore */ }
    if (!info || Date.now() - (info.at || 0) > 10 * 60 * 1000) { lsSet(REDIR_KEY, null); return; }
    if (!ready()) return;
    firebase.auth().getRedirectResult().then(function (res) {
      lsSet(REDIR_KEY, null);
      if (!res || !res.user) return null;
      if (info.mode === 'link') { toast(tr('lp_linked_ok', { provider: provName(info.id) }), 'success'); renderMethods(); return null; }
      return onSignedIn(res).then(closeModal);
    }).catch(function (e) {
      lsSet(REDIR_KEY, null);
      try { if (typeof openAuth === 'function') openAuth('login'); } catch (x) { /* ignore */ }
      handleProviderError(e, info.id);
    });
  }

  /* =================================================================
     7. NUMÉRO DE TÉLÉPHONE (SMS)
     ================================================================= */
  var S = { mode: 'login', step: 'number', e164: '', conf: null, verifier: null, timer: null, until: 0, gen: 0, sending: false, verifying: false, reauth: null, rcN: 0 };
  var STAMPS_KEY = 'cn_sms_sends';
  function readStamps() { try { var a = JSON.parse(lsGet(STAMPS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function pushStamp() { var g = smsGuard(readStamps(), Date.now()); var a = g.stamps.slice(); a.push(Date.now()); lsSet(STAMPS_KEY, JSON.stringify(a)); }

  function bodyEl() { return document.querySelector('#auth-modal .auth-body'); }
  function modalEl() { return document.querySelector('#auth-modal .auth-modal'); }

  function countryOptions() {
    var l = lang(), dn = null;
    try { if (window.Intl && Intl.DisplayNames) dn = new Intl.DisplayNames([l], { type: 'region' }); } catch (e) { dn = null; }
    var items = COUNTRIES.map(function (c) {
      var nm = c.name;
      try { if (dn) nm = dn.of(c.iso) || c.name; } catch (e) { /* ignore */ }
      return { iso: c.iso, dial: c.dial, name: nm };
    });
    try { items.sort(function (a, b) { return a.name.localeCompare(b.name, l); }); } catch (e) { /* ignore */ }
    return items;
  }
  function guessCountry() {
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    var tags = []; try { tags = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).slice(); } catch (e) { /* ignore */ }
    return defaultCountry(tags, tz, lang());
  }
  function fillCountries(selected) {
    var sel = $('cn-ph-country'); if (!sel) return;
    var cur = selected || sel.value || guessCountry();
    sel.innerHTML = '';
    countryOptions().forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.iso; o.textContent = c.name + ' (+' + c.dial + ')';
      sel.appendChild(o);
    });
    sel.value = cur;
    updateDial();
  }
  function updateDial() {
    var sel = $('cn-ph-country'), d = $('cn-ph-dial'); if (!sel || !d) return;
    var c = byIso(sel.value);
    d.textContent = '+' + (c ? c.dial : '');
  }

  function buildPhonePanel() {
    var body = bodyEl();
    if (!body || $('cn-phone')) return;
    var p = document.createElement('div');
    p.id = 'cn-phone'; p.className = 'lp-phone'; p.hidden = true;
    p.innerHTML =
      '<button type="button" class="lp-ph-back" id="cn-ph-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg><span data-i18n="lp_ph_back"></span></button>' +
      '<section data-step="number">' +
        '<h2 class="lp-ph-h" id="cn-ph-title"></h2><p class="lp-ph-sub" id="cn-ph-sub"></p>' +
        '<form id="cn-ph-form1" novalidate>' +
          '<div class="lp-f"><label for="cn-ph-country" data-i18n="lp_ph_country"></label><select id="cn-ph-country" autocomplete="country"></select></div>' +
          '<div class="lp-f"><label for="cn-ph-num" data-i18n="lp_ph_number"></label>' +
            '<div class="lp-numwrap"><span class="lp-dial" id="cn-ph-dial">+</span><input id="cn-ph-num" type="tel" inputmode="tel" autocomplete="tel-national" enterkeyhint="go" maxlength="24"></div></div>' +
          '<button class="btn btn-primary lp-ph-go" id="cn-ph-send" type="submit"><span data-i18n="lp_ph_send"></span></button>' +
        '</form>' +
      '</section>' +
      '<section data-step="code" hidden>' +
        '<h2 class="lp-ph-h" id="cn-ph-ctitle"></h2><p class="lp-ph-sub" id="cn-ph-csub"></p>' +
        '<form id="cn-ph-form2" novalidate>' +
          '<div class="lp-f"><label for="cn-ph-code" data-i18n="lp_ph_code_label"></label>' +
            '<input id="cn-ph-code" class="lp-in lp-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" enterkeyhint="go"></div>' +
          '<button class="btn btn-primary lp-ph-go" id="cn-ph-verify" type="submit"><span data-i18n="lp_ph_verify"></span></button>' +
        '</form>' +
        '<div class="lp-ph-links"><button type="button" class="auth-link" id="cn-ph-resend"></button><button type="button" class="auth-link" id="cn-ph-change"><span data-i18n="lp_ph_change"></span></button></div>' +
      '</section>' +
      '<section data-step="name" hidden>' +
        '<h2 class="lp-ph-h" data-i18n="lp_ph_name_title"></h2><p class="lp-ph-sub" data-i18n="lp_ph_name_sub"></p>' +
        '<form id="cn-ph-form3" novalidate>' +
          '<div class="lp-f"><input id="cn-ph-name" class="lp-in" type="text" autocomplete="name" enterkeyhint="go" maxlength="40"></div>' +
          '<button class="btn btn-primary lp-ph-go" type="submit"><span data-i18n="lp_ph_name_go"></span></button>' +
        '</form>' +
      '</section>' +
      '<p class="lp-recap" id="cn-ph-recap"></p>' +
      '<div id="cn-recaptcha-box" aria-hidden="true"></div>';
    body.appendChild(p);
    p.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = tr(n.getAttribute('data-i18n')); });
    $('cn-ph-back').addEventListener('click', phoneBack);
    $('cn-ph-country').addEventListener('change', updateDial);
    $('cn-ph-form1').addEventListener('submit', function (ev) { ev.preventDefault(); submitNumber(); });
    $('cn-ph-form2').addEventListener('submit', function (ev) { ev.preventDefault(); submitCode(); });
    $('cn-ph-form3').addEventListener('submit', function (ev) { ev.preventDefault(); submitName(); });
    $('cn-ph-resend').addEventListener('click', function () { if (S.e164) sendCode(S.e164, true); });
    $('cn-ph-change').addEventListener('click', function () { resetVerifier(); S.conf = null; clearTimer(); hideErr(); goStep('number'); });
    $('cn-ph-code').addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 6);
      if (v !== this.value) this.value = v;
      if (v.length === 6) submitCode();
    });
    fillCountries();
  }

  function setCopy() {
    var m = S.mode;
    var T = $('cn-ph-title'), U = $('cn-ph-sub');
    if (T) T.textContent = tr(m === 'link' ? 'lp_ph_link_title' : m === 'reauth' ? 'lp_ph_reauth_title' : 'lp_ph_title');
    if (U) U.textContent = tr(m === 'link' ? 'lp_ph_link_sub' : m === 'reauth' ? 'lp_ph_reauth_sub' : 'lp_ph_sub');
    var ct = $('cn-ph-ctitle'); if (ct) ct.textContent = tr(m === 'reauth' ? 'lp_ph_reauth_title' : 'lp_ph_code_title');
    var num = $('cn-ph-num'); if (num) num.setAttribute('placeholder', tr('lp_ph_number_ph'));
    var nm = $('cn-ph-name'); if (nm) { nm.setAttribute('placeholder', tr('lp_ph_name_ph')); nm.setAttribute('aria-label', tr('lp_ph_name_ph')); }
    var rc = $('cn-ph-recap');
    if (rc) rc.innerHTML = esc(tr('lp_ph_recap')) + ' <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">' + esc(tr('lp_ph_recap_p')) + '</a> · <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">' + esc(tr('lp_ph_recap_t')) + '</a>';
    var ch = $('cn-ph-change'); if (ch) ch.hidden = (m === 'reauth');
    updateCodeSub();
    updateResendLabel();
  }
  function updateCodeSub() {
    var cs = $('cn-ph-csub'); if (!cs) return;
    var base = S.e164 ? tr('lp_ph_code_sub', { n: prettyPhone(S.e164) }) : '';
    cs.textContent = S.mode === 'reauth' ? (tr('lp_ph_reauth_sub') + (base ? ' ' + base : '')) : base;
  }

  function goStep(step) {
    S.step = step;
    var p = $('cn-phone'); if (!p) return;
    p.querySelectorAll('section[data-step]').forEach(function (s) { s.hidden = s.getAttribute('data-step') !== step; });
    var back = $('cn-ph-back'); if (back) back.hidden = (step === 'name');
    setTimeout(function () {
      var f = step === 'number' ? $('cn-ph-num') : step === 'code' ? $('cn-ph-code') : $('cn-ph-name');
      try { if (f) f.focus({ preventScroll: false }); } catch (e) { /* ignore */ }
    }, 60);
  }

  function openPhone(mode) {
    if (!ready()) { showErr(tr('lp_e_network')); return; }
    injectStyle();
    buildPhonePanel();
    S.mode = mode || 'login'; S.gen++; S.conf = null; S.e164 = ''; S.sending = false; S.verifying = false;
    clearTimer(); resetVerifier(); hideErr();
    var inp = $('cn-ph-code'); if (inp) inp.value = '';
    var nm = $('cn-ph-num'); if (nm) nm.value = '';
    openModalRaw();
    var body = bodyEl(), mod = modalEl();
    if (body) body.classList.add('cn-view-phone');
    if (mod) mod.classList.add('cn-phone-on');
    var p = $('cn-phone'); if (p) p.hidden = false;
    fillCountries(guessCountry());
    setCopy();
    var u = authUser();
    if (S.mode === 'reauth' && u && u.phoneNumber) {
      goStep('code');
      var sendBtn = $('cn-ph-verify'); if (sendBtn) sendBtn.disabled = true;
      sendCode(u.phoneNumber, false);
    } else goStep('number');
  }

  function leavePhoneView() {
    var body = bodyEl(), mod = modalEl();
    if (body) body.classList.remove('cn-view-phone');
    if (mod) mod.classList.remove('cn-phone-on');
    var p = $('cn-phone'); if (p) p.hidden = true;
    clearTimer(); resetVerifier();
    S.gen++; S.conf = null; S.sending = false; S.verifying = false;
  }
  function phoneBack() {
    hideErr();
    if (S.step === 'code' && S.mode !== 'reauth') { resetVerifier(); S.conf = null; clearTimer(); goStep('number'); return; }
    var wasModeOnly = S.mode === 'link' || S.mode === 'reauth';
    leavePhoneView();
    if (S.reauth) { var r = S.reauth; S.reauth = null; r.rej(codeErr('auth/user-cancelled')); }
    if (wasModeOnly) closeModal();
  }

  function codeErr(code) { var e = new Error(code); e.code = code; return e; }

  function resetVerifier() {
    try { if (S.verifier) S.verifier.clear(); } catch (e) { /* ignore */ }
    S.verifier = null;
    var b = $('cn-recaptcha-box'); if (b) b.innerHTML = '';
  }
  function newVerifier() {
    resetVerifier();
    var box = $('cn-recaptcha-box'), id = 'cn-recaptcha-' + (++S.rcN);
    box.innerHTML = '<div id="' + id + '"></div>';
    S.verifier = new firebase.auth.RecaptchaVerifier(id, { size: 'invisible', 'expired-callback': function () { resetVerifier(); } });
    return S.verifier;
  }

  function clearTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }
  function updateResendLabel() {
    var b = $('cn-ph-resend'); if (!b) return;
    var left = Math.max(0, Math.ceil((S.until - Date.now()) / 1000));
    if (left > 0) { b.disabled = true; b.textContent = tr('lp_ph_resend_in', { s: left }); }
    else { b.disabled = false; b.textContent = tr('lp_ph_resend'); }
  }
  function startCooldown(ms) {
    S.until = Date.now() + (ms || COOLDOWN_MS);
    clearTimer(); updateResendLabel();
    S.timer = setInterval(function () {
      updateResendLabel();
      if (Date.now() >= S.until) clearTimer();
    }, 1000);
  }

  function submitNumber() {
    if (S.sending) return;
    hideErr();
    var iso = ($('cn-ph-country') || {}).value, raw = ($('cn-ph-num') || {}).value;
    var r = normalizePhone(iso, raw);
    if (!r.ok) { showErr(tr(r.reason === 'short' ? 'lp_e_phone_short' : 'lp_e_phone_invalid')); return; }
    sendCode(r.e164, false);
  }

  function sendCode(e164, isResend) {
    if (S.sending) return;
    if (!ready()) { showErr(tr('lp_e_network')); return; }
    if (navigator.onLine === false) { showErr(tr('lp_e_network')); return; }
    S.e164 = e164;
    var g = smsGuard(readStamps(), Date.now());
    if (!g.ok) {
      showErr(g.reason === 'limit' ? tr('lp_e_limit') : tr('lp_e_cooldown', { s: g.wait }));
      if (g.reason === 'cooldown' && S.step === 'code') startCooldown(g.wait * 1000);
      if (S.mode === 'reauth' && S.step === 'code' && S.reauth && !S.conf) { /* la personne peut réessayer après l'attente */ }
      return;
    }
    hideErr();
    S.sending = true;
    var gen = S.gen, a = firebase.auth(), u = a.currentUser;
    var sendBtn = $('cn-ph-send'), label = sendBtn ? sendBtn.querySelector('span') : null;
    if (sendBtn) { sendBtn.disabled = true; if (label) label.textContent = tr('lp_ph_sending'); }
    try { a.languageCode = lang(); } catch (e) { /* ignore */ }
    var p;
    try {
      var ver = newVerifier();
      if (S.mode === 'link' && u) p = u.linkWithPhoneNumber(e164, ver);
      else if (S.mode === 'reauth' && u) p = u.reauthenticateWithPhoneNumber(e164, ver);
      else p = a.signInWithPhoneNumber(e164, ver);
    } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(function (conf) {
      if (gen !== S.gen) return;
      pushStamp();
      S.conf = conf; S.e164 = e164;
      var inp = $('cn-ph-code'); if (inp) inp.value = '';
      var vb = $('cn-ph-verify'); if (vb) vb.disabled = false;
      updateCodeSub();
      goStep('code');
      startCooldown();
      if (isResend) toast(tr('lp_ph_sent'), 'success');
    }).catch(function (e) {
      if (gen !== S.gen) return;
      try { console.log('[login-pro] SMS :', e && e.code, e && e.message); } catch (x) { /* ignore */ }
      resetVerifier();
      showErr(errText(e));
      if (S.mode === 'reauth' && S.step === 'code') { var r = $('cn-ph-resend'); if (r) { r.disabled = false; r.textContent = tr('lp_ph_resend'); } S.e164 = e164; var vb = $('cn-ph-verify'); if (vb) vb.disabled = true; }
    }).then(function () {
      S.sending = false;
      if (sendBtn) { sendBtn.disabled = false; if (label) label.textContent = tr('lp_ph_send'); }
    });
  }

  function submitCode() {
    if (S.verifying) return;
    var code = (($('cn-ph-code') || {}).value || '').replace(/\D/g, '');
    if (code.length !== 6) { showErr(tr('lp_e_code_short')); return; }
    if (!S.conf) { showErr(tr('lp_e_code_expired')); return; }
    hideErr();
    S.verifying = true;
    var gen = S.gen, vb = $('cn-ph-verify'), label = vb ? vb.querySelector('span') : null;
    if (vb) { vb.disabled = true; if (label) label.textContent = tr('lp_ph_verifying'); }
    S.conf.confirm(code).then(function (cred) {
      if (gen !== S.gen) return null;
      if (S.mode === 'reauth') {
        var r = S.reauth; S.reauth = null;
        leavePhoneView(); closeModal();
        if (r) r.res();
        return null;
      }
      if (S.mode === 'link') {
        leavePhoneView(); closeModal();
        var u = (cred && cred.user) || authUser();
        if (u && u.phoneNumber) { try { firebase.firestore().collection('users').doc(u.uid).update({ phone: u.phoneNumber }).catch(function () { /* règles : on garde le lien de connexion */ }); } catch (e) { /* ignore */ } }
        toast(tr('lp_ph_linked'), 'success');
        renderMethods();
        return null;
      }
      return onSignedIn(cred).then(function (info) {
        if (gen !== S.gen) return;
        var isNew = (info && info.created) || (cred && cred.additionalUserInfo && cred.additionalUserInfo.isNewUser);
        var hasName = cred && cred.user && cred.user.displayName;
        if (isNew && !hasName) { goStep('name'); }
        else { leavePhoneView(); closeModal(); }
      });
    }).catch(function (e) {
      if (gen !== S.gen) return;
      try { console.log('[login-pro] code :', e && e.code, e && e.message); } catch (x) { /* ignore */ }
      showErr(errText(e));
      var inp = $('cn-ph-code'); if (inp) { inp.value = ''; try { inp.focus(); } catch (x) { /* ignore */ } }
    }).then(function () {
      S.verifying = false;
      if (vb) { vb.disabled = false; if (label) label.textContent = tr('lp_ph_verify'); }
    });
  }

  function submitName() {
    var name = (($('cn-ph-name') || {}).value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    var u = authUser();
    if (!name || !u) { leavePhoneView(); closeModal(); return; }
    try { firebase.firestore().collection('users').doc(u.uid).update({ name: name }).catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
    try { u.updateProfile({ displayName: name }).catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
    try { if (typeof syncPublicProfile === 'function') syncPublicProfile(u.uid, { name: name }); } catch (e) { /* ignore */ }
    try { if (typeof currentUser !== 'undefined' && currentUser) currentUser.name = name; } catch (e) { /* ignore */ }
    ['dash-name', 'profile-name'].forEach(function (id) { var n = $(id); if (n) n.textContent = name; });
    try { if (typeof refreshDashComposerAvatar === 'function') refreshDashComposerAvatar(); } catch (e) { /* ignore */ }
    leavePhoneView(); closeModal();
  }

  /* =================================================================
     8. CONFIRMER SON IDENTITÉ (avant suppression du compte, etc.)
     ================================================================= */
  function reauth() {
    var u = authUser();
    if (!u) return Promise.reject(codeErr('auth/requires-recent-login'));
    var ids = (u.providerData || []).map(function (p) { return p.providerId; });
    var order = ['phone', 'google.com', 'apple.com', 'facebook.com', 'microsoft.com'];
    var pick = '';
    for (var i = 0; i < order.length; i++) if (ids.indexOf(order[i]) >= 0) { pick = order[i]; break; }
    if (pick === 'phone' && u.phoneNumber) {
      return new Promise(function (res, rej) {
        if (S.reauth) { var old = S.reauth; S.reauth = null; old.rej(codeErr('auth/cancelled-popup-request')); }
        S.reauth = { res: res, rej: rej };
        openPhone('reauth');
      });
    }
    if (pick) return u.reauthenticateWithPopup(providerObj(pick));
    return Promise.reject(codeErr('auth/requires-recent-login'));
  }

  /* =================================================================
     9. CARTE « MES MOYENS DE CONNEXION » (Paramètres > Sécurité)
     ================================================================= */
  function linkProvider(id) {
    var u = authUser(); if (!u || busy) return;
    startBusy();
    var prov;
    try { prov = providerObj(id); } catch (e) { endBusy(); return; }
    var p;
    if (isApple() && proxied()) {
      lsSet(REDIR_KEY, JSON.stringify({ id: id, mode: 'link', at: Date.now() }));
      p = u.linkWithRedirect(prov);
    } else p = u.linkWithPopup(prov).then(function () { toast(tr('lp_linked_ok', { provider: provName(id) }), 'success'); return u.reload().catch(function () { /* ignore */ }); });
    Promise.resolve(p).catch(function (e) { lsSet(REDIR_KEY, null); toast(errText(e), 'error'); }).then(function () { endBusy(); renderMethods(); });
  }

  function renderMethods() {
    var host = $('section-security');
    if (!host) return;
    injectStyle();
    var u = authUser(), box = $('cn-methods');
    if (!u) { if (box) box.hidden = true; return; }
    if (!box) {
      box = document.createElement('div'); box.id = 'cn-methods'; box.className = 'lp-methods';
      var h3 = host.querySelector('h3');
      if (h3 && h3.parentNode === host) host.insertBefore(box, h3.nextSibling); else host.insertBefore(box, host.firstChild);
    }
    box.hidden = false;
    var have = {};
    (u.providerData || []).forEach(function (p) { have[p.providerId] = p; });
    var admin = isAdminUser(u);
    var html = '<p class="lp-m-sub">' + esc(tr('lp_acc_sub')) + '</p>';
    function row(id, name, detail, state) {
      var P = PROV[id];
      var ico = id === 'password'
        ? '<svg class="lp-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 6L2 7"/></svg>'
        : P.icon;
      var right = state === 'on' ? '<span class="lp-m-ok">' + esc(tr('lp_acc_linked')) + '</span>'
        : state === 'add' ? '<button type="button" class="btn btn-outline btn-sm" data-add="' + id + '">' + esc(tr('lp_acc_add')) + '</button>' : '';
      return '<div class="lp-m-row"><span class="lp-m-ico">' + ico + '</span><span class="lp-m-name">' + esc(name) + (detail ? '<small>' + esc(detail) + '</small>' : '') + '</span>' + right + '</div>';
    }
    if (have.password) html += row('password', tr('lp_acc_email'), u.email || '', 'on');
    html += row('google.com', 'Google', have['google.com'] ? (have['google.com'].email || '') : '', have['google.com'] ? 'on' : 'add');
    if (have.phone || has('phone') || admin) html += row('phone', tr('lp_acc_phone'), have.phone ? prettyPhone(u.phoneNumber || '') : '', have.phone ? 'on' : 'add');
    ['apple.com', 'facebook.com', 'microsoft.com'].forEach(function (id) {
      var key = id.split('.')[0];
      if (have[id] || has(key) || admin) html += row(id, provName(id), have[id] ? (have[id].email || '') : '', have[id] ? 'on' : 'add');
    });
    box.innerHTML = html;
    box.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-add');
        if (id === 'phone') openPhone('link'); else linkProvider(id);
      });
    });
    applyAccountVisibility(u, have);
  }

  // Compte sans mot de passe (Google, Apple, numéro…) : on cache les champs « mot de passe » qui ne servent à rien.
  function fieldOf(id) { var e = $(id); return e ? (e.closest('.field') || e.parentNode) : null; }
  function setHidden(node, on) { if (node) node.style.display = on ? 'none' : ''; }
  function applyAccountVisibility(u, have) {
    var noPw = !have.password;
    setHidden(fieldOf('account-pass-current'), noPw);
    setHidden(fieldOf('account-pass-new'), noPw);
    setHidden(document.querySelector('#section-security button[onclick*="saveAccountPassword"]'), noPw);
    setHidden($('account-pass-msg'), noPw);
    setHidden(fieldOf('account-email-input'), noPw);
    setHidden(fieldOf('account-email-currentpass'), noPw);
    setHidden(document.querySelector('#section-editaccount button[onclick*="saveAccountEmail"]'), noPw);
    setHidden($('account-email-msg'), noPw);
    setHidden(fieldOf('delete-account-pass'), noPw);
    var host = $('section-security'), note = $('cn-nopass-note');
    if (!host) return;
    if (noPw) {
      var m = '';
      var order = ['phone', 'google.com', 'apple.com', 'facebook.com', 'microsoft.com'];
      for (var i = 0; i < order.length; i++) if (have[order[i]]) { m = order[i] === 'phone' ? tr('lp_m_phone') : provName(order[i]); break; }
      if (!note) {
        note = document.createElement('p'); note.id = 'cn-nopass-note'; note.className = 'lp-m-note';
        var anchor = host.querySelector('button[onclick*="saveAccountPassword"]');
        if (anchor) anchor.parentNode.insertBefore(note, anchor); else host.appendChild(note);
      }
      note.textContent = tr('lp_acc_nopass', { m: m }) + ' ' + tr('lp_acc_delete_note');
      note.style.display = '';
    } else if (note) note.style.display = 'none';
  }

  /* =================================================================
     10. BRANCHEMENT SUR L'EXISTANT
     ================================================================= */
  function onOpen() {
    injectStyle();
    loadConfig(false);
    renderProviders();
    buildPhonePanel();
    // Retour à l'écran principal si on rouvre la fenêtre normalement
    if (!S.reauth && S.mode !== 'link') leavePhoneView();
    setCopy();
  }
  function onClose() {
    leavePhoneView();
    if (S.reauth) { var r = S.reauth; S.reauth = null; r.rej(codeErr('auth/user-cancelled')); }
    S.mode = 'login';
  }

  var origOpen = window.openAuth;
  if (typeof origOpen === 'function') {
    window.openAuth = function () {
      S.mode = 'login';
      var r = origOpen.apply(this, arguments);
      try { onOpen(); } catch (e) { /* ignore */ }
      return r;
    };
  }
  var origClose = window.closeAuth;
  if (typeof origClose === 'function') {
    window.closeAuth = function () {
      var r = origClose.apply(this, arguments);
      try { onClose(); } catch (e) { /* ignore */ }
      return r;
    };
  }
  var origLoading = window.setAuthLoading;
  if (typeof origLoading === 'function') {
    window.setAuthLoading = function (on) {
      var r = origLoading.apply(this, arguments);
      try { document.querySelectorAll('#cn-prov button,#cn-prov-top button').forEach(function (b) { b.disabled = !!on; }); } catch (e) { /* ignore */ }
      return r;
    };
  }
  var origFill = window.fillAccountForm;
  if (typeof origFill === 'function') {
    window.fillAccountForm = function () {
      var r = origFill.apply(this, arguments);
      try { renderMethods(); } catch (e) { /* ignore */ }
      return r;
    };
  }
  var origFriendly = window.friendlyAuthError;
  if (typeof origFriendly === 'function') {
    var KEEP = ['auth/wrong-password', 'auth/email-already-in-use', 'auth/invalid-email', 'auth/weak-password'];
    window.friendlyAuthError = function (e) {
      var c = e && e.code;
      if (KEEP.indexOf(c) >= 0) return origFriendly(e);
      var k = errorKey(c, e && e.message);
      return k ? tr(k) : origFriendly(e);
    };
  }
  // Compte sans e-mail (numéro de téléphone) : les textes de langue du modal d'inscription restent inchangés.
  window.cnReauth = reauth;
  window.cnAccountMethods = renderMethods;
  window.cnLoginPro = { onOpen: onOpen, onClose: onClose, has: has, reload: function () { loadConfig(true); }, errorKey: errorKey };

  // Changement de langue : on réécrit les textes dynamiques.
  var origChangeLang = window.changeLanguage;
  if (typeof origChangeLang === 'function') {
    window.changeLanguage = function () {
      var r = origChangeLang.apply(this, arguments);
      try { renderProviders(); setCopy(); if ($('cn-phone')) { fillCountries(($('cn-ph-country') || {}).value); $('cn-phone').querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = tr(n.getAttribute('data-i18n')); }); } renderMethods(); } catch (e) { /* ignore */ }
      return r;
    };
  }

  function boot() {
    injectStyle();
    loadConfig(true);
    renderProviders();
    handleRedirectReturn();
    try {
      if (ready()) firebase.auth().onAuthStateChanged(function (u) {
        if (u) { tryLinkPending(u); renderMethods(); } else { var b = $('cn-methods'); if (b) b.hidden = true; }
      });
    } catch (e) { /* ignore */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
