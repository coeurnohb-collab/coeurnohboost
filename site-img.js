// api/_lib/site-img.js : photos des sites à la bonne taille.
// Une photo de téléphone fait souvent 3 à 8 Mo ; sur une connexion mobile, c'est ce qui rend un site lent.
// Pour les photos hébergées chez nous (Cloudinary), on demande la bonne largeur et un format moderne (WebP/AVIF selon le téléphone),
// ce qui divise le poids par 5 à 20 sans changer l'image. Toute autre adresse est laissée telle quelle.
'use strict';

const CLOUD_IMG = /^(https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\/)([^?#\s]+)(.*)$/;
// Premier segment qui est déjà une transformation choisie par l'auteur (c_fill,w_300 …) : on n'y touche pas.
const TRANSFORM_FIRST = /^(?:c|w|h|f|q|e|b|ar|g|r|l|o|a|x|y|z|t|dpr|fl|if|bo|co)_[A-Za-z0-9:.\-_]*(?:,[a-z]{1,3}_[^/,]*)*$/;

function clampW(w) { const n = Math.round(Number(w) || 0); return Math.max(16, Math.min(2400, n || 800)); }

function siteImg(u, w) {
  const v = String(u == null ? '' : u);
  const m = CLOUD_IMG.exec(v);
  if (!m) return v;
  if (/\.(svg|gif)$/i.test(m[2])) return v;
  if (TRANSFORM_FIRST.test(m[2].split('/')[0])) return v;
  return m[1] + 'f_auto,q_auto,c_limit,w_' + clampW(w) + '/' + m[2] + m[3];
}

// « srcset » (plusieurs largeurs) : vide si la photo n'est pas optimisable.
function siteSrcset(u, widths) {
  const v = String(u == null ? '' : u);
  if (!CLOUD_IMG.test(v) || siteImg(v, 100) === v) return '';
  return (widths || []).map((w) => siteImg(v, w) + ' ' + clampW(w) + 'w').join(', ');
}

// Attributs prêts à coller dans une balise <img> (src + srcset + sizes), déjà échappés par l'appelant via esc.
function imgAttrs(u, w, widths, sizes, esc) {
  const e = esc || ((x) => x);
  const set = widths && widths.length ? siteSrcset(u, widths) : '';
  return 'src="' + e(siteImg(u, w)) + '"' + (set ? ' srcset="' + e(set) + '" sizes="' + e(sizes || '100vw') + '"' : '');
}

module.exports = { siteImg, siteSrcset, imgAttrs };
