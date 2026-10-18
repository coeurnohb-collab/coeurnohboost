/* Coeurnoh Universe — Factures & Reçus professionnels.
   Add-on : tableau de bord, statuts, paiements/reçus, TVA, échéance, profil d'entreprise,
   lien public sécurisé (/p/facture/<id>?t=<jeton>), partage WhatsApp, relance, duplication, export CSV.
   Ne modifie ni script.js ni app.min.js : surcharge les fonctions globales de l'écran Factures. */
(function () {
  'use strict';
  if (window.__cnInvoicePro) return; window.__cnInvoicePro = true;
  var tries = 0;
  function go() {
    if (typeof window.openInvoiceForm !== 'function' || typeof window.renderInvoiceList !== 'function' || typeof window.viewInvoice !== 'function') { if (++tries < 120) setTimeout(go, 250); return; }
    main();
  }
  function main() {

  var ORIGIN = 'https://coeurnohuniverse.com';
  var filt = 'all', q = '';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) { /* ignore */ } }
  function errMsg(e) { try { return friendlyErrorMessage(e); } catch (x) { return (e && e.message) || 'Erreur'; } }
  function uid() { try { return currentUser && currentUser.uid; } catch (e) { return null; } }
  function money(n, cur) { var v = Number(n) || 0; return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (cur === 'CDF' ? 'FC' : '$'); }
  function dstr(v) { var d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  /* ---------- Statut (même logique que la page publique) ---------- */
  function state(inv) {
    var total = Number(inv.total) || 0;
    var paid = Math.min(total, (inv.payments || []).reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0));
    if (inv.status === 'cancelled') return { key: 'cancelled', label: 'Annulée', paid: paid, due: 0 };
    if (total > 0 && paid >= total - 0.005) return { key: 'paid', label: 'Payée', paid: paid, due: 0 };
    var late = inv.dueDate && inv.dueDate < today();
    if (paid > 0) return { key: late ? 'late' : 'partial', label: late ? 'En retard' : 'Partielle', paid: paid, due: total - paid };
    return { key: late ? 'late' : 'open', label: late ? 'En retard' : 'À payer', paid: paid, due: total };
  }

  /* ---------- Profil d'entreprise (local + copié dans chaque facture) ---------- */
  function pkey() { return 'cn_inv_profile_' + (uid() || 'x'); }
  function getProfile() { try { return JSON.parse(localStorage.getItem(pkey()) || '{}') || {}; } catch (e) { return {}; } }
  function setProfile(p) { try { localStorage.setItem(pkey(), JSON.stringify(p)); } catch (e) { /* ignore */ } }
  function issuerSnapshot() {
    var p = getProfile(), o = {};
    ['name', 'address', 'phone', 'email', 'taxId', 'payInfo'].forEach(function (k) { if (p[k]) o[k] = String(p[k]).slice(0, 300); });
    if (/^https:\/\//.test(p.logo || '')) o.logo = p.logo.slice(0, 500);
    return o;
  }

  /* ---------- CSS ---------- */
  var CSS = '.ip-dash{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.ip-k{background:var(--white,#fff);border-radius:16px;padding:14px;box-shadow:0 2px 12px rgba(20,38,63,.07)}' +
    '.ip-k small{display:block;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#5d6779)}.ip-k b{display:block;font-size:1.15rem;margin-top:4px}.ip-k.bad b{color:#b0182c}.ip-k.ok b{color:#0b7a50}' +
    '.ip-tools{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}.ip-tools button{border:1px solid var(--line,#dde3ec);background:var(--white,#fff);border-radius:12px;padding:9px 12px;font-weight:700;font-size:.82rem;cursor:pointer;color:inherit}' +
    '.ip-chips{display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;scrollbar-width:none}.ip-chips::-webkit-scrollbar{display:none}.ip-chips button{flex:0 0 auto;border:0;border-radius:999px;padding:7px 13px;font-weight:700;font-size:.78rem;background:#e9edf3;color:#34415a;cursor:pointer}.ip-chips button.on{background:#14263f;color:#fff}' +
    '.ip-row{display:flex;justify-content:space-between;gap:10px;background:var(--white,#fff);border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:0 2px 12px rgba(20,38,63,.07);cursor:pointer}.ip-row b{display:block}.ip-row small{color:var(--muted,#5d6779)}.ip-r{text-align:right;white-space:nowrap}' +
    '.ip-pill{display:inline-block;padding:3px 9px;border-radius:999px;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-top:4px}.ip-pill.paid{background:#e3f6ec;color:#0b7a50}.ip-pill.open{background:#e8f0fa;color:#1d4f91}.ip-pill.partial{background:#fff3d6;color:#8a5a00}.ip-pill.late{background:#fde5e8;color:#b0182c}.ip-pill.cancelled{background:#e9edf3;color:#4a5568}' +
    '.ip-bar{height:6px;border-radius:3px;background:#e3e8f0;margin-top:8px;overflow:hidden}.ip-bar i{display:block;height:100%;background:#0b9a6a}' +
    '.ip-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 8px}.ip-acts .btn{justify-content:center;width:100%}.ip-sec{font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#5d6779);margin:16px 0 8px}' +
    '.ip-pay{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--line,#e5e9f0);font-size:.88rem}.ip-pay a{color:var(--primary,#1d4f91);font-weight:700;cursor:pointer}' +
    '.ip-two{display:flex;gap:8px}.ip-two>*{flex:1;min-width:0}.ip-modal .modal{max-height:92vh;overflow-y:auto}';
  function css() { if ($('ip-css')) return; var s = document.createElement('style'); s.id = 'ip-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- Liste + tableau de bord ---------- */
  function stats(list) {
    var o = { billed: { USD: 0, CDF: 0 }, paid: { USD: 0, CDF: 0 }, due: { USD: 0, CDF: 0 }, late: 0, n: list.length };
    list.forEach(function (i) {
      var s = state(i), c = i.currency === 'CDF' ? 'CDF' : 'USD';
      if (s.key === 'cancelled') return;
      o.billed[c] += Number(i.total) || 0; o.paid[c] += s.paid; o.due[c] += s.due; if (s.key === 'late') o.late++;
    });
    return o;
  }
  function sum2(o) { var a = []; if (o.USD) a.push(money(o.USD, 'USD')); if (o.CDF) a.push(money(o.CDF, 'CDF')); return a.length ? a.join(' + ') : money(0, 'USD'); }
  function matches(i) {
    var s = state(i);
    if (filt !== 'all' && s.key !== filt) return false;
    if (q) { var h = ((i.number || '') + ' ' + (i.clientName || '') + ' ' + (i.clientPhone || '')).toLowerCase(); if (h.indexOf(q) < 0) return false; }
    return true;
  }
  function rowsHtml(list) {
    var l = list.filter(matches);
    if (!l.length) return '<p class="muted small" style="text-align:center;padding:24px 0">Aucune facture ne correspond.</p>';
    return l.map(function (i) {
      var s = state(i), cur = i.currency || 'USD', pct = Number(i.total) > 0 ? Math.min(100, s.paid / i.total * 100) : 0;
      return '<div class="ip-row" data-id="' + esc(i.id) + '"><div><b>' + esc(i.number || '—') + '</b><small>' + esc(i.clientName || 'Client') + ' · ' + esc(dstr(i.createdAt)) + '</small><br><span class="ip-pill ' + s.key + '">' + esc(s.label) + '</span>' +
        (s.key === 'partial' || s.key === 'late' && s.paid > 0 ? '<div class="ip-bar"><i style="width:' + pct.toFixed(0) + '%"></i></div>' : '') + '</div>' +
        '<div class="ip-r"><b>' + esc(money(i.total, cur)) + '</b>' + (s.due > 0 && s.paid > 0 ? '<small>Reste ' + esc(money(s.due, cur)) + '</small>' : '') + (i.dueDate && s.due > 0 ? '<small style="display:block">Éch. ' + esc(dstr(i.dueDate + 'T12:00:00')) + '</small>' : '') + '</div></div>';
    }).join('');
  }
  var origRender = window.renderInvoiceList;
  window.renderInvoiceList = function (list) {
    var el = $('invoice-list'); if (!el) return;
    css();
    if (!list || !list.length) {
      el.innerHTML = '<div class="ip-tools"><button type="button" data-ip="profile">Mon entreprise</button></div><p class="muted small" style="text-align:center;padding:20px 0">Aucune facture pour l’instant. Crée la première : elle aura un numéro unique, un lien à partager et un suivi des paiements.</p>';
      bind(el, list || []); return;
    }
    var s = stats(list);
    var counts = { all: list.length }; list.forEach(function (i) { var k = state(i).key; counts[k] = (counts[k] || 0) + 1; });
    var chips = [['all', 'Toutes'], ['open', 'À payer'], ['partial', 'Partielles'], ['late', 'En retard'], ['paid', 'Payées'], ['cancelled', 'Annulées']].filter(function (c) { return c[0] === 'all' || counts[c[0]]; })
      .map(function (c) { return '<button type="button" data-chip="' + c[0] + '" class="' + (filt === c[0] ? 'on' : '') + '">' + c[1] + ' (' + (counts[c[0]] || 0) + ')</button>'; }).join('');
    el.innerHTML = '<div class="ip-dash"><div class="ip-k"><small>Facturé</small><b>' + esc(sum2(s.billed)) + '</b></div><div class="ip-k ok"><small>Encaissé</small><b>' + esc(sum2(s.paid)) + '</b></div>' +
      '<div class="ip-k"><small>À encaisser</small><b>' + esc(sum2(s.due)) + '</b></div><div class="ip-k ' + (s.late ? 'bad' : '') + '"><small>En retard</small><b>' + s.late + ' facture' + (s.late > 1 ? 's' : '') + '</b></div></div>' +
      '<div class="ip-tools"><button type="button" data-ip="profile">Mon entreprise</button><button type="button" data-ip="csv">Exporter (CSV)</button></div>' +
      '<input type="search" id="ip-q" class="text-input" placeholder="Rechercher un numéro ou un client" style="margin-bottom:10px" value="' + esc(q) + '">' +
      '<div class="ip-chips" id="ip-chips">' + chips + '</div><div id="ip-items">' + rowsHtml(list) + '</div>';
    bind(el, list);
  };
  function bind(el, list) {
    el.onclick = function (e) {
      var t = e.target.closest ? e.target : null; if (!t) return;
      var chip = t.closest('[data-chip]'); if (chip) { filt = chip.getAttribute('data-chip'); window.renderInvoiceList(list); return; }
      var tool = t.closest('[data-ip]'); if (tool) { var a = tool.getAttribute('data-ip'); if (a === 'profile') openProfile(); else if (a === 'csv') exportCsv(list); return; }
      var row = t.closest('.ip-row'); if (row) window.viewInvoice(row.getAttribute('data-id'));
    };
    var qi = $('ip-q'); if (qi) qi.oninput = function () { q = qi.value.trim().toLowerCase(); var it = $('ip-items'); if (it) it.innerHTML = rowsHtml(list); };
  }
  function exportCsv(list) {
    var rows = [['Numero', 'Date', 'Echeance', 'Client', 'Telephone', 'Devise', 'Sous-total', 'Remise', 'TVA', 'Total', 'Paye', 'Reste', 'Statut']];
    list.forEach(function (i) { var s = state(i); rows.push([i.number, (i.createdAt || '').slice(0, 10), i.dueDate || '', i.clientName, i.clientPhone, i.currency || 'USD', i.subtotal, i.discountAmount || 0, i.taxAmount || 0, i.total, round2(s.paid), round2(s.due), s.label]); });
    var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); if (/^[=+\-@]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; }).join(';'); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'factures-' + today() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Profil d'entreprise ---------- */
  function openProfile() {
    css(); if ($('ip-profile')) return;
    var p = getProfile();
    var f = function (id, label, val, ph, type) { return '<div class="field"><label for="ipp-' + id + '">' + label + '</label><input id="ipp-' + id + '" type="' + (type || 'text') + '" class="text-input" maxlength="300" placeholder="' + esc(ph || '') + '" value="' + esc(val || '') + '"></div>'; };
    document.body.insertAdjacentHTML('beforeend', '<div class="modal-overlay ip-modal" id="ip-profile" style="z-index:2300"><div class="modal" style="max-width:460px"><button class="modal-close" id="ipp-x" aria-label="Fermer">×</button>' +
      '<h3 style="margin-bottom:6px">Mon entreprise</h3><p class="muted small" style="margin-bottom:14px">Ces informations apparaissent sur toutes tes factures et reçus.</p>' +
      f('name', 'Nom de l’entreprise ou du professionnel', p.name, 'ex: Studio Lumière') + f('address', 'Adresse', p.address, 'ex: Av. de la Paix, Goma') +
      '<div class="ip-two">' + f('phone', 'Téléphone', p.phone, '+243...', 'tel') + f('email', 'E-mail', p.email, '', 'email') + '</div>' +
      f('taxId', 'N° fiscal / RCCM (facultatif)', p.taxId, '') + f('logo', 'Lien du logo (https, facultatif)', p.logo, 'https://...') +
      '<div class="field"><label for="ipp-payInfo">Comment te payer (affiché sur la facture)</label><textarea id="ipp-payInfo" class="text-input" rows="3" maxlength="300" placeholder="ex: M-Pesa +243... / Airtel Money +243... / Virement">' + esc(p.payInfo || '') + '</textarea></div>' +
      '<div class="ip-two">' + f('tax', 'TVA par défaut (%)', p.tax, '0', 'number') + f('days', 'Échéance par défaut (jours)', p.days, '7', 'number') + '</div>' +
      '<button class="btn btn-primary" id="ipp-save" style="width:100%;justify-content:center">Enregistrer</button></div></div>');
    $('ipp-x').onclick = function () { $('ip-profile').remove(); };
    $('ipp-save').onclick = function () {
      var g = function (k) { var e = $('ipp-' + k); return e ? e.value.trim() : ''; };
      var logo = g('logo'); if (logo && !/^https:\/\//.test(logo)) { toast('Le lien du logo doit commencer par https://', 'error'); return; }
      var tax = Math.max(0, Math.min(50, parseFloat(g('tax')) || 0)), days = Math.max(0, Math.min(365, parseInt(g('days'), 10) || 0));
      setProfile({ name: g('name'), address: g('address'), phone: g('phone'), email: g('email'), taxId: g('taxId'), logo: logo, payInfo: g('payInfo'), tax: tax || '', days: days || '' });
      $('ip-profile').remove(); toast('Profil enregistré', 'success');
    };
  }

  /* ---------- Formulaire : échéance + TVA ---------- */
  var origForm = window.openInvoiceForm;
  window.openInvoiceForm = function (id) {
    origForm.apply(this, arguments);
    var modal = $('invoice-form-modal'); if (!modal || $('inv-due')) return;
    css();
    var ex = id ? (window.invoicesCache || (typeof invoicesCache !== 'undefined' ? invoicesCache : []) || []).find(function (i) { return i.id === id; }) : null;
    var p = getProfile(), d = new Date(); d.setDate(d.getDate() + (parseInt(p.days, 10) || 0));
    var due = ex ? (ex.dueDate || '') : (p.days ? d.toISOString().slice(0, 10) : '');
    var tax = ex ? (ex.taxRate || '') : (p.tax || '');
    var notes = $('inv-notes'), anchor = notes && notes.closest('.field');
    var html = '<div class="ip-two"><div class="field"><label for="inv-due">Échéance</label><input type="date" id="inv-due" class="text-input" value="' + esc(due) + '"></div>' +
      '<div class="field"><label for="inv-tax">TVA (%)</label><input type="number" id="inv-tax" class="text-input" min="0" max="50" step="0.5" placeholder="0" value="' + esc(tax) + '" oninput="recalcInvoiceTotals()"></div></div>';
    if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
    var tot = $('inv-total-display'), trow = tot && tot.parentElement;
    if (trow) trow.insertAdjacentHTML('beforebegin', '<div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:4px"><span class="muted">TVA</span><span id="inv-tax-display">0.00</span></div>');
    window.recalcInvoiceTotals();
  };
  window.recalcInvoiceTotals = function () {
    var items = readInvoiceItemsFromForm();
    var subtotal = items.reduce(function (s, it) { return s + it.qty * it.price; }, 0);
    var dt = $('inv-discount-type') ? $('inv-discount-type').value : 'none', dv = parseFloat($('inv-discount-value') && $('inv-discount-value').value) || 0, disc = 0;
    if (dt === 'percent') disc = subtotal * (Math.min(dv, 100) / 100); else if (dt === 'amount') disc = dv;
    disc = Math.min(disc, subtotal);
    var rate = Math.max(0, Math.min(50, parseFloat($('inv-tax') && $('inv-tax').value) || 0)), taxAmount = round2((subtotal - disc) * rate / 100);
    var total = round2(subtotal - disc + taxAmount);
    if ($('inv-subtotal-display')) $('inv-subtotal-display').textContent = subtotal.toFixed(2);
    if ($('inv-discount-display')) $('inv-discount-display').textContent = '-' + disc.toFixed(2);
    if ($('inv-tax-display')) $('inv-tax-display').textContent = taxAmount.toFixed(2);
    if ($('inv-total-display')) $('inv-total-display').textContent = total.toFixed(2);
    return { subtotal: subtotal, discountAmount: disc, taxAmount: taxAmount, taxRate: rate, total: total };
  };
  window.saveInvoiceForm = async function () {
    var btn = $('invoice-save-btn'), msg = $('invoice-form-msg');
    var clientName = $('inv-client-name').value.trim(), clientPhone = $('inv-client-phone').value.trim(), currency = $('inv-currency').value;
    var discountType = $('inv-discount-type').value, discountValue = parseFloat($('inv-discount-value').value) || 0, notes = $('inv-notes').value.trim();
    var items = readInvoiceItemsFromForm();
    if (!clientName) { msg.textContent = 'Indique le nom du client.'; return; }
    if (!items.length) { msg.textContent = 'Ajoute au moins une ligne (description et quantité).'; return; }
    var T = window.recalcInvoiceTotals();
    if (btn.disabled) return; btn.disabled = true; var old = btn.textContent; btn.textContent = 'Enregistrement…'; msg.textContent = '';
    var dueEl = $('inv-due'), due = dueEl && /^\d{4}-\d{2}-\d{2}$/.test(dueEl.value) ? dueEl.value : '';
    var payload = { ownerUid: currentUser.uid, clientName: clientName, clientPhone: clientPhone, currency: currency, items: items, discountType: discountType, discountValue: discountValue,
      subtotal: T.subtotal, discountAmount: T.discountAmount, taxRate: T.taxRate, taxAmount: T.taxAmount, total: T.total, notes: notes, dueDate: due, issuer: issuerSnapshot(), updatedAt: new Date().toISOString() };
    var editing = invoiceEditingId;
    try {
      if (editing) { await db.collection('invoices').doc(editing).update(payload); }
      else {
        payload.createdAt = new Date().toISOString(); payload.status = 'issued'; payload.payments = [];
        var cRef = db.collection('invoice_counters').doc(currentUser.uid), iRef = db.collection('invoices').doc();
        await db.runTransaction(async function (tx) {
          var cd = await tx.get(cRef), next = (cd.exists ? (cd.data().count || 0) : 0) + 1;
          payload.number = 'FA-' + String(next).padStart(4, '0');
          tx.set(cRef, { count: next }, { merge: true }); tx.set(iRef, payload);
        });
      }
      closeInvoiceForm(); invoicesCache = null; toast(editing ? 'Facture mise à jour' : 'Facture créée', 'success'); loadInvoices();
    } catch (e) { msg.textContent = errMsg(e); btn.disabled = false; btn.textContent = old; }
  };

  /* ---------- Détail d'une facture ---------- */
  function findInv(id) { return (typeof invoicesCache !== 'undefined' && invoicesCache || []).find(function (i) { return i.id === id; }); }
  function link(inv, r) { return ORIGIN + '/p/facture/' + encodeURIComponent(inv.id) + '?t=' + encodeURIComponent(inv.shareToken) + (r != null ? '&r=' + r : ''); }
  function newToken() { var a = new Uint8Array(18); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (b) { return b.toString(36).padStart(2, '0'); }).join('').slice(0, 28); }
  async function ensureLink(inv) {
    if (inv.shareToken && inv.shareEnabled !== false) return inv;
    var tok = inv.shareToken || newToken();
    await db.collection('invoices').doc(inv.id).update({ shareToken: tok, shareEnabled: true });
    inv.shareToken = tok; inv.shareEnabled = true; return inv;
  }
  async function patch(inv, data) { await db.collection('invoices').doc(inv.id).update(Object.assign({ updatedAt: new Date().toISOString() }, data)); Object.assign(inv, data); }
  function digits(ph) { return String(ph || '').replace(/[^\d]/g, ''); }

  window.viewInvoice = async function (id) {
    var inv = findInv(id);
    if (!inv) {
      try { var doc = await db.collection('invoices').doc(id).get(); if (!doc.exists) { toast('Facture introuvable', 'error'); return; } inv = Object.assign({ id: doc.id }, doc.data()); }
      catch (e) { toast(errMsg(e), 'error'); return; }
    }
    css(); var old = $('invoice-view-modal'); if (old) old.remove();
    var s = state(inv), cur = inv.currency || 'USD', items = (inv.items || []).map(function (it) {
      return '<div class="ip-pay"><span style="flex:1">' + esc(it.desc) + '<br><small class="muted">' + esc(it.qty) + ' × ' + esc(money(it.price, cur)) + '</small></span><b>' + esc(money(it.qty * it.price, cur)) + '</b></div>';
    }).join('');
    var pays = (inv.payments || []).map(function (p, i) {
      return '<div class="ip-pay"><span>' + esc(dstr(p.date)) + ' · ' + esc(p.method || '') + '</span><span><b>' + esc(money(p.amount, cur)) + '</b> &nbsp;<a data-ip="receipt" data-i="' + i + '">Reçu</a></span></div>';
    }).join('');
    var line = function (l, v, b) { return '<div style="display:flex;justify-content:space-between;padding:4px 0;' + (b ? 'font-weight:800;font-size:1.05rem;border-top:2px solid var(--line,#dde3ec);margin-top:4px;padding-top:8px' : 'font-size:.9rem') + '"><span class="' + (b ? '' : 'muted') + '">' + l + '</span><span>' + v + '</span></div>'; };
    document.body.insertAdjacentHTML('beforeend', '<div class="modal-overlay ip-modal" id="invoice-view-modal"><div class="modal" style="max-width:480px"><button class="modal-close" id="ipv-x" aria-label="Fermer">×</button>' +
      '<h3 style="margin-bottom:2px">Facture ' + esc(inv.number || '') + '</h3><p class="muted small" style="margin:0 0 4px">' + esc(dstr(inv.createdAt)) + (inv.dueDate ? ' · Échéance ' + esc(dstr(inv.dueDate + 'T12:00:00')) : '') + '</p><span class="ip-pill ' + s.key + '">' + esc(s.label) + '</span>' +
      '<div class="ip-sec">Client</div><b>' + esc(inv.clientName || 'Client') + '</b>' + (inv.clientPhone ? '<div class="muted small">' + esc(inv.clientPhone) + '</div>' : '') +
      '<div class="ip-sec">Détail</div>' + items + '<div style="margin-top:8px">' + line('Sous-total', esc(money(inv.subtotal, cur))) + (inv.discountAmount ? line('Remise', '-' + esc(money(inv.discountAmount, cur))) : '') + (inv.taxAmount ? line('TVA (' + esc(inv.taxRate) + ' %)', esc(money(inv.taxAmount, cur))) : '') + line('Total', esc(money(inv.total, cur)), true) +
      (s.paid ? line('Déjà payé', esc(money(s.paid, cur))) : '') + (s.due > 0 ? '<div style="display:flex;justify-content:space-between;color:#b0182c;font-weight:800;padding:4px 0"><span>Reste à payer</span><span>' + esc(money(s.due, cur)) + '</span></div>' : '') + '</div>' +
      (pays ? '<div class="ip-sec">Paiements reçus</div>' + pays : '') + (inv.notes ? '<p class="muted small" style="margin-top:12px">' + esc(inv.notes) + '</p>' : '') +
      '<div class="ip-acts">' +
      (s.due > 0 && s.key !== 'cancelled' ? '<button class="btn btn-primary" data-ip="pay">Encaisser un paiement</button>' : '') +
      '<button class="btn btn-outline" data-ip="share">Partager</button><button class="btn btn-outline" data-ip="wa">WhatsApp</button>' +
      (s.due > 0 && s.key !== 'cancelled' ? '<button class="btn btn-outline" data-ip="remind">Relancer le client</button>' : '') +
      '<button class="btn btn-outline" data-ip="print">Imprimer / PDF</button><button class="btn btn-outline" data-ip="edit">Modifier</button>' +
      '<button class="btn btn-outline" data-ip="dup">Dupliquer</button>' + (s.key !== 'cancelled' && s.key !== 'paid' ? '<button class="btn btn-outline" data-ip="cancel">Annuler la facture</button>' : '') +
      '<button class="btn btn-outline" data-ip="revoke" style="grid-column:1/-1">Désactiver le lien public</button>' +
      '<button class="btn btn-outline" data-ip="del" style="grid-column:1/-1;color:var(--red-text,#b0182c);border-color:var(--red-text,#b0182c)">Supprimer</button></div></div></div>');
    var modal = $('invoice-view-modal'); $('ipv-x').onclick = function () { modal.remove(); };
    modal.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-ip]'); if (!el) return;
      act(inv, el.getAttribute('data-ip'), el, modal);
    });
  };

  function shareText(inv, kind) {
    var s = state(inv), cur = inv.currency || 'USD', who = (inv.issuer && inv.issuer.name) || '';
    var base = kind === 'remind'
      ? 'Bonjour ' + (inv.clientName || '') + ', petit rappel : la facture ' + inv.number + (who ? ' de ' + who : '') + ' d’un reste de ' + money(s.due, cur) + (inv.dueDate ? ' était à régler avant le ' + dstr(inv.dueDate + 'T12:00:00') : ' est en attente de règlement') + '. Tu peux la consulter ici :'
      : 'Bonjour ' + (inv.clientName || '') + ', voici ta facture ' + inv.number + (who ? ' (' + who + ')' : '') + ' d’un montant de ' + money(inv.total, cur) + '. Consulte-la ici :';
    return base + '\n' + link(inv);
  }
  async function act(inv, a, el, modal) {
    try {
      if (a === 'receipt') { await ensureLink(inv); window.open(link(inv, parseInt(el.getAttribute('data-i'), 10)), '_blank', 'noopener'); return; }
      if (a === 'print') { await ensureLink(inv); window.open(link(inv), '_blank', 'noopener'); return; }
      if (a === 'share' || a === 'wa' || a === 'remind') {
        await ensureLink(inv); var txt = shareText(inv, a === 'remind' ? 'remind' : 'send');
        if (a === 'share' && navigator.share) { try { await navigator.share({ title: 'Facture ' + inv.number, text: txt }); } catch (e) { /* annulé */ } return; }
        if (a === 'share') { try { await navigator.clipboard.writeText(link(inv)); toast('Lien copié', 'success'); } catch (e) { toast(link(inv), 'info'); } return; }
        var ph = digits(inv.clientPhone); window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(txt), '_blank', 'noopener'); return;
      }
      if (a === 'edit') { modal.remove(); window.openInvoiceForm(inv.id); return; }
      if (a === 'pay') { openPay(inv, modal); return; }
      if (a === 'dup') {
        modal.remove();
        var c = { ownerUid: currentUser.uid, clientName: inv.clientName, clientPhone: inv.clientPhone || '', currency: inv.currency || 'USD', items: inv.items || [], discountType: inv.discountType || 'none', discountValue: inv.discountValue || 0,
          subtotal: inv.subtotal, discountAmount: inv.discountAmount || 0, taxRate: inv.taxRate || 0, taxAmount: inv.taxAmount || 0, total: inv.total, notes: inv.notes || '', dueDate: '', issuer: issuerSnapshot(), status: 'issued', payments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        var cRef = db.collection('invoice_counters').doc(currentUser.uid), iRef = db.collection('invoices').doc();
        await db.runTransaction(async function (tx) { var cd = await tx.get(cRef), n = (cd.exists ? (cd.data().count || 0) : 0) + 1; c.number = 'FA-' + String(n).padStart(4, '0'); tx.set(cRef, { count: n }, { merge: true }); tx.set(iRef, c); });
        invoicesCache = null; toast('Facture dupliquée : ' + c.number, 'success'); loadInvoices(); return;
      }
      if (a === 'cancel') { if (!confirm('Annuler cette facture ? Elle restera dans ton historique.')) return; await patch(inv, { status: 'cancelled' }); modal.remove(); invoicesCache = null; loadInvoices(); toast('Facture annulée', 'info'); return; }
      if (a === 'revoke') { if (!inv.shareToken) { toast('Aucun lien public actif', 'info'); return; } if (!confirm('Le lien déjà envoyé ne fonctionnera plus. Continuer ?')) return; await patch(inv, { shareEnabled: false, shareToken: newToken() }); toast('Lien public désactivé', 'success'); return; }
      if (a === 'del') { modal.remove(); window.deleteInvoiceConfirm(inv.id); return; }
    } catch (e) { toast(errMsg(e), 'error'); }
  }

  /* ---------- Encaisser un paiement -> reçu ---------- */
  function openPay(inv, parent) {
    var s = state(inv), cur = inv.currency || 'USD';
    if ($('ip-pay')) return;
    var methods = ['Espèces', 'M-Pesa', 'Airtel Money', 'Orange Money', 'Virement bancaire', 'Carte', 'Autre'];
    document.body.insertAdjacentHTML('beforeend', '<div class="modal-overlay ip-modal" id="ip-pay" style="z-index:2300"><div class="modal" style="max-width:400px"><button class="modal-close" id="ipy-x" aria-label="Fermer">×</button>' +
      '<h3 style="margin-bottom:4px">Encaisser un paiement</h3><p class="muted small" style="margin-bottom:12px">Reste à payer : <b>' + esc(money(s.due, cur)) + '</b></p>' +
      '<div class="field"><label for="ipy-amt">Montant reçu</label><input id="ipy-amt" type="number" class="text-input" min="0" step="0.01" value="' + round2(s.due) + '"></div>' +
      '<div class="field"><label for="ipy-m">Mode de paiement</label><select id="ipy-m" class="select-input">' + methods.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="ipy-d">Date</label><input id="ipy-d" type="date" class="text-input" value="' + today() + '"></div>' +
      '<button class="btn btn-primary" id="ipy-ok" style="width:100%;justify-content:center">Enregistrer et générer le reçu</button><p class="muted small" id="ipy-msg" style="margin-top:6px"></p></div></div>');
    $('ipy-x').onclick = function () { $('ip-pay').remove(); };
    $('ipy-ok').onclick = async function () {
      var amt = round2(parseFloat($('ipy-amt').value)), msg = $('ipy-msg');
      if (!(amt > 0)) { msg.textContent = 'Indique un montant valide.'; return; }
      if (amt > s.due + 0.005) { msg.textContent = 'Le montant dépasse le reste à payer.'; return; }
      var d = $('ipy-d').value || today(); $('ipy-ok').disabled = true;
      try {
        var pays = (inv.payments || []).concat([{ amount: amt, method: $('ipy-m').value, date: new Date(d + 'T12:00:00').toISOString(), id: 'p' + Date.now().toString(36) }]);
        await ensureLink(inv); await patch(inv, { payments: pays });
        $('ip-pay').remove(); if (parent) parent.remove(); invoicesCache = null; await loadInvoices(); toast('Paiement enregistré', 'success');
        window.viewInvoice(inv.id);
      } catch (e) { msg.textContent = errMsg(e); $('ipy-ok').disabled = false; }
    };
  }

  window.printInvoice = function (id) { var inv = findInv(id); if (!inv) return; ensureLink(inv).then(function () { window.open(link(inv), '_blank', 'noopener'); }).catch(function (e) { toast(errMsg(e), 'error'); }); };
  window.CNInvoicePro = { _state: state, _stats: stats };
  }
  go();
})();
