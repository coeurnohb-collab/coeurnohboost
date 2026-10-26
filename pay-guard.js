/* =====================================================================
   pay-guard.js — Recharge par Mobile Money : pays non couvert
   Chargé par menu-pro.js après script.js. N'écrase rien : il ajoute un message
   clair et un bouton « Payer par crypto » dès que la personne choisit un pays
   (ou un opérateur) que le Mobile Money ne couvre pas, au lieu de la laisser
   remplir le formulaire pour rien.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnPayGuard) return;
  window.__cnPayGuard = true;

  // Pays et opérateurs réellement pris en charge par MboтePay (même liste que api/payment-initiate.js,
  // vérifiée sur docs.mbotepay.com : 12 pays, 22 opérateurs)
  var COVERED = {
    CD: ['Vodacom M-Pesa', 'Airtel Money', 'Orange Money']
  };

  // Pays où le Mobile Money passe par la page de paiement sécurisée OPTGateway (hors RDC, qui reste en direct).
  // Liste unique définie dans script.js (OPT_MOBILE_CODES), même liste que api/payment-initiate.js.
  function isOptMobile(code) {
    try { return typeof OPT_MOBILE_CODES !== 'undefined' && code !== 'CD' && OPT_MOBILE_CODES.indexOf(code) >= 0; } catch (e) { return false; }
  }

  var TXT = {
    fr: { country: "Le Mobile Money n'est pas encore disponible dans ton pays. Pas de souci : tu peux payer par carte bancaire ou par crypto, ça fonctionne partout.", operator: "{op} n'est pas encore disponible dans ce pays. Pour recharger tout de suite, choisis {ops}, ou paie par carte ou par crypto : c'est rapide et sécurisé.", cta: 'Payer par crypto', card: 'Payer par carte' },
    en: { country: 'Mobile Money is not available in your country yet. No worries: you can pay by bank card or crypto, both work everywhere.', operator: '{op} is not available in this country yet. To top up right away, choose {ops}, or pay by card or crypto: fast and secure.', cta: 'Pay with crypto', card: 'Pay by card' },
    es: { country: 'Mobile Money aún no está disponible en tu país. Sin problema: puedes pagar con tarjeta bancaria o cripto, funcionan en todas partes.', operator: '{op} aún no está disponible en este país. Para recargar ya, elige {ops} o paga con tarjeta o cripto: rápido y seguro.', cta: 'Pagar con cripto', card: 'Pagar con tarjeta' },
    it: { country: 'Mobile Money non è ancora disponibile nel tuo paese. Nessun problema: puoi pagare con carta bancaria o cripto, funzionano ovunque.', operator: '{op} non è ancora disponibile in questo paese. Per ricaricare subito, scegli {ops} oppure paga con carta o cripto: rapido e sicuro.', cta: 'Paga in cripto', card: 'Paga con carta' },
    pt: { country: 'O Mobile Money ainda não está disponível no seu país. Sem problema: pode pagar com cartão bancário ou cripto, funcionam em qualquer lugar.', operator: '{op} ainda não está disponível neste país. Para recarregar já, escolha {ops} ou pague com cartão ou cripto: rápido e seguro.', cta: 'Pagar com cripto', card: 'Pagar com cartão' }
  };
  function lang() { try { if (typeof currentLang !== 'undefined' && TXT[currentLang]) return currentLang; } catch (e) { /* ignore */ } return 'fr'; }
  function tx(k, v) { var s = TXT[lang()][k] || TXT.fr[k]; if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]); return s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function box() {
    var el = document.getElementById('cn-pay-notice');
    if (el) return el;
    var anchor = document.getElementById('pay-operators');
    if (!anchor || !anchor.parentNode) return null;
    el = document.createElement('div');
    el.id = 'cn-pay-notice';
    el.setAttribute('role', 'status');
    el.className = 'cn-pay-notice';
    el.style.display = 'none';
    el.addEventListener('click', function (ev) {
      if (typeof selectPayMethod !== 'function' || !ev.target || !ev.target.closest) return;
      var o = ev.target.closest('[data-cn-op]');
      if (o) { selectOperator(o.getAttribute('data-cn-op')); return; }
      var c = ev.target.closest('[data-cn-crypto]');
      if (c) { selectPayMethod('crypto'); hide(); return; }
      var k = ev.target.closest('[data-cn-card]');
      if (k) { selectPayMethod('card'); hide(); }
    });
    anchor.parentNode.insertBefore(el, anchor);
    return el;
  }
  function setUncovered(on) { var v = document.getElementById('view-recharge'); if (v) v.classList.toggle('cn-uncovered', !!on); }
  function hide() { var el = document.getElementById('cn-pay-notice'); if (el) el.style.display = 'none'; setUncovered(false); setSubmit(true); }
  function setSubmit(ok) {
    var b = document.getElementById('recharge-submit-btn');
    if (b) { b.style.opacity = ok ? '' : '.5'; b.setAttribute('aria-disabled', ok ? 'false' : 'true'); }
  }
  function show(html, alts) {
    var el = box(); if (!el) return;
    var cardOk = false; try { cardOk = typeof CARD_VIA_OPT !== 'undefined' && CARD_VIA_OPT; } catch (e) { /* ignore */ }
    var altBtns = (alts || []).map(function (a) { return '<button type="button" class="cn-cta-op" data-cn-op="' + esc(a) + '" style="margin:0 6px 8px 0;padding:9px 14px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-weight:700;cursor:pointer">' + esc(a) + '</button>'; }).join('');
    el.innerHTML = '<div class="cn-pay-notice-text">' + html + '</div>' + (altBtns ? '<div class="cn-pay-notice-alts" style="margin:10px 0 4px">' + altBtns + '</div>' : '') + '<div class="cn-pay-notice-cta">' +
      (cardOk ? '<button type="button" class="cn-cta-card" data-cn-card="1">' + esc(tx('card')) + '</button>' : '') +
      '<button type="button" class="cn-cta-crypto" data-cn-crypto="1">' + esc(tx('cta')) + '</button></div>';
    el.style.display = 'block';
  }

  function evaluate() {
    if (typeof payMethod === 'undefined' || payMethod !== 'mobile') { hide(); return; }
    var code = (typeof payCountryCode !== 'undefined') ? payCountryCode : null;
    if (!code) { hide(); return; }
    if (isOptMobile(code)) { hide(); return; }
    if (!COVERED[code]) { show(esc(tx('country'))); setUncovered(true); setSubmit(false); return; }
    setUncovered(false);
    var op = (typeof payOperator !== 'undefined') ? payOperator : null;
    if (op && COVERED[code].indexOf(op) < 0) {
      show(esc(tx('operator', { op: op, ops: COVERED[code].join(' / ') })), COVERED[code]); setSubmit(false); return;
    }
    hide();
  }

  function wrap(name) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () { var r = orig.apply(this, arguments); try { evaluate(); } catch (e) { /* ignore */ } return r; };
  }
  // Garde tous les opérateurs visibles (le message explique ceux qui ne sont pas encore ouverts)
  // et ajoute ceux que MbotePay prend en charge mais que l'écran ne proposait pas encore (ex. Zamtel).
  function syncOperators() {
    var code = (typeof payCountryCode !== 'undefined') ? payCountryCode : null;
    var list = code && COVERED[code]; var wrapEl = document.getElementById('pay-operators');
    if (!list || !wrapEl) return;
    var present = {};
    [].slice.call(wrapEl.querySelectorAll('.op-card')).forEach(function (card) {
      var n = card.querySelector('.op-name'); var name = n ? n.textContent.trim() : '';
      present[name] = 1;
    });
    list.forEach(function (name) {
      if (present[name]) return;
      try {
        var b = getOperatorBadge(name);
        var d = document.createElement('div');
        d.className = 'op-card' + (name === payOperator ? ' active' : '');
        d.setAttribute('onclick', "selectOperator('" + name.replace(/'/g, "\\'") + "')");
        d.innerHTML = '<div class="op-icon" style="background:linear-gradient(135deg,' + b.bg + ',' + (b.bg2 || b.bg) + ')">' + badgeInner(b) + '</div><span class="op-name">' + esc(name) + '</span>';
        wrapEl.appendChild(d);
      } catch (e) { /* on garde l'affichage d'origine */ }
    });
  }
  (function () {
    var origRender = window.renderPayOperators;
    if (typeof origRender !== 'function') return;
    window.renderPayOperators = function () { var r = origRender.apply(this, arguments); try { syncOperators(); } catch (e) { /* ignore */ } return r; };
  })();

  ['onPayCountryChange', 'selectOperator', 'selectPayMethod', 'showRecharge'].forEach(wrap);

  // Blocage propre à l'envoi : aucune demande « manuelle » silencieuse pour un pays non couvert
  var origSubmit = window.submitRecharge;
  if (typeof origSubmit === 'function') {
    window.submitRecharge = function () {
      try {
        // Pays OPTGateway : aucun blocage, l'opérateur se choisit sur la page de paiement sécurisée.
        if (typeof payMethod !== 'undefined' && payMethod === 'mobile' && typeof payCountryCode !== 'undefined' && payCountryCode && !isOptMobile(payCountryCode)) {
          var ops = COVERED[payCountryCode];
          if (!ops || (typeof payOperator !== 'undefined' && payOperator && ops.indexOf(payOperator) < 0)) {
            evaluate();
            var n = document.getElementById('cn-pay-notice'); if (n && n.scrollIntoView) n.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return undefined;
          }
        }
      } catch (e) { /* on laisse la fonction d'origine faire son travail */ }
      return origSubmit.apply(this, arguments);
    };
  }
})();
