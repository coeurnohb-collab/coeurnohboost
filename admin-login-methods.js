/* Coeurnoh Universe — Administration : moyens de connexion (page administrateur uniquement).
   Une carte en haut de l'onglet « Utilisateurs » avec un interrupteur par moyen de connexion : numéro de téléphone (SMS),
   Apple (iCloud), Facebook, Microsoft. Google et e-mail + mot de passe restent toujours actifs.
   Les réglages sont écrits dans Firestore : pricing/auth_methods (collection déjà lisible par l'écran de connexion). */
(function () {
  'use strict';
  if (window.__cnLoginAdmin) return; window.__cnLoginAdmin = true;
  var tries = 0;
  function go() {
    var tab = document.getElementById('admin-tab-users');
    if (!tab || typeof db === 'undefined' || typeof auth === 'undefined') { if (++tries < 120) setTimeout(go, 250); return; }
    main(tab);
  }
  function main(tab) {
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    var METHODS = [
      { id: 'phone', name: 'Numéro de téléphone (code SMS)', hint: 'Pour les personnes sans e-mail. Demande le forfait Blaze de Firebase : les SMS sont payants.' },
      { id: 'apple', name: 'Apple (iCloud)', hint: 'Pour les iPhone. Demande un compte Apple Developer (99 $ par an).' },
      { id: 'facebook', name: 'Facebook', hint: 'Demande une application Facebook en mode « Live ».' },
      { id: 'microsoft', name: 'Microsoft', hint: 'Demande une inscription d’application dans Azure.' }
    ];
    var st = document.createElement('style');
    st.textContent =
      '.lm-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #e3e8f0}.lm-row:first-of-type{border-top:0}' +
      '.lm-txt{flex:1;min-width:0}.lm-txt b{display:block;font-size:.95rem}.lm-txt small{display:block;color:#5d6779;font-size:.8rem;line-height:1.4;margin-top:2px}' +
      '.lm-sw{appearance:none;-webkit-appearance:none;flex:none;width:48px;height:28px;border-radius:99px;background:#c3cad6;position:relative;cursor:pointer;border:0;outline-offset:3px;transition:background .15s}' +
      '.lm-sw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .15s}' +
      '.lm-sw:checked{background:#15803d}.lm-sw:checked::after{transform:translateX(20px)}' +
      '.lm-fixed{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #e3e8f0}.lm-fixed span.ok{font-size:.8rem;font-weight:700;color:#15803d}' +
      '.lm-note{background:#f3f5f9;border-radius:12px;padding:10px 12px;font-size:.84rem;line-height:1.5;margin:10px 0}' +
      '@media (prefers-reduced-motion:reduce){.lm-sw,.lm-sw::after{transition:none}}';
    document.head.appendChild(st);

    var box = document.createElement('div'); box.className = 'order-box'; box.id = 'lm-box'; box.style.marginBottom = '14px';
    var first = tab.querySelector('.order-box'); if (first) tab.insertBefore(box, first); else tab.appendChild(box);

    function render(cfg) {
      var rows = METHODS.map(function (m) {
        return '<label class="lm-row"><span class="lm-txt"><b>' + esc(m.name) + '</b><small>' + esc(m.hint) + '</small></span>' +
          '<input type="checkbox" class="lm-sw" data-m="' + m.id + '" role="switch" aria-label="' + esc(m.name) + '"' + (cfg[m.id] === true ? ' checked' : '') + '></label>';
      }).join('');
      box.innerHTML =
        '<h3 style="margin:0 0 4px">Moyens de connexion</h3>' +
        '<p class="muted small" style="margin:0 0 6px">Choisis ce que les membres voient sur l’écran de connexion. Google et e-mail restent toujours disponibles.</p>' +
        '<div class="lm-fixed"><span class="lm-txt"><b>Google</b></span><span class="ok">Toujours actif</span></div>' +
        '<div class="lm-fixed"><span class="lm-txt"><b>E-mail et mot de passe</b></span><span class="ok">Toujours actif</span></div>' +
        rows +
        '<div class="lm-note">N’active un moyen ici <b>qu’après l’avoir activé dans Firebase</b> (Authentication, Sign-in method). Sinon, les membres qui le touchent verront un message d’erreur.</div>' +
        '<button type="button" class="btn btn-primary" id="lm-save" style="width:100%;justify-content:center">Enregistrer</button>' +
        '<p class="muted small" id="lm-msg" style="margin-top:8px" role="status"></p>' +
        '<p class="muted small" style="margin-top:6px">Pour tester avant d’ouvrir à tout le monde : ouvre l’application avec <b>?lp=all</b> à la fin de l’adresse (tous les boutons apparaissent sur ton appareil uniquement).</p>';
      box.querySelector('#lm-save').onclick = save;
    }
    function readForm() {
      var o = { google: true, email: true };
      METHODS.forEach(function (m) { var c = box.querySelector('[data-m="' + m.id + '"]'); o[m.id] = !!(c && c.checked); });
      return o;
    }
    async function save() {
      var msg = box.querySelector('#lm-msg'), btn = box.querySelector('#lm-save');
      var data = readForm();
      data.updatedAt = new Date().toISOString();
      try { data.updatedBy = auth.currentUser ? auth.currentUser.uid : null; } catch (e) { /* ignore */ }
      btn.disabled = true; msg.style.color = ''; msg.textContent = 'Enregistrement…';
      try {
        await db.collection('pricing').doc('auth_methods').set(data);
        msg.style.color = '#15803d';
        msg.textContent = 'Enregistré. Les membres verront le changement à leur prochaine ouverture de l’application.';
      } catch (e) {
        msg.style.color = '#c3183f';
        msg.textContent = 'Impossible d’enregistrer : ' + (e && e.code === 'permission-denied' ? 'ton compte n’a pas la permission (compte administrateur requis).' : (e && e.message) || 'erreur inconnue');
      } finally { btn.disabled = false; }
    }
    async function load() {
      var cfg = {};
      try { var snap = await db.collection('pricing').doc('auth_methods').get(); if (snap.exists) cfg = snap.data() || {}; } catch (e) { /* on affiche tout éteint */ }
      render(cfg);
    }
    box.innerHTML = '<h3 style="margin:0 0 4px">Moyens de connexion</h3><p class="muted small">Chargement…</p>';
    load();
  }
  go();
})();
