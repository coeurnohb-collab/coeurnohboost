/* =====================================================================
   academy-learn.js — Académie : quiz à chaque niveau, examen final, progression, questions au formateur
   Chargé par stability.js (après academy-studio.js). Expose window.CNLearn.
   - Quiz de chapitre : une question à la fois, réponses mélangées, correction expliquée, nouvel essai.
   - Examen final du cours : requis pour le certificat quand le formateur en crée un.
   - Tableau de progression de l'élève, questions / réponses avec le formateur.
   Les notes et la correction sont décidées par le SERVEUR (api/_lib/academy-extras.js).
   ===================================================================== */
(function () {
  'use strict';
  if (window.CNLearn) return;

  var T = {
    fr: {
      qOf: 'Question {a} sur {b}', prev: 'Précédent', next: 'Suivant', finish: 'Terminer et corriger', close: 'Fermer', retry: 'Réessayer', retryBetter: 'Améliorer mon score',
      pickOne: 'Choisis une réponse pour continuer.', chTitle: 'Quiz', finalTitle: 'Examen final', passMark: 'Seuil de réussite : {n} %',
      passed: 'Bravo, c\'est validé !', failed: 'Pas encore validé', passedS: 'Tu as réussi avec {n} %. Relis les explications pour consolider.', failedS: 'Tu as obtenu {n} %, il faut {m} %. Lis les explications, révise le chapitre, puis réessaie : c\'est comme ça qu\'on apprend.',
      best: 'Meilleur score : {n} %', tries: 'Essais : {n}', correct: '{a} bonnes réponses sur {b}', review: 'Correction détaillée', onlyWrong: 'Mes erreurs', all: 'Tout', yourAnswer: 'Ta réponse', goodAnswer: 'Bonne réponse', noWrong: 'Aucune erreur, parfait !', noWhy: 'Pas d\'explication fournie.',
      loadFail: 'Impossible de charger ce quiz pour le moment.', saveFail: 'Enregistrement impossible.',
      edQuiz: 'Quiz du chapitre', edFinal: 'Examen final du cours', edHelpQ: 'Écris des questions claires. Ajoute une explication : elle s\'affiche après la correction et aide l\'élève à comprendre.', edHelpF: 'L\'examen final couvre tout le cours (5 questions minimum). Si tu en crées un, il devient obligatoire pour obtenir le certificat.',
      qLabel: 'Question {n}', qPh: 'Énonce de la question', optPh: 'Réponse {n}', rightL: 'Bonne réponse', whyL: 'Explication (conseillée)', whyPh: 'Pourquoi cette réponse est la bonne ?', add: 'Ajouter une question', addOpt: 'Ajouter une réponse', rm: 'Retirer', save: 'Enregistrer', saved: 'Enregistré', removeAll: 'Supprimer ce quiz', counter: '{a} / {b} questions', empty: 'Aucune question pour le moment.', min5: 'L\'examen final doit avoir au moins 5 questions.',
      progT: 'Ma progression', progS: '{a} chapitre(s) sur {b} terminé(s)', quizzesS: 'Quiz validés', finalS: 'Examen final', finalTodo: 'À passer', finalDone: 'Validé : {n} %', finalLocked: 'Termine d\'abord tous les chapitres', nextStep: 'Prochaine étape', nextChapter: 'Continue le chapitre « {t} »', nextQuiz: 'Passe le quiz du chapitre « {t} »', nextFinal: 'Passe l\'examen final', nextCert: 'Récupère ton certificat ci-dessous', allDone: 'Cours terminé, félicitations !',
      finalBoxT: 'Examen final', finalBoxS: '{n} questions · seuil {p} %', takeFinal: 'Passer l\'examen final', editFinal: 'Gérer l\'examen final', createFinal: 'Créer un examen final', finalNone: 'Pas encore d\'examen final. Crée-en un pour valider les acquis de tes élèves.', finalReqCert: 'Obligatoire pour obtenir le certificat.',
      qaT: 'Questions au formateur', qaS: 'Une question sur le cours ? Le formateur te répond ici.', qaPh: 'Pose ta question (5 caractères minimum)', qaAsk: 'Envoyer ma question', qaSent: 'Question envoyée', qaNone: 'Aucune question pour le moment.', qaWait: 'En attente de réponse', qaAns: 'Réponse du formateur', qaReply: 'Écrire la réponse', qaSend: 'Publier la réponse', qaDel: 'Supprimer', qaPending: '{n} en attente', qaChapter: 'Chapitre : {t}', qaAnswered: 'Réponse publiée',
      celebT: 'Félicitations !', celebS: 'Tu as terminé tous les chapitres et réussi tous les quiz. Tu peux maintenant obtenir ton certificat.', fail: 'Action impossible pour le moment.'
    },
    en: {
      qOf: 'Question {a} of {b}', prev: 'Previous', next: 'Next', finish: 'Finish and grade', close: 'Close', retry: 'Try again', retryBetter: 'Improve my score',
      pickOne: 'Pick an answer to continue.', chTitle: 'Quiz', finalTitle: 'Final exam', passMark: 'Pass mark: {n} %',
      passed: 'Well done, you passed!', failed: 'Not passed yet', passedS: 'You passed with {n} %. Read the explanations to lock it in.', failedS: 'You scored {n} %, you need {m} %. Read the explanations, review the chapter, then try again: that is how learning works.',
      best: 'Best score: {n} %', tries: 'Attempts: {n}', correct: '{a} correct out of {b}', review: 'Detailed review', onlyWrong: 'My mistakes', all: 'All', yourAnswer: 'Your answer', goodAnswer: 'Correct answer', noWrong: 'No mistakes, perfect!', noWhy: 'No explanation provided.',
      loadFail: 'Could not load this quiz right now.', saveFail: 'Could not save.',
      edQuiz: 'Chapter quiz', edFinal: 'Course final exam', edHelpQ: 'Write clear questions. Add an explanation: it is shown after grading and helps the student understand.', edHelpF: 'The final exam covers the whole course (5 questions minimum). If you create one, it becomes required to earn the certificate.',
      qLabel: 'Question {n}', qPh: 'Question text', optPh: 'Answer {n}', rightL: 'Correct answer', whyL: 'Explanation (recommended)', whyPh: 'Why is this the right answer?', add: 'Add a question', addOpt: 'Add an answer', rm: 'Remove', save: 'Save', saved: 'Saved', removeAll: 'Delete this quiz', counter: '{a} / {b} questions', empty: 'No questions yet.', min5: 'The final exam needs at least 5 questions.',
      progT: 'My progress', progS: '{a} of {b} chapter(s) completed', quizzesS: 'Quizzes passed', finalS: 'Final exam', finalTodo: 'To take', finalDone: 'Passed: {n} %', finalLocked: 'Finish all chapters first', nextStep: 'Next step', nextChapter: 'Continue chapter "{t}"', nextQuiz: 'Take the quiz of chapter "{t}"', nextFinal: 'Take the final exam', nextCert: 'Get your certificate below', allDone: 'Course completed, congratulations!',
      finalBoxT: 'Final exam', finalBoxS: '{n} questions · pass mark {p} %', takeFinal: 'Take the final exam', editFinal: 'Manage the final exam', createFinal: 'Create a final exam', finalNone: 'No final exam yet. Create one to validate what your students learned.', finalReqCert: 'Required to earn the certificate.',
      qaT: 'Questions to the instructor', qaS: 'A question about the course? The instructor answers here.', qaPh: 'Ask your question (5 characters minimum)', qaAsk: 'Send my question', qaSent: 'Question sent', qaNone: 'No questions yet.', qaWait: 'Waiting for an answer', qaAns: 'Instructor\'s answer', qaReply: 'Write the answer', qaSend: 'Publish the answer', qaDel: 'Delete', qaPending: '{n} pending', qaChapter: 'Chapter: {t}', qaAnswered: 'Answer published',
      celebT: 'Congratulations!', celebS: 'You finished every chapter and passed every quiz. You can now get your certificate.', fail: 'Could not do this right now.'
    }
  };
  function lang() { try { if (typeof currentLang !== 'undefined' && T[currentLang]) return currentLang; } catch (e) { /* ignore */ } return 'en' in T && typeof currentLang !== 'undefined' && currentLang && currentLang !== 'fr' ? 'en' : 'fr'; }
  function tx(k, v) { var s = (T[lang()] || T.fr)[k] || T.en[k] || T.fr[k] || ''; if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, type) { try { if (typeof showToast === 'function') showToast(m, type || 'info'); } catch (e) { /* ignore */ } }
  function errMsg(e) { return (e && e.message && e.message !== 'login') ? e.message : tx('fail'); }
  async function call(action, payload) {
    var u = auth.currentUser; if (!u) throw new Error('login');
    var token = await u.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: token, action: action }, payload)) });
    var j = await r.json();
    if (!j.success) throw new Error(j.error || tx('fail'));
    return j;
  }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function shuffle(a) { var x = a.slice(); for (var i = x.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = x[i]; x[i] = x[j]; x[j] = t; } return x; }
  var CK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  /* ---------- Feuille plein écran ---------- */
  function sheet(title) {
    var ov = el('<div class="cnh-root cnh-ov"><div class="cnh-sheet" role="dialog" aria-modal="true"><div class="cnh-sheet-h"><b class="cnh-h cnh-h3 t"></b><button type="button" class="cnh-btn ghost sm x" aria-label="' + esc(tx('close')) + '">✕</button></div><div class="cnh-sheet-b"></div><div class="cnh-sheet-f"></div></div></div>');
    ov.querySelector('.t').textContent = title;
    var S = { ov: ov, body: ov.querySelector('.cnh-sheet-b'), foot: ov.querySelector('.cnh-sheet-f') };
    S.close = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown', onKey); };
    function onKey(e) { if (e.key === 'Escape') S.close(); }
    document.addEventListener('keydown', onKey);
    ov.querySelector('.x').addEventListener('click', S.close);
    ov.addEventListener('click', function (e) { if (e.target === ov) S.close(); });
    document.body.appendChild(ov);
    return S;
  }
  function footBtns(S, list) {
    S.foot.innerHTML = ''; S.foot.className = 'cnh-sheet-f cnh-row';
    list.forEach(function (b) {
      var x = document.createElement('button'); x.type = 'button'; x.className = 'cnh-btn ' + (b.cls || '') + (b.grow ? ' cnh-grow' : ''); x.textContent = b.label;
      if (b.disabled) x.disabled = true;
      x.addEventListener('click', b.fn); S.foot.appendChild(x);
    });
  }

  /* ======================= PASSER UN QUIZ / UN EXAMEN ======================= */
  function play(courseId, kind, chapterId, title, onDone) {
    var isFinal = kind === 'final';
    var S = sheet((isFinal ? tx('finalTitle') : tx('chTitle')) + (title ? ' — ' + title : ''));
    S.body.innerHTML = '<div class="cnh-skel"></div><div class="cnh-skel"></div>';
    var req = isFinal ? { op: 'final_get', courseId: courseId } : { op: 'get', courseId: courseId, chapterId: chapterId };
    call('academy_quiz', req).then(function (r) { run(S, r.questions || [], r.passMark || 70); }).catch(function (e) {
      S.body.innerHTML = '<div class="cnh-notice bad">' + esc(errMsg(e) === tx('fail') ? tx('loadFail') : errMsg(e)) + '</div>'; footBtns(S, [{ label: tx('close'), cls: 'cnh-grow', fn: S.close }]);
    });

    function run(S, qs, passMark) {
      var perm, chosen, cur;
      function begin() { perm = qs.map(function (q) { return shuffle(q.options.map(function (_, i) { return i; })); }); chosen = new Array(qs.length); cur = 0; drawQ(); }
      function drawQ() {
        var q = qs[cur], pct = Math.round((cur / qs.length) * 100);
        var h = '<div class="cnh-between cnh-row" style="margin:0 0 8px"><span class="cnh-pill">' + esc(tx('qOf', { a: cur + 1, b: qs.length })) + '</span><span class="cnh-sub">' + esc(tx('passMark', { n: passMark })) + '</span></div>' +
          '<div class="cnh-bar" style="margin:0 0 18px"><i style="width:' + pct + '%"></i></div><div class="cnh-q"><p class="cnh-q-t">' + esc(q.q) + '</p>';
        perm[cur].forEach(function (oi, k) {
          h += '<button type="button" class="cnh-opt' + (chosen[cur] === oi ? ' on' : '') + '" data-o="' + oi + '"><span class="k">' + String.fromCharCode(65 + k) + '</span><span>' + esc(q.options[oi]) + '</span></button>';
        });
        S.body.innerHTML = h + '</div>';
        S.body.scrollTop = 0;
        [].forEach.call(S.body.querySelectorAll('.cnh-opt'), function (b) {
          b.addEventListener('click', function () { chosen[cur] = Number(b.getAttribute('data-o')); drawQ(); });
        });
        var last = cur === qs.length - 1;
        footBtns(S, [
          { label: tx('prev'), cls: 'ghost', disabled: cur === 0, fn: function () { cur--; drawQ(); } },
          { label: last ? tx('finish') : tx('next'), cls: 'primary cnh-grow', disabled: chosen[cur] == null, fn: function () { if (chosen[cur] == null) { toast(tx('pickOne'), 'error'); return; } if (last) submit(); else { cur++; drawQ(); } } }
        ]);
      }
      async function submit() {
        footBtns(S, [{ label: '…', cls: 'primary cnh-grow', disabled: true, fn: function () {} }]);
        try {
          var payload = isFinal ? { op: 'final_submit', courseId: courseId, answers: chosen } : { op: 'submit', courseId: courseId, chapterId: chapterId, answers: chosen };
          var res = await call('academy_quiz', payload);
          result(res);
          if (res.passed && onDone) { try { onDone(res); } catch (e) { /* ignore */ } }
        } catch (e) { toast(errMsg(e), 'error'); drawQ(); }
      }
      function result(res) {
        var mode = 'all';
        function paint() {
          var h = '<div class="cnh-score ' + (res.passed ? 'ok' : 'no') + '"><b>' + res.score + '%</b><div><div style="font-weight:800">' + esc(res.passed ? tx('passed') : tx('failed')) + '</div><div style="font-size:.84rem;opacity:.9">' + esc(tx('correct', { a: res.correct, b: res.total })) + '</div></div></div>' +
            '<p class="cnh-sub" style="margin:0 0 6px">' + esc(res.passed ? tx('passedS', { n: res.score }) : tx('failedS', { n: res.score, m: res.passMark })) + '</p>' +
            '<div class="cnh-row cnh-wrap" style="margin:0 0 16px"><span class="cnh-pill ok">' + esc(tx('best', { n: res.best })) + '</span><span class="cnh-pill">' + esc(tx('tries', { n: res.attempts })) + '</span></div>' +
            '<div class="cnh-between cnh-row" style="margin:0 0 10px"><b class="cnh-h cnh-h3">' + esc(tx('review')) + '</b><div class="cnh-seg" style="min-width:170px"><button type="button" data-m="all" class="' + (mode === 'all' ? 'on' : '') + '">' + esc(tx('all')) + '</button><button type="button" data-m="wrong" class="' + (mode === 'wrong' ? 'on' : '') + '">' + esc(tx('onlyWrong')) + '</button></div></div>';
          var shown = 0;
          qs.forEach(function (q, qi) {
            var rv = res.review[qi] || {}; if (mode === 'wrong' && rv.ok) return; shown++;
            h += '<div class="cnh-q"><p class="cnh-q-t">' + (qi + 1) + '. ' + esc(q.q) + '</p>';
            q.options.forEach(function (o, oi) {
              var cls = '', tag = '';
              if (rv.ok && chosen[qi] === oi) { cls = ' good'; tag = tx('yourAnswer'); }
              else if (!rv.ok && chosen[qi] === oi) { cls = ' bad'; tag = tx('yourAnswer'); }
              else if (!rv.ok && rv.answer === oi) { cls = ' good'; tag = tx('goodAnswer'); }
              else return;
              h += '<div class="cnh-opt' + cls + '" style="cursor:default"><span class="k">' + (cls === ' good' ? CK : '✕') + '</span><span class="cnh-grow">' + esc(o) + '</span><span class="cnh-sub" style="font-size:.74rem">' + esc(tag) + '</span></div>';
            });
            h += '<p class="cnh-why">' + esc(rv.why || tx('noWhy')) + '</p></div>';
          });
          if (!shown) h += '<div class="cnh-notice ok">' + esc(tx('noWrong')) + '</div>';
          S.body.innerHTML = h; S.body.scrollTop = 0;
          [].forEach.call(S.body.querySelectorAll('[data-m]'), function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-m'); paint(); }); });
        }
        paint();
        footBtns(S, [{ label: res.passed ? tx('retryBetter') : tx('retry'), cls: res.passed ? '' : 'primary', fn: begin }, { label: tx('close'), cls: (res.passed ? 'primary ' : '') + 'cnh-grow', fn: S.close }]);
      }
      if (!qs.length) { S.body.innerHTML = '<div class="cnh-notice bad">' + esc(tx('loadFail')) + '</div>'; footBtns(S, [{ label: tx('close'), cls: 'cnh-grow', fn: S.close }]); return; }
      begin();
    }
  }

  /* ======================= EDITEUR (formateur) ======================= */
  function edit(courseId, kind, chapterId, title, onDone) {
    var isFinal = kind === 'final', MAXQ = isFinal ? 40 : 20;
    var S = sheet((isFinal ? tx('edFinal') : tx('edQuiz')) + (title ? ' — ' + title : ''));
    var qs = [];
    S.body.innerHTML = '<div class="cnh-skel"></div>';
    var req = isFinal ? { op: 'final_get', courseId: courseId } : { op: 'get', courseId: courseId, chapterId: chapterId };
    call('academy_quiz', req).then(function (r) { qs = (r.questions || []).map(function (x) { return { q: x.q, options: x.options.slice(), answer: x.answer, why: x.why || '' }; }); draw(); })
      .catch(function () { qs = []; draw(); });
    function blank() { return { q: '', options: ['', '', ''], answer: 0, why: '' }; }
    function draw() {
      S.body.innerHTML = '';
      S.body.appendChild(el('<p class="cnh-sub" style="margin:0 0 14px">' + esc(isFinal ? tx('edHelpF') : tx('edHelpQ')) + '</p>'));
      if (!qs.length) S.body.appendChild(el('<div class="cnh-empty"><p style="margin:0">' + esc(tx('empty')) + '</p></div>'));
      qs.forEach(function (q, qi) {
        var card = el('<div class="cnh-card flat"><div class="cnh-between cnh-row" style="margin:0 0 10px"><b class="cnh-h cnh-h3">' + esc(tx('qLabel', { n: qi + 1 })) + '</b><button type="button" class="cnh-btn danger sm rm">' + esc(tx('rm')) + '</button></div>' +
          '<textarea class="cnh-input qt" maxlength="200" placeholder="' + esc(tx('qPh')) + '"></textarea><div class="opts" style="margin:12px 0 4px"></div>' +
          '<label class="cnh-label" style="margin-top:10px">' + esc(tx('whyL')) + '</label><textarea class="cnh-input why" maxlength="300" placeholder="' + esc(tx('whyPh')) + '"></textarea></div>');
        var qt = card.querySelector('.qt'); qt.value = q.q; qt.addEventListener('input', function () { q.q = qt.value; });
        var wy = card.querySelector('.why'); wy.value = q.why; wy.addEventListener('input', function () { q.why = wy.value; });
        card.querySelector('.rm').addEventListener('click', function () { qs.splice(qi, 1); draw(); });
        var box = card.querySelector('.opts');
        q.options.forEach(function (o, oi) {
          var row = el('<div class="cnh-row" style="margin:0 0 8px"><input type="radio" name="ans' + qi + '" aria-label="' + esc(tx('rightL')) + '" style="width:20px;height:20px;flex:0 0 auto"><input type="text" class="cnh-input" maxlength="120" placeholder="' + esc(tx('optPh', { n: oi + 1 })) + '" style="min-height:44px"></div>');
          var rd = row.querySelector('input[type=radio]'), tf = row.querySelector('input[type=text]');
          rd.checked = q.answer === oi; rd.addEventListener('change', function () { q.answer = oi; });
          tf.value = o; tf.addEventListener('input', function () { q.options[oi] = tf.value; });
          box.appendChild(row);
        });
        if (q.options.length < 4) { var ao = el('<button type="button" class="cnh-btn ghost sm">+ ' + esc(tx('addOpt')) + '</button>'); ao.addEventListener('click', function () { q.options.push(''); draw(); }); box.appendChild(ao); }
        S.body.appendChild(card);
      });
      if (qs.length < MAXQ) { var add = el('<button type="button" class="cnh-btn soft block">+ ' + esc(tx('add')) + '</button>'); add.addEventListener('click', function () { qs.push(blank()); draw(); S.body.scrollTop = S.body.scrollHeight; }); S.body.appendChild(add); }
      var list = [{ label: tx('save') + ' (' + tx('counter', { a: qs.length, b: MAXQ }) + ')', cls: 'primary cnh-grow', fn: save }];
      footBtns(S, list);
    }
    async function save() {
      var clean = qs.map(function (q) { var kept = [], ans = 0; q.options.forEach(function (o, i) { if (o.trim()) { if (i === q.answer) ans = kept.length; kept.push(o); } }); return { q: q.q, options: kept, answer: ans, why: q.why }; });
      if (isFinal && clean.length > 0 && clean.length < 5) { toast(tx('min5'), 'error'); return; }
      var btn = S.foot.querySelector('button'); if (btn) btn.disabled = true;
      try {
        await call('academy_quiz', isFinal ? { op: 'final_save', courseId: courseId, questions: clean } : { op: 'save', courseId: courseId, chapterId: chapterId, questions: clean });
        toast(tx('saved'), 'success'); S.close(); if (onDone) onDone();
      } catch (e) { toast(errMsg(e), 'error'); if (btn) btn.disabled = false; }
    }
  }

  /* ======================= BLOCS DE LA FICHE DU COURS ======================= */
  function ring(p) {
    var r = 30, c = 2 * Math.PI * r, off = c * (1 - p / 100);
    return '<span class="cnh-ring" style="width:72px;height:72px"><svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="' + r + '" fill="none" stroke="var(--cnh-soft)" stroke-width="7"/><circle cx="36" cy="36" r="' + r + '" fill="none" stroke="var(--cnh-brand)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 36 36)"/></svg><b>' + p + '%</b></span>';
  }

  // Tableau de progression de l'élève
  async function progressBox(courseId, data, info, certStatus) {
    var pr = certStatus && certStatus.progress; if (!pr || !pr.chaptersTotal) return null;
    var chapters = data.chapters || [];
    var steps = pr.chaptersTotal + pr.quizzesTotal + (pr.finalExists ? 1 : 0);
    var done = pr.chaptersDone + pr.quizzesPassed + (pr.finalExists && pr.finalPassed ? 1 : 0);
    var pct = steps ? Math.round((done / steps) * 100) : 0;
    var next = '';
    var enr = null; try { enr = await db.collection('course_enrollments').doc(courseId + '_' + auth.currentUser.uid).get(); } catch (e) { /* ignore */ }
    var completed = (enr && enr.exists && enr.data().completedChapters) || [];
    var nextCh = chapters.filter(function (c) { return c && c.id && completed.indexOf(c.id) < 0; })[0];
    var qInfo = (info && info.quizzes) || {};
    var nextQuiz = chapters.filter(function (c) { return c && c.id && qInfo[c.id] && !(qInfo[c.id].best >= 70); })[0];
    if (pr.eligible && !certStatus.certificate) next = tx('nextCert');
    else if (pr.eligible || (certStatus.certificate)) next = tx('allDone');
    else if (nextCh) next = tx('nextChapter', { t: nextCh.title || '' });
    else if (nextQuiz) next = tx('nextQuiz', { t: nextQuiz.title || '' });
    else if (pr.finalExists && !pr.finalPassed) next = tx('nextFinal');
    var finalLine = !pr.finalExists ? '' : (pr.finalPassed ? tx('finalDone', { n: pr.finalScore }) : (pr.chaptersDone === pr.chaptersTotal ? tx('finalTodo') : tx('finalLocked')));
    var b = el('<div class="cnh-root cnh-card cn-st-box cn-learn-prog"><div class="cnh-row" style="gap:14px">' + ring(pct) + '<div class="cnh-grow"><b class="cnh-h cnh-h2">' + esc(tx('progT')) + '</b><p class="cnh-sub" style="margin:4px 0 0">' + esc(tx('progS', { a: pr.chaptersDone, b: pr.chaptersTotal })) + '</p></div></div>' +
      '<div class="cnh-bar" style="margin:14px 0 12px"><i style="width:' + pct + '%"></i></div>' +
      '<div class="cnh-row cnh-wrap" style="margin:0 0 4px">' + (pr.quizzesTotal ? '<span class="cnh-pill' + (pr.quizzesPassed === pr.quizzesTotal ? ' ok' : '') + '">' + esc(tx('quizzesS')) + ' ' + pr.quizzesPassed + '/' + pr.quizzesTotal + '</span>' : '') +
      (finalLine ? '<span class="cnh-pill' + (pr.finalPassed ? ' ok' : ' warn') + '">' + esc(tx('finalS')) + ' · ' + esc(finalLine) + '</span>' : '') + '</div>' +
      (next ? '<div class="cnh-notice ' + (pr.eligible ? 'ok' : '') + '" style="margin:12px 0 0">' + CK + '<span><b>' + esc(pr.eligible ? tx('celebT') : tx('nextStep')) + '</b> — ' + esc(pr.eligible && !certStatus.certificate ? tx('celebS') : next) + '</span></div>' : '') + '</div>');
    return b;
  }

  // Examen final
  function finalBox(courseId, isOwner, info, certStatus, refresh) {
    var f = info && info.final, pr = certStatus && certStatus.progress;
    if (!f && !isOwner) return null;
    var b = el('<div class="cnh-root cnh-card cn-st-box cn-learn-final"></div>');
    if (!f) {
      b.innerHTML = '<b class="cnh-h cnh-h2">' + esc(tx('finalBoxT')) + '</b><p class="cnh-sub" style="margin:6px 0 12px">' + esc(tx('finalNone')) + '</p>';
      var c = el('<button type="button" class="cnh-btn primary block">' + esc(tx('createFinal')) + '</button>');
      c.addEventListener('click', function () { edit(courseId, 'final', null, '', refresh); }); b.appendChild(c); return b;
    }
    b.innerHTML = '<div class="cnh-between cnh-row"><b class="cnh-h cnh-h2">' + esc(tx('finalBoxT')) + '</b>' + (f.best != null ? '<span class="cnh-pill ' + (f.best >= 70 ? 'ok' : 'warn') + '">' + esc(tx('best', { n: f.best })) + '</span>' : '') + '</div>' +
      '<p class="cnh-sub" style="margin:6px 0 4px">' + esc(tx('finalBoxS', { n: f.count, p: 70 })) + '</p><p class="cnh-hint" style="margin:0 0 12px">' + esc(tx('finalReqCert')) + '</p>';
    var allDone = !pr || pr.chaptersDone === pr.chaptersTotal;
    var go = el('<button type="button" class="cnh-btn primary block">' + esc(isOwner ? tx('editFinal') : (f.best != null && f.best >= 70 ? tx('retryBetter') : tx('takeFinal'))) + '</button>');
    if (!isOwner && !allDone) { go.disabled = true; b.appendChild(go); b.appendChild(el('<p class="cnh-hint" style="margin:8px 0 0">' + esc(tx('finalLocked')) + '</p>')); return b; }
    go.addEventListener('click', function () { if (isOwner) edit(courseId, 'final', null, '', refresh); else play(courseId, 'final', null, '', refresh); });
    b.appendChild(go); return b;
  }

  // Questions / réponses avec le formateur
  function qaBox(courseId, data, isOwner) {
    var b = el('<div class="cnh-root cnh-card cn-st-box cn-learn-qa"><div class="cnh-between cnh-row"><b class="cnh-h cnh-h2">' + esc(tx('qaT')) + '</b><span class="cnh-pill warn qp" hidden></span></div><p class="cnh-sub" style="margin:6px 0 12px">' + esc(tx('qaS')) + '</p><div class="form"></div><div class="list"></div></div>');
    var form = b.querySelector('.form'), list = b.querySelector('.list'), pill = b.querySelector('.qp');
    if (!isOwner) {
      form.innerHTML = '<textarea class="cnh-input" maxlength="500" placeholder="' + esc(tx('qaPh')) + '"></textarea><button type="button" class="cnh-btn soft block" style="margin-top:10px">' + esc(tx('qaAsk')) + '</button>';
      var ta = form.querySelector('textarea'), sb = form.querySelector('button');
      sb.addEventListener('click', async function () {
        sb.disabled = true;
        try { await call('academy_qa', { op: 'ask', courseId: courseId, text: ta.value }); ta.value = ''; toast(tx('qaSent'), 'success'); await load(); }
        catch (e) { toast(errMsg(e), 'error'); }
        sb.disabled = false;
      });
    }
    async function load() {
      try {
        var r = await call('academy_qa', { op: 'list', courseId: courseId });
        list.innerHTML = '';
        pill.hidden = !(isOwner && r.pending); pill.textContent = tx('qaPending', { n: r.pending });
        if (!r.items.length) { list.appendChild(el('<p class="cnh-hint" style="margin:12px 0 0">' + esc(tx('qaNone')) + '</p>')); return; }
        r.items.forEach(function (it) {
          var d = el('<div style="padding:12px 0;border-top:1px solid var(--cnh-line)"><div class="cnh-sub" style="font-size:.78rem">' + esc(it.name) + (it.chapterTitle ? ' · ' + esc(tx('qaChapter', { t: it.chapterTitle })) : '') + '</div><p style="margin:4px 0 8px;line-height:1.5;overflow-wrap:anywhere">' + esc(it.text) + '</p><div class="ans"></div></div>');
          var ans = d.querySelector('.ans');
          if (it.answer) ans.innerHTML = '<div class="cnh-notice ok" style="margin:0"><span><b>' + esc(tx('qaAns')) + '</b><br>' + esc(it.answer) + '</span></div>';
          else if (isOwner) {
            ans.innerHTML = '<textarea class="cnh-input" maxlength="1500" placeholder="' + esc(tx('qaReply')) + '"></textarea><button type="button" class="cnh-btn primary sm" style="margin-top:8px">' + esc(tx('qaSend')) + '</button>';
            var rt = ans.querySelector('textarea'), rb = ans.querySelector('button');
            rb.addEventListener('click', async function () { rb.disabled = true; try { await call('academy_qa', { op: 'answer', courseId: courseId, id: it.id, text: rt.value }); toast(tx('qaAnswered'), 'success'); load(); } catch (e) { toast(errMsg(e), 'error'); rb.disabled = false; } });
          } else ans.innerHTML = '<span class="cnh-pill warn">' + esc(tx('qaWait')) + '</span>';
          if (isOwner || it.mine) {
            var del = el('<button type="button" class="cnh-btn ghost sm" style="margin-top:6px">' + esc(tx('qaDel')) + '</button>');
            del.addEventListener('click', async function () { try { await call('academy_qa', { op: 'delete', courseId: courseId, id: it.id }); load(); } catch (e) { toast(errMsg(e), 'error'); } });
            d.appendChild(del);
          }
          list.appendChild(d);
        });
      } catch (e) { list.innerHTML = ''; }
    }
    load();
    return b;
  }

  // Assemble les blocs d'un cours : appelé par academy-studio.js
  async function blocks(courseId, data, isOwner, enrolled, refresh) {
    var out = [];
    if (!isOwner && !enrolled) return out;
    var info = null, st = null;
    try { info = await call('academy_quiz', { op: 'info', courseId: courseId }); } catch (e) { /* ignore */ }
    if (!isOwner) { try { st = await call('academy_cert', { op: 'status', courseId: courseId }); } catch (e) { /* ignore */ } }
    if (!isOwner && st) { try { out.push(await progressBox(courseId, data, info, st)); } catch (e) { /* ignore */ } }
    try { out.push(finalBox(courseId, isOwner, info, st, refresh)); } catch (e) { /* ignore */ }
    try { out.push(qaBox(courseId, data, isOwner)); } catch (e) { /* ignore */ }
    return out.filter(Boolean);
  }

  window.CNLearn = { play: play, edit: edit, blocks: blocks };
})();
