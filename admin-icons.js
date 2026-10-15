/* admin-icons.js — l'administrateur change lui-même les icônes des services (photo à la place du pictogramme).
   Visible et utilisable UNIQUEMENT par le compte administrateur. Les photos sont lues par tout le monde
   (pricing/site.showcasePhotos) mais seul l'administrateur peut les enregistrer. S'appuie sur showcase.js. */
(function () {
  'use strict';
  if (window.__cnAdminIcons) return; window.__cnAdminIcons = true;
  function lang() { try { return currentLang === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } }
  var TX = { fr: { edit: 'Modifier les icônes', done: 'Terminer', hint: 'Touche un service pour choisir sa photo. La croix retire la photo.' }, en: { edit: 'Edit icons', done: 'Done', hint: 'Tap a service to choose its photo. The cross removes it.' } };
  function sc() { return window.CNShowcase; }
  function isAdm() { try { return !!sc() && sc().isAdmin(); } catch (e) { return false; } }
  function ph(id) { try { return sc() ? sc().photo('svc_' + id) : ''; } catch (e) { return ''; } }
  var editing = false;

  function apply() {
    document.querySelectorAll('.mp-tile[data-id],.mp-short[data-id],.mp-row[data-id]').forEach(function (t) {
      var ico = t.querySelector('.mp-ico'); if (!ico) return;
      var id = t.getAttribute('data-id'), u = ph(id), cur = ico.querySelector('img.mp-photo');
      if (u) {
        ico.classList.add('has-photo');
        if (!cur) { var im = document.createElement('img'); im.className = 'mp-photo'; im.alt = ''; im.loading = 'lazy'; im.onerror = function () { im.remove(); ico.classList.remove('has-photo'); }; im.src = u; ico.appendChild(im); }
        else if (cur.getAttribute('src') !== u) cur.src = u;
      } else if (cur) { cur.remove(); ico.classList.remove('has-photo'); }
      var del = t.querySelector('.cn-ie-del');
      if (editing && isAdm() && u && !del && t.classList.contains('mp-tile')) {
        var b = document.createElement('span'); b.className = 'cn-ie-del'; b.setAttribute('data-del', id); b.textContent = '×'; t.appendChild(b);
      } else if ((!editing || !u) && del) del.remove();
    });
    var host = document.getElementById('menu-screen-items-services');
    var bar = document.getElementById('cn-ie-bar');
    if (host && isAdm() && !bar) {
      var hdr = host.querySelector('.menu-page-header');
      if (hdr) { bar = document.createElement('div'); bar.id = 'cn-ie-bar'; bar.className = 'cn-ie-bar'; hdr.insertAdjacentElement('afterend', bar); draw(); }
    } else if (bar && !isAdm()) bar.remove();
  }
  function draw() {
    var bar = document.getElementById('cn-ie-bar'); if (!bar) return;
    var t = TX[lang()];
    bar.innerHTML = '<button type="button" class="cn-ie-btn' + (editing ? ' on' : '') + '" data-toggle>' + (editing ? t.done : t.edit) + '</button>' + (editing ? '<span>' + t.hint + '</span>' : '');
    document.documentElement.classList.toggle('cn-ie-on', editing);
  }
  document.addEventListener('click', function (ev) {
    var t0 = ev.target; if (!t0.closest) return;
    if (t0.closest('[data-toggle]') && t0.closest('#cn-ie-bar')) { editing = !editing; draw(); apply(); return; }
    if (!editing || !isAdm()) return;
    var del = t0.closest('.cn-ie-del');
    if (del) { ev.preventDefault(); ev.stopPropagation(); sc().drop('svc_' + del.getAttribute('data-del')); return; }
    var tile = t0.closest('.mp-tile[data-id]');
    if (tile) { ev.preventDefault(); ev.stopPropagation(); sc().pick('svc_' + tile.getAttribute('data-id')); }
  }, true);
  document.addEventListener('cn-showcase-photos', apply);
  var tm = null;
  try { new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(apply, 120); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
  setTimeout(apply, 600);
  var css = [
    '.mp-ico.has-photo{overflow:hidden;position:relative;background:#14263f!important}',
    '.mp-ico.has-photo svg{opacity:0!important}',
    '.mp-ico img.mp-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}',
    '.cn-ie-bar{display:flex;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}.cn-ie-bar span{font-size:.75rem;color:var(--cnh-sub,#5a6577);flex:1;min-width:180px}',
    '.cn-ie-btn{min-height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--cnh-line,#e1e6ed);background:var(--cnh-card,#fff);color:var(--cnh-ink,#111827);font:inherit;font-weight:700;font-size:.8125rem;cursor:pointer}',
    '.cn-ie-btn.on{background:#14263f;border-color:#14263f;color:#fff}',
    '.cn-ie-on .mp-tile{outline:2px dashed var(--cnh-brand,#1d4f91);outline-offset:-2px;border-radius:16px}',
    '.cn-ie-del{position:absolute;top:2px;left:2px;width:24px;height:24px;border-radius:50%;background:#a42a2a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;line-height:1;z-index:4}',
    '.mp-tile{position:relative}'
  ].join('\n');
  try { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); } catch (e) { }
})();
