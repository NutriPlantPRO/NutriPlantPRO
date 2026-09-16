'use strict';

const { createClient } = require('@supabase/supabase-js');
const deep = require('./public-mcp-subscriber-read');
const cross = require('./public-mcp-cross');

const ANALYSIS_KEYS = {
  suelo: 'soilAnalyses',
  solucion_nutritiva: 'solucionNutritivaAnalyses',
  extracto_pasta: 'extractoPastaAnalyses',
  agua: 'aguaAnalyses',
  foliar: 'foliarAnalyses',
  fruta: 'frutaAnalyses'
};

const FLOW_CHAPTER =
  'https://nutriplantpro.com/manual-tecnico/capitulos/flujo-nutriplant-pro.html';

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

function hasAmendments(data) {
  const sa = data && data.soilAnalysis;
  if (!sa || typeof sa !== 'object') return false;
  const ini = sa.initial || {};
  return !!(
    ini.k != null ||
    ini.ca != null ||
    ini.mg != null ||
    ini.cic != null ||
    (sa.adjustments && Object.keys(sa.adjustments).length)
  );
}

function summarizeProject(row) {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const loc = data.location || {};
  const analyses = {};
  Object.keys(ANALYSIS_KEYS).forEach((k) => {
    analyses[k] = analysisMeta(data[ANALYSIS_KEYS[k]]);
  });
  const hydro = data.hidroponia || data.hydroponics || null;
  const fert = data.fertirriego || null;
  const granular = data.granular || data.nutricionGranular || null;
  const hasFertiWeeks = !!(
    fert &&
    ((fert.program && Array.isArray(fert.program.weeks) && fert.program.weeks.length) ||
      (Array.isArray(fert.weeks) && fert.weeks.length))
  );
  return {
    id: row.id,
    name: row.name || row.title || 'Sin nombre',
    crop: cropOf(data),
    updated_at: row.updated_at || null,
    area_hectares: loc.areaHectares || null,
    has_polygon: !!(loc.polygon && loc.polygon.length >= 3),
    has_location_point: !!(loc.center || (loc.lat != null && loc.lng != null)),
    modules: {
      fertirriego: hasFertiWeeks,
      hidroponia: !!(hydro && (hydro.stages || hydro.fertilizers || hydro.cycleProgram)),
      granular: !!(granular && (granular.program || granular.mix || granular.materials || granular.requirements)),
      vpd: !!data.vpdAnalysis,
      clima: !!data.climateAnalysis,
      enmiendas: hasAmendments(data),
      extraccion: !!(data.extraccionEtapa || data.extraccion)
    },
    analyses
  };
}

function flowStatus(summary) {
  const m = summary.modules || {};
  const a = summary.analyses || {};
  const hasSoil = (a.suelo && a.suelo.reports_count) > 0;
  const hasWater = (a.agua && a.agua.reports_count) > 0;
  const hasFoliar = (a.foliar && a.foliar.reports_count) > 0;
  const hasAnyLab =
    hasSoil ||
    hasWater ||
    hasFoliar ||
    (a.fruta && a.fruta.reports_count) > 0 ||
    (a.extracto_pasta && a.extracto_pasta.reports_count) > 0 ||
    (a.solucion_nutritiva && a.solucion_nutritiva.reports_count) > 0;
  const hasProgram = !!(m.fertirriego || m.hidroponia || m.granular);
  const hasAmend = !!m.enmiendas;
  const present = [];
  const missing = [];

  if (summary.crop) present.push('cultivo');
  else missing.push('definir cultivo');
  if (summary.has_polygon || summary.has_location_point) present.push('ubicacion');
  else missing.push('ubicacion / punto');
  if (hasAnyLab) present.push('analisis_lab');
  else missing.push('analisis de laboratorio');
  if (hasAmend) present.push('enmiendas');
  else if (hasSoil) missing.push('revisar enmiendas (si aplica CIC)');
  if (hasProgram) present.push('programa_nutricion');
  else missing.push('programa (fertirriego / granular / hidro)');
  if (m.vpd || m.clima) present.push('vpd_o_clima');
  else missing.push('seguimiento VPD/clima (opcional)');
  if (m.extraccion) present.push('extraccion_etapa');

  let next_step;
  if (!summary.crop) {
    next_step = {
      step: 'dato',
      action: 'Definir cultivo y sistema de producción en el proyecto.',
      chapter_url: FLOW_CHAPTER
    };
  } else if (!hasAnyLab) {
    next_step = {
      step: 'dato',
      action: 'Cargar análisis base (suelo y/o agua; foliar según sistema).',
      chapter_url: FLOW_CHAPTER
    };
  } else if (hasSoil && !hasAmend) {
    next_step = {
      step: 'ajuste',
      action: 'Revisar enmiendas / CIC si hay desbalance de cationes; si no aplica, pasar a demanda/programa.',
      chapter_url: 'https://nutriplantpro.com/manual-tecnico/capitulos/enmiendas-balance-cic.html'
    };
  } else if (!hasProgram) {
    next_step = {
      step: 'programa',
      action: 'Armar programa de nutrición (fertirriego, granular o hidro) según el sistema.',
      chapter_url: FLOW_CHAPTER
    };
  } else if (!hasFoliar && !m.vpd) {
    next_step = {
      step: 'seguimiento',
      action: 'Validar en campo: foliar y/o VPD según el cultivo.',
      chapter_url: FLOW_CHAPTER
    };
  } else {
    next_step = {
      step: 'seguimiento',
      action: 'Seguimiento: contrastar labs recientes con el programa activo; ajustar si hace falta.',
      chapter_url: FLOW_CHAPTER
    };
  }

  return {
    flow: 'dato → interpretación → ajuste → programa → seguimiento',
    present,
    missing,
    flags: { hasSoil, hasWater, hasFoliar, hasAnyLab, hasAmend, hasProgram },
    next_step
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
      updated_at: r.updated_at,
      modules: summarizeProject(r).modules
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
  const project = summarizeProject(row);
  const deepRead = deep.buildDeepRead(data, params || {});
  const wantCross =
    !params ||
    params.cross === true ||
    params.cross === 'true' ||
    String((params && params.section) || '') === 'cross' ||
    String((params && params.section) || '') === 'all' ||
    !params.section;
  const out = {
    ok: true,
    domain: 'nutriplant_subscriber',
    owner: { user_id: user.userId, email: user.email },
    project,
    flow_status: flowStatus(project),
    detail: deepRead,
    deep_links: cross.projectDeepLinks(project.id, project.name),
    latest_soil:
      deepRead.labs && deepRead.labs.suelo && deepRead.labs.suelo.reports && deepRead.labs.suelo.reports[0]
        ? deepRead.labs.suelo.reports[0]
        : null,
    latest_foliar:
      deepRead.labs && deepRead.labs.foliar && deepRead.labs.foliar.reports && deepRead.labs.foliar.reports[0]
        ? deepRead.labs.foliar.reports[0]
        : null,
    latest_agua:
      deepRead.labs && deepRead.labs.agua && deepRead.labs.agua.reports && deepRead.labs.agua.reports[0]
        ? deepRead.labs.agua.reports[0]
        : null,
    programs: deepRead.programs || null,
    api_hint:
      'Params: project_id|q, section=all|labs|programs|enmiendas|vpd|clima|extraccion|cross|fertirriego|hidro|granular, type, stage_index, latest_only, cross=true.',
    wall: 'Lectura restringida a este user_id. Sin token admin. Sin otros clientes. Sin Plan PRO / AirCI / admin. Solo lectura.'
  };
  if (wantCross) {
    out.cross = cross.crossProjectSignals(data, {
      project_id: project.id,
      project_name: project.name,
      stage_index: params && params.stage_index
    });
  }
  return out;
}

module.exports = {
  listMyProjects,
  getMyProject,
  summarizeProject,
  flowStatus,
  buildDeepRead: deep.buildDeepRead,
  interpretProjectCross: async function (user, params) {
    const got = await fetchOwnProjects(user.userId);
    if (!got.ok) return got;
    const q = String((params && (params.project_id || params.id || params.q || params.project_name)) || '')
      .trim()
      .toLowerCase();
    if (!q) return { ok: false, error: 'Indica project_id o q.', hint: 'Usa list_my_projects.' };
    const matches = got.rows.filter((r) => {
      const name = String(r.name || r.title || '').toLowerCase();
      return r.id === q || r.id.toLowerCase() === q || name.indexOf(q) >= 0;
    });
    if (!matches.length) return { ok: false, error: 'No hay un proyecto tuyo con: ' + q };
    const row = matches[0];
    if (row.user_id !== user.userId) return { ok: false, error: 'Proyecto ajeno: bloqueado.' };
    return cross.crossProjectSignals(row.data || {}, {
      project_id: row.id,
      project_name: row.name || row.title,
      stage_index: params && params.stage_index
    });
  },
  projectDeepLinks: async function (user, params) {
    const got = await fetchOwnProjects(user.userId);
    if (!got.ok) return got;
    const q = String((params && (params.project_id || params.id || params.q || params.project_name)) || '')
      .trim()
      .toLowerCase();
    if (!q) return { ok: false, error: 'Indica project_id o q.' };
    const matches = got.rows.filter((r) => {
      const name = String(r.name || r.title || '').toLowerCase();
      return r.id === q || r.id.toLowerCase() === q || name.indexOf(q) >= 0;
    });
    if (!matches.length) return { ok: false, error: 'No hay un proyecto tuyo con: ' + q };
    const row = matches[0];
    if (row.user_id !== user.userId) return { ok: false, error: 'Proyecto ajeno: bloqueado.' };
    return cross.projectDeepLinks(row.id, row.name || row.title);
  }
};
