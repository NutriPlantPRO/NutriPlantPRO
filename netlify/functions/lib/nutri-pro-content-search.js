'use strict';

const STOPWORDS_ES = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'de',
  'del',
  'en',
  'y',
  'o',
  'que',
  'como',
  'mi',
  'mis',
  'tu',
  'sus',
  'su',
  'por',
  'para',
  'con',
  'sin',
  'hay',
  'tiene',
  'tengo',
  'ese',
  'esa',
  'esto',
  'al',
  'se',
  'es',
  'son',
  'a',
  'the',
  'in',
  'on',
  'cuanto',
  'cuanta',
  'donde',
  'cual',
  'cuales'
]);

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForSearch(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** @returns {string[]} */
function tokenizeQuery(q) {
  const parts = normalizeForSearch(q).split(/[^a-z0-9]+/).filter(Boolean);
  const out = [];
  const seen = new Set();
  parts.forEach((t) => {
    if (t.length < 2 || STOPWORDS_ES.has(t) || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  });
  return out;
}

function bestDbFilterTerm(terms, qRaw) {
  if (terms.length) return terms.slice().sort((a, b) => b.length - a.length)[0];
  const q = normalizeForSearch(qRaw).trim();
  return q.length >= 2 ? q : '';
}

/**
 * @returns {{ term: string, position: number, snippet: string }[]}
 */
function extractSnippets(text, terms, opts) {
  opts = opts || {};
  const maxSnippets = Math.min(opts.maxSnippets || 3, 6);
  const radius = opts.radius || 110;
  const maxSnippetLen = opts.maxSnippetLen || 320;
  const hay = String(text || '');
  const hayLc = normalizeForSearch(hay);
  const hits = [];

  (terms.length ? terms : [hayLc.slice(0, 20)]).forEach((term) => {
    let start = 0;
    while (hits.length < maxSnippets * 3) {
      const idx = hayLc.indexOf(term, start);
      if (idx < 0) break;
      const from = Math.max(0, idx - radius);
      const to = Math.min(hay.length, idx + term.length + radius);
      let snippet = hay.slice(from, to).replace(/\s+/g, ' ').trim();
      if (from > 0) snippet = '…' + snippet;
      if (to < hay.length) snippet = snippet + '…';
      hits.push({ term, position: idx, snippet: snippet.slice(0, maxSnippetLen) });
      start = idx + Math.max(term.length, 1);
    }
  });

  hits.sort((a, b) => a.position - b.position);
  const unique = [];
  const seenBucket = new Set();
  hits.forEach((h) => {
    const bucket = Math.floor(h.position / 90);
    if (seenBucket.has(bucket)) return;
    seenBucket.add(bucket);
    unique.push(h);
  });
  return unique.slice(0, maxSnippets);
}

function countTermOccurrences(textLc, term) {
  if (!term) return 0;
  const re = new RegExp(escapeRegExp(term), 'g');
  return (String(textLc || '').match(re) || []).length;
}

/**
 * @param {{ title?: string, original_name?: string, short_path?: string, description?: string, text_plain?: string }} meta
 */
function scoreNutriContentMatch(meta, terms, qRaw) {
  const q = normalizeForSearch(qRaw);
  const titleHay = normalizeForSearch(
    [meta.title, meta.original_name, meta.short_path, meta.description].filter(Boolean).join(' ')
  );
  const textHay = normalizeForSearch(meta.text_plain || '');
  let score = 0;
  const matchedTerms = [];

  if (q && titleHay.includes(q)) score += 24;
  if (q && textHay.includes(q)) score += 14;

  terms.forEach((t) => {
    if (titleHay.includes(t)) {
      score += 9;
      matchedTerms.push(t);
    }
    const n = countTermOccurrences(textHay, t);
    if (n > 0) {
      score += Math.min(n, 12) * 2;
      if (!matchedTerms.includes(t)) matchedTerms.push(t);
    }
  });

  if (terms.length > 1 && matchedTerms.length === terms.length) score += 10;
  else if (matchedTerms.length >= 2) score += 5;

  return { score, matched_terms: matchedTerms, matched_in_title: !!(q && titleHay.includes(q)), matched_in_content: !!(q && textHay.includes(q)) };
}

function rankNutriHits(hits, terms, qRaw, limit) {
  return (hits || [])
    .map((h) => {
      const scoring = scoreNutriContentMatch(h, terms, qRaw);
      return { ...h, ...scoring };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Coincidencia flexible: no exige la frase exacta.
 * Con varias palabras basta ~50% de términos (p. ej. «Juan López» en «Juan Carlos Pérez López»).
 * @param {string} hayStack — texto donde buscar (se normaliza)
 * @param {string} qRaw — lo que recuerda el usuario
 * @param {{ titleHay?: string }} [opts] — bonus si coincide en título
 */
function scorePartialTextMatch(hayStack, qRaw, opts) {
  opts = opts || {};
  const hay = normalizeForSearch(hayStack);
  const qNorm = normalizeForSearch(qRaw);
  if (!qNorm) return { matched: true, score: 0, matched_terms: [] };
  if (hay.includes(qNorm)) {
    return { matched: true, score: 28, matched_terms: tokenizeQuery(qRaw).length ? tokenizeQuery(qRaw) : [qNorm] };
  }

  const terms = tokenizeQuery(qRaw);
  if (!terms.length) {
    const ok = hay.includes(qNorm);
    return { matched: ok, score: ok ? 10 : 0, matched_terms: ok ? [qNorm] : [] };
  }

  const titleHay = opts.titleHay ? normalizeForSearch(opts.titleHay) : '';
  let score = 0;
  const matchedTerms = [];

  terms.forEach((t) => {
    if (titleHay && titleHay.includes(t)) {
      score += t.length >= 4 ? 14 : 11;
      matchedTerms.push(t);
    } else if (hay.includes(t)) {
      score += t.length >= 4 ? 9 : 6;
      matchedTerms.push(t);
    }
  });

  if (!matchedTerms.length) return { matched: false, score: 0, matched_terms: [] };

  const need =
    terms.length === 1 ? 1 : Math.max(1, Math.ceil(terms.length * 0.5));
  const matched = matchedTerms.length >= need;
  if (matched && matchedTerms.length === terms.length) score += 12;
  else if (matched && matchedTerms.length >= 2) score += 4;

  return { matched, score, matched_terms: matchedTerms };
}

function partialTextMatches(hayStack, qRaw, opts) {
  return scorePartialTextMatch(hayStack, qRaw, opts).matched;
}

module.exports = {
  tokenizeQuery,
  bestDbFilterTerm,
  extractSnippets,
  scoreNutriContentMatch,
  rankNutriHits,
  normalizeForSearch,
  scorePartialTextMatch,
  partialTextMatches
};
