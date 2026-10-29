/* Coeurnoh Universe — Paiements & Portefeuille professionnels.
   - Retour de paiement (?payment=success|failed) : message clair, vérification automatique du solde.
   - Relevé du portefeuille : résumé entrées/sorties, filtres, recherche, regroupement par jour,
     détail de chaque mouvement, reçu imprimable / PDF, export CSV.
   - Suivi des recharges (en attente, en vérification, créditée, échouée).
   - Écran de recharge : récapitulatif du montant, alerte si une recharge est déjà en cours, aide.
   Aucun changement serveur : lit les mêmes collections que l'application (wallet_transactions, topup_requests). */
(function () {
  'use strict';
  if (window.__cnPayPro) return; window.__cnPayPro = true;
  var tries = 0;
  function go() {
    if (typeof window.loadWalletHistory !== 'function' || typeof window.showRecharge !== 'function') { if (++tries < 120) setTimeout(go, 250); return; }
    main();
  }
  function main() {
    var $ = function (id) { return document.getElementById(id); };
    function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
    function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
    function usd(n, sign) { var v = Number(n) || 0; return (sign && v > 0 ? '+' : '') + v.toFixed(2) + ' $'; }
    function fmtDate(iso, long) { var d = new Date(iso); if (isNaN(d)) return ''; return d.toLocaleString('fr-FR', long ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' }); }
    function dayLabel(iso) {
      var d = new Date(iso); if (isNaN(d)) return 'Date inconnue';
      var t0 = new Date(); t0.setHours(0, 0, 0, 0); var d0 = new Date(d); d0.setHours(0, 0, 0, 0);
      var diff = Math.round((t0 - d0) / 86400000);
      if (diff === 0) return 'Aujourd’hui'; if (diff === 1) return 'Hier';
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === t0.getFullYear() ? undefined : 'numeric' });
    }
    function meta(type) { var m = (typeof WALLET_TX_LABELS !== 'undefined' && WALLET_TX_LABELS[type]) || null; return m || { label: type || 'Transaction', icon: 'card' }; }
    function ico(n) { try { return cnIco(n); } catch (e) { return ''; } }

    var CSS = '.pp-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.pp-sum div{background:var(--white,#fff);border-radius:14px;padding:10px;text-align:center;box-shadow:0 2px 10px rgba(20,38,63,.07)}.pp-sum b{display:block;font-size:1.02rem}.pp-sum small{font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#5d6779)}.pp-in{color:#0b7a50}.pp-out{color:#b0182c}' +
      '.pp-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px}.pp-chips button{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:999px;padding:6px 13px;font-size:.8rem;font-weight:700;white-space:nowrap;cursor:pointer;color:inherit}.pp-chips button.on{background:#14263f;color:#fff;border-color:#14263f}' +
      '.pp-day{font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#5d6779);padding:12px 0 4px}.pp-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line,#dde3ec);cursor:pointer;background:none;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;color:inherit;font:inherit}.pp-row>div{display:flex;gap:10px;align-items:center;min-width:0}.pp-row strong{white-space:nowrap}' +
      '.pp-tools{display:flex;gap:8px;margin:10px 0 0}.pp-b{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:12px;padding:9px 14px;font-weight:700;font-size:.82rem;cursor:pointer;color:inherit}.pp-b.p{background:#1b4fd8;border-color:#1b4fd8;color:#fff}' +
      '.pp-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.pp-pill.ok{background:#e3f6ec;color:#0b7a50}.pp-pill.wait{background:#fff3d6;color:#8a5a00}.pp-pill.bad{background:#fde5e8;color:#b0182c}' +
      '.pp-ov{position:fixed;inset:0;z-index:2800;background:rgba(10,20,36,.55);display:flex;align-items:flex-end;justify-content:center}.pp-sheet{background:var(--white,#fff);width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:20px 18px max(20px,env(safe-area-inset-bottom));max-height:88vh;overflow-y:auto}.pp-sheet h3{margin:0 0 2px}.pp-kv{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line,#dde3ec);font-size:.9rem}.pp-kv span:first-child{color:var(--muted,#5d6779)}.pp-kv span:last-child{text-align:right;word-break:break-word}' +
      '.pp-big{font-size:1.9rem;font-weight:800;margin:6px 0 8px}.pp-ban{border-radius:16px;padding:14px 16px;margin:0 0 14px;font-size:.9rem;line-height:1.5}.pp-ban.ok{background:#e3f6ec;color:#0b5c3d}.pp-ban.wait{background:#fff3d6;color:#6e4700}.pp-ban.bad{background:#fde5e8;color:#8c1223}.pp-ban b{display:block;font-size:1rem;margin-bottom:2px}.pp-ban button{margin-top:8px}' +
      '.pp-rc{position:fixed;inset:0;z-index:2900;background:#fff;overflow-y:auto;padding:22px 18px 40px;color:#14263f}.pp-rc .box{max-width:520px;margin:0 auto}.pp-rc h2{margin:0 0 2px}.pp-rc .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #14263f;padding-bottom:12px;margin-bottom:14px}' +
      '@media print{body>*:not(.pp-rc){display:none!important}.pp-rc{position:static;padding:0}.pp-rc .noprint{display:none!important}}';
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    /* ================= TEXTES (5 langues) ================= */
    var P = {
      fr: {
        head: 'Recharge du portefeuille', go_title: 'Paiement sécurisé', go_sub: 'La page de paiement s’ouvre dans un instant.',
        go_s1: 'Choisissez votre opérateur et entrez votre numéro', go_s2: 'Une demande de paiement arrive sur votre téléphone', go_s3: 'Entrez votre code secret (PIN) pour confirmer',
        go_o1: 'Choisissez votre moyen de paiement sur la page sécurisée', go_o2: 'Renseignez vos informations et confirmez', go_o3: 'Revenez ici : votre solde est crédité automatiquement',
        go_pin: 'Gardez votre téléphone à portée de main : vous devrez entrer votre code secret M‑Pesa, Airtel Money, Orange Money ou MTN MoMo.',
        go_open: 'Ouverture de la page sécurisée…', go_now: 'Continuer maintenant', go_stuck: 'La page ne s’ouvre pas ? Touchez ici.', go_safe: 'Le paiement se fait sur la page sécurisée du prestataire. Ne fermez pas l’application.',
        w_title: 'Confirmez sur votre téléphone', w_body: 'Une demande de paiement a été envoyée à votre téléphone. Entrez votre code secret (PIN) M‑Pesa, Airtel Money, Orange Money ou MTN MoMo pour la confirmer.',
        w_title2: 'Paiement reçu', w_body2: 'Nous vérifions la confirmation de votre paiement. Votre solde sera mis à jour automatiquement, sans rien faire de votre côté.',
        w_s1: 'Demande envoyée', w_s2: 'Confirmation avec votre code secret', w_s3: 'Solde crédité', w_auto: 'Vérification automatique en cours',
        w_tip_t: 'Vous ne recevez rien ?', w_tip: 'Vérifiez que votre téléphone a du réseau et que votre compte Mobile Money contient assez d’argent. Si besoin, relancez le paiement.',
        ok_title: 'Recharge créditée', ok_body: 'Votre nouveau solde est de {b}.', ok_amt: 'Montant crédité',
        late_title: 'Toujours en attente', late_body: 'Nous n’avons pas encore reçu la confirmation. Si vous avez déjà entré votre code secret, patientez un instant : votre solde sera crédité automatiquement. Sinon, relancez le paiement.',
        bad_title: 'Paiement non abouti', bad_body: 'Aucun montant n’a été débité par nos services. Si vous avez été débité, patientez quelques minutes : le crédit se fait automatiquement après confirmation.',
        b_wallet: 'Voir mon portefeuille', b_close: 'Fermer', b_done: 'Terminer', b_retry: 'Réessayer le paiement', b_check: 'Vérifier maintenant', b_support: 'Contacter le support',
        how_t: 'Comment ça se passe', how_1: 'Touchez « Payer » : la page de paiement sécurisée s’ouvre. Choisissez votre opérateur et entrez votre numéro.', how_2: 'Une demande de paiement arrive sur votre téléphone.', how_3: 'Entrez votre code secret (PIN) M‑Pesa, Airtel Money, Orange Money ou MTN MoMo pour confirmer. Votre solde est crédité automatiquement.'
      },
      en: {
        head: 'Wallet top-up', go_title: 'Secure payment', go_sub: 'The payment page opens in a moment.',
        go_s1: 'Choose your operator and enter your number', go_s2: 'A payment request arrives on your phone', go_s3: 'Enter your secret code (PIN) to confirm',
        go_o1: 'Choose your payment method on the secure page', go_o2: 'Fill in your details and confirm', go_o3: 'Come back here: your balance is credited automatically',
        go_pin: 'Keep your phone at hand: you will need to enter your M‑Pesa, Airtel Money, Orange Money or MTN MoMo secret code.',
        go_open: 'Opening the secure page…', go_now: 'Continue now', go_stuck: 'The page does not open? Tap here.', go_safe: 'Payment is made on the provider’s secure page. Do not close the app.',
        w_title: 'Confirm on your phone', w_body: 'A payment request was sent to your phone. Enter your secret code (PIN) for M‑Pesa, Airtel Money, Orange Money or MTN MoMo to confirm it.',
        w_title2: 'Payment received', w_body2: 'We are checking your payment confirmation. Your balance will update automatically, you do not need to do anything.',
        w_s1: 'Request sent', w_s2: 'Confirmation with your secret code', w_s3: 'Balance credited', w_auto: 'Automatic check in progress',
        w_tip_t: 'Nothing received?', w_tip: 'Check that your phone has network and that your Mobile Money account has enough funds. If needed, start the payment again.',
        ok_title: 'Top-up credited', ok_body: 'Your new balance is {b}.', ok_amt: 'Amount credited',
        late_title: 'Still waiting', late_body: 'We have not received the confirmation yet. If you already entered your secret code, wait a moment: your balance will be credited automatically. Otherwise, start the payment again.',
        bad_title: 'Payment not completed', bad_body: 'No amount was charged by our services. If you were charged, wait a few minutes: the credit is applied automatically after confirmation.',
        b_wallet: 'View my wallet', b_close: 'Close', b_done: 'Done', b_retry: 'Try the payment again', b_check: 'Check now', b_support: 'Contact support',
        how_t: 'How it works', how_1: 'Tap “Pay”: the secure payment page opens. Choose your operator and enter your number.', how_2: 'A payment request arrives on your phone.', how_3: 'Enter your secret code (PIN) for M‑Pesa, Airtel Money, Orange Money or MTN MoMo to confirm. Your balance is credited automatically.'
      },
      es: {
        head: 'Recarga de la cartera', go_title: 'Pago seguro', go_sub: 'La página de pago se abre en un instante.',
        go_s1: 'Elige tu operador e introduce tu número', go_s2: 'Llega una solicitud de pago a tu teléfono', go_s3: 'Introduce tu código secreto (PIN) para confirmar',
        go_o1: 'Elige tu medio de pago en la página segura', go_o2: 'Completa tus datos y confirma', go_o3: 'Vuelve aquí: tu saldo se acredita automáticamente',
        go_pin: 'Ten el teléfono a mano: tendrás que introducir tu código secreto de M‑Pesa, Airtel Money, Orange Money o MTN MoMo.',
        go_open: 'Abriendo la página segura…', go_now: 'Continuar ahora', go_stuck: '¿La página no se abre? Toca aquí.', go_safe: 'El pago se realiza en la página segura del proveedor. No cierres la aplicación.',
        w_title: 'Confirma en tu teléfono', w_body: 'Se envió una solicitud de pago a tu teléfono. Introduce tu código secreto (PIN) de M‑Pesa, Airtel Money, Orange Money o MTN MoMo para confirmarla.',
        w_title2: 'Pago recibido', w_body2: 'Estamos verificando la confirmación de tu pago. Tu saldo se actualizará automáticamente, sin que hagas nada.',
        w_s1: 'Solicitud enviada', w_s2: 'Confirmación con tu código secreto', w_s3: 'Saldo acreditado', w_auto: 'Verificación automática en curso',
        w_tip_t: '¿No recibes nada?', w_tip: 'Comprueba que el teléfono tiene cobertura y que tu cuenta Mobile Money tiene saldo suficiente. Si hace falta, vuelve a iniciar el pago.',
        ok_title: 'Recarga acreditada', ok_body: 'Tu nuevo saldo es {b}.', ok_amt: 'Importe acreditado',
        late_title: 'Todavía en espera', late_body: 'Aún no hemos recibido la confirmación. Si ya introdujiste tu código secreto, espera un momento: tu saldo se acreditará automáticamente. Si no, vuelve a iniciar el pago.',
        bad_title: 'Pago no completado', bad_body: 'Nuestros servicios no han cobrado ningún importe. Si te cobraron, espera unos minutos: el crédito se aplica automáticamente tras la confirmación.',
        b_wallet: 'Ver mi cartera', b_close: 'Cerrar', b_done: 'Terminar', b_retry: 'Reintentar el pago', b_check: 'Verificar ahora', b_support: 'Contactar con soporte',
        how_t: 'Cómo funciona', how_1: 'Toca «Pagar»: se abre la página de pago segura. Elige tu operador e introduce tu número.', how_2: 'Llega una solicitud de pago a tu teléfono.', how_3: 'Introduce tu código secreto (PIN) de M‑Pesa, Airtel Money, Orange Money o MTN MoMo para confirmar. Tu saldo se acredita automáticamente.'
      },
      it: {
        head: 'Ricarica del portafoglio', go_title: 'Pagamento sicuro', go_sub: 'La pagina di pagamento si apre tra un istante.',
        go_s1: 'Scegli il tuo operatore e inserisci il tuo numero', go_s2: 'Una richiesta di pagamento arriva sul tuo telefono', go_s3: 'Inserisci il tuo codice segreto (PIN) per confermare',
        go_o1: 'Scegli il metodo di pagamento sulla pagina sicura', go_o2: 'Inserisci i tuoi dati e conferma', go_o3: 'Torna qui: il saldo viene accreditato automaticamente',
        go_pin: 'Tieni il telefono a portata di mano: dovrai inserire il tuo codice segreto M‑Pesa, Airtel Money, Orange Money o MTN MoMo.',
        go_open: 'Apertura della pagina sicura…', go_now: 'Continua ora', go_stuck: 'La pagina non si apre? Tocca qui.', go_safe: 'Il pagamento avviene sulla pagina sicura del fornitore. Non chiudere l’app.',
        w_title: 'Conferma sul telefono', w_body: 'Una richiesta di pagamento è stata inviata al tuo telefono. Inserisci il tuo codice segreto (PIN) M‑Pesa, Airtel Money, Orange Money o MTN MoMo per confermarla.',
        w_title2: 'Pagamento ricevuto', w_body2: 'Stiamo verificando la conferma del pagamento. Il saldo si aggiornerà automaticamente, senza che tu faccia nulla.',
        w_s1: 'Richiesta inviata', w_s2: 'Conferma con il tuo codice segreto', w_s3: 'Saldo accreditato', w_auto: 'Verifica automatica in corso',
        w_tip_t: 'Non ricevi nulla?', w_tip: 'Controlla che il telefono abbia rete e che il tuo conto Mobile Money abbia fondi sufficienti. Se serve, riavvia il pagamento.',
        ok_title: 'Ricarica accreditata', ok_body: 'Il tuo nuovo saldo è {b}.', ok_amt: 'Importo accreditato',
        late_title: 'Ancora in attesa', late_body: 'Non abbiamo ancora ricevuto la conferma. Se hai già inserito il codice segreto, attendi un momento: il saldo verrà accreditato automaticamente. Altrimenti, riavvia il pagamento.',
        bad_title: 'Pagamento non completato', bad_body: 'Nessun importo è stato addebitato dai nostri servizi. Se ti è stato addebitato, attendi qualche minuto: l’accredito avviene automaticamente dopo la conferma.',
        b_wallet: 'Vedi il mio portafoglio', b_close: 'Chiudi', b_done: 'Fine', b_retry: 'Riprova il pagamento', b_check: 'Verifica ora', b_support: 'Contatta il supporto',
        how_t: 'Come funziona', how_1: 'Tocca «Paga»: si apre la pagina di pagamento sicura. Scegli il tuo operatore e inserisci il tuo numero.', how_2: 'Una richiesta di pagamento arriva sul tuo telefono.', how_3: 'Inserisci il tuo codice segreto (PIN) M‑Pesa, Airtel Money, Orange Money o MTN MoMo per confermare. Il saldo viene accreditato automaticamente.'
      },
      pt: {
        head: 'Recarga da carteira', go_title: 'Pagamento seguro', go_sub: 'A página de pagamento abre num instante.',
        go_s1: 'Escolha o seu operador e introduza o seu número', go_s2: 'Chega um pedido de pagamento ao seu telemóvel', go_s3: 'Introduza o seu código secreto (PIN) para confirmar',
        go_o1: 'Escolha o meio de pagamento na página segura', go_o2: 'Preencha os seus dados e confirme', go_o3: 'Volte aqui: o saldo é creditado automaticamente',
        go_pin: 'Tenha o telemóvel à mão: terá de introduzir o seu código secreto M‑Pesa, Airtel Money, Orange Money ou MTN MoMo.',
        go_open: 'A abrir a página segura…', go_now: 'Continuar agora', go_stuck: 'A página não abre? Toque aqui.', go_safe: 'O pagamento é feito na página segura do prestador. Não feche a aplicação.',
        w_title: 'Confirme no seu telemóvel', w_body: 'Foi enviado um pedido de pagamento ao seu telemóvel. Introduza o seu código secreto (PIN) M‑Pesa, Airtel Money, Orange Money ou MTN MoMo para o confirmar.',
        w_title2: 'Pagamento recebido', w_body2: 'Estamos a verificar a confirmação do pagamento. O saldo será atualizado automaticamente, sem que precise de fazer nada.',
        w_s1: 'Pedido enviado', w_s2: 'Confirmação com o seu código secreto', w_s3: 'Saldo creditado', w_auto: 'Verificação automática em curso',
        w_tip_t: 'Não recebe nada?', w_tip: 'Verifique se o telemóvel tem rede e se a sua conta Mobile Money tem saldo suficiente. Se necessário, reinicie o pagamento.',
        ok_title: 'Recarga creditada', ok_body: 'O seu novo saldo é {b}.', ok_amt: 'Valor creditado',
        late_title: 'Ainda em espera', late_body: 'Ainda não recebemos a confirmação. Se já introduziu o código secreto, aguarde um momento: o saldo será creditado automaticamente. Caso contrário, reinicie o pagamento.',
        bad_title: 'Pagamento não concluído', bad_body: 'Nenhum valor foi cobrado pelos nossos serviços. Se foi cobrado, aguarde alguns minutos: o crédito é aplicado automaticamente após a confirmação.',
        b_wallet: 'Ver a minha carteira', b_close: 'Fechar', b_done: 'Concluir', b_retry: 'Tentar o pagamento de novo', b_check: 'Verificar agora', b_support: 'Contactar o suporte',
        how_t: 'Como funciona', how_1: 'Toque em «Pagar»: abre a página de pagamento segura. Escolha o seu operador e introduza o seu número.', how_2: 'Chega um pedido de pagamento ao seu telemóvel.', how_3: 'Introduza o seu código secreto (PIN) M‑Pesa, Airtel Money, Orange Money ou MTN MoMo para confirmar. O saldo é creditado automaticamente.'
      }
    };
    function lg() { var l = ''; try { l = typeof currentLang === 'string' ? currentLang : ''; } catch (e) { /* ignore */ } return P[l] ? l : 'fr'; }
    function T(k, v) { var s = (P[lg()][k] != null ? P[lg()][k] : P.fr[k]) || ''; if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); }); return s; }
    var LAST_KEY = 'cn_pay_last';
    function lastPay() { try { var o = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); return o && Date.now() - (o.t || 0) < 6 * 3600 * 1000 ? o : null; } catch (e) { return null; } }
    function supportLink() { var cfg = window.CN_COMPANY || {}, sup = cfg.support || {}; return sup.whatsapp ? 'https://wa.me/' + String(sup.whatsapp).replace(/\D/g, '') : (sup.email ? 'mailto:' + sup.email : ''); }

    var PF_CSS = '.pf-ov{position:fixed;inset:0;z-index:3000;background:rgba(10,20,36,.6);display:flex;align-items:flex-end;justify-content:center;font-family:var(--font,system-ui,sans-serif)}' +
      '.pf-card{background:var(--white,#fff);color:var(--ink,#141a26);width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:22px 20px max(22px,env(safe-area-inset-bottom));max-height:94vh;overflow-y:auto;box-shadow:var(--shadow-lg,0 12px 32px rgba(16,24,40,.14))}' +
      '@media(min-width:600px){.pf-ov{align-items:center}.pf-card{border-radius:20px}}' +
      '.pf-eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#5d6779);margin:0 0 10px}' +
      '.pf-ico{width:46px;height:46px;border-radius:14px;background:var(--btn,#28374f);color:var(--on-primary,#fff);display:flex;align-items:center;justify-content:center;margin-bottom:12px}' +
      '.pf-ico.ok{background:var(--tint-green-ink,#15693a)}.pf-ico.bad{background:var(--tint-red-ink,#a3202f)}.pf-ico.late{background:var(--tint-amber-ink,#7a4a00)}' +
      '.pf-card h3{font-family:var(--font-head,inherit);font-size:1.3rem;line-height:1.25;font-weight:700;margin:0 0 6px;color:var(--ink,#141a26)}' +
      '.pf-card p{margin:0 0 12px;color:var(--ink-2,#38435a);font-size:.93rem;line-height:1.55}' +
      '.pf-steps{list-style:none;margin:6px 0 14px;padding:0}.pf-steps li{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line,#e2e6ee);font-size:.92rem;line-height:1.4;color:var(--ink-2,#38435a)}.pf-steps li:last-child{border-bottom:0}' +
      '.pf-dot{flex:none;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--line-2,#cfd6e2);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:var(--muted,#5d6779);box-sizing:border-box}' +
      '.pf-steps li.done .pf-dot{background:var(--tint-green,#e3f3e9);border-color:var(--tint-green-line,#b3dcc2);color:var(--tint-green-ink,#15693a)}.pf-steps li.now{color:var(--ink,#141a26);font-weight:600}.pf-steps li.now .pf-dot{border-color:var(--btn,#28374f);color:var(--btn,#28374f)}' +
      '.pf-spin{width:14px;height:14px;border:2px solid var(--line-2,#cfd6e2);border-top-color:var(--btn,#28374f);border-radius:50%;animation:pfspin .8s linear infinite}@keyframes pfspin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.pf-spin{animation:none}}' +
      '.pf-note{border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:.9rem;line-height:1.5;background:var(--tint-amber,#fcf1d8);border:1px solid var(--tint-amber-line,#f0d58e);color:var(--tint-amber-ink,#7a4a00)}.pf-note b{display:block;margin-bottom:2px}' +
      '.pf-note.info{background:var(--soft,#f3f5f9);border-color:var(--line,#e2e6ee);color:var(--ink-2,#38435a)}' +
      '.pf-ops{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 14px}.pf-ops .pay-tile{height:32px;min-width:58px;font-size:.7rem}' +
      '.pf-meta{display:flex;justify-content:space-between;gap:10px;font-size:.78rem;color:var(--muted,#5d6779);margin:0 0 14px}' +
      '.pf-amt{font-family:var(--font-head,inherit);font-size:2rem;font-weight:700;letter-spacing:-.02em;margin:2px 0 10px;color:var(--tint-green-ink,#15693a)}' +
      '.pf-acts{display:grid;gap:8px;margin-top:4px}.pf-acts .btn{width:100%;justify-content:center}' +
      '.pf-stuck{display:none;text-align:center;margin-top:12px;font-size:.85rem}.pf-stuck a{color:var(--link,#1d4ed8);font-weight:600}' +
      '#pay-panel-mobile .pay-opt-note{display:none}';
    var pfs = document.createElement('style'); pfs.textContent = PF_CSS; document.head.appendChild(pfs);

    var I_LOCK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    var I_PHONE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>';
    var I_OK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    var I_X = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    var I_CLOCK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>';
    function opsHtml() {
      try {
        return '<div class="pf-ops" aria-hidden="true">' + ['M-Pesa Vodacom', 'Airtel Money', 'Orange Money', 'MTN MoMo'].map(function (n) {
          var b = getOperatorBadge(n);
          return '<span class="pay-tile" style="background:' + b.bg + ';color:' + payTileInk(b.bg) + '">' + esc(b.code) + (b.slug ? '<img src="logos/' + esc(b.slug) + '.png" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
        }).join('') + '</div>';
      } catch (e) { return ''; }
    }
    function stepsHtml(list, now, spin) {
      var tick = I_OK.replace('width="22" height="22"', 'width="14" height="14"');
      return '<ol class="pf-steps">' + list.map(function (txt, i) {
        var cls = i < now ? 'done' : (i === now ? 'now' : ''), dot = i < now ? tick : (i === now && spin ? '<i class="pf-spin"></i>' : String(i + 1));
        return '<li class="' + cls + '"><span class="pf-dot">' + dot + '</span><span>' + esc(txt) + '</span></li>';
      }).join('') + '</ol>';
    }

    /* ================= AVANT LE PAIEMENT : ÉCRAN D'ÉTAPES ================= */
    var GO = null;
    function goClose() { if (GO && GO.el) { GO.el.remove(); } GO = null; }
    window.cnPayFlow = {
      start: function (method, amount) {
        try {
          goClose();
          try { localStorage.setItem(LAST_KEY, JSON.stringify({ m: method || '', a: Number(amount) || 0, t: Date.now() })); } catch (e) { /* ignore */ }
          var mobile = method === 'mobile', o = document.createElement('div'); o.className = 'pf-ov'; o.id = 'pf-go';
          o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
          var steps = mobile ? [T('go_s1'), T('go_s2'), T('go_s3')] : [T('go_o1'), T('go_o2'), T('go_o3')];
          o.innerHTML = '<div class="pf-card"><div class="pf-ico">' + I_LOCK + '</div><h3>' + esc(T('go_title')) + '</h3><p>' + esc(T('go_sub')) + '</p>' +
            (mobile ? opsHtml() : '') + stepsHtml(steps, -1) + (mobile ? '<div class="pf-note"><b>' + esc(T('go_s3')) + '</b>' + esc(T('go_pin')) + '</div>' : '') +
            '<div class="pf-meta"><span id="pf-state" role="status" aria-live="polite">' + esc(T('go_open')) + '</span></div>' +
            '<div class="pf-acts"><button type="button" class="btn btn-primary" id="pf-now" style="display:none">' + esc(T('go_now')) + '</button></div>' +
            '<div class="pf-stuck" id="pf-stuck"><a href="#" id="pf-link" target="_self" rel="noopener">' + esc(T('go_stuck')) + '</a></div>' +
            '<p style="margin:12px 0 0;font-size:.78rem;color:var(--muted,#5d6779)">' + esc(T('go_safe')) + '</p></div>';
          document.body.appendChild(o);
          GO = { el: o, t0: Date.now(), url: '' };
        } catch (e) { GO = null; }
      },
      go: function (url) {
        var finish = function () { try { window.location.href = url; } catch (e) { /* ignore */ } };
        if (!GO || !GO.el) { finish(); return; }
        GO.url = url;
        var wait = Math.max(0, 2200 - (Date.now() - GO.t0)), done = false;
        var now = document.getElementById('pf-now'), link = document.getElementById('pf-link'), stuck = document.getElementById('pf-stuck');
        if (link) link.setAttribute('href', url);
        var run = function () { if (done) return; done = true; var s = document.getElementById('pf-state'); if (s) s.textContent = T('go_open'); finish(); setTimeout(function () { if (stuck) stuck.style.display = 'block'; }, 3500); setTimeout(goClose, 20000); };
        if (now) { now.style.display = ''; now.onclick = run; }
        setTimeout(run, wait);
      },
      stop: function () { goClose(); }
    };
    // Retour par la flèche « précédent » depuis la page de paiement : on retire l'écran d'attente.
    window.addEventListener('pageshow', function (e) { if (e.persisted) goClose(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && GO && GO.url && Date.now() - GO.t0 > 4000) goClose(); });

    /* ================= RETOUR DE PAIEMENT ================= */
    function readReturn() {
      try {
        var u = new URL(location.href), p = u.searchParams.get('payment');
        if (p !== 'success' && p !== 'failed') return null;
        u.searchParams.delete('payment'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
        return p;
      } catch (e) { return null; }
    }
    var ret = readReturn();
    async function getBalance() { var s = await db.collection('users').doc(currentUser.uid).get(); return s.exists ? Number(s.data().balance) || 0 : 0; }
    function setBalanceUi(b) { try { currentUser.balance = b; var el = $('wallet-balance'); if (el) el.textContent = b.toFixed(2) + '$'; } catch (e) { /* ignore */ } }
    // Filet de sécurité (Mobile Money SasPay) : demande au serveur de revérifier nos recharges en attente,
    // au cas où la notification automatique tarde. Le serveur ne crédite qu'après contrôle auprès de SasPay.
    async function syncSaspay() {
      try {
        var a = (typeof auth !== 'undefined' && auth) || (window.firebase && window.firebase.auth && window.firebase.auth());
        if (!a || !a.currentUser) return;
        var tk = await a.currentUser.getIdToken();
        await fetch('/api/payment-webhook?provider=saspay-sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk } });
      } catch (e) { /* la notification automatique reste le chemin principal */ }
    }
    var RET = null;
    function retHtml(state, d) {
      var mobile = RET && RET.mobile, ico = state === 'ok' ? I_OK : state === 'bad' ? I_X : state === 'late' ? I_CLOCK : (mobile ? I_PHONE : I_LOCK);
      var cls = state === 'ok' ? ' ok' : state === 'bad' ? ' bad' : state === 'late' ? ' late' : '';
      var h = '<div class="pf-card"><p class="pf-eyebrow">' + esc(T('head')) + '</p><div class="pf-ico' + cls + '">' + ico + '</div>';
      var sup = supportLink(), acts = '';
      if (state === 'ok') {
        h += '<h3>' + esc(T('ok_title')) + '</h3><div class="pf-amt">' + esc(usd(d.gain, true)) + '</div><p>' + esc(T('ok_body', { b: usd(d.balance) })) + '</p>';
        acts = '<button type="button" class="btn btn-primary" data-r="wallet">' + esc(T('b_wallet')) + '</button><button type="button" class="btn btn-outline" data-r="close">' + esc(T('b_done')) + '</button>';
      } else if (state === 'bad') {
        h += '<h3>' + esc(T('bad_title')) + '</h3><p>' + esc(T('bad_body')) + '</p>';
        acts = '<button type="button" class="btn btn-primary" data-r="retry">' + esc(T('b_retry')) + '</button><button type="button" class="btn btn-outline" data-r="wallet">' + esc(T('b_wallet')) + '</button>' +
          (sup ? '<a class="btn btn-outline" href="' + esc(sup) + '" target="_blank" rel="noopener">' + esc(T('b_support')) + '</a>' : '') + '<button type="button" class="btn btn-outline" data-r="close">' + esc(T('b_close')) + '</button>';
      } else {
        var late = state === 'late';
        h += '<h3>' + esc(late ? T('late_title') : (mobile ? T('w_title') : T('w_title2'))) + '</h3><p>' + esc(late ? T('late_body') : (mobile ? T('w_body') : T('w_body2'))) + '</p>';
        if (mobile && !late) h += opsHtml();
        if (mobile) h += stepsHtml([T('w_s1'), T('w_s2'), T('w_s3')], 1, !late) + '<div class="pf-note info"><b>' + esc(T('w_tip_t')) + '</b>' + esc(T('w_tip')) + '</div>';
        h += '<div class="pf-meta"><span role="status" aria-live="polite">' + esc(late ? '' : T('w_auto')) + '</span><span id="pf-el"></span></div>';
        acts = (late ? '<button type="button" class="btn btn-primary" data-r="check">' + esc(T('b_check')) + '</button><button type="button" class="btn btn-outline" data-r="retry">' + esc(T('b_retry')) + '</button>' : '') +
          '<button type="button" class="btn ' + (late ? 'btn-outline' : 'btn-primary') + '" data-r="wallet">' + esc(T('b_wallet')) + '</button>' +
          (late && sup ? '<a class="btn btn-outline" href="' + esc(sup) + '" target="_blank" rel="noopener">' + esc(T('b_support')) + '</a>' : '') + '<button type="button" class="btn btn-outline" data-r="close">' + esc(T('b_close')) + '</button>';
      }
      return h + '<div class="pf-acts">' + acts + '</div></div>';
    }
    function retDraw(state, d) {
      if (!RET || !RET.el) return;
      RET.state = state; RET.el.innerHTML = retHtml(state, d || {});
    }
    function retClose() { if (RET) { try { clearInterval(RET.iv); clearInterval(RET.tick); if (RET.unsub) RET.unsub(); } catch (e) { /* ignore */ } if (RET.el) RET.el.remove(); } RET = null; }
    function showReturn(kind) {
      retClose();
      var lp = lastPay(), o = document.createElement('div'); o.className = 'pf-ov'; o.id = 'pp-ret'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
      RET = { el: o, mobile: !lp || lp.m === 'mobile', amount: lp ? lp.a : 0, t0: Date.now(), before: null, n: 0 };
      document.body.appendChild(o);
      o.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-r]'); if (!b) return;
        var a = b.getAttribute('data-r');
        if (a === 'check') { retPollNow(true); return; }
        retClose();
        if (a === 'wallet') { try { showDashboard(); showDashTab('wallet'); } catch (er) { /* ignore */ } }
        else if (a === 'retry') { try { showDashboard(); showRecharge(); } catch (er) { /* ignore */ } }
      });
      if (kind === 'failed') { retDraw('bad'); return; }
      retDraw('wait');
      RET.tick = setInterval(function () { var el = $('pf-el'); if (el && RET) { var s = Math.floor((Date.now() - RET.t0) / 1000); el.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); } }, 1000);
      var w = 0, wi = setInterval(function () {
        w++;
        var ready = window.currentUser || (typeof currentUser !== 'undefined' && currentUser);
        if (!RET || RET.el !== o) { clearInterval(wi); return; }
        if (ready) { clearInterval(wi); retStart(); } else if (w > 80) clearInterval(wi);
      }, 400);
    }
    function credited(now) {
      if (!RET) return;
      var before = RET.before == null ? now : RET.before, gain = now - before;
      if (gain <= 0.0001 && RET.amount) gain = RET.amount;
      setBalanceUi(now);
      retDraw('ok', { gain: gain, balance: now });
      try { clearInterval(RET.iv); clearInterval(RET.tick); if (RET.unsub) RET.unsub(); } catch (e) { /* ignore */ }
      try { window.loadWalletHistory(); } catch (e) { /* ignore */ }
    }
    var SYNC_AT = { 1: 1, 3: 1, 6: 1, 10: 1, 15: 1, 20: 1, 30: 1, 45: 1 };
    async function retPollNow(manual) {
      if (!RET) return;
      if (manual) { retDraw('wait'); RET.n = 0; RET.t0 = Date.now(); RET.tick = RET.tick || setInterval(function () { var el = $('pf-el'); if (el && RET) { var s = Math.floor((Date.now() - RET.t0) / 1000); el.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); } }, 1000); retPoller(); syncSaspay(); }
      try {
        var now = await getBalance();
        if (RET && RET.before != null && now > RET.before + 0.0001) credited(now);
      } catch (e) { /* on réessaie */ }
    }
    function retPoller() {
      if (!RET) return;
      clearInterval(RET.iv);
      RET.iv = setInterval(async function () {
        if (!RET) return;
        RET.n++;
        if (SYNC_AT[RET.n]) syncSaspay();
        try {
          var now = await getBalance();
          if (!RET) return;
          if (RET.before != null && now > RET.before + 0.0001) { credited(now); return; }
        } catch (e) { /* on réessaie */ }
        // Demande suivie : échec déclaré par le serveur ?
        try {
          if (RET && RET.topupId) {
            var s = await db.collection('topup_requests').doc(RET.topupId).get();
            var st = s.exists ? s.data().status : '';
            if (st === 'failed' || st === 'rejected' || st === 'cancelled' || st === 'expired') { clearInterval(RET.iv); clearInterval(RET.tick); retDraw('bad'); return; }
          }
        } catch (e) { /* lecture non autorisée : on ignore */ }
        if (RET && RET.n >= 60) { clearInterval(RET.iv); clearInterval(RET.tick); retDraw('late'); }
      }, 3000);
    }
    async function retStart() {
      if (!RET) return;
      try {
        RET.before = await getBalance(); setBalanceUi(RET.before);
      } catch (e) { return; }
      // Crédit déjà arrivé pendant le retour ? On le retrouve dans la dernière demande de recharge.
      try {
        var list = await fetchTopups(), cut = Date.now() - 3 * 3600000;
        var r = list.filter(function (x) { return new Date(x.createdAt).getTime() > cut; })[0];
        if (r) {
          RET.topupId = r.id;
          if (r.amountUSD != null && !RET.amount) RET.amount = Number(r.amountUSD) || 0;
          var done = r.completedAt ? Date.now() - new Date(r.completedAt).getTime() < 20 * 60000 : false;
          if (r.status === 'completed' && done) { RET.before = Math.max(0, RET.before - (Number(r.amountCredited) || Number(r.amountUSD) || 0)); credited(await getBalance()); return; }
          if (r.status === 'failed' || r.status === 'rejected' || r.status === 'cancelled') { retDraw('bad'); return; }
        }
      } catch (e) { /* lecture non autorisée : suivi par le solde seulement */ }
      syncSaspay();
      // Mise à jour instantanée dès que le serveur crédite (sans attendre le prochain contrôle).
      try {
        RET.unsub = db.collection('users').doc(currentUser.uid).onSnapshot(function (s) {
          if (!RET || !s || !s.exists) return;
          var b = Number(s.data().balance) || 0;
          if (RET.before != null && b > RET.before + 0.0001) credited(b);
        }, function () { /* le contrôle régulier prend le relais */ });
      } catch (e) { /* ignore */ }
      retPoller();
    }
    if (ret) setTimeout(function () { showReturn(ret); }, 0);

    /* ================= RELEVÉ DU PORTEFEUILLE ================= */
    var TX = [], FILTER = 'all', PERIOD = 'all', QUERY = '';
    function inRange(t) {
      if (PERIOD === 'all') return true; var d = new Date(t.createdAt); if (isNaN(d)) return false; var now = new Date();
      if (PERIOD === '30') return now - d <= 30 * 86400000;
      if (PERIOD === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    }
    function passes(t) {
      var a = Number(t.amount) || 0;
      if (FILTER === 'in' && a < 0) return false; if (FILTER === 'out' && a >= 0) return false;
      if (FILTER === 'topup' && String(t.type || '').indexOf('topup') !== 0) return false;
      if (!inRange(t)) return false;
      if (QUERY) { var hay = (meta(t.type).label + ' ' + (t.type || '') + ' ' + (t.id || '') + ' ' + (t.note || '') + ' ' + (t.description || '')).toLowerCase(); if (hay.indexOf(QUERY) < 0) return false; }
      return true;
    }
    function drawWallet() {
      var host = $('wallet-history-list'); if (!host) return;
      var list = TX.filter(passes), inn = 0, out = 0;
      list.forEach(function (t) { var a = Number(t.amount) || 0; if (a >= 0) inn += a; else out += -a; });
      var chip = function (id, label) { return '<button type="button" data-f="' + id + '" class="' + (FILTER === id ? 'on' : '') + '">' + label + '</button>'; };
      var pchip = function (id, label) { return '<button type="button" data-p="' + id + '" class="' + (PERIOD === id ? 'on' : '') + '">' + label + '</button>'; };
      var h = '<div class="pp-sum"><div><b class="pp-in">' + usd(inn) + '</b><small>Entrées</small></div><div><b class="pp-out">' + usd(out) + '</b><small>Sorties</small></div><div><b>' + usd(inn - out, true) + '</b><small>Net</small></div></div>' +
        '<div class="pp-chips">' + chip('all', 'Tout') + chip('in', 'Entrées') + chip('out', 'Sorties') + chip('topup', 'Recharges') + '</div>' +
        '<div class="pp-chips">' + pchip('all', 'Toute la période') + pchip('month', 'Ce mois-ci') + pchip('30', '30 jours') + '</div>' +
        '<input type="search" class="text-input" id="pp-q" placeholder="Rechercher une opération" value="' + esc(QUERY) + '" style="margin-bottom:6px">';
      if (!list.length) h += '<p class="muted small" style="padding:14px 0;text-align:center">Aucune opération ne correspond à ce filtre.</p>';
      else {
        var last = '';
        list.forEach(function (t) {
          var dl = dayLabel(t.createdAt); if (dl !== last) { h += '<div class="pp-day">' + esc(dl) + '</div>'; last = dl; }
          var m = meta(t.type), a = Number(t.amount) || 0;
          h += '<button type="button" class="pp-row" data-tx="' + esc(t.id) + '"><div><span style="display:inline-flex">' + ico(m.icon) + '</span><div style="min-width:0"><div style="font-weight:600;font-size:.92rem">' + esc(m.label) + '</div><div class="muted small">' + esc(fmtDate(t.createdAt)) + '</div></div></div><strong class="' + (a >= 0 ? 'pp-in' : 'pp-out') + '">' + usd(a, true) + '</strong></button>';
        });
      }
      h += '<div class="pp-tools"><button type="button" class="pp-b" data-x="csv">Exporter en CSV</button></div>';
      host.innerHTML = h;
      var q = $('pp-q'); if (q) q.addEventListener('input', function () { QUERY = q.value.trim().toLowerCase(); var pos = q.selectionStart; drawWallet(); var q2 = $('pp-q'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } });
    }
    function exportCsv() {
      var rows = [['Date', 'Opération', 'Type', 'Montant (USD)', 'Référence']];
      TX.filter(passes).forEach(function (t) { rows.push([t.createdAt || '', meta(t.type).label, t.type || '', (Number(t.amount) || 0).toFixed(2), t.id]); });
      var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'releve-coeurnoh.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function openTx(id) {
      var t = TX.find(function (x) { return x.id === id; }); if (!t) return;
      var m = meta(t.type), a = Number(t.amount) || 0;
      var o = document.createElement('div'); o.className = 'pp-ov';
      var kv = function (k, v) { return v ? '<div class="pp-kv"><span>' + k + '</span><span>' + esc(v) + '</span></div>' : ''; };
      o.innerHTML = '<div class="pp-sheet"><h3>' + esc(m.label) + '</h3><div class="pp-big ' + (a >= 0 ? 'pp-in' : 'pp-out') + '">' + usd(a, true) + '</div>' +
        kv('Date', fmtDate(t.createdAt, true)) + kv('Statut', 'Terminé') + kv('Référence', t.id.slice(0, 12).toUpperCase()) +
        (typeof t.balanceAfter === 'number' ? kv('Solde après opération', usd(t.balanceAfter)) : '') + kv('Détail', t.note || t.description || '') +
        '<div class="pp-tools"><button class="pp-b p" data-d="receipt">Voir le reçu</button><button class="pp-b" data-d="close">Fermer</button></div></div>';
      document.body.appendChild(o);
      o.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-d]'); if (b && b.getAttribute('data-d') === 'receipt') { o.remove(); receipt(t); } else if (!b && e.target === o || b) o.remove(); });
    }
    function receipt(t) {
      var m = meta(t.type), a = Number(t.amount) || 0, u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : {}) || {};
      var o = document.createElement('div'); o.className = 'pp-rc';
      var kv = function (k, v) { return v ? '<div class="pp-kv"><span>' + k + '</span><span>' + esc(v) + '</span></div>' : ''; };
      o.innerHTML = '<div class="box"><div class="hd"><div><h2>Reçu de transaction</h2><div style="font-size:.85rem;opacity:.75">Coeurnoh Universe</div></div><div style="text-align:right;font-size:.8rem">N° ' + esc(t.id.slice(0, 10).toUpperCase()) + '<br>' + esc(fmtDate(t.createdAt, true)) + '</div></div>' +
        kv('Titulaire', u.name || u.displayName || u.email || '') + kv('Opération', m.label) + kv('Type', a >= 0 ? 'Crédit' : 'Débit') + kv('Montant', usd(Math.abs(a))) + (typeof t.balanceAfter === 'number' ? kv('Solde après opération', usd(t.balanceAfter)) : '') + kv('Détail', t.note || t.description || '') + kv('Statut', 'Terminé') +
        '<p style="font-size:.75rem;opacity:.7;margin-top:18px">Document généré automatiquement. Il atteste du mouvement enregistré sur le portefeuille Coeurnoh Universe.</p>' +
        '<div class="pp-tools noprint"><button class="pp-b p" data-q="print">Imprimer / enregistrer en PDF</button><button class="pp-b" data-q="close">Fermer</button></div></div>';
      document.body.appendChild(o);
      o.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-q]'); if (!b) return; if (b.getAttribute('data-q') === 'print') window.print(); else o.remove(); });
    }
    var oldLoad = window.loadWalletHistory;
    window.loadWalletHistory = async function () {
      var host = $('wallet-history-list'); if (!host || typeof currentUser === 'undefined' || !currentUser) return oldLoad.apply(this, arguments);
      if (!host.getAttribute('data-pp')) {
        host.setAttribute('data-pp', '1');
        host.addEventListener('click', function (e) {
          var f = e.target.closest('[data-f]'); if (f) { FILTER = f.getAttribute('data-f'); drawWallet(); return; }
          var p = e.target.closest('[data-p]'); if (p) { PERIOD = p.getAttribute('data-p'); drawWallet(); return; }
          var r = e.target.closest('[data-tx]'); if (r) { openTx(r.getAttribute('data-tx')); return; }
          if (e.target.closest('[data-x="csv"]')) exportCsv();
        });
      }
      host.innerHTML = '<p class="muted small">Chargement…</p>';
      try {
        var snap = await db.collection('wallet_transactions').where('uid', '==', currentUser.uid).orderBy('createdAt', 'desc').limit(200).get();
        TX = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        if (!TX.length) { host.innerHTML = '<p class="muted small">Aucune transaction pour l’instant.</p>'; }
        else drawWallet();
      } catch (e) { host.innerHTML = '<p class="muted small">Impossible de charger le relevé. <button class="pp-b" data-retry="1">Réessayer</button></p>'; var rb = host.querySelector('[data-retry]'); if (rb) rb.onclick = function () { window.loadWalletHistory(); }; }
      loadTopups();
    };

    /* ================= SUIVI DES RECHARGES ================= */
    var STATUS = {
      completed: ['Créditée', 'ok'], pending_payment: ['En attente de paiement', 'wait'], pending: ['En vérification', 'wait'], pending_admin_review: ['En vérification', 'wait'],
      failed: ['Échouée', 'bad'], rejected: ['Refusée', 'bad'], cancelled: ['Annulée', 'bad']
    };
    var METHOD = { mobile: 'Mobile Money', crypto: 'Crypto', card: 'Carte bancaire', illicocash: 'illicocash' };
    var TOPUPS = [];
    async function fetchTopups() {
      var snap = await db.collection('topup_requests').where('uid', '==', currentUser.uid).limit(40).get();
      TOPUPS = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
      return TOPUPS;
    }
    async function loadTopups() {
      var tab = $('dash-tab-wallet'); if (!tab) return;
      var box = $('pp-topups');
      if (!box) { box = document.createElement('div'); box.id = 'pp-topups'; box.className = 'order-box'; tab.appendChild(box); }
      try {
        var list = await fetchTopups();
        if (!list.length) { box.style.display = 'none'; return; }
        box.style.display = '';
        box.innerHTML = '<h3>Mes recharges</h3><p class="muted small" style="margin-bottom:6px">Suivi de vos demandes de recharge. Le solde est crédité automatiquement dès la confirmation.</p>' + list.slice(0, 10).map(function (r) {
          var s = STATUS[r.status] || [r.status || 'En cours', 'wait'];
          return '<div class="pp-kv" style="align-items:center"><span><b style="color:inherit">' + usd(r.amountUSD != null ? r.amountUSD : r.amount) + '</b><br><small>' + esc(METHOD[r.method] || r.method || 'Recharge') + ' · ' + esc(fmtDate(r.createdAt, true)) + '</small></span><span><span class="pp-pill ' + s[1] + '">' + esc(s[0]) + '</span></span></div>';
        }).join('') + '<div class="pp-tools"><button class="pp-b" data-tu="refresh">Actualiser</button></div>';
        var rb = box.querySelector('[data-tu]'); if (rb) rb.onclick = async function () { try { var b = await getBalance(); setBalanceUi(b); } catch (e) { /* ignore */ } window.loadWalletHistory(); toast('Mise à jour effectuée', 'success'); };
      } catch (e) { box.style.display = 'none'; /* règles Firestore : lecture non autorisée → section masquée */ }
    }

    /* ================= ÉCRAN DE RECHARGE ================= */
    var oldRecharge = window.showRecharge;
    window.showRecharge = function () {
      var r = oldRecharge.apply(this, arguments);
      try { decorateRecharge(); } catch (e) { /* amélioration facultative */ }
      return r;
    };
    function decorateRecharge() {
      var view = $('view-recharge'); if (!view) return;
      var amt = $('recharge-amount');
      if (amt && !$('pp-sum')) {
        var s = document.createElement('div'); s.id = 'pp-sum'; s.className = 'muted small'; s.style.margin = '4px 0 0';
        var eq = $('recharge-equivalent'); (eq || amt).insertAdjacentElement('afterend', s);
        amt.addEventListener('input', sumUpdate); amt.addEventListener('change', sumUpdate);
      }
      if (!$('pp-help')) {
        var cfg = window.CN_COMPANY || {}, sup = cfg.support || {}, link = sup.whatsapp ? 'https://wa.me/' + String(sup.whatsapp).replace(/\D/g, '') : (sup.email ? 'mailto:' + sup.email : '');
        var hp = document.createElement('p'); hp.id = 'pp-help'; hp.className = 'muted small'; hp.style.cssText = 'text-align:center;margin-top:10px';
        hp.innerHTML = 'Un souci avec un paiement ? Consultez l’état dans <a href="#" data-pp-go="wallet">Portefeuille › Mes recharges</a>' + (link ? ' ou <a href="' + esc(link) + '" target="_blank" rel="noopener">contactez le support</a>' : '') + '.';
        var note = $('pay-manual-note'); if (note) note.insertAdjacentElement('beforebegin', hp); else view.querySelector('.wrap').appendChild(hp);
        hp.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-pp-go]'); if (a) { e.preventDefault(); try { showDashboard(); showDashTab('wallet'); } catch (er) { /* ignore */ } } });
      }
      sumUpdate();
      // Mobile Money : les 3 étapes en clair (opérateur, demande sur le téléphone, code secret), dans la langue de la personne.
      var mm = $('pay-panel-mobile');
      if (mm) {
        var oldHow = $('pp-mm-how'); if (oldHow) oldHow.remove();
        var how = document.createElement('div'); how.id = 'pp-mm-how'; how.className = 'cn-how';
        how.innerHTML = '<div class="cn-how-title">' + esc(T('how_t')) + '</div><ol><li>' + esc(T('how_1')) + '</li><li>' + esc(T('how_2')) + '</li><li>' + esc(T('how_3')) + '</li></ol>';
        mm.appendChild(how);
      }
      // alerte : recharge déjà en cours
      var old = $('pp-pending'); if (old) old.remove();
      if (typeof currentUser !== 'undefined' && currentUser) {
        fetchTopups().then(function (list) {
          var cut = Date.now() - 3 * 3600000;
          var p = list.filter(function (r) { return (r.status === 'pending_payment' || r.status === 'pending' || r.status === 'pending_admin_review') && new Date(r.createdAt).getTime() > cut; })[0];
          if (!p || $('pp-pending')) return;
          var d = document.createElement('div'); d.id = 'pp-pending'; d.className = 'pp-ban wait'; d.innerHTML = '<b>Une recharge est déjà en cours</b>' + usd(p.amountUSD != null ? p.amountUSD : p.amount) + ' · ' + esc(METHOD[p.method] || 'Recharge') + ' · ' + esc(fmtDate(p.createdAt, true)) + '. Vérifiez son état avant d’en créer une nouvelle pour éviter un double paiement.';
          var h = view.querySelector('.page-title'); if (h) h.insertAdjacentElement('beforebegin', d);
        }).catch(function () { /* lecture non autorisée : pas d'alerte */ });
      }
    }
    function sumUpdate() {
      var s = $('pp-sum'), amt = $('recharge-amount'); if (!s || !amt) return;
      var v = parseFloat(amt.value || 0); var local = false;
      try { local = typeof payMethod !== 'undefined' && payMethod === 'mobile' && typeof payCurrency !== 'undefined' && payCurrency === 'local'; } catch (e) { /* ignore */ }
      if (!v || v <= 0 || local) { s.textContent = ''; return; }
      var min = 0; try { if (typeof isOptMethod === 'function' && isOptMethod()) min = CARD_OPT_MIN_USD; } catch (e) { /* ignore */ }
      if (min && v < min) { s.innerHTML = '<span class="pp-out">Montant minimum pour ce moyen de paiement : ' + min + ' $.</span>'; return; }
      s.innerHTML = 'Montant crédité sur votre solde : <b>' + v.toFixed(2) + ' $</b>';
    }
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#pay-method-tabs, #pay-operators, .cn-amt-chips')) setTimeout(sumUpdate, 50); });
  }
  go();
})();
