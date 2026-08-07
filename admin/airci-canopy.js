/**
 * AirCI — detección de copas (ExG + componentes) y semáforo por área.
 * F2: máscara más estricta, exclusiones forma/borde, confianza por copa.
 */
(function (global) {
  'use strict';

  var MIN_AREA_PX = 280;
  var MAX_TREES = 15000;
  /** Descarta “blobs” que son casi toda la vegetación (pasto unido / bordes) */
  var MAX_AREA_FRAC = 0.01; // 1.0% del área de la imagen
  var MAX_AREA_VS_MEDIAN = 6.5; // > 6.5× mediana = outlier
  var MIN_FILL_RATIO = 0.18; // área / bbox: muy hueco = pasto/borde
  var MAX_ASPECT = 2.8; // árbol ≈ redondo; >2.8 suele ser franja/pasto
  var MIN_CONFIDENCE = 42; // debajo: se excluye del lote
  var BORDER_CLEAR_PX = 2; // anillo del orto sin vegetación (artefactos)
  /** Diámetro mínimo típico de copa frutal (no “pasto verde”) */
  var MIN_CANOPY_DIAM_M = 2.0;
  /** Fragmento vs mediana del lote: debajo = pedazo de árbol, no árbol */
  var MIN_FRAC_OF_MEDIAN = 0.28;
  /** Distancia máx. (× radio mediano) para fusionar micro-copas de la misma planta */
  var MERGE_GAP_FRAC = 0.95;
  /** Radio de suavizado ExG en metros (une textura de una misma copa) */
  var EXG_BLUR_M = 0.9;

  function bandScale(v, max) {
    var n = Number(v);
    if (!Number.isFinite(n)) return 0;
    var mx = max != null && max > 0 ? max : 255;
    if (mx > 255) return Math.max(0, Math.min(255, (n / mx) * 255));
    return Math.max(0, Math.min(255, n));
  }

  function flattenBand(band, expectedLen) {
    if (!band) return null;
    if (band.length === expectedLen && typeof band[0] === 'number') return band;
    if (typeof band[0] !== 'undefined' && band[0].length != null) {
      var out = new Float32Array(expectedLen);
      var i = 0;
      for (var y = 0; y < band.length; y++) {
        var row = band[y];
        for (var x = 0; x < row.length; x++) out[i++] = row[x];
      }
      return out;
    }
    return band;
  }

  function getBandArrays(georaster) {
    var rasters = georaster.rasters || georaster.values;
    if (!rasters || !rasters.length) return null;
    var n = georaster.width * georaster.height;
    var r = flattenBand(rasters[0], n);
    var g = flattenBand(rasters.length > 1 ? rasters[1] : rasters[0], n);
    var b = flattenBand(rasters.length > 2 ? rasters[2] : rasters[0], n);
    if (!r || !g || !b) return null;
    return { r: r, g: g, b: b, maxs: georaster.maxs || [255, 255, 255] };
  }

  function percentileFromHist(hist, total, p) {
    var need = (p / 100) * total;
    var acc = 0;
    for (var i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= need) return i;
    }
    return 255;
  }

  function boxBlurU8(src, w, h, radius) {
    var r = Math.max(1, Math.min(24, radius | 0));
    var n = w * h;
    var tmp = new Float32Array(n);
    var out = new Float32Array(n);
    var diam = r * 2 + 1;
    // horizontal
    for (var y = 0; y < h; y++) {
      var row = y * w;
      var acc = 0;
      for (var i = -r; i <= r; i++) {
        var xx = Math.max(0, Math.min(w - 1, i));
        acc += src[row + xx];
      }
      for (var x = 0; x < w; x++) {
        tmp[row + x] = acc / diam;
        var leave = Math.max(0, Math.min(w - 1, x - r));
        var add = Math.max(0, Math.min(w - 1, x + r + 1));
        acc += src[row + add] - src[row + leave];
      }
    }
    // vertical
    for (var x2 = 0; x2 < w; x2++) {
      var acc2 = 0;
      for (var j = -r; j <= r; j++) {
        var yy = Math.max(0, Math.min(h - 1, j));
        acc2 += tmp[yy * w + x2];
      }
      for (var y2 = 0; y2 < h; y2++) {
        out[y2 * w + x2] = acc2 / diam;
        var leaveY = Math.max(0, Math.min(h - 1, y2 - r));
        var addY = Math.max(0, Math.min(h - 1, y2 + r + 1));
        acc2 += tmp[addY * w + x2] - tmp[leaveY * w + x2];
      }
    }
    return out;
  }

  /**
   * ExG con perfil:
   * - 'strict' → F2 estricto
   * - 'ai' → permisivo por defecto
   * - objeto calibration de la IA → parámetros calibrados
   */
  function resolveExgParams(profileOrCalib) {
    var c =
      profileOrCalib && typeof profileOrCalib === 'object' ? profileOrCalib : null;
    var mode =
      c != null
        ? 'calib'
        : profileOrCalib === 'ai'
          ? 'ai'
          : 'strict';
    if (mode === 'calib') {
      return {
        mode: 'calib',
        gMargin: Number(c.g_margin) || 0.035,
        bMargin: Number(c.b_margin) || 0.03,
        gAbs: Number(c.g_abs) || 4,
        bAbs: Number(c.b_abs) || 3,
        darkSum: Number(c.dark_sum) || 40,
        minG: Number(c.min_g) || 24,
        pct: Number(c.exg_percentile) || 58,
        thrMin: Number(c.thr_min) || 60,
        thrMax: Number(c.thr_max) || 165,
        erosionPasses: Number(c.erosion_passes) === 2 ? 2 : 1,
        closePasses: Number(c.close_passes) >= 1 ? Math.min(5, Number(c.close_passes) | 0) : 3,
        blurM: Number(c.blur_m) > 0 ? Number(c.blur_m) : EXG_BLUR_M,
        allowYellow: c.allow_yellow_green !== false,
        yellowBoost: c.yellow_boost !== false,
        minAreaPx: Math.max(200, Number(c.min_area_px) || 260),
        minConfidence: Math.max(36, Number(c.min_confidence) || 40),
        cropHint: c.crop_hint || ''
      };
    }
    if (mode === 'ai') {
      return {
        mode: 'ai',
        gMargin: 0.03,
        bMargin: 0.025,
        gAbs: 3,
        bAbs: 2,
        darkSum: 42,
        minG: 22,
        pct: 52,
        thrMin: 48,
        thrMax: 150,
        erosionPasses: 1,
        closePasses: 3,
        blurM: EXG_BLUR_M,
        allowYellow: true,
        yellowBoost: true,
        minAreaPx: 240,
        minConfidence: 38,
        cropHint: ''
      };
    }
    return {
      mode: 'strict',
      gMargin: 0.055,
      bMargin: 0.04,
      gAbs: 6,
      bAbs: 4,
      darkSum: 52,
      minG: 28,
      pct: 62,
      thrMin: 70,
      thrMax: 165,
      erosionPasses: 1,
      closePasses: 3,
      blurM: EXG_BLUR_M,
      allowYellow: false,
      yellowBoost: false,
      minAreaPx: MIN_AREA_PX,
      minConfidence: MIN_CONFIDENCE,
      cropHint: ''
    };
  }

  function buildVegetationMask(georaster, profileOrCalib) {
    var P = resolveExgParams(profileOrCalib);
    var bands = getBandArrays(georaster);
    if (!bands) throw new Error('GeoTIFF sin bandas RGB');
    var w = georaster.width;
    var h = georaster.height;
    var n = w * h;
    var exg = new Float32Array(n);
    var hist = new Array(256);
    for (var i = 0; i < 256; i++) hist[i] = 0;
    var valid = 0;
    var maxR = bands.maxs[0];
    var maxG = bands.maxs[1] != null ? bands.maxs[1] : bands.maxs[0];
    var maxB = bands.maxs[2] != null ? bands.maxs[2] : bands.maxs[0];

    for (var p = 0; p < n; p++) {
      var R = bandScale(bands.r[p], maxR);
      var G = bandScale(bands.g[p], maxG);
      var B = bandScale(bands.b[p], maxB);
      var s = R + G + B;
      var v = 0;
      // Sombra / casi negro: no es copa
      if (s < P.darkSum || (R < 22 && G < 24 && B < 22) || G < P.minG) {
        v = 0;
      } else if (s > 300 && R + 8 >= G && Math.abs(R - G) < 35 && G > B + 8) {
        // Pasto soleado amarillo-verdoso brillante (no copa oscura)
        v = 0;
      } else {
        var r = R / s;
        var g = G / s;
        var b = B / s;
        var greenOk = P.allowYellow
          ? g + 0.015 >= r && g > b + P.bMargin && G + 6 >= R && G > B + P.bAbs
          : g > r + P.gMargin &&
            g > b + P.bMargin &&
            G > R + P.gAbs &&
            G > B + P.bAbs;
        if (greenOk) {
          var raw = 2 * g - r - b;
          if (P.yellowBoost && R > G && R - G < 28 && G > B + 4) {
            raw = Math.max(raw, 0.15);
          }
          // Preferir verde de copa (más oscuro) vs pasto claro
          if (s > 340) raw *= 0.55;
          v = Math.max(0, Math.min(255, Math.round((raw + 1) * 127.5)));
        } else {
          v = 0;
        }
      }
      exg[p] = v;
      if (v > 0) {
        hist[v]++;
        valid++;
      }
    }

    var thr =
      valid > 100 ? percentileFromHist(hist, valid, P.pct) : P.mode === 'strict' ? 95 : 70;
    thr = Math.max(P.thrMin, Math.min(thr, P.thrMax));

    // Suavizar ExG a escala de copa: une textura de UN árbol (evita micro-triángulos)
    var gsdGuess = estimateGsdM(georaster);
    var blurM = P.blurM != null ? P.blurM : EXG_BLUR_M;
    var blurPx = 6;
    if (gsdGuess != null && Number.isFinite(gsdGuess) && gsdGuess > 0) {
      blurPx = Math.max(3, Math.min(22, Math.round(blurM / gsdGuess)));
    } else {
      blurPx = Math.max(4, Math.min(16, Math.round(Math.min(w, h) / 180)));
    }
    var blurred = boxBlurU8(exg, w, h, blurPx);
    var histB = new Array(256);
    for (var hb = 0; hb < 256; hb++) histB[hb] = 0;
    var validB = 0;
    for (var bi = 0; bi < n; bi++) {
      var bv = Math.max(0, Math.min(255, Math.round(blurred[bi])));
      blurred[bi] = bv;
      if (bv > 8) {
        histB[bv]++;
        validB++;
      }
    }
    var thrB =
      validB > 100 ? percentileFromHist(histB, validB, Math.max(40, P.pct - 8)) : thr;
    thrB = Math.max(P.thrMin - 8, Math.min(thrB, P.thrMax));

    var mask = new Uint8Array(n);
    for (var q = 0; q < n; q++) {
      // Requiere señal suavizada (copa) y algo de ExG original (no sombra pura)
      if (blurred[q] >= thrB && exg[q] >= Math.max(12, thr * 0.25)) mask[q] = 1;
    }

    function dilateOnce(src) {
      var out = new Uint8Array(n);
      for (var yy = 1; yy < h - 1; yy++) {
        for (var xx = 1; xx < w - 1; xx++) {
          var ii = yy * w + xx;
          if (
            src[ii] ||
            src[ii - 1] ||
            src[ii + 1] ||
            src[ii - w] ||
            src[ii + w]
          ) {
            out[ii] = 1;
          }
        }
      }
      return out;
    }

    function erodeOnce(src) {
      var out = new Uint8Array(n);
      for (var yy = 1; yy < h - 1; yy++) {
        for (var xx = 1; xx < w - 1; xx++) {
          var ii = yy * w + xx;
          if (
            src[ii] &&
            src[ii - 1] &&
            src[ii + 1] &&
            src[ii - w] &&
            src[ii + w]
          ) {
            out[ii] = 1;
          }
        }
      }
      return out;
    }

    // Cierre fuerte: dilatar varias veces (rellena huecos de la copa) + erosión suave
    var closeN = P.closePasses != null ? P.closePasses : 3;
    closeN = Math.max(2, Math.min(5, closeN));
    var dil = mask;
    for (var cp = 0; cp < closeN; cp++) {
      dil = dilateOnce(dil);
    }
    var erodeN = P.erosionPasses >= 2 ? 2 : 1;
    for (var ep = 0; ep < erodeN; ep++) {
      dil = erodeOnce(dil);
    }

    var count = 0;
    for (var ci = 0; ci < n; ci++) {
      if (dil[ci]) count++;
    }

    var clear = Math.max(1, Math.min(BORDER_CLEAR_PX, ((Math.min(w, h) / 2) | 0) - 1));
    for (var by = 0; by < h; by++) {
      for (var bx = 0; bx < w; bx++) {
        if (bx < clear || by < clear || bx >= w - clear || by >= h - clear) {
          var bix = by * w + bx;
          if (dil[bix]) {
            dil[bix] = 0;
            count--;
          }
        }
      }
    }

    return {
      mask: dil,
      exg: exg,
      threshold: thrB,
      vegPixels: Math.max(0, count),
      width: w,
      height: h,
      profile: P.mode,
      params: P,
      blurPx: blurPx
    };
  }

  function connectedComponents(mask, width, height, minArea, exg) {
    var n = width * height;
    var labels = new Int32Array(n);
    var parent = [0];
    var nextLabel = 1;

    function find(a) {
      while (parent[a] !== a) {
        parent[a] = parent[parent[a]];
        a = parent[a];
      }
      return a;
    }
    function union(a, b) {
      a = find(a);
      b = find(b);
      if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
    }

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var i = y * width + x;
        if (!mask[i]) continue;
        var left = x > 0 ? labels[i - 1] : 0;
        var up = y > 0 ? labels[i - width] : 0;
        if (left && up) {
          labels[i] = Math.min(left, up);
          union(left, up);
        } else if (left) {
          labels[i] = left;
        } else if (up) {
          labels[i] = up;
        } else {
          parent[nextLabel] = nextLabel;
          labels[i] = nextLabel++;
        }
      }
    }

    var remap = Object.create(null);
    var areas = Object.create(null);
    var boxes = Object.create(null);
    var points = Object.create(null);
    var sumExg = Object.create(null);
    var borderPx = Object.create(null);

    for (var p = 0; p < n; p++) {
      var lab = labels[p];
      if (!lab) continue;
      var root = find(lab);
      if (!remap[root]) remap[root] = root;
      labels[p] = root;
      areas[root] = (areas[root] || 0) + 1;
      if (exg) sumExg[root] = (sumExg[root] || 0) + (exg[p] || 0);
      var xx = p % width;
      var yy = (p / width) | 0;
      if (xx === 0 || yy === 0 || xx === width - 1 || yy === height - 1) {
        borderPx[root] = (borderPx[root] || 0) + 1;
      }
      if (!boxes[root]) {
        boxes[root] = { minX: xx, minY: yy, maxX: xx, maxY: yy };
        points[root] = [];
      } else {
        var bx = boxes[root];
        if (xx < bx.minX) bx.minX = xx;
        if (yy < bx.minY) bx.minY = yy;
        if (xx > bx.maxX) bx.maxX = xx;
        if (yy > bx.maxY) bx.maxY = yy;
      }
      // muestrear borde para polígono liviano
      if (points[root].length < 120) {
        var edge =
          xx === 0 ||
          yy === 0 ||
          xx === width - 1 ||
          yy === height - 1 ||
          !mask[p - 1] ||
          !mask[p + 1] ||
          !mask[p - width] ||
          !mask[p + width];
        if (edge) points[root].push([xx, yy]);
      }
    }

    var comps = [];
    Object.keys(areas).forEach(function (k) {
      var id = Number(k);
      var area = areas[id];
      if (area < minArea) return;
      var box = boxes[id];
      var boxW = box.maxX - box.minX + 1;
      var boxH = box.maxY - box.minY + 1;
      var fill = area / Math.max(1, boxW * boxH);
      var aspect = Math.max(boxW, boxH) / Math.max(1, Math.min(boxW, boxH));
      var meanExg = sumExg[id] != null ? sumExg[id] / area : 0;
      var touchesBorder = (borderPx[id] || 0) > 0;
      // Circularidad proxy: área / círculo del diámetro mayor del bbox (árbol ≈ 0.35–0.9)
      var circ =
        (4 * area) / (Math.PI * Math.max(boxW, boxH) * Math.max(boxW, boxH));
      comps.push({
        label: id,
        areaPx: area,
        box: box,
        edge: points[id] || [],
        fillRatio: fill,
        aspect: aspect,
        circularity: circ,
        meanExg: meanExg,
        touchesBorder: touchesBorder,
        borderPx: borderPx[id] || 0
      });
    });

    return { comps: comps, labels: labels };
  }

  /** ¿Parece árbol/copa (redondo-compacto) y no pasto/franja? */
  function looksLikeTree(comp) {
    var fill = Number(comp.fillRatio) || 0;
    var aspect = Number(comp.aspect) || 1;
    var circ = Number(comp.circularity);
    if (!Number.isFinite(circ)) {
      var bw = comp.box ? comp.box.maxX - comp.box.minX + 1 : 1;
      var bh = comp.box ? comp.box.maxY - comp.box.minY + 1 : 1;
      circ = (4 * (comp.areaPx || 0)) / (Math.PI * Math.max(bw, bh) * Math.max(bw, bh));
    }
    if (fill < MIN_FILL_RATIO) return false;
    if (aspect > MAX_ASPECT) return false;
    if (circ < 0.22) return false;
    // Muy alargado + poco lleno = pasto / surco
    if (aspect > 2.2 && fill < 0.32) return false;
    if (comp.touchesBorder && fill < 0.28 && aspect > 2.0) return false;
    return true;
  }

  /** Confianza 0–100: prior de “es un árbol”, no solo vegetación verde. */
  function scoreCanopy(comp, medianArea) {
    var fill = Number(comp.fillRatio) || 0;
    var aspect = Number(comp.aspect) || 1;
    var area = Number(comp.areaPx) || 0;
    var meanExg = Number(comp.meanExg) || 0;
    var circ = Number(comp.circularity);
    if (!Number.isFinite(circ)) {
      var bw = comp.box ? comp.box.maxX - comp.box.minX + 1 : 1;
      var bh = comp.box ? comp.box.maxY - comp.box.minY + 1 : 1;
      circ = (4 * area) / (Math.PI * Math.max(bw, bh) * Math.max(bw, bh));
    }

    var compact = Math.max(0, Math.min(1, (fill - 0.15) / 0.5));
    var roundScore = Math.max(0, Math.min(1, 1 - (aspect - 1) / 2.2));
    var circScore = Math.max(0, Math.min(1, (circ - 0.15) / 0.55));
    var exgScore = Math.max(0, Math.min(1, meanExg / 180));
    var sizeScore = 0.45;
    if (medianArea > 0 && area > 0) {
      var ratio = area / medianArea;
      // Un árbol del lote suele estar cerca de la mediana (no un trocito)
      if (ratio >= 0.45 && ratio <= 2.4) sizeScore = 1;
      else if (ratio >= 0.28 && ratio <= 3.5) sizeScore = 0.7;
      else if (ratio >= 0.18 && ratio <= 4.5) sizeScore = 0.4;
      else sizeScore = 0.12;
    }
    var borderScore = comp.touchesBorder ? 0.5 : 1;
    var conf =
      100 *
      (0.22 * compact +
        0.2 * roundScore +
        0.22 * circScore +
        0.14 * exgScore +
        0.16 * sizeScore +
        0.06 * borderScore);
    return Math.max(0, Math.min(100, Math.round(conf)));
  }

  function isGrassLikeShape(comp) {
    return !looksLikeTree(comp);
  }

  function pixelToLatLng(georaster, x, y) {
    var xmin = georaster.xmin;
    var xmax = georaster.xmax;
    var ymin = georaster.ymin;
    var ymax = georaster.ymax;
    var w = georaster.width;
    var h = georaster.height;
    if (
      xmin == null ||
      xmax == null ||
      ymin == null ||
      ymax == null ||
      !Number.isFinite(xmin) ||
      !Number.isFinite(xmax)
    ) {
      // sin geo: coordenadas falsas en “espacio imagen”
      return [h - y, x];
    }
    var lng = xmin + ((x + 0.5) / w) * (xmax - xmin);
    var lat = ymax - ((y + 0.5) / h) * (ymax - ymin);
    return [lat, lng];
  }

  function convexHull(points) {
    if (points.length < 3) return points.slice();
    var pts = points.slice().sort(function (a, b) {
      return a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
    });
    function cross(o, a, b) {
      return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    var lower = [];
    for (var i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) {
        lower.pop();
      }
      lower.push(pts[i]);
    }
    var upper = [];
    for (var j = pts.length - 1; j >= 0; j--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[j]) <= 0) {
        upper.pop();
      }
      upper.push(pts[j]);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  function componentToLatLngs(georaster, comp) {
    var pts = comp.edge;
    if (pts.length < 3) {
      var b = comp.box;
      pts = [
        [b.minX, b.minY],
        [b.maxX, b.minY],
        [b.maxX, b.maxY],
        [b.minX, b.maxY]
      ];
    }
    var hull = convexHull(pts);
    if (hull.length < 3) {
      var bb = comp.box;
      hull = [
        [bb.minX, bb.minY],
        [bb.maxX, bb.minY],
        [bb.maxX, bb.maxY],
        [bb.minX, bb.maxY]
      ];
    }
    return hull.map(function (xy) {
      return pixelToLatLng(georaster, xy[0], xy[1]);
    });
  }

  function meanStd(arr) {
    if (!arr.length) return { mean: 0, std: 1 };
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    var mean = sum / arr.length;
    var v = 0;
    for (var j = 0; j < arr.length; j++) {
      var d = arr[j] - mean;
      v += d * d;
    }
    var std = Math.sqrt(v / arr.length);
    if (std < 1e-6) std = 1;
    return { mean: mean, std: std };
  }

  function semaforoClass(z) {
    if (z < -1.5) return { key: 'rojo', label: 'Muy bajo', color: '#dc2626', fill: '#dc262699' };
    if (z < -0.5) return { key: 'amarillo', label: 'Por debajo', color: '#ca8a04', fill: '#eab30899' };
    if (z <= 0.5) return { key: 'verde', label: 'Promedio', color: '#16a34a', fill: '#22c55e99' };
    return { key: 'azul', label: 'Por encima', color: '#2563eb', fill: '#3b82f699' };
  }

  function haversineM(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var toRad = Math.PI / 180;
    var φ1 = lat1 * toRad;
    var φ2 = lat2 * toRad;
    var Δφ = (lat2 - lat1) * toRad;
    var Δλ = (lon2 - lon1) * toRad;
    var a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function treeCenter(t) {
    if (!t || !t.center || t.center.length < 2) return null;
    var lat = Number(t.center[0]);
    var lng = Number(t.center[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  }

  function centersLookGeo(trees) {
    for (var i = 0; i < Math.min(trees.length, 8); i++) {
      var c = treeCenter(trees[i]);
      if (!c) continue;
      if (Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180) return true;
    }
    return false;
  }

  function distTrees(a, b, useGeo) {
    var ca = treeCenter(a);
    var cb = treeCenter(b);
    if (!ca || !cb) return Infinity;
    if (useGeo) return haversineM(ca[0], ca[1], cb[0], cb[1]);
    var dy = ca[0] - cb[0];
    var dx = ca[1] - cb[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function estimateMaxMatchDist(prevTrees, useGeo, gsdM) {
    if (!prevTrees || prevTrees.length < 2) {
      return useGeo ? 3.5 : 30;
    }
    var sample = prevTrees.slice(0, Math.min(prevTrees.length, 400));
    var nearest = [];
    for (var i = 0; i < sample.length; i++) {
      var best = Infinity;
      for (var j = 0; j < sample.length; j++) {
        if (i === j) continue;
        var d = distTrees(sample[i], sample[j], useGeo);
        if (d < best) best = d;
      }
      if (Number.isFinite(best) && best < Infinity) nearest.push(best);
    }
    nearest.sort(function (x, y) {
      return x - y;
    });
    var med = nearest.length ? nearest[(nearest.length / 2) | 0] : useGeo ? 4 : 40;
    var cap = useGeo ? Math.max(2, Math.min(8, med * 0.45)) : Math.max(12, Math.min(60, med * 0.45));
    if (useGeo && gsdM != null && Number.isFinite(Number(gsdM)) && Number(gsdM) > 0) {
      // al menos ~8 píxeles de GSD
      cap = Math.max(cap, Number(gsdM) * 8);
      cap = Math.min(cap, 12);
    }
    return cap;
  }

  function parseStableNum(id) {
    if (id == null) return null;
    var s = String(id);
    var m = s.match(/(\d+)\s*$/);
    return m ? Number(m[1]) : null;
  }

  function deltaSemClass(deltaPct) {
    if (deltaPct == null || !Number.isFinite(Number(deltaPct))) {
      return { key: 'nuevo', label: 'Nuevo', color: '#64748b', fill: '#94a3b899' };
    }
    var p = Number(deltaPct);
    if (p <= -20) {
      return { key: 'baja', label: 'Redujo', color: '#dc2626', fill: '#dc262699' };
    }
    if (p < -5) {
      return { key: 'leve_baja', label: 'Bajó poco', color: '#ca8a04', fill: '#eab30899' };
    }
    if (p <= 5) {
      return { key: 'igual', label: 'Estable', color: '#16a34a', fill: '#22c55e99' };
    }
    if (p < 20) {
      return { key: 'leve_alta', label: 'Subió poco', color: '#2563eb', fill: '#3b82f699' };
    }
    return { key: 'alta', label: 'Creció', color: '#1d4ed8', fill: '#1e40af99' };
  }

  /**
   * Empareja copas del vuelo actual con el anterior por proximidad del centro.
   * Mutates current trees: stableId, matchStatus, deltas, semDelta.
   * @returns summary object
   */
  function matchTreesAcrossFlights(currentTrees, previousTrees, opts) {
    opts = opts || {};
    currentTrees = Array.isArray(currentTrees) ? currentTrees : [];
    previousTrees = Array.isArray(previousTrees) ? previousTrees : [];
    var useGeo =
      opts.useGeo != null
        ? !!opts.useGeo
        : centersLookGeo(currentTrees) && centersLookGeo(previousTrees);
    var maxDist =
      opts.maxDist != null
        ? Number(opts.maxDist)
        : estimateMaxMatchDist(previousTrees, useGeo, opts.gsdM);

    var usedPrev = {};
    var usedCur = {};
    var pairs = [];
    var i;
    var j;

    for (i = 0; i < currentTrees.length; i++) {
      if (!treeCenter(currentTrees[i])) continue;
      for (j = 0; j < previousTrees.length; j++) {
        if (!treeCenter(previousTrees[j])) continue;
        var d = distTrees(currentTrees[i], previousTrees[j], useGeo);
        if (d <= maxDist) {
          pairs.push({ ci: i, pj: j, d: d });
        }
      }
    }
    pairs.sort(function (a, b) {
      return a.d - b.d;
    });

    var matches = [];
    for (i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (usedCur[p.ci] || usedPrev[p.pj]) continue;
      usedCur[p.ci] = true;
      usedPrev[p.pj] = true;
      matches.push(p);
    }

    var maxStable = 0;
    previousTrees.forEach(function (t) {
      var n = parseStableNum(t.stableId != null ? t.stableId : t.id);
      if (n != null && n > maxStable) maxStable = n;
    });
    currentTrees.forEach(function (t) {
      var n = parseStableNum(t.stableId);
      if (n != null && n > maxStable) maxStable = n;
    });

    var matched = 0;
    var meanDeltaPct = 0;
    var deltaN = 0;
    var grown = 0;
    var shrunk = 0;
    var flat = 0;

    matches.forEach(function (m) {
      var cur = currentTrees[m.ci];
      var prev = previousTrees[m.pj];
      var sid =
        prev.stableId != null && String(prev.stableId) !== ''
          ? String(prev.stableId)
          : String(prev.id);
      cur.stableId = sid;
      cur.matchStatus = 'matched';
      cur.matchDistM = useGeo ? m.d : null;
      cur.matchDist = m.d;
      cur.prevId = prev.id;
      cur.prevAreaPx = prev.areaPx != null ? Number(prev.areaPx) : null;
      cur.prevAreaM2 =
        prev.areaM2 != null && Number.isFinite(Number(prev.areaM2))
          ? Number(prev.areaM2)
          : null;
      var curPx = Number(cur.areaPx) || 0;
      var prevPx = cur.prevAreaPx != null ? cur.prevAreaPx : null;
      if (prevPx != null && prevPx > 0) {
        cur.deltaAreaPx = curPx - prevPx;
        cur.deltaAreaPct = ((curPx - prevPx) / prevPx) * 100;
      } else {
        cur.deltaAreaPx = null;
        cur.deltaAreaPct = null;
      }
      if (cur.areaM2 != null && cur.prevAreaM2 != null) {
        cur.deltaAreaM2 = Number(cur.areaM2) - Number(cur.prevAreaM2);
        if (cur.prevAreaM2 > 0) {
          cur.deltaAreaPct =
            ((Number(cur.areaM2) - Number(cur.prevAreaM2)) / Number(cur.prevAreaM2)) * 100;
        }
      } else {
        cur.deltaAreaM2 = null;
      }
      cur.semDelta = deltaSemClass(cur.deltaAreaPct);
      matched += 1;
      if (cur.deltaAreaPct != null && Number.isFinite(cur.deltaAreaPct)) {
        meanDeltaPct += cur.deltaAreaPct;
        deltaN += 1;
        if (cur.deltaAreaPct > 5) grown += 1;
        else if (cur.deltaAreaPct < -5) shrunk += 1;
        else flat += 1;
      }
    });

    var nextNew = maxStable;
    currentTrees.forEach(function (cur, idx) {
      if (usedCur[idx]) return;
      nextNew += 1;
      cur.stableId = 'N' + nextNew;
      cur.matchStatus = 'new';
      cur.matchDistM = null;
      cur.matchDist = null;
      cur.prevId = null;
      cur.prevAreaPx = null;
      cur.prevAreaM2 = null;
      cur.deltaAreaPx = null;
      cur.deltaAreaM2 = null;
      cur.deltaAreaPct = null;
      cur.semDelta = deltaSemClass(null);
    });

    var missing = [];
    previousTrees.forEach(function (prev, pj) {
      if (usedPrev[pj]) return;
      missing.push({
        stableId:
          prev.stableId != null && String(prev.stableId) !== ''
            ? String(prev.stableId)
            : String(prev.id),
        id: prev.id,
        areaPx: prev.areaPx,
        areaM2: prev.areaM2,
        center: prev.center,
        row: prev.row,
        pos: prev.pos
      });
    });

    return {
      matched: matched,
      neu: currentTrees.length - matched,
      missing: missing.length,
      missingTrees: missing,
      grown: grown,
      shrunk: shrunk,
      flat: flat,
      meanDeltaPct: deltaN ? meanDeltaPct / deltaN : null,
      maxDist: maxDist,
      useGeo: useGeo,
      hasHistory: previousTrees.length > 0
    };
  }

  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) {
      return x - y;
    });
    var m = (a.length / 2) | 0;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  /** GSD en metros/píxel si el GeoTIFF trae georreferencia usable; si no, null. */
  function estimateGsdM(georaster) {
    var w = georaster.width;
    var h = georaster.height;
    if (!w || !h) return null;
    var pw = Number(georaster.pixelWidth);
    var ph = Number(georaster.pixelHeight);
    if (!Number.isFinite(pw) || !Number.isFinite(ph) || pw <= 0 || ph <= 0) {
      if (
        georaster.xmax == null ||
        georaster.xmin == null ||
        georaster.ymax == null ||
        georaster.ymin == null
      ) {
        return null;
      }
      pw = (georaster.xmax - georaster.xmin) / w;
      ph = (georaster.ymax - georaster.ymin) / h;
    }
    if (!Number.isFinite(pw) || !Number.isFinite(ph) || pw <= 0 || ph <= 0) return null;

    var proj = String(georaster.projection != null ? georaster.projection : '');
    var looksDegrees =
      (Math.abs(pw) < 0.01 && Math.abs(ph) < 0.01) ||
      proj === '4326' ||
      /4326/.test(proj) ||
      /WGS\s*84/i.test(proj);
    var gx;
    var gy;
    if (looksDegrees) {
      var midLat = ((Number(georaster.ymin) || 0) + (Number(georaster.ymax) || 0)) / 2;
      var mPerDegLat = 111320;
      var mPerDegLng = 111320 * Math.cos((midLat * Math.PI) / 180);
      gx = Math.abs(pw) * Math.abs(mPerDegLng);
      gy = Math.abs(ph) * mPerDegLat;
    } else {
      gx = Math.abs(pw);
      gy = Math.abs(ph);
    }
    // Ortomosaico de huerta típico: GSD cm–dm. Fuera de rango → coords falsas / sin escala.
    if (gx > 5 || gy > 5 || gx < 0.001 || gy < 0.001) return null;
    return Math.sqrt(gx * gy);
  }

  function percentileRank(value, sortedAsc) {
    var n = sortedAsc.length;
    if (!n) return 50;
    if (n === 1) return 50;
    var below = 0;
    var equal = 0;
    for (var i = 0; i < n; i++) {
      if (sortedAsc[i] < value) below++;
      else if (sortedAsc[i] === value) equal++;
    }
    return ((below + 0.5 * equal) / n) * 100;
  }

  /**
   * Ordena componentes por surco (filas) y posición en la línea.
   * Detecta la dirección dominante con vecinos cercanos y agrupa por proyección perpendicular.
   */
  function orderComponentsByRows(comps) {
    var pts = comps.map(function (c, i) {
      return {
        idx: i,
        comp: c,
        x: (c.box.minX + c.box.maxX) / 2,
        y: (c.box.minY + c.box.maxY) / 2
      };
    });
    if (!pts.length) return [];
    if (pts.length === 1) {
      return [{ comp: pts[0].comp, row: 1, pos: 1 }];
    }

    function dist2(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      return dx * dx + dy * dy;
    }

    var angles = [];
    var nnDists = [];
    for (var i = 0; i < pts.length; i++) {
      var best = Infinity;
      var bestJ = -1;
      for (var j = 0; j < pts.length; j++) {
        if (i === j) continue;
        var d = dist2(pts[i], pts[j]);
        if (d < best) {
          best = d;
          bestJ = j;
        }
      }
      if (bestJ < 0) continue;
      nnDists.push(Math.sqrt(best));
      var dx = pts[bestJ].x - pts[i].x;
      var dy = pts[bestJ].y - pts[i].y;
      var ang = Math.atan2(dy, dx);
      if (ang < 0) ang += Math.PI;
      if (ang >= Math.PI) ang -= Math.PI;
      angles.push(ang);
    }

    var sumSin = 0;
    var sumCos = 0;
    for (var a = 0; a < angles.length; a++) {
      sumSin += Math.sin(2 * angles[a]);
      sumCos += Math.cos(2 * angles[a]);
    }
    var rowAngle = angles.length ? 0.5 * Math.atan2(sumSin, sumCos) : 0;
    var ux = Math.cos(rowAngle);
    var uy = Math.sin(rowAngle);
    var vx = -uy;
    var vy = ux;

    var medNn = median(nnDists);
    if (!medNn || medNn < 1) medNn = 10;
    var rowGap = Math.max(medNn * 0.55, medNn * 0.4 + 2);

    pts.forEach(function (p) {
      p.along = p.x * ux + p.y * uy;
      p.across = p.x * vx + p.y * vy;
    });
    pts.sort(function (a, b) {
      return a.across - b.across;
    });

    var rows = [];
    var current = [pts[0]];
    for (var k = 1; k < pts.length; k++) {
      if (pts[k].across - pts[k - 1].across > rowGap) {
        rows.push(current);
        current = [pts[k]];
      } else {
        current.push(pts[k]);
      }
    }
    rows.push(current);

    var ordered = [];
    rows.forEach(function (row, rIdx) {
      row.sort(function (a, b) {
        return a.along - b.along;
      });
      row.forEach(function (p, pIdx) {
        ordered.push({
          comp: p.comp,
          row: rIdx + 1,
          pos: pIdx + 1
        });
      });
    });
    return ordered;
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    var s = max === 0 ? 0 : d / max;
    var v = max;
    if (d > 1e-6) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  /**
   * Clase fenológica 100%: flor | brote | veg | other
   * (other = sombra / no clasificado)
   */
  function classifyPixelPhenology(R, G, B) {
    var sum = R + G + B;
    if (sum < 42 || (R < 18 && G < 20 && B < 18)) return 'other';
    var hsv = rgbToHsv(R, G, B);
    var h = hsv.h;
    var sat = hsv.s;
    var val = hsv.v;

    // Floración: blanco/crema o rosa/pétalo
    if (val >= 58 && sat <= 20 && sum / 3 >= 145) return 'flor';
    if (
      val >= 48 &&
      sat >= 10 &&
      sat <= 58 &&
      (h >= 310 || h <= 28) &&
      R >= G - 8 &&
      R > B - 5
    ) {
      return 'flor';
    }

    // Brotación / flush: verde-amarillo brillante
    if (
      h >= 48 &&
      h <= 105 &&
      val >= 48 &&
      sat >= 22 &&
      G > R + 4 &&
      G >= B
    ) {
      if (val >= 56 || (G > R + 12 && h <= 95)) return 'brote';
    }

    // Vegetativo maduro: verde dominante
    if (G > R + 4 && G > B + 2 && h >= 70 && h <= 175 && sat >= 14 && val >= 22) {
      return 'veg';
    }
    if (G > R && G > B && sat >= 18 && val >= 28 && h >= 60 && h <= 180) {
      return 'veg';
    }

    return 'other';
  }

  /** Coloración atípica (métrica paralela, NO entra en el 100% fenológico). */
  function isAtypicalColorPixel(R, G, B) {
    var sum = R + G + B;
    if (sum < 50) return false;
    var hsv = rgbToHsv(R, G, B);
    if (hsv.v < 28) return false;
    // Amarillo / bronce / café (no flor blanca ni verde claro de brote)
    if (hsv.h >= 22 && hsv.h <= 58 && hsv.s >= 28 && G >= B - 5) {
      if (hsv.h <= 48 || hsv.s >= 40) return true;
    }
    if (hsv.h >= 12 && hsv.h <= 40 && hsv.s >= 30 && hsv.v < 62 && R > G - 5) {
      return true;
    }
    return false;
  }

  var PHENO_META = {
    flor: { key: 'flor', label: 'Floración', color: '#db2777', fill: '#ec489999' },
    brote: { key: 'brote', label: 'Brotación', color: '#65a30d', fill: '#84cc1699' },
    veg: { key: 'veg', label: 'Vegetativo', color: '#15803d', fill: '#16a34a99' },
    other: { key: 'other', label: 'Sin clasificar', color: '#64748b', fill: '#94a3b899' }
  };

  function phenoSemForDominant(key) {
    return PHENO_META[key] || PHENO_META.other;
  }

  function phenoSemForPct(pct, kind) {
    var p = Number(pct) || 0;
    var base = PHENO_META[kind] || PHENO_META.other;
    if (p < 5) {
      return { key: 'bajo', label: p.toFixed(0) + '%', color: '#94a3b8', fill: '#cbd5e199' };
    }
    if (p < 20) {
      return {
        key: 'medio',
        label: p.toFixed(0) + '%',
        color: base.color,
        fill: base.fill
      };
    }
    return {
      key: 'alto',
      label: p.toFixed(0) + '%',
      color: base.color,
      fill: base.fill
    };
  }

  /**
   * Muestrea RGB dentro de cada componente (vía labels) → % fenológicos.
   * Regla: flor + brote + veg + other = 100%. atypicalPct es paralelo.
   */
  function classifyTreesPhenology(georaster, labels, treesOrOrdered) {
    var bands = getBandArrays(georaster);
    var empty = {
      florPct: null,
      brotePct: null,
      vegPct: null,
      otherPct: null,
      atypicalPct: null,
      phenoDominant: null,
      phenoConfidence: null,
      meanRgb: null,
      semPheno: null
    };
    if (!bands || !labels) {
      return treesOrOrdered.map(function () {
        return Object.assign({}, empty);
      });
    }
    var w = georaster.width;
    var h = georaster.height;
    var maxR = bands.maxs[0];
    var maxG = bands.maxs[1] != null ? bands.maxs[1] : bands.maxs[0];
    var maxB = bands.maxs[2] != null ? bands.maxs[2] : bands.maxs[0];

    return treesOrOrdered.map(function (item) {
      var comp = item.comp || item;
      var box = comp.box;
      var label = comp.label;
      if (!box || label == null) return Object.assign({}, empty);

      var flor = 0;
      var brote = 0;
      var veg = 0;
      var other = 0;
      var atyp = 0;
      var sumR = 0;
      var sumG = 0;
      var sumB = 0;
      var n = 0;
      var boxW = box.maxX - box.minX + 1;
      var boxH = box.maxY - box.minY + 1;
      var targetSamples = 700;
      var stride = Math.max(1, Math.ceil(Math.sqrt((boxW * boxH) / targetSamples)));

      for (var yy = box.minY; yy <= box.maxY; yy += stride) {
        for (var xx = box.minX; xx <= box.maxX; xx += stride) {
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          var idx = yy * w + xx;
          if (labels[idx] !== label) continue;
          var R = bandScale(bands.r[idx], maxR);
          var G = bandScale(bands.g[idx], maxG);
          var B = bandScale(bands.b[idx], maxB);
          var cls = classifyPixelPhenology(R, G, B);
          if (cls === 'flor') flor++;
          else if (cls === 'brote') brote++;
          else if (cls === 'veg') veg++;
          else other++;
          if (isAtypicalColorPixel(R, G, B)) atyp++;
          sumR += R;
          sumG += G;
          sumB += B;
          n++;
        }
      }

      // Tras fusionar micro-copas el label original ya no coincide: muestrear verde en el bbox
      if (n < 8) {
        flor = brote = veg = other = atyp = 0;
        sumR = sumG = sumB = 0;
        n = 0;
        for (var y2 = box.minY; y2 <= box.maxY; y2 += stride) {
          for (var x2 = box.minX; x2 <= box.maxX; x2 += stride) {
            if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) continue;
            var R2 = bandScale(bands.r[y2 * w + x2], maxR);
            var G2 = bandScale(bands.g[y2 * w + x2], maxG);
            var B2 = bandScale(bands.b[y2 * w + x2], maxB);
            var s2 = R2 + G2 + B2;
            if (s2 < 40 || G2 < 22) continue;
            if (!(G2 + 4 >= R2 && G2 > B2 + 2)) continue;
            var cls2 = classifyPixelPhenology(R2, G2, B2);
            if (cls2 === 'flor') flor++;
            else if (cls2 === 'brote') brote++;
            else if (cls2 === 'veg') veg++;
            else other++;
            if (isAtypicalColorPixel(R2, G2, B2)) atyp++;
            sumR += R2;
            sumG += G2;
            sumB += B2;
            n++;
          }
        }
      }

      if (!n) return Object.assign({}, empty);

      var florPct = (flor / n) * 100;
      var brotePct = (brote / n) * 100;
      var vegPct = (veg / n) * 100;
      var otherPct = (other / n) * 100;
      // normalizar por redondeo para ≈100
      var tot = florPct + brotePct + vegPct + otherPct;
      if (tot > 0 && Math.abs(tot - 100) > 0.05) {
        var f = 100 / tot;
        florPct *= f;
        brotePct *= f;
        vegPct *= f;
        otherPct *= f;
      }

      var dominant = 'other';
      var best = otherPct;
      if (vegPct >= best) {
        best = vegPct;
        dominant = 'veg';
      }
      if (brotePct >= best) {
        best = brotePct;
        dominant = 'brote';
      }
      if (florPct >= best) {
        best = florPct;
        dominant = 'flor';
      }

      // Confianza: margen del dominante vs 2º
      var sorted = [florPct, brotePct, vegPct, otherPct].sort(function (a, b) {
        return b - a;
      });
      var margin = sorted[0] - (sorted[1] || 0);
      var phenoConfidence = Math.max(
        0,
        Math.min(100, Math.round(sorted[0] * 0.55 + margin * 1.2))
      );

      return {
        florPct: florPct,
        brotePct: brotePct,
        vegPct: vegPct,
        otherPct: otherPct,
        atypicalPct: (atyp / n) * 100,
        phenoDominant: dominant,
        phenoConfidence: phenoConfidence,
        meanRgb: {
          r: Math.round(sumR / n),
          g: Math.round(sumG / n),
          b: Math.round(sumB / n)
        },
        semPheno: phenoSemForDominant(dominant),
        sampledPx: n
      };
    });
  }

  function summarizePhenology(trees) {
    var keys = ['flor', 'brote', 'veg', 'other'];
    var sum = { flor: 0, brote: 0, veg: 0, other: 0, atyp: 0 };
    var domCount = { flor: 0, brote: 0, veg: 0, other: 0 };
    var n = 0;
    var confSum = 0;
    (trees || []).forEach(function (t) {
      if (t.florPct == null) return;
      n++;
      sum.flor += Number(t.florPct) || 0;
      sum.brote += Number(t.brotePct) || 0;
      sum.veg += Number(t.vegPct) || 0;
      sum.other += Number(t.otherPct) || 0;
      sum.atyp += Number(t.atypicalPct) || 0;
      if (t.phenoDominant && domCount[t.phenoDominant] != null) {
        domCount[t.phenoDominant]++;
      }
      if (t.phenoConfidence != null) confSum += Number(t.phenoConfidence) || 0;
    });
    if (!n) {
      return {
        hasPhenology: false,
        meanFlorPct: null,
        meanBrotePct: null,
        meanVegPct: null,
        meanOtherPct: null,
        meanAtypicalPct: null,
        dominantOrchard: null,
        dominantCounts: domCount,
        meanPhenoConfidence: null,
        treesWithPheno: 0
      };
    }
    var meanFlor = sum.flor / n;
    var meanBrote = sum.brote / n;
    var meanVeg = sum.veg / n;
    var meanOther = sum.other / n;
    var orchardDom = 'veg';
    var bestM = meanVeg;
    if (meanFlor >= bestM) {
      bestM = meanFlor;
      orchardDom = 'flor';
    }
    if (meanBrote >= bestM) {
      bestM = meanBrote;
      orchardDom = 'brote';
    }
    if (meanOther > bestM && meanOther > 40) orchardDom = 'other';
    return {
      hasPhenology: true,
      meanFlorPct: meanFlor,
      meanBrotePct: meanBrote,
      meanVegPct: meanVeg,
      meanOtherPct: meanOther,
      meanAtypicalPct: sum.atyp / n,
      dominantOrchard: orchardDom,
      dominantCounts: domCount,
      meanPhenoConfidence: confSum / n,
      treesWithPheno: n
    };
  }

  /**
   * Fusiona blobs cercanos (misma copa partida por sombra/textura).
   * Greedy: de mayor a menor área, absorbe vecinos cuyo centro está cerca.
   */
  function mergeNearbyComps(comps, gapPx) {
    if (!comps || comps.length < 2) return comps || [];
    var gap = Math.max(4, Number(gapPx) || 10);
    var gap2 = gap * gap;
    var items = comps
      .map(function (c) {
        var cx = (c.box.minX + c.box.maxX) / 2;
        var cy = (c.box.minY + c.box.maxY) / 2;
        return {
          areaPx: c.areaPx,
          box: {
            minX: c.box.minX,
            minY: c.box.minY,
            maxX: c.box.maxX,
            maxY: c.box.maxY
          },
          edge: (c.edge || []).slice(),
          meanExg: c.meanExg || 0,
          touchesBorder: !!c.touchesBorder,
          borderPx: c.borderPx || 0,
          cx: cx,
          cy: cy,
          alive: true
        };
      })
      .sort(function (a, b) {
        return b.areaPx - a.areaPx;
      });

    for (var i = 0; i < items.length; i++) {
      if (!items[i].alive) continue;
      var a = items[i];
      for (var j = i + 1; j < items.length; j++) {
        if (!items[j].alive) continue;
        var b = items[j];
        var dx = a.cx - b.cx;
        var dy = a.cy - b.cy;
        if (dx * dx + dy * dy > gap2) continue;
        // También fusionar si las cajas se tocan / se solapan con holgura
        var pad = Math.max(2, (gap / 2) | 0);
        var sepX =
          a.box.maxX + pad < b.box.minX || b.box.maxX + pad < a.box.minX;
        var sepY =
          a.box.maxY + pad < b.box.minY || b.box.maxY + pad < a.box.minY;
        if (sepX || sepY) {
          // centros cerca pero cajas no: aún fusionar (hueco interno)
          if (dx * dx + dy * dy > (gap * 0.65) * (gap * 0.65)) continue;
        }
        var sumA = a.areaPx + b.areaPx;
        a.meanExg =
          sumA > 0
            ? (a.meanExg * a.areaPx + b.meanExg * b.areaPx) / sumA
            : a.meanExg;
        a.areaPx = sumA;
        a.box.minX = Math.min(a.box.minX, b.box.minX);
        a.box.minY = Math.min(a.box.minY, b.box.minY);
        a.box.maxX = Math.max(a.box.maxX, b.box.maxX);
        a.box.maxY = Math.max(a.box.maxY, b.box.maxY);
        a.touchesBorder = a.touchesBorder || b.touchesBorder;
        a.borderPx += b.borderPx;
        if (a.edge.length < 120) {
          for (var e = 0; e < b.edge.length && a.edge.length < 120; e++) {
            a.edge.push(b.edge[e]);
          }
        }
        a.cx = (a.box.minX + a.box.maxX) / 2;
        a.cy = (a.box.minY + a.box.maxY) / 2;
        b.alive = false;
      }
    }

    var out = [];
    for (var k = 0; k < items.length; k++) {
      if (!items[k].alive) continue;
      var it = items[k];
      var boxW = it.box.maxX - it.box.minX + 1;
      var boxH = it.box.maxY - it.box.minY + 1;
      var fill = it.areaPx / Math.max(1, boxW * boxH);
      var aspect = Math.max(boxW, boxH) / Math.max(1, Math.min(boxW, boxH));
      out.push({
        label: k + 1,
        areaPx: it.areaPx,
        box: it.box,
        edge: it.edge,
        fillRatio: fill,
        aspect: aspect,
        circularity:
          (4 * it.areaPx) /
          (Math.PI * Math.max(boxW, boxH) * Math.max(boxW, boxH)),
        meanExg: it.meanExg,
        touchesBorder: it.touchesBorder,
        borderPx: it.borderPx
      });
    }
    return out;
  }

  function resolveMinAreaPx(baseMin, gsdM, totalPx) {
    var minArea = Math.max(180, Number(baseMin) || MIN_AREA_PX);
    if (gsdM != null && Number.isFinite(gsdM) && gsdM > 0) {
      var r = MIN_CANOPY_DIAM_M / 2;
      var minM2 = Math.PI * r * r;
      var fromGsd = Math.ceil(minM2 / (gsdM * gsdM));
      minArea = Math.max(minArea, fromGsd);
    }
    // En ortos grandes, evita polvo de píxeles
    if (totalPx > 2e6) minArea = Math.max(minArea, 320);
    else if (totalPx > 8e5) minArea = Math.max(minArea, 240);
    return minArea;
  }

  function analyzeCanopies(georaster, opts) {
    opts = opts || {};
    var profileOrCalib =
      opts.calibration && typeof opts.calibration === 'object'
        ? opts.calibration
        : opts.profile === 'ai'
          ? 'ai'
          : 'strict';
    var P = resolveExgParams(profileOrCalib);
    var veg = buildVegetationMask(georaster, profileOrCalib);
    var totalPx = veg.width * veg.height;
    var gsdM = estimateGsdM(georaster);
    var minAreaPx = resolveMinAreaPx(
      opts.minAreaPx != null ? opts.minAreaPx : P.minAreaPx,
      gsdM,
      totalPx
    );
    var minConf =
      opts.minConfidence != null ? opts.minConfidence : P.minConfidence;
    var maxAreaAbs = Math.max(minAreaPx * 20, Math.floor(totalPx * MAX_AREA_FRAC));

    var cc = connectedComponents(
      veg.mask,
      veg.width,
      veg.height,
      Math.max(40, Math.floor(minAreaPx * 0.35)),
      veg.exg
    );
    var rawComps = cc.comps || [];
    var labels = cc.labels;
    var excluded = {
      giant: 0,
      outlier: 0,
      shape: 0,
      lowConf: 0,
      tiny: 0,
      mergedAway: 0
    };

    // 1) quitar gigantes (pasto unido / casi toda la huerta)
    var comps = rawComps.filter(function (c) {
      if (c.areaPx > maxAreaAbs) {
        excluded.giant++;
        return false;
      }
      return true;
    });

    // 1b) fusionar micro-copas de la misma planta (1ª pasada)
    var preMergeN = comps.length;
    var medPre = median(
      comps.map(function (c) {
        return c.areaPx;
      })
    );
    var medRad = medPre > 0 ? Math.sqrt(medPre / Math.PI) : 10;
    var mergeGap = Math.max(10, Math.min(64, Math.round(medRad * MERGE_GAP_FRAC * 2)));
    if (gsdM != null && Number.isFinite(gsdM) && gsdM > 0) {
      // ~2 m de holgura: fragmentos de la misma copa (~5–8 m Ø) se unen; árboles vecinos no
      mergeGap = Math.max(mergeGap, Math.round(2.0 / gsdM));
    }
    comps = mergeNearbyComps(comps, mergeGap);
    excluded.mergedAway = Math.max(0, preMergeN - comps.length);

    // 1c) tamaño mínimo absoluto (después del merge)
    comps = comps.filter(function (c) {
      if (c.areaPx < minAreaPx) {
        excluded.tiny++;
        return false;
      }
      return true;
    });

    // 2) forma de árbol (redondo/compacto), no pasto/franja
    comps = comps.filter(function (c) {
      if (!looksLikeTree(c)) {
        excluded.shape++;
        return false;
      }
      return true;
    });

    // 2b) mediana de candidatos “árbol” → 2ª fusión + descartar fragmentos vs predio
    var areasSeed = comps.map(function (c) {
      return c.areaPx;
    });
    var medSeed = median(areasSeed);
    if (medSeed > 0 && comps.length > 2) {
      var rad2 = Math.sqrt(medSeed / Math.PI);
      var gap2 = Math.max(mergeGap, Math.round(rad2 * 1.15));
      if (gsdM != null && Number.isFinite(gsdM) && gsdM > 0) {
        gap2 = Math.max(gap2, Math.round(2.4 / gsdM));
      }
      var before2 = comps.length;
      comps = mergeNearbyComps(comps, gap2);
      excluded.mergedAway += Math.max(0, before2 - comps.length);

      comps = comps.filter(function (c) {
        if (!looksLikeTree(c)) {
          excluded.shape++;
          return false;
        }
        // Pedazo de copa: mucho más chico que el árbol típico del predio
        if (c.areaPx < medSeed * MIN_FRAC_OF_MEDIAN) {
          excluded.tiny++;
          return false;
        }
        return true;
      });
    }

    // 3) mediana y filtrar outliers / fragmentos vs mediana del predio
    var areasAll = comps.map(function (c) {
      return c.areaPx;
    });
    var med = median(areasAll);
    if (med > 0) {
      comps = comps.filter(function (c) {
        if (c.areaPx > med * MAX_AREA_VS_MEDIAN) {
          excluded.outlier++;
          return false;
        }
        if (c.areaPx < med * MIN_FRAC_OF_MEDIAN) {
          excluded.tiny++;
          return false;
        }
        return true;
      });
    }

    // 4) confianza: score de “es árbol” + excluir muy bajas
    comps.forEach(function (c) {
      c.confidence = scoreCanopy(c, med);
    });
    comps = comps.filter(function (c) {
      if ((c.confidence || 0) < minConf) {
        excluded.lowConf++;
        return false;
      }
      return true;
    });

    // 5) orden surco → línea
    var ordered = orderComponentsByRows(comps);
    var truncated = false;
    if (ordered.length > MAX_TREES) {
      ordered = ordered.slice(0, MAX_TREES);
      truncated = true;
    }

    var areas = ordered.map(function (o) {
      return o.comp.areaPx;
    });
    var stats = meanStd(areas);
    var areasSorted = areas.slice().sort(function (a, b) {
      return a - b;
    });
    var retainedPx = 0;
    var confSum = 0;
    for (var i = 0; i < areas.length; i++) retainedPx += areas[i];
    ordered.forEach(function (o) {
      confSum += o.comp.confidence || 0;
    });
    var meanConfidence = ordered.length ? confSum / ordered.length : null;

    var rowCount = 0;
    ordered.forEach(function (o) {
      if (o.row > rowCount) rowCount = o.row;
    });

    // 6) Fenología RGB por copa (flor + brote + veg + other = 100%)
    var phenoList = classifyTreesPhenology(georaster, labels, ordered);

    var trees = ordered.map(function (o, idx) {
      var c = o.comp;
      var z = (c.areaPx - stats.mean) / stats.std;
      var sem = semaforoClass(z);
      var latlngs = componentToLatLngs(georaster, c);
      var cx = (c.box.minX + c.box.maxX) / 2;
      var cy = (c.box.minY + c.box.maxY) / 2;
      var center = pixelToLatLng(georaster, cx, cy);
      var boxW = c.box.maxX - c.box.minX + 1;
      var boxH = c.box.maxY - c.box.minY + 1;
      var diamEqPx = 2 * Math.sqrt(c.areaPx / Math.PI);
      var areaM2 = gsdM != null ? c.areaPx * gsdM * gsdM : null;
      var diameterM = gsdM != null ? diamEqPx * gsdM : null;
      var diameterBoxM = gsdM != null ? Math.max(boxW, boxH) * gsdM : null;
      var ph = phenoList[idx] || {};
      return {
        id: idx + 1,
        row: o.row,
        pos: o.pos,
        areaPx: c.areaPx,
        areaM2: areaM2,
        diameterM: diameterM,
        diameterBoxM: diameterBoxM,
        diameterPx: diamEqPx,
        coverPct: totalPx ? (c.areaPx / totalPx) * 100 : null,
        percentile: percentileRank(c.areaPx, areasSorted),
        z: z,
        pctVsMean: stats.mean ? ((c.areaPx - stats.mean) / stats.mean) * 100 : 0,
        confidence: c.confidence != null ? c.confidence : null,
        fillRatio: c.fillRatio != null ? c.fillRatio : null,
        sem: sem,
        latlngs: latlngs,
        center: center,
        box: c.box,
        florPct: ph.florPct,
        brotePct: ph.brotePct,
        vegPct: ph.vegPct,
        otherPct: ph.otherPct,
        atypicalPct: ph.atypicalPct,
        phenoDominant: ph.phenoDominant,
        phenoConfidence: ph.phenoConfidence,
        meanRgb: ph.meanRgb,
        semPheno: ph.semPheno
      };
    });

    var phenoSummary = summarizePhenology(trees);

    var meanAreaM2 = gsdM != null && stats.mean ? stats.mean * gsdM * gsdM : null;
    var minArea = areas.length ? Math.min.apply(null, areas) : 0;
    var maxArea = areas.length ? Math.max.apply(null, areas) : 0;
    var coverPct = totalPx ? (retainedPx / totalPx) * 100 : 0;
    var barePct = Math.max(0, 100 - coverPct);
    var cvPct = stats.mean > 0 ? (stats.std / stats.mean) * 100 : 0;
    var maxVsMeanPct = stats.mean > 0 ? ((maxArea - stats.mean) / stats.mean) * 100 : 0;
    var minVsMeanPct = stats.mean > 0 ? ((minArea - stats.mean) / stats.mean) * 100 : 0;
    var maxMinRatio = minArea > 0 ? maxArea / minArea : null;
    var minAreaM2 = gsdM != null ? minArea * gsdM * gsdM : null;
    var maxAreaM2 = gsdM != null ? maxArea * gsdM * gsdM : null;

    var hasScale = gsdM != null && Number.isFinite(gsdM) && gsdM > 0;
    var gsdCm = hasScale ? gsdM * 100 : null;
    var orthoAreaM2 = hasScale && totalPx ? totalPx * gsdM * gsdM : null;
    var orthoAreaHa = orthoAreaM2 != null ? orthoAreaM2 / 10000 : null;
    var canopyAreaM2 = hasScale ? retainedPx * gsdM * gsdM : null;
    var bareAreaM2 =
      orthoAreaM2 != null && canopyAreaM2 != null ? Math.max(0, orthoAreaM2 - canopyAreaM2) : null;
    var treesPerHa =
      orthoAreaHa != null && orthoAreaHa > 0 && trees.length
        ? trees.length / orthoAreaHa
        : null;
    var excludedTotal =
      excluded.giant +
      excluded.outlier +
      excluded.shape +
      excluded.lowConf +
      excluded.tiny;

    return {
      trees: trees,
      stats: {
        count: trees.length,
        meanArea: stats.mean,
        meanAreaM2: meanAreaM2,
        stdArea: stats.std,
        medianArea: med,
        minArea: minArea,
        maxArea: maxArea,
        minAreaM2: minAreaM2,
        maxAreaM2: maxAreaM2,
        cvPct: cvPct,
        maxVsMeanPct: maxVsMeanPct,
        minVsMeanPct: minVsMeanPct,
        maxMinRatio: maxMinRatio,
        vegPixels: retainedPx,
        totalPixels: totalPx,
        coverPct: coverPct,
        barePct: barePct,
        hasScale: hasScale,
        gsdM: gsdM,
        gsdCm: gsdCm,
        orthoAreaM2: orthoAreaM2,
        orthoAreaHa: orthoAreaHa,
        canopyAreaM2: canopyAreaM2,
        bareAreaM2: bareAreaM2,
        treesPerHa: treesPerHa,
        threshold: veg.threshold,
        width: veg.width,
        height: veg.height,
        maxAreaAbs: maxAreaAbs,
        truncated: truncated,
        maxTrees: MAX_TREES,
        rowCount: rowCount,
        meanConfidence: meanConfidence,
        excludedTotal: excludedTotal,
        excludedGiant: excluded.giant,
        excludedOutlier: excluded.outlier,
        excludedShape: excluded.shape,
        excludedLowConf: excluded.lowConf,
        excludedTiny: excluded.tiny,
        mergedFragments: excluded.mergedAway,
        minAreaPxUsed: minAreaPx,
        candidatesRaw: rawComps.length,
        detectionProfile: veg.profile || P.mode,
        calibration: P.mode === 'calib' ? opts.calibration : null,
        cropHint: P.cropHint || '',
        hasPhenology: phenoSummary.hasPhenology,
        meanFlorPct: phenoSummary.meanFlorPct,
        meanBrotePct: phenoSummary.meanBrotePct,
        meanVegPct: phenoSummary.meanVegPct,
        meanOtherPct: phenoSummary.meanOtherPct,
        meanAtypicalPct: phenoSummary.meanAtypicalPct,
        dominantOrchard: phenoSummary.dominantOrchard,
        dominantCounts: phenoSummary.dominantCounts,
        meanPhenoConfidence: phenoSummary.meanPhenoConfidence
      }
    };
  }

  /** Polígono circular en lat/lng desde centro y radio en píxeles. */
  function circleToLatLngs(georaster, cx, cy, radiusPx, sides) {
    sides = sides || 28;
    var r = Math.max(2, Number(radiusPx) || 2);
    var out = [];
    for (var i = 0; i < sides; i++) {
      var a = (i / sides) * Math.PI * 2;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      out.push(pixelToLatLng(georaster, x, y));
    }
    return out;
  }

  global.AirCICanopy = {
    analyzeCanopies: analyzeCanopies,
    semaforoClass: semaforoClass,
    matchTreesAcrossFlights: matchTreesAcrossFlights,
    deltaSemClass: deltaSemClass,
    haversineM: haversineM,
    classifyPixelPhenology: classifyPixelPhenology,
    summarizePhenology: summarizePhenology,
    phenoSemForDominant: phenoSemForDominant,
    phenoSemForPct: phenoSemForPct,
    PHENO_META: PHENO_META,
    orderComponentsByRows: orderComponentsByRows,
    scoreCanopy: scoreCanopy,
    circleToLatLngs: circleToLatLngs,
    pixelToLatLng: pixelToLatLng,
    getBandArrays: getBandArrays,
    bandScale: bandScale,
    resolveExgParams: resolveExgParams
  };
})(typeof window !== 'undefined' ? window : globalThis);
