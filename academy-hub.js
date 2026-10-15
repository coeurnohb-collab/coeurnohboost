/* =====================================================================
   academy-hub.js — Académie : espace « Auto-études » (IA), étudiants, cartes de cours
   Chargé par stability.js après script.js. N'écrase rien d'important : il ajoute un onglet
   à l'Académie et remplace trois affichages (liste des cours, mes cours, liste des étudiants).

   - Toute l'IA, les quotas, les notes de quiz et l'abonnement « Plus » sont décidés par le
     SERVEUR (api/payments-actions.js, actions academy_study et academy_students).
     Ce fichier n'affiche que ce que le serveur renvoie et ne déplace jamais d'argent.
   - Tout texte venant de l'IA ou d'une personne passe par esc() ou par md() (qui échappe d'abord).
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnHub) return;
  window.__cnHub = true;

  /* ---------------------------- Textes ---------------------------- */
  var HX = {
    fr: {
      tab: 'Auto-études', loginT: 'Étudie à ton rythme avec un tuteur personnel', loginS: 'Connecte-toi pour créer ton premier parcours personnalisé.', loginB: 'Se connecter',
      sStreak: 'Série', sXp: 'Points', sDone: 'Leçons', days: '{n} j',
      planFree: 'Version gratuite', planPlus: 'Académie Plus', plusUntil: "Actif jusqu'au {d}", goPlus: 'Passer à Plus',
      mLessons: 'Leçons d\'aujourd\'hui', mTutor: 'Questions au tuteur', mPaths: 'Parcours',
      resume: 'Reprendre', myPaths: 'Mes parcours', newPath: 'Nouveau parcours', newPathS: 'Choisis un domaine : ton tuteur construit un parcours sur mesure.',
      noPaths: 'Tu n\'as pas encore de parcours. Choisis un domaine ci-dessous pour commencer.', lessonsN: '{a}/{b} leçons', topicsN: '{n} sujets',
      createT: 'Ton parcours sur mesure', learnQ: 'Que veux-tu apprendre ?', learnPh: 'Ex. : Python, anglais des affaires…', popular: 'Idées de sujets',
      levelQ: 'Ton niveau', lv1: 'Débutant', lv2: 'Intermédiaire', lv3: 'Avancé', goalQ: 'Ton objectif (facultatif)', goalPh: 'Ex. : réussir mon examen en décembre, trouver un emploi…',
      hoursQ: 'Temps disponible par semaine', hoursV: '{n} h / semaine', createBtn: 'Créer mon parcours', compact: 'Version gratuite : parcours compact (4 modules maximum). Académie Plus débloque les parcours complets.',
      c1: 'Analyse de ton objectif…', c2: 'Choix des notions importantes…', c3: 'Organisation en modules…', c4: 'Dernières vérifications…', creatingS: 'Cela prend 15 à 40 secondes.',
      back: 'Retour', outcomes: 'À la fin, tu sauras', pathProg: 'Progression', start: 'Commencer', continueL: 'Continuer : {t}', allDone: 'Parcours terminé, bravo !', delPath: 'Supprimer ce parcours', delConfirm: 'Supprimer ce parcours et toute sa progression ?', moduleN: 'Module {n}', ready: 'Prête', toGen: 'Sera préparée à ton premier passage',
      lessonOf: 'Leçon {a} sur {b}', prep: 'Ton tuteur prépare la leçon…', prepS: 'La première fois, cela prend 15 à 40 secondes. Ensuite elle est enregistrée et s\'ouvre tout de suite.',
      keyT: 'À retenir', exT: 'Exemple', exerciseT: 'À toi de jouer', hint: 'Indice', solution: 'Voir la correction', cardsT: 'Flashcards', flipHint: 'Touche la carte pour la retourner', prevC: 'Précédente', nextC: 'Suivante',
      quizT: 'Quiz de la leçon', validate: 'Valider mes réponses', retry: 'Refaire le quiz', scoreOk: 'Bravo ! {n} %', scoreNo: '{n} % — relis la leçon puis réessaie (il faut {p} %).', answerAll: 'Réponds à toutes les questions.',
      complete: 'Terminer la leçon', completed: 'Leçon terminée', nextL: 'Suivante', askT: 'Tuteur', gained: '+{n} points', streakNow: 'Série : {n} jour(s)',
      tutorT: 'Ton tuteur', tutorPh: 'Pose ta question…', tutorHi: 'Bonjour ! Je suis ton tuteur. Pose-moi une question sur cette leçon, demande un exemple ou un exercice supplémentaire.', send: 'Envoyer',
      plusT: 'Académie Plus', plusS: 'Apprends sans te limiter : parcours complets, plus de leçons et de questions chaque jour.', pFree: 'Gratuit', pPlus: 'Plus',
      lim1: '{n} leçon(s) / jour', lim2: '{n} question(s) au tuteur / jour', lim3: '{n} parcours', lim4: 'Parcours complets (8 modules)', lim5: 'Parcours compact (4 modules)', perMonth: 'pour {d} jours', activate: 'Activer pour {p} $', balance: 'Ton solde : {b} $',
      plusOn: 'Académie Plus est activé. Bonnes études !', recharge: 'Recharger mon portefeuille', plusNA: "L'abonnement n'est pas disponible pour le moment.",
      aiOff: "Le tuteur n'est pas encore activé sur cette application. Tu peux déjà explorer, mais la création de parcours sera possible dès que l'administrateur l'aura configuré.", closed: 'Les auto-études sont momentanément fermées.',
      fail: 'Une erreur est survenue. Réessaie dans un instant.', slow: "Le tuteur met trop de temps à répondre. Réessaie dans un instant.", retryB: 'Réessayer', loadFail: 'Impossible de charger pour le moment.', close: 'Fermer',
      stuT: 'Étudiants', stuCount: 'Inscrits', stuAvg: 'Progression moyenne', stuFin: 'Ont terminé', stuPaid: 'Payé par les étudiants', stuSearch: 'Rechercher un étudiant', fAll: 'Tous', fRun: 'En cours', fFin: 'Terminés', fNew: 'Pas commencé',
      stuEmpty: 'Aucun étudiant pour le moment', stuEmptyS: 'Partage le lien de ton cours : chaque inscription apparaîtra ici avec sa progression.', stuNone: 'Aucun résultat.', cert: 'Certificat', freeW: 'Gratuit', joined: 'Inscrit le {d}', chapN: '{a}/{b} chapitres',
      allC: 'Tous', chaptersN: '{n} chapitre(s)', studentsN: '{n} inscrit(s)', cont: 'Continuer', myEmpty: "Tu n'es inscrit(e) à aucun cours pour l'instant.", myEmptyB: 'Découvrir les cours', myLogin: 'Connecte-toi pour voir tes cours.', emptyCourses: 'Aucun cours dans cette catégorie pour le moment.',
      cEnrolled: 'Cours suivis', cRunning: 'En cours', cFinished: 'Terminés', byOwner: 'par {n}',
      catsT: 'Explore les domaines', catsS: 'Choisis une catégorie, puis un domaine, puis ton sujet.', groupsN: '{n} domaines', pickDomain: 'Choisis un domaine', pickTopic: 'Choisis ton sujet', searchG: 'Rechercher un domaine', searchT: 'Rechercher un sujet', noResult: 'Aucun résultat.',
      otherT: 'Un autre sujet', otherS: 'Écris exactement ce que tu veux apprendre.', contB: 'Continuer', createS: 'Un parcours détaillé, adapté à ton niveau et à ton temps.',
      lv1L: 'Débutant (A1–A2)', lv2L: 'Intermédiaire (B1–B2)', lv3L: 'Avancé (C1–C2)', levelQL: 'Ton niveau (échelle CECRL)',
      styleQ: 'Ta façon d\'apprendre', st1: 'Équilibré', st2: 'Pratique', st3: 'Théorie', st4: 'Examen', stH_balanced: 'Explications claires et exercices en proportion égale.', stH_practice: 'Moins de théorie, beaucoup d\'exercices et de cas concrets.', stH_theory: 'Comprendre en profondeur les principes et les raisons.', stH_exam: 'Points clés, sujets types, pièges et méthode pour réussir une épreuve.',
      accClosedB: 'Fermé', accClosedT: 'Cette catégorie est momentanément fermée.', accPlusT: 'Réservé aux membres Plus', accPlusS: 'Passe à Académie Plus pour accéder à cette catégorie et à tous ses domaines.',
      accPaidT: 'Catégorie premium', accPaidS: 'Débloque-la une fois pour {p} $ : accès pendant {d} jours à tous ses domaines.', accUnlock: 'Débloquer pour {p} $', accActive: 'Accès actif jusqu\'au {d}',
      unlockConfirm: 'Débloquer « {c} » pour {p} $ ? Ce montant sera débité de ton portefeuille.', unlocked: 'Catégorie débloquée. Bonne étude !',
      trialT: 'Essai gratuit', trialS: '{a} leçons et {b} questions au tuteur offertes pour découvrir la méthode. Ensuite, choisis la formule qui te convient.', trialLessons: 'Leçons offertes', trialTutor: 'Questions offertes', trialOver: 'Ton essai gratuit est terminé. Choisis une formule pour continuer à étudier.', seeOffers: 'Voir les formules', dailyLessons: "Leçons aujourd'hui", dailyTutor: "Questions aujourd'hui",
      ownPh: 'Écris ton sujet…', deleted: 'Parcours supprimé.', formS: 'Un programme détaillé, construit pour ton niveau et ton temps disponible.', freeNote: 'Essai gratuit : {a} leçons et {b} questions au tuteur offertes. Ensuite, une formule est nécessaire.',
      plansT: "Formules d'étude", plansS: "Des cours complets, sans limite de sujet, avec un tuteur à chaque leçon. Choisis la durée qui te convient.", pk1: 'Parcours complets : jusqu\'à 12 modules et 72 leçons', pk2: '{a} leçons et {b} questions au tuteur par jour', pk3: "Jusqu'à {n} parcours en parallèle", pk4: 'Quiz corrigés, flashcards, notes personnelles et attestation de parcours', pk5: "Tous les domaines ouverts à l'abonnement",
      pMonth: '1 mois', pQuarter: '3 mois (trimestre)', pSemester: '6 mois (semestre)', pYear: '1 an', perMo: 'soit {p} $ par mois', bestV: 'Meilleur prix', activateSel: 'Activer pour {p} $', daysN: '{n} jours',
      notesT: 'Mes notes', notesPh: 'Écris ce que tu veux retenir de cette leçon…', notesSaved: 'Notes enregistrées', reviewB: 'Réviser les flashcards', reviewT: 'Révision', reviewEmpty: "Ouvre quelques leçons : leurs flashcards apparaîtront ici pour réviser.", cardN: 'Carte {a} sur {b}', shuffleB: 'Mélanger',
      attestB: "Attestation de parcours", attestT: 'Attestation de suivi', attestBody: 'atteste avoir suivi et terminé le parcours', attestMeta: '{n} leçons · niveau {l}', attestDate: 'Délivrée le {d}', attestPrint: 'Imprimer ou enregistrer en PDF', attestNote: "Document de suivi personnel délivré par l'Académie. Ce n'est pas un diplôme officiel.",
      paywallT: 'Ton essai gratuit est terminé', paywallS: 'Continue à étudier avec une formule : cours complets, tuteur disponible chaque jour, sans limite de sujet.'
    },
    en: {
      tab: 'Self-study', loginT: 'Study at your own pace with a personal tutor', loginS: 'Sign in to create your first personalised learning path.', loginB: 'Sign in',
      sStreak: 'Streak', sXp: 'Points', sDone: 'Lessons', days: '{n} d',
      planFree: 'Free plan', planPlus: 'Academy Plus', plusUntil: 'Active until {d}', goPlus: 'Upgrade to Plus',
      mLessons: "Today's lessons", mTutor: 'Tutor questions', mPaths: 'Paths',
      resume: 'Resume', myPaths: 'My paths', newPath: 'New path', newPathS: 'Pick a field: your tutor builds a path made for you.',
      noPaths: "You don't have a path yet. Pick a field below to get started.", lessonsN: '{a}/{b} lessons', topicsN: '{n} topics',
      createT: 'Your tailor-made path', learnQ: 'What do you want to learn?', learnPh: 'E.g. Python, business English…', popular: 'Topic ideas',
      levelQ: 'Your level', lv1: 'Beginner', lv2: 'Intermediate', lv3: 'Advanced', goalQ: 'Your goal (optional)', goalPh: 'E.g. pass my exam in December, get a job…',
      hoursQ: 'Time available per week', hoursV: '{n} h / week', createBtn: 'Create my path', compact: 'Free plan: compact path (4 modules max). Academy Plus unlocks full paths.',
      c1: 'Analysing your goal…', c2: 'Choosing the key concepts…', c3: 'Organising modules…', c4: 'Final checks…', creatingS: 'This takes 15 to 40 seconds.',
      back: 'Back', outcomes: 'By the end you will be able to', pathProg: 'Progress', start: 'Start', continueL: 'Continue: {t}', allDone: 'Path completed, well done!', delPath: 'Delete this path', delConfirm: 'Delete this path and all its progress?', moduleN: 'Module {n}', ready: 'Ready', toGen: 'Will be prepared when you open it',
      lessonOf: 'Lesson {a} of {b}', prep: 'Your tutor is preparing the lesson…', prepS: 'The first time takes 15 to 40 seconds. Then it is saved and opens instantly.',
      keyT: 'Key points', exT: 'Example', exerciseT: 'Your turn', hint: 'Hint', solution: 'Show the answer', cardsT: 'Flashcards', flipHint: 'Tap the card to flip it', prevC: 'Previous', nextC: 'Next',
      quizT: 'Lesson quiz', validate: 'Check my answers', retry: 'Retake the quiz', scoreOk: 'Well done! {n} %', scoreNo: '{n} % — reread the lesson and try again ({p} % needed).', answerAll: 'Answer every question.',
      complete: 'Finish lesson', completed: 'Lesson completed', nextL: 'Next', askT: 'Tutor', gained: '+{n} points', streakNow: 'Streak: {n} day(s)',
      tutorT: 'Your tutor', tutorPh: 'Ask your question…', tutorHi: 'Hello! I am your tutor. Ask me about this lesson, or request another example or exercise.', send: 'Send',
      plusT: 'Academy Plus', plusS: 'Learn without limits: full paths, more lessons and questions every day.', pFree: 'Free', pPlus: 'Plus',
      lim1: '{n} lesson(s) / day', lim2: '{n} tutor question(s) / day', lim3: '{n} path(s)', lim4: 'Full paths (8 modules)', lim5: 'Compact path (4 modules)', perMonth: 'for {d} days', activate: 'Activate for {p} $', balance: 'Your balance: {b} $',
      plusOn: 'Academy Plus is active. Happy studying!', recharge: 'Top up my wallet', plusNA: 'The subscription is not available right now.',
      aiOff: 'The tutor is not enabled on this app yet. You can explore, but creating paths will work once the administrator sets it up.', closed: 'Self-study is temporarily closed.',
      fail: 'Something went wrong. Please try again in a moment.', slow: 'The tutor is taking too long. Please try again in a moment.', retryB: 'Try again', loadFail: 'Could not load right now.', close: 'Close',
      stuT: 'Students', stuCount: 'Enrolled', stuAvg: 'Average progress', stuFin: 'Finished', stuPaid: 'Paid by students', stuSearch: 'Search a student', fAll: 'All', fRun: 'In progress', fFin: 'Finished', fNew: 'Not started',
      stuEmpty: 'No students yet', stuEmptyS: 'Share your course link: every enrolment will appear here with its progress.', stuNone: 'No result.', cert: 'Certificate', freeW: 'Free', joined: 'Enrolled on {d}', chapN: '{a}/{b} chapters',
      allC: 'All', chaptersN: '{n} chapter(s)', studentsN: '{n} enrolled', cont: 'Continue', myEmpty: "You're not enrolled in any course yet.", myEmptyB: 'Browse courses', myLogin: 'Sign in to see your courses.', emptyCourses: 'No course in this category yet.',
      cEnrolled: 'Courses followed', cRunning: 'In progress', cFinished: 'Finished', byOwner: 'by {n}',
      catsT: 'Explore the fields', catsS: 'Pick a category, then a field, then your topic.', groupsN: '{n} fields', pickDomain: 'Pick a field', pickTopic: 'Pick your topic', searchG: 'Search a field', searchT: 'Search a topic', noResult: 'No result.',
      otherT: 'Another topic', otherS: 'Write exactly what you want to learn.', contB: 'Continue', createS: 'A detailed path, adapted to your level and your time.',
      lv1L: 'Beginner (A1–A2)', lv2L: 'Intermediate (B1–B2)', lv3L: 'Advanced (C1–C2)', levelQL: 'Your level (CEFR scale)',
      styleQ: 'How you like to learn', st1: 'Balanced', st2: 'Practical', st3: 'Theory', st4: 'Exam', stH_balanced: 'Clear explanations and exercises in equal measure.', stH_practice: 'Less theory, plenty of exercises and real cases.', stH_theory: 'Understand principles and reasons in depth.', stH_exam: 'Key points, typical questions, pitfalls and method to pass a test.',
      accClosedB: 'Closed', accClosedT: 'This category is temporarily closed.', accPlusT: 'Plus members only', accPlusS: 'Upgrade to Academy Plus to access this category and all its fields.',
      accPaidT: 'Premium category', accPaidS: 'Unlock it once for {p} $: access for {d} days to all its fields.', accUnlock: 'Unlock for {p} $', accActive: 'Access active until {d}',
      unlockConfirm: 'Unlock "{c}" for {p} $? This amount will be taken from your wallet.', unlocked: 'Category unlocked. Happy studying!',
      trialT: 'Free trial', trialS: '{a} lessons and {b} tutor questions to discover the method. Then pick the plan that suits you.', trialLessons: 'Free lessons', trialTutor: 'Free questions', trialOver: 'Your free trial is over. Choose a plan to keep studying.', seeOffers: 'See plans', dailyLessons: "Today's lessons", dailyTutor: "Today's questions",
      ownPh: 'Write your topic…', deleted: 'Path deleted.', formS: 'A detailed programme built for your level and your available time.', freeNote: 'Free trial: {a} lessons and {b} tutor questions included. A plan is needed after that.',
      plansT: 'Study plans', plansS: 'Complete courses, any subject, with a tutor on every lesson. Pick the duration that suits you.', pk1: 'Full paths: up to 12 modules and 72 lessons', pk2: '{a} lessons and {b} tutor questions per day', pk3: 'Up to {n} paths at the same time', pk4: 'Graded quizzes, flashcards, personal notes and a completion certificate', pk5: 'Every field open to subscribers',
      pMonth: '1 month', pQuarter: '3 months (quarter)', pSemester: '6 months (semester)', pYear: '1 year', perMo: 'about {p} $ per month', bestV: 'Best value', activateSel: 'Activate for {p} $', daysN: '{n} days',
      notesT: 'My notes', notesPh: 'Write what you want to remember from this lesson…', notesSaved: 'Notes saved', reviewB: 'Review flashcards', reviewT: 'Review', reviewEmpty: 'Open a few lessons: their flashcards will appear here for review.', cardN: 'Card {a} of {b}', shuffleB: 'Shuffle',
      attestB: 'Completion certificate', attestT: 'Certificate of completion', attestBody: 'has followed and completed the learning path', attestMeta: '{n} lessons · {l} level', attestDate: 'Issued on {d}', attestPrint: 'Print or save as PDF', attestNote: 'Personal progress document issued by the Academy. It is not an official diploma.',
      paywallT: 'Your free trial is over', paywallS: 'Keep studying with a plan: complete courses, a tutor every day, any subject.'
    }
  };
  function lang() { try { if (typeof currentLang !== 'undefined' && currentLang) return currentLang; } catch (e) { /* ignore */ } return 'fr'; }
  function tx(k, v) {
    var l = lang(), s = (HX[l] && HX[l][k]) || (l === 'fr' ? '' : HX.en[k]) || HX.fr[k] || '';
    if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]);
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, type) { try { if (typeof showToast === 'function') showToast(m, type || 'info'); } catch (e) { /* ignore */ } }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }
  function $(id) { return document.getElementById(id); }
  function fmtDate(v) { try { var d = typeof v === 'number' ? new Date(v) : new Date(v); if (isNaN(d)) return ''; return d.toLocaleDateString(lang(), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0; }
  function safeT(key, fb) { try { var s = typeof t === 'function' ? t(key) : ''; return s && s !== key ? s : fb; } catch (e) { return fb; } }

  /* ---------------------------- Icônes ---------------------------- */
  var P = {
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>', code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>', brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.7 2.7 0 0 1 9.5 15M12 6v1.5M12 16.5V18"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 19a1.6 1.6 0 0 0 1.4 2.4h12.2a1.6 1.6 0 0 0 1.4-2.4L14 9V3M7.5 15h9"/>', sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
    cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>', tie: '<path d="M9 3h6l-1.5 3 2 11L12 21l-3.5-4 2-11z"/>',
    brush: '<path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L11 15.8 8 16l.2-3zM7.5 16.5C6 16.5 5 18 5 19.5S4 21 3 21c1.5 1 5 1.5 6.5 0S10.5 16.5 7.5 16.5z"/>', music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>', scale: '<path d="M12 3v18M5 21h14M5 7l-3 8a4 4 0 0 0 6 0zM19 7l-3 8a4 4 0 0 0 6 0zM5 7h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.7 0-3-1.8-5-3.4-6.6-.5 1.4-1.4 2.2-2.6 2.6.5-3.4-1-6.2-3.5-8.3C9.5 6.3 5 9 5 15.3 5 19.3 8 22 12 22z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>', check: '<path d="M20 6 9 17l-5-5"/>', book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM4 21.5V4.5M8 7h8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
    cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 6V4a1 1 0 0 1 1-1h11a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1h-2"/>', quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>', plus: '<path d="M12 5v14M5 12h14"/>', crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', arrow: '<path d="m15 18-6-6 6-6"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9"/>', alert: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    sport: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>', print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>', note: '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h5"/>', refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>', shield: '<path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', right: '<path d="m9 6 6 6-6 6"/>'
  };
  function ic(name, cls) { return '<svg class="cnh-ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>'; }
  var TINTS = ['#1d4f91', '#0f766e', '#5b4bb0', '#9a4a14', '#2f6b3a', '#8a6a0c', '#0e6f8a', '#8e2f5a', '#3d4f8f', '#6b5a2f', '#2a6f6a', '#7a3b3b'];
  function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function tintOf(s) { return TINTS[hash(s) % TINTS.length]; }

  /* ---------------------------- Texte de leçon sûr (Markdown simplifié) ---------------------------- */
  function inline(t) { return esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
  function md(src) {
    var parts = String(src == null ? '' : src).replace(/\r/g, '').split('```'), out = [];
    parts.forEach(function (b, i) {
      if (i % 2 === 1) { out.push('<pre><code>' + esc(b.replace(/^[A-Za-z0-9+#-]*\n/, '').replace(/\n$/, '')) + '</code></pre>'); return; }
      var html = '', list = null;
      function close() { if (list) { html += '</' + list + '>'; list = null; } }
      b.split('\n').forEach(function (line) {
        var s = line.trim();
        if (!s) { close(); return; }
        var h = /^#{1,4}\s+(.*)$/.exec(s);
        if (h) { close(); html += '<h4>' + inline(h[1]) + '</h4>'; return; }
        var u = /^[-*•]\s+(.*)$/.exec(s), o = /^\d+[.)]\s+(.*)$/.exec(s);
        if (u || o) { var k = u ? 'ul' : 'ol'; if (list !== k) { close(); html += '<' + k + '>'; list = k; } html += '<li>' + inline((u || o)[1]) + '</li>'; return; }
        close(); html += '<p>' + inline(s) + '</p>';
      });
      close(); out.push(html);
    });
    return out.join('');
  }

  /* ---------------------------- Appel serveur ---------------------------- */
  async function call(action, payload) {
    var u = (typeof auth !== 'undefined' && auth) ? auth.currentUser : null;
    if (!u) throw new Error('login');
    var token = await u.getIdToken();
    var ctl = new AbortController(), tm = setTimeout(function () { ctl.abort(); }, 70000);
    try {
      var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: token, action: action }, payload)), signal: ctl.signal });
      var j = null; try { j = await r.json(); } catch (e) { /* corps vide */ }
      if (!j) throw new Error(tx('fail'));
      if (!j.success) throw new Error(j.error || tx('fail'));
      return j;
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error(tx('slow'));
      throw e;
    } finally { clearTimeout(tm); }
  }
  function errMsg(e) { var m = (e && e.message && e.message !== 'login' && e.message !== 'Failed to fetch') ? e.message : tx('fail'); return m.replace(/^\[ESSAI\]\s*/, ''); }
  // Le serveur commence par [ESSAI] quand l'essai gratuit est épuisé, et cite « Académie Plus » quand une catégorie est réservée aux abonnés.
  function isPaywall(e) { var m = e && e.message ? e.message : ''; return /^\[ESSAI\]/.test(m) || /Académie Plus/.test(m); }
  function hasOffers() { return !!(S.cfg && S.cfg.plus && S.cfg.plus.offers && S.cfg.plus.offers.length); }
  function paywallHtml(msg) {
    return '<div class="cnh-card"><div class="cnh-trial"><span class="cnh-dom">' + ic('lock') + '</span><div class="cnh-grow"><b class="cnh-h cnh-h3">' + esc(tx('paywallT')) + '</b><p class="cnh-sub" style="margin:4px 0 14px">' + esc(msg || tx('paywallS')) + '</p>' +
      (hasOffers() ? '<button type="button" class="cnh-btn primary block" data-act="plus">' + ic('crown') + esc(tx('seeOffers')) + '</button>' : '') + '</div></div></div>';
  }

  /* ---------------------------- État ---------------------------- */
  var root = null, S = { cfg: null, cat: null, paths: [], path: null, lessonId: null, lesson: null, form: null, chat: [], quiz: null, card: 0, cards: [], stack: [], fs: null, view: 'home', hist: false, ignorePop: false };

  function L2(o) { return (o && (o[lang()] || o.en || o.fr)) || ''; }
  function catOf(id) { var c = S.cat || []; for (var i = 0; i < c.length; i++) if (c[i].id === id) return { c: c[i], i: i }; return { c: { id: id, icon: 'book', label: {}, desc: {}, groups: [] }, i: 0 }; }
  function groupOf(catId, gid) { var g = catOf(catId).c.groups || []; for (var i = 0; i < g.length; i++) if (g[i].id === gid) return g[i]; return null; }
  function dLabel(d) { return L2(d.label) || d.id; }
  function domIcon(id) { var x = catOf(id); return '<span class="cnh-dom" style="--t:' + TINTS[x.i % TINTS.length] + '">' + ic(x.c.icon) + '</span>'; }
  function ring(p) {
    var r = 22, c = 2 * Math.PI * r, off = c * (1 - p / 100);
    return '<span class="cnh-ring"><svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--cnh-soft)" stroke-width="6"/><circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--cnh-brand)" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b>' + p + '%</b></span>';
  }
  function levelName(l, domain) {
    var lang_ = domain === 'languages';
    return tx(l === 'advanced' ? (lang_ ? 'lv3L' : 'lv3') : l === 'intermediate' ? (lang_ ? 'lv2L' : 'lv2') : (lang_ ? 'lv1L' : 'lv1'));
  }
  function accOf(id) { var a = S.cfg && S.cfg.access && S.cfg.access[id]; return a || { mode: 'free', open: true, enabled: true, price: 0, days: 90, untilMs: 0 }; }
  function box() { return S.fs ? $('cnh-fs-body') : root; }
  function setRoot(html) {
    var b = box();
    if (!b) return;
    b.innerHTML = html;
    if (S.fs) b.scrollTop = 0;
    else { try { var y = root.getBoundingClientRect().top + (window.pageYOffset || 0) - 84; if (y < (window.pageYOffset || 0)) window.scrollTo(0, Math.max(0, y)); } catch (e) { /* ignore */ } }
  }
  function skeleton(n) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="cnh-skel"></div>'; return s; }
  function errorBox(msg, act) { return '<div class="cnh-empty">' + '<span class="cnh-dom">' + ic('alert') + '</span><p style="margin:0 0 14px">' + esc(msg) + '</p><button type="button" class="cnh-btn primary" data-act="' + act + '">' + esc(tx('retryB')) + '</button></div>'; }

  /* ---------------------------- Navigation plein écran ---------------------------- */
  // Pile de pages : catégorie > domaine > sujet > formulaire > parcours > leçon. La flèche et le bouton retour du téléphone dépilent.
  function fsOpen() {
    if (S.fs) return;
    var el = document.createElement('div');
    el.id = 'cnh-fs'; el.className = 'cnh-root cnh-fs';
    el.innerHTML = '<div class="cnh-fs-top"><button type="button" class="cnh-fs-back" data-act="back" aria-label="' + esc(tx('back')) + '">' + ic('arrow') + '</button><div class="cnh-fs-title" id="cnh-fs-title"></div></div><div class="cnh-fs-body" id="cnh-fs-body"></div>';
    el.addEventListener('click', onClick); el.addEventListener('input', onInput);
    document.body.appendChild(el);
    document.documentElement.classList.add('cnh-fs-open');
    S.fs = el;
    try { history.pushState({ cnhFs: 1 }, '', window.location.href); S.hist = true; } catch (e) { S.hist = false; }
  }
  function fsClose(viaPop) {
    if (!S.fs) return;
    S.fs.remove(); S.fs = null;
    document.documentElement.classList.remove('cnh-fs-open');
    if (S.hist && !viaPop) { S.ignorePop = true; try { history.back(); } catch (e) { S.ignorePop = false; } }
    S.hist = false;
  }
  function closeAll(viaPop) {
    S.stack = []; fsClose(viaPop); S.view = 'home';
    if (me()) loadHome(true);
  }
  function setTop(t) { var el = $('cnh-fs-title'); if (el) el.textContent = t || ''; }
  function go(view, args) {
    S.stack.push({ view: view, args: args || {} });
    if (!S.fs) fsOpen();
    renderEntry();
  }
  function replaceTop(view, args) { S.stack[S.stack.length ? S.stack.length - 1 : 0] = { view: view, args: args || {} }; renderEntry(); }
  function back() {
    if (S.stack.length > 1) { S.stack.pop(); renderEntry(); } else closeAll(false);
  }
  function renderEntry() {
    var e = S.stack[S.stack.length - 1];
    if (!e) { closeAll(); return; }
    var a = e.args; S.view = e.view; S.q = '';
    switch (e.view) {
      case 'cat': renderCat(a.id); break;
      case 'group': renderGroup(a.c, a.g); break;
      case 'create': renderCreate(a.c, a.g, a.topic); break;
      case 'path': if (S.path && S.path.id === a.id) renderPath(); else openPath(a.id); break;
      case 'lesson': if (S.lesson && S.lessonId === a.id && S.path) renderLesson(); else openLesson(a.id); break;
      case 'review': openReview(); break;
      default: closeAll();
    }
  }
  // Bouton retour du téléphone : on dépile au lieu de quitter l'Académie. Capture : passe avant le piège de retour de l'application.
  window.addEventListener('popstate', function (e) {
    if (S.ignorePop) { S.ignorePop = false; e.stopImmediatePropagation(); return; }
    if (!S.fs) return;
    e.stopImmediatePropagation();
    if (S.stack.length > 1) { S.stack.pop(); try { history.pushState({ cnhFs: 1 }, '', window.location.href); } catch (x) { S.hist = false; } renderEntry(); }
    else { S.hist = false; closeAll(true); }
  }, true);

  /* ---------------------------- Accueil ---------------------------- */
  async function loadHome(silent) {
    if (!silent) setRoot(skeleton(4));
    try {
      var r = await Promise.all([call('academy_study', { op: 'config' }), call('academy_study', { op: 'paths' }), S.cat ? Promise.resolve(null) : call('academy_study', { op: 'catalog' })]);
      S.cfg = r[0]; S.paths = r[1].paths || []; if (r[2]) S.cat = r[2].categories || [];
      if (S.fs) { if (S.view === 'cat' || S.view === 'create') renderEntry(); return; }
      if (!silent || S.view === 'home') { S.view = 'home'; renderHome(); }
    } catch (e) { if (!silent) setRoot(errorBox(errMsg(e) === tx('fail') ? tx('loadFail') : errMsg(e), 'reload')); }
  }
  function meter(label, used, max) {
    var p = max > 0 ? pct(used, max) : 100;
    return '<div class="cnh-quota"><div class="cnh-quota-h"><span>' + esc(label) + '</span><b>' + used + ' / ' + max + '</b></div><div class="cnh-bar"><i style="width:' + p + '%"></i></div></div>';
  }
  function accBadge(id) {
    var a = accOf(id);
    if (a.enabled === false) return '<span class="cnh-accb">' + esc(tx('accClosedB')) + '</span>';
    if (a.mode === 'plus' && !a.open) return '<span class="cnh-accb plus">' + ic('crown', 'xs') + 'Plus</span>';
    if (a.mode === 'paid') return a.open ? '<span class="cnh-accb ok">' + ic('check', 'xs') + '</span>' : '<span class="cnh-accb">' + ic('lock', 'xs') + esc(a.price) + ' $</span>';
    return '';
  }
  function planCard(c) {
    var plus = c.plus.active, tr = c.trial, offers = hasOffers();
    if (plus) {
      return '<div class="cnh-card"><div class="cnh-row cnh-between"><span class="cnh-pill ok">' + ic('crown', 'sm') + esc(tx('planPlus')) + '</span><span class="cnh-sub">' + esc(tx('plusUntil', { d: fmtDate(c.plus.untilMs) })) + '</span></div>' +
        meter(tx('dailyLessons'), c.usage.lessons, c.limits.lessons) + meter(tx('dailyTutor'), c.usage.tutor, c.limits.tutor) + '</div>';
    }
    var h = '<div class="cnh-card"><div class="cnh-trial"><span class="cnh-dom">' + ic('bulb') + '</span><div class="cnh-grow"><b class="cnh-h cnh-h3">' + esc(tx('trialT')) + '</b>';
    if (tr.over) h += '<p class="cnh-sub" style="margin:4px 0 0">' + esc(tx('trialOver')) + '</p>';
    else h += '<p class="cnh-sub" style="margin:4px 0 0">' + esc(tx('trialS', { a: tr.lessons.max, b: tr.tutor.max })) + '</p>';
    h += '</div></div>' + meter(tx('trialLessons'), Math.min(tr.lessons.used, tr.lessons.max), tr.lessons.max) + meter(tx('trialTutor'), Math.min(tr.tutor.used, tr.tutor.max), tr.tutor.max);
    if (offers) h += '<button type="button" class="cnh-btn ' + (tr.over ? 'primary' : 'soft') + ' block" style="margin-top:14px" data-act="plus">' + ic('crown') + esc(tx('seeOffers')) + '</button>';
    return h + '</div>';
  }
  function renderHome() {
    var c = S.cfg, h = '';
    h += '<div class="cnh-stats">' +
      '<div class="cnh-stat"><b>' + ic('flame') + (c.stats.streak || 0) + '</b><span>' + esc(tx('sStreak')) + '</span></div>' +
      '<div class="cnh-stat"><b>' + ic('star') + (c.stats.xp || 0) + '</b><span>' + esc(tx('sXp')) + '</span></div>' +
      '<div class="cnh-stat"><b>' + ic('book') + (c.stats.lessonsDone || 0) + '</b><span>' + esc(tx('sDone')) + '</span></div></div>';
    if (!c.enabled) h += '<div class="cnh-notice bad">' + ic('alert') + '<span>' + esc(tx('closed')) + '</span></div>';
    else if (!c.aiReady) h += '<div class="cnh-notice warn">' + ic('alert') + '<span>' + esc(tx('aiOff')) + '</span></div>';
    h += planCard(c);
    var last = S.paths[0];
    if (last) {
      var p0 = pct(last.done, last.lessonsTotal);
      h += '<div class="cnh-eyebrow">' + esc(tx('resume')) + '</div><button type="button" class="cnh-card cnh-path" data-act="path" data-id="' + esc(last.id) + '">' + ring(p0) +
        '<span class="cnh-grow"><b class="cnh-ellipsis" style="display:block">' + esc(last.title) + '</b><span class="cnh-sub cnh-ellipsis" style="display:block">' + esc(tx('lessonsN', { a: last.done, b: last.lessonsTotal })) + '</span></span><span class="cnh-btn primary sm" style="pointer-events:none">' + esc(tx('resume')) + '</span></button>';
    }
    if (S.paths.length > 1) {
      h += '<div class="cnh-eyebrow">' + esc(tx('myPaths')) + '</div>';
      S.paths.slice(1).forEach(function (p) {
        h += '<button type="button" class="cnh-card cnh-path" data-act="path" data-id="' + esc(p.id) + '">' + domIcon(p.domain) +
          '<span class="cnh-grow"><b class="cnh-ellipsis" style="display:block">' + esc(p.title) + '</b><span class="cnh-sub cnh-ellipsis" style="display:block">' + esc(levelName(p.level, p.domain)) + ' · ' + esc(tx('lessonsN', { a: p.done, b: p.lessonsTotal })) + '</span><span class="cnh-bar" style="margin-top:8px;display:block"><i style="width:' + pct(p.done, p.lessonsTotal) + '%"></i></span></span></button>';
      });
    }
    h += '<div class="cnh-eyebrow">' + esc(tx('catsT')) + '</div><p class="cnh-sub" style="margin:-4px 0 12px">' + esc(tx('catsS')) + '</p>';
    if (!S.paths.length) h += '<p class="cnh-sub" style="margin:0 0 12px">' + esc(tx('noPaths')) + '</p>';
    h += '<div class="cnh-tiles">';
    (S.cat || []).forEach(function (d, i) {
      h += '<button type="button" class="cnh-tile" data-act="cat" data-id="' + esc(d.id) + '"><span class="cnh-dom" style="--t:' + TINTS[i % TINTS.length] + '">' + ic(d.icon) + '</span><span><strong>' + esc(dLabel(d)) + '</strong><small>' + esc(tx('groupsN', { n: d.groups.length })) + '</small></span>' + accBadge(d.id) + '</button>';
    });
    h += '</div>';
    setRoot(h);
  }

  /* ---------------------------- Catégorie > domaines ---------------------------- */
  function accessBar(id) {
    var a = accOf(id), label = dLabel(catOf(id).c);
    if (a.enabled === false) return '<div class="cnh-accbar lock"><b>' + esc(tx('accClosedT')) + '</b></div>';
    if (a.open && a.mode === 'paid') return '<div class="cnh-accbar ok">' + ic('check') + '<b>' + esc(tx('accActive', { d: fmtDate(a.untilMs) })) + '</b></div>';
    if (a.open) return '';
    if (a.mode === 'plus') return '<div class="cnh-accbar lock"><b>' + esc(tx('accPlusT')) + '</b><p class="cnh-sub" style="margin:4px 0 12px">' + esc(tx('accPlusS')) + '</p><button type="button" class="cnh-btn primary block" data-act="plus">' + ic('crown') + esc(tx('goPlus')) + '</button></div>';
    return '<div class="cnh-accbar lock"><b>' + esc(tx('accPaidT')) + '</b><p class="cnh-sub" style="margin:4px 0 12px">' + esc(tx('accPaidS', { p: a.price, d: a.days })) + '</p><button type="button" class="cnh-btn primary block" data-act="unlock" data-id="' + esc(id) + '">' + ic('lock') + esc(tx('accUnlock', { p: a.price })) + '</button></div>';
  }
  function groupsHtml(c, q, gi) {
    var qq = (q || '').trim().toLowerCase(), out = '', n = 0;
    c.groups.forEach(function (g, i) {
      var lb = L2(g.label);
      if (qq && lb.toLowerCase().indexOf(qq) < 0) return;
      n++;
      out += '<button type="button" class="cnh-grp" style="--t:' + TINTS[(gi + i) % TINTS.length] + '" data-act="group" data-c="' + esc(c.id) + '" data-id="' + esc(g.id) + '"><span class="l">' + esc(lb.charAt(0).toUpperCase()) + '</span><span class="cnh-grow"><b>' + esc(lb) + '</b><small>' + esc(tx('topicsN', { n: g.topics.length })) + '</small></span>' + ic('right') + '</button>';
    });
    return out || '<p class="cnh-sub" style="text-align:center;padding:18px 0">' + esc(tx('noResult')) + '</p>';
  }
  function renderCat(id) {
    var x = catOf(id), c = x.c, h = '';
    S.view = 'cat'; setTop(dLabel(c));
    h += '<div class="cnh-cathero"><span class="cnh-dom" style="--t:' + TINTS[x.i % TINTS.length] + '">' + ic(c.icon) + '</span><div><h2 class="cnh-h cnh-h1" style="font-size:var(--cnh-fs-xl)">' + esc(dLabel(c)) + '</h2><p class="cnh-sub">' + esc(L2(c.desc)) + '</p></div></div>';
    h += accessBar(id);
    h += '<div class="cnh-eyebrow" style="margin-top:4px">' + esc(tx('pickDomain')) + ' · ' + esc(tx('groupsN', { n: c.groups.length })) + '</div>';
    if (c.groups.length > 7) h += '<input type="search" class="cnh-input" data-f="gsearch" placeholder="' + esc(tx('searchG')) + '" style="margin:0 0 12px" autocomplete="off">';
    h += '<div id="cnh-glist">' + groupsHtml(c, '', x.i) + '</div>';
    setRoot(h);
  }

  /* ---------------------------- Domaine > sujets ---------------------------- */
  function topicText(g, tp) {
    var t = L2(tp), txt = g.kind === 'language' ? L2(g.label) + ' : ' + t : t;
    return txt.slice(0, 80);
  }
  function topicsHtml(cid, g, q) {
    var qq = (q || '').trim().toLowerCase(), out = '', n = 0;
    g.topics.forEach(function (tp, i) {
      var lb = L2(tp);
      if (qq && lb.toLowerCase().indexOf(qq) < 0) return;
      n++;
      out += '<button type="button" class="cnh-topic" data-act="topic-pick" data-c="' + esc(cid) + '" data-g="' + esc(g.id) + '" data-id="' + esc(tp.id) + '"><span class="n">' + (i + 1) + '</span><span>' + esc(lb) + '</span>' + ic('right') + '</button>';
    });
    return out || '<p class="cnh-sub" style="text-align:center;padding:18px 0">' + esc(tx('noResult')) + '</p>';
  }
  function renderGroup(cid, gid) {
    var x = catOf(cid), g = groupOf(cid, gid), h = '';
    if (!g) { back(); return; }
    S.view = 'group'; setTop(L2(g.label));
    h += '<div class="cnh-crumb"><span>' + esc(dLabel(x.c)) + '</span>' + ic('right', 'xs') + '<b>' + esc(L2(g.label)) + '</b></div>';
    h += accessBar(cid);
    h += '<div class="cnh-card cnh-own" style="margin-bottom:16px"><b class="cnh-h cnh-h3">' + esc(tx('otherT')) + '</b><p class="cnh-sub" style="margin:4px 0 12px">' + esc(tx('otherS')) + '</p><div class="cnh-inline"><input class="cnh-input" data-f="own" maxlength="80" autocomplete="off" placeholder="' + esc(tx('ownPh')) + '"><button type="button" class="cnh-btn primary" data-act="own" data-c="' + esc(cid) + '" data-g="' + esc(gid) + '">' + esc(tx('contB')) + '</button></div></div>';
    h += '<div class="cnh-eyebrow" style="margin-top:4px">' + esc(tx('pickTopic')) + ' · ' + esc(tx('topicsN', { n: g.topics.length })) + '</div>';
    if (g.topics.length > 10) h += '<input type="search" class="cnh-input" data-f="tsearch" placeholder="' + esc(tx('searchT')) + '" style="margin:0 0 12px" autocomplete="off">';
    h += '<div id="cnh-tlist">' + topicsHtml(cid, g, '') + '</div>';
    setRoot(h);
  }

  /* ---------------------------- Création d'un parcours ---------------------------- */
  function renderCreate(cid, gid, topic) {
    var x = catOf(cid), g = gid ? groupOf(cid, gid) : null, c = S.cfg, acc = accOf(cid);
    if (!S.form || S.form.domain !== cid || S.form.group !== (gid || '') || (topic != null && S.form.seed !== topic)) S.form = { domain: cid, group: gid || '', topic: topic || '', seed: topic, level: 'beginner', goal: '', hours: 4, style: 'balanced' };
    var f = S.form, h = '', isLang = cid === 'languages';
    S.view = 'create'; setTop(tx('createT'));
    h += '<div class="cnh-crumb"><span>' + esc(dLabel(x.c)) + '</span>' + (g ? ic('right', 'xs') + '<b>' + esc(L2(g.label)) + '</b>' : '') + '</div>';
    h += '<div class="cnh-formhead">' + domIcon(cid) + '<div class="cnh-grow"><h3 class="cnh-h cnh-h2">' + esc(g ? L2(g.label) : dLabel(x.c)) + '</h3><p class="cnh-sub">' + esc(tx('formS')) + '</p></div></div>';
    h += '<div id="cnh-create-err"></div>';
    h += '<label class="cnh-field"><span class="cnh-label">' + esc(tx('learnQ')) + '</span><input class="cnh-input" data-f="topic" maxlength="80" autocomplete="off" placeholder="' + esc(tx('ownPh')) + '" value="' + esc(f.topic) + '"></label>';
    h += '<div class="cnh-field"><span class="cnh-label">' + esc(isLang ? tx('levelQL') : tx('levelQ')) + '</span><div class="cnh-seg">' +
      [['beginner', 'lv1'], ['intermediate', 'lv2'], ['advanced', 'lv3']].map(function (l) { return '<button type="button" data-act="level" data-v="' + l[0] + '" class="' + (f.level === l[0] ? 'on' : '') + '">' + esc(tx(isLang ? l[1] + 'L' : l[1])) + '</button>'; }).join('') + '</div></div>';
    h += '<div class="cnh-field"><span class="cnh-label">' + esc(tx('styleQ')) + '</span><div class="cnh-seg four">' +
      [['balanced', 'st1'], ['practice', 'st2'], ['theory', 'st3'], ['exam', 'st4']].map(function (l) { return '<button type="button" data-act="style" data-v="' + l[0] + '" class="' + (f.style === l[0] ? 'on' : '') + '">' + esc(tx(l[1])) + '</button>'; }).join('') + '</div><p class="cnh-hint" id="cnh-style-h">' + esc(tx('stH_' + f.style)) + '</p></div>';
    h += '<label class="cnh-field"><span class="cnh-label">' + esc(tx('goalQ')) + '</span><textarea class="cnh-input" data-f="goal" maxlength="240" placeholder="' + esc(tx('goalPh')) + '">' + esc(f.goal) + '</textarea></label>';
    h += '<label class="cnh-field"><span class="cnh-label-row"><span>' + esc(tx('hoursQ')) + '</span><b id="cnh-hours-v">' + esc(tx('hoursV', { n: f.hours })) + '</b></span><input class="cnh-range" type="range" data-f="hours" min="1" max="20" step="1" value="' + f.hours + '"></label>';
    if (!c.plus.active) h += '<div class="cnh-notice">' + ic('bulb') + '<span>' + esc(tx('freeNote', { a: c.trial.lessons.max, b: c.trial.tutor.max })) + '</span></div>';
    if (!acc.open) h += accessBar(cid);
    h += '<button type="button" class="cnh-btn primary block" data-act="create"' + (c.enabled && c.aiReady && acc.open ? '' : ' disabled') + '>' + ic('spark') + esc(tx('createBtn')) + '</button>';
    setRoot(h);
  }
  async function doCreate() {
    var f = S.form;
    if (!f || f.topic.trim().length < 2) { var e0 = $('cnh-create-err'); if (e0) e0.innerHTML = '<div class="cnh-notice bad">' + ic('alert') + '<span>' + esc(tx('learnQ')) + '</span></div>'; return; }
    var msgs = [tx('c1'), tx('c2'), tx('c3'), tx('c4')], i = 0;
    setRoot('<div class="cnh-load"><div class="cnh-spin"></div><h3 class="cnh-h cnh-h2" id="cnh-ld" style="margin:0 0 6px">' + esc(msgs[0]) + '</h3><p class="cnh-sub">' + esc(tx('creatingS')) + '</p></div>');
    var tm = setInterval(function () { i = Math.min(i + 1, msgs.length - 1); var el = $('cnh-ld'); if (el) el.textContent = msgs[i]; }, 5500);
    try {
      var r = await call('academy_study', { op: 'create_path', domain: f.domain, group: f.group, style: f.style, topic: f.topic, level: f.level, goal: f.goal, hoursPerWeek: f.hours, lang: lang() });
      clearInterval(tm);
      S.path = r.path; S.form = null; S.chat = []; S.lesson = null;
      replaceTop('path', { id: r.path.id });
    } catch (e) {
      clearInterval(tm);
      renderCreate(f.domain, f.group, null);
      var el = $('cnh-create-err');
      if (el) el.innerHTML = isPaywall(e) ? paywallHtml(errMsg(e)) : '<div class="cnh-notice bad">' + ic('alert') + '<span>' + esc(errMsg(e)) + '</span></div>';
    }
  }
  async function doUnlock(id) {
    var a = accOf(id);
    if (!window.confirm(tx('unlockConfirm', { c: dLabel(catOf(id).c), p: a.price }))) return;
    try {
      var r = await call('academy_study', { op: 'unlock', domain: id });
      try { if (me() && typeof r.newBalance === 'number') { me().balance = r.newBalance; var w = $('wallet-balance'); if (w) w.textContent = r.newBalance.toFixed(2) + '$'; } } catch (e) { /* ignore */ }
      toast(tx('unlocked'), 'success');
      S.cfg = await call('academy_study', { op: 'config' });
      renderEntry();
    } catch (e) {
      var m = errMsg(e); toast(m, 'error');
      if (/solde/i.test(m)) { try { showDashTab('wallet'); } catch (x) { /* ignore */ } }
    }
  }

  /* ---------------------------- Parcours ---------------------------- */
  function flatLessons(p) { var out = []; (p.modules || []).forEach(function (m, mi) { (m.lessons || []).forEach(function (l, li) { out.push({ id: l.id, title: l.title, mi: mi, li: li, module: m }); }); }); return out; }
  function nextLessonOf(p) { var fl = flatLessons(p), done = p.completed || []; for (var i = 0; i < fl.length; i++) if (done.indexOf(fl[i].id) < 0) return fl[i]; return null; }
  async function openPath(id) {
    setRoot(skeleton(4)); S.view = 'path';
    try { var r = await call('academy_study', { op: 'get_path', pathId: id }); S.path = r.path; S.chat = []; renderPath(); }
    catch (e) { setRoot(errorBox(errMsg(e), 'back')); }
  }
  function renderPath() {
    var p = S.path, h = '', fl = flatLessons(p), done = p.completed || [], gen = p.generated || [], nx = nextLessonOf(p), pc = pct(done.length, fl.length);
    S.view = 'path';
    setTop(p.title);
    h += '<div class="cnh-row cnh-wrap" style="margin:0 0 6px">' + domIcon(p.domain) + '<span class="cnh-pill">' + esc(levelName(p.level, p.domain)) + '</span>' + (p.groupLabel ? '<span class="cnh-pill">' + esc(p.groupLabel) + '</span>' : '') + '</div>';
    h += '<h2 class="cnh-h cnh-h1" style="margin:8px 0 6px">' + esc(p.title) + '</h2><p class="cnh-sub" style="margin:0 0 14px">' + esc(p.summary) + '</p>';
    h += '<div class="cnh-card"><div class="cnh-row">' + ring(pc) + '<div class="cnh-grow"><b>' + esc(tx('pathProg')) + '</b><div class="cnh-sub">' + esc(tx('lessonsN', { a: done.length, b: fl.length })) + '</div></div></div>';
    if (nx) h += '<button type="button" class="cnh-btn primary block" style="margin-top:14px" data-act="lesson" data-id="' + esc(nx.id) + '">' + ic('right') + esc(done.length ? tx('continueL', { t: nx.title }) : tx('start')) + '</button>';
    else h += '<div class="cnh-notice ok" style="margin:14px 0 0">' + ic('check') + '<span>' + esc(tx('allDone')) + '</span></div>';
    h += '</div>';
    if (p.outcomes && p.outcomes.length) h += '<div class="cnh-card"><b class="cnh-h cnh-h3">' + esc(tx('outcomes')) + '</b><ul class="cnh-outcomes">' + p.outcomes.map(function (o) { return '<li>' + ic('check') + '<span>' + esc(o) + '</span></li>'; }).join('') + '</ul></div>';
    (p.modules || []).forEach(function (m, mi) {
      var md0 = (m.lessons || []).filter(function (l) { return done.indexOf(l.id) >= 0; }).length;
      h += '<div class="cnh-mod"><div class="cnh-mod-h"><span class="cnh-mod-n">' + (mi + 1) + '</span><div class="cnh-grow"><b class="cnh-ellipsis" style="display:block">' + esc(m.title) + '</b><span class="cnh-sub">' + esc(tx('lessonsN', { a: md0, b: m.lessons.length })) + '</span></div></div>';
      m.lessons.forEach(function (l) {
        var isDone = done.indexOf(l.id) >= 0, isGen = gen.indexOf(l.id) >= 0;
        h += '<button type="button" class="cnh-lrow" data-act="lesson" data-id="' + esc(l.id) + '"><span class="cnh-dot ' + (isDone ? 'done' : isGen ? 'gen' : '') + '">' + (isDone ? ic('check') : '') + '</span><span class="cnh-grow"><b class="cnh-ellipsis" style="display:block;font-size:.93rem">' + esc(l.title) + '</b><span class="cnh-sub cnh-ellipsis" style="display:block;font-size:.8rem">' + esc(l.summary) + '</span></span>' + ic('right') + '</button>';
      });
      h += '</div>';
    });
    h += '<div class="cnh-eyebrow">' + esc(tx('askT')) + '</div><div class="cnh-todo">' +
      '<button type="button" class="cnh-btn soft" data-act="tutor">' + ic('chat') + esc(tx('tutorT')) + '</button>' +
      '<button type="button" class="cnh-btn soft" data-act="review">' + ic('cards') + esc(tx('reviewB')) + '</button>' +
      (!nx && fl.length ? '<button type="button" class="cnh-btn primary" data-act="attest">' + ic('cap') + esc(tx('attestB')) + '</button>' : '') +
      '<button type="button" class="cnh-btn danger" data-act="delete">' + ic('trash') + esc(tx('delPath')) + '</button></div>';
    setRoot(h);
  }
  /* ---------- Révision des flashcards ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t0 = a[i]; a[i] = a[j]; a[j] = t0; } return a; }
  async function openReview() {
    setRoot(skeleton(2)); S.view = 'review'; setTop(tx('reviewT'));
    try { var r = await call('academy_study', { op: 'review', pathId: S.path.id }); S.cards = shuffle(r.cards || []); S.card = 0; renderReview(); }
    catch (e) { setRoot(errorBox(errMsg(e), 'back')); }
  }
  function renderReview() {
    if (!S.cards.length) { setRoot('<div class="cnh-empty"><span class="cnh-dom">' + ic('cards') + '</span><p style="margin:0">' + esc(tx('reviewEmpty')) + '</p></div>'); return; }
    setRoot('<p class="cnh-sub" id="cnh-fc-l" style="margin:0 0 10px"></p><div class="cnh-fc" id="cnh-fc"><div class="cnh-fc-in" data-act="flip"><div class="cnh-fc-f" id="cnh-fc-f"></div><div class="cnh-fc-b" id="cnh-fc-b"></div></div></div>' +
      '<div class="cnh-row cnh-between" style="margin:6px 0"><button type="button" class="cnh-btn sm" data-act="prevc">' + ic('arrow') + esc(tx('prevC')) + '</button><span class="cnh-sub" id="cnh-fc-n"></span><button type="button" class="cnh-btn sm" data-act="nextc">' + esc(tx('nextC')) + ic('right') + '</button></div>' +
      '<p class="cnh-hint" style="text-align:center">' + esc(tx('flipHint')) + '</p><button type="button" class="cnh-btn soft block" style="margin-top:14px" data-act="shuffle">' + ic('refresh') + esc(tx('shuffleB')) + '</button>');
    paintCard();
  }
  /* ---------- Attestation de parcours (document de suivi personnel) ---------- */
  function attestData() {
    var p = S.path, fl = flatLessons(p);
    return { name: (me() && (me().name || me().email)) || '', title: p.title, line: tx('attestMeta', { n: fl.length, l: levelName(p.level, p.domain) }), date: tx('attestDate', { d: fmtDate(Date.now()) }) };
  }
  function openAttest() {
    var a = attestData();
    sheet(tx('attestT'), '<div class="cnh-attest">' + ic('cap') + '<h3 class="cnh-h">' + esc(tx('attestT')) + '</h3><p class="cnh-sub">' + esc(a.name) + '</p><p class="cnh-sub" style="margin:10px 0 0">' + esc(tx('attestBody')) + '</p><p class="cnh-h cnh-h2" style="margin:6px 0">' + esc(a.title) + '</p><p class="cnh-sub">' + esc(a.line) + '</p><p class="cnh-sub">' + esc(a.date) + '</p></div><p class="cnh-hint">' + esc(tx('attestNote')) + '</p>',
      '<button type="button" class="cnh-btn primary block" data-act="attest-print">' + ic('print') + esc(tx('attestPrint')) + '</button>');
  }
  function printAttest() {
    var a = attestData(), w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    if (!w) return;
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(tx('attestT')) + '</title><style>body{font-family:Georgia,"Times New Roman",serif;margin:0;padding:32px;color:#111;background:#fff}.b{border:3px double #1d4f91;padding:56px 32px;text-align:center;max-width:760px;margin:0 auto}h1{font-size:30px;letter-spacing:.06em;text-transform:uppercase;color:#1d4f91;margin:0 0 30px}p{font-size:17px;line-height:1.6;margin:8px 0}.n{font-size:30px;margin:16px 0}.t{font-size:24px;font-weight:bold;margin:14px 0}.s{color:#555;font-size:13px;margin-top:36px}</style></head><body><div class="b"><h1>' + esc(tx('attestT')) + '</h1><p class="n">' + esc(a.name) + '</p><p>' + esc(tx('attestBody')) + '</p><p class="t">' + esc(a.title) + '</p><p>' + esc(a.line) + '</p><p>' + esc(a.date) + '</p><p class="s">' + esc(tx('attestNote')) + '</p></div></body></html>');
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* ignore */ } }, 400);
  }
  async function doDelete() {
    if (!window.confirm(tx('delConfirm'))) return;
    try { await call('academy_study', { op: 'delete_path', pathId: S.path.id }); S.path = null; S.lesson = null; toast(tx('deleted'), 'success'); back(); } catch (e) { toast(errMsg(e), 'error'); }
  }

  /* ---------------------------- Leçon ---------------------------- */
  async function openLesson(lessonId) {
    var p = S.path, fl = flatLessons(p), idx = -1;
    fl.forEach(function (x, i) { if (x.id === lessonId) idx = i; });
    if (idx < 0) return;
    S.view = 'lesson'; S.lessonId = lessonId; S.lesson = null; S.quiz = { answers: [], result: null }; S.card = 0;
    var cached = (p.generated || []).indexOf(lessonId) >= 0;
    setTop(fl[idx].title);
    setRoot('<div class="cnh-load"><div class="cnh-spin"></div><h3 class="cnh-h cnh-h2" style="margin:0 0 6px">' + esc(cached ? fl[idx].title : tx('prep')) + '</h3>' + (cached ? '' : '<p class="cnh-sub">' + esc(tx('prepS')) + '</p>') + '</div>');
    try {
      var r = await call('academy_study', { op: 'lesson', pathId: p.id, lessonId: lessonId });
      S.lesson = r.lesson; S.lesson.done = r.done; S.lesson.best = r.best; S.lesson.note = r.note || '';
      if (!r.cached) { (p.generated = p.generated || []).push(lessonId); call('academy_study', { op: 'config' }).then(function (c) { S.cfg = c; }).catch(function () { /* ignore */ }); }
      renderLesson();
    } catch (e) {
      if (isPaywall(e)) { call('academy_study', { op: 'config' }).then(function (c) { S.cfg = c; }).catch(function () { /* ignore */ }); setRoot(paywallHtml(errMsg(e))); }
      else setRoot('<div class="cnh-notice bad">' + ic('alert') + '<span>' + esc(errMsg(e)) + '</span></div><button type="button" class="cnh-btn block" data-act="back">' + esc(tx('back')) + '</button>');
    }
  }
  function renderLesson() {
    var p = S.path, l = S.lesson, fl = flatLessons(p), idx = 0, h = '';
    fl.forEach(function (x, i) { if (x.id === S.lessonId) idx = i; });
    var meta = fl[idx];
    S.cards = l.flashcards || [];
    setTop(l.title || meta.title);
    h += '<div class="cnh-sub" style="font-weight:600;margin:0 0 6px">' + esc(tx('moduleN', { n: meta.mi + 1 })) + ' · ' + esc(tx('lessonOf', { a: idx + 1, b: fl.length })) + '</div>';
    h += '<h2 class="cnh-h cnh-h1" style="margin:0 0 10px">' + esc(l.title || meta.title) + '</h2>';
    if (l.objective) h += '<div class="cnh-notice">' + ic('bulb') + '<span>' + esc(l.objective) + '</span></div>';
    h += '<div class="cnh-md" style="margin:0 0 16px">' + md(l.content) + '</div>';
    if (l.keyPoints && l.keyPoints.length) h += '<div class="cnh-box key"><div class="cnh-box-t">' + ic('star') + esc(tx('keyT')) + '</div><ul>' + l.keyPoints.map(function (k) { return '<li>' + inline(k) + '</li>'; }).join('') + '</ul></div>';
    if (l.example) h += '<div class="cnh-box ex"><div class="cnh-box-t">' + ic('bulb') + esc(tx('exT')) + '</div><div class="cnh-md" style="font-size:.95rem">' + md(l.example) + '</div></div>';
    if (l.exercise && l.exercise.prompt) {
      h += '<div class="cnh-box"><div class="cnh-box-t">' + ic('code') + esc(tx('exerciseT')) + '</div><div class="cnh-md" style="font-size:.95rem">' + md(l.exercise.prompt) + '</div><div class="cnh-row cnh-wrap" style="margin-top:10px">' +
        (l.exercise.hint ? '<button type="button" class="cnh-btn soft sm" data-act="reveal" data-t="cnh-hint">' + esc(tx('hint')) + '</button>' : '') +
        (l.exercise.solution ? '<button type="button" class="cnh-btn soft sm" data-act="reveal" data-t="cnh-sol">' + esc(tx('solution')) + '</button>' : '') + '</div>' +
        (l.exercise.hint ? '<div id="cnh-hint" hidden class="cnh-notice" style="margin:10px 0 0">' + ic('bulb') + '<span>' + esc(l.exercise.hint) + '</span></div>' : '') +
        (l.exercise.solution ? '<div id="cnh-sol" hidden class="cnh-md" style="margin-top:10px;padding:12px;border-radius:12px;background:var(--cnh-ok-bg)">' + md(l.exercise.solution) + '</div>' : '') + '</div>';
    }
    if (S.cards.length) {
      h += '<div class="cnh-eyebrow cnh-row">' + ic('cards', 'sm') + esc(tx('cardsT')) + '</div>' +
        '<div class="cnh-fc" id="cnh-fc"><div class="cnh-fc-in" data-act="flip"><div class="cnh-fc-f" id="cnh-fc-f"></div><div class="cnh-fc-b" id="cnh-fc-b"></div></div></div>' +
        '<div class="cnh-row cnh-between" style="margin-bottom:6px"><button type="button" class="cnh-btn sm" data-act="prevc">' + esc(tx('prevC')) + '</button><span class="cnh-sub" id="cnh-fc-n"></span><button type="button" class="cnh-btn sm" data-act="nextc">' + esc(tx('nextC')) + '</button></div><p class="cnh-hint" style="text-align:center">' + esc(tx('flipHint')) + '</p>';
    }
    h += '<div class="cnh-eyebrow cnh-row">' + ic('note', 'sm') + esc(tx('notesT')) + '<span class="cnh-sub" id="cnh-note-s" style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:500"></span></div><textarea class="cnh-input cnh-note" data-f="note" maxlength="2000" placeholder="' + esc(tx('notesPh')) + '">' + esc(l.note || '') + '</textarea>';
    h += '<div class="cnh-eyebrow cnh-row">' + ic('quiz', 'sm') + esc(tx('quizT')) + '</div><div id="cnh-quiz"></div>';
    h += '<div class="cnh-lbar"><button type="button" class="cnh-btn soft cnh-iconbtn" style="flex:0 0 46px;width:46px;padding:0" data-act="tutor" aria-label="' + esc(tx('askT')) + '">' + ic('chat') + '</button>' +
      '<button type="button" class="cnh-btn ' + (l.done ? 'soft' : 'primary') + '" id="cnh-complete" data-act="complete">' + ic('check') + '<span>' + esc(l.done ? tx('completed') : tx('complete')) + '</span></button>' +
      '<button type="button" class="cnh-btn" data-act="next-lesson" style="flex:0 0 auto"><span>' + esc(tx('nextL')) + '</span>' + ic('right') + '</button></div>';
    setRoot(h);
    paintCard(); paintQuiz();
  }
  function paintCard() {
    var c = S.cards[S.card]; if (!c) return;
    var f = $('cnh-fc-f'), b = $('cnh-fc-b'), n = $('cnh-fc-n'), box = $('cnh-fc');
    if (!f) return;
    if (box) box.classList.remove('flip');
    f.textContent = c.front; b.textContent = c.back; n.textContent = (S.card + 1) + ' / ' + S.cards.length;
    var ll = $('cnh-fc-l'); if (ll) ll.textContent = c.lesson || '';
  }
  function paintQuiz() {
    var host = $('cnh-quiz'), q = S.lesson.quiz || [], st = S.quiz, h = '';
    if (!host) return;
    var res = st.result;
    if (res) h += '<div class="cnh-score ' + (res.passed ? 'ok' : 'no') + '"><b>' + res.score + '%</b><span>' + esc(res.passed ? tx('scoreOk', { n: res.score }) : tx('scoreNo', { n: res.score, p: res.passMark })) + '</span></div>';
    q.forEach(function (x, qi) {
      h += '<div class="cnh-q"><p class="cnh-q-t">' + (qi + 1) + '. ' + inline(x.q) + '</p>';
      x.options.forEach(function (o, oi) {
        var cls = '';
        if (res) { var rv = res.review[qi]; if (oi === rv.answer) cls = 'good'; else if (st.answers[qi] === oi) cls = 'bad'; }
        else if (st.answers[qi] === oi) cls = 'on';
        h += '<button type="button" class="cnh-opt ' + cls + '" data-act="qopt" data-q="' + qi + '" data-o="' + oi + '"' + (res ? ' disabled' : '') + '><span class="k">' + String.fromCharCode(65 + oi) + '</span><span>' + inline(o) + '</span></button>';
      });
      if (res && res.review[qi].why) h += '<p class="cnh-why">' + inline(res.review[qi].why) + '</p>';
      h += '</div>';
    });
    h += res ? '<button type="button" class="cnh-btn block" data-act="qretry">' + esc(tx('retry')) + '</button>' : '<button type="button" class="cnh-btn primary block" data-act="qsubmit">' + esc(tx('validate')) + '</button>';
    host.innerHTML = h;
  }
  async function submitQuiz() {
    var q = S.lesson.quiz || [], st = S.quiz;
    for (var i = 0; i < q.length; i++) if (typeof st.answers[i] !== 'number') { toast(tx('answerAll'), 'info'); return; }
    try {
      var r = await call('academy_study', { op: 'quiz', pathId: S.path.id, lessonId: S.lessonId, answers: st.answers });
      st.result = r; paintQuiz();
      S.path.scores = S.path.scores || {}; S.path.scores[S.lessonId] = Math.max(S.path.scores[S.lessonId] || 0, r.score);
      if (r.xpGained) toast(tx('gained', { n: r.xpGained }), 'success');
    } catch (e) { toast(errMsg(e), 'error'); }
  }
  function saveNote(pathId, lessonId, text) {
    call('academy_study', { op: 'note', pathId: pathId, lessonId: lessonId, text: text }).then(function () { var el = $('cnh-note-s'); if (el && S.lessonId === lessonId) el.textContent = tx('notesSaved'); }).catch(function (e) { toast(errMsg(e), 'error'); });
  }
  async function completeLesson() {
    var btn = $('cnh-complete'); if (!btn || btn.disabled) return;
    var undo = !!S.lesson.done;
    btn.disabled = true;
    try {
      var r = await call('academy_study', { op: 'complete', pathId: S.path.id, lessonId: S.lessonId, undo: undo });
      var done = S.path.completed = S.path.completed || [], k = done.indexOf(S.lessonId);
      if (r.done) { if (k < 0) done.push(S.lessonId); S.lesson.done = true; } else { if (k >= 0) done.splice(k, 1); S.lesson.done = false; }
      btn.className = 'cnh-btn ' + (S.lesson.done ? 'soft' : 'primary');
      btn.querySelector('span').textContent = S.lesson.done ? tx('completed') : tx('complete');
      if (r.done && r.xpGained) toast(tx('gained', { n: r.xpGained }) + ' · ' + tx('streakNow', { n: r.streak }), 'success');
      if (r.pathDone) toast(tx('allDone'), 'success');
      loadHome(true);
    } catch (e) { toast(errMsg(e), 'error'); }
    btn.disabled = false;
  }

  /* ---------------------------- Fenêtres ---------------------------- */
  function sheet(title, bodyHtml, footHtml) {
    closeSheet();
    var ov = document.createElement('div');
    ov.className = 'cnh-ov cnh-root'; ov.id = 'cnh-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="cnh-sheet"><div class="cnh-sheet-h"><b class="cnh-h cnh-h2">' + esc(title) + '</b><button type="button" class="cnh-btn ghost cnh-iconbtn" data-act="close" aria-label="' + esc(tx('close')) + '">' + ic('x') + '</button></div><div class="cnh-sheet-b" id="cnh-sheet-b">' + bodyHtml + '</div>' + (footHtml ? '<div class="cnh-sheet-f">' + footHtml + '</div>' : '') + '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) closeSheet(); });
    ov.addEventListener('click', onClick);
    document.body.appendChild(ov);
    return ov;
  }
  function closeSheet() { var o = $('cnh-ov'); if (o) o.remove(); }

  function openTutor() {
    var h = '<div id="cnh-chat"></div>';
    var foot = '<form id="cnh-chat-f" class="cnh-inline"><input class="cnh-input" id="cnh-chat-i" maxlength="1200" autocomplete="off" placeholder="' + esc(tx('tutorPh')) + '"><button type="submit" class="cnh-btn primary cnh-iconbtn" aria-label="' + esc(tx('send')) + '">' + ic('send') + '</button></form>';
    var ov = sheet(tx('tutorT'), h, foot);
    function paint() {
      var el = $('cnh-chat'); if (!el) return;
      var x = '<div class="cnh-msg ai"><div class="cnh-md">' + md(tx('tutorHi')) + '</div></div>';
      S.chat.forEach(function (m) { x += m.role === 'user' ? '<div class="cnh-msg me">' + esc(m.text) + '</div>' : '<div class="cnh-msg ai"><div class="cnh-md">' + md(m.text) + '</div></div>'; });
      if (S.chatBusy) x += '<div class="cnh-msg ai cnh-typing"><i></i><i></i><i></i></div>';
      el.innerHTML = x;
      var b = $('cnh-sheet-b'); if (b) b.scrollTop = b.scrollHeight;
    }
    paint();
    ov.querySelector('#cnh-chat-f').addEventListener('submit', async function (e) {
      e.preventDefault();
      var inp = $('cnh-chat-i'), msg = inp.value.trim();
      if (!msg || S.chatBusy) return;
      var hist = S.chat.slice(-8);
      S.chat.push({ role: 'user', text: msg }); inp.value = ''; S.chatBusy = true; paint();
      try {
        var r = await call('academy_study', { op: 'tutor', pathId: S.path.id, lessonId: S.view === 'lesson' ? S.lessonId : null, message: msg, history: hist });
        S.chat.push({ role: 'assistant', text: r.reply });
        call('academy_study', { op: 'config' }).then(function (c) { S.cfg = c; }).catch(function () { /* ignore */ });
      } catch (err) { S.chat.pop(); inp.value = msg; toast(errMsg(err), 'error'); if (isPaywall(err) && hasOffers()) { call('academy_study', { op: 'config' }).then(function (c) { S.cfg = c; }).catch(function () { /* ignore */ }); closeSheet(); openPlus(); return; } }
      S.chatBusy = false; paint();
    });
    setTimeout(function () { var i = $('cnh-chat-i'); if (i) i.focus(); }, 250);
  }

  var PLAN_KEY = { month: 'pMonth', quarter: 'pQuarter', semester: 'pSemester', year: 'pYear' };
  function perMonth(o) { return Math.round(o.price / (o.days / 30) * 100) / 100; }
  function offerBtn(o, sel, best) {
    return '<button type="button" class="cnh-offer' + (o.plan === sel ? ' on' : '') + '" data-act="plan-pick" data-plan="' + esc(o.plan) + '">' + (best ? '<span class="tag">' + esc(tx('bestV')) + '</span>' : '') + '<span class="r">' + ic('check') + '</span>' +
      '<span><b>' + esc(tx(PLAN_KEY[o.plan])) + '</b><small>' + esc(tx('daysN', { n: o.days })) + (o.days > 30 ? ' · ' + esc(tx('perMo', { p: perMonth(o) })) : '') + '</small></span><span class="p">' + esc(String(o.price)) + ' $</span></button>';
  }
  function openPlus() {
    var c = S.cfg; if (!c) return;
    var offers = c.plus.offers || [], bal = me() && typeof me().balance === 'number' ? me().balance : null, pl = c.plusLimits;
    var ok = offers.some(function (o) { return o.plan === S.planSel; });
    if (!ok) { var q = offers.filter(function (o) { return o.plan === 'quarter'; })[0]; S.planSel = (q || offers[0] || {}).plan; }
    var best = null;
    if (offers.length > 1) offers.forEach(function (o) { if (!best || perMonth(o) < perMonth(best)) best = o; });
    var h = '<p class="cnh-sub" style="margin:0 0 14px">' + esc(tx('plansS')) + '</p>' +
      '<ul class="cnh-perks">' + [tx('pk1'), tx('pk2', { a: pl.lessons, b: pl.tutor }), tx('pk3', { n: pl.paths }), tx('pk4'), tx('pk5')].map(function (t0) { return '<li>' + ic('check') + '<span>' + esc(t0) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="cnh-offers" id="cnh-offers">' + offers.map(function (o) { return offerBtn(o, S.planSel, best && best.plan === o.plan); }).join('') + '</div>' +
      (bal !== null ? '<p class="cnh-sub" style="text-align:center;margin:0">' + esc(tx('balance', { b: bal.toFixed(2) })) + '</p>' : '') + '<div id="cnh-plus-msg" style="margin-top:12px"></div>';
    var foot = offers.length ? '<button type="button" class="cnh-btn primary block" id="cnh-plus-go" data-act="plus-go" data-plan="' + esc(S.planSel) + '">' + ic('crown') + '<span>' + esc(tx('activateSel', { p: priceOfPlan(S.planSel) })) + '</span></button>' : '<p class="cnh-sub">' + esc(tx('plusNA')) + '</p>';
    sheet(tx('plansT'), h, foot);
  }
  function priceOfPlan(plan) { var r = ''; ((S.cfg && S.cfg.plus.offers) || []).forEach(function (o) { if (o.plan === plan) r = o.price; }); return r; }
  function pickPlan(plan) {
    S.planSel = plan;
    [].forEach.call(document.querySelectorAll('#cnh-offers .cnh-offer'), function (b) { b.classList.toggle('on', b.getAttribute('data-plan') === plan); });
    var go = $('cnh-plus-go'); if (go) { go.setAttribute('data-plan', plan); var sp = go.querySelector('span'); if (sp) sp.textContent = tx('activateSel', { p: priceOfPlan(plan) }); }
  }
  async function doPlus(plan, btn) {
    var msg = $('cnh-plus-msg'); if (!btn || btn.disabled) return;
    btn.disabled = true;
    try {
      var r = await call('academy_study', { op: 'subscribe', plan: plan });
      try { if (me() && typeof r.newBalance === 'number') { me().balance = r.newBalance; var w = $('wallet-balance'); if (w) w.textContent = r.newBalance.toFixed(2) + '$'; } } catch (e) { /* ignore */ }
      closeSheet(); toast(tx('plusOn'), 'success'); S.cfg = await call('academy_study', { op: 'config' }); if (S.fs) renderEntry(); else renderHome();
    } catch (e) {
      var m = errMsg(e), low = /solde/i.test(m);
      if (msg) msg.innerHTML = '<div class="cnh-notice bad">' + ic('alert') + '<span>' + esc(m) + '</span></div>' + (low ? '<button type="button" class="cnh-btn soft block" data-act="recharge">' + esc(tx('recharge')) + '</button>' : '');
      try { if (msg) msg.scrollIntoView({ block: 'nearest' }); } catch (x) { /* ignore */ }
      btn.disabled = false;
    }
  }

  /* ---------------------------- Clics ---------------------------- */
  function onClick(e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (el.tagName === 'A') e.preventDefault();
    switch (act) {
      case 'reload': loadHome(); break;
      case 'home': closeAll(false); break;
      case 'back': back(); break;
      case 'login': try { openAuth('register'); } catch (x) { /* ignore */ } break;
      case 'plus': openPlus(); break;
      case 'plus-go': doPlus(el.getAttribute('data-plan') || 'month', el); break;
      case 'plan-pick': pickPlan(el.getAttribute('data-plan')); break;
      case 'review': go('review', { id: S.path && S.path.id }); break;
      case 'shuffle': S.cards = shuffle(S.cards); S.card = 0; paintCard(); break;
      case 'attest': openAttest(); break;
      case 'attest-print': printAttest(); break;
      case 'unlock': doUnlock(id); break;
      case 'recharge': closeSheet(); try { showDashTab('wallet'); } catch (x) { /* ignore */ } break;
      case 'close': closeSheet(); break;
      case 'cat': S.form = null; go('cat', { id: id }); break;
      case 'group': go('group', { c: el.getAttribute('data-c'), g: id }); break;
      case 'topic-pick':
        var cg = groupOf(el.getAttribute('data-c'), el.getAttribute('data-g')), tpk = null;
        if (cg) cg.topics.forEach(function (x) { if (x.id === id) tpk = x; });
        if (cg && tpk) go('create', { c: el.getAttribute('data-c'), g: cg.id, topic: topicText(cg, tpk) });
        break;
      case 'own':
        var own = (S.own || '').trim();
        if (own.length < 2) { var oi = $('cnh-fs-body') && $('cnh-fs-body').querySelector('[data-f="own"]'); if (oi) oi.focus(); break; }
        go('create', { c: el.getAttribute('data-c'), g: el.getAttribute('data-g'), topic: own.slice(0, 80) });
        break;
      case 'level': if (S.form) { S.form.level = el.getAttribute('data-v'); [].forEach.call(el.parentNode.querySelectorAll('button'), function (b) { b.classList.toggle('on', b === el); }); } break;
      case 'style': if (S.form) { S.form.style = el.getAttribute('data-v'); [].forEach.call(el.parentNode.querySelectorAll('button'), function (b) { b.classList.toggle('on', b === el); }); var sh = $('cnh-style-h'); if (sh) sh.textContent = tx('stH_' + S.form.style); } break;
      case 'create': doCreate(); break;
      case 'path': go('path', { id: id }); break;
      case 'delete': doDelete(); break;
      case 'lesson': go('lesson', { id: id }); break;
      case 'tutor': openTutor(); break;
      case 'reveal': var t0 = $(el.getAttribute('data-t')); if (t0) t0.hidden = !t0.hidden; break;
      case 'flip': var fc = $('cnh-fc'); if (fc) fc.classList.toggle('flip'); break;
      case 'prevc': S.card = (S.card - 1 + S.cards.length) % S.cards.length; paintCard(); break;
      case 'nextc': S.card = (S.card + 1) % S.cards.length; paintCard(); break;
      case 'qopt': if (!S.quiz.result) { S.quiz.answers[+el.getAttribute('data-q')] = +el.getAttribute('data-o'); paintQuiz(); } break;
      case 'qsubmit': submitQuiz(); break;
      case 'qretry': S.quiz = { answers: [], result: null }; paintQuiz(); break;
      case 'complete': completeLesson(); break;
      case 'next-lesson':
        var fl = flatLessons(S.path), k = -1; fl.forEach(function (x, i) { if (x.id === S.lessonId) k = i; });
        if (k >= 0 && k + 1 < fl.length) replaceTop('lesson', { id: fl[k + 1].id }); else back();
        break;
      default: break;
    }
  }
  function onInput(e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-f');
    if (!f) return;
    var cur = S.stack[S.stack.length - 1];
    if (f === 'gsearch' && cur && cur.view === 'cat') { var x = catOf(cur.args.id), gl = $('cnh-glist'); if (gl) gl.innerHTML = groupsHtml(x.c, e.target.value, x.i); return; }
    if (f === 'tsearch' && cur && cur.view === 'group') { var g = groupOf(cur.args.c, cur.args.g), tl = $('cnh-tlist'); if (g && tl) tl.innerHTML = topicsHtml(cur.args.c, g, e.target.value); return; }
    if (f === 'own') { S.own = e.target.value; return; }
    if (f === 'note') { var pid = S.path && S.path.id, lid = S.lessonId, val = e.target.value; clearTimeout(S.noteT); var st = $('cnh-note-s'); if (st) st.textContent = ''; S.noteT = setTimeout(function () { saveNote(pid, lid, val); }, 900); return; }
    if (!S.form) return;
    if (f === 'hours') { S.form.hours = +e.target.value; var v = $('cnh-hours-v'); if (v) v.textContent = tx('hoursV', { n: S.form.hours }); }
    else S.form[f] = e.target.value;
  }

  /* ---------------------------- Montage dans l'Académie ---------------------------- */
  function openHub() {
    if (!root) return;
    if (!me()) {
      setRoot('<div class="cnh-empty"><span class="cnh-dom">' + ic('cap') + '</span><h3 class="cnh-h cnh-h2" style="margin:0 0 6px">' + esc(tx('loginT')) + '</h3><p style="margin:0 0 16px">' + esc(tx('loginS')) + '</p><button type="button" class="cnh-btn primary" data-act="login">' + esc(tx('loginB')) + '</button></div>');
      return;
    }
    loadHome();
  }
  function mount() {
    var scr = $('menu-screen-academy'), tabs = $('academy-content-type-tabs');
    if (!scr || !tabs || $('academy-study-section')) return !!$('academy-study-section');
    var sec = document.createElement('div');
    sec.id = 'academy-study-section'; sec.className = 'hidden cnh-root';
    scr.appendChild(sec); root = sec;
    sec.addEventListener('click', onClick); sec.addEventListener('input', onInput);
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-content-type', 'study'); b.setAttribute('onclick', "setAcademyContentType('study')");
    b.textContent = tx('tab');
    tabs.appendChild(b);
    var orig = window.setAcademyContentType;
    if (typeof orig === 'function') {
      window.setAcademyContentType = function (type) {
        var r = orig.apply(this, arguments);
        sec.classList.toggle('hidden', type !== 'study');
        if (type === 'study') openHub();
        return r;
      };
    }
    return true;
  }

  /* =====================================================================
     LISTE DES ÉTUDIANTS (remplace l'ancien écran qui affichait « Missing or insufficient permissions »)
     La liste vient maintenant du serveur : aucune règle Firestore n'est nécessaire.
     ===================================================================== */
  var avColor = function (n) { return 'hsl(' + (hash(n) % 360) + ',52%,42%)'; };
  window.openCourseStudents = async function (courseId) {
    var body = $('course-detail-body'); if (!body) return;
    var head = '<div class="cnh-root"><button type="button" class="cnh-btn ghost" data-st="back" style="margin:-6px 0 8px -8px">' + ic('arrow') + esc(tx('back')) + '</button><h3 class="cnh-h cnh-h1" style="margin:0 0 14px">' + esc(tx('stuT')) + '</h3><div id="cnh-stu-body">' + skeleton(4) + '</div></div>';
    body.innerHTML = head;
    var rootEl = body.firstChild;
    rootEl.addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (!b) return; if (b.getAttribute('data-st') === 'back') { try { openCourseDetail(courseId); } catch (x) { /* ignore */ } } else if (b.getAttribute('data-st') === 'retry') window.openCourseStudents(courseId); });
    var host = function () { return body.querySelector('#cnh-stu-body'); };
    try {
      var r = await call('academy_students', { courseId: courseId });
      var all = r.students, filter = 'all', q = '';
      var st = r.stats;
      var h = '<div class="cnh-stats four">' +
        '<div class="cnh-stat"><b>' + st.count + '</b><span>' + esc(tx('stuCount')) + '</span></div>' +
        '<div class="cnh-stat"><b>' + st.avgProgress + '%</b><span>' + esc(tx('stuAvg')) + '</span></div>' +
        '<div class="cnh-stat"><b>' + st.finished + '</b><span>' + esc(tx('stuFin')) + '</span></div>' +
        '<div class="cnh-stat"><b>' + Number(st.revenue).toFixed(2) + ' $</b><span>' + esc(tx('stuPaid')) + '</span></div></div>';
      if (!all.length) { host().innerHTML = h + '<div class="cnh-empty"><span class="cnh-dom">' + ic('users') + '</span><b style="display:block;color:var(--cnh-ink);margin-bottom:6px">' + esc(tx('stuEmpty')) + '</b><p style="margin:0">' + esc(tx('stuEmptyS')) + '</p></div>'; return; }
      h += '<input type="search" class="cnh-input" id="cnh-stu-q" placeholder="' + esc(tx('stuSearch')) + '" style="margin:0 0 10px"><div class="cnh-chips" id="cnh-stu-f">' +
        [['all', 'fAll'], ['run', 'fRun'], ['fin', 'fFin'], ['new', 'fNew']].map(function (f) { return '<button type="button" class="cnh-chip' + (f[0] === 'all' ? ' on' : '') + '" data-f="' + f[0] + '">' + esc(tx(f[1])) + '</button>'; }).join('') + '</div><div id="cnh-stu-list"></div>';
      host().innerHTML = h;
      var total = r.course.chapters;
      function paint() {
        var list = all.filter(function (s) {
          if (q && s.name.toLowerCase().indexOf(q) < 0) return false;
          if (filter === 'fin') return s.progress >= 100;
          if (filter === 'new') return s.progress === 0;
          if (filter === 'run') return s.progress > 0 && s.progress < 100;
          return true;
        });
        var el = body.querySelector('#cnh-stu-list');
        el.innerHTML = list.length ? list.map(function (s) {
          return '<div class="cnh-stu"><span class="cnh-av" style="background:' + avColor(s.name) + '">' + esc((s.name.trim().charAt(0) || '?').toUpperCase()) + '</span><div class="cnh-grow"><div class="cnh-row cnh-between"><span class="cnh-stu-n cnh-ellipsis">' + esc(s.name) + '</span><b style="font-size:.85rem">' + s.progress + '%</b></div>' +
            '<div class="cnh-bar' + (s.progress >= 100 ? ' ok' : '') + '" style="margin:7px 0 6px"><i style="width:' + s.progress + '%"></i></div>' +
            '<div class="cnh-stu-m cnh-row cnh-wrap" style="gap:4px 10px"><span>' + esc(tx('chapN', { a: s.doneChapters, b: total })) + '</span><span>' + esc(tx('joined', { d: fmtDate(s.joinedAt) })) + '</span>' +
            (s.quizAvg != null ? '<span class="cnh-pill">Quiz ' + esc(s.quizAvg) + '%</span>' : '') + (s.finalScore != null ? '<span class="cnh-pill ' + (s.finalScore >= 70 ? 'ok' : 'warn') + '">Examen ' + esc(s.finalScore) + '%</span>' : '') + (s.certificate ? '<span class="cnh-pill ok">' + esc(tx('cert')) + '</span>' : '') + '<span class="cnh-pill">' + (s.paid > 0 ? esc(Number(s.paid).toFixed(2)) + ' $' : esc(tx('freeW'))) + '</span></div></div></div>';
        }).join('') : '<p class="cnh-sub" style="text-align:center;padding:18px 0">' + esc(tx('stuNone')) + '</p>';
      }
      paint();
      body.querySelector('#cnh-stu-q').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); paint(); });
      body.querySelector('#cnh-stu-f').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; filter = b.getAttribute('data-f'); [].forEach.call(body.querySelectorAll('#cnh-stu-f .cnh-chip'), function (c) { c.classList.toggle('on', c === b); }); paint(); });
    } catch (e) {
      var h2 = host(); if (h2) h2.innerHTML = '<div class="cnh-empty"><span class="cnh-dom">' + ic('alert') + '</span><p style="margin:0 0 14px">' + esc(errMsg(e)) + '</p><button type="button" class="cnh-btn primary" data-st="retry">' + esc(tx('retryB')) + '</button></div>';
    }
  };

  /* =====================================================================
     CARTES DE COURS + CATÉGORIES (remplace l'affichage de la liste « Découvrir »)
     ===================================================================== */
  var catFilter = '';
  function levelOfCourse(c) { var m = null; try { m = COURSE_LEVEL_LABELS[c.level]; } catch (e) { /* ignore */ } return m ? safeT(m, '') : ''; }
  function priceOf(c) { return Number(c.price) > 0 ? Number(c.price).toFixed(Number(c.price) % 1 ? 2 : 0) + ' $' : safeT('course_free', tx('freeW')); }
  function paintCats(list) {
    var host = $('cnh-cats'), tab = $('academy-tab-browse'), listEl = $('academy-browse-list');
    if (!tab || !listEl) return;
    if (!host) { host = document.createElement('div'); host.id = 'cnh-cats'; host.className = 'cnh-chips cnh-root'; tab.insertBefore(host, listEl); host.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; catFilter = b.getAttribute('data-cat'); try { runAcademyFilter(); } catch (x) { /* ignore */ } }); }
    var counts = {}; list.forEach(function (c) { var k = (c.category || '').trim(); if (k) counts[k] = (counts[k] || 0) + 1; });
    var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 12);
    if (catFilter && cats.indexOf(catFilter) < 0) catFilter = '';
    host.style.display = cats.length ? '' : 'none';
    host.innerHTML = '<button type="button" class="cnh-chip' + (catFilter ? '' : ' on') + '" data-cat="">' + esc(tx('allC')) + '</button>' + cats.map(function (k) { return '<button type="button" class="cnh-chip' + (catFilter === k ? ' on' : '') + '" data-cat="' + esc(k) + '">' + esc(k) + '</button>'; }).join('');
  }
  function courseCard(c) {
    var n = (c.chapters || []).length;
    return '<button type="button" class="cnh-course" data-course="' + esc(c.id) + '"><div class="cnh-cover" style="--t:' + tintOf(c.category || c.title) + '">' + ic('cap', 'bg').replace('class="cnh-ico bg"', 'class="bg"') +
      '<span class="cnh-pill">' + esc(c.category || '—') + '</span><span class="cnh-price-tag">' + esc(priceOf(c)) + '</span></div><div class="cnh-course-b"><h3 class="cnh-course-t">' + esc(c.title || safeT('course_default_title', '—')) + '</h3><p class="cnh-sub cnh-ellipsis">' + esc(tx('byOwner', { n: c.ownerName || '—' })) + '</p>' +
      '<div class="cnh-meta">' + (levelOfCourse(c) ? '<span>' + ic('star') + esc(levelOfCourse(c)) + '</span>' : '') + '<span>' + ic('book') + esc(tx('chaptersN', { n: n })) + '</span><span>' + ic('users') + esc(tx('studentsN', { n: c.studentsCount || 0 })) + '</span></div></div></button>';
  }
  function bindCourseClicks(el) {
    if (el.__cnhBound) return; el.__cnhBound = true;
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-course]'); if (b) { try { openCourseDetail(b.getAttribute('data-course')); } catch (x) { /* ignore */ } } });
  }
  window.renderAcademyBrowseList = function (list) {
    var el = $('academy-browse-list'); if (!el) return;
    var visible = list.filter(function (c) { try { return !blockedSet.has(c.ownerUid); } catch (e) { return true; } });
    paintCats(visible);
    var shown = catFilter ? visible.filter(function (c) { return (c.category || '').trim() === catFilter; }) : visible;
    bindCourseClicks(el);
    if (!shown.length) { el.innerHTML = '<div class="cnh-empty cnh-root"><span class="cnh-dom">' + ic('book') + '</span><p style="margin:0">' + esc(safeT('course_empty_browse', tx('emptyCourses'))) + '</p></div>'; return; }
    el.innerHTML = '<div class="cnh-courses cnh-root">' + shown.map(courseCard).join('') + '</div>';
  };

  window.loadMyEnrolledCourses = async function () {
    var el = $('academy-mycourses-list'); if (!el) return;
    var u = me();
    if (!u) { el.innerHTML = '<div class="cnh-empty cnh-root"><span class="cnh-dom">' + ic('lock') + '</span><p style="margin:0 0 14px">' + esc(tx('myLogin')) + '</p><button type="button" class="cnh-btn primary" data-act="login">' + esc(tx('loginB')) + '</button></div>'; bindCourseClicks(el); el.onclick = function (e) { if (e.target.closest('[data-act="login"]')) { try { openAuth('register'); } catch (x) { /* ignore */ } } }; return; }
    el.innerHTML = '<div class="cnh-root">' + skeleton(3) + '</div>';
    try {
      var snap = await db.collection('course_enrollments').where('studentUid', '==', u.uid).limit(100).get();
      var enr = snap.docs.map(function (d) { return d.data(); });
      enr.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
      if (!enr.length) { el.innerHTML = '<div class="cnh-empty cnh-root"><span class="cnh-dom">' + ic('cap') + '</span><p style="margin:0 0 14px">' + esc(tx('myEmpty')) + '</p><button type="button" class="cnh-btn primary" data-go="browse">' + esc(tx('myEmptyB')) + '</button></div>'; el.onclick = function (e) { if (e.target.closest('[data-go]')) { try { setAcademyTab('browse'); } catch (x) { /* ignore */ } } }; return; }
      var courses = await Promise.all(enr.map(function (e) { return db.collection('courses').doc(e.courseId).get().then(function (s) { return s.exists ? s.data() : null; }).catch(function () { return null; }); }));
      var fin = 0, run = 0, cards = '';
      enr.forEach(function (e, i) {
        var c = courses[i], total = c && c.chapters ? c.chapters.length : 0, done = (e.completedChapters || []).length, p = total ? pct(done, total) : 0;
        if (p >= 100) fin++; else run++;
        cards += '<button type="button" class="cnh-card cnh-path" data-course="' + esc(e.courseId) + '">' + ring(p) + '<span class="cnh-grow"><b class="cnh-ellipsis" style="display:block">' + esc(e.courseTitle || (c && c.title) || '') + '</b><span class="cnh-sub cnh-ellipsis" style="display:block">' + esc(tx('byOwner', { n: (c && c.ownerName) || '—' })) + ' · ' + esc(tx('chapN', { a: done, b: total || '?' })) + '</span></span><span class="cnh-btn ' + (p >= 100 ? 'soft' : 'primary') + ' sm" style="pointer-events:none">' + esc(tx('cont')) + '</span></button>';
      });
      el.innerHTML = '<div class="cnh-root"><div class="cnh-stats"><div class="cnh-stat"><b>' + enr.length + '</b><span>' + esc(tx('cEnrolled')) + '</span></div><div class="cnh-stat"><b>' + run + '</b><span>' + esc(tx('cRunning')) + '</span></div><div class="cnh-stat"><b>' + fin + '</b><span>' + esc(tx('cFinished')) + '</span></div></div>' + cards + '</div>';
      el.onclick = null; bindCourseClicks(el);
    } catch (e) {
      el.innerHTML = '<div class="cnh-empty cnh-root"><span class="cnh-dom">' + ic('alert') + '</span><p style="margin:0">' + esc(errMsg(e) === tx('fail') ? tx('loadFail') : errMsg(e)) + '</p></div>';
    }
  };

  /* ---------------------------- Démarrage ---------------------------- */
  var tries = 0;
  (function boot() { try { if (mount()) { try { if (typeof academyCache !== 'undefined' && academyCache && $('academy-tab-browse')) window.renderAcademyBrowseList(academyCache); } catch (e) { /* ignore */ } return; } } catch (e) { /* ignore */ } if (++tries < 40) setTimeout(boot, 300); })();
})();
