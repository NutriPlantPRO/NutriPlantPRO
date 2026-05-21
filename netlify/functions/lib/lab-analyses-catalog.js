/**
 * Catálogo pestaña Análisis (dashboard) — 6 tipos guardados en projects.data (Supabase).
 * Alineado con docs/ANALISIS-LABORATORIO-CONOCIMIENTO-GPT.md
 */
module.exports = {
  version: '2026-05-21',
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
        'Ideal K/Ca/Mg ppm desde CIC×saturación (5/70/13%). kg/ha=(lab−ideal)×0.1×profundidad×DA×(%raíz/100). P ideal según Bray/Olsen/Mehlich.'
    },
    {
      id: 'solucion_nutritiva',
      label: 'Solución nutritiva (extracto o licor)',
      storageKey: 'solucionNutritivaAnalyses',
      sections: ['General CE/pH/RAS', 'Cationes ppm', 'Aniones ppm', 'Micros', 'Ideal editable vs lab'],
      criteria: 'Diff ppm vs ideal por nutriente; referencias SN_REF_DEFAULT en app.'
    },
    {
      id: 'extracto_pasta',
      label: 'Extracto de pasta saturada',
      storageKey: 'extractoPastaAnalyses',
      sections: ['CE/pH/RAS', 'Cationes y aniones ppm', 'Ideal'],
      criteria: 'Saturación paste; interpretar disponibilidad en rizósfera con cautela.'
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
      sections: ['Macros %', 'Micros ppm', 'Óptimo editable', 'DOP %'],
      criteria: 'DOP=(valor−óptimo)/óptimo×100; semáforo en app. Óptimos default por nutriente.'
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
