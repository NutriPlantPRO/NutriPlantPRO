/**
 * Aliases de labs MX/USA para densidad aparente (PDF extractor).
 * Caso típico: "¹Dens. Aparente  1.32  g/cm³" — el 1 es nota al pie, no el valor.
 * Otros labs: DA, Dap, peso volumétrico, Mg/m³ (= g/cm³), kg/m³, lb/ft³.
 */
'use strict';

var BD_KEY_RE = /^(bulkdensity|bulkdens|densidadaparente|densaparente|densidada|densap|pesovolumetrico|pesovolumetrico|apparentdensity|drybulkdensity|dap|bd|pb|rhob)$/;
var BD_LABEL_RE = /dens\.?\s*aparente|densidad\s+aparente|densidad\s+ap(?:arente|\.)?|dens\.?\s*ap\b|peso\s+volum[eé]trico|densidad\s+volum[eé]trica|densidad\s+de\s+bulto|bulk\s*dens(?:ity)?|apparent\s+density|dry\s+bulk/i;
var BD_UNIT_RE = /g\s*[\/.]?\s*cm(?:\^?3|³)|gr?\.?\s*[\/.]?\s*cm(?:\^?3|³)|g\s*cm\s*[-−]?\s*(?:\^?3|³)|g\s*\/?\s*cc|mg\s*[\/.]?\s*m(?:\^?3|³)|t\s*[\/.]?\s*m(?:\^?3|³)|kg\s*[\/.]?\s*m(?:\^?3|³)|lb\s*[\/.]?\s*ft(?:\^?3|³)|pcf/i;
var NOT_BD_UNIT_RE = /cm\s*\/?\s*h(?:r|our)?|mm\s*\/?\s*h|in\s*\/?\s*h|%/i;

function asStr(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  var s = String(v).trim();
  if (!s || /^n\/?a$/i.test(s) || s === '-' || s === '—') return '';
  return s;
}

function toNum(raw) {
  var s = asStr(raw).replace(',', '.');
  var n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function looksPlausibleGcm3(n) {
  return Number.isFinite(n) && n >= 0.6 && n <= 2.2;
}

/** Rango agrícola habitual (~0.8–1.3). Fuera de ahí el extractor pone 1 y el usuario lo edita. */
var TYPICAL_BD_MIN = 0.8;
var TYPICAL_BD_MAX = 1.4;
var DEFAULT_BD = '1';

function looksTypicalExtractedGcm3(n) {
  return Number.isFinite(n) && n >= TYPICAL_BD_MIN && n <= TYPICAL_BD_MAX;
}

function finalizeBulkDensity(raw) {
  var n = toNum(raw);
  if (looksTypicalExtractedGcm3(n)) return keepNumText(raw, n);
  return DEFAULT_BD;
}

function looksLikeFootnote(raw) {
  var s = asStr(raw);
  return /^(1|2|3)$/.test(s);
}

function canonBdUnit(raw) {
  var u = String(raw || '')
    .toLowerCase()
    .replace(/³/g, '3')
    .replace(/⁻/g, '-')
    .replace(/\s+/g, '')
    .replace(/\^/g, '');
  if (/g\/?cm3|g\/?cc|gcm-3|gr\/?cm3/.test(u)) return 'g/cm3';
  if (/mg\/?m3|t\/?m3/.test(u)) return 'g/cm3';
  if (/kg\/?m3|kgm-3/.test(u)) return 'kg/m3';
  if (/lb\/?ft3|pcf/.test(u)) return 'lb/ft3';
  return '';
}

function keepNumText(raw, n) {
  var m = asStr(raw).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (m && Math.abs(parseFloat(m[0]) - n) < 1e-9) return m[0];
  return String(n);
}

function candidateToGcm3(numStr, unitStr) {
  var n = toNum(numStr);
  if (!Number.isFinite(n) || looksLikeFootnote(numStr)) return '';
  if (NOT_BD_UNIT_RE.test(String(unitStr || ''))) return '';
  var unit = canonBdUnit(unitStr);
  if (unit === 'kg/m3' && n >= 600 && n <= 2200) return String(round3(n / 1000));
  if (unit === 'lb/ft3' && n >= 35 && n <= 140) return String(round3(n * 0.016018463));
  if (unit === 'g/cm3' && looksPlausibleGcm3(n)) return keepNumText(numStr, n);
  if (!unit && looksPlausibleGcm3(n)) return keepNumText(numStr, n);
  if (!unit && n >= 600 && n <= 2200) return String(round3(n / 1000));
  return '';
}

function salvageBulkDensityFromText(text) {
  var blob = String(text || '');
  if (!blob) return '';
  var labelRe = new RegExp(BD_LABEL_RE.source, 'ig');
  var found = '';
  var m;
  while ((m = labelRe.exec(blob))) {
    var window = blob.slice(m.index, m.index + 96);
    if (NOT_BD_UNIT_RE.test(window) && !BD_UNIT_RE.test(window)) continue;
    var numRe = /(\d+(?:[.,]\d+)?)\s*([a-zA-Zµμmgktlbpcf\/.\s^³3-]{0,18})/g;
    var nm;
    var withUnit = '';
    var bare = '';
    while ((nm = numRe.exec(window))) {
      if (looksLikeFootnote(nm[1])) continue;
      var after = String(nm[2] || '');
      if (NOT_BD_UNIT_RE.test(after)) continue;
      var got = candidateToGcm3(nm[1], after);
      if (!got) continue;
      if (canonBdUnit(after)) {
        withUnit = got;
        break;
      }
      if (!bare) bare = got;
    }
    found = withUnit || bare;
    if (found) return found;
  }
  var unitFirst = blob.match(
    /(?:dens\.?\s*aparente|densidad\s+aparente|bulk\s*dens(?:ity)?)[^\d]{0,40}(\d+(?:[.,]\d+)?)\s*(?:g\s*[\/.]?\s*cm|g\s*\/?\s*cc|mg\s*[\/.]?\s*m)/i
  );
  if (unitFirst) {
    var fromUnit = candidateToGcm3(unitFirst[1], unitFirst[0]);
    if (fromUnit) return fromUnit;
  }
  return '';
}

function pickFromObject(obj, allowShortDa) {
  if (!obj || typeof obj !== 'object') return '';
  var direct = [
    obj.bulkDensity,
    obj.bulk_density,
    obj.bulkdensity,
    obj.bulkDens,
    obj.bd,
    obj.BD,
    obj.densidadAparente,
    obj.densidad_aparente,
    obj.densAparente,
    obj.dens_aparente,
    obj.densAp,
    obj.pesoVolumetrico,
    obj.peso_volumetrico,
    obj.apparentDensity,
    obj.aparente
  ];
  if (allowShortDa) direct.push(obj.DA, obj.da, obj.dap, obj.Dap, obj.Dapg, obj.Pb, obj.pb);
  var i;
  for (i = 0; i < direct.length; i++) {
    var s = asStr(direct[i]);
    if (!s || looksLikeFootnote(s)) continue;
    var parsed = candidateToGcm3(s, s);
    if (parsed) return parsed;
    if (looksPlausibleGcm3(toNum(s))) return s;
  }
  var keys = Object.keys(obj);
  for (i = 0; i < keys.length; i++) {
    var nk = keys[i].toLowerCase().replace(/[_\s.-]/g, '');
    if (BD_KEY_RE.test(nk) || (allowShortDa && nk === 'da')) {
      s = asStr(obj[keys[i]]);
      if (!s || looksLikeFootnote(s)) continue;
      parsed = candidateToGcm3(s, s);
      if (parsed) return parsed;
      if (looksPlausibleGcm3(toNum(s))) return s;
    }
  }
  return '';
}

function resolveBulkDensity(physical, rawRoot, extraText) {
  var phys = physical && typeof physical === 'object' ? physical : {};
  var raw = rawRoot && typeof rawRoot === 'object' ? rawRoot : {};
  var current = asStr(phys.bulkDensity);
  var currentN = toNum(current);
  if (current && !looksLikeFootnote(current) && looksPlausibleGcm3(currentN)) {
    var fromCurrent = candidateToGcm3(current, current);
    return fromCurrent || current;
  }
  var picked = pickFromObject(phys, true) || pickFromObject(raw, false);
  if (picked && looksPlausibleGcm3(toNum(picked))) return picked;
  var blob = [
    extraText || '',
    asStr(raw.notes),
    asStr(raw.ocrText),
    asStr(raw.text),
    JSON.stringify(phys),
    JSON.stringify(raw)
  ].join('\n');
  return salvageBulkDensityFromText(blob);
}

module.exports = {
  salvageBulkDensityFromText: salvageBulkDensityFromText,
  resolveBulkDensity: resolveBulkDensity,
  looksPlausibleGcm3: looksPlausibleGcm3,
  looksTypicalExtractedGcm3: looksTypicalExtractedGcm3,
  finalizeBulkDensity: finalizeBulkDensity
};
