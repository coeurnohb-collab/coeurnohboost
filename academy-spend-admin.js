/* Coeurnoh Universe — Académie : contrôle des dépenses IA (page administrateur uniquement).
   Affiche la consommation du tuteur (aujourd'hui, mois, 14 jours, élèves les plus actifs), permet de fixer des plafonds
   (par jour, par mois, par élève) et de couper / rouvrir le tuteur en un geste. Les montants sont des ESTIMATIONS
   calculées à partir des tokens renvoyés par le fournisseur ; la facture réelle reste celle du fournisseur.
   Lit via l'action serveur « academy_spend » (réservée à l'admin) ; écrit les plafonds dans app_config/academy_ai. */
(function () {
  'use strict';
  if (window.__cnSpendAdmin) return; window.__cnSpendAdmin = true;
  var tries = 0;
  function go() { var tab = document.getElementById('admin-tab-academy'); if (!tab || typeof db === 'undefined' || typeof auth === 'undefined') { if (++tries < 120) setTimeout(go, 250); return; } main(tab); }
  function main(tab) {
    function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
    function usd(n) { n = Number(n) || 0; return n.toFixed(n > 0 && n < 0.01 ? 4 : 2) + ' $'; }
    function usd2(n) { return (Number(n) || 0).toFixed(2) + ' $'; }
    var KIND = { plan: 'Parcours', lesson: 'Leçons', tutor: 'Tuteur', other: 'Autre' };
    var st = document.createElement('style');
    st.textContent = '.sp-g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.sp-g div{background:#f3f5f9;border-radius:12px;padding:10px;text-align:center}.sp-g b{display:block;font-size:1.05rem}.sp-g small{font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#5d6779}' +
      '.sp-meter{height:10px;border-radius:6px;background:#e3e8f0;overflow:hidden;margin:6px 0 2px}.sp-meter i{display:block;height:100%;background:#1b4fd8}.sp-meter i.w{background:#e8890c}.sp-meter i.x{background:#d7263d}' +
      '.sp-bars{display:flex;align-items:flex-end;gap:4px;height:90px;margin:10px 0 2px}.sp-bars span{flex:1;background:#1b4fd8;border-radius:3px 3px 0 0;min-height:2px}.sp-lab{display:flex;justify-content:space-between;font-size:.66rem;color:#5d6779}' +
      '.sp-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #e3e8f0;font-size:.88rem}.sp-state{border-radius:12px;padding:10px 12px;font-weight:700;margin-bottom:10px}.sp-state.on{background:#e3f6ec;color:#0b5c3d}.sp-state.off{background:#fde5e8;color:#8c1223}';
    document.head.appendChild(st);
    var box = document.createElement('div'); box.className = 'order-box'; box.id = 'sp-box'; box.style.marginBottom = '14px';
    var first = tab.querySelector('.order-box'); if (first) tab.insertBefore(box, first); else tab.appendChild(box);
    box.innerHTML = '<h3 style="margin:0 0 4px">Contrôle des dépenses IA</h3><p class="muted small">Chargement…</p>';

    async function api(action, body) {
      var idToken = await auth.currentUser.getIdToken();
      var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: idToken, action: action }, body)) });
      var j = await r.json(); if (!j.success) throw new Error(j.error || 'Erreur'); return j;
    }
    function meter(val, cap) {
      if (!(cap > 0)) return '<p class="muted small" style="margin:2px 0 8px">Aucun plafond défini.</p>';
      var p = Math.min(100, val / cap * 100);
      return '<div class="sp-meter"><i class="' + (p >= 100 ? 'x' : p >= 80 ? 'w' : '') + '" style="width:' + p.toFixed(1) + '%"></div><div class="muted small" style="margin-bottom:8px">' + usd2(val) + ' sur ' + usd2(cap) + ' (' + Math.round(p) + ' %)</div>';
    }
    var enabled = true;
    async function load() {
      try {
        var [r, cs] = await Promise.all([api('academy_spend', {}), db.collection('app_config').doc('academy_ai').get()]);
        enabled = !(cs.exists && cs.data().enabled === false);
        var c = r.config, t = r.today, m = r.month, max = Math.max.apply(null, r.days.map(function (d) { return d.costUsd; }).concat([0.0001]));
        var kinds = Object.keys(m.byKind || {}).map(function (k) { return '<div class="sp-row"><span>' + esc(KIND[k] || k) + '</span><span>' + (m.byKind[k].calls || 0) + ' appels · ' + usd(m.byKind[k].costUsd) + '</span></div>'; }).join('');
        var users = r.topUsers.map(function (u) { return '<div class="sp-row"><span>' + esc(u.name || u.uid.slice(0, 8)) + '</span><span>' + u.calls + ' appels · ' + usd(u.costUsd) + '</span></div>'; }).join('');
        var days = r.days.slice().reverse();
        box.innerHTML = '<h3 style="margin:0 0 4px">Contrôle des dépenses IA</h3><p class="muted small" style="margin:0 0 10px">Estimation du coût du tuteur, d’après les tokens réellement consommés. La facture exacte reste celle de votre fournisseur d’IA.</p>' +
          '<div class="sp-state ' + (enabled ? 'on' : 'off') + '">' + (enabled ? 'Tuteur ouvert aux élèves' : 'Tuteur fermé : aucun appel IA n’est possible') + '</div>' +
          '<button type="button" class="btn btn-outline btn-sm" id="sp-toggle">' + (enabled ? 'Couper le tuteur maintenant' : 'Rouvrir le tuteur') + '</button>' +
          '<div class="sp-g"><div><b>' + usd(t.costUsd) + '</b><small>Aujourd’hui</small></div><div><b>' + usd(m.costUsd) + '</b><small>Ce mois-ci</small></div><div><b>' + t.calls + '</b><small>Appels du jour</small></div></div>' +
          '<div class="muted small">Plafond du jour</div>' + meter(t.costUsd, c.dailyBudgetUsd) + '<div class="muted small">Plafond du mois</div>' + meter(m.costUsd, c.monthlyBudgetUsd) +
          (t.blocked ? '<p class="muted small">' + t.blocked + ' demande(s) bloquée(s) aujourd’hui par un plafond.</p>' : '') + (t.errors ? '<p class="muted small">' + t.errors + ' appel(s) en erreur aujourd’hui (non facturés ici).</p>' : '') +
          '<h4 style="margin:14px 0 0">14 derniers jours</h4><div class="sp-bars">' + days.map(function (d) { return '<span title="' + esc(d.day) + ' : ' + usd(d.costUsd) + '" style="height:' + Math.max(2, d.costUsd / max * 100) + '%"></span>'; }).join('') + '</div><div class="sp-lab"><span>' + esc(days[0].day.slice(5)) + '</span><span>' + esc(days[days.length - 1].day.slice(5)) + '</span></div>' +
          (kinds ? '<h4 style="margin:14px 0 4px">Ce mois-ci, par usage</h4>' + kinds : '') + (users ? '<h4 style="margin:14px 0 4px">Élèves les plus actifs aujourd’hui</h4>' + users : '') +
          '<h4 style="margin:16px 0 6px">Plafonds de sécurité</h4><p class="muted small" style="margin:0 0 8px">Quand un plafond est atteint, le tuteur se met en pause pour tous (ou pour l’élève concerné) et rien n’est décompté. Laissez vide ou 0 pour ne pas limiter.</p>' +
          '<div class="field"><label>Plafond par jour ($)</label><input type="number" id="sp-day" class="text-input" min="0" step="0.5" value="' + (c.dailyBudgetUsd || '') + '"></div>' +
          '<div class="field"><label>Plafond par mois ($)</label><input type="number" id="sp-month" class="text-input" min="0" step="1" value="' + (c.monthlyBudgetUsd || '') + '"></div>' +
          '<div class="field"><label>Plafond par élève et par jour ($)</label><input type="number" id="sp-user" class="text-input" min="0" step="0.05" value="' + (c.perUserDailyUsd || '') + '"></div>' +
          '<details style="margin:6px 0 10px"><summary class="muted small" style="cursor:pointer">Réglage avancé : prix du fournisseur</summary><p class="muted small">Prix en dollars pour un million de tokens. Laissez vide pour utiliser les tarifs par défaut.</p><div class="field"><label>Entrée ($ / million)</label><input type="number" id="sp-pin" class="text-input" min="0" step="0.01" value="' + (c.priceInPerM || '') + '"></div><div class="field"><label>Sortie ($ / million)</label><input type="number" id="sp-pout" class="text-input" min="0" step="0.01" value="' + (c.priceOutPerM || '') + '"></div></details>' +
          '<button type="button" class="btn btn-primary" id="sp-save" style="width:100%;justify-content:center">Enregistrer les plafonds</button><p class="muted small" id="sp-msg" style="margin-top:6px"></p><button type="button" class="btn btn-outline btn-sm" id="sp-refresh" style="margin-top:6px">Actualiser</button>';
        box.querySelector('#sp-toggle').onclick = toggle; box.querySelector('#sp-save').onclick = save; box.querySelector('#sp-refresh').onclick = load;
      } catch (e) { box.innerHTML = '<h3 style="margin:0 0 4px">Contrôle des dépenses IA</h3><p class="muted small">Indisponible : ' + esc(e.message) + ' <button type="button" class="btn btn-outline btn-sm" id="sp-retry">Réessayer</button></p>'; var b = box.querySelector('#sp-retry'); if (b) b.onclick = load; }
    }
    async function toggle() {
      var next = !enabled;
      if (!next && !confirm('Couper le tuteur ? Les élèves ne pourront plus générer de leçons ni poser de questions.')) return;
      try { await db.collection('app_config').doc('academy_ai').set({ enabled: next, updatedAt: new Date().toISOString() }, { merge: true }); load(); } catch (e) { alert('Erreur : ' + e.message); }
    }
    async function save() {
      var v = function (id) { var n = parseFloat(document.getElementById(id).value); return Number.isFinite(n) && n > 0 ? n : 0; }, msg = document.getElementById('sp-msg');
      try {
        await db.collection('app_config').doc('academy_ai').set({ dailyBudgetUsd: v('sp-day'), monthlyBudgetUsd: v('sp-month'), perUserDailyUsd: v('sp-user'), priceInPerM: v('sp-pin'), priceOutPerM: v('sp-pout'), updatedAt: new Date().toISOString() }, { merge: true });
        msg.textContent = 'Plafonds enregistrés : appliqués dans les secondes qui suivent.'; setTimeout(load, 1200);
      } catch (e) { msg.textContent = 'Erreur : ' + e.message; }
    }
    var shown = !tab.classList.contains('hidden');
    new MutationObserver(function () { var now = !tab.classList.contains('hidden'); if (now && !shown) load(); shown = now; }).observe(tab, { attributes: true, attributeFilter: ['class'] });
    if (shown) load();
  }
  go();
})();
