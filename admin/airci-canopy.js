/**
 * AirCI — detección de copas (ExG + componentes) y semáforo por área.
 * F2: máscara más estricta, exclusiones forma/borde, confianza por copa.
 */
(function (global) {
  'use strict';

  var MIN_AREA_PX = 90;
  var MAX_TREES = 15000;
  /** Descarta “blobs” que son casi toda la vegetación (pasto unido / bordes) */
  var MAX_AREA_FRAC = 0.01; // 1.0% del área de la imagen
  var MAX_AREA_VS_MEDIAN = 6.5; // > 6.5× mediana = outlier
  var MIN_FILL_RATIO = 0.14; // área / bbox: muy hueco = pasto/borde
  var MAX_ASPECT = 4.2; // muy alargado = franja de pasto
  var MIN_CONFIDENCE = 38; // debajo: se excluye del lote
  var BORDER_CLEAR_PX = 2; // anillo del orto sin vegetación (artefactos)

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
        allowYellow: c.allow_yellow_green !== false,
        yellowBoost: c.yellow_boost !== false,
        minAreaPx: Number(c.min_area_px) || 60,
        minConfidence: Number(c.min_confidence) || 30,
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
        darkSum: 36,
        minG: 22,
        pct: 55,
        thrMin: 55,
        thrMax: 160,
        erosionPasses: 1,
        allowYellow: true,
        yellowBoost: true,
        minAreaPx: 55,
        minConfidence: 28,
        cropHint: ''
      };
    }
    return {
      mode: 'strict',
      gMargin: 0.055,
      bMargin: 0.04,
      gAbs: 6,
      bAbs: 4,
      darkSum: 48,
      minG: 28,
      pct: 68,
      thrMin: 78,
      thrMax: 175,
      erosionPasses: 2,
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
      if (s < P.darkSum || (R < 18 && G < 20 && B < 18) || G < P.minG) {
        v = 0;
      } else {
        var r = R / s;
        var g = G / s;
        var b = B / s;
        var greenOk = P.allowYellow
          ? g + 0.02 >= r && g > b + P.bMargin && G + 4 >= R && G > B + P.bAbs
          : g > r + P.gMargin &&
            g > b + P.bMargin &&
            G > R + P.gAbs &&
            G > B + P.bAbs;
        if (greenOk) {
          var raw = 2 * g - r - b;
          if (P.yellowBoost && R > G && R - G < 28 && G > B + 4) {
            raw = Math.max(raw, 0.15);
          }
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

    var mask = new Uint8Array(n);
    for (var q = 0; q < n; q++) {
      if (exg[q] >= thr) mask[q] = 1;
    }

    var eroded = new Uint8Array(n);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i0 = y * w + x;
        if (
          mask[i0] &&
          mask[i0 - 1] &&
          mask[i0 + 1] &&
          mask[i0 - w] &&
          mask[i0 + w]
        ) {
          eroded[i0] = 1;
        }
      }
    }
    var source = eroded;
    if (P.erosionPasses >= 2) {
      var eroded2 = new Uint8Array(n);
      for (var y2 = 1; y2 < h - 1; y2++) {
        for (var x2 = 1; x2 < w - 1; x2++) {
          var i2 = y2 * w + x2;
          if (
            eroded[i2] &&
            eroded[i2 - 1] &&
            eroded[i2 + 1] &&
            eroded[i2 - w] &&
            eroded[i2 + w]
          ) {
            eroded2[i2] = 1;
          }
        }
      }
      source = eroded2;
    }
    var dil = new Uint8Array(n);
    var count = 0;
    for (var yy = 1; yy < h - 1; yy++) {
      for (var xx = 1; xx < w - 1; xx++) {
        var ii = yy * w + xx;
        if (
          source[ii] ||
          source[ii - 1] ||
          source[ii + 1] ||
          source[ii - w] ||
          source[ii + w]
        ) {
          dil[ii] = 1;
          count++;
        }
      }
    }

    var clear = Math.max(1, Math.min(BORDER_CLEAR_PX, ((Math.min(w, h) / 2) | 0) - 1));
    for (var by = 0; by < h; by++) {
      for (var bx = 0; bx < w; bx++) {
        if (bx < clear || by < clear || bx >= w - clear || by >= h - clear) {
          var bi = by * w + bx;
          if (dil[bi]) {
            dil[bi] = 0;
            count--;
          }
        }
      }
    }

    return {
      mask: dil,
      exg: exg,
      threshold: thr,
      vegPixels: Math.max(0, count),
      width: w,
      height: h,
      profile: P.mode,
      params: P
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
      comps.push({
        label: id,
        areaPx: area,
        box: box,
        edge: points[id] || [],
        fillRatio: fill,
        aspect: aspect,
        meanExg: meanExg,
        touchesBorder: touchesBorder,
        borderPx: borderPx[id] || 0
      });
    });

    return { comps: comps, labels: labels };
  }

  /** Confianza 0–100: forma compacta, ExG, tamaño vs mediana, borde. */
  function scoreCanopy(comp, medianArea) {
    var fill = Number(comp.fillRatio) || 0;
    var aspect = Number(comp.aspect) || 1;
    var area = Number(comp.areaPx) || 0;
    var meanExg = Number(comp.meanExg) || 0;

    var compact = Math.max(0, Math.min(1, (fill - 0.1) / 0.55));
    var aspectScore = Math.max(0, Math.min(1, 1 - (aspect - 1) / 3.5));
    var exgScore = Math.max(0, Math.min(1, meanExg / 180));
    var sizeScore = 0.55;
    if (medianArea > 0 && area > 0) {
      var ratio = area / medianArea;
      if (ratio >= 0.35 && ratio <= 2.8) sizeScore = 1;
      else if (ratio >= 0.2 && ratio <= 4) sizeScore = 0.65;
      else sizeScore = 0.25;
    }
    var borderScore = comp.touchesBorder ? 0.55 : 1;
    var conf =
      100 *
      (0.32 * compact +
        0.22 * aspectScore +
        0.2 * exgScore +
        0.18 * sizeScore +
        0.08 * borderScore);
    return Math.max(0, Math.min(100, Math.round(conf)));
  }

  function isGrassLikeShape(comp) {
    var fill = Number(comp.fillRatio) || 0;
    var aspect = Number(comp.aspect) || 1;
    if (fill < MIN_FILL_RATIO) return true;
    if (aspect >= MAX_ASPECT && fill < 0.35) return true;
    if (comp.touchesBorder && fill < 0.22 && aspect > 2.5) return true;
    return false;
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

  /**
   * Semáforo vs área objetivo (m²). Misma paleta que el relativo.
   * pct = (área − objetivo) / objetivo × 100
   */
  function semaforoVsTarget(areaM2, targetM2) {
    var a = Number(areaM2);
    var t = Number(targetM2);
    if (!Number.isFinite(a) || !Number.isFinite(t) || t <= 0) {
      return null;
    }
    var pct = ((a - t) / t) * 100;
    if (pct < -45) {
      return {
        key: 'rojo',
        label: 'Muy bajo',
        color: '#dc2626',
        fill: '#dc262699',
        pctVsTarget: pct
      };
    }
    if (pct < -15) {
      return {
        key: 'amarillo',
        label: 'Por debajo',
        color: '#ca8a04',
        fill: '#eab30899',
        pctVsTarget: pct
      };
    }
    if (pct <= 15) {
      return {
        key: 'verde',
        label: 'En objetivo',
        color: '#16a34a',
        fill: '#22c55e99',
        pctVsTarget: pct
      };
    }
    return {
      key: 'azul',
      label: 'Por encima',
      color: '#2563eb',
      fill: '#3b82f699',
      pctVsTarget: pct
    };
  }

  /** Aplica semAbs / pctVsTarget a cada árbol (mutates). */
  function applyTargetSem(trees, targetM2) {
    var t = Number(targetM2);
    var ok = Number.isFinite(t) && t > 0;
    (trees || []).forEach(function (tree) {
      if (!ok || tree.areaM2 == null || !Number.isFinite(Number(tree.areaM2))) {
        tree.semAbs = null;
        tree.pctVsTarget = null;
        return;
      }
      var sem = semaforoVsTarget(tree.areaM2, t);
      tree.semAbs = sem;
      tree.pctVsTarget = sem ? sem.pctVsTarget : null;
    });
    return trees;
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

  function analyzeCanopies(georaster, opts) {
    opts = opts || {};
    var profileOrCalib =
      opts.calibration && typeof opts.calibration === 'object'
        ? opts.calibration
        : opts.profile === 'ai'
          ? 'ai'
          : 'strict';
    var P = resolveExgParams(profileOrCalib);
    var minArea = opts.minAreaPx != null ? opts.minAreaPx : P.minAreaPx;
    var minConf =
      opts.minConfidence != null ? opts.minConfidence : P.minConfidence;
    var veg = buildVegetationMask(georaster, profileOrCalib);
    var totalPx = veg.width * veg.height;
    var maxAreaAbs = Math.max(minArea * 20, Math.floor(totalPx * MAX_AREA_FRAC));
    var gsdM = estimateGsdM(georaster);

    var cc = connectedComponents(
      veg.mask,
      veg.width,
      veg.height,
      minArea,
      veg.exg
    );
    var rawComps = cc.comps || [];
    var labels = cc.labels;
    var excluded = {
      giant: 0,
      outlier: 0,
      shape: 0,
      lowConf: 0
    };

    // 1) quitar gigantes (pasto unido / casi toda la huerta)
    var comps = rawComps.filter(function (c) {
      if (c.areaPx > maxAreaAbs) {
        excluded.giant++;
        return false;
      }
      return true;
    });

    // 2) forma tipo pasto / franja / borde hueco
    comps = comps.filter(function (c) {
      if (isGrassLikeShape(c)) {
        excluded.shape++;
        return false;
      }
      return true;
    });

    // 3) mediana y filtrar outliers enormes vs mediana
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
        return true;
      });
    }

    // 4) confianza: score + excluir muy bajas
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
      excluded.giant + excluded.outlier + excluded.shape + excluded.lowConf;

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
    semaforoVsTarget: semaforoVsTarget,
    applyTargetSem: applyTargetSem,
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
