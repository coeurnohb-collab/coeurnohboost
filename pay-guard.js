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
    fr: { country: "Le paiement par Mobile Money n'est pas encore disponible dans ton pays. Pas de souci : le paiement par crypto fonctionne partout.", operator: "Cet opérateur n'est pas disponible pour le moment. Choisis {ops}, ou utilise la crypto.", cta: 'Payer par crypto' },
    en: { country: 'Mobile Money payment is not available in your country yet. No worries: crypto payment works everywhere.', operator: 'This operator is not available right now. Choose {ops}, or use crypto.', cta: 'Pay with crypto' },
    es: { country: 'El pago por Mobile Money aún no está disponible en tu país. Sin problema: el pago con cripto funciona en todas partes.', operator: 'Este operador no está disponible por ahora. Elige {ops} o usa cripto.', cta: 'Pagar con cripto' },
    it: { country: 'Il pagamento con Mobile Money non è ancora disponibile nel tuo paese. Nessun problema: il pagamento in cripto funziona ovunque.', operator: 'Questo operatore al momento non è disponibile. Scegli {ops} oppure usa la cripto.', cta: 'Paga in cripto' },
    pt: { country: 'O pagamento por Mobile Money ainda não está disponível no seu país. Sem problema: o pagamento em cripto funciona em qualquer lugar.', operator: 'Este operador não está disponível no momento. Escolha {ops} ou use cripto.', cta: 'Pagar com cripto' }
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
    el.style.cssText = 'display:none;margin:12px 0;padding:14px 16px;border-radius:14px;background:#fff8e6;border:1px solid #ffe3a3;color:#7a4a00;font-size:.9rem;line-height:1.5';
    el.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-cn-crypto]') : null;
      if (b && typeof selectPayMethod === 'function') { selectPayMethod('crypto'); hide(); }
    });
    anchor.parentNode.insertBefore(el, anchor);
    return el;
  }
  function hide() { var el = document.getElementById('cn-pay-notice'); if (el) el.style.display = 'none'; setSubmit(true); }
  function setSubmit(ok) {
    var b = document.getElementById('recharge-submit-btn');
    if (b) { b.style.opacity = ok ? '' : '.5'; b.setAttribute('aria-disabled', ok ? 'false' : 'true'); }
  }
  function show(html) {
    var el = box(); if (!el) return;
    el.innerHTML = html + '<div style="margin-top:10px"><button type="button" data-cn-crypto="1" style="border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:800;background:#e8590c;color:#fff;cursor:pointer">' + esc(tx('cta')) + '</button></div>';
    el.style.display = 'block';
  }

  function evaluate() {
    if (typeof payMethod === 'undefined' || payMethod !== 'mobile') { hide(); return; }
    var code = (typeof payCountryCode !== 'undefined') ? payCountryCode : null;
    if (!code) { hide(); return; }
    if (!COVERED[code]) { show('<div>' + esc(tx('country')) + '</div>'); setSubmit(false); return; }
    var op = (typeof payOperator !== 'undefined') ? payOperator : null;
    if (op && COVERED[code].indexOf(op) < 0) {
      show('<div>' + esc(tx('operator', { ops: COVERED[code].join(' / ') })) + '</div>'); setSubmit(false); return;
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
