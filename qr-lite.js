/* Coeurnoh Universe — générateur de QR Code autonome (octets, correction M, versions 1-10).
   Extrait du module « Boîte à outils » pour être réutilisé par les billets : window.CNQR.encode(texte) -> matrice
   de booléens (true = module foncé) ou null ; window.CNQR.svg(texte, {fg,bg,margin}) -> chaîne SVG. */
(function () {
  'use strict';
  if (window.CNQR) return;
  /* ---------- Générateur de QR Code (octets, correction M, versions 1-10) ---------- */
  var QR_ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  var QR_BLK = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

  function qrRawModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(degree) {
    var result = [], i, j;
    for (i = 0; i < degree; i++) result.push(0);
    result[degree - 1] = 1;
    var rootV = 1;
    for (i = 0; i < degree; i++) {
      for (j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], rootV);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      rootV = gfMul(rootV, 2);
    }
    return result;
  }
  function rsRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      divisor.forEach(function (coef, i) { result[i] ^= gfMul(coef, factor); });
    });
    return result;
  }
  function getBit(x, i) { return ((x >>> i) & 1) !== 0; }

  function qrPenalty(m) {
    var n = m.length, score = 0, x, y, k;
    var pA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var pB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function line(get) {
      var run = 1, i, j, ok1, ok2;
      for (i = 1; i < n; i++) {
        if (get(i) === get(i - 1)) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
      for (i = 0; i + 11 <= n; i++) {
        ok1 = true; ok2 = true;
        for (j = 0; j < 11; j++) {
          var v = get(i + j) ? 1 : 0;
          if (v !== pA[j]) ok1 = false;
          if (v !== pB[j]) ok2 = false;
        }
        if (ok1) score += 40;
        if (ok2) score += 40;
      }
    }
    for (y = 0; y < n; y++) (function (yy) { line(function (i) { return m[yy][i]; }); })(y);
    for (x = 0; x < n; x++) (function (xx) { line(function (i) { return m[i][xx]; }); })(x);
    var dark = 0;
    for (y = 0; y < n; y++) {
      for (x = 0; x < n; x++) {
        if (m[y][x]) dark++;
        if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
      }
    }
    var total = n * n;
    k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * 10;
    return score;
  }

  /* Renvoie une matrice de booléens (true = module foncé), ou null si le texte
     est vide ou trop long (capacité max ≈ 213 octets en version 10). */
  function qrEncode(text) {
    var data = [];
    if (typeof TextEncoder !== 'undefined') data = Array.prototype.slice.call(new TextEncoder().encode(text));
    else { var u = unescape(encodeURIComponent(text)); for (var q = 0; q < u.length; q++) data.push(u.charCodeAt(q)); }
    if (!data.length) return null;

    var ver, dataCap = 0;
    for (ver = 1; ver <= 10; ver++) {
      var cap = Math.floor(qrRawModules(ver) / 8) - QR_ECC[ver] * QR_BLK[ver];
      var bitsNeeded = 4 + (ver < 10 ? 8 : 16) + data.length * 8;
      if (bitsNeeded <= cap * 8) { dataCap = cap; break; }
    }
    if (!dataCap) return null;

    // 1) Bits de données
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4);
    put(data.length, ver < 10 ? 8 : 16);
    data.forEach(function (b) { put(b, 8); });
    var maxBits = dataCap * 8;
    put(0, Math.min(4, maxBits - bits.length));
    while (bits.length % 8) bits.push(0);
    for (var pad = 0xEC; bits.length < maxBits; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var codewords = [];
    for (var bi = 0; bi < bits.length; bi += 8) {
      var byte = 0;
      for (var bj = 0; bj < 8; bj++) byte = (byte << 1) | bits[bi + bj];
      codewords.push(byte);
    }

    // 2) Correction d'erreurs + entrelacement
    var numBlocks = QR_BLK[ver], blockEccLen = QR_ECC[ver];
    var rawCodewords = Math.floor(qrRawModules(ver) / 8);
    var numShort = numBlocks - rawCodewords % numBlocks;
    var shortBlockLen = Math.floor(rawCodewords / numBlocks);
    var blocks = [], div = rsDivisor(blockEccLen);
    for (var i = 0, k = 0; i < numBlocks; i++) {
      var datLen = shortBlockLen - blockEccLen + (i < numShort ? 0 : 1);
      var dat = codewords.slice(k, k + datLen);
      k += datLen;
      var ecc = rsRemainder(dat, div);
      if (i < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var all = [];
    for (var c = 0; c < blocks[0].length; c++) {
      blocks.forEach(function (blk, j) {
        if (c !== shortBlockLen - blockEccLen || j >= numShort) all.push(blk[c]);
      });
    }

    // 3) Matrice
    var size = ver * 4 + 17;
    var modules = [], isFn = [];
    for (var yy = 0; yy < size; yy++) {
      modules.push([]); isFn.push([]);
      for (var xx = 0; xx < size; xx++) { modules[yy].push(false); isFn[yy].push(false); }
    }
    function setFn(x, y, dark) { modules[y][x] = dark; isFn[y][x] = true; }

    for (var t = 0; t < size; t++) { setFn(6, t, t % 2 === 0); setFn(t, 6, t % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var alignPos = [];
    if (ver > 1) {
      var numAlign = Math.floor(ver / 7) + 2;
      var step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
      alignPos = [6];
      for (var pos = size - 7; alignPos.length < numAlign; pos -= step) alignPos.splice(1, 0, pos);
    }
    for (var ai = 0; ai < alignPos.length; ai++) for (var aj = 0; aj < alignPos.length; aj++) {
      var last = alignPos.length - 1;
      if ((ai === 0 && aj === 0) || (ai === 0 && aj === last) || (ai === last && aj === 0)) continue;
      for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++)
        setFn(alignPos[ai] + ax, alignPos[aj] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
    }

    function drawFormat(mask) {
      var d = (0 << 3) | mask; // niveau de correction M = 0
      var rem = d;
      for (var r = 0; r < 10; r++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fb = ((d << 10) | rem) ^ 0x5412, n;
      for (n = 0; n <= 5; n++) setFn(8, n, getBit(fb, n));
      setFn(8, 7, getBit(fb, 6)); setFn(8, 8, getBit(fb, 7)); setFn(7, 8, getBit(fb, 8));
      for (n = 9; n < 15; n++) setFn(14 - n, 8, getBit(fb, n));
      for (n = 0; n < 8; n++) setFn(size - 1 - n, 8, getBit(fb, n));
      for (n = 8; n < 15; n++) setFn(8, size - 15 + n, getBit(fb, n));
      setFn(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var vr = ver;
      for (var v = 0; v < 12; v++) vr = (vr << 1) ^ ((vr >>> 11) * 0x1F25);
      var vb = (ver << 12) | vr;
      for (var vi = 0; vi < 18; vi++) {
        var a = size - 11 + vi % 3, b = Math.floor(vi / 3);
        setFn(a, b, getBit(vb, vi)); setFn(b, a, getBit(vb, vi));
      }
    }

    var bitIdx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x2 = right - j, upward = ((right + 1) & 2) === 0, y2 = upward ? size - 1 - vert : vert;
          if (!isFn[y2][x2] && bitIdx < all.length * 8) {
            modules[y2][x2] = getBit(all[bitIdx >>> 3], 7 - (bitIdx & 7));
            bitIdx++;
          }
        }
      }
    }

    function applyMask(mask) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var inv;
        switch (mask) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!isFn[y][x] && inv) modules[y][x] = !modules[y][x];
      }
    }
    var bestMask = 0, bestScore = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      applyMask(mk); drawFormat(mk);
      var sc = qrPenalty(modules);
      if (sc < bestScore) { bestScore = sc; bestMask = mk; }
      applyMask(mk); // annule
    }
    applyMask(bestMask); drawFormat(bestMask);
    return modules;
  }

  function svg(text, o) {
    o = o || {}; var m = qrEncode(text); if (!m) return '';
    var n = m.length, q = o.margin == null ? 3 : o.margin, fg = o.fg || '#000', bg = o.bg || '#fff', d = '';
    for (var y = 0; y < n; y++) { var x = 0; while (x < n) { if (m[y][x]) { var s = x; while (x < n && m[y][x]) x++; d += 'M' + (s + q) + ' ' + (y + q) + 'h' + (x - s) + 'v1h-' + (x - s) + 'z'; } else x++; } }
    var t = n + q * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + ' ' + t + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="' + t + '" height="' + t + '" fill="' + bg + '"/><path d="' + d + '" fill="' + fg + '"/></svg>';
  }
  window.CNQR = { encode: qrEncode, svg: svg };
})();
