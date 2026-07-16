/**
 * NutriPlant PRO — API para Custom GPT (admin).
 * Casi todo es solo lectura; my_program_* escribe solo en proyectos personales GPT del admin.
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

const crypto = require('crypto');
const nutriContentSearch = require('./lib/nutri-pro-content-search');
const { extractNutriProText, extOf } = require('./lib/nutri-pro-text-extract');
const { nutriProFileOpenUrl } = require('./lib/nutri-pro-file-share');
const { extractOneFile } = require('./nutri-pro-extract');
const {
  createNutriProUploadTicket,
  readNutriProUploadTicketState
} = require('./nutri-pro-upload');

function nutriProPublicBaseUrl() {
  return (process.env.NUTRIPLANT_PUBLIC_URL || 'https://nutriplantpro.com').replace(/\/$/, '');
}

/** Acepta nutri_file_id, file_id o URL permanente /api/nutri-pro-file-open?fid=… */
function resolveNutriProFileId(params) {
  params = params || {};
  let id = String(params.nutri_file_id || params.file_id || '').trim();
  if (id) return id;
  const urlish = String(params.open_url || params.url || params.file_url || params.link || '').trim();
  if (!urlish) return '';
  try {
    const u = new URL(urlish);
    id = (u.searchParams.get('fid') || u.searchParams.get('file_id') || '').trim();
    if (id) return id;
  } catch (_e) {
    /* ignore */
  }
  const m = urlish.match(/[?&]fid=([0-9a-f-]{36})/i) || urlish.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : '';
}

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
  const myProgramKeys = [
    'section',
    'program_section',
    'program_type',
    'program_status',
    'program_data',
    'draft',
    'program',
    'data',
    'merge',
    'notes',
    'variedad',
    'variety',
    'target_yield',
    'yield',
    'yield_unit',
    'unidadRendimiento',
    'campoOsector',
    'sector'
  ];
  myProgramKeys.forEach((key) => {
    const v = src[key];
    if (v != null && v !== '' && params[key] == null) params[key] = v;
  });
  const analysisKeys = ['type', 'analysis_type'];
  analysisKeys.forEach((key) => {
    const v = src[key];
    if (v != null && v !== '' && params[key] == null) params[key] = v;
  });
  const nutriKeys = ['folder_id', 'nutri_file_id', 'file_id', 'kind', 'category'];
  nutriKeys.forEach((key) => {
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

function parseMaybeJsonObject(value, fallback) {
  if (value == null || value === '') return fallback == null ? null : fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return fallback == null ? null : fallback;
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

const PROFILE_STATS_SELECT = 'id, email, is_admin, subscription_status, last_login';

async function fetchProfilesForAdminStats(supabase) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_STATS_SELECT);
  if (error) throw new Error('profiles: ' + (error.message || error));
  return data || [];
}

async function fetchRecentVisitsForActive30d(supabase) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('dashboard_visits')
    .select('user_id, visited_at')
    .gte('visited_at', since)
    .limit(4000);
  if (error) {
    console.warn('dashboard_visits (30d):', error.message);
    return [];
  }
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

async function fetchProjectsCount(supabase) {
  const { count, error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
  if (error) throw new Error('projects: ' + (error.message || error));
  return count || 0;
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
  const [profiles, visits, totalProjects] = await Promise.all([
    fetchProfilesForAdminStats(supabase),
    fetchRecentVisitsForActive30d(supabase),
    fetchProjectsCount(supabase)
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
    total_projects: totalProjects,
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
      const hay = [p.name, p.title, p.id].filter(Boolean).join(' ');
      return nutriContentSearch.partialTextMatches(hay, projectQ, { titleHay: p.name || p.title || '' });
    });
  }
  if (userQ) {
    list = list.filter((p) => {
      const prof = byId.get(p.user_id);
      if (!prof) return false;
      const hay = [prof.email, prof.name].filter(Boolean).join(' ');
      return nutriContentSearch.partialTextMatches(hay, userQ, { titleHay: prof.name || '' });
    });
  }

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 50, 1), 100);
  list = list.slice(0, limit);

  return {
    ok: true,
    domain: 'nutriplant_projects',
    count: list.length,
    partial_match: !!(userQ || projectQ),
    gpt_hint:
      userQ || projectQ
        ? 'Búsqueda flexible: basta con parte del nombre, apellido o correo; no hace falta escribir el nombre completo exacto.'
        : null,
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

const CLIMATE_HISTORY_YEARS = 4;

function getClimateYearEntriesFromBlock(block) {
  if (!block || typeof block !== 'object') return [];
  if (block.years && typeof block.years === 'object') {
    return Object.keys(block.years)
      .map((k) => {
        const y = parseInt(k, 10);
        const entry = block.years[k] || {};
        return {
          year: y,
          months: entry.months || {},
          partial: !!entry.partial,
          unavailable: !!entry.unavailable
        };
      })
      .filter((e) => Number.isFinite(e.year))
      .sort((a, b) => a.year - b.year);
  }
  const legacy = [];
  if (block.previousYear != null && block.monthsPrev) {
    legacy.push({ year: block.previousYear, months: block.monthsPrev, partial: false, unavailable: false });
  }
  if (block.currentYear != null && block.monthsCurr) {
    legacy.push({ year: block.currentYear, months: block.monthsCurr, partial: true, unavailable: false });
  }
  return legacy.sort((a, b) => a.year - b.year);
}

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
    return {
      has_data: false,
      message:
        'Sin datos guardados. El usuario debe pulsar «Obtener lluvia y ET₀» en Clima → Lluvia/Riego (hasta ' +
        CLIMATE_HISTORY_YEARS +
        ' años mensuales).'
    };
  }
  const maxMonth = new Date().getMonth() + 1;
  const entries = getClimateYearEntriesFromBlock(block);
  const years = entries.map((entry) => ({
    year: entry.year,
    partial: !!entry.partial,
    unavailable: !!entry.unavailable,
    rows_mm_by_month: climateMonthsToRows(entry.months, entry.year, entry.partial ? maxMonth : 12),
    total_mm: sumClimateMonths(entry.months, entry.partial ? maxMonth : 12)
  }));
  return {
    has_data: true,
    kind,
    unit: block.unit || 'mm',
    fetched_at: block.fetchedAt || null,
    lat: block.lat != null ? block.lat : null,
    lng: block.lng != null ? block.lng : null,
    years_available: years.length,
    years,
    previous_year: block.previousYear,
    current_year: block.currentYear,
    rows_previous_year: climateMonthsToRows(block.monthsPrev, block.previousYear, 12),
    rows_current_year: climateMonthsToRows(block.monthsCurr, block.currentYear, maxMonth),
    monthly_diff_current_vs_previous_mm: block.diff || null,
    total_previous_year_mm: sumClimateMonths(block.monthsPrev, 12),
    total_current_year_partial_mm: sumClimateMonths(block.monthsCurr, maxMonth),
    note:
      'Histórico mensual Open-Meteo (mm/mes). La app guarda hasta ' +
      CLIMATE_HISTORY_YEARS +
      ' años (año en curso parcial). Tablas y gráficas en Clima → Lluvia/Riego.'
  };
}

function summarizeClimateLiveReading(r) {
  if (!r || typeof r !== 'object') {
    return { has_data: false, message: 'Sin lectura de tiempo actual guardada.' };
  }
  const rainToday = asNum(r.rainTodayMm != null ? r.rainTodayMm : r.rain_1d);
  const et0Today = asNum(r.et0TodayMm != null ? r.et0TodayMm : r.et0_1d);
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
    rain_today_mm: rainToday,
    et0_today_mm: et0Today,
    note:
      'Lectura guardada en Clima → Tiempo actual (satélite Open-Meteo en el centro del polígono). Incluye lluvia y ET₀ acumulados del día cuando se obtuvo la lectura.'
  };
}

function summarizeClimateRolling(rolling) {
  if (!rolling || typeof rolling !== 'object') {
    return { has_data: false, message: 'Sin ventanas rodantes 1/7/30 d. Actualizar en Clima → Lluvia y ET₀.' };
  }
  return {
    has_data: true,
    fetched_at: rolling.fetchedAt || null,
    et0_1d_mm: asNum(rolling.et0_1d != null ? rolling.et0_1d : rolling.et0Today),
    rain_1d_mm: asNum(rolling.rain_1d != null ? rolling.rain_1d : rolling.rainToday),
    et0_7d_mm: asNum(rolling.et0_7d),
    rain_7d_mm: asNum(rolling.rain_7d),
    et0_30d_mm: asNum(rolling.et0_30d),
    rain_30d_mm: asNum(rolling.rain_30d),
    note: 'Sumas acumuladas Open-Meteo para calculadora de balance hídrico (referencia satélite).'
  };
}

function summarizeIrrigationQuickCalc(iqc, rolling) {
  if (!iqc || typeof iqc !== 'object') {
    return {
      has_data: false,
      message: 'Sin calculadora de balance hídrico guardada. El usuario configura en Clima → Lluvia y ET₀.'
    };
  }
  const periodDays = iqc.periodDays === 1 || iqc.periodDays === 30 ? iqc.periodDays : 7;
  const kc = asNum(iqc.kc);
  let et0 = null;
  let rain = null;
  let et0Source = null;
  let rainSource = null;
  const roll = rolling && typeof rolling === 'object' ? rolling : null;
  if (iqc.useManualEt0 && iqc.manualEt0 != null) {
    et0 = roundClimate1(Number(iqc.manualEt0));
    et0Source = 'campo';
  } else if (roll) {
    if (periodDays === 1) et0 = asNum(roll.et0_1d != null ? roll.et0_1d : roll.et0Today);
    else if (periodDays === 30) et0 = asNum(roll.et0_30d);
    else et0 = asNum(roll.et0_7d);
    if (et0 != null) et0Source = 'satélite';
  }
  if (iqc.macroTunnelNoRain) {
    rain = 0;
    rainSource = 'macrotúnel';
  } else if (iqc.useManualRain && iqc.manualRain != null) {
    rain = roundClimate1(Number(iqc.manualRain));
    rainSource = 'campo';
  } else if (roll) {
    if (periodDays === 1) rain = asNum(roll.rain_1d != null ? roll.rain_1d : roll.rainToday);
    else if (periodDays === 30) rain = asNum(roll.rain_30d);
    else rain = asNum(roll.rain_7d);
    if (rain != null) rainSource = 'satélite';
  }
  const etc = et0 != null && kc != null ? roundClimate1(et0 * kc) : null;
  let irrigationMm = null;
  const irrVal = asNum(iqc.irrigationValue);
  const irrUnit = iqc.irrigationUnit === 'm3' ? 'm3' : 'mm';
  const irrigatedHa = asNum(iqc.irrigatedAreaHa);
  const cropHa = asNum(iqc.cropAreaHa);
  if (irrVal != null && irrVal >= 0) {
    if (irrUnit === 'm3') {
      if (irrigatedHa != null && irrigatedHa > 0) irrigationMm = roundClimate1(irrVal / (irrigatedHa * 10));
    } else {
      irrigationMm = roundClimate1(irrVal);
    }
  }
  const deficitClimate = et0 != null && rain != null ? roundClimate1(et0 - rain) : null;
  const deficitCrop = etc != null && rain != null ? roundClimate1(etc - rain) : null;
  const cHa = cropHa != null && cropHa > 0 ? cropHa : 1;
  const iHa = irrigatedHa != null && irrigatedHa > 0 ? irrigatedHa : cHa;
  const irrMmBal = irrigationMm != null ? irrigationMm : 0;
  const balance =
    deficitCrop != null
      ? roundClimate1((deficitCrop * 10 * cHa - irrMmBal * 10 * iHa) / (cHa * 10))
      : null;
  const soilStorageMode =
    iqc.soilStorageMode === 'deficit' || iqc.soilStorageMode === 'surplus' ? iqc.soilStorageMode : null;
  let soilStorageM3 = asNum(iqc.soilStorageM3);
  if (!soilStorageMode || soilStorageM3 == null || soilStorageM3 <= 0) {
    soilStorageM3 = null;
  }
  const baseBalanceM3 =
    balance != null
      ? roundClimate1(Math.abs(balance) * cHa * 10)
      : deficitCrop != null
        ? roundClimate1(Math.abs(deficitCrop) * cHa * 10)
        : null;
  let integratedBalanceM3 = baseBalanceM3;
  let integratedBalanceMm = balance != null ? balance : deficitCrop;
  if (soilStorageMode && soilStorageM3 != null && baseBalanceM3 != null) {
    const delta = soilStorageMode === 'deficit' ? soilStorageM3 : -soilStorageM3;
    integratedBalanceM3 = roundClimate1(baseBalanceM3 + delta);
    integratedBalanceMm =
      cHa > 0 ? roundClimate1(integratedBalanceM3 / (cHa * 10)) : integratedBalanceMm;
  }
  const hasSplit =
    cropHa != null && irrigatedHa != null && irrigatedHa > 0 && Math.abs(cropHa - irrigatedHa) > 0.001;
  const stripFactor = hasSplit ? cropHa / irrigatedHa : null;
  return {
    has_data: true,
    crop_name: iqc.cropName || null,
    period_days: periodDays,
    kc,
    etc_mm: etc,
    et0_mm: et0,
    et0_source: et0Source,
    rain_mm: rain,
    rain_source: rainSource,
    deficit_climate_mm: deficitClimate,
    deficit_crop_mm: deficitCrop,
    irrigation_mm: irrigationMm,
    irrigation_input: irrVal,
    irrigation_unit: irrUnit,
    balance_mm: balance,
    soil_storage_mode: soilStorageMode,
    soil_storage_m3: soilStorageM3,
    integrated_balance_mm: soilStorageMode && soilStorageM3 != null ? integratedBalanceMm : null,
    integrated_balance_m3: soilStorageMode && soilStorageM3 != null ? integratedBalanceM3 : null,
    uses_integrated_total: !!(soilStorageMode && soilStorageM3 != null),
    crop_area_ha: cropHa,
    irrigated_area_ha: irrigatedHa,
    root_reach_pct: asNum(iqc.rootReachPct),
    has_split_area: hasSplit,
    strip_factor: stripFactor != null ? roundClimate1(stripFactor) : null,
    deficit_crop_wetted_mm:
      deficitCrop != null && stripFactor != null ? roundClimate1(deficitCrop * stripFactor) : null,
    balance_wetted_mm: balance != null && stripFactor != null ? roundClimate1(balance * stripFactor) : null,
    m3_per_ha_factor: 10,
    note:
      'Calculadora balance hídrico (Clima → Lluvia y ET₀). Estimación rápida; ajuste almacén suelo (déficit/exceso m³) solo si el usuario lo guardó en irrigationQuickCalc. Manual: balance-hidrico-riego-clima.'
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
  const hasIrr = !!(ca.irrigationQuickCalc && typeof ca.irrigationQuickCalc === 'object');
  const hasRolling = !!(ca.rolling && typeof ca.rolling === 'object');
  return {
    has_data: hasRain || hasEt0 || hasLive || hasIrr || hasRolling,
    last_updated: ca.lastUpdated || null,
    last_tab: ca.lastTab || null,
    rainfall: summarizeRainfallOrEt0(ca.rainfall, 'precipitation'),
    et0: summarizeRainfallOrEt0(ca.et0, 'et0_fao'),
    rolling_windows: summarizeClimateRolling(ca.rolling),
    irrigation_quick_calc: summarizeIrrigationQuickCalc(ca.irrigationQuickCalc, ca.rolling),
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

const OPEN_METEO_ARCHIVE_THRESHOLD_DAYS = 92;

function parseClimateIsoDateLocal(isoDate) {
  const parts = String(isoDate || '').split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(d.getTime()) ? null : d;
}

function climateTodayKey() {
  const today = new Date();
  return (
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0')
  );
}

function daysFromTodayToClimateStartDate(startDate) {
  const today = parseClimateIsoDateLocal(climateTodayKey());
  const start = parseClimateIsoDateLocal(startDate);
  if (!today || !start) return 0;
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}

function shouldUseOpenMeteoArchiveClimate(startDate) {
  return daysFromTodayToClimateStartDate(startDate) > OPEN_METEO_ARCHIVE_THRESHOLD_DAYS;
}

async function fetchOpenMeteoDailyClimate(lat, lng, startDate, endDate, useArchive) {
  if (typeof useArchive !== 'boolean') useArchive = shouldUseOpenMeteoArchiveClimate(startDate);
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
  const todayKey = climateTodayKey();
  if (end > todayKey) end = todayKey;
  return await fetchOpenMeteoDailyClimate(lat, lng, start, end, shouldUseOpenMeteoArchiveClimate(start));
}

function addDaysIsoClimate(isoDate, days) {
  const parts = String(isoDate || '').split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return isoDate;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + days);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function computeRollingWindowsFromDaily(daily) {
  const times = (daily && daily.time) || [];
  const rain = (daily && daily.precipitation_sum) || [];
  const et0 = (daily && daily.et0_fao_evapotranspiration) || [];
  function sumLast(n, values) {
    const start = Math.max(0, values.length - n);
    let s = 0;
    let has = false;
    for (let i = start; i < values.length; i++) {
      const v = Number(values[i]);
      if (Number.isFinite(v)) {
        s += v;
        has = true;
      }
    }
    return has ? roundClimate1(s) : null;
  }
  function lastVal(values) {
    if (!values.length) return null;
    const v = Number(values[values.length - 1]);
    return Number.isFinite(v) ? roundClimate1(v) : null;
  }
  return {
    fetchedAt: new Date().toISOString(),
    dateEnd: times.length ? String(times[times.length - 1]) : climateTodayKey(),
    et0Today: lastVal(et0),
    rainToday: lastVal(rain),
    et0_1d: sumLast(1, et0),
    rain_1d: sumLast(1, rain),
    et0_7d: sumLast(7, et0),
    rain_7d: sumLast(7, rain),
    et0_30d: sumLast(30, et0),
    rain_30d: sumLast(30, rain),
    source: 'open_meteo_live_query'
  };
}

async function fetchRollingClimateWindowsLive(lat, lng) {
  const today = climateTodayKey();
  const start30 = addDaysIsoClimate(today, -29);
  const daily = await fetchOpenMeteoDailyClimate(lat, lng, start30, today, false);
  return computeRollingWindowsFromDaily(daily);
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

  const yearsToFetch = [];
  for (let yi = CLIMATE_HISTORY_YEARS - 1; yi >= 0; yi--) yearsToFetch.push(currYear - yi);

  const dailyByYear = await Promise.all(
    yearsToFetch.map((y) => {
      const end = y === currYear ? todayKey : y + '-12-31';
      return fetchYearDailyClimate(lat, lng, y, end).catch(() => ({
        time: [],
        precipitation_sum: [],
        et0_fao_evapotranspiration: []
      }));
    })
  );

  function buildYearsPayload(field) {
    const years = {};
    yearsToFetch.forEach((y, idx) => {
      const daily = dailyByYear[idx] || {};
      years[String(y)] = {
        months: aggregateDailyByMonthClimate(daily.time, daily[field], y),
        partial: y === currYear
      };
    });
    return years;
  }

  const rainYears = buildYearsPayload('precipitation_sum');
  const et0Years = buildYearsPayload('et0_fao_evapotranspiration');
  const rainPrev = rainYears[String(prevYear)] ? rainYears[String(prevYear)].months : {};
  const rainCurr = rainYears[String(currYear)] ? rainYears[String(currYear)].months : {};
  const et0Prev = et0Years[String(prevYear)] ? et0Years[String(prevYear)].months : {};
  const et0Curr = et0Years[String(currYear)] ? et0Years[String(currYear)].months : {};

  const fetchedAt = new Date().toISOString();
  const rainfall = {
    fetchedAt,
    lat,
    lng,
    previousYear: prevYear,
    currentYear: currYear,
    years: rainYears,
    monthsPrev: rainPrev,
    monthsCurr: rainCurr,
    diff: climateMonthDiff(rainCurr, rainPrev),
    unit: 'mm'
  };
  const et0 = {
    fetchedAt,
    lat,
    lng,
    previousYear: prevYear,
    currentYear: currYear,
    years: et0Years,
    monthsPrev: et0Prev,
    monthsCurr: et0Curr,
    diff: climateMonthDiff(et0Curr, et0Prev),
    unit: 'mm'
  };

  return {
    source: 'open_meteo_live_query',
    note:
      'No guardado en el proyecto; consulta en vivo para admin (hasta ' +
      CLIMATE_HISTORY_YEARS +
      ' años). Para lo que guardó el usuario usa mode=saved.',
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
  const [res, rolling] = await Promise.all([
    fetch(url),
    fetchRollingClimateWindowsLive(lat, lng).catch(() => null)
  ]);
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
    cloudCover: cur.cloud_cover,
    rainTodayMm:
      rolling && rolling.rain_1d != null
        ? rolling.rain_1d
        : rolling && rolling.rainToday != null
          ? rolling.rainToday
          : null,
    et0TodayMm:
      rolling && rolling.et0_1d != null
        ? rolling.et0_1d
        : rolling && rolling.et0Today != null
          ? rolling.et0Today
          : null
  };
  return {
    source: 'open_meteo_live_query',
    ...summarizeClimateLiveReading(reading),
    rolling_windows_hoy: rolling ? summarizeClimateRolling(rolling) : { has_data: false },
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
  const wantRolling =
    mode === 'rolling' ||
    mode === 'all' ||
    wantLive ||
    wantRainRefresh ||
    params.rolling === true ||
    params.rolling === 'true';

  out.gpt_climate_note =
    'Clima en vivo SIN alterar datos del suscriptor. project_climate params.mode: saved (default, snapshot: lluvia/ET₀ hasta 4 años en rainfall.years y et0.years; tiempo actual con rain_today_mm/et0_today_mm) | live (tiempo actual + lluvia/ET₀ del día) | rainfall_refresh (4 años mensuales en vivo) | rolling (1/7/30 d) | all. VPD: project_vpd_live. Radar: radar_project. Para histórico mensual usa climate_saved.rainfall.years. Si piden «actualizado», usa mode=all; NO digas que no tienes acceso.';

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

  if (wantRolling) {
    if (!loc) {
      out.rolling_windows_ahora = { has_data: false, message: 'Sin polígono.' };
    } else {
      try {
        const rollLive = await fetchRollingClimateWindowsLive(loc.lat, loc.lng);
        out.rolling_windows_ahora = {
          ...summarizeClimateRolling(rollLive),
          source: 'open_meteo_live_query',
          note: 'Ventanas 1/7/30 d en vivo. No modifica el proyecto del suscriptor.'
        };
        const iqc = data.climateAnalysis && data.climateAnalysis.irrigationQuickCalc;
        if (iqc && out.rolling_windows_ahora.has_data) {
          out.irrigation_quick_calc_live = {
            ...summarizeIrrigationQuickCalc(iqc, rollLive),
            note:
              'Kc, riego y áreas del guardado del usuario; ETo/lluvia satélite en vivo (rolling_windows_ahora). Solo lectura admin.'
          };
        }
      } catch (e) {
        out.rolling_windows_ahora = { has_data: false, error: e.message };
      }
    }
  }

  if (!wantSaved && !wantLive && !wantRainRefresh && !wantRolling) {
    out.hint =
      'params.mode: saved (default), live, rainfall_refresh, rolling, o all. Ej: {"action":"project_climate","params":{"project_name":"X","mode":"all"}}';
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

async function getMyProgramOwnerProfile(supabase) {
  const targetEmail = String(process.env.NUTRIPLANT_GPT_PERSONAL_EMAIL || ADMIN_EMAIL_LC)
    .trim()
    .toLowerCase();
  const profiles = await fetchProfiles(supabase);
  return profiles.find((p) => String(p.email || '').trim().toLowerCase() === targetEmail) || null;
}

function isMyProgramProject(row, ownerId) {
  if (!row || row.user_id !== ownerId) return false;
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  return data.gptPersonalProgram === true && data.created_by_gpt === true;
}

function newMyProgramProjectId() {
  return 'np_gpt_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function buildMyProgramProjectData(projectId, owner, params) {
  const now = new Date().toISOString();
  const name = String(params.title || params.project_name || params.name || 'Programa GPT personal').trim();
  const crop = String(params.crop || params.cultivo || '').trim();
  const variety = String(params.variedad || params.variety || '').trim();
  const expectedYield = params.rendimientoEsperado ?? params.target_yield ?? params.yield ?? null;
  const draft = parseMaybeJsonObject(params.program_data || params.draft || params.program || null, {});
  return {
    id: projectId,
    code: projectId,
    name,
    title: name,
    user_id: owner.id,
    userId: owner.id,
    user_name: owner.name || '',
    user_email: owner.email || '',
    cultivo: crop || null,
    crop_type: crop || null,
    variedad: variety || null,
    campoOsector: params.campoOsector || params.sector || 'GPT personal',
    rendimientoEsperado: expectedYield,
    unidadRendimiento: params.unidadRendimiento || params.yield_unit || 't/ha',
    location: {
      projectId,
      coordinates: '',
      surface: '',
      perimeter: '',
      polygon: null,
      city: '',
      state: '',
      country: '',
      center: null,
      area: null,
      areaHectares: null,
      areaAcres: null
    },
    amendments: {
      selected: [],
      results: { type: '', amount: '', caContribution: '', naRemoval: '', detailedHTML: '', isVisible: false },
      lastUpdated: null
    },
    soilAnalysis: {
      initial: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0, cic: 0 },
      properties: { ph: 0, density: 0, depth: 0 },
      adjustments: { k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0 },
      lastUpdated: null
    },
    granular: null,
    fertirriego: null,
    hydroponics: null,
    vpdAnalysis: {
      environmental: { temperature: null, humidity: null, vpd: null, hd: null, calculatedAt: null, location: { lat: null, lng: null }, source: null },
      advanced: { airTemperature: null, airHumidity: null, mode: null, leafTemperature: null, solarRadiation: null, calculatedLeafTemp: null, vpd: null, hd: null, calculatedAt: null },
      history: [],
      rangeState: { granularity: 'daily', startDate: '', endDate: '' },
      currentRangeTable: null,
      rangeTables: [],
      lastUpdated: null
    },
    climateAnalysis: null,
    calculations: {},
    documents: [],
    chat_history: [],
    gptPersonalProgram: true,
    created_by_gpt: true,
    admin_personal_draft: true,
    program_status: params.program_status || 'draft',
    gptProgramDraft: {
      title: name,
      type: params.program_type || params.type || 'nutricion',
      crop: crop || null,
      created_at: now,
      updated_at: now,
      notes: params.notes || params.note || '',
      data: draft || {}
    },
    status: 'active',
    version: '1.0',
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now
  };
}

function summarizeMyProgramProject(row) {
  const data = row.data || {};
  return {
    id: row.id,
    name: row.name || row.title || data.name || data.title || 'Sin nombre',
    crop: getProjectCrop(data),
    updated_at: row.updated_at,
    program_status: data.program_status || 'draft',
    has_fertirriego: !!data.fertirriego,
    has_granular: !!data.granular,
    draft_title: data.gptProgramDraft && data.gptProgramDraft.title ? data.gptProgramDraft.title : null
  };
}

async function fetchMyProgramProjects(supabase, ownerId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id, name, title, data, created_at, updated_at')
    .eq('user_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('my_program_project_list: ' + error.message);
  return (data || []).filter((p) => !isSoftDeletedProject(p) && isMyProgramProject(p, ownerId));
}

async function resolveMyProgramProject(supabase, ownerId, params) {
  const resolved = await resolveProject(supabase, params);
  if (!resolved.found) return resolved;
  if (!isMyProgramProject(resolved.project, ownerId)) {
    return {
      found: false,
      blocked: true,
      message:
        'Bloqueado por seguridad: esta action solo puede operar proyectos GPT personales del usuario admin configurado.'
    };
  }
  return resolved;
}

async function handleMyProgramProjectCreate(supabase, params) {
  const owner = await getMyProgramOwnerProfile(supabase);
  if (!owner) return { ok: false, domain: 'my_programs', error: 'No se encontró el usuario personal admin.' };
  const projectId = newMyProgramProjectId();
  const projectData = buildMyProgramProjectData(projectId, owner, params || {});
  const row = {
    id: projectId,
    user_id: owner.id,
    name: projectData.name,
    title: projectData.title,
    data: projectData,
    updated_at: projectData.updated_at
  };
  const { data, error } = await supabase.from('projects').insert(row).select('id, user_id, name, title, data, created_at, updated_at').single();
  if (error) throw new Error('my_program_project_create: ' + error.message);
  return {
    ok: true,
    domain: 'my_programs',
    created: true,
    message: 'Proyecto/programa personal creado. Se verá en el dashboard al entrar con el usuario admin.',
    owner: { id: owner.id, email: owner.email, name: owner.name },
    project: summarizeMyProgramProject(data),
    safety:
      'Solo se creó en el usuario personal admin; ninguna action my_program_* escribe en proyectos de suscriptores.'
  };
}

async function handleMyProgramProjectList(supabase, params) {
  const owner = await getMyProgramOwnerProfile(supabase);
  if (!owner) return { ok: false, domain: 'my_programs', error: 'No se encontró el usuario personal admin.' };
  const rows = await fetchMyProgramProjects(supabase, owner.id);
  const q = String((params && (params.q || params.search || params.project_name)) || '').trim().toLowerCase();
  const filtered = q
    ? rows.filter((p) => {
        const data = p.data || {};
        return (
          String(p.name || p.title || '').toLowerCase().includes(q) ||
          getProjectCrop(data).toLowerCase().includes(q) ||
          String(p.id || '').toLowerCase().includes(q)
        );
      })
    : rows;
  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 50, 1), 100);
  return {
    ok: true,
    domain: 'my_programs',
    owner: { id: owner.id, email: owner.email, name: owner.name },
    count: filtered.length,
    projects: filtered.slice(0, limit).map(summarizeMyProgramProject)
  };
}

async function handleMyProgramProjectGet(supabase, params) {
  const owner = await getMyProgramOwnerProfile(supabase);
  if (!owner) return { ok: false, domain: 'my_programs', error: 'No se encontró el usuario personal admin.' };
  const resolved = await resolveMyProgramProject(supabase, owner.id, params);
  if (!resolved.found) return { ok: true, domain: 'my_programs', ...resolved };
  const row = resolved.project;
  return {
    ok: true,
    domain: 'my_programs',
    project: summarizeMyProgramProject(row),
    data: row.data || {},
    sections: {
      fertirriego: summarizeFertirriego(getFertirriegoProgram(row.data || {}), params.fertirriego_stage_index ?? params.stage_index),
      granular: summarizeGranular(row.data || {})
    }
  };
}

async function handleMyProgramProjectUpdate(supabase, params) {
  const owner = await getMyProgramOwnerProfile(supabase);
  if (!owner) return { ok: false, domain: 'my_programs', error: 'No se encontró el usuario personal admin.' };
  const resolved = await resolveMyProgramProject(supabase, owner.id, params);
  if (!resolved.found) return { ok: true, domain: 'my_programs', ...resolved };
  const row = resolved.project;
  const current = row.data && typeof row.data === 'object' ? row.data : {};
  const now = new Date().toISOString();
  const next = { ...current, updated_at: now, updatedAt: now };
  const changed = [];

  if (params.title != null || params.name != null) {
    const label = String(params.title || params.name || '').trim();
    if (label) {
      next.name = label;
      next.title = label;
      changed.push('name/title');
    }
  }
  if (params.crop != null || params.cultivo != null) {
    const crop = String(params.crop || params.cultivo || '').trim();
    next.cultivo = crop || null;
    next.crop_type = crop || null;
    changed.push('crop');
  }
  if (params.program_status != null) {
    next.program_status = String(params.program_status || '').trim() || 'draft';
    changed.push('program_status');
  }

  const section = String(params.section || params.program_section || 'draft').trim().toLowerCase();
  const incoming = parseMaybeJsonObject(params.program_data || params.data || params.draft || params.program || null, null);
  const merge = params.merge === true || params.merge === 'true';
  if (incoming) {
    if (section === 'fertirriego') {
      next.fertirriego = merge && next.fertirriego && typeof next.fertirriego === 'object' ? { ...next.fertirriego, ...incoming } : incoming;
      changed.push('fertirriego');
    } else if (section === 'granular') {
      next.granular = merge && next.granular && typeof next.granular === 'object' ? { ...next.granular, ...incoming } : incoming;
      changed.push('granular');
    } else if (section === 'calculators') {
      next.calculations = merge && next.calculations && typeof next.calculations === 'object' ? { ...next.calculations, ...incoming } : incoming;
      changed.push('calculations');
    } else {
      const prevDraft = next.gptProgramDraft && typeof next.gptProgramDraft === 'object' ? next.gptProgramDraft : {};
      next.gptProgramDraft = {
        ...prevDraft,
        title: next.title || next.name || prevDraft.title || 'Programa GPT personal',
        type: params.program_type || params.type || prevDraft.type || 'nutricion',
        updated_at: now,
        notes: params.notes != null || params.note != null ? String(params.notes || params.note || '') : prevDraft.notes || '',
        data: merge && prevDraft.data && typeof prevDraft.data === 'object' ? { ...prevDraft.data, ...incoming } : incoming
      };
      changed.push('gptProgramDraft');
    }
  } else if (params.notes != null || params.note != null) {
    const prevDraft = next.gptProgramDraft && typeof next.gptProgramDraft === 'object' ? next.gptProgramDraft : {};
    next.gptProgramDraft = { ...prevDraft, updated_at: now, notes: String(params.notes || params.note || '') };
    changed.push('gptProgramDraft.notes');
  }

  if (!changed.length) {
    return {
      ok: true,
      domain: 'my_programs',
      updated: false,
      message:
        'Nada que actualizar. Usa title, crop/cultivo, program_status, notes o program_data con section=draft|fertirriego|granular|calculators.'
    };
  }

  next.gptPersonalProgram = true;
  next.created_by_gpt = true;
  next.admin_personal_draft = true;
  const patch = {
    name: next.name || next.title || row.name || row.title || 'Programa GPT personal',
    title: next.title || next.name || row.title || row.name || '',
    data: next,
    updated_at: now
  };
  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', row.id)
    .eq('user_id', owner.id)
    .select('id, user_id, name, title, data, created_at, updated_at')
    .single();
  if (error) throw new Error('my_program_project_update: ' + error.message);
  return {
    ok: true,
    domain: 'my_programs',
    updated: true,
    fields_changed: changed,
    project: summarizeMyProgramProject(data),
    safety: 'Actualización permitida solo porque el proyecto pertenece al admin personal y está marcado como GPT personal.'
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

function normalizePlanProMapsUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function getPlanProMapsLocation(item) {
  const attachments = Array.isArray(item && item.attachments) ? item.attachments : [];
  for (let i = attachments.length - 1; i >= 0; i--) {
    const att = attachments[i];
    if (!att || typeof att !== 'object') continue;
    if (att.type !== 'maps_location') continue;
    const url = normalizePlanProMapsUrl(att.url || att.maps_url);
    if (!url) continue;
    const coord = /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url);
    return {
      title: att.title || 'Ubicación / Maps',
      maps_url: url,
      lat: coord ? parseFloat(coord[1]) : null,
      lng: coord ? parseFloat(coord[2]) : null,
      created_at: att.created_at || null
    };
  }
  return null;
}

/* ——— Nutri PRO (bóveda técnica: carpetas, archivos, enlaces) ——— */
const NUTRI_PRO_STORAGE_BUCKET = 'plan-pro-nutri-pro';

const NUTRI_LINK_CAT_LABELS = {
  nutricion_vegetal: 'Nutrición vegetal',
  agronomia: 'Agronomía',
  trabajo: 'Trabajo',
  personal: 'Personal',
  negocio: 'Negocio / NutriPlant',
  investigacion: 'Investigación',
  herramientas: 'Herramientas',
  ingles: 'Inglés',
  escuela: 'Escuela / Educación',
  idiomas: 'Idiomas',
  finanzas: 'Finanzas',
  salud: 'Salud',
  otro: 'Otro'
};

function nutriProSchemaMissing(error) {
  const em = (error && error.message) || '';
  return /plan_pro_nutri|does not exist|schema cache/i.test(em);
}

function nutriLinkCategoryLabel(catId) {
  if (!catId) return 'Otro';
  if (NUTRI_LINK_CAT_LABELS[catId]) return NUTRI_LINK_CAT_LABELS[catId];
  return String(catId)
    .replace(/^custom_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function nutriFolderMapById(folders) {
  const m = {};
  (folders || []).forEach((f) => {
    if (f && f.id) m[f.id] = f;
  });
  return m;
}

function nutriFolderPathChain(folderId, foldersById) {
  const parts = [];
  let cur = folderId || null;
  let guard = 0;
  while (cur && guard++ < 50) {
    const f = foldersById[cur];
    if (!f) break;
    parts.unshift(f.title || 'Carpeta');
    cur = f.parent_id || null;
  }
  return parts;
}

function nutriFileShortPath(file, foldersById) {
  if (!file) return 'Archivo';
  const fname = file.title || file.original_name || 'Archivo';
  const chain = nutriFolderPathChain(file.folder_id, foldersById);
  return chain.length ? chain.join('/') + '/' + fname : fname;
}

function extractNutriRefsFromHtml(html) {
  const out = [];
  if (!html || !String(html).trim()) return out;
  const re = /<[^>]*\bnp-rich-nutri-ref\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const fileId = htmlTagAttr(tag, 'data-np-nutri-file-id');
    if (!fileId) continue;
    const label = htmlTagAttr(tag, 'data-np-ref-label') || stripHtmlSimple(tag).replace(/^📎\s*/, '');
    out.push({ nutri_file_id: fileId, label: label || 'Archivo Nutri PRO' });
  }
  return out;
}

function extractApunteRefsFromHtml(html) {
  const out = [];
  if (!html || !String(html).trim()) return out;
  const re = /<[^>]*\bnp-rich-apunte-ref\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const itemId = htmlTagAttr(tag, 'data-np-apunte-id');
    if (!itemId) continue;
    const label = htmlTagAttr(tag, 'data-np-ref-label') || stripHtmlSimple(tag).replace(/^📝\s*/, '');
    out.push({ apunte_id: itemId, label: label || 'Apunte' });
  }
  return out;
}

function collectNutriRefsFromItem(item) {
  const seen = new Set();
  const out = [];
  function merge(list) {
    (list || []).forEach((r) => {
      if (!r || !r.nutri_file_id || seen.has(r.nutri_file_id)) return;
      seen.add(r.nutri_file_id);
      out.push(r);
    });
  }
  if (!item) return out;
  merge(extractNutriRefsFromHtml(item.body_html));
  (item.body_blocks || []).forEach((b) => {
    if (b && b.type === 'note_section') merge(extractNutriRefsFromHtml(b.html));
  });
  return out;
}

function collectApunteRefsFromItem(item) {
  const seen = new Set();
  const out = [];
  function merge(list) {
    (list || []).forEach((r) => {
      if (!r || !r.apunte_id || seen.has(r.apunte_id)) return;
      seen.add(r.apunte_id);
      out.push(r);
    });
  }
  if (!item) return out;
  merge(extractApunteRefsFromHtml(item.body_html));
  (item.body_blocks || []).forEach((b) => {
    if (b && b.type === 'note_section') merge(extractApunteRefsFromHtml(b.html));
  });
  return out;
}

async function fetchNutriProFolders(supabase, ownerId) {
  const { data, error } = await supabase
    .from('plan_pro_nutri_folders')
    .select('id,parent_id,title,color_hex,sort_order,updated_at')
    .eq('owner_id', ownerId)
    .order('title', { ascending: true });
  if (error) {
    if (nutriProSchemaMissing(error)) return { ok: false, rows: [], setup: 'supabase-plan-pro-nutri-pro.sql' };
    throw new Error('plan_pro_nutri_folders: ' + error.message);
  }
  return { ok: true, rows: data || [] };
}

async function fetchNutriProFiles(supabase, ownerId, opts) {
  opts = opts || {};
  let q = supabase
    .from('plan_pro_nutri_files')
    .select('id,folder_id,title,original_name,description,mime_type,size_bytes,storage_path,created_at,updated_at')
    .eq('owner_id', ownerId)
    .order('title', { ascending: true });
  if (opts.folder_id) q = q.eq('folder_id', opts.folder_id);
  else if (opts.root_only) q = q.is('folder_id', null);
  const limit = Math.min(parseInt(opts.limit, 10) || 500, 500);
  q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    if (nutriProSchemaMissing(error)) return { ok: false, rows: [], setup: 'supabase-plan-pro-nutri-pro.sql' };
    throw new Error('plan_pro_nutri_files: ' + error.message);
  }
  return { ok: true, rows: data || [] };
}

async function fetchNutriProLinks(supabase, ownerId, opts) {
  opts = opts || {};
  let q = supabase
    .from('plan_pro_nutri_links')
    .select('id,folder_id,title,description,url,category,created_at,updated_at')
    .eq('owner_id', ownerId)
    .order('title', { ascending: true });
  if (opts.folder_id) q = q.eq('folder_id', opts.folder_id);
  else if (opts.root_only) q = q.is('folder_id', null);
  if (opts.category) q = q.eq('category', opts.category);
  const limit = Math.min(parseInt(opts.limit, 10) || 500, 500);
  q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    if (nutriProSchemaMissing(error)) return { ok: false, rows: [], setup: 'supabase-plan-pro-nutri-pro-links.sql' };
    throw new Error('plan_pro_nutri_links: ' + error.message);
  }
  return { ok: true, rows: data || [] };
}

function mapNutriProFileRow(file, foldersById, extractByFileId) {
  const ex = extractByFileId && file && file.id ? extractByFileId[file.id] : null;
  const openUrl = nutriProFileOpenUrl(file.id, nutriProPublicBaseUrl());
  const row = {
    id: file.id,
    nutri_file_id: file.id,
    folder_id: file.folder_id || null,
    title: file.title || file.original_name || 'Archivo',
    original_name: file.original_name || null,
    description: (file.description || '').trim() || null,
    short_path: nutriFileShortPath(file, foldersById),
    mime_type: file.mime_type || null,
    size_bytes: file.size_bytes || 0,
    storage_bucket: NUTRI_PRO_STORAGE_BUCKET,
    open_url: openUrl || null,
    updated_at: file.updated_at
  };
  if (ex) {
    row.extract_status = ex.status || null;
    row.text_indexed = ex.status === 'done';
    row.extract_format = ex.format_kind || null;
    row.text_char_count = ex.meta_json && ex.meta_json.char_count != null ? ex.meta_json.char_count : null;
    row.extracted_at = ex.extracted_at || null;
    if (ex.status === 'skipped' || ex.status === 'error') row.extract_note = ex.error_message || null;
  } else {
    row.extract_status = null;
    row.text_indexed = false;
  }
  if (!row.text_indexed) {
    row.reindex_hint =
      'Sin texto útil indexado. Usa nutri_pro_reindex con nutri_file_id (mode=text o mode=ocr para PDF escaneado/imagen). Luego nutri_pro_file_text o nutri_pro_ask.';
  }
  return row;
}

async function fetchNutriProExtractsMap(supabase, ownerId, fileIds) {
  const map = {};
  if (!fileIds || !fileIds.length) return map;
  const { data, error } = await supabase
    .from('plan_pro_nutri_file_extracts')
    .select('file_id,status,format_kind,meta_json,error_message,extracted_at')
    .eq('owner_id', ownerId)
    .in('file_id', fileIds);
  if (error) {
    if (/plan_pro_nutri_file_extracts|does not exist|schema/i.test(error.message || '')) return map;
    throw new Error('plan_pro_nutri_file_extracts: ' + error.message);
  }
  (data || []).forEach((row) => {
    if (row && row.file_id) map[row.file_id] = row;
  });
  return map;
}

async function fetchNutriProIndexedExtracts(supabase, ownerId, opts) {
  opts = opts || {};
  let q = supabase
    .from('plan_pro_nutri_file_extracts')
    .select('file_id,status,format_kind,text_plain,meta_json,extracted_at')
    .eq('owner_id', ownerId)
    .eq('status', 'done');
  if (opts.file_id) q = q.eq('file_id', opts.file_id);
  const term = (opts.ilike_term || '').trim();
  if (term) q = q.ilike('text_plain', '%' + term + '%');
  const limit = Math.min(parseInt(opts.limit, 10) || 120, 150);
  q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    if (/plan_pro_nutri_file_extracts|does not exist|schema/i.test(error.message || '')) return [];
    throw new Error('plan_pro_nutri_file_extracts search: ' + error.message);
  }
  return data || [];
}

async function findApuntesForNutriAsk(supabase, ownerId, fileIds, qRaw, areasById, categories, opts) {
  opts = opts || {};
  const limit = Math.min(parseInt(opts.limit, 10) || 10, 20);
  const items = await fetchPlanProItems(supabase, ownerId, { limit: 150 });
  const idSet = new Set(fileIds || []);
  const qLc = nutriContentSearch.normalizeForSearch(qRaw);
  const terms = nutriContentSearch.tokenizeQuery(qRaw);
  const linked = [];
  const related = [];

  items.forEach((item) => {
    const refs = collectNutriRefsFromItem(item);
    const linkedRefs = refs.filter((r) => idSet.has(r.nutri_file_id));
    const row = planProItemListRow(item, areasById, categories);
    if (linkedRefs.length) {
      linked.push({
        ...row,
        nutri_file_ids: linkedRefs.map((r) => r.nutri_file_id),
        nutri_ref_labels: linkedRefs.map((r) => r.label)
      });
      return;
    }
    const textHit =
      (qLc && itemMatchesSearch(item, qLc, areasById)) ||
      terms.some((t) => itemMatchesSearch(item, t, areasById));
    if (textHit) related.push(row);
  });

  return {
    linked_apuntes: linked.slice(0, limit),
    related_apuntes: related.slice(0, limit)
  };
}

function mapNutriProLinkRow(link, foldersById) {
  const folderPath = link.folder_id ? nutriFolderPathChain(link.folder_id, foldersById).join(' / ') : 'Raíz';
  return {
    id: link.id,
    folder_id: link.folder_id || null,
    folder_path: folderPath,
    title: link.title || 'Enlace',
    description: link.description || null,
    url: link.url,
    category: link.category || 'otro',
    category_label: nutriLinkCategoryLabel(link.category),
    updated_at: link.updated_at
  };
}

async function enrichNutriRefsWithFiles(supabase, ownerId, refs, foldersById) {
  if (!refs || !refs.length) return [];
  const ids = refs.map((r) => r.nutri_file_id).filter(Boolean);
  const { data, error } = await supabase
    .from('plan_pro_nutri_files')
    .select('id,folder_id,title,original_name,description,mime_type,size_bytes,updated_at')
    .eq('owner_id', ownerId)
    .in('id', ids);
  if (error && !nutriProSchemaMissing(error)) throw new Error('nutri_refs enrich: ' + error.message);
  const byId = {};
  (data || []).forEach((f) => {
    if (f && f.id) byId[f.id] = f;
  });
  return refs.map((r) => {
    const f = byId[r.nutri_file_id];
    if (!f) {
      return { ...r, file_found: false, aviso: 'Archivo no encontrado en Nutri PRO (pudo borrarse).' };
    }
    return {
      ...r,
      file_found: true,
      title: f.title || f.original_name,
      description: (f.description || '').trim() || null,
      short_path: nutriFileShortPath(f, foldersById),
      mime_type: f.mime_type || null,
      size_bytes: f.size_bytes || 0,
      folder_id: f.folder_id || null
    };
  });
}

async function handleNutriProCatalog(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  if (!foldersRes.ok) {
    return {
      ok: true,
      domain: 'nutri_pro',
      available: false,
      error: 'Nutri PRO no está instalado en Supabase.',
      setup_sql: [foldersRes.setup, 'supabase-plan-pro-nutri-pro-storage.sql', 'supabase-plan-pro-nutri-pro-links.sql']
    };
  }

  const filesRes = await fetchNutriProFiles(supabase, ownerId, { limit: (params && params.limit) || 400 });
  const linksRes = await fetchNutriProLinks(supabase, ownerId, { limit: (params && params.limit) || 400 });
  const foldersById = nutriFolderMapById(foldersRes.rows);

  const folders = foldersRes.rows.map((f) => ({
    id: f.id,
    parent_id: f.parent_id || null,
    title: f.title,
    path: nutriFolderPathChain(f.id, foldersById).join(' / '),
    color_hex: f.color_hex || null,
    updated_at: f.updated_at
  }));

  const extractMap = await fetchNutriProExtractsMap(
    supabase,
    ownerId,
    (filesRes.rows || []).map((f) => f.id)
  );
  const files = (filesRes.rows || []).map((f) => mapNutriProFileRow(f, foldersById, extractMap));
  const links = (linksRes.rows || []).map((l) => mapNutriProLinkRow(l, foldersById));

  const bytesTotal = files.reduce((s, f) => s + (f.size_bytes || 0), 0);
  const indexedCount = files.filter((f) => f.text_indexed).length;

  return {
    ok: true,
    domain: 'nutri_pro',
    available: true,
    counts: {
      folders: folders.length,
      files: files.length,
      links: links.length,
      storage_bytes: bytesTotal,
      files_text_indexed: indexedCount
    },
    folders,
    files,
    links,
    gpt_usage:
      'Lista tu bóveda Nutri PRO. Cada archivo trae open_url (link permanente). nutri_pro_ask responde con fragmentos. nutri_pro_file_text lee texto. nutri_pro_reindex reindexa/OCR. nutri_pro_save guarda content en folder_path.',
    lectura_archivos:
      'Formatos indexados: PDF, .docx, .xlsx/.xls/.csv, .pptx, .txt/.rtf, OpenDocument (.odt/.ods/.odp). Imágenes y .doc/.ppt antiguos: sin texto aún. Preguntas: nutri_pro_ask.'
  };
}

async function handleNutriProSearch(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const qRaw = (params.q || params.search || '').trim();
  const q = qRaw.toLowerCase();
  if (!q) {
    return { ok: true, domain: 'nutri_pro', error: 'Indica params.q o params.search (texto a buscar).' };
  }

  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  if (!foldersRes.ok) {
    return {
      ok: true,
      domain: 'nutri_pro',
      available: false,
      error: 'Nutri PRO no está instalado en Supabase.',
      setup_sql: foldersRes.setup
    };
  }

  const foldersById = nutriFolderMapById(foldersRes.rows);
  const folderId = (params.folder_id || '').trim() || null;
  const kind = String(params.kind || 'all').toLowerCase();
  const category = (params.category || '').trim() || null;
  const limit = Math.min(parseInt(params.limit, 10) || 40, 80);
  const includeSnippets = params.include_snippets === true || params.include_snippets === 'true';
  const terms = nutriContentSearch.tokenizeQuery(qRaw);
  const dbTerm = nutriContentSearch.bestDbFilterTerm(terms, qRaw);

  const fileOpts = { limit: 500 };
  const linkOpts = { limit: 500 };
  if (folderId) {
    fileOpts.folder_id = folderId;
    linkOpts.folder_id = folderId;
  }
  if (category) linkOpts.category = category;

  let files = [];
  let links = [];

  const extractTextByFileId = {};

  if (kind !== 'links') {
    const filesRes = await fetchNutriProFiles(supabase, ownerId, fileOpts);
    const fileIds = (filesRes.rows || []).map((f) => f.id);
    const extractMap = await fetchNutriProExtractsMap(supabase, ownerId, fileIds);

    const contentRows = await fetchNutriProIndexedExtracts(supabase, ownerId, {
      ilike_term: dbTerm || q,
      limit: 100
    });
    contentRows.forEach((row) => {
      if (row && row.file_id) extractTextByFileId[row.file_id] = row.text_plain || '';
    });

    const missingTextIds = fileIds.filter(
      (id) => extractMap[id] && extractMap[id].status === 'done' && !extractTextByFileId[id]
    );
    if (missingTextIds.length) {
      const { data: moreText, error: moreErr } = await supabase
        .from('plan_pro_nutri_file_extracts')
        .select('file_id,text_plain')
        .eq('owner_id', ownerId)
        .eq('status', 'done')
        .in('file_id', missingTextIds.slice(0, 80));
      if (!moreErr) {
        (moreText || []).forEach((row) => {
          if (row && row.file_id) extractTextByFileId[row.file_id] = row.text_plain || '';
        });
      }
    }

    const ranked = nutriContentSearch.rankNutriHits(
      (filesRes.rows || []).map((f) => ({
        ...mapNutriProFileRow(f, foldersById, extractMap),
        text_plain: extractTextByFileId[f.id] || ''
      })),
      terms,
      qRaw,
      120
    );

    files = ranked
      .filter((f) => {
        const hay = [f.title, f.original_name, f.description, f.short_path, f.mime_type].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q) || extractTextByFileId[f.id] || f.matched_in_content || f.score > 0;
      })
      .map((f) => {
        const textPlain = extractTextByFileId[f.id] || '';
        const row = {
          ...f,
          matched_in_content: !!textPlain || f.matched_in_content || undefined,
          relevance_score: f.score
        };
        if (includeSnippets && textPlain) {
          row.snippets = nutriContentSearch.extractSnippets(textPlain, terms.length ? terms : [q], {
            maxSnippets: 2,
            maxSnippetLen: 280
          });
        }
        delete row.text_plain;
        return row;
      });
  }

  if (kind !== 'files') {
    const linksRes = await fetchNutriProLinks(supabase, ownerId, linkOpts);
    links = (linksRes.rows || [])
      .map((l) => mapNutriProLinkRow(l, foldersById))
      .filter((l) => {
        const hay = [l.title, l.description, l.url, l.category_label, l.folder_path].filter(Boolean).join(' ');
        return nutriContentSearch.partialTextMatches(hay, qRaw, { titleHay: l.title || '' });
      });
  }

  const nutriFileId = (params.nutri_file_id || params.file_id || '').trim();
  if (nutriFileId && !files.some((f) => f.id === nutriFileId)) {
    const { data: one } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,folder_id,title,original_name,description,mime_type,size_bytes,updated_at')
      .eq('owner_id', ownerId)
      .eq('id', nutriFileId)
      .maybeSingle();
    if (one) {
      const exMap = await fetchNutriProExtractsMap(supabase, ownerId, [one.id]);
      files.unshift(mapNutriProFileRow(one, foldersById, exMap));
    }
  }

  return {
    ok: true,
    domain: 'nutri_pro',
    query: q,
    folder_id: folderId,
    kind,
    counts: { files: files.length, links: links.length },
    files: files.slice(0, limit),
    links: links.slice(0, limit),
    search_terms: terms,
    ranked: true,
    gpt_hint:
      'Ordenado por relevance_score. snippets (si include_snippets) o nutri_pro_ask para preguntas. Cruza apuntes con plan_pro_item / linked_apuntes en nutri_pro_ask. Búsqueda flexible: palabras sueltas bastan; no pidas título exacto al usuario.'
  };
}

async function handleNutriProAsk(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const qRaw = (params.q || params.question || params.search || '').trim();
  if (!qRaw) {
    return { ok: true, domain: 'nutri_pro', error: 'Indica params.q o params.question (tu pregunta).' };
  }

  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  if (!foldersRes.ok) {
    return {
      ok: true,
      domain: 'nutri_pro',
      available: false,
      error: 'Nutri PRO no instalado.',
      setup_sql: foldersRes.setup
    };
  }

  const foldersById = nutriFolderMapById(foldersRes.rows);
  const folderId = (params.folder_id || '').trim() || null;
  const nutriFileId = (params.nutri_file_id || params.file_id || '').trim() || null;
  const limit = Math.min(parseInt(params.limit, 10) || 6, 12);
  const snippetChars = Math.min(parseInt(params.snippet_chars, 10) || 320, 500);
  const terms = nutriContentSearch.tokenizeQuery(qRaw);
  const dbTerm = nutriContentSearch.bestDbFilterTerm(terms, qRaw);

  const fileOpts = { limit: 500 };
  if (folderId) fileOpts.folder_id = folderId;

  let candidateFiles = [];
  const extractTextByFileId = {};

  if (nutriFileId) {
    const { data: oneFile } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,folder_id,title,original_name,description,mime_type,size_bytes,storage_path,updated_at')
      .eq('owner_id', ownerId)
      .eq('id', nutriFileId)
      .maybeSingle();
    if (oneFile) candidateFiles = [oneFile];
    const rows = await fetchNutriProIndexedExtracts(supabase, ownerId, { file_id: nutriFileId, limit: 1 });
    rows.forEach((row) => {
      if (row && row.file_id) extractTextByFileId[row.file_id] = row.text_plain || '';
    });
  } else {
    const contentRows = await fetchNutriProIndexedExtracts(supabase, ownerId, {
      ilike_term: dbTerm || nutriContentSearch.normalizeForSearch(qRaw),
      limit: 100
    });
    contentRows.forEach((row) => {
      if (row && row.file_id) extractTextByFileId[row.file_id] = row.text_plain || '';
    });
    const filesRes = await fetchNutriProFiles(supabase, ownerId, fileOpts);
    candidateFiles = filesRes.rows || [];
  }

  const extractMap = await fetchNutriProExtractsMap(
    supabase,
    ownerId,
    candidateFiles.map((f) => f.id)
  );

  const ranked = nutriContentSearch.rankNutriHits(
    candidateFiles.map((f) => {
      const mapped = mapNutriProFileRow(f, foldersById, extractMap);
      return {
        ...mapped,
        text_plain: extractTextByFileId[f.id] || ''
      };
    }),
    terms,
    qRaw,
    limit
  );

  const sources = ranked.map((hit, idx) => {
    const textPlain = extractTextByFileId[hit.id] || hit.text_plain || '';
    const snippets = textPlain
      ? nutriContentSearch.extractSnippets(textPlain, terms.length ? terms : [nutriContentSearch.normalizeForSearch(qRaw)], {
          maxSnippets: 3,
          maxSnippetLen: snippetChars
        })
      : [];
    return {
      rank: idx + 1,
      nutri_file_id: hit.id,
      title: hit.title,
      description: hit.description || null,
      short_path: hit.short_path,
      open_url: hit.open_url || null,
      format: hit.extract_format || null,
      text_indexed: hit.text_indexed,
      relevance_score: hit.score,
      matched_terms: hit.matched_terms || [],
      snippets,
      citation: '📎 ' + (hit.short_path || hit.title),
      aviso:
        !hit.text_indexed && hit.extract_note
          ? hit.extract_note
          : !hit.text_indexed
            ? 'Sin texto indexado en este archivo. Ofrece nutri_pro_reindex (mode=text|ocr).'
            : null
    };
  });

  const topFileIds = sources.map((s) => s.nutri_file_id).filter(Boolean);
  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  const categories = await fetchPlanProCategories(supabase);
  const apunteHits = await findApuntesForNutriAsk(supabase, ownerId, topFileIds, qRaw, areasById, categories, {
    limit: 8
  });

  const suggestions = [];
  const linkGapSuggestions = [];

  if (!sources.length) {
    suggestions.push('No hay fragmentos con esa pregunta. Prueba otra palabra o sube/indexa el archivo en Nutri PRO.');
  } else if (!sources.some((s) => s.text_indexed)) {
    suggestions.push(
      'Hay archivos por nombre pero sin texto indexado. Usa nutri_pro_reindex (mode=text o mode=ocr) y luego vuelve a preguntar.'
    );
  }

  const topPaths = sources
    .slice(0, 4)
    .map((s) => s.short_path || s.title)
    .filter(Boolean);

  if (apunteHits.linked_apuntes.length) {
    suggestions.push('Hay apuntes Plan PRO enlazados a estos archivos (ver linked_apuntes y unified_citations).');
  } else if (sources.length && apunteHits.related_apuntes.length) {
    apunteHits.related_apuntes.slice(0, 3).forEach((a) => {
      linkGapSuggestions.push(
        'El apunte «' +
          (a.title || 'sin título') +
          '» habla del tema pero no tiene 📎 enlazado; hay ' +
          sources.length +
          ' archivo(s) en Nutri PRO (' +
          topPaths.join(', ') +
          '). Enlaza desde Nutri PRO → Enlazar apunte.'
      );
    });
  } else if (sources.length >= 1 && !apunteHits.linked_apuntes.length && !apunteHits.related_apuntes.length) {
    linkGapSuggestions.push(
      'Hay ' + sources.length + ' documento(s) sobre el tema (' + topPaths.join(', ') + ') sin apunte Plan PRO vinculado.'
    );
  }

  const linkedByFile = {};
  apunteHits.linked_apuntes.forEach((a) => {
    (a.nutri_file_ids || []).forEach((fid) => {
      if (!linkedByFile[fid]) linkedByFile[fid] = [];
      linkedByFile[fid].push(a.title || 'Apunte');
    });
  });

  const unifiedCitations = sources
    .map((s) => {
      const snip = s.snippets && s.snippets[0] ? s.snippets[0].snippet : '';
      const apuntes = linkedByFile[s.nutri_file_id] || [];
      const line = apuntes.length
        ? '📝 ' + apuntes.join(', ') + ' ↔ ' + (s.citation || s.short_path) + (snip ? ': «' + snip + '»' : '')
        : (s.citation || s.short_path) + (snip ? ': «' + snip + '»' : '');
      return {
        nutri_file_id: s.nutri_file_id,
        file: s.citation || s.short_path,
        snippet: snip || null,
        apuntes_enlazados: apuntes,
        line
      };
    })
    .filter((c) => c.file);

  return {
    ok: true,
    domain: 'nutri_pro',
    question: qRaw,
    search_terms: terms,
    folder_id: folderId,
    nutri_file_id: nutriFileId || null,
    source_count: sources.length,
    sources,
    linked_apuntes: apunteHits.linked_apuntes,
    related_apuntes: apunteHits.related_apuntes,
    unified_citations: unifiedCitations,
    suggestions,
    link_gap_suggestions: linkGapSuggestions,
    gpt_usage:
      'Fase 4: usa unified_citations (apunte ↔ archivo ↔ fragmento). Cita line tal cual. link_gap_suggestions = apunte sin 📎 pero documentos existentes. Más texto: nutri_pro_file_text. No inventes cifras fuera de snippets.',
    gpt_citation_format:
      '📝 [Apunte] ↔ 📎 [ruta archivo]: «fragmento» — responde integrando apunte + documento cuando unified_citations lo permita.'
  };
}

async function handleNutriProFileText(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const fileId = resolveNutriProFileId(params);
  if (!fileId) {
    return {
      ok: true,
      domain: 'nutri_pro',
      error: 'Indica params.nutri_file_id, params.file_id o params.open_url (link permanente del archivo).'
    };
  }

  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  if (!foldersRes.ok) {
    return { ok: true, domain: 'nutri_pro', available: false, error: 'Nutri PRO no instalado.', setup_sql: foldersRes.setup };
  }
  const foldersById = nutriFolderMapById(foldersRes.rows);

  const { data: fileRec, error: fileErr } = await supabase
    .from('plan_pro_nutri_files')
    .select('id,folder_id,title,original_name,description,mime_type,size_bytes,updated_at')
    .eq('owner_id', ownerId)
    .eq('id', fileId)
    .maybeSingle();
  if (fileErr) throw new Error('nutri_pro_file_text file: ' + fileErr.message);
  if (!fileRec) {
    return { ok: true, domain: 'nutri_pro', found: false, message: 'Archivo no encontrado.' };
  }

  const { data: extract, error: exErr } = await supabase
    .from('plan_pro_nutri_file_extracts')
    .select('status,format_kind,text_plain,meta_json,error_message,extracted_at')
    .eq('file_id', fileId)
    .maybeSingle();
  if (exErr && !/plan_pro_nutri_file_extracts|does not exist|schema/i.test(exErr.message || '')) {
    throw new Error('nutri_pro_file_text extract: ' + exErr.message);
  }

  const maxChars = Math.min(Math.max(parseInt(params.max_chars, 10) || 12000, 500), 50000);
  const offset = Math.max(parseInt(params.offset, 10) || 0, 0);
  const fullText = (extract && extract.text_plain) || '';
  const preview = fullText.slice(offset, offset + maxChars);
  const mapped = mapNutriProFileRow(fileRec, foldersById, extract ? { [fileId]: extract } : {});

  return {
    ok: true,
    domain: 'nutri_pro',
    found: true,
    file: mapped,
    extract: extract
      ? {
          status: extract.status,
          format_kind: extract.format_kind || null,
          char_count: fullText.length,
          offset,
          preview,
          preview_chars: preview.length,
          has_more: offset + preview.length < fullText.length,
          truncated_at_storage: !!(extract.meta_json && extract.meta_json.truncated),
          error_message: extract.error_message || null,
          extracted_at: extract.extracted_at || null,
          meta: extract.meta_json || {}
        }
      : {
          status: 'missing',
          message:
            'Sin extracción aún. Usa nutri_pro_reindex con este nutri_file_id (mode=text o mode=ocr) y vuelve a leer.'
        },
    gpt_usage:
      'Cita short_path y comparte open_url si Jesús quiere abrir el archivo. Si status no es done o el texto es pobre: nutri_pro_reindex (ocr para escaneados/imágenes), luego relee con nutri_pro_file_text.'
  };
}

async function handleNutriProReindex(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const fileId = resolveNutriProFileId(params);
  if (!fileId) {
    return {
      ok: true,
      domain: 'nutri_pro',
      error: 'Indica params.nutri_file_id, params.file_id o params.open_url.'
    };
  }

  const modeRaw = String(params.mode || params.extract_mode || 'text').trim().toLowerCase();
  const mode = modeRaw === 'ocr' || modeRaw === 'ia' || modeRaw === 'vision' ? 'ocr' : 'text';
  const force = params.force === false || params.force === 'false' ? false : true;

  const { data: fileRec, error: fileErr } = await supabase
    .from('plan_pro_nutri_files')
    .select('id,folder_id,title,original_name,description,mime_type,size_bytes,updated_at')
    .eq('owner_id', ownerId)
    .eq('id', fileId)
    .maybeSingle();
  if (fileErr) throw new Error('nutri_pro_reindex file: ' + fileErr.message);
  if (!fileRec) {
    return { ok: true, domain: 'nutri_pro', found: false, message: 'Archivo no encontrado o no es del admin.' };
  }

  const result = await extractOneFile(supabase, fileId, force, mode);
  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  const foldersById = foldersRes.ok ? nutriFolderMapById(foldersRes.rows) : {};
  const extractMap = await fetchNutriProExtractsMap(supabase, ownerId, [fileId]);

  return {
    ok: !!(result && result.ok),
    domain: 'nutri_pro',
    action: 'nutri_pro_reindex',
    found: true,
    mode,
    force,
    result: {
      file_id: fileId,
      skipped: !!(result && result.skipped),
      status: (result && result.status) || null,
      format_kind: (result && result.format_kind) || null,
      char_count: (result && result.char_count) || null,
      error_message: (result && (result.error_message || result.error)) || null,
      message: (result && result.message) || null
    },
    file: mapNutriProFileRow(fileRec, foldersById, extractMap),
    gpt_next:
      result && result.ok && result.status === 'done'
        ? 'Indexación OK. Usa nutri_pro_file_text o nutri_pro_ask para responder con el texto nuevo.'
        : result && result.skipped
          ? 'Ya estaba indexado. Si el texto está mal, vuelve a llamar con force:true (default) y mode=ocr si es escaneado.'
          : 'Si falló o quedó vacío, prueba mode=ocr (PDF escaneado / imagen) o revisa extract_note.'
  };
}

function sanitizeNutriProFilename(name) {
  let base = String(name || 'socio-reporte.txt').trim() || 'socio-reporte.txt';
  base = base.replace(/[/\\?%*:|"<>]/g, '_');
  if (base.length > 180) base = base.slice(0, 180);
  return base;
}

function validateNutriProSaveBuffer(buffer, filename, fromBinary) {
  if (!fromBinary || !buffer || !buffer.length) return null;
  const ext = extOf(filename);
  const size = buffer.length;
  const minByExt = { pdf: 200, docx: 1500, xlsx: 1500, xls: 1500, pptx: 1500, png: 80, jpg: 100, jpeg: 100, webp: 80 };
  const min = minByExt[ext] || 80;
  const gptFix =
    'ChatGPT NO recibe el binario del adjunto en Actions. Lee el archivo en el chat y usa nutri_pro_save con params.content (texto íntegro) y filename .md o .txt (indexable). NO inventes content_base64. Para guardar el PDF/Excel ORIGINAL tal cual: Plan PRO en nutriplantpro.com → chat Socio → 📎 adjuntar → guardar en carpeta.';
  if (size < min) {
    return {
      error:
        'Binario inválido o incompleto (' +
        size +
        ' bytes) para .' +
        (ext || '?') +
        '. Probablemente ChatGPT no pudo enviar el adjunto real.',
      gpt_fix: gptFix,
      chatgpt_attachment_limit: true
    };
  }
  if (ext === 'pdf') {
    const head = buffer.slice(0, 5).toString('latin1');
    if (!head.startsWith('%PDF')) {
      return {
        error: 'No es un PDF válido (falta cabecera %PDF).',
        gpt_fix: gptFix,
        chatgpt_attachment_limit: true
      };
    }
  }
  if (ext === 'docx' || ext === 'xlsx' || ext === 'xls' || ext === 'pptx') {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return {
        error: 'No es un archivo Office válido (debe empezar con PK/ZIP).',
        gpt_fix: gptFix,
        chatgpt_attachment_limit: true
      };
    }
  }
  return null;
}

function mimeTypeFromNutriFilename(filename) {
  const ext = extOf(filename);
  const map = {
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    html: 'text/html',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  return map[ext] || 'application/octet-stream';
}

async function resolveNutriProFolderId(supabase, ownerId, params) {
  const fid = String(params.folder_id || '').trim();
  if (fid) {
    const { data } = await supabase
      .from('plan_pro_nutri_folders')
      .select('id')
      .eq('id', fid)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (data && data.id) return data.id;
  }
  const hint = String(params.folder_path || params.folder_title || params.folder || '').trim();
  if (!hint) return null;
  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  if (!foldersRes.ok) return null;
  const foldersById = nutriFolderMapById(foldersRes.rows);
  const normHint = hint
    .toLowerCase()
    .replace(/nutri\s*pro\s*[>/]?\s*/gi, '')
    .replace(/[>/\\]/g, '/')
    .trim();
  let best = null;
  let bestScore = 0;
  (foldersRes.rows || []).forEach((f) => {
    if (!f || !f.id) return;
    const path = nutriFolderPathChain(f.id, foldersById).join(' / ').toLowerCase();
    const title = String(f.title || '').toLowerCase();
    if (path === normHint || title === normHint) {
      best = f.id;
      bestScore = 10000;
      return;
    }
    if (normHint.indexOf('/') >= 0 && path.indexOf(normHint) >= 0 && path.length > bestScore) {
      best = f.id;
      bestScore = path.length;
    }
    if (
      (title.indexOf(normHint) >= 0 || normHint.indexOf(title) >= 0) &&
      title.length > bestScore &&
      title.length >= 2
    ) {
      best = f.id;
      bestScore = title.length;
    }
  });
  return best;
}

async function indexNutriProSavedFile(supabase, ownerId, fileId, buffer, fileRec) {
  const processingRow = {
    file_id: fileId,
    owner_id: ownerId,
    status: 'processing',
    format_kind: null,
    text_plain: null,
    meta_json: {},
    error_message: null,
    extracted_at: null
  };
  const { error: upsertErr } = await supabase.from('plan_pro_nutri_file_extracts').upsert(processingRow, {
    onConflict: 'file_id'
  });
  if (upsertErr) {
    if (/plan_pro_nutri_file_extracts|does not exist|schema/i.test(upsertErr.message || '')) {
      return {
        indexed: false,
        extract_status: 'unavailable',
        extract_note: 'Tabla plan_pro_nutri_file_extracts no instalada.'
      };
    }
    throw new Error('nutri_pro_save extract upsert: ' + upsertErr.message);
  }
  const extracted = await extractNutriProText(buffer, fileRec.original_name, fileRec.mime_type);
  const patch = {
    status: extracted.status,
    format_kind: extracted.format_kind || null,
    text_plain: extracted.text_plain || null,
    meta_json: extracted.meta_json || {},
    error_message: extracted.error_message || null,
    extracted_at: new Date().toISOString()
  };
  const { error: patchErr } = await supabase.from('plan_pro_nutri_file_extracts').update(patch).eq('file_id', fileId);
  if (patchErr) throw new Error('nutri_pro_save extract update: ' + patchErr.message);
  return {
    indexed: extracted.status === 'done',
    extract_status: extracted.status,
    char_count: (extracted.meta_json && extracted.meta_json.char_count) || (extracted.text_plain || '').length,
    extract_note: extracted.error_message || null
  };
}

async function handleNutriProSave(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const content = params.content != null ? String(params.content) : '';
  const contentBase64 = String(params.content_base64 || '').trim();
  if (!content.trim() && !contentBase64) {
    return {
      ok: true,
      domain: 'nutri_pro',
      error: 'Indica params.content (texto del reporte) o params.content_base64 (binario en base64).'
    };
  }

  let buffer;
  let fromBinary = false;
  if (contentBase64) {
    try {
      buffer = Buffer.from(contentBase64, 'base64');
      fromBinary = true;
    } catch (eB64) {
      return { ok: true, domain: 'nutri_pro', error: 'content_base64 inválido.' };
    }
  } else {
    buffer = Buffer.from(content, 'utf8');
  }

  const MAX_BYTES = 12 * 1024 * 1024;
  if (buffer.length > MAX_BYTES) {
    return { ok: true, domain: 'nutri_pro', error: 'Archivo demasiado grande (máx. ~12 MB).' };
  }
  if (!buffer.length) {
    return { ok: true, domain: 'nutri_pro', error: 'Contenido vacío.' };
  }

  let filename = sanitizeNutriProFilename(params.filename || params.original_name || params.title || '');
  let formatNote = null;
  if (!fromBinary && /\.(docx|xlsx|pptx|pdf)$/i.test(filename)) {
    const base = filename.replace(/\.[^.]+$/, '');
    const oldName = filename;
    filename = base + '.txt';
    formatNote =
      'El contenido era texto; se guardó como .txt indexable. Para un ' +
      oldName +
      ' binario real, envía content_base64.';
  }
  if (!/\./.test(filename)) filename += '.txt';

  const bufferCheck = validateNutriProSaveBuffer(buffer, filename, fromBinary);
  if (bufferCheck) {
    return {
      ok: true,
      domain: 'nutri_pro',
      saved: false,
      error: bufferCheck.error,
      gpt_fix: bufferCheck.gpt_fix,
      chatgpt_attachment_limit: bufferCheck.chatgpt_attachment_limit === true,
      gpt_usage:
        'No se guardó nada en Storage. Reintenta con params.content (texto leído del adjunto) y filename .md/.txt, o indica al usuario subir el original en Plan PRO → Socio 📎.'
    };
  }

  const folderId = await resolveNutriProFolderId(supabase, ownerId, params);
  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  if (!foldersRes.ok) {
    return {
      ok: true,
      domain: 'nutri_pro',
      available: false,
      error: 'Nutri PRO no instalado.',
      setup_sql: foldersRes.setup
    };
  }
  const foldersById = nutriFolderMapById(foldersRes.rows);
  const folderPath = folderId ? nutriFolderPathChain(folderId, foldersById).join(' / ') : 'Raíz';

  const fileId = crypto.randomUUID();
  const folderSeg = folderId || 'root';
  const storagePath = ownerId + '/' + folderSeg + '/' + fileId + '/' + filename;
  const mimeType = mimeTypeFromNutriFilename(filename);

  const { error: upErr } = await supabase.storage.from(NUTRI_PRO_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
    cacheControl: '3600'
  });
  if (upErr) {
    return {
      ok: true,
      domain: 'nutri_pro',
      error: 'Error al subir a Storage: ' + (upErr.message || 'desconocido')
    };
  }

  const title = (params.title && String(params.title).trim()) || filename.replace(/\.[^.]+$/, '') || filename;
  const description = (params.description && String(params.description).trim()) || null;
  const insertRow = {
    id: fileId,
    owner_id: ownerId,
    folder_id: folderId || null,
    title,
    original_name: filename,
    storage_path: storagePath,
    mime_type: mimeType,
    description,
    size_bytes: buffer.length,
    sort_order: Date.now() % 1000000000
  };

  let ins = await supabase.from('plan_pro_nutri_files').insert(insertRow).select('id').single();
  if (ins.error && /sort_order|column|schema cache/i.test(ins.error.message || '')) {
    delete insertRow.sort_order;
    ins = await supabase.from('plan_pro_nutri_files').insert(insertRow).select('id').single();
  }
  if (ins.error) {
    try {
      await supabase.storage.from(NUTRI_PRO_STORAGE_BUCKET).remove([storagePath]);
    } catch (eRm) {}
    return { ok: true, domain: 'nutri_pro', error: 'Error al registrar archivo: ' + ins.error.message };
  }

  const fileRec = { original_name: filename, mime_type: mimeType };
  let indexResult = { indexed: false, extract_status: 'pending' };
  try {
    indexResult = await indexNutriProSavedFile(supabase, ownerId, fileId, buffer, fileRec);
  } catch (exErr) {
    indexResult = {
      indexed: false,
      extract_status: 'error',
      extract_note: (exErr && exErr.message) || String(exErr)
    };
  }

  const shortPath = folderId
    ? nutriFolderPathChain(folderId, foldersById).join('/') + '/' + filename
    : filename;

  return {
    ok: true,
    domain: 'nutri_pro',
    action: 'nutri_pro_save',
    saved: true,
    nutri_file_id: fileId,
    folder_id: folderId,
    folder_path: folderPath,
    filename,
    title,
    short_path: shortPath,
    size_bytes: buffer.length,
    storage_bucket: NUTRI_PRO_STORAGE_BUCKET,
    text_indexed: indexResult.indexed,
    extract_status: indexResult.extract_status,
    char_count: indexResult.char_count || 0,
    extract_note: indexResult.extract_note || null,
    format_note: formatNote,
    message: 'Guardado en Nutri PRO › ' + folderPath + ' › ' + filename,
    gpt_usage:
      'Archivo en Supabase (nube). Visible en Plan PRO → Nutri PRO. Futuras preguntas: nutri_pro_ask con el tema o nutri_pro_file_text con nutri_file_id. Si text_indexed=false, indica extract_status al usuario.'
  };
}

async function handleNutriProUploadLink(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  if (!foldersRes.ok) {
    return {
      ok: true,
      domain: 'nutri_pro',
      available: false,
      error: 'Nutri PRO no instalado.',
      setup_sql: foldersRes.setup
    };
  }

  const folderId = await resolveNutriProFolderId(supabase, ownerId, params);
  const foldersById = nutriFolderMapById(foldersRes.rows);
  const folderPath = folderId ? nutriFolderPathChain(folderId, foldersById).join(' / ') : 'Raíz';
  const ttlMin = Math.min(Math.max(parseInt(params.ttl_minutes, 10) || 30, 5), 120);

  let created;
  try {
    created = await createNutriProUploadTicket(supabase, {
      owner_id: ownerId,
      folder_id: folderId,
      folder_path: folderPath,
      title_hint: (params.title || params.title_hint || '').trim() || null,
      suggested_filename: (params.suggested_filename || params.filename || '').trim() || null,
      ttl_sec: ttlMin * 60,
      public_base: (process.env.NUTRIPLANT_PUBLIC_URL || 'https://nutriplantpro.com').replace(/\/$/, '')
    });
  } catch (eTicket) {
    return { ok: true, domain: 'nutri_pro', error: (eTicket && eTicket.message) || 'No se pudo crear el enlace.' };
  }

  return {
    ok: true,
    domain: 'nutri_pro',
    action: 'nutri_pro_upload_link',
    upload_id: created.upload_id,
    upload_url: created.upload_url,
    expires_at: created.expires_at,
    folder_id: created.folder_id,
    folder_path: created.folder_path,
    message:
      'Abre upload_url en el celular o PC (misma sesión NutriPlant admin), sube el archivo y luego nutri_pro_upload_status con upload_id.',
    gpt_usage:
      'Cuando Jesús adjunte PDF/Excel y quiera el ORIGINAL: NO uses nutri_pro_save con .pdf. Envía upload_url y pide que abra el enlace, inicie sesión si hace falta, suba el archivo. Después nutri_pro_upload_status(upload_id). Para texto generado: nutri_pro_save con content.',
    instructions_for_user:
      '1) Abre el enlace 2) Inicia sesión NutriPlant si te lo pide 3) Elige archivo y Subir 4) Vuelve al chat y di «ya subí»'
  };
}

async function handleNutriProUploadStatus(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'No se encontró usuario admin para Nutri PRO.' };
  }

  const uploadId = String(params.upload_id || params.uploadId || '').trim();
  if (!uploadId) {
    return { ok: true, domain: 'nutri_pro', error: 'Indica params.upload_id (devuelto por nutri_pro_upload_link).' };
  }

  const state = await readNutriProUploadTicketState(supabase, uploadId);
  if (!state) {
    return {
      ok: true,
      domain: 'nutri_pro',
      upload_id: uploadId,
      status: 'unknown',
      message: 'No hay registro de ese enlace. Puede haber expirado; genera uno nuevo con nutri_pro_upload_link.'
    };
  }

  if (state.owner_id && state.owner_id !== ownerId) {
    return { ok: true, domain: 'nutri_pro', error: 'upload_id no corresponde a este admin.' };
  }

  const out = {
    ok: true,
    domain: 'nutri_pro',
    action: 'nutri_pro_upload_status',
    upload_id: uploadId,
    status: state.status || 'pending',
    folder_path: state.folder_path || null,
    expires_at: state.expires_at || null,
    file_id: state.file_id || null,
    nutri_file_id: state.file_id || null,
    filename: state.filename || null,
    short_path: state.short_path || null,
    completed_at: state.completed_at || null
  };

  if (state.status === 'done' && state.file_id) {
    const foldersRes = await fetchNutriProFolders(supabase, ownerId);
    const foldersById = foldersRes.ok ? nutriFolderMapById(foldersRes.rows) : {};
    const { data: fileRec } = await supabase
      .from('plan_pro_nutri_files')
      .select('id,folder_id,title,original_name,mime_type,size_bytes,updated_at')
      .eq('id', state.file_id)
      .maybeSingle();
    if (fileRec) {
      const extractMap = await fetchNutriProExtractsMap(supabase, ownerId, [fileRec.id]);
      out.file = mapNutriProFileRow(fileRec, foldersById, extractMap);
      out.text_indexed = !!(out.file && out.file.text_indexed);
      out.message = 'Subida completada: ' + (out.file.short_path || state.filename);
    } else {
      out.message = 'Marcado como subido pero el archivo ya no está en la lista.';
    }
  } else {
    out.message = 'Aún pendiente: el usuario debe abrir upload_url y subir el archivo.';
  }

  return out;
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
  const mapsLocation = getPlanProMapsLocation(item);
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
    maps_location: mapsLocation,
    maps_url: mapsLocation ? mapsLocation.maps_url : null,
    updated_at: item.updated_at
  };
}

function planProItemSearchHay(item, areasById) {
  const area = areasById[item.area_id];
  return [
    item.title,
    item.body_plain,
    stripHtmlSimple(item.body_html),
    item.next_action,
    item.status,
    item.priority,
    item.thought_type,
    getPlanProMapsLocation(item) && getPlanProMapsLocation(item).maps_url,
    area && area.title,
    area && area.slug,
    ...(item.relation_tags || [])
  ]
    .filter(Boolean)
    .join(' ');
}

function scorePlanProItemMatch(item, qRaw, areasById) {
  return nutriContentSearch.scorePartialTextMatch(planProItemSearchHay(item, areasById), qRaw, {
    titleHay: item.title || ''
  });
}

function itemMatchesSearch(item, qLc, areasById) {
  if (!qLc) return true;
  return scorePlanProItemMatch(item, qLc, areasById).matched;
}

function rankPlanProItemHits(items, qRaw, areasById, limit) {
  return (items || [])
    .map((item) => {
      const scoring = scorePlanProItemMatch(item, qRaw, areasById);
      return { item, ...scoring };
    })
    .filter((h) => h.matched && h.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.item.updated_at || 0) - new Date(a.item.updated_at || 0))
    .slice(0, limit || 30);
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

  const qRaw = (params.q || params.search || '').trim();
  if (!qRaw) {
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
    limit: params.limit || 120
  });
  const categories = await fetchPlanProCategories(supabase);
  const tags = params.tags
    ? String(params.tags)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const ranked = rankPlanProItemHits(items, qRaw, areasById, 40).filter((hit) => {
    if (!tags.length) return true;
    const itemTags = (hit.item.relation_tags || []).map((t) => String(t).toLowerCase());
    return tags.some((t) => itemTags.some((it) => it.includes(t)));
  });

  return {
    ok: true,
    domain: 'plan_pro',
    query: qRaw,
    count: ranked.length,
    partial_match: true,
    items: ranked.slice(0, 30).map((hit) => ({
      ...planProItemListRow(hit.item, areasById, categories),
      relevance_score: hit.score,
      matched_terms: hit.matched_terms || []
    })),
    gpt_hint:
      'Búsqueda flexible: no hace falta el título exacto; basta con palabras sueltas que recuerde Jesús. Si hay varios resultados parecidos, muéstralos y pregunta cuál.'
  };
}

async function fetchPlanProLocationFavorites(supabase, ownerId, limit) {
  const max = Math.min(parseInt(limit, 10) || 100, 200);
  const { data, error } = await supabase
    .from('plan_pro_location_favorites')
    .select('id,title,lat,lng,maps_url,updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(max);
  if (error) {
    if (/relation .* does not exist|schema|plan_pro_location_favorites/i.test(error.message || '')) {
      return { available: false, rows: [], error: 'Tabla plan_pro_location_favorites no existe. Ejecuta supabase-plan-pro-location-favorites.sql.' };
    }
    throw new Error('plan_pro_location_favorites: ' + error.message);
  }
  return { available: true, rows: data || [], error: null };
}

async function handlePlanProLocations(supabase, params) {
  const ownerId = await getPlanProOwnerId(supabase);
  if (!ownerId) {
    return { ok: true, domain: 'plan_pro', error: 'No se encontró usuario admin para Plan PRO.' };
  }

  const q = (params.q || params.search || '').trim().toLowerCase();
  const includeFavorites = params.include_favorites !== false && params.include_favorites !== 'false';
  const includeItems = params.include_items !== false && params.include_items !== 'false';
  const limit = Math.min(parseInt(params.limit, 10) || 100, 200);

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  const categories = await fetchPlanProCategories(supabase);
  const out = {
    ok: true,
    domain: 'plan_pro',
    action: 'plan_pro_locations',
    query: q || null,
    favorites_available: true,
    favorites: [],
    items_with_location: []
  };

  if (includeFavorites) {
    const fav = await fetchPlanProLocationFavorites(supabase, ownerId, limit);
    out.favorites_available = fav.available;
    if (fav.error) out.favorites_note = fav.error;
    out.favorites = fav.rows
      .filter((f) => {
        if (!q) return true;
        return [f.title, f.maps_url, f.lat, f.lng].filter((x) => x != null).join(' ').toLowerCase().includes(q);
      })
      .map((f) => ({
        id: f.id,
        title: f.title,
        lat: f.lat,
        lng: f.lng,
        maps_url: f.maps_url,
        updated_at: f.updated_at
      }));
  }

  if (includeItems) {
    const items = await fetchPlanProItems(supabase, ownerId, { limit: 200 });
    out.items_with_location = items
      .map((item) => ({ item, location: getPlanProMapsLocation(item) }))
      .filter((x) => x.location)
      .filter((x) => {
        if (!q) return true;
        return itemMatchesSearch(x.item, q, areasById) || String(x.location.maps_url || '').toLowerCase().includes(q);
      })
      .slice(0, limit)
      .map((x) => ({
        ...planProItemListRow(x.item, areasById, categories),
        maps_location: x.location,
        maps_url: x.location.maps_url
      }));
  }

  out.counts = {
    favorites: out.favorites.length,
    items_with_location: out.items_with_location.length
  };
  return out;
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

function itemHadStoredNoteContent(item) {
  if (!item) return false;
  if (String(item.body_plain || '').trim()) return true;
  if (stripHtmlSimple(item.body_html || '').trim()) return true;
  return false;
}

function authorNoteTextIsEmpty(text) {
  return !String(preprocessNoteAuthorInput(text || '')).trim();
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
  const qRaw = (params.q || params.search || params.title || '').trim();
  if (!itemId && !qRaw) {
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
    const items = await fetchPlanProItems(supabase, ownerId, { limit: 150 });
    const hits = rankPlanProItemHits(items, qRaw, areasById, 12);
    if (hits.length > 1 && hits[0].score - hits[1].score < 8) {
      return {
        ok: true,
        domain: 'plan_pro',
        found: false,
        ambiguous: true,
        query: qRaw,
        message:
          'Varios apuntes coinciden con esas palabras. Muestra candidates al usuario y usa item_id del que elija.',
        candidates: hits.slice(0, 8).map((hit) => ({
          ...planProItemListRow(hit.item, areasById, categories),
          relevance_score: hit.score,
          matched_terms: hit.matched_terms || []
        })),
        gpt_hint: 'No pidas título exacto. Pregunta cuál de la lista es, luego plan_pro_update con item_id.'
      };
    }
    item = (hits[0] && hits[0].item) || null;
  }

  if (!item) {
    return {
      ok: true,
      domain: 'plan_pro',
      found: false,
      message: 'Apunte no encontrado.',
      gpt_hint: 'Prueba plan_pro_search con palabras sueltas (nombre, apellido, tema).'
    };
  }

  const patch = {};

  if (params.title != null && String(params.title).trim()) {
    patch.title = String(params.title).trim().slice(0, 500);
  }
  const notePayload = buildNoteAuthorPayload(params);
  let noteClearBlocked = false;
  if (notePayload) {
    if (
      notePayload.mode === 'replace' &&
      authorNoteTextIsEmpty(notePayload.text) &&
      itemHadStoredNoteContent(item) &&
      params.clear_note !== true &&
      params.clear_note !== 'true'
    ) {
      noteClearBlocked = true;
    } else if (notePayload.mode === 'replace') {
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
    if (noteClearBlocked) {
      return {
        ok: true,
        domain: 'plan_pro',
        updated: false,
        note_clear_blocked: true,
        aviso_nota:
          'No se borró la libreta (ya tenía contenido). Usa append_note para añadir o clear_note:true para vaciar a propósito.',
        item: planProItemListRow(item, areasById, categories),
        semaforos_en_nota: collectAllRichDueMarkers(item)
      };
    }
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
    note_clear_blocked: noteClearBlocked || undefined,
    aviso_nota: noteClearBlocked
      ? 'No se borró la libreta (ya tenía contenido). Usa append_note para añadir o clear_note:true para vaciar a propósito.'
      : undefined,
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
  const qRaw = (params.q || params.search || params.title || '').trim();

  const areas = await fetchPlanProAreas(supabase, ownerId);
  const areasById = areaMapById(areas);
  const categories = await fetchPlanProCategories(supabase);

  let item = null;
  let searchHits = [];
  if (itemId) {
    const { data, error } = await supabase
      .from('plan_pro_items')
      .select(PLAN_PRO_ITEM_SELECT)
      .eq('owner_id', ownerId)
      .eq('id', itemId)
      .maybeSingle();
    if (error) throw new Error('plan_pro_item: ' + error.message);
    item = data;
  } else if (qRaw) {
    const items = await fetchPlanProItems(supabase, ownerId, { limit: 150 });
    searchHits = rankPlanProItemHits(items, qRaw, areasById, 12);
    item = (searchHits[0] && searchHits[0].item) || null;
  } else {
    return { ok: true, domain: 'plan_pro', error: 'Indica params.item_id o params.q (título/texto).' };
  }

  if (!item) {
    return {
      ok: true,
      domain: 'plan_pro',
      found: false,
      message: 'Apunte no encontrado.',
      gpt_hint: 'Prueba plan_pro_search con palabras sueltas (nombre, apellido, tema). No hace falta el título exacto.'
    };
  }

  const images = collectPlanProImages(item);
  const noteMarkers = collectAllRichDueMarkers(item);
  const nutriRefsRaw = collectNutriRefsFromItem(item);
  const apunteRefs = collectApunteRefsFromItem(item);
  const foldersRes = await fetchNutriProFolders(supabase, ownerId);
  const foldersById = foldersRes.ok ? nutriFolderMapById(foldersRes.rows) : {};
  const nutriRefs = foldersRes.ok
    ? await enrichNutriRefsWithFiles(supabase, ownerId, nutriRefsRaw, foldersById)
    : nutriRefsRaw.map((r) => ({ ...r, file_found: null, aviso: 'Nutri PRO no disponible en Supabase.' }));

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
      nutri_refs: nutriRefs,
      nutri_refs_count: nutriRefs.length,
      nutri_refs_note:
        nutriRefs.length > 0
          ? 'Rutas cortas 📎 a archivos Nutri PRO. Usa nutri_pro_ask o nutri_pro_file_text con nutri_file_id para leer contenido indexado.'
          : null,
      apunte_refs: apunteRefs,
      apunte_refs_count: apunteRefs.length,
      images,
      images_count: images.length,
      images_note:
        images.length > 0
          ? 'URLs públicas en Supabase (plan-pro-note-images). Indica al usuario las URLs; ChatGPT Plus puede abrir enlaces si el usuario lo pide.'
          : null,
      body_blocks_summary: summarizeBodyBlocks(item.body_blocks),
      body_blocks_tables: expandBodyBlocksForApi(item.body_blocks),
      closed_at: item.closed_at
    },
    search_query: qRaw || null,
    also_matched:
      searchHits.length > 1
        ? searchHits.slice(1, 6).map((hit) => ({
            ...planProItemListRow(hit.item, areasById, categories),
            relevance_score: hit.score,
            matched_terms: hit.matched_terms || []
          }))
        : [],
    ambiguous:
      searchHits.length > 1 && searchHits[0].score - searchHits[1].score < 8,
    gpt_hint:
      searchHits.length > 1
        ? 'Si hay varios candidatos parecidos, confirma con Jesús cuál apunte antes de editar. No pidas título exacto: usa also_matched.'
        : 'Búsqueda flexible por palabras sueltas; no hace falta título exacto.'
  };
}

/* ——— Fase 4: Radar (NDVI / NDMI) ——— */
const RADAR_BUCKET = 'radar-ndvi';
const radarCreditsLib = require('./lib/radar-credits');

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
  const base = radarCreditsLib.getMonthlyBaseLimit();
  const { data: prof } = await supabase
    .from('profiles')
    .select('radar_credits_bonus')
    .eq('id', userId)
    .maybeSingle();
  const bonus = Math.max(0, Math.floor(Number(prof?.radar_credits_bonus) || 0));
  const limit = base + bonus;
  const { data, error } = await supabase
    .from('radar_requests')
    .select('meta')
    .eq('user_id', userId)
    .eq('month_key', mk)
    .not('image_storage_path', 'is', null);
  if (error) throw new Error('radar credits: ' + error.message);
  const used = radarCreditsLib.sumCreditsFromRows(data);
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
    location_snapshot: meta.location_snapshot || null,
    images: {
      ndvi: {
        label: 'NDVI — vigor vegetativo relativo',
        signed_url: ndviUrl,
        legend: 'Colorimetría relativa al predio/fecha: verde = mayor vigor relativo; rojo/naranja = menor vigor relativo dentro del mismo lote.'
      },
      ndmi: {
        label: 'NDMI — humedad del dosel',
        signed_url: ndmiUrl,
        legend: 'Colorimetría relativa al predio/fecha: verde/azul verdoso = mayor humedad relativa del dosel; marrón/tonos secos = menor humedad relativa dentro del mismo lote.'
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
    const loc = m.location_snapshot || null;
    return {
      id: h.id,
      created_at: h.created_at,
      month_key: h.month_key,
      sentinel_period: { from: m.date_start || null, to: m.date_end || null },
      has_ndvi: !!h.image_storage_path,
      has_ndmi: !!(m.ndmi_storage_path || m.images?.ndmi?.storage_path),
      has_location_snapshot: !!(loc && Array.isArray(loc.polygon) && loc.polygon.length >= 3),
      location_center: loc && loc.center ? loc.center : null,
      location_bounds: loc && loc.bounds ? loc.bounds : null,
      area_hectares: loc && loc.area_hectares != null ? loc.area_hectares : null,
      perimeter_m: loc && loc.perimeter_m != null ? loc.perimeter_m : null
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
  const areaHa = radarCreditsLib.getAreaHectaresFromLocation(data.location);
  const radarPricing = radarCreditsLib.getRadarCreditPricingInfo(areaHa);

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
    radar_pricing: radarPricing,
    gpt_radar_note:
      'radar_history lista imágenes (id, created_at, sentinel_period, location_center, bounds, area_ha). latest_radar incluye location_snapshot (polígono, centro, bounds) de la imagen mostrada o de request_id. Radar principal actual: Pilot Copernicus/Sentinel-2, sin Google Earth Engine pero con créditos Radar internos: base 20/mes + bonus; costo por generación según area_hectares del polígono (≤30 ha = 1 · >30 ha = 2 · >100 ha = 3; NDVI+NDMI juntos). Colorimetría relativa al predio/fecha: rojo/naranja=bajo relativo, amarillo/verde claro=intermedio, verde/azul verdoso=alto relativo. ChatGPT no ve píxeles: fechas, coords y enlaces NDVI/NDMI.',
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

async function handleNutritionCatalogs(supabase, params) {
  const mod = require('./lib/nutrition-catalogs');
  return mod.handleNutritionCatalogs(supabase, params || {});
}

async function handleDescribeApi() {
  return {
    ok: true,
    version: '2.10.0',
    openapi_version: '2.10.0',
    chatgpt_tool: {
      operationId: 'nutriplantAdminQuery',
      note:
        'En ChatGPT solo existe esta Action. admin_stats, nutri_pro_catalog, describe_api, etc. son valores del campo body.action, no tools aparte.',
      example_admin_stats: { action: 'admin_stats', params: {} },
      example_nutri_pro: { action: 'nutri_pro_catalog', params: {} },
      example_nutri_pro_reindex: {
        action: 'nutri_pro_reindex',
        params: { nutri_file_id: 'UUID', mode: 'ocr' }
      },
      verify: 'Si describe_api devuelve version 2.10.0, el GPT tiene schema y token correctos.'
    },
    domains: {
      admin: ['admin_stats', 'list_users', 'user_summary'],
      nutriplant_projects: [
        'search_projects',
        'project_detail',
        'project_analyses',
        'project_vpd_live',
        'project_climate'
      ],
      my_programs: [
        'my_program_project_create',
        'my_program_project_list',
        'my_program_project_get',
        'my_program_project_update'
      ],
      plan_pro: [
        'plan_pro_catalog',
        'plan_pro_day',
        'plan_pro_week',
        'plan_pro_search',
        'plan_pro_item',
        'plan_pro_locations',
        'plan_pro_create',
        'plan_pro_update'
      ],
      nutri_pro: [
        'nutri_pro_catalog',
        'nutri_pro_search',
        'nutri_pro_ask',
        'nutri_pro_file_text',
        'nutri_pro_reindex',
        'nutri_pro_save',
        'nutri_pro_upload_link',
        'nutri_pro_upload_status'
      ],
      radar: ['radar_project', 'radar_search', 'radar_overview'],
      free_tools: ['free_tools_catalog'],
      lab_analyses: ['lab_analyses_catalog', 'project_analyses'],
      manual_publico: ['manual_tecnico_catalog'],
      nutrition: ['nutrition_catalogs']
    },
    usage:
      'Reportes laboratorio (nube): project_analyses. Clima en vivo (Open-Meteo, solo lectura): project_climate mode=saved|live|rainfall_refresh|rolling|all; project_vpd_live. Radar: radar_project. Plan PRO: plan_pro_*.',
    my_programs_gpt:
      'Escritura limitada y segura para laboratorio personal de Jesús: my_program_project_create/list/get/update. Solo opera proyectos del email admin configurado (default admin@nutriplantpro.com) marcados gptPersonalProgram=true y created_by_gpt=true. Nunca edita proyectos de suscriptores.',
    climate_gpt:
      'project_climate NO altera al suscriptor. mode=saved → climate_saved (snapshot con lluvia/ET₀ mensual hasta 4 años en rainfall.years y et0.years; tiempo actual con rain_today_mm y et0_today_mm; rolling 1/7/30 d; calculadora balance). mode=live → tiempo_actual_ahora + lluvia/ET₀ del día. mode=rainfall_refresh → lluvia_et0_ahora (4 años en vivo). mode=rolling o all → rolling_windows_ahora + irrigation_quick_calc_live. Si preguntan por histórico mensual o gráficas, usa climate_saved.rainfall.years / et0.years. Si piden «actualizado», usa mode=all.',
    nutri_pro_gpt:
      'Archivos traen open_url (link permanente). Preguntas: nutri_pro_ask. Leer texto: nutri_pro_file_text (acepta open_url). Mal indexado: nutri_pro_reindex mode=text|ocr. Texto generado: nutri_pro_save. Binario real: nutri_pro_upload_link. Ver docs/NUTRI-PRO-CONOCIMIENTO-GPT.md.',
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
  my_program_project_create: (sb, p) => handleMyProgramProjectCreate(sb, p),
  my_program_project_list: (sb, p) => handleMyProgramProjectList(sb, p || {}),
  my_program_project_get: (sb, p) => handleMyProgramProjectGet(sb, p || {}),
  my_program_project_update: (sb, p) => handleMyProgramProjectUpdate(sb, p || {}),
  plan_pro_catalog: (sb) => handlePlanProCatalog(sb),
  plan_pro_day: (sb, p) => handlePlanProDay(sb, p),
  plan_pro_week: (sb, p) => handlePlanProWeek(sb, p),
  plan_pro_search: (sb, p) => handlePlanProSearch(sb, p),
  plan_pro_item: (sb, p) => handlePlanProItem(sb, p),
  plan_pro_locations: (sb, p) => handlePlanProLocations(sb, p),
  plan_pro_create: (sb, p) => handlePlanProCreate(sb, p),
  plan_pro_update: (sb, p) => handlePlanProUpdate(sb, p),
  nutri_pro_catalog: (sb, p) => handleNutriProCatalog(sb, p),
  nutri_pro_search: (sb, p) => handleNutriProSearch(sb, p),
  nutri_pro_ask: (sb, p) => handleNutriProAsk(sb, p),
  nutri_pro_file_text: (sb, p) => handleNutriProFileText(sb, p),
  nutri_pro_reindex: (sb, p) => handleNutriProReindex(sb, p),
  nutri_pro_save: (sb, p) => handleNutriProSave(sb, p),
  nutri_pro_upload_link: (sb, p) => handleNutriProUploadLink(sb, p),
  nutri_pro_upload_status: (sb, p) => handleNutriProUploadStatus(sb, p),
  radar_project: (sb, p) => handleRadarProject(sb, p),
  radar_search: (sb, p) => handleRadarSearch(sb, p),
  radar_overview: (sb, p) => handleRadarOverview(sb, p),
  free_tools_catalog: (_sb, p) => handleFreeToolsCatalog(p),
  lab_analyses_catalog: (_sb, p) => handleLabAnalysesCatalog(p),
  manual_tecnico_catalog: (_sb, p) => handleManualTecnicoCatalog(p),
  nutrition_catalogs: (sb, p) => handleNutritionCatalogs(sb, p),
  describe_api: () => handleDescribeApi()
};

function getOpenApiSpec() {
  /* Formato 3.0.3 + servers.url raíz: compatible con importador de Actions en ChatGPT */
  return {
    openapi: '3.1.0',
    info: {
      title: 'NutriPlant Admin Assistant',
      version: '2.10.0',
      description:
        'v2.10.0 — ChatGPT: una sola Action (nutriplantAdminQuery). body.action = admin_stats|nutri_pro_*|nutri_pro_reindex|describe_api|… Archivos Nutri PRO incluyen open_url permanente.'
    },
    servers: [{ url: 'https://nutriplantpro.com' }],
    paths: {
      '/api/admin-assistant': {
        post: {
          operationId: 'nutriplantAdminQuery',
          summary: 'Única Action ChatGPT — consulta NutriPlant, Plan PRO y Nutri PRO',
          description:
            'Única Action ChatGPT. Body: action + params. admin_stats, nutri_pro_catalog, nutri_pro_reindex, describe_api van en body.action, no son tools aparte. Verifica describe_api → version 2.10.0.',
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
                  description:
                    'project_climate: saved|live|rainfall_refresh|rolling|all · nutri_pro_reindex: text|ocr'
                },
                nutri_file_id: { type: 'string', description: 'UUID archivo Nutri PRO' },
                file_id: { type: 'string', description: 'Alias de nutri_file_id' },
                open_url: {
                  type: 'string',
                  description: 'Link permanente /api/nutri-pro-file-open?fid=… (alternativa a nutri_file_id)'
                },
                force: {
                  type: 'boolean',
                  description: 'nutri_pro_reindex: forzar reextracción (default true)'
                },
                section: {
                  type: 'string',
                  description: 'my_program_project_update: draft|fertirriego|granular|calculators'
                },
                program_data: {
                  type: 'object',
                  description: 'my_program_*: borrador o estructura de programa a guardar en proyecto personal GPT.'
                },
                program_status: {
                  type: 'string',
                  description: 'my_program_*: draft|review|final u otro estado libre.'
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

module.exports.runAdminAction = async function runAdminAction(action, params) {
  const supabase = await getSupabase();
  if (!supabase) {
    return { ok: false, error: 'Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' };
  }
  const fn = HANDLERS[action];
  if (!fn) {
    return { ok: false, error: 'Acción desconocida: ' + action };
  }
  return fn(supabase, params || {});
};

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
