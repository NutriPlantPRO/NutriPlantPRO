'use strict';

const { runAdminAction } = require('../nutriplant-admin-assistant');

const ADMIN_ACTIONS = [
  'admin_stats',
  'list_users',
  'user_summary',
  'subscription_roster',
  'search_projects',
  'project_detail',
  'project_analyses',
  'project_vpd_live',
  'project_climate',
  'my_program_project_create',
  'my_program_project_list',
  'my_program_project_get',
  'my_program_project_update',
  'plan_pro_catalog',
  'plan_pro_day',
  'plan_pro_week',
  'plan_pro_search',
  'plan_pro_item',
  'plan_pro_locations',
  'plan_pro_create',
  'plan_pro_update',
  'nutri_pro_catalog',
  'nutri_pro_search',
  'nutri_pro_ask',
  'nutri_pro_file_text',
  'nutri_pro_file_inspect',
  'nutri_pro_reindex',
  'nutri_pro_set_text',
  'nutri_pro_save',
  'nutri_pro_upload_link',
  'nutri_pro_upload_status',
  'radar_project',
  'radar_search',
  'radar_overview',
  'free_tools_catalog',
  'lab_analyses_catalog',
  'manual_tecnico_catalog',
  'nutrition_catalogs',
  'invest_pro_overview',
  'invest_pro_holdings',
  'invest_pro_lists',
  'describe_api'
];

const ADMIN_INSTRUCTIONS = [
  'Eres el asistente privado y socio estratégico de Jesús Avila Mendoza (NutriPlant PRO / Plan PRO). Solo él usa este conector.',
  'UNA sola tool: nutriplantAdminQuery. Datos de plataforma (usuarios, pagos, proyectos, Plan/Nutri/Invest PRO, Radar, lab, clima/VPD) → llámala en el mismo turno: {"action":"NOMBRE","params":{...}}.',
  'PROHIBIDO: decir que no hay herramienta, explicar sin ejecutar, inventar cifras o fechas de cobro. 401/503 → cítalo. describe_api debe devolver version 2.15.0.',
  'NO es el plugin público /mcp. Aquí sí hay admin, roster, otros clientes y escritura solo en my_program_* personal y Plan PRO del admin.'
].join(' ');

const TOOLS = [
  {
    name: 'nutriplantAdminQuery',
    description:
      'Única tool del Socio Admin. Misma API que /api/admin-assistant: action + params. Usuarios/pagos: subscription_roster. Proyectos, lab, clima, Plan/Nutri/Invest PRO, Radar, catálogos. Verifica describe_api → version 2.15.0.',
    annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
    inputSchema: {
      type: 'object',
      required: ['action'],
      additionalProperties: true,
      properties: {
        action: {
          type: 'string',
          description: 'Operación interna (no es otra tool).',
          enum: ADMIN_ACTIONS
        },
        params: {
          type: 'object',
          additionalProperties: true,
          description:
            'Parámetros según action. Frecuentes: project_name|id, type, latest_only, q, email, overdue, due_soon, days_ahead, hops, symbol, list_name, mode, item_id, nutri_file_id.',
          properties: {
            project_id: { type: 'string' },
            project_name: { type: 'string' },
            type: { type: 'string', description: 'project_analyses: suelo|solucion_nutritiva|extracto_pasta|agua|foliar|fruta|all' },
            mode: { type: 'string' },
            email: { type: 'string' },
            q: { type: 'string' },
            symbol: { type: 'string' },
            list_name: { type: 'string' },
            item_id: { type: 'string' },
            hops: { type: 'integer' },
            nutri_file_id: { type: 'string' },
            overdue: { type: 'boolean' },
            due_soon: { type: 'boolean' },
            days_ahead: { type: 'integer' },
            latest_only: { type: 'boolean' },
            report_id: { type: 'string' },
            tool_id: { type: 'string' },
            chapter_id: { type: 'string' }
          }
        }
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

function flattenParams(args) {
  const src = args && typeof args === 'object' ? args : {};
  const params =
    src.params && typeof src.params === 'object' && !Array.isArray(src.params) ? Object.assign({}, src.params) : {};
  Object.keys(src).forEach((key) => {
    if (key === 'action' || key === 'params') return;
    if (src[key] != null && src[key] !== '' && params[key] == null) params[key] = src[key];
  });
  return params;
}

async function callTool(name, args) {
  if (name !== 'nutriplantAdminQuery') {
    return { ok: false, error: 'Tool desconocida: ' + name + '. Solo existe nutriplantAdminQuery.' };
  }
  const action = String((args && args.action) || '').trim();
  if (!action) {
    return { ok: false, error: 'Falta action. Ejemplo: {"action":"describe_api","params":{}}' };
  }
  return runAdminAction(action, flattenParams(args));
}

module.exports = {
  ADMIN_ACTIONS,
  ADMIN_INSTRUCTIONS,
  toolsList,
  callTool
};
