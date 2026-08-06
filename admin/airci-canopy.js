/**
 * AirCI — detección simple de copas (ExG + componentes) y semáforo por área.
 * MVP F2: no fenología (flor/brote/vegetativo) todavía.
 */
(function (global) {
  'use strict';

  var MIN_AREA_PX = 40;
  var MAX_TREES = 800;

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

  function otsuThreshold(hist, total) {
    var sum = 0;
    for (var i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0;
    var wB = 0;
    var maxVar = -1;
    var threshold = 20;
    for (var t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      var wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      var mB = sumB / wB;
      var mF = (sum - sumB) / wF;
      var between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maxVar) {
        maxVar = between;
        threshold = t;
      }
    }
    return threshold;
  }

  /** ExG normalizado 0–255 + máscara binaria */
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
      var v;
      if (s < 15) {
        v = 0;
      } else {
        // ExG normalizado: 2g - r - b  (r,g,b fracciones)
        var r = R / s;
        var g = G / s;
        var b = B / s;
        var raw = 2 * g - r - b;
        v = Math.max(0, Math.min(255, Math.round((raw + 1) * 127.5)));
      }
      exg[p] = v;
      if (s >= 15) {
        hist[v]++;
        valid++;
      }
    }

    var thr = otsuThreshold(hist, Math.max(1, valid));
    thr = Math.max(28, Math.min(thr, 140));

    var mask = new Uint8Array(n);
    var count = 0;
    for (var q = 0; q < n; q++) {
      if (exg[q] >= thr) {
        mask[q] = 1;
        count++;
      }
    }
    return { mask: mask, threshold: thr, vegPixels: count, width: w, height: h };
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

    comps.sort(function (a, b) {
      return b.areaPx - a.areaPx;
    });
    if (comps.length > MAX_TREES) comps = comps.slice(0, MAX_TREES);
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

  function analyzeCanopies(georaster, opts) {
    opts = opts || {};
    var minArea = opts.minAreaPx != null ? opts.minAreaPx : MIN_AREA_PX;
    var veg = buildVegetationMask(georaster);
    var comps = connectedComponents(veg.mask, veg.width, veg.height, minArea);
    var areas = comps.map(function (c) {
      return c.areaPx;
    });
    var stats = meanStd(areas);
    var totalPx = veg.width * veg.height;
    var trees = comps.map(function (c, idx) {
      var z = (c.areaPx - stats.mean) / stats.std;
      var sem = semaforoClass(z);
      var latlngs = componentToLatLngs(georaster, c);
      var cx = (c.box.minX + c.box.maxX) / 2;
      var cy = (c.box.minY + c.box.maxY) / 2;
      var center = pixelToLatLng(georaster, cx, cy);
      return {
        id: idx + 1,
        areaPx: c.areaPx,
        z: z,
        pctVsMean: stats.mean ? ((c.areaPx - stats.mean) / stats.mean) * 100 : 0,
        sem: sem,
        latlngs: latlngs,
        center: center,
        box: c.box
      };
    });

    return {
      trees: trees,
      stats: {
        count: trees.length,
        meanArea: stats.mean,
        stdArea: stats.std,
        vegPixels: veg.vegPixels,
        coverPct: totalPx ? (veg.vegPixels / totalPx) * 100 : 0,
        threshold: veg.threshold,
        width: veg.width,
        height: veg.height
      }
    };
  }

  global.AirCICanopy = {
    analyzeCanopies: analyzeCanopies,
    semaforoClass: semaforoClass
  };
})(typeof window !== 'undefined' ? window : globalThis);
