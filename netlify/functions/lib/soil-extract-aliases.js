/**
 * Aliases de labs MX/USA para densidad aparente (PDF extractor).
 * Caso típico: "¹Dens. Aparente  1.32  g/cm³" — el 1 es nota al pie, no el valor.
 */
'use strict';

var BD_KEY_RE = /^(bulkdensity|densidadaparente|densaparente|densidada|dap|bd)$/;
var BD_LABEL_RE = /dens\.?\s*aparente|densidad\s+aparente|bulk\s*density/i;
var BD_VALUE_RE = /(?:dens\.?\s*aparente|densidad\s+aparente|bulk\s*density)[^\d]{0,48}(\d+(?:[.,]\d+)?)\s*(?:g\s*[\/.]?\s*cm|g\s*cm|gcm3)?/i;

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

function looksPlausibleGcm3(n) {
  return Number.isFinite(n) && n >= 0.6 && n <= 2.2;
}

function looksLikeFootnote(raw) {
  var s = asStr(raw);
  return /^(1|2|3)$/.test(s);
}

function salvageBulkDensityFromText(text) {
  var blob = String(text || '');
  if (!BD_LABEL_RE.test(blob)) return '';
  var m = blob.match(BD_VALUE_RE);
  if (!m) return '';
  var n = toNum(m[1]);
  if (!looksPlausibleGcm3(n) || looksLikeFootnote(m[1])) return '';
  return String(n);
}

function pickFromObject(obj, allowShortDa) {
  if (!obj || typeof obj !== 'object') return '';
  var direct = [
    obj.bulkDensity,
    obj.bulk_density,
    obj.bulkdensity,
    obj.bd,
    obj.BD,
    obj.densidadAparente,
    obj.densidad_aparente,
    obj.densAparente,
    obj.dens_aparente,
    obj.aparente
  ];
  if (allowShortDa) direct.push(obj.DA, obj.da, obj.dap, obj.Dap, obj.Dapg);
  var i;
  for (i = 0; i < direct.length; i++) {
    var s = asStr(direct[i]);
    if (s && !looksLikeFootnote(s)) return s;
  }
  var keys = Object.keys(obj);
  for (i = 0; i < keys.length; i++) {
    var nk = keys[i].toLowerCase().replace(/[_\s.-]/g, '');
    if (BD_KEY_RE.test(nk) || (allowShortDa && nk === 'da')) {
      s = asStr(obj[keys[i]]);
      if (s && !looksLikeFootnote(s)) return s;
    }
  }
  return '';
}

function resolveBulkDensity(physical, rawRoot, extraText) {
  var phys = physical && typeof physical === 'object' ? physical : {};
  var raw = rawRoot && typeof rawRoot === 'object' ? rawRoot : {};
  var current = asStr(phys.bulkDensity);
  if (current && !looksLikeFootnote(current) && looksPlausibleGcm3(toNum(current))) {
    return current;
  }
  var picked = pickFromObject(phys, true) || pickFromObject(raw, false);
  if (picked && looksPlausibleGcm3(toNum(picked))) return picked;
  var blob = [
    extraText || '',
    asStr(raw.notes),
    JSON.stringify(phys),
    JSON.stringify(raw)
  ].join('\n');
  return salvageBulkDensityFromText(blob);
}

module.exports = {
  salvageBulkDensityFromText: salvageBulkDensityFromText,
  resolveBulkDensity: resolveBulkDensity,
  looksPlausibleGcm3: looksPlausibleGcm3
};
