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

/** ChatGPT Actions a veces manda project_id en la raíz, no dentro de params. */
function normalizeParams(body) {
  const src = body && typeof body === 'object' ? body : {};
  const params =
    src.params && typeof src.params === 'object' && !Array.isArray(src.params) ? { ...src.params } : {};
  const passthrough = [
    'project_id',
    'id',
    'project_name',
    'project',
    'q',
    'fertirriego_stage_index',
    'stage_index',
    'email',
    'user_email',
    'search',
    'status',
    'crop',
    'limit',
    'active_last_30_days'
  ];
  passthrough.forEach((key) => {
    const v = src[key];
    if (v != null && v !== '' && params[key] == null) params[key] = v;
  });
  const planKeys = [
    'item_id',
    'area_id',
    'area_slug',
    'area_title',
    'category_id',
    'category_title',
    'rama',
    'thought_type',
    'tags',
    'days_ahead',
    'include_overdue',
    'due_on',
    'due_date',
    'fecha',
    'title',
    'body_plain',
    'note',
    'priority',
    'next_action',
    'status',
    'close',
    'reopen',
    'append_note'
  ];
  planKeys.forEach((key) => {
    const v = src[key];
    if (v != null && v !== '' && params[key] == null) params[key] = v;
  });
  const radarKeys = ['has_radar_only', 'has_polygon_only', 'history_limit', 'user', 'cultivo'];
  radarKeys.forEach((key) => {
    const v = src[key];
    if (v != null && v !== '' && params[key] == null) params[key] = v;
  });
  const climateKeys = ['mode', 'live', 'refresh_rainfall', 'use_saved'];
  climateKeys.forEach((key) => {
    const v = src[key];
    if (v != null && v !== '' && params[key] == null) params[key] = v;
  });
  const analysisKeys = ['type', 'analysis_type'];
  analysisKeys.forEach((key) => {
    const v = src[key];
    if (v != null && v !== '' && params[key] == null) params[key] = v;
  });
  return params;
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

/* ——— Fase 2: detalle de proyecto ——— */
const FERTI_ION_EQ = { N_NO3: 14, N_NH4: 14, P: 31, SO4: 16.03, Cl: 35.45, K: 39.1, Ca: 20.04, Mg: 12.15 };
const FERTI_SO4_TO_S = 96 / 32;

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getVpdLocationFromData(data) {
  const loc = data && data.location;
  if (!loc || typeof loc !== 'object') return null;
  const center = loc.center;
  if (center) {
    const lat = asNum(Array.isArray(center) ? center[0] : center.lat);
    const lng = asNum(Array.isArray(center) ? center[1] : center.lng);
    if (lat != null && lng != null) return { lat, lng };
  }
  const poly =
    Array.isArray(loc.polygon) && loc.polygon.length >= 3
      ? loc.polygon
      : Array.isArray(loc.coordinates) && loc.coordinates.length >= 3
        ? loc.coordinates
        : null;
  if (!poly) return null;
  let lat = 0;
  let lng = 0;
  let n = 0;
  poly.forEach((c) => {
    const pLat = asNum(Array.isArray(c) ? c[0] : c.lat);
    const pLng = asNum(Array.isArray(c) ? c[1] : c.lng);
    if (pLat != null && pLng != null) {
      lat += pLat;
      lng += pLng;
      n += 1;
    }
  });
  if (n < 3) return null;
  return { lat: lat / n, lng: lng / n };
}

function getFertirriegoProgram(data) {
  const f = data && data.fertirriego;
  if (!f || typeof f !== 'object') return null;
  if (f.program && typeof f.program === 'object') return f.program;
  if (Array.isArray(f.weeks)) return f;
  return null;
}

function fertiStageLabel(timeUnit, index) {
  const u = String(timeUnit || 'semana').toLowerCase();
  const isMes = u.includes('mes') || u === 'month' || u === 'months';
  return (isMes ? 'Mes' : 'Semana') + ' ' + (index + 1);
}

function computeFertiStageIonic(week, m3ha, timeUnit, stageIndex) {
  if (!week) return null;
  const totals = week.totals || {};
  const m3 = parseFloat(m3ha) || 0;
  const kgS = (parseFloat(totals.SO4) || 0) / FERTI_SO4_TO_S + (parseFloat(totals.S) || 0);
  const kg = {
    N_NO3: parseFloat(totals.N_NO3) || 0,
    N_NH4: parseFloat(totals.N_NH4) || 0,
    P: parseFloat(totals.P) || 0,
    SO4: kgS,
    Cl: parseFloat(totals.Cl) || 0,
    K: parseFloat(totals.K) || 0,
    Ca: parseFloat(totals.Ca) || 0,
    Mg: parseFloat(totals.Mg) || 0
  };
  const label = fertiStageLabel(timeUnit, stageIndex);
  const base = {
    stage_index: stageIndex,
    stage_label: label,
    stage_name: week.stage || week.label || '',
    m3ha: m3,
    kg_per_ha: kg
  };
  if (m3 <= 0) {
    return { ...base, note: 'Sin m³/ha en Gráficas: solo kg/ha del programa (sin ppm/meq).' };
  }
  const ppm = {};
  Object.keys(kg).forEach((k) => {
    ppm[k] = (kg[k] * 1000) / m3;
  });
  const meq = {
    N_NO3: ppm.N_NO3 / FERTI_ION_EQ.N_NO3,
    N_NH4: ppm.N_NH4 / FERTI_ION_EQ.N_NH4,
    P: ppm.P / FERTI_ION_EQ.P,
    SO4: ppm.SO4 / FERTI_ION_EQ.SO4,
    Cl: ppm.Cl / FERTI_ION_EQ.Cl,
    K: ppm.K / FERTI_ION_EQ.K,
    Ca: ppm.Ca / FERTI_ION_EQ.Ca,
    Mg: ppm.Mg / FERTI_ION_EQ.Mg
  };
  const sumAnTriangle = meq.N_NO3 + meq.P + meq.SO4;
  const sumAnTotal = sumAnTriangle + meq.Cl;
  const sumCatKCaMg = meq.K + meq.Ca + meq.Mg;
  const sumCatTotal = sumCatKCaMg + meq.N_NH4;
  const pct = {
    anions_triangle: {
      N_NO3: sumAnTriangle > 0 ? (meq.N_NO3 / sumAnTriangle) * 100 : 0,
      P: sumAnTriangle > 0 ? (meq.P / sumAnTriangle) * 100 : 0,
      SO4: sumAnTriangle > 0 ? (meq.SO4 / sumAnTriangle) * 100 : 0
    },
    cations_K_Ca_Mg: {
      K: sumCatKCaMg > 0 ? (meq.K / sumCatKCaMg) * 100 : 0,
      Ca: sumCatKCaMg > 0 ? (meq.Ca / sumCatKCaMg) * 100 : 0,
      Mg: sumCatKCaMg > 0 ? (meq.Mg / sumCatKCaMg) * 100 : 0
    },
    Cl_on_total_anions: sumAnTotal > 0 ? (meq.Cl / sumAnTotal) * 100 : 0,
    NH4_on_total_cations: sumCatTotal > 0 ? (meq.N_NH4 / sumCatTotal) * 100 : 0
  };
  return {
    ...base,
    ppm,
    meq_per_L: meq,
    percent: pct,
    sum_anions_meq_L: sumAnTotal,
    sum_cations_meq_L: sumCatTotal
  };
}

function summarizeFertirriego(program, stageIndexParam) {
  if (!program || !Array.isArray(program.weeks) || program.weeks.length === 0) {
    return { has_program: false, message: 'No hay programa de fertirriego guardado.' };
  }
  const weeks = program.weeks;
  const timeUnit = program.timeUnit || 'semana';
  const waterArr = Array.isArray(program.chartWaterByStageM3ha) ? program.chartWaterByStageM3ha : [];
  const stages = weeks.map((w, i) => {
    const t = w.totals || {};
    const k = parseFloat(t.K) || parseFloat(t.K2O) * 0.83 || 0;
    const n = (parseFloat(t.N_NO3) || 0) + (parseFloat(t.N_NH4) || 0) + (parseFloat(t.N) || 0);
    return {
      index: i,
      label: fertiStageLabel(timeUnit, i),
      stage_name: w.stage || w.label || '',
      K_kg_ha: Math.round(k * 100) / 100,
      N_kg_ha: Math.round(n * 100) / 100,
      m3ha: parseFloat(waterArr[i]) || 0
    };
  });
  const out = {
    has_program: true,
    time_unit: timeUnit,
    stages_count: weeks.length,
    stages,
    chart_water_m3ha_by_stage: waterArr
  };
  const idx =
    stageIndexParam != null && stageIndexParam !== ''
      ? Math.max(0, Math.min(parseInt(stageIndexParam, 10) || 0, weeks.length - 1))
      : Math.max(0, Math.min(parseInt(program.chartSelectedStageIndex, 10) || 0, weeks.length - 1));
  out.selected_stage = computeFertiStageIonic(weeks[idx], waterArr[idx], timeUnit, idx);
  if (stageIndexParam != null && stageIndexParam !== '') {
    out.requested_stage = computeFertiStageIonic(weeks[idx], waterArr[idx], timeUnit, idx);
  }
  return out;
}

function summarizeSoil(data) {
  const sa = data && data.soilAnalysis;
  if (!sa || typeof sa !== 'object') {
    return { has_data: false, message: 'Sin análisis de suelo guardado.' };
  }
  const initial = sa.initial || {};
  const props = sa.properties || {};
  const adj = sa.adjustments || {};
  return {
    has_data: true,
    initial_meq: {
      K: initial.k,
      Ca: initial.ca,
      Mg: initial.mg,
      Na: initial.na,
      Al: initial.al,
      H: initial.h,
      CIC: initial.cic
    },
    properties: {
      ph: props.ph,
      density: props.density,
      depth_cm: props.depth
    },
    adjustments_meq: adj
  };
}

/* ——— Análisis (reportes por pestaña) ——— */
const ANALYSIS_TYPES = {
  suelo: { key: 'soilAnalyses', label: 'Análisis de suelo' },
  solucion_nutritiva: { key: 'solucionNutritivaAnalyses', label: 'Solución nutritiva' },
  extracto_pasta: { key: 'extractoPastaAnalyses', label: 'Extracto de pasta' },
  agua: { key: 'aguaAnalyses', label: 'Análisis de agua' },
  foliar: { key: 'foliarAnalyses', label: 'Análisis foliar' },
  fruta: { key: 'frutaAnalyses', label: 'Análisis de fruta' }
};

function analysisReportMeta(a) {
  return {
    id: a && a.id ? a.id : null,
    title: (a && (a.title || a.name)) || '(sin título)',
    date: (a && a.date) || (a && a.meta && a.meta.date) || null
  };
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function diffPct(val, opt) {
  const v = numOrNull(val);
  const o = numOrNull(opt);
  if (v == null || o == null || o === 0) return null;
  return Math.round(((v - o) / o) * 1000) / 10;
}

function soilKgHaFromReport(a) {
  const fert = a.fertility || {};
  const ideal = fert.ideal || {};
  const bulk = numOrNull(a.physical && a.physical.bulkDensity) || 1;
  const depth = numOrNull(fert.depthCm) || 20;
  const reach = numOrNull(fert.reachPct) || 100;
  const factor = 0.1 * depth * bulk * (reach / 100);
  const keys = ['mo', 'nNo3', 'p', 'k', 'ca', 'mg', 'na', 's', 'fe', 'mn', 'b', 'zn', 'cu', 'moly', 'al'];
  const out = {};
  keys.forEach((key) => {
    const lab = numOrNull(fert[key]);
    const idealVal = numOrNull(ideal[key]);
    if (lab == null) return;
    const diff = idealVal == null ? lab : lab - idealVal;
    out[key] = {
      lab_ppm: lab,
      ideal_ppm: idealVal,
      diff_ppm: idealVal == null ? null : Math.round((lab - idealVal) * 10) / 10,
      kg_ha_adjustment: Math.round(diff * factor * 100) / 100
    };
  });
  return {
    factor_formula: 'kg/ha = (lab − ideal) × 0.1 × profundidad_cm × densidad_aparente × (suelo_explorado_% / 100)',
    depth_cm: depth,
    bulk_density_g_cm3: bulk,
    root_reach_pct: reach,
    factor,
    nutrients: out
  };
}

function summarizeSoilAnalysisReport(a) {
  const ph = a.phSection || {};
  const fert = a.fertility || {};
  const ideal = fert.ideal || {};
  const cat = a.cations || {};
  const phys = a.physical || {};
  const ratios = a.ratios || {};
  return {
    ...analysisReportMeta(a),
    physical: {
      textural_class: phys.texturalClass || null,
      bulk_density_g_cm3: numOrNull(phys.bulkDensity),
      field_capacity_pct: numOrNull(phys.fieldCapacity),
      wilting_point_pct: numOrNull(phys.wiltingPoint)
    },
    ph: numOrNull(ph.ph),
    ph_buffer: numOrNull(ph.phBuffer),
    salinity_ds_m: numOrNull(ph.salinity),
    total_carbonates_pct: numOrNull(ph.totalCarbonates),
    fertility: {
      p_method: fert.pMethod || null,
      depth_cm: numOrNull(fert.depthCm),
      root_reach_pct: numOrNull(fert.reachPct),
      lab_ppm: {
        mo: numOrNull(fert.mo),
        n_no3: numOrNull(fert.nNo3),
        p: numOrNull(fert.p),
        k: numOrNull(fert.k),
        ca: numOrNull(fert.ca),
        mg: numOrNull(fert.mg),
        na: numOrNull(fert.na),
        s: numOrNull(fert.s),
        fe: numOrNull(fert.fe),
        mn: numOrNull(fert.mn),
        b: numOrNull(fert.b),
        zn: numOrNull(fert.zn),
        cu: numOrNull(fert.cu),
        al: numOrNull(fert.al),
        moly: numOrNull(fert.moly)
      },
      ideal_ppm: ideal,
      kg_ha: soilKgHaFromReport(a)
    },
    cations_meq_100g: {
      ca: numOrNull(cat.ca),
      mg: numOrNull(cat.mg),
      k: numOrNull(cat.k),
      na: numOrNull(cat.na),
      al: numOrNull(cat.al),
      h: numOrNull(cat.h),
      cic: numOrNull(cat.cic)
    },
    cations_pct: {
      ca: numOrNull(cat.pctCa),
      mg: numOrNull(cat.pctMg),
      k: numOrNull(cat.pctK),
      na: numOrNull(cat.pctNa),
      al: numOrNull(cat.pctAl),
      h: numOrNull(cat.pctH)
    },
    ratios: {
      ca_mg: numOrNull(ratios.caMg),
      mg_k: numOrNull(ratios.mgK),
      ca_mg_k: numOrNull(ratios.caMgK),
      ca_k: numOrNull(ratios.caK)
    }
  };
}

function summarizeSolucionReport(a) {
  const cat = a.cations || {};
  const an = a.anions || {};
  const ideal = a.ideal || {};
  const g = a.general || {};
  const ppm = (obj, k, isCat) => numOrNull(isCat ? obj[k + '_ppm'] : obj[k + '_ppm']);
  const keysCat = ['k', 'ca', 'mg', 'na'];
  const keysAn = ['no3', 'so4', 'po4', 'cl'];
  const values = {};
  keysCat.forEach((k) => {
    values[k] = { ppm: ppm(cat, k, true), ideal_ppm: numOrNull(ideal[k]), diff_vs_ideal: null };
    if (values[k].ppm != null && values[k].ideal_ppm != null) {
      values[k].diff_vs_ideal = Math.round((values[k].ppm - values[k].ideal_ppm) * 10) / 10;
    }
  });
  keysAn.forEach((k) => {
    values[k] = { ppm: ppm(an, k, false), ideal_ppm: numOrNull(ideal[k]), diff_vs_ideal: null };
    if (values[k].ppm != null && values[k].ideal_ppm != null) {
      values[k].diff_vs_ideal = Math.round((values[k].ppm - values[k].ideal_ppm) * 10) / 10;
    }
  });
  return {
    ...analysisReportMeta(a),
    general: { ce_ds_m: numOrNull(g.ce), ph: numOrNull(g.ph), ras: numOrNull(g.ras) },
    nutrients_ppm: values,
    micros_ppm: a.micros || {}
  };
}

function summarizeExtractoPastaReport(a) {
  const g = a.general || {};
  const cat = a.cations || {};
  const an = a.anions || {};
  const ideal = a.ideal || {};
  return {
    ...analysisReportMeta(a),
    general: { ce: numOrNull(g.cee != null ? g.cee : g.ce), ph: numOrNull(g.phe != null ? g.phe : g.ph), ras: numOrNull(g.ras) },
    cations_ppm: { k: numOrNull(cat.k_ppm), ca: numOrNull(cat.ca_ppm), mg: numOrNull(cat.mg_ppm) },
    anions_ppm: { no3: numOrNull(an.no3_ppm), so4: numOrNull(an.so4_ppm) },
    ideal_ppm: ideal,
    diff_ppm: {
      k: numOrNull(cat.k_ppm) != null && numOrNull(ideal.k) != null ? numOrNull(cat.k_ppm) - numOrNull(ideal.k) : null,
      ca: numOrNull(cat.ca_ppm) != null && numOrNull(ideal.ca) != null ? numOrNull(cat.ca_ppm) - numOrNull(ideal.ca) : null,
      no3: numOrNull(an.no3_ppm) != null && numOrNull(ideal.no3) != null ? numOrNull(an.no3_ppm) - numOrNull(ideal.no3) : null
    }
  };
}

function summarizeAguaReport(a) {
  const cat = a.cations || {};
  const an = a.anions || {};
  const g = a.general || {};
  const micros = a.micros || {};
  return {
    ...analysisReportMeta(a),
    m3_riego: numOrNull(a.m3Riego),
    general: { ce: numOrNull(g.ce), ph: numOrNull(g.ph), ras: numOrNull(g.ras) },
    cations_ppm: {
      ca: numOrNull(cat.ca_ppm),
      mg: numOrNull(cat.mg_ppm),
      k: numOrNull(cat.k_ppm),
      na: numOrNull(cat.na_ppm)
    },
    anions: {
      no3_ppm: numOrNull(an.no3_ppm),
      so4_ppm: numOrNull(an.so4_ppm),
      hco3_meq: numOrNull(an.hco3_meq),
      co3_meq: numOrNull(an.co3_meq)
    },
    acid_residual_meq_L: numOrNull(a.acidResidualMeq),
    acid_id: a.acidId || null,
    micros_ppm: micros
  };
}

function summarizeFoliarReport(a) {
  const mac = a.macros || {};
  const mic = a.micros || {};
  const optMacro = a.optimalMacro || {};
  const optMicro = a.optimalMicro || {};
  const defMacro = { N: 3, P: 0.275, K: 2.5, Ca: 1.25, Mg: 0.4, S: 0.325 };
  const defMicro = { Fe: 150, Mn: 160, Zn: 60, Cu: 15, B: 62.5, Mo: 2.55 };
  const row = (val, opt, def, unit) => {
    const o = numOrNull(opt != null && opt !== '' ? opt : def);
    const v = numOrNull(val);
    return {
      value: v,
      optimal: o,
      unit,
      dop_percent: diffPct(v, o)
    };
  };
  const macros = {};
  ['N', 'P', 'K', 'Ca', 'Mg', 'S'].forEach((n) => {
    macros[n] = row(mac[n], optMacro[n], defMacro[n], '%');
  });
  const microsOut = {};
  ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'].forEach((n) => {
    microsOut[n] = row(mic[n], optMicro[n], defMicro[n], 'ppm');
  });
  return { ...analysisReportMeta(a), macros, micros: microsOut };
}

function summarizeFrutaReport(a) {
  const mac = a.macros || {};
  const mic = a.micros || {};
  const calidad = a.calidad || {};
  const calcio = a.calcio || {};
  const optMacro = a.optimalMacro || {};
  const optMicro = a.optimalMicro || {};
  const optCalidad = a.optimalCalidad || {};
  const optCalcio = a.optimalCalcio || {};
  const defMacro = { N: 1.8, P: 0.25, K: 1.5, Ca: 0.25, Mg: 0.2, S: 0.18 };
  const defMicro = { Fe: 80, Mn: 40, Zn: 35, Cu: 10, B: 50, Mo: 0.5 };
  const iccRow = (val, opt, def) => {
    const o = numOrNull(opt != null && opt !== '' ? opt : def);
    const v = numOrNull(val);
    return { value: v, optimal: o, icc_percent: diffPct(v, o) };
  };
  const macros = {};
  ['N', 'P', 'K', 'Ca', 'Mg', 'S'].forEach((n) => {
    macros[n] = iccRow(mac[n], optMacro[n], defMacro[n]);
  });
  const microsOut = {};
  ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'].forEach((n) => {
    microsOut[n] = iccRow(mic[n], optMicro[n], defMicro[n]);
  });
  const calidadOut = {};
  ['materiaSeca', 'brix', 'firmeza', 'acidezTitulable'].forEach((k) => {
    calidadOut[k] = iccRow(calidad[k], optCalidad[k], { materiaSeca: 15, brix: 12, firmeza: 5, acidezTitulable: 0.5 }[k]);
  });
  return {
    ...analysisReportMeta(a),
    macros,
    micros: microsOut,
    calidad: calidadOut,
    calcio: {
      caTotal: iccRow(calcio.caTotal, optCalcio.caTotal, 20),
      caSolublePct: iccRow(calcio.caSolublePct, optCalcio.caSolublePct, 18),
      caLigadoPct: iccRow(calcio.caLigadoPct, optCalcio.caLigadoPct, 25),
      caInsolublePct: iccRow(calcio.caInsolublePct, optCalcio.caInsolublePct, 55)
    }
  };
}

const ANALYSIS_SUMMARIZERS = {
  suelo: summarizeSoilAnalysisReport,
  solucion_nutritiva: summarizeSolucionReport,
  extracto_pasta: summarizeExtractoPastaReport,
  agua: summarizeAguaReport,
  foliar: summarizeFoliarReport,
  fruta: summarizeFrutaReport
};

function filterAnalysisReports(arr, params) {
  let list = arr.filter((a) => a && typeof a === 'object');
  const reportId = params && (params.report_id || params.analysis_id);
  if (reportId) {
    list = list.filter((a) => a.id === reportId);
  }
  if (params && (params.latest_only === true || params.latest_only === 'true') && list.length > 1) {
    list = list.slice().sort((a, b) => {
      const da = Date.parse(a.date || '') || 0;
      const db = Date.parse(b.date || '') || 0;
      return db - da;
    });
    list = list.slice(0, 1);
  }
  return list;
}

function summarizeAnalysisList(list, typeKey, params) {
  const cfg = ANALYSIS_TYPES[typeKey];
  const arr = filterAnalysisReports(Array.isArray(list) ? list : [], params || {});
  const summarize = ANALYSIS_SUMMARIZERS[typeKey];
  const reports = arr.map((a) => summarize(a));
  return {
    label: cfg.label,
    reports_count: reports.length,
    report_ids: arr.map((a) => a.id).filter(Boolean),
    reports
  };
}

function summarizeAllProjectAnalyses(data, params) {
  const d = data && typeof data === 'object' ? data : {};
  const out = {
    suelo_enmienda_inicial: summarizeSoil(d),
    note_suelo:
      'suelo_enmienda_inicial = pestaña Enmiendas. suelo_reportes = lista en Análisis → Suelo.'
  };
  Object.keys(ANALYSIS_TYPES).forEach((typeKey) => {
    const storageKey = ANALYSIS_TYPES[typeKey].key;
    out[typeKey === 'suelo' ? 'suelo_reportes' : typeKey] = summarizeAnalysisList(d[storageKey], typeKey, params);
  });
  const total = Object.keys(ANALYSIS_TYPES).reduce((n, tk) => {
    const k = tk === 'suelo' ? 'suelo_reportes' : tk;
    return n + (out[k] && out[k].reports_count ? out[k].reports_count : 0);
  }, 0);
  out.total_reports = total;
  return out;
}

async function handleProjectAnalyses(supabase, params) {
  const resolved = await resolveProject(supabase, params);
  if (!resolved.found) {
    return { ok: true, domain: 'nutriplant_analyses', ...resolved };
  }

  const row = resolved.project;
  const data = row.data || {};
  const profiles = await fetchProfiles(supabase);
  const prof = profiles.find((p) => p.id === row.user_id);
  const typeRaw = String(params.type || params.analysis_type || 'all')
    .toLowerCase()
    .replace(/\s+/g, '_');
  const all = summarizeAllProjectAnalyses(data, params);

  let analyses = all;
  if (typeRaw !== 'all' && typeRaw !== '') {
    const alias = {
      suelo: 'suelo_reportes',
      soil: 'suelo_reportes',
      solucion: 'solucion_nutritiva',
      nutritiva: 'solucion_nutritiva',
      pasta: 'extracto_pasta',
      extracto: 'extracto_pasta',
      water: 'agua',
      leaf: 'foliar',
      fruit: 'fruta'
    };
    const key = alias[typeRaw] || typeRaw;
    if (!all[key]) {
      return {
        ok: true,
        domain: 'nutriplant_analyses',
        error:
          'Tipo no válido. Usa: suelo, solucion_nutritiva, extracto_pasta, agua, foliar, fruta o all.'
      };
    }
    analyses = {
      total_reports: all[key].reports_count || 0,
      [key]: all[key],
      suelo_enmienda_inicial: key === 'suelo_reportes' ? all.suelo_enmienda_inicial : undefined
    };
    if (analyses.suelo_enmienda_inicial === undefined) delete analyses.suelo_enmienda_inicial;
  }

  return {
    ok: true,
    domain: 'nutriplant_analyses',
    project: {
      id: row.id,
      name: row.name || row.title || 'Sin nombre',
      crop: getProjectCrop(data),
      user_email: prof ? prof.email : null,
      user_name: prof ? prof.name : null
    },
    multiple_matches: resolved.multiple_matches || false,
    api_hint:
      'Valores desde Supabase projects.data. Filtros: type, report_id, latest_only. Catálogo/criterios: lab_analyses_catalog.',
    analyses
  };
}

function summarizeLocation(loc) {
  if (!loc || typeof loc !== 'object' || !loc.polygon || loc.polygon.length < 3) {
    return { has_polygon: false, message: 'Sin polígono guardado en Ubicación.' };
  }
  const center = loc.center;
  let centerStr = null;
  if (center) {
    const lat = asNum(Array.isArray(center) ? center[0] : center.lat);
    const lng = asNum(Array.isArray(center) ? center[1] : center.lng);
    if (lat != null && lng != null) centerStr = { lat, lng };
  }
  if (!centerStr) centerStr = getVpdLocationFromData({ location: loc });
  return {
    has_polygon: true,
    center: centerStr,
    elevation_m: asNum(loc.elevationM),
    area_hectares: loc.areaHectares,
    perimeter_m: loc.perimeter,
    vertices_count: Array.isArray(loc.polygon) ? loc.polygon.length : 0
  };
}

function summarizeVpdSaved(vpd) {
  if (!vpd || typeof vpd !== 'object') {
    return { has_data: false, message: 'Sin datos VPD guardados.' };
  }
  const out = { has_data: true, environmental: vpd.environmental || null, advanced: vpd.advanced || null };
  const hist = Array.isArray(vpd.history) ? vpd.history.length : 0;
  out.history_count = hist;
  const rangeTables = Array.isArray(vpd.rangeTables) ? vpd.rangeTables.length : 0;
  out.saved_range_tables_count = rangeTables;
  let maxVpd = null;
  const table = vpd.currentRangeTable;
  if (table && Array.isArray(table.summaryRows)) {
    table.summaryRows.forEach((row) => {
      const v = asNum(row.vpdMax != null ? row.vpdMax : row.maxVpd != null ? row.maxVpd : row.vpd);
      const at = row.at || row.date || row.datetime || null;
      if (v != null && (!maxVpd || v > maxVpd.vpd)) maxVpd = { vpd: v, at };
    });
  }
  if (maxVpd) out.max_vpd_from_current_range = maxVpd;
  return out;
}

const CLIMATE_MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const CLIMATE_MONTH_LABELS = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic'
};

function roundClimate1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function sumClimateMonths(monthsObj, maxMonth) {
  if (!monthsObj || typeof monthsObj !== 'object') return null;
  let t = 0;
  let n = 0;
  CLIMATE_MONTH_KEYS.forEach((k, i) => {
    if (maxMonth != null && i >= maxMonth) return;
    const v = Number(monthsObj[k]);
    if (Number.isFinite(v)) {
      t += v;
      n += 1;
    }
  });
  return n ? roundClimate1(t) : null;
}

function climateMonthsToRows(monthsObj, year, maxMonth) {
  if (!monthsObj) return [];
  return CLIMATE_MONTH_KEYS.map((k, i) => {
    if (maxMonth != null && i >= maxMonth) return null;
    const v = monthsObj[k];
    return {
      month: k,
      label: CLIMATE_MONTH_LABELS[k],
      year,
      mm: v != null && Number.isFinite(Number(v)) ? roundClimate1(v) : null
    };
  }).filter(Boolean);
}

function summarizeRainfallOrEt0(block, kind) {
  if (!block || typeof block !== 'object' || !block.monthsPrev) {
    return { has_data: false, message: 'Sin datos guardados. El usuario debe pulsar consultar en Clima → Lluvia y ET₀.' };
  }
  const maxMonth = new Date().getMonth() + 1;
  return {
    has_data: true,
    kind,
    unit: block.unit || 'mm',
    fetched_at: block.fetchedAt || null,
    previous_year: block.previousYear,
    current_year: block.currentYear,
    rows_previous_year: climateMonthsToRows(block.monthsPrev, block.previousYear, 12),
    rows_current_year: climateMonthsToRows(block.monthsCurr, block.currentYear, maxMonth),
    monthly_diff_mm: block.diff || null,
    total_previous_year_mm: sumClimateMonths(block.monthsPrev, 12),
    total_current_year_partial_mm: sumClimateMonths(block.monthsCurr, maxMonth)
  };
}

function summarizeClimateLiveReading(r) {
  if (!r || typeof r !== 'object') {
    return { has_data: false, message: 'Sin lectura de tiempo actual guardada.' };
  }
  return {
    has_data: true,
    fetched_at: r.fetchedAt || null,
    temperature_c: asNum(r.temperature),
    humidity_pct: asNum(r.humidity),
    shortwave_radiation_wm2: asNum(r.shortwaveRadiation),
    uv_index: asNum(r.uvIndex),
    dew_point_c: asNum(r.dewPoint),
    wind_speed_kmh: asNum(r.windSpeedKmh),
    wind_direction_deg: asNum(r.windDirection),
    cloud_cover_pct: asNum(r.cloudCover),
    note: 'Lectura guardada en Clima → Tiempo actual (satélite Open-Meteo en el centro del polígono).'
  };
}

function summarizeClimateAnalysis(ca) {
  if (!ca || typeof ca !== 'object') {
    return {
      has_data: false,
      message:
        'Sin bloque climateAnalysis. El suscriptor debe abrir Clima y guardar Lluvia/ET₀ o Tiempo actual.'
    };
  }
  const hasRain = !!(ca.rainfall && ca.rainfall.monthsPrev);
  const hasEt0 = !!(ca.et0 && ca.et0.monthsPrev);
  const hasLive = !!(ca.lastReading && ca.lastReading.fetchedAt);
  return {
    has_data: hasRain || hasEt0 || hasLive,
    last_updated: ca.lastUpdated || null,
    last_tab: ca.lastTab || null,
    rainfall: summarizeRainfallOrEt0(ca.rainfall, 'precipitation'),
    et0: summarizeRainfallOrEt0(ca.et0, 'et0_fao'),
    tiempo_actual_guardado: summarizeClimateLiveReading(ca.lastReading)
  };
}

function aggregateDailyByMonthClimate(dailyTimes, dailyValues, yearFilter) {
  const months = {};
  (dailyTimes || []).forEach((day, i) => {
    const d = String(day || '');
    if (d.length < 7) return;
    const y = parseInt(d.slice(0, 4), 10);
    if (yearFilter && y !== yearFilter) return;
    const m = d.slice(5, 7);
    const v = Number(dailyValues[i]);
    months[m] = (months[m] || 0) + (Number.isFinite(v) ? v : 0);
  });
  return months;
}

function climateMonthDiff(curr, prev) {
  const out = {};
  CLIMATE_MONTH_KEYS.forEach((k) => {
    const c = Number(curr[k]);
    const p = Number(prev[k]);
    if (!Number.isFinite(c) && !Number.isFinite(p)) out[k] = null;
    else out[k] = roundClimate1((Number.isFinite(c) ? c : 0) - (Number.isFinite(p) ? p : 0));
  });
  return out;
}

async function fetchOpenMeteoDailyClimate(lat, lng, startDate, endDate, useArchive) {
  const base = useArchive
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';
  const url =
    base +
    '?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lng) +
    '&start_date=' +
    encodeURIComponent(startDate) +
    '&end_date=' +
    encodeURIComponent(endDate) +
    '&daily=precipitation_sum,et0_fao_evapotranspiration' +
    '&timezone=auto';
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = data && (data.reason || data.error);
    throw new Error(reason ? String(reason) : 'Open-Meteo HTTP ' + res.status);
  }
  if (data && data.error) throw new Error(data.reason || data.error);
  const daily = data && data.daily;
  if (!daily || !Array.isArray(daily.time)) throw new Error('Sin datos diarios de clima');
  return daily;
}

async function fetchYearDailyClimate(lat, lng, year, endDateOverride) {
  const start = year + '-01-01';
  let end = endDateOverride || year + '-12-31';
  const today = new Date();
  const todayKey =
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0');
  if (end > todayKey) end = todayKey;
  const currYear = today.getFullYear();
  const useArchive = year < currYear || end <= todayKey;
  try {
    return await fetchOpenMeteoDailyClimate(lat, lng, start, end, useArchive);
  } catch (e) {
    if (useArchive) return await fetchOpenMeteoDailyClimate(lat, lng, start, end, false);
    throw e;
  }
}

async function fetchRainfallEt0FromOpenMeteo(lat, lng) {
  const now = new Date();
  const currYear = now.getFullYear();
  const prevYear = currYear - 1;
  const todayKey =
    currYear +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0');

  const [dailyPrev, dailyCurr] = await Promise.all([
    fetchYearDailyClimate(lat, lng, prevYear, prevYear + '-12-31'),
    fetchYearDailyClimate(lat, lng, currYear, todayKey)
  ]);

  const rainPrev = aggregateDailyByMonthClimate(dailyPrev.time, dailyPrev.precipitation_sum, prevYear);
  const rainCurr = aggregateDailyByMonthClimate(dailyCurr.time, dailyCurr.precipitation_sum, currYear);
  const et0Prev = aggregateDailyByMonthClimate(dailyPrev.time, dailyPrev.et0_fao_evapotranspiration, prevYear);
  const et0Curr = aggregateDailyByMonthClimate(dailyCurr.time, dailyCurr.et0_fao_evapotranspiration, currYear);

  const fetchedAt = new Date().toISOString();
  const rainfall = {
    fetchedAt,
    previousYear: prevYear,
    currentYear: currYear,
    monthsPrev: rainPrev,
    monthsCurr: rainCurr,
    diff: climateMonthDiff(rainCurr, rainPrev),
    unit: 'mm'
  };
  const et0 = {
    fetchedAt,
    previousYear: prevYear,
    currentYear: currYear,
    monthsPrev: et0Prev,
    monthsCurr: et0Curr,
    diff: climateMonthDiff(et0Curr, et0Prev),
    unit: 'mm'
  };

  return {
    source: 'open_meteo_live_query',
    note: 'No guardado en el proyecto; consulta en vivo para admin. Para lo que guardó el usuario usa mode=saved.',
    rainfall: summarizeRainfallOrEt0(rainfall, 'precipitation'),
    et0: summarizeRainfallOrEt0(et0, 'et0_fao')
  };
}

async function fetchClimateLiveFull(lat, lng) {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lng) +
    '&current=temperature_2m,relative_humidity_2m,shortwave_radiation,uv_index,dew_point_2m,wind_speed_10m,wind_direction_10m,cloud_cover' +
    '&wind_speed_unit=kmh';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
  const data = await res.json();
  const cur = data && data.current;
  if (!cur) throw new Error('Sin lectura actual');
  const reading = {
    fetchedAt: new Date().toISOString(),
    temperature: cur.temperature_2m,
    humidity: cur.relative_humidity_2m,
    shortwaveRadiation: cur.shortwave_radiation,
    uvIndex: cur.uv_index,
    dewPoint: cur.dew_point_2m,
    windSpeedKmh: cur.wind_speed_10m,
    windDirection: cur.wind_direction_10m,
    cloudCover: cur.cloud_cover
  };
  return {
    source: 'open_meteo_live_query',
    ...summarizeClimateLiveReading(reading),
    vpd_simple: calcVpdSimple(Number(reading.temperature), Number(reading.humidity))
  };
}

async function handleProjectClimate(supabase, params) {
  const resolved = await resolveProject(supabase, params);
  if (!resolved.found) {
    return { ok: true, domain: 'nutriplant_climate', ...resolved };
  }

  const row = resolved.project;
  const data = row.data || {};
  const loc = getVpdLocationFromData(data);
  const mode = String(params.mode || 'saved').toLowerCase();
  const profiles = await fetchProfiles(supabase);
  const prof = profiles.find((p) => p.id === row.user_id);

  const out = {
    ok: true,
    domain: 'nutriplant_climate',
    project: {
      id: row.id,
      name: row.name || row.title || 'Sin nombre',
      crop: getProjectCrop(data),
      user_email: prof ? prof.email : null,
      user_name: prof ? prof.name : null
    },
    multiple_matches: resolved.multiple_matches || false,
    has_polygon: projectHasPolygon(data),
    location_center: loc,
    mode
  };

  const wantSaved =
    mode === 'saved' || mode === 'all' || params.use_saved === true || params.use_saved === 'true';
  const wantLive =
    mode === 'live' || mode === 'all' || params.live === true || params.live === 'true';
  const wantRainRefresh =
    mode === 'rainfall_refresh' ||
    mode === 'rainfall' ||
    params.refresh_rainfall === true ||
    params.refresh_rainfall === 'true';

  if (wantSaved) {
    out.climate_saved = summarizeClimateAnalysis(data.climateAnalysis);
    out.vpd_tab_saved = summarizeVpdSaved(data.vpdAnalysis);
  }

  if (wantLive) {
    if (!loc) {
      out.tiempo_actual_ahora = {
        has_data: false,
        message: 'Sin polígono: no se puede consultar tiempo actual.'
      };
    } else {
      try {
        out.tiempo_actual_ahora = await fetchClimateLiveFull(loc.lat, loc.lng);
      } catch (e) {
        out.tiempo_actual_ahora = { has_data: false, error: e.message };
      }
    }
  }

  if (wantRainRefresh) {
    if (!loc) {
      out.lluvia_et0_ahora = { has_data: false, message: 'Sin polígono.' };
    } else {
      try {
        out.lluvia_et0_ahora = await fetchRainfallEt0FromOpenMeteo(loc.lat, loc.lng);
      } catch (e) {
        out.lluvia_et0_ahora = { has_data: false, error: e.message };
      }
    }
  }

  if (!wantSaved && !wantLive && !wantRainRefresh) {
    out.hint =
      'params.mode: saved (default), live, rainfall_refresh, o all. Ej: {"action":"project_climate","params":{"project_name":"X","mode":"all"}}';
  }

  return out;
}

function summarizeGranular(data) {
  const g = data && data.granular;
  if (!g || typeof g !== 'object') return { has_program: false };
  const prog = g.program;
  const apps = prog && Array.isArray(prog.applications) ? prog.applications : [];
  return {
    has_program: apps.length > 0 || !!(g.requirements || g.cropType),
    crop_type: g.cropType || null,
    applications_count: apps.length
  };
}

function calcVpdSimple(airTemp, humidity) {
  const es = 0.6108 * Math.exp((17.27 * airTemp) / (airTemp + 237.3));
  const ea = es * (humidity / 100);
  const vpd = es - ea;
  return { vpd: parseFloat(vpd.toFixed(2)), hd: parseFloat((vpd * 0.75).toFixed(2)) };
}

function calcLeafTemp(airTemp, solarRadiation) {
  const rad = Number(solarRadiation);
  const t = solarRadiation > 200 ? airTemp + ((rad - 200) * 0.6) / 100 : airTemp;
  return parseFloat(t.toFixed(1));
}

function calcVpdAdvanced(airTemp, airHumidity, leafTemp) {
  const esLeaf = 0.6108 * Math.exp((17.27 * leafTemp) / (leafTemp + 237.3));
  const esAir = 0.6108 * Math.exp((17.27 * airTemp) / (airTemp + 237.3));
  const ea = esAir * (airHumidity / 100);
  const vpd = esLeaf - ea;
  return { vpd: parseFloat(vpd.toFixed(2)), hd: parseFloat((vpd * 0.75).toFixed(2)) };
}

async function fetchWeather(lat, lng) {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' +
    encodeURIComponent(lat) +
    '&longitude=' +
    encodeURIComponent(lng) +
    '&current=temperature_2m,relative_humidity_2m,shortwave_radiation,uv_index';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo error ' + res.status);
  const data = await res.json();
  const cur = data && data.current;
  if (!cur) throw new Error('Clima no disponible');
  return {
    temperature: cur.temperature_2m,
    humidity: cur.relative_humidity_2m,
    shortwaveRadiation: asNum(cur.shortwave_radiation),
    uvIndex: asNum(cur.uv_index)
  };
}

async function resolveProject(supabase, params) {
  const id = (params.project_id || params.id || '').trim();
  const nameQ = (params.project_name || params.project || params.q || '').trim().toLowerCase();

  if (id) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, user_id, name, title, data, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error('project: ' + error.message);
    if (!data || isSoftDeletedProject(data)) {
      return { found: false, message: 'Proyecto no encontrado: ' + id };
    }
    return { found: true, project: data };
  }

  if (!nameQ) {
    return { found: false, error: 'Indica params.project_id o params.project_name (o q).' };
  }

  const projects = await fetchProjects(supabase);
  const matches = projects.filter((p) => {
    const n = (p.name || '').toLowerCase();
    const t = (p.title || '').toLowerCase();
    const pid = (p.id || '').toLowerCase();
    return n.includes(nameQ) || t.includes(nameQ) || pid.includes(nameQ) || n === nameQ;
  });
  if (matches.length === 0) {
    return { found: false, message: 'No se encontró proyecto con: ' + nameQ };
  }
  matches.sort((a, b) => {
    const ta = new Date(a.updated_at || 0).getTime();
    const tb = new Date(b.updated_at || 0).getTime();
    return tb - ta;
  });
  return {
    found: true,
    project: matches[0],
    multiple_matches: matches.length > 1,
    other_matches: matches.slice(1, 5).map((p) => ({
      id: p.id,
      name: p.name || p.title,
      crop: getProjectCrop(p.data)
    }))
  };
}

async function handleProjectDetail(supabase, params) {
  const resolved = await resolveProject(supabase, params);
  if (!resolved.found) return { ok: true, domain: 'nutriplant_projects', ...resolved };

  const row = resolved.project;
  const data = row.data || {};
  const profiles = await fetchProfiles(supabase);
  const prof = profiles.find((p) => p.id === row.user_id);

  const program = getFertirriegoProgram(data);
  const stageIdx = params.fertirriego_stage_index ?? params.stage_index;

  return {
    ok: true,
    domain: 'nutriplant_projects',
    project: {
      id: row.id,
      name: row.name || row.title || 'Sin nombre',
      crop: getProjectCrop(data),
      user_email: prof ? prof.email : null,
      user_name: prof ? prof.name : null,
      updated_at: row.updated_at
    },
    multiple_matches: resolved.multiple_matches || false,
    other_matches: resolved.other_matches || [],
    sections: {
      location: summarizeLocation(data.location),
      soil: summarizeSoil(data),
      analyses: summarizeAllProjectAnalyses(data),
      fertirriego: summarizeFertirriego(program, stageIdx),
      granular: summarizeGranular(data),
      vpd_saved: summarizeVpdSaved(data.vpdAnalysis),
      climate: summarizeClimateAnalysis(data.climateAnalysis)
    }
  };
}

async function handleProjectVpdLive(supabase, params) {
  const resolved = await resolveProject(supabase, params);
  if (!resolved.found) return { ok: true, domain: 'nutriplant_projects', ...resolved };

  const loc = getVpdLocationFromData(resolved.project.data || {});
  if (!loc) {
    return {
      ok: true,
      domain: 'nutriplant_projects',
      project_id: resolved.project.id,
      has_location: false,
      message: 'El proyecto no tiene polígono/ubicación para consultar clima.'
    };
  }

  const weather = await fetchWeather(loc.lat, loc.lng);
  const t = weather.temperature;
  const h = weather.humidity;
  const rad = weather.shortwaveRadiation;
  let vpdResult;
  let method = 'simple';
  if (rad != null && rad >= 0) {
    const leaf = calcLeafTemp(t, rad);
    vpdResult = calcVpdAdvanced(t, h, leaf);
    method = 'advanced_solar';
    vpdResult.leaf_temperature_c = leaf;
    vpdResult.shortwave_radiation_wm2 = rad;
  } else {
    vpdResult = calcVpdSimple(t, h);
  }

  return {
    ok: true,
    domain: 'nutriplant_projects',
    project_id: resolved.project.id,
    project_name: resolved.project.name,
    location: loc,
    weather,
    vpd_now: { ...vpdResult, method, unit: 'kPa' },
    optimal_range_kpa: '0.5 - 1.5',
    fetched_at: new Date().toISOString()
  };
}

/* ——— Fase 3: Plan PRO (cerebro digital) ——— */
const PLAN_PRO_ITEM_SELECT =
  'id,title,area_id,category_id,status,priority,thought_type,captured_at,due_at,next_action,relation_tags,body_plain,body_html,body_blocks,attachments,updated_at,closed_at';

const PLAN_PRO_NOTE_IMAGE_BUCKET = 'plan-pro-note-images';

function stripHtmlSimple(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Renglones no vacíos de body_plain (texto real del apunte). */
function bodyPlainAsLines(plain) {
  return String(plain || '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Vista corta para listados: conserva renglones (no los fusiona en una sola línea). */
function notePreviewMultiline(plain, html, maxLen) {
  const max = maxLen != null ? maxLen : 200;
  let lines = bodyPlainAsLines(plain);
  if (!lines.length && html) {
    lines = String(stripHtmlSimple(html))
      .split(/\s+/)
      .filter(Boolean);
  }
  const joined = lines.join(' · ');
  return joined.length <= max ? joined : joined.slice(0, max) + '…';
}

function htmlTagAttr(tag, name) {
  const re = new RegExp(name + '\\s*=\\s*["\']([^"\']*)', 'i');
  const m = String(tag).match(re);
  return m ? m[1] : '';
}

/** Semáforos + fecha incrustados en la nota (.np-rich-due), igual que en planpro/index.html */
function extractRichDueMarkersFromHtml(html) {
  const out = [];
  if (!html || !String(html).trim()) return out;
  const re = /<[^>]*\bnp-rich-due\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const date = htmlTagAttr(tag, 'data-np-due-date');
    if (!date) continue;
    const lv = priorityLevelFromRaw(htmlTagAttr(tag, 'data-np-due-level'));
    out.push({
      date,
      label: htmlTagAttr(tag, 'data-np-due-label') || date,
      priority_level: lv,
      semaforo: lv || 'sin_prioridad',
      due_id: htmlTagAttr(tag, 'data-np-due-id') || null
    });
  }
  return out;
}

function normalizePlanProImageUrl(src) {
  const s = String(src || '').trim();
  if (!s || s.indexOf('javascript:') === 0 || s.indexOf('data:') === 0) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  if (!base) return s.startsWith('/') ? null : s;
  if (s.indexOf('/storage/v1/object/public/') >= 0) return base + (s.startsWith('/') ? s : '/' + s);
  const path = s.replace(/^\//, '');
  if (path.indexOf(PLAN_PRO_NOTE_IMAGE_BUCKET + '/') === 0) {
    return base + '/storage/v1/object/public/' + path;
  }
  return s;
}

function extractImageUrlsFromHtml(html) {
  const urls = [];
  if (!html || !String(html).trim()) return urls;
  const re = /<img[^>]+>/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = htmlTagAttr(m[0], 'src');
    const url = normalizePlanProImageUrl(src);
    if (url) {
      urls.push({
        url,
        alt: htmlTagAttr(m[0], 'alt') || ''
      });
    }
  }
  return urls;
}

function collectPlanProImages(item) {
  const seen = new Set();
  const images = [];
  function push(img) {
    if (!img.url || seen.has(img.url)) return;
    seen.add(img.url);
    images.push(img);
  }
  extractImageUrlsFromHtml(item.body_html).forEach(push);
  (item.body_blocks || []).forEach((b) => {
    if (b && b.type === 'note_section') extractImageUrlsFromHtml(b.html).forEach(push);
  });
  (item.attachments || []).forEach((att) => {
    if (!att || typeof att !== 'object') return;
    const url = normalizePlanProImageUrl(att.url || att.public_url || att.path);
    if (url) push({ url, alt: att.name || att.alt || '' });
  });
  return images;
}

function collectAllRichDueMarkers(item) {
  const markers = extractRichDueMarkersFromHtml(item.body_html).map((m) => ({
    ...m,
    location: 'nota_principal'
  }));
  (item.body_blocks || []).forEach((b, bi) => {
    if (!b || b.type !== 'note_section' || !b.html) return;
    extractRichDueMarkersFromHtml(b.html).forEach((m) => {
      markers.push({
        ...m,
        location: 'bloque_nota',
        block_index: bi,
        block_title: b.title || ''
      });
    });
  });
  return markers;
}

function padRowCells(row, ncol) {
  const arr = Array.isArray(row) ? row.slice() : row && row.cells ? row.cells.slice() : [];
  while (arr.length < ncol) arr.push('');
  return arr;
}

function ledgerCellNumber(arr, colIndex) {
  if (!Array.isArray(arr) || colIndex == null || colIndex < 0 || colIndex >= arr.length) return 0;
  const v = parseFloat(String(arr[colIndex] != null ? arr[colIndex] : '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
}

function ledgerGetDerivedSpec(b, colIndex) {
  if (!b || !b.ledgerDerivedByCol || typeof b.ledgerDerivedByCol !== 'object') return null;
  let o = b.ledgerDerivedByCol[colIndex];
  if (o == null) o = b.ledgerDerivedByCol[String(colIndex)];
  return o && typeof o === 'object' ? o : null;
}

function ledgerHealDiffIndices(b, nh, left, right) {
  let la = parseInt(String(left).trim(), 10);
  let rb = parseInt(String(right).trim(), 10);
  if (Number.isNaN(la) || Number.isNaN(rb) || la < 0 || rb < 0 || la >= nh || rb >= nh) return null;
  if (la === 0 && b && b.colKinds && b.colKinds[0] === 'text' && nh >= 3) {
    la = 1;
    if (rb <= la && la + 1 < nh) rb = la + 1;
  }
  if (la === rb) return null;
  return { left: la, right: rb };
}

function ledgerHeaderSuggestsMoneyColumn(h) {
  const s = String(h == null ? '' : h)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || s === '%') return false;
  if (/^(monto|importe|pagado|precio|subtotal|iva|isr|ret\.|retenc)/.test(s)) return true;
  if (/\b(monto|importe|pagado|precio|subtotal|eur|usd|mxn|\$|€)\b/.test(s)) return true;
  return false;
}

function ledgerHealSumColIndices(b, nh, derivedCi, colsParsed) {
  if (!colsParsed || !colsParsed.length || derivedCi == null || nh < 1) return colsParsed ? colsParsed.slice() : [];
  const out = colsParsed.slice();
  if (out.length !== 1) return out;
  const k0 = out[0];
  if (k0 < 1 || k0 >= derivedCi) return out;
  const cands = [];
  for (let ii = 1; ii < derivedCi; ii++) {
    if (ledgerGetDerivedSpec(b, ii)) continue;
    const fk0 = b.colKinds && b.colKinds[ii];
    if (fk0 === 'pct') continue;
    if (fk0 === 'currency' || fk0 === 'number') cands.push(ii);
    else if (b.headers && ledgerHeaderSuggestsMoneyColumn(b.headers[ii])) cands.push(ii);
  }
  if (cands.length >= 2 && k0 === cands[cands.length - 1]) return cands.slice();
  return out;
}

function computeLedgerDerived(arr, spec, b, derivedColIdx) {
  if (!spec || !spec.op || !Array.isArray(arr)) return NaN;
  const nh = Math.max(arr.length, (b && b.headers && b.headers.length) || 0);
  if (spec.op === 'diff') {
    let la;
    let rb;
    if (b && b.headers && b.headers.length) {
      const pair = ledgerHealDiffIndices(b, nh, spec.left, spec.right);
      if (!pair) return NaN;
      la = pair.left;
      rb = pair.right;
    } else {
      la = parseInt(String(spec.left).trim(), 10);
      rb = parseInt(String(spec.right).trim(), 10);
      if (Number.isNaN(la) || Number.isNaN(rb)) return NaN;
    }
    return ledgerCellNumber(arr, la) - ledgerCellNumber(arr, rb);
  }
  if (spec.op === 'arith') {
    let la;
    let rb;
    if (b && b.headers && b.headers.length) {
      const pair = ledgerHealDiffIndices(b, nh, spec.left, spec.right);
      if (!pair) return NaN;
      la = pair.left;
      rb = pair.right;
    } else {
      la = parseInt(String(spec.left).trim(), 10);
      rb = parseInt(String(spec.right).trim(), 10);
      if (Number.isNaN(la) || Number.isNaN(rb)) return NaN;
    }
    const opCh = String(spec.operator || '+').trim();
    const La = ledgerCellNumber(arr, la);
    const Rb = ledgerCellNumber(arr, rb);
    if (opCh === '+') return La + Rb;
    if (opCh === '-') return La - Rb;
    if (opCh === '*') return La * Rb;
    if (opCh === '/') return Rb === 0 ? NaN : La / Rb;
    return NaN;
  }
  if (spec.op === 'sum' && spec.cols && spec.cols.length) {
    const rawList = spec.cols
      .map((c) => parseInt(String(c).trim(), 10))
      .filter((x) => !Number.isNaN(x) && x >= 0 && x < nh);
    if (!rawList.length) return NaN;
    const colList =
      typeof derivedColIdx === 'number' && derivedColIdx >= 0 && b && b.headers && b.colKinds
        ? ledgerHealSumColIndices(b, nh, derivedColIdx, rawList)
        : rawList;
    let t = 0;
    colList.forEach((ci) => {
      t += ledgerCellNumber(arr, ci);
    });
    return t;
  }
  if (spec.op === 'product' && spec.cols && spec.cols.length >= 2) {
    let p = ledgerCellNumber(arr, parseInt(spec.cols[0], 10));
    for (let j = 1; j < spec.cols.length; j++) p *= ledgerCellNumber(arr, parseInt(spec.cols[j], 10));
    return p;
  }
  if (spec.op === 'copy') {
    return ledgerCellNumber(arr, parseInt(spec.col, 10));
  }
  return NaN;
}

function describeLedgerFormula(spec, headers) {
  if (!spec || !spec.op) return null;
  const h = (i) => (headers && headers[i]) || 'Col' + (i + 1);
  if (spec.op === 'sum') {
    return { op: 'sum', label: 'Suma', columns: (spec.cols || []).map((i) => h(parseInt(i, 10))) };
  }
  if (spec.op === 'diff') {
    return { op: 'diff', label: 'Resta', left: h(parseInt(spec.left, 10)), right: h(parseInt(spec.right, 10)) };
  }
  if (spec.op === 'product') {
    return { op: 'product', label: 'Producto', columns: (spec.cols || []).map((i) => h(parseInt(i, 10))) };
  }
  if (spec.op === 'copy') {
    return { op: 'copy', label: 'Copia', column: h(parseInt(spec.col, 10)) };
  }
  if (spec.op === 'arith') {
    return {
      op: 'arith',
      label: 'Operación',
      left: h(parseInt(spec.left, 10)),
      operator: spec.operator || '+',
      right: h(parseInt(spec.right, 10))
    };
  }
  return { op: spec.op, raw: spec };
}

function buildLedgerComputedForRow(b, row) {
  const headers = Array.isArray(b.headers) ? b.headers : [];
  const ncol = headers.length;
  const arr = padRowCells(row, ncol);
  const computed = {};
  if (!b.ledgerDerivedByCol || typeof b.ledgerDerivedByCol !== 'object') return computed;
  Object.keys(b.ledgerDerivedByCol).forEach((k) => {
    const colIx = parseInt(k, 10);
    if (Number.isNaN(colIx) || colIx < 0 || colIx >= ncol) return;
    const spec = ledgerGetDerivedSpec(b, colIx);
    if (!spec) return;
    const v = computeLedgerDerived(arr, spec, b, colIx);
    if (!Number.isFinite(v) || Number.isNaN(v)) return;
    const key = headers[colIx] || 'Col' + (colIx + 1);
    computed[key] = Math.round(v * 100) / 100;
  });
  return computed;
}

async function getPlanProOwnerId(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, is_admin')
    .or('is_admin.eq.true,email.eq.admin@nutriplantpro.com')
    .limit(5);
  if (error) throw new Error('plan_pro owner: ' + error.message);
  const rows = data || [];
  const admin = rows.find((p) => p.is_admin) || rows.find((p) => (p.email || '').toLowerCase() === ADMIN_EMAIL_LC);
  return admin ? admin.id : null;
}

async function fetchPlanProAreas(supabase, ownerId) {
  const { data, error } = await supabase
    .from('plan_pro_areas')
    .select('id,title,slug,color_hex,archived_at')
    .eq('owner_id', ownerId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true });
  if (error) throw new Error('plan_pro_areas: ' + error.message);
  return data || [];
}

async function fetchPlanProCategories(supabase) {
  const { data, error } = await supabase
    .from('plan_pro_categories')
    .select('id,title,area_id,parent_id,archived_at')
    .is('archived_at', null)
    .order('sort_order', { ascending: true });
  if (error) throw new Error('plan_pro_categories: ' + error.message);
  return data || [];
}

function areaMapById(areas) {
  const m = {};
  (areas || []).forEach((a) => {
    m[a.id] = a;
  });
  return m;
}

function categoryTitleById(categories, catId) {
  if (!catId) return null;
  const c = (categories || []).find((x) => x.id === catId);
  return c ? c.title : null;
}

function parseIsoDateOnly(s) {
  if (!s) return null;
  const d = new Date(String(s).length <= 10 ? String(s) + 'T12:00:00' : s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function dateOnlyKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function weekRangeFromToday(daysAhead) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + Math.max(1, daysAhead) - 1);
  return { start: today, end, startKey: dateOnlyKey(today), endKey: dateOnlyKey(end) };
}

function priorityLevelFromRaw(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (!v) return '';
  if (/alta|high|urgente|critical|p1/.test(v)) return 'alta';
  if (/media|med|normal|p2/.test(v)) return 'media';
  if (/baja|low|p3/.test(v)) return 'baja';
  return '';
}

function columnLooksLikePriorityHeader(h) {
  const s = String(h || '').toLowerCase();
  return /prioridad|prio|urgencia|importancia/.test(s);
}

function columnLooksLikeDoneHeader(h) {
  const s = String(h || '').toLowerCase();
  return /done|hecho|listo|\bok\b|complet/.test(s);
}

function columnLooksLikeDateHeader(h) {
  const s = String(h || '').toLowerCase();
  return /fecha|date|vence|deadline|objetivo/.test(s);
}

function resolvePriorityColIndex(block, headers) {
  const hs = Array.isArray(headers) ? headers : [];
  let idx = hs.findIndex((h) => columnLooksLikePriorityHeader(h));
  if (idx >= 0) return idx;
  if (block.variant === 'tasks') return 2;
  if (block.variant === 'smart') return 2;
  return -1;
}

function resolveDoneColIndex(block, headers) {
  const hs = Array.isArray(headers) ? headers : [];
  let idx = hs.findIndex((h) => columnLooksLikeDoneHeader(h));
  if (idx >= 0) return idx;
  if (block.variant === 'tasks' || block.variant === 'smart') return 3;
  return -1;
}

function resolveDateColIndex(headers) {
  const hs = Array.isArray(headers) ? headers : [];
  return hs.findIndex((h) => columnLooksLikeDateHeader(h));
}

function rowCellsAsObject(headers, row) {
  const cells = Array.isArray(row) ? row : row && row.cells ? row.cells : [];
  const obj = {};
  const hs = Array.isArray(headers) ? headers : [];
  const n = Math.max(hs.length, cells.length);
  for (let i = 0; i < n; i++) {
    const key = hs[i] || 'Col' + (i + 1);
    obj[key] = cells[i] != null ? String(cells[i]) : '';
  }
  return obj;
}

function isRowDone(block, row, ri, doneCol) {
  if (block.rowDone && block.rowDone[ri] === true) return true;
  const cells = Array.isArray(row) ? row : [];
  if (doneCol < 0) return false;
  const cellDone = String(cells[doneCol] || '').toLowerCase();
  return cellDone === 'sí' || cellDone === 'si' || cellDone === '1' || cellDone === 'true' || cellDone === 'yes';
}

const PLAN_PRO_MAX_TABLE_ROWS = 60;

function expandBodyBlocksForApi(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return { blocks_count: 0, blocks: [] };
  }
  const out = [];
  blocks.forEach((b, i) => {
    if (!b || typeof b !== 'object') return;
    if (b.type === 'note_section') {
      const text = stripHtmlSimple(b.html || '');
      out.push({
        index: i,
        type: 'note_section',
        title: b.title || '',
        text: text.slice(0, 6000),
        semaforos_en_nota: extractRichDueMarkersFromHtml(b.html),
        images: extractImageUrlsFromHtml(b.html)
      });
      return;
    }
    if (b.type !== 'mini_sheet') return;

    const headers = Array.isArray(b.headers) ? b.headers : [];
    const allRows = Array.isArray(b.rows) ? b.rows : [];
    const prioCol = resolvePriorityColIndex(b, headers);
    const doneCol = resolveDoneColIndex(b, headers);
    const dateCol = resolveDateColIndex(headers);
    const truncated = allRows.length > PLAN_PRO_MAX_TABLE_ROWS;

    const entry = {
      index: i,
      type: 'mini_sheet',
      variant: b.variant || 'free',
      title: b.title || '',
      headers,
      col_kinds: Array.isArray(b.colKinds) ? b.colKinds : [],
      rows_count: allRows.length,
      rows: []
    };

    if (b.ledgerDerivedByCol && typeof b.ledgerDerivedByCol === 'object') {
      entry.formulas = {};
      Object.keys(b.ledgerDerivedByCol).forEach((k) => {
        const colIx = parseInt(k, 10);
        const spec = ledgerGetDerivedSpec(b, colIx);
        if (spec) {
          const colName = headers[colIx] || 'Col' + (colIx + 1);
          entry.formulas[colName] = describeLedgerFormula(spec, headers);
        }
      });
    }

    const rowsSlice = truncated ? allRows.slice(0, PLAN_PRO_MAX_TABLE_ROWS) : allRows;
    rowsSlice.forEach((row, ri) => {
      const cellsObj = rowCellsAsObject(headers, row);
      const cells = Array.isArray(row) ? row : [];
      const prioRaw = prioCol >= 0 ? cells[prioCol] : '';
      const rowEntry = {
        row_index: ri + 1,
        cells: cellsObj,
        priority_raw: prioRaw != null ? String(prioRaw) : '',
        priority_level: priorityLevelFromRaw(prioRaw),
        semaforo: priorityLevelFromRaw(prioRaw) || 'sin_prioridad',
        done: isRowDone(b, row, ri, doneCol),
        date: dateCol >= 0 && cells[dateCol] != null ? String(cells[dateCol]) : ''
      };
      if (b.variant === 'smart' && b.rowKinds && b.rowKinds[ri]) {
        rowEntry.row_kind = b.rowKinds[ri];
      }
      const computed = buildLedgerComputedForRow(b, row);
      if (Object.keys(computed).length) rowEntry.computed_cells = computed;
      entry.rows.push(rowEntry);
    });

    if (truncated) {
      entry.rows_truncated = true;
      entry.rows_omitted = allRows.length - PLAN_PRO_MAX_TABLE_ROWS;
    }

    if (b.variant === 'ledger' && allRows.length) {
      const montoCol = typeof b.montoCol === 'number' ? b.montoCol : 1;
      let sum = 0;
      allRows.forEach((row) => {
        const cells = Array.isArray(row) ? row : [];
        const n = parseFloat(String(cells[montoCol] || '').replace(/[^\d.-]/g, ''));
        if (Number.isFinite(n)) sum += n;
      });
      entry.ledger_sum = Math.round(sum * 100) / 100;
    }

    let open = 0;
    entry.rows.forEach((r) => {
      if (!r.done && Object.values(r.cells).some((v) => String(v).trim())) open += 1;
    });
    entry.open_rows = open;

    out.push(entry);
  });
  return { blocks_count: blocks.length, blocks: out };
}

function summarizeBodyBlocks(blocks) {
  const full = expandBodyBlocksForApi(blocks);
  return {
    blocks_count: full.blocks_count,
    blocks: full.blocks.map((b) => {
      if (b.type === 'note_section') {
        return {
          index: b.index,
          type: b.type,
          title: b.title,
          text_preview: (b.text || '').slice(0, 400)
        };
      }
      return {
        index: b.index,
        type: b.type,
        variant: b.variant,
        title: b.title,
        rows_count: b.rows_count,
        open_rows: b.open_rows,
        ledger_sum: b.ledger_sum
      };
    })
  };
}

function planProItemListRow(item, areasById, categories) {
  const area = areasById[item.area_id];
  const lv = priorityLevelFromRaw(item.priority);
  return {
    id: item.id,
    title: item.title || '(sin título)',
    area: area ? area.title : null,
    area_slug: area ? area.slug : null,
    category: categoryTitleById(categories, item.category_id),
    status: item.status,
    priority: item.priority,
    priority_level: lv,
    semaforo_apunte: lv || 'sin_prioridad',
    thought_type: item.thought_type,
    due_at: item.due_at,
    fecha_objetivo_apunte: item.due_at || null,
    captured_at: item.captured_at,
    next_action: item.next_action,
    relation_tags: item.relation_tags || [],
    preview: notePreviewMultiline(item.body_plain, item.body_html, 200),
    preview_note:
      'preview une renglones con · ; el texto completo está en body_plain (plan_pro_item) o body_plain_lines.',
    updated_at: item.updated_at
  };
}

function itemMatchesSearch(item, qLc, areasById) {
  if (!qLc) return true;
  const area = areasById[item.area_id];
  const hay = [
    item.title,
    item.body_plain,
    stripHtmlSimple(item.body_html),
    item.next_action,
    item.status,
    item.priority,
    item.thought_type,
    area && area.title,
    area && area.slug,
    ...(item.relation_tags || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(qLc);
}

async function fetchPlanProItems(supabase, ownerId, opts) {
  opts = opts || {};
  let q = supabase.from('plan_pro_items').select(PLAN_PRO_ITEM_SELECT).eq('owner_id', ownerId);
  if (opts.area_id) q = q.eq('area_id', opts.area_id);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.thought_type) q = q.eq('thought_type', opts.thought_type);
  if (opts.open_only) q = q.is('closed_at', null);
  q = q.order('due_at', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: false });
  const limit = Math.min(parseInt(opts.limit, 10) || 80, 120);
  q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw new Error('plan_pro_items: ' + error.message);
  return data || [];
}

async function handlePlanProWeek(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }

  const daysAhead = Math.min(Math.max(parseInt(params.days_ahead, 10) || 7, 1), 31);
  const includeOverdue = params.include_overdue !== false && params.include_overdue !== 'false';
  const range = weekRangeFromToday(daysAhead);

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  let areaId = (params.area_id || '').trim();
  if (!areaId && params.area_slug) {
    const slug = String(params.area_slug).toLowerCase();
    const a = areas.find((x) => (x.slug || '').toLowerCase() === slug);
    if (a) areaId = a.id;
  }

  const items = await fetchPlanProItems(supabase, ownerId, {
    area_id: areaId || undefined,
    open_only: true,
    limit: 120
  });
  const categories = await fetchPlanProCategories(supabase);

  const dueThisWindow = [];
  const overdue = [];
  const noDue = [];

  items.forEach((item) => {
    const due = parseIsoDateOnly(item.due_at);
    const row = planProItemListRow(item, areasById, categories);
    if (!due) {
      noDue.push(row);
      return;
    }
    const key = dateOnlyKey(due);
    if (key >= range.startKey && key <= range.endKey) {
      dueThisWindow.push(row);
    } else if (includeOverdue && key < range.startKey) {
      overdue.push(row);
    }
  });

  return {
    ok: true,
    domain: 'plan_pro',
    window: {
      from: range.startKey,
      to: range.endKey,
      days_ahead: daysAhead
    },
    counts: {
      due_in_window: dueThisWindow.length,
      overdue: overdue.length,
      open_without_due: noDue.length
    },
    due_in_window: dueThisWindow,
    overdue: overdue.slice(0, 25),
    open_without_due: noDue.slice(0, 15)
  };
}

async function handlePlanProSearch(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }

  const q = (params.q || params.search || '').trim().toLowerCase();
  if (!q) {
    return { ok: true, domain: 'plan_pro', error: 'Indica params.q o params.search (texto a buscar).' };
  }

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  let areaId = (params.area_id || '').trim();
  if (!areaId && params.area_slug) {
    const slug = String(params.area_slug).toLowerCase();
    const a = areas.find((x) => (x.slug || '').toLowerCase() === slug);
    if (a) areaId = a.id;
  }

  const items = await fetchPlanProItems(supabase, ownerId, {
    area_id: areaId || undefined,
    status: params.status,
    thought_type: params.thought_type,
    limit: params.limit || 60
  });
  const categories = await fetchPlanProCategories(supabase);
  const tags = params.tags
    ? String(params.tags)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const matches = items.filter((item) => {
    if (!itemMatchesSearch(item, q, areasById)) return false;
    if (tags.length) {
      const itemTags = (item.relation_tags || []).map((t) => String(t).toLowerCase());
      if (!tags.some((t) => itemTags.some((it) => it.includes(t)))) return false;
    }
    return true;
  });

  return {
    ok: true,
    domain: 'plan_pro',
    query: q,
    count: matches.length,
    items: matches.slice(0, 30).map((item) => planProItemListRow(item, areasById, categories))
  };
}

function normalizePlanProPriorityInput(raw) {
  if (raw == null || raw === '') return null;
  const lv = priorityLevelFromRaw(raw);
  if (lv === 'alta') return 'Alta';
  if (lv === 'media') return 'Media';
  if (lv === 'baja') return 'Baja';
  const s = String(raw).trim();
  return s || null;
}

const NP_RICH_DUE_MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const RE_SEM_TOKEN = /\[\[sem:(\d{4}-\d{2}-\d{2})(?::(alta|media|baja))?\]\]/gi;

const NOTE_COLOR_HEX = {
  blue: '#2563eb',
  azul: '#2563eb',
  green: '#16a34a',
  verde: '#16a34a',
  red: '#dc2626',
  rojo: '#dc2626',
  black: '#0f172a',
  negro: '#0f172a',
  gray: '#64748b',
  grey: '#64748b',
  gris: '#64748b',
  yellow: '#b45309',
  amarillo: '#b45309',
  purple: '#7c3aed',
  morado: '#7c3aed'
};

const NOTE_SIZE_CLASS = {
  sm: 'np-rich-fs-sm',
  peq: 'np-rich-fs-sm',
  md: 'np-rich-fs-md',
  l: 'np-rich-fs-lg',
  lg: 'np-rich-fs-lg',
  xl: 'np-rich-fs-xl'
};

function npRichDueNewId() {
  return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatRichDueDateLabel(dateKey) {
  const dk = parsePlanProDueDateParam(dateKey);
  if (!dk) return '';
  const p = dk.split('-').map(Number);
  if (p.length !== 3 || !p[1] || p[1] < 1 || p[1] > 12) return dk;
  return p[2] + ' ' + NP_RICH_DUE_MONTH_SHORT[p[1] - 1];
}

/** Chip 🚦 idéntico al editor Plan PRO (.np-rich-due). */
function buildRichDueMarkerHtml(dateKey, level) {
  const dk = parsePlanProDueDateParam(dateKey);
  if (!dk) return '';
  const lv = priorityLevelFromRaw(level) || 'media';
  const label = formatRichDueDateLabel(dk);
  const uid = npRichDueNewId();
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  return (
    `<span class="np-rich-due np-rich-due--${lv}" contenteditable="false" data-np-due-id="${esc(uid)}" data-np-due-date="${esc(dk)}" data-np-due-level="${esc(lv)}" data-np-due-label="${esc(label)}" title="Semáforo ${esc(lv)} · ${esc(dk)}"><span class="np-rich-due-dot"></span>${esc(label)}</span>&nbsp;`
  );
}

function segmentAuthorInline(text) {
  const parts = [];
  const s = String(text || '');
  let last = 0;
  const re =
    /\[\[sem:(\d{4}-\d{2}-\d{2})(?::(alta|media|baja))?\]\]|\[\[(?:warn|importante)\]\]|\[\[(?:star|destacado)\]\]/gi;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ type: 'text', value: s.slice(last, m.index) });
    const tok = m[0].toLowerCase();
    if (tok.indexOf('[sem:') === 0) parts.push({ type: 'sem', date: m[1], level: m[2] || 'media' });
    else if (/warn|importante/.test(tok)) parts.push({ type: 'warn' });
    else parts.push({ type: 'star' });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ type: 'text', value: s.slice(last) });
  if (!parts.length && s) parts.push({ type: 'text', value: s });
  return parts;
}

function noteColorToStyle(nameOrHex) {
  const raw = String(nameOrHex || '').trim().toLowerCase();
  if (!raw) return '';
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return `color:${raw}`;
  const hex = NOTE_COLOR_HEX[raw];
  return hex ? `color:${hex}` : '';
}

function replacePairedAuthorTags(s, tag, wrapFn) {
  const re = new RegExp(`\\[\\[${tag}(?::([^\\]]+))?\\]\\]([\\s\\S]*?)\\[\\[\\/${tag}\\]\\]`, 'gi');
  return s.replace(re, (_, opt, inner) => wrapFn(opt, inner));
}

function formatMarkdownInline(s) {
  let t = String(s || '');
  t = replacePairedAuthorTags(t, 'color', (opt, inner) => {
    const st = noteColorToStyle(opt);
    const body = formatMarkdownInline(inner);
    return st ? `<span style="${st.replace(/"/g, '&quot;')}">${body}</span>` : body;
  });
  t = replacePairedAuthorTags(t, 'size', (opt, inner) => {
    const cls = NOTE_SIZE_CLASS[String(opt || '').trim().toLowerCase()] || 'np-rich-fs-md';
    return `<span class="${cls}">${formatMarkdownInline(inner)}</span>`;
  });
  t = replacePairedAuthorTags(t, 'b', (_, inner) => `<strong>${formatMarkdownInline(inner)}</strong>`);
  t = replacePairedAuthorTags(t, 'i', (_, inner) => `<em>${formatMarkdownInline(inner)}</em>`);
  t = replacePairedAuthorTags(t, 'u', (_, inner) => `<u>${formatMarkdownInline(inner)}</u>`);
  t = replacePairedAuthorTags(t, 's', (_, inner) => `<s>${formatMarkdownInline(inner)}</s>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, (_, x) => `<strong>${htmlEscapePlain(x)}</strong>`);
  t = t.replace(/__([^_]+)__/g, (_, x) => `<u>${htmlEscapePlain(x)}</u>`);
  t = t.replace(/~~([^~]+)~~/g, (_, x) => `<s>${htmlEscapePlain(x)}</s>`);
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, (_, pre, x) => `${pre}<em>${htmlEscapePlain(x)}</em>`);
  if (!/<[a-z]/i.test(t)) return htmlEscapePlain(t);
  return t;
}

function inlineAuthorToHtml(s) {
  const parts = segmentAuthorInline(s);
  return parts
    .map((p) => {
      if (p.type === 'sem') return buildRichDueMarkerHtml(p.date, p.level);
      if (p.type === 'warn') return '<span class="np-rich-flag">⚠︎ Importante</span>&nbsp;';
      if (p.type === 'star') return '<span class="np-rich-flag np-rich-flag-star">★ Destacado</span>&nbsp;';
      return formatMarkdownInline(p.value);
    })
    .join('');
}

function parseAuthorBlock(block) {
  const raw = String(block || '').trim();
  if (!raw) return '';
  const lines = raw.split(/\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  if (!nonEmpty.length) return '<p><br></p>';

  if (nonEmpty.length === 1) {
    const one = nonEmpty[0];
    const h2m = /^(?:##\s+|\[\[h2\]\])([\s\S]*?)(?:\[\[\/h2\]\])?$/i.exec(one);
    if (h2m) return `<h2>${inlineAuthorToHtml(h2m[1].trim())}</h2>`;
    const h3m = /^(?:###\s+|\[\[h3\]\])([\s\S]*?)(?:\[\[\/h3\]\])?$/i.exec(one);
    if (h3m) return `<h3>${inlineAuthorToHtml(h3m[1].trim())}</h3>`;
  }

  if (/^\[\[diagram\]\]$/i.test(nonEmpty[0]) || /^\[\[lista diagrama\]\]$/i.test(nonEmpty[0])) {
    const items = nonEmpty.slice(1);
    const lis = items.length
      ? items.map((it) => `<li>${inlineAuthorToHtml(it)}</li>`).join('')
      : '<li><br></li>';
    return `<ul class="np-rich-list-diagram">${lis}</ul>`;
  }

  if (nonEmpty.every((l) => /^[-*]\s+/.test(l))) {
    return `<ul>${nonEmpty.map((l) => `<li>${inlineAuthorToHtml(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
  }

  if (nonEmpty.every((l) => /^\d+\.\s+/.test(l))) {
    return `<ol>${nonEmpty.map((l) => `<li>${inlineAuthorToHtml(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
  }

  const inner = nonEmpty.map((l) => inlineAuthorToHtml(l)).join('<br>');
  return `<p>${inner || '<br>'}</p>`;
}

function authorNoteLooksRich(plain) {
  const t = String(plain || '');
  return (
    /\[\[(sem|warn|importante|star|destacado|b|i|u|s|color|size|h2|h3|diagram)/i.test(t) ||
    /\*\*|__|~~/.test(t) ||
    /^##\s/m.test(t) ||
    /^###\s/m.test(t) ||
    /^[-*]\s/m.test(t) ||
    /^\d+\.\s/m.test(t)
  );
}

function authorNoteToBodyHtml(plain) {
  const t = String(plain || '').trim();
  if (!t) return null;
  return t.split(/\n{2,}/).map(parseAuthorBlock).join('');
}

function stripAuthorTokensForPlain(plain) {
  return String(plain || '')
    .replace(RE_SEM_TOKEN, (_, d, lv) => {
      const lab = formatRichDueDateLabel(d);
      return lab ? `${lab} (${lv || 'media'})` : '';
    })
    .replace(/\[\[(?:warn|importante)\]\]/gi, '⚠ Importante ')
    .replace(/\[\[(?:star|destacado)\]\]/gi, '★ Destacado ')
    .replace(/\[\[(?:b|i|u|s|color|size):?[^\]]*\]\]([\s\S]*?)\[\[\/(?:b|i|u|s|color|size)\]\]/gi, '$1')
    .replace(/\[\[h2\]\]([\s\S]*?)\[\[\/h2\]\]/gi, '$1\n')
    .replace(/\[\[h3\]\]([\s\S]*?)\[\[\/h3\]\]/gi, '$1\n')
    .replace(/\[\[diagram\]\]/gi, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1');
}

function htmlEscapePlain(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convierte nota con tokens/markdown Plan PRO a body_html (sin imágenes). */
function plainTextToRichBodyHtml(plain) {
  const t = String(plain || '').trim();
  if (!t) return null;
  if (authorNoteLooksRich(t)) return authorNoteToBodyHtml(t);
  return plainTextToBodyHtml(t);
}

/** HTML mínimo (sin semáforos en texto). */
function plainTextToBodyHtml(plain) {
  const t = String(plain || '').trim();
  if (!t) return null;
  const esc = htmlEscapePlain;
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** body_plain legible (sin tokens de autor). */
function plainTextForStorageFromAuthor(plain) {
  return stripAuthorTokensForPlain(plain);
}

function semTokenFromMarkerInput(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const dk = parsePlanProDueDateParam(raw.due_at || raw.due_date || raw.fecha || raw.date);
    if (!dk) return null;
    const lv = priorityLevelFromRaw(raw.priority || raw.priority_level || raw.level || 'media') || 'media';
    return `[[sem:${dk}:${lv}]]`;
  }
  const s = String(raw).trim();
  const inline = /\[\[sem:/i.test(s) || /\[\[semaforo:/i.test(s);
  if (inline) return preprocessNoteAuthorInput(s);
  const m = /^(\d{4}-\d{2}-\d{2})(?:[:|,\s]+(alta|media|baja))?$/i.exec(s);
  if (m) return `[[sem:${m[1]}:${(m[2] || 'media').toLowerCase()}]]`;
  return null;
}

/** Normaliza alias y tokens antes de generar body_html. */
function preprocessNoteAuthorInput(text) {
  return String(text || '')
    .replace(/\[\[semaforo:/gi, '[[sem:')
    .replace(/\[\[traffic:/gi, '[[sem:');
}

/** Arma texto de nota desde note / append_note / append_due_marker (pueden combinarse). */
function buildNoteAuthorPayload(params) {
  const hasReplace = params.body_plain != null || params.note != null;
  const chunks = [];
  if (hasReplace) {
    chunks.push(String(params.body_plain != null ? params.body_plain : params.note).trim());
  }
  if (params.append_note != null && String(params.append_note).trim()) {
    chunks.push(String(params.append_note).trim());
  }
  const semTok = semTokenFromMarkerInput(params.append_due_marker);
  if (semTok) chunks.push(semTok);
  const merged = preprocessNoteAuthorInput(chunks.filter(Boolean).join('\n\n'));
  if (!merged) return null;
  return { mode: hasReplace ? 'replace' : 'append', text: merged };
}

function planProWriteVerifySemaforos(item) {
  const markers = collectAllRichDueMarkers(item);
  return {
    semaforos_en_nota: markers,
    semaforos_en_nota_count: markers.length,
    chip_semaforo_interno_ok: markers.length > 0,
    verificacion_chip:
      markers.length > 0
        ? 'Chip(s) 🚦 internos guardados en body_html.'
        : 'Sin chips 🚦 en la nota. Semáforo INTERNO = [[sem:YYYY-MM-DD:alta|media|baja]] o append_due_marker. [[star]]/[[warn]] NO son semáforo. Tras guardar, semaforos_en_nota_count debe ser ≥1.'
  };
}

function applyNotePlainAndHtml(patch, plainRaw) {
  const raw = preprocessNoteAuthorInput(String(plainRaw || '').trim());
  patch.body_plain = raw ? plainTextForStorageFromAuthor(raw) : null;
  patch.body_html = raw ? plainTextToRichBodyHtml(raw) : null;
}

function itemNoteBaseHtml(item, patch) {
  const fromPatch = patch && patch.body_html != null ? patch.body_html : null;
  if (fromPatch && String(fromPatch).trim()) return String(fromPatch).trim();
  if (item.body_html && String(item.body_html).trim()) return String(item.body_html).trim();
  if (item.body_plain && String(item.body_plain).trim()) {
    return plainTextToRichBodyHtml(item.body_plain) || plainTextToBodyHtml(item.body_plain) || '';
  }
  return '';
}

function appendNoteChunkToPatch(patch, item, chunkPlain) {
  const add = preprocessNoteAuthorInput(String(chunkPlain || '').trim());
  if (!add) return;
  const chunkHtml = plainTextToRichBodyHtml(add);
  if (!chunkHtml) return;
  const baseHtml = itemNoteBaseHtml(item, patch);
  patch.body_html = baseHtml ? baseHtml + chunkHtml : chunkHtml;
  const basePlain = (
    patch.body_plain != null ? patch.body_plain : item.body_plain || ''
  ).trim();
  const addPlain = plainTextForStorageFromAuthor(add);
  patch.body_plain = basePlain ? basePlain + '\n' + addPlain : addPlain;
}

function parsePlanProDueDateParam(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = parseIsoDateOnly(s);
  return d ? dateOnlyKey(d) : null;
}

function parseRelationTagsParam(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const tags = raw.map((t) => String(t).trim()).filter(Boolean);
    return tags.length ? tags : [];
  }
  const s = String(raw).trim();
  if (!s) return [];
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

async function resolvePlanProAreaId(params, areas) {
  const id = (params.area_id || '').trim();
  if (id) {
    return areas.some((a) => a.id === id) ? id : null;
  }
  if (params.area_slug) {
    const slug = String(params.area_slug).toLowerCase();
    const a = areas.find((x) => (x.slug || '').toLowerCase() === slug);
    if (a) return a.id;
  }
  const areaQ = (params.area_title || params.area || '').trim().toLowerCase();
  if (areaQ) {
    const a = areas.find(
      (x) =>
        (x.title || '').toLowerCase().includes(areaQ) || (x.slug || '').toLowerCase().includes(areaQ)
    );
    if (a) return a.id;
  }
  return null;
}

function planProCategoriesForOwner(categories, areas) {
  const areaIds = new Set((areas || []).map((a) => a.id));
  return (categories || []).filter((c) => areaIds.has(c.area_id));
}

function categorySearchTerms(params) {
  const raw = (params.category_title || params.category || params.rama || '').trim();
  if (!raw) return [];
  const terms = [raw.toLowerCase()];
  if (raw.includes('->')) {
    const tail = raw.split('->').pop().trim().toLowerCase();
    if (tail && !terms.includes(tail)) terms.push(tail);
  }
  if (raw.includes('·')) {
    const tail = raw.split('·').pop().trim().toLowerCase();
    if (tail && !terms.includes(tail)) terms.push(tail);
  }
  return terms;
}

/** Resuelve pilar + rama; si category_id es válido, el pilar sale de esa rama (no exige coincidir area_slug). */
function resolvePlanProAreaAndCategory(params, areas, categories) {
  const ownedCats = planProCategoriesForOwner(categories, areas);
  const catId = (params.category_id || '').trim();

  if (catId) {
    const byId = ownedCats.find((c) => c.id === catId);
    if (byId) {
      return {
        areaId: byId.area_id,
        categoryId: byId.id,
        matched_by: 'category_id'
      };
    }
    return {
      error: 'category_id no encontrado en tu Plan PRO (o no es de tus pilares).',
      category_id: catId,
      hint: 'Llama plan_pro_catalog y usa id de categories tal cual.'
    };
  }

  const terms = categorySearchTerms(params);
  if (terms.length) {
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      const hits = ownedCats.filter((c) => {
        const t = (c.title || '').toLowerCase();
        return t.includes(term) || term.includes(t);
      });
      if (hits.length === 1) {
        return {
          areaId: hits[0].area_id,
          categoryId: hits[0].id,
          matched_by: 'category_title',
          category_title: hits[0].title
        };
      }
      if (hits.length > 1) {
        let areaId = resolvePlanProAreaId(params, areas);
        if (areaId) {
          const inArea = hits.filter((c) => c.area_id === areaId);
          if (inArea.length === 1) {
            return {
              areaId: inArea[0].area_id,
              categoryId: inArea[0].id,
              matched_by: 'category_title+area'
            };
          }
        }
        return {
          error: 'Varias ramas coinciden; indica category_id.',
          matches: hits.slice(0, 8).map((c) => ({
            id: c.id,
            title: c.title,
            area_id: c.area_id
          }))
        };
      }
    }
  }

  const areaId = resolvePlanProAreaId(params, areas);
  if (!areaId) {
    return {
      error: 'missing_area',
      areas: areas.map((a) => ({ id: a.id, title: a.title, slug: a.slug }))
    };
  }

  const inArea = ownedCats.filter((c) => c.area_id === areaId);
  const roots = inArea.filter((c) => !c.parent_id);
  const pool = roots.length ? roots : inArea;
  if (!pool.length) {
    return {
      error: 'no_category_in_area',
      area_id: areaId,
      categories_in_area: [],
      hint: 'Crea una rama en Plan PRO en ese pilar o pasa category_id de plan_pro_catalog.'
    };
  }
  return {
    areaId,
    categoryId: pool[0].id,
    matched_by: 'default_first_branch',
    category_title: pool[0].title
  };
}

async function handlePlanProCatalog(supabase) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }
  const areas = await fetchPlanProAreas(supabase, ownerId);
  const categories = await fetchPlanProCategories(supabase);
  const byArea = areas.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    categories: categories
      .filter((c) => c.area_id === a.id)
      .map((c) => ({ id: c.id, title: c.title, parent_id: c.parent_id }))
  }));
  return {
    ok: true,
    domain: 'plan_pro',
    areas: byArea,
    hint: 'Para crear: plan_pro_create con title + area_slug o area_id; category_id opcional (si falta, primera rama del pilar).'
  };
}

async function handlePlanProDay(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }
  const dayKey = parsePlanProDueDateParam(params.due_on || params.due_date || params.fecha || params.date);
  if (!dayKey) {
    return {
      ok: true,
      domain: 'plan_pro',
      error: 'Indica params.due_on o params.due_date (YYYY-MM-DD), ej. 2026-05-28.'
    };
  }

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  let areaId = (params.area_id || '').trim();
  if (!areaId && params.area_slug) {
    const slug = String(params.area_slug).toLowerCase();
    const a = areas.find((x) => (x.slug || '').toLowerCase() === slug);
    if (a) areaId = a.id;
  }

  const items = await fetchPlanProItems(supabase, ownerId, {
    area_id: areaId || undefined,
    open_only: params.include_closed !== true && params.include_closed !== 'true',
    limit: 120
  });
  const categories = await fetchPlanProCategories(supabase);

  const dueOnDay = [];
  const noDue = [];
  items.forEach((item) => {
    const due = parseIsoDateOnly(item.due_at);
    const row = planProItemListRow(item, areasById, categories);
    if (!due) {
      noDue.push(row);
      return;
    }
    if (dateOnlyKey(due) === dayKey) dueOnDay.push(row);
  });

  return {
    ok: true,
    domain: 'plan_pro',
    due_on: dayKey,
    count: dueOnDay.length,
    items: dueOnDay,
    open_without_due_on_that_day: params.include_no_due ? noDue.slice(0, 10) : undefined
  };
}

async function handlePlanProCreate(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }

  const title = (params.title || '').trim();
  if (!title) {
    return { ok: true, domain: 'plan_pro', error: 'Indica params.title (título del apunte).' };
  }

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const categories = await fetchPlanProCategories(supabase);
  const resolved = resolvePlanProAreaAndCategory(params, areas, categories);
  if (resolved.error) {
    const out = {
      ok: true,
      domain: 'plan_pro',
      error: resolved.error,
      hint: resolved.hint
    };
    if (resolved.areas) out.areas = resolved.areas;
    if (resolved.area_id) out.area_id = resolved.area_id;
    if (resolved.category_id) out.category_id = resolved.category_id;
    if (resolved.matches) out.matches = resolved.matches;
    if (resolved.categories_in_area) out.categories_in_area = resolved.categories_in_area;
    return out;
  }
  const areaId = resolved.areaId;
  const categoryId = resolved.categoryId;

  let bodyPlain = preprocessNoteAuthorInput((params.body_plain || params.note || params.body || '').trim());
  const notePayloadCreate = buildNoteAuthorPayload(params);
  if (notePayloadCreate) bodyPlain = notePayloadCreate.text;
  const dueAt = parsePlanProDueDateParam(params.due_at || params.due_date || params.fecha);
  const capturedAt = parsePlanProDueDateParam(params.captured_at) || dateOnlyKey(new Date());

  const insert = {
    owner_id: ownerId,
    area_id: areaId,
    category_id: categoryId,
    title: title.slice(0, 500),
    status: params.status != null && String(params.status).trim() ? String(params.status).trim() : null,
    priority: normalizePlanProPriorityInput(params.priority),
    thought_type:
      params.thought_type != null && String(params.thought_type).trim()
        ? String(params.thought_type).trim()
        : params.tipo != null && String(params.tipo).trim()
          ? String(params.tipo).trim()
          : null,
    captured_at: capturedAt,
    due_at: dueAt,
    next_action:
      params.next_action != null && String(params.next_action).trim()
        ? String(params.next_action).trim().slice(0, 500)
        : null,
    relation_tags: parseRelationTagsParam(params.relation_tags || params.tags),
    body_plain: bodyPlain ? plainTextForStorageFromAuthor(bodyPlain) : null,
    body_html: bodyPlain ? plainTextToRichBodyHtml(bodyPlain) : null,
    body_blocks: [],
    attachments: []
  };

  const { data, error } = await supabase
    .from('plan_pro_items')
    .insert(insert)
    .select(PLAN_PRO_ITEM_SELECT)
    .single();
  if (error) throw new Error('plan_pro_create: ' + error.message);

  const areasById = areaMapById(areas);
  return {
    ok: true,
    domain: 'plan_pro',
    created: true,
    message: 'Apunte creado en Plan PRO.',
    matched_by: resolved.matched_by,
    category_title: resolved.category_title || categoryTitleById(categories, categoryId),
    ...planProWriteVerifySemaforos(data),
    item: planProItemListRow(data, areasById, categories)
  };
}

async function handlePlanProUpdate(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }

  const itemId = (params.item_id || params.id || '').trim();
  const q = (params.q || params.search || params.title || '').trim().toLowerCase();
  if (!itemId && !q) {
    return {
      ok: true,
      domain: 'plan_pro',
      error: 'Indica params.item_id o params.q (título) del apunte a editar.'
    };
  }

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  const categories = await fetchPlanProCategories(supabase);

  let item = null;
  if (itemId) {
    const { data, error } = await supabase
      .from('plan_pro_items')
      .select(PLAN_PRO_ITEM_SELECT)
      .eq('owner_id', ownerId)
      .eq('id', itemId)
      .maybeSingle();
    if (error) throw new Error('plan_pro_update: ' + error.message);
    item = data;
  } else {
    const items = await fetchPlanProItems(supabase, ownerId, { limit: 100 });
    const hits = items.filter((it) => itemMatchesSearch(it, q, areasById));
    hits.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    item = hits[0] || null;
  }

  if (!item) {
    return { ok: true, domain: 'plan_pro', found: false, message: 'Apunte no encontrado.' };
  }

  const patch = {};

  if (params.title != null && String(params.title).trim()) {
    patch.title = String(params.title).trim().slice(0, 500);
  }
  const notePayload = buildNoteAuthorPayload(params);
  if (notePayload) {
    if (notePayload.mode === 'replace') {
      applyNotePlainAndHtml(patch, notePayload.text);
    } else {
      appendNoteChunkToPatch(patch, item, notePayload.text);
    }
  }
  if (params.priority != null) {
    patch.priority = normalizePlanProPriorityInput(params.priority);
  }
  if (params.due_at != null || params.due_date != null || params.fecha != null) {
    const rawDue = params.due_at != null ? params.due_at : params.due_date != null ? params.due_date : params.fecha;
    if (rawDue === '' || rawDue === false) {
      patch.due_at = null;
    } else {
      patch.due_at = parsePlanProDueDateParam(rawDue);
    }
  }
  if (params.next_action != null) {
    const na = String(params.next_action).trim();
    patch.next_action = na ? na.slice(0, 500) : null;
  }
  if (params.status != null) {
    const st = String(params.status).trim();
    patch.status = st || null;
  }
  if (params.thought_type != null || params.tipo != null) {
    const tt = String(params.thought_type != null ? params.thought_type : params.tipo).trim();
    patch.thought_type = tt || null;
  }
  if (params.relation_tags != null || params.tags != null) {
    patch.relation_tags = parseRelationTagsParam(params.relation_tags != null ? params.relation_tags : params.tags);
  }
  if (params.area_id != null || params.area_slug != null || params.area_title != null) {
    const newAreaId = resolvePlanProAreaId(params, areas);
    if (newAreaId) patch.area_id = newAreaId;
  }
  if (params.category_id != null || params.category_title != null || params.rama != null) {
    const sub = { ...params };
    if (!sub.area_id && !sub.area_slug && !sub.area_title) {
      sub.area_id = patch.area_id || item.area_id;
    }
    const resolved = resolvePlanProAreaAndCategory(sub, areas, categories);
    if (resolved.areaId && resolved.categoryId) {
      patch.area_id = resolved.areaId;
      patch.category_id = resolved.categoryId;
    }
  }

  const wantClose =
    params.close === true ||
    params.close === 'true' ||
    (params.status && /cerrad|closed|hecho|done/i.test(String(params.status)));
  const wantReopen = params.reopen === true || params.reopen === 'true';
  if (wantClose) {
    patch.closed_at = new Date().toISOString();
    if (!patch.status) patch.status = 'Cerrado';
  } else if (wantReopen) {
    patch.closed_at = null;
  }

  if (!Object.keys(patch).length) {
    return {
      ok: true,
      domain: 'plan_pro',
      error:
        'Nada que actualizar. Usa title, note/body_plain, append_note, append_due_marker ([[sem:YYYY-MM-DD:media]]), priority, due_at, next_action, status, tags, close/reopen.'
    };
  }

  const { data, error } = await supabase
    .from('plan_pro_items')
    .update(patch)
    .eq('id', item.id)
    .eq('owner_id', ownerId)
    .select(PLAN_PRO_ITEM_SELECT)
    .single();
  if (error) throw new Error('plan_pro_update: ' + error.message);

  return {
    ok: true,
    domain: 'plan_pro',
    updated: true,
    fields_changed: Object.keys(patch),
    message: 'Apunte actualizado en Plan PRO.',
    ...planProWriteVerifySemaforos(data),
    item: planProItemListRow(data, areasById, categories)
  };
}

async function handlePlanProItem(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }

  const itemId = (params.item_id || params.id || '').trim();
  const q = (params.q || params.search || params.title || '').trim().toLowerCase();

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  const categories = await fetchPlanProCategories(supabase);

  let item = null;
  if (itemId) {
    const { data, error } = await supabase
      .from('plan_pro_items')
      .select(PLAN_PRO_ITEM_SELECT)
      .eq('owner_id', ownerId)
      .eq('id', itemId)
      .maybeSingle();
    if (error) throw new Error('plan_pro_item: ' + error.message);
    item = data;
  } else if (q) {
    const items = await fetchPlanProItems(supabase, ownerId, { limit: 100 });
    const hits = items.filter((it) => itemMatchesSearch(it, q, areasById));
    hits.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    item = hits[0] || null;
  } else {
    return { ok: true, domain: 'plan_pro', error: 'Indica params.item_id o params.q (título/texto).' };
  }

  if (!item) {
    return { ok: true, domain: 'plan_pro', found: false, message: 'Apunte no encontrado.' };
  }

  const images = collectPlanProImages(item);
  const noteMarkers = collectAllRichDueMarkers(item);

  const plainLines = bodyPlainAsLines(item.body_plain);

  return {
    ok: true,
    domain: 'plan_pro',
    found: true,
    item: {
      ...planProItemListRow(item, areasById, categories),
      body_plain: item.body_plain || '',
      body_plain_lines: plainLines,
      body_plain_line_count: plainLines.length,
      body_html_stripped: stripHtmlSimple(item.body_html || '').slice(0, 8000),
      lectura_nota:
        'Usa body_plain o body_plain_lines (no solo preview). Si line_count es 1 pero esperas más renglones, vuelve a plan_pro_update con note o append_note.',
      semaforos_en_nota: noteMarkers,
      images,
      images_count: images.length,
      images_note:
        images.length > 0
          ? 'URLs públicas en Supabase (plan-pro-note-images). Indica al usuario las URLs; ChatGPT Plus puede abrir enlaces si el usuario lo pide.'
          : null,
      body_blocks_summary: summarizeBodyBlocks(item.body_blocks),
      body_blocks_tables: expandBodyBlocksForApi(item.body_blocks),
      closed_at: item.closed_at
    }
  };
}

/* ——— Fase 4: Radar (NDVI / NDMI) ——— */
const RADAR_BUCKET = 'radar-ndvi';
const RADAR_DEFAULT_MONTHLY = 25;

function radarMonthKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function projectHasPolygon(data) {
  const loc = data && data.location;
  return !!(loc && Array.isArray(loc.polygon) && loc.polygon.length >= 3);
}

async function signedRadarUrl(supabase, path, ttlSec = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(RADAR_BUCKET).createSignedUrl(path, ttlSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function getLatestRadarRowAdmin(supabase, userId, projectId) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta, user_id, project_id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('radar_requests: ' + error.message);
  return data;
}

async function getRadarHistoryAdmin(supabase, userId, projectId, limit) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('radar_history: ' + error.message);
  return data || [];
}

async function getRadarRowByIdAdmin(supabase, userId, projectId, requestId) {
  const { data, error } = await supabase
    .from('radar_requests')
    .select('id, created_at, month_key, image_storage_path, meta, user_id, project_id')
    .eq('id', requestId)
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .not('image_storage_path', 'is', null)
    .maybeSingle();
  if (error) throw new Error('radar_requests by id: ' + error.message);
  return data;
}

async function mapLatestRadarByProjects(supabase, projectIds) {
  const map = {};
  if (!projectIds.length) return map;
  const { data, error } = await supabase
    .from('radar_requests')
    .select('project_id, user_id, created_at, month_key, image_storage_path, meta')
    .in('project_id', projectIds.slice(0, 200))
    .not('image_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error('radar map: ' + error.message);
  (data || []).forEach((row) => {
    if (!map[row.project_id]) map[row.project_id] = row;
  });
  return map;
}

async function getUserRadarCredits(supabase, userId) {
  const mk = radarMonthKey();
  const base = Math.max(
    0,
    Math.floor(
      Number(
        process.env.RADAR_MONTHLY_CREDITS != null && process.env.RADAR_MONTHLY_CREDITS !== ''
          ? process.env.RADAR_MONTHLY_CREDITS
          : RADAR_DEFAULT_MONTHLY
      )
    )
  );
  const { data: prof } = await supabase
    .from('profiles')
    .select('radar_credits_bonus')
    .eq('id', userId)
    .maybeSingle();
  const bonus = Math.max(0, Math.floor(Number(prof?.radar_credits_bonus) || 0));
  const limit = base + bonus;
  const { count, error } = await supabase
    .from('radar_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('month_key', mk)
    .not('image_storage_path', 'is', null);
  if (error) throw new Error('radar credits: ' + error.message);
  const used = count || 0;
  return { month_key: mk, used, limit, base, bonus, remaining: Math.max(0, limit - used) };
}

async function buildRadarSnapshot(supabase, row) {
  if (!row) return null;
  const meta = row.meta || {};
  const ndmiPath = meta.ndmi_storage_path || meta.images?.ndmi?.storage_path || null;
  const [ndviUrl, ndmiUrl] = await Promise.all([
    signedRadarUrl(supabase, row.image_storage_path),
    signedRadarUrl(supabase, ndmiPath)
  ]);
  return {
    id: row.id,
    created_at: row.created_at,
    month_key: row.month_key,
    sentinel_period: {
      from: meta.date_start || null,
      to: meta.date_end || null
    },
    source: meta.source || 'COPERNICUS/S2_SR_HARMONIZED',
    images: {
      ndvi: {
        label: 'NDVI — vigor vegetativo relativo',
        signed_url: ndviUrl,
        legend: 'Verde = mayor vigor; rojo/naranja = menor vigor en el predio.'
      },
      ndmi: {
        label: 'NDMI — humedad del dosel',
        signed_url: ndmiUrl,
        legend: 'Verde = mayor humedad de dosel; marrón = menor humedad relativa.'
      }
    },
    images_note:
      'URLs firmadas (~1 h). ChatGPT no analiza píxeles automáticamente; indica enlaces o pide al usuario abrirlos.'
  };
}

async function handleRadarProject(supabase, params) {
  const resolved = await resolveProject(supabase, params);
  if (!resolved.found) {
    return { ok: true, domain: 'radar', ...resolved };
  }

  const row = resolved.project;
  const data = row.data || {};
  const hasPoly = projectHasPolygon(data);
  const profiles = await fetchProfiles(supabase);
  const prof = profiles.find((p) => p.id === row.user_id);
  const histLimit = Math.min(Math.max(parseInt(params.history_limit, 10) || 24, 1), 36);
  const requestId = (params.request_id || '').trim();

  const [latestRow, historyRows, credits] = await Promise.all([
    getLatestRadarRowAdmin(supabase, row.user_id, row.id),
    getRadarHistoryAdmin(supabase, row.user_id, row.id, histLimit),
    getUserRadarCredits(supabase, row.user_id)
  ]);

  const history = historyRows.map((h) => {
    const m = h.meta || {};
    return {
      id: h.id,
      created_at: h.created_at,
      month_key: h.month_key,
      sentinel_period: { from: m.date_start || null, to: m.date_end || null },
      has_ndvi: !!h.image_storage_path,
      has_ndmi: !!(m.ndmi_storage_path || m.images?.ndmi?.storage_path)
    };
  });

  let viewRow = latestRow;
  if (requestId) {
    viewRow = await getRadarRowByIdAdmin(supabase, row.user_id, row.id, requestId);
    if (!viewRow) {
      return {
        ok: false,
        domain: 'radar',
        error: 'radar_snapshot_not_found',
        message:
          'No se encontró esa imagen Radar. Usa radar_history[].id de una consulta previa o omite request_id para la más reciente.',
        project: {
          id: row.id,
          name: row.name || row.title || 'Sin nombre',
          crop: getProjectCrop(data)
        },
        radar_history: history
      };
    }
  }

  const displayRadar = await buildRadarSnapshot(supabase, viewRow);
  const isNewest =
    !latestRow || !viewRow || String(latestRow.id) === String(viewRow.id);

  return {
    ok: true,
    domain: 'radar',
    project: {
      id: row.id,
      name: row.name || row.title || 'Sin nombre',
      crop: getProjectCrop(data),
      user_email: prof ? prof.email : null,
      user_name: prof ? prof.name : null
    },
    multiple_matches: resolved.multiple_matches || false,
    location: summarizeLocation(data.location),
    has_polygon: hasPoly,
    can_generate_radar: hasPoly,
    latest_radar: displayRadar,
    radar_view: {
      request_id: viewRow ? viewRow.id : null,
      is_newest: isNewest,
      created_at: viewRow ? viewRow.created_at : null,
      month_key: viewRow ? viewRow.month_key : null
    },
    radar_history: history,
    radar_history_count: history.length,
    user_radar_credits_this_month: credits,
    gpt_radar_note:
      'radar_history lista todas las imágenes guardadas (id, created_at, sentinel_period). latest_radar trae URLs firmadas NDVI/NDMI de la más reciente o de request_id si lo pasas. ChatGPT no ve píxeles: da fechas y enlaces; el usuario abre las URLs (~1 h).',
    related: {
      fertirriego_suelo_vpd: 'project_detail',
      vpd_ahora: 'project_vpd_live'
    }
  };
}

async function handleRadarSearch(supabase, params) {
  let list = await fetchProjects(supabase);
  const profiles = await fetchProfiles(supabase);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const cropQ = (params.crop || params.cultivo || '').trim().toLowerCase();
  const userQ = (params.user || params.email || params.user_email || '').trim().toLowerCase();
  const projectQ = (params.project || params.project_name || params.q || '').trim().toLowerCase();
  const polygonOnly =
    params.has_polygon_only !== false && params.has_polygon_only !== 'false';
  const radarOnly = params.has_radar_only === true || params.has_radar_only === 'true';

  if (polygonOnly) {
    list = list.filter((p) => projectHasPolygon(p.data));
  }
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

  const radarMap = await mapLatestRadarByProjects(
    supabase,
    list.map((p) => p.id)
  );

  let rows = list.map((p) => {
    const prof = byId.get(p.user_id);
    const r = radarMap[p.id];
    return {
      project_id: p.id,
      name: p.name || p.title || 'Sin nombre',
      crop: getProjectCrop(p.data),
      user_email: prof ? prof.email : null,
      user_name: prof ? prof.name : null,
      has_polygon: projectHasPolygon(p.data),
      has_radar: !!r,
      latest_radar_at: r ? r.created_at : null,
      radar_month_key: r ? r.month_key : null,
      sentinel_period: r
        ? { from: r.meta?.date_start || null, to: r.meta?.date_end || null }
        : null
    };
  });

  if (radarOnly) rows = rows.filter((x) => x.has_radar);

  rows.sort((a, b) => {
    const ta = a.latest_radar_at ? new Date(a.latest_radar_at).getTime() : 0;
    const tb = b.latest_radar_at ? new Date(b.latest_radar_at).getTime() : 0;
    return tb - ta;
  });

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 40, 1), 80);
  return {
    ok: true,
    domain: 'radar',
    filters: { crop: cropQ || null, user: userQ || null, has_radar_only: radarOnly, has_polygon_only: polygonOnly },
    count: rows.length,
    projects: rows.slice(0, limit),
    tip: 'radar_project: project_name + radar_history (fechas). request_id en params para URLs de una imagen concreta del listado.'
  };
}

async function handleRadarOverview(supabase, params) {
  const projects = await fetchProjects(supabase);
  const mk = radarMonthKey();
  const withPoly = projects.filter((p) => projectHasPolygon(p.data));
  const radarMap = await mapLatestRadarByProjects(
    supabase,
    projects.map((p) => p.id)
  );
  const withRadar = withPoly.filter((p) => radarMap[p.id]);

  const { count: gensThisMonth, error: cntErr } = await supabase
    .from('radar_requests')
    .select('*', { count: 'exact', head: true })
    .eq('month_key', mk)
    .not('image_storage_path', 'is', null);
  if (cntErr) throw new Error('radar overview: ' + cntErr.message);

  const byCrop = {};
  withPoly.forEach((p) => {
    const c = getProjectCrop(p.data) || 'Sin cultivo';
    if (!byCrop[c]) byCrop[c] = { with_polygon: 0, with_radar_snapshot: 0 };
    byCrop[c].with_polygon += 1;
    if (radarMap[p.id]) byCrop[c].with_radar_snapshot += 1;
  });

  const profiles = await fetchProfiles(supabase);
  const subs = profiles.filter(isSubscriberProfile);
  let usersWithBonus = 0;
  subs.forEach((p) => {
    if (Math.floor(Number(p.radar_credits_bonus) || 0) > 0) usersWithBonus += 1;
  });

  return {
    ok: true,
    domain: 'radar',
    month_key: mk,
    totals: {
      projects_all: projects.length,
      projects_with_polygon: withPoly.length,
      projects_with_radar_saved: withRadar.length,
      radar_generations_this_month: gensThisMonth || 0,
      subscribers_with_radar_bonus: usersWithBonus
    },
    by_crop: byCrop,
    legend: {
      ndvi: 'Vigor vegetativo (Sentinel-2 ~10 m)',
      ndmi: 'Humedad del dosel'
    }
  };
}

function handleLabAnalysesCatalog(params) {
  const catalog = require('./lib/lab-analyses-catalog');
  const tabId = params && (params.tab_id || params.type);
  if (tabId) {
    const tab = catalog.tabs.find((t) => t.id === tabId);
    if (!tab) {
      return { ok: false, error: 'tab_id no encontrado', available_ids: catalog.tabs.map((t) => t.id) };
    }
    return { ok: true, tab, storage: catalog.storage, api: catalog.api, gptRules: catalog.gptRules };
  }
  return { ok: true, ...catalog };
}

function handleFreeToolsCatalog(params) {
  const catalog = require('./lib/free-tools-catalog');
  const toolId = params && params.tool_id;
  if (toolId) {
    const tool = catalog.tools.find((t) => t.id === toolId);
    if (!tool) {
      return { ok: false, error: 'tool_id no encontrado', available_ids: catalog.tools.map((t) => t.id) };
    }
    return { ok: true, tool, persistence: catalog.persistence, gptRules: catalog.gptRules };
  }
  return { ok: true, ...catalog };
}

function handleManualTecnicoCatalog(params) {
  const catalog = require('./lib/manual-tecnico-catalog');
  const chapterId = params && params.chapter_id;
  if (chapterId) {
    const ch = catalog.chapters.find((c) => c.id === chapterId || c.slug === chapterId);
    if (!ch) {
      return {
        ok: false,
        error: 'chapter_id no encontrado',
        available_ids: catalog.chapters.map((c) => c.id)
      };
    }
    return { ok: true, chapter: ch, publicUrls: catalog.publicUrls, gptRules: catalog.gptRules };
  }
  return { ok: true, ...catalog };
}

async function handleDescribeApi() {
  return {
    ok: true,
    domains: {
      admin: ['admin_stats', 'list_users', 'user_summary'],
      nutriplant_projects: [
        'search_projects',
        'project_detail',
        'project_analyses',
        'project_vpd_live',
        'project_climate'
      ],
      plan_pro: [
        'plan_pro_catalog',
        'plan_pro_day',
        'plan_pro_week',
        'plan_pro_search',
        'plan_pro_item',
        'plan_pro_create',
        'plan_pro_update'
      ],
      radar: ['radar_project', 'radar_search', 'radar_overview'],
      free_tools: ['free_tools_catalog'],
      lab_analyses: ['lab_analyses_catalog', 'project_analyses'],
      manual_publico: ['manual_tecnico_catalog']
    },
    usage:
      'Reportes laboratorio (nube): project_analyses. Plan PRO personal (Jesús): plan_pro_day/week/search/item (leer), plan_pro_create/plan_pro_update (escribir). Semáforo EN LA NOTA (chip 🚦): en note/append_note usa token [[sem:YYYY-MM-DD:alta|media|baja]] o append_due_marker {due_at,priority}. Objetivo del APUNTE entero: priority + due_at (ficha). plan_pro_catalog = pilares/ramas. Manual: manual_tecnico_catalog.',
    plan_pro_nota_semaforo:
      'Chip en libreta: [[sem:2026-05-26:media]] o append_due_marker. Ficha apunte: priority + due_at.',
    plan_pro_nota_herramientas:
      'En note/append_note (NO imágenes 🖼): [[warn]] [[star]]; **negrita** *cursiva* __subrayado__ ~~tachado~~; [[color:blue]]texto[[/color]]; [[size:lg]]texto[[/size]]; ## Título ### Sub; líneas "- item" o "1. item"; [[diagram]] luego líneas. Ver docs PLAN-PRO-GPT-ACCIONES.md.'
  };
}

const HANDLERS = {
  admin_stats: (sb, p) => handleAdminStats(sb, p),
  list_users: (sb, p) => handleListUsers(sb, p),
  user_summary: (sb, p) => handleUserSummary(sb, p),
  search_projects: (sb, p) => handleSearchProjects(sb, p),
  project_detail: (sb, p) => handleProjectDetail(sb, p),
  project_analyses: (sb, p) => handleProjectAnalyses(sb, p),
  project_vpd_live: (sb, p) => handleProjectVpdLive(sb, p),
  project_climate: (sb, p) => handleProjectClimate(sb, p),
  plan_pro_catalog: (sb) => handlePlanProCatalog(sb),
  plan_pro_day: (sb, p) => handlePlanProDay(sb, p),
  plan_pro_week: (sb, p) => handlePlanProWeek(sb, p),
  plan_pro_search: (sb, p) => handlePlanProSearch(sb, p),
  plan_pro_item: (sb, p) => handlePlanProItem(sb, p),
  plan_pro_create: (sb, p) => handlePlanProCreate(sb, p),
  plan_pro_update: (sb, p) => handlePlanProUpdate(sb, p),
  radar_project: (sb, p) => handleRadarProject(sb, p),
  radar_search: (sb, p) => handleRadarSearch(sb, p),
  radar_overview: (sb, p) => handleRadarOverview(sb, p),
  free_tools_catalog: (_sb, p) => handleFreeToolsCatalog(p),
  lab_analyses_catalog: (_sb, p) => handleLabAnalysesCatalog(p),
  manual_tecnico_catalog: (_sb, p) => handleManualTecnicoCatalog(p),
  describe_api: () => handleDescribeApi()
};

function getOpenApiSpec() {
  /* Formato 3.0.3 + servers.url raíz: compatible con importador de Actions en ChatGPT */
  return {
    openapi: '3.1.0',
    info: {
      title: 'NutriPlant Admin Assistant',
      version: '2.0.0',
      description: 'Lectura NutriPlant + Plan PRO escritura (create/update). Análisis, Clima, Radar, Manual.'
    },
    servers: [{ url: 'https://nutriplantpro.com' }],
    paths: {
      '/api/admin-assistant': {
        post: {
          operationId: 'nutriplantAdminQuery',
          summary: 'Consulta admin o proyectos de usuarios',
          description:
            'Body: action + params. Análisis: project_analyses. Clima: project_climate. Radar, Plan PRO, project_detail.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Respuesta JSON con ok y datos'
            }
          },
          security: [{ bearerAuth: [] }]
        }
      }
    },
    components: {
      schemas: {
        AdminRequest: {
          type: 'object',
          required: ['action', 'params'],
          properties: {
            action: { type: 'string', enum: Object.keys(HANDLERS) },
            params: {
              type: 'object',
              properties: {
                project_id: { type: 'string' },
                project_name: { type: 'string' },
                item_id: { type: 'string' },
                q: { type: 'string' },
                area_slug: { type: 'string' },
                days_ahead: { type: 'integer' },
                email: { type: 'string' },
                search: { type: 'string' },
                crop: { type: 'string' },
                type: {
                  type: 'string',
                  description:
                    'project_analyses: suelo|solucion_nutritiva|extracto_pasta|agua|foliar|fruta|all'
                },
                mode: {
                  type: 'string',
                  description: 'project_climate: saved|live|rainfall_refresh|all'
                }
              },
              additionalProperties: true
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' }
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
    const result = await HANDLERS[action](supabase, normalizeParams(body));
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
