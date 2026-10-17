/* Coeurnoh Universe — Planning d'étude (Académie › Auto-études).
   - Objectif de séances par semaine, jours et heure choisis par l'élève (enregistrés sur son téléphone).
   - Export vers le calendrier du téléphone (fichier .ics récurrent avec rappel 10 min avant).
   - Rappel à l'ouverture de l'application le jour prévu, si aucune leçon n'a encore été faite aujourd'hui.
   - Date de fin estimée de chaque parcours, d'après le temps disponible par semaine.
   - Prochains badges (série, leçons, points) avec barre de progression.
   Lit les mêmes données que l'écran Auto-études (actions « paths » et « config »). Aucun changement serveur. */
(function () {
  'use strict';
  if (window.__cnPlanner) return; window.__cnPlanner = true;
  var KEY = 'cn_study_plan', LOGK = 'cn_study_log';
  var DAYS = [['MO', 'Lun'], ['TU', 'Mar'], ['WE', 'Mer'], ['TH', 'Jeu'], ['FR', 'Ven'], ['SA', 'Sam'], ['SU', 'Dim']];
  var MIN_PER_LESSON = 25;
  function esc(s) { return escapeHtml(s == null ? '' : String(s)); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function loadPlan() { try { var p = JSON.parse(lsGet(KEY) || 'null'); if (p && Array.isArray(p.days)) return p; } catch (e) { /* ignore */ } return null; }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; } catch (e) { return null; } }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function mondayOf(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

  /* ---------- logique pure (testée) ---------- */
  function finishEstimate(remainingLessons, hoursPerWeek, from) {
    if (!(remainingLessons > 0)) return null;
    var h = Math.max(0.5, Number(hoursPerWeek) || 3), weeks = (remainingLessons * MIN_PER_LESSON / 60) / h;
    var d = new Date(from || Date.now()); d.setDate(d.getDate() + Math.ceil(weeks * 7)); return d;
  }
  var MILESTONES = [
    { id: 'streak', label: 'Série de jours', steps: [3, 7, 14, 30, 60, 100] },
    { id: 'lessons', label: 'Leçons terminées', steps: [1, 5, 10, 25, 50, 100] },
    { id: 'xp', label: 'Points', steps: [50, 100, 250, 500, 1000, 2500] }
  ];
  function nextMilestone(value, steps) {
    var v = Number(value) || 0, prev = 0;
    for (var i = 0; i < steps.length; i++) { if (v < steps[i]) return { prev: prev, next: steps[i], pct: Math.round((v - prev) / (steps[i] - prev) * 100), reached: i }; prev = steps[i]; }
    return { prev: prev, next: null, pct: 100, reached: steps.length };
  }
  function weekCount(log, total, now) {
    // leçons faites cette semaine = total actuel − dernier total connu avant lundi (ou premier relevé de la semaine)
    var mon = dayKey(mondayOf(now || new Date())), keys = Object.keys(log).sort(), base = null;
    for (var i = 0; i < keys.length; i++) { if (keys[i] < mon) base = log[keys[i]]; else { if (base == null) base = log[keys[i]]; break; } }
    if (base == null) return 0; return Math.max(0, total - base);
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function buildIcs(plan, titles, now) {
    var start = new Date(now || Date.now()), map = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    var hh = parseInt(String(plan.time || '18:00').split(':')[0], 10) || 18, mm = parseInt(String(plan.time || '18:00').split(':')[1], 10) || 0;
    var dur = Math.max(15, Math.min(180, Number(plan.minutes) || 45));
    var first = new Date(start); first.setHours(hh, mm, 0, 0);
    var sorted = plan.days.slice().sort(function (a, b) { return map[a] - map[b]; });
    var CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'], d0 = null;
    for (var k = 0; k < 8 && !d0; k++) { var c = new Date(first); c.setDate(first.getDate() + k); if (sorted.indexOf(CODES[c.getDay()]) >= 0 && c > start) d0 = c; }
    if (!d0) d0 = first;
    var f = function (d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; };
    var end = new Date(d0.getTime() + dur * 60000), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    var title = 'Étude' + (titles && titles.length ? ' : ' + titles[0] : '') + ' — Coeurnoh Universe';
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Coeurnoh Universe//Planning//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:study-' + stamp + '@coeurnoh', 'DTSTAMP:' + stamp,
      'DTSTART:' + f(d0), 'DTEND:' + f(end), 'RRULE:FREQ=WEEKLY;BYDAY=' + sorted.join(','), 'SUMMARY:' + title.replace(/[,;]/g, ' '), 'DESCRIPTION:Séance d\'étude planifiée dans l\'Académie.',
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:C\'est bientôt l\'heure d\'étudier', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  window.CNPlanner = { finishEstimate: finishEstimate, nextMilestone: nextMilestone, weekCount: weekCount, buildIcs: buildIcs, MILESTONES: MILESTONES, _dayKey: dayKey };

  /* ---------- données ---------- */
  var DATA = null, loading = false;
  async function api(op) {
    var tok = await auth.currentUser.getIdToken();
    var r = await fetch('/api/payments-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tok, action: 'academy_study', op: op }) });
    var j = await r.json(); if (!j.success) throw new Error(j.error || 'Erreur'); return j;
  }
  async function load() {
    if (loading || !me()) return; loading = true;
    try {
      var r = await Promise.all([api('paths'), api('config')]);
      DATA = { paths: r[0].paths || [], stats: (r[1].stats || {}) };
      var total = DATA.paths.reduce(function (s, p) { return s + (p.done || 0); }, 0), log = {}; try { log = JSON.parse(lsGet(LOGK) || '{}'); } catch (e) { log = {}; }
      log[dayKey()] = total; var ks = Object.keys(log).sort(); while (ks.length > 40) delete log[ks.shift()]; lsSet(LOGK, JSON.stringify(log));
      DATA.total = total; DATA.log = log;
    } catch (e) { DATA = null; }
    loading = false; draw();
  }

  /* ---------- affichage ---------- */
  var st = document.createElement('style');
  st.textContent = '.sp-card{margin:12px 0}.sp-h{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.sp-h b{font-size:1rem}.sp-bar{height:8px;border-radius:5px;background:#e3e8f0;overflow:hidden;margin:6px 0}.sp-bar i{display:block;height:100%;background:#1b4fd8}.sp-bar i.g{background:#0b9a6a}' +
    '.sp-row{display:flex;justify-content:space-between;gap:10px;font-size:.86rem;padding:5px 0}.sp-s{font-size:.78rem;color:#5d6779}.sp-b{border:1px solid #dde3ec;background:#fff;border-radius:12px;padding:8px 14px;font-weight:700;font-size:.84rem;cursor:pointer;color:inherit}.sp-b.p{background:#1b4fd8;border-color:#1b4fd8;color:#fff}' +
    '.sp-ov{position:fixed;inset:0;z-index:2800;background:rgba(10,20,36,.55);display:flex;align-items:flex-end;justify-content:center}.sp-sheet{background:#fff;width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:20px 18px max(20px,env(safe-area-inset-bottom));max-height:90vh;overflow:auto}.sp-d{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.sp-d button{border:1px solid #dde3ec;background:#fff;border-radius:10px;padding:8px 11px;font-weight:700;cursor:pointer;color:inherit}.sp-d button.on{background:#14263f;color:#fff;border-color:#14263f}.sp-f{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sp-f label{font-size:.74rem;font-weight:700;color:#5d6779;display:block;margin-bottom:3px}.sp-f input,.sp-f select{width:100%}';
  document.head.appendChild(st);
  function fmtD(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function card() {
    var plan = loadPlan(), D = DATA, h = '<div class="cnh-card sp-card" id="sp-plan"><div class="sp-h"><b>Mon planning d’étude</b><button type="button" class="sp-b" data-sp="edit">' + (plan ? 'Modifier' : 'Planifier') + '</button></div>';
    if (!D) return h + '<p class="sp-s" style="margin:0">Chargement…</p></div>';
    if (!plan) h += '<p class="sp-s" style="margin:0 0 8px">Choisissez vos jours et votre heure d’étude : vous recevrez un rappel et pourrez l’ajouter à l’agenda de votre téléphone.</p>';
    else {
      var done = weekCount(D.log, D.total), goal = plan.days.length, pc = Math.min(100, Math.round(done / Math.max(1, goal) * 100));
      h += '<div class="sp-row"><span>Objectif de la semaine</span><b>' + Math.min(done, goal) + ' / ' + goal + ' leçon' + (goal > 1 ? 's' : '') + '</b></div><div class="sp-bar"><i class="' + (pc >= 100 ? 'g' : '') + '" style="width:' + pc + '%"></i></div>' +
        '<div class="sp-s">' + plan.days.map(function (d) { return DAYS.filter(function (x) { return x[0] === d; })[0][1]; }).join(' · ') + ' à ' + esc(plan.time) + ' · ' + plan.minutes + ' min</div>';
    }
    var hrs = plan ? plan.hours : 3, rows = '';
    D.paths.filter(function (p) { return p.lessonsTotal > p.done; }).slice(0, 4).forEach(function (p) {
      var e = finishEstimate(p.lessonsTotal - p.done, hrs); rows += '<div class="sp-row"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.title) + '</span><span class="sp-s" style="white-space:nowrap">fin vers le ' + esc(e ? fmtD(e) : '') + '</span></div>';
    });
    if (rows) h += '<div style="margin-top:8px;border-top:1px solid #e3e8f0;padding-top:6px"><div class="sp-s" style="margin-bottom:2px">Fin estimée à ' + hrs + ' h par semaine</div>' + rows + '</div>';
    var st2 = D.stats || {}, vals = { streak: st2.streak, lessons: st2.lessonsDone, xp: st2.xp }, bd = '';
    MILESTONES.forEach(function (m) { var n = nextMilestone(vals[m.id], m.steps); bd += '<div class="sp-row"><span>' + esc(m.label) + '</span><span class="sp-s">' + (Number(vals[m.id]) || 0) + (n.next ? ' → prochain palier : ' + n.next : ' · palier maximal atteint') + '</span></div><div class="sp-bar"><i style="width:' + n.pct + '%"></i></div>'; });
    h += '<div style="margin-top:8px;border-top:1px solid #e3e8f0;padding-top:6px"><div class="sp-s" style="margin-bottom:2px">Prochains paliers</div>' + bd + '</div></div>';
    return h;
  }
  function draw() {
    var root = document.getElementById('academy-study-section'); if (!root) return;
    var st1 = root.querySelector('.cnh-stats'); if (!st1) return;
    var old = document.getElementById('sp-plan'); var tmp = document.createElement('div'); tmp.innerHTML = card();
    if (old) old.replaceWith(tmp.firstChild); else st1.insertAdjacentElement('afterend', tmp.firstChild);
  }
  function openEdit() {
    var p = loadPlan() || { days: ['TU', 'TH', 'SA'], time: '18:00', minutes: 45, hours: 3 };
    var o = document.createElement('div'); o.className = 'sp-ov';
    o.innerHTML = '<div class="sp-sheet"><h3 style="margin:0 0 4px">Planifier mes séances</h3><p class="sp-s" style="margin:0 0 6px">Les réglages restent sur votre téléphone.</p><div class="sp-s" style="font-weight:700">Jours d’étude</div><div class="sp-d" id="sp-days">' +
      DAYS.map(function (d) { return '<button type="button" data-d="' + d[0] + '" class="' + (p.days.indexOf(d[0]) >= 0 ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') + '</div><div class="sp-f"><div><label>Heure</label><input type="time" class="text-input" id="sp-t" value="' + esc(p.time) + '"></div><div><label>Durée (minutes)</label><select class="select-input" id="sp-m">' +
      [20, 30, 45, 60, 90, 120].map(function (m) { return '<option' + (m === p.minutes ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div><div style="grid-column:1/3"><label>Heures disponibles par semaine (pour estimer la fin)</label><input type="number" class="text-input" id="sp-hh" min="1" max="40" value="' + p.hours + '"></div></div>' +
      '<p class="sp-s" id="sp-msg" style="min-height:1.2em;margin:8px 0 0"></p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="sp-b p" data-a="save">Enregistrer</button><button class="sp-b" data-a="ics">Ajouter à mon agenda</button><button class="sp-b" data-a="del">Supprimer</button><button class="sp-b" data-a="close">Fermer</button></div></div>';
    document.body.appendChild(o);
    function read() { var days = []; o.querySelectorAll('#sp-days .on').forEach(function (b) { days.push(b.getAttribute('data-d')); }); return { days: days, time: o.querySelector('#sp-t').value || '18:00', minutes: parseInt(o.querySelector('#sp-m').value, 10) || 45, hours: Math.max(1, parseInt(o.querySelector('#sp-hh').value, 10) || 3) }; }
    o.addEventListener('click', function (e) {
      if (e.target === o) { o.remove(); return; }
      var d = e.target.closest && e.target.closest('[data-d]'); if (d) { d.classList.toggle('on'); return; }
      var a = e.target.closest && e.target.closest('[data-a]'); if (!a) return; var act = a.getAttribute('data-a'), msg = o.querySelector('#sp-msg');
      if (act === 'close') { o.remove(); return; }
      if (act === 'del') { try { localStorage.removeItem(KEY); } catch (er) { /* ignore */ } o.remove(); draw(); return; }
      var v = read(); if (!v.days.length) { msg.textContent = 'Choisissez au moins un jour.'; return; }
      lsSet(KEY, JSON.stringify(v));
      if (act === 'save') { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (er) { /* ignore */ } o.remove(); draw(); try { showToast('Planning enregistré', 'success'); } catch (er) { /* ignore */ } return; }
      if (act === 'ics') {
        var titles = DATA && DATA.paths.filter(function (x) { return x.lessonsTotal > x.done; }).map(function (x) { return x.title; });
        var blob = new Blob([buildIcs(v, titles)], { type: 'text/calendar;charset=utf-8' }), link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'planning-etude.ics'; document.body.appendChild(link); link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 500);
        msg.textContent = 'Fichier créé : ouvrez-le pour l’ajouter à votre agenda. Planning enregistré.'; draw();
      }
    });
  }
  function remind() {
    var p = loadPlan(); if (!p || !DATA) return;
    var map = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'], now = new Date();
    if (p.days.indexOf(map[now.getDay()]) < 0) return;
    var t = String(p.time).split(':'); if (now.getHours() * 60 + now.getMinutes() < (parseInt(t[0], 10) || 0) * 60 + (parseInt(t[1], 10) || 0) - 30) return;
    var today = dayKey(), log = DATA.log || {}, ks = Object.keys(log).sort(), before = null; for (var i = 0; i < ks.length; i++) if (ks[i] < today) before = log[ks[i]];
    if (before != null && DATA.total > before) return; // déjà étudié aujourd'hui
    if (lsGet('cn_study_reminded') === today) return; lsSet('cn_study_reminded', today);
    try { showToast('C’est l’heure de votre séance d’étude. Reprenez votre parcours dans l’Académie.', 'info'); } catch (e) { /* ignore */ }
  }
  function mount() {
    var root = document.getElementById('academy-study-section'); if (!root) return false;
    root.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-sp="edit"]')) openEdit(); });
    new MutationObserver(function () { if (root.querySelector('.cnh-stats') && !document.getElementById('sp-plan')) { if (DATA) draw(); else load(); } }).observe(root, { childList: true });
    return true;
  }
  var n = 0; (function wait() { if (mount()) { var w = 0, iv = setInterval(function () { if (me()) { clearInterval(iv); load(); setTimeout(remind, 2500); } else if (++w > 40) clearInterval(iv); }, 500); return; } if (++n < 120) setTimeout(wait, 250); })();
})();
