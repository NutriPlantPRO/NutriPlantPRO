/**
 * AirCI — detección de copas: centros (picos ExG) → vegetación local
 * limitada por spacing → elipse. Semáforo / Color Score / fenología encima.
 */
(function (global) {
  'use strict';

  var MIN_AREA_PX = 900;
  var MAX_TREES = 15000;
  /** Descarta “blobs” que son casi toda la vegetación (pasto unido / bordes) */
  var MAX_AREA_FRAC = 0.02;
  var MAX_AREA_VS_MEDIAN = 5.5;
  var MIN_FILL_RATIO = 0.28;
  var MAX_ASPECT = 2.0;
  var MIN_CIRCULARITY = 0.32;
  var MIN_CONFIDENCE = 52;
  var BORDER_CLEAR_PX = 2;
  /** Diámetro mínimo típico de copa frutal en huerta adulta */
  var MIN_CANOPY_DIAM_M = 3.5;
  var MIN_FRAC_OF_MEDIAN = 0.4;
  var MERGE_GAP_FRAC = 1.1;
  /** Suavizado fuerte: une textura de UNA copa (evita micro-triángulos) */
  var EXG_BLUR_M = 2.0;
  /** Fracción del spacing → radio de búsqueda local (no une vecinos) */
  var SEARCH_RADIUS_FRAC = 0.42;
  /** NMS: distancia mínima entre centros ≈ esta fracción del spacing */
  var NMS_FRAC = 0.55;
  /** Spacing típico huerta frutal adulta (m) si no hay calib */
  var DEFAULT_SPACING_M = 6.5;

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
      // Pisos duros: la IA no puede “abrir” el detector hasta marcar pasto/sombra
      return {
        mode: 'calib',
        gMargin: Math.max(0.028, Number(c.g_margin) || 0.04),
        bMargin: Math.max(0.022, Number(c.b_margin) || 0.035),
        gAbs: Math.max(3, Number(c.g_abs) || 5),
        bAbs: Math.max(2, Number(c.b_abs) || 4),
        darkSum: Math.max(55, Number(c.dark_sum) || 60),
        minG: Math.max(26, Number(c.min_g) || 28),
        pct: Math.max(55, Math.min(78, Number(c.exg_percentile) || 62)),
        thrMin: Math.max(58, Number(c.thr_min) || 70),
        thrMax: Number(c.thr_max) || 165,
        erosionPasses: Number(c.erosion_passes) === 2 ? 2 : 1,
        closePasses: Math.max(3, Math.min(6, Number(c.close_passes) >= 1 ? Number(c.close_passes) | 0 : 4)),
        blurM: Math.max(1.6, Number(c.blur_m) > 0 ? Number(c.blur_m) : EXG_BLUR_M),
        allowYellow: c.allow_yellow_green === true,
        yellowBoost: c.yellow_boost === true,
        minAreaPx: Math.max(MIN_AREA_PX, Number(c.min_area_px) || MIN_AREA_PX),
        minConfidence: Math.max(MIN_CONFIDENCE, Number(c.min_confidence) || MIN_CONFIDENCE),
        typicalSpacingM:
          Number(c.typical_spacing_m) > 0
            ? Math.max(3.5, Math.min(14, Number(c.typical_spacing_m)))
            : null,
        targetTreesPerHa: null,
        plantContext: extractPlantContext(c),
        cropHint: c.crop_hint || ''
      };
    }
    if (mode === 'ai') {
      return {
        mode: 'ai',
        gMargin: 0.04,
        bMargin: 0.032,
        gAbs: 5,
        bAbs: 3,
        darkSum: 58,
        minG: 26,
        pct: 58,
        thrMin: 62,
        thrMax: 160,
        erosionPasses: 1,
        closePasses: 4,
        blurM: EXG_BLUR_M,
        allowYellow: false,
        yellowBoost: false,
        minAreaPx: MIN_AREA_PX,
        minConfidence: MIN_CONFIDENCE,
        typicalSpacingM: null,
        targetTreesPerHa: null,
        plantContext: defaultPlantContext(),
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
      typicalSpacingM: null,
      targetTreesPerHa: null,
      plantContext: defaultPlantContext(),
      cropHint: ''
    };
  }

  /** Criterios tipo “ojo humano” en RGB: tamaño, contraste, sombra, forma — no solo color. */
  function defaultPlantContext() {
    return {
      crownVsAlley: 'darker', // darker | similar | brighter
      bloomOrYellow: false,
      alleyType: 'grass', // grass | bare_soil | mixed
      typicalCanopyDiamM: null,
      canopyShape: 'round', // round | oval | irregular
      shadowsUseful: true,
      minEvidence: 52,
      notes: ''
    };
  }

  function extractPlantContext(c) {
    var base = defaultPlantContext();
    if (!c || typeof c !== 'object') return base;
    var pc =
      c.plant_context && typeof c.plant_context === 'object' ? c.plant_context : c;
    var crown = String(pc.crown_vs_alley || pc.crownVsAlley || base.crownVsAlley).toLowerCase();
    if (crown.indexOf('bright') >= 0) crown = 'brighter';
    else if (crown.indexOf('similar') >= 0 || crown.indexOf('igual') >= 0) crown = 'similar';
    else crown = 'darker';
    var alley = String(pc.alley_type || pc.alleyType || base.alleyType).toLowerCase();
    if (alley.indexOf('soil') >= 0 || alley.indexOf('suelo') >= 0) alley = 'bare_soil';
    else if (alley.indexOf('mix') >= 0) alley = 'mixed';
    else alley = 'grass';
    var shape = String(pc.canopy_shape || pc.canopyShape || base.canopyShape).toLowerCase();
    if (shape.indexOf('oval') >= 0 || shape.indexOf('elip') >= 0) shape = 'oval';
    else if (shape.indexOf('irreg') >= 0) shape = 'irregular';
    else shape = 'round';
    var diam = Number(pc.typical_canopy_diam_m || pc.typicalCanopyDiamM);
    return {
      crownVsAlley: crown,
      bloomOrYellow:
        pc.bloom_or_yellow_crown === true ||
        pc.bloomOrYellow === true ||
        c.allow_yellow_green === true,
      alleyType: alley,
      typicalCanopyDiamM:
        Number.isFinite(diam) && diam > 1.5 && diam < 16 ? diam : null,
      canopyShape: shape,
      shadowsUseful: pc.shadows_useful !== false && pc.shadowsUseful !== false,
      minEvidence: Math.max(
        40,
        Math.min(75, Number(pc.min_evidence || pc.minEvidence) || base.minEvidence)
      ),
      notes: String(pc.looks_like_notes || pc.notes || c.notes || '').slice(0, 200)
    };
  }

  /**
   * Contexto operativo del predio: densidad + IA + GSD → qué “cuenta” como planta.
   * Como el ojo humano: tamaño esperado, contraste vs calle, sombra, forma.
   */
  function resolvePlantScene(opts, P, gsdM) {
    opts = opts || {};
    var pc = Object.assign({}, P.plantContext || defaultPlantContext());
    if (opts.plantContext && typeof opts.plantContext === 'object') {
      pc = Object.assign(pc, extractPlantContext(opts.plantContext));
    }
    var dens =
      opts.targetTreesPerHa != null && Number(opts.targetTreesPerHa) > 0
        ? Number(opts.targetTreesPerHa)
        : null;
    var spacingM =
      spacingMFromDensityHa(dens) ||
      (opts.typicalSpacingM != null && Number(opts.typicalSpacingM) > 0
        ? Number(opts.typicalSpacingM)
        : null) ||
      P.typicalSpacingM ||
      DEFAULT_SPACING_M;
    spacingM = Math.max(3.2, Math.min(14, spacingM));

    var diamM =
      pc.typicalCanopyDiamM != null
        ? pc.typicalCanopyDiamM
        : Math.max(2.8, Math.min(9, spacingM * 0.72));
    // Rango de diámetro de copa creíble para ESTE predio
    var diamMinM = diamM * (pc.canopyShape === 'irregular' ? 0.35 : 0.42);
    var diamMaxM = diamM * (pc.canopyShape === 'oval' ? 1.45 : 1.3);

    return {
      dens: dens,
      spacingM: spacingM,
      diamM: diamM,
      diamMinM: diamMinM,
      diamMaxM: diamMaxM,
      crownVsAlley: pc.crownVsAlley,
      bloomOrYellow: pc.bloomOrYellow,
      alleyType: pc.alleyType,
      canopyShape: pc.canopyShape,
      shadowsUseful: pc.shadowsUseful,
      minEvidence: pc.minEvidence,
      notes: pc.notes,
      gsdM: gsdM
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
      if (s < Math.max(P.darkSum, 70) || (R < 28 && G < 32 && B < 28) || G < P.minG) {
        v = 0;
      } else if (
        (s > 230 && Math.abs(R - G) < 38 && G > B + 5 && R > B + 3) ||
        (s > 200 && Math.abs(R - G) < 22 && G > B + 8 && R > 70)
      ) {
        // Pasto soleado / calle amarillo-verdosa — NO copa
        v = 0;
      } else if (s > 300) {
        // Demasiado brillante para follaje denso
        v = 0;
      } else {
        var r = R / s;
        var g = G / s;
        var b = B / s;
        // Copa: verde dominante y no tan claro como el pasto
        var greenOk =
          g > r + Math.max(0.01, P.gMargin * 0.6) &&
          g > b + P.bMargin &&
          G > R + Math.max(2, P.gAbs - 1) &&
          G > B + P.bAbs &&
          s >= 75 &&
          s <= 300;
        if (P.allowYellow && !greenOk) {
          greenOk =
            g + 0.01 >= r &&
            g > b + P.bMargin &&
            G + 2 >= R &&
            G > B + P.bAbs &&
            s >= 80 &&
            s <= 290 &&
            G > 40;
        }
        if (greenOk) {
          var raw = 2 * g - r - b;
          if (s > 270) raw *= 0.4;
          if (s < 95) raw *= 0.7; // borde de sombra
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
    var blurPx = 10;
    if (gsdGuess != null && Number.isFinite(gsdGuess) && gsdGuess > 0) {
      blurPx = Math.max(6, Math.min(36, Math.round(blurM / gsdGuess)));
    } else {
      // Sin GSD: asumir ~3–5 cm/px típico de orto dron → blur ~1.5–2 m
      blurPx = Math.max(8, Math.min(28, Math.round(Math.min(w, h) / 90)));
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

    var maskRaw = new Uint8Array(n);
    for (var q = 0; q < n; q++) {
      // Requiere señal suavizada (copa) y algo de ExG original (no sombra pura)
      if (blurred[q] >= thrB && exg[q] >= Math.max(12, thr * 0.25)) maskRaw[q] = 1;
    }
    var mask = maskRaw;

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
    var closeN = P.closePasses != null ? P.closePasses : 4;
    closeN = Math.max(3, Math.min(6, closeN));
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
      maskRaw: maskRaw,
      exg: exg,
      blurred: blurred,
      threshold: thrB,
      thrRaw: thr,
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
    if (circ < MIN_CIRCULARITY) return false;
    if (aspect > 1.75 && fill < 0.4) return false;
    if (aspect > 1.55 && circ < 0.4) return false;
    if (comp.touchesBorder && fill < 0.35 && aspect > 1.6) return false;
    return true;
  }

  /** Muestrea tono RGB del blob: descarta sombra / pasto claro / gente. */
  function sampleBlobTone(georaster, comp) {
    var bands = getBandArrays(georaster);
    if (!bands || !comp || !comp.box) return null;
    var w = georaster.width;
    var h = georaster.height;
    var maxR = bands.maxs[0];
    var maxG = bands.maxs[1] != null ? bands.maxs[1] : bands.maxs[0];
    var maxB = bands.maxs[2] != null ? bands.maxs[2] : bands.maxs[0];
    var box = comp.box;
    var sumR = 0;
    var sumG = 0;
    var sumB = 0;
    var n = 0;
    var boxW = box.maxX - box.minX + 1;
    var boxH = box.maxY - box.minY + 1;
    var stride = Math.max(1, Math.ceil(Math.sqrt((boxW * boxH) / 120)));
    for (var yy = box.minY; yy <= box.maxY; yy += stride) {
      for (var xx = box.minX; xx <= box.maxX; xx += stride) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        var R = bandScale(bands.r[yy * w + xx], maxR);
        var G = bandScale(bands.g[yy * w + xx], maxG);
        var B = bandScale(bands.b[yy * w + xx], maxB);
        sumR += R;
        sumG += G;
        sumB += B;
        n++;
      }
    }
    if (!n) return null;
    return {
      meanR: sumR / n,
      meanG: sumG / n,
      meanB: sumB / n,
      meanSum: (sumR + sumG + sumB) / n
    };
  }

  /** ¿Tono plausible de planta (copa, floración, follaje oscuro) — no pasto soleado ni sombra pura? */
  function isCanopyTone(tone) {
    if (!tone) return false;
    var s = tone.meanSum;
    var R = tone.meanR;
    var G = tone.meanG;
    var B = tone.meanB;
    // Sombra / suelo muy oscuro sin estructura
    if (s < 70) return false;
    // Pasto / tierra / ropa muy claros
    if (s > 310) return false;
    // Pasto soleado: alto, R≈G, poco azul
    if (s > 235 && Math.abs(R - G) < 20 && G > B + 10 && R > 85) return false;
    // Planta: verde, amarillo-flor, o copa más oscura que pasto (G o R no dominados por B)
    var greenish = G >= R - 8 && G > B + 1;
    var yellowishBloom = R >= G - 6 && R > B + 8 && G > B + 4 && s >= 90 && s <= 280;
    var darkCrown = s >= 70 && s <= 200 && G + 6 >= B && R + 8 >= B;
    return greenish || yellowishBloom || darkCrown;
  }

  function isGrassLikeShape(comp) {
    return !looksLikeTree(comp);
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

  /** Green Leaf Index (RGB). Altos = más verde; bajos = amarillo/bronce/rojo. */
  function pixelGli(R, G, B) {
    var sum = R + G + B;
    if (sum < 42 || (R < 18 && G < 20 && B < 18)) return null; // sombra
    var den = 2 * G + R + B;
    if (den < 1e-3) return null;
    return (2 * G - R - B) / den;
  }

  /**
   * AirCI Color Score 0–100 vs P10–P90 de la huerta (GLI mediana por copa).
   * No interpreta salud; solo posición relativa de verdor.
   */
  var COLOR_SCORE_BANDS = [
    {
      key: 'bronce',
      min: 0,
      max: 20,
      label: 'Amarillo / bronce',
      color: '#ca8a04',
      fill: '#eab30899',
      hint: '0–20'
    },
    {
      key: 'bajo',
      min: 21,
      max: 40,
      label: 'Menos verde',
      color: '#d97706',
      fill: '#f59e0b99',
      hint: '21–40'
    },
    {
      key: 'medio',
      min: 41,
      max: 60,
      label: 'Color promedio',
      color: '#16a34a',
      fill: '#22c55e99',
      hint: '41–60'
    },
    {
      key: 'alto',
      min: 61,
      max: 80,
      label: 'Más verde',
      color: '#15803d',
      fill: '#16a34a99',
      hint: '61–80'
    },
    {
      key: 'intenso',
      min: 81,
      max: 100,
      label: 'Verde intenso',
      color: '#166534',
      fill: '#15803d99',
      hint: '81–100'
    }
  ];

  function colorScoreBand(score) {
    var s = Number(score);
    if (!Number.isFinite(s)) return null;
    s = Math.max(0, Math.min(100, s));
    for (var i = 0; i < COLOR_SCORE_BANDS.length; i++) {
      var b = COLOR_SCORE_BANDS[i];
      if (s >= b.min && s <= b.max) {
        return {
          key: b.key,
          label: b.label,
          color: b.color,
          fill: b.fill,
          hint: b.hint,
          score: Math.round(s)
        };
      }
    }
    return COLOR_SCORE_BANDS[2];
  }

  function percentileSorted(sortedAsc, p) {
    if (!sortedAsc || !sortedAsc.length) return null;
    if (sortedAsc.length === 1) return sortedAsc[0];
    var rank = (p / 100) * (sortedAsc.length - 1);
    var lo = Math.floor(rank);
    var hi = Math.ceil(rank);
    if (lo === hi) return sortedAsc[lo];
    var t = rank - lo;
    return sortedAsc[lo] * (1 - t) + sortedAsc[hi] * t;
  }

  /**
   * Aplica Color Score 0–100 a cada árbol con gliMedian.
   * Score = 100 × (GLI − P10) / (P90 − P10), clamp 0–100.
   */
  function applyOrchardColorScores(trees) {
    var gliVals = [];
    (trees || []).forEach(function (t) {
      if (t && t.gliMedian != null && Number.isFinite(Number(t.gliMedian))) {
        gliVals.push(Number(t.gliMedian));
      }
    });
    var sorted = gliVals.slice().sort(function (a, b) {
      return a - b;
    });
    var p10 = percentileSorted(sorted, 10);
    var p50 = percentileSorted(sorted, 50);
    var p90 = percentileSorted(sorted, 90);
    var span = p90 != null && p10 != null ? p90 - p10 : 0;

    (trees || []).forEach(function (t) {
      if (!t || t.gliMedian == null || !Number.isFinite(Number(t.gliMedian))) {
        t.colorScore = null;
        t.semColor = null;
        return;
      }
      var g = Number(t.gliMedian);
      var score;
      if (!(span > 1e-6)) {
        score = 50;
      } else {
        score = 100 * ((g - p10) / span);
        score = Math.max(0, Math.min(100, score));
      }
      t.colorScore = Math.round(score * 10) / 10;
      t.semColor = colorScoreBand(score);
    });

    return {
      hasColorScore: sorted.length > 0,
      gliP10: p10,
      gliP50: p50,
      gliP90: p90,
      colorScoreBands: COLOR_SCORE_BANDS,
      disclaimer:
        'AirCI Color Score: verdor relativo al predio (GLI). No interpreta salud ni nutrición.'
    };
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
      semPheno: null,
      gliMedian: null
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
      var gliSamples = [];
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
          var gli = pixelGli(R, G, B);
          if (gli != null && cls !== 'other') gliSamples.push(gli);
          else if (gli != null && R + G + B >= 70) gliSamples.push(gli);
        }
      }

      // Tras fusionar micro-copas el label original ya no coincide: muestrear verde en el bbox
      if (n < 8) {
        flor = brote = veg = other = atyp = 0;
        sumR = sumG = sumB = 0;
        n = 0;
        gliSamples = [];
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
            var gli2 = pixelGli(R2, G2, B2);
            if (gli2 != null && cls2 !== 'other') gliSamples.push(gli2);
            else if (gli2 != null && s2 >= 70) gliSamples.push(gli2);
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
        gliMedian: median(gliSamples),
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

  function spacingMFromDensityHa(treesPerHa) {
    var d = Number(treesPerHa);
    if (!Number.isFinite(d) || d < 50 || d > 2500) return null;
    // Marco cuadrado aproximado: área/planta = 10000/d → lado = sqrt
    return Math.sqrt(10000 / d);
  }

  function guessSpacingPx(gsdM, w, h, typicalSpacingM) {
    var spacingM =
      typicalSpacingM != null && Number.isFinite(typicalSpacingM) && typicalSpacingM > 0
        ? typicalSpacingM
        : DEFAULT_SPACING_M;
    spacingM = Math.max(3.2, Math.min(14, spacingM));
    if (gsdM != null && Number.isFinite(gsdM) && gsdM > 0) {
      return Math.max(8, Math.min(Math.min(w, h) / 3, spacingM / gsdM));
    }
    return Math.max(12, Math.min(Math.min(w, h) / 25, 80));
  }

  /**
   * Mapa de evidencia de planta en RGB (como el ojo: objeto vs calle).
   * Factores: contraste, textura, sombra adyacente, color suave — pesos según contexto.
   */
  function buildPlantnessMap(georaster, blurPx, softExg, scene) {
    scene = scene || defaultPlantContext();
    var bands = getBandArrays(georaster);
    if (!bands) throw new Error('GeoTIFF sin bandas RGB');
    var w = georaster.width;
    var h = georaster.height;
    var n = w * h;
    var maxR = bands.maxs[0];
    var maxG = bands.maxs[1] != null ? bands.maxs[1] : bands.maxs[0];
    var maxB = bands.maxs[2] != null ? bands.maxs[2] : bands.maxs[0];
    var lum = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var R = bandScale(bands.r[i], maxR);
      var G = bandScale(bands.g[i], maxG);
      var B = bandScale(bands.b[i], maxB);
      lum[i] = 0.3 * R + 0.59 * G + 0.11 * B;
    }
    var canopyR = Math.max(3, Math.min(28, blurPx | 0));
    var texR = Math.max(1, Math.min(6, Math.round(canopyR / 4)));
    var shadowR = Math.max(canopyR + 2, Math.min(36, Math.round(canopyR * 1.6)));
    var meanL = boxBlurU8(lum, w, h, canopyR);
    var fineL = boxBlurU8(lum, w, h, texR);
    var wideL = boxBlurU8(lum, w, h, shadowR);

    // Pesos tipo humano: contraste importa más que “verde”
    var wDark =
      scene.crownVsAlley === 'brighter' ? 0.35 : scene.crownVsAlley === 'similar' ? 0.7 : 1.45;
    var wBright =
      scene.crownVsAlley === 'brighter' ? 1.2 : scene.crownVsAlley === 'similar' ? 0.55 : 0.35;
    var wTex = 1.15;
    var wColor = scene.bloomOrYellow ? 0.22 : scene.alleyType === 'bare_soil' ? 0.55 : 0.38;
    var wShadow = scene.shadowsUseful ? 0.85 : 0.15;

    var raw = new Float32Array(n);
    for (var p = 0; p < n; p++) {
      var L = lum[p];
      var m = meanL[p];
      var darkBlob = Math.max(0, m - L);
      var brightBlob = Math.max(0, L - m);
      var texture = Math.abs(L - fineL[p]);
      // Sombra proyectada: anillo/vecindario más amplio más oscuro que la calle media
      var shadowCue = Math.max(0, m - wideL[p]);
      var shadowFlat = L < 35 && m < 45 && texture < 4;
      var exgSoft = softExg && softExg[p] > 0 ? softExg[p] / 255 : 0;
      var score =
        wDark * darkBlob +
        wBright * Math.min(brightBlob, 48) +
        wTex * texture +
        wShadow * shadowCue +
        wColor * 40 * exgSoft;
      if (shadowFlat) score *= 0.12;
      if (texture < 3 && darkBlob < 4 && brightBlob < 4) score *= 0.3;
      // Calle de pasto muy uniforme
      if (scene.alleyType === 'grass' && texture < 2.5 && Math.abs(L - m) < 3) score *= 0.25;
      raw[p] = score;
    }
    var blurred = boxBlurU8(raw, w, h, Math.max(2, Math.round(canopyR * 0.55)));
    var maxV = 1e-6;
    for (var q = 0; q < n; q++) {
      if (blurred[q] > maxV) maxV = blurred[q];
    }
    var out = new Float32Array(n);
    for (var u = 0; u < n; u++) {
      out[u] = Math.max(0, Math.min(255, (blurred[u] / maxV) * 255));
    }
    return { plant: out, lum: lum, meanL: meanL, width: w, height: h };
  }

  /**
   * Evidencia multi-factor: ¿esto se comporta como planta de ESTE predio?
   * Tamaño vs densidad/Ø esperado, forma, plantness, no “basura” de calle.
   */
  function evaluatePlantEvidence(comp, scene, gsdM) {
    var reasons = [];
    var score = 0;
    var area = Number(comp.areaPx) || 0;
    var aspect = Number(comp.aspect) || 1;
    var fill = Number(comp.fillRatio) || 0;
    var circ = Number(comp.circularity) || 0;
    var peak = comp.seed && comp.seed.v != null ? comp.seed.v : Number(comp.meanExg) || 0;

    var diamEq =
      gsdM != null && gsdM > 0
        ? 2 * Math.sqrt(area / Math.PI) * gsdM
        : comp.ellipse
          ? 2 * Math.sqrt(comp.ellipse.rx * comp.ellipse.ry)
          : null;

    // 1) Tamaño creíble para el marco del predio (ojo humano: “ese bulto es del tamaño de un árbol”)
    var sizeScore = 0.45;
    if (diamEq != null && scene.diamMinM != null) {
      if (diamEq >= scene.diamMinM && diamEq <= scene.diamMaxM) {
        sizeScore = 1;
        reasons.push('tamano_ok');
      } else if (diamEq >= scene.diamMinM * 0.7 && diamEq <= scene.diamMaxM * 1.35) {
        sizeScore = 0.65;
        reasons.push('tamano_borde');
      } else {
        sizeScore = 0.12;
        reasons.push('tamano_fuera');
      }
    } else {
      sizeScore = 0.5;
    }
    score += 28 * sizeScore;

    // 2) Objeto compacto (no franja de pasto / no persona suelta)
    var shapeScore = 0.4;
    if (scene.canopyShape === 'irregular') {
      shapeScore = fill >= 0.18 && aspect <= 2.8 ? 0.85 : fill >= 0.12 ? 0.5 : 0.15;
    } else if (scene.canopyShape === 'oval') {
      shapeScore =
        aspect <= 2.4 && fill >= 0.22 && circ >= 0.18
          ? 0.9
          : aspect <= 2.8 && fill >= 0.18
            ? 0.55
            : 0.2;
    } else {
      shapeScore =
        aspect <= 2.05 && fill >= 0.25 && circ >= 0.22
          ? 1
          : aspect <= 2.4 && fill >= 0.2
            ? 0.6
            : 0.18;
    }
    if (shapeScore >= 0.85) reasons.push('forma_copa');
    else if (shapeScore < 0.35) reasons.push('forma_rara');
    score += 24 * shapeScore;

    // 3) Evidencia de “objeto” en el centro (plantness)
    var peakScore = Math.max(0, Math.min(1, peak / 140));
    score += 22 * peakScore;
    if (peakScore > 0.55) reasons.push('contraste_centro');

    // 4) No demasiado chico vs spacing (basura / gente / sombra suelta)
    var vsSpacing = 0.5;
    if (diamEq != null && scene.spacingM > 0) {
      var ratio = diamEq / scene.spacingM;
      // Copa típica ~0.45–0.85 del marco
      if (ratio >= 0.35 && ratio <= 0.95) {
        vsSpacing = 1;
        reasons.push('vs_marco');
      } else if (ratio >= 0.25 && ratio <= 1.15) vsSpacing = 0.6;
      else vsSpacing = 0.15;
    }
    score += 16 * vsSpacing;

    // 5) Bloom / color no descalifica si el contexto lo espera
    if (scene.bloomOrYellow) {
      score += 4;
      reasons.push('floracion_ok');
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    return {
      ok: score >= (scene.minEvidence || 52),
      score: score,
      reasons: reasons,
      diamEqM: diamEq
    };
  }

  /** Picos locales = centros candidatos de planta (sobre mapa plantness). */
  function findCanopySeeds(scoreMap, seedMask, w, h, winR, minVal) {
    winR = Math.max(2, winR | 0);
    var step = Math.max(1, Math.floor(winR / 2));
    var peaks = [];
    var y0 = winR;
    var y1 = h - winR;
    var x0 = winR;
    var x1 = w - winR;
    for (var y = y0; y < y1; y += step) {
      for (var x = x0; x < x1; x += step) {
        var bestV = -1;
        var bx = x;
        var by = y;
        var yEnd = Math.min(y1, y + step);
        var xEnd = Math.min(x1, x + step);
        for (var yy = y; yy < yEnd; yy++) {
          var row = yy * w;
          for (var xx = x; xx < xEnd; xx++) {
            var ii = row + xx;
            if (seedMask && !seedMask[ii]) continue;
            var vv = scoreMap[ii];
            if (vv > bestV) {
              bestV = vv;
              bx = xx;
              by = yy;
            }
          }
        }
        if (bestV < minVal) continue;
        var isMax = true;
        for (var dy = -winR; dy <= winR && isMax; dy++) {
          var ry = (by + dy) * w;
          for (var dx = -winR; dx <= winR; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (scoreMap[ry + bx + dx] > bestV) {
              isMax = false;
              break;
            }
          }
        }
        if (isMax) peaks.push({ x: bx, y: by, v: bestV });
      }
    }
    peaks.sort(function (a, b) {
      return b.v - a.v;
    });
    // Deduplicar picos casi idénticos
    var uniq = [];
    var minD2 = Math.max(4, (winR * 0.5) * (winR * 0.5));
    for (var p = 0; p < peaks.length; p++) {
      var ok = true;
      for (var u = 0; u < uniq.length; u++) {
        var ddx = peaks[p].x - uniq[u].x;
        var ddy = peaks[p].y - uniq[u].y;
        if (ddx * ddx + ddy * ddy < minD2) {
          ok = false;
          break;
        }
      }
      if (ok) uniq.push(peaks[p]);
    }
    return uniq;
  }

  function nmsSeeds(seeds, minDistPx) {
    var minD2 = minDistPx * minDistPx;
    var kept = [];
    for (var i = 0; i < seeds.length; i++) {
      var s = seeds[i];
      var ok = true;
      for (var j = 0; j < kept.length; j++) {
        var dx = s.x - kept[j].x;
        var dy = s.y - kept[j].y;
        if (dx * dx + dy * dy < minD2) {
          ok = false;
          break;
        }
      }
      if (ok) kept.push(s);
    }
    return kept;
  }

  function medianNnSpacingPx(seeds) {
    if (!seeds || seeds.length < 2) return null;
    var dists = [];
    for (var i = 0; i < seeds.length; i++) {
      var best = Infinity;
      for (var j = 0; j < seeds.length; j++) {
        if (i === j) continue;
        var dx = seeds[i].x - seeds[j].x;
        var dy = seeds[i].y - seeds[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < best) best = d;
      }
      if (best < Infinity) dists.push(best);
    }
    return median(dists);
  }

  /**
   * Segmenta la planta alrededor del centro dentro de radio R.
   * Usa plantness (estructura) + ExG suave; no exige “lo más verde”.
   */
  function segmentAroundSeed(seed, plantMap, softExg, labels, labelId, w, h, radiusPx) {
    var fromVision = !!(seed && seed.fromVision);
    var R = Math.max(3, radiusPx);
    var R2 = R * R;
    var minPlant = fromVision
      ? Math.max(8, (seed.v || 160) * 0.18)
      : Math.max(12, seed.v * 0.32);
    var sx = seed.x | 0;
    var sy = seed.y | 0;
    var start = sy * w + sx;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
      return { areaPx: 0, pixels: [], box: null };
    }
    if (labels[start] && labels[start] !== labelId) {
      return { areaPx: 0, pixels: [], box: null };
    }
    // Visión IA: el centro ya es planta aunque ExG/plantness local sea bajo (flor, sombra, RGB raro)
    if (
      !fromVision &&
      plantMap[start] < minPlant * 0.7 &&
      !(softExg && softExg[start] > 20)
    ) {
      return { areaPx: 0, pixels: [], box: null };
    }

    var queue = [start];
    labels[start] = labelId;
    var pixels = [start];
    var minX = sx;
    var maxX = sx;
    var minY = sy;
    var maxY = sy;
    var qi = 0;
    var dirs = [-1, 1, -w, w];

    while (qi < queue.length) {
      var cur = queue[qi++];
      var cx = cur % w;
      var cy = (cur / w) | 0;
      for (var d = 0; d < 4; d++) {
        var nidx = cur + dirs[d];
        if (nidx < 0 || nidx >= w * h) continue;
        var nx = nidx % w;
        var ny = (nidx / w) | 0;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
        if (labels[nidx]) continue;
        var ddx = nx - sx;
        var ddy = ny - sy;
        if (ddx * ddx + ddy * ddy > R2) continue;
        var pv = plantMap[nidx];
        var ev = softExg ? softExg[nidx] : 0;
        if (fromVision) {
          // Flood suave: acepta textura débil dentro del radio de la copa marcada
          if (pv < minPlant * 0.45 && ev < 8 && pixels.length > 12) continue;
        } else {
          // Misma planta: plantness relativo al centro O algo de ExG/copa
          if (pv < minPlant && ev < 16) continue;
          if (pv < seed.v * 0.22 && ev < 28) continue;
        }
        labels[nidx] = labelId;
        queue.push(nidx);
        pixels.push(nidx);
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
      }
    }

    return {
      areaPx: pixels.length,
      pixels: pixels,
      box: { minX: minX, maxX: maxX, minY: minY, maxY: maxY }
    };
  }

  /** Disco sintético cuando la visión marcó planta pero el ExG no segmenta. */
  function synthesizeVisionDisk(seed, labels, labelId, w, h, radiusPx) {
    var sx = seed.x | 0;
    var sy = seed.y | 0;
    var R = Math.max(4, Math.round(radiusPx || 8));
    var R2 = R * R;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
      return { areaPx: 0, pixels: [], box: null, ellipse: null };
    }
    var pixels = [];
    var minX = sx;
    var maxX = sx;
    var minY = sy;
    var maxY = sy;
    var y0 = Math.max(0, sy - R);
    var y1 = Math.min(h - 1, sy + R);
    var x0 = Math.max(0, sx - R);
    var x1 = Math.min(w - 1, sx + R);
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dx = x - sx;
        var dy = y - sy;
        if (dx * dx + dy * dy > R2) continue;
        var idx = y * w + x;
        if (labels[idx] && labels[idx] !== labelId) continue;
        labels[idx] = labelId;
        pixels.push(idx);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return {
      areaPx: pixels.length,
      pixels: pixels,
      box: { minX: minX, maxX: maxX, minY: minY, maxY: maxY },
      ellipse: { cx: sx, cy: sy, rx: R, ry: R * 0.92, angle: 0 }
    };
  }

  /** Elipse por momentos de inercia (PCA 2D) sobre píxeles segmentados. */
  function fitEllipse(pixels, w) {
    var n = pixels.length;
    if (n < 8) return null;
    var sumX = 0;
    var sumY = 0;
    for (var i = 0; i < n; i++) {
      sumX += pixels[i] % w;
      sumY += (pixels[i] / w) | 0;
    }
    var cx = sumX / n;
    var cy = sumY / n;
    var mxx = 0;
    var myy = 0;
    var mxy = 0;
    for (var j = 0; j < n; j++) {
      var x = (pixels[j] % w) - cx;
      var y = ((pixels[j] / w) | 0) - cy;
      mxx += x * x;
      myy += y * y;
      mxy += x * y;
    }
    mxx /= n;
    myy /= n;
    mxy /= n;
    var tmp = Math.sqrt(Math.max(0, (mxx - myy) * (mxx - myy) + 4 * mxy * mxy));
    var l1 = 0.5 * (mxx + myy + tmp);
    var l2 = 0.5 * (mxx + myy - tmp);
    // ~2σ cubre la mayor parte del blob
    var rx = 2 * Math.sqrt(Math.max(l1, 0.25));
    var ry = 2 * Math.sqrt(Math.max(l2, 0.25));
    if (rx < ry) {
      var swap = rx;
      rx = ry;
      ry = swap;
    }
    var angle = 0.5 * Math.atan2(2 * mxy, mxx - myy);
    return { cx: cx, cy: cy, rx: rx, ry: ry, angle: angle };
  }

  function ellipseToPixelRing(ell, sides) {
    sides = sides || 28;
    var out = [];
    var cosA = Math.cos(ell.angle);
    var sinA = Math.sin(ell.angle);
    for (var i = 0; i < sides; i++) {
      var t = (i / sides) * Math.PI * 2;
      var lx = Math.cos(t) * ell.rx;
      var ly = Math.sin(t) * ell.ry;
      var x = ell.cx + lx * cosA - ly * sinA;
      var y = ell.cy + lx * sinA + ly * cosA;
      out.push([x, y]);
    }
    return out;
  }

  function ellipseToLatLngs(georaster, ell, sides) {
    return ellipseToPixelRing(ell, sides).map(function (xy) {
      return pixelToLatLng(georaster, xy[0], xy[1]);
    });
  }

  function scoreSeedCanopy(comp, seedV, medianArea) {
    var area = Number(comp.areaPx) || 0;
    var fill = Number(comp.fillRatio) || 0;
    var aspect = Number(comp.aspect) || 1;
    var circ = Number(comp.circularity) || 0;
    var peak = Math.max(0, Math.min(1, (seedV || 0) / 160));
    var compact = Math.max(0, Math.min(1, (fill - 0.2) / 0.55));
    var roundScore = Math.max(0, Math.min(1, 1 - (aspect - 1) / 1.8));
    var circScore = Math.max(0, Math.min(1, (circ - 0.2) / 0.55));
    var sizeScore = 0.45;
    if (medianArea > 0 && area > 0) {
      var ratio = area / medianArea;
      if (ratio >= 0.45 && ratio <= 2.4) sizeScore = 1;
      else if (ratio >= 0.28 && ratio <= 3.5) sizeScore = 0.7;
      else if (ratio >= 0.18 && ratio <= 4.5) sizeScore = 0.4;
      else sizeScore = 0.15;
    }
    var conf =
      100 *
      (0.28 * peak +
        0.2 * compact +
        0.18 * roundScore +
        0.18 * circScore +
        0.16 * sizeScore);
    return Math.max(0, Math.min(100, Math.round(conf)));
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
    var w = veg.width;
    var h = veg.height;
    var totalPx = w * h;
    var gsdM = estimateGsdM(georaster);
    var minAreaPx = resolveMinAreaPx(
      opts.minAreaPx != null ? opts.minAreaPx : P.minAreaPx,
      gsdM,
      totalPx
    );
    var minConf =
      opts.minConfidence != null ? opts.minConfidence : P.minConfidence;

    var excluded = {
      giant: 0,
      outlier: 0,
      shape: 0,
      tone: 0,
      evidence: 0,
      lowConf: 0,
      tiny: 0,
      mergedAway: 0,
      weakSeed: 0
    };

    // Escena del predio: densidad + criterios de planta (IA / default)
    var scene = resolvePlantScene(opts, P, gsdM);
    var targetDens = scene.dens;
    var densSpacingM = spacingMFromDensityHa(targetDens);
    var spacingPx = guessSpacingPx(gsdM, w, h, scene.spacingM);
    var spacingLocked = densSpacingM != null || P.typicalSpacingM != null;

    // Área mínima alineada al Ø de copa esperado del predio
    if (gsdM != null && gsdM > 0 && scene.diamMinM > 0) {
      var rMin = scene.diamMinM / 2;
      minAreaPx = Math.max(minAreaPx, Math.ceil((Math.PI * rMin * rMin) / (gsdM * gsdM)));
    }

    var winR = Math.max(
      3,
      Math.round(
        gsdM != null && gsdM > 0
          ? Math.max((scene.diamMinM * 0.4) / gsdM, (MIN_CANOPY_DIAM_M * 0.3) / gsdM)
          : spacingPx * 0.22
      )
    );

    // Semillas: visión IA (como ojo humano) O picos locales
    var plantPack = buildPlantnessMap(georaster, veg.blurPx || 10, veg.exg, scene);
    var plantMap = plantPack.plant;
    var peakMin = 20;
    var seedMask = null;
    var rawSeeds;
    var usedVision = false;
    if (Array.isArray(opts.visionSeeds) && opts.visionSeeds.length) {
      usedVision = true;
      rawSeeds = opts.visionSeeds
        .map(function (s) {
          var x = Math.round(Number(s.x));
          var y = Math.round(Number(s.y));
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          if (x < 0 || y < 0 || x >= w || y >= h) return null;
          return {
            x: x,
            y: y,
            v: Number(s.v) > 0 ? Number(s.v) : 200,
            rPx: Number(s.rPx) > 0 ? Number(s.rPx) : null,
            fromVision: true
          };
        })
        .filter(Boolean);
      // Si la IA respondió pero las coords no cayeron en el raster → caer a local
      if (!rawSeeds.length) {
        usedVision = false;
        rawSeeds = findCanopySeeds(plantMap, seedMask, w, h, winR, peakMin);
      }
    } else {
      rawSeeds = findCanopySeeds(plantMap, seedMask, w, h, winR, peakMin);
    }
    var seeds = nmsSeeds(rawSeeds, spacingPx * NMS_FRAC);

    var orthoHa =
      gsdM != null && Number.isFinite(gsdM) && gsdM > 0
        ? (totalPx * gsdM * gsdM) / 10000
        : null;
    var expectedTrees =
      targetDens != null && orthoHa != null && orthoHa > 0.01
        ? Math.round(targetDens * orthoHa)
        : null;
    // Con visión no recortar agresivo: la IA ya eligió plantas
    if (
      !usedVision &&
      expectedTrees != null &&
      expectedTrees >= 3 &&
      seeds.length > expectedTrees * 1.45
    ) {
      seeds = seeds.slice(0, Math.max(expectedTrees, Math.ceil(expectedTrees * 1.35)));
    }

    var nnMed = medianNnSpacingPx(seeds);
    if (nnMed != null && nnMed > 4) {
      var refined = nnMed;
      if (gsdM != null && gsdM > 0) {
        var m = refined * gsdM;
        m = Math.max(3.2, Math.min(12, m));
        refined = m / gsdM;
      }
      if (spacingLocked) {
        spacingPx = 0.72 * spacingPx + 0.28 * refined;
      } else {
        spacingPx = 0.55 * spacingPx + 0.45 * refined;
      }
      if (!usedVision) {
        seeds = nmsSeeds(rawSeeds, spacingPx * NMS_FRAC);
        if (expectedTrees != null && expectedTrees >= 3 && seeds.length > expectedTrees * 1.45) {
          seeds = seeds.slice(0, Math.max(expectedTrees, Math.ceil(expectedTrees * 1.35)));
        }
      } else {
        // Visión: NMS más suave (0.4×spacing) para no borrar vecinos reales
        seeds = nmsSeeds(rawSeeds, spacingPx * 0.4);
      }
    }

    var searchR = Math.max(winR + 2, Math.round(spacingPx * SEARCH_RADIUS_FRAC));
    searchR = Math.min(searchR, Math.round(spacingPx * 0.48));
    if (gsdM != null && gsdM > 0) {
      searchR = Math.min(
        searchR,
        Math.max(winR + 2, Math.round((scene.diamMaxM * 0.55) / gsdM))
      );
    }
    // Si la visión dio radio por planta, usarlo como tope de búsqueda
    if (usedVision) {
      var rMed = median(
        seeds
          .map(function (s) {
            return s.rPx;
          })
          .filter(function (r) {
            return r != null && r > 0;
          })
      );
      if (rMed != null && rMed > 4) {
        searchR = Math.max(searchR, Math.round(rMed * 1.15));
        searchR = Math.min(searchR, Math.round(spacingPx * 0.5));
      }
    }

    // 2) Segmentar localmente + elipse; labels para fenología
    // visionOnly: confía en marcas IA; si ExG no segmenta, dibuja disco con r de la visión
    var visionOnly = !!(opts.visionOnly && usedVision);
    var labels = new Int32Array(totalPx);
    var comps = [];
    for (var si = 0; si < seeds.length; si++) {
      var seed = seeds[si];
      var labelId = si + 1;
      var sIdx = seed.y * w + seed.x;
      if (labels[sIdx] && labels[sIdx] !== labelId) {
        excluded.weakSeed++;
        continue;
      }
      var localR = searchR;
      if (seed.fromVision && seed.rPx != null && seed.rPx > 3) {
        localR = Math.max(searchR, Math.round(seed.rPx * 1.05));
        localR = Math.min(localR, Math.max(searchR, Math.round(spacingPx * 0.55)));
      }
      var seg = segmentAroundSeed(
        seed,
        plantMap,
        veg.exg,
        labels,
        labelId,
        w,
        h,
        localR
      );
      var ell = null;
      var usedSynth = false;
      var minSegArea = seed.fromVision
        ? Math.max(12, Math.floor(minAreaPx * 0.08))
        : Math.max(40, Math.floor(minAreaPx * 0.25));
      if (!seg.areaPx || seg.areaPx < minSegArea) {
        if (seed.fromVision) {
          // Liberar labels débiles e inyectar disco de la visión
          for (var pClear = 0; pClear < seg.pixels.length; pClear++) {
            labels[seg.pixels[pClear]] = 0;
          }
          var synthR =
            seed.rPx != null && seed.rPx > 3
              ? seed.rPx
              : Math.max(6, Math.round(localR * 0.72));
          seg = synthesizeVisionDisk(seed, labels, labelId, w, h, synthR);
          ell = seg.ellipse;
          usedSynth = true;
          if (!seg.areaPx) {
            excluded.tiny++;
            continue;
          }
        } else {
          excluded.tiny++;
          for (var pi = 0; pi < seg.pixels.length; pi++) labels[seg.pixels[pi]] = 0;
          continue;
        }
      }
      if (!ell) ell = fitEllipse(seg.pixels, w);
      if (!ell) {
        if (seed.fromVision) {
          var fallbackR =
            seed.rPx != null && seed.rPx > 3
              ? seed.rPx
              : Math.max(6, Math.round(localR * 0.7));
          ell = {
            cx: seed.x,
            cy: seed.y,
            rx: fallbackR,
            ry: fallbackR * 0.92,
            angle: 0
          };
          usedSynth = true;
        } else {
          excluded.shape++;
          for (var pj = 0; pj < seg.pixels.length; pj++) labels[seg.pixels[pj]] = 0;
          continue;
        }
      }
      // Recentrar elipse hacia el centro de masa (ya lo es) y asegurar tamaño mínimo
      var minRx =
        gsdM != null && gsdM > 0
          ? (scene.diamMinM * 0.4) / gsdM
          : 4;
      if (seed.fromVision) {
        // Visión: no forzar Ø mínimo de huerta adulta (puede ser planta joven)
        minRx = Math.min(minRx, Math.max(3, (seed.rPx || localR) * 0.45));
      }
      ell.rx = Math.max(ell.rx, minRx);
      ell.ry = Math.max(ell.ry, minRx * (scene.canopyShape === 'oval' ? 0.55 : 0.7));

      var ellArea = Math.PI * ell.rx * ell.ry;
      var fill = ellArea > 0 ? Math.min(1.2, seg.areaPx / ellArea) : 0;
      if (usedSynth) fill = Math.max(fill, 0.85);
      var aspect = ell.rx / Math.max(1e-6, ell.ry);
      var circ = (4 * seg.areaPx) / (Math.PI * Math.max(ell.rx * 2, 1) * Math.max(ell.rx * 2, 1));
      var box = {
        minX: Math.max(0, Math.floor(ell.cx - ell.rx)),
        maxX: Math.min(w - 1, Math.ceil(ell.cx + ell.rx)),
        minY: Math.max(0, Math.floor(ell.cy - ell.rx)),
        maxY: Math.min(h - 1, Math.ceil(ell.cy + ell.rx))
      };
      // edge ring in pixel space for legacy helpers
      var ring = ellipseToPixelRing(ell, 28);
      var edge = ring.map(function (xy) {
        return [Math.round(xy[0]), Math.round(xy[1])];
      });

      var comp = {
        label: labelId,
        areaPx: seg.areaPx,
        box: box,
        edge: edge,
        fillRatio: fill,
        aspect: aspect,
        circularity: circ,
        meanExg: seed.v,
        touchesBorder:
          box.minX <= 1 || box.minY <= 1 || box.maxX >= w - 2 || box.maxY >= h - 2,
        borderPx: 0,
        seed: seed,
        ellipse: ell,
        fromVision: !!seed.fromVision,
        visionSynth: usedSynth,
        _ellLatLngs: null
      };
      comps.push(comp);
    }

    // 3) Filtros: tamaño / forma blanda / tono / evidencia multi-factor de PLANTA
    var maxAreaAbs = Math.max(minAreaPx * 20, Math.floor(totalPx * MAX_AREA_FRAC));
    var maxAspect =
      scene.canopyShape === 'irregular'
        ? 2.9
        : scene.canopyShape === 'oval'
          ? 2.55
          : MAX_ASPECT + 0.25;
    comps = comps.filter(function (c) {
      if (c.areaPx > maxAreaAbs) {
        excluded.giant++;
        return false;
      }
      // Visión: no matar por área mínima de ExG (la IA ya eligió la planta)
      if (!c.fromVision && c.areaPx < minAreaPx) {
        excluded.tiny++;
        return false;
      }
      if (c.fromVision && c.areaPx < Math.max(8, Math.floor(minAreaPx * 0.05))) {
        excluded.tiny++;
        return false;
      }
      if (c.aspect > maxAspect) {
        excluded.shape++;
        return false;
      }
      if (!c.fromVision && c.fillRatio < (scene.canopyShape === 'irregular' ? 0.14 : 0.18)) {
        excluded.shape++;
        return false;
      }
      return true;
    });

    comps = comps.filter(function (c) {
      if (c.fromVision || visionOnly) return true;
      // Con floración esperada, no matar por tono “poco verde”
      if (scene.bloomOrYellow) return true;
      if (!isCanopyTone(sampleBlobTone(georaster, c))) {
        excluded.tone++;
        return false;
      }
      return true;
    });

    comps = comps.filter(function (c) {
      var ev = evaluatePlantEvidence(c, scene, gsdM);
      c.plantEvidence = ev.score;
      c.plantReasons = ev.reasons;
      // Semilla de visión: no tirar por evidencia local débil
      if (c.fromVision || (c.seed && c.seed.fromVision)) {
        if (visionOnly) return true;
        if (ev.score < 18) {
          excluded.evidence++;
          return false;
        }
        return true;
      }
      if (!ev.ok) {
        excluded.evidence++;
        return false;
      }
      return true;
    });

    var areasAll = comps.map(function (c) {
      return c.areaPx;
    });
    var med = median(areasAll);
    if (med > 0) {
      comps = comps.filter(function (c) {
        if (c.fromVision) {
          // Solo descartar outliers extremos entre marcas de visión
          if (c.areaPx > med * (MAX_AREA_VS_MEDIAN * 1.8)) {
            excluded.outlier++;
            return false;
          }
          return true;
        }
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

    comps.forEach(function (c) {
      var base = scoreSeedCanopy(c, c.seed ? c.seed.v : c.meanExg, med);
      var ev = c.plantEvidence != null ? c.plantEvidence : base;
      c.confidence = Math.round(0.45 * base + 0.55 * ev);
      if (c.fromVision) {
        c.confidence = Math.max(c.confidence, visionOnly ? 72 : 58);
      }
    });
    comps = comps.filter(function (c) {
      if (c.fromVision && visionOnly) return true;
      var need = c.fromVision ? Math.min(minConf, 40) : minConf;
      if ((c.confidence || 0) < need) {
        excluded.lowConf++;
        return false;
      }
      return true;
    });

    // 4) Orden surco → línea
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

    var phenoList = classifyTreesPhenology(georaster, labels, ordered);

    var trees = ordered.map(function (o, idx) {
      var c = o.comp;
      var z = (c.areaPx - stats.mean) / stats.std;
      var sem = semaforoClass(z);
      var latlngs =
        c.ellipse != null
          ? ellipseToLatLngs(georaster, c.ellipse, 28)
          : componentToLatLngs(georaster, c);
      var cx = c.ellipse ? c.ellipse.cx : (c.box.minX + c.box.maxX) / 2;
      var cy = c.ellipse ? c.ellipse.cy : (c.box.minY + c.box.maxY) / 2;
      var center = pixelToLatLng(georaster, cx, cy);
      var boxW = c.box.maxX - c.box.minX + 1;
      var boxH = c.box.maxY - c.box.minY + 1;
      var diamEqPx = 2 * Math.sqrt(c.areaPx / Math.PI);
      if (c.ellipse) {
        diamEqPx = 2 * Math.sqrt(c.ellipse.rx * c.ellipse.ry);
      }
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
        semPheno: ph.semPheno,
        gliMedian: ph.gliMedian != null ? ph.gliMedian : null,
        colorScore: null,
        semColor: null
      };
    });

    var phenoSummary = summarizePhenology(trees);
    var colorSummary = applyOrchardColorScores(trees);

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
      excluded.tone +
      excluded.evidence +
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
        width: w,
        height: h,
        maxAreaAbs: maxAreaAbs,
        truncated: truncated,
        maxTrees: MAX_TREES,
        rowCount: rowCount,
        meanConfidence: meanConfidence,
        excludedTotal: excludedTotal,
        excludedGiant: excluded.giant,
        excludedOutlier: excluded.outlier,
        excludedShape: excluded.shape,
        excludedTone: excluded.tone,
        excludedEvidence: excluded.evidence,
        excludedLowConf: excluded.lowConf,
        excludedTiny: excluded.tiny,
        excludedWeakSeed: excluded.weakSeed,
        mergedFragments: excluded.mergedAway,
        minAreaPxUsed: minAreaPx,
        candidatesRaw: rawSeeds.length,
        seedsKept: seeds.length,
        spacingPx: spacingPx,
        spacingM: hasScale ? spacingPx * gsdM : null,
        spacingFromDensity: densSpacingM != null,
        targetTreesPerHa: targetDens,
        expectedTrees: expectedTrees,
        expectedCanopyDiamM: scene.diamM,
        canopyDiamRangeM: [scene.diamMinM, scene.diamMaxM],
        plantScene: {
          crownVsAlley: scene.crownVsAlley,
          bloomOrYellow: scene.bloomOrYellow,
          alleyType: scene.alleyType,
          canopyShape: scene.canopyShape,
          shadowsUseful: scene.shadowsUseful,
          minEvidence: scene.minEvidence
        },
        searchRadiusPx: searchR,
        detectionMode: usedVision ? 'vision_plants' : 'center_ellipse',
        plantness: true,
        visionSeeds: usedVision ? rawSeeds.length : 0,
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
        meanPhenoConfidence: phenoSummary.meanPhenoConfidence,
        hasColorScore: colorSummary.hasColorScore,
        gliP10: colorSummary.gliP10,
        gliP50: colorSummary.gliP50,
        gliP90: colorSummary.gliP90,
        colorScoreDisclaimer: colorSummary.disclaimer
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
    pixelGli: pixelGli,
    colorScoreBand: colorScoreBand,
    applyOrchardColorScores: applyOrchardColorScores,
    PHENO_META: PHENO_META,
    COLOR_SCORE_BANDS: COLOR_SCORE_BANDS,
    orderComponentsByRows: orderComponentsByRows,
    scoreCanopy: scoreCanopy,
    circleToLatLngs: circleToLatLngs,
    ellipseToLatLngs: ellipseToLatLngs,
    fitEllipse: fitEllipse,
    spacingMFromDensityHa: spacingMFromDensityHa,
    pixelToLatLng: pixelToLatLng,
    getBandArrays: getBandArrays,
    bandScale: bandScale,
    resolveExgParams: resolveExgParams
  };
})(typeof window !== 'undefined' ? window : globalThis);
