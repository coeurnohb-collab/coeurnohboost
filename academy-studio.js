/* =====================================================================
   academy-studio.js — Académie : quiz, certificats, documents, packs, design
   Chargé par stability.js après script.js. Enveloppe l'ouverture d'un cours et
   les onglets de l'Académie ; n'écrase rien. Tout ce qui touche à l'argent, aux
   notes et aux certificats est décidé par le SERVEUR (api/payments-actions.js).
   ===================================================================== */
(function () {
  'use strict';
  if (window.__cnAcademyStudio) return;
  window.__cnAcademyStudio = true;

  var TXT = {
    fr: { heroT: 'Apprends. Progresse. Réussis.', heroS: 'Cours, livres, auto-études guidées, quiz et certificats : tout pour apprendre sérieusement, à ton rythme.', chip1: 'Certificats vérifiables', chip2: 'Auto-études guidées', chip3: 'Quiz et documents',
      quizOwn: 'Quiz du chapitre', quizPlay: 'Passer le quiz', quizBest: 'Meilleur score : {n} %', quizEdTitle: 'Quiz du chapitre', qQ: 'Question', qOpt: 'Réponse {n}', qOk: 'Bonne', qAdd: 'Ajouter une question', qSave: 'Enregistrer le quiz', qSaved: 'Quiz enregistré', qDel: 'Retirer', qSubmit: 'Valider mes réponses', qPass: 'Réussi ! Score : {n} %', qFail: 'Score : {n} %. Il faut {m} % pour valider. Réessaie !', qClose: 'Fermer', qEmptyHint: 'Aucune question pour le moment. Ajoute-en une.', qAnswerAll: 'Réponds à toutes les questions.',
      cTitle: 'Certificat de réussite', cEnable: 'Délivrer un certificat à la fin du cours', cPrice: 'Prix du certificat en $ (0 = gratuit)', cSaved: 'Réglages enregistrés', cProg: 'Chapitres {a}/{b} · Quiz {c}/{d}', cGet: 'Obtenir mon certificat', cGetPaid: 'Obtenir mon certificat — {p} $', cView: 'Voir mon certificat', cConfirm: 'Obtenir le certificat pour {p} $ ? Ce montant sera débité de ton portefeuille.', cMine: 'Mes certificats', cNone: 'Aucun certificat pour le moment.', cVerify: 'Vérifier un certificat', cCode: 'Code CNU-XXXX-XXXX-XXXX', cOkTitle: 'Certificat authentique', cInvalid: 'Aucun certificat ne correspond à ce code.', cHead: 'CERTIFICAT DE RÉUSSITE', cGiven: 'est décerné à', cFor: 'pour avoir terminé avec succès la formation', cBy: 'Formateur', cDate: 'Délivré le', cAvg: 'Moyenne aux quiz', cPrint: 'Imprimer / Enregistrer en PDF', cLink: 'Copier le lien de vérification', cCopied: 'Lien copié', cCheck: 'Vérifier',
      dTitle: 'Documents du cours', dAdd: 'Ajouter un document', dUp: 'Envoi en cours...', dNone: 'Aucun document pour le moment.', dOpen: 'Ouvrir', dDel: 'Supprimer', dDone: 'Document ajouté', dHelp: 'PDF, Word, Excel, image... (50 Mo max)',
      pTitle: 'Pack de cours', pBuy: 'Acheter le pack — {p} $', pSave: 'Au lieu de {l} $ : tu économises {s} $. {n} cours inclus.', pConfirm: 'Acheter ce pack pour {p} $ ? Tu seras inscrit(e) à {n} cours.', pBought: 'Pack acheté, bon apprentissage !', pMy: 'Mes packs de cours', pCreate: 'Créer un pack', pName: 'Nom du pack', pPriceL: 'Prix du pack ($)', pPick: 'Choisis au moins 2 de tes cours payants :', pNone: 'Aucun pack pour le moment.', pCreated: 'Pack créé', pDel: 'Supprimer', pInfo: '{n} cours · valeur {v} $', pNeed: 'Il faut au moins 2 cours payants actifs pour créer un pack.', fail: 'Action impossible pour le moment.' },
    en: { heroT: 'Learn. Progress. Succeed.', heroS: 'Courses, books, guided self-study, quizzes and certificates: everything to learn seriously, at your own pace.', chip1: 'Verifiable certificates', chip2: 'Guided self-study', chip3: 'Quizzes and documents',
      quizOwn: 'Chapter quiz', quizPlay: 'Take the quiz', quizBest: 'Best score: {n} %', quizEdTitle: 'Chapter quiz', qQ: 'Question', qOpt: 'Answer {n}', qOk: 'Right', qAdd: 'Add a question', qSave: 'Save quiz', qSaved: 'Quiz saved', qDel: 'Remove', qSubmit: 'Submit my answers', qPass: 'Passed! Score: {n} %', qFail: 'Score: {n} %. You need {m} % to pass. Try again!', qClose: 'Close', qEmptyHint: 'No questions yet. Add one.', qAnswerAll: 'Answer every question.',
      cTitle: 'Certificate of completion', cEnable: 'Issue a certificate at the end of the course', cPrice: 'Certificate price in $ (0 = free)', cSaved: 'Settings saved', cProg: 'Chapters {a}/{b} · Quizzes {c}/{d}', cGet: 'Get my certificate', cGetPaid: 'Get my certificate — {p} $', cView: 'View my certificate', cConfirm: 'Get the certificate for {p} $? This amount will be taken from your wallet.', cMine: 'My certificates', cNone: 'No certificates yet.', cVerify: 'Verify a certificate', cCode: 'Code CNU-XXXX-XXXX-XXXX', cOkTitle: 'Authentic certificate', cInvalid: 'No certificate matches this code.', cHead: 'CERTIFICATE OF COMPLETION', cGiven: 'is awarded to', cFor: 'for successfully completing the course', cBy: 'Instructor', cDate: 'Issued on', cAvg: 'Quiz average', cPrint: 'Print / Save as PDF', cLink: 'Copy verification link', cCopied: 'Link copied', cCheck: 'Verify',
      dTitle: 'Course documents', dAdd: 'Add a document', dUp: 'Uploading...', dNone: 'No documents yet.', dOpen: 'Open', dDel: 'Delete', dDone: 'Document added', dHelp: 'PDF, Word, Excel, image... (50 MB max)',
      pTitle: 'Course bundle', pBuy: 'Buy the bundle — {p} $', pSave: 'Instead of {l} $: you save {s} $. {n} courses included.', pConfirm: 'Buy this bundle for {p} $? You will be enrolled in {n} courses.', pBought: 'Bundle purchased, happy learning!', pMy: 'My course bundles', pCreate: 'Create a bundle', pName: 'Bundle name', pPriceL: 'Bundle price ($)', pPick: 'Pick at least 2 of your paid courses:', pNone: 'No bundles yet.', pCreated: 'Bundle created', pDel: 'Delete', pInfo: '{n} courses · value {v} $', pNeed: 'You need at least 2 active paid courses to create a bundle.', fail: 'Could not do this right now.' },
    es: { heroT: 'Aprende. Progresa. Triunfa.', heroS: 'Cursos, libros, autoestudio guiado, cuestionarios y certificados: todo para aprender en serio, a tu ritmo.', chip1: 'Certificados verificables', chip2: 'Autoestudio guiado', chip3: 'Cuestionarios y documentos',
      quizOwn: 'Cuestionario del capítulo', quizPlay: 'Hacer el cuestionario', quizBest: 'Mejor puntuación: {n} %', quizEdTitle: 'Cuestionario del capítulo', qQ: 'Pregunta', qOpt: 'Respuesta {n}', qOk: 'Correcta', qAdd: 'Añadir pregunta', qSave: 'Guardar cuestionario', qSaved: 'Cuestionario guardado', qDel: 'Quitar', qSubmit: 'Enviar mis respuestas', qPass: '¡Aprobado! Puntuación: {n} %', qFail: 'Puntuación: {n} %. Necesitas {m} % para aprobar. ¡Inténtalo de nuevo!', qClose: 'Cerrar', qEmptyHint: 'Aún no hay preguntas. Añade una.', qAnswerAll: 'Responde todas las preguntas.',
      cTitle: 'Certificado de finalización', cEnable: 'Emitir un certificado al terminar el curso', cPrice: 'Precio del certificado en $ (0 = gratis)', cSaved: 'Ajustes guardados', cProg: 'Capítulos {a}/{b} · Cuestionarios {c}/{d}', cGet: 'Obtener mi certificado', cGetPaid: 'Obtener mi certificado — {p} $', cView: 'Ver mi certificado', cConfirm: '¿Obtener el certificado por {p} $? Se descontará de tu monedero.', cMine: 'Mis certificados', cNone: 'Aún no hay certificados.', cVerify: 'Verificar un certificado', cCode: 'Código CNU-XXXX-XXXX-XXXX', cOkTitle: 'Certificado auténtico', cInvalid: 'Ningún certificado coincide con este código.', cHead: 'CERTIFICADO DE FINALIZACIÓN', cGiven: 'se otorga a', cFor: 'por haber completado con éxito el curso', cBy: 'Formador', cDate: 'Emitido el', cAvg: 'Media de cuestionarios', cPrint: 'Imprimir / Guardar como PDF', cLink: 'Copiar enlace de verificación', cCopied: 'Enlace copiado', cCheck: 'Verificar',
      dTitle: 'Documentos del curso', dAdd: 'Añadir un documento', dUp: 'Enviando...', dNone: 'Aún no hay documentos.', dOpen: 'Abrir', dDel: 'Eliminar', dDone: 'Documento añadido', dHelp: 'PDF, Word, Excel, imagen... (50 MB máx.)',
      pTitle: 'Paquete de cursos', pBuy: 'Comprar el paquete — {p} $', pSave: 'En vez de {l} $: ahorras {s} $. {n} cursos incluidos.', pConfirm: '¿Comprar este paquete por {p} $? Te inscribirás en {n} cursos.', pBought: 'Paquete comprado, ¡buen aprendizaje!', pMy: 'Mis paquetes de cursos', pCreate: 'Crear un paquete', pName: 'Nombre del paquete', pPriceL: 'Precio del paquete ($)', pPick: 'Elige al menos 2 de tus cursos de pago:', pNone: 'Aún no hay paquetes.', pCreated: 'Paquete creado', pDel: 'Eliminar', pInfo: '{n} cursos · valor {v} $', pNeed: 'Necesitas al menos 2 cursos de pago activos para crear un paquete.', fail: 'No se pudo hacer ahora.' },
    it: { heroT: 'Impara. Progredisci. Riesci.', heroS: 'Corsi, libri, autoapprendimento guidato, quiz e attestati: tutto per imparare seriamente, al tuo ritmo.', chip1: 'Certificati verificabili', chip2: 'Studio guidato', chip3: 'Quiz e documenti',
      quizOwn: 'Quiz del capitolo', quizPlay: 'Fai il quiz', quizBest: 'Miglior punteggio: {n} %', quizEdTitle: 'Quiz del capitolo', qQ: 'Domanda', qOpt: 'Risposta {n}', qOk: 'Giusta', qAdd: 'Aggiungi una domanda', qSave: 'Salva il quiz', qSaved: 'Quiz salvato', qDel: 'Rimuovi', qSubmit: 'Invia le mie risposte', qPass: 'Superato! Punteggio: {n} %', qFail: 'Punteggio: {n} %. Serve il {m} % per superarlo. Riprova!', qClose: 'Chiudi', qEmptyHint: 'Nessuna domanda per ora. Aggiungine una.', qAnswerAll: 'Rispondi a tutte le domande.',
      cTitle: 'Attestato di completamento', cEnable: 'Rilascia un attestato alla fine del corso', cPrice: 'Prezzo dell\'attestato in $ (0 = gratis)', cSaved: 'Impostazioni salvate', cProg: 'Capitoli {a}/{b} · Quiz {c}/{d}', cGet: 'Ottieni il mio attestato', cGetPaid: 'Ottieni il mio attestato — {p} $', cView: 'Vedi il mio attestato', cConfirm: 'Ottenere l\'attestato per {p} $? L\'importo sarà addebitato dal tuo portafoglio.', cMine: 'I miei attestati', cNone: 'Nessun attestato per ora.', cVerify: 'Verifica un attestato', cCode: 'Codice CNU-XXXX-XXXX-XXXX', cOkTitle: 'Attestato autentico', cInvalid: 'Nessun attestato corrisponde a questo codice.', cHead: 'ATTESTATO DI COMPLETAMENTO', cGiven: 'è conferito a', cFor: 'per aver completato con successo il corso', cBy: 'Formatore', cDate: 'Rilasciato il', cAvg: 'Media dei quiz', cPrint: 'Stampa / Salva come PDF', cLink: 'Copia il link di verifica', cCopied: 'Link copiato', cCheck: 'Verifica',
      dTitle: 'Documenti del corso', dAdd: 'Aggiungi un documento', dUp: 'Invio in corso...', dNone: 'Nessun documento per ora.', dOpen: 'Apri', dDel: 'Elimina', dDone: 'Documento aggiunto', dHelp: 'PDF, Word, Excel, immagine... (max 50 MB)',
      pTitle: 'Pacchetto di corsi', pBuy: 'Acquista il pacchetto — {p} $', pSave: 'Invece di {l} $: risparmi {s} $. {n} corsi inclusi.', pConfirm: 'Acquistare questo pacchetto per {p} $? Sarai iscritto a {n} corsi.', pBought: 'Pacchetto acquistato, buono studio!', pMy: 'I miei pacchetti di corsi', pCreate: 'Crea un pacchetto', pName: 'Nome del pacchetto', pPriceL: 'Prezzo del pacchetto ($)', pPick: 'Scegli almeno 2 dei tuoi corsi a pagamento:', pNone: 'Nessun pacchetto per ora.', pCreated: 'Pacchetto creato', pDel: 'Elimina', pInfo: '{n} corsi · valore {v} $', pNeed: 'Servono almeno 2 corsi a pagamento attivi per creare un pacchetto.', fail: 'Impossibile al momento.' },
    pt: { heroT: 'Aprenda. Evolua. Conquiste.', heroS: 'Cursos, livros, autoestudo guiado, questionários e certificados: tudo para aprender a sério, ao seu ritmo.', chip1: 'Certificados verificáveis', chip2: 'Autoestudo guiado', chip3: 'Questionários e documentos',
      quizOwn: 'Questionário do capítulo', quizPlay: 'Fazer o questionário', quizBest: 'Melhor pontuação: {n} %', quizEdTitle: 'Questionário do capítulo', qQ: 'Pergunta', qOpt: 'Resposta {n}', qOk: 'Certa', qAdd: 'Adicionar pergunta', qSave: 'Guardar questionário', qSaved: 'Questionário guardado', qDel: 'Remover', qSubmit: 'Enviar as minhas respostas', qPass: 'Aprovado! Pontuação: {n} %', qFail: 'Pontuação: {n} %. Precisa de {m} % para aprovar. Tente novamente!', qClose: 'Fechar', qEmptyHint: 'Ainda sem perguntas. Adicione uma.', qAnswerAll: 'Responda a todas as perguntas.',
      cTitle: 'Certificado de conclusão', cEnable: 'Emitir um certificado no fim do curso', cPrice: 'Preço do certificado em $ (0 = grátis)', cSaved: 'Definições guardadas', cProg: 'Capítulos {a}/{b} · Questionários {c}/{d}', cGet: 'Obter o meu certificado', cGetPaid: 'Obter o meu certificado — {p} $', cView: 'Ver o meu certificado', cConfirm: 'Obter o certificado por {p} $? O valor será debitado da sua carteira.', cMine: 'Os meus certificados', cNone: 'Ainda sem certificados.', cVerify: 'Verificar um certificado', cCode: 'Código CNU-XXXX-XXXX-XXXX', cOkTitle: 'Certificado autêntico', cInvalid: 'Nenhum certificado corresponde a este código.', cHead: 'CERTIFICADO DE CONCLUSÃO', cGiven: 'é atribuído a', cFor: 'por ter concluído com sucesso o curso', cBy: 'Formador', cDate: 'Emitido em', cAvg: 'Média dos questionários', cPrint: 'Imprimir / Guardar como PDF', cLink: 'Copiar link de verificação', cCopied: 'Link copiado', cCheck: 'Verificar',
      dTitle: 'Documentos do curso', dAdd: 'Adicionar um documento', dUp: 'A enviar...', dNone: 'Ainda sem documentos.', dOpen: 'Abrir', dDel: 'Eliminar', dDone: 'Documento adicionado', dHelp: 'PDF, Word, Excel, imagem... (50 MB máx.)',
      pTitle: 'Pacote de cursos', pBuy: 'Comprar o pacote — {p} $', pSave: 'Em vez de {l} $: poupa {s} $. {n} cursos incluídos.', pConfirm: 'Comprar este pacote por {p} $? Ficará inscrito em {n} cursos.', pBought: 'Pacote comprado, bom estudo!', pMy: 'Os meus pacotes de cursos', pCreate: 'Criar um pacote', pName: 'Nome do pacote', pPriceL: 'Preço do pacote ($)', pPick: 'Escolha pelo menos 2 dos seus cursos pagos:', pNone: 'Ainda sem pacotes.', pCreated: 'Pacote criado', pDel: 'Eliminar', pInfo: '{n} cursos · valor {v} $', pNeed: 'Precisa de pelo menos 2 cursos pagos ativos para criar um pacote.', fail: 'Não foi possível agora.' }
  };
  function lang() { try { if (typeof currentLang !== 'undefined' && TXT[currentLang]) return currentLang; } catch (e) { /* ignore */ } return 'fr'; }
  function tx(k, v) { var s = (TXT[lang()] || TXT.fr)[k] || TXT.fr[k] || ''; if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, type) { try { if (typeof showToast === 'function') showToast(m, type || 'info'); } catch (e) { /* ignore */ } }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }
  function money(n) { return Number(n).toFixed(2); }
  function icon(path) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'; }
  var I = {
    quiz: icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6"/>'),
    cert: icon('<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>'),
    doc: icon('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    pack: icon('<path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>'),
    grad: icon('<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>'),
    share: icon('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
    check: icon('<path d="M20 6 9 17l-5-5"/>'),
    x: icon('<path d="M18 6 6 18M6 6l12 12"/>')
  };

  /* ---------- Style (design) ---------- */
  var css = document.createElement('style');
  css.id = 'cn-st-style';
  css.textContent =
    '#menu-screen-academy .order-box{border-radius:18px;border:1px solid rgba(15,23,42,.08);box-shadow:0 6px 22px rgba(15,23,42,.06);transition:transform .15s ease,box-shadow .15s ease}' +
    '#menu-screen-academy #academy-browse-list .order-box:active,#menu-screen-academy #academy-mycourses-list .order-box:active{transform:scale(.992)}' +
    '#menu-screen-academy .shop-filter-tabs button{border-radius:999px;font-weight:700}' +
    '#menu-screen-academy .shop-card-category{border-radius:999px;font-weight:700}' +
    '.cn-acad-hero{margin:0 0 16px;padding:20px 18px;border-radius:22px;color:#fff;background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 60%,#db2777 100%);box-shadow:0 12px 30px rgba(29,78,216,.28)}' +
    '.cn-acad-hero h3{margin:0 0 6px;font-size:1.35rem;letter-spacing:-.01em;color:#fff}' +
    '.cn-acad-hero p{margin:0 0 14px;opacity:.92;font-size:.92rem;line-height:1.45;color:#fff}' +
    '.cn-acad-chips{display:flex;flex-wrap:wrap;gap:8px}' +
    '.cn-acad-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.18);font-weight:700;font-size:.8rem;color:#fff;backdrop-filter:blur(6px)}' +
    '.cn-acad-chip svg{width:16px;height:16px}' +
    /* correctif : le titre d'un formulaire ne passe plus sous la flèche retour */
    '.modal>.modal-close+h2{padding-left:46px;min-height:34px;display:flex;align-items:center;margin-top:0}' +
    '.cn-st-box{margin:14px 0;border-radius:18px}' +
    '.cn-st-title{display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:8px}' +
    '.cn-st-row{display:flex;gap:8px;flex-wrap:wrap}' +
    '.cn-st-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px}' +
    '.cn-st-ov{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto}' +
    '.cn-st-card{width:min(600px,100%);margin:auto;border-radius:22px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '.cn-st-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}' +
    '.cn-st-x{border:0;background:rgba(15,23,42,.08);width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:inherit}' +
    '.cn-st-q{padding:12px;border-radius:14px;border:1px solid rgba(15,23,42,.1);margin-bottom:10px}' +
    '.cn-st-opt{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:12px;border:1.5px solid rgba(15,23,42,.14);margin-top:6px;cursor:pointer}' +
    '.cn-st-opt input{margin:0}' +
    '.cn-st-opt.bad{border-color:#dc2626;background:rgba(220,38,38,.07)}' +
    '.cn-st-card input[type=text],.cn-st-card input[type=number],.cn-st-card textarea{width:100%;box-sizing:border-box}' +
    '.cn-cert-sheet{background:#fff;color:#0f172a;border:2px solid #b8962e;outline:6px double #e7d9a8;outline-offset:-14px;border-radius:6px;padding:34px 22px;text-align:center;font-family:Georgia,"Times New Roman",serif}' +
    '.cn-cert-sheet .brand{font:700 .75rem system-ui,sans-serif;letter-spacing:.2em;color:#64748b}' +
    '.cn-cert-sheet h2{margin:10px 0 4px;font-size:1.5rem;letter-spacing:.06em;color:#7a5c08}' +
    '.cn-cert-sheet .name{font-size:1.9rem;font-weight:700;margin:6px 0;border-bottom:1px solid #cbd5e1;display:inline-block;padding:0 14px 6px}' +
    '.cn-cert-sheet .course{font-size:1.25rem;font-weight:700;margin:8px 0;color:#1e3a8a}' +
    '.cn-cert-sheet .meta{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:22px;font:600 .8rem system-ui,sans-serif;color:#475569}' +
    '.cn-cert-sheet .code{margin-top:14px;font:700 .85rem ui-monospace,monospace;letter-spacing:.08em;color:#334155}' +
    '@media print{body.cn-printing>*:not(.cn-st-ov){display:none!important}body.cn-printing .cn-st-ov{position:static;background:none;padding:0;display:block}body.cn-printing .cn-st-card{box-shadow:none;width:100%;padding:0;background:#fff!important}.cn-st-noprint{display:none!important}}';
  document.head.appendChild(css);

  /* ---------- Aides ---------- */
  async function call(action, payload) {
    var u = auth.currentUser;
    if (!u) throw new Error('login');
    var token = await u.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ idToken: token, action: action }, payload)) });
    var j = await r.json();
    if (!j.success) throw new Error(j.error || tx('fail'));
    return j;
  }
  function errMsg(e) { return (e && e.message && e.message !== 'login') ? e.message : tx('fail'); }

  function modal(title, build) {
    var ov = document.createElement('div');
    ov.className = 'cn-st-ov';
    var cs = getComputedStyle(document.body);
    var bg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : '#fff';
    ov.innerHTML = '<div class="cn-st-card" style="background:' + bg + ';color:' + cs.color + '"><div class="cn-st-head"><b class="cn-st-mt"></b><button type="button" class="cn-st-x cn-st-noprint" aria-label="Close">' + I.x + '</button></div><div class="cn-st-body"></div></div>';
    ov.querySelector('.cn-st-mt').textContent = title;
    function close() { document.body.classList.remove('cn-printing'); if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.querySelector('.cn-st-x').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    build(ov.querySelector('.cn-st-body'), close);
    return close;
  }
  function box(titleHtml, iconSvg) {
    var b = document.createElement('div');
    b.className = 'cnh-root cnh-card cn-st-box';
    b.innerHTML = '<div class="cn-st-title">' + iconSvg + '<span>' + esc(titleHtml) + '</span></div><div class="cn-st-content"></div>';
    return b;
  }
  function btn(label, cls, onclick) {
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'btn ' + (cls || 'btn-outline') + ' btn-sm cn-st-btn'; x.textContent = label;
    if (onclick) x.addEventListener('click', onclick);
    return x;
  }

  /* ======================= QUIZ ======================= */
  function openQuizEditor(courseId, chapterId, chapterTitle, onDone) {
    if (window.CNLearn) window.CNLearn.edit(courseId, 'chapter', chapterId, chapterTitle, onDone);
  }
  function openQuizPlayer(courseId, chapterId, chapterTitle, onDone) {
    if (window.CNLearn) window.CNLearn.play(courseId, 'chapter', chapterId, chapterTitle, onDone);
  }

  /* ======================= CERTIFICAT ======================= */
  function certSheetHtml(c) {
    var d = new Date(c.issuedAt);
    var date = isNaN(d) ? '' : d.toLocaleDateString(lang());
    return '<div class="cn-cert-sheet"><div class="brand">COEURNOH UNIVERSE · ACADÉMIE</div>' +
      '<div style="margin:10px 0;color:#b8962e">' + icon('<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>').replace('width="20" height="20"', 'width="44" height="44"') + '</div>' +
      '<h2>' + esc(tx('cHead')) + '</h2><div>' + esc(tx('cGiven')) + '</div><div class="name">' + esc(c.studentName) + '</div>' +
      '<div>' + esc(tx('cFor')) + '</div><div class="course">' + esc(c.courseTitle) + '</div>' +
      (c.quizAvg != null ? '<div style="font:600 .85rem system-ui,sans-serif;color:#475569">' + esc(tx('cAvg')) + ' : ' + esc(c.quizAvg) + ' %</div>' : '') +
      '<div class="meta"><span>' + esc(tx('cBy')) + ' : ' + esc(c.ownerName || '—') + '</span><span>' + esc(tx('cDate')) + ' ' + esc(date) + '</span></div>' +
      '<div class="code">' + esc(c.code) + '</div></div>';
  }
  async function showCertificate(code) {
    try {
      var c = await call('academy_cert', { op: 'verify', code: code });
      modal(tx('cOkTitle'), function (body) {
        body.innerHTML = certSheetHtml({ code: c.code, studentName: c.studentName, courseTitle: c.courseTitle, ownerName: c.ownerName, issuedAt: c.issuedAt, quizAvg: c.quizAvg });
        var row = document.createElement('div'); row.className = 'cn-st-row cn-st-noprint'; row.style.marginTop = '12px';
        row.appendChild(btn(tx('cPrint'), 'btn-primary', function () { document.body.classList.add('cn-printing'); window.print(); setTimeout(function () { document.body.classList.remove('cn-printing'); }, 800); }));
        row.appendChild(btn(tx('cLink'), 'btn-outline', function () {
          var link = window.location.origin + window.location.pathname + '?cert=' + c.code;
          if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast(tx('cCopied'), 'success'); }); else window.prompt('', link);
        }));
        body.appendChild(row);
      });
    } catch (e) { toast(errMsg(e) === tx('fail') ? tx('cInvalid') : errMsg(e), 'error'); }
  }

  function buildOwnerCertBox(courseId, data) {
    var b = box(tx('cTitle'), I.cert), c = b.querySelector('.cn-st-content');
    c.innerHTML = '<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><input type="checkbox" class="cn-c-on"><span>' + esc(tx('cEnable')) + '</span></label>' +
      '<label class="small muted" style="display:block;margin-bottom:6px">' + esc(tx('cPrice')) + '</label><div class="cn-st-row"><input type="number" min="0" max="50" step="0.5" inputmode="decimal" class="cn-c-price" style="flex:1;min-width:0"></div>';
    c.querySelector('.cn-c-on').checked = data.certificateEnabled === true;
    c.querySelector('.cn-c-price').value = Number(data.certificatePrice) > 0 ? data.certificatePrice : 0;
    var save = btn(tx('qSave'), 'btn-primary', function () {
      var p = Math.max(0, Math.min(50, Math.round((Number(c.querySelector('.cn-c-price').value) || 0) * 100) / 100));
      db.collection('courses').doc(courseId).update({ certificateEnabled: c.querySelector('.cn-c-on').checked, certificatePrice: p })
        .then(function () { toast(tx('cSaved'), 'success'); }).catch(function () { toast(tx('fail'), 'error'); });
    });
    save.style.marginTop = '10px'; c.appendChild(save);
    return b;
  }

  async function buildStudentCertBox(courseId) {
    var s = await call('academy_cert', { op: 'status', courseId: courseId });
    if (!s.enabled) return null;
    var b = box(tx('cTitle'), I.cert), c = b.querySelector('.cn-st-content');
    b.classList.add('cn-cert-box');
    var pr = s.progress;
    var p = document.createElement('p'); p.className = 'muted small'; p.style.margin = '0 0 10px';
    p.textContent = tx('cProg', { a: pr.chaptersDone, b: pr.chaptersTotal, c: pr.quizzesPassed, d: pr.quizzesTotal }) + (pr.finalExists ? ' · ' + (lang() === 'fr' ? 'Examen final' : 'Final exam') + ' ' + (pr.finalPassed ? '✓' : '✗') : '');
    c.appendChild(p);
    if (s.certificate) {
      c.appendChild(btn(tx('cView'), 'btn-primary', function () { showCertificate(s.certificate.code); }));
    } else if (pr.eligible) {
      var go = btn(s.price > 0 ? tx('cGetPaid', { p: money(s.price) }) : tx('cGet'), 'btn-primary', async function () {
        if (s.price > 0 && !window.confirm(tx('cConfirm', { p: money(s.price) }))) return;
        go.disabled = true;
        try { var r = await call('academy_cert', { op: 'issue', courseId: courseId }); toast(tx('cView'), 'success'); b.parentNode.replaceChild(await buildStudentCertBox(courseId), b); showCertificate(r.code); }
        catch (e) { toast(errMsg(e), 'error'); go.disabled = false; }
      });
      c.appendChild(go);
    }
    return b;
  }

  /* ======================= DOCUMENTS ======================= */
  async function buildDocsBox(courseId, isOwner) {
    var b = box(tx('dTitle'), I.doc), c = b.querySelector('.cn-st-content');
    var listEl = document.createElement('div'); c.appendChild(listEl);
    async function refresh() {
      try {
        var r = await call('academy_resources', { op: 'list', courseId: courseId });
        listEl.innerHTML = '';
        if (!r.files.length) { listEl.innerHTML = '<p class="cnh-sub" style="margin:0 0 10px">' + esc(tx('dNone')) + '</p>'; return; }
        r.files.forEach(function (f) {
          var ext = (String(f.name).split('.').pop() || '').toLowerCase().slice(0, 4);
          var col = { pdf: '#dc2626', doc: '#2563eb', docx: '#2563eb', xls: '#16a34a', xlsx: '#16a34a', ppt: '#ea580c', pptx: '#ea580c', zip: '#7c3aed', txt: '#64748b' }[ext] || '#475569';
          var row = document.createElement('div'); row.className = 'cnh-doc';
          var ico = document.createElement('span'); ico.className = 'cnh-doc-i'; ico.style.background = col; ico.textContent = (ext || 'file').toUpperCase();
          var info = document.createElement('div'); info.className = 'cnh-grow';
          var nm = document.createElement('div'); nm.className = 'cnh-ellipsis'; nm.style.cssText = 'font-weight:700;font-size:.92rem'; nm.textContent = f.name;
          var sz = document.createElement('div'); sz.className = 'cnh-sub'; sz.style.fontSize = '.78rem';
          sz.textContent = f.size ? (f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB') : '';
          info.appendChild(nm); info.appendChild(sz);
          var open = document.createElement('a'); open.className = 'cnh-btn sm primary'; open.textContent = tx('dOpen'); open.href = f.url; open.target = '_blank'; open.rel = 'noopener noreferrer';
          row.appendChild(ico); row.appendChild(info); row.appendChild(open);
          if (isOwner) { var rm = btn(tx('dDel'), 'btn-outline', async function () { try { await call('academy_resources', { op: 'remove', courseId: courseId, fileId: f.id }); refresh(); } catch (e) { toast(errMsg(e), 'error'); } }); rm.className = 'cnh-btn sm danger'; row.appendChild(rm); }
          listEl.appendChild(row);
        });
      } catch (e) { listEl.innerHTML = ''; }
    }
    if (isOwner) {
      var help = document.createElement('p'); help.className = 'cnh-hint'; help.style.margin = '8px 0 10px'; help.textContent = tx('dHelp'); c.appendChild(help);
      var inp = document.createElement('input'); inp.type = 'file'; inp.style.display = 'none';
      inp.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,image/*';
      var add = btn(tx('dAdd'), 'btn-primary', function () { inp.click(); }); add.className = 'cnh-btn primary block';
      inp.addEventListener('change', async function () {
        var file = inp.files && inp.files[0]; if (!file) return;
        add.disabled = true; var old = add.textContent; add.textContent = tx('dUp');
        try {
          var up = await uploadFileToStorage(file, 'academy/' + courseId, { maxSizeMB: 50, onProgress: function (p) { add.textContent = tx('dUp') + ' ' + p + ' %'; } });
          await call('academy_resources', { op: 'add', courseId: courseId, name: file.name, url: up.url, size: file.size });
          toast(tx('dDone'), 'success'); refresh();
        } catch (e) { toast(errMsg(e), 'error'); }
        add.disabled = false; add.textContent = old; inp.value = '';
      });
      c.appendChild(add); c.appendChild(inp);
    }
    await refresh();
    return b;
  }

  /* ======================= PACKS ======================= */
  async function buildPackBuyBox(courseId) {
    var r = await call('academy_pack', { op: 'for_course', courseId: courseId });
    if (!r.packs || !r.packs.length) return null;
    var b = box(tx('pTitle'), I.pack), c = b.querySelector('.cn-st-content');
    r.packs.forEach(function (pk) {
      var d = document.createElement('div'); d.style.marginBottom = '10px';
      var h = document.createElement('b'); h.textContent = pk.title; d.appendChild(h);
      var p = document.createElement('p'); p.className = 'muted small'; p.style.margin = '4px 0 8px';
      p.textContent = tx('pSave', { l: money(pk.listTotal), s: money(pk.listTotal - pk.packPrice), n: pk.count });
      d.appendChild(p);
      var go = btn(tx('pBuy', { p: money(pk.packPrice) }), 'btn-primary', async function () {
        if (!window.confirm(tx('pConfirm', { p: money(pk.packPrice), n: pk.count }))) return;
        go.disabled = true;
        try { await call('academy_pack', { op: 'buy', packId: pk.id }); toast(tx('pBought'), 'success'); setTimeout(function () { window.location.reload(); }, 900); }
        catch (e) { toast(errMsg(e), 'error'); go.disabled = false; }
      });
      d.appendChild(go); c.appendChild(d);
    });
    return b;
  }

  async function renderMyPacks() {
    var tab = document.getElementById('academy-tab-myteaching'), u = me();
    if (!tab || !u) return;
    var b = tab.querySelector('.cn-st-packs');
    if (!b) { b = box(tx('pMy'), I.pack); b.classList.add('cn-st-packs'); var first = tab.querySelector('.cn-earn-box'); tab.insertBefore(b, first ? first.nextSibling : tab.firstChild); }
    var c = b.querySelector('.cn-st-content'); c.innerHTML = '';
    try {
      var mine = await call('academy_pack', { op: 'mine' });
      if (!mine.packs.length) { var n = document.createElement('p'); n.className = 'muted small'; n.style.margin = '0 0 8px'; n.textContent = tx('pNone'); c.appendChild(n); }
      mine.packs.forEach(function (pk) {
        var row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid rgba(15,23,42,.08)';
        var info = document.createElement('div'); info.innerHTML = '<b></b><div class="muted small"></div>';
        info.firstChild.textContent = pk.title + ' — ' + money(pk.packPrice) + ' $'; info.lastChild.textContent = tx('pInfo', { n: pk.courseIds.length, v: money(pk.listTotal) });
        row.appendChild(info);
        row.appendChild(btn(tx('pDel'), 'btn-outline', async function () { try { await call('academy_pack', { op: 'delete', packId: pk.id }); renderMyPacks(); } catch (e) { toast(errMsg(e), 'error'); } }));
        c.appendChild(row);
      });
      var snap = await db.collection('courses').where('ownerUid', '==', u.uid).get();
      var courses = []; snap.forEach(function (d) { var x = d.data(); if (x.status === 'active' && Number(x.price) > 0) courses.push({ id: d.id, title: x.title, price: Number(x.price) }); });
      if (courses.length < 2) { var need = document.createElement('p'); need.className = 'muted small'; need.style.margin = '10px 0 0'; need.textContent = tx('pNeed'); c.appendChild(need); return; }
      var form = document.createElement('div'); form.style.marginTop = '12px';
      form.innerHTML = '<div class="small muted" style="margin-bottom:6px">' + esc(tx('pPick')) + '</div>';
      var checks = [];
      courses.forEach(function (co) {
        var l = document.createElement('label'); l.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0';
        l.innerHTML = '<input type="checkbox"><span class="small"></span>'; l.querySelector('span').textContent = co.title + ' (' + money(co.price) + ' $)';
        var cb = l.querySelector('input'); checks.push({ cb: cb, co: co }); form.appendChild(l);
      });
      var name = document.createElement('input'); name.type = 'text'; name.maxLength = 60; name.placeholder = tx('pName'); name.style.cssText = 'width:100%;box-sizing:border-box;margin:8px 0';
      var price = document.createElement('input'); price.type = 'number'; price.min = '1'; price.step = '0.5'; price.inputMode = 'decimal'; price.placeholder = tx('pPriceL'); price.style.cssText = 'width:100%;box-sizing:border-box;margin-bottom:8px';
      form.appendChild(name); form.appendChild(price);
      var create = btn(tx('pCreate'), 'btn-primary', async function () {
        create.disabled = true;
        try {
          await call('academy_pack', { op: 'create', title: name.value, packPrice: Number(price.value), courseIds: checks.filter(function (x) { return x.cb.checked; }).map(function (x) { return x.co.id; }) });
          toast(tx('pCreated'), 'success'); renderMyPacks();
        } catch (e) { toast(errMsg(e), 'error'); create.disabled = false; }
      });
      form.appendChild(create); c.appendChild(form);
    } catch (e) { /* silencieux : le bloc est un plus */ }
  }

  /* ======================= MES CERTIFICATS + VÉRIFICATION ======================= */
  async function renderMyCerts() {
    var tab = document.getElementById('academy-tab-mycourses'), u = me();
    if (!tab || !u) return;
    var b = tab.querySelector('.cn-st-certs');
    if (!b) { b = box(tx('cMine'), I.grad); b.classList.add('cn-st-certs'); tab.insertBefore(b, tab.firstChild); }
    var c = b.querySelector('.cn-st-content'); c.innerHTML = '';
    try {
      var r = await call('academy_cert', { op: 'mine' });
      if (!r.certificates.length) { var n = document.createElement('p'); n.className = 'muted small'; n.style.margin = '0 0 8px'; n.textContent = tx('cNone'); c.appendChild(n); }
      r.certificates.forEach(function (ct) {
        var row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid rgba(15,23,42,.08)';
        var nm = document.createElement('span'); nm.className = 'small'; nm.style.cssText = 'min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'; nm.textContent = ct.courseTitle;
        row.appendChild(nm); row.appendChild(btn(tx('cView'), 'btn-outline', function () { showCertificate(ct.code); })); c.appendChild(row);
      });
    } catch (e) { /* silencieux */ }
    var v = document.createElement('div'); v.className = 'cn-st-row'; v.style.marginTop = '10px';
    var inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = tx('cCode'); inp.maxLength = 20; inp.autocapitalize = 'characters'; inp.style.cssText = 'flex:1;min-width:0;text-transform:uppercase';
    v.appendChild(inp); v.appendChild(btn(tx('cCheck'), 'btn-outline', function () { if (inp.value.trim()) showCertificate(inp.value.trim()); }));
    var lab = document.createElement('div'); lab.className = 'small muted'; lab.style.marginTop = '10px'; lab.textContent = tx('cVerify');
    c.appendChild(lab); c.appendChild(v);
  }

  /* ======================= INJECTION DANS LA FICHE D'UN COURS ======================= */
  async function injectCourse(id) {
    var holder = document.getElementById('course-detail-reviews');
    if (!holder || !holder.parentNode) return;
    var anchor = holder.parentNode, host = anchor.parentNode;
    if (host.querySelector('.cn-st-box, .cn-st-qrow')) return;
    var u = me(); if (!u) return;
    var snap = await db.collection('courses').doc(id).get();
    if (!snap.exists) return;
    var data = snap.data(), isOwner = data.ownerUid === u.uid, enrolled = false;
    if (!isOwner) { try { enrolled = (await db.collection('course_enrollments').doc(id + '_' + u.uid).get()).exists; } catch (e) { /* ignore */ } }
    if (host.querySelector('.cn-st-box, .cn-st-qrow')) return;

    function refreshCert() {
      buildStudentCertBox(id).then(function (nb) {
        var old = host.querySelector('.cn-cert-box');
        if (nb && old) old.parentNode.replaceChild(nb, old); else if (nb) host.insertBefore(nb, anchor);
      }).catch(function () { /* ignore */ });
    }

    // Boutons de quiz sous chaque chapitre
    if (isOwner || enrolled) {
      try {
        var info = await call('academy_quiz', { op: 'info', courseId: id });
        var chapters = data.chapters || [];
        var boxes = [].slice.call(host.querySelectorAll('.order-box')).filter(function (el) { var s = el.querySelector(':scope > strong'); return s && /^\d+\.\s/.test(s.textContent); });
        boxes.forEach(function (el) {
          var idx = parseInt(el.querySelector(':scope > strong').textContent, 10) - 1, ch = chapters[idx];
          if (!ch || !ch.id || el.querySelector('.cn-st-qrow')) return;
          var q = info.quizzes[ch.id], row = document.createElement('div'); row.className = 'cn-st-qrow cn-st-row'; row.style.marginTop = '8px';
          var title = ch.title || ('#' + (idx + 1));
          if (isOwner) {
            row.appendChild(btn(tx('quizOwn') + (q ? ' (' + q.count + ')' : ''), 'btn-outline', function () { openQuizEditor(id, ch.id, title, function () { /* rouvrir pour rafraîchir */ }); }));
          } else if (q) {
            row.appendChild(btn(tx('quizPlay'), 'btn-primary', function () { openQuizPlayer(id, ch.id, title, refreshCert); }));
            if (q.best != null) { var s = document.createElement('span'); s.className = 'muted small'; s.style.alignSelf = 'center'; s.textContent = tx('quizBest', { n: q.best }); row.appendChild(s); }
          }
          if (row.childNodes.length) el.appendChild(row);
        });
      } catch (e) { /* les quiz sont un plus : jamais bloquants */ }
    }

    var blocks = [];
    try {
      if (isOwner) blocks.push(buildOwnerCertBox(id, data)); else if (enrolled) blocks.push(await buildStudentCertBox(id));
      if (isOwner || enrolled) blocks.push(await buildDocsBox(id, isOwner));
      if (!isOwner && !enrolled && Number(data.price) > 0 && data.status === 'active') blocks.push(await buildPackBuyBox(id));
    } catch (e) { /* ignore */ }
    try { if (window.CNLearn) { var lb = await window.CNLearn.blocks(id, data, isOwner, enrolled, function () { refreshCert(); }); lb.forEach(function (x) { blocks.push(x); }); } } catch (e) { /* ignore */ }
    if (host.querySelector('.cn-st-box, .cnh-card.cn-st-box')) return;
    blocks.forEach(function (b) { if (b) host.insertBefore(b, anchor); });
  }

  function wrap(name, fn) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = async function () {
      var r = await orig.apply(this, arguments);
      try { await fn.apply(this, arguments); } catch (e) { /* jamais bloquant */ }
      return r;
    };
  }
  wrap('openCourseDetail', function (id) { return injectCourse(id); });
  (function () {
    var orig = window.setAcademyTab;
    if (typeof orig !== 'function') return;
    window.setAcademyTab = function (tab) {
      var r = orig.apply(this, arguments);
      try { if (tab === 'myteaching') setTimeout(renderMyPacks, 150); if (tab === 'mycourses') renderMyCerts(); } catch (e) { /* ignore */ }
      return r;
    };
  })();

  /* ---------- Bandeau d'accueil de l'Académie ---------- */
  function injectHero() {
    var scr = document.getElementById('menu-screen-academy');
    if (!scr || scr.querySelector('.cn-acad-hero')) return;
    var head = scr.querySelector('.menu-page-header');
    var hero = document.createElement('div');
    hero.className = 'cn-acad-hero';
    hero.innerHTML = '<h3>' + esc(tx('heroT')) + '</h3><p>' + esc(tx('heroS')) + '</p><div class="cn-acad-chips">' +
      '<span class="cn-acad-chip">' + I.cert + esc(tx('chip1')) + '</span><span class="cn-acad-chip">' + I.share + esc(tx('chip2')) + '</span><span class="cn-acad-chip">' + I.quiz + esc(tx('chip3')) + '</span></div>';
    if (head && head.nextSibling) head.parentNode.insertBefore(hero, head.nextSibling); else scr.insertBefore(hero, scr.firstChild);
  }
  try { injectHero(); } catch (e) { /* ignore */ }

  /* ---------- Lien de vérification reçu (?cert=CODE) ---------- */
  try {
    var p = new URLSearchParams(window.location.search), code = p.get('cert');
    if (code) {
      p.delete('cert'); var q = p.toString(); window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''));
      var tries = 0;
      (function later() { if (me() && typeof auth !== 'undefined' && auth && auth.currentUser) { showCertificate(code); return; } if (++tries < 30) setTimeout(later, 500); })();
    }
  } catch (e) { /* ignore */ }
})();
