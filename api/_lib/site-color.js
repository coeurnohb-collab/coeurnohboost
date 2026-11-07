// api/_lib/site-color.js : couleurs lisibles pour les sites publiés.
// Le propriétaire choisit UNE couleur d'accent. Selon cette couleur, le texte blanc posé dessus, ou le titre écrit
// avec cette couleur sur un fond clair/sombre, peut devenir illisible (jaune sur blanc, bleu nuit sur fond sombre...).
// Ici on calcule, sans changer l'identité de la couleur, les variantes qui respectent le contraste recommandé (WCAG AA).
'use strict';

const INK = [15, 23, 42];       // #0f172a : encre foncée
const WHITE = [255, 255, 255];

function parseHex(h, fb) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(h == null ? '' : h).trim());
  const v = m ? m[1] : String(fb || '2563eb');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function toHex(rgb) {
  return '#' + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}
function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function luminance(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
// Mélange : t = part de « to » (0 = couleur de départ, 1 = « to »).
function mix(from, to, t) { return from.map((c, i) => c + (to[i] - c) * t); }

// Rapproche « fg » de noir (ou de blanc) jusqu'à atteindre le contraste demandé sur « bg ».
// Si la couleur est déjà assez contrastée, elle ne bouge pas.
function ensure(fg, bg, min, towards) {
  if (contrast(fg, bg) >= min) return fg.slice();
  const target = towards || (luminance(bg) > 0.4 ? [0, 0, 0] : [255, 255, 255]);
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (contrast(mix(fg, target, mid), bg) >= min) hi = mid; else lo = mid; }
  return mix(fg, target, hi);
}
// Blanc ou encre foncée : celui qui se lit le mieux sur « bg ».
function readableOn(bg) { return contrast(WHITE, bg) >= contrast(INK, bg) ? WHITE.slice() : INK.slice(); }

// Fond « doux » du site (même formule que --accent-soft dans la feuille de style).
function softBg(accent, dark) {
  return dark ? mix(parseHex('#1b2332'), accent, 0.22) : mix(WHITE, accent, 0.10);
}

// Fond accent + texte posé dessus : on garde la couleur du propriétaire tant qu'un texte (blanc ou encre) s'y lit (≥ 4.6:1).
// Pour les couleurs « du milieu » où ni l'un ni l'autre ne suffit, on ajuste le fond très légèrement :
// plus foncé (texte blanc) si la couleur est proche d'un fond foncé, plus clair (texte encre) si elle est plutôt claire.
function fillAndText(accent) {
  const MIN = 4.6;
  if (contrast(WHITE, accent) >= MIN) return { fill: accent, on: WHITE.slice() };
  if (contrast(INK, accent) >= MIN) {
    // Les deux conviennent peu : on préfère le blanc quand la couleur est franchement saturée/foncée (identité de marque).
    if (contrast(WHITE, accent) >= 3.2) return { fill: ensure(accent, WHITE, MIN, [0, 0, 0]), on: WHITE.slice() };
    return { fill: accent, on: INK.slice() };
  }
  if (contrast(WHITE, accent) >= contrast(INK, accent)) return { fill: ensure(accent, WHITE, MIN, [0, 0, 0]), on: WHITE.slice() };
  return { fill: ensure(accent, INK, MIN, [255, 255, 255]), on: INK.slice() };
}

// Toutes les variables de couleur d'un site.
//  accent  : la couleur du site, pour les fonds, bordures et pastilles (ajustée au minimum pour porter du texte)
//  ink     : l'accent utilisé comme TEXTE (≥ 4.6:1 sur le fond doux, la carte et le fond de page)
//  on      : texte posé SUR un fond accent (blanc ou encre foncée)
//  wa      : vert du bouton principal « WhatsApp », assez sombre pour porter du texte blanc
function siteColors(accentHex, dark) {
  const base = parseHex(accentHex, '1b4fd8');
  const ft = fillAndText(base);
  const accent = ft.fill, on = ft.on;
  const card = dark ? parseHex('#141b29') : WHITE;
  const page = dark ? parseHex('#0c111b') : parseHex('#f6f8fb');
  const soft = softBg(accent, !!dark);
  // Le texte accent doit se lire sur toutes les surfaces où il apparaît : on prend la plus exigeante.
  let ink = accent.slice();
  for (let i = 0; i < 4; i++) [card, page, soft].forEach((bg) => { if (contrast(ink, bg) < 4.6) ink = ensure(ink, bg, 4.7); });
  const wa = ensure(parseHex('#1fa855'), WHITE, 4.6, [0, 0, 0]);
  return { accent: toHex(accent), ink: toHex(ink), on: toHex(on), wa: toHex(wa), waOn: '#ffffff' };
}

module.exports = { siteColors, parseHex, toHex, luminance, contrast, mix, ensure, readableOn };
