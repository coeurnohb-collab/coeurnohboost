// api/_lib/site-icon.js : icône d'un site quand il n'a pas encore de logo.
// Un carré uni (couleur du site) avec la première lettre du nom, dessinée ici même (aucune image, aucune police, aucune dépendance).
// Ainsi, l'icône de l'écran d'accueil et l'onglet du navigateur ne montrent JAMAIS le logo de la plateforme.
'use strict';
const zlib = require('zlib');

// Lettres tracées à la main : chaque lettre = des lignes (points x 0-4, y 0-6).
const G = {
  A: [[[0, 6], [2, 0], [4, 6]], [[0.7, 4], [3.3, 4]]],
  B: [[[0, 0], [0, 6]], [[0, 0], [2.6, 0], [3.6, 0.6], [3.6, 2.4], [2.6, 3], [0, 3]], [[2.6, 3], [3.8, 3.6], [3.8, 5.4], [2.6, 6], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6]], [[0, 0], [2.4, 0], [4, 1.5], [4, 4.5], [2.4, 6], [0, 6]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[1, 0], [3, 0]], [[2, 0], [2, 6]], [[1, 6], [3, 6]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.5]], [[1.6, 2.4], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.6], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  P: [[[0, 6], [0, 0], [2.8, 0], [4, 1], [4, 2.4], [2.8, 3.4], [0, 3.4]]],
  Q: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[2.6, 4.4], [4, 6.4]]],
  R: [[[0, 6], [0, 0], [2.8, 0], [4, 1], [4, 2.4], [2.8, 3.4], [0, 3.4]], [[2, 3.4], [4, 6]]],
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2.2], [1, 3], [3, 3], [4, 3.8], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2.6], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  0: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  1: [[[0.8, 1.2], [2, 0], [2, 6]], [[0.8, 6], [3.2, 6]]],
  2: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2.2], [0, 6], [4, 6]]],
  3: [[[0, 0.6], [1, 0], [3, 0], [4, 1], [4, 2.2], [3, 3], [1.6, 3]], [[3, 3], [4, 3.8], [4, 5], [3, 6], [1, 6], [0, 5.4]]],
  4: [[[3, 6], [3, 0], [0, 4.2], [4, 4.2]]],
  5: [[[4, 0], [0.4, 0], [0, 3], [2.8, 2.6], [4, 3.6], [4, 5], [3, 6], [1, 6], [0, 5.2]]],
  6: [[[3.6, 0.4], [2, 0], [1, 0.4], [0, 2], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.8], [3, 2.8], [1, 2.8], [0, 3.8]]],
  7: [[[0, 0], [4, 0], [1.6, 6]]],
  8: [[[2, 3], [0.8, 2.6], [0.4, 1.4], [1, 0.2], [3, 0.2], [3.6, 1.4], [3.2, 2.6], [2, 3], [0.6, 3.5], [0, 4.8], [1, 6], [3, 6], [4, 4.8], [3.4, 3.5], [2, 3]]]
};
G[9] = G[6].map((l) => l.map((p) => [4 - p[0], 6 - p[1]]));

// Première lettre utilisable du nom (accents retirés) ; sinon « • » (un rond plein).
function letterOf(name) {
  const s = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const m = /[A-Z0-9]/.exec(s);
  return m ? m[0] : '';
}

function hexToRgb(h, fb) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(h || ''));
  const v = m ? m[1] : fb;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
// Blanc ou presque-noir : celui qui se lit le mieux sur la couleur du site.
function readableOn(rgb) {
  const l = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return l > 0.62 ? [15, 23, 42] : [255, 255, 255];
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Dessine l'icône : size px (carré), couleur de fond, lettre. opts.safe : lettre plus petite (icône « adaptative » d'Android, rognée en rond).
function monogramPng(name, color, size, opts) {
  const N = Math.max(48, Math.min(1024, Math.round(size) || 192));
  const o = opts || {};
  const bg = hexToRgb(color, '2563eb'), fg = readableOn(bg);
  const px = Buffer.alloc(N * N * 3);
  for (let i = 0; i < N * N; i++) { px[i * 3] = bg[0]; px[i * 3 + 1] = bg[1]; px[i * 3 + 2] = bg[2]; }
  const ch = letterOf(name);
  const H = N * (o.safe ? 0.40 : 0.50);   // hauteur de la lettre
  const k = H / 6, W = 4 * k;             // unité de la grille
  const ox = (N - W) / 2, oy = (N - H) / 2;
  const r = Math.max(1.2, N * 0.052);     // demi-épaisseur du trait
  const segs = [];
  if (ch && G[ch]) {
    G[ch].forEach((line) => { for (let i = 0; i + 1 < line.length; i++) segs.push([ox + line[i][0] * k, oy + line[i][1] * k, ox + line[i + 1][0] * k, oy + line[i + 1][1] * k]); });
  } else {
    // Pas de lettre lisible (nom en autre écriture) : un rond plein au centre.
    const cx = N / 2, cy = N / 2, rr = N * (o.safe ? 0.14 : 0.18);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), a = Math.max(0, Math.min(1, rr - d + 0.5));
      if (a > 0) { const p = (y * N + x) * 3; px[p] = Math.round(bg[0] + (fg[0] - bg[0]) * a); px[p + 1] = Math.round(bg[1] + (fg[1] - bg[1]) * a); px[p + 2] = Math.round(bg[2] + (fg[2] - bg[2]) * a); }
    }
    return encodePng(N, N, px);
  }
  segs.forEach((s) => {
    const x0 = Math.max(0, Math.floor(Math.min(s[0], s[2]) - r - 1)), x1 = Math.min(N - 1, Math.ceil(Math.max(s[0], s[2]) + r + 1));
    const y0 = Math.max(0, Math.floor(Math.min(s[1], s[3]) - r - 1)), y1 = Math.min(N - 1, Math.ceil(Math.max(s[1], s[3]) + r + 1));
    const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let t = ((x + 0.5 - s[0]) * dx + (y + 0.5 - s[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(x + 0.5 - (s[0] + t * dx), y + 0.5 - (s[1] + t * dy));
      const a = Math.max(0, Math.min(1, r - d + 0.5));
      if (a <= 0) continue;
      const p = (y * N + x) * 3;
      // Les traits se touchent : on garde la couverture la plus forte (pas de tache aux jonctions).
      const cur = px[p] === bg[0] && px[p + 1] === bg[1] && px[p + 2] === bg[2] ? 0 : (Math.abs(px[p] - bg[0]) + Math.abs(px[p + 1] - bg[1]) + Math.abs(px[p + 2] - bg[2])) / (Math.abs(fg[0] - bg[0]) + Math.abs(fg[1] - bg[1]) + Math.abs(fg[2] - bg[2]) || 1);
      if (a > cur) { px[p] = Math.round(bg[0] + (fg[0] - bg[0]) * a); px[p + 1] = Math.round(bg[1] + (fg[1] - bg[1]) * a); px[p + 2] = Math.round(bg[2] + (fg[2] - bg[2]) * a); }
    }
  });
  return encodePng(N, N, px);
}

module.exports = { monogramPng, letterOf, readableOn };
