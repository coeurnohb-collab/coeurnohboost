// api/_lib/academy-extras.js
// Academie : quiz de chapitre, certificats, packs de cours, documents de cours.
// Branche dans api/payments-actions.js (aucune nouvelle fonction serverless : limite de 12).
// Toutes les collections ci-dessous sont ECRITES PAR LE SERVEUR SEULEMENT : aucune regle Firestore a ouvrir.
//   academy_quizzes/{courseId}      questions ET bonnes reponses (jamais envoyees a l'eleve)
//   academy_progress/{courseId_uid} meilleurs scores de l'eleve
//   academy_certificates/{courseId_uid}, academy_cert_codes/{code}
//   academy_packs/{packId}
//   academy_resources/{courseId}    documents du cours (visibles par les inscrits)
const L = require('./academy-learning');

function createAcademyExtras({ db, admin, ADMIN_UID, buildWalletTxEntry, commissionPercent, randomBytes, push }) {
  const FV = () => admin.firestore.FieldValue;
  const now = () => new Date().toISOString();
  const r2 = (x) => Math.round(x * 100) / 100;

  async function loadCourse(courseId) {
    if (!L.isItemId(courseId)) throw new Error('Cours invalide.');
    const snap = await db.collection('courses').doc(courseId).get();
    if (!snap.exists) throw new Error("Ce cours n'existe plus.");
    return Object.assign({ id: courseId }, snap.data());
  }
  async function isEnrolled(courseId, uid) {
    return (await db.collection('course_enrollments').doc(`${courseId}_${uid}`).get()).exists;
  }
  const chapterIdsOf = (course) => (course.chapters || []).map((c) => c.id).filter(L.isChapterId);

  /* ======================= QUIZ ======================= */
  async function quiz(uid, body) {
    const { op } = body;
    const course = await loadCourse(body.courseId);
    const isOwner = course.ownerUid === uid;
    const qRef = db.collection('academy_quizzes').doc(course.id);
    const pRef = db.collection('academy_progress').doc(`${course.id}_${uid}`);

    if (op === 'save') {
      if (!isOwner) throw new Error('Seul le formateur peut modifier les quiz.');
      if (!chapterIdsOf(course).includes(body.chapterId)) throw new Error('Chapitre introuvable.');
      const empty = Array.isArray(body.questions) && body.questions.length === 0;
      if (empty) {
        await qRef.set({ ownerUid: uid, chapters: { [body.chapterId]: FV().delete() }, updatedAt: now() }, { merge: true });
        return { success: true, removed: true };
      }
      const questions = L.sanitizeQuestions(body.questions);
      await qRef.set({ ownerUid: uid, chapters: { [body.chapterId]: { questions } }, updatedAt: now() }, { merge: true });
      return { success: true, count: questions.length };
    }

    if (op === 'final_save') {
      if (!isOwner) throw new Error("Seul le formateur peut modifier l'examen final.");
      if (Array.isArray(body.questions) && body.questions.length === 0) {
        await qRef.set({ ownerUid: uid, final: FV().delete(), updatedAt: now() }, { merge: true });
        return { success: true, removed: true };
      }
      const questions = L.sanitizeQuestions(body.questions, L.MAX_FINAL_QUESTIONS);
      if (questions.length < 5) throw new Error("L'examen final doit contenir au moins 5 questions.");
      await qRef.set({ ownerUid: uid, final: { questions }, updatedAt: now() }, { merge: true });
      return { success: true, count: questions.length };
    }

    const qSnap = await qRef.get();
    const qData = qSnap.exists ? qSnap.data() : {};
    const chapters = qData.chapters || {};
    const finalQs = (qData.final && Array.isArray(qData.final.questions)) ? qData.final.questions : [];
    const valid = new Set(chapterIdsOf(course));

    if (op === 'final_get') {
      if (!finalQs.length) throw new Error("Ce cours n'a pas d'examen final.");
      if (!isOwner && !(await isEnrolled(course.id, uid))) throw new Error("Inscris-toi au cours pour passer l'examen.");
      return { success: true, passMark: L.PASS_MARK, questions: finalQs.map((x) => (isOwner ? x : { q: x.q, options: x.options })) };
    }
    if (op === 'final_submit') {
      if (isOwner) throw new Error("Le formateur ne passe pas son propre examen.");
      if (!finalQs.length) throw new Error("Ce cours n'a pas d'examen final.");
      if (!(await isEnrolled(course.id, uid))) throw new Error("Inscris-toi au cours pour passer l'examen.");
      const g = L.gradeQuiz(finalQs, body.answers);
      const pSnap = await pRef.get();
      const pd = pSnap.exists ? pSnap.data() : {};
      const best = Math.max(Number(pd.finalScore) || 0, g.scorePct);
      const attempts = (Number(pd.finalAttempts) || 0) + 1;
      await pRef.set({ courseId: course.id, uid, finalScore: best, finalAttempts: attempts, updatedAt: now() }, { merge: true });
      return { success: true, score: g.scorePct, best, attempts, correct: g.correct, total: g.total, passed: g.passed, wrong: g.wrong, passMark: L.PASS_MARK, review: L.buildReview(finalQs, body.answers) };
    }

    if (op === 'info') {
      const pSnap = isOwner ? null : await pRef.get();
      const pd = (pSnap && pSnap.exists && pSnap.data()) || {};
      const scores = pd.scores || {};
      const attempts = pd.attempts || {};
      const out = {};
      Object.keys(chapters).forEach((id) => {
        if (!valid.has(id) || !chapters[id] || !Array.isArray(chapters[id].questions)) return;
        out[id] = { count: chapters[id].questions.length, best: scores[id] != null ? Number(scores[id]) : null, attempts: Number(attempts[id]) || 0 };
      });
      return {
        success: true, passMark: L.PASS_MARK, quizzes: out,
        final: finalQs.length ? { count: finalQs.length, best: pd.finalScore != null ? Number(pd.finalScore) : null, attempts: Number(pd.finalAttempts) || 0 } : null
      };
    }

    if (!L.isChapterId(body.chapterId) || !chapters[body.chapterId] || !valid.has(body.chapterId)) throw new Error("Ce chapitre n'a pas de quiz.");
    const questions = chapters[body.chapterId].questions || [];

    if (op === 'get') {
      if (!isOwner && !(await isEnrolled(course.id, uid))) throw new Error('Inscris-toi au cours pour passer le quiz.');
      return {
        success: true, passMark: L.PASS_MARK,
        questions: questions.map((x) => (isOwner ? x : { q: x.q, options: x.options }))
      };
    }

    if (op === 'submit') {
      if (isOwner) throw new Error('Le formateur ne passe pas son propre quiz.');
      if (!(await isEnrolled(course.id, uid))) throw new Error('Inscris-toi au cours pour passer le quiz.');
      const g = L.gradeQuiz(questions, body.answers);
      const pSnap = await pRef.get();
      const pd = pSnap.exists ? pSnap.data() : {};
      const prev = (pd.scores && Number(pd.scores[body.chapterId])) || 0;
      const attempts = ((pd.attempts && Number(pd.attempts[body.chapterId])) || 0) + 1;
      const best = Math.max(prev, g.scorePct);
      await pRef.set({ courseId: course.id, uid, scores: { [body.chapterId]: best }, attempts: { [body.chapterId]: attempts }, updatedAt: now() }, { merge: true });
      return { success: true, score: g.scorePct, best, attempts, correct: g.correct, total: g.total, passed: g.passed, wrong: g.wrong, passMark: L.PASS_MARK, review: L.buildReview(questions, body.answers) };
    }
    throw new Error('Opération inconnue.');
  }


  /* ======================= QUESTIONS / REPONSES AU FORMATEUR ======================= */
  const cleanText = (v, min, max, label) => {
    const t = typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, ' ').trim() : '';
    if (t.length < min || t.length > max) throw new Error(`${label} : entre ${min} et ${max} caractères.`);
    return t;
  };
  async function qa(uid, body) {
    const { op } = body;
    const course = await loadCourse(body.courseId);
    const isOwner = course.ownerUid === uid || uid === ADMIN_UID;
    if (!isOwner && !(await isEnrolled(course.id, uid))) throw new Error('Inscris-toi au cours pour poser une question.');
    const col = db.collection('academy_qa');

    if (op === 'list') {
      const snap = await col.where('courseId', '==', course.id).limit(200).get();
      const items = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 60)
        .map((x) => ({ id: x.id, name: x.name || 'Étudiant', mine: x.uid === uid, chapterTitle: x.chapterTitle || '', text: x.text, createdAt: x.createdAt, answer: x.answer || '', answeredAt: x.answeredAt || null }));
      return { success: true, isOwner, items, pending: items.filter((x) => !x.answer).length };
    }
    if (op === 'ask') {
      if (course.ownerUid === uid) throw new Error('Tu es le formateur : réponds plutôt aux questions.');
      const text = cleanText(body.text, 5, 500, 'Question');
      const mine = await col.where('courseId', '==', course.id).where('uid', '==', uid).limit(100).get();
      const open = mine.docs.filter((d) => !d.data().answer).length;
      if (open >= 5) throw new Error('Tu as déjà 5 questions en attente. Attends la réponse du formateur.');
      const uSnap = await db.collection('users').doc(uid).get();
      const chapter = (course.chapters || []).find((c) => c.id === body.chapterId);
      const ref = col.doc();
      await ref.set({ courseId: course.id, uid, name: (uSnap.exists && uSnap.data().name) || 'Étudiant', ownerUid: course.ownerUid || null, chapterTitle: chapter ? String(chapter.title || '').slice(0, 80) : '', text, createdAt: now(), answer: '' });
      if (push && course.ownerUid) { try { await push(course.ownerUid, 'Nouvelle question', `${text.slice(0, 80)} — "${course.title}"`); } catch (e) { /* secondaire */ } }
      return { success: true, id: ref.id };
    }
    if (op === 'answer') {
      if (!isOwner) throw new Error('Seul le formateur peut répondre.');
      const text = cleanText(body.text, 2, 1500, 'Réponse');
      if (typeof body.id !== 'string' || body.id.length > 40) throw new Error('Question invalide.');
      const ref = col.doc(body.id); const snap = await ref.get();
      if (!snap.exists || snap.data().courseId !== course.id) throw new Error('Question introuvable.');
      await ref.update({ answer: text, answeredAt: now(), answeredBy: uid });
      if (push && snap.data().uid) { try { await push(snap.data().uid, 'Le formateur a répondu', `"${course.title}"`); } catch (e) { /* secondaire */ } }
      return { success: true };
    }
    if (op === 'delete') {
      if (typeof body.id !== 'string' || body.id.length > 40) throw new Error('Question invalide.');
      const ref = col.doc(body.id); const snap = await ref.get();
      if (!snap.exists || snap.data().courseId !== course.id) throw new Error('Question introuvable.');
      if (!isOwner && snap.data().uid !== uid) throw new Error('Action non autorisée.');
      await ref.delete();
      return { success: true };
    }
    throw new Error('Opération inconnue.');
  }

  /* ======================= CERTIFICATS ======================= */
  async function certStatusData(course, uid) {
    const [enrSnap, pSnap, qSnap, cSnap] = await Promise.all([
      db.collection('course_enrollments').doc(`${course.id}_${uid}`).get(),
      db.collection('academy_progress').doc(`${course.id}_${uid}`).get(),
      db.collection('academy_quizzes').doc(course.id).get(),
      db.collection('academy_certificates').doc(`${course.id}_${uid}`).get()
    ]);
    const chapterIds = chapterIdsOf(course);
    const chapters = (qSnap.exists && qSnap.data().chapters) || {};
    const quizChapterIds = chapterIds.filter((id) => chapters[id] && Array.isArray(chapters[id].questions) && chapters[id].questions.length > 0);
    const fin = qSnap.exists && qSnap.data().final && Array.isArray(qSnap.data().final.questions) && qSnap.data().final.questions.length > 0;
    const el = L.certEligibility({
      chapterIds, completed: enrSnap.exists ? enrSnap.data().completedChapters : [],
      quizChapterIds, scores: pSnap.exists ? pSnap.data().scores : {},
      finalExists: fin, finalScore: pSnap.exists ? pSnap.data().finalScore : null
    });
    return { enrolled: enrSnap.exists, el, cert: cSnap.exists ? cSnap.data() : null, quizChapterIds };
  }

  async function cert(uid, body) {
    const { op } = body;

    if (op === 'verify') {
      const code = L.normalizeCertCode(body.code);
      if (!code) throw new Error('Code de certificat invalide.');
      const cSnap = await db.collection('academy_cert_codes').doc(code).get();
      if (!cSnap.exists) throw new Error('Aucun certificat ne correspond à ce code.');
      const c = (await db.collection('academy_certificates').doc(cSnap.data().certId).get());
      if (!c.exists) throw new Error('Aucun certificat ne correspond à ce code.');
      const d = c.data();
      return { success: true, valid: true, code, studentName: d.studentName, courseTitle: d.courseTitle, ownerName: d.ownerName, issuedAt: d.issuedAt, quizAvg: d.quizAvg == null ? null : d.quizAvg };
    }

    if (op === 'mine') {
      const snap = await db.collection('academy_certificates').where('studentUid', '==', uid).limit(50).get();
      return { success: true, certificates: snap.docs.map((d) => { const x = d.data(); return { code: x.code, courseId: x.courseId, courseTitle: x.courseTitle, ownerName: x.ownerName, studentName: x.studentName, issuedAt: x.issuedAt, quizAvg: x.quizAvg == null ? null : x.quizAvg }; }) };
    }

    const course = await loadCourse(body.courseId);
    const price = L.cleanCertPrice(course.certificatePrice);
    const enabled = course.certificateEnabled === true;

    if (op === 'status') {
      const s = await certStatusData(course, uid);
      return { success: true, enabled, price, enrolled: s.enrolled, progress: s.el, certificate: s.cert ? { code: s.cert.code, issuedAt: s.cert.issuedAt } : null };
    }

    if (op === 'issue') {
      if (!enabled) throw new Error("Ce cours ne délivre pas de certificat.");
      if (course.ownerUid === uid) throw new Error('Le formateur ne peut pas se délivrer un certificat.');
      const code = L.makeCertCode(randomBytes);
      const certRef = db.collection('academy_certificates').doc(`${course.id}_${uid}`);
      const codeRef = db.collection('academy_cert_codes').doc(code);
      const studentRef = db.collection('users').doc(uid);
      const ownerUid = course.ownerUid;
      const regularOwner = ownerUid && ownerUid !== ADMIN_UID;
      const adminRef = db.collection('users').doc(ADMIN_UID);

      const result = await db.runTransaction(async (t) => {
        const [existing, codeSnap, enrSnap, pSnap, qSnap, stuSnap] = await Promise.all([
          t.get(certRef), t.get(codeRef), t.get(db.collection('course_enrollments').doc(`${course.id}_${uid}`)),
          t.get(db.collection('academy_progress').doc(`${course.id}_${uid}`)), t.get(db.collection('academy_quizzes').doc(course.id)), t.get(studentRef)
        ]);
        if (existing.exists) return { already: true, code: existing.data().code };
        if (codeSnap.exists) throw new Error('Réessaie dans un instant.');
        if (!enrSnap.exists) throw new Error('Inscris-toi au cours pour obtenir le certificat.');
        if (!stuSnap.exists) throw new Error('Compte introuvable.');

        const chapterIds = chapterIdsOf(course);
        const chapters = (qSnap.exists && qSnap.data().chapters) || {};
        const quizChapterIds = chapterIds.filter((id) => chapters[id] && Array.isArray(chapters[id].questions) && chapters[id].questions.length > 0);
        const fin = qSnap.exists && qSnap.data().final && Array.isArray(qSnap.data().final.questions) && qSnap.data().final.questions.length > 0;
        const el = L.certEligibility({ chapterIds, completed: enrSnap.data().completedChapters, quizChapterIds, scores: pSnap.exists ? pSnap.data().scores : {}, finalExists: fin, finalScore: pSnap.exists ? pSnap.data().finalScore : null });
        if (!el.eligible) throw new Error("Termine tous les chapitres, réussis les quiz et l'examen final pour obtenir le certificat.");

        // lectures du paiement AVANT toute ecriture
        let ownerSnap = null, adminSnap = null;
        if (price > 0) {
          if ((stuSnap.data().balance || 0) < price) throw new Error('Solde insuffisant. Recharge ton portefeuille pour obtenir le certificat.');
          if (regularOwner) ownerSnap = await t.get(db.collection('users').doc(ownerUid));
          if (uid !== ADMIN_UID) adminSnap = await t.get(adminRef);
        }

        if (price > 0) {
          const newStu = r2((stuSnap.data().balance || 0) - price);
          t.update(studentRef, { balance: newStu });
          t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'course_enrollment', amount: -price, balanceAfter: newStu, description: `Certificat — "${course.title}"`, relatedId: course.id }));
          const ownerPays = regularOwner && ownerSnap && ownerSnap.exists;
          const ownerPart = ownerPays ? r2(price * (1 - commissionPercent / 100)) : 0;
          const adminPart = r2(price - ownerPart);
          if (ownerPays) {
            const nb = r2((ownerSnap.data().balance || 0) + ownerPart);
            t.update(db.collection('users').doc(ownerUid), { balance: nb });
            t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: ownerUid, type: 'course_income', amount: ownerPart, balanceAfter: nb, description: `Certificat délivré — "${course.title}"`, relatedId: course.id }));
          }
          if (adminSnap && adminSnap.exists && adminPart > 0) {
            const nb = r2((adminSnap.data().balance || 0) + adminPart);
            t.update(adminRef, { balance: nb });
            t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: ADMIN_UID, type: ownerPays ? 'commission_income' : 'course_income', amount: adminPart, balanceAfter: nb, description: ownerPays ? `Commission certificat — "${course.title}"` : `Certificat délivré — "${course.title}"`, relatedId: course.id }));
          }
        }

        const doc = {
          code, courseId: course.id, courseTitle: course.title || '', studentUid: uid, studentName: stuSnap.data().name || 'Étudiant',
          ownerUid: ownerUid || null, ownerName: course.ownerName || '', issuedAt: now(), quizAvg: el.quizAvg, pricePaid: price
        };
        t.set(certRef, doc);
        t.set(codeRef, { certId: certRef.id, createdAt: now() });
        return { already: false, code, ownerPart: regularOwner ? r2(price * (1 - commissionPercent / 100)) : 0 };
      });

      if (!result.already && result.ownerPart > 0 && push) {
        try { await push(ownerUid, 'Certificat délivré', `+${result.ownerPart.toFixed(2)}$ sur ton solde.`); } catch (e) { /* secondaire */ }
      }
      return { success: true, code: result.code, already: !!result.already };
    }
    throw new Error('Opération inconnue.');
  }

  /* ======================= PACKS DE COURS ======================= */
  async function pack(uid, body) {
    const { op } = body;
    const col = db.collection('academy_packs');

    if (op === 'for_course') {
      if (!L.isItemId(body.courseId)) throw new Error('Cours invalide.');
      const snap = await col.where('courseIds', 'array-contains', body.courseId).limit(10).get();
      return { success: true, packs: snap.docs.filter((d) => d.data().active !== false).map((d) => { const x = d.data(); return { id: d.id, title: x.title, packPrice: x.packPrice, listTotal: x.listTotal, count: x.courseIds.length, ownerUid: x.ownerUid }; }) };
    }
    if (op === 'mine') {
      const snap = await col.where('ownerUid', '==', uid).limit(L.MAX_PACKS_PER_OWNER + 5).get();
      return { success: true, packs: snap.docs.map((d) => { const x = d.data(); return { id: d.id, title: x.title, packPrice: x.packPrice, listTotal: x.listTotal, courseIds: x.courseIds, active: x.active !== false }; }) };
    }

    if (op === 'create') {
      const p = L.sanitizePackInput(body);
      const mine = await col.where('ownerUid', '==', uid).limit(L.MAX_PACKS_PER_OWNER + 1).get();
      if (mine.size >= L.MAX_PACKS_PER_OWNER) throw new Error(`Maximum ${L.MAX_PACKS_PER_OWNER} packs.`);
      const snaps = await Promise.all(p.courseIds.map((id) => db.collection('courses').doc(id).get()));
      let listTotal = 0;
      snaps.forEach((s) => {
        if (!s.exists) throw new Error("Un des cours n'existe plus.");
        const c = s.data();
        if (c.ownerUid !== uid) throw new Error('Tu ne peux mettre dans un pack que tes propres cours.');
        if (c.status !== 'active') throw new Error('Tous les cours du pack doivent être actifs.');
        if (!(Number(c.price) > 0)) throw new Error('Tous les cours du pack doivent être payants.');
        listTotal = r2(listTotal + Number(c.price));
      });
      if (p.packPrice >= listTotal) throw new Error(`Le prix du pack doit être inférieur à la somme des cours (${listTotal.toFixed(2)} $).`);
      const ref = col.doc();
      const ownerName = (snaps[0].data().ownerName) || '';
      await ref.set({ ownerUid: uid, ownerName, title: p.title, courseIds: p.courseIds, packPrice: p.packPrice, listTotal, active: true, salesCount: 0, createdAt: now() });
      return { success: true, id: ref.id, listTotal };
    }

    if (!L.isItemId(body.packId)) throw new Error('Pack invalide.');
    const packRef = col.doc(body.packId);

    if (op === 'delete') {
      const s = await packRef.get();
      if (!s.exists || s.data().ownerUid !== uid) throw new Error('Pack introuvable.');
      await packRef.delete();
      return { success: true };
    }

    if (op === 'buy') {
      const studentRef = db.collection('users').doc(uid);
      const adminRef = db.collection('users').doc(ADMIN_UID);
      const result = await db.runTransaction(async (t) => {
        const pSnap = await t.get(packRef);
        if (!pSnap.exists || pSnap.data().active === false) throw new Error("Ce pack n'est plus disponible.");
        const pk = pSnap.data();
        if (pk.ownerUid === uid) throw new Error('Tu ne peux pas acheter ton propre pack.');
        const courseRefs = pk.courseIds.map((id) => db.collection('courses').doc(id));
        const enrRefs = pk.courseIds.map((id) => db.collection('course_enrollments').doc(`${id}_${uid}`));
        const ownerRef = db.collection('users').doc(pk.ownerUid);
        const reads = await Promise.all([...courseRefs.map((r) => t.get(r)), ...enrRefs.map((r) => t.get(r)), t.get(studentRef), t.get(ownerRef), uid !== ADMIN_UID ? t.get(adminRef) : Promise.resolve(null)]);
        const n = pk.courseIds.length;
        const cSnaps = reads.slice(0, n), eSnaps = reads.slice(n, 2 * n);
        const stuSnap = reads[2 * n], ownerSnap = reads[2 * n + 1], adminSnap = reads[2 * n + 2];

        const courses = cSnaps.map((s) => { if (!s.exists) throw new Error("Un cours du pack n'existe plus."); return s.data(); });
        courses.forEach((c) => { if (c.status !== 'active' || c.ownerUid !== pk.ownerUid || !(Number(c.price) > 0)) throw new Error("Ce pack n'est plus valable."); });
        const already = eSnaps.findIndex((s) => s.exists);
        if (already >= 0) throw new Error(`Tu es déjà inscrit(e) à « ${courses[already].title} ». Achète les autres cours séparément.`);
        if (!stuSnap.exists) throw new Error('Compte introuvable.');

        const prices = courses.map((c) => Number(c.price));
        const listTotal = r2(prices.reduce((s, x) => s + x, 0));
        const price = Math.min(r2(pk.packPrice), listTotal);          // jamais plus cher que les cours separes
        if ((stuSnap.data().balance || 0) < price) throw new Error('Solde insuffisant. Recharge ton portefeuille pour acheter ce pack.');

        const shares = L.allocatePack(price, prices);
        const ownerPays = ownerSnap && ownerSnap.exists && pk.ownerUid !== ADMIN_UID;
        const ownerPart = ownerPays ? r2(price * (1 - commissionPercent / 100)) : 0;
        const adminPart = r2(price - ownerPart);

        const newStu = r2((stuSnap.data().balance || 0) - price);
        t.update(studentRef, { balance: newStu });
        t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid, type: 'course_enrollment', amount: -price, balanceAfter: newStu, description: `Pack — "${pk.title}"`, relatedId: packRef.id }));
        if (ownerPays) {
          const nb = r2((ownerSnap.data().balance || 0) + ownerPart);
          t.update(ownerRef, { balance: nb });
          t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: pk.ownerUid, type: 'course_income', amount: ownerPart, balanceAfter: nb, description: `Pack vendu — "${pk.title}"`, relatedId: packRef.id }));
        }
        if (adminSnap && adminSnap.exists && adminPart > 0) {
          const nb = r2((adminSnap.data().balance || 0) + adminPart);
          t.update(adminRef, { balance: nb });
          t.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({ uid: ADMIN_UID, type: ownerPays ? 'commission_income' : 'course_income', amount: adminPart, balanceAfter: nb, description: ownerPays ? `Commission pack — "${pk.title}"` : `Pack vendu — "${pk.title}"`, relatedId: packRef.id }));
        }
        courseRefs.forEach((r, i) => {
          t.update(r, { studentsCount: FV().increment(1) });
          t.set(enrRefs[i], { courseId: r.id, courseTitle: courses[i].title || '', courseOwnerUid: pk.ownerUid, studentUid: uid, studentName: stuSnap.data().name || 'Utilisateur', completedChapters: [], amountPaid: shares[i], packId: packRef.id, createdAt: now() });
        });
        t.update(packRef, { salesCount: FV().increment(1) });
        return { price, ownerUid: pk.ownerUid, ownerPart, title: pk.title, newBalance: newStu };
      });
      if (result.ownerPart > 0 && push) { try { await push(result.ownerUid, 'Pack vendu', `+${result.ownerPart.toFixed(2)}$ sur ton solde.`); } catch (e) { /* secondaire */ } }
      return { success: true, newBalance: result.newBalance, price: result.price };
    }
    throw new Error('Opération inconnue.');
  }

  /* ======================= DOCUMENTS DE COURS ======================= */
  async function resources(uid, body) {
    const { op } = body;
    const course = await loadCourse(body.courseId);
    const isOwner = course.ownerUid === uid;
    const ref = db.collection('academy_resources').doc(course.id);

    if (op === 'list') {
      if (!isOwner && !(await isEnrolled(course.id, uid))) throw new Error('Inscris-toi au cours pour accéder aux documents.');
      const s = await ref.get();
      return { success: true, files: (s.exists && s.data().files) || [] };
    }
    if (!isOwner) throw new Error('Seul le formateur peut gérer les documents.');

    if (op === 'add') {
      if (!L.isCloudinaryUrl(body.url)) throw new Error('Envoie le document avec le bouton prévu (lien non accepté).');
      // Cloudinary refuse par defaut de servir les PDF / ZIP (erreur 401) : on le detecte ici, avant d'enregistrer un document illisible.
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
        const head = await fetch(body.url, { method: 'HEAD', signal: ctl.signal }); clearTimeout(tm);
        if (head.status === 401 || head.status === 403) {
          throw new Error("Cloudinary refuse de servir ce fichier (erreur " + head.status + "). Dans Cloudinary : Settings > Security > coche « PDF and ZIP files delivery », puis réessaie.");
        }
      } catch (e) { if (/Cloudinary refuse/.test(e.message)) throw e; /* réseau : on laisse passer */ }
      const name = L.cleanFileName(body.name);
      const size = Math.max(0, Math.min(2e9, Math.round(Number(body.size) || 0)));
      const added = await db.runTransaction(async (t) => {
        const s = await t.get(ref);
        const files = (s.exists && s.data().files) || [];
        if (files.length >= L.MAX_RESOURCES_PER_COURSE) throw new Error(`Maximum ${L.MAX_RESOURCES_PER_COURSE} documents par cours.`);
        const file = { id: randomBytes(6).toString('hex'), name, url: body.url, size, addedAt: now() };
        t.set(ref, { ownerUid: uid, files: files.concat([file]), updatedAt: now() });
        return file;
      });
      return { success: true, file: added };
    }
    if (op === 'remove') {
      await db.runTransaction(async (t) => {
        const s = await t.get(ref);
        const files = (s.exists && s.data().files) || [];
        t.set(ref, { ownerUid: uid, files: files.filter((f) => f.id !== body.fileId), updatedAt: now() });
      });
      return { success: true };
    }
    throw new Error('Opération inconnue.');
  }

  /* ======================= ETUDIANTS D'UN COURS ======================= */
  // Lu par le serveur : ne depend d'aucune regle Firestore (le navigateur n'a pas le droit de lister les inscriptions des autres).
  async function students(uid, body) {
    const course = await loadCourse(body.courseId);
    if (course.ownerUid !== uid && uid !== ADMIN_UID) throw new Error('Seul le formateur peut voir ses étudiants.');
    const [enr, prog, certs] = await Promise.all([
      db.collection('course_enrollments').where('courseId', '==', course.id).limit(500).get(),
      db.collection('academy_progress').where('courseId', '==', course.id).limit(500).get().catch(() => ({ docs: [] })),
      db.collection('academy_certificates').where('courseId', '==', course.id).limit(500).get().catch(() => ({ docs: [] }))
    ]);
    const certSet = new Set(certs.docs.map((d) => d.data().studentUid));
    const progBy = {};
    prog.docs.forEach((d) => { const x = d.data(); if (x.uid) progBy[x.uid] = x; });
    const total = chapterIdsOf(course).length || (course.chapters || []).length || 1;
    let paid = 0, progressSum = 0, finished = 0;
    const list = enr.docs.map((d) => {
      const x = d.data();
      const done = Array.isArray(x.completedChapters) ? x.completedChapters.length : 0;
      const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
      paid = r2(paid + (Number(x.amountPaid) || 0));
      progressSum += pct; if (pct >= 100) finished++;
      return { name: String(x.studentName || 'Étudiant').slice(0, 60), progress: pct, doneChapters: done, paid: Number(x.amountPaid) || 0, joinedAt: x.createdAt || '', certificate: certSet.has(x.studentUid),
        quizAvg: (() => { const sc = Object.values((progBy[x.studentUid] || {}).scores || {}).map(Number).filter(Number.isFinite); return sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null; })(),
        finalScore: progBy[x.studentUid] && progBy[x.studentUid].finalScore != null ? Number(progBy[x.studentUid].finalScore) : null };
    });
    list.sort((a, b) => String(b.joinedAt).localeCompare(String(a.joinedAt)));
    return { success: true, course: { title: course.title || '', chapters: total, price: Number(course.price) || 0 }, stats: { count: list.length, avgProgress: list.length ? Math.round(progressSum / list.length) : 0, finished, revenue: paid, certificates: certSet.size }, students: list };
  }

  return { quiz, cert, pack, resources, students, qa };
}

module.exports = { createAcademyExtras };
