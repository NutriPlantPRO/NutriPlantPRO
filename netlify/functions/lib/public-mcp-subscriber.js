'use strict';

const { createClient } = require('@supabase/supabase-js');

const ANALYSIS_KEYS = {
  suelo: 'soilAnalyses',
  solucion_nutritiva: 'solucionNutritivaAnalyses',
  extracto_pasta: 'extractoPastaAnalyses',
  agua: 'aguaAnalyses',
  foliar: 'foliarAnalyses',
  fruta: 'frutaAnalyses'
};

function serviceClient() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isSoftDeleted(row) {
  const d = row && row.data ? row.data : {};
  return !!(d._is_deleted || d.is_deleted || d.deleted_at);
}

function cropOf(data) {
  if (!data || typeof data !== 'object') return '';
  return String(data.crop_type || data.cultivo || data.cropType || '').trim();
}

function analysisMeta(list) {
  const arr = Array.isArray(list) ? list : [];
  const latest = arr[0] || null;
  return {
    reports_count: arr.length,
    latest: latest
      ? {
          id: latest.id || null,
          title: latest.title || latest.name || null,
          date: latest.date || (latest.meta && latest.meta.date) || null
        }
      : null
  };
}

function summarizeProject(row) {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const loc = data.location || {};
  const analyses = {};
  Object.keys(ANALYSIS_KEYS).forEach((k) => {
    analyses[k] = analysisMeta(data[ANALYSIS_KEYS[k]]);
  });
  return {
    id: row.id,
    name: row.name || row.title || 'Sin nombre',
    crop: cropOf(data),
    updated_at: row.updated_at || null,
    area_hectares: loc.areaHectares || null,
    has_polygon: !!(loc.polygon && loc.polygon.length >= 3),
    modules: {
      fertirriego: !!(data.fertirriego && data.fertirriego.program),
      hidroponia: !!(data.hidroponia || data.hydroponics),
      vpd: !!data.vpdAnalysis,
      clima: !!data.climateAnalysis,
      enmiendas: !!data.soilAnalysis
    },
    analyses
  };
}

function soilSnapshot(data) {
  const list = Array.isArray(data.soilAnalyses) ? data.soilAnalyses : [];
  const a = list[0];
  if (!a || !a.fertility) return null;
  const fert = a.fertility || {};
  const keys = ['p', 'k', 'ca', 'mg', 'nNo3', 'mo'];
  const nutrients = {};
  keys.forEach((k) => {
    if (fert[k] == null || fert[k] === '') return;
    nutrients[k] = fert[k];
  });
  return {
    title: a.title || a.name || null,
    date: a.date || null,
    fertility_lab: nutrients,
    depth_cm: fert.depthCm || null,
    note: 'Valores de laboratorio del último reporte de suelo del suscriptor. kg/ha según capítulo analisis-suelo-fertilidad-kgha.'
  };
}

async function fetchOwnProjects(userId) {
  const supabase = serviceClient();
  if (!supabase) {
    return { ok: false, error: 'Supabase no configurado para lectura de suscriptor.' };
  }
  if (!userId) return { ok: false, error: 'Sin user id.' };
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id, name, title, data, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(80);
  if (error) return { ok: false, error: 'projects: ' + error.message };
  const rows = (data || []).filter((r) => r.user_id === userId && !isSoftDeleted(r));
  return { ok: true, rows };
}

async function listMyProjects(user) {
  const got = await fetchOwnProjects(user.userId);
  if (!got.ok) return got;
  return {
    ok: true,
    domain: 'nutriplant_subscriber',
    owner: { user_id: user.userId, email: user.email },
    count: got.rows.length,
    projects: got.rows.map((r) => ({
      id: r.id,
      name: r.name || r.title || 'Sin nombre',
      crop: cropOf(r.data),
      updated_at: r.updated_at
    })),
    wall: 'Solo proyectos cuyo user_id coincide con el JWT del suscriptor. No hay roster admin.'
  };
}

async function getMyProject(user, params) {
  const got = await fetchOwnProjects(user.userId);
  if (!got.ok) return got;
  const q = String((params && (params.project_id || params.id || params.q || params.project_name)) || '')
    .trim()
    .toLowerCase();
  if (!q) {
    return { ok: false, error: 'Indica project_id o q (nombre).', hint: 'Usa list_my_projects primero.' };
  }
  const matches = got.rows.filter((r) => {
    const name = String(r.name || r.title || '').toLowerCase();
    return r.id === q || r.id.toLowerCase() === q || name.indexOf(q) >= 0;
  });
  if (!matches.length) return { ok: false, error: 'No hay un proyecto tuyo con: ' + q };
  if (matches.length > 1 && q.length < 8) {
    return {
      ok: true,
      multiple: true,
      candidates: matches.slice(0, 8).map((r) => ({ id: r.id, name: r.name || r.title, crop: cropOf(r.data) }))
    };
  }
  const row = matches[0];
  if (row.user_id !== user.userId) {
    return { ok: false, error: 'Proyecto ajeno: bloqueado.' };
  }
  const data = row.data || {};
  const type = String((params && (params.type || params.analysis_type)) || '').toLowerCase();
  const out = {
    ok: true,
    domain: 'nutriplant_subscriber',
    owner: { user_id: user.userId, email: user.email },
    project: summarizeProject(row),
    wall: 'Lectura restringida a este user_id. Sin token admin. Sin otros clientes.'
  };
  if (type === 'suelo' || type === 'soil' || type === 'all' || !type) {
    out.latest_soil = soilSnapshot(data);
  }
  return out;
}

module.exports = { listMyProjects, getMyProject, summarizeProject };
