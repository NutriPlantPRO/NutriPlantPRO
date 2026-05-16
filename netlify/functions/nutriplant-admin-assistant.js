/**
 * NutriPlant PRO — API de consulta para Custom GPT (solo administrador, solo lectura).
 *
 * Variables Netlify:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NUTRIPLANT_ADMIN_GPT_TOKEN  — Bearer para ChatGPT Actions
 *
 * POST /api/admin-assistant  body: { "action": "admin_stats", "params": {} }
 * GET  /api/admin-assistant/openapi.json  — esquema para Actions
 */

const PROFILE_SELECT =
  'id, email, name, is_admin, phone, profession, location, crops, subscription_status, subscription_amount, created_at, last_login, exclude_from_revenue';

const ADMIN_EMAIL_LC = 'admin@nutriplantpro.com';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function parseBearer(event) {
  const h = event.headers?.authorization || event.headers?.Authorization || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

function verifyAuth(event) {
  const expected = (process.env.NUTRIPLANT_ADMIN_GPT_TOKEN || '').trim();
  if (!expected) {
    return { ok: false, status: 503, error: 'NUTRIPLANT_ADMIN_GPT_TOKEN no configurado en Netlify.' };
  }
  const token = parseBearer(event);
  if (!token || token !== expected) {
    return { ok: false, status: 401, error: 'No autorizado. Usa Authorization: Bearer <token>.' };
  }
  return { ok: true };
}

async function getSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

function resolveAction(event, body) {
  if (body && body.action) return String(body.action).trim();
  const path = (event.path || '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  if (last === 'openapi.json' || last === 'nutriplant-admin-assistant' || last === 'admin-assistant') {
    return '';
  }
  return last;
}

function isSubscriberProfile(p) {
  if (!p || p.is_admin) return false;
  return (p.email || '').toLowerCase() !== ADMIN_EMAIL_LC;
}

function isSoftDeletedProject(row) {
  const d = row && row.data ? row.data : {};
  return !!(d._is_deleted || d.is_deleted || d.deleted_at);
}

function getProjectCrop(data) {
  if (!data || typeof data !== 'object') return '';
  return String(data.crop_type || data.cultivo || data.cropType || '').trim();
}

/** Misma lógica que getActiveUsers() en admin/index.html */
function countActiveUsers30d(profiles, visits) {
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeIds = new Set();
  (profiles || []).forEach((u) => {
    if (!isSubscriberProfile(u)) return;
    const t = u.last_login ? new Date(u.last_login).getTime() : 0;
    if (t >= thirtyDaysAgoMs) activeIds.add(u.id);
  });
  (visits || []).forEach((v) => {
    if (!v || !v.user_id) return;
    const t = v.visited_at ? new Date(v.visited_at).getTime() : 0;
    if (t >= thirtyDaysAgoMs) activeIds.add(v.user_id);
  });
  return activeIds.size;
}

async function fetchProfiles(supabase) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT);
  if (error) throw new Error('profiles: ' + (error.message || error));
  return data || [];
}

async function fetchVisits(supabase) {
  const { data, error } = await supabase
    .from('dashboard_visits')
    .select('id, user_id, visited_at, lat, lng')
    .order('visited_at', { ascending: false })
    .limit(5000);
  if (error) {
    console.warn('dashboard_visits:', error.message);
    return [];
  }
  return data || [];
}

async function fetchProjects(supabase) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id, name, title, data, created_at, updated_at');
  if (error) throw new Error('projects: ' + (error.message || error));
  return (data || []).filter((p) => !isSoftDeletedProject(p));
}

function publicUserRow(p, projectsCount) {
  return {
    id: p.id,
    name: p.name || (p.email ? p.email.split('@')[0] : 'Sin nombre'),
    email: p.email || '',
    phone: p.phone || null,
    location: p.location || null,
    subscription_status: p.subscription_status || 'inactive',
    subscription_amount: parseFloat(p.subscription_amount) || 0,
    created_at: p.created_at,
    last_login: p.last_login,
    projects_count: projectsCount || 0
  };
}

function latestVisitByUser(visits) {
  const map = {};
  (visits || []).forEach((v) => {
    if (!v || !v.user_id) return;
    const t = v.visited_at ? new Date(v.visited_at).getTime() : 0;
    const prev = map[v.user_id];
    const prevT = prev && prev.visited_at ? new Date(prev.visited_at).getTime() : 0;
    if (!prev || t > prevT) map[v.user_id] = v;
  });
  return map;
}

async function handleAdminStats(supabase) {
  const [profiles, visits, projects] = await Promise.all([
    fetchProfiles(supabase),
    fetchVisits(supabase),
    fetchProjects(supabase)
  ]);
  const subscribers = profiles.filter(isSubscriberProfile);
  const byStatus = { active: 0, pending: 0, cancelled: 0, expired: 0, inactive: 0, other: 0 };
  subscribers.forEach((u) => {
    const s = (u.subscription_status || 'inactive').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
    else byStatus.other += 1;
  });
  const active30 = countActiveUsers30d(profiles, visits);
  return {
    ok: true,
    domain: 'admin',
    generated_at: new Date().toISOString(),
    total_users: subscribers.length,
    active_users_last_30_days: active30,
    subscriptions: byStatus,
    total_projects: projects.length,
    note:
      'Usuarios activos (30 días): último login en profiles o entrada al dashboard en dashboard_visits.'
  };
}

async function handleListUsers(supabase, params) {
  const profiles = await fetchProfiles(supabase);
  const projects = await fetchProjects(supabase);
  const projectsByUser = {};
  projects.forEach((p) => {
    projectsByUser[p.user_id] = (projectsByUser[p.user_id] || 0) + 1;
  });

  let list = profiles.filter(isSubscriberProfile);
  const status = (params.subscription_status || params.status || '').trim().toLowerCase();
  if (status) list = list.filter((u) => (u.subscription_status || '').toLowerCase() === status);

  const q = (params.q || params.search || '').trim().toLowerCase();
  if (q) {
    list = list.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }

  const onlyActive30 = params.active_last_30_days === true || params.active_last_30_days === 'true';
  if (onlyActive30) {
    const visits = await fetchVisits(supabase);
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeIds = new Set();
    list.forEach((u) => {
      const t = u.last_login ? new Date(u.last_login).getTime() : 0;
      if (t >= thirtyDaysAgoMs) activeIds.add(u.id);
    });
    visits.forEach((v) => {
      if (!v || !v.user_id) return;
      const t = v.visited_at ? new Date(v.visited_at).getTime() : 0;
      if (t >= thirtyDaysAgoMs) activeIds.add(v.user_id);
    });
    list = list.filter((u) => activeIds.has(u.id));
  }

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 100, 1), 200);
  list = list.slice(0, limit);

  return {
    ok: true,
    domain: 'admin',
    count: list.length,
    users: list.map((u) => publicUserRow(u, projectsByUser[u.id] || 0))
  };
}

async function handleUserSummary(supabase, params) {
  const q = (params.email || params.name || params.q || '').trim();
  if (!q) {
    return { ok: false, error: 'Indica params.email, params.name o params.q para buscar al usuario.' };
  }
  const profiles = await fetchProfiles(supabase);
  const qLc = q.toLowerCase();
  const matches = profiles.filter(isSubscriberProfile).filter((u) => {
    const email = (u.email || '').toLowerCase();
    const name = (u.name || '').toLowerCase();
    return email.includes(qLc) || name.includes(qLc) || email === qLc;
  });
  if (matches.length === 0) {
    return { ok: true, domain: 'admin', found: false, message: 'No se encontró usuario con ese criterio.' };
  }
  const user = matches[0];
  const visits = await fetchVisits(supabase);
  const latest = latestVisitByUser(visits)[user.id];
  const projects = (await fetchProjects(supabase)).filter((p) => p.user_id === user.id);

  return {
    ok: true,
    domain: 'admin',
    found: true,
    multiple_matches: matches.length > 1,
    other_matches_count: matches.length > 1 ? matches.length - 1 : 0,
    user: publicUserRow(user, projects.length),
    last_dashboard_visit: latest
      ? {
          visited_at: latest.visited_at,
          lat: latest.lat,
          lng: latest.lng
        }
      : null,
    projects: projects.slice(0, 50).map((p) => ({
      id: p.id,
      name: p.name || p.title || 'Sin nombre',
      crop: getProjectCrop(p.data),
      updated_at: p.updated_at
    }))
  };
}

async function handleSearchProjects(supabase, params) {
  const projects = await fetchProjects(supabase);
  const profiles = await fetchProfiles(supabase);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const cropQ = (params.crop || params.cultivo || '').trim().toLowerCase();
  const userQ = (params.user || params.email || params.q || '').trim().toLowerCase();
  const projectQ = (params.project || params.project_name || '').trim().toLowerCase();

  let list = projects;
  if (cropQ) {
    list = list.filter((p) => getProjectCrop(p.data).toLowerCase().includes(cropQ));
  }
  if (projectQ) {
    list = list.filter((p) => {
      const n = (p.name || '').toLowerCase();
      const t = (p.title || '').toLowerCase();
      return n.includes(projectQ) || t.includes(projectQ) || (p.id || '').toLowerCase().includes(projectQ);
    });
  }
  if (userQ) {
    list = list.filter((p) => {
      const prof = byId.get(p.user_id);
      if (!prof) return false;
      const email = (prof.email || '').toLowerCase();
      const name = (prof.name || '').toLowerCase();
      return email.includes(userQ) || name.includes(userQ);
    });
  }

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 50, 1), 100);
  list = list.slice(0, limit);

  return {
    ok: true,
    domain: 'nutriplant_projects',
    count: list.length,
    projects: list.map((p) => {
      const prof = byId.get(p.user_id);
      return {
        id: p.id,
        name: p.name || p.title || 'Sin nombre',
        crop: getProjectCrop(p.data),
        user_email: prof ? prof.email : null,
        user_name: prof ? prof.name : null,
        updated_at: p.updated_at
      };
    })
  };
}

async function handleDescribeApi() {
  return {
    ok: true,
    domains: {
      admin: ['admin_stats', 'list_users', 'user_summary'],
      nutriplant_projects: ['search_projects'],
      plan_pro: ['plan_pro_week', 'plan_pro_search', 'plan_pro_item (próximamente)'],
      project_detail: ['project_summary, project_soil, project_location, … (fase 2)']
    },
    usage: 'POST con body { "action": "<nombre>", "params": { ... } } y header Authorization Bearer.'
  };
}

const HANDLERS = {
  admin_stats: (sb, p) => handleAdminStats(sb, p),
  list_users: (sb, p) => handleListUsers(sb, p),
  user_summary: (sb, p) => handleUserSummary(sb, p),
  search_projects: (sb, p) => handleSearchProjects(sb, p),
  describe_api: () => handleDescribeApi()
};

function getOpenApiSpec() {
  /* Formato 3.0.3 + servers.url raíz: compatible con importador de Actions en ChatGPT */
  return {
    openapi: '3.1.0',
    info: {
      title: 'NutriPlant Admin Assistant',
      version: '1.0.0',
      description: 'Solo lectura. Consultas admin y proyectos NutriPlant PRO.'
    },
    servers: [{ url: 'https://nutriplantpro.com' }],
    paths: {
      '/api/admin-assistant': {
        post: {
          operationId: 'nutriplantAdminQuery',
          summary: 'Consulta admin o proyectos de usuarios',
          description:
            'Body JSON: action + params. Acciones: admin_stats, list_users, user_summary, search_projects, describe_api.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: {
                      type: 'string',
                      enum: Object.keys(HANDLERS)
                    },
                    params: { type: 'object', additionalProperties: true }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Respuesta JSON con ok y datos'
            }
          }
        }
      }
    }
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  const path = (event.path || '').toLowerCase();
  if (event.httpMethod === 'GET' && (path.includes('openapi') || path.endsWith('.json'))) {
    return jsonResponse(200, getOpenApiSpec());
  }

  const auth = verifyAuth(event);
  if (!auth.ok) {
    return jsonResponse(auth.status, { ok: false, error: auth.error });
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: 'Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).'
    });
  }

  const body = parseBody(event);
  const action = resolveAction(event, body) || body.action || 'describe_api';

  if (!HANDLERS[action]) {
    return jsonResponse(400, {
      ok: false,
      error: 'Acción desconocida: ' + action,
      available_actions: Object.keys(HANDLERS)
    });
  }

  try {
    const result = await HANDLERS[action](supabase, body.params || {});
    return jsonResponse(200, result);
  } catch (err) {
    console.error('nutriplant-admin-assistant:', action, err);
    return jsonResponse(500, {
      ok: false,
      error: err.message || String(err),
      action
    });
  }
};
