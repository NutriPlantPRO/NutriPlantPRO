'use strict';

const LEGACY_OFFICE = new Set(['doc', 'ppt']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'svg']);

function extOf(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

function stripRtfBasic(rtf) {
  return String(rtf || '')
    .replace(/\\par[d]?/gi, '\n')
    .replace(/\\[a-z]+\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function xmlTextOnly(xml) {
  return String(xml || '')
    .replace(/<text:line-break\/>/g, '\n')
    .replace(/<text:s[^>]*\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractPdf(buffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return { format_kind: 'pdf', text: data.text || '', meta: { pages: data.numpages || null } };
}

async function extractDocx(buffer) {
  const mammoth = require('mammoth');
  const res = await mammoth.extractRawText({ buffer });
  return { format_kind: 'docx', text: res.value || '', meta: { messages: (res.messages || []).length } };
}

async function extractSpreadsheet(buffer, ext) {
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const sheets = [];
  const parts = [];
  (wb.SheetNames || []).forEach((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    sheets.push({ name, rows_approx: csv.split('\n').length });
    parts.push('## Hoja: ' + name + '\n' + csv);
  });
  return {
    format_kind: ext === 'csv' ? 'csv' : ext === 'xls' ? 'xls' : 'xlsx',
    text: parts.join('\n\n'),
    meta: { sheets }
  };
}

async function extractPptx(buffer) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files)
    .filter((n) => /ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt((a.match(/slide(\d+)/i) || [])[1], 10) || 0;
      const nb = parseInt((b.match(/slide(\d+)/i) || [])[1], 10) || 0;
      return na - nb;
    });
  const slides = [];
  for (const name of names) {
    const xml = await zip.file(name).async('string');
    const bits = [];
    const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml))) {
      if (m[1]) bits.push(m[1]);
    }
    const slideText = bits.join(' ').trim();
    if (slideText) slides.push(slideText);
  }
  return {
    format_kind: 'pptx',
    text: slides.map((t, i) => '## Diapositiva ' + (i + 1) + '\n' + t).join('\n\n'),
    meta: { slides: names.length }
  };
}

async function extractOdf(buffer, kind) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('content.xml');
  if (!entry) throw new Error('content.xml no encontrado en ' + kind);
  const xml = await entry.async('string');
  return { format_kind: kind, text: xmlTextOnly(xml), meta: {} };
}

async function extractPlain(buffer, ext) {
  let text = buffer.toString('utf8');
  if (ext === 'rtf') text = stripRtfBasic(text);
  return { format_kind: ext, text, meta: {} };
}

/**
 * Extrae texto de un buffer según nombre/MIME.
 * @returns {{ status, format_kind?, text_plain?, meta_json?, error_message? }}
 */
async function extractNutriProText(buffer, fileName, mimeType) {
  const ext = extOf(fileName);
  if (!buffer || !buffer.length) {
    return { status: 'error', error_message: 'Archivo vacío.', format_kind: ext || 'unknown' };
  }
  if (LEGACY_OFFICE.has(ext)) {
    return {
      status: 'skipped',
      error_message: 'Formato Office antiguo (.doc/.ppt). Guarda como .docx/.pptx para indexar texto.',
      format_kind: ext
    };
  }
  if (IMAGE_EXT.has(ext) || (mimeType && /^image\//i.test(mimeType))) {
    return {
      status: 'skipped',
      error_message: 'Imagen: el texto se indexará con OCR en una fase posterior.',
      format_kind: 'image'
    };
  }

  try {
    let result;
    if (ext === 'pdf' || (mimeType && /pdf/i.test(mimeType))) {
      result = await extractPdf(buffer);
    } else if (ext === 'docx') {
      result = await extractDocx(buffer);
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      result = await extractSpreadsheet(buffer, ext);
    } else if (ext === 'ods') {
      result = await extractOdf(buffer, 'ods');
    } else if (ext === 'pptx') {
      result = await extractPptx(buffer);
    } else if (ext === 'odt' || ext === 'odp') {
      result = await extractOdf(buffer, ext);
    } else if (ext === 'txt' || ext === 'rtf' || ext === 'md') {
      result = await extractPlain(buffer, ext === 'md' ? 'md' : ext);
    } else {
      return {
        status: 'skipped',
        error_message: 'Formato no soportado para extracción automática: .' + (ext || '?'),
        format_kind: ext || 'unknown'
      };
    }

    const plain = String(result.text || '');
    const charCount = plain.length;
    if (!charCount) {
      return {
        status: 'skipped',
        error_message: 'No se encontró texto extraíble (puede ser escaneado o solo imágenes).',
        format_kind: result.format_kind,
        meta_json: { ...result.meta, char_count: 0 }
      };
    }

    return {
      status: 'done',
      format_kind: result.format_kind,
      text_plain: plain,
      meta_json: { ...result.meta, char_count: charCount, truncated: false }
    };
  } catch (err) {
    return {
      status: 'error',
      error_message: (err && err.message) || String(err),
      format_kind: ext || 'unknown'
    };
  }
}

module.exports = { extractNutriProText, extOf };
