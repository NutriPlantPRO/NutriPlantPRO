/**
 * Catálogo de herramientas gratuitas NutriPlant (login + iconos dashboard).
 * Usado por nutriplant-admin-assistant → action free_tools_catalog.
 * Mantener alineado con docs/HERRAMIENTAS-GRATUITAS-CONOCIMIENTO-GPT.md
 */
module.exports = {
  version: '2026-06-23',
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
      summary:
        'ppm ↔ mmol/L (macros e iones) o µmol/L (Fe, Mn, Zn, B, Cu, Mo) ↔ meq/L por ion (ppm elemental; MoO₄²⁻). Incluye categoría carga iónica (meq/cmol).',
      micronutrients_umol: {
        rule: 'Fe, Mn, Zn, B, Cu, Mo usan µmol/L en pantalla (no mmol/L); ppm sigue siendo del elemento.',
        formulas: [
          'µmol/L = (ppm elemento ÷ PA) × 1000',
          'mmol/L = µmol/L ÷ 1000',
          'meq/L = mmol/L × valencia'
        ],
        species: [
          { form: 'Fe²⁺', element: 'Fe', pa: 55.85, valence: 2 },
          { form: 'Mn²⁺', element: 'Mn', pa: 54.94, valence: 2 },
          { form: 'Zn²⁺', element: 'Zn', pa: 65.38, valence: 2 },
          { form: 'Cu²⁺', element: 'Cu', pa: 63.55, valence: 2 },
          { form: 'H₃BO₃', element: 'B', pa: 10.81, valence: 1 },
          { form: 'MoO₄²⁻', element: 'Mo', pa: 95.95, valence: 2 }
        ],
        example_fe_3ppm: { umol_L: 53.7, mmol_L: 0.054, meq_L: 0.107 },
        manual_chapter: 'unidades_ppm_meq_oxidos'
      }
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
        'Mapa (punto GPS), clima con respaldo satelital, VPD ambiental simple, VPD avanzado (T hoja manual o estimada por radiación). Rangos óptimo ~0.5–1.5 kPa.'
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
        'kg/ha totales + % por etapa → kg/ha y gráficas. Login: solo LS. Dashboard: curva autoguardada en proyecto (nube) + biblioteca «Mis curvas guardadas» por usuario (LS + Supabase perfil). No calcula dosis.'
    },
    {
      id: 'tabla_periodica',
      title: 'Tabla Periódica (Nutrientes Esenciales)',
      file: 'tabla-periodica-nutrientes-free.html',
      summary:
        'Tabla visual de nutrientes + calculadora interna: peso molecular, % elemental y peso equivalente (meq) por fórmula. Incluye pestaña de formas iónicas/moléculas 3D: PubChem cuando existe; modelos NutriPlant con enlaces explícitos para arquitectura visual básica (trigonal/tetraédrica), unidades iónicas/minerales representativas, quelatos EDTA/DTPA/EDDHA y precipitados frecuentes. No es cristalografía exacta.'
    },
    {
      id: 'atlas_aminoacidos_vegetales',
      title: 'Atlas Fisiológico Vegetal',
      file: 'atlas-aminoacidos-vegetales-free.html',
      manualChapter: 'atlas_aminoacidos_vegetales',
      summary:
        'Atlas interactivo con dos secciones: 20 aminoácidos proteinogénicos (fórmula, PM, modelo 3D, rutas, estrés, fenología, evidencia) y ciclo hormonal de la planta por etapas (hormonas dominantes, eventos celulares y nutrientes cofactores).'
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
        '4 pestañas: Mulder (antagonismo/sinergia desde ion focal), mecanismos hacia raíz, movilidad/síntomas, disponibilidad vs pH.',
      mulder_antagonisms: [
        'K vs Ca/Mg/NH4',
        'P alto vs Zn/Fe/Cu/Mn/Ca',
        'Cu ↔ Mn (micros, bidireccional rojo)',
        'Cu ↔ Zn, Cu ↔ Fe, Mn ↔ Fe, Mn ↔ Zn',
        'SO4 vs MoO4',
        'NO3 vs Cl'
      ]
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
        'Pestaña agua: CC, PMP, profundidad, ha, % superficie/franja, θ; zona objetivo 40–60% AU; gráfica mm·m³; recuadro m³·mm (CC y objetivo 60% AU); m³ vs mm; puente balance «Sugerir desde 🪨 suelo». Pestaña textura USDA.'
    },
    {
      id: 'lamina_riego',
      title: 'Lámina de riego y balance hídrico',
      file: 'lamina-riego-free.html',
      lsKey: 'nutriplant_free_lamina_riego_v1',
      summary:
        'Mapa/GPS, Open-Meteo ETo/lluvia, balance 1 y 7 d. Kc editable; riego franja solo m³; ajuste almacén suelo manual (déficit/exceso) + «Sugerir desde 🪨 suelo»; total integrado clima ± almacén; superficie cultivo/franja; tablas Kc y % sistema.'
    },
    {
      id: 'solubilidad_is',
      title: 'Solubilidad e índice salino',
      file: 'solubilidad-indice-salino-free.html',
      lsKey: 'nutriplant_free_solubilidad_is_v1',
      summary: 'Tabla solubilidad g/L e IS (NaNO₃=100); filtro y orden. Material educativo.'
    },
    {
      id: 'fertilizer_carbon',
      title: 'Huella de carbono de fertilizantes',
      file: 'fertilizer-carbon-free.html',
      lsKey: 'nutriplant_free_fertilizer_carbon_v2',
      manualChapter: 'huella_carbono_fertilizantes',
      summary:
        'Referencia global abierta: FE(2020) DNV + transporte 3 tramos por fertilizante + N₂O IPCC. Programa A vs B; equivalencia km pick-up 6 cil. (0,254 kg CO₂e/km); ruta por fila; disponibilidad regional; panel FE. T&C §7.',
      methodology: {
        reference_standard: 'Fertilizers Europe (2020) regional reference values (DNV) for urea, AN, CAN, UAN; IPCC field N₂O; DESNZ transport',
        manufacturing: 'Productos N: kg CO₂e/kg = FE(2020) por región (EU urea 0,878 · AN 1,112 · CAN 0,951 · UAN 0,782). Urea/UAN excl. CO₂ en producto. Otros: LCA pública.',
        regional_availability:
          'availability_profiles en JSON: fe_n_global, granular_np, soluble_fertigation, organic_local. not_applicable oculta producto y bloquea fab. estimada; import_typical con badge; factor propio permite EPD importación.',
        commercial_blends:
          'Mezclas comerciales (NK+Mg) excluidas del catálogo — sin factor LCA único por región. Modelar KNO₃ + fuente Mg por separado o factor propio. 21 productos en JSON (v2026-06-26).',
        per_row_route:
          'Cada fila: origin_country_iso, application_country_iso, entry_point_id, transport_origin_km, transport_sea_km, transport_km. active_row_index; clic fila edita panel ruta.',
        pickup_equivalence:
          'equivalencies.pickup_medium_6cyl: 0,254 kg CO₂e/km (DESNZ large car/4×4). km ≈ kg CO₂e/0,254 para A, B y diff. Ilustración — no compensación.',
        fe_calibration_panel: 'UI table FE EU vs NutriPlant — delta 0 en productos N',
        transport_legs: [
          'Origen (carretera): planta → puerto exportación — km ref. por región fab.',
          'Marítimo: puerto export. → puerto destino — route_estimates',
          'Destino (carretera): puerto → campo — entry_point o ~150 km'
        ],
        transport_factors: 'DESNZ: carretera ≈ 0,062; marítimo ≈ 0,010 kg CO₂e/t·km',
        field_n2o: 'IPCC Tier 1 EF1=0,01; GWP 273',
        compare: 'scenario_a vs scenario_b',
        efficiency_benchmark: 'score 0–100 vs min/máx regional (filas estimadas)',
        precision: '±25–40% fabricación; ±30–50% con transporte/campo genérico',
        legal: 'terminos-condiciones.html#huella-carbono'
      },
      lsFields: [
        'scenario_a', 'scenario_b', 'active_row_index',
        'rows[].origin_country_iso', 'rows[].application_country_iso', 'rows[].entry_point_id',
        'rows[].transport_origin_km', 'rows[].transport_sea_km', 'rows[].transport_km'
      ]
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
