// tests/counters.test.js — garde-fou des compteurs publics (likes, candidatures, inscriptions)
// et des alertes produits. Ces règles sont appliquées par Firestore (voir les règles collées dans la console) :
// côté application, chaque +1 / -1 doit partir dans le même « batch » que le document correspondant.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('compteurs : likesCount / applicationsCount / studentsCount ne bougent que dans un batch', () => {
  const lines = read('script.js').split('\n');
  const bad = [];
  lines.forEach((line, i) => {
    if (!/(likesCount|applicationsCount|studentsCount):\s*firebase\.firestore\.FieldValue\.increment\(/.test(line)) return;
    const ctx = lines.slice(Math.max(0, i - 1), i + 1).join(' ');
    if (!/(\w*[bB]atch\w*|cb)\.update\(/.test(ctx)) bad.push(`script.js:${i + 1}  ${line.trim().slice(0, 100)}`);
  });
  assert.deepStrictEqual(bad, [], 'Ces compteurs doivent être modifiés dans le même batch que le document like / candidature / inscription (sinon les règles Firestore les refusent) :\n' + bad.join('\n'));
});

test('compteurs : le like retiré et le like créé passent par db.batch()', () => {
  const s = read('script.js');
  assert.ok((s.match(/db\.batch\(\)/g) || []).length >= 6, 'les 6 écritures atomiques (2 likes, 2 likes de commentaire, candidature, inscription) sont attendues');
  assert.doesNotMatch(s, /await likeRef\.delete\(\);\s*\n\s*await pubRef\.update/, 'unlike : delete + update séparés interdits');
});

test('alertes produits : la comparaison se fait côté serveur, plus dans le téléphone', () => {
  const s = read('script.js');
  assert.doesNotMatch(s, /collection\('alerts'\)\.where\('active'/, 'un téléphone ne doit plus lire les alertes des autres personnes');
  assert.match(s, /action: 'check-alerts'/);
  const n = read('api/notify-user.js');
  assert.match(n, /action === 'check-alerts'/);
  assert.match(n, /prod\.sellerUid !== callerUid/, 'seul le vendeur du produit peut déclencher la vérification');
  assert.match(n, /alertsCheckedAt/, 'une seule vérification par produit');
});
