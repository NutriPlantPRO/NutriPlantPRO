/**
 * Catálogo pestaña Análisis (dashboard) — 6 tipos guardados en projects.data (Supabase).
 * Alineado con docs/ANALISIS-LABORATORIO-CONOCIMIENTO-GPT.md
 */
module.exports = {
  version: '2026-09-24',
  storage: {
    table: 'projects',
    column: 'data (JSONB)',
    arrays: {
      suelo: 'soilAnalyses',
      solucion_nutritiva: 'solucionNutritivaAnalyses',
      extracto_pasta: 'extractoPastaAnalyses',
      agua: 'aguaAnalyses',
      foliar: 'foliarAnalyses',
      fruta: 'frutaAnalyses'
    },
    separate_enmienda: 'soilAnalysis (pestaña Enmiendas, no confundir con Análisis → Suelo)'
  },
  compare_ui: {
    where: 'Dashboard Análisis (cada subpestaña) + Reportes PDF',
    title: 'Comparar análisis (tabla y gráficas) / Compare analyses (table and charts)',
    behavior:
      '≥2 reportes del mismo tipo: columnas por análisis (on/off); tablas por bloque; gráficas solo en bloques chartables (ej. suelo macros/micros/% CIC). Foliar: velas en % del óptimo de ESA columna (no ppm/% crudo; no un óptimo compartido). Franja = DOP ±10% (90–110%). Punto = valor lab. En tablas, óp./id. = de esa columna. Relaciones foliar solo tabla. PDF y admin: mismas tablas + capturas. Datos = mismos arrays que project_analyses.',
    not: 'No inventa series; no sustituye detalle por reporte'
  },
  api: {
    read_action: 'project_analyses',
    params: {
      project_id: 'UUID o usar project_name',
      project_name: 'nombre parcial del proyecto',
      type: 'suelo | solucion_nutritiva | extracto_pasta | agua | foliar | fruta | all',
      report_id: 'opcional: id del reporte (sa_*, sn_*, etc.)',
      latest_only: 'true: solo el reporte más reciente por tipo'
    },
    also_in: 'project_detail → sections.analyses'
  },
  tabs: [
    {
      id: 'suelo',
      label: 'Análisis de suelo',
      storageKey: 'soilAnalyses',
      sections: ['Físico', 'pH y sales', 'Fertilidad (ppm + ideal + kg/ha)', 'Cationes meq y %', 'Relaciones Ca:Mg'],
      criteria:
        'Ideal K/Ca/Mg ppm desde CIC×saturación (5/70/13%), no del extractante de P/micros. kg/ha=(lab−ideal)×0.1×profundidad×DA×(%raíz/100). Saturación CIC ideal (bajo cada %): Ca 65–75, Mg 10–15, K 3–7, Na 0–1, Al 0–1, H 0–10. Relaciones (meq): Ca/Mg 6, Mg/K 3.5, (Ca+Mg)/K 18, Ca/K 14; se muestran bajo cada cálculo. Un ppm no es universal: hay que conocer el método. P: Bray 40 / Olsen 25 / Mehlich 40. Fe/Mn/Zn/Cu: un selector DTPA 20-20-3-1.5 / Mehlich 50-20-3-2 / Otro (no pisa). B: agua caliente 1 / Mehlich 1.2 / Otro. Ideales editables; guardados en el reporte. No comparar extractantes distintos 1:1.'
    },
    {
      id: 'solucion_nutritiva',
      label: 'Solución nutritiva (extracto o licor)',
      storageKey: 'solucionNutritivaAnalyses',
      sections: ['General CE/pH/RAS', 'Cationes meq/% meq/ppm', 'Aniones meq/% meq/ppm', 'Micros', 'Ideal editable vs lab'],
      criteria: 'Diff ppm vs ideal por nutriente; referencias SN_REF_DEFAULT en app. Semáforo: Ideal vacío → franja Ref.; con Ideal → ±10% de ese número (no de la Ref.). % meq junto a meq: ion/total cationes o aniones (todos los de la tabla; ≠ Steiner). Misma columna en dashboard, admin y PDF.'
    },
    {
      id: 'extracto_pasta',
      label: 'Extracto de pasta saturada',
      storageKey: 'extractoPastaAnalyses',
      sections: ['CE/pH/RAS', 'Cationes y aniones meq/% meq/ppm', 'Ideal'],
      criteria: 'Saturación paste; interpretar disponibilidad en rizósfera con cautela. Semáforo: igual que solución (Ideal vacío → franja Ref.; con Ideal → ±10% de ese número). % meq junto a meq: igual que solución. Dashboard, admin y PDF.'
    },
    {
      id: 'agua',
      label: 'Análisis de agua de riego/fertilización',
      storageKey: 'aguaAnalyses',
      sections: ['m³ riego', 'CE/pH/RAS', 'Cationes/aniones', 'Residual ácido', 'Micros'],
      criteria: 'Impacto en fertirriego y compatibilidad; HCO₃/CO₃ para acidificación.'
    },
    {
      id: 'foliar',
      label: 'Análisis foliar',
      storageKey: 'foliarAnalyses',
      sections: ['Macros %', 'Micros ppm', 'Óptimo editable', 'DOP %', 'Relaciones nutrimentales'],
      criteria:
        'DOP=(valor−óptimo)/óptimo×100. Relaciones (N/K, Ca/K, P/Zn, etc.): real=resultados, ideal=óptimos del mismo reporte; P/Zn y Ca/B pasan macro % a ppm (×10000). Misma desviación/semáforo que DOP. Óptimos default por nutriente. Comparar: velas % del óptimo de esa columna; franja DOP ±10%; punto=lab; óp./id. por columna (admin + PDF).'
    },
    {
      id: 'fruta',
      label: 'Análisis de fruta',
      storageKey: 'frutaAnalyses',
      sections: ['Macros', 'Micros', 'Calidad (°Brix, firmeza…)', 'Calcio fruta', 'ICC %'],
      criteria: 'ICC% vs óptimo; regla visual |ICC|≤10% verde, 10–25 amarillo, etc.'
    }
  ],
  gptRules: [
    'Para valores reales de un suscriptor: SIEMPRE llamar project_analyses (o project_detail) con project_name o project_id.',
    'No confundir soilAnalysis (Enmiendas) con soilAnalyses[] (reportes laboratorio).',
    'type=suelo en API devuelve clave suelo_reportes en JSON.',
    'Si hay varios reportes, listar títulos/fechas; usar report_id para uno específico.',
    'Calculadoras gratis: free_tools_catalog — no están en projects.data.'
  ]
};
