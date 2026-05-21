#!/usr/bin/env node
/**
 * Fase 3 SEO: inyecta JSON-LD Article / FAQPage en capítulos del manual.
 * Uso: node scripts/inject-manual-jsonld.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = path.join(ROOT, 'manual-tecnico/capitulos');
const PUB = {
  '@type': 'Organization',
  name: 'NutriPlant PRO',
  url: 'https://nutriplantpro.com',
  logo: 'https://nutriplantpro.com/assets/NutriPlant_PRO_blue.png',
};
const AUTHOR = {
  '@type': 'Person',
  name: 'Jesús Avila Mendoza',
  url: 'https://nutriplantpro.com/manual-tecnico/autoria.html',
};

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function escapeJson(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function articleBlock({ title, description, url, datePublished }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    inLanguage: 'es',
    datePublished: datePublished || '2026-05-01',
    dateModified: '2026-05-21',
    author: AUTHOR,
    publisher: PUB,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Manual Técnico NutriPlant PRO',
      url: 'https://nutriplantpro.com/manual-tecnico/index.html',
    },
  };
}

function faqBlock({ title, description, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: title,
    description,
    url,
    inLanguage: 'es',
    author: AUTHOR,
    publisher: PUB,
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Por qué los % iónicos no siempre suman 100 % en NutriPlant?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Porque N-P-S y K-Ca-Mg usan denominadores distintos en triángulos; Cl⁻ y N-NH₄⁺ se muestran aparte con su propio %.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué triángulos iónicos sí suman 100 %?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Aniones: NO₃ + P + SO₄. Cationes: K + Ca + Mg. Cada grupo suma 100 % dentro de su triángulo.',
        },
      },
      {
        '@type': 'Question',
        name: '¿En qué pantallas de NutriPlant aplica esta regla?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Hidroponía (solución y fertilizantes), fertirriego (gráficas iónicas) y enmiendas/suelo (% saturación CIC, concepto distinto).',
        },
      },
    ],
  };
}

function toScriptTag(obj) {
  return `  <script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n  </script>\n`;
}

function inject(filePath, block) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('application/ld+json')) {
    html = html.replace(
      /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/,
      '\n'
    );
  }
  const tag = toScriptTag(block);
  if (!html.includes('</head>')) {
    console.warn('skip (no head):', filePath);
    return false;
  }
  html = html.replace('</head>', `${tag}</head>`);
  fs.writeFileSync(filePath, html);
  return true;
}

let n = 0;
for (const file of fs.readdirSync(CAP).filter((f) => f.endsWith('.html')).sort()) {
  const fp = path.join(CAP, file);
  const html = fs.readFileSync(fp, 'utf8');
  const title = extract(html, /<title>([^<]+)<\/title>/i).replace(
    /\s*—\s*Manual NutriPlant PRO\s*$/i,
    ''
  );
  const description = extract(html, /<meta name="description" content="([^"]*)"/i);
  const url = extract(html, /<link rel="canonical" href="([^"]+)"/i);
  if (!title || !url) {
    console.warn('missing meta:', file);
    continue;
  }
  const block =
    file === 'faq-porcentajes-no-suman-100.html'
      ? faqBlock({ title, description, url })
      : articleBlock({ title, description, url });
  if (inject(fp, block)) {
    n++;
    console.log('ok', file);
  }
}

// autoria.html
const autoriaPath = path.join(ROOT, 'manual-tecnico/autoria.html');
let autoriaHtml = fs.readFileSync(autoriaPath, 'utf8');
const autoriaBlock = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  name: 'Autoría técnica — NutriPlant PRO',
  url: 'https://nutriplantpro.com/manual-tecnico/autoria.html',
  inLanguage: 'es',
  mainEntity: {
    '@type': 'Person',
    name: 'Jesús Avila Mendoza',
    jobTitle: 'Agrónomo · Nutrición vegetal',
    worksFor: PUB,
    url: 'https://nutriplantpro.com/manual-tecnico/autoria.html',
  },
};
inject(autoriaPath, autoriaBlock);

// index — CollectionPage + ItemList
const indexPath = path.join(ROOT, 'manual-tecnico/index.html');
const chapters = fs
  .readdirSync(CAP)
  .filter((f) => f.endsWith('.html'))
  .map((f) => {
    const html = fs.readFileSync(path.join(CAP, f), 'utf8');
    const title = extract(html, /<title>([^<]+)<\/title>/i).replace(
      /\s*—\s*Manual NutriPlant PRO\s*$/i,
      ''
    );
    const url = extract(html, /<link rel="canonical" href="([^"]+)"/i);
    return { title, url };
  });

const indexBlock = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Manual Técnico NutriPlant PRO',
  description:
    'Biblioteca pública de metodología agronómica: análisis de suelo, fertirriego, enmiendas, nutrición vegetal.',
  url: 'https://nutriplantpro.com/manual-tecnico/index.html',
  inLanguage: 'es',
  dateModified: '2026-05-21',
  publisher: PUB,
  author: AUTHOR,
  hasPart: chapters.map((c) => ({
    '@type': 'Article',
    name: c.title,
    url: c.url,
  })),
};
inject(indexPath, indexBlock);

console.log(`\nCapítulos actualizados: ${n}`);
