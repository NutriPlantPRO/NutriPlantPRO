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
      fertirriego: summarizeFertirriego(program, stageIdx),
      granular: summarizeGranular(data),
      vpd_saved: summarizeVpdSaved(data.vpdAnalysis)
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

async function handleDescribeApi() {
  return {
    ok: true,
    domains: {
      admin: ['admin_stats', 'list_users', 'user_summary'],
      nutriplant_projects: [
        'search_projects',
        'project_detail',
        'project_vpd_live'
      ],
      plan_pro: ['plan_pro_week (fase 3)']
    },
    usage: 'POST { action, params }. project_detail: project_id o project_name; opcional fertirriego_stage_index (0-based).'
  };
}

const HANDLERS = {
  admin_stats: (sb, p) => handleAdminStats(sb, p),
  list_users: (sb, p) => handleListUsers(sb, p),
  user_summary: (sb, p) => handleUserSummary(sb, p),
  search_projects: (sb, p) => handleSearchProjects(sb, p),
  project_detail: (sb, p) => handleProjectDetail(sb, p),
  project_vpd_live: (sb, p) => handleProjectVpdLive(sb, p),
  describe_api: () => handleDescribeApi()
};

function getOpenApiSpec() {
  /* Formato 3.0.3 + servers.url raíz: compatible con importador de Actions en ChatGPT */
  return {
    openapi: '3.1.0',
    info: {
      title: 'NutriPlant Admin Assistant',
      version: '1.1.1',
      description: 'Solo lectura. Siempre action + params. project_detail: params.project_id o params.project_name.'
    },
    servers: [{ url: 'https://nutriplantpro.com' }],
    paths: {
      '/api/admin-assistant': {
        post: {
          operationId: 'nutriplantAdminQuery',
          summary: 'Consulta admin o proyectos de usuarios',
          description:
            'Body: action + params. Admin: admin_stats, list_users, user_summary. Proyectos: search_projects, project_detail (project_name o project_id; fertirriego_stage_index opcional), project_vpd_live. describe_api lista acciones.',
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
                fertirriego_stage_index: { type: 'integer' },
                email: { type: 'string' },
                search: { type: 'string' },
                crop: { type: 'string' },
                q: { type: 'string' }
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
