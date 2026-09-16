'use strict';

const core = require('./public-mcp-core');
const subscriber = require('./public-mcp-subscriber');
const freeCalc = require('./public-mcp-free-calc');
const freeCalcExtra = require('./public-mcp-free-calc-extra');
const cross = require('./public-mcp-cross');

const PUBLIC_INSTRUCTIONS = [
  'Eres NutriPlant PRO (plugin público). Español. Piso técnico alto: no trates al usuario como principiante.',
  'Razón del @: ChatGPT no se pierda. Ancla = manual técnico + flujo plataforma + tools (misma lógica que free tools / web).',
  'Método: dato→interpretación→ajuste→programa→seguimiento. Pregunta de método → lookup_chapter (flujo o tema) antes de improvisar.',
  'Cifra → tool. No inventes kPa, g/m³, kg/ha, labs ni clima. Cita URL del capítulo; si hay UI, también URL de herramienta gratis (lookup_free_tool / list_catalog).',
  'Cálculo free (oleadas 2–3): VPD punto, triángulos meq, DU, foliar, ISH, óxido, CIC, dureza, lámina, granular, N mineralizable, pulso hidro, magnitudes, solubilidad/IS, Mulder, extracción etapa, agua suelo, compatibilidad, composición fórmula, pronóstico punto, huella carbono.',
  'Con sesión: get_my_project (expediente + flow_status + deep_links + cross foliar/VPD/programa). Tools: interpret_project_cross, project_deep_links. Solo su JWT.',
  'Sin sesión: método + free tools; cross_manual_signals si pasan DOP/VPD/meq a mano.',
  'NO existen aquí: admin, Socio, Plan PRO, Nutri PRO privado, Invest PRO, AirCI, pagos, otros clientes.',
  'No mezclar: ISH≠lámina≠pulso≠VPD≠ventana foliar≠pronóstico; suelo kg/ha≠enmiendas CIC; % meq solución≠% CIC.',
  'Datos incompletos: declara huecos; no inventes programa ni lab. Orientativo: decide el agrónomo.'
].join(' ');

const TOOLS = [
  {
    name: 'lookup_chapter',
    description:
      'Busca un capítulo del manual técnico público NutriPlant (flujo, labs, ferti, VPD, etc.) y devuelve título, resumen y URL.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Id, slug o palabras (flujo, VPD, meq, ISH, foliar, CIC…)' }
      },
      required: ['q']
    }
  },
  {
    name: 'lookup_free_tool',
    description:
      'Busca una herramienta gratuita NutriPlant y devuelve resumen, URL web y capítulo relacionado. Para guía de uso o cuando aún no hay tool de cálculo en el chat.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Id o nombre (vpd, lamina, enmienda, hidro_solucion, ISH…)' }
      },
      required: ['q']
    }
  },
  {
    name: 'list_catalog',
    description:
      'Lista capítulos del manual + herramientas gratis (con URLs). Incluye capítulo de flujo de plataforma.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'convert_nutrient_units',
    description: 'Convierte ppm ↔ meq/L ↔ mmol/L con pesos equivalentes NutriPlant (Ca 20.04, etc.).',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        nutrient: { type: 'string', description: 'Ca, Mg, K, P, S, Cl, N_NO3, N_NH4' },
        value: { type: 'number' },
        from: { type: 'string', description: 'ppm | meq_L | mmol_L' }
      },
      required: ['nutrient', 'value', 'from']
    }
  },
  {
    name: 'calculate_vpd',
    description:
      'VPD aire (Tetens) desde T y HR, o interpreta un VPD ya dado (kPa). Rango plataforma 0.5–1.5 kPa. (VPD por mapa/ubicación: ver lookup_free_tool vpd.)',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        vpd_kPa: { type: 'number' },
        temperature_C: { type: 'number' },
        rh_pct: { type: 'number' },
        crop: { type: 'string' }
      }
    }
  },
  {
    name: 'interpret_context',
    description:
      'Relaciona parámetros (VPD, cultivo) con criterio NutriPlant: bandas, qué no confundir y capítulos.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        crop: { type: 'string' },
        vpd_kPa: { type: 'number' },
        temperature_C: { type: 'number' },
        rh_pct: { type: 'number' }
      }
    }
  },
  {
    name: 'salt_from_meq',
    description:
      'Dosis de sal (g/m³) para un objetivo en meq/L. Ej.: 1 meq Ca con nitrato de calcio; reporta también N-NO₃ arrastrado.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        nutrient: { type: 'string', description: 'Ca, Mg, K…' },
        meq_L: { type: 'number' },
        salt_id: {
          type: 'string',
          description:
            'nitrato_calcio_granular | nitrato_calcio_cristal | nks | nitrato_magnesio | sulfato_magnesio | cacl2_dihidratado'
        },
        volume_m3: { type: 'number' },
        volume_L: { type: 'number' }
      },
      required: ['nutrient', 'meq_L']
    }
  },
  {
    name: 'calculate_vpd_at_point',
    description:
      'VPD actual en un punto (lat/lng): clima Open-Meteo + Tetens, misma idea que vpd-free. El usuario debe dar coords.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        crop: { type: 'string' }
      },
      required: ['lat', 'lng']
    }
  },
  {
    name: 'meq_triangle_balance',
    description:
      'Porcentajes meq de triángulos NutriPlant: N-P-S y K-Ca-Mg (100 % cada uno). Cl y NH4 aparte.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        n_no3_meq: { type: 'number' },
        p_meq: { type: 'number' },
        s_meq: { type: 'number' },
        k_meq: { type: 'number' },
        ca_meq: { type: 'number' },
        mg_meq: { type: 'number' },
        cl_meq: { type: 'number' },
        n_nh4_meq: { type: 'number' }
      }
    }
  },
  {
    name: 'calculate_irrigation_uniformity',
    description:
      'DU 25% / CU Christiansen sobre muestras de caudal (L/h). Misma lógica que uniformidad-riego free.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        samples: {
          type: 'array',
          items: { type: 'number' },
          description: 'Caudales L/h (o value en objetos)'
        }
      },
      required: ['samples']
    }
  },
  {
    name: 'classify_foliar_window',
    description:
      'Clasifica condiciones para aplicación foliar (T, HR, viento, lluvia, DPV). Sweet spot 15–25 °C / HR 50–80 / viento 2–8. ≠ VPD cultivo.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        temperature_C: { type: 'number' },
        rh_pct: { type: 'number' },
        wind_kmh: { type: 'number' },
        rain_mm: { type: 'number' },
        vpd_kPa: { type: 'number' }
      },
      required: ['temperature_C', 'rh_pct']
    }
  },
  {
    name: 'calculate_ish',
    description:
      'ISH / rendimiento hídrico: weeks[{et0_mm, rain_mm, irrigation_mm?}] + kc (+ fp opcional). Misma fórmula que ish free.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        kc: { type: 'number' },
        fp: { type: 'number' },
        weeks: { type: 'array', items: { type: 'object' } }
      },
      required: ['kc', 'weeks']
    }
  },
  {
    name: 'convert_oxide_elemental',
    description:
      'Convierte óxido ↔ elemental (P2O5↔P, K2O↔K, CaO↔Ca, MgO↔Mg, SO3↔S) con factores NutriPlant.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        form: { type: 'string', description: 'P2O5 | K2O | CaO | MgO | SO3' },
        value: { type: 'number' },
        direction: { type: 'string', description: 'to_elemental | to_oxide' }
      },
      required: ['form', 'value']
    }
  },
  {
    name: 'soil_cic_balance',
    description:
      'Balance CIC / enmienda: % actuales, ideal K5/Ca75/Mg15, Δ meq. Misma lógica que enmienda-free. ≠ kg/ha Análisis.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        k_meq: { type: 'number' },
        ca_meq: { type: 'number' },
        mg_meq: { type: 'number' },
        h_meq: { type: 'number' },
        na_meq: { type: 'number' },
        al_meq: { type: 'number' }
      },
      required: ['k_meq', 'ca_meq', 'mg_meq']
    }
  },
  {
    name: 'water_hardness',
    description:
      'Dureza agua (ppm CaCO₃, class USGS) + conversión unidades; opcional Ca/Mg lab y dosis de ácido (HCO3/CO3/residual).',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        hardness_ppm: { type: 'number' },
        meq_L: { type: 'number' },
        ca_ppm: { type: 'number' },
        mg_ppm: { type: 'number' },
        hco3_meq: { type: 'number' },
        co3_meq: { type: 'number' },
        residual_meq: { type: 'number' },
        acid_id: { type: 'string' },
        volume_L: { type: 'number' }
      }
    }
  },
  {
    name: 'calculate_irrigation_balance',
    description:
      'Lámina / balance hídrico: ETc=ET0×kc, déficit, balance vs riego. Manual (et0_mm, rain_mm) o lat/lng Open-Meteo. ≠ ISH.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        kc: { type: 'number' },
        et0_mm: { type: 'number' },
        rain_mm: { type: 'number' },
        irrigation_mm: { type: 'number' },
        crop_ha: { type: 'number' },
        irrigated_ha: { type: 'number' },
        period_days: { type: 'number' },
        lat: { type: 'number' },
        lng: { type: 'number' },
        macro_tunnel: { type: 'boolean' }
      },
      required: ['kc']
    }
  },
  {
    name: 'granular_mix_blend',
    description:
      'Mezcla granular: % m/m → N-P2O5-K2O (y CaO/MgO/SO4) + aportes kg/ha. Catálogo free o comp custom.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        materials: {
          type: 'array',
          items: { type: 'object' },
          description: '[{ name: "Urea"|"MAP"|…, pct }, …] o { comp:{N,P2O5,K2O}, pct }'
        },
        dose_kg_ha: { type: 'number' }
      },
      required: ['materials']
    }
  },
  {
    name: 'calculate_n_mineralizable',
    description:
      'N mineralizable desde MO: depth_cm, DA, % alcance, %MO, %N en MO, % mineralización (1–3). Misma fórmula free.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        depth_cm: { type: 'number' },
        bulk_density: { type: 'number' },
        reach_pct: { type: 'number' },
        om_pct: { type: 'number' },
        n_in_om_pct: { type: 'number' },
        mineralization_pct: { type: 'number' }
      },
      required: ['depth_cm', 'bulk_density']
    }
  },
  {
    name: 'calculate_hydro_pulse',
    description:
      'Pulso riego hidro: L y minutos. container_L, aw_pct, depletion_pct, drain_pct, dripper_lph (+ pots/goteros).',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        container_L: { type: 'number' },
        aw_pct: { type: 'number' },
        depletion_pct: { type: 'number' },
        drain_pct: { type: 'number' },
        pots: { type: 'number' },
        drippers_per_pot: { type: 'number' },
        dripper_lph: { type: 'number' }
      },
      required: ['container_L', 'aw_pct', 'depletion_pct', 'drain_pct', 'dripper_lph']
    }
  },
  {
    name: 'convert_physical_units',
    description: 'Convierte magnitudes físicas (ha↔m2, mm↔in, kg↔lb, etc.) con NpUnits.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        from: { type: 'string' },
        to: { type: 'string' }
      },
      required: ['value', 'from', 'to']
    }
  },
  {
    name: 'lookup_solubility_is',
    description: 'Busca solubilidad g/L e índice salino (NaNO₃=100) en tabla free tools.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: { q: { type: 'string', description: 'Nombre o fórmula (urea, KNO3, MAP…)' } }
    }
  },
  {
    name: 'mulder_interactions',
    description: 'Antagonismos/sinergias Mulder desde ion focal (no3, k, ca, zn…).',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: { ion: { type: 'string' } },
      required: ['ion']
    }
  },
  {
    name: 'distribute_extraction_by_stage',
    description: 'Reparte kg/ha totales por % de etapa (extracción nutrimental). No calcula dosis.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        totals_kg_ha: { type: 'object' },
        stages: { type: 'array', items: { type: 'object' } }
      },
      required: ['totals_kg_ha', 'stages']
    }
  },
  {
    name: 'soil_available_water',
    description: 'Agua útil CC−PMP (mm/m³), zona 40–60% AU; opcional θ actual → lámina a CC. O texture tip.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        cc_pct: { type: 'number' },
        pmp_pct: { type: 'number' },
        depth_cm: { type: 'number' },
        area_ha: { type: 'number' },
        surface_pct: { type: 'number' },
        theta_pct: { type: 'number' },
        texture: { type: 'string' }
      }
    }
  },
  {
    name: 'fertilizer_compatibility',
    description: 'Par de fertilizantes → C/R/I (solución madre). Ids: map, mkp, nitrato_calcio_granular…',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' }
      },
      required: ['a', 'b']
    }
  },
  {
    name: 'fertilizer_composition_from_formula',
    description:
      'Composición % teórica desde fórmula química (KNO3, Ca(NO3)2·4H2O…) o mezcla molecules[{formula,pct}].',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        formula: { type: 'string' },
        molecules: { type: 'array', items: { type: 'object' } },
        others_pct: { type: 'number' }
      }
    }
  },
  {
    name: 'agroclimate_forecast_at_point',
    description:
      'Pronóstico agroclimático ~7d pasado + ~7d futuro en lat/lng (T, HR, lluvia, ETo, ETc=ETo×kc). ≠ VPD puntual.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        kc: { type: 'number' }
      },
      required: ['lat', 'lng']
    }
  },
  {
    name: 'calculate_fertilizer_carbon',
    description:
      'Huella CO₂e fertilizantes (FE+transporte+N₂O). rows[{fertilizer_id, dose}] + area_ha. Misma lógica free.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        area_ha: { type: 'number' },
        origin_country_iso: { type: 'string' },
        rows: { type: 'array', items: { type: 'object' } }
      },
      required: ['rows']
    }
  },
  {
    name: 'list_my_projects',
    description:
      'Lista SOLO los proyectos del suscriptor autenticado (JWT propio). Requiere Conectar cuenta NutriPlant PRO.',
    auth: true,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_my_project',
    description:
      'Expediente del suscriptor (solo lectura): resumen, flow_status, labs, enmiendas, programas, VPD/clima, extracción, deep_links al dashboard y cruce foliar↔VPD↔programa.',
    auth: true,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        q: { type: 'string', description: 'Nombre parcial si no hay id' },
        section: {
          type: 'string',
          description:
            'all | labs | programs | enmiendas | vpd | clima | extraccion | cross | fertirriego | hidro | granular'
        },
        type: { type: 'string', description: 'Filtro lab: suelo | foliar | agua | fruta | extracto_pasta | solucion_nutritiva' },
        stage_index: { type: 'number', description: 'Etapa fertirriego (0-based)' },
        latest_only: { type: 'boolean', description: 'Solo último reporte por tipo (default true)' },
        cross: { type: 'boolean', description: 'Forzar bloque cross aunque section no sea all' }
      }
    }
  },
  {
    name: 'interpret_project_cross',
    description:
      'Cruce foliar (DOP) ↔ VPD ↔ programa (ferti/hidro) del proyecto del suscriptor. Señales + qué no mezclar + deep links. Solo lectura.',
    auth: true,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        q: { type: 'string' },
        stage_index: { type: 'number' }
      }
    }
  },
  {
    name: 'project_deep_links',
    description:
      'URLs deep link al dashboard del suscriptor (np_project + np_section) para foliar, VPD, ferti, hidro, etc.',
    auth: true,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        q: { type: 'string' }
      }
    }
  },
  {
    name: 'cross_manual_signals',
    description:
      'Sin cuenta: cruza cifras que el usuario dicta (foliar_ca_dop_pct, vpd_kPa, program_ca_meq). Con cuenta preferir interpret_project_cross.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        foliar_ca_dop_pct: { type: 'number' },
        vpd_kPa: { type: 'number' },
        program_ca_meq: { type: 'number' }
      }
    }
  }
];

function toolsList() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: t.annotations
  }));
}

function toolNeedsAuth(name) {
  const t = TOOLS.find((x) => x.name === name);
  return !!(t && t.auth);
}

async function callTool(name, args, user) {
  const params = args && typeof args === 'object' ? args : {};
  switch (name) {
    case 'lookup_chapter':
      return core.lookupChapter(params);
    case 'lookup_free_tool':
      return core.lookupFreeTool(params);
    case 'list_catalog':
      return core.listCatalog();
    case 'convert_nutrient_units':
      return core.convertNutrientUnits(params);
    case 'calculate_vpd':
      return core.calculateVpd(params);
    case 'interpret_context':
      return core.interpretContext(params);
    case 'salt_from_meq':
      return core.saltFromMeq(params);
    case 'calculate_vpd_at_point':
      return freeCalc.calculateVpdAtPoint(params);
    case 'meq_triangle_balance':
      return freeCalc.meqTriangleBalance(params);
    case 'calculate_irrigation_uniformity':
      return freeCalc.calculateIrrigationUniformity(params);
    case 'classify_foliar_window':
      return freeCalc.classifyFoliarWindow(params);
    case 'calculate_ish':
      return freeCalc.calculateIsh(params);
    case 'convert_oxide_elemental':
      return freeCalc.convertOxideElemental(params);
    case 'soil_cic_balance':
      return freeCalc.soilCicBalance(params);
    case 'water_hardness':
      return freeCalc.waterHardness(params);
    case 'calculate_irrigation_balance':
      return freeCalc.calculateIrrigationBalance(params);
    case 'granular_mix_blend':
      return freeCalc.granularMixBlend(params);
    case 'calculate_n_mineralizable':
      return freeCalcExtra.calculateNMineralizable(params);
    case 'calculate_hydro_pulse':
      return freeCalcExtra.calculateHydroPulse(params);
    case 'convert_physical_units':
      return freeCalcExtra.convertPhysicalUnits(params);
    case 'lookup_solubility_is':
      return freeCalcExtra.lookupSolubilityIs(params);
    case 'mulder_interactions':
      return freeCalcExtra.mulderInteractions(params);
    case 'distribute_extraction_by_stage':
      return freeCalcExtra.distributeExtractionByStage(params);
    case 'soil_available_water':
      return freeCalcExtra.soilAvailableWater(params);
    case 'fertilizer_compatibility':
      return freeCalcExtra.fertilizerCompatibility(params);
    case 'fertilizer_composition_from_formula':
      return freeCalcExtra.fertilizerCompositionFromFormula(params);
    case 'agroclimate_forecast_at_point':
      return freeCalcExtra.agroclimateForecastAtPoint(params);
    case 'calculate_fertilizer_carbon':
      return freeCalcExtra.calculateFertilizerCarbon(params);
    case 'list_my_projects':
      return subscriber.listMyProjects(user);
    case 'get_my_project':
      return subscriber.getMyProject(user, params);
    case 'interpret_project_cross':
      return subscriber.interpretProjectCross(user, params);
    case 'project_deep_links':
      return subscriber.projectDeepLinks(user, params);
    case 'cross_manual_signals':
      return cross.crossManualSignals(params);
    default:
      return { ok: false, error: 'Tool desconocida: ' + name };
  }
}

module.exports = {
  TOOLS,
  PUBLIC_INSTRUCTIONS,
  toolsList,
  toolNeedsAuth,
  callTool
};
