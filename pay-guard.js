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

  // Pays et opérateurs réellement pris en charge par MboтePay (même liste que api/payment-initiate.js)
  var COVERED = {
    CD: ['Vodacom M-Pesa', 'Airtel Money', 'Orange Money'],
    BJ: ['MTN Mobile Money', 'Moov Money'],
    CI: ['MTN Mobile Money', 'Orange Money'],
    CM: ['MTN Mobile Money'],
    CG: ['Airtel Money', 'MTN Mobile Money'],
    GA: ['Airtel Money'],
    SN: ['Orange Money', 'Free Money'],
    KE: ['M-Pesa (Safaricom)'],
    RW: ['Airtel Money', 'MTN Mobile Money'],
    UG: ['Airtel Money', 'MTN Mobile Money'],
    ZM: ['Airtel Money', 'MTN Mobile Money'],
    SL: ['Orange Money']
  };

  var TXT = {
    fr: { country: "Le Mobile Money n'est pas encore disponible dans ton pays. Pas de souci : tu peux payer par carte bancaire ou par crypto, ça fonctionne partout.", operator: "Cet opérateur n'est pas disponible pour le moment. Choisis {ops}, ou utilise la crypto.", cta: 'Payer par crypto', card: 'Payer par carte' },
    en: { country: 'Mobile Money is not available in your country yet. No worries: you can pay by bank card or crypto, both work everywhere.', operator: 'This operator is not available right now. Choose {ops}, or use crypto.', cta: 'Pay with crypto', card: 'Pay by card' },
    es: { country: 'Mobile Money aún no está disponible en tu país. Sin problema: puedes pagar con tarjeta bancaria o cripto, funcionan en todas partes.', operator: 'Este operador no está disponible por ahora. Elige {ops} o usa cripto.', cta: 'Pagar con cripto', card: 'Pagar con tarjeta' },
    it: { country: 'Mobile Money non è ancora disponibile nel tuo paese. Nessun problema: puoi pagare con carta bancaria o cripto, funzionano ovunque.', operator: 'Questo operatore al momento non è disponibile. Scegli {ops} oppure usa la cripto.', cta: 'Paga in cripto', card: 'Paga con carta' },
    pt: { country: 'O Mobile Money ainda não está disponível no seu país. Sem problema: pode pagar com cartão bancário ou cripto, funcionam em qualquer lugar.', operator: 'Este operador não está disponível no momento. Escolha {ops} ou use cripto.', cta: 'Pagar com cripto', card: 'Pagar com cartão' }
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
  function show(html) {
    var el = box(); if (!el) return;
    var cardOk = false; try { cardOk = typeof CARD_VIA_OPT !== 'undefined' && CARD_VIA_OPT; } catch (e) { /* ignore */ }
    el.innerHTML = '<div class="cn-pay-notice-text">' + html + '</div><div class="cn-pay-notice-cta">' +
      (cardOk ? '<button type="button" class="cn-cta-card" data-cn-card="1">' + esc(tx('card')) + '</button>' : '') +
      '<button type="button" class="cn-cta-crypto" data-cn-crypto="1">' + esc(tx('cta')) + '</button></div>';
    el.style.display = 'block';
  }

  function evaluate() {
    if (typeof payMethod === 'undefined' || payMethod !== 'mobile') { hide(); return; }
    var code = (typeof payCountryCode !== 'undefined') ? payCountryCode : null;
    if (!code) { hide(); return; }
    if (!COVERED[code]) { show(esc(tx('country'))); setUncovered(true); setSubmit(false); return; }
    setUncovered(false);
    var op = (typeof payOperator !== 'undefined') ? payOperator : null;
    if (op && COVERED[code].indexOf(op) < 0) {
      show(esc(tx('operator', { ops: COVERED[code].join(' / ') }))); setSubmit(false); return;
    }
    hide();
  }

  function wrap(name) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () { var r = orig.apply(this, arguments); try { evaluate(); } catch (e) { /* ignore */ } return r; };
  }
  ['onPayCountryChange', 'selectOperator', 'selectPayMethod', 'showRecharge'].forEach(wrap);

  // Blocage propre à l'envoi : aucune demande « manuelle » silencieuse pour un pays non couvert
  var origSubmit = window.submitRecharge;
  if (typeof origSubmit === 'function') {
    window.submitRecharge = function () {
      try {
        if (typeof payMethod !== 'undefined' && payMethod === 'mobile' && typeof payCountryCode !== 'undefined' && payCountryCode) {
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
