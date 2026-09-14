'use strict';

const core = require('./public-mcp-core');
const subscriber = require('./public-mcp-subscriber');

const PUBLIC_INSTRUCTIONS = [
  'Eres NutriPlant PRO (plugin público). Piso técnico alto. Español.',
  'Cita URL del capítulo. No inventes cifras: usa tools.',
  'Sin sesión: solo metodología y cálculos. Con sesión: además los proyectos de ESE usuario.',
  'Nunca datos de otros clientes, pagos ni admin. Eso no existe en este servidor.',
  'No confundas ISH, lámina, pulso, VPD, foliar ni CIC vs % meq.'
].join(' ');

const TOOLS = [
  {
    name: 'lookup_chapter',
    description:
      'Busca un capítulo del manual técnico público NutriPlant y devuelve título, resumen y URL canónica.',
    auth: false,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Id, slug o palabras (VPD, meq, ISH, foliar, CIC…)' }
      },
      required: ['q']
    }
  },
  {
    name: 'list_catalog',
    description: 'Lista los 28 capítulos del manual y las calculadoras gratuitas alineadas.',
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
      'VPD aire (Tetens) desde T y HR, o interpreta un VPD ya dado (kPa). Rango plataforma 0.5–1.5 kPa.',
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
          description: 'nitrato_calcio_granular | nitrato_calcio_cristal | nks | nitrato_magnesio | sulfato_magnesio | cacl2_dihidratado'
        },
        volume_m3: { type: 'number' },
        volume_L: { type: 'number' }
      },
      required: ['nutrient', 'meq_L']
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
      'Detalle del proyecto del suscriptor autenticado: cultivo, módulos, conteo de análisis, último suelo si existe.',
    auth: true,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        q: { type: 'string', description: 'Nombre parcial si no hay id' },
        type: { type: 'string', description: 'suelo | all' }
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
    case 'list_my_projects':
      return subscriber.listMyProjects(user);
    case 'get_my_project':
      return subscriber.getMyProject(user, params);
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
