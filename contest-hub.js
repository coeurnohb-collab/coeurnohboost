/* contest-hub.js — nouveau « Concours & Récompenses » (accueil, découverte, détail, podium, calendrier).
   Ajout par-dessus le système existant : mêmes collections Firestore (contests, contest_entries, contest_votes),
   mêmes fonctions de participation / paiement / vote. Aucun changement de règles. Jamais bloquant. */
(function () {
  'use strict';
  if (window.__cnContestHub) return; window.__cnContestHub = true;

  var S = { tab: 'discover', status: 'active', cat: 'all', q: '', sort: 'end', mine: null, mineLoaded: false, d: null, dTab: 'about', dSort: 'top', dQ: '' };
  var timer = null;

  /* ---------- Outils ---------- */
  function g(n) { try { return window[n]; } catch (e) { return undefined; } }
  function lang() { try { return (typeof currentLang !== 'undefined' && currentLang) || 'fr'; } catch (e) { return 'fr'; } }
  var D = {
    fr: {
      hero_t: 'Concours & Récompenses', hero_s: 'Participe, fais voter ta communauté et remporte des prix. Chaque concours est suivi en direct.',
      live: 'En cours', soon: 'À venir', done: 'Terminés', discover: 'Découvrir', myEntries: 'Mes participations', myContests: 'Mes concours',
      feat: 'À la une', ends: 'Se termine dans', starts: 'Commence dans', ended: 'Terminé', d: 'j', h: 'h', m: 'min', s: 's',
      all: 'Toutes', search: 'Rechercher un concours', sort: 'Trier', s_end: 'Fin proche', s_new: 'Récents', s_free: 'Gratuits d’abord', s_prize: 'Avec dotation',
      free: 'Gratuit', paid: 'Inscription', prize: 'Dotation', by: 'Par', official: 'Organisation officielle', participants: 'participants', entries: 'participations',
      empty_live: 'Aucun concours en cours pour ce filtre.', empty_soon: 'Aucun concours à venir pour le moment.', empty_done: 'Aucun concours terminé.', empty_q: 'Aucun résultat. Essaie un autre mot ou une autre catégorie.',
      how: 'Comment ça marche', h1: 'Participe', h1d: 'Envoie ta photo ou ta vidéo avant la date limite.', h2: 'Fais voter', h2d: 'Partage le lien : chaque personne vote une seule fois.', h3: 'Gagne', h3d: 'Le classement est public et mis à jour en direct.',
      recent: 'Récemment terminés', propose: 'Proposer un concours', loginNeeded: 'Connecte-toi pour voir tes participations.', login: 'Se connecter',
      noEntries: 'Tu n’as encore participé à aucun concours.', noMine: 'Tu n’as pas encore proposé de concours.', moderate: 'À modérer', rank: 'Rang', votes: 'votes', vote: 'vote',
      about: 'Présentation', people: 'Participants', board: 'Classement', desc: 'Description', timeline: 'Calendrier', open: 'Ouverture', close: 'Clôture', results: 'Résultats', rules: 'Règlement',
      r1: 'Une seule participation par personne ; un nouvel envoi remplace le précédent tant que le concours est ouvert.', r2: 'Un vote par participation et par personne. Tu ne peux pas voter pour toi-même.', r3: 'Photos jusqu’à 10 Mo, vidéos jusqu’à 100 Mo.', r4: 'Le classement est déterminé par le nombre de votes à la clôture.', r5: 'Les contenus contraires aux règles peuvent être retirés par l’équipe.',
      cal: 'Ajouter au calendrier', share: 'Partager', back: 'Retour', join: 'Participer', joinPaid: 'Participer pour', again: 'Modifier ma participation', joined: 'Tu participes', login2: 'Connecte-toi pour participer',
      closedMsg: 'Ce concours est terminé.', soonMsg: 'Ce concours n’a pas encore commencé.', pendingMsg: 'Ce concours attend la validation de l’équipe.', rejectedMsg: 'Ce concours n’a pas été retenu.',
      pTop: 'Populaires', pNew: 'Récents', pSearch: 'Chercher un participant', noPeople: 'Pas encore de participant. Sois le premier !', voted: 'Déjà voté', yours: 'Ta participation', loadErr: 'Impossible de charger les participations.', winner: 'Gagnant', podiumEmpty: 'Le classement apparaîtra avec les premiers votes.', total: 'votes au total',
      myspace: 'Mon espace', lvl: 'Niveau', lv1: 'Débutant', lv2: 'Compétiteur', lv3: 'Challenger', lv4: 'Champion', nextLvl: 'prochain niveau dans', kpiJoined: 'Concours joints', kpiVotes: 'Votes reçus', kpiBest: 'Meilleur rang', remind: 'Tes concours suivis qui se terminent bientôt', cats: 'Catégories', shareMine: 'Partager ma participation', cnt: 'concours', saved: 'Suivis', follow: 'Suivre', following: 'Suivi', soonEnd: 'Se terminent bientôt', stats_p: 'Participants', stats_v: 'Votes', stats_d: 'Jours restants', stats_r: 'Avancement', faq: 'Questions fréquentes', q1: 'Comment voter ?', a1: 'Ouvre l’onglet Participants et touche « Voter » sous la participation qui te plaît. Un seul vote par participation et par personne.', q2: 'Puis-je modifier ma participation ?', a2: 'Oui, tant que le concours est ouvert : un nouvel envoi remplace le précédent.', q3: 'Quand connaît-on les gagnants ?', a3: 'À la clôture, le classement final est figé et visible dans l’onglet Classement.', q4: 'Comment est calculé le classement ?', a4: 'Par nombre de votes. En cas d’égalité, la participation la plus ancienne passe devant.', wa: 'WhatsApp', copy: 'Copier le lien', copied: 'Lien copié', orgSpace: 'Espace organisateur', exportCsv: 'Exporter le classement (CSV)', photosAdmin: 'Photos de couverture', photosHint: 'Touche une catégorie pour choisir sa photo. Elle s’affiche sur tous les concours de cette catégorie qui n’ont pas leur propre image.', exampleC: 'Exemple de concours', organizer: 'Organisateur', pending: 'En attente', rejected: 'Refusé', daysLeft: 'jours restants', progress: 'Avancement', moderation: 'Modération', approve: 'Approuver', reject: 'Refuser', createFirst: 'Lance le premier concours', createHint: 'Les concours proposés sont relus par l’équipe avant publication.'
    },
    en: {
      hero_t: 'Contests & Rewards', hero_s: 'Enter, get your community to vote and win prizes. Every contest is tracked live.',
      live: 'Live', soon: 'Upcoming', done: 'Ended', discover: 'Discover', myEntries: 'My entries', myContests: 'My contests',
      feat: 'Featured', ends: 'Ends in', starts: 'Starts in', ended: 'Ended', d: 'd', h: 'h', m: 'min', s: 's',
      all: 'All', search: 'Search contests', sort: 'Sort', s_end: 'Ending soon', s_new: 'Newest', s_free: 'Free first', s_prize: 'With prize',
      free: 'Free', paid: 'Entry fee', prize: 'Prize', by: 'By', official: 'Official organizer', participants: 'participants', entries: 'entries',
      empty_live: 'No live contest for this filter.', empty_soon: 'No upcoming contest yet.', empty_done: 'No ended contest.', empty_q: 'No result. Try another word or category.',
      how: 'How it works', h1: 'Enter', h1d: 'Send your photo or video before the deadline.', h2: 'Get votes', h2d: 'Share the link: everyone votes once.', h3: 'Win', h3d: 'The ranking is public and updated live.',
      recent: 'Recently ended', propose: 'Propose a contest', loginNeeded: 'Sign in to see your entries.', login: 'Sign in',
      noEntries: 'You have not entered any contest yet.', noMine: 'You have not proposed a contest yet.', moderate: 'To review', rank: 'Rank', votes: 'votes', vote: 'vote',
      about: 'Overview', people: 'Entries', board: 'Leaderboard', desc: 'Description', timeline: 'Schedule', open: 'Opens', close: 'Closes', results: 'Results', rules: 'Rules',
      r1: 'One entry per person; a new upload replaces the previous one while the contest is open.', r2: 'One vote per entry and per person. You cannot vote for yourself.', r3: 'Photos up to 10 MB, videos up to 100 MB.', r4: 'The ranking is decided by the number of votes at closing.', r5: 'Content breaking the rules may be removed by the team.',
      cal: 'Add to calendar', share: 'Share', back: 'Back', join: 'Enter', joinPaid: 'Enter for', again: 'Edit my entry', joined: 'You are in', login2: 'Sign in to enter',
      closedMsg: 'This contest has ended.', soonMsg: 'This contest has not started yet.', pendingMsg: 'This contest is waiting for team approval.', rejectedMsg: 'This contest was not accepted.',
      pTop: 'Top', pNew: 'Newest', pSearch: 'Search a participant', noPeople: 'No entry yet. Be the first!', voted: 'Voted', yours: 'Your entry', loadErr: 'Could not load entries.', winner: 'Winner', podiumEmpty: 'The leaderboard appears with the first votes.', total: 'votes in total',
      myspace: 'My space', lvl: 'Level', lv1: 'Rookie', lv2: 'Competitor', lv3: 'Challenger', lv4: 'Champion', nextLvl: 'next level in', kpiJoined: 'Contests joined', kpiVotes: 'Votes received', kpiBest: 'Best rank', remind: 'Followed contests ending soon', cats: 'Categories', shareMine: 'Share my entry', cnt: 'contests', saved: 'Following', follow: 'Follow', following: 'Following', soonEnd: 'Ending soon', stats_p: 'Entries', stats_v: 'Votes', stats_d: 'Days left', stats_r: 'Progress', faq: 'FAQ', q1: 'How do I vote?', a1: 'Open the Entries tab and tap “Vote” under the entry you like. One vote per entry and per person.', q2: 'Can I edit my entry?', a2: 'Yes, while the contest is open: a new upload replaces the previous one.', q3: 'When are winners known?', a3: 'At closing, the final ranking is frozen and shown in the Leaderboard tab.', q4: 'How is the ranking computed?', a4: 'By number of votes. On a tie, the older entry ranks first.', wa: 'WhatsApp', copy: 'Copy link', copied: 'Link copied', orgSpace: 'Organizer space', exportCsv: 'Export leaderboard (CSV)', photosAdmin: 'Cover photos', photosHint: 'Tap a category to choose its photo. It shows on every contest of that category without its own image.', exampleC: 'Example contest', organizer: 'Organizer', pending: 'Pending', rejected: 'Rejected', daysLeft: 'days left', progress: 'Progress', moderation: 'Moderation', approve: 'Approve', reject: 'Reject', createFirst: 'Launch the first contest', createHint: 'Proposed contests are reviewed by the team before publishing.'
    }
  };
  function L(k) { var l = lang() === 'en' ? 'en' : 'fr'; return (D[l][k] != null ? D[l][k] : D.fr[k]) || k; }
  function esc(s) { var f = g('escapeHtml'); if (f) return f(s == null ? '' : String(s)); return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tt(k) { try { return t(k); } catch (e) { return k; } }
  function me() { try { return currentUser || null; } catch (e) { return null; } }
  function isAdmin() { var u = me(); try { return !!u && u.uid === ADMIN_UID; } catch (e) { return false; } }
  function cache() { try { return contestsCache || []; } catch (e) { return []; } }
  function status(c) { try { return computeContestStatus(c); } catch (e) { return 'active'; } }
  function mod(c) { return c.status || 'approved'; }
  function dateFmt(v) { try { return new Date(v).toLocaleDateString(lang() === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  function money(n) { return (Number(n) || 0).toFixed(2) + ' $'; }
  function svg(p, s, w) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.9) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', back: '<polyline points="15 18 9 12 15 6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    up: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    check: '<path d="m5 12 5 5 9-10"/>', play: '<path d="M8 5v14l11-7z" fill="currentColor"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>', flag: '<path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/>'
  };
  var CAT = {
    createur: ['#7c3aed', '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'],
    entrepreneur: ['#0f766e', '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'],
    talent: ['#c2410c', '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>'],
    photo: ['#1d4f91', '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>'],
    video: ['#be123c', '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>'],
    vendeur: ['#b45309', '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>'],
    entreprise: ['#475569', '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M14 9h1M14 13h1"/><path d="M9 21v-4h6v4"/>']
  };
  function cat(c) { return CAT[c.category] || ['#1d4f91', IC.trophy]; }
  function followed() { try { return JSON.parse(localStorage.getItem('cn_contest_follow') || '[]'); } catch (e) { return []; } }
  function isFollowed(id) { return followed().indexOf(id) >= 0; }
  function toggleFollow(id) {
    var a = followed(), i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id);
    try { localStorage.setItem('cn_contest_follow', JSON.stringify(a.slice(-100))); } catch (e) { }
  }
  function ph(k) { try { return (window.CNShowcase && window.CNShowcase.photo(k)) || ''; } catch (e) { return ''; } }
  function catLabel(c) { try { var m = CONTEST_CATEGORY_META[c.category]; return m ? tt(m.label) : tt('contest_default_title'); } catch (e) { return ''; } }

  /* ---------- Compte à rebours ---------- */
  function cdParts(ms) {
    if (ms < 0) ms = 0; var s = Math.floor(ms / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function cdBlocks(target) {
    return '<div class="cnc-cd" data-cd="' + esc(target) + '">' +
      [['d', L('d')], ['h', L('h')], ['m', L('m')], ['s', L('s')]].map(function (x) { return '<div class="cnc-cd-b"><b data-u="' + x[0] + '">00</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
  }
  function tick() {
    var els = document.querySelectorAll('[data-cd]');
    if (!els.length) { clearInterval(timer); timer = null; return; }
    els.forEach(function (el) {
      var p = cdParts(new Date(el.getAttribute('data-cd')).getTime() - Date.now());
      ['d', 'h', 'm', 's'].forEach(function (u) { var b = el.querySelector('[data-u="' + u + '"]'); if (b) { var v = pad(p[u]); if (b.textContent !== v) b.textContent = v; } });
    });
  }
  function startTick() { tick(); if (!timer) timer = setInterval(tick, 1000); }
  function timeLabel(c) {
    var st = status(c);
    if (st === 'ended') return L('ended');
    if (st === 'upcoming') { var d0 = Math.max(0, Math.ceil((new Date(c.startDate) - Date.now()) / 864e5)); return L('starts') + ' ' + d0 + L('d'); }
    var ms = new Date(c.endDate).getTime() - Date.now();
    if (!isFinite(ms)) return '';
    var p = cdParts(ms);
    return p.d > 0 ? L('ends') + ' ' + p.d + L('d') + ' ' + p.h + L('h') : L('ends') + ' ' + p.h + L('h') + ' ' + p.m + L('m');
  }
  function progress(c) {
    var a = new Date(c.startDate).getTime(), b = new Date(c.endDate).getTime(), n = Date.now();
    if (!isFinite(a) || !isFinite(b) || b <= a) return 0; return Math.max(0, Math.min(100, Math.round((n - a) / (b - a) * 100)));
  }

  /* ---------- Visuels ---------- */
  function cover(c, big) {
    var k = cat(c), col = k[0];
    var img = c.coverImage || ph('contest_cat_' + (c.category || 'x'));
    if (img) return '<div class="cnc-cover' + (big ? ' big' : '') + '" style="--t:' + col + '"><img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.remove()"><span class="cnc-cover-ico">' + svg(k[1], big ? 44 : 30, 1.5) + '</span></div>';
    return '<div class="cnc-cover art' + (big ? ' big' : '') + '" style="--t:' + col + '"><i class="a"></i><i class="b"></i><i class="c"></i><span class="cnc-cover-ico">' + svg(k[1], big ? 54 : 36, 1.4) + '</span></div>';
  }
  function pill(txt, cls) { return '<span class="cnc-pill ' + (cls || '') + '">' + txt + '</span>'; }
  function statusPill(c) {
    if (mod(c) === 'pending_review') return pill(L('pending'), 'warn');
    if (mod(c) === 'rejected') return pill(L('rejected'), 'bad');
    var st = status(c);
    return st === 'active' ? pill('<i class="dot"></i>' + L('live'), 'ok') : st === 'upcoming' ? pill(L('soon'), 'info') : pill(L('done'), '');
  }
  function feePill(c) { return c.type === 'paid' ? pill(L('paid') + ' ' + money(c.entryFee), 'gold') : pill(L('free'), ''); }
  function organizer(c) {
    var off = false; try { off = (c.organizerUid || ADMIN_UID) === ADMIN_UID; } catch (e) { }
    return off ? L('official') : L('by') + ' ' + esc(c.organizerName || tt('contest_default_participant_name'));
  }

  /* ---------- Carte de concours ---------- */
  function card(c) {
    var st = status(c), k = cat(c);
    return '<article class="cnc-card" data-act="open" data-id="' + esc(c.id) + '" tabindex="0" role="button" aria-label="' + esc(c.title) + '">' +
      cover(c) + '<button type="button" class="cnc-fol' + (isFollowed(c.id) ? ' on' : '') + '" data-act="follow" data-id="' + esc(c.id) + '" aria-label="' + esc(L('follow')) + '">' + svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>', 17) + '</button>' +
      '<div class="cnc-card-b">' +
      '<div class="cnc-row"><span class="cnc-cat" style="--t:' + k[0] + '">' + svg(k[1], 13) + esc(catLabel(c)) + '</span>' + statusPill(c) + '</div>' +
      '<h3 class="cnc-card-t">' + esc(c.title || tt('contest_default_title')) + '</h3>' +
      '<div class="cnc-by">' + organizer(c) + '</div>' +
      (c.prize ? '<div class="cnc-prize">' + svg(IC.gift, 15) + '<span>' + esc(c.prize) + '</span></div>' : '') +
      (st === 'active' ? '<div class="cnc-bar" title="' + L('progress') + '"><i style="width:' + progress(c) + '%"></i></div>' : '') +
      '<div class="cnc-row foot"><span class="cnc-time">' + svg(IC.clock, 14) + esc(timeLabel(c)) + '</span>' + feePill(c) + '</div>' +
      '</div></article>';
  }

  /* ---------- Accueil ---------- */
  function approved() { return cache().filter(function (c) { return mod(c) === 'approved'; }); }
  function featured() {
    var a = approved(), act = a.filter(function (c) { return status(c) === 'active'; });
    act.sort(function (x, y) { return (y.prize ? 1 : 0) - (x.prize ? 1 : 0) || new Date(x.endDate) - new Date(y.endDate); });
    if (act.length) return act[0];
    var up = a.filter(function (c) { return status(c) === 'upcoming'; }).sort(function (x, y) { return new Date(x.startDate) - new Date(y.startDate); });
    return up[0] || null;
  }
  function counts() {
    var a = approved(), r = { active: 0, upcoming: 0, ended: 0 };
    a.forEach(function (c) { r[status(c)]++; }); return r;
  }
  function heroHtml() {
    var n = counts(), f = featured();
    return '<section class="cnc-hero">' +
      '<div class="cnc-hero-art" aria-hidden="true"><svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="60" r="56" fill="#ffffff" opacity=".06"/><circle cx="60" cy="60" r="38" fill="#ffffff" opacity=".07"/><g fill="none" stroke="#e8b64c" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M42 94h36"/><path d="M60 78v16"/><path d="M40 26h40v22a20 20 0 0 1-40 0Z" fill="#e8b64c" fill-opacity=".18"/><path d="M80 30h10a8 8 0 0 1 8 8 16 16 0 0 1-16 16"/><path d="M40 30H30a8 8 0 0 0-8 8 16 16 0 0 0 16 16"/></g><path d="M60 36l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L60 54.4l-7.2 4 1.4-8.1-5.9-5.7 8.1-1.2z" fill="#e8b64c"/></svg></div>' +
      '<h2 class="cnc-hero-t">' + esc(L('hero_t')) + '</h2><p class="cnc-hero-s">' + esc(L('hero_s')) + '</p>' +
      '<div class="cnc-stats">' +
      '<div><b>' + n.active + '</b><span>' + L('live') + '</span></div><div><b>' + n.upcoming + '</b><span>' + L('soon') + '</span></div><div><b>' + n.ended + '</b><span>' + L('done') + '</span></div></div>' +
      (f ? '<div class="cnc-feat" data-act="open" data-id="' + esc(f.id) + '" tabindex="0" role="button">' +
        '<div class="cnc-feat-top"><span class="cnc-feat-tag">' + svg(IC.flag, 13) + L('feat') + '</span><span class="cnc-feat-cat">' + esc(catLabel(f)) + '</span></div>' +
        '<h3>' + esc(f.title) + '</h3>' +
        (f.prize ? '<p class="cnc-feat-prize">' + svg(IC.gift, 15) + esc(f.prize) + '</p>' : '') +
        '<div class="cnc-feat-cd"><small>' + (status(f) === 'upcoming' ? L('starts') : L('ends')) + '</small>' + cdBlocks(status(f) === 'upcoming' ? f.startDate : f.endDate) + '</div>' +
        '</div>' : '') +
      '</section>';
  }
  function tabsHtml() {
    var tabs = [['discover', L('discover')], ['entries', L('myEntries')], ['mine', L('myContests')]];
    return '<div class="cnc-tabs" role="tablist">' + tabs.map(function (x) { return '<button role="tab" aria-selected="' + (S.tab === x[0]) + '" class="' + (S.tab === x[0] ? 'on' : '') + '" data-act="tab" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function catChips() {
    var keys = ['all'].concat(Object.keys(CAT)), a = approved();
    return '<div class="cnc-cats" role="group" aria-label="' + esc(L('cats')) + '">' + keys.map(function (k) {
      var lab = k === 'all' ? L('all') : esc((function () { try { return tt(CONTEST_CATEGORY_META[k].label); } catch (e) { return k; } })());
      var n = k === 'all' ? a.length : a.filter(function (c) { return c.category === k; }).length;
      var col = k === 'all' ? '#14263f' : CAT[k][0], ic = k === 'all' ? IC.trophy : CAT[k][1];
      return '<button class="cnc-ct' + (S.cat === k ? ' on' : '') + '" data-act="cat" data-v="' + k + '" style="--t:' + col + '"><span class="i">' + svg(ic, 22, 1.8) + '</span><b>' + lab + '</b><em>' + n + '</em></button>';
    }).join('') + '</div>';
  }
  function filtersHtml() {
    var n = counts();
    var seg = [['active', L('live'), n.active], ['upcoming', L('soon'), n.upcoming], ['ended', L('done'), n.ended], ['saved', L('saved'), approved().filter(function (c) { return isFollowed(c.id); }).length]];
    return '<div class="cnc-seg">' + seg.map(function (x) { return '<button class="' + (S.status === x[0] ? 'on' : '') + '" data-act="status" data-v="' + x[0] + '">' + x[1] + '<em>' + x[2] + '</em></button>'; }).join('') + '</div>' +
      '<div class="cnc-tools"><label class="cnc-search">' + svg(IC.search, 16) + '<input id="cnc-q" type="search" value="' + esc(S.q) + '" placeholder="' + esc(L('search')) + '" autocomplete="off" maxlength="60"></label>' +
      '<select id="cnc-sort" aria-label="' + esc(L('sort')) + '">' + [['end', L('s_end')], ['new', L('s_new')], ['free', L('s_free')], ['prize', L('s_prize')]].map(function (x) { return '<option value="' + x[0] + '"' + (S.sort === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
      catChips();
  }
  function listFiltered() {
    var q = S.q.trim().toLowerCase();
    var r = approved().filter(function (c) {
      if (S.status === 'saved' ? !isFollowed(c.id) : status(c) !== S.status) return false;
      if (S.cat !== 'all' && c.category !== S.cat) return false;
      if (q && ((c.title || '') + ' ' + (c.description || '') + ' ' + (c.prize || '') + ' ' + (c.organizerName || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var ts = function (c) { return new Date(c.startDate).getTime() || 0; }, te = function (c) { var v = new Date(c.endDate).getTime(); return isFinite(v) ? v : 9e15; };
    r.sort(function (a, b) {
      if (S.sort === 'new') return ts(b) - ts(a);
      if (S.sort === 'free') return (a.type === 'paid' ? 1 : 0) - (b.type === 'paid' ? 1 : 0) || te(a) - te(b);
      if (S.sort === 'prize') return (b.prize ? 1 : 0) - (a.prize ? 1 : 0) || te(a) - te(b);
      return S.status === 'ended' ? te(b) - te(a) : te(a) - te(b);
    });
    return r;
  }
  function resultsHtml() {
    var r = listFiltered();
    if (!r.length) {
      var m = S.q || S.cat !== 'all' ? L('empty_q') : S.status === 'active' ? L('empty_live') : S.status === 'upcoming' ? L('empty_soon') : S.status === 'saved' ? L('follow') + ' ✦' : L('empty_done');
      return '<div class="cnc-empty">' + svg(IC.trophy, 34, 1.4) + '<p>' + esc(m) + '</p></div>' + exampleCard();
    }
    return '<div class="cnc-grid">' + r.map(card).join('') + '</div>';
  }
  function exampleCard() {
    var en = lang() === 'en', u = ph('contest_example'), k = cat({ category: 'photo' });
    var cov = u ? '<div class="cnc-cover" style="--t:#1d4f91"><img src="' + esc(u) + '" alt="" loading="lazy" onerror="this.remove()"><span class="cnc-cover-ico">' + svg(k[1], 30, 1.5) + '</span></div>'
      : '<div class="cnc-cover art" style="--t:#1d4f91"><i class="a"></i><i class="b"></i><i class="c"></i><span class="cnc-cover-ico">' + svg(k[1], 36, 1.4) + '</span></div>';
    var adm = isAdmin() ? '<span class="cnx-adm"><button type="button" data-cnx-photo="contest_example" aria-label="Photo">' + svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>', 16) + '</button></span>' : '';
    return '<h3 class="cnc-h">' + L('exampleC') + '</h3><article class="cnc-card" data-cnx-open="contests-example|0" tabindex="0" role="button">' + cov + adm +
      '<div class="cnc-card-b"><div class="cnc-row"><span class="cnc-cat" style="--t:#1d4f91">' + svg(k[1], 13) + (en ? 'Best photo' : 'Meilleure photo') + '</span>' + pill(en ? 'Example' : 'Exemple', '') + '</div>' +
      '<h3 class="cnc-card-t">' + (en ? 'Best photo of the city' : 'Meilleure photo de la ville') + '</h3><div class="cnc-by">' + (en ? 'Sample template' : 'Modèle d’exemple') + '</div>' +
      '<div class="cnc-prize">' + svg(IC.gift, 15) + '<span>' + (en ? '$200 + trophy' : '200 $ + trophée') + '</span></div>' +
      '<div class="cnc-row foot"><span class="cnc-time">' + svg(IC.clock, 14) + (en ? 'Ends in 14 days' : 'Se termine dans 14 j') + '</span>' + pill(L('free'), '') + '</div></div></article><p class="cnc-hint">' + esc(L('createHint')) + '</p>' + proposeBtn();
  }
  function howHtml() {
    var st = [[IC.send, L('h1'), L('h1d')], [IC.up, L('h2'), L('h2d')], [IC.trophy, L('h3'), L('h3d')]];
    return '<h3 class="cnc-h">' + L('how') + '</h3><div class="cnc-how">' + st.map(function (x, i) {
      return '<div class="cnc-how-i"><span class="n">' + (i + 1) + '</span><span class="ic">' + svg(x[0], 20) + '</span><b>' + esc(x[1]) + '</b><p>' + esc(x[2]) + '</p></div>';
    }).join('') + '</div>';
  }
  function remindHtml() {
    var r = approved().filter(function (c) { var m = new Date(c.endDate) - Date.now(); return isFollowed(c.id) && status(c) === 'active' && m > 0 && m < 2 * 864e5; });
    if (!r.length) return '';
    return '<div class="cnc-remind">' + svg(IC.clock, 18) + '<div><b>' + L('remind') + '</b>' + r.map(function (c) { return '<a data-act="open" data-id="' + esc(c.id) + '" tabindex="0" role="button">' + esc(c.title) + ' · ' + esc(timeLabel(c)) + '</a>'; }).join('') + '</div></div>';
  }
  function spaceHtml() {
    var arr = S.mine || [], n = arr.length, votes = arr.reduce(function (s0, e) { return s0 + (e.votesCount || 0); }, 0);
    var best = 0; arr.forEach(function (e) { var rk = ranked(e.contestId); var i = rk.map(function (z) { return z.id; }).indexOf(e.id); if (i >= 0 && (!best || i + 1 < best)) best = i + 1; });
    var pts = n * 10 + votes, lv = pts >= 150 ? 4 : pts >= 60 ? 3 : pts >= 20 ? 2 : 1, th = [0, 20, 60, 150], next = lv < 4 ? th[lv] : 0;
    var pct = lv >= 4 ? 100 : Math.round((pts - th[lv - 1]) / (th[lv] - th[lv - 1]) * 100);
    return '<div class="cnc-space"><div class="cnc-space-h"><span class="lv">' + svg(IC.trophy, 22, 1.8) + '</span><div><small>' + L('myspace') + '</small><b>' + L('lvl') + ' ' + lv + ' · ' + L('lv' + lv) + '</b></div></div>' +
      '<div class="cnc-bar"><i style="width:' + pct + '%"></i></div>' + (next ? '<p class="cnc-hint">' + L('nextLvl') + ' ' + Math.max(0, next - pts) + ' pts</p>' : '') +
      '<div class="cnc-kpis"><div><b>' + n + '</b><span>' + L('kpiJoined') + '</span></div><div><b>' + votes + '</b><span>' + L('kpiVotes') + '</span></div><div><b>' + (best ? '#' + best : '—') + '</b><span>' + L('kpiBest') + '</span></div></div></div>';
  }
  function soonHtml() {
    if (S.status === 'ended') return '';
    var r = approved().filter(function (c) { var m = new Date(c.endDate) - Date.now(); return status(c) === 'active' && m > 0 && m < 3 * 864e5; }).slice(0, 8);
    if (!r.length) return '';
    return '<h3 class="cnc-h">' + L('soonEnd') + '</h3><div class="cnc-strip">' + r.map(function (c) {
      return '<div class="cnc-mini hot" data-act="open" data-id="' + esc(c.id) + '" tabindex="0" role="button"><span class="ic" style="--t:' + cat(c)[0] + '">' + svg(IC.clock, 18) + '</span><b>' + esc(c.title) + '</b><small>' + esc(timeLabel(c)) + '</small></div>';
    }).join('') + '</div>';
  }
  function recentHtml() {
    var r = approved().filter(function (c) { return status(c) === 'ended'; }).sort(function (a, b) { return new Date(b.endDate) - new Date(a.endDate); }).slice(0, 8);
    if (!r.length || S.status === 'ended') return '';
    return '<h3 class="cnc-h">' + L('recent') + '</h3><div class="cnc-strip">' + r.map(function (c) {
      return '<div class="cnc-mini" data-act="open" data-id="' + esc(c.id) + '" tabindex="0" role="button"><span class="ic" style="--t:' + cat(c)[0] + '">' + svg(IC.trophy, 18) + '</span><b>' + esc(c.title) + '</b><small>' + esc(c.prize || catLabel(c)) + '</small></div>';
    }).join('') + '</div>';
  }
  function proposeBtn() {
    return '<button class="cnc-propose" data-act="propose">' + svg(IC.plus, 18, 2.2) + '<span>' + L('propose') + '</span></button>';
  }

  function listsForMe() {
    var u = me(); if (!u) return '<div class="cnc-empty"><p>' + esc(L('loginNeeded')) + '</p><button class="cnc-btn pri" data-act="login">' + L('login') + '</button></div>';
    return null;
  }
  function entriesTab() {
    var x = listsForMe(); if (x) return x;
    if (!S.mineLoaded) return '<div class="cnc-skel"></div><div class="cnc-skel"></div>';
    var arr = S.mine || [];
    if (!arr.length) return spaceHtml() + '<div class="cnc-empty">' + svg(IC.send, 34, 1.4) + '<p>' + esc(L('noEntries')) + '</p><button class="cnc-btn pri" data-act="goDiscover">' + L('discover') + '</button></div>';
    return spaceHtml() + '<div class="cnc-grid">' + arr.map(function (e) {
      var c = cache().filter(function (z) { return z.id === e.contestId; })[0];
      if (!c) return '';
      return card(c).replace('</article>', '<div class="cnc-mine"><span>' + svg(IC.up, 14) + (e.votesCount || 0) + ' ' + ((e.votesCount || 0) === 1 ? L('vote') : L('votes')) + '</span><span>' + esc(e.name || '') + '</span></div></article>');
    }).join('') + '</div>';
  }
  function photosPanel() {
    return '<h3 class="cnc-h">' + L('photosAdmin') + '</h3><p class="cnc-hint">' + esc(L('photosHint')) + '</p><div class="cnc-phg">' + Object.keys(CAT).concat(['example']).map(function (k) {
      var key = k === 'example' ? 'contest_example' : 'contest_cat_' + k, u = ph(key), col = k === 'example' ? '#1d4f91' : CAT[k][0];
      var lab = k === 'example' ? L('exampleC') : (function () { try { return tt(CONTEST_CATEGORY_META[k].label); } catch (e) { return k; } })();
      return '<button type="button" class="cnc-ph" data-cnx-photo="' + key + '" style="--t:' + col + '">' + (u ? '<img src="' + esc(u) + '" alt="">' : svg(k === 'example' ? IC.trophy : CAT[k][1], 22)) + '<span>' + esc(lab) + '</span></button>';
    }).join('') + '</div>';
  }
  function mineTab() {
    var x = listsForMe(); if (x) return x;
    var u = me(), mine = cache().filter(function (c) { return c.organizerUid === u.uid; });
    var out = proposeBtn() + '<p class="cnc-hint">' + esc(L('createHint')) + '</p>';
    if (isAdmin()) out += photosPanel();
    if (isAdmin()) {
      var pend = cache().filter(function (c) { return mod(c) === 'pending_review'; });
      if (pend.length) out += '<h3 class="cnc-h">' + L('moderate') + ' (' + pend.length + ')</h3><div class="cnc-grid">' + pend.map(card).join('') + '</div>';
    }
    if (!mine.length) return out + '<div class="cnc-empty">' + svg(IC.trophy, 34, 1.4) + '<p>' + esc(L('noMine')) + '</p></div>';
    return out + '<div class="cnc-grid">' + mine.map(card).join('') + '</div>';
  }

  function paint() {
    var host = document.getElementById('contests-list'); if (!host) return;
    host.classList.add('cnc-root');
    var body;
    if (S.tab === 'discover') body = remindHtml() + filtersHtml() + '<div id="cnc-results">' + resultsHtml() + '</div>' + soonHtml() + recentHtml() + howHtml();
    else if (S.tab === 'entries') body = '<div id="cnc-results">' + entriesTab() + '</div>';
    else body = '<div id="cnc-results">' + mineTab() + '</div>';
    host.innerHTML = heroHtml() + tabsHtml() + '<div class="cnc-body">' + body + '</div>';
    startTick();
  }
  function paintResults() {
    var el = document.getElementById('cnc-results'); if (!el) return paint();
    el.innerHTML = resultsHtml();
  }
  function loadMine() {
    var u = me(); S.mineLoaded = false; S.mine = null;
    if (!u) { S.mineLoaded = true; return; }
    try {
      db.collection('contest_entries').where('uid', '==', u.uid).limit(50).get().then(function (snap) {
        S.mine = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        S.mineLoaded = true; if (S.tab === 'entries') paint();
      }).catch(function () { S.mine = []; S.mineLoaded = true; if (S.tab === 'entries') paint(); });
    } catch (e) { S.mine = []; S.mineLoaded = true; }
  }

  /* ---------- Détail ---------- */
  function ensureDetail() {
    var el = document.getElementById('cnc-detail');
    if (!el) { el = document.createElement('div'); el = Object.assign(el, { id: 'cnc-detail' }); el.className = 'cnc-detail cnc-root'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); document.documentElement.classList.add('cnc-lock'); }
    return el;
  }
  function closeDetail() { var el = document.getElementById('cnc-detail'); if (el) el.remove(); document.documentElement.classList.remove('cnc-lock'); S.d = null; }
  function entriesOf(id) { try { return (contestEntriesCache[id] || []); } catch (e) { return []; } }
  function ranked(id) {
    return entriesOf(id).slice().sort(function (a, b) { return (b.votesCount || 0) - (a.votesCount || 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')); });
  }
  function myEntry(id) { var u = me(); return u ? entriesOf(id).filter(function (e) { return e.uid === u.uid; })[0] : null; }
  function voted(id, eid) { var u = me(); try { return !!u && contestMyVotesCache && contestMyVotesCache.has(id + '_' + eid + '_' + u.uid); } catch (e) { return false; } }

  function ctaHtml(c) {
    var st = status(c), m = mod(c), u = me();
    if (m === 'pending_review') return '<p class="cnc-note">' + esc(L('pendingMsg')) + '</p>';
    if (m === 'rejected') return '<p class="cnc-note">' + esc(L('rejectedMsg')) + '</p>';
    if (st === 'ended') return '<p class="cnc-note">' + esc(L('closedMsg')) + '</p>';
    if (st === 'upcoming') return '<p class="cnc-note">' + esc(L('soonMsg')) + '</p>';
    if (!u) return '<button class="cnc-btn pri full" data-act="login">' + L('login2') + '</button>';
    var mine = myEntry(c.id), paid = c.type === 'paid';
    var lab = mine ? L('again') : paid ? L('joinPaid') + ' ' + money(c.entryFee) : L('join');
    return '<button class="cnc-btn pri full" data-act="join" data-id="' + esc(c.id) + '">' + svg(mine ? IC.check : IC.send, 18, 2) + '<span>' + lab + '</span></button>';
  }
  function faqHtml() {
    return '<div class="cnc-block"><h4>' + L('faq') + '</h4>' + [1, 2, 3, 4].map(function (i) { return '<div class="cnc-faq"><button type="button" data-act="faq">' + esc(L('q' + i)) + svg('<polyline points="6 9 12 15 18 9"/>', 16) + '</button><p>' + esc(L('a' + i)) + '</p></div>'; }).join('') + '</div>';
  }
  function orgHtml(c) {
    var u = me(); if (!u || !(isAdmin() || c.organizerUid === u.uid)) return '';
    return '<div class="cnc-block"><h4>' + L('orgSpace') + '</h4><button class="cnc-btn full" data-act="csv" data-id="' + esc(c.id) + '">' + svg('<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 21h16"/>', 17) + L('exportCsv') + '</button></div>';
  }
  function statsHtml(c) {
    var rk = ranked(c.id), tot = rk.reduce(function (s, e) { return s + (e.votesCount || 0); }, 0), ms = new Date(c.endDate) - Date.now();
    var days = status(c) === 'ended' ? 0 : Math.max(0, Math.ceil(ms / 864e5)); if (!isFinite(days)) days = 0;
    return '<div class="cnc-kpis"><div><b>' + rk.length + '</b><span>' + L('stats_p') + '</span></div><div><b>' + tot + '</b><span>' + L('stats_v') + '</span></div><div><b>' + days + '</b><span>' + L('stats_d') + '</span></div></div>';
  }
  function aboutPanel(c) {
    var st = status(c), rules = ['r1', 'r2', 'r3', 'r4', 'r5'];
    var tl = [[L('open'), c.startDate, st !== 'upcoming'], [L('close'), c.endDate, st === 'ended'], [L('results'), c.endDate, st === 'ended']];
    var modHtml = (isAdmin() && mod(c) === 'pending_review') ? '<div class="cnc-block warn"><h4>' + L('moderation') + '</h4><div class="cnc-two"><button class="cnc-btn pri" data-act="approve" data-id="' + esc(c.id) + '">' + L('approve') + '</button><button class="cnc-btn" data-act="reject" data-id="' + esc(c.id) + '">' + L('reject') + '</button></div></div>' : '';
    var mine = myEntry(c.id);
    var mineHtml = mine ? '<div class="cnc-block ok"><h4>' + svg(IC.check, 16, 2.2) + L('joined') + '</h4><p>' + esc(mine.name || '') + ' · ' + (mine.votesCount || 0) + ' ' + ((mine.votesCount || 0) === 1 ? L('vote') : L('votes')) + ' · ' + L('rank') + ' ' + (ranked(c.id).indexOf(mine) + 1) + '</p></div>' : '';
    return modHtml + statsHtml(c) + mineHtml +
      (c.prize ? '<div class="cnc-prizebox"><span class="ic">' + svg(IC.gift, 22) + '</span><div><small>' + L('prize') + '</small><b>' + esc(c.prize) + '</b></div></div>' : '') +
      (c.description ? '<div class="cnc-block"><h4>' + L('desc') + '</h4><p class="cnc-desc">' + esc(c.description) + '</p></div>' : '') +
      '<div class="cnc-block"><h4>' + L('timeline') + '</h4><ol class="cnc-tl">' + tl.map(function (x) { return '<li class="' + (x[2] ? 'done' : '') + '"><i></i><div><b>' + x[0] + '</b><span>' + esc(dateFmt(x[1])) + '</span></div></li>'; }).join('') + '</ol></div>' +
      '<div class="cnc-block"><h4>' + L('rules') + '</h4><ul class="cnc-rules">' + rules.map(function (k) { return '<li>' + svg(IC.shield, 15) + '<span>' + esc(L(k)) + '</span></li>'; }).join('') + '</ul></div>' +
      '<div class="cnc-block"><h4>' + L('organizer') + '</h4><p>' + organizer(c) + '</p></div>' +
      faqHtml() + orgHtml(c) +
      '<div class="cnc-two"><button class="cnc-btn" data-act="ics" data-id="' + esc(c.id) + '">' + svg(IC.cal, 17) + L('cal') + '</button><button class="cnc-btn" data-act="share" data-id="' + esc(c.id) + '">' + svg(IC.share, 17) + L('share') + '</button></div>' +
      '<div class="cnc-two"><button class="cnc-btn" data-act="wa" data-id="' + esc(c.id) + '">' + svg('<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.3A8.5 8.5 0 1 1 21 11.5Z"/>', 17) + L('wa') + '</button><button class="cnc-btn" data-act="copy" data-id="' + esc(c.id) + '">' + svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', 17) + L('copy') + '</button></div>';
  }
  function mediaHtml(e) {
    if (!e.submissionUrl) return '';
    var u = esc(e.submissionUrl);
    if (e.submissionType === 'image') return '<div class="cnc-media" data-act="media" data-url="' + u + '" data-type="image"><img src="' + u + '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'bad\')"></div>';
    if (e.submissionType === 'video') return '<div class="cnc-media" data-act="media" data-url="' + u + '" data-type="video"><video src="' + u + '#t=0.1" muted playsinline preload="metadata"></video><span class="pl">' + svg(IC.play, 22) + '</span></div>';
    return '<a class="cnc-btn sm" href="' + u + '" target="_blank" rel="noopener noreferrer">' + esc(tt('contest_view_entry_btn')) + '</a>';
  }
  function entryCard(c, e, rank) {
    var u = me(), st = status(c), own = u && e.uid === u.uid, did = voted(c.id, e.id);
    var can = u && st === 'active' && !own;
    var n = e.votesCount || 0;
    return '<div class="cnc-entry' + (own ? ' own' : '') + '">' + mediaHtml(e) +
      '<div class="cnc-entry-b"><div class="cnc-entry-h"><span class="rk">#' + rank + '</span><b>' + esc(e.name || tt('contest_default_participant_name')) + '</b>' + (own ? pill(L('yours'), 'info') : '') + '</div>' +
      (e.caption ? '<p>' + esc(e.caption) + '</p>' : '') +
      '<div class="cnc-entry-f"><span class="v">' + svg(IC.up, 15) + n + ' ' + (n === 1 ? L('vote') : L('votes')) + '</span>' +
      (own ? '<button class="cnc-btn sm" data-act="share" data-id="' + esc(c.id) + '">' + svg(IC.share, 15) + L('shareMine') + '</button>' : '') +
      (can ? '<button class="cnc-btn sm ' + (did ? '' : 'pri') + '" ' + (did ? 'disabled' : '') + ' data-act="vote" data-id="' + esc(c.id) + '" data-e="' + esc(e.id) + '">' + svg(IC.up, 15) + (did ? L('voted') : tt('contest_vote_btn')) + '</button>' : '') + '</div></div></div>';
  }
  function peoplePanel(c) {
    var all = S.dSort === 'new' ? entriesOf(c.id).slice().sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }) : ranked(c.id);
    var rk = ranked(c.id), q = S.dQ.trim().toLowerCase();
    var list = q ? all.filter(function (e) { return ((e.name || '') + ' ' + (e.caption || '')).toLowerCase().indexOf(q) >= 0; }) : all;
    var head = '<div class="cnc-tools"><label class="cnc-search">' + svg(IC.search, 16) + '<input id="cnc-dq" type="search" value="' + esc(S.dQ) + '" placeholder="' + esc(L('pSearch')) + '" maxlength="40" autocomplete="off"></label>' +
      '<div class="cnc-seg mini"><button class="' + (S.dSort === 'top' ? 'on' : '') + '" data-act="dsort" data-v="top">' + L('pTop') + '</button><button class="' + (S.dSort === 'new' ? 'on' : '') + '" data-act="dsort" data-v="new">' + L('pNew') + '</button></div></div>';
    if (!all.length) return head + '<div class="cnc-empty">' + svg(IC.users, 34, 1.4) + '<p>' + esc(L('noPeople')) + '</p></div>';
    return head + '<div id="cnc-plist" class="cnc-elist">' + list.map(function (e) { return entryCard(c, e, rk.indexOf(e) + 1); }).join('') + '</div>';
  }
  function podiumHtml(c, rk) {
    var order = [rk[1], rk[0], rk[2]], pos = [2, 1, 3];
    return '<div class="cnc-podium">' + order.map(function (e, i) {
      var p = pos[i];
      if (!e) return '<div class="cnc-pod p' + p + ' empty"><div class="av"></div><div class="bar"><b>' + p + '</b></div></div>';
      var ini = esc((e.name || '?').trim().charAt(0).toUpperCase());
      var img = e.submissionType === 'image' && e.submissionUrl ? '<img src="' + esc(e.submissionUrl) + '" alt="" loading="lazy" onerror="this.remove()">' : '';
      return '<div class="cnc-pod p' + p + '"><div class="av">' + (p === 1 ? '<span class="crown">' + svg(IC.trophy, 16, 2) + '</span>' : '') + img + '<i>' + ini + '</i></div><span class="nm">' + esc(e.name || '') + '</span><span class="vt">' + (e.votesCount || 0) + ' ' + L('votes') + '</span><div class="bar"><b>' + p + '</b></div></div>';
    }).join('') + '</div>';
  }
  function boardPanel(c) {
    var rk = ranked(c.id);
    if (!rk.length) return '<div class="cnc-empty">' + svg(IC.trophy, 34, 1.4) + '<p>' + esc(L('podiumEmpty')) + '</p></div>';
    var tot = rk.reduce(function (s, e) { return s + (e.votesCount || 0); }, 0), max = Math.max(1, rk[0].votesCount || 0);
    var win = status(c) === 'ended' ? '<div class="cnc-block ok"><h4>' + svg(IC.trophy, 16, 2) + L('winner') + '</h4><p>' + esc(rk[0].name || '') + ' · ' + (rk[0].votesCount || 0) + ' ' + L('votes') + '</p></div>' : '';
    return win + podiumHtml(c, rk) + '<p class="cnc-hint c">' + tot + ' ' + L('total') + '</p><div class="cnc-lb">' + rk.map(function (e, i) {
      var u = me(), own = u && e.uid === u.uid;
      return '<div class="cnc-lb-r' + (own ? ' own' : '') + '"><span class="n">' + (i + 1) + '</span><div class="m"><b>' + esc(e.name || '') + '</b><div class="bar"><i style="width:' + Math.round((e.votesCount || 0) / max * 100) + '%"></i></div></div><span class="v">' + (e.votesCount || 0) + '</span></div>';
    }).join('') + '</div>';
  }
  function paintDetail() {
    var c = cache().filter(function (x) { return x.id === S.d; })[0]; if (!c) return;
    var el = ensureDetail(), k = cat(c), n = entriesOf(c.id).length, st = status(c);
    var tabs = [['about', L('about')], ['people', L('people') + (n ? ' · ' + n : '')], ['board', L('board')]];
    var panel = S.dTab === 'people' ? peoplePanel(c) : S.dTab === 'board' ? boardPanel(c) : aboutPanel(c);
    var scroll = el.querySelector('.cnc-d-scroll'), top = scroll ? scroll.scrollTop : 0;
    el.innerHTML =
      '<div class="cnc-d-bar"><button class="cnc-ib" data-act="close" aria-label="' + esc(L('back')) + '">' + svg(IC.back, 22, 2.2) + '</button><span>' + esc(catLabel(c)) + '</span><span class="cnc-bar-r"><button class="cnc-ib' + (isFollowed(c.id) ? ' on' : '') + '" data-act="follow" data-id="' + esc(c.id) + '" aria-label="' + esc(L('follow')) + '">' + svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>', 20) + '</button><button class="cnc-ib" data-act="share" data-id="' + esc(c.id) + '" aria-label="' + esc(L('share')) + '">' + svg(IC.share, 20) + '</button></span></div>' +
      '<div class="cnc-d-scroll">' + cover(c, true) +
      '<div class="cnc-d-head"><div class="cnc-row">' + statusPill(c) + feePill(c) + '</div><h2>' + esc(c.title) + '</h2><div class="cnc-by">' + organizer(c) + '</div>' +
      (st !== 'ended' ? '<div class="cnc-d-cd"><small>' + (st === 'upcoming' ? L('starts') : L('ends')) + '</small>' + cdBlocks(st === 'upcoming' ? c.startDate : c.endDate) + '</div>' : '') +
      (st === 'active' ? '<div class="cnc-bar"><i style="width:' + progress(c) + '%"></i></div>' : '') + '</div>' +
      '<div class="cnc-tabs in" role="tablist">' + tabs.map(function (x) { return '<button role="tab" aria-selected="' + (S.dTab === x[0]) + '" class="' + (S.dTab === x[0] ? 'on' : '') + '" data-act="dtab" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="cnc-d-panel">' + panel + '</div></div>' +
      '<div class="cnc-d-cta">' + ctaHtml(c) + '</div>';
    var sc = el.querySelector('.cnc-d-scroll'); if (sc && top) sc.scrollTop = top;
    el.style.setProperty('--t', k[0]);
    startTick();
  }
  function openDetail(id) {
    var c = cache().filter(function (x) { return x.id === id; })[0]; if (!c) return;
    S.d = id; S.dTab = 'about'; S.dSort = 'top'; S.dQ = '';
    paintDetail();
    window.loadContestEntries(id, status(c));
  }

  /* ---------- Calendrier (.ics) ---------- */
  function ics(c) {
    function f(v) { return new Date(v).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    function e(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (m) { return '\\' + m; }); }
    var url = location.origin + location.pathname + '?concours=' + c.id;
    var s = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Coeurnoh//Concours//FR', 'BEGIN:VEVENT', 'UID:' + c.id + '@coeurnoh', 'DTSTAMP:' + f(Date.now()), 'DTSTART:' + f(c.endDate || Date.now()), 'DTEND:' + f((new Date(c.endDate || Date.now()).getTime()) + 36e5),
      'SUMMARY:' + e(c.title + ' — ' + L('close')), 'DESCRIPTION:' + e((c.prize ? L('prize') + ' : ' + c.prize + '\n' : '') + url), 'URL:' + url,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(c.title), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    try {
      var b = new Blob([s], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'concours.ics'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    } catch (er) { try { showToast(friendlyErrorMessage(er), 'error'); } catch (e2) { } }
  }

  function toast(m, ty) { try { showToast(m, ty || 'info'); } catch (e) { } }
  function csv(c) {
    var rk = ranked(c.id), q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['rang', 'nom', 'votes', 'date', 'media'].map(q).join(',')].concat(rk.map(function (e, i) { return [i + 1, e.name, e.votesCount || 0, e.createdAt || '', e.submissionUrl || ''].map(q).join(','); }));
    try {
      var b = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'classement-' + c.id + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    } catch (e) { }
  }
  /* ---------- Actions ---------- */
  function act(ev) {
    var el = ev.target.closest && ev.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act'), id = el.getAttribute('data-id'), v = el.getAttribute('data-v');
    var c = id ? cache().filter(function (x) { return x.id === id; })[0] : null;
    switch (a) {
      case 'open': if (id) openDetail(id); break;
      case 'tab': S.tab = v; if (v === 'entries') loadMine(); paint(); break;
      case 'goDiscover': S.tab = 'discover'; paint(); break;
      case 'status': S.status = v; paint(); break;
      case 'cat': S.cat = v; paint(); break;
      case 'propose': try { openContestForm(); } catch (e) { } break;
      case 'login': try { openAuth('login'); } catch (e) { } break;
      case 'follow': ev.stopPropagation(); toggleFollow(id); if (S.d) paintDetail(); paint(); break;
      case 'wa': if (c) { var u2 = location.origin + location.pathname + '?concours=' + c.id; window.open('https://wa.me/?text=' + encodeURIComponent((c.title || '') + ' ' + u2), '_blank', 'noopener'); } break;
      case 'copy': if (c) { var u3 = location.origin + location.pathname + '?concours=' + c.id; try { navigator.clipboard.writeText(u3).then(function () { toast(L('copied'), 'success'); }); } catch (e) { } } break;
      case 'csv': if (c) csv(c); break;
      case 'faq': el.parentNode.classList.toggle('open'); break;
      case 'close': closeDetail(); break;
      case 'dtab': S.dTab = v; paintDetail(); break;
      case 'dsort': S.dSort = v; paintDetail(); break;
      case 'share': if (c) { try { shareContest(c.id, c.title || ''); } catch (e) { } } break;
      case 'ics': if (c) ics(c); break;
      case 'join': if (c) { try { openContestEntryForm(c.id, c.type === 'paid', c.entryFee || 0); } catch (e) { } } break;
      case 'vote': try { voteForEntry(id, el.getAttribute('data-e')); } catch (e) { } break;
      case 'approve': try { approveContest(id); } catch (e) { } break;
      case 'reject': try { rejectContest(id); } catch (e) { } break;
      case 'media': try { openMediaViewer(el.getAttribute('data-url'), el.getAttribute('data-type')); } catch (e) { } break;
    }
  }
  function key(ev) { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[role=button][data-act]')) { ev.preventDefault(); act(ev); } if (ev.key === 'Escape' && document.getElementById('cnc-detail') && !document.querySelector('.modal-overlay')) closeDetail(); }
  function input(ev) {
    var t0 = ev.target;
    if (t0.id === 'cnc-q') { S.q = t0.value; paintResults(); }
    else if (t0.id === 'cnc-sort') { S.sort = t0.value; paintResults(); }
    else if (t0.id === 'cnc-dq') {
      S.dQ = t0.value; var c = cache().filter(function (x) { return x.id === S.d; })[0]; if (!c) return;
      var list = document.getElementById('cnc-plist'); if (!list) return;
      var rk = ranked(c.id), q = S.dQ.trim().toLowerCase();
      var all = S.dSort === 'new' ? entriesOf(c.id).slice().sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }) : rk;
      list.innerHTML = all.filter(function (e) { return !q || ((e.name || '') + ' ' + (e.caption || '')).toLowerCase().indexOf(q) >= 0; }).map(function (e) { return entryCard(c, e, rk.indexOf(e) + 1); }).join('');
    }
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest && (ev.target.closest('#contests-list') || ev.target.closest('#cnc-detail'))) { if (ev.target.closest('[data-act]')) ev.stopPropagation(); act(ev); }
  }, true);
  /* Geste « retour » : ferme d'abord la page de concours au lieu de quitter l'écran */
  (function () {
    var orig = window.closeTopmostOverlay;
    window.closeTopmostOverlay = function () {
      if (typeof orig === 'function' && orig()) return true;
      if (document.getElementById('cnc-detail')) { closeDetail(); return true; }
      return false;
    };
  })();
  document.addEventListener('keydown', key);
  document.addEventListener('cn-showcase-photos', function () { try { if (document.getElementById('contests-list') && document.getElementById('contests-list').children.length && cache().length) { paint(); if (S.d) paintDetail(); } } catch (e) { } });
  document.addEventListener('input', input);
  document.addEventListener('change', input);

  /* ---------- Remplacement des fonctions existantes ---------- */
  var origApprove = g('approveContest'), origReject = g('rejectContest');
  window.openContestsScreen = function () {
    try { showMenuScreen('contests'); } catch (e) { }
    S.tab = 'discover'; closeDetail();
    var host = document.getElementById('contests-list');
    if (host) { host.classList.add('cnc-root'); host.innerHTML = '<div class="cnc-skel hero"></div><div class="cnc-skel"></div><div class="cnc-skel"></div>'; }
    loadContests();
  };
  window.renderContestsList = function () { var cc = null; try { cc = contestsCache; } catch (e) { } if (!cc) return; paint(); if (S.d) paintDetail(); };
  window.setContestStatusFilter = function (s) { if (s === 'active' || s === 'upcoming' || s === 'ended') { S.status = s; S.tab = 'discover'; } else { S.tab = 'mine'; } paint(); };
  window.viewContest = function (id) { openDetail(id); };
  window.loadContestEntries = async function (contestId, st) {
    try {
      var snap = await db.collection('contest_entries').where('contestId', '==', contestId).limit(100).get();
      contestEntriesCache[contestId] = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.votesCount || 0) - (a.votesCount || 0); });
      var u = me();
      if (u) {
        if (!contestMyVotesCache) contestMyVotesCache = new Set();
        if (!contestMyVotesCache.has('__loaded_' + contestId)) {
          try {
            var vs = await db.collection('contest_votes').where('contestId', '==', contestId).where('uid', '==', u.uid).limit(200).get();
            vs.forEach(function (v) { contestMyVotesCache.add(contestId + '_' + v.data().entryId + '_' + u.uid); });
            contestMyVotesCache.add('__loaded_' + contestId);
          } catch (e) { /* votes illisibles : on continue sans */ }
        }
      }
      if (S.d === contestId) paintDetail();
    } catch (e) {
      if (S.d === contestId) { var p = document.querySelector('#cnc-detail .cnc-d-panel'); if (S.dTab !== 'about' && p) p.innerHTML = '<div class="cnc-empty"><p>' + esc(L('loadErr')) + '</p></div>'; }
    }
  };
  if (origApprove) window.approveContest = async function (id) { await origApprove(id); closeDetail(); };
  if (origReject) window.rejectContest = async function (id) { await origReject(id); closeDetail(); };

  /* ---------- Styles ---------- */
  var css = [
    '#contest-create-btn,#contest-status-tabs{display:none!important}',
    '.cnc-lock{overflow:hidden}',
    '.cnc-root{color:var(--cnh-ink,#111827);font-family:var(--cnh-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);font-size:.9375rem;line-height:1.5;-webkit-font-smoothing:antialiased}',
    '.cnc-root *{box-sizing:border-box}',
    '.cnc-root button{font-family:inherit}',
    '.cnc-hero{position:relative;overflow:hidden;background:#14263f;color:#fff;border-radius:18px;padding:20px 18px 18px;margin:0 0 14px}',
    '.cnc-hero-art{position:absolute;right:-10px;top:-6px;opacity:.95;pointer-events:none}',
    '.cnc-hero-t{margin:0 90px 6px 0;font-size:1.375rem;font-weight:700;letter-spacing:-.015em;line-height:1.2}',
    '.cnc-hero-s{margin:0 70px 16px 0;font-size:.8125rem;line-height:1.5;color:rgba(255,255,255,.72)}',
    '.cnc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}',
    '.cnc-stats div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 6px;text-align:center}',
    '.cnc-stats b{display:block;font-size:1.25rem;font-weight:700;line-height:1.1}',
    '.cnc-stats span{font-size:.6875rem;color:rgba(255,255,255,.7);letter-spacing:.02em}',
    '.cnc-feat{background:#fff;color:#111827;border-radius:14px;padding:14px;cursor:pointer;transition:transform .15s,box-shadow .15s}',
    '.cnc-feat:active{transform:scale(.985)}',
    '.cnc-feat-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}',
    '.cnc-feat-tag{display:inline-flex;align-items:center;gap:5px;font-size:.6875rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a5a0b;background:#fbf3e2;padding:3px 8px;border-radius:999px}',
    '.cnc-feat-cat{font-size:.75rem;color:#5a6577}',
    '.cnc-feat h3{margin:0 0 4px;font-size:1.0625rem;font-weight:700;letter-spacing:-.01em;line-height:1.3;word-break:break-word}',
    '.cnc-feat-prize{display:flex;align-items:center;gap:6px;margin:0 0 10px;font-size:.8125rem;color:#17653a;font-weight:600}',
    '.cnc-feat-cd small{display:block;font-size:.6875rem;color:#5a6577;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}',
    '.cnc-cd{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}',
    '.cnc-cd-b{background:#eef3f9;border-radius:10px;padding:8px 0 6px;text-align:center;color:#14263f}',
    '.cnc-cd-b b{display:block;font-size:1.25rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}',
    '.cnc-cd-b span{font-size:.6875rem;color:#5a6577}',
    '.cnc-tabs{display:flex;gap:4px;background:var(--cnh-soft,#eef3f9);border-radius:12px;padding:4px;margin:0 0 14px}',
    '.cnc-tabs button{flex:1;appearance:none;border:0;background:transparent;color:var(--cnh-sub,#5a6577);font-weight:600;font-size:.8125rem;padding:8px 4px;line-height:1.2;border-radius:9px;cursor:pointer;min-height:40px;transition:background .15s,color .15s,box-shadow .15s}',
    '.cnc-tabs button.on{background:var(--cnh-card,#fff);color:var(--cnh-brand-ink,#173f75);box-shadow:0 1px 3px rgba(17,24,39,.12)}',
    '.cnc-tabs.in{margin:14px 16px}',
    '.cnc-seg{display:flex;gap:6px;margin:0 0 12px}',
    '.cnc-seg button{flex:1;appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);font-weight:600;font-size:.8125rem;padding:0 8px;min-height:40px;border-radius:10px;cursor:pointer;transition:all .15s}',
    '.cnc-seg button em{font-style:normal;font-size:.6875rem;color:var(--cnh-sub,#5a6577);background:var(--cnh-soft,#eef3f9);border-radius:999px;padding:1px 7px}',
    '.cnc-seg button.on{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91);color:#fff}',
    '.cnc-seg button.on em{background:rgba(255,255,255,.2);color:#fff}',
    '.cnc-seg.mini{margin:0;flex:0 0 auto}.cnc-seg.mini button{min-height:38px;padding:0 12px}',
    '.cnc-tools{display:flex;gap:8px;margin:0 0 12px;align-items:center}',
    '.cnc-search{flex:1;display:flex;align-items:center;gap:8px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);border-radius:12px;padding:0 12px;min-height:44px;color:var(--cnh-sub,#5a6577);min-width:0}',
    '.cnc-search:focus-within{border-color:var(--cnh-brand,#1d4f91);box-shadow:0 0 0 3px var(--cnh-brand-tint,rgba(29,79,145,.1))}',
    '.cnc-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--cnh-ink,#111827);font:inherit;font-size:.9375rem;padding:0}',
    '#cnc-sort{flex:0 0 auto;max-width:132px;min-height:44px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);border-radius:12px;padding:0 8px;font:inherit;font-size:.8125rem}',
    '.cnc-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;margin:0 -2px;scrollbar-width:none}.cnc-chips::-webkit-scrollbar{display:none}',
    '.cnc-chip{flex:0 0 auto;appearance:none;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);font-weight:600;font-size:.8125rem;padding:0 12px;min-height:36px;border-radius:999px;cursor:pointer;transition:all .15s;white-space:nowrap}',
    '.cnc-chip svg{color:var(--t,currentColor)}',
    '.cnc-chip.on{background:color-mix(in srgb,var(--t,#1d4f91) 14%,var(--cnh-card,#fff));border-color:var(--t,#1d4f91);color:var(--t,#1d4f91)}',
    'html[data-theme="dark"] .cnc-chip.on{color:var(--cnh-ink,#eceff4)}',
    '.cnc-grid{display:grid;gap:14px}',
    '@media(min-width:700px){.cnc-grid{grid-template-columns:repeat(2,1fr)}}',
    '.cnc-card{position:relative;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:var(--cnh-shadow,0 1px 2px rgba(17,24,39,.04),0 4px 14px rgba(17,24,39,.05));transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s;animation:cncIn .4s both}',
    '.cnc-card:nth-child(2){animation-delay:.05s}.cnc-card:nth-child(3){animation-delay:.1s}.cnc-card:nth-child(n+4){animation-delay:.15s}',
    '.cnc-card:active{transform:scale(.985)}',
    '@media(hover:hover){.cnc-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(17,24,39,.12)}}',
    '.cnc-card:focus-visible,.cnc-mini:focus-visible,.cnc-feat:focus-visible{outline:3px solid color-mix(in srgb,var(--cnh-brand,#1d4f91) 40%,transparent);outline-offset:2px}',
    '@keyframes cncIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
    '.cnc-cover{position:relative;height:104px;background:color-mix(in srgb,var(--t,#1d4f91) 16%,var(--cnh-card,#fff));overflow:hidden;color:var(--t,#1d4f91)}',
    '.cnc-cover.big{height:190px}',
    '.cnc-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.cnc-cover.art .a{position:absolute;width:150px;height:150px;border-radius:50%;right:-40px;top:-60px;background:color-mix(in srgb,var(--t) 22%,transparent)}',
    '.cnc-cover.art .b{position:absolute;width:90px;height:90px;border-radius:50%;left:-24px;bottom:-40px;background:color-mix(in srgb,var(--t) 16%,transparent)}',
    '.cnc-cover.art .c{position:absolute;width:44px;height:44px;border-radius:12px;transform:rotate(20deg);left:42%;top:-14px;background:color-mix(in srgb,var(--t) 14%,transparent);animation:cncFloat 6s ease-in-out infinite}',
    '.cnc-cover-ico{position:absolute;left:16px;bottom:14px;width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--cnh-card,#fff);color:var(--t);box-shadow:0 6px 16px color-mix(in srgb,var(--t) 28%,transparent)}',
    '.cnc-cover.big .cnc-cover-ico{width:72px;height:72px;border-radius:20px}',
    '@keyframes cncFloat{50%{transform:rotate(32deg) translateY(8px)}}',
    '.cnc-card-b{padding:12px 14px 14px}',
    '.cnc-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
    '.cnc-row.foot{margin-top:10px}',
    '.cnc-cat{display:inline-flex;align-items:center;gap:5px;font-size:.75rem;font-weight:600;color:var(--t)}',
    'html[data-theme="dark"] .cnc-cat{color:color-mix(in srgb,var(--t) 55%,#fff)}',
    '.cnc-card-t{margin:6px 0 2px;font-size:1.0625rem;font-weight:700;letter-spacing:-.01em;line-height:1.3;color:var(--cnh-ink,#111827);word-break:break-word}',
    '.cnc-by{font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.cnc-prize{display:flex;align-items:center;gap:7px;margin-top:8px;font-size:.8125rem;font-weight:600;color:var(--cnh-ok,#17653a);background:var(--cnh-ok-bg,#e8f4ec);padding:7px 10px;border-radius:10px}',
    '.cnc-prize span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cnc-bar{height:5px;border-radius:99px;background:var(--cnh-soft,#eef3f9);overflow:hidden;margin-top:10px}',
    '.cnc-bar i{display:block;height:100%;border-radius:99px;background:var(--cnh-brand,#1d4f91);transition:width .6s}',
    '.cnc-time{display:inline-flex;align-items:center;gap:5px;font-size:.8125rem;color:var(--cnh-sub,#5a6577);font-weight:500}',
    '.cnc-pill{display:inline-flex;align-items:center;gap:5px;font-size:.6875rem;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--cnh-soft,#eef3f9);color:var(--cnh-sub,#5a6577);white-space:nowrap}',
    '.cnc-pill.ok{background:var(--cnh-ok-bg,#e8f4ec);color:var(--cnh-ok,#17653a)}.cnc-pill.info{background:var(--cnh-brand-tint,rgba(29,79,145,.1));color:var(--cnh-brand-ink,#173f75)}',
    '.cnc-pill.warn,.cnc-pill.gold{background:var(--cnh-warn-bg,#fbf3e2);color:var(--cnh-warn,#8a5a0b)}.cnc-pill.bad{background:var(--cnh-bad-bg,#fbeaea);color:var(--cnh-bad,#a42a2a)}',
    '.cnc-pill .dot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:cncPulse 1.6s ease-in-out infinite}',
    '@keyframes cncPulse{50%{opacity:.25;transform:scale(.7)}}',
    '.cnc-mine{display:flex;justify-content:space-between;gap:10px;padding:10px 14px;border-top:1px solid var(--cnh-line,#e1e6ed);font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.cnc-mine span:first-child{display:inline-flex;align-items:center;gap:5px;font-weight:700;color:var(--cnh-brand-ink,#173f75)}',
    '.cnc-h{margin:26px 0 12px;font-size:1.0625rem;font-weight:700;letter-spacing:-.01em;color:var(--cnh-ink,#111827)}',
    '.cnc-strip{display:flex;gap:10px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}.cnc-strip::-webkit-scrollbar{display:none}',
    '.cnc-mini{flex:0 0 156px;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:4px;transition:transform .15s}',
    '.cnc-mini:active{transform:scale(.97)}',
    '.cnc-mini .ic{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--t) 13%,var(--cnh-card,#fff));color:var(--t);margin-bottom:4px}',
    '.cnc-mini b{font-size:.875rem;line-height:1.3;color:var(--cnh-ink,#111827);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}',
    '.cnc-mini small{font-size:.75rem;color:var(--cnh-sub,#5a6577);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cnc-how{display:grid;gap:10px}',
    '@media(min-width:600px){.cnc-how{grid-template-columns:repeat(3,1fr)}}',
    '.cnc-how-i{position:relative;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;padding:14px 14px 14px 62px}',
    '.cnc-how-i .ic{position:absolute;left:14px;top:14px;width:36px;height:36px;border-radius:11px;background:var(--cnh-brand-tint,rgba(29,79,145,.1));color:var(--cnh-brand,#1d4f91);display:flex;align-items:center;justify-content:center}',
    '.cnc-how-i .n{position:absolute;right:12px;top:8px;font-size:1.5rem;font-weight:700;color:var(--cnh-line,#e1e6ed)}',
    '.cnc-how-i b{display:block;font-size:.9375rem}.cnc-how-i p{margin:2px 0 0;font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.cnc-empty{text-align:center;padding:34px 16px;color:var(--cnh-sub,#5a6577);display:flex;flex-direction:column;align-items:center;gap:10px;background:var(--cnh-card,#fff);border:1px dashed var(--cnh-line,#e1e6ed);border-radius:16px}',
    '.cnc-empty p{margin:0;font-size:.875rem;max-width:280px}',
    '.cnc-hint{font-size:.75rem;color:var(--cnh-sub,#5a6577);margin:8px 0 16px}.cnc-hint.c{text-align:center}',
    '.cnc-propose{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;border:1.5px dashed var(--cnh-brand,#1d4f91);background:var(--cnh-brand-tint,rgba(29,79,145,.08));color:var(--cnh-brand-ink,#173f75);font-weight:700;font-size:.9375rem;cursor:pointer}',
    '.cnc-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 18px;border-radius:12px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);font-weight:600;font-size:.9375rem;cursor:pointer;text-decoration:none;transition:transform .1s,background .15s}',
    '.cnc-btn:active{transform:scale(.98)}.cnc-btn.sm{min-height:36px;padding:0 12px;font-size:.8125rem;border-radius:9px}.cnc-btn.full{width:100%}',
    '.cnc-btn.pri{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91);color:#fff}',
    'html[data-theme="dark"] .cnc-btn.pri{color:#0b1220}',
    '.cnc-btn[disabled]{opacity:.6;cursor:default}',
    '.cnc-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}',
    '.cnc-skel{height:120px;border-radius:16px;background:linear-gradient(90deg,var(--cnh-soft,#eef3f9) 25%,var(--cnh-soft2,#f6f8fb) 50%,var(--cnh-soft,#eef3f9) 75%);background-size:200% 100%;animation:cncSk 1.2s linear infinite;margin-bottom:12px}.cnc-skel.hero{height:230px}',
    '@keyframes cncSk{to{background-position:-200% 0}}',
    /* détail */
    '.cnc-detail{position:fixed;inset:0;z-index:900;background:var(--cnh-page,#f4f6f9);display:flex;flex-direction:column;animation:cncSlide .28s cubic-bezier(.2,.8,.2,1)}',
    '@keyframes cncSlide{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
    '.cnc-d-bar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) 10px 10px;background:var(--cnh-card,#fff);border-bottom:1px solid var(--cnh-line,#e1e6ed)}',
    '.cnc-d-bar span{font-weight:700;font-size:.9375rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cnc-ib{appearance:none;width:42px;height:42px;border-radius:12px;border:0;background:var(--cnh-soft,#eef3f9);color:var(--cnh-ink,#111827);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.cnc-d-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;max-width:760px;width:100%;margin:0 auto}',
    '.cnc-d-head{padding:16px 16px 0}',
    '.cnc-d-head h2{margin:10px 0 4px;font-size:1.375rem;font-weight:700;letter-spacing:-.015em;line-height:1.25;word-break:break-word}',
    '.cnc-d-cd{margin-top:14px}.cnc-d-cd small{display:block;font-size:.6875rem;color:var(--cnh-sub,#5a6577);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}',
    '.cnc-d-cd .cnc-cd-b{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);color:var(--cnh-ink,#111827)}',
    '.cnc-d-panel{padding:0 16px 24px}',
    '.cnc-d-cta{flex:0 0 auto;background:var(--cnh-card,#fff);border-top:1px solid var(--cnh-line,#e1e6ed);padding:12px 16px max(12px,env(safe-area-inset-bottom));max-width:760px;width:100%;margin:0 auto}',
    '.cnc-note{margin:0;text-align:center;font-size:.875rem;color:var(--cnh-sub,#5a6577);padding:8px 0}',
    '.cnc-block{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;padding:14px;margin-top:12px}',
    '.cnc-block h4{margin:0 0 8px;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cnh-sub,#5a6577);display:flex;align-items:center;gap:6px}',
    '.cnc-block p{margin:0;font-size:.9375rem}.cnc-desc{white-space:pre-wrap;word-break:break-word;line-height:1.65}',
    '.cnc-block.ok{background:var(--cnh-ok-bg,#e8f4ec);border-color:transparent}.cnc-block.ok h4{color:var(--cnh-ok,#17653a)}',
    '.cnc-block.warn{background:var(--cnh-warn-bg,#fbf3e2);border-color:transparent}',
    '.cnc-prizebox{display:flex;align-items:center;gap:12px;margin-top:12px;background:#14263f;color:#fff;border-radius:14px;padding:14px}',
    '.cnc-prizebox .ic{width:46px;height:46px;border-radius:13px;background:rgba(232,182,76,.18);color:#e8b64c;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.cnc-prizebox small{display:block;font-size:.6875rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.65)}.cnc-prizebox b{font-size:1.0625rem;word-break:break-word}',
    '.cnc-tl{list-style:none;margin:0;padding:0}',
    '.cnc-tl li{position:relative;display:flex;gap:12px;padding:0 0 14px}.cnc-tl li:last-child{padding:0}',
    '.cnc-tl li::before{content:"";position:absolute;left:5px;top:14px;bottom:-2px;width:2px;background:var(--cnh-line,#e1e6ed)}.cnc-tl li:last-child::before{display:none}',
    '.cnc-tl i{width:12px;height:12px;border-radius:50%;border:2px solid var(--cnh-line,#cbd3de);background:var(--cnh-card,#fff);margin-top:4px;flex:0 0 auto;position:relative;z-index:1}',
    '.cnc-tl li.done i{background:var(--cnh-brand,#1d4f91);border-color:var(--cnh-brand,#1d4f91)}',
    '.cnc-tl b{display:block;font-size:.875rem}.cnc-tl span{font-size:.8125rem;color:var(--cnh-sub,#5a6577)}',
    '.cnc-rules{list-style:none;margin:0;padding:0;display:grid;gap:10px}',
    '.cnc-rules li{display:flex;gap:10px;font-size:.875rem;line-height:1.5}.cnc-rules svg{flex:0 0 auto;margin-top:3px;color:var(--cnh-brand,#1d4f91)}',
    '.cnc-elist{display:grid;gap:12px}',
    '@media(min-width:620px){.cnc-elist{grid-template-columns:1fr 1fr}}',
    '.cnc-entry{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:14px;overflow:hidden}',
    '.cnc-entry.own{border-color:var(--cnh-brand,#1d4f91)}',
    '.cnc-media{position:relative;background:var(--cnh-soft,#eef3f9);aspect-ratio:4/3;cursor:pointer;overflow:hidden}',
    '.cnc-media img,.cnc-media video{width:100%;height:100%;object-fit:cover;display:block}',
    '.cnc-media.bad{display:none}',
    '.cnc-media .pl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:52px;height:52px;border-radius:50%;background:rgba(17,24,39,.6);color:#fff;display:flex;align-items:center;justify-content:center}',
    '.cnc-entry-b{padding:12px 14px 14px}',
    '.cnc-entry-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cnc-entry-h .rk{font-size:.75rem;font-weight:700;color:var(--cnh-brand-ink,#173f75);background:var(--cnh-brand-tint,rgba(29,79,145,.1));padding:2px 8px;border-radius:999px}',
    '.cnc-entry-h b{word-break:break-word}',
    '.cnc-entry-b p{margin:6px 0 0;font-size:.8125rem;color:var(--cnh-sub,#5a6577);word-break:break-word}',
    '.cnc-entry-f{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}',
    '.cnc-entry-f .v{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:.875rem}',
    '.cnc-podium{display:grid;grid-template-columns:1fr 1.12fr 1fr;gap:8px;align-items:end;margin:16px 0 6px}',
    '.cnc-pod{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0}',
    '.cnc-pod .av{position:relative;width:58px;height:58px;border-radius:50%;background:var(--cnh-soft,#eef3f9);border:3px solid var(--cnh-card,#fff);box-shadow:0 0 0 2px var(--c,#cbd3de);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:6px}',
    '.cnc-pod .av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}',
    '.cnc-pod .av i{font-style:normal;font-weight:700;font-size:1.25rem;color:var(--cnh-brand-ink,#173f75);position:relative}',
    '.cnc-pod .av img+i{display:none}',
    '.cnc-pod.p1{--c:#e8b64c}.cnc-pod.p2{--c:#9aa5b5}.cnc-pod.p3{--c:#c08457}',
    '.cnc-pod.p1 .av{width:72px;height:72px;overflow:visible}',
    '.cnc-pod .av .crown{position:absolute;top:-14px;left:50%;transform:translateX(-50%);color:#b9871a;z-index:2;background:var(--cnh-card,#fff);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.2)}',
    '.cnc-pod .nm{font-size:.8125rem;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cnc-pod .vt{font-size:.6875rem;color:var(--cnh-sub,#5a6577);margin-bottom:6px}',
    '.cnc-pod .bar{width:100%;border-radius:10px 10px 0 0;background:color-mix(in srgb,var(--c,#cbd3de) 24%,var(--cnh-card,#fff));border:1px solid color-mix(in srgb,var(--c,#cbd3de) 50%,transparent);border-bottom:0;display:flex;align-items:flex-start;justify-content:center;padding-top:6px}',
    '.cnc-pod .bar b{font-size:1.125rem;font-weight:700;color:var(--cnh-ink,#111827)}',
    '.cnc-pod.p1 .bar{height:84px}.cnc-pod.p2 .bar{height:60px}.cnc-pod.p3 .bar{height:44px}',
    '.cnc-pod.empty{opacity:.45}.cnc-pod.empty .av{box-shadow:0 0 0 2px var(--cnh-line,#e1e6ed)}',
    '.cnc-lb{display:grid;gap:8px;margin-top:10px}',
    '.cnc-lb-r{display:flex;align-items:center;gap:12px;background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:12px;padding:10px 12px}',
    '.cnc-lb-r.own{border-color:var(--cnh-brand,#1d4f91);background:var(--cnh-brand-tint,rgba(29,79,145,.06))}',
    '.cnc-lb-r .n{width:28px;height:28px;border-radius:8px;background:var(--cnh-soft,#eef3f9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8125rem;flex:0 0 auto}',
    '.cnc-lb-r .m{flex:1;min-width:0}.cnc-lb-r .m b{display:block;font-size:.875rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cnc-lb-r .bar{height:5px;border-radius:99px;background:var(--cnh-soft,#eef3f9);margin-top:6px;overflow:hidden}.cnc-lb-r .bar i{display:block;height:100%;background:var(--cnh-brand,#1d4f91);border-radius:99px}',
    '.cnc-lb-r .v{font-weight:700;font-size:.9375rem}',
    '.cnc-fol{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#14263f;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18);z-index:2;transition:transform .2s cubic-bezier(.2,.9,.3,1.4)}',
    '.cnc-fol:active{transform:scale(.85)}.cnc-fol.on,.cnc-ib.on{color:#b9871a}.cnc-fol.on svg,.cnc-ib.on svg{fill:currentColor}',
    '.cnc-bar-r{display:flex;gap:8px}',
    '.cnc-mini.hot{border-color:#e8b64c}.cnc-mini.hot .ic{background:#fbf3e2;color:#8a5a0b}',
    '.cnc-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.cnc-kpis div{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:12px;padding:10px 6px;text-align:center}.cnc-kpis b{display:block;font-size:1.25rem;font-weight:700}.cnc-kpis span{font-size:.6875rem;color:var(--cnh-sub,#5a6577)}',
    '.cnc-faq{border-top:1px solid var(--cnh-line,#e1e6ed)}.cnc-faq:first-of-type{border-top:0}.cnc-faq button{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;background:none;border:0;color:inherit;font:inherit;font-weight:600;font-size:.875rem;text-align:left;padding:12px 0;cursor:pointer}',
    '.cnc-faq svg{flex:0 0 auto;transition:transform .2s}.cnc-faq.open svg{transform:rotate(180deg)}.cnc-faq p{display:none;margin:0 0 12px;font-size:.8125rem!important;color:var(--cnh-sub,#5a6577)}.cnc-faq.open p{display:block}',
    '.cnc-block .cnc-btn.full{width:100%}',
    '.cnc-phg{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.cnc-ph{position:relative;display:flex;align-items:center;gap:10px;min-height:64px;padding:8px 10px;border-radius:12px;border:1px dashed var(--t);background:color-mix(in srgb,var(--t) 8%,var(--cnh-card,#fff));color:var(--cnh-ink,#111827);font:inherit;font-size:.8125rem;font-weight:600;text-align:left;cursor:pointer;overflow:hidden}',
    '.cnc-ph svg{color:var(--t);flex:0 0 auto}.cnc-ph img{width:44px;height:44px;border-radius:10px;object-fit:cover;flex:0 0 auto}',
    '.cnc-cats{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 14px;margin:0 -2px;scrollbar-width:none}.cnc-cats::-webkit-scrollbar{display:none}',
    '.cnc-ct{flex:0 0 auto;width:92px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px 10px;border-radius:16px;border:1.5px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);cursor:pointer;position:relative;transition:transform .15s,border-color .15s,box-shadow .15s;touch-action:manipulation}',
    '.cnc-ct .i{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--t);color:#fff;box-shadow:0 6px 14px color-mix(in srgb,var(--t) 35%,transparent)}',
    '.cnc-ct b{font-size:.75rem;font-weight:600;line-height:1.2;text-align:center;min-height:2.4em;display:flex;align-items:center}',
    '.cnc-ct em{position:absolute;top:6px;right:6px;font-style:normal;font-size:.625rem;font-weight:700;background:var(--cnh-soft,#eef3f9);color:var(--cnh-sub,#5a6577);border-radius:999px;padding:1px 6px}',
    '.cnc-ct.on{border-color:var(--t);background:color-mix(in srgb,var(--t) 9%,var(--cnh-card,#fff));box-shadow:0 6px 18px color-mix(in srgb,var(--t) 22%,transparent)}.cnc-ct:active{transform:scale(.95)}',
    '.cnc-remind{display:flex;gap:10px;align-items:flex-start;background:#fbf3e2;color:#8a5a0b;border-radius:14px;padding:12px 14px;margin:0 0 14px;font-size:.8125rem}.cnc-remind svg{flex:0 0 auto;margin-top:2px}.cnc-remind b{display:block;margin-bottom:2px}.cnc-remind a{display:block;font-weight:600;text-decoration:underline;cursor:pointer;padding:3px 0}',
    '.cnc-space{background:var(--cnh-card,#fff);border:1px solid var(--cnh-line,#e1e6ed);border-radius:16px;padding:14px;margin:0 0 14px}.cnc-space-h{display:flex;align-items:center;gap:12px}.cnc-space-h small{display:block;font-size:.6875rem;letter-spacing:.08em;text-transform:uppercase;color:var(--cnh-sub,#5a6577)}.cnc-space-h b{font-size:1rem}',
    '.cnc-space .lv{width:46px;height:46px;border-radius:14px;background:#14263f;color:#e8b64c;display:flex;align-items:center;justify-content:center}',
    '.cnc-hero::before,.cnc-hero::after{content:"";position:absolute;border-radius:50%;background:rgba(232,182,76,.14);pointer-events:none;animation:cncFloat2 7s ease-in-out infinite}.cnc-hero::before{width:120px;height:120px;left:-40px;bottom:-50px}.cnc-hero::after{width:60px;height:60px;right:30%;top:-20px;animation-delay:1.5s}',
    '.cnc-hero>*:not(.cnc-hero-art){position:relative;z-index:1}',
    '@keyframes cncFloat2{50%{transform:translateY(-10px)}}',
    '.cnc-card,.cnc-mini,.cnc-feat,.cnc-btn,.cnc-tabs button,.cnc-seg button{touch-action:manipulation}',
    '@media(prefers-reduced-motion:reduce){.cnc-card,.cnc-detail,.cnc-cover.art .c,.cnc-pill .dot{animation:none!important}.cnc-card,.cnc-bar i{transition:none!important}}'
  ].join('\n');
  try { var st = document.createElement('style'); st.setAttribute('data-cn-contest', '1'); st.textContent = css; document.head.appendChild(st); } catch (e) { /* ignore */ }
})();
