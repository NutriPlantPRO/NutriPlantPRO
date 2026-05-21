/**
 * Catálogo de herramientas gratuitas NutriPlant (login + iconos dashboard).
 * Usado por nutriplant-admin-assistant → action free_tools_catalog.
 * Mantener alineado con docs/HERRAMIENTAS-GRATUITAS-CONOCIMIENTO-GPT.md
 */
module.exports = {
  version: '2026-05-21',
  scope:
    'Herramientas HTML en iframe/modal sin cuenta. Persistencia solo localStorage del navegador (no Supabase). Misma lógica en login.html y dashboard (iconos barra).',
  persistence: {
    storage: 'localStorage',
    keyPrefix: 'nutriplant_free_',
    note:
      'Los valores del formulario se restauran al reabrir en el mismo navegador. No sincroniza entre dispositivos ni con proyectos de suscriptores.'
  },
  tools: [
    {
      id: 'conversor_oxido_elemental',
      title: 'Conversor Óxido ↔ Elemental',
      file: 'login.html (modal embebido)',
      proEquivalent: 'Dashboard — mismos conversores en barra',
      summary: 'P₂O₅↔P, K₂O↔K, CaO↔Ca, MgO↔Mg, SiO₂↔Si con factores estándar agronómicos.'
    },
    {
      id: 'conversor_unidades_nutrientes',
      title: 'Conversor de unidades (ppm / mmol / meq)',
      file: 'login.html + measure-units-calculator.js',
      summary: 'ppm ↔ mmol/L ↔ meq/L por ion (peso equivalente). Incluye categoría carga iónica (meq/cmol).'
    },
    {
      id: 'conversor_magnitudes',
      title: 'Conversor de magnitudes físicas',
      file: 'measure-units-calculator.js',
      summary: 'Longitud, área, volumen, masa, presión, etc., para campo y laboratorio.'
    },
    {
      id: 'hidro_solucion',
      title: 'Diseño de solución nutritiva',
      file: 'hidro-solucion-free.html',
      lsKey: 'nutriplant_hydro_solucion_free_v1',
      summary:
        'CE objetivo → meq/L, % meq (triángulos N-P-S y K-Ca-Mg), ppm. Cl⁻ suma a CE. Triángulos arrastrables. N-NH₄ fuera del triángulo catiónico; Cl fuera del aniónico. Didáctica global; distinta de pestaña Hidroponía del proyecto (esa sí guarda en nube por proyecto).'
    },
    {
      id: 'agua_dureza',
      title: 'Diagnóstico de agua y acondicionamiento',
      file: 'agua-dureza-free.html',
      lsKey: 'nutriplant_free_agua_dureza_v1',
      summary:
        'Dureza (ppm CaCO₃, meq/L, °dH/°eH/°fH), Ca/Mg de laboratorio, neutralización con ácidos (HCO₃/CO₃, residual, volumen).'
    },
    {
      id: 'vpd',
      title: 'Estimador de déficit de presión de vapor',
      file: 'vpd-free.html',
      lsKey: 'nutriplant_free_vpd_v1',
      summary:
        'Mapa Open-Meteo (punto), VPD ambiental simple, VPD avanzado (T hoja manual o estimada por radiación). Rangos óptimo ~0.5–1.5 kPa.'
    },
    {
      id: 'enmienda',
      title: 'Balance de enmiendas por CIC',
      file: 'enmienda-free.html',
      lsKey: 'nutriplant_free_enmienda_v1',
      summary:
        'Cationes iniciales/objetivo (%), CIC, densidad, profundidad, pH, % alcance. Enmiendas: yeso, cal, SOP, MgSO₄. Rangos ideales K 3–7%, Ca 65–75%, Mg 10–15%.'
    },
    {
      id: 'granular_mix',
      title: 'Formulación de mezclas granulares',
      file: 'granular-mix-free.html',
      lsKey: 'nutriplant_free_granular_mix_v1',
      summary:
        'Filas material + % TM, relación N-P₂O₅-K₂O, kg/ha por nutriente. Hasta 3 fertilizantes personalizados en LS aparte.'
    },
    {
      id: 'fertilizer_composition',
      title: 'Composición de fertilizantes (%)',
      file: 'fertilizer-composition-free.html',
      lsKey: 'nutriplant_free_fertilizer_composition_v1',
      summary:
        'Varias moléculas con % en producto; composición teórica pura por fila; total ponderado elemental + óxidos. Catálogo custom en LS.'
    },
    {
      id: 'extraccion_etapa',
      title: 'Distribución nutrimental por etapa (%)',
      file: 'extraccion-etapa-free.html',
      summary:
        'kg/ha totales y % por etapa (N,P,K,Ca,Mg…). Gratuito: guardado local por usuario+proyecto en LS. Dashboard: además nube + plantillas con título.'
    },
    {
      id: 'tabla_periodica',
      title: 'Tabla Periódica (Nutrientes Esenciales)',
      file: 'tabla-periodica-nutrientes-free.html',
      summary: 'Referencia visual/educativa; sin formulario persistente.'
    },
    {
      id: 'fertilizer_compatibility',
      title: 'Compatibilidad de fertilizantes',
      file: 'fertilizer-compatibility-free.html',
      lsKey: 'nutriplant_free_fertilizer_compatibility_v1',
      summary: 'Matriz triangular C/R/I; ficha por par o por producto.'
    },
    {
      id: 'interacciones',
      title: 'Interacciones y movilidad nutrimental',
      file: 'interacciones-absorcion-movilidad-free.html',
      lsKey: 'nutriplant_free_interacciones_absorcion_v1',
      summary:
        '4 pestañas: Mulder (antagonismo/sinergia desde ion focal), mecanismos hacia raíz, movilidad/síntomas, disponibilidad vs pH.'
    },
    {
      id: 'n_mineralizable',
      title: 'Estimación de N mineralizable',
      file: 'n-mineralizable-mo-free.html',
      lsKey: 'nutriplant_free_n_mineralizable_mo_v1',
      summary:
        'N_min = 10000×(P/100)×DA×1000×(R/100)×(MO/100)×(N_MO/100)×(T_min/100); P cm, DA g/cm³, T_min 1–3%.'
    },
    {
      id: 'agua_textura',
      title: 'Agua en suelo y textura',
      file: 'agua-disponible-textura-suelo-free.html',
      lsKey: 'nutriplant_free_agua_disponible_textura_v1',
      summary:
        'Pestaña agua: CC, PMP, profundidad, ha, zona radical, θ. Pestaña textura USDA: % arena/limo/arcilla, triángulo arrastrable.'
    },
    {
      id: 'solubilidad_is',
      title: 'Solubilidad e índice salino',
      file: 'solubilidad-indice-salino-free.html',
      lsKey: 'nutriplant_free_solubilidad_is_v1',
      summary: 'Tabla solubilidad g/L e IS (NaNO₃=100); filtro y orden. Material educativo.'
    }
  ],
  gptRules: [
    'No inventar números que el usuario ve en pantalla: si no tienes su captura, explica fórmulas y criterios de la herramienta.',
    'Distinguir herramienta gratuita (local) vs módulo de proyecto suscriptor (guardado en Supabase).',
    'Para datos de un cliente suscriptor usar Actions: project_detail, project_analyses, etc.',
    'Para “¿cómo funciona la calculadora de X?” usar este catálogo o action free_tools_catalog.',
    'Persistencia gratuita: solo este navegador; no sustituye backup ni proyecto en nube.'
  ]
};
