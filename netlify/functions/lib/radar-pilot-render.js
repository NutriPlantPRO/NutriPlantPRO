/**
 * NDVI / NDMI desde bandas Sentinel-2 + paletas NutriPlant (Radar actual).
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
  /** Tiepoint Sentinel-2 = esquina noroeste; filas crecen hacia el sur. */
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

function normalizeReflectance(val, noData) {
  if (val == null || !Number.isFinite(val) || val === noData) return NaN;
  if (val > 1.5) return val / 10000;
  return val;
}

async function readBandCog(url, bbox4326, outW, outH) {
  const { fromUrl } = await import('geotiff');
  const tiff = await fromUrl(url, { allowFullFile: false, rangeChunkSize: 65536 });
  const image = await tiff.getImage();
  const geo = geoBboxToUtm(bbox4326);
  const window = pixelWindowFromGeo(image, geo.minX, geo.minY, geo.maxX, geo.maxY);
  const noData = image.getGDALNoData ? image.getGDALNoData() : null;
  const rasters = await image.readRasters({
    window,
    width: outW,
    height: outH,
    resampleMethod: 'bilinear'
  });
  return { data: rasters[0], noData, width: outW, height: outH };
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

async function indexToPngBuffer(indexValues, vis, width, height, polygon, bbox4326) {
  const rgba = colorizeIndex(indexValues, vis, width, height, polygon, bbox4326);
  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * @param {{ bandUrls: object, bbox4326: number[], polygon?: number[][] }} scene
 * @param {{ maxDim?: number }} opts
 */
async function renderNdviNdmiPngs(scene, opts) {
  const maxDim = Math.min(Math.max(Number(opts?.maxDim) || 1024, 256), 2048);
  const polygon = scene.polygon || null;
  const [west, south, east, north] = scene.bbox4326;
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

  const [b04, b08, b11] = await Promise.all([
    readBandCog(scene.bandUrls.b04, scene.bbox4326, outW, outH),
    readBandCog(scene.bandUrls.b08, scene.bbox4326, outW, outH),
    readBandCog(scene.bandUrls.b11, scene.bbox4326, outW, outH)
  ]);

  const ndvi = computeIndex(b08.data, b04.data, b08.noData, b04.noData, (nir, red) => (nir - red) / (nir + red));
  const ndmi = computeIndex(b08.data, b11.data, b08.noData, b11.noData, (nir, swir) => (nir - swir) / (nir + swir));

  const [ndviPng, ndmiPng] = await Promise.all([
    indexToPngBuffer(ndvi, NDVI_VIS, outW, outH, polygon, scene.bbox4326),
    indexToPngBuffer(ndmi, NDMI_VIS, outW, outH, polygon, scene.bbox4326)
  ]);

  return {
    width: outW,
    height: outH,
    ndviPng,
    ndmiPng,
    vis: { ndvi: NDVI_VIS, ndmi: NDMI_VIS }
  };
}

module.exports = {
  renderNdviNdmiPngs,
  NDVI_VIS,
  NDMI_VIS
};
