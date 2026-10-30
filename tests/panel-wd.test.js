// Retrait des gains (espace propriétaire du panel) : formulaire simple par pays, feuille de confirmation, mêmes règles côté serveur.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const panel = read('panel-store.js');
const i18n = read('panel-i18n.js');
const payouts = read('api/_lib/panel-payouts.js');

test('Retrait : plus de fenêtre confirm() du navigateur, une vraie feuille de confirmation', () => {
  assert.doesNotMatch(panel, /\bconfirm\(/);
  assert.match(panel, /function confirmSheet\(q\)/);
  assert.match(panel, /pm_wd_request', \{ method: q\.method, account: q\.account, holderName: q\.holder, amount: q\.amount, requestId: rid \}/);
});

test('Retrait : l\'indicatif du pays est ajouté tout seul (sans zéro de tête, sans doublon)', () => {
  const src = panel.match(/function wdDigits\(dial, raw\) \{[\s\S]*?\n  \}/);
  assert.ok(src, 'fonction wdDigits introuvable');
  const wdDigits = new Function(src[0] + '; return wdDigits;')();
  assert.strictEqual(wdDigits('256', '0772 123 456'), '256772123456');
  assert.strictEqual(wdDigits('256', '772123456'), '256772123456');
  assert.strictEqual(wdDigits('243', '+243 81 234 5678'), '243812345678');
  assert.strictEqual(wdDigits('243', '243812345678'), '243812345678');
  assert.strictEqual(wdDigits('', '243812345678'), '243812345678');
});

test('Retrait : tous les moyens du panel existent côté serveur, mêmes validations', () => {
  ['airtel', 'mtn', 'orange', 'mpesa', 'usdt-trc20', 'usdt-bep20'].forEach((id) => assert.ok(payouts.includes("'" + id + "'") || payouts.includes(id + ':'), id));
  const rows = [...panel.matchAll(/\['([A-Z]{2})', '(\d{2,3})', \[([^\]]*)\]\]/g)];
  assert.ok(rows.length >= 25, 'pays de retrait');
  const ops = new Set(); rows.forEach((m) => m[3].split(',').map((x) => x.replace(/['\s]/g, '')).filter(Boolean).forEach((o) => ops.add(o)));
  [...ops].forEach((o) => assert.ok(['mpesa', 'airtel', 'orange', 'mtn'].includes(o), 'opérateur inconnu : ' + o));
  // même contrôle d'adresse USDT que le serveur
  assert.match(panel, /\^T\[1-9A-HJ-NP-Za-km-z\]\{33\}\$/);
  assert.match(panel, /\^0x\[0-9a-fA-F\]\{40\}\$/);
  assert.match(payouts, /\^T\[1-9A-HJ-NP-Za-km-z\]\{33\}\$/);
});

test('Retrait : tous les textes existent dans les 5 langues', () => {
  ['g_tab_mm', 'g_tab_usdt', 'g_country', 'g_pick', 'g_other', 'g_op', 'g_pick_op', 'g_num', 'g_num_ph', 'g_num_full', 'g_net_t', 'g_all', 'g_continue', 'g_cf_t', 'g_cf_amt', 'g_cf_fee', 'g_cf_net', 'g_cf_to', 'g_cf_go', 'g_cf_edit', 'g_ok_t', 'g_ok_b', 'g_ok_close', 'g_e_country', 'g_e_op', 'g_e_name', 'g_e_num', 'g_e_addr'].forEach((k) => {
    assert.strictEqual((i18n.match(new RegExp('\\b' + k + ': ', 'g')) || []).length, 5, k + ' dans les 5 langues');
  });
  assert.match(i18n, /g_ok_b: '[^']*\{net\}/);
});
