/**
 * NDVI / NDMI / NDRE / RGB desde bandas Sentinel-2 + paletas NutriPlant.
 * SCL (nubes/sombras) + mediana corta por píxel cuando hay varias escenas.
 */
const sharp = require('sharp');
const proj4 = require('proj4');

const NDVI_VIS = {
  min: 0.1,
  max: 0.92,
  palette: ['7f1d1d', 'b91c1c', 'ea580c', 'f59e0b', 'fde68a', 'bef264', '65a30d', '15803d', '064e3b']
};

const NDMI_VIS = {
  min: -0.25,
  max: 0.55,
  palette: ['7c2d12', 'ea580c', 'f59e0b', 'fde68a', 'bbf7d0', '22c55e', '0f766e', '0369a1']
};

/** NDRE — clorofila / estado del dosel (relativo al predio). */
const NDRE_VIS = {
  min: 0.05,
  max: 0.55,
  palette: ['7f1d1d', 'c2410c', 'ca8a04', 'eab308', 'a3e635', '22c55e', '0d9488', '0f766e', '134e4a']
};

/** SCL Sentinel-2 L2A: descartar nubes, sombras, agua, nieve, defectuosos. */
const SCL_BAD = new Set([0, 1, 2, 3, 6, 8, 9, 10, 11]);

function utmDef(lng, lat) {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const south = lat < 0;
  return '+proj=utm +zone=' + zone + (south ? ' +south' : '') + ' +datum=WGS84 +units=m +no_defs';
}

function geoBboxToUtm(bbox4326) {
  const [west, south, east, north] = bbox4326;
  const centerLng = (west + east) / 2;
  const centerLat = (south + north) / 2;
  const utm = utmDef(centerLng, centerLat);
  const sw = proj4('EPSG:4326', utm, [west, south]);
  const ne = proj4('EPSG:4326', utm, [east, north]);
  return {
    utm,
    minX: Math.min(sw[0], ne[0]),
    maxX: Math.max(sw[0], ne[0]),
    minY: Math.min(sw[1], ne[1]),
    maxY: Math.max(sw[1], ne[1])
  };
}

function pixelWindowFromGeo(image, minX, minY, maxX, maxY) {
  const fd = image.fileDirectory || image.getFileDirectory();
  const scale = fd.ModelPixelScale;
  const tie = fd.ModelTiepoint;
  if (!scale || !tie) {
    throw new Error('GeoTIFF sin ModelPixelScale/ModelTiepoint');
  }
  const scaleX = scale[0];
  const scaleY = scale[1];
  const tieX = tie[3];
  const tieY = tie[4];

  function geoToCol(x) {
    return (x - tieX) / scaleX;
  }
  function geoToRow(y) {
    return (tieY - y) / scaleY;
  }

  const cols = [geoToCol(minX), geoToCol(maxX)];
  const rows = [geoToRow(minY), geoToRow(maxY)];
  const w = image.getWidth();
  const h = image.getHeight();
  const winMinX = Math.max(0, Math.floor(Math.min(cols[0], cols[1])));
  const winMaxX = Math.min(w, Math.ceil(Math.max(cols[0], cols[1])));
  const winMinY = Math.max(0, Math.floor(Math.min(rows[0], rows[1])));
  const winMaxY = Math.min(h, Math.ceil(Math.max(rows[0], rows[1])));
  if (winMinX >= winMaxX || winMinY >= winMaxY) {
    throw new Error('BBox del predio fuera de la escena');
  }
  return [winMinX, winMinY, winMaxX, winMaxY];
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function buildPaletteLUT(paletteHex, min, max) {
  const stops = paletteHex.map(hexToRgb);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const v = min + t * (max - min);
    const norm = Math.min(1, Math.max(0, (v - min) / (max - min)));
    const pos = norm * (stops.length - 1);
    const idx = Math.min(stops.length - 2, Math.floor(pos));
    const frac = pos - idx;
    const a = stops[idx];
    const b = stops[idx + 1];
    lut[i * 3] = Math.round(a[0] + (b[0] - a[0]) * frac);
    lut[i * 3 + 1] = Math.round(a[1] + (b[1] - a[1]) * frac);
    lut[i * 3 + 2] = Math.round(a[2] + (b[2] - a[2]) * frac);
  }
  return lut;
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return NaN;
  const pos = ((sortedValues.length - 1) * p) / 100;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedValues[lo];
  const frac = pos - lo;
  return sortedValues[lo] * (1 - frac) + sortedValues[hi] * frac;
}

/**
 * Cobertura "cómoda" (meta de calidad). El corte duro de aceptación es más bajo
 * (SOFT): con 1 sola pasada a menudo no se llega a 15% y aún así conviene mostrar
 * lo que Sentinel sí dio sobre el predio.
 */
const MIN_VALID_FRACTION = 0.15;
/** Piso para guardar imagen: mejor pasada disponible, aunque incompleta. */
const SOFT_MIN_VALID_FRACTION = 0.05;
const MIN_VALID_PIXELS = 20;

function measurePolygonCoverage(indexValues, width, height, polygon, bbox4326) {
  let polygonPixels = 0;
  let validPixels = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) continue;
      polygonPixels += 1;
      if (Number.isFinite(indexValues[i])) validPixels += 1;
    }
  }
  const validFraction = polygonPixels > 0 ? validPixels / polygonPixels : 0;
  return {
    polygon_pixels: polygonPixels,
    valid_pixels: validPixels,
    valid_fraction: validFraction,
    valid_pct: Math.round(validFraction * 1000) / 10
  };
}

function meanPolygonValid(indexValues, width, height, polygon, bbox4326) {
  let sum = 0;
  let count = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const v = indexValues[i];
      if (!Number.isFinite(v)) continue;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) continue;
      sum += v;
      count += 1;
    }
  }
  if (!count) return null;
  return Math.round((sum / count) * 1000) / 1000;
}

function hasAcceptableCoverage(coverage) {
  if (!coverage) return false;
  const frac = Number(coverage.valid_fraction);
  const px = Number(coverage.valid_pixels);
  return (
    Number.isFinite(px) &&
    px >= MIN_VALID_PIXELS &&
    Number.isFinite(frac) &&
    frac >= SOFT_MIN_VALID_FRACTION
  );
}

function assertEnoughValidCoverage(coverage, label) {
  if (hasAcceptableCoverage(coverage)) return;
  const pct = coverage && coverage.valid_pct != null ? coverage.valid_pct : 0;
  throw new Error(
    'Sin cobertura satelital útil en el predio' +
      (label ? ' (' + label + ')' : '') +
      ': solo ' +
      pct +
      '% de píxeles válidos tras filtrar nubes/sombra (mínimo ~' +
      Math.round(SOFT_MIN_VALID_FRACTION * 100) +
      '%). Probamos las pasadas Sentinel disponibles; ninguna quedó lo bastante despejada sobre este lote. Código: radar_low_coverage'
  );
}

function computeRelativeVis(indexValues, width, height, polygon, bbox4326, fallbackVis) {
  const values = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const v = indexValues[i];
      if (!Number.isFinite(v)) continue;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) continue;
      values.push(v);
    }
  }
  if (values.length < 20) {
    return { ...fallbackVis, relative: false, p10: fallbackVis.min, p90: fallbackVis.max };
  }
  values.sort((a, b) => a - b);
  const p10 = percentile(values, 10);
  const p90 = percentile(values, 90);
  const minRange = Math.max((fallbackVis.max - fallbackVis.min) * 0.08, 0.03);
  if (!Number.isFinite(p10) || !Number.isFinite(p90) || p90 - p10 < minRange) {
    const mid = Number.isFinite(p10) && Number.isFinite(p90) ? (p10 + p90) / 2 : (fallbackVis.min + fallbackVis.max) / 2;
    return {
      ...fallbackVis,
      min: mid - minRange / 2,
      max: mid + minRange / 2,
      relative: true,
      p10,
      p90
    };
  }
  return { ...fallbackVis, min: p10, max: p90, relative: true, p10, p90 };
}

function normalizeReflectance(val, noData) {
  if (val == null || !Number.isFinite(val) || val === noData) return NaN;
  if (val > 1.5) return val / 10000;
  return val;
}

async function readBandCog(url, bbox4326, outW, outH, opts) {
  const { fromUrl } = await import('geotiff');
  const tiff = await fromUrl(url, { allowFullFile: false, rangeChunkSize: 65536 });
  const image = await tiff.getImage();
  const useLonLat = !!(opts && opts.lonLat);
  const geo = useLonLat
    ? {
        minX: bbox4326[0],
        maxX: bbox4326[2],
        minY: bbox4326[1],
        maxY: bbox4326[3]
      }
    : geoBboxToUtm(bbox4326);
  const window = pixelWindowFromGeo(image, geo.minX, geo.minY, geo.maxX, geo.maxY);
  const noData = image.getGDALNoData ? image.getGDALNoData() : null;
  const rasters = await image.readRasters({
    window,
    width: outW,
    height: outH,
    resampleMethod: opts && opts.nearest ? 'nearest' : 'bilinear'
  });
  return { data: rasters[0], noData, width: outW, height: outH };
}

/** Pendiente relativa al predio: plano (crema/gris) → inclinado (café). Distinta del NDVI. */
const SLOPE_VIS = {
  min: 0,
  max: 15,
  palette: ['f8f5f0', 'e8e0d4', 'd4c4a8', 'c4a574', 'a67c52', '8b5e3c', '6b4423', '4a2f1a', '2d1b0e']
};

/** Altura relativa al predio: baja (azul) → media → alta (ámbar/café). Distinta de pendiente y NDVI. */
const ELEV_VIS = {
  min: 0,
  max: 100,
  palette: ['1e3a8a', '2563eb', '38bdf8', '7dd3fc', 'a7f3d0', 'fef3c7', 'fbbf24', 'ea580c', '9a3412']
};

function elevValue(val, noData) {
  if (val == null || !Number.isFinite(val)) return NaN;
  if (noData != null && Number.isFinite(noData) && val === noData) return NaN;
  // Nodata frecuentes en DEM
  if (val < -500 || val > 9000) return NaN;
  return val;
}

/**
 * Mosaic DEM tiles (EPSG:4326) into one elevation grid.
 */
async function readDemElevationMosaic(urls, bbox4326, outW, outH) {
  const elev = new Float32Array(outW * outH);
  elev.fill(NaN);
  let any = false;
  for (const url of urls) {
    let layer;
    try {
      layer = await readBandCog(url, bbox4326, outW, outH, { lonLat: true, nearest: false });
    } catch (err) {
      console.warn('DEM tile skip:', err && err.message ? err.message : err);
      continue;
    }
    const noData = layer.noData;
    for (let i = 0; i < elev.length; i++) {
      if (Number.isFinite(elev[i])) continue;
      const v = elevValue(layer.data[i], noData);
      if (Number.isFinite(v)) {
        elev[i] = v;
        any = true;
      }
    }
  }
  if (!any) {
    throw new Error('No se pudo leer elevación DEM sobre el predio');
  }
  return elev;
}

/**
 * Slope percent from elevation grid (meters). Geographic spacing converted to meters.
 */
function computeSlopePercent(elev, width, height, bbox4326) {
  const [west, south, east, north] = bbox4326;
  const midLat = (south + north) / 2;
  const metersPerDegLat = 110540;
  const metersPerDegLng = 111320 * Math.cos((midLat * Math.PI) / 180);
  const dyM = ((north - south) / Math.max(height, 1)) * metersPerDegLat;
  const dxM = ((east - west) / Math.max(width, 1)) * Math.max(metersPerDegLng, 1);
  const out = new Float32Array(width * height);
  out.fill(NaN);
  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const i = row * width + col;
      const z = elev[i];
      if (!Number.isFinite(z)) continue;
      const zl = elev[i - 1];
      const zr = elev[i + 1];
      const zu = elev[i - width];
      const zd = elev[i + width];
      if (![zl, zr, zu, zd].every(Number.isFinite)) continue;
      const dzdx = (zr - zl) / (2 * dxM);
      const dzdy = (zd - zu) / (2 * dyM);
      out[i] = Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100;
    }
  }
  // Fill edges from nearest interior
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      if (Number.isFinite(out[i])) continue;
      if (!Number.isFinite(elev[i])) continue;
      const rr = Math.min(height - 2, Math.max(1, row));
      const cc = Math.min(width - 2, Math.max(1, col));
      const v = out[rr * width + cc];
      if (Number.isFinite(v)) out[i] = v;
    }
  }
  return out;
}

function elevStatsInPolygon(elev, width, height, polygon, bbox4326) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let n = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const v = elev[i];
      if (!Number.isFinite(v)) continue;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
      sum += v;
      n += 1;
    }
  }
  if (!n) return { elev_min: null, elev_max: null, elev_mean: null };
  return {
    elev_min: Math.round(min * 10) / 10,
    elev_max: Math.round(max * 10) / 10,
    elev_mean: Math.round((sum / n) * 10) / 10
  };
}

/**
 * Render slope + elevation PNGs clipped to polygon from Copernicus DEM COG URLs.
 * @param {{ urls: string[], bbox4326: number[], polygon: number[][] }} dem
 */
async function renderDemSlopePng(dem, opts) {
  const maxDim = Math.min(Math.max(Number(opts?.maxDim) || 512, 128), 1024);
  const polygon = dem.polygon || null;
  const bbox4326 = dem.bbox4326;
  const urls = dem.urls || [];
  if (!urls.length) throw new Error('Sin URLs DEM');
  if (!bbox4326 || bbox4326.length < 4) throw new Error('BBox DEM inválido');

  const { outW, outH } = computeOutputSize(bbox4326, maxDim);
  const elev = await readDemElevationMosaic(urls, bbox4326, outW, outH);
  const slope = computeSlopePercent(elev, outW, outH, bbox4326);
  const elevStats = elevStatsInPolygon(elev, outW, outH, polygon, bbox4326);

  const elevFallback = {
    ...ELEV_VIS,
    min: elevStats.elev_min != null ? elevStats.elev_min : ELEV_VIS.min,
    max:
      elevStats.elev_max != null && elevStats.elev_max > (elevStats.elev_min || 0)
        ? elevStats.elev_max
        : (elevStats.elev_min || 0) + 10
  };

  const [slopeRendered, elevRendered] = await Promise.all([
    indexToPngBuffer(slope, SLOPE_VIS, outW, outH, polygon, bbox4326, {
      requireCoverage: false,
      label: 'Pendiente'
    }),
    indexToPngBuffer(elev, elevFallback, outW, outH, polygon, bbox4326, {
      requireCoverage: false,
      label: 'Altura'
    })
  ]);

  const slopeVals = [];
  for (let row = 0; row < outH; row++) {
    for (let col = 0; col < outW; col++) {
      const i = row * outW + col;
      const v = slope[i];
      if (!Number.isFinite(v)) continue;
      const [lat, lng] = pixelCenterLatLng(col, row, outW, outH, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) continue;
      slopeVals.push(v);
    }
  }
  slopeVals.sort((a, b) => a - b);
  const slopeMin = slopeVals.length ? Math.round(slopeVals[0] * 100) / 100 : null;
  const slopeMax = slopeVals.length
    ? Math.round(slopeVals[slopeVals.length - 1] * 100) / 100
    : null;
  const slopeMean =
    slopeVals.length > 0
      ? Math.round(
          (slopeVals.reduce((s, v) => s + v, 0) / slopeVals.length) * 100
        ) / 100
      : null;

  return {
    width: outW,
    height: outH,
    png: slopeRendered.buffer,
    elevPng: elevRendered.buffer,
    coverage: slopeRendered.coverage,
    vis: slopeRendered.vis,
    elev_vis: elevRendered.vis,
    slope_min: slopeMin,
    slope_max: slopeMax,
    slope_mean: slopeMean,
    elev_min: elevStats.elev_min,
    elev_max: elevStats.elev_max,
    elev_mean: elevStats.elev_mean,
    source: 'cop-dem-glo-30'
  };
}

function computeIndex(bandA, bandB, noDataA, noDataB, formula) {
  const n = bandA.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = normalizeReflectance(bandA[i], noDataA);
    const b = normalizeReflectance(bandB[i], noDataB);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a + b === 0) {
      out[i] = NaN;
      continue;
    }
    out[i] = formula(a, b);
  }
  return out;
}

function isSclBad(sclVal, noData) {
  if (sclVal == null || !Number.isFinite(sclVal) || sclVal === noData) return true;
  return SCL_BAD.has(Math.round(sclVal));
}

function applySclMask(indexValues, sclData, sclNoData) {
  const n = indexValues.length;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(indexValues[i])) continue;
    if (isSclBad(sclData[i], sclNoData)) {
      indexValues[i] = NaN;
    }
  }
  return indexValues;
}

function medianPerPixel(arrays) {
  if (!arrays.length) return new Float32Array(0);
  const n = arrays[0].length;
  const out = new Float32Array(n);
  const buf = [];
  for (let i = 0; i < n; i++) {
    buf.length = 0;
    for (let s = 0; s < arrays.length; s++) {
      const v = arrays[s][i];
      if (Number.isFinite(v)) buf.push(v);
    }
    if (!buf.length) {
      out[i] = NaN;
      continue;
    }
    buf.sort((a, b) => a - b);
    const mid = Math.floor(buf.length / 2);
    out[i] = buf.length % 2 === 0 ? (buf[mid - 1] + buf[mid]) / 2 : buf[mid];
  }
  return out;
}

function computeOutputSize(bbox4326, maxDim) {
  const [west, south, east, north] = bbox4326;
  const latSpan = Math.max(0.0001, north - south);
  const lngSpan = Math.max(0.0001, east - west);
  const aspect = lngSpan / latSpan;
  let outW;
  let outH;
  if (aspect >= 1) {
    outW = maxDim;
    outH = Math.max(64, Math.round(maxDim / aspect));
  } else {
    outH = maxDim;
    outW = Math.max(64, Math.round(maxDim * aspect));
  }
  return { outW, outH };
}

function reflectanceLayer(band, sclData, sclNoData) {
  const n = band.data.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (isSclBad(sclData[i], sclNoData)) {
      out[i] = NaN;
      continue;
    }
    out[i] = normalizeReflectance(band.data[i], band.noData);
  }
  return out;
}

async function readSceneIndices(bandUrls, bbox4326, outW, outH) {
  const [b02, b03, b04, b05, b08, b11, scl] = await Promise.all([
    readBandCog(bandUrls.b02, bbox4326, outW, outH),
    readBandCog(bandUrls.b03, bbox4326, outW, outH),
    readBandCog(bandUrls.b04, bbox4326, outW, outH),
    readBandCog(bandUrls.b05, bbox4326, outW, outH),
    readBandCog(bandUrls.b08, bbox4326, outW, outH),
    readBandCog(bandUrls.b11, bbox4326, outW, outH),
    readBandCog(bandUrls.scl, bbox4326, outW, outH, { nearest: true })
  ]);

  const ndvi = computeIndex(b08.data, b04.data, b08.noData, b04.noData, (nir, red) => (nir - red) / (nir + red));
  const ndmi = computeIndex(b08.data, b11.data, b08.noData, b11.noData, (nir, swir) => (nir - swir) / (nir + swir));
  const ndre = computeIndex(b08.data, b05.data, b08.noData, b05.noData, (nir, re) => (nir - re) / (nir + re));
  applySclMask(ndvi, scl.data, scl.noData);
  applySclMask(ndmi, scl.data, scl.noData);
  applySclMask(ndre, scl.data, scl.noData);

  const rgb = {
    r: reflectanceLayer(b04, scl.data, scl.noData),
    g: reflectanceLayer(b03, scl.data, scl.noData),
    b: reflectanceLayer(b02, scl.data, scl.noData)
  };
  return { ndvi, ndmi, ndre, rgb, scl };
}

function stretchChannelToByte(values, width, height, polygon, bbox4326) {
  const sample = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const v = values[i];
      if (!Number.isFinite(v)) continue;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) continue;
      sample.push(v);
    }
  }
  let lo = 0.02;
  let hi = 0.35;
  if (sample.length >= 20) {
    sample.sort((a, b) => a - b);
    lo = percentile(sample, 2);
    hi = percentile(sample, 98);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi - lo < 0.01) {
      lo = sample[0];
      hi = sample[sample.length - 1];
    }
  }
  if (hi - lo < 0.01) {
    hi = lo + 0.01;
  }
  const out = new Uint8Array(values.length);
  const span = hi - lo;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      out[i] = 0;
      continue;
    }
    const t = Math.min(1, Math.max(0, (v - lo) / span));
    // Ligera curva gamma para naturalidad en vegetación.
    out[i] = Math.round(Math.pow(t, 0.85) * 255);
  }
  return out;
}

async function rgbToPngBuffer(rLayer, gLayer, bLayer, width, height, polygon, bbox4326, opts) {
  const coverage = measurePolygonCoverage(rLayer, width, height, polygon, bbox4326);
  if (!opts || opts.requireCoverage !== false) {
    assertEnoughValidCoverage(coverage, (opts && opts.label) || 'RGB');
  }
  const rByte = stretchChannelToByte(rLayer, width, height, polygon, bbox4326);
  const gByte = stretchChannelToByte(gLayer, width, height, polygon, bbox4326);
  const bByte = stretchChannelToByte(bLayer, width, height, polygon, bbox4326);
  const rgba = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const o = i * 4;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) {
        rgba[o + 3] = 0;
        continue;
      }
      if (!Number.isFinite(rLayer[i]) || !Number.isFinite(gLayer[i]) || !Number.isFinite(bLayer[i])) {
        rgba[o + 3] = 0;
        continue;
      }
      rgba[o] = rByte[i];
      rgba[o + 1] = gByte[i];
      rgba[o + 2] = bByte[i];
      rgba[o + 3] = 235;
    }
  }
  const buffer = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { buffer, coverage, vis: { style: 'true_color_p2_p98', scale: 'predio' } };
}

function aggregateSclClassAtPixel(sclLayers, index) {
  const classes = [];
  for (const layer of sclLayers) {
    const raw = layer?.data?.[index];
    if (raw == null || !Number.isFinite(raw) || raw === layer.noData) continue;
    const value = Math.round(raw);
    if (!SCL_BAD.has(value)) return 0;
    classes.push(value);
  }
  if (!classes.length) return 1;
  if (classes.includes(9)) return 9;
  if (classes.includes(8)) return 8;
  if (classes.includes(10)) return 10;
  if (classes.includes(3)) return 3;
  if (classes.includes(11)) return 11;
  if (classes.includes(6)) return 6;
  return classes[0];
}

async function sclCloudMaskToPngBuffer(sclLayers, width, height, polygon, bbox4326) {
  const rgba = Buffer.alloc(width * height * 4);
  const stats = {
    polygon_pixels: 0,
    clear_pixels: 0,
    cloud_pixels: 0,
    shadow_pixels: 0,
    snow_pixels: 0,
    other_masked_pixels: 0
  };
  const colors = {
    3: [124, 58, 237, 205],
    6: [37, 99, 235, 165],
    8: [203, 213, 225, 205],
    9: [255, 255, 255, 230],
    10: [148, 163, 184, 190],
    11: [34, 211, 238, 210],
    other: [71, 85, 105, 180]
  };

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const o = i * 4;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) continue;
      stats.polygon_pixels += 1;
      const sclClass = aggregateSclClassAtPixel(sclLayers, i);
      if (sclClass === 0) {
        stats.clear_pixels += 1;
        continue;
      }
      let color = colors.other;
      if (sclClass === 8 || sclClass === 9 || sclClass === 10) {
        stats.cloud_pixels += 1;
        color = colors[sclClass];
      } else if (sclClass === 3) {
        stats.shadow_pixels += 1;
        color = colors[3];
      } else if (sclClass === 11) {
        stats.snow_pixels += 1;
        color = colors[11];
      } else {
        stats.other_masked_pixels += 1;
        color = colors[sclClass] || colors.other;
      }
      rgba[o] = color[0];
      rgba[o + 1] = color[1];
      rgba[o + 2] = color[2];
      rgba[o + 3] = color[3];
    }
  }

  const total = Math.max(stats.polygon_pixels, 1);
  stats.cloud_pct = Math.round((stats.cloud_pixels / total) * 1000) / 10;
  stats.shadow_pct = Math.round((stats.shadow_pixels / total) * 1000) / 10;
  stats.obscured_pct =
    Math.round(
      ((stats.cloud_pixels + stats.shadow_pixels + stats.snow_pixels + stats.other_masked_pixels) /
        total) *
        1000
    ) / 10;
  const buffer = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { buffer, stats };
}

async function renderRegionalSclCloudMaskPng(scene, bbox4326, opts) {
  if (!scene?.sclUrl) throw new Error('Escena regional sin URL SCL');
  if (!Array.isArray(bbox4326) || bbox4326.length !== 4) {
    throw new Error('Límites regionales inválidos');
  }
  const maxDim = Math.min(Math.max(Number(opts?.maxDim) || 768, 256), 1024);
  const { outW, outH } = computeOutputSize(bbox4326, maxDim);
  const scl = await readBandCog(scene.sclUrl, bbox4326, outW, outH, { nearest: true });
  const rendered = await sclCloudMaskToPngBuffer(
    [scl],
    outW,
    outH,
    null,
    bbox4326
  );
  return {
    width: outW,
    height: outH,
    png: rendered.buffer,
    stats: rendered.stats
  };
}

function pointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return true;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const latI = polygon[i][0];
    const lngI = polygon[i][1];
    const latJ = polygon[j][0];
    const lngJ = polygon[j][1];
    const crosses = latI > lat !== latJ > lat;
    const lngEdge = ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (crosses && lng < lngEdge) inside = !inside;
  }
  return inside;
}

function pixelCenterLatLng(col, row, width, height, bbox4326) {
  const [west, south, east, north] = bbox4326;
  const lng = west + ((col + 0.5) / width) * (east - west);
  const lat = north - ((row + 0.5) / height) * (north - south);
  return [lat, lng];
}

function colorizeIndex(indexValues, vis, width, height, polygon, bbox4326) {
  const lut = buildPaletteLUT(vis.palette, vis.min, vis.max);
  const rgba = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const o = i * 4;
      const [lat, lng] = pixelCenterLatLng(col, row, width, height, bbox4326);
      if (polygon && !pointInPolygon(lat, lng, polygon)) {
        rgba[o + 3] = 0;
        continue;
      }
      const v = indexValues[i];
      if (!Number.isFinite(v)) {
        rgba[o + 3] = 0;
        continue;
      }
      const clamped = Math.min(vis.max, Math.max(vis.min, v));
      const t = Math.round(((clamped - vis.min) / (vis.max - vis.min)) * 255);
      rgba[o] = lut[t * 3];
      rgba[o + 1] = lut[t * 3 + 1];
      rgba[o + 2] = lut[t * 3 + 2];
      rgba[o + 3] = 235;
    }
  }
  return rgba;
}

async function indexToPngBuffer(indexValues, vis, width, height, polygon, bbox4326, opts) {
  const coverage = measurePolygonCoverage(indexValues, width, height, polygon, bbox4326);
  if (!opts || opts.requireCoverage !== false) {
    assertEnoughValidCoverage(coverage, (opts && opts.label) || null);
  }
  const relativeVis = computeRelativeVis(indexValues, width, height, polygon, bbox4326, vis);
  const rgba = colorizeIndex(indexValues, relativeVis, width, height, polygon, bbox4326);
  const buffer = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { buffer, vis: relativeVis, coverage };
}

/**
 * Una escena (compatibilidad).
 */
async function renderNdviNdmiPngs(scene, opts) {
  return renderNdviNdmiCompositePngs(
    { scenes: [scene], bbox4326: scene.bbox4326, polygon: scene.polygon || null },
    opts
  );
}

/**
 * Mediana por píxel de varias escenas (SCL ya aplicado en cada una).
 * @param {{ scenes: object[], bbox4326: number[], polygon?: number[][] }} composite
 */
async function renderNdviNdmiCompositePngs(composite, opts) {
  const maxDim = Math.min(Math.max(Number(opts?.maxDim) || 2048, 256), 2048);
  const polygon = composite.polygon || null;
  const bbox4326 = composite.bbox4326;
  const scenes = composite.scenes || [];
  if (!scenes.length) {
    throw new Error('Sin escenas para renderizar');
  }

  const { outW, outH } = computeOutputSize(bbox4326, maxDim);
  const ndviLayers = [];
  const ndmiLayers = [];
  const ndreLayers = [];
  const rgbRLayers = [];
  const rgbGLayers = [];
  const rgbBLayers = [];
  const sclLayers = [];

  for (const scene of scenes) {
    if (!scene.bandUrls) {
      throw new Error('Escena sin bandUrls');
    }
    const { ndvi, ndmi, ndre, rgb, scl } = await readSceneIndices(scene.bandUrls, bbox4326, outW, outH);
    ndviLayers.push(ndvi);
    ndmiLayers.push(ndmi);
    ndreLayers.push(ndre);
    rgbRLayers.push(rgb.r);
    rgbGLayers.push(rgb.g);
    rgbBLayers.push(rgb.b);
    sclLayers.push(scl);
  }

  const ndvi = scenes.length === 1 ? ndviLayers[0] : medianPerPixel(ndviLayers);
  const ndmi = scenes.length === 1 ? ndmiLayers[0] : medianPerPixel(ndmiLayers);
  const ndre = scenes.length === 1 ? ndreLayers[0] : medianPerPixel(ndreLayers);
  const rgbR = scenes.length === 1 ? rgbRLayers[0] : medianPerPixel(rgbRLayers);
  const rgbG = scenes.length === 1 ? rgbGLayers[0] : medianPerPixel(rgbGLayers);
  const rgbB = scenes.length === 1 ? rgbBLayers[0] : medianPerPixel(rgbBLayers);

  // No cortar aquí por cobertura: el job elige la mejor pasada y aplica el piso suave.
  // Misma máscara SCL aplica a NDMI/NDRE/RGB.
  const ndviRendered = await indexToPngBuffer(ndvi, NDVI_VIS, outW, outH, polygon, bbox4326, {
    requireCoverage: false,
    label: 'NDVI'
  });
  const ndmiRendered = await indexToPngBuffer(ndmi, NDMI_VIS, outW, outH, polygon, bbox4326, {
    requireCoverage: false,
    label: 'NDMI'
  });
  const ndreRendered = await indexToPngBuffer(ndre, NDRE_VIS, outW, outH, polygon, bbox4326, {
    requireCoverage: false,
    label: 'NDRE'
  });
  const rgbRendered = await rgbToPngBuffer(rgbR, rgbG, rgbB, outW, outH, polygon, bbox4326, {
    requireCoverage: false,
    label: 'RGB'
  });
  const cloudMaskRendered = await sclCloudMaskToPngBuffer(
    sclLayers,
    outW,
    outH,
    polygon,
    bbox4326
  );

  const ndviMean = meanPolygonValid(ndvi, outW, outH, polygon, bbox4326);
  const ndmiMean = meanPolygonValid(ndmi, outW, outH, polygon, bbox4326);
  const ndreMean = meanPolygonValid(ndre, outW, outH, polygon, bbox4326);

  return {
    width: outW,
    height: outH,
    ndviPng: ndviRendered.buffer,
    ndmiPng: ndmiRendered.buffer,
    ndrePng: ndreRendered.buffer,
    rgbPng: rgbRendered.buffer,
    cloudMaskPng: cloudMaskRendered.buffer,
    cloudStats: cloudMaskRendered.stats,
    sceneCount: scenes.length,
    sclMasked: true,
    composite: scenes.length > 1,
    coverage: ndviRendered.coverage,
    ndviMean,
    ndmiMean,
    ndreMean,
    vis: {
      ndvi: ndviRendered.vis,
      ndmi: ndmiRendered.vis,
      ndre: ndreRendered.vis,
      rgb: rgbRendered.vis
    }
  };
}

module.exports = {
  renderNdviNdmiPngs,
  renderNdviNdmiCompositePngs,
  renderRegionalSclCloudMaskPng,
  renderDemSlopePng,
  measurePolygonCoverage,
  meanPolygonValid,
  hasAcceptableCoverage,
  assertEnoughValidCoverage,
  MIN_VALID_FRACTION,
  SOFT_MIN_VALID_FRACTION,
  MIN_VALID_PIXELS,
  NDVI_VIS,
  NDMI_VIS,
  NDRE_VIS,
  SLOPE_VIS,
  ELEV_VIS,
  SCL_BAD
};
