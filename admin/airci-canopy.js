/**
 * AirCI — detección simple de copas (ExG + componentes) y semáforo por área.
 * MVP F2: no fenología (flor/brote/vegetativo) todavía.
 */
(function (global) {
  'use strict';

  var MIN_AREA_PX = 80;
  var MAX_TREES = 15000;
  /** Descarta “blobs” que son casi toda la vegetación (pasto unido / bordes) */
  var MAX_AREA_FRAC = 0.012; // 1.2% del área de la imagen
  var MAX_AREA_VS_MEDIAN = 8; // > 8× mediana = outlier a excluir de stats/capas

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

  /** ExG estricto: ignora negro/sombra, exige verde dominante (copa vs pasto claro) */
  function buildVegetationMask(georaster) {
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
      // Negro / nodata / sombra muy oscura
      if (s < 40 || (R < 18 && G < 22 && B < 18)) {
        v = 0;
      } else {
        var r = R / s;
        var g = G / s;
        var b = B / s;
        // Verde debe ganar con margen (reduce pasto seco / suelo)
        if (g > r + 0.04 && g > b + 0.03 && G > R && G > B) {
          var raw = 2 * g - r - b;
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

    // Umbral alto: percentil ~62 de los píxeles ya “verdes candidatos”
    var thr = valid > 100 ? percentileFromHist(hist, valid, 62) : 90;
    thr = Math.max(70, Math.min(thr, 170));

    var mask = new Uint8Array(n);
    for (var q = 0; q < n; q++) {
      if (exg[q] >= thr) mask[q] = 1;
    }

    // Erosión 4-vecinos: rompe puentes de pasto entre árboles
    var eroded = new Uint8Array(n);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = y * w + x;
        if (
          mask[i] &&
          mask[i - 1] &&
          mask[i + 1] &&
          mask[i - w] &&
          mask[i + w]
        ) {
          eroded[i] = 1;
        }
      }
    }
    // Dilatación ligera (recuperar copa)
    var dil = new Uint8Array(n);
    var count = 0;
    for (var yy = 1; yy < h - 1; yy++) {
      for (var xx = 1; xx < w - 1; xx++) {
        var ii = yy * w + xx;
        if (
          eroded[ii] ||
          eroded[ii - 1] ||
          eroded[ii + 1] ||
          eroded[ii - w] ||
          eroded[ii + w]
        ) {
          dil[ii] = 1;
          count++;
        }
      }
    }

    return { mask: dil, threshold: thr, vegPixels: count, width: w, height: h };
  }

  function connectedComponents(mask, width, height, minArea) {
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

    for (var p = 0; p < n; p++) {
      var lab = labels[p];
      if (!lab) continue;
      var root = find(lab);
      if (!remap[root]) remap[root] = root;
      labels[p] = root;
      areas[root] = (areas[root] || 0) + 1;
      var xx = p % width;
      var yy = (p / width) | 0;
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
      comps.push({
        label: id,
        areaPx: area,
        box: boxes[id],
        edge: points[id] || []
      });
    });

    return comps;
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

  function analyzeCanopies(georaster, opts) {
    opts = opts || {};
    var minArea = opts.minAreaPx != null ? opts.minAreaPx : MIN_AREA_PX;
    var veg = buildVegetationMask(georaster);
    var totalPx = veg.width * veg.height;
    var maxAreaAbs = Math.max(minArea * 20, Math.floor(totalPx * MAX_AREA_FRAC));
    var gsdM = estimateGsdM(georaster);

    var comps = connectedComponents(veg.mask, veg.width, veg.height, minArea);
    // 1) quitar gigantes (pasto unido / casi toda la huerta)
    comps = comps.filter(function (c) {
      return c.areaPx <= maxAreaAbs;
    });

    // 2) mediana y filtrar outliers enormes vs mediana
    var areasAll = comps.map(function (c) {
      return c.areaPx;
    });
    var med = median(areasAll);
    if (med > 0) {
      comps = comps.filter(function (c) {
        return c.areaPx <= med * MAX_AREA_VS_MEDIAN;
      });
    }

    // 3) orden surco → línea (ya no por área)
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
    // cobertura solo con píxeles de copas retenidas
    var retainedPx = 0;
    for (var i = 0; i < areas.length; i++) retainedPx += areas[i];

    var rowCount = 0;
    ordered.forEach(function (o) {
      if (o.row > rowCount) rowCount = o.row;
    });

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
      return {
        id: idx + 1,
        row: o.row,
        pos: o.pos,
        areaPx: c.areaPx,
        areaM2: areaM2,
        diameterM: diameterM,
        diameterBoxM: diameterBoxM,
        diameterPx: diamEqPx,
        percentile: percentileRank(c.areaPx, areasSorted),
        z: z,
        pctVsMean: stats.mean ? ((c.areaPx - stats.mean) / stats.mean) * 100 : 0,
        sem: sem,
        latlngs: latlngs,
        center: center,
        box: c.box
      };
    });

    var meanAreaM2 = gsdM != null && stats.mean ? stats.mean * gsdM * gsdM : null;

    return {
      trees: trees,
      stats: {
        count: trees.length,
        meanArea: stats.mean,
        meanAreaM2: meanAreaM2,
        stdArea: stats.std,
        medianArea: med,
        vegPixels: retainedPx,
        coverPct: totalPx ? (retainedPx / totalPx) * 100 : 0,
        threshold: veg.threshold,
        width: veg.width,
        height: veg.height,
        maxAreaAbs: maxAreaAbs,
        gsdM: gsdM,
        truncated: truncated,
        maxTrees: MAX_TREES,
        rowCount: rowCount
      }
    };
  }

  global.AirCICanopy = {
    analyzeCanopies: analyzeCanopies,
    semaforoClass: semaforoClass,
    orderComponentsByRows: orderComponentsByRows
  };
})(typeof window !== 'undefined' ? window : globalThis);
