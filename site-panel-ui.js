// api/_lib/site-panel-ui.js — section publique « Commander » (catalogue du panel) d'un mini-site.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function panelEnabled(site) { return !!(site && site.panel && site.panel.on && Array.isArray(site.panel.items) && site.panel.items.length); }

function panelHtml(site) {
  if (!panelEnabled(site)) return '';
  const items = site.panel.items.slice(0, 200), cats = [...new Set(items.map((x) => x.cat))];
  const opts = cats.map((c) => `<optgroup label="${esc(c)}">${items.filter((x) => x.cat === c).map((x) => `<option value="${esc(x.id)}">${esc(x.name)} — ${esc(x.price)} $ / 1000</option>`).join('')}</optgroup>`).join('');
  return `
  <section class="section" id="site-sec-panel">
    <div class="book-card pn-card reveal">
      <h3>${esc(site.panel.title || 'Passer une commande')}</h3>
      <form id="pn-form" class="bk-form" onsubmit="return cnPanel(event)" novalidate>
        <input type="text" name="hp" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
        <label for="pn-svc">Service</label><select id="pn-svc" onchange="cnPanelCalc()">${opts}</select>
        <label for="pn-link">Lien ou nom du compte</label><input id="pn-link" type="text" maxlength="300" placeholder="https://… ou @moncompte" autocomplete="off">
        <label for="pn-qty">Quantité <span id="pn-range" class="pn-sub"></span></label><input id="pn-qty" type="number" inputmode="numeric" min="1" oninput="cnPanelCalc()">
        <label for="pn-name">Votre nom</label><input id="pn-name" type="text" maxlength="60" autocomplete="name">
        <label for="pn-contact">WhatsApp ou e-mail</label><input id="pn-contact" type="text" maxlength="60" autocomplete="off" placeholder="+243 …">
        <div class="pn-total"><span>Total estimé</span><b id="pn-total">0,00 $</b></div>
        <button class="btn btn-accent" type="submit" id="pn-btn">Envoyer la demande</button>
        <p class="pn-sub">Votre demande est transmise au vendeur, qui vous confirme le paiement et le démarrage.</p>
      </form>
      <p class="nl-ok" id="pn-ok" hidden>Demande envoyée. Le vendeur vous répondra très vite.</p>
    </div>
  </section>`;
}
const panelCss = `.pn-card{display:grid;gap:10px}.pn-card label{font-weight:700;font-size:.82rem;margin-top:8px;display:block}.pn-card select{width:100%;font:inherit;font-size:.9rem;color:var(--ink);background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:10px 12px}.pn-card .bk-form{display:grid;gap:4px}.pn-sub{font-size:.76rem;color:var(--muted);font-weight:500}.pn-total{display:flex;justify-content:space-between;align-items:center;margin:12px 0;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--accent-soft)}.pn-total b{font-size:1.2rem}`;

function panelJs(site) {
  if (!panelEnabled(site)) return '';
  const data = JSON.stringify(site.panel.items.slice(0, 200).map((x) => ({ id: x.id, p: x.price, a: x.min, z: x.max }))).replace(/</g, '\\u003c');
  return `var PN_ITEMS=${data};
function cnPanelItem(){var v=document.getElementById('pn-svc').value;for(var i=0;i<PN_ITEMS.length;i++){if(PN_ITEMS[i].id===v)return PN_ITEMS[i]}return null}
function cnPanelCalc(){var it=cnPanelItem(),q=document.getElementById('pn-qty'),n=parseInt(q.value,10)||0;if(!it)return;document.getElementById('pn-range').textContent='(de '+it.a+' à '+it.z+')';q.min=it.a;q.max=it.z;document.getElementById('pn-total').textContent=(Math.round(it.p*n/1000*100)/100).toFixed(2).replace('.',',')+' $'}
cnPanelCalc();
function cnPanel(e){e.preventDefault();var f=document.getElementById('pn-form'),it=cnPanelItem(),g=function(i){return document.getElementById(i).value.trim()};
  var p={action:'panel_order',id:SITE_LEAD&&SITE_LEAD.id,serviceId:it&&it.id,link:g('pn-link'),quantity:parseInt(g('pn-qty'),10)||0,name:g('pn-name'),contact:g('pn-contact'),hp:f.hp.value};
  if(!it||p.quantity<it.a||p.quantity>it.z){cnToast('Quantité : entre '+(it?it.a:1)+' et '+(it?it.z:1)+'.');return false}
  if(p.link.length<3||!p.name||p.contact.length<5){cnToast('Remplissez le lien, votre nom et votre contact.');return false}
  if(SITE_PREVIEW||!SITE_LEAD){cnToast('Aperçu : l\\u2019envoi est actif sur la page publiée.');return false}
  var b=document.getElementById('pn-btn'),old=b.textContent;b.disabled=true;b.textContent='Envoi…';
  fetch('/api/render-site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){return {ok:r.ok,j:j}})})
   .then(function(x){b.disabled=false;b.textContent=old;if(x.ok&&x.j.success){f.hidden=true;document.getElementById('pn-ok').hidden=false}else{cnToast(x.j.error||'Envoi impossible, réessayez.')}})
   .catch(function(){b.disabled=false;b.textContent=old;cnToast('Connexion impossible, réessayez.')});return false}
`;
}
module.exports = { panelEnabled, panelHtml, panelCss, panelJs };
