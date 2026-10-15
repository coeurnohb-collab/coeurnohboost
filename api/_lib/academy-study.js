// api/_lib/academy-study.js
// Auto-etudes de l'Academie : parcours generes par l'IA, lecons, quiz corriges par le serveur,
// tuteur, serie d'etude, abonnement "Plus" (paye avec le portefeuille, prix regle dans l'admin).
// Branche dans api/payments-actions.js (action "academy_study") : aucune nouvelle fonction serverless.
//
// Collections ECRITES ET LUES PAR LE SERVEUR SEULEMENT (aucune regle Firestore a ouvrir) :
//   academy_ai_users/{uid}                 abonnement Plus, compteurs du jour, serie, points
//   academy_paths/{pathId}                 parcours (plan, progression, notes)
//   academy_study_lessons/{pathId_lessonId} lecons deja generees (avec les bonnes reponses du quiz)
// Reglages (prix, limites, modele) : app_config/academy_ai (lisible par tous, modifiable par l'admin).
const A = require('./academy-ai');
const L = require('./academy-learning');

const TRIAL_TAG = '[ESSAI] ';   // le navigateur reconnait ce debut de message et affiche les formules payantes
const XP_LESSON = 10, XP_QUIZ_PASS = 20;
const isLessonId = (v) => typeof v === 'string' && /^l\d{1,2}_\d{1,2}$/.test(v);

function createAcademyStudy({ db, admin, ADMIN_UID, buildWalletTxEntry, push }) {
  const now = () => new Date().toISOString();
  const r2 = (x) => Math.round(x * 100) / 100;
  const FV = () => admin.firestore.FieldValue;

  async function getConfig() {
    try { const s = await db.collection('app_config').doc('academy_ai').get(); return A.normalizeConfig(s.exists ? s.data() : {}); }
    catch (e) { return A.normalizeConfig({}); }
  }
  const userRef = (uid) => db.collection('academy_ai_users').doc(uid);
  const isPlusNow = (u) => !!(u && Number(u.plusUntilMs) > Date.now());

  async function loadUser(uid) {
    const s = await userRef(uid).get();
    return s.exists ? s.data() : {};
  }
  async function loadPath(uid, pathId) {
    if (!L.isItemId(pathId)) throw new Error('Parcours invalide.');
    const s = await db.collection('academy_paths').doc(pathId).get();
    if (!s.exists || s.data().ownerUid !== uid) throw new Error('Parcours introuvable.');
    return Object.assign({ id: s.id }, s.data());
  }

  // Acces a une categorie : gratuit, reserve Plus, ou deblocage payant (reglages dans l'admin). L'admin du site passe toujours.
  function checkAccess(cfg, u, uid, domain) {
    if (uid === ADMIN_UID) return;
    const acc = (cfg.domainAccess || {})[domain] || { mode: 'free', enabled: true };
    if (acc.enabled === false) throw new Error('Cette catégorie est momentanément fermée.');
    if (acc.mode === 'plus' && !isPlusNow(u)) throw new Error('Cette catégorie est réservée aux membres Académie Plus.');
    if (acc.mode === 'paid' && !(Number(u && u.unlocks && u.unlocks[domain]) > Date.now())) throw new Error(`Débloque cette catégorie pour ${acc.price} $ (${acc.days} jours) pour y créer des parcours.`);
  }
  function accessInfo(cfg, u, uid) {
    const out = {};
    A.DOMAIN_IDS.forEach((id) => {
      const acc = cfg.domainAccess[id], until = Number(u && u.unlocks && u.unlocks[id]) || 0;
      const open = uid === ADMIN_UID || acc.enabled === false ? uid === ADMIN_UID : (acc.mode === 'free' || (acc.mode === 'plus' && isPlusNow(u)) || (acc.mode === 'paid' && until > Date.now()));
      out[id] = { mode: acc.mode, price: acc.price, days: acc.days, enabled: acc.enabled !== false, open, untilMs: acc.mode === 'paid' && until > Date.now() ? until : 0 };
    });
    return out;
  }

  const pathCard = (p) => ({
    id: p.id, title: p.title, summary: p.summary, domain: p.domain, group: p.group || '', groupLabel: p.groupLabel || '', topic: p.topic, level: p.level, style: p.style || 'balanced',
    lessonsTotal: p.lessonsTotal, done: (p.completed || []).length, updatedAt: p.updatedAt || p.createdAt || '', lastLessonId: p.lastLessonId || null
  });
  const pathFull = (p) => Object.assign(pathCard(p), {
    goal: p.goal || '', hoursPerWeek: p.hoursPerWeek, outcomes: p.outcomes || [], modules: p.modules || [],
    completed: p.completed || [], scores: p.scores || {}, generated: p.generated || []
  });

  // Reserve 1 unite de quota (transaction). Renvoie une fonction pour la rendre si l'IA echoue.
  // Gratuit : essai a VIE (2 lecons, 5 questions par defaut, reglables dans l'admin). Plus : quota par jour.
  async function reserve(uid, field) {
    if (uid === ADMIN_UID) return async () => {};
    const cfg = await getConfig();
    const ref = userRef(uid);
    const today = A.dayKey(Date.now());
    let mode = 'day';
    await db.runTransaction(async (t) => {
      const s = await t.get(ref);
      const u = s.exists ? s.data() : {};
      if (isPlusNow(u)) {
        mode = 'day';
        const lim = A.limitsFor(cfg, true);
        const used = A.usageToday(u.usage, today);
        if (used[field] >= lim[field]) throw new Error('Tu as atteint ta limite du jour. Elle repart à zéro demain.');
        used[field] += 1;
        t.set(ref, { usage: used, updatedAt: now() }, { merge: true });
      } else {
        mode = 'trial';
        const tr = A.trialUsed(u), max = field === 'lessons' ? cfg.freeLessonsTotal : cfg.freeTutorTotal;
        if (tr[field] >= max) {
          throw new Error(TRIAL_TAG + (field === 'lessons'
            ? `Ton essai gratuit est terminé : tu as utilisé tes ${max} leçons offertes. Choisis une formule pour continuer à étudier.`
            : `Ton essai gratuit est terminé : tu as utilisé tes ${max} questions offertes au tuteur. Choisis une formule pour continuer.`));
        }
        tr[field] += 1;
        t.set(ref, { trial: tr, updatedAt: now() }, { merge: true });
      }
    });
    return async () => {
      try {
        await db.runTransaction(async (t) => {
          const s = await t.get(ref);
          const u = s.exists ? s.data() : {};
          if (mode === 'trial') { const tr = A.trialUsed(u); tr[field] = Math.max(0, tr[field] - 1); t.set(ref, { trial: tr }, { merge: true }); }
          else { const used = A.usageToday(u.usage, today); used[field] = Math.max(0, used[field] - 1); t.set(ref, { usage: used }, { merge: true }); }
        });
      } catch (e) { /* secondaire */ }
    };
  }

  async function aiJson(cfg, isPlus, prompt, maxTokens, clean) {
    const started = Date.now();
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1 && Date.now() - started > 22000) break;
      const text = await A.callAI({ cfg, isPlus, system: prompt.system, messages: [{ role: 'user', text: prompt.user }], maxTokens, wantJson: true, timeoutMs: attempt === 0 ? 50000 : 14000 });
      try { return clean(A.parseJsonLoose(text)); } catch (e) { lastErr = e; }
    }
    console.error('[academy-study] reponse IA inutilisable :', lastErr && lastErr.message);
    throw new Error("Le tuteur a renvoyé une réponse incomplète. Réessaie dans un instant (rien n'a été décompté).");
  }

  // Debite le portefeuille de l'eleve, credite l'admin et ecrit le droit d'acces, dans UNE transaction.
  async function charge(uid, price, descBuyer, descAdmin, makePatch) {
    const ref = userRef(uid), meRef = db.collection('users').doc(uid), adminRef = db.collection('users').doc(ADMIN_UID);
    return db.runTransaction(async (t) => {
      const [uSnap, meSnap, adSnap] = await Promise.all([t.get(ref), t.get(meRef), uid !== ADMIN_UID ? t.get(adminRef) : Promise.resolve(null)]);
      if (!meSnap.exists) throw new Error('Compte introuvable.');
      const u = uSnap.exists ? uSnap.data() : {};
      let newBalance = meSnap.data().balance || 0;
      if (uid !== ADMIN_UID) {
        if (newBalance < price) throw new Error('Solde insuffisant. Recharge ton portefeuille pour continuer.');
        newBalance = r2(newBalance - price);
        t.update(meRef, { balance: newBalance });
        t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'course_enrollment', amount: -price, balanceAfter: newBalance, description: descBuyer, relatedId: null }));
        if (adSnap && adSnap.exists) {
          const nb = r2((adSnap.data().balance || 0) + price);
          t.update(adminRef, { balance: nb });
          t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: ADMIN_UID, type: 'course_income', amount: price, balanceAfter: nb, description: descAdmin, relatedId: null }));
        }
      }
      const patch = makePatch(u);
      t.set(ref, Object.assign({ updatedAt: now() }, patch), { merge: true });
      return { patch, newBalance };
    });
  }

  /* ======================= OPERATIONS ======================= */
  async function study(uid, body) {
    const op = body.op;

    if (op === 'config') {
      const cfg = await getConfig();
      const u = await loadUser(uid);
      const plus = isPlusNow(u);
      const lim = A.limitsFor(cfg, plus);
      const used = A.usageToday(u.usage, A.dayKey(Date.now()));
      const tr = A.trialUsed(u);
      return {
        success: true, enabled: cfg.enabled, aiReady: !!A.pickProvider(cfg, process.env),
        plus: { active: plus, untilMs: plus ? Number(u.plusUntilMs) : 0, offers: A.plusOffers(cfg) },
        trial: { lessons: { used: tr.lessons, max: cfg.freeLessonsTotal }, tutor: { used: tr.tutor, max: cfg.freeTutorTotal }, over: tr.lessons >= cfg.freeLessonsTotal && tr.tutor >= cfg.freeTutorTotal },
        access: accessInfo(cfg, u, uid),
        limits: { lessons: lim.lessons, tutor: lim.tutor, paths: lim.paths, plansPerDay: plus ? A.PLANS_PER_DAY.plus : A.PLANS_PER_DAY.free },
        freeLimits: { lessons: cfg.freeLessonsTotal, tutor: cfg.freeTutorTotal, paths: cfg.freeMaxPaths },
        plusLimits: { lessons: cfg.plusLessonsPerDay, tutor: cfg.plusTutorPerDay, paths: cfg.plusMaxPaths },
        usage: { lessons: used.lessons, tutor: used.tutor, plans: used.plans },
        stats: { streak: A.dayKey(Date.now()) === u.lastDay || (u.lastDay && A.dayKey(Date.now() - 86400000) === u.lastDay) ? (u.streak || 0) : 0, xp: u.xp || 0, lessonsDone: u.lessonsDone || 0 }
      };
    }

    // Catalogue complet (categories > domaines > sujets) : charge une seule fois par l'application. Les consignes internes restent cote serveur.
    if (op === 'catalog') {
      const cats = A.DOMAINS.map((c) => ({ id: c.id, icon: c.icon, label: c.label, desc: c.desc, groups: c.groups.map((g) => ({ id: g.id, label: g.label, kind: g.kind || '', topics: g.topics.map((t) => ({ id: t.id, fr: t.fr, en: t.en })) })) }));
      return { success: true, categories: cats };
    }

    if (op === 'paths') {
      const snap = await db.collection('academy_paths').where('ownerUid', '==', uid).limit(A.MAX_PATHS_HARD + 5).get();
      const list = snap.docs.map((d) => pathCard(Object.assign({ id: d.id }, d.data())));
      list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return { success: true, paths: list };
    }

    if (op === 'get_path') return { success: true, path: pathFull(await loadPath(uid, body.pathId)) };

    if (op === 'delete_path') {
      const p = await loadPath(uid, body.pathId);
      const lessons = await db.collection('academy_study_lessons').where('pathId', '==', p.id).limit(60).get();
      const batch = db.batch();
      lessons.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection('academy_paths').doc(p.id));
      await batch.commit();
      return { success: true };
    }

    if (op === 'create_path') {
      const cfg = await getConfig();
      if (!cfg.enabled) throw new Error("Les auto-études sont momentanément fermées.");
      const inp = A.sanitizePathInput(body);
      const u = await loadUser(uid);
      checkAccess(cfg, u, uid, inp.domain);
      const plus = isPlusNow(u);
      const lim = A.limitsFor(cfg, plus);
      const mine = await db.collection('academy_paths').where('ownerUid', '==', uid).limit(A.MAX_PATHS_HARD + 1).get();
      if (mine.size >= lim.paths) {
        throw new Error(plus ? `Tu as atteint ${lim.paths} parcours. Supprime-en un pour en créer un nouveau.` : "Ta version gratuite permet " + lim.paths + " parcours. Supprime-le ou passe à Académie Plus pour en créer d'autres.");
      }
      const today = A.dayKey(Date.now());
      const ref = userRef(uid);
      const plansMax = plus ? A.PLANS_PER_DAY.plus : A.PLANS_PER_DAY.free;
      await db.runTransaction(async (t) => {
        const s = await t.get(ref);
        const used = A.usageToday(s.exists ? s.data().usage : null, today);
        if (used.plans >= plansMax) throw new Error('Tu as créé beaucoup de parcours aujourd\'hui. Reviens demain.');
        used.plans += 1;
        t.set(ref, { usage: used, updatedAt: now() }, { merge: true });
      });
      const release = async () => {
        try { await db.runTransaction(async (t) => { const s = await t.get(ref); const used = A.usageToday(s.exists ? s.data().usage : null, today); used.plans = Math.max(0, used.plans - 1); t.set(ref, { usage: used }, { merge: true }); }); } catch (e) { /* secondaire */ }
      };
      let plan;
      try { plan = await aiJson(cfg, plus, A.planPrompt(inp, lim), plus ? 6500 : 2800, (j) => A.sanitizePlan(j, lim)); }
      catch (e) { await release(); throw e; }
      const ref2 = db.collection('academy_paths').doc();
      const doc = Object.assign({
        ownerUid: uid, domain: inp.domain, group: inp.group, groupLabel: inp.groupLabel, style: inp.style, topic: inp.topic, level: inp.level, goal: inp.goal, hoursPerWeek: inp.hoursPerWeek, lang: inp.lang,
        completed: [], scores: {}, generated: [], createdAt: now(), updatedAt: now()
      }, plan);
      await ref2.set(doc);
      return { success: true, path: pathFull(Object.assign({ id: ref2.id }, doc)) };
    }

    if (op === 'lesson') {
      const p = await loadPath(uid, body.pathId);
      if (!isLessonId(body.lessonId)) throw new Error('Leçon invalide.');
      let mod = null, meta = null;
      (p.modules || []).forEach((m) => (m.lessons || []).forEach((l) => { if (l.id === body.lessonId) { mod = m; meta = l; } }));
      if (!meta) throw new Error('Leçon introuvable.');
      const lref = db.collection('academy_study_lessons').doc(`${p.id}_${body.lessonId}`);
      const snap = await lref.get();
      let lesson, cached = true;
      if (snap.exists) lesson = snap.data().lesson;
      else {
        cached = false;
        const cfg = await getConfig();
        if (!cfg.enabled) throw new Error('Les auto-études sont momentanément fermées.');
        const uu = await loadUser(uid);
        const plus = isPlusNow(uu);
        checkAccess(cfg, uu, uid, p.domain);
        const release = await reserve(uid, 'lessons');
        try {
          lesson = await aiJson(cfg, plus, A.lessonPrompt(p, mod, meta, { lang: p.lang }), 5200, A.sanitizeLesson);
        } catch (e) { await release(); throw e; }
        if (!lesson.title) lesson.title = meta.title;
        await lref.set({ ownerUid: uid, pathId: p.id, lessonId: body.lessonId, lesson, createdAt: now() });
        await db.collection('academy_paths').doc(p.id).update({ generated: FV().arrayUnion(body.lessonId), lastLessonId: body.lessonId, updatedAt: now() });
      }
      if (cached) await db.collection('academy_paths').doc(p.id).update({ lastLessonId: body.lessonId, updatedAt: now() }).catch(() => {});
      return { success: true, cached, lesson: A.publicLesson(lesson), done: (p.completed || []).includes(body.lessonId), best: p.scores && p.scores[body.lessonId] != null ? p.scores[body.lessonId] : null, note: (p.notes && p.notes[body.lessonId]) || '' };
    }

    if (op === 'quiz') {
      const p = await loadPath(uid, body.pathId);
      if (!isLessonId(body.lessonId)) throw new Error('Leçon invalide.');
      const snap = await db.collection('academy_study_lessons').doc(`${p.id}_${body.lessonId}`).get();
      if (!snap.exists) throw new Error('Ouvre la leçon avant de passer le quiz.');
      const quiz = snap.data().lesson.quiz || [];
      const g = A.gradeStudyQuiz(quiz, body.answers);
      const prev = Number(p.scores && p.scores[body.lessonId]);
      const firstPass = g.passed && !(prev >= L.PASS_MARK);
      await db.collection('academy_paths').doc(p.id).set({ scores: { [body.lessonId]: Math.max(Number.isFinite(prev) ? prev : 0, g.scorePct) }, updatedAt: now() }, { merge: true });
      if (firstPass) await userRef(uid).set({ xp: FV().increment(XP_QUIZ_PASS) }, { merge: true });
      return { success: true, score: g.scorePct, correct: g.correct, total: g.total, passed: g.passed, review: g.review, passMark: L.PASS_MARK, xpGained: firstPass ? XP_QUIZ_PASS : 0 };
    }

    if (op === 'complete') {
      const p = await loadPath(uid, body.pathId);
      if (!isLessonId(body.lessonId)) throw new Error('Leçon invalide.');
      if (!(p.generated || []).includes(body.lessonId)) throw new Error('Ouvre la leçon avant de la terminer.');
      const undo = body.undo === true;
      const already = (p.completed || []).includes(body.lessonId);
      const pref = db.collection('academy_paths').doc(p.id);
      if (undo) {
        if (already) await pref.update({ completed: FV().arrayRemove(body.lessonId), updatedAt: now() });
        return { success: true, done: false };
      }
      if (!already) await pref.update({ completed: FV().arrayUnion(body.lessonId), updatedAt: now() });
      let streak = 0, xpGained = 0;
      if (!already) {
        const today = A.dayKey(Date.now());
        await db.runTransaction(async (t) => {
          const s = await t.get(userRef(uid));
          const u = s.exists ? s.data() : {};
          streak = A.nextStreak(u.streak, u.lastDay, today);
          xpGained = XP_LESSON;
          t.set(userRef(uid), { streak, lastDay: today, xp: (u.xp || 0) + XP_LESSON, lessonsDone: (u.lessonsDone || 0) + 1, updatedAt: now() }, { merge: true });
        });
      }
      const total = p.lessonsTotal || 1, doneCount = (p.completed || []).length + (already ? 0 : 1);
      return { success: true, done: true, streak, xpGained, pathDone: doneCount >= total };
    }

    if (op === 'tutor') {
      const p = await loadPath(uid, body.pathId);
      const msg = A.cleanMultiline(body.message, 1200);
      if (msg.length < 2) throw new Error('Écris ta question.');
      let lesson = null;
      if (isLessonId(body.lessonId)) {
        const s = await db.collection('academy_study_lessons').doc(`${p.id}_${body.lessonId}`).get();
        if (s.exists) lesson = s.data().lesson;
      }
      const cfg = await getConfig();
      if (!cfg.enabled) throw new Error('Les auto-études sont momentanément fermées.');
      const plus = isPlusNow(await loadUser(uid));
      const release = await reserve(uid, 'tutor');
      try {
        const messages = A.normalizeMessages(A.cleanHistory(body.history).concat([{ role: 'user', text: msg }]));
        const reply = await A.callAI({ cfg, isPlus: plus, system: A.tutorPrompt(p, lesson, p.lang), messages, maxTokens: 900, wantJson: false, timeoutMs: 40000 });
        return { success: true, reply: A.cleanMultiline(reply, 4000) };
      } catch (e) { await release(); throw e; }
    }

    if (op === 'subscribe') {
      const cfg = await getConfig();
      const plan = Object.prototype.hasOwnProperty.call(A.PLUS_PLANS, body.plan) ? body.plan : 'month';
      const price = cfg[A.PLAN_PRICE_KEY[plan]], days = A.PLUS_PLANS[plan];
      if (!(price > 0)) throw new Error("Cette formule Académie Plus n'est pas disponible pour le moment.");
      const out = await charge(uid, price, `Académie Plus — ${days} jours`, `Académie Plus vendu — ${days} jours`, (u) => ({ plusUntilMs: Math.max(Date.now(), Number(u.plusUntilMs) || 0) + days * 86400000 }));
      return { success: true, untilMs: out.patch.plusUntilMs, newBalance: out.newBalance };
    }

    // Notes personnelles de l'eleve sur une lecon (aucune IA, aucun quota)
    if (op === 'note') {
      const p = await loadPath(uid, body.pathId);
      if (!isLessonId(body.lessonId)) throw new Error('Leçon invalide.');
      const text = A.cleanMultiline(body.text, 2000);
      await db.collection('academy_paths').doc(p.id).set({ notes: { [body.lessonId]: text }, updatedAt: now() }, { merge: true });
      return { success: true };
    }

    // Revision : toutes les flashcards des lecons deja ouvertes du parcours (aucune IA, aucun quota)
    if (op === 'review') {
      const p = await loadPath(uid, body.pathId);
      const snap = await db.collection('academy_study_lessons').where('pathId', '==', p.id).limit(80).get();
      const cards = [];
      snap.docs.forEach((d) => {
        const l = d.data().lesson || {};
        (l.flashcards || []).forEach((c) => cards.push({ front: c.front, back: c.back, lesson: l.title || '' }));
      });
      return { success: true, cards: cards.slice(0, 200) };
    }

    if (op === 'unlock') {
      const cfg = await getConfig();
      const id = body.domain;
      if (!A.DOMAIN_IDS.includes(id)) throw new Error('Catégorie inconnue.');
      const acc = cfg.domainAccess[id];
      if (acc.enabled === false || acc.mode !== 'paid' || !(acc.price > 0)) throw new Error("Cette catégorie n'est pas à débloquer.");
      const label = (A.CATALOG.findCategory(id) || { label: { fr: id } }).label.fr;
      const out = await charge(uid, acc.price, `Académie — ${label} (${acc.days} jours)`, `Catégorie débloquée — ${label}`, (u) => {
        const cur = Number(u.unlocks && u.unlocks[id]) || 0;
        return { unlocks: Object.assign({}, u.unlocks || {}, { [id]: Math.max(Date.now(), cur) + acc.days * 86400000 }) };
      });
      return { success: true, untilMs: out.patch.unlocks[id], newBalance: out.newBalance };
    }

    throw new Error('Opération inconnue.');
  }

  return { study, getConfig };
}

module.exports = { createAcademyStudy, isLessonId };
