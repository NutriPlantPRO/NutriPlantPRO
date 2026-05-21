/**
 * Manual Técnico NutriPlant PRO — fuente pública en la web.
 * Action: manual_tecnico_catalog. Alineado con manual-tecnico/ y docs/MANUAL-TECNICO-CONOCIMIENTO-GPT.md
 */
const BASE = 'https://nutriplantpro.com/manual-tecnico';

module.exports = {
  version: '2026-05-21',
  scope:
    'Biblioteca HTML pública, sin cuenta. Indexable (SEO/GEO). Metodología alineada con la app NutriPlant PRO.',
  publicUrls: {
    index: `${BASE}/`,
    llms: `${BASE}/llms.txt`,
    siteLlms: 'https://nutriplantpro.com/llms.txt',
    login: 'https://nutriplantpro.com/login.html'
  },
  gptRules: [
    'Fuente pública: cita la URL del capítulo cuando expliques metodología NutriPlant a terceros o en contenido web.',
    'No sustituye project_analyses (datos reales del suscriptor en nube).',
    'No sustituye calculadoras gratis (localStorage); el manual documenta criterio, no valores del usuario.',
    'Si el GPT tiene navegación web, puede leer las URLs publicadas; si no, usa Knowledge + manual_tecnico_catalog.',
    'Español primero. Orientativo: decisión final del agrónomo.'
  ],
  chapters: [
    {
      id: 'nosotros',
      slug: 'nosotros',
      title: 'Detrás de NutriPlant PRO · Jesús Avila Mendoza',
      url: `${BASE}/nosotros.html`,
      pillar: 'Institucional / autoría',
      summary:
        'Visión, respeto al agrónomo, perfil del fundador (sin marcas de empleadores). Trayectoria en nutrición vegetal México, formación, enlace LinkedIn. Para GEO y consultas web.',
      status: 'published'
    },
    {
      id: 'analisis_suelo_fertilidad_kgha',
      slug: 'analisis-suelo-fertilidad-kgha',
      title: 'Análisis de suelo: fertilidad, ideales y kg/ha de ajuste',
      url: `${BASE}/capitulos/analisis-suelo-fertilidad-kgha.html`,
      pillar: 'C — Análisis de laboratorio',
      summary:
        'Fertilidad del suelo en reportes Análisis: nivel lab vs ideal; kg/ha = (lab−ideal)×0.1×profundidad×densidad×(%suelo explorado/100). Ideales K/Ca/Mg desde CIC (5/70/13%). P según Bray/Olsen/Mehlich.',
      status: 'published'
    },
    {
      id: 'porcentaje_meq_aniones_cationes',
      slug: 'porcentaje-meq-aniones-cationes',
      title: '% meq: triángulos aniónicos y catiónicos',
      url: `${BASE}/capitulos/porcentaje-meq-aniones-cationes.html`,
      pillar: 'A/D — Fundamentos / Programas',
      summary:
        'Triángulo aniones N-P-S suma 100% (sin Cl). Triángulo cationes K-Ca-Mg suma 100% (sin NH4). NH4 y Cl con denominadores aparte. Hidroponía y fertirriego gráficas. No confundir con % saturación CIC del suelo.',
      status: 'published'
    },
    {
      id: 'enmiendas_balance_cic',
      slug: 'enmiendas-balance-cic',
      title: 'Balance de enmiendas por CIC del suelo',
      url: `${BASE}/capitulos/enmiendas-balance-cic.html`,
      pillar: 'B — Suelo y enmiendas',
      summary:
        'CIC en meq/100g (= cmolc/kg). Saturación % = meq/CIC×100. Meq a ajustar → kg/ha enmienda según profundidad, densidad, % suelo explorado. Distinto de reportes Análisis→Suelo (lista en nube).',
      status: 'published'
    }
  ],
  upcoming: [
    'unidades-ppm-meq-oxidos',
    'programa-fertirriego-etapas',
    'graficas-ionicas-fertirriego',
    'solucion-nutritiva-ce-triangulos',
    'vpd-deficit-presion-vapor',
    'analisis-foliar-dop',
    'faq-porcentajes-no-suman-100'
  ]
};
